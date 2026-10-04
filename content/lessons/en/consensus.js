(function () {
  /* ---------- pure helpers (exported as _test for the verification script) ---------- */

  // Lamport + vector clocks over a fixed script. P = process index (0=A,1=B,2=C)
  const LSCRIPT = [
    { p: 0, kind: 'local', what: 'Riya wrote a draft of her post' },
    { p: 0, kind: 'send', to: 1, msg: 'm1', what: 'Server A sent a "post published" message to B' },
    { p: 2, kind: 'local', what: 'On server C, Arjun changed his profile' },
    { p: 2, kind: 'local', what: 'On server C, Arjun liked a video' },
    { p: 2, kind: 'local', what: 'On server C, Arjun saved a video' },
    { p: 1, kind: 'recv', msg: 'm1', what: 'Server B got m1 (the post now shows on B)' },
    { p: 1, kind: 'send', to: 2, msg: 'm2', what: 'Server B sent the comment from Arjun to C' },
    { p: 2, kind: 'recv', msg: 'm2', what: 'Server C got m2 (the comment now shows on C)' },
    { p: 0, kind: 'local', what: 'On server A, Riya switched to dark theme' },
  ];
  function lamport(script) {
    const L = [0, 0, 0], V = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], inflight = {};
    return script.map((e, k) => {
      const p = e.p;
      let rule;
      if (e.kind === 'recv') {
        const m = inflight[e.msg];
        const before = L[p];
        L[p] = Math.max(L[p], m.l) + 1;
        V[p] = V[p].map((x, i) => Math.max(x, m.v[i]));
        V[p][p]++;
        rule = `max(own ${before}, message's ${m.l}) + 1 = ${L[p]}`;
      } else {
        L[p]++; V[p][p]++;
        rule = `own counter + 1 = ${L[p]}`;
      }
      if (e.kind === 'send') inflight[e.msg] = { l: L[p], v: V[p].slice(), from: k };
      return Object.assign({ k, l: L[p], v: V[p].slice(), rule, from: e.kind === 'recv' ? inflight[e.msg].from : undefined }, e);
    });
  }
  // happened-before via vector clocks: a -> b iff a.v <= b.v (all) and a.v != b.v
  const hb = (a, b) => a.v.every((x, i) => x <= b.v[i]) && a.v.some((x, i) => x < b.v[i]);

  // ---------------- Raft simulator (5 nodes, deterministic seeded timeouts) ----------------
  function makeRaft(seed) {
    let s = seed;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const N = 5, MAJ = 3, HB = 50, DELAY = 20, TICK = 10;
    const tout = () => 150 + Math.floor(rnd() * 16) * 10; // 150..300 ms, the range from the Raft paper
    const S = { now: 0, msgs: [], log: [], nextVal: 1, announced: 0 };
    S.nodes = [0, 1, 2, 3, 4].map(i => ({ id: i, alive: true, role: 'F', term: 0, votedFor: null, votes: 0, log: [], commit: 0, timeout: 0, timer: 0, hb: 0, next: [], match: [] }));
    S.nodes.forEach(n => { n.timeout = n.timer = tout(); });
    const nm = i => 'S' + (i + 1);
    const say = (txt, kind) => S.log.push({ t: S.now, txt, kind: kind || 'info' });
    const send = (from, to, m) => S.msgs.push(Object.assign({ from, to, sent: S.now, at: S.now + DELAY }, m));
    const lastTerm = n => n.log.length ? n.log[n.log.length - 1].term : 0;
    const resetTimer = n => { n.timeout = n.timer = tout(); };
    const sendAE = (L, p) => {
      const prevIdx = L.next[p] - 1;
      send(L.id, p, { type: 'AE', term: L.term, prevIdx, prevTerm: prevIdx ? L.log[prevIdx - 1].term : 0, entries: L.log.slice(prevIdx).map(e => Object.assign({}, e)), commit: L.commit });
    };
    const becomeLeader = n => {
      n.role = 'L'; n.hb = 0;
      n.next = [0, 1, 2, 3, 4].map(() => n.log.length + 1);
      n.match = [0, 1, 2, 3, 4].map(i => (i === n.id ? n.log.length : 0));
      say(`${nm(n.id)} got ${n.votes} votes (majority is 3): LEADER of term ${n.term}`, 'leader');
      for (let p = 0; p < N; p++) if (p !== n.id) sendAE(n, p);
      n.hb = HB;
    };
    const startElection = n => {
      n.role = 'C'; n.term++; n.votedFor = n.id; n.votes = 1; resetTimer(n);
      say(`${nm(n.id)}'s timeout ran out: became CANDIDATE, term ${n.term}, voted for itself, asked the others for votes`, 'cand');
      for (let p = 0; p < N; p++) if (p !== n.id) send(n.id, p, { type: 'RV', term: n.term, lastIdx: n.log.length, lastTerm: lastTerm(n) });
    };
    const advanceCommit = L => {
      for (let k = L.log.length; k > L.commit; k--) {
        if (L.log[k - 1].term !== L.term) break;
        const cnt = L.match.filter((m, i) => (i === L.id ? L.log.length : m) >= k).length;
        if (cnt >= MAJ) {
          const old = L.commit; L.commit = k;
          for (let j = Math.max(old, S.announced) + 1; j <= k; j++) say(`Entry #${j} (${L.log[j - 1].val}) reached ${cnt} nodes: COMMITTED`, 'commit');
          S.announced = Math.max(S.announced, k);
          break;
        }
      }
    };
    const handle = m => {
      const n = S.nodes[m.to];
      if (!n.alive) return;
      if (m.term > n.term) {
        if (n.role === 'L') say(`${nm(n.id)} saw a bigger term ${m.term}: stepped down from leader to FOLLOWER`, 'warn');
        n.term = m.term; n.role = 'F'; n.votedFor = null; n.votes = 0;
      }
      if (m.type === 'RV') {
        const upToDate = m.lastTerm > lastTerm(n) || (m.lastTerm === lastTerm(n) && m.lastIdx >= n.log.length);
        const grant = m.term === n.term && (n.votedFor === null || n.votedFor === m.from) && upToDate;
        if (grant) { n.votedFor = m.from; resetTimer(n); }
        else if (m.term === n.term && !upToDate) say(`${nm(n.id)} did NOT vote for ${nm(m.from)}: its log is older`, 'warn');
        send(n.id, m.from, { type: 'RVR', term: n.term, granted: grant });
      } else if (m.type === 'RVR') {
        if (n.role === 'C' && m.term === n.term && m.granted) {
          n.votes++;
          if (n.votes >= MAJ) becomeLeader(n);
        }
      } else if (m.type === 'AE') {
        if (m.term < n.term) { send(n.id, m.from, { type: 'AER', term: n.term, ok: false }); return; }
        if (n.role !== 'F') n.role = 'F';
        resetTimer(n);
        if (m.prevIdx > n.log.length || (m.prevIdx > 0 && n.log[m.prevIdx - 1].term !== m.prevTerm)) {
          send(n.id, m.from, { type: 'AER', term: n.term, ok: false }); return;
        }
        m.entries.forEach((e, i) => {
          const idx = m.prevIdx + 1 + i;
          if (n.log[idx - 1] && n.log[idx - 1].term !== e.term) n.log.length = idx - 1;
          if (!n.log[idx - 1]) n.log.push(e);
        });
        const last = m.prevIdx + m.entries.length;
        if (m.commit > n.commit) n.commit = Math.min(m.commit, last);
        send(n.id, m.from, { type: 'AER', term: n.term, ok: true, match: last });
      } else if (m.type === 'AER') {
        if (n.role !== 'L' || m.term !== n.term) return;
        if (m.ok) { n.match[m.from] = Math.max(n.match[m.from], m.match); n.next[m.from] = n.match[m.from] + 1; advanceCommit(n); }
        else n.next[m.from] = Math.max(1, n.next[m.from] - 1);
      }
    };
    S.tick = () => {
      S.now += TICK;
      const due = S.msgs.filter(m => m.at <= S.now);
      S.msgs = S.msgs.filter(m => m.at > S.now);
      due.forEach(handle);
      S.nodes.forEach(n => {
        if (!n.alive) return;
        if (n.role === 'L') {
          n.hb -= TICK;
          if (n.hb <= 0) { for (let p = 0; p < N; p++) if (p !== n.id) sendAE(n, p); n.hb = HB; }
        } else {
          n.timer -= TICK;
          if (n.timer <= 0) startElection(n);
        }
      });
    };
    S.leader = () => S.nodes.find(n => n.alive && n.role === 'L' && !S.nodes.some(o => o.alive && o.term > n.term));
    S.kill = i => { const n = S.nodes[i]; if (!n.alive) return; n.alive = false; say(`${nm(i)} CRASH${n.role === 'L' ? ' (this was the leader!)' : ''}`, 'dead'); };
    S.revive = i => { const n = S.nodes[i]; if (n.alive) return; n.alive = true; n.role = 'F'; n.votes = 0; resetTimer(n); say(`${nm(i)} is back, starts as a follower (it remembers term ${n.term}; its log was on disk)`, 'info'); };
    S.write = () => {
      const L = S.leader();
      if (!L) { say('Client write: there is no leader right now! The client must retry a little later.', 'warn'); return false; }
      const val = 'x=' + S.nextVal++;
      L.log.push({ term: L.term, val });
      L.match[L.id] = L.log.length;
      say(`Client sent "${val}" to ${nm(L.id)} (leader): entry #${L.log.length} in its log, not committed yet`, 'write');
      return true;
    };
    S.alive = () => S.nodes.filter(n => n.alive).length;
    S.committed = () => Math.max(...S.nodes.map(n => n.commit)); // cluster-wide fact: some node has seen the commit

    S.MAJ = MAJ; S.DELAY = DELAY; S.nm = nm;
    return S;
  }
  const quorum = (N, dead) => { const maj = Math.floor(N / 2) + 1, alive = N - dead; return { maj, tol: Math.floor((N - 1) / 2), alive, ok: alive >= maj }; };
  // Spanner commit wait with constant uncertainty eps (ms): s = latest at commit, wait until earliest > s.
  const commitWait = (eps, t0) => ({ eps, t0, s: t0 + eps, wait: 2 * eps, perSec: Math.floor(1000 / (2 * eps)) });
  // NTP: offset = how far the client clock is BEHIND the server (ms). out/back = one-way delays, proc = server time.
  function ntp(offset, out, back, proc) {
    const t1 = 0, t2 = t1 + offset + out, t3 = t2 + proc, t4 = t3 - offset + back;
    const est = ((t2 - t1) + (t3 - t4)) / 2, delay = (t4 - t1) - (t3 - t2);
    return { t1, t2, t3, t4, offset: est, delay, err: est - offset };
  }
  // Version vectors on two replicas (0 = Mumbai, 1 = Chennai). Each replica holds a list of sibling versions.
  const CAPS = ['Goa trip', 'Goa trip 2026', 'Goa with friends', 'Goa beach day', 'Goa sunset', 'Goa last day', 'Goa diaries', 'Goa again'];
  const vcmp = (a, b) => { const le = a.every((x, i) => x <= b[i]), ge = a.every((x, i) => x >= b[i]); return le && ge ? 'equal' : le ? 'before' : ge ? 'after' : 'concurrent'; };
  const RN = { en: ['Mumbai', 'Chennai'] };
  const vs = v => `[M ${v[0]}, C ${v[1]}]`;
  function vvNew() { return { reps: [[], []], n: 0 }; }
  function vvEdit(S, r, lang) {
    const base = [0, 0]; S.reps[r].forEach(x => x.v.forEach((c, i) => { base[i] = Math.max(base[i], c); }));
    base[r]++;
    const val = CAPS[S.n++ % CAPS.length], merged = S.reps[r].length > 1;
    S.reps[r] = [{ val, v: base }];
    const n = RN[lang][r];
    return `${n}: new caption "${val}". ${merged ? 'This edit saw both conflicting versions, so it replaces them (the conflict is resolved). ' : ''}Its own counter goes up: ${vs(base)}.`;
  }
  function vvSync(S, from, to, lang) {
    const src = S.reps[from], dst = S.reps[to], F = RN[lang][from], D = RN[lang][to];
    if (!src.length) return `${F} has nothing to send yet.`;
    const notes = []; let out = dst.slice(), conflict = false;
    src.forEach(x => {
      if (!out.length) { out.push(x); notes.push('new'); return; }
      const rel = out.map(y => vcmp(x.v, y.v));
      if (rel.some(r => r === 'equal' || r === 'before')) { notes.push('old'); return; }
      const keep = out.filter((y, i) => rel[i] !== 'after');
      if (keep.length) conflict = true;
      out = keep.concat([x]); notes.push(keep.length ? 'conc' : 'newer');
    });
    S.reps[to] = out;
    const a = src.map(x => vs(x.v)).join(' + '), b = dst.map(x => vs(x.v)).join(' + ') || 'empty';
    if (conflict) return `${F} ${a} vs ${D} ${b}: one is bigger in one place, the other is bigger in another place. <strong>Concurrent!</strong> ${D} keeps BOTH versions. (Last-write-wins would have silently thrown one away.) A new edit on ${D} will resolve it.`;
    if (notes.every(n => n === 'old')) return `${F} ${a} vs ${D} ${b}: ${D} already has this or a newer version. Nothing changes.`;
    if (!dst.length) return `${D} was empty. It now gets ${F}'s version ${a}.`;
    return `${F} ${a} vs ${D} ${b}: every number is the same or bigger, so ${F}'s version is newer. ${D} replaces its old copy.`;
  }
  const T = { lamport, LSCRIPT, hb, makeRaft, ntp, vcmp, vvNew, vvEdit, vvSync, quorum, commitWait };

  Lesson.register({
    _test: T,
    id: 'consensus',
    title: 'Consensus, Raft and clocks',
    minutes: 35,
    summary: `How do many machines agree on one thing, when clocks can be wrong, messages arrive late and machines can crash at any time? In this lesson: physical clocks, drift and skew, NTP, Lamport timestamps, vector clocks, Raft (leader, terms, election, log replication, majority) with an interactive simulator, cluster size and (N−1)/2, Paxos, and Google Spanner's TrueTime.`,
    blocks: [
      { type: 'callout', tone: 'analogy', title: 'In simple words', html: `xyz.com no longer runs on one computer. It runs on many computers. Each computer has its own clock, and no two clocks show exactly the same time.<br>So two questions come up. First: <strong>two things happened, which one happened first?</strong> Second: <strong>how can five computers agree on one decision</strong> (like "who is the boss right now"), when any computer can stop at any time?<br>This lesson answers both: why clocks fool us, how we can build an order without clocks (Lamport, vector clocks), and how machines "vote" to decide (Raft, Paxos). Every idea also has a small game. Play with it yourself.` },
      { type: 'h2', text: 'The problem: "who came first?"' },
      { type: 'p', html: `In the coordination lesson we used etcd/ZooKeeper as a "trusted boss". We said that a method called <strong>Raft</strong> runs inside them. Today we open that box.` },
      { type: 'p', html: `But first, a small question where everything starts: <strong>of two events, which one happened first?</strong> (An event is any single thing that happened: a write, a like, a message.)` },
      { type: 'callout', tone: 'term', title: 'New word: Timestamp', html: `<strong>What it is:</strong> a label that says when something happened, like "10:00:05". The server reads its own clock and attaches it.<br><strong>Why we need it:</strong> to decide later which action came first and which came later.<br><strong>Without it:</strong> when two different versions arrive, we cannot tell which one is newer.<br><strong>The catch:</strong> a timestamp is only as correct as that server's clock. This lesson starts with exactly this catch.` },
      { type: 'p', html: `A story. On xyz.com, Riya changes the caption of her video: first "Goa trip", then two seconds later "Goa trip 2026". The Load Balancer sent the two requests to <em>different</em> servers. The database has a simple rule: the bigger timestamp wins. This is called <strong>last-write-wins</strong>.` },
      { type: 'callout', tone: 'term', title: 'New word: Last-write-wins (LWW)', html: `<strong>What it is:</strong> a simple rule. When two versions of the same thing arrive, keep the one with the bigger timestamp and throw the other away.<br><strong>Why we need it:</strong> it is very fast and simple. No human needs to step in. That is why many databases (like Cassandra, by default) use it.<br><strong>Without it:</strong> the app would have to decide by itself which version to keep, for every conflict.<br><strong>The danger:</strong> "bigger timestamp" means "happened later" only if all the clocks are correct. Now see what happens when one clock is wrong.` },
      { type: 'flow', title: 'LWW + a wrong clock = a lost write', height: 330,
        nodes: [
          { id: 'u', label: 'Riya', sub: 'caption edit', x: 90, y: 170, w: 120, kind: 'client', info: 'What it is: an xyz.com user. She changes the caption twice, two seconds apart. She thinks the second one is final.' },
          { id: 'a', label: 'Server A', sub: 'clock correct', x: 340, y: 70, w: 150, kind: 'server', info: 'What it is: one xyz.com app server. When a write comes in, it reads its own clock and puts a timestamp on it.' },
          { id: 'b', label: 'Server B', sub: 'clock 3 s behind', x: 340, y: 270, w: 150, kind: 'server', info: 'What it is: a second app server. Its clock is 3 seconds behind (the clock ran a little slow, and the time sync was missed). The server itself does not know this.' },
          { id: 'db', label: 'Database', sub: 'last-write-wins', x: 600, y: 170, w: 180, kind: 'data', info: 'What it is: where the caption is saved. It keeps a timestamp with every value. It applies a new write only if its timestamp is bigger than the old one (the LWW rule).' },
        ],
        edges: [{ a: 'u', b: 'a' }, { a: 'u', b: 'b' }, { a: 'a', b: 'db' }, { a: 'b', b: 'db' }],
        scenarios: [
          { name: 'Clocks correct', steps: [
            { title: 'First edit, Server A', text: 'A put the timestamp 10:00:05.', go: 'u>a>db', msg: 'caption = "Goa trip"  @ 10:00:05', after: { db: { sub: '"Goa trip" @ :05' } } },
            { title: 'Second edit, Server B', text: 'The clock of B is also correct: 10:00:07. 07 > 05, so the new one wins.', go: 'u>b>db', msg: 'caption = "Goa trip 2026"  @ 10:00:07', after: { db: { state: 'ok', sub: '"Goa trip 2026" @ :07' } } },
          ]},
          { name: 'Clock skew: write lost', steps: [
            { title: 'First edit, Server A', text: 'A: 10:00:05.', go: 'u>a>db', msg: 'caption = "Goa trip"  @ 10:00:05', after: { db: { sub: '"Goa trip" @ :05' } } },
            { title: 'Second edit, Server B', text: 'The real time is 10:00:07, but the clock of B is 3 seconds behind: timestamp 10:00:04.', set: { b: { state: 'warn' } }, go: 'u>b>db', msg: 'caption = "Goa trip 2026"  @ 10:00:04  (real: 10:00:07)' },
            { title: 'Database keeps the old one', text: '04 < 05, so the DB <strong>silently threw away</strong> the new write. No error. Riya refreshes and sees the old caption. This is the classic data loss of LWW + clock skew.', focus: ['db'], set: { db: { state: 'hot', sub: 'kept "Goa trip" (old!)' } } },
          ]},
          { name: 'NTP jumps back', intro: 'The clock of Server A was 2 seconds ahead. NTP (a service that gets the correct time from the internet and fixes the clock; details below) fixed it by pulling it back in one jump.', steps: [
            { title: 'First edit', text: 'The clock of A is ahead: real time 10:00:04, A says 10:00:06.', set: { a: { state: 'warn', sub: 'clock 2 s ahead' } }, go: 'u>a>db', after: { db: { sub: '"Goa trip" @ :06' } }, msg: '@ 10:00:06 (real 10:00:04)' },
            { title: 'NTP step', text: 'NTP set the clock 2 seconds back in one go. For Server A, time ran backwards!', focus: ['a'], set: { a: { sub: 'NTP: 2 s jump back' } } },
            { title: 'Second edit, same server', text: 'Real time 10:00:06, and now A correctly says 10:00:06. But the first one was also :06 (or bigger). Equal or smaller timestamp: the new write loses. Even on the same machine, the "later" timestamp can be smaller.', go: 'u>a>db', set: { db: { state: 'hot', sub: 'kept "Goa trip" (old!)' } }, msg: '@ 10:00:06 (real 10:00:06) → tie / lose' },
          ]},
        ],
      },
      { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "a server clock is always correct"', html: `The clock of every computer runs on a small quartz crystal. Heat, age and manufacturing make it run a little fast or slow. Clocks are kept in sync, but never <em>perfectly</em>. In a distributed system, "10:00:05" means "about 10:00:05, according to one machine".` },

      { type: 'h2', text: 'Physical clocks: a computer clock from the inside' },
      { type: 'p', html: `How does a computer clock work? On the motherboard there is a tiny <strong>quartz crystal</strong>. When electricity flows, it vibrates at a fixed speed, for example 32,768 times every second. The computer counts these vibrations. That many vibrations = 1 second. That is the whole clock.` },
      { type: 'callout', tone: 'term', title: 'New word: Physical clock (wall clock)', html: `<strong>What it is:</strong> the real clock of the machine, which tells "what time is it now". Inside, it counts the vibrations of a quartz crystal.<br><strong>Why we need it:</strong> to write the time in logs, to say "expire after 24 hours", to show the user "2 min ago".<br><strong>Without it:</strong> the machine would not even know if it is day or night.<br><strong>The catch:</strong> every crystal is a little different. Heat, age and manufacturing change its speed a little. So the clocks of two machines slowly move apart.` },
      { type: 'image', src: 'assets/img/consensus/quartz-crystal.jpg', maxWidth: 300, alt: 'Top: a small silver quartz crystal can on a circuit board. Bottom: the same can opened, with a tiny piece of quartz between two electrodes.', caption: 'The heart of a computer clock: a quartz crystal. Top: the closed can (27 MHz). Bottom: opened up, with a thin piece of quartz in the middle that vibrates when electricity flows.', credit: { text: 'Chamblis, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Quartz_crystal_internal.jpg', license: 'CC BY-SA 4.0' } },
      { type: 'callout', tone: 'term', title: 'New words: Clock drift and clock skew', html: `<strong>Drift (what it is):</strong> an error in the <em>speed</em> of one clock. The clock runs a little faster or slower than real time. We measure it in <strong>ppm</strong> (parts per million): 20 ppm = 20 seconds off for every 1 million seconds, which is about 1.7 seconds per day.<br><strong>Skew (what it is):</strong> the <em>difference between two clocks</em> at one moment. If Server A says 10:00:05 and Server B says 10:00:02, the skew is 3 seconds.<br><strong>How they connect:</strong> drift slowly creates skew. If two clocks drift in opposite directions, the skew grows twice as fast.<br><strong>Without them (if you ignore them):</strong> you will believe "bigger timestamp = happened later", and LWW will silently lose writes, as we saw above.` },
      { type: 'p', html: `Why can we not trust clocks? Five reasons:` },
      { type: 'list', items: [
        '<strong>Drift</strong>: a quartz clock runs a little fast or slow. Even the Google leap-smear document accepts that a change of about 11.6 ppm is within the normal quartz error of machines.',
        '<strong>Sync is not perfect</strong>: NTP, which fixes the clock (details below), can only estimate the network delay. So the error can be from milliseconds to (on a bad network) much more.',
        '<strong>Jumps</strong>: if the difference is big, NTP "steps" the clock straight away, forward or <em>backward</em>. A jump backward = time ran backwards.',
        '<strong>Leap seconds</strong>: because of the changing speed of the Earth\'s spin, an extra second was sometimes added to UTC (the world standard time). On 1 Jan 2017, because of this, the difference between two timestamps in Cloudflare\'s DNS code came out negative and one function crashed (panicked); some DNS queries failed. Google spreads ("smears") this second slowly over 24 hours (noon to noon), so there is no jolt. In 2022, the international measurement body (CGPM) decided that leap seconds will be stopped by 2035.',
        '<strong>Pauses</strong>: a VM moved from one machine to another, or GC (the job that cleans memory) stopped the program for a while. For the program, time "stopped"; for the world, it did not.',
      ]},
      { type: 'p', html: `Drift looks small, but it adds up. <strong>Worked example:</strong> 20 ppm drift, and the last sync was 1 hour ago. Error = 20 × 10⁻⁶ × 3600 s = 0.072 s = 72 ms. If two servers drift in opposite directions, they are 144 ms apart. Now try it yourself with the sliders:` },
      { type: 'custom', render(el) {
        el.innerHTML = `<div class="row2">
            <div><label>Drift: <strong class="cs-dv"></strong></label><input class="cs-d" type="range" min="1" max="200" step="1" value="20"></div>
            <div><label>Time since last NTP sync: <strong class="cs-hv"></strong></label><input class="cs-h" type="range" min="1" max="1440" step="1" value="60"></div>
          </div>
          <div class="stats">
            <div class="stat"><span>Error of one machine</span><strong class="cs-one"></strong></div>
            <div class="stat"><span>Between two machines (opposite drift)</span><strong class="cs-two"></strong></div>
            <div class="stat"><span>One day without sync</span><strong class="cs-day"></strong></div>
          </div>
          <div class="calc-note cs-note"></div>`;
        const d = el.querySelector('.cs-d'), hh = el.querySelector('.cs-h');
        const fmt = s => s >= 1 ? s.toFixed(2) + ' s' : (s * 1000).toFixed(s * 1000 < 10 ? 1 : 0) + ' ms';
        const upd = () => {
          const ppm = Number(d.value), min = Number(hh.value), one = ppm * 1e-6 * min * 60;
          el.querySelector('.cs-dv').textContent = ppm + ' ppm';
          el.querySelector('.cs-hv').textContent = min >= 60 ? (min / 60).toFixed(1) + ' hours' : min + ' min';
          el.querySelector('.cs-one').textContent = fmt(one);
          el.querySelector('.cs-two').textContent = fmt(2 * one);
          el.querySelector('.cs-day').textContent = fmt(ppm * 1e-6 * 86400);
          el.querySelector('.cs-note').textContent = 2 * one > 0.001
            ? 'If two servers are ' + fmt(2 * one) + ' apart, then ordering two writes that are closer than this by timestamp is a gamble. (The Spanner paper assumes a worst-case drift of 200 µs per second: move the slider to 200.)'
            : 'Even such a small difference matters when there are thousands of writes per second.';
        };
        d.addEventListener('input', upd); hh.addEventListener('input', upd); upd();
      }},
      { type: 'h3', text: 'NTP: how clocks get fixed' },
      { type: 'callout', tone: 'term', title: 'New word: NTP (Network Time Protocol)', html: `<strong>What it is:</strong> a method in which a computer asks a "time server" on the internet for the time and fixes its own clock. It runs on every Linux server, phone and laptop.<br><strong>Why we need it:</strong> drift would pull the clock off by a few seconds every day. NTP syncs again and again (every few minutes) and keeps the difference in milliseconds.<br><strong>Without it:</strong> in one month, server clocks would be a minute apart. Order of logs, cache expiry, the "expire time" of login tokens: all would break.<br><strong>Example:</strong> xyz.com servers sync with public time servers like <code>time.google.com</code> or with the time service of their cloud provider.` },
      { type: 'p', html: `The hard part: the answer of the time server also has to <em>travel</em> over the network. By the time the answer arrives, time has moved on. NTP handles this with four timestamps:` },
      { type: 'steps', items: [
        { t: 'T1: the client sends', d: 'The client writes, using its own clock: "I sent the request at T1".' },
        { t: 'T2: the server receives', d: 'The server writes, using its own (correct) clock: the request arrived at T2.' },
        { t: 'T3: the server replies', d: 'The server writes: the reply was sent at T3.' },
        { t: 'T4: the client receives', d: 'The client writes, using its own clock: the reply arrived at T4.' },
        { t: 'The maths', d: '<strong>Delay</strong> (total network time, there and back) = (T4 − T1) − (T3 − T2). <strong>Offset</strong> (how far behind my clock is) = ((T2 − T1) + (T3 − T4)) / 2. Then the client corrects its clock by the offset.' },
      ]},
      { type: 'p', html: `<strong>Worked example:</strong> the client clock is 110 ms behind the server. Going takes 20 ms, coming back takes 20 ms, the server thinks for 1 ms. By the client clock, T1 = 0. By the server clock, T2 = 0 + 20 + 110 = 130, T3 = 131. By the client clock, T4 = 131 − 110 + 20 = 41. Offset = (130 + (131 − 41)) / 2 = (130 + 90) / 2 = <strong>110 ms</strong>. Exactly right! Delay = 41 − 1 = 40 ms.` },
      { type: 'p', html: `The hidden assumption: NTP assumes that going and coming back take the <strong>same</strong> time. If going takes 30 ms and coming back takes 10 ms, the NTP answer will be off by (30 − 10) / 2 = 10 ms. This error can never be more than half of the delay. Try it with the sliders below:` },
      { type: 'custom', render(el) {
        el.innerHTML = `<div class="row2">
            <div><label>Real difference (how far the client is behind): <strong class="nt-ov"></strong></label><input class="nt-o" type="range" min="-200" max="200" step="5" value="110"></div>
            <div><label>Delay going: <strong class="nt-av"></strong></label><input class="nt-a" type="range" min="1" max="150" step="1" value="20"></div>
            <div><label>Delay coming back: <strong class="nt-bv"></strong></label><input class="nt-b" type="range" min="1" max="150" step="1" value="20"></div>
          </div>
          <div class="ascii nt-ts" style="font-size:12.5px;white-space:pre-wrap;margin-top:8px"></div>
          <div class="stats">
            <div class="stat"><span>NTP offset</span><strong class="nt-off"></strong></div>
            <div class="stat"><span>Delay (round trip)</span><strong class="nt-del"></strong></div>
            <div class="stat"><span>NTP error</span><strong class="nt-err"></strong></div>
            <div class="stat"><span>Max possible error (delay/2)</span><strong class="nt-max"></strong></div>
          </div>
          <div class="calc-note nt-note"></div>`;
        const q = c => el.querySelector(c), o = q('.nt-o'), a = q('.nt-a'), b = q('.nt-b');
        const upd = () => {
          const r = T.ntp(Number(o.value), Number(a.value), Number(b.value), 1);
          q('.nt-ov').textContent = o.value + ' ms'; q('.nt-av').textContent = a.value + ' ms'; q('.nt-bv').textContent = b.value + ' ms';
          q('.nt-ts').textContent = 'T1 = ' + r.t1 + ' (client clock)\nT2 = ' + r.t2 + ' (server clock)\nT3 = ' + r.t3 + ' (server clock)\nT4 = ' + r.t4 + ' (client clock)\noffset = ((T2-T1) + (T3-T4)) / 2 = ((' + (r.t2 - r.t1) + ') + (' + (r.t3 - r.t4) + ')) / 2';
          q('.nt-off').textContent = r.offset + ' ms'; q('.nt-del').textContent = r.delay + ' ms';
          q('.nt-err').textContent = Math.abs(r.err) + ' ms'; q('.nt-max').textContent = r.delay / 2 + ' ms';
          q('.nt-note').textContent = r.err === 0 ? 'Going and coming back are equal: the NTP estimate is exactly right.' : 'The path is longer in one direction, so NTP is off by ' + Math.abs(r.err) + ' ms, and it does not even know it. That is why nearby time servers (small delay) are better.';
        };
        [o, a, b].forEach(x => x.addEventListener('input', upd)); upd();
      }},
      { type: 'p', html: `Two more parts of NTP are worth knowing:` },
      { type: 'list', items: [
        '<strong>Stratum (levels):</strong> a stratum 1 server has its own GPS receiver or atomic clock. A stratum 2 server takes time from stratum 1, stratum 3 from stratum 2, and so on. Each level adds a little error.',
        '<strong>Slew vs step:</strong> if the error is small, NTP fixes the clock <em>slowly</em>: for a while it runs the clock a little faster or slower (slew; at most 500 ppm in the Unix kernel). Time never goes backwards. If the error is big (more than 128 ms in classic ntpd), the clock is set (stepped) in one jump, even backwards. The "NTP jumps back" scenario in the flow above was exactly this.',
      ]},
      { type: 'callout', tone: 'term', title: 'New words: Wall clock vs monotonic clock', html: `<strong>Wall clock (what it is):</strong> the "what time is it now" clock. NTP can move it forward or backward.<br><strong>Monotonic clock (what it is):</strong> a counter that only moves forward, never backward. Its own value (like 81234.5) means nothing; only the <em>difference</em> between two readings is useful.<br><strong>Why we need it:</strong> to measure "how long did it take" (timeouts, latency), always use the monotonic clock.<br><strong>Without it:</strong> if you measure a duration with the wall clock and NTP moves the clock back in between, the duration can come out negative. Cloudflare's 2017 bug came from exactly this mistake.` },
      { type: 'p', html: `So if we cannot trust the physical clock, how do we decide the order? In 1978 Leslie Lamport gave the answer: <strong>forget real time</strong>. We do not need to know "at what time" an event happened. We only need to know which event could have been <strong>caused</strong> by which other event.` },

      { type: 'h2', text: 'Lamport timestamps' },
      { type: 'p', html: `Think about this. Riya posted something, and Arjun commented <em>after seeing that post</em>. The comment must come after the post, because the comment happened <strong>because of</strong> the post. But if Arjun changed his profile photo somewhere else, which has nothing to do with Riya's post, then the question "post first or photo first?" makes no sense.` },
      { type: 'callout', tone: 'term', title: 'New word: Happened-before (→)', html: `<strong>What it is:</strong> the relation "a could have affected b". We write <strong>a → b</strong>. It is true in three cases: (1) both happened on the same machine and a happened first; (2) a was the sending of a message and b was the receiving of the same message; (3) there is a chain in between (a → x → b).<br><strong>Concurrent:</strong> neither a → b nor b → a. Neither knew about the other. "Who came first" has no meaning.<br><strong>Why we need it:</strong> to keep the correct "cause first, effect later" order, even without clocks.<br><strong>Without it:</strong> a comment can show up before its post, or a private post made after an "unfriend" can be shown to the wrong person.` },
      { type: 'callout', tone: 'term', title: 'New word: Logical clock (Lamport clock)', html: `<strong>What it is:</strong> not real time, just a <em>count</em>. Every machine keeps an integer counter and increases it on every event. An idea by Leslie Lamport from 1978.<br><strong>Why we need it:</strong> physical clocks can be wrong, but a count never goes "backwards". Sending the count with messages keeps the cause-and-effect order safe.<br><strong>Without it:</strong> we would have to rely on physical timestamps for order, and we saw above that they fool us.` },
      { type: 'p', html: `A <strong>Lamport clock</strong> is just one integer counter on every machine. Three rules:` },
      { type: 'steps', items: [
        { t: 'Before every event', d: 'Counter + 1. The event gets this number.' },
        { t: 'When sending a message', d: 'Send your own (increased) counter with the message.' },
        { t: 'When receiving a message', d: 'Counter = max(own counter, number in the message) + 1.' },
      ]},
      { type: 'p', html: `The guarantee: if a → b, then L(a) &lt; L(b). Three servers, nine events. Run it step by step, then pick two events below and compare them:` },
      { type: 'custom', render(el) {
        const EV = T.lamport(T.LSCRIPT), P = ['A', 'B', 'C'], PC = ['var(--accent)', 'var(--violet)', 'var(--amber)'];
        el.innerHTML = `<svg class="cs-lsvg" viewBox="0 0 340 185" style="width:100%;max-width:520px;display:block" role="img" aria-label="Lamport clock timeline"></svg>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"><button type="button" class="btn small ghost cs-lp">Back</button><button type="button" class="btn small primary cs-ln">Next event</button><button type="button" class="btn small ghost cs-lr">Reset</button><button type="button" class="btn small ghost cs-lv">Show vector clocks</button></div>
          <div class="calc-note cs-lt" style="min-height:44px"></div>
          <div class="row2" style="margin-top:6px"><div style="min-width:0"><label>Event X</label><select class="cs-sa" style="width:100%;max-width:100%"></select></div><div style="min-width:0"><label>Event Y</label><select class="cs-sb" style="width:100%;max-width:100%"></select></div></div>
          <div class="calc-note cs-cmp"></div>`;
        let k = 0, vec = false;
        const svg = el.querySelector('.cs-lsvg'), X = i => 50 + i * 34, Y = p => 35 + p * 60;
        const opts = EV.map((e, i) => `<option value="${i}">e${i + 1} (${P[e.p]}): ${e.what}</option>`).join('');
        const sa = el.querySelector('.cs-sa'), sb = el.querySelector('.cs-sb');
        sa.innerHTML = opts; sb.innerHTML = opts; sa.value = '8'; sb.value = '7';
        const draw = () => {
          let s = P.map((p, i) => `<line x1="34" y1="${Y(i)}" x2="336" y2="${Y(i)}" stroke="var(--line-2)" stroke-width="1.5"/><text x="12" y="${Y(i) + 5}" fill="var(--ink-2)" font-size="14" font-weight="700">${p}</text>`).join('');
          EV.slice(0, k).forEach(e => { if (e.kind === 'recv') { const f = EV[e.from]; s += `<line x1="${X(f.k)}" y1="${Y(f.p)}" x2="${X(e.k)}" y2="${Y(e.p)}" stroke="var(--ink-3)" stroke-width="1.5" stroke-dasharray="4 3"/>`; } });
          EV.slice(0, k).forEach(e => { s += `<circle cx="${X(e.k)}" cy="${Y(e.p)}" r="12" fill="var(--surface)" stroke="${PC[e.p]}" stroke-width="${e.k === k - 1 ? 3.5 : 2}"/><text x="${X(e.k)}" y="${Y(e.p) + 4.5}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">${e.l}</text>` + (vec ? `<text x="${X(e.k)}" y="${Y(e.p) + (e.p === 2 && e.k % 2 ? -18 : 26)}" text-anchor="middle" font-size="8.5" fill="var(--ink-2)">[${e.v}]</text>` : '') + `<text x="${X(e.k)}" y="${Y(e.p) - (e.p === 2 && e.k % 2 && vec ? 30 : 16)}" text-anchor="middle" font-size="8.5" fill="var(--ink-3)">e${e.k + 1}</text>`; });
          svg.innerHTML = s;
          const e = EV[k - 1];
          el.querySelector('.cs-lt').innerHTML = e ? `<strong>e${k}, server ${P[e.p]}:</strong> ${e.what}. ${e.kind === 'recv' ? 'Receive rule' : e.kind === 'send' ? 'Send: the counter went up and travelled with the message' : 'Local event'}: L = ${e.rule}.${vec ? ` Vector = [${e.v}] (counters of A, B, C).` : ''}` : 'Press "Next event". Each circle is one event, with its Lamport number inside.';
          el.querySelector('.cs-lv').textContent = vec ? 'Hide vector clocks' : 'Show vector clocks';
          const a = EV[Number(sa.value)], b = EV[Number(sb.value)];
          const rel = a === b ? 'same event' : T.hb(a, b) ? `e${a.k + 1} → e${b.k + 1} (happened before, could be the cause)` : T.hb(b, a) ? `e${b.k + 1} → e${a.k + 1}` : 'CONCURRENT: neither knew about the other';
          el.querySelector('.cs-cmp').innerHTML = `Lamport: L(e${a.k + 1}) = ${a.l}, L(e${b.k + 1}) = ${b.l}. Vector: [${a.v}] vs [${b.v}].<br><strong>Real relation:</strong> ${rel}.` + (a !== b && !T.hb(a, b) && !T.hb(b, a) && a.l !== b.l ? ` Notice: the Lamport numbers are different (${Math.min(a.l, b.l)} &lt; ${Math.max(a.l, b.l)}), yet neither is "first". A smaller Lamport number ≠ happened first.` : '');
        };
        el.querySelector('.cs-ln').onclick = () => { if (k < EV.length) k++; draw(); };
        el.querySelector('.cs-lp').onclick = () => { if (k > 0) k--; draw(); };
        el.querySelector('.cs-lr').onclick = () => { k = 0; draw(); };
        el.querySelector('.cs-lv').onclick = () => { vec = !vec; draw(); };
        sa.addEventListener('change', draw); sb.addEventListener('change', draw);
        draw();
      }},
      { type: 'p', html: `What did you see? At e6, the counter of B was 0, but the message brought 2, so B jumped straight to 3: max(0, 2) + 1. And at e8, C had 3, the message brought 4: so 5. Now compare <strong>e9 (A, L=3)</strong> and <strong>e8 (C, L=5)</strong>: 3 &lt; 5, but e9 never influenced e8, and e8 never influenced e9. They are concurrent. So the reverse of Lamport's rule is not true: <strong>L(a) &lt; L(b) does not tell us that a → b</strong>.` },
      { type: 'callout', tone: 'tip', title: 'What is Lamport good for?', html: `To build a <strong>total order</strong> (that is, <em>one single line</em> of all events that every machine agrees on) that never breaks the cause-and-effect (causality) order: sort by (Lamport number, server ID). On a tie (like e5 and e6, both 3), use the server ID. All machines will agree on the same order without talking to each other. Distributed locks, replicated logs and "who came first" tie-breaks use this idea. But to know "were these two concurrent?", Lamport is not enough.` },

      { type: 'h2', text: 'Vector clocks: catching conflicts' },
      { type: 'p', html: `Remember the weakness of Lamport: by looking at two numbers we cannot tell that the events were concurrent. Now a real problem. The xyz.com database has copies in two places: <strong>Mumbai</strong> and <strong>Chennai</strong>. Writes can happen in both places (a multi-leader setup). Riya changes the caption from her phone on Mumbai, and at the same time from her laptop on Chennai. When the two copies sync, what should we do?` },
      { type: 'callout', tone: 'term', title: 'New word: Vector clock (version vector)', html: `<strong>What it is:</strong> instead of one number, a <em>list of numbers</em>, one counter for every server (or replica). Like [Mumbai: 2, Chennai: 1]. When it is attached to versions of data, it is also called a <strong>version vector</strong>.<br><strong>Why we need it:</strong> to look at two versions and say for sure: "this one is older" or "these two were made at the same time, without knowing each other (a conflict)".<br><strong>Without it:</strong> like LWW, one version would be silently thrown away, and the user's work would be lost.<br><strong>The cost:</strong> the length of the list grows with the number of servers.` },
      { type: 'steps', items: [
        { t: 'Local write', d: 'The replica where the write happened adds +1 to <strong>its own</strong> counter in the list.' },
        { t: 'Sync / message', d: 'When the other copy arrives, take the <strong>max</strong> of every position. (In the vector mode of the Lamport widget above, the receiver also adds +1 to its own counter.)' },
        { t: 'Compare', d: 'If every position of X is ≤ Y (and smaller somewhere), X is older and Y is newer. If X is bigger in one place and Y is bigger in another, they are <strong>concurrent</strong>: a conflict.' },
      ]},
      { type: 'p', html: `<strong>Worked example:</strong> start [M 0, C 0]. Edit on Mumbai: [1, 0]. Chennai gets it through sync. Edit on Chennai: [1, 1]. Sync back: [1, 1] is ≥ [1, 0] everywhere, so it is newer; remove the old one. Now both go offline. Edit on Mumbai: [2, 1]. Edit on Chennai: [1, 2]. Sync: in the Mumbai position the first is bigger (2 &gt; 1), in the Chennai position the second is bigger (2 &gt; 1). <strong>Concurrent!</strong> Keep both versions and let the app/user resolve it. The next edit is made "after seeing" both: it starts from [2, 2], then +1.` },
      { type: 'p', html: `Try it yourself. Use the buttons to edit on both replicas and to sync. Watch carefully when a "conflict" appears:` },
      { type: 'custom', render(el) {
        el.innerHTML = `<div class="row2 vv-reps"></div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
            <button type="button" class="btn small primary" data-a="e0">Edit on Mumbai</button><button type="button" class="btn small primary" data-a="e1">Edit on Chennai</button>
            <button type="button" class="btn small ghost" data-a="s01">Sync Mumbai → Chennai</button><button type="button" class="btn small ghost" data-a="s10">Sync Chennai → Mumbai</button>
            <button type="button" class="btn small ghost" data-a="r">Reset</button></div>
          <div class="calc-note vv-msg" style="min-height:44px"></div>`;
        const R = ['Mumbai', 'Chennai'];
        let S = T.vvNew();
        const draw = msg => {
          el.querySelector('.vv-reps').innerHTML = S.reps.map((r, i) => `<div style="border:1.5px solid ${r.length > 1 ? 'var(--red)' : 'var(--line-2)'};border-radius:var(--r);padding:8px 10px;min-width:0"><strong>${R[i]} replica</strong>${r.length > 1 ? ' <span style="color:var(--red);font-weight:700">· CONFLICT (' + r.length + ' versions)</span>' : ''}`
            + (r.map(x => `<div style="font:13px var(--f-mono);margin-top:4px">"${x.val}" <span style="color:var(--ink-3)">[M ${x.v[0]}, C ${x.v[1]}]</span></div>`).join('') || '<div style="color:var(--ink-3);margin-top:4px">empty [M 0, C 0]</div>') + '</div>').join('');
          el.querySelector('.vv-msg').innerHTML = msg || 'At the start both are empty: [M 0, C 0]. Try: edit on Mumbai, sync Mumbai → Chennai. Then one edit on each side without syncing, and then sync.';
        };
        el.addEventListener('click', e => {
          const b = e.target.closest && e.target.closest('[data-a]'); if (!b) return;
          const a = b.getAttribute('data-a');
          if (a === 'r') { S = T.vvNew(); draw(); return; }
          draw(a[0] === 'e' ? T.vvEdit(S, Number(a[1]), 'en') : T.vvSync(S, Number(a[1]), Number(a[2]), 'en'));
        });
        draw();
      }},
      { type: 'p', html: `This is why Dynamo-style databases (Amazon's Dynamo paper, Riak) use vector clocks or version vectors to catch two writes that are truly in conflict. Instead of silently throwing one away like LWW, they give both versions to the app, or merge them with a CRDT (data types that merge by themselves, like counters). The full story of conflict resolution is in the <strong>"Consistency models and quorums"</strong> lesson.` },
      { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "a vector clock is also a timestamp, the bigger one wins"', html: `No. The job of a vector clock is not to pick a winner, but to <strong>tell the relation</strong>: older, newer, or concurrent. If they are concurrent, neither is "bigger". The app decides (show both, merge them, or ask the user).` },

      { type: 'h2', text: 'Consensus: many machines, one decision' },
      { type: 'p', html: `Now the real question. xyz.com has 3 workers that send emails, but only <strong>one</strong> of them should send at a time (otherwise users get double emails). This "who is the boss" fact is written in etcd: <code>/xyz/email-leader = worker-2</code>.` },
      { type: 'p', html: `etcd itself runs on 5 servers, so that it keeps working if one fails. Now all five must remember this value <strong>the same way, and in the same order</strong>. Even if 2 servers fail, or messages arrive late or get lost. If one server says "worker-2" and another says "worker-3", two workers will send emails. This "everyone agrees on one thing" problem is called <strong>consensus</strong>.` },
      { type: 'callout', tone: 'term', title: 'New word: Consensus', html: `<strong>What it is:</strong> an agreement of many machines on one value, which never flips once it is made, and which still works when some machines fail.<br><strong>Why we need it:</strong> decisions like "who is the leader", "who holds the lock", "what is the config" must look the same to every machine.<br><strong>Without it:</strong> split brain: two machines think they are the boss and make opposite decisions (double emails, double payments, corrupt data).<br><strong>Example:</strong> etcd, ZooKeeper, Kafka's KRaft controller, Google Spanner: all of them run consensus inside.` },
      { type: 'callout', tone: 'term', title: 'New word: Replicated log (replicated state machine)', html: `<strong>What it is:</strong> every server has a numbered list (log) of commands: #1 "set a=1", #2 "set leader=worker-2"... If everyone's list is in the <em>same order</em>, every server runs the same commands and reaches the same condition (state). This is called a replicated state machine.<br><strong>Why we need it:</strong> agreeing on one value is not enough; we must agree on every new command, forever. The log turns this into "agree on the next line".<br><strong>Without it:</strong> on one server command #5 runs first, on another #6 runs first: the two end up in different states.` },
      { type: 'callout', tone: 'term', title: 'New word: Majority (quorum)', html: `<strong>What it is:</strong> more than half of the servers. 3 out of 5, 2 out of 3. Formula: ⌊N/2⌋ + 1 (⌊ ⌋ = round down to a whole number).<br><strong>Why we need it:</strong> any two majorities always share at least one server. So two different groups can never make two different decisions.<br><strong>Without it:</strong> if the network splits into two parts, both parts would make their own decision.` },
      { type: 'p', html: `A consensus algorithm must make two promises. <strong>Safety</strong> (never wrong): two servers never commit different values, no matter what happens. <strong>Liveness</strong> (keeps moving): when a majority is alive and connected, work keeps going. Safety is never given up. Liveness can stop in bad times (no majority): a system that stops is better than one that gives wrong answers.` },

      { type: 'h2', text: 'Raft, step by step' },
      { type: 'p', html: `Raft was created in 2014 by Diego Ongaro and John Ousterhout (Stanford). The goal: just as reliable as Paxos (an older algorithm, below), but <strong>easier to understand</strong>. In the user study in their paper, 33 out of 43 students answered questions about Raft better than questions about Paxos. Systems like etcd, Consul, CockroachDB, TiKV and Kafka KRaft run on Raft (or its variants).` },
      { type: 'callout', tone: 'term', title: 'New words: Leader, Follower, Candidate', html: `<strong>What it is:</strong> in Raft, every server is in one of three roles.<br><strong>Follower:</strong> quietly does what the leader says and copies its list.<br><strong>Candidate:</strong> is asking for votes to become the leader.<br><strong>Leader:</strong> only one at a time. All client writes come to it, and the log flows from it to the followers in <em>one direction only</em>.<br><strong>Why we need it:</strong> with one boss, the decision "which command gets which number" is made in one place. Very simple.<br><strong>Without it:</strong> if every server handed out numbers by itself, they would clash.` },
      { type: 'callout', tone: 'term', title: 'New word: Term (the logical clock of Raft)', html: `<strong>What it is:</strong> time is divided into <strong>terms</strong>: 1, 2, 3... Each term starts with an election, and each term has <strong>at most one leader</strong>. Every message carries its term.<br><strong>Why we need it:</strong> to recognise an old leader. If a server sees a term bigger than its own, it immediately updates its term and becomes a follower. Messages with an old term are rejected.<br><strong>Without it:</strong> an old leader that comes back from a network problem would keep sending commands next to the new leader.<br>It is the same idea as the Lamport clock: no physical clock needed.` },
      { type: 'callout', tone: 'term', title: 'New words: Heartbeat and election timeout', html: `<strong>Heartbeat (what it is):</strong> a small "I am alive" message from the leader, every few milliseconds (in Raft it is an empty AppendEntries message).<br><strong>Election timeout (what it is):</strong> a timer on every follower. When a heartbeat arrives, the timer starts again. If the timer runs out = "the leader is probably dead", time for an election.<br><strong>Why we need it:</strong> to notice that the leader died and to choose a new one, without any human.<br><strong>Without it:</strong> if the leader failed, the system would stay stuck forever.` },
      { type: 'h3', text: '1. Leader election' },
      { type: 'steps', items: [
        { t: 'Heartbeats', d: 'Every little while (for example 50 ms) the leader sends followers a heartbeat: "I am alive".' },
        { t: 'Election timeout (random)', d: 'Every follower has a timer. The paper suggests a random value between 150 and 300 ms. When a heartbeat arrives, the timer resets. The timer runs out = "the leader may be dead".' },
        { t: 'Candidate', d: 'That follower does term + 1, votes for itself, and sends everyone a vote request message (RequestVote).' },
        { t: 'Voting rules', d: 'Each server gives only <strong>one</strong> vote per term (to whoever asks first), and only to a candidate whose log is at least as new as its own.' },
        { t: 'Majority = leader', d: '3 votes out of 5 (counting its own) makes it the leader. It sends heartbeats right away so that the others do not start an election.' },
      ]},
      { type: 'callout', tone: 'why', title: 'Why is the timeout random?', html: `If everyone had the same timeout, everyone would become a candidate at the same time, the votes would be split (<strong>split vote</strong>), nobody would get a majority, then everyone would time out together again... With random timeouts, one server usually wakes up before the others and collects the votes before they wake up. Even if a split vote happens, every candidate picks a new random timeout and the next round usually settles it. You will sometimes see this yourself in the simulator.` },
      { type: 'h3', text: '2. Log replication and commit' },
      { type: 'steps', items: [
        { t: 'The client writes to the leader', d: 'The leader adds the command to the end of its log (with the term number). Right now it is <strong>uncommitted</strong>.' },
        { t: 'AppendEntries', d: 'AppendEntries = the leader\'s "add these new lines to your list" message. The leader sends the new entries to the followers, together with the index and term of the entry just before them. If the follower\'s log does not match there, it refuses, and the leader tries again from one step earlier, until they match. This makes the followers\' logs equal to the leader\'s log.' },
        { t: 'Commit on a majority', d: 'When the entry reaches the logs of a majority (3 out of 5), it is <strong>committed</strong> (final, permanent). Now it will never be erased. The leader applies it, tells the client "OK", and in the next heartbeat also tells the followers the new commit index.' },
      ]},
      { type: 'h3', text: 'Simulator: 5 servers, break them yourself' },
      { type: 'p', html: `Keep pressing "Next event": first the timers run, one server becomes a candidate, votes, leader. Then press "Client write" and watch the entry commit on a majority. Then <strong>kill the leader</strong>: timeouts, a new term, a new leader. Click any server to crash it or bring it back. Leave the leader alone, crash three followers and write: nothing will commit. The "random" timers come from a fixed seed, so the same clicks always give the same story.` },
      { type: 'custom', render(el) {
        el.innerHTML = `<svg class="rf-svg" viewBox="0 0 340 250" style="width:100%;max-width:460px;display:block;margin:0 auto;cursor:pointer" role="img" aria-label="Raft cluster of 5 servers"></svg>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px">
            <button type="button" class="btn small primary rf-next">Next event</button><button type="button" class="btn small ghost rf-play">Auto play</button><button type="button" class="btn small ghost rf-tick">+10 ms</button>
            <button type="button" class="btn small ghost rf-kill">Kill the leader</button><button type="button" class="btn small ghost rf-write">Client write</button><button type="button" class="btn small ghost rf-reset">Reset</button></div>
          <div class="stats"><div class="stat"><span>Time</span><strong class="rf-t"></strong></div><div class="stat"><span>Leader</span><strong class="rf-l"></strong></div><div class="stat"><span>Alive / majority</span><strong class="rf-a"></strong></div><div class="stat"><span>Committed entries</span><strong class="rf-c"></strong></div></div>
          <div class="rf-rows" style="font-size:13px;margin-top:8px"></div>
          <ol class="rf-log" reversed style="font-size:13px;line-height:1.45;margin:10px 0 0;padding-left:22px"></ol>`;
        const q = c => el.querySelector(c), SEED = 7;
        let S, timer = null;
        const ROLE = { F: ['Follower', 'var(--accent)'], C: ['Candidate', 'var(--amber)'], L: ['Leader', 'var(--green)'] };
        const pos = i => { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; return [170 + 92 * Math.cos(a), 122 + 92 * Math.sin(a)]; };
        const MC = { RV: 'var(--amber)', RVR: 'var(--green)', AE: 'var(--accent)', AER: 'var(--ink-3)' };
        const draw = () => {
          let s = '';
          for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) { const [x1, y1] = pos(i), [x2, y2] = pos(j); s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--line)" stroke-width="1"/>`; }
          S.msgs.forEach(m => {
            const f = Math.min(1, (S.now - m.sent) / S.DELAY), [x1, y1] = pos(m.from), [x2, y2] = pos(m.to);
            const c = m.type === 'RVR' && !m.granted ? 'var(--red)' : MC[m.type];
            s += `<circle cx="${x1 + (x2 - x1) * f}" cy="${y1 + (y2 - y1) * f}" r="${m.type === 'AE' && !m.entries.length ? 3.5 : 5.5}" fill="${c}"/>`;
          });
          const lead = S.leader();
          S.nodes.forEach(n => {
            const [x, y] = pos(n.id), col = n.alive ? ROLE[n.role][1] : 'var(--ink-3)';
            const frac = n.alive && n.role !== 'L' ? Math.max(0, n.timer / n.timeout) : 0, C = 2 * Math.PI * 31;
            s += `<g data-i="${n.id}"><circle cx="${x}" cy="${y}" r="26" fill="${n.alive ? 'var(--surface)' : 'var(--surface-2)'}" stroke="${col}" stroke-width="${lead === n ? 4 : 2.5}" ${n.alive ? '' : 'stroke-dasharray="4 3"'}/>`
              + (frac ? `<circle cx="${x}" cy="${y}" r="31" fill="none" stroke="${col}" stroke-opacity=".55" stroke-width="3" stroke-dasharray="${(C * frac).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 ${x} ${y})"/>` : '')
              + `<text x="${x}" y="${y - 3}" text-anchor="middle" font-size="14" font-weight="700" fill="var(--ink)">${S.nm(n.id)}</text>`
              + `<text x="${x}" y="${y + 13}" text-anchor="middle" font-size="10" fill="var(--ink-2)">${n.alive ? 'T' + n.term + ' ' + n.role : 'DEAD'}</text></g>`;
          });
          q('.rf-svg').innerHTML = s;
          q('.rf-t').textContent = S.now + ' ms';
          q('.rf-l').textContent = lead ? S.nm(lead.id) + ' (term ' + lead.term + ')' : 'none';
          q('.rf-a').textContent = S.alive() + ' / ' + S.MAJ + (S.alive() < S.MAJ ? ' ✗' : ' ✓');
          const cm = S.committed();
          q('.rf-c').textContent = String(cm);
          q('.rf-rows').innerHTML = S.nodes.map(n => `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid var(--line)">
            <strong style="width:28px;font-family:var(--f-mono)">${S.nm(n.id)}</strong>
            <span style="width:150px;color:${n.alive ? ROLE[n.role][1] : 'var(--ink-3)'}">${n.alive ? ROLE[n.role][0] + ', term ' + n.term : 'DEAD (term ' + n.term + ')'}${n.alive && n.role !== 'L' ? ' · ' + Math.max(0, n.timer) + ' ms' : ''}</span>
            <span style="display:flex;flex-wrap:wrap;gap:3px">${n.log.map((e, i) => `<span title="term ${e.term}" style="font:11px var(--f-mono);padding:1px 5px;border-radius:4px;border:1.5px ${i < cm ? 'solid var(--green)' : 'dashed var(--amber)'};color:var(--ink)">${e.val}<sub style="color:var(--ink-3)">t${e.term}</sub></span>`).join('') || '<span style="color:var(--ink-3)">log empty</span>'}</span>
            <button type="button" class="btn small ghost" data-k="${n.id}" style="margin-left:auto">${n.alive ? 'Crash it' : 'Bring back'}</button></div>`).join('');
          q('.rf-log').innerHTML = S.log.slice(-7).reverse().map(l => `<li><span style="font:12px var(--f-mono);color:var(--ink-3)">${l.t} ms</span> ${l.txt}</li>`).join('') || '<li style="color:var(--ink-3)">At the start everyone is a follower, term 0. Each timer (the ring around the server) is running down.</li>';
          q('.rf-play').textContent = timer ? 'Pause' : 'Auto play';
        };
        const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
        const toggle = i => { S.nodes[i].alive ? S.kill(i) : S.revive(i); draw(); };
        q('.rf-next').onclick = () => { stop(); const n0 = S.log.length, t0 = S.now; while (S.log.length === n0 && S.now - t0 < 3000) S.tick(); if (S.log.length === n0) S.log.push({ t: S.now, txt: 'Nothing new in 3 s: the leader is sending heartbeats, all calm. Now crash a server or write.' }); draw(); };
        q('.rf-tick').onclick = () => { stop(); S.tick(); draw(); };
        q('.rf-play').onclick = () => {
          if (timer) { stop(); draw(); return; }
          timer = setInterval(() => { if (!el.isConnected) { stop(); return; } S.tick(); draw(); }, 90);
          draw();
        };
        q('.rf-kill').onclick = () => { const L = S.leader(); if (L) S.kill(L.id); else S.log.push({ t: S.now, txt: 'There is no leader right now.' }); draw(); };
        q('.rf-write').onclick = () => { S.write(); draw(); };
        q('.rf-reset').onclick = () => { stop(); S = T.makeRaft(SEED); draw(); };
        q('.rf-svg').addEventListener('click', e => { const g = e.target.closest && e.target.closest('[data-i]'); if (g) toggle(Number(g.getAttribute('data-i'))); });
        q('.rf-rows').addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-k]'); if (b) toggle(Number(b.getAttribute('data-k'))); });
        S = T.makeRaft(SEED); draw();
      }},
      { type: 'p', html: `With the default seed, the story goes like this: S1 has the shortest timeout (150 ms), so at t = 150 ms it becomes the candidate for term 1, and by 190 ms (two network hops, 20 ms each) it has 3 votes and is the leader. When you write, the entry goes out with the next heartbeat and commits on a majority within 50-90 ms (depending on when the heartbeat left). When you kill the leader, the followers' timers run out within 150-300 ms; sometimes two or three wake up together (split vote) and the next term decides. Leave the leader, crash three followers (only 2 alive): the write stays dashed (uncommitted) in the leader's log. Bring one back: now there are 3, and it commits immediately.` },

      { type: 'h3', text: '3. Network partition: the old leader is left alone' },
      { type: 'p', html: `A crash is the easy case. The hard case: the leader is alive, but the network broke. S1 (leader) and S2 on one side, S3, S4, S5 on the other side. Will two leaders commit two different values?` },
      { type: 'flow', title: 'Raft: partition and majority', height: 330,
        nodes: [
          { id: 'c', label: 'Client', sub: 'xyz.com app', x: 95, y: 45, w: 120, h: 50, kind: 'client', info: 'What it is: the xyz.com app server that writes to etcd (like the email-leader key). It sends writes only to the leader; if it cannot find the leader or times out, it asks another server who the leader is.' },
          { id: 's1', label: 'S1', sub: 'leader, term 1', x: 400, y: 45, w: 120, h: 50, kind: 'data', info: 'What it is: etcd server #1, the current leader (term 1). After the partition (the network breaking) only S2 is with it: 2 of 5. No majority, so it cannot commit anything, even if it believes it is the leader.' },
          { id: 's2', label: 'S2', sub: 'follower', x: 524, y: 135, w: 110, h: 50, kind: 'data', info: 'What it is: etcd server #2, a follower. In the partition it is on the side of S1, so together they are only 2 of 5.' },
          { id: 's3', label: 'S3', sub: 'follower', x: 476, y: 280, w: 110, h: 50, kind: 'data', info: 'What it is: etcd server #3, a follower. In the partition it is on the majority side (S3, S4, S5).' },
          { id: 's4', label: 'S4', sub: 'follower', x: 324, y: 280, w: 110, h: 50, kind: 'data', info: 'What it is: etcd server #4, a follower. On the majority side.' },
          { id: 's5', label: 'S5', sub: 'follower', x: 276, y: 135, w: 110, h: 50, kind: 'data', info: 'What it is: etcd server #5, a follower. On the majority side its timeout runs out first, so it will become the new leader.' },
        ],
        edges: [{ a: 'c', b: 's1' }, { a: 'c', b: 's5' }, { a: 's1', b: 's2' }, { a: 's1', b: 's3' }, { a: 's1', b: 's4' }, { a: 's1', b: 's5' }, { a: 's5', b: 's2' }, { a: 's5', b: 's3' }, { a: 's5', b: 's4' }],
        scenarios: [
          { name: 'Normal write', steps: [
            { title: 'Client → leader', text: 'Writes go only to the leader. S1 added entry #4 to its log (uncommitted).', go: 'c>s1', msg: 'PUT /xyz/email-leader = "worker-2"', after: { s1: { sub: '#4 uncommitted' } } },
            { title: 'AppendEntries', text: 'The leader sends the entry to everyone.', parallel: true, go: ['s1>s2', 's1>s3', 's1>s4', 's1>s5'] },
            { title: '2 acks + itself = 3: commit', text: 'S2 and S3 answered first. Leader + 2 = 3 of 5 = majority. Entry COMMITTED. It does not matter if S4 and S5 answer later.', parallel: true, go: ['res:s2>s1', 'res:s3>s1'], after: { s1: { state: 'ok', sub: '#4 committed' }, s2: { sub: 'has #4' }, s3: { sub: 'has #4' } } },
            { title: 'OK to the client', text: 'Now this value will never flip. Whoever becomes the next leader will have #4 in its log (see "safety" below).', go: 'res:s1>c' },
          ]},
          { name: 'Partition', intro: 'The network broke: {S1, S2} | {S3, S4, S5}.', steps: [
            { title: 'Network broken', text: 'Messages from S1 do not reach S3, S4, S5.', parallel: true, go: ['lost:s1>s3', 'lost:s1>s4', 'lost:s1>s5'], set: { s3: { state: 'dim' }, s4: { state: 'dim' }, s5: { state: 'dim' } } },
            { title: 'Client writes to S1', text: 'S1 added entry #5 (x=9); it reached only S2. 2 of 5: no commit. The client waits.', go: ['c>s1', 's1>s2', 'res:s2>s1'], after: { s1: { state: 'warn', sub: '#5 stuck (2/5)' }, s2: { sub: '#5 uncommitted' } } },
            { title: 'Majority side: election', text: 'S3, S4, S5 got no heartbeat. The timeout of S5 runs out first: candidate for term 2. S3 and S4 vote: 3 of 5. A new leader.', set: { s3: { state: '' }, s4: { state: '' }, s5: { state: 'warn', sub: 'candidate T2' } }, parallel: true, go: ['s5>s3', 's5>s4', 'res:s3>s5', 'res:s4>s5'], after: { s5: { state: 'ok', sub: 'LEADER, term 2' } } },
            { title: 'Client retries on S5', text: 'The client timed out and wrote to the new leader S5 (y=7). S3 and S4 acked: commit. There are two "leaders", but only the one with a majority can commit. Split brain is avoided.', go: ['c>s5', 's5>s3', 'res:s3>s5', 'res:s5>c'], after: { s3: { sub: 'has y=7' } } },
            { title: 'Network fixed', text: 'A heartbeat from S5 (term 2) reached S1. S1: "my term is 1, this is 2". It becomes a follower at once. Its uncommitted entry x=9 is overwritten by the log of S5: it was never committed, so nobody was lied to.', parallel: true, go: ['s5>s1', 's5>s2'], after: { s1: { state: '', sub: 'follower, term 2' }, s2: { sub: 'x=9 erased' } } },
          ]},
          { name: 'Leader crash', steps: [
            { title: 'S1 crashes', text: 'Heartbeats stop.', set: { s1: { state: 'down', sub: 'CRASHED' } }, go: 'lost:s1>s5' },
            { title: 'Random timeouts', text: 'Every follower has a different timer. The one of S5 runs out first: candidate, term 2.', set: { s5: { state: 'warn', sub: 'candidate T2' } }, parallel: true, go: ['s5>s2', 's5>s3', 's5>s4'] },
            { title: 'Votes', text: 'S2, S3 and S4 have not voted for anyone in term 2 yet, and the log of S5 is as new as theirs: vote granted. 4 of 5.', parallel: true, go: ['res:s2>s5', 'res:s3>s5', 'res:s4>s5'], after: { s5: { state: 'ok', sub: 'LEADER, term 2' } } },
            { title: 'Client on the new leader', text: 'Downtime ≈ election timeout + one round trip, that is, from milliseconds to a few seconds (depends on the config). That is why the Raft paper says: broadcast time ≪ election timeout ≪ the average time between machine failures.', go: ['c>s5', 'res:s5>c'] },
          ]},
        ],
      },
      { type: 'callout', tone: 'why', title: 'Why safety works: a committed entry never disappears', html: `A committed entry is on at least 3 servers. To become the new leader, a server also needs 3 votes. Out of 5, any two groups of "3" share <strong>at least one server</strong>. That shared server will only vote for a candidate whose log is at least as new as its own (the election restriction). So whoever becomes leader will have every committed entry. And a leader never deletes anything from its own log. The paper calls this "Leader Completeness". (There is also a subtle rule: a new leader does not treat entries from older terms as committed just by counting copies; older entries count as committed only once an entry from its own term commits.)` },
      { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "the leader wrote it = it is saved"', html: `Being in the leader's log is not a commit. In the partition scenario S1 wrote x=9, but it did not reach a majority and was erased later. The client gets "OK" only after the commit. In the same way, reading straight from the leader is also risky if it has quietly become an old leader; systems like etcd first confirm with a majority that they are still the leader before serving linearizable reads (reads that "always return the newest value").` },

      { type: 'h2', text: 'How many nodes? Odd numbers and (N−1)/2' },
      { type: 'table', head: ['N (servers)', 'Majority', 'How many can fail', 'Comment'], rows: [
        ['1', '1', '0', 'No fault tolerance'],
        ['3', '2', '1', 'The most common small setup'],
        ['4', '3', '1', 'Same tolerance as 3, one extra machine wasted'],
        ['5', '3', '2', 'Common for production etcd/ZooKeeper'],
        ['7', '4', '3', 'Every write waits for 4 answers: slow; rarely used'],
      ], caption: 'Majority = ⌊N/2⌋ + 1. Tolerates ⌊(N − 1)/2⌋ failures.' },
      { type: 'p', html: `<strong>Worked example:</strong> N = 5. Majority = ⌊5/2⌋ + 1 = 3. So 5 − 3 = <strong>2 servers can fail</strong>, which equals (5 − 1)/2 = 2. Now N = 6: majority = 4, so 6 − 4 = 2 can fail. You paid for one extra machine, and tolerance grew by zero. That is why we use <strong>odd numbers</strong>. Crash some servers yourself below:` },
      { type: 'custom', render(el) {
        el.innerHTML = `<label>Servers in the cluster (N): <strong class="cq-nv"></strong></label><input class="cq-n" type="range" min="1" max="9" step="1" value="5">
          <svg class="cq-svg" viewBox="0 0 340 70" style="width:100%;max-width:520px;display:block;margin:8px 0;cursor:pointer" role="img" aria-label="Servers in the cluster"></svg>
          <div class="stats"><div class="stat"><span>Majority</span><strong class="cq-m"></strong></div><div class="stat"><span>How many can fail</span><strong class="cq-f"></strong></div><div class="stat"><span>Alive</span><strong class="cq-a"></strong></div><div class="stat"><span>Writes?</span><strong class="cq-w"></strong></div></div>
          <div class="calc-note cq-note"></div>`;
        const q = c => el.querySelector(c), nIn = q('.cq-n');
        let dead = new Set();
        const draw = () => {
          const N = Number(nIn.value), r = T.quorum(N, dead.size);
          q('.cq-nv').textContent = N;
          const gap = 340 / N;
          q('.cq-svg').innerHTML = Array.from({ length: N }, (_, i) => { const x = gap * i + gap / 2, d = dead.has(i);
            return `<g data-i="${i}"><circle cx="${x}" cy="32" r="${Math.min(22, gap / 2 - 4)}" fill="${d ? 'var(--surface-2)' : 'var(--surface)'}" stroke="${d ? 'var(--ink-3)' : r.ok ? 'var(--green)' : 'var(--red)'}" stroke-width="2.5" ${d ? 'stroke-dasharray="4 3"' : ''}/><text x="${x}" y="37" text-anchor="middle" font-size="13" font-weight="700" fill="${d ? 'var(--ink-3)' : 'var(--ink)'}">${d ? '✗' : 'S' + (i + 1)}</text></g>`; }).join('');
          q('.cq-m').textContent = r.maj; q('.cq-f').textContent = r.tol; q('.cq-a').textContent = r.alive + ' / ' + N;
          q('.cq-w').textContent = r.ok ? 'working ✓' : 'STOPPED ✗';
          q('.cq-note').textContent = (r.ok ? 'A majority is alive: a leader can be elected and writes commit. ' : 'No majority left: no leader, writes have stopped. Stopping is better than giving wrong answers (safety). ')
            + (N % 2 === 0 ? N + ' servers also survive only ' + r.tol + ' failure(s), the same as ' + (N - 1) + '. One machine is wasted.' : 'Click any server to crash it or bring it back.');
        };
        nIn.addEventListener('input', () => { dead = new Set(); draw(); });
        q('.cq-svg').addEventListener('click', e => { const g = e.target.closest && e.target.closest('[data-i]'); if (!g) return; const i = Number(g.getAttribute('data-i')); dead.has(i) ? dead.delete(i) : dead.add(i); draw(); });
        draw();
      }},
      { type: 'p', html: `There is one more interactive widget about odd numbers and partitions in the "Leader election, locks, Redis Sentinel" lesson. The thing to remember: more nodes = survive more failures, but every write waits for more servers, so writes get slower. We do not grow consensus clusters for reads or traffic.` },

      { type: 'h2', text: 'Paxos (just to know it)' },
      { type: 'p', html: `Before Raft, consensus meant <strong>Paxos</strong>, an algorithm by Leslie Lamport (paper "The Part-Time Parliament", published in 1998; the easier version "Paxos Made Simple", 2001). Raft and Paxos have the same heart: <strong>decide by majority</strong>. The difference: in Paxos no fixed boss is needed; any server can "propose" a value.` },
      { type: 'callout', tone: 'term', title: 'New words: Proposer, Acceptor, Learner', html: `<strong>What it is:</strong> the three roles in Paxos (one machine can play several roles).<br><strong>Proposer:</strong> suggests a value ("leader = worker-1").<br><strong>Acceptor:</strong> a voter. The value that a majority of acceptors accept is <strong>chosen</strong> (final).<br><strong>Learner:</strong> only needs to learn the final value.<br><strong>Why we need it:</strong> even if two proposers say different values at the same time, only one value becomes final.<br><strong>Without it:</strong> whoever shouts first wins; because of network delays, different servers could believe in different "winners".` },
      { type: 'p', html: `In plain words, Paxos runs two rounds for one value:` },
      { type: 'steps', items: [
        { t: 'Round 1: Prepare / Promise', d: 'The proposer picks a proposal number n (bigger than before each time) and tells the acceptors "prepare(n)". It means: "I want to speak with number n". A majority promises: "we will not listen to numbers smaller than n any more". With the promise, they also say which value they accepted before, if any.' },
        { t: 'Round 2: Accept / Accepted', d: 'Now the proposer sends a value. <strong>The most important rule:</strong> if any acceptor accepted a value before, the proposer must send <em>that old value</em> with the biggest number, not its own. Only if there is no old value can it send its own. If a majority accepts, the value is <strong>chosen</strong>. Learners are told.' },
      ]},
      { type: 'p', html: `"Drop your own value, send the old one" feels strange. This is the secret of Paxos safety. Watch it step by step: two proposers are trying to pick the "email leader" at the same time:` },
      { type: 'custom', render(el) {
        const ST = [
          { t: 'Start: three acceptors (A1, A2, A3), majority = 2. P1 wants "worker-1", P2 wants "worker-2".', a: [[0, null], [0, null], [0, null]] },
          { t: 'P1 → prepare(1) to everyone. All promise: "we will not listen to anything smaller than 1". Nobody had accepted anything before.', a: [[1, null], [1, null], [1, null]] },
          { t: 'P1 → accept(1, "worker-1"). A1 and A2 accepted: 2 of 3 = majority. <strong>"worker-1" is CHOSEN.</strong> But P1 crashed before telling anyone, and the message never reached A3.', a: [[1, [1, 'worker-1']], [1, [1, 'worker-1']], [1, null]], ch: 'worker-1' },
          { t: 'P2 knows nothing. It sends prepare(2). A1 is slow, A2 and A3 answer (a majority). A2 says: "I accepted (1, worker-1) before". This is no accident: any majority (2 of 3) must touch at least one of {A1, A2}.', a: [[1, [1, 'worker-1']], [2, [1, 'worker-1']], [2, null]], ch: 'worker-1' },
          { t: 'Rule: P2 must send <strong>"worker-1"</strong>, not its own "worker-2". accept(2, "worker-1") → A2 and A3 accept. If P2 had sent its own value, a value that was already CHOSEN would change: safety would break.', a: [[1, [1, 'worker-1']], [2, [2, 'worker-1']], [2, [2, 'worker-1']]], ch: 'worker-1' },
          { t: 'The old accept(1) from P1 finally reaches A3, late. A3 promised 2, and 1 &lt; 2: <strong>REJECT</strong>. In the end A1 also gets accept(2). Everyone agrees on "worker-1".', a: [[2, [2, 'worker-1']], [2, [2, 'worker-1']], [2, [2, 'worker-1']]], ch: 'worker-1' },
        ];
        el.innerHTML = `<div class="px-tab" style="overflow-x:auto"></div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"><button type="button" class="btn small ghost px-p">Back</button><button type="button" class="btn small primary px-n">Next</button><button type="button" class="btn small ghost px-r">Reset</button></div>
          <div class="calc-note px-t" style="min-height:44px"></div>`;
        let k = 0;
        const draw = () => {
          const s = ST[k];
          el.querySelector('.px-tab').innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:13px"><tr><th style="text-align:left;padding:4px">Acceptor</th><th style="text-align:left;padding:4px">Promise</th><th style="text-align:left;padding:4px">Accepted</th></tr>`
            + s.a.map((r, i) => `<tr style="border-top:1px solid var(--line)"><td style="padding:4px"><strong>A${i + 1}</strong></td><td style="padding:4px;font-family:var(--f-mono)">${r[0] ? '≥ ' + r[0] : '-'}</td><td style="padding:4px;font-family:var(--f-mono);color:${r[1] ? 'var(--green)' : 'var(--ink-3)'}">${r[1] ? '(' + r[1][0] + ', ' + r[1][1] + ')' : 'nothing'}</td></tr>`).join('')
            + `</table><div class="stats"><div class="stat"><span>Step</span><strong>${k} / ${ST.length - 1}</strong></div><div class="stat"><span>Chosen value</span><strong>${s.ch || 'none yet'}</strong></div></div>`;
          el.querySelector('.px-t').innerHTML = s.t;
        };
        el.querySelector('.px-n').onclick = () => { if (k < ST.length - 1) k++; draw(); };
        el.querySelector('.px-p').onclick = () => { if (k > 0) k--; draw(); };
        el.querySelector('.px-r').onclick = () => { k = 0; draw(); };
        draw();
      }},
      { type: 'p', html: `That is enough for one value. To run a whole log there is <strong>Multi-Paxos</strong>, in which a stable leader skips the first round again and again, and it then looks a lot like Raft. Google's Chubby lock service and Spanner run on Paxos; ZooKeeper's ZAB protocol is from the same family. For an interview this is enough: <strong>Paxos and Raft both rely on a majority and survive (N−1)/2 failures; Raft was designed to be easier to understand and build</strong>.` },

      { type: 'h2', text: 'Google Spanner and TrueTime (just to know it)' },
      { type: 'p', html: `Remember the problem from the start: clocks are wrong, so we cannot order by timestamp. In Spanner (an OSDI paper from 2012) Google took the opposite road: <strong>make the clock so good, and measure its error so clearly, that the timestamp can be trusted</strong>. Note: these details come from the 2012 paper; today Spanner is offered as a managed database on Google Cloud.` },
      { type: 'callout', tone: 'term', title: 'New word: TrueTime', html: `<strong>What it is:</strong> Google's time API. A normal clock says "it is 10:00:05.000 now". TrueTime's <code>TT.now()</code> says: "now is somewhere between <strong>[earliest, latest]</strong>", and guarantees that the real time is inside this interval. Half the width of the interval is called <strong>ε</strong> (epsilon, "the error limit").<br><strong>Why we need it:</strong> when you know the exact size of the error, you can wait that long and then trust timestamps.<br><strong>Without it:</strong> a normal NTP clock has no guaranteed upper limit on its error; its timestamps cannot order transactions across the world.<br><strong>How:</strong> every datacenter has time masters with <strong>GPS receivers</strong> or <strong>atomic clocks</strong> (the two fail in different ways, so both are used). Every machine syncs with them every 30 seconds, and in between it grows ε by assuming the worst-case drift (200 µs per second). In the paper's production data, ε moved like a saw (sawtooth) between 1 and 7 ms, about 4 ms most of the time.` },
      { type: 'image', src: 'assets/img/consensus/nist-f1-atomic-clock.jpg', maxWidth: 300, alt: 'The NIST-F1 atomic clock: a tall metal machine in a lab, with pipes and instruments around it.', caption: 'An atomic clock (NIST-F1, the US time standard from 1999). It counts the perfectly fixed "vibration" of atoms, so it is far more accurate than quartz. Spanner\'s time masters also use atomic clocks (but small ones that fit in a rack).', credit: { text: 'NIST (US government), Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Nist-f1.jpg', license: 'Public domain' } },
      { type: 'ascii', text: `
Commit wait (Spanner)

TT.now() = [ earliest ........ latest ]      ε ≈ 4 ms on each side
                                   ^
                                   s = commit timestamp (not less than latest)

wait ..... until TT.now().earliest > s   (TT.after(s) = true)
                                   |<-- about 2ε -->|
Only now show the data. Certain: real time has passed s.` },
      { type: 'p', html: `The benefit: if transaction T1 committed and T2 started <em>after that</em> (in real time), then the timestamp of T2 is always bigger than that of T1, in any datacenter in the world. This is called <strong>external consistency</strong>. The price: a wait of a few milliseconds on every write commit (in one test in the paper, commit wait was ~5 ms), and this wait overlaps with the network work of Paxos. One more subtle price: the lock on that row is held until the wait ends, so back-to-back writes on <em>one single row</em> cannot go faster than about 1000 / (2ε) per second (the third number in the widget below). Systems without TrueTime (like CockroachDB) approximate this in other ways: hybrid logical clocks (physical time + a Lamport-style counter, combined) and retrying reads that fall inside the error limit.` },
      { type: 'p', html: `<strong>Worked example:</strong> ε = 4 ms. At commit, TT.now() = [96, 104] (real time 100, in ms). Spanner takes the timestamp s = 104 (latest). Now it waits until earliest moves past 104: at real time 108 the interval is [104, 112], and just after that earliest &gt; 104. Wait = 108 − 100 = <strong>8 ms = 2ε</strong>. The better the clock (smaller ε), the shorter the wait. Try the slider:` },
      { type: 'custom', render(el) {
        el.innerHTML = `<label>Clock error ε: <strong class="tt-ev"></strong></label><input class="tt-e" type="range" min="1" max="100" step="1" value="4">
          <svg class="tt-svg" viewBox="0 0 340 120" style="width:100%;max-width:560px;display:block;margin:8px 0" role="img" aria-label="TrueTime commit wait timeline"></svg>
          <div class="stats"><div class="stat"><span>Commit timestamp s</span><strong class="tt-s"></strong></div><div class="stat"><span>Commit wait</span><strong class="tt-w"></strong></div><div class="stat"><span>Max back-to-back writes on one row</span><strong class="tt-r"></strong></div></div>
          <div class="calc-note tt-note"></div>`;
        const q = c => el.querySelector(c), e = q('.tt-e');
        const upd = () => {
          const r = T.commitWait(Number(e.value), 100), X = v => 20 + (v - r.t0 + r.eps * 1.2) / (r.eps * 4.6) * 300;
          q('.tt-ev').textContent = r.eps + ' ms';
          q('.tt-svg').innerHTML = `<line x1="10" y1="100" x2="330" y2="100" stroke="var(--line-2)" stroke-width="1.5"/>
            <text x="10" y="116" font-size="10" fill="var(--ink-3)">real time →</text>
            <rect x="${X(r.t0 - r.eps)}" y="22" width="${X(r.t0 + r.eps) - X(r.t0 - r.eps)}" height="16" rx="4" fill="var(--accent-soft)" stroke="var(--accent)"/>
            <text x="${X(r.t0 - r.eps)}" y="16" font-size="10" fill="var(--ink-2)">TT.now() at commit</text>
            <rect x="${X(r.t0 + 2 * r.eps - r.eps)}" y="58" width="${X(r.t0 + 3 * r.eps) - X(r.t0 + r.eps)}" height="16" rx="4" fill="var(--accent-soft)" stroke="var(--green)"/>
            <text x="${X(r.t0 + r.eps)}" y="52" font-size="10" fill="var(--ink-2)">TT.now() after the wait</text>
            <line x1="${X(r.s)}" y1="10" x2="${X(r.s)}" y2="100" stroke="var(--red)" stroke-width="2" stroke-dasharray="4 3"/><text x="${X(r.s) + 4}" y="94" font-size="10" fill="var(--red)">s</text>
            <circle cx="${X(r.t0)}" cy="100" r="4" fill="var(--ink)"/><circle cx="${X(r.t0 + r.wait)}" cy="100" r="4" fill="var(--green)"/>`;
          q('.tt-s').textContent = 'real + ' + r.eps + ' ms'; q('.tt-w').textContent = r.wait + ' ms';
          q('.tt-r').textContent = '≈ ' + r.perSec + ' / s';
          q('.tt-note').textContent = r.eps <= 7 ? 'A Spanner-like clock (ε 1-7 ms): only a few milliseconds of wait per commit, which overlaps with the network work.' : 'A normal NTP-like clock (ε of tens of ms): a wait of ' + r.wait + ' ms on every commit. That is why TrueTime needed GPS + atomic clocks.';
        };
        e.addEventListener('input', upd); upd();
      }},

      { type: 'h2', text: 'Decide' },
      { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>Never build consensus yourself.</strong> Building (and testing) Raft/Paxos correctly is years of work. For leader election, config, locks and membership, use <strong>etcd or ZooKeeper</strong> (or the built-in one of the database/queue you already use, like Kafka KRaft). And remember: majority-based systems need an <strong>odd number of nodes (3 or 5)</strong>, and they survive <strong>(N − 1) / 2 failures</strong>.` },
      { type: 'table', head: ['Need', 'What to use'], rows: [
        ['Measuring a duration / timeout', 'Monotonic clock, never the wall clock'],
        ['A total order of "who came first", inside one system', 'The index in the leader\'s log, or Lamport timestamp + node ID'],
        ['Catching concurrent writes (multi-leader / leaderless)', 'Vector clocks / version vectors, or CRDTs'],
        ['Leader election, locks, config, service membership', 'etcd / ZooKeeper (Raft / ZAB inside)'],
        ['Globally ordered transactions, many regions', 'Spanner (TrueTime), or DBs like CockroachDB'],
        ['Is LWW fine? (like count, last seen)', 'Yes, if losing a write once in a while is OK'],
      ]},
      { type: 'ascii', text: `
xyz.com now

App servers ──> etcd cluster (5 nodes, Raft, 2+2+1 across 3 zones)
                  • email-leader key (lease)      • feature config
                  • fencing tokens (revision)      • service membership
Kafka (KRaft controller quorum, Raft-based) ──> events, ordered per partition
Databases: the leader's log = source of order; timeouts use the monotonic clock` },

      { type: 'diagram', title: 'Consensus and clocks: the whole picture', height: 600,
        groups: [
          { label: 'xyz.com apps', x: 20, y: 14, w: 690, h: 104 },
          { label: 'DB copies', x: 25, y: 246, w: 180, h: 236 },
          { label: 'etcd: Raft, 5 servers', x: 245, y: 160, w: 465, h: 230 },
          { label: 'Time', x: 365, y: 486, w: 210, h: 104 },
        ],
        nodes: [
          { id: 'users', label: 'Users', sub: 'phone, laptop', x: 150, y: 70, w: 140, kind: 'client', info: 'What it is: xyz.com users, like Riya. They change captions and like things. Their writes can go to different servers and different regions.' },
          { id: 'app', label: 'App servers', sub: 'timeouts: monotonic', x: 400, y: 70, w: 150, kind: 'server', info: 'What it is: the xyz.com code. It measures durations and timeouts with the monotonic clock. It does not make leader / lock / config decisions by itself; it asks etcd.' },
          { id: 'workers', label: 'Email workers', sub: 'watch leader key', x: 640, y: 70, w: 130, kind: 'queue', info: 'What it is: 3 workers that send emails. Only the one whose name is in the email-leader key in etcd sends. When the key changes, an etcd watch tells them at once.' },
          { id: 's1', label: 'S1 leader', sub: 'term 3', x: 480, y: 220, w: 120, kind: 'data', info: 'What it is: the current Raft leader of etcd. All writes come here. It sends each entry to the followers and commits it on a majority (3 of 5).' },
          { id: 's2', label: 'S2', sub: 'follower, zone A', x: 325, y: 220, w: 120, kind: 'data', info: 'What it is: an etcd follower. It copies the leader\'s list and starts an election if heartbeats stop. It sits in a different zone, so a majority survives if one zone fails.' },
          { id: 's3', label: 'S3', sub: 'follower, zone B', x: 635, y: 220, w: 120, kind: 'data', info: 'What it is: an etcd follower in zone B. The 5 servers are split 2 + 2 + 1 across three zones.' },
          { id: 's4', label: 'S4', sub: 'follower, zone A', x: 400, y: 340, w: 120, kind: 'data', info: 'What it is: an etcd follower. Its ack helps the leader reach a majority.' },
          { id: 's5', label: 'S5', sub: 'follower, zone C', x: 560, y: 340, w: 120, kind: 'data', info: 'What it is: an etcd follower in zone C. If the leader fails and its random timeout runs out first, it becomes a candidate and can become the new leader.' },
          { id: 'dbm', label: 'DB Mumbai', sub: 'version vectors', x: 115, y: 300, w: 150, kind: 'data', info: 'What it is: the Mumbai copy of the caption data. Writes can happen here too. Every version carries a vector clock, so a conflict with Chennai can be caught (instead of LWW).' },
          { id: 'dbc', label: 'DB Chennai', sub: 'version vectors', x: 115, y: 440, w: 150, kind: 'data', info: 'What it is: the Chennai copy of the caption data. On sync the vectors are compared: older, newer, or concurrent (keep both).' },
          { id: 'ntp', label: 'Time servers', sub: 'NTP, GPS / atomic', x: 470, y: 540, w: 170, kind: 'net', info: 'What it is: servers that give the correct time (NTP). They keep the wall clocks of machines right for logs and expiry. But order is not decided by them: that is done by logical clocks and Raft.' },
        ],
        edges: [
          { a: 'users', b: 'app', n: 1, label: 'edit' },
          { a: 'app', b: 's1', n: 2, label: 'PUT key' },
          { a: 's1', b: 's2' },
          { a: 's1', b: 's3' },
          { a: 's1', b: 's4', label: 'AppendEntries' },
          { a: 's1', b: 's5' },
          { a: 's5', b: 's4', dashed: true },
          { a: 's5', b: 's3', dashed: true },
          { a: 's1', b: 'workers', kind: 'evt', label: 'watch leader' },
          { a: 'app', b: 'dbm', n: 3, label: 'caption', via: [[230, 150]] },
          { a: 'dbm', b: 'dbc', both: true, label: 'sync + vectors' },
          { a: 'ntp', b: 'dbc', dashed: true, label: 'clock sync' },
          { a: 'ntp', b: 'dbm', dashed: true },
        ],
        paths: [
          { name: 'Leader key (Raft)', text: 'The app wrote to the etcd leader S1. S1 sent the entry to all followers; it commits on 3 of 5. The workers learned the new leader through a watch.', go: ['users>app>s1', 's1>s2', 's1>s3', 's1>s4', 's1>s5', 's1>workers'] },
          { name: 'Leader crash', text: 'S1 failed. The random timeout of S5 ran out first: term +1, votes from S3 and S4, 3 of 5 (counting itself). A new leader.', go: ['s5>s4', 's5>s3'] },
          { name: 'Caption (vectors)', text: 'The caption was written to the Mumbai copy. On sync with Chennai the vectors are compared: if concurrent, both versions are kept; nothing is silently thrown away.', go: ['users>app>dbm', 'dbm>dbc'] },
          { name: 'Time sync', text: 'Machines keep their wall clocks right with NTP (for logs, expiry). We do not trust them for order.', go: ['ntp>dbm', 'ntp>dbc'] },
        ],
      },
      { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
        <li>Physical clocks drift (ppm), NTP only estimates, and a clock can even jump backwards. Do not trust "bigger timestamp = happened later".</li>
        <li>Always measure durations / timeouts with the monotonic clock.</li>
        <li>Lamport clock: if a → b then L(a) &lt; L(b). The reverse is not true. For a total order use (L, node ID).</li>
        <li>Vector clocks tell you: older, newer, or concurrent (a conflict). LWW can silently lose data.</li>
        <li>Raft: one leader per term, random election timeouts, majority votes, commit on a majority. A committed entry is never erased.</li>
        <li>Majority = ⌊N/2⌋ + 1, tolerance = (N − 1)/2. Use odd sizes (3, 5). Without a majority the system stops; it does not give wrong answers.</li>
        <li>Paxos: the same majority idea, two rounds; a proposer must carry forward an old accepted value. Spanner TrueTime: a known error size ε, and a wait of ~2ε on commit.</li>
        <li>Decide: never build consensus yourself. Use etcd / ZooKeeper.</li>
      </ul>` },

      { type: 'tradeoffs',
        gains: ['Logical clocks (Lamport, vector) give a correct causal order without any clock', 'Raft/Paxos: a correct decision while a majority is alive, no split brain', 'Committed data never flips (safety), even after crashes and partitions', 'Automatic leader failover, no human needed', 'Globally ordered transactions with a clock like TrueTime'],
        costs: ['A majority round trip on every write: latency, and even more across far regions', 'Without a majority the system stops (gives up availability for safety)', 'Leader bottleneck: all writes go through one machine', 'Very hard to build correctly: use a ready-made one (etcd/ZooKeeper)', 'Vector clocks grow with the number of nodes; TrueTime needs special hardware'] },
      { type: 'think', questions: [
        { q: 'The xyz.com etcd cluster has 5 nodes: 3 in the Mumbai DC, 2 in the Chennai DC. The whole Mumbai DC goes down. What happens, and what is a better layout?', a: 'Chennai has 2 of 5 left, and a majority needs 3. No leader can be elected, so writes stop (reads too, if they must be linearizable). Better: 2 + 2 + 1 across three separate failure zones. If any one zone fails, 3 remain.' },
        { q: 'A candidate has an old log (it missed the last 3 committed entries because it was down). Can it become the leader?', a: 'No. The committed entries are on a majority, and becoming leader needs votes from a majority; the two majorities share at least one server that has those entries. Because of the election restriction, that server will not vote for the candidate with the old log. So a leader always arrives with all committed entries.' },
        { q: 'One xyz.com server syncs NTP with a time server in Singapore. The path there takes 80 ms, the path back takes 20 ms. How wrong will NTP be, and what will you do?', a: 'Error = (80 − 20) / 2 = 30 ms, and NTP will not even know (it assumes both directions are equal). Fix: use a nearby time server (the cloud provider\'s own, in the same region), so the delay itself is small; the error is never more than delay/2.' },
        { q: 'Would Lamport timestamps fix the LWW caption problem?', a: 'Partly. If the second edit was made "after seeing" the first (causally later), its Lamport number is bigger and LWW picks correctly. But if two edits are concurrent (from different devices, without knowing each other), Lamport just lets one win at random, without saying there was a conflict. To catch the conflict you need vector clocks.' },
      ]},
      { type: 'quiz', questions: [
        { q: 'Which clock should measure how long a request took?', options: ['Wall clock (time of day)', 'Monotonic clock', 'Lamport clock', 'Any of them'], answer: 1, explain: 'The wall clock can jump backwards because of NTP, so a duration can come out negative (Cloudflare 2017). The monotonic clock only moves forward.' },
        { q: 'L(a) = 3 and L(b) = 5 (Lamport). What is certain?', options: ['a → b', 'b → a', 'b → a cannot be true', 'a and b are concurrent'], answer: 2, explain: 'If b → a were true, L(b) would have to be smaller than L(a). But a → b is not certain either: they may be concurrent (like e9 and e8 in the widget).' },
        { q: 'When is an entry considered committed in Raft?', options: ['When the leader writes it to its own log', 'When all 5 servers have it', 'When the leader of the current term has copied it to a majority of logs', 'When the client ACKs it'], answer: 2, explain: 'Replication to a majority (in the leader\'s current term) = commit. No need to wait for all servers; the leader writing it alone is not enough.' },
        { q: 'How many failures can a 6-node Raft cluster survive?', options: ['3', '2', '1', '5'], answer: 1, explain: 'Majority = 4, so 2 can fail. The same as 5 nodes. That is why we use odd numbers.' },
        { q: 'Why are election timeouts random in Raft?', options: ['For security', 'So that usually only one server becomes a candidate first and split votes are rare', 'So that the leader lasts longer', 'To fix clock skew'], answer: 1, explain: 'If everyone wakes up together, the votes split. With randomness one usually wins; if a split happens, the next round with new random timeouts settles it.' },
        { q: 'The Mumbai copy has version [M 3, C 1], the Chennai copy has [M 2, C 2]. What happens on sync?', options: ['Mumbai wins, 3 is bigger', 'Chennai wins, it came later', 'Concurrent: keep both versions', 'Take the average of both'], answer: 2, explain: 'In the M position Mumbai is bigger (3 > 2), in the C position Chennai is bigger (2 > 1). Neither is fully bigger than the other: concurrent, which means a conflict.' },
        { q: 'In Paxos, the replies to its prepare tell P2 that one acceptor had already accepted (1, "worker-1"). P2 itself wants "worker-2". What will it send?', options: ['"worker-2", because its number 2 is bigger', '"worker-1", the old accepted value', 'Nothing, it will stop', 'Both values'], answer: 1, explain: 'The rule: carry forward the earlier accepted value with the biggest number. "worker-1" may already have been chosen; changing it would break safety.' },
        { q: 'The round trip delay between a client and an NTP server is 40 ms. At most, how wrong can the NTP offset be?', options: ['40 ms', '20 ms', '10 ms', '0, NTP is always right'], answer: 1, explain: 'Error = (going − coming back)/2, which can never be more than delay/2. 40/2 = 20 ms.' },
        { q: 'What does Spanner\'s "commit wait" do?', options: ['Waits for acks from a majority', 'After choosing commit timestamp s, holds back the data until TT.after(s) is true', 'Waits for an NTP sync', 'Waits for a leader election'], answer: 1, explain: 'This makes sure that s has really passed in real time, so any transaction that starts later gets a bigger timestamp (external consistency). The wait is about 2ε.' },
      ]},
      { type: 'sources', note: 'The Raft rules, numbers (150-300 ms, 33 of 43 students) and Spanner TrueTime details were checked against the original papers.', items: [
        { title: 'In Search of an Understandable Consensus Algorithm (Extended Version)', publisher: 'Diego Ongaro, John Ousterhout (Stanford), USENIX ATC 2014', year: 2014, url: 'https://raft.github.io/raft.pdf', used: 'Roles, terms, randomized election timeouts (150-300 ms example), one vote per term, election restriction, AppendEntries consistency check, commit on majority (current-term rule), Leader Completeness, broadcastTime ≪ electionTimeout ≪ MTBF, five-server example, user study.' },
        { title: 'The Raft Consensus Algorithm', publisher: 'raft.github.io', official: true, url: 'https://raft.github.io/', used: 'Overview, visualisation idea, list of implementations.' },
        { title: 'Spanner: Google\'s Globally-Distributed Database', publisher: 'OSDI 2012 paper (Google)', year: 2012, url: 'https://static.googleusercontent.com/media/research.google.com/en//archive/spanner-osdi2012.pdf', used: 'TrueTime API (TT.now interval, TT.after/before), GPS + atomic clock masters, 30 s poll, 200 µs/s drift, ε sawtooth 1-7 ms (~4 ms), commit-wait rule, external consistency, ~5 ms commit wait in microbenchmarks, Paxos groups.' },
        { title: 'Time, Clocks, and the Ordering of Events in a Distributed System', publisher: 'Leslie Lamport, Communications of the ACM', year: 1978, url: 'https://lamport.azurewebsites.net/pubs/time-clocks.pdf', used: 'Happened-before relation, logical clock rules, total ordering with process-ID tie-break.' },
        { title: 'Paxos Made Simple', publisher: 'Leslie Lamport', year: 2001, url: 'https://lamport.azurewebsites.net/pubs/paxos-simple.pdf', used: 'Proposers, acceptors, learners; prepare/promise and accept phases.' },
        { title: 'How and why the leap second affected Cloudflare DNS', publisher: 'Cloudflare blog', official: true, year: 2017, url: 'https://blog.cloudflare.com/how-and-why-the-leap-second-affected-cloudflare-dns/', used: 'Negative duration from non-monotonic time at the 2016/2017 leap second, panic in server selection, fix.' },
        { title: 'Leap Smear', publisher: 'Google Public NTP documentation', official: true, url: 'https://developers.google.com/time/smear', used: '24-hour linear noon-to-noon smear, ~11.6 ppm frequency change within normal quartz error.' },
        { title: 'RFC 5905: Network Time Protocol Version 4', publisher: 'IETF', official: true, year: 2010, url: 'https://datatracker.ietf.org/doc/html/rfc5905', used: 'Four timestamps T1-T4, offset and delay formulas, stratum levels.' },
        { title: 'Clock State Machine (ntpd documentation)', publisher: 'David L. Mills, University of Delaware', url: 'https://www.eecis.udel.edu/~mills/ntp/html/clock.html', used: 'Default step threshold 128 ms, slewing below it, kernel slew limit 500 ppm.' },
        { title: 'Dynamo: Amazon\'s Highly Available Key-value Store (SOSP 2007)', publisher: 'Amazon', year: 2007, url: 'https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf', used: 'Vector clocks to detect conflicting versions and return siblings to the application.' },
        { title: 'Resolution 4 of the 27th CGPM (2022): on the use and future development of UTC', publisher: 'BIPM', official: true, year: 2022, url: 'https://www.bipm.org/en/cgpm-2022/resolution-4', used: 'Decision to stop adding leap seconds by 2035.' },
        { title: 'Apache Kafka 4.0.0 Release Announcement', publisher: 'Apache Kafka blog', official: true, year: 2025, url: 'https://kafka.apache.org/blog/2025/03/18/apache-kafka-4.0.0-release-announcement/', used: 'Kafka 4.0 runs without ZooKeeper, KRaft mode by default.' },
      ]},
    ],
  });
})();
