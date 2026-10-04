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
    { q: 'A "Live quiz" feature on xyz.com: during a match, 20 lakh people answer a question at the same moment. Every answer must be saved. Later we only need "this user\'s answers" and "totals for this question".', signal: 'A huge burst of writes at once. Reads only by key (user_id, question_id). No money involved.', pick: 'Wide-column (Cassandra/ScyllaDB) or DynamoDB; Redis counters for the totals', why: '20 lakh writes in a few seconds is heavy for one SQL primary. Access is by key with no joins, so a partitioned store fits. Counting "totals for this question" every time is costly, so keep an INCR counter in Redis.', trap: 'If the quiz prize is money, store the winners\' payouts in a separate SQL table, inside a transaction.' },
    { q: 'A "monthly earnings statement" (PDF) for creators: every month, the money each creator earned from each video.', signal: 'Two different things: the money ledger (must be correct) and a report over a lot of data.', pick: 'Money in SQL (source of truth); the report from a warehouse (ClickHouse/BigQuery); the PDF in object storage', why: 'The ledger (money) lives in SQL with ACID. The monthly totals run over billions of view events, so they come from a warehouse. The finished PDF is a file, so it goes to S3, with its link in the DB.', trap: 'Running the report directly on the live SQL database: the whole site slows down on the first day of every month.' },
    { q: 'A help-center bot: a user asks "why is my video upload stuck?" and the bot must find the right article among 5,000 help articles, even if the words are different.', signal: 'Match by meaning, not by exact words. Only thousands of articles.', pick: 'pgvector (a vector column + index inside Postgres)', why: '5,000 embeddings is a very small number. Postgres is already running, so there is no need for a new system. The article text, its owner and its embedding stay in one place.', trap: '"It is AI, so we must have Pinecone/Milvus." That is one more system and one more bill, with no real need.' },
    { q: 'A "views" counter under every video. A popular video gets 50,000 views/sec. It is fine if the number is a few seconds old.', signal: 'Very fast writes to one single key; it does not need to be exactly right at every instant.', pick: 'A Redis INCR counter, flushed to SQL in a batch every few seconds', why: 'Updating one SQL row for every view means a fight for the lock on that one row. Redis increases the counter in RAM, and a job writes the total to the DB every ~10 s.', trap: 'If Redis crashes, the views from the last few seconds can be lost. Fine for views; never for money.' },
    { q: 'Admin panel: "find users who reported more than 3 videos in the last 7 days, and whose accounts are less than 30 days old".', signal: 'Many filters at once, on different columns, and maybe one more filter tomorrow. A classic ad-hoc query.', pick: 'SQL (PostgreSQL), with the right indexes', why: 'This is a join + filter + group-by query. SQL is built for exactly this. If a new filter comes tomorrow, you just change the query.', trap: 'If the reports data lives in Cassandra, this query is not possible there at all. So treat "admin queries" as a signal too.' },
    { q: 'Each user\'s "continue watching" list: which video, watched up to which second. 10 crore users, with a progress update every 10 seconds.', signal: 'Lots of writes, reads only by user_id, latest values only. Slightly old data is fine.', pick: 'Wide-column (Cassandra) or DynamoDB, partition key = user_id', why: 'Out of 10 crore users, say 1 crore are watching at the same time: 1 crore / 10 s = 10 lakh writes/sec. That is far beyond one SQL primary. A partitioned, key-based store is built for this.', trap: 'Pulling analytics ("most-watched category") from this same table. Send the same events through Kafka into a warehouse instead.' },
  ];
  const R = (pick, why, cost, alt) => ({ pick, why, cost, alt });
  const CFG = {
    questions: [
      { id: 'need', q: 'What is this data for?', opts: [
        ['txn', 'Money, stock, bookings (a double count = a loss)'],
        ['app', 'The app\'s core data (users, videos, comments)'],
        ['events', 'Time-based events: chat messages, location pings, IoT'],
        ['metrics', 'Metrics: CPU, latency, time-stamped measurements'],
        ['search', 'Text search: typos, filters, ranking'],
        ['similar', 'Finding "similar meaning" (AI, recommendations)'],
        ['analytics', 'Reports / analytics over billions of rows'],
        ['files', 'Files: images, video, PDF'],
      ]},
      { id: 'shape', q: 'What is the shape of the data, and what do the queries look like?', when: a => a.need === 'app', opts: [
        ['rel', 'Relationships, many kinds of queries (joins, filters)'],
        ['key', 'Only get/put by key (session, cart, settings)'],
        ['doc', 'Nested, different fields per item, read whole at once'],
        ['graph', 'Multi-hop: friends of friends, fraud rings'],
        ['unknown', 'Not sure yet, the product is new'],
      ]},
      { id: 'scale', q: 'How big is the scale?', when: a => a.need === 'txn' || a.need === 'events' || (a.need === 'app' && a.shape === 'key'), opts: [
        ['normal', 'Normal: thousands of writes/sec, one good machine can handle it'],
        ['huge', 'Huge: lakhs of writes/sec, or more data than one machine holds'],
      ]},
      { id: 'vec', q: 'How many vectors (embeddings)?', when: a => a.need === 'similar', opts: [
        ['few', 'From lakhs up to a few crore, and Postgres is already there'],
        ['many', 'Hundreds of crores or more, or the search must be very fast'],
      ]},
    ],
    decide(a) {
      switch (a.need) {
        case 'txn': return a.scale === 'huge'
          ? R('SQL, sharded (or distributed SQL: Spanner, CockroachDB)', 'Money must never be counted twice, so you need ACID transactions and constraints. That need does not go away when scale grows: shard SQL by user_id, or pick a distributed SQL database that keeps transactions.', 'Sharding is hard to run; transactions across shards are costly and slow. Distributed SQL adds a little extra latency to every write.', 'DynamoDB conditional writes + transactions, if access is only by key and the team can design carefully. A store with no transactions and no conditional writes is never right for a balance.')
          : R('SQL: PostgreSQL / MySQL', 'One transaction does "check balance + debit + order row" as all or nothing. UNIQUE and CHECK constraints stop bad data at the database level. One good machine can do thousands of transactions per second.', 'At very large scale you must do sharding yourself. Schema changes need migrations.', 'Distributed SQL (CockroachDB, Spanner) when one region or one machine is not enough.');
        case 'app': switch (a.shape) {
          case 'rel': return R('SQL: PostgreSQL / MySQL', 'Users, videos, comments and likes are linked to each other, and you will ask about them in many ways ("this creator\'s top videos", "which user liked what"). Joins and indexes do exactly this job.', 'Sharding is hard at very large write scale; joins do not work across shards.', 'A document DB, if every screen reads one big object and there are few joins.');
          case 'key': return a.scale === 'huge'
            ? R('Key-value: DynamoDB (durable) / Redis (in-memory)', 'Only get/put by key, and you need predictable latency at huge scale. Key-value stores split the data by partition key to give that promise.', 'Querying by any field other than the key is hard; every new access pattern needs a new index or a new table.', 'An SQL table with this key as its primary key, as long as the scale is normal.')
            : R('SQL table (key = primary key)', 'At normal scale, a primary-key lookup in SQL also takes ~1 ms. One less database = one less system to run. If the data is temporary (a session), Redis with a TTL is also fine.', 'If traffic really becomes huge, you will have to migrate later.', 'A key-value store (DynamoDB/Redis) when napkin maths shows one SQL node will not cope.');
          case 'doc': return R('Document: MongoDB / Firestore', 'Every item has different fields (one video has chapters, another has subtitles) and the screen reads the whole document at once. A document DB is built for this shape.', 'Joins are weak; several copies of the same thing (denormalized) must be kept in sync. Multi-document transactions are limited or costly.', 'A PostgreSQL JSONB column: flexible fields, plus joins with the rest of your data.');
          case 'graph': return R('Graph: Neo4j / Neptune', 'Multi-hop queries like "friends of friends of friends" are like walking along edges in a graph DB. In SQL every hop is one more join, and at 3-4 hops the query gets very costly.', 'One more database to run; graph DBs are hard to shard; the team needs a new query language (Cypher/Gremlin).', 'SQL with recursive queries, if you only need 1-2 hops.');
          default: return R('SQL: PostgreSQL / MySQL', 'When the access patterns are not clear yet, SQL is the most flexible: if any new query comes tomorrow, add an index and it works. In NoSQL you must design each query up front.', 'If one feature later reaches huge scale, you will move that part to a separate store.', 'A document DB, if the data truly has no structure. But "not sure yet" is itself a signal pointing to SQL.');
        }
        case 'events': return a.scale === 'huge'
          ? R('Wide-column: Cassandra / ScyllaDB / Bigtable', 'Very many writes, and access is always by key ("latest messages of this chat"). An LSM tree turns writes into fast, in-order writes, and the partition key spreads data over many machines.', 'No ad-hoc queries ("all messages that contain word X"); you need a separate search index for that. Every query needs a table designed up front. You must understand eventual consistency.', 'SQL, sharded by user or chat, if the team has no experience running Cassandra.')
          : R('SQL, index on (chat_id, time)', 'At normal scale, one SQL table + the right composite index returns "latest 50 messages" in milliseconds. No need yet for the extra system that wide-column brings.', 'If writes reach lakhs per second this table becomes the bottleneck; then partition, shard or migrate.', 'Wide-column (Cassandra/ScyllaDB) when the write volume grows past one SQL node.');
        case 'metrics': return R('Time-series: Prometheus / InfluxDB / TimescaleDB', 'The data is always "the value of this metric at this time", and queries run over time ranges (average of the last 1 hour). A time-series DB does compression, downsampling and retention by itself.', 'Not built for general queries and joins. With too many unique label combinations (high cardinality), Prometheus struggles.', 'A columnar warehouse (ClickHouse) when you need long, heavy analytics on metrics.');
        case 'search': return R('Elasticsearch / OpenSearch, next to the main DB', 'Typos, ranking and filters need an inverted index. SQL\'s LIKE \'%word%\' reads every row. The real data stays in the main DB; the search index is a copy that is kept in sync through CDC/events.', 'One more cluster; the index runs a little behind (seconds); the sync pipeline can break.', 'PostgreSQL full-text search, when the data is small and you rarely need fuzzy or faceted search.');
        case 'similar': return a.vec === 'many'
          ? R('Vector DB: Pinecone / Milvus', 'Finding "the 10 most similar" among billions of embeddings (approximate nearest neighbour) needs the scale and speed of a dedicated vector DB.', 'One more system and one more bill; results are approximate; metadata must be kept in sync with the main DB.', 'pgvector, as long as Postgres can handle the number of vectors and the latency target.')
          : R('pgvector (PostgreSQL extension)', 'Postgres is already there, so add a vector column + an ANN index right there. Embeddings and the rest of the data live in one place, with joins and transactions too.', 'At very large scale it is not as fast as a dedicated vector DB.', 'Pinecone / Milvus when vectors pass hundreds of crores.');
        case 'analytics': return R('Columnar warehouse: ClickHouse / BigQuery / Snowflake', 'Questions like "how many views per day last year" read only a few columns of billions of rows. Columnar storage reads only those columns from disk and compresses them heavily.', 'Updating or deleting a single row is slow and costly; it cannot be the live app\'s main DB; data arrives through ETL/streams, a little late.', 'A read replica of the main SQL DB, when the data is small and reports are few.');
        default: return R('Object storage (S3 / GCS) + metadata in DB', 'Cheap, almost unlimited, very durable storage for big files. The database keeps only metadata such as the file URL, owner and size.', 'You cannot query inside a file; the file and the DB row must be kept in sync (what if an upload is only half done?).', 'A database BLOB column, only for very small files (avatar thumbnails), and even then rarely.');
      }
    },
  };

  Lesson.register({
    id: 'decide-db',
    title: 'SQL or NoSQL?',
    minutes: 26,
    summary: `Choosing a database is not a question of "brand". It is a question of signals. Which line in the requirements points to which database, and when the "popular" choice is a trap.`,
    blocks: [
      { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Every app has to keep its data somewhere: money, chats, videos, search. One single database is not right for all of them.<br>Pick the wrong database and the app gets slow, or money gets taken twice, or the bill gets needlessly big.<br>In this lesson we learn a simple method: read the requirement, find a "signal" in it, and choose the database from that signal.<br>There is also a small helper: answer its questions, and it tells you what to pick and why.` },
      { type: 'h2', text: 'The story so far: we have the parts, not the judgment' },
      { type: 'p', html: `In phases 2 and 3 you learned many building blocks: <a href="#/sql-vs-nosql">SQL vs NoSQL</a>, <a href="#/db-internals">B-trees and LSM trees</a>, <a href="#/search">search</a>, <a href="#/object-storage">object storage</a>. In phase 4 you learned napkin maths. Now xyz.com is a big platform: videos, chat, a wallet, search, creator analytics. Every new feature brings the same question: <em>"where do we keep this data?"</em>` },
      { type: 'p', html: `A beginner answers "it depends". The interviewer\'s next question is: <em>"Depends on what?"</em> This lesson is the answer. We will not re-learn the concepts (they are in the SQL vs NoSQL lesson). Here we learn to find <strong>signals in the requirements</strong>, and to link each signal to a database family.` },
      { type: 'callout', tone: 'term', title: 'New word: Signal', html: `<strong>What it is:</strong> the one line in a requirement that changes the decision. For example "the user\'s money is taken", or "5 lakh location pings arrive every second".<br><strong>Why we need it:</strong> it turns "it depends" into a solid reason. Signal first, brand name later.<br><strong>Without it:</strong> people pick a database because "it is popular" or "it scales", and regret it later.<br><strong>Example:</strong> "money must never be taken twice when a tip is sent" = signal "we need transactions" = SQL.` },
      { type: 'callout', tone: 'term', title: 'New word: Access pattern', html: `<strong>What it is:</strong> <strong>how</strong> the data will be read and written: by which key, with which filters, how often, how big. For example "the last 50 messages of this chat, in time order".<br><strong>Why we need it:</strong> NoSQL databases are very fast for one or two access patterns, and hard for the rest. SQL handles many patterns reasonably well. So write down the pattern first, then pick the store.<br><strong>Without it:</strong> you may pick a store that cannot run your real query at all (like "all messages that contain word X" in Cassandra).` },
      { type: 'callout', tone: 'tip', title: 'Default rule (Decide)', html: `<strong>Start with PostgreSQL or MySQL</strong>, unless you have a solid reason. A solid reason = a specific signal from the table below that really hurts SQL (shown with numbers, not with a feeling).` },
      { type: 'h3', text: 'Words from earlier lessons, one line each' },
      { type: 'p', html: `These words come up again and again in the decisions below. You learned each one in detail in earlier lessons; here is a one-line reminder:` },
      { type: 'table', head: ['Word', 'In one line', 'Details'], rows: [
        ['ACID transaction', 'Several changes act as one packet: either all happen, or none. Nobody sees half-done data in between.', '<a href="#/sql-vs-nosql">SQL vs NoSQL</a>'],
        ['Join', 'Combining two tables through a shared column (like user_id) to build one answer.', '<a href="#/sql-vs-nosql">SQL vs NoSQL</a>'],
        ['Index', 'A list like the index at the back of a book, so the right row is found without reading the whole table.', '<a href="#/db-internals">DB internals</a>'],
        ['Partition key', 'The field (like chat_id) the database uses to decide which machine a row goes to.', '<a href="#/sharding">Sharding</a>'],
        ['LSM tree', 'A way to collect writes in RAM first and then write them to disk together, in order. This makes writes very fast.', '<a href="#/db-internals">DB internals</a>'],
        ['Eventual consistency', 'Copies can differ for a short while, and later they all become the same.', '<a href="#/cap">CAP</a>'],
        ['Inverted index', 'A list of each word → which documents contain it. Search engines run on this.', '<a href="#/search">Search</a>'],
        ['CDC', 'Change Data Capture: turning every change in a database into an event and sending it to other systems.', '<a href="#/kafka">Kafka</a>'],
        ['Embedding', 'A list of numbers (a vector) for a text or image. Things with similar meaning get vectors that are close together.', '<a href="#/search">Search</a>'],
      ]},
      { type: 'h2', text: 'Decision helper: answer the questions, get a database' },
      { type: 'p', html: `Think of a feature (xyz.com\'s wallet, chat, video search, anything). Answer the questions below. Each answer opens the next question. At the end you get: <strong>what to pick, why, what you give up, and the second-best option</strong>. Try different paths; every combination has a sensible answer.` },
      { type: 'custom', cfg: CFG, render(el) { decider(el, CFG); } },
      { type: 'callout', tone: 'term', title: 'New word: Polyglot persistence', html: `<strong>What it is:</strong> using different databases for different jobs inside one app. "Polyglot" means someone who speaks many languages.<br><strong>Why we need it:</strong> a big app does not run on <strong>one</strong> database. The roadmap\'s example: an app like Zomato plausibly keeps orders and payments in SQL, sessions and live state in Redis, search in Elasticsearch, and uses Kafka to connect them all.<br><strong>Without it:</strong> if one store has to do everything, some feature will be slow or wrong (like search done with SQL\'s LIKE).<br><strong>The cost:</strong> every new store = one more thing that can fail at 3 a.m., and it needs backups and monitoring. So add a new store only when the signal is strong.` },

      { type: 'h2', text: 'The whole table at a glance' },
      { type: 'table', head: ['Signal in the requirements', 'Lean towards'], caption: 'Roadmap phase 5: "SQL or NoSQL?"', rows: [
        ['Money, inventory, bookings: anything that must never be counted twice', 'SQL (ACID transactions)'],
        ['The data has relationships, and you will query it in many ways (users, orders, videos, comments)', 'SQL'],
        ['The access pattern is still unclear, early product', 'SQL; it is the most flexible'],
        ['Very many writes, simple access by key (chat messages, events, IoT, location history)', 'Wide-column: Cassandra, ScyllaDB, Bigtable'],
        ['Simple get/put by key at huge scale, predictable latency (sessions, carts, user settings)', 'Key-value: DynamoDB, Redis'],
        ['Flexible, nested, varying schema, read as one blob (product catalog, CMS content)', 'Document: MongoDB, Firestore'],
        ['Multi-hop relationship queries (friends of friends, fraud rings)', 'Graph: Neo4j, Neptune'],
        ['Metrics and time-stamped measurements', 'Time-series: Prometheus, InfluxDB, TimescaleDB'],
        ['Full-text, fuzzy or faceted search', 'Elasticsearch / OpenSearch, next to the main DB'],
        ['"Similar meaning" for AI and recommendations', 'Vector: pgvector, Pinecone, Milvus'],
        ['Analytics over billions of rows', 'Columnar warehouse: ClickHouse, BigQuery, Snowflake'],
        ['Files, images, video', 'Object storage (S3, GCS); metadata in a DB'],
      ]},
      { type: 'callout', tone: 'term', title: 'Two new words from the table: faceted search, columnar', html: `<strong>Faceted search, what it is:</strong> filters with counts shown next to the search results ("Language: Hindi (120), English (80)"). <strong>Why we need it:</strong> the user can narrow the results with one click. <strong>Without it:</strong> a separate query and count for every filter, which is very slow.<br><strong>Columnar, what it is:</strong> data stored on disk column by column instead of row by row. <strong>Why we need it:</strong> to sum only the "views" column, you do not have to read the whole row (title, description, everything). <strong>Without it:</strong> a report over billions of rows reads 10-50 times more from disk.` },
      { type: 'h2', text: 'Each row, one by one: signal, scenario, reason, trap' },
      { type: 'p', html: `The table is not something to memorize. It is something to understand. For every row, four questions: what does the <strong>signal</strong> look like? Where is it in xyz.com? <strong>Why</strong> this store? And what is the <strong>trap</strong>, where people often go wrong?` },
      { type: 'h3', text: 'Money, stock, bookings → SQL (ACID)' },
      { type: 'p', html: `<strong>Signal:</strong> "this must never happen twice". Money being taken, a seat being booked, stock going down.<br><strong>xyz.com:</strong> the creator wallet. Riya sends a ₹500 tip: money leaves her wallet, money is added to the creator\'s wallet, and a "tip" row is created. All three together.<br><strong>Why SQL:</strong> an ACID transaction does all three as one packet. If there is a crash in the middle, nothing is left half done. A constraint like <code>CHECK (balance >= 0)</code> stops bad data at the database level, even if the app code has a bug.<br><strong>Trap:</strong> "We have 10 crore users, so NoSQL". The number of users is not the signal; writes per second is. The napkin maths below shows that one PostgreSQL is enough. Details: <a href="#/sql-vs-nosql">SQL vs NoSQL</a>, <a href="#/distributed-tx">distributed transactions</a>.` },
      { type: 'h3', text: 'Relationships, many kinds of queries → SQL' },
      { type: 'p', html: `<strong>Signal:</strong> things are linked to each other, and they will be asked about in many ways.<br><strong>xyz.com:</strong> users, videos, comments, likes, subscriptions. Queries: "this creator\'s top 10 videos", "which videos did Riya comment on", "which video got the most new subscribers".<br><strong>Why SQL:</strong> the data is stored once, in clean tables (normalized). For every new query you just add an index. Joins do the linking inside the database.<br><strong>Trap:</strong> making a separate NoSQL table for every screen. Then one like has to be updated in 4 places, and if one place is missed, the numbers no longer match.` },
      { type: 'h3', text: 'Access pattern not clear yet → SQL' },
      { type: 'p', html: `<strong>Signal:</strong> the product is new, features change every week, and nobody knows which query will come tomorrow.<br><strong>xyz.com:</strong> the new "Shorts" feature. Nobody knows yet how trending will be shown, or which stats creators will want.<br><strong>Why SQL:</strong> in SQL you store the data first and think about queries later. NoSQL (like DynamoDB, Cassandra) is the other way round: write the queries first, then design the tables for them.<br><strong>Trap:</strong> "MongoDB is flexible, so it is best for a new product". A flexible <em>schema</em> (fields) and flexible <em>queries</em> are different things. In a new product, the queries change more.` },
      { type: 'h3', text: 'Very many writes, access by key → Wide-column' },
      { type: 'p', html: `<strong>Signal:</strong> lakhs of writes every second, and reads always by one key ("latest messages of this chat", "this driver\'s locations in the last hour").<br><strong>xyz.com:</strong> live chat and comment messages, crores every day. Every message is a write.<br><strong>Why wide-column (Cassandra, ScyllaDB, Bigtable):</strong> the partition key (chat_id) spreads the data over many machines. The LSM tree writes in order, fast. Add machines, and capacity grows.<br><strong>Trap 1:</strong> taking it at normal scale. One SQL table easily handles 500 writes/sec. <strong>Trap 2:</strong> later you need an ad-hoc query ("all messages that say \'refund\'"). Wide-column cannot do that; you need a separate search index.` },
      { type: 'h3', text: 'Simple get/put by key at huge scale → Key-value' },
      { type: 'p', html: `<strong>Signal:</strong> "give a key, get a value". No filters, no joins. And the same fast answer every time, under very heavy traffic.<br><strong>xyz.com:</strong> login sessions (session_id → user), user settings (user_id → dark mode, language), the watch-later list.<br><strong>Why key-value (DynamoDB, Redis):</strong> the simplest model, so it is the easiest to scale. Redis is in RAM: under a millisecond, but RAM is costly and data can be lost on restart (if persistence is off). DynamoDB is durable on disk, managed, single-digit milliseconds.<br><strong>Trap:</strong> later you need "all users whose language is Hindi". In a key-value store that means scanning all the data. Another trap: making Redis the <em>source of truth</em> (the real, only copy) without thinking about persistence.` },
      { type: 'h3', text: 'Nested, different fields, read all at once → Document' },
      { type: 'p', html: `<strong>Signal:</strong> every item has a different shape, and the screen reads the whole item at once.<br><strong>xyz.com:</strong> the creator\'s "channel page" builder: one has a banner + playlists, another has an FAQ + links + merch. Or help-center articles (CMS).<br><strong>Why document (MongoDB, Firestore):</strong> the whole page is one JSON document. One read, the whole page. When a new section type arrives, there is no schema migration.<br><strong>Trap:</strong> keeping money, or links between many documents, in it. Joins are weak, and several copies of the data must be kept in sync. Very often a PostgreSQL <code>JSONB</code> column (JSON stored in one column, with an index) does both jobs.` },
      { type: 'h3', text: 'Multi-hop relationships → Graph' },
      { type: 'p', html: `<strong>Signal:</strong> the question is "who is linked to whom, and how", going 3-4 steps (hops) away.<br><strong>xyz.com:</strong> the fraud team: "through which phone, which card, which address is this new account linked to those 50 banned accounts?" This query must run live, at payment time.<br><strong>Why graph (Neo4j, Neptune):</strong> a graph DB keeps, with every item (node), pointers to its links (edges). Each hop is just following a pointer, not a join over a whole table.<br><strong>Trap:</strong> hearing "friends" and jumping to a graph DB. With only 1-2 hops ("friends of my friends"), an SQL self-join or a nightly batch job is enough. Pay the cost of running a new database only when a live multi-hop query is a real need.` },
      { type: 'h3', text: 'Metrics, time-stamped measurements → Time-series' },
      { type: 'p', html: `<strong>Signal:</strong> the data is always "the value of this thing at this time". Queries run over time ranges: "average of the last 1 hour", "p99 latency every minute".<br><strong>xyz.com:</strong> the CPU of every server, the latency of every API, how many video plays per second.<br><strong>Why time-series (Prometheus, InfluxDB, TimescaleDB):</strong> they compress data by time very well, shrink old data automatically by averaging it (downsampling), and delete old data by themselves (retention).<br><strong>Trap:</strong> putting user_id or video_id in a label. Every unique label combination becomes a separate series (this is called <strong>high cardinality</strong>), and Prometheus runs out of memory. Per-user data belongs in logs or a warehouse.` },
      { type: 'h3', text: 'Full-text, fuzzy, faceted search → Elasticsearch / OpenSearch' },
      { type: 'p', html: `<strong>Signal:</strong> the user will type anything, with typos, and wants the best results on top, with filters.<br><strong>xyz.com:</strong> the video search box: "cricket highlihgts hindi".<br><strong>Why a search engine:</strong> the inverted index goes from a word straight to the documents, matches typos in a "fuzzy" way, and ranks by relevance. SQL\'s <code>LIKE '%word%'</code> reads every row and gives no ranking.<br><strong>Trap:</strong> making Elasticsearch the main database. It sits "alongside", meaning <em>next to</em> the main DB. The real data is in SQL; the search index is a copy, kept in sync through CDC, and it can be rebuilt from scratch when needed. Details: <a href="#/search">Search</a>.` },
      { type: 'h3', text: '"Similar meaning" → Vector' },
      { type: 'p', html: `<strong>Signal:</strong> not the exact word, but the <em>meaning</em> must match. A search for "funny cat videos" should also find the video titled "kitten plays with a ball", even though no word matches.<br><strong>xyz.com:</strong> "you may also like" recommendations, and an AI help bot that finds answers in help articles.<br><strong>Why a vector store (pgvector, Pinecone, Milvus):</strong> store an embedding for every video/article. Make an embedding of the query and find "the 10 closest". This is not exact; it is <strong>approximate nearest neighbour (ANN)</strong> search: give up a little accuracy for a lot of speed.<br><strong>Trap:</strong> a separate vector DB from day one. If Postgres is already there and you have lakhs to crores of vectors, start with the <code>pgvector</code> extension (with an HNSW index).` },
      { type: 'h3', text: 'Analytics over billions of rows → Columnar warehouse' },
      { type: 'p', html: `<strong>Signal:</strong> the question covers all of history: "last year, every day, how many watch-minutes in each category?"<br><strong>xyz.com:</strong> the creator dashboard and business reports.<br><strong>Why columnar (ClickHouse, BigQuery, Snowflake):</strong> it reads only the 2-3 columns in the query, and compresses them heavily. Answers over billions of rows in seconds.<br><strong>Trap:</strong> running this report on the main database (called <strong>OLTP</strong>: the live app\'s database that does small, fast reads and writes). One heavy report slows the live app for every user. A second trap: making the warehouse the live app\'s database; it is not built for single-row updates. Data arrives a little later, through Kafka/ETL. Details: <a href="#/big-data">Big data</a>.` },
      { type: 'h3', text: 'Files, images, video → Object storage + metadata in DB' },
      { type: 'p', html: `<strong>Signal:</strong> the thing is a big file (MBs to GBs) that is read or written as a whole.<br><strong>xyz.com:</strong> uploaded videos, thumbnails, profile photos.<br><strong>Why object storage (S3, GCS):</strong> cheap, almost unlimited, and very durable. The database keeps only metadata: video_id, owner, title, file path, status.<br><strong>Trap:</strong> keeping the video inside a DB row (a BLOB). The database gets heavy, backups take hours, and the bill grows. A second trap: the upload is only half done but the DB row says "ready". That is why there is a status column: "uploading" → "ready". Details: <a href="#/object-storage">Object storage</a>.` },
      { type: 'callout', tone: 'mistake', title: 'Common beginner mistake', html: `"NoSQL = scale, SQL = slow" <strong>is wrong</strong>. NoSQL scales because it <em>gives up</em> some things (joins, flexible queries, often multi-row transactions). If you need exactly those things, NoSQL gives you bugs, not scale. And PostgreSQL easily does thousands of transactions per second on one good machine, which is enough for most apps for years. A second mistake: "MongoDB is flexible, so it is best for an early product". In an early product the <em>queries</em> change, and SQL is more flexible for new queries.` },
      { type: 'h2', text: 'Worked scenarios: xyz.com features' },
      { type: 'p', html: `In every scenario, find the signal first, then decide. Also try it in the widget and check that you get the same answer.` },
      { type: 'h3', text: '1. Chat: crores of messages a day' },
      { type: 'p', html: `<strong>Signal:</strong> very many writes (every message is a write), and reads always look the same: "the latest 50 messages of this chat". No joins, no money. <strong>Decision:</strong> at the start, SQL + an index on (chat_id, created_at) is enough. When writes reach lakhs per second, move to <strong>wide-column</strong> (Cassandra/ScyllaDB) with partition key = chat_id and clustering = time. Discord took this path: a 2017 post told the story of moving from MongoDB to Cassandra, and a 2023 post told of moving to ScyllaDB for trillions of messages. (Both posts are a few years old, but the reasoning behind the decision still holds today.)` },
      { type: 'h3', text: '2. Video uploads' },
      { type: 'p', html: `<strong>Signal:</strong> files, in GBs. <strong>Decision:</strong> the video goes to <a href="#/object-storage">object storage</a> (S3/GCS), and the database (SQL) keeps only metadata: video_id, owner, title, duration, file URL, status. Keeping the video in a DB row makes the DB heavy, backups slow and the bill big.` },
      { type: 'h3', text: '3. Video search: "cricket highlihgts" (with a typo)' },
      { type: 'p', html: `<strong>Signal:</strong> full-text, fuzzy (typos), filters (language, duration). <strong>Decision:</strong> <a href="#/search">Elasticsearch/OpenSearch</a> <em>next to the main DB</em>, not as a replacement. The source of truth stays in SQL; every change flows through <a href="#/kafka">CDC/Kafka</a> to the search index. Search can run a little behind (seconds), and that is fine.` },
      { type: 'h3', text: '4. Trap: the wallet, "because we have 10 crore users"' },
      { type: 'p', html: `xyz.com pays creators, and users send tips from a wallet. The team says: "We have 10 crore users, take Cassandra, it scales." <strong>This is a trap.</strong> The signal is not "many users". The signal is <strong>"money must never be taken twice"</strong>. That needs an atomic "check + debit". And 10 crore users does not mean 10 crore transactions per second: if there are 1 crore tips a day, that is ~1 crore / 10<sup>5</sup> sec ≈ <strong>100 writes/sec</strong> on average. That is nothing for one PostgreSQL. <strong>Decision: SQL</strong>. Much later, shard by user_id. In the diagram below, see what happens with the wrong choice.` },
      { type: 'h3', text: '5. Trap: a graph DB for "people you may know"?' },
      { type: 'p', html: `Hearing "friends" makes people think of a graph DB. But if the feature is only <strong>"friends of my friends"</strong> (2 hops), an SQL self-join, or a nightly batch job that works out the suggestions in advance, is enough. Use a graph DB when there are 3-4+ hops, or when the query must run <em>live</em> (a fraud ring: "how is this card linked to this phone, this address, that account?"). <strong>Decision:</strong> SQL / batch first; graph only when a live multi-hop query is a real need.` },

      { type: 'h2', text: 'Practice: 6 short cases' },
      { type: 'p', html: `Now it is your turn. Read each case and think first: what is the signal? Then press "Show signal", and then "Show answer". The answer also shows the trap that people often fall into.` },
      { type: 'custom', render(el) { practice(el, CASES, { case: 'Case', hint: 'Show signal', ans: 'Show answer', prev: '← Previous', next: 'Next →', signal: 'Signal', trap: 'Trap' }); } },
      { type: 'h2', text: 'What a wrong choice does: run it and see' },
      { type: 'p', html: `Riya has ₹500 in her wallet. In the <em>same second</em>, from her phone and her laptop, she tips two different creators ₹500 each. In a correct system, one tip must fail. Run two scenarios: an SQL transaction, and an eventually consistent store where the code does "read first, then write".` },
      { type: 'flow', height: 320,
        nodes: [
          { id: 'ph', label: 'Riya: phone', sub: 'tip ₹500', x: 95, y: 80, w: 150, kind: 'client', info: 'What it is: Riya\'s phone, which sends the first ₹500 tip. Both requests leave at almost the same moment, and that is what creates the race.' },
          { id: 'lt', label: 'Riya: laptop', sub: 'tip ₹500', x: 95, y: 240, w: 150, kind: 'client', info: 'What it is: Riya\'s laptop, which sends the second ₹500 tip in the same second. Two requests on one wallet at the same time: the setup for a race condition (two jobs at once, where the result depends on their order).' },
          { id: 'app', label: 'Wallet service', x: 340, y: 160, w: 150, kind: 'server', info: 'What it is: xyz.com\'s wallet service, the code that handles tips. In the correct design it sends "check and debit" to the database as one atomic step. In the wrong design it first reads the balance, checks it in the app, and then writes the new balance (read-then-write).' },
          { id: 'r1', label: 'DB node 1', sub: 'bal ₹500', x: 590, y: 80, w: 150, kind: 'data', info: 'What it is: the first database server (node). In the SQL scenario this is the only PostgreSQL primary. In the NoSQL scenario it is a replica that can accept writes.' },
          { id: 'r2', label: 'DB node 2', sub: 'bal ₹500', x: 590, y: 240, w: 150, kind: 'data', info: 'What it is: the second database server, a copy of the first (a replica). In the NoSQL scenario this is the second replica. Both nodes accept writes and later send changes to each other (eventual consistency).' },
        ],
        edges: [{ a: 'ph', b: 'app' }, { a: 'lt', b: 'app' }, { a: 'app', b: 'r1' }, { a: 'app', b: 'r2', id: 'e2' }, { a: 'r1', b: 'r2', id: 'rep', dashed: true }],
        scenarios: [
          { name: 'SQL transaction (correct)', steps: [
            { title: 'One single source of truth', text: 'The wallet is in PostgreSQL. One primary, all writes go there.', hide: ['r2', 'e2', 'rep'], set: { r1: { label: 'PostgreSQL', sub: 'bal ₹500', state: '' } }, focus: ['r1'] },
            { title: 'The tip from the phone', text: 'Check and debit in <strong>one single statement</strong>: lower the balance only if there is enough. The database locks the row to make this atomic.', go: ['ph>app>r1'], msg: 'UPDATE wallets SET bal = bal - 500\nWHERE user_id = 7 AND bal >= 500;   -- 1 row', after: { r1: { sub: 'bal ₹0', state: 'ok' } } },
            { title: 'Success', text: 'One row was updated, which means the tip went through.', go: 'res:r1>app>ph', msg: '1 row updated → tip sent' },
            { title: 'The tip from the laptop', text: 'The same statement, but now bal = 0, so the condition fails. Zero rows are updated. No money is taken.', go: ['lt>app>r1', 'bad:r1>app>lt'], msg: '0 rows updated → "Balance too low"' },
          ]},
          { name: 'Eventual store (wrong)', steps: [
            { title: 'Two nodes, both accept writes', text: 'The wallet is in an eventually consistent store with default settings, and the code first <em>reads</em> the balance and then <em>writes</em> the new one.', show: ['r2', 'e2', 'rep'], set: { r1: { label: 'DB node 1', sub: 'bal ₹500', state: '' }, r2: { sub: 'bal ₹500', state: '' } } },
            { title: 'Both read: ₹500', text: 'The phone\'s request reads from node 1, the laptop\'s from node 2. Both see ₹500. The check in the app: "500 >= 500, fine".', parallel: true, go: ['ph>app>r1', 'lt>app>r2'], msg: 'GET wallet:7 → 500   (on both sides)' },
            { title: 'Both write: ₹0', text: 'Both write "bal = 0", and both tips go to the creators.', parallel: true, go: ['app>r1', 'app>r2'], after: { r1: { sub: 'bal ₹0' }, r2: { sub: 'bal ₹0' } }, msg: 'PUT wallet:7 bal=0   (2 times)' },
            { title: 'After sync: ₹1000 is gone', text: 'The replicas sync. The rule is <em>last write wins</em> (the latest write is the one that stays), so the balance shows ₹0. Everything looks "fine", but <strong>₹1000</strong> left a wallet that had ₹500. This is called a <strong>double spend</strong>, and this bug does not even show up in the logs.', go: 'evt:r1>r2', after: { r1: { state: 'warn', sub: '2 tips, ₹1000 gone!' }, r2: { state: 'warn', sub: '2 tips, ₹1000 gone!' } } },
            { title: 'Fix', text: 'Money needs a transaction, or at least a <strong>conditional write</strong>: "write only if the balance is still 500" (Cassandra calls this an LWT, a lightweight transaction; DynamoDB calls it a condition expression). And the simplest fix: keep the wallet in SQL. Answer the scale question with napkin maths, not with fear.', focus: ['app'] },
          ]},
        ],
      },
      { type: 'h2', text: 'How to say this in an interview' },
      { type: 'steps', items: [
        { t: 'State the signal', d: '"Money in the wallet must never be taken twice", or "the message write volume is ~2 lakh/sec, and reads are only by chat_id".' },
        { t: 'State the choice', d: '"So the wallet goes in PostgreSQL, messages in Cassandra with partition key chat_id."' },
        { t: 'Say what you gave up', d: '"Cassandra will not give us ad-hoc queries, so message search comes from a separate Elasticsearch index."' },
        { t: 'Name the runner-up', d: '"If the scale stayed small, we would keep messages in Postgres too; one less system."' },
      ]},
      { type: 'diagram', title: 'xyz.com\'s databases: the whole picture', height: 510,
        groups: [
          { label: 'Users', x: 20, y: 14, w: 680, h: 76 },
          { label: 'App', x: 20, y: 110, w: 680, h: 100 },
          { label: 'Main stores', x: 4, y: 232, w: 712, h: 106 },
          { label: 'Async copies', x: 4, y: 380, w: 712, h: 114 },
        ],
        nodes: [
          { id: 'users', label: 'Users', sub: 'app + browser', x: 360, y: 50, w: 160, kind: 'client', info: 'What it is: xyz.com\'s users. They send tips, chat, upload videos and search. The data for each job goes to a different store.' },
          { id: 'app', label: 'App services', sub: 'wallet, chat, video', x: 360, y: 160, w: 200, kind: 'server', info: 'What it is: xyz.com\'s code (many services). Each feature picks its store from its signal: the wallet in SQL, chat in wide-column, files in object storage.' },
          { id: 'pg', label: 'PostgreSQL', sub: 'wallet, users', x: 70, y: 290, w: 120, kind: 'data', info: 'What it is: the main SQL database, the source of truth. Wallet (ACID), users, video metadata, comments. With the pgvector extension, recommendation embeddings live here too. The default choice.' },
          { id: 'redis', label: 'Redis', sub: 'sessions, counts', x: 210, y: 290, w: 120, kind: 'cache', info: 'What it is: a key-value store in RAM. Login sessions, view counters (flushed to SQL every few seconds). Simple get/put by key, very fast.' },
          { id: 'cass', label: 'Cassandra', sub: 'chat messages', x: 350, y: 290, w: 120, kind: 'data', info: 'What it is: a wide-column store. Chat messages: crores of writes a day, always read by chat_id, in time order. Partition key = chat_id.' },
          { id: 'es', label: 'Elasticsearch', sub: 'video search', x: 490, y: 290, w: 120, kind: 'data', info: 'What it is: a search engine (inverted index). For ranked search that handles typos. It is a copy of the main DB, synced through Kafka/CDC; it is not the source of truth.' },
          { id: 's3', label: 'Object store', sub: 'video files', x: 630, y: 290, w: 120, kind: 'data', info: 'What it is: file storage like S3/GCS. Videos and thumbnails live here; the DB keeps only the file path and status.' },
          { id: 'kafka', label: 'Kafka (CDC)', sub: 'DB changes', x: 190, y: 440, w: 150, kind: 'queue', info: 'What it is: an event log. It turns every change in PostgreSQL into an event (CDC) and carries it to the search index and the warehouse. This keeps the copies in sync.' },
          { id: 'ch', label: 'ClickHouse', sub: 'creator analytics', x: 400, y: 440, w: 150, kind: 'data', info: 'What it is: a columnar warehouse. Creator dashboards and reports over billions of view events. Not the live app\'s database; data arrives a little later.' },
          { id: 'prom', label: 'Prometheus', sub: 'server metrics', x: 610, y: 440, w: 140, kind: 'data', info: 'What it is: a time-series database. Every few seconds it pulls metrics like CPU and latency from every server by itself (scrape). No per-user labels here.' },
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
          { name: 'Send a tip', text: 'The wallet money is in PostgreSQL, in one ACID transaction: check + debit + credit, all or nothing.', go: ['users>app>pg'] },
          { name: 'Chat message', text: 'The message goes to Cassandra, partition key chat_id. The session check comes from Redis.', go: ['users>app>cass', 'app>redis'] },
          { name: 'Video upload + search', text: 'The file goes to the object store, the metadata to PostgreSQL. CDC sends it to Kafka, and from there to the search index. Search queries hit Elasticsearch.', go: ['users>app>s3', 'app>pg>kafka>es', 'app>es'] },
          { name: 'Reports + metrics', text: 'Events flow from Kafka into ClickHouse for reports. Prometheus pulls metrics from the servers.', go: ['pg>kafka>ch', 'prom>app'] },
        ],
      },
      { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
        <li>Choose a database by <strong>signal</strong>, not by brand: the line in the requirement that changes the decision.</li>
        <li>Default: <strong>PostgreSQL/MySQL</strong>. Money, relationships, or "we do not know the queries yet" = SQL.</li>
        <li>Many writes + access by key = wide-column. Simple get/put at huge scale = key-value. Nested, read as a whole = document.</li>
        <li>Live multi-hop relationships = graph. Metrics = time-series. Search with typos = Elasticsearch, <em>next to</em> the main DB.</li>
        <li>"Similar meaning" = vector (pgvector first). Reports over billions of rows = columnar warehouse. Files = object storage + metadata in a DB.</li>
        <li>The number of users is not a signal; writes/sec and the access pattern are. Do the napkin maths.</li>
        <li>Real systems are polyglot, but every new store is one more on-call duty. Copies (search, warehouse) sync through CDC; the truth lives in one place.</li>
      </ul>` },
      { type: 'tradeoffs', gains: [
        'SQL by default: transactions, constraints, joins, and tomorrow\'s new queries too',
        'A specialised store: huge scale and predictable latency for one access pattern',
        'Polyglot: each feature gets the right tool (search, files, analytics separately)',
        'Deciding from signals = a clear answer you can defend in an interview',
      ], costs: [
        'Every new database = operations, monitoring, backups, on-call',
        'Keeping copies (search index, warehouse) in sync: CDC pipelines, lag, bugs',
        'In NoSQL, queries are designed up front; a new access pattern = a new table/index',
        'Money/stock in the wrong store = hidden bugs like double spending',
      ]},
      { type: 'think', questions: [
        { q: 'xyz.com\'s "Watch history" feature: which video each user watched, and for how many seconds. 50 crore events a day. Where do you store it, and how do you find "the most-watched category last month"?', a: 'There are two different needs. For the live app ("continue watching"): write-heavy, access by key (user_id): a wide-column store like Cassandra, partition key user_id, sorted by time. For analytics: the same events go through Kafka into a columnar warehouse (ClickHouse/BigQuery). One store will not do both jobs well: polyglot.' },
        { q: 'A teammate says: "Product catalog fields differ in every category, so MongoDB." What do you ask first?', a: 'First: are there transactions linking the catalog to orders/inventory? Does the admin need to filter in many ways? If yes, PostgreSQL + a JSONB column gives both worlds: different fields, plus joins/transactions. If the catalog really is a separate, read-heavy, document-shaped thing that is read whole at once, then a document DB is fine.' },
        { q: '1 crore wallet tips a day. Will SQL on one node cope? Answer with napkin maths.', a: '1 crore / ~10^5 sec ≈ 100 writes/sec on average; assume the peak is 10x, so ~1,000/sec. A good PostgreSQL node does thousands of simple transactions per second. So yes, easily. Talk about sharding only when this grows 10-100 times.' },
      ]},
      { type: 'quiz', questions: [
        { q: 'Concert tickets: one seat must never be sold to two people. What do you pick?', options: ['Cassandra, because of scale', 'SQL with a transaction / unique constraint', 'A Redis cache'], answer: 1, explain: 'The signal is "must never be counted twice". An ACID transaction or UNIQUE(seat_id, show_id) stops the race at the database level.' },
        { q: 'Cab driver locations every 4 seconds, lakhs of drivers. Where does the history go?', options: ['A wide-column store (Cassandra/Bigtable)', 'A graph DB', 'A columnar warehouse as the live DB'], answer: 0, explain: 'Very many writes, access by key (driver_id + time): the classic case for wide-column. A warehouse is for analytics, not for live writes.' },
        { q: 'The video search box must handle typos. What is the right design?', options: ['SQL LIKE \'%word%\'', 'Elasticsearch next to the main DB, synced through CDC', 'Make Elasticsearch the main DB'], answer: 1, explain: 'An inverted index gives fuzzy, ranked search. The source of truth stays in SQL; the search index is a copy that can be rebuilt.' },
        { q: 'A new startup, the product is still changing, nobody knows which queries will come. The default?', options: ['MongoDB, because of the flexible schema', 'PostgreSQL', 'Cassandra'], answer: 1, explain: 'Unclear access pattern = SQL. For new queries, just add an index; in NoSQL each query must be designed up front.' },
      ]},
      { type: 'sources', note: 'The decision table comes from phase 5 of the roadmap. The Discord posts are used as an example of a real, write-heavy messages workload; both are a few years old.', items: [
        { title: 'How Discord Stores Billions of Messages', publisher: 'Discord engineering blog', official: true, year: 2017, url: 'https://discord.com/blog/how-discord-stores-billions-of-messages', used: 'The move from MongoDB to Cassandra; the access pattern of messages (channel + time).' },
        { title: 'How Discord Stores Trillions of Messages', publisher: 'Discord engineering blog', official: true, year: 2023, url: 'https://discord.com/blog/how-discord-stores-trillions-of-messages', used: 'The migration from Cassandra to ScyllaDB, at a scale of trillions of messages.' },
        { title: 'Amazon DynamoDB: condition expressions and transactions', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html', used: 'Conditional and transactional writes are possible even in a key-value store.' },
        { title: 'pgvector: open-source vector similarity search for Postgres', publisher: 'pgvector project (GitHub)', official: true, url: 'https://github.com/pgvector/pgvector', used: 'A vector column in Postgres, with approximate (HNSW / IVFFlat) indexes.' },
        { title: 'Prometheus: metric and label naming', publisher: 'Prometheus documentation', official: true, url: 'https://prometheus.io/docs/practices/naming/', used: 'The advice to avoid high-cardinality labels (such as user IDs).' },
      ]},
    ],
  });
})();
