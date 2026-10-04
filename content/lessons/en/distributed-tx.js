(function () {
  /* ---------- pure saga / 2PC simulator (exported as _test for verification) ---------- */
  const STEPS = [
    { id: 'T1', svc: 'sub', fwd: 'Created membership as PENDING', st: 'PENDING', why: 'Riya already has an active membership on this channel (business rule)', comp: 'C1: marked the membership CANCELLED', cst: 'CANCELLED', seen: 'Riya\'s app showed "PENDING" for a few seconds' },
    { id: 'T2', svc: 'pay', fwd: 'Charged ₹199 (through the payment gateway)', st: '₹199 charged', why: 'the card was declined', comp: 'C2: refunded ₹199', cst: 'refunded', seen: 'Riya got a "₹199 debited" SMS, then a refund' },
    { id: 'T3', svc: 'earn', fwd: 'Credited ₹140 to creator Arjun (70%)', st: '+₹140', why: 'Arjun\'s creator account is frozen (policy check failed)', comp: 'C3: reverse entry of ₹140', cst: 'reversed', seen: 'Arjun\'s dashboard showed +₹140, then it went away' },
    { id: 'T4', svc: 'sub', fwd: 'Membership ACTIVE (pivot: point of no return)', st: 'ACTIVE', why: 'the Subscription service DB write failed even after a timeout', pivot: true },
    { id: 'T5', svc: 'notif', fwd: 'Sent the welcome email', st: 'sent', why: 'email provider timeout', retryable: true },
  ];

  function emailWithRetry(ev, t, failEmail) {
    if (!failEmail) { ev.push({ t: t += 100, svc: 'notif', kind: 'fwd', text: 'T5: sent the welcome email', set: { notif: 'sent' } }); return t; }
    ev.push({ t: t += 100, svc: 'notif', kind: 'fail', text: 'T5 failed: email provider timeout. This is AFTER the point of no return (the membership is final), so nothing is undone. Just retry.', set: { notif: 'retrying' } });
    ev.push({ t: t += 1000, svc: 'notif', kind: 'fail', text: 'T5 retry 1 (1 s backoff): timeout again', set: {} });
    ev.push({ t: t += 2000, svc: 'notif', kind: 'fwd', text: 'T5 retry 2 (2 s backoff): the email went out', set: { notif: 'sent' } });
    return t;
  }

  function saga(fail) {
    const ev = [];
    let t = 0, failedAt = -1;
    ev.push({ t, svc: 'coord', kind: 'info', text: 'The orchestrator started the saga, state saved in the DB: step 0', set: { coord: 'running' } });
    for (let i = 0; i < 4; i++) {
      const s = STEPS[i];
      if (s.id === fail) {
        failedAt = i;
        ev.push({ t: t += 100, svc: s.svc, kind: 'fail', text: `${s.id} failed: ${s.why}`, set: { [s.svc]: 'FAILED', coord: 'compensating' } });
        break;
      }
      ev.push({ t: t += 100, svc: s.svc, kind: 'fwd', text: `${s.id}: ${s.fwd}`, set: { [s.svc]: s.st } });
    }
    const visible = [];
    if (failedAt >= 0) {
      const undo = STEPS.slice(0, failedAt).filter(s => s.comp).reverse();
      if (!undo.length) ev.push({ t, svc: 'coord', kind: 'info', text: 'The very first step failed: nothing to undo.', set: {} });
      undo.forEach(s => {
        ev.push({ t: t += 100, svc: s.svc, kind: 'comp', text: s.comp, set: { [s.svc]: s.cst } });
        visible.push(s.seen);
      });
      ev.push({ t, svc: 'coord', kind: 'end', text: 'Saga ROLLED BACK: every service is consistent again, but the "undo" was done with new work, not by deleting.', set: { coord: 'rolled back' } });
      return { ev, final: 'ROLLED BACK', total: t, lockMs: 100, visible};
    }
    t = emailWithRetry(ev, t, fail === 'T5');
    ev.push({ t, svc: 'coord', kind: 'end', text: 'Saga COMPLETED.', set: { coord: 'completed' } });
    return { ev, final: 'COMPLETED', total: t, lockMs: 100, visible};
  }

  const NAME = { sub: 'Subscription DB', pay: 'Payment DB', earn: 'Earnings DB' };
  function tpc(fail) {
    const ev = [];
    const no = { T1: 'sub', T4: 'sub', T2: 'pay', T3: 'earn' }[fail];
    let t = 0;
    ev.push({ t: t += 100, svc: 'coord', kind: 'lock', text: 'Work done in all three DBs, but no COMMIT. All touched rows are LOCKED.', set: { coord: 'working', sub: 'ACTIVE? (locked)', pay: '₹199? (locked)', earn: '+₹140? (locked)' } });
    ev.push({ t: t += 50, svc: 'coord', kind: 'info', text: 'Phase 1: the coordinator sent PREPARE to all three ("can you commit?")', set: { coord: 'preparing' } });
    const set = {};
    ['sub', 'pay', 'earn'].forEach(p => { set[p] = p === no ? 'voted NO' : 'PREPARED (locked)'; });
    ev.push({ t: t += 50, svc: 'coord', kind: 'lock', text: no ? `${NAME[no]} voted NO. The other two voted YES (now they can neither commit nor abort on their own).` : 'All three voted YES. Now each one promises: "tell me and I will commit", while holding locks.', set });
    if (fail === 'crash') {
      ev.push({ t, svc: 'coord', kind: 'fail', text: 'The coordinator crashed BEFORE sending the decision!', set: { coord: 'CRASHED' } });
      ev.push({ t, svc: 'coord', kind: 'block', text: 'All three participants are IN-DOUBT: commit or abort? They cannot decide alone, because they do not know the others\' votes. They sit holding their locks.', set: { sub: 'IN-DOUBT (locked)', pay: 'IN-DOUBT (locked)', earn: 'IN-DOUBT (locked)' } });
      ev.push({ t: null, svc: 'earn', kind: 'block', text: 'Arjun\'s payout job wants to read his earnings row: WAIT... WAIT... until the coordinator comes back (minutes, hours?).', set: {} });
      return { ev, final: 'BLOCKED', total: Infinity, lockMs: Infinity, visible: [] };
    }
    if (no) {
      ev.push({ t: t += 50, svc: 'coord', kind: 'comp', text: 'Phase 2: one NO is enough. The coordinator sent ABORT to everyone.', set: { coord: 'aborting' } });
      ev.push({ t: t += 50, svc: 'coord', kind: 'end', text: 'Everything ROLLBACK, locks free. Nobody outside saw the in-between state: atomic.', set: { coord: 'aborted', sub: 'rolled back', pay: 'rolled back', earn: 'rolled back' } });
      return { ev, final: 'ABORTED', total: t, lockMs: t, visible: [] };
    }
    ev.push({ t: t += 50, svc: 'coord', kind: 'fwd', text: 'Phase 2: all YES, decision COMMIT (the coordinator first wrote it in its own log), sent COMMIT to everyone.', set: { coord: 'committing' } });
    ev.push({ t: t += 50, svc: 'coord', kind: 'end', text: 'All three COMMITTED, locks free.', set: { coord: 'committed', sub: 'ACTIVE', pay: '₹199 charged', earn: '+₹140' } });
    const lockMs = t;
    t = emailWithRetry(ev, t, fail === 'T5');
    return { ev, final: 'COMMITTED', total: t, lockMs, visible: [] };
  }
  const T = { saga, tpc, STEPS };

  Lesson.register({
    _test: T,
    id: 'distributed-tx',
    title: 'Sagas and distributed transactions',
    minutes: 25,
    summary: `One click, four services, four separate databases. What if one step in the middle fails? In this lesson: why distributed transactions are hard, 2PC and its "blocking" danger, sagas (choreography vs orchestration) and compensating actions, the outbox, idempotent consumers, and workflow engines like Temporal / AWS Step Functions.`,
    blocks: [
      { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Riya presses one button: "Join ₹199". Behind it, four different programs must do their work: create the membership, take the money, give the creator his share, and send a welcome email.<br>Each program has its own separate diary (database). If the third program fails, the work of the first two is left half-done: the money is gone, but there is no membership.<br>This lesson teaches how to make such work "all or nothing" when the "undo" button of one database is not enough. You will run each method yourself.` },
      { type: 'h2', text: 'The problem: one click, four services' },
      { type: 'p', html: `xyz.com launched a new feature: <strong>Channel membership</strong>. Riya likes creator Arjun's videos. She pays ₹199/month to become a member of Arjun's channel: exclusive videos, a badge, and a special emoji in live chat. Out of the ₹199, ₹140 (70%) goes to Arjun's earnings.` },
      { type: 'p', html: `By the resilience lesson, xyz.com has been split into microservices, and each service has <strong>its own database</strong>. When "Join" is pressed, all of this must happen:` },
      { type: 'ascii', text: `
Riya presses "Join ₹199"
        │
        v
1. Subscription service  →  membership PENDING      (Subscription DB)
2. Payment service       →  ₹199 charge (gateway)   (Payment DB)
3. Earnings service      →  Arjun +₹140              (Earnings DB)
4. Subscription service  →  membership ACTIVE       (Subscription DB)
5. Notification service  →  "Welcome!" email`, caption: 'One business action, four services, three databases, one outside payment gateway.' },
      { type: 'p', html: `With one database this would be easy: <code>BEGIN; ... ; COMMIT;</code> and the database guarantees that either everything happens or nothing does. But here there are three separate databases. Imagine step 3 fails: Riya's ₹199 is already taken, the membership is stuck at PENDING, and Arjun got no money. Riya writes an angry email to support. This is the problem of this lesson.` },
      { type: 'callout', tone: 'term', title: 'New word: Transaction and ACID', html: `<strong>What it is:</strong> a <strong>transaction</strong> = a packet of several operations that the database runs as one unit. Its four guarantees are called <strong>ACID</strong>: <strong>Atomicity</strong> (all or nothing), <strong>Consistency</strong> (the rules are never broken, for example no negative balance), <strong>Isolation</strong> (two transactions do not see each other's half-done work), <strong>Durability</strong> (once committed, it survives a crash).<br><strong>Why we need it:</strong> "take ₹199" and "give the membership" must happen together. If one happens without the other, the user loses.<br><strong>Without it:</strong> a crash in the middle = half-done work, and no automatic undo.<br><strong>Careful:</strong> all of this exists only inside <em>one</em> database.` },
      { type: 'callout', tone: 'term', title: 'New word: Distributed transaction', html: `<strong>What it is:</strong> when one "all or nothing" job is spread across <strong>many separate machines / databases / services</strong>.<br><strong>Why it is hard:</strong> the <code>COMMIT</code> of one database cannot control another database. Each DB only looks after its own diary.<br><strong>If you ignore it:</strong> the Payment DB has "charged" for sure, the Earnings DB has nothing: the data lies to itself.` },

      { type: 'h2', text: 'Why is this so hard?' },
      { type: 'list', items: [
        '<strong>No shared transaction.</strong> Once the Payment DB has done <code>COMMIT</code>, it is done. If the Earnings DB fails later, there is no built-in way to tell the Payment DB "go back".',
        '<strong>Partial failure.</strong> On one machine a program either runs or crashes. In a distributed system one service can be alive, another dead and a third slow, all at the same time.',
        '<strong>A timeout does not mean "failed".</strong> You sent a request to the payment gateway and got no answer for 5 seconds. Was the money taken or not? <em>You do not know.</em> Maybe it was charged and only the reply got lost on the way. Send it again and you risk a double charge.',
        '<strong>Outside services are not under your control.</strong> With a payment gateway like Razorpay/Stripe or an email provider, you cannot run a database-style "lock and wait" protocol.',
        '<strong>Isolation is gone.</strong> Until the whole job is finished, the in-between state (₹199 taken, membership PENDING) can be seen by other requests.',
      ]},
      { type: 'callout', tone: 'mistake', title: 'Beginner mistake: "we will just add a try-catch"', html: `"If step 3 fails, we will call step 2's refund in the catch block." It is a good idea, and a saga is the grown-up form of it. But imagine the server crashes <em>before</em> the catch block even runs (a deploy, out of memory). Now who will do the refund? Nobody even remembers this job was half-done. That is why the "how far did we get" state must be <strong>durable</strong> (in a DB), not in memory.` },
      { type: 'p', html: `There are two big answers: <strong>2PC</strong> (make everyone commit together) and the <strong>Saga</strong> (commit one by one, and if something goes wrong, undo with reverse steps). Let us look at 2PC first, because it looks like the "direct" solution.` },
  
      { type: 'h2', text: 'Two-phase commit (2PC)' },
      { type: 'p', html: `The idea is simple: a <strong>coordinator</strong> first asks everyone "can you commit?" Only if everyone says yes does it say "now commit". If even one says no, everyone gets "abort". There are two rounds, hence the name <strong>two-phase</strong>.` },
      { type: 'callout', tone: 'term', title: 'Coordinator and participants', html: `<strong>What it is:</strong> the <strong>coordinator</strong> (or transaction manager) is the process that runs the whole distributed transaction and makes the final decision. The <strong>participants</strong> are the databases where the real work happens.<br><strong>Why we need it:</strong> someone has to count everyone's votes and announce one single decision to all.<br><strong>Without it:</strong> if each DB commits as it likes, some will commit and some will not.<br><strong>In the real world:</strong> in the Java world the standard for this is <strong>XA</strong>, and Postgres has the <code>PREPARE TRANSACTION</code> / <code>COMMIT PREPARED</code> commands for the participant side.` },
      { type: 'steps', items: [
        { t: 'Do the work, do not commit', d: 'Each participant makes its changes in its own DB and holds locks on the rows, but does not COMMIT.' },
        { t: 'Phase 1: PREPARE', d: 'The coordinator asks everyone. A participant writes its changes safely to disk (so it can commit even after a crash) and votes YES. YES is a promise: "now I will not abort on my own; I will do whatever you say." If something is wrong, it votes NO.' },
        { t: 'The decision goes into the log', d: 'If all vote YES, the coordinator writes "COMMIT" in its durable log. At this moment the transaction is decided.' },
        { t: 'Phase 2: COMMIT or ABORT', d: 'The coordinator sends the decision to everyone. Participants commit/roll back and release their locks.' },
      ]},
      { type: 'flow', title: '2PC: the three databases of a membership', height: 340,
        nodes: [
          { id: 'co', label: 'Coordinator', sub: 'transaction manager', x: 130, y: 170, w: 160, kind: 'server', info: 'What it is: the manager process of 2PC. The whole decision is in its hands. It sends PREPARE, counts the votes, writes the decision in its log, then sends COMMIT/ABORT. This is also the weakness of 2PC: if it falls, everyone gets stuck.' },
          { id: 'sdb', label: 'Subscription DB', sub: 'participant', x: 560, y: 60, w: 170, kind: 'data', info: 'What it is: the Subscription service\'s database, one participant. It holds Riya\'s membership row. During 2PC this row stays locked: nobody else can change it.' },
          { id: 'pdb', label: 'Payment DB', sub: 'participant', x: 560, y: 170, w: 170, kind: 'data', info: 'What it is: the Payment service\'s database, the second participant. It holds the payment record. In the real world there is a problem here: the gateway that takes the money (Razorpay/Stripe) is an outside company and does not support anything like PREPARE. In this diagram we assume it is only our own DB.' },
          { id: 'edb', label: 'Earnings DB', sub: 'participant', x: 560, y: 280, w: 170, kind: 'data', info: 'What it is: the Earnings service\'s database, the third participant. It holds Arjun\'s earnings row. Locked during 2PC, so Arjun\'s dashboard or payout job cannot read/change it.' },
          { id: 'job', label: 'Payout job', sub: 'Arjun\'s', x: 300, y: 300, w: 140, kind: 'client', info: 'What it is: a separate background job that wants to update Arjun\'s earnings row. The 2PC locks stop it. As long as the lock lasts, it waits.' },
        ],
        edges: [{ a: 'co', b: 'sdb' }, { a: 'co', b: 'pdb' }, { a: 'co', b: 'edb' }, { a: 'job', b: 'edb' }],
        scenarios: [
          { name: 'All YES: commit', steps: [
            { title: 'Work + locks', text: 'Changes were made in all three DBs, but not committed. The rows are locked.', parallel: true, go: ['co>sdb', 'co>pdb', 'co>edb'], after: { sdb: { state: 'warn', sub: 'locked' }, pdb: { state: 'warn', sub: 'locked' }, edb: { state: 'warn', sub: 'locked' } } },
            { title: 'Phase 1: PREPARE', text: 'The coordinator asks all three. Each DB makes its work safe on disk.', parallel: true, go: ['co>sdb', 'co>pdb', 'co>edb'], msg: "PREPARE TRANSACTION 'join-riya-arjun-77';" },
            { title: 'All three YES', text: 'All three promised: "we will do what you say". The coordinator wrote the decision COMMIT in its log.', parallel: true, go: ['res:sdb>co', 'res:pdb>co', 'res:edb>co'], after: { sdb: { sub: 'PREPARED' }, pdb: { sub: 'PREPARED' }, edb: { sub: 'PREPARED' }, co: { sub: 'decision: COMMIT' } } },
            { title: 'Phase 2: COMMIT', text: 'COMMIT to everyone. Locks free. Nobody outside ever saw a half-done state.', parallel: true, go: ['co>sdb', 'co>pdb', 'co>edb'], msg: "COMMIT PREPARED 'join-riya-arjun-77';", after: { sdb: { state: 'ok', sub: 'ACTIVE' }, pdb: { state: 'ok', sub: '₹199 charged' }, edb: { state: 'ok', sub: '+₹140' } } },
          ]},
          { name: 'One NO: abort', steps: [
            { title: 'PREPARE', text: 'The same start: work done, locks taken, PREPARE sent.', parallel: true, go: ['co>sdb', 'co>pdb', 'co>edb'], after: { sdb: { state: 'warn', sub: 'locked' }, pdb: { state: 'warn', sub: 'locked' }, edb: { state: 'warn', sub: 'locked' } } },
            { title: 'Earnings DB: NO', text: 'Arjun\'s account is frozen, a constraint fails. The Earnings DB says NO. The other two say YES.', parallel: true, go: ['res:sdb>co', 'res:pdb>co', 'bad:edb>co'], after: { edb: { state: 'down', sub: 'voted NO' }, co: { sub: 'decision: ABORT' } } },
            { title: 'Phase 2: ABORT', text: 'One NO is enough. ROLLBACK for everyone. Nobody saw anything: this is the beauty of 2PC (atomic + isolated).', parallel: true, go: ['co>sdb', 'co>pdb', 'co>edb'], msg: "ROLLBACK PREPARED 'join-riya-arjun-77';", after: { sdb: { state: '', sub: 'rolled back' }, pdb: { state: '', sub: 'rolled back' }, edb: { state: '', sub: 'rolled back' } } },
          ]},
          { name: 'Coordinator crash', intro: 'Now the biggest danger of 2PC: the coordinator fell after the votes, before sending the decision.', steps: [
            { title: 'PREPARE, all three YES', text: 'All normal. All three are PREPARED, holding locks.', parallel: true, go: ['co>sdb', 'co>pdb', 'co>edb', 'res:sdb>co', 'res:pdb>co', 'res:edb>co'], after: { sdb: { state: 'warn', sub: 'PREPARED' }, pdb: { state: 'warn', sub: 'PREPARED' }, edb: { state: 'warn', sub: 'PREPARED' } } },
            { title: 'Coordinator crash', text: 'The machine fell before sending the decision.', set: { co: { state: 'down', sub: 'CRASHED' } }, go: 'lost:co>edb' },
            { title: 'Participants IN-DOUBT', text: 'The Earnings DB thinks: "Should I commit? Maybe the Payment DB said NO. Should I abort? Maybe the coordinator already wrote COMMIT and the others have committed." It promised YES, so it <strong>cannot decide alone</strong>. It sits holding its locks.', set: { sdb: { sub: 'IN-DOUBT' }, pdb: { sub: 'IN-DOUBT' }, edb: { state: 'hot', sub: 'IN-DOUBT, locked' } }, focus: ['sdb', 'pdb', 'edb'] },
            { title: 'The rest of the world is stuck too', text: 'Arjun\'s payout job wants to update his earnings row. Lock! Wait... wait... Until the coordinator comes back (or a human decides by hand), this row is frozen. This is called <strong>the blocking problem of 2PC</strong>.', go: ['job>edb', 'bad:edb>job'], after: { job: { state: 'warn', sub: 'WAITING on lock' } } },
          ]},
        ],
      },
      { type: 'callout', tone: 'warn', title: 'The real price of 2PC', html: `• <strong>Blocking:</strong> if the coordinator falls after PREPARE, participants stay stuck holding their locks. The Postgres docs also say that a prepared transaction keeps its locks, and leaving them around for long even blocks VACUUM. That is why <code>max_prepared_transactions</code> defaults to 0 in Postgres: do not turn it on without a proper transaction manager.<br>• <strong>Slow:</strong> every transaction needs at least two network round trips, with locks held the whole time. The slowest participant sets everyone's speed.<br>• <strong>Availability:</strong> if even one participant is down, the whole transaction cannot happen.<br>• <strong>Outside services:</strong> a payment gateway, an email provider, another company's API: none of them answer your PREPARE.` },
      { type: 'callout', tone: 'tip', title: 'So is 2PC used anywhere?', html: `Yes, where all participants are <em>your own</em> databases and strong atomicity is needed. Google Spanner runs 2PC between shards, but each participant is itself a replicated (Paxos) group, so one machine falling does not make a participant "disappear"; the Spanner paper describes this as the way to reduce the availability problem of 2PC. Kafka transactions also use a two-phase-like commit protocol inside. Between microservices and outside APIs? Almost never.` },

      { type: 'h2', text: 'Saga: one step at a time, an "undo" for every step' },
      { type: 'p', html: `The saga idea came from a 1987 database paper (Garcia-Molina and Salem) and became popular again with microservices. Do not build one big transaction. Turn it into a line of <strong>small local transactions</strong>. Each step is a normal ACID transaction in its own database, committed at once. And with every step, write a <strong>compensating action</strong> that reverses its effect.` },
      { type: 'callout', tone: 'term', title: 'New word: Compensating action', html: `<strong>What it is:</strong> a <strong>new</strong> piece of work that "cancels out" work that is already committed. It is not a database rollback: after a rollback it is as if nothing happened. With compensation the history stays: there was a charge, then a refund.<br><strong>Why we need it:</strong> in a saga the earlier steps are already committed. The only way to take them back is to do the reverse.<br><strong>Without it:</strong> if T3 fails, the ₹199 stays taken and the membership stays stuck at PENDING.<br><strong>Examples:</strong> <strong>charge → refund</strong>, <strong>credit → reverse entry</strong>, <strong>slot hold → slot release</strong> (like a seat in a creator's limited 1:1 live session), <strong>membership PENDING → CANCELLED</strong>. Some things cannot be undone at all: a sent email does not come back. Put such things at the end of the saga, or treat a second "sorry, please ignore that" email as the compensation.` },
      { type: 'table', head: ['Step', 'Service', 'Forward work (Tᵢ)', 'Compensation (Cᵢ)'], rows: [
        ['T1', 'Subscription', 'Membership PENDING', 'C1: mark it CANCELLED'],
        ['T2', 'Payment', '₹199 charge', 'C2: ₹199 refund'],
        ['T3', 'Earnings', 'Arjun +₹140', 'C3: −₹140 reverse entry'],
        ['T4', 'Subscription', 'Membership ACTIVE (pivot)', 'None: after this, only move forward'],
        ['T5', 'Notification', 'Welcome email', 'None: if it fails, retry'],
      ], caption: 'If Tₖ fails, run the compensations so far in reverse order: Cₖ₋₁, ..., C2, C1.' },
      { type: 'callout', tone: 'term', title: 'Pivot and retryable steps', html: `<strong>What it is:</strong> saga steps come in three kinds. <strong>Compensable</strong>: steps that can be undone (T1-T3). <strong>Pivot</strong>: the "point of no return"; once it succeeds, the saga must be completed (T4: the membership is active and Riya has started watching exclusive videos). <strong>Retryable</strong>: the steps after the pivot, which are idempotent and are retried until they succeed (T5).<br><strong>Why we need it:</strong> it tells you whether to "go back" or "push forward" on a failure.<br><strong>Without it:</strong> someone might cancel the whole membership because an email failed, or refund even after the membership is active.<br><strong>Design rule:</strong> put the step that is most likely to fail, or that cannot be undone, as <em>late</em> as possible, near the pivot.` },

      { type: 'h2', text: 'Run it yourself: saga vs 2PC' },
      { type: 'p', html: `Below, choose which step fails, then keep pressing "Next step". In saga mode, see how compensations run in <strong>reverse order</strong>. Then switch to 2PC mode and compare the same failure: how long locks were held, and whether anyone saw the in-between state.` },
    { type: 'custom', render(el) {
        el.innerHTML = `<div class="dt-modes" style="display:flex;flex-wrap:wrap;gap:8px"></div>
          <div class="dt-fails" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>
          <div class="dt-cards" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:8px;margin-top:14px"></div>
          <ol class="dt-log" style="margin:14px 0 0;padding-left:22px;font-size:14px;line-height:1.5"></ol>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"><button type="button" class="btn small primary dt-next">Next step</button><button type="button" class="btn small ghost dt-all">Show all</button><button type="button" class="btn small ghost dt-reset">Reset</button></div>
          <div class="stats"><div class="stat"><span>Result</span><strong class="dt-res"></strong></div><div class="stat"><span>Total time</span><strong class="dt-time"></strong></div><div class="stat"><span>Lock on each DB</span><strong class="dt-lock"></strong></div><div class="stat"><span>In-between state seen outside?</span><strong class="dt-vis"></strong></div></div>
          <div class="calc-note dt-note"></div>`;
        let mode = 'saga', fail = 'T3', shown = 0, run;
        const MODES = { saga: 'Saga (orchestrated)', tpc: '2PC' };
        const FAILS = { none: 'No failure', T1: 'T1 fail', T2: 'T2 fail', T3: 'T3 fail', T4: 'T4 fail', T5: 'T5 email fail', crash: 'Coordinator crash' };
        const CARDS = [['coord', ''], ['sub', 'Subscription'], ['pay', 'Payment'], ['earn', 'Earnings'], ['notif', 'Notification']];
        const KC = { fwd: ['var(--green)', 'DONE'], comp: ['var(--violet)', 'UNDO'], fail: ['var(--red)', 'FAIL'], lock: ['var(--amber)', 'LOCK'], block: ['var(--amber)', 'BLOCKED'], info: ['var(--accent)', 'INFO'], end: ['var(--accent)', 'END'] };
        const col = s => /FAIL|NO|CRASH/.test(s) ? 'var(--red)' : /locked|DOUBT|PREPARED|retrying|PENDING|ing$/.test(s) ? 'var(--amber)' : /CANCELLED|refunded|reversed|rolled|aborted/.test(s) ? 'var(--violet)' : /—|idle/.test(s) ? 'var(--ink-3)' : 'var(--green)';
        const q = c => el.querySelector(c);
        const btns = (sel, map, cur, pick) => {
          const box = q(sel); box.innerHTML = '';
          Object.entries(map).forEach(([k, v]) => {
            const b = document.createElement('button'); b.type = 'button';
            b.className = 'btn small' + (cur === k ? ' primary' : ' ghost'); b.textContent = v;
            b.onclick = () => { pick(k); reset(); }; box.appendChild(b);
          });
        };
        const fmt = ms => ms === Infinity ? '∞' : ms >= 1000 ? (ms / 1000).toFixed(1) + ' s' : ms + ' ms';
        const draw = () => {
          btns('.dt-modes', MODES, mode, k => { mode = k; if (k === 'saga' && fail === 'crash') fail = 'none'; });
          const fl = Object.assign({}, FAILS); if (mode === 'saga') delete fl.crash;
          btns('.dt-fails', fl, fail, k => { fail = k; });
          const st = { coord: 'idle', sub: '—', pay: '—', earn: '—', notif: '—' };
          run.ev.slice(0, shown).forEach(e => Object.assign(st, e.set));
          q('.dt-cards').innerHTML = CARDS.map(([k, name]) => `<div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:8px 10px;background:var(--surface)">
            <div style="font-size:12px;color:var(--ink-3)">${k === 'coord' ? (mode === 'saga' ? 'Orchestrator' : 'Coordinator') : name + (mode === 'tpc' && k !== 'notif' ? ' DB' : '')}</div>
            <div style="font:600 14px var(--f-mono);color:${col(st[k])}">${st[k]}</div></div>`).join('');
          q('.dt-log').innerHTML = run.ev.slice(0, shown).map(e => `<li style="margin:4px 0"><span style="font:12px var(--f-mono);color:var(--ink-3)">${e.t === null ? 't = ∞' : 't = ' + fmt(e.t)}</span> <strong style="color:${KC[e.kind][0]}">${KC[e.kind][1]}</strong> ${e.text}</li>`).join('') || '<li style="color:var(--ink-3)">Press "Next step".</li>';
          const done = shown >= run.ev.length;
          q('.dt-next').disabled = done;
          q('.dt-res').textContent = done ? run.final : '…';
          q('.dt-time').textContent = done ? fmt(run.total) : '…';
          q('.dt-lock').textContent = mode === 'saga' ? '~100 ms' : run.lockMs === Infinity ? '∞' : run.lockMs + ' ms';
          q('.dt-vis').textContent = done ? (run.visible.length ? 'Yes (' + run.visible.length + ')' : 'No') : '…';
          let note = mode === 'saga'
            ? 'In a saga every step commits at once, so each DB holds a lock only for its own small local transaction (~100 ms). The price: the in-between state (charge, credit) can be seen outside, and the undo is done with new work.'
            : (run.lockMs === Infinity ? 'All three DBs stay locked until the coordinator returns (or a human decides). ' : 'All three DBs stayed locked together for ' + run.lockMs + ' ms. ') + 'Note: in the real world a payment gateway cannot be a 2PC participant. Here we assume the Payment DB is our own. Email is never part of 2PC; it is sent after the commit.';
          if (mode === 'tpc' && fail === 'T4') note += ' T1 and T4 are both Subscription DB work, so in 2PC "T4 fail" = a NO vote from the Subscription DB.';
          if (done && run.visible.length) note += ' What was seen outside: ' + run.visible.join('; ') + '.';
          q('.dt-note').textContent = note;
        };
        const reset = () => { run = mode === 'saga' ? T.saga(fail) : T.tpc(fail); shown = 0; draw(); };
        q('.dt-next').onclick = () => { if (shown < run.ev.length) { shown++; draw(); } };
        q('.dt-all').onclick = () => { shown = run.ev.length; draw(); };
        q('.dt-reset').onclick = reset;
        reset();
      }},
      { type: 'p', html: `What did you see? With <strong>T3 fail</strong>, the saga ran C2 (refund) and then C1 (cancel), in reverse order, and Riya saw a "₹199 debited" SMS in between. With 2PC, the same failure showed nothing to anyone, but all three DBs stayed locked together for 300 ms (in a saga each DB only ~100 ms). Now choose "Coordinator crash": in 2PC the lock time becomes <strong>∞</strong>. With <strong>T5 fail</strong> the saga undoes nothing: the email is after the pivot, so it just retries with backoff (1 s, then 2 s) and finishes.` },
      { type: 'callout', tone: 'mistake', title: 'Beginner mistake: "Saga = rollback"', html: `A saga has no rollback at all. Every step is already committed. What happens is <strong>a new piece of work going forward</strong> that cancels the effect of the earlier one. So for a short time the system looks "half-built". A saga gives the <strong>A</strong> of ACID (eventually), but not the <strong>I</strong> (isolation).` },

      { type: 'h2', text: 'Saga style 1: Orchestration (one conductor)' },
      { type: 'p', html: `There are two ways to run a saga. The first: an <strong>orchestrator</strong> service that knows the whole story. It gives each service a command ("charge"), waits for the reply, writes its state in a DB, and runs the compensations on failure.` },
      { type: 'callout', tone: 'term', title: 'New word: Orchestrator', html: `<strong>What it is:</strong> a central service (or workflow engine) that runs the saga's <strong>state machine</strong>: "step 2 is done, now step 3". (A state machine = a list of "what state are we in now, and where can we go next".)<br><strong>Why we need it:</strong> when the whole story is written in one place, "where is saga 77 stuck?" is answered with one query.<br><strong>Without it:</strong> the flow is scattered across many services; on failure it is not clear who will run the undo.<br><strong>The key point:</strong> after every step it saves its progress in a <strong>durable</strong> store (a DB), so after a crash it can continue from exactly where it stopped.` },
      { type: 'flow', title: 'Orchestrated saga', height: 330,
        nodes: [
          { id: 'u', label: 'Riya', sub: 'Join ₹199', x: 80, y: 170, w: 120, kind: 'client', info: 'What it is: the user Riya\'s app. Riya pressed "Join". She sees "Processing..." at once, and the result a few seconds later (through push or polling).' },
          { id: 'o', label: 'Orchestrator', sub: 'saga state in DB', x: 285, y: 170, w: 160, kind: 'server', info: 'What it is: the conductor (orchestrator) of the membership saga. It writes state before and after every step: saga_id, current_step, status. If it crashes, a new instance reads the state and carries on. Temporal or Step Functions do this job ready-made.' },
          { id: 'sub', label: 'Subscription svc', sub: 'T1, T4 / C1', x: 580, y: 50, w: 170, kind: 'server', info: 'What it is: the service that handles memberships, with its own DB. It creates the membership (PENDING) and later makes it ACTIVE. Compensation: CANCELLED.' },
          { id: 'pay', label: 'Payment svc', sub: 'T2 / C2', x: 580, y: 130, w: 170, kind: 'server', info: 'What it is: the money service. It sends the charge request to the payment gateway, with an idempotency key. Compensation: refund.' },
          { id: 'earn', label: 'Earnings svc', sub: 'T3 / C3', x: 580, y: 210, w: 170, kind: 'server', info: 'What it is: the service that keeps the accounts of creators\' earnings. A +₹140 entry in Arjun\'s ledger (account book). Compensation: a −₹140 reverse entry (the old entry is not deleted).' },
          { id: 'notif', label: 'Notification svc', sub: 'T5', x: 580, y: 290, w: 170, kind: 'server', info: 'What it is: the service that sends emails and notifications. Here, the welcome email. It comes after the pivot, so on failure it only retries, with no compensation.' },
        ],
        edges: [{ a: 'u', b: 'o' }, { a: 'o', b: 'sub' }, { a: 'o', b: 'pay' }, { a: 'o', b: 'earn' }, { a: 'o', b: 'notif' }],
        scenarios: [
          { name: 'Happy path', steps: [
            { title: 'Saga starts', text: 'The orchestrator created a saga row: <code>saga 77: step=0, RUNNING</code>.', go: 'u>o', msg: 'POST /memberships { channel: "arjun", plan: "199" }', after: { o: { sub: 'saga 77: step 0' } } },
            { title: 'T1: membership PENDING', text: 'Command sent, reply received, state updated: step=1.', go: ['o>sub', 'res:sub>o'], after: { sub: { state: 'ok', sub: 'PENDING' }, o: { sub: 'saga 77: step 1' } } },
            { title: 'T2: charge', text: 'The Payment svc charges through the gateway, with the key <code>saga-77-T2</code>.', go: ['o>pay', 'res:pay>o'], msg: 'Idempotency-Key: saga-77-T2', after: { pay: { state: 'ok', sub: '₹199 charged' }, o: { sub: 'saga 77: step 2' } } },
            { title: 'T3: credit Arjun', go: ['o>earn', 'res:earn>o'], text: '+₹140 in the ledger.', after: { earn: { state: 'ok', sub: '+₹140' }, o: { sub: 'saga 77: step 3' } } },
            { title: 'T4: ACTIVE (pivot)', go: ['o>sub', 'res:sub>o'], text: 'The point of no return. Now this saga will be completed.', after: { sub: { sub: 'ACTIVE' }, o: { sub: 'saga 77: step 4' } } },
            { title: 'T5 + reply', go: ['o>notif', 'res:o>u'], text: 'The email goes into a queue, and Riya sees "Welcome to Arjun\'s channel!"', after: { notif: { state: 'ok', sub: 'email queued' }, o: { state: 'ok', sub: 'saga 77: DONE' } } },
          ]},
          { name: 'T3 fails: compensate', steps: [
            { title: 'T1, T2 done', text: 'Membership PENDING, ₹199 taken.', go: ['u>o', 'o>sub', 'res:sub>o', 'o>pay', 'res:pay>o'], after: { sub: { state: 'ok', sub: 'PENDING' }, pay: { state: 'ok', sub: '₹199 charged' }, o: { sub: 'saga 77: step 2' } } },
            { title: 'T3 fails', text: 'Arjun\'s account is frozen. The Earnings svc refused. This is a business failure; a retry will not fix it.', go: ['o>earn', 'bad:earn>o'], after: { earn: { state: 'down', sub: 'REJECTED' }, o: { state: 'warn', sub: 'COMPENSATING' } } },
            { title: 'C2: refund', text: 'Undo the earlier step first, in reverse order: refund. This also uses an idempotency key (<code>saga-77-C2</code>), so a retry does not cause a double refund.', go: ['o>pay', 'res:pay>o'], after: { pay: { state: 'dim', sub: 'refunded' } } },
            { title: 'C1: cancel', text: 'Membership CANCELLED.', go: ['o>sub', 'res:sub>o'], after: { sub: { state: 'dim', sub: 'CANCELLED' } } },
            { title: 'A clear answer for Riya', text: '"The membership could not be created. ₹199 has been refunded and will reach your account in 5-7 days." Everything is consistent, without any lock.', go: 'res:o>u', after: { o: { state: '', sub: 'saga 77: COMPENSATED' } } },
          ]},
          { name: 'Orchestrator crash', intro: 'What if the orchestrator itself falls? That is exactly why its state is in a DB.', steps: [
            { title: 'T1, T2 done', text: 'State in the DB: step=2.', go: ['u>o', 'o>sub', 'res:sub>o', 'o>pay', 'res:pay>o'], after: { sub: { state: 'ok', sub: 'PENDING' }, pay: { state: 'ok', sub: '₹199 charged' }, o: { sub: 'saga 77: step 2' } } },
            { title: 'Crash!', text: 'Before sending T3, the orchestrator\'s pod died (a deploy).', set: { o: { state: 'down', sub: 'CRASHED' } }, go: 'lost:o>earn' },
            { title: 'New instance, old state', text: 'A new pod starts and reads the unfinished sagas from the DB: "saga 77 was at step 2". Nothing was kept in memory; everything was in the DB.', set: { o: { state: 'warn', sub: 'resumed: step 2' } }, focus: ['o'] },
            { title: 'Carry on from T3', text: 'It continues from there. If it is unsure whether T2\'s reply was recorded, it sends T2 again with <em>the same idempotency key</em>: the Payment svc returns the old result and does not charge again.', go: ['o>earn', 'res:earn>o', 'o>sub', 'res:sub>o'], after: { earn: { state: 'ok', sub: '+₹140' }, sub: { sub: 'ACTIVE' }, o: { state: 'ok', sub: 'saga 77: step 4' } } },
          ]},
        ],
      },

      { type: 'h2', text: 'Saga style 2: Choreography (no conductor)' },
      { type: 'p', html: `The second way: no boss. Each service does its work and publishes an <strong>event</strong> ("payment done"), and any service that cares about that event takes its next step by itself. Just like in the Kafka lesson, where many teams read the same event. On failure an event also goes out ("payment failed"), and the earlier services hear it and run their own compensation.` },
      { type: 'callout', tone: 'term', title: 'New word: Choreography', html: `<strong>What it is:</strong> a saga with no boss. Each service listens for an <strong>event</strong> (a small message: "this is done"), does its work, and publishes its own event. Like a group dance where each dancer hears the music and takes the next step alone.<br><strong>Why we need it:</strong> services do not call each other directly, so they stay loosely coupled; a new service can join just by listening to an event.<br><strong>Without it (that is, orchestration):</strong> you need an extra central service that gives everyone commands.<br><strong>The price:</strong> the whole flow is not written in any one place.` },
      { type: 'flow', title: 'Choreographed saga over Kafka', height: 340,
        nodes: [
          { id: 'sub', label: 'Subscription svc', sub: 'T1, T4 / C1', x: 130, y: 70, w: 170, kind: 'server', info: 'What it is: the membership service. It publishes MembershipRequested. When it hears PaymentFailed, it sets CANCELLED. When it hears EarningsCredited, it sets ACTIVE.' },
          { id: 'bus', label: 'Kafka', sub: 'membership events', x: 365, y: 170, w: 160, kind: 'queue', info: 'What it is: the event log (Kafka lesson), where services put and read events. The key of every event = the membership ID, so all events of one membership arrive in order (same partition). Delivery is at-least-once, so duplicates can arrive.' },
          { id: 'pay', label: 'Payment svc', sub: 'T2 / C2', x: 600, y: 70, w: 160, kind: 'server', info: 'What it is: the money service. When it hears MembershipRequested, it charges. Depending on the result it publishes PaymentCaptured or PaymentFailed. When it hears EarningsFailed, it refunds.' },
          { id: 'earn', label: 'Earnings svc', sub: 'T3 / C3', x: 600, y: 270, w: 160, kind: 'server', info: 'What it is: the creator earnings service. When it hears PaymentCaptured, it credits Arjun. It writes every event ID into a processed_events table, so a duplicate event does not credit again.' },
          { id: 'notif', label: 'Notification svc', sub: 'T5', x: 130, y: 270, w: 170, kind: 'server', info: 'What it is: the notification service. When it hears the MembershipActivated event, it sends the welcome email. Nobody calls it directly.' },
        ],
        edges: [{ a: 'sub', b: 'bus' }, { a: 'pay', b: 'bus' }, { a: 'earn', b: 'bus' }, { a: 'notif', b: 'bus' }],
        scenarios: [
          { name: 'Happy path', steps: [
            { title: 'MembershipRequested', text: 'The Subscription svc wrote the PENDING row and the outbox event in one transaction. The event went to Kafka, and the Payment svc heard it.', go: ['evt:sub>bus', 'evt:bus>pay'], after: { sub: { state: 'ok', sub: 'PENDING' } }, msg: '{ "type": "MembershipRequested", "id": "m-77", "eventId": "e-1" }' },
            { title: 'PaymentCaptured', text: 'The charge went through. A new event. The Earnings svc heard it.', go: ['evt:pay>bus', 'evt:bus>earn'], after: { pay: { state: 'ok', sub: '₹199 charged' } } },
            { title: 'EarningsCredited', text: 'Arjun +₹140. The event goes back to the Subscription svc.', go: ['evt:earn>bus', 'evt:bus>sub'], after: { earn: { state: 'ok', sub: '+₹140' } } },
            { title: 'MembershipActivated', text: 'ACTIVE. The Notification svc heard it and sent the email. Nobody gave anybody a "command": everyone danced to the events.', go: ['evt:sub>bus', 'evt:bus>notif'], after: { sub: { sub: 'ACTIVE' }, notif: { state: 'ok', sub: 'email sent' } } },
          ]},
          { name: 'Payment fails', steps: [
            { title: 'MembershipRequested', go: ['evt:sub>bus', 'evt:bus>pay'], text: 'The same start.', after: { sub: { state: 'ok', sub: 'PENDING' } } },
            { title: 'Card declined', text: 'The Payment svc publishes PaymentFailed.', go: ['bad:pay>bus', 'bad:bus>sub'], after: { pay: { state: 'down', sub: 'declined' } } },
            { title: 'Subscription compensates by itself', text: 'The Subscription svc heard PaymentFailed and ran C1: CANCELLED. The Earnings svc never knew anything, because no event ever came for it.', focus: ['sub'], set: { sub: { state: 'dim', sub: 'CANCELLED' } } },
          ]},
          { name: 'Duplicate event', intro: 'Kafka is at-least-once. The Earnings svc credited, but restarted before committing its offset.', steps: [
            { title: 'The first time', text: 'PaymentCaptured (eventId e-2) arrived. The credit + "e-2 processed" go in one DB transaction.', go: 'evt:bus>earn', after: { earn: { state: 'ok', sub: '+₹140 (e-2 saved)' } }, msg: 'BEGIN; INSERT ledger (+140); INSERT processed_events (e-2); COMMIT;' },
            { title: 'Restart, the same event again', text: 'The offset was not committed, so Kafka delivered e-2 again.', go: 'evt:bus>earn', set: { earn: { state: 'warn', sub: 'e-2 again?' } } },
            { title: 'Idempotent consumer: skip', text: 'e-2 is already in processed_events. Do nothing, just ack. Arjun gets ₹140, not ₹280.', focus: ['earn'], set: { earn: { state: 'ok', sub: 'e-2 seen: skip' } }, msg: 'INSERT processed_events (e-2) → duplicate key → skip' },
          ]},
          { name: 'Who is watching?', intro: 'The hidden weakness of choreography.', steps: [
            { title: 'PaymentCaptured went out', go: ['evt:sub>bus', 'evt:bus>pay', 'evt:pay>bus'], text: 'Everything was going fine.', after: { sub: { state: 'ok', sub: 'PENDING' }, pay: { state: 'ok', sub: '₹199 charged' } } },
            { title: 'The Earnings consumer is stuck', text: 'Because of a bug, the Earnings consumer is in a crash loop. The event sits in Kafka; nobody is reading it.', go: 'lost:bus>earn', set: { earn: { state: 'down', sub: 'consumer stuck' } } },
            { title: 'Membership PENDING forever', text: 'There is no central place that says "saga 77 has taken 10 minutes, where is it stuck?" Each service only knows its own part. The fix: saga timeouts, consumer lag alerts, and a tracking view. In big flows this is why people choose orchestration.', focus: ['sub'], set: { sub: { state: 'warn', sub: 'PENDING forever?' } } },
          ]},
        ],
      },
      { type: 'table', head: ['', 'Choreography', 'Orchestration'], rows: [
        ['Who runs it', 'Nobody; each service acts on events', 'An orchestrator / workflow engine'],
        ['Coupling', 'Services know each other\'s events', 'Services only know the orchestrator\'s commands'],
        ['Where the whole flow is written', 'Nowhere, scattered across many services', 'In one place (code or a state machine)'],
        ['Debugging, "where is it stuck?"', 'Hard: you must join up logs', 'Easy: look at the orchestrator\'s state'],
        ['Single point of failure', 'No (but it depends on Kafka)', 'The orchestrator (that is why its state is durable)'],
        ['Good when', '2-4 steps, simple, independent teams', '4+ steps, branches, timeouts, human steps'],
      ]},
      { type: 'callout', tone: 'mistake', title: 'Beginner mistake: "choreography scales better, so always use it"', html: `Both scale. The real difference is <strong>understanding</strong>. With up to 3 services the dance of events is clear. After 8 services, retries, timeouts and cyclic events ("B listens to A's event, C to B's, A to C's"), nobody can tell what the flow is. Microsoft's saga guide also suggests choreography for simple flows and orchestration for complex ones.` },

      { type: 'h2', text: 'The weakness of a saga: no isolation' },
      { type: 'p', html: `In a saga every step commits at once, so other requests can see the in-between state. Example: T3 (Arjun +₹140) is done, and at exactly that moment Arjun's weekly payout job runs and sends the ₹140 to his bank. Then T4 fails and C3 reverses −₹140. Now Arjun's balance is negative! This is called an anomaly like a <strong>dirty read</strong>: someone read data that was later undone. Ways to handle it:` },
      { type: 'list', items: [
        '<strong>Semantic lock</strong>: put a status flag on the data. Write the earnings entry as <code>PENDING</code>, and let the payout job pick only <code>CONFIRMED</code> entries. Mark it CONFIRMED when the saga ends. The membership\'s PENDING is the same idea.',
        '<strong>Think about the order of steps</strong>: put things that are visible outside, or painful to undo (credit, email), after the pivot. Microsoft calls this the "pessimistic view".',
        '<strong>Commutative updates</strong>: updates that give the same result in any order (like +140 and −140 entries in a ledger, instead of "set balance = 140").',
        '<strong>Reread value</strong>: before updating, check that the data is still what you read earlier (a version number, optimistic locking).',
      ]},
      { type: 'callout', tone: 'warn', title: 'A compensation can fail too', html: `The refund API can also be down. You cannot just "skip" a compensation, or Riya loses her money. So make compensations <strong>idempotent</strong> and retry them until they succeed (with backoff). If it still does not work, raise an alert + put it in a queue for a human ("manual refund needed"). In every saga design ask: "what if this undo also fails?"` },

      { type: 'h2', text: 'Transactional outbox (recap)' },
      { type: 'p', html: `Every saga step does two things: <strong>write to its own DB</strong> and <strong>send the next event/command</strong>. This is the same <em>dual write</em> problem we saw in the Kafka lesson: the DB commit went through, then the pod died before sending the event, so the saga is stuck forever, and nobody even knows.` },
      { type: 'callout', tone: 'term', title: 'New words: Dual write and Transactional outbox', html: `<strong>What a dual write is:</strong> writing to two separate systems (your own DB + Kafka) in one job, one after the other. A crash between them = written in one, not in the other.<br><strong>What an outbox is:</strong> an <code>outbox</code> table in your own DB. Write the event into this table together with the data, <strong>in the same transaction</strong>. A separate <strong>relay</strong> (or a CDC tool like Debezium, which reads the DB's change log) later picks events from the outbox and puts them into Kafka.<br><strong>Why we need it:</strong> "saved in the DB" and "event sent" must never split apart. The next saga step runs on this event.<br><strong>Without it:</strong> the money is taken, the event never goes out, the saga is stuck forever, and no error even shows.` },
      { type: 'code', text: `BEGIN;
  UPDATE memberships SET status = 'PENDING' WHERE id = 'm-77';
  INSERT INTO outbox (event_id, type, aggregate_id, payload)
    VALUES ('e-1', 'MembershipRequested', 'm-77', '{...}');
COMMIT;
-- A relay process (or a CDC tool like Debezium) reads the outbox and publishes to Kafka.` },
      { type: 'p', html: `The cure: write the event into the outbox table <strong>in the same local transaction</strong>. Either both are saved, or neither. Then a separate relay/CDC process carries it from the outbox to Kafka. The full story and diagram are in the outbox section of the "Kafka and event streams" lesson. The thing to remember: the outbox is <strong>at-least-once</strong>, so an event will sometimes go out twice. Hence the next section.` },

      { type: 'h2', text: 'Idempotent consumers (and idempotency keys)' },
      { type: 'p', html: `In a saga, duplicates come from everywhere: the outbox relay sends again, Kafka redelivers, the orchestrator sends a step again after a crash, a retry happens on a timeout. Every participant must be built so that <strong>if the same message arrives twice, the effect happens only once</strong>.` },
      { type: 'callout', tone: 'term', title: 'Idempotent consumer', html: `<strong>What it is:</strong> a consumer that remembers each message's unique ID (event ID / command ID). It writes the work and the "ID processed" record <strong>in one DB transaction</strong>. If the ID was seen before, it just acks and skips. (Idempotent = however many times you do it, the effect happens once.)<br><strong>Why we need it:</strong> the outbox, Kafka and retries are all "at-least-once": the same message will come twice.<br><strong>Without it:</strong> Arjun gets ₹280 instead of ₹140; Riya gets two refunds.<br>We saw the same for email in the queues lesson; here it is money, so it matters even more.` },
      { type: 'code', text: `-- Earnings service, PaymentCaptured event e-2 arrived
BEGIN;
  INSERT INTO processed_events (event_id) VALUES ('e-2');   -- PRIMARY KEY
  -- duplicate key error? => already done, ROLLBACK and ack
  INSERT INTO ledger (creator, amount, saga_id, status)
    VALUES ('arjun', 140, 'saga-77', 'PENDING');
COMMIT;` },
      { type: 'p', html: `For outside APIs, use an <strong>idempotency key</strong>: send the payment gateway a unique key with every charge (<code>saga-77-T2</code>). APIs like Stripe do not create a new charge for a second request with the same key; they return the earlier result. This ends the fear of "there was a timeout, was it charged or not?": just retry with the same key. Use a separate key for the compensation (refund) (<code>saga-77-C2</code>), so there are never two refunds.` },
      { type: 'callout', tone: 'term', title: 'New word: Idempotency key', html: `<strong>What it is:</strong> a unique string you send with every request (like <code>saga-77-T2</code>). The server saves the first result under this key. If the same key comes again, it does not do the work again; it returns the old result.<br><strong>Why we need it:</strong> on a timeout you do not know whether the work happened. With a key you can retry without fear.<br><strong>Without it:</strong> a retry = a double charge, and no retry = "maybe the money was taken, maybe not".<br><strong>Example:</strong> Stripe returns the first saved result for a request with the same key (even if it was an error), and may remove keys after 24 hours.` },
      { type: 'callout', tone: 'mistake', title: 'Beginner mistake: "check first, then do it"', html: `<code>if (!alreadyProcessed(id)) { credit(); markProcessed(id); }</code> If two threads run at the same time, both pass the check and two credits happen. Make the check and the work <strong>atomic</strong>: the insert with a unique constraint and the work in one transaction, as above.` },
      { type: 'h3', text: 'Delivery lab: outbox and idempotency together' },
      { type: 'p', html: `The Payment service saved a charge and must send a <code>PaymentCaptured</code> event; the Earnings service hears it and gives Arjun ₹140. Below, cause a crash at each place and see what survives. The right answer is always: <strong>Arjun gets ₹140, no less and no more</strong>.` },
    { type: 'custom', render(el) {
        function deliveryCore(o) {
          const events = o.prod === 'dual' ? (o.pCrash ? 0 : 1) : 1 + (o.relayDup ? 1 : 0);
          const deliveries = events + (o.cCrash && events > 0 ? 1 : 0);
          const credits = o.cons === 'naive' ? deliveries : (events > 0 ? 1 : 0);
          return { events, deliveries, credits, rupees: credits * 140, verdict: credits === 1 ? 'ok' : credits === 0 ? 'lost' : 'double' };
        }
        const o = { prod: 'dual', pCrash: true, relayDup: false, cons: 'naive', cCrash: false };
        const OPT = [
          ['prod', 'How the Payment svc sends', [['dual', 'Dual write (DB, then Kafka)'], ['outbox', 'Outbox (one transaction)']]],
          ['pCrash', 'Payment svc crashes right after the DB commit?', [[false, 'No'], [true, 'Yes']]],
          ['relayDup', 'Outbox relay crashes after publishing, before marking "sent"?', [[false, 'No'], [true, 'Yes']]],
          ['cons', 'Earnings svc consumer', [['naive', 'Naive (credit directly)'], ['idem', 'Idempotent (remembers event ID)']]],
          ['cCrash', 'Earnings svc crashes after the credit, before the offset commit?', [[false, 'No'], [true, 'Yes']]],
        ];
        el.innerHTML = `<div class="dl-opts" style="display:grid;gap:8px"></div>
          <div class="stats">
            <div class="stat"><span>Events in Kafka</span><strong class="dl-ev"></strong></div>
            <div class="stat"><span>Deliveries to Earnings</span><strong class="dl-del"></strong></div>
            <div class="stat"><span>Arjun received</span><strong class="dl-rs"></strong></div>
          </div>
          <div class="calc-note dl-note"></div>`;
        const q = s => el.querySelector(s);
        const draw = () => {
          const box = q('.dl-opts'); box.innerHTML = '';
          OPT.forEach(([k, label, vals]) => {
            if (k === 'relayDup' && o.prod !== 'outbox') return;
            const row = document.createElement('div'); row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;align-items:center';
            const l = document.createElement('span'); l.textContent = label + ':'; l.style.cssText = 'font-size:14px;color:var(--ink-2);margin-right:4px'; row.appendChild(l);
            vals.forEach(([v, t]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (o[k] === v ? ' on' : ''); b.textContent = t; b.onclick = () => { o[k] = v; draw(); }; row.appendChild(b); });
            box.appendChild(row);
          });
          const r = deliveryCore(o);
          q('.dl-ev').textContent = r.events; q('.dl-del').textContent = r.deliveries;
          q('.dl-rs').textContent = '₹' + r.rupees; q('.dl-rs').style.color = r.verdict === 'ok' ? 'var(--green)' : 'var(--red)';
          q('.dl-note').textContent = (o.prod === 'outbox' && o.pCrash ? 'Even after the crash, the event was safe in the outbox table; the relay sent it later. ' : '') + (r.verdict === 'lost'
            ? 'WRONG: Riya\'s ₹199 was taken ("captured" in the DB), but the event never went out. Arjun got ₹0 and the saga is stuck forever. The cure: outbox.'
            : r.verdict === 'double'
              ? `WRONG: the same event arrived ${r.deliveries} times and the naive consumer credited every time: Arjun got ₹${r.rupees}. The cure: an idempotent consumer.`
              : r.deliveries > 1 ? `RIGHT: the event arrived ${r.deliveries} times, but the idempotent consumer recognised the event ID and skipped the duplicate. Arjun got ₹140.` : 'RIGHT: the event went out once and was credited once. Arjun got ₹140.');
        };
        draw();
      }},
      { type: 'p', html: `In short: the <strong>outbox</strong> ends the "an event gets lost" problem, but in return you get "an event sometimes comes twice" (at-least-once). The <strong>idempotent consumer</strong> turns "twice" into "the effect of once". Only together are they the full cure.` },
      { type: 'h2', text: 'Workflow engines: Temporal and AWS Step Functions' },
      { type: 'p', html: `Writing your own orchestrator means building all of this yourself: a saga state table, resume after a crash, retries with backoff, timeouts ("if the payment is not confirmed in 10 minutes, cancel"), compensations, monitoring. This is so common that there are ready-made tools for it: <strong>workflow engines</strong>.` },
      { type: 'callout', tone: 'term', title: 'New word: Durable execution', html: `<strong>What it is:</strong> your workflow code runs as if crashes never happen. The engine writes the result of every completed step into an <strong>event history</strong> (a diary) on a durable store. The worker machine died? Another machine <strong>replays</strong> the code from the start, but takes the results of already-finished steps from the history (it does not run them again), and continues from exactly where it stopped.<br><strong>Why we need it:</strong> no need to write the saga state table, resume logic, retries and timers yourself.<br><strong>Without it:</strong> sagas that were running during a deploy are left half-done, or you must write your own recovery code.` },
      { type: 'h3', text: 'Temporal' },
      { type: 'p', html: `Temporal is an open-source workflow engine. Its founders earlier built <strong>Cadence</strong> at Uber, which ran many of Uber's business-critical services; Temporal came out of it in 2019. You write the workflow in normal code (Go, Java, TypeScript, Python...):` },
      { type: 'code', text: `// Workflow: normal code, but durable. Every await is an "Activity".
async function membershipSaga(req) {
  const undo = [];
  try {
    await createPending(req);          undo.push(() => cancelMembership(req));
    await charge(req, 'saga-77-T2');   undo.push(() => refund(req, 'saga-77-C2'));
    await creditCreator(req);          undo.push(() => reverseCredit(req));
    await activate(req);               // pivot
  } catch (err) {
    for (const c of undo.reverse()) await c();   // compensations, in reverse order
    throw err;
  }
  await sendWelcomeEmail(req);          // retry policy: until it succeeds
}` },
      { type: 'list', items: [
        '<strong>Activities</strong> = jobs with side effects (an API call, a DB write). Their results are recorded in the history. Default retry policy: start at 1 second, double each time (backoff 2.0), at most a 100 second gap, and unlimited attempts. You can mark business errors as "non-retryable".',
        '<strong>Workflow code must be deterministic</strong>: the same decisions on every replay. So do not use <code>Date.now()</code> or random directly inside the workflow; do those in activities or with the safe APIs the SDK gives you.',
        '<strong>Durable timers</strong>: you can write <code>sleep("30 days")</code> (like "renew the membership after 30 days"). The timer is an event in the history; no machine sits awake for 30 days.',
        '<strong>Signals</strong>: a message to the workflow from outside, like "the admin approved a manual refund". This is how human steps join in.',
      ]},
      { type: 'p', html: `Try durable execution yourself. Kill the worker (the machine that runs the workflow code) at different places. The new worker replays from the history: steps that are in the history <strong>do not run again</strong>. But if the worker died <em>in the middle</em> of an activity, that activity runs again: then only the idempotency key saves you.` },
    { type: 'custom', render(el) {
        const ST = ['T1 createPending', 'T2 charge ₹199', 'T3 creditCreator', 'T4 activate (pivot)', 'T5 sendWelcomeEmail'];
        function replayCore(crash, key) {
          const log = [], hist = []; let charges = 0, runs = 0;
          const exec = (i, w) => { runs++; if (i === 1) charges++; hist.push(i); log.push([w, 'run', ST[i]]); };
          const k = { none: 5, after1: 1, after2: 2, during2: 1, after4: 4 }[crash];
          for (let i = 0; i < k; i++) exec(i, 'W1');
          if (crash === 'during2') { runs++; charges++; log.push(['W1', 'crash', 'T2 ran: the gateway took ₹199, but W1 died before the result was written to the history']); }
          else if (k < 5) log.push(['W1', 'crash', 'W1 died (a deploy / the machine went down)']);
          if (k < 5 || crash === 'during2') {
            for (let i = 0; i < hist.length; i++) log.push(['W2', 'skip', ST[hist[i]] + ': result taken from the history, not run again']);
            const from = hist.length;
            for (let i = from; i < 5; i++) {
              if (i === 1 && crash === 'during2') { runs++; if (!key) charges++; hist.push(1); log.push(['W2', key ? 'same' : 'run', key ? 'T2 retry, same key saga-77-T2: the gateway returned the first result, NO new charge' : 'T2 retry, no key: the gateway took ₹199 again!']); }
              else exec(i, 'W2');
            }
          }
          return { log, charges, runs, hist: hist.length };
        }
        let crash = 'during2', key = false;
        const CR = [['none', 'No crash'], ['after1', 'After T1'], ['after2', 'After T2'], ['during2', 'During T2'], ['after4', 'After T4']];
        el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center"><span style="font-size:14px;color:var(--ink-2)">When the worker dies:</span><span class="rp-c" style="display:flex;flex-wrap:wrap;gap:6px"></span></div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px"><span style="font-size:14px;color:var(--ink-2)">Idempotency key on the charge:</span><span class="rp-k" style="display:flex;gap:6px"></span></div>
          <ol class="rp-log" style="margin:12px 0 0;padding-left:22px;font-size:14px;line-height:1.55"></ol>
          <div class="stats"><div class="stat"><span>Activities that really ran</span><strong class="rp-runs"></strong></div><div class="stat"><span>Taken from Riya</span><strong class="rp-ch"></strong></div><div class="stat"><span>Workflow</span><strong class="rp-st"></strong></div></div>`;
        const q = s => el.querySelector(s);
        const chips = (box, opts, cur, set) => { box.innerHTML = ''; opts.forEach(([v, t]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (v === cur ? ' on' : ''); b.textContent = t; b.onclick = () => { set(v); draw(); }; box.appendChild(b); }); };
        const C = { run: ['var(--green)', 'RUN'], skip: ['var(--ink-3)', 'REPLAY'], crash: ['var(--red)', 'CRASH'], same: ['var(--violet)', 'DEDUP'] };
        const draw = () => {
          chips(q('.rp-c'), CR, crash, v => { crash = v; });
          chips(q('.rp-k'), [[true, 'Yes'], [false, 'No']], key, v => { key = v; });
          const r = replayCore(crash, key);
          q('.rp-log').innerHTML = r.log.map(([w, k, t]) => `<li><span style="font:12px var(--f-mono);color:var(--ink-3)">${w}</span> <strong style="color:${C[k][0]}">${C[k][1]}</strong> ${t}</li>`).join('');
          q('.rp-runs').textContent = r.runs; q('.rp-ch').textContent = '₹' + r.charges * 199; q('.rp-ch').style.color = r.charges > 1 ? 'var(--red)' : 'var(--green)';
          q('.rp-st').textContent = 'COMPLETED (' + r.hist + '/5)';
        };
        draw();
      }},
      { type: 'h3', text: 'AWS Step Functions' },
      { type: 'p', html: `A managed service from AWS. The workflow is a <strong>state machine</strong> that you write in JSON (Amazon States Language): states like Task, Choice, Wait, Parallel and Map. On every Task you can write <code>Retry</code> and <code>Catch</code>; with Catch you jump to a compensation state:` },
      { type: 'code', text: `"ChargePayment": {
  "Type": "Task",
  "Resource": "arn:aws:states:::lambda:invoke",
  "Retry": [{ "ErrorEquals": ["States.Timeout"], "IntervalSeconds": 1, "BackoffRate": 2.0, "MaxAttempts": 3 }],
  "Catch": [{ "ErrorEquals": ["States.ALL"], "Next": "CancelMembership" }],
  "Next": "CreditCreator"
}` },
      { type: 'table', head: ['', 'Standard workflow', 'Express workflow'], rows: [
        ['How long at most', 'Up to 1 year', '5 minutes'],
        ['Execution guarantee', 'Exactly-once (runs again only if you write Retry)', 'Async: at-least-once; Sync: at-most-once'],
        ['History', 'Kept by Step Functions (90 days)', 'Only in CloudWatch Logs (turn it on)'],
        ['Human approval (callback token)', 'Yes (.waitForTaskToken)', 'No'],
        ['When', 'Long, non-idempotent flows like payments and memberships', 'High-volume, short, idempotent jobs'],
      ], caption: 'According to the AWS docs (2026).' },
      { type: 'table', head: ['What the engine gives you', 'If you build it yourself'], rows: [
        ['Durable state + resume after a crash', 'A saga state table, a recovery job'],
        ['Retries with backoff, per step', 'Retry code on every call'],
        ['Timers (minutes to months)', 'Cron + DB polling'],
        ['History / UI: "where is saga 77 stuck?"', 'Search by joining up logs'],
        ['Human steps (approve / reject)', 'A custom callback system'],
      ]},
      { type: 'callout', tone: 'warn', title: 'You still need idempotency with a workflow engine', html: `The engine will retry an activity. If the activity sent a charge to the payment gateway and the worker died before the reply came, the engine will run the activity <strong>again</strong>. Without an idempotency key, that is a double charge. The engine handles "when, and how many times"; "no harm if it runs again" is your job.` },

      { type: 'h2', text: 'Decide' },
      { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>Inside one database</strong>: a normal transaction. Do not think of anything else.<br><strong>Across services</strong>: a saga. A line of local steps, each step with an "undo" (compensation).<br>Never let <strong>"save to DB" and "publish event"</strong> split apart: the outbox pattern.<br>And make every consumer / every step <strong>idempotent</strong>.` },
      { type: 'table', head: ['Situation', 'Choice'], rows: [
        ['All the data in one DB (or one service)', 'A local ACID transaction. Maybe the services did not need to be split this much.'],
        ['A few of your own databases, strong atomicity, small scale', '2PC / XA is possible, but watch out for blocking and latency'],
        ['2-4 services, a simple straight flow', 'A choreographed saga over Kafka + outbox'],
        ['Many steps, branches, timeouts, human approval', 'An orchestrated saga, a workflow engine (Temporal / Step Functions)'],
        ['An outside API (payment gateway) in the middle', 'Saga + idempotency keys. 2PC is not even possible.'],
      ]},
      { type: 'callout', tone: 'mistake', title: 'When NOT to use a saga', html: `If two things must always change together and even a moment's difference causes harm (like two balance fields of the same account), keep them <strong>in one service, one DB</strong>. A saga is the cure for distributed data, not for services that were split in the wrong place.` },
      { type: 'ascii', text: `
Final architecture (orchestrated)

Riya ─> API gateway ─> Membership workflow (Temporal / Step Functions)
                              │  state + history durable
         ┌──────────────┬─────┴────────┬──────────────────┐
         v              v              v                  v
  Subscription svc  Payment svc    Earnings svc     Notification svc
  (own DB+outbox)   (own DB,       (own DB,          (retry until sent)
                     idempotency    processed_events,
                     keys → PSP)    PENDING→CONFIRMED)` },

      { type: 'diagram', title: 'Sagas: the whole picture', height: 610,
        groups: [
          { label: 'Services (own DB)', x: 14, y: 340, w: 692, h: 100 },
        ],
        nodes: [
          { id: 'riya', label: 'Riya', sub: 'Join ₹199', x: 360, y: 46, w: 150, kind: 'client', info: 'What it is: the user\'s app. Pressing "Join" shows "Processing..." at once; the result comes a few seconds later.' },
          { id: 'gw', label: 'API gateway', sub: 'auth, rate limit', x: 360, y: 150, w: 160, kind: 'edge', info: 'What it is: the front door for all requests (resilience lesson). It sends the request on to the membership workflow.' },
          { id: 'wf', label: 'Membership saga', sub: 'Temporal / Step Fns', x: 280, y: 262, w: 200, kind: 'server', info: 'What it is: the orchestrator / workflow engine. It runs steps T1-T5, runs compensations in reverse order on failure, and also handles retries and timers.' },
          { id: 'hist', label: 'Workflow history', sub: 'durable state', x: 580, y: 262, w: 180, kind: 'data', info: 'What it is: the result of every step is written here. If a worker dies, a new worker replays from this and continues from the same place.' },
          { id: 'sub', label: 'Subscription', sub: 'DB + outbox', x: 95, y: 395, w: 150, kind: 'server', info: 'What it is: the membership service. T1 PENDING, T4 ACTIVE (pivot), C1 CANCELLED. Its events go out through the outbox table.' },
          { id: 'pay', label: 'Payment', sub: 'idempotency keys', x: 270, y: 395, w: 150, kind: 'server', info: 'What it is: the money service. T2 charge and C2 refund, each with its own idempotency key, so a retry never doubles anything.' },
          { id: 'earn', label: 'Earnings', sub: 'processed_events', x: 445, y: 395, w: 150, kind: 'server', info: 'What it is: creator earnings. T3 +₹140 (a PENDING entry, a semantic lock), C3 reverse entry. An idempotent consumer: it remembers event IDs.' },
          { id: 'notif', label: 'Notification', sub: 'retry till sent', x: 620, y: 395, w: 150, kind: 'server', info: 'What it is: the email service. T5 comes after the pivot, so on failure it only retries, with no undo.' },
          { id: 'kafka', label: 'Kafka', sub: 'events via outbox', x: 95, y: 530, w: 150, kind: 'queue', info: 'What it is: the event log. The outbox relay puts events here (at-least-once); other services (analytics, search) can listen too.' },
          { id: 'psp', label: 'Payment gateway', sub: 'outside company', x: 270, y: 530, w: 150, kind: 'net', info: 'What it is: an outside API like Razorpay/Stripe. It cannot take part in 2PC, so we use a saga + an idempotency key.' },
          { id: 'email', label: 'Email provider', sub: 'outside API', x: 620, y: 530, w: 160, kind: 'net', info: 'What it is: an outside service that sends emails. A sent email does not come back, so this job comes at the very end.' },
        ],
        edges: [
          { a: 'riya', b: 'gw', n: 1 },
          { a: 'gw', b: 'wf', n: 2, label: 'start saga' },
          { a: 'wf', b: 'hist', label: 'save step' },
          { a: 'wf', b: 'sub' },
          { a: 'wf', b: 'pay', n: 3 },
          { a: 'wf', b: 'earn' },
          { a: 'wf', b: 'notif' },
          { a: 'pay', b: 'psp', label: 'charge + key' },
          { a: 'sub', b: 'kafka', kind: 'evt', label: 'outbox' },
          { a: 'kafka', b: 'earn', kind: 'evt', via: [[95, 588], [445, 588]] },
          { a: 'notif', b: 'email' },
        ],
        paths: [
          { name: 'Happy path', text: 'The workflow ran T1-T5 one by one, saving to the history after every step.', go: ['riya>gw>wf>sub', 'wf>pay>psp', 'wf>earn', 'wf>notif>email', 'wf>hist'] },
          { name: 'T3 fails: compensate', text: 'Earnings refused. In reverse order: C2 (refund, with its own key) and C1 (cancel).', go: ['wf>earn', 'wf>pay>psp', 'wf>sub'] },
          { name: 'Worker crash: resume', text: 'The worker died. A new worker reads the history, replays, and runs from the next step.', go: ['wf>hist'] },
          { name: 'Event + idempotent consumer', text: 'The Subscription event goes from the outbox to Kafka, and from there to Earnings. If a duplicate comes, it is skipped by its event ID.', go: ['sub>kafka>earn'] },
        ],
      },
      { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
        <li>Inside one DB: a normal ACID transaction. Across many services: there is no shared COMMIT.</li>
        <li><strong>2PC</strong>: PREPARE (all YES?) then COMMIT. Atomic, but with locks, slow, and if the coordinator crashes the participants <strong>block</strong>. Not possible with outside APIs.</li>
        <li><strong>Saga</strong>: a line of local steps, each with a compensation (refund, cancel), run in reverse order on failure. After the pivot, only retry.</li>
        <li><strong>Orchestration</strong> (one conductor, the flow in one place) vs <strong>choreography</strong> (events, no boss). For big flows, orchestration.</li>
        <li>A saga has no isolation: semantic lock (PENDING), the right order, commutative updates.</li>
        <li><strong>Outbox</strong>: the DB write and the event in one transaction. <strong>Idempotent consumer</strong> + idempotency key: a duplicate has the effect of one.</li>
        <li><strong>Temporal / Step Functions</strong>: durable state, replay, retries, timers. Idempotency is still your job.</li>
      </ul>` },

      { type: 'tradeoffs',
        gains: ['Each service keeps its own DB, scales and deploys independently', 'No long distributed locks: one slow service does not freeze the others', 'Outside APIs (a payment gateway) can also be part of the flow', 'A clear, business-level answer to failure (refund, cancel), with history', 'A workflow engine gives automatic resume after a crash, retries and timers'],
        costs: ['No isolation: the in-between state can be seen (you need semantic locks)', 'Writing and testing a compensation for every step, and handling its failure', 'Eventual consistency: "PENDING" shows for a few seconds', 'Every participant must be made idempotent', 'With choreography the flow is hard to understand and debug; with orchestration there is one more critical component'] },

      { type: 'think', questions: [
        { q: 'In a saga, T2\'s (charge) request went to the payment gateway, and no reply came for 10 seconds. What should the orchestrator do: refund, retry, or something else?', a: 'We do not know whether the charge happened, so a blind refund or a new charge could both be wrong. Retry with the same idempotency key (or ask the gateway for the status of that key/order). The gateway will return the earlier result: if it was already charged, "success"; if not, it happens now. Only then move forward or compensate.' },
        { q: 'Is it fine to send the welcome email (T5) before T1, so that Riya gets feedback sooner?', a: 'No. An email cannot be undone. If the payment fails later, Riya has a "Welcome!" email and no membership. Put steps that cannot be undone after the pivot. For quick feedback, show "Processing..." in the app, not an email.' },
        { q: 'Why does xyz.com\'s orchestrator look more like a "single point of failure" than choreography, and how is that fixed?', a: 'All sagas pass through one service. The fix: keep the orchestrator stateless with its state in a durable store (or in a workflow engine\'s replicated cluster), and run many instances. On a crash, another instance reads the state and resumes, as in the flow\'s "Orchestrator crash" scenario.' },
      ]},
      { type: 'quiz', questions: [
        { q: 'In 2PC, the coordinator crashed after PREPARE (after everyone voted YES) and before sending the decision. What do the participants do?', options: ['They commit on their own', 'They abort on their own', 'They stay in-doubt, holding their locks and waiting', 'Another coordinator decides at once'], answer: 2, explain: 'A YES vote is a promise that the participant will not decide alone. It does not know the others\' votes, so both commit and abort could be wrong. So it blocks: this is the blocking problem of 2PC.' },
        { q: 'In a saga, T3 failed (T1 and T2 had succeeded). What will run?', options: ['C3, C2, C1', 'C2, then C1', 'C1, then C2', 'A database rollback'], answer: 1, explain: 'Only the steps that succeeded are undone, in reverse order: C2 (refund) then C1 (cancel). T3 failed, so it left no effect.' },
        { q: 'What is the standard way to make sure "save the row in the DB" and "send the event to Kafka" never get out of sync?', options: ['Kafka first, then the DB', 'Transactional outbox: the event goes into an outbox table in the same DB transaction, then a relay/CDC publishes it', 'Put both in a try-catch', '2PC with Kafka'], answer: 1, explain: 'With an outbox the service writes to only one system (its own DB), atomically. The relay publishes later, at-least-once.' },
        { q: 'The Payment service received the same "PaymentCaptured" event twice. What is the right design?', options: ['Just set Kafka to exactly-once', 'Store the event ID in processed_events with a unique key, in one transaction with the work; skip on a duplicate', 'Check first, then mark separately', 'Duplicates cannot be ignored'], answer: 1, explain: 'An idempotent consumer: the check + the work are atomic. Checking and marking separately has a race condition.' },
        { q: 'In AWS Step Functions, which type fits a non-idempotent flow like a payment that runs for several minutes?', options: ['Express (async)', 'Standard', 'Express (sync)', 'Any of them'], answer: 1, explain: 'Standard: exactly-once execution, up to 1 year, 90 days of history. Express lasts at most 5 minutes, and async Express is at-least-once.' },
      ]},
      { type: 'sources', note: 'Version-specific facts (Postgres 2PC, Step Functions limits, Temporal retries, Stripe idempotency) were checked against these docs.', items: [
        { title: 'Sagas', publisher: 'SIGMOD 1987 paper (Garcia-Molina, Salem)', year: 1987, url: 'https://www.cs.cornell.edu/andru/cs711/2002fa/reading/sagas.pdf', used: 'Origin of the saga idea: a long transaction split into steps, each with a compensating transaction.' },
        { title: 'Pattern: Saga', publisher: 'microservices.io (Chris Richardson)', url: 'https://microservices.io/patterns/data/saga.html', used: 'Saga as a sequence of local transactions, compensating transactions, choreography vs orchestration, lack of isolation.' },
        { title: 'Saga design pattern', publisher: 'Microsoft Azure Architecture Center', official: true, url: 'https://learn.microsoft.com/en-us/azure/architecture/patterns/saga', used: 'Compensable, pivot and retryable transactions; anomalies (lost updates, dirty reads); countermeasures (semantic lock, commutative updates, pessimistic view, reread values); choreography vs orchestration pros/cons.' },
        { title: 'PREPARE TRANSACTION', publisher: 'PostgreSQL documentation', official: true, url: 'https://www.postgresql.org/docs/current/sql-prepare-transaction.html', used: 'Prepared transactions keep their locks, are meant for external transaction managers, should not be left around (VACUUM, wraparound), and the max_prepared_transactions = 0 recommendation.' },
        { title: 'Spanner: Google\'s Globally-Distributed Database', publisher: 'OSDI 2012 paper (Google)', year: 2012, url: 'https://static.googleusercontent.com/media/research.google.com/en//archive/spanner-osdi2012.pdf', used: 'Two-phase commit run over Paxos groups to reduce its availability problems.' },
        { title: 'Choosing workflow type in Step Functions', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/step-functions/latest/dg/choosing-workflow-type.html', used: 'Standard (1 year, exactly-once, 90-day history, .waitForTaskToken) vs Express (5 minutes, at-least-once async / at-most-once sync).' },
        { title: 'Temporal Workflows and Retry Policies', publisher: 'Temporal documentation', official: true, url: 'https://docs.temporal.io/workflows', used: 'Durable execution, event history replay, the determinism requirement, activities, durable timers; the default retry policy (1 s, 2.0, 100 s max interval, unlimited attempts) from docs.temporal.io/encyclopedia/retry-policies.' },
        { title: 'Saga Pattern Made Easy', publisher: 'Temporal blog', official: true, url: 'https://temporal.io/blog/saga-pattern-made-easy', used: 'Registering a compensation after each step and running them in reverse on failure.' },
        { title: 'Idempotent requests', publisher: 'Stripe API reference', official: true, url: 'https://docs.stripe.com/api/idempotent_requests', used: 'The same key returns the saved first result (even errors); keys can be removed after 24 hours.' },
        { title: 'Who we are', publisher: 'Temporal', official: true, url: 'https://temporal.io/about', used: 'Temporal\'s founders created Cadence at Uber.' },
      ]},
    ],
  });
})();
