(function () {
  /* ---------- pure helpers (exported as _test for the verification script) ---------- */

  // Lamport + vector clocks over a fixed script. P = process index (0=A,1=B,2=C)
  const LSCRIPT = [
    { p: 0, kind: 'local', what: 'Riya ne post ka draft likha' },
    { p: 0, kind: 'send', to: 1, msg: 'm1', what: 'Server A ne "post published" message B ko bheja' },
    { p: 2, kind: 'local', what: 'Server C pe Arjun ne apna profile badla' },
    { p: 2, kind: 'local', what: 'Server C pe Arjun ne ek like kiya' },
    { p: 2, kind: 'local', what: 'Server C pe Arjun ne ek video save ki' },
    { p: 1, kind: 'recv', msg: 'm1', what: 'Server B ko m1 mila (post B pe dikhi)' },
    { p: 1, kind: 'send', to: 2, msg: 'm2', what: 'Server B ne Arjun ka comment C ko bheja' },
    { p: 2, kind: 'recv', msg: 'm2', what: 'Server C ko m2 mila (comment C pe dikha)' },
    { p: 0, kind: 'local', what: 'Server A pe Riya ne theme dark ki' },
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
        rule = `max(apna ${before}, message ka ${m.l}) + 1 = ${L[p]}`;
      } else {
        L[p]++; V[p][p]++;
        rule = `apna counter + 1 = ${L[p]}`;
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
    const tout = () => 150 + Math.floor(rnd() * 16) * 10; // 150..300 ms, Raft paper ka range
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
      say(`${nm(n.id)} ko ${n.votes} votes mile (majority 3): term ${n.term} ka LEADER`, 'leader');
      for (let p = 0; p < N; p++) if (p !== n.id) sendAE(n, p);
      n.hb = HB;
    };
    const startElection = n => {
      n.role = 'C'; n.term++; n.votedFor = n.id; n.votes = 1; resetTimer(n);
      say(`${nm(n.id)} ka timeout khatam: CANDIDATE bana, term ${n.term}, khud ko vote, baakiyon se vote maanga`, 'cand');
      for (let p = 0; p < N; p++) if (p !== n.id) send(n.id, p, { type: 'RV', term: n.term, lastIdx: n.log.length, lastTerm: lastTerm(n) });
    };
    const advanceCommit = L => {
      for (let k = L.log.length; k > L.commit; k--) {
        if (L.log[k - 1].term !== L.term) break;
        const cnt = L.match.filter((m, i) => (i === L.id ? L.log.length : m) >= k).length;
        if (cnt >= MAJ) {
          const old = L.commit; L.commit = k;
          for (let j = Math.max(old, S.announced) + 1; j <= k; j++) say(`Entry #${j} (${L.log[j - 1].val}) ${cnt} nodes pe pahunchi: COMMITTED`, 'commit');
          S.announced = Math.max(S.announced, k);
          break;
        }
      }
    };
    const handle = m => {
      const n = S.nodes[m.to];
      if (!n.alive) return;
      if (m.term > n.term) {
        if (n.role === 'L') say(`${nm(n.id)} ne bada term ${m.term} dekha: leader se FOLLOWER bana`, 'warn');
        n.term = m.term; n.role = 'F'; n.votedFor = null; n.votes = 0;
      }
      if (m.type === 'RV') {
        const upToDate = m.lastTerm > lastTerm(n) || (m.lastTerm === lastTerm(n) && m.lastIdx >= n.log.length);
        const grant = m.term === n.term && (n.votedFor === null || n.votedFor === m.from) && upToDate;
        if (grant) { n.votedFor = m.from; resetTimer(n); }
        else if (m.term === n.term && !upToDate) say(`${nm(n.id)} ne ${nm(m.from)} ko vote NAHI diya: uska log purana hai`, 'warn');
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
    S.kill = i => { const n = S.nodes[i]; if (!n.alive) return; n.alive = false; say(`${nm(i)} CRASH${n.role === 'L' ? ' (ye leader tha!)' : ''}`, 'dead'); };
    S.revive = i => { const n = S.nodes[i]; if (n.alive) return; n.alive = true; n.role = 'F'; n.votes = 0; resetTimer(n); say(`${nm(i)} wapas zinda, follower ban ke shuru (term ${n.term} yaad hai, log disk pe tha)`, 'info'); };
    S.write = () => {
      const L = S.leader();
      if (!L) { say('Client write: abhi koi leader nahi! Client ko thodi der baad retry karna padega.', 'warn'); return false; }
      const val = 'x=' + S.nextVal++;
      L.log.push({ term: L.term, val });
      L.match[L.id] = L.log.length;
      say(`Client ne ${nm(L.id)} (leader) ko "${val}" bheja: log mein entry #${L.log.length}, abhi uncommitted`, 'write');
      return true;
    };
    S.alive = () => S.nodes.filter(n => n.alive).length;
    S.committed = () => Math.max(...S.nodes.map(n => n.commit)); // cluster-wide fact: kisi bhi node ne commit dekha

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
  const RN = { hi: ['Mumbai', 'Chennai'], en: ['Mumbai', 'Chennai'] };
  const vs = v => `[M ${v[0]}, C ${v[1]}]`;
  function vvNew() { return { reps: [[], []], n: 0 }; }
  function vvEdit(S, r, lang) {
    const base = [0, 0]; S.reps[r].forEach(x => x.v.forEach((c, i) => { base[i] = Math.max(base[i], c); }));
    base[r]++;
    const val = CAPS[S.n++ % CAPS.length], merged = S.reps[r].length > 1;
    S.reps[r] = [{ val, v: base }];
    const n = RN[lang][r];
    return lang === 'en'
      ? `${n}: new caption "${val}". ${merged ? 'This edit saw both conflicting versions, so it replaces them (the conflict is resolved). ' : ''}Its own counter goes up: ${vs(base)}.`
      : `${n}: naya caption "${val}". ${merged ? 'Is edit ne dono conflict wale versions dekhe the, to ye unki jagah le leta hai (conflict suljh gaya). ' : ''}Apna counter +1: ${vs(base)}.`;
  }
  function vvSync(S, from, to, lang) {
    const src = S.reps[from], dst = S.reps[to], F = RN[lang][from], D = RN[lang][to];
    if (!src.length) return lang === 'en' ? `${F} has nothing to send yet.` : `${F} ke paas abhi bhejne ko kuch nahi.`;
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
    const a = src.map(x => vs(x.v)).join(' + '), b = dst.map(x => vs(x.v)).join(' + ') || (lang === 'en' ? 'empty' : 'khaali');
    if (conflict) return lang === 'en'
      ? `${F} ${a} vs ${D} ${b}: one is bigger in one place, the other is bigger in another place. <strong>Concurrent!</strong> ${D} keeps BOTH versions. (Last-write-wins would have silently thrown one away.) A new edit on ${D} will resolve it.`
      : `${F} ${a} vs ${D} ${b}: ek jagah ek bada, doosri jagah doosra. <strong>Concurrent!</strong> ${D} DONO versions rakhta hai. (LWW hota to ek ko chupchaap phenk deta.) ${D} pe agla edit isse suljha dega.`;
    if (notes.every(n => n === 'old')) return lang === 'en'
      ? `${F} ${a} vs ${D} ${b}: ${D} already has this or a newer version. Nothing changes.`
      : `${F} ${a} vs ${D} ${b}: ${D} ke paas ye ya isse naya version pehle se hai. Kuch nahi badla.`;
    if (!dst.length) return lang === 'en' ? `${D} was empty. It now gets ${F}'s version ${a}.` : `${D} khaali tha. Ab use ${F} ka version ${a} mil gaya.`;
    return lang === 'en'
      ? `${F} ${a} vs ${D} ${b}: every number is the same or bigger, so ${F}'s version is newer. ${D} replaces its old copy.`
      : `${F} ${a} vs ${D} ${b}: har number barabar ya bada, to ${F} ka version naya hai. ${D} purani copy hata ke naya rakhta hai.`;
  }
  const T = { lamport, LSCRIPT, hb, makeRaft, ntp, vcmp, vvNew, vvEdit, vvSync, quorum, commitWait };

  Lesson.register({
    _test: T,
    id: 'consensus',
    title: 'Consensus, Raft aur clocks',
    minutes: 35,
    summary: `Kai machines ek hi baat pe kaise sehmat hon, jab clocks galat ho sakte hain, messages der se aate hain aur machines kabhi bhi gir sakti hain? Is lesson mein: physical clocks, drift aur skew, NTP, Lamport timestamps, vector clocks, Raft (leader, terms, election, log replication, majority) ek interactive simulator ke saath, cluster size aur (N−1)/2, Paxos, aur Google Spanner ka TrueTime.`,
    blocks: [
      { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `xyz.com ab ek computer pe nahi, bahut saare computers pe chalta hai. Har computer ki apni ghadi hai, aur koi do ghadiyan bilkul same time nahi batati.<br>To do sawaal khade hote hain. Pehla: <strong>do kaam hue, pehle kaun hua?</strong> Doosra: <strong>paanch computers ek hi faisle pe kaise sehmat hon</strong> (jaise "abhi boss kaun hai"), jab koi bhi computer kabhi bhi band ho sakta hai?<br>Is lesson mein dono ke jawab hain: ghadiyan kyun dhokha deti hain, bina ghadi ke order kaise banta hai (Lamport, vector clocks), aur machines "vote" karke faisla kaise karti hain (Raft, Paxos). Har cheez ka ek chhota khel bhi hai, khud chala ke dekhna.` },
      { type: 'h2', text: 'Problem: "kaun pehle aaya?"' },
      { type: 'p', html: `Coordination lesson mein humne etcd/ZooKeeper ko "bharose wala boss" bana ke use kiya tha. Humne kaha tha ki unke andar <strong>Raft</strong> naam ka tareeka chalta hai. Aaj us dabbe ko kholte hain.` },
      { type: 'p', html: `Lekin pehle ek chhota sa sawaal, jahan se sab shuru hota hai: <strong>do events mein se pehle kaun hua?</strong> (Event = koi bhi ek kaam jo hua: ek write, ek like, ek message.)` },
      { type: 'callout', tone: 'term', title: 'Naya word: Timestamp', html: `<strong>Ye kya hai:</strong> ek label jo batata hai ki koi kaam kis time hua, jaise "10:00:05". Server use apni ghadi dekh ke lagata hai.<br><strong>Kyun chahiye:</strong> baad mein ye tay karne ke liye ki kaunsa kaam pehle hua aur kaunsa baad mein.<br><strong>Iske bina:</strong> do alag versions aayein to pata hi nahi chalega ki naya kaunsa hai.<br><strong>Dikkat:</strong> timestamp utna hi sahi hai jitni us server ki ghadi. Ye lesson isi dikkat se shuru hota hai.` },
      { type: 'p', html: `Ek kahani. xyz.com pe Riya apni video ka caption badalti hai: pehle "Goa trip", phir do second baad "Goa trip 2026". Load Balancer ne dono requests <em>alag alag</em> servers pe bhej di. Database ka rule simple hai: jiska timestamp bada, wahi jeetega. Isko <strong>last-write-wins</strong> kehte hain.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Last-write-wins (LWW)', html: `<strong>Ye kya hai:</strong> ek simple rule. Ek hi cheez ke do versions aayein, to jiska timestamp bada hai wo rakho, doosra phenk do.<br><strong>Kyun chahiye:</strong> bahut tez aur simple hai. Koi insaan beech mein nahi aata. Isliye kai databases (jaise Cassandra, by default) ise use karte hain.<br><strong>Iske bina:</strong> har conflict pe app ko khud sochna padega ki kaunsa version rakhein.<br><strong>Khatra:</strong> "bada timestamp" ka matlab "baad mein hua" tabhi hai jab saari ghadiyan sahi hon. Ab dekho kya hota hai jab ek ghadi galat ho.` },
      { type: 'flow', title: 'LWW + galat ghadi = gayab write', height: 330,
        nodes: [
          { id: 'u', label: 'Riya', sub: 'caption edit', x: 90, y: 170, w: 120, kind: 'client', info: 'Ye kya hai: xyz.com ki user. Wo do baar caption badalti hai, do second ke gap pe. Use lagta hai doosra wala final hai.' },
          { id: 'a', label: 'Server A', sub: 'clock sahi', x: 340, y: 70, w: 150, kind: 'server', info: 'Ye kya hai: xyz.com ka ek app server. Write aane pe ye apni ghadi dekh ke us pe timestamp lagata hai.' },
          { id: 'b', label: 'Server B', sub: 'clock 3 s peeche', x: 340, y: 270, w: 150, kind: 'server', info: 'Ye kya hai: doosra app server. Iski ghadi 3 second peeche chal rahi hai (ghadi thodi dheemi thi, aur time theek karne wala sync miss ho gaya). Is server ko khud pata nahi.' },
          { id: 'db', label: 'Database', sub: 'last-write-wins', x: 600, y: 170, w: 180, kind: 'data', info: 'Ye kya hai: jahan caption save hota hai. Har value ke saath timestamp rakhta hai. Naya write tabhi lagata hai jab uska timestamp purane se bada ho (LWW rule).' },
        ],
        edges: [{ a: 'u', b: 'a' }, { a: 'u', b: 'b' }, { a: 'a', b: 'db' }, { a: 'b', b: 'db' }],
        scenarios: [
          { name: 'Ghadiyan sahi', steps: [
            { title: 'Pehla edit, Server A', text: 'A ne timestamp 10:00:05 lagaya.', go: 'u>a>db', msg: 'caption = "Goa trip"  @ 10:00:05', after: { db: { sub: '"Goa trip" @ :05' } } },
            { title: 'Doosra edit, Server B', text: 'B ki ghadi bhi sahi: 10:00:07. 07 > 05, naya jeeta.', go: 'u>b>db', msg: 'caption = "Goa trip 2026"  @ 10:00:07', after: { db: { state: 'ok', sub: '"Goa trip 2026" @ :07' } } },
          ]},
          { name: 'Clock skew: write gayab', steps: [
            { title: 'Pehla edit, Server A', text: 'A: 10:00:05.', go: 'u>a>db', msg: 'caption = "Goa trip"  @ 10:00:05', after: { db: { sub: '"Goa trip" @ :05' } } },
            { title: 'Doosra edit, Server B', text: 'Asli waqt 10:00:07 hai, lekin B ki ghadi 3 second peeche: timestamp 10:00:04.', set: { b: { state: 'warn' } }, go: 'u>b>db', msg: 'caption = "Goa trip 2026"  @ 10:00:04  (asli: 10:00:07)' },
            { title: 'Database purana rakhta hai', text: '04 < 05, to DB ne naya write <strong>chupchaap phenk diya</strong>. Koi error nahi. Riya refresh karti hai aur purana caption dekhti hai. Ye LWW + clock skew ka classic data loss hai.', focus: ['db'], set: { db: { state: 'hot', sub: 'kept "Goa trip" (old!)' } } },
          ]},
          { name: 'NTP jump peeche', intro: 'Server A ki ghadi 2 second aage thi. NTP (ek service jo internet se sahi time laake ghadi theek karti hai; neeche detail mein) ne use theek kiya, ek jhatke mein peeche kheench ke.', steps: [
            { title: 'Pehla edit', text: 'A ki ghadi aage hai: asli 10:00:04, A bolta hai 10:00:06.', set: { a: { state: 'warn', sub: 'clock 2 s aage' } }, go: 'u>a>db', after: { db: { sub: '"Goa trip" @ :06' } }, msg: '@ 10:00:06 (asli 10:00:04)' },
            { title: 'NTP step', text: 'NTP ne ghadi seedhi 2 second peeche kar di. Server A ke liye waqt ulta chala!', focus: ['a'], set: { a: { sub: 'NTP: 2 s peeche jump' } } },
            { title: 'Doosra edit, same server', text: 'Asli 10:00:06, ab A sahi bolta hai 10:00:06. Lekin pehle wala bhi :06 tha (ya isse bada). Barabar ya chhota timestamp: naya write haar gaya. Same machine pe bhi "baad wala" timestamp chhota ho sakta hai.', go: 'u>a>db', set: { db: { state: 'hot', sub: 'kept "Goa trip" (old!)' } }, msg: '@ 10:00:06 (asli 10:00:06) → tie / lose' },
          ]},
        ],
      },
      { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "server ki ghadi to sahi hi hoti hai"', html: `Har computer ki ghadi ek chhote quartz crystal pe chalti hai jo garmi, umar aur manufacturing ke hisaab se thoda tez ya dheema chalta hai. Ghadiyan sync rehti hain, lekin <em>perfect</em> kabhi nahi. Distributed system mein "10:00:05" ka matlab hai "kisi ek machine ke hisaab se lagbhag 10:00:05".` },

      { type: 'h2', text: 'Physical clocks: computer ki ghadi andar se' },
      { type: 'p', html: `Computer ki ghadi kaise chalti hai? Motherboard pe ek chhota sa <strong>quartz crystal</strong> hota hai. Bijli lagne pe ye ek fixed speed se kaanpta (vibrate karta) hai, jaise har second 32,768 baar. Computer in kampan ko ginta hai. Itne kampan = 1 second. Bas, yahi ghadi hai.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Physical clock (wall clock)', html: `<strong>Ye kya hai:</strong> machine ki asli ghadi, jo batati hai "abhi kitne baje hain". Andar quartz crystal ke kampan gine jaate hain.<br><strong>Kyun chahiye:</strong> logs mein time likhna, "24 ghante baad expire karo", user ko "2 min pehle" dikhana.<br><strong>Iske bina:</strong> machine ko pata hi nahi ki abhi din hai ya raat.<br><strong>Dikkat:</strong> har crystal thoda alag hai. Garmi, umar aur banawat se uski speed thodi badalti hai. Isliye do machines ki ghadiyan dheere dheere alag ho jaati hain.` },
      { type: 'image', src: 'assets/img/consensus/quartz-crystal.jpg', maxWidth: 300, alt: 'Upar circuit board pe chandi rang ka chhota quartz crystal dabba; neeche wahi dabba khula hua, andar quartz ka chhota tukda do electrodes ke beech.', caption: 'Computer ki ghadi ka dil: ek quartz crystal. Upar band dabba (27 MHz), neeche khula hua: beech mein quartz ka patla tukda, jo bijli se kaanpta hai.', credit: { text: 'Chamblis, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Quartz_crystal_internal.jpg', license: 'CC BY-SA 4.0' } },
      { type: 'callout', tone: 'term', title: 'Naye words: Clock drift aur clock skew', html: `<strong>Drift (ye kya hai):</strong> ek ghadi ki <em>speed</em> ki galti. Ghadi asli time se thodi tez ya dheemi chalti hai. Ise <strong>ppm</strong> (parts per million) mein naapte hain: 20 ppm = har 10 lakh second mein 20 second ka farak, yaani roz lagbhag 1.7 second.<br><strong>Skew (ye kya hai):</strong> kisi ek pal pe <em>do ghadiyon ke beech ka farak</em>. Jaise Server A bole 10:00:05 aur Server B bole 10:00:02, to skew 3 second.<br><strong>Rishta:</strong> drift dheere dheere skew banata hai. Do ghadiyan ulti disha mein drift karein to skew double tezi se badhta hai.<br><strong>Iske bina (yaani agar inhe na samjho):</strong> tum maan loge ki "bada timestamp = baad mein hua", aur LWW chupchaap writes kho dega, jaise upar dekha.` },
      { type: 'p', html: `Ghadiyon pe bharosa kyun nahi kar sakte? Paanch wajah:` },
      { type: 'list', items: [
        '<strong>Drift</strong>: quartz ghadi thodi tez ya dheemi chalti hai. Google ka leap-smear doc bhi maanta hai ki ~11.6 ppm jitna farak aam machines ke quartz errors ke andar hai.',
        '<strong>Sync perfect nahi</strong>: ghadi theek karne wala NTP (neeche detail) network delay ka sirf andaza lagata hai. Isliye error milliseconds se lekar (kharab network pe) bahut zyada tak ho sakta hai.',
        '<strong>Jumps</strong>: farak bada ho to NTP ghadi ko seedha "step" kar deta hai, aage ya <em>peeche</em>. Peeche jump = waqt ulta chala.',
        '<strong>Leap seconds</strong>: Earth ki ghoomne ki speed ke hisaab se kabhi kabhi UTC (duniya ka standard time) mein ek extra second joda gaya. 1 Jan 2017 ko isi wajah se Cloudflare ke DNS code mein do timestamps ka farak negative aaya aur ek function crash (panic) kar gaya; kuch DNS queries fail hui. Google is second ko 24 ghante mein dheere dheere "smear" karta hai (noon to noon), taaki jhatka na lage. 2022 mein international measurement body (CGPM) ne tay kiya ki 2035 tak leap seconds band kar diye jaayenge.',
        '<strong>Pauses</strong>: VM ek machine se doosri pe shift hua, ya GC (memory saaf karne wala kaam) ne program ko kuch der rok diya. Program ke liye waqt "ruka", duniya ke liye nahi.',
      ]},
      { type: 'p', html: `Drift chhota lagta hai, lekin jud jaata hai. <strong>Worked example:</strong> 20 ppm drift, aur pichhla sync 1 ghanta pehle. Error = 20 × 10⁻⁶ × 3600 s = 0.072 s = 72 ms. Do servers ulti disha mein drift karein to unke beech 144 ms. Ab sliders se khud dekho:` },
      { type: 'custom', render(el) {
        el.innerHTML = `<div class="row2">
            <div><label>Drift: <strong class="cs-dv"></strong></label><input class="cs-d" type="range" min="1" max="200" step="1" value="20"></div>
            <div><label>Pichhle NTP sync ko: <strong class="cs-hv"></strong></label><input class="cs-h" type="range" min="1" max="1440" step="1" value="60"></div>
          </div>
          <div class="stats">
            <div class="stat"><span>Ek machine ka error</span><strong class="cs-one"></strong></div>
            <div class="stat"><span>Do machines ke beech (ulti disha)</span><strong class="cs-two"></strong></div>
            <div class="stat"><span>Ek din bina sync</span><strong class="cs-day"></strong></div>
          </div>
          <div class="calc-note cs-note"></div>`;
        const d = el.querySelector('.cs-d'), hh = el.querySelector('.cs-h');
        const fmt = s => s >= 1 ? s.toFixed(2) + ' s' : (s * 1000).toFixed(s * 1000 < 10 ? 1 : 0) + ' ms';
        const upd = () => {
          const ppm = Number(d.value), min = Number(hh.value), one = ppm * 1e-6 * min * 60;
          el.querySelector('.cs-dv').textContent = ppm + ' ppm';
          el.querySelector('.cs-hv').textContent = min >= 60 ? (min / 60).toFixed(1) + ' ghante' : min + ' min';
          el.querySelector('.cs-one').textContent = fmt(one);
          el.querySelector('.cs-two').textContent = fmt(2 * one);
          el.querySelector('.cs-day').textContent = fmt(ppm * 1e-6 * 86400);
          el.querySelector('.cs-note').textContent = 2 * one > 0.001
            ? 'Agar do servers ke beech ' + fmt(2 * one) + ' ka farak hai, to is se kam gap wale do writes ka order timestamp se tay karna jua hai. (Spanner paper worst case 200 µs/sec drift maan ke chalta hai: slider ko 200 pe le jao.)'
            : 'Itna chhota farak bhi tab maayne rakhta hai jab ek second mein hazaaron writes hon.';
        };
        d.addEventListener('input', upd); hh.addEventListener('input', upd); upd();
      }},
      { type: 'h3', text: 'NTP: ghadiyon ko theek kaise karte hain' },
      { type: 'callout', tone: 'term', title: 'Naya word: NTP (Network Time Protocol)', html: `<strong>Ye kya hai:</strong> ek tareeka jisse computer internet pe kisi "time server" se poochh ke apni ghadi theek karta hai. Har Linux server, phone aur laptop pe ye chalta hai.<br><strong>Kyun chahiye:</strong> drift roz ghadi ko kuch second kheench deta. NTP baar baar (har kuch minute) sync karke farak ko milliseconds mein rakhta hai.<br><strong>Iske bina:</strong> ek mahine mein servers ki ghadiyan minute bhar alag. Logs ka order, cache expiry, login tokens ka "expire time", sab gadbad.<br><strong>Example:</strong> xyz.com ke servers <code>time.google.com</code> jaise public time servers se ya cloud provider ke time service se sync karte hain.` },
      { type: 'p', html: `Mushkil ye hai ki time server ka jawab bhi network pe <em>safar</em> karke aata hai. Jab tak jawab pahuncha, time aage nikal gaya. NTP isko chaar timestamps se sambhalta hai:` },
      { type: 'steps', items: [
        { t: 'T1: client bhejta hai', d: 'Client apni ghadi se likhta hai: "maine request T1 pe bheji".' },
        { t: 'T2: server ko mili', d: 'Server apni (sahi) ghadi se likhta hai: request T2 pe mili.' },
        { t: 'T3: server jawab bhejta hai', d: 'Server likhta hai: jawab T3 pe bheja.' },
        { t: 'T4: client ko mila', d: 'Client apni ghadi se likhta hai: jawab T4 pe mila.' },
        { t: 'Hisaab', d: '<strong>Delay</strong> (aane-jaane ka total network time) = (T4 − T1) − (T3 − T2). <strong>Offset</strong> (meri ghadi kitni peeche hai) = ((T2 − T1) + (T3 − T4)) / 2. Phir client ghadi ko offset jitna theek karta hai.' },
      ]},
      { type: 'p', html: `<strong>Worked example:</strong> client ki ghadi server se 110 ms peeche hai. Jaane mein 20 ms, aane mein 20 ms, server 1 ms sochta hai. Client ki ghadi se T1 = 0. Server ki ghadi se T2 = 0 + 20 + 110 = 130, T3 = 131. Client ki ghadi se T4 = 131 − 110 + 20 = 41. Offset = (130 + (131 − 41)) / 2 = (130 + 90) / 2 = <strong>110 ms</strong>. Bilkul sahi! Delay = 41 − 1 = 40 ms.` },
      { type: 'p', html: `Chhupi hui shart: NTP maan leta hai ki jaane aur aane mein <strong>barabar</strong> time laga. Agar jaane mein 30 ms aur aane mein 10 ms lage, to NTP ka jawab (30 − 10) / 2 = 10 ms galat hoga. Ye galti kabhi bhi delay ke aadhe se zyada nahi ho sakti. Neeche sliders se khud dekho:` },
      { type: 'custom', render(el) {
        el.innerHTML = `<div class="row2">
            <div><label>Asli farak (client kitna peeche): <strong class="nt-ov"></strong></label><input class="nt-o" type="range" min="-200" max="200" step="5" value="110"></div>
            <div><label>Jaane ka delay: <strong class="nt-av"></strong></label><input class="nt-a" type="range" min="1" max="150" step="1" value="20"></div>
            <div><label>Aane ka delay: <strong class="nt-bv"></strong></label><input class="nt-b" type="range" min="1" max="150" step="1" value="20"></div>
          </div>
          <div class="ascii nt-ts" style="font-size:12.5px;white-space:pre-wrap;margin-top:8px"></div>
          <div class="stats">
            <div class="stat"><span>NTP ka offset</span><strong class="nt-off"></strong></div>
            <div class="stat"><span>Delay (round trip)</span><strong class="nt-del"></strong></div>
            <div class="stat"><span>NTP ki galti</span><strong class="nt-err"></strong></div>
            <div class="stat"><span>Galti ki max hadd (delay/2)</span><strong class="nt-max"></strong></div>
          </div>
          <div class="calc-note nt-note"></div>`;
        const q = c => el.querySelector(c), o = q('.nt-o'), a = q('.nt-a'), b = q('.nt-b');
        const upd = () => {
          const r = T.ntp(Number(o.value), Number(a.value), Number(b.value), 1);
          q('.nt-ov').textContent = o.value + ' ms'; q('.nt-av').textContent = a.value + ' ms'; q('.nt-bv').textContent = b.value + ' ms';
          q('.nt-ts').textContent = 'T1 = ' + r.t1 + ' (client ki ghadi)\nT2 = ' + r.t2 + ' (server ki ghadi)\nT3 = ' + r.t3 + ' (server ki ghadi)\nT4 = ' + r.t4 + ' (client ki ghadi)\noffset = ((T2-T1) + (T3-T4)) / 2 = ((' + (r.t2 - r.t1) + ') + (' + (r.t3 - r.t4) + ')) / 2';
          q('.nt-off').textContent = r.offset + ' ms'; q('.nt-del').textContent = r.delay + ' ms';
          q('.nt-err').textContent = Math.abs(r.err) + ' ms'; q('.nt-max').textContent = r.delay / 2 + ' ms';
          q('.nt-note').textContent = r.err === 0 ? 'Jaana aur aana barabar: NTP ka andaza bilkul sahi.' : 'Raasta ek taraf lamba hai, to NTP ' + Math.abs(r.err) + ' ms galat andaza lagata hai, aur use pata bhi nahi chalta. Isliye paas wale time server (kam delay) behtar hote hain.';
        };
        [o, a, b].forEach(x => x.addEventListener('input', upd)); upd();
      }},
      { type: 'p', html: `NTP ke do aur hisse jaanne laayak hain:` },
      { type: 'list', items: [
        '<strong>Stratum (seedhi):</strong> stratum 1 server ke paas khud ka GPS receiver ya atomic clock hota hai. Stratum 2 server stratum 1 se time leta hai, stratum 3 stratum 2 se, aur aage. Har seedhi pe thodi galti judti hai.',
        '<strong>Slew vs step:</strong> chhoti galti ho to NTP ghadi ko <em>dheere</em> theek karta hai: kuch der ghadi ko thoda tez ya dheema chalata hai (slew; Unix kernel mein max 500 ppm). Waqt kabhi peeche nahi jaata. Galti badi ho (classic ntpd mein 128 ms se zyada) to ghadi ek jhatke mein seedhi set (step) ho jaati hai, peeche bhi. Upar flow ka "NTP jump peeche" scenario yahi tha.',
      ]},
      { type: 'callout', tone: 'term', title: 'Naye words: Wall clock vs monotonic clock', html: `<strong>Wall clock (ye kya hai):</strong> "abhi kitne baje hain" wali ghadi. NTP ise aage peeche kar sakta hai.<br><strong>Monotonic clock (ye kya hai):</strong> ek counter jo sirf aage badhta hai, kabhi peeche nahi. Iska apna value (jaise 81234.5) bekaar hai; sirf do readings ka <em>farak</em> kaam ka hai.<br><strong>Kyun chahiye:</strong> "kitni der lagi" (timeouts, latency) naapne ke liye hamesha monotonic clock.<br><strong>Iske bina:</strong> wall clock se duration naapi aur beech mein NTP ne ghadi peeche kar di, to duration negative aa sakti hai. Cloudflare ka 2017 bug bilkul isi galti se aaya tha.` },
      { type: 'p', html: `To agar physical ghadi pe bharosa nahi, to order kaise tay karein? 1978 mein Leslie Lamport ka jawab: <strong>asli waqt chhodo</strong>. Humein ye nahi chahiye ki kaun sa event "kitne baje" hua. Humein bas ye chahiye ki kaun sa event kis event ki <strong>wajah</strong> se ho sakta tha.` },

      { type: 'h2', text: 'Lamport timestamps' },
      { type: 'p', html: `Ek baat socho. Riya ne post daali, aur Arjun ne <em>wo post dekh ke</em> comment kiya. Comment ka post ke baad aana zaroori hai, kyunki comment post ki <strong>wajah</strong> se hua. Lekin agar Arjun ne kisi aur jagah apni profile photo badli, jiska Riya ki post se koi lena dena nahi, to "post pehle ya photo pehle?" ka sawaal hi bekaar hai.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Happened-before (→)', html: `<strong>Ye kya hai:</strong> "a ne b ko asar kiya ho sakta hai" ka rishta. Likhte hain <strong>a → b</strong>. Ye teen haalat mein sach hai: (1) dono ek hi machine pe hue aur a pehle hua; (2) a ek message ka bhejna tha aur b usi message ka milna; (3) beech mein aisi chain hai (a → x → b).<br><strong>Concurrent:</strong> na a → b, na b → a. Dono ko ek doosre ki khabar hi nahi thi. "Pehle kaun" ka koi matlab nahi.<br><strong>Kyun chahiye:</strong> ghadi ke bina bhi "wajah pehle, asar baad mein" wala sahi order rakhne ke liye.<br><strong>Iske bina:</strong> comment post se pehle dikh sakta hai, ya "unfriend" ke baad wali private post galat insaan ko dikh sakti hai.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Logical clock (Lamport clock)', html: `<strong>Ye kya hai:</strong> asli time nahi, bas ek <em>ginti</em>. Har machine ek integer counter rakhti hai aur har event pe use badhati hai. 1978 mein Leslie Lamport ka idea.<br><strong>Kyun chahiye:</strong> physical ghadiyan galat ho sakti hain, lekin ginti kabhi "peeche" nahi jaati. Messages ke saath ginti bhejne se wajah aur asar ka order bach jaata hai.<br><strong>Iske bina:</strong> order ke liye physical timestamps pe tikna padega, jo upar dekha ki dhokha dete hain.` },
      { type: 'p', html: `<strong>Lamport clock</strong> har machine pe bas ek integer counter hai. Teen rules:` },
      { type: 'steps', items: [
        { t: 'Har event se pehle', d: 'Counter + 1. Event ko ye number mil gaya.' },
        { t: 'Message bhejte waqt', d: 'Apna (badha hua) counter message ke saath bhejo.' },
        { t: 'Message milne pe', d: 'Counter = max(apna counter, message wala number) + 1.' },
      ]},
      { type: 'p', html: `Guarantee: agar a → b, to L(a) &lt; L(b). Teen servers, nau events. Step by step chalao, phir neeche do events chun ke compare karo:` },
      { type: 'custom', render(el) {
        const EV = T.lamport(T.LSCRIPT), P = ['A', 'B', 'C'], PC = ['var(--accent)', 'var(--violet)', 'var(--amber)'];
        el.innerHTML = `<svg class="cs-lsvg" viewBox="0 0 340 185" style="width:100%;max-width:520px;display:block" role="img" aria-label="Lamport clock timeline"></svg>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"><button type="button" class="btn small ghost cs-lp">Pichhla</button><button type="button" class="btn small primary cs-ln">Next event</button><button type="button" class="btn small ghost cs-lr">Reset</button><button type="button" class="btn small ghost cs-lv">Vector clocks dikhao</button></div>
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
          el.querySelector('.cs-lt').innerHTML = e ? `<strong>e${k}, server ${P[e.p]}:</strong> ${e.what}. ${e.kind === 'recv' ? 'Receive rule' : e.kind === 'send' ? 'Send: counter badha aur message ke saath gaya' : 'Local event'}: L = ${e.rule}.${vec ? ` Vector = [${e.v}] (A, B, C ke counters).` : ''}` : '"Next event" dabao. Har gola ek event hai, andar uska Lamport number.';
          el.querySelector('.cs-lv').textContent = vec ? 'Vector clocks chhupao' : 'Vector clocks dikhao';
          const a = EV[Number(sa.value)], b = EV[Number(sb.value)];
          const rel = a === b ? 'same event' : T.hb(a, b) ? `e${a.k + 1} → e${b.k + 1} (pehle hua, wajah ban sakta hai)` : T.hb(b, a) ? `e${b.k + 1} → e${a.k + 1}` : 'CONCURRENT: dono ko ek doosre ki khabar nahi thi';
          el.querySelector('.cs-cmp').innerHTML = `Lamport: L(e${a.k + 1}) = ${a.l}, L(e${b.k + 1}) = ${b.l}. Vector: [${a.v}] vs [${b.v}].<br><strong>Asli rishta:</strong> ${rel}.` + (a !== b && !T.hb(a, b) && !T.hb(b, a) && a.l !== b.l ? ` Dhyaan do: Lamport numbers alag hain (${Math.min(a.l, b.l)} &lt; ${Math.max(a.l, b.l)}), phir bhi koi "pehle" nahi. Chhota Lamport number ≠ pehle hua.` : '');
        };
        el.querySelector('.cs-ln').onclick = () => { if (k < EV.length) k++; draw(); };
        el.querySelector('.cs-lp').onclick = () => { if (k > 0) k--; draw(); };
        el.querySelector('.cs-lr').onclick = () => { k = 0; draw(); };
        el.querySelector('.cs-lv').onclick = () => { vec = !vec; draw(); };
        sa.addEventListener('change', draw); sb.addEventListener('change', draw);
        draw();
      }},
      { type: 'p', html: `Kya dikha? e6 pe B ka counter 0 tha, lekin message 2 lekar aaya, to B seedha 3 pe pahuncha: max(0, 2) + 1. Aur e8 pe C ka 3 tha, message 4 laaya: 5. Ab <strong>e9 (A, L=3)</strong> aur <strong>e8 (C, L=5)</strong> compare karo: 3 &lt; 5, lekin e9 ne e8 ko kabhi influence nahi kiya, na e8 ne e9 ko. Wo concurrent hain. Matlab Lamport ka ulta sach nahi: <strong>L(a) &lt; L(b) se ye pata nahi chalta ki a → b</strong>.` },
      { type: 'callout', tone: 'tip', title: 'Lamport kis kaam ka?', html: `Ek <strong>total order</strong> banane ke liye (yaani saare events ki <em>ek hi line</em>, jis pe sab machines agree karein), jo wajah-asar (causality) wala order kabhi nahi todta: (Lamport number, server ID) se sort karo. Tie ho (jaise e5 aur e6 dono 3) to server ID se. Sab machines bina baat kiye same order pe agree karengi. Distributed locks, replicated logs aur "kaun pehle" ke tie-break mein yahi idea hai. Lekin "kya ye dono concurrent the?" jaanna ho to Lamport kaafi nahi.` },

      { type: 'h2', text: 'Vector clocks: conflict pakadna' },
      { type: 'p', html: `Lamport ki kami yaad karo: do numbers dekh ke ye nahi bata sakte ki events concurrent the. Ab ek asli problem. xyz.com ka database do jagah copy hai: <strong>Mumbai</strong> aur <strong>Chennai</strong>. Dono jagah writes ho sakte hain (multi-leader setup). Riya phone se Mumbai pe caption badalti hai, aur usi waqt laptop se Chennai pe. Dono copies sync hongi to kya karein?` },
      { type: 'callout', tone: 'term', title: 'Naya word: Vector clock (version vector)', html: `<strong>Ye kya hai:</strong> ek number ki jagah <em>numbers ki list</em>, har server (ya replica) ke liye ek counter. Jaise [Mumbai: 2, Chennai: 1]. Data ke versions pe lage to ise <strong>version vector</strong> bhi kehte hain.<br><strong>Kyun chahiye:</strong> do versions dekh ke pakka bata sake: "ye purana hai" ya "ye dono ek saath, ek doosre ko jaane bina bane (conflict)".<br><strong>Iske bina:</strong> LWW ki tarah ek version chupchaap phenka jaata, aur user ka kaam gayab.<br><strong>Keemat:</strong> list ki lambai servers ki ginti ke saath badhti hai.` },
      { type: 'steps', items: [
        { t: 'Local write', d: 'Jis replica pe write hua, wo list mein <strong>apna</strong> counter +1 karta hai.' },
        { t: 'Sync / message', d: 'Doosri copy aaye to har position ka <strong>max</strong> lo. (Upar Lamport widget ke vector mode mein, receive pe apna counter bhi +1 hota hai.)' },
        { t: 'Compare', d: 'X ki har position Y se ≤ ho (aur kahin chhoti) to X purana hai, Y naya. Kahin X bada aur kahin Y bada, to <strong>concurrent</strong>: conflict.' },
      ]},
      { type: 'p', html: `<strong>Worked example:</strong> shuru [M 0, C 0]. Mumbai pe edit: [1, 0]. Sync se Chennai ko mila. Chennai pe edit: [1, 1]. Wapas sync: [1, 1] har jagah [1, 0] se ≥ hai, to naya, purana hata do. Ab dono offline. Mumbai pe edit: [2, 1]. Chennai pe edit: [1, 2]. Sync: Mumbai position mein pehla bada (2 &gt; 1), Chennai position mein doosra bada (2 &gt; 1). <strong>Concurrent!</strong> Dono versions rakho aur app/user se suljhao. Agla edit dono ko "dekh ke" hoga: [2, 2] se shuru, phir +1.` },
      { type: 'p', html: `Khud karo. Buttons se dono replicas pe edit karo aur sync karo. "Conflict" kab aata hai, dhyaan se dekho:` },
      { type: 'custom', render(el) {
        el.innerHTML = `<div class="row2 vv-reps"></div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
            <button type="button" class="btn small primary" data-a="e0">Mumbai pe edit</button><button type="button" class="btn small primary" data-a="e1">Chennai pe edit</button>
            <button type="button" class="btn small ghost" data-a="s01">Sync Mumbai → Chennai</button><button type="button" class="btn small ghost" data-a="s10">Sync Chennai → Mumbai</button>
            <button type="button" class="btn small ghost" data-a="r">Reset</button></div>
          <div class="calc-note vv-msg" style="min-height:44px"></div>`;
        const R = ['Mumbai', 'Chennai'];
        let S = T.vvNew();
        const draw = msg => {
          el.querySelector('.vv-reps').innerHTML = S.reps.map((r, i) => `<div style="border:1.5px solid ${r.length > 1 ? 'var(--red)' : 'var(--line-2)'};border-radius:var(--r);padding:8px 10px;min-width:0"><strong>${R[i]} replica</strong>${r.length > 1 ? ' <span style="color:var(--red);font-weight:700">· CONFLICT (' + r.length + ' versions)</span>' : ''}`
            + (r.map(x => `<div style="font:13px var(--f-mono);margin-top:4px">"${x.val}" <span style="color:var(--ink-3)">[M ${x.v[0]}, C ${x.v[1]}]</span></div>`).join('') || '<div style="color:var(--ink-3);margin-top:4px">khaali [M 0, C 0]</div>') + '</div>').join('');
          el.querySelector('.vv-msg').innerHTML = msg || 'Shuru mein dono khaali: [M 0, C 0]. Try: Mumbai pe edit, Mumbai → Chennai sync. Phir dono pe ek ek edit bina sync ke, aur phir sync.';
        };
        el.addEventListener('click', e => {
          const b = e.target.closest && e.target.closest('[data-a]'); if (!b) return;
          const a = b.getAttribute('data-a');
          if (a === 'r') { S = T.vvNew(); draw(); return; }
          draw(a[0] === 'e' ? T.vvEdit(S, Number(a[1]), 'hi') : T.vvSync(S, Number(a[1]), Number(a[2]), 'hi'));
        });
        draw();
      }},
      { type: 'p', html: `Isliye Dynamo-style databases (Amazon ka Dynamo paper, Riak) vector clocks ya version vectors se pakadte hain ki do writes sach mein conflict mein hain. LWW ki tarah ek ko chupchaap phenkne ki jagah dono versions app ko de dete hain, ya CRDT (aise data types jo apne aap merge ho jaate hain, jaise counters) se merge karte hain. Conflict resolution ki poori kahani <strong>"Consistency models aur quorums"</strong> lesson mein hai.` },
      { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "vector clock bhi ek timestamp hai, bada wala jeetega"', html: `Nahi. Vector clock ka kaam jeetne wala chunna nahi, <strong>rishta batana</strong> hai: purana, naya, ya concurrent. Concurrent ho to koi "bada" nahi. Faisla app karega (dono dikhao, merge karo, ya user se poochho).` },

      { type: 'h2', text: 'Consensus: kai machines, ek faisla' },
      { type: 'p', html: `Ab asli sawaal. xyz.com ke paas email bhejne wale 3 workers hain, lekin ek time pe sirf <strong>ek</strong> ko bhejna chahiye (warna users ko double email). Ye "kaun boss hai" wali baat etcd mein likhi hai: <code>/xyz/email-leader = worker-2</code>.` },
      { type: 'p', html: `etcd khud 5 servers pe chalta hai, taaki ek gire to bhi kaam chale. Ab paanchon ko ye value <strong>same, aur same order mein</strong> yaad rakhni hai. Chahe 2 servers gir jaayein, messages der se aayein ya kho jaayein. Agar ek server bole "worker-2" aur doosra bole "worker-3", to do workers email bhejenge. Isi "sab ek baat pe sehmat" wali problem ko <strong>consensus</strong> kehte hain.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Consensus', html: `<strong>Ye kya hai:</strong> kai machines ka ek value pe aisa agreement jo ek baar ho gaya to kabhi palte nahi, aur jo kuch machines girne pe bhi ho jaaye.<br><strong>Kyun chahiye:</strong> "leader kaun", "lock kiske paas", "config kya hai" jaise faisle sab machines ko ek jaise dikhne chahiye.<br><strong>Iske bina:</strong> split brain: do machines khud ko boss samjhein aur ulte faisle lein (double email, double payment, data corrupt).<br><strong>Example:</strong> etcd, ZooKeeper, Kafka ka KRaft controller, Google Spanner: sab andar consensus chalaate hain.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Replicated log (replicated state machine)', html: `<strong>Ye kya hai:</strong> har server ke paas commands ki ek numbered list (log): #1 "set a=1", #2 "set leader=worker-2"... Sab ki list <em>same order</em> mein ho, to har server same commands chala ke same haalat (state) pe pahunchega. Isko replicated state machine kehte hain.<br><strong>Kyun chahiye:</strong> ek value pe agree karna kaafi nahi; humein har naye command pe, hamesha, agree karna hai. Log isko "agli line pe agree karo" mein badal deta hai.<br><strong>Iske bina:</strong> kisi server pe command #5 pehle chali, kisi pe #6 pehle: dono alag state mein.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Majority (quorum)', html: `<strong>Ye kya hai:</strong> aadhe se zyada servers. 5 mein 3, 3 mein 2. Formula: ⌊N/2⌋ + 1 (⌊ ⌋ = neeche ki taraf poora number).<br><strong>Kyun chahiye:</strong> koi bhi do majorities hamesha kam se kam ek server share karti hain. To do alag groups kabhi do alag faisle nahi le sakte.<br><strong>Iske bina:</strong> network do hisson mein toote to dono hisse apna apna faisla le lenge.` },
      { type: 'p', html: `Consensus algorithm se do vaade chahiye. <strong>Safety</strong> (kabhi galat nahi): do servers kabhi alag value commit na karein, chahe kuch bhi ho jaaye. <strong>Liveness</strong> (aage badhna): jab majority zinda aur connected ho, to kaam chalta rahe. Safety kabhi nahi chhodte. Liveness bure waqt (majority na ho) mein ruk sakti hai: system ruk jaana galat jawab dene se behtar hai.` },

      { type: 'h2', text: 'Raft, step by step' },
      { type: 'p', html: `Raft 2014 mein Diego Ongaro aur John Ousterhout (Stanford) ne banaya. Maksad: Paxos (purana algorithm, neeche) jitna hi bharosemand, lekin <strong>samajhne mein aasaan</strong>. Unke paper ki user study mein 43 students mein se 33 ne Raft ke sawaalon ka jawab Paxos se behtar diya. etcd, Consul, CockroachDB, TiKV aur Kafka KRaft jaise systems Raft (ya uske variants) pe chalte hain.` },
      { type: 'callout', tone: 'term', title: 'Naye words: Leader, Follower, Candidate', html: `<strong>Ye kya hai:</strong> Raft mein har server teen mein se ek role mein hota hai.<br><strong>Follower:</strong> chup chaap leader ki baat maanta hai aur uski list copy karta hai.<br><strong>Candidate:</strong> leader banne ke liye vote maang raha hai.<br><strong>Leader:</strong> ek time pe sirf ek. Saare client writes isi ke paas aate hain, aur log isi se followers tak <em>ek hi direction</em> mein jaata hai.<br><strong>Kyun chahiye:</strong> ek boss hone se "kaunsa command kis number pe" ka faisla ek hi jagah hota hai. Bahut simple.<br><strong>Iske bina:</strong> har server khud numbers dene lage, to clash.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Term (Raft ki logical ghadi)', html: `<strong>Ye kya hai:</strong> time ko <strong>terms</strong> mein baanto: 1, 2, 3... Har term ek election se shuru hota hai, aur us term mein <strong>zyada se zyada ek leader</strong> hota hai. Har message pe term likha hota hai.<br><strong>Kyun chahiye:</strong> purane leader ko pehchaanna. Kisi server ko apne se bada term dikha to wo turant apna term update karke follower ban jaata hai. Purane term wale messages reject.<br><strong>Iske bina:</strong> network se laut ke aaya purana leader naye leader ke saath commands bhejta rahega.<br>Ye Lamport clock jaisa hi idea hai: physical ghadi ki zaroorat nahi.` },
      { type: 'callout', tone: 'term', title: 'Naye words: Heartbeat aur election timeout', html: `<strong>Heartbeat (ye kya hai):</strong> leader ka chhota sa "main zinda hoon" message, har kuch milliseconds mein (Raft mein ye khaali AppendEntries message hota hai).<br><strong>Election timeout (ye kya hai):</strong> har follower ka ek timer. Heartbeat aaye to timer dobara shuru. Timer khatam ho gaya = "leader shayad mar gaya", ab election.<br><strong>Kyun chahiye:</strong> bina kisi insaan ke, leader marne ka pata chalna aur naya leader chunna.<br><strong>Iske bina:</strong> leader gira to system hamesha ke liye ruka rahega.` },
      { type: 'h3', text: '1. Leader election' },
      { type: 'steps', items: [
        { t: 'Heartbeats', d: 'Leader har thodi der (jaise 50 ms) mein followers ko heartbeat bhejta hai: "main zinda hoon".' },
        { t: 'Election timeout (random)', d: 'Har follower ka ek timer hai. Paper suggest karta hai 150-300 ms ke beech random. Heartbeat aaye to timer reset. Timer khatam = "leader shayad mar gaya".' },
        { t: 'Candidate', d: 'Wo follower term + 1 karta hai, khud ko vote deta hai, aur sabko vote maangne wala message (RequestVote) bhejta hai.' },
        { t: 'Vote ke rules', d: 'Har server ek term mein sirf <strong>ek</strong> vote deta hai (jo pehle maange), aur sirf us candidate ko jiska log uske log jitna ya usse naya ho.' },
        { t: 'Majority = leader', d: '5 mein se 3 votes (khud ka mila ke) to leader. Turant heartbeats bhejta hai taaki baaki election na shuru karein.' },
      ]},
      { type: 'callout', tone: 'why', title: 'Timeout random kyun?', html: `Sabka timeout same ho to sab ek saath candidate banenge, votes bant jaayenge (<strong>split vote</strong>), koi majority nahi, phir sab ek saath timeout... Random timeout se aam taur pe ek server baakiyon se pehle jaagta hai aur unke jaagne se pehle hi votes le leta hai. Split vote ho bhi jaaye to har candidate naya random timeout leta hai aur agla round aksar suljha deta hai. Simulator mein ye kabhi kabhi khud dikhega.` },
      { type: 'h3', text: '2. Log replication aur commit' },
      { type: 'steps', items: [
        { t: 'Client leader ko likhta hai', d: 'Leader command apne log ke end mein jodta hai (term number ke saath). Abhi ye <strong>uncommitted</strong> hai.' },
        { t: 'AppendEntries', d: 'AppendEntries = leader ka "ye nayi lines apni list mein jodo" wala message. Leader followers ko nayi entries bhejta hai, saath mein pichhli entry ka index aur term. Follower ka log wahan match na kare to wo mana kar deta hai, aur leader ek kadam peeche se dobara bhejta hai, jab tak match na mile. Isse followers ke log leader jaise ho jaate hain.' },
        { t: 'Majority pe commit', d: 'Entry majority (5 mein se 3) ke log mein pahunchi to <strong>committed</strong> (pakki, final). Ab ye kabhi nahi mitegi. Leader apply karke client ko "OK" bolta hai, aur agli heartbeat mein followers ko bhi commit index batata hai.' },
      ]},
      { type: 'h3', text: 'Simulator: 5 servers, khud todo' },
      { type: 'p', html: `"Next event" dabate jao: pehle timers chalenge, ek server candidate banega, votes, leader. Phir "Client write" dabao aur dekho entry majority pe commit hoti hai. Phir <strong>leader ko maaro</strong>: timeouts, naya term, naya leader. Kisi bhi server pe click karke use gira ya wapas zinda kar sakte ho. Leader ko chhod ke teen followers giraao aur write karo: commit nahi hoga. Timers ka "random" ek fixed seed se banta hai, to same clicks pe hamesha same kahani.` },
      { type: 'custom', render(el) {
        el.innerHTML = `<svg class="rf-svg" viewBox="0 0 340 250" style="width:100%;max-width:460px;display:block;margin:0 auto;cursor:pointer" role="img" aria-label="Raft cluster of 5 servers"></svg>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px">
            <button type="button" class="btn small primary rf-next">Next event</button><button type="button" class="btn small ghost rf-play">Auto play</button><button type="button" class="btn small ghost rf-tick">+10 ms</button>
            <button type="button" class="btn small ghost rf-kill">Leader ko maaro</button><button type="button" class="btn small ghost rf-write">Client write</button><button type="button" class="btn small ghost rf-reset">Reset</button></div>
          <div class="stats"><div class="stat"><span>Time</span><strong class="rf-t"></strong></div><div class="stat"><span>Leader</span><strong class="rf-l"></strong></div><div class="stat"><span>Zinda / majority</span><strong class="rf-a"></strong></div><div class="stat"><span>Committed entries</span><strong class="rf-c"></strong></div></div>
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
          q('.rf-l').textContent = lead ? S.nm(lead.id) + ' (term ' + lead.term + ')' : 'koi nahi';
          q('.rf-a').textContent = S.alive() + ' / ' + S.MAJ + (S.alive() < S.MAJ ? ' ✗' : ' ✓');
          const cm = S.committed();
          q('.rf-c').textContent = String(cm);
          q('.rf-rows').innerHTML = S.nodes.map(n => `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid var(--line)">
            <strong style="width:28px;font-family:var(--f-mono)">${S.nm(n.id)}</strong>
            <span style="width:150px;color:${n.alive ? ROLE[n.role][1] : 'var(--ink-3)'}">${n.alive ? ROLE[n.role][0] + ', term ' + n.term : 'DEAD (term ' + n.term + ')'}${n.alive && n.role !== 'L' ? ' · ' + Math.max(0, n.timer) + ' ms' : ''}</span>
            <span style="display:flex;flex-wrap:wrap;gap:3px">${n.log.map((e, i) => `<span title="term ${e.term}" style="font:11px var(--f-mono);padding:1px 5px;border-radius:4px;border:1.5px ${i < cm ? 'solid var(--green)' : 'dashed var(--amber)'};color:var(--ink)">${e.val}<sub style="color:var(--ink-3)">t${e.term}</sub></span>`).join('') || '<span style="color:var(--ink-3)">log khaali</span>'}</span>
            <button type="button" class="btn small ghost" data-k="${n.id}" style="margin-left:auto">${n.alive ? 'Gira do' : 'Zinda karo'}</button></div>`).join('');
          q('.rf-log').innerHTML = S.log.slice(-7).reverse().map(l => `<li><span style="font:12px var(--f-mono);color:var(--ink-3)">${l.t} ms</span> ${l.txt}</li>`).join('') || '<li style="color:var(--ink-3)">Shuru mein sab followers hain, term 0. Har ek ka timer (ghere wala ring) neeche gir raha hai.</li>';
          q('.rf-play').textContent = timer ? 'Pause' : 'Auto play';
        };
        const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
        const toggle = i => { S.nodes[i].alive ? S.kill(i) : S.revive(i); draw(); };
        q('.rf-next').onclick = () => { stop(); const n0 = S.log.length, t0 = S.now; while (S.log.length === n0 && S.now - t0 < 3000) S.tick(); if (S.log.length === n0) S.log.push({ t: S.now, txt: '3 s mein kuch naya nahi: leader heartbeats bhej raha hai, sab shaant. Ab koi server girao ya write karo.' }); draw(); };
        q('.rf-tick').onclick = () => { stop(); S.tick(); draw(); };
        q('.rf-play').onclick = () => {
          if (timer) { stop(); draw(); return; }
          timer = setInterval(() => { if (!el.isConnected) { stop(); return; } S.tick(); draw(); }, 90);
          draw();
        };
        q('.rf-kill').onclick = () => { const L = S.leader(); if (L) S.kill(L.id); else S.log.push({ t: S.now, txt: 'Abhi koi leader hi nahi hai.' }); draw(); };
        q('.rf-write').onclick = () => { S.write(); draw(); };
        q('.rf-reset').onclick = () => { stop(); S = T.makeRaft(SEED); draw(); };
        q('.rf-svg').addEventListener('click', e => { const g = e.target.closest && e.target.closest('[data-i]'); if (g) toggle(Number(g.getAttribute('data-i'))); });
        q('.rf-rows').addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-k]'); if (b) toggle(Number(b.getAttribute('data-k'))); });
        S = T.makeRaft(SEED); draw();
      }},
      { type: 'p', html: `Default seed pe kahani aisi chalti hai: S1 ka timeout sabse chhota (150 ms), to t = 150 ms pe wo term 1 ka candidate banta hai, aur 190 ms tak (do network hops, 20 ms each) 3 votes leke leader. Client write karo to entry agli heartbeat ke saath jaati hai aur 50-90 ms mein (heartbeat kab nikli, us pe depend) majority pe pahunch ke commit. Leader maaro to followers ka timer 150-300 ms mein khatam hota hai; kabhi do-teen ek saath jaagte hain (split vote) aur agle term mein faisla hota hai. Leader ko chhod ke teen followers giraao (sirf 2 zinda): write leader ke log mein dashed (uncommitted) padi rahegi. Ek ko zinda karo: 3 ho gaye, turant commit.` },

      { type: 'h3', text: '3. Network partition: purana leader akela pad gaya' },
      { type: 'p', html: `Crash aasaan case hai. Mushkil case: leader zinda hai, lekin network toot gaya. S1 (leader) aur S2 ek taraf, S3, S4, S5 doosri taraf. Kya do leaders do alag values commit kar denge?` },
      { type: 'flow', title: 'Raft: partition aur majority', height: 330,
        nodes: [
          { id: 'c', label: 'Client', sub: 'xyz.com app', x: 95, y: 45, w: 120, h: 50, kind: 'client', info: 'Ye kya hai: xyz.com ka app server jo etcd mein likhta hai (jaise email-leader key). Writes sirf leader ko bhejta hai; leader na mile ya timeout ho to doosre server se poochhta hai ki leader kaun hai.' },
          { id: 's1', label: 'S1', sub: 'leader, term 1', x: 400, y: 45, w: 120, h: 50, kind: 'data', info: 'Ye kya hai: etcd server #1, abhi ka leader (term 1). Partition (network ka tootna) ke baad iske saath sirf S2 hai: 2 of 5. Majority nahi, to ye kuch commit nahi kar sakta, chahe khud ko leader maane.' },
          { id: 's2', label: 'S2', sub: 'follower', x: 524, y: 135, w: 110, h: 50, kind: 'data', info: 'Ye kya hai: etcd server #2, follower. Partition mein S1 ki taraf hai, to dono milke sirf 2 of 5.' },
          { id: 's3', label: 'S3', sub: 'follower', x: 476, y: 280, w: 110, h: 50, kind: 'data', info: 'Ye kya hai: etcd server #3, follower. Partition mein majority wali taraf (S3, S4, S5) hai.' },
          { id: 's4', label: 'S4', sub: 'follower', x: 324, y: 280, w: 110, h: 50, kind: 'data', info: 'Ye kya hai: etcd server #4, follower. Majority wali taraf.' },
          { id: 's5', label: 'S5', sub: 'follower', x: 276, y: 135, w: 110, h: 50, kind: 'data', info: 'Ye kya hai: etcd server #5, follower. Majority taraf mein sabse pehle iska timeout khatam hota hai, to ye naya leader banega.' },
        ],
        edges: [{ a: 'c', b: 's1' }, { a: 'c', b: 's5' }, { a: 's1', b: 's2' }, { a: 's1', b: 's3' }, { a: 's1', b: 's4' }, { a: 's1', b: 's5' }, { a: 's5', b: 's2' }, { a: 's5', b: 's3' }, { a: 's5', b: 's4' }],
        scenarios: [
          { name: 'Normal write', steps: [
            { title: 'Client → leader', text: 'Write sirf leader ko. S1 ne apne log mein entry #4 jodi (uncommitted).', go: 'c>s1', msg: 'PUT /xyz/email-leader = "worker-2"', after: { s1: { sub: '#4 uncommitted' } } },
            { title: 'AppendEntries', text: 'Leader sabko entry bhejta hai.', parallel: true, go: ['s1>s2', 's1>s3', 's1>s4', 's1>s5'] },
            { title: '2 acks + khud = 3: commit', text: 'S2 aur S3 ka jawab pehle aaya. Leader + 2 = 3 of 5 = majority. Entry COMMITTED. S4, S5 ka jawab baad mein aaye to bhi farak nahi.', parallel: true, go: ['res:s2>s1', 'res:s3>s1'], after: { s1: { state: 'ok', sub: '#4 committed' }, s2: { sub: 'has #4' }, s3: { sub: 'has #4' } } },
            { title: 'Client ko OK', text: 'Ab ye value kabhi nahi palatne wali. Agla leader jo bhi bane, uske log mein #4 hoga (neeche "safety" dekho).', go: 'res:s1>c' },
          ]},
          { name: 'Partition', intro: 'Network toota: {S1, S2} | {S3, S4, S5}.', steps: [
            { title: 'Network toota', text: 'S1 ke messages S3, S4, S5 tak nahi pahunchte.', parallel: true, go: ['lost:s1>s3', 'lost:s1>s4', 'lost:s1>s5'], set: { s3: { state: 'dim' }, s4: { state: 'dim' }, s5: { state: 'dim' } } },
            { title: 'Client S1 ko likhta hai', text: 'S1 ne entry #5 (x=9) joda, sirf S2 tak pahunchi. 2 of 5: commit nahi. Client wait karta hai.', go: ['c>s1', 's1>s2', 'res:s2>s1'], after: { s1: { state: 'warn', sub: '#5 stuck (2/5)' }, s2: { sub: '#5 uncommitted' } } },
            { title: 'Majority side: election', text: 'S3, S4, S5 ko heartbeat nahi mili. S5 ka timeout pehle: term 2 ka candidate. S3, S4 vote dete hain: 3 of 5. Naya leader.', set: { s3: { state: '' }, s4: { state: '' }, s5: { state: 'warn', sub: 'candidate T2' } }, parallel: true, go: ['s5>s3', 's5>s4', 'res:s3>s5', 'res:s4>s5'], after: { s5: { state: 'ok', sub: 'LEADER, term 2' } } },
            { title: 'Client retry S5 pe', text: 'Client ka timeout hua, usne naye leader S5 ko likha (y=7). S3, S4 ne ack kiya: commit. Do "leaders" hain, lekin commit sirf majority wala kar sakta hai. Split brain se bachav.', go: ['c>s5', 's5>s3', 'res:s3>s5', 'res:s5>c'], after: { s3: { sub: 'has y=7' } } },
            { title: 'Network theek', text: 'S5 ka heartbeat (term 2) S1 tak pahuncha. S1: "mera term 1, ye 2". Turant follower. Uski uncommitted entry x=9 S5 ke log se overwrite: wo kabhi commit hui hi nahi thi, to kisi se jhooth nahi bola gaya.', parallel: true, go: ['s5>s1', 's5>s2'], after: { s1: { state: '', sub: 'follower, term 2' }, s2: { sub: 'x=9 mit gaya' } } },
          ]},
          { name: 'Leader crash', steps: [
            { title: 'S1 crash', text: 'Heartbeats band.', set: { s1: { state: 'down', sub: 'CRASHED' } }, go: 'lost:s1>s5' },
            { title: 'Random timeouts', text: 'Sab followers ke timers alag. S5 ka sabse pehle khatam: candidate, term 2.', set: { s5: { state: 'warn', sub: 'candidate T2' } }, parallel: true, go: ['s5>s2', 's5>s3', 's5>s4'] },
            { title: 'Votes', text: 'S2, S3, S4 ne term 2 mein abhi kisi ko vote nahi diya, aur S5 ka log unke jitna naya hai: vote mila. 4 of 5.', parallel: true, go: ['res:s2>s5', 'res:s3>s5', 'res:s4>s5'], after: { s5: { state: 'ok', sub: 'LEADER, term 2' } } },
            { title: 'Client naye leader pe', text: 'Downtime ≈ election timeout + ek round trip, yaani milliseconds se kuch seconds tak (config pe depend). Isliye Raft paper kehta hai: broadcast time ≪ election timeout ≪ machines ke girne ka average gap.', go: ['c>s5', 'res:s5>c'] },
          ]},
        ],
      },
      { type: 'callout', tone: 'why', title: 'Safety ka intuition: committed entry kabhi gayab kyun nahi hoti', html: `Committed entry kam se kam 3 servers pe hai. Naya leader banne ke liye bhi 3 votes chahiye. 5 mein se koi bhi do "3 wale" groups kam se kam <strong>ek server share</strong> karte hain. Wo common server sirf usi candidate ko vote dega jiska log uske jitna naya ho (election restriction). Isliye jo bhi leader banega, uske paas har committed entry hogi. Aur leader kabhi apne log se kuch delete nahi karta. Paper ke shabdon mein ye "Leader Completeness" hai. (Ek baarik rule bhi hai: naya leader purane term ki entries ko sirf ginti se commit nahi maanta; apne term ki entry commit hone pe hi purani bhi commit maani jaati hain.)` },
      { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "leader ne likh liya = save ho gaya"', html: `Leader ke log mein aana commit nahi hai. Partition scenario mein S1 ne x=9 likha tha, lekin wo majority tak nahi pahuncha aur baad mein mit gaya. Client ko "OK" sirf commit ke baad milta hai. Isi tarah, leader se seedha read karna bhi risky hai agar wo chupke se purana leader ban chuka ho; etcd jaise systems linearizable reads ("hamesha sabse taaza value" wale reads) ke liye pehle majority se confirm karte hain ki wo abhi bhi leader hai.` },

      { type: 'h2', text: 'Kitne nodes? Odd numbers aur (N−1)/2' },
      { type: 'table', head: ['N (servers)', 'Majority', 'Kitne gir sakte hain', 'Comment'], rows: [
        ['1', '1', '0', 'Koi fault tolerance nahi'],
        ['3', '2', '1', 'Sabse common chhota setup'],
        ['4', '3', '1', '3 jitna hi tolerant, ek extra machine bekaar'],
        ['5', '3', '2', 'Production etcd/ZooKeeper mein common'],
        ['7', '4', '3', 'Har write pe 4 ka jawab: slow; kam use'],
      ], caption: 'Majority = ⌊N/2⌋ + 1. Tolerates ⌊(N − 1)/2⌋ failures.' },
      { type: 'p', html: `<strong>Worked example:</strong> N = 5. Majority = ⌊5/2⌋ + 1 = 3. To 5 − 3 = <strong>2 servers gir sakte hain</strong>, aur ye (5 − 1)/2 = 2 ke barabar hai. Ab N = 6: majority = 4, gir sakte hain 6 − 4 = 2. Ek extra machine ka paisa diya, tolerance zero badhi. Isliye <strong>odd numbers</strong>. Neeche khud servers giraao:` },
      { type: 'custom', render(el) {
        el.innerHTML = `<label>Cluster mein servers (N): <strong class="cq-nv"></strong></label><input class="cq-n" type="range" min="1" max="9" step="1" value="5">
          <svg class="cq-svg" viewBox="0 0 340 70" style="width:100%;max-width:520px;display:block;margin:8px 0;cursor:pointer" role="img" aria-label="Servers in the cluster"></svg>
          <div class="stats"><div class="stat"><span>Majority</span><strong class="cq-m"></strong></div><div class="stat"><span>Kitne gir sakte hain</span><strong class="cq-f"></strong></div><div class="stat"><span>Zinda</span><strong class="cq-a"></strong></div><div class="stat"><span>Writes?</span><strong class="cq-w"></strong></div></div>
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
          q('.cq-w').textContent = r.ok ? 'chal rahe ✓' : 'RUKE ✗';
          q('.cq-note').textContent = (r.ok ? 'Majority zinda hai: leader ban sakta hai, writes commit hote hain. ' : 'Majority nahi bachi: koi leader nahi, writes ruk gaye. Galat jawab dene se rukna behtar (safety). ')
            + (N % 2 === 0 ? N + ' servers bhi sirf ' + r.tol + ' failure jhelte hain, utna hi jitna ' + (N - 1) + '. Ek machine bekaar.' : 'Kisi server pe click karke use giraao ya wapas laao.');
        };
        nIn.addEventListener('input', () => { dead = new Set(); draw(); });
        q('.cq-svg').addEventListener('click', e => { const g = e.target.closest && e.target.closest('[data-i]'); if (!g) return; const i = Number(g.getAttribute('data-i')); dead.has(i) ? dead.delete(i) : dead.add(i); draw(); });
        draw();
      }},
      { type: 'p', html: `Odd number aur partition ka ek aur interactive widget "Leader election, locks, Redis Sentinel" lesson mein hai. Yaad rakhne wali baat: zyada nodes = zyada failures jhelo, lekin har write ko zyada servers ka wait, to writes slow. Consensus clusters ko reads/traffic ke liye nahi badhaate.` },

      { type: 'h2', text: 'Paxos (sirf pehchaan ke liye)' },
      { type: 'p', html: `Raft se pehle consensus ka matlab tha <strong>Paxos</strong>, Leslie Lamport ka algorithm (paper "The Part-Time Parliament", 1998 mein chhapa; aasaan version "Paxos Made Simple", 2001). Raft aur Paxos ka dil same hai: <strong>majority se faisla</strong>. Farak ye hai ki Paxos mein koi fixed boss zaroori nahi; koi bhi server value "propose" kar sakta hai.` },
      { type: 'callout', tone: 'term', title: 'Naye words: Proposer, Acceptor, Learner', html: `<strong>Ye kya hai:</strong> Paxos ke teen role (ek machine kai role nibha sakti hai).<br><strong>Proposer:</strong> jo ek value suggest karta hai ("leader = worker-1").<br><strong>Acceptor:</strong> voter. Inki majority jis value ko accept kare, wo <strong>chosen</strong> (final).<br><strong>Learner:</strong> jise bas final value jaanni hai.<br><strong>Kyun chahiye:</strong> do proposers ek saath alag values bolein, tab bhi sirf ek value final ho.<br><strong>Iske bina:</strong> jo pehle chillaaye wo jeete; network delay se alag servers alag "winners" maan lein.` },
      { type: 'p', html: `Plain words mein Paxos ek value ke liye do round chalata hai:` },
      { type: 'steps', items: [
        { t: 'Round 1: Prepare / Promise', d: 'Proposer ek proposal number n chunta hai (har baar pehle se bada) aur acceptors se kehta hai "prepare(n)". Matlab: "main n number se bolna chahta hoon". Majority vaada (promise) karti hai: "n se chhote numbers ab nahi sunenge". Saath mein batati hai ki pehle koi value accept ki thi to kaunsi.' },
        { t: 'Round 2: Accept / Accepted', d: 'Ab proposer value bhejta hai. <strong>Sabse zaroori rule:</strong> agar kisi acceptor ne pehle koi value accept ki thi, to proposer ko sabse bade number wali <em>wahi purani value</em> bhejni padegi, apni nahi. Koi purani value na ho to apni bhej sakta hai. Majority accept kare to value <strong>chosen</strong>. Learners ko bata diya jaata hai.' },
      ]},
      { type: 'p', html: `"Apni value chhodo, purani wali bhejo" ajeeb lagta hai. Yahi Paxos ki safety ka raaz hai. Step by step dekho, do proposers ek saath "email leader" chunne ki koshish kar rahe hain:` },
      { type: 'custom', render(el) {
        const ST = [
          { t: 'Shuru: teen acceptors (A1, A2, A3), majority = 2. P1 chahta hai "worker-1", P2 chahta hai "worker-2".', a: [[0, null], [0, null], [0, null]] },
          { t: 'P1 → prepare(1) sabko. Sab vaada karte hain: "1 se chhota nahi sunenge". Kisi ne pehle kuch accept nahi kiya tha.', a: [[1, null], [1, null], [1, null]] },
          { t: 'P1 → accept(1, "worker-1"). A1 aur A2 ne accept kiya: 2 of 3 = majority. <strong>"worker-1" CHOSEN.</strong> Lekin P1 ye kisi ko batane se pehle crash ho gaya, aur A3 tak message pahuncha hi nahi.', a: [[1, [1, 'worker-1']], [1, [1, 'worker-1']], [1, null]], ch: 'worker-1' },
          { t: 'P2 ko kuch pata nahi. Wo prepare(2) bhejta hai. A1 slow hai, A2 aur A3 jawab dete hain (majority). A2 batata hai: "maine pehle (1, worker-1) accept kiya tha". Ye ittefaq nahi: koi bhi majority (2 of 3), {A1, A2} mein se kam se kam ek ko zaroor chhuegi.', a: [[1, [1, 'worker-1']], [2, [1, 'worker-1']], [2, null]], ch: 'worker-1' },
          { t: 'Rule: P2 ko <strong>"worker-1"</strong> hi bhejna padega, apna "worker-2" nahi. accept(2, "worker-1") → A2, A3 accept. Agar P2 apni value bhejta, to ek baar CHOSEN ho chuki value badal jaati: safety tootti.', a: [[1, [1, 'worker-1']], [2, [2, 'worker-1']], [2, [2, 'worker-1']]], ch: 'worker-1' },
          { t: 'P1 ka purana accept(1) ab A3 tak der se pahuncha. A3 ne 2 ka vaada kiya hai, 1 &lt; 2: <strong>REJECT</strong>. Aakhir mein A1 ko bhi accept(2) mil jaata hai. Sab "worker-1" pe sehmat.', a: [[2, [2, 'worker-1']], [2, [2, 'worker-1']], [2, [2, 'worker-1']]], ch: 'worker-1' },
        ];
        el.innerHTML = `<div class="px-tab" style="overflow-x:auto"></div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"><button type="button" class="btn small ghost px-p">Pichhla</button><button type="button" class="btn small primary px-n">Next</button><button type="button" class="btn small ghost px-r">Reset</button></div>
          <div class="calc-note px-t" style="min-height:44px"></div>`;
        let k = 0;
        const draw = () => {
          const s = ST[k];
          el.querySelector('.px-tab').innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:13px"><tr><th style="text-align:left;padding:4px">Acceptor</th><th style="text-align:left;padding:4px">Vaada (promise)</th><th style="text-align:left;padding:4px">Accept kiya</th></tr>`
            + s.a.map((r, i) => `<tr style="border-top:1px solid var(--line)"><td style="padding:4px"><strong>A${i + 1}</strong></td><td style="padding:4px;font-family:var(--f-mono)">${r[0] ? '≥ ' + r[0] : '-'}</td><td style="padding:4px;font-family:var(--f-mono);color:${r[1] ? 'var(--green)' : 'var(--ink-3)'}">${r[1] ? '(' + r[1][0] + ', ' + r[1][1] + ')' : 'kuch nahi'}</td></tr>`).join('')
            + `</table><div class="stats"><div class="stat"><span>Step</span><strong>${k} / ${ST.length - 1}</strong></div><div class="stat"><span>Chosen value</span><strong>${s.ch || 'abhi koi nahi'}</strong></div></div>`;
          el.querySelector('.px-t').innerHTML = s.t;
        };
        el.querySelector('.px-n').onclick = () => { if (k < ST.length - 1) k++; draw(); };
        el.querySelector('.px-p').onclick = () => { if (k > 0) k--; draw(); };
        el.querySelector('.px-r').onclick = () => { k = 0; draw(); };
        draw();
      }},
      { type: 'p', html: `Ek value ke liye ye kaafi hai. Poora log chalane ke liye <strong>Multi-Paxos</strong> hota hai, jismein ek stable leader pehla phase baar baar skip karta hai, jo kaafi had tak Raft jaisa dikhta hai. Google ka Chubby lock service aur Spanner Paxos pe chalte hain; ZooKeeper ka ZAB protocol bhi isi parivaar ka hai. Interview mein itna kaafi hai: <strong>Paxos aur Raft dono majority pe tike hain, (N−1)/2 failures jhelte hain; Raft ko samajhne aur implement karne mein aasaan banaya gaya</strong>.` },

      { type: 'h2', text: 'Google Spanner aur TrueTime (pehchaan)' },
      { type: 'p', html: `Shuru ki problem yaad karo: ghadiyan galat hain, to timestamp se order nahi kar sakte. Google ne Spanner (2012 ka OSDI paper) mein ulta raasta liya: <strong>ghadi ko itna achha banao, aur uski galti ko itna saaf naapo, ki timestamp pe bharosa ho sake</strong>. Dhyaan: ye details 2012 ke paper se hain; aaj Spanner Google Cloud pe managed database ke roop mein milta hai.` },
      { type: 'callout', tone: 'term', title: 'Naya word: TrueTime', html: `<strong>Ye kya hai:</strong> Google ki time API. Normal ghadi kehti hai "abhi 10:00:05.000 hai". TrueTime ka <code>TT.now()</code> kehta hai: "abhi <strong>[earliest, latest]</strong> ke beech kahin hai", aur guarantee deta hai ki asli waqt is interval ke andar hi hai. Interval ki aadhi chaudaai ko <strong>ε</strong> (epsilon, "galti ki hadd") kehte hain.<br><strong>Kyun chahiye:</strong> jab galti ka pakka size pata ho, to us jitna ruk ke timestamps pe bharosa kiya ja sakta hai.<br><strong>Iske bina:</strong> normal NTP ghadi ki galti ka koi pakka upper limit nahi; uske timestamps se duniya bhar ke transactions ka order tay nahi kar sakte.<br><strong>Kaise:</strong> har datacenter mein time masters hain jinke paas <strong>GPS receivers</strong> ya <strong>atomic clocks</strong> hain (dono alag tarah se fail hote hain, isliye dono). Har machine har 30 second mein inse sync karti hai, aur beech mein worst-case drift (200 µs/second) maan ke ε badhata rehta hai. Paper ke production data mein ε aara (sawtooth) jaisa 1 se 7 ms ke beech ghoomta tha, zyaadatar ~4 ms.` },
      { type: 'image', src: 'assets/img/consensus/nist-f1-atomic-clock.jpg', maxWidth: 300, alt: 'NIST-F1 atomic clock: lab mein lambi metal ki machine, aas paas pipes aur instruments.', caption: 'Atomic clock (NIST-F1, America ka time standard, 1999 se). Ye atoms ki bilkul fixed "kampan" ginta hai, isliye quartz se kahin zyada sahi. Spanner ke time masters bhi atomic clocks use karte hain (lekin chhote, rack mein lagne wale).', credit: { text: 'NIST (US government), Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Nist-f1.jpg', license: 'Public domain' } },
      { type: 'ascii', text: `
Commit wait (Spanner)

TT.now() = [ earliest ........ latest ]      ε ≈ 4 ms har taraf
                                   ^
                                   s = commit timestamp (latest se kam nahi)

wait ..... jab tak TT.now().earliest > s   (TT.after(s) = true)
                                   |<-- lagbhag 2ε -->|
Ab hi data dikhao. Pakka: asli waqt s se aage nikal chuka hai.` },
      { type: 'p', html: `Iska faayda: agar transaction T1 commit hua aur <em>uske baad</em> (asli waqt mein) T2 shuru hua, to T2 ka timestamp hamesha T1 se bada hoga, duniya ke kisi bhi datacenter mein. Isko <strong>external consistency</strong> kehte hain. Keemat: har write commit pe kuch milliseconds ka wait (paper ke ek test mein commit wait ~5 ms), aur ye wait Paxos ke network kaam ke saath overlap ho jaata hai. Ek aur baarik keemat: wait khatam hone tak us row ka lock pakda rehta hai, isliye <em>ek hi row</em> pe ek ke baad ek writes lagbhag 1000 / (2ε) per second se zyada nahi ho sakte (neeche widget ka teesra number). Bina TrueTime ke systems (jaise CockroachDB) ise doosre tareekon se approximate karte hain: hybrid logical clocks (physical time + Lamport jaisa counter, dono milake) aur galti ki hadd ke andar aaye reads ko retry karna.` },
      { type: 'p', html: `<strong>Worked example:</strong> ε = 4 ms. Commit ke waqt TT.now() = [96, 104] (asli waqt 100, ms mein). Spanner timestamp s = 104 (latest) leta hai. Ab wo tab tak rukta hai jab tak earliest 104 se aage na nikal jaaye: asli waqt 108 pe interval [104, 112] hai, uske turant baad earliest &gt; 104. Wait = 108 − 100 = <strong>8 ms = 2ε</strong>. Ghadi jitni achhi (ε chhota), utna kam wait. Slider se dekho:` },
      { type: 'custom', render(el) {
        el.innerHTML = `<label>Ghadi ki galti ε: <strong class="tt-ev"></strong></label><input class="tt-e" type="range" min="1" max="100" step="1" value="4">
          <svg class="tt-svg" viewBox="0 0 340 120" style="width:100%;max-width:560px;display:block;margin:8px 0" role="img" aria-label="TrueTime commit wait timeline"></svg>
          <div class="stats"><div class="stat"><span>Commit timestamp s</span><strong class="tt-s"></strong></div><div class="stat"><span>Commit wait</span><strong class="tt-w"></strong></div><div class="stat"><span>Ek row pe max lagataar writes</span><strong class="tt-r"></strong></div></div>
          <div class="calc-note tt-note"></div>`;
        const q = c => el.querySelector(c), e = q('.tt-e');
        const upd = () => {
          const r = T.commitWait(Number(e.value), 100), X = v => 20 + (v - r.t0 + r.eps * 1.2) / (r.eps * 4.6) * 300;
          q('.tt-ev').textContent = r.eps + ' ms';
          q('.tt-svg').innerHTML = `<line x1="10" y1="100" x2="330" y2="100" stroke="var(--line-2)" stroke-width="1.5"/>
            <text x="10" y="116" font-size="10" fill="var(--ink-3)">asli waqt →</text>
            <rect x="${X(r.t0 - r.eps)}" y="22" width="${X(r.t0 + r.eps) - X(r.t0 - r.eps)}" height="16" rx="4" fill="var(--accent-soft)" stroke="var(--accent)"/>
            <text x="${X(r.t0 - r.eps)}" y="16" font-size="10" fill="var(--ink-2)">TT.now() commit pe</text>
            <rect x="${X(r.t0 + 2 * r.eps - r.eps)}" y="58" width="${X(r.t0 + 3 * r.eps) - X(r.t0 + r.eps)}" height="16" rx="4" fill="var(--accent-soft)" stroke="var(--green)"/>
            <text x="${X(r.t0 + r.eps)}" y="52" font-size="10" fill="var(--ink-2)">TT.now() wait ke baad</text>
            <line x1="${X(r.s)}" y1="10" x2="${X(r.s)}" y2="100" stroke="var(--red)" stroke-width="2" stroke-dasharray="4 3"/><text x="${X(r.s) + 4}" y="94" font-size="10" fill="var(--red)">s</text>
            <circle cx="${X(r.t0)}" cy="100" r="4" fill="var(--ink)"/><circle cx="${X(r.t0 + r.wait)}" cy="100" r="4" fill="var(--green)"/>`;
          q('.tt-s').textContent = 'asli + ' + r.eps + ' ms'; q('.tt-w').textContent = r.wait + ' ms';
          q('.tt-r').textContent = '≈ ' + r.perSec + ' / s';
          q('.tt-note').textContent = r.eps <= 7 ? 'Spanner jaisi ghadi (ε 1-7 ms): har commit pe sirf kuch milliseconds ka wait, jo network ke kaam ke saath overlap ho jaata hai.' : 'Normal NTP jaisi ghadi (ε kai dus ms): har commit pe ' + r.wait + ' ms ka wait. Isliye TrueTime ke liye GPS + atomic clocks lage.';
        };
        e.addEventListener('input', upd); upd();
      }},

      { type: 'h2', text: 'Decide' },
      { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>Consensus khud kabhi mat banao.</strong> Raft/Paxos sahi implement karna (aur test karna) saalon ka kaam hai. Leader election, config, locks, membership ke liye <strong>etcd ya ZooKeeper</strong> use karo (ya jo database/queue tum use kar rahe ho uska built-in, jaise Kafka KRaft). Aur yaad rakho: majority-based systems ko <strong>odd number of nodes (3 ya 5)</strong> chahiye, aur ye <strong>(N − 1) / 2 failures</strong> jhelte hain.` },
      { type: 'table', head: ['Zaroorat', 'Kya use karo'], rows: [
        ['Duration / timeout naapna', 'Monotonic clock, kabhi wall clock nahi'],
        ['"Kaun pehle" ka total order, ek system ke andar', 'Leader ke log ka index, ya Lamport timestamp + node ID'],
        ['Concurrent writes pakadna (multi-leader / leaderless)', 'Vector clocks / version vectors, ya CRDTs'],
        ['Leader election, locks, config, service membership', 'etcd / ZooKeeper (andar Raft / ZAB)'],
        ['Globally ordered transactions, kai regions', 'Spanner (TrueTime), ya CockroachDB jaise DBs'],
        ['LWW chalega? (likes count, last seen)', 'Haan, agar kabhi kabhi ek write khona theek hai'],
      ]},
      { type: 'ascii', text: `
xyz.com ab

App servers ──> etcd cluster (5 nodes, Raft, 3 zones mein 2+2+1)
                  • email-leader key (lease)      • feature config
                  • fencing tokens (revision)      • service membership
Kafka (KRaft controller quorum, Raft-based) ──> events, ordered per partition
Databases: leader ka log = order ka source; timeouts monotonic clock se` },
      { type: 'diagram', title: 'Consensus aur clocks: poori picture', height: 600,
        groups: [
          { label: 'xyz.com apps', x: 20, y: 14, w: 690, h: 104 },
          { label: 'DB copies', x: 25, y: 246, w: 180, h: 236 },
          { label: 'etcd: Raft, 5 servers', x: 245, y: 160, w: 465, h: 230 },
          { label: 'Time', x: 365, y: 486, w: 210, h: 104 },
        ],
        nodes: [
          { id: 'users', label: 'Users', sub: 'phone, laptop', x: 150, y: 70, w: 140, kind: 'client', info: 'Ye kya hai: xyz.com ke users, jaise Riya. Wo caption badalti hai, like karti hai. Unke writes alag servers aur alag regions pe ja sakte hain.' },
          { id: 'app', label: 'App servers', sub: 'timeouts: monotonic', x: 400, y: 70, w: 150, kind: 'server', info: 'Ye kya hai: xyz.com ka code. Duration aur timeouts monotonic clock se naapta hai. Leader / lock / config jaise faisle khud nahi karta, etcd se poochhta hai.' },
          { id: 'workers', label: 'Email workers', sub: 'watch leader key', x: 640, y: 70, w: 130, kind: 'queue', info: 'Ye kya hai: email bhejne wale 3 workers. Sirf wahi bhejta hai jiska naam etcd ki email-leader key mein hai. Key badle to etcd watch se turant pata chalta hai.' },
          { id: 's1', label: 'S1 leader', sub: 'term 3', x: 480, y: 220, w: 120, kind: 'data', info: 'Ye kya hai: etcd ka abhi ka Raft leader. Saare writes yahan aate hain. Entry ko followers tak bhejta hai aur majority (3 of 5) pe commit karta hai.' },
          { id: 's2', label: 'S2', sub: 'follower, zone A', x: 325, y: 220, w: 120, kind: 'data', info: 'Ye kya hai: etcd follower. Leader ki list copy karta hai, heartbeat na aaye to election shuru karta hai. Alag zone mein, taaki ek zone gire to bhi majority bache.' },
          { id: 's3', label: 'S3', sub: 'follower, zone B', x: 635, y: 220, w: 120, kind: 'data', info: 'Ye kya hai: etcd follower, zone B mein. 5 servers ko 2 + 2 + 1 teen zones mein baanta hai.' },
          { id: 's4', label: 'S4', sub: 'follower, zone A', x: 400, y: 340, w: 120, kind: 'data', info: 'Ye kya hai: etcd follower. Iska ack leader ko majority tak pahunchne mein madad karta hai.' },
          { id: 's5', label: 'S5', sub: 'follower, zone C', x: 560, y: 340, w: 120, kind: 'data', info: 'Ye kya hai: etcd follower, zone C mein. Leader gire aur iska random timeout pehle khatam ho, to ye candidate ban ke naya leader ban sakta hai.' },
          { id: 'dbm', label: 'DB Mumbai', sub: 'version vectors', x: 115, y: 300, w: 150, kind: 'data', info: 'Ye kya hai: caption data ki Mumbai copy. Yahan bhi write ho sakta hai. Har version pe vector clock, taaki Chennai ke saath conflict pakda ja sake (LWW ki jagah).' },
          { id: 'dbc', label: 'DB Chennai', sub: 'version vectors', x: 115, y: 440, w: 150, kind: 'data', info: 'Ye kya hai: caption data ki Chennai copy. Sync pe vectors compare hote hain: purana, naya, ya concurrent (dono rakho).' },
          { id: 'ntp', label: 'Time servers', sub: 'NTP, GPS / atomic', x: 470, y: 540, w: 170, kind: 'net', info: 'Ye kya hai: sahi time dene wale servers (NTP). Logs aur expiry ke liye machines ki wall clock theek rakhte hain. Lekin order ka faisla inke bharose nahi: wo logical clocks aur Raft se hota hai.' },
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
          { name: 'Leader key (Raft)', text: 'App ne etcd leader S1 ko likha. S1 ne entry sab followers ko bheji; 3 of 5 pe commit. Workers ko watch se naya leader pata chala.', go: ['users>app>s1', 's1>s2', 's1>s3', 's1>s4', 's1>s5', 's1>workers'] },
          { name: 'Leader crash', text: 'S1 gira. S5 ka random timeout pehle khatam: term +1, S3 aur S4 se vote, 3 of 5 (khud mila ke). Naya leader.', go: ['s5>s4', 's5>s3'] },
          { name: 'Caption (vectors)', text: 'Caption Mumbai copy pe likha gaya. Chennai se sync pe vectors compare: concurrent ho to dono versions rakhe, chupchaap kuch nahi phenka.', go: ['users>app>dbm', 'dbm>dbc'] },
          { name: 'Time sync', text: 'Machines NTP se wall clock theek rakhti hain (logs, expiry). Order ke liye inpe bharosa nahi.', go: ['ntp>dbm', 'ntp>dbc'] },
        ],
      },
      { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
        <li>Physical ghadiyan drift karti hain (ppm), NTP sirf andaza lagata hai aur ghadi peeche bhi jump kar sakti hai. "Bada timestamp = baad mein hua" pe bharosa mat karo.</li>
        <li>Duration / timeout hamesha monotonic clock se.</li>
        <li>Lamport clock: a → b to L(a) &lt; L(b). Ulta sach nahi. Total order ke liye (L, node ID).</li>
        <li>Vector clocks batate hain: purana, naya, ya concurrent (conflict). LWW chupchaap data kho sakta hai.</li>
        <li>Raft: ek leader per term, random election timeouts, majority votes, majority pe commit. Committed entry kabhi nahi mitti.</li>
        <li>Majority = ⌊N/2⌋ + 1, tolerance = (N − 1)/2. Odd sizes (3, 5). Majority na ho to system rukta hai, galat nahi bolta.</li>
        <li>Paxos: same majority idea, do rounds; proposer ko purani accepted value aage badhani padti hai. Spanner TrueTime: galti ε ka pakka size, commit pe ~2ε wait.</li>
        <li>Decide: consensus khud mat banao. etcd / ZooKeeper use karo.</li>
      </ul>` },


      { type: 'tradeoffs',
        gains: ['Logical clocks (Lamport, vector) bina ghadi ke sahi causal order dete hain', 'Raft/Paxos: majority zinda ho to sahi faisla, koi split brain nahi', 'Committed data kabhi nahi palatta (safety), crash aur partition ke baad bhi', 'Automatic leader failover, insaan ki zaroorat nahi', 'TrueTime jaisi ghadi se globally ordered transactions'],
        costs: ['Har write pe majority ka round trip: latency, aur door ke regions mein aur zyada', 'Majority na ho to system ruk jaata hai (availability chhodi safety ke liye)', 'Leader bottleneck: saare writes ek machine se', 'Sahi implement karna bahut mushkil: ready-made (etcd/ZooKeeper) use karo', 'Vector clocks ka size nodes ke saath badhta hai; TrueTime ke liye special hardware'] },
      { type: 'think', questions: [
        { q: 'xyz.com ka etcd cluster 5 nodes ka hai: 3 Mumbai DC mein, 2 Chennai DC mein. Mumbai DC poora down. Kya hoga, aur behtar layout kya hai?', a: 'Chennai mein 2 of 5 bache, majority 3 chahiye. Koi leader nahi ban sakta, writes ruk jaayenge (reads bhi agar linearizable chahiye). Behtar: teen alag failure zones mein 2 + 2 + 1. Koi bhi ek zone gire, 3 bache rahenge.' },
        { q: 'Ek candidate ka log purana hai (usne pichhli 3 committed entries miss ki thi, kyunki wo down tha). Kya wo leader ban sakta hai?', a: 'Nahi. Committed entries majority ke paas hain, aur leader banne ke liye majority ke votes chahiye; dono majorities mein kam se kam ek common server hoga jiske paas wo entries hain. Wo server election restriction ki wajah se purane log wale ko vote nahi dega. Isliye leader hamesha saari committed entries ke saath aata hai.' },
        { q: 'xyz.com ka ek server Singapore ke time server se NTP sync karta hai. Jaane ka raasta 80 ms, aane ka 20 ms. NTP kitna galat hoga, aur kya karoge?', a: 'Galti = (80 − 20) / 2 = 30 ms, aur NTP ko pata bhi nahi chalega (wo dono taraf barabar maanta hai). Fix: paas wala time server (cloud provider ka apna, ek hi region mein), jisse delay hi kam ho; galti kabhi delay/2 se zyada nahi hoti.' },
        { q: 'Kya Lamport timestamps se LWW wali caption problem theek ho jaati?', a: 'Aanshik roop se. Agar doosra edit pehle edit ko "dekh ke" hua (causally baad mein), to Lamport number bada hoga aur LWW sahi chunega. Lekin agar do edits concurrent hain (alag devices se, ek doosre ko jaane bina), to Lamport bas ek ko arbitrary jitayega, bina bataye ki conflict tha. Conflict pakadna ho to vector clocks chahiye.' },
      ]},
      { type: 'quiz', questions: [
        { q: 'Request kitni der chali, ye naapne ke liye kaunsa clock?', options: ['Wall clock (time of day)', 'Monotonic clock', 'Lamport clock', 'Koi bhi'], answer: 1, explain: 'Wall clock NTP se peeche jump kar sakta hai, duration negative ho sakti hai (Cloudflare 2017). Monotonic clock sirf aage badhta hai.' },
        { q: 'L(a) = 3 aur L(b) = 5 (Lamport). Kya pakka hai?', options: ['a → b', 'b → a', 'b → a nahi ho sakta', 'a aur b concurrent hain'], answer: 2, explain: 'Agar b → a hota to L(b) < L(a) hona chahiye tha. Lekin a → b bhi pakka nahi: dono concurrent bhi ho sakte hain (jaise widget mein e9 aur e8).' },
        { q: 'Raft mein ek entry kab committed maani jaati hai?', options: ['Jab leader apne log mein likh le', 'Jab saare 5 servers ke paas ho', 'Jab current term ka leader use majority ke logs mein pahuncha de', 'Jab client ACK kare'], answer: 2, explain: 'Majority pe replication (leader ke current term mein) = commit. Saare servers ka wait nahi; sirf leader ka likhna kaafi nahi.' },
        { q: '6 nodes ka Raft cluster kitne failures jhel sakta hai?', options: ['3', '2', '1', '5'], answer: 1, explain: 'Majority = 4, to 2 gir sakte hain. Utna hi jitna 5 nodes. Isliye odd numbers.' },
        { q: 'Raft mein election timeouts random kyun hote hain?', options: ['Security ke liye', 'Taaki aksar ek hi server pehle candidate bane aur split votes kam hon', 'Taaki leader zyada der chale', 'Clock skew theek karne ke liye'], answer: 1, explain: 'Sab ek saath jaagein to votes bant jaate hain. Randomness se aam taur pe ek jeet jaata hai; split ho bhi to agla round naye random timeout se suljhta hai.' },
        { q: 'Mumbai copy pe version [M 3, C 1] hai, Chennai pe [M 2, C 2]. Sync pe kya hoga?', options: ['Mumbai jeetega, 3 bada hai', 'Chennai jeetega, baad mein aaya', 'Concurrent: dono versions rakho', 'Dono ka average'], answer: 2, explain: 'M position mein Mumbai bada (3 > 2), C position mein Chennai bada (2 > 1). Koi doosre se poori tarah bada nahi: concurrent, yaani conflict.' },
        { q: 'Paxos mein P2 ko prepare ke jawab mein pata chala ki ek acceptor ne pehle (1, "worker-1") accept kiya tha. P2 khud "worker-2" chahta hai. Wo kya bhejega?', options: ['"worker-2", kyunki uska number 2 bada hai', '"worker-1", purani accepted value', 'Kuch nahi, ruk jaayega', 'Dono values'], answer: 1, explain: 'Rule: sabse bade number wali pehle accepted value hi aage badhao. Ho sakta hai "worker-1" pehle hi chosen ho chuki ho; use badalna safety todta.' },
        { q: 'Client aur NTP server ke beech round trip delay 40 ms hai. NTP ka offset maximum kitna galat ho sakta hai?', options: ['40 ms', '20 ms', '10 ms', '0, NTP hamesha sahi hai'], answer: 1, explain: 'Galti = (jaana − aana)/2, jo kabhi delay/2 se zyada nahi ho sakti. 40/2 = 20 ms.' },
        { q: 'Spanner ka "commit wait" kya karta hai?', options: ['Majority ke acks ka wait', 'Commit timestamp s ke baad TT.after(s) true hone tak data dikhane se rukna', 'NTP sync ka wait', 'Leader election ka wait'], answer: 1, explain: 'Isse pakka hota hai ki s asli waqt mein beet chuka hai, to baad mein shuru hone wala koi bhi transaction bada timestamp payega (external consistency). Wait lagbhag 2ε.' },
      ]},
      { type: 'sources', note: 'Raft ke rules, numbers (150-300 ms, 43 mein se 33 students) aur Spanner TrueTime details original papers se check kiye gaye.', items: [
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
