Lesson.register({
  id: 'replication',
  title: 'Database replication',
  minutes: 32,
  summary: `xyz.com still has its database on one machine. If it falls, the site falls, and every read lands on it. Replication means keeping copies of the same data on several machines. Reads can be spread out, and if the leader dies another copy can take its place. But copies sometimes fall behind, and that is where the real fun (and the bugs) begin.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `All of xyz.com's data (users, posts, likes) lives on one computer right now. If that computer breaks, the whole site stops, and the data is in danger too.<br>The fix is simple: <strong>keep copies of the same data on 2 or 3 computers</strong>, and send every new change to all the copies.<br>If one computer falls, another one takes over. And reading work can be shared across all the copies.<br>There is only one hard part: copies sometimes fall a little <strong>behind</strong>. In this lesson we will see what goes wrong then, and how to protect against it.` },
    { type: 'h2', text: 'Problem: one database, two pains' },
    { type: 'p', html: `So far xyz.com has many stateless servers behind a Load Balancer, a Redis cache, and <strong>one</strong> database. In the "Availability and SPOF" lesson we saw that if the database falls, all the servers become useless. A single part whose failure brings everything down is called a <strong>Single Point of Failure (SPOF)</strong>. The cache reduced reads, but two problems are left:` },
    { type: 'list', items: [
      `<strong>Pain 1, SPOF:</strong> if the database disk dies, or the machine restarts, the whole site is down. And if the disk itself breaks, the data is gone too.`,
      `<strong>Pain 2, too many reads:</strong> cache misses, search, profile pages, feeds: xyz.com now sends about 20,000 reads per second, while one SQL machine comfortably handles about 5,000 to 10,000 queries per second. There is also a limit to how big one machine can get.`,
    ]},
    { type: 'p', html: `Both have the same answer: keep <strong>copies</strong> of the data on different machines.` },
    { type: 'callout', tone: 'term', title: 'New word: Replication', html: `<strong>What it is:</strong> keeping a copy of the same data on several machines, and sending every new change to all the copies. Each copy is called a <strong>replica</strong>.<br><strong>Why we need it:</strong> if one machine falls, another one has all the data, and reading work can be split across machines.<br><strong>Without it:</strong> one broken disk means lost data, one machine restart means the site is down, and all reads hit one machine.<br><strong>Careful:</strong> this is not a partial, temporary copy like a cache. Every replica is a full database, on disk, holding all the data.` },
    { type: 'callout', tone: 'term', title: 'New word: Read and Write', html: `<strong>Write</strong> = changing data: adding a new post, changing a name, liking something (INSERT, UPDATE, DELETE in SQL). <strong>Read</strong> = only looking: opening the feed, viewing a profile (SELECT). In most apps, reads are 10 to 100 times more common than writes. This fact will matter again and again in this lesson.` },

    { type: 'h2', text: 'Leader-follower: the most common setup' },
    { type: 'p', html: `The simplest and most used way: make one machine the <strong>leader</strong>. All <strong>writes go only to the leader</strong>. The leader writes every change into a list (a log) and sends that list to the other machines (the <strong>followers</strong>). The followers make the same changes, in the same order, on their own copy. Reads can come from the leader or from the followers.` },
    { type: 'callout', tone: 'term', title: 'New word: Leader and Follower', html: `<strong>What it is:</strong> the <strong>leader</strong> is the one database that accepts writes. A <strong>follower</strong> is its copy. It only takes changes from the leader, writes them down, and answers reads. Think of a class monitor who writes on the board while the other students copy it into their notebooks.<br><strong>Why we need it:</strong> if every machine accepted writes, two people could change the same row in two different ways, and there would be a fight (a conflict). One writer means no fights.<br><strong>Without it:</strong> either one machine (a SPOF), or copies that drift apart from each other.<br><strong>Many names, one thing:</strong> Leader = primary (older docs say "master"). Follower = replica = secondary = standby (older docs say "slave"). PostgreSQL says "primary/standby", MySQL says "source/replica".` },
    { type: 'callout', tone: 'term', title: 'New word: Replication log (WAL, binlog)', html: `<strong>What it is:</strong> the database's diary, where every change is written in order: "row 42's name changed", "post 881 was inserted". A new line is always added at the bottom, and old lines never change (this is called <em>append-only</em>). PostgreSQL calls it the <strong>WAL</strong> (write-ahead log), MySQL calls it the <strong>binlog</strong>.<br><strong>Why we need it:</strong> the leader sends (streams) this diary to the followers. A follower plays it again (replays it) line by line, so its data becomes the same as the leader's, just a little later.<br><strong>Without it:</strong> the follower would not know what changed, or in which order.` },
    { type: 'ascii', text: `
                 writes (INSERT / UPDATE / DELETE)
App servers ───────────────────────────────> Leader
     │                                          │ log stream (WAL / binlog)
     │ reads                         ┌──────────┴──────────┐
     └──────────────> Replica 1 <────┘                     └────> Replica 2 <── reads` },
    { type: 'p', html: `Run it and watch. There are three scenarios: a normal write and read, a replica that fell behind (lag), and the fix for it.` },
    { type: 'flow', title: 'Leader + two replicas', height: 330,
      nodes: [
        { id: 'u', label: 'User', sub: 'Riya', x: 75, y: 165, w: 110, kind: 'client', info: 'What it is: a user of xyz.com called Riya. She writes posts, changes her profile, and reads pages.' },
        { id: 'app', label: 'App server', sub: 'router logic', x: 235, y: 165, w: 130, kind: 'server', info: 'What it is: the server that runs xyz.com\'s code. In this design it (or a DB proxy, a small router that sits in front of the database) decides: a write goes to the leader, a read goes to some replica. This routing logic is also where fixes for problems like read-your-own-writes live.' },
        { id: 'L', label: 'Leader DB', sub: 'all writes', x: 470, y: 60, w: 150, kind: 'data', meter: true, load: 45, info: 'What it is: the one database machine that accepts writes. It writes every change into its log (WAL/binlog) and sends it to the followers. It can also answer reads, but we want to keep it free for writes.' },
        { id: 'f1', label: 'Replica 1', sub: 'reads only', x: 470, y: 270, w: 150, kind: 'data', meter: true, load: 30, info: 'What it is: a full copy of the leader (a follower). It replays the leader\'s log. It does not accept writes (read-only). If it is busy or the network is slow, it falls behind the leader: this is called replication lag.' },
        { id: 'f2', label: 'Replica 2', sub: 'reads only', x: 645, y: 165, w: 130, kind: 'data', meter: true, load: 30, info: 'What it is: a second copy (a follower). More replicas means more read capacity. But every replica has to apply every write.' },
      ],
      edges: [{ a: 'u', b: 'app' }, { a: 'app', b: 'L' }, { a: 'app', b: 'f1' }, { a: 'app', b: 'f2' }, { a: 'L', b: 'f1' }, { a: 'L', b: 'f2' }],
      scenarios: [
        { name: 'Write + read (happy)', steps: [
          { title: 'Riya writes a post', text: 'It is a write, so the app server sends it straight to the <strong>leader</strong>. Replicas do not accept writes.', go: 'u>app>L', msg: 'INSERT INTO posts (id, user_id, text) VALUES (881, 42, "Hello xyz!")' },
          { title: 'Leader commits and says OK', text: 'The leader wrote it to its disk and log and said "saved" right away. The replicas know nothing yet. This is <strong>asynchronous</strong> replication (the default setup).', go: 'res:L>app>u', after: { L: { sub: 'post 881 ✓' } }, msg: '201 Created' },
          { title: 'The log goes to the replicas', text: 'In the background the leader streams its log to both replicas. They replay the change. Within a few milliseconds both of them have post 881 too.', parallel: true, go: ['evt:L>f1', 'evt:L>f2'], after: { f1: { sub: 'post 881 ✓' }, f2: { sub: 'post 881 ✓' } }, msg: 'WAL record: INSERT posts 881' },
          { title: 'Spread reads over the replicas', text: 'Now thousands of people are reading the feed. The app server spreads the reads over both replicas. The leader keeps room for writes. <strong>Reads have scaled.</strong>', flood: { paths: ['u>app>f1', 'u>app>f2'], n: 12 }, after: { f1: { load: 60 }, f2: { load: 60 }, L: { load: 35 } } },
          { title: 'What if the leader falls?', text: 'Now the data is on three machines. Even if the leader dies, a replica can be made the leader (failover, in the diagram below). Losing one machine\'s disk does not lose the data.', focus: ['f1', 'f2'] },
        ]},
        { name: 'Lag: old data', intro: 'A replica does not always keep up with the leader. See what can happen.', steps: [
          { title: 'Riya changes her name', text: 'The write went to the leader, was committed, and Riya got "saved".', go: ['u>app>L', 'res:L>app>u'], after: { L: { sub: 'name = Riya S' } }, msg: 'UPDATE users SET name = "Riya S" WHERE id = 42' },
          { title: 'Replica 2 has it, Replica 1 is behind', text: 'Replica 1 is busy with a heavy report query, and it is applying changes 3 seconds late. This is called <strong>replication lag</strong>.', go: 'evt:L>f2', after: { f2: { sub: 'Riya S ✓' }, f1: { state: 'warn', sub: '3 s behind' } } },
          { title: 'Riya refreshes', text: 'Her read went to Replica 1. It still has the old name! Riya thinks the save did not work. She edits again and complains to support...', go: ['u>app>f1', 'res:f1>app>u'], msg: 'SELECT name FROM users WHERE id = 42   →  "Riya"   (old!)' },
          { title: 'A little later, all is fine', text: 'Replica 1 caught up. Now every copy says "Riya S". This behaviour is called <strong>eventual consistency</strong>: not right now, but in the end all copies become the same.', go: 'evt:L>f1', after: { f1: { state: '', sub: 'Riya S ✓' } } },
        ]},
        { name: 'Fix: read-your-own-writes', intro: 'The roadmap\'s example: a user changed their profile, so for a few seconds send their own reads to the leader.', steps: [
          { title: 'Riya changes her name', text: 'The write goes to the leader. The app server remembers: "user 42 just wrote something" (the last write time, in the session or a cookie).', go: ['u>app>L', 'res:L>app>u'], after: { L: { sub: 'name = Riya S' }, app: { sub: '42: leader 10 s' }, f1: { state: 'warn', sub: '3 s behind' } }, msg: 'UPDATE users SET name = "Riya S" WHERE id = 42\nsession: last_write_at = now' },
          { title: 'Riya\'s refresh: from the leader', text: 'Her last write was less than 10 seconds ago, so the app server sends Riya\'s <em>own</em> read to the leader. The new name shows. Riya is happy.', go: ['u>app>L', 'res:L>app>u'], msg: 'read from LEADER (own write < 10 s ago)  →  "Riya S"' },
          { title: 'Other users: still from replicas', text: 'Aman is looking at Riya\'s profile. His read still goes to a replica. If he sees a name that is 3 seconds old, there is no harm: Aman does not even know it just changed. The leader only got a few extra reads.', go: ['u>app>f1', 'res:f1>app>u'], msg: 'other user → replica  →  "Riya" (3 s old, that is fine)' },
          { title: 'After 10 seconds: back to normal', text: 'The window is over, and Riya\'s reads go back to the replicas. By then the replicas have caught up. The window must be longer than the lag, or the fix only half works.', go: 'evt:L>f1', after: { app: { sub: 'router logic' }, f1: { state: '', sub: 'Riya S ✓' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'Synchronous, asynchronous, semi-sync' },
    { type: 'p', html: `The biggest question: <strong>when</strong> should the leader tell the user "saved"? As soon as it writes to its own disk, or after a replica confirms? This one decision changes both speed and data safety. There are three ways. First understand them one by one, then try them yourself below.` },
    { type: 'callout', tone: 'term', title: 'New word: Ack (acknowledgement)', html: `<strong>What it is:</strong> a short "got it" reply. The replica tells the leader "this change has reached me".<br><strong>Why we need it:</strong> so the leader knows the copy really exists, not just that it was sent.<br><strong>Without it:</strong> the leader just guesses that the replica has everything.<br>And a <strong>round trip</strong> = the total time for a message to go and for the reply to come back. About 1 ms inside the same building, about 200 ms from India to the US.` },
    { type: 'h3', text: '1. Asynchronous: "written, the rest comes later"' },
    { type: 'p', html: `<strong>How:</strong> the leader writes to its own disk and tells the user "saved" right away. The change goes to the replicas in the background. The leader does not wait for them.<br><strong>Worked example:</strong> xyz.com gets 2,000 writes per second. A replica is running 0.5 seconds behind. So at any moment about 2,000 × 0.5 = <strong>~1,000 writes</strong> have already shown "saved" but exist only on the leader. If the leader machine burns right now, those 1,000 writes are gone.<br><strong>Good:</strong> the fastest (a write takes about 2 ms). Writes keep working even if a replica is down.<br><strong>Bad:</strong> recent writes can be lost if the leader crashes. Reading from a replica can return old data.<br><strong>When:</strong> the default setup. Data like likes, views and feeds, where losing 1 or 2 seconds is acceptable. Replicas in far-away regions are always async.` },
    { type: 'h3', text: '2. Synchronous: "saved only when all copies exist"' },
    { type: 'p', html: `<strong>How:</strong> the leader writes, sends the change to the replica, and does not answer the user until the replica says "I have written it too".<br><strong>Worked example:</strong> the replica is in the same data center (round trip 2 ms). A write takes 2 ms (own disk) + 2 ms (round trip) + 1 ms (replica writing) = <strong>~5 ms</strong>. If the replica is on another continent (150 ms), every write takes about 153 ms. And if a required replica is down, writes <strong>stop</strong>.<br><strong>Good:</strong> even if the leader dies, no "saved" write is lost.<br><strong>Bad:</strong> every write is slower, and the slowest replica sets the speed for everyone. If one replica falls, the site cannot accept writes.<br><strong>When:</strong> money, wallets, orders, where losing even one write is not acceptable. And only when the replica is close by.` },
    { type: 'h3', text: '3. Semi-sync: "at least one copy is safe"' },
    { type: 'p', html: `<strong>How:</strong> the middle path. The leader says "saved" once <strong>at least one</strong> replica has sent its ack. The other replicas stay async.<br><strong>Worked example:</strong> 2 replicas, round trip 2 ms. A write takes about 4 ms (a bit less than sync, because the fastest replica's ack is enough). If one replica is down, it still works: the other one sends the ack. If both are down, MySQL waits 10 seconds and then quietly turns into async.<br><strong>Good:</strong> zero loss (if the replica that sent the ack is the one promoted), and one replica falling does not stop writes.<br><strong>Bad:</strong> one extra round trip on every write. After the fallback the safety is gone, so it needs an alert.<br><strong>When:</strong> most serious production databases: one semi-sync replica in a nearby zone, the rest async.` },
    { type: 'table', head: ['Mode', 'When the leader says "OK"', 'Speed', 'Data if the leader crashes'], rows: [
      ['Asynchronous', 'As soon as it writes to its own disk. Replicas copy later.', 'Fastest', 'Writes that had not yet reached the replicas are lost'],
      ['Synchronous', 'When the replica(s) have also written (or applied) it.', 'A network round trip on every write, waiting for the slowest replica', 'Nothing is lost, but a replica down = writes get stuck'],
      ['Semi-sync', 'When at least one replica has received the change.', 'One extra round trip', 'Nothing is lost, if that same replica is promoted'],
    ]},
    { type: 'callout', tone: 'term', title: 'Semi-sync in real databases', html: `<strong>What it is:</strong> the "at least one copy is safe" idea above, as real databases offer it.<br><strong>MySQL:</strong> its <strong>semisynchronous</strong> mode answers a commit only when at least one replica (1 or more, set by a setting) says "the change is in my log". The default wait point is <code>AFTER_SYNC</code>, where the user gets OK only after the copy has reached the replica. If no replica answers within 10 seconds (the default timeout), MySQL falls back to async so the site does not stop. PostgreSQL gives the same kind of control with <code>synchronous_standby_names</code>, for example <code>ANY 1 (s1, s2)</code>: "any one of the two must confirm".` },
    { type: 'p', html: `Try it yourself. Pick a mode, change how far away the replica is, and see how slow each write gets and how many writes are lost if the leader suddenly dies:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="rp-modes" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="row2" style="margin-top:12px">
          <div><label>Leader → replica round trip: <strong class="rp-rttv"></strong></label><input class="rp-rtt" type="range" min="1" max="150" step="1" value="2"></div>
          <div><label>Async lag (how far behind the replica is): <strong class="rp-lagv"></strong></label><input class="rp-lag" type="range" min="0" max="5000" step="50" value="500"></div>
        </div>
        <div class="row2" style="margin-top:8px">
          <div><label>Writes per second</label><input class="rp-wps" type="number" min="0" step="100" value="2000"></div>
          <div><label>Live replicas (out of 2)</label><div class="rp-alive" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px"></div></div>
        </div>
        <div class="rp-viz" style="margin-top:14px"></div>
        <div class="stats">
          <div class="stat"><span>Time for one write</span><strong class="rp-lat"></strong></div>
          <div class="stat"><span>Writes lost if the leader dies now</span><strong class="rp-loss"></strong></div>
          <div class="stat"><span>Is the site taking writes?</span><strong class="rp-up"></strong></div>
        </div>
        <div class="calc-note rp-note"></div>`;
      const MODES = { async: 'Asynchronous', semi: 'Semi-sync (1 ack)', sync: 'Synchronous (both replicas)' };
      let mode = 'async', alive = 2;
      const q = s => el.querySelector(s);
      const LOCAL = 2, APPLY = 1, TIMEOUT = 10000;
      const fmt = n => n.toLocaleString('en-IN');
      const chips = (box, map, get, set) => {
        box.innerHTML = '';
        Object.entries(map).forEach(([k, v]) => {
          const b = document.createElement('button'); b.type = 'button';
          b.className = 'chip' + (String(get()) === String(k) ? ' on' : ''); b.textContent = v;
          b.onclick = () => { set(k); upd(); }; box.appendChild(b);
        });
      };
      const upd = () => {
        chips(q('.rp-modes'), MODES, () => mode, k => mode = k);
        chips(q('.rp-alive'), { 2: '2', 1: '1', 0: '0' }, () => alive, k => alive = Number(k));
        const rtt = Number(q('.rp-rtt').value), lag = Number(q('.rp-lag').value);
        const wps = Math.max(0, Number(q('.rp-wps').value) || 0);
        q('.rp-rttv').textContent = rtt + ' ms' + (rtt <= 2 ? ' (same data center)' : rtt >= 60 ? ' (another region)' : '');
        q('.rp-lagv').textContent = lag + ' ms';
        let lat, loss, up, note;
        if (mode === 'async') {
          lat = LOCAL + ' ms';
          up = 'Yes';
          if (alive === 0) { loss = 'All new writes'; note = 'In async mode the leader does not wait for replicas, so writes keep working even when replicas die. But no copy is being made now: if the leader dies, every write since the replicas died is gone.'; }
          else { loss = '~' + fmt(Math.round(wps * lag / 1000)); note = `A write only waits for the leader's disk (~${LOCAL} ms). But the replica is ${lag} ms behind, so at that moment ~${fmt(Math.round(wps * lag / 1000))} writes that already showed "saved" are on no other machine. If the leader machine is gone, they are gone too.`; }
        } else if (mode === 'semi') {
          if (alive >= 1) { lat = (LOCAL + rtt) + ' ms'; loss = '0'; up = 'Yes'; note = `Every write waits one extra round trip (${rtt} ms), until one replica says "got it". If the leader dies, promote the replica that has everything: nothing is lost. ${alive === 1 ? 'One replica is down, but it still works because only 1 ack is needed.' : ''}`; }
          else { lat = fmt(LOCAL + TIMEOUT) + ' ms, then ' + LOCAL + ' ms'; loss = 'All new writes'; up = 'Yes (as async)'; note = 'No replica is sending an ack. MySQL waits until the timeout (10 s by default), then quietly becomes async. The site keeps running, but the safety is gone. So put an alert on this fallback.'; }
        } else {
          if (alive === 2) { lat = (LOCAL + rtt + APPLY) + ' ms'; loss = '0'; up = 'Yes'; note = `Every write waits until <strong>both</strong> replicas have applied it (${rtt} ms round trip + apply). Zero loss, but the slowest replica sets everyone's speed.`; }
          else { lat = 'Stuck'; loss = '0'; up = 'No!'; note = 'A required replica is down, so the leader keeps waiting for it on every commit. PostgreSQL does the same: if the sync standby is missing, commits wait. The data is safe, but the site cannot write. That is why people rarely make "all replicas sync"; "an ack from any one, or from a majority" is more common.'; }
        }
        q('.rp-lat').textContent = lat; q('.rp-loss').textContent = loss; q('.rp-up').textContent = up;
        // log positions: how far behind the leader each copy is (in writes)
        const behind = Math.round(wps * lag / 1000), TOP = 50000;
        const pos = mode === 'async' ? [behind, behind] : mode === 'semi' ? [0, behind] : [0, 0];
        const rows = [['Leader', TOP, false]].concat([0, 1].map(i => ['Replica ' + (i + 1), TOP - pos[i], i >= alive]));
        const win = Math.max(2 * behind, 100);
        const stuck = mode === 'sync' && alive < 2;
        q('.rp-viz').innerHTML = '<div style="font-size:13px;color:var(--ink-3);margin-bottom:6px">How far each copy has got in the log (window of the last ' + fmt(win) + ' writes):</div>' + rows.map(([name, at, down]) => {
          const pct = down ? 0 : Math.max(0, Math.min(100, 100 - (TOP - at) / win * 100));
          const tag = down ? 'DOWN' : name === 'Leader' ? '#' + fmt(at) + (stuck ? ' (commit stuck)' : '') : '#' + fmt(at) + (TOP - at ? ' (' + fmt(TOP - at) + ' behind)' : ' (level)');
          const col = down ? 'var(--red)' : name === 'Leader' ? 'var(--accent)' : TOP - at ? 'var(--amber)' : 'var(--green)';
          return '<div style="display:flex;align-items:center;gap:8px;margin:4px 0"><span style="width:76px;font-size:13px;color:var(--ink-2)">' + name + '</span><span style="flex:1;height:12px;border-radius:6px;background:var(--surface-2);border:1px solid var(--line);overflow:hidden"><span style="display:block;height:100%;width:' + pct + '%;background:' + col + '"></span></span><span style="min-width:120px;font:12px var(--f-mono);color:var(--ink-2)">' + tag + '</span></div>';
        }).join('');
        q('.rp-note').innerHTML = note;
      };
      ['.rp-rtt', '.rp-lag', '.rp-wps'].forEach(s => q(s).addEventListener('input', upd));
      upd();
    }},
    { type: 'callout', tone: 'tip', title: 'What runs in the real world', html: `Most setups keep one replica in the <strong>same region but a different availability zone</strong> as semi-sync or sync (round trip about 1-2 ms, so it is cheap), and replicas in far-away regions as async (a 100 ms wait on every write is not acceptable there). This gives zero loss on the nearby machine, and the far one is for disaster recovery.` },

    { type: 'h2', text: 'Understanding replication lag' },
    { type: 'p', html: `An async replica is always a little behind. On a normal day that is milliseconds. But the lag grows when: the leader gets a storm of writes, a long query on the replica eats its CPU, the network is slow, or a very big transaction (updating 10 million rows) is being replayed. Sometimes the lag goes from seconds to minutes. So we monitor the lag (<code>pg_stat_replication</code> in PostgreSQL, replica status in MySQL) and remove a replica that is far behind from read traffic.` },
    { type: 'callout', tone: 'term', title: 'New word: Replication lag', html: `<strong>What it is:</strong> how far a replica is behind the leader, in seconds (or in writes). A lag of 2 s = the replica has the data the leader had 2 seconds ago.<br><strong>Why it matters:</strong> if you read from an async replica, you will sometimes get old data. That is not a bug, it is the price of async.<br><strong>If you ignore it:</strong> users will see their own new post disappear, comments will come and go, and support tickets will arrive.` },
    { type: 'p', html: `Lag causes three classic problems. Interviews ask about them by name:` },
    { type: 'callout', tone: 'term', title: 'Problem 1: Read-your-own-writes broken', html: `<strong>What it is:</strong> a guarantee (a promise): <strong>what I wrote myself, I see right away</strong>. Others may see something slightly old, but I must see my own comment, my new name, my new photo.<br><strong>Why we need it:</strong> so the user trusts that their work was saved.<br><strong>Without it:</strong> the user thinks "it did not save" and submits again (duplicate posts!), or complains to support.<br><strong>Example:</strong> Riya changed her name to "Riya S", refreshed, the read went to a replica that was 3 s behind, and the old "Riya" showed up.` },
    { type: 'callout', tone: 'term', title: 'Problem 2: Monotonic reads broken', html: `<strong>What it is:</strong> a guarantee that <strong>time does not go backwards</strong>. Once you have seen new data, the next read must not show older data. (Monotonic = only moving forward.)<br><strong>Why we need it:</strong> otherwise things appear and disappear, like a ghost.<br><strong>Without it:</strong> the first refresh went to a fast replica (the new comment showed), the second to a slow replica (the comment is gone!). The user thinks the comment was deleted.` },
    { type: 'callout', tone: 'term', title: 'Problem 3: Consistent prefix broken', html: `<strong>What it is:</strong> a guarantee that <strong>things that happened in an order are seen in that order</strong>. The question first, the answer after.<br><strong>Why we need it:</strong> in chats and comments, the order is what gives meaning.<br><strong>Without it:</strong> Aman asked "meet tomorrow?", Riya replied "yes, at 5". If these two writes travel by different paths (like different shards, which come in the next lesson) with different lag, a third person may see the answer first and the question later.<br><strong>Fix:</strong> keep writes that depend on each other in one ordered log (for example, all messages of one chat always in one leader's log). A single database with one leader gives this for free, because there is only one log.` },
    { type: 'p', html: `Play with the timeline below. Riya changed her name at t = 0. There are two replicas, with different lag. Riya refreshes 6 times. Change the routing policy and see when she gets the old name:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="ry-pol" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="row2" style="margin-top:12px">
          <div><label>Replica A lag: <strong class="ry-av"></strong></label><input class="ry-a" type="range" min="0" max="5" step="0.5" value="1"></div>
          <div><label>Replica B lag: <strong class="ry-bv"></strong></label><input class="ry-b" type="range" min="0" max="5" step="0.5" value="4"></div>
        </div>
        <div class="ry-win-row" style="margin-top:8px"><label>Leader window (how long to read from the leader after a write): <strong class="ry-wv"></strong></label><input class="ry-w" type="range" min="0" max="6" step="0.5" value="3"></div>
        <div class="ry-out" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:8px;margin-top:14px"></div>
        <div class="stats">
          <div class="stat"><span>Own write not shown</span><strong class="ry-ryw"></strong></div>
          <div class="stat"><span>Time went backwards</span><strong class="ry-mono"></strong></div>
          <div class="stat"><span>Reads on the leader</span><strong class="ry-lead"></strong></div>
        </div>
        <div class="calc-note ry-note"></div>`;
      const POL = { random: 'Any replica', leader: 'Leader window', sticky: 'Sticky replica', lsn: 'Position check' };
      const NOTE = {
        random: 'Every read goes to a random replica. Reads that land on slow replica B show the old name, and a read on B after one on fast A makes the new name "disappear" (time goes backwards).',
        leader: 'The roadmap fix: for a few seconds after her own write, Riya reads from the leader. If the window is short and the lag is big, old data can show again after the window. Keep the window longer than the lag, and monitor the lag.',
        sticky: 'Riya always goes to replica B (from a hash of her user_id). Time never goes backwards (we get monotonic reads), but B is slow, so at first she does not see her own write. Sticky only gives monotonic reads, not read-your-writes.',
        lsn: 'The most precise fix: after the write, the leader reports its log position (PostgreSQL LSN / MySQL GTID). A read goes only to a replica that has reached that position; if none has, it goes to the leader. Always correct, and the least load on the leader. Cost: you have to track this position.',
      };
      let pol = 'random';
      const q = s => el.querySelector(s);
      const TIMES = [0.5, 1, 1.5, 2.5, 3.5, 5];
      const upd = () => {
        const box = q('.ry-pol'); box.innerHTML = '';
        Object.entries(POL).forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (k === pol ? ' on' : ''); b.textContent = v; b.onclick = () => { pol = k; upd(); }; box.appendChild(b); });
        const lagA = Number(q('.ry-a').value), lagB = Number(q('.ry-b').value), win = Number(q('.ry-w').value);
        q('.ry-av').textContent = lagA + ' s'; q('.ry-bv').textContent = lagB + ' s'; q('.ry-wv').textContent = win + ' s';
        q('.ry-win-row').style.display = pol === 'leader' ? '' : 'none';
        const out = simulate(pol, lagA, lagB, win);
        q('.ry-out').innerHTML = out.reads.map(r => {
          const col = r.fresh ? 'var(--green)' : 'var(--red)';
          return `<div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:8px;background:var(--surface-2)">
            <div style="font:12px var(--f-mono);color:var(--ink-3)">t = ${r.t} s</div>
            <div style="font-weight:700;color:var(--ink)">${r.from}</div>
            <div style="color:${col};font-weight:700">${r.fresh ? 'Riya S' : 'Riya'}</div>
            <div style="font-size:12px;color:var(--ink-3)">${r.flag || (r.fresh ? 'new' : '')}</div></div>`;
        }).join('');
        q('.ry-ryw').textContent = out.ryw; q('.ry-mono').textContent = out.mono; q('.ry-lead').textContent = out.leader + ' / 6';
        q('.ry-note').textContent = NOTE[pol];
      };
      function simulate(p, lagA, lagB, win) {
        let seed = 7;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        const lag = { 'Replica A': lagA, 'Replica B': lagB };
        let seenNew = false, ryw = 0, mono = 0, leader = 0;
        const reads = TIMES.map(t => {
          const pick = rnd() < 0.5 ? 'Replica A' : 'Replica B';
          let from;
          if (p === 'random') from = pick;
          else if (p === 'leader') from = t <= win ? 'Leader' : pick;
          else if (p === 'sticky') from = 'Replica B';
          else { const ok = ['Replica A', 'Replica B'].filter(r => t >= lag[r]); from = ok.length ? (ok.includes(pick) ? pick : ok[0]) : 'Leader'; }
          const fresh = from === 'Leader' || t >= lag[from];
          if (from === 'Leader') leader++;
          let flag = '';
          if (!fresh) { ryw++; flag = 'own write missing'; if (seenNew) { mono++; flag = 'time went back!'; } }
          if (fresh) seenNew = true;
          return { t, from, fresh, flag };
        });
        return { reads, ryw, mono, leader };
      }
      ['.ry-a', '.ry-b', '.ry-w'].forEach(s => q(s).addEventListener('input', upd));
      upd();
    }},
    { type: 'p', html: `All the fixes in one place:` },
    { type: 'table', head: ['Fix', 'How', 'What it gives', 'Cost'], rows: [
      ['Own reads from the leader, for a few seconds', 'After a write, note the time in the session; inside the window, send that user\'s reads to the leader', 'Read-your-own-writes (if window > lag)', 'A few extra reads on the leader'],
      ['Things only the user edits, from the leader', 'Your own profile and settings always from the leader; other people\'s profiles from replicas', 'Read-your-own-writes', 'Simple, but leader load can grow'],
      ['Log position check', 'Take the LSN/GTID on write; read only from a replica that has caught up that far', 'Read-your-own-writes, exact', 'Tracking the position, a bit complex'],
      ['Sticky replica per user', 'Always the same replica, from a hash of user_id', 'Monotonic reads', 'If that replica falls, the switch causes a jump again'],
      ['Related writes in one log', 'All messages of one chat in one leader\'s log', 'Consistent prefix', 'The partition key must be chosen carefully (sharding lesson)'],
      ['Monitor lag + remove a bad replica', 'If lag goes above 5 s, take that replica out of the read pool', 'Supports all the fixes', 'Load grows on the other replicas'],
    ]},

    { type: 'h2', text: 'Failover: the leader died, now what?' },
    { type: 'p', html: `Replicas are not only for reads. Their real job: if the leader falls, make one replica the <strong>new leader</strong>. This process is called <strong>failover</strong>, and turning a replica into the leader is called <strong>promotion</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: Failover and Promotion', html: `<strong>What it is:</strong> when the leader dies, make a follower the new leader (<strong>promotion</strong>), and tell everyone to send writes there now. The whole process = <strong>failover</strong>.<br><strong>Why we need it:</strong> without a leader, no write can happen. The sooner there is a new leader, the less downtime.<br><strong>Without it:</strong> when the leader dies, a person wakes up at 3 am and makes a replica the leader by hand: 30 to 60 minutes of downtime.<br><strong>Heartbeat</strong> = a small "are you alive?" message sent every second. If no answer comes, we suspect the machine has died.` },
    { type: 'callout', tone: 'tip', title: 'The 5 steps of failover', html: `<strong>1. Detect:</strong> a monitor (like Orchestrator for MySQL, Patroni for PostgreSQL, or a cloud managed service) sends the leader a heartbeat every second. A few missed heartbeats = "treat the leader as dead".<br><strong>2. Choose:</strong> the replica that is furthest ahead (has got furthest in the log) becomes the new leader.<br><strong>3. Promote:</strong> let it accept writes; the other replicas now copy from it.<br><strong>4. Redirect:</strong> tell the app servers the new address (update DNS, a virtual IP, or a DB proxy).<br><strong>5. Fence:</strong> if the old leader comes back, it must not think it is still the leader.` },
    { type: 'p', html: `Two hard questions: <strong>how long should we wait?</strong> A short timeout (2 s) means even a small network hiccup triggers a failover, which is risky in itself. A long one (60 s) means writes are stopped for that long. And <strong>with async, what about the writes that had not reached the replica?</strong> See below.` },
    { type: 'callout', tone: 'term', title: 'New word: Split brain', html: `<strong>What it is:</strong> at the same time, <strong>two</strong> machines think they are the leader and both accept writes. Like two monitors in one class, both writing different things on the board.<br><strong>When it happens:</strong> the leader did not die, only the network was cut. The rest of the world thought it died and made a new leader.<br><strong>The damage:</strong> two different "truths". One seat gets sold to two people, one wallet gets spent twice. Joining them later (merging) often has to be done by hand.` },
    { type: 'callout', tone: 'term', title: 'New word: Quorum, Fencing, Epoch, Lease', html: `<strong>Quorum (majority):</strong> accept a decision only when more than half of the nodes (node = one machine in the group) agree (2 out of 3, 3 out of 5). If the network is split into two pieces, a majority can exist in only one piece, so two leaders cannot be made.<br><strong>Epoch (or term):</strong> every new leader gets a growing number: the first leader is epoch 1, the next is epoch 2. The number shows which one is newer.<br><strong>Fencing:</strong> forcing the old leader to stop. For example, the storage or a proxy says "writes from epoch 1 are rejected, this is the time of epoch 2". Or cut its power or network (this trick has a funny name, STONITH: "shoot the other node in the head").<br><strong>Lease:</strong> the leader gets permission to be "leader for 10 seconds". If it cannot renew this with a majority, it stops accepting writes by itself.<br><strong>Why we need it:</strong> without these, a failover can create split brain. More depth in the "Coordination" and "Consensus" lessons.` },
    { type: 'flow', title: 'Failover and split brain', height: 330,
      nodes: [
        { id: 'app', label: 'App servers', sub: 'send writes', x: 100, y: 165, w: 140, kind: 'server', info: 'What it is: xyz.com\'s servers that send writes to the database. They only need to know who the leader is right now. They learn this through DNS, a virtual IP, or a DB proxy.' },
        { id: 'L', label: 'DB-1', sub: 'leader', x: 360, y: 60, w: 140, kind: 'data', info: 'What it is: the current leader database. It accepts the writes and sends its log to the replicas.' },
        { id: 'f1', label: 'DB-2', sub: 'replica', x: 360, y: 270, w: 140, kind: 'data', info: 'What it is: a follower copy. In this example it is ahead of DB-3, so it will be promoted in a failover.' },
        { id: 'f2', label: 'DB-3', sub: 'replica', x: 620, y: 270, w: 140, kind: 'data', info: 'What it is: a second follower copy. After the failover it starts copying from the new leader (DB-2).' },
        { id: 'mon', label: 'Failover manager', sub: 'heartbeats', x: 610, y: 60, w: 170, kind: 'net', info: 'What it is: a watchman program that asks the leader "are you alive?" every second (a heartbeat) and runs the failover if the leader dies (for example Orchestrator, Patroni, or the control plane of a managed cloud database). It is itself a group of 3 or 5 nodes that decides by majority, so that it does not become a SPOF itself.' },
      ],
      edges: [{ a: 'app', b: 'L' }, { a: 'app', b: 'f1' }, { a: 'L', b: 'f1' }, { a: 'L', b: 'f2' }, { a: 'f1', b: 'f2' }, { a: 'mon', b: 'L' }, { a: 'mon', b: 'f1' }, { a: 'mon', b: 'f2' }],
      scenarios: [
        { name: 'Leader crash (async)', steps: [
          { title: 'A normal day', text: 'The leader committed write #1042 and sent OK to the user. It is async: DB-2 is only at #1041, DB-3 at #1040.', go: ['app>L', 'res:L>app'], set: { f1: { sub: 'last: #1041' }, f2: { sub: 'last: #1040' } }, after: { L: { sub: 'last: #1042' } }, msg: 'UPDATE wallet SET coins = coins + 50 WHERE user_id = 42   -- #1042, "saved" ✓' },
          { title: 'Leader crash', text: 'The power supply failed. #1042 had not been sent to any replica yet.', set: { L: { state: 'down', sub: 'DOWN' } }, go: 'lost:L>f1' },
          { title: 'Heartbeats fail', text: 'The failover manager got no answer to 3 heartbeats. It decides the leader is dead.', go: 'lost:mon>L', after: { mon: { sub: 'DB-1 dead (3 miss)' } } },
          { title: 'Promote the replica furthest ahead', text: 'DB-2 (#1041) is ahead of DB-3 (#1040), so DB-2 becomes the new leader. DB-3 is told: copy from DB-2 now.', go: ['mon>f1', 'mon>f2', 'evt:f1>f2'], after: { f1: { state: 'ok', label: 'DB-2', sub: 'NEW leader' }, f2: { sub: 'follows DB-2' } } },
          { title: 'Writes go to the new leader', text: 'The app servers got the new address (DNS/proxy update). The site works again; the downtime was only detect + promote.', go: ['app>f1', 'res:f1>app'] },
          { title: 'But #1042 is gone', text: 'The user saw "50 coins added", but the new leader does not have that write at all. <strong>Async replication + failover = some committed writes can be lost.</strong> For something like a wallet that is not acceptable: you need semi-sync or sync.', focus: ['f1'], set: { f1: { state: 'warn', sub: 'no #1042!' } } },
        ]},
        { name: 'Semi-sync saves it', steps: [
          { title: 'The write reaches a replica first', text: 'Semi-sync: the leader sent #1042 to DB-2 and waited for its "got it". Only then did the user get OK.', go: ['app>L', 'evt:L>f1', 'res:f1>L', 'res:L>app'], after: { L: { sub: 'last: #1042' }, f1: { sub: 'last: #1042' }, f2: { sub: 'last: #1040' } }, msg: 'commit #1042 → wait for 1 replica ack → OK' },
          { title: 'Leader crash', text: 'The same crash.', set: { L: { state: 'down', sub: 'DOWN' } }, go: 'lost:mon>L', after: { mon: { sub: 'DB-1 dead' } } },
          { title: 'Promote DB-2: nothing lost', text: 'DB-2 has #1042. It was promoted, and DB-3 was made to catch up. Everything the user saw as "saved" is safe. The price: one extra round trip on every write.', go: ['mon>f1', 'evt:f1>f2', 'app>f1'], after: { f1: { state: 'ok', sub: 'NEW leader, #1042 ✓' }, f2: { sub: 'catching up' } } },
        ]},
        { name: 'Split brain', intro: 'The most dangerous failure: the leader did not die, it was only cut off.', steps: [
          { title: 'Network broke, leader alive', text: 'DB-1 is running, but because a piece of the network broke, the failover manager and the replicas cannot talk to it.', set: { L: { state: 'warn', sub: 'cut off, alive' } }, go: 'lost:mon>L' },
          { title: 'The manager promotes DB-2', text: 'As far as the manager can tell, DB-1 is dead. DB-2 is the new leader.', go: 'mon>f1', after: { f1: { state: 'ok', sub: 'NEW leader' } } },
          { title: 'Two leaders!', text: 'Some app servers are still connected to DB-1 and write there, the rest write to DB-2. Both think they are the leader. This is called <strong>split brain</strong>.', parallel: true, go: ['app>L', 'app>f1'], after: { L: { state: 'hot', sub: 'leader?!' }, f1: { state: 'hot', sub: 'leader?!' } }, msg: 'DB-1: seat 14A → Riya\nDB-2: seat 14A → Aman' },
          { title: 'Data on two paths', text: 'Now there are two different truths. One seat was sold to two people. Even when the network joins again, merging them automatically is often impossible: which one is right? It has to be reconciled by hand.', focus: ['L', 'f1'] },
          { title: 'Fix: fencing + quorum', text: 'Every promotion gets a growing number (an <strong>epoch / term</strong>). The new leader is epoch 2, the old one epoch 1. The storage or proxy rejects writes from epoch 1. Also, the old leader stops accepting writes by itself as soon as it loses contact with the majority (its lease ends). And the failover manager only decides with a majority (a quorum).', go: ['app>L', 'bad:L>app'], after: { L: { state: 'down', sub: 'fenced (epoch 1)' } }, msg: 'write rejected: epoch 1 < current epoch 2' },
        ]},
      ],
    },
    { type: 'h3', text: 'Split brain lab: cut the network, count the leaders' },
    { type: 'p', html: `Choose how many nodes the cluster has, where the network is cut, and which protections are on. The lab shows how many leaders were made, and what happened in 10 seconds (100 writes per second, half from the apps on each side). Look closely at: <strong>4 nodes, a 2-2 cut, quorum on</strong>. And <strong>5 nodes, a 3-2 cut, quorum off</strong>.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="sb-n" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div style="margin-top:10px"><label>Nodes left on the old leader's (DB-1) side: <strong class="sb-kv"></strong></label><input class="sb-k" type="range" min="1" max="4" step="1" value="1"></div>
        <div class="sb-t" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>
        <div class="sb-svg" style="margin-top:12px"></div>
        <div class="stats">
          <div class="stat"><span>How many leaders</span><strong class="sb-l"></strong></div>
          <div class="stat"><span>Writes taken by the old leader</span><strong class="sb-wx"></strong></div>
          <div class="stat"><span>Writes taken by the new leader</span><strong class="sb-wy"></strong></div>
        </div>
        <div class="calc-note sb-note"></div>`;
      const q = s => el.querySelector(s);
      let n = 5, quorum = false, fence = false;
      function sim(n, k, quorum, fence) {
        const maj = Math.floor(n / 2) + 1, X = k, Y = n - k;
        const newL = Y >= 1 && (!quorum || Y >= maj);
        let oldL = !quorum || X >= maj, fenced = false;
        if (oldL && newL && fence) { oldL = false; fenced = true; }
        return { maj, X, Y, oldL, newL, fenced, leaders: (oldL ? 1 : 0) + (newL ? 1 : 0), wx: oldL ? 500 : 0, wy: newL ? 500 : 0 };
      }
      const chip = (box, txt, on, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (on ? ' on' : ''); b.textContent = txt; b.onclick = fn; box.appendChild(b); };
      const upd = () => {
        const nb = q('.sb-n'); nb.innerHTML = '';
        [3, 4, 5].forEach(v => chip(nb, v + ' nodes', v === n, () => { n = v; upd(); }));
        const tb = q('.sb-t'); tb.innerHTML = '';
        chip(tb, 'Quorum rule: ' + (quorum ? 'ON' : 'OFF'), quorum, () => { quorum = !quorum; upd(); });
        chip(tb, 'Fencing (epoch): ' + (fence ? 'ON' : 'OFF'), fence, () => { fence = !fence; upd(); });
        const ki = q('.sb-k'); ki.max = n - 1; if (+ki.value > n - 1) ki.value = n - 1;
        const k = +ki.value; q('.sb-kv').textContent = k + ' (other side ' + (n - k) + ')';
        const r = sim(n, k, quorum, fence);
        const W = 420, gap = 50, cw = (W - 20 - gap) / n;
        let svg = `<svg viewBox="0 0 ${W} 130" width="100%" role="img" aria-label="Cluster partition" style="display:block;max-width:600px;margin:0 auto">`;
        const cx = i => i < k ? 10 + i * cw + cw / 2 : 10 + gap + i * cw + cw / 2;
        const lineX = 10 + k * cw + gap / 2;
        svg += `<line x1="${lineX}" y1="8" x2="${lineX}" y2="122" stroke="var(--red)" stroke-width="2" stroke-dasharray="6 5"/>`;
        svg += `<text x="${lineX}" y="126" font-size="11" text-anchor="middle" fill="var(--red)">network cut</text>`;
        for (let i = 0; i < n; i++) {
          const lead = (i === 0 && r.oldL) || (i === k && r.newL);
          const fencedHere = i === 0 && r.fenced;
          const fill = lead ? 'var(--accent-soft)' : 'var(--surface-2)', stroke = lead ? 'var(--accent)' : fencedHere ? 'var(--red)' : 'var(--line-2)';
          svg += `<circle cx="${cx(i)}" cy="58" r="24" fill="${fill}" stroke="${stroke}" stroke-width="${lead ? 3 : 1.5}"/>`;
          svg += `<text x="${cx(i)}" y="62" font-size="13" text-anchor="middle" fill="var(--ink)" font-weight="700">DB-${i + 1}</text>`;
          const tag = lead ? (i === 0 ? 'leader (e1)' : 'leader (e2)') : fencedHere ? 'fenced' : i === 0 ? 'step down' : '';
          if (tag) svg += `<text x="${cx(i)}" y="100" font-size="11" text-anchor="middle" fill="${lead ? 'var(--accent)' : 'var(--red)'}">${tag}</text>`;
        }
        svg += `</svg>`;
        q('.sb-svg').innerHTML = svg;
        q('.sb-l').textContent = r.leaders + (r.leaders === 2 ? ' (split brain!)' : r.leaders === 0 ? ' (writes stopped)' : '');
        q('.sb-wx').textContent = r.wx + (r.oldL ? '' : r.fenced ? ' (reject)' : ' (stopped)');
        q('.sb-wy').textContent = r.wy + (r.newL ? '' : ' (no leader)');
        let note;
        if (r.leaders === 2) note = `A leader on both sides! ${r.wx} writes on DB-1 and ${r.wy} on the new leader, separately. When the network joins again there will be two truths. Try turning on the quorum rule or fencing.`;
        else if (r.leaders === 0) note = `A majority of ${r.maj} is needed, but the two sides have only ${r.X} and ${r.Y}. No leader, writes stopped. The data is safe, but the site cannot write. That is why clusters use an odd number (3, 5): a 2-2 cut of 4 nodes stops everything.`;
        else if (r.fenced) note = `The new leader got epoch 2, and fencing rejected the writes of DB-1 (epoch 1). Only one truth is left. But notice: here ${r.Y === 1 ? 'the new leader is a single node, without a majority' : 'the leader can be made on the minority or the majority side'}. Fencing only works when the right epoch reaches the fence (storage, proxy). That is why real systems use both quorum and fencing.`;
        else if (r.oldL) note = `The majority (${r.maj}) is on the old leader's side, so DB-1 stays the leader and no new leader is made on the other side. The small piece just waits.`;
        else note = `The majority (${r.maj}) is on the other side. A new leader (epoch 2) was made there. DB-1 could not renew its lease, so it stopped accepting writes by itself. Only one leader.`;
        q('.sb-note').textContent = note;
      };
      q('.sb-k').addEventListener('input', upd);
      upd();
    }},
    { type: 'callout', tone: 'why', title: 'A real story: GitHub, October 2018', html: `According to GitHub's post-incident report (2018): the network between the East Coast hub and the primary data center broke for only <strong>43 seconds</strong>. In that time their failover tool, Orchestrator, made a West Coast database the primary, and apps started sending writes there. The old East Coast primary had a few seconds of writes that had not been replicated to the West, and now the West had new writes too. The data differed on both sides, so simply switching back was not safe. The result: <strong>24 hours 11 minutes</strong> of degraded service, restores from backups, and manual reconciliation of some writes. The lesson: failover should be automatic, but the rules for cross-region failover (when, and to where) need very careful thought.` },

    { type: 'h2', text: 'Multi-leader: when one leader is not enough' },
    { type: 'p', html: `Now xyz.com is popular in both India and the US. The leader is in Mumbai. Every write from a New York user travels 200 ms away to Mumbai, and if the Mumbai region falls, US writes stop too. The idea: <strong>one leader in each region</strong>. Each leader accepts writes from its own region and sends them to the other leaders async. This is called <strong>multi-leader</strong> (multi-primary, active-active) replication.` },
    { type: 'callout', tone: 'term', title: 'New word: Multi-leader (active-active)', html: `<strong>What it is:</strong> more than one leader. Each one accepts writes and sends its changes to the other leaders. "Active-active" = the data centers on both sides are working at the same time.<br><strong>Why we need it:</strong> far-away users write to a nearby leader (5 ms instead of 200 ms), and if a whole region falls, the other one keeps writing.<br><strong>Without it:</strong> a single leader: a long wait on every write for far-away users, and all writes stop if that region falls.<br><strong>Worked example:</strong> a New York user with a Mumbai leader: each write about 200 ms (round trip). With a leader in Virginia too: about 5 ms. But Mumbai and Virginia learn about each other's writes only 100-200 ms later, and conflicts are born in that gap.` },
    { type: 'ascii', text: `
 India users ──writes──> Leader (Mumbai) <════ async, both ways ════> Leader (Virginia) <──writes── US users
                              │                                              │
                         replicas (reads)                               replicas (reads)` },
    { type: 'p', html: `Where multi-leader shows up:` },
    { type: 'list', items: [
      `<strong>Multi-region apps:</strong> each region accepts its own users' writes nearby, and if one region falls the other keeps going.`,
      `<strong>Offline clients:</strong> a notes or calendar app on a phone. When offline, each device is a "leader" on its own: write there, sync when the internet comes back. This is also multi-leader, just with each device as a leader.`,
      `<strong>Collaborative editing:</strong> in apps like Google Docs, each user's browser accepts edits locally and they are merged later (details in the Google Docs lesson).`,
    ]},
    { type: 'p', html: `The price: <strong>conflicts</strong>. Riya changed her username from "riya" to "riya_s" in Mumbai, and in the same second her other device in the US changed it to "riya.dev". Both leaders accepted their write. When they sync, which one wins?` },
    { type: 'table', head: ['How to handle a conflict', 'How', 'Problem'], rows: [
      ['Do not let conflicts happen', 'Each user has a "home region": all their writes always go to that leader', 'The most practical. But if the user travels or the region falls, conflicts are possible again'],
      ['Last write wins (LWW)', 'The bigger timestamp wins; the other one is quietly deleted', 'Data is lost, and you cannot trust the clocks of different machines'],
      ['Merge / ask the app', 'Keep both versions, let the app or the user decide (like a Git merge conflict)', 'Extra code and UX'],
      ['CRDTs', 'Data types that, by maths, always merge to the same result (counters, sets, text)', 'Not for every kind of data; covered in the "Consistency" lesson'],
    ]},
    { type: 'callout', tone: 'term', title: 'New word: Last write wins (LWW) and clock skew', html: `<strong>What it is:</strong> LWW = every write gets a timestamp (a time stamp). In a conflict, the bigger timestamp wins, and the smaller one is quietly thrown away.<br><strong>Why people use it:</strong> very simple, no need to ask the user.<br><strong>Problem:</strong> every machine has its own clock, and clocks run a little ahead or behind. This difference is called <strong>clock skew</strong>. With a 500 ms skew, a write that really happened later can look "earlier", and the real last write gets thrown away.` },
    { type: 'p', html: `Try it. Riya set her username to "riya_s" in Mumbai (t = 0). From her US device it was set to "riya.dev", a little later or earlier. One-way travel between the two leaders takes 100 ms. Choose how to handle the conflict, and move the US server's clock ahead or behind:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="ml-s" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="row2" style="margin-top:12px">
          <div><label>When the US edit happened (real time): <strong class="ml-dv"></strong></label><input class="ml-d" type="range" min="-1000" max="1000" step="50" value="300"></div>
          <div><label>US server clock difference (skew): <strong class="ml-kv"></strong></label><input class="ml-k" type="range" min="-2000" max="2000" step="100" value="-500"></div>
        </div>
        <div class="ml-out" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:14px"></div>
        <div class="stats">
          <div class="stat"><span>Real last edit</span><strong class="ml-real"></strong></div>
          <div class="stat"><span>Final value on both leaders</span><strong class="ml-fin"></strong></div>
          <div class="stat"><span>Did the right one win?</span><strong class="ml-ok"></strong></div>
        </div>
        <div class="calc-note ml-note"></div>`;
      const q = s => el.querySelector(s);
      const S = { lww: 'Last write wins', home: 'Home region (Mumbai)', merge: 'Keep both (merge)' };
      const V = { MUM: 'riya_s', US: 'riya.dev' };
      let st = 'lww';
      const ONE = 100;
      function sim(d, skew, st) {
        const later = d > 0 ? 'US' : d < 0 ? 'MUM' : 'TIE';
        const concurrent = Math.abs(d) < ONE;
        const tsU = d + skew;
        let fin, right, lost = 0, extra = 0;
        if (st === 'lww') { fin = tsU > 0 ? 'US' : 'MUM'; lost = 1; right = later === 'TIE' || fin === later; }
        else if (st === 'home') { fin = d + ONE > 0 ? 'US' : 'MUM'; extra = 2 * ONE; right = later === 'TIE' || fin === later; }
        else { fin = concurrent ? 'BOTH' : later; right = true; }
        return { later, concurrent, tsU, fin, right, lost, extra };
      }
      const upd = () => {
        const sb = q('.ml-s'); sb.innerHTML = '';
        Object.entries(S).forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (k === st ? ' on' : ''); b.textContent = v; b.onclick = () => { st = k; upd(); }; sb.appendChild(b); });
        const d = +q('.ml-d').value, skew = +q('.ml-k').value;
        q('.ml-dv').textContent = (d > 0 ? '+' : '') + d + ' ms'; q('.ml-kv').textContent = (skew > 0 ? '+' : '') + skew + ' ms';
        const r = sim(d, skew, st);
        const card = (t, a, b) => `<div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:8px;background:var(--surface-2)"><div style="font:12px var(--f-mono);color:var(--ink-3)">${t}</div><div style="font-weight:700;color:var(--ink)">${a}</div><div style="font-size:12px;color:var(--ink-3)">${b}</div></div>`;
        q('.ml-out').innerHTML = card('Mumbai leader', '"riya_s"', 'real time 0 ms, timestamp 0 ms') + card(st === 'home' ? 'US device → Mumbai' : 'Virginia leader', '"riya.dev"', 'real time ' + d + ' ms, timestamp ' + r.tsU + ' ms');
        q('.ml-real').textContent = r.later === 'TIE' ? 'same moment' : '"' + V[r.later] + '"';
        q('.ml-fin').textContent = r.fin === 'BOTH' ? 'both, the app will ask' : '"' + V[r.fin] + '"';
        q('.ml-ok').textContent = r.fin === 'BOTH' ? 'the user decides' : r.right ? 'Yes' : 'No!';
        let note;
        if (st === 'lww') note = r.right ? `The bigger timestamp won, and it really was the last edit. But the losing edit was quietly thrown away (${r.lost} write lost). Now try making the skew ${d > 0 ? 'more negative' : 'positive'}.` : `Trouble! The real last edit was "${V[r.later]}", but because of the clock difference (${skew} ms) its timestamp became smaller and it was thrown away. Nobody even saw an error. So use LWW only where losing some writes is acceptable.`;
        else if (st === 'home') note = `Riya's home region is Mumbai, so the US device's write also goes to the Mumbai leader (+${r.extra} ms round trip). One leader decides the order: whatever arrived later wins. No clocks, no conflict. The price: Riya's writes from the US are slower, and if Mumbai falls, Riya's writes stop (until her home is changed).`;
        else note = r.concurrent ? `Both edits happened before either one reached the other side (gap ${Math.abs(d)} ms < ${ONE} ms travel). A real conflict! Both versions were kept, and the app will ask Riya "which name should we keep?" Nothing was lost, but it costs extra UX and code.` : `The gap is ${Math.abs(d)} ms, the travel is ${ONE} ms. The later edit had already seen the earlier one, so this is not a conflict, just a simple update: "${V[r.later]}" won. A real conflict happens only when the gap is under ${ONE} ms.`;
        q('.ml-note').textContent = note;
      };
      ['.ml-d', '.ml-k'].forEach(s => q(s).addEventListener('input', upd));
      upd();
    }},
    { type: 'callout', tone: 'mistake', title: 'Common beginner mistake', html: `Thinking "multi-leader will scale writes" is wrong. Every leader also has to apply <strong>every</strong> write of every other leader. The benefit of multi-leader is <strong>latency and surviving a region failure</strong>, not write capacity. To scale writes you need sharding (the next lesson).` },

    { type: 'h2', text: 'Leaderless (Dynamo-style): no boss' },
    { type: 'p', html: `The third way: no leader at all. The client (or a <strong>coordinator</strong>, which is the node that talks to the other replicas on the client's behalf) sends every write <strong>to several replicas at once</strong>, and also reads from several replicas. Amazon's 2007 Dynamo paper made this idea popular; Cassandra, ScyllaDB and Riak belong to this family.` },
    { type: 'callout', tone: 'term', title: 'New word: Quorum (N, W, R)', html: `<strong>What it is:</strong> a rule made of three numbers. <strong>N</strong> = how many copies of each piece of data. <strong>W</strong> = how many replica acks are needed before a write counts as "done". <strong>R</strong> = how many replicas to ask on a read.<br><strong>Why we need it:</strong> there is no leader to say who has the newest data. If <strong>R + W &gt; N</strong>, the replicas used for reading and the replicas used for writing share at least one replica, and that one has the new data.<br><strong>Without it:</strong> the write went to one replica, the read came from another: old data, and nobody noticed.<br>Replicas that fell behind are fixed by <strong>read repair</strong> (fixing an old copy at read time) and by a background process that compares copies (anti-entropy). Its hidden weaknesses are in the "Consistency models and quorums" lesson.` },
    { type: 'p', html: `Say each piece of data has <strong>N = 3</strong> copies. A write counts as a success when <strong>W = 2</strong> replicas say "written". On a read, ask <strong>R = 2</strong> replicas and take the newest version. Because R + W = 4 &gt; N = 3, the 2 read replicas and the 2 write replicas share at least one replica that has the new data. Even with one replica down, writes and reads keep working, and no failover is needed.` },
    { type: 'p', html: `Run it. Click a replica to turn it off or on. Change W and R. The lab always shows the <strong>worst case</strong>: the write reached only W replicas, and the read asks the old replicas first.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="qw-n" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="row2" style="margin-top:12px">
          <div><label>W (acks needed for a write): <strong class="qw-wv"></strong></label><input class="qw-w" type="range" min="1" max="5" step="1" value="2"></div>
          <div><label>R (how many to ask on a read): <strong class="qw-rv"></strong></label><input class="qw-r" type="range" min="1" max="5" step="1" value="2"></div>
        </div>
        <div class="qw-svg" style="margin-top:12px"></div>
        <div class="stats">
          <div class="stat"><span>Write (v2)</span><strong class="qw-wo"></strong></div>
          <div class="stat"><span>The read got</span><strong class="qw-ro"></strong></div>
          <div class="stat"><span>R + W &gt; N?</span><strong class="qw-ov"></strong></div>
        </div>
        <div class="calc-note qw-note"></div>`;
      const q = s => el.querySelector(s);
      let N = 3, down = [];
      function sim(N, W, R, down) {
        const alive = []; for (let i = 0; i < N; i++) if (!down.includes(i)) alive.push(i);
        const wOk = alive.length >= W;
        const got = wOk ? alive.slice(0, W) : [];            // worst case: write reached only W replicas
        const stale = alive.filter(i => !got.includes(i));
        const rOk = alive.length >= R;
        const asked = rOk ? stale.concat(got).slice(0, R) : []; // worst case: read asks stale ones first
        const fresh = asked.some(i => got.includes(i));
        return { alive: alive.length, wOk, got, rOk, asked, fresh, overlap: R + W > N };
      }
      const upd = () => {
        const nb = q('.qw-n'); nb.innerHTML = '';
        [3, 5].forEach(v => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (v === N ? ' on' : ''); b.textContent = 'N = ' + v; b.onclick = () => { N = v; down = []; q('.qw-w').max = N; q('.qw-r').max = N; if (+q('.qw-w').value > N) q('.qw-w').value = N; if (+q('.qw-r').value > N) q('.qw-r').value = N; upd(); }; nb.appendChild(b); });
        const W = +q('.qw-w').value, R = +q('.qw-r').value;
        q('.qw-wv').textContent = W; q('.qw-rv').textContent = R;
        const r = sim(N, W, R, down);
        const gap = 420 / N;
        let svg = `<svg viewBox="0 0 420 110" width="100%" role="img" aria-label="Replicas" style="display:block;max-width:560px;margin:0 auto">`;
        for (let i = 0; i < N; i++) {
          const x = gap * i + gap / 2, isDown = down.includes(i), has = r.got.includes(i), ask = r.asked.includes(i);
          const stroke = isDown ? 'var(--red)' : ask ? 'var(--accent)' : 'var(--line-2)';
          svg += `<g data-i="${i}" style="cursor:pointer"><circle cx="${x}" cy="46" r="28" fill="${isDown ? 'var(--surface)' : has ? 'var(--accent-soft)' : 'var(--surface-2)'}" stroke="${stroke}" stroke-width="${ask ? 3 : 1.5}" ${isDown ? 'stroke-dasharray="5 4"' : ''}/>`;
          svg += `<text x="${x}" y="42" font-size="12" text-anchor="middle" fill="var(--ink)" font-weight="700">R${i + 1}</text>`;
          svg += `<text x="${x}" y="58" font-size="11" text-anchor="middle" fill="${isDown ? 'var(--red)' : has ? 'var(--accent)' : 'var(--ink-3)'}">${isDown ? 'DOWN' : has ? 'v2 (new)' : 'v1'}</text>`;
          if (ask) svg += `<text x="${x}" y="96" font-size="11" text-anchor="middle" fill="var(--accent)">asked</text>`;
          svg += `</g>`;
        }
        q('.qw-svg').innerHTML = svg + '</svg>';
        q('.qw-svg').querySelectorAll('g[data-i]').forEach(g => g.addEventListener('click', () => { const i = +g.dataset.i; down = down.includes(i) ? down.filter(x => x !== i) : down.concat(i); upd(); }));
        q('.qw-wo').textContent = r.wOk ? 'OK (' + W + ' acks)' : 'FAIL (' + r.alive + ' alive < ' + W + ')';
        q('.qw-ro').textContent = !r.rOk ? 'FAIL' : !r.wOk ? 'v1 (the write never happened)' : r.fresh ? 'v2 (new)' : 'v1 (old!)';
        q('.qw-ov').textContent = (R + W) + (r.overlap ? ' > ' : ' ≤ ') + N + (r.overlap ? ' yes' : ' no');
        let note;
        if (!r.wOk) note = `Only ${r.alive} replicas are alive, but W = ${W}. The write fails: the client gets an error. Lower W or turn a replica back on.`;
        else if (!r.rOk) note = `The read needs ${R} replicas, only ${r.alive} are alive. The read fails.`;
        else if (r.fresh) note = `The read asked ${R} replicas, and at least one of them had v2. It looked at the version numbers and picked the new one. ${r.overlap ? 'R + W > N, so this will always happen.' : 'This time it was luck, not a guarantee.'} Replicas with the old copy are sent v2 through read repair.`;
        else note = `R + W = ${R + W}, N = ${N}. The read replicas and the write replicas share nothing: the read got only the old v1, and it did not even notice. This is fast (waiting for fewer replicas), but you can get old data.`;
        q('.qw-note').textContent = note;
      };
      ['.qw-w', '.qw-r'].forEach(s => q(s).addEventListener('input', upd));
      q('.qw-w').max = N; q('.qw-r').max = N;
      upd();
    }},
    { type: 'callout', tone: 'mistake', title: 'Fooled by the name', html: `Amazon <strong>DynamoDB</strong> sounds like Dynamo, but according to its 2022 USENIX paper, the replicas of each partition (a piece of the data, more in the next lesson), placed in different availability zones, form a group that elects a <strong>leader</strong> using Multi-Paxos (a majority-vote way to choose a leader, covered in the Consensus lesson). Only the leader handles writes and strongly consistent reads, and a write is acknowledged when a majority of replicas have written it to their log. So inside, DynamoDB is leader-based, not leaderless like the Dynamo paper.` },

    { type: 'h2', text: 'All three at a glance' },
    { type: 'table', head: ['', 'Leader-follower', 'Multi-leader', 'Leaderless'], rows: [
      ['Where writes go', 'Only one leader', 'The leader of each region/device', 'Several replicas, by quorum'],
      ['Conflicts', 'No (only one writer)', 'Yes, they must be resolved', 'Yes (versions, read repair)'],
      ['If a leader falls', 'Needs failover (seconds)', 'The other leaders keep going', 'Nothing, as long as a quorum is reachable'],
      ['Examples', 'PostgreSQL, MySQL, MongoDB replica set, Redis replicas', 'Multi-region active-active setups, offline-first apps', 'Cassandra, ScyllaDB, Riak, the Dynamo paper'],
      ['When', 'The default. For 90% of apps', 'Multi-region writes, offline clients', 'Very high write availability, multiple data centers'],
    ]},

    { type: 'h2', text: 'A replica is not a backup' },
    { type: 'callout', tone: 'mistake', title: 'The most costly mistake', html: `Someone ran <code>DELETE FROM users</code> by mistake. What will replication do? It will run that delete <strong>on all the replicas too, right away</strong>. Replication protects against hardware failure, not against human mistakes or bugs. For that you need separate <strong>backups</strong> (a daily snapshot + a log archive, so you can go back to any second; this is called point-in-time recovery).` },

    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Decide: when to replicate?', html: `Replicate when you need <strong>high availability</strong> or when <strong>read capacity</strong> is running out. Replication <strong>does not increase write capacity</strong>, because every copy still has to apply every write: 3 replicas = the same writes 3 times. If writes are the bottleneck, you need sharding.<br><br><strong>Example (from the roadmap):</strong> after a user updates their profile, send their own reads to the leader for a few seconds, so they never see the old version from a lagging replica.` },
    { type: 'table', head: ['Situation', 'Choice'], rows: [
      ['One DB, need to remove the SPOF', 'Leader + 1-2 replicas, one in a different availability zone, automatic failover'],
      ['Money, wallets, orders: losing even one write is not acceptable', 'A semi-sync/sync replica in a nearby zone'],
      ['Many reads, few writes (feeds, profiles)', 'Async read replicas + read-your-own-writes routing'],
      ['Users on many continents, writes must be close', 'Multi-leader, with a home region per user (fewer conflicts)'],
      ['Writes are the problem', 'Replication is not enough: sharding (the next lesson)'],
    ]},

    { type: 'h2', text: 'The whole picture' },
    { type: 'diagram', title: 'Replication: xyz.com\'s full setup', height: 600,
      groups: [
        { label: 'Users + app', x: 190, y: 6, w: 310, h: 310 },
        { label: 'Control', x: 510, y: 100, w: 180, h: 106 },
        { label: 'Data (copies)', x: 22, y: 346, w: 680, h: 236 },
      ],
      nodes: [
        { id: 'users', label: 'xyz.com users', sub: 'Riya, Aman...', x: 360, y: 60, kind: 'client', info: 'What it is: the people of xyz.com, who write posts (writes) and read the feed (reads). Reads are far more common than writes, so replicas help a lot.' },
        { id: 'lb', label: 'Load Balancer', x: 360, y: 160, kind: 'net', info: 'What it is: the part that spreads requests over many app servers (load balancer lesson). It has nothing to do with database replication directly; it just brings the request to the app.' },
        { id: 'app', label: 'App servers', sub: 'read/write router', x: 360, y: 270, w: 180, kind: 'server', info: 'What it is: xyz.com\'s code. It decides: a write goes to the leader, a read goes to a replica, and someone who just wrote gets their reads from the leader for a few seconds (read-your-own-writes).' },
        { id: 'mgr', label: 'Failover manager', sub: 'heartbeats', x: 600, y: 160, w: 160, kind: 'net', info: 'What it is: the watchman (like Patroni or Orchestrator), itself a group of 3-5 nodes that decides by majority. It sends heartbeats to the leader; if the leader dies, it promotes the standby and fences the old one.' },
        { id: 'leader', label: 'Leader DB', sub: 'all writes', x: 360, y: 400, w: 150, kind: 'data', info: 'What it is: the one database that accepts writes. It writes every change into the WAL/binlog and sends it to all the copies.' },
        { id: 'semi', label: 'Standby', sub: 'semi-sync, AZ-b', x: 600, y: 400, w: 160, kind: 'data', info: 'What it is: a copy in a nearby zone (a different building). The user gets "saved" only after its ack arrives. If the leader dies, this one is promoted: no saved write is lost.' },
        { id: 'rr1', label: 'Read replica 1', sub: 'async', x: 110, y: 400, w: 140, kind: 'data', info: 'What it is: an async copy that only answers reads. It may lag a little, so if it falls far behind, remove it from the read pool.' },
        { id: 'rr2', label: 'Read replica 2', sub: 'async', x: 110, y: 540, w: 140, kind: 'data', info: 'What it is: a second read copy. Each new replica = more read capacity, but the same write capacity (every copy applies every write).' },
        { id: 'bk', label: 'Backups', sub: 'snapshot + WAL', x: 360, y: 540, w: 140, kind: 'data', info: 'What it is: a daily snapshot and an archive of the log, on separate storage. If a DELETE runs by mistake, the replicas will delete too; this is what saves you (point-in-time recovery).' },
        { id: 'dr', label: 'DR replica', sub: 'Virginia, async', x: 600, y: 540, w: 160, kind: 'data', info: 'What it is: an async copy in a far-away region (DR = disaster recovery). If the whole Mumbai region falls, the site can run from here, with the risk of losing a few seconds of writes.' },
      ],
      edges: [
        { a: 'users', b: 'lb', n: 1 },
        { a: 'lb', b: 'app', n: 2 },
        { a: 'app', b: 'leader', n: 3, label: 'writes' },
        { a: 'leader', b: 'semi', label: 'sync ack' },
        { a: 'app', b: 'rr1' },
        { a: 'app', b: 'rr2' },
        { a: 'leader', b: 'rr1', kind: 'evt', dashed: true },
        { a: 'leader', b: 'rr2', kind: 'evt', dashed: true },
        { a: 'leader', b: 'bk', kind: 'evt', dashed: true, label: 'archive' },
        { a: 'leader', b: 'dr', kind: 'evt', dashed: true, label: 'async' },
        { a: 'mgr', b: 'leader', dashed: true },
        { a: 'mgr', b: 'semi', kind: 'bad', label: 'promote' },
      ],
      paths: [
        { name: 'Write', text: 'A post is written: the app sends it to the leader, the leader gets the standby\'s ack, then "saved".', go: ['users>lb>app>leader>semi'] },
        { name: 'Read', text: 'Reading the feed: the app spreads reads over the async replicas. The leader stays free for writes.', go: ['users>lb>app>rr1', 'app>rr2'] },
        { name: 'Your own new data', text: 'Riya just wrote something: for a few seconds her reads come from the leader, so she never sees the old version.', go: ['users>lb>app>leader'] },
        { name: 'Failover', text: 'The leader\'s heartbeats stopped: the manager promotes the standby and fences the old leader.', go: ['mgr>leader', 'mgr>semi'] },
        { name: 'Copies', text: 'The leader\'s log reaches every copy: read replicas, the backup archive and the far-away DR replica.', go: ['leader>rr1', 'leader>rr2', 'leader>bk', 'leader>dr'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Replication = copies of the same data on several machines. Benefit: availability (if one falls, another takes over) and read capacity. Write capacity does not grow.</li>
      <li>Leader-follower is the default: writes only on the leader, the log (WAL/binlog) goes to the followers. Multi-leader = writes close to users, but conflicts. Leaderless = an N, W, R quorum, no failover.</li>
      <li>Async is fast but recent writes can be lost in a crash. Sync loses nothing but is slow, and writes get stuck if a replica falls. Semi-sync is the middle path.</li>
      <li>Replication lag causes three problems: not seeing your own write, time going backwards, the order turning upside down. Fixes: your own reads from the leader / log position check / sticky replica / related writes in one log.</li>
      <li>Failover = detect, choose the replica furthest ahead, promote, redirect, fence.</li>
      <li>To avoid split brain: decide by majority (quorum), use an odd number of nodes, and use fencing (epoch, lease).</li>
      <li>In a conflict, LWW trusts the clocks and quietly throws data away. A home region is the most practical fix.</li>
      <li>A replica is not a backup: a DELETE by mistake runs on every copy.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['If the leader falls, a replica is promoted: no more SPOF', 'Reads can be spread over many machines', 'If one machine\'s disk dies, the data is safe', 'A copy near users (another region) makes reads fast'], costs: ['Async: replication lag, old data, and some writes can be lost in a failover', 'Sync/semi-sync: every write is slower, and a replica problem can stall writes', 'Failover is tricky: false alarms, split brain, the hassle of fencing', 'Multi-leader/leaderless: conflicts must be resolved', 'Write capacity does not grow, and every replica costs storage and a machine'] },

    { type: 'think', questions: [
      { q: 'On xyz.com, the likes counter and the user\'s wallet balance are in the same database. Async replication is running. Is that fine for both?', a: 'For likes, yes: if 2 or 3 likes are lost in a failover nobody cries, and a slightly old count from a replica is fine. For the wallet, no: money that already showed as "added" can disappear in a failover. Wallet writes need a semi-sync (or sync) replica, and the balance should be read from the leader. One system can need different guarantees for different data.' },
      { q: 'The failover timeout is set to 2 seconds. Every week a failover happens for no reason. Why, and what should we do?', a: 'A short timeout means a small network hiccup or a GC pause (the program stopping for a second or two to clean up memory) also looks like "the leader died". Every failover is risky in itself (losing async writes, a chance of split brain, broken connections). Make the timeout a bit longer (10-30 s), take health checks from several places (a majority vote), and keep fencing solid. It is a balance between speed and false alarms.' },
      { q: 'Should the failover manager have 4 nodes or 5? 4 is cheaper.', a: 'The majority of 4 is 3, and the majority of 5 is also 3. So 4 nodes survive only 1 failure (same as 3), and if the network is cut 2-2, no side has a majority: no leader. 5 nodes survive 2 failures. So use an odd number (3 or 5): an even number costs an extra machine and gives no benefit.' },
      { q: 'For read-your-own-writes we set "read from the leader for 10 seconds". One day a replica\'s lag became 30 seconds. What happens?', a: 'After the window, Riya\'s reads go back to the lagging replica, and she can see old data for up to 20 seconds. Fix: monitor the lag and remove replicas with high lag from the read pool, or use a log position (LSN/GTID) check instead of a window, which does not depend on the lag at all.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'xyz.com\'s writes tripled and the leader is at 95% CPU. What happens if we add 3 more replicas?', options: ['Writes become 3x faster', 'No help for writes; every replica also applies every write, and the leader still gets the same writes', 'The leader\'s load is cut in half'], answer: 1, explain: 'Replication is for reads and availability. Only the leader accepts writes. The answer to a write bottleneck is sharding.' },
      { q: 'With asynchronous replication, what can happen when the leader crashes?', options: ['Nothing, the replicas have everything', 'Writes that already showed "saved" to the user but had not reached a replica can be lost', 'All data is lost'], answer: 1, explain: 'In async mode the leader does not wait for the replica. The writes inside the lag window were only on the leader\'s disk.' },
      { q: 'Riya posted a comment, it showed on refresh, and disappeared on the next refresh. Which guarantee broke?', options: ['Monotonic reads', 'Durability', 'Quorum'], answer: 0, explain: 'The first read came from a fresh replica, the second from an old one: time went backwards. Fix: keep the user sticky to the same replica, or use a position check.' },
      { q: 'What is needed to avoid split brain?', options: ['More replicas', 'Choosing the leader by majority (quorum) and fencing the old leader (epoch/lease)', 'Async replication'], answer: 1, explain: 'A majority can exist in only one piece of the network, and fencing rejects the old leader\'s writes.' },
      { q: 'A leaderless cluster has N = 3, W = 1, R = 1. What happens?', options: ['You always get the newest data', 'Very fast, but a read can get old data because R + W = 2, which is not bigger than N', 'Writes will fail'], answer: 1, explain: 'R + W is not bigger than N, so the replica you read from and the replica you wrote to can be different. You get speed, not a freshness guarantee.' },
      { q: 'In multi-leader, what is the biggest danger of last write wins (LWW)?', options: ['It is very slow', 'Because of clock differences (clock skew), the real last edit can be quietly thrown away', 'It asks the user about conflicts'], answer: 1, explain: 'LWW runs on timestamps. If a clock is 500 ms behind, the later edit looks "older" and vanishes without any error.' },
      { q: 'Someone dropped a table by mistake. There are 3 replicas. How do we get the data back?', options: ['From a replica', 'From a backup + point-in-time recovery; the drop has already run on the replicas too', 'With a failover'], answer: 1, explain: 'Replication copies mistakes too. Backups are a separate thing.' },
    ]},
    { type: 'sources', note: 'Version-specific facts and the real incident come from these sources.', items: [
      { title: 'MySQL Reference Manual: Semisynchronous Replication', publisher: 'Oracle / MySQL docs', official: true, url: 'https://dev.mysql.com/doc/refman/8.4/en/replication-semisync.html', used: 'Semi-sync behaviour, the AFTER_SYNC default wait point, the 10 s default timeout and async fallback, wait_for_replica_count.' },
      { title: 'PostgreSQL docs: Log-Shipping Standby Servers (streaming + synchronous replication)', publisher: 'PostgreSQL Global Development Group', official: true, url: 'https://www.postgresql.org/docs/current/warm-standby.html', used: 'Async as the default and its data-loss window, synchronous_standby_names (FIRST/ANY), synchronous_commit levels, commits waiting when no sync standby is available.' },
      { title: 'October 21 post-incident analysis', publisher: 'GitHub Blog (2018)', official: true, url: 'https://github.blog/news-insights/company-news/oct21-post-incident-analysis/', used: 'The 43 second partition, the Orchestrator cross-region promotion, unreplicated writes, 24 h 11 min of degradation.' },
      { title: 'Amazon DynamoDB: A Scalable, Predictably Performant, and Fully Managed NoSQL Database Service', publisher: 'USENIX ATC 2022 (Amazon authors)', official: true, url: 'https://www.usenix.org/system/files/atc22-elhemali.pdf', used: 'Partition replication groups across AZs, the Multi-Paxos leader, quorum-acknowledged writes.' },
      { title: 'Dynamo: Amazon\'s Highly Available Key-value Store', publisher: 'SOSP 2007 (Amazon)', official: true, url: 'https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf', used: 'Leaderless replication, N/R/W quorums.' },
      { title: 'Designing Data-Intensive Applications, chapter 5 (Replication)', publisher: "Martin Kleppmann, O'Reilly (2017)", url: 'https://dataintensive.net/', used: 'The leader-follower, multi-leader and leaderless categories; read-your-writes, monotonic reads, consistent prefix reads; the danger of LWW and clock skew.' },
      { title: 'Cassandra documentation: Dynamo architecture', publisher: 'Apache Cassandra', official: true, url: 'https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html', used: 'Tunable consistency, the R + W > RF overlap.' },
    ]},
  ],
});
