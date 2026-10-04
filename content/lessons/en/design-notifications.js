Lesson.register({
  id: 'design-notifications',
  title: 'Notification system',
  minutes: 45,
  summary: `Every service at xyz.com needs to tell users something: an OTP, "payment done", "someone commented", "the sale has started". In this lesson we build one central notification system. It takes one event and delivers it as a phone push, an SMS, an email, an in-app inbox item or a webhook. We also make sure an OTP never waits behind a sale message, nothing is sent twice, nobody is woken up at 2 AM, and no message is lost when a provider goes down. Built on what LinkedIn, Uber, Netflix, Razorpay and Duolingo have shared publicly, plus the official Apple and Google docs.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Small messages reach your phone all day: "OTP 4821", "₹500 debited", "Riya liked your photo". Many different services inside one app send them. If every service sends them its own way, some messages arrive twice, some never arrive, and on sale day the OTP comes late. In this lesson we build a "post office" system. Every service just tells it "tell this person this". The post office decides when, by which route and how many times, and makes sure the message gets there.` },
    { type: 'callout', tone: 'tip', title: 'Try it yourself first', html: `Think about three questions on paper: (1) "Your OTP is 4821" and "Diwali sale is live!" both go through the same system. How do you make sure the OTP never gets stuck behind the sale? (2) How would you send "India won the match!" to 5 crore (50 million) users within 1 minute? (3) The SMS company is down. How does the OTP still get delivered? Then read on.` },

    { type: 'h2', text: 'Step 1: the problem and the requirements' },
    { type: 'p', html: `xyz.com now has 20 services: payments, login, comments, videos, marketing. All of them need to tell users something. At first, every team wrote its own code to call the SMS company and to send email. The result: different retries everywhere, different wording, no record of who unsubscribed, and some users got 40 notifications in one day. So we build one <strong>central notification system</strong>. Other services only say "tell user 42 about payment_success". This system does all the rest.` },
    { type: 'callout', tone: 'term', title: 'Notification channel', html: `<strong>What it is:</strong> the route a message takes to reach the user: a phone push, an SMS, an email, the inbox inside the app, or a webhook to another company's server.<br><strong>Why we need it:</strong> each route has its own speed, cost and rules. An OTP goes by SMS or push. An invoice goes by email.<br><strong>Without it:</strong> everything would go one way. Offline users would get nothing, or every message would be an expensive SMS.` },
    { type: 'table', head: ['Channel', 'What it is (in plain words)', 'Speed', 'Cost', 'Who delivers it'], rows: [
      ['Mobile push', 'A short message at the top of the phone screen, even when the app is closed', 'Usually seconds', 'Almost free', 'Apple APNs (iPhone), Google FCM (Android)'],
      ['SMS', 'A text message to a phone number, works without internet', 'Seconds', 'You pay for every message', 'An SMS company (gateway) connected to the phone networks'],
      ['Email', 'A longer message in the inbox, with HTML', 'Seconds to minutes', 'Very cheap', 'An email provider (a sending service)'],
      ['In-app', 'The "notifications" list inside the app (the bell icon)', 'When the user opens the app', 'Our own database', 'Our own server'],
      ['Webhook', 'Our server makes an HTTP call to another company\'s server', 'Seconds', 'Cheap', 'Directly to their URL'],
    ]},
    { type: 'callout', tone: 'term', title: 'Webhook', html: `<strong>What it is:</strong> "when something happens, tell me at this URL." A business registers its URL with us. When the event happens, our server sends a POST request to that URL.<br><strong>Why we need it:</strong> sellers who run shops on xyz.com have their own servers. They need "new order" as a machine message, not as a message for a person.<br><strong>Without it:</strong> the seller's server would ask "anything new?" every 5 seconds (polling), which is wasted load. Details are in the <a href="#/realtime">Polling, SSE, WebSockets, webhooks</a> lesson.` },
    { type: 'callout', tone: 'term', title: 'Transactional vs marketing', html: `<strong>What it is:</strong> <em>Transactional</em> = the direct result of something the user just did, needed right now: an OTP, "payment done", "password changed". <em>Marketing</em> (promotional) = "50% off", "watch new videos".<br><strong>Why this difference matters:</strong> they differ in speed, priority, user consent and law. In India, telecom rules allow promotional SMS only between 9 AM and 9 PM IST, while transactional SMS can go at any time.<br><strong>Without it:</strong> the OTP would get stuck in a line of 1 crore sale messages, and the user could not log in.` },
    { type: 'image', src: 'assets/img/design-notifications/wiki-app-notifications.png', alt: 'Four screenshots of the Wikipedia Android app: notification preference switches, the list of notifications, the options for one notification, and an archived message', caption: 'A real app (Wikipedia for Android, 2018-19) shows two parts of a notification system: on the left, "Notification preferences" (the user can switch each type on or off), and in the other screens, the in-app inbox (list, mark as read, archive). We will build both.', credit: { text: 'MPopov (WMF), Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Wikipedia_Android_app_notifications_examples.png', license: 'CC BY-SA 4.0' } },
    { type: 'compare',
      left: { title: 'Functional', html: `• Channels: mobile push (iOS/Android), SMS, email, in-app inbox, webhooks<br>• Send to one user, or broadcast to a "segment" (5 crore followers)<br>• User preferences: "no marketing email", quiet hours, unsubscribe<br>• Templates, in many languages<br>• Scheduling: "send tomorrow at 9 AM"<br>• Delivery status: sent, delivered, opened, clicked, failed` },
      right: { title: 'Non-functional', html: `• OTP/transactional: within a few seconds; marketing: minutes are fine<br>• No duplicates (two "₹500 debited" messages = panic)<br>• Never lose a message: retry if the provider is down, and record it if it still fails<br>• No spam: limits per user<br>• A problem in one channel must not block the others<br>• A broadcast must not bring down the rest of the system` },
    },

    { type: 'h2', text: 'Step 2: napkin maths' },
    { type: 'p', html: `These numbers are assumptions, not any company's real numbers. They have one job: to show where the bottleneck will be. Move the sliders:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Daily active users (millions): <strong class="nnm-uv"></strong></label><input class="nnm-u" type="range" min="1" max="200" step="1" value="50"></div>
          <div><label>Notifications per user per day: <strong class="nnm-nv"></strong></label><input class="nnm-n" type="range" min="1" max="20" step="1" value="5"></div>
          <div><label>Average channels per notification: <strong class="nnm-cv"></strong></label><input class="nnm-c" type="range" min="1" max="3" step="0.5" value="1.5"></div>
          <div><label>Peak = average × <strong class="nnm-pv"></strong></label><input class="nnm-p" type="range" min="1" max="20" step="1" value="5"></div>
          <div><label>Status updates per message: <strong class="nnm-sv"></strong></label><input class="nnm-s" type="range" min="1" max="6" step="1" value="4"></div>
          <div><label>Share sent as SMS (%): <strong class="nnm-mv"></strong></label><input class="nnm-m" type="range" min="0" max="10" step="0.5" value="2"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Sends per day</span><strong class="nnm-d"></strong></div>
          <div class="stat"><span>Sends/s (average)</span><strong class="nnm-a"></strong></div>
          <div class="stat"><span>Sends/s (peak)</span><strong class="nnm-k"></strong></div>
          <div class="stat"><span>Status writes/s (peak)</span><strong class="nnm-w"></strong></div>
          <div class="stat"><span>Log storage per day</span><strong class="nnm-g"></strong></div>
          <div class="stat"><span>SMS bill per day</span><strong class="nnm-b"></strong></div>
        </div>
        <div class="calc-note nnm-note"></div>`;
      const q = s => el.querySelector(s);
      const k = n => n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : Math.round(n).toString();
      const rs = n => n >= 1e7 ? '₹' + (n / 1e7).toFixed(2) + ' crore' : n >= 1e5 ? '₹' + (n / 1e5).toFixed(1) + ' lakh' : '₹' + Math.round(n);
      const upd = () => {
        const U = +q('.nnm-u').value * 1e6, N = +q('.nnm-n').value, C = +q('.nnm-c').value, P = +q('.nnm-p').value, S = +q('.nnm-s').value, M = +q('.nnm-m').value;
        q('.nnm-uv').textContent = q('.nnm-u').value + 'M'; q('.nnm-nv').textContent = N; q('.nnm-cv').textContent = C; q('.nnm-pv').textContent = P; q('.nnm-sv').textContent = S; q('.nnm-mv').textContent = M + '%';
        const day = U * N * C, avg = day / 1e5, peak = avg * P, wr = peak * S, gb = day * 500 / 1e9, sms = day * M / 100, bill = sms * 0.15;
        q('.nnm-d').textContent = k(day); q('.nnm-a').textContent = k(avg) + '/s'; q('.nnm-k').textContent = k(peak) + '/s';
        q('.nnm-w').textContent = k(wr) + '/s'; q('.nnm-g').textContent = gb.toFixed(gb < 10 ? 1 : 0) + ' GB'; q('.nnm-b').textContent = rs(bill);
        q('.nnm-note').textContent = `We assume one day ≈ 10^5 seconds and a log record of ~500 bytes per message. We assume an SMS costs ₹0.15 (only a guess; the real price depends on the vendor and the deal). Notice: status writes (${k(wr)}/s) are ${S} times the sends (${k(peak)}/s), and the SMS bill is for ${k(sms)} SMS per day, while push is almost free.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `With the defaults: 5 crore users × 5 × 1.5 = <strong>375M sends per day</strong>, ~3.8k/s on average and ~18.8k/s at peak. But each message has 4 status updates (queued, sent, delivered, opened), so at peak that is <strong>75k database writes per second</strong>. Two lessons: (1) the bottleneck is often not "sending" but <strong>writing our own status</strong> (this happened to Razorpay, as we will see). (2) Even 2% SMS costs about ₹11 lakh per day. So use push or in-app wherever possible, and SMS only where it is really needed (OTP).` },

    { type: 'h2', text: 'Step 3: API and data model' },
    { type: 'callout', tone: 'term', title: 'Idempotency key', html: `<strong>What it is:</strong> a unique name sent with a request, like <code>payment-98123-success</code>. If the same name comes again, the server knows "this is the same old request".<br><strong>Why we need it:</strong> answers get lost on the network, so the calling service sends the request again. Without a key, the system treats it as new and sends the notification again.<br><strong>Without it:</strong> the user gets "₹500 debited" twice and panics. The full story is in <a href="#/pagination-idempotency">Pagination and idempotency</a>.` },
    { type: 'code', text: `
# 1. To one user (transactional or social)
POST /v1/notifications
  {
    "idempotency_key": "payment-98123-success",   // same key again = do not send again
    "user_id": 42,
    "type": "payment_success",                     // decides priority and preferences
    "template": "payment_success",                 // the system builds the text itself
    "data": { "amount": "₹500", "merchant": "xyz store" },
    "channels": ["push", "email"],                 // optional; otherwise the defaults for this type
    "send_by": "2026-10-04T10:31:00Z"              // if later than this, sending is useless
  }
  →  202 Accepted  { "notification_id": "n_7f3a" }  // "accepted", it will be sent later

# 2. Broadcast / campaign (many users)
POST /v1/campaigns   { "segment": "followers_of:team_india", "template": "match_start",
                       "schedule": { "at": "09:00", "timezone": "user_local" } }

# 3. Register the phone's address (device token) when the app is installed
POST /v1/devices     { "user_id": 42, "platform": "ios", "token": "80f2...c9", "app_version": "7.3" }

# 4. Preferences and unsubscribe
PUT  /v1/users/42/preferences   { "marketing": { "email": false, "push": true }, "quiet_hours": "23:00-08:00" }

# 5. In-app inbox
GET  /v1/users/42/inbox?cursor=...    PATCH /v1/inbox/{id}  { "read": true }` },
    { type: 'p', html: `Look at <code>202 Accepted</code>: the API <strong>accepts</strong> the request and puts it in a queue. Separate workers send it later. The payment service never waits for Apple or the SMS company (the <a href="#/queues">Message queues</a> pattern).` },
    { type: 'code', text: `
templates      (name, version, channel, locale, title, body)       -- "Hi {{name}}, ₹{{amount}} ..."
user_prefs     (user_id, category, channel, enabled)                -- (42, marketing, email, false)
user_settings  (user_id, timezone, quiet_from, quiet_to, locale)    -- (42, "Asia/Kolkata", 23:00, 08:00, "hi-IN")
devices        (user_id, platform, token, app_version, last_seen)   -- one user, many phones
notifications  (notification_id, idempotency_key UNIQUE, user_id, type, priority, status, created_at)
deliveries     (notification_id, channel, provider, provider_msg_id, status, attempts, updated_at)
inbox          (user_id, notification_id, title, body, read, created_at)   -- partitioned by user_id
scheduled      (notification_id, send_at, ...)                       -- index on send_at` },
    { type: 'p', html: `Which data goes where? Preferences, settings and templates are read very often and change rarely, so a normal database plus a cache. <code>notifications</code>, <code>deliveries</code> and <code>inbox</code> grow very fast (crores of rows every day) and are always read by <code>user_id</code> or <code>notification_id</code>. So they go into databases that are partitioned by key and grow horizontally (like Cassandra or DynamoDB, or sharded SQL). Uber's notification system also keeps its "inbox" in sharded MySQL, partitioned by user ID.` },

    { type: 'h2', text: 'Step 4: high-level design, one step at a time' },
    { type: 'p', html: `Instead of showing the final design straight away, we start with the simplest version and see where it breaks. Each time it breaks, we add a new part. Run the scenarios in the diagram one after another:` },
    { type: 'callout', tone: 'term', title: 'Provider', html: `<strong>What it is:</strong> an outside company that does the real delivery: Apple (APNs) and Google (FCM) for push, an SMS company, an email sending company.<br><strong>Why we need it:</strong> we cannot reach an iPhone or a phone network by ourselves; these routes belong to them.<br><strong>Without it:</strong> no push, SMS or email can leave our system. But a provider is not under our control: it can be slow, it can be down, or it can refuse with "you are sending too much".` },
    { type: 'flow', height: 340, title: 'How the design grows: from a direct call to a queue',
      nodes: [
        { id: 'prod', label: 'Payment svc', sub: 'producer', x: 80, y: 70, w: 120, kind: 'server', info: 'What it is: any xyz.com service that needs to tell the user something (here, payments). We call it a "producer" because it produces the request for a notification.' },
        { id: 'api', label: 'Notif API', sub: 'accept, 202', x: 180, y: 230, w: 130, kind: 'server', hidden: true, info: 'What it is: the front door of the notification system. It checks the request, puts it in the queue and right away says "accepted" (202). So the producer does not wait for the provider.' },
        { id: 'q', label: 'Queue', sub: 'line of work', x: 340, y: 230, w: 110, kind: 'queue', hidden: true, info: 'What it is: a line of work. A message stays here until a worker sends it and says "done" (ack). So even if the provider is down, the message is not lost.' },
        { id: 'w', label: 'Workers', sub: 'senders', x: 490, y: 230, w: 130, kind: 'server', hidden: true, info: 'What it is: background programs that pick messages from the queue, build the text and send it to the provider. More load? Run more workers.' },
        { id: 'prov', label: 'Provider', sub: 'APNs / SMS co.', x: 640, y: 70, w: 140, kind: 'net', info: 'What it is: the outside company (Apple, Google, an SMS company) that actually carries the message to the phone. Not under our control.' },
        { id: 'ph', label: 'Phone', sub: 'user', x: 640, y: 290, w: 110, kind: 'client', info: 'What it is: the user\'s device, where the notification should appear.' },
      ],
      edges: [{ a: 'prod', b: 'prov', id: 'direct' }, { a: 'prod', b: 'api', id: 'pa', hidden: true }, { a: 'api', b: 'q', id: 'aq', hidden: true }, { a: 'q', b: 'w', id: 'qw', hidden: true }, { a: 'w', b: 'prov', id: 'wp', hidden: true }, { a: 'prov', b: 'ph' }],
      scenarios: [
        { name: 'Version 1: direct call', steps: [
          { title: 'The service sends it itself', go: 'prod>prov', text: 'As soon as a payment happens, the payment service calls the SMS company itself and waits for the answer.', msg: 'POST https://sms-company/send  { to: "+91 98...", text: "₹500 paid" }' },
          { title: 'It worked', go: ['res:prov>prod', 'evt:prov>ph'], after: { ph: { state: 'ok', sub: '₹500 paid' } }, text: 'At small scale this is fine. Simple, just one call.' },
          { title: 'Provider is slow', go: 'prod>prov', set: { prov: { state: 'warn', sub: 'taking 3 sec' } }, after: { prod: { state: 'warn', sub: 'payment API slow' } }, text: 'The SMS company takes 3 seconds. Now the user\'s <strong>payment</strong> is also 3 seconds late, because the payment service is waiting for the SMS answer. An outside company has slowed down our core feature.' },
          { title: 'Provider is down', go: 'bad:prov>prod', set: { prov: { state: 'down', sub: 'DOWN' } }, after: { ph: { state: 'dim', sub: 'nothing came' } }, text: 'The SMS company is down. The message never went out, and nothing records that it must be sent again. On top of that, this same code is copied in 20 services, each with its own bugs.' },
        ]},
        { name: 'Version 2: API + queue', steps: [
          { title: 'New parts', hide: ['direct'], show: ['api', 'q', 'w', 'pa', 'aq', 'qw', 'wp'], set: { prov: { state: '', sub: 'APNs / SMS co.' }, prod: { state: '', sub: 'producer' }, ph: { state: '', sub: 'user' } }, focus: ['api', 'q', 'w'], text: 'Three new parts: an <strong>API</strong> that accepts the request, a <strong>queue</strong> where the work waits in line, and <strong>workers</strong> that take it from the line and send it.' },
          { title: 'Request in, quick answer', go: ['prod>api', 'api>q', 'res:api>prod'], text: 'The payment service said "tell user 42 about payment_success". The API put it in the queue and answered 202 in ~10 ms. The payment never waits for SMS again.', msg: '202 Accepted  { notification_id: "n_7f3a" }' },
          { title: 'A worker sends it', go: ['q>w', 'w>prov', 'res:prov>w', 'evt:prov>ph'], after: { ph: { state: 'ok', sub: '₹500 paid' } }, text: 'A worker took the message, sent it to the provider, and then told the queue "done" (ack). Only after the ack does the message leave the line.' },
        ]},
        { name: 'Version 2: provider down', steps: [
          { title: 'The provider fell', show: ['api', 'q', 'w', 'pa', 'aq', 'qw', 'wp'], hide: ['direct'], go: ['prod>api', 'api>q', 'res:api>prod'], set: { prov: { state: 'down', sub: 'DOWN' } }, text: 'The request came in as before, and the producer got 202. No effect on the payment.' },
          { title: 'Sending failed, message is safe', go: ['q>w', 'w>prov', 'bad:prov>w'], after: { q: { state: 'warn', sub: 'back in line' } }, text: 'The worker did not ack, so the message stayed in the queue. It will be tried again a little later (a retry). Nothing was lost.' },
          { title: 'Provider is back, all sent', go: ['q>w', 'w>prov', 'evt:prov>ph'], set: { prov: { state: 'ok', sub: 'back up' } }, after: { q: { state: '', sub: 'line of work' }, ph: { state: 'ok', sub: '₹500 paid' } }, text: 'The provider recovered and the worker sent the message. The queue separated two worlds: the speed of the producer and the speed of the provider.' },
        ]},
      ],
    },
    { type: 'p', html: `Version 2 works, but there is still only one line. The next three questions move the design forward: (1) a decision <strong>before</strong> sending: did the user say no? Is it night? How many have we already sent today? (2) The OTP and the sale should not be in the same line: <strong>priority queues</strong>. (3) <strong>Separate workers</strong> for each channel, so a problem with the email provider does not stop push. First, the decision part:` },

    { type: 'h3', text: 'Part 1: intake, the decision before sending' },
    { type: 'p', html: `Before putting a request in the queue, the API asks five questions. Each one is explained in detail in the deep dives below; for now, just get the idea:` },
    { type: 'steps', items: [
      { t: 'Has this request come before? (dedupe)', d: 'Look at the idempotency key. If it came before, do not send again; return the same old answer.' },
      { t: 'Did the user say no? (preferences)', d: 'If the user turned off "marketing push", no marketing push goes out. Transactional messages like the OTP cannot be turned off; the user can only choose the channel.' },
      { t: 'Is it the user\'s sleeping time? (quiet hours)', d: 'No marketing between 11 PM and 8 AM in the user\'s own time zone. Keep it for the morning.' },
      { t: 'Have we sent too many today? (frequency cap)', d: 'For example, "at most 3 marketing pushes per day". The counter lives in Redis, just like rate limiting.' },
      { t: 'Which line? (priority)', d: 'Transactional (OTP, payment) goes to the P0 line, marketing to the P1 line. Each line has its own workers.' },
    ]},
    { type: 'flow', height: 340, title: 'Intake: decision and priority',
      nodes: [
        { id: 'prod', label: 'Payment svc', sub: 'producer', x: 80, y: 170, w: 130, kind: 'server', info: 'What it is: any service that wants a notification. It only says "what happened" (type + data), not "how to send it". How to send it is the notification system\'s job.' },
        { id: 'api', label: 'Notification API', x: 290, y: 170, w: 170, kind: 'server', info: 'What it is: the front door of the notification system. It checks dedupe, preferences, quiet hours and caps, decides the priority, puts the message in a queue and returns 202. It is stateless (it keeps nothing in its own memory), so you can run as many copies as you like.' },
        { id: 'rd', label: 'Redis', sub: 'dedupe + per-user caps', x: 290, y: 55, w: 190, kind: 'cache', info: 'What it is: a very fast in-memory store. Here it does two jobs: (1) it records the idempotency key (SET NX, for 24 hours) so the same request is not sent twice; (2) it keeps per-user counters, like "how many marketing pushes today" (just like the <a href="#/design-rate-limiter">Rate limiter</a>).' },
        { id: 'pref', label: 'Prefs + templates', sub: 'DB + cache', x: 290, y: 290, w: 190, kind: 'data', info: 'What it is: the record of what the user wants: which type is on or off on which channel, time zone, quiet hours, language. Templates live here too. Read very often, changed rarely, so it sits behind a cache.' },
        { id: 'p0', label: 'P0 queue', sub: 'transactional', x: 560, y: 95, w: 160, kind: 'queue', info: 'What it is: a separate line for urgent work: OTP, payments, security alerts. It has its own workers and its own capacity. A flood of marketing cannot even touch it.' },
        { id: 'p1', label: 'P1 queue', sub: 'marketing / bulk', x: 560, y: 250, w: 160, kind: 'queue', info: 'What it is: the line for less urgent work: promotions, digests, "new videos". A backlog (a long line) here is fine; a delay of minutes is OK.' },
      ],
      edges: [{ a: 'prod', b: 'api' }, { a: 'api', b: 'rd' }, { a: 'api', b: 'pref' }, { a: 'api', b: 'p0' }, { a: 'api', b: 'p1' }],
      scenarios: [
        { name: 'Payment success (P0)', steps: [
          { title: 'An event arrives', go: 'prod>api', text: 'A payment went through. Tell the user.', msg: 'POST /v1/notifications { idempotency_key: "payment-98123-success", user_id: 42, type: "payment_success" }' },
          { title: 'First time?', go: ['api>rd', 'res:rd>api'], text: 'We recorded the idempotency key. It was not there before, so we continue.', msg: 'SET idem:payment-98123-success n_7f3a NX EX 86400  →  OK' },
          { title: 'Preferences', go: ['api>pref', 'res:pref>api'], text: 'payment_success is transactional: the user cannot turn it off, but can choose the channels (push on, email on, SMS off).', msg: 'channels = [push, email]' },
          { title: 'Into the P0 line', go: ['api>p0', 'res:api>prod'], text: 'One message per channel goes into the P0 queue, and the producer gets 202 right away.', msg: '202 Accepted  { notification_id: "n_7f3a" }' },
        ]},
        { name: 'Duplicate request', steps: [
          { title: 'The producer retried', go: 'prod>api', text: 'The answer to the first call was lost on the network, so the payment service sent the same request again. This is completely normal.', msg: 'POST ... idempotency_key: "payment-98123-success"' },
          { title: 'The key already exists', go: ['api>rd', 'bad:rd>api'], text: 'SET NX failed: this key came before. We will not queue it again.', msg: 'SET ... NX  →  (nil)   existing = n_7f3a' },
          { title: 'Same answer', go: 'res:api>prod', set: { p0: { state: 'dim' } }, text: 'The producer gets the same notification_id. The user got one "₹500 paid", not two.', msg: '202 Accepted  { notification_id: "n_7f3a" }' },
        ]},
        { name: 'User said no', steps: [
          { title: 'A marketing push', go: ['prod>api', 'api>rd', 'res:rd>api'], set: { prod: { label: 'Marketing svc' } }, text: 'A sale push arrives.' },
          { title: 'Preference: off', go: ['api>pref', 'bad:pref>api'], text: 'The user has turned off "marketing push". Sending it anyway breaks the user\'s trust (and in many places, the law).', msg: 'prefs(42, marketing, push) = off' },
          { title: 'Drop it, with a reason', go: 'res:api>prod', set: { p1: { state: 'dim' } }, text: 'Not sent, but logged: "skipped: user_pref". This matters later for analytics and debugging ("why did I not get my notification?").' },
        ]},
        { name: 'Quiet hours + cap', steps: [
          { title: 'Marketing at 1 AM', go: ['prod>api', 'api>pref', 'res:pref>api'], set: { prod: { label: 'Marketing svc' } }, text: 'It is 1 AM in the user\'s time zone, and their quiet hours are 11 PM to 8 AM.' },
          { title: 'Today\'s cap is also full', go: ['api>rd', 'res:rd>api'], after: { rd: { state: 'warn', sub: 'marketing today = 3/3' } }, text: 'This user already got 3 marketing pushes today. The limit is 3.' },
          { title: 'Later, or in a digest', go: 'api>p1', after: { p1: { sub: 'scheduled 9:00 local' } }, text: 'We schedule it for 9 AM tomorrow (user\'s time), or add it to tomorrow\'s digest. LinkedIn\'s ATC (2018 post) did exactly this: no sending during sleep, many notifications combined into one digest, and frequency control.' },
        ]},
        { name: 'Sale flood', steps: [
          { title: '1 crore marketing messages', flood: { paths: ['api>p1'], n: 10 }, after: { p1: { state: 'hot', sub: 'backlog: 1 crore' } }, text: 'The Diwali sale campaign filled up P1.' },
          { title: 'The OTP still goes at once', go: ['prod>api', 'api>p0'], set: { prod: { label: 'Auth svc' } }, after: { p0: { state: 'ok', sub: 'empty, fast' } }, text: 'P0 is a separate line with its own workers. The OTP went out in seconds. Razorpay wrote the same about its notification service: separate queues by priority, so bulk messages in the festive season do not block transactional ones.' },
        ]},
      ],
    },

    { type: 'h3', text: 'Part 2: separate workers for each channel' },
    { type: 'p', html: `After the queue, each channel has its own workers: push workers talk to Apple and Google, email workers to the email provider, SMS workers to the SMS company, in-app workers write to our own inbox database, and webhook workers POST to sellers\' URLs. Each channel also has its own queue (or topic), for both P0 and P1.` },
    { type: 'callout', tone: 'term', title: 'Bulkhead', html: `<strong>What it is:</strong> splitting a system into separate compartments, so a problem in one compartment does not spread to the others. The name comes from the walls inside a ship that stop one flooded section from sinking the whole ship.<br><strong>Why we need it:</strong> if the email provider gets slow and all workers get stuck waiting for it, push and SMS stop too. Separate workers = separate compartments.<br><strong>Without it:</strong> one provider\'s problem becomes the whole notification system\'s problem. Netflix\'s RENO system also keeps delivery separate per platform. Details in <a href="#/resilience">API gateway, retries, circuit breaker</a>.` },

    { type: 'h2', text: 'Deep dive 1: device tokens, and how APNs/FCM work' },
    { type: 'p', html: `The first question: why can our server not send a message straight to someone\'s phone? Because a phone has no fixed address. Sometimes it is on WiFi, sometimes on 4G, often asleep. And if every app kept its own connection open, the battery would die in a day. So Apple and Google built one single route: the phone\'s operating system keeps one always-open connection to <strong>their</strong> servers, and the pushes for all apps arrive through that one connection.` },
    { type: 'callout', tone: 'term', title: 'APNs and FCM', html: `<strong>What it is:</strong> <strong>APNs</strong> (Apple Push Notification service) for iPhones and <strong>FCM</strong> (Firebase Cloud Messaging) for Android are the push services of Apple and Google. Our server gives them the message, and they deliver it to the phone.<br><strong>Why we need it:</strong> only they have an open connection to the phone. One connection for all apps saves battery.<br><strong>Without it:</strong> no push when the app is closed. Example: according to Apple\'s docs, the server sends a request over HTTP/2 to <code>api.push.apple.com</code>, and the payload (data) of one push can be at most 4 KB.` },
    { type: 'callout', tone: 'term', title: 'Device token', html: `<strong>What it is:</strong> a long random string that is the address of "this phone + this app". When the app is installed and the user allows notifications, the phone\'s operating system gets it from Apple or Google and gives it to the app.<br><strong>Why we need it:</strong> when we send a push, we give this token to APNs/FCM; they know which phone it belongs to.<br><strong>Without it:</strong> we would not know where to send the push. Tokens also change (app reinstalled, phone restored), so we must keep them fresh. The Firebase docs advise the app to send its token to the server every time it starts.` },
    { type: 'flow', height: 340, title: 'Push: from token to phone',
      nodes: [
        { id: 'q', label: 'Push queue', sub: 'P0 / P1', x: 80, y: 170, w: 120, kind: 'queue', info: 'What it is: the line for the push channel. Each message has notification_id, user_id, template and data. At-least-once: if the worker does not ack, the message comes again.' },
        { id: 'w', label: 'Push worker', sub: 'render + send', x: 270, y: 170, w: 150, kind: 'server', info: 'What it is: the program that takes a message, loads all of the user\'s device tokens, fills the template in the user\'s language, sends to APNs/FCM, writes the status and then acks the queue. Following Apple\'s advice, it reuses HTTP/2 connections and opens several connections under heavy load.' },
        { id: 'tok', label: 'Device registry', sub: 'tokens DB', x: 270, y: 50, w: 150, kind: 'data', info: 'What it is: a list of user_id → [iPhone token, Android token, tablet token...], with platform, app version and last_seen. One user can have many devices; the push goes to all of them. Dead tokens are removed here.' },
        { id: 'reg', label: 'Device API', sub: 'token register', x: 490, y: 50, w: 130, kind: 'server', info: 'What it is: our small endpoint (POST /v1/devices) where the app sends its token: on install, on login and on every start. On logout the token is removed from the user, or the next user of that phone would get the previous user\'s notifications.' },
        { id: 'apns', label: 'APNs / FCM', sub: 'Apple / Google', x: 490, y: 170, w: 150, kind: 'net', info: 'What it is: the push services of Apple and Google. Our server gives them the message; delivering it to the phone is their job. Answers: 200 (accepted), 410 / UNREGISTERED (token is dead), 429 (too many, slow down), 5xx (a problem on their side right now).' },
        { id: 'ph', label: 'Phone', sub: 'xyz app', x: 655, y: 170, w: 100, kind: 'client', info: 'What it is: the user\'s device. Its operating system always keeps a connection to Apple or Google. If it is online, the notification arrives at once; if it is offline, the provider keeps it for a while.' },
        { id: 'rq', label: 'Retry queue', sub: 'delay + DLQ', x: 490, y: 290, w: 150, kind: 'queue', info: 'What it is: the line for failed messages that are worth trying again, with a delay. After the maximum number of attempts they go to the dead-letter queue (DLQ), with an alert.' },
      ],
      edges: [{ a: 'q', b: 'w' }, { a: 'w', b: 'tok' }, { a: 'w', b: 'apns' }, { a: 'apns', b: 'ph' }, { a: 'w', b: 'rq' }, { a: 'ph', b: 'reg' }, { a: 'reg', b: 'tok' }],
      scenarios: [
        { name: 'How a token is made', steps: [
          { title: 'Permission and token', go: ['ph>apns', 'res:apns>ph'], text: 'The user installed the app and tapped "Allow notifications". The phone\'s operating system got a device token for this app from Apple or Google.', msg: 'token = "80f2...c9"' },
          { title: 'The app gives us the token', go: ['ph>reg', 'reg>tok'], after: { tok: { state: 'ok', sub: 'user 42: 2 devices' } }, text: 'The app sent the token to our Device API. The registry now has two devices for user 42: an iPhone and a tablet.', msg: 'POST /v1/devices { user_id: 42, platform: "ios", token: "80f2...c9" }' },
          { title: 'Fresh on every start', focus: ['reg', 'tok'], text: 'A token can change, so the app sends it on every start and we update last_seen. According to the Firebase docs, FCM treats an Android token that has been inactive for 270 days as expired, so sending to old tokens is useless.' },
        ]},
        { name: 'Happy path', steps: [
          { title: 'Message taken', go: 'q>w', text: 'The worker took a message from the push queue.', msg: '{ notification_id: "n_7f3a", user_id: 42, channel: "push", template: "payment_success" }' },
          { title: 'Tokens + template', go: ['w>tok', 'res:tok>w'], text: 'We found user 42\'s tokens and filled the template in the user\'s language (en-IN).', msg: 'title: "Payment successful"  body: "₹500 paid to xyz store"' },
          { title: 'To APNs', go: ['w>apns', 'res:apns>w'], text: 'An HTTP/2 request: the device token in the path, and in the headers a priority (10 = right now) and a collapse id.', msg: 'POST /3/device/80f2...c9\napns-priority: 10\napns-collapse-id: n_7f3a\n→ 200' },
          { title: 'To the phone', go: 'evt:apns>ph', after: { ph: { state: 'ok', sub: '₹500 paid' } }, text: 'Apple delivered it to the phone. The worker wrote the status "sent" and acked the queue. Careful: 200 means "Apple accepted it", not "it appeared on the phone".' },
        ]},
        { name: 'Dead token (410)', steps: [
          { title: 'Sent', go: ['q>w', 'w>tok', 'res:tok>w', 'w>apns'], text: 'The user had uninstalled the app.' },
          { title: '410 / UNREGISTERED', go: 'bad:apns>w', text: 'APNs returns 410 (the token is no longer active); FCM returns UNREGISTERED. <strong>Do not retry</strong>: no matter how many times you send, it will not arrive.', msg: '410 Unregistered' },
          { title: 'Remove the token', go: 'w>tok', after: { tok: { state: 'ok', sub: 'dead token deleted' } }, text: 'The token was removed from the registry. The Firebase docs also say old tokens waste sends and resources.' },
        ]},
        { name: 'Provider busy (429/5xx)', steps: [
          { title: 'Sent, got 503', go: ['q>w', 'w>apns', 'bad:apns>w'], set: { apns: { state: 'warn', sub: 'overloaded' } }, text: 'A short-lived problem on the provider\'s side. This is worth a retry.' },
          { title: 'Retry queue, with backoff', go: 'w>rq', after: { rq: { state: 'warn', sub: 'attempt 2 in ~2s' } }, text: 'The message goes to the retry queue with a delay. The delay doubles on each attempt, plus a little randomness (jitter). See why in the simulator below.' },
          { title: 'Again, and this time it works', go: ['res:rq>w', 'w>apns', 'res:apns>w', 'evt:apns>ph'], set: { apns: { state: '', sub: 'Apple / Google' } }, after: { rq: { state: '', sub: 'delay + DLQ' } }, text: 'It went through on the second attempt.' },
        ]},
        { name: 'Phone offline', steps: [
          { title: 'Phone is off', set: { ph: { state: 'down', sub: 'offline' } }, go: ['q>w', 'w>apns', 'res:apns>w'], text: 'APNs accepted it (200), but the phone is offline.' },
          { title: 'The provider keeps it, but only a little', focus: ['apns'], text: 'According to Apple\'s (now archived) guide, for an offline phone APNs keeps only the <strong>newest</strong> notification per app, for a limited time; when a new one comes, the old one is dropped. FCM keeps messages for up to 4 weeks by default, but on Android, if more than 100 non-collapsible messages pile up, it drops them all.' },
          { title: 'So also an in-app inbox', set: { ph: { state: 'ok', sub: 'opened app' } }, focus: ['ph'], text: 'Push is "best effort", not a guarantee. Also write important things to the in-app inbox (our own database); when the app opens, it fetches them from there. Netflix RENO (2022 post) uses this hybrid: push to online devices, and devices pull missed events by themselves.' },
        ]},
      ],
    },
    { type: 'table', head: ['Header / setting', 'Meaning', 'When'], rows: [
      ['apns-priority 10 / 5 / 1', '10 = send now, 5 = at a good time considering the phone\'s battery, 1 = low priority', 'OTP, chat: 10. Background sync, marketing: 5'],
      ['apns-expiration / FCM TTL', 'How long to keep it if the phone is offline. 0 = if it cannot be delivered now, drop it', 'Short TTL for "match starts in 5 min"; long for an invoice'],
      ['apns-collapse-id / FCM collapse key', 'New notifications with the same id replace the old one (Apple: max 64 bytes)', 'After "Score: 120/3" comes "Score: 145/4": remove the old one'],
      ['FCM priority normal / high', 'High wakes the phone up; normal may wait to save battery', 'High only for urgent messages the user will see'],
    ]},

    { type: 'h2', text: 'Deep dive 2: templates and localisation' },
    { type: 'p', html: `The producer only sends <code>template: "payment_success"</code> and the data. Building the real text is the notification system\'s job, because the same message looks different on each channel and in each language: a short title + body for push, one short line for SMS, a subject + HTML page for email.` },
    { type: 'callout', tone: 'term', title: 'Template', html: `<strong>What it is:</strong> pre-written text with blanks, like <code>"{{otp}} is your xyz.com OTP"</code>. When sending, the real value is filled in for <code>{{otp}}</code> (this is called <em>rendering</em>).<br><strong>Why we need it:</strong> the text lives in one place for all services. To fix a mistake or add Tamil, nobody has to change code.<br><strong>Without it:</strong> 20 services, 20 different "payment successful" messages, and a new language = work for 20 teams.` },
    { type: 'callout', tone: 'term', title: 'Localisation (locale)', html: `<strong>What it is:</strong> building the message for the user\'s language and region. A <em>locale</em> is a code like <code>hi-IN</code> (Hindi, India) or <code>en-IN</code>. It is not only the language: also the date format, the currency sign and the way numbers are written.<br><strong>Why we need it:</strong> a user in Tamil Nadu may read Tamil better than English; if they understand it, they also click more.<br><strong>Without it:</strong> everyone gets one language, or worse: half the message in one language and half in another.` },
    { type: 'list', items: [
      `<strong>Versioned:</strong> every template has versions (v1, v2, v3). If the new text turns out wrong, go back to the old one with one click.`,
      `<strong>Rendered on the worker, at send time:</strong> with the user\'s language and time zone <em>at that moment</em>. If a scheduled message goes out tomorrow, tomorrow\'s settings apply.`,
      `<strong>Fallback chain:</strong> no template for <code>ta-IN</code> yet? Then try <code>ta</code>, then the default <code>en-IN</code>. Never an empty message.`,
      `<strong>Channel limits:</strong> a push payload on Apple can be up to 4 KB; one part (segment) of an SMS holds 160 English characters or only 70 Hindi/emoji characters; keep email subjects short.`,
      `<strong>Escape user text:</strong> if the data has text written by a user (like a comment), escape it before putting it into email HTML, or someone will inject their own HTML or links.`,
      `<strong>SMS templates are registered in India:</strong> under the telecom rules (TRAI, the DLT system), a business must register its sender name and every SMS template in advance; only the variables can change. So changing an SMS template is not as easy as deploying code.`,
      `<strong>Test send and preview:</strong> send to 5 people before sending to 5 crore. Otherwise "Hi {{name}}" lands on everyone\'s phone.`,
    ]},
    { type: 'p', html: `Now see for yourself how the language, and even one small symbol, change the cost of an SMS. An SMS is sent in one of two "alphabets": <strong>GSM-7</strong> (basic English letters, 160 per SMS) and <strong>UCS-2</strong> (any Unicode: Hindi, emoji, ₹; only 70 per SMS). A long message is sent in several <em>segments</em>, and each segment costs money:` },
    { type: 'custom', render(el) {
      const T = {
        otp: { 'en-IN': { t: 'Login OTP', b: '{{otp}} is your xyz.com login OTP. Valid for 10 minutes. Do not share it with anyone.' },
               'hi-IN': { t: 'लॉगिन OTP', b: '{{otp}} आपका xyz.com लॉगिन OTP है। 10 मिनट तक मान्य है। इसे किसी के साथ साझा न करें।' } },
        pay: { 'en-IN': { t: 'Payment successful', b: '{{cur}}{{amount}} paid to {{merchant}} from your xyz.com wallet. Ref {{ref}}. Not you? Call 1800-000-000.' },
               'hi-IN': { t: 'पेमेंट सफल', b: '{{merchant}} को {{cur}}{{amount}} का पेमेंट हो गया। Ref {{ref}}. आपने नहीं किया? 1800-000-000 पर कॉल करें।' } },
      };
      const D = { otp: '482193', amount: '500', merchant: 'xyz store', ref: 'TXN98123' };
      const GSM = '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà', EXT = '^{}\\[~]|€';
      let tpl = 'otp', loc = 'en-IN', rupee = true;
      el.innerHTML = `<div class="ntl-a" style="display:flex;flex-wrap:wrap;gap:8px"></div><div class="ntl-b" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"></div><div class="ntl-c" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"></div>
        <pre class="ascii ntl-out" style="white-space:pre-wrap;margin-top:10px"></pre>
        <div class="stats">
          <div class="stat"><span>Locale used</span><strong class="ntl-l"></strong></div>
          <div class="stat"><span>SMS alphabet</span><strong class="ntl-e"></strong></div>
          <div class="stat"><span>SMS characters</span><strong class="ntl-n"></strong></div>
          <div class="stat"><span>SMS segments</span><strong class="ntl-s"></strong></div>
          <div class="stat"><span>Push payload</span><strong class="ntl-p"></strong></div>
        </div>
        <div class="calc-note ntl-note"></div>`;
      const q = s => el.querySelector(s);
      const chips = (box, opts, cur, set) => { box.innerHTML = ''; opts.forEach(([v, t]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (v === cur ? ' on' : ''); b.textContent = t; b.onclick = () => { set(v); upd(); }; box.appendChild(b); }); };
      const upd = () => {
        chips(q('.ntl-a'), [['otp', 'OTP template'], ['pay', 'Payment template']], tpl, v => tpl = v);
        chips(q('.ntl-b'), [['en-IN', 'en-IN English'], ['hi-IN', 'hi-IN Hindi'], ['ta-IN', 'ta-IN Tamil']], loc, v => loc = v);
        chips(q('.ntl-c'), [[true, 'Currency: ₹'], [false, 'Currency: Rs.']], rupee, v => rupee = v);
        const used = T[tpl][loc] ? loc : 'en-IN';
        const d = Object.assign({ cur: rupee ? '₹' : 'Rs.' }, D);
        const fill = s => s.replace(/\{\{(\w+)\}\}/g, (m, k) => d[k]);
        const title = fill(T[tpl][used].t), body = fill(T[tpl][used].b);
        const chars = [...body];
        const gsm = chars.every(c => GSM.includes(c) || EXT.includes(c));
        const n = gsm ? chars.reduce((a, c) => a + (EXT.includes(c) ? 2 : 1), 0) : chars.length;
        const segs = gsm ? (n <= 160 ? 1 : Math.ceil(n / 153)) : (n <= 70 ? 1 : Math.ceil(n / 67));
        const bytes = new TextEncoder().encode(JSON.stringify({ aps: { alert: { title, body } } })).length;
        q('.ntl-out').textContent = `PUSH   title: ${title}\n       body:  ${body}\n\nSMS    ${body}`;
        q('.ntl-l').textContent = used; q('.ntl-e').textContent = gsm ? 'GSM-7 (160/SMS)' : 'UCS-2 (70/SMS)';
        q('.ntl-n').textContent = n; q('.ntl-s').textContent = segs; q('.ntl-p').textContent = bytes + ' B / 4096 B';
        const bad = [...new Set(chars.filter(c => !(GSM.includes(c) || EXT.includes(c))))].slice(0, 4).join(' ');
        q('.ntl-note').textContent = (used !== loc ? `There is no ${loc} template yet, so the fallback ${used} was used (better than an empty message). ` : '') + (gsm ? `All characters are in GSM-7: ${n} characters, ${segs} segment.` : `These characters are not in GSM-7: ${bad} ... so the whole SMS was sent as UCS-2: ${n} characters, ${segs} ${segs === 1 ? 'segment' : 'segments'}. Each segment costs money.`) + ' (In a long SMS, each segment needs a little space for joining information: 153 characters per segment in GSM-7, 67 in UCS-2.)';
      };
      upd();
    }},
    { type: 'p', html: `With the defaults, the English OTP is GSM-7, 84 characters, <strong>1 segment</strong>. The Hindi OTP has about the same number of characters (83), but it is UCS-2, so <strong>2 segments</strong>: roughly double the cost. In the payment template, a single <strong>₹</strong> symbol (it is not in GSM-7) turns the whole 90-character SMS into UCS-2, which means 2 segments; write "Rs." instead and even 92 characters fit in 1 segment. Pick Tamil and, since there is no template, it falls back to English. Small things like this make a difference of lakhs of rupees across crores of SMS.` },

    { type: 'h2', text: 'Deep dive 3: user preferences, opt-out and unsubscribe' },
    { type: 'p', html: `Remember the first screen in the image above: an on/off switch next to every type. These switches are the <strong>preferences</strong>. But xyz.com has 200 notification types, and no user will look at 200 switches. So we group types into a few <strong>categories</strong>, with one switch per category × channel:` },
    { type: 'table', head: ['Category (examples)', 'Push', 'Email', 'SMS', 'Can the user turn it off?'], rows: [
      ['Security (OTP, new login, password changed)', 'on', 'on', 'on', 'No. This protects the account'],
      ['Payments (debit, refund)', 'on', 'on', 'off', 'Can choose channels, but not turn it all off'],
      ['Social (comment, like, follow)', 'on', 'off', 'off', 'Yes'],
      ['Marketing (sale, offers, "new videos")', 'off', 'on', 'off', 'Yes, and by law it should be easy'],
    ]},
    { type: 'list', items: [
      `<strong>Check twice:</strong> at intake, and again on the worker right before sending. If a scheduled message is due tomorrow and the user unsubscribes tonight, tomorrow\'s message must not go either.`,
      `<strong>One-click unsubscribe for email:</strong> from 1 Feb 2024, Google requires senders of 5,000+ emails a day to Gmail to support one-click unsubscribe in marketing emails (the <code>List-Unsubscribe</code> and <code>List-Unsubscribe-Post</code> headers, RFC 8058) and to show a clear unsubscribe link in the body. If spam complaints go above 0.3%, emails start landing in spam.`,
      `<strong>Sign the unsubscribe link:</strong> the link holds the user ID and category plus a signature (a code made with our secret, HMAC), so nobody can put in someone else\'s ID and unsubscribe them, and it works in one click without login.`,
      `<strong>SMS in India:</strong> the telecom rules (TRAI TCCCPR 2018) require the user\'s consent for marketing SMS, respect for the DND registry, and honouring opt-outs; according to one summary, an opt-out must take effect within 7 days.`,
      `<strong>The phone setting is also a preference:</strong> if the user turned off notifications for the xyz app in phone settings, APNs/FCM still accept the message but it is not shown. When the app opens, send the permission status to the server, so for such users you pick email or in-app instead of push.`,
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common beginner mistake: "they unsubscribed, so send nothing"', html: `Unsubscribing from marketing means <em>marketing</em> stops, not the OTP or "password changed". If you keep one global switch, the user turns everything off to escape marketing and then misses a security alert. So categories are separate, and the security category cannot be turned off. The opposite mistake also happens: "this is marketing, but send it as transactional" (like "Your cart is waiting for you, with 10% off"). This breaks the user\'s trust, and in many countries it is also against the law.` },

    { type: 'h2', text: 'Deep dive 4: priority queues, for every channel' },
    { type: 'p', html: `A queue is a line: first in, first out (FIFO). On Diwali sale day, the marketing team dropped 10 lakh pushes in at once. 10 seconds later someone logged in and asked for an OTP. In one line, the OTP has to stand behind 8 lakh messages. See how long it waits in the simulator below:` },
    { type: 'callout', tone: 'term', title: 'Priority queue (separate lines)', html: `<strong>What it is:</strong> <em>separate</em> queues for urgent and normal work, each with its own workers. P0 = most urgent (OTP, payment, security), P1 = normal (social), P2 = bulk (marketing, digests).<br><strong>Why we need it:</strong> urgent work should never have to wait in line behind bulk work.<br><strong>Without it:</strong> on sale day the OTP is minutes late, and the user cannot log in.` },
    { type: 'custom', render(el) {
      let mode = 'one';
      el.innerHTML = `<div class="npq-m" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="row2" style="margin-top:10px">
          <div><label>Marketing burst (lakh messages): <strong class="npq-bv"></strong></label><input class="npq-b" type="range" min="1" max="50" step="1" value="10"></div>
          <div><label>Total worker speed (messages/s): <strong class="npq-tv"></strong></label><input class="npq-t" type="range" min="5000" max="100000" step="5000" value="20000"></div>
          <div><label>OTP arrives after (seconds): <strong class="npq-ov"></strong></label><input class="npq-o" type="range" min="0" max="60" step="1" value="10"></div>
          <div><label>Capacity reserved for P0 (%): <strong class="npq-sv"></strong></label><input class="npq-s" type="range" min="5" max="50" step="5" value="10"></div>
        </div>
        <svg class="npq-svg" viewBox="0 0 320 130" style="width:100%;height:auto;margin-top:10px" role="img" aria-label="How many messages are left in the queue over time"></svg>
        <div class="stats">
          <div class="stat"><span>OTP wait</span><strong class="npq-w"></strong></div>
          <div class="stat"><span>Marketing finishes</span><strong class="npq-f"></strong></div>
          <div class="stat"><span>Ahead of the OTP in line</span><strong class="npq-a"></strong></div>
        </div>
        <div class="calc-note npq-note"></div>`;
      const q = s => el.querySelector(s);
      const tm = s => s < 0.01 ? '~0 s (' + (s * 1000).toFixed(2) + ' ms)' : s < 60 ? s.toFixed(1) + ' s' : (s / 60).toFixed(1) + ' min';
      const sim = (B, T, O, S, m) => {
        const mk = m === 'one' ? T : T * (1 - S / 100), p0 = T * S / 100;
        const ahead = m === 'one' ? Math.max(0, B - T * O) : 0;
        const wait = m === 'one' ? (ahead + 1) / T : 1 / p0;
        return { ahead, wait, done: B / mk, mk };
      };
      const upd = () => {
        const B = +q('.npq-b').value * 1e5, T = +q('.npq-t').value, O = +q('.npq-o').value, S = +q('.npq-s').value;
        q('.npq-bv').textContent = q('.npq-b').value; q('.npq-tv').textContent = T.toLocaleString('en-IN'); q('.npq-ov').textContent = O + ' s'; q('.npq-sv').textContent = S + '%';
        const m = q('.npq-m'); m.innerHTML = '';
        [['one', 'One queue (FIFO)'], ['two', 'Separate P0 + P1 queues']].forEach(([v, t]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (v === mode ? ' on' : ''); b.textContent = t; b.onclick = () => { mode = v; upd(); }; m.appendChild(b); });
        const r = sim(B, T, O, S, mode), o = sim(B, T, O, S, mode === 'one' ? 'two' : 'one');
        const span = Math.max(r.done, o.done, O + r.wait) * 1.05, X = t => 10 + t / span * 300, Y = n => 105 - n / B * 90;
        let svg = `<line x1="10" x2="310" y1="105" y2="105" stroke="var(--line-2)"/>`;
        svg += `<polyline points="${X(0)},${Y(B)} ${X(r.done)},${Y(0)}" fill="none" stroke="var(--amber)" stroke-width="2"/><text x="${X(0) + 4}" y="${Y(B) - 4}" font-size="9" fill="var(--amber)" font-family="var(--f-mono)">marketing backlog</text>`;
        const a = X(O), d = X(Math.min(O + r.wait, span));
        svg += `<line x1="${a}" x2="${a}" y1="15" y2="105" stroke="var(--accent)" stroke-dasharray="3 3"/><text x="${a + 3}" y="24" font-size="9" fill="var(--accent)" font-family="var(--f-mono)">OTP arrives</text>`;
        svg += `<line x1="${d}" x2="${d}" y1="40" y2="105" stroke="${mode === 'one' ? 'var(--red)' : 'var(--green)'}" stroke-width="2"/><text x="${Math.min(d + 3, 250)}" y="50" font-size="9" fill="${mode === 'one' ? 'var(--red)' : 'var(--green)'}" font-family="var(--f-mono)">OTP sent</text>`;
        svg += `<text x="10" y="120" font-size="9" fill="var(--ink-2)" font-family="var(--f-mono)">0 s</text><text x="310" y="120" text-anchor="end" font-size="9" fill="var(--ink-2)" font-family="var(--f-mono)">${span.toFixed(0)} s</text>`;
        q('.npq-svg').innerHTML = svg;
        q('.npq-w').textContent = tm(r.wait); q('.npq-f').textContent = tm(r.done); q('.npq-a').textContent = Math.round(r.ahead).toLocaleString('en-IN');
        q('.npq-note').textContent = mode === 'one'
          ? `One line: ${Math.round(r.ahead).toLocaleString('en-IN')} messages ahead of the OTP, so the OTP went out after ${tm(r.wait)}. With separate queues the same OTP would go in ${tm(o.wait)}, and marketing would finish in ${tm(o.done)} (now ${tm(r.done)}).`
          : `Separate lines: the P0 line is empty and has ${S}% of the workers (${Math.round(T * S / 100).toLocaleString('en-IN')}/s), so the OTP goes in ${tm(r.wait)}. The price: marketing now finishes in ${tm(r.done)} (${tm(o.done)} with one line), because ${S}% of the capacity is reserved for P0. In good systems, idle P0 workers help P1, and switch back as soon as P0 work arrives.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `With the defaults (a burst of 10 lakh, 20,000 messages/s, the OTP 10 seconds later): in one line there are <strong>8 lakh messages</strong> ahead of the OTP, so it is <strong>40 seconds</strong> late. By then the user has already tapped "resend". In a separate P0 line (10% of capacity), the OTP goes in <strong>milliseconds</strong>. The price is visible too: marketing finishes in 55.6 seconds instead of 50. That is always a good deal.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner mistake: "one queue, just add a priority field"', html: `In a normal queue (like an AWS SQS standard queue or a Kafka topic), writing "priority: high" on a message does not change the line: the OTP still stands behind 8 lakh messages. Some brokers (like RabbitMQ) support priority, but even there the workers are one shared pool; one slow provider can hold all of them. Real priority means <strong>separate queues, separate workers, separate capacity</strong>. Netflix\'s RENO system (2022 post) also sends events to separate queues and separate compute clusters by priority, and Razorpay also split P0/P1 queues.` },
    { type: 'p', html: `And these lines should be separate <strong>for each channel</strong>: push-P0, push-P1, sms-P0, email-P1... Because if the SMS company is slow, sms-P0 fills up, not push-P0. How many lines? As many as needed: usually 2-3 priority levels × each channel. More lines = more things to monitor.` },

    { type: 'h2', text: 'Deep dive 5: broadcast, from one event to crores of messages' },
    { type: 'p', html: `"India won the match!" is one event, but it must reach 5 crore followers. The API cannot load a list of 5 crore users in one request: memory runs out and the request times out. The way to do it is <strong>fan-out</strong>, and in two levels.` },
    { type: 'callout', tone: 'term', title: 'Fan-out', html: `<strong>What it is:</strong> turning one input into many outputs. One event → lakhs of users, or one user → three channels (push + email + in-app).<br><strong>Why we need it:</strong> the size of a broadcast is not known in advance and can be huge; it has to be split into small pieces and spread over many workers.<br><strong>Without it:</strong> one machine sends 5 crore messages alone: it takes hours, and if it crashes halfway, nobody knows how far it got. The general pattern is in <a href="#/pattern-fanout">Real-time updates and fan-out</a>.` },
    { type: 'steps', items: [
      { t: 'Prepare the audience in advance', d: 'Pull out the user list of the segment (like "followers of team_india") into a file or table ahead of time, ready to read page by page. No heavy database query at broadcast time.' },
      { t: 'Level 1: cut the list into batches', d: 'The fan-out job reads the list page by page (say 1,000 users per page) and puts one "batch" message per page into a queue. 5 crore users = 50,000 batch messages.' },
      { t: 'Level 2: workers reach every user', d: 'Many workers pick up batches; for each user they check preferences + caps, render and send to the provider. If the provider has batch APIs, one call covers many devices.' },
      { t: 'Checkpoint', d: 'After each page, the job writes "done up to page 300". If it crashes, it restarts from page 301, not from zero.' },
    ]},
    { type: 'flow', height: 340, title: 'Broadcast fan-out',
      nodes: [
        { id: 'camp', label: 'Campaign svc', sub: 'match won!', x: 80, y: 170, w: 120, kind: 'server', info: 'What it is: the service (or a marketer\'s dashboard) that says "send this template to this segment". It sends only one request, not crores.' },
        { id: 'fo', label: 'Fan-out job', sub: 'pages → batches', x: 250, y: 170, w: 140, kind: 'server', info: 'What it is: a background job that reads the audience list page by page and makes one batch message per page. It writes a checkpoint after every page.' },
        { id: 'aud', label: 'Audience list', sub: 'pre-computed', x: 250, y: 50, w: 150, kind: 'data', info: 'What it is: the list of users in the segment, made in advance (a file or a table), with user_id and their device tokens. For the Super Bowl, Duolingo built this list weeks in advance and kept it in S3.' },
        { id: 'bq', label: 'Batch queue', sub: '50k batches', x: 420, y: 170, w: 130, kind: 'queue', info: 'What it is: the line of batches. One message holds 1,000 users. This cuts the number of messages on the queue by 1,000 times.' },
        { id: 'sw', label: 'Send workers', sub: 'very many', x: 590, y: 170, w: 130, kind: 'server', info: 'What it is: a large pool of workers that pick up a batch and check, render and send for every user. A separate pool for broadcasts, so daily notifications are not affected (bulkhead).' },
        { id: 'prov', label: 'APNs / FCM', sub: 'provider limits', x: 590, y: 290, w: 140, kind: 'net', info: 'What it is: the push services of Apple and Google. They have their own speed limits: according to the Firebase docs, the default quota of the FCM HTTP v1 API is 600k messages per minute (~10k/s) per project; above that, 429.' },
      ],
      edges: [{ a: 'camp', b: 'fo' }, { a: 'fo', b: 'aud' }, { a: 'fo', b: 'bq' }, { a: 'bq', b: 'sw' }, { a: 'sw', b: 'prov' }],
      scenarios: [
        { name: 'Match won: broadcast', steps: [
          { title: 'One request', go: 'camp>fo', text: 'The campaign service sent one request: segment + template + campaign_id.', msg: 'POST /v1/campaigns { campaign_id: "c_wc_final", segment: "followers_of:team_india", template: "match_won" }' },
          { title: 'The list, page by page', go: ['fo>aud', 'res:aud>fo'], text: 'The job read page 1 of the list (users 1-1,000). The whole list is never in memory at once.' },
          { title: 'Batches into the queue', flood: { paths: ['fo>bq'], n: 8 }, after: { bq: { state: 'hot', sub: '50,000 batches' } }, text: 'One batch message per page. 5 crore users ÷ 1,000 = 50,000 batches.' },
          { title: 'Workers spread out and send', flood: { paths: ['bq>sw', 'sw>prov'], n: 10 }, after: { bq: { state: '', sub: 'emptying' } }, text: 'Hundreds of workers pick up batches at the same time. Each batch: preference/cap check, render, send on the provider\'s batch API.' },
        ]},
        { name: 'Pressed twice', steps: [
          { title: 'The marketer double-clicked', go: ['camp>fo', 'camp>fo'], text: 'Two requests with the same campaign_id. Without dedupe, 5 crore people get "match won!" twice.' },
          { title: 'Dedupe by campaign ID', go: 'bad:fo>camp', after: { fo: { state: 'ok', sub: 'ran only once' } }, text: 'On the second request the job says "this campaign is already running". Duolingo saw this risk for the Super Bowl (several people pressing the trigger at once) and used the built-in 5-minute dedupe of an SQS FIFO queue.', msg: 'campaign c_wc_final already running → ignored' },
        ]},
        { name: 'Provider limit (429)', steps: [
          { title: 'Sent too fast', flood: { paths: ['sw>prov'], n: 8 }, after: { prov: { state: 'warn', sub: '429: quota full' } }, text: 'The workers sent faster than the provider\'s quota. FCM returns 429.' },
          { title: 'Speed set by the provider', go: ['bad:prov>sw'], after: { sw: { state: 'warn', sub: 'rate: 10k/s' } }, text: 'The workers share one limiter (a token bucket) that keeps them under the provider\'s limit. If you know a big event is coming, raise the quota in advance: according to the Firebase docs, a temporary quota increase must be requested 15+ days ahead.' },
        ]},
        { name: 'Job died halfway', steps: [
          { title: 'Crash at page 300', go: 'fo>bq', after: { fo: { state: 'down', sub: 'crash @ page 300' } }, text: 'The job\'s server went down. 3 lakh users got it; the other 4.97 crore did not.' },
          { title: 'Back from the checkpoint', go: ['fo>aud', 'res:aud>fo', 'fo>bq'], set: { fo: { state: 'ok', sub: 'resume @ page 301' } }, text: 'A new job reads the checkpoint ("up to page 300") and starts from 301. If page 300 had gone out only halfway, it goes again; per-user dedupe (below) protects those users from duplicates.' },
        ]},
      ],
    },

    { type: 'p', html: `How long will it take? Often the bottleneck is not our workers but the provider\'s speed limit. Try it:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Recipients (millions): <strong class="nfo-rv"></strong></label><input class="nfo-r" type="range" min="1" max="200" step="1" value="50"></div>
          <div><label>Send workers: <strong class="nfo-wv"></strong></label><input class="nfo-w" type="range" min="10" max="1000" step="10" value="200"></div>
          <div><label>Sends/second per worker (assumed): <strong class="nfo-sv"></strong></label><input class="nfo-s" type="range" min="50" max="2000" step="50" value="500"></div>
          <div><label>Batch size (users per message): <strong class="nfo-bv"></strong></label><input class="nfo-b" type="range" min="100" max="5000" step="100" value="1000"></div>
          <div><label>Provider limit (k sends/s): <strong class="nfo-pv"></strong></label><input class="nfo-p" type="range" min="10" max="1000" step="10" value="100"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Worker speed</span><strong class="nfo-t"></strong></div>
          <div class="stat"><span>Real speed (min)</span><strong class="nfo-e"></strong></div>
          <div class="stat"><span>Batch messages in queue</span><strong class="nfo-n"></strong></div>
          <div class="stat"><span>Until the last user (approx)</span><strong class="nfo-d"></strong></div>
        </div>
        <div class="calc-note nfo-note"></div>`;
      const q = s => el.querySelector(s);
      const tm = s => s < 60 ? s.toFixed(0) + ' sec' : s < 3600 ? (s / 60).toFixed(1) + ' min' : (s / 3600).toFixed(1) + ' hr';
      const k = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(0) + 'k' : String(n);
      const upd = () => {
        const R = +q('.nfo-r').value * 1e6, W = +q('.nfo-w').value, S = +q('.nfo-s').value, B = +q('.nfo-b').value, P = +q('.nfo-p').value * 1e3;
        q('.nfo-rv').textContent = q('.nfo-r').value + 'M'; q('.nfo-wv').textContent = W; q('.nfo-sv').textContent = S; q('.nfo-bv').textContent = B; q('.nfo-pv').textContent = k(P) + '/s';
        const thr = W * S, eff = Math.min(thr, P), secs = R / eff;
        q('.nfo-t').textContent = k(thr) + '/s'; q('.nfo-e').textContent = k(eff) + '/s';
        q('.nfo-n').textContent = k(Math.ceil(R / B));
        q('.nfo-d').textContent = tm(secs);
        q('.nfo-note').textContent = `${k(R)} ÷ ${k(eff)}/s ≈ ${tm(secs)}. ` + (thr > P ? 'The provider limit is the bottleneck: more workers will not help; raise the quota or split across several projects/providers. ' : 'The workers are the bottleneck: add more workers or make them faster. ') + (secs > 120 ? 'For a live match alert this is far too slow: the last user hears the news while the replay is on.' : 'Fine for a live alert.');
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `With the defaults: 200 workers × 500/s = 1 lakh/s, and the provider limit is also 1 lakh/s, so reaching 5 crore users takes ~<strong>8.3 minutes</strong>, with 50k batch messages in the queue. Now set the provider limit to FCM\'s default quota (10k/s): it takes ~<strong>1.4 hours</strong> (83 minutes), and even 1,000 workers do not change that. Two more tricks: <strong>most active users first</strong> (those who have the app open right now), and the <strong>provider\'s topic feature</strong> (FCM topics), where we give one message and Google does the fan-out. But with topics it is hard to apply per-user preferences, caps and language, so personalised notifications need our own fan-out.` },
    { type: 'h3', text: 'A real story: Duolingo\'s Super Bowl push (2024)' },
    { type: 'p', html: `In the February 2024 Super Bowl, Duolingo had a 5-second ad, and marketing wanted a push to reach ~4 million users\' phones while the ad was playing. According to Duolingo\'s blog, their largest push before that went to 500,000 users in 60 seconds, and even that caused some crashes. The result: <strong>3.9 seconds</strong> to reach 95% of users, and 5.7 seconds to reach 99%. According to a talk by a Duolingo engineer (InfoQ Dev Summit, July 2024), this is how:` },
    { type: 'list', items: [
      `<strong>The speed maths:</strong> 4 million ÷ 5 seconds = ~800,000 messages/second, while their normal speed was ~10k/second (80 times more).`,
      `<strong>Audience in advance:</strong> the list of users and device IDs was pulled out weeks in advance into S3, and loaded into the workers\' memory hours before the broadcast.`,
      `<strong>Batching:</strong> the queue (SQS) had its own speed limit, so one queue message held 500 iOS or 250 Android users. The "batch queue" above is the same idea.`,
      `<strong>Dedupe:</strong> the built-in 5-minute dedupe of an SQS FIFO queue, so even if several people pressed the trigger, it went out only once.`,
      `<strong>A separate cluster (bulkhead):</strong> the broadcast workers had their own ECS cluster (the AWS place to run containers), so the rest of the backend was not affected.`,
      `<strong>Watch the wave coming back:</strong> tapping the push made each app send 10-50 requests to the backend; 4 million taps = attacking yourself. They kept a mode to pause such app requests for a short time.`,
    ]},
    { type: 'callout', tone: 'warn', title: 'The hidden cost of a broadcast', html: `Sending the push is only half the job. After each push, some people open the app, and that traffic hits your <strong>other</strong> servers. 5 crore pushes × 5% opens × 20 requests = 5 crore requests within a few minutes. So send a broadcast in waves, or scale up your servers in advance.` },

    { type: 'h2', text: 'Deep dive 6: outside providers, and switching when one fails' },
    { type: 'p', html: `For push there is no route other than Apple and Google. But for SMS and email there are many companies, and any of them can become slow or go down at any time. If the OTP SMS does not go out, the user cannot log in: that is a direct loss for the business. So large systems usually keep <strong>two or more SMS vendors</strong> with a <strong>router</strong> between them. Companies have shared little about their exact routing rules; the design below is the common industry approach.` },
    { type: 'callout', tone: 'term', title: 'Provider router + circuit breaker', html: `<strong>What it is:</strong> the router is a small decision-making part: "which vendor should send this message?" It looks at each vendor\'s health (what % succeed, how long they take, what they cost). A <em>circuit breaker</em> is a switch: if a vendor fails again and again, treat it as "off" for a while and send traffic to the other one; after a while, send a little traffic to check whether it has recovered.<br><strong>Why we need it:</strong> one vendor going down should not stop the OTP.<br><strong>Without it:</strong> every message would first hang on the dead vendor until the timeout, and then fail. The full story of the circuit breaker is in the <a href="#/resilience">resilience lesson</a>.` },
    { type: 'callout', tone: 'term', title: 'Delivery receipt (DLR)', html: `<strong>What it is:</strong> a later message from the SMS vendor: "the message reached the phone" or "it failed (phone off, wrong number)". The vendor usually sends a callback (webhook) to one of our URLs.<br><strong>Why we need it:</strong> "the vendor accepted it" and "it reached the phone" are different things. A vendor\'s real success rate comes from DLRs.<br><strong>Without it:</strong> even if a vendor silently loses 30% of messages, we would think everything is fine.` },
    { type: 'flow', height: 340, title: 'SMS: vendor router and failover',
      nodes: [
        { id: 'w', label: 'SMS worker', sub: 'must send OTP', x: 90, y: 170, w: 130, kind: 'server', info: 'What it is: the worker of the SMS channel. It builds the message and asks the router which vendor to use.' },
        { id: 'rt', label: 'Vendor router', sub: 'health + cost', x: 270, y: 170, w: 140, kind: 'server', info: 'What it is: the deciding part. It picks a vendor by success rate, latency and price, and keeps a circuit breaker for each vendor.' },
        { id: 'hc', label: 'Vendor stats', sub: 'success %, latency', x: 270, y: 50, w: 160, kind: 'cache', info: 'What it is: the latest health of each vendor: what % succeeded in the last 5 minutes (from DLRs), how many timeouts, average time. The router reads this.' },
        { id: 'va', label: 'SMS vendor A', sub: 'cheap, primary', x: 480, y: 90, w: 150, kind: 'net', info: 'What it is: the first SMS company. It is cheaper, so on normal days all traffic goes here.' },
        { id: 'vb', label: 'SMS vendor B', sub: 'backup', x: 480, y: 250, w: 150, kind: 'net', info: 'What it is: the second SMS company, a little more expensive. It is the backup, and we always send some traffic through it too, so we know it is alive.' },
        { id: 'ph', label: 'Phone', sub: 'user', x: 650, y: 170, w: 100, kind: 'client', info: 'What it is: the user\'s phone, where the OTP should arrive.' },
      ],
      edges: [{ a: 'w', b: 'rt' }, { a: 'rt', b: 'hc' }, { a: 'rt', b: 'va' }, { a: 'rt', b: 'vb' }, { a: 'va', b: 'ph' }, { a: 'vb', b: 'ph' }],
      scenarios: [
        { name: 'A normal day', steps: [
          { title: 'Which vendor?', go: ['w>rt', 'rt>hc', 'res:hc>rt'], text: 'The router looked at the stats: A has 98% success, 2s latency, and is cheap. It picked A.', msg: 'A: 98% ok, 2.1s  |  B: 97% ok, 2.8s' },
          { title: 'A sent it', go: ['rt>va', 'res:va>rt', 'evt:va>ph'], after: { ph: { state: 'ok', sub: 'OTP 4821' } }, text: 'A accepted the message (gave its own message ID) and delivered it to the phone. A little later, A\'s DLR arrived: "delivered". The stats were updated.', msg: '202 { vendor_msg_id: "A-77812" }  ...  DLR: delivered' },
        ]},
        { name: 'Vendor A down', steps: [
          { title: 'A times out', go: ['w>rt', 'rt>va', 'bad:va>rt'], set: { va: { state: 'down', sub: 'timeouts' } }, text: 'A is not answering. After a 3-second timeout, it fails.' },
          { title: 'The circuit opens', go: ['rt>hc'], after: { hc: { state: 'warn', sub: 'A: circuit OPEN' } }, text: 'In the last minute, 50% of calls to A failed. The router opened A\'s circuit: no traffic to A for the next few minutes.' },
          { title: 'Sent through B', go: ['rt>vb', 'res:vb>rt', 'evt:vb>ph'], after: { ph: { state: 'ok', sub: 'OTP 4821' } }, text: 'The same OTP was sent through B. The user waited 3-4 seconds more, but the OTP arrived. A few minutes later the router will send a little traffic to A to check it.' },
        ]},
        { name: 'A slow, not dead', steps: [
          { title: 'A took too long', go: ['w>rt', 'rt>va'], set: { va: { state: 'warn', sub: 'very slow' } }, text: 'A did not answer within 3 seconds. The router treated it as a timeout.' },
          { title: 'Also sent through B', go: ['rt>vb', 'evt:vb>ph'], text: 'The router sent it through B.' },
          { title: 'Two OTPs!', go: 'evt:va>ph', after: { ph: { state: 'warn', sub: '2 SMS arrived' } }, text: 'A was actually alive, just slow. It also sent the message. The user got two SMS. So: (1) send the <strong>same OTP code</strong> in both, so there is no confusion; (2) for messages like marketing, fail over only when you are sure (a failed DLR came back); (3) record every failover. Failover is always a trade between "late" and "duplicate".' },
        ]},
      ],
    },
    { type: 'list', items: [
      `<strong>Channel fallback:</strong> the OTP went by push, but the app has not reported "received" within 20 seconds? Then send an SMS. Use the expensive route only when the cheap one fails.`,
      `<strong>Email works the same way:</strong> two email providers, and watch the count of bounces and complaints. If one provider\'s sending reputation drops, shift to the other.`,
      `<strong>Webhooks are the other way round:</strong> here the "provider" is the seller\'s own server. If it is slow, our workers get stuck. For exactly this reason, Razorpay moved the webhooks of customers that kept failing to a separate queue with lower priority.`,
    ]},

    { type: 'h2', text: 'Deep dive 7: retries, DLQ and stopping duplicates' },
    { type: 'h3', text: 'When to retry, and when not to' },
    { type: 'p', html: `The first decision: <strong>429 (sent too much), 5xx (a problem on the provider\'s side), timeout</strong> = a short-lived problem, so retry. <strong>400 (bad request), 410/UNREGISTERED (dead token), "wrong number", "user unsubscribed"</strong> = a permanent problem, so retrying is useless; record it and move on. The general story of retries is in the <a href="#/queues">Message queues</a> lesson; here are three new words:` },
    { type: 'callout', tone: 'term', title: 'Exponential backoff and jitter', html: `<strong>What it is:</strong> <em>Backoff</em> = wait a little longer after each failure: 1s, 2s, 4s, 8s (doubling each time, which is why it is "exponential"). <em>Jitter</em> = a random part in that wait, for example anywhere between 0 and 8s instead of exactly 4s.<br><strong>Why we need it:</strong> if 1,000 messages fail together and all retry exactly 1 second later, the provider again gets 1,000 at once (this is called a <em>thundering herd</em>). Jitter spreads the retries out over time.<br><strong>Without it:</strong> the provider falls over again as soon as it recovers, and messages use up their attempts and land in the DLQ.` },
    { type: 'callout', tone: 'term', title: 'DLQ (dead-letter queue)', html: `<strong>What it is:</strong> a separate line for messages that did not go out even after all attempts.<br><strong>Why we need it:</strong> do not throw them away, and do not retry them forever. Keep them there, send an alert, let a person check what is wrong, and when it is fixed, run them again (replay).<br><strong>Without it:</strong> either the message is silently lost, or one bad message blocks the line forever.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="nrj-modes" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="row2" style="margin-top:10px">
          <div><label>Provider capacity (sends/second): <strong class="nrj-cv"></strong></label><input class="nrj-c" type="range" min="50" max="1000" step="50" value="150"></div>
          <div><label>Provider outage (seconds): <strong class="nrj-ov"></strong></label><input class="nrj-o" type="range" min="0" max="10" step="1" value="2"></div>
          <div><label>Max attempts (then DLQ): <strong class="nrj-mv"></strong></label><input class="nrj-m" type="range" min="3" max="8" step="1" value="6"></div>
        </div>
        <svg class="nrj-svg" viewBox="0 0 320 120" style="width:100%;height:auto;margin-top:10px" role="img" aria-label="Retry attempts per second"></svg>
        <div class="stats">
          <div class="stat"><span>Delivered</span><strong class="nrj-ok"></strong></div>
          <div class="stat"><span>In the DLQ</span><strong class="nrj-dlq"></strong></div>
          <div class="stat"><span>Total attempts</span><strong class="nrj-tot"></strong></div>
          <div class="stat"><span>Max retries in one second</span><strong class="nrj-pk"></strong></div>
          <div class="stat"><span>Last delivery</span><strong class="nrj-last"></strong></div>
        </div>
        <div class="calc-note nrj-note"></div>`;
      const q = s => el.querySelector(s);
      const N = 1000, SPAN = 36;
      let jitter = false;
      const sim = (C, O, MAX, jit) => {
        let seed = 42; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
        const ev = []; for (let i = 0; i < N; i++) ev.push([0, 1]);
        const used = {}, att = {}; let ok = 0, dlq = 0, total = 0, last = 0;
        while (ev.length) {
          ev.sort((a, b) => a[0] - b[0]); const [t, k] = ev.shift(); total++;
          const b = Math.floor(t); if (k > 1) att[b] = (att[b] || 0) + 1;
          if (t >= O && (used[b] || 0) < C) { used[b] = (used[b] || 0) + 1; ok++; last = Math.max(last, t); continue; }
          if (k >= MAX) { dlq++; continue; }
          const d = Math.pow(2, k - 1);
          ev.push([t + (jit ? rnd() * d * 2 : d), k + 1]);
        }
        const vals = Object.values(att);
        return { ok, dlq, total, last, peak: vals.length ? Math.max(...vals) : 0, att };
      };
      const upd = () => {
        const C = +q('.nrj-c').value, O = +q('.nrj-o').value, MAX = +q('.nrj-m').value;
        q('.nrj-cv').textContent = C; q('.nrj-ov').textContent = O + 's'; q('.nrj-mv').textContent = MAX;
        const m = q('.nrj-modes'); m.innerHTML = '';
        [[false, 'Fixed backoff (1, 2, 4, 8s...)'], [true, 'Backoff + jitter']].forEach(([v, t]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (v === jitter ? ' on' : ''); b.textContent = t; b.onclick = () => { jitter = v; upd(); }; m.appendChild(b); });
        const r = sim(C, O, MAX, jitter), o = sim(C, O, MAX, !jitter);
        const maxY = Math.max(N, ...Object.values(r.att)), bw = 300 / SPAN;
        let svg = '';
        for (let s = 0; s < SPAN; s++) { const a = r.att[s] || 0, h = a / maxY * 90; if (a) svg += `<rect x="${10 + s * bw + 0.5}" y="${100 - h}" width="${bw - 1}" height="${h}" fill="${s < O ? 'var(--red)' : 'var(--accent)'}"><title>${s}s: ${a} retries</title></rect>`; }
        const cy = 100 - Math.min(C, maxY) / maxY * 90;
        svg += `<line x1="10" x2="310" y1="${cy}" y2="${cy}" stroke="var(--green)" stroke-dasharray="4 3"/><text x="310" y="${cy - 3}" text-anchor="end" font-size="9" fill="var(--green)" font-family="var(--f-mono)">capacity ${C}/s</text>`;
        svg += `<line x1="10" x2="310" y1="100" y2="100" stroke="var(--line-2)"/><text x="10" y="114" font-size="9" fill="var(--ink-2)" font-family="var(--f-mono)">0s</text><text x="310" y="114" text-anchor="end" font-size="9" fill="var(--ink-2)" font-family="var(--f-mono)">${SPAN}s  (bars = retries per second)</text>`;
        q('.nrj-svg').innerHTML = svg;
        q('.nrj-ok').textContent = r.ok; q('.nrj-dlq').textContent = r.dlq; q('.nrj-tot').textContent = r.total;
        q('.nrj-pk').textContent = r.peak; q('.nrj-last').textContent = r.last.toFixed(1) + 's';
        q('.nrj-note').textContent = `1,000 messages failed together. ${jitter ? 'With jitter' : 'Without jitter'}: ${r.ok} delivered, ${r.dlq} in the DLQ, ${r.total} attempts. With the other method: ${o.ok} delivered, ${o.dlq} in the DLQ, ${o.total} attempts. ` + (jitter ? (r.dlq < o.dlq ? 'The retries were spread out over time, so the provider\'s capacity was used every second and fewer messages went to the DLQ.' : r.last > o.last + 1 ? 'This time the provider had plenty of room, so jitter only added delay.' : 'The retries were spread out over time.') : (r.dlq > 0 ? 'All retries hit in the same second: those above capacity fail again, and when their attempts run out they go to the DLQ.' : 'There was enough capacity, so everything got through quickly even without jitter.')) + ' (Jitter: a random delay between 0 and 2×, seeded.)';
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `With the defaults (capacity 150/s, a 2-second outage, 6 attempts): without jitter only <strong>600 are delivered and 400 go to the DLQ</strong>, because in every wave all retries arrive together and only 150 get through in a second. With jitter <strong>all 1,000 are delivered</strong>, and attempts drop from 5,100 to 3,675. But set the capacity to 1,000/s: without jitter everything is done in 3 seconds, with jitter in ~16 seconds. Jitter is not free: it protects the provider by making some messages a little late. So for urgent messages like an OTP, keep attempts few and delays short, and switch to another vendor or channel quickly.` },

    { type: 'h3', text: 'Where duplicates come from, and how to stop them' },
    { type: 'p', html: `Duplicates come from two places. <strong>(1) Producer retry</strong>: the payment service sent the request again after a timeout. The API\'s idempotency key stops this (we saw it in the intake diagram). <strong>(2) Queue redelivery</strong>: queues are usually <em>at-least-once</em>, meaning "at least once, sometimes twice". A worker sent to APNs but crashed before it could ack. The queue thinks the work was not done and gives the message to another worker, and the user gets two notifications.` },
    { type: 'steps', items: [
      { t: 'A fixed ID for every message', d: 'notification_id + channel (like n_7f3a:push) is created at intake and never changes across retries.' },
      { t: '"Claim" before sending', d: 'The worker runs SET sent:n_7f3a:push NX EX 86400 in Redis. If it gets it, it sends; if not, someone else already sent it, so it skips and acks. After sending, the status in the database becomes "sent".' },
      { t: 'Help from the provider', d: 'APNs apns-collapse-id and the FCM collapse key: if two notifications with the same ID arrive, the new one replaces the old one on the phone, so they do not show up as two. Email and SMS have no such undo, so the claim step matters even more there.' },
      { t: 'Dedupe by meaning', d: 'Different IDs, same meaning: "Riya liked your photo" 3 times. A system like LinkedIn\'s ATC filters this: do not send a notification about the same thing again, and do not send one about something the user has already seen on the site. Or combine them: "Riya and 2 others liked your post".' },
    ]},
    { type: 'callout', tone: 'warn', title: 'The dream of exactly-once', html: `Even "claim, then send" has a small gap: if the worker dies after the claim but before sending, nobody sends until the claim\'s time (TTL) runs out (late). If you claim after sending, a crash causes a duplicate. Across a network <strong>there is no guarantee of exactly-once delivery</strong>; we make duplicates very rare and keep delays bounded. For transactional messages, "sometimes a duplicate" is usually considered better than "sometimes missing" (getting the OTP twice is fine, not getting it is not).` },
    { type: 'h3', text: 'Webhooks: when the "phone" is a company\'s server' },
    { type: 'p', html: `In the webhook channel we POST to the seller\'s server. All the same rules apply here, plus some new ones. The official docs of Stripe (a payments company) are a good example:` },
    { type: 'list', items: [
      `<strong>Long retries:</strong> in live mode, Stripe resends a failed webhook for <strong>up to 3 days</strong> with exponential backoff. Even if the seller\'s server was down all night, the events arrive in the morning.`,
      `<strong>Signature:</strong> every request has a header with a timestamp + an HMAC-SHA256 signature made with the seller\'s secret. The seller checks that the request really came from Stripe and not from a fake sender. If the timestamp is old (more than 5 minutes by default), reject it, so nobody can replay an old request (a replay attack).`,
      `<strong>Duplicates and order:</strong> Stripe says clearly that the same event can sometimes arrive twice and that order is not guaranteed. The seller should log event IDs and dedupe.`,
      `<strong>Answer 2xx quickly:</strong> the seller should first return "got it" (2xx) and do the heavy work later from a queue. Otherwise there is a timeout, we think it failed, and the retry becomes a duplicate.`,
    ]},

    { type: 'h2', text: 'Deep dive 8: rate limiting and frequency capping' },
    { type: 'p', html: `"How much is too much?" This question comes up in four different places, and each place needs a counter. The counters work the same way we learned in the <a href="#/rate-limiting">Rate limiting</a> lesson (a token bucket or a window counter in Redis).` },
    { type: 'callout', tone: 'term', title: 'Frequency cap', html: `<strong>What it is:</strong> the maximum number of notifications one user gets in one category in a period of time, like "3 marketing pushes per day" or "at least 2 hours between two pushes".<br><strong>Why we need it:</strong> every team thinks its notification is the most important. Added together, they flood the user, who then turns notifications off or uninstalls the app.<br><strong>Without it:</strong> 40 pushes in one day. Uber wrote in 2022 that its Uber Eats pushes came from different teams, minutes apart, sometimes saying opposite things; to fix this they built a central layer (see below).` },
    { type: 'table', head: ['Limit on', 'Example', 'Why'], rows: [
      ['Each user (frequency cap)', 'Marketing push: 3/day, 2 hours apart', 'Protect the user\'s attention and trust'],
      ['Each producer / team / customer', 'Marketing team: 1 crore/hour; Razorpay: separate limits per customer and per notification type', 'One team\'s or one customer\'s bug should not sink everyone (LinkedIn\'s ATC also rate-limited upstream apps)'],
      ['Each provider', 'FCM default 600k/minute per project; on Android up to 240/minute and 5,000/hour to one device', 'Breaking the provider\'s limit gives 429, and then everything slows down'],
      ['Each phone number (OTP)', '3 OTPs / 10 minutes per number, and per IP', 'So a script cannot trigger thousands of OTP SMS and raise our SMS bill'],
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common beginner mistake: "the cap is reached, so throw the message away"', html: `When the cap is full, throwing the message away is not always right. Three options: <strong>drop</strong> it (less important, like "new videos"), <strong>delay</strong> it (tomorrow morning), or <strong>combine</strong> it (a digest: "7 people liked your post today"). And caps apply only to marketing/social; a cap on OTPs and security alerts would lock the user out of their own account.` },

    { type: 'h2', text: 'Deep dive 9: quiet hours, time zones and scheduling' },
    { type: 'p', html: `xyz.com has users in India, Dubai and New York. "No marketing after 11 PM" means <strong>the user\'s</strong> night, not the server\'s. So save every user\'s time zone (like <code>Asia/Kolkata</code>, a name and not just "+5:30", because in many countries the clocks change twice a year, which is called daylight saving time) and make every decision in the user\'s local time.` },
    { type: 'callout', tone: 'term', title: 'Quiet hours', html: `<strong>What it is:</strong> the hours in the user\'s local time when less important notifications are not sent, like 11 PM to 8 AM.<br><strong>Why we need it:</strong> a phone ringing at 2 AM with "sale!" is the fastest way to annoy a user. In India, for promotional SMS it is even a telecom rule: only 9 AM to 9 PM IST.<br><strong>Without it:</strong> complaints, uninstalls, and for SMS, breaking the law. Quiet hours never apply to an OTP: the user just pressed login themselves.` },
    { type: 'p', html: `Look at the decision for one user yourself. Rules: quiet hours 11 PM-8 AM (user\'s local time), marketing cap 3/day. The OTP is above all rules, social respects quiet hours, marketing respects both:` },
    { type: 'custom', render(el) {
      const TZ = [['IN', 'India (UTC+5:30)', 5.5], ['AE', 'Dubai (UTC+4)', 4], ['NY', 'New York (UTC-4, now)', -4]];
      const TY = [['otp', 'OTP'], ['social', 'Social (comment)'], ['mkt', 'Marketing (sale)']];
      let tz = 'IN', ty = 'mkt';
      el.innerHTML = `<div class="nqh-a" style="display:flex;flex-wrap:wrap;gap:8px"></div><div class="nqh-b" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"></div>
        <div class="row2" style="margin-top:10px">
          <div><label>Server time (UTC): <strong class="nqh-uv"></strong></label><input class="nqh-u" type="range" min="0" max="23.5" step="0.5" value="19.5"></div>
          <div><label>Marketing pushes already sent today: <strong class="nqh-cv"></strong></label><input class="nqh-c" type="range" min="0" max="5" step="1" value="1"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>User's local time</span><strong class="nqh-l"></strong></div>
          <div class="stat"><span>Decision</span><strong class="nqh-d"></strong></div>
          <div class="stat"><span>Sent at (local)</span><strong class="nqh-s"></strong></div>
          <div class="stat"><span>Sent at (UTC)</span><strong class="nqh-z"></strong></div>
        </div>
        <div class="calc-note nqh-note"></div>`;
      const q = s => el.querySelector(s);
      const hm = h => { h = ((h % 24) + 24) % 24; const H = Math.floor(h), M = Math.round((h - H) * 60); return String(H).padStart(2, '0') + ':' + String(M).padStart(2, '0'); };
      const chips = (box, opts, cur, set) => { box.innerHTML = ''; opts.forEach(([v, t]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (v === cur ? ' on' : ''); b.textContent = t; b.onclick = () => { set(v); upd(); }; box.appendChild(b); }); };
      const upd = () => {
        chips(q('.nqh-a'), TY, ty, v => ty = v); chips(q('.nqh-b'), TZ.map(t => [t[0], t[1]]), tz, v => tz = v);
        const U = +q('.nqh-u').value, C = +q('.nqh-c').value, off = TZ.find(t => t[0] === tz)[2];
        q('.nqh-uv').textContent = hm(U); q('.nqh-cv').textContent = C + ' / 3';
        const L = ((U + off) % 24 + 24) % 24, quiet = L >= 23 || L < 8;
        let d, sendL = L, why;
        if (ty === 'otp') { d = 'Send now'; why = 'The OTP is transactional: the user just asked for it. Quiet hours and caps do not apply.'; }
        else if (ty === 'mkt' && C >= 3) { d = 'Not today'; sendL = null; why = 'Today\'s marketing cap (3) is full. Keep it for tomorrow or add it to a digest, or drop it if it will be useless by tomorrow.'; }
        else if (quiet) { sendL = ty === 'mkt' ? 9 : 8; d = 'Later'; why = `It is ${hm(L)} for the user, inside quiet hours (23:00-08:00). ${ty === 'mkt' ? 'Marketing goes at 09:00 local time' : 'Social goes at 08:00 local time, or in the morning digest'}.`; }
        else { d = 'Send now'; why = `It is ${hm(L)} for the user: not quiet hours${ty === 'mkt' ? ', and the cap still has room (' + C + '/3)' : ''}.`; }
        const wait = sendL == null ? null : ((sendL - L) % 24 + 24) % 24;
        q('.nqh-l').textContent = hm(L); q('.nqh-d').textContent = d;
        q('.nqh-s').textContent = sendL == null ? 'tomorrow / digest' : hm(sendL);
        q('.nqh-z').textContent = sendL == null ? '-' : hm(U + wait);
        q('.nqh-note').textContent = why + (wait ? ` That is ${wait} hours from now. The scheduler keeps it with a "send_at" time, and checks preferences again before sending.` : '');
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `With the defaults: the server says UTC 19:30, which is <strong>01:00</strong> at night in India. The marketing push falls in quiet hours, so it is set for <strong>09:00 IST</strong> (UTC 03:30), 8 hours later. At the same moment, the same push would go at once to a New York user, for whom it is 15:30. And the OTP? Always right away.` },

    { type: 'h3', text: 'Scheduling: how "send tomorrow at 9 AM" works' },
    { type: 'callout', tone: 'term', title: 'Scheduler', html: `<strong>What it is:</strong> a background service that holds messages meant for "later" and puts them in the queue when the right time comes.<br><strong>Why we need it:</strong> quiet hours, "9 AM local" campaigns and reminders ("your class is tomorrow") are all future work.<br><strong>Without it:</strong> either everything goes at once, or every team writes its own cron job, which silently loses messages when it crashes.` },
    { type: 'list', items: [
      `<strong>The simple way:</strong> a <code>scheduled</code> table with an index on <code>send_at</code>. Every few seconds the scheduler asks "give me 1,000 whose send_at is now or earlier", puts them in the queue, and marks each row "queued" (with a row lock or a "claim" step, so two schedulers do not take the same row).`,
      `<strong>Time buckets at large scale:</strong> Uber explained in 2022 that its push system (the Consumer Communication Gateway) spreads scheduling over <strong>one Kafka topic per hour</strong> and Cadence (a workflow engine), and handles "tens of thousands" of triggers per second this way.`,
      `<strong>A "9 AM local" campaign = waves:</strong> 9 AM in India, Dubai and London are different UTC times. The campaign is not one send but one wave per time zone. This also spreads the load by itself.`,
      `<strong>Expiry (send_by):</strong> "the match starts in 5 minutes" is useless 2 hours late. Every message carries a "do not send after this" time, and the worker checks it before sending. For push, apns-expiration / FCM TTL also do this job.`,
      `<strong>Picking the best time:</strong> Uber\'s system uses an ML model (XGBoost) to estimate, for each user, which hour gives the best chance that a push leads to a useful result, then uses linear programming to plan the whole day, respecting expiry, send windows, the daily cap and the minimum gap between two pushes. LinkedIn\'s ATC also sent at the times when the member was active.`,
    ]},

    { type: 'h2', text: 'Deep dive 10: delivery tracking and analytics' },
    { type: 'p', html: `"I did not get my OTP." The support team has to answer this. The marketing team wants to know which template got more clicks. For that, every message needs a story: when it was created, when it was sent, whether it arrived, whether it was opened.` },
    { type: 'table', head: ['Status', 'Meaning', 'Who reports it', 'How reliable'], rows: [
      ['accepted / queued', 'We took it, it is in the line', 'Our API', 'Certain'],
      ['skipped', 'Deliberately not sent (preference, cap, expiry), with the reason', 'Our API / worker', 'Certain'],
      ['sent', 'The provider accepted it', 'The provider\'s answer (200 / message ID)', 'Certain, but not about the phone'],
      ['delivered', 'It reached the phone / inbox', 'SMS: the vendor\'s DLR. Email: the provider\'s "delivered"/bounce. Push: APNs gives no such receipt; the app reports it itself, or FCM delivery reports', 'Depends on the channel'],
      ['opened', 'The user saw it', 'Push: the app (tap). Email: a hidden image (pixel) loaded', 'Weak for email (see below)'],
      ['clicked', 'The user tapped a link', 'Our tracking link (redirect)', 'Good'],
      ['failed', 'Not sent, and why (410, bounce, phone off)', 'Provider / worker', 'Certain'],
    ]},
    { type: 'flow', height: 340, title: 'The path of status events',
      nodes: [
        { id: 'w', label: 'Workers', sub: 'sent / failed', x: 90, y: 60, w: 130, kind: 'server', info: 'What it is: the same channel workers. After each send they put a small status event into the stream; they do not write to the database directly.' },
        { id: 'prov', label: 'Providers', sub: 'SMS / email', x: 90, y: 170, w: 130, kind: 'net', info: 'What it is: the SMS and email companies. Later they report through a callback (webhook): delivered, bounced, spam complaint, unsubscribe.' },
        { id: 'app', label: 'xyz app', sub: 'open / click', x: 90, y: 280, w: 130, kind: 'client', info: 'What it is: the user\'s app or browser. When a push is tapped (opened) or a tracking link is opened (clicked), it sends an event.' },
        { id: 'cb', label: 'Events API', sub: 'callbacks + app', x: 280, y: 225, w: 140, kind: 'server', info: 'What it is: the endpoint that receives the providers\' callbacks and the app\'s open/click events. It checks the callback signature, puts the event into the stream and quickly returns 200.' },
        { id: 'st', label: 'Status stream', sub: 'Kafka / Kinesis', x: 460, y: 140, w: 140, kind: 'queue', info: 'What it is: a long, ordered list (a log) of events that many consumers read at their own speed. All status events come here. If the database is slow, events wait here; sending does not stop.' },
        { id: 'db', label: 'Status DB', sub: 'latest per msg', x: 640, y: 70, w: 130, kind: 'data', info: 'What it is: the latest status of every message (for support: "what happened to the OTP?"). A consumer writes the events in batches.' },
        { id: 'an', label: 'Analytics', sub: 'warehouse', x: 640, y: 220, w: 130, kind: 'data', info: 'What it is: a big store of all events (a data warehouse), used for funnels, A/B tests, success rate per provider and unsubscribe rate.' },
      ],
      edges: [{ a: 'w', b: 'prov' }, { a: 'w', b: 'st' }, { a: 'prov', b: 'cb' }, { a: 'app', b: 'cb' }, { a: 'cb', b: 'st' }, { a: 'st', b: 'db' }, { a: 'st', b: 'an' }],
      scenarios: [
        { name: 'The journey of an SMS', steps: [
          { title: 'Sent, "sent"', go: ['w>prov', 'evt:w>st'], text: 'The worker sent the SMS to the vendor, and the vendor gave its message ID. The worker put a "sent" event into the stream.', msg: '{ n: "n_7f3a", ch: "sms", status: "sent", vendor_msg_id: "A-77812", t: 10:30:01 }' },
          { title: 'The DLR arrived', go: ['evt:prov>cb', 'evt:cb>st'], text: '4 seconds later, the vendor\'s callback: delivered. The Events API found our notification by vendor_msg_id and added the event.', msg: 'POST /callbacks/sms  { id: "A-77812", status: "DELIVRD" }' },
          { title: 'Database and analytics', go: ['evt:st>db', 'evt:st>an'], after: { db: { state: 'ok', sub: 'n_7f3a: delivered' } }, text: 'Two consumers: one writes the latest status to the database (for support), one writes to the warehouse (for reports). Now support can say: "the OTP reached your phone at 10:30:05."' },
        ]},
        { name: 'Open and click', steps: [
          { title: 'A tap on the push', go: ['app>cb', 'evt:cb>st', 'evt:st>an'], text: 'The user tapped the push: the app sent "opened", with the notification_id.', msg: '{ n: "n_9a1c", event: "opened" }' },
          { title: 'A link click', go: ['app>cb', 'evt:cb>st', 'evt:st>an'], after: { an: { state: 'ok', sub: 'funnel ready' } }, text: 'The link in the email was really our short tracking link (like a <a href="#/url-shortener">URL shortener</a>): first the click is recorded, then it redirects to the real page.' },
        ]},
        { name: 'Callbacks out of order and twice', steps: [
          { title: 'Delivered came first', go: ['evt:prov>cb', 'evt:cb>st', 'evt:st>db'], text: 'Because of the network, the "delivered" callback arrived before the "sent" event. And the vendor sent one callback twice.' },
          { title: 'Status only moves forward', focus: ['db'], after: { db: { state: 'ok', sub: 'delivered (stays)' } }, text: 'Treat the status as a ladder (a state machine): queued → sent → delivered → opened → clicked. If an old or lower event arrives, ignore it. A duplicate callback (same vendor_msg_id + status) is also ignored.' },
        ]},
        { name: 'Status DB slow', steps: [
          { title: 'Pressure on the database', set: { db: { state: 'warn', sub: 'writes slow' } }, flood: { paths: ['evt:w>st'], n: 8 }, after: { st: { state: 'warn', sub: 'backlog growing' } }, text: 'On sale day, status writes are more than the database can handle.' },
          { title: 'Sending did not stop', go: ['w>prov'], set: { w: { state: 'ok', sub: 'normal speed' } }, text: 'The workers only write to the stream and do not wait for the database, so sending is normal. The database consumer writes in batches at its own speed and clears the backlog. Razorpay made exactly this change (see below).' },
        ]},
      ],
    },
    { type: 'callout', tone: 'warn', title: 'Do not trust email "opens" too much', html: `An email open is usually measured with a hidden 1×1 image: if the image loaded, the email was opened. But with Apple\'s Mail Privacy Protection, the Mail app loads remote content (images) in the background <em>as soon as the message arrives</em>, without the user opening it. So many "opens" are not real. Clicks and later actions (bought something, logged in) are more reliable. The same goes for push "delivered": FCM gives delivery reports and a BigQuery export, but late (hours to days), so for real time, use the app\'s own "received" event.` },

    { type: 'h2', text: 'What real companies did' },
    { type: 'h3', text: 'LinkedIn ATC: "what to send" is a system too (2018)' },
    { type: 'p', html: `So far we mostly built "how to send". LinkedIn\'s 2018 post explains that at large scale the real difficulty is "<strong>should we send this at all</strong>". Their platform was called <strong>Air Traffic Controller (ATC)</strong>, and its goal was the "5 Rights": the right message, to the right member, on the right channel, at the right time, with the right frequency. According to the post, ATC did these jobs:` },
    { type: 'list', items: [
      `<strong>Filtering:</strong> duplicates, expired content, or something the member already saw on the site: do not send. Rate limits on upstream apps so no team can spam.`,
      `<strong>Aggregation:</strong> combining many notifications into one digest (like a weekly email), ranked by relevance.`,
      `<strong>Channel selection:</strong> email, push, SMS, in-app or desktop, based on the member\'s settings and ML models (will they click, will they turn notifications off).`,
      `<strong>Delivery time optimization:</strong> looking at the member\'s time zone, not during sleep, and when they are most active.`,
      `<strong>Inside:</strong> requests and signals from Kafka, processing with Samza (a stream processing framework), and each member\'s state in RocksDB (a fast local key-value store). All requests were <strong>partitioned by member ID</strong>, so all of one member\'s data sat locally on one machine (less than a millisecond instead of a network call). The local state was backed up in Kafka.`,
    ]},
    { type: 'p', html: `According to the post, ATC handled more than 1 billion requests a day, member complaints were cut in half, and the P90 latency (90% of messages arrive faster than this) for member-to-member message pushes went from ~12 seconds to ~1.5 seconds. The post is from 2018; LinkedIn\'s system has surely moved on since, but the idea of a "decision layer" is still standard.` },
    { type: 'h3', text: 'Uber CCG: working out the timing of pushes (2022)' },
    { type: 'p', html: `According to Uber\'s November 2022 post, Uber Eats pushes came from marketing, city teams and product teams, and by the end of 2020 they had grown to billions per month. Problems: some pushes were late, links were broken, there were duplicates, messages minutes apart said opposite things, and there was no personalised timing. They built the <strong>Consumer Communication Gateway (CCG)</strong>, a central layer that manages the quality, ranking, timing and frequency of each user\'s pushes. Parts: incoming pushes go into an <strong>inbox</strong> (sharded MySQL, partitioned by user ID), a <strong>schedule generator</strong> plans the day with ML + linear programming, a <strong>scheduler</strong> (one Kafka topic per hour + Cadence), and <strong>delivery</strong>, which does a final check right before sending (for example, whether the push is still valid or has expired).` },
    { type: 'h3', text: 'Razorpay: when the database became the bottleneck' },
    { type: 'p', html: `Razorpay (an Indian payments company) has a notification service that sends SMS, email and webhooks. According to their engineering blog post (the exact year is not clear on the source; newsletters summarised it in Oct 2022, so it is at least that old), the old design was simple: API pods checked the request and put it into SQS (AWS\'s queue service), workers sent it and wrote the result straight into the database and the data lake, and a scheduler regularly put failed requests back into SQS. It could handle up to ~2K TPS (transactions per second), with a peak of ~1K TPS, but at that level the p99 latency (everything except the slowest 1% is faster than this) rose from ~2 to ~4 seconds.` },
    { type: 'table', head: ['Problem', 'Their fix'], rows: [
      ['One queue: bulk messages in the festive season blocked transactional ones', 'Priority by request type and customer, separate P0/P1 queues'],
      ['One customer\'s flood slowed everyone down', 'Rate limiter: per customer and per notification type'],
      ['Each worker wrote to the database right away; the database\'s write capacity (IOPS) stopped the workers from scaling', 'Workers put results into a Kinesis stream, and separate consumers write to the database and the data lake (async writes)'],
      ['Slow customer endpoints (webhooks) held the workers up', 'A separate queue and workers for retries; lower priority for customers that keep failing'],
    ]},
    { type: 'p', html: `The lesson is the same one the napkin maths showed: the bottleneck of a notification service is often <strong>not sending, but writing its own status</strong>. Put status into an event stream and write it in batches.` },
    { type: 'h3', text: 'Netflix RENO: push + pull (2022)' },
    { type: 'p', html: `Netflix\'s Rapid Event Notification System (2022 post) tells devices that something changed (like "the watch list was updated"). Two things are useful here: events go to <strong>separate queues and separate clusters by priority</strong>, and the model is <strong>hybrid</strong>: devices that are online right now get a push, and other devices pull the missed events by themselves (stored in Cassandra). We saw this as the in-app inbox. To reduce load, they also added filters like dropping very old events and pushing only to online devices.` },

    { type: 'h2', text: 'What can break' },
    { type: 'table', head: ['Failure', 'Effect', 'Protection'], rows: [
      ['Provider (APNs, SMS vendor) down or slow', 'One channel stops', 'Queue + retry (backoff + jitter), bulkhead per channel, a second vendor (router + circuit breaker), channel fallback for the OTP'],
      ['Worker crash: sent, but before the ack', 'Duplicate', 'Claim step (SET NX), collapse id, idempotency key'],
      ['A flood of marketing campaigns', 'The OTP is late', 'Separate P0/P1 queues and workers'],
      ['The broadcast job dies halfway', 'Only half the users got it', 'Checkpoint per page, per-user dedupe'],
      ['The marketer pressed twice', 'Crores get it twice', 'Dedupe by campaign ID'],
      ['Provider limit (429)', 'Everything slows down, a storm of retries', 'A shared limiter under the provider\'s limit, raise the quota in advance'],
      ['Dead device tokens pile up', 'Useless sends, cost', 'Delete on 410/UNREGISTERED, refresh the token on app start'],
      ['A template bug', 'Lakhs of people get "Hi {{name}}"', 'Versioned templates, preview/test send, rollback, fallback locale'],
      ['Status DB bottleneck', 'Workers slow, latency up', 'Status events into a stream, batch writes (Razorpay)'],
      ['The wave coming back after a push', 'A mountain of traffic on the rest of the backend', 'Send in waves, scale servers in advance (Duolingo)'],
      ['Scheduler down', 'Scheduled messages late', 'Several scheduler copies + claim, a send_by expiry so very late ones are not sent'],
      ['Phone offline', 'The push is lost', 'In-app inbox, the right TTL, SMS/email if it matters'],
    ]},

    { type: 'callout', tone: 'why', title: 'Decide', html: `<strong>Always separate queues and workers</strong> for transactional and marketing, and separate ones per channel. Give the producer 202, send asynchronously. Decide before sending: dedupe, preference, quiet hours, cap. Retry only on 429/5xx/timeout, with backoff + jitter, then the DLQ. Treat push as best effort: put important things in the in-app inbox too. To avoid duplicates, use an idempotency key (intake) + a claim (delivery). Keep at least two vendors for SMS/email. Write status to a stream, not straight to the database.` },
    { type: 'h2', text: 'How to say it in an interview' },
    { type: 'steps', items: [
      { t: 'Requirements', d: 'Channels (push, SMS, email, in-app, webhook), transactional vs marketing, OTP latency, preferences, scale (broadcast size).' },
      { t: 'Napkin maths', d: 'Sends/s on average and at peak, status writes/s (several times more), SMS cost, provider limits.' },
      { t: 'API + data model', d: '202 Accepted + idempotency key; templates, prefs, devices, notifications/deliveries, inbox, scheduled.' },
      { t: 'High-level design', d: 'API → decide (dedupe, prefs, quiet hours, caps) → priority queues per channel → channel workers → providers → status stream.' },
      { t: 'Deep dives', d: 'Device tokens + APNs/FCM; fan-out in batches; provider router + failover; retries + jitter + DLQ; claim before send; scheduling + time zones; tracking.' },
      { t: 'Real examples', d: 'LinkedIn ATC (decision layer, 2018), Uber CCG (timing, 2022), Razorpay (P0/P1 + async status), Netflix RENO (push + pull, 2022), Duolingo (4M pushes in seconds, 2024).' },
    ]},

    { type: 'diagram', title: 'The whole design at a glance', height: 700,
      groups: [
        { label: 'Producers', x: 10, y: 6, w: 550, h: 96 },
        { label: 'Intake', x: 10, y: 120, w: 550, h: 98 },
        { label: 'Queues + workers', x: 10, y: 244, w: 550, h: 200 },
        { label: 'Providers', x: 10, y: 476, w: 550, h: 92 },
        { label: 'Data', x: 572, y: 120, w: 140, h: 448 },
      ],
      nodes: [
        { id: 'svc', label: 'Services', sub: 'payments, login...', x: 110, y: 60, w: 150, kind: 'server', info: 'What it is: all the xyz.com services that want to tell users something. They only send type + data; they do not know how to send it.' },
        { id: 'camp', label: 'Campaign svc', sub: 'broadcast', x: 480, y: 60, w: 150, kind: 'server', info: 'What it is: the marketing or live-events service that wants to send to a segment (lakhs of users) at once.' },
        { id: 'api', label: 'Notification API', sub: '202 Accepted', x: 110, y: 170, w: 150, kind: 'server', info: 'What it is: the front door of the notification system. It decides dedupe, preferences, quiet hours, caps and priority, then puts the message in a queue. The producer gets 202 right away.' },
        { id: 'sch', label: 'Scheduler', sub: 'send_at', x: 300, y: 170, w: 120, kind: 'server', info: 'What it is: it holds "send later" messages (quiet hours, 9 AM local campaigns) and puts them in the queue at the right time.' },
        { id: 'fo', label: 'Fan-out job', sub: 'pages → batches', x: 480, y: 170, w: 130, kind: 'server', info: 'What it is: it reads a broadcast\'s user list page by page and makes batches of 1,000 users. It keeps a checkpoint.' },
        { id: 'pq', label: 'Priority queues', sub: 'P0 / P1 per channel', x: 290, y: 290, w: 200, kind: 'queue', info: 'What it is: separate lines of work: urgent (P0: OTP, payment) and normal (P1: marketing), and separate for each channel. So the OTP never waits behind a sale.' },
        { id: 'wk', label: 'Channel workers', sub: 'push|SMS|email|inbox|hook', x: 290, y: 400, w: 200, kind: 'server', info: 'What it is: separate workers for each channel (bulkhead). Claim, render the template, send to the provider, emit a status event. They also write to the in-app inbox.' },
        { id: 'rq', label: 'Retry + DLQ', sub: 'backoff + jitter', x: 480, y: 400, w: 130, kind: 'queue', info: 'What it is: the line of failed messages, tried again with growing delays. After all attempts, the dead-letter queue, with an alert.' },
        { id: 'apns', label: 'APNs / FCM', sub: 'push', x: 100, y: 528, w: 140, kind: 'net', info: 'What it is: the push services of Apple and Google. They reach the phone using the device token. They have their own speed limits.' },
        { id: 'vend', label: 'SMS / email', sub: '2+ vendors, router', x: 265, y: 528, w: 150, kind: 'net', info: 'What it is: SMS and email companies. At least two, with a router and a circuit breaker, so if one fails the other takes over. Later they send DLR / bounce callbacks.' },
        { id: 'hook', label: 'Seller servers', sub: 'webhooks', x: 450, y: 528, w: 130, kind: 'net', info: 'What it is: businesses\' own servers that we send webhooks (HTTP POST) to, with a signature, and with long retries on failure.' },
        { id: 'users', label: 'User devices + inboxes', sub: 'phone, email, app', x: 230, y: 650, w: 300, kind: 'client', info: 'What it is: the user\'s phone, email inbox and the in-app inbox. The app registers its device token with the Device API and sends open/click events back.' },
        { id: 'rd', label: 'Redis', sub: 'dedupe + caps', x: 640, y: 170, w: 120, kind: 'cache', info: 'What it is: a fast in-memory store. Idempotency keys, send claims and per-user frequency counters.' },
        { id: 'udb', label: 'User data', sub: 'prefs, tokens', x: 640, y: 290, w: 120, kind: 'data', info: 'What it is: preferences, time zone, quiet hours, locale, device tokens, templates and the in-app inbox. Behind a cache, partitioned by user_id.' },
        { id: 'sdb', label: 'Status DB', sub: '+ analytics', x: 640, y: 400, w: 120, kind: 'data', info: 'What it is: the latest status of every message (for support) and a warehouse of all events (reports, A/B tests).' },
        { id: 'st', label: 'Status stream', sub: 'Kafka / Kinesis', x: 640, y: 528, w: 120, kind: 'queue', info: 'What it is: a log of all status events (sent, delivered, opened, failed). Workers write into it; consumers write to the database and analytics in batches. If the database is slow, sending does not stop.' },
      ],
      edges: [
        { a: 'svc', b: 'api', n: 1 },
        { a: 'camp', b: 'fo' },
        { a: 'api', b: 'rd', via: [[190, 115], [600, 115]], label: 'dedupe + caps' },
        { a: 'api', b: 'udb', via: [[190, 232], [600, 232]], label: 'prefs, quiet hrs' },
        { a: 'api', b: 'sch' },
        { a: 'api', b: 'pq', n: 2 },
        { a: 'sch', b: 'pq' },
        { a: 'fo', b: 'pq' },
        { a: 'pq', b: 'wk', n: 3 },
        { a: 'wk', b: 'udb', label: 'tokens' },
        { a: 'wk', b: 'rq', kind: 'bad' },
        { a: 'rq', b: 'pq', dashed: true, label: 'retry' },
        { a: 'wk', b: 'apns' },
        { a: 'wk', b: 'vend', n: 4 },
        { a: 'wk', b: 'hook' },
        { a: 'wk', b: 'st', kind: 'evt', via: [[400, 458], [600, 458]], label: 'status events' },
        { a: 'apns', b: 'users', kind: 'evt' },
        { a: 'vend', b: 'users', kind: 'evt', n: 5 },
        { a: 'vend', b: 'st', kind: 'evt', via: [[330, 590], [600, 590]], label: 'DLR callbacks' },
        { a: 'st', b: 'sdb', kind: 'evt' },
      ],
      paths: [
        { name: 'OTP (transactional)', text: 'Login service → API (dedupe, prefs; no quiet hours or caps for an OTP) → P0 queue → SMS worker → vendor (router) → phone. In seconds.', go: ['svc>api>pq>wk>vend>users', 'api>rd', 'api>udb'] },
        { name: 'Broadcast', text: 'Campaign → the fan-out job makes batches → P1 queues → many push workers → APNs/FCM → crores of phones, within the provider\'s limit.', go: ['camp>fo>pq>wk>apns>users'] },
        { name: 'Fail and retry', text: 'The provider returned 503 → retry queue (backoff + jitter) → back into the queue → send again. After all attempts, the DLQ + an alert.', go: ['wk>rq>pq>wk'] },
        { name: 'Tracking', text: 'Workers put "sent" events into the stream, vendors\' DLR callbacks also go into the stream, then they are written in batches to the Status DB + analytics.', go: ['wk>st>sdb', 'vend>st'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>The producer only says "what happened"; the notification system answers <strong>202</strong> and sends later (queue + workers).</li>
      <li>Decide before sending: <strong>dedupe, preference, quiet hours, frequency cap</strong>. No quiet hours or caps for OTP/security.</li>
      <li><strong>Separate queues and workers</strong>: transactional vs marketing, and each channel separate (bulkhead).</li>
      <li>Push goes through APNs/FCM using a <strong>device token</strong>; remove the token on 410/UNREGISTERED. Push is best effort, so also use an in-app inbox.</li>
      <li>Broadcast = <strong>fan-out in batches</strong> + checkpoint; the real limit is often the provider\'s.</li>
      <li>Retry only on temporary errors, with <strong>backoff + jitter</strong>, then the DLQ. Stop duplicates with an idempotency key + a claim. Exactly-once does not exist.</li>
      <li><strong>2+ vendors</strong> for SMS/email, with a router; failover is a trade between late and duplicate.</li>
      <li>Status events go into a <strong>stream</strong>, with batch writes to the database. Do not trust email "opens" too much.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['One central system: retries, templates, preferences, tracking in one place', '202 + queue: producers never wait on a provider', 'Priority queues + bulkheads: the OTP is never behind marketing or a slow provider', 'Idempotency + claim: duplicates are very rare', 'Backoff + jitter + DLQ: helps the provider recover, and no message is silently lost', 'Multiple vendors: even if one SMS company fails, the OTP goes out', 'Quiet hours, caps, digests: users do not turn notifications off'], costs: ['Async: the producer does not know right away that it was "delivered"', 'Many parts to run: Redis, queues, workers, scheduler, stream, DLQ', 'Jitter, quiet hours, caps: some messages are deliberately late or dropped', 'No exactly-once: sometimes a duplicate or a delay', 'Failover sometimes sends two SMS', 'Push is best effort: an in-app inbox has to be built separately', 'Two vendors = two contracts, two integrations, more cost'] },
    { type: 'think', questions: [
      { q: 'The OTP SMS did not arrive within 30 seconds, and the user tapped "resend". Now two OTPs might go out. How would you design this?', a: 'Resend is a new notification (a new idempotency key), but the OTP service should keep the previous OTP valid for a while too (or send the same code in both). Send the resend through another vendor or channel, because the first one is probably slow. Add a per-phone limit (like 3 resends / 10 min) so the SMS bill cannot be abused.' },
      { q: 'A new feature wants to send a push to 5 crore users at once. Which 4 things would you check first?', a: '(1) The P1/bulk queue and separate workers, not P0. (2) Preferences, quiet hours, caps: send in waves by time zone, not all at 2 AM. (3) Throughput: how many minutes with the provider quota (FCM default 600k/min) and the workers; raise the quota in advance if needed. (4) A test send + template preview, and a backend ready for the wave of app traffic after the push.' },
      { q: 'The status DB cannot take 75k writes per second. Workers are slowing down. What would you change?', a: 'Workers should stop writing to the database directly and put status events into a stream (Kafka/Kinesis). Separate consumers write to the database in batches, and only the important states (sent, delivered, failed) go to the database; opens/clicks go to the warehouse. Make the status a state machine so out-of-order and duplicate events are ignored. Razorpay did exactly this.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'The OTP is stuck behind a marketing campaign. What is the best fix?', options: ['A priority field in the queue', 'A separate P0 queue and separate workers for transactional messages', 'Double the workers'], answer: 1, explain: 'In a normal queue, a priority field does not change the line. Separate queues + separate capacity (both Razorpay and Netflix RENO do this). In the simulator, the OTP went from 40 s to milliseconds.' },
      { q: 'APNs returned 410. What should we do?', options: ['Retry with backoff', 'Remove the token from the registry, do not retry', 'Send an SMS'], answer: 1, explain: '410 means the token is no longer active (for example, the app was uninstalled). A retry is useless; remove the token and save useless sends.' },
      { q: 'Why use jitter in retries?', options: ['To make retries faster', 'So that all the failed messages do not hit the provider again at the same moment', 'Jitter stops duplicates'], answer: 1, explain: 'It protects against a thundering herd. In the simulator, with the defaults, jitter cut the DLQ from 400 to 0.' },
      { q: 'Why does the Notification API return 202 to the producer instead of 200 "sent"?', options: ['202 is shorter', 'The request has only been accepted; workers will send it later, so the producer does not wait for the provider', '200 is not allowed in HTTP'], answer: 1, explain: '202 Accepted = "got it, the work happens later". So services like payments never get stuck at the speed of the SMS company.' },
      { q: 'What should happen to a marketing push in India at 1 AM (user\'s time)?', options: ['Send it right away, push is free', 'Quiet hours: schedule it for the morning (or a digest), and check preferences again before sending', 'Throw it away and never send it'], answer: 1, explain: 'Quiet hours use the user\'s local time. Delay it, and when sending tomorrow, check again that the user has not unsubscribed.' },
      { q: 'An English SMS with a ₹ symbol is 90 characters long. How many segments?', options: ['1, because it is under 160', '2, because ₹ is not in GSM-7, so the whole SMS is sent as UCS-2 (70 per SMS)', '90, one per character'], answer: 1, explain: 'One non-GSM character turns the whole SMS into UCS-2. Writing "Rs." puts the same message into 1 segment.' },
    ]},
    { type: 'sources', note: 'The LinkedIn (2018), Netflix (2022) and Uber (2022) posts are a few years old; today\'s systems have surely moved on. The exact year of the Razorpay post was not clear on the source. The SMS vendor router and failover design is the general industry approach.', items: [
      { title: 'Air Traffic Controller: Member-First Notifications at LinkedIn', publisher: 'LinkedIn Engineering blog', official: true, year: 2018, url: 'https://www.linkedin.com/blog/engineering/messaging-notifications/air-traffic-controller-member-first-notifications-at-linkedin', used: '5 Rights, filtering/dedupe, aggregation into digests, channel selection, delivery time optimization, upstream rate limits, Kafka + Samza + RocksDB, partition by member ID, >1B requests/day, complaints halved, P90 12s to 1.5s.' },
      { title: 'How Uber Optimizes the Timing of Push Notifications using ML and Linear Programming', publisher: 'Uber Engineering blog', official: true, year: 2022, url: 'https://www.uber.com/blog/how-uber-optimizes-push-notifications-using-ml/', used: 'Consumer Communication Gateway: problems (duplicates, conflicting pushes, no personalised timing), sharded MySQL inbox by user ID, schedule generator with XGBoost + linear programming, constraints (expiry, send window, daily cap, min gap), Kafka topic per hour + Cadence scheduler, billions per month.' },
      { title: 'Rapid Event Notification System at Netflix', publisher: 'Netflix Technology Blog', official: true, year: 2022, url: 'https://netflixtechblog.com/rapid-event-notification-system-at-netflix-6deb1d2b57d1', used: 'Priority-specific queues and clusters, hybrid push + pull (Cassandra) model, online-only push, staleness filter, bulkheaded delivery.' },
      { title: 'How Razorpay\'s Notification Service Handles Increasing Load', publisher: 'Razorpay Engineering blog (read via summaries by Arpit Bhayani and blogofcodes, Oct 2022)', url: 'https://engineering.razorpay.com/how-razorpays-notification-service-handles-increasing-load-f787623a490f', used: 'Original SQS + workers + DB + scheduler design, ~2K TPS limit, p99 2s to 4s, P0/P1 queues, per-customer and per-type rate limiting, Kinesis for async writes, separate retry handling for slow webhooks.' },
      { title: 'How we sent a push notification to millions during the Super Bowl (Duo\'s Big Game reminder)', publisher: 'Duolingo blog', official: true, year: 2024, url: 'https://blog.duolingo.com/super-bowl-commercial-2024', used: 'Goal of 4M learners within the 5-second ad; earlier largest send 500k in 60s with crashes; 95% within 3.9s and 99% within 5.7s.' },
      { title: 'Delivering Millions of Notifications within Seconds During the Super Bowl (Zhen Zhou, Duolingo)', publisher: 'InfoQ Dev Summit Boston talk', year: 2024, url: 'https://www.infoq.com/presentations/on-demand-notification-system/', used: '~800k/s vs normal ~10k/s, pre-computed audience in S3 loaded into memory, batching 500 iOS / 250 Android users per queue message, SQS FIFO 5-minute dedupe, dedicated ECS cluster, app requests after a tap (10-50 each) and a mode to pause them.' },
      { title: 'Sending notification requests to APNs', publisher: 'Apple Developer documentation', official: true, url: 'https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns', used: 'HTTP/2, api.push.apple.com, apns-priority 10/5/1, apns-expiration, apns-collapse-id (64 bytes), 4 KB payload, 410 and 429 responses, reuse and multiple connections.' },
      { title: 'Local and Remote Notification Programming Guide: APNs Overview (archived)', publisher: 'Apple Developer documentation archive', official: true, url: 'https://developer.apple.com/library/archive/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/APNSOverview.html', used: 'Store-and-forward for offline devices: only the most recent notification per app kept for a limited time.' },
      { title: 'FCM: throttling and quotas; collapsible messages; token management; understanding delivery', publisher: 'Firebase documentation', official: true, url: 'https://firebase.google.com/docs/cloud-messaging/throttling-and-quotas', used: '600k messages/minute default project quota, 240/min and 5,000/hour per Android device, quota increase lead time; collapse keys, 100 stored non-collapsible limit, 4-week TTL; UNREGISTERED tokens, 270-day stale expiry, refresh on launch; delivery reports and delayed BigQuery export.' },
      { title: 'Email sender guidelines', publisher: 'Google Workspace Admin Help', official: true, url: 'https://support.google.com/a/answer/81126', used: 'From 1 Feb 2024, bulk senders (5,000+/day to Gmail) need SPF, DKIM, DMARC, one-click unsubscribe (RFC 8058 headers) for marketing mail, spam rate below 0.3%.' },
      { title: 'TCCCPR 2018 (Telecom Commercial Communications Customer Preference Regulations) FAQ', publisher: 'Exotel developer docs (summary of TRAI regulation)', url: 'https://developer.exotel.com/docs/faqs/tcccpr-2018', used: 'Promotional SMS only 9 AM-9 PM IST, transactional any time, DLT entity/header/template registration, consent records, opt-out within 7 days, DND preferences.' },
      { title: 'Receive Stripe events in your webhook endpoint', publisher: 'Stripe documentation', official: true, url: 'https://docs.stripe.com/webhooks', used: 'Retries up to 3 days with exponential backoff, HMAC-SHA256 signature with timestamp (5-minute default tolerance), duplicates and no ordering guarantee, return 2xx quickly.' },
      { title: 'What is the SMS character limit?', publisher: 'Twilio glossary', url: 'https://www.twilio.com/docs/glossary/what-sms-character-limit', used: 'GSM-7 160 / UCS-2 70 characters, 153 / 67 per segment for multipart messages.' },
      { title: 'Mail Privacy Protection & Privacy', publisher: 'Apple', official: true, url: 'https://www.apple.com/legal/privacy/data/en/mail-privacy-protection/', used: 'Remote content is loaded privately in the background, so email open tracking is unreliable.' },
    ]},
  ],
});
