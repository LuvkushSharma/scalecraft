(function () {
  /* Decision widget: questions as chips -> recommendation card.
     cfg = { questions: [{ id, q, opts: [[value, label]], when?(ans) }], decide(ans) -> { pick, why, cost, alt } }
     The cfg is also attached to the block (block.cfg) so a node script can walk every path. */
  const decider = (el, cfg) => {
    const ans = {};
    el.innerHTML = '<div class="dz-qs"></div><div class="dz-out" aria-live="polite"></div>' +
      '<div style="margin-top:12px"><button type="button" class="btn small ghost dz-reset">Start over</button></div>';
    const qs = el.querySelector('.dz-qs'), out = el.querySelector('.dz-out');
    const draw = () => {
      const live = [];
      cfg.questions.forEach(q => { if (q.when && !q.when(ans)) delete ans[q.id]; else live.push(q); });
      qs.innerHTML = '';
      let done = true;
      for (let i = 0; i < live.length; i++) {
        const q = live[i], box = document.createElement('div');
        box.style.margin = '0 0 14px';
        box.innerHTML = `<div style="font-weight:600;color:var(--ink);margin-bottom:6px">${i + 1}. ${q.q}</div><div style="display:flex;flex-wrap:wrap;gap:6px"></div>`;
        q.opts.forEach(([v, t]) => {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'chip' + (ans[q.id] === v ? ' on' : '');
          b.style.borderRadius = '14px'; b.style.textAlign = 'left';
          b.setAttribute('aria-pressed', String(ans[q.id] === v));
          b.innerHTML = t;
          b.onclick = () => { ans[q.id] = v; draw(); };
          box.lastChild.appendChild(b);
        });
        qs.appendChild(box);
        if (ans[q.id] == null) { done = false; break; }
      }
      if (!done) { out.innerHTML = '<div class="calc-note">Pick an answer to the question above. When all questions are answered, the recommendation appears here.</div>'; return; }
      const r = cfg.decide(ans);
      out.innerHTML = `<div style="border:1px solid var(--line-2);border-left:4px solid var(--accent);border-radius:var(--r);background:var(--surface-2);padding:12px 14px">
        <div style="font-size:12px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.06em">Recommendation</div>
        <div style="font:700 20px/1.3 var(--f-display);color:var(--ink);margin:2px 0 8px">${r.pick}</div>
        <p style="margin:6px 0"><strong>Why:</strong> ${r.why}</p>
        <p style="margin:6px 0"><strong>What you give up:</strong> ${r.cost}</p>
        <p style="margin:6px 0"><strong>Runner-up:</strong> ${r.alt}</p></div>`;
    };
    el.querySelector('.dz-reset').onclick = () => { Object.keys(ans).forEach(k => delete ans[k]); draw(); };
    draw();
  };

  /* Practice cards: one case at a time; "signal" hint and "answer" reveal, prev/next. */
  const practice = (el, cases, T) => {
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
  };
  const CASES = [
    { q: 'Every new user should get a "getting started" email 1 hour after signing up.', signal: '"Do this job", once, by one worker, a little later (a delay).', pick: 'A queue with a delay (SQS delay / a scheduled job in Sidekiq/Celery)', why: 'It is a command, and only the email team needs it. A queue gives retries and a DLQ. SQS can delay a message by up to 15 minutes; for 1 hour, use a scheduled job (Sidekiq/Celery) or a timer table.', trap: 'Putting it in Kafka and calling sleep(1 hour) in the consumer: the whole partition gets stuck for an hour.' },
    { q: '"comment.posted" event: a notification to the creator, a spam filter, and the comment count. A bug was found in the spam filter, and the last 3 days of comments must be checked again.', signal: 'An event + several teams + replay.', pick: 'A Kafka topic, partition key = video_id', why: 'Each team has its own consumer group. After the bug fix, move the spam filter\'s offset back 3 days and read again; the other teams are not affected.', trap: 'If retention was set to 1 day, a 3-day replay is impossible. Set retention from how far back you may need to replay.' },
    { q: 'The "Riya is typing..." indicator during a live match.', signal: 'Right now, missing one is fine, nothing needs saving.', pick: 'Redis Pub/Sub', why: 'Fire-and-forget, under a millisecond. If one indicator is missed, a new one arrives the next second.', trap: 'Writing this to Kafka: every keypress is stored on disk until retention ends. Pure waste.' },
    { q: 'Creator payouts: on the 1st of every month, bank transfers to 50,000 creators. The bank API is sometimes slow or fails. No creator may be paid twice.', signal: 'A job (command), every one matters, a flaky third party, retries, and no doubles.', pick: 'A queue (SQS/RabbitMQ) + an idempotency key per payout + a DLQ', why: 'Each payout is one job. If the bank fails, retry; after 5 failures it goes to the DLQ and a human looks at it. Delivery is at-least-once, so send each payout\'s idempotency key (payout_id) to the bank, so a duplicate does not send money again.', trap: 'Relying on retries without idempotency: a timeout happens, a retry happens, and the bank sends the money both times.' },
    { q: 'A creator gets a copyright claim: they must reply within 7 days, or the video becomes private; if they reply, the legal team reviews it (a human), then decides.', signal: 'Many steps, timeouts lasting days, a human step.', pick: 'A workflow engine (Temporal / Step Functions)', why: 'The engine durably keeps "the 7-day timer", "waiting for the legal team" and the state of every claim. Which claim is at which step is visible in one place.', trap: 'A cron job that scans all claims every hour: slow, and one bug makes a claim go private/public twice.' },
    { q: 'An event for every video view, for analytics. 2 lakh events/sec, and sometimes the analytics team is down for hours.', signal: 'Very high throughput; the consumer reads at its own speed and catches up later.', pick: 'Kafka (or Kinesis)', why: 'The log keeps events until retention ends; when analytics comes back, it reads from its own offset. Partitions split the throughput.', trap: 'Redis Pub/Sub: analytics down = every view during that time is gone.' },
  ];
  const R = (pick, why, cost, alt) => ({ pick, why, cost, alt });
  const CFG = {
    questions: [
      { id: 'kind', q: 'What type of message is it?', opts: [
        ['task', '"Do this job" (send an email, make a thumbnail, transcode a video)'],
        ['fact', '"This happened" (a video was published, a payment went through)'],
        ['process', 'A business process with many steps (timeouts, retries, a human step)'],
      ]},
      { id: 'stack', q: 'What is your setup like?', when: a => a.kind === 'task', opts: [
        ['cloud', 'We are on AWS, a managed service is fine'],
        ['self', 'Our own servers, and we need routing rules (priority, different job types)'],
        ['redis', 'A small app, Redis is already there (Python/Ruby)'],
      ]},
      { id: 'readers', q: 'How many different teams/services need this event?', when: a => a.kind === 'fact', opts: [
        ['one', 'Only one'],
        ['many', 'Several (notifications, search, analytics...)'],
      ]},
      { id: 'keep', q: 'How important is each message?', when: a => a.kind === 'fact', opts: [
        ['replay', 'Every event matters, and we also need to read old events again (replay)'],
        ['once', 'Every event matters; processing it once is enough'],
        ['live', 'Deliver it right now; if someone was offline, missing it is fine'],
      ]},
      { id: 'steps', q: 'How big is the process?', when: a => a.kind === 'process', opts: [
        ['simple', '2 steps, no long waits'],
        ['long', 'Many steps, timeouts of hours/days, compensation (refunds)'],
      ]},
    ],
    decide(a) {
      const KAFKA_COST = 'Kafka is hard to run (brokers, partitions, rebalancing). Per-message retry and DLQ are not built in; you build them yourself. Delivery is at-least-once, so make consumers idempotent.';
      if (a.kind === 'task') {
        if (a.stack === 'cloud') return R('Queue: Amazon SQS', 'Each job is taken by one worker, once. If the worker crashes, the job shows up again after the visibility timeout (a retry), and if it keeps failing it goes to the DLQ. AWS takes care of running the servers.', 'The job is gone once acked: no replay. Other teams do not see the same jobs. A standard queue does not promise order and can deliver a duplicate (make the worker idempotent).', 'RabbitMQ (if you need routing rules), or Kafka if many teams will want these events later.');
        if (a.stack === 'self') return R('Queue: RabbitMQ', 'Routing through exchanges (separate queues per job type), per-message ack, priorities, and a DLQ through a dead-letter exchange. Each job goes to one worker, once.', 'You run and monitor the cluster yourself. After the ack the message is gone; no replay.', 'SQS if you are on the cloud; Celery/Sidekiq if the app is small and Redis is already there.');
        return R('Queue: Celery / Sidekiq on Redis', 'Plugs straight into the app\'s framework, Redis is already there, and retries and scheduled jobs are built in. The fewest new parts for a small team.', 'Redis keeps data in memory: if the persistence settings are weak, jobs can be lost in a crash. At very large scale a dedicated queue is more reliable.', 'SQS / RabbitMQ when jobs are critical (payouts) or the volume grows a lot.');
      }
      if (a.kind === 'process') return a.steps === 'long'
        ? R('Workflow engine: Temporal / AWS Step Functions', 'The engine durably keeps the state of every process: which step is done, which one is retrying, and timeouts like "if the creator does not accept within 48 hours, refund". If a server restarts, the process continues from the same point.', 'A new platform to learn and run. In Temporal, workflow code must be deterministic. Overkill for every small thing.', 'A saga with queues/Kafka + a state table (choreography), when there are few steps and the team is small.')
        : R('Queue + status column (a small state machine)', 'Two steps do not need an engine: when step 1 finishes, write status "PAID" in the DB and put the next job in the queue. Retry and DLQ come from the queue.', 'When steps grow, timeouts arrive and compensation appears, this code quickly gets tangled and bugs hide.', 'A workflow engine (Temporal / Step Functions) when the process gets long.');
      if (a.keep === 'live') return a.readers === 'many'
        ? R('Pub/sub: Redis Pub/Sub (or SNS / Google Pub/Sub)', 'One message goes right away to all subscribers, like a chat message reaching the gateway servers where the recipients are connected. Missing one is fine, because the message is saved in the DB and the client syncs when it reconnects.', 'Redis Pub/Sub does not store messages: if a subscriber was offline in that second, the message is gone. No retry.', 'Kafka, if every subscriber must eventually get every message.')
        : R('Pub/sub: Redis Pub/Sub', 'One live listener, fire-and-forget, under a millisecond. Like the "typing..." indicator: missing one does no harm.', 'Zero persistence and zero retry. Listener down = message gone.', 'A queue (if a message must not be missed), or Redis Streams.');
      if (a.keep === 'replay') return R('Log: Kafka (or Kinesis / Pulsar)', (a.readers === 'many' ? 'Each team has its own consumer group, its own offset, its own speed. One copy of each event, any number of readers. ' : 'There is one reader now, but you need replay: reprocessing the last 3 days of events after a bug fix, or filling a new system from the start. ') + 'Events stay until retention ends, and the events of one key (like video_id) stay in order in one partition.', KAFKA_COST, a.readers === 'many' ? 'SNS → one SQS queue per team (fan-out), if you will never need replay.' : 'A simple queue, if you will truly never need replay.');
      return a.readers === 'many'
        ? R('Log: Kafka (or Kinesis / Pulsar)', '"This happened, and several teams care" = the classic case for Kafka. Each team\'s consumer group reads its own copy of the whole stream; if a new team joins tomorrow, nobody has to change anything.', KAFKA_COST, 'SNS → each team\'s own SQS queue (fan-out): simple on AWS, with per-team retries and DLQ built in, but no replay.')
        : R('Queue: SQS / RabbitMQ', 'There is only one consumer and no replay is needed, so a queue is the simplest: per-message retry, DLQ, and the message is cleaned up after the ack.', 'If another team needs the same events tomorrow, the queue will not give them; then you move to fan-out (SNS → queues) or Kafka.', 'Kafka, if you expect more teams to join soon or replay to be needed.');
    },
  };

  Lesson.register({
    id: 'decide-messaging',
    title: 'Queue, Kafka or pub/sub?',
    minutes: 26,
    summary: `Four ways to send messages between services: a queue, a log (Kafka), pub/sub and a workflow engine. Learn to recognise the "type" of a message, and see what breaks with the wrong tool.`,
    blocks: [
      { type: 'callout', tone: 'analogy', title: 'In simple words', html: `An app has many services inside it, and they need to send news to each other.<br>Sometimes the news is a <strong>job</strong> ("send this email"). Sometimes it is a <strong>piece of news</strong> ("a video was published") that several teams need. Sometimes someone just needs to know <strong>right now</strong> ("Riya is typing").<br>Each type has its own tool: a queue, Kafka, pub/sub, or a workflow engine. Pick the wrong tool, and messages get lost silently or the line gets stuck.<br>In this lesson we learn to recognise the type of a message and pick the right tool.` },
      { type: 'h2', text: 'The problem: one hammer for everything' },
      { type: 'p', html: `xyz.com now has dozens of services. When a video is uploaded, a thumbnail must be made, followers notified, the search index updated, analytics counted, and the creator emailed. You have learned both <a href="#/queues">queues</a> and <a href="#/kafka">Kafka</a>. Now the question is not "how do they work", the question is: <strong>which one for this message?</strong>` },
      { type: 'p', html: `A beginner either puts Kafka everywhere ("big companies use it") or one queue everywhere. Both break in the wrong places, and often <em>silently</em>: no error, one team just stops getting data. So first, recognise the type of the message.` },
      { type: 'callout', tone: 'term', title: 'New words: Command (task) and Event', html: `<strong>What it is:</strong> a <strong>command</strong> = "do this job" (send an email, make a thumbnail). It must happen once, by one worker. An <strong>event</strong> = "this happened" (a video was published). A fact that any number of listeners can hear, and the sender does not even know who is listening.<br><strong>Why we need it:</strong> once you know the message type, you have half chosen the tool. Command → queue. Event heard by several teams → Kafka.<br><strong>Without it:</strong> people put an event in a queue, and with three teams reading, each message reaches only one team (you will see this in the flow below).` },
      { type: 'callout', tone: 'term', title: 'New word: Fan-out', html: `<strong>What it is:</strong> delivering a copy of one message to many places, one copy per subscriber.<br><strong>Why we need it:</strong> "a video was published" is needed by notifications, search and analytics, all three.<br><strong>Without it:</strong> the producer must send a separate message to every team, and when a new team arrives, the producer\'s code must change.` },
      { type: 'callout', tone: 'term', title: 'New word: Workflow engine', html: `<strong>What it is:</strong> a system that remembers the state of a <strong>long business process with many steps</strong>: which step is done, which one is retrying, how long it has been waiting. Examples: <strong>Temporal</strong>, <strong>AWS Step Functions</strong>.<br><strong>Why we need it:</strong> to make timeouts like "refund if not accepted within 48 hours" and undo steps like "give the money back" (compensation) reliable.<br><strong>Without it:</strong> a tangle of queues + cron jobs + status columns. If a server restarts, the process gets stuck halfway, and nobody knows which job is at which step. Details: <a href="#/distributed-tx">the sagas lesson</a>.` },
      { type: 'h3', text: 'Words from earlier lessons, one line each' },
      { type: 'table', head: ['Word', 'In one line', 'Details'], rows: [
        ['Queue', 'Messages waiting in line; each message is taken by one worker, and deleted when the work is done.', '<a href="#/queues">Queues</a>'],
        ['Ack', 'The worker saying "this message is done". Only after the ack is the message removed.', '<a href="#/queues">Queues</a>'],
        ['Log / topic', 'Kafka\'s append-only list. A message stays even after it is read (until retention ends).', '<a href="#/kafka">Kafka</a>'],
        ['Offset', 'The number that says "I have read up to here" in the log. Each consumer group has its own.', '<a href="#/kafka">Kafka</a>'],
        ['Consumer group', 'The group of workers of one team. Each group gets its own copy of the whole stream.', '<a href="#/kafka">Kafka</a>'],
        ['Partition', 'One part of a topic. Inside one partition, order is guaranteed.', '<a href="#/kafka">Kafka</a>'],
        ['At-least-once', 'A message arrives at least once, sometimes twice. So the consumer must be idempotent: running twice gives the same result.', '<a href="#/queues">Queues</a>'],
      ]},
      { type: 'callout', tone: 'tip', title: 'Rule of thumb (Decide)', html: `<strong>"Do this job"</strong> → queue. <strong>"This happened, and several teams care"</strong> → Kafka. <strong>"Tell everyone right now, missing it is fine"</strong> → pub/sub. <strong>"Many steps, timeouts, a human step"</strong> → workflow engine.` },

      { type: 'h2', text: 'Decision helper' },
      { type: 'p', html: `Think of a message (like "a video was published", "send a welcome email", "the user is typing") and answer. Try every path: the result shows the pick, the reason, what you give up, and the runner-up.` },
      { type: 'custom', cfg: CFG, render(el) { decider(el, CFG); } },

      { type: 'h2', text: 'The whole table' },
      { type: 'table', head: ['Need', 'Pick', 'Example'], caption: 'Roadmap phase 5: "Queue, Kafka or pub/sub?"', rows: [
        ['Share jobs among workers; each job done once, then deleted; per-message retries and DLQ', 'Queue: SQS, RabbitMQ, Celery / Sidekiq on Redis', 'Sending emails, resizing images, transcoding videos'],
        ['A high-throughput event stream, many independent consumers, replay, ordering per key', 'Log: Kafka, Kinesis, Pulsar', 'Order/video events → billing, analytics, notifications, search indexing'],
        ['One message to many subscribers right now, loss is acceptable', 'Pub/sub: Redis Pub/Sub, SNS, Google Pub/Sub', 'A chat message to the gateway servers where the recipients are connected'],
        ['A complex multi-step business process, retries, timeouts, human steps', 'Workflow engine: Temporal, Step Functions', 'Sponsorship: payment → creator accepts → video published → payout'],
      ]},
      { type: 'callout', tone: 'term', title: 'New word: DLQ (dead-letter queue)', html: `<strong>What it is:</strong> a separate queue where messages go after they fail again and again (say, 3 times).<br><strong>Why we need it:</strong> so one bad message does not block the line, and a person can look at it and fix it later.<br><strong>Without it:</strong> the bad message is either retried forever (wasting CPU and money), or silently thrown away.` },
      { type: 'callout', tone: 'term', title: 'New words: Replay, Ordering per key', html: `<strong>Replay, what it is:</strong> reading old events again (in Kafka, by moving the offset back). <strong>Why:</strong> to reprocess the last 2 days of events after a bug fix, or to fill a new system from the start. <strong>Without it:</strong> in a queue the message disappears once it is acked, and there is no way to run it again.<br><strong>Ordering per key, what it is:</strong> the events of one key (like video_id) arrive in the same order they were created; there is no promise across different keys. <strong>Why:</strong> "video uploaded" must be processed before "video deleted". <strong>Without it:</strong> if the delete runs first, the video shows up again.` },
      { type: 'h2', text: 'Each option, one by one: signal, scenario, reason, trap' },
      { type: 'h3', text: 'Queue: SQS, RabbitMQ, Celery / Sidekiq on Redis' },
      { type: 'p', html: `<strong>Signal:</strong> "do this job", once, by one worker. If it fails, retry, then DLQ.<br><strong>xyz.com:</strong> after every upload, "make the 360p, 720p and 1080p versions of this video" (transcode). If 1,000 videos arrive and there are 20 workers, the queue shares out the work; if the backlog grows, add workers.<br><strong>Which one:</strong> on AWS, <strong>SQS</strong> (managed; if a worker crashes, the message shows up again after the <em>visibility timeout</em>, which is an automatic retry). If you run your own servers and need routing rules (priority, separate queues per job type), <strong>RabbitMQ</strong>. A small Python/Ruby app that already has Redis: <strong>Celery / Sidekiq</strong>.<br><strong>Trap:</strong> tomorrow another team also needs "video transcoded". In a queue the message is gone after the ack, so that team will never get it. Then also send an event to Kafka after the queue job.` },
      { type: 'h3', text: 'Log: Kafka, Kinesis, Pulsar' },
      { type: 'p', html: `<strong>Signal:</strong> "this happened", and several teams care. A huge number of events, replay is needed, and the events of one key must stay in order.<br><strong>xyz.com:</strong> "video.published": notifications, search, analytics and recommendations all read it at their own speed. Tomorrow a "copyright check" team joins, and the upload service code does not even change.<br><strong>Which one:</strong> <strong>Kafka</strong> is the most common (default retention 7 days, can be raised). For a managed option on AWS, <strong>Kinesis</strong> (default 24 hours, can be raised up to 365 days). <strong>Pulsar</strong> keeps storage and brokers separate, and can also be used like a queue.<br><strong>Trap:</strong> using it for every job because "big companies use Kafka". Per-message retry and DLQ are not built into Kafka, and one stuck message blocks its partition (see the "emails" trap below).` },
      { type: 'h3', text: 'Pub/sub: Redis Pub/Sub, SNS, Google Pub/Sub' },
      { type: 'p', html: `<strong>Signal:</strong> one message to many subscribers <em>right now</em>, and it is fine if someone misses it (because the real data is saved somewhere else).<br><strong>xyz.com:</strong> getting Riya\'s chat message to the gateway servers that hold Aman\'s phone connection. Or "Riya is typing".<br><strong>Which one:</strong> <strong>Redis Pub/Sub</strong> is the fastest and simplest, but it does not store messages: if a subscriber was not connected in that second, the message is gone (at-most-once). <strong>SNS</strong> and <strong>Google Pub/Sub</strong> are managed and retry delivery; SNS → one SQS queue per team is a common fan-out method.<br><strong>Trap:</strong> sending "must not be missed" events like billing over Redis Pub/Sub. 2 seconds of gateway restart = money records lost.` },
      { type: 'h3', text: 'Workflow engine: Temporal, Step Functions' },
      { type: 'p', html: `<strong>Signal:</strong> many steps, long waits in between (hours, days), timeouts, a human step, and undo steps when something fails (refunds).<br><strong>xyz.com:</strong> brand sponsorship: the brand pays → the creator accepts within 48 hours → the video is published → payout after 7 days. If not accepted, refund.<br><strong>Which one:</strong> <strong>Temporal</strong>: you write the process like normal code, and the engine durably keeps the state of each step. <strong>AWS Step Functions</strong>: you define the steps as a state machine; Standard workflows can run for up to a year.<br><strong>Trap:</strong> an engine even for 2 steps. Two steps = a queue + one status column is enough. Use an engine when timeouts, compensation and many steps arrive.` },
      { type: 'callout', tone: 'mistake', title: 'Common beginner mistake', html: `"Pub/sub" is used for two different things. <strong>Redis Pub/Sub</strong> is fire-and-forget: if the subscriber was not connected at that moment, the message is gone. <strong>Google Pub/Sub / SNS</strong> are managed services that retry delivery. And <strong>Kafka</strong> also offers the "publish-subscribe" pattern, but its real difference is the <em>log</em>: messages stay even after they are read. In an interview, when you say "pub/sub", also say: <em>is loss acceptable or not, and is replay needed or not</em>.` },
      { type: 'h2', text: 'Worked scenarios' },
      { type: 'h3', text: '1. Transcoding a video' },
      { type: 'p', html: `<strong>Type:</strong> command ("make the 360p, 720p and 1080p versions of this video"). Each video must be transcoded only once, by one worker; if it fails, retry; if it keeps failing, it goes to the DLQ for a person to check. <strong>Decision: queue</strong> (SQS/RabbitMQ). Add workers based on the backlog.` },
      { type: 'h3', text: '2. The "Video published" event' },
      { type: 'p', html: `<strong>Type:</strong> event. The notifications team tells followers, the search team indexes it, analytics counts it, the recommendations team learns about the new video. Tomorrow a "copyright check" team joins too. <strong>Decision: Kafka</strong>. Each team has its own consumer group; the upload service does not even know the names of the teams. Was there a bug in the search indexer? Fix it, move the offset back, and <em>replay</em> the last 2 days.` },
      { type: 'h3', text: '3. A chat message, to the right gateway' },
      { type: 'p', html: `Riya sent Aman a message. Aman\'s phone is connected over WebSocket to <a href="#/realtime">gateway server</a> #7. The message is first saved in the DB, then published on <strong>Redis Pub/Sub</strong> on the "user:aman" channel; gateway #7 is subscribed and pushes it right away. What if gateway #7 was restarting in that second and the message was missed? No problem: as soon as Aman reconnects, his app asks "give me the messages after my last message id". <strong>Loss is acceptable, because the DB is the source of truth.</strong>` },
      { type: 'h3', text: '4. Trap: Kafka for emails, "because of scale"' },
      { type: 'p', html: `The team started sending welcome emails through Kafka. One day a user\'s email address was broken and the email provider kept returning an error. A Kafka consumer reads a partition <em>in order</em>, so it stays stuck on that message: retry, retry, retry, and <strong>thousands of emails behind it in that partition stopped</strong> (head-of-line blocking). In Kafka you build per-message retry and DLQ yourself. <strong>The right decision: a queue</strong>. The one bad message would do its retries and move to the DLQ, and the other emails would keep flowing.` },
      { type: 'callout', tone: 'term', title: 'New word: Head-of-line blocking', html: `<strong>What it is:</strong> when the first item in a line gets stuck and everything behind it stops, even though nothing is wrong with them. Like one broken-down car on a single-lane road.<br><strong>Why it happens here:</strong> a Kafka partition is read in order. One "poison message" (a message that fails every time) blocks the whole partition.<br><strong>The defence:</strong> a queue for jobs (each message gets its own retries + DLQ), or your own retry topic and DLQ topic in Kafka.` },
      { type: 'h3', text: '5. Trap: brand sponsorship, "just a queue and a few cron jobs"' },
      { type: 'p', html: `The brand pays → the creator must accept within 48 hours → the video is published → payout after 7 days. If not accepted, refund. First idea: queues + cron jobs + status columns. Three months later: nobody knows which sponsorship is stuck at which step, and a refund ran twice. <strong>The right decision: a workflow engine</strong> (Temporal/Step Functions): the engine handles each sponsorship\'s state, timeouts and compensation (refund).` },
      { type: 'h2', text: 'Practice: 6 short cases' },
      { type: 'p', html: `Read each case and think first: is it a command, an event, live news, or a long process? Then press "Show signal", then "Show answer".` },
      { type: 'custom', render(el) { practice(el, CASES, { case: 'Case', hint: 'Show signal', ans: 'Show answer', prev: '← Previous', next: 'Next →', signal: 'Signal', trap: 'Trap' }); } },
      { type: 'h2', text: 'The wrong tool, the hidden damage: run it and see' },
      { type: 'p', html: `Three teams need "video published" events. First watch it with Kafka, then the same job with a plain queue, then the Kafka-for-emails trap.` },
      { type: 'flow', height: 340,
        nodes: [
          { id: 'up', label: 'Upload service', sub: 'producer', x: 100, y: 170, w: 150, kind: 'server', info: 'What it is: the service that handles video upload and publishing (the producer, meaning the sender of messages). When a video is published, it sends one message. It does not know who is listening, and it should not.' },
          { id: 'bus', label: 'Kafka topic', sub: 'video.published', x: 330, y: 170, w: 160, kind: 'queue', info: 'What it is: the messaging system in the middle. In the Kafka scenario: a log where events stay until retention ends; each consumer group has its own offset. In the queue scenario: a queue where a message goes to one consumer and is deleted after the ack.' },
          { id: 'n', label: 'Notifications', x: 590, y: 60, w: 170, kind: 'server', info: 'What it is: the notifications service. It sends followers a "new video" notification. In the trap scenario it becomes the email sender.' },
          { id: 's', label: 'Search indexer', x: 590, y: 170, w: 170, kind: 'server', info: 'What it is: the search team\'s service. It adds the new video to the search index. A missed event = the video never shows up in search.' },
          { id: 'an', label: 'Analytics', x: 590, y: 280, w: 170, kind: 'data', info: 'What it is: the analytics team\'s system. Counts for the creator dashboard. This team is sometimes down for hours (deploys, migrations) and catches up later.' },
        ],
        edges: [{ a: 'up', b: 'bus' }, { a: 'bus', b: 'n' }, { a: 'bus', b: 's' }, { a: 'bus', b: 'an' }],
        scenarios: [
          { name: 'Kafka (correct)', steps: [
            { title: 'Publish the event', text: 'Video v1 was published. One event is appended to the log.', set: { bus: { label: 'Kafka topic', sub: 'video.published', state: '' }, n: { label: 'Notifications', sub: '', state: '' }, s: { sub: '', state: '' }, an: { sub: '', state: '' } }, go: 'evt:up>bus', msg: 'video.published { id: "v1" }  → offset 0' },
            { title: 'All three get their own copy', text: 'Each team has its own consumer group, so <strong>all three</strong> read v1. The event is not deleted.', parallel: true, go: ['evt:bus>n', 'evt:bus>s', 'evt:bus>an'], after: { n: { state: 'ok', sub: 'v1' }, s: { state: 'ok', sub: 'v1' }, an: { state: 'ok', sub: 'v1' } } },
            { title: 'Analytics is down', text: 'Analytics is down for 2 hours. v2 arrives; the other two teams read it. Analytics\' offset stays where it was.', set: { an: { state: 'down', sub: 'stuck at offset 1' } }, go: ['evt:up>bus', 'evt:bus>n', 'evt:bus>s'], msg: 'video.published { id: "v2" }  → offset 1' },
            { title: 'Back up, catching up', text: 'When analytics comes back, it reads from its own offset and gets v2 too. Nothing was missed. This is the benefit of <strong>replay / independent pace</strong>.', set: { an: { state: '' } }, go: 'evt:bus>an', after: { an: { state: 'ok', sub: 'v1, v2' } }, msg: 'analytics-group: resume from offset 1' },
          ]},
          { name: 'Plain queue (wrong)', intro: 'Now the same three teams read from one single queue. In a queue, a message goes to only one consumer (competing consumers).', steps: [
            { title: 'One queue, three readers', text: 'The teams thought: "we will get the events from the queue".', set: { bus: { label: 'Queue', sub: 'video-events', state: '' }, n: { label: 'Notifications', sub: '', state: '' }, s: { sub: '', state: '' }, an: { sub: '', state: '' } }, focus: ['bus'] },
            { title: 'v1 only to Notifications', text: 'The queue gave v1 to one consumer. It acked, and the message was <strong>deleted</strong>.', go: ['evt:up>bus', 'evt:bus>n'], after: { n: { sub: 'v1' }, bus: { sub: 'v1 deleted' } }, msg: 'receive → v1 → ack → delete' },
            { title: 'v2 only to Search', text: 'Someone else took the next message.', go: ['evt:up>bus', 'evt:bus>s'], after: { s: { sub: 'v2' }, bus: { sub: 'v2 deleted' } } },
            { title: 'The hidden damage', text: 'v1 will never be in search, v2\'s followers got no notification, and analytics got nothing. <strong>No error anywhere.</strong> Fix: Kafka, or one queue per team (fan-out through SNS / a fanout exchange).', after: { n: { state: 'warn', sub: 'missed v2!' }, s: { state: 'warn', sub: 'missed v1!' }, an: { state: 'warn', sub: '0 events' } } },
          ]},
          { name: 'Trap: emails via Kafka', intro: 'Now the topic is "emails" and the consumer is an email sender. One address is broken.', steps: [
            { title: 'Poison message', text: 'At the front of partition 3 is an email with a broken address. The provider returns an error every time.', set: { bus: { label: 'Kafka topic', sub: 'emails, p3', state: '' }, n: { label: 'Email sender', sub: '', state: '' }, s: { state: 'dim', sub: '' }, an: { state: 'dim', sub: '' } }, go: ['evt:up>bus', 'evt:bus>n', 'bad:n>bus'], msg: 'send(riya@gmial.con) → 550 error' },
            { title: 'Retry, retry, retry', text: 'The consumer reads in order, so the next message comes only when this one is done. It stays stuck.', go: ['evt:bus>n', 'bad:n>bus'], after: { n: { state: 'warn', sub: 'retry #40...' } } },
            { title: 'The line grows', text: '5,000 welcome emails in this partition are stuck: <strong>head-of-line blocking</strong>. In a queue, this message would go to the DLQ after its retries and the rest would keep flowing.', flood: { paths: ['up>bus'], n: 10, kind: 'evt' }, after: { bus: { state: 'hot', sub: 'p3: 5,000 stuck' } } },
          ]},
        ],
      },
      { type: 'h2', text: 'How to say it in an interview' },
      { type: 'list', items: [
        '"Transcoding is a <strong>command</strong> that must happen once, so an SQS queue + autoscaling workers, and a DLQ after 3 retries."',
        '"Video published is an <strong>event</strong> that 4 teams read, so a Kafka topic with partition key video_id, so the events of one video stay in order."',
        '"Redis Pub/Sub for chat delivery; loss is acceptable because the message is saved in the DB first and the client syncs when it reconnects."',
        '"Sponsorship is a long process with timeouts and refunds, so a Temporal workflow."',
      ]},
      { type: 'diagram', title: 'Messages at xyz.com: the whole picture', height: 616,
        groups: [
          { label: 'Users', x: 20, y: 14, w: 680, h: 74 },
          { label: 'Services', x: 4, y: 108, w: 712, h: 96 },
          { label: 'Messaging', x: 4, y: 236, w: 712, h: 100 },
          { label: 'Consumers', x: 4, y: 370, w: 712, h: 100 },
          { label: 'Jobs', x: 4, y: 502, w: 712, h: 96 },
        ],
        nodes: [
          { id: 'users', label: 'Users', sub: 'app + browser', x: 360, y: 50, w: 170, kind: 'client', info: 'What it is: xyz.com\'s users. They upload videos, chat, and take brand sponsorships. The message for each job goes through a different tool.' },
          { id: 'upload', label: 'Upload service', sub: 'producer', x: 110, y: 165, w: 150, kind: 'server', info: 'What it is: the service that handles video upload and publishing. On publish, it writes one "video.published" event to Kafka. It does not know who is listening.' },
          { id: 'chat', label: 'Chat service', sub: 'saves to DB', x: 360, y: 165, w: 150, kind: 'server', info: 'What it is: the chat backend. It first saves the message in the DB (the source of truth), then publishes it on Redis Pub/Sub, so the right gateway can push it right away.' },
          { id: 'gw', label: 'WS gateways', sub: 'live connections', x: 600, y: 165, w: 150, kind: 'edge', info: 'What it is: the servers that users\' phones stay connected to over WebSocket. They subscribe to Redis channels and push each message to the user right away.' },
          { id: 'kafka', label: 'Kafka topic', sub: 'video.published', x: 110, y: 295, w: 160, kind: 'queue', info: 'What it is: a log (event stream). An event stays until retention ends; each team\'s consumer group reads its own copy at its own speed. Replay is possible.' },
          { id: 'redis', label: 'Redis Pub/Sub', sub: 'user:<id>', x: 420, y: 295, w: 150, kind: 'queue', info: 'What it is: live fan-out. The message goes right away to the gateways subscribed at that moment; anyone offline misses it. That is fine, because the message is saved in the DB and the client syncs when it reconnects.' },
          { id: 'temporal', label: 'Temporal', sub: 'sponsorship flow', x: 620, y: 295, w: 130, kind: 'queue', info: 'What it is: a workflow engine. It keeps each sponsorship\'s state: pay → a 48-hour timer to accept → publish → payout, or refund. After a restart it continues from the same point.' },
          { id: 'search', label: 'Search indexer', x: 165, y: 430, w: 140, kind: 'server', info: 'What it is: the search team\'s consumer group. It adds new videos to the index. If there is a bug, move the offset back and replay.' },
          { id: 'notif', label: 'Notifications', x: 330, y: 430, w: 140, kind: 'server', info: 'What it is: the notifications team\'s consumer group. It tells followers, and turns every email into a job in the email queue.' },
          { id: 'an', label: 'Analytics', sub: 'catch-up later', x: 500, y: 430, w: 140, kind: 'data', info: 'What it is: the analytics team\'s consumer group. Even if it is down for hours, it comes back and reads from its own offset.' },
          { id: 'emailq', label: 'Email queue', sub: 'SQS', x: 280, y: 560, w: 140, kind: 'queue', info: 'What it is: a queue. Each email is one job; one worker takes it once, and on failure it is retried (visibility timeout).' },
          { id: 'worker', label: 'Email workers', x: 450, y: 560, w: 150, kind: 'server', info: 'What it is: workers that take jobs from the queue and send them to the email provider. If the backlog grows, add workers.' },
          { id: 'dlq', label: 'DLQ', sub: 'needs a human', x: 640, y: 560, w: 130, kind: 'threat', info: 'What it is: the dead-letter queue. An email that failed 3 times (like a wrong address) lands here; the rest of the line keeps moving, and a person checks it later.' },
        ],
        edges: [
          { a: 'users', b: 'upload', n: 1 },
          { a: 'users', b: 'chat' },
          { a: 'gw', b: 'users', both: true, label: 'WebSocket' },
          { a: 'upload', b: 'kafka', n: 2, kind: 'evt' },
          { a: 'chat', b: 'redis', kind: 'evt', label: 'publish' },
          { a: 'redis', b: 'gw', kind: 'evt' },
          { a: 'users', b: 'temporal', via: [[708, 50], [708, 295]] },
          { a: 'kafka', b: 'search', kind: 'evt' },
          { a: 'kafka', b: 'notif', kind: 'evt' },
          { a: 'kafka', b: 'an', kind: 'evt' },
          { a: 'notif', b: 'emailq', label: 'job' },
          { a: 'emailq', b: 'worker' },
          { a: 'worker', b: 'dlq', kind: 'bad', label: 'fails' },
        ],
        paths: [
          { name: 'Video published (event)', text: 'One event in Kafka; search, notifications and analytics each read their own copy.', go: ['users>upload>kafka', 'kafka>search', 'kafka>notif', 'kafka>an'] },
          { name: 'Email (command)', text: 'Notifications puts a job for every email in the queue; a worker sends it; if it keeps failing, it goes to the DLQ.', go: ['notif>emailq>worker>dlq'] },
          { name: 'Chat (pub/sub)', text: 'The message is saved in the DB, then goes through Redis Pub/Sub to the right gateway, and from there over WebSocket to the user.', go: ['users>chat>redis>gw', 'res:gw>users'] },
          { name: 'Sponsorship (workflow)', text: 'A long process with timers and refunds: Temporal keeps the state of every sponsorship.', go: ['users>temporal'] },
        ],
      },
      { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
        <li>First the message type: a <strong>command</strong> ("do this") or an <strong>event</strong> ("this happened").</li>
        <li>Command → <strong>queue</strong> (SQS, RabbitMQ, Celery/Sidekiq): one worker, retries, DLQ, deleted after the ack.</li>
        <li>Event + several teams + replay → <strong>Kafka</strong> (or Kinesis/Pulsar): one consumer group per team, ordering per key.</li>
        <li>Right now, missing it is fine → <strong>pub/sub</strong>. Redis Pub/Sub stores nothing; SNS/Google Pub/Sub retry.</li>
        <li>Many steps, timeouts, humans, refunds → <strong>workflow engine</strong> (Temporal, Step Functions).</li>
        <li>If three teams read from one queue, each message reaches only one of them: you need fan-out or Kafka.</li>
        <li>In Kafka, one poison message blocks its partition: use a queue for jobs, or a retry/DLQ topic.</li>
        <li>Every async path is at-least-once: make consumers idempotent.</li>
      </ul>` },
      { type: 'tradeoffs', gains: [
        'Queue: per-message retry, DLQ, simple scaling; one bad job does not stop the others',
        'Kafka: one event, any number of teams; replay; per-key ordering; the producer does not know the consumers',
        'Pub/sub: the lowest latency, the simplest fan-out',
        'Workflow engine: a long process\'s state, timeouts and compensation in one place, and visible',
      ], costs: [
        'Queue: the message is gone after the ack; a new team = a new fan-out setup',
        'Kafka: hard to operate; per-message retry/DLQ is up to you; head-of-line blocking',
        'Pub/sub (Redis): no persistence; an offline subscriber loses the message',
        'Workflow engine: a new platform, a learning curve; overkill for small things',
        'Every async path: at-least-once, so consumers must be made idempotent',
      ]},
      { type: 'think', questions: [
        { q: 'The payment service sends "payment.succeeded". Billing, the email receipt and the fraud team need it. Billing must never miss an event. Will Redis Pub/Sub do?', a: 'No. With Redis Pub/Sub, if a subscriber is restarting, the message is gone, and for billing that is lost money. Several teams + no loss = Kafka (or SNS → one queue per team). And to make the event atomic with the DB write, use a transactional outbox (first write the event into an outbox table in the same DB transaction, then a relay sends it to Kafka; details in the <a href="#/kafka">Kafka lesson</a>).' },
        { q: 'A junior says: "We will use Kafka everywhere, so we only have to learn one tool." Give one benefit and two drawbacks.', a: 'Benefit: only one platform to run and monitor. Drawback 1: for jobs (commands) you must build per-message retry and DLQ yourself, and one poison message will block a partition. Drawback 2: live, missing-is-fine things (the typing indicator) also get written to disk; wasted latency and cost. The right answer is usually: Kafka for events, a queue for jobs, pub/sub for live news.' },
        { q: 'Your Kafka consumer sometimes takes 10 minutes to process one message (a big PDF). What problem will this cause, and what will you do?', a: 'The messages behind it in that partition will stop (head-of-line), and if the consumer does not poll for too long, the group may treat it as gone and rebalance. Better: when the Kafka event arrives, put a "process this PDF" job in a queue; queue workers do the slow work, with per-job retry and DLQ. Kafka for the event, a queue for the work.' },
      ]},
      { type: 'quiz', questions: [
        { q: '"A profile photo was uploaded, make thumbnails in 3 sizes." What do you use?', options: ['A Kafka topic', 'A queue (SQS/RabbitMQ)', 'Redis Pub/Sub'], answer: 1, explain: 'This is a command: once, by one worker, with retries and a DLQ. The classic case for a queue.' },
        { q: 'Three teams read "order.created" from one single SQS queue. What happens?', options: ['All three get every message', 'Each message reaches only one team; the others miss it', 'SQS returns an error'], answer: 1, explain: 'In a queue, consumers compete; the message is deleted after the ack. If every team needs a copy, use fan-out (SNS → queues) or Kafka.' },
        { q: 'In Kafka, one bad message keeps failing. What happens to the messages behind it?', options: ['They move ahead of it', 'They stay stuck in that partition until you skip/park it', 'Kafka puts it in a DLQ by itself'], answer: 1, explain: 'A partition is read in order. You write the retry topic / DLQ topic logic yourself (or use a framework).' },
        { q: 'What is best for "order paid → the seller must confirm within 24 hours, otherwise refund"?', options: ['A cron job every minute', 'A workflow engine (Temporal / Step Functions)', 'Redis Pub/Sub'], answer: 1, explain: 'A long process, a timeout, compensation: a workflow engine keeps the state and timers durable.' },
      ]},
      { type: 'sources', note: 'Behaviour from the official docs; the decision table from roadmap phase 5.', items: [
        { title: 'Redis Pub/Sub', publisher: 'Redis documentation', official: true, url: 'https://redis.io/docs/latest/develop/interact/pubsub/', used: 'At-most-once delivery: if a subscriber is not connected, the message is lost.' },
        { title: 'Amazon SQS: visibility timeout and dead-letter queues', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html', used: 'Retry through the visibility timeout, DLQ after maxReceiveCount; a standard queue is at-least-once with best-effort order.' },
        { title: 'Apache Kafka documentation: consumer groups and offsets', publisher: 'Apache Software Foundation', official: true, url: 'https://kafka.apache.org/documentation/', used: 'Each consumer group has its own offset; retention; per-partition ordering.' },
        { title: 'Amazon Kinesis Data Streams: changing the data retention period', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/streams/latest/dev/kinesis-extended-retention.html', used: 'Default retention of 24 hours, can be raised up to 365 days.' },
        { title: 'AWS Step Functions: Standard vs Express workflows', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/step-functions/latest/dg/choosing-workflow-type.html', used: 'Standard workflows can run for up to one year.' },
        { title: 'Amazon SQS delay queues', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-delay-queues.html', used: 'The maximum message delay is 15 minutes.' },
        { title: 'Temporal documentation: workflows', publisher: 'Temporal', official: true, url: 'https://docs.temporal.io/workflows', used: 'Durable workflow state, timers/timeouts, deterministic workflow code.' },
      ]},
    ],
  });
})();
