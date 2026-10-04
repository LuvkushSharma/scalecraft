Lesson.register({
  id: 'architecture-styles',
  title: 'Monolith, microservices, event-driven',
  minutes: 35,
  summary: `Ek hi app mein sab kuch rakhein (monolith), usko andar se saaf hisson mein baantein (modular monolith), ya alag alag services bana dein (microservices)? Services ek doosre ko call karein ya events bhejein? Is lesson mein system ki "overall shape" ke saare bade options: monolith, modular monolith, microservices, event-driven, CQRS, event sourcing, serverless (cold start), peer-to-peer aur hexagonal architecture, saath mein Conway's law aur ek "kaunsa style kab" decider. Har ek kab sahi hai, aur kab sirf fashion hai.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Ek app ko banane ke kai tareeke hain. Saara code ek hi bade program mein rakho? Ya usko 50 chhote programs mein tod do jo aapas mein network pe baat karein?<br>Dono ke apne faayde aur dard hain. 3 logon ki team ke liye jo sabse achha hai, wahi 300 logon ki team ke liye musibat ban sakta hai.<br>Is lesson mein xyz.com ki kahani 3 developers se 300 tak chalegi. Har stage pe ek nayi problem aayegi, aur hum dekhenge ki kaunsi "shape" (architecture style) us problem ko solve karti hai, aur badle mein kya keemat leti hai. Har style ka ek chhota khel bhi hai.` },
    { type: 'h2', text: 'Problem: xyz.com ki shape kya ho?' },
    { type: 'p', html: `Resilience wale lesson mein humne seedha maan liya tha ki xyz.com das services mein toot chuka hai, aur phir network failures se ladna seekha. Ab ek kadam pichhe chalte hain aur asli sawaal poochhte hain: <strong>kya todna zaroori tha? Kab todna chahiye? Aur todna hi ho to kaise?</strong>` },
    { type: 'p', html: `Roadmap ka ek line ka sach: <em>zyaadatar badi companies monolith se shuru hui aur baad mein todi gayi.</em> Is lesson mein hum xyz.com ki kahani 3 developers se 300 developers tak chalayenge, aur har stage pe dekhenge ki kaunsi "shape" kaam karti hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Architecture style', html: `<strong>Ye kya hai:</strong> system ki badi shape. Teen sawaalon ka jawab: code kitne alag alag deploy hone wale tukdon mein hai; wo tukde aapas mein kaise baat karte hain (function call, network call, ya event); aur data kahan rehta hai.<br><strong>Kyun chahiye:</strong> ye "boxes aur arrows" ka sabse upar wala faisla hai. Speed, cost, team ki aazaadi, sab is pe tika hai.<br><strong>Iske bina (bina soche chalna):</strong> system apne aap kisi ulajhi shape mein badh jaata hai, aur baad mein badalna sabse mehenga padta hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Deploy', html: `<strong>Ye kya hai:</strong> naye code ko servers pe chalu karna, taaki users ko naya feature mile. Ek "deployable unit" = code ka wo tukda jo ek saath build aur release hota hai.<br><strong>Kyun zaroori:</strong> is lesson ka har style asal mein ye poochhta hai ki kitne deployable units hon, aur wo kaise baat karein.<br><strong>Iske bina:</strong> code sirf developer ke laptop pe hai; user tak kuch nahi pahuncha.` },

    { type: 'h2', text: 'Stage 1: Monolith (aur ye galat nahi hai)' },
    { type: 'p', html: `xyz.com ka din 1. Teen developers. Ek codebase, ek server process, ek Postgres database. Login, video upload, feed, comments, sab ek hi app ke andar alag alag folders/functions mein. Feed ko user ka naam chahiye? Bas <code>users.getName(42)</code> function call. ~Microseconds mein jawab, network ka koi jhanjhat nahi.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Monolith', html: `<strong>Ye kya hai:</strong> ek aisa app jiska saara code <strong>ek saath build aur ek saath deploy</strong> hota hai, aur ek process (chalta hua program) ki tarah chalta hai. Ek copy mein saare features hote hain. Load balancer ke peeche 10 copies chalana bhi monolith hi hai, kyunki saari copies bilkul same hain.<br><strong>Kyun chahiye:</strong> sabse simple shape. Ek cheez banao, ek cheez chalao, ek cheez debug karo.<br><strong>Iske bina (shuru se tod diya to):</strong> 3 logon ki team network calls, kai pipelines aur kai databases sambhalne mein phans jaati hai, feature banane ki jagah.<br><strong>Example:</strong> Shopify jaisi badi companies bhi saalon tak ek bade monolith pe chali hain (neeche kahani).` },
    { type: 'list', items: [
      `<strong>Simple deploy:</strong> ek build, ek pipeline, ek cheez monitor karni hai.`,
      `<strong>Function calls fast aur bharosemand:</strong> network timeout, retries, circuit breaker ki zaroorat hi nahi.`,
      `<strong>Ek database, asli transactions:</strong> "comment save karo AUR video ka comment_count badhao" ek hi ACID transaction mein. Ya dono, ya koi nahi.`,
      `<strong>Debugging aasaan:</strong> ek stack trace, ek log file, local machine pe poora app chal jaata hai.`,
      `<strong>Refactor sasta:</strong> function ka naam badlo, code editor (IDE) saari jagah khud badal deta hai. Services ke beech API badalna is se kahin mehenga hai.`,
    ]},
    { type: 'callout', tone: 'tip', title: 'Monolith ek valid starting point hai', html: `Naya product, chhoti team, requirements roz badal rahi hain: yahan monolith sabse tez raasta hai. Martin Fowler ne bhi likha hai ki jitne systems unhone shuru se hi microservices bante dekhe, unmein se zyaadatar mushkil mein pade. Interview mein "pehle monolith, jab dard ho tab todo" bolna kamzori nahi, maturity hai.` },

    { type: 'h2', text: 'Stage 2: Monolith ka dard' },
    { type: 'p', html: `Do saal baad xyz.com pe 80 developers hain, 8 teams. Wahi ek codebase. Ab dikkatein aati hain. Neeche diagram chala ke dekho:` },
    { type: 'flow', title: 'Monolith: ek code, kai identical copies', height: 300,
      nodes: [
        { id: 'u', label: 'Users', sub: 'app + web', x: 80, y: 150, w: 120, kind: 'client', info: 'Ye kya hai: xyz.com ke users. Unhe farq nahi padta ki andar ek app hai ya sau services; unhe bas feed jaldi aur bina error ke chahiye.' },
        { id: 'lb', label: 'Load balancer', x: 250, y: 150, w: 140, kind: 'net', info: 'Ye kya hai: traffic baantne wala server (Load balancer lesson). Ye requests ko monolith ki identical copies mein baantta hai. Har copy har request handle kar sakti hai, kyunki har copy mein poora code hai.' },
        { id: 'm1', label: 'Monolith #1', sub: 'feed+upload+recs+...', x: 455, y: 80, w: 170, kind: 'server', meter: true, load: 35, info: 'Ye kya hai: monolith ki pehli copy. Poora xyz.com ek process mein: login, upload, transcoding trigger, feed, recommendations, comments. Modules aapas mein function call se baat karte hain (microseconds, koi network nahi).' },
        { id: 'm2', label: 'Monolith #2', sub: 'same code', x: 455, y: 220, w: 170, kind: 'server', meter: true, load: 35, info: 'Ye kya hai: bilkul same code ki doosri copy. Scale karne ka matlab: aur identical copies. Lekin har copy saare features ka memory/CPU saath le ke chalti hai.' },
        { id: 'db', label: 'Postgres', sub: 'ek shared DB', x: 640, y: 150, w: 130, kind: 'data', info: 'Ye kya hai: xyz.com ka ek hi database. Saare modules ki saari tables isi mein. Faayda: ek transaction mein kai tables. Nuksaan: koi bhi module kisi bhi table ko chhoo sakta hai, to boundaries dheere dheere dhundhli ho jaati hain.' },
      ],
      edges: [{ a: 'u', b: 'lb' }, { a: 'lb', b: 'm1' }, { a: 'lb', b: 'm2' }, { a: 'm1', b: 'db' }, { a: 'm2', b: 'db' }],
      scenarios: [
        { name: 'Happy path', steps: [
          { title: 'Request aayi', text: 'User ne feed kholi. LB ne copy #1 ko di.', go: 'u>lb>m1', msg: 'GET /feed' },
          { title: 'Andar sab function calls', text: 'Feed module ne profile, recs aur comments modules ko <strong>function call</strong> se bulaya. Network nahi, timeout nahi, JSON banana nahi. Har call microseconds ki.', focus: ['m1'], msg: 'feed.build(user=42)\n  → profiles.get(42)        ~µs (function call)\n  → recs.top(42, 10)        ~µs + apna kaam\n  → comments.counts([...])  ~µs' },
          { title: 'Ek transaction', text: 'Saara data ek DB mein, to joins aur transactions seedhe.', go: ['m1>db', 'res:db>m1'], msg: 'SELECT ... FROM videos JOIN users ... JOIN comment_counts ...' },
          { title: 'Response', text: 'Simple, tez, ek jagah debug. Chhote xyz.com ke liye ye best tha.', go: 'res:m1>lb>u', after: { m1: { state: 'ok' } } },
        ]},
        { name: 'Ek bug, sab down', intro: 'Recommendations module mein memory leak wala code deploy hua.', steps: [
          { title: 'Recs module memory kha raha hai', text: 'Memory leak = code memory leta hai aur kabhi wapas nahi karta. Leak recs mein hai, lekin process ek hi hai. Memory poore process ki bharti hai.', set: { m1: { state: 'hot', sub: 'memory 95%', load: 95 }, m2: { state: 'hot', sub: 'memory 93%', load: 93 } }, focus: ['m1', 'm2'] },
          { title: 'Dono copies crash', text: 'Memory khatam (OOM = out of memory), process crash. Dono copies mein same code hai, to dono girti hain. Login, upload, comments: sab gaye, jabki bug sirf recommendations mein tha.', set: { m1: { state: 'down', sub: 'OOM CRASH', load: 0 }, m2: { state: 'down', sub: 'OOM CRASH', load: 0 } }, go: ['u>lb', 'bad:lb>u'], msg: '502 Bad Gateway' },
          { title: 'Lesson', text: 'Monolith mein <strong>fault isolation</strong> nahi hota: ek module ki galti poore app ki galti. (Achhe tests, canary deploy aur limits isse kam karte hain, lekin khatam nahi.)', focus: ['m1', 'm2'] },
        ]},
        { name: 'Ek hissa bhaari', intro: 'Cricket final ke din upload aur thumbnail generation 20 guna ho gaye. Baaki features normal.', steps: [
          { title: 'Sirf upload ka load', text: 'CPU sirf upload/thumbnail code kha raha hai, lekin wo har copy ke andar hai.', flood: { paths: ['u>lb>m1', 'u>lb>m2'], n: 12 }, after: { m1: { state: 'hot', load: 92, sub: 'CPU: thumbnails' }, m2: { state: 'hot', load: 90, sub: 'CPU: thumbnails' } } },
          { title: 'Poora app scale karo', text: 'Thumbnails ke liye 10 aur copies chahiye, to <strong>poore monolith</strong> ki 10 copies: har copy feed, comments, login sab ki memory leke chalegi. Aur sab DB connections kholengi. Jo hissa bhaari hai sirf usko scale karna possible nahi.', focus: ['lb'], set: { db: { state: 'warn', sub: 'connections full' } } },
        ]},
        { name: 'Deploy train', intro: '8 teams, ek codebase, ek release.', steps: [
          { title: 'Sab ek train mein', text: 'Har team ka code ek hi release mein jaata hai, maan lo hafte mein ek baar. Comments team ka ek test fail hua, to recs team ka ready feature bhi ruk gaya.', set: { m1: { state: 'warn', sub: 'release blocked' }, m2: { state: 'warn', sub: 'release blocked' } }, focus: ['m1', 'm2'] },
          { title: 'Teams ek doosre pe atki', text: 'Merge conflicts, "kisne ye table badli?", 40 minute ka build. Ye <strong>people problem</strong> hai, technology problem nahi. Aur yahi asli wajah hai jisse companies todna shuru karti hain.', focus: ['db'] },
        ]},
      ],
    },
    { type: 'callout', tone: 'term', title: 'Naya word: Big ball of mud', html: `<strong>Ye kya hai:</strong> wo haalat jab monolith ke andar koi bhi code kisi bhi code ko call karta hai, aur koi bhi module kisi bhi table ko seedha padhta/likhta hai. Code ek ulajhi gend ban jaata hai.<br><strong>Kyun samajhna zaroori:</strong> zyaadatar log monolith ko isi wajah se "kharaab" bolte hain. Lekin dikkat "ek deploy" hone mein nahi, <em>boundaries (hadein) na hone</em> mein hai.<br><strong>Iske saath jeena:</strong> ek jagah badlo, teen anjaan jagah toot jaati hain. Har change darr ke saath.` },

    { type: 'h2', text: 'Stage 3: Modular monolith' },
    { type: 'p', html: `Pehla ilaaj todna nahi, <strong>andar se saaf karna</strong> hai. Code abhi bhi ek deploy hai, lekin andar se business areas (domains) ke hisaab se modules mein baanta gaya hai, aur unke beech <em>sakht deewarein</em> hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Modular monolith', html: `<strong>Ye kya hai:</strong> ek hi deployable app, lekin andar har module (Users, Videos, Feed, Payments...) ka apna <strong>public interface</strong> (bahar walon ke liye khule functions) aur apni tables hain. Doosra module sirf us interface ko call kar sakta hai; andar ke classes ya tables ko seedha nahi chhoo sakta. Ye niyam tools aur CI checks (har code change pe chalne wale automatic tests) se enforce hote hain, sirf "promise" se nahi.<br><strong>Kyun chahiye:</strong> big ball of mud se bachna, aur har team ko apna saaf ilaaka dena, bina network ke kharche ke.<br><strong>Iske bina:</strong> ya to ulajha monolith, ya jaldbaazi mein microservices.` },
    { type: 'ascii', text: `
            xyz.com  (ek deploy, ek process)
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
 │   ✗ Videos ka code "SELECT * FROM payments" nahi   │
 │     kar sakta. CI check fail kar dega.             │
 └──────────────────────────────────────────────────┘`, caption: 'Boundaries andar hain, network nahi.' },
    { type: 'p', html: `<strong>Asli example: Shopify (2019).</strong> Shopify ka Ruby on Rails monolith duniya ke sabse bade Rails codebases mein se tha: unke engineering blog ke mutabik ~6,000 Ruby classes aur 1,000 se zyada developers ka kaam. Unhone microservices mein todne ke bajaye code ko business concepts (orders, shipping, inventory, billing...) ke hisaab se <em>components</em> mein reorganise kiya. Unki wajah: microservices mein kai deploy pipelines, network latency, services ke beech refactoring mushkil, aur deploys ko coordinate karna padta. Boundaries todne wale calls pakadne ke liye unhone "Wedge" naam ka internal tool banaya jo CI mein call graph banake violations ginta tha. (Ye post Feb 2019 ki hai; tab se unke tools aage badhe hain, lekin idea wahi hai.)` },
    { type: 'list', items: [
      `<strong>Kya milta hai:</strong> ek deploy aur ek transaction ki saadgi, saath mein saaf ownership: "Payments module Payments team ka".`,
      `<strong>Kya nahi milta:</strong> alag scaling aur fault isolation. Memory leak ab bhi poora process gira sakta hai.`,
      `<strong>Chhupa faayda:</strong> agar kabhi ek module ko service banana pada (maan lo transcoding), to uska interface pehle se saaf hai. Nikaalna aasaan. Isliye modular monolith ko aksar microservices ki <em>taiyaari</em> bhi kehte hain.`,
    ]},
    { type: 'p', html: `<strong>Worked example:</strong> xyz.com ke code mein 6 jagah ek module doosre module ko chhoota hai. 4 calls public interface se jaati hain (theek). 2 calls seedha doosre module ki table ya private class chhooti hain (violation). CI chalao: build fail, 2 violations. Har violation ko public function se badlo, build green. Neeche khud karo:` },
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
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"><button type="button" class="btn small primary mm-ci">CI check chalao</button><button type="button" class="btn small ghost mm-r">Reset</button></div>
        <div class="stats"><div class="stat"><span>Calls</span><strong>${CALLS.length}</strong></div><div class="stat"><span>Violations</span><strong class="mm-v"></strong></div><div class="stat"><span>Build</span><strong class="mm-b"></strong></div></div>
        <div class="calc-note mm-note"></div>`;
      const draw = () => {
        const bad = fixed.filter(f => !f).length;
        el.querySelector('.mm-list').innerHTML = CALLS.map((c, i) => {
          const ok = fixed[i], flag = ran && !ok;
          return `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:6px 8px;border:1.5px solid ${flag ? 'var(--red)' : 'var(--line)'};border-radius:var(--r-sm)"><strong style="min-width:76px">${c.from} →</strong><code style="font-size:12px;overflow-wrap:anywhere">${ok ? c.good : c.bad}</code>${!ok ? `<button type="button" class="btn small ghost" data-i="${i}" style="margin-left:auto">Public API se badlo</button>` : '<span style="margin-left:auto;color:var(--green);font-size:13px">public interface ✓</span>'}</div>`;
        }).join('');
        el.querySelector('.mm-v').textContent = ran ? bad : '?';
        el.querySelector('.mm-b').textContent = !ran ? 'abhi nahi chala' : bad ? 'FAIL ✗' : 'PASS ✓';
        el.querySelector('.mm-note').textContent = !ran ? 'Pehle "CI check chalao" dabao. Ye tool har module ka code padh ke dekhta hai ki koi doosre module ki table ya private code ko seedha to nahi chhoo raha.'
          : bad ? bad + ' jagah boundary tooti. Ye code merge nahi hoga. Laal wali lines ko public function se badlo aur dobara chalao.'
          : 'Saari calls public interfaces se. Ab agar kabhi Payments ko alag service banana pada, to sirf uska interface network call ban jaayega; baaki code ko pata bhi nahi chalega.';
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
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Monolith = purana, ganda code." Nahi! Monolith ek <strong>deployment</strong> ka faisla hai (ek unit), aur ganda code ek <strong>design</strong> ki galti hai. Saaf modules wala monolith ek ulajhe hue microservices system (jise log <em>distributed monolith</em> kehte hain: services alag, lekin har deploy mein sab saath badalni padti hain) se kahin behtar hai.` },

    { type: 'h2', text: 'Stage 4: Microservices' },
    { type: 'p', html: `Ab xyz.com pe 300 developers hain, 30 teams. Recommendations team din mein 5 baar deploy karna chahti hai, transcoding ko GPU machines chahiye, payments ko sakht security audit. Ek deploy unit sabko rok raha hai. Ab todne ka waqt hai.` },
    { type: 'p', html: `<strong>Microservices</strong> (resilience lesson mein term aaya tha): har business capability ek alag service, apne process mein, apni deploy pipeline ke saath, aur <strong>apne database ke saath</strong>. Services network pe (HTTP/gRPC) ya events se baat karti hain. James Lewis aur Martin Fowler ke 2014 ke article ne iski pehchaan aise batayi: services business capabilities ke around bani hon, alag deploy hon, data decentralised ho (har service apna data maintain kare), aur design failure ko maan ke chale.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Microservices', html: `<strong>Ye kya hai:</strong> app ko kai chhoti services mein todna. Har service ek business kaam (profiles, recommendations, payments) karti hai, apne process mein chalti hai, apni team ki hai, alag deploy hoti hai, aur uska <strong>apna database</strong> hota hai.<br><strong>Kyun chahiye:</strong> 30 teams ek doosre ka intezaar kiye bina deploy kar sakein, aur jo hissa bhaari hai sirf use scale kiya ja sake.<br><strong>Iske bina (bahut badi team ke saath):</strong> ek deploy train, merge conflicts, ek team ka bug sabka release roke.<br><strong>Keemat:</strong> jo pehle function call tha, ab network call hai: slow, fail ho sakti hai, aur data kai databases mein bant gaya.` },
    { type: 'flow', title: 'Microservices: ek request, kai network calls', height: 330,
      nodes: [
        { id: 'u', label: 'App', x: 70, y: 160, w: 110, kind: 'client', info: 'Ye kya hai: xyz.com ka mobile app ya browser. Ek hi request bhejta hai: GET /feed. Andar kitni services hain, use nahi pata.' },
        { id: 'gw', label: 'API gateway', x: 230, y: 160, w: 130, kind: 'edge', info: 'Ye kya hai: saari services ke aage ek darwaza: login check (auth), rate limit, aur sahi service tak routing. Request ko Feed service tak bhejta hai. (Resilience lesson dekho.)' },
        { id: 'feed', label: 'Feed service', x: 420, y: 160, w: 140, kind: 'server', info: 'Ye kya hai: feed banane wali service. Ab profiles, recs aur comments function call se nahi, network calls se mangwaati hai. Har call mein: serialize, network, deserialize, aur fail hone ka chance.' },
        { id: 'fdb', label: 'Feed DB', sub: 'sirf feed ka data', x: 420, y: 280, w: 140, kind: 'data', info: 'Ye kya hai: sirf Feed service ka apna database ("database per service"). Feed service doosri service ki table seedha nahi padh sakti; use API se poochhna padta hai. Isse teams independent hain, lekin cross-service JOIN aur transaction khatam.' },
        { id: 'prof', label: 'Profile svc', x: 615, y: 60, w: 150, kind: 'server', info: 'Ye kya hai: users ke naam aur photos dene wali service. Apni team, apna DB, apna deploy schedule.' },
        { id: 'recs', label: 'Recs svc', x: 615, y: 160, w: 150, kind: 'server', meter: true, load: 30, info: 'Ye kya hai: "aapko ye bhi pasand aayega" (recommendations) banane wali service. GPU/ML wale machines pe, alag se scale hoti hai. Din mein kai baar deploy.' },
        { id: 'cmt', label: 'Comments svc', x: 615, y: 270, w: 150, kind: 'server', info: 'Ye kya hai: comments aur unki ginti dene wali service. Ye slow ho to feed ko intezaar karna chahiye ya bina counts ke aage badhna chahiye? Ye faisla ab design ka hissa hai.' },
      ],
      edges: [{ a: 'u', b: 'gw' }, { a: 'gw', b: 'feed' }, { a: 'feed', b: 'fdb' }, { a: 'feed', b: 'prof' }, { a: 'feed', b: 'recs' }, { a: 'feed', b: 'cmt' }],
      scenarios: [
        { name: 'Happy path (latency judti hai)', steps: [
          { title: 'Request andar aayi', text: 'App → gateway → feed. Har hop ek network call.', go: 'u>gw>feed', msg: 'GET /feed   (gateway hop ~2 ms)' },
          { title: 'Feed ka apna data', text: 'Feed ne apne DB se video IDs nikaale.', go: ['feed>fdb', 'res:fdb>feed'], msg: 'SELECT video_id FROM feed_items WHERE user_id = 42   ~5 ms' },
          { title: 'Teen services ko parallel call', text: 'Jo pehle function calls the, ab teen network calls hain. Parallel bheji to total = sabse slow wali. Ek ke baad ek bhejte to teeno ka jod.', parallel: true, go: ['feed>prof', 'feed>recs', 'feed>cmt'], msg: 'parallel:  profile 8 ms | recs 25 ms | comments 6 ms\n→ intezaar = max = 25 ms   (sequential hota to 39 ms)' },
          { title: 'Jawab wapas', text: 'Sab theek raha. Lekin har call mein JSON banana/padhna, TLS, aur network ka chhota sa delay. Monolith ke microseconds ab milliseconds ban gaye.', parallel: true, go: ['res:prof>feed', 'res:recs>feed', 'res:cmt>feed'] },
          { title: 'Response', go: 'res:feed>gw>u', text: 'Total ~35-40 ms. Chalega, lekin har nayi dependency is bill mein judti hai.', after: { feed: { state: 'ok' } } },
        ]},
        { name: 'Recs down, bina timeout', intro: 'Recs service hang ho gayi. Feed ke code mein timeout nahi hai.', steps: [
          { title: 'Recs jawab nahi deti', text: 'Request gayi, jawab kabhi nahi aaya.', set: { recs: { state: 'down', sub: 'HANG', load: 0 } }, go: ['feed>prof', 'lost:feed>recs'] },
          { title: 'Feed ke threads atak gaye', text: 'Har feed request recs ka intezaar kar rahi hai. Thread pool (requests sambhalne wale workers ka group) bhar gaya. Ab feed service khud nayi requests nahi le sakti.', flood: { paths: ['u>gw>feed'], n: 10 }, after: { feed: { state: 'hot', sub: 'threads full' } } },
          { title: 'Cascading failure', text: 'Ek service ki problem poore app ki problem ban gayi. Monolith mein ek bug sab girata tha; microservices mein <em>ek slow dependency</em> sab gira sakti hai, agar timeouts aur circuit breakers na hon.', go: ['u>gw', 'bad:gw>u'], set: { feed: { state: 'down', sub: 'DOWN' } }, msg: '504 Gateway Timeout' },
        ]},
        { name: 'Recs down, timeout + fallback', intro: 'Wahi failure, lekin feed ne resilience lesson ke tareeke apnaye.', steps: [
          { title: 'Timeout 100 ms', text: 'Recs hang hai. Feed 100 ms baad intezaar chhod deti hai (circuit breaker khul jaata hai to agli baar call hi nahi karti).', set: { recs: { state: 'down', sub: 'DOWN', load: 0 } }, go: ['lost:feed>recs'] },
          { title: 'Baaki data aa gaya', go: ['feed>prof', 'feed>cmt', 'res:prof>feed', 'res:cmt>feed'], text: 'Profiles aur comments theek hain.' },
          { title: 'Graceful degradation', text: 'Feed "Recommended for you" ki jagah "Trending" (cached list) dikhati hai. User ko halka farq dikha, site chalu rahi. Yahi <strong>fault isolation</strong> microservices ka asli faayda hai, lekin ye muft nahi milta: design karna padta hai.', go: 'res:feed>gw>u', after: { feed: { state: 'ok', sub: 'feed without recs' } } },
        ]},
        { name: 'Alag deploy, alag scale', steps: [
          { title: 'Recs team ka deploy', text: 'Recs team ne naya model deploy kiya. Sirf recs restart hui. Feed, profile, comments ko pata bhi nahi chala. Din mein 5 deploy bhi theek.', set: { recs: { state: 'warn', sub: 'deploying v42' } }, focus: ['recs'] },
          { title: 'Sirf recs ko scale karo', text: 'Evening peak pe sirf recs ki copies 4 se 20. Profile service 3 copies pe hi rahi. Monolith mein ye mumkin nahi tha.', set: { recs: { state: 'ok', sub: '20 copies', load: 45 } }, flood: { paths: ['feed>recs'], n: 8 } },
        ]},
        { name: 'Distributed data ka dard', intro: 'User 42 ne apna account delete kiya.', steps: [
          { title: 'Profile ne apna data hataya', text: 'Profile service ke DB se user 42 gaya.', set: { prof: { state: 'ok', sub: 'user 42 deleted' } }, focus: ['prof'] },
          { title: 'Comments ko pata nahi', text: 'Comments ka apna DB hai; usme user 42 ke comments abhi bhi hain. Monolith mein ek transaction "DELETE user + comments" kar deta. Yahan koi shared transaction nahi.', set: { cmt: { state: 'warn', sub: '42 ke comments baaki' } }, focus: ['cmt'] },
          { title: 'Ilaaj: events ya saga', text: 'Profile ek event bhejti hai "UserDeleted" (outbox se, Kafka lesson yaad karo), aur comments use sunke apna data saaf karti hai. Thodi der ke liye data inconsistent rahega: ye <strong>eventual consistency</strong> hai. Multi-step kaam ke liye sagas chahiye (Sagas wala lesson dekho).', focus: ['prof', 'cmt'] },
        ]},
      ],
    },

    { type: 'h3', text: 'Microservices ka bill' },
    { type: 'table', head: ['Faayda', 'Keemat (jo log bhool jaate hain)'], rows: [
      ['Har team apni service khud deploy kare, kisi ka intezaar nahi', '<strong>Network calls:</strong> har call slow ho sakti hai, fail ho sakti hai, ya do baar chal sakti hai. Timeouts, retries, circuit breakers, idempotency sab chahiye'],
      ['Jo hissa bhaari hai sirf use scale karo (transcoding vs profiles)', '<strong>Distributed data:</strong> cross-service JOIN nahi, ek ACID transaction nahi. Sagas, outbox, eventual consistency seekhni padti hai'],
      ['Fault isolation: recs giri to feed bina recs ke chal sakti hai', '<strong>Operations:</strong> 50 services = 50 pipelines, dashboards, alerts, on-call. Distributed tracing ke bina "request kahan atki?" ka jawab nahi milta'],
      ['Har service apni tech choose kar sakti hai (ML ke liye Python, gateway ke liye Go)', '<strong>Testing aur versioning:</strong> service A ka API badla to B, C, D toot sakte hain. Contract tests, backward-compatible changes chahiye'],
      ['Chhota codebase, naya developer jaldi samjhe', '<strong>Latency judti hai:</strong> neeche calculator chala ke dekho'],
    ]},
    { type: 'p', html: `Ek seedha hisaab: agar request ko <em>ek ke baad ek</em> N services se guzarna hai, to latency jud jaati hai aur availability <strong>guna</strong> hoti hai. Har service 99.9% up hai, to 5 services ki chain sirf ~99.5% up. Slider ghuma ke dekho:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Chain mein services (ek ke baad ek): <strong class="as-vn"></strong></label><input class="as-n" type="range" min="1" max="10" step="1" value="5"></div>
          <div><label>Har call ka latency (ms): <strong class="as-vl"></strong></label><input class="as-l" type="range" min="1" max="50" step="1" value="10"></div>
        </div>
        <div style="margin-top:10px"><label>Har service ki availability: <strong class="as-va"></strong></label><input class="as-a" type="range" min="0" max="4" step="1" value="2"></div>
        <div class="stats">
          <div class="stat"><span>Network latency (sirf hops)</span><strong class="as-lat"></strong></div>
          <div class="stat"><span>Poori chain ki availability</span><strong class="as-av"></strong></div>
          <div class="stat"><span>Downtime per month (30 din)</span><strong class="as-dt"></strong></div>
        </div>
        <div class="calc-note as-note"></div>`;
      const $ = c => el.querySelector(c);
      const AV = [99, 99.5, 99.9, 99.95, 99.99];
      const fmt = m => m >= 120 ? (m / 60).toFixed(1) + ' ghante' : m.toFixed(1) + ' min';
      const upd = () => {
        const n = +$('.as-n').value, L = +$('.as-l').value, a = AV[+$('.as-a').value] / 100;
        const chain = Math.pow(a, n), down = (1 - chain) * 30 * 24 * 60, one = (1 - a) * 30 * 24 * 60;
        $('.as-vn').textContent = n; $('.as-vl').textContent = L; $('.as-va').textContent = (a * 100) + '%';
        $('.as-lat').textContent = n * L + ' ms';
        $('.as-av').textContent = (chain * 100).toFixed(3) + '%';
        $('.as-dt').textContent = fmt(down);
        $('.as-note').textContent = n === 1
          ? 'Ek service: jitni uski availability, utni hi poori request ki.'
          : `Ek akeli service ka downtime ~${fmt(one)}/month hota. ${n} ki chain mein ~${fmt(down)}/month, kyunki koi bhi ek giri to poori request giri. Isliye: chain chhoti rakho, jo call zaroori nahi use async (event) banao, aur fallback rakho.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'h3', text: "Conway's law: teams ki shape = system ki shape" },
    { type: 'callout', tone: 'term', title: "Naya word: Conway's law", html: `<strong>Ye kya hai:</strong> 1968 mein Melvin Conway ki baat, seedhe shabdon mein: <strong>jo organisation system banati hai, system ki structure us organisation ke aapas mein baat karne ke tareeke jaisi ban jaati hai.</strong><br><strong>Kyun zaroori:</strong> microservices ki boundaries asal mein <em>teams</em> ki boundaries hain. Ek service do teams ki ho to har change pe meeting; ek team 15 services sambhale to bojh.<br><strong>Iske bina (ignore kiya to):</strong> system teams ki ulajhan copy kar leta hai: jo teams aapas mein baat nahi karti, unke systems ke beech ajeeb, patli si interface banti hai.<br><strong>Ulta istemaal:</strong> kai companies pehle teams waisi banati hain jaisa system chahiye. Ise "inverse Conway manoeuvre" kehte hain.` },
    { type: 'p', html: `<strong>Worked example:</strong> xyz.com ko "Super Tips" feature mein ek naya field (tip ke saath message) jodna hai. Agar teams <em>layers</em> ke hisaab se bani hain (Frontend team, Backend team, Database team), to ek chhote feature ke liye teen teams, teen queues, do handoffs. Agar teams <em>features</em> ke hisaab se bani hain (Upload team, Feed team, Payments team, har ek mein frontend + backend + DB log), to ek hi team poora kaam karti hai. Toggle karke dekho:` },
    { type: 'custom', render(el) {
      const ORG = {
        layer: { teams: ['Frontend team', 'Backend team', 'Database team'], involved: [0, 1, 2], sys: 'System bhi teen layers jaisa: ek bada UI, ek bada backend, ek shared DB. Har feature har layer chhoota hai.' },
        feature: { teams: ['Upload team', 'Feed team', 'Payments team'], involved: [2], sys: 'System bhi teen hisson jaisa: Upload, Feed, Payments services, har ek ka apna UI-se-DB tak ka slice.' },
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
        el.querySelector('.cw-n').textContent = o.sys + (n > 1 ? ' Har handoff = intezaar, meeting, galatfehmi ka chance.' : ' Ek team, koi handoff nahi: feature jaldi pahunchta hai.');
      };
      el.querySelector('.cw-c').addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-m]'); if (b) { mode = b.dataset.m; draw(); } });
      draw();
    }},
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Microservices = scalable." Galat. Ek monolith ki 50 copies load balancer ke peeche bahut traffic sambhal leti hain. Microservices mainly <strong>organisation scaling</strong> ka jawab hain (bahut saari teams independent kaam karein) aur <strong>alag scaling profiles</strong> ka (GPU transcoding vs halki profile API). 5 logon ki team ko 20 services dena productivity ghatata hai.` },

    { type: 'h2', text: 'Event-driven architecture' },
    { type: 'p', html: `Upload service ka code dekho. Video upload hone ke baad use transcoder ko call karna hai, notifications ko, search ko, analytics ko. Har nayi team aati hai to upload team ke code mein ek aur call judti hai, aur in mein se koi bhi down ho to upload atak jaata hai. Upload service ko itni saari services ke baare mein pata kyun ho?` },
    { type: 'callout', tone: 'term', title: 'Naya word: Event-driven architecture (EDA)', html: `<strong>Ye kya hai:</strong> services ek doosre ko "ye karo" bolne ke bajaye <strong>"ye ho gaya"</strong> announce karti hain. Ye announcement ek <strong>event</strong> hai: past tense mein ek fact, jaise <code>VideoUploaded {id: 7}</code>. Event ek <strong>broker</strong> (beech ka message system, jaise Kafka, SNS, RabbitMQ) pe jaata hai, aur jisko parwah hai wo subscribe (sunna shuru) karta hai. Bhejne wale ko pata hi nahi ki kaun sun raha hai.<br><strong>Kyun chahiye:</strong> upload service ko 10 doosri services ke baare mein jaanna na pade, aur unmein se koi down ho to upload na atke.<br><strong>Iske bina:</strong> har nayi team upload ke code mein ek aur call jodti hai; ek slow service sabko slow karti hai.` },
    { type: 'compare',
      left: { title: 'Request-driven (command)', html: `Upload service: "Transcoder, ise transcode karo. Notifications, followers ko batao. Search, index karo."<br><br>• Bhejne wala sabko jaanta hai<br>• Sab synchronous: koi slow to sab slow<br>• Nayi team = upload ke code mein change<br>• Result turant pata` },
      right: { title: 'Event-driven (event)', html: `Upload service: "VideoUploaded {id:7}". Bas.<br><br>• Bhejne wala kisi ko nahi jaanta (loose coupling)<br>• Consumers apni speed se, async<br>• Nayi team = naya subscriber, upload mein zero change<br>• Result baad mein, aur flow dikhna mushkil` },
    },
    { type: 'flow', title: 'Event fan-out: ek event, kai reactions', height: 330,
      nodes: [
        { id: 'up', label: 'Upload service', sub: 'producer', x: 90, y: 165, w: 140, kind: 'server', info: 'Ye kya hai: video upload lene wali service (producer = event bhejne wala). Video ko object storage mein save karti hai, apne DB mein row + outbox row likhti hai, aur bas. Isse fark nahi padta ki aage kaun kya karega.' },
        { id: 'bus', label: 'Kafka', sub: 'topic: video-events', x: 310, y: 165, w: 160, kind: 'queue', info: 'Ye kya hai: event broker. Event log mein likha jaata hai; har consumer group apni speed se padhta hai aur purane events replay bhi kar sakta hai (Kafka lesson).' },
        { id: 'tr', label: 'Transcoder', x: 570, y: 45, w: 160, kind: 'server', info: 'Ye kya hai: video ko alag qualities mein badalne wali service. VideoUploaded sunke 240p/720p/1080p versions banata hai. Kaam ho jaaye to khud ek naya event bhejta hai: VideoTranscoded.' },
        { id: 'nt', label: 'Notifications', x: 570, y: 125, w: 160, kind: 'server', info: 'Ye kya hai: followers ko push notification bhejne wali service. Down ho jaaye to upload pe koi asar nahi; wapas aake jahan chhoda tha wahan se padhta hai.' },
        { id: 'se', label: 'Search indexer', x: 570, y: 205, w: 160, kind: 'server', info: 'Ye kya hai: search ka indexer. Naye video ko search index mein daalta hai. Thoda pichhe chal sakta hai: is beech search mein video nahi dikhega (eventual consistency).' },
        { id: 'an', label: 'Analytics', x: 570, y: 285, w: 160, kind: 'server', info: 'Ye kya hai: analytics service. Uploads ki ginti, creators ke stats. Ye events data pipeline (batch/stream) mein bhi jaate hain: agla lesson.' },
        { id: 'mod', label: 'Moderation', sub: 'nayi team', x: 310, y: 285, w: 160, kind: 'server', hidden: true, info: 'Ye kya hai: nayi moderation team ki service, jo har naye video ko abuse/copyright ke liye check karti hai. Upload service mein ek line bhi nahi badli; bas naya consumer group.' },
      ],
      edges: [{ a: 'up', b: 'bus' }, { a: 'bus', b: 'tr' }, { a: 'bus', b: 'nt' }, { a: 'bus', b: 'se' }, { a: 'bus', b: 'an' }, { a: 'bus', b: 'mod', hidden: true, id: 'bm' }],
      scenarios: [
        { name: 'Fan-out', steps: [
          { title: 'Upload ne event publish kiya', text: 'Video save hua, aur ek fact announce hua. Upload service ka kaam khatam; user ko turant "Upload ho gaya, processing..." dikh jaata hai.', go: 'up>bus', after: { up: { state: 'ok' } }, msg: 'topic=video-events key=video_7\n{ "type": "VideoUploaded", "video_id": 7, "creator": 42, "at": "2026-10-04T18:02:11Z" }' },
          { title: 'Sab apne aap react karte hain', text: 'Chaaron consumers ko same event mila, sab parallel aur independent.', parallel: true, go: ['evt:bus>tr', 'evt:bus>nt', 'evt:bus>se', 'evt:bus>an'], after: { tr: { state: 'ok', sub: 'transcoding...' }, nt: { state: 'ok' }, se: { state: 'ok' }, an: { state: 'ok' } } },
          { title: 'Events ki chain', text: 'Transcoder ka kaam hua to wo naya event bhejta hai <code>VideoTranscoded</code>, jise player/feed services sunti hain. Bina kisi "boss" ke services ek doosre ke events pe react karti hain: ise <strong>choreography</strong> kehte hain. Ek central coordinator har step bataaye to wo <strong>orchestration</strong> hai (Sagas lesson).', go: 'evt:tr>bus', msg: '{ "type": "VideoTranscoded", "video_id": 7, "renditions": ["240p","720p","1080p"] }' },
        ]},
        { name: 'Nayi team aayi', steps: [
          { title: 'Moderation team join', text: 'Nayi service subscribe karti hai. Upload team se koi meeting nahi, koi deploy nahi.', show: ['mod', 'bm'], focus: ['mod'] },
          { title: 'Events milne lage', text: 'Kafka hai to wo pichhle 7 din ke videos bhi replay karke check kar sakti hai.', go: 'evt:bus>mod', after: { mod: { state: 'ok', sub: 'checking video 7' } } },
        ]},
        { name: 'Consumer down', steps: [
          { title: 'Notifications crash', text: 'Notifications service 30 minute ke liye down.', set: { nt: { state: 'down', sub: 'DOWN' } }, focus: ['nt'] },
          { title: 'Baaki sab chalta raha', text: 'Uploads ho rahe hain, transcoding, search, analytics sab normal. Request-driven design mein upload service ki call yahan fail hoti aur shayad upload hi fail ho jaata.', parallel: true, go: ['up>bus', 'evt:bus>tr', 'evt:bus>se', 'evt:bus>an'] },
          { title: 'Wapas aake catch up', text: 'Notifications apne last offset se padhti hai aur 30 minute ke events process karti hai. Dhyaan: ab 30 minute purani notifications jaayengi; kuch events ke liye "bahut purana ho gaya, skip karo" logic chahiye.', go: 'evt:bus>nt', set: { nt: { state: 'warn', sub: 'catching up' } } },
        ]},
        { name: 'Eventual consistency', intro: 'Riya ne video upload kiya aur turant search mein apna title dhoondha.', steps: [
          { title: 'Upload ho gaya', text: 'Upload service ne "done" bol diya.', go: 'up>bus', after: { up: { state: 'ok' } } },
          { title: 'Search abhi pichhe hai', text: 'Search indexer ka lag 20 second hai. Riya ko apna video search mein nahi dikha. Bug? Nahi: system <strong>eventually consistent</strong> hai. Kuch second mein dikh jaayega.', set: { se: { state: 'warn', sub: 'lag 20 s' } }, focus: ['se'] },
          { title: 'Design ka jawab', text: 'UI mein "Processing, thodi der mein search mein dikhega" likho, ya uploader ko apni list seedha upload service se dikhao (read-your-own-writes). Aur debugging ke liye har event mein ek <code>correlation_id</code> daalo, taaki "video 7 ke saath kya kya hua" trace ho sake.', go: 'evt:bus>se', after: { se: { state: 'ok', sub: 'indexed' } } },
        ]},
      ],
    },
    { type: 'list', items: [
      `<strong>Kab EDA:</strong> ek cheez hone pe kai alag systems ko react karna ho; kaam slow ho aur user ko turant result na chahiye; teams independent rehni chahiye.`,
      `<strong>Kab nahi:</strong> user ko turant jawab chahiye ("login sahi hua?"); 2-3 hop ki simple chain; poore business process ka flow ek jagah dikhna zaroori ho (wahan orchestration/workflow engine behtar).`,
      `<strong>Chhupi keemat:</strong> duplicate events (consumers idempotent banao), order sirf per key, schema badalna (purane consumers na tootein), aur "kaun kis event pe kya karta hai" ka naksha kho jaana.`,
    ]},

    { type: 'h2', text: 'CQRS: likhne aur padhne ke alag models' },
    { type: 'p', html: `xyz.com ka creator dashboard: "pichhle 30 din ke views per day, top 10 videos, country-wise viewers, earnings". Ye query 6 tables join karti hai aur har dashboard refresh pe main database ko pees deti hai. Doosri taraf likhne wala data (ek view, ek tip) chhota aur simple hai, aur use sakht rules chahiye ("tip negative nahi ho sakti"). Ek hi table design dono kaam achhe se nahi kar paata.` },
    { type: 'callout', tone: 'term', title: 'Naya word: CQRS', html: `<strong>Ye kya hai:</strong> CQRS = Command Query Responsibility Segregation. <strong>Command</strong> = kuch badalne wali request ("tip bhejo"). <strong>Query</strong> = sirf padhne wali request ("dashboard dikhao"). CQRS mein dono ke liye <strong>alag data models</strong> (alag tables, aksar alag databases) hote hain. Write model rules aur sahi data pe dhyaan deta hai. Read model ek ready-made shape mein hota hai jo seedha screen pe dikh sake. Write side ke events ya CDC (database ke change log ko padhna) se read model update hota hai. Ye idea Greg Young ne describe kiya tha.<br><strong>Kyun chahiye:</strong> bhaari dashboard queries main database ko na pees dein, aur dono sides apne kaam ke best DB pe chalein.<br><strong>Iske bina:</strong> har dashboard refresh 6 tables join karta hai, aur tips likhne wale users slow ho jaate hain.` },
    { type: 'ascii', text: `
  Command: "tip bhejo"                 Query: "dashboard dikhao"
         │                                       │
         ▼                                       ▼
 ┌────────────────┐   event: TipReceived   ┌──────────────────┐
 │  WRITE model   │ ─────── Kafka ───────► │   READ model     │
 │ Postgres,      │   (ya CDC / outbox)    │ dashboard_daily  │
 │ normalised,    │                        │ (ClickHouse/ES/  │
 │ rules check    │                        │  Redis), ready   │
 └────────────────┘                        └──────────────────┘
   sahi aur strict                           tez aur denormalised
              ← yahan beech mein kuch second ka lag →`, caption: 'Read model thoda pichhe chalta hai: eventual consistency.' },
    { type: 'list', items: [
      `<strong>Faayde:</strong> reads aur writes alag scale; har side ka DB apne kaam ke liye best (writes ke liye Postgres, dashboards ke liye column store, search ke liye Elasticsearch); ek write model se kai read models.`,
      `<strong>Keemat:</strong> do models, sync ka pipeline, aur <em>lag</em>: creator ne abhi tip paayi, dashboard mein 3 second baad dikhegi. Martin Fowler ki warning: zyaadatar systems ke liye CQRS bekaar ki risky complexity hai; sirf system ke kisi ek hisse (bounded context) pe lagao jahan sach mein zaroorat ho.`,
      `<strong>Tum shayad pehle se kar rahe ho:</strong> Postgres se Elasticsearch mein CDC se data bhejna (search lesson) ek halka CQRS hi hai.`,
    ]},

    { type: 'p', html: `<strong>Worked example:</strong> projector (jo events padh ke read model update karta hai) ka lag 3 second hai. t = 0 pe Aman ne ₹50 tip bheji: write model turant ₹50. t = 1 pe Riya ne dashboard khola: ₹0 dikha (purana). t = 3 pe event pahuncha: dashboard ₹50. Aur −₹20 ki "tip" write model hi rok deta hai, read side tak kuch nahi jaata. Khud chala ke dekho:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<label>Read model ka lag: <strong class="cq-lv"></strong></label><input class="cq-lag" type="range" min="0" max="10" step="1" value="3">
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"><button type="button" class="btn small primary" data-a="tip">Command: ₹50 tip bhejo</button><button type="button" class="btn small ghost" data-a="badtip">Command: −₹20 tip</button><button type="button" class="btn small ghost" data-a="tick">+1 second</button><button type="button" class="btn small primary" data-a="read">Query: dashboard dikhao</button><button type="button" class="btn small ghost" data-a="reset">Reset</button></div>
        <div class="stats"><div class="stat"><span>Time</span><strong class="cq-t"></strong></div><div class="stat"><span>Write model (Postgres)</span><strong class="cq-w"></strong></div><div class="stat"><span>Read model (dashboard)</span><strong class="cq-r"></strong></div><div class="stat"><span>Raaste mein events</span><strong class="cq-q"></strong></div></div>
        <div class="calc-note cq-n"></div>`;
      let t, w, r, q, msg;
      const reset = () => { t = 0; w = 0; r = 0; q = []; msg = 'Tip bhejo, phir turant dashboard padho. Phir +1 second dabate jao.'; };
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
        else if (a === 'tip') { w += 50; q.push({ amt: 50, at: t + lag }); flush(); msg = 'Write model ne rules check kiye (amount > 0, creator verified) aur turant save kiya: ₹' + w + '. Event TipReceived nikla, read model tak ' + lag + ' s mein pahunchega.'; }
        else if (a === 'badtip') msg = 'Write model ne mana kar diya: tip negative nahi ho sakti. Koi event nahi bana, read model ko kuch nahi mila. Rules sirf write side pe.';
        else if (a === 'tick') { t++; flush(); msg = q.length ? 'Abhi ' + q.length + ' event raaste mein. Dashboard ' + (w - r > 0 ? '₹' + (w - r) + ' peeche hai.' : 'barabar hai.') : 'Read model write model ke barabar pahunch gaya (eventually consistent).'; }
        else if (a === 'read') msg = w === r ? 'Dashboard: ₹' + r + '. Bilkul taaza.' : 'Dashboard: ₹' + r + ', lekin asli total ₹' + w + ' hai. Ye stale read hai: read model abhi ₹' + (w - r) + ' peeche. Ye CQRS ki keemat hai.';
        draw();
      });
      el.querySelector('.cq-lag').addEventListener('input', draw);
      reset(); draw();
    }},

    { type: 'h2', text: 'Event sourcing: state nahi, history save karo' },
    { type: 'p', html: `Normal app mein table mein sirf <em>abhi ki value</em> hoti hai: <code>wallet.balance = 110</code>. Kal ka balance kya tha? Kaise 110 hua? Kisi ne galti se UPDATE chala diya to? Purani value gayi. Bank passbook ka socho: usme sirf balance nahi, har entry likhi hoti hai, aur balance un entries ka jod hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Event sourcing', html: `<strong>Ye kya hai:</strong> source of truth ek <strong>append-only event log</strong> hai (sirf end mein naye events judte hain). Har badlaav ek event: <code>TipReceived +100</code>, <code>Withdrawn -120</code>. Current state store nahi hoti; events ko shuru se <strong>replay</strong> (ek ek karke apply) karke banti hai. Events kabhi edit/delete nahi hote; galti sudhaarni ho to ek naya "ulta" event (jaise <code>TipRefunded</code>) likhte hain.<br><strong>Kyun chahiye:</strong> poori history: kab, kisne, kya. Paise, wallets, orders mein "ye number kaise bana?" ka jawab hamesha milta hai.<br><strong>Iske bina:</strong> table mein sirf aakhri value; purani values UPDATE ke saath hamesha ke liye gayab.` },
    { type: 'p', html: `Neeche xyz.com ke creator Riya ka "Super Tips" wallet hai. Slider se events ek ek karke replay karo. Phir projection (events se read model banane wala code) badal ke dekho: <strong>same events se ek bilkul naya read model</strong> ban jaata hai jo pehle exist hi nahi karta tha.` },

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
          <button type="button" class="chip" data-p="1">Read model 2: Top supporters (naya)</button>
        </div>
        <div style="margin-top:10px"><label>Replay karo: event 1 se <strong class="as-vk"></strong> tak</label><input class="as-k" type="range" min="0" max="${EV.length}" step="1" value="${EV.length}"></div>
        <label style="display:flex;gap:8px;align-items:center;margin-top:8px;font-size:14px;color:var(--ink-2)"><input class="as-snap" type="checkbox"> Snapshot use karo (event #${SNAP} ke baad ki state save hai)</label>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-top:12px">
          <div><div style="font:600 13px var(--f-display);color:var(--ink-2);margin-bottom:6px">Event log (append-only)</div><ol class="as-log" style="margin:0;padding-left:22px;font:12.5px/1.7 var(--f-mono)"></ol></div>
          <div><div style="font:600 13px var(--f-display);color:var(--ink-2);margin-bottom:6px">Replay se bani state</div><div class="as-state" style="border:1px solid var(--line);border-radius:var(--r-sm);background:var(--surface-2);padding:10px 12px;font:13px/1.8 var(--f-mono);color:var(--ink)"></div></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Events apply kiye</span><strong class="as-applied"></strong></div>
          <div class="stat"><span>Shuru kahan se</span><strong class="as-from"></strong></div>
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
        $('.as-vk').textContent = k ? '#' + k : '(kuch nahi)';
        $('.as-log').innerHTML = EV.map((e, i) => {
          const done = i < k, fromSnap = snap && i < SNAP;
          const col = !done ? 'var(--ink-3)' : fromSnap ? 'var(--violet)' : 'var(--ink)';
          return `<li style="color:${col}">${done ? '✓' : '·'} ${e.t} <span style="color:var(--ink-3)">${e.d}</span></li>`;
        }).join('');
        if (proj) {
          const rows = Object.entries(state).sort((a, b) => b[1] - a[1]);
          $('.as-state').innerHTML = rows.length ? rows.map(([w, v], i) => `${i + 1}. ${w}: ${v}`).join('<br>') : '(abhi koi supporter nahi)';
        } else {
          $('.as-state').innerHTML = `balance: <strong>${state.balance}</strong><br>tips received: ${state.tips} (${state.tipCount} tips)<br>refunded: ${state.refunds}<br>withdrawn: ${state.withdrawn}`;
        }
        $('.as-applied').textContent = (k - start) + ' / ' + k;
        $('.as-from').textContent = snap ? 'Snapshot #' + SNAP : 'Event 1 (khaali state)';
        const notes = [];
        if (snap) notes.push(`Snapshot se shuru kiya, to sirf ${k - start} events apply karne pade, ${k} nahi. Lakhon events wale log mein snapshots hi replay ko tez rakhte hain.`);
        if (proj) notes.push('Ye "Top supporters" read model pehle kabhi bana hi nahi tha. Kyunki poori history saved hai, naya projection likho aur same events replay karo: purane data pe bhi naya feature turant ready. Sirf current balance store kiya hota to "kisne kitna diya" kabhi pata nahi chalta.');
        else notes.push(k === 4 ? 'Temporal query: event #4 ke baad balance 30 tha. Normal table mein ye purani value kab ki overwrite ho chuki hoti.' : 'Balance kahin store nahi hai: har baar events ka jod hai. Slider event #4 pe le jaao: "us waqt balance kitna tha?" ka jawab mil jaayega.');
        $('.as-enote').textContent = notes.join(' ');
      };
      $('.as-k').addEventListener('input', upd); $('.as-snap').addEventListener('change', upd); upd();
    }},

    { type: 'list', items: [
      `<strong>Kya milta hai:</strong> poora audit trail (kisne kab kya kiya); kisi bhi purane waqt ki state ("temporal query"); naye read models purane data pe (upar dekha); bug fix ke baad sahi code se dobara replay. Isliye ledgers, payments, wallets, orders jaise domains mein ye natural hai.`,
      `<strong>Snapshots:</strong> 5 saal ke events har baar replay karna slow hai, to beech beech mein state ki photo (snapshot) save karte hain aur sirf uske baad ke events apply karte hain.`,
      `<strong>Mushkilein:</strong> event ka format badalna (5 saal purane events bhi padhne padenge: "event versioning"); "aaj saare users jinka balance > 1000" jaisi query ke liye alag read model (yaani CQRS) chahiye hi; replay ke time bahar ki duniya ko dobara email/payment nahi jaana chahiye; aur "user ka data delete karo" (privacy laws) append-only log mein tricky hai.`,
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `<strong>Event sourcing ≠ event-driven ≠ CQRS.</strong> Event-driven: services events se <em>baat</em> karti hain (state normal tables mein ho sakti hai). Event sourcing: ek service apni <em>state hi</em> events ki shakal mein store karti hai. CQRS: read aur write models alag. Teeno aksar saath dikhte hain, lekin har ek bina doosre ke bhi chal sakta hai. Aur Kafka mein events daal dena apne aap event sourcing nahi hai.` },

    { type: 'h2', text: 'Serverless: server ki chinta cloud ki' },
    { type: 'p', html: `xyz.com pe har upload ke baad ek chhota kaam: thumbnail banana. Din mein kabhi 10 uploads per minute, cricket final pe 5,000. Iske liye 24x7 servers chalana jo zyaadatar time khaali baithe hain? Aur peak pe kam pad jaayein?` },
    { type: 'callout', tone: 'term', title: 'Naya word: Serverless / FaaS', html: `<strong>Ye kya hai:</strong> serverless ka matlab ye nahi ki server nahi hain; matlab hai ki <strong>servers tum manage nahi karte</strong>. Tum sirf ek function (code ka chhota tukda) upload karte ho. Cloud use kisi event pe chalata hai (HTTP request, S3 upload, queue message), zaroorat ke hisaab se 0 se hazaaron copies tak scale karta hai, aur paisa sirf chalne ke time ka lagta hai. Is form ko <strong>FaaS (Function as a Service)</strong> bhi kehte hain: AWS Lambda, Google Cloud Run functions, Azure Functions.<br><strong>Kyun chahiye:</strong> thumbnail jaise kaam din mein kabhi 10 baar, kabhi 5,000 baar. Khaali servers ka paisa nahi, peak pe kami nahi.<br><strong>Iske bina:</strong> 24x7 servers jo zyaadatar khaali baithe hain, ya peak pe kam pad jaate hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Cold start', html: `<strong>Ye kya hai:</strong> function kaafi der se nahi chala, ya traffic badha aur nayi copy chahiye. To cloud ko pehle ek naya environment (chhota sa container) banana padta hai: code download, runtime start, tumhara init code (DB connection, libraries load). Ye pehli request ka extra delay hai: <strong>cold start</strong>. Uske baad wahi environment kuch der reuse hota hai: <strong>warm start</strong>, bina extra delay.<br><strong>Kyun samajhna zaroori:</strong> AWS ke docs ke mutabik cold starts aam taur pe 1% se kam invocations mein hote hain, aur 100 ms se kam se lekar 1 second se zyada tak ke ho sakte hain. Kam traffic wali API ke liye ye bahut dikh sakta hai.<br><strong>Ilaaj:</strong> <em>provisioned concurrency</em> (pehle se garam copies; paisa lagta hai chahe request aaye ya na aaye), chhota package, halka init code.` },
    { type: 'p', html: `Cold start kab kitna dukhta hai? <strong>Worked example:</strong> maan lo khaali environment 10 minute baad hata diya jaata hai (AWS iska exact time guarantee nahi karta; ye sirf simulator ka assumption hai). Agar function har 20 minute mein ek baar chalta hai, to <strong>har</strong> request cold: 3 mein se 3. Agar har minute 5 requests aati hain, to sirf pehli minute ki 5 cold, baaki 295 warm: 1.7%. Agar achaanak 40 requests ek saath aayein, to 2 warm copies ke alawa 38 nayi copies cold banengi. Pattern chuno aur dekho:` },
    { type: 'custom', render(el) {
      const PAT = { rare: t => (t === 0 || t === 20 || t === 45 ? 1 : 0), steady: () => 5, spike: t => (t === 30 ? 40 : 2) };
      const NAME = { rare: 'Kabhi kabhi (har ~20 min)', steady: 'Steady (5 / min)', spike: 'Spike (minute 30 pe 40)' };
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
        <div><label>Provisioned (hamesha garam) copies: <strong class="sl-pv"></strong></label><input class="sl-p" type="range" min="0" max="10" step="1" value="0"></div></div>
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
        q('.sl-note').textContent = (r.pct > 50 ? 'Kam traffic: environment har baar thanda ho jaata hai, to lagbhag har user ko cold start dikhta hai. ' : r.pct > 5 ? 'Spike pe nayi copies thandi banti hain. ' : 'Steady traffic mein copies garam rehti hain; cold start sirf shuru mein. ')
          + (P ? P + ' provisioned copies 24x7 garam hain: in par request na aaye tab bhi paisa lagta hai.' : 'Laal = cold start wali requests, neela = warm.');
      };
      q('.sl-c').addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-p]'); if (b) { pat = b.dataset.p; upd(); } });
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'table', head: ['AWS Lambda limit (official docs, 2026)', 'Value', 'Design pe asar'], rows: [
      ['Max run time per invocation', '15 minute (900 s)', 'Lambi video transcoding seedha ek function mein nahi; tukdon mein ya containers pe'],
      ['Memory', '128 MB se 10,240 MB', 'CPU memory ke saath badhta hai; bhaari ML model mushkil'],
      ['Request/response payload (sync)', '6 MB each', 'Badi files function se nahi; pre-signed URL se seedha S3 pe'],
      ['Concurrent executions (default, per region)', '1,000 (badhwa sakte ho)', 'Spike pe throttling ho sakti hai; DB connections bhi bhar sakte hain'],
      ['/tmp disk', '512 MB se 10,240 MB', 'Temporary hai; state hamesha bahar (S3/DB) rakho'],
    ], caption: 'Numbers AWS Lambda quotas page se; cloud limits badalte rehte hain, design karte waqt current docs dekho.' },
    { type: 'list', items: [
      `<strong>Achha fit:</strong> spiky ya kam traffic, event pe chalne wale chhote kaam (thumbnail, webhook, cron jobs, "glue" code), naya product jahan ops team nahi.`,
      `<strong>Bura fit:</strong> lagatar bhaari traffic (har second chalne wale function ka bill ek reserved server se mehenga pad sakta hai), bahut low-latency APIs (cold starts), lambe jobs, ya jahan functions aapas mein bahut saara data idhar-udhar karein.`,
      `<strong>Stateless rehna padta hai:</strong> do invocations ke beech memory pe bharosa nahi; DB connections ka dhyaan (hazaar copies = hazaar connections, isliye connection proxy/pooler).`,
    ]},
    { type: 'callout', tone: 'why', title: 'Real example: Prime Video ki monitoring service (March 2023)', html: `Amazon Prime Video ki ek team ne 2023 mein apne tech blog pe likha ki unki <strong>audio/video quality monitoring</strong> service (streams mein glitches dhoondhne wali) pehle AWS Step Functions + Lambda + S3 pe distributed bani thi. Har video frame ka beech ka data S3 mein jaata aur har step ek Step Functions state transition tha. Ye design unke expected load ke ~5% pe hi limits se takra gaya aur mehenga tha. Unhone saare components ko <strong>ek process</strong> mein daal diya (ECS pe containers), data memory mein pass hone laga, aur infrastructure cost 90% se zyada kam hui. Ek machine ki limit se aage jaane ke liye detectors ko kai ECS tasks mein baant diya. Dhyaan do: ye <em>Prime Video ki ek service</em> ki kahani hai, poore Prime Video ki nahi, aur sabak "serverless kharaab" nahi balki "jahan components bahut saara data aapas mein bhejte hain, unhe network ke paar mat todo" hai. (Original post ab redirect hota hai; InfoQ ki May 2023 summary sources mein.)` },

    { type: 'h2', text: 'Peer-to-peer (P2P)' },
    { type: 'p', html: `Ab tak har design mein ek "beech wala" server tha. Lekin socho: xyz.com pe do users video call kar rahe hain. Har video frame Mumbai se xyz.com ke server (maan lo Singapore) jaaye aur phir wapas Pune? Bandwidth ka bill bhi xyz.com ka, latency bhi zyada. Kya dono seedha baat nahi kar sakte?` },
    { type: 'callout', tone: 'term', title: 'Naya word: Peer-to-peer (P2P)', html: `<strong>Ye kya hai:</strong> har machine (<strong>peer</strong>) client bhi hai aur server bhi: wo data maangti bhi hai aur doosron ko deti bhi hai. Koi central server saara data nahi dhota. Examples: <strong>BitTorrent</strong> (badi file ke tukde hazaaron peers se ek saath download, aur tum bhi doosron ko upload karte ho), <strong>WebRTC</strong> video calls (realtime lesson), aur blockchains.<br><strong>Kyun chahiye:</strong> jitne zyada users, utni zyada capacity, kyunki har naya user apni upload speed bhi saath laata hai.<br><strong>Iske bina:</strong> saara traffic ek central server se: bandwidth ka bada bill, aur users badhne pe sab slow.` },
    { type: 'list', items: [
      `<strong>Faayde:</strong> jitne zyada users, utni zyada capacity (har naya peer resources bhi laata hai); central bandwidth ka kharcha kam; koi ek server gire to sab nahi girta.`,
      `<strong>Mushkilein:</strong> peers ko ek doosre ko dhoondhna (discovery ke liye aksar phir bhi ek chhota central server: BitTorrent ka tracker, WebRTC ka signaling server); NAT/firewall ke peeche ke devices tak pahunchna (NAT = ghar/office ka router jo bahar se aane wale connections rokta hai; STUN se apna public address pata karte hain, aur kai baar TURN relay server se hi jaana padta hai); peers kabhi bhi chale jaate hain (churn); bharosa (koi peer galat data de to? isliye content hashes check hote hain); aur control/moderation mushkil.`,
      `<strong>System design mein kab:</strong> 1-on-1 calls, badi files ka distribution (kuch companies apne servers pe software updates P2P style se baant-ti hain), ya jab central server ka kharcha/single point hataana zaroori ho. Group calls mein aksar beech mein ek media server (SFU) aa jaata hai, kyunki har peer 10 logon ko apni video alag alag nahi bhej sakta.`,
    ]},

    { type: 'p', html: `P2P kitna fark daalta hai? Ek mashhoor formula (Kurose aur Ross ki networking textbook se) ek file ko N logon tak pahunchane ka kam se kam time deta hai. <strong>Client-server:</strong> server ko N copies upload karni hain, to time ≈ N × F / (server upload). <strong>P2P:</strong> har peer bhi upload karta hai, to time ≈ N × F / (server upload + sab peers ka upload jod). <strong>Worked example:</strong> 1 GB ka game update (8 gigabit), 10,000 users, server upload 10 Gbps, har user ka upload 10 Mbps aur download 100 Mbps. Client-server: 10,000 × 8 / 10 = 8,000 s ≈ <strong>2.2 ghante</strong>. P2P: 80,000 / (10 + 100) ≈ 727 s ≈ <strong>12 minute</strong>. Sliders se dekho:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2"><div><label>Users (N): <strong class="pp-nv"></strong></label><input class="pp-n" type="range" min="0" max="5" step="1" value="3"></div>
        <div><label>File size: <strong class="pp-fv"></strong></label><input class="pp-f" type="range" min="1" max="20" step="1" value="1"></div></div>
        <div class="row2" style="margin-top:8px"><div><label>Server upload: <strong class="pp-sv"></strong></label><input class="pp-s" type="range" min="1" max="100" step="1" value="10"></div>
        <div><label>Har user ka upload: <strong class="pp-uv"></strong></label><input class="pp-u" type="range" min="0" max="50" step="1" value="10"></div></div>
        <div class="stats"><div class="stat"><span>Client-server</span><strong class="pp-cs"></strong></div><div class="stat"><span>P2P</span><strong class="pp-p"></strong></div><div class="stat"><span>P2P kitna tez</span><strong class="pp-x"></strong></div></div>
        <div class="calc-note pp-note"></div>`;
      const NS = [10, 100, 1000, 10000, 100000, 1000000], D = 100, q = c => el.querySelector(c);
      const fmt = s => s < 120 ? s.toFixed(0) + ' s' : s < 7200 ? (s / 60).toFixed(0) + ' min' : (s / 3600).toFixed(1) + ' ghante';
      const upd = () => {
        const N = NS[+q('.pp-n').value], Fgb = +q('.pp-f').value, F = Fgb * 8, us = +q('.pp-s').value, u = +q('.pp-u').value / 1000, d = D / 1000;
        const cs = Math.max(N * F / us, F / d), p2p = Math.max(F / us, F / d, N * F / (us + N * u));
        q('.pp-nv').textContent = N.toLocaleString('en-IN'); q('.pp-fv').textContent = Fgb + ' GB'; q('.pp-sv').textContent = us + ' Gbps'; q('.pp-uv').textContent = (u * 1000) + ' Mbps';
        q('.pp-cs').textContent = fmt(cs); q('.pp-p').textContent = fmt(p2p); q('.pp-x').textContent = (cs / p2p).toFixed(1) + '×';
        q('.pp-note').textContent = u === 0 ? 'Peers kuch upload nahi karte: P2P bhi client-server jaisa. P2P ki taakat peers ke upload mein hai.'
          : 'Client-server mein users badhne pe time seedha badhta hai. P2P mein har naya user capacity bhi laata hai, to time ek hadd pe ruk jaata hai (yahan download speed ' + D + ' Mbps bhi ek hadd hai).';
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},

    { type: 'h2', text: 'Hexagonal architecture (ports and adapters), awareness' },
    { type: 'p', html: `Ye baaki styles se alag level ka idea hai: system ke <em>boxes</em> ke baare mein nahi, balki <strong>ek service ke andar code kaise organise ho</strong> uske baare mein. Problem: xyz.com ki Payments service ka business logic ("tip 1 se 10,000 ke beech ho, creator verified ho") seedha Postgres queries aur HTTP framework ke code mein ghula hua hai. Test karne ke liye asli DB chahiye; DB badalna ho to logic bhi chhedna padta hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Hexagonal architecture (ports and adapters)', html: `<strong>Ye kya hai:</strong> Alistair Cockburn (2005) ka idea. Business logic beech mein rakho. Bahar ki duniya se sirf <strong>ports</strong> ke zariye baat karo. Port = ek interface, yaani ek "socket" jiska shape fix hai, jaise <code>WalletRepository</code> ("wallet save/load karo") ya <code>PaymentGateway</code>. Har technology ek <strong>adapter</strong> hai jo us socket mein fit hota hai: Postgres adapter, test ke liye in-memory adapter, HTTP adapter, Kafka adapter.<br><strong>Kyun chahiye:</strong> logic ko pata hi nahi ki peeche Postgres hai ya fake. Test bina DB ke milliseconds mein, aur DB badalna ho to sirf adapter badlo.<br><strong>Iske bina:</strong> business rules SQL aur HTTP code mein ghule hue; har test ke liye asli DB, har technology change pe logic bhi chhedna.<br>Hexagon shape ka koi khaas matlab nahi; bas "kai sides se plug karo" dikhane ke liye.` },
    { type: 'ascii', text: `
   HTTP API ─┐                         ┌─ Postgres adapter
   (adapter) │    ┌───────────────┐    │
 Kafka event ┼──► │  Business     │ ◄──┼─ In-memory fake (tests)
   (adapter) │    │  logic (core) │    │
  Batch/CLI ─┘    │  ports:       │    └─ Stripe / bank adapter
                  │  WalletRepo   │
                  │  PaymentGw    │
                  └───────────────┘
   driving side (jo core ko chalate)    driven side (jinhe core chalata)`, caption: 'Dependencies andar ki taraf: core kisi framework ya DB ko import nahi karta.' },
    { type: 'p', html: `<strong>Worked example:</strong> rule hai "tip ₹1 se ₹10,000 ke beech ho, aur creator verified ho". Ye rule core mein ek baar likha hai. HTTP se request aaye, Kafka se event aaye, ya test chal raha ho: same core function. Peeche Postgres ho ya in-memory fake: core ki ek line nahi badalti. Neeche dono taraf ke adapters badal ke dekho:` },
    { type: 'custom', render(el) {
      const DRV = { http: 'HTTP adapter: POST /tips', kafka: 'Kafka adapter: TipRequested event', test: 'Unit test: tipTest()' };
      const DRN = { pg: ['Postgres adapter', 4], mem: ['In-memory fake', 0.01], mongo: ['MongoDB adapter', 5] };
      let drv = 'http', drn = 'pg';
      el.innerHTML = `<div style="font:600 13px var(--f-display);color:var(--ink-2)">Driving side (core ko kaun chalata hai)</div><div class="chips hx-a" role="group" aria-label="Driving adapter">${Object.keys(DRV).map(k => `<button type="button" class="chip" data-d="${k}">${k === 'http' ? 'HTTP' : k === 'kafka' ? 'Kafka' : 'Test'}</button>`).join('')}</div>
        <div style="font:600 13px var(--f-display);color:var(--ink-2);margin-top:8px">Driven side (core kisko chalata hai)</div><div class="chips hx-b" role="group" aria-label="Driven adapter">${Object.keys(DRN).map(k => `<button type="button" class="chip" data-n="${k}">${DRN[k][0]}</button>`).join('')}</div>
        <div style="margin-top:8px"><label>Tip amount (₹): <strong class="hx-v"></strong></label><input class="hx-amt" type="range" min="0" max="12000" step="500" value="500"></div>
        <div class="ascii hx-trace" style="font-size:12.5px;white-space:pre-wrap;margin-top:8px"></div>
        <div class="stats"><div class="stat"><span>Core ki badli lines</span><strong>0</strong></div><div class="stat"><span>Storage time (lagbhag)</span><strong class="hx-t"></strong></div><div class="stat"><span>Result</span><strong class="hx-r"></strong></div></div>`;
      const q = c => el.querySelector(c);
      const draw = () => {
        const amt = +q('.hx-amt').value, ok = amt >= 1 && amt <= 10000;
        el.querySelectorAll('.hx-a .chip').forEach(c => c.classList.toggle('on', c.dataset.d === drv));
        el.querySelectorAll('.hx-b .chip').forEach(c => c.classList.toggle('on', c.dataset.n === drn));
        q('.hx-v').textContent = amt;
        q('.hx-trace').textContent = '1. ' + DRV[drv] + '\n2. core.sendTip(riya, ' + amt + ')   <- same code har baar\n   rule: 1 <= amount <= 10000 && creator.verified\n3. ' + (ok ? 'port WalletRepository.save() -> ' + DRN[drn][0] : 'rule toota: save tak pahuncha hi nahi');
        q('.hx-t').textContent = ok ? DRN[drn][1] + ' ms' : '-';
        q('.hx-r').textContent = ok ? 'tip saved ✓' : 'rejected ✗';
      };
      el.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.chip'); if (!b) return; if (b.dataset.d) drv = b.dataset.d; if (b.dataset.n) drn = b.dataset.n; draw(); });
      q('.hx-amt').addEventListener('input', draw); draw();
    }},
    { type: 'p', html: `Interview mein bas itna kaafi hai: "Har service ke andar main domain logic ko infrastructure se ports/adapters se alag rakhenge, taaki logic bina DB ke test ho sake aur DB/queue badalna aasaan ho." Zyaada layers chhoti service mein bojh ban jaati hain.` },

    { type: 'h2', text: 'Saare styles ek nazar mein' },
    { type: 'table', head: ['Style', 'Ek line mein', 'Kab', 'Kab nahi'], rows: [
      ['Monolith', 'Ek deploy, ek process, function calls', 'Naya product, chhoti team', 'Kai teams ek doosre ko rok rahi hon'],
      ['Modular monolith', 'Ek deploy, andar sakht module boundaries', 'Default jab tak dard na ho; 1-5 teams', 'Hisson ko alag scale/deploy karna zaroori ho'],
      ['Microservices', 'Alag deploy, apna DB, network calls', 'Bahut teams; hisse bahut alag scale hote hain', 'Chhoti team, domain abhi samajh nahi aaya, ops kamzor'],
      ['Event-driven', 'Services "ye hua" announce karti hain', 'Ek event pe kai reactions, async kaam', 'User ko turant jawab chahiye'],
      ['CQRS', 'Alag write aur read models', 'Reads bahut alag/bhaari (dashboards, search)', 'Simple CRUD'],
      ['Event sourcing', 'State = events ka replay', 'Audit/history zaroori: ledger, wallet, orders', 'Simple data, team naye ho'],
      ['Serverless', 'Function upload, cloud chalaye', 'Spiky/chhote event-driven kaam', 'Steady bhaari load, lambe/low-latency kaam'],
      ['P2P', 'Peers aapas mein seedha', '1-on-1 calls, file distribution', 'Central control/consistency zaroori'],
      ['Hexagonal', 'Logic ko DB/framework se ports se alag', 'Kisi bhi service ke andar', 'Chhoti script mein over-engineering'],
    ]},

    { type: 'h2', text: 'Recommender: tumhare case mein kya?' },
    { type: 'p', html: `Sliders apne situation ke hisaab se set karo. Ye widget roadmap ke Decide rule ko follow karta hai aur har suggestion ki wajah batata hai. Asli duniya mein ye ek starting point hai, final faisla nahi.` },
    { type: 'custom', render(el) {
      const DEVS = [3, 8, 15, 30, 60, 120, 300];
      const LV = ['kam', 'medium', 'zyada'];
      el.innerHTML = `<div class="row2">
          <div><label>Developers: <strong class="as-rd"></strong></label><input class="as-r-dev" type="range" min="0" max="6" step="1" value="1"></div>
          <div><label>Hisson ki scaling mein farq: <strong class="as-rs"></strong></label><input class="as-r-sc" type="range" min="0" max="2" step="1" value="0"></div>
        </div>
        <div class="row2" style="margin-top:8px">
          <div><label>Domain kitna samajh aaya (boundaries clear?): <strong class="as-rc"></strong></label><input class="as-r-cl" type="range" min="0" max="2" step="1" value="0"></div>
          <div><label>Ops maturity (CI/CD, monitoring, tracing): <strong class="as-ro"></strong></label><input class="as-r-op" type="range" min="0" max="2" step="1" value="0"></div>
        </div>
        <label style="display:flex;gap:8px;align-items:center;margin-top:8px;font-size:14px;color:var(--ink-2)"><input class="as-r-sp" type="checkbox"> Kuch side-jobs ka traffic bahut spiky hai (thumbnails, webhooks)</label>
        <div class="as-r-out" style="margin-top:12px;border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:var(--r-sm);background:var(--surface);padding:12px 14px">
          <div class="as-r-rec" style="font:600 17px var(--f-display);color:var(--ink)"></div>
          <ul class="as-r-why" style="margin:8px 0 0;padding-left:20px;color:var(--ink-2);font-size:14px;line-height:1.6"></ul>
        </div>`;
      const $ = c => el.querySelector(c);
      const recommend = (devs, sc, cl, op, spiky) => {
        const teams = Math.ceil(devs / 8), why = [];
        let rec;
        why.push(`~${devs} developers ≈ ${teams} team${teams > 1 ? 's' : ''} (8 log/team maan ke).`);
        if (devs < 15) {
          rec = 'Monolith (andar se modular rakho)';
          why.push('Chhoti team: ek deploy, ek DB, function calls sabse tez raasta hai. Microservices ka ops bill abhi bhaari padega.');
          if (sc === 2) { rec += ' + bhaari hisse ke liye alag worker'; why.push('Ek hissa bahut alag scale hota hai: sirf use (jaise transcoding) alag worker/service banao, baaki monolith.'); }
        } else if (devs < 60) {
          rec = 'Modular monolith';
          why.push('Kuch teams hain: module boundaries + ownership se kaafi aazaadi milti hai, bina network ke bill ke.');
          if (sc >= 1 && op >= 1) { rec += ' + 1-2 services nikaalo'; why.push('Jo hissa alag scale ya alag deploy maangta hai, sirf wahi bahar nikaalo.'); }
        } else if (cl === 0) {
          rec = 'Modular monolith (abhi mat todo)';
          why.push('Teams bahut hain, lekin domain boundaries abhi saaf nahi. Galat jagah tode to har feature 5 services mein change maangega: distributed monolith. Pehle modules mein boundaries pakki karo.');
        } else if (op === 0) {
          rec = 'Modular monolith, saath mein ops pe kaam';
          why.push('Microservices bina CI/CD, monitoring aur tracing ke andhere mein gaadi chalana hai. Pehle platform banao, phir todo.');
        } else {
          rec = 'Microservices (team ke hisaab se services)';
          why.push('Bahut teams jinhe independent deploy chahiye, boundaries clear, aur ops taiyaar: yahi Decide rule ka microservices wala case hai.');
          why.push("Conway's law: service boundaries team boundaries ke saath milao. Async kaam ke liye events, chain chhoti rakho.");
        }
        if (spiky) why.push('Spiky side-jobs ke liye serverless functions achha fit hain (scale to zero, pay per use), main app chahe jo ho.');
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
    { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>Chhoti team, naya product: modular monolith.</strong> <strong>Bahut saari teams jinhe independently deploy karna hai, ya hisse jo bahut alag tarah scale hote hain (video transcoding vs user profiles): microservices.</strong> Beech mein: modular monolith, aur sirf wo hissa bahar nikaalo jo sach mein alag maangta hai. Kai services ko ek event pe react karna ho to event-driven; bhaari reads alag ho to CQRS; history/audit hi product ho to event sourcing; spiky chhote kaam serverless pe.` },

    { type: 'diagram', title: 'xyz.com ki shape: poori picture', height: 600,
      groups: [
        { label: 'Users', x: 20, y: 8, w: 680, h: 100 },
        { label: 'Services', x: 20, y: 240, w: 680, h: 100 },
        { label: 'Async + data', x: 20, y: 360, w: 680, h: 225 },
      ],
      nodes: [
        { id: 'riya', label: 'Riya (app)', sub: 'creator', x: 120, y: 60, w: 140, kind: 'client', info: 'Ye kya hai: xyz.com ki creator, phone app pe. Feed dekhti hai, video upload karti hai, tips paati hai, aur fans se video call karti hai.' },
        { id: 'arjun', label: 'Arjun (app)', sub: 'fan', x: 600, y: 60, w: 140, kind: 'client', info: 'Ye kya hai: ek fan. Riya se video call pe audio/video seedha uske phone se aata jaata hai (P2P, WebRTC), xyz.com ke servers ke beech mein aaye bina.' },
        { id: 'gw', label: 'API gateway', sub: 'auth, routing', x: 360, y: 170, w: 150, kind: 'edge', info: 'Ye kya hai: saari requests ka ek darwaza. Login check, rate limit, aur request ko sahi jagah bhejna: monolith, recs service, payments service ya dashboard.' },
        { id: 'mono', label: 'Modular monolith', sub: 'users, feed, comments', x: 170, y: 290, w: 180, kind: 'server', info: 'Ye kya hai: xyz.com ka main app. Ek deploy, andar saaf modules (Users, Feed, Comments, Upload) jinki boundaries CI check karta hai. Zyaadatar features yahin hain, kyunki ye sabse simple aur sasta hai.' },
        { id: 'recs', label: 'Recs service', sub: 'GPU, alag scale', x: 400, y: 290, w: 130, kind: 'server', info: 'Ye kya hai: recommendations ki alag microservice. Isliye bahar nikaali kyunki GPU machines chahiye, din mein kai deploy hote hain, aur ye baaki app se bahut alag scale hoti hai.' },
        { id: 'pay', label: 'Payments svc', sub: 'tips, hexagonal', x: 590, y: 290, w: 150, kind: 'server', info: 'Ye kya hai: tips aur payouts ki alag service (sakht security audit). Andar hexagonal: business rules core mein, Postgres/bank sirf adapters.' },
        { id: 'pg', label: 'Postgres', sub: 'monolith ka DB', x: 130, y: 410, w: 140, kind: 'data', info: 'Ye kya hai: monolith ka database. Har module ki apni tables; doosra module sirf public interface se data maangta hai.' },
        { id: 'kafka', label: 'Kafka', sub: 'events', x: 360, y: 410, w: 150, kind: 'queue', info: 'Ye kya hai: event broker. "VideoUploaded", "TipReceived" jaise facts yahan aate hain, aur jisko parwah hai wo sunta hai. Producer ko consumers ka pata nahi (event-driven).' },
        { id: 'elog', label: 'Wallet event log', sub: 'append-only', x: 590, y: 410, w: 150, kind: 'data', info: 'Ye kya hai: payments ki event sourcing. Har tip, refund, withdrawal ek event; balance in events ka replay. Poori history, audit, aur naye reports purane data pe.' },
        { id: 'thumb', label: 'Thumbnail fn', sub: 'serverless', x: 130, y: 530, w: 140, kind: 'server', info: 'Ye kya hai: serverless function. VideoUploaded pe chalta hai, spike pe hazaaron copies, raat ko zero. Paisa sirf chalne ka.' },
        { id: 'dash', label: 'Dashboard', sub: 'CQRS read model', x: 360, y: 530, w: 150, kind: 'cache', info: 'Ye kya hai: creator dashboard ka read model (CQRS). Events se ready-made numbers banta hai, taaki dashboard query main DB ko na pees de. Kuch second pichhe chal sakta hai.' },
        { id: 'notif', label: 'Notifications', sub: 'consumer', x: 590, y: 530, w: 150, kind: 'server', info: 'Ye kya hai: followers ko push notification bhejne wala consumer. Down ho jaaye to upload pe koi asar nahi; wapas aake catch up karta hai.' },
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
        { name: 'Feed (monolith)', text: 'Feed request gateway se modular monolith tak; andar modules function calls se baat karte hain, ek Postgres.', go: ['riya>gw>mono>pg'] },
        { name: 'Upload (events)', text: 'Upload ho gaya: monolith ne VideoUploaded event bheja. Thumbnail function aur notifications apne aap react karte hain.', go: ['riya>gw>mono>kafka', 'kafka>thumb', 'kafka>notif'] },
        { name: 'Tip (ES + CQRS)', text: 'Tip Payments service mein event ke roop mein likhi gayi (event sourcing). Event Kafka se dashboard read model tak; dashboard query read model se (CQRS).', go: ['riya>gw>pay>elog>kafka>dash', 'gw>dash'] },
        { name: 'Video call (P2P)', text: 'Call ka audio/video Riya aur Arjun ke beech seedha (WebRTC). Server sirf dono ko milwaata hai (signaling).', go: ['riya>arjun'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Monolith = ek deploy, function calls, ek DB. Naye product aur chhoti team ke liye sabse tez. Ganda code alag problem hai.</li>
      <li>Modular monolith = ek deploy, lekin andar sakht module boundaries (CI se check). Zyaadatar teams ka sahi default.</li>
      <li>Microservices = alag deploy, apna DB, network calls. Faayda: independent teams aur alag scaling. Keemat: latency, failures, distributed data, bhaari ops. Chain ki availability guna hoti hai.</li>
      <li>Conway's law: system teams ki shape le leta hai. Service boundaries = team boundaries.</li>
      <li>Event-driven: "ye ho gaya" announce karo; consumers apni speed se. Loose coupling, lekin eventual consistency.</li>
      <li>CQRS: alag write aur read models; read model thoda pichhe. Event sourcing: state = events ka replay; poori history.</li>
      <li>Serverless: function upload, cloud chalaye, pay per use; cold starts aur limits. P2P: har user server bhi; capacity users ke saath badhti hai.</li>
      <li>Hexagonal: core logic ports ke peeche; adapters badlo, logic nahi. Decide: chhoti team = modular monolith; bahut teams ya bahut alag scaling = microservices.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['Monolith: saadgi, tez function calls, ek ACID transaction, aasaan debugging', 'Modular monolith: ownership aur saaf boundaries bina network ke bill ke', 'Microservices: independent deploy, alag scaling, fault isolation (agar design kiya ho)', 'Event-driven: loose coupling, naye consumers bina producer change ke, spikes absorb', 'CQRS/event sourcing: tez read models, poori history, replay se naye features', 'Serverless: zero server management, scale to zero, pay per use'],
      costs: ['Monolith: ek bug sab gira sakta hai, ek deploy train, sab saath scale', 'Microservices: network failures, latency judna, distributed data, bhaari ops', 'Event-driven: eventual consistency, flow dikhna mushkil, duplicates/order ka dhyaan', 'CQRS/event sourcing: do models ka sync, event versioning, zyaada concepts', 'Serverless: cold starts, time/memory limits, steady load pe mehenga, vendor lock-in', 'Galat waqt pe galat style: sabse bada kharcha'] },

    { type: 'think', questions: [
      { q: 'xyz.com ke 6 developers ek naya "short videos" product bana rahe hain. Ek senior bolta hai "shuru se 12 microservices banao, baad mein todna mushkil hoga". Tum kya kahoge?', a: 'Modular monolith se shuru karo. Domain abhi badal raha hai, boundaries galat banengi, aur 6 log 12 pipelines/dashboards/on-call nahi sambhal sakte. Modules ke beech saaf interfaces aur alag tables rakho, taaki baad mein koi module (jaise transcoding) asaani se service ban sake. Bhaari async kaam ke liye ek queue + worker kaafi hai.' },
      { q: 'Feed request 6 services ki chain se guzarti hai, har ek 99.9% available. Product manager ko 99.9% chahiye. Kya karoge?', a: 'Chain ki availability ~0.999^6 ≈ 99.4% hai, target se kam. Upaay: (1) jo calls zaroori nahi unhe async banao ya hata do, (2) sequential ko parallel karo jahan ho sake, (3) non-critical hisson (recs, counts) ke liye timeout + fallback, taaki unka girna poori request na giraye, (4) critical services ko zyaada redundant banao, (5) cached/precomputed data.' },
      { q: 'xyz.com ka "export my data" function din mein sirf 5-10 baar chalta hai, aur user 2 second tak ruk sakta hai. Serverless sahi hai? Cold start ka kya?', a: 'Haan, achha fit: kam aur spiky traffic, server 24x7 chalana bekaar. Lagbhag har call cold hogi (environment thanda ho jaata hai), lekin cold start (~100 ms se 1 s) 2 second ke budget mein aa jaata hai. Provisioned concurrency ka paisa yahan bekaar. Agar user ko 100 ms mein jawab chahiye hota, tab socha jaata.' },
      { q: 'Riya ke wallet mein galat amount dikh raha hai. Normal CRUD design aur event-sourced design mein debugging kaise alag hogi?', a: 'CRUD mein sirf current balance hai; kab aur kaise galat hua, logs ke bharose dhoondhna padega. Event sourcing mein poora event log hai: kis event ke baad galti aayi wo replay karke pata chalega. Bug code mein tha to fix karke replay; data galat tha to ek correcting event (jaise refund/adjustment) likho, purana event edit nahi karte.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Monolith ki sabse sahi definition?', options: ['Purana, ganda code', 'Ek saath build aur deploy hone wala app, jiski har copy mein saare features hon', 'Ek server pe chalne wala app jo scale nahi ho sakta'], answer: 1, explain: 'Monolith deployment ka faisla hai. Uski kai identical copies load balancer ke peeche scale ho sakti hain; ganda code ek alag design problem hai.' },
      { q: 'Microservices ka sabse bada asli faayda kya hai?', options: ['Har cheez apne aap fast ho jaati hai', 'Bahut saari teams independently deploy kar sakti hain aur hisse alag scale ho sakte hain', 'Network calls function calls se tez hoti hain'], answer: 1, explain: 'Network calls slow aur unreliable hain. Faayda organisational (independent teams/deploys) aur alag scaling profiles ka hai.' },
      { q: '5 services ki chain, har ek 99.9% available. Poori chain lagbhag?', options: ['99.9%', '99.5%', '95%'], answer: 1, explain: '0.999^5 ≈ 0.995. Availability chain mein guna hoti hai, isliye har nayi synchronous dependency risk badhati hai.' },
      { q: 'Event sourcing mein naya "Top supporters" report purane data pe kaise banta hai?', options: ['Purane data ke liye nahi ban sakta', 'Naya projection likho aur saare purane events replay karo', 'Events ko edit karke naye fields daalo'], answer: 1, explain: 'Poori history saved hai, to naya read model shuru se replay karke ban jaata hai. Events kabhi edit nahi karte.' },
      { q: 'Prime Video ki monitoring service (2023) ke case se sahi sabak?', options: ['Serverless hamesha mehenga hai', 'Jo components aapas mein bahut data bhejte hain unhe network ke paar todne se cost aur limits ki problem ho sakti hai', 'Amazon ne saare microservices band kar diye'], answer: 1, explain: 'Ek service ka case tha. Frames S3 se aur Step Functions transitions ke zariye ghoom rahe the; ek process mein laane se data memory mein raha aur cost 90%+ giri.' },
      { q: 'CQRS mein tip bhejne ke turant baad dashboard pe purana total dikha. Kya hua?', options: ['Bug: write fail ho gaya', 'Read model abhi events se update nahi hua (lag); eventual consistency', 'Database corrupt ho gaya'], answer: 1, explain: 'Write model ne turant save kiya, lekin read model events aane ke baad update hota hai. Kuch second ka lag CQRS ki normal keemat hai.' },
      { q: 'Ek serverless function har 20 minute mein ek baar chalta hai. Zyaadatar requests kaisi hongi?', options: ['Warm, kyunki function chhota hai', 'Cold, kyunki beech mein environment hata diya jaata hai', 'Kabhi cold nahi hoti'], answer: 1, explain: 'Lambe idle gap ke baad environment reuse nahi hota, to har request ko naya environment banana padta hai: cold start.' },
      { q: 'Hexagonal architecture mein Postgres ko MongoDB se badalna hai. Kya badlega?', options: ['Business logic core', 'Sirf storage adapter (port wahi rehta hai)', 'HTTP API'], answer: 1, explain: 'Core sirf port (interface) jaanta hai. Naya adapter likho jo wahi port implement kare; core ki ek line nahi badalti.' },
      { q: 'Conway\'s law ke hisaab se microservices design mein kya dhyaan rakhein?', options: ['Har developer ki ek service', 'Service boundaries team boundaries se match karein', 'Har service alag language mein ho'], answer: 1, explain: 'System ki shape organisation ke communication jaisi ban jaati hai. Ek service = ek owning team, saaf interface.' },
    ]},

    { type: 'sources', note: 'Company posts apne waqt ki tasveer hain (Shopify 2019, Prime Video 2023); unke systems tab se badal chuke ho sakte hain. Cloud limits current AWS docs se liye gaye (2026).', items: [
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
