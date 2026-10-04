(function () {
  /* Decision widget: questions as chips -> recommendation card.
     cfg = { questions: [{ id, q, opts: [[value, label]], when?(ans) }], decide(ans) -> { pick, why, cost, alt } }
     The cfg is also attached to the block (block.cfg) so a node script can walk every path. */
  const decider = (el, cfg) => {
    const ans = {};
    el.innerHTML = '<div class="dz-qs"></div><div class="dz-out" aria-live="polite"></div>' +
      '<div style="margin-top:12px"><button type="button" class="btn small ghost dz-reset">Shuru se</button></div>';
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
      if (!done) { out.innerHTML = '<div class="calc-note">Upar wale sawaal ka jawab chuno. Saare jawab milte hi recommendation yahan aayega.</div>'; return; }
      const r = cfg.decide(ans);
      out.innerHTML = `<div style="border:1px solid var(--line-2);border-left:4px solid var(--accent);border-radius:var(--r);background:var(--surface-2);padding:12px 14px">
        <div style="font-size:12px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.06em">Recommendation</div>
        <div style="font:700 20px/1.3 var(--f-display);color:var(--ink);margin:2px 0 8px">${r.pick}</div>
        <p style="margin:6px 0"><strong>Kyun:</strong> ${r.why}</p>
        <p style="margin:6px 0"><strong>Kya chhodte ho:</strong> ${r.cost}</p>
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
    { q: 'xyz.com pe "Live quiz" feature: match ke beech 20 lakh log ek saath sawaal ka jawab dete hain. Har jawab save karna hai, aur baad mein sirf "is user ke jawab" aur "is sawaal ke total" chahiye.', signal: 'Bahut zyada writes ek saath (burst), padhna sirf key se (user_id, question_id). Paisa nahi.', pick: 'Wide-column (Cassandra/ScyllaDB) ya DynamoDB; totals ke liye Redis counters', why: '20 lakh writes kuch seconds mein ek SQL primary ke liye bhaari hain. Key se access hai, joins nahi, to partitioned store sahi. "Is sawaal ke total" har baar ginna mehnga hai, isliye Redis mein INCR counter rakho.', trap: 'Agar quiz ke inaam mein paisa hai, to winners ka payout alag SQL table mein, transaction ke saath.' },
    { q: 'Creators ke liye "monthly earnings statement" (PDF): har mahine, har creator ka har video se kamaaya paisa.', signal: 'Do alag cheezein: paise ka hisaab (sahi hona zaroori) aur bade data pe report.', pick: 'Paisa SQL mein (source of truth); report warehouse (ClickHouse/BigQuery) se; PDF object storage mein', why: 'Ledger (paisa) ACID wale SQL mein. Mahine ka hisaab billions view-events pe hai, to warehouse. Bani hui PDF ek file hai, to S3 mein, aur DB mein uska link.', trap: 'Report seedha live SQL pe chalana: mahine ki pehli taarikh ko poori site slow.' },
    { q: 'Help-center bot: user poochhe "mera video upload kyun atak gaya?" aur bot 5,000 help articles mein se sahi article dhoondhe, chahe words alag hon.', signal: '"Matlab" se milaan, exact words nahi. Articles sirf hazaaron mein.', pick: 'pgvector (Postgres mein vector column + index)', why: '5,000 embeddings bahut chhota number hai. Postgres pehle se chal raha hai, to naya system lene ki zaroorat nahi. Article ka text, owner, aur embedding ek hi jagah.', trap: '"AI hai, to Pinecone/Milvus chahiye hi." Ek aur system aur bill, bina zaroorat ke.' },
    { q: 'Har video ke neeche "views" counter. Popular video pe 50,000 views/sec. Number thoda (kuch second) purana chalega.', signal: 'Ek hi key pe bahut tez writes; exact-turant sahi hona zaroori nahi.', pick: 'Redis INCR counter, har kuch second mein SQL mein batch flush', why: 'Har view pe SQL row update karna ek row pe lock ki ladai hai. Redis RAM mein counter badhata hai, aur ek job har ~10 s total DB mein likhta hai.', trap: 'Redis crash pe pichhle kuch second ke views kho sakte hain. Views ke liye chalega; paise ke liye kabhi nahi.' },
    { q: 'Admin panel: "un users ko dhoondo jinhone pichhle 7 din mein 3 se zyada videos report kiye, aur jinke account 30 din se naye hain".', signal: 'Kai filters ek saath, alag alag columns pe, aur shayad kal ek aur filter. Classic ad-hoc query.', pick: 'SQL (PostgreSQL), sahi indexes ke saath', why: 'Ye join + filter + group by wali query hai. SQL isi ke liye bana hai. Kal naya filter aaye to bas query badlo.', trap: 'Agar reports wala data Cassandra mein hai, to ye query wahan possible hi nahi; isliye "admin queries" ko bhi signal maan ke chalo.' },
    { q: 'Har user ka "continue watching" list: kaunsa video kitne second tak dekha. 10 crore users, har 10 second pe progress update.', signal: 'Bahut writes, padhna sirf user_id se, latest values. Thoda purana ho to chalega.', pick: 'Wide-column (Cassandra) ya DynamoDB, partition key = user_id', why: '10 crore users mein se, maan lo 1 crore ek saath dekh rahe hain: 1 crore / 10 s = 10 lakh writes/sec. Ye ek SQL primary ki capacity se bahut bahar hai. Partitioned key-based store isi ke liye.', trap: 'Analytics ("sabse zyada dekhi gayi category") isi table se nikaalna. Wahi events Kafka se warehouse mein bhejo.' },
  ];
  const R = (pick, why, cost, alt) => ({ pick, why, cost, alt });
  const CFG = {
    questions: [
      { id: 'need', q: 'Is data ka kaam kya hai?', opts: [
        ['txn', 'Paisa, stock, booking (double count = nuksaan)'],
        ['app', 'App ka core data (users, videos, comments)'],
        ['events', 'Time-wale events: chat messages, location pings, IoT'],
        ['metrics', 'Metrics: CPU, latency, time-stamped measurements'],
        ['search', 'Text search: typos, filters, ranking'],
        ['similar', '"Milta-julta matlab" dhoondhna (AI, recommendations)'],
        ['analytics', 'Billions rows pe reports / analytics'],
        ['files', 'Files: images, video, PDF'],
      ]},
      { id: 'shape', q: 'Data ka shape aur query kaisi hai?', when: a => a.need === 'app', opts: [
        ['rel', 'Relationships, kai tarah ki queries (joins, filters)'],
        ['key', 'Sirf key se get/put (session, cart, settings)'],
        ['doc', 'Nested, har item ke alag fields, poora ek saath padhte hain'],
        ['graph', 'Multi-hop: friends of friends, fraud rings'],
        ['unknown', 'Abhi pata nahi, product naya hai'],
      ]},
      { id: 'scale', q: 'Scale kitna hai?', when: a => a.need === 'txn' || a.need === 'events' || (a.need === 'app' && a.shape === 'key'), opts: [
        ['normal', 'Normal: hazaaron writes/sec, ek achhi machine sambhal le'],
        ['huge', 'Huge: lakhs writes/sec, ya data ek machine se bada'],
      ]},
      { id: 'vec', q: 'Kitne vectors (embeddings)?', when: a => a.need === 'similar', opts: [
        ['few', 'Lakhs se kuch crore tak, Postgres pehle se hai'],
        ['many', 'Sau crore+, ya bahut tez search chahiye'],
      ]},
    ],
    decide(a) {
      switch (a.need) {
        case 'txn': return a.scale === 'huge'
          ? R('SQL, sharded (ya distributed SQL: Spanner, CockroachDB)', 'Paisa double-count nahi hona chahiye, iske liye ACID transactions aur constraints chahiye. Scale badhne pe bhi ye zaroorat nahi badalti: SQL ko user_id se shard karo, ya aisa distributed SQL lo jo transactions rakhta hai.', 'Sharding ka operational dard; cross-shard transactions mehngi aur slow. Distributed SQL mein har write pe thoda zyada latency.', 'DynamoDB ke conditional writes + transactions, agar access sirf key se hai aur team careful design kar sake. Jo store transaction ya conditional write nahi deta, wo balance ke liye kabhi nahi.')
          : R('SQL: PostgreSQL / MySQL', 'Ek transaction mein "balance check + debit + order row" sab ya kuch nahi. UNIQUE aur CHECK constraints galat data database level pe rok dete hain. Ek achhi machine hazaaron transactions/sec kar leti hai.', 'Bahut bade scale pe sharding khud karni padegi. Schema change ke liye migrations.', 'Distributed SQL (CockroachDB, Spanner) jab ek region/ek machine chhoti pad jaaye.');
        case 'app': switch (a.shape) {
          case 'rel': return R('SQL: PostgreSQL / MySQL', 'Users, videos, comments, likes aapas mein jude hain aur tum inhe kai tarah se poochhoge ("is creator ke top videos", "kis user ne kya like kiya"). Joins aur indexes yahi kaam karte hain.', 'Bahut bade write scale pe sharding mushkil; joins shards ke paar kaam nahi karte.', 'Document DB agar har screen ek hi bada object padhti ho aur joins kam hon.');
          case 'key': return a.scale === 'huge'
            ? R('Key-value: DynamoDB (durable) / Redis (in-memory)', 'Sirf key se get/put, aur huge scale pe predictable latency chahiye. Key-value stores partition key se data baant ke ye guarantee dete hain.', 'Key ke alawa kisi aur field se query mushkil; har naye access pattern ke liye naya index ya naya table.', 'Ek SQL table jiski primary key yahi key ho, jab tak scale normal hai.')
            : R('SQL table (key = primary key)', 'Normal scale pe primary key lookup SQL mein bhi ~1 ms ka hai. Ek database kam = ek system kam chalana. Agar data temporary hai (session), Redis TTL ke saath bhi theek.', 'Agar traffic sach mein huge ho gaya to baad mein migrate karna padega.', 'Key-value store (DynamoDB/Redis) jab napkin maths dikhaaye ki ek SQL node nahi sambhalega.');
          case 'doc': return R('Document: MongoDB / Firestore', 'Har item ke fields alag hain (ek video mein chapters, doosre mein subtitles) aur screen poora document ek baar mein padhti hai. Document DB isi shape ke liye bana hai.', 'Joins kamzor; ek cheez ki kai copies (denormalize) sync rakhni padti hain. Multi-document transactions limited/mehngi.', 'PostgreSQL ka JSONB column: flexible fields bhi, aur baaki data ke saath joins bhi.');
          case 'graph': return R('Graph: Neo4j / Neptune', '"Friends of friends of friends" jaise multi-hop queries graph DB mein edges pe chalne jaisi hain. SQL mein har hop ek aur join, aur 3-4 hops pe query bahut mehngi ho jaati hai.', 'Ek aur database chalana; graph DBs ka sharding mushkil; team ko naya query language (Cypher/Gremlin).', 'SQL with recursive queries, agar sirf 1-2 hops chahiye.');
          default: return R('SQL: PostgreSQL / MySQL', 'Jab access patterns abhi saaf nahi, SQL sabse flexible hai: kal koi bhi nayi query aaye, index jodo aur chal jaayega. NoSQL mein query pehle se design karni padti hai.', 'Agar baad mein ek feature huge scale pe pahunchi, us hisse ko alag store mein le jaana padega.', 'Document DB, agar data sach mein bina structure ka hai. Lekin "pata nahi" khud SQL ki taraf signal hai.');
        }
        case 'events': return a.scale === 'huge'
          ? R('Wide-column: Cassandra / ScyllaDB / Bigtable', 'Bahut zyada writes aur access hamesha key se ("is chat ke latest messages"). LSM tree writes ko sequential bana deta hai, aur partition key data ko kai machines pe baant deti hai.', 'Ad-hoc queries nahi ("saare messages jisme word X"), uske liye search index alag. Har query ke liye table pehle se design. Eventual consistency samajhni padti hai.', 'SQL, user/chat se sharded, agar team ke paas Cassandra chalane ka experience nahi.')
          : R('SQL, index on (chat_id, time)', 'Normal scale pe ek SQL table + sahi composite index "latest 50 messages" ko milliseconds mein de deta hai. Abhi wide-column ka extra system lene ki zaroorat nahi.', 'Writes lakhs/sec pahunchi to ye table bottleneck banegi; tab partition/shard ya migrate karna.', 'Wide-column (Cassandra/ScyllaDB) jab write volume ek SQL node se bahar jaaye.');
        case 'metrics': return R('Time-series: Prometheus / InfluxDB / TimescaleDB', 'Data hamesha "is metric ki value is time pe" hai, aur queries time ranges pe hoti hain (last 1 ghanta ka average). Time-series DB compression, downsampling aur retention khud karta hai.', 'General queries aur joins ke liye nahi bana. Bahut zyada unique label combinations (high cardinality) pe Prometheus thak jaata hai.', 'Columnar warehouse (ClickHouse) jab metrics pe lambi, bhaari analytics chahiye.');
        case 'search': return R('Elasticsearch / OpenSearch, main DB ke saath', 'Typos, ranking aur filters ke liye inverted index chahiye. SQL ka LIKE \'%word%\' har row padhta hai. Asli data main DB mein rehta hai; search index uski copy hai jo CDC/events se sync hoti hai.', 'Ek aur cluster; index thoda peeche (seconds) chalta hai; sync pipeline toot sakti hai.', 'PostgreSQL full-text search, jab data chhota ho aur fuzzy/faceted search ki zaroorat kam.');
        case 'similar': return a.vec === 'many'
          ? R('Vector DB: Pinecone / Milvus', 'Billions embeddings pe "sabse milte-julte 10" dhoondhna (approximate nearest neighbour) ke liye dedicated vector DB scale aur speed deta hai.', 'Ek aur system aur bill; results approximate hote hain; metadata main DB se sync rakhna.', 'pgvector, jab tak vectors ki ginti aur latency target Postgres sambhal le.')
          : R('pgvector (PostgreSQL extension)', 'Postgres pehle se hai, to vector column + ANN index wahin lagao. Embeddings aur baaki data ek hi jagah, joins aur transactions bhi.', 'Bahut bade scale pe dedicated vector DB jitna tez nahi.', 'Pinecone / Milvus jab vectors sau crore cross karein.');
        case 'analytics': return R('Columnar warehouse: ClickHouse / BigQuery / Snowflake', '"Pichhle saal har din kitne views" jaise sawaal billions rows ke kuch hi columns padhte hain. Columnar storage sirf wahi columns disk se padhta hai aur unhe bahut compress karta hai.', 'Single row update/delete slow aur mehnga; live app ka main DB nahi ban sakta; data ETL/stream se aata hai, thoda late.', 'Main SQL ka read replica, jab data chhota ho aur reports kam.');
        default: return R('Object storage (S3 / GCS) + metadata in DB', 'Bade files ke liye sasta, almost unlimited, bahut durable storage. Database mein sirf file ka URL, owner, size jaisa metadata.', 'File ke andar query nahi kar sakte; file aur DB row ko sync rakhna (upload aadha hua to?).', 'Database BLOB column, sirf bahut chhoti files (avatar thumbnails) ke liye, woh bhi kam hi.');
      }
    },
  };

  Lesson.register({
    id: 'decide-db',
    title: 'SQL ya NoSQL?',
    minutes: 26,
    summary: `Database chunna "brand" ka sawaal nahi, signals ka sawaal hai. Requirements mein kaunsi line padh ke kaunsa database chunna hai, aur kab "popular" choice ek jaal hai.`,
    blocks: [
      { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Har app ko data kahin rakhna padta hai: paisa, chat, videos, search. Sab ke liye ek hi database sahi nahi hota.<br>Galat database chuna, to ya to app slow hogi, ya paisa double kat jaayega, ya bill bekaar bada aayega.<br>Is lesson mein hum ek simple tareeka seekhenge: requirement padho, usme ek "signal" dhoondo, aur us signal se database chuno.<br>Ek chhota helper bhi hai: sawaalon ke jawab do, aur wo batayega kya chunna hai aur kyun.` },
      { type: 'h2', text: 'Ab tak ki kahani: components aa gaye, judgment nahi' },
      { type: 'p', html: `Phase 2 aur 3 mein tumne bahut saare blocks seekhe: <a href="#/sql-vs-nosql">SQL vs NoSQL</a>, <a href="#/db-internals">B-tree aur LSM tree</a>, <a href="#/search">search</a>, <a href="#/object-storage">object storage</a>. Phase 4 mein napkin maths. Ab xyz.com ek bada platform hai: videos, chat, wallet, search, creator analytics. Har nayi feature ke saath ek hi sawaal aata hai: <em>"iska data kahan rakhein?"</em>` },
      { type: 'p', html: `Beginner ka jawab hota hai "it depends". Interviewer ka agla sawaal: <em>"Kis cheez pe depend karta hai?"</em> Ye lesson usi ka jawab hai. Hum concepts dobara nahi padhenge (wo SQL vs NoSQL lesson mein hain). Yahan hum <strong>requirements mein signals</strong> dhoondhna seekhenge, aur har signal ko ek database family se jodenge.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Signal', html: `<strong>Ye kya hai:</strong> requirement ki wo ek line jo decision badal deti hai. Jaise "user ka paisa kat-ta hai", ya "har second 5 lakh location pings aate hain".<br><strong>Kyun chahiye:</strong> "it depends" ko ek thos wajah mein badalta hai. Pehle signal, brand ka naam baad mein.<br><strong>Iske bina:</strong> log database "popular hai" ya "scale karta hai" sun ke chunte hain, aur baad mein pachhtaate hain.<br><strong>Example:</strong> "tip bhejne pe paisa kabhi double na kate" = signal "transactions chahiye" = SQL.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Access pattern', html: `<strong>Ye kya hai:</strong> data ko <strong>kaise</strong> padha aur likha jaayega: kis key se, kaunse filters, kitni baar, kitna bada. Jaise "is chat ke last 50 messages, time ke order mein".<br><strong>Kyun chahiye:</strong> NoSQL databases ek-do access patterns ke liye bahut tez hote hain, baaki ke liye mushkil. SQL kai patterns ko theek-thaak sambhal leta hai. To pehle pattern likho, phir store chuno.<br><strong>Iske bina:</strong> tum aisa store chun loge jo tumhari asli query kar hi nahi sakta (jaise Cassandra mein "saare messages jinme word X hai").` },
      { type: 'callout', tone: 'tip', title: 'Default rule (Decide)', html: `<strong>PostgreSQL ya MySQL se shuru karo</strong>, jab tak koi thos wajah na ho. Thos wajah = ek specific signal jo neeche ki table mein hai, aur jo SQL ko sach mein dard de raha hai (numbers ke saath, feeling se nahi).` },
      { type: 'h3', text: 'Pichhle lessons ke words, ek line mein' },
      { type: 'p', html: `Neeche ke decisions mein ye words baar baar aayenge. Har ek ko detail mein pichhle lessons mein padha hai; yahan bas ek line ki yaad:` },
      { type: 'table', head: ['Word', 'Ek line mein', 'Detail'], rows: [
        ['ACID transaction', 'Kai badlaav ek packet ki tarah: ya to sab ho, ya kuch nahi. Beech mein koi aur adha-adhoora data nahi dekhta.', '<a href="#/sql-vs-nosql">SQL vs NoSQL</a>'],
        ['Join', 'Do tables ko ek common column (jaise user_id) se jod ke ek jawab banana.', '<a href="#/sql-vs-nosql">SQL vs NoSQL</a>'],
        ['Index', 'Kitaab ke peeche ki index jaisi list, taaki poori table padhe bina sahi row mil jaaye.', '<a href="#/db-internals">DB internals</a>'],
        ['Partition key', 'Wo field (jaise chat_id) jisse database decide karta hai ki row kis machine pe jaayegi.', '<a href="#/sharding">Sharding</a>'],
        ['LSM tree', 'Writes ko pehle RAM mein jama karke disk pe ek saath, line se likhne ka tareeka. Isse writes bahut tez.', '<a href="#/db-internals">DB internals</a>'],
        ['Eventual consistency', 'Copies thodi der alag ho sakti hain, baad mein sab same ho jaati hain.', '<a href="#/cap">CAP</a>'],
        ['Inverted index', 'Har word → kin documents mein hai, ki list. Search engine isi se chalta hai.', '<a href="#/search">Search</a>'],
        ['CDC', 'Change Data Capture: database ke har badlaav ko event bana ke doosre systems ko bhejna.', '<a href="#/kafka">Kafka</a>'],
        ['Embedding', 'Kisi text ya image ka numbers ka list (vector). Milte-julte matlab wali cheezon ke vectors paas paas hote hain.', '<a href="#/search">Search</a>'],
      ]},
      { type: 'h2', text: 'Decision helper: sawaal jawab, database ready' },
      { type: 'p', html: `Ek feature socho (xyz.com ka wallet, chat, video search, kuch bhi). Neeche sawaalon ke jawab do. Har jawab ke baad agla sawaal khulta hai. End mein milega: <strong>kya chuno, kyun, kya chhodte ho, aur doosra best option</strong>. Alag alag raaste try karo; har combination ka ek sensible jawab hai.` },
      { type: 'custom', cfg: CFG, render(el) { decider(el, CFG); } },
      { type: 'callout', tone: 'term', title: 'Naya word: Polyglot persistence', html: `<strong>Ye kya hai:</strong> ek hi app mein alag alag kaam ke liye alag alag databases. "Polyglot" matlab kai bhashayein bolne wala.<br><strong>Kyun chahiye:</strong> ek bada app <strong>ek</strong> database se nahi chalta. Roadmap ka example: Zomato jaise app mein plausibly orders aur payments SQL mein, sessions aur live state Redis mein, search Elasticsearch mein, aur in sabko jodne ke liye Kafka.<br><strong>Iske bina:</strong> ek hi store se sab karwaoge to koi na koi feature slow ya galat hogi (jaise SQL ke LIKE se search).<br><strong>Keemat:</strong> har naya store = ek aur cheez jo raat ko 3 baje gir sakti hai, jiske backups aur monitoring chahiye. Isliye naya store tabhi jab signal mazboot ho.` },

      { type: 'h2', text: 'Poori table, ek nazar mein' },
      { type: 'table', head: ['Requirement mein signal', 'Lean towards'], caption: 'Roadmap phase 5: "SQL or NoSQL?"', rows: [
        ['Paisa, inventory, bookings: kuch bhi jo kabhi double-count nahi hona chahiye', 'SQL (ACID transactions)'],
        ['Data mein relationships, aur kai tarah se query hoga (users, orders, videos, comments)', 'SQL'],
        ['Access pattern abhi saaf nahi, early product', 'SQL; ye sabse flexible hai'],
        ['Bahut zyada writes, key se simple access (chat messages, events, IoT, location history)', 'Wide-column: Cassandra, ScyllaDB, Bigtable'],
        ['Huge scale pe simple get/put by key, predictable latency (sessions, carts, user settings)', 'Key-value: DynamoDB, Redis'],
        ['Flexible, nested, alag alag schema, ek blob ki tarah padha jaaye (product catalog, CMS content)', 'Document: MongoDB, Firestore'],
        ['Multi-hop relationship queries (friends of friends, fraud rings)', 'Graph: Neo4j, Neptune'],
        ['Metrics aur time-stamped measurements', 'Time-series: Prometheus, InfluxDB, TimescaleDB'],
        ['Full-text, fuzzy ya faceted search', 'Elasticsearch / OpenSearch, main DB ke saath'],
        ['AI aur recommendations ke liye "milta julta matlab"', 'Vector: pgvector, Pinecone, Milvus'],
        ['Billions rows pe analytics', 'Columnar warehouse: ClickHouse, BigQuery, Snowflake'],
        ['Files, images, video', 'Object storage (S3, GCS); metadata DB mein'],
      ]},
      { type: 'callout', tone: 'term', title: 'Table ke do naye words: faceted search, columnar', html: `<strong>Faceted search, ye kya hai:</strong> search ke saath side mein filters aur unke counts ("Language: Hindi (120), English (80)"). <strong>Kyun chahiye:</strong> user ek click mein results chhote kar sake. <strong>Iske bina:</strong> har filter ke liye alag query aur count, bahut slow.<br><strong>Columnar, ye kya hai:</strong> data row-by-row ki jagah column-by-column disk pe. <strong>Kyun chahiye:</strong> "sirf views column ka sum" padhne ke liye poori row (title, description, sab) na padhni pade. <strong>Iske bina:</strong> billions rows ki report mein 10-50 guna zyada disk padhna.` },
      { type: 'h2', text: 'Har row, ek ek karke: signal, scenario, wajah, jaal' },
      { type: 'p', html: `Table yaad karne ki cheez nahi, samajhne ki cheez hai. Har row ke liye chaar sawaal: <strong>Signal</strong> kaisa dikhta hai? xyz.com mein kahan? <strong>Kyun</strong> ye store? Aur <strong>jaal</strong> kya hai, jahan log galti karte hain?` },
      { type: 'h3', text: 'Paisa, stock, booking → SQL (ACID)' },
      { type: 'p', html: `<strong>Signal:</strong> "kabhi double nahi hona chahiye". Paisa kat-na, seat book hona, stock ghatna.<br><strong>xyz.com:</strong> creator wallet. Riya ₹500 ki tip bhejti hai: uske wallet se ghatna, creator ke wallet mein judna, aur ek "tip" row banna. Teeno ek saath.<br><strong>Kyun SQL:</strong> ACID transaction teeno kaam ek packet mein karta hai. Beech mein crash ho to kuch bhi aadha nahi rehta. <code>CHECK (balance >= 0)</code> jaisa constraint galat data ko database level pe hi rok deta hai, chahe app ke code mein bug ho.<br><strong>Jaal:</strong> "10 crore users hain, isliye NoSQL". Users ki ginti signal nahi; writes per second signal hai. Napkin maths (neeche) dikhaata hai ki ek PostgreSQL kaafi hai. Detail: <a href="#/sql-vs-nosql">SQL vs NoSQL</a>, <a href="#/distributed-tx">distributed transactions</a>.` },
      { type: 'h3', text: 'Relationships, kai tarah ki queries → SQL' },
      { type: 'p', html: `<strong>Signal:</strong> cheezein aapas mein judi hain, aur unhe kai tarah se poochha jaayega.<br><strong>xyz.com:</strong> users, videos, comments, likes, subscriptions. Queries: "is creator ke top 10 videos", "Riya ne kin videos pe comment kiya", "kis video ke sabse zyada naye subscribers aaye".<br><strong>Kyun SQL:</strong> data ek baar, saaf tables mein (normalized). Har nayi query ke liye bas ek index jodo. Joins ye jodne ka kaam database mein hi kar dete hain.<br><strong>Jaal:</strong> har screen ke liye alag NoSQL table bana dena. Phir ek like 4 jagah update karna padta hai, aur ek jagah bhoole to numbers alag dikhte hain.` },
      { type: 'h3', text: 'Access pattern abhi saaf nahi → SQL' },
      { type: 'p', html: `<strong>Signal:</strong> product naya hai, har hafte features badalte hain, kal kaunsi query aayegi pata nahi.<br><strong>xyz.com:</strong> naya "Shorts" feature. Abhi pata nahi ki trending kaise dikhayenge, ya creators ko kaunse stats chahiye.<br><strong>Kyun SQL:</strong> SQL mein pehle data rakho, query baad mein socho. NoSQL (jaise DynamoDB, Cassandra) mein ulta hai: pehle queries likho, phir unke hisaab se table design karo.<br><strong>Jaal:</strong> "MongoDB flexible hai, isliye naye product ke liye best". Flexible <em>schema</em> (fields) aur flexible <em>queries</em> alag cheezein hain. Naye product mein queries zyada badalti hain.` },
      { type: 'h3', text: 'Bahut zyada writes, key se access → Wide-column' },
      { type: 'p', html: `<strong>Signal:</strong> har second lakhs writes, aur padhna hamesha ek hi key se ("is chat ke latest messages", "is driver ki pichhle ghante ki location").<br><strong>xyz.com:</strong> live chat aur comments ke messages, roz crore. Har message ek write.<br><strong>Kyun wide-column (Cassandra, ScyllaDB, Bigtable):</strong> partition key (chat_id) data ko kai machines pe baant deti hai. LSM tree writes ko line se, tez likhta hai. Machines jodo, capacity badhti hai.<br><strong>Jaal 1:</strong> normal scale pe ise lena. 500 writes/sec ek SQL table aaram se le leti hai. <strong>Jaal 2:</strong> baad mein ad-hoc query chahiye ("saare messages jinme 'refund' likha hai"). Wide-column ye nahi karta; uske liye alag search index.` },
      { type: 'h3', text: 'Huge scale pe simple get/put by key → Key-value' },
      { type: 'p', html: `<strong>Signal:</strong> "key do, value lo". Koi filter nahi, koi join nahi. Aur bahut zyada traffic pe har baar same tez jawab chahiye.<br><strong>xyz.com:</strong> login sessions (session_id → user), user settings (user_id → dark mode, language), watch-later list.<br><strong>Kyun key-value (DynamoDB, Redis):</strong> sabse simple model, isliye sabse aasaani se scale. Redis RAM mein hai: sub-millisecond, lekin RAM mehngi aur data restart pe kho sakta hai (agar persistence band ho). DynamoDB disk pe durable, managed, single-digit millisecond.<br><strong>Jaal:</strong> baad mein "saare users jinki language Hindi hai" chahiye. Key-value store mein ye poora data scan hai. Aur Redis ko <em>source of truth</em> (asli, akeli copy) banana bina persistence soche.` },
      { type: 'h3', text: 'Nested, alag alag fields, ek saath padha jaaye → Document' },
      { type: 'p', html: `<strong>Signal:</strong> har item ka shape alag, aur screen poora item ek baar mein padhti hai.<br><strong>xyz.com:</strong> creator ka "channel page" builder: kisi mein banner + playlists, kisi mein FAQ + links + merch. Ya help-center articles (CMS).<br><strong>Kyun document (MongoDB, Firestore):</strong> poora page ek JSON document. Ek read, poora page. Naya section type aaye to schema migration nahi.<br><strong>Jaal:</strong> isme paisa ya kai documents ke beech ke rishte rakhna. Joins kamzor hain, aur data ki kai copies sync rakhni padti hain. Bahut baar PostgreSQL ka <code>JSONB</code> column (JSON ko ek column mein rakhna, index ke saath) dono kaam kar deta hai.` },
      { type: 'h3', text: 'Multi-hop rishte → Graph' },
      { type: 'p', html: `<strong>Signal:</strong> sawaal "kaun kisse kaise juda hai", aur 3-4 kadam (hops) door tak.<br><strong>xyz.com:</strong> fraud team: "ye naya account kis phone, kis card, kis address ke through un 50 banned accounts se juda hai?" Ye query live chalni hai, payment ke waqt.<br><strong>Kyun graph (Neo4j, Neptune):</strong> graph DB har cheez (node) ke saath uske rishte (edges) ka pointer rakhta hai. Har hop ek pointer pe chalna hai, poori table ka join nahi.<br><strong>Jaal:</strong> "friends" sunte hi graph DB. Sirf 1-2 hops ("mere friends ke friends") SQL self-join ya raat ki batch job se ho jaata hai. Ek naya database chalane ka kharcha tab hi jab multi-hop <em>live</em> query asli zaroorat ho.` },
      { type: 'h3', text: 'Metrics, time-stamped measurements → Time-series' },
      { type: 'p', html: `<strong>Signal:</strong> data hamesha "is cheez ki value, is time pe". Queries time ranges pe: "pichhle 1 ghante ka average", "p99 latency har minute".<br><strong>xyz.com:</strong> har server ka CPU, har API ki latency, har second kitne video plays.<br><strong>Kyun time-series (Prometheus, InfluxDB, TimescaleDB):</strong> ye time ke hisaab se data ko bahut compress karte hain, purane data ko automatically average karke chhota karte hain (downsampling), aur purana data apne aap delete (retention).<br><strong>Jaal:</strong> label mein user_id ya video_id daal dena. Har unique label combination ek alag series ban jaati hai (isko <strong>high cardinality</strong> kehte hain), aur Prometheus ki memory phat jaati hai. Per-user cheezein logs ya warehouse mein.` },
      { type: 'h3', text: 'Full-text, fuzzy, faceted search → Elasticsearch / OpenSearch' },
      { type: 'p', html: `<strong>Signal:</strong> user kuch bhi type karega, typo ke saath, aur best results upar chahiye, filters ke saath.<br><strong>xyz.com:</strong> video search box: "cricket highlihgts hindi".<br><strong>Kyun search engine:</strong> inverted index word se seedha documents tak le jaata hai, typo ko "fuzzy" match karta hai, aur relevance se rank karta hai. SQL ka <code>LIKE '%word%'</code> har row padhta hai aur ranking nahi deta.<br><strong>Jaal:</strong> Elasticsearch ko hi main database bana dena. Ye "alongside", yaani <em>saath mein</em> hai. Asli data SQL mein; search index uski copy hai jo CDC se sync hoti hai aur zarurat pade to dobara poori banayi ja sakti hai. Detail: <a href="#/search">Search</a>.` },
      { type: 'h3', text: '"Milta-julta matlab" → Vector' },
      { type: 'p', html: `<strong>Signal:</strong> exact word nahi, <em>matlab</em> milna chahiye. "funny cat videos" pe wo video bhi aaye jiske title mein "billi ki masti" hai.<br><strong>xyz.com:</strong> "aapko ye bhi pasand aayega" recommendations, aur AI help-bot jo help articles se jawab dhoondhta hai.<br><strong>Kyun vector store (pgvector, Pinecone, Milvus):</strong> har video/article ka embedding rakho. Query ka embedding banao aur "sabse paas ke 10" dhoondo. Ye exact nahi, <strong>approximate nearest neighbour (ANN)</strong> search hai: thoda accuracy chhod ke bahut speed.<br><strong>Jaal:</strong> pehle din se alag vector DB. Agar Postgres pehle se hai aur vectors lakhs-crore mein hain, to <code>pgvector</code> extension (HNSW index ke saath) se shuru karo.` },
      { type: 'h3', text: 'Billions rows pe analytics → Columnar warehouse' },
      { type: 'p', html: `<strong>Signal:</strong> sawaal poore itihaas pe: "pichhle saal har din, har category mein kitne watch-minutes?"<br><strong>xyz.com:</strong> creator dashboard aur business reports.<br><strong>Kyun columnar (ClickHouse, BigQuery, Snowflake):</strong> sirf wahi 2-3 columns padhta hai jo query mein hain, aur unhe bahut compress karta hai. Billions rows pe seconds mein jawab.<br><strong>Jaal:</strong> ye report main database pe chalana (jise <strong>OLTP</strong> kehte hain: live app ka database jo chhote, tez reads/writes karta hai). Ek bhaari report live app ke saare users ko slow kar degi. Doosra jaal: warehouse ko live app ka database banana; single row update ke liye ye bana hi nahi. Data Kafka/ETL se thodi der baad aata hai. Detail: <a href="#/big-data">Big data</a>.` },
      { type: 'h3', text: 'Files, images, video → Object storage + metadata in DB' },
      { type: 'p', html: `<strong>Signal:</strong> cheez ek badi file hai (MBs se GBs), jo poori padhi/likhi jaati hai.<br><strong>xyz.com:</strong> uploaded videos, thumbnails, profile photos.<br><strong>Kyun object storage (S3, GCS):</strong> sasta, almost unlimited, aur bahut durable. Database mein sirf metadata: video_id, owner, title, file ka path, status.<br><strong>Jaal:</strong> video ko DB row (BLOB) mein rakhna. Database bhaari, backups ghanton ke, aur bill bada. Doosra jaal: upload aadha hua aur DB row "ready" bol rahi hai. Isliye status column: "uploading" → "ready". Detail: <a href="#/object-storage">Object storage</a>.` },
      { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"NoSQL = scale, SQL = slow" <strong>galat hai</strong>. NoSQL scale isliye karta hai kyunki wo kuch cheezein <em>chhod deta hai</em> (joins, flexible queries, aksar multi-row transactions). Agar tumhe wahi cheezein chahiye, NoSQL tumhe scale nahi, sirf bugs dega. Aur PostgreSQL ek achhi machine pe hazaaron transactions/sec aaraam se karta hai, jo zyada tar apps ke liye saalon kaafi hai. Doosri galti: "MongoDB flexible hai isliye early product ke liye best". Early product mein <em>queries</em> badalti hain, aur nayi queries ke liye SQL zyada flexible hai.` },
      { type: 'h2', text: 'Worked scenarios: xyz.com ki features' },
      { type: 'p', html: `Har scenario mein pehle signal dhoondho, phir decision. Widget mein khud bhi try karke dekho ki wahi jawab aata hai ya nahi.` },
      { type: 'h3', text: '1. Chat: roz crore messages' },
      { type: 'p', html: `<strong>Signal:</strong> writes bahut zyada (har message ek write), aur padhna hamesha ek hi tarah: "is chat ke latest 50 messages". Koi join nahi, koi paisa nahi. <strong>Decision:</strong> shuru mein SQL + index on (chat_id, created_at) chal jaayega. Jab writes lakhs/sec ho jaayein, <strong>wide-column</strong> (Cassandra/ScyllaDB) with partition key = chat_id aur clustering = time. Discord ne yahi raasta liya: 2017 ki ek post mein unhone MongoDB se Cassandra pe jaane ki kahani batayi, aur 2023 ki post mein trillions messages ke liye ScyllaDB pe jaane ki. (Dono posts kuch saal purani hain, lekin decision ka logic aaj bhi wahi hai.)` },
      { type: 'h3', text: '2. Video uploads' },
      { type: 'p', html: `<strong>Signal:</strong> files, GBs mein. <strong>Decision:</strong> video <a href="#/object-storage">object storage</a> (S3/GCS) mein, aur database (SQL) mein sirf metadata: video_id, owner, title, duration, file ka URL, status. Video ko DB row mein rakhna DB ko bhaari, backups ko slow aur bill ko bada bana deta hai.` },
      { type: 'h3', text: '3. Video search: "cricket highlihgts" (typo ke saath)' },
      { type: 'p', html: `<strong>Signal:</strong> full-text, fuzzy (typo), filters (language, duration). <strong>Decision:</strong> <a href="#/search">Elasticsearch/OpenSearch</a> <em>main DB ke saath</em>, replacement nahi. Source of truth SQL mein; har change <a href="#/kafka">CDC/Kafka</a> se search index tak jaata hai. Search thoda peeche (seconds) ho sakta hai, chalega.` },
      { type: 'h3', text: '4. Trap: wallet, "kyunki 10 crore users hain"' },
      { type: 'p', html: `xyz.com creators ko paisa deta hai aur users wallet se tip bhejte hain. Team kehti hai: "10 crore users hain, Cassandra lo, wo scale karta hai." <strong>Ye jaal hai.</strong> Signal "users bahut hain" nahi, signal hai <strong>"paisa double nahi katna chahiye"</strong>. Iske liye atomic "check + debit" chahiye. Aur 10 crore users ka matlab 10 crore transactions/sec nahi: agar roz 1 crore tips hon, to ~1 crore / 10<sup>5</sup> sec ≈ <strong>100 writes/sec</strong> average. Ek PostgreSQL ke liye ye kuch bhi nahi. <strong>Decision: SQL</strong>. Bahut aage jaake shard karo user_id se. Neeche diagram mein dekho galat choice se kya hota hai.` },
      { type: 'h3', text: '5. Trap: "people you may know" ke liye graph DB?' },
      { type: 'p', html: `"Friends" sunte hi graph DB yaad aata hai. Lekin agar feature sirf <strong>"mere friends ke friends"</strong> (2 hops) hai, to SQL mein ek self-join, ya raat ko batch job jo suggestions pehle se nikaal ke rakh de, kaafi hai. Graph DB tab jab hops 3-4+ hon, ya query <em>live</em> chalni ho (fraud ring: "ye card, is phone, is address, us account se kaise juda hai?"). <strong>Decision:</strong> pehle SQL / batch; graph tab jab multi-hop live query asli zaroorat ho.` },

      { type: 'h2', text: 'Practice: 6 chhote cases' },
      { type: 'p', html: `Ab tumhari baari. Har case padho, pehle khud socho: signal kya hai? Phir "Signal dikhao", aur phir "Jawab dikhao". Jawab ke saath wo jaal bhi hai jisme log aksar girte hain.` },
      { type: 'custom', render(el) { practice(el, CASES, { case: 'Case', hint: 'Signal dikhao', ans: 'Jawab dikhao', prev: '← Pichhla', next: 'Agla →', signal: 'Signal', trap: 'Jaal' }); } },
      { type: 'h2', text: 'Galat choice ka nateeja, chala ke dekho' },
      { type: 'p', html: `Riya ke wallet mein ₹500 hain. Wo phone aur laptop se <em>ek hi second</em> mein do alag creators ko ₹500 tip karti hai. Sahi system mein ek tip fail honi chahiye. Do scenarios chalao: SQL transaction, aur ek eventually consistent store jahan code "pehle padho, phir likho" karta hai.` },
      { type: 'flow', height: 320,
        nodes: [
          { id: 'ph', label: 'Riya: phone', sub: 'tip ₹500', x: 95, y: 80, w: 150, kind: 'client', info: 'Ye kya hai: Riya ka phone, jahan se pehli ₹500 ki tip bheji gayi. Dono requests lagbhag ek hi waqt pe nikli, isi se race banti hai.' },
          { id: 'lt', label: 'Riya: laptop', sub: 'tip ₹500', x: 95, y: 240, w: 150, kind: 'client', info: 'Ye kya hai: Riya ka laptop, jahan se usi second mein doosri ₹500 ki tip gayi. Ek hi wallet pe do ek-saath requests: race condition (do kaam ek saath, nateeja order pe depend) ka setup.' },
          { id: 'app', label: 'Wallet service', x: 340, y: 160, w: 150, kind: 'server', info: 'Ye kya hai: xyz.com ki wallet service, yaani wo code jo tip ka kaam karta hai. Sahi design mein ye "check aur debit" ek atomic step mein database ko deta hai. Galat design mein pehle balance padhta hai, phir app mein check karke naya balance likhta hai (read-then-write).' },
          { id: 'r1', label: 'DB node 1', sub: 'bal ₹500', x: 590, y: 80, w: 150, kind: 'data', info: 'Ye kya hai: pehla database server (node). SQL scenario mein yahi akela PostgreSQL primary hai. NoSQL scenario mein ek replica jo writes le sakta hai.' },
          { id: 'r2', label: 'DB node 2', sub: 'bal ₹500', x: 590, y: 240, w: 150, kind: 'data', info: 'Ye kya hai: doosra database server, pehle ki copy (replica). NoSQL scenario mein yahi doosra replica hai. Dono nodes writes lete hain aur baad mein ek doosre ko changes bhejte hain (eventual consistency).' },
        ],
        edges: [{ a: 'ph', b: 'app' }, { a: 'lt', b: 'app' }, { a: 'app', b: 'r1' }, { a: 'app', b: 'r2', id: 'e2' }, { a: 'r1', b: 'r2', id: 'rep', dashed: true }],
        scenarios: [
          { name: 'SQL transaction (sahi)', steps: [
            { title: 'Ek hi source of truth', text: 'Wallet PostgreSQL mein hai. Ek primary, saare writes wahin.', hide: ['r2', 'e2', 'rep'], set: { r1: { label: 'PostgreSQL', sub: 'bal ₹500', state: '' } }, focus: ['r1'] },
            { title: 'Phone wali tip', text: 'Check aur debit <strong>ek hi statement</strong> mein: balance tabhi ghatao jab kaafi ho. Database row ko lock karke ye atomic karta hai.', go: ['ph>app>r1'], msg: 'UPDATE wallets SET bal = bal - 500\nWHERE user_id = 7 AND bal >= 500;   -- 1 row', after: { r1: { sub: 'bal ₹0', state: 'ok' } } },
            { title: 'Success', text: 'Ek row update hui, matlab tip gayi.', go: 'res:r1>app>ph', msg: '1 row updated → tip sent' },
            { title: 'Laptop wali tip', text: 'Same statement, lekin ab bal = 0, to condition fail. Zero rows update. Koi paisa nahi kata.', go: ['lt>app>r1', 'bad:r1>app>lt'], msg: '0 rows updated → "Balance kam hai"' },
          ]},
          { name: 'Eventual store (galat)', steps: [
            { title: 'Do nodes, dono writes lete hain', text: 'Wallet ek eventually consistent store mein hai, default settings, aur code pehle balance <em>padhta</em> hai phir naya balance <em>likhta</em> hai.', show: ['r2', 'e2', 'rep'], set: { r1: { label: 'DB node 1', sub: 'bal ₹500', state: '' }, r2: { sub: 'bal ₹500', state: '' } } },
            { title: 'Dono padhte hain: ₹500', text: 'Phone ki request node 1 se, laptop ki node 2 se. Dono ko ₹500 dikhta hai. App mein check: "500 >= 500, theek hai".', parallel: true, go: ['ph>app>r1', 'lt>app>r2'], msg: 'GET wallet:7 → 500   (dono taraf)' },
            { title: 'Dono likhte hain: ₹0', text: 'Dono "bal = 0" likhte hain aur dono tips creators ko chali jaati hain.', parallel: true, go: ['app>r1', 'app>r2'], after: { r1: { sub: 'bal ₹0' }, r2: { sub: 'bal ₹0' } }, msg: 'PUT wallet:7 bal=0   (2 baar)' },
            { title: 'Sync ke baad: ₹1000 nikal gaye', text: 'Replicas sync hote hain. Rule hai <em>last write wins</em> (jo write sabse baad ka, wahi bachta hai), to balance ₹0 dikhta hai. Sab "theek" lagta hai, lekin ₹500 ke wallet se <strong>₹1000</strong> nikal gaye. Isko <strong>double spend</strong> kehte hain, aur ye bug logs mein bhi dikhta nahi.', go: 'evt:r1>r2', after: { r1: { state: 'warn', sub: '2 tips, ₹1000 gaye!' }, r2: { state: 'warn', sub: '2 tips, ₹1000 gaye!' } } },
            { title: 'Fix', text: 'Paise ke liye transaction chahiye, ya kam se kam <strong>conditional write</strong>: "sirf tab likho jab balance abhi bhi 500 ho" (Cassandra mein isko LWT, lightweight transaction kehte hain; DynamoDB mein condition expression). Aur simplest fix: wallet SQL mein rakho. Scale ka sawaal napkin maths se poochho, darr se nahi.', focus: ['app'] },
          ]},
        ],
      },
      { type: 'h2', text: 'Interview mein ye kaise bolein' },
      { type: 'steps', items: [
        { t: 'Signal bolo', d: '"Wallet mein paisa double nahi katna chahiye" ya "messages ka write volume ~2 lakh/sec hai, aur padhna sirf chat_id se".' },
        { t: 'Choice bolo', d: '"Isliye wallet PostgreSQL mein, messages Cassandra mein, partition key chat_id."' },
        { t: 'Kya chhoda, wo bhi bolo', d: '"Cassandra mein ad-hoc queries nahi milengi, isliye message search alag Elasticsearch index se."' },
        { t: 'Runner-up bolo', d: '"Agar scale chhota rehta, to messages bhi Postgres mein hi rakhte; ek system kam."' },
      ]},
      { type: 'diagram', title: 'xyz.com ke databases: poori picture', height: 510,
        groups: [
          { label: 'Users', x: 20, y: 14, w: 680, h: 76 },
          { label: 'App', x: 20, y: 110, w: 680, h: 100 },
          { label: 'Main stores', x: 4, y: 232, w: 712, h: 106 },
          { label: 'Async copies', x: 4, y: 380, w: 712, h: 114 },
        ],
        nodes: [
          { id: 'users', label: 'Users', sub: 'app + browser', x: 360, y: 50, w: 160, kind: 'client', info: 'Ye kya hai: xyz.com ke users. Wo tip bhejte hain, chat karte hain, video upload aur search karte hain. Har kaam ka data alag store mein jaata hai.' },
          { id: 'app', label: 'App services', sub: 'wallet, chat, video', x: 360, y: 160, w: 200, kind: 'server', info: 'Ye kya hai: xyz.com ka code (kai services). Har feature apne signal ke hisaab se store chunti hai: wallet SQL mein, chat wide-column mein, files object storage mein.' },
          { id: 'pg', label: 'PostgreSQL', sub: 'wallet, users', x: 70, y: 290, w: 120, kind: 'data', info: 'Ye kya hai: main SQL database, source of truth. Wallet (ACID), users, videos ka metadata, comments. pgvector extension se recommendations ke embeddings bhi yahin. Default choice.' },
          { id: 'redis', label: 'Redis', sub: 'sessions, counts', x: 210, y: 290, w: 120, kind: 'cache', info: 'Ye kya hai: RAM wala key-value store. Login sessions, views counters (har kuch second pe SQL mein flush). Simple get/put by key, bahut tez.' },
          { id: 'cass', label: 'Cassandra', sub: 'chat messages', x: 350, y: 290, w: 120, kind: 'data', info: 'Ye kya hai: wide-column store. Chat messages: roz crore writes, padhna hamesha chat_id se, time ke order mein. Partition key = chat_id.' },
          { id: 'es', label: 'Elasticsearch', sub: 'video search', x: 490, y: 290, w: 120, kind: 'data', info: 'Ye kya hai: search engine (inverted index). Typo wale, ranked search ke liye. Main DB ki copy hai, Kafka/CDC se sync; source of truth nahi.' },
          { id: 's3', label: 'Object store', sub: 'video files', x: 630, y: 290, w: 120, kind: 'data', info: 'Ye kya hai: S3/GCS jaisa file storage. Videos aur thumbnails yahan; DB mein sirf file ka path aur status.' },
          { id: 'kafka', label: 'Kafka (CDC)', sub: 'DB changes', x: 190, y: 440, w: 150, kind: 'queue', info: 'Ye kya hai: event log. PostgreSQL ke har badlaav ko event bana ke (CDC) search index aur warehouse tak le jaata hai. Copies isi se sync rehti hain.' },
          { id: 'ch', label: 'ClickHouse', sub: 'creator analytics', x: 400, y: 440, w: 150, kind: 'data', info: 'Ye kya hai: columnar warehouse. Billions view-events pe creator dashboard aur reports. Live app ka database nahi; data thodi der baad aata hai.' },
          { id: 'prom', label: 'Prometheus', sub: 'server metrics', x: 610, y: 440, w: 140, kind: 'data', info: 'Ye kya hai: time-series database. Har server se CPU, latency jaise metrics har kuch second mein khud kheench leta hai (scrape). Per-user labels yahan nahi.' },
        ],
        edges: [
          { a: 'users', b: 'app', n: 1 },
          { a: 'app', b: 'pg', n: 2 },
          { a: 'app', b: 'redis' },
          { a: 'app', b: 'cass' },
          { a: 'app', b: 'es' },
          { a: 'app', b: 's3' },
          { a: 'pg', b: 'kafka', kind: 'evt', label: 'CDC' },
          { a: 'kafka', b: 'es', kind: 'evt' },
          { a: 'kafka', b: 'ch', kind: 'evt', label: 'events' },
          { a: 'prom', b: 'app', kind: 'evt', dashed: true, via: [[705, 440], [705, 160]] },
        ],
        paths: [
          { name: 'Tip bhejo', text: 'Wallet ka paisa PostgreSQL mein, ek ACID transaction: check + debit + credit, sab ya kuch nahi.', go: ['users>app>pg'] },
          { name: 'Chat message', text: 'Message Cassandra mein, partition key chat_id. Session check Redis se.', go: ['users>app>cass', 'app>redis'] },
          { name: 'Video upload + search', text: 'File object store mein, metadata PostgreSQL mein. CDC se Kafka, wahan se search index. Search query Elasticsearch pe.', go: ['users>app>s3', 'app>pg>kafka>es', 'app>es'] },
          { name: 'Reports + metrics', text: 'Events Kafka se ClickHouse mein reports ke liye. Prometheus servers se metrics kheenchta hai.', go: ['pg>kafka>ch', 'prom>app'] },
        ],
      },
      { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
        <li>Database brand se nahi, <strong>signal</strong> se chuno: requirement ki wo line jo decision badalti hai.</li>
        <li>Default: <strong>PostgreSQL/MySQL</strong>. Paisa, relationships, ya "pata nahi kaunsi queries" = SQL.</li>
        <li>Bahut writes + key se access = wide-column. Simple get/put at huge scale = key-value. Nested, ek saath padha jaane wala = document.</li>
        <li>Multi-hop live rishte = graph. Metrics = time-series. Typo wala search = Elasticsearch, main DB ke <em>saath</em>.</li>
        <li>"Milta-julta matlab" = vector (pehle pgvector). Billions rows pe reports = columnar warehouse. Files = object storage + metadata DB mein.</li>
        <li>Users ki ginti signal nahi; writes/sec aur access pattern signal hain. Napkin maths karo.</li>
        <li>Real systems polyglot hain, lekin har naya store ek aur on-call. Copies (search, warehouse) CDC se sync; sach ek jagah.</li>
      </ul>` },
      { type: 'tradeoffs', gains: [
        'SQL default: transactions, constraints, joins, kal ki nayi queries bhi',
        'Specialised store: ek access pattern ke liye huge scale aur predictable latency',
        'Polyglot: har feature ko uske hisaab ka tool (search, files, analytics alag)',
        'Signals se decision = interview mein clear, defend karne layak jawab',
      ], costs: [
        'Har naya database = operations, monitoring, backups, on-call',
        'Copies (search index, warehouse) ko sync rakhna: CDC pipelines, lag, bugs',
        'NoSQL mein queries pehle se design; naya access pattern = naya table/index',
        'Galat store mein paisa/stock = double spend jaise chupe hue bugs',
      ]},
      { type: 'think', questions: [
        { q: 'xyz.com "Watch history" feature: har user ne kaunsa video kitne second dekha. Roz 50 crore events. Kahan rakhoge, aur "pichhle mahine sabse zyada dekhi gayi category" kaise nikaaloge?', a: 'Do alag zaroorat hain. Live app ke liye ("continue watching") write-heavy, key se access (user_id): wide-column jaise Cassandra, partition key user_id, time se sorted. Analytics ke liye wahi events Kafka se columnar warehouse (ClickHouse/BigQuery) mein. Ek hi store dono kaam achhe se nahi karega: polyglot.' },
        { q: 'Ek teammate kehta hai: "Product catalog ke fields har category mein alag hain, isliye MongoDB." Tum kya poochhoge pehle?', a: 'Pehle: kya catalog ke saath orders/inventory ke transactions judte hain? Kya admin ko kai tarah se filter karna hai? Agar haan, PostgreSQL + JSONB column dono duniya deta hai: alag fields bhi, aur joins/transactions bhi. Agar catalog sach mein ek alag, read-heavy, document-shaped cheez hai jo poori ek baar mein padhi jaati hai, tab document DB theek hai.' },
        { q: 'Roz 1 crore wallet tips. Kya SQL ek node pe chalega? Napkin maths se batao.', a: '1 crore / ~10^5 sec ≈ 100 writes/sec average; peak ko 10x maan lo to ~1,000/sec. Ek achha PostgreSQL node hazaaron simple transactions/sec karta hai. To haan, aaram se. Sharding ki baat tab jab ye 10-100 guna badhe.' },
      ]},
      { type: 'quiz', questions: [
        { q: 'Concert tickets: ek seat do logon ko nahi bikni chahiye. Kya chunoge?', options: ['Cassandra, kyunki scale', 'SQL with transaction / unique constraint', 'Redis cache'], answer: 1, explain: 'Signal "double-count nahi hona chahiye". ACID transaction ya UNIQUE(seat_id, show_id) database level pe race rok deta hai.' },
        { q: 'Cab driver ki location har 4 second, lakhs drivers. History kahan?', options: ['Wide-column store (Cassandra/Bigtable)', 'Graph DB', 'Columnar warehouse as the live DB'], answer: 0, explain: 'Bahut zyada writes, access key (driver_id + time) se: wide-column ka classic case. Warehouse analytics ke liye, live writes ke liye nahi.' },
        { q: 'Videos ka search box mein typo ke saath search chahiye. Sahi design?', options: ['SQL LIKE \'%word%\'', 'Elasticsearch main DB ke saath, CDC se sync', 'Elasticsearch ko hi main DB bana do'], answer: 1, explain: 'Inverted index fuzzy/ranked search deta hai. Source of truth SQL mein rehta hai; search index ek copy hai jo rebuild ho sakti hai.' },
        { q: 'Naya startup, product abhi badal raha hai, pata nahi kaunsi queries aayengi. Default?', options: ['MongoDB, kyunki flexible schema', 'PostgreSQL', 'Cassandra'], answer: 1, explain: 'Unclear access pattern = SQL. Nayi queries ke liye bas index jodo; NoSQL mein query pehle se design karni padti hai.' },
      ]},
      { type: 'sources', note: 'Decision table roadmap ke phase 5 se. Discord ki posts ek real write-heavy messages workload ke example ke taur pe use hui hain; dono kuch saal purani hain.', items: [
        { title: 'How Discord Stores Billions of Messages', publisher: 'Discord engineering blog', official: true, year: 2017, url: 'https://discord.com/blog/how-discord-stores-billions-of-messages', used: 'MongoDB se Cassandra pe move; messages ka access pattern (channel + time).' },
        { title: 'How Discord Stores Trillions of Messages', publisher: 'Discord engineering blog', official: true, year: 2023, url: 'https://discord.com/blog/how-discord-stores-trillions-of-messages', used: 'Cassandra se ScyllaDB pe migration, trillions messages scale.' },
        { title: 'Amazon DynamoDB: condition expressions and transactions', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html', used: 'Key-value store mein bhi conditional/transactional writes possible hain.' },
        { title: 'pgvector: open-source vector similarity search for Postgres', publisher: 'pgvector project (GitHub)', official: true, url: 'https://github.com/pgvector/pgvector', used: 'Postgres mein vector column aur approximate (HNSW / IVFFlat) indexes.' },
        { title: 'Prometheus: metric and label naming', publisher: 'Prometheus documentation', official: true, url: 'https://prometheus.io/docs/practices/naming/', used: 'High-cardinality labels (jaise user IDs) se bachne ki salah.' },
      ]},
    ],
  });
})();
