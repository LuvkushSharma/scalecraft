Lesson.register({
  id: 'coordination',
  title: 'Leader election, locks, Redis Sentinel',
  minutes: 34,
  summary: `When many machines work together, three questions come up every day: who is alive, who is the leader, and who holds the lock. This lesson covers heartbeats, leader election, ZooKeeper/etcd, distributed locks + fencing tokens, gossip, Redis Sentinel, Redis Cluster, split brain and quorums, all in one story.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Imagine a class project with 20 students, and the teacher says "someone write it on the board". If everyone runs to write at once, the board is a mess. If nobody writes, the work is stuck.<br>Servers have the same problem. They must agree among themselves: who is alive, who is the boss (leader), and who may write right now (lock).<br>The hard part: the network sometimes breaks, and a server sometimes "falls asleep". This lesson teaches how everyone still reaches the same decision despite all that.` },
    { type: 'h2', text: 'Problem: 20 servers, no "boss"' },
    { type: 'p', html: `xyz.com has grown big. There are 20 app servers behind the Load Balancer, a Redis cache, and database replicas. Now a new feature arrives: <strong>every night at 2 am, send all users a "today's top videos" email</strong>. A developer wrote a cron job and deployed it.` },
    { type: 'p', html: `The next morning the support team is upset: every user got <strong>20 emails</strong>. Why? The cron job ran on every server. 20 servers, 20 times. Nobody knew that "only one server should do this job".` },
    { type: 'p', html: `This is the real difficulty of distributed systems. On one machine everything was easy. With many machines, three questions come up everywhere:` },
    { type: 'list', items: [
      '<strong>Who is alive?</strong> Server 7 is not answering. Is it dead, or just slow? (failure detection)',
      '<strong>Who is the leader?</strong> Some work should be done by only one machine. (leader election)',
      '<strong>Who holds the lock?</strong> Two machines should not change the same thing at the same time. (distributed locks)',
    ]},
    { type: 'p', html: `Together these three are called <strong>coordination</strong>. And they share one goal: <strong>high availability</strong>. If a machine falls, the system should notice by itself, recover by itself, and users should not even notice.` },
    { type: 'callout', tone: 'term', title: 'New word: Coordination', html: `<strong>What it is:</strong> many machines agreeing among themselves on who does what. Like "today's email will be sent only by Server 3".<br><strong>Why we need it:</strong> the same code runs on all 20 servers. Without coordination they all do the same job 20 times, or change the same data at once and break it.<br><strong>Without it:</strong> 20 emails, double payments, corrupt reports.` },
    { type: 'callout', tone: 'term', title: 'New word: High availability (HA)', html: `<strong>What it is:</strong> the system staying up as much of the time as possible, even when a machine falls.<br><strong>Why we need it:</strong> with 20 machines, something breaks every day. We cannot wait for a human every time.<br><strong>Without it:</strong> an outage on every crash, until an engineer wakes up and fixes it.` },

    { type: 'h2', text: 'Heartbeats and failure detection' },
    { type: 'callout', tone: 'term', title: 'New word: Heartbeat', html: `<strong>What it is:</strong> a small "I am alive" message that one machine sends to another every little while (like every 1 second). Like saying "yes, I am listening" every so often on a phone call.<br><strong>Why we need it:</strong> other machines learn that this machine is working right now.<br><strong>Without it:</strong> requests keep going to a dead machine, and nobody takes its place.<br><strong>Example:</strong> in the availability lesson, the standby Load Balancer did exactly this: when the active LB's heartbeat stopped, the standby took over.` },
    { type: 'callout', tone: 'term', title: 'New word: Failure detector and timeout', html: `<strong>What it is:</strong> the failure detector is the part that watches heartbeats and decides "this machine is dead". The simplest rule: a <strong>timeout</strong>, meaning "no heartbeat for this many seconds = consider it dead".<br><strong>Why we need it:</strong> failover happens based on this decision: a new leader, a new master.<br><strong>Without it:</strong> the system would never know that something broke.` },
    { type: 'p', html: `It sounds simple: "no heartbeat for 5 seconds = dead". But there is a deep problem: <strong>on a network it is impossible to tell "dead" from "very slow"</strong>. Why was the heartbeat late? It could be:` },
    { type: 'list', items: [
      'The machine really crashed.',
      'The machine is alive, but its program is stuck in a <strong>GC pause</strong>. (GC = garbage collection: languages like Java/Go clean up unused memory now and then, and during that the program can stop completely for a few milliseconds up to a few seconds.)',
      'A packet on the network arrived late or got lost.',
      'The machine is so busy that it got no time to send the heartbeat.',
    ]},
    { type: 'p', html: `So every failure detector picks a <strong>timeout</strong>, and that is a trade-off. A short timeout = catch crashes quickly, but wrongly call live machines "dead" (a <strong>false positive</strong>, meaning a false alarm). A long timeout = fewer mistakes, but a real crash is caught late. Try it yourself:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<label>Timeout: <strong class="co-hb-tv"></strong> (no heartbeat for this long = "dead")</label>
        <input class="co-hb-t" type="range" min="15" max="100" step="5" value="30">
        <div class="co-hb-strip" style="position:relative;height:34px;margin:12px 0 4px;background:var(--surface-2);border-radius:var(--r-sm);overflow:hidden"></div>
        <div style="display:flex;justify-content:space-between;font:12px var(--f-mono);color:var(--ink-3)"><span>0 min</span><span>5 min</span><span>10 min</span></div>
        <div class="stats">
          <div class="stat"><span>False alarms (in 10 min)</span><strong class="co-hb-fa"></strong></div>
          <div class="stat"><span>Time to catch a real crash</span><strong class="co-hb-det"></strong></div>
          <div class="stat"><span>Longest normal gap</span><strong class="co-hb-max"></strong></div>
        </div>
        <div class="calc-note co-hb-note"></div>`;
      // Heartbeat every 1 s for 10 minutes. Seeded: small network jitter, some late packets,
      // and occasional sender pauses (GC / busy) of 1-6 s where nothing is sent.
      let seed = 2024;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      const arr = [];
      let t = 0;
      while (t < 600) {
        arr.push(t + 0.02 + rnd() * 0.1 + (rnd() < 0.03 ? 0.3 + rnd() * 0.9 : 0));
        t += 1;
        if (rnd() < 0.015) t += 1 + rnd() * 5;
      }
      arr.sort((a, b) => a - b);
      const gaps = [];
      for (let i = 1; i < arr.length; i++) gaps.push({ at: arr[i - 1], g: arr[i] - arr[i - 1] });
      const maxGap = Math.max(...gaps.map(x => x.g));
      const s = el.querySelector('.co-hb-t');
      const upd = () => {
        const T = Number(s.value) / 10;
        const bad = gaps.filter(x => x.g > T);
        el.querySelector('.co-hb-tv').textContent = T.toFixed(1) + ' s';
        el.querySelector('.co-hb-fa').textContent = String(bad.length);
        el.querySelector('.co-hb-det').textContent = '~' + T.toFixed(1) + ' s';
        el.querySelector('.co-hb-max').textContent = maxGap.toFixed(1) + ' s';
        el.querySelector('.co-hb-strip').innerHTML = gaps.filter(x => x.g > 1.6).map(x => {
          const isBad = x.g > T;
          return `<div title="gap ${x.g.toFixed(1)} s" style="position:absolute;top:${isBad ? 3 : 11}px;bottom:${isBad ? 3 : 11}px;left:${(x.at / 600 * 100).toFixed(2)}%;width:${Math.max(0.5, x.g / 600 * 100).toFixed(2)}%;background:${isBad ? 'var(--red)' : 'var(--amber)'};border-radius:2px"></div>`;
        }).join('');
        el.querySelector('.co-hb-note').textContent = bad.length > 5
          ? 'Too many false alarms. Every alarm causes a failover: the leader changes, connections break, chaos for no reason. Red bar = a wrong "dead" decision.'
          : bad.length > 0
            ? 'Still a few false alarms. The machine was only stuck, not dead. Red bar = a wrong "dead" decision, yellow = a long gap that stayed within the timeout.'
            : 'Zero false alarms, but after a real crash the system will think "alive" for this long, and requests will be wasted. There is no perfect timeout.';
      };
      s.addEventListener('input', upd); upd();
    }},
    { type: 'p', html: `The simulator has 10 minutes of heartbeats, and sometimes the machine gets stuck for 1-6 seconds. A 1.5 s timeout gives 21 false alarms, 7 s gives zero, but then catching a real crash also takes ~7 s. That is why real systems tune the timeout by looking at the network and the workload.` },
    { type: 'callout', tone: 'term', title: 'New word: Phi accrual failure detector', html: `<strong>What it is:</strong> a smarter detector instead of a fixed timeout. It does not say "dead or alive". It gives a <strong>suspicion number</strong> (phi, φ): "how strange is this much silence, compared with this machine's <em>normal</em> pattern?" When the number goes above a threshold, then "dead".<br><strong>Why we need it:</strong> every machine and every network is different. One machine sends a heartbeat every 1 s, another (in a far data center) usually every 3 s. One fixed timeout would be wrong for both. Phi learns by itself what is "normal" for each.<br><strong>Without it:</strong> either daily false alarms for the far machine, or the near machine's crash is caught late.<br><strong>Where:</strong> Cassandra (setting <code>phi_convict_threshold</code>, default 8) and Akka. The idea comes from a 2004 paper by Hayashibara.` },
    { type: 'p', html: `<strong>Cassandra's simple formula:</strong> remember the <strong>average gap</strong> between past heartbeats. Then:` },
    { type: 'code', text: `φ = (time since the last heartbeat ÷ average gap) × 0.434      (0.434 = 1 / ln 10)

Example, threshold 8:
  Machine P: average gap 1 s.  "dead" when silence > 8 ÷ 0.434 × 1 s ≈ 18.4 s
  Machine Q: average gap 3 s.  "dead" when silence > 8 ÷ 0.434 × 3 s ≈ 55 s
Same threshold, but each machine has its own "how long is too long".` },
    { type: 'p', html: `What phi means: φ = 1 means "this much silence is normal 1 time in 10", φ = 2 = "1 in 100", φ = 8 = "1 in 10 crore". Raise the silence time with the slider and see how the suspicion grows for both machines:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Silence since the last heartbeat: <strong class="co-phi-tv"></strong></label><input class="co-phi-t" type="range" min="0" max="70" step="1" value="10"></div>
          <div><label>Threshold (phi_convict_threshold): <strong class="co-phi-hv"></strong></label><input class="co-phi-h" type="range" min="1" max="16" step="1" value="8"></div>
        </div>
        <div class="co-phi-rows" style="margin-top:12px;display:grid;gap:10px"></div>
        <div class="calc-note co-phi-note"></div>`;
      const M = [['Machine P (near, every ~1 s)', 1], ['Machine Q (far, every ~3 s)', 3]];
      const tE = el.querySelector('.co-phi-t'), hE = el.querySelector('.co-phi-h');
      const phi = (t, mean) => t / mean / Math.LN10;
      const upd = () => {
        const t = +tE.value, th = +hE.value;
        el.querySelector('.co-phi-tv').textContent = t + ' s';
        el.querySelector('.co-phi-hv').textContent = th;
        el.querySelector('.co-phi-rows').innerHTML = M.map(([name, mean]) => {
          const v = phi(t, mean), dead = v > th, w = Math.min(100, v / 16 * 100);
          return `<div><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;font-size:14px"><span>${name}</span><strong style="color:${dead ? 'var(--red)' : 'var(--green)'}">φ = ${v.toFixed(1)} · ${dead ? 'judged DEAD' : 'judged alive'}</strong></div>
            <div style="position:relative;height:14px;background:var(--surface-2);border-radius:var(--r-sm);margin-top:4px;overflow:hidden"><div style="height:100%;width:${w.toFixed(1)}%;background:${dead ? 'var(--red)' : 'var(--accent)'}"></div><div style="position:absolute;top:0;bottom:0;left:calc(${(th / 16 * 100).toFixed(1)}% - 1px);width:2px;background:var(--ink)"></div></div>
            <div style="font-size:13px;color:var(--ink-3);margin-top:2px">at this threshold, "dead" when silence > ${(th * Math.LN10 * mean).toFixed(1)} s</div></div>`;
        }).join('');
        el.querySelector('.co-phi-note').textContent = `The black line = threshold. At the same silence (${t} s), P's suspicion is 3 times Q's, because P usually speaks 3 times as often. Lower the threshold: you catch crashes sooner, but false alarms grow. Raise it: the opposite.`;
      };
      tE.addEventListener('input', upd); hE.addEventListener('input', upd); upd();
    }},

    { type: 'h2', text: 'Leader election: why only one boss?' },
    { type: 'p', html: `Back to the email bug. Fix: choose <strong>one leader</strong> out of the 20 servers. Only the leader runs the cron job.` },
    { type: 'callout', tone: 'term', title: 'New word: Leader election', html: `<strong>What it is:</strong> machines choosing one "boss" together, and choosing a new one if the boss falls. The other machines are called <strong>followers</strong>.<br><strong>Why we need it:</strong> some work must be done by only one machine, and everyone must know which one it is.<br><strong>Without it:</strong> either nobody does the work, or everyone does (20 emails).<br><strong>Example:</strong> below, with etcd, one of 3 workers becomes leader, and when it crashes there is a new one in ~10-15 s.` },
    { type: 'p', html: `A leader is useful when there is:` },
    { type: 'list', items: [
      '<strong>Work that must happen only once</strong>: daily email, billing run, cleanup job.',
      '<strong>A single writer</strong>: in database replication all writes go to one primary, so there is one order.',
      '<strong>Decisions in one place</strong>: which shard is on which server, which consumer reads which partition.',
    ]},
    { type: 'p', html: `The naive way: "the server with the smallest ID is the leader". Problem: if the network breaks into two parts, each part thinks the other part died, and <strong>both choose their own leader</strong>. Two leaders = emails twice, or two machines writing different data. This is called <strong>split brain</strong> (more detail below).` },
    { type: 'p', html: `The right way: a leader is the leader only when a <strong>majority</strong> (more than half) of the machines accept it. Two different majorities cannot exist (two groups of 3 out of 5 always share at least one machine), so there is only one leader at a time. This is called <strong>consensus</strong>: many machines agreeing firmly on one decision, even if some machines have fallen. <strong>Raft</strong> is a famous consensus algorithm. In it, each election has a number (the term), each machine gives only one vote per term, and the one with a majority of votes becomes leader. The full Raft story (log replication, terms) comes later in the "Consensus" lesson.` },
    { type: 'callout', tone: 'tip', html: `Practical point: do not write Raft yourself inside your app. Use a ready-made coordination service that runs Raft/consensus inside: <strong>etcd</strong> or <strong>ZooKeeper</strong>. Your app just asks it "can I become the leader?"` },

    { type: 'h2', text: 'ZooKeeper and etcd' },
    { type: 'callout', tone: 'term', title: 'New word: Coordination service (ZooKeeper, etcd)', html: `<strong>What it is:</strong> a small, very trustworthy key-value store (a diary of name → value), that runs on 3 or 5 machines and uses consensus inside (ZooKeeper\'s protocol is ZAB, etcd\'s is Raft). <strong>ZooKeeper</strong> is from Apache, <strong>etcd</strong> from the CNCF.<br><strong>Why we need it:</strong> small but <em>very important</em> facts like "who is the leader", "what is the config", "which server is alive" must be kept in a place that gives the right answer even when one machine falls.<br><strong>Without it:</strong> every app would have to write Raft itself, which is very hard and full of bugs.<br><strong>Careful:</strong> these are not for big data. Example: Kubernetes keeps its whole cluster state in etcd.` },
    { type: 'p', html: `Their three superpowers make leader election and locks easy. Three new words: <strong>lease</strong> = a "rental" with a TTL (expiry time), which the client keeps renewing; <strong>watch</strong> = a bell that says "tell me if anything changes on this key"; <strong>revision</strong> = a number that grows with every change.` },
    { type: 'table', head: ['Feature', 'In ZooKeeper', 'In etcd', 'What it is useful for'], rows: [
      ['Auto-delete when the client dies', '<strong>Ephemeral znode</strong>: when the session ends, the node is deleted', '<strong>Lease</strong>: has a TTL; the client keeps sending keepalives, and if it stops, the lease expires and its keys are deleted', 'If the leader dies, its "I am the leader" record disappears by itself'],
      ['News of changes', '<strong>Watch</strong>: a classic watch fires once (3.6+ also has persistent watches)', '<strong>Watch</strong>: a stream of changes on a key or prefix', 'Followers learn right away that the leader is gone'],
      ['A growing number', '<strong>Sequential znode</strong> (lock-0000000007), zxid / version', '<strong>Revision</strong>: a 64-bit cluster-wide counter that grows on every change', 'Who came first, and fencing tokens (below)'],
    ]},
    { type: 'p', html: `The leader election recipe in etcd: every worker tries to create the same key <code>/xyz/email-leader</code>, with the condition "create only if it does not exist yet", attaching its own lease. Whoever creates it first is the leader. The rest sit and watch that key. Run it:` },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'w1', label: 'Worker 1', sub: 'app server', x: 110, y: 60, kind: 'server', info: 'What it is: one xyz.com app server. It tries to create the leader key in etcd. If it becomes leader, it sends a lease keepalive every few seconds.' },
        { id: 'w2', label: 'Worker 2', sub: 'app server', x: 110, y: 170, kind: 'server', info: 'What it is: the second app server. If it does not become leader, it puts a watch on the leader key, so it hears the moment the key is deleted.' },
        { id: 'w3', label: 'Worker 3', sub: 'app server', x: 110, y: 280, kind: 'server', info: 'What it is: the third app server. Same: it becomes a follower and watches.' },
        { id: 'etcd', label: 'etcd cluster', sub: '3 nodes, Raft', x: 400, y: 170, w: 170, kind: 'data', info: 'What it is: a coordination service on 3 machines. Why: "who is the leader" must be written in one trustworthy place. Inside, the 3 machines use Raft to get majority agreement on every write, so it gives correct answers even if one machine falls. It tracks lease TTLs and sends events on watches.' },
        { id: 'mail', label: 'Email service', sub: 'nightly digest', x: 630, y: 60, w: 150, kind: 'queue', info: 'What it is: the service that sends the nightly digest email. Only the leader should call it, or users get duplicate emails.' },
      ],
      edges: [{ a: 'w1', b: 'etcd' }, { a: 'w2', b: 'etcd' }, { a: 'w3', b: 'etcd' }, { a: 'w1', b: 'mail' }, { a: 'w2', b: 'mail' }],
      scenarios: [
        { name: 'Election (happy path)', steps: [
          { title: 'All three want to be leader', text: 'All three workers tell etcd at the same time: "create the key <code>/xyz/email-leader</code> in my name, if it does not exist yet". Each has a lease with a 10 second TTL.', parallel: true, go: ['w1>etcd', 'w2>etcd', 'w3>etcd'], msg: 'TXN  if create_revision(/xyz/email-leader) == 0\n     then PUT /xyz/email-leader = "worker-1"  (lease 10s)' },
          { title: 'Only one wins', text: 'etcd puts all requests in one order. Worker 1\'s request came first, and the key was created. For the other two the condition fails: the key already exists.', parallel: true, go: ['res:etcd>w1', 'bad:etcd>w2', 'bad:etcd>w3'], after: { w1: { state: 'ok', sub: 'LEADER' }, w2: { sub: 'follower, watching' }, w3: { sub: 'follower, watching' } } },
          { title: 'The leader proves it is alive', text: 'The leader sends a lease keepalive every ~3 seconds. As long as keepalives arrive, the lease and the key stay alive.', go: 'evt:w1>etcd', msg: 'LeaseKeepAlive(lease=7a1f)  → TTL reset to 10s' },
          { title: 'Only the leader works', text: 'At 2 am only Worker 1 sends the digest. One email per user. Bug fixed.', go: 'w1>mail', msg: 'POST /send-digest  (once)' },
        ]},
        { name: 'Leader crash', steps: [
          { title: 'Worker 1 crashes', text: 'The leader\'s machine fell.', set: { w1: { state: 'down', sub: 'CRASHED' } }, focus: ['w1'] },
          { title: 'Keepalives stop', text: 'Now no keepalive arrives. etcd does not know if the machine is dead or slow; it just counts the TTL.', go: 'lost:w1>etcd', after: { etcd: { sub: 'lease TTL: 3..2..1' } } },
          { title: 'Lease expires, key deleted', text: 'After 10 seconds the lease expires. etcd deletes the leader key on its own, and sends an event to everyone watching.', parallel: true, go: ['evt:etcd>w2', 'evt:etcd>w3'], after: { etcd: { sub: 'key deleted' } }, msg: 'WATCH event: DELETE /xyz/email-leader' },
          { title: 'A new election', text: 'Both followers try to create the key again. Worker 2 won.', parallel: true, go: ['w2>etcd', 'w3>etcd'], after: { w2: { state: 'ok', sub: 'NEW LEADER' } } },
          { title: 'Work goes on', text: 'No human did anything. A new leader in ~10-15 seconds. This is automatic failover.', go: 'w2>mail' },
        ]},
        { name: 'Leader stuck (GC pause)', intro: 'The most dangerous case: the leader did not die, it just stopped for 15 seconds.', steps: [
          { title: 'Worker 1 stops', text: 'Worker 1 is the leader and was about to start sending the digest, when a long GC pause hit its program. It is alive, just frozen.', set: { w1: { state: 'warn', sub: 'leader, GC pause' } }, focus: ['w1'] },
          { title: 'The lease expires', text: 'No keepalive went out during the pause. After 10 seconds etcd ended the lease and told the followers.', go: ['lost:w1>etcd', 'evt:etcd>w2'], after: { etcd: { sub: 'key deleted' } } },
          { title: 'Worker 2 is the new leader', text: 'Worker 2 became leader and sent the digest.', go: ['w2>etcd', 'w2>mail'], after: { w2: { state: 'ok', sub: 'NEW LEADER' } } },
          { title: 'Worker 1 wakes up, with old thoughts', text: 'The pause ends. In Worker 1\'s mind it is still "I am the leader", because it noticed nothing during the pause. It sends the digest too. <strong>Two leaders, duplicate emails.</strong>', go: 'w1>mail', after: { mail: { state: 'hot', sub: 'DUPLICATE!' } } },
          { title: 'Lesson', text: 'A lease does not guarantee "only one leader", because the old leader does not find out it is no longer the leader. Fix: the thing being worked on should itself check that the request is from the current leader. The way to do this is a fencing token, the next section.', focus: ['w1', 'w2'] },
        ]},
      ],
    },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion', html: `"We use etcd/ZooKeeper, so now there is surely only one leader at a time." No. <em>Inside</em> the coordination service everything is consistent, but your app server can pause, and it will not know when its lease expired. So you need a check at work time too (fencing).` },

    { type: 'h2', text: 'Distributed locks and fencing tokens' },
    { type: 'p', html: `A new problem: on xyz.com, the creators' monthly earnings report is built in a shared file/row. If two workers write at the same time, the report breaks. We need a <strong>lock</strong>: only the one holding the lock writes.` },
    { type: 'callout', tone: 'term', title: 'New word: Distributed lock', html: `<strong>What it is:</strong> a "key" that only one machine can hold at a time. Whoever holds the key changes the shared thing. Inside one program the lock (mutex) lives in memory; a distributed lock works across different machines, so it is kept in a shared place: Redis, etcd or ZooKeeper.<br><strong>Why we need it:</strong> if two workers write the same report together, the report breaks.<br><strong>Without it:</strong> a race condition: both read, both write, and one's work disappears.<br><strong>Example:</strong> in Redis, <code>SET lock:report worker-A NX PX 30000</code> = "create the key only if it does not exist (NX), and delete it on its own after 30,000 ms (PX)".` },
    { type: 'p', html: `<strong>Why a TTL?</strong> If the one holding the lock crashes and the lock is never released, everyone waits forever. After the TTL the lock frees itself. But a TTL brings a new problem: what if the holder did not die, but just <strong>stopped for longer than the TTL</strong>? This is Martin Kleppmann's famous example. Run all three scenarios, especially the third:` },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'A', label: 'Worker A', x: 100, y: 60, w: 140, kind: 'server', info: 'What it is: the first worker (an app server). It takes the lock, then writes to the storage. It sends its fencing token with every write.' },
        { id: 'B', label: 'Worker B', x: 100, y: 270, w: 140, kind: 'server', info: 'What it is: the second worker. It waits for the lock to be free.' },
        { id: 'lock', label: 'Lock service', sub: 'etcd / ZooKeeper', x: 360, y: 165, w: 150, kind: 'data', info: 'What it is: the service that gives out the lock. It gives the lock with a TTL (lease). Every time it gives the lock, it also gives a growing number: the fencing token. In etcd this can be the key\'s revision, in ZooKeeper the zxid or znode version.' },
        { id: 'store', label: 'Storage', sub: 'earnings report', x: 620, y: 165, w: 150, kind: 'data', meter: false, info: 'What it is: the database/file where the real data is written. With fencing, it remembers the biggest token seen so far, and rejects writes with a smaller token.' },
      ],
      edges: [{ a: 'A', b: 'lock' }, { a: 'B', b: 'lock' }, { a: 'A', b: 'store' }, { a: 'B', b: 'store' }],
      scenarios: [
        { name: 'Happy path', steps: [
          { title: 'A takes the lock', text: 'Worker A asks for the lock. The lock is free, so A gets it, with a 30 s TTL. And token 33 with it.', go: ['A>lock', 'res:lock>A'], after: { A: { state: 'ok', sub: 'lock, token 33' }, lock: { sub: 'held by A (33)' } }, msg: 'acquire("report")  →  OK, token = 33, ttl = 30s' },
          { title: 'B must wait', text: 'Worker B asks too. The lock is busy, so B waits.', go: ['B>lock', 'bad:lock>B'], after: { B: { sub: 'waiting' } } },
          { title: 'A writes', text: 'A writes the report, with the token. The storage notes: the biggest token is now 33.', go: ['A>store', 'res:store>A'], after: { store: { sub: 'last token = 33' } }, msg: 'WRITE report  (token=33)  → OK' },
          { title: 'A releases the lock', text: 'Work done, A releases the lock. The release checks that the lock still belongs to A (so nobody else\'s lock is released by mistake).', go: 'A>lock', after: { A: { state: '', sub: 'done' }, lock: { sub: 'free' } } },
        ]},
        { name: 'GC pause, no fencing', intro: 'A lock with only a TTL; the storage checks nothing.', steps: [
          { title: 'A holds the lock', text: 'A took the lock (token 33, TTL 30 s).', go: ['A>lock', 'res:lock>A'], after: { A: { state: 'ok', sub: 'lock, token 33' }, lock: { sub: 'held by A' } } },
          { title: 'A gets stuck', text: 'Just before writing, A\'s process goes into a 40 second GC pause. It has no idea the clock is ticking.', set: { A: { state: 'warn', sub: 'GC pause 40s' } }, focus: ['A'] },
          { title: 'The lock expires', text: '30 s are up. For the lock service, A\'s lock is over.', focus: ['lock'], set: { lock: { state: 'warn', sub: 'TTL expired, free' } } },
          { title: 'B takes the lock and writes', text: 'B gets the lock (token 34). B writes the new, correct report.', go: ['B>lock', 'res:lock>B', 'B>store'], after: { lock: { state: '', sub: 'held by B' }, B: { state: 'ok', sub: 'lock, token 34' }, store: { sub: 'B\'s data' } } },
          { title: 'A wakes up and writes', text: 'A thinks it still has the lock. It writes its old data and overwrites B\'s work. <strong>The report is corrupt</strong>, and nobody even saw an error.', go: 'A>store', after: { A: { state: '', sub: 'thinks it has lock' }, store: { state: 'down', sub: 'CORRUPTED' } }, msg: 'WRITE report  (from A, stale)  → OK  (!!)' },
        ]},
        { name: 'GC pause + fencing token', intro: 'The same story, but the storage checks the token of every write.', steps: [
          { title: 'A holds the lock, token 33', text: 'Along with the lock came a growing number: 33.', go: ['A>lock', 'res:lock>A'], after: { A: { state: 'ok', sub: 'lock, token 33' }, lock: { sub: 'held by A (33)' } } },
          { title: 'A gets stuck, the lock expires', text: 'The same 40 s GC pause. After 30 s the lock is free.', set: { A: { state: 'warn', sub: 'GC pause 40s' }, lock: { state: 'warn', sub: 'TTL expired' } }, focus: ['A', 'lock'] },
          { title: 'B gets token 34', text: 'B took the lock. A new token is always bigger than the last: 34.', go: ['B>lock', 'res:lock>B'], after: { lock: { state: '', sub: 'held by B (34)' }, B: { state: 'ok', sub: 'lock, token 34' } } },
          { title: 'B writes with token 34', text: 'The storage checks the token: 34 > 33, accept. Now it remembers: the biggest is 34.', go: ['B>store', 'res:store>B'], after: { store: { state: 'ok', sub: 'last token = 34' } }, msg: 'WRITE report  (token=34)  → OK' },
          { title: 'A\'s old write is REJECTED', text: 'A wakes up and writes with token 33. The storage: "I have already seen 34, 33 is old." The write is rejected. The data is safe. A gets an error and understands its lock is gone.', go: ['A>store', 'bad:store>A'], after: { A: { state: 'down', sub: 'rejected: stale token' } }, msg: 'WRITE report  (token=33)  → REJECTED: token 33 < 34' },
        ]},
      ],
    },
    { type: 'callout', tone: 'term', title: 'New word: Fencing token', html: `<strong>What it is:</strong> an <strong>always-growing number</strong> that comes with the lock (33, then 34, then 35...). The client sends this number with every write. The storage remembers the biggest number it has seen and rejects writes with a smaller number.<br><strong>Why we need it:</strong> a TTL lock cannot stop the "old holder" who slept, woke up, and thinks the lock is still theirs.<br><strong>Without it:</strong> the "GC pause, no fencing" scenario above: the report is silently corrupted.<br><strong>Example:</strong> A has token 33, B has 34. The storage has seen 34, so A's write with 33 is rejected.` },
    { type: 'p', html: `Change the timing yourself. A gets the lock at 0 s (token 33) and is about to write at 2 s, but a pause hits in between. B is waiting for the lock, and writes within 1 s of getting it (token 34):` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Lock TTL: <strong class="co-f-tv"></strong></label><input class="co-f-t" type="range" min="5" max="60" step="5" value="30"></div>
          <div><label>A's GC pause: <strong class="co-f-pv"></strong></label><input class="co-f-p" type="range" min="0" max="60" step="2" value="40"></div>
        </div>
        <label style="display:flex;gap:8px;align-items:center;margin-top:10px"><input type="checkbox" class="co-f-fen" checked> The storage checks the fencing token</label>
        <div class="co-f-tl" style="margin-top:10px;font:14px/1.7 var(--f-mono)"></div>
        <div class="stats"><div class="stat"><span>State of the report</span><strong class="co-f-res"></strong></div></div>`;
      const tE = el.querySelector('.co-f-t'), pE = el.querySelector('.co-f-p'), fE = el.querySelector('.co-f-fen');
      const upd = () => {
        const ttl = +tE.value, pause = +pE.value, fen = fE.checked, aw = 2 + pause, lines = [];
        el.querySelector('.co-f-tv').textContent = ttl + ' s'; el.querySelector('.co-f-pv').textContent = pause + ' s';
        lines.push('0 s: A gets the lock, token 33');
        let res, col;
        if (aw < ttl) { lines.push(`${aw} s: A writes (token 33) → OK`, `${aw} s: A releases the lock, B gets the lock (token 34)`); res = 'Correct'; col = 'var(--green)'; }
        else {
          const bw = ttl + 1;
          lines.push(`${ttl} s: TTL is over, B gets the lock (token 34)`);
          const ev = [[bw, 'B writes (token 34) → OK'], [aw, null]].sort((x, y) => x[0] - y[0] || (x[1] ? -1 : 1));
          let maxTok = 33, last = '';
          ev.forEach(([t, txt]) => {
            if (txt) { lines.push(`${t} s: ${txt}`); maxTok = 34; last = 'B'; }
            else if (fen && maxTok > 33) lines.push(`${t} s: A wakes up and writes (token 33) → REJECTED, 33 < 34`);
            else { lines.push(`${t} s: A wakes up and writes (token 33) → OK`); last = 'A'; }
          });
          if (last === 'A') { res = 'CORRUPT (A\'s old data)'; col = 'var(--red)'; } else { res = fen && aw > bw ? 'Correct (fencing saved it)' : 'Correct (B\'s data is last)'; col = 'var(--green)'; }
        }
        el.querySelector('.co-f-tl').innerHTML = lines.map(x => '• ' + x).join('<br>');
        const r = el.querySelector('.co-f-res'); r.textContent = res; r.style.color = col;
      };
      [tE, pE].forEach(x => x.addEventListener('input', upd)); fE.addEventListener('change', upd); upd();
    }},
    { type: 'callout', tone: 'tip', title: 'Try this', html: `Default (TTL 30 s, pause 40 s, fencing on): A's write is rejected, the report is correct. Now untick the fencing checkbox: the report is <strong>CORRUPT</strong>. Then set the TTL to 60 s: the pause (40 s) is within the TTL, all correct. But set the pause to 60 s, and the problem is back. Lesson: a bigger TTL only pushes the problem away, it does not end it. Fencing is the real fix.` },
    { type: 'p', html: `Two important points:` },
    { type: 'list', items: [
      '<strong>Fencing needs the storage to help.</strong> If the storage cannot check the token at all (like some old external API), fencing will not work. Then you must find other ways, like conditional writes (a version check).',
      '<strong>Where does the token come from?</strong> ZooKeeper\'s zxid/znode version and etcd\'s revision grow naturally, so they work directly as tokens. A simple Redis <code>SET NX</code> lock does not give such a number; this is why there was a famous debate between Kleppmann and the creator of Redis about Redis\'s multi-node "Redlock" algorithm.',
    ]},
    { type: 'callout', tone: 'why', title: 'Efficiency lock vs correctness lock', html: `A useful difference from Kleppmann: if the lock is only for <strong>efficiency</strong> (two workers should not make the same thumbnail twice; a mistake just wastes a bit of work), a simple Redis lock is enough. If the lock is for <strong>correctness</strong> (money, inventory, data corruption), use a consensus service (etcd/ZooKeeper) + fencing tokens.` },

    { type: 'h2', text: 'Gossip: spreading news without a boss' },
    { type: 'p', html: `One problem with heartbeats: with 1,000 nodes, if every node sends a heartbeat to every other node, that is ~10 lakh messages every second. Keep one central "monitor", and it becomes a SPOF and a bottleneck. A third way: <strong>gossip</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: Gossip protocol', html: `<strong>What it is:</strong> each round (like every second), each node picks a few <strong>random</strong> nodes and swaps what it knows with them: "I know node 17 is alive (heartbeat no. 902), node 40 has said nothing for 3 rounds". Like a rumour spreading in school: everyone tells two or three people, and in just a few rounds the whole school knows.<br><strong>Why we need it:</strong> with 1,000 nodes, "everyone pings everyone" = ~10 lakh messages every second. With gossip, each node's work is small and fixed.<br><strong>Without it:</strong> either a storm of messages, or a central monitor that is itself a SPOF and a bottleneck.<br><strong>Example:</strong> in the simulator below, 1,000 nodes with fanout 1: everyone has the news in ~18 rounds.` },
    { type: 'p', html: `How many rounds does it take? Run it yourself. One node has new news (like "node 7 is down"). Each round, everyone who knows tells <em>fanout</em> random nodes:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><span style="font-size:14px;color:var(--ink-2)">Nodes:</span><span class="co-g-n" style="display:flex;flex-wrap:wrap;gap:6px"></span></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px"><span style="font-size:14px;color:var(--ink-2)">Fanout (how many to tell each round):</span><span class="co-g-k" style="display:flex;flex-wrap:wrap;gap:6px"></span></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px"><button type="button" class="btn small primary co-g-step">Next round</button><button type="button" class="btn small ghost co-g-all">Run to the end</button><button type="button" class="btn small ghost co-g-reset">Reset</button></div>
        <div class="co-g-grid" style="display:flex;flex-wrap:wrap;gap:2px;margin:14px 0;max-width:100%"></div>
        <div class="stats">
          <div class="stat"><span>Round</span><strong class="co-g-r"></strong></div>
          <div class="stat"><span>Who knows</span><strong class="co-g-c"></strong></div>
          <div class="stat"><span>Messages sent</span><strong class="co-g-m"></strong></div>
          <div class="stat"><span>log₂(N)</span><strong class="co-g-l"></strong></div>
        </div>
        <div class="calc-note co-g-note"></div>`;
      let N = 100, K = 1, seed, known, round, msgs, newly;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      const reset = () => { seed = 7; known = new Array(N).fill(-1); known[0] = 0; round = 0; msgs = 0; newly = [0]; draw(); };
      const step = () => {
        if (known.every(x => x >= 0)) return false;
        round++;
        newly = [];
        const informed = [];
        for (let i = 0; i < N; i++) if (known[i] >= 0 && known[i] < round) informed.push(i);
        informed.forEach(i => { for (let j = 0; j < K; j++) { let t; do { t = Math.floor(rnd() * N); } while (t === i); msgs++; if (known[t] < 0) { known[t] = round; newly.push(t); } } });
        return true;
      };
      const chips = (sel, vals, get, set) => {
        const box = el.querySelector(sel); box.innerHTML = '';
        vals.forEach(v => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (get() === v ? ' on' : ''); b.textContent = v; b.onclick = () => { set(v); reset(); }; box.appendChild(b); });
      };
      const draw = () => {
        chips('.co-g-n', [10, 50, 100, 500, 1000], () => N, v => N = v);
        chips('.co-g-k', [1, 2, 3], () => K, v => K = v);
        const sz = N <= 100 ? 14 : N <= 500 ? 8 : 6;
        el.querySelector('.co-g-grid').innerHTML = known.map(r => `<span style="width:${sz}px;height:${sz}px;border-radius:2px;background:${r < 0 ? 'var(--surface-2)' : r === round && round > 0 ? 'var(--amber)' : 'var(--accent)'};border:1px solid var(--line)"></span>`).join('');
        const c = known.filter(x => x >= 0).length;
        el.querySelector('.co-g-r').textContent = String(round);
        el.querySelector('.co-g-c').textContent = c + ' / ' + N;
        el.querySelector('.co-g-m').textContent = msgs.toLocaleString('en-IN');
        el.querySelector('.co-g-l').textContent = Math.log2(N).toFixed(1);
        el.querySelector('.co-g-note').textContent = c === N
          ? `Everyone knew after ${round} rounds, with ${msgs.toLocaleString('en-IN')} messages. Notice: at first the news doubles every round, and reaching the last few nodes takes the most rounds (in random picks, their turn comes late).`
          : 'Blue = knew already, yellow = learned this round, grey = does not know yet.';
      };
      el.querySelector('.co-g-step').onclick = () => { step(); draw(); };
      el.querySelector('.co-g-all').onclick = () => { let guard = 0; while (step() && guard++ < 200); draw(); };
      el.querySelector('.co-g-reset').onclick = reset;
      reset();
    }},
    { type: 'p', html: `With fanout 1, 100 nodes all know in ~12 rounds and 1,000 nodes in ~18 rounds. The nodes grew 10 times, but the rounds grew by only ~6. That is the power of gossip: the rounds grow roughly like <strong>log N</strong>, and each node's work per round stays small and fixed. With fanout 2, 100 nodes take ~8 rounds and 1,000 nodes ~11 rounds.` },
    { type: 'table', head: ['Where it is used', 'What they gossip about'], rows: [
      ['Cassandra', 'Every second, cluster membership and state with a few nodes. The phi accrual detector runs on the gaps between these gossip messages.'],
      ['Redis Cluster', 'Ping/pong messages on the "cluster bus": who is alive, which node owns which slots.'],
      ['Consul (Serf)', 'SWIM-style gossip: membership and failure detection. If a direct ping fails, it asks other nodes to "try too" (an indirect probe), so one bad network link does not cause a false "dead".'],
    ]},
    { type: 'callout', tone: 'mistake', html: `Gossip tells everyone <strong>eventually</strong>, not instantly, and different nodes may believe different things for a while. So gossip is great for things like "who is alive", but alone it is not enough for strict decisions like "who is the leader": there you need a majority vote / consensus.` },

    { type: 'h2', text: 'Redis replication' },
    { type: 'p', html: `Now let us apply these ideas to a real system: xyz.com's Redis (cache, sessions, rate-limit counters). There was just one Redis node. If it fell, we would get the scene from the caching lesson: all the load on the database. The first step: a <strong>replica</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: Replica and asynchronous replication', html: `<strong>What it is:</strong> a replica = a live copy of the master, on another machine. <strong>Asynchronous</strong> = the master first says "OK" to the client, and sends the copy to the replica <em>later</em> (a few milliseconds later).<br><strong>Why we need it:</strong> if the master falls, a fresh copy of the data is ready. Async, so that the client does not have to wait for the replica (fast).<br><strong>Without it:</strong> if the master's machine is gone, all the cache/session data is gone.<br><strong>The price:</strong> if the master dies after saying "OK" but before the copy arrives, that write is lost. See the count in the widget below.` },
    { type: 'list', items: [
      'The replica connects to the master, first takes a full snapshot, then receives every write command done on the master as a stream.',
      'This replication is <strong>asynchronous</strong>: the master says "OK" to the client first, and sends to the replica later. It is fast, but if the master dies right after saying "OK", that write may never reach the replica.',
      'A command like <code>WAIT 1 100</code> can make the client wait for acknowledgements from some replicas. This lowers the chance of losing data, but the Redis docs clearly say it does not make Redis strongly consistent.',
      'Reads can also go to replicas, but they may return slightly old data (replication lag).',
    ]},
    { type: 'p', html: `How many writes can be lost? The app writes once every 10 ms. Pick the replica <em>lag</em> (how far behind the copy is), and the master crashes at 1 second. Turn on <code>WAIT</code> and the client waits for the replica's "got it" on every write:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<label>Replication lag: <strong class="co-r-lv"></strong></label><input class="co-r-l" type="range" min="0" max="300" step="10" value="80">
        <label style="display:flex;gap:8px;align-items:center;margin-top:10px"><input type="checkbox" class="co-r-w"> After every write, <code>WAIT 1 500</code> (an ack from 1 replica, max 500 ms)</label>
        <div class="co-r-bar" style="display:flex;flex-wrap:wrap;gap:2px;margin-top:12px"></div>
        <div class="stats">
          <div class="stat"><span>Client got "OK"</span><strong class="co-r-ok"></strong></div>
          <div class="stat"><span>Got "OK", but still lost</span><strong class="co-r-lost"></strong></div>
          <div class="stat"><span>Extra wait per write</span><strong class="co-r-lat"></strong></div>
        </div>
        <div class="calc-note co-r-note"></div>`;
      const lE = el.querySelector('.co-r-l'), wE = el.querySelector('.co-r-w');
      const upd = () => {
        const lag = +lE.value, wait = wE.checked, crash = 1000;
        let ok = 0, lost = 0, html = '';
        for (let t = 0; t < crash; t += 10) {
          const replicated = t + lag < crash;
          const acked = wait ? replicated : true;
          if (acked) ok++;
          if (acked && !replicated) lost++;
          if (t >= 600) html += `<span title="write at ${t} ms" style="width:10px;height:14px;border-radius:2px;background:${!acked ? 'var(--surface-2)' : replicated ? 'var(--green)' : 'var(--red)'}"></span>`;
        }
        el.querySelector('.co-r-lv').textContent = lag + ' ms';
        el.querySelector('.co-r-bar').innerHTML = html;
        el.querySelector('.co-r-ok').textContent = ok + ' / 100';
        el.querySelector('.co-r-lost').textContent = String(lost);
        el.querySelector('.co-r-lat').textContent = wait ? '+' + lag + ' ms' : '0 ms';
        el.querySelector('.co-r-note').textContent = `The writes of the last 400 ms are shown. Green = reached the replica, red = the client got OK but it was lost in the crash, grey = the client never got OK (WAIT timeout/crash; the client will retry). Without WAIT: lag ÷ 10 ms writes (here ${Math.ceil(lag / 10)}) silently disappear. With WAIT, no write that got "OK" is lost, but every write is ${lag} ms slower. And even WAIT does not make Redis strongly consistent: during failover, Sentinel may pick a replica that did not get that write.`;
      };
      lE.addEventListener('input', upd); wE.addEventListener('change', upd); upd();
    }},
    { type: 'p', html: `There is a replica, but when the master falls, <em>who</em> will make the replica the master? Wake up an engineer at 3 am? This is where Sentinel comes in.` },

    { type: 'h2', text: 'Redis Sentinel: automatic failover' },
    { type: 'callout', tone: 'term', title: 'New word: Redis Sentinel', html: `<strong>What it is:</strong> a group of guard processes (default port 26379) that watch the Redis master and replicas, and make a replica the master on their own when the master falls.<br><strong>Why we need it:</strong> failover in seconds, even at 3 am, with no human.<br><strong>Without it:</strong> when the master falls, writes stop until an engineer wakes up and promotes the replica.<br><strong>Four jobs (Redis docs):</strong> <strong>monitoring</strong> (is everything running fine?), <strong>notification</strong> (tell us if something breaks), <strong>automatic failover</strong> (if the master falls, promote a replica) and <strong>configuration provider</strong> (clients ask Sentinel "who is the master right now?").` },
    { type: 'p', html: `Understand two words carefully, because this is exactly what interviews ask:` },
    { type: 'list', items: [
      '<strong>SDOWN</strong> (subjectively down): <em>one</em> Sentinel got no proper answer from the master for <code>down-after-milliseconds</code>. It is only its own opinion.',
      '<strong>ODOWN</strong> (objectively down): at least <strong>quorum</strong> Sentinels agree the master is down. <strong>Quorum</strong> = the "at least this many must agree" number written in the config, like 2.',
      'But to <em>start</em> a failover, one Sentinel must be elected leader, and that needs the vote of a <strong>majority of all Sentinels</strong>. So the quorum only "detects the failure"; the majority gives permission for the failover.',
      'That is why the docs say: at least <strong>3 Sentinels, on three separate machines</strong>. With 2 Sentinels, if one machine falls, no majority (2) is left.',
    ]},
    { type: 'flow', height: 320,
      nodes: [
        { id: 'app', label: 'App server', x: 90, y: 170, w: 120, kind: 'server', info: 'What it is: xyz.com\'s app server. It does not hard-code the Redis address: it asks Sentinel where "mymaster" is right now. Redis client libraries do this on their own.' },
        { id: 'master', label: 'Redis master', sub: '10.0.0.1:6379', x: 380, y: 80, w: 140, kind: 'cache', info: 'What it is: the main Redis node. All writes go here. Every write also goes async to the replica.' },
        { id: 'replica', label: 'Redis replica', sub: '10.0.0.2:6379', x: 380, y: 260, w: 140, kind: 'cache', info: 'What it is: a copy of the master. On failover, this one is promoted and becomes the new master.' },
        { id: 's1', label: 'Sentinel 1', x: 630, y: 60, w: 140, h: 50, kind: 'net', info: 'What it is: one Sentinel process (a guard). Every second it PINGs the master and the replica. It talks to the other Sentinels to agree on ODOWN and to elect a leader.' },
        { id: 's2', label: 'Sentinel 2', x: 630, y: 170, w: 140, h: 50, kind: 'net', info: 'What it is: the second Sentinel, on a separate machine. Clients can also ask it for the master\'s address.' },
        { id: 's3', label: 'Sentinel 3', x: 630, y: 280, w: 140, h: 50, kind: 'net', info: 'What it is: the third Sentinel. 2 of 3 = a majority, so a failover can still happen if one Sentinel falls.' },
      ],
      edges: [
        { a: 'app', b: 'master' }, { a: 'app', b: 'replica' }, { a: 'app', b: 's2' },
        { a: 'master', b: 'replica' },
        { a: 's1', b: 'master', dashed: true }, { a: 's2', b: 'master', dashed: true }, { a: 's3', b: 'master', dashed: true },
        { a: 's1', b: 'replica', dashed: true }, { a: 's2', b: 'replica', dashed: true }, { a: 's3', b: 'replica', dashed: true },
        { a: 's1', b: 's2', hidden: true, id: 'v12' }, { a: 's2', b: 's3', hidden: true, id: 'v23' },
      ],
      scenarios: [
        { name: 'A normal day', steps: [
          { title: 'Who is the master?', text: 'As soon as the app starts, it asks Sentinel for the master\'s address.', go: ['app>s2', 'res:s2>app'], msg: 'SENTINEL get-master-addr-by-name mymaster\n→ 10.0.0.1 6379' },
          { title: 'Write to the master', text: 'The app writes session data to the master. The master says OK right away.', go: ['app>master', 'res:master>app'], msg: 'SET session:riya ... → OK' },
          { title: 'Async replication', text: 'The master sends the same command to the replica, after the client\'s OK.', go: 'evt:master>replica' },
          { title: 'The Sentinels keep watch', text: 'All three Sentinels keep PINGing the master and getting answers.', parallel: true, go: ['evt:s1>master', 'evt:s2>master', 'evt:s3>master'] },
        ]},
        { name: 'Master crash: failover', steps: [
          { title: 'The master fell', text: 'The master\'s machine crashed.', set: { master: { state: 'down', sub: 'DOWN' } }, focus: ['master'] },
          { title: 'No PING answer: SDOWN', text: 'No answer for <code>down-after-milliseconds</code> (say 5 s). Each Sentinel, on its own, marks the master SDOWN.', parallel: true, go: ['lost:s1>master', 'lost:s2>master', 'lost:s3>master'], after: { s1: { sub: 'SDOWN' }, s2: { sub: 'SDOWN' }, s3: { sub: 'SDOWN' } } },
          { title: 'Quorum: ODOWN', text: 'The Sentinels ask each other. The quorum is 2 and 3 agree, so the master is ODOWN.', show: ['v12', 'v23'], parallel: true, go: ['evt:s1>s2', 'evt:s3>s2'], after: { s1: { sub: 'ODOWN' }, s2: { sub: 'ODOWN' }, s3: { sub: 'ODOWN' } } },
          { title: 'A failover leader by majority', text: 'One Sentinel (here Sentinel 1) asks for votes. 2+ votes out of 3 = a majority, so it becomes the failover leader.', go: ['s1>s2', 'res:s2>s1'], after: { s1: { state: 'ok', sub: 'failover leader' } } },
          { title: 'Promote the replica', text: 'The leader Sentinel makes the replica the master. Other replicas (if any) start replicating from the new master.', go: 's1>replica', after: { replica: { state: 'ok', label: 'NEW master', sub: '10.0.0.2:6379' } }, msg: 'REPLICAOF NO ONE' },
          { title: 'The app gets the new address', text: 'When its connection breaks, the app asks Sentinel again and moves to the new master. Downtime: detection + election, usually a few seconds.', go: ['app>s2', 'res:s2>app', 'app>replica'], msg: 'get-master-addr-by-name mymaster → 10.0.0.2 6379' },
        ]},
        { name: 'Partition: split brain', intro: 'The master did not die. The network just broke: master + app on one side, Sentinels + replica on the other.', steps: [
          { title: 'Network split', text: 'The Sentinels can no longer see the master. But the app can still reach it.', parallel: true, go: ['lost:s1>master', 'lost:s2>master', 'lost:s3>master'], set: { master: { state: 'warn', sub: 'isolated (alive!)' } } },
          { title: 'The Sentinels fail over', text: 'For the Sentinels, the master is ODOWN. They get a majority and promote the replica.', go: 's1>replica', after: { replica: { state: 'ok', label: 'NEW master' } } },
          { title: 'Two masters!', text: 'The app\'s connection to the old master never broke, so it keeps writing there. Now there are two masters: <strong>split brain</strong>.', go: ['app>master', 'res:master>app'], after: { master: { state: 'hot', sub: 'still taking writes' } }, msg: 'SET cart:riya ... → OK   (on the old master)' },
          { title: 'Network fixed: writes gone', text: 'When the partition heals, the old master is turned into a replica and copies the new master\'s data. All the writes it took in the meantime are <strong>gone forever</strong>.', go: 'evt:replica>master', after: { master: { state: 'down', label: 'Redis (old)', sub: 'writes discarded' } } },
          { title: 'Protection: min-replicas-to-write', text: 'Set <code>min-replicas-to-write 1</code> and <code>min-replicas-max-lag 10</code> on the master. If the master cannot talk to any replica for ~10 s, it stops taking writes. An isolated master "stops" quickly and loses less data. The price: if all replicas are down, the master will not take writes either.', focus: ['master'] },
        ]},
      ],
    },

    { type: 'h2', text: 'Redis Cluster: when the data does not fit in one node' },
    { type: 'p', html: `Sentinel gives <em>availability</em>, but all the data is still on one master. xyz.com's Redis data has grown to 300 GB, and one machine cannot handle that much RAM or that many writes. Then we need <strong>sharding</strong>: split the data over many masters. Redis's built-in way is <strong>Redis Cluster</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: Redis Cluster and hash slot', html: `<strong>What it is:</strong> a group of Redis masters that split the data among themselves. The way they split it: <strong>16,384 boxes (hash slots)</strong>. Each key goes into one box, and each master owns some boxes.<br><strong>Why we need it:</strong> 300 GB does not fit in one machine. 3 masters = ~100 GB each, and the writes are split three ways too.<br><strong>Without it:</strong> one machine's RAM and CPU are the hard limit.<br><strong>Example:</strong> key "foo" → slot 12182 → the master that owns slots 10923-16383. Add a new master and some slots move to it; the formula does not change.` },
    { type: 'list', items: [
      'The whole key space is split into <strong>16,384 hash slots</strong>. A key\'s slot: <code>CRC16(key) mod 16384</code>. Each master owns some slots.',
      'If two keys must be on the same slot (for multi-key commands), use a <strong>hash tag</strong>: in <code>user:{42}:profile</code> and <code>user:{42}:feed</code> only the "42" inside <code>{}</code> is hashed, so both land on the same slot.',
      'Each master has its own replicas. If a master falls, its replica is promoted by the vote of a <strong>majority of the other masters</strong>. The cluster does not need a separate Sentinel.',
      'Nodes gossip with each other on a separate "cluster bus" port (data port + 10000, like 16379): who is alive, who owns which slots.',
      'No proxy: the client talks to the right node itself. If it goes to the wrong node, it gets a redirect.',
    ]},
    { type: 'p', html: `Type a key and see which slot and which master it goes to. (This is the same CRC16 that Redis uses; the default split for 3 masters.)` },
    { type: 'custom', render(el) {
      el.innerHTML = `<label>Redis key</label>
        <input class="co-k-in" type="text" value="user:{42}:profile" style="width:100%;max-width:340px;font:15px var(--f-mono);padding:8px;border:1px solid var(--line-2);border-radius:var(--r-sm);background:var(--surface);color:var(--ink)">
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px" class="co-k-ex"></div>
        <div class="stats">
          <div class="stat"><span>Part that gets hashed</span><strong class="co-k-h"></strong></div>
          <div class="stat"><span>CRC16</span><strong class="co-k-c"></strong></div>
          <div class="stat"><span>Slot (mod 16384)</span><strong class="co-k-s"></strong></div>
          <div class="stat"><span>Master</span><strong class="co-k-m"></strong></div>
        </div>
        <div class="co-k-bar" style="position:relative;height:28px;border-radius:var(--r-sm);overflow:hidden;display:flex;margin-top:6px"></div>
        <div class="calc-note">Slots: Master A 0-5460, Master B 5461-10922, Master C 10923-16383. Check against the Redis docs examples: "foo" → 12182, "somekey" → 11058, "foo{hash_tag}" → 2515.</div>`;
      const crc16 = str => {
        const bytes = new TextEncoder().encode(str);
        let c = 0;
        for (const x of bytes) { c ^= x << 8; for (let i = 0; i < 8; i++) { c = (c & 0x8000) ? ((c << 1) ^ 0x1021) : (c << 1); c &= 0xffff; } }
        return c;
      };
      const tagOf = k => { const a = k.indexOf('{'); if (a < 0) return k; const b = k.indexOf('}', a + 1); if (b < 0 || b === a + 1) return k; return k.slice(a + 1, b); };
      const masters = [['Master A', 0, 5460, 'var(--accent)'], ['Master B', 5461, 10922, 'var(--violet)'], ['Master C', 10923, 16383, 'var(--amber)']];
      const inp = el.querySelector('.co-k-in');
      const ex = el.querySelector('.co-k-ex');
      ['user:{42}:profile', 'user:{42}:feed', 'user:42', 'foo', 'somekey', 'foo{hash_tag}', 'video:9001:views'].forEach(k => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = k; b.onclick = () => { inp.value = k; upd(); }; ex.appendChild(b);
      });
      const upd = () => {
        const key = inp.value;
        const h = tagOf(key), c = crc16(h), slot = c % 16384;
        const m = masters.find(x => slot >= x[1] && slot <= x[2]);
        el.querySelector('.co-k-h').textContent = h === key ? '(the whole key)' : '"' + h + '"';
        el.querySelector('.co-k-c').textContent = '0x' + c.toString(16).toUpperCase().padStart(4, '0');
        el.querySelector('.co-k-s').textContent = String(slot);
        el.querySelector('.co-k-m').textContent = m[0];
        el.querySelector('.co-k-bar').innerHTML = masters.map(x => `<div style="flex:${x[2] - x[1] + 1};background:${x[3]};opacity:${x === m ? 1 : 0.25}"></div>`).join('') +
          `<div style="position:absolute;top:0;bottom:0;width:3px;background:var(--ink);left:calc(${(slot / 16384 * 100).toFixed(2)}% - 1px)"></div>`;
      };
      inp.addEventListener('input', upd); upd();
    }},
    { type: 'h3', text: 'MOVED and ASK redirects' },
    { type: 'p', html: `Smart clients keep a map of "which slot is on which node". But the map can be out of date (a failover happened, or slots are moving from one node to another). Then the node sends a redirect:` },
    { type: 'compare',
      left: { title: 'MOVED (permanent)', html: `<code>-MOVED 3999 10.0.0.6:6381</code><br><br>"Slot 3999 now belongs to that node for good." The client sends the query there again and <strong>updates its slot map</strong>, so next time it goes straight to the right node.` },
      right: { title: 'ASK (temporary)', html: `<code>-ASK 3999 10.0.0.6:6381</code><br><br>"This slot is being migrated right now, and this key may be on the new node." The client sends <strong>only this one query</strong> there, first with the <code>ASKING</code> command, and <strong>does not update the map</strong>. When the migration is done, MOVED will come.` },
    },
    { type: 'callout', tone: 'warn', title: 'Redis Cluster can also lose writes', html: `Replication is async, so according to the Redis Cluster spec, acknowledged writes can be lost in some short time windows, especially on the minority side of a network partition. A failover happens when a majority of masters cannot see a master for longer than <code>NODE_TIMEOUT</code>. Use Redis for cache, sessions and counters; for data where losing even one write is not allowed, use the primary database.` },

    { type: 'h2', text: 'Split brain' },
    { type: 'callout', tone: 'term', title: 'New word: Split brain', html: `<strong>What it is:</strong> when two parts of a cluster cannot see each other, and <strong>both think they are the leader/master and take writes</strong>. One brain, split into two halves.<br><strong>Why it is dangerous:</strong> different data builds up on each side. When the network is fixed, you have to throw away one side's data, or do a hard merge.<br><strong>Without it (if we prevent it):</strong> the data always tells one single story.<br><strong>Example:</strong> the Sentinel "Partition" scenario above: the cart writes on the old master were lost forever.` },
    { type: 'p', html: `We saw it in three places above: the old leader after a GC pause, the isolated Redis master, and the naive "smallest ID" election. Ways to avoid it:` },
    { type: 'table', head: ['Way', 'How it protects'], rows: [
      ['Majority quorum', 'Only a part with more than half the nodes can choose a leader. Of two parts, only one can have a majority.'],
      ['Term / epoch number', 'Each new leader has a bigger number. Messages with an old number are ignored (Raft\'s term, Redis Cluster\'s configEpoch).'],
      ['Fencing tokens', 'The storage itself rejects writes from an old leader/lock holder.'],
      ['An isolated leader stops itself', 'Like <code>min-replicas-to-write</code>: if contact with the majority/replicas is lost, stop taking writes.'],
      ['STONITH', '"Shoot The Other Node In The Head": in classic HA setups, the new leader cuts the old one\'s power/network, so it cannot write anything.'],
    ]},

    { type: 'h2', text: 'Quorums: majority and odd numbers' },
    { type: 'callout', tone: 'term', title: 'New word: Quorum (majority)', html: `<strong>What it is:</strong> a decision is final only when more than half the machines (a majority) say yes. 3 out of 5.<br><strong>Why we need it:</strong> two different majorities can never exist (3 + 3 &gt; 5), so even when the network breaks, two leaders cannot be chosen.<br><strong>Without it:</strong> every piece would choose its own leader: split brain.<br><strong>Example:</strong> 5 nodes split into 2|3: only the side with 3 works, the side with 2 stops.` },
    { type: 'p', html: `Everything rests on one idea: <strong>majority</strong>. With N machines, majority = ⌊N/2⌋ + 1 (⌊ ⌋ = round down). The cluster works as long as a majority is alive and connected, so it can survive <strong>⌊(N-1)/2⌋ failures</strong>. Click nodes to kill them, and break the network with the partition slider:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><span style="font-size:14px;color:var(--ink-2)">Cluster size N:</span><span class="co-q-n" style="display:flex;flex-wrap:wrap;gap:6px"></span></div>
        <label style="margin-top:10px;display:block">Network partition: <strong class="co-q-pv"></strong> nodes on the left side</label>
        <input class="co-q-p" type="range" min="0" max="7" step="1" value="0">
        <div class="co-q-nodes" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:14px 0"></div>
        <div class="stats">
          <div class="stat"><span>Majority needed</span><strong class="co-q-maj"></strong></div>
          <div class="stat"><span>Failures it can survive</span><strong class="co-q-tol"></strong></div>
          <div class="stat"><span>Leader / writes</span><strong class="co-q-st"></strong></div>
        </div>
        <div class="calc-note co-q-note"></div>`;
      let N = 5, part = 0, dead = new Set();
      const p = el.querySelector('.co-q-p');
      const draw = () => {
        const nb = el.querySelector('.co-q-n'); nb.innerHTML = '';
        [3, 4, 5, 6, 7].forEach(v => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (v === N ? ' on' : ''); b.textContent = v; b.onclick = () => { N = v; dead = new Set(); part = Math.min(part, N); p.value = part; draw(); }; nb.appendChild(b); });
        p.max = N;
        el.querySelector('.co-q-pv').textContent = part === 0 ? '0 (no partition)' : part + ' | right: ' + (N - part);
        const box = el.querySelector('.co-q-nodes'); box.innerHTML = '';
        for (let i = 0; i < N; i++) {
          if (part > 0 && i === part) { const w = document.createElement('span'); w.style.cssText = 'width:4px;height:44px;background:var(--red);border-radius:2px'; w.title = 'network partition'; box.appendChild(w); }
          const d = document.createElement('button'); d.type = 'button';
          const isDead = dead.has(i);
          d.textContent = isDead ? 'X' : 'N' + (i + 1);
          d.setAttribute('aria-label', 'Node ' + (i + 1) + (isDead ? ' dead' : ' alive'));
          d.style.cssText = `width:44px;height:44px;border-radius:50%;border:2px solid ${isDead ? 'var(--red)' : 'var(--green)'};background:${isDead ? 'var(--surface-2)' : 'var(--surface)'};color:${isDead ? 'var(--red)' : 'var(--ink)'};font:600 13px var(--f-mono);cursor:pointer`;
          d.onclick = () => { if (dead.has(i)) dead.delete(i); else dead.add(i); draw(); };
          box.appendChild(d);
        }
        const maj = Math.floor(N / 2) + 1, tol = Math.floor((N - 1) / 2);
        const groups = part > 0 ? [[0, part], [part, N]] : [[0, N]];
        const alive = groups.map(([a, b]) => { let c = 0; for (let i = a; i < b; i++) if (!dead.has(i)) c++; return c; });
        const winner = alive.findIndex(c => c >= maj);
        el.querySelector('.co-q-maj').textContent = maj + ' of ' + N;
        el.querySelector('.co-q-tol').textContent = String(tol);
        el.querySelector('.co-q-st').textContent = winner < 0 ? 'STOPPED' : (part > 0 ? (winner === 0 ? 'left side' : 'right side') : 'running');
        el.querySelector('.co-q-st').style.color = winner < 0 ? 'var(--red)' : 'var(--green)';
        let note;
        if (winner < 0 && part > 0 && dead.size === 0) note = `Neither side has ${maj}. Both sides stopped: this is safe (no split brain), but the cluster is unavailable. An equal split with an even N (like 2|2, 3|3) does exactly this.`;
        else if (winner < 0) note = `Only ${Math.max(...alive)} connected live nodes, and a majority needs ${maj}. The cluster stops taking writes, so no wrong decision is made.`;
        else if (part > 0) note = `Only one side (${alive[winner]} nodes) has a majority, and only it will choose a leader. The other side stops. Two majorities can never exist, so there is no split brain.`;
        else note = `${alive[0]} nodes alive, majority ${maj}. Fine. ${N % 2 === 0 ? `Notice: ${N} nodes also survive only ${tol} failure(s), the same as ${N - 1} nodes. The extra node costs money and gives nothing.` : ''}`;
        el.querySelector('.co-q-note').textContent = note;
      };
      p.addEventListener('input', () => { part = Number(p.value); if (part >= N) { part = 0; p.value = 0; } draw(); });
      draw();
    }},
    { type: 'table', head: ['N (nodes)', 'Majority', 'How many can fall', 'Comment'], rows: [
      ['1', '1', '0', 'No fault tolerance'],
      ['2', '2', '0', 'Worse than 1: two machines, both needed'],
      ['3', '2', '1', 'The most common minimum'],
      ['4', '3', '1', 'Only as tolerant as 3, one extra machine wasted'],
      ['5', '3', '2', 'The usual size for production etcd/ZooKeeper'],
      ['7', '4', '3', 'More nodes = more votes on every write = a bit slower'],
    ]},
    { type: 'callout', tone: 'why', title: 'Why odd numbers?', html: `Two reasons: (1) N=4 survives as many failures as N=3, so the money for the 4th node is wasted. (2) An equal split of an even N (2|2) leaves both halves without a majority, and the whole cluster stops. With an odd N, a split always gives one side a majority.` },
    { type: 'callout', tone: 'mistake', html: `"More nodes = better." Not in coordination clusters. Every write needs answers from a majority, so 7 or 9 nodes make writes slower. That is why etcd/ZooKeeper usually run on 3 or 5 nodes. To handle more reads/traffic, growing these clusters is not the way.` },

    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>One Redis node + replicas, and you want automatic failover?</strong> Redis Sentinel.<br><strong>Data or traffic too big for one Redis node?</strong> Redis Cluster, which does both sharding and failover.<br><strong>Need a trustworthy leader or config store?</strong> etcd or ZooKeeper, which are built on consensus.` },
    { type: 'table', head: ['Need', 'Choose', 'Why'], rows: [
      ['Cache/sessions, data fits on one machine', 'Redis + replica + 3 Sentinels', 'Simple, automatic failover'],
      ['Redis data is 100s of GB, or very many writes', 'Redis Cluster', '16,384 slots over many masters; replicas for each master'],
      ['Only one worker should run a cron/job', 'etcd/ZooKeeper leader election (lease)', 'Automatic new leader when the lease expires'],
      ['Stop duplicate work (efficiency)', 'Simple Redis lock (SET NX PX)', 'A mistake only costs a bit of extra work'],
      ['Stop data corruption (correctness)', 'etcd/ZooKeeper lock + fencing token', 'The storage rejects writes from an old holder'],
      ['Membership / who is alive in a big fleet', 'Gossip (SWIM / Cassandra-style)', 'No central SPOF, log N rounds'],
    ]},

    { type: 'h2', text: 'The whole picture' },
    { type: 'diagram', title: 'xyz.com\'s coordination layer: the whole picture', height: 540,
      groups: [
        { label: 'App servers', x: 10, y: 8, w: 700, h: 100 },
        { label: 'Coordination and data', x: 10, y: 138, w: 700, h: 108 },
        { label: 'Redis', x: 10, y: 276, w: 700, h: 256 },
      ],
      nodes: [
        { id: 'w1', label: 'Worker 1', sub: 'LEADER', x: 150, y: 62, kind: 'server', info: 'What it is: the xyz.com app server that is the leader right now. The leader key in etcd is tied to its lease, and it sends a keepalive every ~3 s. Only this one sends the nightly email.' },
        { id: 'w2', label: 'Worker 2', sub: 'follower', x: 360, y: 62, kind: 'server', info: 'What it is: a follower app server. It keeps a watch on the leader key; if the key is deleted, an election starts right away.' },
        { id: 'w3', label: 'Worker 3', sub: 'follower', x: 570, y: 62, kind: 'server', info: 'What it is: the third app server. Before using Redis it asks Sentinel "who is the master?".' },
        { id: 'etcd', label: 'etcd cluster', sub: '3 nodes · Raft', x: 110, y: 198, kind: 'data', info: 'What it is: the coordination service. Leader key + lease, locks, config. It gives correct answers as long as a majority (2 of 3) is alive.' },
        { id: 'store', label: 'Reports DB', sub: 'fencing check', x: 290, y: 198, kind: 'data', info: 'What it is: where the earnings report is written. It remembers the biggest fencing token and rejects writes with an older token.' },
        { id: 'sent', label: 'Sentinel ×3', sub: 'quorum 2', x: 610, y: 198, kind: 'net', info: 'What it is: three Sentinels on separate machines. SDOWN → ODOWN (quorum) → failover leader by majority → replica promoted.' },
        { id: 'master', label: 'Redis master', sub: 'writes', x: 250, y: 336, kind: 'cache', info: 'What it is: the main Redis node: sessions, cache, counters. Writes go here, and async to the replica.' },
        { id: 'replica', label: 'Redis replica', sub: 'async copy', x: 480, y: 336, kind: 'cache', info: 'What it is: a copy of the master. If the master falls, Sentinel makes this the new master.' },
        { id: 'rc', label: 'Redis Cluster', sub: '16,384 slots', x: 480, y: 470, w: 160, kind: 'cache', info: 'What it is: for when the data does not fit in one master. Many masters, each owning some slots, each with replicas, and the nodes gossip with each other. No separate Sentinel needed.' },
      ],
      edges: [
        { a: 'w1', b: 'etcd', n: 1, label: 'lease' },
        { a: 'w2', b: 'etcd', dashed: true, kind: 'evt' },
        { a: 'w1', b: 'store', n: 2, label: 'token 34' },
        { a: 'w3', b: 'sent', label: 'master?' },
        { a: 'w3', b: 'master', label: 'SET / GET' },
        { a: 'sent', b: 'master', dashed: true },
        { a: 'sent', b: 'replica', dashed: true, label: 'promote' },
        { a: 'master', b: 'replica', kind: 'evt', label: 'async' },
        { a: 'master', b: 'rc', dashed: true, label: 'shard' },
      ],
      paths: [
        { name: 'Leader election', text: 'Worker 1 created the leader key in etcd with its lease. Worker 2 is watching: when the lease expires, it becomes the new leader.', go: ['w1>etcd', 'w2>etcd'] },
        { name: 'Safe write', text: 'A write with a lock + fencing token. The storage rejects a write with an old token (33).', go: ['w1>etcd', 'w1>store'] },
        { name: 'Redis failover', text: 'The app asks Sentinel for the master. If the master falls, the Sentinels promote the replica with a quorum + majority.', go: ['w3>sent', 'sent>master', 'sent>replica', 'w3>master'] },
        { name: 'Scale out', text: 'The data got bigger than one master: in Redis Cluster, 16,384 slots are split over many masters.', go: ['master>rc'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Heartbeat + timeout = failure detection. On a network, "dead" and "slow" look the same, so a timeout is always a trade-off. Phi accrual learns each machine's normal pattern and gives a suspicion number.</li>
      <li>Leader election: only the one with a majority is the leader. It is easy with etcd/ZooKeeper (consensus) + lease + watch.</li>
      <li>A lease/TTL lock does not stop an old holder (GC pause). For correctness, use a fencing token that the storage checks.</li>
      <li>Gossip: talk to random nodes, everyone knows in ~log N rounds, no central SPOF. But not for strict decisions.</li>
      <li>Redis replication is async: even a write that got "OK" can be lost. Sentinel = monitoring + automatic failover (the quorum detects, a majority authorizes the failover), at least 3.</li>
      <li>Redis Cluster: CRC16(key) mod 16384 slots, a hash tag {} keeps keys together, MOVED (permanent) vs ASK (temporary).</li>
      <li>Protection from split brain: majority quorum, term/epoch, fencing, an isolated leader stops by itself. An odd number of nodes (3 or 5).</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['When a machine falls, the system fails over by itself (nobody is woken up at 3 am)', 'Singleton jobs run only once', 'Shared data stays safe with locks + fencing', 'Gossip monitors a big fleet without a central SPOF', 'Redis Cluster spreads data and traffic over many machines'],
      costs: ['Everything rests on timeouts: false alarms vs slow detection', 'You must run and monitor a coordination cluster (3-5 nodes)', 'A few seconds of downtime during failover, and some writes can be lost with async replication', 'Without a majority the system stops (availability is given up for safety)', 'Locks and leases are hard to get right: GC pauses, clocks and the network are all enemies'] },

    { type: 'think', questions: [
      { q: 'xyz.com\'s etcd cluster is in 2 data centers: 3 nodes in DC1, 2 nodes in DC2. DC1 goes down completely. What happens?', a: 'Only 2 of 5 are left in DC2, and a majority needs 3. etcd stops taking writes: leader elections and locks all stop. Fix: spread the nodes over 3 places (like 2+2+1 in three zones), so a majority survives if any one place falls.' },
      { q: 'Your lock TTL is 30 s and the work usually takes 5 s. Does making the TTL 10 minutes end the GC pause problem?', a: 'No, it only makes it rarer. A pause or network delay can always be longer than the TTL. And a long TTL has a cost: if the holder really crashes, no work happens for 10 minutes. The right fix: a fencing token, or renew the lease during the work plus a conditional write on the storage.' },
      { q: 'Sentinel setup: 3 Sentinels, quorum 2. The machines of two Sentinels fall, and the master falls too. Will a failover happen?', a: 'No. The one Sentinel left cannot reach the quorum (2), and a failover also needs a majority vote (2 of 3). So put the Sentinels in separate failure zones; you can also run them on machines like the app servers.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'How is a key\'s slot found in Redis Cluster?', options: ['MD5(key) mod number of nodes', 'CRC16(key) mod 16384', 'Consistent hashing ring with virtual nodes'], answer: 1, explain: '16,384 fixed slots. When nodes change, slots move, but the formula does not change. If there is a hash tag {}, only the part inside it is hashed.' },
      { q: 'A client got a -ASK redirect. What should it do?', options: ['Update the slot map and send all queries to the new node', 'Send only this query to the new node with ASKING, and do not change the map', 'Show an error to the user'], answer: 1, explain: 'ASK is temporary (the slot is being migrated). MOVED is permanent, and then you update the map.' },
      { q: 'What does a fencing token stop?', options: ['A crash of the lock service', 'A stale write from an old lock holder (who woke up from a pause)', 'A network partition'], answer: 1, explain: 'The storage remembers the biggest token and rejects writes with a smaller token.' },
      { q: 'How many failures can a 5-node cluster survive?', options: ['1', '2', '4'], answer: 1, explain: 'Majority = 3. ⌊(5-1)/2⌋ = 2 can fall.' },
      { q: 'What does "quorum = 2" mean in Sentinel?', options: ['If 2 Sentinels think the master is down, it is ODOWN; a failover still needs a majority vote', '2 replicas are needed', 'Failover in 2 seconds'], answer: 0, explain: 'The quorum is only for failure detection. A majority of Sentinels authorizes the failover leader.' },
      { q: 'Why is a phi accrual detector better than a fixed timeout?', options: ['It never makes mistakes', 'It measures suspicion against each machine\'s normal heartbeat pattern', 'It stops sending heartbeats'], answer: 1, explain: 'A machine with an average gap of 1 s is declared dead after ~18 s of silence, one with 3 s after ~55 s (threshold 8, Cassandra formula). Mistakes can still happen, just fewer.' },
      { q: 'In gossip, the nodes grow 10 times (100 → 1,000). How many rounds until everyone knows?', options: ['10 times more', 'Roughly in line with log N, only a little more', 'The same'], answer: 1, explain: 'In the simulator with fanout 1 it goes from ~12 to ~18 rounds. The news roughly doubles every round.' },
      { q: 'With async replication the lag is 80 ms and the app writes every 10 ms. The master dies suddenly. About how many writes that got "OK" can be lost?', options: ['0', '~8', '~80'], answer: 1, explain: 'The writes of the last 80 ms (80 ÷ 10 = 8) had not reached the replica yet. WAIT saves them, but every write gets slower.' },
    ]},
    { type: 'sources', note: 'Version-specific facts (slots, formulas, Sentinel rules, lease/watch behaviour) were checked with these docs.', items: [
      { title: 'Redis cluster specification', publisher: 'Redis documentation', official: true, url: 'https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/', used: '16,384 slots, CRC16 (XMODEM) mod 16384, hash tags, MOVED vs ASK + ASKING, cluster bus port +10000, PFAIL/FAIL, failover by majority of masters, write-loss windows, NODE_TIMEOUT. Example slot values used to check the widget.' },
      { title: 'High availability with Redis Sentinel', publisher: 'Redis documentation', official: true, url: 'https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/', used: 'Four Sentinel roles, port 26379, quorum vs majority, SDOWN/ODOWN, at least three Sentinels on separate boxes, partition write loss and min-replicas-to-write / min-replicas-max-lag.' },
      { title: 'How to do distributed locking', publisher: 'Martin Kleppmann (blog)', year: 2016, url: 'https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html', used: 'GC pause + lease expiry scenario, fencing tokens (33/34 example), efficiency vs correctness locks, ZooKeeper zxid/version as token.' },
      { title: 'etcd API: leases, watches, revisions', publisher: 'etcd documentation', official: true, url: 'https://etcd.io/docs/v3.5/learning/api/', used: 'Lease TTL + keepalive, keys deleted on expiry, watch streams, 64-bit store revision.' },
      { title: 'ZooKeeper Programmer\'s Guide', publisher: 'Apache ZooKeeper', official: true, url: 'https://zookeeper.apache.org/doc/current/zookeeperProgrammers.html', used: 'Ephemeral and sequential znodes, one-time watches and persistent watches since 3.6.0, majority requirement.' },
      { title: 'Failure detection and recovery', publisher: 'DataStax Cassandra documentation', official: true, url: 'https://docs.datastax.com/en/cassandra-oss/3.0/cassandra/architecture/archDataDistributeFailDetect.html', used: 'Accrual failure detection over gossip inter-arrival times, phi_convict_threshold tuning.' },
      { title: 'FailureDetector.java (Cassandra source)', publisher: 'Apache Cassandra (GitHub)', official: true, url: 'https://github.com/apache/cassandra/blob/trunk/src/java/org/apache/cassandra/gms/FailureDetector.java', used: 'ArrivalWindow.phi: φ = (t / average gap) × 1/ln 10, PHI_FACTOR; the effect of the default threshold 8.' },
      { title: 'The φ Accrual Failure Detector (Hayashibara, Défago, Yared, Katayama)', publisher: 'IEEE SRDS paper', year: 2004, url: 'https://doi.org/10.1109/RELDIS.2004.1353004', used: 'The original phi accrual idea: a suspicion level instead of a fixed timeout.' },
    ]},
  ],
});
