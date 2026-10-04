Lesson.register({
  id: 'pattern-long-tasks',
  title: 'Long-running tasks',
  minutes: 28,
  summary: `Some work takes minutes or hours: exporting 2 years of analytics, converting a video, making captions with AI. You cannot run this inside one web request. In this lesson we climb a ladder: turn the work into a "job", put it in a line, let separate machines do it, show the user the progress, and handle machines that die or work that keeps failing.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Some buttons start work that runs for 10 minutes, like "download all my data".<br>If the website keeps the page loading for that long, the connection breaks in the middle and the work is wasted.<br>So the website answers at once: "Got it. Here is your token number."<br>Separate machines do the work in the background, and you can use the token number at any time to ask "how much is done?".<br>In this lesson we learn how this is built, and how the work survives when a machine dies halfway.` },
    { type: 'h2', text: 'The ladder for this pattern' },
    { type: 'p', html: `In pattern lessons we climb a <strong>ladder</strong>. Each lower rung (step) is cheap and simple. Climb to the next rung only when the one below is not enough. This is the ladder for long-running tasks:` },
    { type: 'steps', items: [
      { t: 'Rung 1: 202 + job + queue + workers', d: 'Move the work out of the request. Give the user "got it" and a job_id at once. Separate machines (workers) do the work.' },
      { t: 'Rung 2: Job status table + progress', d: 'One row per job: QUEUED, RUNNING 40%, SUCCEEDED. The user sees progress by polling (asking again and again) or by push.' },
      { t: 'Rung 3: Retries, idempotency, DLQ', d: 'If the work fails, wait a little and try again. Running it twice must not cause harm. Work that fails again and again goes to a separate line of "bad jobs".' },
      { t: 'Rung 4: Heartbeats', d: 'For long jobs, the worker says "I am alive" every few seconds. If it goes silent, give the job to someone else quickly.' },
      { t: 'Rung 5: Checkpoints, cancel, timeouts', d: 'If a 2-hour job fails at 1:50, restart from the remaining part, not from zero. The user can cancel. A stuck job stops by itself.' },
      { t: 'Rung 6: Scale and fairness', d: 'If the queue gets long, add workers. One user must not take all the workers. Small and big jobs wait in separate lines.' },
      { t: 'Rung 7: Workflow engine', d: 'When a "job" grows into many steps, human approval, or waiting for a whole day, use a tool like Temporal or Step Functions.' },
    ]},
    { type: 'callout', tone: 'tip', title: 'When to stop climbing', html: `Not every app needs the whole ladder. A 5-second task? Rungs 1-3 are enough. A 2-minute export? Rungs 1-4. A crawl or AI agent that runs for hours? Rungs 5-6 too. Rung 7 only when there are many steps and long waits. Each rung's section ends with a "when to stop" note.` },
    { type: 'h2', text: 'The problem: the "Export" button and the 60-second wall' },
    { type: 'p', html: `Creators on xyz.com asked: "give me 2 years of my analytics as a CSV". For a big creator this means scanning tens of millions of rows, building a file and uploading it: 5-10 minutes. The first version was simple: <code>GET /export</code> came in, the server ran the query, built the file and sent it in the response.` },
    { type: 'list', items: [
      '<strong>The timeout wall:</strong> between the user and the server there are machines like a load balancer, an API gateway or a proxy. They often cut the connection after 30-60 seconds (the default idle timeout of an AWS ALB is 60 seconds). The server is still working, but the user gets <code>504 Gateway Timeout</code>. (504 = "the machine in the middle waited for an answer, none came, so it gave up".)',
      '<strong>The user refreshed:</strong> a new request, a new export. Now two servers do the same heavy work, and the DB gets double load.',
      '<strong>A deploy happened:</strong> the server restarted and 8 minutes of work vanished. Nobody even noticed.',
      '<strong>Server capacity:</strong> a web server can handle only a fixed number of requests at once (say 200 "threads", one request per thread). Each export holds a thread for minutes. If 200 creators export at the same time, not a single thread is left for people who just want to open a page.',
    ]},
    { type: 'p', html: `The real mistake: keeping <strong>long work inside a request-response</strong>. An HTTP request is made for a short exchange ("give, take"). Long work should happen somewhere else, on other machines, at its own speed, and the user only needs to know its <em>status</em>.` },
    { type: 'callout', tone: 'term', title: 'Job (background job)', html: `<strong>What it is:</strong> a record of a piece of work that will run later, on another machine. It says what to do (input), whose it is (user), and what state it is in now (status). Like a token: "Token 123: Riya's 2-year export, waiting in line".<br><strong>Why we need it:</strong> we want to separate the work from the request. The request ends in 50 ms, and the job runs at its own speed.<br><strong>Without it:</strong> the work runs inside the request and hits the 60-second wall.` },
    { type: 'callout', tone: 'term', title: '202 Accepted', html: `<strong>What it is:</strong> an HTTP status code. It means: "I got your request and accepted it, but the work is not done yet." With it we return a <code>job_id</code> and an address (URL) to check the status, often in a <code>Location: /jobs/123</code> header.<br><strong>Why we need it:</strong> the client clearly knows the result is not ready and must ask later.<br><strong>Without it:</strong> we would send 200 OK, which means "the work is done". That would be a lie.` },
    { type: 'callout', tone: 'term', title: 'Worker', html: `<strong>What it is:</strong> a separate program (often on separate machines) with only one job: take a job from the line, do it, take the next one. The web server talks to users; the worker only works in the background.<br><strong>Why we need it:</strong> heavy work moves away from the web servers. You can change the number of workers on its own.<br><strong>Without it:</strong> work like exports would eat the web server's threads and the home page would get slow.` },
    { type: 'callout', tone: 'term', title: 'Job queue', html: `<strong>What it is:</strong> a line of jobs (remember the <a href="#/queues">message queue</a> lesson?). The API puts a small note about the job in it, and a free worker takes it out. Examples: Amazon SQS, RabbitMQ, or Sidekiq/Celery running on Redis.<br><strong>Why we need it:</strong> the API and the workers do not wait for each other. If the workers are busy, jobs wait safely in the line.<br><strong>Without it:</strong> the API would have to find a free worker and call it directly. All busy? The work is lost.` },
    { type: 'callout', tone: 'term', title: 'Ack and visibility timeout (a reminder)', html: `<strong>What it is:</strong> when a worker takes a message, the queue does <em>not delete</em> it. It only hides it from the others. When the work is done, the worker sends an <strong>ack</strong> ("done, remove it"). The hiding time is the <strong>visibility timeout</strong> (SQS default: 30 seconds). If no ack arrives and the time runs out, the message shows up in the line again.<br><strong>Why we need it:</strong> if a worker dies, the job is not lost. Someone else gets it.<br><strong>Without it:</strong> the job would be deleted as soon as it is handed out. If the worker died, the job would be gone forever.` },
    { type: 'callout', tone: 'term', title: 'Pre-signed URL', html: `<strong>What it is:</strong> a link to a file in object storage (a file store like S3) that carries a small "permission ticket" and expires after a while (for example 15 minutes).<br><strong>Why we need it:</strong> the big CSV file downloads straight from storage, not through our servers. And only that user has the link, for a short time.<br><strong>Without it:</strong> either the file is public (anyone can see it), or a 2 GB file passes through our API servers.` },
    { type: 'h2', text: 'Rungs 1 + 2: accept, queue, work, report' },
    { type: 'p', html: `The basic pattern in four words: <strong>accept</strong> (take the job, return 202), <strong>queue</strong> (put it in the line), <strong>work</strong> (a worker does it), <strong>report</strong> (tell the status). First compare the old way and the new way side by side, then play with the flow.` },
    { type: 'compare',
      left: { title: 'Before: everything in one request', ascii: `Creator ──GET /export──> Server
                         (8 min of work...)
           <── 504 Timeout (at 60 s)
Server is still working,
nobody will get the result` },
      right: { title: 'Now: the job pattern', ascii: `Creator ──POST /exports──> API
   <── 202 { job_id: 123 }  (50 ms)
API: QUEUED in jobs table + msg in queue
Worker: took msg → RUNNING → 40%...
Creator: GET /jobs/123 → 40%
Worker: file in S3 → SUCCEEDED
Creator: download link` },
    },
    { type: 'flow', height: 340,
      nodes: [
        { id: 'c', label: 'Creator', sub: 'browser', x: 85, y: 85, w: 130, kind: 'client', info: 'What it is: the creator\'s browser. It asks for the export, gets a job_id, then keeps asking about progress. Even if the tab is closed, the work goes on; the creator can come back and check the status with the job_id.' },
        { id: 'api', label: 'Jobs API', sub: 'POST / GET /jobs', x: 290, y: 85, w: 150, kind: 'server', info: 'What it is: our web API, light and fast. It creates the job (a row in the table + a message in the queue), returns 202, and answers "how much is done?" from the table. It never does heavy work itself, so it never gets stuck.' },
        { id: 'db', label: 'Job status DB', sub: 'jobs table', x: 290, y: 265, w: 150, kind: 'data', info: 'What it is: a normal database table with one row per job: status, progress, attempts (how many tries), worker, heartbeat_at, result, error. Why: everything the user sees comes from here. The queue only delivers work; it does not report status.' },
        { id: 'q', label: 'Job queue', sub: 'SQS / RabbitMQ', x: 505, y: 85, w: 150, kind: 'queue', info: 'What it is: the line of jobs (SQS or RabbitMQ). After a worker takes a message, it stays hidden from the others (visibility timeout); if no ack comes, it shows up again. Messages that fail again and again go to the DLQ (a separate line for bad jobs).' },
        { id: 'w', label: 'Worker', sub: 'export-worker', x: 505, y: 265, w: 150, kind: 'server', meter: true, load: 20, info: 'What it is: the machine that does the real work: the query, building the CSV, the upload. Along the way it writes progress and a heartbeat ("I am alive"), and checks the cancel flag. We change the number of workers separately from the web servers.' },
        { id: 's3', label: 'Object storage', sub: 'S3: result file', x: 645, y: 175, w: 130, kind: 'data', info: 'What it is: a store for big files (like S3). The result file goes here, named exports/123.csv (after the job id, so a retry overwrites the same file instead of making a new one). The user gets a pre-signed URL that expires after a while.' },
      ],
      edges: [{ a: 'c', b: 'api' }, { a: 'api', b: 'db' }, { a: 'api', b: 'q' }, { a: 'q', b: 'w' }, { a: 'w', b: 'db' }, { a: 'w', b: 's3' }],
      scenarios: [
        { name: 'Happy path', steps: [
          { title: 'Submit: 202 at once', text: 'The API creates a row in the jobs table (QUEUED), puts a message in the queue, and returns 202 in 50 ms.', go: ['c>api', 'api>db', 'api>q', 'res:api>c'], after: { db: { sub: 'job 123: QUEUED' } }, msg: 'POST /exports  →  202 Accepted\nLocation: /jobs/123   { "job_id": 123, "status": "QUEUED" }' },
          { title: 'A worker picks it up', text: 'A free worker takes the message. Status RUNNING; the worker id and heartbeat_at are written.', go: ['q>w', 'w>db'], after: { w: { load: 70, sub: 'job 123' }, db: { sub: 'job 123: RUNNING 0%' } } },
          { title: 'Progress', text: 'Every few seconds the worker writes progress. The creator\'s page polls every 3 s (poll = ask again and again "how much is done?") and the progress bar grows.', go: ['w>db', 'c>api', 'api>db', 'res:api>c'], after: { db: { sub: 'job 123: RUNNING 60%' } }, msg: 'GET /jobs/123  →  { "status": "RUNNING", "progress": 60 }' },
          { title: 'Result + done', text: 'The file goes to S3, the row gets SUCCEEDED + the result key, then the worker acks the queue. On the next poll the creator gets a download link (pre-signed URL).', go: ['w>s3', 'w>db', 'w>q'], after: { db: { state: 'ok', sub: 'job 123: SUCCEEDED' }, w: { load: 20, sub: 'idle' }, s3: { state: 'ok', sub: 'exports/123.csv' } }, msg: 'GET /jobs/123  →  { "status": "SUCCEEDED", "download_url": "https://...signed..." }' },
        ]},
        { name: 'Worker crash', intro: 'The job was at 60% when the worker machine died. This is where the heartbeat helps: the worker says "I am alive" every 10 s. When that signal stops, it has probably died.', steps: [
          { title: 'Crash', text: 'The worker went down. No ack was sent, and the heartbeats stopped.', set: { w: { state: 'down', sub: 'CRASHED at 60%' }, db: { sub: 'job 123: RUNNING 60%' } }, focus: ['w'] },
          { title: 'Heartbeat missed', text: 'The worker sent a heartbeat (and extended the visibility in the queue) every 10 s. No heartbeat for 30 s: the visibility timeout ends and the message is visible in the queue again.', set: { q: { state: 'warn', sub: 'msg 123 visible' } }, focus: ['q'] },
          { title: 'Another worker retries', text: 'A new worker takes the message, attempts = 2. If the job kept checkpoints (like "chunks up to 60% are in S3") it continues from there, otherwise from the start. The output key is the same, so the old half file is overwritten, not duplicated.', set: { w: { state: '', sub: 'worker-2, attempt 2' }, q: { state: '' } }, go: ['q>w', 'w>db'], after: { db: { sub: 'job 123: try 2' } } },
          { title: 'Finished', text: 'The work is done, SUCCEEDED. The user only waited a bit longer and saw no error.', go: ['w>s3', 'w>db'], after: { db: { state: 'ok', sub: 'job 123: SUCCEEDED' }, s3: { state: 'ok', sub: 'exports/123.csv' } } },
        ]},
        { name: 'Poison → DLQ', intro: 'One creator\'s data has a bad row; the export crashes there every time. Such a job is called a "poison" job. DLQ (dead-letter queue) = a separate line for such jobs, where an engineer looks later.', steps: [
          { title: 'Fail, retry with backoff', text: 'Attempt 1 fails. No instant retry: wait a little (1 min, then 2, then 4). Short-lived problems (DB busy, network) are often fixed by then.', go: ['q>w', 'bad:w>q'], after: { db: { state: 'warn', sub: 'job 456: RETRY 1/3' } } },
          { title: 'Fails the third time too', text: 'Max attempts (3) used up. More retries = wasted worker time.', go: ['q>w', 'bad:w>q'], after: { db: { sub: 'job 456: RETRY 3/3' } } },
          { title: 'DLQ + FAILED', text: 'The message goes to the dead-letter queue, status FAILED with the error, and the on-call engineer gets an alert. The creator gets a clear message: "The export failed, the team is looking at it." After the fix, redrive from the DLQ.', set: { q: { state: 'warn', sub: 'msg 456 → DLQ' } }, go: ['w>db'], after: { db: { state: 'down', sub: 'job 456: FAILED' } }, msg: '{ "status": "FAILED", "error": "row 8,812,004: invalid UTF-8" }' },
        ]},
        { name: 'Cancel', intro: 'The creator picked the wrong date range and pressed Cancel. We do not force-kill the worker in the middle; we show it a flag.', steps: [
          { title: 'Cancel request', text: 'The API only sets a flag: status CANCEL_REQUESTED. Killing a running worker in the middle is dangerous (half a file, locks).', go: ['c>api', 'api>db', 'res:api>c'], after: { db: { state: 'warn', sub: 'job 789: CANCEL_REQ' } }, msg: 'POST /jobs/789/cancel  →  202' },
          { title: 'Worker checks at a checkpoint', text: 'After each chunk the worker reads the status (or gets the flag in the reply to its heartbeat). It sees the flag: deletes the partial file, sets status CANCELLED, acks.', go: ['w>db', 'w>s3', 'w>q'], after: { db: { state: '', sub: 'job 789: CANCELLED' }, w: { sub: 'idle' } } },
        ]},
      ],
    },
    { type: 'h2', text: 'The job status table: one page of truth' },
    { type: 'p', html: `A queue only <em>delivers</em> work; you cannot ask it "how much of job 123 is done?" So every job gets a row in a normal database table. The status can only change along fixed paths (QUEUED to RUNNING, RUNNING to SUCCEEDED...). This is called a <a href="#/pattern-multistep">state machine</a>: a list of states, and which state can move to which.` },
    { type: 'callout', tone: 'term', title: 'Job status table', html: `<strong>What it is:</strong> a database table with one line per job: whose it is, what state it is in, what % is done, how many tries, where the result is, what the error was.<br><strong>Why we need it:</strong> the answer to the user's "how far is my export?" comes from here. The support team also checks here which jobs are stuck.<br><strong>Without it:</strong> you cannot ask the queue (it is only a line). The user would only see a spinner, and nobody would know about crashed jobs.` },
    { type: 'code', text: `CREATE TABLE jobs (
  id              BIGINT PRIMARY KEY,
  user_id         BIGINT,
  type            TEXT,          -- 'analytics_export', 'transcode', ...
  idempotency_key TEXT UNIQUE,   -- double click = same job
  status          TEXT,          -- QUEUED | RUNNING | SUCCEEDED | FAILED | CANCEL_REQUESTED | CANCELLED
  progress        INT,           -- 0..100
  attempts        INT,
  worker_id       TEXT,
  heartbeat_at    TIMESTAMP,     -- is the worker alive?
  result_url      TEXT,
  error           TEXT,
  created_at, started_at, finished_at TIMESTAMP
);
-- QUEUED → RUNNING → SUCCEEDED
--            │  └──→ FAILED (attempts used up → DLQ)
--            └─ CANCEL_REQUESTED → CANCELLED` },
    { type: 'list', items: [
      '<strong>You need both the row and the message:</strong> the API writes to two places: a row in the table and a message in the queue. If the row is written but the API crashes before sending the message, the job stays QUEUED forever and no worker ever picks it up. Fix 1: a <a href="#/kafka">transactional outbox</a> (write the message into an "outbox" table in the same database transaction; a separate process sends it from there to the queue). Fix 2: a <strong>sweeper</strong> (a small cron program) that checks every minute for "QUEUED jobs older than 5 minutes?" and puts them in the queue again.',
      '<strong>Postgres itself can be the queue:</strong> in small systems, instead of a separate broker, workers run <code>SELECT ... FROM jobs WHERE status = \'QUEUED\' ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED</code> directly. Because of SKIP LOCKED, two workers never pick the same job (<a href="#/pattern-contention">Contention lesson</a>). Rails\' Solid Queue (on Postgres 9.5+ / MySQL 8+) works this way; River for Go and pg-boss for Node are also Postgres-backed queues. At very high throughput a dedicated queue is better.',
      '<strong>Old jobs:</strong> the table keeps growing. Archive or delete finished rows after 30-90 days, and put an S3 lifecycle rule on result files (a storage rule that deletes files by itself after 7 days).',
    ]},
    { type: 'callout', tone: 'tip', title: 'When to stop (Rungs 1-2)', html: `If jobs take a few seconds, rarely fail, and there are only a few thousand a day, you can stop here: a Postgres table as both queue and status, and polling on the page. Add a separate broker when jobs reach thousands per second or different teams need different queues.` },

    { type: 'h2', text: 'How to show progress: polling, SSE, webhook' },
    { type: 'p', html: `The full story of these methods is in the <a href="#/realtime">Polling, SSE, WebSockets, webhooks</a> lesson. Remember two big ways: <strong>pull</strong> (the browser asks again and again) and <strong>push</strong> (the server tells by itself).` },
    { type: 'callout', tone: 'term', title: 'Polling and SSE (a reminder)', html: `<strong>What it is:</strong> <strong>Polling</strong> = every few seconds the browser sends <code>GET /jobs/123</code>: "how much is done?". <strong>SSE</strong> (Server-Sent Events) = the browser keeps one connection open, and the server sends a new update on it whenever it wants (only from server to browser).<br><strong>Why we need it:</strong> the job runs on another machine; the news must reach the browser somehow.<br><strong>Without it:</strong> the user would have to press refresh again and again.` },
    { type: 'table', head: ['Method', 'How', 'When'], rows: [
      ['Short polling', 'The browser sends GET /jobs/123 every 2-5 s. The server can suggest the interval with a Retry-After header; for long jobs make the interval longer (2 s → 10 s).', 'The default choice. Simple, works well with caches and load balancers, perfectly fine for jobs that take minutes.'],
      ['SSE', 'GET /jobs/123/events is one open connection; the worker\'s progress (through the DB or Redis pub-sub) streams straight to the browser.', 'When you want a live feel: AI agent steps, build logs, token-by-token output.'],
      ['Webhook', 'When the job ends, we send a POST to the client\'s server.', 'When the client is another server (API customers), not a browser.'],
      ['Email / push notification', 'An "export ready" mail when it ends.', 'Very long work (10+ minutes); the user will close the tab.'],
    ]},
    { type: 'p', html: `<strong>Work out the polling bill yourself.</strong> How many people are waiting for a job at the same time, how many seconds the browser waits between questions, and how long the job is. In polling, every question is one request. SSE has no requests, but every waiting person keeps one connection open. (Assume SSE sends one update every 5% = 21 messages per job.)` },
    { type: 'custom', render(el) {
      const NS = [100, 1000, 10000, 100000];
      el.innerHTML = `<div class="row2">
          <div><label>Users waiting at the same time: <strong class="ltp-vn"></strong></label><input class="ltp-n" type="range" min="0" max="3" step="1" value="2"></div>
          <div><label>Poll interval: <strong class="ltp-vi"></strong></label><input class="ltp-i" type="range" min="1" max="30" step="1" value="3"></div>
          <div><label>Job length: <strong class="ltp-vd"></strong></label><input class="ltp-d" type="range" min="1" max="60" step="1" value="8"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Polling: requests / second</span><strong class="ltp-rps"></strong></div>
          <div class="stat"><span>Polling: requests per job</span><strong class="ltp-rpj"></strong></div>
          <div class="stat"><span>Avg delay before "done" shows</span><strong class="ltp-lag"></strong></div>
          <div class="stat"><span>SSE: open connections</span><strong class="ltp-conn"></strong></div>
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
        $('.ltp-note').textContent = `Polling: ${N.toLocaleString('en-IN')} users / ${I} s = ${f(rps)} requests every second, and almost all of them get the answer "not done yet". A longer interval lowers the load, but "done" shows up ${f(I / 2)} s late on average. SSE: no requests, but ${N.toLocaleString('en-IN')} connections stay open all the time.`;
      };
      el.querySelectorAll('input').forEach(i => i.oninput = upd); upd();
    }},
    { type: 'p', html: `With the defaults (10,000 users, 3 s, an 8-minute job) polling = 3,333 requests per second and 160 requests per job. SSE needs only ~438 messages per second, but 10,000 open connections. So: at small scale use polling (the simplest), and make the interval grow with the job (start at 2 s, then 10 s); with very many people, or when you want a live feel, use SSE.` },
    { type: 'callout', tone: 'warn', title: 'Writing progress is load too', html: `If the worker runs <code>UPDATE jobs SET progress = ...</code> for every row, 10 million rows = 10 million DB writes. Write progress every few seconds or every 1-5%. With very many jobs, keep live progress in Redis and only the final status in the DB.` },

    { type: 'h2', text: 'Rung 3: retries with backoff, idempotency and DLQ' },
    { type: 'p', html: `<strong>A new problem:</strong> xyz.com runs 20,000 exports a day. About 2% of them (400) fail halfway: the database was busy for 10 seconds, the network had a hiccup, a worker restarted during a deploy. Running these again would work. And about 5 jobs a day will never work (bad data). The two kinds need different handling.` },
    { type: 'callout', tone: 'term', title: 'At-least-once delivery', html: `<strong>What it is:</strong> the queue's promise: "every job will reach a worker at least once, sometimes twice". Why twice? The worker finished the work but crashed before sending the ack, so the queue thinks the work never happened.<br><strong>Why we need it:</strong> a job must never be lost. Handling a duplicate is easy; finding lost work is hard.<br><strong>Without it:</strong> with "at-most-once" (at most one time) a crash makes the job disappear.` },
    { type: 'callout', tone: 'term', title: 'Exponential backoff + jitter', html: `<strong>What it is:</strong> after a failure, do not retry at once. Wait 1 minute the first time, then 2, then 4 (double each time = exponential). On top of that add a little randomness (jitter), like 3:40 or 4:20 instead of exactly 4 minutes.<br><strong>Why we need it:</strong> if the database was busy, an instant retry pushes it even harder. A short wait lets it recover. Jitter stops 10,000 failed jobs from coming back in the same second.<br><strong>Without it:</strong> a storm of retries that knocks over a sick database (<a href="#/resilience">Retries and jitter</a> lesson).` },
    { type: 'callout', tone: 'term', title: 'Idempotent job', html: `<strong>What it is:</strong> a job that gives the same result whether it runs once or twice. For example "write the file exports/123.csv" run twice still gives one file. But "send the user an email" run twice = two emails.<br><strong>Why we need it:</strong> with at-least-once, duplicates will come. The job itself must be safe.<br><strong>Without it:</strong> a retry causes a double email, a double charge, two files.` },
    { type: 'callout', tone: 'term', title: 'Dead-letter queue (DLQ)', html: `<strong>What it is:</strong> a separate queue for "bad jobs". A job that still fails after a set number of attempts (like 3) goes here, and an alarm rings.<br><strong>Why we need it:</strong> a poison job (one that will always fail) should not eat worker time, and an engineer can look at it calmly. After the fix, <strong>redrive</strong> it (move it from the DLQ back to the main queue).<br><strong>Without it:</strong> the poison job circles forever, or quietly disappears.` },
    { type: 'list', items: [
      '<strong>Transient vs permanent error:</strong> transient = a short-lived problem (DB busy, network timeout, 503): retry. Permanent = it will never get better (invalid input, "user deleted", corrupt file): retrying is useless, go straight to FAILED with a clear error.',
      '<strong>Where backoff comes from:</strong> in SQS, on failure use <code>ChangeMessageVisibility</code> to show the message again later; Celery and Sidekiq have built-in retry options.',
      '<strong>Max attempts → DLQ:</strong> after 3-5 attempts, the <a href="#/queues">dead-letter queue</a>, status FAILED, an alert. In SQS this setting is <code>maxReceiveCount</code>.',
      '<strong>How to make a job idempotent:</strong> name the output after the job id (<code>exports/123.csv</code>), so a retry overwrites the same file. Before side effects like email or payment, check the status ("already SUCCEEDED? skip") or use an idempotency key. On submit too: the client sends an <code>Idempotency-Key</code>, so a double click creates only one job (<a href="#/pagination-idempotency">Idempotency lesson</a>).',
    ]},
    { type: 'callout', tone: 'tip', title: 'When to stop (Rung 3)', html: `Almost every system needs this rung: retry + idempotency + DLQ is cheap and saves a lot. If your jobs take less than 1 minute, just set the visibility timeout a bit longer than the longest job and stop here. You need heartbeats (the next rung) when jobs are long and unpredictable.` },
    { type: 'h2', text: 'Rung 4: heartbeats (is the worker alive or not?)' },
    { type: 'p', html: `<strong>A new problem:</strong> now some xyz.com jobs take 2 minutes and some take 2 hours (big creators). A worker has picked up a job. How does the system know whether it is working or dead? There are two ways, and the first one has a trap:` },
    { type: 'callout', tone: 'term', title: 'Heartbeat', html: `<strong>What it is:</strong> a small "I am alive" signal from the worker, every few seconds (for example every 10 s). Like the green dot in a video call app: if you see it, the person is online.<br><strong>Why we need it:</strong> we do not know how long a job will take. With heartbeats, a dead worker is caught within 30 seconds, even if the job is 2 hours long.<br><strong>Without it:</strong> either we notice very late that the worker died, or we hand a live worker's job to someone else.` },
    { type: 'list', items: [
      '<strong>Only a fixed visibility timeout:</strong> in SQS, after a message is taken it stays hidden for a fixed time (default 30 s, max 12 hours). If no ack comes, it becomes visible again. If you set a long timeout (2 hours), a dead worker is caught only after 2 hours. If you set a short one (5 min) and the job takes 10 minutes, the job goes to a second worker <strong>while the first one is still running</strong>: double work.',
      '<strong>Heartbeat:</strong> every few seconds the worker says "I am alive and the work is going on": in SQS, push the timeout forward with <code>ChangeMessageVisibility</code>, or set <code>heartbeat_at = now()</code> in the DB. A <strong>reaper</strong> (a small cron program that looks for "dead" jobs) puts RUNNING jobs whose heartbeat is older than 30 s back in the queue. Now you get both a short timeout (fast crash detection) and long jobs. In Temporal this is the activity\'s <em>Heartbeat timeout</em>.',
      '<strong>Zombie worker:</strong> the worker did not die, it was just stuck for 2 minutes (a GC pause = the program stops to clean up its memory, or the network broke). Meanwhile the job went to someone else. The old worker wakes up and writes its result! Protection: check the attempt number in the DB update (attempt = 2): <code>UPDATE jobs ... WHERE id = 123 AND attempts = 1</code> will change 0 rows. This is the same idea as a <a href="#/coordination">fencing token</a>.',
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "just ack the job as soon as you take it, it is simpler"', html: `Many people ack/delete the message as soon as they take it, so that "no duplicates come". Now if the worker crashes, the job is <strong>gone forever</strong>: not in the queue, not with anyone, and the user\'s status is stuck at RUNNING. The right way: <strong>ack after the work is finished</strong> (<code>acks_late</code> in Celery), and handle duplicates with idempotency. At-least-once + idempotent > at-most-once + lost jobs.` },

    { type: 'callout', tone: 'tip', title: 'When to stop (Rung 4)', html: `If jobs are longer than 1-2 minutes or unpredictable, add heartbeats. If all jobs are short and similar, a long fixed timeout is enough; do not write the extra heartbeat code.` },

    { type: 'h2', text: 'Rung 5: checkpoints, cancel and timeouts' },
    { type: 'p', html: `<strong>A new problem:</strong> a big creator's export takes 2 hours. At 1 hour 47 minutes a deploy happened and the worker restarted. The retry started the work again <em>from the beginning</em>. The creator waited 3 hours 47 minutes in total. And this can happen on every deploy.` },
    { type: 'callout', tone: 'term', title: 'Checkpoint', html: `<strong>What it is:</strong> breaking long work into small parts (chunks), and when each part is done, saving its result and "how far we got". Like a save point in a game.<br><strong>Why we need it:</strong> after a crash, the retry only does the remaining parts, not everything from the start.<br><strong>Without it:</strong> in a 2-hour job, every crash can waste up to 2 hours of work.<br><strong>Example:</strong> a 24-month export = 24 chunks. Each month's CSV goes to <code>exports/123/part-07.csv</code>, and the table stores <code>last_done = 7</code>. The retry starts at part 8.` },
    { type: 'p', html: `<strong>Checkpoint lab.</strong> A 120-minute job. Choose the chunk size and the minute of the crash. Saving each checkpoint takes ~5 seconds. See how much work is wasted, and what very small chunks cost.` },
    { type: 'custom', render(el) {
      const CS = [0, 60, 30, 10, 5, 1];
      el.innerHTML = `<div class="row2">
          <div><label>Chunk size: <strong class="ltc-vc"></strong></label><input class="ltc-c" type="range" min="0" max="5" step="1" value="3"></div>
          <div><label>Crash at minute: <strong class="ltc-vx"></strong></label><input class="ltc-x" type="range" min="1" max="119" step="1" value="107"></div>
        </div>
        <svg class="ltc-svg" viewBox="0 0 600 90" style="width:100%;height:auto;display:block;margin-top:10px" role="img" aria-label="Checkpoint timeline"></svg>
        <div class="stats">
          <div class="stat"><span>Wasted work</span><strong class="ltc-lost"></strong></div>
          <div class="stat"><span>Checkpoints</span><strong class="ltc-n"></strong></div>
          <div class="stat"><span>Cost of saving</span><strong class="ltc-ov"></strong></div>
          <div class="stat"><span>Total time (with the crash)</span><strong class="ltc-tot"></strong></div>
        </div>
        <div class="calc-note ltc-note"></div>`;
      const $ = c => el.querySelector(c);
      const upd = () => {
        const C = CS[+$('.ltc-c').value], X = +$('.ltc-x').value, T = 120;
        const saved = C ? Math.floor(X / C) * C : 0, lost = X - saved, n = C ? T / C : 0, ov = n * 5 / 60;
        const tot = T + lost + ov;
        $('.ltc-vc').textContent = C ? C + ' min' : 'no checkpoints'; $('.ltc-vx').textContent = X + ' min';
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
        $('.ltc-note').textContent = C ? `Green = already saved (${saved} min), red = wasted (${lost} min). The retry starts at minute ${saved}. ${n} checkpoints x 5 s = ${Math.round(ov * 10) / 10} min extra.` : `No checkpoints: the crash wastes all ${X} minutes, and the retry starts from zero.`;
      };
      el.querySelectorAll('input').forEach(i => i.oninput = upd); upd();
    }},
    { type: 'p', html: `Crash at minute 107: without checkpoints, 107 minutes are wasted (227 min in total). With 10-minute chunks only 7 minutes are wasted, and 12 checkpoints cost 1 minute (128 min in total). With 1-minute chunks nothing is wasted, but 120 checkpoints cost 10 minutes (130 min in total). So chunks should be neither too big nor too small.` },
    { type: 'h3', text: 'Cancel and timeouts' },
    { type: 'list', items: [
      '<strong>Cancel is cooperative:</strong> the API only writes <code>CANCEL_REQUESTED</code>. The worker checks the flag at every chunk/checkpoint (or in the reply to its heartbeat), cleans up the partial output, then sets CANCELLED. If the job is still waiting in the queue, the worker sees the status as soon as it picks it up and skips it.',
      '<strong>Why not kill it?</strong> Killing a process in the middle can leave half files, open DB transactions, or a half-sent email. A hard kill is only the last resort: "it still has not stopped 5 minutes after cancel".',
      '<strong>A max runtime for every job:</strong> an export running for more than 30 minutes? Something is wrong (an endless loop, a stuck query). The worker stops itself or a supervisor kills it, status FAILED (timeout). In Kubernetes Jobs, <code>activeDeadlineSeconds</code> does exactly this.',
      '<strong>How long in the queue:</strong> if a job has been QUEUED for 1 hour, either there are too few workers or they are stuck. Add an alert on "oldest message age"; it is a better signal than queue depth.',
    ]},
    { type: 'callout', tone: 'tip', title: 'When to stop (Rung 5)', html: `Add checkpoints when a job takes 10+ minutes and splits easily into parts (months, files, URLs). Add a Cancel button when users can start long work by mistake. <em>Always</em> add a max runtime (timeout): it is cheap and catches stuck jobs.` },

    { type: 'h2', text: 'Job simulator: rungs 1-5 together' },
    { type: 'p', html: `3 workers, one queue, one job table. Move time forward with "Next tick" (or Auto play). Try this: (1) <strong>Kill</strong> a busy worker and see after how many ticks its job goes to another worker; (2) add a <strong>Poison job</strong>: 3 attempts with a growing wait in between (2, then 4 ticks), then the DLQ; (3) switch to the "Visibility timeout only" mode: a dead worker's job now comes back only a full 12 ticks after it was received (only 3 ticks with heartbeats), and the 16-tick long job is delivered again while the live worker is still running it (Duplicate runs goes up); (4) <strong>Cancel</strong> a running job.` },
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
          log(`${id} submit (${kind === 'poison' ? 'poison' : kind === 'long' ? 'long, ' + dur + ' ticks' : dur + ' ticks'}) → 202 Accepted, status QUEUED`);
          return id;
        };
        S.kill = wid => { const w = S.workers.find(x => x.id === wid); if (!w.alive) return; w.alive = false; log(`${wid} crash! ${w.job ? w.job + ': its message is still invisible, no ack was sent' : 'it had no job'}`); };
        S.revive = wid => { const w = S.workers.find(x => x.id === wid); if (w.alive) return; w.alive = true; w.job = null; w.prog = 0; log(`${wid} restart, idle`); };
        S.cancelJob = id => { const j = S.jobs.find(x => x.id === id); if (['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(j.status)) return; if (j.status === 'RUNNING') { j.cancel = true; j.status = 'CANCELLING'; log(`${id} cancel requested: the worker will stop at the next checkpoint`); } else { j.status = 'CANCELLED'; log(`${id} cancel: it was still in the queue, straight to CANCELLED`); } };
        const free = (w, j) => { w.job = null; w.prog = 0; j.on = j.on.filter(x => x !== w.id); };
        S.tick = () => {
          S.t++;
          S.workers.forEach(w => {
            if (!w.alive || !w.job) return;
            const j = S.jobs.find(x => x.id === w.job);
            if (j.status === 'SUCCEEDED') { log(`${w.id} saw ${j.id} is already SUCCEEDED: dropped its duplicate copy (status check + same output key, idempotent)`); free(w, j); return; }
            if (j.cancel) { j.status = 'CANCELLED'; log(`${w.id} saw the cancel flag on ${j.id}, cleaned the partial output, CANCELLED`); free(w, j); return; }
            w.prog++;
            j.progress = Math.max(j.progress, w.prog);
            if (S.hb) j.leaseUntil = S.t + S.HBT;
            if (j.kind === 'poison' && w.prog >= Math.ceil(j.dur / 2)) {
              free(w, j); j.progress = 0;
              if (j.attempts >= S.MAX) { j.status = 'FAILED'; S.dlq.push(j.id); log(`${j.id} attempt ${j.attempts} failed. maxReceiveCount ${S.MAX} reached → DLQ + alert, status FAILED`); }
              else { const back = 2 * Math.pow(2, j.attempts - 1); j.status = 'RETRY_WAIT'; j.visibleAt = S.t + back; j.leaseUntil = -1; log(`${j.id} attempt ${j.attempts} failed (error). Retry after ${back} ticks (backoff)`); }
              return;
            }
            if (w.prog >= j.dur) { j.status = 'SUCCEEDED'; j.progress = j.dur; log(`${w.id} finished ${j.id} → result in S3, status SUCCEEDED, message ack/delete`); free(w, j); j.leaseUntil = -1; }
          });
          S.jobs.forEach(j => {
            if ((j.status === 'RUNNING' || j.status === 'CANCELLING') && j.leaseUntil >= 0 && j.leaseUntil <= S.t) {
              j.leaseUntil = -1; j.visibleAt = S.t;
              const alive = j.on.some(id => S.workers.find(w => w.id === id).alive);
              log(`${j.id}: ${S.hb ? 'no heartbeat for ' + S.HBT + ' ticks' : 'visibility timeout (' + S.VT + ' ticks) ran out'} → message visible again` + (alive ? ' (but the worker is still running!)' : ''));
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
            if (j.on.length) { S.dups++; log(`DUPLICATE: ${j.id} is now running on both ${j.on[0]} and ${w.id} (double work)`); }
            j.status = 'RUNNING'; j.on.push(w.id); w.job = j.id; w.prog = 0;
            j.leaseUntil = S.t + (S.hb ? S.HBT : S.VT);
            log(`${w.id} picked up ${j.id} (receive #${j.attempts})`);
          });
        };
        return S;
      }
      el.innerHTML = `<div class="lt-hb" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px"><span style="font-size:14px;color:var(--ink-2)">Worker liveness (this resets):</span></div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          <button type="button" class="btn small primary lt-sub">+ Export job</button>
          <button type="button" class="btn small lt-long">+ Long job (16 ticks)</button>
          <button type="button" class="btn small lt-poison">+ Poison job</button>
          <button type="button" class="btn small primary lt-tick">Next tick</button>
          <button type="button" class="btn small ghost lt-play">Auto play</button>
          <button type="button" class="btn small ghost lt-reset">Reset</button>
        </div>
        <div class="lt-workers" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:12px"></div>
        <div class="lt-jobs" style="margin-top:12px;display:grid;gap:6px"></div>
        <div class="stats">
          <div class="stat"><span>Clock</span><strong class="lt-t"></strong></div>
          <div class="stat"><span>In the queue (visible)</span><strong class="lt-q"></strong></div>
          <div class="stat"><span>DLQ</span><strong class="lt-dlq"></strong></div>
          <div class="stat"><span>Duplicate runs</span><strong class="lt-dup"></strong></div>
        </div>
        <ol class="lt-log" style="font:12.5px/1.5 var(--f-mono);color:var(--ink-2);margin:12px 0 0;padding-left:22px;max-height:220px;overflow:auto"></ol>`;
      const $ = s => el.querySelector(s);
      let hb = true, S, timer = null;
      const COL = { QUEUED: 'var(--ink-3)', RUNNING: 'var(--accent)', CANCELLING: 'var(--amber)', RETRY_WAIT: 'var(--amber)', SUCCEEDED: 'var(--green)', FAILED: 'var(--red)', CANCELLED: 'var(--ink-3)' };
      const reset = () => { S = ltSim(hb); S.submit('normal'); S.submit('normal'); S.submit('long'); S.submit('normal'); stop(); draw(); };
      const stop = () => { if (timer) clearInterval(timer); timer = null; $('.lt-play').textContent = 'Auto play'; };
      [[true, 'Heartbeat ON (3 ticks)'], [false, 'Visibility timeout only (12 ticks)']].forEach(([v, l]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = l; b.dataset.v = v; b.onclick = () => { hb = v; reset(); }; $('.lt-hb').appendChild(b); });
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
          r.innerHTML = `<div style="font:13px var(--f-mono);color:var(--ink)">${j.id} ${j.kind === 'poison' ? '(poison)' : j.kind === 'long' ? '(long)' : ''} <strong style="color:${COL[j.status]}">${j.status}</strong> · attempts ${j.attempts}${j.on.length ? ' · ' + j.on.join('+') : ''}</div><div class="lt-act"></div>
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
    { type: 'p', html: `What the default setup (3 export jobs + 1 long one) shows: with heartbeats ON, kill W1 at tick 3 and its job is back in the queue at tick 6 (3 ticks); another worker picks it up as soon as it is free (attempts = 2). With the visibility timeout only, even without any crash, at tick 13 the long job J3 is running on two workers: Duplicate runs = 1. A poison job always goes to the DLQ after 3 receives.` },

    { type: 'h2', text: 'Rung 6: scale and fairness' },
    { type: 'p', html: `<strong>A new problem:</strong> at 9 pm creators all ask for exports at once: 10 new jobs every minute, and each job takes ~6 minutes. How many workers do we need? A simple rule (<strong>Little's law</strong>): busy workers at any moment = jobs arriving per minute x minutes per job = 10 x 6 = <strong>60</strong>. With 40 workers, ~3 jobs pile up in the line every minute.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>New jobs per minute: <strong class="lts-vl"></strong></label><input class="lts-l" type="range" min="1" max="40" step="1" value="10"></div>
          <div><label>Minutes per job: <strong class="lts-vs"></strong></label><input class="lts-s" type="range" min="1" max="30" step="1" value="6"></div>
          <div><label>Workers: <strong class="lts-vw"></strong></label><input class="lts-w" type="range" min="5" max="200" step="5" value="40"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Workers needed</span><strong class="lts-need"></strong></div>
          <div class="stat"><span>How busy the workers are</span><strong class="lts-u"></strong></div>
          <div class="stat"><span>Line growth per hour</span><strong class="lts-g"></strong></div>
        </div>
        <div class="calc-note lts-note"></div>`;
      const $ = c => el.querySelector(c);
      const upd = () => {
        const L = +$('.lts-l').value, S = +$('.lts-s').value, W = +$('.lts-w').value;
        const need = L * S, done = W / S, grow = Math.round((L - done) * 60);
        $('.lts-vl').textContent = L; $('.lts-vs').textContent = S + ' min'; $('.lts-vw').textContent = W;
        $('.lts-need').textContent = need; $('.lts-u').textContent = Math.min(100, Math.round(need / W * 100)) + '%';
        $('.lts-g').textContent = grow > 0 ? '+' + grow + ' jobs' : 'does not grow';
        $('.lts-note').textContent = grow > 0 ? `The workers finish only ${Math.round(done * 10) / 10} jobs per minute, but ${L} arrive. The line will grow by ${grow} jobs every hour. The autoscaler should add workers based on "queue depth" or "age of the oldest job".` : `There are enough workers. ${Math.round(need / W * 100)}% busy. Do not go close to 100%: a small rush makes the line long at once, so stop at ~70-80% and add more workers.`;
      };
      el.querySelectorAll('input').forEach(i => i.oninput = upd); upd();
    }},
    { type: 'list', items: [
      '<strong>Scale workers separately:</strong> web servers scale with the request rate, workers with queue depth / oldest message age. At night with 0 jobs, fewer workers too (autoscaling, or serverless like Lambda for small jobs; Lambda\'s max runtime is 15 minutes, so use containers for long jobs).',
      '<strong>One user eats everything:</strong> one creator added 500 exports, and everyone else is stuck in the line. Use a per-user limit (max 3 jobs at a time), or a separate queue per tenant / weighted fair scheduling.',
      '<strong>Keep small and big jobs apart:</strong> 5-second thumbnail jobs should not get stuck behind 2-hour exports. Use separate queues and separate worker pools (<a href="#/resilience">bulkhead</a>). Priority queues: paid users\' jobs first.',
    ]},
    { type: 'callout', tone: 'tip', title: 'When to stop (Rung 6)', html: `Only one kind of job and one kind of user? One queue + autoscaling is enough. Add separate queues, priorities and per-user limits when a big user or big jobs really do block the others (you will see it in the oldest job age on the dashboard).` },

    { type: 'h2', text: 'Rung 7: workflow engine' },
    { type: 'p', html: `<strong>A new problem:</strong> an xyz.com AI feature: "make captions for all my videos, then let me approve them, then translate them into 9 languages". Now this is not one job but a story of many steps, with a human waiting a whole day in the middle. Writing the retry, timeout and "how far did we get" for every step yourself becomes a lot of code.` },
    { type: 'callout', tone: 'term', title: 'Workflow engine', html: `<strong>What it is:</strong> a tool (Temporal, AWS Step Functions) where you write a list of steps, and it handles each step's status, retries, timeouts, heartbeats and waiting by itself. Even after a crash it continues from the same place.<br><strong>Why we need it:</strong> when a job is no longer one task but a story: many steps, timers, human approval.<br><strong>Without it:</strong> you end up building a half-finished workflow engine on top of your own status table and queue.<br><strong>When not to use it:</strong> a one-step export? You do not need to run one more big system. The full story is in the <a href="#/pattern-multistep">Multi-step processes</a> lesson.` },
    { type: 'callout', tone: 'tip', title: 'Real examples', html: `Video transcoding (making every resolution after an upload), report exports, LLM agent tasks (an agent runs tools for 10 minutes, progress over SSE), web crawling (each URL is a job, tens of millions of jobs), backup/restore, bulk email. Everywhere the same shape: accept → queue → workers → status → result.` },

    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Decide: how to run a long-running task', html: `The roadmap pattern: <strong>job queue, workers, status table, progress updates, retries, timeouts, dead-letter queues</strong>. Rule of thumb:<br>• Work longer than ~1-2 seconds or unpredictable → do not run it in the request. <strong>202 + job_id</strong>, a queue, workers.<br>• The user needs the status → a <strong>status table</strong>; for progress, polling by default, SSE for a live feel, a webhook for server-to-server.<br>• Always: <strong>ack after work</strong>, idempotent jobs, retries with backoff + jitter, max attempts → <strong>DLQ</strong> + alert.<br>• Jobs longer than minutes → <strong>heartbeat</strong> (extend visibility / heartbeat_at), checkpoints, a cancel flag, a max runtime.<br>• Many steps, timers, humans → a <strong>workflow engine</strong> (Temporal, Step Functions).<br>The roadmap line: "Do this task" → queue.` },

    { type: 'h2', text: 'The whole design at a glance' },
    { type: 'p', html: `The xyz.com export system, with every rung in its place. Click any box, and use the buttons below to see one path at a time.` },
    { type: 'diagram', title: 'Long-running tasks: the full picture', height: 640,
      groups: [
        { label: 'Async: background work', x: 250, y: 196, w: 460, h: 294 },
      ],
      nodes: [
        { id: 'app', label: 'Creator app', sub: 'export + status', x: 90, y: 70, kind: 'client', info: 'What it is: the creator\'s browser or app. It asks for the export, keeps the job_id, watches the progress, and at the end downloads the file with a pre-signed URL.' },
        { id: 'push', label: 'Notifier', sub: 'SSE / email', x: 330, y: 70, kind: 'server', info: 'What it is: the push part (Rung 2). It sends the job\'s progress or "done" live to the browser over SSE, and an email for very long jobs. If polling is enough, you do not need this box.' },
        { id: 's3', label: 'Object storage', sub: 'chunks + result', x: 560, y: 70, kind: 'data', info: 'What it is: a file store like S3. Every checkpoint chunk (part-07.csv) and the final file live here. Names come from the job id, so a retry overwrites the same file (idempotent).' },
        { id: 'api', label: 'Jobs API', sub: '202 + job_id', x: 90, y: 250, kind: 'server', info: 'What it is: the light web API (Rung 1). It checks the Idempotency-Key, writes the job row, puts a message in the queue, and returns 202 in 50 ms. It answers status questions from the jobs table.' },
        { id: 'q', label: 'Job queue', sub: 'export / thumbs', x: 330, y: 250, kind: 'queue', info: 'What it is: the line of jobs (Rungs 1, 6). Small and big jobs have separate queues so small jobs do not get stuck behind big ones. A message is removed only after the ack.' },
        { id: 'w', label: 'Workers', sub: 'autoscaled pool', x: 560, y: 250, kind: 'server', info: 'What it is: the machines that do the work. They autoscale on queue depth / oldest job age (Rung 6). A heartbeat every 10 s, a checkpoint and a cancel-flag check at every chunk (Rungs 4, 5).' },
        { id: 'db', label: 'Jobs table', sub: 'status, %, HB', x: 90, y: 430, kind: 'data', info: 'What it is: one row per job (Rung 2): status, progress, attempts, heartbeat_at, last chunk, result key, error. Both the user and the support team look here.' },
        { id: 'reaper', label: 'Reaper', sub: 'dead HB → retry', x: 330, y: 430, kind: 'server', info: 'What it is: a small cron program (Rung 4). Every 10 s it checks: which RUNNING job has a heartbeat older than 30 s? It puts that job back in the queue. Like a sweeper, it also re-sends stuck QUEUED jobs.' },
        { id: 'dlq', label: 'DLQ + alarm', sub: 'poison jobs', x: 560, y: 430, kind: 'queue', info: 'What it is: the dead-letter queue (Rung 3). Jobs that still fail after 3 attempts land here, status FAILED, and the on-call engineer gets an alarm. Redrive after the fix.' },
        { id: 'wf', label: 'Workflow engine', sub: 'Rung 7: many steps', x: 330, y: 590, w: 180, kind: 'server', info: 'What it is: a tool like Temporal / Step Functions (Rung 7). Only when a job becomes a story with many steps, timers or human approval. It runs each step on the workers.' },
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
        { a: 'wf', b: 'w', dashed: true, label: 'each step' },
      ],
      paths: [
        { name: 'Submit', text: 'The creator pressed Export. The API wrote a row (QUEUED), put a message in the queue, and returned 202 + job_id at once.', go: ['app>api>db', 'api>q', 'res:api>app'] },
        { name: 'Work + progress', text: 'A worker picked up the job, wrote chunks to storage and progress to the table. When done, the notifier told the app, and the app downloaded the file.', go: ['q>w>s3', 'w>db', 'evt:w>push>app', 'app>s3'] },
        { name: 'Crash + heartbeat', text: 'The worker died and its heartbeat stopped. The reaper caught it after 30 s and put the job back in the queue. A new worker starts from the last checkpoint.', go: ['reaper>db', 'reaper>q>w'] },
        { name: 'Poison → DLQ', text: 'A job with bad data failed 3 times (with backoff). Then it went to the DLQ, status FAILED, and the alarm rang.', go: ['q>w', 'bad:w>dlq', 'w>db'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Long work does not belong inside a request. Return 202 + job_id at once; the work happens in a queue and on workers.</li>
      <li>Use a jobs table for status. The queue only delivers the work.</li>
      <li>Progress: polling by default (make the interval grow), SSE for a live feel or very many users, email for very long jobs.</li>
      <li>Ack after the work. At-least-once + idempotent jobs (name the output after the job id).</li>
      <li>Retry with exponential backoff + jitter; after max attempts, DLQ + alarm.</li>
      <li>Long jobs: heartbeat + reaper; stop zombie workers with the attempt number (fencing).</li>
      <li>Jobs of 10+ minutes: checkpoints. Cancel = a flag, not a kill. A max runtime for every job.</li>
      <li>Workers = jobs per minute x minutes per job (Little's law). Many steps / humans = a workflow engine.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['Web servers stay fast and free; long work does not block them', 'Work still finishes after a crash, deploy or timeout (retry)', 'The user gets a clear status and progress, and can close the tab and come back', 'Workers scale on their own; spikes are absorbed by the queue', 'Poison jobs are set aside in the DLQ, and the rest of the system keeps running'],
      costs: ['More moving parts: queue, workers, status table, reaper, storage', 'At-least-once: every job must be made idempotent', 'Keeping the status table and the queue in sync (outbox / sweeper)', 'Extra code for heartbeats, cancel and checkpoints', 'The user does not get the result at once; the UX needs a "processing" state'] },

    { type: 'think', questions: [
      { q: 'AI agent feature: a user gives a task, and the agent runs web searches and tools for 5-15 minutes. Design it.', a: 'POST /tasks → 202 + task_id, row QUEUED. A worker (a container, not Lambda, because 15 minutes is close to its limit) picks up the task, and after each tool call it publishes the progress/step on Redis pub-sub and writes a checkpoint to the DB. The browser watches the steps live over SSE; if SSE breaks, it gets the status from GET /tasks/:id. Heartbeat every 10 s, max runtime 30 minutes, a cooperative Cancel button (check the flag after each step). Retry with backoff on 429/503 from the LLM API; tool side effects (sending email) use an idempotency key. After 3 failures, FAILED + DLQ. If the agent needs the user\'s approval in the middle, this moves toward a workflow engine.' },
      { q: 'The SQS visibility timeout is 30 s and your transcode job takes 4 minutes. What happens, and what are 2 fixes?', a: 'After 30 s the message is visible again, a second worker starts transcoding the same video, then a third... a new duplicate every 30 s, and the receive count keeps rising; the job may even end up in the DLQ although it never failed. Fix 1: set the visibility timeout above the job\'s max duration (like 6 x the expected time, but then crash detection is slow). Fix 2 (better): a short timeout + a heartbeat that keeps extending the time with ChangeMessageVisibility. Plus idempotent output.' },
      { q: 'The status table shows the job as SUCCEEDED, but the user says the download link gives 403. What could be wrong?', a: 'The pre-signed URL expired (the link was valid for 15 minutes and the user came back 2 days later), or the S3 lifecycle rule deleted the file. Fix: the status API should make a fresh signed URL every time (store only the object key in the DB, not the URL), and show the user the expiry policy ("available for 7 days").' },
    ]},
    { type: 'quiz', questions: [
      { q: 'An 8-minute export request comes in. What should the API return?', options: ['200 OK, with the file after 8 minutes', '202 Accepted + job_id (and a status URL)', '504 Gateway Timeout', '201 Created with the file'], answer: 1, explain: '202 = "accepted, the work will happen later". The client checks the status with the job_id. Keeping a connection open for 8 minutes would break on the timeouts of the proxies in the middle.' },
      { q: 'A worker acks the message as soon as it takes the job, then does the work. The worker crashes. What happens?', options: ['The job is delivered again', 'The job is lost forever and its status stays stuck at RUNNING', 'The job goes to the DLQ', 'The queue restarts the worker'], answer: 1, explain: 'Ack means "delete the message". If the ack came first, the queue has nothing left. Ack after the work and handle duplicates with idempotency.' },
      { q: 'Fixed visibility timeout of 5 minutes, a 10-minute job, no heartbeat. What happens?', options: ['Nothing, the job finishes in 10 minutes', 'After 5 minutes the job also goes to another worker, while the first one is still running', 'The job goes straight to the DLQ', 'The queue cancels the job at 5 minutes'], answer: 1, explain: 'After the visibility timeout the message becomes visible again. Another worker takes it: duplicate work. You need a heartbeat (extend the visibility) or a longer timeout, and an idempotent job.' },
      { q: '12 new jobs arrive every minute, and each job takes 5 minutes. At least how many workers do you need so the line does not grow?', options: ['12', '60', '17', '5'], answer: 1, explain: "Little's law: busy workers = 12 jobs/min x 5 min = 60. With fewer workers the line grows every minute. In practice keep a few more (~75-85) so the workers are not 100% busy." },
      { q: 'A 2-hour export with 10-minute checkpoints. It crashes at minute 95. Where does the retry start?', options: ['From minute 0', 'From minute 90', 'From minute 95', 'The job becomes FAILED'], answer: 1, explain: 'The last saved checkpoint is at minute 90. The work from minute 90-95 (5 minutes) is wasted; the rest is kept.' },
      { q: 'A job fails every time on corrupt input. What is the right handling?', options: ['Retry every second forever', 'A few attempts with backoff, then DLQ + status FAILED + alert', 'Ignore the error and write SUCCEEDED', 'Restart the worker'], answer: 1, explain: 'A poison message will always fail. Limited retries (for short-lived errors), then the DLQ so the other jobs are not blocked, FAILED for the user and an alert for the team. Redrive after the fix.' },
    ]},
    { type: 'sources', note: 'Queue-specific defaults and limits were checked in these docs.', items: [
      { title: 'Amazon SQS visibility timeout', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html', used: 'Default 30 s, max 12 hours, extending with ChangeMessageVisibility.' },
      { title: 'Detecting Activity failures (heartbeat timeout)', publisher: 'Temporal documentation', official: true, url: 'https://docs.temporal.io/encyclopedia/detecting-activity-failures', used: 'The heartbeat timeout idea for long activities.' },
      { title: 'Solid Queue README', publisher: 'Rails (GitHub)', official: true, url: 'https://github.com/rails/solid_queue', used: 'A DB-backed queue using FOR UPDATE SKIP LOCKED on Postgres 9.5+ / MySQL 8+.' },
      { title: 'Lambda quotas (function timeout 900 s)', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html', used: 'The 15-minute max runtime for Lambda functions.' },
      { title: 'Application Load Balancer attributes: connection idle timeout', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-load-balancer-attributes.html', used: 'The default idle timeout of 60 seconds (the "60-second wall").' },
      { title: 'Kubernetes Jobs (activeDeadlineSeconds)', publisher: 'Kubernetes documentation', official: true, url: 'https://kubernetes.io/docs/concepts/workloads/controllers/job/', used: 'A max runtime for a Job; the job is marked Failed with DeadlineExceeded.' },
      { title: 'Celery: Should I use retry or acks_late?', publisher: 'Celery documentation', official: true, url: 'https://docs.celeryq.dev/en/stable/faq.html#faq-acks-late-vs-retry', used: 'Ack after the task runs (acks_late) and the need for idempotent tasks.' },
    ]},
  ],
});
