Lesson.register({
  id: 'graphql-grpc',
  title: 'REST vs GraphQL vs gRPC',
  minutes: 28,
  summary: `REST sabse common hai, lekin har jagah best nahi. GraphQL tab chamakta hai jab alag alag apps ko same data alag shape mein chahiye (over-fetching aur under-fetching khatam), lekin N+1 queries aur caching ki mushkil saath laata hai. gRPC tab, jab andar ki services ek doosre ko second mein hazaron baar call karti hain: Protobuf (chhota binary data), HTTP/2 aur streaming. Is lesson mein teeno, widgets ke saath, aur kab kaunsa.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `REST mein har cheez ka alag address hai. Profile screen banane ke liye app ko teen jagah jaana padta hai, aur har jagah se zarurat se zyada saamaan uthana padta hai.<br><strong>GraphQL</strong> kehta hai: "ek hi khidki pe jao, aur ek parchi pe likh do ki exactly kya chahiye." Server wahi, utna hi lautata hai.<br><strong>gRPC</strong> doosri problem ke liye hai: xyz.com ke andar ke programs ek doosre se second mein lakhon baar baat karte hain. Unke liye JSON jaisa lamba text bhejna mehenga hai. gRPC chhote binary packets mein, ek hi khule connection pe, tez baat karata hai.<br>Teeno ka apna kaam hai. Is lesson ke aakhir tak tumhe pata hoga kab kaunsa.` },

    { type: 'h2', text: 'REST ki do chhoti problems' },
    { type: 'p', html: `xyz.com ki mobile app ki profile screen pe chahiye: user ka naam, photo, uski latest 3 posts, aur followers count. REST mein ye teen alag resources hain:` },
    { type: 'code', text: `
GET /users/42              → poora user object (30 fields, chahiye sirf 2)
GET /users/42/posts        → saari posts ki list (chahiye sirf 3, sirf title)
GET /users/42/followers    → followers ki list (chahiye sirf count)` },
    { type: 'callout', tone: 'term', title: 'Naya word: over-fetching aur under-fetching', html: `<strong>Ye kya hai:</strong> <strong>over-fetching</strong> = zarurat se zyada data aana (chahiye 2 fields, aaye 30). <strong>Under-fetching</strong> = ek call mein poora data na milna, isliye kai calls karni padein (yahan 3).<br><strong>Kyun problem hai:</strong> over-fetching mobile data aur battery khaata hai. Under-fetching mein har call ek <strong>round trip</strong> hai (request jaana + jawab aana). Slow 4G pe ek round trip 200-300 ms ka ho sakta hai. Teen ek ke baad ek = ~1 second intezaar.<br><strong>Iske bina (agar ye problems na hon):</strong> ek call, sirf zaroori fields, screen turant.<br><strong>REST mein jugaad:</strong> har screen ke liye naya endpoint (<code>/profile-screen/42</code>) ya <code>?fields=name,photo</code>. Kaam karta hai, lekin 10 screens aur 3 apps ke saath endpoints ka jungle ban jaata hai.` },

    { type: 'h2', text: 'GraphQL: client batata hai ki use kya chahiye' },
    { type: 'callout', tone: 'term', title: 'Naya word: GraphQL', html: `<strong>Ye kya hai:</strong> API ka ek style (aur query language) jo Facebook ne apni mobile app ke liye banaya aur 2015 mein open source kiya. Ek hi endpoint (jaise <code>/graphql</code>) hota hai. Client ek <strong>query</strong> bhejta hai jisme exact shape likhi hoti hai, aur server bilkul wahi shape lautata hai.<br><strong>Kyun chahiye:</strong> alag screens aur alag apps (Android, iPhone, web, smart TV) ko same data alag shapes mein chahiye. Har ek ke liye naya endpoint banane ki jagah client khud maang leta hai.<br><strong>Iske bina:</strong> over/under-fetching, ya backend team har nayi screen ke liye naya endpoint banati rahe.<br><strong>Example:</strong> GitHub ki public API REST bhi deti hai aur GraphQL bhi.` },
    { type: 'compare',
      left: { title: 'Query (client bhejta hai)', ascii: `
query {
  user(id: 42) {
    name
    photo
    followersCount
    posts(last: 3) { title }
  }
}` },
      right: { title: 'Response (bilkul usi shape mein)', ascii: `
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
    { type: 'callout', tone: 'term', title: 'Naya word: schema aur resolver', html: `<strong>Ye kya hai:</strong> <strong>schema</strong> GraphQL server ka <em>naksha</em> hai: kaunse types hain, har type mein kaunse fields, aur unke type kya hain (neeche code). Client sirf wahi maang sakta hai jo schema mein hai. <strong>Resolver</strong> ek chhota function hai jo ek field ka data laata hai: <code>User.posts</code> ka resolver Post service ko call karta hai, <code>User.followersCount</code> ka resolver Follow service ko.<br><strong>Kyun chahiye:</strong> schema se server galat query ko chalane se pehle hi reject kar deta hai, aur tools autocomplete/docs apne aap bana lete hain. Resolvers se har field apni jagah se aata hai.<br><strong>Iske bina:</strong> client ko pata nahi kya maang sakta hai, aur server ko pata nahi har field kahan se laana hai.` },
    { type: 'code', text: `
type User {
  id: ID!                 # ! = kabhi null nahi
  name: String!
  photo: String
  followersCount: Int!
  posts(last: Int): [Post!]!
}
type Post { id: ID!  title: String!  author: User! }

type Query    { user(id: ID!): User  feed(first: Int, after: String): [Post!]! }
type Mutation { createPost(text: String!): Post! }       # data badalna
type Subscription { newComment(postId: ID!): Comment! }   # live updates` },
    { type: 'table', head: ['Operation', 'Kya karta hai', 'REST mein lagbhag'], rows: [
      ['<code>query</code>', 'Data padhna', 'GET'],
      ['<code>mutation</code>', 'Data badalna (banana, update, delete)', 'POST / PUT / PATCH / DELETE'],
      ['<code>subscription</code>', 'Live updates: server naya data aate hi bhejta hai (aksar WebSocket pe)', 'Polling ya WebSocket (realtime lesson)'],
    ]},
    { type: 'p', html: `Ab chala ke dekho. Pehle REST ke teen round trips, phir GraphQL ka ek. Teesra scenario GraphQL ki ek nayi problem dikhata hai.` },
    { type: 'flow', height: 300,
      nodes: [
        { id: 'app', label: 'Mobile app', sub: 'profile screen', x: 90, y: 150, w: 130, kind: 'client', info: 'Ye kya hai: xyz.com ki app jo profile screen bana rahi hai. Slow 4G pe hai, isliye har round trip mehenga hai.' },
        { id: 'gw', label: 'API layer', sub: 'REST ya GraphQL', x: 310, y: 150, w: 150, kind: 'edge', info: 'Ye kya hai: xyz.com ka bahar wala darwaza. REST mode mein 3 alag endpoints hain. GraphQL mode mein ek endpoint hai jo query padhta hai, schema se check karta hai, aur resolvers se andar ki services ko call karke jawab jodta hai.' },
        { id: 'us', label: 'User service', x: 570, y: 50, w: 140, kind: 'server', info: 'Ye kya hai: users ka data (naam, photo) rakhne wala chhota alag program (service). Data center ke andar hai, isliye API layer se iski call ~1 ms ki hai.' },
        { id: 'ps', label: 'Post service', x: 570, y: 150, w: 140, kind: 'server', info: 'Ye kya hai: posts ka data rakhne wali service. "Latest 3 posts" yahin se aati hain.' },
        { id: 'fs', label: 'Follow service', x: 570, y: 250, w: 140, kind: 'server', info: 'Ye kya hai: kaun kisko follow karta hai, iska data. Followers count yahin se aata hai.' },
      ],
      edges: [{ a: 'app', b: 'gw' }, { a: 'gw', b: 'us' }, { a: 'gw', b: 'ps' }, { a: 'gw', b: 'fs' }],
      scenarios: [
        { name: 'REST: 3 round trips', steps: [
          { title: 'Call 1: /users/42', go: ['app>gw>us', 'res:us>gw>app'], text: 'Pehla round trip. 30 fields aaye, chahiye the 2.', msg: 'GET /users/42' },
          { title: 'Call 2: /users/42/posts', go: ['app>gw>ps', 'res:ps>gw>app'], text: 'Doosra round trip. Saari posts aayin, chahiye thi 3.', msg: 'GET /users/42/posts' },
          { title: 'Call 3: /users/42/followers', go: ['app>gw>fs', 'res:fs>gw>app'], text: 'Teesra round trip. Poori list aayi, chahiye sirf count. Slow network pe user ne ~1 second wait kiya.', msg: 'GET /users/42/followers' },
        ]},
        { name: 'GraphQL: 1 round trip', steps: [
          { title: 'Ek query', go: 'app>gw', text: 'App ne ek hi request mein bata diya ki kya chahiye.', msg: 'POST /graphql  { user(id:42){ name photo followersCount posts(last:3){title} } }' },
          { title: 'Resolvers andar se data laate hain', text: 'Har field ka resolver apni service ko call karta hai, saath saath. Ye calls data center ke tez network pe hain (~1 ms), user ke slow network pe nahi.', parallel: true, go: ['gw>us', 'gw>ps', 'gw>fs'] },
          { title: 'Jawab jode gaye', parallel: true, go: ['res:us>gw', 'res:ps>gw', 'res:fs>gw'], text: 'API layer ne teeno ko query ki shape mein joda.' },
          { title: 'App tak, ek round trip', go: 'res:gw>app', text: 'Sirf zaroori fields. Slow network pe ek hi intezaar.' },
        ]},
        { name: 'Bhaari query: limit se roko', steps: [
          { title: 'Koi bahut gehri query bhejta hai', text: 'Followers ke followers ke followers... 6 level gehra. Ek request, lekin andar crores rows chhoo sakti hai. Galti se ya jaan boojh ke (attack).', go: 'app>gw', msg: '{ user(id:42){ followers(first:100){ followers(first:100){ followers(first:100){ ... } } } } }' },
          { title: 'Chalane se pehle keemat gino', text: 'Server query ki depth aur "cost" (kitne items chhooegi) pehle hi ginta hai: 100 × 100 × 100 = 10 lakh+. Hadd (jaise depth 5, cost 10,000) paar. Services ko call hi nahi kiya.', go: 'bad:gw>app', set: { us: { state: 'dim' }, ps: { state: 'dim' }, fs: { state: 'dim' } }, after: { gw: { state: 'warn', sub: 'cost too high' } }, msg: '{ "errors": [{ "message": "Query cost 1010100 exceeds limit 10000" }] }' },
        ]},
      ],
    },

    { type: 'h3', text: 'N+1 problem: GraphQL ka chhupa hua khatra' },
    { type: 'p', html: `Feed ki query socho: "20 posts do, aur har post ke saath uske author ka naam". Resolvers field-by-field chalte hain. <code>feed</code> resolver ek query se 20 posts laata hai. Phir <code>Post.author</code> resolver <strong>har post ke liye alag</strong> chalta hai: 20 aur queries. Total 1 + 20 = 21. Isi ko <strong>N+1 problem</strong> kehte hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: N+1 aur DataLoader', html: `<strong>Ye kya hai:</strong> <strong>N+1</strong> = list ke liye 1 query, phir list ke N items mein se har ek ke liye 1 query. <strong>DataLoader</strong> (Facebook ki ek chhoti library) ek "batching" helper hai: wo ek pal ke liye saari author requests jama karta hai, duplicate ids hataata hai, aur ek hi query bhejta hai: <code>WHERE id IN (...)</code>.<br><strong>Kyun chahiye:</strong> 20 ki jagah 2 queries. Database pe bojh aur latency dono kam.<br><strong>Iske bina:</strong> 100 posts ka feed = 101 queries, har user ke liye. Traffic badha aur database dhaha.<br>Ye problem REST mein bhi ho sakti hai (galat likha code), lekin GraphQL mein resolvers ki wajah se bahut aasaani se ho jaati hai.` },
    { type: 'custom', render(el) {
      const S = { n: 'Feed mein posts (N)', dl: 'DataLoader (batching) ON', q: 'Database queries', authors: 'Alag authors', log: 'Database pe gayi queries:',
        more: k => `... aur ${k} aisi hi queries`,
        noteOff: (n, a) => `Bina batching: 1 query posts ke liye + har post ke author ke liye 1 = ${1 + n}. Jabki authors sirf ${a} alag hain: ${n - a} queries ne koi pehle padha hua user dobara padha.`,
        noteOn: (n, a) => `DataLoader ne ${n} author requests jama ki, duplicates hataaye (${a} alag ids), aur ek hi IN query bheji. Total 2 queries, N kitna bhi ho.` };
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
    { type: 'h3', text: 'Caching mushkil kyun hai' },
    { type: 'p', html: `REST mein <code>GET /users/42</code> ka ek pakka URL hai. Browser, CDN aur reverse proxy us URL ke hisaab se jawab cache kar lete hain (caching aur CDN lessons aage hain). GraphQL mein aam taur pe <strong>sab kuch</strong> <code>POST /graphql</code> pe jaata hai, aur asli sawaal body mein hota hai. Har request ka URL same, body alag. HTTP caches body nahi dekhte, aur POST ko cache karte hi nahi. Nateeja: CDN wala muft ka caching kaam nahi karta.` },
    { type: 'list', items: [
      `<strong>GET pe query:</strong> padhne wali queries GET se bhejo (<code>/graphql?query=...</code>). GraphQL over HTTP spec ise allow karta hai. Lekin lambi query = lamba URL, aur URLs ki hadd hoti hai.`,
      `<strong>Persisted queries:</strong> app poori query ki jagah uska <em>hash</em> bhejti hai (<code>/graphql?id=a3f9...</code>). Server hash se query dhoondh leta hai. URL chhota aur stable, CDN cache kar sakta hai. Bonus: server sirf pehle se registered queries chalata hai, anjaani bhaari queries nahi.`,
      `<strong>Client-side cache:</strong> Apollo, Relay jaise client libraries har object ko id se apni memory mein rakhti hain, taaki ek hi user doosri screen pe dobara na maangna pade.`,
    ]},
    { type: 'callout', tone: 'mistake', html: `<strong>"GraphQL ne 200 OK diya, matlab sab theek."</strong> Zaroori nahi. GraphQL aksar 200 ke saath bhi <code>{"data": {...}, "errors": [...]}</code> lautata hai: kuch fields aa gaye, kuch fail ho gaye. App ko hamesha <code>errors</code> array dekhna chahiye. Isliye monitoring tools jo sirf status code dekhte hain, GraphQL errors miss kar dete hain.` },
    { type: 'table', head: ['GraphQL', 'Kya milta hai', 'Kya chukana padta hai'], rows: [
      ['Data shape', 'Ek request, exactly zaroori fields', 'Server ko har query ki keemat (depth/cost) limit karni padti hai'],
      ['Nayi screens', 'Backend change ke bina naye combinations', 'Resolvers mein N+1 ka khatra, DataLoader chahiye'],
      ['Types', 'Strongly typed schema, autocomplete, docs', 'Schema design ka extra kaam'],
      ['Caching', 'Client-side normalized cache', 'HTTP/CDN caching mushkil (POST, ek URL); persisted queries chahiye'],
      ['Kab overkill', '-', 'Chhoti, simple CRUD API, ek hi client'],
    ]},

    { type: 'h2', text: 'gRPC: services ke beech tez baatcheet' },
    { type: 'p', html: `Ab andar dekho. xyz.com ka backend ab ek bada program nahi raha. 20 chhoti services hain (user, post, follow, feed, notification...), aur wo ek doosre ko second mein lakhon baar call karti hain. Har call pe JSON text banana, bhejna aur parse karna CPU aur network dono khaata hai. Aur JSON mein koi pakka contract nahi: ek team ne field ka naam badla, doosri team ki service raat ko toot gayi.` },
    { type: 'callout', tone: 'term', title: 'Naya word: RPC', html: `<strong>Ye kya hai:</strong> RPC (Remote Procedure Call) = doosri machine pe chal rahe function ko aise call karna jaise wo apne hi code ka function ho: <code>user = userService.GetUser(42)</code>. Network ka saara kaam (bytes banana, bhejna, jawab padhna) library chhupa leti hai.<br><strong>Kyun chahiye:</strong> service-to-service code saaf aur simple rehta hai.<br><strong>Iske bina:</strong> har jagah haath se URL banana, JSON likhna, status code padhna.<br><strong>Fark REST se:</strong> REST "resources" (nouns) aur HTTP methods mein sochta hai; RPC "actions" (functions, verbs) mein: <code>GetUser</code>, <code>CreatePost</code>.` },
    { type: 'callout', tone: 'term', title: 'Naya word: gRPC', html: `<strong>Ye kya hai:</strong> Google ka banaya open-source RPC framework (2015 mein open source; Google ke andar ke purane system "Stubby" pe based). Teen cheezein milti hain: <strong>Protobuf</strong> (chhota binary data), <strong>HTTP/2</strong> (ek connection pe kai calls saath saath, aur streaming), aur <strong>code generation</strong> (contract file se har language ka client code apne aap).<br><strong>Kyun chahiye:</strong> andar ki high-traffic calls tez, sasti aur type-safe ho jaati hain.<br><strong>Iske bina:</strong> JSON/REST se bhi chalega, lekin zyada CPU, zyada bytes, aur contract todne wale bugs.<br><strong>Example:</strong> Netflix, Square, Cisco jaisi companies gRPC use karti hain; Kubernetes ke andar bhi kai components gRPC bolte hain.` },
    { type: 'code', text: `
// user.proto  ← contract: dono services isi file se code banati hain
syntax = "proto3";

service UserService {
  rpc GetUser (GetUserRequest) returns (User);
  rpc WatchFollowers (GetUserRequest) returns (stream FollowerEvent);  // streaming
}
message GetUserRequest { int64 id = 1; }
message User {
  int64  id        = 1;   // ← ye "= 1" field ka NUMBER hai, value nahi
  string name      = 2;
  int64  followers = 3;
}` },
    { type: 'callout', tone: 'term', title: 'Naya word: Protocol Buffers (Protobuf)', html: `<strong>Ye kya hai:</strong> Google ka binary data format. <code>.proto</code> file mein har field ko ek <strong>number</strong> milta hai. Wire pe (network pe) field ka naam nahi jaata, sirf ye number aur value. Chhote numbers kam bytes lete hain (<strong>varint</strong> encoding: 1200 jaisa number 2 bytes mein).<br><strong>Kyun chahiye:</strong> JSON se kaafi chhota aur parse karne mein tez. Aur <code>.proto</code> file ek pakka contract hai.<br><strong>Iske bina:</strong> har baar field ke naam text mein, aur koi contract nahi.<br><strong>Niyam:</strong> field number kabhi badlo ya dobara use mat karo. Naya field naye number ke saath jodo; purane code use ignore kar deta hai. Hataaya hua number <code>reserved</code> kar do.` },
    { type: 'p', html: `What-is-API lesson mein kaha tha: <code>{"id":42,"name":"Riya","followers":1200}</code> JSON mein 40 bytes, Protobuf mein 11. Ab khud gino. Values badal ke dekho, har byte ka matlab neeche likha hai:` },
    { type: 'custom', render(el) {
      const S = { id: 'id', name: 'name', fol: 'followers', json: 'JSON', proto: 'Protobuf (hex bytes)', bytes: 'bytes', save: 'Bachat',
        perSec: 'Agar 1 lakh calls per second', perSecV: (mb) => `${mb} MB/s kam data`,
        tag: n => `field ${n} ka tag`, len: 'length', skip: n => `field ${n}: value 0 / khaali, isliye bheja hi nahi (proto3 default)`,
        note: 'Tag byte = (field number × 8) + wire type. Number (varint) har byte mein 7 bits rakhta hai; agar aur bytes baaki hain to byte ka upar wala bit 1 hota hai. String: tag, phir length, phir UTF-8 bytes. Field ke naam ("followers") kabhi network pe nahi jaate.' };
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
    { type: 'h3', text: 'HTTP/2 aur 4 tarah ki calls' },
    { type: 'p', html: `HTTP versions wale lesson mein dekha tha: <strong>HTTP/2</strong> ek hi TCP connection pe kai requests saath saath chala sakta hai (multiplexing). gRPC isi pe chalta hai. Services ke beech connection ek baar khulta hai aur hazaron calls usi pe jaati hain: har call pe naya TCP + TLS handshake nahi. HTTP/2 ki wajah se gRPC sirf "ek sawaal, ek jawab" nahi, <strong>streams</strong> bhi kar sakta hai: ek call ke andar kai messages, dono taraf se.` },
    { type: 'table', head: ['Call type', 'Kaisa', 'xyz.com example'], rows: [
      ['Unary', 'Ek request, ek response (normal function jaisa)', '<code>GetUser(42)</code> → User'],
      ['Server streaming', 'Ek request, server lagatar kai messages bhejta hai', '<code>WatchScore(match)</code> → har ball pe naya score'],
      ['Client streaming', 'Client kai messages bhejta hai, server aakhir mein ek jawab', 'Phone 1000 location points bhejta hai → "saved"'],
      ['Bidirectional streaming', 'Dono taraf se lagatar, saath saath', 'Live chat ya voice assistant jo sunte sunte jawab de'],
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: deadline', html: `<strong>Ye kya hai:</strong> gRPC mein har call ke saath ek <strong>deadline</strong> jaati hai: "mujhe is time tak jawab chahiye" (jaise 300 ms). Agar service A ne B ko call kiya aur B ne C ko, to bacha hua time aage pass hota hai.<br><strong>Kyun chahiye:</strong> agar user ka request already timeout ho chuka hai, to neeche ki services bekaar kaam na karti rahein.<br><strong>Iske bina:</strong> ek slow service ki wajah se poori chain atki rehti hai, threads aur connections bhar jaate hain (resilience lesson mein ise cascade failure kehte hain).<br>gRPC ke apne status codes hain, jaise <code>OK</code>, <code>NOT_FOUND</code>, <code>DEADLINE_EXCEEDED</code>, <code>UNAVAILABLE</code> (retry kar sakte ho), <code>PERMISSION_DENIED</code>.` },
    { type: 'flow', height: 300,
      nodes: [
        { id: 'app', label: 'Mobile app', x: 85, y: 150, w: 120, kind: 'client', info: 'Ye kya hai: xyz.com ki app. Ye bahar se REST/JSON (ya GraphQL) bolti hai. Andar gRPC hai, iska app ko pata bhi nahi.' },
        { id: 'bff', label: 'API gateway', sub: 'REST → gRPC', x: 280, y: 150, w: 150, kind: 'edge', info: 'Ye kya hai: bahar aur andar ke beech ka translator. App se REST/JSON leta hai, andar services ko gRPC se call karta hai, jawab jod ke JSON mein lautata hai. Har andar ki call pe deadline lagata hai.' },
        { id: 'feed', label: 'Feed service', x: 500, y: 55, w: 150, kind: 'server', info: 'Ye kya hai: feed banane wali service. Posts laati hai, phir authors ke naam ke liye User service ko ek batched gRPC call karti hai.' },
        { id: 'user', label: 'User service', x: 500, y: 150, w: 150, kind: 'server', info: 'Ye kya hai: users ka data dene wali service. GetUsers([ids]) ek hi call mein kai users lautata hai (N+1 se bachne ke liye).' },
        { id: 'live', label: 'Score service', x: 500, y: 245, w: 150, kind: 'server', info: 'Ye kya hai: live cricket score dene wali service. Server-streaming RPC: ek baar subscribe karo, phir har naya score apne aap aata hai.' },
      ],
      edges: [{ a: 'app', b: 'bff' }, { a: 'bff', b: 'feed' }, { a: 'bff', b: 'user' }, { a: 'bff', b: 'live' }, { a: 'feed', b: 'user' }],
      scenarios: [
        { name: 'Unary: feed lao', steps: [
          { title: 'App REST call karti hai', text: 'Bahar se normal JSON request.', go: 'app>bff', msg: 'GET /api/v1/feed' },
          { title: 'Gateway gRPC se Feed service ko', text: 'Binary Protobuf, pehle se khule HTTP/2 connection pe. Deadline: 300 ms.', go: 'bff>feed', msg: 'FeedService.GetFeed(user_id: 42)  deadline: 300ms' },
          { title: 'Feed service, User service se naam', text: 'Ek batched call: 20 posts ke 8 alag authors, ek hi request mein.', go: ['feed>user', 'res:user>feed'], msg: 'UserService.GetUsers(ids: [1,2,3,4,5,6,7,8])' },
          { title: 'Jawab wapas, JSON mein', text: 'Gateway ne Protobuf ko JSON mein badla aur app ko diya. Andar ki do calls milake kuch hi milliseconds.', go: ['res:feed>bff', 'res:bff>app'] },
        ]},
        { name: 'Server streaming: live score', steps: [
          { title: 'Gateway ek baar subscribe karta hai', text: 'Ek hi call, jo khuli rehti hai.', go: 'bff>live', msg: 'ScoreService.WatchScore(match: "IND-AUS")' },
          { title: 'Score aaya', text: 'Service khud message bhejti hai, bina poochhe. Gateway use app tak bhejta hai (app ke saath WebSocket jaisa live connection, realtime lesson mein).', go: 'evt:live>bff>app', after: { live: { sub: 'IND 120/2' } } },
          { title: 'Agla score', text: 'Wahi stream, naya message. Har baar naya request nahi, naya handshake nahi.', go: 'evt:live>bff>app', after: { live: { sub: 'IND 124/2' } } },
          { title: 'Wicket!', text: 'Stream tab tak chalti hai jab tak match khatam na ho ya client band na kare.', go: 'evt:live>bff>app', after: { live: { sub: 'IND 124/3', state: 'hot' } } },
        ]},
        { name: 'Deadline exceeded', steps: [
          { title: 'Feed request, 300 ms ki deadline', text: 'Gateway ne Feed service ko call kiya.', go: 'app>bff>feed', msg: 'GetFeed(42)  deadline: 300ms' },
          { title: 'User service bahut slow', text: 'User service overload hai. Feed service ka call wahan atak gaya. Bacha hua time khatam.', go: 'lost:feed>user', set: { user: { state: 'hot', sub: 'slow: 2 s' } } },
          { title: 'DEADLINE_EXCEEDED', text: 'gRPC ne khud call cancel ki aur error diya. Feed service bekaar intezaar nahi karti, thread free.', go: 'bad:feed>bff', msg: 'status: DEADLINE_EXCEEDED' },
          { title: 'App ko saaf jawab', text: 'Gateway app ko jaldi error deta hai (ya cache se purana feed). User 2 second spinner nahi dekhta. Retry thodi der baad.', go: 'bad:bff>app', msg: 'HTTP/1.1 503 Service Unavailable\nRetry-After: 2' },
        ]},
      ],
    },
    { type: 'callout', tone: 'mistake', html: `<strong>"gRPC browser se seedha call kar lenge."</strong> Nahi. Browsers HTTP/2 ke us level ke control nahi dete jo gRPC ko chahiye. Iske liye <strong>gRPC-Web</strong> hai, jisme beech mein ek proxy (jaise Envoy) translate karta hai. Isliye gRPC aksar <strong>andar ke service-to-service</strong> calls ke liye hota hai, aur bahar public/mobile ke liye REST ya GraphQL. (Mobile apps gRPC bol sakti hain, kuch badi apps bolti bhi hain, lekin public APIs mein REST hi common hai.)` },
    { type: 'h2', text: 'Kab kaunsa?' },
    { type: 'table', head: ['', 'REST', 'GraphQL', 'gRPC'], rows: [
      ['Data format', 'JSON (text)', 'JSON (text)', 'Protobuf (binary)'],
      ['Endpoints', 'Har resource ka URL', 'Ek endpoint, query mein shape', 'Har function ek RPC method'],
      ['HTTP caching / CDN', 'Aasaan (GET + URL)', 'Mushkil (persisted queries se)', 'Nahi (andar ki calls, zarurat bhi kam)'],
      ['Contract', 'Optional (OpenAPI)', 'Schema zaroori', '.proto zaroori, code generate'],
      ['Streaming', 'Nahi (alag se SSE/WebSocket)', 'Subscriptions', 'Haan, 4 tarah ki calls'],
      ['Browser support', 'Poora', 'Poora', 'gRPC-Web + proxy chahiye'],
      ['Sabse achha', 'Public APIs, simple CRUD', 'Kai clients, alag shapes', 'Internal service-to-service, high traffic'],
    ]},
    { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>REST</strong> public aur mobile APIs ke liye: simple hai, cache ho sakta hai, har developer jaanta hai. <strong>gRPC</strong> andar ki un services ke beech jo ek doosre ko second mein hazaron baar call karti hain: tez, typed, streaming. <strong>GraphQL</strong> tab, jab bahut saare alag clients ko same data alag shapes mein chahiye aur over-fetching se bachna hai, aur tum N+1 aur query limits sambhaalne ko taiyaar ho. Shak ho to REST se shuru karo.` },
    { type: 'ascii', text: `
Asli duniya mein aksar teeno saath:

 Mobile / Web ──(GraphQL ya REST)──> API Gateway / BFF
 Partners ─────(REST)─────────────────────┘ │
                       ┌─────(gRPC)──────────┼──────(gRPC)─────┐
                       v                     v                 v
                  User service          Post service     Follow service` },
    { type: 'callout', tone: 'term', title: 'Naya word: BFF', html: `<strong>Ye kya hai:</strong> BFF (Backend For Frontend) = har tarah ke client ke liye ek patli layer, jaise "mobile BFF" aur "web BFF". Ye bahar client ki pasand ki shape mein (GraphQL ya REST) data deti hai, aur andar services ko gRPC se call karti hai.<br><strong>Kyun chahiye:</strong> mobile aur web ki zaroorat alag hai; andar ki services ko is farak ki fikr na karni pade.<br><strong>Iske bina:</strong> ya to har service har client ke liye khaas endpoints banaye, ya client 10 services ko seedha call kare.` },

    { type: 'diagram', title: 'REST + GraphQL + gRPC: poori picture', height: 530,
      groups: [
        { label: 'Clients', x: 10, y: 14, w: 700, h: 92 },
        { label: 'Bahar ki APIs', x: 60, y: 140, w: 600, h: 100 },
        { label: 'gRPC services', x: 15, y: 290, w: 690, h: 100 },
        { label: 'Data', x: 220, y: 420, w: 280, h: 96 },
      ],
      nodes: [
        { id: 'web', label: 'Website', sub: 'browser', x: 100, y: 60, kind: 'client', info: 'Ye kya hai: xyz.com ki website. GraphQL BFF se apni har screen ke liye exactly zaroori data maangti hai.' },
        { id: 'mob', label: 'Mobile apps', sub: 'Android, iPhone', x: 300, y: 60, kind: 'client', info: 'Ye kya hai: xyz.com ki apps. Slow network pe hain, isliye GraphQL se ek round trip mein sirf zaroori fields.' },
        { id: 'partner', label: 'Partner devs', sub: 'API key', x: 560, y: 60, kind: 'client', info: 'Ye kya hai: bahar ki companies. Inke liye simple, documented, cacheable REST API, rate limits ke saath.' },
        { id: 'gql', label: 'GraphQL BFF', sub: '/graphql', x: 200, y: 190, kind: 'edge', info: 'Ye kya hai: website aur apps ke liye GraphQL server. Query ko schema se check karta hai, depth/cost limit lagata hai, resolvers se gRPC calls karta hai (DataLoader ke saath, taaki N+1 na ho).' },
        { id: 'rest', label: 'Public REST', sub: '/api/v1', x: 540, y: 190, kind: 'edge', info: 'Ye kya hai: partners ke liye REST API. GET responses CDN pe cache ho sakte hain. Andar ye bhi gRPC se services ko call karti hai.' },
        { id: 'user', label: 'User service', x: 110, y: 340, kind: 'server', info: 'Ye kya hai: users ka data. GetUser / GetUsers RPC methods. Doosri services isse gRPC pe baat karti hain.' },
        { id: 'post', label: 'Post service', x: 270, y: 340, kind: 'server', info: 'Ye kya hai: posts ka data. Feed banate waqt authors ke naam ke liye User service ko ek batched gRPC call karti hai.' },
        { id: 'follow', label: 'Follow service', x: 430, y: 340, kind: 'server', info: 'Ye kya hai: followers ka data aur counts. GraphQL BFF aur public REST dono isse gRPC pe poochhte hain.' },
        { id: 'score', label: 'Score service', sub: 'stream', x: 600, y: 340, kind: 'server', info: 'Ye kya hai: live score. Server-streaming RPC: ek baar subscribe, phir har update apne aap. Partners ko REST layer ke through milta hai.' },
        { id: 'db', label: 'Databases', sub: 'har service ka apna', x: 360, y: 470, w: 200, kind: 'data', info: 'Ye kya hai: har service ka apna data store. Services ek doosre ke database mein seedha nahi jhaankti; gRPC API se poochhti hain. Isliye .proto contract itna zaroori hai.' },
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
        { name: 'App screen (GraphQL)', text: 'App ek query bhejti hai. BFF gRPC se Post service ko, wo batched call se User service ko. Ek round trip, exact shape.', go: ['mob>gql>post>user', 'post>db'] },
        { name: 'Partner (REST)', text: 'Partner simple REST GET karta hai. REST layer andar gRPC se Follow service ko call karti hai.', go: ['partner>rest>follow>db'] },
        { name: 'Live score (stream)', text: 'REST layer Score service se ek gRPC stream kholti hai. Har naya score bina naye request ke aata hai.', go: ['partner>rest>score'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>REST ki do kamiyaan: over-fetching (zarurat se zyada data) aur under-fetching (kai round trips).</li>
      <li>GraphQL: ek endpoint, client query mein exact shape likhta hai. Schema + resolvers. Query, mutation, subscription.</li>
      <li>GraphQL ke khatre: N+1 (DataLoader se batching), bhaari queries (depth/cost limit), HTTP caching mushkil (GET + persisted queries), 200 ke saath bhi errors.</li>
      <li>gRPC: RPC framework = Protobuf (binary, field numbers) + HTTP/2 (multiplexing, streaming) + code generation.</li>
      <li>Protobuf mein field numbers kabhi badlo ya dobara use mat karo; naye fields jodna safe.</li>
      <li>gRPC calls: unary, server streaming, client streaming, bidirectional. Har call pe deadline.</li>
      <li>Browser seedha gRPC nahi bolta (gRPC-Web + proxy). Isliye gRPC andar, REST/GraphQL bahar.</li>
      <li>Decide: public/mobile = REST, internal high traffic = gRPC, kai clients alag shapes = GraphQL.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['REST: simple, cacheable, sab jaante hain', 'GraphQL: ek round trip, exact data, naye screens bina naye endpoints', 'gRPC: chhota payload, kam CPU, typed contract, streaming, deadlines', 'Teeno saath: bahar flexible, andar tez'], costs: ['Teen styles = teen tarah ke tools, monitoring aur skills', 'GraphQL: N+1, cost limits, caching ka extra kaam', 'gRPC: binary data aankh se nahi padh sakte, browser ke liye proxy, .proto files sambhaalni padti hain', 'Translation layers (gateway/BFF) ek aur hop aur ek aur cheez jo gir sakti hai'] },
    { type: 'think', questions: [
      { q: 'xyz.com public API bana raha hai jo hazaron third-party developers use karenge. GraphQL ya REST?', a: 'Zyada tar REST: har developer jaanta hai, CDN/HTTP caching aasaan, rate limiting simple. GraphQL bhi possible hai (GitHub dono deta hai), lekin query cost limits, caching aur docs pe extra mehnat lagegi.' },
      { q: 'Do internal services ek doosre ko 50,000 baar per second call karti hain. JSON/REST se gRPC pe jaane se kya faayda?', a: 'Chhota binary payload (kam bandwidth), tez serialization (kam CPU), HTTP/2 pe ek hi connection mein bahut saari calls (har call pe naya handshake nahi), deadlines, aur typed contract se bugs kam.' },
      { q: 'GraphQL feed query 50 posts aur har post ke author ka naam laati hai. Database dashboard pe 51 queries per request dikh rahi hain. Kya hua aur fix kya?', a: 'N+1 problem: author resolver har post ke liye alag chal raha hai. Fix: DataLoader jaisa batching, jo saare author ids jama karke ek WHERE id IN (...) query bheje. 51 se 2 queries.' },
      { q: 'Ek team ne .proto mein field "followers = 3" hata ke naya field "bio = 3" bana diya. Kya toot sakta hai?', a: 'Purane clients ab bhi field 3 ko followers (number) samajh ke padhenge, lekin wahan ab bio (text) hai: galat data ya parse error. Niyam: hata ke number reserved karo, naya field naye number (jaise 4) pe.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Over-fetching kya hai?', options: ['Zarurat se kam data', 'Zarurat se zyada data', 'Bahut zyada requests'], answer: 1, explain: 'Chahiye 2 fields, aaye 30.' },
      { q: 'gRPC data kis format mein bhejta hai?', options: ['XML', 'JSON', 'Protocol Buffers (binary)'], answer: 2, explain: 'Protobuf compact aur tez hai; field ke naam ki jagah number jaata hai.' },
      { q: 'GraphQL ka ek bada nuksaan?', options: ['Ek endpoint (POST) hone se HTTP caching mushkil', 'Typed nahi hai', 'Mobile pe nahi chalta'], answer: 0, explain: 'Sab requests POST /graphql pe, URL-based caching kaam nahi karti. GET + persisted queries se kuch had tak theek hota hai.' },
      { q: 'DataLoader kya karta hai?', options: ['Queries ko cache se hatata hai', 'Ek pal ki saari requests jama karke ek batched query bhejta hai', 'GraphQL ko gRPC mein badalta hai'], answer: 1, explain: 'N author lookups → ek WHERE id IN (...) query. N+1 se 2.' },
      { q: 'Live cricket score har ball pe services ke beech bhejna hai. gRPC ka kaunsa call type?', options: ['Unary', 'Server streaming', 'Client streaming'], answer: 1, explain: 'Ek baar subscribe, phir server lagatar naye messages bhejta hai.' },
      { q: 'gRPC mein deadline ka faayda?', options: ['Data encrypt hota hai', 'Late ho chuke kaam ko neeche ki services bekaar nahi karti; slow service poori chain nahi atkaati', 'Payload chhota hota hai'], answer: 1, explain: 'Deadline aage pass hoti hai. Time khatam = DEADLINE_EXCEEDED, kaam cancel.' },
    ]},
    { type: 'sources', note: 'GraphQL aur gRPC ke tathya official docs se.', items: [
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
