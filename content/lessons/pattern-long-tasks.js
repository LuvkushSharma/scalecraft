Lesson.register({
  id: 'pattern-long-tasks',
  title: 'Long-running tasks',
  minutes: 28,
  summary: `Kuch kaam minutes ya ghante lete hain: 2 saal ka analytics export, video convert karna, AI se captions banana. Inhe ek web request ke andar nahi chala sakte. Is lesson mein ek seedhi (ladder) chadhenge: kaam ko "job" bana ke line mein daalna, alag machines se karwana, user ko progress dikhana, aur machine mar jaaye ya kaam baar baar fail ho to kya karna.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Kuch button dabane ke baad kaam 10 minute chalta hai, jaise "mera poora data download karo".<br>Agar website utni der tak page ko loading pe rakhe, to beech mein connection toot jaata hai aur kaam bekaar.<br>Isliye website turant bolti hai: "kaam mil gaya, ye raha tumhara token number".<br>Kaam peeche alag machines karti hain, aur tum token number se kabhi bhi pooch sakte ho "kitna hua?".<br>Is lesson mein seekhenge ki ye kaise banta hai, aur machine beech mein mar jaaye to kaam kaise bachta hai.` },
    { type: 'h2', text: 'Is pattern ki seedhi (ladder)' },
    { type: 'p', html: `Pattern lessons mein hum ek <strong>seedhi</strong> chadhte hain. Har pehla rung (paydaan) sasta aur simple hai. Agla rung tabhi chadho jab pichla kam pad jaaye. Long-running tasks ki seedhi ye hai:` },
    { type: 'steps', items: [
      { t: 'Rung 1: 202 + job + queue + workers', d: 'Kaam request se bahar nikaalo. User ko turant "mil gaya" aur ek job_id. Kaam alag machines (workers) karein.' },
      { t: 'Rung 2: Job status table + progress', d: 'Har job ki ek row: QUEUED, RUNNING 40%, SUCCEEDED. User polling se (baar baar poochh ke) ya push se progress dekhe.' },
      { t: 'Rung 3: Retries, idempotency, DLQ', d: 'Kaam fail ho to thoda ruk ke dobara. Dobara chalne se nuksaan na ho. Jo kaam baar baar fail ho, use alag "kharab jobs" ki line mein daalo.' },
      { t: 'Rung 4: Heartbeats', d: 'Lambe jobs mein worker har kuch second bole "main zinda hoon". Chup ho gaya to job jaldi kisi aur ko do.' },
      { t: 'Rung 5: Checkpoints, cancel, timeouts', d: '2 ghante ka job 1:50 pe fail ho to shuru se nahi, bache hue hisse se. User cancel kar sake. Atka job khud ruk jaaye.' },
      { t: 'Rung 6: Scale aur fairness', d: 'Queue lambi ho to workers badhao. Ek user sab workers na kha jaaye. Chhote aur bade jobs alag line mein.' },
      { t: 'Rung 7: Workflow engine', d: 'Jab "job" kai steps, insaan ki approval ya din bhar ke intezaar wala ho jaaye, to Temporal / Step Functions jaisa tool.' },
    ]},
    { type: 'callout', tone: 'tip', title: 'Kab rukna hai (stop climbing)', html: `Har app ko poori seedhi nahi chahiye. 5 second ka kaam? Rung 1-3 kaafi. 2 minute ka export? Rung 1-4. Ghanton ka crawl ya AI agent? Rung 5-6 bhi. Rung 7 tabhi jab steps aur intezaar bahut ho jaayein. Har rung ke section ke end mein "kab ruko" likha hai.` },
    { type: 'h2', text: 'Problem: "Export" button aur 60 second ki deewar' },
    { type: 'p', html: `xyz.com ke creators ne maanga: "mera 2 saal ka analytics CSV mein do". Ek bade creator ke liye ye crores rows scan karna, file banana, upload karna hai: 5-10 minute. Pehla version seedha tha: <code>GET /export</code> aayi, server ne query chalayi, file banayi, response mein bhej di.` },
    { type: 'list', items: [
      '<strong>Timeout ki deewar:</strong> user aur server ke beech load balancer, API gateway, proxy jaisi machines hoti hain. Ye aksar 30-60 second ke baad connection kaat deti hain (AWS ALB ka default idle timeout 60 second hai). Server abhi bhi kaam kar raha hai, lekin user ko <code>504 Gateway Timeout</code> mil gaya. (504 = "beech wali machine ne jawab ka wait kiya, nahi aaya, to haar maan li".)',
      '<strong>User ne refresh kiya:</strong> naya request, naya export. Ab do servers ek hi bhaari kaam kar rahe hain, aur DB pe double load.',
      '<strong>Deploy hua:</strong> server restart, 8 minute ka kaam gayab. Kisi ko pata bhi nahi chala.',
      '<strong>Server ki capacity:</strong> web server ek waqt pe gin ke requests sambhalta hai (maan lo 200 "threads", har thread ek request). Har export ek thread ko minutes tak pakde rakhta hai. 200 creators ek saath export karein to normal page kholne walon ke liye ek bhi thread nahi bacha.',
    ]},
    { type: 'p', html: `Asli galti: <strong>lambe kaam ko request-response ke andar</strong> rakhna. HTTP request ek chhoti baat-cheet ke liye bana hai ("do, lo"). Lamba kaam alag jagah, alag machines pe, apni speed se hona chahiye, aur user ko bas uska <em>status</em> pata hona chahiye.` },
    { type: 'callout', tone: 'term', title: 'Job (background job)', html: `<strong>Ye kya hai:</strong> ek kaam ka record jo baad mein, kisi aur machine pe chalega. Usme likha hota hai kya karna hai (input), kiska hai (user), aur abhi kis haalat mein hai (status). Jaise ek token: "Token 123: Riya ka 2 saal ka export, abhi line mein".<br><strong>Kyun chahiye:</strong> kaam ko request se alag karna hai. Request 50 ms mein khatam, job apni speed se chale.<br><strong>Iske bina:</strong> kaam request ke andar hi chalega aur 60 second ki deewar se takrayega.` },
    { type: 'callout', tone: 'term', title: '202 Accepted', html: `<strong>Ye kya hai:</strong> ek HTTP status code. Matlab: "request mil gayi aur maan li, lekin kaam abhi hua nahi." Saath mein <code>job_id</code> aur status dekhne ka pata (URL) lautate hain, aksar <code>Location: /jobs/123</code> header mein.<br><strong>Kyun chahiye:</strong> client ko saaf pata chale ki result abhi nahi hai, baad mein poochhna hai.<br><strong>Iske bina:</strong> 200 OK bhejte, jiska matlab "kaam ho gaya". Wo jhooth hota.` },
    { type: 'callout', tone: 'term', title: 'Worker', html: `<strong>Ye kya hai:</strong> ek alag program (aksar alag machines pe) jiska bas ek kaam hai: line se job uthao, karo, agla uthao. Web server user se baat karta hai; worker sirf peeche kaam karta hai.<br><strong>Kyun chahiye:</strong> bhaari kaam web servers se door ho jaata hai. Workers ki ginti alag se badha ghata sakte ho.<br><strong>Iske bina:</strong> export jaise kaam web server ke threads kha jaate aur homepage slow ho jaata.` },
    { type: 'callout', tone: 'term', title: 'Job queue', html: `<strong>Ye kya hai:</strong> jobs ki line (<a href="#/queues">message queue</a> lesson yaad hai?). API job ka chhota note daalta hai, free worker use nikaalta hai. Examples: Amazon SQS, RabbitMQ, ya Redis pe chalne wale Sidekiq/Celery.<br><strong>Kyun chahiye:</strong> API aur workers ek doosre ka wait nahi karte. Workers busy hon to jobs line mein surakshit intezaar karti hain.<br><strong>Iske bina:</strong> API ko kisi free worker ko dhoondh ke seedha call karna padta. Sab busy? Kaam gaya.` },
    { type: 'callout', tone: 'term', title: 'Ack aur visibility timeout (yaad dilana)', html: `<strong>Ye kya hai:</strong> worker message leta hai to queue use <em>delete nahi</em> karti, bas doosron se chhupa deti hai. Kaam pura hone pe worker <strong>ack</strong> bhejta hai ("ho gaya, hata do"). Chhupe rehne ka time = <strong>visibility timeout</strong> (SQS default 30 second). Ack nahi aaya aur time khatam, to message phir line mein dikhne lagta hai.<br><strong>Kyun chahiye:</strong> worker mar jaaye to job khoti nahi, kisi aur ko mil jaati hai.<br><strong>Iske bina:</strong> job dete hi delete. Worker mara to job hamesha ke liye gayab.` },
    { type: 'callout', tone: 'term', title: 'Pre-signed URL', html: `<strong>Ye kya hai:</strong> object storage (S3 jaisa file store) ki ek file ka aisa link jisme ek chhota "permission ticket" juda hai, aur jo kuch der baad (jaise 15 minute) expire ho jaata hai.<br><strong>Kyun chahiye:</strong> badi CSV file hamare servers se nahi, seedha storage se download ho. Aur link sirf usi user ke paas, thodi der ke liye.<br><strong>Iske bina:</strong> ya to file public (koi bhi dekh le), ya 2 GB file hamare API servers se guzre.` },
    { type: 'h2', text: 'Rung 1 + 2: accept, queue, work, report' },
    { type: 'p', html: `Seedha pattern char shabdon mein: <strong>accept</strong> (job maan lo, 202 do), <strong>queue</strong> (line mein daalo), <strong>work</strong> (worker kare), <strong>report</strong> (status batao). Pehle purana aur naya tareeka saath saath dekho, phir flow mein khelo.` },
    { type: 'compare',
      left: { title: 'Pehle: sab ek request mein', ascii: `Creator ──GET /export──> Server
                         (8 min kaam...)
           <── 504 Timeout (60 s pe)
Server abhi bhi kaam kar raha,
result kisi ko nahi milega` },
      right: { title: 'Ab: job pattern', ascii: `Creator ──POST /exports──> API
   <── 202 { job_id: 123 }  (50 ms)
API: jobs table mein QUEUED + queue mein msg
Worker: msg uthaya → RUNNING → 40%...
Creator: GET /jobs/123 → 40%
Worker: file S3 mein → SUCCEEDED
Creator: download link` },
    },
    { type: 'flow', height: 340,
      nodes: [
        { id: 'c', label: 'Creator', sub: 'browser', x: 85, y: 85, w: 130, kind: 'client', info: 'Ye kya hai: creator ka browser. Export maangta hai, job_id leta hai, phir progress poochhta rehta hai. Tab band kar de to bhi kaam chalta rehta hai; wapas aake job_id se status dekh sakta hai.' },
        { id: 'api', label: 'Jobs API', sub: 'POST / GET /jobs', x: 290, y: 85, w: 150, kind: 'server', info: 'Ye kya hai: hamara web API, halka aur tez. Job banata hai (table mein row + queue mein message), 202 lautata hai, aur "kitna hua?" ka jawab table se deta hai. Khud koi bhaari kaam nahi karta, isliye kabhi atakta nahi.' },
        { id: 'db', label: 'Job status DB', sub: 'jobs table', x: 290, y: 265, w: 150, kind: 'data', info: 'Ye kya hai: ek normal database table, har job ki ek row: status, progress, attempts (kitni baar try hua), worker, heartbeat_at, result, error. Kyun: user ko jo dikhta hai wo yahin se aata hai. Queue sirf kaam pahunchane ke liye hai, status batane ke liye nahi.' },
        { id: 'q', label: 'Job queue', sub: 'SQS / RabbitMQ', x: 505, y: 85, w: 150, kind: 'queue', info: 'Ye kya hai: jobs ki line (SQS ya RabbitMQ). Message lene ke baad wo doosron se chhupa rehta hai (visibility timeout); ack na aaye to phir dikhne lagta hai. Baar baar fail hone wale messages DLQ (kharab jobs ki alag line) mein.' },
        { id: 'w', label: 'Worker', sub: 'export-worker', x: 505, y: 265, w: 150, kind: 'server', meter: true, load: 20, info: 'Ye kya hai: asli kaam karne wali machine: query, CSV banana, upload. Beech beech mein progress aur heartbeat ("main zinda hoon") likhta hai, aur cancel flag check karta hai. Workers ki ginti web servers se alag badhate ghatate hain.' },
        { id: 's3', label: 'Object storage', sub: 'S3: result file', x: 645, y: 175, w: 130, kind: 'data', info: 'Ye kya hai: badi files ka store (S3 jaisa). Result file yahan, naam = exports/123.csv (job id se, taaki retry wahi file overwrite kare, nayi na banaye). User ko pre-signed URL milta hai jo kuch der baad expire ho jaata hai.' },
      ],
      edges: [{ a: 'c', b: 'api' }, { a: 'api', b: 'db' }, { a: 'api', b: 'q' }, { a: 'q', b: 'w' }, { a: 'w', b: 'db' }, { a: 'w', b: 's3' }],
      scenarios: [
        { name: 'Happy path', steps: [
          { title: 'Submit: 202 turant', text: 'API jobs table mein row banata hai (QUEUED), queue mein message daalta hai, aur 50 ms mein 202 lautata hai.', go: ['c>api', 'api>db', 'api>q', 'res:api>c'], after: { db: { sub: 'job 123: QUEUED' } }, msg: 'POST /exports  →  202 Accepted\nLocation: /jobs/123   { "job_id": 123, "status": "QUEUED" }' },
          { title: 'Worker uthata hai', text: 'Free worker message leta hai. Status RUNNING, worker id aur heartbeat_at likha.', go: ['q>w', 'w>db'], after: { w: { load: 70, sub: 'job 123' }, db: { sub: 'job 123: RUNNING 0%' } } },
          { title: 'Progress', text: 'Har kuch second mein worker progress likhta hai. Creator ka page har 3 s mein poll karta hai (poll = baar baar poochhna "kitna hua?") aur progress bar badhta hai.', go: ['w>db', 'c>api', 'api>db', 'res:api>c'], after: { db: { sub: 'job 123: RUNNING 60%' } }, msg: 'GET /jobs/123  →  { "status": "RUNNING", "progress": 60 }' },
          { title: 'Result + done', text: 'File S3 mein, row mein SUCCEEDED + result key, phir queue ko ack. Agle poll pe creator ko download link (pre-signed URL).', go: ['w>s3', 'w>db', 'w>q'], after: { db: { state: 'ok', sub: 'job 123: SUCCEEDED' }, w: { load: 20, sub: 'idle' }, s3: { state: 'ok', sub: 'exports/123.csv' } }, msg: 'GET /jobs/123  →  { "status": "SUCCEEDED", "download_url": "https://...signed..." }' },
        ]},
        { name: 'Worker crash', intro: 'Job 60% pe tha, worker machine mar gayi. Yahan heartbeat kaam aata hai: worker har 10 s mein bolta hai "main zinda hoon". Ye awaaz band = shayad mar gaya.', steps: [
          { title: 'Crash', text: 'Worker gir gaya. Ack nahi hua, aur heartbeat aana band.', set: { w: { state: 'down', sub: 'CRASHED at 60%' }, db: { sub: 'job 123: RUNNING 60%' } }, focus: ['w'] },
          { title: 'Heartbeat miss', text: 'Worker har 10 s mein heartbeat (aur queue mein visibility extend) karta tha. 30 s se koi heartbeat nahi: visibility timeout khatam, message phir queue mein visible.', set: { q: { state: 'warn', sub: 'msg 123 visible' } }, focus: ['q'] },
          { title: 'Doosra worker, retry', text: 'Naya worker message uthata hai, attempts = 2. Agar job checkpoint rakhta tha (jaise "60% tak ke chunks S3 mein") to wahin se, warna shuru se. Output key same hai, isliye aadhi purani file overwrite ho jaati hai, duplicate nahi.', set: { w: { state: '', sub: 'worker-2, attempt 2' }, q: { state: '' } }, go: ['q>w', 'w>db'], after: { db: { sub: 'job 123: try 2' } } },
          { title: 'Poora', text: 'Kaam poora, SUCCEEDED. User ko bas thoda zyada time laga, koi error nahi dikha.', go: ['w>s3', 'w>db'], after: { db: { state: 'ok', sub: 'job 123: SUCCEEDED' }, s3: { state: 'ok', sub: 'exports/123.csv' } } },
        ]},
        { name: 'Poison → DLQ', intro: 'Ek creator ke data mein ek kharab row hai; export har baar wahin crash hota hai. Aise job ko "poison" (zeher) job kehte hain. DLQ (dead-letter queue) = aise jobs ki alag line, jahan engineer baad mein dekhta hai.', steps: [
          { title: 'Fail, retry with backoff', text: 'Attempt 1 fail. Turant retry nahi: thoda ruko (1 min, phir 2, phir 4). Transient problems (DB busy, network) aksar itne mein theek ho jaati hain.', go: ['q>w', 'bad:w>q'], after: { db: { state: 'warn', sub: 'job 456: RETRY 1/3' } } },
          { title: 'Teesri baar bhi fail', text: 'Max attempts (3) poore. Ab aur retry = workers ka time barbaad.', go: ['q>w', 'bad:w>q'], after: { db: { sub: 'job 456: RETRY 3/3' } } },
          { title: 'DLQ + FAILED', text: 'Message dead-letter queue mein, status FAILED with error, aur on-call ko alert. Creator ko saaf message: "Export fail hua, team dekh rahi hai." Fix ke baad DLQ se redrive.', set: { q: { state: 'warn', sub: 'msg 456 → DLQ' } }, go: ['w>db'], after: { db: { state: 'down', sub: 'job 456: FAILED' } }, msg: '{ "status": "FAILED", "error": "row 8,812,004: invalid UTF-8" }' },
        ]},
        { name: 'Cancel', intro: 'Creator ne galat date range chuni aur Cancel dabaya. Worker ko beech mein zabardasti nahi maarte; use ek flag (jhanda) dikhate hain.', steps: [
          { title: 'Cancel request', text: 'API sirf flag lagata hai: status CANCEL_REQUESTED. Chalte worker ko beech mein maarna khatarnaak hai (aadhi file, locks).', go: ['c>api', 'api>db', 'res:api>c'], after: { db: { state: 'warn', sub: 'job 789: CANCEL_REQ' } }, msg: 'POST /jobs/789/cancel  →  202' },
          { title: 'Worker checkpoint pe dekhta hai', text: 'Worker har chunk ke baad status padhta hai (ya heartbeat ke jawab mein flag milta hai). Flag dikha: partial file delete, status CANCELLED, ack.', go: ['w>db', 'w>s3', 'w>q'], after: { db: { state: '', sub: 'job 789: CANCELLED' }, w: { sub: 'idle' } } },
        ]},
      ],
    },
    { type: 'h2', text: 'Job status table: sach ka ek page' },
    { type: 'p', html: `Queue sirf kaam <em>pahunchata</em> hai; usse ye nahi pooch sakte "job 123 kitna hua?" Isliye har job ki ek row ek normal database table mein. Status sirf tay raaston pe badal sakta hai (QUEUED se RUNNING, RUNNING se SUCCEEDED...). Isko <a href="#/pattern-multistep">state machine</a> kehte hain: haalaton ki list, aur kaunsi haalat se kaunsi mein ja sakte ho.` },
    { type: 'callout', tone: 'term', title: 'Job status table', html: `<strong>Ye kya hai:</strong> database ki ek table jisme har job ki ek line: kiska hai, kis haalat mein hai, kitna % hua, kitni baar try hua, result kahan hai, error kya tha.<br><strong>Kyun chahiye:</strong> user ka "mera export kitna hua?" iska jawab yahin se. Support team bhi yahin dekhti hai ki kaunse jobs atke hain.<br><strong>Iske bina:</strong> queue se poochh nahi sakte (wo sirf line hai). User ko bas spinner dikhta, aur crash hue jobs ka kisi ko pata nahi chalta.` },
    { type: 'code', text: `CREATE TABLE jobs (
  id              BIGINT PRIMARY KEY,
  user_id         BIGINT,
  type            TEXT,          -- 'analytics_export', 'transcode', ...
  idempotency_key TEXT UNIQUE,   -- double click = same job
  status          TEXT,          -- QUEUED | RUNNING | SUCCEEDED | FAILED | CANCEL_REQUESTED | CANCELLED
  progress        INT,           -- 0..100
  attempts        INT,
  worker_id       TEXT,
  heartbeat_at    TIMESTAMP,     -- worker zinda hai?
  result_url      TEXT,
  error           TEXT,
  created_at, started_at, finished_at TIMESTAMP
);
-- QUEUED → RUNNING → SUCCEEDED
--            │  └──→ FAILED (attempts khatam → DLQ)
--            └─ CANCEL_REQUESTED → CANCELLED` },
    { type: 'list', items: [
      '<strong>Row aur message, dono chahiye:</strong> API do jagah likhta hai: table mein row, queue mein message. Row bani lekin message bhejne se pehle API crash = job hamesha QUEUED, koi worker kabhi nahi uthayega. Bachav 1: <a href="#/kafka">transactional outbox</a> (message bhi pehle usi database transaction mein ek "outbox" table mein likho; ek alag process wahan se queue mein bhejta hai). Bachav 2: ek <strong>sweeper</strong> (chhota cron program) jo har minute dekhe "5 minute se purane QUEUED jobs?" aur unhe phir queue mein daale.',
      '<strong>Postgres hi queue ban sakta hai:</strong> chhote systems mein alag broker ki jagah workers seedha <code>SELECT ... FROM jobs WHERE status = \'QUEUED\' ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED</code> chalate hain. SKIP LOCKED ki wajah se do workers ek hi job nahi uthate (<a href="#/pattern-contention">Contention lesson</a>). Rails ka Solid Queue (Postgres 9.5+ / MySQL 8+ pe) isi tareeke pe chalta hai; Go ka River aur Node ka pg-boss bhi Postgres-backed queues hain. Bahut zyada throughput pe dedicated queue behtar.',
      '<strong>Purane jobs:</strong> table hamesha badhti rahegi. 30-90 din baad finished rows archive/delete karo, aur result files pe S3 lifecycle rule (storage ka niyam jo 7 din baad files khud delete kar de).',
    ]},
    { type: 'callout', tone: 'tip', title: 'Kab ruko (Rung 1-2)', html: `Agar jobs kuch second ke hain, fail kam hote hain, aur din mein kuch hazaar hi hain, to yahin ruk sakte ho: Postgres table hi queue + status, aur page pe polling. Ek alag broker tab lagao jab jobs per second hazaaron mein ho jaayein ya alag teams ko alag queues chahiye.` },

    { type: 'h2', text: 'Progress kaise dikhayein: polling, SSE, webhook' },
    { type: 'p', html: `Tareekon ki poori kahani <a href="#/realtime">Polling, SSE, WebSockets, webhooks</a> lesson mein hai. Do bade tareeke yaad rakho: <strong>pull</strong> (browser baar baar poochhe) aur <strong>push</strong> (server khud bataye).` },
    { type: 'callout', tone: 'term', title: 'Polling aur SSE (yaad dilana)', html: `<strong>Ye kya hai:</strong> <strong>Polling</strong> = browser har kuch second mein <code>GET /jobs/123</code> bhejta hai: "kitna hua?". <strong>SSE</strong> (Server-Sent Events) = browser ek connection khula chhod deta hai, aur server us pe jab chahe naya update bhej deta hai (sirf server se browser ki taraf).<br><strong>Kyun chahiye:</strong> job alag machine pe chal raha hai; browser ko kisi tareeke se khabar pahunchni chahiye.<br><strong>Iske bina:</strong> user ko refresh daba daba ke dekhna padta.` },
    { type: 'table', head: ['Tareeka', 'Kaise', 'Kab'], rows: [
      ['Short polling', 'Browser har 2-5 s mein GET /jobs/123. Server Retry-After header se interval bata sakta hai; lambe jobs pe interval badhao (2 s → 10 s).', 'Default choice. Simple, cache/LB friendly, minutes lambe jobs ke liye bilkul theek.'],
      ['SSE', 'GET /jobs/123/events ek khula connection; worker ka progress (DB/Redis pub-sub ke through) seedha browser tak stream.', 'Live feel chahiye: AI agent ke steps, build logs, token-by-token output.'],
      ['Webhook', 'Job khatam hone pe hum client ke server ko POST karte hain.', 'Client ek doosra server hai (API customers), browser nahi.'],
      ['Email / push notification', 'Khatam hone pe "export ready" mail.', 'Bahut lamba kaam (10+ minute), user tab band kar dega.'],
    ]},
    { type: 'p', html: `<strong>Polling ka bill khud nikaalo.</strong> Kitne log ek saath kisi job ka wait kar rahe hain, browser kitne second mein poochhta hai, aur job kitna lamba hai. Polling har sawaal pe ek request hai. SSE mein request nahi, lekin har wait karne wala ek connection khula rakhta hai. (Maan ke chalo SSE pe har 5% pe ek update = har job ke 21 messages.)` },
    { type: 'custom', render(el) {
      const NS = [100, 1000, 10000, 100000];
      el.innerHTML = `<div class="row2">
          <div><label>Ek saath wait karne wale users: <strong class="ltp-vn"></strong></label><input class="ltp-n" type="range" min="0" max="3" step="1" value="2"></div>
          <div><label>Poll interval: <strong class="ltp-vi"></strong></label><input class="ltp-i" type="range" min="1" max="30" step="1" value="3"></div>
          <div><label>Job kitna lamba: <strong class="ltp-vd"></strong></label><input class="ltp-d" type="range" min="1" max="60" step="1" value="8"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Polling: requests / second</span><strong class="ltp-rps"></strong></div>
          <div class="stat"><span>Polling: requests per job</span><strong class="ltp-rpj"></strong></div>
          <div class="stat"><span>"Done" dikhne mein avg der</span><strong class="ltp-lag"></strong></div>
          <div class="stat"><span>SSE: khule connections</span><strong class="ltp-conn"></strong></div>
          <div class="stat"><span>SSE: messages / second</span><strong class="ltp-mps"></strong></div>
        </div>
        <div class="calc-note ltp-note"></div>`;
      const $ = c => el.querySelector(c);
      const f = x => x >= 100 ? Math.round(x).toLocaleString('en-IN') : (Math.round(x * 10) / 10).toString();
      const upd = () => {
        const N = NS[+$('.ltp-n').value], I = +$('.ltp-i').value, D = +$('.ltp-d').value;
        const rps = N / I, rpj = Math.ceil(D * 60 / I), mps = N * 21 / (D * 60);
        $('.ltp-vn').textContent = N.toLocaleString('en-IN'); $('.ltp-vi').textContent = I + ' s'; $('.ltp-vd').textContent = D + ' min';
        $('.ltp-rps').textContent = f(rps); $('.ltp-rpj').textContent = rpj; $('.ltp-lag').textContent = f(I / 2) + ' s';
        $('.ltp-conn').textContent = N.toLocaleString('en-IN'); $('.ltp-mps').textContent = f(mps);
        $('.ltp-note').textContent = `Polling: ${N.toLocaleString('en-IN')} users / ${I} s = ${f(rps)} requests har second, jinme se lagbhag sab ka jawab "abhi nahi hua" hai. Interval badhao to load ghatta hai, lekin "done" dikhne mein ausatan ${f(I / 2)} s ki der. SSE: requests nahi, lekin ${N.toLocaleString('en-IN')} connections hamesha khule.`;
      };
      el.querySelectorAll('input').forEach(i => i.oninput = upd); upd();
    }},
    { type: 'p', html: `Default (10,000 users, 3 s, 8 minute job) pe polling = 3,333 requests/second aur har job ke 160 requests. SSE pe sirf ~438 messages/second, lekin 10,000 khule connections. Isliye: chhote scale pe polling (sabse simple), interval job ke saath badhao (2 s se shuru, phir 10 s); bahut saare log ya live feel chahiye to SSE.` },
    { type: 'callout', tone: 'warn', title: 'Progress likhna bhi load hai', html: `Worker har row pe <code>UPDATE jobs SET progress = ...</code> karega to 1 crore rows = 1 crore DB writes. Progress har kuch second ya har 1-5% pe likho. Bahut saare jobs ho to live progress Redis mein aur sirf final status DB mein.` },

    { type: 'h2', text: 'Rung 3: retries with backoff, idempotency aur DLQ' },
    { type: 'p', html: `<strong>Naya problem:</strong> xyz.com pe din ke 20,000 exports. Inme se ~2% (400) beech mein fail hote hain: database 10 second ke liye busy tha, network ka jhatka, deploy ke time worker restart. Ye kaam dobara chalaane se ho jaate. Aur ~5 jobs har din aise hain jo kabhi nahi chalenge (kharab data). Dono ko alag tareeke se sambhalna hai.` },
    { type: 'callout', tone: 'term', title: 'At-least-once delivery', html: `<strong>Ye kya hai:</strong> queue ka vaada: "har job kam se kam ek baar worker tak pahunchegi, kabhi kabhi do baar bhi". Do baar kyun? Worker ne kaam kar diya lekin ack bhejne se pehle crash, to queue sochti hai kaam hua hi nahi.<br><strong>Kyun chahiye:</strong> job kabhi khoni nahi chahiye. Duplicate sambhalna aasaan hai, khoya kaam dhoondhna mushkil.<br><strong>Iske bina:</strong> "at-most-once" (zyada se zyada ek baar) mein crash pe job gayab.` },
    { type: 'callout', tone: 'term', title: 'Exponential backoff + jitter', html: `<strong>Ye kya hai:</strong> fail hone pe turant retry nahi. Pehli baar 1 minute ruko, phir 2, phir 4 (har baar double = exponential). Upar se thoda random (jitter), jaise 4 minute ki jagah 3:40 ya 4:20.<br><strong>Kyun chahiye:</strong> database busy tha to turant retry use aur dabayega. Thoda rukne se wo sambhal jaata hai. Jitter se 10,000 fail jobs ek hi second pe wapas nahi aate.<br><strong>Iske bina:</strong> retries ka toofan, jo bimaar database ko gira deta hai (<a href="#/resilience">Retries aur jitter</a> lesson).` },
    { type: 'callout', tone: 'term', title: 'Idempotent job', html: `<strong>Ye kya hai:</strong> aisa job jise do baar chalao to bhi nateeja ek baar jaisa. Jaise "file exports/123.csv likho" do baar chale to bhi ek hi file. Lekin "user ko email bhejo" do baar = do email.<br><strong>Kyun chahiye:</strong> at-least-once mein duplicate aayega hi. Job khud surakshit ho.<br><strong>Iske bina:</strong> retry pe double email, double charge, do files.` },
    { type: 'callout', tone: 'term', title: 'Dead-letter queue (DLQ)', html: `<strong>Ye kya hai:</strong> "kharab jobs" ki alag queue. Jo job tay attempts (jaise 3) ke baad bhi fail ho, wo yahan chali jaati hai, aur alarm bajta hai.<br><strong>Kyun chahiye:</strong> poison job (jo hamesha fail hoga) workers ka time na khaaye, aur engineer use aaraam se dekh sake. Fix ke baad <strong>redrive</strong> (DLQ se wapas main queue).<br><strong>Iske bina:</strong> poison job hamesha ghoomta rahega, ya chupchaap gayab ho jaayega.` },
    { type: 'list', items: [
      '<strong>Transient vs permanent error:</strong> transient = thodi der ki problem (DB busy, network timeout, 503): retry karo. Permanent = kabhi theek nahi hogi (invalid input, "user deleted", corrupt file): retry bekaar, seedha FAILED with saaf error.',
      '<strong>Backoff kahan se:</strong> SQS mein fail pe <code>ChangeMessageVisibility</code> se message ko der se dikhao; Celery/Sidekiq mein built-in retry options hain.',
      '<strong>Max attempts → DLQ:</strong> 3-5 attempts ke baad <a href="#/queues">dead-letter queue</a>, status FAILED, alert. SQS mein ye setting <code>maxReceiveCount</code> hai.',
      '<strong>Job idempotent kaise banayein:</strong> output ka naam job id se (<code>exports/123.csv</code>), to retry wahi file overwrite karta hai. Email/payment jaise side effects se pehle status check ("already SUCCEEDED? skip") ya idempotency key. Submit pe bhi: client ek <code>Idempotency-Key</code> bheje, taaki double click ek hi job banaye (<a href="#/pagination-idempotency">Idempotency lesson</a>).',
    ]},
    { type: 'callout', tone: 'tip', title: 'Kab ruko (Rung 3)', html: `Ye rung lagbhag har system ko chahiye: retry + idempotency + DLQ sasta hai aur bahut bachata hai. Agar jobs 1 minute se chhote hain, to bas visibility timeout ko job ke max time se thoda bada rakh do aur yahin ruk jao. Heartbeat (agla rung) tab chahiye jab jobs lambe aur unpredictable hon.` },
    { type: 'h2', text: 'Rung 4: heartbeats (worker zinda hai ya nahi?)' },
    { type: 'p', html: `<strong>Naya problem:</strong> ab xyz.com ke kuch jobs 2 minute ke hain aur kuch 2 ghante ke (bade creators). Worker ne job uthaya. System ko kaise pata chale ki wo kaam kar raha hai ya mar gaya? Do tareeke, aur pehle wale mein ek jaal hai:` },
    { type: 'callout', tone: 'term', title: 'Heartbeat', html: `<strong>Ye kya hai:</strong> worker ka chhota sa "main zinda hoon" signal, har kuch second mein (jaise har 10 s). Jaise video call mein hara dot: dikh raha hai to banda online hai.<br><strong>Kyun chahiye:</strong> job ki lambai pata nahi hoti. Heartbeat se mara hua worker 30 second mein pakda jaata hai, chahe job 2 ghante ka ho.<br><strong>Iske bina:</strong> ya to bahut der se pata chalta ki worker mar gaya, ya zinda worker ka job doosre ko de dete.` },
    { type: 'list', items: [
      '<strong>Sirf fixed visibility timeout:</strong> SQS mein message lene ke baad wo ek fixed time (default 30 s, max 12 ghante) tak chhupa rehta hai. Ack nahi aaya to phir visible. Agar timeout bada rakho (2 ghante), to mara hua worker 2 ghante baad pakda jaayega. Chhota rakho (5 min) aur job 10 minute ka hai, to job <strong>zinda worker ke chalte hue</strong> doosre worker ko mil jaayega: double kaam.',
      '<strong>Heartbeat:</strong> worker har kuch second mein bolta hai "main zinda hoon, aur kaam chal raha hai": SQS mein <code>ChangeMessageVisibility</code> se timeout aage badhao, ya DB mein <code>heartbeat_at = now()</code>. Ek <strong>reaper</strong> (chhota cron program jo "mare hue" jobs dhoondhta hai) un RUNNING jobs ko jinka heartbeat 30 s se purana hai, wapas queue mein daal deta hai. Ab chhota timeout (jaldi crash detection) aur lambe jobs, dono ek saath. Temporal mein yahi activity ka <em>Heartbeat timeout</em> hai.',
      '<strong>Zombie worker:</strong> worker mara nahi tha, bas 2 minute atka (GC pause = program ka memory saaf karne ke liye ruk jaana, ya network toota). Tab tak job doosre ko mil gaya. Purana worker jaag ke result likhega! Bachav: har attempt ka number (attempt = 2) DB update mein check karo, <code>UPDATE jobs ... WHERE id = 123 AND attempts = 1</code> 0 rows dega. Ye <a href="#/coordination">fencing token</a> wala hi idea hai.',
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "job uthate hi ack kar do, simple hai"', html: `Kai log message lete hi ack/delete kar dete hain taaki "duplicate na aaye". Ab worker crash hua to job <strong>hamesha ke liye gayab</strong>: queue mein nahi, kisi ke paas nahi, user ka status RUNNING pe atka. Sahi: <strong>kaam khatam hone ke baad ack</strong> (Celery mein <code>acks_late</code>), aur duplicate ka ilaaj idempotency se. At-least-once + idempotent > at-most-once + kho gaye jobs.` },

    { type: 'callout', tone: 'tip', title: 'Kab ruko (Rung 4)', html: `Jobs 1-2 minute se lambe ya unpredictable hain to heartbeat lagao. Agar sab jobs chhote aur ek jaise hain, to bada fixed timeout kaafi hai, heartbeat ka extra code mat likho.` },

    { type: 'h2', text: 'Rung 5: checkpoints, cancel aur timeouts' },
    { type: 'p', html: `<strong>Naya problem:</strong> ek bade creator ka export 2 ghante ka hai. 1 ghanta 47 minute pe deploy hua, worker restart. Retry ne kaam phir <em>shuru se</em> kiya. Creator ne kul 3 ghante 47 minute wait kiya. Aur ye har deploy pe ho sakta hai.` },
    { type: 'callout', tone: 'term', title: 'Checkpoint', html: `<strong>Ye kya hai:</strong> lambe kaam ko chhote hisson (chunks) mein todna, aur har hissa khatam hone pe uska result aur "kahan tak pahuncha" save karna. Jaise game mein save point.<br><strong>Kyun chahiye:</strong> crash ke baad retry sirf bache hue hisse karta hai, shuru se nahi.<br><strong>Iske bina:</strong> 2 ghante ke kaam mein har crash = 2 ghante tak ka kaam barbaad.<br><strong>Example:</strong> 24 mahine ka export = 24 chunks. Har mahine ki CSV <code>exports/123/part-07.csv</code> mein, aur table mein <code>last_done = 7</code>. Retry part 8 se shuru.` },
    { type: 'p', html: `<strong>Checkpoint lab.</strong> 120 minute ka job. Chunk ka size chuno aur kis minute pe crash hua. Har checkpoint save karne mein ~5 second lagte hain. Dekho kitna kaam barbaad hua, aur bahut chhote chunks ka kya kharcha hai.` },
    { type: 'custom', render(el) {
      const CS = [0, 60, 30, 10, 5, 1];
      el.innerHTML = `<div class="row2">
          <div><label>Chunk size: <strong class="ltc-vc"></strong></label><input class="ltc-c" type="range" min="0" max="5" step="1" value="3"></div>
          <div><label>Crash kis minute pe: <strong class="ltc-vx"></strong></label><input class="ltc-x" type="range" min="1" max="119" step="1" value="107"></div>
        </div>
        <svg class="ltc-svg" viewBox="0 0 600 90" style="width:100%;height:auto;display:block;margin-top:10px" role="img" aria-label="Checkpoint timeline"></svg>
        <div class="stats">
          <div class="stat"><span>Barbaad kaam</span><strong class="ltc-lost"></strong></div>
          <div class="stat"><span>Checkpoints</span><strong class="ltc-n"></strong></div>
          <div class="stat"><span>Save ka kharcha</span><strong class="ltc-ov"></strong></div>
          <div class="stat"><span>Kul time (crash ke saath)</span><strong class="ltc-tot"></strong></div>
        </div>
        <div class="calc-note ltc-note"></div>`;
      const $ = c => el.querySelector(c);
      const upd = () => {
        const C = CS[+$('.ltc-c').value], X = +$('.ltc-x').value, T = 120;
        const saved = C ? Math.floor(X / C) * C : 0, lost = X - saved, n = C ? T / C : 0, ov = n * 5 / 60;
        const tot = T + lost + ov;
        $('.ltc-vc').textContent = C ? C + ' min' : 'koi checkpoint nahi'; $('.ltc-vx').textContent = X + ' min';
        $('.ltc-lost').textContent = lost + ' min'; $('.ltc-n').textContent = n; $('.ltc-ov').textContent = (Math.round(ov * 10) / 10) + ' min';
        $('.ltc-tot').textContent = (Math.round(tot * 10) / 10) + ' min';
        const sx = m => 20 + m / T * 560;
        let g = `<rect x="20" y="30" width="560" height="22" rx="4" fill="var(--surface-2)" stroke="var(--line-2)"/>`;
        if (saved) g += `<rect x="20" y="30" width="${sx(saved) - 20}" height="22" rx="4" fill="var(--green)" opacity=".75"/>`;
        if (lost) g += `<rect x="${sx(saved)}" y="30" width="${sx(X) - sx(saved)}" height="22" fill="var(--red)" opacity=".7"/>`;
        if (C) for (let m = C; m < T; m += C) if (C >= 5) g += `<line x1="${sx(m)}" y1="26" x2="${sx(m)}" y2="56" stroke="var(--ink-3)" stroke-width="1"/>`;
        g += `<text x="${sx(X)}" y="20" text-anchor="middle" font-size="13" fill="var(--red)" font-family="var(--f-mono)">crash</text>`;
        g += `<text x="20" y="78" font-size="12" fill="var(--ink-3)" font-family="var(--f-mono)">0 min</text><text x="580" y="78" text-anchor="end" font-size="12" fill="var(--ink-3)" font-family="var(--f-mono)">120 min</text>`;
        $('.ltc-svg').innerHTML = g;
        $('.ltc-note').textContent = C ? `Hara = save ho chuka (${saved} min), laal = barbaad (${lost} min). Retry minute ${saved} se shuru. ${n} checkpoints x 5 s = ${Math.round(ov * 10) / 10} min extra.` : `Koi checkpoint nahi: crash pe poore ${X} minute barbaad, retry shuru se.`;
      };
      el.querySelectorAll('input').forEach(i => i.oninput = upd); upd();
    }},
    { type: 'p', html: `Crash minute 107 pe: bina checkpoint 107 minute barbaad (kul 227 min). 10 minute chunks pe sirf 7 minute barbaad, aur 12 checkpoints ka kharcha 1 minute (kul 128 min). 1 minute chunks pe barbaadi 0, lekin 120 checkpoints = 10 minute kharcha (kul 130 min). Isliye na bahut bade, na bahut chhote chunks.` },
    { type: 'h3', text: 'Cancel aur timeouts' },
    { type: 'list', items: [
      '<strong>Cancel cooperative hota hai:</strong> API sirf <code>CANCEL_REQUESTED</code> likhta hai. Worker har chunk/checkpoint pe (ya heartbeat ke jawab mein) flag check karta hai, partial output saaf karta hai, phir CANCELLED. Queue mein pade job ko worker uthate hi status dekh ke skip kar deta hai.',
      '<strong>Kill kyun nahi?</strong> Process ko beech mein maarne se aadhi files, khule DB transactions, ya aadha bheja hua email reh sakta hai. Hard kill sirf aakhri raasta: "cancel ke 5 minute baad bhi nahi ruka".',
      '<strong>Har job ki max runtime:</strong> export 30 minute se zyada? Kuch gadbad hai (infinite loop, atki query). Worker khud ko rok de ya supervisor maar de, status FAILED (timeout). Kubernetes Jobs mein <code>activeDeadlineSeconds</code> yahi karta hai.',
      '<strong>Queue mein kitni der:</strong> agar job 1 ghante se QUEUED hai to ya workers kam hain ya atke hain. "Oldest message age" ka alert lagao; ye queue depth se behtar signal hai.',
    ]},
    { type: 'callout', tone: 'tip', title: 'Kab ruko (Rung 5)', html: `Checkpoint tab jab job 10+ minute ka ho aur aasaani se hisson mein toot sake (mahine, files, URLs). Cancel button tab jab user galti se lamba kaam shuru kar sakta hai. Max runtime (timeout) <em>hamesha</em> lagao: ye sasta hai aur atke jobs pakadta hai.` },

    { type: 'h2', text: 'Job simulator: Rung 1-5 ek saath' },
    { type: 'p', html: `3 workers, ek queue, ek job table. "Next tick" se time aage badhao (ya Auto play). Ye karke dekho: (1) kisi working worker ko <strong>Kill</strong> karo aur dekho kitne ticks baad uska job doosre worker ko milta hai; (2) <strong>Poison job</strong> daalo: 3 attempts, beech mein badhta hua wait (2, phir 4 ticks), phir DLQ; (3) mode "Sirf visibility timeout" pe switch karo: mare hue worker ka job ab receive ke poore 12 ticks baad hi wapas aata hai (heartbeat ke saath sirf 3 ticks), aur 16 tick wala lamba job zinda worker ke chalte hue hi dobara deliver ho jaata hai (Duplicate runs badhta hai); (4) chalte job pe <strong>Cancel</strong>.` },
    { type: 'custom', render(el) {
      function ltSim(hb) {
        let seed = 4242;
        const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
        const S = { t: 0, hb, VT: 12, HBT: 3, MAX: 3, jobs: [], workers: [1, 2, 3].map(i => ({ id: 'W' + i, alive: true, job: null, prog: 0 })), dlq: [], log: [], dups: 0 };
        const log = m => { S.log.push('t=' + S.t + ': ' + m); if (S.log.length > 60) S.log.shift(); };
        S.submit = kind => {
          const id = 'J' + (S.jobs.length + 1);
          const dur = kind === 'long' ? 16 : 4 + Math.floor(rnd() * 5);
          S.jobs.push({ id, kind, dur, status: 'QUEUED', progress: 0, attempts: 0, visibleAt: S.t, leaseUntil: -1, on: [], cancel: false });
          log(`${id} submit (${kind === 'poison' ? 'poison' : kind === 'long' ? 'lamba, ' + dur + ' ticks' : dur + ' ticks'}) → 202 Accepted, status QUEUED`);
          return id;
        };
        S.kill = wid => { const w = S.workers.find(x => x.id === wid); if (!w.alive) return; w.alive = false; log(`${wid} crash! ${w.job ? w.job + ' ka message abhi invisible hai, ack nahi hua' : 'koi job nahi tha'}`); };
        S.revive = wid => { const w = S.workers.find(x => x.id === wid); if (w.alive) return; w.alive = true; w.job = null; w.prog = 0; log(`${wid} restart, idle`); };
        S.cancelJob = id => { const j = S.jobs.find(x => x.id === id); if (['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(j.status)) return; if (j.status === 'RUNNING') { j.cancel = true; j.status = 'CANCELLING'; log(`${id} cancel requested: worker agle checkpoint pe rukega`); } else { j.status = 'CANCELLED'; log(`${id} cancel: queue mein tha, seedha CANCELLED`); } };
        const free = (w, j) => { w.job = null; w.prog = 0; j.on = j.on.filter(x => x !== w.id); };
        S.tick = () => {
          S.t++;
          S.workers.forEach(w => {
            if (!w.alive || !w.job) return;
            const j = S.jobs.find(x => x.id === w.job);
            if (j.status === 'SUCCEEDED') { log(`${w.id} ne dekha ${j.id} already SUCCEEDED: apni duplicate copy chhod di (status check + same output key, idempotent)`); free(w, j); return; }
            if (j.cancel) { j.status = 'CANCELLED'; log(`${w.id} ne ${j.id} cancel flag dekha, partial output saaf, CANCELLED`); free(w, j); return; }
            w.prog++;
            j.progress = Math.max(j.progress, w.prog);
            if (S.hb) j.leaseUntil = S.t + S.HBT;
            if (j.kind === 'poison' && w.prog >= Math.ceil(j.dur / 2)) {
              free(w, j); j.progress = 0;
              if (j.attempts >= S.MAX) { j.status = 'FAILED'; S.dlq.push(j.id); log(`${j.id} attempt ${j.attempts} fail. maxReceiveCount ${S.MAX} poora → DLQ + alert, status FAILED`); }
              else { const back = 2 * Math.pow(2, j.attempts - 1); j.status = 'RETRY_WAIT'; j.visibleAt = S.t + back; j.leaseUntil = -1; log(`${j.id} attempt ${j.attempts} fail (error). Retry ${back} ticks baad (backoff)`); }
              return;
            }
            if (w.prog >= j.dur) { j.status = 'SUCCEEDED'; j.progress = j.dur; log(`${w.id} ne ${j.id} poora kiya → result S3 mein, status SUCCEEDED, message ack/delete`); free(w, j); j.leaseUntil = -1; }
          });
          S.jobs.forEach(j => {
            if ((j.status === 'RUNNING' || j.status === 'CANCELLING') && j.leaseUntil >= 0 && j.leaseUntil <= S.t) {
              j.leaseUntil = -1; j.visibleAt = S.t;
              const alive = j.on.some(id => S.workers.find(w => w.id === id).alive);
              log(`${j.id} ka ${S.hb ? 'heartbeat ' + S.HBT + ' ticks se nahi aaya' : 'visibility timeout (' + S.VT + ' ticks) khatam'} → message phir visible` + (alive ? ' (lekin worker abhi bhi chal raha hai!)' : ''));
              j.on = j.on.filter(id => S.workers.find(w => w.id === id).alive);
              if (!j.on.length) j.status = j.cancel ? 'CANCELLED' : 'QUEUED';
              else j.status = 'RUNNING', j.requeued = true;
            }
          });
          S.workers.forEach(w => {
            if (!w.alive || w.job) return;
            const j = S.jobs.find(x => (x.status === 'QUEUED' || x.status === 'RETRY_WAIT' || (x.requeued && x.status === 'RUNNING')) && x.visibleAt <= S.t && x.leaseUntil < 0);
            if (!j) return;
            j.attempts++; j.requeued = false;
            if (j.on.length) { S.dups++; log(`DUPLICATE: ${j.id} ab ${j.on[0]} aur ${w.id} dono pe chal raha hai (double kaam)`); }
            j.status = 'RUNNING'; j.on.push(w.id); w.job = j.id; w.prog = 0;
            j.leaseUntil = S.t + (S.hb ? S.HBT : S.VT);
            log(`${w.id} ne ${j.id} uthaya (receive #${j.attempts})`);
          });
        };
        return S;
      }
      el.innerHTML = `<div class="lt-hb" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px"><span style="font-size:14px;color:var(--ink-2)">Worker liveness (reset karta hai):</span></div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          <button type="button" class="btn small primary lt-sub">+ Export job</button>
          <button type="button" class="btn small lt-long">+ Lamba job (16 ticks)</button>
          <button type="button" class="btn small lt-poison">+ Poison job</button>
          <button type="button" class="btn small primary lt-tick">Next tick</button>
          <button type="button" class="btn small ghost lt-play">Auto play</button>
          <button type="button" class="btn small ghost lt-reset">Reset</button>
        </div>
        <div class="lt-workers" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:12px"></div>
        <div class="lt-jobs" style="margin-top:12px;display:grid;gap:6px"></div>
        <div class="stats">
          <div class="stat"><span>Clock</span><strong class="lt-t"></strong></div>
          <div class="stat"><span>Queue mein (visible)</span><strong class="lt-q"></strong></div>
          <div class="stat"><span>DLQ</span><strong class="lt-dlq"></strong></div>
          <div class="stat"><span>Duplicate runs</span><strong class="lt-dup"></strong></div>
        </div>
        <ol class="lt-log" style="font:12.5px/1.5 var(--f-mono);color:var(--ink-2);margin:12px 0 0;padding-left:22px;max-height:220px;overflow:auto"></ol>`;
      const $ = s => el.querySelector(s);
      let hb = true, S, timer = null;
      const COL = { QUEUED: 'var(--ink-3)', RUNNING: 'var(--accent)', CANCELLING: 'var(--amber)', RETRY_WAIT: 'var(--amber)', SUCCEEDED: 'var(--green)', FAILED: 'var(--red)', CANCELLED: 'var(--ink-3)' };
      const reset = () => { S = ltSim(hb); S.submit('normal'); S.submit('normal'); S.submit('long'); S.submit('normal'); stop(); draw(); };
      const stop = () => { if (timer) clearInterval(timer); timer = null; $('.lt-play').textContent = 'Auto play'; };
      [[true, 'Heartbeat ON (3 ticks)'], [false, 'Sirf visibility timeout (12 ticks)']].forEach(([v, l]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = l; b.dataset.v = v; b.onclick = () => { hb = v; reset(); }; $('.lt-hb').appendChild(b); });
      $('.lt-sub').onclick = () => { S.submit('normal'); draw(); };
      $('.lt-long').onclick = () => { S.submit('long'); draw(); };
      $('.lt-poison').onclick = () => { S.submit('poison'); draw(); };
      $('.lt-tick').onclick = () => { S.tick(); draw(); };
      $('.lt-reset').onclick = reset;
      $('.lt-play').onclick = () => { if (timer) return stop(); $('.lt-play').textContent = 'Pause'; timer = setInterval(() => { if (!el.isConnected) return stop(); S.tick(); draw(); }, 700); };
      function draw() {
        $('.lt-hb').querySelectorAll('button').forEach(b => b.classList.toggle('on', String(hb) === b.dataset.v));
        const wk = $('.lt-workers'); wk.innerHTML = '';
        S.workers.forEach(w => {
          const d = document.createElement('div');
          d.style.cssText = 'background:var(--surface-2);border-radius:var(--r-sm);padding:8px 10px;border:1.5px solid ' + (w.alive ? (w.job ? 'var(--accent)' : 'var(--line-2)') : 'var(--red)');
          d.innerHTML = `<div style="font:600 14px var(--f-body)">${w.id}: ${w.alive ? (w.job ? 'working on ' + w.job : 'idle') : 'DEAD'}</div>`;
          const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small ' + (w.alive ? 'ghost' : 'primary'); b.style.marginTop = '6px';
          b.textContent = w.alive ? 'Kill worker' : 'Restart'; b.onclick = () => { w.alive ? S.kill(w.id) : S.revive(w.id); draw(); };
          d.appendChild(b); wk.appendChild(d);
        });
        const jb = $('.lt-jobs'); jb.innerHTML = '';
        S.jobs.forEach(j => {
          const r = document.createElement('div');
          r.style.cssText = 'display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 10px;align-items:center;background:var(--surface-2);border-radius:var(--r-sm);padding:6px 10px';
          const pct = Math.round(j.progress / j.dur * 100);
          r.innerHTML = `<div style="font:13px var(--f-mono);color:var(--ink)">${j.id} ${j.kind === 'poison' ? '(poison)' : j.kind === 'long' ? '(lamba)' : ''} <strong style="color:${COL[j.status]}">${j.status}</strong> · attempts ${j.attempts}${j.on.length ? ' · ' + j.on.join('+') : ''}</div><div class="lt-act"></div>
            <div style="height:8px;background:var(--line);border-radius:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${COL[j.status]}"></div></div><div style="font:12px var(--f-mono);color:var(--ink-3)">${pct}%</div>`;
          if (!['SUCCEEDED', 'FAILED', 'CANCELLED', 'CANCELLING'].includes(j.status)) { const c = document.createElement('button'); c.type = 'button'; c.className = 'btn small ghost'; c.textContent = 'Cancel'; c.onclick = () => { S.cancelJob(j.id); draw(); }; r.querySelector('.lt-act').appendChild(c); }
          jb.appendChild(r);
        });
        $('.lt-t').textContent = 't = ' + S.t;
        $('.lt-q').textContent = S.jobs.filter(j => (j.status === 'QUEUED' || j.status === 'RETRY_WAIT') && j.visibleAt <= S.t).length;
        $('.lt-dlq').textContent = S.dlq.length ? S.dlq.join(', ') : '0';
        $('.lt-dup').textContent = S.dups;
        $('.lt-log').innerHTML = S.log.slice(-12).map(l => `<li>${l}</li>`).join('');
      }
      reset();
    }},
    { type: 'p', html: `Default setup (3 export jobs + 1 lamba) pe jo dikhta hai: heartbeat ON mein tick 3 pe W1 ko maaro to tick 6 pe uska job phir queue mein (3 ticks), aur doosra worker free hote hi use uthata hai (attempts = 2). Sirf visibility timeout mein bina kisi crash ke bhi tick 13 pe lamba job J3 do workers pe chal raha hota hai: Duplicate runs = 1. Poison job hamesha 3 receives ke baad DLQ mein jaata hai.` },

    { type: 'h2', text: 'Rung 6: scale aur fairness' },
    { type: 'p', html: `<strong>Naya problem:</strong> raat 9 baje creators ek saath exports maangte hain: har minute 10 naye jobs, aur har job ~6 minute ka. Kitne workers chahiye? Ek seedha niyam (<strong>Little's law</strong>): ek waqt pe busy workers = har minute aane wale jobs x ek job ke minute = 10 x 6 = <strong>60</strong>. 40 workers hain to har minute ~3 jobs line mein jama hote jaayenge.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Naye jobs har minute: <strong class="lts-vl"></strong></label><input class="lts-l" type="range" min="1" max="40" step="1" value="10"></div>
          <div><label>Ek job kitne minute: <strong class="lts-vs"></strong></label><input class="lts-s" type="range" min="1" max="30" step="1" value="6"></div>
          <div><label>Workers: <strong class="lts-vw"></strong></label><input class="lts-w" type="range" min="5" max="200" step="5" value="40"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Zaroori workers</span><strong class="lts-need"></strong></div>
          <div class="stat"><span>Workers kitne busy</span><strong class="lts-u"></strong></div>
          <div class="stat"><span>Line har ghante</span><strong class="lts-g"></strong></div>
        </div>
        <div class="calc-note lts-note"></div>`;
      const $ = c => el.querySelector(c);
      const upd = () => {
        const L = +$('.lts-l').value, S = +$('.lts-s').value, W = +$('.lts-w').value;
        const need = L * S, done = W / S, grow = Math.round((L - done) * 60);
        $('.lts-vl').textContent = L; $('.lts-vs').textContent = S + ' min'; $('.lts-vw').textContent = W;
        $('.lts-need').textContent = need; $('.lts-u').textContent = Math.min(100, Math.round(need / W * 100)) + '%';
        $('.lts-g').textContent = grow > 0 ? '+' + grow + ' jobs' : 'nahi badhti';
        $('.lts-note').textContent = grow > 0 ? `Workers har minute sirf ${Math.round(done * 10) / 10} jobs khatam karte hain, aate ${L} hain. Line har ghante ${grow} jobs badhegi. Autoscaler ko "queue depth" ya "sabse purane job ki umar" dekh ke workers badhane chahiye.` : `Workers kaafi hain. ${Math.round(need / W * 100)}% busy. 100% ke paas mat jao: thodi si bheed pe line turant lambi hoti hai, isliye ~70-80% pe ruk ke aur workers jodo.`;
      };
      el.querySelectorAll('input').forEach(i => i.oninput = upd); upd();
    }},
    { type: 'list', items: [
      '<strong>Workers alag scale karo:</strong> web servers request rate se scale hote hain, workers queue depth / oldest message age se. Raat ko 0 jobs to workers bhi kam (autoscaling, ya serverless jaise Lambda chhote jobs ke liye; Lambda ki max runtime 15 minute hai, isliye lambe jobs ke liye containers).',
      '<strong>Ek user sab kha jaaye:</strong> ek creator ne 500 exports daal diye, baaki sab line mein. Per-user limit (ek waqt mein max 3 jobs), ya har tenant ki apni queue/weighted fair scheduling.',
      '<strong>Chhote aur bade jobs alag:</strong> 5 second wale thumbnail jobs 2 ghante wale exports ke peeche na atkein. Alag queues aur alag worker pools (<a href="#/resilience">bulkhead</a>). Priority queues: paid users ke jobs pehle.',
    ]},
    { type: 'callout', tone: 'tip', title: 'Kab ruko (Rung 6)', html: `Ek hi tarah ke jobs aur ek hi tarah ke users? Ek queue + autoscaling kaafi. Alag queues, priorities aur per-user limits tab lagao jab sach mein ek bada user ya bade jobs baakiyon ko rok rahe hon (oldest job age dashboard pe dikhega).` },

    { type: 'h2', text: 'Rung 7: workflow engine' },
    { type: 'p', html: `<strong>Naya problem:</strong> xyz.com ka AI feature: "mere sab videos ke captions banao, phir mujhse approve karwao, phir 9 bhashaon mein translate karo". Ab ye ek job nahi, kai steps ki kahani hai, jisme beech mein insaan ka din bhar ka intezaar bhi hai. Har step ka retry, timeout, aur "kahan tak pahunche" khud likhna bahut code ban jaata hai.` },
    { type: 'callout', tone: 'term', title: 'Workflow engine', html: `<strong>Ye kya hai:</strong> ek tool (Temporal, AWS Step Functions) jisme tum steps ki list likhte ho, aur wo har step ka status, retry, timeout, heartbeat aur intezaar khud sambhalta hai. Crash ke baad bhi wahi se aage chalta hai.<br><strong>Kyun chahiye:</strong> jab job ek kaam nahi, kahani ban jaaye: kai steps, timers, insaan ki approval.<br><strong>Iske bina:</strong> tum apni status table + queue pe ek aadha-adhoora workflow engine khud bana rahe hote ho.<br><strong>Kab nahi:</strong> ek step wala export? Ek aur bada system chalana zaroori nahi. Poori kahani <a href="#/pattern-multistep">Multi-step processes</a> lesson mein.` },
    { type: 'callout', tone: 'tip', title: 'Real examples', html: `Video transcoding (upload ke baad har resolution banana), report exports, LLM agent tasks (ek agent 10 minute tak tools chalata hai, progress SSE se), web crawling (har URL ek job, crores jobs), backup/restore, bulk email. Har jagah wahi shape: accept → queue → workers → status → result.` },

    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Decide: long-running task kaise chalayein', html: `Roadmap ka pattern: <strong>job queue, workers, status table, progress updates, retries, timeouts, dead-letter queues</strong>. Rule of thumb:<br>• Kaam ~1-2 second se zyada ya unpredictable → request mein mat chalao. <strong>202 + job_id</strong>, queue, workers.<br>• User ko status chahiye → <strong>status table</strong>; progress ke liye polling default, live feel chahiye to SSE, server-to-server ke liye webhook.<br>• Hamesha: <strong>ack after work</strong>, idempotent job, retries with backoff + jitter, max attempts → <strong>DLQ</strong> + alert.<br>• Job minutes se lamba → <strong>heartbeat</strong> (visibility extend / heartbeat_at), checkpointing, cancel flag, max runtime.<br>• Kai steps, timers, insaan → <strong>workflow engine</strong> (Temporal, Step Functions).<br>Roadmap ki line: "Do this task" → queue.` },

    { type: 'h2', text: 'Poora design, ek nazar mein' },
    { type: 'p', html: `xyz.com ka export system, har rung apni jagah pe. Kisi bhi box pe click karo, aur neeche ke buttons se ek ek raasta dekho.` },
    { type: 'diagram', title: 'Long-running tasks: poori picture', height: 640,
      groups: [
        { label: 'Async: peeche ka kaam', x: 250, y: 196, w: 460, h: 294 },
      ],
      nodes: [
        { id: 'app', label: 'Creator app', sub: 'export + status', x: 90, y: 70, kind: 'client', info: 'Ye kya hai: creator ka browser/app. Export maangta hai, job_id rakhta hai, progress dekhta hai, aur end mein pre-signed URL se file download karta hai.' },
        { id: 'push', label: 'Notifier', sub: 'SSE / email', x: 330, y: 70, kind: 'server', info: 'Ye kya hai: push wala hissa (Rung 2). Job ka progress ya "done" SSE se live browser tak, aur bahut lambe jobs pe email. Polling hi kaafi ho to ye box zaroori nahi.' },
        { id: 's3', label: 'Object storage', sub: 'chunks + result', x: 560, y: 70, kind: 'data', info: 'Ye kya hai: S3 jaisa file store. Har checkpoint ka chunk (part-07.csv) aur final file yahin. Naam job id se, isliye retry wahi file overwrite karta hai (idempotent).' },
        { id: 'api', label: 'Jobs API', sub: '202 + job_id', x: 90, y: 250, kind: 'server', info: 'Ye kya hai: halka web API (Rung 1). Idempotency-Key check, job row likhna, queue mein message, aur 50 ms mein 202. Status ka jawab jobs table se.' },
        { id: 'q', label: 'Job queue', sub: 'export / thumbs', x: 330, y: 250, kind: 'queue', info: 'Ye kya hai: jobs ki line (Rung 1, 6). Chhote aur bade jobs ki alag queues taaki chhote jobs bade ke peeche na atkein. Ack ke baad hi message hatta hai.' },
        { id: 'w', label: 'Workers', sub: 'autoscaled pool', x: 560, y: 250, kind: 'server', info: 'Ye kya hai: kaam karne wali machines. Queue depth / oldest job age dekh ke autoscale (Rung 6). Har 10 s heartbeat, har chunk pe checkpoint aur cancel flag check (Rung 4, 5).' },
        { id: 'db', label: 'Jobs table', sub: 'status, %, HB', x: 90, y: 430, kind: 'data', info: 'Ye kya hai: har job ki ek row (Rung 2): status, progress, attempts, heartbeat_at, last chunk, result key, error. User aur support dono yahin dekhte hain.' },
        { id: 'reaper', label: 'Reaper', sub: 'dead HB → retry', x: 330, y: 430, kind: 'server', info: 'Ye kya hai: chhota cron program (Rung 4). Har 10 s dekhta hai: kis RUNNING job ka heartbeat 30 s se purana hai? Use wapas queue mein. Sweeper ki tarah atke QUEUED jobs bhi dobara bhejta hai.' },
        { id: 'dlq', label: 'DLQ + alarm', sub: 'poison jobs', x: 560, y: 430, kind: 'queue', info: 'Ye kya hai: dead-letter queue (Rung 3). 3 attempts ke baad bhi fail wale jobs yahan, status FAILED, on-call ko alarm. Fix ke baad redrive.' },
        { id: 'wf', label: 'Workflow engine', sub: 'Rung 7: kai steps', x: 330, y: 590, w: 180, kind: 'server', info: 'Ye kya hai: Temporal / Step Functions jaisa tool (Rung 7). Sirf tab jab job kai steps, timers ya insaan ki approval wali kahani ban jaaye. Har step ko workers pe chalata hai.' },
      ],
      edges: [
        { a: 'app', b: 'api', n: 1, label: 'POST /exports' },
        { a: 'api', b: 'db', n: 2, label: 'QUEUED' },
        { a: 'api', b: 'q', n: 3 },
        { a: 'q', b: 'w', n: 4 },
        { a: 'w', b: 's3', label: 'chunks' },
        { a: 'w', b: 'db', n: 5, label: 'progress', via: [[420, 320]] },
        { a: 'w', b: 'push', kind: 'evt', label: 'done' },
        { a: 'push', b: 'app', kind: 'evt', label: 'SSE / email' },
        { a: 'app', b: 's3', label: 'download', via: [[90, 16], [560, 16]] },
        { a: 'reaper', b: 'db', label: 'HB > 30 s?' },
        { a: 'reaper', b: 'q', dashed: true },
        { a: 'w', b: 'dlq', kind: 'bad', label: '3 fails' },
        { a: 'wf', b: 'w', dashed: true, label: 'har step' },
      ],
      paths: [
        { name: 'Submit', text: 'Creator ne Export dabaya. API ne row (QUEUED) likhi, queue mein message daala, aur turant 202 + job_id lautaya.', go: ['app>api>db', 'api>q', 'res:api>app'] },
        { name: 'Kaam + progress', text: 'Worker ne job uthaya, chunks storage mein likhe, progress table mein. Done hone pe notifier ne app ko bataya, app ne file download ki.', go: ['q>w>s3', 'w>db', 'evt:w>push>app', 'app>s3'] },
        { name: 'Crash + heartbeat', text: 'Worker mar gaya, heartbeat band. Reaper ne 30 s baad pakda aur job wapas queue mein daali. Naya worker last checkpoint se shuru.', go: ['reaper>db', 'reaper>q>w'] },
        { name: 'Poison → DLQ', text: 'Kharab data wala job 3 baar fail (backoff ke saath). Phir DLQ mein, status FAILED, alarm baja.', go: ['q>w', 'bad:w>dlq', 'w>db'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Lamba kaam request ke andar nahi. Turant 202 + job_id, kaam queue aur workers pe.</li>
      <li>Status ke liye jobs table. Queue sirf kaam pahunchati hai.</li>
      <li>Progress: polling default (interval badhate jao), live feel ya bahut users pe SSE, bahut lambe jobs pe email.</li>
      <li>Ack kaam ke baad. At-least-once + idempotent job (output naam job id se).</li>
      <li>Retry with exponential backoff + jitter, max attempts ke baad DLQ + alarm.</li>
      <li>Lambe jobs: heartbeat + reaper; zombie worker ko attempt number (fencing) se roko.</li>
      <li>10+ minute jobs: checkpoints. Cancel = flag, kill nahi. Har job ki max runtime.</li>
      <li>Workers = jobs per minute x minutes per job (Little's law). Kai steps / insaan = workflow engine.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['Web servers tez aur free; lamba kaam unhe block nahi karta', 'Crash, deploy, timeout ke baad bhi kaam poora hota hai (retry)', 'User ko saaf status aur progress, tab band karke wapas aa sakta hai', 'Workers alag se scale; spike queue mein absorb hota hai', 'Poison jobs DLQ mein alag, baaki system chalta rehta hai'],
      costs: ['Zyada moving parts: queue, workers, status table, reaper, storage', 'At-least-once: har job idempotent banana padta hai', 'Status table aur queue ko sync rakhna (outbox / sweeper)', 'Heartbeat, cancel, checkpoint ka extra code', 'User ko result turant nahi; UX mein "processing" state design karni padti hai'] },

    { type: 'think', questions: [
      { q: 'AI agent feature: user ek task deta hai, agent 5-15 minute tak web search aur tools chalata hai. Design karo.', a: 'POST /tasks → 202 + task_id, row QUEUED. Worker (container, Lambda nahi kyunki 15 minute limit ke paas hai) task uthata hai, har tool call ke baad progress/step ko Redis pub-sub pe daalta hai aur DB mein checkpoint. Browser SSE se steps live dekhta hai; SSE toot jaaye to GET /tasks/:id se status. Heartbeat har 10 s, max runtime 30 minute, Cancel button cooperative (har step ke baad flag check). LLM API ke 429/503 pe backoff retry; tool ke side effects (email bhejna) idempotency key ke saath. 3 fails ke baad FAILED + DLQ. Agar agent ko beech mein user ki approval chahiye to ye workflow engine ki taraf jaata hai.' },
      { q: 'SQS visibility timeout 30 s hai aur tumhara transcode job 4 minute leta hai. Kya hoga, aur 2 fix kya hain?', a: '30 s baad message phir visible, doosra worker wahi video transcode karne lagega, phir teesra... har 30 s mein ek naya duplicate, aur receive count badhta jaayega, ho sakta hai job DLQ mein bhi chala jaaye jabki wo fail nahi hua tha. Fix 1: visibility timeout job ki max duration se zyada rakho (jaise 6 x expected, lekin tab crash detection slow). Fix 2 (behtar): chhota timeout + heartbeat jo ChangeMessageVisibility se time badhata rahe. Saath mein idempotent output.' },
      { q: 'Status table mein job SUCCEEDED dikh raha hai lekin user bolta hai download link 403 deta hai. Kya galat ho sakta hai?', a: 'Pre-signed URL expire ho gaya (link 15 minute valid tha, user 2 din baad aaya), ya S3 lifecycle rule ne file delete kar di. Fix: status API har baar naya signed URL banaye (DB mein sirf object key rakho, URL nahi), aur expiry policy user ko dikhao ("7 din tak available").' },
    ]},
    { type: 'quiz', questions: [
      { q: '8 minute ka export request aaya. API ko kya lautana chahiye?', options: ['200 OK, 8 minute baad file ke saath', '202 Accepted + job_id (aur status URL)', '504 Gateway Timeout', '201 Created with the file'], answer: 1, explain: '202 = "maan liya, kaam baad mein hoga". Client job_id se status dekhta hai. 8 minute connection khula rakhna beech ke proxies ke timeouts se toot jaayega.' },
      { q: 'Worker job uthate hi message ack kar deta hai, phir kaam karta hai. Worker crash hua. Kya hoga?', options: ['Job dobara deliver hoga', 'Job hamesha ke liye kho jaayega aur status RUNNING pe atka rahega', 'Job DLQ mein chala jaayega', 'Queue worker ko restart karegi'], answer: 1, explain: 'Ack ka matlab "message delete karo". Ack pehle ho gaya to queue ke paas kuch nahi bacha. Kaam ke baad ack karo aur duplicates ko idempotency se sambhalo.' },
      { q: 'Fixed visibility timeout 5 minute, job 10 minute ka, koi heartbeat nahi. Kya hota hai?', options: ['Kuch nahi, job 10 minute mein khatam', 'Job 5 minute baad doosre worker ko bhi mil jaata hai, jabki pehla abhi chal raha hai', 'Job turant DLQ mein', 'Queue job ko 5 minute pe cancel kar deti hai'], answer: 1, explain: 'Visibility timeout ke baad message phir visible ho jaata hai. Doosra worker use uthata hai: duplicate kaam. Heartbeat (visibility extend) ya bada timeout chahiye, aur idempotent job.' },
      { q: 'Har minute 12 naye jobs aate hain, har job 5 minute ka. Kam se kam kitne workers chahiye taaki line na badhe?', options: ['12', '60', '17', '5'], answer: 1, explain: "Little's law: busy workers = 12 jobs/min x 5 min = 60. Isse kam workers pe line har minute badhti jaayegi. Asal mein thoda zyada (~75-85) rakho taaki workers 100% busy na hon." },
      { q: '2 ghante ka export, 10 minute ke checkpoints. Minute 95 pe crash. Retry kahan se shuru hoga?', options: ['Minute 0 se', 'Minute 90 se', 'Minute 95 se', 'Job FAILED ho jaayega'], answer: 1, explain: 'Aakhri save hua checkpoint minute 90 ka hai. Minute 90-95 ka kaam (5 minute) barbaad, baaki bacha.' },
      { q: 'Ek job har baar corrupt input pe fail hota hai. Sahi handling?', options: ['Har second pe hamesha retry', 'Kuch attempts with backoff, phir DLQ + status FAILED + alert', 'Error ignore karke SUCCEEDED likh do', 'Worker ko restart karo'], answer: 1, explain: 'Poison message hamesha fail hoga. Limited retries (transient errors ke liye), phir DLQ taaki baaki jobs na rukein, user ko FAILED aur team ko alert. Fix ke baad redrive.' },
    ]},
    { type: 'sources', note: 'Queue-specific defaults aur limits inhi docs se check kiye gaye.', items: [
      { title: 'Amazon SQS visibility timeout', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html', used: 'Default 30 s, max 12 hours, extending with ChangeMessageVisibility.' },
      { title: 'Detecting Activity failures (heartbeat timeout)', publisher: 'Temporal documentation', official: true, url: 'https://docs.temporal.io/encyclopedia/detecting-activity-failures', used: 'Heartbeat timeout idea for long activities.' },
      { title: 'Solid Queue README', publisher: 'Rails (GitHub)', official: true, url: 'https://github.com/rails/solid_queue', used: 'DB-backed queue using FOR UPDATE SKIP LOCKED on Postgres 9.5+ / MySQL 8+.' },
      { title: 'Lambda quotas (function timeout 900 s)', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html', used: '15 minute max runtime for Lambda functions.' },
      { title: 'Application Load Balancer attributes: connection idle timeout', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-load-balancer-attributes.html', used: 'Default idle timeout of 60 seconds (the "60 second wall").' },
      { title: 'Kubernetes Jobs (activeDeadlineSeconds)', publisher: 'Kubernetes documentation', official: true, url: 'https://kubernetes.io/docs/concepts/workloads/controllers/job/', used: 'Max runtime for a Job; job marked Failed with DeadlineExceeded.' },
      { title: 'Celery: Should I use retry or acks_late?', publisher: 'Celery documentation', official: true, url: 'https://docs.celeryq.dev/en/stable/faq.html#faq-acks-late-vs-retry', used: 'Ack after task execution (acks_late) and the need for idempotent tasks.' },
    ]},
  ],
});
