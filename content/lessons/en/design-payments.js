Lesson.register({
  id: 'design-payments',
  title: 'Payments: UPI, Paytm, Razorpay',
  minutes: 45,
  summary: `Riya paid ₹499 for xyz.com Premium with UPI. The money must be taken once, never twice, and must never disappear, even if the network breaks halfway or the bank answers 2 minutes late. Idempotency keys, the payment state machine, the double-entry ledger, the real UPI flow (PSP → NPCI → banks), timeout = "unknown", the outbox, signed webhooks and daily reconciliation: one at a time, each one starting from a problem.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Riya presses "Pay ₹499" on her phone. The money must leave her bank account and reach xyz.com.<br>There are many computers in between, and the internet between them can break at any moment.<br>Our job: the money is taken <strong>only once</strong>, never twice, and it never disappears.<br>And if something goes wrong, every rupee must be accounted for, so the mistake can be found and fixed.<br>This lesson teaches exactly that: a payment system that keeps money correct even when things fail.` },
    { type: 'callout', tone: 'tip', title: 'Try it yourself first', html: `Think on paper for 10 minutes: Riya pressed "Pay ₹499". The request reached the bank, but the network broke before the answer came back. What should the app show now: "failed", "success", or something else? And if the app tries again, will ₹998 be taken? Then compare with this lesson.` },

    { type: 'p', html: `So far xyz.com has built videos, chat and search. Now xyz.com wants to sell <strong>Premium</strong>: ₹499 per month. xyz.com does not talk to banks directly. In between sits a <strong>payment gateway</strong>, like Razorpay. In this lesson we will design such a gateway. Let us call it <strong>xyzPay</strong>. We will also look at the UPI system that runs underneath it.` },
    { type: 'callout', tone: 'term', title: 'New word: merchant', html: `<strong>What it is:</strong> the one who <em>receives</em> the money. In this lesson the merchant is xyz.com.<br><strong>Why we need it:</strong> every payment has a payer (Riya) and a receiver (the merchant). The merchant's server gives Riya Premium once the money has surely arrived.<br><strong>Without it:</strong> nobody knows where the payment should go.` },
    { type: 'callout', tone: 'term', title: 'New word: UPI', html: `<strong>What it is:</strong> an Indian system that moves money from one bank account to another bank account instantly, straight from a phone. Instead of an account number, you use a short name (like <code>riya@okbank</code>) and a secret PIN.<br><strong>Why we need it:</strong> this is the biggest way people pay online in India, so xyz.com must support it.<br><strong>Without it:</strong> only cards would be left, and most people pay with UPI, not cards.<br>UPI is run by an organisation called <strong>NPCI</strong>. We will open up its full path in Deep dive 4.` },
    { type: 'callout', tone: 'term', title: 'New word: payment gateway (payment aggregator)', html: `<strong>What it is:</strong> a company that collects money for thousands of merchants through cards, UPI and net banking. A few days later it sends the money to the merchant's bank, after taking its fee. Examples: Razorpay, Cashfree, PayU, Stripe.<br><strong>Why we need it:</strong> every bank and every payment method has its own rules, security checks and connections. No single merchant can build all of that. The gateway builds it once, and all merchants use it.<br><strong>Without it:</strong> xyz.com would have to connect to dozens of banks itself, pass their audits, and handle every failure on its own.` },
    { type: 'callout', tone: 'term', title: 'New word: PSP (Payment Service Provider)', html: `<strong>What it is:</strong> in the UPI world, the bank through which a UPI app connects to the UPI network. Apps like PhonePe, Google Pay and Paytm work together with a PSP bank.<br><strong>Why we need it:</strong> only banks can join the UPI network directly. The bank (the PSP) carries the app's request forward.<br><strong>Without it:</strong> the UPI app would have no road into the network.<br>Every payment has two PSPs: the <strong>payer PSP</strong> (on the side of Riya, who pays) and the <strong>payee PSP</strong> (on the side of xyz.com, who receives).` },
    { type: 'p', html: `The real pain of payments in one line: <strong>money must never be lost and never be taken twice</strong>, even though the network breaks halfway and banks sometimes answer minutes later. In other systems, one mistake means one bad experience. Here, one mistake means someone's real money. So here <strong>correctness</strong> and <strong>auditability</strong> (an account of every rupee) matter more than speed.` },
    { type: 'callout', tone: 'warn', title: 'Limits of public sources', html: `Razorpay, PhonePe and Paytm do not publish their full internal designs. Everything company-specific in this lesson comes from their engineering blogs, official docs, NPCI circulars and RBI rules (see the sources below). Where there is no public information, we will clearly say "this is how the industry usually does it".` },

    { type: 'h2', text: 'Step 1: requirements' },
    { type: 'compare',
      left: { title: 'Functional', html: `• The merchant creates an order; the customer pays with UPI or a card<br>• Payment status: pending, success, failed<br>• Capture (taking the money for sure) and refund (full or partial)<br>• Webhook to the merchant: "the payment is done"<br>• Settlement to the merchant: in a few days, money goes to their bank after the fee<br>• Dashboard and reports<br><br><strong>Out of scope (awareness only):</strong> card network internals, fraud models, PCI DSS audit` },
      right: { title: 'Non-functional', html: `• <strong>Exactly-once effect</strong>: no double charge, even on retry<br>• No money "disappears": an account of every rupee (ledger)<br>• Strong consistency wherever money is (balance, state)<br>• High availability, but "pending" is better than a wrong answer<br>• An audit trail of every change (who, when, why)<br>• Latency: the user gets a result in a few seconds, but correctness comes first` },
    },
    { type: 'p', html: `Three heavy words from the non-functional list, in plain language:` },
    { type: 'list', items: [
      '<strong>Exactly-once effect</strong>: even if a request arrives 3 times (retries), the money is taken only 1 time. The request may arrive more than once; its <em>effect</em> happens only once.',
      '<strong>Strong consistency</strong>: as soon as a value is written, every server sees that new value. Nobody ever reads an old balance.',
      '<strong>Audit trail</strong>: a record of every change (what changed, when, who did it, why). Later, if someone asks "where did this ₹499 go?", there is an answer.',
    ]},

    { type: 'h2', text: 'Step 2: napkin maths' },
    { type: 'p', html: `Real numbers first: according to PhonePe's engineering blog (2024), at peak hours PhonePe processed <strong>8,000+ transactions per second</strong> (TPS: how many payments in one second). According to a 2026 AWS case study, Razorpay handles <strong>500 million+ transactions</strong> a month. For our xyzPay, play with "let us assume" numbers:` },
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
        el.querySelector('.pay-n-note').textContent = `We take one day ≈ 10^5 seconds. About 4 ledger rows per payment (2 for the payment, 2 for the fee), about 200 bytes per row, indexes not counted. The write volume is not small, but the real challenge is not QPS: every write must be correct and happen only once.`;
      };
      a.addEventListener('input', upd); b.addEventListener('input', upd); upd();
    }},
    { type: 'p', html: `(Indian number words: 1 lakh = 100,000 and 1 crore = 10 million.) With the default values (200 lakh = 20 million payments a day, peak 5x): about 200 TPS on average, about 1,000 TPS at peak, about 8 crore (80 million) ledger rows per day, about 5.8 TB per year. A good sharded SQL setup can handle this. So in payments the hard part is not <em>scale</em> but <em>correctness</em>. The rest of the lesson is about that.` },

    { type: 'h2', text: 'Step 3: API and core entities' },
    { type: 'p', html: `This API looks like public APIs such as Razorpay's and Stripe's (simplified). You do not need to understand every line yet. <code>Idempotency-Key</code>, webhooks and signatures will each be explained later. For now, just see who sends what to whom.` },
    { type: 'code', text: `
# 1. The merchant's server creates an order (server-to-server, with a secret key)
POST /v1/orders            { "amount": 49900, "currency": "INR", "receipt": "xyz_sub_881" }
  → 201 { "id": "order_7Kq", "status": "created" }       # amount in paise: 49900 = ₹499

# 2. Checkout (Riya's app) starts the payment
POST /v1/payments          Idempotency-Key: 3f9c1e52-...-a71b
  { "order_id": "order_7Kq", "method": "upi", "flow": "intent" }
  → 202 { "id": "pay_Q2x", "status": "pending" }          # 202: work has started, result comes later

# 3. Ask for the status (any time, any number of times: GET is idempotent)
GET  /v1/payments/pay_Q2x  → 200 { "status": "captured", "amount": 49900 }

# 4. Refund
POST /v1/payments/pay_Q2x/refunds   Idempotency-Key: 8a01...   { "amount": 19900 }

# 5. Webhook: xyzPay → xyz.com's server
POST https://xyz.com/hooks/pay      X-Signature: <HMAC-SHA256 of raw body>
  { "event": "payment.captured", "event_id": "evt_91", "payment_id": "pay_Q2x" }` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner mistake: money in a float', html: `Do not store ₹499.99 in a <code>float</code>: in a computer, 0.1 + 0.2 becomes 0.30000000000000004. In payments, the amount is always an <strong>integer in the smallest unit</strong> (paise): ₹499 = <code>49900</code>. Both Razorpay and Stripe do this in their APIs.` },
    { type: 'p', html: `Now the data. Some names in the table below (ledger, outbox, webhook) will feel new. Do not worry: each one is explained from zero in its own deep dive. For now, just notice that everything lives in one SQL database.` },
    { type: 'table', head: ['Entity', 'What it is', 'Where'], rows: [
      ['Order', 'The merchant\'s intent: "I want to collect this much money"', 'SQL'],
      ['Payment', 'One attempt: method, amount, <strong>state</strong>', 'SQL, with a state machine'],
      ['Refund', 'Full or partial money back on a captured payment', 'SQL, with its own state machine'],
      ['Idempotency key', '(merchant, key) → request hash + saved response', 'SQL, unique constraint'],
      ['Journal entry + ledger lines', 'An append-only record of every money movement', 'SQL, strongly consistent'],
      ['Outbox event', 'An event like "payment.captured happened", waiting to be published', 'Same SQL DB'],
      ['Webhook delivery', 'Which event went to which merchant, and how many tries', 'SQL / queue'],
    ]},
    { type: 'p', html: `Why put everything in SQL? Because here we need <a href="#/sql-vs-nosql">ACID transactions</a>: "change the payment state + write the ledger lines + write the outbox event" in one transaction, so either all of it happens or none of it. This is one place where we cannot work without strong consistency.` },

    { type: 'h2', text: 'Step 4: build the design from zero' },
    { type: 'p', html: `Before the diagram, let us add one part at a time. Each part arrives only when a problem asks for it.` },
    { type: 'p', html: `<strong>The simplest idea:</strong> Riya's app tells the bank directly, "take ₹499". Problem: the app runs on Riya's phone. Anyone can change the code on a phone and write ₹1, or put in someone else's account. Banks do not talk directly to unknown apps like that. So we need a trusted server in the middle.` },
    { type: 'callout', tone: 'term', title: 'New word: Payment API (xyzPay\'s server)', html: `<strong>What it is:</strong> xyzPay's servers that take every payment request: "create an order", "start a payment", "tell me the status", "make a refund".<br><strong>Why we need it:</strong> it checks that the request really comes from the merchant (with a secret key), that the amount is right, and whether this request has come before. Then it sends the work towards the bank.<br><strong>Without it:</strong> the app on the phone would decide everything, and anyone can tamper with that.<br><strong>Inside:</strong> it is <em>stateless</em>: it keeps no memory (state) of its own and writes everything to the database. So you can put as many servers as you like behind a <a href="#/load-balancer">load balancer</a>.` },
    { type: 'p', html: `<strong>Next problem:</strong> the server must remember what state each payment is in. Even if the server crashes, this memory must not be lost. And the money record must also be written somewhere.` },
    { type: 'callout', tone: 'term', title: 'New word: Payments DB (and DB transaction)', html: `<strong>What it is:</strong> a SQL database (like PostgreSQL or MySQL) that stores every payment, its state, the money record (ledger), and the events that must be sent out.<br><strong>Why we need it:</strong> a SQL database gives us a <strong>transaction</strong>: many writes in one packet. Either all of them happen, or none of them. In payments, "change the state + write the record" must never stop halfway.<br><strong>Without it:</strong> a server crash would leave half-done work. For example, the state says "paid" but there is no entry in the record. The money vanishes from the books.` },
    { type: 'p', html: `<strong>Next problem:</strong> the real money sits with the banks. Talking to banks and the UPI network has its own rules, its own message formats and its own security checks. We give this job to a separate part.` },
    { type: 'callout', tone: 'term', title: 'New word: UPI connector (bank connector)', html: `<strong>What it is:</strong> the part of xyzPay that talks to the outside world (NPCI and banks). It turns our language into their message format and brings their answers back.<br><strong>Why we need it:</strong> outside systems can be slow or may not answer at all. The connector puts a <strong>timeout</strong> on every call (if no answer comes within this time, stop waiting) and keeps a record of every answer.<br><strong>Without it:</strong> the Payment API's threads would get stuck waiting for the bank, and the bank's rules would be scattered all over the code.<br><strong>Real world:</strong> Razorpay has its own "UPI Switch" that does this job (according to their 2026 blog).` },
    { type: 'p', html: `<strong>Last problem:</strong> xyz.com's server must learn that the payment is surely done; only then will it give Riya Premium. We cannot trust what the app says (the app can be changed). So xyzPay itself tells xyz.com's server. This "telling" is called a <strong>webhook</strong> (fully covered in Deep dive 5). Now look at all four parts together.` },

    { type: 'h2', text: 'Step 5: high-level design' },
    { type: 'p', html: `First the straight road (the happy path), then a bad day. Click each box to read what it does.` },
    { type: 'flow', title: 'xyzPay: one UPI payment', height: 330,
      nodes: [
        { id: 'c', label: 'Riya\'s app', sub: 'xyz.com checkout', x: 95, y: 80, w: 150, kind: 'client', info: 'What it is: the xyz.com app on Riya\'s phone, with xyzPay\'s checkout (the pay screen) inside it. In this design it starts the payment and opens the UPI app. Money is never treated as final because the app says so, because an app on a phone can be changed.' },
        { id: 'm', label: 'xyz.com server', sub: 'merchant', x: 95, y: 250, w: 150, kind: 'client', info: 'What it is: the merchant\'s (xyz.com\'s) own server. It creates the order (with a secret API key) and listens for "the payment is done" through a webhook. It gives Riya Premium only after a server-side confirmation, not just because the app says so.' },
        { id: 'api', label: 'Payment API', sub: 'stateless, behind LB', x: 300, y: 165, w: 160, kind: 'server', info: 'What it is: xyzPay\'s front door, where every payment request arrives. In this design it checks that the request is real and whether it has come before (idempotency, later), changes the payment state, and gives work to the connector. It is stateless, so it scales by adding servers; all state lives in the DB.' },
        { id: 'conn', label: 'UPI connector', sub: 'PSP switch', x: 500, y: 70, w: 150, kind: 'server', info: 'What it is: the part of xyzPay that talks to banks and NPCI in their language. According to Razorpay\'s engineering blog, they have their own "UPI Switch" that processes real-time payments with NPCI. Every outside call has a timeout, and a timeout means "unknown", not "failed".' },
        { id: 'npci', label: 'NPCI + banks', sub: 'outside world', x: 640, y: 165, w: 130, kind: 'net', info: 'What it is: the outside world: NPCI (the organisation that runs UPI), Riya\'s bank (the money is taken from here) and the receiving bank. These are not under our control: they can be slow and can answer late. We open this box in Deep dive 4.' },
        { id: 'db', label: 'Payments DB', sub: 'SQL: state + ledger', x: 500, y: 270, w: 160, kind: 'data', info: 'What it is: xyzPay\'s SQL database, where each payment\'s state, the money record (ledger) and the events to send out (outbox) are kept. The state change + ledger lines + outbox event go in one transaction: all or nothing.' },
      ],
      edges: [{ a: 'c', b: 'api' }, { a: 'm', b: 'api' }, { a: 'api', b: 'conn' }, { a: 'conn', b: 'npci' }, { a: 'api', b: 'db' }],
      scenarios: [
        { name: 'Happy path', steps: [
          { title: 'The merchant creates an order', text: 'Riya pressed "Get Premium". xyz.com\'s server first creates an order in xyzPay. The server decides the amount, not the app (otherwise someone would type ₹1 in the app).', go: ['m>api', 'res:api>m'], msg: 'POST /v1/orders { amount: 49900 } → order_7Kq' },
          { title: 'The app starts the payment', text: 'Checkout sends the payment request with a new idempotency key.', go: 'c>api', msg: 'POST /v1/payments  Idempotency-Key: 3f9c...' },
          { title: 'Payment in the DB: CREATED', text: 'The payment row is written to the DB <strong>before</strong> anything is sent to the bank. If the server crashes now, there is still a record that an attempt started.', go: ['api>db', 'res:db>api'], after: { db: { sub: 'pay_Q2x: CREATED' } } },
          { title: 'The UPI request goes out', text: 'The connector sends the request towards NPCI. The state is now PENDING: we have told the outside world something.', go: 'api>conn>npci', after: { db: { sub: 'pay_Q2x: PENDING' } } },
          { title: 'Bank: success', text: 'Money was taken from Riya\'s bank and added to the receiving bank. The answer came back.', go: 'res:npci>conn>api' },
          { title: 'Three jobs in one transaction', text: 'State → CAPTURED, ledger lines (debit/credit), and a "payment.captured" event in the outbox. All three in one DB transaction.', go: ['api>db', 'res:db>api'], after: { db: { state: 'ok', sub: 'CAPTURED + ledger' } } },
          { title: 'Result to the app, webhook to the merchant', text: 'The app shows success. Separately, a webhook goes to xyz.com\'s server, and that server gives Riya Premium.', parallel: true, go: ['res:api>c', 'evt:api>m'], msg: 'webhook: payment.captured  pay_Q2x' },
        ]},
        { name: 'Slow bank: timeout', intro: 'The most dangerous case. Watch closely.', steps: [
          { title: 'The request went out', text: 'The payment is PENDING, and the request went towards NPCI.', go: 'c>api>conn>npci', after: { db: { sub: 'pay_Q2x: PENDING' } } },
          { title: 'No answer came', text: 'The connector\'s timeout ran out. Was the money taken? <strong>We do not know.</strong> Maybe the bank took the money and the answer is stuck on the way.', go: 'lost:npci>conn', set: { npci: { state: 'warn', sub: 'no answer' } } },
          { title: 'Wrong: say "failed" and charge again', text: 'If we mark it FAILED and tell Riya "please pay again", and the first debit had really happened, then <strong>₹998 is taken</strong>. That is why we never do this.', focus: ['conn'] },
          { title: 'Right: keep PENDING, tell the user the truth', text: 'The app shows "Payment processing, it will be confirmed in 2 minutes". The payment state stays PENDING.', go: 'res:api>c', after: { db: { state: 'warn', sub: 'PENDING (unknown)' } } },
          { title: 'Decide with a status check', text: 'After a while the connector sends no new debit, only a <strong>status check</strong>: "what happened to this transaction ID?" Answer: success. Now the state is CAPTURED. (If the answer had been "failed", it would become FAILED, and Riya could safely try again.)', go: ['conn>npci', 'res:npci>conn>api', 'api>db'], set: { npci: { state: '', sub: 'outside world' } }, after: { db: { state: 'ok', sub: 'CAPTURED' } } },
        ]},
      ],
    },
    { type: 'callout', tone: 'term', title: 'New words: authorize and capture', html: `<strong>What it is:</strong> two steps of a payment. <strong>Authorize</strong> = the bank said yes and put the money on hold. <strong>Capture</strong> = the merchant said "yes, now take this money for sure".<br><strong>Why we need it:</strong> sometimes the merchant must check something before taking the money for sure (for example, whether the item is in stock). With two steps, it can cancel without the trouble of a refund.<br><strong>Without it:</strong> every cancel would become a full refund, which is slow and costly.<br><strong>Example:</strong> according to Razorpay's docs, if an authorized payment is not captured within 3 days, the customer gets an automatic refund. In UPI the debit usually happens at once, so the gateway captures it automatically.` },

    { type: 'h2', text: 'Deep dive 1: idempotency keys (stopping double charges)' },
    { type: 'p', html: `We saw the basic idea in the <a href="#/pagination-idempotency">idempotency lesson</a>. In payments it is a matter of life and death. Problem: Riya's app sends <code>POST /v1/payments</code>, and no answer comes. The app cannot tell which of these three things happened:` },
    { type: 'list', ordered: true, items: [
      '<strong>The request never reached the server</strong> (the connection broke before it). A retry is completely safe.',
      '<strong>The server stopped the work halfway</strong> (a crash). The server must either undo everything or continue from that point.',
      '<strong>The work was done; only the answer was lost</strong>. If the retry charges again, that is a double charge.',
    ]},
    { type: 'p', html: `Stripe engineer Brandur Leach described these same three cases in a 2017 Stripe blog post, with this solution: the client creates a unique <strong>idempotency key</strong> for every new job, and sends the <strong>same</strong> key on every retry. The server sees the key and recognises that this is not new work but a retry of old work.` },
    { type: 'callout', tone: 'term', title: 'New word: idempotency key', html: `<strong>What it is:</strong> a long random name (like <code>3f9c1e52-...</code>) that the app creates once for every <em>new</em> payment, and sends with every attempt (retry) of that payment. Like a token number on a slip: same token = same job.<br><strong>Why we need it:</strong> the server must know whether the request is new or a retry of an old one. If the key is the same, the server does not take money again; it just sends the first answer again.<br><strong>Without it:</strong> every retry would become a new payment. The network broke once, the app sent again, and ₹998 was taken.<br><strong>What a retry is:</strong> sending the same request again when no answer comes. Good apps wait a little before retrying, longer each time (<em>exponential backoff</em>), with a small random difference (<em>jitter</em>), so that all phones do not retry at the same moment.` },
    { type: 'flow', title: 'Retry after a timeout: the server removes the duplicate', height: 300,
      nodes: [
        { id: 'app', label: 'Riya\'s app', sub: 'retries', x: 90, y: 150, w: 140, kind: 'client', info: 'What it is: the app running on Riya\'s phone. For every new payment it creates a new random key (like a UUID v4, a random ID of 36 characters) and saves it on the phone, so that even after an app restart the retry carries the same key.' },
        { id: 'api', label: 'Payment API', sub: 'idempotency layer', x: 310, y: 150, w: 160, kind: 'server', info: 'What it is: a small guard inside the Payment API. On every POST it checks the key first: if the key is new, do the work and save the result; if it is old and finished, return the saved result; if it is still running, return 409 (try again a bit later).' },
        { id: 'ik', label: 'Idempotency keys', sub: 'SQL, unique (merchant,key)', x: 555, y: 60, w: 190, kind: 'data', info: 'What it is: a table in the Payments DB that remembers the state of every key: merchant_id, key, request_hash (a fingerprint of the body), status (in_progress / done), response_code, response_body. There is a UNIQUE constraint on (merchant_id, key) (a DB rule that this pair cannot appear twice), so two servers cannot insert the same key at the same time.' },
        { id: 'bank', label: 'Bank / UPI', sub: 'money is taken here', x: 555, y: 240, w: 190, kind: 'net', info: 'What it is: the outside world, where money is really taken from Riya\'s account. Only one debit request (a request to take money) must reach it per payment, no matter how many times the client retries.' },
      ],
      edges: [{ a: 'app', b: 'api' }, { a: 'api', b: 'ik' }, { a: 'api', b: 'bank' }],
      scenarios: [
        { name: 'First request', steps: [
          { title: 'Request + key', text: 'The app sends the request with a new key.', go: 'app>api', msg: 'POST /v1/payments\nIdempotency-Key: 3f9c1e52-...\n{ order_id: order_7Kq }' },
          { title: 'Claim the key', text: 'The server does an <code>INSERT</code> (status = in_progress). Because of the unique constraint, only one request can "win" this key.', go: ['api>ik', 'res:ik>api'], after: { ik: { sub: '3f9c: in_progress' } } },
          { title: 'The real work', text: 'One debit request to the bank.', go: ['api>bank', 'res:bank>api'] },
          { title: 'Save the result, then answer', text: 'The response (status code + body) is saved with the key: status = done.', go: ['api>ik', 'res:api>app'], after: { ik: { state: 'ok', sub: '3f9c: done → pay_Q2x' } }, msg: '202 { id: pay_Q2x, status: pending }' },
        ]},
        { name: 'Answer lost, retry', intro: 'Case 3: the work was done; only the answer got lost on the way.', steps: [
          { title: 'The work is done...', text: 'The first request ran fully, and the key is done.', go: ['app>api', 'api>bank', 'res:bank>api'], after: { ik: { state: 'ok', sub: '3f9c: done → pay_Q2x' } } },
          { title: '...but the answer is lost', text: 'Riya\'s mobile network broke. The app got nothing.', go: 'lost:api>app', set: { app: { state: 'warn', sub: 'timeout!' } } },
          { title: 'Retry with the same key', text: 'The app waits a little (exponential backoff + jitter) and sends again, with the <strong>same key</strong>.', go: 'app>api', msg: 'POST /v1/payments\nIdempotency-Key: 3f9c1e52-...  (same)' },
          { title: 'The key is already done', text: 'The server found the key with status done. Nothing was sent to the bank again.', go: ['api>ik', 'res:ik>api'], set: { bank: { state: 'dim' } }, focus: ['ik'] },
          { title: 'The saved answer goes back', text: 'The same old response, byte for byte. Riya was charged only once.', go: 'res:api>app', set: { app: { state: 'ok', sub: 'pay_Q2x' } }, msg: '202 { id: pay_Q2x, status: pending }   (replayed)' },
        ]},
        { name: 'Double click (concurrent)', intro: 'In a hurry, Riya pressed "Pay" twice, or two retries went out at the same time.', steps: [
          { title: 'Two requests, same key', text: 'Both arrived at almost the same time.', flood: { paths: ['app>api'], n: 2 } },
          { title: 'Only one won', text: 'The first INSERT succeeded. The second INSERT failed on the unique constraint: the key is "in_progress".', go: ['api>ik', 'bad:ik>api'], after: { ik: { state: 'hot', sub: '3f9c: in_progress' } } },
          { title: '409 for the second one', text: 'The second request gets "still running, ask again a little later". Only one debit reached the bank. Stripe\'s docs also say that the result of such a conflicting concurrent request is not saved, so you can retry it later.', go: 'bad:api>app', msg: '409 Conflict: request with this key is in progress' },
        ]},
        { name: 'Same key, different amount', intro: 'A bug: the client mistakenly put an old key on a new payment.', steps: [
          { title: 'Old key, new body', text: 'Key 3f9c was used earlier for ₹499. Now it comes with ₹999.', go: 'app>api', msg: 'Idempotency-Key: 3f9c...  { amount: 99900 }' },
          { title: 'The hash does not match', text: 'The server compared the hash of the request body (a short fingerprint of the body: change the body and the hash changes) with the saved hash: they differ. Returning the old result would be wrong, and creating a new payment would also be wrong.', go: ['api>ik', 'bad:ik>api'] },
          { title: 'Error', text: 'A clear error. Stripe also compares incoming parameters with the original and returns an error on a mismatch.', go: 'bad:api>app', msg: '422: idempotency key reused with different parameters' },
        ]},
      ],
    },
    { type: 'code', text: `
-- Idempotency layer, simplified (SQL)
BEGIN;
INSERT INTO idempotency_keys (merchant_id, key, request_hash, status)
VALUES ($m, $k, $hash, 'in_progress')
ON CONFLICT (merchant_id, key) DO NOTHING;        -- 0 rows? the key already exists
COMMIT;

-- 0 rows inserted:
--   status = 'done' and same hash  → return saved response_code + response_body
--   status = 'in_progress'         → 409, the client retries later
--   different hash                 → 422, this is a bug
-- 1 row inserted: do the real work, then UPDATE status='done', response=...` },
    { type: 'p', html: `Some practical details from Stripe's public docs: the client creates the key (they suggest a V4 UUID), up to 255 characters long; the status code and body of the first request are saved, whether it was a success or a failure (even a 500); and keys can be removed after at least 24 hours. Razorpay's payouts API also takes an idempotency key header and returns the saved response of the first request. Their docs warn clearly: if the first attempt is still <em>processing</em>, do not retry with a <strong>new</strong> key, or a duplicate payout may be created.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner mistake', html: `<strong>"The server will create the key itself."</strong> No: to recognise a retry, the key must be with the <em>client</em>, before the first request. <br><strong>"Same user + same amount = duplicate, so block it."</strong> No: Riya may really pay ₹499 twice (two different things). A duplicate is only a request with the same key.<br><strong>"Idempotency is only needed at the API."</strong> No: every place where retries happen (Kafka consumers, webhook handlers, the bank connector) also needs to remove duplicates. You will see this later.` },

    { type: 'h2', text: 'Deep dive 2: a payment is a state machine' },
    { type: 'p', html: `Problem: a payment has a <code>status</code> column, and code in many places changes it: the bank's answer, the merchant's capture, the refund API, a late webhook. Without rules, strange things happen: a refund on a FAILED payment (the money was never taken, yet we gave it back!), or a REFUNDED payment becoming CAPTURED again. Solution: make the payment a <strong>state machine</strong>: a few fixed states, and only allowed transitions.` },
    { type: 'callout', tone: 'term', title: 'New word: state machine', html: `<strong>What it is:</strong> a thing that can be in only one <strong>state</strong> (condition) at a time, and can move to the next state only through agreed <strong>events</strong>. Like a traffic light: green → yellow → red → green. Never straight from red to yellow. Changing state is called a <strong>transition</strong>.<br><strong>Why we need it:</strong> code in many places changes a payment's state. One fixed list of allowed transitions makes all of them follow the same rule.<br><strong>Without it:</strong> strange mistakes: a refund on a FAILED payment, or a REFUNDED payment becoming CAPTURED again. Every mistake = someone's real money.` },
    { type: 'p', html: `Razorpay's docs list five states: <strong>created</strong> (details arrived, not processed yet), <strong>authorized</strong> (the bank verified and took or held the money), <strong>captured</strong> (final; the merchant gets it on the settlement schedule), <strong>refunded</strong> and <strong>failed</strong>. The roadmap adds two more: <strong>pending</strong> (the request went out, no answer yet) and <strong>settled</strong> (the money reached the merchant's bank). PhonePe's engineering blog (2024) also shows a transaction tracked as PENDING (non-terminal) and COMPLETED / ERRORED (terminal) states. Press the events below and watch wrong transitions get rejected:` },
    { type: 'custom', render(el) {
      const ST = ['CREATED', 'PENDING', 'AUTHORIZED', 'CAPTURED', 'SETTLED', 'FAILED', 'REFUNDED'];
      const EV = [
        ['send', 'Send to bank', { CREATED: 'PENDING' }],
        ['ok', 'Bank: success', { PENDING: 'AUTHORIZED' }],
        ['decline', 'Bank: declined', { PENDING: 'FAILED' }],
        ['timeout', 'Timeout (no answer)', { PENDING: 'PENDING' }],
        ['capture', 'Capture', { AUTHORIZED: 'CAPTURED' }],
        ['expire', '3 days, no capture', { AUTHORIZED: 'REFUNDED' }],
        ['settle', 'Settle to merchant', { CAPTURED: 'SETTLED' }],
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
          const why = TERMINAL[cur] ? `${cur} is a terminal state; there is no road out of it.` : `"${ev[1]}" is not allowed from ${cur}.`;
          log.unshift([`✗ ${ev[1]}: ${cur} → ?  REJECTED`, 1]);
          draw(`Rejected. ${why} In the DB: UPDATE ... WHERE state IN (${Object.keys(ev[2]).join(', ')}) → 0 rows.`, true);
          return;
        }
        acc++;
        const from = cur; cur = to;
        log.unshift([`✓ ${ev[1]}: ${from} → ${to}`, 0]);
        draw(ev[0] === 'timeout' ? 'A timeout does not mean FAILED. The state stayed PENDING; a status check will decide.' : `OK: ${from} → ${to}.`, false);
      };
      EV.forEach(ev => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small'; b.textContent = ev[1]; b.onclick = () => fire(ev); bt.appendChild(b); });
      const r = document.createElement('button'); r.type = 'button'; r.className = 'btn small ghost'; r.textContent = 'Reset';
      const reset = () => { cur = 'CREATED'; acc = 0; rej = 0; log = []; draw('New payment: CREATED. Press any event. Try pressing "Refund" first (it will be rejected).', false); };
      r.onclick = reset; bt.appendChild(r); reset();
    }},
    { type: 'p', html: `How is this rule enforced inside the DB? With a <strong>conditional update</strong> (compare-and-set). If "capture" and "expire" arrive at the same time from two places, only one wins, because the WHERE condition will not match for the other:` },
    { type: 'code', text: `
UPDATE payments SET state = 'CAPTURED', updated_at = now()
WHERE id = 'pay_Q2x' AND state = 'AUTHORIZED';
-- 1 row  → the transition happened. In the same transaction, write ledger lines + outbox event.
-- 0 rows → someone else changed it first, or the transition is not allowed. Do nothing.` },
    { type: 'list', items: [
      '<strong>Terminal states</strong> (FAILED, REFUNDED) have no road forward. A partial refund is kept as a separate state like PARTIALLY_REFUNDED, and a refund has its own small state machine (created → processed / failed).',
      '<strong>Every transition also writes a history row</strong> (who, when, from which event). This helps both audit and debugging.',
      '<strong>Late answer</strong>: if we wrongly marked a PENDING payment as FAILED and the bank\'s "success" arrives later, the state machine will reject it, and the money stays taken. That is why a timeout means PENDING, not FAILED. Razorpay\'s docs call this situation a "late authorization": because of a network or bank problem, the payment result is known late.',
    ]},
    { type: 'p', html: `In big systems this state machine often runs inside a <a href="#/distributed-tx">workflow engine</a> (Temporal, Cadence), so that timers like "check the status after 5 minutes" and retries are not lost even after a crash. According to Uber's payments platform post, they use their workflow engine Cadence for payments made while the user is in the session.` },

    { type: 'h2', text: 'Deep dive 3: the double-entry ledger (an account of every rupee)' },
    { type: 'p', html: `Problem: the simplest design is one <code>balance</code> column per merchant, and on every payment <code>balance = balance + 499</code>. One day the finance team asks: "Why is xyz.com's balance ₹12,340?" There is no answer, because the column only knows the number <em>now</em>, not <em>why</em>. And if a bug once made a wrong update, that money silently "appeared" or "vanished", and nobody would ever know.` },
    { type: 'callout', tone: 'term', title: 'New words: ledger, double-entry, debit, credit', html: `<strong>What it is:</strong> a <strong>ledger</strong> = an account book, with one entry for every money movement. <strong>Double-entry</strong> = every movement touches at least two <strong>accounts</strong>: money left one (a <strong>credit</strong>) and went into another (a <strong>debit</strong>). Total debits = total credits.<br><strong>Why we need it:</strong> money is never created and never destroyed; it only moves from one account to another. If the totals ever do not match, we know at once that there is a bug somewhere. And the "why" of every balance is written in the entries.<br><strong>Without it:</strong> just one balance number with no history. If a bug created or destroyed money, nobody would find out.<br>This accounting method is more than 500 years old, and it is just as useful in software.` },
    { type: 'p', html: `In 2019, Square wrote about their ledger database <strong>Books</strong>: every "journal entry" must add up to zero; every cent that went down somewhere went up somewhere else. Their convention: write a debit as <strong>+</strong> and a credit as <strong>−</strong>; plus means "we have this / we are owed this", minus means "we owe this". Uber's payments platform post (2026) has the same rule: the entries of every "money order" add up to zero, and no money can ever be created or destroyed. Now try it yourself. This is xyzPay's book, with four accounts:` },
    { type: 'custom', render(el) {
      const AC = [['CLR', 'UPI clearing', 'to come from banks/NPCI'], ['MER', 'xyz.com payable', 'owed to the merchant'], ['FEE', 'Fee revenue', 'what xyzPay earns'], ['ESC', 'Escrow cash', 'real money in the bank']];
      const PRE = [
        ['Payment ₹499', 'Riya\'s UPI payment captured', 'CLR', 'MER', 499],
        ['Fee ₹10', 'xyzPay\'s fee, from the merchant\'s share', 'MER', 'FEE', 10],
        ['Refund ₹199', 'Partial refund to Riya', 'MER', 'CLR', 199],
        ['Bank settle ₹300', 'Clearing money arrived in escrow', 'ESC', 'CLR', 300],
        ['Payout ₹290', 'Sent to xyz.com\'s bank', 'MER', 'ESC', 290],
      ];
      const opts = AC.map(a => `<option value="${a[0]}">${a[1]}</option>`).join('');
      el.innerHTML = `<div class="pay-lg-pre" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px"></div>
        <div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:10px;margin-bottom:10px">
          <div style="font-size:13px;color:var(--ink-2);margin-bottom:6px">Write your own entry (try: debit 500, credit 450)</div>
          <div class="row2">
            <div><label>Debit (+) account</label><select class="pay-lg-da">${opts}</select></div>
            <div><label>Debit amount ₹</label><input class="pay-lg-dv" type="number" value="500" min="1" step="1"></div>
            <div><label>Credit (−) account</label><select class="pay-lg-ca">${opts}</select></div>
            <div><label>Credit amount ₹</label><input class="pay-lg-cv" type="number" value="450" min="1" step="1"></div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px"><button type="button" class="btn small primary pay-lg-post">Post entry</button><button type="button" class="btn small pay-lg-rev">Reverse the last entry</button><button type="button" class="btn small ghost pay-lg-reset">Reset</button></div>
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
          `<div class="stat"><span>Total of all accounts</span><strong style="color:${sum === 0 ? 'var(--green)' : 'var(--red)'}">${fmt(sum)} ${sum === 0 ? '✓' : '✗'}</strong></div>`;
        const m = el.querySelector('.pay-lg-msg'); m.textContent = msg; m.style.color = bad ? 'var(--red)' : 'var(--ink-2)';
        el.querySelector('.pay-lg-log').innerHTML = J.length ? J.slice().reverse().map(j => `<div>J${j.id} ${j.desc}: ${j.lines.map(l => `${l[0]} ${l[1] > 0 ? '+' : '−'}${Math.abs(l[1])}`).join(', ')}</div>`).join('') : 'The journal is empty.';
      };
      const post = (desc, dr, cr, dv, cv) => {
        if (!(Number.isInteger(dv) && Number.isInteger(cv)) || dv <= 0 || cv <= 0) { msg = 'Rejected: the amount must be a positive whole number of rupees.'; bad = true; return draw(); }
        if (dr === cr) { msg = 'Rejected: debit and credit on the same account? The money did not go anywhere.'; bad = true; return draw(); }
        if (dv !== cv) { msg = `Rejected: unbalanced entry. Debit ₹${dv} ≠ credit ₹${cv}. Where did ₹${Math.abs(dv - cv)} come from / go to? A ledger never accepts such an entry.`; bad = true; return draw(); }
        J.push({ id: J.length + 1, desc, lines: [[dr, dv], [cr, -cv]] });
        msg = `Posted: ${name(dr)} +₹${dv}, ${name(cr)} −₹${cv}. The entry adds up to 0.`; bad = false; draw();
      };
      PRE.forEach(p => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small'; b.textContent = p[0]; b.title = p[1]; b.onclick = () => post(p[1], p[2], p[3], p[4], p[4]); el.querySelector('.pay-lg-pre').appendChild(b); });
      el.querySelector('.pay-lg-post').onclick = () => post('Custom entry', el.querySelector('.pay-lg-da').value, el.querySelector('.pay-lg-ca').value, Number(el.querySelector('.pay-lg-dv').value), Number(el.querySelector('.pay-lg-cv').value));
      el.querySelector('.pay-lg-rev').onclick = () => {
        const last = J.slice().reverse().find(j => !j.reversed && !j.rev);
        if (!last) { msg = 'Nothing to reverse.'; bad = true; return draw(); }
        last.reversed = true;
        J.push({ id: J.length + 1, rev: true, desc: `Reversal of J${last.id}`, lines: last.lines.map(l => [l[0], -l[1]]) });
        msg = `J${last.id} was not deleted. A new opposite entry was written. The full history is kept.`; bad = false; draw();
      };
      el.querySelector('.pay-lg-reset').onclick = () => { J = []; msg = 'Press the buttons above one by one: Payment → Fee → Refund → Bank settle → Payout.'; bad = false; draw(); };
      el.querySelector('.pay-lg-reset').onclick();
    }},
    { type: 'p', html: `Press all five buttons in order, and at the end: clearing is <strong>0</strong> (the bank paid what it owed), xyz.com payable is <strong>0</strong> (the merchant received its ₹290: 499 − 10 fee − 199 refund), escrow has <strong>+₹10</strong> and fee revenue has <strong>−₹10</strong>. That ₹10 is xyzPay's earning. And at every step the total stayed zero. Did you try an unbalanced entry? It was rejected. Need to fix a mistake? The old entry is not deleted; an opposite entry is written.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner mistake: "why is the earning negative?"', html: `Seeing fee revenue at −₹10 looks like a loss. It is not: in this convention, minus means "where this value came from" (the source). The money is +₹10 in escrow, and its source is fee revenue. Square's engineers also wrote that understanding the meaning of these signs was the least intuitive part, and it became clear only with practice. For interviews, just remember: <strong>every entry adds up to zero, and all accounts together always add up to zero</strong>.` },
    { type: 'h3', text: 'How to keep the ledger in a database' },
    { type: 'code', text: `
accounts        (id, owner, type, currency, balance, version)   -- balance = cached sum
journal_entries (id, created_at, reason, payment_id, idempotency_key UNIQUE)
ledger_lines    (journal_id, account_id, amount)                -- +debit / -credit

-- Every posting is one DB transaction:
--   1. 1 row in journal_entries, 2+ rows in ledger_lines
--   2. CHECK: SUM(amount) per journal = 0, else ROLLBACK
--   3. update accounts.balance (version+1, optimistic lock)
-- Never UPDATE / DELETE ledger_lines: INSERT only (append-only)` },
    { type: 'list', items: [
      '<strong>Append-only and immutable</strong>: in Square\'s Books, journal and book entries are only INSERTed, never updated. A mistake gets a new correcting entry. This turns the whole history into an audit log. Uber also makes adjustments (a trip changed, an item was missing) by writing new money orders.',
      '<strong>A strongly consistent store</strong>: Square chose Google Cloud Spanner (2019); Uber uses a store with strongly consistent reads for ledger balances, and built its own immutable LedgerStore. Eventual consistency will not work here: two servers must never see the same balance differently.',
      '<strong>Balance = cached sum</strong>: adding up millions of rows every time to get a balance is costly. So each account keeps a running balance, updated in the same transaction. Square wrote the same: the payout amount comes from one row, not from a big GROUP BY.',
      '<strong>Hot account</strong>: one big merchant, thousands of payments every second, all on one balance row. This row becomes a lock bottleneck. The usual cure: split the account into many sub-accounts (balance = the sum of all of them), or write the lines and update the balance in batches. (See the <a href="#/pattern-contention">contention pattern</a>.)',
    ]},

    { type: 'h2', text: 'Deep dive 4: how UPI works inside' },
    { type: 'p', html: `So far, "NPCI + banks" was one closed box. Let us open it. UPI (Unified Payments Interface) is run by <strong>NPCI</strong> (National Payments Corporation of India). According to NPCI's product overview page (an archived copy from 2023), its pilot launched on 11 April 2016 with 21 banks. The idea: many bank accounts in one mobile app, instant transfers 24x7, and a simple <strong>virtual address</strong> instead of an account number and IFSC code.` },
    { type: 'callout', tone: 'term', title: 'New word: NPCI UPI switch', html: `<strong>What it is:</strong> NPCI's central computer system that every UPI payment passes through. Like a big telephone exchange: every bank connects only to it, and it carries each message to the right bank.<br><strong>Why we need it:</strong> India has more than a hundred banks. If every bank connected separately to every other bank, there would be thousands of connections. With one switch in the middle, each bank needs only one connection.<br><strong>Without it:</strong> every bank would have to connect to every bank, and a question like "which account is riya@okbank?" could not be answered in one place.` },
    { type: 'callout', tone: 'term', title: 'New words: the other UPI roles', html: `<strong>VPA (Virtual Payment Address) / UPI ID:</strong> like <code>riya@okbank</code>. A name linked to a bank account, without revealing the account number.<br><strong>UPI PIN:</strong> Riya's secret number. It travels to her bank in encrypted form (locked), and only that bank checks it. The app and xyzPay cannot read it.<br><strong>Payer PSP:</strong> the PSP bank through which Riya's UPI app works. <strong>Payee PSP:</strong> the PSP on the side of the receiver (xyz.com / xyzPay).<br><strong>Remitter bank:</strong> the bank whose account the money is <em>taken from</em> (Riya's bank). <strong>Beneficiary bank:</strong> the bank where the money is <em>added</em>.<br>NPCI's overview lists the participants with these same names: Payer PSP, Payee PSP, Remitter Bank, Beneficiary Bank, NPCI, account holders and merchants.` },
    { type: 'image', src: 'assets/img/design-payments/bmtc-upi-ticket.jpg', maxWidth: 320, alt: 'A ticket from a BMTC city bus in Bengaluru that says Total ₹24.00 (UPI)', caption: 'UPI is now used even for the smallest payments: a ₹24 city bus ticket in Bengaluru (2026), paid with UPI. That is why the UPI system has to handle thousands of small payments every second.', credit: { text: 'Shaymmm, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Bmtc_bus_ticket_in_2026_via_UPI_payment.jpg', license: 'CC BY-SA 4.0' } },
    { type: 'h3', text: 'Push (pay), pull (collect) and intent' },
    { type: 'table', head: ['', 'Push / Pay', 'Pull / Collect', 'Intent (merchant checkout)'], rows: [
      ['Who starts it', 'The payer: "send ₹499 to xyz@xyzbank"', 'The payee: "Riya, pay ₹499" (sends a request)', 'The merchant\'s checkout opens the payer\'s UPI app, with all details filled in'],
      ['What Riya must do', 'VPA/QR, amount, PIN', 'Open the notification, approve, PIN', 'Only the PIN'],
      ['Where it goes wrong', 'Typing a wrong VPA', 'Late or missed notification, app switching, fraud ("enter your PIN to receive money")', 'Only on mobile, where a UPI app is installed'],
    ]},
    { type: 'p', html: `The biggest danger of collect was fraud: people entered their PIN to "receive money", while a PIN is always for <em>giving</em> money. So NPCI, in a circular of 29 July 2025, said that <strong>P2P (person-to-person) collect stops from 1 October 2025</strong>; merchant collect continues (according to news reports). According to a 2026 Razorpay blog, intent has a much higher success rate than collect on their platform (their claim: 92-95%, with collect 6-15 points lower), because both the mistake of typing a VPA and the wait for a notification disappear.` },
    { type: 'flow', title: 'UPI merchant payment: PSP → NPCI → banks', height: 350,
      nodes: [
        { id: 'app', label: 'Riya\'s UPI app', sub: 'PhonePe / GPay / Paytm', x: 95, y: 90, w: 160, kind: 'client', info: 'What it is: the UPI app on Riya\'s phone (PhonePe, GPay, Paytm). Device binding (the app works only with that SIM + phone) and the UPI PIN: according to NPCI\'s overview, "single click two-factor authentication". The app does not hold money; it only creates the request.' },
        { id: 'ppsp', label: 'Payer PSP', sub: 'the app\'s PSP bank', x: 95, y: 270, w: 160, kind: 'server', info: 'What it is: the PSP bank on the side of Riya\'s app. It carries the app\'s messages to NPCI and brings the answers back. It also sends status checks.' },
        { id: 'npci', label: 'NPCI UPI switch', sub: 'central router', x: 335, y: 180, w: 160, kind: 'net', info: 'What it is: NPCI\'s central router. Every UPI transaction passes through here. It gets the payee\'s VPA resolved, sends the debit request to the remitter bank and the credit request to the beneficiary bank, and tracks both answers. Each leg has its own timeout.' },
        { id: 'rem', label: 'Remitter bank', sub: 'Riya\'s bank: debit', x: 590, y: 60, w: 170, kind: 'data', info: 'What it is: Riya\'s bank. It verifies the UPI PIN and takes the money from her account (debit). Its core banking system (CBS: the bank\'s main computer that holds every account balance) holds the real balance.' },
        { id: 'ben', label: 'Beneficiary bank', sub: 'money added here', x: 590, y: 180, w: 170, kind: 'data', info: 'What it is: the bank whose account receives the money (credit): for merchant payments, the gateway\'s partner bank / escrow side. If it does not answer in time, the transaction becomes "unknown".' },
        { id: 'gw', label: 'xyzPay', sub: 'payee PSP + gateway', x: 590, y: 300, w: 170, kind: 'server', info: 'What it is: the PSP/gateway on the merchant\'s (xyz.com\'s) side, which is us. Razorpay has its own UPI Switch that processes real-time payments with NPCI (according to their 2026 blog, 70%+ of Razorpay\'s UPI volume goes through it). It creates the intent link, sends collect requests, and runs the payment state machine from the final status.' },
      ],
      edges: [{ a: 'app', b: 'ppsp' }, { a: 'ppsp', b: 'npci' }, { a: 'npci', b: 'rem' }, { a: 'npci', b: 'ben' }, { a: 'npci', b: 'gw' }],
      scenarios: [
        { name: 'Intent (pay)', steps: [
          { title: 'Intent link', text: 'xyzPay\'s checkout creates a UPI link with the payee VPA, the amount and a transaction reference. Riya\'s UPI app opens on the phone with everything filled in. This happens inside the phone, not over the network.', focus: ['app', 'gw'], msg: 'upi://pay?pa=xyz@xyzbank&pn=xyz.com&am=499.00&tr=pay_Q2x' },
          { title: 'PIN entered, request sent', text: 'Riya entered her PIN. The encrypted request goes from the payer PSP to NPCI.', go: 'app>ppsp>npci', msg: 'Pay: riya@okbank → xyz@xyzbank  ₹499  ref pay_Q2x' },
          { title: 'Resolve the payee VPA', text: 'NPCI asks the payee PSP which account xyz@xyzbank is linked to.', go: ['npci>gw', 'res:gw>npci'] },
          { title: 'Debit leg', text: 'The remitter bank checks the PIN and takes ₹499 from Riya\'s account.', go: ['npci>rem', 'res:rem>npci'], after: { rem: { state: 'ok', sub: 'debited ₹499' } } },
          { title: 'Credit leg', text: 'Only after the debit does the beneficiary bank get the credit request. The money is added.', go: ['npci>ben', 'res:ben>npci'], after: { ben: { state: 'ok', sub: 'credited ₹499' } } },
          { title: 'Result to everyone', text: 'Riya\'s app gets success, and so does the payee PSP (xyzPay). xyzPay marks the payment CAPTURED (state machine + ledger + outbox, in one transaction).', parallel: true, go: ['res:npci>ppsp>app', 'res:npci>gw'], after: { gw: { state: 'ok', sub: 'pay_Q2x: CAPTURED' } } },
        ]},
        { name: 'Collect (pull)', steps: [
          { title: 'Riya types her VPA', text: 'At checkout, Riya typed <code>riya@okbank</code>. xyzPay sends a collect request.', go: 'gw>npci>ppsp>app', msg: 'Collect: xyz.com requests ₹499 from riya@okbank' },
          { title: 'Waiting for the notification', text: 'Riya gets a notification on her phone. She must open the UPI app and look at the request. This is where people drop off: the notification is late, or Riya never saw it.', focus: ['app'], set: { app: { state: 'warn', sub: 'approve?' } } },
          { title: 'Approve + PIN', text: 'Riya approved and entered her PIN.', go: 'app>ppsp>npci', set: { app: { state: '', sub: 'PhonePe / GPay / Paytm' } } },
          { title: 'Debit, then credit', text: 'The same two legs.', go: ['npci>rem', 'res:rem>npci', 'npci>ben', 'res:ben>npci'], after: { rem: { state: 'ok', sub: 'debited ₹499' }, ben: { state: 'ok', sub: 'credited ₹499' } } },
          { title: 'Result', text: 'Success on both sides.', parallel: true, go: ['res:npci>ppsp>app', 'res:npci>gw'], after: { gw: { state: 'ok', sub: 'pay_Q2x: CAPTURED' } } },
        ]},
        { name: 'Timeout: status unknown', intro: 'The money was taken, but the answer for the credit did not come. What now?', steps: [
          { title: 'The debit is done', text: 'Pay request; the debit leg succeeded.', go: ['app>ppsp>npci', 'npci>rem', 'res:rem>npci'], after: { rem: { state: 'ok', sub: 'debited ₹499' } } },
          { title: 'The credit answer is lost', text: 'The beneficiary bank\'s core system is slow. According to NPCI\'s 2018 circular (OC 45), the timeout of the credit leg is 30 seconds.', go: 'lost:npci>ben', set: { ben: { state: 'warn', sub: 'no answer' } } },
          { title: 'NPCI asks by itself', text: 'The same circular: if no answer comes, NPCI sends up to 3 <strong>Check Transaction</strong> messages to the beneficiary bank, then a <strong>Credit Reversal Request</strong>. If there is still no clear answer, the transaction is treated as <strong>"deemed approved"</strong>: it could not be known online, and the banks settle it later through settlement files and the dispute process.', go: ['npci>ben', 'lost:ben>npci'] },
          { title: 'xyzPay: PENDING, NO retry', text: 'xyzPay saw no clear answer. The payment is PENDING. Riya sees "processing". <strong>A new debit is never sent</strong>: Riya\'s money may already have been taken.', go: 'res:npci>ppsp>app', set: { gw: { state: 'warn', sub: 'pay_Q2x: PENDING' }, app: { state: 'warn', sub: 'processing...' } } },
          { title: 'Status check (not a debit)', text: 'After some time xyzPay only asks for the status: "what happened to ref pay_Q2x?" NPCI\'s April 2025 rules (according to news reports): the first check 90 seconds after the original transaction, and at most 3 within 2 hours. By now the beneficiary bank had confirmed the credit: success.', go: ['gw>npci', 'res:npci>gw'], set: { ben: { state: 'ok', sub: 'credited (late)' } }, after: { gw: { state: 'ok', sub: 'pay_Q2x: CAPTURED' } } },
          { title: 'What if it fails in the end?', text: 'If the credit really did not happen and the debit had happened, the money must go back. According to RBI\'s 2019 TAT circular, for a UPI merchant payment such a debit must be reversed automatically within T+5 days (T+1 for a P2P transfer); otherwise the bank must pay the customer ₹100 per day as compensation.', focus: ['rem'] },
        ]},
        { name: 'Status-check storm (2025)', intro: 'A real incident: retries themselves caused an outage.', steps: [
          { title: 'All PSPs ask again and again', text: 'For pending transactions, many PSP banks started sending "check transaction status" very fast and again and again.', flood: { paths: ['ppsp>npci', 'gw>npci'], n: 12 }, after: { npci: { state: 'hot', sub: 'overloaded' } } },
          { title: 'New payments fail too', text: 'According to news reports, NPCI gave this as the cause of the April 2025 UPI outages (the outage on 12 April lasted hours): overuse of the status check APIs. The switch drowned in status checks, and the success rate of new payments fell.', go: 'bad:npci>ppsp>app', set: { npci: { state: 'down', sub: 'success rate fell' } } },
          { title: 'The rule: backoff and limits', text: 'NPCI issued a directive: the first check after 90 seconds, at most 3 checks in 2 hours; after that, find out from settlement files or the dispute system (UDIR). Lesson: a status check is also a retry, and it also needs <a href="#/resilience">backoff, limits and jitter</a>.', set: { npci: { state: 'ok', sub: 'central router' } } },
        ]},
      ],
    },

    { type: 'h3', text: 'Golden rule: a timeout means "unknown", not "failed"' },
    { type: 'p', html: `Any outside call (bank, NPCI, card network) has three results, not two: <strong>success</strong>, <strong>failed</strong>, and <strong>unknown</strong>. A timeout, a connection reset, a 502: all of these are "unknown": the request may have arrived, and the work may have been done. The most important design decision in a payment system is how to handle unknown.` },
    { type: 'table', head: ['Situation', 'Wrong reaction', 'Right reaction'], rows: [
      ['Bank call timeout', 'Mark FAILED, tell the user "pay again"', 'Keep PENDING, schedule a status check'],
      ['Status still unknown', 'Send a new debit (retry)', 'Ask for the <em>status</em> again with backoff; after the limit, leave it to the settlement file / reconciliation'],
      ['The user closed the app', 'Forget the payment', 'A background job / workflow resolves pending payments by itself'],
      ['A late success came, but the payment was already FAILED', 'Ignore it (the money stays taken!)', 'Never assume FAILED too early; and reconciliation must catch such a mismatch and refund / fix it'],
    ]},
    { type: 'p', html: `Now see for yourself how big a difference this one decision makes. Below is one day with 10,000 payments. Some bank calls time out, and in some of those the bank had <em>really</em> taken the money (only the answer was lost). Try the three policies:` },
    { type: 'custom', render(el) {
      const POL = [['fail', 'Timeout = FAILED, user pays again'], ['retry', 'Send the same debit again at once'], ['pend', 'PENDING + status check']];
      let pol = 'fail';
      el.innerHTML = `<div class="row2">
          <div><label>Payments (one day)</label><input class="pay-to-n" type="number" value="10000" min="100" step="100"></div>
          <div><label>Timeout rate %</label><input class="pay-to-t" type="number" value="2" min="0" max="20" step="0.5"></div>
          <div><label>% of timeouts where the bank really took the money</label><input class="pay-to-d" type="number" value="60" min="0" max="100" step="5"></div>
        </div>
        <div class="pay-to-p" style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0"></div>
        <div class="stats">
          <div class="stat"><span>Timeouts (unknown)</span><strong class="pay-to-a"></strong></div>
          <div class="stat"><span>Of these, really taken</span><strong class="pay-to-b"></strong></div>
          <div class="stat"><span>Double charges</span><strong class="pay-to-c"></strong></div>
          <div class="stat"><span>Extra money taken (₹499 each)</span><strong class="pay-to-e"></strong></div>
          <div class="stat"><span>Saw "processing"</span><strong class="pay-to-f"></strong></div>
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
          ? `${deb} people saw "failed" while their money had already been taken. They pay again: ${dbl} double charges. On top of that, the first payment is FAILED, so the state machine will reject the bank\'s late "success"; this money comes back only through reconciliation and a refund.`
          : pol === 'retry'
          ? `A new debit went out on every timeout. Where the first debit had already happened (${deb}), there are now two debits: ${dbl} double charges. A retry is safe only if the bank removes duplicates by the same transaction ID; without that guarantee, this is a straight double charge.`
          : `No double charges. ${to} people saw "processing" for a while (that is the price). The status check marked ${deb} as CAPTURED (late success) and ${to - deb} as FAILED, and for those, paying again is now safe.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `With the default numbers (10,000 payments, 2% timeouts, money really taken in 60% of them), the simulator shows 189 timeouts, and 111 real debits among them. In the first two policies these 111 people are charged twice (₹55,389 taken extra). In the third, zero; a few people just see "processing" for a while. That is why in payments "unknown" is a separate, third condition.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner mistake: "retrying is always good"', html: `In the <a href="#/resilience">Resilience</a> lesson, retries were good because the operation was idempotent. You can retry a bank debit only if the bank's API removes duplicates by the same transaction ID (and even then, asking for the status first is better). Without that guarantee, retrying an "unknown" debit = a straight road to a double charge. Retry the <strong>status check</strong>, not the debit.` },

    { type: 'h2', text: 'Deep dive 5: outbox and webhooks (telling the merchant)' },
    { type: 'p', html: `The payment is CAPTURED. Now this news must go to many places: the merchant's webhook, analytics, notifications, fraud systems. Razorpay's 2026 engineering blog describes the same situation for their UPI Switch: one successful payment had to fan out into many jobs (an update to NPCI, a callback to the merchant, the data warehouse). Problem: we wrote CAPTURED in the DB, and the server crashed before publishing the event to Kafka. The DB says "captured", and the rest of the world never found out. The opposite can also happen: the event went out, and the DB transaction rolled back.` },
    { type: 'p', html: `The cure is the one we saw in the <a href="#/distributed-tx">distributed transactions</a> and <a href="#/kafka">Kafka</a> lessons: the <strong>transactional outbox</strong>. Write the event into an <code>outbox</code> table in the same DB transaction that changed the payment state. A separate relay (a poller or a CDC tool) reads the outbox and publishes to Kafka. Either both happened, or neither.` },
    { type: 'callout', tone: 'term', title: 'New word: transactional outbox', html: `<strong>What it is:</strong> a table (<code>outbox</code>) in the Payments DB where "to be sent out" events are written, in the same transaction that changed the payment state. Like an outgoing letter box: once the letter is in the box, the postman (the relay) will surely take it later.<br><strong>Why we need it:</strong> the DB and Kafka are two separate systems. We cannot write to both with one "all or nothing". With an outbox, we write to only one system (the DB), and publishing happens later.<br><strong>Without it:</strong> the state became CAPTURED but the event never went (the merchant never learns), or the event went but the DB rolled back (the merchant gave Premium, but the money never came).` },
    { type: 'callout', tone: 'term', title: 'New words: relay, Kafka, CDC', html: `<strong>Relay:</strong> a small program that picks up new rows from the outbox, sends them to Kafka, and then marks the row as "published".<br><strong>Kafka:</strong> a long register (log) of events that is never erased. Many services read from it at their own speed. Full details in the <a href="#/kafka">Kafka lesson</a>.<br><strong>CDC (Change Data Capture):</strong> one way to build a relay: read the DB's own change log to catch new rows, instead of asking (polling) the table again and again.<br><strong>Why we need it:</strong> the news of one payment must go to many places (webhook, analytics, fraud). Put it in Kafka once, and everyone can read it.` },
    { type: 'callout', tone: 'term', title: 'New word: webhook', html: `<strong>What it is:</strong> an API call in the other direction. Normally xyz.com calls xyzPay. In a webhook, <em>xyzPay</em> calls a URL on xyz.com's server: "pay_Q2x has been captured".<br><strong>Why we need it:</strong> nobody knows in advance when the payment will be final (sometimes 2 seconds, sometimes 2 minutes). Instead of the merchant asking again and again, xyzPay tells it when it happens.<br><strong>Without it:</strong> the merchant would have to ask for the status every few seconds (polling), or trust Riya's app, which anyone can change.` },
    { type: 'callout', tone: 'term', title: 'New word: HMAC signature', html: `<strong>What it is:</strong> a "seal" on the message. Both xyzPay and xyz.com have a shared secret. xyzPay makes a code (HMAC-SHA256) from the body + the secret and sends it in a header. xyz.com makes the same code itself and compares.<br><strong>Why we need it:</strong> xyz.com's webhook URL is open on the internet. The seal shows that the message really came from xyzPay and that nobody changed it on the way.<br><strong>Without it:</strong> anyone could send a fake "payment.captured" and get Premium for free. See the "Fake webhook" scenario below. (The basics of keys and hashing are in the <a href="#/crypto-keys">crypto lesson</a>.)` },
    { type: 'flow', title: 'Captured → outbox → Kafka → signed webhook', height: 320,
      nodes: [
        { id: 'svc', label: 'Payment service', sub: 'state machine', x: 95, y: 80, w: 160, kind: 'server', info: 'What it is: the service that runs the payment state machine. It writes the state change, the ledger lines and the outbox event in one DB transaction. It does not publish to Kafka directly.' },
        { id: 'db', label: 'Payments DB', sub: 'payment + outbox', x: 95, y: 245, w: 160, kind: 'data', info: 'What it is: xyzPay\'s SQL database, which also holds the outbox table: event_id, type, payment_id, payload, published_at. The payment row and the outbox row go in one COMMIT (COMMIT = making the transaction final).' },
        { id: 'relay', label: 'Outbox relay', sub: 'poller / CDC', x: 310, y: 245, w: 140, kind: 'server', info: 'What it is: the postman from the outbox to Kafka. It reads the unpublished rows of the outbox, sends them to Kafka, then marks them as published. If it crashes, it will send again after a restart, so everyone downstream must be able to handle duplicates (at-least-once).' },
        { id: 'k', label: 'Kafka', sub: 'payment events', x: 500, y: 245, w: 130, kind: 'queue', info: 'What it is: a log (register) of payment events. The webhook sender, analytics and notifications all read it at their own speed. Key = payment_id, so that the events of one payment stay in order.' },
        { id: 'wh', label: 'Webhook sender', sub: 'retry + sign', x: 470, y: 80, w: 150, kind: 'server', info: 'What it is: the service that sends webhooks to merchants. An HTTPS POST to each merchant\'s registered URL. An HMAC-SHA256 signature of the body goes in the header. On a non-2xx answer or a timeout, it retries with exponential backoff.' },
        { id: 'm', label: 'xyz.com', sub: 'merchant server', x: 650, y: 80, w: 120, kind: 'client', info: 'What it is: the merchant\'s server. It receives the webhook: verifies the signature, removes duplicates by event_id, quickly returns 2xx, then turns Premium on.' },
        { id: 'att', label: 'Attacker', sub: 'fake webhook', x: 650, y: 245, w: 120, kind: 'threat', hidden: true, info: 'What it is: a cheater. Anyone can send fake JSON like "payment.captured" to xyz.com\'s webhook URL. Without a signature, it cannot be told apart from the real one.' },
      ],
      edges: [{ a: 'svc', b: 'db' }, { a: 'db', b: 'relay' }, { a: 'relay', b: 'k' }, { a: 'k', b: 'wh' }, { a: 'wh', b: 'm' }, { a: 'att', b: 'm', id: 'am', hidden: true, dashed: true }],
      scenarios: [
        { name: 'Happy path', steps: [
          { title: 'One transaction', text: 'UPDATE state=CAPTURED, ledger INSERTs, outbox INSERT, COMMIT.', go: ['svc>db', 'res:db>svc'], after: { db: { state: 'ok', sub: 'CAPTURED + outbox row' } }, msg: 'outbox: { event_id: evt_91, type: payment.captured, payment_id: pay_Q2x }' },
          { title: 'The relay publishes', text: 'The relay picked up the unpublished row and put it into Kafka, then marked it as published.', go: ['db>relay', 'evt:relay>k'] },
          { title: 'Webhook sender', text: 'The consumer read the event and signed the body with the merchant\'s secret.', go: 'evt:k>wh', msg: 'X-Signature = HMAC_SHA256(webhook_secret, raw_body)' },
          { title: 'Delivery to the merchant', text: 'xyz.com verified the signature, had not seen evt_91 before, returned 2xx, then gave Riya Premium.', go: ['wh>m', 'res:m>wh'], after: { m: { state: 'ok', sub: 'Premium ON' } } },
        ]},
        { name: 'Relay crash: duplicate', intro: 'The relay sent the event to Kafka, but crashed before marking it "published".', steps: [
          { title: 'Published...', go: ['db>relay', 'evt:relay>k'], text: 'The event reached Kafka.' },
          { title: '...crash before marking', text: 'The outbox row still shows "unpublished".', set: { relay: { state: 'down', sub: 'crash' } }, focus: ['relay'] },
          { title: 'Restart: publish again', text: 'The relay came back and sent the same row again. Kafka now has evt_91 twice. This is at-least-once: the event was not lost, but it can be duplicated.', set: { relay: { state: 'ok', sub: 'poller / CDC' } }, go: ['db>relay', 'evt:relay>k', 'evt:k>wh', 'wh>m'] },
          { title: 'The merchant removes the duplicate', text: 'xyz.com saw that evt_91 was already processed. It did nothing, just returned 2xx. Razorpay\'s docs also say webhooks are at-least-once, and to use the <code>x-razorpay-event-id</code> header to remove duplicates.', go: 'res:m>wh', after: { m: { state: 'ok', sub: 'duplicate ignored' } } },
        ]},
        { name: 'Merchant down', steps: [
          { title: 'xyz.com\'s server is down', text: 'The webhook went out, and a 503 / timeout came back.', set: { m: { state: 'down', sub: 'DOWN' } }, go: ['evt:k>wh', 'wh>m', 'bad:m>wh'] },
          { title: 'Retries with backoff', text: 'According to Razorpay\'s docs: non-2xx = delivery failure, and they retry with exponential backoff for up to 24 hours from the time of the event. The merchant must return 2xx within 5 seconds; otherwise it counts as a timeout and is sent again.', flood: { paths: ['bad:wh>m'], n: 4 }, after: { wh: { state: 'warn', sub: 'retrying...' } } },
          { title: '24 hours of failure = disabled', text: 'Razorpay\'s docs: if it keeps failing for 24 hours, the webhook is disabled, and the merchant must enable it again from the dashboard. So the merchant should not trust webhooks completely: it can also ask for the status itself with <code>GET /payments/{id}</code> (reconciliation).', set: { m: { state: 'ok', sub: 'back up' } }, after: { wh: { state: 'dim', sub: 'disabled' } } },
        ]},
        { name: 'Fake webhook', steps: [
          { title: 'The attacker\'s JSON', text: 'Someone sends a fake "payment.captured" to xyz.com\'s webhook URL to get Premium for free.', show: ['att', 'am'], go: 'att>m', msg: '{ "event": "payment.captured", "payment_id": "pay_FAKE" }' },
          { title: 'The signature fails', text: 'The attacker does not have the webhook secret, so cannot make the right HMAC. xyz.com rejects it. Razorpay\'s docs stress one thing: check the signature on the <strong>raw body</strong>, not on a body you rebuilt after parsing the JSON.', go: 'bad:m>att', after: { m: { state: 'ok', sub: 'rejected 401' } } },
        ]},
      ],
    },

    { type: 'callout', tone: 'warn', title: 'Real world: the outbox at Razorpay\'s UPI Switch (2026 blog)', html: `Razorpay wrote about 5 years of Kafka at their UPI Switch. They used the outbox pattern to keep the payment and its event atomic: business data and the event in one DB transaction, and an AWS managed connector read the table and published to Kafka. The trouble: that connector could write from one source table to only one configured topic, while they had a separate topic for every event type. When they added custom routing, the connector crashed again and again. They removed the connector, and the blog itself admits that the DB write and the Kafka publish are now separate operations, which can cause "windowed failures" (the DB write happened but the publish did not, or the opposite). Their next plan includes a durable idempotency key on every message (like payment ID + event type) and a dedupe store on the consumer side. Lesson: the pattern was right, the tooling let them down; and "one topic per event type" created a mountain of partitions.` },
    { type: 'p', html: `On the merchant's side, the webhook handler should look like this:` },
    { type: 'code', text: `
POST /hooks/pay   (xyz.com's server)
  raw = the raw body of the request (before parsing)
  expected = HMAC_SHA256(webhook_secret, raw)
  if not constant_time_equal(expected, header["X-Signature"]):  return 401
  event = json.parse(raw)
  BEGIN
    INSERT INTO processed_events(event_id) VALUES (event.event_id)   -- UNIQUE
      → duplicate? COMMIT, return 200, do nothing
    activate the subscription (state machine: only PENDING → ACTIVE)
  COMMIT
  return 200        -- quickly! put heavy work in a queue` },
    { type: 'list', items: [
      '<strong>Signed</strong>: HMAC (a hash with a shared secret) shows that xyzPay sent the message and that nobody changed it on the way. Razorpay\'s header is <code>X-Razorpay-Signature</code>, HMAC-SHA256.',
      '<strong>Retried</strong>: delivery is at-least-once. Even if the merchant\'s server is down, the event will not be lost (for up to 24 hours, in Razorpay\'s case).',
      '<strong>Idempotent handling</strong>: remove duplicates by event_id. And do not trust the order: Razorpay\'s docs say webhooks do not always arrive in order. If "payment.failed" arrives after "captured", the state machine will reject the wrong transition.',
    ]},

    { type: 'h2', text: 'Deep dive 6: reconciliation (our book vs the bank\'s book)' },
    { type: 'p', html: `So far everything was consistent inside our own system. But the money really sits with the banks, and their systems are not under our control. An answer got lost on the way, a bank added money late, there was a bug in our code: any of these can make our book and the real world differ. Idempotency and the state machine stop mistakes <em>inside</em>; <strong>reconciliation</strong> catches mistakes that come from <em>outside</em>.` },
    { type: 'callout', tone: 'term', title: 'New word: settlement file', html: `<strong>What it is:</strong> every day, banks / NPCI send a file: "today these transactions succeeded, and this much money went to these accounts". It is a copy of their book.<br><strong>Why we need it:</strong> the real money is with the banks. Only their book tells what really happened.<br><strong>Without it:</strong> we would have to trust only our own book, and mistakes in our own book would never be caught.` },
    { type: 'callout', tone: 'term', title: 'New word: reconciliation (recon)', html: `<strong>What it is:</strong> matching every line of the settlement file with every line of our own ledger (by transaction reference), and treating anything that does not match as a "break" (mismatch) to be solved. Like checking your homework answers against a friend's copy after school.<br><strong>Why we need it:</strong> idempotency and the state machine stop mistakes <em>inside</em>. Outside mistakes (a late answer from the bank, a bank bug, our own bug) are caught only by matching.<br><strong>Without it:</strong> someone's money was taken, we have no record, and nobody finds out for weeks.<br><strong>Example:</strong> according to Razorpay's 2020 post on settlements, the default settlement is T+2 (two working days), and one reason settlement is not instant is exactly this reconciliation complexity.` },
    { type: 'p', html: `Below is one day of xyzPay's recon. First run the "clean day", then switch on one problem at a time and see how each mismatch is caught:` },
    { type: 'custom', render(el) {
      const BASE = [['pay_101', 499], ['pay_102', 199], ['pay_103', 999], ['pay_104', 499], ['pay_105', 299], ['pay_106', 1499], ['pay_107', 2499], ['pay_108', 99]];
      const T = [['late', 'Late success'], ['miss', 'Missing in bank file'], ['amt', 'Amount mismatch'], ['dup', 'Duplicate in bank file']];
      const on = { late: false, miss: false, amt: false, dup: false };
      el.innerHTML = `<div class="pay-rc-t" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px"></div>
        <button type="button" class="btn small primary pay-rc-run">Run reconciliation</button>
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
          if (cap && bs.length === 0) return [ref, l.amt, '-', 'MISSING IN BANK', 'Ask the bank; hold settlement; maybe our bug'];
          if (!cap && bs.length) return [ref, l ? l.st : '-', bs[0].amt, 'MISSING IN LEDGER', 'Late success: mark CAPTURED + ledger entry, or refund if no order was made'];
          if (bs.length > 1) return [ref, l.amt, bs.map(b => b.amt).join(' + '), 'DUPLICATE IN BANK', 'Dispute with the bank; adjust one line'];
          if (bs[0].amt !== l.amt) return [ref, l.amt, bs[0].amt, 'AMOUNT MISMATCH', 'Investigate; once confirmed, an adjustment entry (no edit)'];
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
        el.querySelector('.pay-rc-note').textContent = rows.length === ok ? `All ${ok} lines match. Difference ₹0. A day like this is the best kind of day.` : `Difference (bank − ledger) = ${bt - lt < 0 ? '−' : '+'}₹${Math.abs(bt - lt).toLocaleString('en-IN')}. Every mismatch is a "break": it goes to the ops team\'s queue, and the fix is always a new ledger entry, never an edit of the old line.`;
      };
      T.forEach(t => { const c = document.createElement('button'); c.type = 'button'; c.className = 'chip'; c.textContent = t[1]; c.onclick = () => { on[t[0]] = !on[t[0]]; c.className = 'chip' + (on[t[0]] ? ' on' : ''); run(); }; el.querySelector('.pay-rc-t').appendChild(c); });
      el.querySelector('.pay-rc-run').onclick = run; run();
    }},
    { type: 'list', items: [
      '<strong>When it runs</strong>: a daily batch job (after the settlement file arrives), and today many companies run it several times a day or even near real time. NPCI\'s 2025 rules also say that if the status is still not known after 2 hours, find it out from the settlement files.',
      '<strong>Three-way</strong>: often three things are matched: our ledger, the NPCI / bank transaction file, and the bank statement of the escrow account (did the real money arrive or not).',
      '<strong>What to do with breaks</strong>: small things are fixed automatically (a late success → capture, or an automatic refund), the rest go to an ops queue. Every fix is a new journal entry, so the audit trail stays complete.',
      '<strong>For the merchant too</strong>: gateways like Razorpay give merchants settlement reports so that the merchant can also match them with its own orders.',
    ]},

    { type: 'h2', text: 'Awareness: fraud, tokenisation, PCI DSS, escrow' },
    { type: 'p', html: `In an interview, a name and one line for each of these is enough. In real work, each one is a whole team.` },
    { type: 'table', head: ['Thing', 'What it is', 'Effect on the design'], rows: [
      ['Fraud / risk checks', 'Rules + ML before and after a payment: too many fast payments from one card (velocity), a new device, card-testing attacks', 'A risk call in the payment path (fast, with a timeout), and streaming detection on events. According to a 2026 AWS case study, Razorpay does real-time anomaly detection on payment events with Kafka + Flink.'],
      ['Card tokenisation', 'A token instead of the real card number. After RBI\'s card-on-file rules, merchants and gateways cannot store real card data (only the issuer / card network can); for reconciliation they may keep limited information like the last 4 digits.', 'Our DB holds a token, not the card number. Even if data leaks, no card number comes out.'],
      ['PCI DSS', 'A global security standard (from the card networks) for every system that touches card data', 'Keep card data in a small, separate, strict "vault", so the rest of the system stays outside PCI scope. If the merchant uses a hosted checkout, the card number never reaches its server.'],
      ['Escrow account', 'According to RBI\'s 2020 payment aggregator guidelines, a non-bank aggregator keeps the money collected for merchants in an escrow account at a scheduled commercial bank', 'A separate "escrow cash" account in the ledger, and three-way recon with the bank statement.'],
    ]},

    { type: 'h2', text: 'Failure scenarios at a glance' },
    { type: 'table', head: ['What broke', 'Without the design', 'Our answer'], rows: [
      ['The client\'s answer was lost, it retries', 'Double charge', 'Idempotency key: replay the saved response'],
      ['Double click / concurrent retries', 'Two debits', 'Unique constraint, 409 for the second one'],
      ['Bank / NPCI timeout', 'Say "failed" and charge again', 'PENDING + status check (limit + backoff), never retry the debit'],
      ['Server crash after the DB commit, before publishing', 'The merchant never finds out', 'Transactional outbox, relay is at-least-once'],
      ['Duplicate events / webhooks', 'Premium twice, refund twice', 'event_id dedupe, idempotent consumers, state machine'],
      ['Out-of-order events', 'FAILED written after CAPTURED', 'The state machine rejects the wrong transition'],
      ['The merchant\'s server is down', 'Event lost', 'Retries with backoff (Razorpay: 24 hours), then the merchant polls the API for the status'],
      ['A bug wrote a wrong ledger entry', 'Money silently disappears', 'Every entry balanced; fix = reversal entry; recon catches it'],
      ['The bank added money late / with a wrong amount', 'Our book and the real money differ', 'Daily reconciliation, an ops queue for breaks'],
      ['Everyone checks the status at the same time', 'Retries cause the outage themselves', 'Rate limit + jitter on status checks too (NPCI 2025 rules)'],
    ]},

    { type: 'h2', text: 'How to say it in an interview' },
    { type: 'steps', items: [
      { t: 'Say the hard part first', d: 'Money must never be lost or taken twice, while networks and banks are unreliable. Correctness > latency.' },
      { t: 'API + idempotency', d: 'A client-generated idempotency key on every POST, (merchant, key) unique, replay the saved response, error on a hash mismatch.' },
      { t: 'State machine', d: 'created → pending → authorized → captured → settled, plus failed / refunded. Conditional updates, terminal states, history.' },
      { t: 'Ledger', d: 'Double-entry, append-only, strongly consistent in SQL; every journal adds up to zero; corrections = new entries; sub-accounts for hot accounts.' },
      { t: 'External calls', d: 'Timeout = unknown. PENDING, status check with backoff + limits, never a blind retry. For UPI: PSP → NPCI → remitter (debit) → beneficiary (credit).' },
      { t: 'Events + merchants', d: 'Outbox → Kafka → idempotent consumers; signed (HMAC), retried, deduplicated webhooks.' },
      { t: 'Safety net', d: 'Daily reconciliation against settlement files; a breaks queue. Awareness: fraud checks, tokenisation, PCI DSS, escrow.' },
    ]},
    { type: 'callout', tone: 'tip', title: 'Decide', html: `Make <strong>every payment API idempotent</strong> (client key + saved response). Keep <strong>the money record</strong> in a double-entry, append-only ledger on strongly consistent SQL, with state + ledger + outbox in one transaction. <strong>A bank/network timeout is "unknown"</strong>: keep PENDING and resolve it with a status check, never retry the debit. Send <strong>events</strong> through the outbox, and make webhooks signed + retried + deduplicated. And run <strong>reconciliation every day</strong>, because only it catches the outside world's mistakes. Use caches or eventual consistency only where there is no money (dashboards, analytics), never on a balance.` },

    { type: 'diagram', title: 'The whole design at a glance', height: 600,
      caption: 'At the top, the outside world (the UPI network). On the left, Riya and xyz.com; in the middle, xyzPay; on the right, bank files and events (Async). Use the buttons above to see one path at a time.',
      groups: [
        { label: 'UPI network (outside world)', x: 10, y: 8, w: 700, h: 128 },
        { label: 'Clients', x: 10, y: 164, w: 160, h: 426 },
        { label: 'xyzPay', x: 190, y: 164, w: 340, h: 426 },
        { label: 'Async', x: 550, y: 164, w: 160, h: 426 },
      ],
      nodes: [
        { id: 'ppsp', label: 'Riya\'s UPI app', sub: 'payer PSP', x: 90, y: 80, kind: 'client', info: 'What it is: a UPI app like PhonePe / GPay / Paytm, together with its PSP bank. Riya enters her PIN here, and it carries the request to NPCI. The money does not stay in the app; only the request starts here.' },
        { id: 'npci', label: 'NPCI switch', sub: 'UPI router', x: 270, y: 80, kind: 'net', info: 'What it is: NPCI\'s central system; every UPI payment passes through it. First it gets the debit done at Riya\'s bank, then the credit at the receiving bank, and it tells both PSPs the result.' },
        { id: 'rem', label: 'Remitter bank', sub: 'Riya\'s: debit', x: 450, y: 80, kind: 'data', info: 'What it is: Riya\'s bank. It checks the PIN and takes ₹499 from Riya\'s account (debit).' },
        { id: 'ben', label: 'Beneficiary bank', sub: 'credit, escrow', x: 630, y: 80, kind: 'data', info: 'What it is: the bank where the money is added (credit), on the side of xyzPay\'s escrow account. It (and NPCI) also sends the daily settlement file.' },
        { id: 'app', label: 'Riya\'s app', sub: 'xyz.com checkout', x: 90, y: 220, kind: 'client', info: 'What it is: the xyz.com app with xyzPay\'s checkout inside. It starts the payment with a new idempotency key and opens the UPI app (intent). Premium is not given because this app says so.' },
        { id: 'conn', label: 'UPI connector', sub: 'timeout = unknown', x: 270, y: 220, kind: 'server', info: 'What it is: the part of xyzPay that talks to NPCI (on the payee PSP side). It listens for the result; if no answer comes, it keeps the payment PENDING and sends only status checks (backoff, limit), never a new debit.' },
        { id: 'files', label: 'Settlement files', sub: 'daily, bank + NPCI', x: 630, y: 220, kind: 'data', info: 'What it is: the daily report from banks and NPCI: which transactions really happened and how much money went where. A copy of their book.' },
        { id: 'api', label: 'Payment API', sub: 'idempotency keys', x: 270, y: 330, kind: 'server', info: 'What it is: xyzPay\'s front door. On every POST it checks the idempotency key (retry = saved answer), applies the state machine rules, and gives work to the connector. Stateless, behind a load balancer.' },
        { id: 'recon', label: 'Recon job', sub: 'match daily', x: 450, y: 330, kind: 'server', info: 'What it is: a job that runs every day and matches each line of the settlement file with the ledger. A mismatch (break) goes to an ops queue, and the fix is always a new ledger entry.' },
        { id: 'db', label: 'Payments DB', sub: 'state+ledger+outbox', x: 270, y: 440, kind: 'data', info: 'What it is: a strongly consistent SQL database. The payment state, idempotency keys, the double-entry ledger (every entry adds up to zero, INSERT only) and the outbox: all written in one transaction.' },
        { id: 'relay', label: 'Outbox relay', sub: 'poller / CDC', x: 450, y: 440, kind: 'server', info: 'What it is: the postman that picks up new events from the outbox table and puts them into Kafka. After a crash it may send again, so everyone after it removes duplicates (at-least-once).' },
        { id: 'kafka', label: 'Kafka', sub: 'payment events', x: 630, y: 440, kind: 'queue', info: 'What it is: a log of payment events. The webhook sender, analytics, fraud and notifications all read it at their own speed. Key = payment_id, so the events of one payment stay in order.' },
        { id: 'merchant', label: 'xyz.com server', sub: 'merchant', x: 90, y: 550, kind: 'client', info: 'What it is: the merchant\'s server. It creates the order, verifies the signed webhook, removes duplicates by event_id, and then gives Riya Premium. When in doubt, it asks itself with GET /payments/{id}.' },
        { id: 'wh', label: 'Webhook sender', sub: 'HMAC + retries', x: 450, y: 550, kind: 'server', info: 'What it is: the service that tells merchants "the payment is done". An HMAC seal on the body, and retries with backoff on non-2xx (Razorpay: up to 24 hours).' },
        { id: 'cons', label: 'Analytics, fraud', sub: 'notifications', x: 630, y: 550, kind: 'server', info: 'What it is: the other consumers: dashboards, fraud / risk checks, SMS and email. Money does not depend on them, so a small delay (eventual consistency) is fine here.' },
      ],
      edges: [
        { a: 'app', b: 'api', n: 1, label: 'pay + key' },
        { a: 'api', b: 'db', label: 'one transaction', both: true },
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
        { a: 'files', b: 'recon', label: 'daily match' },
        { a: 'recon', b: 'db', dashed: true },
      ],
      paths: [
        { name: 'Pay', text: 'The app creates the payment with a key (CREATED) → PIN in the UPI app → payer PSP → NPCI → debit at Riya\'s bank → credit at the beneficiary bank → result to the connector → CAPTURED + ledger + outbox in one transaction.', go: ['app>api>db', 'app>ppsp>npci>rem', 'npci>ben', 'npci>conn>api>db'] },
        { name: 'Timeout → unknown', text: 'The debit happened, but no answer came for the credit. The connector\'s timeout = "unknown": the payment is PENDING, Riya sees "processing". No new debit; only status checks (backoff, at most 3). When the answer is "success", it becomes CAPTURED.', go: ['app>api>db', 'app>ppsp>npci>ben', 'npci>conn>api>db'] },
        { name: 'Webhook', text: 'Outbox row together with CAPTURED → relay → Kafka → webhook sender (HMAC seal, retries) → xyz.com (verify, remove duplicates, Premium ON). Analytics and fraud read the same event.', go: ['api>db>relay>kafka>wh>merchant', 'kafka>cons'] },
        { name: 'Reconcile', text: 'Every day the bank + NPCI settlement file arrives → the recon job matches each line with the ledger → mismatches go to the ops queue, fix = a new ledger entry.', go: ['ben>files>recon>db'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>In payments, correctness comes before speed: money is never taken twice and never disappears.</li>
      <li>A client idempotency key on every payment API: a retry gets the saved answer, not a second debit.</li>
      <li>A payment is a state machine (created → pending → authorized → captured → settled, plus failed / refunded). A wrong transition is rejected by the DB's conditional update.</li>
      <li>Double-entry ledger: every entry adds up to zero, INSERT only (append-only), and a mistake is fixed with an opposite entry.</li>
      <li>UPI: payer PSP → NPCI → remitter bank (debit) → beneficiary bank (credit). Every outside call's timeout = "unknown": PENDING + limited status checks, never a blind retry.</li>
      <li>State + ledger + outbox in one DB transaction; relay → Kafka → signed, retried, deduplicated webhooks.</li>
      <li>Daily reconciliation catches outside mistakes: settlement file vs ledger.</li>
    </ul>` },

    { type: 'h2', text: 'The trade-offs we made' },
    { type: 'tradeoffs',
      gains: ['Idempotency: retries are safe, no double charge', 'State machine: impossible transitions (a refund on FAILED) simply cannot happen', 'Double-entry ledger: the "why" of every rupee, and bugs show up at once (total ≠ 0)', 'Append-only: full audit history; even a mistake can be traced', 'Outbox: the DB and the events never disagree', 'Recon: mistakes from the outside world are caught too'],
      costs: ['Extra work on every write: key check, ledger lines, outbox row (latency + storage)', 'The price of strong consistency: SQL is hard to scale, and hot accounts cause lock contention', 'Bad UX of the PENDING state: we must show the user "processing"', 'At-least-once events: every consumer must write its own dedupe', 'Recon and an ops team: daily work that never ends', 'Storage and cleanup of idempotency keys (Stripe: prune after 24 hours)'],
    },
    { type: 'think', questions: [
      { q: 'A big sale on xyz.com: 5,000 payments per second for one single merchant. What will break in the ledger, and how will you save it?', a: 'The merchant\'s "payable" account is a single row, and every payment updates it: row lock contention (a hot account). Cure: split that account into N sub-accounts (pick one by a hash of payment_id), with balance = the sum of all of them; or write the ledger lines at once and add them up into the balance in small batches. Ledger lines are append-only, so their INSERTs can run in parallel; only the balance row is hot.' },
      { q: 'Riya\'s app has shown "PENDING" in the status check for 10 minutes. Riya pays again (with a new key). What can happen now, and how should the product handle it?', a: 'If the first payment later turns out to be a success, Riya paid twice: two different keys, so idempotency will not catch it (and it should not). Protection: a check at the order level (only one captured payment per order_7Kq; if a second one is captured, refund it automatically), a warning in the UI that "your first payment is still pending", and a recon/auto-refund job that refunds extra captured payments on one order.' },
      { q: 'Does Kafka\'s "exactly-once" feature remove our need for idempotency keys?', a: 'No. Kafka\'s exactly-once works inside Kafka (produce → process → produce). The bank call, the webhook and the merchant\'s DB are outside Kafka. Duplicates can appear there (relay crash, consumer restart, webhook retry), so every side effect needs its own idempotency. The next plan in Razorpay\'s 2026 blog says the same: a durable key on every message and dedupe on the consumer side.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'You sent a debit request to the bank, and no answer came within 30 seconds. What is the right step?', options: ['Mark it FAILED and ask the user to pay again', 'Send the same debit again at once', 'Keep it PENDING and check the status later', 'Assume SUCCESS, since most of them succeed'], answer: 2, explain: 'Timeout = unknown. The debit may already have happened, so a new debit risks a double charge; assuming "success" is also wrong. PENDING + status check (with backoff and a limit).' },
      { q: 'The first attempt of a request with an idempotency key failed with a 500 error. What does Stripe do on a retry with the same key?', options: ['It runs the request again', 'It returns the same saved 500 response', 'It deletes the key'], answer: 1, explain: 'Stripe\'s docs: the status code and body of the first request are saved, whether success or failure, even a 500. (In cases like a failed validation or a concurrent conflict, the result is not saved, and you can retry.)' },
      { q: 'A ledger entry: debit ₹500, credit ₹450. What should happen?', options: ['Accept it, we will look at the ₹50 difference later', 'Reject it: every journal entry must add up to zero', 'Change the credit to ₹500 automatically'], answer: 1, explain: 'The core rule of double-entry: debits = credits. An unbalanced entry means ₹50 "appeared" from somewhere. The ledger rejects it; to fix a mistake, write a correct, balanced entry.' },
      { q: 'How do we fix an old wrong ledger entry?', options: ['UPDATE it and change the amount', 'DELETE it and insert a new one', 'Write a new reversal / correcting entry'], answer: 2, explain: 'The ledger is append-only (both in Square\'s Books and in Uber\'s ledger). The correction is a new entry, so the history and the audit trail are kept.' },
      { q: 'What is the "collect" flow in UPI?', options: ['The payer types the VPA and sends the money', 'The payee sends a request, and the payer approves it and enters the PIN', 'The bank takes the money automatically'], answer: 1, explain: 'Pull / collect: the payee asks, the payer approves. Because of fraud, NPCI stopped P2P collect from 1 Oct 2025; merchant collect continues. For merchants, the intent flow gives higher success.' },
      { q: 'The merchant got the same webhook twice (same event_id). What is the right handling?', options: ['Process both', 'Process it the first time; the second time just return 2xx', 'Return 4xx so it does not come again'], answer: 1, explain: 'Webhooks are at-least-once. Remove duplicates by event_id and return 2xx; otherwise the sender keeps retrying.' },
    ]},
    { type: 'sources', note: 'Company-specific facts come only from these sources. Razorpay, PhonePe and Paytm do not publish their full internal architecture; any part not in the sources is written in the lesson as "how the industry usually does it".', items: [
      { title: 'Designing robust and predictable APIs with idempotency', publisher: 'Stripe blog (Brandur Leach)', url: 'https://stripe.com/blog/idempotency', year: 2017, official: true, used: 'The three failure cases (never arrived / stopped halfway / answer lost), the Idempotency-Key header, retries with exponential backoff and jitter.' },
      { title: 'Idempotent requests (API reference)', publisher: 'Stripe docs', url: 'https://docs.stripe.com/api/idempotent_requests', year: 2026, official: true, used: 'V4 UUID suggestion, 255 characters, status code + body saved (even a 500), pruning after 24 hours, error on parameter mismatch, the result of a concurrent conflict is not saved.' },
      { title: 'Five Years of Kafka at Razorpay’s UPI Switch', publisher: 'Razorpay Engineering', url: 'https://engineering.razorpay.com/tryst-with-kafka-2f5cef766c45', year: 2026, official: true, used: 'Razorpay\'s UPI Switch (70%+ of UPI volume), payment event fan-out, the outbox + MSK Connector experience and its removal, topic explosion, the consumer idempotency key plan.' },
      { title: 'Payments: states and lifecycle', publisher: 'Razorpay docs', url: 'https://razorpay.com/docs/payments/payments/', year: 2026, official: true, used: 'created / authorized / captured / refunded / failed, automatic refund if not captured within 3 days, late authorization.' },
      { title: 'Webhooks: best practices; validate and test', publisher: 'Razorpay docs', url: 'https://razorpay.com/docs/webhooks/best-practices/', year: 2026, official: true, used: 'At-least-once, dedupe with x-razorpay-event-id, no order guarantee, 5 second timeout, 24 hours of exponential backoff, then disabled; X-Razorpay-Signature HMAC-SHA256 on the raw body.' },
      { title: 'Payout idempotency', publisher: 'Razorpay docs (RazorpayX)', url: 'https://razorpay.com/docs/api/x/payout-idempotency', year: 2026, official: true, used: 'Replay of the saved response; the warning not to retry with a new key while processing.' },
      { title: 'Payment gateway settlement process', publisher: 'Razorpay blog', url: 'https://razorpay.com/blog/pg-settlements-process', year: 2020, official: true, used: 'T+2 default settlement, why settlement is not instant (bank timelines, reconciliation).' },
      { title: 'UPI Intent vs Collect success rates', publisher: 'Razorpay blog', url: 'https://razorpay.com/blog/upi-intent-vs-collect-success-rates/', year: 2026, official: true, used: 'The difference between intent and collect, and Razorpay\'s claimed success rate gap.' },
      { title: 'UPI product overview (archived copy)', publisher: 'NPCI', url: 'https://web.archive.org/web/2023/https://www.npci.org.in/what-we-do/upi/product-overview', year: 2023, official: true, used: '2016 pilot (21 banks), participants (payer/payee PSP, remitter/beneficiary bank), push vs pull steps, virtual address, two-factor authentication.' },
      { title: 'UPI OC No. 45: reduce deemed approved transactions', publisher: 'NPCI circular', url: 'https://www.npci.org.in/PDF/npci/upi/circular/2018/UPI%20OC%2045%20-%20Solutions%20to%20reduce%20deemed%20approved%20transaction.pdf', year: 2018, official: true, used: 'Credit leg after the debit, 3 Check Transaction messages, Credit Reversal Request, "deemed approved", 30 second leg timeout.' },
      { title: 'UPI outage: NPCI directs banks to limit check transaction API usage', publisher: 'Inc42 (news report of NPCI circular)', url: 'https://inc42.com/buzz/upi-outage-npci-directs-banks-to-limit-check-transaction-api-usage/', year: 2025, used: 'The cause of the April 2025 outages (overuse of status checks), first check after 90 seconds, at most 3 in 2 hours, then settlement files / UDIR.' },
      { title: 'NPCI to stop UPI P2P collect requests from Oct 1', publisher: 'The Week (PTI)', url: 'https://www.theweek.in/wire-updates/business/2025/08/14/dcm65-biz-npci-collect.html', year: 2025, used: '29 July 2025 circular: P2P collect stops from 1 Oct 2025, merchant collect continues.' },
      { title: 'Harmonisation of TAT and customer compensation for failed transactions', publisher: 'Reserve Bank of India', url: 'https://www.rbi.org.in/scripts/NotificationUser.aspx?Id=11693', year: 2019, official: true, used: 'UPI: if the debit happened but the credit did not, automatic reversal in T+1 (P2P) / T+5 (merchant), ₹100/day compensation; the definition of a "failed transaction" (timeouts etc.).' },
      { title: 'Demystifying TStore: the backbone of billions of transactions at PhonePe', publisher: 'PhonePe Tech blog', url: 'https://tech.phonepe.com/demystifying-tstore-the-backbone-of-billions-of-transactions-at-phonepe/', year: 2024, official: true, used: '8,000+ TPS peak, PENDING (non-terminal) vs COMPLETED / ERRORED (terminal) states.' },
      { title: 'Books, an immutable double-entry accounting database service', publisher: 'Square (The Corner)', url: 'https://developer.squareup.com/blog/books-an-immutable-double-entry-accounting-database-service/', year: 2019, official: true, used: 'Journal entries add up to zero, debit + / credit − convention, append-only, corrections as new entries, cached balances, Spanner.' },
      { title: 'Uber’s payments platform', publisher: 'Uber Engineering blog', url: 'https://www.uber.com/us/en/blog/ubers-payments-platform/', year: 2026, official: true, used: 'The zero-sum rule of money orders, immutability, adjustments as new orders, strongly consistent balances, LedgerStore, Kafka + Cadence.' },
      { title: 'How Razorpay built real-time anomaly detection with Amazon MSK', publisher: 'AWS Big Data blog (AWS authors)', url: 'https://aws.amazon.com/blogs/big-data/how-razorpay-built-real-time-anomaly-detection-with-amazon-msk/', year: 2026, used: '500M+ monthly transactions, real-time anomaly / fraud detection on Kafka + Flink.' },
      { title: 'Bmtc bus ticket in 2026 via UPI payment (photo)', publisher: 'Wikimedia Commons (Shaymmm, CC BY-SA 4.0)', url: 'https://commons.wikimedia.org/wiki/File:Bmtc_bus_ticket_in_2026_via_UPI_payment.jpg', year: 2026, used: 'The photo of a ₹24 bus ticket paid with UPI.' },
    ]},
  ],
});
