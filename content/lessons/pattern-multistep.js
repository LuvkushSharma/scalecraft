Lesson.register({
  id: 'pattern-multistep',
  title: 'Multi-step processes',
  minutes: 28,
  summary: `Kuch kaam ek request mein khatam nahi hote: creator payout mein checks, finance approval, bank transfer aur notification hain, aur beech mein ghanton ya din lag sakte hain. Is lesson mein: explicit state machines (galat transition reject), orchestration vs choreography ka chunaav, workflow engines (Temporal, Step Functions), timeouts aur human steps.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Kuch kaam ek jhatke mein nahi hote. Creator ko paisa bhejna = check karo, kabhi kabhi insaan se approve karwao, bank ko bhejo, email karo.<br>Ye kadam alag alag jagah hote hain, aur beech mein ghante ya din lag sakte hain.<br>Beech mein computer crash ho jaaye, bank down ho, ya insaan chhutti pe ho, to kaam aadha atak jaata hai.<br>Is lesson mein hum ek seedhi chadhenge: ek simple transaction se shuru, phir "state machine", phir saga (galti pe ulta karne wale steps), aur aakhir mein workflow engine jo crash ke baad bhi wahin se kaam aage badhata hai.` },
    { type: 'h2', text: 'Problem: payout script jo beech mein mar gaya' },
    { type: 'p', html: `xyz.com har mahine creators ko unki video earnings bhejta hai. Pehla version ek raat ka <strong>cron script</strong> tha (cron = server ka alarm clock, jo ek fixed time pe program chala deta hai, jaise roz raat 2 baje): earnings nikalo, KYC/tax check karo, bank ko transfer bhejo, email karo. Status ke liye table mein kuch boolean columns: <code>is_checked</code>, <code>is_approved</code>, <code>is_paid</code>, <code>is_failed</code>.` },
    { type: 'p', html: `Phir teen cheezein huin:` },
    { type: 'list', items: [
      '<strong>Script beech mein crash</strong> hua (naya code deploy hua, ya memory khatam: OOM, out of memory). Kuch creators ko transfer gaya, kuch ko nahi. Agli raat script ne <em>sabko</em> phir se bheja, kyunki <code>is_paid</code> bank ka jawab aane ke baad set hota tha. Kai creators ko double paisa.',
      '<strong>Ajeeb combinations:</strong> ek row mein <code>is_paid = true</code> aur <code>is_failed = true</code> dono. Matlab kya? Paisa gaya ya nahi? Kisi ko nahi pata. 4 booleans = 16 combinations, jinme se zyadatar bekaar hain.',
      '<strong>Insaan ka step:</strong> finance team ne kaha "₹5 lakh se bada payout hum dekh ke approve karenge". Cron script ek raat mein chalta hai; approval 2 din mein aata hai. Script kahan ruke, kab jaage?',
    ]},
    { type: 'p', html: `Ye sab ek hi problem ke roop hain: kaam <strong>kai steps</strong> ka hai, steps alag systems (DB, bank, insaan) mein hain, aur beech mein <strong>kuch bhi fail ya ruk</strong> sakta hai. Ise kehte hain multi-step process. E-commerce order lifecycle, ride lifecycle, payment, onboarding, video publish: sab yahi hain.` },
    { type: 'callout', tone: 'term', title: 'Multi-step process (workflow)', html: `<strong>Ye kya hai:</strong> ek business kaam jo kai kadmon mein, alag alag waqt pe hota hai, aur jiska har kadam pichhle ke result pe depend karta hai. Isko <strong>workflow</strong> bhi kehte hain. Jaise "order → payment → packing → delivery".<br><strong>Kyun samajhna zaroori:</strong> iske teen dushman hain: <strong>crash</strong> (beech mein ruk gaya), <strong>duplicate</strong> (ek kadam do baar chala), aur <strong>intezaar</strong> (bank ya insaan ka jawab ghanton baad).<br><strong>Iske bina (agar dhyaan na diya):</strong> double payout, atke hue orders, aur koi nahi jaanta ki kaam kahan ruka.` },
    { type: 'h2', text: 'Multi-step ki seedhi: paanch dande' },
    { type: 'p', html: `Contention lesson jaisa hi niyam: <strong>neeche se shuru karo</strong>, upar tabhi jao jab neeche wala danda kaam na kare.` },
    { type: 'ascii', caption: 'Neeche se upar padho.', text: `  5  Workflow engine        Temporal / Step Functions: crash ke baad wahin se,
     ^                         timers, retries, insaan ke steps, din/hafte
     ^  jab: bahut steps + lambe wait + insaan + compensation
  4  Saga + compensation    har step ka "ulta step" (refund, seat chhodo)
     ^  jab: steps alag services/systems mein, ek transaction mumkin nahi
  3  State machine + queue  har step ek queue job + "sweeper" jo atke rows
     +  sweeper              dhoondh ke aage badhaye (crash ke baad resume)
     ^  jab: steps lambe/async hain, crash pe resume chahiye
  2  Explicit state machine ek state column, transitions ek jagah, galat reject
     ^  jab: kaam ki "haalat" ghanton/din tak rehti hai
  1  Ek DB transaction      sab steps ek hi database ke andar: BEGIN ... COMMIT
     ^  jab: sab kuch ek DB mein, milliseconds ka kaam` },
    { type: 'h2', text: 'Danda 1: sab ek DB mein? Bas ek transaction' },
    { type: 'p', html: `<strong>Kahani:</strong> creator apne xyz.com wallet se ₹500 "Super Thanks" doosre creator ko bhejta hai. Do kaam: Riya ke wallet se −500, Kabir ke wallet mein +500. Dono rows ek hi Postgres mein. Yahan kisi state machine ya engine ki zaroorat nahi:` },
    { type: 'code', text: `BEGIN;
UPDATE wallets SET balance = balance - 500 WHERE user_id = 'riya' AND balance >= 500;  -- 1 row?
UPDATE wallets SET balance = balance + 500 WHERE user_id = 'kabir';
INSERT INTO transfers (from_user, to_user, amount) VALUES ('riya', 'kabir', 500);
COMMIT;   -- teeno ya koi nahi. Crash beech mein = database khud ROLLBACK karta hai` },
    { type: 'callout', tone: 'tip', title: 'Yahin ruk jao agar...', html: `...saare steps ek hi database mein hain aur milliseconds mein khatam ho jaate hain. Roadmap ka rule: <strong>ek database ke andar, normal transaction use karo.</strong> Crash, duplicate aur aadha kaam, teeno database khud sambhaal leta hai. Upar tab jao jab koi step <em>database ke bahar</em> hai (bank API, email, doosri service) ya ghanton ka intezaar hai. Gehrai: <a href="#/sql-vs-nosql">Databases (ACID)</a>, <a href="#/distributed-tx">Distributed transactions</a>.` },
    { type: 'h2', text: 'Danda 2: Explicit state machine' },
    { type: 'p', html: `<strong>Kahani:</strong> payout transaction mein fit nahi hota: bank ek alag company hai, aur finance ka approval 2 din leta hai. Kaam ki "haalat" ghanton ya din tak database mein rehni padegi. Pehle version ne ye haalat 4 booleans mein rakhi, aur 40,000 payouts mein se ~300 ajeeb combinations mein phans gaye. Pehla sudhaar: haalat ko ek saaf <strong>state machine</strong> banao.` },
    { type: 'callout', tone: 'term', title: 'State machine', html: `<strong>Ye kya hai:</strong> (finite state machine) teen cheezon ki list: (1) <strong>states</strong>: cheez kis haalat mein ho sakti hai, ek waqt mein sirf ek; (2) <strong>events</strong>: kya ho sakta hai ("bank ne success bola"); (3) <strong>transitions</strong>: kis state mein kaunsa event aaye to kis state mein jaana hai. Jo transition list mein nahi, wo <em>reject</em>. Jaise traffic light: laal se seedha hara, phir peela; laal se peela kabhi nahi.<br><strong>Kyun chahiye:</strong> har payout ki ek saaf haalat, aur galat ya duplicate events apne aap ruk jaate hain.<br><strong>Iske bina:</strong> booleans ka jungle, "paid bhi aur failed bhi" jaisi impossible haalat, double payout.` },
    { type: 'p', html: `4 booleans ki jagah ek column: <code>state</code>. Payout ki haalat ab sirf in mein se ek ho sakti hai:` },
    { type: 'table', caption: 'Creator payout: poori transition table. Jo isme nahi, wo reject.', head: ['From state', 'Event', 'To state', 'Shart (guard)'], rows: [
      ['PENDING', 'start', 'CHECKING', '-'],
      ['CHECKING', 'checks_passed', 'APPROVED', 'amount ≤ ₹5 lakh'],
      ['CHECKING', 'checks_passed', 'NEEDS_APPROVAL', 'amount > ₹5 lakh'],
      ['CHECKING', 'checks_failed', 'FAILED', '-'],
      ['NEEDS_APPROVAL', 'approve / reject', 'APPROVED / REJECTED', 'sirf finance role'],
      ['NEEDS_APPROVAL', 'timeout_48h', 'NEEDS_APPROVAL', 'state wahi, finance head ko escalate'],
      ['APPROVED', 'send', 'SENDING', '-'],
      ['SENDING', 'bank_ok / bank_failed', 'PAID / FAILED', '-'],
      ['FAILED', 'retry', 'CHECKING', 'attempts < 3'],
      ['PENDING, CHECKING, NEEDS_APPROVAL, APPROVED', 'cancel', 'CANCELLED', 'SENDING ke baad nahi'],
    ]},
    { type: 'list', items: [
      '<strong>Terminal states</strong>: PAID, REJECTED, CANCELLED. Inse bahar koi transition nahi. Kitne bhi duplicate events aayein, PAID payout dobara SENDING nahi ho sakta.',
      '<strong>Guards</strong>: kuch transitions sharton pe chalte hain. <code>checks_passed</code> amount dekh ke APPROVED ya NEEDS_APPROVAL mein bhejta hai. <code>retry</code> sirf 3 attempts tak.',
      '<strong>Galat transition = error, chup-chaap nahi:</strong> SENDING mein <code>cancel</code> aaya? Reject (409 Conflict). Paisa bank ki taraf ja chuka hai; cancel ka matlab ab "refund/reversal" hai, jo ek alag process hai.',
      '<strong>History</strong>: har transition ek append-only (sirf naye rows judte hain, purane kabhi badalte nahi) <code>payout_events</code> table mein (kab, kisne, kis event se). Support ko "payout 77 kahan atka?" ka jawab ek query mein.',
    ]},
    { type: 'p', html: `Sabse zaroori trick: transition ek <strong>conditional UPDATE</strong> hai, bilkul <a href="#/pattern-contention">Contention lesson</a> ke compare-and-set jaisa. Isse do workers ya do duplicate webhooks ek hi transition do baar nahi kar sakte:` },
    { type: 'code', text: `-- event: bank_ok for payout 77
UPDATE payouts
   SET state = 'PAID', version = version + 1, updated_at = now()
 WHERE id = 77 AND state = 'SENDING';         -- sirf sahi "from" state se
-- 1 row  → transition hua, ab side effect (email) bhejo
-- 0 rows → ya to duplicate (already PAID) ya galat event: reject / ignore
INSERT INTO payout_events (payout_id, from_state, to_state, event, at)
VALUES (77, 'SENDING', 'PAID', 'bank_ok', now());    -- same transaction mein` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "status column to pehle se hai, state machine ho gaya"', html: `Sirf <code>status</code> column rakhna state machine nahi hai. Agar code kahin bhi <code>UPDATE payouts SET status = 'PAID'</code> likh sakta hai, bina check kiye ki abhi state kya hai, to tumhare paas bas ek string hai. State machine tab hai jab <strong>transitions ek jagah define</strong> hain, har update "from state" check karta hai, aur galat transition reject hota hai.` },
    { type: 'h2', text: 'Khud chala ke dekho: payout state machine' },
    { type: 'p', html: `Payout #77 ke saath khelo. Bhare hue buttons abhi ki state ke valid events hain; khaali (ghost) buttons bhi dabao aur dekho ki state machine unhe kaise reject karti hai. Try karo: (1) ₹40,000 ka payout seedha PAID tak; (2) ₹8,00,000 wala NEEDS_APPROVAL pe rukta hai, wahan <code>timeout_48h</code> dabao; (3) PAID ke baad <code>bank_ok</code> dobara (duplicate webhook) ya <code>cancel</code> dabao; (4) SENDING mein <code>cancel</code>; (5) <code>bank_failed</code> aur <code>retry</code> teen baar.` },
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
        retry: { from: ['FAILED'], dt: 60, to: () => 'CHECKING', guard: s => s.attempts < MAXA ? '' : 'attempts = ' + s.attempts + ', limit 3 khatam: insaan dekhega' },
        cancel: { from: PRE, dt: 1, to: () => 'CANCELLED' },
      };
      const TERMINAL = ['PAID', 'REJECTED', 'CANCELLED'];
      const fresh = amount => ({ state: 'PENDING', amount, attempts: 0, version: 1, clock: 0, esc: 0, hist: [], rejected: 0 });
      function pmApply(s, ev) {
        const d = EV[ev];
        if (!d.from.includes(s.state)) {
          s.rejected++;
          const why = TERMINAL.includes(s.state) ? s.state + ' terminal state hai, yahan se koi raasta nahi' : (ev === 'cancel' && s.state === 'SENDING') ? 'paisa bank ki taraf ja chuka hai; ab cancel nahi, reversal process chahiye' : `"${ev}" sirf ${d.from.join(' / ')} se allowed hai`;
          return { ok: false, msg: `409 Conflict: ${s.state} mein "${ev}" allowed nahi. ${why}.`, sql: `UPDATE payouts SET ... WHERE id = 77 AND state IN ('${d.from.join("','")}')\n→ 0 rows (state abhi ${s.state} hai). Kuch nahi badla.` };
        }
        const g = d.guard ? d.guard(s) : '';
        if (g) { s.rejected++; return { ok: false, msg: `Rejected by guard: ${g}.`, sql: `-- guard fail, UPDATE chala hi nahi` }; }
        const from = s.state, to = d.to(s);
        s.clock += d.dt; s.version++;
        if (ev === 'retry' || ev === 'start') s.attempts++;
        if (ev === 'timeout_48h') s.esc++;
        s.state = to;
        s.hist.push({ at: s.clock, from, to, ev });
        const extra = ev === 'timeout_48h' ? ' State wahi, lekin finance head ko escalation gaya (escalations = ' + s.esc + ').' : ev === 'checks_passed' ? (to === 'NEEDS_APPROVAL' ? ' Guard: amount ₹5 lakh se zyada, isliye insaan ki approval chahiye.' : ' Guard: amount ₹5 lakh tak, seedha APPROVED.') : '';
        return { ok: true, msg: `OK: ${from} → ${to} (event "${ev}").${extra}`, sql: `UPDATE payouts SET state = '${to}', version = ${s.version}\n WHERE id = 77 AND state = '${from}';   → 1 row\nINSERT INTO payout_events VALUES (77, '${from}', '${to}', '${ev}', ...);` };
      }
      const POS = { PENDING: [70, 40], CHECKING: [225, 40], NEEDS_APPROVAL: [400, 40], REJECTED: [600, 40], APPROVED: [400, 135], SENDING: [600, 135], PAID: [600, 230], FAILED: [225, 230], CANCELLED: [70, 230] };
      const LINKS = [['PENDING', 'CHECKING', 'start'], ['CHECKING', 'NEEDS_APPROVAL', '> ₹5L'], ['NEEDS_APPROVAL', 'REJECTED', 'reject'], ['CHECKING', 'APPROVED', '≤ ₹5L'], ['NEEDS_APPROVAL', 'APPROVED', 'approve'], ['APPROVED', 'SENDING', 'send'], ['SENDING', 'PAID', 'bank_ok'], ['SENDING', 'FAILED', 'bank_failed'], ['CHECKING', 'FAILED', 'failed / retry', 1]];
      const NS = 'http://www.w3.org/2000/svg';
      el.innerHTML = `<div class="pm-amt" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px"><span style="font-size:14px;color:var(--ink-2)">Payout amount (reset karta hai):</span></div>
        <svg class="pm-svg" viewBox="0 0 700 262" style="width:100%;height:auto;display:block" role="img" aria-label="Payout state machine"></svg>
        <div style="font-size:13px;color:var(--ink-3);margin:2px 0 10px">Bhara hua box = abhi ki state. Hara dashed border = yahan se aage kahan ja sakte ho. CANCELLED: SENDING se pehle kisi bhi state se.</div>
        <div class="pm-evs" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <div class="pm-msg calc-note" style="font-weight:600"></div>
        <div class="stats">
          <div class="stat"><span>State (DB mein)</span><strong class="pm-st"></strong></div>
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
      amts.forEach(([v, l]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = l; b.dataset.v = v; b.onclick = () => { s = fresh(v); last = { ok: true, msg: 'Naya payout #77 bana: PENDING. Events dabao.', sql: `INSERT INTO payouts (id, state, amount, version) VALUES (77, 'PENDING', ${v}, 1);` }; draw(); }; amtBox.appendChild(b); });
      const evBox = $('.pm-evs');
      Object.keys(EV).forEach(k => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small'; b.textContent = k; b.dataset.ev = k; b.onclick = () => { last = pmApply(s, k); draw(); }; evBox.appendChild(b); });
      let last = { ok: true, msg: 'Payout #77 PENDING mein hai. Koi bhi event dabao, galat wale bhi: dekho kya reject hota hai.', sql: `INSERT INTO payouts (id, state, amount, version) VALUES (77, 'PENDING', 40000, 1);` };
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
        $('.pm-hist').innerHTML = s.hist.length ? s.hist.map(h => `<li>${fmtClock(h.at)}  ${h.from} → ${h.to}  (${h.ev})</li>`).join('') : '<li>(abhi khaali)</li>';
      }
      draw();
    }},
    { type: 'p', html: `Dhyaan do: FAILED mein 3 attempts ke baad <code>retry</code> bhi reject hota hai. Ye bug nahi, design hai: machine ab haar maan ke payout ko ek <strong>ops queue</strong> mein daalti hai jahan insaan dekhega. Har state machine ka ek "atak gaya, insaan bulao" raasta hona chahiye.` },
    { type: 'callout', tone: 'tip', title: 'Yahin ruk jao agar...', html: `...har step chhota hai aur ek hi request ke andar ho jaata hai (user click pe ek transition), aur crash pe "kaam wahin se aage" ki zaroorat nahi (user dobara click kar lega). Order status, ticket status, moderation status: inke liye state column + conditional UPDATE kaafi hai. Upar tab jao jab steps lambe hain, background mein chalte hain, aur crash ke baad koi aur unhe aage badhaye. Gehrai: <a href="#/pattern-contention">Contention (conditional UPDATE)</a>.` },

    { type: 'h2', text: 'Danda 3: State machine + queue workers + sweeper' },
    { type: 'p', html: `<strong>Kahani:</strong> state machine ne batana shuru kiya ki <em>kya allowed hai</em>. Lekin steps chalaata kaun hai? Pehle sab ek cron script mein tha, jo crash pe sab bhool jaata tha. Ab xyz.com har step ko ek <a href="#/queues">queue</a> job banata hai: "payout 77 ke checks chalao", "payout 77 bank ko bhejo". Workers jobs uthate hain, step karte hain, state badalte hain, aur agla job daalte hain. Ek raat 40,000 payouts mein se ~120 kisi crash ki wajah se beech mein ruk gaye. Unhe kaun jagaayega?` },
    { type: 'callout', tone: 'term', title: 'Sweeper job', html: `<strong>Ye kya hai:</strong> ek chhota scheduled job (maan lo har 10 minute) jo DB mein aise rows dhoondhta hai jo bahut der se ek beech wali state mein atke hain. Jaise "2 ghante se zyada SENDING". Unke liye wo agla step dobara queue mein daal deta hai, ya alarm bajata hai.<br><strong>Kyun chahiye:</strong> worker crash ho gaya to queue ka message kho sakta hai ya DLQ mein ja sakta hai. State DB mein hai, to sweeper wahin se kaam <strong>resume</strong> kar sakta hai.<br><strong>Iske bina:</strong> atke hue payouts chup-chaap pade rehte hain, jab tak creator shikayat na kare.` },
    { type: 'callout', tone: 'term', title: 'Idempotency key', html: `<strong>Ye kya hai:</strong> har request ke saath ek unique naam (jaise <code>payout-77-2026-09</code>). Paane wala (bank) yaad rakhta hai ki ye key pehle aa chuki hai, aur dobara aaye to kaam dobara nahi karta, bas purana result lautata hai.<br><strong>Kyun chahiye:</strong> resume ka matlab hai "step dobara chalana". Agar pichhli baar bank ko paisa chala gaya tha lekin hamein jawab nahi mila, to dobara bhejna = double payout.<br><strong>Iske bina:</strong> har crash + retry ek doosra transfer. Poori kahani <a href="#/pagination-idempotency">Idempotency lesson</a> mein.` },
    { type: 'code', text: `-- sweeper, har 10 minute
SELECT id, state FROM payouts
 WHERE state IN ('CHECKING', 'SENDING') AND updated_at < now() - interval '2 hours';
-- har row ke liye: us state ka step dobara queue mein daalo
--   CHECKING → enqueue(run_checks, id)
--   SENDING  → enqueue(send_transfer, id)   -- same idempotency key ke saath!` },
    { type: 'callout', tone: 'tip', title: 'Yahin ruk jao agar...', html: `...steps 2-4 hain, ek hi team/service ke hain, koi step database ke bahar galti hone pe "ulta" karna nahi padta, aur lamba insaani intezaar nahi hai. Video publish (upload → transcode → ready) ke liye ye kaafi hai. Lekin dhyaan do: retries, backoff, timers, sweeper, monitoring, sab tumne khud likha. Jab ye code badhne lage, ya kisi step ki galti pe pichhle steps ulte karne padein, upar chado. Gehrai: <a href="#/queues">Message queues</a>, <a href="#/pattern-long-tasks">Long-running tasks</a>.` },
    { type: 'h2', text: 'Danda 4: Saga + compensation' },
    { type: 'p', html: `<strong>Kahani:</strong> xyz.com ek creator meetup ka ticket bechta hai. Teen services, teen databases: (1) Seats service seat hold karti hai, (2) Payments service ₹999 kaatti hai, (3) Tickets service QR ticket banati hai. Ek din Tickets service 20 minute down rahi. 340 logon ka paisa kat gaya, seat bhi hold, lekin ticket nahi. Teen alag databases mein ek <code>BEGIN ... COMMIT</code> chal hi nahi sakta. Chahiye: "aage nahi badh sakte to pichhle kadam <strong>ulte</strong> karo".` },
    { type: 'callout', tone: 'term', title: 'Saga', html: `<strong>Ye kya hai:</strong> ek lamba kaam jo chhote local transactions ki line hai (har service apne DB mein apna transaction). Har step ke saath ek <strong>compensation</strong> (ulta step) likha hota hai. Koi step fail hua to ab tak ke steps ke compensations ulte order mein chalte hain.<br><strong>Kyun chahiye:</strong> jab steps alag services/databases mein hain, ek bada transaction mumkin nahi. Saga "sab ya kuch nahi" ko kadam-kadam se bana leta hai.<br><strong>Iske bina:</strong> aadhe kaam: paisa kata, ticket nahi; seat hold, kabhi chhoota nahi.` },
    { type: 'callout', tone: 'term', title: 'Compensation (ulta step)', html: `<strong>Ye kya hai:</strong> kisi ho chuke step ko business ke hisaab se "wapas" karna. Payment ka compensation = refund. Seat hold ka = seat release. Email ka? Undo nahi ho sakta, isliye "sorry, ticket cancel" wala doosra email.<br><strong>Kyun chahiye:</strong> database ka ROLLBACK sirf uske andar kaam karta hai. Bank ya doosri service mein jo ho gaya, wo sirf ek naye, ulte kaam se theek hota hai.<br><strong>Iske bina:</strong> fail hone pe system galat haalat mein chhoot jaata hai.<br><strong>Dhyaan:</strong> compensation bhi fail ho sakta hai, isliye wo bhi retry + idempotent hona chahiye.` },
    { type: 'ascii', caption: 'Meetup ticket saga: step 3 fail hua, to compensations ulte order mein', text: `aage  →   1. hold seat A12      2. charge ₹999        3. issue ticket  ✗ (down)
ulta  ←   1'. release seat A12  2'. refund ₹999       (3 hua hi nahi)
nateeja:  seat wapas sabke liye, paisa wapas Riya ko, aur Riya ko saaf message` },
    { type: 'callout', tone: 'term', title: 'Orchestration vs choreography', html: `<strong>Ye kya hai:</strong> saga ke steps chalane ke do tareeke. <strong>Orchestration</strong> = ek "conductor" (orchestrator) service har step ko bulati hai aur faisla leti hai ki aage kya. <strong>Choreography</strong> = koi conductor nahi; har service ek event sunti hai ("SeatHeld"), apna kaam karti hai, aur naya event chhodti hai ("PaymentDone").<br><strong>Kyun chahiye:</strong> flow chhota aur teams alag hain to choreography halki hai. Flow lamba hai, compensations aur timeouts hain, to ek jagah likha orchestrator samajhna aur debug karna aasaan.<br><strong>Iske bina (galat chunaav):</strong> choreography mein bada flow kai services mein bikhar jaata hai, aur "ticket kahan atka?" koi nahi bata sakta.` },
    { type: 'callout', tone: 'term', title: 'Transactional outbox', html: `<strong>Ye kya hai:</strong> service apne DB mein state badalti hai <em>aur</em> usi transaction mein ek "outbox" table mein event ki row likhti hai. Ek alag relay process outbox se events padh ke Kafka/queue mein bhejta hai.<br><strong>Kyun chahiye:</strong> "DB update + event bhejo" do alag systems hain. DB update hua aur event bhejne se pehle crash = agla step kabhi shuru nahi hoga.<br><strong>Iske bina:</strong> choreography saga beech mein chup-chaap toot jaata hai. Detail <a href="#/distributed-tx">Distributed transactions</a> mein.` },
    { type: 'h3', text: 'Saga ko chalaayega kaun? Teen tareeke' },
    { type: 'p', html: `State machine batati hai ki <em>kya allowed hai</em>. Lekin kisi ko to steps chalane hain: checks ka API call, 48 ghante ka intezaar, bank ko 5 baar retry, crash ke baad wahin se shuru. Teen common tareeke hain. Sagas aur compensation ki aur gehri theory <a href="#/distributed-tx">Sagas aur distributed transactions</a> lesson mein hai; yahan sirf chunaav ki baat:` },
    { type: 'table', head: ['Tareeka', 'Kaise chalta hai', 'Achha jab', 'Dikkat'], rows: [
      ['DB state machine + workers + sweeper', 'State table, har step ek queue job, ek cron "sweeper" jo atke hue rows (jaise 2 ghante se SENDING) dhoondhta hai', '2-4 steps, ek team, koi lamba intezaar nahi', 'Retries, timers, resume, monitoring sab khud likhna; complexity dheere dheere badhti hai'],
      ['Choreography (events)', 'Koi boss nahi. Har service event sunti hai aur apna kaam karke naya event chhodti hai (Kafka)', 'Alag teams, loosely coupled, flow simple aur linear', 'Poora flow kisi ek jagah likha nahi; "payout 77 kahan atka?" dhoondhna mushkil; cyclic events ka khatra'],
      ['Orchestration (workflow engine)', 'Ek orchestrator code/definition jo steps bulata hai; engine state, retries, timers durable rakhta hai', 'Bahut steps, retries, timeouts, insaan ke steps, din/hafton lambe flows', 'Naya infra seekhna/chalana; workflow code ke rules (determinism, versioning)'],
    ]},
    { type: 'callout', tone: 'tip', title: 'Yahin ruk jao agar...', html: `...saga mein 2-3 steps hain aur compensation simple hai. Chhota orchestrator (ya choreography + outbox) apne DB state machine ke saath kaafi hai. Upar tab jao jab: steps 5+ hain, din/hafton ke timers hain, insaan ke steps hain, aur har step ke retries, timeouts aur compensations ka code tumhare business logic se bada hone laga. Gehrai: <a href="#/distributed-tx">Sagas aur distributed transactions</a>, <a href="#/kafka">Kafka</a>.` },
    { type: 'h2', text: 'Danda 5: Workflow engine (durable execution)' },
    { type: 'callout', tone: 'term', title: 'Workflow engine (durable execution)', html: `<strong>Ye kya hai:</strong> ek service jo tumhare multi-step process ki state khud durable (crash pe bhi na khone wale) store mein rakhti hai. Tum normal code jaisa likhte ho: "checks karo, phir agar amount bada hai to approval ka 48 ghante wait karo, phir bank ko bhejo". Engine har kadam ka result record karta hai. Worker machine crash ho to doosri machine wahin se aage chalati hai. Do mashhoor naam: <strong>Temporal</strong> (open source; workflow normal code mein: Go, Java, Python, TypeScript...) aur <strong>AWS Step Functions</strong> (managed; workflow ek JSON state machine, Amazon States Language mein).<br><strong>Kyun chahiye:</strong> danda 3-4 mein jo retries, timers, sweeper aur resume tumne khud likhe the, wo engine deta hai.<br><strong>Iske bina:</strong> har team apna aadha-adhoora "mini engine" likhti hai, alag alag bugs ke saath.` },
    { type: 'callout', tone: 'term', title: 'Activity, signal, durable timer', html: `<strong>Ye kya hai:</strong> Temporal ke teen shabd. <strong>Activity</strong> = ek step jo bahar ki duniya chhoota hai (DB write, bank call, email); engine ise retry karta hai. <strong>Signal</strong> = bahar se chal rahe workflow ko bheja gaya sandesh, jaise finance ka "approve". <strong>Durable timer</strong> = "48 ghante baad jagao" jo engine ki history mein likha hai, kisi machine ki memory mein nahi.<br><strong>Kyun chahiye:</strong> isi se workflow din bhar ruk sakta hai bina kisi thread ko jagaaye rakhe, aur insaan ka jawab sahi workflow tak pahunchta hai.<br><strong>Iske bina:</strong> sleep(48 ghante) wala thread, jo pehle restart pe hi mar jaata.` },
    { type: 'callout', tone: 'term', title: 'Event history aur replay', html: `<strong>Ye kya hai:</strong> engine har workflow ki ek diary rakhta hai: "checks activity schedule hui, result OK aaya, timer laga...". Naya worker workflow code ko shuru se chalata hai, lekin har ho chuke step ka result diary se utha leta hai (dobara chalata nahi). Isse <strong>replay</strong> kehte hain.<br><strong>Kyun chahiye:</strong> isi se crash ke baad "wahin se aage" possible hai.<br><strong>Shart:</strong> workflow code <strong>deterministic</strong> ho (same history pe hamesha same faisle): random number, current time, ya seedha network call workflow code mein nahi, sirf activities mein.` },
    { type: 'p', html: `xyz.com payouts ko Temporal pe le jaata hai. Ab dekho crash, insaan ka intezaar aur bank ka down hona kaise sambhalta hai:` },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'api', label: 'Payout API', sub: 'monthly job', x: 95, y: 80, w: 140, kind: 'server', info: 'Ye kya hai: mahine ka payout shuru karne wali service. Har creator ke liye ek workflow start karti hai, Workflow ID = "payout-77-2026-09". Temporal ek hi ID ka doosra workflow tab start nahi hone deta jab pehla chal raha ho, isliye job do baar chale to bhi duplicate payout workflow nahi banta.' },
        { id: 'eng', label: 'Temporal', sub: 'event history', x: 340, y: 80, w: 150, kind: 'data', info: 'Ye kya hai: workflow engine ka server. Har workflow ki event history durable DB mein rakhta hai: kaunsi activity schedule hui, kya result aaya, kaunsa timer laga, kaunsa signal aaya. Kaam khud nahi karta; workers ko task deta hai aur unke jawab record karta hai.' },
        { id: 'wk', label: 'Worker', sub: 'workflow + activities', x: 340, y: 250, w: 170, kind: 'server', meter: true, load: 30, info: 'Ye kya hai: tumhara code chalane wali machine(s). Workflow code faisle leta hai (deterministic), activities asli side effects karti hain (DB, bank API). Worker mar jaaye to engine kaam doosre worker ko de deta hai.' },
        { id: 'led', label: 'Ledger DB', sub: 'payouts + state', x: 605, y: 250, w: 150, kind: 'data', info: 'Ye kya hai: xyz.com ka paise ka hisaab (ledger) aur payout state table. Activities yahan transitions likhti hain (conditional UPDATE ke saath), taaki support aur reports ke liye state DB mein bhi dikhe.' },
        { id: 'bank', label: 'Bank API', sub: 'transfer', x: 605, y: 80, w: 150, kind: 'net', info: 'Ye kya hai: bahar ka bank/payout partner. Har transfer request ke saath idempotency key (payout id) jaata hai, taaki retry pe paisa do baar na jaaye. Kabhi kabhi down ya slow hota hai.' },
        { id: 'fin', label: 'Finance team', sub: 'approve / reject', x: 95, y: 250, w: 140, kind: 'client', info: 'Ye kya hai: insaan ka step. ₹5 lakh se bade payouts ko dashboard pe approve/reject karte hain. Unka click workflow ko ek signal ke roop mein pahunchta hai.' },
      ],
      edges: [{ a: 'api', b: 'eng' }, { a: 'eng', b: 'wk' }, { a: 'wk', b: 'led' }, { a: 'wk', b: 'bank' }, { a: 'fin', b: 'eng' }],
      scenarios: [
        { name: 'Happy path', intro: '₹40,000 ka payout, koi approval nahi chahiye.', steps: [
          { title: 'Workflow start', text: 'API ne workflow start kiya. Engine history mein pehla event likhta hai.', go: ['api>eng', 'res:eng>api'], after: { eng: { sub: 'payout-77: started' } }, msg: 'StartWorkflow(id="payout-77-2026-09", amount=40000)' },
          { title: 'Checks activity', text: 'Worker task uthata hai, KYC/tax checks chalata hai, ledger mein CHECKING → APPROVED. Result engine ki history mein.', go: ['eng>wk', 'wk>led', 'res:led>wk', 'res:wk>eng'], after: { led: { sub: 'state = APPROVED' } } },
          { title: 'Bank transfer', text: 'Transfer activity bank ko bhejti hai, idempotency key = payout id. Bank OK bolta hai.', go: ['eng>wk', 'wk>bank', 'res:bank>wk'], after: { led: { sub: 'state = SENDING' } }, msg: 'POST /transfers  Idempotency-Key: payout-77-2026-09' },
          { title: 'PAID, workflow complete', text: 'Ledger mein SENDING → PAID, creator ko email, workflow "completed" history mein.', go: ['wk>led', 'res:wk>eng'], after: { led: { state: 'ok', sub: 'state = PAID' }, eng: { state: 'ok', sub: 'payout-77: done' } } },
        ]},
        { name: 'Worker crash', intro: 'Transfer bhejte hi worker machine mar gayi.', steps: [
          { title: 'Transfer gaya, jawab nahi', text: 'Worker ne bank ko request bheji. Bank ne paisa bhej diya. Lekin result engine tak pahunchne se pehle worker crash.', go: ['eng>wk', 'wk>bank', 'res:bank>wk'], after: { wk: { state: 'down', sub: 'CRASHED' } } },
          { title: 'Engine ko pata chalta hai', text: 'Activity ka <strong>Start-To-Close timeout</strong> (maan lo 30 s) beet gaya aur result nahi aaya. Engine maan leta hai attempt fail hua aur retry policy ke hisaab se activity phir schedule karta hai.', focus: ['eng'], set: { eng: { state: 'warn', sub: 'activity timed out' } } },
          { title: 'Naya worker, replay', text: 'Doosra worker workflow history replay karta hai: checks pehle ho chuke the (result history se, dobara nahi chalte). Sirf transfer activity phir chalti hai.', set: { wk: { state: '', sub: 'worker-2 (replay)' } }, go: ['eng>wk', 'wk>bank'], msg: 'POST /transfers  Idempotency-Key: payout-77-2026-09   (same key!)' },
          { title: 'Idempotency bachaata hai', text: 'Bank key pehchaanta hai: "ye transfer to ho chuka", purana result lautata hai, paisa dobara nahi jaata. Engine "kab aur kitni baar" sambhalta hai; "dobara chale to nuksaan na ho" activity ki zimmedari hai.', go: ['res:bank>wk', 'wk>led', 'res:wk>eng'], after: { eng: { state: 'ok', sub: 'payout-77: done' }, led: { state: 'ok', sub: 'state = PAID (once)' } } },
        ]},
        { name: 'Approval + timeout', intro: '₹8 lakh ka payout: finance ki approval chahiye.', steps: [
          { title: 'Workflow ruk ke wait', text: 'Checks ke baad workflow "approve/reject signal ya 48 ghante, jo pehle" ka wait karta hai. Ye durable timer hai: koi thread 48 ghante nahi baitha, sirf history mein ek timer event.', go: ['eng>wk', 'wk>led', 'res:wk>eng'], after: { led: { sub: 'NEEDS_APPROVAL' }, eng: { sub: 'timer 48h + signal' }, wk: { load: 5 } }, msg: 'await condition(() => decision != null, "48h")' },
          { title: 'Do din, koi jawab nahi', text: 'Timer fire hua. Workflow escalation activity chalata hai: finance head ko mail/Slack. Phir naye 48 ghante ka wait. Bina timeout ke ye payout chup-chaap hamesha ke liye atak jaata.', set: { eng: { state: 'warn', sub: 'timer: escalate' } }, go: ['eng>wk'], msg: 'activity: notifyFinanceHead(payout-77)' },
          { title: 'Finance approve karta hai', text: 'Finance head dashboard pe Approve dabaati hai. Ye workflow ko ek <strong>signal</strong> bhejta hai. Do baar click ho jaaye to bhi workflow pehla decision lega; state machine doosre ko ignore karegi.', go: ['fin>eng', 'eng>wk'], after: { eng: { state: '', sub: 'signal: approve' }, fin: { state: 'ok', sub: 'approved' } }, msg: 'SignalWorkflow("payout-77-2026-09", "decision", "approve")' },
          { title: 'Aage badho', text: 'Workflow wahin se aage: transfer activity, PAID. Ek hi code mein insaan ka 2 din ka step aur machine ke millisecond steps.', go: ['wk>bank', 'res:bank>wk', 'wk>led'], after: { led: { state: 'ok', sub: 'state = PAID' } } },
        ]},
        { name: 'Bank down', intro: 'Bank API 3 ghante ke liye down.', steps: [
          { title: 'Transfer fail', text: 'Bank 503 deta hai. Activity fail.', go: ['eng>wk', 'wk>bank', 'bad:bank>wk'], set: { bank: { state: 'down', sub: '503' } } },
          { title: 'Retry with backoff', text: 'Engine retry policy se activity phir chalata hai: 1 s, 2 s, 4 s... har baar double, max gap 100 s (Temporal ka default). Tumne koi retry loop nahi likha.', set: { eng: { state: 'warn', sub: 'retry #6 in 32s' } }, go: ['eng>wk', 'wk>bank', 'bad:bank>wk'] },
          { title: 'Total limit: Schedule-To-Close', text: 'Retries hamesha nahi: is activity ka total time limit 6 ghante rakha (Schedule-To-Close). Bank 3 ghante mein wapas aa gaya, agla retry pass.', set: { bank: { state: '', sub: 'back up' } }, go: ['wk>bank', 'res:bank>wk', 'wk>led'], after: { led: { state: 'ok', sub: 'state = PAID' }, eng: { state: 'ok', sub: 'payout-77: done' } } },
          { title: 'Agar limit cross hoti', text: 'Tab activity finally fail, workflow ka catch block chalta: ledger mein FAILED, reserved paisa wapas creator ke balance mein (compensation), aur ops team ko alert. Har raasta khatam hota hai ek saaf state pe.', focus: ['wk', 'led'] },
        ]},
      ],
    },
    { type: 'h2', text: 'Crash karke dekho: script vs sweeper vs engine' },
    { type: 'p', html: `Ek payout saga: (1) creator ke balance se ₹40,000 <strong>reserve</strong> karo, (2) checks, (3) bank transfer, (4) PAID + email. Teen tareeke chuno, crash ka pal chuno, aur dekho kya hota hai. Try karo: "Cron script" + "bank ke baad crash" + idempotency OFF. Phir "Workflow engine" + "Bank: account band".` },
    { type: 'custom', render(el) {
      const REC = { script: 86400, sweeper: 7800, engine: 30 };
      function msSim(mode, crash, rej, idem) {
        const log = []; let t = 0, transfers = 0, reserves = 0, comp = false, fin = '', bankDone = false, crashed = false;
        const save = st => { if (mode !== 'script') log.push([t, `state = ${st} (DB / history mein save)`]); };
        const run = from => {
          for (let k = from; k <= 4; k++) {
            if (k === 1) { reserves++; t += 1; log.push([t, 'Step 1: ₹40,000 balance se reserve']); save('RESERVED'); if (crash === 'after1' && !crashed) { crashed = true; log.push([t, 'CRASH! worker mar gaya']); return 'crash'; } }
            if (k === 2) { t += 5; log.push([t, 'Step 2: checks OK']); save('CHECKED'); }
            if (k === 3) {
              t += 2;
              if (rej) { log.push([t, 'Step 3: bank ne mana kiya: account band (pakka error, retry bekaar)']); return 'reject'; }
              if (idem && bankDone) log.push([t, 'Step 3: bank ne key pehchaani: "ho chuka", paisa dobara NAHI gaya']);
              else { transfers++; bankDone = true; log.push([t, `Step 3: bank ne ₹40,000 bheje (transfer #${transfers})` + (idem ? ' key = payout-77' : ' bina key')]); }
              if (crash === 'mid3' && !crashed) { crashed = true; log.push([t, 'CRASH! paisa gaya, lekin result save hone se pehle worker mar gaya']); return 'crash'; }
              save('SENT');
            }
            if (k === 4) { t += 1; log.push([t, 'Step 4: PAID + creator ko email']); fin = 'PAID'; return 'done'; }
          }
        };
        let r = run(1);
        if (r === 'crash') {
          t += REC[mode];
          const from = mode === 'script' ? 1 : crash === 'after1' ? 2 : 3;
          log.push([t, mode === 'script' ? 'Agli raat script phir chala: kuch yaad nahi, step 1 se sab dobara' : mode === 'sweeper' ? 'Sweeper ne atka row dekha (2 ghante purana): step ' + from + ' se aage' : 'Engine: activity timeout (30 s), naye worker pe replay: step ' + from + ' se aage']);
          r = run(from);
        }
        if (r === 'reject') {
          if (mode === 'script') { fin = 'pata nahi (sirf error log)'; log.push([t, 'Script ne error log kiya aur aage badh gaya. Reserve kabhi wapas nahi hua.']); }
          else { comp = true; t += 1; log.push([t, 'Compensation: reserve wapas creator ke balance mein']); fin = 'FAILED (paisa wapas)'; log.push([t, 'state = FAILED, ops ko alert']); }
        }
        return { log, transfers, reserves, comp, fin, t };
      }
      el.innerHTML = `<div class="ms-row" data-k="mode" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px"></div>
        <div class="ms-row" data-k="crash" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px"></div>
        <div class="ms-row" data-k="rej" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px"></div>
        <div class="ms-row" data-k="idem" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px"></div>
        <div class="stats">
          <div class="stat"><span>Bank ne kitni baar paisa bheja</span><strong class="ms-tr"></strong></div>
          <div class="stat"><span>Balance se reserve kitni baar</span><strong class="ms-rs"></strong></div>
          <div class="stat"><span>Aakhri state</span><strong class="ms-fin"></strong></div>
          <div class="stat"><span>Kaam khatam hone mein</span><strong class="ms-t"></strong></div>
        </div>
        <ol class="ms-log" style="font:13px/1.5 var(--f-mono);color:var(--ink-2);margin:10px 0 0;padding-left:22px"></ol>
        <div class="calc-note ms-note"></div>`;
      const OPT = {
        mode: [['script', 'Cron script (koi state nahi)'], ['sweeper', 'State machine + sweeper'], ['engine', 'Workflow engine']],
        crash: [['none', 'Koi crash nahi'], ['after1', 'Step 1 ke baad crash'], ['mid3', 'Bank ke baad crash']],
        rej: [[false, 'Bank: OK'], [true, 'Bank: account band']],
        idem: [[true, 'Idempotency key: ON'], [false, 'Idempotency key: OFF']],
      };
      const st = { mode: 'script', crash: 'mid3', rej: false, idem: false };
      const $ = q => el.querySelector(q);
      const dur = x => x < 120 ? x + ' s' : x < 86400 ? Math.floor(x / 3600) + ' h ' + Math.round(x % 3600 / 60) + ' min' : (x / 86400).toFixed(1) + ' din';
      el.querySelectorAll('.ms-row').forEach(row => OPT[row.dataset.k].forEach(([v, name]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = name; b.onclick = () => { st[row.dataset.k] = v; upd(); }; b._v = v; row.appendChild(b); }));
      const upd = () => {
        el.querySelectorAll('.ms-row').forEach(row => row.querySelectorAll('button').forEach(b => b.classList.toggle('on', b._v === st[row.dataset.k])));
        const r = msSim(st.mode, st.crash, st.rej, st.idem);
        $('.ms-tr').textContent = r.transfers; $('.ms-tr').style.color = r.transfers > 1 ? 'var(--red)' : '';
        $('.ms-rs').textContent = r.reserves; $('.ms-rs').style.color = r.reserves > 1 ? 'var(--red)' : '';
        $('.ms-fin').textContent = r.fin; $('.ms-t').textContent = dur(r.t);
        $('.ms-log').innerHTML = r.log.map(([x, m]) => `<li>t=${dur(x)}: ${m}</li>`).join('');
        const n = [];
        if (r.transfers > 1) n.push(`<strong>Double payout!</strong> Bank ke baad crash hua, aur dobara chalane pe bank ko pata nahi tha ki ye wahi transfer hai. Idempotency key ON karke dekho.`);
        if (r.reserves > 1) n.push(`Script ko kuch yaad nahi tha, isliye balance se <strong>do baar reserve</strong> hua. Creator ka balance galat. State save karne wala tareeka chuno.`);
        if (st.rej && !r.comp) n.push(`Bank ne mana kiya, aur script ne bas error likha. ₹40,000 reserve mein <strong>hamesha ke liye atke</strong>. Yahi saga ki compensation ka kaam hai.`);
        if (r.comp) n.push(`Bank ne mana kiya, to compensation chala: reserve wapas balance mein, state FAILED, ops ko alert. Saaf ant.`);
        if (!n.length) n.push(`Sab sahi: ek transfer, ek reserve, PAID. ` + (st.crash !== 'none' ? `Crash ke baad ${dur(REC[st.mode])} mein wahin se resume hua.` : ''));
        $('.ms-note').innerHTML = n.join(' ');
      };
      upd();
    }},
    { type: 'callout', tone: 'tip', title: 'Yahin ruk jao (ye aakhri danda hai)', html: `Workflow engine seedhi ka sabse ooncha danda hai, aur sabse mehenga bhi: naya infra, naye rules (deterministic code, chal rahe workflows ki versioning). Ise tabhi lao jab neeche ke dande ka khud likha code (retries, timers, sweeper, compensations) tumhari team ka sir dard ban gaya ho. Ek chhote 3-step flow ke liye engine "machine gun se makhi maarna" hai. Gehrai: <a href="#/distributed-tx">Sagas</a>, <a href="#/pattern-long-tasks">Long-running tasks</a>, <a href="#/design-payments">Payments design</a>.` },
    { type: 'h2', text: 'Timeouts: har intezaar ki ek deadline' },
    { type: 'p', html: `Multi-step process ka sabse chupa hua bug: koi step <strong>kabhi khatam hi nahi hota</strong>. Bank ne jawab nahi diya, webhook kho gaya, reviewer chhutti pe hai. Koi error nahi, bas ek row jo hamesha "SENDING" mein padi hai. Isliye rule: <strong>har wait state ka ek timeout, aur timeout pe kya karna hai wo bhi state machine ka hissa</strong>.` },
    { type: 'table', head: ['Timeout kis cheez ka', 'Example', 'Timeout pe kya'], rows: [
      ['Ek attempt ka (Temporal: Start-To-Close)', 'Bank API call 30 s mein jawab de', 'Attempt fail maano, retry with backoff'],
      ['Poore step ka, sab retries milake (Schedule-To-Close)', 'Transfer 6 ghante mein ho jaaye', 'Step fail: compensation ya FAILED + ops alert'],
      ['Worker zinda hai? (Heartbeat timeout)', 'Lamba kaam har 10 s mein "main zinda hoon" bole', 'Jaldi pata chale ki worker mar gaya, doosre ko do'],
      ['Bahar ka event (webhook: bahar ki service ka hamare server ko call)', 'Bank ka confirmation webhook 2 ghante mein aaye', 'Khud bank se status poochho (reconciliation), phir faisla'],
      ['Insaan ka step', 'Finance 48 ghante mein approve kare', 'Escalate, ya default action (auto-reject / auto-cancel)'],
      ['User ka step', 'Seat hold ke 10 minute mein payment', 'Hold expire, seat wapas (Contention lesson)'],
    ]},
    { type: 'callout', tone: 'warn', title: 'Webhook pe andha bharosa mat karo', html: `Bahar ke systems (bank, payment gateway) webhooks <strong>der se, do baar, ya galat order mein</strong> bhej sakte hain, ya bilkul nahi. Isliye: (1) har webhook state machine se guzre (galat/duplicate reject); (2) timeout pe khud status API se poochho; (3) roz ek <strong>reconciliation</strong> job (apne records ko bank ke statement se milaana, farak ho to theek karna).` },

    { type: 'h2', text: 'Insaan ke steps (human-in-the-loop)' },
    { type: 'p', html: `Approval, manual KYC review, content moderation, fraud check: ye steps minute se din tak le sakte hain. Inhe sahi se jodne ke liye:` },
    { type: 'list', items: [
      '<strong>Workflow ruk ke wait kare, thread nahi:</strong> state DB/engine mein "NEEDS_APPROVAL", koi process 2 din se jaag ke nahi baitha. Temporal mein ye <em>signal</em> + durable timer hai. Step Functions (Standard) mein <code>.waitForTaskToken</code>: workflow ek token ke saath ruk jaata hai, aur reviewer ka app <code>SendTaskSuccess</code>/<code>SendTaskFailure</code> us token ke saath bhejta hai.',
      '<strong>Task inbox:</strong> reviewer ke liye ek list/dashboard ("12 payouts approval ke liye"), jisme context (amount, creator history, risk flags) ho. Insaan ko bina context ke approve button dena = rubber stamp.',
      '<strong>Decision bhi ek event hai:</strong> approve/reject state machine se guzarta hai. Double click, do reviewers ek saath, ya payout already cancel ho chuka: sab "from state" check se pakde jaate hain.',
      '<strong>Audit:</strong> kisne, kab, kyun approve kiya, history table mein. Paise ke kaam mein ye compliance ki zaroorat hai.',
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "workflow engine hai, to idempotency ki zaroorat nahi"', html: `Engine activities ko <strong>at-least-once</strong> chalata hai: worker crash ya timeout pe same activity dobara chalegi (upar "Worker crash" scenario). Bank call, email, ledger write: sab idempotent hone chahiye (idempotency key, conditional UPDATE). Engine durable <em>faisle</em> deta hai, side effects ko magic se exactly-once nahi bana deta. Idempotency ki poori kahani <a href="#/pagination-idempotency">Pagination aur idempotency</a> lesson mein.` },

    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Decide: multi-step process kaise banayein', html: `Roadmap ka rule: <strong>complex multi-step business process with retries, timeouts aur human steps → workflow engine</strong> (Temporal, Step Functions). Example: payment → seller accept → delivery assignment. Usse pehle ki seedhi:<br>• Sab steps ek DB mein → bas <strong>ek transaction</strong> (danda 1).<br>• Kuch bhi multi-step hai → kam se kam <strong>explicit state machine</strong> (danda 2) (ek state column, transitions ek jagah, conditional UPDATE). Ye hamesha.<br>• 2-4 steps, ek service, koi lamba wait nahi → state machine + <a href="#/queues">queue</a> workers + sweeper kaafi hai (danda 3).<br>• Steps alag services mein, fail pe ulta karna hai → <strong>saga + compensation</strong> (danda 4).<br>• Alag teams ek event pe apna apna kaam karti hain, flow simple → <strong>choreography</strong> (Kafka events).<br>• Bahut steps, retries, timers, insaan, din/hafte, compensation → <strong>orchestration with a workflow engine</strong> (danda 5).<br>Aur yaad rakho roadmap ka chhota rule: "Do this task" → queue. "This happened" aur kai teams ko farak padta hai → Kafka.` },
    { type: 'table', head: ['Situation', 'Pick', 'Kyun'], rows: [
      ['Video publish: upload → transcode → moderation → live', 'State machine + queue workers (ya engine agar moderation insaan karta hai)', 'Steps kam, lekin states saaf chahiye UI ke liye'],
      ['Creator payout with approval', 'Workflow engine', 'Insaan, din bhar ke timers, paisa, retries'],
      ['"Video uploaded" pe search, recommendations, notifications update', 'Choreography (Kafka)', 'Alag teams, ek event, koi central flow nahi'],
      ['Ride lifecycle (requested → matched → started → completed)', 'State machine (har ride ek row), events se driven', 'Har transition validate karna zaroori; galat order mein event aa sakte hain'],
      ['User onboarding (signup → verify email → KYC → first upload)', 'State machine; reminders ke liye engine ya scheduled jobs', 'Din/hafton ke gaps, user ka step'],
    ]},

    { type: 'h2', text: 'Poori picture' },
    { type: 'diagram', title: 'xyz.com creator payout: poori picture', height: 420,
      nodes: [
        { id: 'cron', label: 'Payout API', sub: 'monthly start', x: 90, y: 70, kind: 'server', info: 'Ye kya hai: mahine ka payout shuru karne wali service. Har creator ke liye ek workflow start karti hai, Workflow ID = payout-77-2026-09, taaki do baar chale to bhi duplicate na bane.' },
        { id: 'eng', label: 'Temporal', sub: 'event history', x: 330, y: 70, w: 150, kind: 'data', info: 'Ye kya hai: workflow engine. Har payout ki diary (event history), durable timers (48 ghante), retries with backoff. Crash ke baad replay se wahin se aage (danda 5).' },
        { id: 'wk', label: 'Workers', sub: 'activities', x: 330, y: 210, w: 170, kind: 'server', info: 'Ye kya hai: tumhara code chalane wali machines. Activities: reserve, checks, transfer, compensation. Har activity idempotent, kyunki engine unhe at-least-once chalata hai.' },
        { id: 'led', label: 'Ledger DB', sub: 'state + outbox', x: 570, y: 210, w: 160, kind: 'data', info: 'Ye kya hai: paise ka hisaab aur payout state machine (danda 2). Har transition conditional UPDATE, aur usi transaction mein outbox row (event baad mein Kafka ko).' },
        { id: 'bank', label: 'Bank API', sub: 'idempotency key', x: 570, y: 70, w: 160, kind: 'net', info: 'Ye kya hai: bahar ka bank. Har transfer ke saath payout id idempotency key ke roop mein, taaki retry pe paisa do baar na jaaye.' },
        { id: 'fin', label: 'Finance team', sub: 'approve signal', x: 90, y: 210, kind: 'client', info: 'Ye kya hai: insaan ka step. ₹5 lakh se bade payouts approve/reject; click workflow ko signal banke jaata hai. 48 ghante mein jawab nahi to escalation.' },
        { id: 'kafka', label: 'Kafka', sub: 'PayoutPaid event', x: 570, y: 350, w: 160, kind: 'queue', info: 'Ye kya hai: event log. Outbox relay "PayoutPaid" yahan daalta hai. Jinhe farak padta hai (notifications, analytics) wo khud sunte hain: ye choreography wala hissa hai.' },
        { id: 'notif', label: 'Notifications', sub: 'email, push', x: 330, y: 350, w: 170, kind: 'server', info: 'Ye kya hai: creator ko "paisa bhej diya" email/push bhejne wali service. Event id se dedupe, taaki duplicate event pe do email na jaayein.' },
        { id: 'ops', label: 'Ops alerts', sub: 'stuck / FAILED', x: 90, y: 350, kind: 'client', info: 'Ye kya hai: "atak gaya, insaan bulao" wala raasta. Retries khatam, compensation chala, ya koi state bahut der se atki: ops team ko alert.' },
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
        { name: 'Happy path', text: 'Workflow start, worker ne reserve + checks + transfer kiye, ledger mein PAID, outbox se PayoutPaid event, creator ko email.', go: ['cron>eng>wk>led>kafka>notif', 'wk>bank'] },
        { name: 'Crash + resume', text: 'Transfer ke baad worker mara. Engine ne timeout pe naye worker ko task diya, replay se step 3 se aage, same idempotency key: paisa ek hi baar.', go: ['eng>wk>bank', 'wk>led'] },
        { name: 'Approval', text: 'Bada payout NEEDS_APPROVAL pe ruka (durable timer 48 h). Finance ka click signal banke engine tak, workflow aage badha.', go: ['fin>eng>wk>led'] },
        { name: 'Compensation', text: 'Bank ne mana kiya (account band). Saga ka ulta step: reserve wapas balance mein, state FAILED, ops ko alert.', go: ['wk>bank', 'wk>led', 'wk>ops'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Multi-step process ke teen dushman: crash, duplicate, aur lamba intezaar.</li>
      <li>Danda 1: sab ek DB mein ho to bas ek transaction. Seedhi wahin khatam.</li>
      <li>Danda 2: state machine = ek state column, transitions ek jagah, har update "from state" check karta hai, galat event reject.</li>
      <li>Danda 3: queue workers + sweeper se crash ke baad resume. Resume = step dobara, isliye idempotency key.</li>
      <li>Danda 4: saga = local transactions ki line + har step ka compensation (refund, seat release). Choreography chhote flows ke liye, orchestration bade ke liye; outbox se events kho nahi.</li>
      <li>Danda 5: workflow engine (Temporal, Step Functions) retries, timers, signals aur replay deta hai. Activities phir bhi idempotent.</li>
      <li>Har wait state ka timeout, aur timeout pe kya karna hai wo bhi design ka hissa.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['Har cheez ki ek saaf haalat; impossible combinations khatam', 'Galat aur duplicate events reject; double payout nahi', 'Crash ke baad wahin se resume (engine ya sweeper ke saath)', 'Timeouts aur escalation se kuch bhi chup-chaap nahi atakta', 'History se "kahan atka?" ka turant jawab, audit bhi'],
      costs: ['Pehle states aur transitions sochne padte hain (upfront design)', 'Workflow engine = naya infra, naye rules (deterministic code, versioning jab workflows chal rahe hon)', 'Choreography mein flow bikhra hua, debugging mushkil', 'Activities phir bhi idempotent banani padti hain', 'Bahut states wali machine khud complex ho jaati hai; states kam rakho'] },

    { type: 'think', questions: [
      { q: 'xyz.com pe video publish ka state machine banao: kaunsi states, aur kaunse transitions reject hone chahiye?', a: 'Ek achha version: UPLOADING → PROCESSING (transcode) → IN_REVIEW (agar moderation flag kare) → READY → PUBLISHED; side mein FAILED (transcode fail, retry ke saath) aur REJECTED (moderation), aur DELETED. Reject: PROCESSING se seedha PUBLISHED (bina transcode ke video toota hoga), REJECTED se PUBLISHED (moderation bypass), DELETED se kuch bhi. Creator "schedule publish" chahe to READY → SCHEDULED → PUBLISHED, jahan SCHEDULED ka timer hai.' },
      { q: 'Tumhari team ne Temporal workflow mein ek naya step joda aur deploy kiya. 10,000 payouts us waqt NEEDS_APPROVAL mein ruke the. Kya dikkat ho sakti hai?', a: 'Replay ke waqt purane workflows ki history naye code se match nahi karegi (naya step history mein hai hi nahi), jo determinism error de sakta hai. Isliye workflow engines mein versioning hoti hai: Temporal mein patching/version APIs ya worker versioning, taaki purane chal rahe workflows purana raasta lein aur naye, naya. Step Functions mein chal rahe executions apni start waali definition pe hi chalte rehte hain. Lambe workflows ko change karna ek design concern hai.' },
      { q: 'Choreography mein payout ka flow: "PayoutCalculated" → checks service → "ChecksPassed" → bank service → "TransferDone". Finance approval kahan fit hoga aur kya dikkat aayegi?', a: 'Approval service ko ChecksPassed sunna padega, bade amounts ko rokna, aur bank service ko ab "ChecksPassed" ki jagah "Approved" sunna padega, matlab flow ka logic teen services mein bikhar gaya. 48 ghante ka timeout kaun rakhega? Payout kahan atka, ye dekhne ke liye sab services ke logs jodne padenge. Yahi signal hai ki ab orchestration (workflow engine) behtar hai.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Payout PAID state mein hai aur bank ka "bank_ok" webhook dobara aaya. State machine kya kare?', options: ['Phir se PAID likho aur email dobara bhejo', 'Transition reject/ignore karo, kuch na badlo', 'State ko SENDING pe wapas le jaao', 'Error throw karke bank ko retry karwao'], answer: 1, explain: 'PAID terminal state hai. Conditional UPDATE (WHERE state = SENDING) 0 rows dega, isliye kuch nahi badlega aur email dobara nahi jaayega. Bank ko 200 OK de do taaki wo retry na kare.' },
      { q: 'Kaunsa case workflow engine ke liye sabse fit hai?', options: ['Ek image ka thumbnail banana', 'Payment → seller accept → delivery assignment, retries, timeouts aur insaan ke steps ke saath', 'Page view counter badhana', 'Ek user ka profile update'], answer: 1, explain: 'Roadmap ka rule: complex multi-step business process with retries, timeouts aur human steps → workflow engine. Thumbnail ek akela task hai (queue), counter aur profile update single-step hain.' },
      { q: 'Temporal worker ne bank transfer bheja aur result report karne se pehle crash ho gaya. Kya hoga?', options: ['Workflow hamesha ke liye atak jaayega', 'Activity timeout ke baad retry hogi; idempotency key ke bina double transfer ho sakta hai', 'Temporal guarantee karta hai ki activity kabhi dobara nahi chalegi', 'Poora workflow shuru se, saare steps dobara chalenge'], answer: 1, explain: 'Activities at-least-once hain. Timeout ke baad engine activity phir chalata hai. Pichhle completed steps replay mein history se aate hain (dobara nahi chalte), lekin jo activity beech mein thi wo dobara chalegi, isliye idempotency key zaroori hai.' },
      { q: 'Finance approval step ke liye sabse zaroori design cheez kya hai?', options: ['Approval ke liye ek thread ko 48 ghante sleep karwana', 'Ek timeout + timeout pe kya karna hai (escalate / auto-reject), aur decision ko bhi state machine se guzaarna', 'Approval ko skip karna jab reviewer busy ho', 'Approval UI mein sirf ek button'], answer: 1, explain: 'Har wait state ka deadline aur deadline pe defined action hona chahiye. Decision bhi ek event hai jo "from state" check se guzarta hai, taaki double click ya cancelled payout pe approval galti na kare.' },
      { q: 'Meetup ticket saga: seat hold hua, payment kat gaya, lekin ticket service fail ho gayi (aur retries khatam). Sahi kya hai?', options: ['Kuch mat karo, user support ko likhega', 'Compensations ulte order mein: pehle refund, phir seat release, aur user ko saaf message', 'Teeno services ke databases ko ek saath ROLLBACK karo', 'Payment ko dobara kaato'], answer: 1, explain: 'Alag services ke databases ka ek saath rollback mumkin nahi. Saga mein har ho chuke step ka business-level ulta step (compensation) chalta hai, ulte order mein, aur compensations bhi idempotent + retry wale hone chahiye.' },
    ]},
    { type: 'sources', note: 'Workflow engine ki specific baatein (timeouts, retry defaults, Step Functions types) inhi official docs se check ki gayin.', items: [
      { title: 'Detecting Activity failures (activity timeouts and heartbeats)', publisher: 'Temporal documentation', official: true, url: 'https://docs.temporal.io/encyclopedia/detecting-activity-failures', used: 'Schedule-To-Start, Start-To-Close, Schedule-To-Close and Heartbeat timeouts.' },
      { title: 'Retry Policies', publisher: 'Temporal documentation', official: true, url: 'https://docs.temporal.io/encyclopedia/retry-policies', used: 'Default activity retry: 1 s initial, backoff 2.0, max interval 100x, unlimited attempts; workflows do not retry by default.' },
      { title: 'Choosing workflow type in Step Functions', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/step-functions/latest/dg/choosing-workflow-type.html', used: 'Standard (up to 1 year, exactly-once) vs Express (5 min, at-least/at-most-once); .waitForTaskToken only in Standard.' },
      { title: 'Wait for a Callback with Task Token', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html#connect-wait-token', used: 'Human approval pattern with task token and SendTaskSuccess / SendTaskFailure.' },
      { title: 'Workflow ID and Run ID', publisher: 'Temporal documentation', official: true, url: 'https://docs.temporal.io/workflow-execution/workflowid-runid', used: 'Ek Workflow ID ka ek waqt mein sirf ek running execution: duplicate start se bachav.' },
      { title: 'Sagas (1987)', publisher: 'Hector Garcia-Molina, Kenneth Salem (ACM SIGMOD)', url: 'https://www.cs.cornell.edu/andru/cs711/2002fa/reading/sagas.pdf', year: 1987, used: 'Saga ki asli definition: local transactions ki line aur har ek ka compensating transaction. Paper purana hai, lekin idea aaj bhi wahi.' },
      { title: 'Pattern: Transactional outbox', publisher: 'microservices.io (Chris Richardson)', url: 'https://microservices.io/patterns/data/transactional-outbox.html', used: 'State update aur event ko ek hi DB transaction mein likhna, phir relay se broker tak bhejna.' },
    ]},
  ],
});
