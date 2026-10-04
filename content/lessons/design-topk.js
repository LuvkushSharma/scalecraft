Lesson.register({
  id: 'design-topk',
  title: 'Top-K aur leaderboards',
  minutes: 38,
  summary: `"Pichhle 1 ghante ke top 10 videos", "trending hashtags", fantasy cricket ka live leaderboard, aur advertiser ka bill: sab ek hi sawaal hai, arabon events mein se "sabse zyada kaun" jaldi batao. Kafka → Flink windows → count-min sketch + heap → serving store, leaderboards ke liye Redis sorted sets, aur jahan paisa juda ho wahan batch se exact hisaab (Lambda).`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Socho school mein annual sports day hai aur har race ke baad scoreboard pe sabse aage wale 10 bachchon ke naam dikhane hain.<br>10 bachche hon to kaagaz pe gin lo. Lekin agar 10 crore log ho, har second hazaron naye points aa rahe hon, aur scoreboard har minute badalna ho?<br>Har ek ka hisaab ek kaagaz pe rakhna namumkin ho jaata hai.<br>Ye lesson sikhata hai ki "sabse zyada kaun" (top 10 videos, trending hashtags, live leaderboard) itne bade scale pe jaldi kaise nikaalte hain, kahan thodi galti chal jaati hai, aur kahan (jaise paise ke bill mein) bilkul nahi.` },
    { type: 'callout', tone: 'tip', title: 'Pehle khud try karo', html: `10 minute socho: xyz.com pe har second hazaron log videos dekh rahe hain. Homepage pe "Trending now" chahiye: pichhle 1 ghante mein sabse zyada dekhe gaye 10 videos, har minute update. Har view ke liye DB mein <code>count++</code>? Har minute <code>GROUP BY ... ORDER BY ... LIMIT 10</code>? Kya tootega? Phir yahan compare karo.` },

    { type: 'p', html: `Ye problem bahut jagah dikhti hai: YouTube jaisi site pe trending videos, X (Twitter) pe trending hashtags, Dream11 jaise fantasy apps pe live leaderboard, ad networks pe "is ad pe kitne clicks" (jispe advertiser ka bill banta hai). Sabka dil ek hi hai: <strong>bahut saare events, bahut saari alag cheezein, aur humein sirf upar wali kuch chahiye, jaldi</strong>.` },
    { type: 'callout', tone: 'term', title: 'Naye words: top-K, heavy hitters, event, stream', html: `<strong>Top-K</strong><br><strong>Ye kya hai:</strong> sabse zyada count wali K cheezein. K = 10 matlab top 10.<br><strong>Kyun chahiye:</strong> homepage pe "Trending", leaderboard pe "Top 100": user ko poori list nahi, sirf upar wale chahiye.<br><strong>Iske bina:</strong> crores items ki poori sorted list banana padta, jo bekaar aur mehenga hai.<br><br><strong>Heavy hitters</strong><br><strong>Ye kya hai:</strong> wo items jo stream ka bada hissa khud le jaate hain (jaise ek viral video jo saare views ka 5% le raha hai).<br><strong>Kyun maayne rakhta hai:</strong> top-K aur heavy hitters lagbhag ek hi sawaal ke do roop hain: "kaun sabse zyada?" Aur jo cheez bahut popular hai, wahi system pe sabse zyada load bhi daalti hai.<br><br><strong>Event / stream</strong>: <strong>event</strong> = ek chhoti si khabar ki kuch hua ("Riya ne video v9 dekha, 12:04 pe"). <strong>Stream</strong> = events ki kabhi na khatam hone wali line, jo lagaataar aati rehti hai.` },

    { type: 'h2', text: 'Step 1: requirements' },
    { type: 'compare',
      left: { title: 'Functional', html: `• Trending: pichhle 1 ghante ke top K videos/hashtags, har ~1 minute update<br>• Filters: desh, category (India mein trending, music mein trending)<br>• Leaderboard: top 100, "meri rank kya hai", rank 500-520 dikhao<br>• Ad clicks: har ad ke clicks, advertiser ko bill` },
      right: { title: 'Non-functional', html: `• Arabon events per din, peak pe kai guna<br>• Trending: thoda approximate chalega, fresh hona zaroori (seconds-minutes)<br>• Billing: <strong>exact</strong> chahiye, der chalegi (ghante)<br>• Leaderboard: har update ke baad rank turant sahi<br>• Ek viral item system ko na giraye (hot key)` },
    },
    { type: 'callout', tone: 'why', title: 'Is system ki asli mushkil', html: `Teen alag "sahi hone" ke level ek hi system mein: trending ke liye <strong>fast + approximate</strong>, leaderboard ke liye <strong>fast + exact</strong> (lekin chhota data), billing ke liye <strong>slow + bilkul exact</strong>. Ek hi tool teeno nahi karta, isliye design mein teen raaste banenge.` },

    { type: 'h2', text: 'Step 2: napkin maths' },
    { type: 'p', html: `Sabse seedha tareeka: har item ka apna counter, ek bada <strong>hash map</strong> <code>{video: count}</code>. Ye <strong>exact counting</strong> hai. Problem: memory alag items ki ginti ke saath badhti hai. Ek ghante mein 1 crore alag videos dekhe gaye to 1 crore counters. Iska ek sasta jugaad hai, jo thodi galti ke badle memory fixed kar deta hai:` },
    { type: 'callout', tone: 'term', title: 'Naya word: count-min sketch (pehli jhalak)', html: `<strong>Ye kya hai:</strong> counters ki ek chhoti table: kuch rows (d) aur har row mein kuch columns (w). Har row ka apna <strong>hash function</strong> hota hai (ek formula jo naam ko ek column number mein badalta hai; same naam se hamesha same number). Event aaya: har row mein us item ke column ka counter +1. Count poochha: un d counters mein se <strong>sabse chhota</strong> number (isliye naam "min").<br><strong>Kyun chahiye:</strong> table ka size fixed hai, chahe 1 lakh alag items hon ya 50 crore.<br><strong>Iske bina:</strong> har item ka alag counter, yaani GBs memory, aur har filter (desh, category) ke liye alag.<br><strong>Keemat:</strong> do items ek cell share kar sakte hain (collision), to count kabhi kabhi asli se <em>zyada</em> aata hai, kabhi kam nahi. Andar se step by step neeche Deep dive mein khud chalaoge.` },
    { type: 'p', html: `Ab do sawaal: kitne events per second, aur exact map vs sketch mein kitni memory? Values badlo (ε = kitni galti chalegi, N ke hisse mein):` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Events per din (crore): <strong class="tn-ev"></strong></label><input class="tn-e" type="range" min="10" max="1000" step="10" value="100"></div>
          <div><label>Ek ghante mein alag items (lakh): <strong class="tn-dv"></strong></label><input class="tn-d" type="range" min="1" max="500" step="1" value="100"></div>
        </div>
        <div class="chips tn-eps" role="group" aria-label="Error">
          <button type="button" class="chip" data-e="0.01">galti ≤ 1% of N</button>
          <button type="button" class="chip on" data-e="0.001">≤ 0.1%</button>
          <button type="button" class="chip" data-e="0.0001">≤ 0.01%</button>
        </div>
        <div class="stats">
          <div class="stat"><span>Events/s (avg)</span><strong class="tn-a"></strong></div>
          <div class="stat"><span>Events/s (peak, ×5 maan lo)</span><strong class="tn-p"></strong></div>
          <div class="stat"><span>Exact map, 1 ghanta (~64 B/item)</span><strong class="tn-x"></strong></div>
          <div class="stat"><span>Count-min sketch (99% confidence)</span><strong class="tn-c"></strong></div>
        </div>
        <div class="calc-note tn-note"></div>`;
      const q = s => el.querySelector(s);
      let eps = 0.001;
      const fmtB = b => b >= 1e9 ? (b / 1e9).toFixed(1) + ' GB' : b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB' : (b / 1e3).toFixed(0) + ' KB';
      const fmtN = n => n >= 1e7 ? (n / 1e7).toFixed(2) + ' crore' : n >= 1e5 ? (n / 1e5).toFixed(1) + ' lakh' : Math.round(n).toLocaleString('en-IN');
      const upd = () => {
        const E = +q('.tn-e').value * 1e7, D = +q('.tn-d').value * 1e5;
        q('.tn-ev').textContent = q('.tn-e').value; q('.tn-dv').textContent = q('.tn-d').value;
        const avg = E / 86400, hourN = E / 24;
        const w = Math.ceil(Math.E / eps), d = Math.ceil(Math.log(1 / 0.01));
        q('.tn-a').textContent = fmtN(avg) + '/s'; q('.tn-p').textContent = fmtN(avg * 5) + '/s';
        q('.tn-x').textContent = fmtB(D * 64);
        q('.tn-c').textContent = fmtB(w * d * 4);
        q('.tn-note').textContent = `Sketch: w = ⌈e/ε⌉ = ${w.toLocaleString('en-IN')} columns, d = ⌈ln(1/0.01)⌉ = ${d} rows, 4-byte counters. Ek ghante mein N ≈ ${fmtN(hourN)} events, to kisi bhi item ka estimate asli se zyada se zyada ~${fmtN(eps * hourN)} zyada (99% baar). Sketch ki memory alag items ki ginti pe nirbhar hi nahi karti; exact map karti hai. Aur ye sirf ek window, ek filter (desh × category) ke liye hai: har combination ke liye alag.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd));
      el.querySelectorAll('.tn-eps .chip').forEach(b => b.addEventListener('click', () => { eps = +b.dataset.e; el.querySelectorAll('.tn-eps .chip').forEach(x => x.classList.toggle('on', x === b)); upd(); }));
      upd();
    }},
    { type: 'p', html: `Default pe (100 crore events/din): average ~11.6 hazaar events/s, aur ek ghante ke 1 crore alag items ka exact map ~640 MB. Ek machine pe ek map chal jaata, lekin 50 desh × 20 categories × kai windows = hazaar maps, aur har event pe sab update. Sketch ~54 KB ka, chahe items 1 lakh hon ya 50 crore. Count-min sketch andar se kaise kaam karta hai, wo neeche Deep dive 1 mein khud chalaoge (aur <a href="#/ds-for-scale">data structures for scale</a> lesson mein bhi hai).` },

    { type: 'h2', text: 'Step 3: seedhe tareeke kyun tootte hain' },
    { type: 'table', head: ['Tareeka', 'Kaise', 'Kahan tootega'], rows: [
      ['DB counter', 'Har view pe <code>UPDATE videos SET views = views + 1</code>', 'Viral video ki ek row pe hazaron writes/s: row lock, hot row (<a href="#/pattern-contention">contention lesson</a>). Aur "pichhla 1 ghanta" pata hi nahi, sirf all-time.'],
      ['Har minute GROUP BY', 'Raw events table pe <code>GROUP BY video ORDER BY count DESC LIMIT 10</code>', 'Har minute ek ghante ke crores rows scan. Production DB pe analytics = sab slow (<a href="#/big-data">big data lesson</a>).'],
      ['Ek server ka hash map', 'Memory mein <code>{video: count}</code>', 'Ek machine ki memory aur CPU, ek hi SPOF, aur purane events ko window se nikaalna mushkil.'],
    ]},
    { type: 'p', html: `Teeno ka common ilaaj: events ko <strong>stream</strong> ki tarah process karo, <strong>key ke hisaab se baanto</strong> taaki kai machines mil ke ginein, <strong>time windows</strong> mein ginti karo, aur sirf <strong>chhota result</strong> (top-K) serving store mein rakho.` },

    { type: 'h2', text: 'Step 4: high-level design, trending pipeline' },
    { type: 'p', html: `Ye design industry ka common pattern hai (roadmap ke "Kafka → Flink → OLAP" jaisa). Diagram se pehle har hissa seedhe shabdon mein:` },
    { type: 'callout', tone: 'term', title: 'Yaad dilaana: Kafka, topic, partition', html: `<strong>Ye kya hai:</strong> <a href="#/kafka">Kafka</a> ek lambi, durable list (log) hai jisme events likhe jaate hain aur kai programs unhe apni speed se padhte hain. Ek <strong>topic</strong> = ek tarah ke events ki list ("views"). Topic kai <strong>partitions</strong> (tukdon) mein bata hota hai, taaki kai machines mil ke padh sakein. Event ki <strong>key</strong> (yahan videoId) tay karti hai ki wo kis partition mein jaayega: same key → hamesha same partition.<br><strong>Kyun chahiye:</strong> views ki baadh ko ek jagah durable rakhna, taaki ginne wale machines ruk bhi jaayein to events na khoyein, aur baad mein dobara padh (replay) sakein.<br><strong>Iske bina:</strong> ingest server seedha ginne wale ko bhejta; ginne wala slow ya down hua to events gaye.` },
    { type: 'callout', tone: 'term', title: 'Naya word: stream processor (Flink)', html: `<strong>Ye kya hai:</strong> ek program jo events ko aate hi, lagaataar process karta hai (yahan: ginti). Apache Flink ek popular stream processor hai. Kai machines (workers) pe chalta hai, har worker kuch partitions padhta hai, aur apni ginti (<strong>state</strong>) memory mein rakhta hai.<br><strong>Kyun chahiye:</strong> "har minute top 10" ke liye ginti events ke saath saath honi chahiye, ghante baad nahi.<br><strong>Iske bina:</strong> har minute crores raw rows pe GROUP BY, jo upar ki table mein tootta hua dikha.` },
    { type: 'callout', tone: 'term', title: 'Naye words: window, pane, checkpoint', html: `<strong>Window</strong>: <strong>Ye kya hai:</strong> time ka ek tukda jiske events saath gine jaate hain, jaise "12:00 se 12:59". <strong>Kyun:</strong> trending ka matlab "abhi", all-time nahi. <strong>Iske bina:</strong> 3 saal purana viral video hamesha #1.<br><strong>Pane</strong>: ek minute ka chhota sa counter-dabba. Badi window = kai panes ka jod (detail Deep dive 2 mein).<br><strong>Checkpoint</strong>: <strong>Ye kya hai:</strong> Flink har kuch second apni poori ginti (state) aur "Kafka mein kahan tak padha" (offset) ki copy durable storage mein save karta hai. <strong>Kyun:</strong> worker crash ho to wahi se dobara shuru. <strong>Iske bina:</strong> crash = saari ginti zero se, ya events do baar gine.` },
    { type: 'callout', tone: 'term', title: 'Naye words: serving store, OLAP', html: `<strong>Serving store</strong>: <strong>Ye kya hai:</strong> wo fast database jahan sirf <em>final chhota result</em> rakha jaata hai ("India ka top 10, 12:05 pe"), jaise Redis. <strong>Kyun:</strong> homepage ko 1 millisecond mein jawab chahiye, aur crores users ek hi list padhte hain. <strong>Iske bina:</strong> har page load pe ginti dobara.<br><strong>OLAP store</strong>: <strong>Ye kya hai:</strong> analytics ke liye bana database (ClickHouse, Druid, Pinot) jo data ko column ke hisaab se rakhta hai aur arabon rows pe GROUP BY seconds mein chala deta hai (<a href="#/big-data">OLTP vs OLAP</a>). <strong>Kyun:</strong> "Mumbai, Android, pichhle 6 ghante" jaise naye sawaal jinke liye pehle se list nahi bani. <strong>Iske bina:</strong> har naye filter ke liye naya pipeline.` },
    { type: 'p', html: `Ab poori pipeline. Har box pe click karke uska kaam padho, phir scenarios chalao:` },
    { type: 'flow', title: 'Trending videos pipeline', height: 350,
      nodes: [
        { id: 'users', label: 'Viewers', sub: 'app / web', x: 80, y: 170, w: 120, kind: 'client', info: 'Ye kya hai: xyz.com ke users (app aur web). Har view (ya like, share, hashtag use) ek chhota event banata hai: { videoId, userId, country, time }.' },
        { id: 'ingest', label: 'Ingest API', sub: 'view events', x: 240, y: 170, w: 130, kind: 'server', info: 'Ye kya hai: stateless servers jo events lete hain, thoda validate karte hain, aur bina wait kiye Kafka mein daal dete hain. User ko turant 202.' },
        { id: 'kafka', label: 'Kafka', sub: 'key = videoId', x: 400, y: 170, w: 130, kind: 'queue', info: 'Ye kya hai: durable event log (<a href="#/kafka">Kafka lesson</a>). Key = videoId, to ek video ke saare events ek hi partition mein. Retention ki wajah se crash ke baad replay bhi ho sakta hai.' },
        { id: 'flink', label: 'Flink job', sub: 'window + top-K', x: 580, y: 170, w: 150, kind: 'server', meter: true, load: 30, info: 'Ye kya hai: stream processor (ginne wali machines). Har partition ke events ko 1-minute panes mein ginta hai (exact counts ya count-min sketch), pichhle 60 panes jod ke 1-ghante ki sliding window banata hai, aur har window ka top-K nikaalta hai. State ka checkpoint regularly durable storage mein.' },
        { id: 'store', label: 'Serving store', sub: 'Redis / OLAP', x: 580, y: 290, w: 150, kind: 'cache', info: 'Ye kya hai: final result rakhne ki jagah. Har window ka chhota result: "trending:IN:music:12:05 → [v9, v2, ...]". Redis mein fast read ke liye, aur ClickHouse/Druid jaise OLAP store mein slicing (desh, category, time) ke liye.' },
        { id: 'api', label: 'Trending API', sub: 'cached', x: 380, y: 290, w: 140, kind: 'server', info: 'Ye kya hai: wo API jo homepage ko top-K deta hai. Result sabke liye same (har desh/category ke liye), to CDN/cache pe 30-60 s ka TTL chal jaata hai.' },
      ],
      edges: [{ a: 'users', b: 'ingest' }, { a: 'ingest', b: 'kafka' }, { a: 'kafka', b: 'flink' }, { a: 'flink', b: 'store' }, { a: 'store', b: 'api' }, { a: 'api', b: 'users' }],
      scenarios: [
        { name: 'Happy path', steps: [
          { title: 'Views aa rahe hain', text: 'Hazaron view events per second. Ingest turant Kafka mein daalta hai.', flood: { paths: ['evt:users>ingest>kafka'], n: 12 }, msg: '{ videoId: "v9", country: "IN", ts: 12:04:31 }' },
          { title: 'Flink ginti karta hai', text: 'Har Flink worker apne partitions ke videos ginta hai, minute ke bucket (pane) mein. Same video hamesha same worker pe, to uska poora count ek hi jagah.', flood: { paths: ['evt:kafka>flink'], n: 8 }, after: { flink: { load: 55 } } },
          { title: 'Minute khatam: top-K publish', text: 'Window band hone pe har worker apna local top-K deta hai, aur ek final step un sabko merge karke global top-K banata hai. Result serving store mein.', go: 'flink>store', msg: 'SET trending:IN:all:12:05 [v9, v2, v41, v7, v3 ...]' },
          { title: 'Homepage padhta hai', text: 'API serving store se chhota result padhta hai (cache ke saath). Raw events ko koi query chhooti bhi nahi.', go: ['users>api>store', 'res:store>api>users'] },
        ]},
        { name: 'Flink worker crash', steps: [
          { title: 'Worker gira', text: 'Ek Flink worker crash. Uske partitions ki ginti ruk gayi.', set: { flink: { state: 'down', sub: 'restarting' } }, go: 'bad:kafka>flink' },
          { title: 'Events Kafka mein surakshit', text: 'Events kho nahi rahe, Kafka mein jama ho rahe hain (backlog). Homepage purana top-K dikha raha hai: thoda stale, lekin chal raha hai.', flood: { paths: ['evt:users>ingest>kafka'], n: 8 }, after: { kafka: { state: 'warn', sub: 'backlog' } } },
          { title: 'Checkpoint se wapas', text: 'Flink aakhri checkpoint se state (counts) aur har Kafka partition ka offset wapas laata hai, aur wahin se events dobara padhta hai. Exactly-once mode mein har event state pe ek hi baar asar karta hai. Bahar likhne wala sink idempotent ho (same key pe overwrite), to dobara likhna nuksaan nahi karta.', set: { flink: { state: 'ok', sub: 'replaying' } }, flood: { paths: ['evt:kafka>flink'], n: 10 }, after: { kafka: { state: '', sub: 'key = videoId' }, flink: { state: '', sub: 'window + top-K' } } },
        ]},
        { name: 'Viral video (hot key)', steps: [
          { title: 'Ek video pe aadha traffic', text: 'Ek video viral. key = videoId, to uske saare events ek hi partition aur ek hi Flink worker pe. Baaki workers khaali, ye ek garam.', flood: { paths: ['evt:ingest>kafka>flink'], n: 12 }, after: { kafka: { state: 'hot', sub: '1 partition hot' }, flink: { state: 'hot', load: 95 } } },
          { title: 'Ilaaj: do-step ginti', text: 'Pehla step: key ke saath ek random salt (v9#0 ... v9#7) ya ingest pe hi local pre-aggregation ("v9: +500 is second mein"). Doosra step: v9 ke saare tukde jodo. Aise ek hot key ka kaam 8 workers mein bat jaata hai. Keemat: ek extra step aur thoda latency.', set: { kafka: { state: '', sub: 'key = videoId#salt' }, flink: { state: 'ok', load: 50 } } },
        ]},
        { name: 'Late events', steps: [
          { title: 'Metro mein offline phone', text: 'Ek user ne 12:04 pe video dekha, lekin phone offline tha. Event 12:09 pe pahuncha.', go: 'evt:users>ingest>kafka>flink', msg: '{ videoId: "v2", ts: 12:04:10 }  arrived 12:09' },
          { title: 'Event time + watermark', text: 'Flink event ke apne time (event time) se window chunta hai, aur watermark batata hai "ab itne purane events shayad nahi aayenge". Allowed lateness ke andar aaya to window dobara fire hoti hai aur top-K update. Usse bhi late: drop, ya side output mein (aur batch job baad mein theek karega). Detail <a href="#/big-data">big data lesson</a> mein.', focus: ['flink'] },
        ]},
      ],
    },

    { type: 'callout', tone: 'term', title: 'Scenarios ke naye words', html: `<strong>Hot key</strong>: ek key (jaise viral video v9) jiske paas itne events hain ki uska partition, worker ya Redis node akela garam ho jaata hai, baaki khaali baithe rehte hain.<br><strong>Salting</strong>: <strong>Ye kya hai:</strong> hot key ke peeche ek chhota random number jod do (v9#0 ... v9#7), taaki uske events 8 jagah bat jaayein; baad mein ek doosra step 8 tukdon ko jod de. <strong>Kyun:</strong> ek machine ka kaam 8 mein. <strong>Iske bina:</strong> ek viral video poori pipeline ko slow kar deta hai.<br><strong>Event time vs processing time</strong>: event time = jab cheez <em>hui</em> (phone pe 12:04). Processing time = jab server tak <em>pahunchi</em> (12:09). Ginti event time se honi chahiye, warna offline phone ka view galat minute mein gina jaayega.<br><strong>Watermark</strong>: Flink ka andaza "ab is time se purane events shayad nahi aayenge", taaki wo window band karke result de sake.<br><strong>Idempotent sink</strong>: result aise likho ki do baar likhne pe bhi wahi rahe (jaise same key pe overwrite: <code>SET trending:12:05 [...]</code>). Crash ke baad dobara likhna nuksaan nahi karta.` },
    { type: 'h2', text: 'Deep dive 1: count-min sketch + heap, andar se' },
    { type: 'p', html: `Trending hashtags ka chhota version lo: 8 hashtags, aur ek stream jisme <code>#ipl</code> bahut baar aata hai. Humein top 3 chahiye, lekin har hashtag ka alag counter nahi rakhna. Do cheezein milke ye kaam karti hain: count-min sketch (har item ka <em>andaza</em> count) aur ek chhota <strong>min-heap</strong> (sirf top K <em>candidates</em> ki list).` },
    { type: 'callout', tone: 'term', title: 'Naya word: min-heap (size K)', html: `<strong>Ye kya hai:</strong> K items ki ek chhoti list jo hamesha batati hai ki inmein <strong>sabse chhota</strong> kaun hai (heap ka "min"). Naya item aaye aur uska count is min se bada ho, to min ko nikaal ke naye ko daal do. Ek operation O(log K).<br><strong>Kyun chahiye:</strong> sketch sirf "is item ka count kitna?" bata sakta hai. Use ye nahi pata ki andar <em>kaun kaun</em> se items hain. Heap yaad rakhta hai ki top K ke candidates kaun hain.<br><strong>Iske bina:</strong> top-K nikaalne ke liye saare items ki list chahiye hogi, jo wahi bada hash map hai jisse bachna tha.` },
    { type: 'p', html: `Khud chalao. "Agla event" stream se ek hashtag bhejta hai. Dekho: (1) har row mein ek cell +1 hota hai (highlight), (2) estimate = un 3 cells ka minimum, (3) heap kya karta hai. Phir columns (w) 2 karo: <code>#exam</code> (asli sirf 2 baar) heap mein ghus jaata hai aur <code>#rain</code> (asli 4) bahar. Ye collision ka asar hai.` },
    { type: 'custom', render(el) {
      const D = 3, K = 3, TAGS = ['#ipl', '#budget', '#rain', '#exam', '#movie', '#metro', '#diwali', '#chess'];
      const STREAM = 'ipl budget ipl rain ipl exam budget ipl movie rain ipl metro budget ipl diwali chess ipl rain budget exam ipl movie rain ipl'.split(' ').map(x => '#' + x);
      const hash = (s, i, w) => { let h = 2166136261 ^ (i * 0x9e3779b1); for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 16777619); } h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; return (h >>> 0) % w; };
      el.innerHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn small primary cmh-next">Agla event</button><button type="button" class="btn small cmh-five">+5 events</button><button type="button" class="btn small ghost cmh-reset">Reset</button></div>
        <div class="chips cmh-w" style="padding:0;margin-top:8px"><span style="align-self:center;color:var(--ink-3);font-size:13px">Columns (w), d = 3:</span><button type="button" class="chip" data-v="2">2</button><button type="button" class="chip" data-v="4">4</button><button type="button" class="chip on" data-v="8">8</button><button type="button" class="chip" data-v="16">16</button></div>
        <div class="chips cmh-own" style="padding:0;margin-top:6px"><span style="align-self:center;color:var(--ink-3);font-size:13px">Khud event bhejo:</span>${TAGS.map(x => `<button type="button" class="chip" data-v="${x}">${x}</button>`).join('')}</div>
        <div class="cmh-grid table-wrap" style="margin-top:8px"></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-top:8px">
          <div style="border:1px solid var(--line);border-radius:var(--r);padding:10px;background:var(--surface)"><div style="font-weight:600">Min-heap (top ${K} candidates)</div><div class="cmh-heap" style="font-family:var(--f-mono);font-size:13px;line-height:1.8"></div></div>
          <div style="border:1px solid var(--line);border-radius:var(--r);padding:10px;background:var(--surface)"><div style="font-weight:600">Asli counts (sirf tulna ke liye)</div><div class="cmh-ex" style="font-family:var(--f-mono);font-size:13px;line-height:1.8"></div></div>
        </div>
        <div class="calc-note cmh-note"></div>`;
      const q = s => el.querySelector(s);
      let w = 8, evs = [], pos = 0;
      const run = () => {
        const sk = Array.from({ length: D }, () => new Array(w).fill(0)), ex = {}, heap = {}; let last = null;
        evs.forEach(x => { ex[x] = (ex[x] || 0) + 1; for (let i = 0; i < D; i++) sk[i][hash(x, i, w)]++;
          const est = Math.min(...sk.map((r, i) => r[hash(x, i, w)])); let act;
          if (x in heap) { heap[x] = est; act = 'up'; } else if (Object.keys(heap).length < K) { heap[x] = est; act = 'add'; }
          else { const mn = Object.entries(heap).sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? 1 : -1))[0];
            if (est > mn[1]) { delete heap[mn[0]]; heap[x] = est; act = 'evict:' + mn[0] + ':' + mn[1]; } else act = 'ign:' + mn[1]; }
          last = { x, est, act, cells: [0, 1, 2].map(i => [i, hash(x, i, w)]), vals: [0, 1, 2].map(i => sk[i][hash(x, i, w)]) }; });
        return { sk, ex, heap, last }; };
      const upd = () => {
        const { sk, ex, heap, last } = run();
        const on = (i, j) => last && last.cells.some(([a, b]) => a === i && b === j);
        q('.cmh-grid').innerHTML = `<table><thead><tr><th></th>${sk[0].map((_, j) => `<th>${j}</th>`).join('')}</tr></thead><tbody>` + sk.map((r, i) => `<tr><td style="white-space:nowrap">r${i + 1}</td>${r.map((v, j) => `<td style="text-align:center;${on(i, j) ? 'background:var(--accent-soft);font-weight:700' : ''}">${v}</td>`).join('')}</tr>`).join('') + `</tbody></table>`;
        const hs = Object.entries(heap).sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? 1 : -1));
        q('.cmh-heap').innerHTML = hs.length ? hs.map(([k, v], i) => `${k} ≈ ${v}${i === 0 ? ' <span style="color:var(--ink-3)">← min</span>' : ''}`).join('<br>') : '(khaali)';
        q('.cmh-ex').innerHTML = Object.entries(ex).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([k, v]) => `${k}: ${v}${heap[k] !== undefined ? ' ✓' : ''}`).join('<br>') || '(abhi koi event nahi)';
        let n = `Events: ${evs.length}. `;
        if (last) { const L = last;
          n += `"${L.x}" aaya: teen rows mein cells ${L.cells.map(([, j]) => j).join(', ')} pe +1, ab values ${L.vals.join(', ')}. Estimate = min = ${L.est} (asli ${ex[L.x]}${L.est > ex[L.x] ? ', +' + (L.est - ex[L.x]) + ' collision se' : ''}). Heap: `;
          n += L.act === 'up' ? 'pehle se andar tha, count update.' : L.act === 'add' ? 'jagah khaali thi, daal diya.' : L.act.startsWith('evict') ? `estimate heap ke min (${L.act.split(':')[1]} ≈ ${L.act.split(':')[2]}) se bada, to usse nikaala aur "${L.x}" daala.` : `estimate heap ke min (${L.act.split(':')[1]}) se bada nahi, to ignore.`;
        } else n += 'Shuru karo: "Agla event" dabao.';
        const top = Object.entries(ex).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, K).map(([k]) => k), wrong = Object.keys(heap).filter(k => !top.includes(k));
        if (evs.length >= 8 && wrong.length) n += ` Dhyaan: heap mein ${wrong.join(', ')} hai jo asli top ${K} mein nahi; chhoti table mein popular hashtags ke saath cell share hua.`;
        q('.cmh-note').textContent = n; };
      const push = x => { evs.push(x); upd(); };
      q('.cmh-next').addEventListener('click', () => { if (pos < STREAM.length) push(STREAM[pos++]); });
      q('.cmh-five').addEventListener('click', () => { for (let k = 0; k < 5 && pos < STREAM.length; k++) evs.push(STREAM[pos++]); upd(); });
      q('.cmh-reset').addEventListener('click', () => { evs = []; pos = 0; upd(); });
      el.querySelectorAll('.cmh-w .chip').forEach(b => b.addEventListener('click', () => { w = +b.dataset.v; el.querySelectorAll('.cmh-w .chip').forEach(x => x.classList.toggle('on', x === b)); upd(); }));
      el.querySelectorAll('.cmh-own .chip').forEach(b => b.addEventListener('click', () => push(b.dataset.v)));
      upd();
    }},
    { type: 'p', html: `Kya dikha? w = 8 pe (24 counters) heap ka top 3 asli top 3 jaisa (<code>#ipl</code>, <code>#budget</code>, <code>#rain</code>), bas <code>#budget</code> ka andaza 1 zyada. w = 2 pe (6 counters) poore 24 events ke baad <code>#exam</code> ka andaza 10 (asli 2) ho jaata hai aur wo <code>#rain</code> ko heap se nikaal deta hai. Teen baatein yaad rakho: (1) sketch kabhi <em>kam</em> nahi ginta, sirf zyada; (2) w badhao to galti ghatti hai (paper ka guarantee: galti ≤ (e/w) × N, zyadatar baar); (3) heap mein jo count hai wo us item ke aakhri event ke waqt ka hai, isliye final answer ke liye candidates ka estimate dobara sketch se padho.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion: sketch se hi top-K mil jaayega?', html: `Nahi. Count-min sketch sirf ek sawaal ka jawab deta hai: "is item ka count kitna?" Usse ye nahi pata ki <em>kaun kaun</em> se items andar hain. Isliye saath mein ek chhota <strong>min-heap</strong> (size K) chahiye: har event pe item ka estimate dekho, heap ke sabse chhote se bada ho to heap mein daal do. Heap = candidates ki list, sketch = unke counts.` },
    { type: 'h2', text: 'Deep dive 2: windows, "pichhla 1 ghanta" ka matlab kya?' },
    { type: 'p', html: `"Trending" ka matlab all-time nahi, <em>abhi</em>. Teen window types (<a href="#/big-data">big data lesson</a> mein simulator hai): <strong>tumbling</strong> (12:00-13:00, 13:00-14:00, overlap nahi), <strong>sliding</strong> (1 ghante ki window, har 1 minute pe aage khiskti hai, isliye overlap), aur <strong>session</strong> (user ki activity ke hisaab se). Trending ke liye sliding window chahiye: har minute "pichhle 60 minute".` },
    { type: 'callout', tone: 'warn', title: 'Sliding window mehengi kyun hai', html: `Flink ke docs ke mutabik sliding window mein jab slide size se chhota ho, to har event kai windows mein jaata hai: 60 minute window, 1 minute slide = har event 60 windows mein. Bina soche likha to 60x state. Common trick: <strong>panes</strong>. Har minute ka ek chhota tumbling count (pane) rakho, aur window = pichhle 60 panes ka jod. Naya minute aaya: naya pane jodo, sabse purana ghatao. Flink ka incremental aggregation (ReduceFunction/AggregateFunction) bhi har window ke liye sirf ek running value rakhta hai, saare events nahi.` },
    { type: 'p', html: `Count-min sketch ke saath panes aur bhi achhe chalte hain: do sketches (same size, same hash functions) ko cell-by-cell <strong>jod</strong> sakte ho, aur result wahi hoga jo dono streams ko ek sketch mein daalne se aata. To har minute ka ek sketch, aur window = pichhle W sketches ka jod. Neeche khel ke dekho: 30 minute ka nakli stream, 10 named videos aur 300 "long tail" videos jo minute mein ek-do baar dikhte hain.` },
    { type: 'custom', render(el) {
      const M = 30, TAIL = 300, D = 3, K = 5;
      const NAMED = [
        ['final-highlights', m => 10 + (m >= 18 ? 70 * Math.exp(-(m - 18) / 6) : 0)],
        ['new-song', m => 30 + m * 1.2], ['cat-video', m => 45 - m * 1.2], ['js-tutorial', () => 22],
        ['trailer-x', m => (m >= 8 ? 55 * Math.exp(-(m - 8) / 5) : 3)], ['news-live', m => 18 + 8 * Math.sin(m / 3)],
        ['gaming-live', m => 15 + m * 0.6], ['comedy-clip', m => 26 - m * 0.4], ['science-shorts', () => 12],
        ['travel-vlog', m => 9 + (m >= 24 ? 30 : 0)],
      ];
      let seed = 42; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
      const per = [];
      for (let m = 0; m < M; m++) { const c = {};
        NAMED.forEach(([n, f]) => { c[n] = Math.max(0, Math.round(f(m) * (0.85 + 0.3 * rnd()))); });
        for (let i = 0; i < TAIL; i++) { const r = rnd(); const k = r < 0.55 ? 0 : r < 0.9 ? 1 : 2; if (k) c['v' + i] = k; }
        per.push(c); }
      const hash = (s, i, w) => { let h = 2166136261 ^ (i * 0x9e3779b1); for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 16777619); } h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; return (h >>> 0) % w; };
      el.innerHTML = `<div class="row2">
          <div><label>Abhi ka minute (window ka end): <strong class="tk-tv"></strong></label><input class="tk-t" type="range" min="4" max="29" step="1" value="9"></div>
          <div><label>&nbsp;</label><button type="button" class="btn small primary tk-play">Chalao</button></div>
        </div>
        <div class="chips tk-w" role="group" aria-label="Window"><span style="align-self:center;color:var(--ink-3);font-size:13px">Window:</span>
          <button type="button" class="chip on" data-v="5">5 min</button><button type="button" class="chip" data-v="10">10 min</button><button type="button" class="chip" data-v="15">15 min</button></div>
        <div class="chips tk-c" role="group" aria-label="Sketch width"><span style="align-self:center;color:var(--ink-3);font-size:13px">Sketch columns (w), d = 3:</span>
          <button type="button" class="chip" data-v="16">16</button><button type="button" class="chip" data-v="32">32</button><button type="button" class="chip" data-v="64">64</button><button type="button" class="chip on" data-v="128">128</button></div>
        <svg class="tk-svg" viewBox="0 0 720 150" style="width:100%;height:auto;display:block" role="img" aria-label="Events per minute with sliding window"></svg>
        <div class="tk-tab table-wrap"></div>
        <div class="stats">
          <div class="stat"><span>Window mein events (N)</span><strong class="tk-n"></strong></div>
          <div class="stat"><span>Alag videos</span><strong class="tk-d"></strong></div>
          <div class="stat"><span>Top-5 sahi pakde</span><strong class="tk-h"></strong></div>
          <div class="stat"><span>Sketch memory</span><strong class="tk-m"></strong></div>
        </div>
        <div class="calc-note tk-note"></div>`;
      const q = s => el.querySelector(s);
      let W = 5, w = 128, timer = null;
      const upd = () => {
        const t = +q('.tk-t').value; q('.tk-tv').textContent = t;
        const exact = {}, sk = Array.from({ length: D }, () => new Array(w).fill(0)); let N = 0;
        const s0 = Math.max(0, t - W + 1);
        for (let m = s0; m <= t; m++) for (const k in per[m]) { const v = per[m][k]; exact[k] = (exact[k] || 0) + v; N += v; for (let i = 0; i < D; i++) sk[i][hash(k, i, w)] += v; }
        const est = k => Math.min(...sk.map((r, i) => r[hash(k, i, w)]));
        const ord = (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1);
        const ex = Object.entries(exact).sort(ord).slice(0, K);
        const es = Object.keys(exact).map(k => [k, est(k)]).sort(ord).slice(0, K);
        const inEx = k => ex.some(([e]) => e === k);
        const hit = es.filter(([k]) => inEx(k)).length;
        let rows = '';
        for (let r = 0; r < K; r++) { const [ek, ev] = ex[r], [sk2, sv] = es[r];
          rows += `<tr><td>${r + 1}</td><td>${ek} <span style="color:var(--ink-3)">${ev}</span></td><td style="color:${inEx(sk2) ? 'var(--ink)' : 'var(--red)'}">${sk2} <strong>${sv}</strong> <span style="color:var(--ink-3)">(asli ${exact[sk2]}, +${sv - exact[sk2]})</span></td></tr>`; }
        q('.tk-tab').innerHTML = `<table><thead><tr><th>#</th><th>Exact top-5</th><th>Sketch top-5 (estimate)</th></tr></thead><tbody>${rows}</tbody></table>`;
        const tot = per.map(c => Object.values(c).reduce((a, b) => a + b, 0)), mx = Math.max(...tot);
        let bars = '';
        tot.forEach((v, m) => { const x = 30 + m * 22, h = v / mx * 100, inW = m >= s0 && m <= t;
          bars += `<rect x="${x}" y="${115 - h}" width="16" height="${h}" rx="2" style="fill:${inW ? 'var(--accent)' : 'var(--line-2)'}"/>`;
          if (m % 5 === 0) bars += `<text x="${x + 8}" y="132" text-anchor="middle" style="fill:var(--ink-3);font:11px var(--f-mono)">${m}</text>`; });
        bars += `<rect x="${30 + s0 * 22 - 3}" y="8" width="${(t - s0 + 1) * 22 + 0}" height="110" rx="6" style="fill:none;stroke:var(--accent);stroke-width:1.5;stroke-dasharray:4 3"/><text x="360" y="147" text-anchor="middle" style="fill:var(--ink-3);font:11px var(--f-body)">har bar = ek minute ke saare events · dashed box = sliding window</text>`;
        q('.tk-svg').innerHTML = bars;
        q('.tk-n').textContent = N.toLocaleString('en-IN'); q('.tk-d').textContent = Object.keys(exact).length;
        q('.tk-h').textContent = hit + ' / 5'; q('.tk-m').textContent = (w * D) + ' counters';
        const wrong = es.filter(([k]) => !inEx(k)).map(([k]) => k);
        const kth = ex[K - 1][1], close = wrong.filter(k => exact[k] >= 0.9 * kth), far = wrong.filter(k => exact[k] < 0.9 * kth);
        q('.tk-note').textContent = (far.length ? `Laal = sketch ne galat video top-5 mein ghusa diya (${far.join(', ')}): uske counters mein popular videos ki ginti mil gayi (collision). ` : '') +
          (close.length ? `${close.join(', ')} asli mein bhi rank 5 ke barabar ke paas tha (takkar); sketch ki chhoti si galti ne order palat diya. ` : '') + (wrong.length ? '' : `Sketch ka top-5 exact jaisa hai. `) +
          `Estimate kabhi asli se kam nahi, sirf zyada. Guarantee: galti ≲ (e/w) × N = ${Math.round(Math.E / w * N)} (zyadatar baar isse kaafi kam). Window 5 min pe minute badhao: trailer-x (minute 8 pe launch) ~10-14 mein top-5 mein aata hai aur nikal jaata hai, final-highlights (18) aata hai aur 22 pe #1, travel-vlog (24) chadhta hai. Trending yahi hai. Exact map ko ${Object.keys(exact).length} entries chahiye; asli duniya mein ye crores hote hain.`;
      };
      const chip = (sel, fn) => el.querySelectorAll(sel + ' .chip').forEach(b => b.addEventListener('click', () => { fn(+b.dataset.v); el.querySelectorAll(sel + ' .chip').forEach(x => x.classList.toggle('on', x === b)); upd(); }));
      chip('.tk-w', v => { W = v; }); chip('.tk-c', v => { w = v; });
      q('.tk-t').addEventListener('input', upd);
      q('.tk-play').addEventListener('click', () => {
        if (timer) { clearInterval(timer); timer = null; q('.tk-play').textContent = 'Chalao'; return; }
        if (+q('.tk-t').value >= 29) q('.tk-t').value = 4;
        q('.tk-play').textContent = 'Roko';
        timer = setInterval(() => { const s = q('.tk-t'); if (!el.isConnected || +s.value >= 29) { clearInterval(timer); timer = null; q('.tk-play').textContent = 'Chalao'; return; } s.value = +s.value + 1; upd(); }, 700);
      });
      upd();
    }},

    { type: 'p', html: `Kya dikha? Default (minute 9, window 5, w = 128, sirf 384 counters) pe sketch ka top-5 bilkul exact jaisa. w = 16 karo (48 counters): <strong>v18</strong> aur <strong>v298</strong> jaise videos, jo asli mein sirf 3 aur 7 baar dekhe gaye, top-5 mein aa jaate hain, kyunki unke counters popular videos ke saath share ho gaye. Ye count-min ka nature hai: <strong>heavy hitters ke liye achha, rare items ke liye bekaar</strong>. Aur rank K ke paas ki takkar (do video lagbhag barabar) mein chhoti galti bhi order palat sakti hai.` },

    { type: 'h2', text: 'Deep dive 3: kai machines ke top-K ko jodna' },
    { type: 'p', html: `Ek machine pura stream nahi gin sakti, to 10 workers ginte hain. Har worker apna top-10 nikaalta hai. Kya un 10 lists ko merge karke sahi global top-10 milega? <strong>Depend karta hai ki events kaise baante gaye</strong>:` },
    { type: 'compare',
      left: { title: 'Key se baante (videoId → worker)', html: `Ek video ke <em>saare</em> events ek hi worker pe. Har video ka poora count ek jagah hai. To global top-10 hamesha kisi na kisi worker ke local top-10 mein hoga.<br><br><strong>Merge exact hai.</strong> Isliye Kafka ka key = videoId rakha.` },
      right: { title: 'Kaise bhi baante (time / round-robin)', html: `Video X har worker pe 9th number pe hai (har jagah 100), total 1,000. Video Y ek worker pe #1 (500), baaki jagah kuch nahi. Har worker sirf top-5 bhejta hai: X kahin nahi pahuncha, Y pahuncha.<br><br><strong>Merge galat ho sakta hai.</strong>` },
    },
    { type: 'p', html: `Doosra case asli databases mein bhi hai. Apache Druid ke docs ke mutabik uski TopN query approximate hai: har data segment apna top <code>max(1000, threshold)</code> broker ko bhejta hai, aur ~1,000 se zyada alag values wale column pe rank aur count dono galat ho sakte hain; exact chahiye to GroupBy (mehenga). ClickHouse ka <code>topK</code> function bhi docs ke mutabik approximate hai (Filtered Space-Saving algorithm pe based). Yaani jab tum OLAP store se "top 10" poochte ho, ye trade-off wahan bhi chhupa hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Space-Saving', html: `<strong>Ye kya hai:</strong> heavy hitters dhoondhne ka ek aur algorithm (Metwally, Agrawal, El Abbadi, 2005). Sirf <strong>m counters</strong> rakho, har ek pe ek item ka naam. Naya item aaya aur jagah nahi: sabse chhote counter wale item ko hata do, aur naye ko <em>wahi count + 1</em> de do.<br><strong>Example:</strong> m = 3, counters {ipl: 9, budget: 4, rain: 2}. #exam aaya: rain (2) hata, exam = 3. Exam ka asli count 1 hai, to iska count "zyada se zyada 2 zyada" ho sakta hai, aur ye hisaab bhi saath rakha jaata hai.<br><strong>Kyun chahiye:</strong> candidates aur counts dono ek hi chhote structure mein; popular items kabhi bahar nahi jaate.<br><strong>Iske bina:</strong> count-min + heap jaise do structures sambhalne padte. Isliye aksar yahi use hota hai (ClickHouse ka topK bhi isi pe based hai).` },

    { type: 'h2', text: 'Deep dive 4: leaderboards, Redis sorted sets' },
    { type: 'p', html: `Trending se alag problem. Fantasy cricket contest: 1 lakh players, har ball ke baad kai players ke points badalte hain, aur har player ko <strong>apni exact rank</strong> chahiye ("aap #4,218 pe ho"), plus top 100. Yahan approximate nahi chalega, lekin data chhota hai (ek contest ke players) aur memory mein aa jaata hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Redis sorted set (ZSET)', html: `<strong>Ye kya hai:</strong> Redis (memory mein chalne wala fast database) ka ek data type: members ki list jisme har member ka ek <strong>score</strong> hai, aur list hamesha score ke order mein rehti hai. Jaise ek scoreboard jo har badlaav ke baad khud ko sort kar leta hai.<br><strong>Kyun chahiye:</strong> "meri rank kya hai" aur "top 100" dono har update ke baad turant, exact, bina poori list dobara sort kiye.<br><strong>Iske bina:</strong> har rank request pe SQL mein lakhon rows ginna.<br><strong>Skip list</strong> (andar ka hissa): ek sorted linked list jisme upar "express lanes" hoti hain jo beech ke items skip kar jaati hain, taaki dhoondhna O(log N) ho (<a href="#/ds-for-scale">detail</a>).` },
    { type: 'p', html: `SQL mein <code>SELECT COUNT(*) FROM scores WHERE points &gt; :mine</code> har request pe = har baar lakhon rows. <strong>Redis sorted set</strong> isi ke liye bana hai. Redis docs ke mutabik ye unique members ka set hai jisme har member ka ek score hai, aur members hamesha score ke order mein rehte hain (same score ho to member ke naam ke lexicographic order mein). Andar se ye ek <strong>skip list + hash table</strong> hai (<a href="#/ds-for-scale">skip list</a> rank aur range ke liye, hash table "riya ka score kitna" ke liye).` },
    { type: 'table', head: ['Command', 'Kaam', 'Cost (Redis docs)'], rows: [
      ['<code>ZADD lb 120 riya</code>', 'Member daalo / score set karo', 'O(log N)'],
      ['<code>ZINCRBY lb 6 riya</code>', 'Score mein jodo (har ball ke points)', 'O(log N)'],
      ['<code>ZRANGE lb 0 9 REV WITHSCORES</code>', 'Top 10, bade score pehle', 'O(log N + M), M = kitne lautaaye'],
      ['<code>ZREVRANK lb riya</code>', 'Riya ki rank (0 = top)', 'O(log N)'],
      ['<code>ZSCORE lb riya</code>', 'Riya ka score', 'O(1)'],
    ], caption: 'Purane tutorials mein ZREVRANGE milega; Redis docs mein wo 6.2 se deprecated hai, uski jagah ZRANGE ... REV.' },
    { type: 'p', html: `Ab ek chhota contest khud chalao. "Agli ball" match ki agli ball ke points bhejti hai (ZINCRBY). Ya neeche se kisi bhi player ko khud points do. Har command ke baad dekho: order apne aap sahi, aur ZREVRANK turant rank batata hai. Do players ka score barabar karke dekho ki tie pe Redis kya karta hai.` },
    { type: 'custom', render(el) {
      const balls = [
        ['riya', 6, 'chhakka'], ['aman', 4, 'chauka'], ['zoya', 25, 'wicket (bowler unki team mein)'], ['kabir', 1, 'single'], ['aman', 10, 'captain ka chauka (2x)'],
        ['riya', 25, 'wicket'], ['kabir', 12, 'captain ka chhakka (2x)'], ['zoya', 4, 'chauka'], ['meera', 30, 'catch + run out'], ['kabir', 16, 'chauka (2x)'],
      ];
      el.innerHTML = `<div class="row2"><div><button type="button" class="btn small primary lbz-next">Agli ball</button> <button type="button" class="btn small ghost lbz-reset">Reset</button></div>
          <div><label for="lbz-me">Meri rank dekho</label><select id="lbz-me" class="lbz-me"><option>riya</option><option>aman</option><option>zoya</option><option>kabir</option><option>meera</option></select></div></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:8px"><label for="lbz-who">Khud ZINCRBY:</label><select id="lbz-who" class="lbz-who"><option>riya</option><option>aman</option><option>zoya</option><option>kabir</option><option>meera</option></select><button type="button" class="btn small lbz-p" data-v="1">+1</button><button type="button" class="btn small lbz-p" data-v="4">+4</button><button type="button" class="btn small lbz-p" data-v="6">+6</button><button type="button" class="btn small lbz-p" data-v="25">+25</button></div>
        <pre class="ascii lbz-cmd" style="margin-top:10px"></pre>
        <div class="lbz-tab table-wrap"></div>
        <div class="calc-note lbz-note"></div>`;
      const q = s => el.querySelector(s);
      let z = {}, i = 0, log = [];
      const init = () => { z = { riya: 50, aman: 50, zoya: 40, kabir: 45, meera: 20 }; i = 0; log = ['ZADD lb 50 riya 50 aman 40 zoya 45 kabir 20 meera']; };
      const rev = () => Object.entries(z).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? 1 : -1));
      const draw = () => {
        const r = rev(), me = q('.lbz-me').value, rk = r.findIndex(([m]) => m === me);
        q('.lbz-cmd').textContent = log.slice(-3).join('\n') + `\n> ZRANGE lb 0 4 REV WITHSCORES\n> ZREVRANK lb ${me}   → ${rk}`;
        q('.lbz-tab').innerHTML = `<table><thead><tr><th>Rank</th><th>Member</th><th>Score</th></tr></thead><tbody>` + r.map(([m, s], k) => `<tr${m === me ? ' style="background:var(--accent-soft)"' : ''}><td>#${k + 1}</td><td>${m}</td><td>${s}</td></tr>`).join('') + `</tbody></table>`;
        const tie = r.some(([, s], k) => k && r[k - 1][1] === s);
        q('.lbz-note').textContent = (i >= balls.length ? 'Saari balls ho gayin. ' : `Ball ${i}/${balls.length}. `) + `${me} ki rank #${rk + 1} (ZREVRANK 0 se ginta hai, isliye ${rk}). ` + (tie ? 'Do members ka score barabar hai: REV order mein Redis unhe naam ke ulte lexicographic order mein rakhta hai, "pehle kaun pahuncha" nahi. Wo chahiye to score mein time encode karna padega.' : 'Har ZINCRBY ke baad order apne aap sahi: koi sort nahi chalana pada.');
      };
      q('.lbz-next').addEventListener('click', () => { if (i >= balls.length) return; const [m, p, why] = balls[i++]; z[m] += p; log.push(`ZINCRBY lb ${p} ${m}   # ${why}`); draw(); });
      q('.lbz-reset').addEventListener('click', () => { init(); draw(); });
      q('.lbz-me').addEventListener('change', draw);
      el.querySelectorAll('.lbz-p').forEach(btn => btn.addEventListener('click', () => { const m = q('.lbz-who').value, p = +btn.dataset.v; z[m] += p; log.push(`ZINCRBY lb ${p} ${m}   # khud bheja`); draw(); }));
      init(); draw();
    }},

    { type: 'p', html: `Ab poora leaderboard system. Ye ek general design hai (kisi ek company ka nahi):` },
    { type: 'flow', title: 'Live contest leaderboard', height: 280,
      nodes: [
        { id: 'ev', label: 'Ball events', sub: 'Kafka topic', x: 95, y: 70, w: 150, kind: 'queue', info: 'Ye kya hai: Kafka topic jisme har ball ka result (run, wicket, catch) ek event hai. Saare contests ke points calculators isse padhte hain.' },
        { id: 'calc', label: 'Points worker', sub: 'per contest', x: 310, y: 70, w: 150, kind: 'server', info: 'Ye kya hai: points ginne wala worker. Ball event se har affected player ke points nikaalta hai (kaunse cricketer kis ki team mein, captain 2x) aur ZINCRBY bhejta hai. Contest id se partitioned, to ek contest ek worker pe.' },
        { id: 'redis', label: 'Redis ZSET', sub: 'lb:contest:42', x: 540, y: 70, w: 160, kind: 'cache', info: 'Ye kya hai: Redis sorted set, contest ka live scoreboard. Ek contest = ek sorted set. Member = userId, score = points. Rank aur top-N O(log N) mein. Redis Cluster mein ek key ek hi slot/node pe rehti hai, to ek contest ka leaderboard ek node pe.' },
        { id: 'db', label: 'Teams DB', sub: 'source of truth', x: 540, y: 210, w: 160, kind: 'data', info: 'Ye kya hai: asli record ka database (source of truth). Har user ki team aur har ball ka record durable DB mein. Redis kho jaaye to leaderboard isse dobara banaya ja sakta hai (points recompute karke ZADD).' },
        { id: 'api', label: 'Leaderboard API', sub: 'top 100 + my rank', x: 310, y: 210, w: 160, kind: 'server', info: 'Ye kya hai: wo API jo app ko leaderboard deta hai. Top 100 sabke liye same: chhote TTL ke saath cache. "Meri rank" har user ki alag: ZREVRANK seedha Redis se.' },
        { id: 'players', label: 'Players', sub: 'app', x: 95, y: 210, w: 130, kind: 'client', info: 'Ye kya hai: fantasy app pe khelne wale users. Contest mein shaamil users. Match ke beech baar baar leaderboard refresh karte hain.' },
      ],
      edges: [{ a: 'ev', b: 'calc' }, { a: 'calc', b: 'redis' }, { a: 'redis', b: 'db' }, { a: 'api', b: 'redis' }, { a: 'players', b: 'api' }],
      scenarios: [
        { name: 'Ball aur rank', steps: [
          { title: 'Wicket gira', text: 'Ball event aaya.', go: 'evt:ev>calc', msg: '{ ball: "14.2", wicket: "batter X", bowler: "Y" }' },
          { title: 'Points update', text: 'Jin players ki team mein bowler Y hai, sabke liye ZINCRBY. Ek ball pe hazaron updates, har ek O(log N).', go: 'calc>redis', msg: 'ZINCRBY lb:contest:42 25 user:881\nZINCRBY lb:contest:42 25 user:1203 ...' },
          { title: 'Meri rank', text: 'Player ne leaderboard khola: top 100 (cached) aur apni rank.', go: ['players>api>redis', 'res:redis>api>players'], msg: 'ZRANGE lb:contest:42 0 99 REV WITHSCORES\nZREVRANK lb:contest:42 user:881  → 4217' },
        ]},
        { name: 'Redis node gira', steps: [
          { title: 'Primary down', text: 'Leaderboard wala Redis node crash.', set: { redis: { state: 'down', sub: 'DOWN' } }, go: 'bad:api>redis' },
          { title: 'Replica ya rebuild', text: 'Replica promote ho jaata hai (async replication, to aakhri kuch updates kho sakte hain). Ya leaderboard DB se dobara banao: har user ke points recompute karke ZADD. Isliye Redis ko source of truth mat banao, sirf fast index.', go: ['db>redis'], after: { redis: { state: 'ok', sub: 'rebuilt' } } },
        ]},
        { name: 'Bahut bada contest', steps: [
          { title: 'Crores players, ek key', text: 'Ek mega contest mein crores members. Ek sorted set ek node pe, to us node ki memory aur CPU hi limit. Har ball pe lakhon ZINCRBY ek hi key pe: hot key.', flood: { paths: ['calc>redis', 'api>redis'], n: 12 }, after: { redis: { state: 'hot', sub: 'one huge key' } } },
          { title: 'Ilaaj', text: 'Top 1,000 ek chhote exact sorted set mein. Baaki ke liye approximate rank: score ke buckets ka histogram ("aapse upar ~42 lakh log"). Ya ZINCRBY ko kuch second batch karke bhejo. Exact rank sirf upar walon ko chahiye hoti hai.', set: { redis: { state: '', sub: 'top-1000 + buckets' } } },
        ]},
      ],
    },
    { type: 'callout', tone: 'tip', title: 'Tie-break: pehle kaun pahuncha?', html: `Same points pe Redis naam ke order mein rakhta hai. "Jo pehle pahuncha wo upar" chahiye to score mein time jodo: <code>score = points × 10^7 + (10^7 − seconds_since_contest_start)</code>. Dhyaan: Redis score ek double hai, jo ~2^53 tak ke integers exact rakhta hai, to points aur time dono us range mein fit hone chahiye.` },

    { type: 'h2', text: 'Deep dive 5: paisa juda ho to exact, batch reconciliation' },
    { type: 'p', html: `<strong>Naya problem:</strong> xyz.com pe ads hain, aur advertiser se per click paisa liya jaata hai. Dashboard pe "abhi tak 12,430 clicks" live chahiye, lekin <strong>bill</strong> mein 1 click ki galti bhi jhagda hai. Streaming pipeline mein galti ke raaste: count-min ka over-count, crash ke baad replay se duplicate (at-least-once), late events jo window band hone ke baad aaye, aur bots ke clicks jo baad mein pakde gaye.` },
    { type: 'p', html: `Twitter ke engineers ne 2014 ke Summingbird paper (VLDB) mein bilkul yahi likha: zyadatar analytics mein ~1% galti chalti hai (retweet count 141 ho ya 142), lekin <strong>advertisers ki billing</strong> jaise kaam mein galti ki koi jagah nahi, wahan probabilistic structures sahi nahi. Unke us waqt ke setup mein online processing (Storm) at-least-once thi, isliye use "back up" karne ke liye batch processing (Hadoop) chalti thi, aur Summingbird ek hi logic se dono chala ke unke results jod deta tha. Ye 2014 ka setup hai; aaj Storm/Hadoop ki jagah aksar Flink/Spark hote hain, lekin idea wahi hai.` },
    { type: 'callout', tone: 'term', title: 'Naye words: data lake, batch job, reconciliation', html: `<strong>Data lake</strong>: <strong>Ye kya hai:</strong> sasti, bahut badi storage (jaise S3) jahan raw events jaise ke taise, hamesha ke liye rakhe jaate hain. <strong>Kyun:</strong> kuch bhi galat gina gaya ho, asli data se dobara gin sako. <strong>Iske bina:</strong> stream ki galti hamesha ke liye.<br><strong>Batch job</strong>: <strong>Ye kya hai:</strong> ek program jo din bhar ka saara data ek saath, aaram se process karta hai (jaise raat ko), Spark ya Hadoop pe. <strong>Kyun:</strong> poora data saamne ho to dedupe, bots hataana aur late events jodna aasaan aur exact. <strong>Iske bina:</strong> sirf stream ka jaldbaazi wala andaza.<br><strong>Reconciliation</strong>: stream ka number aur batch ka exact number milana, aur final (bill wala) number batch se lena.` },
    { type: 'flow', title: 'Ad clicks: Lambda style', height: 320,
      nodes: [
        { id: 'clk', label: 'Ad clicks', sub: 'events', x: 80, y: 160, w: 120, kind: 'client', info: 'Ye kya hai: ad pe hue clicks ke events. Har click: { adId, userId, ts, clickId }. clickId unique hai, taaki baad mein duplicates hataaye ja sakein.' },
        { id: 'kq', label: 'Kafka', sub: 'raw clicks', x: 245, y: 160, w: 130, kind: 'queue', info: 'Ye kya hai: raw clicks ka Kafka topic. Saare clicks yahan. Do consumers: speed layer (Flink) aur archiver jo raw events data lake mein likhta hai.' },
        { id: 'fl', label: 'Flink', sub: 'speed layer', x: 430, y: 60, w: 140, kind: 'server', info: 'Ye kya hai: speed layer, yaani stream processor jo har minute ke counts seconds mein deta hai. Dashboard ke liye. Approximate ho sakta hai (late events, duplicates).' },
        { id: 'lake', label: 'Data lake', sub: 'raw, S3/HDFS', x: 430, y: 260, w: 140, kind: 'data', info: 'Ye kya hai: sasti, badi storage (S3/HDFS) jahan har raw click permanently rakha jaata hai. Kuch bhi galat ho, yahin se dobara gin sakte hain.' },
        { id: 'batch', label: 'Batch job', sub: 'daily, exact', x: 625, y: 260, w: 140, kind: 'server', info: 'Ye kya hai: raat ko chalne wala Spark/Hadoop job jo ek din ke saare clicks padhta hai: clickId se dedupe, bots hataao, late events shaamil, aur exact count. Ghante lagte hain, lekin sahi.' },
        { id: 'srv', label: 'Serving', sub: 'dashboard + bill', x: 625, y: 60, w: 140, kind: 'data', info: 'Ye kya hai: dashboard aur billing ka data. Dashboard pehle speed layer ka number dikhata hai. Batch ka number aane pe wo us din ke liye overwrite kar deta hai. Bill sirf batch ke number se banta hai.' },
      ],
      edges: [{ a: 'clk', b: 'kq' }, { a: 'kq', b: 'fl' }, { a: 'kq', b: 'lake' }, { a: 'fl', b: 'srv' }, { a: 'lake', b: 'batch' }, { a: 'batch', b: 'srv' }],
      scenarios: [
        { name: 'Normal din', steps: [
          { title: 'Clicks aaye', text: 'Har click Kafka mein, aur wahan se do raaston pe.', flood: { paths: ['evt:clk>kq>fl', 'evt:clk>kq>lake'], n: 10 } },
          { title: 'Live dashboard', text: 'Speed layer har minute ka count serving mein likhta hai. Advertiser ko seconds mein dikhta hai.', go: 'fl>srv', msg: 'ad:77  12:05  clicks ≈ 412' },
          { title: 'Raat ko exact', text: 'Batch job ne poore din ke raw clicks padhe, dedupe kiya, aur exact number likha. Ab us din ka dashboard aur bill isi se.', go: ['lake>batch', 'batch>srv'], msg: 'ad:77  2026-10-03  clicks = 9,871 (exact, final)' },
        ]},
        { name: 'Crash ke baad duplicates', steps: [
          { title: 'Flink restart, replay', text: 'Speed layer at-least-once chal raha tha. Crash ke baad kuch minute ke events dobara gine gaye. Dashboard pe count thoda zyada.', set: { fl: { state: 'warn', sub: 'replayed' } }, flood: { paths: ['evt:kq>fl'], n: 8 }, after: { srv: { state: 'warn', sub: 'over-counted' } } },
          { title: 'Batch theek karta hai', text: 'Raw data lake mein har click ek baar hai (clickId). Batch ne exact gina aur us din ka number overwrite kiya. Bill pe duplicates ka koi asar nahi.', go: ['lake>batch', 'batch>srv'], after: { srv: { state: 'ok', sub: 'dashboard + bill' }, fl: { state: '' } } },
        ]},
      ],
    },
    { type: 'p', html: `Reconciliation ka matlab: stream ka jaldi wala number aur batch ka exact number milao, aur bill hamesha exact wale se. Khud dekho ki stream ka number kitna bhatak sakta hai (maan lo ek ad ke ek din mein 10,000 asli clicks, ₹5 per click):` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="rc-dup">Crash ke baad replay se duplicates: <strong class="rc-dv"></strong></label><input id="rc-dup" class="rc-dup" type="range" min="0" max="5" step="0.5" value="2"></div>
          <div><label for="rc-late">Late clicks (window band hone ke baad aaye): <strong class="rc-lv"></strong></label><input id="rc-late" class="rc-late" type="range" min="0" max="600" step="50" value="300"></div>
          <div><label for="rc-bot">Bot clicks (baad mein pakde gaye): <strong class="rc-bv"></strong></label><input id="rc-bot" class="rc-bot" type="range" min="0" max="1000" step="50" value="400"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Stream ka count (live)</span><strong class="rc-s"></strong></div>
          <div class="stat"><span>Batch ka count (exact)</span><strong class="rc-b"></strong></div>
          <div class="stat"><span>Farak</span><strong class="rc-d"></strong></div>
          <div class="stat"><span>Stream se bill banta to</span><strong class="rc-m"></strong></div>
        </div>
        <div class="calc-note rc-note"></div>`;
      const G = 10000, PRICE = 5, q = s => el.querySelector(s);
      const upd = () => {
        const dp = +q('.rc-dup').value, L = +q('.rc-late').value, B = +q('.rc-bot').value;
        q('.rc-dv').textContent = dp + '%'; q('.rc-lv').textContent = L; q('.rc-bv').textContent = B;
        const seen = G + B - L, dups = Math.round(seen * dp / 100), S = seen + dups, diff = S - G;
        q('.rc-s').textContent = S.toLocaleString('en-IN'); q('.rc-b').textContent = G.toLocaleString('en-IN');
        q('.rc-d').textContent = (diff > 0 ? '+' : '') + diff.toLocaleString('en-IN');
        q('.rc-m').textContent = '₹' + (S * PRICE).toLocaleString('en-IN') + ' (sahi: ₹' + (G * PRICE).toLocaleString('en-IN') + ')';
        q('.rc-note').textContent = `Stream ne ${(G + B).toLocaleString('en-IN')} raw clicks mein se ${seen.toLocaleString('en-IN')} dekhe (${L} late chhoot gaye), aur replay ki wajah se ${dups} do baar gine. Bot clicks (${B}) bhi andar hain. Batch raw archive se clickId pe dedupe karta hai, late clicks shaamil karta hai, aur bots hataata hai: exact ${G.toLocaleString('en-IN')}. ${diff === 0 ? 'Is baar galtiyaan ek doosre ko cancel kar gayin, lekin ye sirf sanyog hai.' : 'Stream se bill banta to advertiser se ₹' + Math.abs(diff * PRICE).toLocaleString('en-IN') + ' ' + (diff > 0 ? 'zyada' : 'kam') + ' liye jaate.'} Dashboard pe stream ka number chalta hai; bill sirf batch se.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'term', title: 'Lambda vs Kappa (yaad dilaana)', html: `<strong>Lambda</strong>: stream (fast, approximate) + batch (slow, exact), dono ka logic do jagah. <strong>Kappa</strong>: sirf stream; galti theek karni ho to Kafka se shuru se replay. Flink ke docs ke mutabik checkpoint mein state ke saath Kafka offsets bhi hote hain, exactly-once mode mein har event state pe ek hi baar asar karta hai, aur end-to-end exactly-once ke liye replayable source + transactional ya idempotent sink chahiye. Isliye kuch teams billing bhi stream se karti hain, lekin aam taur pe raw events ka archive aur ek reconciliation job phir bhi rakhti hain. Detail <a href="#/big-data">big data lesson</a> mein.` },

    { type: 'h2', text: 'OLAP store: "India mein, music mein, pichhle 6 ghante"' },
    { type: 'p', html: `Product team kal kahegi: "Mumbai mein Android users ke liye pichhle 6 ghante ke trending". Har combination ke liye pehle se top-K banana impossible. Iske liye Flink se per-minute <em>counts</em> (video × desh × category × minute) ek column-store OLAP database (ClickHouse, Druid, Pinot) mein jaate hain, jo arabon rows pe <code>GROUP BY</code> seconds mein chala deta hai (<a href="#/big-data">OLTP vs OLAP</a>). Popular combinations (desh-level trending) ka result phir bhi Redis mein precompute rakho; OLAP ad-hoc aur kam traffic wale sawaalon ke liye. Aur yaad rakho: wahan ke "top 10" functions bhi approximate ho sakte hain (Druid TopN, ClickHouse topK).` },

    { type: 'h2', text: 'Failure scenarios aur bottlenecks' },
    { type: 'table', head: ['Kya hua', 'Asar', 'Bachaav'], rows: [
      ['Viral item (hot key)', 'Ek partition / worker / Redis key garam', 'Salt + do-step aggregation, local pre-aggregation, ZINCRBY batching'],
      ['Stream worker crash', 'Trending ruk jaata hai, stale dikhta hai', 'Kafka retention + Flink checkpoint se replay; idempotent sink'],
      ['Duplicates (at-least-once)', 'Counts zyada', 'Trending ke liye chalta hai; billing ke liye clickId dedupe + batch'],
      ['Late events', 'Purani window ka count kam', 'Event time + watermark + allowed lateness; baaki batch mein'],
      ['Sketch bahut chhota', 'Rare items top-K mein', 'w badhao (e/ε), ya Space-Saving; sirf heavy hitters ke liye use'],
      ['Arbitrary partitioning + local top-K merge', 'Galat global top-K', 'Key se partition karo, ya har node se K se zyada candidates (Druid ka 1000)'],
      ['Redis leaderboard node down', 'Ranks gayab', 'Replica; DB se rebuild; Redis ko source of truth mat banao'],
      ['Spam / bots se trending manipulate', 'Galat cheez trending', 'Ingest pe filters, per-user weight/limit, baad mein batch se hataao'],
    ]},
    { type: 'callout', tone: 'why', title: 'Decide', html: `• Ek scoreboard, har update pe exact rank, data memory mein aata hai → <strong>Redis sorted set</strong>.<br>• Crores alag items ka continuous "kaun sabse zyada", thodi galti chalti hai → <strong>stream + windows + count-min/Space-Saving + heap</strong>.<br>• Ad-hoc slices (desh, category, kisi bhi time range) → per-minute counts <strong>OLAP store</strong> mein.<br>• Paisa ya legal number → <strong>raw events archive + batch reconciliation</strong> (ya exactly-once stream + reconciliation), approximate structures kabhi nahi.` },
    { type: 'h2', text: 'Interview mein kaise bolein' },
    { type: 'steps', items: [
      { t: 'Accuracy pehle poochho', d: 'Trending (approximate, fresh), leaderboard (exact, chhota), billing (exact, der chalegi). Teeno ke liye alag raasta.' },
      { t: 'Pipeline', d: 'Ingest → Kafka (key = itemId) → Flink windowed counts → top-K → Redis/OLAP → cached API. Raw events kabhi query path pe nahi.' },
      { t: 'Windows', d: 'Sliding window panes se: 1-minute tumbling counts, window = pichhle N panes ka jod. Event time + watermark.' },
      { t: 'Memory', d: 'Bahut saare keys: count-min sketch + heap, ya Space-Saving. Sketches mergeable, isliye panes aur workers jod sakte ho.' },
      { t: 'Edge cases', d: 'Hot key (salting), distributed merge (key se partition), crash (checkpoint + replay), billing (batch reconciliation).' },
    ]},
    { type: 'diagram', title: 'Poora design, ek nazar mein', height: 420,
      caption: 'Ek hi Kafka stream teen raaston ko khilata hai: Flink se fast trending (thoda approximate), points worker se exact leaderboard (Redis ZSET), aur archive + raat ke batch se exact bill. Upar ke buttons se ek-ek raasta dekho.',
      groups: [
        { label: 'Collect', x: 10, y: 30, w: 530, h: 108 },
        { label: 'Stream', x: 190, y: 160, w: 350, h: 108 },
        { label: 'Serve', x: 10, y: 290, w: 530, h: 108 },
        { label: 'Batch (exact)', x: 550, y: 30, w: 160, h: 368 },
      ],
      nodes: [
        { id: 'users', label: 'Users / apps', sub: 'views, clicks', x: 90, y: 84, w: 140, kind: 'client', info: 'Ye kya hai: xyz.com ke viewers, fantasy players aur ad dekhne wale. Har view/click/ball ek chhota event banata hai, aur yahi log homepage pe trending aur leaderboard padhte bhi hain.' },
        { id: 'ingest', label: 'Ingest API', sub: 'validate, 202', x: 270, y: 84, kind: 'server', info: 'Ye kya hai: stateless servers jo events lete hain, thoda check karte hain, aur bina ruke Kafka mein daal dete hain. User ko turant jawab.' },
        { id: 'kafka', label: 'Kafka', sub: 'key = itemId', x: 450, y: 84, kind: 'queue', info: 'Ye kya hai: durable event log, partitions mein bata. Same item ke saare events same partition mein, isliye ek item ki poori ginti ek worker pe. Crash ke baad replay bhi yahin se.' },
        { id: 'lake', label: 'Data lake', sub: 'raw archive', x: 630, y: 84, kind: 'data', info: 'Ye kya hai: har raw event ki permanent copy (S3 jaisi sasti storage). Billing ka exact hisaab aur kisi bhi galti ka sudhaar yahin se.' },
        { id: 'points', label: 'Points worker', sub: 'per contest', x: 270, y: 214, kind: 'server', info: 'Ye kya hai: ball events se har player ke points nikaal ke ZINCRBY bhejta hai. Contest id se partitioned, to ek contest ek worker pe.' },
        { id: 'flink', label: 'Flink', sub: 'panes + sketch', x: 450, y: 214, kind: 'server', info: 'Ye kya hai: stream processor. 1-minute panes mein ginti (exact ya count-min), sliding window = pichhle panes ka jod, heap/Space-Saving se top-K. Checkpoint se crash recovery.' },
        { id: 'batch', label: 'Nightly batch', sub: 'dedupe, exact', x: 630, y: 214, kind: 'server', info: 'Ye kya hai: raat ka Spark job. Poore din ke raw events: clickId se dedupe, bots hatao, late events jodo, exact count. Stream ki galtiyaan yahin theek hoti hain.' },
        { id: 'api', label: 'Top-K API', sub: 'cached', x: 90, y: 344, kind: 'server', info: 'Ye kya hai: homepage ko trending list aur app ko leaderboard deta hai. Trending sabke liye same, to chhote TTL ke saath cache; "meri rank" seedha Redis se.' },
        { id: 'redis', label: 'Redis', sub: 'top-K lists, ZSETs', x: 270, y: 344, kind: 'cache', info: 'Ye kya hai: fast memory store. Har window ki chhoti top-K list ("trending:IN:12:05") aur har contest ka sorted set. Source of truth nahi; kho jaaye to dobara banaya ja sakta hai.' },
        { id: 'olap', label: 'OLAP store', sub: 'ClickHouse/Druid', x: 450, y: 344, kind: 'data', info: 'Ye kya hai: analytics database. Per-minute counts (item × desh × category) rakhta hai, taaki "Mumbai, Android, pichhle 6 ghante" jaise naye sawaal seconds mein chal sakein.' },
        { id: 'bill', label: 'Dashboard + bill', sub: 'live vs final', x: 630, y: 344, w: 150, kind: 'data', info: 'Ye kya hai: advertiser ka dashboard aur bill. Din bhar stream ka live number, raat ko batch ka exact number overwrite karta hai. Bill sirf exact number se.' },
      ],
      edges: [
        { a: 'users', b: 'ingest', n: 1 }, { a: 'ingest', b: 'kafka', n: 2 }, { a: 'kafka', b: 'flink', n: 3 },
        { a: 'flink', b: 'redis', n: 4, label: 'top-K' }, { a: 'users', b: 'api', n: 5, label: 'GET top 10' }, { a: 'api', b: 'redis' },
        { a: 'kafka', b: 'points', kind: 'evt' }, { a: 'points', b: 'redis', label: 'ZINCRBY' },
        { a: 'flink', b: 'olap', label: 'counts' }, { a: 'olap', b: 'bill' },
        { a: 'kafka', b: 'lake' }, { a: 'lake', b: 'batch' }, { a: 'batch', b: 'bill', label: 'exact' }, { a: 'batch', b: 'olap', dashed: true },
      ],
      paths: [
        { name: 'Event arrives', text: 'View/click → ingest (turant 202) → Kafka (key = itemId, isliye ek item ek partition mein) → Flink us minute ke pane mein ginta hai. Saath hi raw copy data lake mein.', go: ['users>ingest>kafka>flink', 'kafka>lake'] },
        { name: 'Window closes', text: 'Minute khatam: Flink pichhle panes jod ke sliding window banata hai, heap/Space-Saving se top-K nikaal ke Redis mein likhta hai (same key pe overwrite), aur per-minute counts OLAP mein.', go: ['flink>redis', 'flink>olap'] },
        { name: 'Read top 10', text: 'Homepage API se poochta hai; API cache ya Redis se chhoti list laata hai. Raw events ko koi read chhoota bhi nahi.', go: ['users>api>redis'] },
        { name: 'Leaderboard update', text: 'Ball event → points worker → ZINCRBY contest ke sorted set pe. Player ki "meri rank" = ZREVRANK, O(log N), exact.', go: ['kafka>points>redis', 'users>api>redis'] },
        { name: 'Nightly fix', text: 'Raat ko batch job data lake se poora din padhta hai: dedupe, bots hatao, late events jodo. Exact number dashboard aur bill mein overwrite, aur OLAP ke us din ke counts bhi theek.', go: ['lake>batch>bill', 'batch>olap'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Pehle poochho kitni sahi ginti chahiye: trending (approx, fresh), leaderboard (exact, chhota data), bill (exact, der chalegi).</li>
      <li>Exact hash map ki memory alag items ke saath badhti hai; count-min sketch ki fixed rehti hai, lekin wo sirf zyada ginta hai (kabhi kam nahi).</li>
      <li>Sketch counts deta hai, candidates nahi: saath mein size-K min-heap (ya Space-Saving).</li>
      <li>Pipeline: ingest → Kafka (key = itemId) → Flink windows → top-K Redis mein + counts OLAP mein → cached API.</li>
      <li>Sliding window = 1-minute panes ka jod; event time + watermark se late events; checkpoint + replay se crash recovery.</li>
      <li>Key se partition karo to local top-K ka merge exact; warna har node se zyada candidates bhejo.</li>
      <li>Leaderboard = Redis sorted set: ZINCRBY, ZRANGE ... REV, ZREVRANK, sab O(log N). Redis source of truth nahi.</li>
      <li>Paisa juda ho to raw archive + batch reconciliation; bill hamesha exact number se.</li>
    </ul>` },

    { type: 'tradeoffs',
      gains: ['Stream + windows: trending seconds-minutes mein fresh', 'Count-min / Space-Saving: crores keys, KBs memory', 'Key se partition: kai machines, phir bhi exact merge', 'Redis sorted set: rank aur top-N O(log N)', 'Batch reconciliation: bill exact, stream ki galtiyaan maaf'],
      costs: ['Sketch over-count karta hai, rare items pe bekaar', 'Do pipelines (Lambda): same logic do jagah maintain', 'Dashboard aur bill ke numbers kuch ghante alag dikh sakte hain', 'Hot keys ke liye extra aggregation step', 'Redis memory mehengi, aur ek key ek node tak seemit'],
    },
    { type: 'think', questions: [
      { q: 'Trending list mein ek hi video 3 ghante se #1 pe atka hai, kyunki subah viral hua tha. Product chahta hai naye videos ko mauka mile. Kya badloge?', a: 'Window chhoti karo (1 ghanta → 15 minute), ya time decay: purane panes ko kam weight (jaise har 10 minute pe aadha). Ya "growth" pe rank karo: is window ka count ÷ pichhli window ka count, taaki tezi se badhne wale upar aayein. Panes ki wajah se ye sab sasta hai: weights sirf jodte waqt lagte hain.' },
      { q: 'Count-min sketch se top-K nikaal rahe ho. Window sliding hai. Purane minute ke events ko sketch se "nikaalna" kaise?', a: 'Sketch mein subtract technically ho sakta hai (counters ghatao), lekin aasaan raasta panes hain: har minute ka alag sketch, window = pichhle N sketches ka cell-wise jod. Naya minute aaya: sabse purana sketch phenk do. Heap ko bhi har window ke liye naye sire se candidates se banao.' },
      { q: 'Fantasy app: 2 crore users ka ek mega contest. Har user ko exact rank chahiye. Ek Redis sorted set kaafi hai?', a: 'Memory shayad fit ho jaaye, lekin ek key ek node pe: har ball pe lakhon ZINCRBY aur crores rank reads ek hi CPU pe. Upar ke kuch hazaar ki exact ranking ek chhote set mein, baaki ke liye score-bucket histogram se approximate rank ("top 12%"), aur updates ko kuch second batch karna. Agar sach mein sabko exact chahiye to rank ko har ball ke baad batch mein compute karke per-user cache karo.' },
    ]},

    { type: 'quiz', questions: [
      { q: 'Count-min sketch ka estimate asli count se...', options: ['Kabhi kam nahi hota, zyada ho sakta hai', 'Kabhi zyada nahi hota', 'Hamesha exact hota hai'], answer: 0, explain: 'Collisions sirf counters badhaate hain. Minimum lene se sabse kam milawat wala counter milta hai, lekin wo bhi asli se kam nahi.' },
      { q: '10 workers apna local top-10 bhejte hain aur merge hota hai. Kab ye global top-10 exact hoga?', options: ['Hamesha', 'Jab events item ke key se partition hon (ek item ke saare events ek worker pe)', 'Jab workers 10 se zyada hon'], answer: 1, explain: 'Key se partition = har item ka poora count ek jagah. Warna ek item har worker pe thoda thoda ho kar kisi local top-10 mein na aaye, phir bhi total mein upar ho.' },
      { q: 'Live leaderboard pe "meri exact rank" ke liye sabse fit tool?', options: ['Count-min sketch', 'Redis sorted set (ZINCRBY + ZREVRANK)', 'Har request pe SQL COUNT(*)'], answer: 1, explain: 'Skip list + hash table: update aur rank dono O(log N), exact. Sketch exact rank nahi deta, SQL har baar lakhon rows ginta hai.' },
      { q: 'Ad billing ke liye streaming count ke saath batch job kyun?', options: ['Batch fast hai', 'Stream mein duplicates, late events, approximation ho sakte hain; raw archive se batch exact aur dedupe karke final number deta hai', 'Kafka billing support nahi karta'], answer: 1, explain: 'Twitter ke Summingbird paper ne bhi yahi kaha: billing mein galti ki jagah nahi. Stream fast andaza, batch final sach.' },
      { q: 'Count-min sketch ke saath min-heap kyun rakhte hain?', options: ['Sketch ko fast banane ke liye', 'Sketch sirf "is item ka count kitna" batata hai, ye nahi ki kaun kaun se items hain; heap top-K candidates yaad rakhta hai', 'Heap collisions hata deta hai'], answer: 1, explain: 'Sketch counts ka andaza deta hai, items ki list nahi. Heap ka min har naye estimate se compare hota hai: bada ho to min bahar, naya andar.' },
      { q: 'Stream ne ek ad ke 10,302 clicks gine, batch ne 10,000. Bill kis number se banega aur kyun?', options: ['10,302, kyunki wo live hai', '10,000, kyunki batch ne raw archive se dedupe kiya, bots hataaye aur late clicks jode', 'Dono ka average'], answer: 1, explain: 'Stream ka number fast andaza hai (replay duplicates, bots, late events). Paisa sirf reconciled exact number se.' },
      { q: '1 ghante ki sliding window, har 1 minute slide. Sasta tareeka?', options: ['Har minute pichhle 1 ghante ke raw events dobara gino', 'Har minute ka pane (count ya sketch), window = pichhle 60 panes ka jod', 'Tumbling window hi use karo'], answer: 1, explain: 'Har event ek hi pane mein jaata hai. Naya pane jodo, sabse purana hatao. Sketches mergeable hain, to ye unke saath bhi chalta hai.' },
    ]},
    { type: 'sources', note: 'Top-K ek aam industry pattern hai; specific claims inhi docs aur papers se.', items: [
      { title: 'An Improved Data Stream Summary: The Count-Min Sketch and its Applications (Cormode, Muthukrishnan)', publisher: 'Journal of Algorithms', year: 2005, url: 'https://dimacs.rutgers.edu/~graham/pubs/papers/cm-full.pdf', used: 'w = ⌈e/ε⌉, d = ⌈ln(1/δ)⌉, error ≤ εN with probability 1 − δ, never underestimates.' },
      { title: 'Efficient Computation of Frequent and Top-k Elements in Data Streams (Metwally, Agrawal, El Abbadi)', publisher: 'ICDT 2005 / UCSB tech report', year: 2005, url: 'https://old.cs.ucsb.edu/research/tech_reports/reports/2005-23.pdf', used: 'Space-Saving algorithm for top-k and frequent elements with error guarantees.' },
      { title: 'Summingbird: A Framework for Integrating Batch and Online MapReduce Computations (Boykin, Ritchie, O\'Connell, Lin)', publisher: 'VLDB (Twitter)', year: 2014, url: 'http://www.vldb.org/pvldb/vol7/p1441-boykin.pdf', used: 'Batch (Hadoop) + online (Storm) hybrid at Twitter, Storm at-least-once needs batch backup, ~1% error fine for counts but billing advertisers needs exact counts, count-min sketches in production queries.' },
      { title: 'Redis sorted sets', publisher: 'Redis docs', official: true, url: 'https://redis.io/docs/latest/develop/data-types/sorted-sets/', used: 'Score ordering, lexicographic tie-break, leaderboards use case, skip list + hash table, O(log N) ZADD/ZINCRBY/ZRANK.' },
      { title: 'ZREVRANGE', publisher: 'Redis docs', official: true, url: 'https://redis.io/docs/latest/commands/zrevrange/', used: 'Deprecated as of 6.2.0 (use ZRANGE ... REV); descending lexicographic order for equal scores.' },
      { title: 'Windows (DataStream API)', publisher: 'Apache Flink docs', official: true, url: 'https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/operators/windows/', used: 'Tumbling/sliding/session windows, elements in multiple sliding windows, allowed lateness, incremental aggregation keeps one value per window.' },
      { title: 'Fault Tolerance via State Snapshots', publisher: 'Apache Flink docs', official: true, url: 'https://nightlies.apache.org/flink/flink-docs-stable/docs/learn-flink/fault_tolerance/', used: 'Checkpoint = state + source offsets, restore and rewind, exactly-once vs at-least-once, end-to-end needs replayable source + transactional/idempotent sink.' },
      { title: 'TopN queries', publisher: 'Apache Druid docs', official: true, url: 'https://druid.apache.org/docs/latest/querying/topnquery/', used: 'TopN is approximate: each segment returns top max(1000, threshold); accurate under ~1000 unique values; GroupBy for exact.' },
      { title: 'topK aggregate function', publisher: 'ClickHouse docs', official: true, url: 'https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/topk', used: 'Approximate top-K using Filtered Space-Saving; results not guaranteed exact.' },
    ]},
  ],
});
