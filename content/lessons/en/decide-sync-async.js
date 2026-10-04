Lesson.register({
  id: 'decide-sync-async',
  title: 'Sync or async?',
  minutes: 24,
  summary: `Every new task raises one question: do we keep the user waiting right here until the work is done (sync), or do we say "got it, we will tell you later" and put it in a queue (async)? In this lesson you will learn to read the signals, use a decision helper, and see how the wrong choice can bring a site down.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `When you press a button in an app, there are two ways to handle it.<br>One: the app holds you until the work is finished, then answers. This is <strong>sync</strong>.<br>Two: the app says "got it, the work is running, we will tell you when it is done", and you move on. This is <strong>async</strong>.<br>The first way is best for small tasks. The second way is best for long tasks, or tasks you cannot fully trust.<br>In this lesson you will learn how to tell which task needs which way.` },
    { type: 'h2', text: 'The problem: the upload button was stuck for 40 seconds' },
    { type: 'p', html: `xyz.com is now a video platform. In earlier lessons we learned about the <a href="#/queues">Queue</a>, <a href="#/kafka">Kafka</a>, and <a href="#/resilience">timeouts and retries</a>. Now a new developer writes the upload API. The plan is one straight line:` },
    { type: 'list', ordered: true, items: [
      'Save the video.',
      'Transcode the video (convert it to 360p, 720p, 1080p).',
      'Make a thumbnail (a small preview picture).',
      'Update the search index, so the video shows up in search.',
      'Send an "upload complete" email.',
      '<em>Then</em> answer the user.',
    ]},
    { type: 'p', html: `All of it, one step after another, inside a single request. The whole time, the user stares at "Uploading..." on the screen.` },
    { type: 'callout', tone: 'term', title: 'New word: Timeout', html: `<strong>What it is:</strong> a limit on waiting. "If no answer comes in this many seconds, give up and return an error."<br><strong>Why we need it:</strong> the browser, the Load Balancer and the mobile network cannot wait on one request forever. Their connections and memory stay tied up.<br><strong>Without it:</strong> one stuck request would stay open forever, and thousands of them would fill up the server.<br><strong>Example:</strong> the default idle timeout of an AWS Application Load Balancer is 60 seconds. xyz.com has set its LB to 30 seconds.` },
    { type: 'p', html: `The result: a 5 minute video takes about 40 seconds to transcode. The LB timeout cuts the request at 30 seconds. The user sees an error. They upload again. Now the server is running <strong>two</strong> transcoding jobs. The mistake was not in the code. It was in the <strong>decision</strong>: this work should never have been sync.` },
    { type: 'callout', tone: 'term', title: 'New word: Synchronous (sync)', html: `<strong>What it is:</strong> the caller (a user or another service) sends a request and <em>waits right there</em> until the work is finished and the answer comes back. Like a phone call: you stay on the line until the other person answers. A normal HTTP request and response works this way.<br><strong>Why we need it:</strong> when the user cannot move on without the answer (like login), simply waiting is the simplest and fastest option.<br><strong>Without it:</strong> even tiny tasks would need a "we will tell you later" step. A 50 ms login would feel strange and slow.` },
    { type: 'callout', tone: 'term', title: 'New word: Asynchronous (async)', html: `<strong>What it is:</strong> the server <em>accepts</em> the request, writes the task down somewhere (like in a <a href="#/queues">Queue</a>), and says "got it" right away. The real work happens later. Like a WhatsApp message: you send it, and the other person reads it when they can. You carry on with your own things.<br><strong>Why we need it:</strong> for long tasks (minutes) it is impossible to keep the user waiting. A timeout will cut the request.<br><strong>Without it:</strong> the upload story above: timeouts, user retries, and double work.` },
    { type: 'callout', tone: 'term', title: 'New word: Job and Worker', html: `<strong>What it is:</strong> a <strong>job</strong> is a note describing one task, like "transcode video 42". Each job has an ID (<code>j_42</code>). A <strong>worker</strong> is a separate background program that takes jobs from the queue and does them one by one. No user is waiting in front of a worker.<br><strong>Why we need it:</strong> to separate the work from the user's request. The API writes the note, the worker does the work.<br><strong>Without it:</strong> the API would have to do everything itself, and the user would have to wait the whole time.` },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "async = fast"', html: `Async does <strong>not</strong> make the work faster. Transcoding still takes 40 seconds (a little more, because of the queue). The only difference is that <em>the user is not held for those 40 seconds</em>, and the server's thread and connection stay free. Async moves the "waiting" away from the user and into the system.` },

    { type: 'h2', text: 'The roadmap decision table' },
    { type: 'p', html: `This table turns "it depends" into concrete signals. Look for these signals when you read the requirements:` },
    { type: 'table', head: ['Go synchronous (request / response) when…', 'Go asynchronous (queue + worker) when…'], rows: [
      ['The user needs the result to continue (login, loading a page)', 'The work is slow: seconds to hours (video transcoding, report generation, ML jobs)'],
      ['The work finishes in well under a second', 'Traffic is spiky and you want to smooth it (flash sale orders)'],
      ['The chain of calls is short (2-3 hops)', 'Many downstream systems react to one event'],
      ['Failure should be shown right away', 'A third party is slow or flaky and retries are needed'],
    ], caption: 'Source: roadmap phase 5, "Synchronous or asynchronous?"' },
    { type: 'callout', tone: 'term', title: 'New word: Hop', html: `<strong>What it is:</strong> one network call from one service to another. User → API → Payment service → Bank = 3 hops.<br><strong>Why we count them:</strong> every hop takes some time and can fail. Counting hops tells you how fragile a sync chain is.<br><strong>Without counting:</strong> people call 8-10 services one after another, in sync, and then wonder why the site is slow and unreliable.` },
    { type: 'callout', tone: 'term', title: 'New word: Third party and flaky', html: `<strong>What it is:</strong> a <strong>third party</strong> is a service run by another company, outside your control (an SMS sender, an email sender, a payment company). <strong>Flaky</strong> means it sometimes works and sometimes times out or returns errors, with no clear pattern.<br><strong>Why it matters:</strong> you cannot fix them. You can only protect your users from their problems.<br><strong>Without care (if you keep it in sync):</strong> every hiccup they have shows up as an error for your user.` },

    { type: 'h2', text: 'Each row, one by one: scenario, reason, trap' },
    { type: 'p', html: `Each line of the table is a <strong>signal</strong>: the part of a requirement that changes the decision. Let us look at each signal on a real xyz.com feature. Each one also has a <strong>trap</strong>: the mistake people often make.` },
    { type: 'h3', text: 'Sync 1: the user needs the result to continue' },
    { type: 'p', html: `<strong>Scenario:</strong> logging in to xyz.com. Without logging in, the user cannot reach the home page.<br><strong>Reason:</strong> the user is waiting anyway. Saying "we will tell you later" does not end their wait. It only adds an extra status check.<br><strong>Trap:</strong> "the user needs the result" does not always mean sync. In a video upload the user also wants the result, but the work takes minutes. It is still async; you just show progress. This signal points to sync only when the work is also short.` },
    { type: 'h3', text: 'Sync 2: the work finishes in well under a second' },
    { type: 'p', html: `<strong>Scenario:</strong> opening a video page. Reading the title, likes and comments from the database takes about 30-80 ms.<br><strong>Reason:</strong> putting such a small task in a queue makes it slower. The queue is an extra hop, and you also wait for a worker to pick it up.<br><strong>Trap:</strong> assuming "it is fast now" will always be true. If the page ever takes 5 seconds (for example, a query without an index), the fix is the query, not async.` },
    { type: 'h3', text: 'Sync 3: the chain of calls is short (2-3 hops)' },
    { type: 'p', html: `<strong>Scenario:</strong> the "Like" button: App → Like API → database. 2 hops.<br><strong>Reason:</strong> fewer hops means less time added up and fewer chances to fail. Sync is safe here.<br><strong>Trap:</strong> chains grow slowly. Today the Like API only calls the database. Tomorrow someone adds "also send a notification for each like", in sync. Every new side task can become an async event instead.` },
    { type: 'h3', text: 'Sync 4: failure should be shown right away' },
    { type: 'p', html: `<strong>Scenario:</strong> choosing a username. "riya123 is already taken" must show up in the same second.<br><strong>Reason:</strong> the user's next step depends on this answer (they try another name). An error that arrives later is useless.<br><strong>Trap:</strong> thinking "async can show failures too". It can, but by then the user has already moved on. So even in an async design, run the checks that can be done at once (is the input valid? is the user logged in?) in sync, <em>before</em> returning 202.` },
    { type: 'h3', text: 'Async 1: the work is slow (seconds to hours)' },
    { type: 'p', html: `<strong>Scenario:</strong> video transcoding (minutes), a creator's "monthly earnings report" PDF (minutes), automatic captions made by AI (minutes).<br><strong>Reason:</strong> no request can wait that long. A timeout will hit, and the server's thread (the part that handles one request) stays busy the whole time.<br><strong>Trap:</strong> raising the timeout to 10 minutes. The proxies in between, the mobile network and the user's patience will all break first anyway.` },
    { type: 'h3', text: 'Async 2: traffic is spiky and needs smoothing' },
    { type: 'p', html: `<strong>Scenario:</strong> xyz.com runs "Premium 50% off, only at 10 o'clock". At 10:00 there are 5 lakh "Buy" clicks in one minute. On a normal day there are only 50 per minute.<br><strong>Reason:</strong> a queue separates the speed at which work arrives from the speed at which it is done. Clicks line up in the queue. Workers process them at their own steady speed. This is called <a href="#/queues">load levelling</a>.<br><strong>Trap:</strong> a queue does not cure constant overload. If more work arrives every minute than the workers can handle, the line just keeps growing.` },
    { type: 'h3', text: 'Async 3: many systems react to one event' },
    { type: 'p', html: `<strong>Scenario:</strong> a new video is published. Search must index it, followers must get a notification, recommendations must update, and analytics must count it.<br><strong>Reason:</strong> the Upload API publishes an <strong>event</strong>. An event is a short message saying "this happened", like "video 42 published". Each team picks up its own work. When a new team joins, the API code does not change. This is <a href="#/queues">pub/sub</a>.<br><strong>Trap:</strong> calling all four from the API in sync. If any one team's service is slow, the upload is slow. If any one is down, the upload fails.` },
    { type: 'h3', text: 'Async 4: a third party is slow or flaky, and retries are needed' },
    { type: 'p', html: `<strong>Scenario:</strong> the "Your video is live" email is sent by an email company. Sometimes it hangs for 5 seconds, sometimes it returns a 503 error.<br><strong>Reason:</strong> if the job sits in a queue, the worker can calmly retry, waiting a little longer each time (1 s, 2 s, 4 s...). The user's part is already done.<br><strong>Trap:</strong> retrying inside the sync request. Three retries × 5 seconds = the user waits 15 seconds. Also, a retry is only safe when the task is <a href="#/pagination-idempotency">idempotent</a> (doing it twice has the same effect as doing it once).` },

    { type: 'h2', text: 'The longer the chain, the weaker it is' },
    { type: 'p', html: `Where does the "keep the chain short (2-3 hops)" rule come from? In a sync chain, the time of each hop <strong>adds up</strong>, and the success chance of each hop <strong>multiplies</strong>. If each service works correctly 99.9% of the time, a chain of 3 services works correctly only 0.999 × 0.999 × 0.999 ≈ 99.7% of the time. Try it yourself:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Sync hops in the chain: <strong class="dsa-vn"></strong></label><input class="dsa-n" type="range" min="1" max="12" step="1" value="3"></div>
          <div><label>Time per hop (ms): <strong class="dsa-vl"></strong></label><input class="dsa-l" type="range" min="5" max="500" step="5" value="50"></div>
          <div><label>Success per hop: <strong class="dsa-va"></strong></label><input class="dsa-a" type="range" min="0" max="4" step="1" value="2"></div>
          <div><label>Timeout (ms): <strong class="dsa-vt"></strong></label><input class="dsa-t" type="range" min="200" max="30000" step="100" value="1000"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Total time (sum)</span><strong class="dsa-o-lat"></strong></div>
          <div class="stat"><span>Whole chain succeeds</span><strong class="dsa-o-ok"></strong></div>
          <div class="stat"><span>Failures per 1 lakh requests</span><strong class="dsa-o-fail"></strong></div>
        </div>
        <div class="calc-note dsa-note"></div>`;
      const $ = c => el.querySelector(c);
      const AV = [0.99, 0.995, 0.999, 0.9995, 0.9999];
      const upd = () => {
        const n = +$('.dsa-n').value, l = +$('.dsa-l').value, a = AV[+$('.dsa-a').value], t = +$('.dsa-t').value;
        const tot = n * l, ok = Math.pow(a, n), fail = Math.round((1 - ok) * 100000);
        $('.dsa-vn').textContent = n; $('.dsa-vl').textContent = l; $('.dsa-va').textContent = (a * 100).toFixed(2).replace(/0+$/, '').replace(/\.$/, '') + '%'; $('.dsa-vt').textContent = t.toLocaleString('en-IN');
        $('.dsa-o-lat').textContent = tot.toLocaleString('en-IN') + ' ms';
        $('.dsa-o-ok').textContent = (ok * 100).toFixed(2) + '%';
        $('.dsa-o-fail').textContent = fail.toLocaleString('en-IN');
        let note = 'Formula: total time = hops × time per hop; success = (per-hop success)^hops. ';
        if (tot > t) note += `The chain total (${tot.toLocaleString('en-IN')} ms) is more than the timeout (${t.toLocaleString('en-IN')} ms): this request will time out every time. This work is not fit for sync, or the chain must get shorter.`;
        else if (n > 3) note += `${n} hops: longer than the roadmap's 2-3 hop rule. Every extra hop adds latency and opens a new way to fail. Make some hops async, or run calls in parallel.`;
        else note += `A short chain, within the timeout. Sync is fine here.`;
        $('.dsa-note').textContent = note;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `With the default values (3 hops, 99.9% each), about 300 out of every 1 lakh requests fail. Make it 12 hops and it becomes about 1,200. This is why long sync chains are dangerous in microservices: one slow or flaky service drags the whole chain down (this is the "cascading failure" from the <a href="#/resilience">resilience</a> lesson).` },

    { type: 'h2', text: 'The async recipe: 5 steps' },
    { type: 'p', html: `The roadmap gives one recipe for every async task. We saw it in detail in the <a href="#/queues">Queues</a> lesson; here we look at it from the decision point of view:` },
    { type: 'steps', items: [
      { t: 'Accept the request', d: 'Only the quick checks run in sync: is the user logged in? Is the file size fine? Is the input valid? If not, return a 400 error at once, because here "show the failure right away" really matters.' },
      { t: 'Store the job', d: 'A job row in the database (status = QUEUED) and a message in the queue. Now the work is "remembered". Even if the server crashes, it will not be lost.' },
      { t: 'Return 202 Accepted + a job ID', d: '202 means "the request arrived, the work is still pending". With the job ID, the user can ask for the status later.' },
      { t: 'A worker takes the job from the queue', d: 'The background worker works at its own speed. If it fails, it retries. If it fails again and again, the job goes to the dead-letter queue (DLQ): a separate line of failed work that an engineer looks at later.' },
      { t: 'Tell the client', d: 'Four ways: a push notification, SSE, a webhook (if the client is itself a server), or the client polls the job status. Which one to choose is a question for the <a href="#/realtime">real-time</a> lesson.' },
    ]},
    { type: 'code', text: `
POST /videos            (file upload)
  → 202 Accepted
    { "job_id": "j_42", "status": "QUEUED", "status_url": "/jobs/j_42" }

GET /jobs/j_42          (the client asks again a little later)
  → 200 OK  { "status": "PROCESSING", "progress": 60 }

GET /jobs/j_42
  → 200 OK  { "status": "DONE", "video_url": "https://cdn.xyz.com/v/42.m3u8" }` },
    { type: 'callout', tone: 'term', title: 'New word: 202 Accepted', html: `<strong>What it is:</strong> an HTTP status code. It means: "the request arrived and was accepted, but the work is not finished yet". 200 says "the work is done". 202 says "the work is in line".<br><strong>Why we need it:</strong> the client knows clearly that the result is not here yet, and that it must ask later using the job ID.<br><strong>Without it:</strong> if the API sent 200, the app would think the video is ready, and the user would see a broken link.` },

    { type: 'h2', text: 'Run it: the wrong choice vs the right choice' },
    { type: 'p', html: `The same upload, two designs. In the first scenario, watch the sync chain fall over. Then see the async version. Then see how the async design survives failures.` },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'u', label: 'User', sub: 'video upload', x: 80, y: 160, w: 120, kind: 'client', info: 'What it is: the app of a creator uploading a video on xyz.com. Timeouts in the browser, the LB and the mobile network (~30-60 s) can cut this user\'s request.' },
        { id: 'api', label: 'Upload API', x: 250, y: 160, w: 140, kind: 'server', info: 'What it is: the server code that receives the upload request. In the sync design it does all the work itself and waits. In the async design it only validates, saves the job, puts it in the queue, and returns 202 at once.' },
        { id: 'q', label: 'Job queue', sub: 'SQS / RabbitMQ', x: 440, y: 160, w: 130, kind: 'queue', info: 'What it is: a line of task notes (a queue). Why: it separates the API from the worker. A message is not deleted until the worker says "done" (an ack). If the worker crashes, the message becomes visible again and another worker picks it up.' },
        { id: 'w', label: 'Worker', sub: 'background', x: 620, y: 160, w: 120, kind: 'server', info: 'What it is: a background program that takes jobs from the queue. When a spike comes, jobs wait in the queue; adding more workers clears the backlog faster.' },
        { id: 'tr', label: 'Transcoder', sub: '~40 s per video', x: 620, y: 50, w: 140, kind: 'server', info: 'What it is: the machine that converts a video into different resolutions. It is CPU-heavy and slow: seconds to minutes. It does not belong in a sync chain at all.' },
        { id: 'em', label: 'Email provider', sub: 'third party', x: 620, y: 275, w: 140, kind: 'net', info: 'What it is: an outside company that sends emails (a third party). Sometimes slow, sometimes returns 5xx errors. Its hiccups must be kept away from the user\'s upload.' },
        { id: 'js', label: 'Jobs table', sub: 'status', x: 440, y: 275, w: 130, kind: 'data', info: 'What it is: a database table with one row per job: QUEUED → PROCESSING → DONE / FAILED. The user checks the status here, and the idempotency key that catches duplicate uploads also lives here.' },
      ],
      edges: [
        { a: 'u', b: 'api' },
        { a: 'api', b: 'tr', id: 'stx', hidden: true }, { a: 'api', b: 'em', id: 'sem', hidden: true },
        { a: 'api', b: 'q' }, { a: 'q', b: 'w' }, { a: 'w', b: 'tr' }, { a: 'w', b: 'em' },
        { a: 'api', b: 'js' }, { a: 'w', b: 'js' },
      ],
      scenarios: [
        { name: 'Wrong: sync chain', intro: 'The Upload API does everything itself, inside one request.', steps: [
          { title: 'The upload arrives', text: 'A creator uploads a 5 minute video.', show: ['stx', 'sem'], set: { q: { state: 'dim' }, w: { state: 'dim' }, js: { state: 'dim' } }, go: 'u>api', msg: 'POST /videos  (180 MB)' },
          { title: 'The API waits on the transcoder', text: 'The API called the transcoder and is <strong>waiting</strong>. Meanwhile its thread and the user\'s connection both stay open.', go: 'api>tr', after: { tr: { state: 'hot', sub: 'working... 40 s' }, api: { state: 'warn', sub: 'waiting' } } },
          { title: '30 seconds: timeout', text: 'Transcoding was at 75%, but the LB timeout is 30 seconds. The user gets an error. The work is still running on the server, but the user thinks it failed.', go: 'bad:api>u', msg: '504 Gateway Timeout' },
          { title: 'The user retries: double work', text: 'The user uploads again. Now the transcoder has <strong>two</strong> identical jobs. If 1,000 users do this, the transcoders get 2,000 jobs, and all of them time out. This is overload we created ourselves.', go: 'u>api>tr', after: { tr: { state: 'down', sub: 'overloaded: 2x jobs' } } },
          { title: 'The email never went out', text: 'The chain broke in the middle, so the email step was never reached. And even if it were, a 5 second slowdown at the email provider would also be added to the user\'s upload.', focus: ['em'], set: { em: { state: 'dim' } } },
        ]},
        { name: 'Right: async', intro: 'The same upload, with the roadmap\'s async recipe.', steps: [
          { title: 'Upload and quick checks', text: 'The API only does the quick checks: logged in? size limit? format? These are sync, because if something is wrong the user must know at once.', go: 'u>api', msg: 'POST /videos' },
          { title: 'Store the job + queue it', text: 'A row in the jobs table (QUEUED) and a message in the queue.', go: ['api>js', 'api>q'], parallel: true, after: { js: { sub: 'j_42: QUEUED' } }, msg: 'INSERT job j_42 QUEUED;  SEND {job: j_42}' },
          { title: '202 Accepted, right away', text: 'The user gets an answer in about 300 ms. The app can show "Processing...", and the user can do something else.', go: 'res:api>u', msg: '202 Accepted  { "job_id": "j_42" }' },
          { title: 'A worker picks up the job', text: 'The worker takes the job at its own speed and gets it transcoded. Whether it takes 40 seconds or 4 minutes, nobody\'s connection is left hanging open.', go: ['q>w', 'w>tr', 'res:tr>w'], after: { js: { sub: 'j_42: PROCESSING' } } },
          { title: 'Email and status', text: 'The email is sent and the job is marked DONE.', go: ['w>em', 'w>js'], parallel: true, after: { js: { state: 'ok', sub: 'j_42: DONE' } } },
          { title: 'The user finds out', text: 'The app polled the status (or a push notification arrived). The video is ready.', go: ['u>api>js', 'res:js>api>u'], msg: 'GET /jobs/j_42  →  { "status": "DONE" }' },
        ]},
        { name: 'Async: worker crash', intro: 'What does a failure look like in the async design?', steps: [
          { title: 'The worker took the job', go: 'q>w', text: 'The message is now "in flight": the queue has not deleted it, it has only hidden it from other workers until this worker says "done" (an ack).', after: { q: { sub: 'j_42 in flight' } } },
          { title: 'The worker crashes', text: 'The worker\'s machine died in the middle of transcoding. The ack never came.', set: { w: { state: 'down', sub: 'CRASH' } }, go: 'lost:w>tr' },
          { title: 'The message comes back', text: 'Hiding has a time limit (in SQS this is called the visibility timeout). When it runs out, the message becomes visible again. A new worker (after a restart) picks it up. The user notices nothing; it just took a little longer.', set: { w: { state: 'ok', sub: 'new worker' }, q: { sub: 'j_42 retry' } }, go: ['q>w', 'w>tr', 'res:tr>w'] },
          { title: 'The cost: it may run twice', text: 'The old worker may have done half the work before it crashed. So workers must be <a href="#/pagination-idempotency">idempotent</a>: if the same job runs twice, the result is still the same.', go: 'w>js', after: { js: { state: 'ok', sub: 'j_42: DONE (once)' } } },
        ]},
        { name: 'Async: flaky email provider', steps: [
          { title: 'The email fails', text: 'The video is ready, but the email provider is returning 503.', go: ['w>em', 'bad:em>w'], set: { em: { state: 'warn', sub: '503 errors' } } },
          { title: 'No effect on the upload', text: 'The user\'s upload already got its 202 and the video is live. The email is a separate job that can be retried.', set: { js: { state: 'ok', sub: 'video: DONE' } }, focus: ['js'] },
          { title: 'Retry with backoff', text: 'The worker waits 1 s, 2 s, 4 s... and tries again (exponential backoff). The provider recovers and the email goes out. If it failed 5 times, the message would go to the DLQ and an engineer would look at it.', set: { em: { state: 'ok', sub: 'recovered' } }, go: ['w>em', 'res:em>w'] },
        ]},
      ],
    },

    { type: 'h2', text: 'Decision helper: answer the questions, get a recommendation' },
    { type: 'p', html: `Ask these 7 questions for every new feature. Load an example with the buttons below, or change the answers yourself and watch the recommendation change. Each answer also comes with the <em>why</em>.` },
    { type: 'custom',
      Q: [
        { k: 'need', q: 'Does the user need the result of this work to continue?', o: ['Yes', 'No'] },
        { k: 'dur', q: 'How long does the work take?', o: ['< 200 ms', '200 ms - 1 s', '1 - 30 s', '> 30 s (minutes/hours)'] },
        { k: 'hops', q: 'If done in sync, how many service hops would the chain have?', o: ['1-3', '4 or more'] },
        { k: 'fan', q: 'Do many other systems need to react to this one event?', o: ['No, just one', 'Yes, many'] },
        { k: 'spiky', q: 'Is the traffic spiky (sale, launch, match)?', o: ['No', 'Yes'] },
        { k: 'flaky', q: 'Is there a slow or flaky third party in the path?', o: ['No', 'Yes'] },
        { k: 'failNow', q: 'Must a failure be shown to the user right away?', o: ['No', 'Yes'] },
      ],
      presets: {
        'Login': { need: 0, dur: 0, hops: 0, fan: 0, spiky: 0, flaky: 0, failNow: 1 },
        'Video upload': { need: 1, dur: 3, hops: 1, fan: 1, spiky: 0, flaky: 0, failNow: 0 },
        'Flash sale order': { need: 0, dur: 1, hops: 0, fan: 1, spiky: 1, flaky: 0, failNow: 1 },
        'Payment': { need: 0, dur: 1, hops: 0, fan: 1, spiky: 0, flaky: 1, failNow: 1 },
        'Monthly report PDF': { need: 0, dur: 3, hops: 0, fan: 0, spiky: 0, flaky: 0, failNow: 0 },
      },
      // a: answers as option indexes. need: 0 = yes, 1 = no.
      decide(a) {
        const need = a.need === 0, why = [], tips = [];
        let v;
        if (a.dur === 3) {
          v = 'async';
          why.push('The work takes minutes or hours: no HTTP request can wait that long (timeouts are ~30-60 s). This is the strongest signal for async.');
          if (need) tips.push('The user needs the result, so return 202 + a job ID, show a progress bar, and tell them by push / SSE / email when it is done.');
        } else if (a.dur === 2) {
          v = 'async';
          why.push('The work takes seconds: in sync, a thread and a connection stay tied up that long, and in a spike all of the server\'s threads fill up.');
          if (need) tips.push('The user will wait, so after the 202 show a live status with SSE or a poll every 1-2 s. The user should feel that something is happening.');
        } else if (need) {
          v = 'sync';
          why.push('The user needs the result and the work takes under a second: a plain request/response is the simplest and the fastest.');
          const side = [];
          if (a.fan === 1) side.push('telling many downstream systems (publish an event, do not wait for them)');
          if (a.flaky === 1) side.push('keep the flaky third party out of the sync path, or use a strict timeout + a "pending" state + confirm later by webhook');
          if (a.spiky === 1) side.push('in a spike, put the heavy part in a queue to smooth it; keep only the quick accept/validate in sync');
          if (side.length) { v = 'hybrid'; why.push('But some parts should be async: ' + side.join('; ') + '.'); }
        } else {
          const sig = [];
          if (a.fan === 1) sig.push('many systems react');
          if (a.spiky === 1) sig.push('the traffic is spiky');
          if (a.flaky === 1) sig.push('the third party is flaky and needs retries');
          if (a.hops === 1) sig.push('the chain is long');
          if (sig.length) { v = 'async'; why.push('The user does not have to wait for this result, and ' + sig.join(', ') + '. Holding the user gains nothing.'); }
          else { v = 'either'; why.push('The work is small and there is no async signal. Sync is the simplest; go async only if the volume is so high that batching this work becomes cheaper.'); }
        }
        if (a.hops === 1 && (v === 'sync' || v === 'hybrid')) tips.push('A sync chain of 4+ hops: every hop adds latency and multiplies the chance of failure. Run calls in parallel, cache, or make the non-critical hops async.');
        if (a.failNow === 1 && (v === 'async' || v === 'hybrid')) tips.push('Check the errors that can be caught at once (invalid input, auth, zero stock) in sync BEFORE returning 202. Report other failures through the job status (FAILED) or a notification.');
        if (a.failNow === 1 && v === 'sync') why.push('The failure must be shown right away: in sync, the error comes back in the same response.');
        if (v !== 'sync' && v !== 'either' && a.flaky === 1) tips.push('Retry with exponential backoff, and keep workers idempotent so that a retry does not do the work twice.');
        const label = { sync: 'Synchronous', async: 'Asynchronous (queue + worker)', hybrid: 'Hybrid: core in sync, the rest async', either: 'Both work: start with sync' }[v];
        return { v, label, why, tips };
      },
      render(el) {
        const self = this, ans = Object.assign({}, this.presets['Video upload']);
        el.innerHTML = `<div class="dsa-pre" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px"></div><div class="dsa-qs"></div>
          <div class="dsa-out" style="margin-top:14px;padding:14px;border:1px solid var(--line-2);border-radius:var(--r);background:var(--surface-2)"></div>`;
        const pre = el.querySelector('.dsa-pre'), qs = el.querySelector('.dsa-qs'), out = el.querySelector('.dsa-out');
        pre.innerHTML = '<span style="font:13px var(--f-mono);color:var(--ink-3);align-self:center">Example:</span>';
        Object.keys(this.presets).forEach(n => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small ghost'; b.textContent = n; b.onclick = () => { Object.assign(ans, self.presets[n]); draw(); }; pre.appendChild(b); });
        const draw = () => {
          qs.innerHTML = '';
          this.Q.forEach(q => {
            const row = document.createElement('div'); row.style.margin = '0 0 10px';
            row.innerHTML = `<div style="font-weight:600;margin-bottom:5px">${q.q}</div>`;
            const chips = document.createElement('div'); chips.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px';
            q.o.forEach((o, i) => { const c = document.createElement('button'); c.type = 'button'; c.className = 'chip' + (ans[q.k] === i ? ' on' : ''); c.textContent = o; c.onclick = () => { ans[q.k] = i; draw(); }; chips.appendChild(c); });
            row.appendChild(chips); qs.appendChild(row);
          });
          const r = self.decide(ans);
          const col = { sync: 'var(--green)', async: 'var(--violet)', hybrid: 'var(--amber)', either: 'var(--accent)' }[r.v];
          out.innerHTML = `<div style="font:13px var(--f-mono);color:var(--ink-3)">Recommendation</div>
            <div style="font:700 22px var(--f-display);color:${col};margin:2px 0 8px">${r.label}</div>
            <ul style="margin:0 0 0 18px;padding:0">${r.why.map(x => `<li>${x}</li>`).join('')}${r.tips.map(x => `<li style="color:var(--ink-2)">${x}</li>`).join('')}</ul>`;
        };
        draw();
      },
    },

    { type: 'h2', text: 'Worked scenarios: apps you know' },
    { type: 'h3', text: '1. Instagram / xyz.com login: sync' },
    { type: 'p', html: `The user typed a password and is waiting. Without logging in they cannot take a single step forward. The check takes ~50 ms, and a wrong password must be reported at once. All four sync signals together. Making login async (202 + "poll the status") would only make the experience worse and save nothing.` },
    { type: 'h3', text: '2. YouTube-style video upload: async' },
    { type: 'p', html: `Transcoding takes minutes, and one upload makes many things react: transcoding, the thumbnail, the search index, notifications to subscribers. The upload API only takes the file and returns 202; everything else is workers and events. The flow above showed exactly this.` },
    { type: 'h3', text: '3. Flash sale (like the Big Billion Days sale): hybrid' },
    { type: 'p', html: `When the sale opens at 10 o'clock, there are lakhs of "Buy" clicks in one minute. If every click did payment, inventory, invoice and email in sync, both the database and the payment gateway would melt. The hybrid design: only the quick part runs in sync (is the user valid? take one off the stock counter atomically, for example with Redis <code>DECR</code>), and then "order received" at once. The rest of the order processing is done from a queue by workers at their own speed. The queue <strong>smooths the spike</strong>: however fast work arrives, it is processed at a steady speed.` },
    { type: 'h3', text: '4. Razorpay / Stripe payment: hybrid, with a webhook' },
    { type: 'p', html: `The user presses the pay button. The payment provider works with the bank. Sometimes that takes seconds, and sometimes the network breaks in the middle. So payment providers send the final result by <strong>webhook</strong>: the provider's server makes an HTTP call to your server to say "payment X succeeded". The app keeps the order as "payment pending" and confirms it when the webhook arrives. The user's checkout looks sync, but the real confirmation is async.` },
    { type: 'h3', text: '5. Trap: "the user needs the OTP SMS, so send it in sync"' },
    { type: 'p', html: `An OTP for login. You may think: "the user cannot continue without the OTP, so send the SMS in sync". Trap! The user does not need the OTP in the <em>HTTP response</em>. They need the SMS, which arrives on their phone separately anyway. The SMS provider (a third party) sometimes hangs for 3-5 seconds. If you send it in sync, the "Send OTP" button will hang, and every outage at the provider will take down your login. The right way: generate and store the OTP (sync, fast), put the SMS job in a queue, and show "OTP sent" at once. The worker retries, and if the provider is down it falls back to another provider.` },
    { type: 'callout', tone: 'warn', title: 'The opposite trap: everything async', html: `After learning async, some people start putting everything in a queue. Fetching a profile page, search results, login: making these async forces the user to poll, makes debugging hard, and <em>increases</em> latency (the queue is an extra hop). And the worst case: <strong>request-reply over a queue</strong>, where you put a request in a queue and then wait for the reply inside the same HTTP request. You get the complexity of async and the waiting of sync, both at once.` },

    { type: 'h2', text: 'Practice: 6 small cases' },
    { type: 'p', html: `First think for yourself: sync, async or hybrid? Then press "Show signal". Then look at the answer. The answer also lists the trap.` },
    { type: 'custom',
      cases: [
        { q: '"Download my data" on xyz.com: a user asks for a ZIP file of all their videos, comments and history. It can be up to 20 GB.', signal: 'The work is very long (minutes to hours). The user does not need the result now, only a link when it is ready.', pick: 'Async', why: 'Create a job on the request and return 202. A worker builds the ZIP and stores it in object storage. When it is ready, send a download link by email.', trap: 'Trying to build the ZIP inside the request: a timeout, and the user retries and starts 2-3 ZIP jobs.' },
        { q: 'Suggestions as you type in the search box ("cric" → "cricket highlights").', signal: 'The user waits for an answer on every letter. The work takes ~20-50 ms.', pick: 'Sync', why: 'A suggestion is only useful if it comes at once. Putting it in a queue and sending it later is pointless.', trap: '"There is a lot of traffic, so go async." The cure for traffic is a cache and more servers, not async.' },
        { q: 'A creator changed a video title. The title must be saved, and the new title must also reach the search index.', signal: 'The save must be visible to the user at once. The search index is a separate system that can update a little later.', pick: 'Hybrid', why: 'Save the title to the database in sync and return 200. Then publish a "title changed" event. The search worker updates the index within a few seconds.', trap: 'Updating the search index in sync: if the search cluster is slow, saving the title is also slow, or fails.' },
        { q: 'Every night at 2 am, every creator gets a summary email of yesterday\'s views.', signal: 'No user is waiting. Lakhs of emails. The email company may be flaky.', pick: 'Async (scheduled batch jobs)', why: 'A scheduler puts lakhs of jobs in the queue at 2 am. Workers send them steadily and retry on failure.', trap: 'Sending lakhs of emails in sync from one script with a for-loop: if it crashes in the middle, you do not even know who was missed.' },
        { q: 'The xyz.com wallet: a user buys Premium for ₹100. The money must be taken from their balance.', signal: 'Money. The user must see "done" or "not enough balance" at once. Everything is inside your own database, no third party.', pick: 'Sync', why: 'Checking and reducing the balance in one database transaction takes ~10 ms. A failure (low balance) must be shown at once.', trap: 'Also putting the receipt email and the "Premium badge" analytics in this request. Those are async side effects.' },
        { q: 'A "Predict the winner" poll during a live match. 20 lakh votes in 30 seconds.', signal: 'Very spiky traffic. The user only needs "vote received"; the total can show up later.', pick: 'Hybrid (accept fast, count later)', why: 'In sync, only check (has this user voted before?) and put the vote in a queue or stream. Workers add up the totals. The user sees "vote received" at once.', trap: 'Increasing a single database row counter in sync for every vote: everyone fights over one row and the DB gets stuck.' },
      ],
      render(el) {
        const cases = this.cases, T = { case: 'Case', hint: 'Show signal', ans: 'Show answer', prev: '← Previous', next: 'Next →', signal: 'Signal', trap: 'Trap' };
        let i = 0, hint = false, ans = false;
        const draw = () => {
          const c = cases[i];
          el.innerHTML = `<div style="font-size:12px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.06em">${T.case} ${i + 1} / ${cases.length}</div>
            <div style="font:600 17px/1.45 var(--f-body);color:var(--ink);margin:4px 0 10px">${c.q}</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px">
              <button type="button" class="btn small" data-a="hint">${T.hint}</button>
              <button type="button" class="btn small primary" data-a="ans">${T.ans}</button>
              <button type="button" class="btn small ghost" data-a="prev">${T.prev}</button>
              <button type="button" class="btn small ghost" data-a="next">${T.next}</button></div>
            <div class="calc-note" style="${hint ? '' : 'display:none'}"><strong>${T.signal}:</strong> ${c.signal}</div>
            <div style="${ans ? '' : 'display:none'};margin-top:10px;border:1px solid var(--line-2);border-left:4px solid var(--green);border-radius:var(--r);background:var(--surface-2);padding:10px 12px">
              <div style="font:700 16px var(--f-display);color:var(--ink)">${c.pick}</div>
              <p style="margin:6px 0">${c.why}</p><p style="margin:6px 0"><strong>${T.trap}:</strong> ${c.trap}</p></div>`;
          el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
            const a = b.dataset.a;
            if (a === 'hint') hint = true; else if (a === 'ans') { hint = true; ans = true; }
            else { i = (i + (a === 'next' ? 1 : cases.length - 1)) % cases.length; hint = false; ans = false; }
            draw();
          });
        };
        draw();
      },
    },

    { type: 'h2', text: 'How do we tell the user the result?' },
    { type: 'p', html: `Async brings a new question: the work is finished, so how does the user find out? There are four ways. Here is a short meaning of each:` },
    { type: 'callout', tone: 'term', title: 'New words: Polling, SSE, Push, Webhook', html: `<strong>What it is:</strong> <strong>Polling</strong> = the app asks "done yet?" every few seconds. <strong>SSE (Server-Sent Events)</strong> = the browser keeps one connection open and the server keeps sending updates on it. <strong>Push notification</strong> = a notification on the phone, even when the app is closed. <strong>Webhook</strong> = one server makes an HTTP call to another server to say "this is done".<br><strong>Why we need it:</strong> after a 202, the result must reach the user somehow.<br><strong>Without it:</strong> the user would never learn that the video is ready, or that it failed.` },
    { type: 'table', head: ['Method', 'When', 'Example'], rows: [
      ['Status polling', 'Simple, no long-lived connection; a few seconds of delay is fine', 'Check a report\'s status every 3 s'],
      ['SSE (Server-Sent Events)', 'The browser is open and you want to show live progress', 'Upload 10% … 60% … DONE'],
      ['Push notification', 'The user may have closed the app', '"Your video is live"'],
      ['Webhook', 'The client is itself a server (another company)', 'A payment provider tells the merchant'],
    ]},
    { type: 'p', html: `Which method to use when is covered in detail in the <a href="#/realtime">Polling, SSE, WebSockets</a> lesson.` },

    { type: 'h2', text: 'The hidden costs of async (interview depth)' },
    { type: 'list', items: [
      '<strong>Eventual consistency:</strong> for a while after the 202, the system is "half done": the video is uploaded but does not show up in search yet. The UI has to show this state ("Processing...").',
      '<strong>Duplicates:</strong> queues usually deliver at-least-once (at least one time, sometimes two), so a job can arrive twice. Make workers idempotent (use the job ID to check "has this already been done?").',
      '<strong>Ordering:</strong> two jobs can be processed in the reverse order. If order matters, you need per-key ordering (like a <a href="#/kafka">Kafka</a> partition key).',
      '<strong>Monitoring:</strong> in sync, an error shows up at once. In async, a failure quietly sits in the DLQ. Set alerts on queue depth, the age of the oldest message, and the DLQ size.',
      '<strong>Backlog:</strong> a queue absorbs a spike, not constant overload. If work always arrives faster than the workers can handle, the backlog just keeps growing.',
      '<strong>Debugging:</strong> the work of one request gets spread across many processes. Carry a trace ID / job ID on every job so you can connect the logs.',
    ]},
    { type: 'callout', tone: 'tip', title: 'Decide (roadmap rule)', html: `The user is waiting for the result, the work takes &lt; 1 s, the chain is 2-3 hops, and failure must be shown at once → <strong>sync</strong>. The work is slow, the traffic is spiky, many systems react, or a third party is flaky → <strong>async</strong>: accept → store the job → 202 + job ID → worker → notify. Most real features are <strong>hybrid</strong>: a small core in sync, side effects async.` },

    { type: 'h2', text: 'How to say this in an interview' },
    { type: 'steps', items: [
      { t: 'Break the feature into tasks', d: '"Upload" is not one task. Save, transcode, thumbnail, index, email: five tasks. Each task gets its own decision.' },
      { t: '4 questions for each task', d: 'Is the user waiting for it? How long does it take? How many hops? Is there a third party? These answers give you sync or async.' },
      { t: 'Core in sync, side effects async', d: 'What the user needs now (save, validate) is sync. The rest goes through events and queues. Most features are hybrid.' },
      { t: 'Also state the cost of async', d: 'How the job status will be shown (poll/SSE/push/webhook), idempotency for duplicates, retry + DLQ on failure, and an alert on queue depth.' },
    ]},
    { type: 'h2', text: 'The whole picture' },
    { type: 'diagram', title: 'xyz.com: which work is sync, which is async', height: 560,
      groups: [
        { label: 'APIs: the user waits here', x: 178, y: 14, w: 154, h: 530 },
        { label: 'Async: later', x: 565, y: 140, w: 150, h: 392 },
      ],
      nodes: [
        { id: 'app', label: 'xyz.com app', sub: 'user', x: 80, y: 280, w: 120, kind: 'client', info: 'What it is: the user\'s browser or phone app. Each button makes an API call. Some answers come at once (sync), some say "got it, we will tell you later" (async).' },
        { id: 'login', label: 'Login API', sub: 'sync', x: 255, y: 70, kind: 'server', info: 'What it is: the API that checks the password. Why sync: the user cannot continue without logging in, the work takes ~50 ms, and a wrong password must be reported at once.' },
        { id: 'comment', label: 'Comment API', sub: 'hybrid', x: 255, y: 200, kind: 'server', info: 'What it is: the API that saves comments. Why hybrid: the comment is saved to the DB in sync (so the user sees it at once), but the notification and the count update happen async through an event.' },
        { id: 'upload', label: 'Upload API', sub: 'async: 202', x: 255, y: 350, kind: 'server', info: 'What it is: the API that receives videos. Why async: transcoding takes minutes. The API only does quick checks, writes the job status row (QUEUED), puts the job in the queue, and returns 202 + a job ID.' },
        { id: 'checkout', label: 'Checkout API', sub: 'hybrid + webhook', x: 255, y: 490, kind: 'server', info: 'What it is: the API for buying Premium. Why hybrid: the "pending" order is created in sync (a row in the DB), but the payment provider sends the final result later by webhook.' },
        { id: 'db', label: 'Main DB', sub: 'users, jobs, orders', x: 455, y: 135, kind: 'data', info: 'What it is: the main database of xyz.com. Users, comments, job status (QUEUED → DONE) and orders (pending → paid) live here. Status questions are answered from here.' },
        { id: 'q', label: 'Queue', sub: 'jobs + events', x: 455, y: 350, kind: 'queue', info: 'What it is: a line of task notes. Why: it separates the APIs from the workers. A spike waits here in line, and the workers pick tasks up at their own speed.' },
        { id: 'w', label: 'Workers', sub: 'transcode, email', x: 640, y: 350, w: 130, kind: 'server', info: 'What it is: background programs. They take a job from the queue, do the work, and retry with backoff on failure. They are idempotent, so a duplicate delivery does no harm.' },
        { id: 'mail', label: 'Email / SMS', sub: 'third party', x: 640, y: 200, w: 130, kind: 'net', info: 'What it is: an outside company that sends email and SMS. It can be flaky, so only the workers talk to it, never a user\'s request.' },
        { id: 'search', label: 'Search index', sub: 'updated later', x: 640, y: 490, w: 130, kind: 'data', info: 'What it is: the system that powers search. A new video or a new title reaches it a few seconds later. This is eventual consistency, and it is fine.' },
        { id: 'psp', label: 'Payment provider', sub: 'third party', x: 455, y: 490, w: 150, kind: 'net', info: 'What it is: a company like Razorpay or Stripe that talks to the bank. The bank can take seconds, so the final "paid" answer comes by webhook.' },
      ],
      edges: [
        { a: 'app', b: 'login' },
        { a: 'app', b: 'comment' },
        { a: 'app', b: 'upload' },
        { a: 'app', b: 'checkout' },
        { a: 'login', b: 'db', label: 'check' },
        { a: 'comment', b: 'db', label: 'save' },
        { a: 'comment', b: 'q', kind: 'evt' },
        { a: 'upload', b: 'q', label: 'job' },
        { a: 'checkout', b: 'psp', label: 'pay' },
        { a: 'q', b: 'w' },
        { a: 'w', b: 'mail', label: 'send' },
        { a: 'w', b: 'search', label: 'index' },
        { a: 'w', b: 'db', label: 'DONE' },
      ],
      paths: [
        { name: 'Login (sync)', text: 'The app sent the password, the API checked it in the DB, and answered in ~50 ms. No queue.', go: ['app>login>db', 'res:db>login>app'] },
        { name: 'Comment (hybrid)', text: 'The comment was saved in sync and showed up at once. The notification event went to the queue, and a worker sent it later.', go: ['app>comment>db', 'res:comment>app', 'evt:comment>q>w>mail'] },
        { name: 'Upload (async)', text: 'The API put the job in the queue (status QUEUED) and returned 202 at once. A worker transcoded it, updated search, and wrote DONE to the DB.', go: ['app>upload>q', 'res:upload>app', 'q>w>search', 'w>db'] },
        { name: 'Payment (webhook)', text: 'A "pending" order was created and the user went to the provider. Later the provider said "paid" by webhook, and the API confirmed the order.', go: ['app>checkout>psp', 'evt:psp>checkout', 'res:checkout>app'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Sync = the caller stops and waits for the answer. Async = "got it" at once, and a worker does the work later.</li>
      <li>Sync when: the user needs the result, the work takes &lt; 1 s, the chain is 2-3 hops, failure must be shown at once.</li>
      <li>Async when: the work is slow, the traffic is spiky, many systems react, or a third party is flaky.</li>
      <li>The async recipe: accept → store the job → 202 + job ID → worker → notify (poll, SSE, push or webhook).</li>
      <li>Async does not make work faster. It only moves the waiting away from the user and into the system.</li>
      <li>In a sync chain, time adds up and success multiplies: 0.999 to the power of the number of hops.</li>
      <li>Most features are hybrid: a small core in sync, side effects async. Quick checks always come before the 202.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['Async: the user never gets stuck on slow work, and server threads stay free', 'Async: spikes are absorbed by the queue, so workers can be sized for the average load', 'Async: a flaky third party\'s failure does not reach the user, and retries are easy', 'Sync: simple code, errors at once, easy debugging, no extra components'],
      costs: ['Async: queue + workers + jobs table = more moving parts and more monitoring', 'Async: you must worry about eventual consistency, duplicates and ordering', 'Async: extra work to show the user the status (polling/SSE/push)', 'Sync: in a long chain, latency adds up and the chance of failure multiplies; slow work times out'],
    },
    { type: 'think', questions: [
      { q: '"Post a comment" on xyz.com: save the comment, send a notification, run a spam check, increase the comment count. What is sync, what is async?', a: 'Saving the comment is sync (the user wants to see their comment at once, and must be told if it fails). The notification, the count update and search indexing are async (publish an event). The spam check: if the model is fast (~50 ms), sync; otherwise show the comment as "pending" first and check it async. This is a classic hybrid.' },
      { q: 'A team built an "async" design: the API puts a message in a queue, then waits up to 10 seconds on a reply queue inside the same HTTP request. What is wrong?', a: 'This is request-reply over a queue: the user is still waiting (the pain of sync), plus the complexity of queues, correlation IDs and timeouts (the pain of async). Either make a direct sync call (if the work is fast), or go truly async: 202 + job ID, and report the result later.' },
      { q: 'In an async upload, after returning 202 the worker finds the video is corrupt. How do we tell the user?', a: 'Set the job status to FAILED with a reason, and tell the user by push notification / email / the status in the UI. This is exactly why the checks that can be done quickly (file type, size, header check) should run in sync before the 202, so that most failures show up at once.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'What is the best design for video transcoding (~2 minutes)?', options: ['A sync call with the timeout raised to 5 minutes', 'Accept → store the job → 202 + job ID → worker → notify', 'Let the client transcode it itself'], answer: 1, explain: 'Slow work is the strongest signal for async. Raising the timeout ties up connections and threads for minutes, and the proxies in between will cut it anyway.' },
      { q: 'Each service is 99.9% reliable. About how often does a sync chain of 10 services work fully correctly?', options: ['99.9%', '99.0%', '90%'], answer: 1, explain: '0.999^10 ≈ 0.990. So about 1 in 100 requests fails. Keep the chain short.' },
      { q: 'What does HTTP 202 Accepted mean?', options: ['The work is done', 'The request was received, the processing is still pending', 'The request was rejected'], answer: 1, explain: '202 is the standard answer of async APIs: accepted now, the work happens later.' },
      { q: 'What does async do to the work?', options: ['It makes the work faster', 'It saves the user from waiting; the work takes just as long', 'It removes the need for the work'], answer: 1, explain: 'Async only moves the waiting away from the user and into the system. The total work is the same (or a bit more).' },
    ]},
    { type: 'sources', items: [
      { title: 'RFC 9110: HTTP Semantics, section 15.3.3 (202 Accepted)', publisher: 'IETF', official: true, url: 'https://www.rfc-editor.org/rfc/rfc9110#name-202-accepted', used: 'What 202 means: the request was accepted, but processing is not finished.' },
      { title: 'Amazon SQS visibility timeout', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html', used: 'How a message becomes visible again when a worker crashes.' },
      { title: 'Edit attributes for your Application Load Balancer (idle timeout)', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-load-balancer-attributes.html', used: 'The default ALB idle timeout is 60 seconds (range 1-4000 s).' },
      { title: 'Handling payment events with webhooks', publisher: 'Stripe documentation', official: true, url: 'https://docs.stripe.com/webhooks/handling-payment-events', used: 'The advice to handle the final payment result (payment_intent.succeeded) asynchronously through a webhook.' },
      { title: 'DECR command', publisher: 'Redis documentation', official: true, url: 'https://redis.io/docs/latest/commands/decr/', used: 'Reducing a flash-sale stock counter atomically.' },
    ]},
  ],
});
