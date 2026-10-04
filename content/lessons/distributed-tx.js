(function () {
  /* ---------- pure saga / 2PC simulator (exported as _test for verification) ---------- */
  const STEPS = [
    { id: 'T1', svc: 'sub', fwd: 'Membership PENDING banayi', st: 'PENDING', why: 'Riya ki is channel pe pehle se active membership hai (business rule)', comp: 'C1: membership CANCELLED mark ki', cst: 'CANCELLED', seen: 'Riya ke app pe kuch second "PENDING" dikha' },
    { id: 'T2', svc: 'pay', fwd: '₹199 charge kiye (payment gateway se)', st: '₹199 charged', why: 'card decline ho gaya', comp: 'C2: ₹199 refund kiye', cst: 'refunded', seen: 'Riya ko "₹199 debited" SMS aaya, phir refund' },
    { id: 'T3', svc: 'earn', fwd: 'Creator Arjun ko ₹140 credit (70%)', st: '+₹140', why: 'Arjun ka creator account freeze hai (policy check fail)', comp: 'C3: ₹140 ki reverse entry', cst: 'reversed', seen: 'Arjun ke dashboard pe +₹140 dikha, phir hata' },
    { id: 'T4', svc: 'sub', fwd: 'Membership ACTIVE (pivot: point of no return)', st: 'ACTIVE', why: 'Subscription service ka DB write timeout ke baad bhi fail', pivot: true },
    { id: 'T5', svc: 'notif', fwd: 'Welcome email bheja', st: 'sent', why: 'email provider timeout', retryable: true },
  ];

  function emailWithRetry(ev, t, failEmail) {
    if (!failEmail) { ev.push({ t: t += 100, svc: 'notif', kind: 'fwd', text: 'T5: Welcome email bheja', set: { notif: 'sent' } }); return t; }
    ev.push({ t: t += 100, svc: 'notif', kind: 'fail', text: 'T5 fail: email provider timeout. Ye point of no return ke BAAD hai (membership pakki ho chuki), to kuch undo nahi karte. Bas retry.', set: { notif: 'retrying' } });
    ev.push({ t: t += 1000, svc: 'notif', kind: 'fail', text: 'T5 retry 1 (1 s backoff): phir timeout', set: {} });
    ev.push({ t: t += 2000, svc: 'notif', kind: 'fwd', text: 'T5 retry 2 (2 s backoff): email chala gaya', set: { notif: 'sent' } });
    return t;
  }

  function saga(fail) {
    const ev = [];
    let t = 0, failedAt = -1;
    ev.push({ t, svc: 'coord', kind: 'info', text: 'Orchestrator ne saga shuru kiya, state DB mein save: step 0', set: { coord: 'running' } });
    for (let i = 0; i < 4; i++) {
      const s = STEPS[i];
      if (s.id === fail) {
        failedAt = i;
        ev.push({ t: t += 100, svc: s.svc, kind: 'fail', text: `${s.id} fail: ${s.why}`, set: { [s.svc]: 'FAILED', coord: 'compensating' } });
        break;
      }
      ev.push({ t: t += 100, svc: s.svc, kind: 'fwd', text: `${s.id}: ${s.fwd}`, set: { [s.svc]: s.st } });
    }
    const visible = [];
    if (failedAt >= 0) {
      const undo = STEPS.slice(0, failedAt).filter(s => s.comp).reverse();
      if (!undo.length) ev.push({ t, svc: 'coord', kind: 'info', text: 'Pehla hi step fail hua: undo karne ko kuch nahi.', set: {} });
      undo.forEach(s => {
        ev.push({ t: t += 100, svc: s.svc, kind: 'comp', text: s.comp, set: { [s.svc]: s.cst } });
        visible.push(s.seen);
      });
      ev.push({ t, svc: 'coord', kind: 'end', text: 'Saga ROLLED BACK: har service phir se consistent, lekin "undo" naye kaam se hua, delete se nahi.', set: { coord: 'rolled back' } });
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
    ev.push({ t: t += 100, svc: 'coord', kind: 'lock', text: 'Teeno DBs mein kaam hua, lekin COMMIT nahi. Saari touched rows LOCKED.', set: { coord: 'working', sub: 'ACTIVE? (locked)', pay: '₹199? (locked)', earn: '+₹140? (locked)' } });
    ev.push({ t: t += 50, svc: 'coord', kind: 'info', text: 'Phase 1: coordinator ne teeno ko PREPARE bheja ("commit kar paoge?")', set: { coord: 'preparing' } });
    const set = {};
    ['sub', 'pay', 'earn'].forEach(p => { set[p] = p === no ? 'voted NO' : 'PREPARED (locked)'; });
    ev.push({ t: t += 50, svc: 'coord', kind: 'lock', text: no ? `${NAME[no]} ne NO vote diya. Baaki do ne YES (wo ab apni marzi se na commit kar sakte, na abort).` : 'Teeno ne YES vote diya. Ab teeno ka vaada: "bolo to commit karunga", locks pakde hue.', set });
    if (fail === 'crash') {
      ev.push({ t, svc: 'coord', kind: 'fail', text: 'Coordinator decision bhejne se PEHLE crash!', set: { coord: 'CRASHED' } });
      ev.push({ t, svc: 'coord', kind: 'block', text: 'Teeno participants IN-DOUBT: commit karein ya abort? Akele faisla nahi le sakte, kyunki doosron ka vote nahi pata. Locks pakde baithe hain.', set: { sub: 'IN-DOUBT (locked)', pay: 'IN-DOUBT (locked)', earn: 'IN-DOUBT (locked)' } });
      ev.push({ t: null, svc: 'earn', kind: 'block', text: 'Arjun ka payout job uski earnings row padhna chahta hai: WAIT... WAIT... jab tak coordinator wapas na aaye (minute, ghante?).', set: {} });
      return { ev, final: 'BLOCKED', total: Infinity, lockMs: Infinity, visible: [] };
    }
    if (no) {
      ev.push({ t: t += 50, svc: 'coord', kind: 'comp', text: 'Phase 2: ek NO kaafi hai. Coordinator ne sabko ABORT bheja.', set: { coord: 'aborting' } });
      ev.push({ t: t += 50, svc: 'coord', kind: 'end', text: 'Sab ROLLBACK, locks free. Bahar kisi ko beech ka state nahi dikha: atomic.', set: { coord: 'aborted', sub: 'rolled back', pay: 'rolled back', earn: 'rolled back' } });
      return { ev, final: 'ABORTED', total: t, lockMs: t, visible: [] };
    }
    ev.push({ t: t += 50, svc: 'coord', kind: 'fwd', text: 'Phase 2: sab YES, decision COMMIT (coordinator ne pehle apne log mein likha), sabko COMMIT bheja.', set: { coord: 'committing' } });
    ev.push({ t: t += 50, svc: 'coord', kind: 'end', text: 'Teeno COMMITTED, locks free.', set: { coord: 'committed', sub: 'ACTIVE', pay: '₹199 charged', earn: '+₹140' } });
    const lockMs = t;
    t = emailWithRetry(ev, t, fail === 'T5');
    return { ev, final: 'COMMITTED', total: t, lockMs, visible: [] };
  }
  const T = { saga, tpc, STEPS };

  Lesson.register({
    _test: T,
    id: 'distributed-tx',
    title: 'Sagas aur distributed transactions',
    minutes: 25,
    summary: `Ek click, chaar services, chaar alag databases. Agar beech mein ek step fail ho jaaye to? Is lesson mein: distributed transactions mushkil kyun hain, 2PC aur uska "blocking" khatra, sagas (choreography vs orchestration) aur compensating actions, outbox, idempotent consumers, aur Temporal / AWS Step Functions jaise workflow engines.`,
    blocks: [
      { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Riya ek button dabati hai: "Join ₹199". Iske peeche chaar alag programs ko kaam karna hai: membership banana, paisa kaatna, creator ko uska hissa dena, aur welcome email bhejna.<br>Har program ki apni alag diary (database) hai. Agar teesra program fail ho gaya, to pehle do ka kaam aadha-adhoora pada rehta hai: paisa kat gaya, membership nahi mili.<br>Ye lesson sikhata hai ki aise kaam ko "ya to poora, ya bilkul nahi" kaise banate hain, jab ek database ka "undo" button kaafi nahi hota. Har tareeke ko khud chala ke dekhoge.` },
      { type: 'h2', text: 'Problem: ek click, chaar services' },
      { type: 'p', html: `xyz.com ne naya feature launch kiya: <strong>Channel membership</strong>. Riya ko creator Arjun ki videos pasand hain. Wo ₹199/month deke Arjun ke channel ki member banti hai: exclusive videos, badge, live chat mein special emoji. ₹199 mein se ₹140 (70%) Arjun ki earnings mein jaata hai.` },
      { type: 'p', html: `Resilience lesson tak xyz.com microservices mein toot chuka hai, aur har service ka <strong>apna database</strong> hai. "Join" button dabane pe ye sab hona chahiye:` },
      { type: 'ascii', text: `
Riya "Join ₹199" dabati hai
        │
        v
1. Subscription service  →  membership PENDING      (Subscription DB)
2. Payment service       →  ₹199 charge (gateway)   (Payment DB)
3. Earnings service      →  Arjun +₹140              (Earnings DB)
4. Subscription service  →  membership ACTIVE       (Subscription DB)
5. Notification service  →  "Welcome!" email`, caption: 'Ek business action, chaar services, teen databases, ek bahar ka payment gateway.' },
      { type: 'p', html: `Ek database hota to ye aasaan tha: <code>BEGIN; ... ; COMMIT;</code> aur database guarantee deta ki ya to sab hoga, ya kuch nahi. Lekin yahan teen alag databases hain. Socho step 3 fail ho gaya: Riya ka ₹199 kat chuka hai, membership PENDING mein atki hai, Arjun ko paisa nahi mila. Riya support ko gussa email likhti hai. Yahi is lesson ki problem hai.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Transaction aur ACID', html: `<strong>Ye kya hai:</strong> <strong>transaction</strong> = kai operations ka ek packet jo database ek unit ki tarah chalata hai. Iski chaar guarantees ko <strong>ACID</strong> kehte hain: <strong>Atomicity</strong> (sab ya kuch nahi), <strong>Consistency</strong> (rules kabhi na tootein, jaise balance negative nahi), <strong>Isolation</strong> (do transactions ek doosre ka adhoora kaam na dekhein), <strong>Durability</strong> (commit hua to crash ke baad bhi rahega).<br><strong>Kyun chahiye:</strong> "₹199 kaato" aur "membership do" ek saath hone chahiye. Ek ho aur doosra nahi, to user ka nuksaan.<br><strong>Iske bina:</strong> beech mein crash = aadha kaam, aur koi automatic undo nahi.<br><strong>Dhyaan do:</strong> ye sab sirf <em>ek</em> database ke andar milta hai.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Distributed transaction', html: `<strong>Ye kya hai:</strong> jab ek hi "sab ya kuch nahi" wala kaam <strong>kai alag machines / databases / services</strong> mein phaila ho.<br><strong>Kyun mushkil:</strong> kisi ek database ka <code>COMMIT</code> doosre database ko control nahi kar sakta. Har DB sirf apni diary sambhalta hai.<br><strong>Agar dhyaan na do:</strong> Payment DB mein "charged" pakka, Earnings DB mein kuch nahi: data aapas mein jhooth bolta hai.` },

      { type: 'h2', text: 'Ye itna mushkil kyun hai?' },
      { type: 'list', items: [
        '<strong>Koi shared transaction nahi.</strong> Payment DB ka <code>COMMIT</code> ho gaya to wo ho gaya. Earnings DB baad mein fail ho to Payment DB ko "wapas jao" bolne ka koi built-in tareeka nahi.',
        '<strong>Partial failure.</strong> Ek machine pe program ya to chalta hai ya crash. Distributed system mein ek service zinda, doosri mari, teesri slow: sab ek saath ho sakta hai.',
        '<strong>Timeout ka matlab "fail" nahi.</strong> Payment gateway ko request bheji, 5 second jawab nahi aaya. Paisa kata ya nahi? <em>Pata nahi.</em> Ho sakta hai charge ho gaya aur sirf jawab raaste mein kho gaya. Dobara bheja to double charge ka khatra.',
        '<strong>Bahar ki services tumhare control mein nahi.</strong> Razorpay/Stripe jaisa payment gateway, email provider: inke saath tum database jaisa "lock karke ruko" wala protocol nahi chala sakte.',
        '<strong>Isolation gayab.</strong> Jab tak poora kaam khatam na ho, beech ki halat (₹199 kata, membership PENDING) doosri requests ko dikh sakti hai.',
      ]},
      { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "try-catch laga denge"', html: `"Step 3 fail hua to catch mein step 2 ka refund call kar denge." Achha idea hai, aur saga isi ka mature roop hai. Lekin socho catch block chalne se <em>pehle</em> hi server crash ho gaya (deploy, OOM). Ab refund kaun karega? Kisi ko yaad bhi nahi ki ye kaam adhoora tha. Isliye "kahan tak pahunche" wali state <strong>durable</strong> (DB mein) honi chahiye, memory mein nahi.` },
      { type: 'p', html: `Iske do bade jawab hain: <strong>2PC</strong> (sabko ek saath commit karwao) aur <strong>Saga</strong> (ek ek karke commit karo, galti ho to ulte kadam se undo). Pehle 2PC dekhte hain, kyunki ye "seedha" solution lagta hai.` },

      { type: 'h2', text: 'Two-phase commit (2PC)' },
      { type: 'p', html: `Idea simple hai: ek <strong>coordinator</strong> sabse pehle poochhta hai "kya tum commit kar sakte ho?" Sab haan bolein tabhi bolta hai "ab commit karo". Ek ne bhi na bola to sabko "abort". Do rounds hain, isliye naam <strong>two-phase</strong>.` },
      { type: 'callout', tone: 'term', title: 'Coordinator aur participants', html: `<strong>Ye kya hai:</strong> <strong>coordinator</strong> (ya transaction manager) wo process hai jo poore distributed transaction ko chalata hai aur final faisla leta hai. <strong>Participants</strong> wo databases hain jinmein asli kaam hota hai.<br><strong>Kyun chahiye:</strong> kisi ek ko to "sab ka vote" ginna hai aur ek hi faisla sabko sunana hai.<br><strong>Iske bina:</strong> har DB apni marzi se commit kare, to koi commit karega, koi nahi.<br><strong>Asli duniya:</strong> Java duniya mein iska standard <strong>XA</strong> hai, aur Postgres mein participant side ke liye <code>PREPARE TRANSACTION</code> / <code>COMMIT PREPARED</code> commands hain.` },
      { type: 'steps', items: [
        { t: 'Kaam karo, commit mat karo', d: 'Har participant apne DB mein changes karta hai aur rows pe lock rakhta hai, lekin COMMIT nahi karta.' },
        { t: 'Phase 1: PREPARE', d: 'Coordinator sabse poochhta hai. Participant apne changes disk pe pakke likhta hai (taaki crash ke baad bhi commit kar sake) aur YES vote deta hai. YES ka matlab vaada hai: "ab main akele abort nahi karunga, tum jo bologe wahi karunga." Kuch gadbad ho to NO.' },
        { t: 'Decision log mein', d: 'Sab YES to coordinator apne durable log mein "COMMIT" likhta hai. Isi pal transaction ka faisla ho gaya.' },
        { t: 'Phase 2: COMMIT ya ABORT', d: 'Coordinator sabko faisla bhejta hai. Participants commit/rollback karte hain aur locks chhodte hain.' },
      ]},
      { type: 'flow', title: '2PC: membership ke teen databases', height: 340,
        nodes: [
          { id: 'co', label: 'Coordinator', sub: 'transaction manager', x: 130, y: 170, w: 160, kind: 'server', info: 'Ye kya hai: 2PC ka manager process. Poora faisla iske haath mein. PREPARE bhejta hai, votes ginta hai, decision apne log mein likhta hai, phir COMMIT/ABORT bhejta hai. Yahi 2PC ki kamzori bhi hai: ye gire to sab atak jaate hain.' },
          { id: 'sdb', label: 'Subscription DB', sub: 'participant', x: 560, y: 60, w: 170, kind: 'data', info: 'Ye kya hai: Subscription service ka database, ek participant. Isme Riya ki membership row hai. 2PC ke dauraan ye row locked rehti hai: koi aur isse badal nahi sakta.' },
          { id: 'pdb', label: 'Payment DB', sub: 'participant', x: 560, y: 170, w: 170, kind: 'data', info: 'Ye kya hai: Payment service ka database, doosra participant. Isme payment ka record hai. Asli duniya mein yahan dikkat hai: paisa kaatne wala gateway (Razorpay/Stripe) bahar ki company hai aur PREPARE jaisa kuch support nahi karta. Is diagram mein maan rahe hain ki ye sirf hamara DB hai.' },
          { id: 'edb', label: 'Earnings DB', sub: 'participant', x: 560, y: 280, w: 170, kind: 'data', info: 'Ye kya hai: Earnings service ka database, teesra participant. Isme Arjun ki earnings row hai. 2PC ke dauraan locked, to Arjun ka dashboard ya payout job ise padh/badal nahi sakta.' },
          { id: 'job', label: 'Payout job', sub: 'Arjun ka', x: 300, y: 300, w: 140, kind: 'client', info: 'Ye kya hai: ek alag background kaam jo Arjun ki earnings row update karna chahta hai. 2PC ke locks isko rok dete hain. Jitni der lock, utni der ye wait.' },
        ],
        edges: [{ a: 'co', b: 'sdb' }, { a: 'co', b: 'pdb' }, { a: 'co', b: 'edb' }, { a: 'job', b: 'edb' }],
        scenarios: [
          { name: 'Sab YES: commit', steps: [
            { title: 'Kaam + locks', text: 'Teeno DBs mein changes hue, lekin commit nahi. Rows locked.', parallel: true, go: ['co>sdb', 'co>pdb', 'co>edb'], after: { sdb: { state: 'warn', sub: 'locked' }, pdb: { state: 'warn', sub: 'locked' }, edb: { state: 'warn', sub: 'locked' } } },
            { title: 'Phase 1: PREPARE', text: 'Coordinator teeno se poochhta hai. Har DB apna kaam disk pe pakka karta hai.', parallel: true, go: ['co>sdb', 'co>pdb', 'co>edb'], msg: "PREPARE TRANSACTION 'join-riya-arjun-77';" },
            { title: 'Teeno YES', text: 'Teeno ne vaada kiya: "jo bologe wahi karenge". Coordinator ne decision COMMIT apne log mein likha.', parallel: true, go: ['res:sdb>co', 'res:pdb>co', 'res:edb>co'], after: { sdb: { sub: 'PREPARED' }, pdb: { sub: 'PREPARED' }, edb: { sub: 'PREPARED' }, co: { sub: 'decision: COMMIT' } } },
            { title: 'Phase 2: COMMIT', text: 'Sabko COMMIT. Locks free. Bahar wale ko kabhi adhoora state nahi dikha.', parallel: true, go: ['co>sdb', 'co>pdb', 'co>edb'], msg: "COMMIT PREPARED 'join-riya-arjun-77';", after: { sdb: { state: 'ok', sub: 'ACTIVE' }, pdb: { state: 'ok', sub: '₹199 charged' }, edb: { state: 'ok', sub: '+₹140' } } },
          ]},
          { name: 'Ek NO: abort', steps: [
            { title: 'PREPARE', text: 'Same shuruaat: kaam hua, locks lage, PREPARE gaya.', parallel: true, go: ['co>sdb', 'co>pdb', 'co>edb'], after: { sdb: { state: 'warn', sub: 'locked' }, pdb: { state: 'warn', sub: 'locked' }, edb: { state: 'warn', sub: 'locked' } } },
            { title: 'Earnings DB: NO', text: 'Arjun ka account freeze hai, constraint fail. Earnings DB NO bolta hai. Baaki do YES.', parallel: true, go: ['res:sdb>co', 'res:pdb>co', 'bad:edb>co'], after: { edb: { state: 'down', sub: 'voted NO' }, co: { sub: 'decision: ABORT' } } },
            { title: 'Phase 2: ABORT', text: 'Ek NO kaafi hai. Sabko ROLLBACK. Kisi ko kuch dikha hi nahi: yahi 2PC ki khoobsurti hai (atomic + isolated).', parallel: true, go: ['co>sdb', 'co>pdb', 'co>edb'], msg: "ROLLBACK PREPARED 'join-riya-arjun-77';", after: { sdb: { state: '', sub: 'rolled back' }, pdb: { state: '', sub: 'rolled back' }, edb: { state: '', sub: 'rolled back' } } },
          ]},
          { name: 'Coordinator crash', intro: 'Ab 2PC ka sabse bada khatra: coordinator votes ke baad, faisla bhejne se pehle gir gaya.', steps: [
            { title: 'PREPARE, teeno YES', text: 'Sab normal. Teeno PREPARED, locks pakde hue.', parallel: true, go: ['co>sdb', 'co>pdb', 'co>edb', 'res:sdb>co', 'res:pdb>co', 'res:edb>co'], after: { sdb: { state: 'warn', sub: 'PREPARED' }, pdb: { state: 'warn', sub: 'PREPARED' }, edb: { state: 'warn', sub: 'PREPARED' } } },
            { title: 'Coordinator crash', text: 'Decision bhejne se pehle machine gir gayi.', set: { co: { state: 'down', sub: 'CRASHED' } }, go: 'lost:co>edb' },
            { title: 'Participants IN-DOUBT', text: 'Earnings DB soch raha hai: "Commit karun? Shayad Payment DB ne NO bola tha. Abort karun? Shayad coordinator ne COMMIT likh diya tha aur baaki commit kar chuke." Usne YES ka vaada kiya hai, to <strong>akele faisla nahi le sakta</strong>. Locks pakde baitha hai.', set: { sdb: { sub: 'IN-DOUBT' }, pdb: { sub: 'IN-DOUBT' }, edb: { state: 'hot', sub: 'IN-DOUBT, locked' } }, focus: ['sdb', 'pdb', 'edb'] },
            { title: 'Baaki duniya bhi atki', text: 'Arjun ka payout job uski earnings row update karna chahta hai. Lock! Wait... wait... Jab tak coordinator wapas na aaye (ya koi insaan manually faisla na kare), ye row jam hai. Isko <strong>2PC ka blocking problem</strong> kehte hain.', go: ['job>edb', 'bad:edb>job'], after: { job: { state: 'warn', sub: 'WAITING on lock' } } },
          ]},
        ],
      },
      { type: 'callout', tone: 'warn', title: '2PC ki asli keemat', html: `• <strong>Blocking:</strong> coordinator PREPARE ke baad gire to participants locks pakde atke rehte hain. Postgres docs bhi kehte hain ki prepared transaction apne locks rakhta hai, aur unhe lambe time chhodna VACUUM tak ko rok deta hai. Isliye Postgres mein <code>max_prepared_transactions</code> default 0 hai: bina proper transaction manager ke ise on mat karo.<br>• <strong>Slow:</strong> har transaction mein kam se kam do network round trips, aur poore time locks. Sabse slow participant sabki speed tay karta hai.<br>• <strong>Availability:</strong> ek bhi participant down to poora transaction nahi ho sakta.<br>• <strong>Bahar ki services:</strong> payment gateway, email provider, doosri company ki API: koi bhi tumhare PREPARE ka jawab nahi deta.` },
      { type: 'callout', tone: 'tip', title: 'To 2PC kahin use hota hai?', html: `Haan, jahan saare participants <em>tumhare apne</em> databases hon aur strong atomicity zaroori ho. Google Spanner shards ke beech 2PC chalata hai, lekin har participant khud ek replicated (Paxos) group hai, to ek machine girne se participant "gayab" nahi hota; Spanner paper isi tareeke se 2PC ki availability problem kam karne ki baat karta hai. Kafka ke transactions bhi andar ek two-phase jaisa commit protocol use karte hain. Microservices aur bahar ki APIs ke beech? Lagbhag kabhi nahi.` },

      { type: 'h2', text: 'Saga: ek ek kadam, har kadam ka "undo"' },
      { type: 'p', html: `Saga ka idea 1987 ke ek database paper (Garcia-Molina aur Salem) se aaya, aur microservices ke saath phir popular hua. Ek bada transaction mat banao. Usse <strong>chhote local transactions</strong> ki ek line bana do. Har step apne hi database mein normal ACID transaction hai, turant commit. Aur har step ke saath ek <strong>compensating action</strong> likho jo uska asar ulta kar de.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Compensating action', html: `<strong>Ye kya hai:</strong> pehle se commit ho chuke kaam ko "mitaane" wala ek <strong>naya</strong> kaam. Ye database rollback nahi hai: rollback mein lagta hai jaise kuch hua hi nahi. Compensation mein history rehti hai: charge hua tha, phir refund hua.<br><strong>Kyun chahiye:</strong> saga mein pichhle steps commit ho chuke hain. Unhe wapas lene ka sirf ek raasta hai: ulta kaam karna.<br><strong>Iske bina:</strong> T3 fail hua to ₹199 kata hi reh jaata, membership PENDING mein atki rehti.<br><strong>Examples:</strong> <strong>charge → refund</strong>, <strong>credit → reverse entry</strong>, <strong>slot hold → slot release</strong> (jaise creator ke limited 1:1 live session ki seat), <strong>membership PENDING → CANCELLED</strong>. Kuch cheezon ka undo hota hi nahi: bheja hua email wapas nahi aata. Aisi cheez ko saga ke end mein rakho, ya "sorry, ignore that" wala doosra email compensation maano.` },
      { type: 'table', head: ['Step', 'Service', 'Forward kaam (Tᵢ)', 'Compensation (Cᵢ)'], rows: [
        ['T1', 'Subscription', 'Membership PENDING', 'C1: CANCELLED mark karo'],
        ['T2', 'Payment', '₹199 charge', 'C2: ₹199 refund'],
        ['T3', 'Earnings', 'Arjun +₹140', 'C3: −₹140 reverse entry'],
        ['T4', 'Subscription', 'Membership ACTIVE (pivot)', 'Koi nahi: iske baad sirf aage badhna hai'],
        ['T5', 'Notification', 'Welcome email', 'Koi nahi: fail ho to retry'],
      ], caption: 'Agar Tₖ fail ho, to ab tak ke compensations ulte order mein: Cₖ₋₁, ..., C2, C1.' },
      { type: 'callout', tone: 'term', title: 'Pivot aur retryable steps', html: `<strong>Ye kya hai:</strong> saga ke steps teen tarah ke hote hain. <strong>Compensable</strong>: jinka undo ho sakta hai (T1-T3). <strong>Pivot</strong>: "point of no return", jiske safal hote hi saga ko poora hona hi hai (T4: membership active ho gayi, Riya ne exclusive video dekhna shuru kar diya). <strong>Retryable</strong>: pivot ke baad wale steps, jo idempotent hain aur jinhe tab tak retry karte hain jab tak safal na hon (T5).<br><strong>Kyun chahiye:</strong> isse pata chalta hai fail hone pe "peeche jaana" hai ya "aage dhakelna" hai.<br><strong>Iske bina:</strong> email fail hone pe koi poori membership cancel kar deta, ya active membership ke baad bhi refund kar deta.<br><strong>Design rule:</strong> jo step sabse zyada fail ho sakta hai ya jiska undo nahi hota, use jitna ho sake <em>baad</em> mein, pivot ke aas paas rakho.` },

      { type: 'h2', text: 'Khud chala ke dekho: saga vs 2PC' },
      { type: 'p', html: `Neeche chuno kaunsa step fail ho, phir "Next step" dabate jao. Saga mode mein dekho kaise compensations <strong>ulte order</strong> mein chalte hain. Phir 2PC mode pe switch karo aur same failure compare karo: kitni der locks pakde gaye, aur kya beech ka state kisi ko dikha.` },
      { type: 'custom', render(el) {
        el.innerHTML = `<div class="dt-modes" style="display:flex;flex-wrap:wrap;gap:8px"></div>
          <div class="dt-fails" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>
          <div class="dt-cards" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:8px;margin-top:14px"></div>
          <ol class="dt-log" style="margin:14px 0 0;padding-left:22px;font-size:14px;line-height:1.5"></ol>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"><button type="button" class="btn small primary dt-next">Next step</button><button type="button" class="btn small ghost dt-all">Sab dikhao</button><button type="button" class="btn small ghost dt-reset">Reset</button></div>
          <div class="stats"><div class="stat"><span>Result</span><strong class="dt-res"></strong></div><div class="stat"><span>Kul time</span><strong class="dt-time"></strong></div><div class="stat"><span>Har DB pe lock</span><strong class="dt-lock"></strong></div><div class="stat"><span>Beech ka state bahar dikha?</span><strong class="dt-vis"></strong></div></div>
          <div class="calc-note dt-note"></div>`;
        let mode = 'saga', fail = 'T3', shown = 0, run;
        const MODES = { saga: 'Saga (orchestrated)', tpc: '2PC' };
        const FAILS = { none: 'Koi fail nahi', T1: 'T1 fail', T2: 'T2 fail', T3: 'T3 fail', T4: 'T4 fail', T5: 'T5 email fail', crash: 'Coordinator crash' };
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
          q('.dt-log').innerHTML = run.ev.slice(0, shown).map(e => `<li style="margin:4px 0"><span style="font:12px var(--f-mono);color:var(--ink-3)">${e.t === null ? 't = ∞' : 't = ' + fmt(e.t)}</span> <strong style="color:${KC[e.kind][0]}">${KC[e.kind][1]}</strong> ${e.text}</li>`).join('') || '<li style="color:var(--ink-3)">"Next step" dabao.</li>';
          const done = shown >= run.ev.length;
          q('.dt-next').disabled = done;
          q('.dt-res').textContent = done ? run.final : '…';
          q('.dt-time').textContent = done ? fmt(run.total) : '…';
          q('.dt-lock').textContent = mode === 'saga' ? '~100 ms' : run.lockMs === Infinity ? '∞' : run.lockMs + ' ms';
          q('.dt-vis').textContent = done ? (run.visible.length ? 'Haan (' + run.visible.length + ')' : 'Nahi') : '…';
          let note = mode === 'saga'
            ? 'Saga mein har step turant commit hota hai, to har DB ka lock sirf uske apne chhote local transaction (~100 ms) tak. Keemat: beech ka state (charge, credit) bahar dikh sakta hai, aur undo naye kaam se hota hai.'
            : (run.lockMs === Infinity ? 'Coordinator ke lautne (ya insaan ke faisle) tak teeno DBs ke locks pakde rahenge. ' : 'Teeno DBs ' + run.lockMs + ' ms tak ek saath locked rahe. ') + 'Dhyaan: asli duniya mein payment gateway 2PC ka participant nahi ban sakta. Yahan maan liya hai ki Payment DB hamara apna hai. Email kabhi 2PC mein nahi hota, wo commit ke baad bhejte hain.';
          if (mode === 'tpc' && fail === 'T4') note += ' T1 aur T4 dono Subscription DB ka kaam hain, isliye 2PC mein "T4 fail" = Subscription DB ka NO vote.';
          if (done && run.visible.length) note += ' Bahar kya dikha: ' + run.visible.join('; ') + '.';
          q('.dt-note').textContent = note;
        };
        const reset = () => { run = mode === 'saga' ? T.saga(fail) : T.tpc(fail); shown = 0; draw(); };
        q('.dt-next').onclick = () => { if (shown < run.ev.length) { shown++; draw(); } };
        q('.dt-all').onclick = () => { shown = run.ev.length; draw(); };
        q('.dt-reset').onclick = reset;
        reset();
      }},
      { type: 'p', html: `Kya dikha? <strong>T3 fail</strong> pe saga mein C2 (refund) aur phir C1 (cancel) chale, ulte order mein, aur Riya ne beech mein "₹199 debited" SMS dekha. 2PC mein same failure pe kisi ko kuch nahi dikha, lekin teeno DBs 300 ms tak ek saath locked rahe (saga mein har DB sirf ~100 ms). Aur "Coordinator crash" chuno: 2PC mein locks ka time <strong>∞</strong> ho jaata hai. <strong>T5 fail</strong> pe saga kuch undo nahi karta: email pivot ke baad hai, to bas backoff ke saath retry (1 s, phir 2 s) karke poora karta hai.` },
      { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "Saga = rollback"', html: `Saga mein rollback hota hi nahi. Har step commit ho chuka hai. Jo hota hai wo <strong>aage ki taraf ek naya kaam</strong> hai jo pichhle ka asar khatam kare. Isliye ek short time ke liye system "adha bana" dikhta hai. Saga ACID ka <strong>A</strong> (eventually) deta hai, lekin <strong>I</strong> (isolation) nahi.` },

      { type: 'h2', text: 'Saga style 1: Orchestration (ek conductor)' },
      { type: 'p', html: `Saga chalaane ke do tareeke hain. Pehla: ek <strong>orchestrator</strong> service jo poori kahani jaanti hai. Wo har service ko command deta hai ("charge karo"), jawab ka wait karta hai, apni state DB mein likhta hai, aur fail hone pe compensations chalata hai.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Orchestrator', html: `<strong>Ye kya hai:</strong> ek central service (ya workflow engine) jo saga ka <strong>state machine</strong> chalata hai: "step 2 ho gaya, ab step 3". (State machine = ek list ki "abhi kis halat mein hain, aur aage kahan ja sakte hain".)<br><strong>Kyun chahiye:</strong> poori kahani ek jagah likhi ho, to "saga 77 kahan atka?" ka jawab ek query mein.<br><strong>Iske bina:</strong> flow kai services mein bikhra; failure pe kaun undo chalayega, saaf nahi.<br><strong>Zaroori baat:</strong> har kadam ke baad apni progress <strong>durable</strong> store (DB) mein save karta hai, taaki crash ke baad wahin se aage badh sake jahan ruka tha.` },
      { type: 'flow', title: 'Orchestrated saga', height: 330,
        nodes: [
          { id: 'u', label: 'Riya', sub: 'Join ₹199', x: 80, y: 170, w: 120, kind: 'client', info: 'Ye kya hai: user Riya ka app. Riya ne "Join" dabaya. Use turant "Processing..." dikhta hai, aur result kuch second mein (push ya polling se).' },
          { id: 'o', label: 'Orchestrator', sub: 'saga state in DB', x: 285, y: 170, w: 160, kind: 'server', info: 'Ye kya hai: membership saga ka conductor (orchestrator). Har step se pehle aur baad state likhta hai: saga_id, current_step, status. Crash ho to naya instance state padh ke aage chalata hai. Temporal ya Step Functions yahi kaam ready-made karte hain.' },
          { id: 'sub', label: 'Subscription svc', sub: 'T1, T4 / C1', x: 580, y: 50, w: 170, kind: 'server', info: 'Ye kya hai: wo service jo memberships sambhalti hai, apne DB ke saath. Membership banati hai (PENDING), baad mein ACTIVE karti hai. Compensation: CANCELLED.' },
          { id: 'pay', label: 'Payment svc', sub: 'T2 / C2', x: 580, y: 130, w: 170, kind: 'server', info: 'Ye kya hai: paise wali service. Payment gateway ko charge request bhejti hai, idempotency key ke saath. Compensation: refund.' },
          { id: 'earn', label: 'Earnings svc', sub: 'T3 / C3', x: 580, y: 210, w: 170, kind: 'server', info: 'Ye kya hai: creators ki kamai ka hisaab rakhne wali service. Arjun ke ledger (hisaab ki kitaab) mein +₹140 entry. Compensation: −₹140 reverse entry (purani entry delete nahi hoti).' },
          { id: 'notif', label: 'Notification svc', sub: 'T5', x: 580, y: 290, w: 170, kind: 'server', info: 'Ye kya hai: emails aur notifications bhejne wali service. Yahan welcome email. Pivot ke baad hai, isliye fail ho to sirf retry, koi compensation nahi.' },
        ],
        edges: [{ a: 'u', b: 'o' }, { a: 'o', b: 'sub' }, { a: 'o', b: 'pay' }, { a: 'o', b: 'earn' }, { a: 'o', b: 'notif' }],
        scenarios: [
          { name: 'Happy path', steps: [
            { title: 'Saga shuru', text: 'Orchestrator ne saga row banayi: <code>saga 77: step=0, RUNNING</code>.', go: 'u>o', msg: 'POST /memberships { channel: "arjun", plan: "199" }', after: { o: { sub: 'saga 77: step 0' } } },
            { title: 'T1: membership PENDING', text: 'Command bheja, jawab aaya, state update: step=1.', go: ['o>sub', 'res:sub>o'], after: { sub: { state: 'ok', sub: 'PENDING' }, o: { sub: 'saga 77: step 1' } } },
            { title: 'T2: charge', text: 'Payment svc gateway pe charge karta hai, key <code>saga-77-T2</code> ke saath.', go: ['o>pay', 'res:pay>o'], msg: 'Idempotency-Key: saga-77-T2', after: { pay: { state: 'ok', sub: '₹199 charged' }, o: { sub: 'saga 77: step 2' } } },
            { title: 'T3: Arjun ko credit', go: ['o>earn', 'res:earn>o'], text: 'Ledger mein +₹140.', after: { earn: { state: 'ok', sub: '+₹140' }, o: { sub: 'saga 77: step 3' } } },
            { title: 'T4: ACTIVE (pivot)', go: ['o>sub', 'res:sub>o'], text: 'Point of no return. Ab ye saga poora hi hoga.', after: { sub: { sub: 'ACTIVE' }, o: { sub: 'saga 77: step 4' } } },
            { title: 'T5 + jawab', go: ['o>notif', 'res:o>u'], text: 'Email queue mein, Riya ko "Welcome to Arjun\'s channel!"', after: { notif: { state: 'ok', sub: 'email queued' }, o: { state: 'ok', sub: 'saga 77: DONE' } } },
          ]},
          { name: 'T3 fail: compensate', steps: [
            { title: 'T1, T2 ho gaye', text: 'Membership PENDING, ₹199 kat gaye.', go: ['u>o', 'o>sub', 'res:sub>o', 'o>pay', 'res:pay>o'], after: { sub: { state: 'ok', sub: 'PENDING' }, pay: { state: 'ok', sub: '₹199 charged' }, o: { sub: 'saga 77: step 2' } } },
            { title: 'T3 fail', text: 'Arjun ka account freeze hai. Earnings svc ne mana kar diya. Ye business failure hai, retry se theek nahi hoga.', go: ['o>earn', 'bad:earn>o'], after: { earn: { state: 'down', sub: 'REJECTED' }, o: { state: 'warn', sub: 'COMPENSATING' } } },
            { title: 'C2: refund', text: 'Ulte order mein pehle wala undo: refund. Ye bhi idempotency key ke saath (<code>saga-77-C2</code>), taaki retry pe double refund na ho.', go: ['o>pay', 'res:pay>o'], after: { pay: { state: 'dim', sub: 'refunded' } } },
            { title: 'C1: cancel', text: 'Membership CANCELLED.', go: ['o>sub', 'res:sub>o'], after: { sub: { state: 'dim', sub: 'CANCELLED' } } },
            { title: 'Riya ko saaf jawab', text: '"Membership nahi ho payi, ₹199 refund ho gaya, 5-7 din mein account mein." Sab consistent, bina kisi lock ke.', go: 'res:o>u', after: { o: { state: '', sub: 'saga 77: COMPENSATED' } } },
          ]},
          { name: 'Orchestrator crash', intro: 'Orchestrator khud gir jaaye to? Isi liye uski state DB mein hai.', steps: [
            { title: 'T1, T2 ho gaye', text: 'State DB mein: step=2.', go: ['u>o', 'o>sub', 'res:sub>o', 'o>pay', 'res:pay>o'], after: { sub: { state: 'ok', sub: 'PENDING' }, pay: { state: 'ok', sub: '₹199 charged' }, o: { sub: 'saga 77: step 2' } } },
            { title: 'Crash!', text: 'T3 bhejne se pehle orchestrator ka pod mar gaya (deploy).', set: { o: { state: 'down', sub: 'CRASHED' } }, go: 'lost:o>earn' },
            { title: 'Naya instance, purani state', text: 'Naya pod uthta hai, DB se adhoore sagas padhta hai: "saga 77 step 2 pe tha". Memory mein kuch nahi tha, sab DB mein.', set: { o: { state: 'warn', sub: 'resumed: step 2' } }, focus: ['o'] },
            { title: 'T3 se aage', text: 'Wahi se aage. Agar shak ho ki T2 ka jawab record hua ya nahi, T2 ko <em>same idempotency key</em> se dobara bhejo: Payment svc purana result lauta dega, dobara charge nahi karega.', go: ['o>earn', 'res:earn>o', 'o>sub', 'res:sub>o'], after: { earn: { state: 'ok', sub: '+₹140' }, sub: { sub: 'ACTIVE' }, o: { state: 'ok', sub: 'saga 77: step 4' } } },
          ]},
        ],
      },

      { type: 'h2', text: 'Saga style 2: Choreography (koi conductor nahi)' },
      { type: 'p', html: `Doosra tareeka: koi boss nahi. Har service apna kaam karke ek <strong>event</strong> publish karti hai ("payment ho gaya"), aur jo service us event ki parwah karti hai wo apna agla kadam khud uthati hai. Jaise Kafka lesson mein ek event ko kai teams padhti thi. Fail hone pe bhi ek event ("payment fail") jaata hai, aur pichhli services usse sun ke apna compensation khud karti hain.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Choreography', html: `<strong>Ye kya hai:</strong> saga jisme koi boss nahi. Har service ek <strong>event</strong> (chhota message: "ye ho gaya") sunti hai, apna kaam karti hai, aur apna event publish karti hai. Jaise ek group dance jahan har dancer music sun ke khud agla step leta hai.<br><strong>Kyun chahiye:</strong> services ek doosre ko seedha call nahi karti, to loosely coupled rehti hain; ek nayi service bas event sun ke jud sakti hai.<br><strong>Iske bina (yaani orchestration):</strong> ek extra central service banani padti hai jo sabko command de.<br><strong>Keemat:</strong> poora flow kahin ek jagah likha nahi hota.` },
      { type: 'flow', title: 'Choreographed saga over Kafka', height: 340,
        nodes: [
          { id: 'sub', label: 'Subscription svc', sub: 'T1, T4 / C1', x: 130, y: 70, w: 170, kind: 'server', info: 'Ye kya hai: memberships wali service. MembershipRequested publish karti hai. PaymentFailed sune to CANCELLED karta hai. EarningsCredited sune to ACTIVE karta hai.' },
          { id: 'bus', label: 'Kafka', sub: 'membership events', x: 365, y: 170, w: 160, kind: 'queue', info: 'Ye kya hai: event log (Kafka lesson), jahan services events daalti aur padhti hain. Har event ki key = membership ID, to ek membership ke saare events order mein aate hain (same partition). Delivery at-least-once hai, to duplicates aa sakte hain.' },
          { id: 'pay', label: 'Payment svc', sub: 'T2 / C2', x: 600, y: 70, w: 160, kind: 'server', info: 'Ye kya hai: paise wali service. MembershipRequested sun ke charge karti hai. Result ke hisaab se PaymentCaptured ya PaymentFailed publish karta hai. EarningsFailed sune to refund.' },
          { id: 'earn', label: 'Earnings svc', sub: 'T3 / C3', x: 600, y: 270, w: 160, kind: 'server', info: 'Ye kya hai: creator earnings wali service. PaymentCaptured sun ke Arjun ko credit karti hai. Har event ID ek processed_events table mein likhta hai, taaki duplicate event pe dobara credit na ho.' },
          { id: 'notif', label: 'Notification svc', sub: 'T5', x: 130, y: 270, w: 170, kind: 'server', info: 'Ye kya hai: notification service. MembershipActivated event sun ke welcome email bhejti hai. Koi isse seedha call nahi karta.' },
        ],
        edges: [{ a: 'sub', b: 'bus' }, { a: 'pay', b: 'bus' }, { a: 'earn', b: 'bus' }, { a: 'notif', b: 'bus' }],
        scenarios: [
          { name: 'Happy path', steps: [
            { title: 'MembershipRequested', text: 'Subscription svc ne PENDING row aur outbox event ek hi transaction mein likha. Event Kafka mein gaya, Payment svc ne suna.', go: ['evt:sub>bus', 'evt:bus>pay'], after: { sub: { state: 'ok', sub: 'PENDING' } }, msg: '{ "type": "MembershipRequested", "id": "m-77", "eventId": "e-1" }' },
            { title: 'PaymentCaptured', text: 'Charge hua. Naya event. Earnings svc ne suna.', go: ['evt:pay>bus', 'evt:bus>earn'], after: { pay: { state: 'ok', sub: '₹199 charged' } } },
            { title: 'EarningsCredited', text: 'Arjun +₹140. Event wapas Subscription svc tak.', go: ['evt:earn>bus', 'evt:bus>sub'], after: { earn: { state: 'ok', sub: '+₹140' } } },
            { title: 'MembershipActivated', text: 'ACTIVE. Notification svc ne suna aur email bheja. Kisi ne kisi ko "command" nahi diya: sab events pe naache.', go: ['evt:sub>bus', 'evt:bus>notif'], after: { sub: { sub: 'ACTIVE' }, notif: { state: 'ok', sub: 'email sent' } } },
          ]},
          { name: 'Payment fail', steps: [
            { title: 'MembershipRequested', go: ['evt:sub>bus', 'evt:bus>pay'], text: 'Same shuruaat.', after: { sub: { state: 'ok', sub: 'PENDING' } } },
            { title: 'Card declined', text: 'Payment svc PaymentFailed publish karta hai.', go: ['bad:pay>bus', 'bad:bus>sub'], after: { pay: { state: 'down', sub: 'declined' } } },
            { title: 'Subscription khud compensate karta hai', text: 'Subscription svc ne PaymentFailed suna aur C1 chalaya: CANCELLED. Earnings svc ko kabhi kuch pata hi nahi chala, kyunki uske liye koi event aaya hi nahi.', focus: ['sub'], set: { sub: { state: 'dim', sub: 'CANCELLED' } } },
          ]},
          { name: 'Duplicate event', intro: 'Kafka at-least-once hai. Earnings svc ne credit kiya, lekin offset commit karne se pehle restart ho gaya.', steps: [
            { title: 'Pehli baar', text: 'PaymentCaptured (eventId e-2) aaya. Credit + "e-2 processed" ek hi DB transaction mein.', go: 'evt:bus>earn', after: { earn: { state: 'ok', sub: '+₹140 (e-2 saved)' } }, msg: 'BEGIN; INSERT ledger (+140); INSERT processed_events (e-2); COMMIT;' },
            { title: 'Restart, same event dobara', text: 'Offset commit nahi hua tha, to Kafka ne e-2 phir diya.', go: 'evt:bus>earn', set: { earn: { state: 'warn', sub: 'e-2 again?' } } },
            { title: 'Idempotent consumer: skip', text: 'processed_events mein e-2 pehle se hai. Kuch mat karo, bas ack. Arjun ko ₹280 nahi, ₹140 hi mile.', focus: ['earn'], set: { earn: { state: 'ok', sub: 'e-2 seen: skip' } }, msg: 'INSERT processed_events (e-2) → duplicate key → skip' },
          ]},
          { name: 'Kaun dekh raha hai?', intro: 'Choreography ki chhupi kamzori.', steps: [
            { title: 'PaymentCaptured gaya', go: ['evt:sub>bus', 'evt:bus>pay', 'evt:pay>bus'], text: 'Sab theek chal raha tha.', after: { sub: { state: 'ok', sub: 'PENDING' }, pay: { state: 'ok', sub: '₹199 charged' } } },
            { title: 'Earnings svc ka consumer atka', text: 'Ek bug se Earnings ka consumer crash-loop mein hai. Event Kafka mein pada hai, koi padh nahi raha.', go: 'lost:bus>earn', set: { earn: { state: 'down', sub: 'consumer stuck' } } },
            { title: 'Membership hamesha PENDING', text: 'Koi central jagah nahi jo bole "saga 77 ko 10 minute ho gaye, kahan atka?" Har service sirf apna hissa jaanti hai. Fix: saga timeouts, consumer lag alerts, aur ek tracking view. Bade flows mein yahi wajah hai ki log orchestration chunte hain.', focus: ['sub'], set: { sub: { state: 'warn', sub: 'PENDING forever?' } } },
          ]},
        ],
      },
      { type: 'table', head: ['', 'Choreography', 'Orchestration'], rows: [
        ['Kaun chalata hai', 'Koi nahi, events se har service khud', 'Ek orchestrator / workflow engine'],
        ['Coupling', 'Services ek doosre ke events jaanti hain', 'Services sirf orchestrator ki commands jaanti hain'],
        ['Poora flow kahan likha', 'Kahin nahi, kai services mein bikhra', 'Ek jagah (code ya state machine)'],
        ['Debugging, "kahan atka?"', 'Mushkil: logs jodne padte hain', 'Aasaan: orchestrator ki state dekho'],
        ['Single point of failure', 'Nahi (lekin Kafka pe depend)', 'Orchestrator (isliye uski state durable)'],
        ['Kab achha', '2-4 steps, simple, teams independent', '4+ steps, branches, timeouts, human steps'],
      ]},
      { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "choreography = zyada scalable, to hamesha wahi"', html: `Dono scale karte hain. Asli farak <strong>samajh</strong> ka hai. 3 services tak events ka naach saaf dikhta hai. 8 services, retries, timeouts aur cyclic events ("A ka event B sunta, B ka C, C ka A") ke baad koi nahi bata paata ki flow kya hai. Microsoft ka saga guide bhi choreography ko simple flows ke liye aur orchestration ko complex flows ke liye suggest karta hai.` },

      { type: 'h2', text: 'Saga ki kamzori: isolation nahi hai' },
      { type: 'p', html: `Saga mein har step turant commit hota hai, to doosri requests beech ki halat dekh sakti hain. Example: T3 (Arjun +₹140) ho gaya, aur theek usi waqt Arjun ka weekly payout job chal gaya aur ₹140 bhi bank bhej diya. Phir T4 fail hua aur C3 ne −₹140 reverse kiya. Ab Arjun ka balance negative! Isko <strong>dirty read</strong> jaisi anomaly kehte hain: kisi ne woh data padha jo baad mein undo ho gaya. Iske jugaad:` },
      { type: 'list', items: [
        '<strong>Semantic lock</strong>: data pe ek status flag lagao. Earnings entry <code>PENDING</code> mein likho, aur payout job sirf <code>CONFIRMED</code> entries uthaye. Saga khatam hone pe CONFIRMED karo. Membership ka PENDING bhi yahi hai.',
        '<strong>Steps ka order sochke</strong>: jo cheez bahar dikhti hai ya jiska undo dard deta hai (credit, email), use pivot ke baad rakho. Microsoft ise "pessimistic view" kehta hai.',
        '<strong>Commutative updates</strong>: aise updates jo kisi bhi order mein lagein, result same (jaise ledger mein +140 aur −140 entries, "balance = 140 set karo" ki jagah).',
        '<strong>Reread value</strong>: update se pehle check karo ki data abhi bhi wahi hai jo tumne pehle padha tha (version number, optimistic locking).',
      ]},
      { type: 'callout', tone: 'warn', title: 'Compensation bhi fail ho sakta hai', html: `Refund API bhi down ho sakta hai. Compensation ko "chhod do" nahi kar sakte, warna Riya ka paisa gaya. Isliye compensations ko <strong>idempotent</strong> banao aur unhe tab tak retry karo jab tak safal na hon (backoff ke saath). Phir bhi na ho, to alert + insaan ke liye queue ("manual refund needed"). Har saga ke design mein poochho: "agar ye undo bhi fail ho to kya?"` },

      { type: 'h2', text: 'Transactional outbox (recap)' },
      { type: 'p', html: `Saga ka har step do kaam karta hai: <strong>apne DB mein likhna</strong> aur <strong>agla event/command bhejna</strong>. Ye wahi <em>dual write</em> problem hai jo Kafka lesson mein dekhi thi: DB commit ho gaya, phir event bhejne se pehle pod mar gaya, to saga hamesha ke liye atak gaya, aur kisi ko pata bhi nahi.` },
      { type: 'callout', tone: 'term', title: 'Naye words: Dual write aur Transactional outbox', html: `<strong>Dual write kya hai:</strong> ek hi kaam mein do alag systems mein likhna (apna DB + Kafka), ek ke baad ek. Dono ke beech crash = ek mein likha, doosre mein nahi.<br><strong>Outbox kya hai:</strong> apne hi DB mein ek <code>outbox</code> table. Event ko data ke saath <strong>usi transaction</strong> mein is table mein likho. Ek alag <strong>relay</strong> (ya Debezium jaisa CDC tool, jo DB ka change log padhta hai) baad mein outbox se events utha ke Kafka mein daalta hai.<br><strong>Kyun chahiye:</strong> "DB mein save" aur "event bheja" kabhi alag na hon. Saga ka agla kadam isi event pe chalta hai.<br><strong>Iske bina:</strong> paisa kat gaya, event nikla hi nahi, saga hamesha ke liye atka, aur koi error bhi nahi dikha.` },
      { type: 'code', text: `BEGIN;
  UPDATE memberships SET status = 'PENDING' WHERE id = 'm-77';
  INSERT INTO outbox (event_id, type, aggregate_id, payload)
    VALUES ('e-1', 'MembershipRequested', 'm-77', '{...}');
COMMIT;
-- Ek relay process (ya Debezium jaisa CDC tool) outbox padh ke Kafka mein publish karta hai.` },
      { type: 'p', html: `Ilaaj: event ko <strong>usi local transaction</strong> mein outbox table mein likho. Ya dono save, ya koi nahi. Phir ek alag relay/CDC process outbox se Kafka tak le jaata hai. Poori kahani aur diagram "Kafka aur event streams" lesson ke outbox section mein hai. Yaad rakhne wali baat: outbox <strong>at-least-once</strong> hai, to event kabhi kabhi do baar jaayega. Isliye agla section.` },

      { type: 'h2', text: 'Idempotent consumers (aur idempotency keys)' },
      { type: 'p', html: `Saga mein duplicates har taraf se aate hain: outbox relay dobara bhejta hai, Kafka redeliver karta hai, orchestrator crash ke baad step dobara bhejta hai, timeout pe retry hota hai. Har participant ko aisa banana padta hai ki <strong>same message do baar aaye to asar ek hi baar ho</strong>.` },
      { type: 'callout', tone: 'term', title: 'Idempotent consumer', html: `<strong>Ye kya hai:</strong> wo consumer jo har message ki unique ID (event ID / command ID) yaad rakhta hai. Kaam aur "ID processed" record <strong>ek hi DB transaction</strong> mein likhta hai. ID pehle se mili to bas ack karke skip. (Idempotent = kitni bhi baar karo, asar ek hi baar.)<br><strong>Kyun chahiye:</strong> outbox, Kafka aur retries sab "at-least-once" hain: same message do baar aayega hi.<br><strong>Iske bina:</strong> Arjun ko ₹140 ki jagah ₹280; Riya ko do refund.<br>Queues lesson mein yahi email ke liye dekha tha; yahan paisa hai, to aur bhi zaroori.` },
      { type: 'code', text: `-- Earnings service, PaymentCaptured event e-2 aaya
BEGIN;
  INSERT INTO processed_events (event_id) VALUES ('e-2');   -- PRIMARY KEY
  -- duplicate key error? => pehle ho chuka, ROLLBACK aur ack karo
  INSERT INTO ledger (creator, amount, saga_id, status)
    VALUES ('arjun', 140, 'saga-77', 'PENDING');
COMMIT;` },
      { type: 'p', html: `Bahar ki APIs ke liye <strong>idempotency key</strong>: payment gateway ko har charge ke saath ek unique key bhejo (<code>saga-77-T2</code>). Stripe jaisi APIs same key wali doosri request pe naya charge nahi karti, pehle wala result lauta deti hain. Isse "timeout hua, charge hua ya nahi?" wala darr khatam: bina soche retry karo, same key ke saath. Compensation (refund) ke liye alag key (<code>saga-77-C2</code>), taaki do refund na hon.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Idempotency key', html: `<strong>Ye kya hai:</strong> ek unique string jo tum har request ke saath bhejte ho (jaise <code>saga-77-T2</code>). Server is key ke saath pehla result save karta hai. Same key dobara aaye to kaam dobara nahi karta, wahi purana result lauta deta hai.<br><strong>Kyun chahiye:</strong> timeout pe pata nahi hota kaam hua ya nahi. Key ke saath bina dare retry kar sakte ho.<br><strong>Iske bina:</strong> retry = double charge, ya retry na karo to "shayad paisa kata, shayad nahi".<br><strong>Example:</strong> Stripe same key wali request pe pehla saved result lautata hai (error ho to bhi), aur keys 24 ghante baad hata sakta hai.` },
      { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "pehle check karo, phir karo"', html: `<code>if (!alreadyProcessed(id)) { credit(); markProcessed(id); }</code> do threads ek saath chalein to dono check pass kar lete hain aur do credit ho jaate hain. Check aur kaam ko <strong>atomic</strong> banao: unique constraint wala insert aur kaam ek transaction mein, jaise upar.` },

      { type: 'h3', text: 'Delivery lab: outbox aur idempotency ek saath' },
      { type: 'p', html: `Payment service ne charge save kiya aur use <code>PaymentCaptured</code> event bhejna hai; Earnings service use sun ke Arjun ko ₹140 deti hai. Neeche har jagah crash karwa ke dekho kya bachta hai. Sahi jawab hamesha: <strong>Arjun ko ₹140, na kam na zyada</strong>.` },
      { type: 'custom', render(el) {
        function deliveryCore(o) {
          const events = o.prod === 'dual' ? (o.pCrash ? 0 : 1) : 1 + (o.relayDup ? 1 : 0);
          const deliveries = events + (o.cCrash && events > 0 ? 1 : 0);
          const credits = o.cons === 'naive' ? deliveries : (events > 0 ? 1 : 0);
          return { events, deliveries, credits, rupees: credits * 140, verdict: credits === 1 ? 'ok' : credits === 0 ? 'lost' : 'double' };
        }
        const o = { prod: 'dual', pCrash: true, relayDup: false, cons: 'naive', cCrash: false };
        const OPT = [
          ['prod', 'Payment svc kaise bhejta hai', [['dual', 'Dual write (DB, phir Kafka)'], ['outbox', 'Outbox (ek transaction)']]],
          ['pCrash', 'DB commit ke turant baad Payment svc crash?', [[false, 'Nahi'], [true, 'Haan']]],
          ['relayDup', 'Outbox relay publish ke baad, "sent" mark se pehle crash?', [[false, 'Nahi'], [true, 'Haan']]],
          ['cons', 'Earnings svc consumer', [['naive', 'Naive (seedha credit)'], ['idem', 'Idempotent (event ID yaad)']]],
          ['cCrash', 'Earnings svc credit ke baad, offset commit se pehle crash?', [[false, 'Nahi'], [true, 'Haan']]],
        ];
        el.innerHTML = `<div class="dl-opts" style="display:grid;gap:8px"></div>
          <div class="stats">
            <div class="stat"><span>Kafka mein events</span><strong class="dl-ev"></strong></div>
            <div class="stat"><span>Earnings tak deliveries</span><strong class="dl-del"></strong></div>
            <div class="stat"><span>Arjun ko mila</span><strong class="dl-rs"></strong></div>
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
          q('.dl-note').textContent = (o.prod === 'outbox' && o.pCrash ? 'Crash ke baad bhi event outbox table mein safe tha; relay ne baad mein bhej diya. ' : '') + (r.verdict === 'lost'
            ? 'GADBAD: Riya ka ₹199 kat gaya (DB mein "captured"), lekin event kabhi nikla hi nahi. Arjun ko ₹0 aur saga hamesha ke liye atka. Ilaaj: outbox.'
            : r.verdict === 'double'
              ? `GADBAD: same event ${r.deliveries} baar pahuncha aur naive consumer ne har baar credit kiya: Arjun ko ₹${r.rupees}. Ilaaj: idempotent consumer.`
              : r.deliveries > 1 ? `SAHI: event ${r.deliveries} baar pahuncha, lekin idempotent consumer ne event ID pehchaan ke duplicate skip kiya. Arjun ko ₹140.` : 'SAHI: event ek baar nikla, ek baar credit hua. Arjun ko ₹140.');
        };
        draw();
      }},
      { type: 'p', html: `Saar: <strong>outbox</strong> "event kabhi kho jaaye" wali problem khatam karta hai, lekin badle mein "event kabhi do baar" aata hai (at-least-once). <strong>Idempotent consumer</strong> "do baar" ko "ek baar ka asar" bana deta hai. Dono saath mein hi poora ilaaj hain.` },

      { type: 'h2', text: 'Workflow engines: Temporal aur AWS Step Functions' },
      { type: 'p', html: `Orchestrator khud likhna matlab ye sab khud banana: saga state table, crash ke baad resume, retries with backoff, timeouts ("payment 10 minute mein confirm na ho to cancel"), compensations, monitoring. Ye itna common hai ki iske liye ready-made tools hain: <strong>workflow engines</strong>.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Durable execution', html: `<strong>Ye kya hai:</strong> tumhara workflow code aise chalta hai jaise crash hota hi nahi. Engine har completed step ka result ek <strong>event history</strong> (diary) mein durable store pe likhta hai. Worker machine mar gayi? Doosri machine code ko shuru se <strong>replay</strong> karti hai, lekin jo steps pehle ho chuke unka result history se le leti hai (dobara chalati nahi), aur wahin se aage badhti hai jahan ruka tha.<br><strong>Kyun chahiye:</strong> saga state table, resume logic, retries, timers: sab khud likhne ki zaroorat nahi.<br><strong>Iske bina:</strong> deploy ke beech mein chalti sagas adhoori reh jaati hain, ya khud ka recovery code likhna padta hai.` },
      { type: 'h3', text: 'Temporal' },
      { type: 'p', html: `Temporal open-source workflow engine hai. Iske founders ne pehle Uber mein <strong>Cadence</strong> banaya tha, jo Uber ki kai business-critical services chalata tha; Temporal 2019 mein usi se nikla. Tum normal code (Go, Java, TypeScript, Python...) mein workflow likhte ho:` },
      { type: 'code', text: `// Workflow: normal code, lekin durable. Har await ek "Activity" hai.
async function membershipSaga(req) {
  const undo = [];
  try {
    await createPending(req);          undo.push(() => cancelMembership(req));
    await charge(req, 'saga-77-T2');   undo.push(() => refund(req, 'saga-77-C2'));
    await creditCreator(req);          undo.push(() => reverseCredit(req));
    await activate(req);               // pivot
  } catch (err) {
    for (const c of undo.reverse()) await c();   // compensations, ulte order mein
    throw err;
  }
  await sendWelcomeEmail(req);          // retry policy: tab tak jab tak ho na jaaye
}` },
      { type: 'list', items: [
        '<strong>Activities</strong> = side effects wale kaam (API call, DB write). Inka result history mein record hota hai. Default retry policy: 1 second se shuru, har baar double (backoff 2.0), max 100 second ka gap, aur attempts unlimited. Business errors ko "non-retryable" mark kar sakte ho.',
        '<strong>Workflow code deterministic hona chahiye</strong>: replay pe har baar same faisle. Isliye workflow ke andar seedha <code>Date.now()</code> ya random mat use karo; ye kaam activities ya SDK ke diye safe APIs se karo.',
        '<strong>Durable timers</strong>: <code>sleep("30 days")</code> likh sakte ho (jaise "30 din baad membership renew karo"). Timer history mein event hai, koi machine 30 din jaagti nahi baithti.',
        '<strong>Signals</strong>: bahar se workflow ko message, jaise "admin ne manual refund approve kiya". Human steps aise judte hain.',
      ]},
      { type: 'p', html: `Durable execution ko khud chala ke dekho. Worker (wo machine jo workflow code chalati hai) ko alag alag jagah maaro. Naya worker history se replay karta hai: jo steps history mein hain wo <strong>dobara nahi chalte</strong>. Lekin agar worker activity ke <em>beech</em> mein mara, to wo activity dobara chalegi: tab idempotency key hi bachati hai.` },
      { type: 'custom', render(el) {
        const ST = ['T1 createPending', 'T2 charge ₹199', 'T3 creditCreator', 'T4 activate (pivot)', 'T5 sendWelcomeEmail'];
        function replayCore(crash, key) {
          const log = [], hist = []; let charges = 0, runs = 0;
          const exec = (i, w) => { runs++; if (i === 1) charges++; hist.push(i); log.push([w, 'run', ST[i]]); };
          const k = { none: 5, after1: 1, after2: 2, during2: 1, after4: 4 }[crash];
          for (let i = 0; i < k; i++) exec(i, 'W1');
          if (crash === 'during2') { runs++; charges++; log.push(['W1', 'crash', 'T2 chala: gateway ne ₹199 kaat liye, lekin result history mein likhne se pehle W1 mara']); }
          else if (k < 5) log.push(['W1', 'crash', 'W1 mara (deploy / machine gayi)']);
          if (k < 5 || crash === 'during2') {
            for (let i = 0; i < hist.length; i++) log.push(['W2', 'skip', ST[hist[i]] + ': result history se, dobara nahi chala']);
            const from = hist.length;
            for (let i = from; i < 5; i++) {
              if (i === 1 && crash === 'during2') { runs++; if (!key) charges++; hist.push(1); log.push(['W2', key ? 'same' : 'run', key ? 'T2 retry, same key saga-77-T2: gateway ne pehla result lautaya, naya charge NAHI' : 'T2 retry, bina key: gateway ne phir se ₹199 kaate!']); }
              else exec(i, 'W2');
            }
          }
          return { log, charges, runs, hist: hist.length };
        }
        let crash = 'during2', key = false;
        const CR = [['none', 'Koi crash nahi'], ['after1', 'T1 ke baad'], ['after2', 'T2 ke baad'], ['during2', 'T2 ke beech'], ['after4', 'T4 ke baad']];
        el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center"><span style="font-size:14px;color:var(--ink-2)">Worker kab mare:</span><span class="rp-c" style="display:flex;flex-wrap:wrap;gap:6px"></span></div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px"><span style="font-size:14px;color:var(--ink-2)">Charge pe idempotency key:</span><span class="rp-k" style="display:flex;gap:6px"></span></div>
          <ol class="rp-log" style="margin:12px 0 0;padding-left:22px;font-size:14px;line-height:1.55"></ol>
          <div class="stats"><div class="stat"><span>Activities asal mein chalin</span><strong class="rp-runs"></strong></div><div class="stat"><span>Riya se kata</span><strong class="rp-ch"></strong></div><div class="stat"><span>Workflow</span><strong class="rp-st"></strong></div></div>`;
        const q = s => el.querySelector(s);
        const chips = (box, opts, cur, set) => { box.innerHTML = ''; opts.forEach(([v, t]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (v === cur ? ' on' : ''); b.textContent = t; b.onclick = () => { set(v); draw(); }; box.appendChild(b); }); };
        const C = { run: ['var(--green)', 'RUN'], skip: ['var(--ink-3)', 'REPLAY'], crash: ['var(--red)', 'CRASH'], same: ['var(--violet)', 'DEDUP'] };
        const draw = () => {
          chips(q('.rp-c'), CR, crash, v => { crash = v; });
          chips(q('.rp-k'), [[true, 'Haan'], [false, 'Nahi']], key, v => { key = v; });
          const r = replayCore(crash, key);
          q('.rp-log').innerHTML = r.log.map(([w, k, t]) => `<li><span style="font:12px var(--f-mono);color:var(--ink-3)">${w}</span> <strong style="color:${C[k][0]}">${C[k][1]}</strong> ${t}</li>`).join('');
          q('.rp-runs').textContent = r.runs; q('.rp-ch').textContent = '₹' + r.charges * 199; q('.rp-ch').style.color = r.charges > 1 ? 'var(--red)' : 'var(--green)';
          q('.rp-st').textContent = 'COMPLETED (' + r.hist + '/5)';
        };
        draw();
      }},
      { type: 'h3', text: 'AWS Step Functions' },
      { type: 'p', html: `AWS ki managed service. Workflow ek <strong>state machine</strong> hai jo JSON (Amazon States Language) mein likhte ho: Task, Choice, Wait, Parallel, Map jaise states. Har Task pe <code>Retry</code> aur <code>Catch</code> likh sakte ho; Catch se compensation wali state pe jaao:` },
      { type: 'code', text: `"ChargePayment": {
  "Type": "Task",
  "Resource": "arn:aws:states:::lambda:invoke",
  "Retry": [{ "ErrorEquals": ["States.Timeout"], "IntervalSeconds": 1, "BackoffRate": 2.0, "MaxAttempts": 3 }],
  "Catch": [{ "ErrorEquals": ["States.ALL"], "Next": "CancelMembership" }],
  "Next": "CreditCreator"
}` },
      { type: 'table', head: ['', 'Standard workflow', 'Express workflow'], rows: [
        ['Max kitni der', '1 saal tak', '5 minute'],
        ['Execution guarantee', 'Exactly-once (Retry likho to hi dobara)', 'Async: at-least-once; Sync: at-most-once'],
        ['History', 'Step Functions rakhta hai (90 din)', 'Sirf CloudWatch Logs mein (enable karo)'],
        ['Human approval (callback token)', 'Haan (.waitForTaskToken)', 'Nahi'],
        ['Kab', 'Payments, membership jaise lambe, non-idempotent flows', 'High-volume, chhote, idempotent kaam'],
      ], caption: 'AWS docs ke hisaab se (2026).' },
      { type: 'table', head: ['Engine se kya milta hai', 'Khud banao to'], rows: [
        ['Durable state + resume after crash', 'Saga state table, recovery job'],
        ['Retries with backoff, per step', 'Har call pe retry code'],
        ['Timers (minutes se mahine)', 'Cron + DB polling'],
        ['History / UI: "saga 77 kahan atka?"', 'Logs jod jod ke dhoondo'],
        ['Human steps (approve / reject)', 'Custom callback system'],
      ]},
      { type: 'callout', tone: 'warn', title: 'Workflow engine ke saath bhi idempotency chahiye', html: `Engine activity ko retry karega. Agar activity ne payment gateway ko charge bhej diya aur jawab aane se pehle worker mar gaya, to engine activity <strong>dobara</strong> chalayega. Idempotency key ke bina double charge. Engine "kab, kitni baar" sambhalta hai; "dobara chale to nuksaan na ho" tumhari zimmedari hai.` },

      { type: 'h2', text: 'Decide' },
      { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>Ek database ke andar</strong>: normal transaction. Kuch aur mat sochna.<br><strong>Kai services ke beech</strong>: saga. Ek line ke local steps, har step ka ek "undo" (compensation).<br><strong>"DB mein save" aur "event publish"</strong> ko kabhi alag mat hone do: outbox pattern.<br>Aur har consumer / har step <strong>idempotent</strong>.` },
      { type: 'table', head: ['Situation', 'Choice'], rows: [
        ['Saara data ek DB mein (ya ek service mein)', 'Local ACID transaction. Shayad services ko itna todne ki zaroorat hi nahi thi.'],
        ['Apne hi kuch databases, strong atomicity, chhota scale', '2PC / XA ho sakta hai, lekin blocking aur latency ka dhyaan'],
        ['2-4 services, simple seedha flow', 'Choreographed saga over Kafka + outbox'],
        ['Bahut steps, branches, timeouts, human approval', 'Orchestrated saga, workflow engine (Temporal / Step Functions)'],
        ['Bahar ki API (payment gateway) beech mein', 'Saga + idempotency keys. 2PC possible hi nahi.'],
      ]},
      { type: 'callout', tone: 'mistake', title: 'Saga kab NAHI', html: `Agar do cheezein hamesha saath badalni chahiye aur ek pal ka bhi farak nuksaan hai (jaise ek hi account ke do balance fields), to unhe <strong>ek hi service, ek hi DB</strong> mein rakho. Saga distributed data ka ilaaj hai, galat jagah tode gaye services ka nahi.` },
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

      { type: 'diagram', title: 'Sagas: poori picture', height: 610,
        groups: [
          { label: 'Services (apna DB)', x: 14, y: 340, w: 692, h: 100 },
        ],
        nodes: [
          { id: 'riya', label: 'Riya', sub: 'Join ₹199', x: 360, y: 46, w: 150, kind: 'client', info: 'Ye kya hai: user ka app. "Join" dabane pe turant "Processing..." dikhta hai; result kuch second mein aata hai.' },
          { id: 'gw', label: 'API gateway', sub: 'auth, rate limit', x: 360, y: 150, w: 160, kind: 'edge', info: 'Ye kya hai: sab requests ka darwaza (resilience lesson). Request ko membership workflow tak bhejta hai.' },
          { id: 'wf', label: 'Membership saga', sub: 'Temporal / Step Fns', x: 280, y: 262, w: 200, kind: 'server', info: 'Ye kya hai: orchestrator / workflow engine. Steps T1-T5 chalata hai, fail pe compensations ulte order mein, retries aur timers bhi yahi.' },
          { id: 'hist', label: 'Workflow history', sub: 'durable state', x: 580, y: 262, w: 180, kind: 'data', info: 'Ye kya hai: har step ka result yahan likha jaata hai. Worker mare to naya worker isi se replay karke wahin se aage badhta hai.' },
          { id: 'sub', label: 'Subscription', sub: 'DB + outbox', x: 95, y: 395, w: 150, kind: 'server', info: 'Ye kya hai: membership service. T1 PENDING, T4 ACTIVE (pivot), C1 CANCELLED. Event outbox table se nikalta hai.' },
          { id: 'pay', label: 'Payment', sub: 'idempotency keys', x: 270, y: 395, w: 150, kind: 'server', info: 'Ye kya hai: paise wali service. T2 charge, C2 refund, dono alag idempotency keys ke saath, taaki retry pe double na ho.' },
          { id: 'earn', label: 'Earnings', sub: 'processed_events', x: 445, y: 395, w: 150, kind: 'server', info: 'Ye kya hai: creator earnings. T3 +₹140 (PENDING entry, semantic lock), C3 reverse entry. Idempotent consumer: event ID yaad rakhta hai.' },
          { id: 'notif', label: 'Notification', sub: 'retry till sent', x: 620, y: 395, w: 150, kind: 'server', info: 'Ye kya hai: email service. T5 pivot ke baad, isliye fail ho to sirf retry, koi undo nahi.' },
          { id: 'kafka', label: 'Kafka', sub: 'events via outbox', x: 95, y: 530, w: 150, kind: 'queue', info: 'Ye kya hai: event log. Outbox relay yahan events daalta hai (at-least-once); doosri services (analytics, search) bhi sun sakti hain.' },
          { id: 'psp', label: 'Payment gateway', sub: 'bahar ki company', x: 270, y: 530, w: 150, kind: 'net', info: 'Ye kya hai: Razorpay/Stripe jaisi bahar ki API. 2PC mein hissa nahi le sakti, isliye saga + idempotency key.' },
          { id: 'email', label: 'Email provider', sub: 'bahar ki API', x: 620, y: 530, w: 160, kind: 'net', info: 'Ye kya hai: email bhejne wali bahar ki service. Bheja hua email wapas nahi aata, isliye ye kaam sabse end mein.' },
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
          { name: 'Happy path', text: 'Workflow ne T1-T5 ek ek karke chalaye, har step ke baad history mein save.', go: ['riya>gw>wf>sub', 'wf>pay>psp', 'wf>earn', 'wf>notif>email', 'wf>hist'] },
          { name: 'T3 fail: compensate', text: 'Earnings ne mana kiya. Ulte order mein C2 (refund, apni key ke saath) aur C1 (cancel).', go: ['wf>earn', 'wf>pay>psp', 'wf>sub'] },
          { name: 'Worker crash: resume', text: 'Worker mara. Naya worker history padh ke replay karta hai aur agle step se chalta hai.', go: ['wf>hist'] },
          { name: 'Event + idempotent consumer', text: 'Subscription ka event outbox se Kafka, wahan se Earnings. Duplicate aaya to event ID dekh ke skip.', go: ['sub>kafka>earn'] },
        ],
      },
      { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
        <li>Ek DB ke andar: normal ACID transaction. Kai services ke beech: koi shared COMMIT nahi.</li>
        <li><strong>2PC</strong>: PREPARE (sab YES?) phir COMMIT. Atomic, lekin locks, slow, aur coordinator crash pe participants <strong>block</strong>. Bahar ki APIs ke saath possible nahi.</li>
        <li><strong>Saga</strong>: local steps ki line, har step ka compensation (refund, cancel), fail pe ulte order mein. Pivot ke baad sirf retry.</li>
        <li><strong>Orchestration</strong> (ek conductor, flow ek jagah) vs <strong>choreography</strong> (events, koi boss nahi). Bade flows mein orchestration.</li>
        <li>Saga mein isolation nahi: semantic lock (PENDING), sahi order, commutative updates.</li>
        <li><strong>Outbox</strong>: DB write aur event ek transaction mein. <strong>Idempotent consumer</strong> + idempotency key: duplicate ka asar ek baar.</li>
        <li><strong>Temporal / Step Functions</strong>: durable state, replay, retries, timers. Idempotency phir bhi tumhari zimmedari.</li>
      </ul>` },
      { type: 'tradeoffs',
        gains: ['Har service apna DB rakhti hai, independent scale aur deploy', 'Koi lambe distributed locks nahi: ek slow service baaki ko jam nahi karti', 'Bahar ki APIs (payment gateway) bhi flow mein aa sakti hain', 'Failure ka saaf, business-level jawab (refund, cancel), history ke saath', 'Workflow engine se crash ke baad automatic resume, retries, timers'],
        costs: ['Isolation nahi: beech ka state dikh sakta hai (semantic locks chahiye)', 'Har step ka compensation likhna, test karna, aur uska fail hona sambhalna', 'Eventual consistency: kuch second "PENDING" dikhega', 'Har participant idempotent banana padta hai', 'Choreography mein flow samajhna aur debug karna mushkil; orchestration mein ek aur critical component'] },

      { type: 'think', questions: [
        { q: 'Saga mein T2 (charge) ka request payment gateway ko gaya, aur 10 second koi jawab nahi aaya. Orchestrator ko kya karna chahiye: refund, retry, ya kuch aur?', a: 'Pata nahi charge hua ya nahi, to andhe refund ya naya charge dono galat ho sakte hain. Same idempotency key se retry karo (ya gateway se us key/order ka status poochho). Gateway pehle wala result lauta dega: charged ho chuka to "success", nahi hua to ab ho jaayega. Tab hi aage badho ya compensate karo.' },
        { q: 'Kya welcome email (T5) ko T1 se pehle bhej dena theek hai, taaki Riya ko jaldi feedback mile?', a: 'Nahi. Email ka undo nahi hota. Agar baad mein payment fail hua to Riya ke paas "Welcome!" email aur koi membership nahi. Jinka undo nahi hota aise steps ko pivot ke baad rakho. Turant feedback ke liye app mein "Processing..." dikhao, email nahi.' },
        { q: 'xyz.com ka orchestrator choreography se zyada "single point of failure" kyun lagta hai, aur ise kaise theek karte hain?', a: 'Saari sagas ek service se guzarti hain. Ilaaj: orchestrator stateless rakho aur state durable store mein (ya workflow engine ke replicated cluster mein), kai instances chalao. Crash pe doosra instance state padh ke resume kar leta hai, jaise flow ke "Orchestrator crash" scenario mein.' },
      ]},
      { type: 'quiz', questions: [
        { q: '2PC mein coordinator PREPARE ke baad (sabke YES ke baad) aur decision bhejne se pehle crash ho gaya. Participants kya karte hain?', options: ['Khud commit kar lete hain', 'Khud abort kar lete hain', 'In-doubt rehte hain, locks pakde wait karte hain', 'Doosra coordinator turant faisla le leta hai'], answer: 2, explain: 'YES vote ek vaada hai ki participant akele faisla nahi lega. Doosron ka vote nahi pata, to commit ya abort dono galat ho sakte hain. Isliye wo block ho jaata hai: yahi 2PC ka blocking problem hai.' },
        { q: 'Saga mein T3 fail hua (T1, T2 safal the). Kya chalega?', options: ['C3, C2, C1', 'C2, phir C1', 'C1, phir C2', 'Database rollback'], answer: 1, explain: 'Sirf jo safal hue unka undo, ulte order mein: C2 (refund) phir C1 (cancel). T3 fail hua to uska asar hai hi nahi.' },
        { q: '"DB mein row save karo" aur "Kafka mein event bhejo" kabhi out of sync na hon, iska standard tareeka?', options: ['Pehle Kafka, phir DB', 'Transactional outbox: event usi DB transaction mein outbox table mein, phir relay/CDC publish kare', 'Dono ko try-catch mein', '2PC Kafka ke saath'], answer: 1, explain: 'Outbox se service sirf ek system (apna DB) mein likhti hai, atomically. Publish baad mein relay karta hai, at-least-once.' },
        { q: 'Payment service ko same "PaymentCaptured" event do baar mila. Sahi design?', options: ['Kafka ko exactly-once pe set karo, bas', 'Event ID processed_events mein unique key ke saath, kaam ke saath ek transaction mein; duplicate pe skip', 'Pehle check karo, phir alag se mark karo', 'Duplicates ignore nahi kar sakte'], answer: 1, explain: 'Idempotent consumer: check + kaam atomic. Alag alag check aur mark karne mein race condition hai.' },
        { q: 'AWS Step Functions mein payment jaisa non-idempotent, kai minute chalne wala flow. Kaunsa type?', options: ['Express (async)', 'Standard', 'Express (sync)', 'Koi bhi'], answer: 1, explain: 'Standard: exactly-once execution, 1 saal tak, history 90 din. Express max 5 minute ka hai, aur async Express at-least-once hai.' },
      ]},
      { type: 'sources', note: 'Version-specific facts (Postgres 2PC, Step Functions limits, Temporal retries, Stripe idempotency) inhi docs se check kiye gaye.', items: [
        { title: 'Sagas', publisher: 'SIGMOD 1987 paper (Garcia-Molina, Salem)', year: 1987, url: 'https://www.cs.cornell.edu/andru/cs711/2002fa/reading/sagas.pdf', used: 'Origin of the saga idea: a long transaction split into steps, each with a compensating transaction.' },
        { title: 'Pattern: Saga', publisher: 'microservices.io (Chris Richardson)', url: 'https://microservices.io/patterns/data/saga.html', used: 'Saga as sequence of local transactions, compensating transactions, choreography vs orchestration, lack of isolation.' },
        { title: 'Saga design pattern', publisher: 'Microsoft Azure Architecture Center', official: true, url: 'https://learn.microsoft.com/en-us/azure/architecture/patterns/saga', used: 'Compensable, pivot and retryable transactions; anomalies (lost updates, dirty reads); countermeasures (semantic lock, commutative updates, pessimistic view, reread values); choreography vs orchestration pros/cons.' },
        { title: 'PREPARE TRANSACTION', publisher: 'PostgreSQL documentation', official: true, url: 'https://www.postgresql.org/docs/current/sql-prepare-transaction.html', used: 'Prepared transactions keep their locks, are meant for external transaction managers, should not be left around (VACUUM, wraparound), and max_prepared_transactions = 0 recommendation.' },
        { title: 'Spanner: Google\'s Globally-Distributed Database', publisher: 'OSDI 2012 paper (Google)', year: 2012, url: 'https://static.googleusercontent.com/media/research.google.com/en//archive/spanner-osdi2012.pdf', used: 'Two-phase commit run over Paxos groups to reduce its availability problems.' },
        { title: 'Choosing workflow type in Step Functions', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/step-functions/latest/dg/choosing-workflow-type.html', used: 'Standard (1 year, exactly-once, 90-day history, .waitForTaskToken) vs Express (5 minutes, at-least-once async / at-most-once sync).' },
        { title: 'Temporal Workflows and Retry Policies', publisher: 'Temporal documentation', official: true, url: 'https://docs.temporal.io/workflows', used: 'Durable execution, event history replay, determinism requirement, activities, durable timers; default retry policy (1 s, 2.0, 100 s max interval, unlimited attempts) from docs.temporal.io/encyclopedia/retry-policies.' },
        { title: 'Saga Pattern Made Easy', publisher: 'Temporal blog', official: true, url: 'https://temporal.io/blog/saga-pattern-made-easy', used: 'Registering a compensation after each step and running them in reverse on failure.' },
        { title: 'Idempotent requests', publisher: 'Stripe API reference', official: true, url: 'https://docs.stripe.com/api/idempotent_requests', used: 'Same key returns the saved first result (even errors); keys can be pruned after 24 hours.' },
        { title: 'Who we are', publisher: 'Temporal', official: true, url: 'https://temporal.io/about', used: 'Temporal founders created Cadence at Uber.' },
      ]},
    ],
  });
})();
