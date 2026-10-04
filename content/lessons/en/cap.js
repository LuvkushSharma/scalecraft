Lesson.register({
  id: 'cap',
  title: 'CAP and PACELC',
  minutes: 22,
  summary: `The network between two data centres breaks. Now every replicated system has to make a hard choice: show wrong (old) data, or show an error? CAP explains this choice. PACELC adds that even with no failure at all, there is a small choice every day: speed or consistency.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `xyz.com now keeps its data in two cities, Mumbai and Singapore. Each city has a copy.<br>One day the cable between the two cities is cut. The computers in both cities still work. They just cannot talk to each other.<br>Now a user asks for something. The computer has only two options: <strong>say "this cannot be done right now"</strong>, or <strong>give the old data it already has</strong>.<br>This lesson teaches you when to pick which option. It also shows that even when the cable is fine, there is a small choice every day: a fast answer or a perfectly fresh answer.` },
    { type: 'h2', text: 'The problem: the cable is cut, now what?' },
    { type: 'p', html: `In Phase 2, xyz.com learned a lot: copies of data (replication), pieces of data (sharding), and machines agreeing on decisions (coordination). Now xyz.com has users in India and also in South-East Asia, so the data lives in two regions: <strong>Mumbai</strong> and <strong>Singapore</strong>. Each region has its own copy. A network link between them carries updates back and forth.` },
    { type: 'callout', tone: 'term', title: 'New words: region, replica, majority', html: `<strong>Region:</strong> a city or area where a cloud company has a data centre (for example "Mumbai region"). Machines inside one region talk to each other in about 1 ms. Between two regions it takes several tens of milliseconds.<br><strong>Replica:</strong> a full copy of the data on another machine (see the replication lesson). If "who owns seat A7" is written on 3 machines, there are 3 replicas.<br><strong>Majority:</strong> more than half. With 3 replicas, a majority is 2. The rule: make a final decision only when a majority says yes, because two separate groups can never both be a majority (see the coordination lesson).<br><strong>Why we need them:</strong> we keep copies so that the data survives if one machine or one city fails, and so that nearby users get fast answers.<br><strong>Without them:</strong> with one copy in one city, a Singapore user would travel to Mumbai on every click, and if Mumbai went down, everything would be gone.` },
    { type: 'image', src: 'assets/img/cap/submarine-cable-map.jpg', alt: 'A world map where red lines show internet cables laid under the sea; many cables connect India, Singapore and Europe', caption: 'This is a map of the undersea internet cables of the world (data from 2015). Regions like Mumbai and Singapore are connected by cables like these. If a ship\'s anchor or an earthquake cuts a cable, the path between regions can break or become very slow. This is what a "partition" looks like in real life.', credit: { text: 'Greg Mahlknecht (cable data) and OpenStreetMap contributors, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Submarine_cable_map_umap.png', license: 'CC BY-SA 2.0' } },
    { type: 'p', html: `A new feature launches: <strong>xyz Tickets</strong>, where people book seats for concerts and cricket matches. One day the link between Mumbai and Singapore breaks (a problem with an undersea cable, a wrong router setting, anything). The servers in both regions are alive. Users are arriving on both sides. The regions just cannot talk to each other.` },
    { type: 'p', html: `At that moment Riya books seat <strong>A7</strong> in Mumbai. In Singapore, Aman also wants to book A7. The Singapore server does not know about Riya's booking at all. What should the Singapore server do?` },
    { type: 'compare',
      left: { title: 'Option 1: say no', html: `"Booking is not possible right now. Please try again in a little while."<br><br>The data will not be wrong (no double booking), but Aman got an <strong>error</strong>. The system chose <strong>consistency</strong>.` },
      right: { title: 'Option 2: say yes', html: `"A7 is yours!"<br><br>Aman is happy and the system kept working. But when the network is fixed, we will find out that A7 was sold to two people. The system chose <strong>availability</strong>.` },
    },
    { type: 'p', html: `There is no third option. Singapore has no way to get news from Mumbai, so it can either wait or answer with a guess. That is the whole idea of the <strong>CAP theorem</strong>. Now let us understand the three letters properly.` },
    { type: 'callout', tone: 'term', title: 'New word: Network partition', html: `<strong>What it is:</strong> the machines are alive, but the messages between them <strong>do not arrive</strong> (they get lost or arrive very late). The network splits into two (or more) parts. Each part works fine inside, but it cannot see the other part.<br><strong>Why it matters:</strong> as long as copies of data live on different machines, this will happen one day: a cable gets cut, a router is set up wrongly, a firewall rule is added by mistake.<br><strong>If you ignore it:</strong> on that day the system does "whatever happens": sometimes a double booking, sometimes the whole site gets stuck, and nobody knows why.<br><strong>Careful:</strong> the "partition" in sharding (pieces of data) is a different thing. Here, partition means <em>the network is broken</em>.` },

    { type: 'h2', text: 'C, A and P: in plain words, and what they really mean' },
    { type: 'p', html: `CAP is short for three words. Eric Brewer suggested a conjecture in 2000 (a conjecture is a guess that has not been proved yet). In 2002, Seth Gilbert and Nancy Lynch proved it with maths, and that is when exact definitions of the three letters were written down. People often use CAP loosely, so here is each letter on its own, with a small example:` },
    { type: 'callout', tone: 'term', title: 'C = Consistency (meaning linearizability)', html: `<strong>What it is:</strong> the system behaves <strong>as if there were only one copy of the data</strong>. As soon as a write succeeds, every read that starts after it (from any replica, anywhere in the world) sees that new value, or an even newer one. Never an old one.<br><strong>Why we need it:</strong> for some data, "slightly old" is simply wrong. Seat A7 already belongs to Riya, so if Aman sees A7 as free, we get a double booking.<br><strong>Without it:</strong> two users see two different truths about the same thing, and both act on it.<br><strong>Example:</strong> at 10:00:00 Riya's booking gets "OK". At 10:00:01 Aman looks at A7 from Singapore. A C system will show him "booked", even if the update has not reached the Singapore copy yet (if needed, it will go and ask Mumbai first).<br>The technical name of this strong promise is <strong>linearizability</strong>: every operation "happens" at a single instant, and everyone sees the same order. (There are weaker levels too, like causal or eventual. Those are in the next lesson, "Consistency models and quorums".)` },
    { type: 'callout', tone: 'term', title: 'A = Availability (the CAP kind)', html: `<strong>What it is:</strong> every server that is alive and gets a request <strong>gives a real answer, not an error</strong>. Formal definition: every request received by a non-failing (alive) node must eventually get a non-error response.<br><strong>Why we need it:</strong> showing a user a "something went wrong" page is also a loss: the like did not work, the post did not show, the user left.<br><strong>Without it:</strong> even a small network problem gives errors to all users of a region.<br><strong>Example:</strong> the cable is cut. Aman presses like on the Singapore server. An A system says "liked!", even though Mumbai does not know yet. Saying "this cannot be done right now" = availability is broken.<br><strong>Careful:</strong> this is different from "99.9% uptime" and much stricter: during a partition, <em>every</em> alive node, even one in a small cut-off part, must answer.` },
    { type: 'callout', tone: 'term', title: 'P = Partition tolerance', html: `<strong>What it is:</strong> network messages can be lost or delayed, and the system <strong>still tries to keep working</strong> instead of freezing. Formally: the network may drop any number of messages.<br><strong>Why we need it:</strong> P is not a "feature" you can switch on or off. It simply accepts the truth that the network will break.<br><strong>Without it:</strong> the design assumes "the network never breaks". On the day it breaks, nobody has thought about what will happen.<br><strong>Example:</strong> the Mumbai ↔ Singapore cable stayed cut for 3 hours. A partition-tolerant system followed a rule decided in advance (CP or AP). A system that was not tolerant sometimes hung and sometimes gave wrong data.` },
    { type: 'table', head: ['Letter', 'Wrong idea', 'Real meaning'], rows: [
      ['C', 'The data is "fine", or the C in ACID', 'Every read sees the latest successful write, as if there were one copy (linearizability)'],
      ['A', 'The site is up 99.9% of the time', 'Every alive node answers every request without an error, even during a partition'],
      ['P', 'The system "supports" partitions', 'The network can drop messages; this will happen, it is not your choice'],
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common mistake: two different "C"s', html: `The C in ACID (the database rules are never broken: for example a balance never goes negative, a foreign key is always valid) and the C in CAP (all replicas show the same latest value) are <strong>completely different things</strong>. One word, two meanings. In an interview, when you say "consistency", also say which one you mean.` },
    { type: 'p', html: `Now the theorem in one line: <strong>when there is a network partition, a replicated system can give either C or A, not both.</strong> The idea of the proof is the Riya-Aman story above: Singapore simply cannot see Mumbai's new write. If it answers (A), it may give old data (C is broken). If it must guarantee correct data (C), it has to stay silent (A is broken).` },

    { type: 'h2', text: 'Run it yourself: normal, CP and AP' },
    { type: 'p', html: `Setup: the seat data has <strong>3 replicas</strong>. 2 are in Mumbai and 1 is in Singapore. Every decision needs a majority (2 out of 3), as we saw in the coordination lesson. Run each scenario and see what changes during a partition:` },
    { type: 'flow', height: 170,
      nodes: [
        { id: 'ua', label: 'Riya', sub: 'Mumbai user', x: 70, y: 85, w: 110, kind: 'client', info: 'What it is: a user who lives near Mumbai. Her requests go to the Mumbai region because it is close (low latency).' },
        { id: 'dm', label: 'Mumbai DB', sub: '2 of 3 replicas', x: 215, y: 85, w: 130, kind: 'data', info: 'What it is: 2 copies (replicas) of the seat data in the Mumbai region. 2 out of 3 = a majority, so even during a partition this side can make decisions alone (in CP mode).' },
        { id: 'ln', label: 'Network link', sub: 'Mumbai ↔ SG', x: 360, y: 85, w: 110, kind: 'net', info: 'What it is: the network between the two regions (undersea cables, routers). Updates travel from one region to the other through it. When it breaks, that is a partition. On a normal day, one round trip from Mumbai to Singapore takes several tens of milliseconds.' },
        { id: 'ds', label: 'Singapore DB', sub: '1 of 3 replicas', x: 505, y: 85, w: 130, kind: 'data', info: 'What it is: 1 copy (replica) in the Singapore region. It is here to give fast answers to nearby users. Alone, it is a minority: during a partition, CP mode does not let it make decisions, AP mode does.' },
        { id: 'ub', label: 'Aman', sub: 'Singapore user', x: 650, y: 85, w: 110, kind: 'client', info: 'What it is: a user who lives near Singapore. His requests go to the Singapore region.' },
      ],
      edges: [{ a: 'ua', b: 'dm' }, { a: 'dm', b: 'ln' }, { a: 'ln', b: 'ds' }, { a: 'ds', b: 'ub' }],
      scenarios: [
        { name: 'Normal day', intro: 'The network is fine. Watch how one write and one far-away read work.', steps: [
          { title: 'Riya books A7', text: 'The request reaches Mumbai.', go: 'ua>dm', msg: 'POST /book  { seat: "A7", user: "riya" }' },
          { title: 'Majority reached, commit', text: 'Both Mumbai replicas wrote it: 2 out of 3 = a majority. The write is final. Riya gets a confirmation.', go: 'res:dm>ua', after: { dm: { state: 'ok', sub: 'A7 = Riya' } }, msg: '200 OK  A7 confirmed' },
          { title: 'Copy to Singapore', text: 'The same update also travels over the link to the Singapore replica.', go: 'evt:dm>ln>ds', after: { ds: { state: 'ok', sub: 'A7 = Riya' } } },
          { title: 'Aman looks at A7', text: 'Aman\'s read reaches Singapore. For a linearizable read, Singapore first checks with Mumbai (the majority) that it has the latest data. This costs one round trip over the link: this is <strong>the latency price of consistency</strong>, even with no failure. This is the "else" part of PACELC (below).', go: ['ub>ds', 'ds>ln>dm', 'res:dm>ln>ds', 'res:ds>ub'], msg: 'GET /seat/A7  →  booked (Riya)' },
        ]},
        { name: 'Partition: CP mode', intro: 'The link is broken. The system has chosen consistency.', steps: [
          { title: 'The link breaks', text: 'Mumbai and Singapore are both alive, but messages between them do not arrive.', set: { ln: { state: 'down', sub: 'PARTITION' } }, go: 'lost:dm>ln' },
          { title: 'Riya\'s booking works', text: 'Mumbai has 2 of the 3 replicas = a majority. It can decide safely.', go: ['ua>dm', 'res:dm>ua'], after: { dm: { state: 'ok', sub: 'A7 = Riya' } }, msg: '200 OK  A7 confirmed (2 of 3 replicas)' },
          { title: 'Aman\'s booking: error', text: 'Singapore is alone (1 of 3). It does not know what happened in Mumbai. Instead of giving a wrong answer, it <strong>says no</strong>. The data stays safe, but for Singapore users this feature is <strong>unavailable</strong> right now.', go: ['ub>ds', 'bad:ds>ub'], set: { ds: { state: 'warn', sub: 'minority: stop' } }, msg: '503 Service Unavailable  "Please try again later"' },
          { title: 'Aman\'s read is an error too', text: 'Reads are refused as well, because the Singapore copy may be old and CP promises "never old". (Some systems allow "maybe old" reads on the minority side, but then that read is no longer linearizable.)', go: ['ub>ds', 'bad:ds>ub'], msg: 'GET /seat/A7  →  503' },
          { title: 'Network fixed: catch up', text: 'The link is back. Singapore gets the missing updates from the majority. There is no conflict, because only one side wrote during the partition.', set: { ln: { state: '', sub: 'Mumbai ↔ SG' } }, go: 'evt:dm>ln>ds', after: { ds: { state: 'ok', sub: 'A7 = Riya' } } },
        ]},
        { name: 'Partition: AP mode', intro: 'The same partition. This time the system has chosen availability.', steps: [
          { title: 'The link breaks', text: 'Same situation.', set: { ln: { state: 'down', sub: 'PARTITION' } }, go: 'lost:dm>ln' },
          { title: 'Riya\'s booking: confirmed', text: 'Mumbai writes it to its own copy.', go: ['ua>dm', 'res:dm>ua'], after: { dm: { state: 'ok', sub: 'A7 = Riya' } }, msg: '200 OK  A7 confirmed' },
          { title: 'Aman\'s booking: also confirmed!', text: 'In the Singapore copy, A7 still looks free, so it also says yes. Both users are happy. For now.', go: ['ub>ds', 'res:ds>ub'], after: { ds: { state: 'ok', sub: 'A7 = Aman' } }, msg: '200 OK  A7 confirmed' },
          { title: 'Network fixed: conflict', text: 'The updates are exchanged: one seat, two owners. If the system uses <strong>last-write-wins</strong> (the one with the bigger timestamp wins), Riya\'s booking silently disappears, even though she already got a confirmation.', set: { ln: { state: '', sub: 'Mumbai ↔ SG' } }, go: ['evt:dm>ln>ds', 'evt:ds>ln>dm'], parallel: true, after: { dm: { state: 'hot', sub: 'CONFLICT' }, ds: { state: 'hot', sub: 'CONFLICT' } } },
          { title: 'Now compensation', text: 'One user gets a sorry email, a refund or another seat. This is called <strong>compensation</strong>: fixing a mistake afterwards in a business way. For a seat, this is a bad deal. That is why the seat lock should be CP.', focus: ['ua', 'ub'] },
        ]},
        { name: 'Likes: AP is right', intro: 'The same partition, but this time the data is the likes on a concert post. Why is AP fine here?', steps: [
          { title: 'The link breaks', text: 'Same situation.', set: { ln: { state: 'down', sub: 'PARTITION' } }, go: 'lost:dm>ln' },
          { title: 'Likes on both sides', text: '2 likes in Mumbai, 3 in Singapore. Both sides accept them. Each side counts its own likes separately.', go: ['ua>dm', 'ub>ds'], parallel: true, after: { dm: { sub: 'likes: M=2, S=0' }, ds: { sub: 'likes: M=0, S=3' } } },
          { title: 'A slightly old count is shown', text: 'Riya sees 2, Aman sees 3. The real total is 5. Nobody lost anything, the count is just a little old.', go: ['res:dm>ua', 'res:ds>ub'], parallel: true },
          { title: 'Network fixed: merge, nothing lost', text: 'Each side kept its own count, so merging is easy: Mumbai\'s 2 + Singapore\'s 3 = 5. This is a small example of a <strong>CRDT</strong> (next lesson). Far better than showing an error.', set: { ln: { state: '', sub: 'Mumbai ↔ SG' } }, go: ['evt:dm>ln>ds', 'evt:ds>ln>dm'], parallel: true, after: { dm: { state: 'ok', sub: 'likes = 5' }, ds: { state: 'ok', sub: 'likes = 5' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'Partition simulator: break it yourself, see it yourself' },
    { type: 'p', html: `Now you run the system. There are two features: <strong>the lock on seat A7</strong> and the <strong>likes</strong> on a concert post. Choose CP or AP for each feature, cut the cable, send writes and reads on both sides, then fix the network and see what happens during reconciliation (making the two copies one again).` },
    { type: 'list', items: [
      `<strong>Try 1 (default):</strong> seat CP, likes AP. Cut the cable. Book A7 in Mumbai (works), book A7 in Singapore (503 error). Give 2-3 likes on both sides. Press Read in Singapore. Then heal: A7 is Riya's, and the likes total is correct.`,
      `<strong>Try 2:</strong> Reset, set the seat to AP. Cut the cable, book A7 on both sides. Both get a confirmation! Heal: last-write-wins eats one booking, and the "lost" counter becomes 1.`,
      `<strong>Try 3:</strong> Reset, set the likes to CP. During the partition, likes in Singapore also give an error. Think: is showing an error for a like a good deal?`,
    ]},
    { type: 'custom', render(el) {
      function capCore() {
        const who = { M: 'Riya', S: 'Aman' }, place = { M: 'Mumbai', S: 'Singapore' };
        const fresh = () => ({ link: true, mode: { seat: 'CP', likes: 'AP' }, t: 0,
          rep: { M: { seat: null, likes: { M: 0, S: 0 } }, S: { seat: null, likes: { M: 0, S: 0 } } },
          st: { ok: 0, err: 0, lost: 0 }, log: [] });
        let S = fresh();
        const other = s => (s === 'M' ? 'S' : 'M');
        const sum = l => l.M + l.S;
        const say = (cls, txt) => { S.log.unshift({ cls, txt }); if (S.log.length > 7) S.log.pop(); };
        const blocked = (side, f) => !S.link && S.mode[f] === 'CP' && side === 'S';
        const err = (side, what) => { S.st.err++; say('bad', `${place[side]}: ${what} → ERROR 503. This is the minority side (1 of 3 replicas); it cannot reach the majority, so it said no.`); };
        const act = {
          reset() { S = fresh(); },
          get() { return S; },
          setMode(f, m) { if (S.link) S.mode[f] = m; },
          cut() { if (!S.link) return; S.link = false; say('warn', 'The Mumbai ↔ Singapore cable is cut. Servers on both sides are alive, but messages between them do not arrive.'); },
          book(side) {
            if (blocked(side, 'seat')) return err(side, `${who[side]}'s A7 booking`);
            const r = S.rep[side];
            if (r.seat) { say('', `${place[side]}: "A7 already belongs to ${r.seat.who}" (this is a correct answer, not an error).`); return; }
            const v = { who: who[side], ts: ++S.t };
            if (S.link) { S.rep.M.seat = { ...v }; S.rep.S.seat = { ...v }; } else r.seat = v;
            S.st.ok++;
            say('ok', `${place[side]}: A7 CONFIRMED for ${who[side]} (time ${v.ts}).${S.link ? '' : ' The other side does not know yet.'}`);
          },
          like(side) {
            if (blocked(side, 'likes')) return err(side, 'like');
            S.t++;
            if (S.link) { S.rep.M.likes[side]++; S.rep.S.likes[side]++; } else S.rep[side].likes[side]++;
            S.st.ok++;
            say('ok', `${place[side]}: like +1 → total here ${sum(S.rep[side].likes)}.`);
          },
          read(side) {
            const r = S.rep[side], o = S.rep[other(side)];
            const parts = [];
            for (const f of ['seat', 'likes']) {
              if (blocked(side, f)) { S.st.err++; parts.push(f === 'seat' ? 'A7: ERROR 503' : 'likes: ERROR 503'); continue; }
              const val = f === 'seat' ? (r.seat ? r.seat.who : 'free') : sum(r.likes);
              const oval = f === 'seat' ? (o.seat ? o.seat.who : 'free') : sum(o.likes);
              parts.push((f === 'seat' ? 'A7: ' : 'likes: ') + val + (!S.link && S.mode[f] === 'AP' && val !== oval ? ' (other side has ' + oval + '!)' : ''));
            }
            say(parts.some(p => p.includes('ERROR')) ? 'bad' : parts.some(p => p.includes('!')) ? 'warn' : '', `${place[side]} read → ${parts.join(', ')}`);
          },
          heal() {
            if (S.link) return;
            S.link = true;
            const M = S.rep.M, Sg = S.rep.S, out = [];
            if (S.mode.seat === 'CP') { Sg.seat = M.seat ? { ...M.seat } : null; out.push('A7: Singapore took the Mumbai (majority) copy, no conflict'); }
            else if (M.seat && Sg.seat && (M.seat.who !== Sg.seat.who || M.seat.ts !== Sg.seat.ts)) {
              const win = M.seat.ts > Sg.seat.ts ? M.seat : Sg.seat, lose = win === M.seat ? Sg.seat : M.seat;
              M.seat = { ...win }; Sg.seat = { ...win }; S.st.lost++;
              out.push(`A7 CONFLICT: both got a confirmation! Last-write-wins: ${win.who} won (time ${win.ts} > ${lose.ts}), ${lose.who}'s booking silently disappeared`);
            } else { const v = M.seat || Sg.seat; M.seat = v ? { ...v } : null; Sg.seat = v ? { ...v } : null; out.push('A7: only one side changed it, that copy now on both sides'); }
            if (S.mode.likes === 'CP') { Sg.likes = { ...M.likes }; out.push(`likes: Singapore took the Mumbai copy (${sum(M.likes)})`); }
            else { const m = { M: Math.max(M.likes.M, Sg.likes.M), S: Math.max(M.likes.S, Sg.likes.S) }; M.likes = { ...m }; Sg.likes = { ...m }; out.push(`likes merge: Mumbai's ${m.M} + Singapore's ${m.S} = ${sum(m)}, not a single like lost`); }
            say(S.st.lost ? 'warn' : 'ok', 'Network fixed. Reconciliation: ' + out.join('; ') + '.');
          },
        };
        return act;
      }
      const sim = capCore();
      el.innerHTML = `<div class="cp-modes" style="display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:12px 0">
          <button type="button" class="btn small primary cp-link"></button>
          <button type="button" class="btn small ghost cp-reset">Reset</button>
          <span class="cp-linkst" style="font:600 13px var(--f-mono)"></span>
        </div>
        <div class="cp-sides" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px"></div>
        <div class="stats">
          <div class="stat"><span>Confirmations given</span><strong class="cp-ok"></strong></div>
          <div class="stat"><span>Errors (unavailable)</span><strong class="cp-err"></strong></div>
          <div class="stat"><span>Confirmed writes that were lost</span><strong class="cp-lost"></strong></div>
        </div>
        <div class="cp-log" style="margin-top:10px;font:12.5px/1.5 var(--f-mono);background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r-sm);padding:8px 10px;min-height:60px"></div>
        <div class="calc-note">3 replicas: 2 in Mumbai (majority), 1 in Singapore. When the link is fine, every write reaches both sides at once. You can change a mode only when the link is fine. Each feature has its own mode: this is the "per-feature choice".</div>`;
      const q = s => el.querySelector(s);
      const place = { M: 'Mumbai', S: 'Singapore' }, user = { M: 'Riya', S: 'Aman' }, reps = { M: '2 of 3 replicas', S: '1 of 3 replicas' };
      const mkBtn = (txt, cls, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small ' + cls; b.textContent = txt; b.onclick = () => { fn(); draw(); }; return b; };
      const draw = () => {
        const S = sim.get();
        const modes = q('.cp-modes'); modes.innerHTML = '';
        [['seat', 'Seat A7 lock'], ['likes', 'Post likes']].forEach(([f, name]) => {
          const wrap = document.createElement('span'); wrap.style.cssText = 'display:inline-flex;flex-wrap:wrap;gap:6px;align-items:center';
          const l = document.createElement('span'); l.textContent = name + ':'; l.style.cssText = 'font-size:14px;color:var(--ink-2)'; wrap.appendChild(l);
          ['CP', 'AP'].forEach(m => {
            const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (S.mode[f] === m ? ' on' : ''); b.textContent = m;
            b.disabled = !S.link; if (!S.link) b.title = 'Fix the network first';
            b.onclick = () => { sim.setMode(f, m); draw(); }; wrap.appendChild(b);
          });
          modes.appendChild(wrap);
        });
        q('.cp-link').textContent = S.link ? 'Cut the cable (partition)' : 'Fix the network (heal)';
        q('.cp-linkst').textContent = S.link ? 'Link: OK' : 'Link: PARTITION';
        q('.cp-linkst').style.color = S.link ? 'var(--green)' : 'var(--red)';
        const sides = q('.cp-sides'); sides.innerHTML = '';
        ['M', 'S'].forEach(sd => {
          const r = S.rep[sd], card = document.createElement('div');
          const minority = !S.link && sd === 'S' && (S.mode.seat === 'CP' || S.mode.likes === 'CP');
          card.style.cssText = `border:1.5px solid ${minority ? 'var(--amber)' : 'var(--line)'};border-radius:var(--r);padding:10px;background:var(--surface)`;
          card.innerHTML = `<div style="font-weight:700">${place[sd]} <span style="font-weight:400;color:var(--ink-3);font-size:13px">(${reps[sd]})</span></div>
            <div style="font:13px/1.6 var(--f-mono);margin:6px 0">A7: <strong>${r.seat ? r.seat.who : 'free'}</strong><br>likes: <strong>${r.likes.M + r.likes.S}</strong> <span style="color:var(--ink-3)">(M ${r.likes.M} + S ${r.likes.S})</span></div>`;
          const bx = document.createElement('div'); bx.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px';
          bx.append(mkBtn('Book A7 (' + user[sd] + ')', 'primary', () => sim.book(sd)), mkBtn('Like +1', 'ghost', () => sim.like(sd)), mkBtn('Read', 'ghost', () => sim.read(sd)));
          card.appendChild(bx); sides.appendChild(card);
        });
        q('.cp-ok').textContent = S.st.ok; q('.cp-err').textContent = S.st.err; q('.cp-lost').textContent = S.st.lost;
        q('.cp-lost').style.color = S.st.lost ? 'var(--red)' : '';
        const col = { bad: 'var(--red)', warn: 'var(--amber)', ok: 'var(--green)', '': 'var(--ink-2)' };
        q('.cp-log').innerHTML = S.log.length ? S.log.map((l, i) => `<div style="color:${col[l.cls]};${i ? 'opacity:.75' : ''}">• ${l.txt}</div>`).join('') : '<div style="color:var(--ink-3)">Start: press "Cut the cable", then book A7 on both sides and press Like.</div>';
      };
      q('.cp-link').onclick = () => { const S = sim.get(); if (S.link) sim.cut(); else sim.heal(); draw(); };
      q('.cp-reset').onclick = () => { sim.reset(); draw(); };
      draw();
    }},
    { type: 'p', html: `What you saw, in short: in <strong>CP</strong>, the minority side (Singapore) gives errors, but nothing needs fixing after the heal. In <strong>AP</strong>, everyone answers, but after the heal the divergent copies (copies that have become different) must be merged. Some data merges easily (likes: add up each side's count). Some data cannot be merged at all (one seat, two owners). So <strong>the choice depends on the data</strong>, not one choice for the whole system.` },
    { type: 'callout', tone: 'tip', title: 'The three phases of a partition (Brewer, 2012)', html: `Brewer's advice: handle a partition like a "mode". (1) <strong>Detect</strong> that a partition has started (usually through a timeout). (2) Enter <strong>partition mode</strong>: stop or limit some operations (for example, booking stops, browsing continues). (3) <strong>Recovery</strong>: when the network is fixed, merge the copies and <strong>compensate</strong> for the mistakes that happened (refund, sorry email, another seat). Airlines do the same with overbooking: if a mistake happens, they compensate later.` },

    { type: 'h2', text: 'Why "pick 2 of 3" is the wrong picture' },
    { type: 'p', html: `CAP is often taught with a triangle: "Pick any 2 of C, A, P: CA, CP or AP." It sounds easy, but it puts three wrong ideas in your head:` },
    { type: 'steps', items: [
      { t: 'P is not optional', d: `As soon as data lives on two machines with a network between them, the network will break one day: a cable, a switch, a wrong firewall rule, or a long GC pause on one machine (the program stops for a few seconds to clean up memory) during which it seems to "disappear". "We don't pick P" really means "we assume the network never breaks", and nobody has thought about what the system will do when it does. So the real choice is only between two: <strong>C or A during a partition</strong>.` },
      { t: 'The choice exists only during a partition', d: `When the network is fine (most of the time), the system can have both C and A. CAP says you cannot have both during a partition. CAP says nothing about a normal day. PACELC describes the normal-day trade-off (below).` },
      { t: 'It is a dial, not a switch', d: `Different features of one app can make different choices (seat CP, likes AP). Different queries in one database can ask for different levels (in Cassandra each query has its own consistency level). And many systems are neither fully C nor fully A (only some nodes answer, or the data is a little old but within a limit).` },
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common mistake: "our system is CA"', html: `"CA" means consistent and available, but what about a partition? A database on a <strong>single machine</strong> (one PostgreSQL server with no replicas) is CA in a way, because there is no network partition inside it. But as soon as there are two machines, a partition is possible, and then it will either stop (it chose C) or give old data (it chose A). For a distributed system, "CA" has no practical meaning.` },
    { type: 'callout', tone: 'mistake', title: 'Common mistake: "AP means the data is never consistent"', html: `An AP system must also make all copies the same in the end. This is called <strong>eventual consistency</strong>: right now the copies may differ, but if new writes stop, after a short time they all become the same. AP only says that during a partition it will give a maybe-old answer instead of an error. And CP does not mean "never down" either: a CP system is unavailable on purpose on the minority side during a partition.` },
    { type: 'callout', tone: 'mistake', title: 'Common mistake: is a node crash also CAP?', html: `No. CAP talks only about a <strong>network partition</strong>, where nodes are alive but cannot talk. A node crashing is a different problem (see the failover and replicas lessons). But yes, from other machines' point of view, "it crashed" and "the network is cut" often look the same: in both cases no answer comes. This confusion causes split brain, which we saw in the coordination lesson.` },

    { type: 'h2', text: 'CP and AP: real examples' },
    { type: 'p', html: `Be careful when putting labels on real systems: most databases can be configured, and under the strict CAP definition very few systems are fully "CP" or fully "AP". Still, based on their default behaviour, this picture is useful:` },
    { type: 'table', head: ['What', 'Choice during a partition', 'Why'], rows: [
      ['Bank ledger, balance', 'CP', 'If money is withdrawn based on a wrong balance, that is a real loss. An error is better.'],
      ['Seat booking lock', 'CP', 'Selling one seat to two people (double booking) is worse than an error.'],
      ['etcd, ZooKeeper', 'CP', 'Writes need a majority. The minority side refuses writes (coordination lesson). etcd reads are also linearizable by default; ZooKeeper reads come from the local server by default and can be a little old (if you need the latest, call sync first).'],
      ['Google Spanner', 'CP', 'Chooses consistency during a partition. Google\'s private network has so few partitions that for users it feels almost "like CA" (Brewer, 2017).'],
      ['Likes, views, feed', 'AP', 'If a count is off by 3, there is no loss. Showing an error is bad UX.'],
      ['DNS', 'AP', 'Resolvers keep giving the old record from their cache until the TTL ends. A slightly old IP is fine; DNS being down is not.'],
      ['Shopping cart (Amazon Dynamo)', 'AP', '"Add to cart" should never fail. Conflicting carts are merged later (next lesson).'],
      ['Cassandra, Riak', 'Default AP, tunable', 'Each query chooses a consistency level (ONE, QUORUM, ALL). Ask for more nodes and you get more consistency, less availability.'],
      ['DynamoDB', 'Tunable reads', 'Reads are eventually consistent by default; with ConsistentRead=true you get a strongly consistent read, which costs twice as much as an eventually consistent read. Inside, each partition is leader-based (replication lesson).'],
    ]},
    { type: 'callout', tone: 'warn', title: 'A truth about labels', html: `In 2015 Martin Kleppmann wrote a famous blog post: stop calling databases "CP" or "AP". The reason: under the strict definitions, ZooKeeper's default reads are not linearizable, and a normal leader-follower database is not CAP-available (a client cut off from the leader cannot write). So in an interview, along with the label, also explain <strong>exactly what happens during a partition</strong>: which side accepts writes, and how old reads can be.` },

    { type: 'h2', text: 'PACELC: a choice even when everything is fine' },
    { type: 'p', html: `Partitions happen only now and then. But in the "Normal day" scenario we saw that even a linearizable read in Singapore takes a trip to Mumbai. This price is paid <strong>on every request, every day</strong>. In 2012 Daniel Abadi joined this with CAP and gave it a name:` },
    { type: 'callout', tone: 'term', title: 'New word: PACELC ("pass-elk")', html: `<strong>What it is:</strong> a bigger version of CAP. Letter by letter:<br>• <strong>P</strong>A/<strong>C</strong>: <em>if there is a <strong>P</strong>artition</em>, choose <strong>A</strong>vailability or <strong>C</strong>onsistency (this is CAP).<br>• <strong>E</strong>L/<strong>C</strong>: <em><strong>E</strong>lse</em>, that is, on a normal day, choose <strong>L</strong>atency (speed) or <strong>C</strong>onsistency.<br><strong>Why we need it:</strong> a partition happens a few hours a year, but the latency question comes up <em>on every request</em>. When data has copies, on every write you either wait for the other copies (consistent, slow) or you do not (fast, but some reads are old).<br><strong>Without it:</strong> if you design only with CAP in mind, the everyday slowness (waiting for a far region) never gets counted.<br><strong>Example:</strong> the Mumbai ↔ Singapore round trip is 60 ms. Waiting for Singapore on every write = +60 ms on every write (EC). Not waiting = the write takes 2 ms, but a read in Singapore can be old for ~30+ ms (EL).` },
    { type: 'p', html: `Feel it yourself. The leader is in Mumbai and a replica is in Singapore. Change how writes and reads work and see how latency and freshness change:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Mumbai ↔ far region, round trip: <strong class="pl-rv"></strong></label><input class="pl-rtt" type="range" min="10" max="250" step="5" value="60"></div>
          <div><label>DB reads per page load (one after another): <strong class="pl-cv"></strong></label><input class="pl-calls" type="range" min="1" max="10" step="1" value="5"></div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px"><span style="font-size:14px;color:var(--ink-2)">Write:</span><span class="pl-w" style="display:flex;flex-wrap:wrap;gap:6px"></span></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px"><span style="font-size:14px;color:var(--ink-2)">Singapore user's read:</span><span class="pl-r" style="display:flex;flex-wrap:wrap;gap:6px"></span></div>
        <div class="stats">
          <div class="stat"><span>Write latency (Mumbai user)</span><strong class="pl-wl"></strong></div>
          <div class="stat"><span>One read (Singapore user)</span><strong class="pl-rl"></strong></div>
          <div class="stat"><span>Whole page (Singapore)</span><strong class="pl-pg"></strong></div>
          <div class="stat"><span>Can old data show?</span><strong class="pl-st"></strong></div>
        </div>
        <div class="calc-note pl-note"></div>`;
      const q = s => el.querySelector(s);
      let w = 'async', r = 'local';
      const chips = (box, opts, cur, set) => { box.innerHTML = ''; opts.forEach(([v, t]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (v === cur ? ' on' : ''); b.textContent = t; b.onclick = () => { set(v); upd(); }; box.appendChild(b); }); };
      const upd = () => {
        const rtt = Number(q('.pl-rtt').value), calls = Number(q('.pl-calls').value);
        chips(q('.pl-w'), [['async', 'Local ack (async copy)'], ['sync', 'Wait for remote ack (sync)']], w, v => { w = v; });
        chips(q('.pl-r'), [['local', 'From local replica'], ['leader', 'From leader (Mumbai)']], r, v => { r = v; });
        const wl = w === 'async' ? 2 : 2 + rtt, rl = r === 'local' ? 1 : 1 + rtt, stale = w === 'async' && r === 'local';
        q('.pl-rv').textContent = rtt + ' ms'; q('.pl-cv').textContent = calls;
        q('.pl-wl').textContent = wl + ' ms'; q('.pl-rl').textContent = rl + ' ms'; q('.pl-pg').textContent = calls * rl + ' ms';
        q('.pl-st').textContent = stale ? 'Yes' : 'No'; q('.pl-st').style.color = stale ? 'var(--amber)' : 'var(--green)';
        q('.pl-note').textContent = stale
          ? `EL choice: everything is fast (write ${wl} ms, page ${calls * rl} ms), but the copy takes at least ~${Math.round(rtt / 2)} ms (more under load) to reach Singapore. In that window, Singapore can see old data.`
          : r === 'leader'
            ? `EC choice: every read goes to the leader, so it is always the latest. The price: a ${rtt} ms round trip on every read, and a page with ${calls} reads takes ${calls * rl} ms. The site is slow for far-away users.`
            : `Writes wait for Singapore's ack (${wl} ms), so after the ack the Singapore copy surely has the new data and reads are local (${rl} ms). The price moved to writes. And during a partition this write will stop: this is the PC part.`;
      };
      ['.pl-rtt', '.pl-calls'].forEach(s => q(s).addEventListener('input', upd));
      upd();
    }},
    { type: 'p', html: `This is a simple model (we assume a local disk write takes ~2 ms and a local read ~1 ms), but the point is real: inside one region a round trip is around 1 ms, between nearby regions like Mumbai and Singapore it is a few tens of ms, and from India to the US it is more than 200 ms. The price of consistency grows with <strong>distance</strong>.` },
    { type: 'table', head: ['System (default)', 'PACELC', 'Meaning'], rows: [
      ['Dynamo, Cassandra, Riak', 'PA / EL', 'Available during a partition; fast on a normal day too, with less consistency. You can move towards EC by raising the query level.'],
      ['BigTable, HBase, VoltDB, Megastore', 'PC / EC', 'Always consistent: during a partition and on a normal day. The price is latency and availability.'],
      ['MongoDB (2012 analysis)', 'PA / EC', 'Consistent on a normal day (reads from the primary), but if the primary was cut off, the old primary\'s unreplicated writes could be rolled back.'],
      ['Yahoo PNUTS', 'PC / EL', 'Gives up consistency for latency on a normal day, but during a partition it does not lose more consistency; it loses availability.'],
      ['Google Spanner', 'PC / EC', 'Always strongly consistent. It pays the latency price (waiting for a majority on commit).'],
    ], caption: 'The first four classifications come from Abadi\'s 2012 paper; since then the defaults and features of these systems have changed, so treat them as a picture of that time.' },

    { type: 'h2', text: 'Choose per feature, not for the whole system' },
    { type: 'p', html: `The most useful lesson: saying "our system is CP" or "it is AP" is only half an answer. Inside one app, each kind of data has a different kind of loss. Look at xyz Tickets feature by feature:` },
    { type: 'p', html: `Try it yourself before you look at the table. For each feature, think: during a partition, is <strong>wrong data</strong> worse, or an <strong>error</strong>? Then choose CP or AP:` },
    { type: 'custom', render(el) {
      const F = [
        ['Who owns seat A7', 'CP', 'One seat for two people = refund, anger, bad name. An error is better.'],
        ['Payment from wallet balance', 'CP', 'If money is taken based on an old balance, that is a real loss. An error is better.'],
        ['New username "riya"', 'CP', 'If two people take one name, whom do we remove later? One place, one truth.'],
        ['Likes on a concert post', 'AP', 'A slightly old count is fine. An error on a like = bad UX.'],
        ['Writing a movie review', 'AP', 'It is fine if the review shows up in the other region 30 seconds later.'],
        ['Event poster and description', 'AP', 'An old description is fine for a while; the page being down is not.'],
      ];
      const pick = {};
      el.innerHTML = `<div class="cpq-rows" style="display:grid;gap:8px"></div><div class="stats"><div class="stat"><span>Correct answers</span><strong class="cpq-score"></strong></div></div><div class="calc-note">Press CP or AP on each row. The answer and the reason show up at once.</div>`;
      const rows = el.querySelector('.cpq-rows');
      const draw = () => {
        rows.innerHTML = '';
        F.forEach(([name, ans, why], i) => {
          const r = document.createElement('div');
          r.style.cssText = 'border:1px solid var(--line);border-radius:var(--r-sm);padding:8px 10px;background:var(--surface)';
          const top = document.createElement('div'); top.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between';
          const t = document.createElement('strong'); t.textContent = name; t.style.fontSize = '14px'; top.appendChild(t);
          const bx = document.createElement('span'); bx.style.cssText = 'display:flex;gap:6px';
          ['CP', 'AP'].forEach(m => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (pick[i] === m ? ' on' : ''); b.textContent = m; b.onclick = () => { pick[i] = m; draw(); }; bx.appendChild(b); });
          top.appendChild(bx); r.appendChild(top);
          if (pick[i]) { const fb = document.createElement('div'); const ok = pick[i] === ans; fb.style.cssText = 'margin-top:6px;font-size:13.5px;color:' + (ok ? 'var(--green)' : 'var(--amber)'); fb.textContent = (ok ? 'Correct: ' : 'Think again, the answer is ' + ans + ': ') + why; r.appendChild(fb); }
          rows.appendChild(r);
        });
        const done = Object.keys(pick).length, right = F.filter((f, i) => pick[i] === f[1]).length;
        el.querySelector('.cpq-score').textContent = right + ' / ' + F.length + (done < F.length ? ' (' + (F.length - done) + ' left)' : '');
      };
      draw();
    }},
    { type: 'table', head: ['xyz Tickets feature', 'During a partition', 'Why', 'How it is built'], rows: [
      ['Seat lock (who owns A7?)', 'CP', 'Double booking = refunds, angry users, a bad name', 'A strongly consistent store (a SQL database with a leader, or something like etcd/Spanner). Conditional write (a write with a condition): "give A7 only if it is free right now". A TTL on the lock (time to live: after this much time the lock opens by itself, for example 10 minutes) so that the seat opens again if the payment does not happen'],
      ['Payment / wallet balance', 'CP', 'Wrong balance = real money', 'Strongly consistent SQL, transactions'],
      ['Unique username', 'CP', 'If two people take "riya", whom do we remove later?', 'A unique constraint in one place'],
      ['Reviews and ratings', 'AP', 'It is fine if a new review shows up 30 seconds later', 'Multi-region replicas, async copy, eventual consistency'],
      ['Likes, view counts', 'AP', 'A slightly old count is fine; an error is not', 'Each region keeps its own count, add them up on merge (CRDT counter)'],
      ['Event listing, posters', 'AP', 'An old description is fine for a while', 'Cache, CDN, read replicas'],
    ]},
    { type: 'p', html: `The roadmap example is exactly this: <strong>BookMyShow is CP for seat locking</strong> and <strong>AP for movie reviews</strong>. One app, two choices, because there are two different kinds of data.` },
    { type: 'callout', tone: 'why', title: 'The UX of a CP feature during a partition', html: `Choosing CP does not mean showing the user an ugly error. Tell users in the minority region nicely: "Booking is paused for a short while, your seat is safe, please try again in 2 minutes." The rest of the site (browsing, reviews, posters) is AP and keeps working. This is called <strong>graceful degradation</strong> (we saw it in the resilience lesson).` },
    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Decide: C or A?', html: `Ask one question: <strong>"What is worse: showing wrong data, or showing an error?"</strong><br><br>A wrong balance or a double-booked seat is worse than an error: <strong>choose consistency</strong> (CP). A like count off by 3 is better than an error: <strong>choose availability</strong> (AP). One app can make both choices in different places: BookMyShow is CP for seat locking and AP for movie reviews.<br><br>Then the PACELC question: even on a normal day, can this feature afford to wait for a far region on every request? If not, choose EL (fast, a little old); if yes and it is important, choose EC.` },
    { type: 'table', head: ['Needs strong consistency', 'Eventual is fine'], rows: [
      ['Money, wallet, ledger', 'Likes, views, follower counts'],
      ['Inventory, seats, bookings', 'Feeds, timelines'],
      ['Unique usernames, a coupon used once', 'Search results, recommendations'],
      ['Distributed locks, leader election', 'Analytics dashboards'],
    ], caption: 'From the roadmap\'s quick decisions table' },

    { type: 'diagram', title: 'CAP and PACELC: the whole picture', height: 530,
      groups: [
        { label: 'Mumbai (majority)', x: 14, y: 96, w: 330, h: 236 },
        { label: 'Singapore (minority)', x: 376, y: 96, w: 330, h: 236 },
      ],
      nodes: [
        { id: 'riya', label: 'Riya', sub: 'Mumbai users', x: 177, y: 48, kind: 'client', info: 'What it is: users near Mumbai. Their requests go to the nearby Mumbai region, so that answers come fast.' },
        { id: 'aman', label: 'Aman', sub: 'Singapore users', x: 543, y: 48, kind: 'client', info: 'What it is: users near Singapore. Their requests go to the Singapore region.' },
        { id: 'appM', label: 'App servers', sub: 'Mumbai', x: 177, y: 160, w: 160, kind: 'server', info: 'What it is: the xyz Tickets code, in Mumbai. It follows a different rule for each feature: a CP store for seats, an AP store for likes.' },
        { id: 'appS', label: 'App servers', sub: 'Singapore', x: 543, y: 160, w: 160, kind: 'server', info: 'What it is: the same code, in Singapore. During a partition it shows a clear message for seat booking ("please try again later") and keeps the rest of the site working (graceful degradation).' },
        { id: 'seatM', label: 'Seat store', sub: 'CP: 2 of 3', x: 95, y: 280, kind: 'data', info: 'What it is: a strongly consistent store that records who owns each seat. 2 of its 3 replicas are in Mumbai = a majority. Even during a partition, the Mumbai side can take bookings.' },
        { id: 'likesM', label: 'Likes store', sub: 'AP: local count', x: 255, y: 280, kind: 'data', info: 'What it is: the store for likes and reviews. Each region keeps its own count and answers at once. When the network is fixed, the counts are added up (a CRDT counter).' },
        { id: 'likesS', label: 'Likes store', sub: 'AP: local count', x: 465, y: 280, kind: 'data', info: 'What it is: the Singapore likes store. It accepts likes even during a partition; Aman may see a slightly old total, but never an error.' },
        { id: 'seatS', label: 'Seat replica', sub: 'CP: 1 of 3', x: 625, y: 280, kind: 'data', info: 'What it is: the third replica of the seat store. Alone it is a minority, so during a partition it refuses bookings and linearizable reads.' },
        { id: 'link', label: 'Undersea link', sub: 'Mumbai ↔ SG', x: 360, y: 470, w: 150, kind: 'net', info: 'What it is: the network between the regions. On a normal day, updates travel through it (a round trip of several tens of ms: the "latency" price in PACELC). When it breaks = a partition: the CAP choice.' },
      ],
      edges: [
        { a: 'riya', b: 'appM', n: 1 },
        { a: 'appM', b: 'seatM', n: 2, label: 'book A7' },
        { a: 'appM', b: 'likesM', label: 'like +1' },
        { a: 'aman', b: 'appS' },
        { a: 'appS', b: 'likesS', label: 'like +1' },
        { a: 'appS', b: 'seatS', label: 'book A7' },
        { a: 'seatM', b: 'link', n: 3, kind: 'evt', label: 'seat sync', via: [[95, 470]] },
        { a: 'link', b: 'seatS', kind: 'evt', via: [[625, 470]] },
        { a: 'likesM', b: 'link', kind: 'evt', both: true },
        { a: 'likesS', b: 'link', kind: 'evt', both: true, label: 'merge counts' },
      ],
      paths: [
        { name: 'Normal booking', text: 'Riya\'s booking became final on the Mumbai majority (2 of 3), then went over the cable to the Singapore copy.', go: ['riya>appM>seatM', 'seatM>link>seatS'] },
        { name: 'Partition: seat (CP)', text: 'The cable is cut. Singapore is the minority, so an A7 booking gets "please try again later". Never a double booking.', go: ['aman>appS>seatS', 'seatS>link'] },
        { name: 'Partition: like (AP)', text: 'Singapore accepts the like at once. When the cable is fixed, the counts of both regions are added up; nothing is lost.', go: ['aman>appS>likesS', 'likesS>link>likesM'] },
        { name: 'Normal day (PACELC)', text: 'No failure. A fresh seat read makes a round trip to Mumbai (EC: slow, correct). Likes come from the local copy (EL: fast, a little old).', go: ['aman>appS>seatS', 'seatS>link>seatM', 'appS>likesS'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li><strong>Partition</strong> = the machines are alive, but the network between them is broken. When copies live on different machines, this will happen.</li>
      <li><strong>C</strong> (linearizable) = as if there were only one copy. <strong>A</strong> = every alive server answers without an error. <strong>P</strong> = accepting that the network breaks and working anyway.</li>
      <li>CAP: during a partition, C or A, not both. "Pick 2 of 3" is the wrong picture, because P is not optional.</li>
      <li>CP = the minority side says no (seats, money, usernames). AP = everyone answers, merge later (likes, feeds, DNS, cart).</li>
      <li>PACELC: even with no partition, every request has a <strong>latency vs consistency</strong> choice. The bigger the distance, the bigger the price.</li>
      <li>Decide <strong>per feature</strong>: BookMyShow seat lock is CP, movie reviews are AP.</li>
      <li>The Decide question: "What is worse, wrong data or an error?"</li>
      <li>Instead of labels (CP/AP), explain exactly what happens during a partition.</li>
    </ul>` },

    { type: 'tradeoffs',
      gains: ['CP: the data is never wrong or conflicting; nothing to merge after the heal', 'AP: every region keeps working, users get no errors, latency is low', 'Per-feature choice: safety where it matters, speed everywhere else', 'PACELC thinking: the normal-day latency is also counted'],
      costs: ['CP: during a partition the feature is off for users on the minority side; even on a normal day there is coordination latency', 'AP: old data, conflicts, and the work of merge logic and compensation', 'Two kinds of stores and rules: more complexity', 'Labels (CP/AP) hide the real behaviour; you must write down the partition behaviour of each feature'],
    },

    { type: 'think', questions: [
      { q: 'The chat feature of xyz.com: messages and the "online/offline" status. During a partition, CP or AP for each?', a: 'Online status: AP. Showing a slightly old "online" is fine. Messages: AP mostly works too (accept the message in the local region, deliver it and fix the order later), because a "message not sent" error is very bad UX. But give every message a unique ID so that duplicates can be removed after the heal. If order really matters (for example a payment chat), make that part consistent.' },
      { q: 'There are three regions: Mumbai, Singapore, Frankfurt, with one replica in each (N = 3) and majority writes. The Frankfurt link is cut. Who can accept writes? And what if the link between Mumbai and Singapore is also cut?', a: 'In the first case Mumbai + Singapore (2 of 3) are a majority, so they keep accepting writes; Frankfurt (1 of 3) says no. In the second case all three are cut off from each other and nobody has a majority: a CP system will stop writes completely. That is the price in availability.' },
      { q: 'An interviewer says "MongoDB is CP, Cassandra is AP". What nuance would you add?', a: 'Both can be configured. In Cassandra, QUORUM reads + writes (and lightweight transactions) can give fairly consistent behaviour, and ONE gives high availability. In MongoDB the behaviour changes with the read concern / write concern and with reads from secondaries. A better answer: "Exactly what will it do during a partition": which side accepts writes, how old reads can be, and what gets merged after the heal.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'What does the CAP theorem really say?', options: ['Every system always picks 2 of C, A, P', 'During a network partition, a system cannot give both linearizable consistency and availability', 'Distributed systems can never be consistent'], answer: 1, explain: 'The choice exists only during a partition. When the network is fine, you can have both C and A. And P is not an option: the network will break.' },
      { q: 'What does the minority side of a CP system do during a partition?', options: ['Gives old data', 'Refuses writes (and linearizable reads) and returns an error', 'Makes itself the leader'], answer: 1, explain: 'The minority does not know what happened on the majority side, so instead of giving a wrong answer it says no. The data is safe; availability is lost.' },
      { q: 'What is the "ELC" part of PACELC about?', options: ['Recovery after a partition', 'The latency vs consistency trade-off on a normal day', 'Encryption, logging, caching'], answer: 1, explain: 'Else (no partition): on every write, either wait for the other copies (consistent, slow) or do not (fast, sometimes old).' },
      { q: 'Which pair is right for xyz Tickets?', options: ['Seat lock: AP, Reviews: CP', 'Seat lock: CP, Reviews: AP', 'Both AP, because availability matters most'], answer: 1, explain: 'A double booking is worse than an error (CP). An old review is better than an error (AP). The choice is per feature.' },
      { q: 'The C in ACID and the C in CAP:', options: ['Are the same thing', 'Are different: the C in ACID = the database rules are never broken; the C in CAP = all replicas show one latest value', 'The C in CAP exists only in SQL databases'], answer: 1, explain: 'One word, two meanings. In an interview, make clear which consistency you are talking about.' },
    ]},
    { type: 'sources', note: 'Definitions, system classifications and product behaviour were checked against these. Abadi\'s paper is from 2012; many databases have changed since then.', items: [
      { title: 'Brewer\'s conjecture and the feasibility of consistent, available, partition-tolerant web services', publisher: 'Gilbert & Lynch, ACM SIGACT News', year: 2002, url: 'https://groups.csail.mit.edu/tds/papers/Gilbert/Brewer2.pdf', used: 'The formal proof of CAP; C = linearizability (atomic consistency), A = a response from every non-failing node, partition = lost messages.' },
      { title: 'CAP Twelve Years Later: How the "Rules" Have Changed', publisher: 'Eric Brewer, IEEE Computer (InfoQ reprint)', year: 2012, url: 'https://www.infoq.com/articles/cap-twelve-years-later-how-the-rules-have-changed/', used: 'Why "2 of 3" is misleading, the choice exists only during a partition, the three steps of partition mode (detect, partition mode, recovery) and compensation.' },
      { title: 'Consistency Tradeoffs in Modern Distributed Database System Design', publisher: 'Daniel Abadi, IEEE Computer', year: 2012, url: 'https://www.cs.umd.edu/~abadi/papers/abadi-pacelc.pdf', used: 'The PACELC definition; Dynamo/Cassandra/Riak PA/EL, VoltDB/Megastore/BigTable/HBase PC/EC, MongoDB PA/EC, PNUTS PC/EL.' },
      { title: 'Please stop calling databases CP or AP', publisher: 'Martin Kleppmann (blog)', year: 2015, url: 'https://martin.kleppmann.com/2015/05/11/please-stop-calling-databases-cp-or-ap.html', used: 'Strict CAP definitions; ZooKeeper default reads are not linearizable (sync); why labels mislead.' },
      { title: 'Inside Cloud Spanner and the CAP Theorem', publisher: 'Google Cloud blog (Eric Brewer)', official: true, year: 2017, url: 'https://cloud.google.com/blog/products/databases/inside-cloud-spanner-and-the-cap-theorem', used: 'Spanner is technically CP, but so available that users can treat it as effectively CA.' },
      { title: 'etcd API guarantees', publisher: 'etcd documentation', official: true, url: 'https://etcd.io/docs/v3.5/learning/api_guarantees/', used: 'Reads are linearizable by default (through Raft); serializable reads are faster but can be old.' },
      { title: 'DynamoDB read consistency', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html', used: 'Eventually consistent reads by default, the ConsistentRead option, strongly consistent reads cost twice as much.' },
    ]},
  ],
});
