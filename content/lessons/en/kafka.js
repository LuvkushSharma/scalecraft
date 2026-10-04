Lesson.register({
  id: 'kafka',
  title: 'Kafka and event streams',
  minutes: 35,
  summary: `A queue is a to-do list: the work is done, the message is gone. But when ten teams want to read the same event (like "video uploaded") at their own speed, and also re-read yesterday's events, you need a log: Kafka. Topics, partitions, offsets, consumer groups, replication, and two patterns to keep the DB and Kafka in sync: CDC and the transactional outbox.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `In the last lesson's queue, a message was wiped out once the work was done.<br>But sometimes ten different teams need the same news ("a video was uploaded"), and some teams also need to read <strong>old</strong> news again.<br>Kafka is like a long diary: every new thing is written at the end, reading wipes out nothing, and every reader keeps its own bookmark.<br>In this lesson you will see how that diary is split into pieces to run fast, how readers share the work, how data survives when a machine dies, and how to keep Kafka in sync with the database.` },
    { type: 'h2', text: 'The problem: a queue does not have yesterday\'s data' },
    { type: 'p', html: `In the last lesson, xyz.com used pub/sub to deliver the "video.uploaded" event to the transcoder, email and analytics. Now the company has grown. Every week a new team shows up:` },
    { type: 'list', items: [
      `<strong>Search team:</strong> "We need every new video in the search index."`,
      `<strong>Recommendations team (new):</strong> "We need all upload and view events from the last 7 days to train a model."`,
      `<strong>Analytics team:</strong> "Our code had a bug; yesterday's counts are wrong. We need to process yesterday's events again."`,
      `<strong>Lakhs of "video viewed" events every second</strong>, arriving with every request.`,
    ]},
    { type: 'p', html: `Why does a queue fail here? In a queue a message is <strong>deleted as soon as it is acked</strong>. A new team will find no old events anywhere. After a bug fix, "read again from yesterday" is not possible. And a separate copy per subscriber (fanout) means: 10 teams = 10 copies of every event, and the broker tracks "who read it, who did not" for every message, which gets heavy at lakhs of events per second.` },
    { type: 'callout', tone: 'analogy', title: 'To-do list vs newspaper archive', html: `<strong>Queue = to-do list.</strong> Each task is done by one person and crossed off as soon as it is done. <strong>Kafka = newspaper archive.</strong> Each day's newspaper goes onto a rack, one after another, and stays there for a while. One reader is reading today's paper, another is three days behind, a new reader starts from the first day. Reading a newspaper does not make it disappear. Each reader only remembers their own "bookmark".` },
    { type: 'callout', tone: 'term', title: 'Log (append-only)', html: `<strong>What it is:</strong> here <strong>log</strong> does not mean error logs. A log is a list where a new record is always <strong>added at the end</strong>, and old records never change. Every record has a number: 0, 1, 2, 3...<br><strong>Why we need it:</strong> writing only at the end is the fastest thing a disk can do, and since nothing is wiped, any reader can read from any number.<br><strong>Without it:</strong> data vanishes after reading (like a queue), so a new team or a bug fix cannot get old data.<br><strong>Example:</strong> event 0 = "video 7 upload", event 1 = "video 9 upload", event 2 = "video 7 publish"... the list just keeps growing.` },
    { type: 'callout', tone: 'term', title: 'Event and event stream', html: `<strong>What it is:</strong> an event = a small record of "something happened", like <code>{ "type": "uploaded", "video_id": 7, "time": "21:05" }</code>. An event stream = a never-ending line of such events.<br><strong>Why we need it:</strong> saying "this happened" lets each team react in its own way. The sender does not need to know who will do what.<br><strong>Without it:</strong> the upload service would have to call every team separately.` },

    { type: 'h2', text: 'How Kafka was born: LinkedIn, 2011' },
    { type: 'p', html: `Kafka was built at LinkedIn. In the 2011 paper "Kafka: a Distributed Messaging System for Log Processing" (Jay Kreps, Neha Narkhede, Jun Rao) they explained why older messaging systems did not fit their needs. The paper is from 2011 and Kafka has changed a lot since then, but the core ideas are the same:` },
    { type: 'list', items: [
      `<strong>Data from clicks, page views and logs</strong> was many times larger than the real user data, and it was needed both offline (Hadoop: a system that processes big data overnight) and in real time. Older systems were either only for offline loading, or kept heavy track of every message's delivery state.`,
      `<strong>No separate message ID.</strong> A message is identified by its <strong>offset</strong>: its position in the log. The broker does not need to keep a separate index.`,
      `<strong>The consumer pulls</strong> (the broker does not push), at its own speed. And the consumer, not the broker, keeps track of "how far have I read". So the broker stays light, almost "stateless".`,
      `<strong>When is data deleted?</strong> Not when someone reads it, but by time: in the paper, typically 7 days. This gave a free "side effect": a consumer can go back and read again (<strong>rewind / replay</strong>).`,
      `<strong>Speed tricks:</strong> sending messages in batches (many at once), trusting the OS <strong>page cache</strong> (the part of RAM where the OS keeps recently read or written files by itself), and <code>sendfile</code> (an OS shortcut that sends data from a file straight to the network, skipping extra copies).`,
      `<strong>Delivery guarantee:</strong> at-least-once. At the time of the paper there was no replication; if a broker's disk died, unconsumed data was gone. Replication came later (we will see it below).`,
    ]},

    { type: 'h2', text: 'Building blocks: topic, partition, offset' },
    { type: 'p', html: `Kafka has five building blocks. Read each small card; then the picture below joins them together.` },
    { type: 'callout', tone: 'term', title: 'Broker', html: `<strong>What it is:</strong> one Kafka server (machine). Many brokers together make a <strong>cluster</strong>.<br><strong>Why we need it:</strong> one machine's disk and network have limits. Many brokers = more data, more speed, and if one dies the rest keep going.<br><strong>Without it:</strong> one machine = a single point of failure.` },
    { type: 'callout', tone: 'term', title: 'Topic', html: `<strong>What it is:</strong> a named log for one kind of event. Like <code>video-events</code>, <code>payments</code>. Think of a folder that holds only one type of thing.<br><strong>Why we need it:</strong> readers only want the events they care about.<br><strong>Without it:</strong> all events in one pile, and every reader has to sift through everything.` },
    { type: 'callout', tone: 'term', title: 'Partition', html: `<strong>What it is:</strong> the pieces of a topic. Each partition is its own separate append-only log, and can live on a different broker.<br><strong>Why we need it:</strong> a topic's traffic does not all land on one machine, and many readers can read different partitions in parallel.<br><strong>Without it:</strong> a topic would be stuck at one machine's speed.<br><strong>Example:</strong> <code>video-events</code> has 6 partitions on 3 brokers, 2 on each broker.` },
    { type: 'callout', tone: 'term', title: 'Offset', html: `<strong>What it is:</strong> the number of a record inside a partition (0, 1, 2...). Like a page number in a book.<br><strong>Why we need it:</strong> a reader only has to remember one number: "I have read up to page 42". This is called the <strong>committed offset</strong> (bookmark).<br><strong>Without it:</strong> the broker would have to remember who read each message, which is very heavy.<br><strong>Careful:</strong> order is guaranteed only <em>inside one partition</em>, not across the whole topic.` },
    { type: 'callout', tone: 'term', title: 'Producer and consumer (in Kafka)', html: `<strong>What it is:</strong> producer = whoever writes records to a topic. Consumer = whoever reads them. A Kafka consumer <strong>pulls</strong> by itself ("give me records from offset 43"); the broker does not push.<br><strong>Why we need it:</strong> with pull, each consumer reads at its own speed. The broker never floods a slow consumer.<br><strong>Without it:</strong> the broker would have to manage every consumer's speed.` },
    { type: 'ascii', text: `
Topic: video-events   (3 partitions)

Partition 0:  [0][1][2][3][4][5][6][7]  ← new records are added here
Partition 1:  [0][1][2][3][4]
Partition 2:  [0][1][2][3][4][5][6]
                       ↑           ↑
          analytics bookmark       search bookmark
          (read up to offset 2)    (read up to offset 6)

Reading does NOT delete records. Old segments are deleted after retention (like 7 days).`, caption: 'Every consumer group has its own bookmark (committed offset).' },
    { type: 'callout', tone: 'term', title: 'Consumer group', html: `<strong>What it is:</strong> a "team" that reads a topic together, like 4 machines in the "search-indexer" group. The rule: <strong>inside a group, each partition goes to only one consumer</strong>. Different groups are fully independent: each group gets the whole topic, with its own bookmarks.<br><strong>Why we need it:</strong> inside a group the work is shared out (like a queue), and across groups each team gets the full stream (like pub/sub). One thing does both.<br><strong>Without it:</strong> either every machine reads the whole topic (duplicate work), or you copy the data for every team.<br><strong>Example:</strong> 6 partitions, 3 machines in the search group → 2 partitions per machine. The analytics group reads the same 6 partitions separately.` },
    { type: 'callout', tone: 'term', title: 'Message key', html: `<strong>What it is:</strong> a small label the producer attaches to each record, like <code>video_7</code>. Kafka hashes the key to pick the partition: <code>hash(key) % partitions</code>. A <strong>hash</strong> = a function that turns text into a big number; the same text always gives the same number.<br><strong>Why we need it:</strong> the same key always goes to the same partition, so all of one video's events are in one line, in order.<br><strong>Without it:</strong> one video's events would scatter across partitions, and "deleted" might be processed before "published".` },
    { type: 'callout', tone: 'term', title: 'Consumer lag', html: `<strong>What it is:</strong> how far behind a reader is. Lag = the partition's latest offset − the group's committed offset.<br><strong>Why we need it:</strong> it is Kafka's most important health metric. Growing lag = the consumer is slower than the producer.<br><strong>Without it:</strong> you would never know that search is showing 2-hour-old data.<br><strong>Example:</strong> latest offset 10,000, committed 9,400 → lag of 600 records.` },
    { type: 'h2', text: 'Run it: one topic, two teams' },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'prod', label: 'Upload service', sub: 'producer', x: 90, y: 165, w: 140, kind: 'server', info: 'What it is: the service that uploads videos, here the producer. It sends a key with every event (here video_id). The same key always goes to the same partition, so one video\'s events stay in order.' },
        { id: 'p0', label: 'Partition 0', sub: 'offset 0..41', x: 330, y: 90, w: 150, kind: 'queue', info: 'What it is: the first piece of the topic, an append-only log. New records are added at the end. Reading deletes nothing. After retention (default 7 days) old parts are deleted.' },
        { id: 'p1', label: 'Partition 1', sub: 'offset 0..37', x: 330, y: 240, w: 150, kind: 'queue', info: 'What it is: the second piece of the topic, often on another broker. The more partitions, the more consumers in a group can work in parallel.' },
        { id: 'gA', label: 'Search indexer', sub: 'group: search', x: 600, y: 60, w: 170, kind: 'server', info: 'What it is: the search team\'s consumer group "search". It puts every video into the search index (like Elasticsearch). It commits its own offset.' },
        { id: 'gB', label: 'Analytics', sub: 'group: analytics', x: 600, y: 165, w: 170, kind: 'server', info: 'What it is: the analytics team\'s consumer group. Fully independent of search. If it is slow or down, search is not affected.' },
        { id: 'rec', label: 'Recommendations', sub: 'group: recs (new)', x: 600, y: 275, w: 170, kind: 'server', hidden: true, info: 'What it is: the new recommendations team\'s new consumer group. It has just arrived, so it can start reading from offset 0 (the oldest available record): this is replay.' },
      ],
      edges: [{ a: 'prod', b: 'p0' }, { a: 'prod', b: 'p1' }, { a: 'p0', b: 'gA' }, { a: 'p1', b: 'gA' }, { a: 'p0', b: 'gB' }, { a: 'p1', b: 'gB' }, { a: 'p0', b: 'rec', id: 'p0r', hidden: true }, { a: 'p1', b: 'rec', id: 'p1r', hidden: true }],
      scenarios: [
        { name: 'Write and read', steps: [
          { title: 'The producer writes an event', text: 'Key = video_7. Kafka hashes the key to pick the partition: <code>hash(key) % partitions</code>. video_7 → partition 0. The record is added at the end and gets offset 42.', go: 'prod>p0', after: { p0: { sub: 'offset 0..42' } }, msg: 'produce topic=video-events key="video_7"\nvalue={ "type": "uploaded", "video_id": 7 }\n→ partition 0, offset 42' },
          { title: 'Another key, another partition', text: 'The hash of video_9 gives partition 1. Different videos go to different partitions, in parallel.', go: 'prod>p1', after: { p1: { sub: 'offset 0..38' } }, msg: 'key="video_9" → partition 1, offset 38' },
          { title: 'Both groups read', text: 'Search and analytics both get the <strong>same record</strong>. No copy was made: both read the same log; only their bookmarks differ.', parallel: true, go: ['evt:p0>gA', 'evt:p0>gB'], after: { gA: { state: 'ok' }, gB: { state: 'ok' } } },
          { title: 'Offset commit', text: 'After the work, each group commits its offset: "search has read up to 42 in partition 0". This bookmark is saved inside Kafka in an internal topic (<code>__consumer_offsets</code>). The record is still in the log.', focus: ['gA', 'gB'], msg: 'commit group=search  partition=0  offset=43  (next to read)' },
        ]},
        { name: 'Replay: a new team', intro: 'The recommendations team joined today. It needs the last 7 days.', steps: [
          { title: 'A new consumer group', text: 'A new group has no committed offset. With the setting <code>auto.offset.reset=earliest</code> ("no bookmark? start from the beginning") it starts from the oldest record still kept.', show: ['rec', 'p0r', 'p1r'], focus: ['rec'] },
          { title: 'Reading from the start', text: 'The producer did not have to do anything. Search and analytics did not even notice. The new group reads 7 days of events at its own speed.', parallel: true, go: ['evt:p0>rec', 'evt:p1>rec'], after: { rec: { state: 'hot', sub: 'replaying 7 days' } } },
          { title: 'Rewind after a bug fix', text: 'Analytics had a bug in its code. The team deployed a fix, then reset the group\'s offset to yesterday morning. All of yesterday\'s events are processed again. With a queue this was not even possible.', go: 'evt:p0>gB', set: { gB: { state: 'warn', sub: 'rewound to yesterday' } }, msg: 'kafka-consumer-groups --group analytics --reset-offsets --to-datetime 2026-10-03T00:00:00 --execute' },
        ]},
        { name: 'Crash before commit', intro: 'The search indexer did the work but died before committing the offset.', steps: [
          { title: 'Records 43-45 processed', text: 'Search indexed three records.', go: 'evt:p0>gA', set: { gA: { state: 'hot', sub: 'indexed 43..45' } } },
          { title: 'Crash, no commit', text: 'The committed offset is still 43.', set: { gA: { state: 'down', sub: 'CRASHED' } }, focus: ['gA'] },
          { title: 'Restart: again from 43', text: 'The new instance reads from committed offset 43. Records 43-45 are processed <strong>again</strong>. This is Kafka\'s at-least-once. Protection: keep indexing <strong>idempotent</strong> (upsert by video_id), so doing it again breaks nothing.', go: 'evt:p0>gA', set: { gA: { state: 'ok', sub: 'reprocessed 43..45' } } },
        ]},
        { name: 'Slow consumer (lag)', steps: [
          { title: 'Analytics down', text: 'The analytics cluster is down for 2 hours.', set: { gB: { state: 'down', sub: 'DOWN' } }, focus: ['gB'] },
          { title: 'Everything else is normal', text: 'The producer kept writing and search kept reading. One consumer\'s problem did not reach the others. Analytics\' <strong>consumer lag</strong> (latest offset minus its offset) kept growing.', flood: { paths: ['prod>p0', 'prod>p1'], n: 8 }, after: { gB: { sub: 'lag: 2 hours' } } },
          { title: 'Back and catching up', text: 'Analytics started reading on from its bookmark. But careful: if the lag had grown <strong>longer than retention</strong> (say 8 days down), the old records would already be deleted and that data would be gone for this group. That is why we put alarms on lag.', parallel: true, go: ['evt:p0>gB', 'evt:p1>gB'], set: { gB: { state: 'ok', sub: 'catching up' } } },
        ]},
      ],
    },
    { type: 'h2', text: 'Simulator: partitions and consumers' },
    { type: 'p', html: `In a consumer group, one partition goes to only one consumer. Change the number of partitions and consumers and see who reads what. Then type a key (like <code>user_42</code>) and see which partition it goes to, and what happens when you add partitions.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Partitions: <strong class="kc-vp"></strong></label><input class="kc-p" type="range" min="1" max="12" step="1" value="6"></div>
          <div><label>Consumers in group: <strong class="kc-vc"></strong></label><input class="kc-c" type="range" min="1" max="12" step="1" value="4"></div>
        </div>
        <div class="kc-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;margin-top:14px"></div>
        <div class="stats">
          <div class="stat"><span>Active consumers</span><strong class="kc-act"></strong></div>
          <div class="stat"><span>Idle consumers</span><strong class="kc-idle"></strong></div>
          <div class="stat"><span>Max parallelism</span><strong class="kc-par"></strong></div>
        </div>
        <div class="calc-note kc-note"></div>
        <div style="margin-top:16px"><label>Type a key</label><input class="kc-key" type="text" value="user_42"></div>
        <div class="stats">
          <div class="stat"><span>Partition (now)</span><strong class="kc-kp"></strong></div>
          <div class="stat"><span>Which consumer</span><strong class="kc-kc"></strong></div>
          <div class="stat"><span>Partition (after +1 partition)</span><strong class="kc-kp2"></strong></div>
        </div>
        <div class="calc-note kc-knote"></div>`;
      const $ = c => el.querySelector(c);
      // Simple deterministic string hash (FNV-1a 32-bit). Real Kafka uses murmur2; idea is the same.
      const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
      // Range-style assignment: first (P % C) consumers get one extra partition.
      const assign = (P, C) => { const out = []; const base = Math.floor(P / C), extra = P % C; let p = 0; for (let c = 0; c < C; c++) { const n = base + (c < extra ? 1 : 0); const list = []; for (let k = 0; k < n; k++) list.push(p++); out.push(list); } return out; };
      const upd = () => {
        const P = +$('.kc-p').value, C = +$('.kc-c').value;
        $('.kc-vp').textContent = P; $('.kc-vc').textContent = C;
        const a = assign(P, C), owner = {};
        a.forEach((list, c) => list.forEach(p => owner[p] = c));
        $('.kc-grid').innerHTML = a.map((list, c) => `<div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:8px 10px;background:${list.length ? 'var(--surface)' : 'var(--surface-2)'};opacity:${list.length ? 1 : 0.65}">
            <div style="font:600 13px var(--f-display);color:var(--ink)">Consumer ${c + 1}</div>
            <div style="font:12px var(--f-mono);color:${list.length ? 'var(--ink-2)' : 'var(--red)'};margin-top:4px">${list.length ? list.map(p => 'P' + p).join(', ') : 'IDLE'}</div></div>`).join('');
        const active = a.filter(l => l.length).length;
        $('.kc-act').textContent = active; $('.kc-idle').textContent = C - active; $('.kc-par').textContent = Math.min(P, C);
        const counts = a.filter(l => l.length).map(l => l.length);
        let note;
        if (C > P) note = `${C} consumers, only ${P} partitions: ${C - P} consumers sit idle. A group\'s parallelism cannot be more than the number of partitions. So when you create a topic, choose partitions with future growth in mind.`;
        else if (Math.max(...counts) !== Math.min(...counts)) note = `Partitions do not split evenly (${P} ÷ ${C}): some consumers have ${Math.max(...counts)} partitions, some have ${Math.min(...counts)}. The one with more sets the speed of the whole group.`;
        else note = `An even split: each consumer has ${counts[0]} partition(s). If one consumer dies, a rebalance shares its partitions among the others.`;
        $('.kc-note').textContent = note;
        const key = $('.kc-key').value || '';
        if (!key) { $('.kc-kp').textContent = '-'; $('.kc-kc').textContent = '-'; $('.kc-kp2').textContent = '-'; $('.kc-knote').textContent = 'Type a key.'; return; }
        const h = hash(key), kp = h % P, kp2 = h % (P + 1);
        $('.kc-kp').textContent = 'P' + kp;
        $('.kc-kc').textContent = 'Consumer ' + (owner[kp] + 1);
        $('.kc-kp2').textContent = 'P' + kp2;
        let moved = 0; for (let i = 1; i <= 100; i++) { const hh = hash('user_' + i); if (hh % P !== hh % (P + 1)) moved++; }
        $('.kc-knote').textContent = `The same key always goes to P${kp}, so all of "${key}"\'s events stay in order. But as soon as partitions go from ${P} to ${P + 1}, ${kp === kp2 ? 'this key stays put, but' : 'this key moves to P' + kp2 + ', and'} ${moved} of the keys user_1..user_100 change partition. During the change, old and new events sit in different partitions = that key\'s order can break. (The simulator uses a simple hash; real Kafka uses murmur2, but the idea is the same.)`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'term', title: 'Rebalance', html: `<strong>What it is:</strong> sharing out the partitions again when a consumer joins or leaves the group. Kafka's <strong>group coordinator</strong> (one of the brokers) runs it. Consumers keep sending it <strong>heartbeats</strong> ("I am alive"); when heartbeats stop, the consumer is treated as dead.<br><strong>Why we need it:</strong> someone must read a dead consumer's partitions, and a new consumer should get work too.<br><strong>Without it:</strong> a crashed consumer's partitions would stop forever.<br><strong>Two styles:</strong> <strong>eager</strong> (the old way): all consumers give up all their partitions, everything stops, then a new split ("stop-the-world"). <strong>Cooperative / incremental</strong>: only the partitions whose owner must change move; the rest keep running. Kafka 4.0 made the new consumer group protocol (KIP-848) generally available, built on this incremental idea (on the consumer: <code>group.protocol=consumer</code>).` },
    { type: 'p', html: `<strong>Consumer group lab.</strong> The topic has 6 partitions, and the producer writes 100 records/second into each (600/s in total). Each consumer can read 250 records/second. You start with 2 consumers. Press "▶ 10 s", then add or crash a consumer, and watch each partition's lag. During a rebalance a partition pauses for 2 seconds (yellow). After a crash, the group needs 3 seconds to notice (heartbeats stop).` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="kg-strat" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
          <button type="button" class="btn small primary kg-t1">▶ 1 s</button><button type="button" class="btn small primary kg-t10">▶ 10 s</button>
          <button type="button" class="btn small kg-add">+ Consumer</button><button type="button" class="btn small kg-crash">Consumer crash</button><button type="button" class="btn small ghost kg-reset">Reset</button>
        </div>
        <div class="kg-mem" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px"></div>
        <div class="kg-parts" style="display:grid;gap:6px;margin-top:10px"></div>
        <div class="stats">
          <div class="stat"><span>Time</span><strong class="kg-o-t"></strong></div>
          <div class="stat"><span>Total lag</span><strong class="kg-o-lag"></strong></div>
          <div class="stat"><span>Read speed / incoming speed</span><strong class="kg-o-cap"></strong></div>
        </div>
        <ol class="kg-log" style="margin:10px 0 0;padding-left:22px;font:13px/1.6 var(--f-mono);color:var(--ink-2)"></ol>
        <div class="calc-note kg-note"></div>`;
      const P = 6, RATE = 100, CAP = 250, DETECT = 3, PAUSE = 2;
      let strat = 'eager', S;
      const mk = st => {
        const S = { t: 0, strat: st, members: [{ id: 1, alive: true }, { id: 2, alive: true }], next: 3, owner: [], latest: Array(P).fill(1000), done: Array(P).fill(1000), paused: Array(P).fill(0), rebAt: null, log: [] };
        const live = () => S.members.filter(m => m.alive).map(m => m.id);
        const range = ids => { const o = []; const n = ids.length, base = Math.floor(P / n), ex = P % n; let p = 0; ids.forEach((id, i) => { for (let k = 0; k < base + (i < ex ? 1 : 0); k++) o[p++] = id; }); return o; };
        const sticky = ids => { const n = ids.length, cap = Math.ceil(P / n), cnt = {}; ids.forEach(i => cnt[i] = 0); const o = Array(P).fill(null);
          for (let p = 0; p < P; p++) { const w = S.owner[p]; if (w != null && cnt[w] != null && cnt[w] < cap && cnt[w] < Math.floor(P / n)) { o[p] = w; cnt[w]++; } }
          for (let p = 0; p < P; p++) if (o[p] == null) { const w = ids.slice().sort((a, b) => cnt[a] - cnt[b] || a - b)[0]; o[p] = w; cnt[w]++; } return o; };
        S.live = live;
        S.rebalance = () => { const ids = live(); const o = S.strat === 'eager' ? range(ids) : sticky(ids); const moved = []; for (let p = 0; p < P; p++) if (o[p] !== S.owner[p]) moved.push(p);
          for (let p = 0; p < P; p++) if (S.strat === 'eager' || moved.includes(p)) S.paused[p] = PAUSE; S.owner = o; S.rebAt = null;
          S.log.push(`t=${S.t}s rebalance (${S.strat === 'eager' ? 'eager: all stopped' : 'cooperative'}): ${moved.length ? 'owner changed for ' + moved.map(p => 'P' + p).join(', ') : 'no change'}`); };
        S.owner = range(live());
        S.add = () => { if (S.members.length >= 8) return; S.members.push({ id: S.next++, alive: true }); S.rebAt = S.t; S.log.push(`t=${S.t}s C${S.next - 1} joined the group`); };
        S.crash = () => { const m = S.members.filter(m => m.alive).pop(); if (!m || live().length < 2) return; m.alive = false; S.rebAt = S.t + DETECT; S.log.push(`t=${S.t}s C${m.id} crashed (the group does not know yet)`); };
        S.tick = () => { if (S.rebAt !== null && S.t >= S.rebAt) S.rebalance();
          const ids = live(), np = {}; S.owner.forEach(o => np[o] = (np[o] || 0) + 1);
          for (let p = 0; p < P; p++) { S.latest[p] += RATE; const o = S.owner[p]; if (S.paused[p] > 0) { S.paused[p]--; continue; } if (!ids.includes(o)) continue; S.done[p] = Math.min(S.latest[p], S.done[p] + CAP / np[o]); }
          S.t++; };
        S.lag = () => S.latest.reduce((a, l, p) => a + l - S.done[p], 0);
        return S;
      };
      const draw = () => {
        const sb = el.querySelector('.kg-strat'); sb.innerHTML = '';
        [['eager', 'Eager rebalance (stop-the-world)'], ['coop', 'Cooperative (sticky)']].forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small' + (strat === k ? ' primary' : ''); b.textContent = v; b.onclick = () => { strat = k; S = mk(strat); draw(); }; sb.appendChild(b); });
        const ids = S.live();
        el.querySelector('.kg-mem').innerHTML = S.members.map(m => `<span class="chip${m.alive ? ' on' : ''}" style="${m.alive ? '' : 'color:var(--red);text-decoration:line-through'}">C${m.id}</span>`).join('');
        el.querySelector('.kg-parts').innerHTML = Array.from({ length: P }, (_, p) => {
          const lag = Math.round(S.latest[p] - S.done[p]), o = S.owner[p], dead = !ids.includes(o), pz = S.paused[p] > 0;
          const st = dead ? 'owner dead: nobody reading' : pz ? 'rebalance: paused' : '';
          const col = dead ? 'var(--red)' : pz ? 'var(--amber)' : 'var(--accent)';
          return `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;font:13px var(--f-mono);color:var(--ink-2)"><span style="min-width:62px"><strong style="color:var(--ink)">P${p}</strong>→C${o}</span>
            <span style="flex:1;min-width:50px;height:12px;background:var(--surface-2);border-radius:6px;overflow:hidden"><span style="display:block;height:100%;width:${Math.min(100, lag / 15)}%;background:${col}"></span></span>
            <span style="min-width:64px">lag ${lag}</span>${st ? `<span style="color:${col};font-size:12px">${st}</span>` : ''}</div>`; }).join('');
        el.querySelector('.kg-o-t').textContent = S.t + ' s';
        el.querySelector('.kg-o-lag').textContent = Math.round(S.lag()).toLocaleString('en-IN');
        const cap = Math.min(ids.length * CAP, P * CAP);
        el.querySelector('.kg-o-cap').textContent = cap + ' / ' + P * RATE;
        el.querySelector('.kg-log').innerHTML = S.log.slice(-4).map(l => '<li>' + l + '</li>').join('') || '<li>No events yet. Press ▶.</li>';
        let n = cap < P * RATE ? `${ids.length} consumers × 250 = ${cap}/s, but 600/s are arriving. The lag will grow every second. You need at least 3 consumers (600 ÷ 250 = 2.4).` : `${ids.length} consumers × 250 = ${cap}/s, more than the 600/s arriving. The lag will shrink to 0.`;
        if (ids.length > P) n += ` But ${ids.length - P} consumers have no partition: they are idle.`;
        if (S.rebAt !== null) n += ` The crash will be noticed in ${S.rebAt - S.t} seconds; until then the lag of the dead consumer\'s partitions keeps growing.`;
        n += strat === 'eager' ? ' Eager mode: on every rebalance all 6 partitions stop for 2 s.' : ' Cooperative mode: on a rebalance only the partitions whose owner changed stop.';
        el.querySelector('.kg-note').textContent = n;
      };
      el.querySelector('.kg-t1').onclick = () => { S.tick(); draw(); };
      el.querySelector('.kg-t10').onclick = () => { for (let i = 0; i < 10; i++) S.tick(); draw(); };
      el.querySelector('.kg-add').onclick = () => { S.add(); draw(); };
      el.querySelector('.kg-crash').onclick = () => { S.crash(); draw(); };
      el.querySelector('.kg-reset').onclick = () => { S = mk(strat); draw(); };
      S = mk(strat); draw();
    }},
    { type: 'callout', tone: 'tip', html: `Try this: "▶ 10 s" (2 consumers, lag grows to 1,000), then "+ Consumer", then "▶ 10 s". In eager mode, after the add all partitions stopped for 2 s and the lag at t=20 is 1,000. Reset, pick Cooperative and do the same steps: only P2 and P5 moved, and the lag at t=20 is only 333. That is why newer systems use cooperative / KIP-848 rebalancing.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Add consumers and it gets faster." Only up to the number of partitions! Put 10 consumers on 6 partitions and 4 will sit idle. And inside one partition only one consumer works, so one slow partition (a hot key) can hold the whole group back.` },

    { type: 'h2', text: 'Ordering per key' },
    { type: 'p', html: `Kafka guarantees order only <strong>inside one partition</strong>, not across the whole topic. So send events whose order matters to the same partition, which means giving them the <strong>same key</strong>. Example: one video's events <code>uploaded → transcoded → published → deleted</code>. Key = <code>video_id</code>. If the key were random, "deleted" could be processed first and "published" later: the deleted video would show up again.` },
    { type: 'list', items: [
      `<strong>Choosing a key = choosing a shard key.</strong> The key should capture what needs ordering (order_id, user_id, video_id) and also spread the load evenly.`,
      `<strong>Hot key:</strong> crores of events on one celebrity's video, all in one partition. That partition and its consumer become the bottleneck. Fix: split the key a little (<code>video_7#3</code>) where strict order is not needed.`,
      `<strong>If you add partitions later,</strong> <code>hash % N</code> changes and keys move to new partitions (you saw this in the simulator). So pick a well-thought-out number at the start.`,
      `<strong>No key given?</strong> The producer spreads records across partitions (good for load, no order guarantee).`,
    ]},

    { type: 'p', html: `<strong>Ordering lab.</strong> 5 events were sent in this order: video 7 uploaded, video 9 uploaded, video 7 published, video 9 published, video 7 deleted. The topic has 3 partitions, each with its own consumer. Try with a key and without one, and make P2's consumer slow (like a long GC pause: the program stops for a while to clean up memory).` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="ko-modes" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <label style="display:block;margin-top:10px;font:14px var(--f-body);color:var(--ink-2)"><input class="ko-slow" type="checkbox" checked> P2's consumer is slow (3 seconds per event)</label>
        <div class="ko-parts" style="display:grid;gap:6px;margin-top:10px;font:13px var(--f-mono);color:var(--ink-2)"></div>
        <ol class="ko-log" style="margin:10px 0 0;padding-left:22px;font:13px/1.6 var(--f-mono);color:var(--ink-2)"></ol>
        <div class="stats">
          <div class="stat"><span>Video 7 final status</span><strong class="ko-v7"></strong></div>
          <div class="stat"><span>Video 9 final status</span><strong class="ko-v9"></strong></div>
        </div>
        <div class="calc-note ko-note"></div>`;
      const EV = [['7', 'uploaded'], ['9', 'uploaded'], ['7', 'published'], ['9', 'published'], ['7', 'deleted']];
      let mode = 'key';
      const run = () => {
        const box = el.querySelector('.ko-modes'); box.innerHTML = '';
        [['key', 'Key = video_id'], ['nokey', 'No key (round robin)']].forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small' + (mode === k ? ' primary' : ''); b.textContent = v; b.onclick = () => { mode = k; run(); }; box.appendChild(b); });
        const slow = el.querySelector('.ko-slow').checked;
        const parts = [[], [], []];
        EV.forEach((e, i) => { const p = mode === 'key' ? (e[0] === '7' ? 0 : 1) : i % 3; parts[p].push(e); });
        const done = [];
        parts.forEach((list, p) => { let t = 0; list.forEach(e => { t += p === 2 && slow ? 3 : 1; done.push({ t, p, e }); }); });
        done.sort((a, b) => a.t - b.t || a.p - b.p);
        const state = {};
        done.forEach(d => { state[d.e[0]] = d.e[1]; });
        el.querySelector('.ko-parts').innerHTML = parts.map((l, p) => `<div><strong style="color:var(--ink)">P${p}</strong>: ${l.length ? l.map(e => 'v' + e[0] + ' ' + e[1]).join(' → ') : '(empty)'}</div>`).join('');
        el.querySelector('.ko-log').innerHTML = done.map(d => `<li>t=${d.t}s · P${d.p} consumer: video ${d.e[0]} → ${d.e[1]}</li>`).join('');
        const v7 = el.querySelector('.ko-v7'); v7.textContent = state['7']; v7.style.color = state['7'] === 'deleted' ? 'var(--green)' : 'var(--red)';
        const v9 = el.querySelector('.ko-v9'); v9.textContent = state['9']; v9.style.color = state['9'] === 'published' ? 'var(--green)' : 'var(--red)';
        el.querySelector('.ko-note').textContent = mode === 'key' ? 'All three events of video 7 are in one partition (P0), so one consumer processed them in line. Slow consumer or not, the final status is right: deleted.' : state['7'] === 'deleted' ? 'Without a key, video 7\'s events got scattered into P0, P2 and P1. The order was right this time only by luck, because all consumers ran at the same speed. Turn "slow" on and see.' : 'No key: video 7\'s "published" was stuck in slow P2 and was processed AFTER "deleted". The deleted video shows as published again! A topic has no global order, only order inside a partition.';
      };
      el.querySelector('.ko-slow').addEventListener('change', run); run();
    }},
    { type: 'h2', text: 'Retention and replay' },
    { type: 'callout', tone: 'term', title: 'Retention', html: `<strong>What it is:</strong> how long Kafka keeps records. Default 7 days (<code>log.retention.hours=168</code>). After that, old parts (segments) are deleted, whether anyone read them or not.<br><strong>Why we need it:</strong> disk is not endless. And readers get a fixed window to go back in time.<br><strong>Without it:</strong> either the disk fills up, or records are deleted on read (like a queue, no replay).` },
    { type: 'callout', tone: 'term', title: 'Replay (rewind)', html: `<strong>What it is:</strong> moving a consumer group's bookmark back and reading again from there.<br><strong>Why we need it:</strong> to fix wrong processing after a bug fix, to give a new team history, to fill a new system from the start.<br><strong>Without it:</strong> a mistake would stay in the data forever.` },
    { type: 'callout', tone: 'term', title: 'Log compaction', html: `<strong>What it is:</strong> instead of deleting by time, keep only the <strong>latest</strong> record for each key (<code>cleanup.policy=compact</code>).<br><strong>Why we need it:</strong> when a topic represents a "current state", like each user's latest profile. A new consumer can read from the start and build the full current state, without years of history.<br><strong>Without it:</strong> either keep all history (expensive), or delete old data and lose the state of some keys.<br><strong>Example:</strong> user_42 changed their name 50 times. After compaction only the last name is left.` },
    { type: 'table', head: ['Setting', 'Meaning', 'When'], rows: [
      ['Time retention (default 7 days: <code>log.retention.hours=168</code>)', 'Records older than this are deleted', 'Normal event streams'],
      ['Size retention', 'If a partition gets this big, the old part is deleted', 'When the disk budget is fixed'],
      ['Log compaction (<code>cleanup.policy=compact</code>)', 'Keep only the <strong>latest</strong> record per key', 'Like "a user\'s latest profile" or a table\'s current state: a new consumer can build the full state'],
      ['Infinite / tiered storage', 'Old data on cheaper storage', 'When the event log itself is the source of truth (event sourcing)'],
    ]},
    { type: 'p', html: `Three big uses of replay: a <strong>new team</strong> needs history, reprocessing after a <strong>bug fix</strong>, and filling a <strong>new system</strong> (like a new search engine) from the start. This is Kafka's biggest strength that a queue does not have.` },

    { type: 'p', html: `<strong>Retention + replay calculator.</strong> xyz.com's <code>video-events</code> topic: 10 lakh events a day (each ~1 KB), replication factor 3. The analytics consumer can read 30 lakh events a day at full speed. Change the retention and "how many days analytics was down".` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Retention: <strong class="kr-vr"></strong></label><input class="kr-r" type="range" min="1" max="14" step="1" value="7"></div>
          <div><label>Analytics was down for: <strong class="kr-vd"></strong></label><input class="kr-d" type="range" min="0" max="12" step="1" value="2"></div>
        </div>
        <svg class="kr-svg" viewBox="0 0 600 120" style="width:100%;height:auto;display:block;margin-top:10px" role="img" aria-label="Retention window"></svg>
        <div class="stats">
          <div class="stat"><span>Lag when it returns</span><strong class="kr-o-lag"></strong></div>
          <div class="stat"><span>Lost (outside retention)</span><strong class="kr-o-lost"></strong></div>
          <div class="stat"><span>Catch-up time</span><strong class="kr-o-cu"></strong></div>
          <div class="stat"><span>Disk (3 copies)</span><strong class="kr-o-disk"></strong></div>
        </div>
        <div class="calc-note kr-note"></div>`;
      const RATE = 1e6, SPEED = 3e6;
      const L = n => (n / 1e5).toLocaleString('en-IN') + ' lakh';
      const upd = () => {
        const R = +el.querySelector('.kr-r').value, D = +el.querySelector('.kr-d').value;
        el.querySelector('.kr-vr').textContent = R + ' days'; el.querySelector('.kr-vd').textContent = D + ' days';
        const lost = Math.max(0, D - R) * RATE, lag = Math.min(D, R) * RATE, cuH = lag / (SPEED - RATE) * 24;
        const W = 14, X = d => 30 + (d / W) * 540;
        let svg = `<rect x="${X(W - R)}" y="30" width="${X(W) - X(W - R)}" height="34" rx="4" fill="var(--accent-soft)" stroke="var(--accent)"/>
          <text x="${X(W - R / 2)}" y="52" text-anchor="middle" font-size="14" fill="var(--ink)" font-family="var(--f-mono)">retention: ${R} days</text>
          <line x1="30" x2="570" y1="80" y2="80" stroke="var(--line-2)"/>
          <text x="30" y="100" font-size="14" fill="var(--ink-3)" font-family="var(--f-mono)">14 days ago</text><text x="570" y="100" text-anchor="end" font-size="14" fill="var(--ink-3)" font-family="var(--f-mono)">today</text>`;
        if (D > 0) svg += `<line x1="${X(W - D)}" x2="${X(W - D)}" y1="18" y2="80" stroke="${D > R ? 'var(--red)' : 'var(--green)'}" stroke-width="3"/><text x="${Math.max(X(W - D), 100)}" y="14" text-anchor="middle" font-size="13" fill="${D > R ? 'var(--red)' : 'var(--green)'}" font-family="var(--f-mono)">analytics bookmark</text>`;
        el.querySelector('.kr-svg').innerHTML = svg;
        el.querySelector('.kr-o-lag').textContent = L(lag);
        const lo = el.querySelector('.kr-o-lost'); lo.textContent = lost ? L(lost) : '0'; lo.style.color = lost ? 'var(--red)' : 'var(--green)';
        el.querySelector('.kr-o-cu').textContent = lag ? Math.round(cuH) + ' hours' : '-';
        el.querySelector('.kr-o-disk').textContent = R * 3 + ' GB';
        el.querySelector('.kr-note').textContent = (D === 0 ? 'No downtime, lag 0. ' : D > R ? `Analytics was down for ${D} days, but retention is only ${R} days. The records from the first ${D - R} days after its bookmark are already deleted: ${L(lost)} events are gone forever. So: an alarm on lag, and retention longer than normal downtime. ` : `Analytics is ${D} days behind, but all records are still within retention. Nothing is lost. It reads 30 lakh/day and 10 lakh/day arrive, so the lag drops by 20 lakh each day: caught up in ${Math.round(cuH)} hours. `) + `A new team joining today can replay ${R} days (${L(R * RATE)} events) of history. The cost: ${R} days × 10 lakh × 1 KB × 3 copies = ${R * 3} GB of disk.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'h2', text: 'Replication: a broker dies, the data survives' },
    { type: 'p', html: `In the 2011 paper, replication was "future work". Today every partition has several copies (the <strong>replication factor</strong>, usually 3) on different brokers.` },
    { type: 'callout', tone: 'term', title: 'Replication factor, leader, follower', html: `<strong>What it is:</strong> several copies (<strong>replicas</strong>) of each partition, on different brokers. Replication factor 3 = three copies. One copy is the <strong>leader</strong>: it takes all writes. The others are <strong>followers</strong>: they keep pulling (fetching) new records from the leader.<br><strong>Why we need it:</strong> if one broker's disk dies, the data survives in another copy, and a follower becomes the new leader.<br><strong>Without it:</strong> one machine lost = that partition's data lost.` },
    { type: 'callout', tone: 'term', title: 'ISR (in-sync replicas)', html: `<strong>What it is:</strong> the replicas that keep "in step" with the leader, meaning they are not too far behind (one that falls behind by more than <code>replica.lag.time.max.ms</code> leaves the ISR). A record counts as <strong>committed</strong> when every ISR replica has it; consumers only see committed records.<br><strong>Why we need it:</strong> if the leader dies, the new leader is chosen only from the ISR, because only they have every committed record.<br><strong>Without it:</strong> a lagging replica could become leader and committed data would vanish.` },
    { type: 'callout', tone: 'term', title: 'acks and min.insync.replicas', html: `<strong>What it is:</strong> <code>acks</code> is a producer setting: when do you want the "saved" reply? <code>acks=0</code> = wait for nobody. <code>acks=1</code> = only the leader wrote it. <code>acks=all</code> = every ISR replica wrote it. <code>min.insync.replicas</code> is a topic/broker setting: with <code>acks=all</code>, if the ISR has fewer replicas than this, the write is rejected.<br><strong>Why we need it:</strong> to choose your own balance between speed and safety.<br><strong>Without it:</strong> either every write is slow, or even payment data is at risk.<br><strong>Default:</strong> since Kafka 3.0 the producer defaults to <code>acks=all</code> with the idempotent producer on. A common setup: replication factor 3, <code>min.insync.replicas=2</code>.` },
    { type: 'callout', tone: 'term', title: 'Controller and KRaft', html: `<strong>What it is:</strong> the controller is the cluster's "manager". It keeps the <strong>metadata</strong>: which brokers are alive, how many partitions each topic has, and who leads each partition. If a leader dies, it picks the new one. <strong>KRaft</strong> = Kafka's own way to keep this metadata on several controllers (usually 3 or 5) using Raft consensus (Raft: machines vote to agree on one answer; see the Consensus lesson).<br><strong>Why we need it:</strong> someone has to decide who the new leader is, and that decision must not stop when one machine dies.<br><strong>Without it:</strong> if a leader died, the partition would stay leaderless forever.<br><strong>History:</strong> this used to be done by a separate system, ZooKeeper. Since Kafka 4.0 (March 2025) ZooKeeper is fully removed: only KRaft mode. One less system to run.` },
    { type: 'flow', title: 'One partition, three replicas', height: 330,
      nodes: [
        { id: 'prod', label: 'Producer', sub: 'acks=all', x: 90, y: 60, w: 130, kind: 'server', info: 'What it is: the service that writes events. The producer writes only to the leader. The acks setting decides when the confirmation comes.' },
        { id: 'l', label: 'Broker 1', sub: 'LEADER, P0', x: 330, y: 165, w: 150, kind: 'data', info: 'What it is: the Kafka server that holds the leader copy of partition 0. All writes (and by default reads) happen here. Followers fetch records from it.' },
        { id: 'f2', label: 'Broker 2', sub: 'follower (ISR)', x: 600, y: 60, w: 160, kind: 'data', info: 'What it is: a second Kafka server, with a follower copy of partition 0. It keeps fetching from the leader. It is in the ISR because it is not behind, so if the leader dies it can become the leader.' },
        { id: 'f3', label: 'Broker 3', sub: 'follower (ISR)', x: 600, y: 270, w: 160, kind: 'data', info: 'What it is: a third Kafka server, the third copy. Replication factor 3 means the data is on three brokers.' },
        { id: 'ctrl', label: 'Controller', sub: 'KRaft quorum', x: 330, y: 290, w: 150, kind: 'net', info: 'What it is: the cluster\'s "manager": it keeps the metadata of which broker is alive and who is leader, and picks a new leader if one dies. This used to be done with ZooKeeper; since Kafka 4.0 (March 2025) ZooKeeper is fully removed and only Kafka\'s own Raft-based KRaft mode runs.' },
      ],
      edges: [{ a: 'prod', b: 'l' }, { a: 'l', b: 'f2' }, { a: 'l', b: 'f3' }, { a: 'ctrl', b: 'l' }, { a: 'ctrl', b: 'f2', id: 'cf2' }, { a: 'ctrl', b: 'f3', id: 'cf3' }, { a: 'prod', b: 'f2', id: 'pf2', hidden: true }, { a: 'f2', b: 'f3', id: 'f23', hidden: true }],
      scenarios: [
        { name: 'acks=all (happy)', steps: [
          { title: 'The producer writes to the leader', go: 'prod>l', text: 'The record is added to the leader\'s log.', msg: 'produce P0  acks=all' },
          { title: 'Followers copy it', parallel: true, go: ['l>f2', 'l>f3'], text: 'Both followers fetched the record.', after: { f2: { state: 'ok' }, f3: { state: 'ok' } } },
          { title: 'Now the ack', go: 'res:l>prod', text: 'All ISR replicas have it; the record is committed. The producer gets the ack. A bit more latency (waiting for followers), but three copies.', msg: 'ack: partition 0, offset 4521' },
        ]},
        { name: 'Leader crash (acks=all)', steps: [
          { title: 'The record was committed', parallel: true, go: ['prod>l', 'l>f2', 'l>f3', 'res:l>prod'], text: 'The last record is on all three.' },
          { title: 'Broker 1 is down', set: { l: { state: 'down', sub: 'DOWN' } }, text: 'The leader\'s machine crashed.', focus: ['l'] },
          { title: 'The controller picks a new leader', text: 'The controller stops getting heartbeats from broker 1. It makes Broker 2, from the ISR, the leader. Because Broker 2 was in the ISR, it has every committed record.', go: 'evt:ctrl>f2', after: { f2: { state: 'ok', sub: 'NEW LEADER, P0' } } },
          { title: 'The producer writes to the new leader', text: 'The producer refreshed its metadata and now writes to Broker 2. Broker 3 now copies from Broker 2. No committed data was lost.', show: ['pf2', 'f23'], go: ['prod>f2', 'f2>f3', 'res:f2>prod'] },
        ]},
        { name: 'acks=1: data loss', intro: 'For speed, the producer set acks=1.', steps: [
          { title: 'The leader wrote it, instant ack', go: ['prod>l', 'res:l>prod'], text: 'No waiting for followers. The producer is happy: "saved".', msg: 'ack (only the leader wrote it)' },
          { title: 'Crash before the copy', set: { l: { state: 'down', sub: 'DOWN' } }, go: 'lost:l>f2', text: 'The leader died before the followers could fetch.' },
          { title: 'The new leader does not have the record', go: 'evt:ctrl>f2', after: { f2: { state: 'warn', sub: 'leader, record gone!' } }, text: 'Broker 2 became leader, but without that record. The producer got an "ack", yet the record is <strong>gone</strong>. Maybe OK for logs or metrics, never for payments.' },
        ]},
        { name: 'Followers down + min ISR', intro: 'Replication factor 3, min.insync.replicas = 2, acks=all.', steps: [
          { title: 'Two followers are down', set: { f2: { state: 'down', sub: 'DOWN' }, f3: { state: 'down', sub: 'DOWN' } }, text: 'Only the leader is left in the ISR (1 < 2).', focus: ['f2', 'f3'] },
          { title: 'Write rejected', go: ['prod>l', 'bad:l>prod'], text: 'The leader refuses the write. Here Kafka chose <strong>durability over availability</strong>: accepting data on only one copy is risky. The producer will retry until the replicas come back.', msg: 'error: NOT_ENOUGH_REPLICAS' },
        ]},
      ],
    },
    { type: 'p', html: `<strong>acks + ISR lab.</strong> One partition, replication factor 3 (1 leader + 2 followers). Choose the settings and how many followers are in sync right now, and see: was the write accepted, and if the leader dies right after the ack (before the followers copy), does the record survive?` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div style="font:600 13px var(--f-body);color:var(--ink-2);margin-bottom:6px">Producer acks</div><div class="ka-acks" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div style="font:600 13px var(--f-body);color:var(--ink-2);margin:10px 0 6px">min.insync.replicas</div><div class="ka-min" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div style="font:600 13px var(--f-body);color:var(--ink-2);margin:10px 0 6px">In-sync followers right now</div><div class="ka-f" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <label style="display:block;margin-top:10px;font:14px var(--f-body);color:var(--ink-2)"><input class="ka-crash" type="checkbox" checked> Leader crashes right after the ack (followers have not copied yet)</label>
        <div class="stats">
          <div class="stat"><span>ISR size</span><strong class="ka-o-isr"></strong></div>
          <div class="stat"><span>Write</span><strong class="ka-o-w"></strong></div>
          <div class="stat"><span>Speed</span><strong class="ka-o-sp"></strong></div>
          <div class="stat"><span>Record after the leader crash</span><strong class="ka-o-r"></strong></div>
        </div>
        <div class="calc-note ka-note"></div>`;
      let acks = 'all', min = 2, f = 2;
      const btns = (sel, opts, get, set) => { const box = el.querySelector(sel); box.innerHTML = ''; opts.forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small' + (get() === k ? ' primary' : ''); b.textContent = v; b.onclick = () => { set(k); run(); }; box.appendChild(b); }); };
      const decide = (acks, min, f, crash) => {
        const isr = 1 + f;
        if (acks === 'all' && isr < min) return { w: 'REJECTED', r: '-', n: `The ISR has only ${isr}, but min.insync.replicas = ${min}. The leader refuses the write (NOT_ENOUGH_REPLICAS). Kafka gave up availability here so that data does not live on just one copy. The producer will retry.` };
        const sp = acks === '0' ? 'fastest' : acks === '1' ? 'fast' : 'a bit slower';
        if (!crash) return { w: 'OK', sp, r: 'safe', n: acks === '0' ? 'With no crash everything looks fine. But with acks=0 the producer never even knows whether the write happened.' : 'No crash, the record is safe. Now turn on "leader crash" to see the real difference.' };
        if (acks === 'all') return f > 0 ? { w: 'OK', sp, r: 'SAFE', n: `acks=all: the ack came only when all ${isr} ISR replicas had the record. The leader died, an ISR follower became leader, and it has the record. The "crashed before the copy" situation cannot happen with acks=all.` } : { w: 'OK', sp, r: 'OFFLINE', n: 'The ISR had only the leader, and min.insync.replicas = 1 accepted the write. When the leader died, no in-sync copy was left. Unclean election is off, so the partition is down until that broker comes back. If its disk died, the data is gone. That is why we use min.insync.replicas = 2.' };
        if (acks === '1') return f > 0 ? { w: 'OK', sp, r: 'LOST', n: 'acks=1: only the leader wrote it and acked at once. The leader died before the followers copied it. The new leader (a follower) does not have the record. The producer was told "saved", yet the record is gone. min.insync.replicas does not apply to acks=1 at all.' } : { w: 'OK', sp, r: 'OFFLINE', n: 'Only the leader had a copy. The leader died; the partition is down until the broker comes back.' };
        return { w: 'OK?', sp, r: 'LOST', n: 'acks=0: the producer sent it and moved on. Nobody knows whether the leader even wrote it. On a crash the record is gone. Use it only for data where losing some is fine (metrics).' };
      };
      const run = () => {
        btns('.ka-acks', [['0', 'acks=0'], ['1', 'acks=1'], ['all', 'acks=all']], () => acks, k => acks = k);
        btns('.ka-min', [[1, '1'], [2, '2'], [3, '3']], () => min, k => min = k);
        btns('.ka-f', [[0, '0 (leader only)'], [1, '1'], [2, '2']], () => f, k => f = k);
        const r = decide(acks, min, f, el.querySelector('.ka-crash').checked);
        el.querySelector('.ka-o-isr').textContent = 1 + f;
        const w = el.querySelector('.ka-o-w'); w.textContent = r.w; w.style.color = r.w === 'REJECTED' ? 'var(--amber)' : 'var(--ink)';
        el.querySelector('.ka-o-sp').textContent = r.sp || '-';
        const o = el.querySelector('.ka-o-r'); o.textContent = r.r; o.style.color = /SAFE|safe/.test(r.r) ? 'var(--green)' : r.r === '-' ? 'var(--ink-3)' : 'var(--red)';
        el.querySelector('.ka-note').textContent = r.n;
      };
      el.querySelector('.ka-crash').addEventListener('change', run); run();
    }},
    { type: 'callout', tone: 'tip', html: `Summary: <strong>acks=all + min.insync.replicas=2 + replication factor 3</strong> = even if one broker dies, no acknowledged record is lost, and writes keep working. If two brokers die, writes stop (REJECTED), but the data is never wrong. acks=1 is faster, but "got the ack, still lost" can happen.` },
    { type: 'callout', tone: 'warn', title: 'Unclean leader election', html: `If all ISR replicas fail, should a replica that is behind (non-ISR) become the leader? The topic would come back sooner, but some committed records would be lost. By default Kafka does <strong>not</strong> do this (<code>unclean.leader.election.enable=false</code>), so consistency comes first. This is the same CAP trade-off you will meet in the Theory phase.` },

    { type: 'h2', text: 'Delivery semantics in Kafka' },
    { type: 'table', head: ['Semantics', 'What the consumer does', 'On a crash'], rows: [
      ['At-most-once', 'Commit the offset first, then process', 'A crash mid-processing = records skipped (loss)'],
      ['At-least-once', 'Process first, then commit the offset (most common)', 'A crash before the commit = records again (duplicate)'],
      ['Exactly-once (inside Kafka)', 'Idempotent producer + transactions: "read, processed, wrote the output, committed the offset" all in one atomic transaction; consumers use <code>isolation.level=read_committed</code> (only see records of finished transactions)', 'Either all of it happened or none. Kafka Streams gives this with one setting'],
    ]},
    { type: 'callout', tone: 'mistake', title: 'The limit of exactly-once', html: `Kafka transactions give exactly-once only from <strong>Kafka to Kafka</strong> (read a topic → write a topic). If the consumer does something outside (sends an email, writes to Postgres, calls a payment API), Kafka cannot guarantee it. There the old rule applies: at-least-once + an idempotent consumer (dedup or upsert by event ID or key).` },
    { type: 'callout', tone: 'term', title: 'Idempotent producer', html: `<strong>What it is:</strong> a producer whose retries do not create duplicates in the log. Every record carries a producer ID + a sequence number; if the same sequence comes again, the broker recognises it and does not write it.<br><strong>Why we need it:</strong> the producer sent a record, the ack was lost on the way, and the producer retried. Without idempotence, the log gets two copies.<br><strong>Without it:</strong> duplicate events on every network glitch.<br><strong>Default:</strong> on since Kafka 3.0.` },
    { type: 'callout', tone: 'tip', title: 'Is Kafka a queue now too?', html: `The consumer group rule "one partition = one consumer" ties parallelism to the number of partitions. That is why Kafka added <strong>share groups</strong> ("Queues for Kafka", KIP-932): many consumers read the records of the same partition together, with a separate ack and delivery count for each record, just like a queue. It was early access in Kafka 4.0 and was declared production-ready in Kafka 4.2. For interviews, knowing it exists is enough; the classic answer is still "a queue for jobs, a log for events".` },

    { type: 'h2', text: 'CDC: turn database changes into a stream' },
    { type: 'p', html: `xyz.com's real data is in Postgres. The search index, the cache and the analytics warehouse all need the DB's changes. Writing "after the DB update, also send to Kafka" in code everywhere is error-prone. Better: read what the database itself writes.` },
    { type: 'callout', tone: 'term', title: 'Transaction log (WAL / binlog)', html: `<strong>What it is:</strong> the database's own "diary". Every change (insert, update, delete) is written here before it goes into the table. In Postgres it is called the <strong>WAL</strong> (write-ahead log), in MySQL the <strong>binlog</strong>.<br><strong>Why we need it:</strong> after a crash, the DB repairs itself from this diary, and replicas read it to stay copies (Replication lesson).<br><strong>Without it:</strong> half-done changes after a crash, and replicas would not know about changes.` },
    { type: 'callout', tone: 'term', title: 'CDC (Change Data Capture) and Debezium', html: `<strong>What it is:</strong> a CDC tool reads the database's diary (WAL/binlog) like a replica and turns every insert/update/delete into an event in Kafka. <strong>Debezium</strong> is the most popular open-source CDC tool. For Postgres it uses logical decoding and a <strong>replication slot</strong> (a bookmark inside the DB saying "read up to here"). The first time it takes a snapshot of the whole table, then streams live changes.<br><strong>Why we need it:</strong> app code does not need to know about Kafka at all, and whatever was committed becomes an event: no change can be missed.<br><strong>Without it:</strong> every place in the code must remember "DB, then Kafka too", and sooner or later someone forgets.<br><strong>Inside an event:</strong> <code>before</code>, <code>after</code>, <code>op</code> (c = create, u = update, d = delete, r = snapshot read), and source metadata.` },
    { type: 'code', text: `{
  "before": { "id": 7, "title": "My vlog", "status": "PROCESSING" },
  "after":  { "id": 7, "title": "My vlog", "status": "PUBLISHED" },
  "op": "u",
  "source": { "table": "videos", "lsn": 23983712 },
  "ts_ms": 1791090000000
}` },
    { type: 'p', html: `Benefit: app code does not need to know about Kafka, and whatever was committed becomes an event (no change can be missed). Weakness: events are at the level of "a table row changed", not business meaning ("video published"); and if the table schema changes, consumers can break. The outbox pattern fills this gap.` },

    { type: 'h2', text: 'Transactional outbox: the cure for the dual-write problem' },
    { type: 'callout', tone: 'term', title: 'Dual write', html: `<strong>What it is:</strong> writing to two separate systems in one task (like Postgres <em>and</em> Kafka), with no shared transaction between them.<br><strong>Why it is a problem:</strong> a crash in the middle, or one system being down = written in one, not in the other. No error page shows; the data quietly goes wrong.<br><strong>Example:</strong> the video is in the DB but never reached search.` },
    { type: 'callout', tone: 'term', title: 'Transactional outbox', html: `<strong>What it is:</strong> instead of sending the event straight to Kafka, write it into an <strong>outbox</strong> table in your own DB, in <strong>the same transaction</strong> as the business data. Then a separate process (Debezium or a small relay) picks events from the outbox and publishes them to Kafka.<br><strong>Why we need it:</strong> now the service writes to only one system (the DB). Either both rows are saved, or neither. An event is never "half done".<br><strong>Without it:</strong> all the messy dual-write scenarios (see the flow and lab below).<br><strong>Cost:</strong> publishing is a little delayed, and it is at-least-once: consumers must dedup by event ID.` },
    { type: 'p', html: `The upload service has two jobs: write a row to the <code>videos</code> table, and send "video.uploaded" to Kafka. These are two <strong>separate systems</strong> with no shared transaction between them. This is called a <strong>dual write</strong>, and it quietly corrupts data. Run all the scenarios:` },
    { type: 'flow', title: 'Dual write vs outbox', height: 330,
      nodes: [
        { id: 'svc', label: 'Upload service', x: 90, y: 165, w: 140, kind: 'server', info: 'What it is: the business logic for video uploads. It must write to the DB and also tell the rest of the world with an event.' },
        { id: 'db', label: 'Postgres', sub: 'videos + outbox', x: 330, y: 75, w: 160, kind: 'data', info: 'What it is: our main database, the source of truth. In the outbox pattern, this same DB has an "outbox" table: id, aggregatetype, aggregateid, type, payload.' },
        { id: 'k', label: 'Kafka', sub: 'topic: videos', x: 600, y: 165, w: 140, kind: 'queue', info: 'What it is: the Kafka cluster, the event log that other services read from. Why: one event, many readers.' },
        { id: 'dbz', label: 'Debezium', sub: 'CDC, reads WAL', x: 330, y: 275, w: 160, kind: 'server', hidden: true, info: 'What it is: the CDC tool. It reads the outbox table\'s inserts from the WAL and publishes them to Kafka. Debezium\'s "outbox event router" picks the topic from aggregatetype and the key from aggregateid.' },
        { id: 's', label: 'Search indexer', sub: 'consumer', x: 600, y: 290, w: 150, kind: 'server', info: 'What it is: the search team\'s consumer. It dedups by event ID, because the outbox is at-least-once: sometimes the same event comes twice.' },
      ],
      edges: [{ a: 'svc', b: 'db' }, { a: 'svc', b: 'k', id: 'sk' }, { a: 'db', b: 'dbz', id: 'dd', hidden: true }, { a: 'dbz', b: 'k', id: 'dk', hidden: true }, { a: 'k', b: 's' }],
      scenarios: [
        { name: 'Dual write: Kafka fails', steps: [
          { title: 'The DB commit is done', go: ['svc>db', 'res:db>svc'], text: 'The video row is saved.', after: { db: { state: 'ok', sub: 'video 7 saved' } }, msg: 'INSERT INTO videos ... ; COMMIT' },
          { title: 'Kafka publish fails', go: 'lost:svc>k', set: { svc: { state: 'warn' } }, text: 'A Kafka timeout, or the service pod restarted at exactly this moment. The event never went out.' },
          { title: 'Hidden damage', text: 'The video is in the DB, but search will never find out. No error page, no alarm. Months later someone asks: "why does my video never show up in search?"', set: { s: { state: 'warn', sub: 'video 7 missing!' } }, focus: ['s'] },
        ]},
        { name: 'Dual write: reverse order', intro: 'So, Kafka first, then the DB?', steps: [
          { title: 'Event first', go: ['svc>k', 'evt:k>s'], text: 'The event went out, and search even indexed it.', after: { s: { sub: 'indexed video 7' } } },
          { title: 'DB transaction fails', go: ['svc>db', 'bad:db>svc'], after: { db: { state: 'down', sub: 'ROLLBACK' } }, text: 'A constraint error or the DB is down. The row was never created.' },
          { title: 'Ghost event', text: 'Search has a video that does not exist. Changing the order did not remove the problem; it just turned it around.', set: { s: { state: 'warn', sub: 'ghost video 7!' } }, focus: ['s'] },
        ]},
        { name: 'Outbox pattern', intro: 'The fix: write the event into the DB too, in the same transaction.', steps: [
          { title: 'One transaction, two inserts', hide: ['sk'], show: ['dbz', 'dd', 'dk'], go: ['svc>db', 'res:db>svc'], text: 'The video row and the outbox row are in <strong>one DB transaction</strong>. Either both are saved, or neither. No more dual write: the service now writes to only one system.', after: { db: { state: 'ok', sub: 'video + outbox row' } }, msg: 'BEGIN;\n  INSERT INTO videos (id, title) VALUES (7, \'My vlog\');\n  INSERT INTO outbox (id, aggregatetype, aggregateid, type, payload)\n    VALUES (\'e-901\', \'video\', \'7\', \'VideoUploaded\', \'{...}\');\nCOMMIT;' },
          { title: 'Debezium reads the WAL', go: 'evt:db>dbz', text: 'The outbox insert reached the WAL, and Debezium read it. (Without CDC, a small "relay" process can also do this by polling the outbox table.)' },
          { title: 'Publish to Kafka', go: ['evt:dbz>k', 'evt:k>s'], text: 'The event went to Kafka with key = aggregateid (7), so all of video 7\'s events stay in order. Search indexed it.', after: { s: { state: 'ok', sub: 'indexed video 7' } } },
          { title: 'Watch for duplicates', text: 'If Debezium restarts after publishing but before saving its position, the event goes out again. The outbox is at-least-once. The consumer dedups by event ID (<code>e-901</code>), so there is no harm.', go: 'evt:k>s', set: { s: { sub: 'e-901 seen: skip' } } },
        ]},
      ],
    },
    { type: 'p', html: `<strong>Dual-write crash lab.</strong> Three methods, four crash points. See the result of each combination, and in the bottom row, all crash points of one method at once.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div style="font:600 13px var(--f-body);color:var(--ink-2);margin-bottom:6px">Method</div><div class="kd-m" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div style="font:600 13px var(--f-body);color:var(--ink-2);margin:10px 0 6px">What went wrong?</div><div class="kd-c" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <ol class="kd-log" style="margin:12px 0 0;padding-left:22px;font:13px/1.6 var(--f-mono);color:var(--ink-2)"></ol>
        <div class="stats">
          <div class="stat"><span>Video 7 in the DB</span><strong class="kd-db"></strong></div>
          <div class="stat"><span>Events received by search</span><strong class="kd-k"></strong></div>
          <div class="stat"><span>Result</span><strong class="kd-r"></strong></div>
        </div>
        <div style="font:600 13px var(--f-body);color:var(--ink-2);margin:12px 0 6px">Result of this method at every crash point</div><div class="kd-mx" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <div class="calc-note kd-note"></div>`;
      const M = { dbk: 'DB first, then Kafka', kdb: 'Kafka first, then DB', ob: 'Outbox + CDC' };
      const C = { none: 'Nothing', crash1: 'Service crash after the first write', down2: 'Second system down', relay: 'Relay restart after publish' };
      let m = 'dbk', c = 'crash1';
      const sim = (m, c) => {
        const L = []; let db = false, ev = 0, err = false;
        if (m === 'dbk') {
          db = true; L.push('INSERT video 7 + COMMIT (DB)');
          if (c === 'crash1') L.push('CRASH: the service died; the Kafka publish never happened');
          else if (c === 'down2') { L.push('Kafka publish: timeout, retries fail too'); }
          else { ev = 1; L.push('Kafka publish: video.uploaded'); }
        } else if (m === 'kdb') {
          ev = 1; L.push('Kafka publish: video.uploaded (search even indexed it)');
          if (c === 'crash1') L.push('CRASH: the service died; the DB insert never happened');
          else if (c === 'down2') L.push('DB insert: error → ROLLBACK');
          else { db = true; L.push('INSERT video 7 + COMMIT (DB)'); }
        } else {
          if (c === 'down2') { err = true; L.push('BEGIN; INSERT video; INSERT outbox → DB error → ROLLBACK (neither row was created)'); L.push('The user gets an error and will try again'); }
          else {
            db = true; L.push('BEGIN; INSERT video 7; INSERT outbox e-901; COMMIT');
            if (c === 'crash1') L.push('CRASH: the service died. No problem, the event is durable in the outbox');
            ev = 1; L.push('Debezium read e-901 from the WAL → Kafka publish');
            if (c === 'relay') { ev = 2; L.push('Debezium restart (its position was not saved) → e-901 published again'); L.push('Search: e-901 already seen → SKIP (dedup)'); }
          }
        }
        let r;
        if (db && ev >= 1) r = ev > 1 ? (m === 'ob' ? 'OK (dedup)' : 'DUPLICATE') : 'OK';
        else if (!db && ev === 0) r = err ? 'OK (clean error)' : 'OK';
        else if (db) r = 'EVENT MISSING';
        else r = 'GHOST EVENT';
        return { L, db, ev, r };
      };
      const btns = (sel, map, get, set) => { const box = el.querySelector(sel); box.innerHTML = ''; Object.entries(map).forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small' + (get() === k ? ' primary' : ''); b.textContent = v; b.onclick = () => { set(k); run(); }; box.appendChild(b); }); };
      const good = r => r.startsWith('OK');
      const run = () => {
        btns('.kd-m', M, () => m, k => m = k); btns('.kd-c', C, () => c, k => c = k);
        const x = sim(m, c);
        el.querySelector('.kd-log').innerHTML = x.L.map(l => `<li style="color:${/CRASH|error|fail/.test(l) ? 'var(--red)' : 'var(--ink-2)'}">${l}</li>`).join('');
        el.querySelector('.kd-db').textContent = x.db ? 'yes' : 'no';
        el.querySelector('.kd-k').textContent = x.ev;
        const r = el.querySelector('.kd-r'); r.textContent = x.r; r.style.color = good(x.r) ? 'var(--green)' : 'var(--red)';
        el.querySelector('.kd-mx').innerHTML = Object.keys(C).map(k => { const y = sim(m, k).r; return `<span class="chip" style="color:${good(y) ? 'var(--green)' : 'var(--red)'};${k === c ? 'border-color:var(--accent)' : ''}">${C[k]}: ${y}</span>`; }).join('');
        const N = { 'EVENT MISSING': 'The video is in the DB, but there is no event in Kafka. Search will never find out. No error, no alarm: the most dangerous kind of bug.', 'GHOST EVENT': 'The event is in Kafka, but the video is not in the DB. Search shows a video that does not exist.', 'OK (dedup)': 'The outbox is at-least-once: on restart the event went out twice. Search recognised the event ID and skipped it. Delivered twice, effect once.', 'OK (clean error)': 'The transaction failed, so neither the video nor the event was created. Everything is consistent; the user got a clear error and can retry.' };
        el.querySelector('.kd-note').textContent = N[x.r] || (m === 'ob' ? 'Outbox: the DB row and the event are written together, atomically. Even if the service crashes, the event is durable in the DB and will be published.' : c === 'relay' ? 'This method has no relay, so this crash point does not apply. Try the other points.' : 'All fine, because nothing went wrong. A dual write only works on the "happy path".');
      };
      run();
    }},
    { type: 'callout', tone: 'mistake', title: '"We will just add try-catch and retry"', html: `A retry only works while the process is alive. If the pod dies after the DB commit and before the Kafka publish (a deploy, out of memory), nobody is left to retry. With an outbox the event is durable in the DB, so it is never lost: the relay or Debezium will send it, if not now then 5 minutes later.` },

    { type: 'h2', text: 'Decide: queue, Kafka or pub/sub?' },
    { type: 'table', head: ['Need', 'Pick', 'Example'], rows: [
      ['Share jobs among workers; each job once, then delete; per-message retries and DLQ', 'Queue: SQS, RabbitMQ, Celery/Sidekiq on Redis', 'Sending emails, resizing images, transcoding videos'],
      ['High-throughput event stream, many independent consumers, replay, ordering per key', 'Log: Kafka, Kinesis, Pulsar', 'Order events → billing, analytics, notifications, search indexing'],
      ['One message to many subscribers right now; loss is OK', 'Pub/sub: Redis Pub/Sub, SNS, Google Pub/Sub', 'A chat message to the gateway servers where the recipients are connected'],
      ['Multi-step business process, retries, timeouts, human steps', 'Workflow engine: Temporal, Step Functions', 'Payment → creator approval → publish'],
    ], caption: 'The decision table from roadmap phase 5.' },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>A queue is a to-do list</strong>: each job is done once by one worker, then it is gone. <strong>Kafka is a newspaper archive</strong>: many different readers read the same events at their own pace and can re-read old ones. Rule of thumb: <em>"Do this task"</em> → queue. <em>"This happened, and several teams care"</em> → Kafka. And remember the roadmap's warning: do not jump straight to Kafka and microservices in a small system; one Postgres + one simple queue go a very long way.` },

    { type: 'h2', text: 'The whole picture' },
    { type: 'diagram', title: 'xyz.com event platform: the whole picture', height: 500,
      groups: [
        { label: 'Kafka cluster', x: 262, y: 26, w: 196, h: 456 },
      ],
      nodes: [
        { id: 'app', label: 'Upload service', sub: 'business logic', x: 100, y: 60, kind: 'server', info: 'What it is: the video upload code. It does not write to Kafka directly: it writes the video row and the outbox row in one DB transaction (to avoid a dual write).' },
        { id: 'pg', label: 'Postgres', sub: 'videos + outbox', x: 100, y: 190, kind: 'data', info: 'What it is: the main database, the source of truth. Every change goes first into the WAL (the DB\'s diary), which Debezium reads.' },
        { id: 'dbz', label: 'Debezium', sub: 'CDC, reads WAL', x: 100, y: 320, kind: 'server', info: 'What it is: the CDC tool. It reads outbox inserts from the WAL and publishes them to Kafka with key = video_id. At-least-once, so consumers dedup.' },
        { id: 'views', label: 'Player apps', sub: 'view events', x: 100, y: 450, kind: 'client', info: 'What it is: the video-watching apps (and the API behind them). Millions of "video viewed" events per second go straight into Kafka with key = video_id. No DB here, so no outbox is needed.' },
        { id: 'ctrl', label: 'KRaft controllers', sub: 'metadata, leaders', x: 360, y: 90, w: 170, kind: 'net', info: 'What it is: the cluster\'s managers (3 machines that agree using Raft). Which broker is alive, who leads each partition. If a broker dies, they pick a new leader. No ZooKeeper since Kafka 4.0.' },
        { id: 'topic', label: 'video-events', sub: '6 partitions × 3', x: 360, y: 255, w: 170, kind: 'queue', info: 'What it is: the topic, split into 6 partitions, each with 3 copies (leader + 2 followers) on different brokers. acks=all, min.insync.replicas=2, retention 7 days.' },
        { id: 'mon', label: 'Lag alarm', sub: 'per group', x: 360, y: 420, w: 170, kind: 'net', info: 'What it is: monitoring that watches each consumer group\'s lag (latest − committed offset). If lag gets close to retention, data may be lost: alarm.' },
        { id: 'gs', label: 'Search group', sub: '→ Elasticsearch', x: 610, y: 110, w: 170, kind: 'server', info: 'What it is: the "search" consumer group. It upserts every video into the search index (idempotent). It commits after processing: at-least-once.' },
        { id: 'ga', label: 'Analytics group', sub: '→ warehouse', x: 610, y: 255, w: 170, kind: 'server', info: 'What it is: the "analytics" consumer group, independent of search. After a bug fix it can reset its offset and re-read yesterday\'s data.' },
        { id: 'gr', label: 'Recs group', sub: 'new: replay', x: 610, y: 400, w: 170, kind: 'server', info: 'What it is: the new recommendations team\'s group. With auto.offset.reset=earliest it replays 7 days of history to build its model.' },
      ],
      edges: [
        { a: 'app', b: 'pg', n: 1, label: 'video + outbox' },
        { a: 'pg', b: 'dbz', n: 2, label: 'WAL' },
        { a: 'dbz', b: 'topic', n: 3, label: 'publish' },
        { a: 'views', b: 'topic', label: 'key=video_id' },
        { a: 'ctrl', b: 'topic', dashed: true, label: 'leaders' },
        { a: 'topic', b: 'gs', n: 4, kind: 'evt' },
        { a: 'topic', b: 'ga', kind: 'evt' },
        { a: 'topic', b: 'gr', kind: 'evt', label: 'replay' },
        { a: 'topic', b: 'mon', dashed: true, label: 'offsets' },
      ],
      paths: [
        { name: 'Upload event', text: 'The video row and the outbox row in one transaction. Debezium read it from the WAL and sent it to Kafka. Search indexed it.', go: ['app>pg>dbz>topic>gs'] },
        { name: 'View events', text: 'Millions of view events go straight into Kafka with key = video_id, so one video\'s events are in one partition, in order. Analytics reads them.', go: ['views>topic>ga'] },
        { name: 'Replay', text: 'The new recs group reads from the start (7 days). The producer and the other groups do not even notice.', go: ['topic>gr'] },
        { name: 'Broker down', text: 'One broker died. The controllers picked a new leader from the ISR. Thanks to acks=all, no acknowledged record was lost.', go: ['ctrl>topic'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Queue = to-do list (read means gone). Kafka = append-only log (reading deletes nothing; records go after retention).</li>
      <li>Topic → partitions → offsets. Order only inside a partition. Same key = same partition = order for that key.</li>
      <li>Consumer group: inside a group one partition goes to one consumer (max parallelism = partitions). Different groups are independent.</li>
      <li>When a consumer joins or leaves: rebalance. Cooperative / KIP-848 rebalancing only moves the partitions it must. Lag is the most important metric.</li>
      <li>Replay: move the bookmark back. If lag grows longer than retention, data is lost.</li>
      <li>Replication factor 3 + acks=all + min.insync.replicas=2 = even if one broker dies, no acknowledged record is lost. KRaft controllers pick leaders (no ZooKeeper since Kafka 4.0).</li>
      <li>A dual write (DB + Kafka) quietly corrupts data. Outbox + CDC (Debezium): one transaction, then at-least-once publish, consumer dedup.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['One event, any number of independent consumers, without copies', 'Replay: a new team, a bug fix, filling a new system from the start', 'Very high throughput (sequential disk writes, batching, page cache)', 'Ordering per key', 'Durable with replication + acks=all', 'CDC/outbox keep the DB and the rest of the world in sync'],
      costs: ['Hard to operate: brokers, partitions, rebalancing, monitoring', 'Group parallelism is limited by partitions; adding partitions later can break order', 'No built-in per-message retry or DLQ (unlike a queue); you build it yourself', 'Order only inside a partition; no global order', 'At-least-once: consumers must be idempotent', 'Overkill for small use cases'] },

    { type: 'think', questions: [
      { q: 'xyz.com\'s "video viewed" topic has 12 partitions. The analytics group has 20 consumers, but the lag is not going down. Why, and what will you do?', a: 'At most 12 consumers can work in the group; 8 are idle. Either make each consumer faster (batching, fewer DB calls), or add partitions (the key mapping will change, so take care with order-sensitive consumers). Also check that no single partition is hot (one viral video key).' },
      { q: 'The payment service sends a "payment.succeeded" event. Which settings and design will you choose for acks, min.insync.replicas and the consumer side?', a: 'Replication factor 3, acks=all, min.insync.replicas=2, idempotent producer, unclean leader election off. Publish the event through an outbox so the DB and Kafka stay in sync. Consumers are at-least-once (commit after processing) and idempotent by payment_id.' },
      { q: 'Should you run Debezium CDC straight on the videos table, or create an outbox table? Give one benefit of each.', a: 'Direct CDC: zero change to app code, and every change is surely captured. Outbox: events are business-level ("VideoPublished"), the table\'s internal schema stays hidden, and the service controls the event format. Outbox is better for public events; direct CDC is enough for internal replication or search sync.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'When is a record deleted in Kafka?', options: ['When all consumers have read it', 'After the retention time/size (or, with compaction, the old value)', 'Right after the ack'], answer: 1, explain: 'Reading does not delete. That is what makes replay possible.' },
      { q: '8 partitions and 10 consumers in one consumer group. What happens?', options: ['All 10 will work', '8 will work, 2 will be idle', 'Kafka will give an error'], answer: 1, explain: 'Inside a group, one partition goes to only one consumer.' },
      { q: 'To process all of one user\'s events in order, what do you do?', options: ['Always use 1 partition', 'Make user_id the message key', 'Add more consumers'], answer: 1, explain: 'Same key → same partition → order inside the partition. One partition would also keep order, but you lose scale.' },
      { q: 'A service committed to the DB, then crashed before publishing to Kafka. What is the standard fix?', options: ['Kafka first, DB later', 'Transactional outbox (the event in the same DB transaction), then publish with CDC or a relay', 'Publish twice'], answer: 1, explain: 'No order of a dual write is safe. The outbox makes the event atomic with the DB write.' },
      { q: 'What is the risk with acks=1?', options: ['Duplicate records', 'The leader acked; if it dies before followers copy, the record can be lost', 'The producer gets slow'], answer: 1, explain: 'acks=1 only confirms the leader. For durable writes use acks=all + min.insync.replicas.' },
      { q: 'What is the difference between an eager and a cooperative rebalance?', options: ['No difference', 'In eager, all consumers drop all their partitions and stop; in cooperative, only partitions whose owner changes stop', 'In cooperative, partitions never move'], answer: 1, explain: 'In the lab: adding a consumer, eager stopped all 6 partitions for 2 s (lag 1,000 at t=20), cooperative only P2 and P5 (lag 333). Kafka 4.0\'s KIP-848 protocol is based on this incremental idea.' },
      { q: 'The analytics group was down for 9 days and retention is 7 days. What happens when it comes back?', options: ['It gets all the events', 'The first 2 days of events after its bookmark are already deleted: lost forever for this group', 'Kafka extends retention by itself'], answer: 1, explain: 'Retention does not wait for readers. Put an alarm on lag and keep retention longer than normal downtime.' },
    ]},
    { type: 'sources', note: 'The paper is from 2011: features like replication, KRaft and transactions came later, so current official docs were used for them.', items: [
      { title: 'Kafka: a Distributed Messaging System for Log Processing', publisher: 'LinkedIn (Kreps, Narkhede, Rao), NetDB workshop 2011', official: true, year: 2011, url: 'https://notes.stephenholiday.com/Kafka.pdf', used: 'Why existing messaging systems were a poor fit, offset as message id, pull model, consumer-side state, time-based retention (typically 7 days) and rewind, sendfile/page cache, partition as unit of parallelism in a consumer group, ZooKeeper role then, at-least-once, replication as future work.' },
      { title: 'Apache Kafka design documentation (4.2)', publisher: 'Apache Kafka', official: true, url: 'https://kafka.apache.org/42/design/design/', used: 'Leader/follower replication, ISR and replica.lag.time.max.ms, committed records, acks=all with min.insync.replicas, unclean leader election default, delivery semantics, log compaction, pull rationale.' },
      { title: 'Apache Kafka 4.0.0 Release Announcement', publisher: 'Apache Kafka blog', official: true, year: 2025, url: 'https://kafka.apache.org/blog/2025/03/18/apache-kafka-4.0.0-release-announcement/', used: 'Kafka 4.0 runs without ZooKeeper (KRaft only); new consumer rebalance protocol (KIP-848) GA, opt-in with group.protocol=consumer; early access of Queues for Kafka (KIP-932).' },
      { title: 'Kafka 4.2 upgrade notes', publisher: 'Apache Kafka', official: true, url: 'https://kafka.apache.org/42/getting-started/upgrade/', used: 'Queues for Kafka (share groups) production-ready in 4.2.' },
      { title: 'What\'s New in Apache Kafka 3.0.0 (KIP-679)', publisher: 'Apache Kafka blog', official: true, url: 'https://blogsarchive.apache.org/kafka/entry/what-s-new-in-apache6', used: 'Producer defaults acks=all and enable.idempotence=true since 3.0.' },
      { title: 'Debezium PostgreSQL connector', publisher: 'Debezium documentation', official: true, url: 'https://debezium.io/documentation/reference/stable/connectors/postgresql.html', used: 'Logical decoding, replication slot, pgoutput, initial snapshot, change event fields (before, after, op, source).' },
      { title: 'Outbox Event Router', publisher: 'Debezium documentation', official: true, url: 'https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html', used: 'Dual-write problem, outbox table columns, routing by aggregatetype, aggregateid as key, at-least-once and consumer dedup by event id.' },
    ]},
  ],
});
