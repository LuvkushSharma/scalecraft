Lesson.register({
  id: 'pattern-multistep',
  title: 'Multi-step processes',
  minutes: 28,
  summary: `Some work does not finish in one request: a creator payout has checks, a finance approval, a bank transfer and a notification, and hours or days can pass in between. In this lesson: explicit state machines (wrong transitions are rejected), sagas with compensation, choosing between orchestration and choreography, workflow engines (Temporal, Step Functions), timeouts and human steps.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Some work does not happen in one go. Sending money to a creator = run checks, sometimes get a person to approve it, send it to the bank, send an email.<br>These steps happen in different places, and hours or days can pass in between.<br>If a computer crashes in the middle, the bank is down, or a person is on leave, the work gets stuck half done.<br>In this lesson we climb a ladder: we start with one simple transaction, then a "state machine", then a saga (steps that undo things when something fails), and finally a workflow engine that carries on from the same place even after a crash.` },
    { type: 'h2', text: 'Problem: the payout script that died in the middle' },
    { type: 'p', html: `Every month, xyz.com sends creators their video earnings. The first version was a nightly <strong>cron script</strong> (cron = the server's alarm clock, which runs a program at a fixed time, like every night at 2 AM): work out the earnings, run KYC/tax checks, send the transfer to the bank, send an email. For the status, the table had a few boolean columns: <code>is_checked</code>, <code>is_approved</code>, <code>is_paid</code>, <code>is_failed</code>.` },
    { type: 'p', html: `Then three things happened:` },
    { type: 'list', items: [
      '<strong>The script crashed in the middle</strong> (new code was deployed, or memory ran out: OOM, out of memory). Some creators got their transfer, some did not. The next night the script sent money to <em>everyone</em> again, because <code>is_paid</code> was only set after the bank\'s answer arrived. Many creators got paid twice.',
      '<strong>Strange combinations:</strong> one row had both <code>is_paid = true</code> and <code>is_failed = true</code>. What does that mean? Did the money go or not? Nobody knows. 4 booleans = 16 combinations, and most of them make no sense.',
      '<strong>A human step:</strong> the finance team said "we will look at and approve any payout above ₹5 lakh". The cron script runs in one night; the approval arrives in 2 days. Where should the script stop, and when should it wake up?',
    ]},
    { type: 'p', html: `These are all forms of one problem: the work has <strong>many steps</strong>, the steps live in different systems (DB, bank, people), and <strong>anything can fail or pause</strong> in between. This is called a multi-step process. The e-commerce order lifecycle, the ride lifecycle, payments, onboarding, publishing a video: they are all this.` },
    { type: 'callout', tone: 'term', title: 'Multi-step process (workflow)', html: `<strong>What it is:</strong> a business task that happens in several steps, at different times, where each step depends on the result of the one before. It is also called a <strong>workflow</strong>. Like "order → payment → packing → delivery".<br><strong>Why we need to understand it:</strong> it has three enemies: a <strong>crash</strong> (it stopped in the middle), a <strong>duplicate</strong> (one step ran twice), and <strong>waiting</strong> (the bank or a person answers hours later).<br><strong>Without it (if we ignore it):</strong> double payouts, stuck orders, and nobody knows where the work stopped.` },
    { type: 'h2', text: 'The multi-step ladder: five steps' },
    { type: 'p', html: `The same rule as in the Contention lesson: <strong>start at the bottom</strong>, and climb up only when the lower step does not work.` },
    { type: 'ascii', caption: 'Read from the bottom up.', text: `  5  Workflow engine        Temporal / Step Functions: carries on after a crash,
     ^                         timers, retries, human steps, days/weeks
     ^  when: many steps + long waits + people + compensation
  4  Saga + compensation    every step has an "undo step" (refund, free the seat)
     ^  when: steps live in different services/systems, one transaction is impossible
  3  State machine + queue  every step is a queue job + a "sweeper" that finds
     +  sweeper              stuck rows and moves them on (resume after a crash)
     ^  when: steps are long/async, and you need to resume after a crash
  2  Explicit state machine one state column, transitions in one place, wrong ones rejected
     ^  when: the "condition" of the work lasts for hours/days
  1  One DB transaction     all steps inside one database: BEGIN ... COMMIT
     ^  when: everything is in one DB, milliseconds of work` },
    { type: 'h2', text: 'Step 1: everything in one DB? Just one transaction' },
    { type: 'p', html: `<strong>Story:</strong> a creator sends a ₹500 "Super Thanks" from their xyz.com wallet to another creator. Two jobs: −500 from Riya\'s wallet, +500 into Kabir\'s wallet. Both rows are in the same Postgres. No state machine or engine is needed here:` },
    { type: 'code', text: `BEGIN;
UPDATE wallets SET balance = balance - 500 WHERE user_id = 'riya' AND balance >= 500;  -- 1 row?
UPDATE wallets SET balance = balance + 500 WHERE user_id = 'kabir';
INSERT INTO transfers (from_user, to_user, amount) VALUES ('riya', 'kabir', 500);
COMMIT;   -- all three or none. A crash in the middle = the database does a ROLLBACK by itself` },
    { type: 'callout', tone: 'tip', title: 'Stop here if...', html: `...all the steps are in one database and finish in milliseconds. The roadmap rule: <strong>inside one database, use a normal transaction.</strong> The database itself handles crashes, duplicates and half-done work. Climb higher when some step is <em>outside the database</em> (bank API, email, another service) or there is a wait of hours. Depth: <a href="#/sql-vs-nosql">Databases (ACID)</a>, <a href="#/distributed-tx">Distributed transactions</a>.` },
    { type: 'h2', text: 'Step 2: Explicit state machine' },
    { type: 'p', html: `<strong>Story:</strong> a payout does not fit in a transaction: the bank is a separate company, and the finance approval takes 2 days. The "condition" of the work has to stay in the database for hours or days. The first version kept this condition in 4 booleans, and ~300 of 40,000 payouts got stuck in strange combinations. The first fix: turn the condition into a clear <strong>state machine</strong>.` },
    { type: 'callout', tone: 'term', title: 'State machine', html: `<strong>What it is:</strong> (a finite state machine) a list of three things: (1) <strong>states</strong>: the conditions something can be in, only one at a time; (2) <strong>events</strong>: what can happen ("the bank said success"); (3) <strong>transitions</strong>: in which state, which event moves you to which state. Any transition not on the list is <em>rejected</em>. Like a traffic light: from red it goes to green, then yellow; never from red straight to yellow.<br><strong>Why we need it:</strong> every payout has one clear condition, and wrong or duplicate events stop by themselves.<br><strong>Without it:</strong> a jungle of booleans, impossible conditions like "paid and also failed", double payouts.` },
    { type: 'p', html: `Instead of 4 booleans, one column: <code>state</code>. A payout can now be in only one of these conditions:` },
    { type: 'table', caption: 'Creator payout: the full transition table. Anything not in it is rejected.', head: ['From state', 'Event', 'To state', 'Condition (guard)'], rows: [
      ['PENDING', 'start', 'CHECKING', '-'],
      ['CHECKING', 'checks_passed', 'APPROVED', 'amount ≤ ₹5 lakh'],
      ['CHECKING', 'checks_passed', 'NEEDS_APPROVAL', 'amount > ₹5 lakh'],
      ['CHECKING', 'checks_failed', 'FAILED', '-'],
      ['NEEDS_APPROVAL', 'approve / reject', 'APPROVED / REJECTED', 'finance role only'],
      ['NEEDS_APPROVAL', 'timeout_48h', 'NEEDS_APPROVAL', 'same state, escalate to the finance head'],
      ['APPROVED', 'send', 'SENDING', '-'],
      ['SENDING', 'bank_ok / bank_failed', 'PAID / FAILED', '-'],
      ['FAILED', 'retry', 'CHECKING', 'attempts < 3'],
      ['PENDING, CHECKING, NEEDS_APPROVAL, APPROVED', 'cancel', 'CANCELLED', 'not after SENDING'],
    ]},
    { type: 'list', items: [
      '<strong>Terminal states</strong>: PAID, REJECTED, CANCELLED. There is no transition out of them. No matter how many duplicate events arrive, a PAID payout can never become SENDING again.',
      '<strong>Guards</strong>: some transitions only run under conditions. <code>checks_passed</code> looks at the amount and goes to APPROVED or NEEDS_APPROVAL. <code>retry</code> only works up to 3 attempts.',
      '<strong>A wrong transition = an error, not silence:</strong> <code>cancel</code> arrived during SENDING? Reject it (409 Conflict). The money is already on its way to the bank; "cancel" now means "refund/reversal", which is a separate process.',
      '<strong>History</strong>: every transition goes into an append-only (new rows are only added, old ones never change) <code>payout_events</code> table (when, who, which event). Support can answer "where is payout 77 stuck?" with one query.',
    ]},
    { type: 'p', html: `The most important trick: a transition is a <strong>conditional UPDATE</strong>, exactly like the compare-and-set of the <a href="#/pattern-contention">Contention lesson</a>. This way two workers or two duplicate webhooks can never do the same transition twice:` },
    { type: 'code', text: `-- event: bank_ok for payout 77
UPDATE payouts
   SET state = 'PAID', version = version + 1, updated_at = now()
 WHERE id = 77 AND state = 'SENDING';         -- only from the correct "from" state
-- 1 row  → the transition happened, now send the side effect (email)
-- 0 rows → either a duplicate (already PAID) or a wrong event: reject / ignore
INSERT INTO payout_events (payout_id, from_state, to_state, event, at)
VALUES (77, 'SENDING', 'PAID', 'bank_ok', now());    -- in the same transaction` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner mistake: "we already have a status column, so we have a state machine"', html: `Just having a <code>status</code> column is not a state machine. If code anywhere can write <code>UPDATE payouts SET status = 'PAID'</code> without checking the current state, you only have a string. You have a state machine when <strong>the transitions are defined in one place</strong>, every update checks the "from state", and wrong transitions are rejected.` },
    { type: 'h2', text: 'Try it yourself: the payout state machine' },
    { type: 'p', html: `Play with payout #77. The filled buttons are the valid events for the current state; also press the empty (ghost) buttons and see how the state machine rejects them. Try: (1) a ₹40,000 payout all the way to PAID; (2) the ₹8,00,000 one stops at NEEDS_APPROVAL, press <code>timeout_48h</code> there; (3) after PAID, press <code>bank_ok</code> again (a duplicate webhook) or <code>cancel</code>; (4) <code>cancel</code> during SENDING; (5) <code>bank_failed</code> and <code>retry</code> three times.` },
    { type: 'custom', render(el) {
      const LIMIT = 500000, MAXA = 3;
      const PRE = ['PENDING', 'CHECKING', 'NEEDS_APPROVAL', 'APPROVED'];
      const EV = {
        start: { from: ['PENDING'], dt: 1, to: () => 'CHECKING' },
        checks_passed: { from: ['CHECKING'], dt: 5, to: s => s.amount > LIMIT ? 'NEEDS_APPROVAL' : 'APPROVED' },
        checks_failed: { from: ['CHECKING'], dt: 5, to: () => 'FAILED' },
        approve: { from: ['NEEDS_APPROVAL'], dt: 1440, to: () => 'APPROVED' },
        reject: { from: ['NEEDS_APPROVAL'], dt: 1440, to: () => 'REJECTED' },
        timeout_48h: { from: ['NEEDS_APPROVAL'], dt: 2880, to: () => 'NEEDS_APPROVAL' },
        send: { from: ['APPROVED'], dt: 1, to: () => 'SENDING' },
        bank_ok: { from: ['SENDING'], dt: 120, to: () => 'PAID' },
        bank_failed: { from: ['SENDING'], dt: 120, to: () => 'FAILED' },
        retry: { from: ['FAILED'], dt: 60, to: () => 'CHECKING', guard: s => s.attempts < MAXA ? '' : 'attempts = ' + s.attempts + ', the limit of 3 is used up: a person will look at it' },
        cancel: { from: PRE, dt: 1, to: () => 'CANCELLED' },
      };
      const TERMINAL = ['PAID', 'REJECTED', 'CANCELLED'];
      const fresh = amount => ({ state: 'PENDING', amount, attempts: 0, version: 1, clock: 0, esc: 0, hist: [], rejected: 0 });
      function pmApply(s, ev) {
        const d = EV[ev];
        if (!d.from.includes(s.state)) {
          s.rejected++;
          const why = TERMINAL.includes(s.state) ? s.state + ' is a terminal state, there is no way out of it' : (ev === 'cancel' && s.state === 'SENDING') ? 'the money is already on its way to the bank; no cancel now, a reversal process is needed' : `"${ev}" is only allowed from ${d.from.join(' / ')}`;
          return { ok: false, msg: `409 Conflict: "${ev}" is not allowed in ${s.state}. ${why}.`, sql: `UPDATE payouts SET ... WHERE id = 77 AND state IN ('${d.from.join("','")}')\n→ 0 rows (the state is now ${s.state}). Nothing changed.` };
        }
        const g = d.guard ? d.guard(s) : '';
        if (g) { s.rejected++; return { ok: false, msg: `Rejected by guard: ${g}.`, sql: `-- guard failed, the UPDATE never ran` }; }
        const from = s.state, to = d.to(s);
        s.clock += d.dt; s.version++;
        if (ev === 'retry' || ev === 'start') s.attempts++;
        if (ev === 'timeout_48h') s.esc++;
        s.state = to;
        s.hist.push({ at: s.clock, from, to, ev });
        const extra = ev === 'timeout_48h' ? ' Same state, but an escalation went to the finance head (escalations = ' + s.esc + ').' : ev === 'checks_passed' ? (to === 'NEEDS_APPROVAL' ? ' Guard: the amount is above ₹5 lakh, so a person must approve it.' : ' Guard: the amount is up to ₹5 lakh, so straight to APPROVED.') : '';
        return { ok: true, msg: `OK: ${from} → ${to} (event "${ev}").${extra}`, sql: `UPDATE payouts SET state = '${to}', version = ${s.version}\n WHERE id = 77 AND state = '${from}';   → 1 row\nINSERT INTO payout_events VALUES (77, '${from}', '${to}', '${ev}', ...);` };
      }
      const POS = { PENDING: [70, 40], CHECKING: [225, 40], NEEDS_APPROVAL: [400, 40], REJECTED: [600, 40], APPROVED: [400, 135], SENDING: [600, 135], PAID: [600, 230], FAILED: [225, 230], CANCELLED: [70, 230] };
      const LINKS = [['PENDING', 'CHECKING', 'start'], ['CHECKING', 'NEEDS_APPROVAL', '> ₹5L'], ['NEEDS_APPROVAL', 'REJECTED', 'reject'], ['CHECKING', 'APPROVED', '≤ ₹5L'], ['NEEDS_APPROVAL', 'APPROVED', 'approve'], ['APPROVED', 'SENDING', 'send'], ['SENDING', 'PAID', 'bank_ok'], ['SENDING', 'FAILED', 'bank_failed'], ['CHECKING', 'FAILED', 'failed / retry', 1]];
      const NS = 'http://www.w3.org/2000/svg';
      el.innerHTML = `<div class="pm-amt" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px"><span style="font-size:14px;color:var(--ink-2)">Payout amount (this resets it):</span></div>
        <svg class="pm-svg" viewBox="0 0 700 262" style="width:100%;height:auto;display:block" role="img" aria-label="Payout state machine"></svg>
        <div style="font-size:13px;color:var(--ink-3);margin:2px 0 10px">Filled box = the current state. Green dashed border = where you can go next from here. CANCELLED: from any state before SENDING.</div>
        <div class="pm-evs" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <div class="pm-msg calc-note" style="font-weight:600"></div>
        <div class="stats">
          <div class="stat"><span>State (in the DB)</span><strong class="pm-st"></strong></div>
          <div class="stat"><span>version / attempts</span><strong class="pm-ver"></strong></div>
          <div class="stat"><span>Simulated clock</span><strong class="pm-clk"></strong></div>
          <div class="stat"><span>Rejected events</span><strong class="pm-rej"></strong></div>
        </div>
        <pre class="pm-sql" style="font:13px/1.45 var(--f-mono);background:var(--surface-2);color:var(--ink);border-radius:var(--r-sm);padding:10px 12px;margin-top:12px;white-space:pre-wrap;overflow-wrap:anywhere"></pre>
        <div style="font-size:13px;color:var(--ink-3);margin-top:8px">payout_events (append-only history):</div>
        <ol class="pm-hist" style="font:13px/1.5 var(--f-mono);color:var(--ink-2);margin:4px 0 0;padding-left:22px"></ol>`;
      const $ = s => el.querySelector(s);
      const svg = $('.pm-svg');
      const mkS = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); (parent || svg).appendChild(e); return e; };
      const defs = mkS('defs', {});
      const mk = mkS('marker', { id: 'pm-arw', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
      mkS('path', { d: 'M1 1L9 5L1 9', fill: 'none', stroke: 'var(--ink-3)', 'stroke-width': 1.6 }, mk);
      const BW = 124, BH = 34;
      const clip = (a, b) => { const [x1, y1] = a, [x2, y2] = b, dx = x2 - x1, dy = y2 - y1; const t = Math.min(dx ? (BW / 2 + 3) / Math.abs(dx) : 9, dy ? (BH / 2 + 3) / Math.abs(dy) : 9); return [x1 + dx * t, y1 + dy * t]; };
      LINKS.forEach(([a, b, lab, both]) => {
        const p = clip(POS[a], POS[b]), q = clip(POS[b], POS[a]);
        const at = { x1: p[0], y1: p[1], x2: q[0], y2: q[1], stroke: 'var(--line-2)', 'stroke-width': 1.5, 'marker-end': 'url(#pm-arw)' };
        if (both) at['marker-start'] = 'url(#pm-arw)';
        mkS('line', at);
        const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
        const tx = mkS('text', { x: mx + (a === b ? 0 : (POS[a][0] === POS[b][0] ? 6 : 0)), y: my - 5, 'font-size': 11, fill: 'var(--ink-3)', 'text-anchor': POS[a][0] === POS[b][0] ? 'start' : 'middle', 'font-family': 'var(--f-mono)' });
        tx.textContent = lab;
      });
      const box = {};
      Object.keys(POS).forEach(k => {
        const [x, y] = POS[k];
        const r = mkS('rect', { x: x - BW / 2, y: y - BH / 2, width: BW, height: BH, rx: 8, fill: 'var(--surface-2)', stroke: 'var(--line-2)', 'stroke-width': 1.5 });
        const t = mkS('text', { x, y: y + 4, 'font-size': 12.5, 'text-anchor': 'middle', fill: 'var(--ink)', 'font-family': 'var(--f-mono)' });
        t.textContent = k + (TERMINAL.includes(k) ? ' ■' : '');
        box[k] = r;
      });
      let s = fresh(40000);
      const fmtClock = m => { const t = m + 600, d = Math.floor(t / 1440) + 1, h = Math.floor(t % 1440 / 60), mi = t % 60; return `Day ${d}, ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`; };
      const amts = [[40000, '₹40,000'], [800000, '₹8,00,000']];
      const amtBox = $('.pm-amt');
      amts.forEach(([v, l]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = l; b.dataset.v = v; b.onclick = () => { s = fresh(v); last = { ok: true, msg: 'New payout #77 created: PENDING. Press events.', sql: `INSERT INTO payouts (id, state, amount, version) VALUES (77, 'PENDING', ${v}, 1);` }; draw(); }; amtBox.appendChild(b); });
      const evBox = $('.pm-evs');
      Object.keys(EV).forEach(k => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small'; b.textContent = k; b.dataset.ev = k; b.onclick = () => { last = pmApply(s, k); draw(); }; evBox.appendChild(b); });
      let last = { ok: true, msg: 'Payout #77 is in PENDING. Press any event, even wrong ones: see what gets rejected.', sql: `INSERT INTO payouts (id, state, amount, version) VALUES (77, 'PENDING', 40000, 1);` };
      function draw() {
        const nexts = new Set();
        Object.keys(EV).forEach(k => { if (EV[k].from.includes(s.state) && !(EV[k].guard && EV[k].guard(s))) nexts.add(EV[k].to(s)); });
        Object.keys(box).forEach(k => {
          const cur = k === s.state;
          box[k].setAttribute('fill', cur ? 'var(--accent-soft)' : 'var(--surface-2)');
          box[k].setAttribute('stroke', cur ? 'var(--accent)' : nexts.has(k) ? 'var(--green)' : 'var(--line-2)');
          box[k].setAttribute('stroke-width', cur ? 2.5 : 1.5);
          box[k].setAttribute('stroke-dasharray', !cur && nexts.has(k) ? '5 3' : '');
        });
        evBox.querySelectorAll('button').forEach(b => { const d = EV[b.dataset.ev]; b.className = 'btn small ' + (d.from.includes(s.state) ? 'primary' : 'ghost'); });
        amtBox.querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.v === s.amount));
        $('.pm-msg').textContent = last.msg;
        $('.pm-msg').style.color = last.ok ? 'var(--green)' : 'var(--red)';
        $('.pm-st').textContent = s.state;
        $('.pm-ver').textContent = s.version + ' / ' + s.attempts;
        $('.pm-clk').textContent = fmtClock(s.clock);
        $('.pm-rej').textContent = s.rejected;
        $('.pm-sql').textContent = last.sql;
        $('.pm-hist').innerHTML = s.hist.length ? s.hist.map(h => `<li>${fmtClock(h.at)}  ${h.from} → ${h.to}  (${h.ev})</li>`).join('') : '<li>(empty for now)</li>';
      }
      draw();
    }},
    { type: 'p', html: `Notice: in FAILED, after 3 attempts even <code>retry</code> is rejected. This is not a bug, it is the design: the machine now gives up and puts the payout into an <strong>ops queue</strong> where a person will look at it. Every state machine needs a "stuck, call a person" path.` },
    { type: 'callout', tone: 'tip', title: 'Stop here if...', html: `...every step is small and happens inside one request (one transition per user click), and you do not need "carry on from the same place" after a crash (the user will just click again). Order status, ticket status, moderation status: a state column + a conditional UPDATE is enough for these. Climb higher when the steps are long, run in the background, and someone else must move them forward after a crash. Depth: <a href="#/pattern-contention">Contention (conditional UPDATE)</a>.` },
    { type: 'h2', text: 'Step 3: State machine + queue workers + sweeper' },
    { type: 'p', html: `<strong>Story:</strong> the state machine now says <em>what is allowed</em>. But who runs the steps? Before, everything was in one cron script, which forgot everything when it crashed. Now xyz.com turns every step into a <a href="#/queues">queue</a> job: "run the checks for payout 77", "send payout 77 to the bank". Workers pick up the jobs, do the step, change the state, and add the next job. One night, ~120 of 40,000 payouts stopped in the middle because of a crash. Who will wake them up?` },
    { type: 'callout', tone: 'term', title: 'Sweeper job', html: `<strong>What it is:</strong> a small scheduled job (say every 10 minutes) that looks in the DB for rows that have been stuck in a middle state for too long. Like "SENDING for more than 2 hours". For those, it puts the next step back into the queue, or rings an alarm.<br><strong>Why we need it:</strong> if a worker crashes, the queue message may be lost or end up in the DLQ. The state is in the DB, so the sweeper can <strong>resume</strong> the work from right there.<br><strong>Without it:</strong> stuck payouts quietly sit there until a creator complains.` },
    { type: 'callout', tone: 'term', title: 'Idempotency key', html: `<strong>What it is:</strong> a unique name sent with every request (like <code>payout-77-2026-09</code>). The receiver (the bank) remembers that this key has already arrived, and if it comes again, it does not do the work again; it just returns the old result.<br><strong>Why we need it:</strong> resuming means "running a step again". If last time the money went to the bank but we never got the answer, sending it again = a double payout.<br><strong>Without it:</strong> every crash + retry is a second transfer. The full story is in the <a href="#/pagination-idempotency">Idempotency lesson</a>.` },
    { type: 'code', text: `-- sweeper, every 10 minutes
SELECT id, state FROM payouts
 WHERE state IN ('CHECKING', 'SENDING') AND updated_at < now() - interval '2 hours';
-- for each row: put the step for that state back into the queue
--   CHECKING → enqueue(run_checks, id)
--   SENDING  → enqueue(send_transfer, id)   -- with the same idempotency key!` },
    { type: 'callout', tone: 'tip', title: 'Stop here if...', html: `...there are 2-4 steps, they belong to one team/service, no step outside the database needs to be "undone" when something fails, and there is no long human wait. This is enough for publishing a video (upload → transcode → ready). But notice: you wrote the retries, backoff, timers, sweeper and monitoring yourself. When that code starts to grow, or when a failure in one step means earlier steps must be undone, climb higher. Depth: <a href="#/queues">Message queues</a>, <a href="#/pattern-long-tasks">Long-running tasks</a>.` },
    { type: 'h2', text: 'Step 4: Saga + compensation' },
    { type: 'p', html: `<strong>Story:</strong> xyz.com sells tickets for a creator meetup. Three services, three databases: (1) the Seats service holds a seat, (2) the Payments service charges ₹999, (3) the Tickets service creates a QR ticket. One day the Tickets service was down for 20 minutes. 340 people were charged and had a seat on hold, but got no ticket. One <code>BEGIN ... COMMIT</code> cannot run across three separate databases. What we need: "if we cannot move forward, <strong>undo</strong> the earlier steps".` },
    { type: 'callout', tone: 'term', title: 'Saga', html: `<strong>What it is:</strong> a long task that is a line of small local transactions (each service runs its own transaction in its own DB). Each step comes with a <strong>compensation</strong> (an undo step). If a step fails, the compensations of the steps done so far run in reverse order.<br><strong>Why we need it:</strong> when steps live in different services/databases, one big transaction is impossible. A saga builds "all or nothing" step by step.<br><strong>Without it:</strong> half-done work: money charged but no ticket; a seat on hold that is never released.` },
    { type: 'callout', tone: 'term', title: 'Compensation (undo step)', html: `<strong>What it is:</strong> taking back a finished step in a business way. The compensation for a payment = a refund. For a seat hold = releasing the seat. For an email? It cannot be undone, so you send another email: "sorry, your ticket is cancelled".<br><strong>Why we need it:</strong> a database ROLLBACK only works inside that database. What already happened at the bank or in another service can only be fixed by a new, opposite action.<br><strong>Without it:</strong> after a failure the system is left in a wrong state.<br><strong>Careful:</strong> a compensation can fail too, so it must also be retried and idempotent.` },
    { type: 'ascii', caption: 'Meetup ticket saga: step 3 failed, so the compensations run in reverse order', text: `forward →  1. hold seat A12      2. charge ₹999        3. issue ticket  ✗ (down)
undo    ←  1'. release seat A12  2'. refund ₹999       (3 never happened)
result:    the seat is free for everyone, Riya gets her money back, and a clear message` },
    { type: 'callout', tone: 'term', title: 'Orchestration vs choreography', html: `<strong>What it is:</strong> two ways to run the steps of a saga. <strong>Orchestration</strong> = one "conductor" (orchestrator) service calls each step and decides what comes next. <strong>Choreography</strong> = no conductor; each service listens for an event ("SeatHeld"), does its work, and sends out a new event ("PaymentDone").<br><strong>Why we need it:</strong> if the flow is short and the teams are separate, choreography is lighter. If the flow is long, with compensations and timeouts, an orchestrator written in one place is easier to understand and debug.<br><strong>Without it (the wrong choice):</strong> in choreography a big flow gets scattered across many services, and nobody can say "where is the ticket stuck?".` },
    { type: 'callout', tone: 'term', title: 'Transactional outbox', html: `<strong>What it is:</strong> a service changes its state in its DB <em>and</em>, in the same transaction, writes a row for the event into an "outbox" table. A separate relay process reads events from the outbox and sends them to Kafka/a queue.<br><strong>Why we need it:</strong> "DB update + send event" are two separate systems. If the DB update happened and it crashed before sending the event = the next step never starts.<br><strong>Without it:</strong> a choreography saga quietly breaks in the middle. Details in <a href="#/distributed-tx">Distributed transactions</a>.` },
    { type: 'h3', text: 'Who will run the saga? Three ways' },
    { type: 'p', html: `The state machine says <em>what is allowed</em>. But someone has to run the steps: the API call for the checks, the 48 hour wait, 5 retries to the bank, starting again from the same place after a crash. There are three common ways. The deeper theory of sagas and compensation is in the <a href="#/distributed-tx">Sagas and distributed transactions</a> lesson; here we only talk about the choice:` },
    { type: 'table', head: ['Way', 'How it runs', 'Good when', 'Problem'], rows: [
      ['DB state machine + workers + sweeper', 'A state table, every step is a queue job, and a cron "sweeper" that finds stuck rows (like SENDING for 2 hours)', '2-4 steps, one team, no long waits', 'You write retries, timers, resume and monitoring yourself; complexity slowly grows'],
      ['Choreography (events)', 'No boss. Each service listens for an event, does its work and sends out a new event (Kafka)', 'Separate teams, loosely coupled, a simple and straight flow', 'The full flow is not written in any one place; hard to find "where is payout 77 stuck?"; risk of events going round in circles'],
      ['Orchestration (workflow engine)', 'One orchestrator code/definition calls the steps; the engine keeps the state, retries and timers durable', 'Many steps, retries, timeouts, human steps, flows lasting days/weeks', 'New infrastructure to learn/run; rules for workflow code (determinism, versioning)'],
    ]},
    { type: 'callout', tone: 'tip', title: 'Stop here if...', html: `...the saga has 2-3 steps and the compensation is simple. A small orchestrator (or choreography + outbox) with your own DB state machine is enough. Climb higher when: there are 5+ steps, timers of days/weeks, human steps, and the code for retries, timeouts and compensations of each step has grown bigger than your business logic. Depth: <a href="#/distributed-tx">Sagas and distributed transactions</a>, <a href="#/kafka">Kafka</a>.` },
    { type: 'h2', text: 'Step 5: Workflow engine (durable execution)' },
    { type: 'callout', tone: 'term', title: 'Workflow engine (durable execution)', html: `<strong>What it is:</strong> a service that keeps the state of your multi-step process in a durable store (one that is not lost even in a crash). You write it like normal code: "run the checks, then if the amount is big, wait 48 hours for approval, then send it to the bank". The engine records the result of every step. If a worker machine crashes, another machine carries on from the same place. Two well-known names: <strong>Temporal</strong> (open source; the workflow is normal code: Go, Java, Python, TypeScript...) and <strong>AWS Step Functions</strong> (managed; the workflow is a JSON state machine, in the Amazon States Language).<br><strong>Why we need it:</strong> the retries, timers, sweeper and resume that you wrote yourself in steps 3-4 are given to you by the engine.<br><strong>Without it:</strong> every team writes its own half-finished "mini engine", each with different bugs.` },
    { type: 'callout', tone: 'term', title: 'Activity, signal, durable timer', html: `<strong>What it is:</strong> three Temporal words. An <strong>activity</strong> = a step that touches the outside world (DB write, bank call, email); the engine retries it. A <strong>signal</strong> = a message sent from outside to a running workflow, like finance\'s "approve". A <strong>durable timer</strong> = "wake me up after 48 hours", written in the engine\'s history, not in some machine\'s memory.<br><strong>Why we need it:</strong> this is how a workflow can pause for days without keeping any thread awake, and how a person\'s answer reaches the right workflow.<br><strong>Without it:</strong> a thread doing sleep(48 hours), which dies at the first restart.` },
    { type: 'callout', tone: 'term', title: 'Event history and replay', html: `<strong>What it is:</strong> the engine keeps a diary for every workflow: "the checks activity was scheduled, the result was OK, a timer was set...". A new worker runs the workflow code from the start, but takes the result of every finished step from the diary (it does not run them again). This is called <strong>replay</strong>.<br><strong>Why we need it:</strong> this is what makes "carry on from the same place" possible after a crash.<br><strong>Condition:</strong> the workflow code must be <strong>deterministic</strong> (always the same decisions for the same history): no random numbers, no current time, and no direct network calls in workflow code; those go only in activities.` },
    { type: 'p', html: `xyz.com moves payouts to Temporal. Now see how it handles a crash, a wait for a person, and the bank being down:` },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'api', label: 'Payout API', sub: 'monthly job', x: 95, y: 80, w: 140, kind: 'server', info: 'What it is: the service that starts the monthly payout. It starts one workflow for each creator, Workflow ID = "payout-77-2026-09". Temporal does not let a second workflow with the same ID start while the first is running, so even if the job runs twice, no duplicate payout workflow is created.' },
        { id: 'eng', label: 'Temporal', sub: 'event history', x: 340, y: 80, w: 150, kind: 'data', info: 'What it is: the workflow engine\'s server. It keeps the event history of every workflow in a durable DB: which activity was scheduled, what the result was, which timer was set, which signal arrived. It does not do the work itself; it gives tasks to workers and records their answers.' },
        { id: 'wk', label: 'Worker', sub: 'workflow + activities', x: 340, y: 250, w: 170, kind: 'server', meter: true, load: 30, info: 'What it is: the machine(s) that run your code. Workflow code makes decisions (deterministic); activities do the real side effects (DB, bank API). If a worker dies, the engine gives the work to another worker.' },
        { id: 'led', label: 'Ledger DB', sub: 'payouts + state', x: 605, y: 250, w: 150, kind: 'data', info: 'What it is: xyz.com\'s record of money (the ledger) and the payout state table. Activities write transitions here (with a conditional UPDATE), so the state is also visible in the DB for support and reports.' },
        { id: 'bank', label: 'Bank API', sub: 'transfer', x: 605, y: 80, w: 150, kind: 'net', info: 'What it is: the outside bank/payout partner. Every transfer request carries an idempotency key (the payout id), so a retry never sends the money twice. Sometimes it is down or slow.' },
        { id: 'fin', label: 'Finance team', sub: 'approve / reject', x: 95, y: 250, w: 140, kind: 'client', info: 'What it is: the human step. They approve/reject payouts above ₹5 lakh on a dashboard. Their click reaches the workflow as a signal.' },
      ],
      edges: [{ a: 'api', b: 'eng' }, { a: 'eng', b: 'wk' }, { a: 'wk', b: 'led' }, { a: 'wk', b: 'bank' }, { a: 'fin', b: 'eng' }],
      scenarios: [
        { name: 'Happy path', intro: 'A ₹40,000 payout, no approval needed.', steps: [
          { title: 'Workflow start', text: 'The API started the workflow. The engine writes the first event in the history.', go: ['api>eng', 'res:eng>api'], after: { eng: { sub: 'payout-77: started' } }, msg: 'StartWorkflow(id="payout-77-2026-09", amount=40000)' },
          { title: 'Checks activity', text: 'A worker picks up the task, runs the KYC/tax checks, and moves the ledger from CHECKING → APPROVED. The result goes into the engine\'s history.', go: ['eng>wk', 'wk>led', 'res:led>wk', 'res:wk>eng'], after: { led: { sub: 'state = APPROVED' } } },
          { title: 'Bank transfer', text: 'The transfer activity sends it to the bank, with idempotency key = payout id. The bank says OK.', go: ['eng>wk', 'wk>bank', 'res:bank>wk'], after: { led: { sub: 'state = SENDING' } }, msg: 'POST /transfers  Idempotency-Key: payout-77-2026-09' },
          { title: 'PAID, workflow complete', text: 'In the ledger SENDING → PAID, an email to the creator, and "completed" in the workflow history.', go: ['wk>led', 'res:wk>eng'], after: { led: { state: 'ok', sub: 'state = PAID' }, eng: { state: 'ok', sub: 'payout-77: done' } } },
        ]},
        { name: 'Worker crash', intro: 'The worker machine died right after sending the transfer.', steps: [
          { title: 'Transfer sent, no answer', text: 'The worker sent the request to the bank. The bank sent the money. But the worker crashed before the result reached the engine.', go: ['eng>wk', 'wk>bank', 'res:bank>wk'], after: { wk: { state: 'down', sub: 'CRASHED' } } },
          { title: 'The engine finds out', text: 'The activity\'s <strong>Start-To-Close timeout</strong> (say 30 s) passed and no result came. The engine assumes the attempt failed and schedules the activity again, following the retry policy.', focus: ['eng'], set: { eng: { state: 'warn', sub: 'activity timed out' } } },
          { title: 'New worker, replay', text: 'Another worker replays the workflow history: the checks were already done (the result comes from the history, they do not run again). Only the transfer activity runs again.', set: { wk: { state: '', sub: 'worker-2 (replay)' } }, go: ['eng>wk', 'wk>bank'], msg: 'POST /transfers  Idempotency-Key: payout-77-2026-09   (same key!)' },
          { title: 'Idempotency saves us', text: 'The bank recognises the key: "this transfer is already done", returns the old result, and the money is not sent again. The engine handles "when and how many times"; "no harm if it runs again" is the activity\'s job.', go: ['res:bank>wk', 'wk>led', 'res:wk>eng'], after: { eng: { state: 'ok', sub: 'payout-77: done' }, led: { state: 'ok', sub: 'state = PAID (once)' } } },
        ]},
        { name: 'Approval + timeout', intro: 'A ₹8 lakh payout: needs finance approval.', steps: [
          { title: 'The workflow pauses and waits', text: 'After the checks, the workflow waits for "an approve/reject signal or 48 hours, whichever comes first". This is a durable timer: no thread sits there for 48 hours, there is just one timer event in the history.', go: ['eng>wk', 'wk>led', 'res:wk>eng'], after: { led: { sub: 'NEEDS_APPROVAL' }, eng: { sub: 'timer 48h + signal' }, wk: { load: 5 } }, msg: 'await condition(() => decision != null, "48h")' },
          { title: 'Two days, no answer', text: 'The timer fired. The workflow runs an escalation activity: mail/Slack to the finance head. Then it waits another 48 hours. Without a timeout, this payout would silently be stuck forever.', set: { eng: { state: 'warn', sub: 'timer: escalate' } }, go: ['eng>wk'], msg: 'activity: notifyFinanceHead(payout-77)' },
          { title: 'Finance approves', text: 'The finance head presses Approve on the dashboard. This sends a <strong>signal</strong> to the workflow. Even if it is clicked twice, the workflow takes the first decision; the state machine ignores the second.', go: ['fin>eng', 'eng>wk'], after: { eng: { state: '', sub: 'signal: approve' }, fin: { state: 'ok', sub: 'approved' } }, msg: 'SignalWorkflow("payout-77-2026-09", "decision", "approve")' },
          { title: 'Move on', text: 'The workflow carries on from there: the transfer activity, PAID. One piece of code holds both a person\'s 2 day step and the machine\'s millisecond steps.', go: ['wk>bank', 'res:bank>wk', 'wk>led'], after: { led: { state: 'ok', sub: 'state = PAID' } } },
        ]},
        { name: 'Bank down', intro: 'The bank API is down for 3 hours.', steps: [
          { title: 'Transfer fails', text: 'The bank returns 503. The activity fails.', go: ['eng>wk', 'wk>bank', 'bad:bank>wk'], set: { bank: { state: 'down', sub: '503' } } },
          { title: 'Retry with backoff', text: 'The engine runs the activity again following the retry policy: 1 s, 2 s, 4 s... doubling each time, with a max gap of 100 s (Temporal\'s default). You did not write any retry loop.', set: { eng: { state: 'warn', sub: 'retry #6 in 32s' } }, go: ['eng>wk', 'wk>bank', 'bad:bank>wk'] },
          { title: 'Total limit: Schedule-To-Close', text: 'Retries do not go on forever: this activity has a total time limit of 6 hours (Schedule-To-Close). The bank came back in 3 hours, and the next retry passed.', set: { bank: { state: '', sub: 'back up' } }, go: ['wk>bank', 'res:bank>wk', 'wk>led'], after: { led: { state: 'ok', sub: 'state = PAID' }, eng: { state: 'ok', sub: 'payout-77: done' } } },
          { title: 'If the limit were crossed', text: 'Then the activity finally fails, and the workflow\'s catch block runs: FAILED in the ledger, the reserved money goes back to the creator\'s balance (compensation), and the ops team gets an alert. Every path ends in a clear state.', focus: ['wk', 'led'] },
        ]},
      ],
    },
    { type: 'h2', text: 'Crash it and see: script vs sweeper vs engine' },
    { type: 'p', html: `One payout saga: (1) <strong>reserve</strong> ₹40,000 from the creator\'s balance, (2) checks, (3) bank transfer, (4) PAID + email. Pick one of three ways, pick the moment of the crash, and see what happens. Try: "Cron script" + "crash after the bank" + idempotency OFF. Then "Workflow engine" + "Bank: account closed".` },
    { type: 'custom', render(el) {
      const REC = { script: 86400, sweeper: 7800, engine: 30 };
      function msSim(mode, crash, rej, idem) {
        const log = []; let t = 0, transfers = 0, reserves = 0, comp = false, fin = '', bankDone = false, crashed = false;
        const save = st => { if (mode !== 'script') log.push([t, `state = ${st} (saved in the DB / history)`]); };
        const run = from => {
          for (let k = from; k <= 4; k++) {
            if (k === 1) { reserves++; t += 1; log.push([t, 'Step 1: reserve ₹40,000 from the balance']); save('RESERVED'); if (crash === 'after1' && !crashed) { crashed = true; log.push([t, 'CRASH! the worker died']); return 'crash'; } }
            if (k === 2) { t += 5; log.push([t, 'Step 2: checks OK']); save('CHECKED'); }
            if (k === 3) {
              t += 2;
              if (rej) { log.push([t, 'Step 3: the bank refused: account closed (a permanent error, retrying is useless)']); return 'reject'; }
              if (idem && bankDone) log.push([t, 'Step 3: the bank recognised the key: "already done", the money was NOT sent again']);
              else { transfers++; bankDone = true; log.push([t, `Step 3: the bank sent ₹40,000 (transfer #${transfers})` + (idem ? ' key = payout-77' : ' no key')]); }
              if (crash === 'mid3' && !crashed) { crashed = true; log.push([t, 'CRASH! the money went, but the worker died before the result was saved']); return 'crash'; }
              save('SENT');
            }
            if (k === 4) { t += 1; log.push([t, 'Step 4: PAID + email to the creator']); fin = 'PAID'; return 'done'; }
          }
        };
        let r = run(1);
        if (r === 'crash') {
          t += REC[mode];
          const from = mode === 'script' ? 1 : crash === 'after1' ? 2 : 3;
          log.push([t, mode === 'script' ? 'The script ran again the next night: it remembers nothing, everything again from step 1' : mode === 'sweeper' ? 'The sweeper saw the stuck row (2 hours old): carry on from step ' + from : 'Engine: activity timeout (30 s), replay on a new worker: carry on from step ' + from]);
          r = run(from);
        }
        if (r === 'reject') {
          if (mode === 'script') { fin = 'unknown (only an error log)'; log.push([t, 'The script logged an error and moved on. The reserve was never given back.']); }
          else { comp = true; t += 1; log.push([t, 'Compensation: the reserve goes back to the creator\'s balance']); fin = 'FAILED (money back)'; log.push([t, 'state = FAILED, alert to ops']); }
        }
        return { log, transfers, reserves, comp, fin, t };
      }
      el.innerHTML = `<div class="ms-row" data-k="mode" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px"></div>
        <div class="ms-row" data-k="crash" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px"></div>
        <div class="ms-row" data-k="rej" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px"></div>
        <div class="ms-row" data-k="idem" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px"></div>
        <div class="stats">
          <div class="stat"><span>Times the bank sent money</span><strong class="ms-tr"></strong></div>
          <div class="stat"><span>Times reserved from the balance</span><strong class="ms-rs"></strong></div>
          <div class="stat"><span>Final state</span><strong class="ms-fin"></strong></div>
          <div class="stat"><span>Time to finish</span><strong class="ms-t"></strong></div>
        </div>
        <ol class="ms-log" style="font:13px/1.5 var(--f-mono);color:var(--ink-2);margin:10px 0 0;padding-left:22px"></ol>
        <div class="calc-note ms-note"></div>`;
      const OPT = {
        mode: [['script', 'Cron script (no state)'], ['sweeper', 'State machine + sweeper'], ['engine', 'Workflow engine']],
        crash: [['none', 'No crash'], ['after1', 'Crash after step 1'], ['mid3', 'Crash after the bank']],
        rej: [[false, 'Bank: OK'], [true, 'Bank: account closed']],
        idem: [[true, 'Idempotency key: ON'], [false, 'Idempotency key: OFF']],
      };
      const st = { mode: 'script', crash: 'mid3', rej: false, idem: false };
      const $ = q => el.querySelector(q);
      const dur = x => x < 120 ? x + ' s' : x < 86400 ? Math.floor(x / 3600) + ' h ' + Math.round(x % 3600 / 60) + ' min' : (x / 86400).toFixed(1) + ' days';
      el.querySelectorAll('.ms-row').forEach(row => OPT[row.dataset.k].forEach(([v, name]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = name; b.onclick = () => { st[row.dataset.k] = v; upd(); }; b._v = v; row.appendChild(b); }));
      const upd = () => {
        el.querySelectorAll('.ms-row').forEach(row => row.querySelectorAll('button').forEach(b => b.classList.toggle('on', b._v === st[row.dataset.k])));
        const r = msSim(st.mode, st.crash, st.rej, st.idem);
        $('.ms-tr').textContent = r.transfers; $('.ms-tr').style.color = r.transfers > 1 ? 'var(--red)' : '';
        $('.ms-rs').textContent = r.reserves; $('.ms-rs').style.color = r.reserves > 1 ? 'var(--red)' : '';
        $('.ms-fin').textContent = r.fin; $('.ms-t').textContent = dur(r.t);
        $('.ms-log').innerHTML = r.log.map(([x, m]) => `<li>t=${dur(x)}: ${m}</li>`).join('');
        const n = [];
        if (r.transfers > 1) n.push(`<strong>Double payout!</strong> It crashed after the bank, and when it ran again the bank did not know this was the same transfer. Turn the idempotency key ON and try again.`);
        if (r.reserves > 1) n.push(`The script remembered nothing, so the money was <strong>reserved twice</strong> from the balance. The creator\'s balance is wrong. Pick a way that saves the state.`);
        if (st.rej && !r.comp) n.push(`The bank refused, and the script only wrote an error. ₹40,000 is <strong>stuck in the reserve forever</strong>. This is exactly the job of a saga\'s compensation.`);
        if (r.comp) n.push(`The bank refused, so the compensation ran: the reserve went back to the balance, state FAILED, alert to ops. A clean ending.`);
        if (!n.length) n.push(`All correct: one transfer, one reserve, PAID. ` + (st.crash !== 'none' ? `After the crash it resumed from the same place in ${dur(REC[st.mode])}.` : ''));
        $('.ms-note').innerHTML = n.join(' ');
      };
      upd();
    }},
    { type: 'callout', tone: 'tip', title: 'Stop here (this is the top step)', html: `A workflow engine is the top step of the ladder, and also the most expensive: new infrastructure, new rules (deterministic code, versioning of running workflows). Bring it in only when the code you wrote yourself on the lower steps (retries, timers, sweeper, compensations) has become a headache for your team. For a small 3-step flow, an engine is far too much tool for the job. Depth: <a href="#/distributed-tx">Sagas</a>, <a href="#/pattern-long-tasks">Long-running tasks</a>, <a href="#/design-payments">Payments design</a>.` },
    { type: 'h2', text: 'Timeouts: every wait has a deadline' },
    { type: 'p', html: `The most hidden bug in a multi-step process: some step <strong>never finishes at all</strong>. The bank did not answer, a webhook was lost, the reviewer is on leave. There is no error, just a row that sits in "SENDING" forever. So the rule is: <strong>every wait state has a timeout, and what to do on timeout is also part of the state machine</strong>.` },
    { type: 'table', head: ['Timeout for what', 'Example', 'What to do on timeout'], rows: [
      ['One attempt (Temporal: Start-To-Close)', 'The bank API call answers within 30 s', 'Count the attempt as failed, retry with backoff'],
      ['The whole step, all retries together (Schedule-To-Close)', 'The transfer is done within 6 hours', 'The step fails: compensation or FAILED + ops alert'],
      ['Is the worker alive? (Heartbeat timeout)', 'A long job says "I am alive" every 10 s', 'Find out quickly that the worker died, give the job to another'],
      ['An outside event (webhook: an outside service calling our server)', 'The bank\'s confirmation webhook arrives within 2 hours', 'Ask the bank for the status yourself (reconciliation), then decide'],
      ['A human step', 'Finance approves within 48 hours', 'Escalate, or a default action (auto-reject / auto-cancel)'],
      ['A user step', 'Payment within 10 minutes of a seat hold', 'The hold expires, the seat goes back (Contention lesson)'],
    ]},
    { type: 'callout', tone: 'warn', title: 'Do not blindly trust webhooks', html: `Outside systems (bank, payment gateway) can send webhooks <strong>late, twice, or in the wrong order</strong>, or not at all. So: (1) every webhook goes through the state machine (wrong/duplicate ones are rejected); (2) on timeout, ask the status API yourself; (3) run a daily <strong>reconciliation</strong> job (compare your records with the bank\'s statement and fix any difference).` },

    { type: 'h2', text: 'Human steps (human-in-the-loop)' },
    { type: 'p', html: `Approval, manual KYC review, content moderation, fraud checks: these steps can take from minutes to days. To connect them properly:` },
    { type: 'list', items: [
      '<strong>The workflow waits, not a thread:</strong> the state in the DB/engine is "NEEDS_APPROVAL", and no process has been sitting awake for 2 days. In Temporal this is a <em>signal</em> + a durable timer. In Step Functions (Standard) it is <code>.waitForTaskToken</code>: the workflow pauses with a token, and the reviewer\'s app sends <code>SendTaskSuccess</code>/<code>SendTaskFailure</code> with that token.',
      '<strong>Task inbox:</strong> a list/dashboard for the reviewer ("12 payouts waiting for approval"), with context (amount, creator history, risk flags). Giving a person an approve button without context = a rubber stamp.',
      '<strong>The decision is an event too:</strong> approve/reject goes through the state machine. A double click, two reviewers at once, or a payout that was already cancelled: all are caught by the "from state" check.',
      '<strong>Audit:</strong> who approved, when, and why, in the history table. For money, this is a compliance requirement.',
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common beginner mistake: "we have a workflow engine, so we do not need idempotency"', html: `The engine runs activities <strong>at-least-once</strong>: after a worker crash or a timeout, the same activity runs again (the "Worker crash" scenario above). The bank call, email, ledger write: all must be idempotent (idempotency key, conditional UPDATE). The engine gives you durable <em>decisions</em>; it does not magically make side effects exactly-once. The full story of idempotency is in the <a href="#/pagination-idempotency">Pagination and idempotency</a> lesson.` },

    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Decide: how to build a multi-step process', html: `The roadmap rule: <strong>a complex multi-step business process with retries, timeouts and human steps → a workflow engine</strong> (Temporal, Step Functions). Example: payment → seller accepts → delivery assignment. The ladder before that:<br>• All steps in one DB → just <strong>one transaction</strong> (step 1).<br>• Anything multi-step → at least an <strong>explicit state machine</strong> (step 2) (one state column, transitions in one place, conditional UPDATE). Always.<br>• 2-4 steps, one service, no long waits → a state machine + <a href="#/queues">queue</a> workers + a sweeper is enough (step 3).<br>• Steps in different services, and failures must be undone → <strong>saga + compensation</strong> (step 4).<br>• Separate teams each do their own work on one event, simple flow → <strong>choreography</strong> (Kafka events).<br>• Many steps, retries, timers, people, days/weeks, compensation → <strong>orchestration with a workflow engine</strong> (step 5).<br>And remember the roadmap's short rule: "Do this task" → queue. "This happened" and several teams care → Kafka.` },
    { type: 'table', head: ['Situation', 'Pick', 'Why'], rows: [
      ['Video publish: upload → transcode → moderation → live', 'State machine + queue workers (or an engine if a person does moderation)', 'Few steps, but the UI needs clear states'],
      ['Creator payout with approval', 'Workflow engine', 'People, timers lasting days, money, retries'],
      ['Update search, recommendations, notifications on "Video uploaded"', 'Choreography (Kafka)', 'Separate teams, one event, no central flow'],
      ['Ride lifecycle (requested → matched → started → completed)', 'State machine (one row per ride), driven by events', 'Every transition must be validated; events can arrive in the wrong order'],
      ['User onboarding (signup → verify email → KYC → first upload)', 'State machine; an engine or scheduled jobs for reminders', 'Gaps of days/weeks, a user step'],
    ]},

    { type: 'h2', text: 'The whole picture' },
    { type: 'diagram', title: 'xyz.com creator payout: the whole picture', height: 420,
      nodes: [
        { id: 'cron', label: 'Payout API', sub: 'monthly start', x: 90, y: 70, kind: 'server', info: 'What it is: the service that starts the monthly payout. It starts one workflow per creator, Workflow ID = payout-77-2026-09, so even if it runs twice, no duplicate is created.' },
        { id: 'eng', label: 'Temporal', sub: 'event history', x: 330, y: 70, w: 150, kind: 'data', info: 'What it is: the workflow engine. The diary (event history) of every payout, durable timers (48 hours), retries with backoff. After a crash, replay carries on from the same place (step 5).' },
        { id: 'wk', label: 'Workers', sub: 'activities', x: 330, y: 210, w: 170, kind: 'server', info: 'What it is: the machines that run your code. Activities: reserve, checks, transfer, compensation. Every activity is idempotent, because the engine runs them at-least-once.' },
        { id: 'led', label: 'Ledger DB', sub: 'state + outbox', x: 570, y: 210, w: 160, kind: 'data', info: 'What it is: the money records and the payout state machine (step 2). Every transition is a conditional UPDATE, with an outbox row in the same transaction (the event goes to Kafka later).' },
        { id: 'bank', label: 'Bank API', sub: 'idempotency key', x: 570, y: 70, w: 160, kind: 'net', info: 'What it is: the outside bank. Every transfer carries the payout id as an idempotency key, so a retry never sends the money twice.' },
        { id: 'fin', label: 'Finance team', sub: 'approve signal', x: 90, y: 210, kind: 'client', info: 'What it is: the human step. They approve/reject payouts above ₹5 lakh; the click goes to the workflow as a signal. No answer in 48 hours means escalation.' },
        { id: 'kafka', label: 'Kafka', sub: 'PayoutPaid event', x: 570, y: 350, w: 160, kind: 'queue', info: 'What it is: an event log. The outbox relay puts "PayoutPaid" here. Whoever cares (notifications, analytics) listens on their own: this is the choreography part.' },
        { id: 'notif', label: 'Notifications', sub: 'email, push', x: 330, y: 350, w: 170, kind: 'server', info: 'What it is: the service that sends the creator a "money sent" email/push. It removes duplicates by event id, so a duplicate event never sends two emails.' },
        { id: 'ops', label: 'Ops alerts', sub: 'stuck / FAILED', x: 90, y: 350, kind: 'client', info: 'What it is: the "stuck, call a person" path. Retries ran out, a compensation ran, or a state has been stuck for too long: the ops team gets an alert.' },
      ],
      edges: [
        { a: 'cron', b: 'eng', n: 1, label: 'start' },
        { a: 'eng', b: 'wk', n: 2, label: 'task' },
        { a: 'wk', b: 'led', label: 'state' },
        { a: 'wk', b: 'bank', n: 3, label: 'transfer' },
        { a: 'fin', b: 'eng', label: 'signal' },
        { a: 'led', b: 'kafka', kind: 'evt', label: 'outbox' },
        { a: 'kafka', b: 'notif', kind: 'evt', n: 4 },
        { a: 'wk', b: 'ops', kind: 'bad', label: 'alert' },
      ],
      paths: [
        { name: 'Happy path', text: 'The workflow starts, a worker does reserve + checks + transfer, PAID in the ledger, a PayoutPaid event through the outbox, an email to the creator.', go: ['cron>eng>wk>led>kafka>notif', 'wk>bank'] },
        { name: 'Crash + resume', text: 'The worker died after the transfer. On timeout, the engine gave the task to a new worker, which carried on from step 3 by replay, with the same idempotency key: the money went only once.', go: ['eng>wk>bank', 'wk>led'] },
        { name: 'Approval', text: 'A big payout stopped at NEEDS_APPROVAL (durable timer 48 h). Finance\'s click reached the engine as a signal, and the workflow moved on.', go: ['fin>eng>wk>led'] },
        { name: 'Compensation', text: 'The bank refused (account closed). The saga\'s undo step: the reserve goes back to the balance, state FAILED, an alert to ops.', go: ['wk>bank', 'wk>led', 'wk>ops'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>A multi-step process has three enemies: crashes, duplicates, and long waits.</li>
      <li>Step 1: if everything is in one DB, just use one transaction. The ladder ends there.</li>
      <li>Step 2: state machine = one state column, transitions in one place, every update checks the "from state", wrong events are rejected.</li>
      <li>Step 3: queue workers + a sweeper resume work after a crash. Resume = running a step again, so you need an idempotency key.</li>
      <li>Step 4: saga = a line of local transactions + a compensation for every step (refund, seat release). Choreography for small flows, orchestration for big ones; an outbox makes sure events are not lost.</li>
      <li>Step 5: a workflow engine (Temporal, Step Functions) gives retries, timers, signals and replay. Activities must still be idempotent.</li>
      <li>Every wait state has a timeout, and what to do on timeout is part of the design.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['Everything has one clear condition; impossible combinations are gone', 'Wrong and duplicate events are rejected; no double payout', 'Resume from the same place after a crash (with an engine or a sweeper)', 'With timeouts and escalation, nothing gets silently stuck', 'History gives an instant answer to "where is it stuck?", plus an audit trail'],
      costs: ['You have to think through states and transitions first (upfront design)', 'Workflow engine = new infrastructure and new rules (deterministic code, versioning while workflows are running)', 'In choreography the flow is scattered, and debugging is hard', 'Activities still have to be made idempotent', 'A machine with too many states becomes complex itself; keep the states few'] },

    { type: 'think', questions: [
      { q: 'Design a state machine for publishing a video on xyz.com: which states, and which transitions should be rejected?', a: 'A good version: UPLOADING → PROCESSING (transcode) → IN_REVIEW (if moderation flags it) → READY → PUBLISHED; on the side, FAILED (transcode failed, with retry) and REJECTED (moderation), and DELETED. Reject: PROCESSING straight to PUBLISHED (without transcoding, the video would be broken), REJECTED to PUBLISHED (skipping moderation), anything out of DELETED. If the creator wants "scheduled publish": READY → SCHEDULED → PUBLISHED, where SCHEDULED has a timer.' },
      { q: 'Your team added a new step to a Temporal workflow and deployed it. At that moment 10,000 payouts were waiting in NEEDS_APPROVAL. What could go wrong?', a: 'During replay, the history of the old workflows will not match the new code (the new step is not in their history), which can cause a determinism error. That is why workflow engines have versioning: in Temporal, patching/version APIs or worker versioning, so old running workflows take the old path and new ones take the new path. In Step Functions, running executions keep running on the definition they started with. Changing long workflows is a design concern.' },
      { q: 'A payout flow in choreography: "PayoutCalculated" → checks service → "ChecksPassed" → bank service → "TransferDone". Where does the finance approval fit, and what problems will come up?', a: 'The approval service must listen to ChecksPassed and hold back big amounts, and the bank service must now listen to "Approved" instead of "ChecksPassed", which means the logic of the flow is scattered across three services. Who keeps the 48 hour timeout? To see where a payout is stuck, you have to join the logs of all the services. This is the signal that orchestration (a workflow engine) is now better.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'A payout is in the PAID state and the bank\'s "bank_ok" webhook arrives again. What should the state machine do?', options: ['Write PAID again and send the email again', 'Reject/ignore the transition and change nothing', 'Move the state back to SENDING', 'Throw an error so the bank retries'], answer: 1, explain: 'PAID is a terminal state. The conditional UPDATE (WHERE state = SENDING) returns 0 rows, so nothing changes and the email is not sent again. Reply 200 OK to the bank so it does not retry.' },
      { q: 'Which case fits a workflow engine best?', options: ['Making a thumbnail for one image', 'Payment → seller accepts → delivery assignment, with retries, timeouts and human steps', 'Increasing a page view counter', 'Updating one user\'s profile'], answer: 1, explain: 'The roadmap rule: a complex multi-step business process with retries, timeouts and human steps → a workflow engine. A thumbnail is a single task (queue); the counter and the profile update are single steps.' },
      { q: 'A Temporal worker sent a bank transfer and crashed before reporting the result. What happens?', options: ['The workflow is stuck forever', 'After the activity timeout it is retried; without an idempotency key there can be a double transfer', 'Temporal guarantees the activity never runs again', 'The whole workflow starts over, and all steps run again'], answer: 1, explain: 'Activities are at-least-once. After the timeout, the engine runs the activity again. Earlier finished steps come from the history during replay (they do not run again), but the activity that was in progress runs again, so an idempotency key is a must.' },
      { q: 'What is the most important design point for the finance approval step?', options: ['Making a thread sleep for 48 hours for the approval', 'A timeout + what to do on timeout (escalate / auto-reject), and passing the decision through the state machine too', 'Skipping approval when the reviewer is busy', 'Just one button in the approval UI'], answer: 1, explain: 'Every wait state needs a deadline and a defined action at the deadline. The decision is also an event that passes the "from state" check, so a double click or an approval on a cancelled payout does no harm.' },
      { q: 'Meetup ticket saga: the seat was held, the payment was charged, but the ticket service failed (and the retries ran out). What is right?', options: ['Do nothing, the user will write to support', 'Compensations in reverse order: first the refund, then release the seat, and a clear message to the user', 'ROLLBACK the databases of all three services together', 'Charge the payment again'], answer: 1, explain: 'Rolling back the databases of separate services together is impossible. In a saga, a business-level undo step (compensation) runs for every finished step, in reverse order, and compensations must also be idempotent and retried.' },
    ]},
    { type: 'sources', note: 'Specific facts about workflow engines (timeouts, retry defaults, Step Functions types) were checked against these official docs.', items: [
      { title: 'Detecting Activity failures (activity timeouts and heartbeats)', publisher: 'Temporal documentation', official: true, url: 'https://docs.temporal.io/encyclopedia/detecting-activity-failures', used: 'Schedule-To-Start, Start-To-Close, Schedule-To-Close and Heartbeat timeouts.' },
      { title: 'Retry Policies', publisher: 'Temporal documentation', official: true, url: 'https://docs.temporal.io/encyclopedia/retry-policies', used: 'Default activity retry: 1 s initial, backoff 2.0, max interval 100x, unlimited attempts; workflows do not retry by default.' },
      { title: 'Choosing workflow type in Step Functions', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/step-functions/latest/dg/choosing-workflow-type.html', used: 'Standard (up to 1 year, exactly-once) vs Express (5 min, at-least/at-most-once); .waitForTaskToken only in Standard.' },
      { title: 'Wait for a Callback with Task Token', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html#connect-wait-token', used: 'Human approval pattern with task token and SendTaskSuccess / SendTaskFailure.' },
      { title: 'Workflow ID and Run ID', publisher: 'Temporal documentation', official: true, url: 'https://docs.temporal.io/workflow-execution/workflowid-runid', used: 'Only one running execution per Workflow ID at a time: protection against duplicate starts.' },
      { title: 'Sagas (1987)', publisher: 'Hector Garcia-Molina, Kenneth Salem (ACM SIGMOD)', url: 'https://www.cs.cornell.edu/andru/cs711/2002fa/reading/sagas.pdf', year: 1987, used: 'The original definition of a saga: a line of local transactions, each with a compensating transaction. The paper is old, but the idea is still the same today.' },
      { title: 'Pattern: Transactional outbox', publisher: 'microservices.io (Chris Richardson)', url: 'https://microservices.io/patterns/data/transactional-outbox.html', used: 'Writing the state update and the event in one DB transaction, then sending it to the broker through a relay.' },
    ]},
  ],
});
