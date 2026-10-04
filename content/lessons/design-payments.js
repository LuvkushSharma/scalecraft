Lesson.register({
  id: 'design-payments',
  title: 'Payments: UPI, Paytm, Razorpay',
  minutes: 45,
  summary: `Riya ne xyz.com Premium ke ₹499 UPI se diye. Paisa ek baar kate, kabhi do baar nahi, kabhi gayab nahi, chahe network beech mein toot jaaye ya bank 2 minute baad jawab de. Idempotency keys, payment state machine, double-entry ledger, UPI ka asli flow (PSP → NPCI → banks), timeout = "unknown", outbox, signed webhooks aur daily reconciliation: ek ek karke, problem se.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Riya phone pe "Pay ₹499" dabati hai. Paisa uske bank account se nikal ke xyz.com tak pahunchna chahiye.<br>Beech mein kai computers hain, aur unke beech ka internet kabhi bhi toot sakta hai.<br>Hamara kaam: paisa <strong>sirf ek baar</strong> kate, kabhi do baar nahi, aur kabhi gayab na ho.<br>Aur agar kuch gadbad ho jaaye, to har rupaye ka hisaab ho, taaki galti pakdi aur theek ki ja sake.<br>Ye lesson yahi sikhata hai: ek payment system jo galtiyon ke beech bhi paisa sahi rakhe.` },
    { type: 'callout', tone: 'tip', title: 'Pehle khud try karo', html: `10 minute kaagaz pe socho: Riya ne "Pay ₹499" dabaya. Request bank tak gayi, lekin jawab aane se pehle network toot gaya. Ab app ko kya dikhana chahiye: "failed", "success", ya kuch aur? Aur agar app dobara try kare to kya ₹998 kat jaayenge? Phir yahan compare karo.` },

    { type: 'p', html: `Ab tak xyz.com ne videos, chat aur search banaye. Ab xyz.com <strong>Premium</strong> bechna chahta hai: ₹499 per month. xyz.com khud banks se baat nahi karta. Beech mein ek <strong>payment gateway</strong> hota hai, jaise Razorpay. Is lesson mein hum ek aisa gateway design karenge, naam rakhte hain <strong>xyzPay</strong>, aur uske neeche chalne wale UPI system ko bhi samjhenge.` },
    { type: 'callout', tone: 'term', title: 'Naya word: merchant', html: `<strong>Ye kya hai:</strong> jo paisa <em>le</em> raha hai. Is lesson mein merchant hai xyz.com.<br><strong>Kyun chahiye:</strong> har payment mein ek dene wala (Riya) aur ek lene wala (merchant) hota hai. Merchant ka server hi Riya ko Premium deta hai, jab paisa pakka aa jaaye.<br><strong>Iske bina:</strong> payment kisko jaaye, ye hi tay nahi.` },
    { type: 'callout', tone: 'term', title: 'Naya word: UPI', html: `<strong>Ye kya hai:</strong> India ka ek system jisse phone se seedha ek bank account se doosre bank account mein turant paisa jaata hai. Account number ki jagah ek chhota naam (jaise <code>riya@okbank</code>) aur ek secret PIN.<br><strong>Kyun chahiye:</strong> India mein online payments ka sabse bada tareeka yahi hai, isliye xyz.com ko ise support karna hi hai.<br><strong>Iske bina:</strong> sirf cards bachte, aur zyada tar log card se nahi, UPI se pay karte hain.<br>UPI ko <strong>NPCI</strong> naam ki sanstha chalati hai. Andar ka poora raasta Deep dive 4 mein kholenge.` },
    { type: 'callout', tone: 'term', title: 'Naya word: payment gateway (payment aggregator)', html: `<strong>Ye kya hai:</strong> ek company jo hazaron merchants ke liye cards, UPI aur netbanking se paisa collect karti hai, aur kuch din baad apni fee kaat ke merchant ke bank mein bhejti hai. Jaise Razorpay, Cashfree, PayU, Stripe.<br><strong>Kyun chahiye:</strong> har bank aur har payment tareeke ke apne rules, security checks aur connections hain. Har merchant ye sab khud banaye, ye namumkin hai. Gateway ek baar banata hai, sab merchants use karte hain.<br><strong>Iske bina:</strong> xyz.com ko khud dozens banks se jodna padta, unke audits paas karne padte, aur har failure khud sambhalna padta.` },
    { type: 'callout', tone: 'term', title: 'Naya word: PSP (Payment Service Provider)', html: `<strong>Ye kya hai:</strong> UPI ki duniya mein wo bank jiske through koi UPI app UPI network se judta hai. PhonePe, Google Pay, Paytm jaise apps kisi PSP bank ke saath milke kaam karte hain.<br><strong>Kyun chahiye:</strong> UPI network mein sirf banks seedha jud sakte hain. App ki request bank (PSP) hi aage le jaata hai.<br><strong>Iske bina:</strong> UPI app ka network tak koi raasta hi nahi.<br>Ek payment mein do PSP hote hain: <strong>payer PSP</strong> (dene wale Riya ki taraf) aur <strong>payee PSP</strong> (lene wale xyz.com ki taraf).` },
    { type: 'p', html: `Payments ka asli dard ek line mein: <strong>paisa na kabhi khoye, na kabhi do baar kate</strong>, jabki network beech mein toot-ta hai aur banks kabhi kabhi minutes baad jawab dete hain. Baaki systems mein ek galti = ek bura experience. Yahan ek galti = kisi ka asli paisa. Isliye yahan speed se zyada <strong>correctness</strong> aur <strong>auditability</strong> (har rupaye ka hisaab) important hai.` },
    { type: 'callout', tone: 'warn', title: 'Public sources ki limit', html: `Razorpay, PhonePe aur Paytm apne poore internal design publicly nahi batate. Is lesson mein jo bhi company-specific hai wo unke engineering blogs, official docs, NPCI ke circulars aur RBI ke rules se liya gaya hai (neeche sources dekho). Jahan public jaankari nahi hai, wahan hum saaf likhenge ki "industry mein aam taur pe aisa hota hai".` },

    { type: 'h2', text: 'Step 1: requirements' },
    { type: 'compare',
      left: { title: 'Functional', html: `• Merchant order banaye, customer UPI / card se pay kare<br>• Payment ka status: pending, success, failed<br>• Capture (paisa pakka lena) aur refund (poora ya thoda)<br>• Merchant ko webhook: "payment ho gaya"<br>• Merchant ko settlement: kuch din mein fee kaat ke paisa uske bank mein<br>• Dashboard / reports<br><br><strong>Out of scope (sirf awareness):</strong> card network internals, fraud models, PCI DSS audit` },
      right: { title: 'Non-functional', html: `• <strong>Exactly-once effect</strong>: retry pe bhi double charge nahi<br>• Koi paisa "gayab" nahi: har rupaye ka hisaab (ledger)<br>• Strong consistency jahan paisa hai (balance, state)<br>• High availability, lekin galat jawab se behtar "pending"<br>• Har change ka audit trail (kaun, kab, kyun)<br>• Latency: user ko kuch seconds mein result, lekin correctness pehle` },
    },

    { type: 'p', html: `Non-functional list ke teen bhaari words, seedhi bhasha mein:` },
    { type: 'list', items: [
      '<strong>Exactly-once effect</strong>: request chahe 3 baar aaye (retry), paisa sirf 1 baar kate. Request ka aana ek se zyada ho sakta hai; uska <em>asar</em> sirf ek.',
      '<strong>Strong consistency</strong>: jaise hi koi value likhi gayi, har server ko wahi nayi value dikhe. Kabhi koi purana balance na padhe.',
      '<strong>Audit trail</strong>: har badlaav ka record (kya badla, kab, kisne, kyun). Baad mein koi poochhe "ye ₹499 kahan gaye?" to jawab mil sake.',
    ]},

    { type: 'h2', text: 'Step 2: napkin maths' },
    { type: 'p', html: `Real numbers pehle: PhonePe ke engineering blog (2024) ke mutabik peak hours mein PhonePe <strong>8,000+ transactions per second</strong> (TPS: ek second mein kitne payments) process karta tha. AWS ke ek 2026 case study ke mutabik Razorpay mahine mein <strong>50 crore+ transactions</strong> handle karta hai. Hamare xyzPay ke liye "maan lo" numbers se khelo:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Payments per day (lakh)</label><input class="pay-n-d" type="number" value="200" min="1" step="1"></div>
          <div><label>Peak / average ratio</label><input class="pay-n-p" type="number" value="5" min="1" step="1"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Average TPS</span><strong class="pay-n-avg"></strong></div>
          <div class="stat"><span>Peak TPS</span><strong class="pay-n-peak"></strong></div>
          <div class="stat"><span>Ledger rows / day</span><strong class="pay-n-rows"></strong></div>
          <div class="stat"><span>Ledger storage / year</span><strong class="pay-n-st"></strong></div>
        </div>
        <div class="calc-note pay-n-note"></div>`;
      const a = el.querySelector('.pay-n-d'), b = el.querySelector('.pay-n-p');
      const f = n => n >= 1e7 ? (n / 1e7).toFixed(1) + ' crore' : n >= 1e5 ? (n / 1e5).toFixed(1) + ' lakh' : Math.round(n).toLocaleString('en-IN');
      const upd = () => {
        const perDay = Math.max(0, Number(a.value) || 0) * 1e5, peak = Math.max(1, Number(b.value) || 1);
        const avg = perDay / 1e5;
        const rows = perDay * 4;
        const tb = rows * 365 * 200 / 1e12;
        el.querySelector('.pay-n-avg').textContent = f(avg) + '/s';
        el.querySelector('.pay-n-peak').textContent = f(avg * peak) + '/s';
        el.querySelector('.pay-n-rows').textContent = f(rows);
        el.querySelector('.pay-n-st').textContent = tb.toFixed(1) + ' TB';
        el.querySelector('.pay-n-note').textContent = `Ek din ≈ 10^5 seconds maana. Har payment ke ~4 ledger rows (payment ke 2, fee ke 2), ~200 bytes per row, indexes alag. Writes ka volume chhota nahi, lekin asli challenge QPS nahi: har write sahi aur sirf ek baar hona chahiye.`;
      };
      a.addEventListener('input', upd); b.addEventListener('input', upd); upd();
    }},
    { type: 'p', html: `Default values (2 crore payments/day, peak 5x) pe: average ~200 TPS, peak ~1,000 TPS, ~8 crore ledger rows per day, ~5.8 TB per year. Ye ek achhe sharded SQL setup ki pahunch mein hai. Matlab payments mein <em>scale</em> se zyada mushkil hai <em>correctness</em>. Isi pe baaki lesson hai.` },

    { type: 'h2', text: 'Step 3: API aur core entities' },
    { type: 'p', html: `Ye API Razorpay aur Stripe jaise public APIs se milta-julta hai (simplified). Abhi har line samajhna zaroori nahi. <code>Idempotency-Key</code>, webhook aur signature, teeno ek-ek karke aage explain honge. Bas itna dekho: kaun kise kya bhejta hai.` },
    { type: 'code', text: `
# 1. Merchant ka server order banata hai (server-to-server, secret key ke saath)
POST /v1/orders            { "amount": 49900, "currency": "INR", "receipt": "xyz_sub_881" }
  → 201 { "id": "order_7Kq", "status": "created" }       # amount paise mein: 49900 = ₹499

# 2. Checkout (Riya ka app) payment shuru karta hai
POST /v1/payments          Idempotency-Key: 3f9c1e52-...-a71b
  { "order_id": "order_7Kq", "method": "upi", "flow": "intent" }
  → 202 { "id": "pay_Q2x", "status": "pending" }          # 202: kaam shuru hua, result baad mein

# 3. Status poochho (kabhi bhi, kitni baar bhi: GET idempotent hai)
GET  /v1/payments/pay_Q2x  → 200 { "status": "captured", "amount": 49900 }

# 4. Refund
POST /v1/payments/pay_Q2x/refunds   Idempotency-Key: 8a01...   { "amount": 19900 }

# 5. Webhook: xyzPay → xyz.com ka server
POST https://xyz.com/hooks/pay      X-Signature: <HMAC-SHA256 of raw body>
  { "event": "payment.captured", "event_id": "evt_91", "payment_id": "pay_Q2x" }` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: paisa float mein', html: `₹499.99 ko <code>float</code> mein mat rakho: 0.1 + 0.2 computer mein 0.30000000000000004 ban jaata hai. Payments mein amount hamesha <strong>integer, sabse chhoti unit</strong> mein (paise): ₹499 = <code>49900</code>. Razorpay aur Stripe dono API mein yahi karte hain.` },
    { type: 'p', html: `Ab data. Neeche ki table mein kuch naam (ledger, outbox, webhook) abhi naye lagenge. Ghabrao mat: har ek apne deep dive mein zero se explain hoga. Abhi bas itna dekho ki sab kuch ek hi SQL database mein hai.` },
    { type: 'table', head: ['Entity', 'Kya hai', 'Kahan'], rows: [
      ['Order', 'Merchant ka "itna paisa lena hai" ka irada', 'SQL'],
      ['Payment', 'Ek koshish (attempt): method, amount, <strong>state</strong>', 'SQL, state machine ke saath'],
      ['Refund', 'Captured payment ka poora ya thoda wapas', 'SQL, apni state machine'],
      ['Idempotency key', '(merchant, key) → request hash + saved response', 'SQL, unique constraint'],
      ['Journal entry + ledger lines', 'Har paisa movement ka append-only hisaab', 'SQL, strongly consistent'],
      ['Outbox event', '"payment.captured hua" jaisa event, publish hone ka intezaar', 'Same SQL DB'],
      ['Webhook delivery', 'Kis merchant ko kaunsa event, kitni baar try hua', 'SQL / queue'],
    ]},
    { type: 'p', html: `Sab kuch SQL mein kyun? Kyunki yahan humein <a href="#/sql-vs-nosql">ACID transactions</a> chahiye: "payment ki state badlo + ledger lines likho + outbox event likho" ek hi transaction mein, ya to sab ho ya kuch nahi. Ye ek aisa jagah hai jahan strong consistency ke bina kaam nahi chalta.` },

    { type: 'h2', text: 'Step 4: zero se design banao' },
    { type: 'p', html: `Diagram se pehle, ek-ek hissa jodte hain. Har hissa tab aayega jab koi problem use maangegi.` },
    { type: 'p', html: `<strong>Sabse seedha idea:</strong> Riya ka app seedha bank ko bole "₹499 kaat lo". Problem: app Riya ke phone pe hai. Phone pe koi bhi code badal ke ₹1 likh sakta hai, ya kisi aur ka account daal sakta hai. Bank aise anjaan apps se seedhi baat nahi karte. To beech mein ek bharose wala server chahiye.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Payment API (xyzPay ka server)', html: `<strong>Ye kya hai:</strong> xyzPay ke servers jo payment ki har request lete hain: "order banao", "payment shuru karo", "status batao", "refund karo".<br><strong>Kyun chahiye:</strong> yahi check karta hai ki request asli merchant ki hai (secret key se), amount sahi hai, aur ye request pehle aa chuki hai ya nahi. Phir bank ki taraf kaam bhejta hai.<br><strong>Iske bina:</strong> phone pe chalne wala app hi sab tay karta, aur use koi bhi chhed sakta hai.<br><strong>Andar se:</strong> ye <em>stateless</em> hai: apni yaad (state) kuch nahi rakhta, sab database mein likhta hai. Isliye ek <a href="#/load-balancer">load balancer</a> ke peeche jitne chaho utne servers laga sakte ho.` },
    { type: 'p', html: `<strong>Agli problem:</strong> server ko yaad rakhna hai ki kaunsa payment kis haal mein hai. Server crash ho jaaye to bhi ye yaad nahi khoni chahiye. Aur paise ka hisaab bhi kahin likhna hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Payments DB (aur DB transaction)', html: `<strong>Ye kya hai:</strong> ek SQL database (jaise PostgreSQL ya MySQL) jisme har payment, uski state, paise ka hisaab (ledger) aur aage bhejne wale events rakhe jaate hain.<br><strong>Kyun chahiye:</strong> SQL database <strong>transaction</strong> deta hai: kai likhne ke kaam ek packet mein. Ya to saare ho jaate hain, ya ek bhi nahi. Payments mein "state badlo + hisaab likho" kabhi aadha nahi hona chahiye.<br><strong>Iske bina:</strong> server crash pe aadha kaam reh jaata. Jaise state "paid" ho gayi lekin hisaab mein entry nahi. Paisa hisaab se gayab.` },
    { type: 'p', html: `<strong>Agli problem:</strong> asal paisa banks ke paas hai. Banks aur UPI network se baat karne ke apne niyam, apne message formats aur apne security checks hain. Ye kaam ek alag hisse ko dete hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: UPI connector (bank connector)', html: `<strong>Ye kya hai:</strong> xyzPay ka wo hissa jo bahar ki duniya (NPCI aur banks) se baat karta hai. Hamari bhasha ko unke message format mein badalta hai, aur unke jawab wapas laata hai.<br><strong>Kyun chahiye:</strong> bahar ke systems slow ho sakte hain ya jawab de hi na paayein. Connector har call pe ek <strong>timeout</strong> lagata hai (itni der tak jawab nahi aaya to intezaar band) aur har jawab ka record rakhta hai.<br><strong>Iske bina:</strong> Payment API ke threads bank ke jawab ke intezaar mein atak jaate, aur bank ke niyam poore code mein bikhre hote.<br><strong>Real duniya:</strong> Razorpay ka apna "UPI Switch" hai jo yahi kaam karta hai (unke 2026 blog ke mutabik).` },
    { type: 'p', html: `<strong>Aakhri problem:</strong> xyz.com ke server ko pata chalna chahiye ki payment pakka ho gaya, tabhi wo Riya ko Premium dega. App ki baat pe bharosa nahi kar sakte (app badla ja sakta hai). Isliye xyzPay khud xyz.com ke server ko batata hai. Is "batane" ka naam <strong>webhook</strong> hai (Deep dive 5 mein poora). Ab chaaron hisse saath dekho.` },

    { type: 'h2', text: 'Step 5: high-level design' },
    { type: 'p', html: `Pehle seedha raasta (happy path), phir ek bura din. Har box pe click karke uska kaam padho.` },
    { type: 'flow', title: 'xyzPay: ek UPI payment', height: 330,
      nodes: [
        { id: 'c', label: 'Riya ka app', sub: 'xyz.com checkout', x: 95, y: 80, w: 150, kind: 'client', info: 'Ye kya hai: Riya ke phone pe xyz.com ka app, jisme xyzPay ka checkout (pay karne wala screen) laga hai. Is design mein ye payment shuru karta hai aur UPI app kholta hai. Iski baat pe paisa pakka nahi maana jaata, kyunki phone pe app badla ja sakta hai.' },
        { id: 'm', label: 'xyz.com server', sub: 'merchant', x: 95, y: 250, w: 150, kind: 'client', info: 'Ye kya hai: merchant (xyz.com) ka apna server. Order banata hai (secret API key ke saath), aur webhook se "payment ho gaya" sunta hai. Riya ko Premium tabhi deta hai jab server-side confirmation mile, sirf app ke kehne pe nahi.' },
        { id: 'api', label: 'Payment API', sub: 'stateless, LB peeche', x: 300, y: 165, w: 160, kind: 'server', info: 'Ye kya hai: xyzPay ka darwaaza, jahan har payment request aati hai. Is design mein ye check karta hai ki request asli hai aur pehle aa chuki hai ya nahi (idempotency, aage), payment ki state badalta hai, aur connector ko kaam deta hai. Stateless hai, to servers badha ke scale hota hai; saari state DB mein.' },
        { id: 'conn', label: 'UPI connector', sub: 'PSP switch', x: 500, y: 70, w: 150, kind: 'server', info: 'Ye kya hai: xyzPay ka wo hissa jo banks aur NPCI se unki bhasha mein baat karta hai. Razorpay ke engineering blog ke mutabik unka apna "UPI Switch" hai jo NPCI ke saath real-time payments process karta hai. Har bahar wali call pe timeout, aur timeout ka matlab "unknown", "failed" nahi.' },
        { id: 'npci', label: 'NPCI + banks', sub: 'bahar ki duniya', x: 640, y: 165, w: 130, kind: 'net', info: 'Ye kya hai: bahar ki duniya: NPCI (UPI chalane wali sanstha), Riya ka bank (paisa yahan se katega) aur paisa lene wala bank. Ye hamare control mein nahi: slow ho sakte hain, jawab der se de sakte hain. Is dabbe ko Deep dive 4 mein kholenge.' },
        { id: 'db', label: 'Payments DB', sub: 'SQL: state + ledger', x: 500, y: 270, w: 160, kind: 'data', info: 'Ye kya hai: xyzPay ka SQL database, jahan har payment ki state, paise ka hisaab (ledger) aur aage bhejne wale events (outbox) rakhe jaate hain. Ek hi transaction mein state change + ledger lines + outbox event: ya sab, ya kuch nahi.' },
      ],
      edges: [{ a: 'c', b: 'api' }, { a: 'm', b: 'api' }, { a: 'api', b: 'conn' }, { a: 'conn', b: 'npci' }, { a: 'api', b: 'db' }],
      scenarios: [
        { name: 'Happy path', steps: [
          { title: 'Merchant order banata hai', text: 'Riya ne "Premium lo" dabaya. xyz.com ka server pehle xyzPay mein order banata hai. Amount server decide karta hai, app nahi (warna koi app mein ₹1 likh dega).', go: ['m>api', 'res:api>m'], msg: 'POST /v1/orders { amount: 49900 } → order_7Kq' },
          { title: 'App payment shuru karta hai', text: 'Checkout ek nayi idempotency key ke saath payment request bhejta hai.', go: 'c>api', msg: 'POST /v1/payments  Idempotency-Key: 3f9c...' },
          { title: 'DB mein payment: CREATED', text: 'Bank ko kuch bhejne se <strong>pehle</strong> DB mein payment row likhi jaati hai. Agar server abhi crash ho, to bhi record hai ki koshish shuru hui thi.', go: ['api>db', 'res:db>api'], after: { db: { sub: 'pay_Q2x: CREATED' } } },
          { title: 'UPI request bahar', text: 'Connector request NPCI ki taraf bhejta hai. State ab PENDING: humne bahar ki duniya ko kuch bol diya hai.', go: 'api>conn>npci', after: { db: { sub: 'pay_Q2x: PENDING' } } },
          { title: 'Bank: success', text: 'Riya ke bank se paisa kata, beneficiary bank mein jama hua. Jawab wapas aaya.', go: 'res:npci>conn>api' },
          { title: 'Ek transaction mein teen kaam', text: 'State → CAPTURED, ledger lines (debit/credit), aur outbox mein "payment.captured" event. Teeno ek hi DB transaction mein.', go: ['api>db', 'res:db>api'], after: { db: { state: 'ok', sub: 'CAPTURED + ledger' } } },
          { title: 'App ko result, merchant ko webhook', text: 'App ko success dikhta hai. Alag se webhook xyz.com ke server ko jaata hai, aur Riya ko Premium wahi deta hai.', parallel: true, go: ['res:api>c', 'evt:api>m'], msg: 'webhook: payment.captured  pay_Q2x' },
        ]},
        { name: 'Bank slow: timeout', intro: 'Sabse khatarnaak case. Dhyan se dekho.', steps: [
          { title: 'Request bahar gayi', text: 'Payment PENDING, request NPCI ki taraf gayi.', go: 'c>api>conn>npci', after: { db: { sub: 'pay_Q2x: PENDING' } } },
          { title: 'Jawab nahi aaya', text: 'Connector ka timeout khatam. Kya paisa kata? <strong>Pata nahi.</strong> Ho sakta hai bank ne debit kar diya ho aur jawab raste mein atka ho.', go: 'lost:npci>conn', set: { npci: { state: 'warn', sub: 'jawab nahi' } } },
          { title: 'Galat: "failed" bolo aur dobara charge karo', text: 'Agar hum ise FAILED maan ke Riya ko "phir se pay karo" bolein, aur pehla debit asal mein ho chuka tha, to <strong>₹998 kat gaye</strong>. Isliye ye kabhi nahi karte.', focus: ['conn'] },
          { title: 'Sahi: PENDING rakho, user ko sach batao', text: 'App ko "Payment processing, 2 minute mein confirm hoga" dikhta hai. Payment state PENDING hi rehti hai.', go: 'res:api>c', after: { db: { state: 'warn', sub: 'PENDING (unknown)' } } },
          { title: 'Status check se faisla', text: 'Thodi der baad connector naya debit nahi, sirf <strong>status check</strong> bhejta hai: "is transaction ID ka kya hua?" Jawab: success. Ab state CAPTURED. (Agar jawab "failed" aata, to FAILED, aur Riya dobara try kar sakti thi.)', go: ['conn>npci', 'res:npci>conn>api', 'api>db'], set: { npci: { state: '', sub: 'bahar ki duniya' } }, after: { db: { state: 'ok', sub: 'CAPTURED' } } },
        ]},
      ],
    },
    { type: 'callout', tone: 'term', title: 'Naye words: authorize aur capture', html: `<strong>Ye kya hai:</strong> payment ke do kadam. <strong>Authorize</strong> = bank ne haan bol diya aur paisa rok liya (hold). <strong>Capture</strong> = merchant ne kaha "haan, ab ye paisa pakka le lo".<br><strong>Kyun chahiye:</strong> kabhi merchant ko paisa pakka lene se pehle kuch check karna hota hai (jaise saaman stock mein hai ya nahi). Do kadam se wo bina refund ke jhanjhat ke cancel kar sakta hai.<br><strong>Iske bina:</strong> har cancel ek poora refund ban jaata, jo slow aur mehenga hai.<br><strong>Example:</strong> Razorpay ke docs ke mutabik authorized payment agar 3 din mein capture na ho to customer ko auto-refund ho jaata hai. UPI mein aam taur pe debit turant hota hai, isliye gateway use auto-capture kar deta hai.` },

    { type: 'h2', text: 'Deep dive 1: idempotency keys (double charge rokna)' },
    { type: 'p', html: `<a href="#/pagination-idempotency">Idempotency wale lesson</a> mein basic idea dekha tha. Payments mein ye zindagi-maut ka sawaal hai. Problem: Riya ka app <code>POST /v1/payments</code> bhejta hai, aur jawab nahi aata. App ko teen mein se ek cheez nahi pata:` },
    { type: 'list', ordered: true, items: [
      '<strong>Request server tak pahunchi hi nahi</strong> (connection pehle hi toota). Retry bilkul safe.',
      '<strong>Server ne kaam beech mein chhoda</strong> (crash). Server ko ya to poora rollback karna hai ya wahin se aage badhna hai.',
      '<strong>Kaam ho gaya, sirf jawab khoya</strong>. Retry pe dobara charge hua to double charge.',
    ]},
    { type: 'p', html: `Stripe ke engineer Brandur Leach ne 2017 ke Stripe blog post mein yahi teen cases bataye the, aur solution: client har naye kaam ke liye ek unique <strong>idempotency key</strong> banata hai, aur retry mein <strong>wahi</strong> key bhejta hai. Server key dekh ke pehchaan leta hai ki ye naya kaam nahi, purane ka retry hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: idempotency key', html: `<strong>Ye kya hai:</strong> ek lamba random naam (jaise <code>3f9c1e52-...</code>) jo app har <em>naye</em> payment ke liye ek baar banata hai, aur us payment ki har koshish (retry) ke saath wahi bhejta hai. Jaise ek parchi pe likha token number: same token = same kaam.<br><strong>Kyun chahiye:</strong> server ko pehchaanna hai ki ye request nayi hai ya purani wali ka retry. Key same hai to server dobara paisa nahi kaatta, bas pehla jawab dobara bhej deta hai.<br><strong>Iske bina:</strong> har retry ek naya payment ban jaata. Network ek baar toota aur app ne dobara bheja, to ₹998 kat gaye.<br><strong>Retry kya hai:</strong> jawab na aaye to wahi request dobara bhejna. Achhe apps retry thoda ruk ke karte hain, har baar zyada der (<em>exponential backoff</em>), aur thoda random farak ke saath (<em>jitter</em>), taaki sab phone ek saath retry na karein.` },
    { type: 'flow', title: 'Retry after timeout, server dedupe karta hai', height: 300,
      nodes: [
        { id: 'app', label: 'Riya ka app', sub: 'retry karta hai', x: 90, y: 150, w: 140, kind: 'client', info: 'Ye kya hai: Riya ke phone pe chalne wala app. Har naye payment ke liye ek nayi random key (jaise UUID v4, ek 36-character random ID) banata hai aur use phone mein save rakhta hai, taaki app restart ke baad bhi retry mein wahi key jaaye.' },
        { id: 'api', label: 'Payment API', sub: 'idempotency layer', x: 310, y: 150, w: 160, kind: 'server', info: 'Ye kya hai: Payment API ke andar ek chhota pehredaar. Har POST pe pehle key check: nayi hai to kaam karo aur result save karo; purani aur poori ho chuki hai to saved result lautao; abhi chal rahi hai to 409 (thodi der baad try karo).' },
        { id: 'ik', label: 'Idempotency keys', sub: 'SQL, unique (merchant,key)', x: 555, y: 60, w: 190, kind: 'data', info: 'Ye kya hai: Payments DB ki ek table jo har key ka haal yaad rakhti hai: merchant_id, key, request_hash (body ka fingerprint), status (in_progress / done), response_code, response_body. (merchant_id, key) pe UNIQUE constraint (DB ka niyam ki ye jodi do baar nahi aa sakti), to do servers ek saath same key insert nahi kar sakte.' },
        { id: 'bank', label: 'Bank / UPI', sub: 'paisa yahan katta hai', x: 555, y: 240, w: 190, kind: 'net', info: 'Ye kya hai: bahar ki duniya, jahan Riya ke account se paisa asal mein katta hai. Isko ek payment ke liye sirf ek debit (paisa kaatne ki) request jaani chahiye, chahe client kitni bhi baar retry kare.' },
      ],
      edges: [{ a: 'app', b: 'api' }, { a: 'api', b: 'ik' }, { a: 'api', b: 'bank' }],
      scenarios: [
        { name: 'Pehli request', steps: [
          { title: 'Request + key', text: 'App nayi key ke saath request bhejta hai.', go: 'app>api', msg: 'POST /v1/payments\nIdempotency-Key: 3f9c1e52-...\n{ order_id: order_7Kq }' },
          { title: 'Key claim karo', text: 'Server <code>INSERT</code> karta hai (status = in_progress). Unique constraint ki wajah se sirf ek hi request ye key "jeet" sakti hai.', go: ['api>ik', 'res:ik>api'], after: { ik: { sub: '3f9c: in_progress' } } },
          { title: 'Asli kaam', text: 'Bank ko ek debit request.', go: ['api>bank', 'res:bank>api'] },
          { title: 'Result save, phir jawab', text: 'Response (status code + body) key ke saath save: status = done.', go: ['api>ik', 'res:api>app'], after: { ik: { state: 'ok', sub: '3f9c: done → pay_Q2x' } }, msg: '202 { id: pay_Q2x, status: pending }' },
        ]},
        { name: 'Jawab khoya, retry', intro: 'Case 3: kaam ho gaya, sirf jawab raste mein gum.', steps: [
          { title: 'Kaam ho gaya...', text: 'Pehli request poori chali, key done.', go: ['app>api', 'api>bank', 'res:bank>api'], after: { ik: { state: 'ok', sub: '3f9c: done → pay_Q2x' } } },
          { title: '...lekin jawab gum', text: 'Riya ka mobile network toota. App ko kuch nahi mila.', go: 'lost:api>app', set: { app: { state: 'warn', sub: 'timeout!' } } },
          { title: 'Retry, wahi key', text: 'App thoda ruk ke (exponential backoff + jitter) dobara bhejta hai, <strong>same key</strong> ke saath.', go: 'app>api', msg: 'POST /v1/payments\nIdempotency-Key: 3f9c1e52-...  (same)' },
          { title: 'Key pehle se done', text: 'Server ko key mili, status done. Bank ko dobara kuch nahi bheja.', go: ['api>ik', 'res:ik>api'], set: { bank: { state: 'dim' } }, focus: ['ik'] },
          { title: 'Saved jawab wapas', text: 'Wahi purana response, byte-by-byte. Riya se ek hi baar paisa kata.', go: 'res:api>app', set: { app: { state: 'ok', sub: 'pay_Q2x' } }, msg: '202 { id: pay_Q2x, status: pending }   (replayed)' },
        ]},
        { name: 'Double click (concurrent)', intro: 'Riya ne jaldi mein "Pay" do baar dabaya, ya do retries ek saath nikle.', steps: [
          { title: 'Do requests, same key', text: 'Dono lagbhag ek saath aayi.', flood: { paths: ['app>api'], n: 2 } },
          { title: 'Sirf ek jeeti', text: 'Pehli ka INSERT safal. Doosri ka INSERT unique constraint pe fail: key "in_progress" hai.', go: ['api>ik', 'bad:ik>api'], after: { ik: { state: 'hot', sub: '3f9c: in_progress' } } },
          { title: 'Doosri ko 409', text: 'Doosri request ko "abhi chal raha hai, thodi der baad poochho" milta hai. Bank tak sirf ek debit gaya. Stripe ke docs bhi kehte hain ki aisi concurrent conflict wali request ka result save nahi hota, use baad mein retry kar sakte ho.', go: 'bad:api>app', msg: '409 Conflict: request with this key is in progress' },
        ]},
        { name: 'Same key, alag amount', intro: 'Bug: client ne galti se ek purani key naye payment pe laga di.', steps: [
          { title: 'Purani key, naya body', text: 'Key 3f9c pehle ₹499 ke liye use hui thi. Ab ₹999 ke saath aayi.', go: 'app>api', msg: 'Idempotency-Key: 3f9c...  { amount: 99900 }' },
          { title: 'Hash match nahi', text: 'Server ne request body ka hash (body ka chhota fingerprint: body badli to hash badla) saved hash se milaya: alag hai. Purana result lautana bhi galat, naya payment banana bhi galat.', go: ['api>ik', 'bad:ik>api'] },
          { title: 'Error', text: 'Saaf error. Stripe bhi incoming parameters ko original se compare karke mismatch pe error deta hai.', go: 'bad:api>app', msg: '422: idempotency key reused with different parameters' },
        ]},
      ],
    },
    { type: 'code', text: `
-- Idempotency layer, simplified (SQL)
BEGIN;
INSERT INTO idempotency_keys (merchant_id, key, request_hash, status)
VALUES ($m, $k, $hash, 'in_progress')
ON CONFLICT (merchant_id, key) DO NOTHING;        -- 0 rows? key pehle se hai
COMMIT;

-- 0 rows inserted:
--   status = 'done' and hash same  → saved response_code + response_body lautao
--   status = 'in_progress'         → 409, client baad mein retry kare
--   hash alag                      → 422, ye bug hai
-- 1 row inserted: asli kaam karo, phir UPDATE status='done', response=...` },
    { type: 'p', html: `Stripe ke public docs se kuch practical details: key client banata hai (V4 UUID suggest karte hain), 255 characters tak; pehli request ka status code aur body save hota hai, chahe wo success ho ya failure (500 bhi); aur keys kam se kam 24 ghante baad hata di ja sakti hain. Razorpay ka payouts API bhi idempotency key header leta hai, pehli request ka saved response lautata hai, aur unke docs saaf warn karte hain: pehli koshish abhi <em>processing</em> ho to <strong>nayi</strong> key se retry mat karo, warna duplicate payout ban sakta hai.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `<strong>"Server khud key bana lega."</strong> Nahi: retry ko pehchaanne ke liye key <em>client</em> ke paas honi chahiye, pehli request se pehle. <br><strong>"Same user + same amount = duplicate, block kar do."</strong> Nahi: Riya sach mein do baar ₹499 de sakti hai (do alag cheezein). Duplicate wahi hai jiski key same ho.<br><strong>"Idempotency sirf API pe chahiye."</strong> Nahi: har wo jagah jahan retry hota hai (Kafka consumers, webhook handlers, bank connector) wahan bhi dedupe chahiye. Aage dekhoge.` },

    { type: 'h2', text: 'Deep dive 2: payment ek state machine hai' },
    { type: 'p', html: `Problem: payment ki ek <code>status</code> column hai, aur alag alag jagah se code use badalta hai: bank ka jawab, merchant ka capture, refund API, ek late webhook. Bina rules ke ajeeb cheezein ho jaati hain: FAILED payment ka refund (paisa kata hi nahi tha, phir bhi wapas de diya!), ya REFUNDED payment phir se CAPTURED. Solution: payment ko ek <strong>state machine</strong> banao: kuch fixed states, aur sirf allowed transitions.` },
    { type: 'callout', tone: 'term', title: 'Naya word: state machine', html: `<strong>Ye kya hai:</strong> ek cheez jo ek time pe sirf ek <strong>state</strong> (haalat) mein ho sakti hai, aur sirf tay kiye gaye <strong>events</strong> se agli state mein jaa sakti hai. Traffic light jaisa: hara → peela → laal → hara. Laal se seedha peela nahi. State badalne ko <strong>transition</strong> kehte hain.<br><strong>Kyun chahiye:</strong> payment ki state ko kai jagah se code badalta hai. Ek fixed list of allowed transitions sabko ek hi niyam pe chalati hai.<br><strong>Iske bina:</strong> ajeeb galtiyan: FAILED payment ka refund, ya REFUNDED payment phir se CAPTURED. Har galti = kisi ka asli paisa.` },
    { type: 'p', html: `Razorpay ke docs paanch states batate hain: <strong>created</strong> (details aayi, abhi process nahi hui), <strong>authorized</strong> (bank ne verify karke paisa kaata/hold kiya), <strong>captured</strong> (pakka, settlement schedule pe merchant ko milega), <strong>refunded</strong> aur <strong>failed</strong>. Roadmap do aur jodta hai: <strong>pending</strong> (bahar request gayi, jawab nahi aaya) aur <strong>settled</strong> (paisa merchant ke bank tak pahunch gaya). PhonePe ke engineering blog (2024) mein bhi transaction ko PENDING (non-terminal) aur COMPLETED / ERRORED (terminal) states mein track karte dikhaya gaya hai. Neeche events dabao, aur galat transitions reject hote dekho:` },
    { type: 'custom', render(el) {
      const ST = ['CREATED', 'PENDING', 'AUTHORIZED', 'CAPTURED', 'SETTLED', 'FAILED', 'REFUNDED'];
      const EV = [
        ['send', 'Bank ko bhejo', { CREATED: 'PENDING' }],
        ['ok', 'Bank: success', { PENDING: 'AUTHORIZED' }],
        ['decline', 'Bank: declined', { PENDING: 'FAILED' }],
        ['timeout', 'Timeout (jawab nahi)', { PENDING: 'PENDING' }],
        ['capture', 'Capture', { AUTHORIZED: 'CAPTURED' }],
        ['expire', '3 din, capture nahi', { AUTHORIZED: 'REFUNDED' }],
        ['settle', 'Merchant ko settle', { CAPTURED: 'SETTLED' }],
        ['refund', 'Refund', { CAPTURED: 'REFUNDED', SETTLED: 'REFUNDED' }],
      ];
      const TERMINAL = { FAILED: 1, REFUNDED: 1 };
      el.innerHTML = `<div class="pay-sm-states" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px"></div>
        <div class="pay-sm-btns" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <div class="stats">
          <div class="stat"><span>Current state</span><strong class="pay-sm-cur"></strong></div>
          <div class="stat"><span>Accepted</span><strong class="pay-sm-acc"></strong></div>
          <div class="stat"><span>Rejected</span><strong class="pay-sm-rej"></strong></div>
        </div>
        <div class="calc-note pay-sm-msg"></div>
        <div class="pay-sm-log" style="font-family:var(--f-mono);font-size:12px;color:var(--ink-2);max-height:150px;overflow:auto;border:1px solid var(--line);border-radius:var(--r-sm);padding:8px;margin-top:8px"></div>`;
      const box = el.querySelector('.pay-sm-states'), bt = el.querySelector('.pay-sm-btns');
      let cur, acc, rej, log;
      const chips = ST.map(s => { const c = document.createElement('span'); c.className = 'chip'; c.textContent = s; box.appendChild(c); return c; });
      const draw = (msg, bad) => {
        chips.forEach((c, i) => { c.className = 'chip' + (ST[i] === cur ? ' on' : ''); });
        el.querySelector('.pay-sm-cur').textContent = cur + (TERMINAL[cur] ? ' (terminal)' : '');
        el.querySelector('.pay-sm-acc').textContent = acc;
        el.querySelector('.pay-sm-rej').textContent = rej;
        const m = el.querySelector('.pay-sm-msg');
        m.textContent = msg; m.style.color = bad ? 'var(--red)' : 'var(--ink-2)';
        el.querySelector('.pay-sm-log').innerHTML = log.map(x => `<div style="color:${x[1] ? 'var(--red)' : 'var(--ink-2)'}">${x[0]}</div>`).join('');
      };
      const fire = ev => {
        const to = ev[2][cur];
        if (!to) {
          rej++;
          const why = TERMINAL[cur] ? `${cur} terminal state hai, yahan se koi raasta nahi.` : `${cur} se "${ev[1]}" allowed nahi.`;
          log.unshift([`✗ ${ev[1]}: ${cur} → ?  REJECTED`, 1]);
          draw(`Rejected. ${why} DB mein: UPDATE ... WHERE state IN (${Object.keys(ev[2]).join(', ')}) → 0 rows.`, true);
          return;
        }
        acc++;
        const from = cur; cur = to;
        log.unshift([`✓ ${ev[1]}: ${from} → ${to}`, 0]);
        draw(ev[0] === 'timeout' ? 'Timeout ka matlab FAILED nahi. State PENDING hi rahi; status check se faisla hoga.' : `OK: ${from} → ${to}.`, false);
      };
      EV.forEach(ev => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small'; b.textContent = ev[1]; b.onclick = () => fire(ev); bt.appendChild(b); });
      const r = document.createElement('button'); r.type = 'button'; r.className = 'btn small ghost'; r.textContent = 'Reset';
      const reset = () => { cur = 'CREATED'; acc = 0; rej = 0; log = []; draw('Naya payment: CREATED. Koi event dabao. Try: pehle "Refund" dabao (reject hoga).', false); };
      r.onclick = reset; bt.appendChild(r); reset();
    }},
    { type: 'p', html: `Andar se ye rule DB mein kaise lagta hai? <strong>Conditional update</strong> (compare-and-set) se. Agar do jagah se ek saath "capture" aur "expire" aaye, to sirf ek jeetega, kyunki doosre ke liye WHERE condition match hi nahi karegi:` },
    { type: 'code', text: `
UPDATE payments SET state = 'CAPTURED', updated_at = now()
WHERE id = 'pay_Q2x' AND state = 'AUTHORIZED';
-- 1 row  → transition hua. Isi transaction mein ledger lines + outbox event likho.
-- 0 rows → koi aur pehle badal chuka, ya transition allowed nahi. Kuch mat karo.` },
    { type: 'list', items: [
      '<strong>Terminal states</strong> (FAILED, REFUNDED) se aage koi raasta nahi. Partial refund ho to state PARTIALLY_REFUNDED jaisi alag rakhi jaati hai, aur refund ki apni chhoti state machine hoti hai (created → processed / failed).',
      '<strong>Har transition ek history row</strong> bhi likhta hai (kaun, kab, kis event se). Audit aur debugging dono ke liye.',
      '<strong>Late jawab</strong>: agar humne galti se kisi PENDING ko FAILED maan liya aur bank ka "success" baad mein aaye, to state machine use reject karegi, aur paisa kata hua reh jaayega. Isliye timeout pe FAILED nahi, PENDING. Razorpay ke docs is situation ko "late authorization" kehte hain: network ya bank ki dikkat se payment ka result der se pata chalta hai.',
    ]},
    { type: 'p', html: `Bade systems mein ye state machine aksar ek <a href="#/distributed-tx">workflow engine</a> (Temporal, Cadence) mein chalti hai, taaki "5 minute baad status check karo" jaise timers aur retries crash ke baad bhi na khoyein. Uber ke payments platform post ke mutabik user-in-session payments ke liye wo apna workflow engine Cadence use karte hain.` },

    { type: 'h2', text: 'Deep dive 3: double-entry ledger (har rupaye ka hisaab)' },
    { type: 'p', html: `Problem: sabse seedha design hai har merchant ki ek <code>balance</code> column, aur har payment pe <code>balance = balance + 499</code>. Ek din finance team poochhti hai: "xyz.com ka balance ₹12,340 kyun hai?" Jawab nahi hai, kyunki column sirf <em>abhi</em> ka number jaanta hai, <em>kyun</em> nahi. Aur agar kisi bug ne ek baar galat update kar diya, to wo paisa chupchaap "ban" gaya ya "gayab" ho gaya, kisi ko pata bhi nahi chalega.` },
    { type: 'callout', tone: 'term', title: 'Naye words: ledger, double-entry, debit, credit', html: `<strong>Ye kya hai:</strong> <strong>Ledger</strong> = hisaab ki kitaab, jisme har paisa movement ki ek entry hai. <strong>Double-entry</strong> = har movement kam se kam do <strong>accounts</strong> ko chhoota hai: ek se paisa nikla (<strong>credit</strong>), doosre mein gaya (<strong>debit</strong>). Debits ka total = credits ka total.<br><strong>Kyun chahiye:</strong> paisa na banta hai, na mitta hai, sirf ek account se doosre mein jaata hai. Agar kabhi jod barabar nahi, to turant pata chalta hai ki kahin bug hai. Aur har balance ka "kyun" entries mein likha hai.<br><strong>Iske bina:</strong> sirf ek balance number, jiska koi itihaas nahi. Bug ne paisa banaya ya mitaya, to kisi ko pata nahi chalega.<br>Ye 500+ saal purana accounting ka tareeka hai, aur software mein bhi utna hi kaam ka.` },
    { type: 'p', html: `Square ne 2019 mein apne ledger database <strong>Books</strong> ke baare mein likha: har "journal entry" ka total zero hona chahiye, har cent jo kahin ghata wo kahin badha. Unki convention: debit ko <strong>+</strong> aur credit ko <strong>−</strong> likho; plus matlab "ye hamare paas hai / humein milna hai", minus matlab "ye hum par udhaar hai". Uber ke payments platform post (2026) mein bhi yahi rule hai: har "money order" ki entries ka jod zero, "koi paisa kabhi banaya ya mitaya nahi ja sakta". Ab khud chala ke dekho. Ye xyzPay ki kitaab hai, chaar accounts ke saath:` },
    { type: 'custom', render(el) {
      const AC = [['CLR', 'UPI clearing', 'banks/NPCI se aana hai'], ['MER', 'xyz.com payable', 'merchant ko dena hai'], ['FEE', 'Fee revenue', 'xyzPay ki kamaai'], ['ESC', 'Escrow cash', 'bank mein asli paisa']];
      const PRE = [
        ['Payment ₹499', 'Riya ka UPI payment captured', 'CLR', 'MER', 499],
        ['Fee ₹10', 'xyzPay ki fee, merchant ke hisse se', 'MER', 'FEE', 10],
        ['Refund ₹199', 'Riya ko partial refund', 'MER', 'CLR', 199],
        ['Bank settle ₹300', 'Clearing ka paisa escrow mein aaya', 'ESC', 'CLR', 300],
        ['Payout ₹290', 'xyz.com ke bank mein bheja', 'MER', 'ESC', 290],
      ];
      const opts = AC.map(a => `<option value="${a[0]}">${a[1]}</option>`).join('');
      el.innerHTML = `<div class="pay-lg-pre" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px"></div>
        <div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:10px;margin-bottom:10px">
          <div style="font-size:13px;color:var(--ink-2);margin-bottom:6px">Apni entry likho (try karo: debit 500, credit 450)</div>
          <div class="row2">
            <div><label>Debit (+) account</label><select class="pay-lg-da">${opts}</select></div>
            <div><label>Debit amount ₹</label><input class="pay-lg-dv" type="number" value="500" min="1" step="1"></div>
            <div><label>Credit (−) account</label><select class="pay-lg-ca">${opts}</select></div>
            <div><label>Credit amount ₹</label><input class="pay-lg-cv" type="number" value="450" min="1" step="1"></div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px"><button type="button" class="btn small primary pay-lg-post">Post entry</button><button type="button" class="btn small pay-lg-rev">Last entry reverse karo</button><button type="button" class="btn small ghost pay-lg-reset">Reset</button></div>
        </div>
        <div class="stats pay-lg-bal"></div>
        <div class="calc-note pay-lg-msg"></div>
        <div class="pay-lg-log" style="font-family:var(--f-mono);font-size:12px;color:var(--ink-2);max-height:170px;overflow:auto;border:1px solid var(--line);border-radius:var(--r-sm);padding:8px;margin-top:8px"></div>`;
      el.querySelector('.pay-lg-ca').value = 'MER';
      let J, msg, bad;
      const name = c => AC.find(a => a[0] === c)[1];
      const bal = () => { const b = { CLR: 0, MER: 0, FEE: 0, ESC: 0 }; J.forEach(j => j.lines.forEach(l => { b[l[0]] += l[1]; })); return b; };
      const draw = () => {
        const b = bal(); const sum = Object.values(b).reduce((x, y) => x + y, 0);
        const fmt = v => (v > 0 ? '+' : v < 0 ? '−' : '') + '₹' + Math.abs(v);
        el.querySelector('.pay-lg-bal').innerHTML = AC.map(a => `<div class="stat"><span>${a[1]} <em style="font-style:normal;color:var(--ink-3)">(${a[2]})</em></span><strong>${fmt(b[a[0]])}</strong></div>`).join('') +
          `<div class="stat"><span>Sab accounts ka jod</span><strong style="color:${sum === 0 ? 'var(--green)' : 'var(--red)'}">${fmt(sum)} ${sum === 0 ? '✓' : '✗'}</strong></div>`;
        const m = el.querySelector('.pay-lg-msg'); m.textContent = msg; m.style.color = bad ? 'var(--red)' : 'var(--ink-2)';
        el.querySelector('.pay-lg-log').innerHTML = J.length ? J.slice().reverse().map(j => `<div>J${j.id} ${j.desc}: ${j.lines.map(l => `${l[0]} ${l[1] > 0 ? '+' : '−'}${Math.abs(l[1])}`).join(', ')}</div>`).join('') : 'Journal khaali hai.';
      };
      const post = (desc, dr, cr, dv, cv) => {
        if (!(Number.isInteger(dv) && Number.isInteger(cv)) || dv <= 0 || cv <= 0) { msg = 'Rejected: amount positive poore rupaye mein hona chahiye.'; bad = true; return draw(); }
        if (dr === cr) { msg = 'Rejected: debit aur credit same account? Paisa kahin gaya hi nahi.'; bad = true; return draw(); }
        if (dv !== cv) { msg = `Rejected: unbalanced entry. Debit ₹${dv} ≠ credit ₹${cv}. ₹${Math.abs(dv - cv)} kahan se aaya / kahan gaya? Ledger aisi entry kabhi accept nahi karta.`; bad = true; return draw(); }
        J.push({ id: J.length + 1, desc, lines: [[dr, dv], [cr, -cv]] });
        msg = `Posted: ${name(dr)} +₹${dv}, ${name(cr)} −₹${cv}. Entry ka jod 0.`; bad = false; draw();
      };
      PRE.forEach(p => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small'; b.textContent = p[0]; b.title = p[1]; b.onclick = () => post(p[1], p[2], p[3], p[4], p[4]); el.querySelector('.pay-lg-pre').appendChild(b); });
      el.querySelector('.pay-lg-post').onclick = () => post('Custom entry', el.querySelector('.pay-lg-da').value, el.querySelector('.pay-lg-ca').value, Number(el.querySelector('.pay-lg-dv').value), Number(el.querySelector('.pay-lg-cv').value));
      el.querySelector('.pay-lg-rev').onclick = () => {
        const last = J.slice().reverse().find(j => !j.reversed && !j.rev);
        if (!last) { msg = 'Reverse karne ko kuch nahi.'; bad = true; return draw(); }
        last.reversed = true;
        J.push({ id: J.length + 1, rev: true, desc: `Reversal of J${last.id}`, lines: last.lines.map(l => [l[0], -l[1]]) });
        msg = `J${last.id} delete nahi hui. Ek nayi ulti entry likhi gayi. History poori bachi hai.`; bad = false; draw();
      };
      el.querySelector('.pay-lg-reset').onclick = () => { J = []; msg = 'Upar ke buttons ek ek karke dabao: Payment → Fee → Refund → Bank settle → Payout.'; bad = false; draw(); };
      el.querySelector('.pay-lg-reset').onclick();
    }},
    { type: 'p', html: `Paanchon buttons order mein dabao to end mein: clearing <strong>0</strong> (bank ne jo dena tha de diya), xyz.com payable <strong>0</strong> (merchant ko uska ₹290 mil gaya: 499 − 10 fee − 199 refund), escrow mein <strong>+₹10</strong> aur fee revenue <strong>−₹10</strong>. Wo ₹10 hi xyzPay ki kamaai hai. Aur har kadam pe jod zero raha. Unbalanced entry try ki? Reject hui. Galti sudhaarni hai? Purani entry delete nahi hoti, ulti entry likhi jaati hai.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "kamaai minus mein kyun?"', html: `Fee revenue −₹10 dekh ke lagta hai nuksaan hua. Nahi: is convention mein minus ka matlab hai "ye value kahan se aayi" (source). Paisa escrow mein +₹10 hai, aur uska source fee revenue hai. Square ke engineers ne bhi likha ki signs ka ye matlab samajhna sabse unintuitive hissa tha aur practice se hi clear hua. Interview mein bas ye yaad rakho: <strong>har entry ka jod zero, aur sab accounts ka jod hamesha zero</strong>.` },
    { type: 'h3', text: 'Ledger ko database mein kaise rakhein' },
    { type: 'code', text: `
accounts        (id, owner, type, currency, balance, version)   -- balance = cached sum
journal_entries (id, created_at, reason, payment_id, idempotency_key UNIQUE)
ledger_lines    (journal_id, account_id, amount)                -- +debit / -credit

-- Har posting ek DB transaction:
--   1. journal_entries mein 1 row, ledger_lines mein 2+ rows
--   2. CHECK: SUM(amount) per journal = 0, warna ROLLBACK
--   3. accounts.balance update (version+1, optimistic lock)
-- ledger_lines pe UPDATE / DELETE kabhi nahi: sirf INSERT (append-only)` },
    { type: 'list', items: [
      '<strong>Append-only aur immutable</strong>: Square ke Books mein journal aur book entries pe sirf INSERT hota hai, update nahi. Galti ho to ek nayi correcting entry. Isse poori history ek audit log ban jaati hai. Uber bhi adjustments (trip badla, item missing) naye money orders likh ke karta hai.',
      '<strong>Strongly consistent store</strong>: Square ne Google Cloud Spanner chuna (2019), Uber ledger balances ke liye strongly consistent reads wala store use karta hai, aur apna immutable LedgerStore banaya. Eventual consistency yahan nahi chalegi: do servers ek hi balance ko alag alag na dekhein.',
      '<strong>Balance = cached sum</strong>: har baar crore rows jod ke balance nikalna mehenga. Isliye account pe running balance rakhte hain, jo usi transaction mein update hota hai. Square ne bhi yahi likha: payout ka amount ek row se mil jaata hai, bade GROUP BY se nahi.',
      '<strong>Hot account</strong>: ek bada merchant, har second hazaron payments, sab ek hi balance row pe. Ye row lock ka bottleneck banta hai. Aam ilaaj: account ko kai sub-accounts mein todna (balance = sab ka jod), ya lines likh ke balance batch mein update karna. (<a href="#/pattern-contention">Contention pattern</a> dekho.)',
    ]},

    { type: 'h2', text: 'Deep dive 4: UPI andar se kaise chalta hai' },
    { type: 'p', html: `Ab tak "NPCI + banks" ek dabba tha. Kholte hain. UPI (Unified Payments Interface) <strong>NPCI</strong> (National Payments Corporation of India) chalata hai. NPCI ke product overview page (2023 ki archived copy) ke mutabik iska pilot 11 April 2016 ko 21 banks ke saath launch hua. Idea: ek mobile app se kai bank accounts, 24x7 turant transfer, aur account number / IFSC ki jagah ek simple <strong>virtual address</strong>.` },
    { type: 'callout', tone: 'term', title: 'Naya word: NPCI UPI switch', html: `<strong>Ye kya hai:</strong> NPCI ka central computer system jisse har UPI payment guzarta hai. Ek bade telephone exchange jaisa: har bank sirf isse juda hai, aur ye sahi bank tak message pahunchata hai.<br><strong>Kyun chahiye:</strong> India mein sau se zyada banks hain. Har bank har doosre bank se alag se jude, to hazaron connections banenge. Ek beech wala switch ho to har bank ko sirf ek connection chahiye.<br><strong>Iske bina:</strong> har bank ko har bank se jodna padta, aur "riya@okbank kis account ka hai" jaisa sawaal koi ek jagah se hal nahi hota.` },
    { type: 'callout', tone: 'term', title: 'Naye words: UPI ke baaki kirdaar', html: `<strong>VPA (Virtual Payment Address) / UPI ID:</strong> jaise <code>riya@okbank</code>. Ek naam jo bank account se juda hai, account number bataye bina.<br><strong>UPI PIN:</strong> Riya ka secret number. Encrypted (taale mein band) form mein uske bank tak jaata hai, aur wahi bank use check karta hai. App ya xyzPay use padh nahi sakte.<br><strong>Payer PSP:</strong> Riya ka UPI app jis PSP bank ke through chalta hai. <strong>Payee PSP:</strong> paisa lene wale (xyz.com / xyzPay) ki taraf ka PSP.<br><strong>Remitter bank:</strong> jiske account se paisa <em>katega</em> (Riya ka bank). <strong>Beneficiary bank:</strong> jisme paisa <em>jama</em> hoga.<br>NPCI ke overview mein ye participants yahi naamon se listed hain: Payer PSP, Payee PSP, Remitter Bank, Beneficiary Bank, NPCI, account holders aur merchants.` },
    { type: 'image', src: 'assets/img/design-payments/bmtc-upi-ticket.jpg', maxWidth: 320, alt: 'Bengaluru ki BMTC bus ka ticket, jis pe likha hai Total ₹24.00 (UPI)', caption: 'UPI ab chhote se chhote payment ke liye bhi hai: Bengaluru ki ek city bus ka ₹24 ka ticket (2026), UPI se diya gaya. Isliye UPI system ko har second hazaron chhote payments sambhalne padte hain.', credit: { text: 'Shaymmm, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Bmtc_bus_ticket_in_2026_via_UPI_payment.jpg', license: 'CC BY-SA 4.0' } },
    { type: 'h3', text: 'Push (pay), pull (collect) aur intent' },
    { type: 'table', head: ['', 'Push / Pay', 'Pull / Collect', 'Intent (merchant checkout)'], rows: [
      ['Kaun shuru karta hai', 'Payer: "₹499 bhejo xyz@xyzbank ko"', 'Payee: "Riya, ₹499 do" (request bhejta hai)', 'Merchant ka checkout payer ka UPI app khol deta hai, sab details pehle se bhari'],
      ['Riya ko kya karna', 'VPA/QR, amount, PIN', 'Notification kholo, approve, PIN', 'Sirf PIN'],
      ['Kahan dikkat', 'Galat VPA type karna', 'Notification late / miss, app switch, fraud ("paisa lene ke liye PIN daalo")', 'Sirf mobile pe, jahan UPI app installed ho'],
    ]},
    { type: 'p', html: `Collect ka sabse bada khatra fraud tha: log "paise receive karne" ke naam pe PIN daal dete the, jabki PIN hamesha paisa <em>dene</em> ke liye hota hai. Isliye NPCI ne 29 July 2025 ke circular mein kaha ki <strong>1 October 2025 se P2P (person-to-person) collect band</strong>; merchant collect chalta rahega (news reports ke mutabik). Razorpay ke 2026 blog ke mutabik unke yahan intent ka success rate collect se kaafi zyada hai (unka claim: 92-95% vs collect 6-15 points kam), kyunki VPA type karne ki galti aur notification ka intezaar dono hat jaate hain.` },
    { type: 'flow', title: 'UPI merchant payment: PSP → NPCI → banks', height: 350,
      nodes: [
        { id: 'app', label: 'Riya ka UPI app', sub: 'PhonePe / GPay / Paytm', x: 95, y: 90, w: 160, kind: 'client', info: 'Ye kya hai: Riya ke phone ka UPI app (PhonePe, GPay, Paytm). Device binding (app sirf usi SIM + phone pe chalta hai) aur UPI PIN: NPCI ke overview ke mutabik "single click two-factor authentication". App paisa nahi rakhta, sirf request banata hai.' },
        { id: 'ppsp', label: 'Payer PSP', sub: 'app ka PSP bank', x: 95, y: 270, w: 160, kind: 'server', info: 'Ye kya hai: Riya ke app ki taraf ka PSP bank. App ke messages NPCI tak le jaata hai aur jawab wapas laata hai. Status check bhi yahi bhejta hai.' },
        { id: 'npci', label: 'NPCI UPI switch', sub: 'central router', x: 335, y: 180, w: 160, kind: 'net', info: 'Ye kya hai: NPCI ka central router. Har UPI transaction yahan se guzarta hai. Payee ka VPA resolve karwata hai, remitter bank ko debit aur beneficiary bank ko credit request bhejta hai, aur dono ke jawab track karta hai. Har leg ka apna timeout hai.' },
        { id: 'rem', label: 'Remitter bank', sub: 'Riya ka bank: debit', x: 590, y: 60, w: 170, kind: 'data', info: 'Ye kya hai: Riya ka bank. UPI PIN verify karta hai aur account se paisa kaatta (debit) hai. Iska core banking system (CBS: bank ka main computer jisme har account ka balance hai) asli balance rakhta hai.' },
        { id: 'ben', label: 'Beneficiary bank', sub: 'paisa yahan jama', x: 590, y: 180, w: 170, kind: 'data', info: 'Ye kya hai: wo bank jiske account mein paisa jama (credit) hoga: merchant payments mein gateway ka partner bank / escrow ki taraf. Agar ye time pe jawab na de, to transaction "unknown" ho jaata hai.' },
        { id: 'gw', label: 'xyzPay', sub: 'payee PSP + gateway', x: 590, y: 300, w: 170, kind: 'server', info: 'Ye kya hai: merchant (xyz.com) ki taraf ka PSP/gateway, yaani hum. Razorpay ka apna UPI Switch hai jo NPCI ke saath real-time payments process karta hai (unke 2026 blog ke mutabik Razorpay ka 70%+ UPI volume isi se). Intent link banata hai, collect request bhejta hai, aur final status se payment ki state machine chalata hai.' },
      ],
      edges: [{ a: 'app', b: 'ppsp' }, { a: 'ppsp', b: 'npci' }, { a: 'npci', b: 'rem' }, { a: 'npci', b: 'ben' }, { a: 'npci', b: 'gw' }],
      scenarios: [
        { name: 'Intent (pay)', steps: [
          { title: 'Intent link', text: 'xyzPay ka checkout ek UPI link banata hai jisme payee VPA, amount aur transaction reference hai. Phone pe Riya ka UPI app khulta hai, sab pehle se bhara. Ye phone ke andar hota hai, network pe nahi.', focus: ['app', 'gw'], msg: 'upi://pay?pa=xyz@xyzbank&pn=xyz.com&am=499.00&tr=pay_Q2x' },
          { title: 'PIN daala, request chali', text: 'Riya ne PIN daala. Encrypted request payer PSP se NPCI tak.', go: 'app>ppsp>npci', msg: 'Pay: riya@okbank → xyz@xyzbank  ₹499  ref pay_Q2x' },
          { title: 'Payee VPA resolve', text: 'NPCI payee PSP se poochhta hai ki xyz@xyzbank kis account se juda hai.', go: ['npci>gw', 'res:gw>npci'] },
          { title: 'Debit leg', text: 'Remitter bank PIN check karta hai aur Riya ke account se ₹499 kaatta hai.', go: ['npci>rem', 'res:rem>npci'], after: { rem: { state: 'ok', sub: 'debited ₹499' } } },
          { title: 'Credit leg', text: 'Debit ke baad hi beneficiary bank ko credit request. Jama ho gaya.', go: ['npci>ben', 'res:ben>npci'], after: { ben: { state: 'ok', sub: 'credited ₹499' } } },
          { title: 'Sabko result', text: 'Riya ke app ko success, aur payee PSP (xyzPay) ko bhi. xyzPay payment ko CAPTURED karta hai (state machine + ledger + outbox, ek transaction mein).', parallel: true, go: ['res:npci>ppsp>app', 'res:npci>gw'], after: { gw: { state: 'ok', sub: 'pay_Q2x: CAPTURED' } } },
        ]},
        { name: 'Collect (pull)', steps: [
          { title: 'Riya VPA type karti hai', text: 'Checkout mein Riya ne <code>riya@okbank</code> likha. xyzPay collect request bhejta hai.', go: 'gw>npci>ppsp>app', msg: 'Collect: xyz.com requests ₹499 from riya@okbank' },
          { title: 'Notification ka intezaar', text: 'Riya ko phone pe notification aata hai. Use UPI app kholna hai, request dekhni hai. Yahin drop-off hota hai: notification late, ya Riya ne dekha hi nahi.', focus: ['app'], set: { app: { state: 'warn', sub: 'approve karo?' } } },
          { title: 'Approve + PIN', text: 'Riya ne approve karke PIN daala.', go: 'app>ppsp>npci', set: { app: { state: '', sub: 'PhonePe / GPay / Paytm' } } },
          { title: 'Debit, phir credit', text: 'Wahi do legs.', go: ['npci>rem', 'res:rem>npci', 'npci>ben', 'res:ben>npci'], after: { rem: { state: 'ok', sub: 'debited ₹499' }, ben: { state: 'ok', sub: 'credited ₹499' } } },
          { title: 'Result', text: 'Dono taraf success.', parallel: true, go: ['res:npci>ppsp>app', 'res:npci>gw'], after: { gw: { state: 'ok', sub: 'pay_Q2x: CAPTURED' } } },
        ]},
        { name: 'Timeout: status unknown', intro: 'Paisa kat gaya, lekin credit ka jawab nahi aaya. Ab kya?', steps: [
          { title: 'Debit ho gaya', text: 'Pay request, debit leg success.', go: ['app>ppsp>npci', 'npci>rem', 'res:rem>npci'], after: { rem: { state: 'ok', sub: 'debited ₹499' } } },
          { title: 'Credit ka jawab gum', text: 'Beneficiary bank ka core system slow hai. NPCI ke 2018 ke circular (OC 45) ke mutabik credit leg ka timeout 30 seconds hai.', go: 'lost:npci>ben', set: { ben: { state: 'warn', sub: 'jawab nahi' } } },
          { title: 'NPCI khud poochhta hai', text: 'Wahi circular: jawab na aaye to NPCI beneficiary bank ko 3 tak <strong>Check Transaction</strong> messages bhejta hai, phir <strong>Credit Reversal Request</strong>. Phir bhi pakka jawab na mile to transaction <strong>"deemed approved"</strong> maana jaata hai: online pata nahi chala, baad mein banks settlement files aur dispute process se suljhaate hain.', go: ['npci>ben', 'lost:ben>npci'] },
          { title: 'xyzPay: PENDING, retry NAHI', text: 'xyzPay ne koi pakka jawab nahi dekha. Payment PENDING. Riya ko "processing" dikhta hai. <strong>Naya debit kabhi nahi bheja jaata</strong>: Riya ka paisa shayad pehle hi kat chuka hai.', go: 'res:npci>ppsp>app', set: { gw: { state: 'warn', sub: 'pay_Q2x: PENDING' }, app: { state: 'warn', sub: 'processing...' } } },
          { title: 'Status check (debit nahi)', text: 'Kuch der baad xyzPay sirf status poochhta hai: "ref pay_Q2x ka kya hua?" NPCI ke April 2025 ke niyam (news reports ke mutabik): pehla check original transaction ke 90 seconds baad, aur 2 ghante mein zyada se zyada 3. Ab beneficiary bank ne credit confirm kar diya tha: success.', go: ['gw>npci', 'res:npci>gw'], set: { ben: { state: 'ok', sub: 'credited (late)' } }, after: { gw: { state: 'ok', sub: 'pay_Q2x: CAPTURED' } } },
          { title: 'Agar aakhir mein fail?', text: 'Agar credit sach mein nahi hua aur debit ho chuka tha, to paisa wapas jaana hi chahiye. RBI ke 2019 ke TAT circular ke mutabik UPI merchant payment mein aisa debit T+5 din mein auto-reverse hona chahiye (P2P transfer mein T+1), warna bank ko customer ko ₹100 per day compensation dena padta hai.', focus: ['rem'] },
        ]},
        { name: 'Status-check toofan (2025)', intro: 'Ek real incident: retries ne khud outage bana diya.', steps: [
          { title: 'Sab PSPs baar baar poochhte hain', text: 'Pending transactions pe kai PSP banks bahut tez aur baar baar "check transaction status" bhejne lage.', flood: { paths: ['ppsp>npci', 'gw>npci'], n: 12 }, after: { npci: { state: 'hot', sub: 'overloaded' } } },
          { title: 'Naye payments bhi fail', text: 'News reports ke mutabik NPCI ne April 2025 ke UPI outages (12 April ka outage ghanton chala) ka kaaran yahi bataya: status check APIs ka overuse. Switch status checks mein dooba, naye payments ke success rate gire.', go: 'bad:npci>ppsp>app', set: { npci: { state: 'down', sub: 'success rate gira' } } },
          { title: 'Niyam: backoff aur limit', text: 'NPCI ne directive diya: pehla check 90 seconds baad, max 3 checks 2 ghante mein; uske baad settlement files ya dispute system (UDIR) se pata karo. Lesson: status check bhi ek retry hai, use bhi <a href="#/resilience">backoff, limit aur jitter</a> chahiye.', set: { npci: { state: 'ok', sub: 'central router' } } },
        ]},
      ],
    },

    { type: 'h3', text: 'Golden rule: timeout = "unknown", "failed" nahi' },
    { type: 'p', html: `Kisi bhi external call (bank, NPCI, card network) ke teen nateeje hote hain, do nahi: <strong>success</strong>, <strong>failed</strong>, aur <strong>unknown</strong>. Timeout, connection reset, 502, ye sab "unknown" hain: request shayad pahunchi, shayad kaam ho gaya. Payment system ka sabse important design decision yahi hai ki unknown ko kaise sambhaalein.` },
    { type: 'table', head: ['Situation', 'Galat reaction', 'Sahi reaction'], rows: [
      ['Bank call timeout', 'FAILED mark karo, user ko "dobara pay karo"', 'PENDING rakho, status check schedule karo'],
      ['Status abhi bhi unknown', 'Naya debit bhejo (retry)', 'Backoff ke saath dobara <em>status</em> poochho; limit ke baad settlement file / reconciliation pe chhodo'],
      ['User ne app band kar diya', 'Payment bhool jao', 'Background job / workflow pending payments ko khud resolve karta hai'],
      ['Late success aaya, payment pehle FAILED tha', 'Ignore karo (paisa kata reh gaya!)', 'Kabhi pehle se FAILED mat maano; aur aisa mismatch reconciliation pakad ke refund / fix kare'],
    ]},
    { type: 'p', html: `Ab khud dekho ki ye ek faisla kitna bada farak daalta hai. Neeche 10,000 payments ka ek din hai. Kuch bank calls timeout hoti hain, aur unme se kuch mein bank ne <em>asal mein</em> paisa kaat liya tha (sirf jawab khoya). Teen policies try karo:` },
    { type: 'custom', render(el) {
      const POL = [['fail', 'Timeout = FAILED, user dobara pay kare'], ['retry', 'Same debit turant dobara bhejo'], ['pend', 'PENDING + status check']];
      let pol = 'fail';
      el.innerHTML = `<div class="row2">
          <div><label>Payments (ek din)</label><input class="pay-to-n" type="number" value="10000" min="100" step="100"></div>
          <div><label>Timeout rate %</label><input class="pay-to-t" type="number" value="2" min="0" max="20" step="0.5"></div>
          <div><label>Timeout mein se kitne % mein bank ne asal mein paisa kaata</label><input class="pay-to-d" type="number" value="60" min="0" max="100" step="5"></div>
        </div>
        <div class="pay-to-p" style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0"></div>
        <div class="stats">
          <div class="stat"><span>Timeouts (unknown)</span><strong class="pay-to-a"></strong></div>
          <div class="stat"><span>Inme asal mein kata</span><strong class="pay-to-b"></strong></div>
          <div class="stat"><span>Double charges</span><strong class="pay-to-c"></strong></div>
          <div class="stat"><span>Extra paisa kata (₹499 each)</span><strong class="pay-to-e"></strong></div>
          <div class="stat"><span>"Processing" dikha</span><strong class="pay-to-f"></strong></div>
        </div>
        <div class="calc-note pay-to-note"></div>`;
      const box = el.querySelector('.pay-to-p');
      const chips = POL.map(p => { const c = document.createElement('button'); c.type = 'button'; c.className = 'chip'; c.textContent = p[1]; c.onclick = () => { pol = p[0]; upd(); }; box.appendChild(c); return c; });
      const upd = () => {
        const n = Math.min(200000, Math.max(0, Math.round(Number(el.querySelector('.pay-to-n').value) || 0)));
        const tr = Math.max(0, Number(el.querySelector('.pay-to-t').value) || 0) / 100, dr = Math.max(0, Number(el.querySelector('.pay-to-d').value) || 0) / 100;
        let s = 42; const rnd = () => (s = s * 16807 % 2147483647) / 2147483647;
        let to = 0, deb = 0;
        for (let i = 0; i < n; i++) { const a = rnd(), b = rnd(); if (a < tr) { to++; if (b < dr) deb++; } }
        const dbl = pol === 'pend' ? 0 : deb;
        chips.forEach((c, i) => { c.className = 'chip' + (POL[i][0] === pol ? ' on' : ''); });
        el.querySelector('.pay-to-a').textContent = to.toLocaleString('en-IN');
        el.querySelector('.pay-to-b').textContent = deb.toLocaleString('en-IN');
        const c = el.querySelector('.pay-to-c'); c.textContent = dbl.toLocaleString('en-IN'); c.style.color = dbl ? 'var(--red)' : 'var(--green)';
        el.querySelector('.pay-to-e').textContent = '₹' + (dbl * 499).toLocaleString('en-IN');
        el.querySelector('.pay-to-f').textContent = (pol === 'pend' ? to : 0).toLocaleString('en-IN');
        el.querySelector('.pay-to-note').textContent = pol === 'fail'
          ? `${deb} logon ko "failed" dikha jabki unka paisa kat chuka tha. Wo dobara pay karte hain: ${dbl} double charges. Upar se pehla payment FAILED hai, to bank ka late "success" state machine reject karegi; ye paisa sirf reconciliation aur refund se wapas aayega.`
          : pol === 'retry'
          ? `Har timeout pe naya debit gaya. Jahan pehla debit ho chuka tha (${deb}), wahan ab do debit: ${dbl} double charges. Retry tabhi safe hai jab bank usi transaction ID pe dedupe kare, aur us guarantee ke bina ye seedha double charge hai.`
          : `Koi double charge nahi. ${to} logon ko kuch der "processing" dikha (ye iski keemat hai). Status check ne ${deb} ko CAPTURED kiya (late success) aur ${to - deb} ko FAILED, jinke liye dobara pay karna ab safe hai.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Default numbers pe (10,000 payments, 2% timeout, 60% mein asal mein kata) simulator 189 timeouts aur unme 111 asli debits dikhata hai. Pehli do policies mein ye 111 log double charge hote hain (₹55,389 extra kata). Teesri mein zero, bas kuch log ko thodi der "processing" dikhta hai. Isliye payments mein "unknown" ek alag, teesri haalat hai.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "retry to hamesha achha hai"', html: `<a href="#/resilience">Resilience</a> lesson mein retries achhe the, kyunki wahan operation idempotent tha. Bank debit tabhi retry kar sakte ho jab bank ka API usi transaction ID pe dedupe kare (aur tab bhi pehle status poochhna behtar hai). Bina is guarantee ke, "unknown" debit ko retry karna = double charge ka seedha raasta. Retry karo <strong>status check</strong> ko, debit ko nahi.` },

    { type: 'h2', text: 'Deep dive 5: outbox aur webhooks (merchant ko batana)' },
    { type: 'p', html: `Payment CAPTURED ho gaya. Ab ye khabar kai jagah jaani hai: merchant ka webhook, analytics, notifications, fraud systems. Razorpay ke 2026 engineering blog mein unke UPI Switch ka bhi yahi haal tha: ek successful payment ko kai kaamon mein fan-out hona tha (NPCI ko update, merchant ko callback, data warehouse). Problem: DB mein CAPTURED likha, phir Kafka mein event publish karne se pehle server crash. DB kehta hai "captured", baaki duniya ko kabhi pata nahi chala. Ulta bhi ho sakta hai: event chala gaya, DB transaction rollback.` },
    { type: 'p', html: `Ilaaj wahi jo <a href="#/distributed-tx">distributed transactions</a> aur <a href="#/kafka">Kafka</a> lessons mein dekha: <strong>transactional outbox</strong>. Event ko usi DB transaction mein ek <code>outbox</code> table mein likho jisme payment ki state badli. Ek alag relay (poller ya CDC tool) outbox padh ke Kafka mein publish karta hai. Ya dono hue, ya koi nahi.` },
    { type: 'callout', tone: 'term', title: 'Naya word: transactional outbox', html: `<strong>Ye kya hai:</strong> Payments DB ki ek table (<code>outbox</code>) jisme "bahar bhejne wale" events likhe jaate hain, usi transaction mein jisme payment ki state badli. Jaise bahar jaane wali chitthiyon ka dabba: chitthi dabbe mein daal di, to dakiya (relay) baad mein zaroor le jaayega.<br><strong>Kyun chahiye:</strong> DB aur Kafka do alag systems hain. Dono mein ek saath "ya sab ya kuch nahi" likhna mumkin nahi. Outbox ke saath hum sirf ek system (DB) mein likhte hain, aur publish baad mein hota hai.<br><strong>Iske bina:</strong> state CAPTURED ho gayi lekin event kabhi nahi gaya (merchant ko pata hi nahi), ya event gaya lekin DB rollback ho gaya (merchant ne Premium de diya, paisa aaya hi nahi).` },
    { type: 'callout', tone: 'term', title: 'Naye words: relay, Kafka, CDC', html: `<strong>Relay:</strong> ek chhota program jo outbox ki naye rows uthata hai, Kafka mein bhejta hai, phir row ko "published" mark karta hai.<br><strong>Kafka:</strong> events ka ek lamba, kabhi na mitne wala register (log). Kai services usse apni speed se padhti hain. Poora <a href="#/kafka">Kafka lesson</a> mein.<br><strong>CDC (Change Data Capture):</strong> relay ka ek tareeka: DB ke apne change-log ko padh ke naye rows pakadna, baar baar table poochhe (poll) bina.<br><strong>Kyun chahiye:</strong> ek payment ki khabar kai jagah jaani hai (webhook, analytics, fraud). Kafka mein ek baar daalo, sab padh lein.` },
    { type: 'callout', tone: 'term', title: 'Naya word: webhook', html: `<strong>Ye kya hai:</strong> ulta API call. Normally xyz.com xyzPay ko call karta hai. Webhook mein <em>xyzPay</em> xyz.com ke server ka ek URL call karta hai: "pay_Q2x captured ho gaya".<br><strong>Kyun chahiye:</strong> payment kab pakka hoga, ye kisi ko pehle se nahi pata (kabhi 2 second, kabhi 2 minute). Merchant baar baar poochhe, isse behtar hai ki jab ho tab xyzPay khud bata de.<br><strong>Iske bina:</strong> merchant ko har few second status poochhna padta (polling), ya phir Riya ke app pe bharosa karna padta, jo koi bhi badal sakta hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: HMAC signature', html: `<strong>Ye kya hai:</strong> message ke saath ek "mohar". xyzPay aur xyz.com dono ke paas ek secret hai. xyzPay body + secret se ek code (HMAC-SHA256) banata hai aur header mein bhejta hai. xyz.com wahi code khud banake milata hai.<br><strong>Kyun chahiye:</strong> xyz.com ka webhook URL internet pe khula hai. Mohar se pata chalta hai ki message sach mein xyzPay ne bheja aur raste mein kisi ne badla nahi.<br><strong>Iske bina:</strong> koi bhi fake "payment.captured" bhej ke free Premium le sakta hai. Neeche "Fake webhook" scenario mein dekho. (Keys aur hashing ka basic <a href="#/crypto-keys">crypto lesson</a> mein hai.)` },
    { type: 'flow', title: 'Captured → outbox → Kafka → signed webhook', height: 320,
      nodes: [
        { id: 'svc', label: 'Payment service', sub: 'state machine', x: 95, y: 80, w: 160, kind: 'server', info: 'Ye kya hai: wo service jo payment ki state machine chalati hai. State change, ledger lines aur outbox event ek hi DB transaction mein likhti hai. Kafka ko seedha publish nahi karti.' },
        { id: 'db', label: 'Payments DB', sub: 'payment + outbox', x: 95, y: 245, w: 160, kind: 'data', info: 'Ye kya hai: xyzPay ka SQL database, jisme outbox table bhi hai: event_id, type, payment_id, payload, published_at. Payment row aur outbox row ek hi COMMIT mein (COMMIT = transaction pakka karna).' },
        { id: 'relay', label: 'Outbox relay', sub: 'poller / CDC', x: 310, y: 245, w: 140, kind: 'server', info: 'Ye kya hai: outbox se Kafka tak ka dakiya. Outbox ki unpublished rows padh ke Kafka mein bhejta hai, phir published mark karta hai. Crash ho to restart pe dobara bhejega, isliye downstream sab ko duplicates sambhaalne aane chahiye (at-least-once).' },
        { id: 'k', label: 'Kafka', sub: 'payment events', x: 500, y: 245, w: 130, kind: 'queue', info: 'Ye kya hai: payment events ka log (register). Webhook sender, analytics, notifications sab apni speed se padhte hain. Key = payment_id, taaki ek payment ke events order mein rahein.' },
        { id: 'wh', label: 'Webhook sender', sub: 'retry + sign', x: 470, y: 80, w: 150, kind: 'server', info: 'Ye kya hai: wo service jo merchants ko webhook bhejti hai. Har merchant ke registered URL pe HTTPS POST. Body ka HMAC-SHA256 signature header mein. Non-2xx ya timeout pe exponential backoff ke saath retry.' },
        { id: 'm', label: 'xyz.com', sub: 'merchant server', x: 650, y: 80, w: 120, kind: 'client', info: 'Ye kya hai: merchant ka server. Webhook receive karta hai: signature verify, event_id se dedupe, jaldi 2xx, phir Premium activate.' },
        { id: 'att', label: 'Attacker', sub: 'fake webhook', x: 650, y: 245, w: 120, kind: 'threat', hidden: true, info: 'Ye kya hai: ek dhokebaaz. Koi bhi xyz.com ke webhook URL pe "payment.captured" jaisa fake JSON bhej sakta hai. Signature ke bina ise asli se alag nahi kar sakte.' },
      ],
      edges: [{ a: 'svc', b: 'db' }, { a: 'db', b: 'relay' }, { a: 'relay', b: 'k' }, { a: 'k', b: 'wh' }, { a: 'wh', b: 'm' }, { a: 'att', b: 'm', id: 'am', hidden: true, dashed: true }],
      scenarios: [
        { name: 'Happy path', steps: [
          { title: 'Ek transaction', text: 'UPDATE state=CAPTURED, ledger INSERTs, outbox INSERT, COMMIT.', go: ['svc>db', 'res:db>svc'], after: { db: { state: 'ok', sub: 'CAPTURED + outbox row' } }, msg: 'outbox: { event_id: evt_91, type: payment.captured, payment_id: pay_Q2x }' },
          { title: 'Relay publish karta hai', text: 'Relay ne unpublished row uthayi aur Kafka mein daali, phir published mark kiya.', go: ['db>relay', 'evt:relay>k'] },
          { title: 'Webhook sender', text: 'Consumer ne event padha, merchant ke secret se body sign ki.', go: 'evt:k>wh', msg: 'X-Signature = HMAC_SHA256(webhook_secret, raw_body)' },
          { title: 'Merchant ko delivery', text: 'xyz.com ne signature verify kiya, evt_91 pehle nahi dekha tha, 2xx lautaya, phir Riya ko Premium diya.', go: ['wh>m', 'res:m>wh'], after: { m: { state: 'ok', sub: 'Premium ON' } } },
        ]},
        { name: 'Relay crash: duplicate', intro: 'Relay ne Kafka mein bheja, lekin "published" mark karne se pehle crash.', steps: [
          { title: 'Publish hua...', go: ['db>relay', 'evt:relay>k'], text: 'Event Kafka mein pahunch gaya.' },
          { title: '...mark se pehle crash', text: 'Outbox row abhi bhi "unpublished" dikh rahi hai.', set: { relay: { state: 'down', sub: 'crash' } }, focus: ['relay'] },
          { title: 'Restart: dobara publish', text: 'Relay wapas aaya, wahi row phir bheji. Kafka mein ab evt_91 do baar. Ye at-least-once hai: event khoya nahi, lekin duplicate ho sakta hai.', set: { relay: { state: 'ok', sub: 'poller / CDC' } }, go: ['db>relay', 'evt:relay>k', 'evt:k>wh', 'wh>m'] },
          { title: 'Merchant dedupe karta hai', text: 'xyz.com ne dekha: evt_91 pehle process ho chuka. Kuch nahi kiya, bas 2xx. Razorpay ke docs bhi kehte hain ki webhooks at-least-once hain, aur dedupe ke liye <code>x-razorpay-event-id</code> header use karo.', go: 'res:m>wh', after: { m: { state: 'ok', sub: 'duplicate ignored' } } },
        ]},
        { name: 'Merchant down', steps: [
          { title: 'xyz.com ka server down', text: 'Webhook gaya, 503 / timeout aaya.', set: { m: { state: 'down', sub: 'DOWN' } }, go: ['evt:k>wh', 'wh>m', 'bad:m>wh'] },
          { title: 'Backoff ke saath retries', text: 'Razorpay ke docs ke mutabik: non-2xx = delivery failure, aur event ke time se 24 ghante tak exponential backoff ke saath retry. Merchant ko 5 seconds ke andar 2xx dena hota hai, warna timeout maan ke dobara bhejte hain.', flood: { paths: ['bad:wh>m'], n: 4 }, after: { wh: { state: 'warn', sub: 'retrying...' } } },
          { title: '24 ghante fail = disabled', text: 'Razorpay ke docs: 24 ghante lagataar fail ho to webhook disable, merchant dashboard se dobara enable kare. Isliye merchant ko webhook pe poora bharosa nahi karna chahiye: wo <code>GET /payments/{id}</code> se khud bhi status poochh sakta hai (reconciliation).', set: { m: { state: 'ok', sub: 'wapas aaya' } }, after: { wh: { state: 'dim', sub: 'disabled' } } },
        ]},
        { name: 'Fake webhook', steps: [
          { title: 'Attacker ka JSON', text: 'Koi xyz.com ke webhook URL pe fake "payment.captured" bhejta hai, taaki free Premium mil jaaye.', show: ['att', 'am'], go: 'att>m', msg: '{ "event": "payment.captured", "payment_id": "pay_FAKE" }' },
          { title: 'Signature fail', text: 'Attacker ke paas webhook secret nahi, to sahi HMAC nahi bana sakta. xyz.com reject karta hai. Razorpay ke docs ek baat pe zor dete hain: signature <strong>raw body</strong> pe check karo, JSON parse karke dobara banaye body pe nahi.', go: 'bad:m>att', after: { m: { state: 'ok', sub: 'rejected 401' } } },
        ]},
      ],
    },

    { type: 'callout', tone: 'warn', title: 'Real duniya: Razorpay ke UPI Switch ka outbox (2026 blog)', html: `Razorpay ne apne UPI Switch ke 5 saal ke Kafka safar pe likha. Unhone payment aur event ko atomic rakhne ke liye outbox pattern lagaya tha: business data aur event ek hi DB transaction mein, aur AWS ka managed connector table padh ke Kafka mein publish karta tha. Dikkat: wo connector ek source table se sirf ek configured topic pe likh sakta tha, jabki unke paas har event type ka alag topic tha. Custom routing jodi, to connector baar baar crash hua. Connector hataya, aur blog khud maanta hai ki ab DB write aur Kafka publish alag operations hain, jisse "windowed failures" ho sakte hain (DB hua, publish nahi, ya ulta). Unki agli plan list mein hai: har message pe durable idempotency key (jaise payment ID + event type) aur consumer side dedupe store. Lesson: pattern sahi tha, tooling ne dhoka diya; aur "har event type = alag topic" ne partitions ka pahaad bana diya.` },
    { type: 'p', html: `Merchant ki taraf webhook handler aisa hona chahiye:` },
    { type: 'code', text: `
POST /hooks/pay   (xyz.com ka server)
  raw = request ka raw body (parse karne se pehle)
  expected = HMAC_SHA256(webhook_secret, raw)
  if not constant_time_equal(expected, header["X-Signature"]):  return 401
  event = json.parse(raw)
  BEGIN
    INSERT INTO processed_events(event_id) VALUES (event.event_id)   -- UNIQUE
      → duplicate? COMMIT karo, 200 lautao, kuch mat karo
    subscription ko activate karo (state machine: sirf PENDING → ACTIVE)
  COMMIT
  return 200        -- jaldi! bhaari kaam queue mein daalo` },
    { type: 'list', items: [
      '<strong>Signed</strong>: HMAC (shared secret ke saath hash) se pata chalta hai ki message xyzPay ne bheja aur raste mein badla nahi gaya. Razorpay ka header <code>X-Razorpay-Signature</code> hai, HMAC-SHA256.',
      '<strong>Retried</strong>: delivery at-least-once hai. Merchant ka server down ho to bhi event khoyega nahi (24 ghante tak, Razorpay ke case mein).',
      '<strong>Idempotent handling</strong>: event_id pe dedupe. Aur order pe bharosa mat karo: Razorpay ke docs kehte hain webhooks hamesha order mein nahi aate. "payment.failed" baad mein aaye aur "captured" pehle, to state machine galat transition ko reject karegi.',
    ]},

    { type: 'h2', text: 'Deep dive 6: reconciliation (apni kitaab vs bank ki kitaab)' },
    { type: 'p', html: `Ab tak sab kuch hamare apne system ke andar consistent tha. Lekin paisa asal mein banks ke paas hai, aur unke systems hamare control mein nahi. Ek jawab raste mein gum hua, ek bank ne late credit kiya, hamare code mein ek bug tha: inn sab se hamari kitaab aur asli duniya alag ho sakti hai. Idempotency aur state machine <em>andar</em> ki galtiyan rokte hain; <strong>reconciliation</strong> <em>bahar</em> se aayi galtiyan pakadta hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: settlement file', html: `<strong>Ye kya hai:</strong> bank / NPCI roz ek file dete hain: "aaj ye ye transactions success hue, itna paisa itne account mein". Ye unki kitaab ki copy hai.<br><strong>Kyun chahiye:</strong> asli paisa banks ke paas hai. Unki kitaab hi bataati hai ki asal mein kya hua.<br><strong>Iske bina:</strong> humein sirf apni kitaab pe bharosa karna padta, aur apni kitaab ki galti kabhi nahi pakdi jaati.` },
    { type: 'callout', tone: 'term', title: 'Naya word: reconciliation (recon)', html: `<strong>Ye kya hai:</strong> settlement file ki har line ko apne ledger ki har line se milana (transaction reference se), aur jo na mile use "break" (mismatch) maan ke suljhana. Jaise school ke baad apni copy ke answers dost ki copy se milana.<br><strong>Kyun chahiye:</strong> idempotency aur state machine <em>andar</em> ki galtiyan rokte hain. Bahar ki galtiyan (bank ka late jawab, bank ka bug, hamara bug) sirf milaane se pakdi jaati hain.<br><strong>Iske bina:</strong> kisi ka paisa kata, hamare paas record nahi, aur hafton tak kisi ko pata nahi chalta.<br><strong>Example:</strong> Razorpay ke 2020 ke settlements post ke mutabik default settlement T+2 (do working days) hai, aur settlement turant na hone ki ek wajah yahi reconciliation ki complexity hai.` },
    { type: 'p', html: `Neeche xyzPay ki ek din ki recon hai. Pehle "clean day" chalao, phir ek ek problem on karke dekho kaun si mismatch kaise pakdi jaati hai:` },
    { type: 'custom', render(el) {
      const BASE = [['pay_101', 499], ['pay_102', 199], ['pay_103', 999], ['pay_104', 499], ['pay_105', 299], ['pay_106', 1499], ['pay_107', 2499], ['pay_108', 99]];
      const T = [['late', 'Late success'], ['miss', 'Bank file mein missing'], ['amt', 'Amount mismatch'], ['dup', 'Bank file mein duplicate']];
      const on = { late: false, miss: false, amt: false, dup: false };
      el.innerHTML = `<div class="pay-rc-t" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px"></div>
        <button type="button" class="btn small primary pay-rc-run">Reconciliation chalao</button>
        <div class="stats">
          <div class="stat"><span>Matched</span><strong class="pay-rc-ok"></strong></div>
          <div class="stat"><span>Mismatches</span><strong class="pay-rc-bad"></strong></div>
          <div class="stat"><span>Ledger total (captured)</span><strong class="pay-rc-lt"></strong></div>
          <div class="stat"><span>Bank file total</span><strong class="pay-rc-bt"></strong></div>
        </div>
        <div class="pay-rc-out" style="overflow-x:auto"></div>
        <div class="calc-note pay-rc-note"></div>`;
      const data = () => {
        const led = BASE.map(r => ({ ref: r[0], amt: r[1], st: (on.late && r[0] === 'pay_104') ? 'PENDING' : 'CAPTURED' }));
        let bank = BASE.map(r => ({ ref: r[0], amt: (on.amt && r[0] === 'pay_107') ? 2490 : r[1] }));
        if (on.miss) bank = bank.filter(r => r.ref !== 'pay_106');
        if (on.dup) bank.push({ ref: 'pay_108', amt: 99 });
        return { led, bank };
      };
      const recon = (led, bank) => {
        const bm = {}; bank.forEach(r => { (bm[r.ref] = bm[r.ref] || []).push(r); });
        const refs = [...new Set(led.map(r => r.ref).concat(bank.map(r => r.ref)))].sort();
        return refs.map(ref => {
          const l = led.find(r => r.ref === ref), bs = bm[ref] || [];
          const cap = l && l.st === 'CAPTURED';
          if (cap && bs.length === 0) return [ref, l.amt, '-', 'MISSING IN BANK', 'Bank se poochho; settlement hold; shayad hamara bug'];
          if (!cap && bs.length) return [ref, l ? l.st : '-', bs[0].amt, 'MISSING IN LEDGER', 'Late success: CAPTURED karo + ledger entry, ya order nahi bana to refund'];
          if (bs.length > 1) return [ref, l.amt, bs.map(b => b.amt).join(' + '), 'DUPLICATE IN BANK', 'Bank ke saath dispute; ek line ko adjust karo'];
          if (bs[0].amt !== l.amt) return [ref, l.amt, bs[0].amt, 'AMOUNT MISMATCH', 'Investigate; confirm hone pe adjustment entry (edit nahi)'];
          return [ref, l.amt, bs[0].amt, 'MATCHED', '-'];
        });
      };
      const run = () => {
        const { led, bank } = data(); const rows = recon(led, bank);
        const ok = rows.filter(r => r[3] === 'MATCHED').length;
        const lt = led.filter(r => r.st === 'CAPTURED').reduce((s, r) => s + r.amt, 0), bt = bank.reduce((s, r) => s + r.amt, 0);
        el.querySelector('.pay-rc-ok').textContent = ok;
        el.querySelector('.pay-rc-bad').textContent = rows.length - ok;
        el.querySelector('.pay-rc-lt').textContent = '₹' + lt.toLocaleString('en-IN');
        el.querySelector('.pay-rc-bt').textContent = '₹' + bt.toLocaleString('en-IN');
        el.querySelector('.pay-rc-out').innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:12px"><tr>${['Ref', 'Ledger', 'Bank file', 'Result', 'Action'].map(h => `<th style="text-align:left;padding:4px;border-bottom:1px solid var(--line)">${h}</th>`).join('')}</tr>` +
          rows.map(r => `<tr>${r.map((c, i) => `<td style="padding:4px;border-bottom:1px solid var(--line);${i === 3 ? 'font-weight:600;color:' + (c === 'MATCHED' ? 'var(--green)' : 'var(--red)') : 'color:var(--ink-2)'}">${c}</td>`).join('')}</tr>`).join('') + '</table>';
        el.querySelector('.pay-rc-note').textContent = rows.length === ok ? `Saari ${ok} lines match. Fark ₹0. Aisa din sabse achha din hai.` : `Fark (bank − ledger) = ${bt - lt < 0 ? '−' : '+'}₹${Math.abs(bt - lt).toLocaleString('en-IN')}. Har mismatch ek "break" hai: ops team ki queue mein jaata hai, aur fix hamesha ek nayi ledger entry se hota hai, purani line edit karke nahi.`;
      };
      T.forEach(t => { const c = document.createElement('button'); c.type = 'button'; c.className = 'chip'; c.textContent = t[1]; c.onclick = () => { on[t[0]] = !on[t[0]]; c.className = 'chip' + (on[t[0]] ? ' on' : ''); run(); }; el.querySelector('.pay-rc-t').appendChild(c); });
      el.querySelector('.pay-rc-run').onclick = run; run();
    }},
    { type: 'list', items: [
      '<strong>Kab chalta hai</strong>: roz ek batch job (settlement file aane ke baad), aur aaj kal kai companies din mein kai baar ya near-real-time bhi. NPCI ke 2025 niyam bhi kehte hain ki 2 ghante baad bhi status na mile to settlement files se pata karo.',
      '<strong>Teen-tarfa</strong>: aksar teen cheezein milayi jaati hain: hamara ledger, NPCI / bank ki transaction file, aur escrow account ka bank statement (asli paisa aaya ya nahi).',
      '<strong>Breaks ka kya</strong>: chhoti cheezein auto-fix (late success → capture ya auto-refund), baaki ek ops queue mein. Har fix ek nayi journal entry, taaki audit trail bana rahe.',
      '<strong>Merchant ke liye bhi</strong>: Razorpay jaise gateways merchants ko settlement reports dete hain taaki merchant bhi apne orders se mila sake.',
    ]},

    { type: 'h2', text: 'Awareness: fraud, tokenisation, PCI DSS, escrow' },
    { type: 'p', html: `Interview mein inka naam aur ek line kaafi hai. Asli kaam mein ye poori teams hain.` },
    { type: 'table', head: ['Cheez', 'Kya hai', 'Design pe asar'], rows: [
      ['Fraud / risk checks', 'Payment se pehle aur baad mein rules + ML: ek card se bahut tez payments (velocity), naya device, card-testing attacks', 'Payment path mein ek risk call (fast, timeout ke saath), aur events pe streaming detection. AWS ke 2026 case study ke mutabik Razorpay payment events Kafka + Flink se real-time anomaly detection karta hai.'],
      ['Card tokenisation', 'Asli card number ki jagah ek token. RBI ke card-on-file rules ke baad merchants aur gateways asli card data store nahi kar sakte (sirf issuer / card network); recon ke liye last 4 digits jaisi limited info rakh sakte hain.', 'Hamare DB mein card number nahi, token. Data leak ho to bhi card number nahi nikalta.'],
      ['PCI DSS', 'Card data chhoone wale har system ke liye global security standard (card networks ka)', 'Card data ko ek chhote, alag, kade "vault" mein rakho, taaki baaki system PCI scope se bahar rahe. Merchant hosted checkout use kare to card number uske server tak aata hi nahi.'],
      ['Escrow account', 'RBI ke 2020 payment aggregator guidelines ke mutabik non-bank aggregator merchants ke liye collect kiya paisa ek scheduled commercial bank ke escrow account mein rakhta hai', 'Ledger mein "escrow cash" alag account, aur bank statement se teen-tarfa recon.'],
    ]},

    { type: 'h2', text: 'Failure scenarios ek nazar mein' },
    { type: 'table', head: ['Kya toota', 'Bina design ke', 'Hamara jawab'], rows: [
      ['Client ka jawab gum, retry', 'Double charge', 'Idempotency key: saved response replay'],
      ['Double click / concurrent retries', 'Do debit', 'Unique constraint, doosre ko 409'],
      ['Bank / NPCI timeout', '"Failed" bol ke dobara charge', 'PENDING + status check (limit + backoff), retry debit kabhi nahi'],
      ['Server crash after DB commit, before publish', 'Merchant ko kabhi pata nahi', 'Transactional outbox, relay at-least-once'],
      ['Duplicate events / webhooks', 'Premium do baar, refund do baar', 'event_id dedupe, idempotent consumers, state machine'],
      ['Out-of-order events', 'CAPTURED ke baad FAILED likh diya', 'State machine galat transition reject karti hai'],
      ['Merchant ka server down', 'Event khoya', 'Retries with backoff (Razorpay: 24 ghante), phir merchant API se status poll kare'],
      ['Bug ne galat ledger entry likhi', 'Paisa chupchaap gayab', 'Har entry balanced; fix = reversal entry; recon pakadta hai'],
      ['Bank ne late credit / galat amount', 'Kitaab aur asli paisa alag', 'Daily reconciliation, breaks ki ops queue'],
      ['Sab ek saath status check karein', 'Retries khud outage', 'Status check pe bhi rate limit + jitter (NPCI 2025 niyam)'],
    ]},

    { type: 'h2', text: 'Interview mein kaise bolein' },
    { type: 'steps', items: [
      { t: 'Hard part pehle bolo', d: 'Paisa na khoye, na do baar kate, jabki network aur banks unreliable hain. Correctness > latency.' },
      { t: 'API + idempotency', d: 'Har POST pe client-generated idempotency key, (merchant, key) unique, saved response replay, hash mismatch pe error.' },
      { t: 'State machine', d: 'created → pending → authorized → captured → settled, plus failed / refunded. Conditional updates, terminal states, history.' },
      { t: 'Ledger', d: 'Double-entry, append-only, SQL mein strongly consistent; har journal ka jod zero; corrections = nayi entries; hot accounts ke liye sub-accounts.' },
      { t: 'External calls', d: 'Timeout = unknown. PENDING, status check with backoff + limits, kabhi blind retry nahi. UPI ke liye PSP → NPCI → remitter (debit) → beneficiary (credit).' },
      { t: 'Events + merchants', d: 'Outbox → Kafka → idempotent consumers; signed (HMAC), retried, deduped webhooks.' },
      { t: 'Safety net', d: 'Daily reconciliation vs settlement files; breaks queue. Awareness: fraud checks, tokenisation, PCI DSS, escrow.' },
    ]},
    { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>Har payment API idempotent</strong> banao (client key + saved response). <strong>Paisa ka hisaab</strong> ek double-entry, append-only ledger mein, strongly consistent SQL pe, ek transaction mein state + ledger + outbox. <strong>Bank/network ka timeout "unknown"</strong> hai: PENDING rakho aur status check se suljhao, debit retry kabhi nahi. <strong>Events</strong> outbox se, webhooks signed + retried + deduped. Aur <strong>roz reconciliation</strong> chalao, kyunki bahar ki duniya ki galtiyan sirf wahi pakadta hai. Cache ya eventual consistency wahan jahan paisa nahi hai (dashboards, analytics), balance pe kabhi nahi.` },

    { type: 'diagram', title: 'Poora design, ek nazar mein', height: 600,
      caption: 'Upar bahar ki duniya (UPI network). Left mein Riya aur xyz.com, beech mein xyzPay, right mein bank files aur events (Async). Upar ke buttons se ek-ek raasta dekho.',
      groups: [
        { label: 'UPI network (bahar ki duniya)', x: 10, y: 8, w: 700, h: 128 },
        { label: 'Clients', x: 10, y: 164, w: 160, h: 426 },
        { label: 'xyzPay', x: 190, y: 164, w: 340, h: 426 },
        { label: 'Async', x: 550, y: 164, w: 160, h: 426 },
      ],
      nodes: [
        { id: 'ppsp', label: 'Riya ka UPI app', sub: 'payer PSP', x: 90, y: 80, kind: 'client', info: 'Ye kya hai: PhonePe / GPay / Paytm jaisa UPI app aur uska PSP bank. Riya yahan PIN daalti hai, aur ye request NPCI tak le jaata hai. Paisa app mein nahi rehta, sirf request yahan se chalti hai.' },
        { id: 'npci', label: 'NPCI switch', sub: 'UPI ka router', x: 270, y: 80, kind: 'net', info: 'Ye kya hai: NPCI ka central system, har UPI payment yahan se guzarta hai. Pehle Riya ke bank se debit karwata hai, phir lene wale bank mein credit, aur dono PSPs ko result batata hai.' },
        { id: 'rem', label: 'Remitter bank', sub: 'Riya ka: debit', x: 450, y: 80, kind: 'data', info: 'Ye kya hai: Riya ka bank. PIN check karta hai aur Riya ke account se ₹499 kaatta hai (debit).' },
        { id: 'ben', label: 'Beneficiary bank', sub: 'credit, escrow', x: 630, y: 80, kind: 'data', info: 'Ye kya hai: wo bank jahan paisa jama (credit) hota hai, xyzPay ke escrow account ki taraf. Roz settlement file bhi yahi (aur NPCI) deta hai.' },
        { id: 'app', label: 'Riya ka app', sub: 'xyz.com checkout', x: 90, y: 220, kind: 'client', info: 'Ye kya hai: xyz.com ka app, jisme xyzPay ka checkout hai. Nayi idempotency key ke saath payment shuru karta hai aur UPI app kholta hai (intent). Iski baat pe Premium nahi milta.' },
        { id: 'conn', label: 'UPI connector', sub: 'timeout = unknown', x: 270, y: 220, kind: 'server', info: 'Ye kya hai: xyzPay ka hissa jo NPCI se baat karta hai (payee PSP ki taraf). Result sunta hai; jawab na aaye to payment PENDING rakhta hai aur sirf status check bhejta hai (backoff, limit), naya debit kabhi nahi.' },
        { id: 'files', label: 'Settlement files', sub: 'roz, bank + NPCI', x: 630, y: 220, kind: 'data', info: 'Ye kya hai: banks aur NPCI ki roz ki report: kaunse transactions sach mein hue aur kitna paisa kahan gaya. Unki kitaab ki copy.' },
        { id: 'api', label: 'Payment API', sub: 'idempotency keys', x: 270, y: 330, kind: 'server', info: 'Ye kya hai: xyzPay ka darwaaza. Har POST pe idempotency key check (retry = saved jawab), state machine ke niyam, aur kaam connector ko. Stateless, LB ke peeche.' },
        { id: 'recon', label: 'Recon job', sub: 'roz milaao', x: 450, y: 330, kind: 'server', info: 'Ye kya hai: roz chalne wala job jo settlement file ki har line ko ledger se milata hai. Mismatch (break) ops queue mein jaata hai, aur fix hamesha ek nayi ledger entry se.' },
        { id: 'db', label: 'Payments DB', sub: 'state+ledger+outbox', x: 270, y: 440, kind: 'data', info: 'Ye kya hai: strongly consistent SQL database. Payment ki state, idempotency keys, double-entry ledger (har entry ka jod zero, sirf INSERT) aur outbox: sab ek hi transaction mein likhe jaate hain.' },
        { id: 'relay', label: 'Outbox relay', sub: 'poller / CDC', x: 450, y: 440, kind: 'server', info: 'Ye kya hai: outbox table se naye events utha ke Kafka mein daalne wala dakiya. Crash ke baad dobara bhej sakta hai, isliye aage sab dedupe karte hain (at-least-once).' },
        { id: 'kafka', label: 'Kafka', sub: 'payment events', x: 630, y: 440, kind: 'queue', info: 'Ye kya hai: payment events ka log. Webhook sender, analytics, fraud, notifications sab isse apni speed se padhte hain. Key = payment_id, taaki ek payment ke events order mein rahein.' },
        { id: 'merchant', label: 'xyz.com server', sub: 'merchant', x: 90, y: 550, kind: 'client', info: 'Ye kya hai: merchant ka server. Order banata hai, signed webhook verify karta hai, event_id pe dedupe karta hai, aur tab Riya ko Premium deta hai. Shak ho to GET /payments/{id} se khud poochhta hai.' },
        { id: 'wh', label: 'Webhook sender', sub: 'HMAC + retries', x: 450, y: 550, kind: 'server', info: 'Ye kya hai: merchants ko \"payment ho gaya\" batane wali service. Body pe HMAC mohar, non-2xx pe backoff ke saath retry (Razorpay: 24 ghante tak).' },
        { id: 'cons', label: 'Analytics, fraud', sub: 'notifications', x: 630, y: 550, kind: 'server', info: 'Ye kya hai: baaki consumers: dashboards, fraud / risk checks, SMS-email. Paisa inke hisaab se nahi chalta, isliye inme thodi der (eventual consistency) chal jaati hai.' },
      ],
      edges: [
        { a: 'app', b: 'api', n: 1, label: 'pay + key' },
        { a: 'api', b: 'db', label: 'ek transaction', both: true },
        { a: 'app', b: 'ppsp', n: 2, label: 'intent + PIN' },
        { a: 'ppsp', b: 'npci', n: 3 },
        { a: 'npci', b: 'rem', n: 4 },
        { a: 'npci', b: 'ben', n: 5, label: 'credit', via: [[270, 22], [630, 22]] },
        { a: 'npci', b: 'conn', n: 6, label: 'result / status', both: true },
        { a: 'conn', b: 'api', n: 7 },
        { a: 'merchant', b: 'api', label: 'order / status', via: [[90, 330]], both: true },
        { a: 'db', b: 'relay', kind: 'evt' },
        { a: 'relay', b: 'kafka', kind: 'evt' },
        { a: 'kafka', b: 'wh', kind: 'evt' },
        { a: 'wh', b: 'merchant', kind: 'evt', label: 'signed webhook' },
        { a: 'kafka', b: 'cons', kind: 'evt' },
        { a: 'ben', b: 'files', label: 'settlement' },
        { a: 'files', b: 'recon', label: 'roz match' },
        { a: 'recon', b: 'db', dashed: true },
      ],
      paths: [
        { name: 'Pay', text: 'App key ke saath payment banata hai (CREATED) → UPI app mein PIN → payer PSP → NPCI → Riya ke bank se debit → beneficiary bank mein credit → result connector tak → ek transaction mein CAPTURED + ledger + outbox.', go: ['app>api>db', 'app>ppsp>npci>rem', 'npci>ben', 'npci>conn>api>db'] },
        { name: 'Timeout → unknown', text: 'Debit ho gaya, credit ka jawab nahi aaya. Connector ka timeout = "unknown": payment PENDING, Riya ko "processing". Naya debit nahi; sirf status check (backoff, max 3). Jawab "success" aaya to CAPTURED.', go: ['app>api>db', 'app>ppsp>npci>ben', 'npci>conn>api>db'] },
        { name: 'Webhook', text: 'CAPTURED ke saath outbox row → relay → Kafka → webhook sender (HMAC mohar, retries) → xyz.com (verify, dedupe, Premium ON). Analytics aur fraud bhi wahi event padhte hain.', go: ['api>db>relay>kafka>wh>merchant', 'kafka>cons'] },
        { name: 'Reconcile', text: 'Roz bank + NPCI ki settlement file aati hai → recon job har line ledger se milata hai → mismatch ops queue mein, fix = nayi ledger entry.', go: ['ben>files>recon>db'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Payments mein speed se pehle correctness: paisa na kabhi do baar kate, na gayab ho.</li>
      <li>Har payment API pe client ki idempotency key: retry pe saved jawab, dobara debit nahi.</li>
      <li>Payment ek state machine hai (created → pending → authorized → captured → settled, plus failed / refunded). Galat transition DB ke conditional update se reject.</li>
      <li>Double-entry ledger: har entry ka jod zero, sirf INSERT (append-only), galti ka ilaaj ulti entry.</li>
      <li>UPI: payer PSP → NPCI → remitter bank (debit) → beneficiary bank (credit). Bahar ki har call ka timeout = "unknown": PENDING + limited status checks, blind retry kabhi nahi.</li>
      <li>State + ledger + outbox ek DB transaction mein; relay → Kafka → signed, retried, deduped webhooks.</li>
      <li>Roz reconciliation bahar ki galtiyan pakadta hai: settlement file vs ledger.</li>
    </ul>` },
    { type: 'h2', text: 'Trade-offs jo humne liye' },
    { type: 'tradeoffs',
      gains: ['Idempotency: retries safe, double charge nahi', 'State machine: impossible transitions (FAILED ka refund) ho hi nahi sakte', 'Double-entry ledger: har rupaye ka "kyun", bugs turant dikhte hain (jod ≠ 0)', 'Append-only: poori audit history, galti bhi trace hoti hai', 'Outbox: DB aur events kabhi alag nahi', 'Recon: bahar ki duniya ki galtiyan bhi pakdi jaati hain'],
      costs: ['Har write pe extra kaam: key check, ledger lines, outbox row (latency + storage)', 'Strong consistency ki keemat: SQL scale karna mushkil, hot accounts pe lock contention', 'PENDING state ka bura UX: user ko "processing" dikhana padta hai', 'At-least-once events: har consumer ko dedupe likhna padta hai', 'Recon aur ops team: roz ka kaam, kabhi khatam nahi hota', 'Idempotency keys ka storage aur cleanup (Stripe: 24 ghante baad prune)'],
    },
    { type: 'think', questions: [
      { q: 'xyz.com ka ek bada sale: ek hi merchant pe 5,000 payments per second. Ledger mein kya tootega aur kaise bachaoge?', a: 'Merchant ka "payable" account ek hi row hai, har payment use update karta hai: row lock contention (hot account). Ilaaj: us account ko N sub-accounts mein baanto (payment_id hash se ek chuno), balance = sab ka jod; ya ledger lines turant likho aur balance ko chhote batches mein aggregate karo. Ledger lines append-only hain, to unke INSERT parallel ho sakte hain; sirf balance row hot hai.' },
      { q: 'Riya ka app status check pe "PENDING" dekh raha hai aur 10 minute ho gaye. Riya dobara pay kar deti hai (nayi key). Ab kya ho sakta hai, aur product kaise sambhaale?', a: 'Agar pehla payment baad mein success nikla, to Riya ne do baar diya: dono alag keys, to idempotency nahi pakdegi (aur pakadna bhi nahi chahiye). Bachaav: order level pe check (ek order_7Kq ke liye sirf ek captured payment; doosra captured ho to auto-refund), UI mein "pehla payment abhi pending hai" warning, aur recon/auto-refund job jo ek order pe extra captured payments ko refund kare.' },
      { q: 'Kya Kafka ke "exactly-once" feature se humein idempotency keys ki zaroorat khatam ho jaati hai?', a: 'Nahi. Kafka ka exactly-once Kafka ke andar (produce → process → produce) kaam karta hai. Bank call, webhook, merchant ka DB, ye Kafka ke bahar hain. Wahan duplicates aa sakte hain (relay crash, consumer restart, webhook retry), isliye har side-effect pe apni idempotency chahiye. Razorpay ke 2026 blog ki agli plan bhi yahi hai: har message pe durable key aur consumer side dedupe.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Bank ko debit request bheji, 30 seconds mein jawab nahi aaya. Sahi kadam?', options: ['FAILED mark karo, user ko dobara pay karne bolo', 'Turant same debit dobara bhejo', 'PENDING rakho, baad mein status check karo', 'SUCCESS maan lo, zyada tar success hi hote hain'], answer: 2, explain: 'Timeout = unknown. Debit shayad ho chuka hai, to dobara debit = double charge ka risk; "success" maanna bhi galat. PENDING + status check (backoff aur limit ke saath).' },
      { q: 'Idempotency key ke saath aayi request ka pehla attempt 500 error se fail hua tha. Same key se retry pe Stripe kya karta hai?', options: ['Request dobara chalata hai', 'Wahi saved 500 response lautata hai', 'Key delete kar deta hai'], answer: 1, explain: 'Stripe ke docs: pehli request ka status code aur body save hota hai, chahe success ho ya failure, 500 bhi. (Validation fail ya concurrent conflict jaise cases mein result save nahi hota, wahan retry kar sakte ho.)' },
      { q: 'Ledger mein ek entry: debit ₹500, credit ₹450. Kya hona chahiye?', options: ['Accept, ₹50 ka fark baad mein dekhenge', 'Reject: har journal entry ka jod zero hona chahiye', 'Credit ko ₹500 kar do automatically'], answer: 1, explain: 'Double-entry ka core rule: debits = credits. Unbalanced entry ka matlab ₹50 kahin se "ban" gaya. Ledger use reject karta hai; galti sudhaarni ho to sahi balanced entry likho.' },
      { q: 'Purani galat ledger entry ko kaise theek karte hain?', options: ['UPDATE karke amount badal do', 'DELETE karke nayi daal do', 'Ek nayi reversal / correcting entry likho'], answer: 2, explain: 'Ledger append-only hai (Square ke Books aur Uber ke ledger dono mein). Correction ek nayi entry hai, taaki history aur audit trail bache.' },
      { q: 'UPI mein "collect" flow kya hai?', options: ['Payer khud VPA daal ke paisa bhejta hai', 'Payee request bhejta hai, payer approve karke PIN daalta hai', 'Bank automatically paisa kaat leta hai'], answer: 1, explain: 'Pull / collect: payee maangta hai, payer approve karta hai. Fraud ki wajah se NPCI ne 1 Oct 2025 se P2P collect band kiya; merchant collect chalta hai. Merchants ke liye intent flow zyada success deta hai.' },
      { q: 'Merchant ko ek hi webhook do baar mila (same event_id). Sahi handling?', options: ['Dono process karo', 'Pehli baar process, doosri baar sirf 2xx lautao', '4xx lautao taaki dobara na aaye'], answer: 1, explain: 'Webhooks at-least-once hain. event_id pe dedupe karo aur 2xx do, warna sender retry karta rahega.' },
    ]},
    { type: 'sources', note: 'Company-specific baatein inhi sources se. Razorpay, PhonePe aur Paytm apne poore internal architecture publicly nahi batate; jo hissa sources mein nahi tha wo lesson mein "industry mein aam taur pe" ke roop mein likha gaya hai.', items: [
      { title: 'Designing robust and predictable APIs with idempotency', publisher: 'Stripe blog (Brandur Leach)', url: 'https://stripe.com/blog/idempotency', year: 2017, official: true, used: 'Teen failure cases (pahuncha nahi / beech mein / jawab khoya), Idempotency-Key header, retries with exponential backoff aur jitter.' },
      { title: 'Idempotent requests (API reference)', publisher: 'Stripe docs', url: 'https://docs.stripe.com/api/idempotent_requests', year: 2026, official: true, used: 'V4 UUID suggestion, 255 chars, status code + body save (500 bhi), 24 ghante baad prune, parameter mismatch pe error, concurrent conflict ka result save nahi.' },
      { title: 'Five Years of Kafka at Razorpay’s UPI Switch', publisher: 'Razorpay Engineering', url: 'https://engineering.razorpay.com/tryst-with-kafka-2f5cef766c45', year: 2026, official: true, used: 'Razorpay ka UPI Switch (70%+ UPI volume), payment event fan-out, outbox + MSK Connector ka experience aur usse hataana, topic explosion, consumer idempotency key plan.' },
      { title: 'Payments: states and lifecycle', publisher: 'Razorpay docs', url: 'https://razorpay.com/docs/payments/payments/', year: 2026, official: true, used: 'created / authorized / captured / refunded / failed, 3 din mein capture nahi to auto-refund, late authorization.' },
      { title: 'Webhooks: best practices; validate and test', publisher: 'Razorpay docs', url: 'https://razorpay.com/docs/webhooks/best-practices/', year: 2026, official: true, used: 'At-least-once, x-razorpay-event-id se dedupe, order guarantee nahi, 5 sec timeout, 24 ghante exponential backoff, phir disable; X-Razorpay-Signature HMAC-SHA256 raw body pe.' },
      { title: 'Payout idempotency', publisher: 'Razorpay docs (RazorpayX)', url: 'https://razorpay.com/docs/api/x/payout-idempotency', year: 2026, official: true, used: 'Saved response replay; processing ke dauraan nayi key se retry na karne ki warning.' },
      { title: 'Payment gateway settlement process', publisher: 'Razorpay blog', url: 'https://razorpay.com/blog/pg-settlements-process', year: 2020, official: true, used: 'T+2 default settlement, settlement turant na hone ki wajah (bank timelines, reconciliation).' },
      { title: 'UPI Intent vs Collect success rates', publisher: 'Razorpay blog', url: 'https://razorpay.com/blog/upi-intent-vs-collect-success-rates/', year: 2026, official: true, used: 'Intent vs collect ka farak aur Razorpay ka claimed success rate gap.' },
      { title: 'UPI product overview (archived copy)', publisher: 'NPCI', url: 'https://web.archive.org/web/2023/https://www.npci.org.in/what-we-do/upi/product-overview', year: 2023, official: true, used: '2016 pilot (21 banks), participants (payer/payee PSP, remitter/beneficiary bank), push vs pull steps, virtual address, two-factor auth.' },
      { title: 'UPI OC No. 45: reduce deemed approved transactions', publisher: 'NPCI circular', url: 'https://www.npci.org.in/PDF/npci/upi/circular/2018/UPI%20OC%2045%20-%20Solutions%20to%20reduce%20deemed%20approved%20transaction.pdf', year: 2018, official: true, used: 'Debit ke baad credit leg, 3 Check Transaction messages, Credit Reversal Request, "deemed approved", 30 sec leg timeout.' },
      { title: 'UPI outage: NPCI directs banks to limit check transaction API usage', publisher: 'Inc42 (news report of NPCI circular)', url: 'https://inc42.com/buzz/upi-outage-npci-directs-banks-to-limit-check-transaction-api-usage/', year: 2025, used: 'April 2025 outages ka kaaran (status check overuse), 90 sec ke baad pehla check, max 3 in 2 hours, phir settlement files / UDIR.' },
      { title: 'NPCI to stop UPI P2P collect requests from Oct 1', publisher: 'The Week (PTI)', url: 'https://www.theweek.in/wire-updates/business/2025/08/14/dcm65-biz-npci-collect.html', year: 2025, used: '29 July 2025 circular: P2P collect 1 Oct 2025 se band, merchant collect jaari.' },
      { title: 'Harmonisation of TAT and customer compensation for failed transactions', publisher: 'Reserve Bank of India', url: 'https://www.rbi.org.in/scripts/NotificationUser.aspx?Id=11693', year: 2019, official: true, used: 'UPI: debit hua lekin credit nahi to T+1 (P2P) / T+5 (merchant) auto-reversal, ₹100/day compensation; "failed transaction" ki definition (timeout etc.).' },
      { title: 'Demystifying TStore: the backbone of billions of transactions at PhonePe', publisher: 'PhonePe Tech blog', url: 'https://tech.phonepe.com/demystifying-tstore-the-backbone-of-billions-of-transactions-at-phonepe/', year: 2024, official: true, used: '8,000+ TPS peak, PENDING (non-terminal) vs COMPLETED / ERRORED (terminal) states.' },
      { title: 'Books, an immutable double-entry accounting database service', publisher: 'Square (The Corner)', url: 'https://developer.squareup.com/blog/books-an-immutable-double-entry-accounting-database-service/', year: 2019, official: true, used: 'Journal entries ka jod zero, debit + / credit − convention, append-only, corrections as new entries, cached balances, Spanner.' },
      { title: 'Uber’s payments platform', publisher: 'Uber Engineering blog', url: 'https://www.uber.com/us/en/blog/ubers-payments-platform/', year: 2026, official: true, used: 'Money orders ka zero-sum rule, immutability, adjustments as new orders, strongly consistent balances, LedgerStore, Kafka + Cadence.' },
      { title: 'How Razorpay built real-time anomaly detection with Amazon MSK', publisher: 'AWS Big Data blog (AWS authors)', url: 'https://aws.amazon.com/blogs/big-data/how-razorpay-built-real-time-anomaly-detection-with-amazon-msk/', year: 2026, used: '500M+ monthly transactions, Kafka + Flink pe real-time anomaly / fraud detection.' },
      { title: 'Bmtc bus ticket in 2026 via UPI payment (photo)', publisher: 'Wikimedia Commons (Shaymmm, CC BY-SA 4.0)', url: 'https://commons.wikimedia.org/wiki/File:Bmtc_bus_ticket_in_2026_via_UPI_payment.jpg', year: 2026, used: 'UPI se diye ₹24 ke bus ticket ki photo.' },
    ]},
  ],
});
