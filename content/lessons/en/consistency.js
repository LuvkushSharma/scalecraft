Lesson.register({
  id: 'consistency',
  title: 'Consistency models and quorums',
  minutes: 25,
  summary: `"Consistent" is not a switch, it is a ladder: from linearizable down to eventual. Each step has a different price. This lesson explains each level with xyz.com examples, the N/W/R quorum game (with sliders), and how to merge two copies that clash: last-write-wins, vector clocks and CRDTs.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `xyz.com keeps copies of its data on many machines. When Riya changes something, the change does not reach every copy at the same moment.<br>So in that short gap, what will another user see? The new data, the old data, or something mixed up?<br>There are different "promises" for this question. Some promises are very strict (but slow), some are loose (but fast). In this lesson each promise comes with a story and a small game. Then we look at how many copies are enough to ask (a quorum), and what to do when two copies clash.` },
    { type: 'h2', text: 'The problem: what does "consistent" even mean?' },
    { type: 'p', html: `In the CAP lesson we saw the C of CAP: linearizability, the strongest promise. But it is expensive: waiting for a majority on every read or write, round trips to far regions, and errors during a partition. Not every feature of xyz.com needs such an expensive promise.` },
    { type: 'list', items: [
      `Riya posts a comment. <strong>She herself</strong> should see her comment at once. If Aman sees it 2 seconds later, that is fine.`,
      `In chat, Aman's reply ("yes, let's go!") must never show up <strong>before</strong> Riya's question ("shall we watch a movie?").`,
      `A video's view count can be 10 seconds old. That is fine.`,
      `The username "riya" must never go to two people, no matter what.`,
    ]},
    { type: 'p', html: `Four features, four different promises. If you use the strongest level for everything, the site becomes slow and costly. If you use the weakest level for everything, you get bugs. That is why you need to know the names and meanings of the levels: so that <strong>you promise exactly what is needed, and nothing more expensive</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: Consistency model', html: `<strong>What it is:</strong> a contract (a promise) between the system and the developer: "which values you may see in reads, and which you will <em>never</em> see."<br><strong>Why we need it:</strong> when there are many copies, the answer to "what will a read return?" is not obvious. The model tells the app what it can trust.<br><strong>Without it:</strong> the developer assumes "I always get the latest", and as soon as old data shows up in production, there is a bug.<br><strong>The rule:</strong> the stronger the model, the fewer "strange" results are possible, and the more coordination (machines checking with each other) it needs, which means more latency.` },
    { type: 'ascii', text: `
STRONG  (more coordination, more latency, errors in a partition)
  │
  │   Linearizable      ── as if there is one copy, real-time order
  │   Sequential        ── everyone sees one order (real time not needed)
  │   Causal            ── a "cause" always shows before its "effect"
  │   Read-your-writes  ┐
  │   Monotonic reads   ┘ ── promises for one user's session
  │   Eventual          ── all the same in the end, anything in between
  ▼
WEAK    (fast, works in a partition, strange results possible)`, caption: 'The consistency ladder. A model higher up also gives all the promises of the models below it.' },

    { type: 'h2', text: 'Each step of the ladder, with a timeline' },
    { type: 'p', html: `For each model there is a small timeline: on the left a read that is <strong>allowed</strong>, on the right one that is <strong>forbidden</strong>. Time runs from left to right. <code>[----]</code> is one operation, from its start to its end.` },

    { type: 'h3', text: '1. Strong / linearizable' },
    { type: 'callout', tone: 'term', title: 'Linearizable (strong consistency)', html: `<strong>What it is:</strong> the system behaves as if there is <strong>only one copy</strong> of the data. Each operation "happens" at one single instant between its start and its end. Every read that starts after a write has finished will see that write (or something newer). And once any read has seen the new value, no later read can see the old one.<br><strong>Why we need it:</strong> for things like usernames, seats and balances, even "slightly old" leads to a wrong decision.<br><strong>Without it:</strong> Riya changed her name to "riya_s" and got an OK, yet Aman still sees the old name "riya" as free and takes it.<br><strong>Example:</strong> Riya's write ran from 10:00:00.000 to 10:00:00.050. Aman's read started at 10:00:00.080: he must get the new name. If Aman's read had started at 10:00:00.020 (in the middle of the write), both old and new would be fine.` },
    { type: 'compare',
      left: { title: 'Allowed', ascii: `
Riya:  [ username = riya_s ]
                        ↑ done
Aman:                      [ read ] → riya_s ✓` },
      right: { title: 'Forbidden', ascii: `
Riya:  [ username = riya_s ]
                        ↑ done
Aman:                      [ read ] → riya   ✗
(the write had finished,
 still the old name)` },
    },
    { type: 'p', html: `<strong>Where in xyz.com:</strong> unique usernames, seat locks, wallet balances, distributed locks. <strong>The price:</strong> every write (and often every read) needs coordination with a majority or a leader; during a partition the minority side stops (CAP lesson).` },

    { type: 'h3', text: '2. Sequential' },
    { type: 'callout', tone: 'term', title: 'Sequential consistency', html: `<strong>What it is:</strong> all operations have <strong>one single order</strong> that everyone sees, and each user's own operations appear in that order in the sequence they did them. But that order does not have to match real time (clock time). Someone may see a slightly older "snapshot", as long as everyone sees the same order.<br><strong>Why we need it:</strong> if two people see different orders ("first A then B" vs "first B then A"), they reach different conclusions.<br><strong>Without it:</strong> Neha thinks Riya posted first, Kabir thinks Aman did; the two screens tell different stories.<br><strong>Example:</strong> Riya's write has finished, but Aman may still read the old value (this was forbidden under linearizable). But once Aman has seen the new value, his next read can never show the old one.` },
    { type: 'compare',
      left: { title: 'Allowed', ascii: `
Riya posts:  P1 ........ P2
Aman posts:       A1

Neha sees:  P1, A1, P2  ✓
Kabir sees: P1, A1      ✓
 (P2 has not arrived yet,
  but the order is the same)` },
      right: { title: 'Forbidden', ascii: `
Neha sees:  P1, A1
Kabir sees: A1, P1   ✗
 (two people see
  different orders)
Or: P2 shows, P1 not    ✗` },
    },
    { type: 'p', html: `The difference from linearizable: in linearizable, real time also matters (after a write has finished, never the old value). Sequential only needs "everyone agrees on one order". Real databases rarely offer this level by name; you usually get either linearizable or something weaker than causal.` },

    { type: 'h3', text: '3. Causal' },
    { type: 'callout', tone: 'term', title: 'Causal consistency', html: `<strong>What it is:</strong> if one operation happened <strong>because of</strong> another (someone saw the first one and did the second in response), then everyone sees the "cause" first and the "effect" after it. Operations with no link between them (<strong>concurrent</strong>, meaning neither knew about the other) may appear in different orders to different people.<br><strong>Why we need it:</strong> an answer without its question looks like nonsense; a "post" seen before a "block" lets the wrong people see the post.<br><strong>Without it:</strong> Neha sees "yes, let's go!" but not "shall we watch a movie?".<br><strong>Example:</strong> Riya: "shall we watch a movie?" → Aman (after reading it): "yes!" → Kabir (separately): "hello". Neha may see "hello" anywhere, but "yes!" always after the question.` },
    { type: 'compare',
      left: { title: 'Allowed', ascii: `
Riya: "movie?"
Aman (after reading): "yes!"
Kabir (separately): "hello"

Neha: question, hello, yes ✓
Ishan: hello, question, yes ✓
 (hello is concurrent,
  it can go anywhere)` },
      right: { title: 'Forbidden', ascii: `
Neha sees:
  "yes!"
  ... no question yet  ✗

(the answer showed, the
 question did not: effect
 before cause)` },
    },
    { type: 'p', html: `<strong>Where in xyz.com:</strong> chat, comment threads (a "reply" never before its parent), "I blocked Riya, then posted" (the block must apply first). Causal consistency can keep working during a partition (if the client stays connected to its own replica), so it is seen as the strongest practical level for AP systems.` },

    { type: 'h3', text: '4. Read-your-writes and 5. Monotonic reads' },
    { type: 'p', html: `These two are <strong>session guarantees</strong>: not a promise for the whole system, only for <em>one user's own session</em>. We saw them with the lag timeline widget in the replication lesson; here is a quick reminder:` },
    { type: 'callout', tone: 'term', title: 'Read-your-writes', html: `<strong>What it is:</strong> what <strong>you yourself</strong> wrote will always show in your next reads. There is no promise for other people.<br><strong>Why we need it:</strong> the user believes their work was "saved". If it disappears on refresh, they post again (a duplicate) or panic.<br><strong>Without it:</strong> Riya comments, refreshes, and the read goes to a replica that is behind: the comment is gone!<br><strong>Example:</strong> Riya's comment is written on the leader at 10:00:00, and the replica is 2 seconds behind. For the next 5 seconds Riya's own reads go to the leader: the comment always shows. Aman's reads go to the replica: seeing it 2 seconds later is fine.` },
    { type: 'callout', tone: 'term', title: 'Monotonic reads', html: `<strong>What it is:</strong> one user's reads <strong>never go back in time</strong>. Once you have seen something, you will never see anything older after it. ("Monotonic" = moving in one direction only.)<br><strong>Why we need it:</strong> if things vanish and come back when the user refreshes, the user thinks data was lost.<br><strong>Without it:</strong> Aman first sees 5 comments, on refresh 4 (from another replica that is behind), then 5 again. Strange.<br><strong>Example:</strong> always connect Aman to replica 2 (sticky routing). Replica 2 itself never goes backwards, so Aman's view does not either.` },
    { type: 'compare',
      left: { title: 'Read-your-writes', ascii: `
Riya: [ comment "wow!" ]
Riya:                  [ refresh ] → "wow!" shows ✓
Riya:                  [ refresh ] → gone         ✗
Aman:                  [ refresh ] → not yet      ✓
 (no promise for Aman)` },
      right: { title: 'Monotonic reads', ascii: `
Aman: [ read ] → 5 comments
Aman:          [ read ] → 5 or more  ✓
Aman:          [ read ] → 4          ✗
 (time does not go back:
  what you have seen
  does not vanish)` },
    },
    { type: 'p', html: `<strong>The fix (from the replication lesson):</strong> for read-your-writes, send your reads to the leader for a few seconds after you write, or make the replica wait until it has reached the position of the user's last write. For monotonic reads, always stick the user to the same replica (sticky routing).` },

    { type: 'h3', text: '6. Eventual consistency' },
    { type: 'callout', tone: 'term', title: 'Eventual consistency', html: `<strong>What it is:</strong> if new writes stop coming, then <strong>in the end</strong> all copies will reach the same value. In between, any copy may return any (old) value, and there is no promise about how long "in the end" takes.<br><strong>Why we need it:</strong> it is the cheapest and fastest, and every replica keeps working during a partition. Enough for views, likes and recommendations.<br><strong>Without it (always strong instead):</strong> waiting for a majority on every view count: a slow, costly site with no benefit.<br><strong>Example:</strong> a video's views went from 1000 to 1003. Replica B shows 1000 for a little while, then 1003. No harm done.` },
    { type: 'compare',
      left: { title: 'Allowed', ascii: `
views: 1000 → 1003 (written)
Replica A: 1003
Replica B: 1000  (still old) ✓
...a little later...
Replica B: 1003              ✓` },
      right: { title: 'Forbidden', ascii: `
Writes have stopped,
hours have passed,
Replica A: 1003
Replica B: 1000  for
ever                      ✗` },
    },
    { type: 'callout', tone: 'mistake', title: 'Common mistake', html: `"Eventual" does not mean "a few seconds". On a normal day the copies match within milliseconds, but the model gives no time limit. During a partition, with an overloaded replica or a bug, it can take minutes or hours. So a feature built on eventual consistency must <strong>work correctly even with old and out-of-order reads</strong>.` },
    { type: 'h3', text: 'Timeline lab: which reads are allowed in each model?' },
    { type: 'p', html: `Now play with it yourself. Choose a model at the top. In the timeline, <strong>W</strong> = write and <strong>R</strong> = read; the longer the bar, the longer the operation ran. Under each read are its possible answers: click one and see whether it is <strong>allowed</strong> or <strong>forbidden</strong> in this model, and why. The answer for some reads depends on an earlier read: choose that one first.` },
    { type: 'custom', render(el) {
      const M = [
        { k: 'lin', name: 'Linearizable', setup: 'At the start, bio = v1. Riya writes bio = v2 (time 10 to 60).', rows: [['Riya', [[10, 60, 'w', 'W: v2']]], ['Aman', [[15, 30, 'r', 'R1']]], ['Neha', [[35, 50, 'r', 'R2']]], ['Kabir', [[70, 90, 'r', 'R3']]]],
          reads: [
            { id: 'R1', who: 'Aman, time 15-30', c: [['v1', () => true, () => 'The write is still running (10-60). A read that overlaps it may get the old or the new value.'], ['v2', () => true, () => 'The write is running; it may "happen" at this very instant. The new value is allowed too.']] },
            { id: 'R2', who: 'Neha, time 35-50', dep: 'R1', c: [['v1', p => p !== 'v2', p => p === 'v2' ? 'Forbidden: R1 (which finished earlier) already saw v2. In linearizable, no read that starts after it can see the old value.' : 'R1 also saw v1, and the write is still running: v1 is still fine.'], ['v2', () => true, () => 'The write is running; seeing the new value is always fine.']] },
            { id: 'R3', who: 'Kabir, time 70-90', c: [['v1', () => false, () => 'Forbidden: the write finished at 60 and this read started at 70. Only the new value now.'], ['v2', () => true, () => 'A read that started after the write finished: the new value.']] },
          ] },
        { k: 'seq', name: 'Sequential', setup: 'At the start, bio = v1. Riya writes bio = v2 (10-30). Aman reads twice, after the write has finished.', rows: [['Riya', [[10, 30, 'w', 'W: v2']]], ['Aman', [[45, 60, 'r', 'R1'], [70, 90, 'r', 'R2']]]],
          reads: [
            { id: 'R1', who: 'Aman, time 45-60', c: [['v1', () => true, () => 'Allowed! Even though the write has finished. In sequential, real time does not matter: the order "Aman reads, then Riya writes" is also a valid order. (In linearizable this was forbidden.)'], ['v2', () => true, () => 'Allowed: the order "Riya writes, then Aman reads".']] },
            { id: 'R2', who: 'Aman, time 70-90', dep: 'R1', c: [['v1', p => p !== 'v2', p => p === 'v2' ? 'Forbidden: R1 saw v2, so in the order the write comes before R1. R2 comes after R1, so the old v1 cannot appear in any order.' : 'Allowed: the order "R1, R2, then the write" is also valid.'], ['v2', () => true, () => 'Allowed: put the write before R2.']] },
          ] },
        { k: 'cau', name: 'Causal', setup: 'Chat. Riya: Q = "movie?". Aman read Q, then wrote A = "yes!". Kabir separately wrote H = "hello". Neha opens the chat later.', rows: [['Riya', [[5, 20, 'w', 'W: Q']]], ['Aman', [[25, 35, 'r', 'R: Q'], [40, 55, 'w', 'W: A']]], ['Kabir', [[20, 40, 'w', 'W: H']]], ['Neha', [[65, 85, 'r', 'R1']]]],
          reads: [
            { id: 'R1', who: 'which list Neha may see', c: [['Q, A', () => true, () => 'Allowed: the question first, the answer after. H has not arrived yet, that is fine.'], ['A', () => false, () => 'Forbidden: the answer shows, the question does not. Q is the cause of A, so Q must show first.'], ['H, Q, A', () => true, () => 'Allowed: H is concurrent (nobody saw anybody), so it can go anywhere.'], ['A, Q', () => false, () => 'Forbidden: the effect before the cause. Reversed order.'], ['H', () => true, () => 'Allowed: Q and A have not arrived yet. No cause-effect rule is broken.'], ['Q, A, H', () => true, () => 'Allowed: H has no link with Q and A, so it can also come at the end.']] },
          ] },
        { k: 'ryw', name: 'Read-your-writes', setup: 'Riya writes the comment "wow!" (10-30). Then Riya and Aman both refresh.', rows: [['Riya', [[10, 30, 'w', 'W: wow!'], [45, 60, 'r', 'R1']]], ['Aman', [[45, 60, 'r', 'R2']]]],
          reads: [
            { id: 'R1', who: 'Riya refreshes', c: [['comment shows', () => true, () => 'Allowed: your own writing must show.'], ['comment missing', () => false, () => 'Forbidden: Riya wrote it herself. The read-your-writes promise is broken.']] },
            { id: 'R2', who: 'Aman refreshes', c: [['comment shows', () => true, () => 'Allowed.'], ['comment missing', () => true, () => 'Allowed: the promise is only for Riya. It is fine if Aman sees it a little later.']] },
          ] },
        { k: 'mon', name: 'Monotonic reads', setup: 'Neha commented: the count went from 4 to 5 (5-20). Aman reads twice.', rows: [['Neha', [[5, 20, 'w', 'W: 5']]], ['Aman', [[30, 45, 'r', 'R1'], [60, 80, 'r', 'R2']]]],
          reads: [
            { id: 'R1', who: 'Aman, first read', c: [['4', () => true, () => 'Allowed: the replica may still be behind.'], ['5', () => true, () => 'Allowed.']] },
            { id: 'R2', who: 'Aman, second read', dep: 'R1', c: [['4', p => p !== '5', p => p === '5' ? 'Forbidden: Aman has already seen 5. Showing 4 now = time went backwards.' : 'Allowed: he saw 4 before too, so nothing went backwards. (It is old, but this model only says "do not go back".)'], ['5', () => true, () => 'Allowed: moving forward is always fine.']] },
          ] },
        { k: 'ev', name: 'Eventual', setup: 'Views were 1000. After Riya\'s clicks they became 1003 (5-15). Aman reads from replica B: once right away, once hours later (no new writes in between).', rows: [['Riya', [[5, 15, 'w', 'W: 1003']]], ['Aman', [[20, 30, 'r', 'R1'], [80, 95, 'r', 'R2']]]],
          reads: [
            { id: 'R1', who: 'Aman, right after', c: [['1000', () => true, () => 'Allowed: replica B is still behind.'], ['1003', () => true, () => 'Allowed.'], ['1050', () => false, () => 'Forbidden: nobody ever wrote this value.']] },
            { id: 'R2', who: 'Aman, hours later', c: [['1000', () => false, () => 'Forbidden: writes stopped and a long time passed. By now all copies should have reached 1003 (convergence).'], ['1003', () => true, () => 'Allowed: the copies have met.']] },
          ] },
      ];
      let mi = 0; let sel = {};
      el.innerHTML = `<div class="tl-modes" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <div class="tl-setup" style="margin:10px 0 6px;font-size:14px;color:var(--ink-2)"></div>
        <div class="tl-rows" style="display:grid;gap:6px"></div>
        <div class="tl-reads" style="display:grid;gap:10px;margin-top:12px"></div>
        <div class="stats"><div class="stat"><span>Allowed answers in this model</span><strong class="tl-cnt"></strong></div></div>`;
      const q = s => el.querySelector(s);
      const draw = () => {
        const m = M[mi];
        const modes = q('.tl-modes'); modes.innerHTML = '';
        M.forEach((x, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (i === mi ? ' on' : ''); b.textContent = x.name; b.onclick = () => { mi = i; sel = {}; draw(); }; modes.appendChild(b); });
        q('.tl-setup').textContent = m.setup;
        q('.tl-rows').innerHTML = m.rows.map(([who, bars]) => `<div style="display:flex;align-items:center;gap:8px"><span style="width:52px;flex:none;font-size:13px;font-weight:600">${who}</span><div style="position:relative;flex:1;height:26px;border-bottom:1px dashed var(--line-2)">${bars.map(([a, b, k, t]) => `<span style="position:absolute;left:${a}%;width:${b - a}%;top:2px;height:22px;border-radius:6px;border:1.5px solid ${k === 'w' ? 'var(--accent)' : 'var(--violet)'};background:${k === 'w' ? 'var(--accent-soft)' : 'var(--surface-2)'};font:600 11px/20px var(--f-mono);text-align:center;overflow:hidden;white-space:nowrap;color:var(--ink)">${t}</span>`).join('')}</div></div>`).join('') + `<div style="display:flex;gap:8px"><span style="width:52px;flex:none"></span><div style="flex:1;display:flex;justify-content:space-between;font:11px var(--f-mono);color:var(--ink-3)"><span>time 0</span><span>50</span><span>100</span></div></div>`;
        const box = q('.tl-reads'); box.innerHTML = ''; let okCount = 0, total = 0;
        m.reads.forEach(r => {
          const d = document.createElement('div');
          d.style.cssText = 'border:1px solid var(--line);border-radius:var(--r-sm);padding:8px 10px;background:var(--surface)';
          const h = document.createElement('div'); h.style.cssText = 'font-size:14px;margin-bottom:6px'; h.innerHTML = `<strong>${r.id}</strong> (${r.who}): what can it return?`; d.appendChild(h);
          const prev = r.dep ? sel[r.dep] : null;
          const cs = document.createElement('div'); cs.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px';
          r.c.forEach(([v, ok]) => { total++; if (!r.dep || prev) { if (ok(prev)) okCount++; } const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (sel[r.id] === v ? ' on' : ''); b.textContent = v; b.onclick = () => { sel[r.id] = v; draw(); }; cs.appendChild(b); });
          d.appendChild(cs);
          const fb = document.createElement('div'); fb.style.cssText = 'margin-top:6px;font-size:13.5px';
          if (r.dep && !prev) { fb.textContent = `First choose an answer for ${r.dep}: this read depends on it.`; fb.style.color = 'var(--ink-3)'; }
          else if (sel[r.id]) { const [, ok, why] = r.c.find(c => c[0] === sel[r.id]); const y = ok(prev); fb.textContent = (y ? 'ALLOWED: ' : 'FORBIDDEN: ') + why(prev); fb.style.color = y ? 'var(--green)' : 'var(--red)'; }
          else { fb.textContent = 'Choose an answer.'; fb.style.color = 'var(--ink-3)'; }
          d.appendChild(fb); box.appendChild(d);
        });
        q('.tl-cnt').textContent = okCount + ' / ' + total + (m.reads.some(r => r.dep && !sel[r.dep]) ? ' (dependent read left)' : '');
      };
      draw();
    }},

    { type: 'h3', text: 'At a glance' },
    { type: 'table', head: ['Model', 'xyz.com feature', 'During a partition?', 'Price'], rows: [
      ['Linearizable', 'Username, seat lock, balance', 'The minority side stops', 'Highest: coordination on every operation'],
      ['Sequential', 'Everyone agrees on one order (rarely offered by name)', 'The minority side stops', 'High'],
      ['Causal', 'Chat, comment replies', 'Can keep working, if the client stays with its own replica', 'Dependencies must be tracked'],
      ['Read-your-writes', 'Your own profile, your own comment', 'Can keep working, if the client stays with its own replica', 'Routing logic'],
      ['Monotonic reads', 'Comment list, inbox', 'Can keep working', 'Sticky routing'],
      ['Eventual', 'Views, likes, recommendations', 'Every replica keeps working', 'Lowest'],
    ], caption: 'The partition column is based on Jepsen\'s map of consistency models.' },

    { type: 'h2', text: 'Quorums: the game of N, W and R' },
    { type: 'p', html: `In the replication lesson we saw leaderless (Dynamo-style) replication: there is no leader, and the client or a <strong>coordinator</strong> node sends each write to several replicas. There we saw the formula <strong>R + W &gt; N</strong>. Now let us understand it deeply, because this one formula decides both "how consistent" and "how available" the system is.` },
    { type: 'callout', tone: 'term', title: 'N, W, R', html: `<strong>What it is:</strong> three numbers that tell a leaderless store how long to wait.<br>• <strong>N</strong> = how many copies (replicas) each key has.<br>• <strong>W</strong> = how many replicas must say "yes, written" (ack) before a write counts as successful.<br>• <strong>R</strong> = how many replicas must answer a read; among them, take the value with the newest <strong>version</strong> (a number for the data, like v1, v2).<br><strong>Why we need it:</strong> if you wait for all N, one slow or dead replica blocks everything. If you wait for only one, you may get old data. W and R are the middle path.<br><strong>Without it:</strong> either an error on every failure, or old data on every other read.<br><strong>Example:</strong> in Amazon's Dynamo paper (2007), a common setting for many services was <strong>(N, R, W) = (3, 2, 2)</strong>.` },
    { type: 'p', html: `The logic of the formula fits in one line: if R + W &gt; N, then the R replicas of the read and the W replicas of the write <strong>must share at least one replica</strong> (there is no room for them to stay apart). That shared replica brings the latest value. Think of 3 chairs: if one group sits on 2 and another group also sits on 2, at least one chair is shared by both.` },
    { type: 'callout', tone: 'term', title: 'Read repair and anti-entropy', html: `<strong>What it is:</strong> two ways to fix replicas that have fallen behind. <strong>Read repair:</strong> during a read, the coordinator sees that one replica returned an old version, so it sends that replica the new version right away. <strong>Anti-entropy:</strong> a background job that compares the replicas' data with each other and fixes the differences (Dynamo uses Merkle trees for this, so it does not have to send all the data).<br><strong>Why we need it:</strong> W &lt; N means some replicas fall behind after each write. They must catch up at some point.<br><strong>Without it:</strong> old copies would stay old forever, and if the next replica failed, the new data could be lost.` },
    { type: 'flow', height: 340,
      nodes: [
        { id: 'c', label: 'Client', sub: 'xyz.com app', x: 80, y: 175, w: 120, kind: 'client', info: 'What it is: the xyz.com app server that uses the key-value store. For it, this is a simple PUT/GET.' },
        { id: 'co', label: 'Coordinator', sub: 'N=3, W=2, R=2', x: 265, y: 175, w: 140, kind: 'server', info: 'What it is: the node that handles this request (like a manager). It sends a write to N replicas and waits for W acks; on a read it waits for R answers and picks the newest version. In Dynamo this is the first healthy node in the key\'s preference list.' },
        { id: 'r1', label: 'Replica 1', sub: 'v1', x: 480, y: 50, w: 130, kind: 'data', info: 'What it is: the first copy of the key, on a separate machine. Each copy stores version info with it (a vector clock in Dynamo, a timestamp in Cassandra).' },
        { id: 'r2', label: 'Replica 2', sub: 'v1', x: 480, y: 135, w: 130, kind: 'data', info: 'What it is: the second copy, on another machine. With N = 3 it is one of three votes: for W = 2 a write gets an ack from it or from one other replica, and for R = 2 a read also asks two replicas. So even if any one replica is behind, the read and the write overlap on at least one replica.' },
        { id: 'r3', label: 'Replica 3', sub: 'v1', x: 480, y: 220, w: 130, kind: 'data', info: 'What it is: the third copy. Sometimes slow, sometimes down: quorums exist so that we do not have to wait for one slow replica.' },
        { id: 'r4', label: 'Node D', sub: 'hinted replica', x: 480, y: 305, w: 130, kind: 'data', hidden: true, info: 'What it is: the next healthy node on the ring, which normally does not keep a copy of this key. In a sloppy quorum it takes the write for Replica 3 for a while, with a "hint" saying who the real owner is.' },
      ],
      edges: [{ a: 'c', b: 'co' }, { a: 'co', b: 'r1' }, { a: 'co', b: 'r2' }, { a: 'co', b: 'r3' }, { a: 'co', b: 'r4', id: 'cr4', hidden: true }, { a: 'r3', b: 'r4', id: 'h34', hidden: true }],
      scenarios: [
        { name: 'Write W=2, read R=2', intro: 'Riya changed her bio. N=3, W=2, R=2.', steps: [
          { title: 'Write to all three', text: 'The coordinator sends the new version (v2) to all three replicas at the same time.', go: ['c>co', 'co>r1', 'co>r2', 'co>r3'], parallel: true, msg: 'PUT bio:riya = "tea lover" (v2)' },
          { title: '2 acks arrived: success', text: 'Replicas 1 and 2 sent acks. W = 2 is met, so the client gets success. Replica 3 was slow and still has v1. We did not wait for it: that is the benefit of a quorum.', go: ['res:r1>co', 'res:r2>co', 'res:co>c'], parallel: true, after: { r1: { sub: 'v2', state: 'ok' }, r2: { sub: 'v2', state: 'ok' }, r3: { sub: 'v1 (slow)', state: 'warn' } }, msg: '200 OK (2 of 3 acks)' },
          { title: 'Read: ask 2 replicas', text: 'Aman opens Riya\'s bio. Say the coordinator asked Replica 2 and Replica 3 (worst case: one old replica is included).', go: ['c>co', 'co>r2', 'co>r3'], parallel: true, msg: 'GET bio:riya  (R=2)' },
          { title: 'The new version wins', text: 'Replica 2 returns v2, Replica 3 returns v1. The coordinator compares versions and picks v2. The overlap saved us: Replica 2 was in both groups.', go: ['res:r2>co', 'res:r3>co', 'res:co>c'], parallel: true, msg: 'v2 > v1  →  "tea lover"' },
          { title: 'Read repair', text: 'The coordinator saw that Replica 3 is behind, so it sent it v2. Now all three match.', go: 'co>r3', after: { r3: { sub: 'v2 (repaired)', state: 'ok' } } },
        ]},
        { name: 'Replica down', intro: 'Replica 3 died. Will the system keep working?', steps: [
          { title: 'Replica 3 down', text: 'One replica is gone.', set: { r3: { state: 'down', sub: 'DOWN' } }, go: 'lost:co>r3' },
          { title: 'Write: still a success', text: 'Replicas 1 and 2 sent acks. W = 2 is met. No failover needed, no leader election. N - W = 1 failure was tolerated.', go: ['c>co', 'co>r1', 'co>r2', 'res:co>c'], after: { r1: { sub: 'v2', state: 'ok' }, r2: { sub: 'v2', state: 'ok' } }, msg: '200 OK (2 of 3)' },
          { title: 'Replica 2 down too', text: 'Now only one is alive. A write needs 2 acks, but only 1 is possible.', set: { r2: { state: 'down', sub: 'DOWN' } }, go: ['c>co', 'co>r1', 'res:r1>co'] },
          { title: 'Write fails', text: 'A strict quorum says no: consistency is kept, availability is lost. More than N - W failures = writes stop; more than N - R = reads stop.', go: 'bad:co>c', msg: '503  "only 1 of 3 replicas available, need 2"' },
        ]},
        { name: 'R=1, W=1: stale read', intro: 'For speed, W=1 and R=1. Now R + W = 2, which is not bigger than N = 3.', steps: [
          { title: 'Write with just one ack', text: 'Replica 1 sent an ack: success. The other two are still old.', set: { co: { sub: 'N=3, W=1, R=1' } }, go: ['c>co', 'co>r1', 'res:co>c'], after: { r1: { sub: 'v2', state: 'ok' } }, msg: '200 OK (1 ack)' },
          { title: 'Read from one replica', text: 'The read went to Replica 3.', go: ['c>co', 'co>r3', 'res:r3>co'] },
          { title: 'Old data!', text: 'Replica 3 has v1. The read set {3} and the write set {1} share nothing. This is a <strong>stale read</strong>. It was fast, but the only promise is eventual consistency.', go: 'res:co>c', set: { r3: { state: 'warn', sub: 'v1 (stale!)' } }, msg: '"old bio"  ✗' },
        ]},
        { name: 'Sloppy quorum', intro: 'Dynamo\'s "always writeable" trick. The network cannot reach Replicas 2 and 3.', steps: [
          { title: '2 replicas unreachable', text: 'With a strict quorum, W = 2 would not be met and the write would fail.', set: { r2: { state: 'down', sub: 'unreachable' }, r3: { state: 'down', sub: 'unreachable' } }, go: ['lost:co>r2', 'lost:co>r3'], parallel: true },
          { title: 'Use the next healthy node', text: 'Dynamo writes to the "first N healthy nodes": Node D, further along the ring, takes the write in place of Replica 3, along with a <strong>hint</strong>: "this really belongs to Replica 3".', show: ['r4', 'cr4'], go: ['c>co', 'co>r1', 'co>r4'], after: { r1: { sub: 'v2', state: 'ok' }, r4: { sub: 'v2 + hint: R3', state: 'warn' } } },
          { title: 'W = 2 is "met"', text: 'Two acks arrived (Replica 1 + Node D), so it is a success. But note: one of them is not a home replica. If an R = 2 read later goes to Replicas 2 + 3 (when they come back), there is no overlap: <strong>the R + W &gt; N guarantee breaks here</strong>.', go: ['res:r1>co', 'res:r4>co', 'res:co>c'], parallel: true, msg: '200 OK (sloppy quorum)' },
          { title: 'Hinted handoff', text: 'The network is fixed; Replicas 2 and 3 are back. Node D gives the hinted data to Replica 3 and deletes its temporary copy. This is called <strong>hinted handoff</strong>. Replica 2 is still at v1: read repair or anti-entropy will catch it.', set: { r3: { state: '', sub: 'v1' }, r2: { state: '', sub: 'v1' } }, show: ['h34'], go: 'evt:r4>r3', after: { r3: { sub: 'v2 (handoff)', state: 'ok' }, r4: { sub: 'hint delivered', state: 'dim' } } },
        ]},
      ],
    },
    { type: 'callout', tone: 'term', title: 'Sloppy quorum and hinted handoff', html: `<strong>What it is:</strong> when the network cannot reach a key's "home" replicas, put the write on some other healthy node for a while, along with a <strong>hint</strong> (a note): "this really belongs to Replica 3". This is called a <strong>sloppy quorum</strong>. When Replica 3 comes back, that node hands the data over and deletes its own copy: this is <strong>hinted handoff</strong>.<br><strong>Why we need it:</strong> Amazon's "add to cart" should never fail, even if two replicas are down.<br><strong>Without it:</strong> with a strict quorum, if W replicas are not reachable, the write fails: the user gets an error.<br><strong>The price:</strong> the write sits "outside its home", so even with R + W &gt; N a read may return old data until the handoff happens. Cassandra also has hinted handoff (there, hints only help data reach the replicas; they do not count towards the consistency level, except for the ANY level).` },
    { type: 'h3', text: 'Quorum lab: choose N, W and R yourself' },
    { type: 'p', html: `The lab below shows the worst case. Try these:` },
    { type: 'list', items: [
      `<strong>Dynamo (3,2,2):</strong> Write, then Read. The read first asks the old replica (R3), but the second replica it asks has the latest: overlap. Kill one replica: everything works. Kill two: Write FAIL.`,
      `<strong>Fast: W=1, R=1:</strong> Write, then Read: STALE READ. R + W = 2 ≤ 3. But even with 2 replicas killed, writes and reads keep working.`,
      `<strong>Read-heavy: R=1, W=N:</strong> reads come from a single replica (fastest) and are always fresh, because every write went to all replicas. The price: if even one replica is down, writes stop. In the Dynamo paper, some read-heavy services used this setting.`,
      `<strong>5 copies (5,3,3):</strong> kill 2 replicas, and everything still works with a guaranteed overlap.`,
    ]},
    { type: 'custom', render(el) {
      function quorumCore() {
        const S = { N: 3, W: 2, R: 2, dead: new Set(), ver: [1, 1, 1], latest: 1, wset: [], rset: [], last: null };
        const alive = () => S.ver.map((_, i) => i).filter(i => !S.dead.has(i));
        return {
          S,
          setN(n) { S.N = n; S.W = Math.min(S.W, n); S.R = Math.min(S.R, n); S.dead = new Set(); S.ver = Array(n).fill(1); S.latest = 1; S.wset = []; S.rset = []; S.last = null; },
          setW(w) { S.W = Math.max(1, Math.min(S.N, w)); },
          setR(r) { S.R = Math.max(1, Math.min(S.N, r)); },
          toggle(i) { if (S.dead.has(i)) S.dead.delete(i); else S.dead.add(i); },
          write() {
            const a = alive(); S.rset = [];
            if (a.length < S.W) { S.wset = []; S.last = { kind: 'wfail', alive: a.length }; return S.last; }
            const v = S.latest + 1; S.wset = a.slice(0, S.W); S.wset.forEach(i => { S.ver[i] = v; }); S.latest = v;
            S.last = { kind: 'wok', v, set: S.wset.slice() }; return S.last;
          },
          read() {
            const a = alive();
            if (a.length < S.R) { S.rset = []; S.last = { kind: 'rfail', alive: a.length }; return S.last; }
            // worst case: the coordinator happens to ask stale replicas first
            const order = a.slice().sort((x, y) => (S.ver[x] - S.ver[y]) || (x - y));
            S.rset = order.slice(0, S.R);
            const got = Math.max(...S.rset.map(i => S.ver[i]));
            const overlap = S.rset.filter(i => S.ver[i] === S.latest);
            const repaired = S.rset.filter(i => S.ver[i] < got);
            repaired.forEach(i => { S.ver[i] = got; }); // read repair
            S.last = { kind: 'rok', got, fresh: got === S.latest, overlap, repaired, set: S.rset.slice() }; return S.last;
          },
          repair() { alive().forEach(i => { S.ver[i] = S.latest; }); S.wset = []; S.rset = []; S.last = { kind: 'repair' }; return S.last; },
        };
      }
      const qc = quorumCore(), S = qc.S;
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center"><span style="font-size:14px;color:var(--ink-2)">Presets:</span><span class="cq-pre" style="display:flex;flex-wrap:wrap;gap:6px"></span></div>
        <div class="row2" style="margin-top:10px">
          <div><label>N (copies): <strong class="cq-nv"></strong></label><input class="cq-n" type="range" min="1" max="7" step="1" value="3"></div>
          <div><label>W (write acks): <strong class="cq-wv"></strong></label><input class="cq-w" type="range" min="1" max="3" step="1" value="2"></div>
          <div><label>R (read replies): <strong class="cq-rv"></strong></label><input class="cq-r" type="range" min="1" max="3" step="1" value="2"></div>
        </div>
        <div style="font-size:13px;color:var(--ink-3);margin-top:8px">Click a replica to kill it / bring it back.</div>
        <div class="cq-nodes" style="display:flex;flex-wrap:wrap;gap:10px;margin:10px 0"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          <button type="button" class="btn small primary cq-write">Write (new version)</button>
          <button type="button" class="btn small primary cq-read">Read</button>
          <button type="button" class="btn small ghost cq-rep">Anti-entropy (sync all)</button>
        </div>
        <div class="cq-res" style="margin-top:10px;padding:8px 10px;border-radius:var(--r-sm);background:var(--surface-2);border:1px solid var(--line);font-size:14px;min-height:22px"></div>
        <div class="stats">
          <div class="stat"><span>R + W vs N</span><strong class="cq-sum"></strong></div>
          <div class="stat"><span>Stale read possible?</span><strong class="cq-st"></strong></div>
          <div class="stat"><span>Writes work while down ≤</span><strong class="cq-wt"></strong></div>
          <div class="stat"><span>Reads work while down ≤</span><strong class="cq-rt"></strong></div>
        </div>
        <div class="calc-note">This shows the worst case: a write reaches only the first W alive replicas (the others were slow), and a read asks the old replicas first. Read repair happens after a read. Sloppy quorum is off in this widget (strict quorum).</div>`;
      const q = s => el.querySelector(s);
      const nI = q('.cq-n'), wI = q('.cq-w'), rI = q('.cq-r');
      const say = (html, col) => { const r = q('.cq-res'); r.innerHTML = html; r.style.color = col || 'var(--ink)'; };
      const draw = () => {
        wI.max = S.N; rI.max = S.N; nI.value = S.N; wI.value = S.W; rI.value = S.R;
        q('.cq-nv').textContent = S.N; q('.cq-wv').textContent = S.W; q('.cq-rv').textContent = S.R;
        const box = q('.cq-nodes'); box.innerHTML = '';
        S.ver.forEach((v, i) => {
          const dead = S.dead.has(i), inW = S.wset.includes(i), inR = S.rset.includes(i), fresh = v === S.latest;
          const b = document.createElement('button'); b.type = 'button';
          b.setAttribute('aria-label', 'Replica ' + (i + 1) + (dead ? ' down' : ' version ' + v));
          b.style.cssText = `width:64px;padding:6px 0;border-radius:var(--r);border:2px solid ${dead ? 'var(--red)' : inR ? 'var(--violet)' : inW ? 'var(--accent)' : 'var(--line-2)'};background:${dead ? 'var(--surface-2)' : 'var(--surface)'};color:var(--ink);cursor:pointer;font:600 13px var(--f-mono);line-height:1.5`;
          b.innerHTML = `R${i + 1}<br><span style="color:${dead ? 'var(--red)' : fresh ? 'var(--green)' : 'var(--amber)'}">${dead ? 'DOWN' : 'v' + v}</span><br><span style="font-size:11px;color:var(--ink-3)">${[inW ? 'W' : '', inR ? 'R' : ''].filter(Boolean).join('+') || '&nbsp;'}</span>`;
          b.onclick = () => { qc.toggle(i); draw(); };
          box.appendChild(b);
        });
        const sum = S.R + S.W, strong = sum > S.N;
        q('.cq-sum').textContent = `${S.R} + ${S.W} = ${sum} ${strong ? '>' : '≤'} ${S.N}`;
        q('.cq-st').textContent = strong ? 'No (overlap guaranteed)' : 'Yes';
        q('.cq-st').style.color = strong ? 'var(--green)' : 'var(--amber)';
        q('.cq-wt').textContent = S.N - S.W; q('.cq-rt').textContent = S.N - S.R;
      };
      const setN = () => { qc.setN(Number(nI.value)); say('New cluster: all replicas at v1.'); draw(); };
      nI.addEventListener('input', setN);
      wI.addEventListener('input', () => { qc.setW(Number(wI.value)); draw(); });
      rI.addEventListener('input', () => { qc.setR(Number(rI.value)); draw(); });
      [['Dynamo (3,2,2)', 3, 2, 2], ['Fast: W=1, R=1', 3, 1, 1], ['Read-heavy: R=1, W=N', 3, 3, 1], ['5 copies (5,3,3)', 5, 3, 3]].forEach(([t, n, w, r]) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = t;
        b.onclick = () => { qc.setN(n); qc.setW(w); qc.setR(r); say(t + ': all replicas at v1. Now press Write, then Read.'); draw(); };
        q('.cq-pre').appendChild(b);
      });
      q('.cq-write').onclick = () => {
        const r = qc.write();
        if (r.kind === 'wfail') say(`Write FAIL: only ${r.alive} replica alive, W = ${S.W} acks needed. Consistency kept, availability lost.`, 'var(--red)');
        else say(`Write v${r.v} OK: acks from R${r.set.map(i => i + 1).join(', R')}. The other replicas are still old.`, 'var(--green)');
        draw();
      };
      q('.cq-read').onclick = () => {
        const r = qc.read();
        if (r.kind === 'rfail') say(`Read FAIL: only ${r.alive} replica alive, R = ${S.R} needed.`, 'var(--red)');
        else if (r.fresh) say(`Read v${r.got}: got the latest. Overlap (replicas with the latest that were in the read): R${r.overlap.map(i => i + 1).join(', R')}.${r.repaired.length ? ' Read repair: R' + r.repaired.map(i => i + 1).join(', R') + ' updated.' : ''}`, 'var(--green)');
        else say(`STALE READ: got v${r.got}, but the latest is v${S.latest}. The read set (R${r.set.map(i => i + 1).join(', R')}) had no replica with the latest.`, 'var(--amber)');
        draw();
      };
      q('.cq-rep').onclick = () => { qc.repair(); say('Anti-entropy: all alive replicas are at the latest version.'); draw(); };
      say('Press Write, then Read. Then lower W or R, or kill replicas, and try again.');
      draw();
    }},
    { type: 'p', html: `The lab in one table (N = 3):` },
    { type: 'table', head: ['W', 'R', 'R + W > N?', 'Writes survive', 'Reads survive', 'When to use'], rows: [
      ['2', '2', 'Yes (4 > 3)', '1 down', '1 down', 'Default balance: consistent reads, everything works with up to one failure'],
      ['1', '1', 'No (2)', '2 down', '2 down', 'Fastest and most available; stale reads are fine (views, likes)'],
      ['3', '1', 'Yes (4 > 3)', '0 down', '2 down', 'Very many reads, few writes'],
      ['1', '3', 'Yes (4 > 3)', '2 down', '0 down', 'Writes must never fail; reads are costly and fragile'],
    ]},

    { type: 'callout', tone: 'mistake', title: 'Common mistake: "R + W > N = linearizable"', html: `No. R + W &gt; N only makes sure the read set and the write set share one replica. Things can still go wrong:<br>• <strong>Sloppy quorum</strong>: the W acks came from nodes "outside the home" (diagram above), so the overlap guarantee is gone.<br>• <strong>Half-done write</strong>: the write reached 1 replica and then failed (W was not met). The client got an error, but that 1 copy is not removed: some reads may see it, some may not.<br>• <strong>A read and a write at the same time</strong>: while the write is still going on, one read may see the new value and a later read the old one.<br>• <strong>Concurrent writes + last-write-wins</strong>: one write can silently disappear (below).<br>Abadi wrote the same in 2012: Dynamo-style systems become more consistent when you raise R + W, but they do not give full linearizability. If you need linearizable, use a system built on consensus (Raft/Paxos).` },

    { type: 'h2', text: 'Tunable consistency: each query picks its own level' },
    { type: 'p', html: `The biggest benefit of quorums: N is fixed, but W and R can be <strong>different on every request</strong>. In the same database, read the like count at ONE (fast) and the payment status at QUORUM. This is called <strong>tunable consistency</strong>.` },
    { type: 'h3', text: 'Cassandra\'s consistency levels' },
    { type: 'p', html: `Cassandra is built on the Dynamo idea. Here every query is sent with a <strong>consistency level</strong>, which says how many replicas must answer. RF (replication factor) = N, that is, how many copies each row has. <strong>DC (datacenter)</strong> = the data centre of one region; Cassandra can spread one cluster across many DCs.` },
    { type: 'table', head: ['Level', 'How many replicas', 'When'], rows: [
      ['ONE (and TWO, THREE)', '1 (or 2, 3)', 'Fastest and most available; stale reads possible'],
      ['QUORUM', 'Majority: ⌊RF/2⌋ + 1 (with many DCs, of the total RF of all DCs)', 'Write QUORUM + read QUORUM = overlap'],
      ['LOCAL_QUORUM', 'A majority of your own datacenter only', 'Across regions: overlap inside your own DC, no waiting for the other DC (the EL of PACELC)'],
      ['EACH_QUORUM', 'A majority in every datacenter (writes)', 'Safe in every region, but the slowest'],
      ['LOCAL_ONE', '1, from your own DC', 'Avoid cross-region traffic'],
      ['ALL', 'All replicas', 'Most consistent, but one replica down = failure'],
      ['ANY', 'Any node, even a hint is enough (writes only)', 'A write never fails; the weakest durability'],
    ]},
    { type: 'p', html: `The three most common levels with one example (RF = 3; the three replicas take 2 ms, 5 ms and 40 ms to answer, because the third one is in a far zone):` },
    { type: 'list', items: [
      `<strong>ONE:</strong> wait only for the fastest replica: <strong>2 ms</strong>. Works even with 2 replicas down. But ONE write + ONE read has no overlap guarantee: you may get old data.`,
      `<strong>QUORUM:</strong> wait for 2 replicas, that is, the second fastest: <strong>5 ms</strong>. Survives 1 replica down. QUORUM write + QUORUM read = 2 + 2 &gt; 3, overlap guaranteed.`,
      `<strong>ALL:</strong> wait for all three, that is, the slowest one: <strong>40 ms</strong>. Even one replica down = the request fails. The least available.`,
    ]},
    { type: 'p', html: `Now mix them yourself. Choose different levels for write and read, kill replicas, and see how latency, overlap and failure change:` },
    { type: 'custom', render(el) {
      const LAT = { 3: [2, 5, 40], 5: [2, 4, 6, 40, 60] };
      const need = (lv, rf) => lv === 'ONE' ? 1 : lv === 'QUORUM' ? Math.floor(rf / 2) + 1 : rf;
      function tunCore(rf, wl, rl, dead) {
        const alive = LAT[rf].filter((_, i) => !dead.includes(i)).sort((a, b) => a - b);
        const nw = need(wl, rf), nr = need(rl, rf);
        const res = n => alive.length >= n ? { ok: true, ms: alive[n - 1] } : { ok: false };
        return { nw, nr, w: res(nw), r: res(nr), overlap: nw + nr > rf, wTol: rf - nw, rTol: rf - nr };
      }
      let rf = 3, wl = 'QUORUM', rl = 'QUORUM', dead = [];
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center">
          <span style="display:flex;flex-wrap:wrap;gap:6px;align-items:center"><span style="font-size:14px;color:var(--ink-2)">RF (copies):</span><span class="tu-rf" style="display:flex;gap:6px"></span></span>
          <span style="display:flex;flex-wrap:wrap;gap:6px;align-items:center"><span style="font-size:14px;color:var(--ink-2)">Write level:</span><span class="tu-w" style="display:flex;gap:6px;flex-wrap:wrap"></span></span>
          <span style="display:flex;flex-wrap:wrap;gap:6px;align-items:center"><span style="font-size:14px;color:var(--ink-2)">Read level:</span><span class="tu-r" style="display:flex;gap:6px;flex-wrap:wrap"></span></span>
        </div>
        <div style="font-size:13px;color:var(--ink-3);margin-top:8px">Click a replica to take it down / up. Each box shows how long that replica takes to answer.</div>
        <div class="tu-nodes" style="display:flex;flex-wrap:wrap;gap:8px;margin:8px 0"></div>
        <div class="stats">
          <div class="stat"><span>Write</span><strong class="tu-wo"></strong></div>
          <div class="stat"><span>Read</span><strong class="tu-ro"></strong></div>
          <div class="stat"><span>Overlap guaranteed? (W + R &gt; RF)</span><strong class="tu-ov"></strong></div>
          <div class="stat"><span>How many down it survives (write / read)</span><strong class="tu-tol"></strong></div>
        </div>
        <div class="calc-note tu-note"></div>`;
      const q = s => el.querySelector(s);
      const chips = (box, opts, cur, set) => { box.innerHTML = ''; opts.forEach(v => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (v === cur ? ' on' : ''); b.textContent = v; b.onclick = () => { set(v); draw(); }; box.appendChild(b); }); };
      const draw = () => {
        chips(q('.tu-rf'), [3, 5], rf, v => { rf = v; dead = []; });
        chips(q('.tu-w'), ['ONE', 'QUORUM', 'ALL'], wl, v => { wl = v; });
        chips(q('.tu-r'), ['ONE', 'QUORUM', 'ALL'], rl, v => { rl = v; });
        const box = q('.tu-nodes'); box.innerHTML = '';
        LAT[rf].forEach((ms, i) => { const d = dead.includes(i); const b = document.createElement('button'); b.type = 'button';
          b.style.cssText = `width:62px;padding:6px 0;border-radius:var(--r);border:2px solid ${d ? 'var(--red)' : 'var(--line-2)'};background:${d ? 'var(--surface-2)' : 'var(--surface)'};color:var(--ink);cursor:pointer;font:600 13px/1.5 var(--f-mono)`;
          b.innerHTML = `R${i + 1}<br><span style="color:${d ? 'var(--red)' : 'var(--ink-2)'}">${d ? 'DOWN' : ms + ' ms'}</span>`;
          b.onclick = () => { dead = d ? dead.filter(x => x !== i) : [...dead, i]; draw(); }; box.appendChild(b); });
        const r = tunCore(rf, wl, rl, dead);
        const out = (x, n) => x.ok ? `OK, ${x.ms} ms (waits for ${n})` : `FAIL (${n} needed)`;
        q('.tu-wo').textContent = out(r.w, r.nw); q('.tu-wo').style.color = r.w.ok ? 'var(--green)' : 'var(--red)';
        q('.tu-ro').textContent = out(r.r, r.nr); q('.tu-ro').style.color = r.r.ok ? 'var(--green)' : 'var(--red)';
        q('.tu-ov').textContent = `${r.nw} + ${r.nr} ${r.overlap ? '>' : '≤'} ${rf}: ${r.overlap ? 'Yes' : 'No, a stale read is possible'}`; q('.tu-ov').style.color = r.overlap ? 'var(--green)' : 'var(--amber)';
        q('.tu-tol').textContent = `${r.wTol} / ${r.rTol}`;
        q('.tu-note').textContent = !r.w.ok || !r.r.ok ? 'Fewer replicas are alive than the level needs: the request returns an error. Consistency kept, availability lost.'
          : r.overlap ? `Every read touches at least one replica that has the latest write. The price: waiting up to ${Math.max(r.w.ms, r.r.ms)} ms.`
          : `Fastest (up to ${Math.max(r.w.ms, r.r.ms)} ms), but a read may go to replicas that did not take the write: fine for views/likes, not for usernames.`;
      };
      draw();
    }},
    { type: 'p', html: `Be sure to try this: RF = 3, QUORUM/QUORUM, and kill the fastest replica R1. The request still works, but the latency goes from 5 ms to <strong>40 ms</strong>, because the second answer now comes from the far replica. A quorum survives a failure, but you see its price in latency.` },
    { type: 'p', html: `For versions, Cassandra does <strong>not use vector clocks</strong>. Instead it keeps a timestamp with every column, and in a conflict <strong>the bigger timestamp wins</strong> (last-write-wins, per cell). Along with the levels above, it also runs read repair, hinted handoff and Merkle-tree anti-entropy repair, just like Dynamo. If an operation needs to be linearizable (like "give the username only if it is free"), Cassandra's <strong>lightweight transactions</strong> are used (based on Paxos, <code>IF NOT EXISTS</code>): quite slow, so only once in a while.` },
    { type: 'h3', text: 'DynamoDB' },
    { type: 'p', html: `In Amazon DynamoDB (the name matches, but inside it is leader-based; see the replication lesson) the choice is made on every read: by default an <strong>eventually consistent read</strong>, or with <code>ConsistentRead: true</code> a <strong>strongly consistent read</strong>, which shows the latest successful write and costs twice as much. Global secondary indexes and streams are only eventually consistent. Multi-region <strong>global tables</strong> are eventually consistent by default (usually reaching other regions within a second), and since June 2025 multi-Region strong consistency (MRSC) is also generally available: a write is copied to another region synchronously before it returns. That is the EC of PACELC, paid for with latency.` },

    { type: 'h2', text: 'Conflict resolution: when two copies clash' },
    { type: 'p', html: `In AP systems, multi-leader setups and sloppy quorums, <strong>two writes at the same time</strong> (or on both sides of a partition) can hit the same key. Both replicas said "success" for their own version. When the network joins again, there are two different versions. Which one do we keep? There are three main ways, from the simplest to the smartest.` },
    { type: 'callout', tone: 'term', title: 'Concurrent writes', html: `<strong>What it is:</strong> two writes are <strong>concurrent</strong> if, when one happened, it did not know about the other: A did not see B, and B did not see A.<br><strong>Why it matters:</strong> this is not about "the same second". Two writes 5 minutes apart can still be concurrent if there was a partition in between. For concurrent writes there is no correct answer to "who was first", so we need a rule to merge them.<br><strong>Without it:</strong> the system silently picks one write and the other user's work disappears.<br><strong>Example:</strong> during a partition, Riya (Mumbai) set the bio to "tea lover", and on Aman's laptop with the same account (Singapore) it became "coffee lover". Both got "saved". The network joined again: now there are two versions.` },

    { type: 'h3', text: '1. Last-write-wins (LWW)' },
    { type: 'p', html: `Put a timestamp on every write. In a conflict, the one with the bigger timestamp wins; the other is silently thrown away. It is simple and needs no extra data, so it is very popular: Cassandra does this for every cell, and DynamoDB global tables (in the default mode) also let the last writer win in conflicts between regions. In the Dynamo paper, one session-data service also chose this mode.` },
    { type: 'p', html: `Two problems: (1) with concurrent writes, one write is <strong>always lost</strong>, even if both users got "saved". (2) The timestamp comes from each machine's own clock, and machine clocks never match perfectly. This is called <strong>clock skew</strong>. With NTP, clocks usually stay within milliseconds of each other, but with a wrong config, a VM pause or network trouble, the skew can become very large. See for yourself what happens:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>How far ahead Node A's clock is: <strong class="lw-sv"></strong></label><input class="lw-s" type="range" min="0" max="200" step="5" value="50"></div>
          <div><label>How long after Riya Aman wrote (real time): <strong class="lw-gv"></strong></label><input class="lw-g" type="range" min="5" max="200" step="5" value="30"></div>
        </div>
        <div class="ascii lw-tl" style="margin-top:10px;white-space:pre;overflow-x:auto;font:12.5px/1.5 var(--f-mono)"></div>
        <div class="stats">
          <div class="stat"><span>Riya's timestamp (Node A)</span><strong class="lw-ta"></strong></div>
          <div class="stat"><span>Aman's timestamp (Node B)</span><strong class="lw-tb"></strong></div>
          <div class="stat"><span>Whom LWW kept</span><strong class="lw-w"></strong></div>
        </div>
        <div class="calc-note lw-note"></div>`;
      function lwwCore(skew, gap) {
        const tsA = 100 + skew, tsB = 100 + gap;
        const winner = tsB > tsA ? 'Aman' : tsA > tsB ? 'Riya' : 'tie';
        return { tsA, tsB, winner, lost: winner !== 'Aman' };
      }
      const q = s => el.querySelector(s);
      const upd = () => {
        const skew = Number(q('.lw-s').value), gap = Number(q('.lw-g').value), r = lwwCore(skew, gap);
        q('.lw-sv').textContent = skew + ' ms'; q('.lw-gv').textContent = gap + ' ms';
        q('.lw-ta').textContent = r.tsA + ' ms'; q('.lw-tb').textContent = r.tsB + ' ms';
        q('.lw-w').textContent = r.winner === 'tie' ? 'Equal!' : r.winner;
        q('.lw-w').style.color = r.lost ? 'var(--red)' : 'var(--green)';
        q('.lw-tl').textContent = `Real time:   Riya writes @100 ms (Node A)   Aman writes @${100 + gap} ms (Node B)\nTimestamp:   Riya = ${r.tsA}   Aman = ${r.tsB}\nReally newer: Aman's bio   →   LWW keeps: ${r.winner === 'tie' ? 'tie-break rule' : r.winner + '\'s bio'}`;
        q('.lw-note').textContent = r.winner === 'Aman'
          ? `Fine: the skew (${skew} ms) is smaller than the gap (${gap} ms), so the timestamps showed the real order. Riya's write was still dropped, but it really was older.`
          : r.winner === 'tie'
            ? `The timestamps are equal (${r.tsA} ms). Now some tie-break rule (like comparing node ids or values) wins, not the real order. Aman's newer write may be lost.`
            : `DATA LOSS: Aman wrote later, but Node A's clock was ${skew} ms ahead, so Riya's older write looked "newer". Aman got "saved", and his bio silently disappeared. Whenever skew > gap, LWW reverses the real order.`;
      };
      ['.lw-s', '.lw-g'].forEach(s => q(s).addEventListener('input', upd));
      upd();
    }},
    { type: 'p', html: `<strong>When LWW is fine:</strong> when data is immutable (every write has a unique key, like events with a UUID: there is never a conflict), or when losing some writes is acceptable (last-seen time, cache-like data). <strong>When it is not:</strong> counters, carts, and anywhere every user's edit matters.` },

    { type: 'h3', text: '2. Vector clocks: first find out if there is a conflict at all' },
    { type: 'p', html: `The real pain of LWW: it cannot tell a <strong>"newer version"</strong> from a <strong>"concurrent version"</strong>. It always makes one of them win. Dynamo used <strong>vector clocks</strong> for this.` },
    { type: 'callout', tone: 'term', title: 'Vector clock', html: `<strong>What it is:</strong> a small list stored with every version: <strong>(server, counter)</strong> pairs, like <code>[(Sx, 2), (Sy, 1)]</code>. The server that handles a write adds 1 to its own counter. It is the "family history" of the version.<br><strong>How to compare:</strong> if all of A's counters are ≤ B's counters, then A is older and B continues its story: throw A away. If A is bigger in one counter and B is bigger in another, they are <strong>concurrent</strong>: a real conflict. Then keep both versions (<strong>siblings</strong>) and let the app merge them.<br><strong>Why we need it:</strong> LWW cannot tell "newer" from "concurrent". A vector clock can.<br><strong>Without it:</strong> in a concurrent edit, one user's work silently disappears.` },
    { type: 'p', html: `Below is the same example as in the Dynamo paper (D1 to D5, servers Sx, Sy, Sz), only the data is an xyz.com video watchlist. Go step by step, and compare any two versions:` },
    { type: 'custom', render(el) {
      function vcCompare(a, b) {
        const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
        let le = true, ge = true;
        keys.forEach(k => { const x = a[k] || 0, y = b[k] || 0; if (x > y) le = false; if (x < y) ge = false; });
        if (le && ge) return 'same';
        if (le) return 'before';
        if (ge) return 'after';
        return 'concurrent';
      }
      const V = [
        { id: 'D1', c: { Sx: 1 }, items: ['Dangal'], t: 'Riya made a watchlist and added "Dangal". Server Sx handled the write and set its counter to 1.' },
        { id: 'D2', c: { Sx: 2 }, items: ['Dangal', 'Lagaan'], t: 'Riya added "Lagaan". Sx handled it again: Sx = 2. D2\'s clock is ≥ D1\'s everywhere, so D2 is newer and D1 can be thrown away.' },
        { id: 'D3', c: { Sx: 2, Sy: 1 }, items: ['Dangal', 'Lagaan', 'Sholay'], t: 'Riya\'s phone read D2 and added "Sholay". This time server Sy handled it: D2\'s clock + (Sy, 1).' },
        { id: 'D4', c: { Sx: 2, Sz: 1 }, items: ['Dangal', 'Lagaan', 'PK'], t: 'At the same time Riya\'s laptop had also read D2 (not D3) and added "PK". Server Sz handled it. Now D3 and D4 do not know about each other: CONCURRENT. The system keeps both (siblings).' },
        { id: 'D5', c: { Sx: 3, Sy: 1, Sz: 1 }, items: ['Dangal', 'Lagaan', 'Sholay', 'PK'], t: 'On the next read the app got both D3 and D4. The app merged them (the union of both lists) and wrote through Sx. The new clock is the max of both clocks + one tick for Sx: D5 is newer than both, the conflict is over.' },
      ];
      let k = 0;
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
          <button type="button" class="btn small ghost vc-prev">Previous</button>
          <button type="button" class="btn small primary vc-next">Next step</button>
          <strong class="vc-step" style="font-family:var(--f-mono)"></strong>
        </div>
        <div class="vc-text" style="margin:10px 0;font-size:15px"></div>
        <div class="vc-list" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px"></div>
        <div class="calc-note vc-leaf"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:12px">
          <span style="font-size:14px;color:var(--ink-2)">Compare two versions:</span>
          <select class="vc-a" aria-label="First version" style="background:var(--surface);color:var(--ink);border:1px solid var(--line-2);border-radius:var(--r-sm);padding:4px 6px;font:14px var(--f-body)"></select><select class="vc-b" aria-label="Second version" style="background:var(--surface);color:var(--ink);border:1px solid var(--line-2);border-radius:var(--r-sm);padding:4px 6px;font:14px var(--f-body)"></select>
        </div>
        <div class="vc-cmp" style="margin-top:8px;font-size:14px"></div>`;
      const q = s => el.querySelector(s);
      const fmt = c => '[' + Object.keys(c).map(n => `(${n}, ${c[n]})`).join(', ') + ']';
      const leaves = () => V.slice(0, k + 1).filter(v => !V.slice(0, k + 1).some(o => o !== v && vcCompare(v.c, o.c) === 'before'));
      const fillSel = (sel, def) => { sel.innerHTML = V.slice(0, k + 1).map(v => `<option>${v.id}</option>`).join(''); sel.value = def; };
      const cmp = () => {
        const a = V.find(v => v.id === q('.vc-a').value), b = V.find(v => v.id === q('.vc-b').value), r = vcCompare(a.c, b.c);
        const msg = { same: `${a.id} and ${b.id} are the same version.`, before: `${a.id} → ${b.id}: ${b.id} is newer (every counter ≥, at least one bigger). ${a.id} can be thrown away.`, after: `${b.id} → ${a.id}: ${a.id} is newer. ${b.id} can be thrown away.`, concurrent: `${a.id} ∥ ${b.id}: CONCURRENT. Each has something the other does not (one counter is bigger in one, another counter in the other). Keep both; the app will merge.` }[r];
        q('.vc-cmp').innerHTML = `<span style="font-family:var(--f-mono)">${fmt(a.c)} vs ${fmt(b.c)}</span><br><strong style="color:${r === 'concurrent' ? 'var(--amber)' : 'var(--ink)'}">${msg}</strong>`;
      };
      const draw = () => {
        q('.vc-step').textContent = `Step ${k + 1} / ${V.length}`;
        q('.vc-text').textContent = V[k].t;
        q('.vc-prev').disabled = k === 0; q('.vc-next').disabled = k === V.length - 1;
        const lv = leaves();
        q('.vc-list').innerHTML = V.slice(0, k + 1).map(v => {
          const live = lv.includes(v);
          return `<div style="border:1.5px solid ${live ? (lv.length > 1 ? 'var(--amber)' : 'var(--green)') : 'var(--line)'};border-radius:var(--r-sm);padding:8px;background:var(--surface);opacity:${live ? 1 : 0.55}">
            <strong>${v.id}</strong> <span style="font-size:12px;color:var(--ink-3)">${live ? 'kept' : 'old, throw away'}</span>
            <div style="font:12.5px var(--f-mono);margin:4px 0">${fmt(v.c)}</div>
            <div style="font-size:13px;color:var(--ink-2)">${v.items.join(', ')}</div></div>`;
        }).join('');
        q('.vc-leaf').textContent = lv.length > 1 ? `The store has ${lv.length} siblings: ${lv.map(v => v.id).join(' and ')}. Neither is newer than the other, so the system cannot choose by itself.` : `Only ${lv[0].id} is left in the store: all the others are its older versions.`;
        fillSel(q('.vc-a'), V[Math.max(0, k - 1)].id); fillSel(q('.vc-b'), V[k].id); cmp();
      };
      q('.vc-prev').onclick = () => { k = Math.max(0, k - 1); draw(); };
      q('.vc-next').onclick = () => { k = Math.min(V.length - 1, k + 1); draw(); };
      q('.vc-a').onchange = cmp; q('.vc-b').onchange = cmp;
      draw();
    }},
    { type: 'p', html: `Some real lessons from the Dynamo paper: (1) The app does the merge, so an "add" is never lost; but <strong>a delete can come back</strong>: if the laptop removed "Dangal" and the phone concurrently added something, Dangal returns in the union. (2) To stop a vector clock from growing too long, when the pairs pass a limit (about 10 in the paper's example) the oldest pair is removed; this can sometimes wrongly report "concurrent", but the problem did not show up in production. (3) In one day of measurement, <strong>99.94%</strong> of the shopping cart service's requests saw exactly one version: conflicts are real, but rare. The full theory of vector clocks and Lamport timestamps is in the "Consensus, Raft and clocks" lesson.` },

    { type: 'h3', text: '3. CRDTs: data that merges itself' },
    { type: 'p', html: `Vector clocks <em>find</em> conflicts, but the app still has to write the merge. Can we design the data itself so that the merge is always automatic and correct? Yes, for some data types.` },
    { type: 'callout', tone: 'term', title: 'CRDT (Conflict-free Replicated Data Type)', html: `<strong>What it is:</strong> data types whose merge rule is designed with maths so that if you merge in any order, any number of times (even if the same update arrives twice), in the end all replicas reach the <strong>same value</strong>. Shapiro and colleagues defined them formally in 2011.<br><strong>Why we need it:</strong> in an AP system every replica accepts writes without asking anyone. With a CRDT, the merge needs no coordination and no custom app code.<br><strong>Without it:</strong> either LWW (writes are lost) or vector clocks + the app's own merge code.<br><strong>Example:</strong> a likes counter: 2 in Mumbai, 3 in Singapore. After the merge both show 5, no matter how many times or in what order they sync.` },
    { type: 'p', html: `The simplest CRDT: the <strong>G-counter</strong> (grow-only counter). Instead of one number, each replica has <strong>its own slot</strong>: <code>{A: 2, B: 3, C: 0}</code>. A replica only increases its own slot. Merge = the <strong>max</strong> of each slot. Value = the <strong>sum</strong> of all slots. Below, add likes on three replicas and sync them. Next to it runs a "naive" counter that keeps just one number and takes the max of the two numbers on merge:` },
    { type: 'custom', render(el) {
      function gcounterCore() {
        const ids = ['A', 'B', 'C'];
        const S = { g: {}, naive: {} };
        const reset = () => { ids.forEach(r => { S.g[r] = { A: 0, B: 0, C: 0 }; S.naive[r] = 0; }); };
        reset();
        return {
          S, ids, reset,
          inc(r) { S.g[r][r]++; S.naive[r]++; },
          sync(x, y) { ids.forEach(k => { const m = Math.max(S.g[x][k], S.g[y][k]); S.g[x][k] = m; S.g[y][k] = m; }); const n = Math.max(S.naive[x], S.naive[y]); S.naive[x] = n; S.naive[y] = n; },
          value(r) { return ids.reduce((s, k) => s + S.g[r][k], 0); },
          truth() { return ids.reduce((s, k) => s + Math.max(...ids.map(r => S.g[r][k])), 0); },
        };
      }
      const g = gcounterCore();
      el.innerHTML = `<div class="gc-reps" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px">
          <span style="font-size:14px;color:var(--ink-2)">Sync (gossip):</span>
          <button type="button" class="btn small ghost" data-s="A,B">A ↔ B</button>
          <button type="button" class="btn small ghost" data-s="B,C">B ↔ C</button>
          <button type="button" class="btn small ghost" data-s="A,C">A ↔ C</button>
          <button type="button" class="btn small ghost gc-reset">Reset</button>
        </div>
        <div class="stats">
          <div class="stat"><span>Real total likes</span><strong class="gc-t"></strong></div>
          <div class="stat"><span>G-counter (A / B / C)</span><strong class="gc-g"></strong></div>
          <div class="stat"><span>Naive counter (A / B / C)</span><strong class="gc-n"></strong></div>
        </div>
        <div class="calc-note gc-note"></div>`;
      const q = s => el.querySelector(s);
      const draw = () => {
        const box = q('.gc-reps'); box.innerHTML = '';
        g.ids.forEach(r => {
          const d = document.createElement('div');
          d.style.cssText = 'border:1px solid var(--line);border-radius:var(--r-sm);padding:8px;background:var(--surface)';
          d.innerHTML = `<strong>Replica ${r}</strong><div style="font:12.5px/1.6 var(--f-mono);margin:4px 0">{ ${g.ids.map(k => `${k}: ${g.S.g[r][k]}`).join(', ')} }<br>value = ${g.value(r)}<br><span style="color:var(--ink-3)">naive = ${g.S.naive[r]}</span></div>`;
          const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small primary'; b.textContent = 'Like +1 here';
          b.onclick = () => { g.inc(r); draw(); };
          d.appendChild(b); box.appendChild(d);
        });
        const t = g.truth(), gv = g.ids.map(r => g.value(r)), nv = g.ids.map(r => g.S.naive[r]);
        q('.gc-t').textContent = t; q('.gc-g').textContent = gv.join(' / '); q('.gc-n').textContent = nv.join(' / ');
        const conv = gv.every(v => v === t), naiveLoss = t - Math.max(...nv);
        q('.gc-note').textContent = conv && t > 0
          ? `G-counter: all three replicas converge on ${t}, not a single like lost.${naiveLoss > 0 ? ` The naive counter (merge = max of two numbers) is stuck at ${Math.max(...nv)}: ${naiveLoss} likes gone.` : ''}`
          : t === 0 ? 'Press Like on different replicas (for example 2 on A, 3 on B), then Sync.' : `The replicas differ right now (${gv.join(' / ')}). Keep syncing: each sync takes the max of every slot.`;
      };
      el.querySelectorAll('[data-s]').forEach(b => { b.onclick = () => { const [x, y] = b.dataset.s.split(','); g.sync(x, y); draw(); }; });
      q('.gc-reset').onclick = () => { g.reset(); draw(); };
      draw();
    }},
    { type: 'p', html: `Try this: 2 likes on A, 3 likes on B, then A ↔ B. The G-counter shows 5 on both, the naive one 3 on both: 2 likes gone. Then 1 like on C, B ↔ C, A ↔ C: the G-counter shows 6 on all three, the naive one is stuck at 3. And press A ↔ B again and again: the G-counter stays at 6 (taking the max again changes nothing), whereas if the merge were "add them up", the count would double on every sync.` },
    { type: 'table', head: ['CRDT', 'What it does', 'In xyz.com'], rows: [
      ['G-counter', 'A counter that only grows: one slot per replica, merge = max', 'Views, likes'],
      ['PN-counter', 'Two G-counters: one for plus, one for minus; value = P - N', 'Both like and unlike'],
      ['OR-set (observed-remove set)', 'A set with both add and remove; a concurrent add wins', 'Watchlist, tags, group members'],
      ['Sequence / text CRDTs', 'A list of characters where everyone types at the same time', 'Collaborative docs (Google Docs lesson)'],
    ]},
    { type: 'p', html: `In the real world: Riak offered CRDT data types like counters, sets and maps; Redis Active-Active (multi-region) databases run on CRDTs; and many collaborative editing tools use CRDTs, or techniques inspired by them, for "multiplayer" editing. <strong>The limit:</strong> not every business rule fits in a CRDT. "The balance must never go below 0" or "a seat goes to only one person" cannot be merged without coordination: those need CP.` },

    { type: 'table', head: ['Method', 'How', 'Benefit', 'Price'], rows: [
      ['Last-write-wins', 'The bigger timestamp wins', 'Simplest, no extra data', 'Concurrent writes are lost; with clock skew even a newer write can be lost'],
      ['Vector clocks + siblings', 'Use version history to tell "newer" from "concurrent"; if concurrent, the app merges', 'Nothing is silently lost', 'The app must write the merge; deletes can come back; clocks grow large'],
      ['CRDTs', 'The data type\'s merge is correct by its maths', 'Automatic, coordination-free merge', 'Only some data types; business rules (balance ≥ 0) are not protected'],
      ['Do not let conflicts happen', 'One owner/leader per key (CP)', 'No merge at all', 'The minority side is unavailable during a partition'],
    ]},

    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Decide: quorum and consistency level', html: `With <strong>N = 3, W = 2, R = 2</strong>, every read touches at least one replica that holds the latest write. Keep this as the default. Where slightly old data is fine (views, likes, feeds), <strong>lower W or R</strong> for speed (for example ONE). Where you need linearizable (username, seat, money), do not trust a quorum: use a consensus-based store (etcd, Spanner, SQL with a leader) or Cassandra's lightweight transactions.` },
    { type: 'table', head: ['Feature', 'Model', 'How'], rows: [
      ['Username, seat, balance', 'Linearizable', 'A leader / consensus store, conditional writes'],
      ['Chat, comment threads', 'Causal', 'Info on each message about "which message it replies to"; a sticky replica for the client'],
      ['Your own profile, your own post', 'Read-your-writes', 'Your own reads from the leader for a few seconds, or a replica position check'],
      ['Inbox, comment list', 'Monotonic reads', 'Keep the user sticky to one replica'],
      ['Views, likes', 'Eventual + CRDT counter', 'ONE level, G/PN-counter merge'],
      ['Profile bio (multi-region)', 'Eventual + LWW', 'Fine if an edit is lost once in a while; otherwise vector clocks/siblings'],
    ]},
    { type: 'diagram', title: 'Consistency and quorums: the whole picture', height: 530,
      groups: [
        { label: 'N = 3 replicas (one key)', x: 28, y: 258, w: 526, h: 108 },
      ],
      nodes: [
        { id: 'app', label: 'xyz.com app', sub: 'a level per query', x: 360, y: 50, w: 180, kind: 'client', info: 'What it is: the xyz.com code. It picks a level for each feature: views at ONE, bio at QUORUM, username on the consensus store.' },
        { id: 'coord', label: 'Coordinator', sub: 'N=3, W/R per query', x: 290, y: 170, w: 180, kind: 'server', info: 'What it is: the node that handles the request. It sends a write to N replicas and waits for W acks; on a read it takes R answers, picks the newest version and read-repairs any old replica.' },
        { id: 'cons', label: 'Consensus store', sub: 'username, seat', x: 590, y: 170, w: 180, kind: 'data', info: 'What it is: a store built on Raft/Paxos (etcd, Spanner, SQL with a leader). Where you need linearizable (username, seat, money), use this instead of a quorum. During a partition the minority side stops.' },
        { id: 'r1', label: 'Replica 1', sub: 'v2 + version', x: 110, y: 320, kind: 'data', info: 'What it is: one copy of the key, with version info (a vector clock in Dynamo, a timestamp in Cassandra). LWW, siblings or a CRDT merge is applied here when there is a conflict.' },
        { id: 'r2', label: 'Replica 2', sub: 'v2', x: 290, y: 320, kind: 'data', info: 'What it is: the second copy. With W = 2 and R = 2, this or some other replica is shared by the read group and the write group: the overlap.' },
        { id: 'r3', label: 'Replica 3', sub: 'v1 (behind)', x: 470, y: 320, kind: 'data', info: 'What it is: the third copy, behind right now. Read repair, hinted handoff or anti-entropy brings it up to date. A ONE read that lands here gets old data.' },
        { id: 'hint', label: 'Node D', sub: 'hint for R3', x: 640, y: 320, w: 130, kind: 'data', info: 'What it is: the next healthy node on the ring. Replica 3 was down, so the sloppy quorum put the write here with a hint. When R3 came back: hinted handoff.' },
        { id: 'ae', label: 'Anti-entropy', sub: 'Merkle-tree repair', x: 290, y: 470, w: 180, kind: 'queue', info: 'What it is: a background job that compares the replicas\' data and fixes differences. Even data that nobody reads becomes the same in the end (eventual consistency).' },
      ],
      edges: [
        { a: 'app', b: 'coord', n: 1, label: 'GET / PUT' },
        { a: 'app', b: 'cons', label: 'strong ops' },
        { a: 'coord', b: 'r1', n: 2 },
        { a: 'coord', b: 'r2' },
        { a: 'coord', b: 'r3' },
        { a: 'coord', b: 'hint', dashed: true, label: 'sloppy write' },
        { a: 'hint', b: 'r3', kind: 'evt' },
        { a: 'ae', b: 'r1', kind: 'evt', dashed: true },
        { a: 'ae', b: 'r2', kind: 'evt', dashed: true },
        { a: 'ae', b: 'r3', kind: 'evt', dashed: true },
      ],
      paths: [
        { name: 'QUORUM write + read', text: 'R1 and R2 acked the write (W = 2). The read goes to R2 and R3 (R = 2): R2 is shared, the new version wins, and R3 gets read repair.', go: ['app>coord>r1', 'coord>r2', 'coord>r3'] },
        { name: 'ONE read (fast)', text: 'An answer from just one replica: the fastest. If it goes to R3, it gets the old v1. Fine for views/likes.', go: ['app>coord>r3'] },
        { name: 'Replica down: hinted handoff', text: 'R3 was down. The write went to Node D with a hint. When R3 came back, Node D handed the data over.', go: ['app>coord>hint>r3'] },
        { name: 'Username (linearizable)', text: 'A unique username does not use a quorum but the consensus store: "give it only if it is free".', go: ['app>cons'] },
        { name: 'Background repair', text: 'Anti-entropy compares replicas with Merkle trees and fixes the one that is behind.', go: ['ae>r1', 'ae>r2', 'ae>r3'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Consistency is a ladder: linearizable → sequential → causal → (read-your-writes, monotonic reads) → eventual. Higher = stricter and slower.</li>
      <li>Linearizable = like one copy, real-time order. Sequential = everyone sees one order, real time not needed. Causal = cause first, effect after.</li>
      <li>Read-your-writes and monotonic reads are promises for one user's session: read from the leader, use a sticky replica.</li>
      <li>Quorum: if <strong>R + W &gt; N</strong>, the read and the write share at least one replica. (3, 2, 2) is the default.</li>
      <li>Tunable: ONE (fast, may be old), QUORUM (balance), ALL (strictest, one down = failure).</li>
      <li>A quorum is not linearizable either: sloppy quorums, half-done writes, LWW. Hinted handoff and anti-entropy fix things later.</li>
      <li>Conflicts: LWW (simple, writes get lost), vector clocks (detect the conflict, the app merges), CRDTs (merge themselves, like the G-counter).</li>
    </ul>` },

    { type: 'tradeoffs',
      gains: ['Each feature gets exactly the promise it needs: less latency, less cost', 'Quorums: surviving failures without failover (N - W for writes, N - R for reads)', 'Tunable levels: fast and safe queries in the same database', 'Vector clocks and CRDTs: even in AP systems, writes are not silently lost'],
      costs: ['Weak models give strange results (old data, reversed order) that the app must be ready for', 'Strong models: coordination on every operation, latency, errors during a partition', 'A quorum is not linearizable either (sloppy quorum, half-done writes, LWW)', 'LWW loses data through clock skew; vector clocks/CRDTs make both the app and storage more complex'],
    },

    { type: 'think', questions: [
      { q: 'N = 5. You want writes to survive 2 failures and reads to be fresh. What W and R will you choose?', a: 'For writes to survive 2 failures, W ≤ 3. For fresh reads, R + W > 5, so with W = 3, R ≥ 3. So (N, W, R) = (5, 3, 3): both writes and reads survive 2 failures, and the overlap is guaranteed. (With sloppy quorum turned off.)' },
      { q: 'For xyz.com\'s "follow" button you need to show a follower count, and a user can also unfollow. Is a G-counter enough?', a: 'No, a G-counter only grows. You need a PN-counter: one G-counter for follows, one for unfollows, value = P - N. And a question like "does Riya follow Aman?" is about a set: use a CRDT like an OR-set, or keep that relation in one place (a leader).' },
      { q: 'Cassandra runs in two data centres, with RF = 3 in each DC. The Mumbai app servers write and read at LOCAL_QUORUM. What is guaranteed for Mumbai users, and for Singapore users?', a: 'Inside Mumbai, a LOCAL_QUORUM write (2 of 3) + a LOCAL_QUORUM read (2 of 3) overlap, so Mumbai users see the latest without waiting for Singapore (fast). Singapore users (who read LOCAL_QUORUM from their own DC) will see Mumbai\'s write once the async copy arrives: eventual for them. This is the EL choice of PACELC.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'N = 3, W = 1, R = 1. Is a stale read possible?', options: ['No, because there are 3 copies', 'Yes, because R + W = 2 ≤ N, so the read and write sets can be different', 'Only when a replica is down'], answer: 1, explain: 'The write goes to one replica, the read to another: no overlap. Even when all replicas are alive.' },
      { q: 'In chat, Neha saw Aman\'s "yes!" but not Riya\'s question "movie?". Which model was broken?', options: ['Causal consistency', 'Read-your-writes', 'Monotonic reads'], answer: 0, explain: 'The answer happened because of the question. Causal consistency says the cause always shows before the effect.' },
      { q: 'What is the relation between the vector clocks [(Sx, 2), (Sy, 1)] and [(Sx, 2), (Sz, 1)]?', options: ['The first is newer', 'The second is newer', 'Concurrent: keep both and merge'], answer: 2, explain: 'Sy is bigger in the first, Sz is bigger in the second. Neither fully covers the other: concurrent.' },
      { q: 'With LWW, when is a newer write lost even if the writes are not concurrent?', options: ['Never', 'When the clock of the node with the older write is so far ahead that its timestamp is bigger (clock skew)', 'When N is very large'], answer: 1, explain: 'The timestamp comes from the machine\'s clock. Skew > the gap between writes = the order is reversed and the newer write is wiped out.' },
      { q: 'The biggest risk of a sloppy quorum?', options: ['Writes become slow', 'The W acks may come from nodes outside the home, so even with R + W > N a read may return old data', 'Data is deleted permanently'], answer: 1, explain: 'It gives up the overlap guarantee for availability. Hinted handoff later carries the data to the real replica.' },
    ]},
    { type: 'sources', note: 'The Dynamo paper was read in full; the numbers and examples (3,2,2), D1-D5, 99.94% and truncation at ~10 come from it. Product behaviour comes from official docs.', items: [
      { title: 'Dynamo: Amazon\'s Highly Available Key-value Store', publisher: 'SOSP 2007 (Amazon)', official: true, year: 2007, url: 'https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf', used: 'N/R/W and R + W > N, the common (3,2,2), sloppy quorum + hinted handoff (node A/D example), the D1-D5 vector clock example, syntactic vs semantic reconciliation, deleted items coming back, clock truncation, Merkle-tree anti-entropy, read-heavy R=1/W=N, LWW mode, 99.94% single version.' },
      { title: 'Dynamo-style architecture and consistency levels', publisher: 'Apache Cassandra documentation', official: true, url: 'https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html', used: 'ONE/TWO/THREE/QUORUM/ALL/LOCAL_QUORUM/EACH_QUORUM/LOCAL_ONE/ANY, last-write-wins through per-cell timestamps (not vector clocks), read repair, hinted handoff, anti-entropy repair.' },
      { title: 'How is the consistency level configured?', publisher: 'DataStax Cassandra documentation', official: true, url: 'https://docs.datastax.com/en/cassandra-oss/3.0/cassandra/dml/dmlConfigConsistency.html', used: 'The QUORUM formula (the total of RFs across DCs), the meaning of LOCAL_QUORUM.' },
      { title: 'DynamoDB read consistency', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html', used: 'Eventually vs strongly consistent reads, cost, GSIs/streams only eventual, global tables MREC vs MRSC.' },
      { title: 'DynamoDB global tables with multi-Region strong consistency is now generally available', publisher: 'AWS What\'s New', official: true, year: 2025, url: 'https://aws.amazon.com/about-aws/whats-new/2025/06/amazon-dynamo-db-global-tables-multi-region-strong-consistency-generally-available/', used: 'The MRSC GA date (June 2025).' },
      { title: 'Consistency Models', publisher: 'Jepsen', url: 'https://jepsen.io/consistency/models', used: 'Definitions of linearizable, sequential and causal, and which models can stay available during a partition.' },
      { title: 'Consistency Tradeoffs in Modern Distributed Database System Design', publisher: 'Daniel Abadi, IEEE Computer', year: 2012, url: 'https://www.cs.umd.edu/~abadi/papers/abadi-pacelc.pdf', used: 'Even with R + W > N, Dynamo-style systems do not give full (Gilbert-Lynch) consistency.' },
      { title: 'Conflict-free Replicated Data Types', publisher: 'Shapiro, Preguiça, Baquero, Zawirski (SSS 2011 / INRIA)', year: 2011, url: 'https://hal.inria.fr/inria-00609399v1', used: 'The CRDT definition, convergence through state-based merge (max), G-counter / PN-counter / OR-set.' },
    ]},
  ],
});
