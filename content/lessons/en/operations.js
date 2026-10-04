Lesson.register({
  id: 'operations',
  title: 'Observability, deployments, security',
  minutes: 45,
  summary: `Drawing a design on a diagram is only half the work. In the real world there are three more questions: can you <em>see</em> what is happening inside the system? How do you <em>ship</em> new code without breaking things for everyone? How do data and passwords stay <em>safe</em>, and what if a whole region goes down? Logs, metrics, traces, SLOs, error budgets, canary deploys, expand-contract migrations, secrets, RBAC and disaster recovery: you will run all of them yourself.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `So far we learned how to <strong>build</strong> xyz.com. Now we learn how to <strong>run</strong> it.<br>When you run a system, there are three fears: something broke inside and nobody noticed; new code was shipped and everything broke; a thief got in, or a whole data center went down.<br>This lesson teaches three habits: <strong>seeing</strong> the system (logs, metrics, traces), <strong>shipping code slowly and safely</strong> (canary, feature flags), and <strong>protecting</strong> data (encryption, secrets, backups, a second region).` },
    { type: 'h2', text: 'Problem: the system runs, but inside it is dark' },
    { type: 'p', html: `By the previous lesson (API gateway, retries, circuit breaker), xyz.com was split into ten services: Gateway, Video service, User service, Recommendations, Comments, Payments... Each service has many copies on many machines. The design is good. Then one night at 2 am the support team sends a message: <em>"Users say the video page opens very slowly."</em>` },
    { type: 'p', html: `The on-call engineer opens a laptop. Questions: <strong>which</strong> service is slow? <strong>How many</strong> users are affected? Since when? Is last night's deploy the cause, or the database? Should they SSH into 40 machines and start reading log files? By then it will be morning.` },
    { type: 'p', html: `Four questions like these come up in every serious design review, and they are the four parts of this lesson:` },
    { type: 'table', head: ['Question', 'Answer', 'Part of this lesson'], rows: [
      ['How do we know what is happening inside?', 'Logs, metrics, traces, correlation IDs', 'Observability'],
      ['How good is "good"? When do we wake someone up?', 'SLI, SLO, SLA, error budget, alerting', 'Reliability targets'],
      ['How do we ship new code without an outage?', 'Rolling, blue-green, canary, feature flags, safe migrations', 'Deployments'],
      ['Are data and keys safe? What if a region goes down?', 'TLS, encryption at rest, secrets, RBAC, audit logs, DR', 'Security and disaster recovery'],
    ]},
    { type: 'callout', tone: 'why', title: 'Why you should say this in an interview', html: `Most candidates stop after drawing boxes and arrows. If at the end you say in 2 minutes, "I will set SLOs on p99 latency and error rate, put a trace ID on every request, use canary deploys with auto rollback, keep secrets in a vault, and pick a warm standby region based on RPO/RTO", the interviewer sees that you have not only built a system but also <strong>run</strong> one.` },
    { type: 'h2', text: 'Observability: looking inside the system' },
    { type: 'callout', tone: 'term', title: 'New word: Observability', html: `<strong>What it is:</strong> understanding what is happening inside a system by looking at the signals it sends out (logs, metrics, traces), even for <em>new</em> questions, without adding new code. Like a doctor's thermometer, blood pressure machine and X-ray: each tells something different.<br><strong>Why we need it:</strong> across 40 machines and 10 services, we must find "what broke" with evidence, not guesses.<br><strong>Without it:</strong> at 2 am you SSH into machines one by one and read files.<br><strong>Monitoring</strong> is one part of it: checking fixed questions all the time (how much CPU? what error rate?) and alerting when something is wrong. Monitoring tells you <em>"something is broken"</em>; observability tells you <em>"why it broke"</em>.` },
    { type: 'p', html: `It has three main signals. None of them replaces the others; each answers a different question:` },
    { type: 'h3', text: 'Logs: "what happened, in detail"' },
    { type: 'callout', tone: 'term', title: 'New word: Log', html: `<strong>What it is:</strong> a line the code writes when something happens: "user 42 opened video 9", "the DB query failed". Like a diary entry.<br><strong>Why we need it:</strong> the <em>exact</em> reason for an error and its details (which user, which query, what message) are found only here.<br><strong>Without it:</strong> you know an error happened, but not why.<br><strong>The problem:</strong> when 40 machines each write to their own files, searching is hard. So there are two rules:` },
    { type: 'list', items: [
      `<strong>Structured logs</strong>: instead of a plain sentence, a JSON-like format so a machine can search it: <code>{"level":"error","service":"recs","user_id":42,"trace_id":"4bf9...","msg":"db timeout","ms":2000}</code>. Now "all errors of the recs service with ms &gt; 1000" is one query.`,
      `<strong>Centralised logging</strong>: every machine sends its logs to one central system (the ELK stack, which is Elasticsearch + Logstash + Kibana, or Grafana Loki, or a cloud log service). Engineers search everything from one place.`,
    ]},
    { type: 'p', html: `The weakness of logs: they are <strong>expensive</strong>. If xyz.com writes 10 lines per request at 20,000 requests/second, that is ~17 billion lines a day. So we use levels (DEBUG, INFO, WARN, ERROR), turn DEBUG off in production, and delete old logs after some days or move them to cheaper storage.` },
    { type: 'h3', text: 'Metrics: "how much, and what is the trend"' },
    { type: 'callout', tone: 'term', title: 'New word: Metric', html: `<strong>What it is:</strong> a number recorded over time: requests per second, error count, CPU %, p99 latency. Each event is not saved separately; only a <em>count</em> or summary every 10-15 seconds. Like a car's speedometer.<br><strong>Why we need it:</strong> very cheap and fast, so dashboards and alerts are built on them.<br><strong>Without it:</strong> to know "is the error rate going up?" you would have to count millions of log lines.<br>Popular tools: Prometheus + Grafana, Datadog, CloudWatch.` },
    { type: 'table', head: ['Metric type', 'What it is', 'xyz.com example'], rows: [
      ['Counter', 'Only goes up (back to 0 on restart)', '<code>http_requests_total{service="video",status="500"}</code>'],
      ['Gauge', 'Goes up and down, the current value', 'Messages waiting in a queue, memory used'],
      ['Histogram', 'Counts values in buckets, so percentiles can be computed', 'Request latency: how many &lt;50 ms, how many &lt;100 ms...'],
    ]},
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: cardinality', html: `Metrics carry labels (<code>service="video"</code>, <code>status="500"</code>). Every different label combination is a separate time series. If you put <code>user_id</code> in a label, 10 crore (100 million) users = 10 crore time series, and the metrics system collapses. Rule: labels hold only short, fixed lists (service, endpoint, status code, region). Per-user detail is the job of logs and traces.` },
    { type: 'p', html: `See for yourself. Add labels to the metric <code>http_requests_total</code> and see how many separate time series are created (each series is stored and queried separately in the metrics system):` },
    { type: 'custom', render(el) {
      const LB = [['service', 20], ['endpoint', 30], ['status', 6], ['region', 4], ['app_version', 20], ['user_id', 1e8]];
      let on = { service: 1, endpoint: 1, status: 1 };
      el.innerHTML = `<div class="chips cd-l" role="group" aria-label="Labels"></div>
        <div class="stats"><div class="stat"><span>Time series</span><strong class="cd-n"></strong></div><div class="stat"><span>Math</span><strong class="cd-f" style="font-size:15px"></strong></div></div>
        <div class="calc-note cd-note"></div>`;
      const $ = c => el.querySelector(c);
      const fmt = n => n >= 1e7 ? (n / 1e7).toLocaleString('en-IN', { maximumFractionDigits: 1 }) + ' crore' : n >= 1e5 ? (n / 1e5).toLocaleString('en-IN', { maximumFractionDigits: 1 }) + ' lakh' : n.toLocaleString('en-IN');
      const upd = () => {
        $('.cd-l').innerHTML = LB.map(([k, v]) => `<button type="button" class="chip${on[k] ? ' on' : ''}" data-k="${k}">${k} (${v >= 1e7 ? '10 crore' : v})</button>`).join('');
        el.querySelectorAll('.cd-l .chip').forEach(b => b.onclick = () => { on[b.dataset.k] = !on[b.dataset.k]; upd(); });
        const sel = LB.filter(([k]) => on[k]);
        const n = sel.reduce((a, [, v]) => a * v, 1);
        $('.cd-n').textContent = fmt(n);
        $('.cd-n').style.color = n < 1e5 ? 'var(--green)' : n < 1e6 ? 'var(--amber)' : 'var(--red)';
        $('.cd-f').textContent = sel.length ? sel.map(([, v]) => v >= 1e7 ? '10 crore' : v).join(' × ') : '1';
        $('.cd-note').textContent = on.user_id
          ? 'You added the user_id label: a separate series for every user. This number will crush any metrics system (memory, disk, queries, everything). Put per-user detail in logs and traces, not in metrics.'
          : n < 1e5 ? 'Fine: labels with short, fixed lists. Dashboards and alerts will stay fast.'
          : 'Growing: every new label multiplies the total, it does not add to it. Ask yourself: do you really need this label on a dashboard?';
      };
      upd();
    } },
    { type: 'callout', tone: 'tip', title: 'Percentiles recap', html: `Remember the "Latency, throughput and p99" lesson: the average lies, so we look at p50, p95 and p99. One more technical point: <strong>do not average</strong> the p99 of different servers; that is a wrong number. The right way: each server sends histogram buckets, you add the buckets, then compute p99 from the combined data.` },
    { type: 'h3', text: 'Traces: "where did one request go, and where did the time go"' },
    { type: 'p', html: `Metrics told us "the video page p99 became 2 seconds". But one request passes through Gateway → Video → (User + Recs). Where did the time go? This is where <strong>distributed tracing</strong> helps.` },
    { type: 'callout', tone: 'term', title: 'New words: Trace and Span', html: `<strong>Trace:</strong> the whole journey of one request, across all services. Like courier tracking: where it stopped and for how long.<br><strong>Span:</strong> one part of that journey, like "the Recs service ran a DB query". Each span has: a name, a start time, a duration, which span it ran inside (its parent), and extra info (attributes like <code>db.statement</code>, status).<br><strong>Why we need it:</strong> metrics say "it is slow"; a trace says "<em>where</em> it is slow".<br><strong>Without it:</strong> guessing which of 5 services is eating the time.<br>All spans share one <strong>trace ID</strong>, so they join into a tree. These definitions come from OpenTelemetry.` },
    { type: 'callout', tone: 'term', title: 'New word: OpenTelemetry (OTel)', html: `<strong>What it is:</strong> an open-source standard and set of libraries that create and send logs, metrics and traces in one common format.<br><strong>Why we need it:</strong> instrument your code once with OTel, then send the data to Jaeger, Grafana Tempo, Datadog, anywhere.<br><strong>Without it:</strong> a different library for each vendor; change vendor and you change all the code.` },
    { type: 'table', head: ['', 'Logs', 'Metrics', 'Traces'], rows: [
      ['Question', 'What happened? (detail)', 'How much? Trend?', 'Where? Where did the time go?'],
      ['Data', 'One event, text/JSON', 'Numbers over time', 'A tree of spans for one request'],
      ['Cost', 'High (volume)', 'Low', 'Medium-high, so sampling'],
      ['Best for', 'The exact reason for an error', 'Dashboards, alerts', 'Finding the slow part in microservices'],
    ]},
    { type: 'h3', text: 'Correlation ID: one thread through everything' },
    { type: 'callout', tone: 'term', title: 'New word: Correlation ID / Trace ID', html: `<strong>What it is:</strong> a unique ID created at the request's first door (the gateway) and passed forward in the header of every next call. Every service writes this ID in every log line and span. Like a tracking number stuck on a parcel.<br><strong>Why we need it:</strong> later you search for one ID, and you get all lines from all services for that one request.<br><strong>Without it:</strong> joining the lines of one user's request out of millions of logs from 5 services is almost impossible.<br>In tracing this is called the <strong>trace ID</strong>, and passing the ID forward is called <strong>context propagation</strong>.` },
    { type: 'p', html: `Today's common standard is W3C Trace Context. It uses a <code>traceparent</code> header holding a version, a 32-hex-character trace ID, a 16-hex parent span ID, and flags (like "this trace is sampled"):` },
    { type: 'code', text: `traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
             ↑  ↑ trace ID (of the whole request)  ↑ parent span ID ↑ flags (01 = sampled)
             version` },
    { type: 'p', html: `Now run it. A request goes from the gateway to three services, and each service sends its spans to a <strong>trace backend</strong>:` },
    { type: 'flow', height: 360,
      nodes: [
        { id: 'app', label: 'App', sub: 'Riya', x: 70, y: 150, w: 110, kind: 'client', info: 'What it is: user Riya\'s mobile app, opening a video page. It does not care about the trace ID; the gateway creates it.' },
        { id: 'gw', label: 'API Gateway', sub: 'creates trace ID', x: 235, y: 150, w: 150, kind: 'edge', info: 'What it is: xyz.com\'s first server-side door (resilience lesson). If the incoming request has no traceparent, it creates a new trace ID, starts its own span, and passes the header forward.' },
        { id: 'video', label: 'Video service', x: 440, y: 150, w: 150, kind: 'server', info: 'What it is: the service that puts together the video page data. It reads the trace ID from the header, creates its own span under it, and passes the header on when it calls User and Recs (the OTel library does this automatically).' },
        { id: 'user', label: 'User service', x: 630, y: 55, w: 150, kind: 'server', info: 'What it is: the service with user details. It gives the uploader\'s name and photo, and creates its span under the same trace ID.' },
        { id: 'recs', label: 'Recs service', x: 630, y: 245, w: 150, kind: 'server', info: 'What it is: the recommendations service, which builds the "watch next" list. It also creates a separate child span for its DB query, with the query text as an attribute.' },
        { id: 'coll', label: 'Trace backend', sub: 'OTel → Jaeger/Tempo', x: 330, y: 300, w: 180, kind: 'data', info: 'What it is: the system that collects and shows traces. All services send their spans here (often through an OpenTelemetry Collector in between). The backend joins spans with the same trace ID and shows a waterfall. This happens in the background, async, and does not slow the request.' },
      ],
      edges: [
        { a: 'app', b: 'gw' }, { a: 'gw', b: 'video' }, { a: 'video', b: 'user' }, { a: 'video', b: 'recs' },
        { a: 'gw', b: 'coll', dashed: true }, { a: 'video', b: 'coll', dashed: true }, { a: 'recs', b: 'coll', dashed: true },
      ],
      scenarios: [
        { name: 'The trace ID journey', steps: [
          { title: 'Request arrives, ID created', text: 'The gateway created a new trace ID (4bf9...) and started its root span.', go: 'app>gw', after: { gw: { sub: 'trace 4bf9...' } }, msg: 'GET /watch/42' },
          { title: 'Forward with the header', text: 'The <code>traceparent</code> header went with the call to the Video service. The Video service made its span a child of the gateway\'s span.', go: 'gw>video', msg: 'traceparent: 00-4bf9...4736-<gateway span>-01' },
          { title: 'Video calls two services at once', text: 'User and Recs both got the same trace ID; their parent is now the Video service span.', go: ['video>user', 'video>recs'], parallel: true, after: { user: { sub: 'trace 4bf9...' }, recs: { sub: 'trace 4bf9...' } } },
          { title: 'Answers come back', text: 'All fine: the page was built in 120 ms.', go: ['res:user>video', 'res:recs>video'], parallel: true },
          { title: 'Response to the user', go: 'res:video>gw>app', text: 'Riya got the video page.' },
          { title: 'Spans go to the backend in the background', text: 'Each service batches its spans and sends them to the trace backend. The backend joins all spans of one trace ID into a waterfall. (User service sends too; its line is not drawn to keep the diagram clean.)', go: ['evt:gw>coll', 'evt:video>coll', 'evt:recs>coll'], parallel: true, after: { coll: { state: 'ok', sub: '1 trace, 7 spans' } } },
        ]},
        { name: 'Slow request: find the culprit', intro: 'Complaint: "the video page takes 2 seconds." Metrics show there is a problem, but where?', steps: [
          { title: 'Request goes in', go: 'app>gw>video', text: 'Same path, same header.' },
          { title: 'User is quick, Recs is stuck', text: 'The User service answers in 28 ms. The Recs service DB query is running long.', go: ['video>user', 'video>recs'], parallel: true, set: { recs: { state: 'hot', sub: 'DB query 1.9 s' } } },
          { title: 'The page waited until then', text: 'The Video service needs both answers, so it waits for the slowest one. Total ~1.9 s.', go: ['res:user>video', 'res:recs>video', 'res:video>gw>app'] },
          { title: 'Open the trace', text: 'The engineer opens the waterfall in the trace backend using a slow request\'s trace ID: the Recs DB span alone is 1.9 s. Now it is evidence, not a guess. Explore this same waterfall yourself in the widget below.', go: ['evt:gw>coll', 'evt:video>coll', 'evt:recs>coll'], parallel: true, after: { coll: { state: 'hit', sub: 'Recs DB span: 1.9 s' } }, focus: ['recs', 'coll'] },
        ]},
        { name: 'Failure: the ID got lost', intro: 'The Recs team moved to a new web framework but forgot to set up tracing.', steps: [
          { title: 'Request goes in', go: 'app>gw>video', text: 'Gateway and Video have trace 4bf9....' },
          { title: 'Recs ignored the header', text: 'The Video service sent the header, but Recs never reads the incoming <code>traceparent</code>. It treated the request as <em>new</em> and created its own trace ID 9a1c....', go: ['video>user', 'video>recs'], parallel: true, set: { recs: { state: 'warn', sub: 'new trace 9a1c...' } } },
          { title: 'The backend gets two broken stories', text: 'One trace has Gateway + Video + User; another has Recs alone. In the waterfall, where Recs should be there is just a long empty gap. Logs cannot be joined by trace ID either.', go: ['evt:gw>coll', 'evt:video>coll', 'evt:recs>coll'], parallel: true, after: { coll: { state: 'warn', sub: '2 broken traces' } } },
          { title: 'Fix', text: 'Automatic propagation in every service with the OTel library or a service mesh, and put trace context in the headers of queue/Kafka messages too. If even one link breaks, the whole chain is useless.', focus: ['recs'], set: { recs: { state: 'ok', sub: 'propagates header' } } },
        ]},
      ],
    },
    { type: 'h3', text: 'Trace waterfall: catch the culprit yourself' },
    { type: 'p', html: `A trace backend shows a trace as a <strong>waterfall</strong>: each span is a bar, its left edge is the start time, its length is the duration, and child spans are shifted in under their parent. Click any bar. Watch the <strong>self time</strong> closely: the part of a span's time that did not go to its children, meaning the time the span spent <em>itself</em>.` },
    { type: 'custom', render(el) {
      const DATA = {
        normal: [
          ['gw', 'GET /watch/42', 'gateway', 0, 120, null, 'http.status=200'],
          ['vid', 'getVideoPage', 'video-svc', 5, 115, 'gw', 'video.id=42'],
          ['cache', 'redis GET video:42', 'video-svc', 8, 10, 'vid', 'cache.hit=true'],
          ['usr', 'getProfile', 'user-svc', 12, 40, 'vid', 'user.id=7'],
          ['udb', 'SELECT users', 'user-svc', 15, 35, 'usr', 'db.rows=1'],
          ['rec', 'getRecs', 'recs-svc', 12, 100, 'vid', 'recs.count=20'],
          ['rdb', 'SELECT watch_history', 'recs-svc', 18, 90, 'rec', 'db.rows_scanned=1,200 (index used)'],
        ],
        slow: [
          ['gw', 'GET /watch/42', 'gateway', 0, 1940, null, 'http.status=200'],
          ['vid', 'getVideoPage', 'video-svc', 5, 1935, 'gw', 'video.id=42'],
          ['cache', 'redis GET video:42', 'video-svc', 8, 10, 'vid', 'cache.hit=true'],
          ['usr', 'getProfile', 'user-svc', 12, 40, 'vid', 'user.id=7'],
          ['udb', 'SELECT users', 'user-svc', 15, 35, 'usr', 'db.rows=1'],
          ['rec', 'getRecs', 'recs-svc', 12, 1920, 'vid', 'recs.count=20'],
          ['rdb', 'SELECT watch_history', 'recs-svc', 18, 1905, 'rec', 'db.rows_scanned=4,200,000 (full table scan: yesterday\'s migration dropped the index)'],
        ],
      };
      const COL = { gateway: 'var(--accent)', 'video-svc': 'var(--violet)', 'user-svc': 'var(--green)', 'recs-svc': 'var(--amber)' };
      const depth = (spans, s) => { let d = 0, p = s[5]; while (p) { d++; p = spans.find(x => x[0] === p)[5]; } return d; };
      const selfTime = (spans, s) => {
        const kids = spans.filter(x => x[5] === s[0]).map(x => [Math.max(x[3], s[3]), Math.min(x[4], s[4])]).sort((a, b) => a[0] - b[0]);
        let covered = 0, cs = null, ce = null;
        kids.forEach(([a, b]) => { if (cs === null) { cs = a; ce = b; } else if (a <= ce) ce = Math.max(ce, b); else { covered += ce - cs; cs = a; ce = b; } });
        if (cs !== null) covered += ce - cs;
        return (s[4] - s[3]) - covered;
      };
      el.innerHTML = `<div class="op-tw-modes" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px"></div>
        <div class="op-tw-rows" style="display:flex;flex-direction:column;gap:6px"></div>
        <div class="op-tw-info" style="margin-top:12px;padding:10px 12px;border:1px solid var(--line);border-radius:var(--r-sm);background:var(--surface-2);font-size:14.5px;color:var(--ink-2)"></div>
        <div class="stats">
          <div class="stat"><span>Total request time</span><strong class="op-tw-total"></strong></div>
          <div class="stat"><span>Highest self time</span><strong class="op-tw-top"></strong></div>
          <div class="stat"><span>Share of total</span><strong class="op-tw-pct"></strong></div>
        </div>
        <div class="calc-note">Spans can run in parallel (User and Recs started together), so adding all durations does not give the total. Self time = the span's time minus its children's time.</div>`;
      let mode = 'normal', sel = 'rdb';
      const draw = () => {
        const spans = DATA[mode], total = spans[0][4];
        const modes = el.querySelector('.op-tw-modes'); modes.innerHTML = '';
        [['normal', 'Normal request (120 ms)'], ['slow', 'The complained-about request']].forEach(([k, n]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (mode === k ? ' on' : ''); b.textContent = n; b.onclick = () => { mode = k; draw(); }; modes.appendChild(b); });
        const rows = el.querySelector('.op-tw-rows'); rows.innerHTML = '';
        spans.forEach(s => {
          const b = document.createElement('button'); b.type = 'button';
          const on = s[0] === sel;
          b.style.cssText = `display:flex;align-items:center;gap:8px;width:100%;text-align:left;background:${on ? 'var(--surface)' : 'transparent'};border:1px solid ${on ? 'var(--ink-3)' : 'transparent'};border-radius:var(--r-sm);padding:4px 6px;cursor:pointer;color:var(--ink);font:inherit`;
          const left = (s[3] / total) * 100, w = Math.max(0.8, ((s[4] - s[3]) / total) * 100);
          b.innerHTML = `<span style="flex:0 0 38%;min-width:0;font:12.5px/1.3 var(--f-mono);padding-left:${depth(spans, s) * 8}px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s[1]}</span>
            <span style="flex:1;position:relative;height:16px;background:var(--surface-2);border-radius:4px">
              <span style="position:absolute;top:2px;bottom:2px;left:${left}%;width:${w}%;background:${COL[s[2]]};border-radius:3px"></span>
            </span>
            <span style="flex:0 0 58px;text-align:right;font:12.5px var(--f-mono);color:var(--ink-2)">${(s[4] - s[3]).toLocaleString('en-IN')} ms</span>`;
          b.onclick = () => { sel = s[0]; draw(); };
          rows.appendChild(b);
        });
        const s = spans.find(x => x[0] === sel);
        const st = selfTime(spans, s);
        el.querySelector('.op-tw-info').innerHTML = `<strong style="color:var(--ink)">${s[1]}</strong> · service <code>${s[2]}</code> · start ${s[3]} ms · duration ${(s[4] - s[3]).toLocaleString('en-IN')} ms · <strong style="color:var(--ink)">self time ${st.toLocaleString('en-IN')} ms</strong><br>attribute: <code>${s[6]}</code>`;
        let top = spans[0], topSelf = -1;
        spans.forEach(x => { const v = selfTime(spans, x); if (v > topSelf) { topSelf = v; top = x; } });
        el.querySelector('.op-tw-total').textContent = total.toLocaleString('en-IN') + ' ms';
        el.querySelector('.op-tw-top').textContent = top[1] + ' (' + topSelf.toLocaleString('en-IN') + ' ms)';
        el.querySelector('.op-tw-pct').textContent = Math.round(topSelf / total * 100) + '%';
      };
      draw();
    } },
    { type: 'p', html: `In the normal request, the span with the most self time is also the Recs DB query (72 ms, 60% of the total), and that is fine. In the complained-about request the same span is 1,887 ms, 97% of the total. Its attribute says 42 lakh (4.2 million) rows were scanned. The fix is clear: put the index back. Without a trace this could take hours to find; with a trace, 2 minutes.` },
    { type: 'h3', text: 'What should we measure? RED, USE and golden signals' },
    { type: 'p', html: `You could create thousands of metrics. To start, there are three famous checklists, and their ideas are quite similar:` },
    { type: 'table', head: ['Checklist', 'For what', 'What to watch'], rows: [
      ['<strong>RED</strong> (Tom Wilkie)', 'Every service / endpoint (things that handle requests)', '<strong>R</strong>ate (requests/sec), <strong>E</strong>rrors (how many fail), <strong>D</strong>uration (latency, p50/p99)'],
      ['<strong>USE</strong> (Brendan Gregg)', 'Every resource: CPU, memory, disk, DB connection pool', '<strong>U</strong>tilization (how busy), <strong>S</strong>aturation (how much work is waiting in line), <strong>E</strong>rrors'],
      ['<strong>Four golden signals</strong> (Google SRE book)', 'A user-facing system', 'Latency, Traffic, Errors, Saturation'],
    ]},
    { type: 'callout', tone: 'term', title: 'New word: Saturation', html: `<strong>What it is:</strong> how "full" a resource is and how much work is waiting in line. If the CPU is at 100%, more requests wait in a queue.<br><strong>Why we need it:</strong> utilization says "it is busy"; saturation says "it is so busy that people are waiting". Saturation is often the first sign that something will fall soon.<br><strong>Without it:</strong> you see CPU at 70% and think all is fine, while 200 requests are waiting in line for the DB connection pool.` },
    { type: 'callout', tone: 'tip', title: 'Sampling: we do not save every trace', html: `Keeping the full trace of every request is very expensive. So we use <strong>sampling</strong>: in <em>head sampling</em> the decision is made at the start of the request (for example, keep 1% of traces); cheap, but a rare slow request can be missed. In <em>tail sampling</em> the decision is made after the request ends: keep all errors and slow traces, and a small share of normal ones. More useful, but the collector must hold the whole trace in memory for a while.` },
    { type: 'h2', text: 'SLI, SLO, SLA: how good is "good"?' },
    { type: 'p', html: `Now we can see. The next question: <em>how</em> reliable should xyz.com be? "100%" is the wrong answer. Every extra nine is very expensive (remember the Availability lesson), and the user's phone, Wi-Fi and mobile network are not 100% themselves, so the user would not even notice the difference between 99.999% and 100%. We answer this question with three words:` },
    { type: 'callout', tone: 'term', title: 'SLI: Service Level Indicator', html: `<strong>What it is:</strong> a measurement that shows how happy users are, usually a ratio: <code>good requests / total requests</code>.<br><strong>Example:</strong> "the % of video page requests that finished in under 300 ms and without a 5xx error".<br><strong>Why we need it:</strong> one number that answers "is the site OK?".<br><strong>Note:</strong> choose SLIs from the user's point of view (request success, latency), not internal numbers like CPU %.` },
    { type: 'callout', tone: 'term', title: 'SLO: Service Level Objective', html: `<strong>What it is:</strong> a target for an SLI, with a time window: "in 30 days, 99.9% of video page requests must be good." It is the team's <em>internal</em> promise.<br><strong>Why we need it:</strong> everyone agrees on "how good is good enough".<br><strong>Without it:</strong> an argument after every outage, and nobody knows when to work on reliability.<br>If you go below it, users are unhappy, and the team works on reliability.` },
    { type: 'callout', tone: 'term', title: 'SLA: Service Level Agreement', html: `<strong>What it is:</strong> a <em>contract</em> with a customer that lists consequences: "if we go below 99.5%, you get 10% of your money back."<br><strong>Why it is looser:</strong> an SLA is always kept <strong>looser</strong> than the SLO (SLO 99.9%, SLA 99.5%), so that when the SLO breaks the team gets a warning first, before money has to be paid.<br>Not every service has an SLA, but every important service should have an SLO.` },
    { type: 'compare',
      left: { title: 'Without an SLO', html: `• Product team: "ship features fast!"<br>• Ops team: "change nothing, keep the site stable!"<br>• An argument at every deploy, no number.<br>• An alert at every CPU spike, whether users notice or not.` },
      right: { title: 'With an SLO', html: `• Both agree on one number: 99.9% / 30 days.<br>• Budget left → ship features.<br>• Budget gone → work on reliability.<br>• Alerts only when the users' experience puts the SLO at risk.` },
    },
    { type: 'h3', text: 'Error budget: permission to make mistakes' },
    { type: 'p', html: `The SLO is 99.9%, which means <strong>0.1% of requests are allowed to fail</strong>. This 0.1% is called the <strong>error budget</strong> (an idea from the Google SRE book). The budget is like a bank balance: every outage, every buggy deploy, every slow minute spends from it. If budget is left, the team can take risks (new features, experiments). If the budget is gone, an <strong>error budget policy</strong> applies, for example: new feature releases stop and only reliability fixes go out, until budget comes back in the window.` },
    { type: 'p', html: `Below, choose an SLO and the traffic, then add incidents. See how much budget is left:` },
    { type: 'custom', render(el) {
      const SLOS = [99, 99.5, 99.9, 99.95, 99.99];
      const PRE = [[20, 100, 'Full outage, 20 min'], [120, 5, '2 hours, 5% errors'], [10, 50, 'Buggy deploy: 10 min, 50% errors'], [60, 20, 'Slow DB: 1 hour, 20% requests >300 ms']];
      el.innerHTML = `<div style="font-size:14px;color:var(--ink-2);margin-bottom:6px">SLO (30-day window)</div>
        <div class="op-sl-slo" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="row2" style="margin-top:12px">
          <div><label>Requests per month (millions)</label><input class="op-sl-req" type="number" value="100" min="1" step="1"></div>
          <div><label>New incident: how many minutes, what % of requests bad</label>
            <div style="display:flex;gap:6px;flex-wrap:wrap"><input class="op-sl-dur" type="number" value="30" min="1" step="1" style="flex:1 1 70px" aria-label="minutes"><input class="op-sl-frac" type="number" value="10" min="1" max="100" step="1" style="flex:1 1 70px" aria-label="percent bad"><button type="button" class="btn small primary op-sl-add">Add</button></div></div>
        </div>
        <div class="op-sl-pre" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>
        <div class="op-sl-list" style="margin-top:10px;font:13px var(--f-mono)"></div>
        <div style="margin-top:12px;height:14px;border-radius:7px;background:var(--surface-2);border:1px solid var(--line);overflow:hidden"><div class="op-sl-bar" style="height:100%;width:0;transition:width .3s"></div></div>
        <div class="stats">
          <div class="stat"><span>Error budget (requests)</span><strong class="op-sl-b"></strong></div>
          <div class="stat"><span>= full outage per month</span><strong class="op-sl-m"></strong></div>
          <div class="stat"><span>Used by incidents</span><strong class="op-sl-u"></strong></div>
          <div class="stat"><span>Budget left</span><strong class="op-sl-r"></strong></div>
        </div>
        <div class="calc-note op-sl-note"></div>`;
      let slo = 99.9, inc = [[20, 100, 'Full outage, 20 min'], [120, 5, '2 hours, 5% errors']];
      const MIN = 30 * 24 * 60;
      const fmtMin = m => m >= 120 ? (m / 60).toFixed(1) + ' hours' : (m >= 10 ? m.toFixed(1) : m.toFixed(2)) + ' min';
      const fmtN = n => Math.round(n).toLocaleString('en-IN');
      const draw = () => {
        const reqs = Math.max(1, Number(el.querySelector('.op-sl-req').value) || 1) * 1e6;
        const perMin = reqs / MIN, budgetReq = reqs * (1 - slo / 100), budgetMin = MIN * (1 - slo / 100);
        const badReq = inc.reduce((a, [d, f]) => a + perMin * d * f / 100, 0);
        const usedPct = budgetReq ? badReq / budgetReq * 100 : 0, left = 100 - usedPct;
        const so = el.querySelector('.op-sl-slo'); so.innerHTML = '';
        SLOS.forEach(v => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (v === slo ? ' on' : ''); b.textContent = v + '%'; b.onclick = () => { slo = v; draw(); }; so.appendChild(b); });
        const list = el.querySelector('.op-sl-list'); list.innerHTML = '';
        if (!inc.length) list.innerHTML = '<div style="color:var(--ink-3)">No incidents. Add one above.</div>';
        inc.forEach(([d, f, n], i) => {
          const row = document.createElement('div'); row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:3px 0;border-bottom:1px dashed var(--line)';
          const share = budgetReq ? (perMin * d * f / 100) / budgetReq * 100 : 0;
          row.innerHTML = `<span style="flex:1 1 200px">${n}</span><span style="color:var(--ink-2)">${fmtN(perMin * d * f / 100)} bad = ${share.toFixed(1)}% of budget</span>`;
          const x = document.createElement('button'); x.type = 'button'; x.className = 'btn small ghost'; x.textContent = 'remove'; x.onclick = () => { inc.splice(i, 1); draw(); };
          row.appendChild(x); list.appendChild(row);
        });
        el.querySelector('.op-sl-b').textContent = fmtN(budgetReq) + ' (' + (100 - slo).toFixed(2).replace(/0+$/, '').replace(/\.$/, '') + '%)';
        el.querySelector('.op-sl-m').textContent = fmtMin(budgetMin);
        el.querySelector('.op-sl-u').textContent = usedPct.toFixed(1) + '%';
        el.querySelector('.op-sl-r').textContent = Math.max(0, left).toFixed(1) + '%';
        const bar = el.querySelector('.op-sl-bar');
        bar.style.width = Math.max(0, Math.min(100, left)) + '%';
        bar.style.background = left > 25 ? 'var(--green)' : left > 0 ? 'var(--amber)' : 'var(--red)';
        el.querySelector('.op-sl-note').textContent = left > 25
          ? `Budget is left: keep shipping features and running experiments. (Traffic assumed even across the month: ${fmtN(perMin)} requests/min.)`
          : left > 0 ? 'Little budget left: slow down risky deploys and put reliability work first.'
          : `Budget gone (${usedPct.toFixed(0)}% used): the error budget policy kicks in. New feature releases freeze, only reliability fixes, until budget builds up again in the 30-day window.`;
      };
      const pre = el.querySelector('.op-sl-pre');
      PRE.forEach(p => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small ghost'; b.textContent = '+ ' + p[2]; b.onclick = () => { inc.push(p.slice()); draw(); }; pre.appendChild(b); });
      const clr = document.createElement('button'); clr.type = 'button'; clr.className = 'btn small ghost'; clr.textContent = 'Remove all'; clr.onclick = () => { inc = []; draw(); }; pre.appendChild(clr);
      el.querySelector('.op-sl-add').onclick = () => {
        const d = Math.max(1, Number(el.querySelector('.op-sl-dur').value) || 1), f = Math.min(100, Math.max(1, Number(el.querySelector('.op-sl-frac').value) || 1));
        inc.push([d, f, `Custom: ${d} min, ${f}% bad`]); draw();
      };
      el.querySelector('.op-sl-req').addEventListener('input', draw);
      draw();
    } },
    { type: 'p', html: `Look at the default: SLO 99.9% and 30 days = a budget of <strong>43.2 minutes</strong> (if the whole site is down). With 100 million requests, that means 1 lakh (100,000) bad requests are allowed. A 20-minute full outage + 2 hours of 5% errors = the same as 26 "outage minutes", so ~60% of the budget is gone and ~40% is left. Now pick 99.99%: the budget is only 4.32 minutes, and that same 20-minute outage alone eats 463% of the budget. At 99% the budget is 7.2 hours, and both incidents eat only 6%. Every extra nine makes the budget 10 times smaller.` },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion', html: `"If budget is left, it is wasted, so use it" sounds strange, but that is the idea. If 90% of the budget is left at the end of the month, maybe the SLO is stricter than needed, or the team is shipping too slowly. The error budget is an <strong>agreement</strong> between reliability and speed, not just a report card.` },
    { type: 'h3', text: 'Alerting: when do we wake someone at 3 am?' },
    { type: 'p', html: `An alert means a person stops their work or wakes up. So every alert must pass one question: <em>"are users hurting right now, and does a person need to do something right now?"</em>` },
    { type: 'compare',
      left: { title: 'Cause-based alert (mostly useless)', html: `"Server 7 CPU is at 90%."<br><br>Users may not notice at all (the other 39 servers are fine). Or CPU may be at 40% while the site is still breaking (a DB lock). Such alerts ring a lot and do not really tell you anything.` },
      right: { title: 'Symptom-based alert (good)', html: `"The video page error rate is eating the budget fast, measured against the SLO."<br><br>It measures the user's pain directly. Whatever the cause (CPU, DB, bug, network), the alert rings. Dashboards and traces are there to find the cause.` },
    },
    { type: 'list', items: [
      `<strong>Page vs ticket</strong>: a page (a call/notification on the phone) is only for urgent, user-facing problems that need action. Everything else is a ticket or chat message looked at during working hours.`,
      `<strong>Alert fatigue</strong>: if 50 alerts ring every day and 48 turn out useless, the engineer learns to ignore alerts, and misses the real one too. Every alert that closed without any action should be removed or fixed.`,
      `<strong>A runbook with every alert</strong>: a short doc saying what this alert means, what to check first, and a link to the dashboard.`,
    ]},
    { type: 'callout', tone: 'term', title: 'New word: Burn rate', html: `<strong>What it is:</strong> how fast the budget is burning, compared to the SLO. Like how fast a fuel tank is emptying.<br><strong>How to measure:</strong> burn rate 1 = a speed at which the budget runs out in exactly 30 days. Burn rate 10 = 10 times faster, so it runs out in 3 days. With a 99.9% SLO and a 1% error rate, burn rate = 1% / 0.1% = 10.<br><strong>Why we need it:</strong> "error rate 2%" alone says little; the burn rate tells you how soon the month's budget will be gone, which means how urgently to wake someone.` },
    { type: 'p', html: `A simple alert like "error rate &gt; 0.1% for 5 min" either rings too often (on small spikes) or too late. Google's SRE workbook suggests <strong>multi-window, multi-burn-rate</strong> alerts. Their starting point for a 99.9% SLO:` },
    { type: 'table', head: ['Budget spent', 'Long window', 'Short window', 'Burn rate', 'Action'], rows: [
      ['2%', '1 hour', '5 min', '14.4', 'Page (wake up now)'],
      ['5%', '6 hours', '30 min', '6', 'Page'],
      ['10%', '3 days', '6 hours', '1', 'Ticket (look during the day)'],
    ], caption: 'The math: 30 days = 720 hours. 14.4 × 1 hour / 720 = 2%. 6 × 6 / 720 = 5%. 1 × 72 / 720 = 10%. The short window exists so the alert stops quickly once the problem is fixed.' },
    { type: 'p', html: `At burn rate 14.4 the whole month's budget is gone in ~2 days (720 / 14.4 = 50 hours), so page. At burn rate 1 there is no hurry, but the trend should be visible, so a ticket.` },
    { type: 'p', html: `Try it. SLO 99.9%. Choose an incident (what % of requests fail, for how long), and see which alert fires when, and how much of the month's budget has burned by then. There is also a "naive" alert: <code>error rate &gt; 0.1% for 5 min</code>.` },
    { type: 'custom', render(el) {
      const ERR = [0.2, 0.5, 1, 2, 5, 10, 50, 100], DUR = [3, 6, 10, 20, 60, 240, 720, 2880];
      const RULES = [['Page: 14.4x, 1 hour + 5 min', 14.4, 60], ['Page: 6x, 6 hours + 30 min', 6, 360], ['Ticket: 1x, 3 days + 6 hours', 1, 4320]];
      const PRE = [['Big outage', 7, 3], ['Small blip', 4, 1], ['Medium bug', 3, 5], ['Slow leak', 1, 7]];
      const BUDGET = 0.001, MONTH = 43200;
      el.innerHTML = `<div class="br-pre" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="row2" style="margin-top:10px">
          <div><label>What % of requests fail: <strong class="br-ev"></strong></label><input class="br-e" type="range" min="0" max="7" step="1" value="7"></div>
          <div><label>How long the incident lasts: <strong class="br-dv"></strong></label><input class="br-d" type="range" min="0" max="7" step="1" value="3"></div>
        </div>
        <div class="br-rows" style="margin-top:10px;display:flex;flex-direction:column;gap:6px"></div>
        <div class="stats"><div class="stat"><span>Burn rate</span><strong class="br-b"></strong></div><div class="stat"><span>Total budget used by the incident</span><strong class="br-t"></strong></div></div>
        <div class="calc-note br-note"></div>`;
      const $ = c => el.querySelector(c);
      const fm = m => m < 1 ? Math.round(m * 60) + ' s' : m < 120 ? (Math.round(m * 10) / 10) + ' min' : (Math.round(m / 6) / 10) + ' hours';
      $('.br-pre').innerHTML = PRE.map((p, i) => `<button type="button" class="btn small ghost" data-i="${i}">${p[0]}</button>`).join('');
      el.querySelectorAll('.br-pre button').forEach(b => b.onclick = () => { const p = PRE[+b.dataset.i]; $('.br-e').value = p[1]; $('.br-d').value = p[2]; upd(); });
      const upd = () => {
        const e = ERR[+$('.br-e').value] / 100, D = DUR[+$('.br-d').value];
        $('.br-ev').textContent = (e * 100) + '%'; $('.br-dv').textContent = fm(D);
        const burn = e / BUDGET;
        const row = (name, fire, used, kind) => `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:6px 8px;border:1px solid var(--line);border-radius:var(--r-sm)"><span style="flex:1 1 200px;font-size:14px">${name}</span><strong style="font-size:14px;color:${fire === null ? 'var(--ink-3)' : kind === 'noise' ? 'var(--amber)' : 'var(--red)'}">${fire === null ? 'did not fire' : 'fired @ ' + fm(fire) + ' (budget ' + used + ')'}</strong></div>`;
        let html = '', fired = [];
        RULES.forEach(([n, B, W]) => { const t = W * B * BUDGET / e; const ok = burn >= B && t <= D; if (ok) fired.push(n); html += row(n, ok ? t : null, (B * W / MONTH * 100).toFixed(0) + '%'); });
        const naive = D >= 5 && e > BUDGET;
        html += row('Naive: &gt; 0.1% for 5 min', naive ? 5 : null, (e * 5 / (BUDGET * MONTH) * 100).toFixed(2) + '%', 'noise');
        $('.br-rows').innerHTML = html;
        const tot = e * D / (BUDGET * MONTH) * 100;
        $('.br-b').textContent = (Math.round(burn * 10) / 10) + 'x';
        $('.br-t').textContent = tot.toFixed(tot < 1 ? 2 : 0) + '%';
        $('.br-note').textContent = fired.length
          ? `Burn rate ${Math.round(burn * 10) / 10}x. First alert to fire: "${fired[0]}". Each rule fires when a fixed share of the month (2%, 5%, 10%) has burned: whether the fire is fast or slow, a person is woken up only at a set amount of damage.`
          : naive ? `The naive alert paged someone, but the whole incident used only ${tot.toFixed(2)}% of the budget. That was a wasted 3 am wake-up: this is called alert fatigue. The burn-rate rules stayed quiet.`
          : `No alert fired: the incident was small (${tot.toFixed(2)}% of budget). It shows on the dashboard; nobody needs to be woken up.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    } },
    { type: 'h2', text: 'Deployments: how to ship new code without breaking everything' },
    { type: 'p', html: `The data started showing that most outages come after some <em>change</em>: new code, new config, a new DB schema. xyz.com's old way: on Friday evening, stop all 40 servers, copy the new version, start everything. Once the new version had a bug that only showed up with real traffic. The result: the site broke for <strong>100% of users</strong>, and bringing back the old version took 40 minutes.` },
    { type: 'callout', tone: 'term', title: 'New words: Deploy, release, rollback, blast radius', html: `<strong>Deploy:</strong> getting new code onto the servers and running it.<br><strong>Release:</strong> showing a new feature to users. (With feature flags these become two separate things; we will see that soon.)<br><strong>Rollback:</strong> going back to the old version when something goes wrong.<br><strong>Blast radius:</strong> how many users one bug reaches. Like a fire in one room vs a fire in the whole house.<br><strong>Why it matters:</strong> a good deployment strategy aims for a small blast radius and a fast rollback. Without it: every bug hits 100% of users, and going back takes 40 minutes.` },
    { type: 'h3', text: 'Rolling deployment' },
    { type: 'p', html: `Instead of changing everything at once, change a little at a time: take 4 of the 40 servers out of the Load Balancer, update them, wait for their health checks to pass, add them back, then the next 4. Kubernetes Deployments do this by default (the <code>maxSurge</code> and <code>maxUnavailable</code> settings, both 25% by default).` },
    { type: 'list', items: [
      `<strong>Benefit</strong>: almost no extra servers needed, and the site is never fully down.`,
      `<strong>Cost</strong>: during the deploy the old and new versions run <em>at the same time</em>, so both must work with the same DB schema and API. A rollback is another rolling deploy, so it takes minutes. And without automatic checks, a bug slowly spreads to the whole fleet.`,
    ]},
    { type: 'h3', text: 'Blue-green deployment' },
    { type: 'p', html: `Two complete, identical environments: <strong>Blue</strong> (live now, v1) and <strong>Green</strong> (empty). Deploy v2 on Green, test it calmly, then flip the switch on the router/Load Balancer: all traffic goes to Green. Something wrong? Flip the switch back to Blue, in seconds. Martin Fowler gave this a name on his bliki in 2010.` },
    { type: 'ascii', text: `
           Router / LB
          /           \\
  [ BLUE: v1 ]     [ GREEN: v2 ]
   live, 100%       being tested
          \\           /
           Shared DB  ← careful: both use this one

Switch:  Router → GREEN (100%).  Rollback: Router → BLUE.` },
    { type: 'list', items: [
      `<strong>Benefit</strong>: instant switch, instant rollback, and only one version is live at a time.`,
      `<strong>Cost</strong>: you need double capacity during the deploy. The switch moves 100% of users to the new version in one go, so a bug hits everyone (you can just come back quickly). And the database is usually shared, so schema changes must still work with both versions.`,
    ]},
    { type: 'p', html: `Run both against the same bug. 10 servers, 10,000 requests/minute. v2 has a bug that makes 20% of requests fail. The alert fires at minute 6 and the rollback starts. In rolling, each step takes 2 minutes.` },
    { type: 'custom', render(el) {
      const N = 10, PER = 10000, BUG = 0.2, DET = 6, M = 16;
      const MODES = [['r1', 'Rolling, 1 server/step', 1], ['r2', 'Rolling, 2 servers/step', 2], ['r5', 'Rolling, 5 servers/step', 5], ['bg', 'Blue-green', 0]];
      el.innerHTML = `<div class="chips dp-m" role="group" aria-label="Strategy">${MODES.map(([k, n], i) => `<button type="button" class="chip${i === 1 ? ' on' : ''}" data-k="${k}">${n}</button>`).join('')}</div>
        <svg class="dp-svg" viewBox="0 0 640 150" style="width:100%;height:auto;margin-top:10px;display:block" role="img" aria-label="Servers on v2 each minute"></svg>
        <div class="stats">
          <div class="stat"><span>Errors seen by users</span><strong class="dp-bad"></strong></div>
          <div class="stat"><span>Time to roll back</span><strong class="dp-rb"></strong></div>
          <div class="stat"><span>Most servers at once</span><strong class="dp-pk"></strong></div>
        </div>
        <div class="calc-note dp-note"></div>`;
      const $ = c => el.querySelector(c);
      let mode = 'r2';
      const series = k => {
        const b = MODES.find(x => x[0] === k)[2], out = [];
        for (let m = 0; m < M; m++) {
          if (k === 'bg') out.push(m < DET ? N : 0);
          else { const c5 = Math.min(N, b * (Math.floor((DET - 1) / 2) + 1)); out.push(m < DET ? Math.min(N, b * (Math.floor(m / 2) + 1)) : Math.max(0, c5 - b * (Math.floor((m - DET) / 2) + 1))); }
        }
        return { out, b };
      };
      const upd = () => {
        const { out, b } = series(mode);
        let svg = '';
        out.forEach((c, m) => { const x = 20 + m * 38, hh = c * 10; svg += `<rect x="${x}" y="${110 - hh}" width="30" height="${Math.max(1, hh)}" rx="3" fill="${m < DET ? 'var(--red)' : 'var(--amber)'}" opacity="${c ? 1 : .25}"/><text x="${x + 15}" y="128" text-anchor="middle" font-size="11" fill="var(--ink-3)" font-family="var(--f-mono)">${m}</text>`; });
        svg += `<line x1="${20 + DET * 38 - 4}" y1="4" x2="${20 + DET * 38 - 4}" y2="114" stroke="var(--ink-2)" stroke-dasharray="4 3"/><text x="${20 + DET * 38}" y="14" font-size="11" fill="var(--ink-2)">alert, rollback</text><text x="20" y="146" font-size="11" fill="var(--ink-3)">minute → (bar = servers on v2)</text>`;
        $('.dp-svg').innerHTML = svg;
        const bad = out.reduce((a, c) => a + c / N * PER * BUG, 0);
        $('.dp-bad').textContent = Math.round(bad).toLocaleString('en-IN');
        const back = out.findIndex((c, m) => m >= DET && c === 0);
        $('.dp-rb').textContent = mode === 'bg' ? 'seconds (switch)' : (back - DET) + ' min';
        $('.dp-pk').textContent = mode === 'bg' ? (2 * N) + ' (2 environments)' : (N + b) + ' (surge ' + b + ')';
        $('.dp-note').textContent = mode === 'bg'
          ? 'Blue-green: flipping the switch moved 100% of users to v2 at once. Everyone hit the bug for 6 minutes, then one click sent everyone back to Blue (v1). The fastest rollback, but the blast radius is everyone, and you need 2x servers during the deploy.'
          : b === 1 ? 'Small batches: the bug had reached only 1-3 servers when the alert fired, so errors were lowest. But the deploy is slow (10 servers = 20 minutes), and the rollback is just as slow.'
          : b === 5 ? 'Big batches: half the servers were on v2 within 2 minutes, all of them within 4. By the time of the alert, everything was broken: about as many errors as blue-green, and the rollback still takes minutes.'
          : 'The middle path. The risk of rolling: the rollback is also a rolling deploy and takes minutes. That is why real systems need automatic checks that catch the bug on the first 1-2 servers (canary, below).';
      };
      el.querySelectorAll('.dp-m .chip').forEach(bt => bt.addEventListener('click', () => { mode = bt.dataset.k; el.querySelectorAll('.dp-m .chip').forEach(x => x.classList.toggle('on', x === bt)); upd(); }));
      upd();
    } },
    { type: 'h3', text: 'Canary release' },
    { type: 'p', html: `The name comes from old coal mines: miners took a canary bird with them; poisonous gas affected it first, so the humans found out in time. In software: give the new version to <strong>1% of traffic</strong> first. Compare its metrics (error rate, p99 latency) with the old version. If fine, go to 10%, then 50%, then 100%. If metrics get worse anywhere, <strong>automatic rollback</strong>: the canary's traffic goes back to 0%.` },
    { type: 'callout', tone: 'term', title: 'New word: Bake time', html: `<strong>What it is:</strong> how long we wait at each canary stage to collect data.<br><strong>Why we need it:</strong> too short = wrong decisions based on noise. Too long = deploys take hours.<br><strong>Note:</strong> a stage needs <em>at least enough requests</em> to trust the ratio: 1 error in 20 requests = 5%, but that could just be luck.` },
    { type: 'p', html: `Run the canary pipeline below. There are three different v2 builds. The rule: check every minute, and once a stage has at least 500 canary requests, if the canary's error rate goes <strong>above 1%</strong> (double v1's normal 0.5%), roll back immediately. Traffic: 10,000 requests/minute, each stage 10 minutes.` },
    { type: 'custom', render(el) {
      const VERS = {
        ok: { name: 'v2 healthy', p: () => 0.005, seed: 42 },
        crash: { name: 'v2 crash bug (6% errors)', p: () => 0.06, seed: 11 },
        load: { name: 'v2 load bug (at 50%+ traffic)', p: pct => pct >= 50 ? 0.05 : 0.005, seed: 13 },
      };
      const STAGES = [1, 10, 50, 100], PER_MIN = 10000, BAKE = 10, MIN_REQ = 500, LIMIT = 0.01;
      const sim = (key, auto) => {
        const v = VERS[key]; let seed = v.seed;
        const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
        const rows = []; let total = 0, stopped = null, minutes = 0;
        for (const pct of STAGES) {
          let req = 0, err = 0, m = 0, verdict = auto ? 'pass' : 'nocheck';
          for (m = 1; m <= BAKE; m++) {
            const n = PER_MIN * pct / 100, p = v.p(pct);
            for (let i = 0; i < n; i++) if (rnd() < p) err++;
            req += n; minutes++;
            if (auto && req >= MIN_REQ && err / req > LIMIT) { verdict = 'rollback'; break; }
          }
          rows.push({ pct, mins: Math.min(m, BAKE), req, err, verdict });
          total += err;
          if (verdict === 'rollback') { stopped = { pct, min: m }; break; }
        }
        return { rows, total, stopped, minutes };
      };
      el.innerHTML = `<div class="op-cn-v" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="op-cn-a" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"></div>
        <div style="overflow-x:auto;margin-top:12px"><table style="width:100%;border-collapse:collapse;font-size:13.5px;min-width:300px"><thead><tr style="text-align:left;color:var(--ink-3)"><th style="padding:4px">Stage</th><th style="padding:4px">Min</th><th style="padding:4px">Canary req</th><th style="padding:4px">Errors</th><th style="padding:4px">Rate</th><th style="padding:4px">Decision</th></tr></thead><tbody class="op-cn-rows"></tbody></table></div>
        <div class="stats">
          <div class="stat"><span>Result</span><strong class="op-cn-res"></strong></div>
          <div class="stat"><span>Errors users saw</span><strong class="op-cn-tot"></strong></div>
          <div class="stat"><span>Big-bang deploy (nobody notices for 10 min)</span><strong class="op-cn-bb"></strong></div>
        </div>
        <div class="calc-note op-cn-note"></div>`;
      let key = 'crash', auto = true;
      const chipRow = (box, items, cur, set) => { box.innerHTML = ''; items.forEach(([k, n]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (cur === k ? ' on' : ''); b.textContent = n; b.onclick = () => { set(k); draw(); }; box.appendChild(b); }); };
      const draw = () => {
        chipRow(el.querySelector('.op-cn-v'), Object.entries(VERS).map(([k, v]) => [k, v.name]), key, k => { key = k; });
        chipRow(el.querySelector('.op-cn-a'), [[true, 'Auto rollback ON'], [false, 'Auto rollback OFF']], auto, k => { auto = k; });
        const r = sim(key, auto);
        el.querySelector('.op-cn-rows').innerHTML = r.rows.map(x => `<tr style="border-top:1px solid var(--line)"><td style="padding:4px">${x.pct}%</td><td style="padding:4px">${x.mins}</td><td style="padding:4px">${x.req.toLocaleString('en-IN')}</td><td style="padding:4px">${x.err.toLocaleString('en-IN')}</td><td style="padding:4px;color:${x.err / x.req > LIMIT ? 'var(--red)' : 'var(--ink)'}">${(x.err / x.req * 100).toFixed(2)}%</td><td style="padding:4px;font-weight:700;color:${x.verdict === 'pass' ? 'var(--green)' : x.verdict === 'nocheck' ? 'var(--ink-3)' : 'var(--red)'}">${x.verdict === 'pass' ? 'pass →' : x.verdict === 'nocheck' ? 'no check →' : 'ROLLBACK'}</td></tr>`).join('');
        el.querySelector('.op-cn-res').textContent = r.stopped ? `Rollback @ ${r.stopped.pct}%, min ${r.stopped.min}` : 'live at 100%';
        el.querySelector('.op-cn-tot').textContent = r.total.toLocaleString('en-IN');
        const bb = Math.round(PER_MIN * BAKE * VERS[key].p(100));
        el.querySelector('.op-cn-bb').textContent = '~' + bb.toLocaleString('en-IN');
        const notes = {
          ok: 'Healthy build: the error rate was ~0.5% at every stage (same as v1), so the pipeline took it to 100% by itself. Normal errors are counted too; the canary only has to catch whether the new version is worse than the old one.',
          crash: auto ? 'The crash bug was caught at the 1% stage: as soon as the 500-request sample was complete, the rate was above 1%. Only ~30 users saw an error; with big-bang ~6,000 would have.' : 'Auto rollback off: the pipeline went to 100% blindly, and at every stage the bug reached users. A canary without automatic analysis is just a slow big-bang.',
          load: auto ? 'The load bug stayed hidden at 1% and 10% (all was fine at low traffic). At 50% it was caught in the first minute. That is why there are several stages: some bugs only show at scale. And that is why rollback must be automatic and instant: at the 50% stage each minute of delay means ~250 extra errors.' : 'Auto rollback off: the load bug kept running at both 50% and 100%.',
        };
        el.querySelector('.op-cn-note').textContent = notes[key];
      };
      draw();
    } },
    { type: 'p', html: `Pick the crash bug build: at the 1% stage, 500 requests in 5 minutes, 30 errors (6%), rollback. Only ~30 bad requests, while big-bang would have ~6,000 in 10 minutes. The load bug build: everything normal at 1% and 10%, then at 50%, 253 errors in the first minute and a rollback. Then switch to "Auto rollback OFF": the same pipeline now takes every bug all the way to 100%.` },
    { type: 'callout', tone: 'warn', title: 'The small-sample trap', html: `Even a healthy build can sometimes show 6 errors in 500 requests (1.2%) by luck and get rolled back for nothing. So real tools (Spinnaker's Kayenta, Argo Rollouts, Flagger) compare the canary statistically with a <em>baseline</em> group of the old version running at the same time, on several metrics (errors, p99, CPU), not just against one fixed line. And canary users are kept "sticky", so one user does not swing between v1 and v2 again and again.` },
    { type: 'table', head: ['', 'Rolling', 'Blue-green', 'Canary'], rows: [
      ['How', 'Servers updated in batches', 'Two full environments, one switch', 'Slowly increase the % of traffic'],
      ['Extra capacity', 'A little (surge)', '2x, during the deploy', 'A little'],
      ['How many users a bug reaches', 'As many servers as already updated', 'Everyone after the switch (quick to undo)', 'Only the canary % (1%, 10%...)'],
      ['Rollback speed', 'Minutes (rolling in reverse)', 'Seconds (switch back)', 'Seconds (traffic to 0%)'],
      ['Needs', 'Health checks', 'Router switch, 2x infra', 'Good metrics + automatic analysis'],
      ['When', 'Default, small changes', 'When you need instant rollback and infra is cheap', 'Big traffic, risky change, user-facing service'],
    ]},
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion', html: `The three are not enemies. Real systems often mix them: canary at 1% first, then rolling across the rest of the fleet. And none of the three protects one thing: the <strong>database</strong>. Code rollback takes seconds; a bad schema change or bad data cannot be rolled back. For that, see expand-contract below.` },
    { type: 'h3', text: 'Feature flags: separate deploy from release' },
    { type: 'p', html: `A new "Shorts" tab is being built, half ready. The code went to production, but it is switched off behind an <code>if</code>: <code>if (flags.isOn("shorts_tab", user)) { ... }</code>. The flag's on/off lives in a config service and can change without a deploy. This is called a <strong>feature flag</strong> (or feature toggle).` },
    { type: 'callout', tone: 'term', title: 'New word: Feature flag', html: `<strong>What it is:</strong> an <code>if</code> inside the code whose on/off comes from a config service and can change without a deploy. Like the main switch of a house: the wiring (code) is already in place, you just press the switch.<br><strong>Why we need it:</strong> <em>deploy</em> (getting code onto servers) and <em>release</em> (showing it to users) become separate. Found a bug? Turn the flag off: in seconds, without a new deploy.<br><strong>Without it:</strong> every small rollback means deploying the whole old version.` },
    { type: 'p', html: `How does a percentage rollout work? For each user the flag service computes <code>hash(flag_name + user_id) % 100</code> (a "bucket" from 0 to 99). If the bucket is below the rollout %, the flag is on. So the same user always gets the same answer (sticky), and when you raise the %, the earlier users stay on. Here are 100 users:` },
    { type: 'custom', render(el) {
      const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };
      const FLAGS = ['shorts_tab', 'new_thumbnail'];
      el.innerHTML = `<div class="chips ff-f" role="group" aria-label="Flag">${FLAGS.map((f, i) => `<button type="button" class="chip${i ? '' : ' on'}" data-f="${f}">${f}</button>`).join('')}</div>
        <div class="row2" style="margin-top:10px"><div><label>Rollout: <strong class="ff-pv"></strong></label><input class="ff-p" type="range" min="0" max="100" step="5" value="10"></div>
        <div><label style="display:flex;gap:6px;align-items:center;margin-top:22px"><input class="ff-k" type="checkbox"> Kill switch (flag OFF for everyone)</label></div></div>
        <div class="ff-g" style="display:grid;grid-template-columns:repeat(10,1fr);gap:4px;margin-top:10px;max-width:340px"></div>
        <div class="stats"><div class="stat"><span>Users who see the feature</span><strong class="ff-n"></strong></div><div class="stat"><span>Bucket of user 42</span><strong class="ff-b"></strong></div></div>
        <div class="calc-note ff-note"></div>`;
      const $ = c => el.querySelector(c);
      let flag = 'shorts_tab';
      const upd = () => {
        const p = +$('.ff-p').value, kill = $('.ff-k').checked;
        $('.ff-pv').textContent = p + '%';
        let on = 0, cells = '';
        for (let u = 1; u <= 100; u++) { const bk = hash(flag + ':' + u) % 100, is = !kill && bk < p; if (is) on++; cells += `<span title="user ${u}, bucket ${bk}" style="aspect-ratio:1;border-radius:4px;display:flex;align-items:center;justify-content:center;font:10px var(--f-mono);background:${is ? 'var(--accent)' : 'var(--surface-2)'};color:${is ? 'var(--surface)' : 'var(--ink-3)'};border:1px solid ${u === 42 ? 'var(--ink)' : 'var(--line)'}">${u}</span>`; }
        $('.ff-g').innerHTML = cells;
        $('.ff-n').textContent = on + ' / 100';
        const b42 = hash(flag + ':42') % 100;
        $('.ff-b').textContent = b42 + (b42 < p && !kill ? ' (ON)' : ' (OFF)');
        $('.ff-note').textContent = kill ? 'Kill switch: one click, and the feature is off for everyone. Same code, no deploy.'
          : `Rollout ${p}%: ${on} users ON (it depends on the hash, so not exactly ${p}, but close to ${p}% with big numbers). Move the slider up: users who were ON stay ON, because their bucket does not change. Pick the other flag: different users are ON, so the same unlucky users are not caught in every experiment.`;
      };
      el.querySelectorAll('.ff-f .chip').forEach(b => b.addEventListener('click', () => { flag = b.dataset.f; el.querySelectorAll('.ff-f .chip').forEach(x => x.classList.toggle('on', x === b)); upd(); }));
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    } },
    { type: 'table', head: ['Kind of flag', 'How long it lives', 'xyz.com example'], rows: [
      ['Release flag', 'Days to weeks, until the feature is done', 'Shorts tab: first only employees, then 5% of users, then everyone'],
      ['Experiment flag', 'Until the experiment ends', 'A/B test: a new thumbnail design for 50% of users'],
      ['Ops flag / kill switch', 'Long', 'Under heavy load, turn "recommendations" off to save the site (graceful degradation)'],
      ['Permission flag', 'Long', '4K for premium users'],
    ], caption: 'Categories based on Pete Hodgson\'s article "Feature Toggles" (martinfowler.com).' },
    { type: 'list', items: [
      `<strong>Benefit</strong>: deploy every day, release when the business wants. Found a bug? Flag off: rollback without a deploy, in seconds. With trunk-based development, unfinished code can still be merged into the main branch.`,
      `<strong>Cost</strong>: every flag is one more <code>if</code> in the code and one more combination to test. If old flags are not removed, the code becomes a jungle (<em>flag debt</em>). Rule: when you create a release flag, also create the ticket to remove it.`,
    ]},
    { type: 'h3', text: 'Database schema migrations without downtime' },
    { type: 'p', html: `The product team wants the <code>users.name</code> column renamed to <code>display_name</code>. It is one line of SQL. But during a rolling or canary deploy <strong>the old and new code run at the same time</strong>, and both read the same database. The schema change must work with both versions. Run it and see:` },
    { type: 'callout', tone: 'term', title: 'New word: Schema migration', html: `<strong>What it is:</strong> a versioned script that changes the database structure (add a column, remove one, build an index), run together with a deploy. Tools: Flyway, Liquibase, Rails/Django migrations.<br><strong>Why to be careful:</strong> code can be rolled back in seconds, a schema cannot.<br><strong>Zero-downtime</strong> means: the site keeps running during the migration and no version breaks.` },
    { type: 'flow', height: 350,
      nodes: [
        { id: 'u', label: 'Users', x: 70, y: 170, w: 110, kind: 'client', info: 'What it is: xyz.com\'s users. Their requests go through the Load Balancer to both v1 and v2 servers, because a deploy is in progress.' },
        { id: 'v1', label: 'Servers v1', sub: 'reads: name', x: 290, y: 75, w: 160, kind: 'server', info: 'What it is: servers with the old code (v1). They only know the name column. In a rolling deploy they keep running for many minutes (for hours in a canary), and they run again after a rollback.' },
        { id: 'v2', label: 'Servers v2', sub: 'new code', x: 290, y: 265, w: 160, kind: 'server', hidden: true, info: 'What it is: servers with the new code (v2). Done right, they write to both columns and read display_name (falling back to name if it is empty).' },
        { id: 'db', label: 'Users DB', sub: 'column: name', x: 590, y: 170, w: 180, kind: 'data', info: 'What it is: the database with the users table, used by both versions. Code rolls back in seconds; a schema does not.' },
        { id: 'job', label: 'Migration job', sub: 'schema + backfill', x: 590, y: 300, w: 180, kind: 'queue', info: 'What it is: the process that runs the schema change and the backfill (copying data into old rows). The backfill runs in small batches with pauses, so the DB is not overloaded.' },
      ],
      edges: [{ a: 'u', b: 'v1' }, { a: 'u', b: 'v2', id: 'uv2', hidden: true }, { a: 'v1', b: 'db' }, { a: 'v2', b: 'db', id: 'v2db', hidden: true }, { a: 'job', b: 'db' }],
      scenarios: [
        { name: 'Wrong: rename in one go', steps: [
          { title: 'All normal', text: 'All servers are v1 and read the name column.', go: ['u>v1>db', 'res:db>v1>u'], msg: 'SELECT name FROM users WHERE id = 42' },
          { title: 'v2 deploy starts, migration runs', text: 'The migration ran with v2: it renamed the column. The rolling deploy is only at 25%, so 75% of servers are still v1.', show: ['v2', 'uv2', 'v2db'], go: 'job>db', after: { db: { state: 'warn', sub: 'column: display_name' } }, msg: 'ALTER TABLE users RENAME COLUMN name TO display_name;' },
          { title: 'v1 servers break', text: 'v1 still asks for <code>name</code>. That column no longer exists. 500 errors on 75% of requests.', go: ['u>v1>db', 'bad:db>v1>u'], after: { v1: { state: 'down', sub: '500: no column' } }, msg: 'ERROR: column "name" does not exist' },
          { title: 'Rollback does not save you either', text: 'The code was taken back to v1. But v1 needs <code>name</code>, and the DB now has <code>display_name</code>. Now every server is broken. The code was rolled back, the schema was not.', set: { v2: { state: 'down', sub: 'rollback → v1' } }, go: ['u>v1>db', 'bad:db>v1>u'], focus: ['db'] },
        ]},
        { name: 'Right: expand → migrate → contract', steps: [
          { title: 'Expand: add the new column', text: 'Only add; do not remove or change anything. Adding a nullable column is usually fast. v1 does not care about this column and keeps running.', go: 'job>db', after: { db: { state: 'ok', sub: 'name + display_name' } }, msg: 'ALTER TABLE users ADD COLUMN display_name TEXT NULL;' },
          { title: 'Deploy v2: write to both', text: 'v2 writes <em>both</em> columns on every write, and reads display_name, falling back to name if it is empty. v1 and v2 can run together. Bug in v2? Rolling back to v1 is safe, because the name column is alive and up to date.', show: ['v2', 'uv2', 'v2db'], go: ['u>v2>db', 'res:db>v2>u'], after: { v2: { state: 'ok', sub: 'writes: both' } }, msg: 'UPDATE users SET name = $1, display_name = $1 WHERE id = 42' },
          { title: 'Migrate: backfill old rows', text: 'Old rows have an empty display_name. The job fills them in batches of 1,000, pausing in between, so the DB is not overloaded and no long locks happen.', go: ['job>db', 'res:db>job', 'job>db'], after: { db: { sub: 'backfill 100%' } }, msg: 'UPDATE users SET display_name = name WHERE display_name IS NULL AND id BETWEEN 1 AND 1000;' },
          { title: 'Use only the new column', text: 'All servers are now on v2 (v1 retired). The next deploy (v3) reads and writes only display_name. Now nobody touches the name column.', set: { v1: { state: 'dim', sub: 'retired' } }, go: ['u>v2>db', 'res:db>v2>u'], after: { v2: { sub: 'v3: display_name' } } },
          { title: 'Contract: remove the old column', text: 'Wait a few days (no rollback needed, no report or other service reads name), then drop it. The site ran at every step, and a rollback was possible at every step.', go: 'job>db', after: { db: { sub: 'display_name only' } }, msg: 'ALTER TABLE users DROP COLUMN name;' },
        ]},
      ],
    },
    { type: 'p', html: `This pattern is called <strong>expand-contract</strong> or <strong>parallel change</strong>: first add the new path, move everyone onto it slowly, then remove the old one. A few more rules:` },
    { type: 'list', items: [
      `<strong>Be careful with big tables</strong>: some ALTER commands lock or rewrite the whole table, and on hundreds of millions of rows writes stop for minutes. In Postgres build indexes with <code>CREATE INDEX CONCURRENTLY</code>; in MySQL, online tools like gh-ost or pt-online-schema-change are used.`,
      `<strong>Deploy code and schema separately</strong>: first the schema expand (backward compatible), then the code. Never migration and code in one go.`,
      `<strong>Removing an index is also a migration</strong>: this is exactly why the Recs DB query got slow in the trace widget: some migration removed an "unused" index. Check the query logs before any destructive change.`,
    ]},
    { type: 'h2', text: 'Security: data, keys and permissions' },
    { type: 'p', html: `xyz.com is big now: emails, watch history and payments of tens of millions of users. Security is not one feature; it is a habit at every layer. In system design, five things must always be mentioned:` },
    { type: 'h3', text: 'Encryption in transit: TLS everywhere' },
    { type: 'p', html: `We saw in the "TCP, UDP and HTTPS" lesson: <strong>TLS</strong> encrypts data travelling over the network, so nobody on the way (cafe Wi-Fi, a router in between) can read or change it. HTTPS between the browser and xyz.com is obvious. But what about the internal network?` },
    { type: 'callout', tone: 'term', title: 'New words: TLS, mTLS, zero trust', html: `<strong>TLS:</strong> locking data that travels over the network (encrypting it), so nobody on the way can read or change it. HTTPS = HTTP + TLS.<br><strong>mTLS (mutual TLS):</strong> both sides show a certificate (a digital ID card), not only the server. So the Video service knows for sure that a call really came from the Recs service.<br><strong>Zero trust:</strong> "do not treat even the internal network as safe"; identity and encryption on every call.<br><strong>Without it:</strong> if one server is hacked, the attacker can read all internal traffic and make calls pretending to be a service.` },
    { type: 'list', items: [
      `The old thinking: "the internal network is safe, TLS only outside." The problem: if even one server is hacked, the attacker can read all internal traffic.`,
      `Today's thinking (<strong>zero trust</strong>): encrypt inside too. Between services use <strong>mTLS</strong> (mutual TLS): both sides show a certificate, so the Video service knows for sure that a call really came from the Recs service. A service mesh (Istio, Linkerd) creates and rotates these certificates automatically.`,
      `TLS is often "terminated" (decrypted) at the Load Balancer/gateway, then encrypted again before going inside. Write clearly in the design where it is terminated.`,
    ]},
    { type: 'h3', text: 'Encryption at rest' },
    { type: 'p', html: `Data sitting on disk: database files, backups, videos in S3. Even if someone steals a disk, a backup accidentally goes into a public bucket, or an old hard disk from the data center is sold without wiping, the data should look useless. In the cloud this is almost one checkbox (RDS, S3, EBS encryption), and it should be on.` },
    { type: 'callout', tone: 'term', title: 'New word: Encryption at rest', html: `<strong>What it is:</strong> keeping data that sits on disk (DB files, backups, videos in S3) encrypted.<br><strong>Why we need it:</strong> if a disk is stolen, a backup accidentally goes public, or an old hard disk is sold without wiping, the data still looks like useless garbage.<br><strong>Without it:</strong> whoever gets the file gets the data.` },
    { type: 'callout', tone: 'term', title: 'New words: KMS and envelope encryption', html: `<strong>What it is:</strong> data is encrypted with a <strong>data key</strong>. The data key is encrypted with a <strong>master key</strong> and stored right next to the data. The master key never leaves; it stays inside a <strong>KMS</strong> (Key Management Service, like AWS KMS or Google Cloud KMS), protected by hardware. This is called <strong>envelope encryption</strong>: one more lock on top of the envelope (the data key).<br><strong>Why we need it:</strong> to decrypt, you ask the KMS to "open" the data key, and every such call is logged. Who read what and when is all on record.<br><strong>Without it:</strong> the key would sit right next to the data, like a key hanging on its own lock.` },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion', html: `Encryption at rest <strong>does not protect against a hacker who came in through your app</strong>. The app has the key; it decrypts the data to show it anyway. It protects against stolen disks, wrong backups and risks inside the cloud provider. For app-level attacks you need authZ, least privilege and input validation. And passwords are not encrypted but <em>hashed</em> (bcrypt/argon2), as we saw in the auth lesson.` },
    { type: 'h3', text: 'Secrets management' },
    { type: 'callout', tone: 'term', title: 'New word: Secret', html: `<strong>What it is:</strong> anything that would let an attacker into your system if they found it: DB password, API keys (payment gateway, email service), JWT signing key, TLS private key, cloud access keys.<br><strong>Why handle it carefully:</strong> one leaked secret = the key in the attacker's hand.<br>A <strong>secrets manager</strong> (Vault, AWS Secrets Manager) is their safe: encrypted, with an identity check and an audit log on every read.` },
    { type: 'p', html: `The most common mistake: writing a secret in code or in a config file and committing it to Git. Git history never forgets; delete the file later and the secret still lives in an old commit. In public repos, bots find leaked keys within minutes. Run it and see:` },
    { type: 'flow', height: 320,
      nodes: [
        { id: 'dev', label: 'Developer', x: 85, y: 60, w: 130, kind: 'client', info: 'What it is: an xyz.com engineer. Not out of bad intent, but in a hurry, they write the secret into the code: "just for now, I will fix it later".' },
        { id: 'git', label: 'Git repo', sub: 'code + history', x: 300, y: 60, w: 150, kind: 'data', info: 'What it is: the place where all the code and its whole history live. Many people, CI systems, laptops, and sometimes it accidentally becomes public. The wrong place for secrets.' },
        { id: 'att', label: 'Attacker', x: 560, y: 60, w: 140, kind: 'threat', info: 'What it is: a thief from outside. Their bots keep searching public repos, paste sites and leaked logs for keys.' },
        { id: 'vault', label: 'Vault', sub: 'secrets manager', x: 330, y: 178, w: 150, kind: 'edge', info: 'What it is: the safe for secrets: HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager. Every secret is encrypted (with KMS), every read has an identity check and an audit log. It can also create some secrets "dynamically": a separate DB user for each app, valid for a short time.' },
        { id: 'app', label: 'Video service', x: 100, y: 268, w: 150, kind: 'server', info: 'What it is: an xyz.com service that needs the DB password. Done right, it shows Vault its identity (a Kubernetes service account or cloud IAM role) and gets the secret; there is no password in the code.' },
        { id: 'db', label: 'Videos DB', x: 590, y: 268, w: 150, kind: 'data', info: 'What it is: the real videos data. It should normally not be reachable straight from the internet (private network), but that is only one layer; a password leak is still dangerous.' },
      ],
      edges: [{ a: 'dev', b: 'git' }, { a: 'git', b: 'att' }, { a: 'git', b: 'app' }, { a: 'app', b: 'vault' }, { a: 'vault', b: 'db' }, { a: 'app', b: 'db' }, { a: 'att', b: 'db' }],
      scenarios: [
        { name: 'Wrong: secret in code', steps: [
          { title: 'Password committed', text: 'The DB password was written into a config file and committed. It worked.', go: 'dev>git', after: { git: { state: 'warn', sub: 'DB_PASSWORD inside!' } }, msg: 'config.yml:  db_password: "xyz@2024"' },
          { title: 'App deployed', text: 'The same code was built into the app. The app always uses one password that never changes.', go: ['git>app', 'app>db', 'res:db>app'] },
          { title: 'Repo leaks', text: 'One day the repo accidentally became public (or was copied from an old laptop). A bot caught the password within minutes. Even if you delete the file later, it lives on in Git history.', go: 'bad:git>att', set: { att: { state: 'hot', sub: 'got the password' } } },
          { title: 'Straight to the DB', text: 'If the DB is reachable by any path, the attacker logs in like the app: all the data. And changing the password = change the code and redeploy everywhere.', go: 'bad:att>db', after: { db: { state: 'down', sub: 'data stolen' } } },
        ]},
        { name: 'Right: short-lived secret from Vault', steps: [
          { title: 'The app shows its identity', text: 'No password in the code. When the app starts, it gives Vault its platform identity (like a Kubernetes service account token). Vault checks the policy: video-service may only take the <code>db/videos</code> secret.', go: 'app>vault', set: { git: { sub: 'no secrets' } }, msg: 'POST /v1/auth/kubernetes/login { role: "video-service", jwt: <service account token> }' },
          { title: 'Vault creates a temporary DB user', text: '<strong>Dynamic secret</strong>: a separate username/password for this app instance, valid for only 1 hour.', go: 'vault>db', after: { db: { sub: 'user v-video-8f2 (1 h)' } } },
          { title: 'The app gets the secret', text: 'Kept only in memory, not on disk or in logs. Before the hour ends, the app gets a new one (automatic rotation).', go: 'res:vault>app', after: { vault: { sub: 'audit: video-svc' } }, msg: '{ username: "v-video-8f2", password: "…", lease_duration: 3600 }' },
          { title: 'Talk to the DB, over TLS', text: 'Everything runs normally, and every secret read is written in Vault\'s audit log.', go: ['app>db', 'res:db>app'], after: { app: { state: 'ok' } } },
        ]},
        { name: 'A leak happened, now what?', intro: 'Because of a bug, the app printed the DB credentials in an error log, and the logs reached the wrong place.', steps: [
          { title: 'The attacker has the creds', text: 'This happens. The question is how big the damage will be.', set: { att: { state: 'hot', sub: 'creds from a log' }, db: { sub: 'user v-video-8f2' } }, focus: ['att'] },
          { title: 'Revoke at once', text: 'The security team revokes that lease in Vault; Vault removes that user from the DB. The app gets a new secret, no redeploy. (Even doing nothing, it would expire by itself within 1 hour.)', go: 'vault>db', after: { db: { state: 'ok', sub: 'v-video-8f2 deleted' } } },
          { title: 'The attacker\'s login fails', text: 'There was a leak, but the key no longer fits any lock. And the audit log shows when, which secret, and who took it.', go: ['att>db', 'bad:db>att'], after: { att: { state: 'down', sub: 'auth failed' } } },
        ]},
      ],
    },
    { type: 'list', items: [
      `<strong>Never in code or Git</strong>: in a secrets manager, or at least from environment variables/mounted files at deploy time. Add secret-scanning tools on Git (pre-commit hooks, GitHub secret scanning).`,
      `<strong>Short-lived and rotated</strong>: a secret that expires in 1 hour means a leak does 1 hour of damage. One that never changes means damage forever.`,
      `<strong>A separate secret per service</strong>: if one leaks, only that one door opens, not all of them.`,
    ]},
    { type: 'h3', text: 'RBAC and least privilege' },
    { type: 'callout', tone: 'term', title: 'New words: RBAC and least privilege', html: `<strong>RBAC (Role-Based Access Control):</strong> give permissions not directly to people but to <em>roles</em> ("video-service", "on-call engineer"), then give people/services a role.<br><strong>Least privilege:</strong> every person and service gets only as much permission as the job needs, for only as long as needed.<br><strong>Why we need it:</strong> if one thing is hacked, the damage (blast radius) stays small.<br><strong>Without it:</strong> one hacked service = the whole database.` },
    { type: 'p', html: `In the auth lesson we saw RBAC for users (user, moderator, admin). The same idea applies to the people inside the company and to <em>services</em>. The <strong>least privilege</strong> rule: every person and every service gets only the permission its work needs, for only as long as needed.` },
    { type: 'table', head: ['Who', 'Wrong (too much permission)', 'Right (least privilege)'], rows: [
      ['Video service', 'The DB admin user, all tables', 'Read/write only on the <code>videos</code> tables, no DROP'],
      ['Recs service', 'Access to all S3 buckets', 'Only the <code>recs-models</code> bucket, read-only'],
      ['New engineer', 'Direct access to the production DB, always', 'Access to staging; production only when needed, with approval, for a few hours ("just-in-time")'],
      ['CI/CD pipeline', 'The cloud account root key', 'Only a role that can deploy, separate for each environment'],
    ]},
    { type: 'p', html: `Benefit: if one service or one laptop is hacked, the <strong>blast radius</strong> is small. Even if the Recs service is hacked, the attacker cannot read the payments table.` },
    { type: 'h3', text: 'Audit logs' },
    { type: 'p', html: `An <strong>audit log</strong> is a record of "who did what, and when": who banned a user from the admin panel, who got access to the production DB, who changed a permission, who read a secret. It is different from normal debugging logs: it must be <strong>append-only</strong> (nobody can edit or delete it, not even an admin), kept in a separate account/storage, and kept for a long time (months to years, depending on compliance). When something goes wrong, the first question is: "who did this?". No audit log, no answer.` },
    { type: 'callout', tone: 'warn', title: 'Do not put secrets or personal data in logs', html: `Observability and security clash here. The habit of logging request bodies sends passwords, OTPs, card numbers and tokens into the logs, and many people can read logs. Mask/redact sensitive fields in the logging library.` },
    { type: 'p', html: `Now put all five together. Below are 8 real threats to xyz.com. Turn controls on/off and see which control protects against which threat, and which it does <em>not</em>:` },
    { type: 'custom', render(el) {
      const C = [['tls', 'TLS outside (HTTPS)'], ['mtls', 'mTLS inside'], ['rest', 'Encryption at rest'], ['vault', 'Secrets manager'], ['lp', 'Least privilege'], ['audit', 'Audit logs']];
      const T = [
        ['Someone on cafe Wi-Fi reads a user password', 'tls', 'Outside traffic is encrypted: the sniffer sees only garbage.'],
        ['A hacked server listens to internal traffic', 'mtls', 'Encryption inside too: even with the traffic it can read nothing.'],
        ['A fake service calls Payments', 'mtls', 'Payments asks for a certificate; the fake one does not have the right certificate.'],
        ['An old disk or backup falls into the wrong hands', 'rest', 'Data on disk is encrypted and the key is in KMS: they got the file, not the data.'],
        ['Git repo leaks with a DB password inside', 'vault', 'There was no password in the code; secrets are short-lived.'],
        ['Recs service hacked, tries to read the payments table', 'lp', 'The Recs role has no permission on the payments table.'],
        ['Someone deleted users from the admin panel: who?', 'audit', 'The append-only audit log has the name, time and action. (It does not stop it, it catches it.)'],
        ['Data stolen through an app bug (SQL injection)', null, 'No single control fully protects: the app has both the key and the permission. Least privilege makes the damage smaller; the real fix is input validation and code review.'],
      ];
      let on = { tls: 1 };
      el.innerHTML = `<div class="chips sc-c" role="group" aria-label="Controls"></div><div class="sc-t" style="display:flex;flex-direction:column;gap:6px;margin-top:10px"></div>
        <div class="stats"><div class="stat"><span>Threats blocked</span><strong class="sc-n"></strong></div></div><div class="calc-note sc-note"></div>`;
      const $ = c => el.querySelector(c);
      const upd = () => {
        $('.sc-c').innerHTML = C.map(([k, n]) => `<button type="button" class="chip${on[k] ? ' on' : ''}" data-k="${k}">${n}</button>`).join('');
        el.querySelectorAll('.sc-c .chip').forEach(b => b.onclick = () => { on[b.dataset.k] = !on[b.dataset.k]; upd(); });
        let n = 0;
        $('.sc-t').innerHTML = T.map(([t, k, why]) => {
          const safe = k ? !!on[k] : false, part = !k && on.lp; if (safe) n++;
          const col = safe ? 'var(--green)' : part ? 'var(--amber)' : 'var(--red)';
          return `<div style="border:1px solid var(--line);border-left:4px solid ${col};border-radius:var(--r-sm);padding:6px 10px;font-size:14px"><strong style="color:var(--ink)">${t}</strong><br><span style="color:var(--ink-2)">${safe ? '✓ ' + why : part ? '~ ' + why : k ? '✗ Control that would protect: ' + C.find(c => c[0] === k)[1] : '✗ ' + why}</span></div>`;
        }).join('');
        $('.sc-n').textContent = n + ' / 8';
        $('.sc-note').textContent = n === 7 ? 'All controls on: 7 of 8 threats blocked. The last one (the app bug) reminds us that security comes in layers; no single checkbox is enough.' : 'Each control is for a different threat. Encryption at rest does not protect against Wi-Fi sniffing, and TLS does not protect a stolen disk. That is why you need all of them.';
      };
      upd();
    } },
    { type: 'h2', text: 'Multi-region and disaster recovery' },
    { type: 'p', html: `In the Availability lesson we saw AZs: if one data center falls, another takes over. But a <em>whole region</em> can go down (a big network or power problem), or, more commonly: an engineer accidentally deletes a production table, or ransomware encrypts the data. The plan to survive these is called <strong>disaster recovery (DR)</strong>. The plan starts with two numbers:` },
    { type: 'callout', tone: 'term', title: 'New word: Disaster recovery (DR)', html: `<strong>What it is:</strong> a plan written in advance for bringing the system back after a big accident (region down, data deleted by mistake, ransomware), plus the things kept ready for it (backups, a setup in another region).<br><strong>Why we need it:</strong> during the accident there is no time to think.<br><strong>Without it:</strong> hours are lost on "where is the backup? who has the password?".` },
    { type: 'callout', tone: 'term', title: 'New words: RPO and RTO', html: `<strong>RPO (Recovery Point Objective):</strong> after a disaster, <em>how much data you can afford to lose</em>, measured in time. RPO 1 hour = "losing the last 1 hour of data is acceptable." Like how old a game's last save point may be.<br><strong>RTO (Recovery Time Objective):</strong> <em>how long you can afford to be down</em>. RTO 15 minutes = "we must be running again within 15 minutes."<br><strong>Who decides:</strong> the business decides both; engineers pick a strategy to match. The smaller the RPO/RTO, the more expensive the setup.` },
    { type: 'ascii', text: `
 last backup /           DISASTER            running again
 replication point          │                     │
──────●─────────────────────✖─────────────────────●──────▶ time
      │←──── data loss ────→│←──── downtime ─────→│
            (no bigger               (no bigger
            than RPO)                than RTO)` },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: replication is not a backup', html: `"We have a replica, so why do we need backups?" A replica copies <em>every</em> change, including wrong ones. If someone runs <code>DELETE FROM users</code>, it disappears from the replica within a second too. So you need replication (for hardware/region failure) <strong>and</strong> point-in-time backups (for mistakes, corruption, ransomware). And keep backups in a separate account/region, so whatever breaks production cannot touch the backups.` },
    { type: 'h3', text: 'Four DR strategies (categories from the AWS whitepaper)' },
    { type: 'p', html: `AWS's disaster recovery whitepaper puts strategies on four steps, from cheap and slow to expensive and fast. Its chart shows RPO/RTO like this: backup &amp; restore <strong>hours</strong>, pilot light <strong>tens of minutes</strong>, warm standby <strong>minutes</strong>, multi-site active/active <strong>near real-time</strong>. Choose a strategy below and see what keeps running in the other region, then enter your RPO/RTO needs to find the cheapest strategy that fits:` },
    { type: 'custom', render(el) {
      const S = {
        br: { n: 'Backup & restore', cat: 'hours', rpo: 3600, rto: 4 * 3600, cost: 'Lowest (backup storage only)', dr: [['Backups', 1], ['Database', 0], ['App servers', 0], ['Load Balancer', 0]], how: 'The other region has only backups (DB snapshots, S3 copies) and infrastructure-as-code. On disaster, build the whole setup, restore the backup, switch DNS.', rpoTxt: 'data up to the last backup (here we assume hourly snapshots)' },
        pl: { n: 'Pilot light', cat: 'tens of minutes', rpo: 5, rto: 30 * 60, cost: 'Low-medium', dr: [['Backups', 1], ['Database', 1], ['App servers', 0], ['Load Balancer', 0]], how: 'Data is always replicated live (the DB replica is running). App servers are configured but off. On disaster, start the servers, scale up, switch traffic.', rpoTxt: 'async replication lag, usually seconds' },
        ws: { n: 'Warm standby', cat: 'minutes', rpo: 5, rto: 5 * 60, cost: 'High', dr: [['Backups', 1], ['Database', 1], ['App servers', 2], ['Load Balancer', 1]], how: 'The whole system runs at a small size and can take requests. On disaster, just scale up and switch traffic.', rpoTxt: 'async replication lag, usually seconds' },
        aa: { n: 'Multi-site active/active', cat: 'near real-time', rpo: 1, rto: 30, cost: 'Highest (~2 full regions + complexity)', dr: [['Backups', 1], ['Database', 1], ['App servers', 1], ['Load Balancer', 1]], how: 'Both regions take live traffic at full size. If one falls, health checks send traffic to the other; there is no "failover" step. But you must handle write conflicts between the two regions.', rpoTxt: 'async lag (~a second); synchronous replication for zero' },
      };
      const ORDER = ['br', 'pl', 'ws', 'aa'];
      const RPO_OPT = [[0, 'Zero (lose not a single write)'], [60, '1 minute'], [900, '15 minutes'], [3600, '1 hour'], [86400, '24 hours']];
      const RTO_OPT = [[60, '1 minute'], [600, '10 minutes'], [3600, '1 hour'], [4 * 3600, '4 hours'], [86400, '24 hours']];
      const fmt = s => s < 60 ? '~' + s + ' s' : s < 3600 ? '~' + Math.round(s / 60) + ' min' : (s === 3600 ? '~1 hour' : '~' + (s / 3600).toFixed(s % 3600 ? 1 : 0) + ' hours');
      el.innerHTML = `<div class="op-dr-s" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:12px">
          <div style="flex:1 1 220px;border:1px solid var(--line);border-radius:var(--r);padding:10px"><div style="font:600 13px var(--f-mono);color:var(--ink-3);margin-bottom:6px">PRIMARY REGION (Mumbai)</div><div class="op-dr-p" style="display:flex;flex-wrap:wrap;gap:6px"></div></div>
          <div style="flex:1 1 220px;border:1px solid var(--line);border-radius:var(--r);padding:10px"><div style="font:600 13px var(--f-mono);color:var(--ink-3);margin-bottom:6px">DR REGION (Singapore)</div><div class="op-dr-d" style="display:flex;flex-wrap:wrap;gap:6px"></div></div>
        </div>
        <div class="op-dr-how calc-note"></div>
        <label style="display:block;margin-top:12px">The disaster happened <strong class="op-dr-tv"></strong> minutes after the last hourly backup</label><input class="op-dr-t" type="range" min="0" max="59" step="1" value="47">
        <div class="stats">
          <div class="stat"><span>Data loss (RPO)</span><strong class="op-dr-rpo"></strong></div>
          <div class="stat"><span>Downtime (RTO)</span><strong class="op-dr-rto"></strong></div>
          <div class="stat"><span>AWS category</span><strong class="op-dr-cat"></strong></div>
          <div class="stat"><span>Cost</span><strong class="op-dr-cost" style="font-size:16px"></strong></div>
        </div>
        <div style="margin-top:18px;padding-top:12px;border-top:1px dashed var(--line);font-weight:600">Pick a strategy from the business need</div>
        <div class="row2">
          <div><label>Max data loss (RPO): <strong class="op-dr-qrv"></strong></label><input class="op-dr-qr" type="range" min="0" max="4" step="1" value="2"></div>
          <div><label>Max downtime (RTO): <strong class="op-dr-qtv"></strong></label><input class="op-dr-qt" type="range" min="0" max="4" step="1" value="2"></div>
        </div>
        <div class="op-dr-rec calc-note" style="font-size:15.5px"></div>
        <div class="calc-note" style="font-size:13.5px">The RPO/RTO here are rough example numbers inside each category (backup &amp; restore ~4 hours, pilot light ~30 min, warm standby ~5 min, active/active ~30 s); real numbers depend on your data size, automation and testing.</div>`;
      let cur = 'pl';
      const box = (name, st) => `<span style="flex:1 1 90px;text-align:center;padding:6px 4px;border-radius:var(--r-sm);font-size:13px;border:1.5px ${st ? 'solid' : 'dashed'} ${st ? 'var(--green)' : 'var(--line-2)'};background:${st ? 'var(--surface)' : 'transparent'};color:${st ? 'var(--ink)' : 'var(--ink-3)'}">${name}${st === 2 ? ' (small)' : st ? '' : ' (off)'}</span>`;
      const pick = (rpo, rto) => ORDER.find(k => S[k].rpo <= rpo && S[k].rto <= rto);
      const draw = () => {
        const s = S[cur], t = Number(el.querySelector('.op-dr-t').value);
        const sb = el.querySelector('.op-dr-s'); sb.innerHTML = '';
        ORDER.forEach(k => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (k === cur ? ' on' : ''); b.textContent = S[k].n; b.onclick = () => { cur = k; draw(); }; sb.appendChild(b); });
        el.querySelector('.op-dr-p').innerHTML = [['Backups', 1], ['Database', 1], ['App servers', 1], ['Load Balancer', 1]].map(([n, v]) => box(n, v)).join('');
        el.querySelector('.op-dr-d').innerHTML = s.dr.map(([n, v]) => box(n, v)).join('');
        el.querySelector('.op-dr-how').textContent = s.how;
        el.querySelector('.op-dr-tv').textContent = t;
        el.querySelector('.op-dr-rpo').textContent = cur === 'br' ? (t ? t + ' min' : '~0 (backup just happened)') : fmt(s.rpo);
        el.querySelector('.op-dr-rto').textContent = fmt(s.rto);
        el.querySelector('.op-dr-cat').textContent = s.cat;
        el.querySelector('.op-dr-cost').textContent = s.cost;
        const qr = RPO_OPT[el.querySelector('.op-dr-qr').value], qt = RTO_OPT[el.querySelector('.op-dr-qt').value];
        el.querySelector('.op-dr-qrv').textContent = qr[1];
        el.querySelector('.op-dr-qtv').textContent = qt[1];
        const k = pick(qr[0], qt[0]);
        el.querySelector('.op-dr-rec').innerHTML = k
          ? `The cheapest strategy that fits both: <strong>${S[k].n}</strong> (RPO ${fmt(S[k].rpo)}, RTO ${fmt(S[k].rto)}).`
          : `No async strategy fits. Zero data loss needs <strong>synchronous replication</strong>: each write is "done" only after the other place confirms it. If the region is far away, each write gets ~tens of ms of extra latency. So "zero" is chosen for very few systems (like a payments ledger).`;
      };
      ['.op-dr-t', '.op-dr-qr', '.op-dr-qt'].forEach(c => el.querySelector(c).addEventListener('input', draw));
      draw();
    } },
    { type: 'p', html: `Example: with RPO 15 minutes and RTO 1 hour you get <strong>pilot light</strong>. Make the RTO 10 minutes and you get <strong>warm standby</strong>; make it 1 minute and you get <strong>active/active</strong>. If RPO 1 hour and RTO 4 hours are fine, the cheap <strong>backup &amp; restore</strong> is enough. And with RPO "zero" no async strategy fits.` },
    { type: 'list', items: [
      `<strong>Not every system needs the same tier</strong>: on xyz.com, video playback and login go on warm standby/active-active, but analytics reports and admin tools on backup &amp; restore. Tiering saves money.`,
      `<strong>The real pain of active/active is data</strong>: if the same user's data changes in two regions at once, who wins? Common paths: all writes in one region ("write global"), or a "home region" for each user (partition by user), or a conflict rule like last-writer-wins. The replication and consistency lessons help here.`,
      `<strong>Switching traffic</strong>: with DNS (with health checks) or a global load balancer/anycast. If the DNS TTL is long, clients remember the old address, so failover records get a short TTL.`,
    ]},
    { type: 'h3', text: 'Failover drills: what is not tested will not work' },
    { type: 'p', html: `The biggest DR lie: "we have backups". Have you ever restored one? How long did it take? Who has the password for the restore? That is why teams run regular <strong>DR drills</strong> (or game days): at a planned time, really treat one region as "down" and fail over, or restore a backup into a new environment and measure the time. An RTO that was 30 minutes on paper often turns out to be 3 hours in a drill, and that is the lesson. The AWS whitepaper says the same: automate the failover steps so that even if the trigger is manual, it is like one button, and test regularly.` },
    { type: 'callout', tone: 'tip', title: 'Automatic or manual failover?', html: `A whole-region failover brings data loss (RPO &gt; 0) and some downtime. An automatic failover on a false alarm can become an outage itself. So many teams keep region-level failover as a <strong>human decision</strong>, but with the steps fully automated (one command/button). Small things (one server, one AZ) fail over automatically.` },
    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `The roadmap's message: a design is not complete until you can <strong>see</strong> it, <strong>ship it safely</strong> and <strong>secure</strong> it. At the end of every design, spend 2 minutes saying: <strong>(1)</strong> a trace ID on every request, RED metrics, and an SLO on a user-facing SLI with burn-rate alerts; <strong>(2)</strong> canary (or rolling) deploys with automatic rollback, risky features behind flags, and schema changes as expand → migrate → contract; <strong>(3)</strong> TLS everywhere, encryption at rest, secrets in a vault, least-privilege roles, audit logs; <strong>(4)</strong> a DR strategy from the business's RPO/RTO, and drills for it.` },
    { type: 'table', head: ['Situation', 'Choice'], rows: [
      ['"Which service is slow?"', 'Distributed tracing + correlation/trace ID (OpenTelemetry)'],
      ['"When do we wake someone?"', 'Symptom-based, multi-window burn-rate alerts on the SLO; everything else is a ticket'],
      ['Small team, small traffic', 'Rolling deploy + health checks + feature flags'],
      ['Big traffic, user-facing, risky change', 'Canary with automatic metric analysis and rollback'],
      ['Need instant rollback, can afford 2x infra', 'Blue-green'],
      ['Rename/remove a column, split a table', 'Expand → migrate (dual write + backfill) → contract'],
      ['Any password/API key', 'Secrets manager, short-lived, per service, never in Git'],
      ['RPO/RTO: hours', 'Backup &amp; restore (cross-region backups, tested restores)'],
      ['RPO seconds, RTO ~tens of minutes / minutes', 'Pilot light / warm standby'],
      ['RTO ~0, revenue-critical', 'Multi-site active/active (and a plan for conflict handling)'],
    ]},
    { type: 'diagram', title: 'Running xyz.com: the whole picture', height: 610,
      nodes: [
        { id: 'users', label: 'Users', sub: 'app + website', x: 360, y: 50, w: 160, kind: 'client', info: 'What it is: xyz.com\'s users. Every request comes over HTTPS (TLS), so nobody on the way can read it.' },
        { id: 'lb', label: 'Gateway + LB', sub: 'TLS, trace ID', x: 360, y: 160, w: 180, kind: 'edge', info: 'What it is: the first door. TLS is opened here, every request gets a trace ID, and traffic is split 99% / 1% for the canary.' },
        { id: 'v1', label: 'Video svc v1', sub: '99% traffic', x: 130, y: 280, w: 160, kind: 'server', info: 'What it is: the old, trusted version. Most traffic goes here. If the canary fails, all traffic comes back here.' },
        { id: 'v2', label: 'Video svc v2', sub: 'canary 1%', x: 360, y: 280, w: 160, kind: 'server', info: 'What it is: the new version, on only 1% of traffic. Its metrics are compared with v1; if they get worse, automatic rollback.' },
        { id: 'flag', label: 'Flag service', sub: 'shorts_tab 10%', x: 600, y: 280, w: 150, kind: 'edge', info: 'What it is: the feature flag config. The code asks "is shorts_tab on for this user?"; on/off and % rollout without a deploy.' },
        { id: 'db', label: 'Videos DB', sub: 'encrypted at rest', x: 130, y: 400, w: 160, kind: 'data', info: 'What it is: the primary database in the Mumbai region. Disk encrypted (KMS key), a least-privilege user per service, schema changes by expand-contract.' },
        { id: 'vault', label: 'Vault + KMS', sub: 'secrets, keys', x: 360, y: 400, w: 160, kind: 'edge', info: 'What it is: the safe for secrets and the home of keys. Services show their identity and get a short-lived DB password; every read goes into the audit log.' },
        { id: 'otel', label: 'OTel collector', sub: 'logs/metrics/traces', x: 600, y: 400, w: 150, kind: 'queue', info: 'What it is: the process in between that collects logs, metrics and spans from every service. Sampling happens here, then it sends data to the backend.' },
        { id: 'obs', label: 'Observability', sub: 'SLO + burn alerts', x: 600, y: 520, w: 150, kind: 'data', info: 'What it is: dashboards, trace waterfalls, log search and SLO burn-rate alerts. If the canary gets worse, the rollback signal comes from here.' },
        { id: 'dr', label: 'DR region', sub: 'Singapore, warm', x: 130, y: 550, w: 160, kind: 'data', info: 'What it is: a warm standby in another region: an async DB replica and a small running setup. If Mumbai falls, scale up + switch traffic (RTO in minutes).' },
        { id: 'bak', label: 'Backups', sub: 'other account', x: 360, y: 550, w: 160, kind: 'data', info: 'What it is: point-in-time backups in a separate account. A replica also copies a wrong DELETE; a backup brings back the data from before it.' },
      ],
      edges: [
        { a: 'users', b: 'lb', n: 1, label: 'HTTPS' },
        { a: 'lb', b: 'v1', n: 2, label: '99%' },
        { a: 'lb', b: 'v2', label: '1% canary' },
        { a: 'v1', b: 'db', n: 3, label: 'mTLS' },
        { a: 'v2', b: 'db' },
        { a: 'v2', b: 'flag', label: 'isOn?' },
        { a: 'v2', b: 'vault', dashed: true, label: 'secret' },
        { a: 'v2', b: 'otel', kind: 'evt', label: 'spans' },
        { a: 'otel', b: 'obs', kind: 'evt' },
        { a: 'obs', b: 'lb', kind: 'bad', via: [[700, 520], [700, 160]] },
        { a: 'db', b: 'dr', kind: 'evt', label: 'replica' },
        { a: 'db', b: 'bak', kind: 'evt', label: 'snapshots' },
      ],
      paths: [
        { name: 'Request + trace', text: 'Over HTTPS to the gateway, a trace ID is created, and v1 gets data from the DB over mTLS.', go: ['users>lb>v1>db'] },
        { name: 'Canary rollback', text: '1% of traffic on v2; its spans and metrics go to observability; the SLO got worse, so the gateway set v2 traffic to 0%.', go: ['users>lb>v2>otel>obs', 'obs>lb'] },
        { name: 'Flag + secret', text: 'v2 asks the flag service whether the feature is on, and gets a short-lived DB password from Vault.', go: ['v2>flag', 'v2>vault'] },
        { name: 'Disaster', text: 'A DB replica in another region (for region failure) and backups in a separate account (for mistakes/ransomware).', go: ['db>dr', 'db>bak'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Logs = what happened (detail), metrics = how much/trend (cheap, alerts), traces = where the time went. All three are joined by the trace ID.</li>
      <li>No things like user_id in metric labels: every label multiplies the number of series (cardinality).</li>
      <li>SLI = a number for user happiness, SLO = the internal target, SLA = a contract (looser than the SLO). Error budget = 1 − SLO.</li>
      <li>Alert on symptoms, by burn rate (14.4x/1h page, 1x/3 days ticket); every alert actionable and with a runbook.</li>
      <li>Rolling = batches, blue-green = two environments + a switch, canary = a small % + automatic rollback. Feature flag = deploy and release are separate.</li>
      <li>Schema change: expand → migrate (dual write + backfill) → contract. Code can be rolled back, a schema cannot.</li>
      <li>Security comes in layers: TLS/mTLS, encryption at rest (KMS), secrets manager, least privilege, audit logs.</li>
      <li>RPO = how much data you can lose, RTO = how long you can be down. Replication is not a backup; only DR drills make the plan real.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['Problems are found in minutes (traces, metrics), not by guessing', 'Reliability and feature speed agree on one number (the error budget)', 'A bug has a small blast radius (canary 1%), rollback in seconds', 'Schema changes without downtime and without the rollback trap', 'The damage of a leak or hack is limited (short-lived secrets, least privilege, audit trail)', 'Even if a region falls, you are back within the RPO/RTO the business set'],
      costs: ['The observability bill: storing logs and traces often becomes a big cost (you must think about sampling and retention)', 'Canary/blue-green need good metrics, automation and sometimes 2x infra', 'Expand-contract turns one change into 3-5 deploys and days of time', 'Feature flags and a secrets manager: new systems that must themselves be highly available', 'The faster the DR strategy, the more expensive; active/active brings the complexity of data conflicts', 'Drills and on-call: people\'s time'] },
    { type: 'think', questions: [
      { q: 'The dashboard shows an average latency of 80 ms, all green. Still, support keeps getting "the app is slow" complaints. What will you look at?', a: 'The average hides the tail. Look at p99 (and p99.9), and break it down by endpoint/region/app version. Then open the trace of one slow request from the complaining users (by trace ID) and see which span is eating the time. The SLI should also be on user-facing latency, not the average.' },
      { q: 'xyz.com used up its 99.9% SLO error budget in just 20 days of the month. Tomorrow the product team wants to launch a big new feature. What should happen?', a: 'Following the error budget policy, new risky releases should stop and the team should work on reliability fixes (for whatever caused the outages) until budget comes back in the window. If there is an exception (like a legal deadline), decide it explicitly, and launch behind a flag, with a canary, at a small %. The point is that this decision comes from a policy written in advance, not from an argument.' },
      { q: 'A team must add a UNIQUE constraint on the email column of a Postgres table with 5 crore (50 million) rows, and there are some duplicates. What is the zero-downtime plan?', a: 'First find and clean the duplicates (in batches), and change the app code so no new duplicates are created (expand: code first). Then build a unique index CONCURRENTLY, which does not lock the table for writes (if it fails, drop the invalid index and try again). Once the index is built, add the constraint using that index. Each step is a separate deploy, and each step can be rolled back.' },
      { q: 'The CTO says: "We will do active/active multi-region, so we do not need backups." What will you answer?', a: 'Active/active protects against region failure, not against mistakes. A wrong DELETE, a buggy migration or ransomware will be replicated to both regions. Point-in-time backups, in a separate account, with regular restore drills are still needed. The AWS whitepaper says the same: in a data corruption case, the recovery point must be from before the disaster was noticed.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'A request passed through 5 services. How do you get all the log lines and spans of that one request together?', options: ['By matching the timestamps of each service\'s server', 'With a trace/correlation ID created at the gateway and passed forward in the header of every call', 'By the user\'s IP address'], answer: 1, explain: 'Context propagation: through the traceparent header the same trace ID reaches every service and is written in every log/span.' },
      { q: 'SLO 99.9% over 30 days. If the whole site is down, how much downtime budget is there?', options: ['~4.3 minutes', '~43 minutes', '~7.2 hours'], answer: 1, explain: '0.1% × 30 × 24 × 60 = 43.2 minutes. At 99.99%, 4.32 minutes; at 99%, 7.2 hours.' },
      { q: 'What is true about SLA and SLO?', options: ['The SLA is always stricter than the SLO', 'The SLA is a customer contract with consequences, usually kept looser than the SLO', 'They are two names for the same thing'], answer: 1, explain: 'The SLO is the internal target. Breaking the SLA means paying money/credits, so the SLA is kept below the SLO to get a warning first.' },
      { q: 'What is the biggest benefit of a canary?', options: ['No extra servers are needed for the deploy', 'A bug first reaches only a small % of users, and as soon as metrics get worse there is an automatic rollback', 'The database migration happens by itself'], answer: 1, explain: 'Small blast radius and fast rollback. But it needs good metrics and automatic analysis.' },
      { q: 'During a rolling deploy a migration renamed a column. What happens?', options: ['Nothing, the ORM will handle it', 'Servers on the old version break, and a code rollback will not fix it either', 'Only the new servers break'], answer: 1, explain: 'Old and new code run together. So: expand (add the new column) → migrate (dual write + backfill) → contract (remove the old one).' },
      { q: 'The business says: "Losing 15 minutes of data is OK, and we can be down for up to 1 hour." Which strategy is the cheapest fit?', options: ['Backup & restore', 'Pilot light', 'Multi-site active/active'], answer: 1, explain: 'Backup & restore has an RTO in hours, and with hourly backups an RPO of up to 1 hour. In pilot light data is replicated live (RPO in seconds) and the RTO is tens of minutes, so both conditions are met. Active/active fits too, but is needlessly expensive.' },
      { q: 'With a 99.9% SLO the error rate is 2%. What is the burn rate, and what should happen?', options: ['2x, a ticket', '20x, a page: the budget runs out in ~1.5 days', '0.2x, nothing'], answer: 1, explain: 'Burn rate = 2% / 0.1% = 20. 30 days / 20 = the month\'s budget is gone in 1.5 days. Above 14.4x: page.' },
      { q: 'A feature flag\'s percentage rollout went from 5% to 10%. What happens to the first 5% of users?', options: ['New random users are picked, and the old ones may turn OFF', 'They stay ON, because their hash bucket does not change', 'The flag resets for everyone'], answer: 1, explain: 'bucket = hash(flag + user) % 100. Buckets below 5 are also below 10: the rollout is sticky and only grows.' },
      { q: 'Someone stole an old disk from the data center. Which control protects you?', options: ['TLS', 'Encryption at rest (key in KMS)', 'Feature flags'], answer: 1, explain: 'TLS only protects data moving over the network. Data sitting on disk is protected by encryption at rest; the key is in KMS and did not leave with the disk.' },
      { q: 'What is the best place to keep the database password?', options: ['config.yml in Git; the repo is private, so it is safe', 'A secrets manager that gives the app short-lived credentials after checking its identity', 'Inside the Docker image'], answer: 1, explain: 'Git and images keep getting copied, and history never forgets. A secrets manager: encrypted, per-service access, rotation, audit log.' },
    ]},
    { type: 'sources', note: 'Definitions, numbers and categories were checked against these sources. The traffic, error rates and RPO/RTO example numbers in the widgets are simple, seeded models made to explain the ideas.', items: [
      { title: 'Service Level Objectives (Site Reliability Engineering book)', publisher: 'Google', official: true, url: 'https://sre.google/sre-book/service-level-objectives/', used: 'SLI, SLO, SLA definitions; SLA as a contract with consequences; choosing user-centric indicators.' },
      { title: 'Embracing Risk (Site Reliability Engineering book)', publisher: 'Google', official: true, url: 'https://sre.google/sre-book/embracing-risk/', used: 'Error budget idea (1 minus SLO), why 100% is the wrong target, budget balancing release speed and reliability.' },
      { title: 'Monitoring Distributed Systems (Site Reliability Engineering book)', publisher: 'Google', official: true, url: 'https://sre.google/sre-book/monitoring-distributed-systems/', used: 'Four golden signals; symptoms vs causes; pages should be urgent, actionable and user-visible.' },
      { title: 'Alerting on SLOs (The Site Reliability Workbook)', publisher: 'Google', official: true, url: 'https://sre.google/workbook/alerting-on-slos/', used: 'Burn rate definition; multiwindow multi-burn-rate table (2%/1h/5m/14.4, 5%/6h/30m/6, 10%/3d/6h/1).' },
      { title: 'Traces (OpenTelemetry concepts)', publisher: 'OpenTelemetry', official: true, url: 'https://opentelemetry.io/docs/concepts/signals/traces/', used: 'Trace and span definitions, span fields (parent, timestamps, attributes, events, status), context propagation.' },
      { title: 'Trace Context (W3C Recommendation, 2021)', publisher: 'W3C', official: true, url: 'https://www.w3.org/TR/trace-context/', used: 'traceparent header format: version, 16-byte trace-id, 8-byte parent-id, flags; example header value.' },
      { title: 'Disaster Recovery of Workloads on AWS: Recovery in the Cloud (whitepaper)', publisher: 'Amazon Web Services', official: true, url: 'https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html', used: 'Four DR strategies and their RPO/RTO bands (hours, tens of minutes, minutes, near real-time); pilot light vs warm standby difference; backups still needed for corruption; automate failover, test regularly.' },
      { title: 'Deployments (rolling update strategy)', publisher: 'Kubernetes documentation', official: true, url: 'https://kubernetes.io/docs/concepts/workloads/controllers/deployment/', used: 'RollingUpdate as the default strategy; maxSurge and maxUnavailable both default to 25%.' },
      { title: 'Metric and label naming', publisher: 'Prometheus documentation', official: true, url: 'https://prometheus.io/docs/practices/naming/', used: 'Every label combination is a new time series; do not use high-cardinality values such as user IDs as labels.' },
      { title: 'Database secrets engine', publisher: 'HashiCorp Vault documentation', official: true, url: 'https://developer.hashicorp.com/vault/docs/secrets/databases', used: 'Dynamic, per-client database credentials with a lease/TTL, revocation, and auth via platform identity such as Kubernetes.' },
      { title: 'BlueGreenDeployment', publisher: 'Martin Fowler (martinfowler.com)', year: 2010, url: 'https://martinfowler.com/bliki/BlueGreenDeployment.html', used: 'Two identical environments, router switch, fast rollback, shared database caveat.' },
      { title: 'CanaryRelease', publisher: 'Danilo Sato (martinfowler.com)', year: 2014, url: 'https://martinfowler.com/bliki/CanaryRelease.html', used: 'Rolling a change out to a small subset of users first, then expanding; name origin from coal mines.' },
      { title: 'ParallelChange', publisher: 'Danilo Sato (martinfowler.com)', year: 2014, url: 'https://martinfowler.com/bliki/ParallelChange.html', used: 'Expand, migrate, contract phases and their use in evolutionary database design.' },
      { title: 'Feature Toggles (aka Feature Flags)', publisher: 'Pete Hodgson (martinfowler.com)', year: 2017, url: 'https://martinfowler.com/articles/feature-toggles.html', used: 'Toggle categories (release, experiment, ops, permissioning), decoupling deploy from release, toggle debt.' },
    ]},
  ],
});
