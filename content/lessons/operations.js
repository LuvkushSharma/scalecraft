Lesson.register({
  id: 'operations',
  title: 'Observability, deployments, security',
  minutes: 45,
  summary: `Design diagram pe banana aadha kaam hai. Asli duniya mein teen sawaal aur hain: system ke andar kya ho raha hai, ye <em>dikhta</em> hai? Naya code bina sabko todhe <em>ship</em> kaise karein? Data aur passwords <em>safe</em> kaise rahein, aur poora region gir jaaye to kya? Logs, metrics, traces, SLOs, error budgets, canary deploys, expand-contract migrations, secrets, RBAC aur disaster recovery: sab khud chala ke.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Ab tak humne xyz.com ko banana seekha. Ab use <strong>chalana</strong> seekhenge.<br>Chalate waqt teen dar hote hain: andar kuch toota aur hume pata hi nahi chala; naya code bheja aur sab toot gaya; koi chor andar ghus gaya ya poora data center hi band ho gaya.<br>Is lesson mein teen aadatein: system ko <strong>dekhna</strong> (logs, metrics, traces), code ko <strong>dheere aur safely bhejna</strong> (canary, feature flags), aur data ko <strong>bachana</strong> (encryption, secrets, backups, doosra region).` },
    { type: 'h2', text: 'Problem: system chal raha hai, par andar andhera hai' },
    { type: 'p', html: `Pichhle lesson (API gateway, retries, circuit breaker) tak xyz.com das services mein bant chuka hai: Gateway, Video service, User service, Recommendations, Comments, Payments... Har service ki kai copies, kai machines pe. Design achha hai. Phir ek raat 2 baje support team ka message aata hai: <em>"Users bol rahe hain video page bahut slow khul raha hai."</em>` },
    { type: 'p', html: `On-call engineer laptop kholta hai. Sawaal: <strong>kaunsi</strong> service slow hai? <strong>Kitne</strong> users affected hain? Kab se? Kal raat ka deploy wajah hai ya database? 40 machines pe SSH karke log files padhna shuru kare? Tab tak subah ho jayegi.` },
    { type: 'p', html: `Isi tarah ke chaar sawaal har serious design review mein poochhe jaate hain, aur yahi is lesson ke chaar hisse hain:` },
    { type: 'table', head: ['Sawaal', 'Jawab', 'Is lesson ka hissa'], rows: [
      ['Andar kya ho raha hai, kaise pata chalega?', 'Logs, metrics, traces, correlation IDs', 'Observability'],
      ['"Achha" kitna achha hai? Kab jagaana hai?', 'SLI, SLO, SLA, error budget, alerting', 'Reliability targets'],
      ['Naya code bina outage ke kaise bhejein?', 'Rolling, blue-green, canary, feature flags, safe migrations', 'Deployments'],
      ['Data aur chaabiyan safe? Region gaya to?', 'TLS, encryption at rest, secrets, RBAC, audit logs, DR', 'Security aur disaster recovery'],
    ]},
    { type: 'callout', tone: 'why', title: 'Interview mein ye kyun bolna chahiye', html: `Zyaadatar candidates boxes aur arrows bana ke ruk jaate hain. Agar tum end mein 2 minute mein bolo "main p99 latency aur error rate pe SLO rakhunga, har request pe trace ID, canary deploy with auto rollback, secrets vault mein, aur RPO/RTO ke hisaab se warm standby region", to interviewer ko dikhta hai ki tumne system sirf banaya nahi, <strong>chalaya</strong> bhi hai.` },

    { type: 'h2', text: 'Observability: system ke andar jhaankna' },
    { type: 'callout', tone: 'term', title: 'Naya word: Observability', html: `<strong>Ye kya hai:</strong> system ke bahar nikle signals (logs, metrics, traces) dekh ke ye samajh paana ki andar kya ho raha hai, <em>naye</em> sawaalon ke liye bhi, bina naya code daale. Jaise doctor ke paas thermometer, BP machine aur X-ray: teeno alag cheez batate hain.<br><strong>Kyun chahiye:</strong> 40 machines aur 10 services mein "kya toota" andaze se nahi, saboot se dhoondhna hai.<br><strong>Iske bina:</strong> raat 2 baje ek ek machine pe SSH karke files padhna.<br><strong>Monitoring</strong> iska ek hissa hai: pehle se tay sawaal (CPU kitna? error rate kitna?) lagatar check karna aur gadbad pe alert. Monitoring batata hai <em>"kuch toota hai"</em>, observability batati hai <em>"kyun toota"</em>.` },
    { type: 'p', html: `Iske teen main signals hain. Teeno ek doosre ki jagah nahi lete, teeno alag sawaal ka jawab dete hain:` },

    { type: 'h3', text: 'Logs: "kya hua, detail mein"' },
    { type: 'callout', tone: 'term', title: 'Naya word: Log', html: `<strong>Ye kya hai:</strong> ek line jo code kisi event pe likhta hai: "user 42 ne video 9 khola", "DB query fail hui". Jaise ek diary entry.<br><strong>Kyun chahiye:</strong> error ki <em>exact</em> wajah aur detail (kaunsa user, kaunsi query, kya message) sirf yahin milti hai.<br><strong>Iske bina:</strong> pata hai ki error aaya, lekin kyun aaya ye nahi.<br><strong>Dikkat:</strong> jab 40 machines apni apni files mein likh rahi hon, to dhoondhna mushkil. Isliye do rules:` },
    { type: 'list', items: [
      `<strong>Structured logs</strong>: plain sentence ki jagah JSON jaisa format, taaki machine search kar sake: <code>{"level":"error","service":"recs","user_id":42,"trace_id":"4bf9...","msg":"db timeout","ms":2000}</code>. Ab "recs service ke saare errors jinka ms &gt; 1000" ek query hai.`,
      `<strong>Centralised logging</strong>: har machine apne logs ek central system ko bhejti hai (ELK stack yaani Elasticsearch + Logstash + Kibana, ya Grafana Loki, ya cloud ka log service). Engineer ek jagah se sab search karta hai.`,
    ]},
    { type: 'p', html: `Logs ki kami: <strong>mehenge</strong> hain. xyz.com 20,000 requests/second pe har request ki 10 lines likhe to din ke ~17 billion lines. Isliye levels (DEBUG, INFO, WARN, ERROR) aur production mein DEBUG band, aur purane logs kuch din baad delete ya sasti storage mein.` },

    { type: 'h3', text: 'Metrics: "kitna, aur trend kya hai"' },
    { type: 'callout', tone: 'term', title: 'Naya word: Metric', html: `<strong>Ye kya hai:</strong> ek number jo time ke saath record hota hai: requests per second, error count, CPU %, p99 latency. Har event alag se save nahi hota, bas har 10-15 second ki <em>ginti</em> ya summary. Jaise car ka speedometer.<br><strong>Kyun chahiye:</strong> bahut saste aur fast, isliye dashboards aur alerts inhi pe bante hain.<br><strong>Iske bina:</strong> "error rate badh rahi hai?" jaane ke liye crore log lines ginni padengi.<br>Popular tools: Prometheus + Grafana, Datadog, CloudWatch.` },
    { type: 'table', head: ['Metric type', 'Kya hai', 'xyz.com example'], rows: [
      ['Counter', 'Sirf badhta hai (restart pe 0)', '<code>http_requests_total{service="video",status="500"}</code>'],
      ['Gauge', 'Upar neeche hota hai, abhi ki value', 'Queue mein kitne messages, memory used'],
      ['Histogram', 'Values ko buckets mein ginta hai, taaki percentiles nikal sakein', 'Request latency: kitni &lt;50 ms, kitni &lt;100 ms...'],
    ]},
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: cardinality', html: `Metric ke saath labels lagte hain (<code>service="video"</code>, <code>status="500"</code>). Har alag label combination ek alag time series hai. Agar label mein <code>user_id</code> daal diya to 10 crore users = 10 crore time series, aur metrics system baith jaata hai. Rule: labels mein sirf chhoti, fixed list wali cheezein (service, endpoint, status code, region). Per-user detail logs aur traces ka kaam hai.` },
    { type: 'p', html: `Khud dekho. Metric <code>http_requests_total</code> pe labels lagao aur dekho kitni alag time series banti hain (har series metrics system mein alag se store aur query hoti hai):` },
    { type: 'custom', render(el) {
      const LB = [['service', 20], ['endpoint', 30], ['status', 6], ['region', 4], ['app_version', 20], ['user_id', 1e8]];
      let on = { service: 1, endpoint: 1, status: 1 };
      el.innerHTML = `<div class="chips cd-l" role="group" aria-label="Labels"></div>
        <div class="stats"><div class="stat"><span>Time series</span><strong class="cd-n"></strong></div><div class="stat"><span>Hisaab</span><strong class="cd-f" style="font-size:15px"></strong></div></div>
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
          ? 'user_id label laga diya: har user ki alag series. Ye number kisi bhi metrics system ko bitha dega (memory, disk, query sab). Per-user detail logs aur traces mein daalo, metrics mein nahi.'
          : n < 1e5 ? 'Theek hai: chhoti, fixed list wale labels. Dashboard aur alerts tez chalenge.'
          : 'Badh raha hai: har naya label poori ginti ko guna karta hai, jodta nahi. Socho ki ye label sach mein dashboard pe chahiye?';
      };
      upd();
    }},
    { type: 'callout', tone: 'tip', title: 'Percentiles recap', html: `"Latency, throughput aur p99" lesson yaad karo: average dhokha deta hai, isliye p50, p95, p99 dekhte hain. Ek technical baat aur: alag servers ke p99 ka <strong>average mat nikalo</strong>, wo galat number hai. Sahi tareeka: har server histogram buckets bheje, buckets jodo, phir combined data se p99 nikaalo.` },

    { type: 'h3', text: 'Traces: "ek request kahan kahan gayi, aur time kahan gaya"' },
    { type: 'p', html: `Metrics ne bataya "video page ka p99 2 second ho gaya". Lekin ek request Gateway → Video → (User + Recs) se guzarti hai. Time kahan gaya? Yahan <strong>distributed tracing</strong> kaam aati hai.` },
    { type: 'callout', tone: 'term', title: 'Naye words: Trace aur Span', html: `<strong>Trace:</strong> ek request ka poora safar, saari services mein. Jaise courier ki tracking: kahan kahan ruka, kitni der.<br><strong>Span:</strong> us safar ka ek hissa, jaise "Recs service ne DB query chalayi". Har span mein: naam, start time, duration, kis span ke andar hua (parent), aur extra info (attributes jaise <code>db.statement</code>, status).<br><strong>Kyun chahiye:</strong> metrics batate hain "slow hai", trace batata hai "<em>kahan</em> slow hai".<br><strong>Iske bina:</strong> 5 services mein se kaunsi time kha rahi hai, andaze se dhoondhna.<br>Saare spans ek hi <strong>trace ID</strong> share karte hain, isliye jod ke ek tree ban jaata hai. Ye definitions OpenTelemetry ki hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: OpenTelemetry (OTel)', html: `<strong>Ye kya hai:</strong> ek open-source standard aur libraries ka set jo logs, metrics aur traces ko ek common format mein banata aur bhejta hai.<br><strong>Kyun chahiye:</strong> code ek baar OTel se instrument karo, phir data Jaeger, Grafana Tempo, Datadog, kahin bhi bhej sakte ho.<br><strong>Iske bina:</strong> har vendor ki alag library; vendor badla to saara code badlo.` },
    { type: 'table', head: ['', 'Logs', 'Metrics', 'Traces'], rows: [
      ['Sawaal', 'Kya hua? (detail)', 'Kitna? Trend?', 'Kahan? Time kahan gaya?'],
      ['Data', 'Ek event, text/JSON', 'Numbers over time', 'Ek request ke spans ka tree'],
      ['Cost', 'High (volume)', 'Low', 'Medium-high, isliye sampling'],
      ['Best for', 'Error ki exact wajah', 'Dashboards, alerts', 'Microservices mein slow hissa dhoondhna'],
    ]},

    { type: 'h3', text: 'Correlation ID: sab ko ek dhaage mein pirona' },
    { type: 'callout', tone: 'term', title: 'Naya word: Correlation ID / Trace ID', html: `<strong>Ye kya hai:</strong> ek unique ID jo request ke pehle darwaaze (gateway) pe banti hai aur har agli call ke header mein aage bheji jaati hai. Har service apne har log aur span mein yahi ID likhti hai. Jaise parcel pe chipka tracking number.<br><strong>Kyun chahiye:</strong> baad mein ek ID search karo, aur us ek request ki saari services ki saari lines mil jaati hain.<br><strong>Iske bina:</strong> 5 services ke crore logs mein se ek user ki request ki lines jodna lagbhag namumkin.<br>Tracing mein isi ko <strong>trace ID</strong> kehte hain, aur ID ko aage bhejne ko <strong>context propagation</strong>.` },
    { type: 'p', html: `Aaj ka common standard W3C Trace Context hai. Isme ek <code>traceparent</code> header hota hai jismein version, 32 hex characters ki trace ID, 16 hex ki parent span ID, aur flags (jaise "ye trace sample hua") hote hain:` },
    { type: 'code', text: `traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
             ↑  ↑ trace ID (poori request ki)    ↑ parent span ID ↑ flags (01 = sampled)
             version` },
    { type: 'p', html: `Ab chala ke dekho. Ek request gateway se teen services tak jaati hai, aur har service apne spans ek <strong>trace backend</strong> ko bhejti hai:` },
    { type: 'flow', height: 360,
      nodes: [
        { id: 'app', label: 'App', sub: 'Riya', x: 70, y: 150, w: 110, kind: 'client', info: 'Ye kya hai: user Riya ka mobile app, jo video page khol raha hai. Isko trace ID ki koi parwah nahi; ID gateway banata hai.' },
        { id: 'gw', label: 'API Gateway', sub: 'trace ID banata', x: 235, y: 150, w: 150, kind: 'edge', info: 'Ye kya hai: xyz.com ka pehla server-side darwaza (resilience lesson). Agar aane wali request mein traceparent nahi hai to naya trace ID banata hai, apna span shuru karta hai, aur header aage bhejta hai.' },
        { id: 'video', label: 'Video service', x: 440, y: 150, w: 150, kind: 'server', info: 'Ye kya hai: wo service jo video page ka data jodti hai. Header se trace ID padhti hai, apna span uske neeche banati hai, aur User aur Recs ko call karte waqt header aage bhejti hai (OTel library ye apne aap karti hai).' },
        { id: 'user', label: 'User service', x: 630, y: 55, w: 150, kind: 'server', info: 'Ye kya hai: users ki details wali service. Uploader ka naam aur photo deti hai. Same trace ID ke neeche apna span banati hai.' },
        { id: 'recs', label: 'Recs service', x: 630, y: 245, w: 150, kind: 'server', info: 'Ye kya hai: recommendations service, jo "aage kya dekhein" list banati hai. Apne DB query ka bhi alag child span banati hai, jismein query text attribute ke roop mein hota hai.' },
        { id: 'coll', label: 'Trace backend', sub: 'OTel → Jaeger/Tempo', x: 330, y: 300, w: 180, kind: 'data', info: 'Ye kya hai: traces jama karne aur dikhane wala system. Saari services apne spans yahan bhejti hain (aksar beech mein ek OpenTelemetry Collector hota hai). Backend same trace ID wale spans jod ke waterfall dikhata hai. Ye background mein async hota hai, request ko slow nahi karta.' },
      ],
      edges: [
        { a: 'app', b: 'gw' }, { a: 'gw', b: 'video' }, { a: 'video', b: 'user' }, { a: 'video', b: 'recs' },
        { a: 'gw', b: 'coll', dashed: true }, { a: 'video', b: 'coll', dashed: true }, { a: 'recs', b: 'coll', dashed: true },
      ],
      scenarios: [
        { name: 'Trace ID ka safar', steps: [
          { title: 'Request aayi, ID bani', text: 'Gateway ne naya trace ID banaya (4bf9...) aur apna root span shuru kiya.', go: 'app>gw', after: { gw: { sub: 'trace 4bf9...' } }, msg: 'GET /watch/42' },
          { title: 'Header ke saath aage', text: 'Video service ko call ke saath <code>traceparent</code> header gaya. Video service ne apna span gateway ke span ka child banaya.', go: 'gw>video', msg: 'traceparent: 00-4bf9...4736-<gateway span>-01' },
          { title: 'Video do services ko ek saath call karti hai', text: 'User aur Recs dono ko same trace ID mila, parent ab Video service ka span hai.', go: ['video>user', 'video>recs'], parallel: true, after: { user: { sub: 'trace 4bf9...' }, recs: { sub: 'trace 4bf9...' } } },
          { title: 'Jawab wapas', text: 'Sab theek: page 120 ms mein bana.', go: ['res:user>video', 'res:recs>video'], parallel: true },
          { title: 'Response user tak', go: 'res:video>gw>app', text: 'Riya ko video page mil gaya.' },
          { title: 'Spans background mein backend ko', text: 'Har service apne spans batch karke trace backend ko bhejti hai. Backend ek trace ID ke saare spans jod ke ek waterfall banata hai. (User service bhi bhejti hai; diagram saaf rakhne ke liye uski line nahi dikhayi.)', go: ['evt:gw>coll', 'evt:video>coll', 'evt:recs>coll'], parallel: true, after: { coll: { state: 'ok', sub: '1 trace, 7 spans' } } },
        ]},
        { name: 'Slow request: culprit dhoondo', intro: 'Shikayat: "video page 2 second le raha hai." Metrics se pata hai ki problem hai, par kahan?', steps: [
          { title: 'Request andar gayi', go: 'app>gw>video', text: 'Wahi raasta, wahi header.' },
          { title: 'User jaldi, Recs atka', text: 'User service 28 ms mein jawab de deti hai. Recs service ka DB query lamba chal raha hai.', go: ['video>user', 'video>recs'], parallel: true, set: { recs: { state: 'hot', sub: 'DB query 1.9 s' } } },
          { title: 'Page tab tak ruka raha', text: 'Video service ko dono jawab chahiye, to sabse slow wale ka intezaar. Total ~1.9 s.', go: ['res:user>video', 'res:recs>video', 'res:video>gw>app'] },
          { title: 'Trace kholo', text: 'Engineer trace backend mein ek slow request ki trace ID se waterfall kholta hai: Recs ka DB span akela 1.9 s. Ab andaza nahi, saboot hai. Neeche wale widget mein yahi waterfall khud explore karo.', go: ['evt:gw>coll', 'evt:video>coll', 'evt:recs>coll'], parallel: true, after: { coll: { state: 'hit', sub: 'Recs DB span: 1.9 s' } }, focus: ['recs', 'coll'] },
        ]},
        { name: 'Failure: ID beech mein kho gayi', intro: 'Recs team ne naya web framework lagaya, lekin tracing setup karna bhool gayi.', steps: [
          { title: 'Request andar', go: 'app>gw>video', text: 'Gateway aur Video ke paas trace 4bf9... hai.' },
          { title: 'Recs ne header ignore kiya', text: 'Video service ne header bheja, lekin Recs aane wala <code>traceparent</code> padhta hi nahi. Usne request ko <em>nayi</em> maan ke apna alag trace ID 9a1c... bana diya.', go: ['video>user', 'video>recs'], parallel: true, set: { recs: { state: 'warn', sub: 'naya trace 9a1c...' } } },
          { title: 'Backend ko do tooti kahaniyan', text: 'Ek trace mein Gateway + Video + User, doosre mein akela Recs. Waterfall mein Recs ki jagah bas ek lamba khaali gap dikhta hai. Logs bhi trace ID se jod nahi paate.', go: ['evt:gw>coll', 'evt:video>coll', 'evt:recs>coll'], parallel: true, after: { coll: { state: 'warn', sub: '2 adhoore traces' } } },
          { title: 'Fix', text: 'Har service mein OTel library ya service mesh se automatic propagation, aur queues/Kafka messages ke headers mein bhi trace context daalo. Ek bhi kadi tooti to poori chain bekaar.', focus: ['recs'], set: { recs: { state: 'ok', sub: 'header propagate' } } },
        ]},
      ],
    },

    { type: 'h3', text: 'Trace waterfall: khud culprit pakdo' },
    { type: 'p', html: `Trace backend ek trace ko <strong>waterfall</strong> ki tarah dikhata hai: har span ek patti, left se start time, lambai = duration, aur child spans parent ke neeche khiske hue. Kisi bhi patti pe click karo. <strong>Self time</strong> dhyaan se dekho: span ka wo time jo uske children mein nahi gaya, yaani jo span ne <em>khud</em> kharch kiya.` },
    { type: 'custom', render(el) {
      const DATA = {
        normal: [
          ['gw', 'GET /watch/42', 'gateway', 0, 120, null, 'http.status=200'],
          ['vid', 'getVideoPage', 'video-svc', 5, 115, 'gw', 'video.id=42'],
          ['cache', 'redis GET video:42', 'video-svc', 8, 10, 'vid', 'cache.hit=true'],
          ['usr', 'getProfile', 'user-svc', 12, 40, 'vid', 'user.id=7'],
          ['udb', 'SELECT users', 'user-svc', 15, 35, 'usr', 'db.rows=1'],
          ['rec', 'getRecs', 'recs-svc', 12, 100, 'vid', 'recs.count=20'],
          ['rdb', 'SELECT watch_history', 'recs-svc', 18, 90, 'rec', 'db.rows_scanned=1,200 (index use hua)'],
        ],
        slow: [
          ['gw', 'GET /watch/42', 'gateway', 0, 1940, null, 'http.status=200'],
          ['vid', 'getVideoPage', 'video-svc', 5, 1935, 'gw', 'video.id=42'],
          ['cache', 'redis GET video:42', 'video-svc', 8, 10, 'vid', 'cache.hit=true'],
          ['usr', 'getProfile', 'user-svc', 12, 40, 'vid', 'user.id=7'],
          ['udb', 'SELECT users', 'user-svc', 15, 35, 'usr', 'db.rows=1'],
          ['rec', 'getRecs', 'recs-svc', 12, 1920, 'vid', 'recs.count=20'],
          ['rdb', 'SELECT watch_history', 'recs-svc', 18, 1905, 'rec', 'db.rows_scanned=4,200,000 (full table scan: kal ki migration mein index drop ho gaya)'],
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
          <div class="stat"><span>Sabse zyada self time</span><strong class="op-tw-top"></strong></div>
          <div class="stat"><span>Total ka kitna %</span><strong class="op-tw-pct"></strong></div>
        </div>
        <div class="calc-note">Spans parallel chal sakte hain (User aur Recs ek saath shuru hue), isliye sabke durations jodne se total nahi aata. Self time = span ka time minus uske children ka time.</div>`;
      let mode = 'normal', sel = 'rdb';
      const draw = () => {
        const spans = DATA[mode], total = spans[0][4];
        const modes = el.querySelector('.op-tw-modes'); modes.innerHTML = '';
        [['normal', 'Normal request (120 ms)'], ['slow', 'Shikayat wali request']].forEach(([k, n]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (mode === k ? ' on' : ''); b.textContent = n; b.onclick = () => { mode = k; draw(); }; modes.appendChild(b); });
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
    }},
    { type: 'p', html: `Normal request mein sabse zyada self time bhi Recs ka DB query hai (72 ms, total ka 60%), aur ye theek hai. Shikayat wali request mein wahi span 1,887 ms ka hai, total ka 97%. Uske attribute mein likha hai 42 lakh rows scan hui. Fix saaf hai: index wapas lagao. Bina trace ke ye dhoondhne mein ghante lagte; trace ke saath 2 minute.` },

    { type: 'h3', text: 'Kya measure karein? RED, USE aur golden signals' },
    { type: 'p', html: `Hazaron metrics ban sakte hain. Shuruaat ke liye teen famous checklists hain, aur teeno ka idea milta julta hai:` },
    { type: 'table', head: ['Checklist', 'Kiske liye', 'Kya dekhna'], rows: [
      ['<strong>RED</strong> (Tom Wilkie)', 'Har service / endpoint (request handle karne wali cheez)', '<strong>R</strong>ate (requests/sec), <strong>E</strong>rrors (fail kitni), <strong>D</strong>uration (latency, p50/p99)'],
      ['<strong>USE</strong> (Brendan Gregg)', 'Har resource: CPU, memory, disk, DB connection pool', '<strong>U</strong>tilization (kitna busy), <strong>S</strong>aturation (kitna kaam line mein wait kar raha), <strong>E</strong>rrors'],
      ['<strong>Four golden signals</strong> (Google SRE book)', 'User-facing system', 'Latency, Traffic, Errors, Saturation'],
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: Saturation', html: `<strong>Ye kya hai:</strong> resource kitna "bhara" hai aur kaam kitna line mein ruka hai. CPU 100% pe hai to aur requests queue mein wait karti hain.<br><strong>Kyun chahiye:</strong> utilization batata hai "busy hai", saturation batata hai "itna busy ki log intezaar kar rahe hain". Aksar saturation hi pehla signal hota hai ki jaldi kuch girega.<br><strong>Iske bina:</strong> CPU 70% dekh ke lagega sab theek, jabki DB connection pool ki line mein 200 requests khadi hain.` },
    { type: 'callout', tone: 'tip', title: 'Sampling: har trace save nahi karte', html: `Har request ka poora trace rakhna bahut mehenga hai. Isliye <strong>sampling</strong>: <em>head sampling</em> mein request ke shuru mein hi decide (jaise 1% traces rakho), sasta lekin rare slow request chhoot sakti hai. <em>Tail sampling</em> mein request khatam hone ke baad decide: saare errors aur slow traces rakho, normal wale ka thoda hissa. Zyada useful, lekin collector ko poora trace thodi der memory mein rakhna padta hai.` },

    { type: 'h2', text: 'SLI, SLO, SLA: "achha" kitna achha hai?' },
    { type: 'p', html: `Ab dikh raha hai. Agla sawaal: xyz.com <em>kitna</em> reliable hona chahiye? "100%" galat jawab hai. Har extra nine bahut mehenga hai (Availability lesson yaad karo), aur user ka phone, Wi-Fi aur mobile network khud 100% nahi hain, to 99.999% aur 100% ka farak user ko dikhega bhi nahi. Is sawaal ko teen words se jawab dete hain:` },
    { type: 'callout', tone: 'term', title: 'SLI: Service Level Indicator', html: `<strong>Ye kya hai:</strong> ek measurement jo user ki khushi batata hai, aam taur pe ek ratio: <code>achhi requests / total requests</code>.<br><strong>Example:</strong> "video page ki requests jo 300 ms se kam mein aur bina 5xx error ke poori huin, unka %".<br><strong>Kyun chahiye:</strong> "site theek hai?" ka jawab ek number mein.<br><strong>Dhyaan:</strong> SLI user ke nazariye se chuno (request success, latency), CPU % jaise andar ke numbers se nahi.` },
    { type: 'callout', tone: 'term', title: 'SLO: Service Level Objective', html: `<strong>Ye kya hai:</strong> SLI ka target, ek time window ke saath: "30 din mein 99.9% video page requests achhi honi chahiye." Ye team ka <em>andar</em> ka promise hai.<br><strong>Kyun chahiye:</strong> "kitna achha kaafi hai" pe sab agree karein.<br><strong>Iske bina:</strong> har outage pe behes, aur koi nahi jaanta ki reliability pe kab kaam karna hai.<br>Isse neeche gaye to users dukhi, aur team reliability pe kaam karti hai.` },
    { type: 'callout', tone: 'term', title: 'SLA: Service Level Agreement', html: `<strong>Ye kya hai:</strong> customer ke saath <em>contract</em>, jismein consequences likhe hain: "99.5% se neeche gaye to 10% paise wapas."<br><strong>Kyun dheela:</strong> SLA hamesha SLO se <strong>dheela</strong> rakhte hain (SLO 99.9%, SLA 99.5%), taaki SLO tootne pe team ko pehle hi chetavni mil jaaye aur paise dene ki naubat na aaye.<br>Har service ka SLA nahi hota, lekin SLO har important service ka hona chahiye.` },
    { type: 'compare',
      left: { title: 'Bina SLO', html: `• Product team: "features jaldi bhejo!"<br>• Ops team: "kuch mat badlo, site stable rahe!"<br>• Har deploy pe behes, koi number nahi.<br>• Alert har CPU spike pe, chahe user ko farak pade ya nahi.` },
      right: { title: 'SLO ke saath', html: `• Dono ek number pe agree: 99.9% / 30 din.<br>• Budget bacha hai → features ship karo.<br>• Budget khatam → reliability pe kaam.<br>• Alert sirf tab jab users ka experience SLO ko khatre mein daale.` },
    },

    { type: 'h3', text: 'Error budget: galti karne ki ijazat' },
    { type: 'p', html: `SLO 99.9% hai, matlab <strong>0.1% requests fail hone ki ijazat</strong> hai. Isi 0.1% ko <strong>error budget</strong> kehte hain (Google SRE book ka idea). Budget ek bank balance jaisa hai: har outage, har buggy deploy, har slow minute usme se kharch hota hai. Agar budget bacha hai to team risk le sakti hai (naye features, experiments). Budget khatam ho gaya to <strong>error budget policy</strong> lagti hai, jaise: naye feature releases ruk jaate hain, sirf reliability fixes jaate hain, jab tak window mein budget wapas na aaye.` },
    { type: 'p', html: `Neeche SLO aur traffic chuno, phir incidents jodo. Dekho kitna budget bacha:` },

    { type: 'custom', render(el) {
      const SLOS = [99, 99.5, 99.9, 99.95, 99.99];
      const PRE = [[20, 100, 'Full outage, 20 min'], [120, 5, '2 ghante, 5% errors'], [10, 50, 'Buggy deploy: 10 min, 50% errors'], [60, 20, 'Slow DB: 1 ghanta, 20% requests >300 ms']];
      el.innerHTML = `<div style="font-size:14px;color:var(--ink-2);margin-bottom:6px">SLO (30 din ki window)</div>
        <div class="op-sl-slo" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="row2" style="margin-top:12px">
          <div><label>Requests per month (millions)</label><input class="op-sl-req" type="number" value="100" min="1" step="1"></div>
          <div><label>Naya incident: kitne minute, kitne % requests kharab</label>
            <div style="display:flex;gap:6px;flex-wrap:wrap"><input class="op-sl-dur" type="number" value="30" min="1" step="1" style="flex:1 1 70px" aria-label="minutes"><input class="op-sl-frac" type="number" value="10" min="1" max="100" step="1" style="flex:1 1 70px" aria-label="percent bad"><button type="button" class="btn small primary op-sl-add">Jodo</button></div></div>
        </div>
        <div class="op-sl-pre" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>
        <div class="op-sl-list" style="margin-top:10px;font:13px var(--f-mono)"></div>
        <div style="margin-top:12px;height:14px;border-radius:7px;background:var(--surface-2);border:1px solid var(--line);overflow:hidden"><div class="op-sl-bar" style="height:100%;width:0;transition:width .3s"></div></div>
        <div class="stats">
          <div class="stat"><span>Error budget (requests)</span><strong class="op-sl-b"></strong></div>
          <div class="stat"><span>= full outage per month</span><strong class="op-sl-m"></strong></div>
          <div class="stat"><span>Incidents ne khaaya</span><strong class="op-sl-u"></strong></div>
          <div class="stat"><span>Budget bacha</span><strong class="op-sl-r"></strong></div>
        </div>
        <div class="calc-note op-sl-note"></div>`;
      let slo = 99.9, inc = [[20, 100, 'Full outage, 20 min'], [120, 5, '2 ghante, 5% errors']];
      const MIN = 30 * 24 * 60;
      const fmtMin = m => m >= 120 ? (m / 60).toFixed(1) + ' ghante' : (m >= 10 ? m.toFixed(1) : m.toFixed(2)) + ' min';
      const fmtN = n => Math.round(n).toLocaleString('en-IN');
      const draw = () => {
        const reqs = Math.max(1, Number(el.querySelector('.op-sl-req').value) || 1) * 1e6;
        const perMin = reqs / MIN, budgetReq = reqs * (1 - slo / 100), budgetMin = MIN * (1 - slo / 100);
        const badReq = inc.reduce((a, [d, f]) => a + perMin * d * f / 100, 0);
        const usedPct = budgetReq ? badReq / budgetReq * 100 : 0, left = 100 - usedPct;
        const so = el.querySelector('.op-sl-slo'); so.innerHTML = '';
        SLOS.forEach(v => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (v === slo ? ' on' : ''); b.textContent = v + '%'; b.onclick = () => { slo = v; draw(); }; so.appendChild(b); });
        const list = el.querySelector('.op-sl-list'); list.innerHTML = '';
        if (!inc.length) list.innerHTML = '<div style="color:var(--ink-3)">Koi incident nahi. Upar se jodo.</div>';
        inc.forEach(([d, f, n], i) => {
          const row = document.createElement('div'); row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:3px 0;border-bottom:1px dashed var(--line)';
          const share = budgetReq ? (perMin * d * f / 100) / budgetReq * 100 : 0;
          row.innerHTML = `<span style="flex:1 1 200px">${n}</span><span style="color:var(--ink-2)">${fmtN(perMin * d * f / 100)} kharab = budget ka ${share.toFixed(1)}%</span>`;
          const x = document.createElement('button'); x.type = 'button'; x.className = 'btn small ghost'; x.textContent = 'hatao'; x.onclick = () => { inc.splice(i, 1); draw(); };
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
          ? `Budget bacha hai: features ship karte raho, experiments chalao. (Traffic poore mahine barabar maana: ${fmtN(perMin)} requests/min.)`
          : left > 0 ? 'Budget kam bacha hai: risky deploys rok ke chalo, reliability kaam ko priority do.'
          : `Budget khatam (${usedPct.toFixed(0)}% kharch): error budget policy lagti hai. Naye feature releases freeze, sirf reliability fixes, jab tak 30 din ki window mein budget wapas na bane.`;
      };
      const pre = el.querySelector('.op-sl-pre');
      PRE.forEach(p => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small ghost'; b.textContent = '+ ' + p[2]; b.onclick = () => { inc.push(p.slice()); draw(); }; pre.appendChild(b); });
      const clr = document.createElement('button'); clr.type = 'button'; clr.className = 'btn small ghost'; clr.textContent = 'Sab hatao'; clr.onclick = () => { inc = []; draw(); }; pre.appendChild(clr);
      el.querySelector('.op-sl-add').onclick = () => {
        const d = Math.max(1, Number(el.querySelector('.op-sl-dur').value) || 1), f = Math.min(100, Math.max(1, Number(el.querySelector('.op-sl-frac').value) || 1));
        inc.push([d, f, `Custom: ${d} min, ${f}% kharab`]); draw();
      };
      el.querySelector('.op-sl-req').addEventListener('input', draw);
      draw();
    }},
    { type: 'p', html: `Default pe dekho: SLO 99.9% aur 30 din = <strong>43.2 minute</strong> ka budget (agar poori site band ho). 100 million requests pe matlab 1 lakh kharab requests ki ijazat. 20 minute ka full outage + 2 ghante 5% errors = 26 "outage-minute" ke barabar, yaani budget ka ~60% gaya, ~40% bacha. Ab 99.99% chuno: budget sirf 4.32 minute, aur wahi 20 minute ka outage akela budget ka 463% kha jaata hai. 99% pe budget 7.2 ghante, wahi dono incidents sirf 6% khaate hain. Har extra nine budget ko 10 guna chhota karta hai.` },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion', html: `"Budget bacha hai to bekaar hai, use karo" sunne mein ajeeb lagta hai, lekin yahi idea hai. Agar mahine ke end mein 90% budget bacha hai, to shayad SLO zaroorat se zyada strict hai ya team bahut dheere ship kar rahi hai. Error budget reliability aur speed ke beech ka <strong>agreement</strong> hai, sirf ek report card nahi.` },

    { type: 'h3', text: 'Alerting: kab kisi ko raat 3 baje jagaayein?' },
    { type: 'p', html: `Alert ka matlab ek insaan ka kaam rukna ya neend tootna. Isliye har alert ko ek sawaal pass karna chahiye: <em>"kya user ko abhi takleef ho rahi hai, aur kya kisi insaan ko abhi kuch karna padega?"</em>` },
    { type: 'compare',
      left: { title: 'Cause-based alert (zyaadatar bekaar)', html: `"Server 7 ka CPU 90% hai."<br><br>Ho sakta hai users ko koi farak na pade (baaki 39 servers theek). Ya CPU 40% pe ho aur site phir bhi toot rahi ho (DB lock). Aise alerts bahut bajte hain aur sach mein kuch nahi batate.` },
      right: { title: 'Symptom-based alert (achha)', html: `"Video page ki error rate SLO ke hisaab se tez budget kha rahi hai."<br><br>Seedha user ka dard naapta hai. Wajah kuch bhi ho (CPU, DB, bug, network), alert bajega. Wajah dhoondhne ke liye dashboards aur traces hain.` },
    },
    { type: 'list', items: [
      `<strong>Page vs ticket</strong>: page (phone pe call/notification) sirf urgent, user-facing, action-wala problem. Baaki sab ticket ya chat message jo working hours mein dekha jaaye.`,
      `<strong>Alert fatigue</strong>: agar roz 50 alerts bajte hain aur 48 bekaar nikalte hain, to engineer alerts ignore karna seekh jaata hai, aur asli wala bhi miss hota hai. Har alert jo bina action ke band hua, use hatao ya theek karo.`,
      `<strong>Har alert ke saath runbook</strong>: ek chhota doc ki ye alert kya matlab, pehle kya check karna, aur dashboard ka link.`,
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: Burn rate', html: `<strong>Ye kya hai:</strong> budget kitni tezi se jal raha hai, SLO ke hisaab se. Jaise petrol tank kitni tezi se khaali ho raha hai.<br><strong>Kaise naapein:</strong> burn rate 1 = itni speed ki budget theek 30 din mein khatam ho. Burn rate 10 = 10 guna tez, yaani 3 din mein khatam. 99.9% SLO pe error rate 1% chal rahi hai to burn rate = 1% / 0.1% = 10.<br><strong>Kyun chahiye:</strong> "error rate 2%" akela kuch nahi batata; burn rate batata hai ki kitni der mein mahine ka budget khatam hoga, yaani kitni jaldi jagana hai.` },
    { type: 'p', html: `"Error rate &gt; 0.1% for 5 min" jaisa simple alert ya to bahut bajta hai (chhote spikes pe) ya bahut der se. Google ki SRE workbook <strong>multi-window, multi-burn-rate</strong> alerts suggest karti hai. 99.9% SLO ke liye unka starting point:` },
    { type: 'table', head: ['Kitna budget gaya', 'Long window', 'Short window', 'Burn rate', 'Kya karna'], rows: [
      ['2%', '1 ghanta', '5 min', '14.4', 'Page (abhi jagao)'],
      ['5%', '6 ghante', '30 min', '6', 'Page'],
      ['10%', '3 din', '6 ghante', '1', 'Ticket (din mein dekho)'],
    ], caption: 'Maths: 30 din = 720 ghante. 14.4 × 1 ghanta / 720 = 2%. 6 × 6 / 720 = 5%. 1 × 72 / 720 = 10%. Short window isliye ki problem theek hote hi alert jaldi band ho jaaye.' },
    { type: 'p', html: `Burn rate 14.4 pe poora mahine ka budget ~2 din mein khatam hoga (720 / 14.4 = 50 ghante), isliye page. Burn rate 1 pe koi jaldi nahi, lekin trend dikhna chahiye, isliye ticket.` },
    { type: 'p', html: `Khud aazmao. SLO 99.9%. Ek incident chuno (kitne % requests fail, kitni der), aur dekho kaunsa alert kab bajta hai, aur tab tak mahine ka kitna budget jal chuka hota hai. Saath mein ek "naive" alert bhi hai: <code>error rate &gt; 0.1% for 5 min</code>.` },
    { type: 'custom', render(el) {
      const ERR = [0.2, 0.5, 1, 2, 5, 10, 50, 100], DUR = [3, 6, 10, 20, 60, 240, 720, 2880];
      const RULES = [['Page: 14.4x, 1 ghanta + 5 min', 14.4, 60], ['Page: 6x, 6 ghante + 30 min', 6, 360], ['Ticket: 1x, 3 din + 6 ghante', 1, 4320]];
      const PRE = [['Bada outage', 7, 3], ['Chhota blip', 4, 1], ['Medium bug', 3, 5], ['Dheema leak', 1, 7]];
      const BUDGET = 0.001, MONTH = 43200;
      el.innerHTML = `<div class="br-pre" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="row2" style="margin-top:10px">
          <div><label>Kitne % requests fail: <strong class="br-ev"></strong></label><input class="br-e" type="range" min="0" max="7" step="1" value="7"></div>
          <div><label>Incident kitni der: <strong class="br-dv"></strong></label><input class="br-d" type="range" min="0" max="7" step="1" value="3"></div>
        </div>
        <div class="br-rows" style="margin-top:10px;display:flex;flex-direction:column;gap:6px"></div>
        <div class="stats"><div class="stat"><span>Burn rate</span><strong class="br-b"></strong></div><div class="stat"><span>Incident ne kul budget khaaya</span><strong class="br-t"></strong></div></div>
        <div class="calc-note br-note"></div>`;
      const $ = c => el.querySelector(c);
      const fm = m => m < 1 ? Math.round(m * 60) + ' s' : m < 120 ? (Math.round(m * 10) / 10) + ' min' : (Math.round(m / 6) / 10) + ' ghante';
      $('.br-pre').innerHTML = PRE.map((p, i) => `<button type="button" class="btn small ghost" data-i="${i}">${p[0]}</button>`).join('');
      el.querySelectorAll('.br-pre button').forEach(b => b.onclick = () => { const p = PRE[+b.dataset.i]; $('.br-e').value = p[1]; $('.br-d').value = p[2]; upd(); });
      const upd = () => {
        const e = ERR[+$('.br-e').value] / 100, D = DUR[+$('.br-d').value];
        $('.br-ev').textContent = (e * 100) + '%'; $('.br-dv').textContent = fm(D);
        const burn = e / BUDGET;
        const row = (name, fire, used, kind) => `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:6px 8px;border:1px solid var(--line);border-radius:var(--r-sm)"><span style="flex:1 1 200px;font-size:14px">${name}</span><strong style="font-size:14px;color:${fire === null ? 'var(--ink-3)' : kind === 'noise' ? 'var(--amber)' : 'var(--red)'}">${fire === null ? 'nahi baja' : 'baja @ ' + fm(fire) + ' (budget ' + used + ')'}</strong></div>`;
        let html = '', fired = [];
        RULES.forEach(([n, B, W]) => { const t = W * B * BUDGET / e; const ok = burn >= B && t <= D; if (ok) fired.push(n); html += row(n, ok ? t : null, (B * W / MONTH * 100).toFixed(0) + '%'); });
        const naive = D >= 5 && e > BUDGET;
        html += row('Naive: &gt; 0.1% for 5 min', naive ? 5 : null, (e * 5 / (BUDGET * MONTH) * 100).toFixed(2) + '%', 'noise');
        $('.br-rows').innerHTML = html;
        const tot = e * D / (BUDGET * MONTH) * 100;
        $('.br-b').textContent = (Math.round(burn * 10) / 10) + 'x';
        $('.br-t').textContent = tot.toFixed(tot < 1 ? 2 : 0) + '%';
        $('.br-note').textContent = fired.length
          ? `Burn rate ${Math.round(burn * 10) / 10}x. Pehla alert jo baja: "${fired[0]}". Har rule tab bajta hai jab mahine ka ek tay hissa (2%, 5%, 10%) jal chuka ho: chahe aag tez ho ya dheemi, nuksaan ki ek seema pe hi insaan jagta hai.`
          : naive ? `Naive alert ne page kiya, lekin poore incident ne sirf ${tot.toFixed(2)}% budget khaaya. Ye raat 3 baje ki bekaar neend tooti: isi ko alert fatigue kehte hain. Burn-rate rules chup rahe.`
          : `Koi alert nahi baja: incident chhota tha (${tot.toFixed(2)}% budget). Dashboard pe dikhega, kisi ko jagane ki zaroorat nahi.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},

    { type: 'h2', text: 'Deployments: naya code bina sab tode kaise bhejein' },
    { type: 'p', html: `Data dikhaane laga ki zyaadatar outages kisi <em>change</em> ke baad aate hain: naya code, nayi config, naya DB schema. xyz.com ka purana tareeka: Friday shaam saare 40 servers band, naya version copy, sab chalu. Ek baar naye version mein ek bug tha jo sirf asli traffic pe dikhta tha. Nateeja: <strong>100% users</strong> ke liye site toot gayi, aur purana version wapas laane mein 40 minute.` },
    { type: 'callout', tone: 'term', title: 'Naye words: Deploy, release, rollback, blast radius', html: `<strong>Deploy:</strong> naya code servers pe pahunchana aur chalana.<br><strong>Release:</strong> users ko naya feature dikhana. (Feature flags ke saath ye do alag cheezein ho jaati hain, aage dekhenge.)<br><strong>Rollback:</strong> gadbad hone pe purane version pe wapas jaana.<br><strong>Blast radius:</strong> ek bug kitne users tak pahunchta hai. Jaise ek kamre mein aag vs poore ghar mein aag.<br><strong>Kyun zaroori:</strong> achhi deployment strategy ka goal: blast radius chhota, aur rollback fast. Iske bina: har bug 100% users pe, aur wapas aane mein 40 minute.` },

    { type: 'h3', text: 'Rolling deployment' },
    { type: 'p', html: `Sab ek saath badalne ki jagah thode thode: 40 mein se 4 servers Load Balancer se hatao, update karo, health check pass hone ka wait karo, wapas jodo, phir agle 4. Kubernetes Deployments by default yahi karte hain (<code>maxSurge</code> aur <code>maxUnavailable</code> settings, dono default 25%).` },
    { type: 'list', items: [
      `<strong>Fayda</strong>: extra servers lagbhag nahi chahiye, site kabhi poori band nahi.`,
      `<strong>Nuksaan</strong>: deploy ke beech purana aur naya version <em>ek saath</em> chalte hain, to dono ko ek hi DB schema aur API ke saath kaam karna aana chahiye. Rollback bhi ek aur rolling deploy hai, yaani minutes lagte hain. Aur bina automatic checks ke, bug dheere dheere poore fleet pe pahunch jaata hai.`,
    ]},

    { type: 'h3', text: 'Blue-green deployment' },
    { type: 'p', html: `Do poore, ek jaise environments: <strong>Blue</strong> (abhi live, v1) aur <strong>Green</strong> (khaali). Green pe v2 deploy karo, aaraam se test karo, phir router/Load Balancer ka switch palto: saara traffic Green pe. Kuch gadbad? Switch wapas Blue pe, seconds mein. Martin Fowler ne isko 2010 mein apne bliki pe naam se likha.` },
    { type: 'ascii', text: `
           Router / LB
          /           \\
  [ BLUE: v1 ]     [ GREEN: v2 ]
   live, 100%       test ho raha
          \\           /
           Shared DB  ← dhyaan: dono isi ko use karte hain

Switch:  Router → GREEN (100%).  Rollback: Router → BLUE.` },
    { type: 'list', items: [
      `<strong>Fayda</strong>: instant switch, instant rollback, aur ek waqt pe sirf ek version live.`,
      `<strong>Nuksaan</strong>: deploy ke waqt double capacity chahiye. Switch ek jhatke mein 100% users ko naye version pe le jaata hai, to bug sabko lagta hai (bas jaldi wapas aa sakte ho). Aur database aksar shared hota hai, to schema changes phir bhi dono versions ke saath chalne chahiye.`,
    ]},

    { type: 'p', html: `Dono ko ek hi bug pe chala ke dekho. 10 servers, 10,000 requests/minute. v2 mein ek bug hai jo 20% requests fail karta hai. Alert minute 6 pe bajta hai aur rollback shuru hota hai. Rolling mein har step 2 minute ka hai.` },
    { type: 'custom', render(el) {
      const N = 10, PER = 10000, BUG = 0.2, DET = 6, M = 16;
      const MODES = [['r1', 'Rolling, 1 server/step', 1], ['r2', 'Rolling, 2 servers/step', 2], ['r5', 'Rolling, 5 servers/step', 5], ['bg', 'Blue-green', 0]];
      el.innerHTML = `<div class="chips dp-m" role="group" aria-label="Strategy">${MODES.map(([k, n], i) => `<button type="button" class="chip${i === 1 ? ' on' : ''}" data-k="${k}">${n}</button>`).join('')}</div>
        <svg class="dp-svg" viewBox="0 0 640 150" style="width:100%;height:auto;margin-top:10px;display:block" role="img" aria-label="Har minute v2 pe kitne servers"></svg>
        <div class="stats">
          <div class="stat"><span>Users ko errors</span><strong class="dp-bad"></strong></div>
          <div class="stat"><span>Rollback mein laga</span><strong class="dp-rb"></strong></div>
          <div class="stat"><span>Sabse zyada servers ek saath</span><strong class="dp-pk"></strong></div>
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
        svg += `<line x1="${20 + DET * 38 - 4}" y1="4" x2="${20 + DET * 38 - 4}" y2="114" stroke="var(--ink-2)" stroke-dasharray="4 3"/><text x="${20 + DET * 38}" y="14" font-size="11" fill="var(--ink-2)">alert, rollback</text><text x="20" y="146" font-size="11" fill="var(--ink-3)">minute → (bar = v2 wale servers)</text>`;
        $('.dp-svg').innerHTML = svg;
        const bad = out.reduce((a, c) => a + c / N * PER * BUG, 0);
        $('.dp-bad').textContent = Math.round(bad).toLocaleString('en-IN');
        const back = out.findIndex((c, m) => m >= DET && c === 0);
        $('.dp-rb').textContent = mode === 'bg' ? 'seconds (switch)' : (back - DET) + ' min';
        $('.dp-pk').textContent = mode === 'bg' ? (2 * N) + ' (2 environments)' : (N + b) + ' (surge ' + b + ')';
        $('.dp-note').textContent = mode === 'bg'
          ? 'Blue-green: switch palta to 100% users ek saath v2 pe. 6 minute tak sabko bug laga, phir ek click mein sab Blue (v1) pe wapas. Rollback sabse tez, lekin blast radius poora aur deploy ke time 2x servers.'
          : b === 1 ? 'Chhote batches: bug sirf 1-3 servers tak pahuncha jab alert baja, isliye errors sabse kam. Lekin deploy dheema (10 servers = 20 minute), aur rollback bhi utna hi dheema.'
          : b === 5 ? 'Bade batches: 2 minute mein hi aadhe, 4 minute mein saare servers v2 pe. Alert tak sab toot chuke the: lagbhag blue-green jitne errors, aur rollback bhi minutes ka.'
          : 'Beech ka raasta. Rolling ka khatra: rollback bhi ek rolling deploy hai, minutes leta hai. Isliye real systems ko automatic checks chahiye jo bug pehle 1-2 servers pe hi pakad lein (canary, neeche).';
      };
      el.querySelectorAll('.dp-m .chip').forEach(bt => bt.addEventListener('click', () => { mode = bt.dataset.k; el.querySelectorAll('.dp-m .chip').forEach(x => x.classList.toggle('on', x === bt)); upd(); }));
      upd();
    }},
    { type: 'h3', text: 'Canary release' },
    { type: 'p', html: `Naam purani coal mines se aaya: miners ek canary chidiya saath le jaate the; zehreeli gas pehle usko lagti thi, insaano ko waqt pe pata chal jaata tha. Software mein: naya version pehle <strong>1% traffic</strong> ko do. Uske metrics (error rate, p99 latency) purane version se compare karo. Theek hai to 10%, phir 50%, phir 100%. Kahin bhi metrics bigde to <strong>automatic rollback</strong>: canary ka traffic wapas 0%.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Bake time', html: `<strong>Ye kya hai:</strong> canary ke har stage pe kitni der rukte hain, data jama karne ke liye.<br><strong>Kyun chahiye:</strong> bahut chhota = noise pe galat faisla. Bahut lamba = deploy mein ghante.<br><strong>Dhyaan:</strong> stage pe <em>kam se kam itni requests</em> honi chahiye ki ratio pe bharosa ho sake: 20 requests mein 1 error = 5%, lekin wo sirf kismat bhi ho sakti hai.` },
    { type: 'p', html: `Neeche canary pipeline chalao. Teen alag v2 builds hain. Rule: har minute check, stage mein kam se kam 500 canary requests hone ke baad agar canary ki error rate <strong>1% se upar</strong> (v1 ki normal 0.5% ka double) gayi, to turant rollback. Traffic: 10,000 requests/minute, har stage 10 minute.` },

    { type: 'custom', render(el) {
      const VERS = {
        ok: { name: 'v2 healthy', p: () => 0.005, seed: 42 },
        crash: { name: 'v2 crash bug (6% errors)', p: () => 0.06, seed: 11 },
        load: { name: 'v2 load bug (50%+ traffic pe)', p: pct => pct >= 50 ? 0.05 : 0.005, seed: 13 },
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
        <div style="overflow-x:auto;margin-top:12px"><table style="width:100%;border-collapse:collapse;font-size:13.5px;min-width:300px"><thead><tr style="text-align:left;color:var(--ink-3)"><th style="padding:4px">Stage</th><th style="padding:4px">Min</th><th style="padding:4px">Canary req</th><th style="padding:4px">Errors</th><th style="padding:4px">Rate</th><th style="padding:4px">Faisla</th></tr></thead><tbody class="op-cn-rows"></tbody></table></div>
        <div class="stats">
          <div class="stat"><span>Result</span><strong class="op-cn-res"></strong></div>
          <div class="stat"><span>Errors jo users ko dikhe</span><strong class="op-cn-tot"></strong></div>
          <div class="stat"><span>Big-bang deploy (10 min tak kisi ko pata na chale)</span><strong class="op-cn-bb"></strong></div>
        </div>
        <div class="calc-note op-cn-note"></div>`;
      let key = 'crash', auto = true;
      const chipRow = (box, items, cur, set) => { box.innerHTML = ''; items.forEach(([k, n]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (cur === k ? ' on' : ''); b.textContent = n; b.onclick = () => { set(k); draw(); }; box.appendChild(b); }); };
      const draw = () => {
        chipRow(el.querySelector('.op-cn-v'), Object.entries(VERS).map(([k, v]) => [k, v.name]), key, k => { key = k; });
        chipRow(el.querySelector('.op-cn-a'), [[true, 'Auto rollback ON'], [false, 'Auto rollback OFF']], auto, k => { auto = k; });
        const r = sim(key, auto);
        el.querySelector('.op-cn-rows').innerHTML = r.rows.map(x => `<tr style="border-top:1px solid var(--line)"><td style="padding:4px">${x.pct}%</td><td style="padding:4px">${x.mins}</td><td style="padding:4px">${x.req.toLocaleString('en-IN')}</td><td style="padding:4px">${x.err.toLocaleString('en-IN')}</td><td style="padding:4px;color:${x.err / x.req > LIMIT ? 'var(--red)' : 'var(--ink)'}">${(x.err / x.req * 100).toFixed(2)}%</td><td style="padding:4px;font-weight:700;color:${x.verdict === 'pass' ? 'var(--green)' : x.verdict === 'nocheck' ? 'var(--ink-3)' : 'var(--red)'}">${x.verdict === 'pass' ? 'pass →' : x.verdict === 'nocheck' ? 'bina check →' : 'ROLLBACK'}</td></tr>`).join('');
        el.querySelector('.op-cn-res').textContent = r.stopped ? `Rollback @ ${r.stopped.pct}%, min ${r.stopped.min}` : '100% pe live';
        el.querySelector('.op-cn-tot').textContent = r.total.toLocaleString('en-IN');
        const bb = Math.round(PER_MIN * BAKE * VERS[key].p(100));
        el.querySelector('.op-cn-bb').textContent = '~' + bb.toLocaleString('en-IN');
        const notes = {
          ok: 'Healthy build: har stage pe error rate ~0.5% (v1 jitni), to pipeline khud 100% tak le gayi. Normal errors bhi ginti mein aate hain; canary ka kaam sirf ye pakadna hai ki naya version purane se bura hai ya nahi.',
          crash: auto ? 'Crash bug 1% stage pe hi pakda gaya: 500 requests ka sample pura hote hi rate 1% se upar thi. Sirf ~30 users ko error dikha, big-bang mein ~6,000 ko dikhta.' : 'Auto rollback band: pipeline aankh band karke 100% tak gayi aur har stage pe bug users tak pahuncha. Canary bina automatic analysis ke sirf ek dheema big-bang hai.',
          load: auto ? 'Load bug 1% aur 10% pe chhupa raha (kam traffic pe sab theek tha). 50% pe pehle hi minute mein pakda gaya. Isliye multiple stages: kuch bugs sirf scale pe dikhte hain. Aur isliye rollback automatic aur turant hona chahiye: 50% stage pe har minute ka delay ~250 extra errors.' : 'Auto rollback band: load bug 50% aur 100% dono pe chalta raha.',
        };
        el.querySelector('.op-cn-note').textContent = notes[key];
      };
      draw();
    }},

    { type: 'p', html: `Crash bug wala build chuno: 1% stage pe 5 minute mein 500 requests, 30 errors (6%), rollback. Sirf ~30 kharab requests, jabki big-bang mein 10 minute mein ~6,000. Load bug wala: 1% aur 10% pe sab normal, 50% pe pehle minute mein 253 errors aur rollback. Phir "Auto rollback OFF" karke dekho: wahi pipeline ab har bug ko 100% tak le jaati hai.` },
    { type: 'callout', tone: 'warn', title: 'Chhote sample ka dhokha', html: `Ek healthy build bhi kabhi 500 requests mein kismat se 6 errors (1.2%) dikha sakta hai aur bekaar rollback ho jaata hai. Isliye asli tools (Spinnaker ka Kayenta, Argo Rollouts, Flagger) canary ko usi waqt chal rahe purane version ke ek <em>baseline</em> group se statistically compare karte hain, kai metrics pe (errors, p99, CPU), sirf ek fixed line se nahi. Aur canary ke liye users "sticky" rakhte hain, taaki ek user baar baar v1 aur v2 ke beech na jhoole.` },
    { type: 'table', head: ['', 'Rolling', 'Blue-green', 'Canary'], rows: [
      ['Kaise', 'Servers batches mein update', 'Do poore environments, ek switch', 'Traffic ka % dheere dheere badhao'],
      ['Extra capacity', 'Thodi (surge)', '2x, deploy ke time', 'Thodi'],
      ['Bug kitne users tak', 'Jitne servers update ho chuke', 'Switch ke baad sab (jaldi wapas)', 'Sirf canary % (1%, 10%...)'],
      ['Rollback speed', 'Minutes (ulta rolling)', 'Seconds (switch wapas)', 'Seconds (traffic 0%)'],
      ['Zaroorat', 'Health checks', 'Router switch, 2x infra', 'Achhe metrics + automatic analysis'],
      ['Kab', 'Default, chhote changes', 'Jab instant rollback chahiye, infra sasta', 'Bada traffic, risky change, user-facing service'],
    ]},
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion', html: `Teeno ek doosre ke dushman nahi. Real systems aksar mila ke chalate hain: canary pehle 1% pe, phir baaki fleet pe rolling. Aur teeno ek cheez se nahi bachaate: <strong>database</strong>. Code ka rollback seconds mein ho jaata hai; galat schema change ya kharab data ka rollback nahi hota. Uske liye neeche expand-contract dekho.` },

    { type: 'h3', text: 'Feature flags: deploy aur release ko alag karo' },
    { type: 'p', html: `Naya "Shorts" tab bana hai, adha tayyar. Code production mein chala gaya, lekin ek <code>if</code> ke peeche band hai: <code>if (flags.isOn("shorts_tab", user)) { ... }</code>. Flag ka on/off ek config service mein hai, bina deploy ke badal sakta hai. Ise <strong>feature flag</strong> (ya feature toggle) kehte hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Feature flag', html: `<strong>Ye kya hai:</strong> code ke andar ek <code>if</code> jiska on/off ek config service se aata hai, bina deploy ke badal sakta hai. Jaise ghar ka main switch: wiring (code) pehle se lagi hai, bas switch dabana hai.<br><strong>Kyun chahiye:</strong> <em>deploy</em> (code servers pe pahunchana) aur <em>release</em> (users ko dikhana) alag ho jaate hain. Bug mile to flag off: seconds mein, bina naye deploy ke.<br><strong>Iske bina:</strong> har chhote rollback ke liye poora purana version deploy karo.` },
    { type: 'p', html: `Percentage rollout kaise hota hai? Flag service har user ke liye <code>hash(flag_name + user_id) % 100</code> nikaalti hai (0 se 99 ka ek "bucket"). Bucket rollout % se kam hai to flag on. Isse ek hi user ko hamesha same jawab milta hai (sticky), aur % badhane pe purane users on hi rehte hain. Neeche 100 users hain:` },
    { type: 'custom', render(el) {
      const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };
      const FLAGS = ['shorts_tab', 'new_thumbnail'];
      el.innerHTML = `<div class="chips ff-f" role="group" aria-label="Flag">${FLAGS.map((f, i) => `<button type="button" class="chip${i ? '' : ' on'}" data-f="${f}">${f}</button>`).join('')}</div>
        <div class="row2" style="margin-top:10px"><div><label>Rollout: <strong class="ff-pv"></strong></label><input class="ff-p" type="range" min="0" max="100" step="5" value="10"></div>
        <div><label style="display:flex;gap:6px;align-items:center;margin-top:22px"><input class="ff-k" type="checkbox"> Kill switch (flag OFF sabke liye)</label></div></div>
        <div class="ff-g" style="display:grid;grid-template-columns:repeat(10,1fr);gap:4px;margin-top:10px;max-width:340px"></div>
        <div class="stats"><div class="stat"><span>Users jinko feature dikha</span><strong class="ff-n"></strong></div><div class="stat"><span>User 42 ka bucket</span><strong class="ff-b"></strong></div></div>
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
        $('.ff-note').textContent = kill ? 'Kill switch: ek click, aur feature sabke liye band. Code wahi hai, koi deploy nahi.'
          : `Rollout ${p}%: ${on} users ON (hash pe depend karta hai, isliye bilkul ${p} nahi, lekin bade numbers pe ${p}% ke paas). Slider badhao: jo pehle ON the wo ON hi rehte hain, kyunki unka bucket nahi badalta. Doosra flag chuno: alag users ON hote hain, taaki har experiment ke liye wahi bechare users na fansein.`;
      };
      el.querySelectorAll('.ff-f .chip').forEach(b => b.addEventListener('click', () => { flag = b.dataset.f; el.querySelectorAll('.ff-f .chip').forEach(x => x.classList.toggle('on', x === b)); upd(); }));
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'table', head: ['Flag ka type', 'Kitni der rehta hai', 'xyz.com example'], rows: [
      ['Release flag', 'Din-hafte, feature poora hone tak', 'Shorts tab: pehle sirf employees, phir 5% users, phir sab'],
      ['Experiment flag', 'Experiment khatam hone tak', 'A/B test: naya thumbnail design 50% users ko'],
      ['Ops flag / kill switch', 'Lamba', 'Load zyada ho to "recommendations" band, site bachao (graceful degradation)'],
      ['Permission flag', 'Lamba', 'Premium users ke liye 4K'],
    ], caption: 'Categories Pete Hodgson ke article "Feature Toggles" (martinfowler.com) pe based.' },
    { type: 'list', items: [
      `<strong>Fayda</strong>: deploy roz, release jab business chahe. Bug mile to flag off: rollback bina deploy ke, seconds mein. Trunk-based development mein adhoora code bhi main branch mein merge ho sakta hai.`,
      `<strong>Nuksaan</strong>: har flag code mein ek <code>if</code> aur ek naya combination jo test karna hai. Purane flags na hataaye to code jungle ban jaata hai (<em>flag debt</em>). Rule: release flag ke saath hi uske hatane ki ticket banao.`,
    ]},

    { type: 'h3', text: 'Database schema migrations bina downtime' },
    { type: 'p', html: `Product team chahti hai <code>users.name</code> column ka naam <code>display_name</code> ho jaaye. Ek SQL line hai. Lekin rolling ya canary deploy ke dauraan <strong>purana aur naya code ek saath chalte hain</strong>, aur dono ek hi database padhte hain. Schema change ko dono versions ke saath kaam karna hoga. Chala ke dekho:` },
    { type: 'callout', tone: 'term', title: 'Naya word: Schema migration', html: `<strong>Ye kya hai:</strong> database ki structure badalne wala ek versioned script (column jodna, hatana, index banana), jo deploy ke saath chalta hai. Tools: Flyway, Liquibase, Rails/Django migrations.<br><strong>Kyun dhyaan:</strong> code ka rollback seconds mein hota hai, schema ka nahi.<br><strong>Zero-downtime</strong> ka matlab: migration ke dauraan site chalti rahe aur koi version toote nahi.` },
    { type: 'flow', height: 350,
      nodes: [
        { id: 'u', label: 'Users', x: 70, y: 170, w: 110, kind: 'client', info: 'Ye kya hai: xyz.com ke users. Unki requests Load Balancer ke through v1 aur v2 dono servers pe ja rahi hain, kyunki deploy chal raha hai.' },
        { id: 'v1', label: 'Servers v1', sub: 'padhta: name', x: 290, y: 75, w: 160, kind: 'server', info: 'Ye kya hai: purane code (v1) wale servers. Inko sirf name column pata hai. Rolling deploy mein ye kai minute tak (canary mein ghante) chalta rehta hai, aur rollback pe phir se chalega.' },
        { id: 'v2', label: 'Servers v2', sub: 'naya code', x: 290, y: 265, w: 160, kind: 'server', hidden: true, info: 'Ye kya hai: naye code (v2) wale servers. Sahi tareeke mein ye dono columns mein likhta hai aur display_name padhta hai (khaali ho to name).' },
        { id: 'db', label: 'Users DB', sub: 'column: name', x: 590, y: 170, w: 180, kind: 'data', info: 'Ye kya hai: users table wala database, jise dono versions use karte hain. Code ka rollback seconds mein hota hai, schema ka nahi.' },
        { id: 'job', label: 'Migration job', sub: 'schema + backfill', x: 590, y: 300, w: 180, kind: 'queue', info: 'Ye kya hai: schema change aur backfill (purani rows mein data copy) chalane wala process. Backfill chhote batches mein, beech mein pause ke saath, taaki DB pe load na aaye.' },
      ],
      edges: [{ a: 'u', b: 'v1' }, { a: 'u', b: 'v2', id: 'uv2', hidden: true }, { a: 'v1', b: 'db' }, { a: 'v2', b: 'db', id: 'v2db', hidden: true }, { a: 'job', b: 'db' }],
      scenarios: [
        { name: 'Galat: ek jhatke mein rename', steps: [
          { title: 'Sab normal', text: 'Saare servers v1 hain aur name column padhte hain.', go: ['u>v1>db', 'res:db>v1>u'], msg: 'SELECT name FROM users WHERE id = 42' },
          { title: 'v2 deploy shuru, migration chali', text: 'v2 ke saath migration: column ka naam badal diya. Rolling deploy abhi 25% pe hai, 75% servers ab bhi v1.', show: ['v2', 'uv2', 'v2db'], go: 'job>db', after: { db: { state: 'warn', sub: 'column: display_name' } }, msg: 'ALTER TABLE users RENAME COLUMN name TO display_name;' },
          { title: 'v1 servers toote', text: 'v1 abhi bhi <code>name</code> maang raha hai. Column hai hi nahi. 75% requests pe 500 error.', go: ['u>v1>db', 'bad:db>v1>u'], after: { v1: { state: 'down', sub: '500: column nahi' } }, msg: 'ERROR: column "name" does not exist' },
          { title: 'Rollback bhi nahi bachata', text: 'Code ko v1 pe wapas le gaye. Lekin v1 ko <code>name</code> chahiye aur DB mein ab <code>display_name</code> hai. Ab sab servers toot gaye. Code ka rollback hua, schema ka nahi.', set: { v2: { state: 'down', sub: 'rollback → v1' } }, go: ['u>v1>db', 'bad:db>v1>u'], focus: ['db'] },
        ]},
        { name: 'Sahi: expand → migrate → contract', steps: [
          { title: 'Expand: naya column jodo', text: 'Sirf jodo, kuch hatao ya badlo mat. Nullable column jodna aam taur pe fast hai. v1 ko is column se koi matlab nahi, wo chalta rehta hai.', go: 'job>db', after: { db: { state: 'ok', sub: 'name + display_name' } }, msg: 'ALTER TABLE users ADD COLUMN display_name TEXT NULL;' },
          { title: 'v2 deploy: dono mein likho', text: 'v2 har write pe <em>dono</em> columns likhta hai, aur padhte waqt display_name, khaali ho to name. v1 aur v2 saath chal sakte hain. v2 mein bug? v1 pe rollback safe, kyunki name column zinda aur updated hai.', show: ['v2', 'uv2', 'v2db'], go: ['u>v2>db', 'res:db>v2>u'], after: { v2: { state: 'ok', sub: 'likhta: dono' } }, msg: 'UPDATE users SET name = $1, display_name = $1 WHERE id = 42' },
          { title: 'Migrate: purani rows backfill', text: 'Purani rows mein display_name khaali hai. Job unhe 1,000-1,000 ke batches mein bharta hai, beech mein ruk ruk ke, taaki DB pe load na aaye aur lambe locks na lagein.', go: ['job>db', 'res:db>job', 'job>db'], after: { db: { sub: 'backfill 100%' } }, msg: 'UPDATE users SET display_name = name WHERE display_name IS NULL AND id BETWEEN 1 AND 1000;' },
          { title: 'Sirf naya column use karo', text: 'Saare servers v2 pe aa gaye (v1 retire). Agla deploy (v3) sirf display_name padhta-likhta hai. Ab name column ko koi nahi chhoota.', set: { v1: { state: 'dim', sub: 'retired' } }, go: ['u>v2>db', 'res:db>v2>u'], after: { v2: { sub: 'v3: sirf display_name' } } },
          { title: 'Contract: purana column hatao', text: 'Kuch din wait (rollback ki zaroorat na pade, koi report ya doosri service name na padhti ho), phir drop. Har step pe site chali, har step pe rollback possible tha.', go: 'job>db', after: { db: { sub: 'display_name only' } }, msg: 'ALTER TABLE users DROP COLUMN name;' },
        ]},
      ],
    },
    { type: 'p', html: `Is pattern ko <strong>expand-contract</strong> ya <strong>parallel change</strong> kehte hain: pehle naya raasta jodo, sabko dheere dheere us pe le jao, phir purana hatao. Kuch aur rules:` },
    { type: 'list', items: [
      `<strong>Bade tables pe dhyaan</strong>: kuch ALTER commands poori table ko lock ya rewrite kar dete hain, aur crore rows pe minutes tak writes ruk jaati hain. Postgres mein index <code>CREATE INDEX CONCURRENTLY</code> se banao; MySQL mein gh-ost ya pt-online-schema-change jaise online tools use hote hain.`,
      `<strong>Code aur schema alag deploy karo</strong>: pehle schema expand (backward compatible), phir code. Migration aur code ek hi jhatke mein nahi.`,
      `<strong>Index hatana bhi migration hai</strong>: trace widget mein Recs ka DB query isi liye slow hua tha: kisi migration ne ek "unused" index hata diya tha. Destructive change se pehle query logs check karo.`,
    ]},

    { type: 'h2', text: 'Security: data, chaabiyan aur ijazat' },
    { type: 'p', html: `xyz.com ab bada hai: crore users ke emails, watch history, payments. Security ek feature nahi, har layer pe ek aadat hai. System design mein paanch cheezein zaroor bolni chahiye:` },

    { type: 'h3', text: 'Encryption in transit: TLS har jagah' },
    { type: 'p', html: `"TCP, UDP aur HTTPS" lesson mein dekha: <strong>TLS</strong> network pe jaate data ko encrypt karta hai, taaki raaste mein koi (cafe ka Wi-Fi, beech ka router) padh ya badal na sake. Browser ↔ xyz.com pe HTTPS to obvious hai. Lekin andar ka network?` },
    { type: 'callout', tone: 'term', title: 'Naye words: TLS, mTLS, zero trust', html: `<strong>TLS:</strong> network pe jaate data ko taale mein band karna (encrypt), taaki raaste mein koi padh ya badal na sake. HTTPS = HTTP + TLS.<br><strong>mTLS (mutual TLS):</strong> dono taraf certificate (digital pehchaan patra) dikhate hain, sirf server nahi. Isse Video service ko pakka pata hai ki call sach mein Recs service se aayi hai.<br><strong>Zero trust:</strong> "andar ka network bhi safe nahi maano"; har call pe pehchaan aur encryption.<br><strong>Iske bina:</strong> ek server hack hua to attacker andar ka saara traffic padh sakta hai, aur nakli service ban ke calls kar sakta hai.` },
    { type: 'list', items: [
      `Purani soch: "andar ka network safe hai, TLS sirf bahar." Problem: ek bhi server hack hua to attacker andar ka saara traffic padh sakta hai.`,
      `Aaj ki soch (<strong>zero trust</strong>): andar bhi encrypt karo. Services ke beech <strong>mTLS</strong> (mutual TLS): dono taraf certificate dikhate hain, to Video service ko pakka pata hai ki call sach mein Recs service se aayi hai. Service mesh (Istio, Linkerd) ye certificates apne aap banata aur rotate karta hai.`,
      `TLS aksar Load Balancer/gateway pe "terminate" hota hai (decrypt), phir andar dobara encrypt karke bhejte hain. Kahan terminate ho raha hai, ye design mein saaf likho.`,
    ]},

    { type: 'h3', text: 'Encryption at rest' },
    { type: 'p', html: `Disk pe pada data: database files, backups, S3 mein videos. Agar koi disk chura le, galti se backup public bucket mein chala jaaye, ya data center ka purana hard disk bina mitaaye bik jaaye, to bhi data bekaar dikhe. Cloud mein ye lagbhag ek checkbox hai (RDS, S3, EBS encryption), aur on rakhna chahiye.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Encryption at rest', html: `<strong>Ye kya hai:</strong> disk pe pade data (DB files, backups, S3 ke videos) ko encrypted rakhna.<br><strong>Kyun chahiye:</strong> disk chori ho, backup galti se public ho jaaye, ya purana hard disk bina mitaaye bik jaaye, to bhi data bekaar kachra dikhe.<br><strong>Iske bina:</strong> jisko file mili, usko data mil gaya.` },
    { type: 'callout', tone: 'term', title: 'Naye words: KMS aur envelope encryption', html: `<strong>Ye kya hai:</strong> data ko ek <strong>data key</strong> se encrypt karte hain. Data key ko ek <strong>master key</strong> se encrypt karke data ke saath hi rakh dete hain. Master key kabhi bahar nahi aati; wo <strong>KMS</strong> (Key Management Service, jaise AWS KMS, Google Cloud KMS) ke andar, hardware se protected rehti hai. Isko <strong>envelope encryption</strong> kehte hain: lifafe (data key) ke upar ek aur taala.<br><strong>Kyun chahiye:</strong> decrypt karna ho to KMS se data key "kholne" ko kehte ho, aur har aisi call log hoti hai. Kaun kab kya padh raha hai, sab record.<br><strong>Iske bina:</strong> key data ke paas hi padi rahegi, jaise taale ke saath chaabi latki ho.` },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion', html: `Encryption at rest <strong>hacker se nahi bachata jo tumhari app ke through aaya</strong>. App ke paas to key hai hi, wo data decrypt karke hi dikhati hai. Ye chori hui disk, galat backup aur cloud provider ke andar ke risks se bachata hai. App-level attacks ke liye authZ, least privilege aur input validation chahiye. Aur passwords ko encrypt nahi, <em>hash</em> karte hain (bcrypt/argon2), jaisa auth lesson mein dekha.` },

    { type: 'h3', text: 'Secrets management' },
    { type: 'callout', tone: 'term', title: 'Naya word: Secret', html: `<strong>Ye kya hai:</strong> koi bhi cheez jo mil jaaye to attacker tumhare system mein ghus sake: DB password, API keys (payment gateway, email service), JWT signing key, TLS private key, cloud access keys.<br><strong>Kyun sambhalna:</strong> ek leaked secret = attacker ke haath mein chaabi.<br><strong>Secrets manager</strong> (Vault, AWS Secrets Manager) inki tijori hai: encrypted, har read pe pehchaan check aur audit log.` },
    { type: 'p', html: `Sabse common galti: secret code mein ya config file mein likh ke Git mein commit. Git history kabhi kuch nahi bhoolti; file baad mein delete karo, purane commit mein secret zinda hai. Public repos mein leaked keys bots minutes mein dhoondh lete hain. Chala ke dekho:` },

    { type: 'flow', height: 320,
      nodes: [
        { id: 'dev', label: 'Developer', x: 85, y: 60, w: 130, kind: 'client', info: 'Ye kya hai: xyz.com ka engineer. Buri niyat se nahi, jaldi mein secret code mein likh deta hai: "abhi ke liye, baad mein theek karunga".' },
        { id: 'git', label: 'Git repo', sub: 'code + history', x: 300, y: 60, w: 150, kind: 'data', info: 'Ye kya hai: wo jagah jahan saara code aur uski poori history rehti hai. Kai log, CI systems, laptops aur kabhi kabhi galti se public. Secrets ke liye galat jagah.' },
        { id: 'att', label: 'Attacker', x: 560, y: 60, w: 140, kind: 'threat', info: 'Ye kya hai: koi bahar ka chor. Uske bots public repos, paste sites aur leaked logs mein lagatar keys dhoondhte rehte hain.' },
        { id: 'vault', label: 'Vault', sub: 'secrets manager', x: 330, y: 178, w: 150, kind: 'edge', info: 'Ye kya hai: secrets ki tijori: HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager. Har secret encrypted (KMS se), har read pe identity check aur audit log. Kuch secrets "dynamic" bhi bana sakti hai: har app ke liye alag, kuch der ke liye valid DB user.' },
        { id: 'app', label: 'Video service', x: 100, y: 268, w: 150, kind: 'server', info: 'Ye kya hai: xyz.com ki ek service jise DB password chahiye. Sahi tareeke mein ye Vault ko apni identity (Kubernetes service account ya cloud IAM role) dikha ke secret leti hai; code mein koi password nahi.' },
        { id: 'db', label: 'Videos DB', x: 590, y: 268, w: 150, kind: 'data', info: 'Ye kya hai: videos ka asli data. Aam taur pe internet se seedha reachable nahi hona chahiye (private network), lekin ye bhi ek hi layer hai; password leak phir bhi khatarnaak.' },
      ],
      edges: [{ a: 'dev', b: 'git' }, { a: 'git', b: 'att' }, { a: 'git', b: 'app' }, { a: 'app', b: 'vault' }, { a: 'vault', b: 'db' }, { a: 'app', b: 'db' }, { a: 'att', b: 'db' }],
      scenarios: [
        { name: 'Galat: secret code mein', steps: [
          { title: 'Password commit hua', text: 'Config file mein DB password likh ke commit. Kaam chal gaya.', go: 'dev>git', after: { git: { state: 'warn', sub: 'DB_PASSWORD andar!' } }, msg: 'config.yml:  db_password: "xyz@2024"' },
          { title: 'App deploy', text: 'Wahi code build hoke app mein gaya. App hamesha ek hi, kabhi na badalne wala password use karti hai.', go: ['git>app', 'app>db', 'res:db>app'] },
          { title: 'Repo leak', text: 'Ek din repo galti se public hua (ya ek purane laptop se copy hua). Bot ne minutes mein password pakad liya. File baad mein delete bhi karo, Git history mein zinda hai.', go: 'bad:git>att', set: { att: { state: 'hot', sub: 'password mil gaya' } } },
          { title: 'Seedha DB tak', text: 'Agar DB kisi bhi raaste reachable hai, attacker app ki tarah login kar leta hai: poora data. Aur password badalna = code badlo, har jagah redeploy.', go: 'bad:att>db', after: { db: { state: 'down', sub: 'data chori' } } },
        ]},
        { name: 'Sahi: Vault se short-lived secret', steps: [
          { title: 'App apni pehchaan dikhati hai', text: 'Code mein koi password nahi. App start hote hi Vault ko apni platform identity (jaise Kubernetes service account token) deti hai. Vault policy check karta hai: video-service sirf <code>db/videos</code> wala secret le sakti hai.', go: 'app>vault', set: { git: { sub: 'koi secret nahi' } }, msg: 'POST /v1/auth/kubernetes/login { role: "video-service", jwt: <service account token> }' },
          { title: 'Vault ek temporary DB user banata hai', text: '<strong>Dynamic secret</strong>: is app instance ke liye alag username/password, sirf 1 ghante ke liye valid.', go: 'vault>db', after: { db: { sub: 'user v-video-8f2 (1 h)' } } },
          { title: 'App ko secret milta hai', text: 'Sirf memory mein rakha, disk ya logs mein nahi. Ghanta khatam hone se pehle app naya le leti hai (rotation apne aap).', go: 'res:vault>app', after: { vault: { sub: 'audit: video-svc ne liya' } }, msg: '{ username: "v-video-8f2", password: "…", lease_duration: 3600 }' },
          { title: 'DB se baat, TLS pe', text: 'Sab normal chal raha hai, aur har secret read Vault ke audit log mein likha hai.', go: ['app>db', 'res:db>app'], after: { app: { state: 'ok' } } },
        ]},
        { name: 'Leak hua, ab kya?', intro: 'Ek bug ki wajah se app ne ek error log mein DB credentials print kar diye, aur log kisi galat jagah pahunch gaye.', steps: [
          { title: 'Attacker ke paas creds', text: 'Ye hota rehta hai. Sawaal ye hai ki nuksaan kitna bada hoga.', set: { att: { state: 'hot', sub: 'log se creds mile' }, db: { sub: 'user v-video-8f2' } }, focus: ['att'] },
          { title: 'Turant revoke', text: 'Security team Vault mein us lease ko revoke karti hai; Vault DB se wo user hata deta hai. App naya secret le leti hai, koi redeploy nahi. (Kuch na karte to bhi 1 ghante mein khud expire.)', go: 'vault>db', after: { db: { state: 'ok', sub: 'v-video-8f2 deleted' } } },
          { title: 'Attacker ka login fail', text: 'Leak hua, lekin chaabi ab kisi taale ki nahi. Audit log se pata bhi hai ki kab, kaunsa secret kisne liya tha.', go: ['att>db', 'bad:db>att'], after: { att: { state: 'down', sub: 'auth failed' } } },
        ]},
      ],
    },
    { type: 'list', items: [
      `<strong>Kabhi code ya Git mein nahi</strong>: secrets manager mein, ya kam se kam deploy ke time environment variables/mounted files se. Git pe secret-scanning tools (pre-commit hooks, GitHub secret scanning) lagao.`,
      `<strong>Short-lived aur rotate</strong>: jo secret 1 ghante mein expire ho, uska leak 1 ghante ka nuksaan hai. Jo kabhi nahi badalta, uska leak hamesha ka.`,
      `<strong>Har service ka alag secret</strong>: ek leak hone pe sirf usi ka darwaza khule, sabka nahi.`,
    ]},

    { type: 'h3', text: 'RBAC aur least privilege' },
    { type: 'callout', tone: 'term', title: 'Naye words: RBAC aur least privilege', html: `<strong>RBAC (Role-Based Access Control):</strong> ijazat seedhe logon ko nahi, <em>roles</em> ko do ("video-service", "on-call engineer"), phir log/services ko role do.<br><strong>Least privilege:</strong> har insaan aur service ko sirf utni ijazat jitni kaam ke liye zaroori, utni der ke liye jitni zaroori.<br><strong>Kyun chahiye:</strong> koi ek cheez hack ho to nuksaan (blast radius) chhota rahe.<br><strong>Iske bina:</strong> ek hacked service = poora database.` },
    { type: 'p', html: `Auth lesson mein RBAC users ke liye dekha tha (user, moderator, admin). Wahi idea andar ke logon aur <em>services</em> pe bhi lagta hai. <strong>Least privilege</strong> ka rule: har insaan aur har service ko sirf utni ijazat jitni uske kaam ke liye zaroori hai, utni der ke liye jitni zaroori hai.` },
    { type: 'table', head: ['Kaun', 'Galat (zyada ijazat)', 'Sahi (least privilege)'], rows: [
      ['Video service', 'DB ka admin user, saari tables', 'Sirf <code>videos</code> tables pe read/write, DROP nahi'],
      ['Recs service', 'Saare S3 buckets ka access', 'Sirf <code>recs-models</code> bucket, read-only'],
      ['Naya engineer', 'Production DB ka direct access, hamesha', 'Staging ka access; production sirf zaroorat pe, approval ke saath, kuch ghanton ke liye ("just-in-time")'],
      ['CI/CD pipeline', 'Cloud account ka root key', 'Sirf deploy karne ki role, alag har environment ke liye'],
    ]},
    { type: 'p', html: `Fayda: koi ek service ya ek laptop hack hua to <strong>blast radius</strong> chhota. Recs service hack hui to bhi attacker payments table nahi padh sakta.` },

    { type: 'h3', text: 'Audit logs' },
    { type: 'p', html: `<strong>Audit log</strong> = "kisne, kab, kya kiya" ka record: kisne admin panel se user ban kiya, kisne production DB ka access liya, kisne permission badli, kisne secret padha. Normal debugging logs se alag: ye <strong>append-only</strong> hone chahiye (koi edit ya delete na kar sake, admin bhi nahi), alag account/storage mein rakhe jaate hain, aur lambe samay tak (compliance ke hisaab se mahino-saalon). Kuch galat hone pe pehla sawaal yahi hota hai: "ye kisne kiya?". Audit log nahi to jawab nahi.` },
    { type: 'callout', tone: 'warn', title: 'Logs mein secrets aur personal data mat daalo', html: `Observability aur security yahan takraate hain. Request body log karne ka shauk: password, OTP, card number, tokens sab logs mein chale jaate hain, aur logs ko bahut saare log padh sakte hain. Logging library mein sensitive fields mask/redact karo.` },
    { type: 'p', html: `Ab paancho ko saath jodo. Neeche xyz.com ke 8 asli khatre hain. Controls on/off karo aur dekho kaunsa control kis khatre se bachata hai, aur kis se <em>nahi</em>:` },
    { type: 'custom', render(el) {
      const C = [['tls', 'TLS bahar (HTTPS)'], ['mtls', 'mTLS andar'], ['rest', 'Encryption at rest'], ['vault', 'Secrets manager'], ['lp', 'Least privilege'], ['audit', 'Audit logs']];
      const T = [
        ['Cafe Wi-Fi pe koi user ka password padhe', 'tls', 'Bahar ka traffic encrypted: sniffer ko sirf kachra dikhta hai.'],
        ['Hack hua server andar ka traffic sune', 'mtls', 'Andar bhi encryption: chura ke bhi kuch padh nahi sakta.'],
        ['Nakli service Payments ko call kare', 'mtls', 'Payments certificate maangta hai; nakli ke paas sahi certificate nahi.'],
        ['Purani disk ya backup galat haath mein', 'rest', 'Disk pe data encrypted, key KMS mein: file mili, data nahi.'],
        ['Git repo leak, usme DB password', 'vault', 'Code mein koi password tha hi nahi; secrets short-lived hain.'],
        ['Recs service hack, payments table padhna', 'lp', 'Recs ke role ko payments table ki ijazat hi nahi.'],
        ['Kisi ne admin panel se users delete kiye: kisne?', 'audit', 'Append-only audit log mein naam, time aur action likha hai. (Rokta nahi, pakadta hai.)'],
        ['App ke bug (SQL injection) se data chori', null, 'Koi ek control poora nahi bachata: app ke paas key aur ijazat dono hain. Least privilege nuksaan chhota karta hai; asli ilaaj input validation aur code review.'],
      ];
      let on = { tls: 1 };
      el.innerHTML = `<div class="chips sc-c" role="group" aria-label="Controls"></div><div class="sc-t" style="display:flex;flex-direction:column;gap:6px;margin-top:10px"></div>
        <div class="stats"><div class="stat"><span>Khatre jinse bache</span><strong class="sc-n"></strong></div></div><div class="calc-note sc-note"></div>`;
      const $ = c => el.querySelector(c);
      const upd = () => {
        $('.sc-c').innerHTML = C.map(([k, n]) => `<button type="button" class="chip${on[k] ? ' on' : ''}" data-k="${k}">${n}</button>`).join('');
        el.querySelectorAll('.sc-c .chip').forEach(b => b.onclick = () => { on[b.dataset.k] = !on[b.dataset.k]; upd(); });
        let n = 0;
        $('.sc-t').innerHTML = T.map(([t, k, why]) => {
          const safe = k ? !!on[k] : false, part = !k && on.lp; if (safe) n++;
          const col = safe ? 'var(--green)' : part ? 'var(--amber)' : 'var(--red)';
          return `<div style="border:1px solid var(--line);border-left:4px solid ${col};border-radius:var(--r-sm);padding:6px 10px;font-size:14px"><strong style="color:var(--ink)">${t}</strong><br><span style="color:var(--ink-2)">${safe ? '✓ ' + why : part ? '~ ' + why : k ? '✗ Bachane wala control: ' + C.find(c => c[0] === k)[1] : '✗ ' + why}</span></div>`;
        }).join('');
        $('.sc-n').textContent = n + ' / 8';
        $('.sc-note').textContent = n === 7 ? 'Saare controls on: 8 mein se 7 khatre bache. Aakhri (app ka bug) yaad dilata hai ki security layers mein hoti hai; koi ek checkbox kaafi nahi.' : 'Har control ek alag khatre ke liye hai. Encryption at rest Wi-Fi sniffing se nahi bachata, aur TLS chori hui disk se nahi. Isliye sab chahiye.';
      };
      upd();
    }},

    { type: 'h2', text: 'Multi-region aur disaster recovery' },
    { type: 'p', html: `Availability lesson mein AZs dekhe: ek data center gire to doosra. Lekin <em>poora region</em> gir sakta hai (bada network ya power issue), ya usse bhi aam: koi engineer galti se production table delete kar de, ya ransomware data encrypt kar de. Inse bachne ke plan ko <strong>disaster recovery (DR)</strong> kehte hain. Do numbers se plan shuru hota hai:` },
    { type: 'callout', tone: 'term', title: 'Naya word: Disaster recovery (DR)', html: `<strong>Ye kya hai:</strong> bade haadse (region band, data galti se delete, ransomware) ke baad system ko wapas chalu karne ka pehle se likha plan, aur uske liye tayyar rakhi cheezein (backups, doosre region ka setup).<br><strong>Kyun chahiye:</strong> haadse ke waqt sochne ka time nahi hota.<br><strong>Iske bina:</strong> "backup kahan hai? password kiske paas?" mein ghante nikal jaate hain.` },
    { type: 'callout', tone: 'term', title: 'Naye words: RPO aur RTO', html: `<strong>RPO (Recovery Point Objective):</strong> disaster ke baad <em>kitna data khona</em> chalega, time mein naapa jaata hai. RPO 1 ghanta = "pichhle 1 ghante ka data kho gaya to bhi chalega." Jaise game ka aakhri save point kitna purana ho sakta hai.<br><strong>RTO (Recovery Time Objective):</strong> <em>kitni der band</em> rehna chalega. RTO 15 minute = "15 minute mein wapas chalu hona chahiye."<br><strong>Kaun tay karta hai:</strong> dono business decide karta hai; engineers unke hisaab se strategy chunte hain. Jitne chhote RPO/RTO, utna mehenga setup.` },
    { type: 'ascii', text: `
 last backup /           DISASTER            wapas chalu
 replication point          │                     │
──────●─────────────────────✖─────────────────────●──────▶ time
      │←──── data loss ────→│←──── downtime ─────→│
            (RPO isse                (RTO isse
            bada nahi)               bada nahi)` },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: replication backup nahi hai', html: `"Hamare paas replica hai, to backup ki kya zaroorat?" Replica <em>har</em> change copy karta hai, galat change bhi. Kisi ne <code>DELETE FROM users</code> chala diya to second bhar mein replica se bhi gayab. Isliye replication (hardware/region failure ke liye) <strong>aur</strong> point-in-time backups (galti, corruption, ransomware ke liye), dono chahiye. Aur backups alag account/region mein, taaki jo production ko tod de wo backups ko na chhoo sake.` },

    { type: 'h3', text: 'Chaar DR strategies (AWS whitepaper ki categories)' },
    { type: 'p', html: `AWS ka disaster recovery whitepaper strategies ko chaar seedhiyon mein baant-ta hai, sasti aur dheemi se mehengi aur fast tak. Uska chart RPO/RTO ko aise dikhata hai: backup &amp; restore <strong>ghante</strong>, pilot light <strong>das-bees minute</strong> (tens of minutes), warm standby <strong>minutes</strong>, multi-site active/active <strong>near real-time</strong>. Neeche strategy chuno aur dekho doosre region mein kya chalu rehta hai, phir apni RPO/RTO zaroorat daal ke sabse sasti fit strategy dhoondho:` },
    { type: 'custom', render(el) {
      const S = {
        br: { n: 'Backup & restore', cat: 'ghante', rpo: 3600, rto: 4 * 3600, cost: 'Sabse kam (sirf backup storage)', dr: [['Backups', 1], ['Database', 0], ['App servers', 0], ['Load Balancer', 0]], how: 'Doosre region mein sirf backups (DB snapshots, S3 copies) aur infrastructure-as-code. Disaster pe poora setup banao, backup restore karo, DNS switch.', rpoTxt: 'aakhri backup tak ka data (yahan hourly snapshots maane)' },
        pl: { n: 'Pilot light', cat: 'tens of minutes', rpo: 5, rto: 30 * 60, cost: 'Kam-medium', dr: [['Backups', 1], ['Database', 1], ['App servers', 0], ['Load Balancer', 0]], how: 'Data hamesha live replicate hota hai (DB replica chalu). App servers configured hain par band. Disaster pe servers chalu karo, scale karo, traffic switch.', rpoTxt: 'async replication lag, aam taur pe seconds' },
        ws: { n: 'Warm standby', cat: 'minutes', rpo: 5, rto: 5 * 60, cost: 'High', dr: [['Backups', 1], ['Database', 1], ['App servers', 2], ['Load Balancer', 1]], how: 'Poora system chhote size mein chalu hai aur requests le sakta hai. Disaster pe sirf scale up aur traffic switch.', rpoTxt: 'async replication lag, aam taur pe seconds' },
        aa: { n: 'Multi-site active/active', cat: 'near real-time', rpo: 1, rto: 30, cost: 'Sabse zyada (~2 poore regions + complexity)', dr: [['Backups', 1], ['Database', 1], ['App servers', 1], ['Load Balancer', 1]], how: 'Dono regions poore size mein live traffic le rahe hain. Ek gira to health checks traffic doosre pe bhej dete hain, koi "failover" step nahi. Lekin dono regions mein writes ka conflict sambhalna padta hai.', rpoTxt: 'async lag (~second); zero ke liye synchronous replication' },
      };
      const ORDER = ['br', 'pl', 'ws', 'aa'];
      const RPO_OPT = [[0, 'Zero (ek bhi write nahi khona)'], [60, '1 minute'], [900, '15 minute'], [3600, '1 ghanta'], [86400, '24 ghante']];
      const RTO_OPT = [[60, '1 minute'], [600, '10 minute'], [3600, '1 ghanta'], [4 * 3600, '4 ghante'], [86400, '24 ghante']];
      const fmt = s => s < 60 ? '~' + s + ' s' : s < 3600 ? '~' + Math.round(s / 60) + ' min' : (s === 3600 ? '~1 ghanta' : '~' + (s / 3600).toFixed(s % 3600 ? 1 : 0) + ' ghante');
      el.innerHTML = `<div class="op-dr-s" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:12px">
          <div style="flex:1 1 220px;border:1px solid var(--line);border-radius:var(--r);padding:10px"><div style="font:600 13px var(--f-mono);color:var(--ink-3);margin-bottom:6px">PRIMARY REGION (Mumbai)</div><div class="op-dr-p" style="display:flex;flex-wrap:wrap;gap:6px"></div></div>
          <div style="flex:1 1 220px;border:1px solid var(--line);border-radius:var(--r);padding:10px"><div style="font:600 13px var(--f-mono);color:var(--ink-3);margin-bottom:6px">DR REGION (Singapore)</div><div class="op-dr-d" style="display:flex;flex-wrap:wrap;gap:6px"></div></div>
        </div>
        <div class="op-dr-how calc-note"></div>
        <label style="display:block;margin-top:12px">Disaster aakhri hourly backup ke <strong class="op-dr-tv"></strong> minute baad hua</label><input class="op-dr-t" type="range" min="0" max="59" step="1" value="47">
        <div class="stats">
          <div class="stat"><span>Data loss (RPO)</span><strong class="op-dr-rpo"></strong></div>
          <div class="stat"><span>Downtime (RTO)</span><strong class="op-dr-rto"></strong></div>
          <div class="stat"><span>AWS category</span><strong class="op-dr-cat"></strong></div>
          <div class="stat"><span>Cost</span><strong class="op-dr-cost" style="font-size:16px"></strong></div>
        </div>
        <div style="margin-top:18px;padding-top:12px;border-top:1px dashed var(--line);font-weight:600">Business ki zaroorat se strategy chuno</div>
        <div class="row2">
          <div><label>Max data loss (RPO): <strong class="op-dr-qrv"></strong></label><input class="op-dr-qr" type="range" min="0" max="4" step="1" value="2"></div>
          <div><label>Max downtime (RTO): <strong class="op-dr-qtv"></strong></label><input class="op-dr-qt" type="range" min="0" max="4" step="1" value="2"></div>
        </div>
        <div class="op-dr-rec calc-note" style="font-size:15.5px"></div>
        <div class="calc-note" style="font-size:13.5px">RPO/RTO yahan har category ke andar ke rough example numbers hain (backup &amp; restore ~4 ghante, pilot light ~30 min, warm standby ~5 min, active/active ~30 s); asli numbers tumhare data size, automation aur testing pe depend karte hain.</div>`;
      let cur = 'pl';
      const box = (name, st) => `<span style="flex:1 1 90px;text-align:center;padding:6px 4px;border-radius:var(--r-sm);font-size:13px;border:1.5px ${st ? 'solid' : 'dashed'} ${st ? 'var(--green)' : 'var(--line-2)'};background:${st ? 'var(--surface)' : 'transparent'};color:${st ? 'var(--ink)' : 'var(--ink-3)'}">${name}${st === 2 ? ' (chhota)' : st ? '' : ' (band)'}</span>`;
      const pick = (rpo, rto) => ORDER.find(k => S[k].rpo <= rpo && S[k].rto <= rto);
      const draw = () => {
        const s = S[cur], t = Number(el.querySelector('.op-dr-t').value);
        const sb = el.querySelector('.op-dr-s'); sb.innerHTML = '';
        ORDER.forEach(k => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (k === cur ? ' on' : ''); b.textContent = S[k].n; b.onclick = () => { cur = k; draw(); }; sb.appendChild(b); });
        el.querySelector('.op-dr-p').innerHTML = [['Backups', 1], ['Database', 1], ['App servers', 1], ['Load Balancer', 1]].map(([n, v]) => box(n, v)).join('');
        el.querySelector('.op-dr-d').innerHTML = s.dr.map(([n, v]) => box(n, v)).join('');
        el.querySelector('.op-dr-how').textContent = s.how;
        el.querySelector('.op-dr-tv').textContent = t;
        el.querySelector('.op-dr-rpo').textContent = cur === 'br' ? (t ? t + ' min' : '~0 (backup abhi hua tha)') : fmt(s.rpo);
        el.querySelector('.op-dr-rto').textContent = fmt(s.rto);
        el.querySelector('.op-dr-cat').textContent = s.cat;
        el.querySelector('.op-dr-cost').textContent = s.cost;
        const qr = RPO_OPT[el.querySelector('.op-dr-qr').value], qt = RTO_OPT[el.querySelector('.op-dr-qt').value];
        el.querySelector('.op-dr-qrv').textContent = qr[1];
        el.querySelector('.op-dr-qtv').textContent = qt[1];
        const k = pick(qr[0], qt[0]);
        el.querySelector('.op-dr-rec').innerHTML = k
          ? `Sabse sasti strategy jo dono pe fit hai: <strong>${S[k].n}</strong> (RPO ${fmt(S[k].rpo)}, RTO ${fmt(S[k].rto)}).`
          : `Koi bhi async strategy fit nahi. Zero data loss ke liye <strong>synchronous replication</strong> chahiye: har write doosri jagah confirm hone ke baad hi "done". Region door hai to har write pe ~tens of ms extra latency. Isliye "zero" bahut kam systems ke liye (jaise payments ledger) chunte hain.`;
      };
      ['.op-dr-t', '.op-dr-qr', '.op-dr-qt'].forEach(c => el.querySelector(c).addEventListener('input', draw));
      draw();
    }},

    { type: 'p', html: `Example: RPO 15 minute aur RTO 1 ghanta pe <strong>pilot light</strong> aata hai. RTO 10 minute karo to <strong>warm standby</strong>, 1 minute karo to <strong>active/active</strong>. RPO 1 ghanta aur RTO 4 ghante chal jaaye to sasta <strong>backup &amp; restore</strong> kaafi hai. Aur RPO "zero" pe koi async strategy fit nahi hoti.` },
    { type: 'list', items: [
      `<strong>Har system ko same tier nahi chahiye</strong>: xyz.com pe video playback aur login warm standby/active-active pe, lekin analytics reports aur admin tools backup &amp; restore pe. Tiering se paisa bachta hai.`,
      `<strong>Active/active ka asli dard data hai</strong>: do regions mein ek hi user ka data ek saath badla to kaun jeete? Common raaste: saare writes ek region mein ("write global"), ya har user ka "home region" (partition by user), ya last-writer-wins jaisa conflict rule. Replication aur consistency lessons yahin kaam aate hain.`,
      `<strong>Traffic switch</strong>: DNS (health checks ke saath) ya global load balancer/anycast se. DNS ka TTL lamba hai to clients purana address yaad rakhte hain, isliye failover wale records ka TTL chhota rakhte hain.`,
    ]},
    { type: 'h3', text: 'Failover drills: jo test nahi hua, wo kaam nahi karega' },
    { type: 'p', html: `Sabse bada DR jhooth: "hamare paas backups hain". Kya kabhi restore karke dekha? Kitna time laga? Restore ka password kiske paas hai? Isliye teams regular <strong>DR drills</strong> (ya game days) karti hain: planned time pe sach mein ek region "band" maan ke failover karo, ya backup ko naye environment mein restore karke time naapo. Jo RTO kaagaz pe 30 minute tha, drill mein aksar 3 ghante nikalta hai, aur wahi seekh hai. AWS whitepaper bhi yahi kehta hai: failover ke steps automate karo, taaki chahe manual trigger ho, wo ek button jaisa ho, aur regularly test karo.` },
    { type: 'callout', tone: 'tip', title: 'Automatic ya manual failover?', html: `Poore region ka failover data loss (RPO &gt; 0) aur kuch downtime laata hai. Galat alarm pe automatic failover khud ek outage ban sakta hai. Isliye kai teams region-level failover <strong>insaan ke decision</strong> pe rakhti hain, lekin steps poori tarah automated (ek command/button). Chhoti cheezein (ek server, ek AZ) automatic failover pe.` },

    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `Roadmap ka message: design tab tak poora nahi jab tak tum use <strong>dekh</strong> na sako, <strong>safely ship</strong> na kar sako aur <strong>secure</strong> na kar sako. Har design ke end mein 2 minute ye bolo: <strong>(1)</strong> har request pe trace ID, RED metrics, aur user-facing SLI pe SLO + burn-rate alerts; <strong>(2)</strong> canary (ya rolling) deploy with automatic rollback, risky features flags ke peeche, aur schema changes expand → migrate → contract; <strong>(3)</strong> TLS har jagah, encryption at rest, secrets vault mein, least-privilege roles, audit logs; <strong>(4)</strong> business ke RPO/RTO se DR strategy, aur uski drills.` },
    { type: 'table', head: ['Situation', 'Choice'], rows: [
      ['"Kaunsi service slow hai?"', 'Distributed tracing + correlation/trace ID (OpenTelemetry)'],
      ['"Kab jagaayein?"', 'SLO pe symptom-based, multi-window burn-rate alerts; baaki tickets'],
      ['Chhota team, chhota traffic', 'Rolling deploy + health checks + feature flags'],
      ['Bada traffic, user-facing, risky change', 'Canary with automatic metric analysis aur rollback'],
      ['Instant rollback chahiye, 2x infra afford', 'Blue-green'],
      ['Column rename/hatana, table split', 'Expand → migrate (dual write + backfill) → contract'],
      ['Koi bhi password/API key', 'Secrets manager, short-lived, per-service, kabhi Git mein nahi'],
      ['RPO/RTO: ghante', 'Backup &amp; restore (cross-region backups, tested restores)'],
      ['RPO seconds, RTO ~das-bees minute / minutes', 'Pilot light / warm standby'],
      ['RTO ~0, revenue-critical', 'Multi-site active/active (aur conflict handling ka plan)'],
    ]},

    { type: 'diagram', title: 'xyz.com ko chalana: poori picture', height: 610,
      nodes: [
        { id: 'users', label: 'Users', sub: 'app + website', x: 360, y: 50, w: 160, kind: 'client', info: 'Ye kya hai: xyz.com ke users. Unka har request HTTPS (TLS) pe aata hai, taaki raaste mein koi padh na sake.' },
        { id: 'lb', label: 'Gateway + LB', sub: 'TLS, trace ID', x: 360, y: 160, w: 180, kind: 'edge', info: 'Ye kya hai: pehla darwaza. TLS yahan khulta hai, har request ko trace ID milti hai, aur canary ke liye traffic 99% / 1% mein baanta jaata hai.' },
        { id: 'v1', label: 'Video svc v1', sub: '99% traffic', x: 130, y: 280, w: 160, kind: 'server', info: 'Ye kya hai: purana, bharose wala version. Zyaadatar traffic yahin. Canary fail ho to saara traffic wapas yahin.' },
        { id: 'v2', label: 'Video svc v2', sub: 'canary 1%', x: 360, y: 280, w: 160, kind: 'server', info: 'Ye kya hai: naya version, sirf 1% traffic pe. Iske metrics v1 se compare hote hain; bigde to automatic rollback.' },
        { id: 'flag', label: 'Flag service', sub: 'shorts_tab 10%', x: 600, y: 280, w: 150, kind: 'edge', info: 'Ye kya hai: feature flags ka config. Code poocha hai "is user ke liye shorts_tab on?"; bina deploy ke on/off aur % rollout.' },
        { id: 'db', label: 'Videos DB', sub: 'encrypted at rest', x: 130, y: 400, w: 160, kind: 'data', info: 'Ye kya hai: Mumbai region ka primary database. Disk encrypted (KMS key), services ka least-privilege user, schema changes expand-contract se.' },
        { id: 'vault', label: 'Vault + KMS', sub: 'secrets, keys', x: 360, y: 400, w: 160, kind: 'edge', info: 'Ye kya hai: secrets ki tijori aur keys ka ghar. Services apni pehchaan dikha ke short-lived DB password lete hain; har read audit log mein.' },
        { id: 'otel', label: 'OTel collector', sub: 'logs/metrics/traces', x: 600, y: 400, w: 150, kind: 'queue', info: 'Ye kya hai: har service ke logs, metrics aur spans jama karne wala beech ka process. Sampling yahin hoti hai, phir backend ko bhejta hai.' },
        { id: 'obs', label: 'Observability', sub: 'SLO + burn alerts', x: 600, y: 520, w: 150, kind: 'data', info: 'Ye kya hai: dashboards, trace waterfall, log search, aur SLO burn-rate alerts. Canary bigde to rollback ka signal yahin se.' },
        { id: 'dr', label: 'DR region', sub: 'Singapore, warm', x: 130, y: 550, w: 160, kind: 'data', info: 'Ye kya hai: doosre region mein warm standby: DB ki async replica aur chhota chalu setup. Mumbai gira to scale up + traffic switch (RTO minutes).' },
        { id: 'bak', label: 'Backups', sub: 'other account', x: 360, y: 550, w: 160, kind: 'data', info: 'Ye kya hai: point-in-time backups alag account mein. Replica galat DELETE bhi copy kar leti hai; backup us se pehle ka data wapas laata hai.' },
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
        { name: 'Request + trace', text: 'HTTPS se gateway, trace ID bani, v1 ne mTLS pe DB se data liya.', go: ['users>lb>v1>db'] },
        { name: 'Canary rollback', text: '1% traffic v2 pe; uske spans aur metrics observability mein; SLO bigda to gateway ne v2 ka traffic 0% kiya.', go: ['users>lb>v2>otel>obs', 'obs>lb'] },
        { name: 'Flag + secret', text: 'v2 flag service se poochta hai feature on hai ya nahi, aur Vault se short-lived DB password leta hai.', go: ['v2>flag', 'v2>vault'] },
        { name: 'Disaster', text: 'DB ki replica doosre region mein (region failure ke liye) aur backups alag account mein (galti/ransomware ke liye).', go: ['db>dr', 'db>bak'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Logs = kya hua (detail), metrics = kitna/trend (saste, alerts), traces = kahan time gaya. Teeno trace ID se jude.</li>
      <li>Metric labels mein user_id jaisi cheez nahi: har label series ko guna karta hai (cardinality).</li>
      <li>SLI = user ki khushi ka number, SLO = andar ka target, SLA = contract (SLO se dheela). Error budget = 1 − SLO.</li>
      <li>Alert symptom pe, burn rate ke hisaab se (14.4x/1h page, 1x/3 din ticket); har alert actionable aur runbook ke saath.</li>
      <li>Rolling = batches, blue-green = do environment + switch, canary = chhota % + automatic rollback. Feature flag = deploy aur release alag.</li>
      <li>Schema change: expand → migrate (dual write + backfill) → contract. Code rollback hota hai, schema ka nahi.</li>
      <li>Security layers mein: TLS/mTLS, encryption at rest (KMS), secrets manager, least privilege, audit logs.</li>
      <li>RPO = kitna data kho sakte, RTO = kitni der band. Replication backup nahi hai; DR drills se hi plan sach hota hai.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['Problem minutes mein pakad aati hai (traces, metrics), andaze se nahi', 'Reliability aur feature speed ek number (error budget) pe agree', 'Bug ka blast radius chhota (canary 1%), rollback seconds mein', 'Schema change bina downtime aur bina rollback-trap ke', 'Leak ya hack ka nuksaan seemit (short-lived secrets, least privilege, audit trail)', 'Region gire to bhi business ki tay ki hui RPO/RTO ke andar wapas'],
      costs: ['Observability ka bill: logs aur traces ka storage aksar bada kharcha ban jaata hai (sampling, retention sochna padta hai)', 'Canary/blue-green ke liye achhe metrics, automation aur kabhi 2x infra', 'Expand-contract mein ek change ke 3-5 deploys aur dinon ka time', 'Feature flags aur secrets manager: naye systems jo khud highly available hone chahiye', 'DR strategy jitni fast, utni mehengi; active/active mein data conflicts ki complexity', 'Drills aur on-call: insaano ka time'] },

    { type: 'think', questions: [
      { q: 'Dashboard pe average latency 80 ms hai, sab green. Phir bhi support ke paas "app slow hai" ki shikayatein aa rahi hain. Kya dekhoge?', a: 'Average tail ko chhupa deta hai. p99 (aur p99.9) dekho, aur endpoint/region/app version ke hisaab se tod ke dekho. Phir shikayat wale users ki ek slow request ka trace kholo (trace ID se) aur dekho kaunsa span time kha raha hai. SLI bhi user-facing latency pe hona chahiye, average pe nahi.' },
      { q: 'Mahine ke 20 din mein hi xyz.com ka 99.9% SLO wala error budget khatam ho gaya. Product team kal ek bada naya feature launch karna chahti hai. Kya hona chahiye?', a: 'Error budget policy ke hisaab se naye risky releases rukne chahiye aur team reliability fixes (jo outages ki wajah thi) pe lage, jab tak window mein budget wapas na aaye. Exception (jaise legal deadline) ho to explicitly decide karo, aur launch ko flag ke peeche, canary ke saath, chhote % se karo. Point ye hai ki ye faisla pehle se likhi policy se ho, behes se nahi.' },
      { q: 'Team ko ek Postgres table mein email column pe UNIQUE constraint lagana hai, table mein 5 crore rows hain aur kuch duplicates bhi hain. Zero-downtime plan kya hoga?', a: 'Pehle duplicates dhoondh ke saaf karo (batches mein), aur app code ko aisa banao ki naye duplicates na bane (expand: code pehle). Phir unique index CONCURRENTLY banao, jo table ko writes ke liye lock nahi karta (fail ho to invalid index hata ke dobara). Index ban jaaye to us index ko use karke constraint jodo. Har step alag deploy, har step pe rollback possible.' },
      { q: 'CTO bolta hai: "Hum active/active multi-region karenge, to backups ki zaroorat nahi." Tum kya jawab doge?', a: 'Active/active region failure se bachata hai, galti se nahi. Galat DELETE, buggy migration ya ransomware dono regions mein replicate ho jaayega. Point-in-time backups, alag account mein, aur unke restore ki regular drills phir bhi zaroori hain. AWS whitepaper bhi yahi kehta hai ki data corruption ke case mein recovery point disaster pakde jaane se pehle ka hi hoga.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Ek request 5 services se guzri. Ek service ki saari log lines aur spans ek saath kaise milti hain?', options: ['Har service ke server ka timestamp match karke', 'Gateway pe bani trace/correlation ID jo har call ke header mein aage jaati hai', 'User ke IP address se'], answer: 1, explain: 'Context propagation: traceparent header ke through ek hi trace ID har service tak, aur har log/span mein likhi jaati hai.' },
      { q: 'SLO 99.9% over 30 din. Poori site band ho to kitna downtime budget hai?', options: ['~4.3 minute', '~43 minute', '~7.2 ghante'], answer: 1, explain: '0.1% × 30 × 24 × 60 = 43.2 minute. 99.99% pe 4.32 minute, 99% pe 7.2 ghante.' },
      { q: 'SLA aur SLO mein sahi baat?', options: ['SLA hamesha SLO se strict hota hai', 'SLA customer contract hai jismein consequences hain, aur aam taur pe SLO se dheela rakhte hain', 'Dono same cheez ke do naam hain'], answer: 1, explain: 'SLO andar ka target hai. SLA tootne pe paise/credits dene padte hain, isliye SLA ko SLO se neeche rakhte hain taaki pehle chetavni mile.' },
      { q: 'Canary ka sabse bada fayda kya hai?', options: ['Deploy ke liye extra servers nahi lagte', 'Bug pehle sirf chhote % users tak pahunchta hai aur metrics bigadte hi automatic rollback', 'Database migration apne aap ho jaata hai'], answer: 1, explain: 'Blast radius chhota aur rollback fast. Lekin iske liye achhe metrics aur automatic analysis chahiye.' },
      { q: 'Rolling deploy ke dauraan ek migration ne column rename kar diya. Kya hoga?', options: ['Kuch nahi, ORM sambhal lega', 'Purane version wale servers toot jaayenge, aur code rollback se bhi wapas theek nahi hoga', 'Sirf naye servers tootenge'], answer: 1, explain: 'Purana aur naya code ek saath chalte hain. Isliye expand (naya column jodo) → migrate (dual write + backfill) → contract (purana hatao).' },
      { q: 'Business bolta hai: "15 minute ka data loss chalega, 1 ghante tak band reh sakte hain." Sabse sasti fit strategy?', options: ['Backup & restore', 'Pilot light', 'Multi-site active/active'], answer: 1, explain: 'Backup & restore ka RTO ghanton mein hai aur hourly backups pe RPO 1 ghanta tak. Pilot light mein data live replicate hota hai (RPO seconds) aur RTO das-bees minute, to dono shartein poori. Active/active fit to hai, par bekaar mehenga.' },
      { q: '99.9% SLO pe error rate 2% chal rahi hai. Burn rate kitna, aur kya karna chahiye?', options: ['2x, ticket', '20x, page: budget ~1.5 din mein khatam', '0.2x, kuch nahi'], answer: 1, explain: 'Burn rate = 2% / 0.1% = 20. 30 din / 20 = 1.5 din mein mahine ka budget gaya. 14.4x se upar: page.' },
      { q: 'Feature flag ka percentage rollout 5% se 10% kiya. Pehle wale 5% users ka kya hoga?', options: ['Naye random users chune jaayenge, purane OFF ho sakte hain', 'Wo ON hi rahenge, kyunki unka hash bucket nahi badalta', 'Sabke liye flag reset'], answer: 1, explain: 'bucket = hash(flag + user) % 100. Bucket < 5 wale bucket < 10 mein bhi hain: rollout sticky aur badhta hua.' },
      { q: 'Kisi ne data center se ek purani disk chura li. Kaunsa control bachata hai?', options: ['TLS', 'Encryption at rest (key KMS mein)', 'Feature flags'], answer: 1, explain: 'TLS sirf network pe chalte data ko bachata hai. Disk pe pada data encryption at rest se bachta hai; key KMS mein hai, disk ke saath nahi gayi.' },
      { q: 'Database ka password rakhne ki sabse sahi jagah?', options: ['config.yml in Git, private repo hai to safe', 'Secrets manager, jo app ko uski identity dekh ke short-lived credentials de', 'Docker image ke andar'], answer: 1, explain: 'Git aur images copy hote rehte hain aur history kabhi nahi bhoolti. Secrets manager: encrypted, per-service access, rotation, audit log.' },
    ]},
    { type: 'sources', note: 'Definitions, numbers aur categories inhi sources se check kiye gaye. Widgets ke traffic, error rates aur RPO/RTO example numbers samjhane ke liye banaye gaye simple, seeded models hain.', items: [
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
