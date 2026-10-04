Lesson.register({
  id: 'what-is-api',
  title: 'API kya hai? REST basics',
  minutes: 24,
  summary: `Ab tak server poora HTML page bhej raha tha. Lekin xyz.com ki mobile app ko page nahi, sirf data chahiye. API wo fixed tareeka hai jisse koi bhi app server se data maang sakti hai. Is lesson mein: request aur response ke hisse, JSON, REST (resources + HTTP methods), kaunsa method safe aur idempotent hai, status codes (ek playground mein khud chala ke), JSON vs binary formats, versioning, aur achhi API design ke niyam.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Tumhare phone ki xyz.com app ko jaanna hai: "Riya ke kitne followers hain?"<br>App seedha server ke database mein jhaank nahi sakti. Use server se <strong>poochhna</strong> padta hai.<br>Poochhne ka ek pakka tareeka chahiye: kis address pe poochho, kis shabd mein poochho, aur jawab kis shakal mein aayega.<br>Isi pakke tareeke ko <strong>API</strong> kehte hain. Is lesson mein hum seekhenge ki ye tareeka kaisa dikhta hai, aur ek achhi API kaisi hoti hai.` },

    { type: 'h2', text: 'Problem: mobile app ko HTML nahi chahiye' },
    { type: 'p', html: `Pichhle lessons mein browser ne <code>GET /profile/42</code> maanga aur server ne poora <strong>HTML page</strong> bheja. HTML matlab page ka poora design: heading, image, buttons, sab.` },
    { type: 'p', html: `Ab xyz.com ki Android app bhi hai. App apni screens khud banati hai, apne buttons aur design ke saath. Use server se design nahi chahiye. Use bas itna chahiye: <em>"user 42 ka naam, photo aur followers count."</em>` },
    { type: 'p', html: `Aur sirf Android nahi. iPhone app, website, aur shayad koi doosri company bhi xyz.com se data lena chahti hai. Agar har ek ke liye alag jugaad banayein, to kaam 4 guna ho jaayega. Hamein <strong>ek</strong> darwaza chahiye jahan sab ek hi niyam se data maangein.` },
    { type: 'callout', tone: 'term', title: 'Naya word: API', html: `<strong>Ye kya hai:</strong> API (Application Programming Interface) ek program ka doosre program se baat karne ka pakka tareeka hai. Jaise TV remote: remote pe gine-chune buttons hain (volume, channel). Tum button dabaate ho, TV kaam kar deta hai. TV ke andar ka circuit tumhe jaanna nahi padta.<br><strong>Kyun chahiye:</strong> Android, iPhone, website aur partner companies, sab ek hi niyam se xyz.com ka data maang sakein, aur server andar se kaise kaam karta hai ye kisi ko jaanna na pade.<br><strong>Iske bina:</strong> har app ke liye alag code, har chhote server change pe sab apps toot jaayengi, aur bahar wale seedha database mein ghusne ki koshish karenge (khatarnak).<br><strong>Example:</strong> <code>GET https://xyz.com/api/v1/users/42</code> bhejo, jawab mein user 42 ka data aata hai. Ye "button" hai; andar database kaunsa hai, kisi ko farak nahi padta.` },
    { type: 'compare',
      left: { title: 'Pehle: server HTML bhejta tha', ascii: `
GET /profile/42
→ <html><body>
   <h1>Riya</h1>
   <img src=...>
  </body></html>` },
      right: { title: 'Ab: API sirf data (JSON) bhejti hai', ascii: `
GET /api/users/42
→ {
    "id": 42,
    "name": "Riya",
    "followers": 1200
  }` },
    },
    { type: 'callout', tone: 'term', title: 'Naya word: JSON', html: `<strong>Ye kya hai:</strong> JSON (JavaScript Object Notation) data likhne ka ek simple text format hai. Jaise <code>{"name": "Riya", "followers": 1200}</code>.<br><strong>Kyun chahiye:</strong> server aur app alag languages mein likhe ho sakte hain (server Java mein, app Kotlin mein, website JavaScript mein). JSON sab padh lete hain, aur insaan bhi aankh se padh sakta hai.<br><strong>Iske bina:</strong> har team apna format banati, aur har jagah alag "translator" code likhna padta.<br><strong>Andar kya hota hai:</strong> sirf 6 tarah ki cheezein. Object <code>{ }</code> (naam → value ke jode), array <code>[ ]</code> (list), string <code>"Riya"</code>, number <code>1200</code>, <code>true</code>/<code>false</code>, aur <code>null</code> (kuch nahi).` },
    { type: 'code', text: `
{
  "id": 42,                      ← number
  "name": "Riya",                ← string (text, double quotes mein)
  "verified": true,              ← true / false
  "bio": null,                   ← null = abhi kuch nahi likha
  "tags": ["cricket", "music"],  ← array = list
  "stats": { "followers": 1200, "posts": 87 }   ← object ke andar object
}` },
    { type: 'h2', text: 'Ek API call ke hisse' },
    { type: 'p', html: `Har API baatcheet do hisson ki hoti hai. App ek <strong>request</strong> bhejti hai (sawaal). Server ek <strong>response</strong> lautata hai (jawab). Dono ke andar fixed hisse hote hain. Pehle inko pehchaan lo, phir baaki lesson aasaan lagega.` },
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
      `<strong>Method</strong> (jise <em>verb</em> bhi kehte hain): kya karna hai. <code>GET</code> = padho, <code>POST</code> = naya banao, waghera. Neeche poori table hai.`,
      `<strong>Path</strong>: kis cheez pe karna hai. <code>/api/v1/posts</code> = posts ka collection.`,
      `<strong>Query parameters</strong>: <code>?</code> ke baad ke chhote options, jaise <code>?notify=true</code> ya <code>?limit=20</code>. Filter, sort, page size ke liye.`,
      `<strong>Headers</strong>: request ke baare mein extra jaankari, <code>Naam: value</code> lines mein. Jaise "main kaun hoon" (<code>Authorization</code>) ya "body kis format mein hai" (<code>Content-Type</code>).`,
      `<strong>Body</strong>: asli data jo bhejna hai. GET mein aam taur pe body nahi hoti; POST, PUT, PATCH mein hoti hai.`,
      `<strong>Status code</strong>: response ka pehla number. Ek nazar mein batata hai kya hua: 201 = "ban gaya", 404 = "nahi mila". Isko neeche playground mein khud chalaoge.`,
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: endpoint', html: `<strong>Ye kya hai:</strong> method + path ka ek joda, jaise <code>GET /api/v1/users/{id}</code>. API ka ek "button".<br><strong>Kyun chahiye:</strong> docs mein har endpoint ki ek line hoti hai: kya bhejo, kya milega. Developer usi list se kaam karta hai.<br><strong>Iske bina:</strong> kisi ko pata nahi hota ki kaunsa address kya karta hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: stateless', html: `<strong>Ye kya hai:</strong> server pichhli request "yaad" nahi rakhta. Har request apne aap mein poori honi chahiye: kaun hai (token), kya chahiye (method + path), saara data (body).<br><strong>Kyun chahiye:</strong> agar koi request kisi bhi server pe chali jaaye, wo phir bhi kaam kare. Aage jab xyz.com ke 50 servers honge, ye bahut kaam aayega (scalability lesson).<br><strong>Iske bina:</strong> "page 2 do" jaisi request sirf usi server pe chalegi jisne page 1 diya tha. Wo server gira to user ka kaam bhi gaya.` },

    { type: 'h2', text: 'REST: API design ka sabse common style' },
    { type: 'p', html: `API kaise design karein, iske kai styles hain. Sabse common <strong>REST</strong> hai. Iska idea do lines ka hai:` },
    { type: 'steps', items: [
      { t: 'Har cheez ek resource hai, jiska ek address hai', d: 'User, post, comment, video: sab resources hain. Address naam (noun) se banta hai: /users/42, /posts/9.' },
      { t: 'Action method se batao, address se nahi', d: 'Padhna hai to GET, banana hai to POST, hatana hai to DELETE. Address wahi rehta hai, method badalta hai.' },
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: REST aur resource', html: `<strong>Ye kya hai:</strong> REST (REpresentational State Transfer) ek design style hai jo Roy Fielding ne 2000 mein apni PhD thesis mein likha. <strong>Resource</strong> = koi bhi cheez jiska naam ho aur jise address se pukaar sakein. Server resource ki ek "representation" bhejta hai (aksar JSON), isliye naam mein "Representational".<br><strong>Kyun chahiye:</strong> sab developers ek hi pattern samajhte hain. <code>GET /users/42</code> dekha to bina docs ke guess kar loge ki <code>GET /posts/9</code> kya karega.<br><strong>Iske bina:</strong> har API mein naye naam: <code>/getUser</code>, <code>/fetchPostData</code>, <code>/user_delete_now</code>. Har baar docs ratne padte.` },
    { type: 'code', text: `
/users              ← collection: saare users
/users/42           ← ek item: user 42
/users/42/posts     ← user 42 ki posts (nested: "iska wala")
/posts/9/comments   ← post 9 ke comments
/posts?author=42&sort=-created_at   ← filter + sort query se` },
    { type: 'table', head: ['Method', 'Matlab', 'xyz.com example', 'Safe?', 'Idempotent?'], rows: [
      ['<code>GET</code>', 'Padho, kuch badlo mat', '<code>GET /users/42</code>: profile', 'Haan', 'Haan'],
      ['<code>POST</code>', 'Naya banao (collection mein jodo)', '<code>POST /posts</code>: nayi post', 'Nahi', 'Nahi'],
      ['<code>PUT</code>', 'Poora replace karo (jo bheja, wahi rahega)', '<code>PUT /users/42/settings</code>: saari settings', 'Nahi', 'Haan'],
      ['<code>PATCH</code>', 'Sirf kuch fields badlo', '<code>PATCH /users/42</code> <code>{"name":"Riya S"}</code>', 'Nahi', 'Zaroori nahi'],
      ['<code>DELETE</code>', 'Hatao', '<code>DELETE /posts/9</code>', 'Nahi', 'Haan'],
      ['<code>HEAD</code> / <code>OPTIONS</code>', 'Sirf headers / "kya kya allowed hai"', 'Browser CORS check mein OPTIONS bhejta hai', 'Haan', 'Haan'],
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: safe aur idempotent', html: `<strong>Safe</strong> method server ka data badalta hi nahi (sirf padhta hai). <strong>Idempotent</strong> method ko ek baar chalao ya das baar, server ka aakhri haal same rehta hai. Lift ka button: ek baar dabao ya paanch baar, lift ek hi baar aati hai.<br><strong>Kyun chahiye:</strong> network kabhi bhi toot sakta hai. Agar method idempotent hai, to app bina dare dobara bhej sakti hai (retry). POST idempotent nahi: dobara bheja to <em>doosri</em> post ban jaayegi.<br><strong>Iske bina:</strong> retry pe double post, double order, double payment. Iska poora ilaaj (idempotency key) agle lesson mein hai.` },
    { type: 'callout', tone: 'mistake', title: 'PUT vs PATCH', html: `<code>PUT /users/42/settings</code> ke saath <code>{"theme":"dark"}</code> bheja, to PUT ka matlab hai "settings <strong>ab bilkul yahi</strong> hain". Baaki fields (jaise language) hat sakti hain. Sirf ek field badalni ho to <code>PATCH</code> use karo. Aur <code>/getUserById?id=42</code> ya <code>POST /deletePost</code> jaise naam REST style nahi hain: action address mein nahi, method mein jaata hai.` },
    { type: 'h2', text: 'Status codes: jawab ka pehla number' },
    { type: 'p', html: `Status code teen digit ka number hai. App ko pura body padhne se pehle hi pata chal jaata hai ki kya hua. Pehla digit <strong>family</strong> batata hai:` },
    { type: 'table', head: ['Family', 'Matlab', 'Kiski galti / kya karein'], rows: [
      ['<strong>2xx</strong>', 'Success', 'Sab theek. Data use karo.'],
      ['<strong>3xx</strong>', 'Redirect: "kahin aur dekho"', 'Jaise 301 (address hamesha ke liye badla), 304 (tumhari cached copy abhi bhi sahi hai).'],
      ['<strong>4xx</strong>', 'Client ki galti', 'Request mein kuch galat hai. Same request dobara bhejna bekaar. Pehle request theek karo. (429 apwaad hai: ruk ke dobara bhej sakte ho.)'],
      ['<strong>5xx</strong>', 'Server ki galti', 'Request theek thi, server phisal gaya. Thoda ruk ke retry kar sakte ho.'],
    ]},
    { type: 'table', head: ['Code', 'Naam', 'Kab use karein', 'Retry?'], rows: [
      ['200', 'OK', 'Request successful, data ye raha', '-'],
      ['201', 'Created', 'POST se naya resource bana (response mein naya id / Location header)', '-'],
      ['202', 'Accepted', '"Kaam le liya, baad mein karenge" (jaise video processing). Status baad mein check karo.', '-'],
      ['204', 'No Content', 'Kaam ho gaya, bhejne ko kuch nahi (jaise DELETE)', '-'],
      ['400', 'Bad Request', 'Request ka format/data galat (jaise text field missing)', 'Nahi, pehle theek karo'],
      ['401', 'Unauthorized', '"Tum kaun ho?" Login/token missing ya expire', 'Login ke baad'],
      ['403', 'Forbidden', '"Pata hai tum kaun ho, par ye tumhe allowed nahi"', 'Nahi'],
      ['404', 'Not Found', 'Ye resource exist nahi karta', 'Nahi'],
      ['405', 'Method Not Allowed', 'Resource hai, lekin ye method us pe nahi chalta', 'Nahi'],
      ['409', 'Conflict', 'Abhi ke data se takraav: jaise username pehle se liya hua', 'Nahi (data badlo)'],
      ['429', 'Too Many Requests', 'Bahut zyada requests (rate limiting). Retry-After header batata hai kitna ruko', 'Haan, ruk ke'],
      ['500', 'Internal Server Error', 'Server ke code mein bug', 'Shayad, thoda ruk ke'],
      ['503', 'Service Unavailable', 'Server overloaded ya koi zaroori hissa (DB) down', 'Haan, ruk ke'],
    ]},
    { type: 'callout', tone: 'mistake', html: `<strong>401 vs 403</strong> sabse zyada confuse hote hain. 401 = "tum kaun ho, pata nahi" (login karo). Naam "Unauthorized" hai, lekin matlab asal mein "unauthenticated" hai. 403 = "pata hai tum Riya ho, lekin admin panel tumhare liye nahi."<br>Doosri common galti: error hone pe bhi <code>200 OK</code> bhejna aur body mein <code>{"error": "..."}</code> likhna. Tab app, cache aur monitoring tools sab sochenge ki sab theek hai. Sahi code bhejo.` },
    { type: 'h3', text: 'Playground: xyz.com API ko khud call karo' },
    { type: 'p', html: `Neeche ek chhota nakli xyz.com server hai. Request chuno, token chuno, server ki halat chuno, aur "Bhejo" dabao. Dekho kaunsa status code aata hai aur kyun. Try karo: ek hi post do baar DELETE karo, ek hi POST do baar bhejo, aur "20 baar tez" dabao.` },
    { type: 'custom', render(el) {
      const S = {
        req: 'Request', tok: 'Token (kaun hai)', srv: 'Server ki halat', send: 'Bhejo', spam: "20 baar tez bhejo", clock: 'Ghadi +1 min', reset: 'Reset',
        toks: ['Koi token nahi', 'Riya (user)', 'Aman (admin)'], srvs: ['Theek', 'Code mein bug', 'Database down'],
        posts: 'Posts', riyaName: 'User 42 ka naam', used: 'Is minute requests', log: 'Pichhli calls', what: 'Kya hua: ', retry: 'Retry karein? ',
        start: 'Ek request chuno aur "Bhejo" dabao.',
        why: {
          429: 'Reverse proxy ne gina: is minute mein 15 se zyada requests. Server tak request gayi hi nahi. Retry-After batata hai kitna ruko.',
          401: 'Token nahi bheja. Server ko nahi pata tum kaun ho, isliye aage kuch check hi nahi kiya.',
          405: 'Path /users sahi hai, lekin us pe DELETE (saare users mita do) allowed nahi.',
          400: 'Body mein "text" field hi nahi hai. Server ne kuch save nahi kiya.',
          403: 'Server jaanta hai tum Riya ho (token sahi), lekin admin stats sirf admins ke liye hain.',
          503: 'Database jawab nahi de raha. Galti server side ki hai, request theek thi.',
          500: 'Server ke code mein bug se exception aa gaya. Ye bhi server ki galti hai.',
          404: 'Is id ka resource exist nahi karta (ya pehle hi delete ho chuka).',
          409: 'Ye username pehle se kisi ka hai. Format sahi tha, data takra gaya.',
          200: 'Sab theek. Data mil gaya (ya update ho gaya).', 201: 'Nayi post ban gayi. Naya id response mein aaya.',
          202: 'Video upload le liya. Processing baad mein hogi; job ka status baad mein poochho.', 204: 'Post delete ho gayi. Bhejne ko kuch nahi.',
        },
        rt: { 2: 'Zarurat nahi, kaam ho gaya.', 4: 'Nahi. Same request phir wahi jawab degi. Pehle request ya token theek karo.', 429: 'Haan, lekin Retry-After jitna ruk ke.', 5: 'Haan, thoda ruk ke (aur dhyaan se, agar method idempotent nahi hai).' },
        dupPost: ' Dhyaan do: ye doosri baar POST hua, to ek aur nayi post ban gayi. POST idempotent nahi hai.',
        delAgain: ' Pehle 204 mila tha, ab 404. Server ka haal same hai (post 9 nahi hai), isliye DELETE idempotent hi hai. Idempotent ka matlab aakhri haal same, jawab ka number nahi.',
        patchAgain: ' Doosri baar bhi wahi naam set hua. Aakhri haal same: PATCH yahan idempotent tarah se chala.',
        spamNote: (a, b) => `20 requests ek saath: ${a} pahunchi, ${b} ko 429 mila.`, clockNote: 'Ek minute beet gaya. Rate limit ka counter phir 0 se.',
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
      const reset = () => { st = { posts: { 9: 'Pehli post' }, next: 9001, made: 0, name: 'Riya', taken: ['riya', 'aman'], used: 0, job: 500, log: [], last: null }; q('.wa-out').textContent = ''; q('.wa-note').textContent = S.start; draw(); };
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
    { type: 'h2', text: 'Ek API call ka poora safar' },
    { type: 'p', html: `Ab yahi cheez architecture mein dekho. Proxies wale lesson ka <strong>reverse proxy</strong> yaad hai? Wo xyz.com ke servers ke aage baitha darwaza hai: HTTPS kholta hai aur requests andar bhejta hai. Har scenario mein dekho ki request kahan tak gayi aur kaunsa status code wapas aaya.` },
    { type: 'flow', height: 260,
      nodes: [
        { id: 'app', label: 'xyz app', sub: 'Android', x: 85, y: 130, w: 130, kind: 'client', info: 'Ye kya hai: Riya ke phone pe xyz.com ki app. Ye API call bhejti hai, response ka JSON padhti hai, aur usse apni screen banati hai. Status code dekh ke tay karti hai ki data dikhana hai, login screen pe bhejna hai, ya "baad mein try karo" dikhana hai.' },
        { id: 'proxy', label: 'Reverse proxy', sub: 'HTTPS, limits', x: 280, y: 130, w: 150, kind: 'edge', info: 'Ye kya hai: servers ke aage ka darwaza (jaise NGINX). HTTPS ki encryption yahin khulti hai. Ye gin bhi sakta hai ki ek client kitni requests bhej raha hai; hadd paar ho to 429 yahin se lauta deta hai, API server tak request jaati hi nahi.' },
        { id: 'api', label: 'API server', sub: '/api/v1/...', x: 480, y: 130, w: 150, kind: 'server', info: 'Ye kya hai: wo program jo endpoints chalata hai. Har request pe: token check (kaun hai?), permission check (allowed hai?), body check (data sahi hai?), phir logic chalata hai aur JSON + status code lautata hai.' },
        { id: 'db', label: 'Database', sub: 'users, posts', x: 640, y: 130, w: 120, kind: 'data', info: 'Ye kya hai: jahan asli data rakha hai. Sirf API server isse baat karta hai. App kabhi seedha database tak nahi aati: isi liye API ek suraksha ki deewar bhi hai.' },
      ],
      edges: [{ a: 'app', b: 'proxy' }, { a: 'proxy', b: 'api' }, { a: 'api', b: 'db' }],
      scenarios: [
        { name: '200: profile padho', steps: [
          { title: 'App request bhejti hai', text: 'User ne profile screen kholi. App ne GET bheja, token ke saath.', go: 'app>proxy>api', msg: 'GET /api/v1/users/42\nAuthorization: Bearer eyJhbGc...' },
          { title: 'Server database se data laata hai', text: 'Server ne token check kiya, phir DB se user 42 padha.', go: ['api>db', 'res:db>api'] },
          { title: '200 OK + JSON', text: 'Sab theek. App ko data mil gaya, screen ban gayi.', go: 'res:api>proxy>app', msg: 'HTTP/1.1 200 OK\n{ "id": 42, "name": "Riya", "followers": 1200 }' },
        ]},
        { name: '201: nayi post', steps: [
          { title: 'App nayi post bhejti hai', text: 'POST matlab "naya resource banao". Data request ki body mein jaata hai.', go: 'app>proxy>api', msg: 'POST /api/v1/posts\n{ "text": "Hello xyz!" }' },
          { title: 'Server save karta hai', text: 'Database mein nayi row likhi gayi.', go: ['api>db', 'res:db>api'] },
          { title: '201 Created', text: '201 batata hai "nayi cheez ban gayi". Response mein naya id aur Location header bhi aata hai.', go: 'res:api>proxy>app', msg: 'HTTP/1.1 201 Created\nLocation: /api/v1/posts/9001\n{ "id": 9001, "text": "Hello xyz!" }' },
        ]},
        { name: '404: nahi mila', steps: [
          { title: 'App user 99999 maangti hai', text: 'Ye user exist hi nahi karta.', go: 'app>proxy>api', msg: 'GET /api/v1/users/99999' },
          { title: 'DB mein kuch nahi', go: ['api>db', 'res:db>api'], text: 'Database ne khaali jawab diya.' },
          { title: '404 Not Found', text: '4xx = client ne kuch galat maanga. App "User not found" screen dikha sakti hai. Retry bekaar hai.', go: 'bad:api>proxy>app', msg: 'HTTP/1.1 404 Not Found\n{ "error": "user not found" }' },
        ]},
        { name: '401: login nahi', steps: [
          { title: 'Bina token request', text: 'User logged in nahi hai, ya token expire ho gaya.', go: 'app>proxy>api', msg: 'GET /api/v1/users/42\n(no Authorization header)' },
          { title: '401 Unauthorized', text: 'Server ne database tak jaane ki zehmat hi nahi uthayi. Pehle pehchaan, phir kaam. App login screen pe bhej degi.', go: 'bad:api>proxy>app', set: { db: { state: 'dim' } }, msg: 'HTTP/1.1 401 Unauthorized' },
        ]},
        { name: '429: bahut tez', steps: [
          { title: 'Buggy app loop mein phans gayi', text: 'Ek bug ki wajah se app har second 50 requests bhej rahi hai.', go: 'app>proxy', after: { proxy: { state: 'warn', sub: '50 req/s!' } }, msg: 'GET /api/v1/feed  (x50 per second)' },
          { title: 'Proxy wahin rok deta hai', text: 'Hadd (jaise 10 per second) paar. Proxy turant 429 lautata hai. API server aur DB ko pata bhi nahi chala. Iska poora lesson aage (rate limiting) hai.', go: 'bad:proxy>app', set: { api: { state: 'dim' }, db: { state: 'dim' } }, msg: 'HTTP/1.1 429 Too Many Requests\nRetry-After: 5' },
        ]},
        { name: '503: database down', steps: [
          { title: 'Normal request', text: 'App ne bilkul sahi request bheji.', go: 'app>proxy>api', msg: 'GET /api/v1/users/42' },
          { title: 'Database down', text: 'Server DB tak gaya, lekin DB jawab nahi de raha.', go: 'lost:api>db', after: { db: { state: 'down', sub: 'DOWN' } } },
          { title: '503 Service Unavailable', text: '5xx = galti server side ki, client ki nahi. Client thoda ruk ke retry kar sakta hai. 4xx pe retry bekaar hai (galat request phir galat hi rahegi).', go: 'bad:api>proxy>app', msg: 'HTTP/1.1 503 Service Unavailable\nRetry-After: 30' },
        ]},
      ],
    },

    { type: 'h2', text: 'JSON vs binary formats' },
    { type: 'p', html: `JSON text hai: insaan padh sakta hai, har language samajhti hai. Lekin text ki keemat hai. Har baar field ka naam (<code>"followers"</code>) dobara likha jaata hai, aur number <code>1200</code> chaar characters (4 bytes) leta hai.` },
    { type: 'p', html: `Isliye kuch systems <strong>binary format</strong> use karte hain: data bytes mein seedha computer ki bhasha mein. Field ke naam ki jagah ek chhota number. Sabse famous hai Google ka <strong>Protocol Buffers (Protobuf)</strong>. Aur bhi hain: MessagePack, Avro, Thrift.` },
    { type: 'callout', tone: 'term', title: 'Naya word: binary format (serialization)', html: `<strong>Ye kya hai:</strong> data ko network pe bhejne ke liye bytes mein badalna <strong>serialization</strong> kehlata hai. Binary format mein ye bytes insaan ke padhne layak nahi hote, sirf program ke liye.<br><strong>Kyun chahiye:</strong> chhota payload (kam bandwidth), aur parse karna tez (kam CPU). Jab services second mein lakhon calls karti hain, ye bachat bahut badi ho jaati hai.<br><strong>Iske bina:</strong> JSON hi chalega. Chhoti/public APIs ke liye bilkul theek; bahut high-traffic internal calls mein CPU aur network zyada lagta hai.<br><strong>Example:</strong> <code>{"id":42,"name":"Riya","followers":1200}</code> JSON mein 40 bytes hai. Protobuf mein yahi data 11 bytes. Is bytes ka hisaab graphql-grpc lesson mein khud chala ke dekhoge.` },
    { type: 'table', head: ['', 'JSON', 'Binary (Protobuf jaisa)'], rows: [
      ['Padhna', 'Insaan padh sakta hai, curl se test', 'Tool ke bina nahi padh sakte'],
      ['Size', 'Bada (field naam har baar)', 'Chhota (naam ki jagah number)'],
      ['Speed', 'Parse mein zyada CPU', 'Tez'],
      ['Schema (pehle se tay structure)', 'Zaroori nahi, flexible', 'Zaroori: .proto file dono taraf'],
      ['Kahan', 'Public APIs, browser, mobile', 'Internal services, bahut high traffic, Kafka events'],
    ]},
    { type: 'h2', text: 'Versioning: API badlo, purani app mat todo' },
    { type: 'p', html: `Website badalna aasaan hai: naya code server pe daalo, sab users ko agle refresh pe naya page milta hai. Mobile app aisi nahi hai. Lakhon phones pe 6 mahine purani app chal rahi hoti hai, kyunki log update hi nahi karte. Wo purani app API se purane shape ka JSON expect karti hai.` },
    { type: 'p', html: `Agar tumne API ka response badla, aur purani app usse samajh nahi paayi, to wo app tut jaayegi. Aise change ko <strong>breaking change</strong> kehte hain. Neeche khud dekho kaunsa change todta hai aur kaunsa nahi:` },
    { type: 'custom', render(el) {
      const S = {
        pick: 'Server pe ye change karo:', resp: 'API ka response (purani app ko ye milta hai)', screen: 'Riya ke phone pe 6 mahine purani app (v1)',
        ok: 'Chal rahi hai', broke: 'Toot gayi', crash: 'App crash: "followers" number hona chahiye tha',
        opts: ['Kuch nahi badla', 'Naya field "bio" joda', '"name" ka naam "full_name" kiya', '"followers" ko number se text "1.2k" kiya', '"followers" field hata diya', 'Ye sab badlaav sirf /v2 mein, /v1 same'],
        notes: [
          'Aaj ka haal. Purani app "name" aur "followers" padhti hai, dono mil rahe hain.',
          'Naya field jodna breaking nahi hai. Purani app "bio" ko jaanti hi nahi, to ignore kar deti hai. Isliye clients ko "anjaane fields ignore karo" ke niyam se likhte hain.',
          'Breaking! Purani app ab bhi "name" dhoondh rahi hai, jo ab hai hi nahi. Screen pe naam ki jagah khaali/undefined.',
          'Breaking! Field ka type badalna sabse khatarnak hai. Kotlin/Swift jaisi typed languages mein JSON parse hi fail ho jaata hai: app crash.',
          'Breaking! Field hatana bhi todta hai. Hatana ho to pehle "deprecated" bolo, mahino tak dono chalao, phir hatao.',
          'Hal: badlaav naye version /v2 mein. Purani app /v1 pe hai, use wahi purana shape milta hai. Nayi app /v2 use karti hai. Kuch mahine baad, jab /v1 pe traffic bahut kam ho jaaye, use band karo (sunset).',
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
    { type: 'callout', tone: 'term', title: 'Naya word: API versioning', html: `<strong>Ye kya hai:</strong> API ke purane aur naye roop ko saath saath chalana, aur har client ko batana ki wo kaunsa version use kar raha hai.<br><strong>Kyun chahiye:</strong> purani apps (jo update nahi hui) tootein nahi, aur tum phir bhi API ko aage badha sako.<br><strong>Iske bina:</strong> ya to tum API kabhi badal hi nahi sakte, ya har badlaav pe lakhon purani apps crash.` },
    { type: 'table', head: ['Tareeka', 'Kaisa dikhta hai', 'Kaun use karta hai / note'], rows: [
      ['URL path', '<code>/api/v1/users</code>, <code>/api/v2/users</code>', 'Sabse common aur sabse saaf. Logs mein turant dikhta hai. Hum xyz.com mein yahi use karenge.'],
      ['Header', '<code>Accept: application/vnd.xyz.v2+json</code>', 'URL saaf rehta hai, lekin browser mein test karna mushkil'],
      ['Date wala version', '<code>Stripe-Version: 2024-06-20</code>', 'Stripe har account ko ek API version pe "pin" karta hai; upgrade tum khud karte ho'],
      ['Query param', '<code>/users?version=2</code>', 'Kam use hota hai; cache keys mein gadbad'],
    ]},
    { type: 'callout', tone: 'tip', html: `Niyam: <strong>jodna theek, todna version ke saath.</strong> Naya optional field ya naya endpoint jodne ke liye version mat badlo. Field hatana, naam badalna ya type badalna ho to naya version. Purane version ko band karne se pehle users ko pehle se batao: response mein <code>Deprecation</code> aur <code>Sunset</code> headers bhejo (dono ke liye IETF ke standards hain: Deprecation ke liye RFC 9745, Sunset ke liye RFC 8594), ki ye version kis din band hoga.` },
    { type: 'h2', text: 'Achhi API ke design rules' },
    { type: 'p', html: `Roadmap kehta hai: <em>API tumhare system ka contract hai.</em> Contract matlab ek vaada jo bahar wale developers ke saath kiya hai. Ek baar log use karne lagein, to badalna mehenga hai. Isliye shuru mein hi ye niyam pakdo:` },
    { type: 'steps', items: [
      { t: 'Predictable naming', d: 'Plural nouns: /users, /posts, /comments. Ek hi style har jagah (sab snake_case ya sab camelCase). Action method mein, address mein nahi.' },
      { t: 'Sahi method, sahi status code', d: 'Padhne ke liye GET (jo kabhi data na badle), banane ke liye POST. Error pe 200 mat bhejo; 400/404/409 jaisa sahi code bhejo.' },
      { t: 'Ek jaisa error format', d: 'Har error ek hi shape mein: { "error": { "code": "username_taken", "message": "Ye username pehle se liya hua hai" } }. App code se kaam karti hai, insaan message padhta hai. (RFC 9457 "problem details" ek standard shape deta hai.)' },
      { t: 'Paginated', d: '10 lakh posts ek saath mat bhejo. GET /posts?limit=20 aur "agla page" ka tareeka do. Agla lesson isi pe hai.' },
      { t: 'Versioned', d: '/api/v1/... Jodna theek, todna sirf naye version mein.' },
      { t: 'Retry-safe (idempotent)', d: 'Timeout ke baad app dobara bheje to kaam do baar na ho. GET, PUT, DELETE apne aap safe hain; POST ke liye idempotency key. Agle lesson mein poora.' },
      { t: 'Filter, sort, fields query se', d: 'GET /posts?author=42&sort=-created_at&fields=id,title. Naya endpoint banane ki jagah query parameters.' },
      { t: 'Secure aur limited', d: 'Hamesha HTTPS. Har request pe pehchaan (token ya API key) aur permission check, server pe. Rate limits, taaki ek client sab na kha jaaye.' },
      { t: 'Documented', d: 'OpenAPI file mein har endpoint, uska input, output aur errors. Usse docs page aur client code apne aap bante hain.' },
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: OpenAPI', html: `<strong>Ye kya hai:</strong> REST API ka poora naksha ek file (YAML ya JSON) mein: kaunse endpoints hain, kya bhejna hai, kya milega, kaunse errors. Pehle iska naam Swagger tha.<br><strong>Kyun chahiye:</strong> isi file se docs website, test tools aur Android/iPhone ke liye client code apne aap ban jaata hai.<br><strong>Iske bina:</strong> docs haath se likhe jaate hain aur code se peeche reh jaate hain. Developers andaaze se API use karte hain.` },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>Public aur mobile APIs ke liye REST</strong> (JSON pe): simple hai, har developer jaanta hai, curl se test hota hai, aur GET responses HTTP/CDN se cache ho sakte hain. Andar ki services jo ek doosre ko second mein hazaron baar call karti hain, unke liye <strong>gRPC</strong> (binary, typed, streaming). Jab bahut saari alag apps ko same data alag shape mein chahiye, tab <strong>GraphQL</strong>. Ye teeno agle lessons mein compare honge. Shuru REST se karo.` },

    { type: 'diagram', title: 'API: poori picture', height: 520,
      groups: [
        { label: 'Clients', x: 10, y: 14, w: 700, h: 92 },
        { label: 'API versions', x: 60, y: 276, w: 560, h: 90 },
        { label: 'Data + kaam', x: 200, y: 404, w: 510, h: 96 },
      ],
      nodes: [
        { id: 'web', label: 'Website', sub: 'browser', x: 95, y: 60, kind: 'client', info: 'Ye kya hai: xyz.com ki website, browser mein chalti hai. Ye bhi wahi API call karti hai jo apps karti hain, aur JSON se page ka hissa banati hai.' },
        { id: 'and', label: 'Nayi app', sub: 'uses /v2', x: 265, y: 60, kind: 'client', info: 'Ye kya hai: xyz.com ki latest Android/iPhone app. Ye naye response shape wala /v2 use karti hai.' },
        { id: 'old', label: 'Purani app', sub: 'uses /v1', x: 435, y: 60, kind: 'client', info: 'Ye kya hai: kisi ke phone pe 6 mahine purani app jo update nahi hui. Ye /v1 ka purana shape expect karti hai. Versioning isi ko bachaata hai.' },
        { id: 'partner', label: 'Partner dev', sub: 'API key', x: 610, y: 60, kind: 'client', info: 'Ye kya hai: bahar ki koi company jo xyz.com ka data apne product mein use karti hai. Ye API key se pehchaani jaati hai, aur iski request limit hoti hai.' },
        { id: 'proxy', label: 'Reverse proxy', sub: 'HTTPS, rate limit', x: 360, y: 190, w: 170, kind: 'edge', info: 'Ye kya hai: sab requests ka ek darwaza. HTTPS kholta hai, ginta hai ki koi hadd se zyada to nahi bhej raha (429), aur path (/v1 ya /v2) dekh ke sahi API server pe bhejta hai.' },
        { id: 'v1', label: 'API /v1', sub: 'purana shape', x: 200, y: 320, kind: 'server', info: 'Ye kya hai: API ka purana version, jo ab bhi chal raha hai taaki purani apps na tootein. Jab iska traffic bahut kam ho jaaye, Deprecation/Sunset headers ke saath band hoga.' },
        { id: 'v2', label: 'API /v2', sub: 'naya shape', x: 520, y: 320, kind: 'server', info: 'Ye kya hai: API ka naya version. Breaking changes (naam badalna, type badalna) sirf yahan. Token, permission, body check karke status code + JSON lautata hai.' },
        { id: 'db', label: 'Database', sub: 'users, posts', x: 360, y: 450, kind: 'data', info: 'Ye kya hai: asli data. Dono versions same database padhte hain; sirf response ka shape alag banate hain.' },
        { id: 'jobs', label: 'Job queue', sub: 'baad ka kaam', x: 610, y: 450, kind: 'queue', info: 'Ye kya hai: "baad mein karne wale kaam" ki line. Video processing jaisa lamba kaam yahan daal ke API turant 202 Accepted lautati hai. Queue ka poora lesson aage hai.' },
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
        { name: 'Nayi app (v2)', text: 'Nayi app /v2 maangti hai, proxy usse /v2 server pe bhejta hai, data DB se aata hai: 200 + naya shape.', go: ['and>proxy>v2>db'] },
        { name: 'Purani app (v1)', text: 'Purani app ab bhi /v1 pe hai. Use purana shape milta hai, isliye wo nahi tootti.', go: ['old>proxy>v1>db'] },
        { name: 'Video upload (202)', text: 'Lamba kaam: API job queue mein daal ke turant 202 Accepted lautati hai.', go: ['and>proxy>v2>jobs'] },
        { name: 'Bahut tez (429)', text: 'Partner hadd se zyada bhej raha hai: proxy wahin 429 + Retry-After lautata hai.', go: ['partner>proxy', 'proxy>partner'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>API = programs ke beech baat karne ka pakka contract. App data maangti hai, server JSON lautata hai.</li>
      <li>Request = method + path + query + headers + body. Response = status code + headers + body.</li>
      <li>REST: har cheez ek resource (noun address), action method se (GET, POST, PUT, PATCH, DELETE).</li>
      <li>Safe = data nahi badalta (GET). Idempotent = baar baar chalao, aakhri haal same (GET, PUT, DELETE). POST nahi.</li>
      <li>2xx theek, 4xx client ki galti (retry bekaar, 429 chhod ke), 5xx server ki galti (ruk ke retry).</li>
      <li>JSON padhne mein aasaan; binary (Protobuf) chhota aur tez, internal calls ke liye.</li>
      <li>Jodna theek, todna sirf naye version (/v2) mein. Purana version notice de ke band karo.</li>
      <li>Decide: public/mobile ke liye REST, internal high traffic ke liye gRPC, alag shapes ke liye GraphQL.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Ek API, sab clients: website, Android, iPhone, partners', 'Server andar se badal sakta hai (naya database, naya code) bina apps ko bataye', 'REST simple hai: har developer jaanta hai, curl/browser se test', 'GET responses HTTP aur CDN se cache ho sakte hain', 'Database bahar walon se chhupa rehta hai: har request pe check'], costs: ['Contract badalna mehenga: versions chalane padte hain', 'JSON text bhaari hai: high-traffic internal calls mein zyada CPU/bandwidth', 'Ek screen ke liye kai REST calls lag sakti hain (over/under-fetching, agle lessons mein)', 'Docs, error format, pagination, auth: sab soch ke design karna padta hai'] },
    { type: 'think', questions: [
      { q: 'User signup karte waqt aisa username deta hai jo pehle se liya hua hai. Kaunsa status code?', a: '409 Conflict. Request ka format sahi hai (400 nahi), signup ke liye login ki zarurat nahi (401 nahi), bas data ek existing cheez se takra raha hai.' },
      { q: 'App ko 503 mila. Kya retry karna chahiye? 400 pe?', a: '503 pe haan, thoda ruk ke (server temporarily busy hai, Retry-After dekho). 400 pe nahi: request hi galat hai, kitni baar bhi bhejo galat hi rahegi. Pehle request theek karo.' },
      { q: 'xyz.com ko user ke response mein "followers" ko number se object { "count": 1200, "growth": 3 } banana hai. Kaise karoge bina purani apps tode?', a: 'Ye type change hai, yaani breaking. Do raaste: (1) purana "followers" number jaisa hai waisa rakho aur naya field "followers_info" jodo (jodna breaking nahi), ya (2) badlaav sirf /v2 mein karo, /v1 same rakho, aur kuch mahine baad Deprecation/Sunset headers ke saath /v1 band karo.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Post delete karne ke liye REST style mein sahi request?', options: ['GET /deletePost?id=9', 'DELETE /posts/9', 'POST /posts/delete/9'], answer: 1, explain: 'Resource address mein (/posts/9), action method mein (DELETE).' },
      { q: 'Logged in user admin page kholne ki koshish karta hai jo uske liye allowed nahi. Code?', options: ['401', '403', '404'], answer: 1, explain: 'Server jaanta hai user kaun hai (isliye 401 nahi), bas permission nahi hai: 403 Forbidden.' },
      { q: 'Mobile app API se aam taur pe kis format mein data leti hai?', options: ['HTML', 'JSON', 'PDF'], answer: 1, explain: 'JSON halka hai aur har language padh leti hai. App apni UI khud banati hai.' },
      { q: 'Inmein se kaunsa method idempotent NAHI hai?', options: ['PUT', 'DELETE', 'POST'], answer: 2, explain: 'POST har baar naya resource bana sakta hai. PUT "ye value set karo" aur DELETE "hatao" kitni baar bhi chalao, aakhri haal same.' },
      { q: 'Kaunsa change purani apps ko NAHI todega?', options: ['Field ka naam badalna', 'Naya optional field jodna', 'Number field ko text banana'], answer: 1, explain: 'Purani app anjaane field ko ignore kar deti hai. Naam ya type badalna breaking hai.' },
      { q: 'Video upload liya, processing 10 minute lagegi. Sabse sahi jawab?', options: ['200 OK, 10 minute baad', '202 Accepted + job ka address', '500, kyunki abhi bana nahi'], answer: 1, explain: '202 = "kaam le liya, baad mein hoga". App job ka status baad mein poochh sakti hai. 10 minute request khuli rakhna timeout ko daawat hai.' },
    ]},
    { type: 'sources', note: 'Methods, status codes aur versioning ke tathya inhi se.', items: [
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
