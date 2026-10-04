Lesson.register({
  id: 'queues',
  title: 'Message queues',
  minutes: 30,
  summary: `Some work is so slow that making the user wait for it is wrong: processing a video, sending an email, building a report. A message queue is a "to-do list": the server writes the task down and moves on at once, and workers pick tasks up and do them at their own speed. Also: acks, retries, the dead-letter queue, backpressure, and the truth about "exactly-once".`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Some work takes a long time: preparing a video, sending an email, building a report.<br>If the server holds the user until every task is finished, the user gets annoyed and the server gets jammed.<br>So the server writes the task into a <strong>list</strong> and tells the user right away: "got it, it will be done".<br>Behind the scenes, separate machines (workers) pick tasks from the list one by one and do them.<br>In this lesson you will learn how that list works, what happens if a machine dies in the middle, and what to do if the list gets very long.` },
    { type: 'h2', text: 'The problem: the request gets stuck' },
    { type: 'p', html: `xyz.com is now a video platform. The load balancer, cache, CDN and replicas are all in place. Now a new feature: users upload their own videos. After an upload the server has three jobs: convert the video to 360p/720p/1080p (<strong>transcoding</strong>, 2-5 minutes), make a thumbnail, and email the followers.` },
    { type: 'p', html: `The simplest first design: do all this work inside the upload request, and send the user "Done" when it is finished. What goes wrong?` },
    { type: 'list', items: [
      `<strong>The user watches a loading spinner for 5 minutes.</strong> If the mobile connection breaks in the middle, all the work is wasted and the user uploads again.`,
      `<strong>The server's threads and connections stay busy.</strong> Say one server can handle 200 requests at once. If 200 uploads each run for 5 minutes, every other user (who only wanted to open the homepage) waits in line.`,
      `<strong>Everything falls over in a spike (a sudden crowd).</strong> At 9 pm, 10 times more uploads arrive. Each request brings 5 minutes of heavy work. Servers overload, timeouts, errors.`,
      `<strong>Is the email provider slow or down?</strong> Then the upload fails too. A problem at a third party broke our core feature.`,
    ]},
    { type: 'callout', tone: 'why', title: 'The real question', html: `Does the user really need to wait for these tasks to <em>finish</em>? No. The user only needs to know "we got your video, it is being processed". The work can happen later, separately, at its own speed.` },
    { type: 'callout', tone: 'term', title: 'Asynchronous (async) processing', html: `<strong>What it is:</strong> getting work done "later". <strong>Synchronous</strong> = do the work, wait until it is finished, then reply. <strong>Asynchronous</strong> = write the work down somewhere, reply at once ("got it"), and someone else does the work later. Like pressing "export report" in an app and it says "we will email you when it is ready".<br><strong>Why we need it:</strong> the user does not wait for slow work, and the server's thread is free at once.<br><strong>Without it:</strong> every long task holds a user for minutes, and the server's capacity stays tied up.` },
    { type: 'callout', tone: 'term', title: 'Message', html: `<strong>What it is:</strong> a small note that says "what work to do". Like <code>{ "job_id": 42, "video_id": 7 }</code>. Just a few hundred bytes.<br><strong>Why we need it:</strong> the worker does not need the whole video, only to know which video. The video itself sits in storage.<br><strong>Without it:</strong> big files would be sent back and forth, and everything would be slow and expensive.` },
    { type: 'callout', tone: 'term', title: 'Message queue', html: `<strong>What it is:</strong> a separate service that keeps messages safely <strong>in a line</strong>, like a shared to-do list. Usually whatever came first goes out first. Examples: RabbitMQ, Amazon SQS, and job libraries like Celery (Python) / Sidekiq (Ruby) that run on Redis.<br><strong>Why we need it:</strong> a "trusted middleman" between the API and the machines that do the work. The API writes and moves on; workers pick up at their own speed.<br><strong>Without it:</strong> the API would have to do the work itself, or call a worker directly. If the worker is busy or down, the work is lost.<br><strong>Example:</strong> on xyz.com every upload creates one message. At 9 pm there are 20,000 messages in line, and workers are clearing them one by one.` },
    { type: 'callout', tone: 'term', title: 'Producer, consumer (worker), broker', html: `<strong>What it is:</strong> three roles. <strong>Producer</strong> = the one who puts a message in line (our Upload API). <strong>Consumer</strong> or <strong>worker</strong> = the one who takes the message out and does the real work (the video-converting machine). <strong>Broker</strong> = the queue service in the middle (RabbitMQ, SQS).<br><strong>Why we need it:</strong> all three are separate, so each can be grown or changed on its own. Go from 2 workers to 200 and the API does not even notice.<br><strong>Without it:</strong> everything is in one program, and the load of one part drags all the others down.` },
    { type: 'compare',
      left: { title: 'Synchronous (before)', ascii: `
User ──upload──> Server
                  │ transcode (3 min)
                  │ thumbnail (5 s)
                  │ email (2 s, sometimes 30 s)
User <──"Done"─── Server
  (5 minutes later, if
   the connection survived)` },
      right: { title: 'Asynchronous (with a queue)', ascii: `
User ──upload──> Server ──job──> Queue
User <──202 Accepted──┘           │
  (in ~200 ms)                    v
                        Worker 1, Worker 2 ...
                        work at their own speed
                        → status update
                        → notification to user` },
    },
    { type: 'p', html: `The roadmap calls this the "async recipe": <strong>accept the request → store the job → return <code>202 Accepted</code> + a job ID → a worker picks the job from the queue → tell the client by push, SSE, webhook or status polling</strong> (all of these are in the "real-time" lesson). (202 Accepted means "request received, the work is still pending".)` },

    { type: 'h2', text: 'The life of a message' },
    { type: 'p', html: `Before the flow, learn four small words. The whole lesson rests on them.` },
    { type: 'steps', items: [
      { t: 'Send', d: 'The producer sends a message. The broker writes it to disk (and often copies it to other machines), then tells the producer "saved". In RabbitMQ this "saved" is called a <strong>publisher confirm</strong>.' },
      { t: 'Receive', d: 'A worker takes the message. The message is <strong>not deleted</strong> yet. It is only hidden from the other workers.' },
      { t: 'Process', d: 'The worker does the real work: convert the video, send an email, update the database.' },
      { t: 'Ack (or delete)', d: 'When the work is done, the worker says "done" (in SQS, a <code>DeleteMessage</code> call). Then the broker removes the message for good.' },
      { t: 'No ack came?', d: 'SQS: after a set time, the message becomes visible to everyone again. RabbitMQ: if the worker\'s connection breaks, the message goes back in line at once. In both, the message is delivered again.' },
    ]},
    { type: 'callout', tone: 'term', title: 'Ack (acknowledgement) and nack', html: `<strong>What it is:</strong> ack = the worker's "work done, remove the message" signal to the broker. Nack (or reject) = "could not do it", and you can also say whether to put it back in line or not.<br><strong>Why we need it:</strong> how does the broker know the work really happened? Only from the ack. Until the ack comes, the broker keeps the message safe.<br><strong>Without it:</strong> the broker would forget the message as soon as it handed it out. If the worker died in the middle, the work would be gone forever.` },
    { type: 'callout', tone: 'term', title: 'In-flight message', html: `<strong>What it is:</strong> a message that a worker has taken but not acked yet. It is "on the way": it is still in the queue, but others cannot see it.<br><strong>Why we need it:</strong> so two workers do not pick the same task, but the message survives if the worker dies.<br><strong>Without it:</strong> either two workers would make the same video (waste), or the message would be deleted on hand-out (risk of loss).<br><strong>Example:</strong> an SQS standard queue can have about 120,000 in-flight messages at a time.` },
    { type: 'callout', tone: 'term', title: 'Visibility timeout (SQS)', html: `<strong>What it is:</strong> how long a message stays hidden from others after a worker takes it. Default 30 seconds, max 12 hours. If time runs out and no ack came, the message shows up in the line again.<br><strong>Why we need it:</strong> SQS cannot tell whether the worker is alive or dead. This timer is its "maybe it died" guess.<br><strong>Without it:</strong> a dead worker's message would stay hidden forever, and the work would never happen.<br><strong>Careful:</strong> if the timer is shorter than the work, another worker gets the message while the first one is still alive. Try it below.` },
    { type: 'callout', tone: 'term', title: 'Prefetch (RabbitMQ)', html: `<strong>What it is:</strong> how many unacked messages one worker may hold at once. For example, prefetch = 10.<br><strong>Why we need it:</strong> RabbitMQ pushes messages to workers by itself. Without a limit, one worker could pile up 10,000 messages while the other workers sit idle.<br><strong>Without it:</strong> work is shared unevenly, and a worker's memory can fill up.` },
    { type: 'p', html: `<strong>Visibility timeout lab.</strong> Pick how long one video's work takes (job time) and a timeout. Each bar is one "delivery": a worker got the message and started work. Red X = worker crash. <strong>Heartbeat</strong> means: during the work, every half timeout, the worker tells SQS "I am alive, extend my timer" (<code>ChangeMessageVisibility</code>).` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Job time (how long the work takes): <strong class="qv-vj"></strong></label><input class="qv-j" type="range" min="10" max="300" step="10" value="180"></div>
          <div><label>Visibility timeout: <strong class="qv-vv"></strong></label><input class="qv-v" type="range" min="10" max="600" step="10" value="30"></div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:16px;margin-top:8px;font:14px var(--f-body);color:var(--ink-2)">
          <label><input class="qv-hb" type="checkbox"> Heartbeat (keep extending the timer)</label>
          <label><input class="qv-cr" type="checkbox"> Worker A crashes halfway through</label>
        </div>
        <svg class="qv-svg" viewBox="0 0 600 236" style="width:100%;height:auto;display:block;margin-top:10px" role="img" aria-label="Deliveries timeline"></svg>
        <div class="stats">
          <div class="stat"><span>Deliveries</span><strong class="qv-o-n"></strong></div>
          <div class="stat"><span>Wasted work</span><strong class="qv-o-w"></strong></div>
          <div class="stat"><span>Work finished at</span><strong class="qv-o-d"></strong></div>
          <div class="stat"><span>Wait after the crash</span><strong class="qv-o-r"></strong></div>
        </div>
        <div class="calc-note qv-note"></div>`;
      const $ = c => el.querySelector(c);
      const sim = (J, V, hb, crash) => {
        const D = []; let vis, del = Infinity;
        const add = s => { const c = crash && D.length === 0; const d = { s, c, end: c ? s + J / 2 : s + J }; D.push(d); if (!c) del = Math.min(del, d.end);
          if (hb) { if (c) { const step = V / 2; vis = s + Math.floor((J / 2) / step) * step + V; } else vis = Infinity; } else vis = s + V; };
        add(0);
        while (vis < del && D.length < 40) add(vis);
        return { D, del };
      };
      const upd = () => {
        const J = +$('.qv-j').value, V = +$('.qv-v').value, hb = $('.qv-hb').checked, cr = $('.qv-cr').checked;
        $('.qv-vj').textContent = J + ' s'; $('.qv-vv').textContent = V + ' s';
        const { D, del } = sim(J, V, hb, cr);
        const tmax = Math.max(...D.map(d => d.end), del) * 1.05, X = t => 96 + (t / tmax) * 489;
        const rows = D.slice(0, 7), rh = 26;
        let svg = `<line x1="96" x2="585" y1="196" y2="196" stroke="var(--line-2)"/>
          <text x="96" y="216" font-size="14" fill="var(--ink-3)" font-family="var(--f-mono)">0 s</text>
          <text x="585" y="216" text-anchor="end" font-size="14" fill="var(--ink-3)" font-family="var(--f-mono)">${Math.round(tmax)} s</text>
          <line x1="${X(del)}" x2="${X(del)}" y1="8" y2="196" stroke="var(--green)" stroke-dasharray="4 3"/>
          <text x="${Math.min(X(del) + 4, 520)}" y="190" font-size="14" fill="var(--green)" font-family="var(--f-mono)">delete</text>`;
        rows.forEach((d, i) => {
          const y = 12 + i * rh, nm = 'Worker ' + String.fromCharCode(65 + i);
          svg += `<text x="90" y="${y + 15}" text-anchor="end" font-size="14" fill="var(--ink-2)" font-family="var(--f-mono)">${nm}</text>
            <rect x="${X(d.s)}" y="${y}" width="${Math.max(2, X(d.end) - X(d.s))}" height="20" rx="3" fill="${i === 0 ? 'var(--accent)' : 'var(--amber)'}" opacity="0.85"/>`;
          if (d.c) svg += `<text x="${X(d.end) + 3}" y="${y + 16}" font-size="16" font-weight="700" fill="var(--red)">X</text>`;
        });
        if (D.length > 7) svg += `<text x="585" y="${12 + 7 * rh + 4}" text-anchor="end" font-size="14" fill="var(--ink-3)" font-family="var(--f-mono)">+${D.length - 7} more</text>`;
        $('.qv-svg').innerHTML = svg;
        const wasted = D.reduce((a, d) => a + (d.end - d.s), 0) - J;
        $('.qv-o-n').textContent = D.length;
        $('.qv-o-w').textContent = Math.round(wasted) + ' s';
        $('.qv-o-d').textContent = Math.round(del) + ' s';
        $('.qv-o-r').textContent = cr && D[1] ? Math.round(D[1].s - J / 2) + ' s' : '-';
        let note;
        if (!cr && D.length > 1) note = `The timeout (${V} s) is shorter than the job (${J} s). Worker A is alive, but at ${V} s SQS thought "maybe it died" and gave the message to Worker B. Then to C... The same video is being made ${D.length} times. Fix: make the timeout longer than the job, or turn on the heartbeat.`;
        else if (!cr) note = hb ? `The heartbeat extended the timer every ${V / 2} s, so the message stayed with Worker A only. One delivery, zero waste.` : `The timeout (${V} s) is longer than the job (${J} s), so there is only one delivery. Now turn "crash" on and see how costly a long timeout is after a crash.`;
        else note = `Worker A died at ${J / 2} s. Worker B got the message ${Math.round(D[1].s - J / 2)} s later. ` + (hb ? `With a heartbeat you can keep the timeout short (${V} s), so a crash is caught quickly. This is the best combo: a short timeout + a heartbeat.` : V >= J ? `A long timeout stops duplicates, but after the crash the message stayed hidden for this long. A short timeout + a heartbeat solves both problems.` : `A short timeout without a heartbeat: the crash was caught quickly, but the work of live workers is also being duplicated.`);
        $('.qv-note').textContent = note;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'tip', html: `With the defaults (job 180 s, timeout 30 s), one video is made <strong>6 times</strong>: deliveries at 0, 30, 60, 90, 120 and 150 s. Turn on the heartbeat: 1 delivery. Now turn on the crash too: A died at 90 s, B got it at 120 s (only a 30 s wait). Turn the heartbeat off and set the timeout to 600 s: B got it at 600 s, so the video was stuck for <strong>510 s</strong>. That is why: a short timeout + a heartbeat.` },
    { type: 'callout', tone: 'term', title: 'Poison message and dead-letter queue (DLQ)', html: `<strong>What it is:</strong> a poison message = a message that will never succeed (a corrupt video, a code bug, a missing record). A DLQ = a separate queue for "bad messages". After a few tries, the poison message is taken out of the main line and parked here.<br><strong>Why we need it:</strong> a poison message comes back again and again and eats worker time on every try.<br><strong>Without it:</strong> one bad video is retried forever, worker time is wasted, and sometimes the whole line gets stuck.` },
    { type: 'h2', text: 'Run it: queue + workers' },
    { type: 'p', html: `There are four scenarios. First the happy path, then three things that always happen in real life: a worker dies in the middle, one bad message fails again and again, and a traffic spike arrives. Click the boxes to read what each one does.` },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'u', label: 'Riya\'s app', sub: 'video upload', x: 80, y: 165, w: 130, kind: 'client', info: 'What it is: the xyz.com app on Riya\'s phone. The video file is first uploaded to object storage (that is a separate lesson). Here we only look at the "now process this video" task.' },
        { id: 'api', label: 'Upload API', sub: 'producer', x: 240, y: 165, w: 130, kind: 'server', info: 'What it is: our server that receives the "process it" request after the upload. In this design it is the producer. It does not do the heavy work itself. It only adds a row to the jobs table, puts a message in the queue, and replies 202 Accepted at once. So it stays fast and light.' },
        { id: 'db', label: 'Jobs table', sub: 'status', x: 240, y: 55, w: 130, kind: 'data', info: 'What it is: a database table with one row per job. Status: QUEUED, PROCESSING, DONE, FAILED. The user checks "is my video ready?" here. A queue is not a place to store status; it only delivers work.' },
        { id: 'q', label: 'Queue', sub: 'broker', x: 420, y: 165, w: 140, kind: 'queue', info: 'What it is: the broker (RabbitMQ / SQS), the line of work. It keeps messages safely until a worker processes them and sends an ack. Each message goes to only one worker (point-to-point).' },
        { id: 'w1', label: 'Worker 1', sub: 'consumer', x: 620, y: 75, w: 150, kind: 'server', info: 'What it is: a machine that only converts videos (a consumer). It takes a message from the queue, does the work (transcode, email), then sends the broker an ack: "done, delete it now". Workers are stateless, so going from 2 to 200 is easy.' },
        { id: 'w2', label: 'Worker 2', sub: 'consumer', x: 620, y: 255, w: 150, kind: 'server', info: 'What it is: a second machine just like Worker 1. Both workers take messages from the same queue, so the work is shared out by itself. This is called the competing consumers pattern.' },
        { id: 'dlq', label: 'Dead-letter Q', sub: 'bad messages', x: 420, y: 290, w: 140, kind: 'queue', hidden: true, info: 'What it is: the dead-letter queue (DLQ), a separate line for bad messages. A message that fails again and again is moved here from the main queue, so it does not block other work. An engineer looks at it later, fixes it, and can send the message back (redrive).' },
      ],
      edges: [{ a: 'u', b: 'api' }, { a: 'api', b: 'db' }, { a: 'api', b: 'q' }, { a: 'q', b: 'w1' }, { a: 'q', b: 'w2' }, { a: 'w1', b: 'db', id: 'wd' }, { a: 'q', b: 'dlq', id: 'qd', hidden: true }],
      scenarios: [
        { name: 'Happy path', steps: [
          { title: 'Upload complete, ask for processing', text: 'Riya\'s video is uploaded. The app says: process it.', go: 'u>api', msg: 'POST /videos/7/process' },
          { title: 'Create the job record', text: 'The API writes a row in the jobs table: job 42, status QUEUED.', go: ['api>db', 'res:db>api'], after: { db: { sub: 'job 42: QUEUED' } }, msg: 'INSERT INTO jobs (id, video_id, status) VALUES (42, 7, \'QUEUED\')' },
          { title: 'Put a message in the queue', text: 'The message is small: just the job ID and the video ID. The video file itself does not go into the queue (it is far too big). The broker saves the message to disk, then tells the producer "got it".', go: 'api>q', after: { q: { sub: '1 message' } }, msg: 'SEND  { "job_id": 42, "video_id": 7 }' },
          { title: 'Instant answer: 202 Accepted', text: 'The upload request finishes in ~200 ms. Riya can close the app. The server\'s thread is free.', go: 'res:api>u', msg: '202 Accepted\n{ "job_id": 42, "status": "QUEUED" }' },
          { title: 'A worker takes the message', text: 'Worker 1 receives the message from the queue. The message is <strong>not deleted</strong> yet. It is "in-flight": other workers cannot see it, but the broker still has it.', go: 'q>w1', set: { w1: { state: 'hot', sub: 'transcoding...' } }, after: { q: { sub: 'msg 42: in-flight' } } },
          { title: 'Work done, status update, ack', text: 'Transcoding is done. The worker writes status DONE, then sends the broker an <strong>ack</strong>. Only when the ack arrives does the broker delete the message.', go: ['w1>db', 'w1>q'], after: { w1: { state: 'ok', sub: 'done' }, db: { sub: 'job 42: DONE' }, q: { sub: 'empty' } }, msg: 'UPDATE jobs SET status = \'DONE\' WHERE id = 42\nACK msg 42   →  broker deletes it' },
          { title: 'How did Riya find out?', text: 'Either the app asks <code>GET /jobs/42</code> every little while (polling), or the server sends a push notification / SSE. Both are in the next "real-time" lessons.', go: ['u>api>db', 'res:db>api>u'], msg: 'GET /jobs/42  →  { "status": "DONE" }' },
        ]},
        { name: 'Worker crash (before ack)', intro: 'The worker died in the middle of the work. Will the message be lost?', steps: [
          { title: 'Worker 1 took the message', text: 'Message 42 is in-flight.', go: 'q>w1', set: { w1: { state: 'hot', sub: 'transcoding...' } }, after: { q: { sub: 'msg 42: in-flight' } } },
          { title: 'Crash!', text: 'Worker 1\'s machine went down (out of memory, a deploy, hardware). The ack never came.', set: { w1: { state: 'down', sub: 'CRASHED' } }, go: 'lost:w1>q' },
          { title: 'The broker puts the message back in line', text: 'In <strong>SQS</strong>: when the message\'s <strong>visibility timeout</strong> (default 30 seconds) ends, it becomes visible again. In <strong>RabbitMQ</strong>: as soon as the worker\'s connection closes, the unacked message is requeued at once, with a "redelivered" flag.', focus: ['q'], after: { q: { state: 'warn', sub: 'msg 42: visible' } } },
          { title: 'Worker 2 gets it and finishes', text: 'Worker 2 took the same message, did the work, and sent the ack. The message was not lost. This is called <strong>at-least-once delivery</strong>: the message will be processed at least once, for sure.', go: ['q>w2', 'w2>q'], set: { w2: { state: 'hot', sub: 'transcoding...' } }, after: { w2: { state: 'ok', sub: 'done + ack' }, q: { state: '', sub: 'empty' } } },
          { title: 'A hidden danger: duplicates', text: 'Imagine Worker 1 had already emailed the followers before it crashed. Now Worker 2 will send again. The followers get <strong>two emails</strong>. At-least-once means "sometimes twice". So the consumer must be <strong>idempotent</strong>: even if the same message comes twice, the effect happens once (try it in the crash lab below).', focus: ['w2'] },
        ]},
        { name: 'Poison message → DLQ', intro: 'One video file is corrupt. The transcoder will crash or fail on it every time.', steps: [
          { title: 'Attempt 1: fail', text: 'Worker 1 took message 99: the file is corrupt, error. The worker sends a <strong>nack</strong> ("could not do it") or just does not ack.', go: ['q>w1', 'bad:w1>q'], set: { w1: { state: 'warn', sub: 'error!' } }, after: { q: { sub: 'msg 99: attempt 1' } } },
          { title: 'Retry, with backoff', text: 'The message comes back and another worker tries. A good system waits longer between each retry (1 s, 2 s, 4 s...), so that a short problem (the DB down for a moment) has time to heal.', go: ['q>w2', 'bad:w2>q'], set: { w2: { state: 'warn', sub: 'error!' } }, after: { q: { sub: 'msg 99: try 2..5' } } },
          { title: 'Limit crossed: send it to the DLQ', text: 'This message will never succeed. Retrying forever wastes worker time and holds up other messages. So there is a limit: <code>maxReceiveCount</code> in SQS (say 5), <code>delivery-limit</code> in a RabbitMQ quorum queue. After the limit, the message moves to the <strong>dead-letter queue</strong>.', show: ['dlq', 'qd'], go: 'bad:q>dlq', after: { dlq: { state: 'warn', sub: 'msg 99 + alarm' }, q: { sub: 'normal' }, w1: { state: '' }, w2: { state: '' } } },
          { title: 'Other work runs normally', text: 'One bad message did not block the whole line.', parallel: true, go: ['q>w1', 'q>w2'], after: { w1: { state: 'ok', sub: 'ok' }, w2: { state: 'ok', sub: 'ok' } } },
          { title: 'An engineer fixes it, then redrives', text: 'The DLQ has an alarm. The engineer found a bug with a new video format. They fixed the code, then sent the DLQ messages back to the main queue (<strong>redrive</strong>).', go: 'evt:dlq>q', after: { dlq: { state: '', sub: 'empty' } } },
        ]},
        { name: 'Spike absorb', intro: 'At 9 pm a big creator went live. Uploads are 5 times higher.', steps: [
          { title: 'A flood of uploads', text: 'Every upload goes from the API into the queue. The API\'s work is light (one insert, one send), so the API survives.', flood: { paths: ['u>api>q'], n: 14 }, after: { q: { state: 'warn', sub: 'depth: 21,000' }, api: { state: 'ok' } } },
          { title: 'Workers keep their own pace', text: 'The workers\' load did not rise: they kept taking messages at the same speed as before. The queue "stored" the extra work. This is called <strong>queue-based load levelling</strong>: incoming traffic goes up and down, processing stays steady.', parallel: true, go: ['q>w1', 'q>w2'], set: { w1: { state: 'hot', sub: 'steady pace' }, w2: { state: 'hot', sub: 'steady pace' } } },
          { title: 'The price: delay', text: 'Nothing fell over, but a video that arrived at 9:05 was maybe ready at 9:30. The async trade-off: <strong>latency in exchange for availability</strong>. Fix: autoscale the workers on queue depth or on "age of the oldest message".', focus: ['q'] },
          { title: 'What if the spike never ends?', text: 'If producers are always faster than consumers, the queue cannot grow forever (disk or memory runs out). Then the system must tell the producer <strong>"wait"</strong>: set a max queue length, and have the API answer new jobs with 503 / 429 + Retry-After. This is <strong>backpressure</strong>.', go: ['u>api', 'bad:api>u'], after: { q: { state: 'hot', sub: 'FULL (max length)' } }, msg: '503 Service Unavailable\nRetry-After: 60' },
        ]},
      ],
    },

    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"A queue makes the work faster." No! Transcoding still takes 3 minutes. A queue <strong>moves the work out of the request path</strong> and smooths the traffic. The total work is the same; if there are too few workers, a backlog builds up. To raise throughput, add workers.` },

    { type: 'callout', tone: 'term', title: 'Backlog and queue-based load levelling', html: `<strong>What it is:</strong> backlog = work piled up in the queue that is not done yet. Load levelling = putting the queue between the producer and the workers like a "shock absorber": incoming traffic goes up and down, but the workers keep a steady speed.<br><strong>Why we need it:</strong> you can size the workers for <strong>average</strong> traffic, not the <strong>peak</strong>. Cheaper.<br><strong>Without it:</strong> either 5 times more machines for the peak (idle most of the time), or everything falls over in a spike.<br><strong>Condition:</strong> the average load must be below capacity, and users must be OK with waiting a bit.` },
    { type: 'callout', tone: 'term', title: 'Backpressure', html: `<strong>What it is:</strong> the slow part sends the fast part a "slow down" or "not now" signal. For example, when the queue is full, the API answers new jobs with <code>503</code> / <code>429</code> + <code>Retry-After</code>.<br><strong>Why we need it:</strong> a queue cannot grow forever. Disk or memory will run out and the broker itself will fail.<br><strong>Without it:</strong> everything slowly sinks, then fails all at once.` },
    { type: 'h2', text: 'Simulator: spike, backlog and backpressure' },
    { type: 'p', html: `A 120-minute day. A spike comes from minute 10 to 20. Each worker does 60 jobs per minute. Move the sliders and see: how long the queue gets, how long the oldest job waits, when the queue is full and requests start getting rejected (backpressure), and how poison messages eat capacity.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Normal jobs / minute: <strong class="qs-vbase"></strong></label><input class="qs-base" type="range" min="100" max="2000" step="50" value="600"></div>
          <div><label>Jobs / minute during the spike: <strong class="qs-vspike"></strong></label><input class="qs-spike" type="range" min="0" max="6000" step="100" value="3000"></div>
          <div><label>Workers (60 jobs/min each): <strong class="qs-vw"></strong></label><input class="qs-w" type="range" min="1" max="60" step="1" value="15"></div>
          <div><label>Queue max length: <strong class="qs-vmax"></strong></label><input class="qs-max" type="range" min="5000" max="100000" step="5000" value="50000"></div>
          <div><label>Poison messages (each tried 5 times, then DLQ): <strong class="qs-vp"></strong></label><input class="qs-p" type="range" min="0" max="20" step="1" value="0"></div>
        </div>
        <svg class="qs-chart" viewBox="0 0 600 210" style="width:100%;height:auto;display:block;margin-top:12px" role="img" aria-label="Queue depth over 120 minutes"></svg>
        <div class="stats">
          <div class="stat"><span>Max queue depth</span><strong class="qs-o-max"></strong></div>
          <div class="stat"><span>Longest wait</span><strong class="qs-o-wait"></strong></div>
          <div class="stat"><span>Rejected (503)</span><strong class="qs-o-rej"></strong></div>
          <div class="stat"><span>In the DLQ</span><strong class="qs-o-dlq"></strong></div>
          <div class="stat"><span>Backlog cleared</span><strong class="qs-o-drain"></strong></div>
        </div>
        <div class="calc-note qs-note"></div>`;
      const $ = c => el.querySelector(c);
      const fmt = n => Math.round(n).toLocaleString('en-IN');
      const T = 120, SP0 = 10, SP1 = 20, TRIES = 5;
      const upd = () => {
        const base = +$('.qs-base').value, spike = Math.max(base, +$('.qs-spike').value);
        const W = +$('.qs-w').value, maxLen = +$('.qs-max').value, p = +$('.qs-p').value / 100;
        $('.qs-vbase').textContent = fmt(base); $('.qs-vspike').textContent = fmt(spike);
        $('.qs-vw').textContent = W; $('.qs-vmax').textContent = fmt(maxLen); $('.qs-vp').textContent = Math.round(p * 100) + '%';
        const cap = W * 60, eff = cap / (1 + (TRIES - 1) * p);
        let q = 0, rej = 0, dlq = 0, maxQ = 0, maxWait = 0, drain = null; const depth = [];
        for (let t = 0; t < T; t++) {
          const arr = t >= SP0 && t < SP1 ? spike : base;
          q += arr;
          if (q > maxLen) { rej += q - maxLen; q = maxLen; }
          const done = Math.min(q, eff);
          q -= done; dlq += done * p;
          depth.push(q);
          maxQ = Math.max(maxQ, q); maxWait = Math.max(maxWait, q / eff);
          if (t >= SP1 && drain === null && q < 1) drain = t;
        }
        const top = Math.max(maxQ, 1000) * 1.15, X = i => 46 + i * (540 / (T - 1)), Y = v => 180 - (v / top) * 160;
        const pts = depth.map((v, i) => X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ');
        const maxLine = maxLen <= top ? `<line x1="46" x2="586" y1="${Y(maxLen)}" y2="${Y(maxLen)}" stroke="var(--red)" stroke-dasharray="5 4"/><text x="584" y="${Y(maxLen) - 5}" text-anchor="end" font-size="13" fill="var(--red)" font-family="var(--f-mono)">max length</text>` : '';
        $('.qs-chart').innerHTML = `<rect x="${X(SP0)}" y="20" width="${X(SP1) - X(SP0)}" height="160" fill="var(--accent-soft)"/>
          <text x="${(X(SP0) + X(SP1)) / 2}" y="16" text-anchor="middle" font-size="13" fill="var(--ink-3)" font-family="var(--f-mono)">spike</text>
          <line x1="46" x2="586" y1="180" y2="180" stroke="var(--line-2)"/><line x1="46" x2="46" y1="20" y2="180" stroke="var(--line-2)"/>
          <text x="40" y="24" text-anchor="end" font-size="13" fill="var(--ink-3)" font-family="var(--f-mono)">${fmt(top)}</text>
          <text x="40" y="183" text-anchor="end" font-size="13" fill="var(--ink-3)" font-family="var(--f-mono)">0</text>
          <text x="316" y="200" text-anchor="middle" font-size="13" fill="var(--ink-3)" font-family="var(--f-mono)">minute 0 → 120 (line = jobs waiting in the queue)</text>
          ${maxLine}<polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>`;
        $('.qs-o-max').textContent = fmt(maxQ);
        $('.qs-o-wait').textContent = maxWait < 1 ? '< 1 min' : maxWait.toFixed(1) + ' min';
        $('.qs-o-rej').textContent = fmt(rej);
        $('.qs-o-dlq').textContent = fmt(dlq);
        $('.qs-o-drain').textContent = maxQ < 1 ? 'never formed' : drain === null ? 'not within 120 min' : 'minute ' + drain;
        let note;
        if (base >= eff) note = `Even normal traffic (${fmt(base)}/min) is more than the workers' real capacity (${fmt(eff)}/min). The queue will never empty; it will only grow. A queue absorbs spikes, not constant overload. Add workers, or slow the producers with backpressure.`;
        else if (rej > 0) note = `The spike was so big that the queue filled up to its max length and ${fmt(rej)} jobs were rejected (the API returned 503/429). This is backpressure: a clear "not now" is better than everything crashing in a panic. Raise the limit, add workers, or let the client retry later.`;
        else if (drain === null) note = `The queue handled the spike, but the backlog was not cleared even in 120 minutes: after the spike the workers have only ${fmt(eff - base)} jobs/min of spare capacity. Users wait for hours. You need autoscaling.`;
        else note = `The queue absorbed the spike: no request was rejected. During the spike, ${fmt(spike - eff)} extra jobs arrived every minute; they piled up in the queue and were cleared later with ${fmt(eff - base)}/min of spare capacity. The price: the worst job waited ~${maxWait.toFixed(0)} minutes.`;
        if (p > 0) note += ` Poison messages are only ${Math.round(p * 100)}%, but each one is tried 5 times, so they ate ${Math.round((1 - 1 / (1 + (TRIES - 1) * p)) * 100)}% of the capacity (real capacity dropped from ${fmt(cap)}/min to ${fmt(eff)}/min). The DLQ keeps this waste limited.`;
        $('.qs-note').textContent = note;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'tip', html: `With the default values: 15 workers = 900 jobs/min capacity. During the spike 3,000/min arrive, so for 10 minutes 2,100 pile up every minute: a backlog of ~21,000. After the spike there is only 300/min of spare capacity, so it takes ~70 minutes to clear. Now set "Poison" to 5%: capacity drops ~17% and the backlog is not cleared even in 120 minutes. See how costly one small bug is!` },

    { type: 'h2', text: 'Point-to-point vs pub/sub' },
    { type: 'p', html: `So far our queue was <strong>point-to-point</strong>: one message, one worker. But three different teams care about the news "a video was uploaded": the transcoder, the email service and analytics. Each one needs its own <em>copy</em>. This is called <strong>publish/subscribe (pub/sub)</strong>.` },
    { type: 'compare',
      left: { title: 'Point-to-point (queue)', html: `• One message → <strong>one</strong> consumer<br>• Many workers share the work<br>• "Do this task" messages<br>• Example: a transcode job, sending an email` },
      right: { title: 'Pub/sub (topic / fanout)', html: `• One message → a copy for <strong>every subscriber</strong><br>• The publisher does not know who is listening<br>• "This happened" events<br>• Example: video.uploaded → transcoder, email, analytics` },
    },
    { type: 'callout', tone: 'term', title: 'Point-to-point queue', html: `<strong>What it is:</strong> one line, many workers. Each message goes to <strong>only one</strong> worker. The workers share the work among themselves (this is also called <strong>competing consumers</strong>).<br><strong>Why we need it:</strong> a task like "convert this video" must happen only once. Two workers making the same video is waste.<br><strong>Without it:</strong> there is no clean way to share out the work.<br><strong>Example:</strong> 6 transcode jobs, 3 workers → about 2 each.` },
    { type: 'callout', tone: 'term', title: 'Pub/sub (publish / subscribe)', html: `<strong>What it is:</strong> one message, many <strong>subscribers</strong> (listeners), and each subscriber gets its own copy. The sender (<strong>publisher</strong>) says "this happened" once, and everyone who subscribed gets the news.<br><strong>Why we need it:</strong> three teams must act when "a video was uploaded". If the Upload API called each of them, its code would change for every new team.<br><strong>Without it:</strong> the publisher knows and is tied to everyone. One slow subscriber makes the publisher slow too.<br><strong>Example:</strong> 6 upload events, 3 subscribers → 18 copies (6 for each subscriber).` },
    { type: 'callout', tone: 'term', title: 'Exchange and binding (RabbitMQ)', html: `<strong>What it is:</strong> in RabbitMQ the producer does not send straight to a queue. It sends to an <strong>exchange</strong> (a sorting machine). The exchange looks at <strong>bindings</strong> (rules) and puts the message into one or many queues. Types: <strong>direct</strong> (the routing key matches exactly), <strong>fanout</strong> (a copy to every connected queue), <strong>topic</strong> (pattern match, like <code>video.*</code>), <strong>headers</strong> (headers match).<br><strong>Why we need it:</strong> this lets one broker do both point-to-point and pub/sub.<br><strong>Without it:</strong> the producer would need to know every queue's name.<br><strong>On AWS:</strong> the same job is done by <strong>an SNS topic → many SQS queues</strong> (each subscriber has its own SQS queue).` },
    { type: 'p', html: `<strong>Pub/sub lab.</strong> 6 upload events (v1 to v6). Pick a mode and see which consumer got which message. Turn on "Email service down": in a durable queue the message waits; in plain pub/sub like Redis Pub/Sub it is lost.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="qp-modes" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <label style="display:block;margin-top:10px;font:14px var(--f-body);color:var(--ink-2)"><input class="qp-down" type="checkbox"> Email service (or Worker 2) is down during v4, v5</label>
        <div class="qp-grid" style="margin-top:12px;display:grid;gap:6px"></div>
        <div class="stats">
          <div class="stat"><span>Total deliveries</span><strong class="qp-tot"></strong></div>
          <div class="stat"><span>Arrived after waiting</span><strong class="qp-late"></strong></div>
          <div class="stat"><span>Lost</span><strong class="qp-lost"></strong></div>
        </div>
        <div class="calc-note qp-note"></div>`;
      const MODES = { p2p: 'Point-to-point: 1 queue, 3 workers', ps: 'Pub/sub: 3 subscribers (durable)', psg: 'Pub/sub + 2 workers in each subscriber', redis: 'Plain pub/sub (Redis, no storage)' };
      const M = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'], DOWN = ['v4', 'v5'];
      let mode = 'p2p';
      const run = () => {
        const down = el.querySelector('.qp-down').checked;
        const box = el.querySelector('.qp-modes'); box.innerHTML = '';
        Object.entries(MODES).forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small' + (mode === k ? ' primary' : ''); b.textContent = v; b.onclick = () => { mode = k; run(); }; box.appendChild(b); });
        const rows = []; let tot = 0, late = 0, lost = 0;
        if (mode === 'p2p') {
          const W = { 'Worker 1': [], 'Worker 2': [], 'Worker 3': [] }, names = Object.keys(W); let k = 0;
          M.forEach(m => { const av = names.filter(n => !(down && n === 'Worker 2' && DOWN.includes(m))); W[av[k % av.length]].push({ m }); k++; tot++; });
          names.forEach(n => rows.push([n, W[n]]));
        } else {
          const subs = ['Transcoder', 'Email', 'Analytics'];
          subs.forEach(sb => {
            const got = M.map(m => {
              if (down && sb === 'Email' && DOWN.includes(m)) { if (mode === 'redis') { lost++; return { m, lost: 1 }; } late++; tot++; return { m, late: 1 }; }
              tot++; return { m };
            });
            if (mode === 'psg') { rows.push([sb + ' · w1', got.filter((g, i) => i % 2 === 0)]); rows.push([sb + ' · w2', got.filter((g, i) => i % 2 === 1)]); }
            else rows.push([sb, got]);
          });
        }
        el.querySelector('.qp-grid').innerHTML = rows.map(([n, list]) => `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px"><span style="min-width:120px;font:600 13px var(--f-mono);color:var(--ink-2)">${n}</span>` +
          list.map(g => `<span class="chip${g.lost || g.late ? '' : ' on'}" style="${g.lost ? 'text-decoration:line-through;color:var(--red)' : g.late ? 'color:var(--amber)' : ''}">${g.m}${g.late ? ' (later)' : g.lost ? ' (lost)' : ''}</span>`).join('') + `</div>`).join('');
        el.querySelector('.qp-tot').textContent = tot;
        el.querySelector('.qp-late').textContent = late;
        el.querySelector('.qp-lost').textContent = lost;
        const N = { p2p: `Each message goes to only one worker: 6 messages, 6 deliveries, about 2 per worker.` + (down ? ' Worker 2 was down, so the messages that would have been its turn went to the other workers. The work did not stop.' : ''),
          ps: `Every subscriber gets a copy of every message: 6 × 3 = 18 deliveries.` + (down ? ' Email had its own durable queue, so v4 and v5 waited there and arrived when the service came back.' : ''),
          psg: `Every subscriber gets a copy, but inside each subscriber 2 workers share the work point-to-point. This is the real-world pattern: pub/sub outside, competing consumers inside.` + (down ? ' Email\'s v4 and v5 waited in its durable queue and arrived later.' : ''),
          redis: `Plain pub/sub does not store messages. Only whoever is listening at that moment gets them.` + (down ? ' Email was down, so v4 and v5 are gone forever. Use it only for work where losing some is fine.' : ' Nobody is down right now, so everyone got everything. Turn "down" on and see.') };
        el.querySelector('.qp-note').textContent = N[mode];
      };
      el.querySelector('.qp-down').addEventListener('input', run); run();
    }},
    { type: 'flow', title: 'Pub/sub: one event, three subscribers', height: 320,
      nodes: [
        { id: 'api', label: 'Upload API', sub: 'publisher', x: 100, y: 160, w: 140, kind: 'server', info: 'What it is: the Upload API, this time acting as a publisher. It sends the "video.uploaded" event once. It does not know how many are listening. If a new team subscribes tomorrow, the Upload API code does not change.' },
        { id: 'ex', label: 'Fanout exchange', sub: 'video.uploaded', x: 330, y: 160, w: 160, kind: 'queue', info: 'What it is: a fanout exchange (RabbitMQ) or an SNS topic (AWS), the part that makes copies. It makes a copy of the message for each subscriber. In a durable setup each subscriber has its own queue.' },
        { id: 't', label: 'Transcoder', sub: 'own queue', x: 590, y: 55, w: 160, kind: 'server', info: 'What it is: the video-converting team\'s service. Subscriber 1, with its own queue. It can have 50 workers that share that queue point-to-point.' },
        { id: 'n', label: 'Email service', sub: 'own queue', x: 590, y: 160, w: 160, kind: 'server', info: 'What it is: the service that sends emails. Subscriber 2. It emails followers about the "new video".' },
        { id: 'a', label: 'Analytics', sub: 'own queue', x: 590, y: 265, w: 160, kind: 'server', info: 'What it is: the analytics service that makes counts and charts. Subscriber 3: upload counts, dashboards.' },
      ],
      edges: [{ a: 'api', b: 'ex' }, { a: 'ex', b: 't' }, { a: 'ex', b: 'n' }, { a: 'ex', b: 'a' }],
      scenarios: [
        { name: 'Fan-out', steps: [
          { title: 'Publish one event', text: 'The Upload API sent just one message.', go: 'evt:api>ex', msg: 'PUBLISH video.uploaded { "video_id": 7, "user": "riya" }' },
          { title: 'Three copies', text: 'The exchange put a copy into each subscriber\'s queue. All three work at their own speed, without knowing about each other.', parallel: true, go: ['evt:ex>t', 'evt:ex>n', 'evt:ex>a'], after: { t: { state: 'ok' }, n: { state: 'ok' }, a: { state: 'ok' } } },
        ]},
        { name: 'Subscriber down (durable queues)', steps: [
          { title: 'Email service down', text: 'A deploy is running; the email service is off for 10 minutes.', set: { n: { state: 'down', sub: 'DOWN' } }, focus: ['n'] },
          { title: 'An event arrives', text: 'The transcoder and analytics got it at once. The email service\'s copy piled up in its <strong>durable queue</strong>.', parallel: true, go: ['evt:api>ex', 'evt:ex>t', 'evt:ex>a'], after: { n: { sub: 'queue: 1 waiting' } } },
          { title: 'Service back, backlog processed', text: 'The email service picked up the waiting messages. Nothing was lost.', set: { n: { state: 'ok', sub: 'catching up' } }, go: 'evt:ex>n' },
        ]},
        { name: 'Plain pub/sub (Redis Pub/Sub)', intro: 'A "fire and forget" system like Redis Pub/Sub does not store messages.', steps: [
          { title: 'Email service disconnected', text: 'Same situation: the email service is gone for a short while.', set: { n: { state: 'down', sub: 'DOWN' } }, focus: ['n'] },
          { title: 'The message reaches only those online', text: 'Whoever was connected at that moment got it. For the email service the message is <strong>gone forever</strong>. No queue, no replay.', parallel: true, go: ['evt:api>ex', 'evt:ex>t', 'evt:ex>a', 'lost:ex>n'] },
          { title: 'So when is this OK?', text: 'When the message is about "right now" and losing it is fine: like passing a chat message to the gateway server where the user is connected at this moment (the real message is already saved in the DB). We will see this in the real-time lesson.', focus: ['ex'] },
        ]},
      ],
    },

    { type: 'h2', text: 'RabbitMQ vs Amazon SQS' },
    { type: 'table', head: ['', 'RabbitMQ', 'Amazon SQS'], rows: [
      ['What it is', 'An open-source broker; you run it yourself (or buy a managed service)', 'A fully managed AWS queue; no servers to worry about'],
      ['Routing', 'Exchanges + bindings: direct, fanout, topic, headers', 'Only queues. For fan-out: an SNS topic → many SQS queues'],
      ['Getting messages', 'The broker pushes to consumers (with a prefetch limit)', 'The consumer polls; with long polling it can wait up to 20 seconds'],
      ['If no ack comes', 'Requeued when the connection/channel closes; the channel is closed on ack timeout (default 30 min)', 'The message becomes visible again after the visibility timeout (default 30 s, max 12 h)'],
      ['Ordering', 'Ordered with one queue + one consumer; many consumers or requeues can break the order', 'Standard: best-effort order, at-least-once. FIFO: strict order inside each message group'],
      ['Duplicates', 'Redelivery is possible (at-least-once)', 'Standard: sometimes a duplicate. FIFO: removes duplicate sends within a 5-minute dedup window'],
      ['How long a message stays', 'Until it is acked (add a TTL if you want)', 'Default 4 days, max 14 days; one message max 1 MiB'],
      ['DLQ', 'Dead-letter exchange: reject (requeue=false), TTL expiry, queue length limit, quorum queue delivery-limit (default 20 in RabbitMQ 4.0+)', 'Redrive policy: DLQ after maxReceiveCount. Moving messages back from the DLQ (redrive) is supported too'],
      ['Pick it when', 'Complex routing, low latency, your own infra, the AMQP protocol (RabbitMQ\'s standard "language")', 'You are on AWS, want zero ops, and have very large, unpredictable scale'],
    ]},
    { type: 'callout', tone: 'term', title: 'SQS FIFO queue', html: `<strong>What it is:</strong> FIFO = First In, First Out. An SQS queue where every message carries a <strong>message group ID</strong> (like <code>user_42</code>). Messages of one group come in strict order, one at a time: while the first one is in-flight, the next one from that group is not handed out. Different groups run in parallel. There is also a <strong>deduplication ID</strong>: if a message with the same ID is sent again within 5 minutes, the queue does not add it again.<br><strong>Why we need it:</strong> where order matters, like one user's "account created" → "name changed" → "account closed" events.<br><strong>Without it:</strong> in a standard queue, "account closed" might be processed first.<br><strong>Careful:</strong> AWS calls this "exactly-once processing", but it only promises <em>no duplicates entering the queue</em>. If a worker crashes before the ack, the message comes again. And it is slower: about 300 calls/second without batching (much more in high-throughput mode).` },

    { type: 'h2', text: 'Delivery semantics: at-most, at-least, exactly-once' },
    { type: 'p', html: `Networks and machines can fail at any moment. The question is: when something crashes, what happens to the message? There are three answers, and the difference mostly comes from one thing: <strong>when the worker sends the ack</strong>. These are called "delivery guarantees" (or delivery semantics).` },
    { type: 'callout', tone: 'term', title: 'At-most-once', html: `<strong>What it is:</strong> ack (or auto-ack) as soon as the message arrives, then do the work. If the worker crashes in the middle, the message is gone, because the broker already deleted it.<br><strong>Why we need it:</strong> it is the cheapest and fastest. Never a duplicate.<br><strong>Without it (when it is the wrong choice):</strong> important work (a payment, an email) can quietly disappear.<br><strong>Example:</strong> a "typing..." indicator, a live viewer count, debug logs. If one is lost, nobody cares.` },
    { type: 'callout', tone: 'term', title: 'At-least-once', html: `<strong>What it is:</strong> do the work first, then ack. If the worker crashes before the ack, the broker gives the message out again. The message is never lost, but sometimes it is processed <strong>twice</strong>.<br><strong>Why we need it:</strong> losing most work is expensive. SQS, RabbitMQ (manual ack) and Kafka all work this way by default.<br><strong>Without it:</strong> work disappears on a crash.<br><strong>Example:</strong> if a video is transcoded twice, we waste a bit of CPU. But if an email goes out twice, the user is annoyed.` },
    { type: 'callout', tone: 'term', title: 'Idempotent (do it twice, the effect happens once)', html: `<strong>What it is:</strong> work that gives the same result whether you do it 1 time or 5 times. Like a lift button: press it 5 times, the lift still comes once.<br><strong>Why we need it:</strong> with at-least-once, duplicates will come. If the consumer is idempotent, a duplicate does no harm.<br><strong>Without it:</strong> every retry creates a new side effect: two emails, money taken twice, a count increased twice.<br><strong>Example:</strong> writing <code>status = 'DONE'</code> 10 times is safe. <code>views = views + 1</code> 10 times is wrong.` },
    { type: 'callout', tone: 'term', title: 'Exactly-once / effectively-once', html: `<strong>What it is:</strong> the <em>effect</em> of a message happens exactly once. In practice it is built from <strong>at-least-once + idempotency</strong>: a duplicate arrives, but the system recognises it and ignores it. That is why many people call it "effectively-once".<br><strong>Why we need it:</strong> payments, orders, emails, counters, where neither loss nor doubling is OK.<br><strong>Without it:</strong> you get either loss or duplicates. There is no third way.` },
    { type: 'table', head: ['Guarantee', 'How', 'What happens on a crash', 'When it is fine'], rows: [
      ['At-most-once', 'Ack as soon as the message arrives, then work', 'A crash mid-work = the message is gone (loss), but never a duplicate', 'Metrics, logs, a "typing..." indicator: losing some is OK'],
      ['At-least-once', 'Work first, then ack', 'A crash before the ack = the message comes again (duplicate possible), no loss', 'The default for most systems'],
      ['Exactly-once (effect)', 'At-least-once + idempotent consumer or dedup', 'The message may come again, but its <em>effect</em> happens only once', 'Payments, orders, emails, counters'],
    ]},
    { type: 'callout', tone: 'mistake', title: 'The "exactly-once delivery" myth', html: `In a distributed system you cannot really guarantee that a message crosses the network <em>exactly one time</em>. If the ack is lost on the way, the sender can never know whether the message arrived, so it must send it again. When people say "exactly-once", they mean <strong>exactly-once processing</strong>: duplicates will arrive, but the system recognises and ignores them. In other words: at-least-once + idempotency.` },
    { type: 'h3', text: 'Crash lab: crash at every point and see' },
    { type: 'p', html: `The worker's job: email the followers about a "new video" (msg 42). In the first row pick the worker style, in the second row pick the crash point. Read the log, and look at the "result at every crash point" row: all crash points for one style at once.<br>Four styles: <strong>at-most-once</strong> (auto-ack), <strong>at-least-once</strong> (work, then ack), <strong>dedup record</strong> (first check whether "sent:42" is written; write the record after the email), and <strong>idempotency key</strong> (send key 42 to the email provider; the provider itself spots duplicates).` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div style="font:600 13px var(--f-body);color:var(--ink-2);margin-bottom:6px">Worker style</div>
        <div class="qd-modes" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div style="font:600 13px var(--f-body);color:var(--ink-2);margin:12px 0 6px">When did Worker A crash?</div>
        <div class="qd-crash" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <ol class="qd-log" style="margin:14px 0 0;padding-left:22px;font:13px/1.6 var(--f-mono);color:var(--ink-2)"></ol>
        <div class="stats">
          <div class="stat"><span>Emails sent</span><strong class="qd-n"></strong></div>
          <div class="stat"><span>Result</span><strong class="qd-r"></strong></div>
        </div>
        <div style="font:600 13px var(--f-body);color:var(--ink-2);margin:12px 0 6px">Result of this style at every crash point</div>
        <div class="qd-matrix" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <div class="calc-note qd-note"></div>`;
      const MODES = { amo: 'At-most-once (auto-ack)', alo: 'At-least-once', idem: 'At-least-once + dedup record', key: 'At-least-once + idempotency key' };
      const CRASH = { none: 'No crash', afterRecv: 'Right after taking it', beforeWork: 'Before the email', afterWork: 'Right after the email', beforeAck: 'Just before the ack', ackLost: 'Ack lost in the network' };
      const STEPS = { amo: ['recvack', 'work'], alo: ['recv', 'work', 'ack'], idem: ['recv', 'check', 'work', 'record', 'ack'], key: ['recv', 'workkey', 'ack'] };
      let mode = 'alo', crash = 'afterWork';
      const simulate = (mode, crash) => {
        const log = []; let emails = 0, acked = false; const keys = new Set(), sent = new Set();
        const runWorker = (name, crashAt) => {
          const st = STEPS[mode];
          for (let i = 0; i < st.length; i++) {
            const s = st[i], isWork = s === 'work' || s === 'workkey';
            if (crashAt === 'beforeWork' && isWork) { log.push(['x', name + ' CRASH (before the email)']); return; }
            if (crashAt === 'beforeAck' && s === 'ack') { log.push(['x', name + ' CRASH (just before the ack)']); return; }
            if (s === 'recvack') { acked = true; log.push(['', name + ' took msg 42; the broker deleted it at once (auto-ack)']); }
            if (s === 'recv') log.push(['', name + ' took msg 42 (in-flight)']);
            if (s === 'check') { if (sent.has(42)) { log.push(['ok', name + ': found the "sent:42" record → email SKIPPED']); i = st.indexOf('ack') - 1; continue; } log.push(['', name + ': checked for a "sent:42" record → not there']); }
            if (s === 'work') { emails++; log.push(['', name + ': sent the email (total ' + emails + ')']); }
            if (s === 'workkey') { if (keys.has(42)) log.push(['ok', name + ': the email provider recognised key 42 → no new email']); else { keys.add(42); emails++; log.push(['', name + ': sent the email with Idempotency-Key: 42 (total ' + emails + ')']); } }
            if (s === 'record') { sent.add(42); log.push(['', name + ': wrote the "sent:42" record']); }
            if (s === 'ack') { if (crashAt === 'ackLost') log.push(['x', name + ': sent the ACK, but it was lost in the network']); else { acked = true; log.push(['', name + ': ACK → the broker deleted msg 42']); } }
            if (crashAt === 'afterRecv' && (s === 'recv' || s === 'recvack')) { log.push(['x', name + ' CRASH (right after taking it)']); return; }
            if (crashAt === 'afterWork' && isWork) { log.push(['x', name + ' CRASH (right after the email)']); return; }
          }
        };
        runWorker('Worker A', crash);
        if (!acked) { log.push(['w', 'Broker: no ack → after the timeout, msg 42 is delivered again']); runWorker('Worker B', 'none'); }
        else if (emails === 0) log.push(['w', 'Broker: msg 42 was already deleted. No retry.']);
        return { log, emails };
      };
      const res = n => n === 0 ? 'LOST' : n > 1 ? 'DUPLICATE' : 'OK';
      const col = r => r === 'OK' ? 'var(--green)' : 'var(--red)';
      const btns = (sel, map, get, set) => {
        const box = el.querySelector(sel); box.innerHTML = '';
        Object.entries(map).forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small' + (get() === k ? ' primary' : ''); b.textContent = v; b.onclick = () => { set(k); run(); }; box.appendChild(b); });
      };
      const run = () => {
        btns('.qd-modes', MODES, () => mode, k => mode = k);
        btns('.qd-crash', CRASH, () => crash, k => crash = k);
        const r = simulate(mode, crash), R = res(r.emails);
        const C = { x: 'var(--red)', ok: 'var(--green)', w: 'var(--amber)', '': 'var(--ink-2)' };
        el.querySelector('.qd-log').innerHTML = r.log.map(([k, l]) => `<li style="color:${C[k]}">${l}</li>`).join('');
        el.querySelector('.qd-n').textContent = r.emails;
        const s = el.querySelector('.qd-r'); s.textContent = R; s.style.color = col(R);
        el.querySelector('.qd-matrix').innerHTML = Object.keys(CRASH).map(c => { const x = res(simulate(mode, c).emails); return `<span class="chip" style="color:${col(x)};${c === crash ? 'border-color:var(--accent)' : ''}">${CRASH[c]}: ${x}</span>`; }).join('');
        let note;
        if (R === 'LOST') note = 'The at-most-once risk: the broker deleted the message as soon as it handed it out, and the work never happened. The follower will never get the email.';
        else if (R === 'DUPLICATE' && mode === 'idem') note = 'The hidden gap of a dedup record: the email went out, but the worker crashed before writing "sent:42". Worker B found no record, so the email went again. You cannot write the email and the record together (atomically), so this gap remains. Fix: send an idempotency key to the provider, or, if the side effect is in your own DB, write it in one transaction with the record.';
        else if (R === 'DUPLICATE') note = 'The at-least-once risk: the work was done, but the ack never reached the broker. To the broker the message was never processed, so it sent it again. The follower gets two emails.';
        else if (mode === 'amo' && crash === 'ackLost') note = 'With auto-ack there is no separate ack; the broker deleted the message when it handed it out. So nothing went wrong here. But try a crash "Right after taking it".';
        else if (mode === 'key') note = 'An idempotency key protects you at every crash point: even if a duplicate request reaches the provider, it sees the key and returns the earlier answer. Delivery is at-least-once, the effect is exactly-once.';
        else note = r.log.some(l => l[0] === 'ok') ? 'The message came twice, but Worker B saw the record and skipped the email. Delivery is at-least-once, the effect is exactly-once.' : 'All good: the email went out exactly once.';
        el.querySelector('.qd-note').textContent = note;
      };
      run();
    }},
    { type: 'callout', tone: 'tip', html: `Summary of the lab (6 crash points for each style): <strong>at-most-once</strong> is LOST in 2 places. <strong>At-least-once</strong> is DUPLICATE in 3 places. <strong>Dedup record</strong> is DUPLICATE in only 1 place ("right after the email", before the record is written). <strong>Idempotency key</strong> is OK everywhere. So "exactly-once" is not a broker setting. It is how you design the consumer.` },
    { type: 'callout', tone: 'tip', title: 'How to build an idempotent consumer', html: `• Every message has a unique ID (given by the producer, like <code>job_id</code> or an event ID).<br>• The consumer keeps a "processed IDs" table, and writes the DB change and the "ID processed" record in <strong>one transaction</strong>.<br>• Or make the work idempotent by itself: setting <code>status = 'DONE'</code> 10 times is safe; <code>count = count + 1</code> is not.<br>• Send an idempotency key to outside APIs (payments, email), as you saw in the idempotency lesson in Foundations.` },

    { type: 'h2', text: 'Retries with backoff' },
    { type: 'p', html: `When a message fails, retrying right away is often wrong. If it failed because the database is overloaded, 1,000 workers retrying at once will push the DB even harder. So we <strong>keep increasing the wait</strong> between retries (exponential backoff), and add a small random difference (<strong>jitter</strong>) so that all workers do not retry at the same moment.` },
    { type: 'table', head: ['Attempt', 'Wait (backoff)', 'With jitter (example)', 'What is happening'], rows: [
      ['1', '-', '-', 'First try, fails'],
      ['2', '1 s', '0.7 s', 'Maybe it was a short glitch'],
      ['3', '2 s', '1.6 s', ''],
      ['4', '4 s', '3.1 s', ''],
      ['5', '8 s', '6.4 s', 'Last try'],
      ['-', '-', '-', 'maxReceiveCount = 5 crossed → DLQ + alarm'],
    ]},
    { type: 'p', html: `A simple way to back off in SQS: when a message fails, raise its visibility timeout with <code>ChangeMessageVisibility</code>. In RabbitMQ, teams often create separate "retry" queues whose messages dead-letter back to the main queue after a TTL. The full story of retries, timeouts and jitter is in the "API gateway, retries, circuit breaker" lesson.` },
    { type: 'callout', tone: 'term', title: 'Exponential backoff and jitter', html: `<strong>What it is:</strong> backoff = after each failure, <strong>double</strong> the wait before the next try (1 s, 2 s, 4 s, 8 s). Jitter = add a small random difference to that wait, so not everyone retries at the same moment.<br><strong>Why we need it:</strong> if the database is down for a short while, it needs time to recover. And if 1,000 workers all retry "after 1 second", the DB gets hit by 1,000 requests at once.<br><strong>Without it:</strong> retries become a new traffic spike, and the sick system never gets better.` },
    { type: 'p', html: `<strong>Retry + DLQ lab.</strong> Pick one of three kinds of failure and change <code>maxReceiveCount</code> (how many tries before the DLQ). Below: 100 messages failed at the same time. See which second their retries land in, with and without jitter.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="qr-sc" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="row2" style="margin-top:10px">
          <div><label>maxReceiveCount: <strong class="qr-vm"></strong></label><input class="qr-m" type="range" min="1" max="8" step="1" value="5"></div>
          <div><label style="display:block;margin-top:18px"><input class="qr-j" type="checkbox"> Jitter on (graph of 100 messages)</label></div>
        </div>
        <div class="qr-tl" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px"></div>
        <div class="stats">
          <div class="stat"><span>Attempts</span><strong class="qr-o-a"></strong></div>
          <div class="stat"><span>Result</span><strong class="qr-o-r"></strong></div>
          <div class="stat"><span>Peak retries (per second)</span><strong class="qr-o-p"></strong></div>
        </div>
        <svg class="qr-svg" viewBox="0 0 600 160" style="width:100%;height:auto;display:block;margin-top:8px" role="img" aria-label="Retries per second"></svg>
        <div class="calc-note qr-note"></div>`;
      const SC = { glitch: 'Short glitch (fails 2 times)', down: 'Database 20 s down', poison: 'Poison message (always fails)' };
      let sc = 'down';
      const timeline = (sc, max) => { const A = []; let t = 0;
        for (let k = 1; k <= max; k++) { if (k > 1) t += Math.pow(2, k - 2);
          const ok = sc === 'glitch' ? k >= 3 : sc === 'down' ? t >= 20 : false; A.push({ k, t, ok }); if (ok) return { A, ok: true, t }; }
        return { A, ok: false, t }; };
      const herd = jit => { let seed = 42; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647; const B = new Array(17).fill(0);
        for (let m = 0; m < 100; m++) { let t = 0; for (let k = 0; k < 4; k++) { const w = Math.pow(2, k); t += jit ? rnd() * w * 2 : w; if (t < 17) B[Math.floor(t)]++; } } return B; };
      const run = () => {
        const box = el.querySelector('.qr-sc'); box.innerHTML = '';
        Object.entries(SC).forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small' + (sc === k ? ' primary' : ''); b.textContent = v; b.onclick = () => { sc = k; run(); }; box.appendChild(b); });
        const max = +el.querySelector('.qr-m').value, jit = el.querySelector('.qr-j').checked;
        el.querySelector('.qr-vm').textContent = max;
        const r = timeline(sc, max);
        el.querySelector('.qr-tl').innerHTML = r.A.map(a => `<span class="chip" style="color:${a.ok ? 'var(--green)' : 'var(--red)'}">#${a.k} @ ${a.t} s: ${a.ok ? 'OK' : 'fail'}</span>`).join('') + (r.ok ? '' : `<span class="chip" style="color:var(--amber)">→ DLQ + alarm</span>`);
        el.querySelector('.qr-o-a').textContent = r.A.length;
        const o = el.querySelector('.qr-o-r'); o.textContent = r.ok ? 'OK, at ' + r.t + ' s' : 'DLQ, at ' + r.t + ' s'; o.style.color = r.ok ? 'var(--green)' : 'var(--red)';
        const B = herd(jit), pk = Math.max(...B), bw = 540 / B.length;
        el.querySelector('.qr-o-p').textContent = pk;
        el.querySelector('.qr-svg').innerHTML = `<line x1="40" x2="580" y1="120" y2="120" stroke="var(--line-2)"/>` +
          B.map((v, i) => `<rect x="${40 + i * bw + 3}" y="${120 - v}" width="${bw - 6}" height="${v}" rx="2" fill="var(--accent)"/>`).join('') +
          `<text x="40" y="146" font-size="14" fill="var(--ink-3)" font-family="var(--f-mono)">second 0</text><text x="580" y="146" text-anchor="end" font-size="14" fill="var(--ink-3)" font-family="var(--f-mono)">16</text>
           <text x="44" y="14" font-size="14" fill="var(--ink-3)" font-family="var(--f-mono)">retries / second (max 100)</text>`;
        let n = sc === 'glitch' ? 'The third try (at 3 s) worked. For a short glitch, 2-3 retries are enough.' : sc === 'down' ? (r.ok ? `The database came back at 20 s, and attempt ${r.A.length} (at ${r.t} s) worked. Backoff gave the DB time to recover.` : `The DB was down for only 20 s, but all ${max} attempts were used up by ${r.t} s. A good message went to the DLQ! Set maxReceiveCount so that the total wait of all attempts is longer than a normal outage.`) : `A poison message will never succeed. After ${max} attempts it goes to the DLQ. Without a limit it would go round and round forever.`;
        n += jit ? ` Jitter on: the retries spread out, peak ${pk} per second.` : ` Jitter off: all 100 retries land in the same second (1, 3, 7, 15 s), peak ${pk}. This is called a "thundering herd". Turn jitter on and see.`;
        el.querySelector('.qr-note').textContent = n;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', run)); run();
    }},
    { type: 'callout', tone: 'tip', html: `With "Database 20 s down" and <code>maxReceiveCount</code> = 5: attempts at 0, 1, 3, 7 and 15 s all fail, and a <em>good</em> message lands in the DLQ. Set it to 6: attempt 6 (at 31 s) works. Jitter off: 100 retries in the same second (peak 100). Jitter on: peak 63, the rest spread out.` },
    { type: 'callout', tone: 'warn', title: 'Retry only idempotent work', html: `A retry means the same message again. If the consumer is not idempotent, every retry can create a new duplicate side effect. Retries and idempotency always go together.` },

    { type: 'h2', text: 'Dead-letter queue (DLQ), a bit deeper' },
    { type: 'list', items: [
      `<strong>Why:</strong> a <strong>poison message</strong> (one that will never succeed: corrupt data, a code bug, a missing record) is retried again and again and eats worker time. In a FIFO queue it even blocks its whole group.`,
      `<strong>How:</strong> in SQS, set <code>maxReceiveCount</code> in the <em>redrive policy</em>. In RabbitMQ, set a <em>dead-letter exchange</em>; a message goes there when it is rejected (requeue=false), its TTL expires, the queue length limit is hit, or a quorum queue's delivery-limit is reached.`,
      `<strong>Never leave a DLQ silent:</strong> put an alarm on "a message arrived in the DLQ". A DLQ is not a dustbin. It is a "hospital": fix the problem, then redrive.`,
      `<strong>The retention trap (SQS):</strong> in a standard queue, a message's expiry counts from its <em>original</em> enqueue time. If it spent 1 day in the main queue and the DLQ retention is 4 days, only 3 days are left in the DLQ. So keep the DLQ retention longer than the main queue's (SQS max 14 days).`,
      `<strong>Watch the order:</strong> with a FIFO queue, a DLQ can break the order (one message was pulled out of the middle). Where the sequence is everything, use it with care.`,
    ]},

    { type: 'h2', text: 'Backpressure' },
    { type: 'p', html: `A queue absorbs spikes. But if the producer is <em>always</em> faster than the consumer, the queue only pushes the problem forward: memory and disk fill up, every job waits longer, and in the end the broker itself can fail. <strong>Backpressure</strong> means: the slow part sends the fast part a "slow down" signal.` },
    { type: 'table', head: ['Method', 'How', 'Example'], rows: [
      ['Bounded queue + reject', 'A max length; when full, new messages are rejected. The API gives the user 503/429 + Retry-After', 'RabbitMQ <code>max-length</code> with <code>overflow=reject-publish</code>'],
      ['Block the producer', 'The broker slows the producer down', 'RabbitMQ blocks publishing connections on a memory or disk alarm'],
      ['Limit the consumer', 'A worker takes only N unacked messages at a time, so it does not overload itself', 'RabbitMQ prefetch; in SQS a worker gets only as many as it asks for'],
      ['Add consumers', 'Autoscale on queue depth or the age of the oldest message', 'KEDA, AWS autoscaling on SQS metrics'],
      ['Load shedding', 'Drop less important work', 'Drop analytics events, never payments'],
    ]},

    { type: 'h2', text: 'Decide: when to use a queue, and when not' },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>A queue is a to-do list: each job is done once by one worker, then it is gone.</strong> Rule of thumb: <em>"Do this task"</em> → queue (SQS, RabbitMQ, Celery/Sidekiq). <em>"This happened, several teams care, and we need replay"</em> → a log like Kafka (next lesson). <em>"Tell whoever is online right now; losing some is fine"</em> → plain pub/sub (Redis Pub/Sub).` },
    { type: 'table', head: ['Stay synchronous when', 'Go async (queue + worker) when'], rows: [
      ['The user needs the result to move on (login, page load)', 'The work is slow: seconds to hours (transcoding, reports, ML)'],
      ['The work takes well under 1 second', 'Traffic is spiky and you want to smooth it'],
      ['The chain is short (2-3 hops)', 'Several downstream systems react to one event'],
      ['A failure must be shown to the user right away', 'A third party is slow or flaky and needs retries'],
    ]},
    { type: 'h2', text: 'The whole picture' },
    { type: 'diagram', title: 'xyz.com upload pipeline: the whole picture', height: 505,
      groups: [
        { label: 'Async: later, at its own pace', x: 405, y: 92, w: 310, h: 398 },
      ],
      nodes: [
        { id: 'app', label: 'Riya\'s app', sub: 'upload + status', x: 110, y: 60, kind: 'client', info: 'What it is: the user\'s xyz.com app. It puts the video file into storage, then says "process it", and later asks for the status (or gets a push).' },
        { id: 's3', label: 'Object storage', sub: 'the real video', x: 300, y: 60, kind: 'data', info: 'What it is: a place for big files (like S3). Why: the video is gigabytes, so it never goes into the queue. The message only carries the video ID, and the worker reads the file from here.' },
        { id: 'api', label: 'Upload API', sub: 'producer', x: 110, y: 200, kind: 'server', info: 'What it is: the producer. It writes the job row, publishes the event, and replies 202 Accepted in about 200 ms. It never does heavy work, so it survives spikes.' },
        { id: 'jobs', label: 'Jobs table', sub: 'QUEUED → DONE', x: 300, y: 360, kind: 'data', info: 'What it is: the status of every job (QUEUED, PROCESSING, DONE, FAILED). Why: a queue is not a place to store status. The user\'s "is it ready?" is answered from here.' },
        { id: 'topic', label: 'Fanout / SNS', sub: 'video.uploaded', x: 300, y: 200, kind: 'queue', info: 'What it is: the pub/sub part that makes copies (a RabbitMQ fanout exchange or an SNS topic). One event, one copy for each subscriber queue. A new team only needs a new queue.' },
        { id: 'tq', label: 'Transcode queue', sub: 'point-to-point', x: 480, y: 150, w: 130, kind: 'queue', info: 'What it is: the transcoder team\'s own durable queue. Inside it is point-to-point: each job goes to one worker. Visibility timeout plus heartbeat; after maxReceiveCount, the DLQ.' },
        { id: 'eq', label: 'Email queue', sub: 'point-to-point', x: 480, y: 295, w: 130, kind: 'queue', info: 'What it is: the email team\'s own queue. If the email service is down, messages wait here. They are not lost.' },
        { id: 'tw', label: 'Transcoders', sub: 'worker pool', x: 640, y: 150, w: 130, kind: 'server', info: 'What it is: the machines that convert videos. Competing consumers: more machines clear the backlog faster. They autoscale on queue depth. The work is idempotent: the same output file is overwritten.' },
        { id: 'ew', label: 'Email workers', sub: 'idempotency key', x: 640, y: 295, w: 130, kind: 'server', info: 'What it is: the workers that email the followers. Each email carries an idempotency key, so a redelivery does not send a duplicate email.' },
        { id: 'dlq', label: 'DLQ + alarm', sub: 'poison messages', x: 480, y: 440, w: 130, kind: 'queue', info: 'What it is: the dead-letter queue. After maxReceiveCount, a bad message lands here and an alarm rings. An engineer fixes the bug and redrives it.' },
        { id: 'mail', label: 'Email provider', sub: 'third party', x: 640, y: 440, w: 130, kind: 'net', info: 'What it is: an outside email company. It can be slow or down. Thanks to the queue, its problems do not break uploads; the email just goes out later.' },
      ],
      edges: [
        { a: 'app', b: 's3', n: 1 },
        { a: 'app', b: 'api', n: 2, label: 'process' },
        { a: 'api', b: 'jobs', n: 3, label: 'QUEUED' },
        { a: 'api', b: 'topic', n: 4 },
        { a: 'topic', b: 'tq', kind: 'evt' },
        { a: 'topic', b: 'eq', kind: 'evt' },
        { a: 'tq', b: 'tw', n: 5 },
        { a: 'tw', b: 's3', via: [[640, 60]], label: 'read/write' },
        { a: 'tw', b: 'jobs', n: 6, label: 'DONE', via: [[555, 222], [395, 222]] },
        { a: 'eq', b: 'ew' },
        { a: 'ew', b: 'mail', label: 'send' },
        { a: 'eq', b: 'dlq', kind: 'bad' },
        { a: 'tq', b: 'dlq', kind: 'bad', via: [[555, 185], [555, 440]] },
      ],
      paths: [
        { name: 'Upload', text: 'The file goes to storage, then "process it". The API wrote a row, published the event, and replied 202 right away.', go: ['app>s3', 'app>api>jobs', 'api>topic', 'res:api>app'] },
        { name: 'Transcode', text: 'A copy of the event lands in the transcode queue. One worker took it, read the file, wrote new files, set DONE, then sent the ack.', go: ['topic>tq>tw>s3', 'tw>jobs'] },
        { name: 'Email + DLQ', text: 'A worker took a message from the email queue and sent it to the provider. A message that fails again and again goes to the DLQ, and an alarm rings.', go: ['topic>eq>ew>mail', 'bad:eq>dlq'] },
        { name: 'Status', text: 'The app asked "is it ready?". The API read the jobs table and said DONE. (Push and SSE are in the real-time lesson.)', go: ['app>api>jobs', 'res:jobs>api>app'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>A queue is a shared to-do list for work. The producer adds, a worker takes, the broker keeps it safe. The user gets 202 right away; the work happens later.</li>
      <li>A message is not deleted until the ack arrives. Until then it is in-flight (hidden).</li>
      <li>Visibility timeout shorter than the job = duplicate work. Much longer = a long wait after a crash. Best: a short timeout plus a heartbeat.</li>
      <li>At-most-once = can be lost. At-least-once = can happen twice. Exactly-once = at-least-once + idempotency (a dedup record or an idempotency key).</li>
      <li>Point-to-point = one message, one worker. Pub/sub = a copy for every subscriber. Real designs: pub/sub outside, a durable queue per subscriber inside.</li>
      <li>Retries use exponential backoff plus jitter. After maxReceiveCount: DLQ plus alarm, then fix and redrive.</li>
      <li>A queue absorbs spikes, not constant overload. For that you need backpressure (429/503) or more workers.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['The user gets an answer right away (202). A request never waits for slow work', 'Spikes are absorbed: workers are sized for average load', 'Decoupling: if the email provider fails, uploads still work', 'Retries and a DLQ make failures easy to handle', 'Workers scale on their own (from 2 to 200)'],
      costs: ['One more component to run and watch (the broker can fail too)', 'Results come later: the user needs status polling or a push', 'At-least-once means duplicates: every consumer must be idempotent', 'Weaker ordering: many workers and retries can mix up the order', 'Harder debugging: one request is now spread across many services and over time'] },

    { type: 'think', questions: [
      { q: 'xyz.com needs to send a "Password reset" email. Will you use a queue? If yes, what will you show the user, and how bad is a duplicate email?', a: 'Yes. If the email provider is slow or down, the login flow should not get stuck. Show the user right away: "If the account exists, we sent an email." A duplicate reset email is a small harm (two links; make the old one invalid). A lost email is worse. So at-least-once is the right choice.' },
      { q: 'The SQS visibility timeout is 30 seconds and transcoding takes 3 minutes. What happens?', a: 'After 30 seconds the message becomes visible again. A second worker starts the same video, then a third... One video is processed 6 times. Fix: set the visibility timeout above the maximum job time, or keep extending it during the work with ChangeMessageVisibility, like a heartbeat. And make the consumer idempotent.' },
      { q: 'The queue depth is 0, but users complain that emails are not arriving. What will you check?', a: 'The DLQ! Maybe every message fails and goes to the DLQ (a bug, an expired API key). The main queue looks empty because messages leave it. This is why an alarm on DLQ depth is a must.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'A worker processed a message but crashed before sending the ack. What happens in an at-least-once queue?', options: ['The message is lost forever', 'The message is delivered again; the work may happen twice', 'The broker finishes the work itself'], answer: 1, explain: 'No ack means the broker assumes the work did not happen, so it delivers the message again. This is why the consumer must be idempotent.' },
      { q: 'One message crashes the consumer every time. What is the right design?', options: ['Keep retrying forever', 'After a few attempts, send it to a dead-letter queue and raise an alarm', 'Delete the queue'], answer: 1, explain: 'After a limit (maxReceiveCount / delivery-limit), move the poison message to the DLQ. Other work keeps flowing, and an engineer can look at it.' },
      { q: 'How do you get "exactly-once" in practice?', options: ['With one broker setting, without changing the consumer', 'At-least-once delivery plus idempotent processing / dedup', 'With at-most-once delivery'], answer: 1, explain: 'You cannot stop duplicates on the network. Let duplicates arrive, but the consumer recognises them so the effect happens only once.' },
      { q: 'Producers are always 2 times faster than consumers. What will a queue do?', options: ['Problem solved: the queue absorbs everything', 'The queue keeps growing; you need backpressure or more consumers', 'Messages will be processed faster by themselves'], answer: 1, explain: 'A queue only absorbs short spikes. For constant overload, add capacity or slow down the producers (backpressure).' },
      { q: 'The "video uploaded" event is needed by the transcoder, email and analytics. Which pattern?', options: ['Point-to-point queue', 'Pub/sub (fanout), with a durable queue for each subscriber', 'Synchronous HTTP calls to all three'], answer: 1, explain: 'In pub/sub every subscriber gets a copy. With a durable queue per subscriber, a message is not lost even if one subscriber is down.' },
      { q: 'The SQS visibility timeout is 30 s, the job takes 3 minutes, and there is no heartbeat. What happens?', options: ['All fine, one delivery', 'Every 30 s another worker gets the message: one video is made about 6 times', 'The message goes to the DLQ'], answer: 1, explain: 'When the timer ends, SQS assumes the worker died. Deliveries happen at 0, 30, 60, 90, 120 and 150 s. Fix: a short timeout plus a heartbeat (ChangeMessageVisibility), or a timeout longer than the job.' },
      { q: 'A worker checks for a "sent:42" record, sends the email, then writes the record. At which crash point is a duplicate email still sent?', options: ['Just before the ack', 'After the email, before the record is written', 'Right after taking the message'], answer: 1, explain: 'The email went out but the record was not written. On redelivery the new worker finds no record and sends again. Send an idempotency key to the provider, or write the side effect and the record in one transaction.' },
    ]},
    { type: 'sources', note: 'Product-specific facts (defaults, limits) come from these official docs. They can change between versions.', items: [
      { title: 'Amazon SQS visibility timeout', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html', used: 'In-flight messages, default 30 s visibility timeout, 12 hour limit, ChangeMessageVisibility, at-least-once note.' },
      { title: 'Exactly-once processing in Amazon SQS (FIFO)', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-exactly-once-processing.html', used: '5-minute deduplication interval, deduplication ID, content-based deduplication.' },
      { title: 'Using dead-letter queues in Amazon SQS', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html', used: 'Redrive policy, maxReceiveCount, retention based on original enqueue time, FIFO ordering caveat, redrive.' },
      { title: 'Consumer Acknowledgements and Publisher Confirms', publisher: 'RabbitMQ documentation', official: true, url: 'https://www.rabbitmq.com/docs/confirms', used: 'Manual vs automatic ack, requeue of unacked deliveries on connection close, redelivered flag, prefetch, nack/reject.' },
      { title: 'Dead Letter Exchanges', publisher: 'RabbitMQ documentation', official: true, url: 'https://www.rabbitmq.com/docs/dlx', used: 'Events that dead-letter a message: reject without requeue, TTL, length limit, delivery limit.' },
      { title: 'Configurable Limits and Timeouts', publisher: 'RabbitMQ documentation', official: true, url: 'https://www.rabbitmq.com/docs/limits', used: 'consumer_timeout default 30 minutes; quorum queue delivery-limit default 20 since 4.0.' },
      { title: 'AMQP 0-9-1 Model Explained', publisher: 'RabbitMQ documentation', official: true, url: 'https://www.rabbitmq.com/tutorials/amqp-concepts', used: 'Exchange types (direct, fanout, topic, headers) and bindings.' },
      { title: 'Amazon SQS message quotas and standard queue quotas', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-messages.html', used: 'Max message size 1 MiB, retention default 4 days / max 14 days, visibility timeout 30 s / 12 h, long polling max 20 s, ~120,000 in-flight (standard), FIFO 300 calls/s without batching.' },
      { title: 'Exponential Backoff And Jitter (2015)', publisher: 'AWS Architecture Blog (Marc Brooker)', official: true, year: 2015, url: 'https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/', used: 'Exponential backoff, the full jitter idea, and how jitter breaks up crowds of retries. The post is from 2015, but the idea is still standard.' },
    ]},
  ],
});
