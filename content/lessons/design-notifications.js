Lesson.register({
  id: 'design-notifications',
  title: 'Notification system',
  minutes: 45,
  summary: `xyz.com ki har service ko users ko kuch batana hai: OTP, "payment ho gaya", "kisi ne comment kiya", "sale shuru". Is lesson mein hum ek central notification system banayenge jo ek event ko phone push, SMS, email, in-app inbox aur webhook tak pahunchaata hai. Saath mein: OTP kabhi sale ke peeche na atke, duplicate na jaaye, raat 2 baje kisi ko na jagaaye, aur provider down ho to message na khoye. LinkedIn, Uber, Netflix, Razorpay aur Duolingo ne jo publicly bataya, aur Apple/Google ke official docs, usi pe based.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Tumhare phone pe din bhar chhote messages aate hain: "OTP 4821", "₹500 debit hua", "Riya ne photo like ki". Ye sab ek app ke andar ki kai alag services bhejti hain. Agar har service apne tareeke se bheje, to kuch messages do baar aayenge, kuch aayenge hi nahi, aur sale ke din OTP late ho jaayega. Is lesson mein hum ek "dakiya system" banaate hain: saari services usse bolti hain "isko ye batana hai", aur wo tay karta hai kab, kis raaste se, kitni baar, aur pakka pahunchaata hai.` },
    { type: 'callout', tone: 'tip', title: 'Pehle khud try karo', html: `Teen sawaal kaagaz pe socho: (1) "Aapka OTP 4821 hai" aur "Diwali sale shuru!" dono ek hi system se jaate hain. OTP kabhi sale ke peeche na atke, kaise? (2) 5 crore users ko 1 minute ke andar "India ne match jeeta!" kaise bhejoge? (3) SMS company down ho gayi, OTP kaise jaayega? Phir padho.` },

    { type: 'h2', text: 'Step 1: problem aur requirements' },
    { type: 'p', html: `xyz.com mein ab 20 services hain: payments, login, comments, videos, marketing. Sab ko users ko kuch na kuch batana hai. Shuru mein har team ne khud SMS company ka code likha, khud email bheja. Nateeja: har jagah alag retries, alag text, koi "unsubscribe" ka record nahi, aur ek user ko ek din mein 40 notifications. Isliye ek <strong>central notification system</strong>: baaki services sirf bolti hain "user 42 ko payment_success batao", baaki saara kaam ye system karta hai.` },
    { type: 'callout', tone: 'term', title: 'Notification channel', html: `<strong>Ye kya hai:</strong> wo raasta jisse message user tak jaata hai: phone push, SMS, email, app ke andar ka inbox, ya kisi doosri company ke server pe webhook.<br><strong>Kyun chahiye:</strong> har raaste ki speed, kharcha aur rules alag hain. OTP ke liye SMS ya push, invoice ke liye email.<br><strong>Iske bina:</strong> sab kuch ek hi raaste se jaata: offline user tak kuch nahi, ya har cheez mehngi SMS se.` },
    { type: 'table', head: ['Channel', 'Kya hai (seedhe shabdon mein)', 'Speed', 'Kharcha', 'Kisse jaata hai'], rows: [
      ['Mobile push', 'Phone ki screen pe upar aane wala chhota message, app band ho tab bhi', 'Aam taur pe seconds', 'Lagbhag muft', 'Apple ka APNs (iPhone), Google ka FCM (Android)'],
      ['SMS', 'Phone number pe text message, bina internet ke bhi', 'Seconds', 'Har message ka paisa', 'SMS company (gateway), jo telecom networks se judi hai'],
      ['Email', 'Inbox mein lamba message, HTML ke saath', 'Seconds se minutes', 'Bahut sasta', 'Email provider (bhejne wali service)'],
      ['In-app', 'App ke andar "notifications" wali list (bell icon)', 'Jab user app khole', 'Apna DB', 'Hamara apna server'],
      ['Webhook', 'Hamara server kisi doosri company ke server ko HTTP call karta hai', 'Seconds', 'Sasta', 'Seedha unke URL pe'],
    ]},
    { type: 'callout', tone: 'term', title: 'Webhook', html: `<strong>Ye kya hai:</strong> "jab kuch ho, to mujhe is URL pe bata dena." Ek business apna URL hamare paas register karta hai, aur event hote hi hamara server us URL pe POST request bhejta hai.<br><strong>Kyun chahiye:</strong> xyz.com pe dukaan chalane wale sellers ke apne servers hain. Unhe "naya order aaya" insaan ki tarah nahi, machine ki tarah chahiye.<br><strong>Iske bina:</strong> seller ka server har 5 second "kuch naya hua?" poochhta rehta (polling), bekaar load. Detail <a href="#/realtime">Polling, SSE, WebSockets, webhooks</a> lesson mein.` },
    { type: 'callout', tone: 'term', title: 'Transactional vs marketing', html: `<strong>Ye kya hai:</strong> <em>Transactional</em> = user ke apne kaam ka seedha nateeja, turant chahiye: OTP, "payment ho gaya", "password badla". <em>Marketing</em> (promotional) = "50% off", "naye videos dekho".<br><strong>Kyun chahiye ye farak:</strong> dono ki speed, priority, user ki marzi aur kanoon alag hain. India mein telecom rules ke hisaab se promotional SMS sirf 9 AM se 9 PM IST ke beech ja sakte hain, transactional kabhi bhi.<br><strong>Iske bina:</strong> 1 crore sale messages ki line mein OTP phans jaata, aur user login hi nahi kar paata.` },
    { type: 'image', src: 'assets/img/design-notifications/wiki-app-notifications.png', alt: 'Wikipedia Android app ke chaar screenshots: notification preferences ki toggles, notifications ki list, ek notification ke options, aur archive ka message', caption: 'Ek asli app (Wikipedia Android, 2018-19) mein notification system ke do hisse dikhte hain: baayein "Notification preferences" (user har type on/off kar sakta hai), aur baaki screens mein in-app inbox (list, mark read, archive). Hum dono banayenge.', credit: { text: 'MPopov (WMF), Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Wikipedia_Android_app_notifications_examples.png', license: 'CC BY-SA 4.0' } },
    { type: 'compare',
      left: { title: 'Functional', html: `• Channels: mobile push (iOS/Android), SMS, email, in-app inbox, webhooks<br>• Ek user ko bhejo, ya ek "segment" (5 crore followers) ko broadcast<br>• User preferences: "marketing email band", quiet hours, unsubscribe<br>• Templates, kai languages mein<br>• Schedule: "kal subah 9 baje bhejo"<br>• Delivery status: sent, delivered, opened, clicked, failed` },
      right: { title: 'Non-functional', html: `• OTP/transactional: kuch seconds mein; marketing: minutes chalega<br>• Duplicate nahi (do baar "₹500 debit" = panic)<br>• Message khoye nahi: provider down ho to retry, phir bhi fail to record<br>• Spam nahi: per-user limits<br>• Ek channel ki problem doosre ko na roke<br>• Broadcast mein bhi baaki system na gire` },
    },

    { type: 'h2', text: 'Step 2: napkin maths' },
    { type: 'p', html: `Ye numbers "maan lo" wale hain, kisi company ke nahi. Inka kaam sirf ek hai: dikhana ki bottleneck kahan hoga. Sliders badal ke dekho:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Daily active users (millions): <strong class="nnm-uv"></strong></label><input class="nnm-u" type="range" min="1" max="200" step="1" value="50"></div>
          <div><label>Notifications per user per day: <strong class="nnm-nv"></strong></label><input class="nnm-n" type="range" min="1" max="20" step="1" value="5"></div>
          <div><label>Average channels per notification: <strong class="nnm-cv"></strong></label><input class="nnm-c" type="range" min="1" max="3" step="0.5" value="1.5"></div>
          <div><label>Peak = average × <strong class="nnm-pv"></strong></label><input class="nnm-p" type="range" min="1" max="20" step="1" value="5"></div>
          <div><label>Status updates per message: <strong class="nnm-sv"></strong></label><input class="nnm-s" type="range" min="1" max="6" step="1" value="4"></div>
          <div><label>SMS ka hissa (%): <strong class="nnm-mv"></strong></label><input class="nnm-m" type="range" min="0" max="10" step="0.5" value="2"></div>
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
        q('.nnm-note').textContent = `Ek din ≈ 10^5 seconds maana. Har message ka log record ~500 bytes maana. SMS ka daam ₹0.15 per message maana (sirf andaaza; asli daam vendor aur deal pe). Dhyaan do: status writes (${k(wr)}/s) sends (${k(peak)}/s) se ${S} guna hain, aur SMS bill ${k(sms)} SMS/day ka hai, jabki push lagbhag muft.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Default pe: 5 crore users × 5 × 1.5 = <strong>375M sends per day</strong>, average ~3.8k/s, peak ~18.8k/s. Lekin har message ke 4 status updates (queued, sent, delivered, opened) se peak pe <strong>75k database writes per second</strong>. Do sabak: (1) bottleneck aksar "bhejna" nahi, apna <strong>status likhna</strong> hai (Razorpay ke saath yahi hua, aage dekhenge). (2) Sirf 2% SMS bhi ~₹11 lakh per day ban jaata hai, isliye jahan ho sake push ya in-app, aur SMS sirf jahan zaroori (OTP).` },

    { type: 'h2', text: 'Step 3: API aur data model' },
    { type: 'callout', tone: 'term', title: 'Idempotency key', html: `<strong>Ye kya hai:</strong> request ke saath bheja gaya ek unique naam, jaise <code>payment-98123-success</code>. Same naam dobara aaye to server samajh jaata hai "ye wahi purani request hai".<br><strong>Kyun chahiye:</strong> network mein jawab kho jaata hai, to bhejne wali service request dobara bhejti hai. Bina key ke system ise naya maan ke dobara notification bhejega.<br><strong>Iske bina:</strong> user ko do baar "₹500 debit" aur ghabrahat. Poori kahani <a href="#/pagination-idempotency">Pagination aur idempotency</a> mein.` },
    { type: 'code', text: `
# 1. Ek user ko (transactional ya social)
POST /v1/notifications
  {
    "idempotency_key": "payment-98123-success",   // same key dobara aaye to dobara mat bhejo
    "user_id": 42,
    "type": "payment_success",                     // priority aur preferences isi se
    "template": "payment_success",                 // text system khud banayega
    "data": { "amount": "₹500", "merchant": "xyz store" },
    "channels": ["push", "email"],                 // optional; warna type ke default
    "send_by": "2026-10-04T10:31:00Z"              // isse late ho gaya to bhejna bekaar
  }
  →  202 Accepted  { "notification_id": "n_7f3a" }  // "le liya", bhejega baad mein

# 2. Broadcast / campaign (bahut saare users)
POST /v1/campaigns   { "segment": "followers_of:team_india", "template": "match_start",
                       "schedule": { "at": "09:00", "timezone": "user_local" } }

# 3. App install pe phone ka pata (device token) register
POST /v1/devices     { "user_id": 42, "platform": "ios", "token": "80f2...c9", "app_version": "7.3" }

# 4. Preferences aur unsubscribe
PUT  /v1/users/42/preferences   { "marketing": { "email": false, "push": true }, "quiet_hours": "23:00-08:00" }

# 5. In-app inbox
GET  /v1/users/42/inbox?cursor=...    PATCH /v1/inbox/{id}  { "read": true }` },
    { type: 'p', html: `<code>202 Accepted</code> pe dhyaan do: API request <strong>le leti hai</strong> aur queue mein daal deti hai. Bhejna baad mein, alag workers karte hain. Payment service ko Apple ya SMS company ka wait nahi karna padta (<a href="#/queues">Message queues</a> wala pattern).` },
    { type: 'code', text: `
templates      (name, version, channel, locale, title, body)       -- "Hi {{name}}, ₹{{amount}} ..."
user_prefs     (user_id, category, channel, enabled)                -- (42, marketing, email, false)
user_settings  (user_id, timezone, quiet_from, quiet_to, locale)    -- (42, "Asia/Kolkata", 23:00, 08:00, "hi-IN")
devices        (user_id, platform, token, app_version, last_seen)   -- ek user, kai phones
notifications  (notification_id, idempotency_key UNIQUE, user_id, type, priority, status, created_at)
deliveries     (notification_id, channel, provider, provider_msg_id, status, attempts, updated_at)
inbox          (user_id, notification_id, title, body, read, created_at)   -- user_id se partition
scheduled      (notification_id, send_at, ...)                       -- send_at pe index` },
    { type: 'p', html: `Kaun sa data kahan? Preferences, settings, templates: bahut padhe jaate hain, kam badalte hain, to ek normal database + cache. <code>notifications</code>, <code>deliveries</code> aur <code>inbox</code> bahut tez badhte hain (har din crores rows), aur hamesha <code>user_id</code> ya <code>notification_id</code> se padhe jaate hain, to aise database jo key se partition ho ke horizontally badhe (Cassandra/DynamoDB jaisa, ya sharded SQL). Uber ka notification system bhi apna "inbox" user ID se partitioned, sharded MySQL mein rakhta hai.` },

    { type: 'h2', text: 'Step 4: high-level design, ek ek kadam' },
    { type: 'p', html: `Seedha final design dikhane ki jagah, sabse simple version se shuru karte hain aur dekhte hain wo kahan toot-ta hai. Har toot-ne pe ek naya hissa judega. Diagram mein scenarios ek ke baad ek chalao:` },
    { type: 'callout', tone: 'term', title: 'Provider', html: `<strong>Ye kya hai:</strong> bahar ki company jo asli delivery karti hai: Apple (APNs) aur Google (FCM) push ke liye, SMS company, email bhejne wali company.<br><strong>Kyun chahiye:</strong> hum khud kisi iPhone ya telecom network tak nahi pahunch sakte; ye raaste unke paas hain.<br><strong>Iske bina:</strong> koi push, SMS ya email bahar ja hi nahi sakta. Lekin provider hamare control mein nahi: wo slow ho sakta hai, down ho sakta hai, ya "bahut zyada bhej rahe ho" bol ke mana kar sakta hai.` },
    { type: 'flow', height: 340, title: 'Design ka vikas: seedhe call se queue tak',
      nodes: [
        { id: 'prod', label: 'Payment svc', sub: 'producer', x: 80, y: 70, w: 120, kind: 'server', info: 'Ye kya hai: xyz.com ki koi bhi service jise user ko kuch batana hai (yahan payments). Isse "producer" kehte hain kyunki ye notification ki maang paida karti hai.' },
        { id: 'api', label: 'Notif API', sub: 'le lo, 202', x: 180, y: 230, w: 130, kind: 'server', hidden: true, info: 'Ye kya hai: notification system ka darwaza. Request check karta hai, queue mein daalta hai aur turant "le liya" (202) bolta hai. Isse producer ko provider ka wait nahi karna padta.' },
        { id: 'q', label: 'Queue', sub: 'kaam ki line', x: 340, y: 230, w: 110, kind: 'queue', hidden: true, info: 'Ye kya hai: kaam ki line. Message tab tak yahan rehta hai jab tak koi worker use bhej ke "ho gaya" (ack) na bole. Isliye provider down ho to bhi message khota nahi.' },
        { id: 'w', label: 'Workers', sub: 'bhejne wale', x: 490, y: 230, w: 130, kind: 'server', hidden: true, info: 'Ye kya hai: background programs jo queue se message uthaate hain, text banaate hain aur provider ko bhejte hain. Zyada load ho to aur workers chala do.' },
        { id: 'prov', label: 'Provider', sub: 'APNs / SMS co.', x: 640, y: 70, w: 140, kind: 'net', info: 'Ye kya hai: bahar ki company (Apple, Google, SMS company) jo message asal mein phone tak le jaati hai. Hamare control mein nahi.' },
        { id: 'ph', label: 'Phone', sub: 'user', x: 640, y: 290, w: 110, kind: 'client', info: 'Ye kya hai: user ka device, jahan notification dikhna hai.' },
      ],
      edges: [{ a: 'prod', b: 'prov', id: 'direct' }, { a: 'prod', b: 'api', id: 'pa', hidden: true }, { a: 'api', b: 'q', id: 'aq', hidden: true }, { a: 'q', b: 'w', id: 'qw', hidden: true }, { a: 'w', b: 'prov', id: 'wp', hidden: true }, { a: 'prov', b: 'ph' }],
      scenarios: [
        { name: 'Version 1: seedha call', steps: [
          { title: 'Service khud bhejti hai', go: 'prod>prov', text: 'Payment hote hi payment service khud SMS company ko call karti hai, aur jawab ka wait karti hai.', msg: 'POST https://sms-company/send  { to: "+91 98...", text: "₹500 paid" }' },
          { title: 'Chal gaya', go: ['res:prov>prod', 'evt:prov>ph'], after: { ph: { state: 'ok', sub: '₹500 paid' } }, text: 'Chhote scale pe ye theek hai. Simple, ek hi call.' },
          { title: 'Provider slow', go: 'prod>prov', set: { prov: { state: 'warn', sub: '3 sec lag raha' } }, after: { prod: { state: 'warn', sub: 'payment API slow' } }, text: 'SMS company 3 second le rahi hai. Ab user ka <strong>payment</strong> bhi 3 second late, kyunki payment service SMS ke jawab pe atki hai. Ek bahar wali company ne hamara core feature slow kar diya.' },
          { title: 'Provider down', go: 'bad:prov>prod', set: { prov: { state: 'down', sub: 'DOWN' } }, after: { ph: { state: 'dim', sub: 'kuch nahi aaya' } }, text: 'SMS company down. Message gaya hi nahi, aur kahin likha bhi nahi ki dobara bhejna hai. Upar se yahi code 20 services mein copy hai, sab ke bugs alag.' },
        ]},
        { name: 'Version 2: API + queue', steps: [
          { title: 'Naye hisse', hide: ['direct'], show: ['api', 'q', 'w', 'pa', 'aq', 'qw', 'wp'], set: { prov: { state: '', sub: 'APNs / SMS co.' }, prod: { state: '', sub: 'producer' }, ph: { state: '', sub: 'user' } }, focus: ['api', 'q', 'w'], text: 'Teen naye hisse: ek <strong>API</strong> jo request leti hai, ek <strong>queue</strong> jismein kaam line mein rakha jaata hai, aur <strong>workers</strong> jo line se utha ke bhejte hain.' },
          { title: 'Request di, turant jawab', go: ['prod>api', 'api>q', 'res:api>prod'], text: 'Payment service ne kaha "user 42 ko payment_success batao". API ne queue mein daala aur ~10 ms mein 202 bol diya. Payment ab kabhi SMS ka wait nahi karta.', msg: '202 Accepted  { notification_id: "n_7f3a" }' },
          { title: 'Worker bhejta hai', go: ['q>w', 'w>prov', 'res:prov>w', 'evt:prov>ph'], after: { ph: { state: 'ok', sub: '₹500 paid' } }, text: 'Worker ne message uthaya, provider ko bheja, phir queue ko "ho gaya" (ack) bola. Ack ke baad hi message line se hatta hai.' },
        ]},
        { name: 'Version 2: provider down', steps: [
          { title: 'Provider gira', show: ['api', 'q', 'w', 'pa', 'aq', 'qw', 'wp'], hide: ['direct'], go: ['prod>api', 'api>q', 'res:api>prod'], set: { prov: { state: 'down', sub: 'DOWN' } }, text: 'Request pehle jaisi aayi, producer ko 202 mila. Payment pe koi asar nahi.' },
          { title: 'Bhejna fail, message safe', go: ['q>w', 'w>prov', 'bad:prov>w'], after: { q: { state: 'warn', sub: 'wapas line mein' } }, text: 'Worker ne ack nahi kiya, to message queue mein hi raha. Kuch der baad dobara try hoga (retry). Kuch khoya nahi.' },
          { title: 'Provider wapas, sab gaya', go: ['q>w', 'w>prov', 'evt:prov>ph'], set: { prov: { state: 'ok', sub: 'wapas' } }, after: { q: { state: '', sub: 'kaam ki line' }, ph: { state: 'ok', sub: '₹500 paid' } }, text: 'Provider theek hua, worker ne bhej diya. Queue ne do duniyaon ko alag kar diya: producer ki speed aur provider ki speed.' },
        ]},
      ],
    },
    { type: 'p', html: `Version 2 kaam karta hai, lekin abhi bhi ek hi line hai. Agle teen sawaal design ko aage badhaate hain: (1) Bhejne se <strong>pehle</strong> faisla: user ne mana to nahi kiya? raat to nahi? aaj kitne bhej chuke? (2) OTP aur sale ek line mein na hon: <strong>priority queues</strong>. (3) Har channel ke <strong>alag workers</strong>, taaki email provider ki problem push ko na roke. Pehle faisle wala hissa:` },

    { type: 'h3', text: 'Hissa 1: intake, yaani bhejne se pehle ka faisla' },
    { type: 'p', html: `Har request ko queue mein daalne se pehle API paanch sawaal poochhti hai. Har ek ki detail aage deep dives mein hai; abhi bas matlab samjho:` },
    { type: 'steps', items: [
      { t: 'Ye request pehle aa chuki? (dedupe)', d: 'Idempotency key dekho. Pehle aa chuki to dobara mat bhejo, wahi purana jawab do.' },
      { t: 'User ne mana to nahi kiya? (preferences)', d: 'User ne "marketing push band" kiya ho to marketing push nahi jaayega. OTP jaisa transactional band nahi hota, bas channel chuna ja sakta hai.' },
      { t: 'Abhi user ka sone ka time to nahi? (quiet hours)', d: 'User ki apni timezone mein raat 11 se subah 8 marketing nahi. Use subah ke liye rakh do.' },
      { t: 'Aaj bahut zyada to nahi ho gaya? (frequency cap)', d: 'Jaise "ek din mein max 3 marketing push". Counter Redis mein, bilkul rate limiting jaisa.' },
      { t: 'Kaunsi line? (priority)', d: 'Transactional (OTP, payment) P0 line mein, marketing P1 line mein. Dono lines ke workers alag.' },
    ]},
    { type: 'flow', height: 340, title: 'Intake: faisla aur priority',
      nodes: [
        { id: 'prod', label: 'Payment svc', sub: 'producer', x: 80, y: 170, w: 130, kind: 'server', info: 'Ye kya hai: koi bhi service jo notification chahti hai. Ye sirf "kya hua" batati hai (type + data), "kaise bhejna" nahi. Kaise bhejna hai, ye notification system ka kaam.' },
        { id: 'api', label: 'Notification API', x: 290, y: 170, w: 170, kind: 'server', info: 'Ye kya hai: notification system ka darwaza. Dedupe, preferences, quiet hours aur caps check karta hai, priority tay karta hai, queue mein daalta hai, aur 202 lautata hai. Stateless (apni memory mein kuch yaad nahi rakhta), isliye kitni bhi copies chala sakte ho.' },
        { id: 'rd', label: 'Redis', sub: 'dedupe + per-user caps', x: 290, y: 55, w: 190, kind: 'cache', info: 'Ye kya hai: bahut tez in-memory store. Yahan do kaam: (1) idempotency key ka record (SET NX, 24 ghante ke liye) taaki same request dobara aaye to dobara na bheje; (2) per-user counters, jaise "aaj kitne marketing push gaye" (bilkul <a href="#/design-rate-limiter">Rate limiter</a> jaisa).' },
        { id: 'pref', label: 'Prefs + templates', sub: 'DB + cache', x: 290, y: 290, w: 190, kind: 'data', info: 'Ye kya hai: user ki marzi ka record: kaunsa type kis channel pe on/off, timezone, quiet hours, language. Saath mein templates. Bahut padhe jaate hain, kam badalte hain, isliye cache ke peeche.' },
        { id: 'p0', label: 'P0 queue', sub: 'transactional', x: 560, y: 95, w: 160, kind: 'queue', info: 'Ye kya hai: urgent kaam ki alag line: OTP, payments, security alerts. Iske apne workers aur apni capacity. Marketing ka toofan ise chhoo bhi nahi sakta.' },
        { id: 'p1', label: 'P1 queue', sub: 'marketing / bulk', x: 560, y: 250, w: 160, kind: 'queue', info: 'Ye kya hai: kam urgent kaam ki line: promotions, digests, "naye videos". Yahan backlog (lambi line) ban jaaye to chalega; minutes ki deri theek hai.' },
      ],
      edges: [{ a: 'prod', b: 'api' }, { a: 'api', b: 'rd' }, { a: 'api', b: 'pref' }, { a: 'api', b: 'p0' }, { a: 'api', b: 'p1' }],
      scenarios: [
        { name: 'Payment success (P0)', steps: [
          { title: 'Event aaya', go: 'prod>api', text: 'Payment ho gaya, user ko batao.', msg: 'POST /v1/notifications { idempotency_key: "payment-98123-success", user_id: 42, type: "payment_success" }' },
          { title: 'Pehli baar?', go: ['api>rd', 'res:rd>api'], text: 'Idempotency key ka record banaya. Pehle se nahi tha, to aage badho.', msg: 'SET idem:payment-98123-success n_7f3a NX EX 86400  →  OK' },
          { title: 'Preferences', go: ['api>pref', 'res:pref>api'], text: 'payment_success transactional hai: user ise band nahi kar sakta, lekin channel chun sakta hai (push on, email on, SMS off).', msg: 'channels = [push, email]' },
          { title: 'P0 line mein', go: ['api>p0', 'res:api>prod'], text: 'Har channel ke liye ek message P0 queue mein, aur producer ko turant 202.', msg: '202 Accepted  { notification_id: "n_7f3a" }' },
        ]},
        { name: 'Duplicate request', steps: [
          { title: 'Producer ne retry kiya', go: 'prod>api', text: 'Pehli call ka jawab network mein kho gaya, to payment service ne same request dobara bheji. Ye bilkul normal hai.', msg: 'POST ... idempotency_key: "payment-98123-success"' },
          { title: 'Key pehle se hai', go: ['api>rd', 'bad:rd>api'], text: 'SET NX fail: ye key pehle aa chuki. Dobara queue mein nahi daalenge.', msg: 'SET ... NX  →  (nil)   existing = n_7f3a' },
          { title: 'Same jawab', go: 'res:api>prod', set: { p0: { state: 'dim' } }, text: 'Producer ko wahi notification_id. User ko ek hi "₹500 paid" mila, do nahi.', msg: '202 Accepted  { notification_id: "n_7f3a" }' },
        ]},
        { name: 'User ne mana kiya', steps: [
          { title: 'Marketing push', go: ['prod>api', 'api>rd', 'res:rd>api'], set: { prod: { label: 'Marketing svc' } }, text: 'Sale ka push aaya.' },
          { title: 'Preference: off', go: ['api>pref', 'bad:pref>api'], text: 'User ne "marketing push" band kiya hua hai. Phir bhi bhejna user ka bharosa todna hai (aur kai jagah kanoon ke khilaaf).', msg: 'prefs(42, marketing, push) = off' },
          { title: 'Drop, reason ke saath', go: 'res:api>prod', set: { p1: { state: 'dim' } }, text: 'Bheja nahi gaya, lekin log hua: "skipped: user_pref". Baad mein analytics aur debugging ke liye zaroori ("mera notification kyun nahi aaya?").' },
        ]},
        { name: 'Quiet hours + cap', steps: [
          { title: 'Raat 1 baje marketing', go: ['prod>api', 'api>pref', 'res:pref>api'], set: { prod: { label: 'Marketing svc' } }, text: 'User ki timezone mein raat ka 1 baj raha hai, aur uske quiet hours 11pm-8am hain.' },
          { title: 'Aaj ka cap bhi bhara', go: ['api>rd', 'res:rd>api'], after: { rd: { state: 'warn', sub: 'marketing today = 3/3' } }, text: 'Is user ko aaj 3 marketing push ja chuke, hadd 3.' },
          { title: 'Baad mein ya digest', go: 'api>p1', after: { p1: { sub: 'scheduled 9:00 local' } }, text: 'Ise kal subah 9 baje (user ke time se) ke liye schedule kiya, ya kal ke digest mein jod diya. LinkedIn ka ATC (2018 post) yahi karta tha: sone ke time nahi bhejta, kai notifications ko ek digest mein jodta hai, aur frequency control karta hai.' },
        ]},
        { name: 'Sale ka toofan', steps: [
          { title: '1 crore marketing messages', flood: { paths: ['api>p1'], n: 10 }, after: { p1: { state: 'hot', sub: 'backlog: 1 crore' } }, text: 'Diwali sale campaign ne P1 bhar di.' },
          { title: 'OTP phir bhi turant', go: ['prod>api', 'api>p0'], set: { prod: { label: 'Auth svc' } }, after: { p0: { state: 'ok', sub: 'khaali, fast' } }, text: 'P0 alag line hai, apne workers ke saath. OTP seconds mein gaya. Razorpay ne apni notification service ke baare mein yahi likha: priority ke hisaab se alag queues, taaki festive season ke bulk messages transactional ko na rokein.' },
        ]},
      ],
    },

    { type: 'h3', text: 'Hissa 2: har channel ke alag workers' },
    { type: 'p', html: `Queue ke baad har channel ke apne workers hain: push workers Apple/Google se baat karte hain, email workers email provider se, SMS workers SMS company se, in-app workers apne inbox DB mein likhte hain, webhook workers sellers ke URLs pe POST karte hain. Har channel ki apni queue (ya topic) bhi hoti hai, P0 aur P1 dono ke liye.` },
    { type: 'callout', tone: 'term', title: 'Bulkhead', html: `<strong>Ye kya hai:</strong> system ko alag alag dibbon mein baantna, taaki ek dibbe ki problem doosre tak na phaile. Naam jahaz ki deewaron se aaya hai jo ek hissa bhar jaane pe poore jahaz ko doobne nahi deti.<br><strong>Kyun chahiye:</strong> email provider slow hua aur saare workers usi ke jawab pe atak gaye, to push aur SMS bhi ruk jaayenge. Alag workers = alag dibbe.<br><strong>Iske bina:</strong> ek provider ki problem poore notification system ki problem. Netflix ka RENO system bhi delivery ko platform ke hisaab se alag rakhta hai. Detail <a href="#/resilience">API gateway, retries, circuit breaker</a> mein.` },

    { type: 'h2', text: 'Deep dive 1: device tokens, aur APNs/FCM kaise kaam karte hain' },
    { type: 'p', html: `Sabse pehla sawaal: hamara server kisi ke phone ko seedha message kyun nahi bhej sakta? Kyunki phone ka koi pakka pata nahi hota. Wo kabhi WiFi pe hai, kabhi 4G pe, aksar sleep mein, aur har app apna khud ka connection khula rakhe to battery ek din mein khatam. Isliye Apple aur Google ne ek hi raasta banaya: phone ka OS <strong>unke</strong> server se ek hamesha-khula connection rakhta hai, aur saare apps ke push usi ek connection se aate hain.` },
    { type: 'callout', tone: 'term', title: 'APNs aur FCM', html: `<strong>Ye kya hai:</strong> <strong>APNs</strong> (Apple Push Notification service) iPhone ke liye aur <strong>FCM</strong> (Firebase Cloud Messaging) Android ke liye, Apple aur Google ki push services. Hamara server inhe message deta hai, aur ye phone tak pahunchaati hain.<br><strong>Kyun chahiye:</strong> sirf inke paas phone tak ka khula connection hai. Ek connection, saare apps: battery bachti hai.<br><strong>Iske bina:</strong> app band ho to koi push nahi. Example: Apple ke docs ke mutabik server HTTP/2 se <code>api.push.apple.com</code> ko request bhejta hai, aur ek push ka payload (data) zyada se zyada 4 KB ho sakta hai.` },
    { type: 'callout', tone: 'term', title: 'Device token', html: `<strong>Ye kya hai:</strong> ek lambi random string jo "ye phone + ye app" ka pata hai. App install hone aur permission milne pe phone ka OS ise Apple/Google se leta hai aur app ko deta hai.<br><strong>Kyun chahiye:</strong> push bhejte waqt hum APNs/FCM ko yahi token dete hain; wo jaante hain ye kis phone ka hai.<br><strong>Iske bina:</strong> push kisko bhejein, pata hi nahi. Token badalte bhi hain (app reinstall, phone restore), isliye unhe taaza rakhna padta hai. Firebase docs salah dete hain ki app har launch pe apna token server ko bheje.` },
    { type: 'flow', height: 340, title: 'Push: token se phone tak',
      nodes: [
        { id: 'q', label: 'Push queue', sub: 'P0 / P1', x: 80, y: 170, w: 120, kind: 'queue', info: 'Ye kya hai: push channel ki line. Har message: notification_id, user_id, template, data. At-least-once: worker ack na kare to message dobara aayega.' },
        { id: 'w', label: 'Push worker', sub: 'render + send', x: 270, y: 170, w: 150, kind: 'server', info: 'Ye kya hai: wo program jo message uthata hai, user ke saare device tokens laata hai, template ko user ki language mein bharta hai, APNs/FCM ko bhejta hai, status likhta hai, phir queue ko ack. Apple ki salah ke mutabik HTTP/2 connections dobara use karta hai aur zyada load pe kai connections kholta hai.' },
        { id: 'tok', label: 'Device registry', sub: 'tokens DB', x: 270, y: 50, w: 150, kind: 'data', info: 'Ye kya hai: user_id → [iPhone token, Android token, tablet token...] ki list, saath mein platform, app version, last_seen. Ek user ke kai devices ho sakte hain; push sab pe jaata hai. Mare hue tokens yahan se hatte hain.' },
        { id: 'reg', label: 'Device API', sub: 'token register', x: 490, y: 50, w: 130, kind: 'server', info: 'Ye kya hai: hamara chhota endpoint (POST /v1/devices) jahan app apna token bhejta hai: install pe, login pe, aur har launch pe. Logout pe token user se hatta hai, warna agle user ko pichhle ke notifications jaayenge.' },
        { id: 'apns', label: 'APNs / FCM', sub: 'Apple / Google', x: 490, y: 170, w: 150, kind: 'net', info: 'Ye kya hai: Apple aur Google ki push services. Hamara server inhe message deta hai; phone tak pahunchana inka kaam. Jawab: 200 (le liya), 410 / UNREGISTERED (token mara), 429 (bahut zyada, ruko), 5xx (unki taraf abhi problem).' },
        { id: 'ph', label: 'Phone', sub: 'xyz app', x: 655, y: 170, w: 100, kind: 'client', info: 'Ye kya hai: user ka device. Iska OS Apple/Google se hamesha ek connection rakhta hai. Online ho to turant notification; offline ho to provider kuch der rakhta hai.' },
        { id: 'rq', label: 'Retry queue', sub: 'delay + DLQ', x: 490, y: 290, w: 150, kind: 'queue', info: 'Ye kya hai: fail hue (lekin dobara try karne laayak) messages ki line, delay ke saath. Max attempts ke baad dead-letter queue (DLQ) mein, alert ke saath.' },
      ],
      edges: [{ a: 'q', b: 'w' }, { a: 'w', b: 'tok' }, { a: 'w', b: 'apns' }, { a: 'apns', b: 'ph' }, { a: 'w', b: 'rq' }, { a: 'ph', b: 'reg' }, { a: 'reg', b: 'tok' }],
      scenarios: [
        { name: 'Token kaise milta hai', steps: [
          { title: 'Permission aur token', go: ['ph>apns', 'res:apns>ph'], text: 'User ne app install kiya aur "Allow notifications" dabaya. Phone ke OS ne Apple/Google se is app ke liye ek device token liya.', msg: 'token = "80f2...c9"' },
          { title: 'App token hamein deta hai', go: ['ph>reg', 'reg>tok'], after: { tok: { state: 'ok', sub: 'user 42: 2 devices' } }, text: 'App ne token hamare Device API ko bheja. Registry mein user 42 ke ab do devices hain: iPhone aur tablet.', msg: 'POST /v1/devices { user_id: 42, platform: "ios", token: "80f2...c9" }' },
          { title: 'Har launch pe taaza', focus: ['reg', 'tok'], text: 'Token badal sakta hai, isliye app har launch pe token bhejta hai aur hum last_seen update karte hain. Firebase docs ke mutabik Android pe 270 din inactive token ko FCM expire maan leta hai, to purane tokens pe bhejna bekaar.' },
        ]},
        { name: 'Happy path', steps: [
          { title: 'Message uthaya', go: 'q>w', text: 'Worker ne push queue se ek message liya.', msg: '{ notification_id: "n_7f3a", user_id: 42, channel: "push", template: "payment_success" }' },
          { title: 'Tokens + template', go: ['w>tok', 'res:tok>w'], text: 'User 42 ke tokens mile. Template user ki language (hi-IN) mein bhara.', msg: 'title: "Payment safal"  body: "xyz store ko ₹500 bheje gaye"' },
          { title: 'APNs ko', go: ['w>apns', 'res:apns>w'], text: 'HTTP/2 request: path mein device token, headers mein priority (10 = turant) aur ek collapse id.', msg: 'POST /3/device/80f2...c9\napns-priority: 10\napns-collapse-id: n_7f3a\n→ 200' },
          { title: 'Phone tak', go: 'evt:apns>ph', after: { ph: { state: 'ok', sub: '₹500 paid' } }, text: 'Apple ne phone tak pahunchaya. Worker ne status "sent" likha aur queue ko ack kiya. Dhyaan: 200 ka matlab "Apple ne le liya", "phone pe dikh gaya" nahi.' },
        ]},
        { name: 'Token mara (410)', steps: [
          { title: 'Bheja', go: ['q>w', 'w>tok', 'res:tok>w', 'w>apns'], text: 'User ne app uninstall kar diya tha.' },
          { title: '410 / UNREGISTERED', go: 'bad:apns>w', text: 'APNs 410 deta hai (token ab active nahi); FCM UNREGISTERED. <strong>Retry mat karo</strong>: kitni bhi baar bhejo, nahi jaayega.', msg: '410 Unregistered' },
          { title: 'Token hatao', go: 'w>tok', after: { tok: { state: 'ok', sub: 'dead token deleted' } }, text: 'Token registry se hataya. Firebase docs bhi kehte hain ki purane tokens bekaar sends aur resources barbaad karte hain.' },
        ]},
        { name: 'Provider busy (429/5xx)', steps: [
          { title: 'Bheja, 503 aaya', go: ['q>w', 'w>apns', 'bad:apns>w'], set: { apns: { state: 'warn', sub: 'overloaded' } }, text: 'Provider ki taraf thodi der ki problem. Ye retry ke laayak hai.' },
          { title: 'Retry queue, backoff ke saath', go: 'w>rq', after: { rq: { state: 'warn', sub: 'attempt 2 in ~2s' } }, text: 'Message retry queue mein, delay ke saath. Har attempt pe delay double, plus thoda random (jitter). Aage simulator mein dekho kyun.' },
          { title: 'Dobara, is baar safal', go: ['res:rq>w', 'w>apns', 'res:apns>w', 'evt:apns>ph'], set: { apns: { state: '', sub: 'Apple / Google' } }, after: { rq: { state: '', sub: 'delay + DLQ' } }, text: 'Doosre attempt pe chala gaya.' },
        ]},
        { name: 'Phone offline', steps: [
          { title: 'Phone band', set: { ph: { state: 'down', sub: 'offline' } }, go: ['q>w', 'w>apns', 'res:apns>w'], text: 'APNs ne le liya (200), lekin phone offline hai.' },
          { title: 'Provider rakhta hai, lekin seemit', focus: ['apns'], text: 'Apple ki (ab archived) guide ke mutabik APNs offline phone ke liye kuch der tak ek app ka sirf <strong>sabse naya</strong> notification rakhta hai; naya aaye to purana phenk deta hai. FCM default 4 hafte tak rakhta hai, lekin Android pe 100 se zyada non-collapsible jama hon to sab phenk deta hai.' },
          { title: 'Isliye in-app inbox bhi', set: { ph: { state: 'ok', sub: 'app khola' } }, focus: ['ph'], text: 'Push "best effort" hai, guarantee nahi. Zaroori cheezein in-app inbox (apne DB) mein bhi likho; app khulte hi wahan se le aaye. Netflix RENO (2022 post) yahi hybrid karta hai: online devices ko push, aur devices apne aap missed events pull karte hain.' },
        ]},
      ],
    },
    { type: 'table', head: ['Header / setting', 'Matlab', 'Kab'], rows: [
      ['apns-priority 10 / 5 / 1', '10 = turant bhejo, 5 = phone ki battery dekh ke sahi waqt pe, 1 = kam priority', 'OTP, chat: 10. Background sync, marketing: 5'],
      ['apns-expiration / FCM TTL', 'Kab tak rakhna hai agar phone offline hai. 0 = abhi nahi pahuncha to phenk do', '"Match 5 min mein shuru" ka TTL chhota; invoice ka lamba'],
      ['apns-collapse-id / FCM collapse key', 'Same id ke naye notification purane ki jagah le lete hain (Apple: max 64 bytes)', '"Score: 120/3" ke baad "Score: 145/4": purana hatao'],
      ['FCM priority normal / high', 'High phone ko jagaata hai; normal battery bachane ke liye ruk sakta hai', 'Sirf user-dikhne wale urgent messages high'],
    ]},

    { type: 'h2', text: 'Deep dive 2: templates aur localisation' },
    { type: 'p', html: `Producer sirf <code>template: "payment_success"</code> aur data bhejta hai. Asli text banana notification system ka kaam hai, kyunki ek hi baat har channel aur har language mein alag dikhti hai: push mein chhota title + body, SMS mein ek chhoti line, email mein subject + HTML page.` },
    { type: 'callout', tone: 'term', title: 'Template', html: `<strong>Ye kya hai:</strong> khaali jagahon wala pehle se likha text, jaise <code>"{{otp}} aapka xyz.com OTP hai"</code>. Bhejte waqt <code>{{otp}}</code> ki jagah asli value bhari jaati hai (isse <em>render</em> karna kehte hain).<br><strong>Kyun chahiye:</strong> text ek jagah, sab services ke liye. Galti sudhaarni ho ya Tamil add karni ho, to code nahi badalna padta.<br><strong>Iske bina:</strong> 20 services mein 20 tarah ke "payment successful" messages, aur nayi language = 20 teams ka kaam.` },
    { type: 'callout', tone: 'term', title: 'Localisation (locale)', html: `<strong>Ye kya hai:</strong> message ko user ki language aur region ke hisaab se banana. <em>Locale</em> ek code hai jaise <code>hi-IN</code> (Hindi, India) ya <code>en-IN</code>. Sirf language nahi: date ka format, paise ka nishaan, number likhne ka tareeka bhi.<br><strong>Kyun chahiye:</strong> Tamil Nadu ka user English se zyada Tamil padhta hai; samajh aaye to click bhi zyada.<br><strong>Iske bina:</strong> sabko ek hi language, ya worse: aadha message ek language mein, aadha doosri mein.` },
    { type: 'list', items: [
      `<strong>Versioned:</strong> har template ke versions (v1, v2, v3). Naya text galat nikle to ek click mein purane pe wapas.`,
      `<strong>Render worker pe, bhejte waqt:</strong> user ki <em>us waqt</em> ki language aur timezone se. Scheduled message kal jaayega to kal ki settings lagengi.`,
      `<strong>Fallback chain:</strong> <code>ta-IN</code> ka template nahi bana? To <code>ta</code>, phir default <code>en-IN</code>. Kabhi khaali message nahi.`,
      `<strong>Channel ki hadd:</strong> push payload Apple pe 4 KB tak; SMS ka ek hissa (segment) 160 English characters ya sirf 70 Hindi/emoji characters; email subject chhota rakho.`,
      `<strong>Escape karo:</strong> data mein user ka likha text (jaise comment) ho to email HTML mein daalne se pehle escape, warna koi apna HTML/link ghusa dega.`,
      `<strong>India mein SMS templates registered:</strong> telecom rules (TRAI, DLT system) ke mutabik business ko apna sender naam aur har SMS template pehle register karna padta hai; sirf variables badal sakte hain. Isliye SMS template badalna code deploy jitna aasaan nahi.`,
      `<strong>Test send aur preview:</strong> 5 crore logon ko bhejne se pehle 5 logon ko. Warna "Hi {{name}}" sabke phone pe.`,
    ]},
    { type: 'p', html: `Ab khud dekho ki language aur ek chhota sa symbol SMS ka kharcha kaise badal deta hai. SMS do "alphabets" mein jaata hai: <strong>GSM-7</strong> (basic English letters, ek SMS mein 160) aur <strong>UCS-2</strong> (koi bhi Unicode: Hindi, emoji, ₹; ek SMS mein sirf 70). Lamba message kai <em>segments</em> mein jaata hai, aur har segment ka alag paisa lagta hai:` },
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
        chips(q('.ntl-c'), [[true, 'Paisa: ₹'], [false, 'Paisa: Rs.']], rupee, v => rupee = v);
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
        q('.ntl-note').textContent = (used !== loc ? `${loc} ka template abhi bana hi nahi, to fallback ${used} use hua (khaali message se behtar). ` : '') + (gsm ? `Saare characters GSM-7 mein hain: ${n} characters, ${segs} segment.` : `Ye characters GSM-7 mein nahi: ${bad} ... isliye poora SMS UCS-2 mein gaya: ${n} characters, ${segs} ${segs === 1 ? 'segment' : 'segments'}. Har segment ka paisa lagta hai.`) + ' (Lambe SMS mein har segment mein thodi jagah jodne ki jaankari ke liye jaati hai: GSM-7 mein 153, UCS-2 mein 67 characters per segment.)';
      };
      upd();
    }},
    { type: 'p', html: `Default pe English OTP: GSM-7, 84 characters, <strong>1 segment</strong>. Hindi OTP: lagbhag utne hi characters (83), lekin UCS-2, to <strong>2 segments</strong>, yaani lagbhag dugna kharcha. Payment template mein ek akela <strong>₹</strong> symbol (GSM-7 mein nahi hai) poore 90-character SMS ko UCS-2 bana ke 2 segments kar deta hai; "Rs." likho to 92 characters bhi 1 segment mein. Aur Tamil chuno to template na hone pe fallback English. Ye chhoti cheezein crores SMS pe lakhs rupaye ka farak hain.` },

    { type: 'h2', text: 'Deep dive 3: user preferences, opt-out aur unsubscribe' },
    { type: 'p', html: `Upar wali image ki pehli screen yaad karo: har type ke saamne ek on/off switch. Ye switches hi <strong>preferences</strong> hain. Lekin xyz.com mein 200 notification types hain; user 200 switches nahi dekhega. Isliye types ko kuch <strong>categories</strong> mein jodte hain, aur har category × channel ka ek switch:` },
    { type: 'table', head: ['Category (examples)', 'Push', 'Email', 'SMS', 'User band kar sakta hai?'], rows: [
      ['Security (OTP, naya login, password badla)', 'on', 'on', 'on', 'Nahi. Ye account ki suraksha hai'],
      ['Payments (debit, refund)', 'on', 'on', 'off', 'Channel chun sakta hai, poora band nahi'],
      ['Social (comment, like, follow)', 'on', 'off', 'off', 'Haan'],
      ['Marketing (sale, offers, "naye videos")', 'off', 'on', 'off', 'Haan, aur kanoon ke hisaab se aasaan hona chahiye'],
    ]},
    { type: 'list', items: [
      `<strong>Do baar check:</strong> intake pe, aur dobara worker pe bhejne se theek pehle. Scheduled message kal jaana hai aur user ne aaj raat unsubscribe kar diya, to kal wala bhi nahi jaana chahiye.`,
      `<strong>Email ka one-click unsubscribe:</strong> Google ne 1 Feb 2024 se Gmail ko roz 5,000+ emails bhejne walon ke liye zaroori kiya ki marketing emails mein one-click unsubscribe ho (<code>List-Unsubscribe</code> aur <code>List-Unsubscribe-Post</code> headers, RFC 8058) aur body mein saaf unsubscribe link ho. Spam complaints 0.3% se upar gayi to emails spam mein jaane lagti hain.`,
      `<strong>Unsubscribe link signed ho:</strong> link mein user ID aur category ke saath ek signature (hamare secret se bana code, HMAC), taaki koi doosre ka ID daal ke use unsubscribe na kar sake, aur bina login ke ek click mein kaam kare.`,
      `<strong>India mein SMS:</strong> telecom rules (TRAI TCCCPR 2018) mein marketing SMS ke liye user ki marzi (consent), DND registry, aur opt-out maanna zaroori hai; ek summary ke mutabik opt-out 7 din ke andar lagu karna hota hai.`,
      `<strong>Phone ki setting bhi preference hai:</strong> user ne phone settings mein xyz app ke notifications band kiye, to APNs/FCM message le lete hain lekin dikhta nahi. App khulne pe permission ka status server ko bhejo, taaki aise users ko push ki jagah email/in-app chuno.`,
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "unsubscribe kiya, matlab kuch mat bhejo"', html: `Marketing se unsubscribe ka matlab hai <em>marketing</em> band, OTP aur "password badla" nahi. Agar ek hi global switch rakha, to user marketing se bachne ke liye sab band karega aur phir security alert miss karega. Isliye categories alag, aur security category band hi nahi hoti. Ulti galti bhi hoti hai: "ye marketing hai lekin transactional bata ke bhej do" (jaise "Aapka cart aapka intezaar kar raha hai, 10% off ke saath"). Ye user ka bharosa todta hai aur kai deshon mein kanoon bhi.` },

    { type: 'h2', text: 'Deep dive 4: priority queues, har channel ke liye' },
    { type: 'p', html: `Queue ek line hai: jo pehle aaya, wo pehle nikla (FIFO, first in first out). Diwali sale pe marketing team ne 10 lakh push ek saath daal diye. 10 second baad kisi ne login kiya aur OTP maanga. Ek line mein OTP ko 8 lakh messages ke peeche khada hona padega. Neeche simulator mein dekho kitni der:` },
    { type: 'callout', tone: 'term', title: 'Priority queue (alag lines)', html: `<strong>Ye kya hai:</strong> urgent aur aam kaam ke liye <em>alag</em> queues, aur har queue ke apne workers. P0 = sabse urgent (OTP, payment, security), P1 = aam (social), P2 = bulk (marketing, digests).<br><strong>Kyun chahiye:</strong> urgent kaam ko kabhi bulk kaam ke peeche line mein na lagna pade.<br><strong>Iske bina:</strong> sale ke din OTP minutes late, aur user login hi nahi kar paata.` },
    { type: 'custom', render(el) {
      let mode = 'one';
      el.innerHTML = `<div class="npq-m" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="row2" style="margin-top:10px">
          <div><label>Marketing burst (lakh messages): <strong class="npq-bv"></strong></label><input class="npq-b" type="range" min="1" max="50" step="1" value="10"></div>
          <div><label>Total workers ki speed (messages/s): <strong class="npq-tv"></strong></label><input class="npq-t" type="range" min="5000" max="100000" step="5000" value="20000"></div>
          <div><label>OTP kitne second baad aaya: <strong class="npq-ov"></strong></label><input class="npq-o" type="range" min="0" max="60" step="1" value="10"></div>
          <div><label>P0 ke liye rakhi capacity (%): <strong class="npq-sv"></strong></label><input class="npq-s" type="range" min="5" max="50" step="5" value="10"></div>
        </div>
        <svg class="npq-svg" viewBox="0 0 320 130" style="width:100%;height:auto;margin-top:10px" role="img" aria-label="Queue mein kitne messages baaki, time ke saath"></svg>
        <div class="stats">
          <div class="stat"><span>OTP ka intezaar</span><strong class="npq-w"></strong></div>
          <div class="stat"><span>Marketing khatam</span><strong class="npq-f"></strong></div>
          <div class="stat"><span>OTP ke aage line mein</span><strong class="npq-a"></strong></div>
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
        [['one', 'Ek hi queue (FIFO)'], ['two', 'Alag P0 + P1 queues']].forEach(([v, t]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (v === mode ? ' on' : ''); b.textContent = t; b.onclick = () => { mode = v; upd(); }; m.appendChild(b); });
        const r = sim(B, T, O, S, mode), o = sim(B, T, O, S, mode === 'one' ? 'two' : 'one');
        const span = Math.max(r.done, o.done, O + r.wait) * 1.05, X = t => 10 + t / span * 300, Y = n => 105 - n / B * 90;
        let svg = `<line x1="10" x2="310" y1="105" y2="105" stroke="var(--line-2)"/>`;
        svg += `<polyline points="${X(0)},${Y(B)} ${X(r.done)},${Y(0)}" fill="none" stroke="var(--amber)" stroke-width="2"/><text x="${X(0) + 4}" y="${Y(B) - 4}" font-size="9" fill="var(--amber)" font-family="var(--f-mono)">marketing backlog</text>`;
        const a = X(O), d = X(Math.min(O + r.wait, span));
        svg += `<line x1="${a}" x2="${a}" y1="15" y2="105" stroke="var(--accent)" stroke-dasharray="3 3"/><text x="${a + 3}" y="24" font-size="9" fill="var(--accent)" font-family="var(--f-mono)">OTP aaya</text>`;
        svg += `<line x1="${d}" x2="${d}" y1="40" y2="105" stroke="${mode === 'one' ? 'var(--red)' : 'var(--green)'}" stroke-width="2"/><text x="${Math.min(d + 3, 250)}" y="50" font-size="9" fill="${mode === 'one' ? 'var(--red)' : 'var(--green)'}" font-family="var(--f-mono)">OTP gaya</text>`;
        svg += `<text x="10" y="120" font-size="9" fill="var(--ink-2)" font-family="var(--f-mono)">0 s</text><text x="310" y="120" text-anchor="end" font-size="9" fill="var(--ink-2)" font-family="var(--f-mono)">${span.toFixed(0)} s</text>`;
        q('.npq-svg').innerHTML = svg;
        q('.npq-w').textContent = tm(r.wait); q('.npq-f').textContent = tm(r.done); q('.npq-a').textContent = Math.round(r.ahead).toLocaleString('en-IN');
        q('.npq-note').textContent = mode === 'one'
          ? `Ek line: OTP ke aage ${Math.round(r.ahead).toLocaleString('en-IN')} messages, to OTP ${tm(r.wait)} baad gaya. Alag queues mein yahi OTP ${tm(o.wait)} mein jaata, aur marketing ${tm(o.done)} mein khatam hoti (abhi ${tm(r.done)}).`
          : `Alag lines: P0 ki line khaali hai aur uske paas ${S}% workers (${Math.round(T * S / 100).toLocaleString('en-IN')}/s), to OTP ${tm(r.wait)} mein. Keemat: marketing ab ${tm(r.done)} mein khatam (ek line mein ${tm(o.done)}), kyunki ${S}% capacity P0 ke liye rakhi hai. Achhe systems mein P0 khaali ho to uske workers P1 ki madad kar dete hain, bas P0 aate hi wapas.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Default pe (10 lakh burst, 20,000 messages/s, OTP 10 second baad): ek line mein OTP ke aage <strong>8 lakh messages</strong>, to OTP <strong>40 second</strong> late. Tab tak user "resend" daba chuka hoga. Alag P0 line (10% capacity) mein OTP <strong>milliseconds</strong> mein jaata hai. Keemat bhi dikhti hai: marketing 50 ki jagah 55.6 second mein khatam. Ye sauda hamesha achha hai.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "ek hi queue, priority field laga do"', html: `Aam queue (jaise AWS ki SQS standard queue ya Kafka topic) mein message pe "priority: high" likhne se line nahi badalti: OTP 8 lakh messages ke peeche hi khada rahega. Kuch brokers (jaise RabbitMQ) priority support karte hain, lekin wahan bhi workers ek hi pool ke hain; ek slow provider sab ko pakad sakta hai. Priority ka asli matlab: <strong>alag queues, alag workers, alag capacity</strong>. Netflix ke RENO system (2022 post) mein bhi events priority ke hisaab se alag queues aur alag compute clusters pe jaate hain, aur Razorpay ne bhi P0/P1 queues alag kiye.` },
    { type: 'p', html: `Aur ye lines <strong>har channel ke liye</strong> alag hon: push-P0, push-P1, sms-P0, email-P1... Kyunki SMS company slow ho to sms-P0 bhare, push-P0 nahi. Kitni lines? Jitni zaroori: aam taur pe 2-3 priority levels × har channel. Zyada lines = zyada cheezein monitor karni.` },

    { type: 'h2', text: 'Deep dive 5: broadcast, ek event se crores messages' },
    { type: 'p', html: `"India ne match jeeta!" ek event hai, lekin 5 crore followers ko jaana hai. API ek request mein 5 crore users ki list nahi utha sakti; memory khatam, request timeout. Iska tareeka hai <strong>fan-out</strong>, aur wo bhi do level mein.` },
    { type: 'callout', tone: 'term', title: 'Fan-out', html: `<strong>Ye kya hai:</strong> ek input se bahut saare outputs banana. Ek event → lakhon users, ya ek user → teen channels (push + email + in-app).<br><strong>Kyun chahiye:</strong> broadcast ka size pehle se pata nahi aur bahut bada ho sakta hai; use chhote tukdon mein baant ke bahut saare workers pe phailana padta hai.<br><strong>Iske bina:</strong> ek machine 5 crore messages akele bhejegi: ghanton lagenge, aur beech mein crash hua to pata nahi kahan tak gaya. General pattern <a href="#/pattern-fanout">Real-time updates aur fan-out</a> mein.` },
    { type: 'steps', items: [
      { t: 'Audience pehle se taiyaar', d: 'Segment (jaise "team_india ke followers") ki user list pehle se nikaal ke ek file/table mein rakho, pages mein padhne laayak. Broadcast ke waqt database pe bhaari query nahi.' },
      { t: 'Level 1: list ko batches mein kaato', d: 'Fan-out job list ko pages mein padhta hai (maan lo 1,000 users per page) aur har page ke liye ek "batch" message queue mein daalta hai. 5 crore users = 50,000 batch messages.' },
      { t: 'Level 2: workers har user tak', d: 'Bahut saare workers batches uthaate hain; har user ke liye preference + cap check, render, aur provider ko bhejna. Provider ke batch APIs ho to ek call mein kai devices.' },
      { t: 'Checkpoint', d: 'Job har page ke baad likhta hai "page 300 tak ho gaya". Crash hua to page 301 se shuru, zero se nahi.' },
    ]},
    { type: 'flow', height: 340, title: 'Broadcast fan-out',
      nodes: [
        { id: 'camp', label: 'Campaign svc', sub: 'match jeeta!', x: 80, y: 170, w: 120, kind: 'server', info: 'Ye kya hai: wo service (ya marketer ka dashboard) jo bolti hai "is segment ko ye template bhejo". Sirf ek request bhejti hai, crores nahi.' },
        { id: 'fo', label: 'Fan-out job', sub: 'pages → batches', x: 250, y: 170, w: 140, kind: 'server', info: 'Ye kya hai: background job jo audience list ko pages mein padhta hai aur har page ka ek batch message banata hai. Har page ke baad checkpoint likhta hai.' },
        { id: 'aud', label: 'Audience list', sub: 'pre-computed', x: 250, y: 50, w: 150, kind: 'data', info: 'Ye kya hai: segment ke users ki pehle se banayi list (file ya table), user_id aur unke device tokens ke saath. Duolingo ne Super Bowl ke liye ye list hafton pehle bana ke S3 mein rakhi thi.' },
        { id: 'bq', label: 'Batch queue', sub: '50k batches', x: 420, y: 170, w: 130, kind: 'queue', info: 'Ye kya hai: batches ki line. Ek message mein 1,000 users. Isse queue pe messages ki ginti 1,000 guna kam ho jaati hai.' },
        { id: 'sw', label: 'Send workers', sub: 'bahut saare', x: 590, y: 170, w: 130, kind: 'server', info: 'Ye kya hai: workers ka bada pool jo batch utha ke har user ke liye check, render aur send karta hai. Broadcast ke liye alag pool, taaki roz ke notifications pe asar na pade (bulkhead).' },
        { id: 'prov', label: 'APNs / FCM', sub: 'provider limits', x: 590, y: 290, w: 140, kind: 'net', info: 'Ye kya hai: Apple/Google ki push services. Inki apni speed limit hai: Firebase docs ke mutabik FCM HTTP v1 API ka default quota ek project ke liye 600k messages per minute (~10k/s) hai; zyada pe 429.' },
      ],
      edges: [{ a: 'camp', b: 'fo' }, { a: 'fo', b: 'aud' }, { a: 'fo', b: 'bq' }, { a: 'bq', b: 'sw' }, { a: 'sw', b: 'prov' }],
      scenarios: [
        { name: 'Match jeeta: broadcast', steps: [
          { title: 'Ek request', go: 'camp>fo', text: 'Campaign service ne ek request bheji: segment + template + campaign_id.', msg: 'POST /v1/campaigns { campaign_id: "c_wc_final", segment: "followers_of:team_india", template: "match_won" }' },
          { title: 'List pages mein', go: ['fo>aud', 'res:aud>fo'], text: 'Job ne list ka page 1 (users 1-1,000) padha. Poori list kabhi ek saath memory mein nahi.' },
          { title: 'Batches queue mein', flood: { paths: ['fo>bq'], n: 8 }, after: { bq: { state: 'hot', sub: '50,000 batches' } }, text: 'Har page ka ek batch message. 5 crore users ÷ 1,000 = 50,000 batches.' },
          { title: 'Workers phail ke bhejte hain', flood: { paths: ['bq>sw', 'sw>prov'], n: 10 }, after: { bq: { state: '', sub: 'khaali ho rahi' } }, text: 'Saikdon workers ek saath batches uthaate hain. Har batch: preference/cap check, render, provider ke batch API pe send.' },
        ]},
        { name: 'Do baar dabaya', steps: [
          { title: 'Marketer ne double click kiya', go: ['camp>fo', 'camp>fo'], text: 'Do requests, same campaign_id. Bina dedupe ke 5 crore logon ko do baar "match jeeta!".' },
          { title: 'Campaign ID se dedupe', go: 'bad:fo>camp', after: { fo: { state: 'ok', sub: 'ek hi baar chala' } }, text: 'Doosri request pe job bolta hai "ye campaign pehle se chal raha hai". Duolingo ne Super Bowl ke liye yahi risk dekha (kai log ek saath trigger dabayein) aur SQS FIFO queue ki 5 minute wali built-in dedupe use ki.', msg: 'campaign c_wc_final already running → ignored' },
        ]},
        { name: 'Provider ki hadd (429)', steps: [
          { title: 'Bahut tez bheja', flood: { paths: ['sw>prov'], n: 8 }, after: { prov: { state: 'warn', sub: '429: quota full' } }, text: 'Workers ne provider ke quota se tez bheja. FCM 429 lautata hai.' },
          { title: 'Speed provider ke hisaab se', go: ['bad:prov>sw'], after: { sw: { state: 'warn', sub: 'rate: 10k/s' } }, text: 'Workers ek shared limiter (token bucket) se chalte hain jo provider ki hadd ke andar rakhe. Bada event pata ho to pehle se quota badhwao: Firebase docs ke mutabik temporary quota badhaane ke liye 15+ din pehle bolna hota hai.' },
        ]},
        { name: 'Job beech mein mara', steps: [
          { title: 'Page 300 pe crash', go: 'fo>bq', after: { fo: { state: 'down', sub: 'crash @ page 300' } }, text: 'Job ka server gir gaya. 3 lakh users ko jaa chuka, baaki 4.97 crore ko nahi.' },
          { title: 'Checkpoint se wapas', go: ['fo>aud', 'res:aud>fo', 'fo>bq'], set: { fo: { state: 'ok', sub: 'resume @ page 301' } }, text: 'Naya job checkpoint padhta hai ("page 300 tak") aur 301 se shuru karta hai. Agar page 300 aadha gaya tha, to wo dobara jaayega; per-user dedupe (aage) un users ko duplicate se bachata hai.' },
        ]},
      ],
    },

    { type: 'p', html: `Kitna time lagega? Aksar bottleneck hamare workers nahi, provider ki speed limit hoti hai. Khelo:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Recipients (millions): <strong class="nfo-rv"></strong></label><input class="nfo-r" type="range" min="1" max="200" step="1" value="50"></div>
          <div><label>Send workers: <strong class="nfo-wv"></strong></label><input class="nfo-w" type="range" min="10" max="1000" step="10" value="200"></div>
          <div><label>Har worker sends/second (maan lo): <strong class="nfo-sv"></strong></label><input class="nfo-s" type="range" min="50" max="2000" step="50" value="500"></div>
          <div><label>Batch size (users per message): <strong class="nfo-bv"></strong></label><input class="nfo-b" type="range" min="100" max="5000" step="100" value="1000"></div>
          <div><label>Provider ki hadd (k sends/s): <strong class="nfo-pv"></strong></label><input class="nfo-p" type="range" min="10" max="1000" step="10" value="100"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Workers ki speed</span><strong class="nfo-t"></strong></div>
          <div class="stat"><span>Asli speed (min)</span><strong class="nfo-e"></strong></div>
          <div class="stat"><span>Batch messages queue mein</span><strong class="nfo-n"></strong></div>
          <div class="stat"><span>Aakhri user tak (approx)</span><strong class="nfo-d"></strong></div>
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
        q('.nfo-note').textContent = `${k(R)} ÷ ${k(eff)}/s ≈ ${tm(secs)}. ` + (thr > P ? 'Provider ki hadd bottleneck hai: workers badhane se kuch nahi hoga; quota badhwao ya kai projects/providers mein baanto. ' : 'Workers bottleneck hain: aur workers ya tez workers. ') + (secs > 120 ? 'Live match alert ke liye ye bahut der hai: aakhri user ko khabar tab milegi jab replay chal raha ho.' : 'Live alert ke liye theek.');
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Default pe: 200 workers × 500/s = 1 lakh/s, provider ki hadd bhi 1 lakh/s, to 5 crore users tak ~<strong>8.3 minute</strong>, aur queue mein 50k batch messages. Provider ki hadd ko FCM ke default quota (10k/s) pe le aao: ab ~<strong>1.4 ghante</strong> (83 minute), aur workers 1,000 kar do tab bhi utna hi. Do aur tricks: <strong>sabse active users pehle</strong> (jo abhi app khole baithe hain), aur <strong>provider ki topic feature</strong> (FCM topics), jahan hum ek message dete hain aur fan-out Google karta hai. Lekin topic mein per-user preference, cap aur language lagana mushkil, isliye personalised notifications ke liye apna fan-out.` },
    { type: 'h3', text: 'Asli kahani: Duolingo ka Super Bowl push (2024)' },
    { type: 'p', html: `Feb 2024 ke Super Bowl mein Duolingo ka 5 second ka ad tha, aur marketing chahti thi ki ad chalte hi ~40 lakh (4 million) users ke phone pe push aaye. Duolingo ke blog ke mutabik unka pehle ka sabse bada push 5 lakh users ko 60 second mein gaya tha, aur usse bhi kuch crashes hue the. Nateeja: 95% users tak <strong>3.9 second</strong> mein, 99% tak 5.7 second mein. Ek Duolingo engineer ke talk (InfoQ Dev Summit, July 2024) ke mutabik kaise:` },
    { type: 'list', items: [
      `<strong>Speed ka hisaab:</strong> 40 lakh ÷ 5 second = ~8 lakh messages/second, jabki unki aam speed ~10k/second thi (80 guna).`,
      `<strong>Audience pehle se:</strong> users aur device IDs ki list hafton pehle nikaal ke S3 mein, aur broadcast se ghanton pehle workers ki memory mein load.`,
      `<strong>Batching:</strong> queue (SQS) ki apni speed limit thi, isliye ek queue message mein 500 iOS ya 250 Android users. Upar wali "batch queue" wahi idea hai.`,
      `<strong>Dedupe:</strong> SQS FIFO queue ki 5 minute ki built-in dedupe, taaki kai log trigger dabayein to bhi ek hi baar jaaye.`,
      `<strong>Alag cluster (bulkhead):</strong> broadcast workers ka apna ECS cluster (AWS pe containers chalane ki jagah), taaki baaki backend pe asar na pade.`,
      `<strong>Ulti lehar ka dhyaan:</strong> push pe tap karne se har app backend ko 10-50 requests bhejta tha; 40 lakh taps = khud pe hamla. Unhone thodi der ke liye app ki aisi requests rokne ka ek mode rakha.`,
    ]},
    { type: 'callout', tone: 'warn', title: 'Broadcast ki chhupi keemat', html: `Push bhejna aadha kaam hai. Har push ke baad kuch log app kholte hain, aur wo traffic tumhare <strong>baaki</strong> servers pe aata hai. 5 crore push × 5% open × 20 requests = 5 crore requests kuch minutes mein. Isliye broadcast ko lehron (waves) mein bhejo, ya pehle se servers badhao.` },

    { type: 'h2', text: 'Deep dive 6: bahar ke providers, aur ek gire to doosra' },
    { type: 'p', html: `Push ke liye Apple aur Google ke alawa koi raasta nahi. Lekin SMS aur email ke liye bahut saari companies hain, aur koi bhi kabhi bhi slow ya down ho sakti hai. OTP ka SMS na jaaye to user login nahi kar sakta: ye seedha business ka nuksaan hai. Isliye bade systems aam taur pe <strong>do ya zyada SMS vendors</strong> rakhte hain aur unke beech ek <strong>router</strong>. Companies ne apne exact routing rules publicly kam bataye hain; neeche wala design industry ka aam tareeka hai.` },
    { type: 'callout', tone: 'term', title: 'Provider router + circuit breaker', html: `<strong>Ye kya hai:</strong> router ek chhota faisla lene wala hissa hai: "is message ko kaunsa vendor bheje?" Wo har vendor ka haal (kitne % safal, kitna time, kitna daam) dekhta hai. <em>Circuit breaker</em> ek switch hai: vendor baar baar fail ho to kuch der ke liye use "band" maan lo aur traffic doosre ko bhejo; thodi der baad thoda traffic bhej ke check karo ki theek hua ya nahi.<br><strong>Kyun chahiye:</strong> ek vendor ke down hone pe OTP rukna nahi chahiye.<br><strong>Iske bina:</strong> har message pehle mare hue vendor pe timeout tak atkega, phir fail. Circuit breaker ki poori kahani <a href="#/resilience">resilience lesson</a> mein.` },
    { type: 'callout', tone: 'term', title: 'Delivery receipt (DLR)', html: `<strong>Ye kya hai:</strong> SMS vendor ka baad mein aane wala sandesh: "message phone tak pahuncha" ya "fail hua (number band, galat number)". Aam taur pe vendor hamare ek URL pe callback (webhook) bhejta hai.<br><strong>Kyun chahiye:</strong> "vendor ne le liya" aur "phone tak pahuncha" alag cheezein hain. Vendor ki asli safalta DLR se pata chalti hai.<br><strong>Iske bina:</strong> ek vendor chupchaap 30% messages kho raha ho to bhi hamein lagega sab theek hai.` },
    { type: 'flow', height: 340, title: 'SMS: vendor router aur failover',
      nodes: [
        { id: 'w', label: 'SMS worker', sub: 'OTP bhejna hai', x: 90, y: 170, w: 130, kind: 'server', info: 'Ye kya hai: SMS channel ka worker. Message banata hai aur router se poochhta hai kis vendor se bhejna hai.' },
        { id: 'rt', label: 'Vendor router', sub: 'health + cost', x: 270, y: 170, w: 140, kind: 'server', info: 'Ye kya hai: faisla karne wala hissa. Har vendor ka success rate, latency aur daam dekh ke vendor chunta hai, aur har vendor ke liye ek circuit breaker rakhta hai.' },
        { id: 'hc', label: 'Vendor stats', sub: 'success %, latency', x: 270, y: 50, w: 160, kind: 'cache', info: 'Ye kya hai: har vendor ka taaza haal: pichhle 5 minute mein kitne % safal (DLR se), kitne timeout, average time. Router isi ko padhta hai.' },
        { id: 'va', label: 'SMS vendor A', sub: 'sasta, primary', x: 480, y: 90, w: 150, kind: 'net', info: 'Ye kya hai: pehli SMS company. Sasti hai, isliye aam din saara traffic isi ko.' },
        { id: 'vb', label: 'SMS vendor B', sub: 'backup', x: 480, y: 250, w: 150, kind: 'net', info: 'Ye kya hai: doosri SMS company, thodi mehngi. Backup ke liye, aur kuch traffic hamesha isse bhi bhejte hain taaki pata rahe ki ye zinda hai.' },
        { id: 'ph', label: 'Phone', sub: 'user', x: 650, y: 170, w: 100, kind: 'client', info: 'Ye kya hai: user ka phone, jahan OTP aana hai.' },
      ],
      edges: [{ a: 'w', b: 'rt' }, { a: 'rt', b: 'hc' }, { a: 'rt', b: 'va' }, { a: 'rt', b: 'vb' }, { a: 'va', b: 'ph' }, { a: 'vb', b: 'ph' }],
      scenarios: [
        { name: 'Normal din', steps: [
          { title: 'Kaunsa vendor?', go: ['w>rt', 'rt>hc', 'res:hc>rt'], text: 'Router ne stats dekhe: A ka success 98%, latency 2s, sasta. A chuna.', msg: 'A: 98% ok, 2.1s  |  B: 97% ok, 2.8s' },
          { title: 'A ne bheja', go: ['rt>va', 'res:va>rt', 'evt:va>ph'], after: { ph: { state: 'ok', sub: 'OTP 4821' } }, text: 'A ne message liya (apna message ID diya) aur phone tak pahunchaya. Thodi der baad A ka DLR aaya: "delivered". Stats update.', msg: '202 { vendor_msg_id: "A-77812" }  ...  DLR: delivered' },
        ]},
        { name: 'Vendor A down', steps: [
          { title: 'A timeout', go: ['w>rt', 'rt>va', 'bad:va>rt'], set: { va: { state: 'down', sub: 'timeouts' } }, text: 'A jawab nahi de raha. 3 second timeout ke baad fail.' },
          { title: 'Circuit khula', go: ['rt>hc'], after: { hc: { state: 'warn', sub: 'A: circuit OPEN' } }, text: 'Pichhle 1 minute mein A ke 50% calls fail. Router ne A ka circuit khol diya: agle kuch minute A ko koi traffic nahi.' },
          { title: 'B se bheja', go: ['rt>vb', 'res:vb>rt', 'evt:vb>ph'], after: { ph: { state: 'ok', sub: 'OTP 4821' } }, text: 'Isi OTP ko B se bheja. User ko 3-4 second ki deri, lekin OTP aaya. Kuch minute baad router A pe thoda traffic bhej ke check karega.' },
        ]},
        { name: 'A slow, mara nahi', steps: [
          { title: 'A ne der lagayi', go: ['w>rt', 'rt>va'], set: { va: { state: 'warn', sub: 'bahut slow' } }, text: 'A ne 3 second mein jawab nahi diya. Router ne timeout maan liya.' },
          { title: 'B se bhi bheja', go: ['rt>vb', 'evt:vb>ph'], text: 'Router ne B se bhej diya.' },
          { title: 'Do OTP!', go: 'evt:va>ph', after: { ph: { state: 'warn', sub: '2 SMS aaye' } }, text: 'A asal mein zinda tha, bas slow. Usne bhi bhej diya. User ko do SMS. Isliye: (1) dono mein <strong>same OTP code</strong> bhejo, taaki confusion na ho; (2) marketing jaise messages ke liye failover tabhi karo jab pakka pata ho (DLR fail aaya); (3) failover har message ka record rakho. Failover hamesha "late" aur "duplicate" ke beech ka sauda hai.' },
        ]},
      ],
    },
    { type: 'list', items: [
      `<strong>Channel fallback:</strong> OTP push se gaya lekin 20 second mein app ne "mil gaya" report nahi kiya? To SMS bhejo. Mehnga raasta tabhi jab sasta fail ho.`,
      `<strong>Email bhi aise hi:</strong> do email providers, aur bounce/complaint ki ginti pe nazar. Ek provider ka sending reputation gira to doosre pe shift.`,
      `<strong>Webhooks mein ulta:</strong> yahan "provider" seller ka apna server hai. Wo slow ho to hamare workers atakte hain. Razorpay ne isi wajah se baar baar fail hone wale customers ke webhooks ko alag queue aur kam priority pe daala.`,
    ]},

    { type: 'h2', text: 'Deep dive 7: retries, DLQ aur duplicate rokna' },
    { type: 'h3', text: 'Kab retry karein, aur kab nahi' },
    { type: 'p', html: `Pehla faisla: <strong>429 (bahut zyada bheja), 5xx (provider ki taraf problem), timeout</strong> = thodi der ki problem, retry karo. <strong>400 (galat request), 410/UNREGISTERED (token mara), "number galat", "user ne unsubscribe kiya"</strong> = pakki problem, retry bekaar; record karo aur chhodo. Retries ki general kahani <a href="#/queues">Message queues</a> lesson mein hai; yahan teen naye shabd:` },
    { type: 'callout', tone: 'term', title: 'Exponential backoff aur jitter', html: `<strong>Ye kya hai:</strong> <em>Backoff</em> = har fail ke baad thoda zyada ruko: 1s, 2s, 4s, 8s (har baar double, isliye "exponential"). <em>Jitter</em> = us rukne mein thoda random hissa, jaise 4s ki jagah 0 se 8s ke beech koi bhi.<br><strong>Kyun chahiye:</strong> 1,000 messages ek saath fail hue aur sab theek 1 second baad retry karein, to provider pe phir 1,000 ek saath (ise <em>thundering herd</em> kehte hain). Jitter retries ko waqt mein phaila deta hai.<br><strong>Iske bina:</strong> provider theek hote hi phir gir jaata hai, aur messages attempts khatam karke DLQ mein.` },
    { type: 'callout', tone: 'term', title: 'DLQ (dead-letter queue)', html: `<strong>Ye kya hai:</strong> un messages ki alag line jo saare attempts ke baad bhi nahi gaye.<br><strong>Kyun chahiye:</strong> unhe na phenko, na hamesha retry karo. Wahan rakho, alert bhejo, insaan dekhe ki kya galat hai, aur theek hone pe dobara chala do (replay).<br><strong>Iske bina:</strong> ya to message chupchaap kho jaata, ya ek kharab message hamesha line ko rokta.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="nrj-modes" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="row2" style="margin-top:10px">
          <div><label>Provider capacity (sends/second): <strong class="nrj-cv"></strong></label><input class="nrj-c" type="range" min="50" max="1000" step="50" value="150"></div>
          <div><label>Provider outage (seconds): <strong class="nrj-ov"></strong></label><input class="nrj-o" type="range" min="0" max="10" step="1" value="2"></div>
          <div><label>Max attempts (phir DLQ): <strong class="nrj-mv"></strong></label><input class="nrj-m" type="range" min="3" max="8" step="1" value="6"></div>
        </div>
        <svg class="nrj-svg" viewBox="0 0 320 120" style="width:100%;height:auto;margin-top:10px" role="img" aria-label="Har second kitne retry attempts"></svg>
        <div class="stats">
          <div class="stat"><span>Delivered</span><strong class="nrj-ok"></strong></div>
          <div class="stat"><span>DLQ mein</span><strong class="nrj-dlq"></strong></div>
          <div class="stat"><span>Total attempts</span><strong class="nrj-tot"></strong></div>
          <div class="stat"><span>Ek second mein max retries</span><strong class="nrj-pk"></strong></div>
          <div class="stat"><span>Aakhri delivery</span><strong class="nrj-last"></strong></div>
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
        q('.nrj-note').textContent = `1,000 messages ek saath fail hue. ${jitter ? 'Jitter ke saath' : 'Bina jitter'}: ${r.ok} delivered, ${r.dlq} DLQ, ${r.total} attempts. Doosre tareeke mein: ${o.ok} delivered, ${o.dlq} DLQ, ${o.total} attempts. ` + (jitter ? (r.dlq < o.dlq ? 'Retries waqt mein phail gaye, to provider ki capacity har second kaam aayi aur kam messages DLQ mein gaye.' : r.last > o.last + 1 ? 'Is baar provider ke paas kaafi jagah thi, to jitter ne sirf deri badhayi.' : 'Retries waqt mein phail gaye.') : (r.dlq > 0 ? 'Saare retries ek hi second pe toot padte hain: capacity se upar wale phir fail, aur attempts khatam hote hi DLQ.' : 'Capacity kaafi thi, to bina jitter bhi sab jaldi nikal gaya.')) + ' (Jitter: delay 0 se 2× ke beech random, seeded.)';
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Default pe (capacity 150/s, 2 second outage, 6 attempts): bina jitter sirf <strong>600 delivered aur 400 DLQ</strong>, kyunki har lehar mein saare retries ek saath aate hain aur ek second mein sirf 150 nikal paate hain. Jitter ke saath <strong>saare 1,000 delivered</strong>, aur attempts 5,100 se ghat ke 3,675. Lekin capacity 1,000/s kar do: bina jitter 3 second mein sab khatam, jitter ke saath ~16 second. Jitter muft nahi: wo provider ko bachata hai, kuch messages ko thoda late karke. OTP jaise urgent messages ke liye isliye attempts kam aur delay chhote rakho, aur jaldi doosre vendor/channel pe jao.` },

    { type: 'h3', text: 'Duplicate kahan se aate hain, aur kaise rokein' },
    { type: 'p', html: `Duplicates do jagah se aate hain. <strong>(1) Producer retry</strong>: payment service ne timeout pe request dobara bheji. Isse API ka idempotency key rokta hai (intake diagram mein dekha). <strong>(2) Queue redelivery</strong>: queues aam taur pe <em>at-least-once</em> hoti hain, yaani "kam se kam ek baar, kabhi kabhi do baar". Worker ne APNs ko bhej diya, lekin ack karne se pehle crash ho gaya. Queue sochti hai kaam nahi hua, message doosre worker ko de deti hai, aur user ko do notifications.` },
    { type: 'steps', items: [
      { t: 'Har message ka pakka ID', d: 'notification_id + channel (jaise n_7f3a:push) intake pe hi ban jaata hai, aur retries mein kabhi nahi badalta.' },
      { t: 'Bhejne se pehle "claim"', d: 'Worker Redis mein SET sent:n_7f3a:push NX EX 86400 karta hai. Mila to bhejo; nahi mila to koi aur bhej chuka, chhod do aur ack karo. Bhejne ke baad DB mein status "sent".' },
      { t: 'Provider ki madad', d: 'APNs ka apns-collapse-id aur FCM ka collapse key: same ID ke do notifications aayein to phone pe naya purane ki jagah le leta hai, do alag nahi dikhte. Email aur SMS mein aisa koi undo nahi, wahan claim step aur zaroori.' },
      { t: 'Matlab-level dedupe', d: 'Alag IDs, same matlab: "Riya ne aapki photo like ki" 3 baar. Ise LinkedIn ka ATC jaisa system filter karta hai: same cheez ka notification dobara mat bhejo, aur jo user site pe dekh chuka uska mat bhejo. Ya "Riya aur 2 aur ne like kiya" jaisa jod do.' },
    ]},
    { type: 'callout', tone: 'warn', title: 'Exactly-once ka sapna', html: `"Claim, phir bhejo" mein bhi ek chhota gap hai: claim ke baad, bhejne se pehle worker mara, to claim ka time (TTL) khatam hone tak koi nahi bhejega (late). Claim bhejne ke baad karo to crash pe duplicate. Network ke paar <strong>exactly-once delivery ki guarantee nahi milti</strong>; hum duplicate ko bahut rare aur deri ko seemit banaate hain. Transactional ke liye aam taur pe "kabhi kabhi duplicate" "kabhi kabhi gayab" se behtar maana jaata hai (OTP do baar aana chalega, na aana nahi).` },
    { type: 'h3', text: 'Webhooks: jab "phone" kisi company ka server ho' },
    { type: 'p', html: `Webhook channel mein hum seller ke server ko POST karte hain. Yahan wahi saare niyam lagte hain, aur kuch naye. Stripe (payments company) ke official docs ek achha namoona hain:` },
    { type: 'list', items: [
      `<strong>Lambe retries:</strong> Stripe live mode mein fail hua webhook <strong>3 din tak</strong> exponential backoff ke saath dobara bhejta hai. Seller ka server raat bhar down raha to bhi subah events mil jaate hain.`,
      `<strong>Signature:</strong> har request pe ek header mein timestamp + HMAC-SHA256 signature, seller ke secret se bana. Seller check karta hai ki request sach mein Stripe se aayi, kisi nakli se nahi. Purana timestamp (default 5 minute se zyada) ho to reject, taaki koi purani request dobara na chala sake (replay attack).`,
      `<strong>Duplicates aur order:</strong> Stripe saaf kehta hai ki same event kabhi kabhi do baar aa sakta hai aur order ki guarantee nahi. Seller ko event ID log karke dedupe karna chahiye.`,
      `<strong>Jaldi 2xx:</strong> seller ko pehle "mil gaya" (2xx) lautana chahiye, bhaari kaam baad mein queue se. Warna timeout, aur hamein lagega fail hua, aur retry = duplicate.`,
    ]},

    { type: 'h2', text: 'Deep dive 8: rate limiting aur frequency capping' },
    { type: 'p', html: `"Kitna zyada, zyada hai?" Ye sawaal chaar alag jagah aata hai, aur har jagah ek counter chahiye. Counters ka tareeka wahi hai jo <a href="#/rate-limiting">Rate limiting</a> lesson mein seekha (Redis mein token bucket ya window counter).` },
    { type: 'callout', tone: 'term', title: 'Frequency cap', html: `<strong>Ye kya hai:</strong> ek user ko ek category mein ek time mein max kitne notifications, jaise "din mein 3 marketing push" ya "do push ke beech kam se kam 2 ghante".<br><strong>Kyun chahiye:</strong> har team sochti hai uska notification sabse zaroori hai. Sab ko milake user pe baarish ho jaati hai, aur wo notifications band kar deta hai ya app hi uninstall.<br><strong>Iske bina:</strong> ek din mein 40 push. Uber ne 2022 mein likha ki unke Uber Eats push alag teams se aate the, minutes ke farak pe, kabhi ek doosre se ulti baatein karte hue; isi ko theek karne ke liye unhone ek central layer banayi (aage).` },
    { type: 'table', head: ['Kiski hadd', 'Example', 'Kyun'], rows: [
      ['Har user (frequency cap)', 'Marketing push: 3/din, 2 ghante ka gap', 'User ka dhyaan aur bharosa bachana'],
      ['Har producer / team / customer', 'Marketing team: 1 crore/ghanta; Razorpay: har customer aur har notification type ki alag hadd', 'Ek team ya ek customer ka bug sabko na dubo de (LinkedIn ATC bhi upstream apps pe rate limit lagata tha)'],
      ['Har provider', 'FCM default 600k/minute per project; Android pe ek device ko 240/minute aur 5,000/ghanta tak', 'Provider ki hadd tod-ne pe 429, aur phir sab slow'],
      ['Har phone number (OTP)', '3 OTP / 10 minute per number, aur per IP', 'Koi script hazaron OTP SMS trigger karke hamara SMS bill na badha de'],
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "cap laga, to message phenk do"', html: `Cap bhar gaya to har baar phenkna zaroori nahi. Teen options: <strong>drop</strong> (kam zaroori, jaise "naye videos"), <strong>delay</strong> (kal subah), ya <strong>jod do</strong> (digest: "aaj 7 log ne aapki post like ki"). Aur cap sirf marketing/social pe; OTP aur security alerts pe cap ka matlab user ko apne account se bahar karna.` },

    { type: 'h2', text: 'Deep dive 9: quiet hours, time zones aur scheduling' },
    { type: 'p', html: `xyz.com ke users India, Dubai aur New York mein hain. "Raat 11 baje ke baad marketing mat bhejo" ka matlab <strong>user ki</strong> raat hai, server ki nahi. Isliye har user ki timezone save karo (jaise <code>Asia/Kolkata</code>, ek naam, sirf "+5:30" nahi, kyunki kai deshon mein saal mein do baar ghadi badalti hai, jise daylight saving kehte hain) aur har faisla uske local time mein lo.` },
    { type: 'callout', tone: 'term', title: 'Quiet hours', html: `<strong>Ye kya hai:</strong> user ke local time mein wo ghante jab kam zaroori notifications nahi bhejne, jaise 11 PM se 8 AM.<br><strong>Kyun chahiye:</strong> raat 2 baje "sale!" se phone bajna sabse tez tareeka hai user ko naraz karne ka. India mein promotional SMS ke liye to telecom rule hi hai: sirf 9 AM se 9 PM IST.<br><strong>Iske bina:</strong> complaints, uninstall, aur SMS ke case mein kanoon ka ullanghan. OTP pe quiet hours kabhi nahi lagte: user ne khud abhi login dabaya hai.` },
    { type: 'p', html: `Neeche ek user ke liye faisla khud dekho. Rules: quiet hours 11 PM-8 AM (user local), marketing cap 3/din. OTP sab rules se upar, social quiet hours maanta hai, marketing dono:` },
    { type: 'custom', render(el) {
      const TZ = [['IN', 'India (UTC+5:30)', 5.5], ['AE', 'Dubai (UTC+4)', 4], ['NY', 'New York (UTC-4, abhi)', -4]];
      const TY = [['otp', 'OTP'], ['social', 'Social (comment)'], ['mkt', 'Marketing (sale)']];
      let tz = 'IN', ty = 'mkt';
      el.innerHTML = `<div class="nqh-a" style="display:flex;flex-wrap:wrap;gap:8px"></div><div class="nqh-b" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"></div>
        <div class="row2" style="margin-top:10px">
          <div><label>Server time (UTC): <strong class="nqh-uv"></strong></label><input class="nqh-u" type="range" min="0" max="23.5" step="0.5" value="19.5"></div>
          <div><label>Aaj ja chuke marketing push: <strong class="nqh-cv"></strong></label><input class="nqh-c" type="range" min="0" max="5" step="1" value="1"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>User ka local time</span><strong class="nqh-l"></strong></div>
          <div class="stat"><span>Faisla</span><strong class="nqh-d"></strong></div>
          <div class="stat"><span>Kab jaayega (local)</span><strong class="nqh-s"></strong></div>
          <div class="stat"><span>Kab jaayega (UTC)</span><strong class="nqh-z"></strong></div>
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
        if (ty === 'otp') { d = 'Abhi bhejo'; why = 'OTP transactional hai: user ne abhi khud maanga. Quiet hours aur caps lagu nahi.'; }
        else if (ty === 'mkt' && C >= 3) { d = 'Aaj nahi'; sendL = null; why = 'Aaj ka marketing cap (3) bhar chuka. Kal ke liye rakho ya digest mein jodo, ya phenk do agar kal tak bekaar ho jaayega.'; }
        else if (quiet) { sendL = ty === 'mkt' ? 9 : 8; d = 'Baad mein'; why = `User ke yahan ${hm(L)} hai, quiet hours (23:00-08:00). ${ty === 'mkt' ? 'Marketing subah 09:00 local pe' : 'Social subah 08:00 local pe, ya subah ke digest mein'}.`; }
        else { d = 'Abhi bhejo'; why = `User ke yahan ${hm(L)} hai: quiet hours nahi${ty === 'mkt' ? ', aur cap bhi bacha hai (' + C + '/3)' : ''}.`; }
        const wait = sendL == null ? null : ((sendL - L) % 24 + 24) % 24;
        q('.nqh-l').textContent = hm(L); q('.nqh-d').textContent = d;
        q('.nqh-s').textContent = sendL == null ? 'kal / digest' : hm(sendL);
        q('.nqh-z').textContent = sendL == null ? '-' : hm(U + wait);
        q('.nqh-note').textContent = why + (wait ? ` Yaani ${wait} ghante baad. Scheduler isse ek "send_at" ke saath rakhega, aur bhejne se pehle preferences dobara check karega.` : '');
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Default pe: server pe UTC 19:30, India mein raat <strong>01:00</strong>. Marketing push quiet hours mein hai, to subah <strong>09:00 IST</strong> (UTC 03:30) ke liye, 8 ghante baad. Wahi push New York ke user ko us waqt 15:30 pe turant jaata. Aur OTP? Hamesha turant.` },
    { type: 'h3', text: 'Scheduling: "kal subah 9 baje bhejo" kaise kaam karta hai' },
    { type: 'callout', tone: 'term', title: 'Scheduler', html: `<strong>Ye kya hai:</strong> ek background service jo "kab bhejna hai" wale messages ko sambhal ke rakhti hai aur sahi waqt aane pe unhe queue mein daal deti hai.<br><strong>Kyun chahiye:</strong> quiet hours, "9 baje local" campaigns, reminders ("kal aapki class hai") sab future ke kaam hain.<br><strong>Iske bina:</strong> ya to sab turant jaata, ya har team apna cron job likhti, jo crash hone pe chupchaap messages kho deta.` },
    { type: 'list', items: [
      `<strong>Simple tareeka:</strong> <code>scheduled</code> table mein <code>send_at</code> pe index. Scheduler har few seconds poochhta hai "jinka send_at abhi ya pehle hai, 1,000 do", unhe queue mein daalta hai, aur row ko "queued" mark karta hai (do scheduler ek hi row na uthayein, isliye row lock ya "claim" step).`,
      `<strong>Bade scale pe time buckets:</strong> Uber ne 2022 mein bataya ki unka push system (Consumer Communication Gateway) scheduling ko <strong>har ghante ke liye ek Kafka topic</strong> aur Cadence (workflow engine) pe phailata hai, aur aise "tens of thousands" triggers per second sambhalta hai.`,
      `<strong>"9 baje local" campaign = lehrein:</strong> India ka 9 baje, Dubai ka 9 baje, London ka 9 baje alag UTC pe hain. Campaign ek nahi, har timezone ki ek lehar hai. Isse load bhi apne aap phail jaata hai.`,
      `<strong>Expiry (send_by):</strong> "Match 5 minute mein shuru" 2 ghante late bekaar hai. Har message ke saath "isse late ho to mat bhejo" ka time; worker bhejne se pehle check kare. Push ke liye yahi kaam apns-expiration / FCM TTL bhi karte hain.`,
      `<strong>Best time chunna:</strong> Uber ka system har user ke liye ek ML model (XGBoost) se andaaza lagata hai ki kis ghante push pe kaam ka nateeja milne ka chance sabse zyada hai, phir linear programming se poore din ka plan banata hai: expiry, send window, daily cap aur do push ke beech ke minimum gap ko maante hue. LinkedIn ka ATC bhi member ke active time pe bhejta tha.`,
    ]},

    { type: 'h2', text: 'Deep dive 10: delivery tracking aur analytics' },
    { type: 'p', html: `"Mera OTP nahi aaya" — support team ko jawab dena hai. Marketing team ko jaanna hai kaunsa template zyada click hua. Iske liye har message ki ek kahani chahiye: kab bana, kab gaya, pahuncha ya nahi, khula ya nahi.` },
    { type: 'table', head: ['Status', 'Matlab', 'Kaun batata hai', 'Kitna pakka'], rows: [
      ['accepted / queued', 'Humne le liya, line mein hai', 'Hamari API', 'Pakka'],
      ['skipped', 'Jaan boojh ke nahi bheja (preference, cap, expiry), reason ke saath', 'Hamari API / worker', 'Pakka'],
      ['sent', 'Provider ne le liya', 'Provider ka jawab (200 / message ID)', 'Pakka, lekin phone tak ka nahi'],
      ['delivered', 'Phone / inbox tak pahuncha', 'SMS: vendor ka DLR. Email: provider ka "delivered"/bounce. Push: APNs aisa receipt nahi deta; app khud report kare, ya FCM ki delivery reports', 'Channel pe depend'],
      ['opened', 'User ne dekha', 'Push: app (tap). Email: chhupi image (pixel) load hui', 'Email mein kamzor (neeche)'],
      ['clicked', 'User ne link dabaya', 'Hamara tracking link (redirect)', 'Achha'],
      ['failed', 'Nahi gaya, aur kyun (410, bounce, number band)', 'Provider / worker', 'Pakka'],
    ]},
    { type: 'flow', height: 340, title: 'Status events ka raasta',
      nodes: [
        { id: 'w', label: 'Workers', sub: 'sent / failed', x: 90, y: 60, w: 130, kind: 'server', info: 'Ye kya hai: wahi channel workers. Har send ke baad ek chhota status event stream mein daalte hain, DB mein seedha nahi likhte.' },
        { id: 'prov', label: 'Providers', sub: 'SMS / email', x: 90, y: 170, w: 130, kind: 'net', info: 'Ye kya hai: SMS aur email companies. Baad mein callback (webhook) se batati hain: delivered, bounced, spam complaint, unsubscribe.' },
        { id: 'app', label: 'xyz app', sub: 'open / click', x: 90, y: 280, w: 130, kind: 'client', info: 'Ye kya hai: user ka app/browser. Push tap hua (opened) ya tracking link khula (clicked), to ek event bhejta hai.' },
        { id: 'cb', label: 'Events API', sub: 'callbacks + app', x: 280, y: 225, w: 140, kind: 'server', info: 'Ye kya hai: wo endpoint jo providers ke callbacks aur app ke open/click events leta hai. Callback ka signature check karta hai, phir event stream mein daalta hai aur jaldi 200 lautata hai.' },
        { id: 'st', label: 'Status stream', sub: 'Kafka / Kinesis', x: 460, y: 140, w: 140, kind: 'queue', info: 'Ye kya hai: events ki lambi, order mein rakhi list (log) jise kai consumers apni speed se padhte hain. Yahan saare status events aate hain. DB slow ho to events yahan ruk jaate hain, bhejna nahi rukta.' },
        { id: 'db', label: 'Status DB', sub: 'latest per msg', x: 640, y: 70, w: 130, kind: 'data', info: 'Ye kya hai: har message ka taaza status (support ke liye: "OTP ka kya hua?"). Consumer events ko batch mein likhta hai.' },
        { id: 'an', label: 'Analytics', sub: 'warehouse', x: 640, y: 220, w: 130, kind: 'data', info: 'Ye kya hai: saare events ka bada store (data warehouse) jahan funnels, A/B tests, provider-wise success rate aur unsubscribe rate nikalte hain.' },
      ],
      edges: [{ a: 'w', b: 'prov' }, { a: 'w', b: 'st' }, { a: 'prov', b: 'cb' }, { a: 'app', b: 'cb' }, { a: 'cb', b: 'st' }, { a: 'st', b: 'db' }, { a: 'st', b: 'an' }],
      scenarios: [
        { name: 'SMS ka safar', steps: [
          { title: 'Bheja, "sent"', go: ['w>prov', 'evt:w>st'], text: 'Worker ne SMS vendor ko bheja, vendor ne apna message ID diya. Worker ne "sent" event stream mein daala.', msg: '{ n: "n_7f3a", ch: "sms", status: "sent", vendor_msg_id: "A-77812", t: 10:30:01 }' },
          { title: 'DLR aaya', go: ['evt:prov>cb', 'evt:cb>st'], text: '4 second baad vendor ka callback: delivered. Events API ne vendor_msg_id se hamara notification dhoondha aur event daala.', msg: 'POST /callbacks/sms  { id: "A-77812", status: "DELIVRD" }' },
          { title: 'DB aur analytics', go: ['evt:st>db', 'evt:st>an'], after: { db: { state: 'ok', sub: 'n_7f3a: delivered' } }, text: 'Do consumers: ek taaza status DB mein (support ke liye), ek warehouse mein (reports ke liye). Ab support kehta hai: "OTP 10:30:05 pe aapke phone pe pahunch gaya tha."' },
        ]},
        { name: 'Open aur click', steps: [
          { title: 'Push pe tap', go: ['app>cb', 'evt:cb>st', 'evt:st>an'], text: 'User ne push tap kiya: app ne "opened" bheja, notification_id ke saath.', msg: '{ n: "n_9a1c", event: "opened" }' },
          { title: 'Link click', go: ['app>cb', 'evt:cb>st', 'evt:st>an'], after: { an: { state: 'ok', sub: 'funnel ready' } }, text: 'Email ka link asal mein hamara chhota tracking link tha (<a href="#/url-shortener">URL shortener</a> jaisa): pehle click record, phir asli page pe redirect.' },
        ]},
        { name: 'Callbacks ulte aur do baar', steps: [
          { title: 'Delivered pehle aaya', go: ['evt:prov>cb', 'evt:cb>st', 'evt:st>db'], text: 'Network ki wajah se "delivered" callback "sent" event se pehle pahunch gaya. Aur vendor ne ek callback do baar bhej diya.' },
          { title: 'Status sirf aage badhe', focus: ['db'], after: { db: { state: 'ok', sub: 'delivered (stays)' } }, text: 'Status ko ek seedhi (state machine) maano: queued → sent → delivered → opened → clicked. Purana ya peeche wala event aaye to ignore. Duplicate callback (same vendor_msg_id + status) bhi ignore.' },
        ]},
        { name: 'Status DB slow', steps: [
          { title: 'DB pe dabaav', set: { db: { state: 'warn', sub: 'writes slow' } }, flood: { paths: ['evt:w>st'], n: 8 }, after: { st: { state: 'warn', sub: 'backlog badh raha' } }, text: 'Sale ke din status writes DB ki capacity se zyada.' },
          { title: 'Bhejna nahi ruka', go: ['w>prov'], set: { w: { state: 'ok', sub: 'normal speed' } }, text: 'Workers sirf stream mein likhte hain, DB ka wait nahi karte, to bhejna normal. DB consumer batch mein, apni speed se, backlog khatam karega. Razorpay ne bilkul yahi badlav kiya (aage).' },
        ]},
      ],
    },
    { type: 'callout', tone: 'warn', title: 'Email "open" pe bharosa kam karo', html: `Email open aam taur pe ek chhupi 1×1 image se naapa jaata hai: image load hui = khola. Lekin Apple ke Mail Privacy Protection mein Mail app remote content (images) ko message <em>aate hi</em> background mein load kar leta hai, user ke khole bina. To bahut se "opens" asli nahi. Clicks aur aage ke actions (khareeda, login kiya) zyada bharosemand hain. Push ke "delivered" ke liye bhi: FCM ki delivery reports aur BigQuery export milte hain, lekin der se (ghanton se dino tak), isliye real-time ke liye app ka apna "mil gaya" event.` },

    { type: 'h2', text: 'Asli companies ne kya kiya' },
    { type: 'h3', text: 'LinkedIn ATC: "kya bhejna hai" bhi ek system hai (2018)' },
    { type: 'p', html: `Ab tak humne zyada "kaise bhejna hai" banaya. LinkedIn ki 2018 ki post batati hai ki bade scale pe asli mushkil "<strong>bhejna chahiye ya nahi</strong>" hai. Unke platform ka naam tha <strong>Air Traffic Controller (ATC)</strong>, aur uska lakshya tha "5 Rights": sahi message, sahi member, sahi channel, sahi time, sahi frequency. Post ke mutabik ATC ye kaam karta tha:` },
    { type: 'list', items: [
      `<strong>Filtering:</strong> duplicate, expire hua content, ya member site pe pehle hi dekh chuka: mat bhejo. Upstream apps pe rate limits taaki koi team spam na kar sake.`,
      `<strong>Aggregation:</strong> kai notifications ko ek digest mein jodna (jaise weekly email), relevance ke hisaab se rank karke.`,
      `<strong>Channel selection:</strong> email, push, SMS, in-app ya desktop: member ki settings aur ML models (kya click karega, kya notification band kar dega) ke hisaab se.`,
      `<strong>Delivery time optimization:</strong> member ki timezone dekh ke, sone ke time nahi, aur jab wo zyada active ho tab.`,
      `<strong>Andar se:</strong> Kafka se requests aur signals, Samza (stream processing framework) se processing, aur har member ki state RocksDB (ek tez local key-value store) mein. Saare requests <strong>member ID se partition</strong>, taaki ek member ka saara data ek hi machine pe local mile (network call ki jagah milliseconds se kam). Local state Kafka mein backup hoti thi.`,
    ]},
    { type: 'p', html: `Post ke mutabik ATC din mein 1 billion se zyada requests sambhalta tha, member complaints aadhi hui, aur member-to-member message push ki P90 latency (90% messages isse jaldi pahunche) ~12 second se ~1.5 second hui. Post 2018 ki hai; aaj LinkedIn ka system aage badh chuka hoga, lekin "decision layer" ka idea aaj bhi standard hai.` },
    { type: 'h3', text: 'Uber CCG: push ki timing ka hisaab (2022)' },
    { type: 'p', html: `Uber ki Nov 2022 post ke mutabik Uber Eats ke push marketing, city teams aur product teams se aate the, aur 2020 ke end tak billions per month ho gaye. Problems: kuch push late, toote links, duplicates, minutes ke farak pe ulti baatein, aur koi personalised timing nahi. Unhone <strong>Consumer Communication Gateway (CCG)</strong> banaya, ek central layer jo har user ke push ki quality, ranking, timing aur frequency sambhalti hai. Hisse: aane wale push ek <strong>inbox</strong> mein (sharded MySQL, user ID se partition), ek <strong>schedule generator</strong> jo ML + linear programming se din ka plan banata hai, ek <strong>scheduler</strong> (har ghante ka Kafka topic + Cadence), aur <strong>delivery</strong> jo bhejne se theek pehle aakhri check karti hai (jaise push abhi bhi valid hai ya expire ho gaya).` },
    { type: 'h3', text: 'Razorpay: jab database bottleneck bana' },
    { type: 'p', html: `Razorpay (Indian payments company) ki notification service SMS, email aur webhooks bhejti hai. Unke engineering blog post ke mutabik (post pe exact saal saaf nahi; Oct 2022 ke newsletters ne iska summary likha, to kam se kam utni purani hai) purana design simple tha: API pods request check karke SQS (AWS ki queue service) mein daalte, workers bhejte aur nateeja seedha database aur data lake mein likhte, aur ek scheduler fail hue requests ko time time pe dobara SQS mein daalta. Wo ~2K TPS (transactions per second) tak sambhal sakta tha, peak ~1K TPS hota tha, lekin us level pe p99 latency (sabse slow 1% ko chhod ke baaki sab isse tez) ~2 se ~4 second ho jaati thi.` },
    { type: 'table', head: ['Problem', 'Unka fix'], rows: [
      ['Ek hi queue: festive season ke bulk messages transactional ko rok dete', 'Request type aur customer ke hisaab se priority, alag P0/P1 queues'],
      ['Ek customer ka flood baaki sab ko slow kare', 'Rate limiter: per customer aur per notification type'],
      ['Har worker DB mein turant likhta; DB ki write capacity (IOPS) ne workers ki scaling rok di', 'Workers nateeja Kinesis stream mein daalte, alag consumers DB aur data lake mein likhte (async writes)'],
      ['Slow customer endpoints (webhooks) workers ko atkaa dete', 'Retries ke liye alag queue aur workers; baar baar fail hone wale customers ko kam priority'],
    ]},
    { type: 'p', html: `Sabak wahi jo napkin maths ne dikhaya: notification service ka bottleneck aksar <strong>bhejna nahi, apna status likhna</strong> hota hai. Status ko event stream mein daalo aur batch mein likho.` },
    { type: 'h3', text: 'Netflix RENO: push + pull (2022)' },
    { type: 'p', html: `Netflix ka Rapid Event Notification System (2022 post) devices ko batata hai ki kuch badla (jaise "watch list update hui"). Do baatein yahan kaam ki: events <strong>priority ke hisaab se alag queues aur alag clusters</strong> pe, aur <strong>hybrid</strong> model: jo device abhi online hai use push, aur baaki devices apne aap missed events pull kar lete hain (Cassandra mein rakhe). Isi ko humne in-app inbox ke roop mein dekha. Unhone load kam karne ke liye bahut purane events phenkna aur sirf online devices ko push karna jaise filters bhi lagaaye.` },

    { type: 'h2', text: 'Kya kya toot sakta hai' },
    { type: 'table', head: ['Failure', 'Asar', 'Bachaav'], rows: [
      ['Provider (APNs, SMS vendor) down ya slow', 'Ek channel ruka', 'Queue + retry (backoff + jitter), bulkhead per channel, doosra vendor (router + circuit breaker), OTP ke liye channel fallback'],
      ['Worker crash: bhej diya, ack se pehle', 'Duplicate', 'Claim step (SET NX), collapse id, idempotency key'],
      ['Marketing campaign ka toofan', 'OTP late', 'Alag P0/P1 queues aur workers'],
      ['Broadcast job beech mein mara', 'Aadhe users ko gaya', 'Checkpoint per page, per-user dedupe'],
      ['Marketer ne do baar dabaya', 'Crores ko do baar', 'Campaign ID se dedupe'],
      ['Provider ki hadd (429)', 'Sab slow, retries ka toofan', 'Shared limiter provider ki hadd ke andar, quota pehle se badhwao'],
      ['Mare hue device tokens jama', 'Bekaar sends, kharcha', '410/UNREGISTERED pe delete, launch pe token refresh'],
      ['Template bug', 'Lakhon logon ko "Hi {{name}}"', 'Versioned templates, preview/test send, rollback, fallback locale'],
      ['Status DB bottleneck', 'Workers slow, latency upar', 'Status events stream mein, batch writes (Razorpay)'],
      ['Push ke baad ulti lehar', 'Baaki backend pe traffic ka pahaad', 'Lehron mein bhejo, servers pehle se badhao (Duolingo)'],
      ['Scheduler down', 'Scheduled messages late', 'Kai scheduler copies + claim, send_by expiry taaki bahut late wale na jaayein'],
      ['Phone offline', 'Push kho gaya', 'In-app inbox, sahi TTL, zaroori ho to SMS/email'],
    ]},

    { type: 'callout', tone: 'why', title: 'Decide', html: `Transactional aur marketing ki <strong>alag queues aur workers hamesha</strong>, aur har channel ke alag. Producer ko 202 do, bhejna async. Bhejne se pehle faisla: dedupe, preference, quiet hours, cap. Retry sirf 429/5xx/timeout pe, backoff + jitter ke saath, phir DLQ. Push ko best-effort maano: zaroori cheez in-app inbox mein bhi. Duplicate se bachne ke liye idempotency key (intake) + claim (delivery). SMS/email ke liye kam se kam do vendors. Status ko stream mein likho, DB mein seedha nahi.` },

    { type: 'h2', text: 'Interview mein kaise bolein' },
    { type: 'steps', items: [
      { t: 'Requirements', d: 'Channels (push, SMS, email, in-app, webhook), transactional vs marketing, OTP ki latency, preferences, scale (broadcast size).' },
      { t: 'Napkin maths', d: 'Sends/s average aur peak, status writes/s (kai guna), SMS ka kharcha, provider limits.' },
      { t: 'API + data model', d: '202 Accepted + idempotency key; templates, prefs, devices, notifications/deliveries, inbox, scheduled.' },
      { t: 'High-level design', d: 'API → decide (dedupe, prefs, quiet hours, caps) → priority queues per channel → channel workers → providers → status stream.' },
      { t: 'Deep dives', d: 'Device tokens + APNs/FCM; fan-out batches; provider router + failover; retries + jitter + DLQ; claim-before-send; scheduling + timezone; tracking.' },
      { t: 'Asli examples', d: 'LinkedIn ATC (decision layer, 2018), Uber CCG (timing, 2022), Razorpay (P0/P1 + async status), Netflix RENO (push + pull, 2022), Duolingo (4M push in seconds, 2024).' },
    ]},

    { type: 'diagram', title: 'Poora design, ek nazar mein', height: 700,
      groups: [
        { label: 'Producers', x: 10, y: 6, w: 550, h: 96 },
        { label: 'Intake', x: 10, y: 120, w: 550, h: 98 },
        { label: 'Queues + workers', x: 10, y: 244, w: 550, h: 200 },
        { label: 'Providers', x: 10, y: 476, w: 550, h: 92 },
        { label: 'Data', x: 572, y: 120, w: 140, h: 448 },
      ],
      nodes: [
        { id: 'svc', label: 'Services', sub: 'payments, login...', x: 110, y: 60, w: 150, kind: 'server', info: 'Ye kya hai: xyz.com ki saari services jo users ko kuch batana chahti hain. Ye sirf type + data bhejti hain, kaise bhejna hai ye nahi jaanti.' },
        { id: 'camp', label: 'Campaign svc', sub: 'broadcast', x: 480, y: 60, w: 150, kind: 'server', info: 'Ye kya hai: marketing ya live events ki service jo ek segment (lakhon users) ko ek saath bhejna chahti hai.' },
        { id: 'api', label: 'Notification API', sub: '202 Accepted', x: 110, y: 170, w: 150, kind: 'server', info: 'Ye kya hai: notification system ka darwaza. Dedupe, preferences, quiet hours, caps aur priority tay karke queue mein daalta hai. Producer ko turant 202.' },
        { id: 'sch', label: 'Scheduler', sub: 'send_at', x: 300, y: 170, w: 120, kind: 'server', info: 'Ye kya hai: "baad mein bhejo" wale messages (quiet hours, 9 baje local campaigns) ko sambhalta hai aur sahi waqt pe queue mein daalta hai.' },
        { id: 'fo', label: 'Fan-out job', sub: 'pages → batches', x: 480, y: 170, w: 130, kind: 'server', info: 'Ye kya hai: broadcast ki user list ko pages mein padh ke 1,000-1,000 users ke batches banata hai. Checkpoint rakhta hai.' },
        { id: 'pq', label: 'Priority queues', sub: 'P0 / P1 per channel', x: 290, y: 290, w: 200, kind: 'queue', info: 'Ye kya hai: kaam ki alag alag lines: urgent (P0: OTP, payment) aur aam (P1: marketing), aur har channel ki alag. Taaki OTP kabhi sale ke peeche na atke.' },
        { id: 'wk', label: 'Channel workers', sub: 'push|SMS|email|inbox|hook', x: 290, y: 400, w: 200, kind: 'server', info: 'Ye kya hai: har channel ke alag workers (bulkhead). Claim, render template, provider ko send, status event. In-app inbox mein bhi likhte hain.' },
        { id: 'rq', label: 'Retry + DLQ', sub: 'backoff + jitter', x: 480, y: 400, w: 130, kind: 'queue', info: 'Ye kya hai: fail hue messages ki line, badhte delay ke saath dobara try. Saare attempts ke baad dead-letter queue mein, alert ke saath.' },
        { id: 'apns', label: 'APNs / FCM', sub: 'push', x: 100, y: 528, w: 140, kind: 'net', info: 'Ye kya hai: Apple aur Google ki push services. Device token se phone tak pahunchaati hain. Inki apni speed limits hain.' },
        { id: 'vend', label: 'SMS / email', sub: '2+ vendors, router', x: 265, y: 528, w: 150, kind: 'net', info: 'Ye kya hai: SMS aur email companies. Kam se kam do, ek router aur circuit breaker ke saath, taaki ek gire to doosra. Baad mein DLR / bounce callbacks bhejti hain.' },
        { id: 'hook', label: 'Seller servers', sub: 'webhooks', x: 450, y: 528, w: 130, kind: 'net', info: 'Ye kya hai: businesses ke apne servers jinhe hum webhook (HTTP POST) bhejte hain, signature ke saath, aur fail pe lambe retries.' },
        { id: 'users', label: 'User devices + inboxes', sub: 'phone, email, app', x: 230, y: 650, w: 300, kind: 'client', info: 'Ye kya hai: user ka phone, email inbox aur app ka in-app inbox. App apna device token Device API se register karta hai aur open/click events wapas bhejta hai.' },
        { id: 'rd', label: 'Redis', sub: 'dedupe + caps', x: 640, y: 170, w: 120, kind: 'cache', info: 'Ye kya hai: tez in-memory store. Idempotency keys, send claims aur per-user frequency counters.' },
        { id: 'udb', label: 'User data', sub: 'prefs, tokens', x: 640, y: 290, w: 120, kind: 'data', info: 'Ye kya hai: preferences, timezone, quiet hours, locale, device tokens, templates aur in-app inbox. Cache ke peeche, user_id se partition.' },
        { id: 'sdb', label: 'Status DB', sub: '+ analytics', x: 640, y: 400, w: 120, kind: 'data', info: 'Ye kya hai: har message ka taaza status (support ke liye) aur saare events ka warehouse (reports, A/B tests).' },
        { id: 'st', label: 'Status stream', sub: 'Kafka / Kinesis', x: 640, y: 528, w: 120, kind: 'queue', info: 'Ye kya hai: saare status events (sent, delivered, opened, failed) ki log. Workers isme likhte hain; consumers DB aur analytics mein batch mein. DB slow ho to bhejna nahi rukta.' },
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
        { name: 'OTP (transactional)', text: 'Login service → API (dedupe, prefs; OTP pe quiet hours/caps nahi) → P0 queue → SMS worker → vendor (router) → phone. Seconds mein.', go: ['svc>api>pq>wk>vend>users', 'api>rd', 'api>udb'] },
        { name: 'Broadcast', text: 'Campaign → fan-out job batches banata hai → P1 queues → bahut saare push workers → APNs/FCM → crores phones, provider ki hadd ke andar.', go: ['camp>fo>pq>wk>apns>users'] },
        { name: 'Fail aur retry', text: 'Provider ne 503 diya → retry queue (backoff + jitter) → dobara queue mein → phir bhejo. Saare attempts ke baad DLQ + alert.', go: ['wk>rq>pq>wk'] },
        { name: 'Tracking', text: 'Workers "sent" event stream mein daalte hain, vendors ke DLR callbacks bhi stream mein, phir batch mein Status DB + analytics.', go: ['wk>st>sdb', 'vend>st'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Producer sirf "kya hua" bataye; notification system <strong>202</strong> de ke baad mein bheje (queue + workers).</li>
      <li>Bhejne se pehle faisla: <strong>dedupe, preference, quiet hours, frequency cap</strong>. OTP/security pe quiet hours aur caps nahi.</li>
      <li><strong>Alag queues aur workers</strong>: transactional vs marketing, aur har channel alag (bulkhead).</li>
      <li>Push APNs/FCM se <strong>device token</strong> ke through jaata hai; 410/UNREGISTERED pe token hatao. Push best-effort hai, isliye in-app inbox bhi.</li>
      <li>Broadcast = <strong>batches mein fan-out</strong> + checkpoint; asli hadd aksar provider ki hoti hai.</li>
      <li>Retry sirf temporary errors pe, <strong>backoff + jitter</strong>, phir DLQ. Duplicate se bachao: idempotency key + claim. Exactly-once nahi milta.</li>
      <li>SMS/email ke <strong>2+ vendors</strong> aur router; failover = late vs duplicate ka sauda.</li>
      <li>Status events <strong>stream</strong> mein, DB mein batch writes. Email "open" pe kam bharosa.</li>
    </ul>` },

    { type: 'tradeoffs', gains: ['Ek central system: retries, templates, preferences, tracking ek jagah', '202 + queue: producers kabhi provider pe nahi atakte', 'Priority queues + bulkheads: OTP kabhi marketing ya kisi slow provider ke peeche nahi', 'Idempotency + claim: duplicates bahut rare', 'Backoff + jitter + DLQ: provider ki recovery mein madad, koi message chupchaap nahi khota', 'Multiple vendors: ek SMS company gire to bhi OTP jaata hai', 'Quiet hours, caps, digests: users notifications band nahi karte'], costs: ['Async: producer ko turant "delivered" nahi pata', 'Bahut saare hisse chalane ko: Redis, queues, workers, scheduler, stream, DLQ', 'Jitter, quiet hours, caps: kuch messages jaan boojh ke late ya drop', 'Exactly-once nahi: kabhi kabhi duplicate ya late', 'Failover se kabhi kabhi do SMS', 'Push best-effort: in-app inbox alag se banana padta hai', 'Do vendors = do contracts, do integrations, zyada kharcha'] },
    { type: 'think', questions: [
      { q: 'OTP SMS 30 second mein nahi pahuncha, user ne "resend" dabaya. Ab do OTP ja sakte hain. Design kaise karoge?', a: 'Resend ek naya notification hai (naya idempotency key), lekin OTP service ko pichhla OTP bhi kuch der valid rakhna chahiye (ya dono mein same code bhejo). Resend doosre vendor ya channel se bhejo, kyunki pehla shayad slow hai. Per-phone limit (jaise 3 resend / 10 min) taaki SMS bill ka misuse na ho.' },
      { q: 'Ek naya feature 5 crore users ko ek saath push bhejna chahta hai. Kaun si 4 cheezein sabse pehle check karoge?', a: '(1) P1/bulk queue aur alag workers, P0 nahi. (2) Preferences, quiet hours, caps: timezone ke hisaab se lehron mein, sab ek saath raat 2 baje nahi. (3) Throughput: provider quota (FCM default 600k/min) aur workers se kitne minute; zaroorat ho to quota pehle se badhwao. (4) Test send + template preview, aur push ke baad app traffic ki lehar ke liye backend taiyaar.' },
      { q: 'Status DB har second 75k writes nahi le pa raha. Workers slow ho rahe hain. Kya badloge?', a: 'Workers DB mein seedha likhna band karein; status events stream (Kafka/Kinesis) mein daalein. Alag consumers batch mein DB mein likhein, aur sirf zaroori states (sent, delivered, failed) DB mein; opens/clicks warehouse mein. Status ko state machine bana do taaki ulte/duplicate events ignore hon. Razorpay ne yahi kiya.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'OTP marketing campaign ke peeche atak raha hai. Sabse sahi fix?', options: ['Queue mein priority field', 'Alag P0 queue aur alag workers transactional ke liye', 'Workers double kar do'], answer: 1, explain: 'Aam queue mein priority field se line nahi badalti. Alag queues + alag capacity (Razorpay aur Netflix RENO dono yahi karte hain). Simulator mein OTP 40 s se milliseconds pe aaya.' },
      { q: 'APNs ne 410 lautaya. Kya karein?', options: ['Backoff ke saath retry', 'Token ko registry se hatao, retry mat karo', 'SMS bhej do'], answer: 1, explain: '410 ka matlab token ab active nahi (jaise uninstall). Retry bekaar; token hata ke bekaar sends bachao.' },
      { q: 'Retries mein jitter kyun?', options: ['Retries fast karne ke liye', 'Taaki saare fail hue messages ek hi pal mein dobara provider pe na toot padein', 'Jitter se duplicates rukte hain'], answer: 1, explain: 'Thundering herd se bachaav. Simulator mein default pe jitter ne DLQ 400 se 0 kar diya.' },
      { q: 'Notification API producer ko 200 "sent" ki jagah 202 kyun lautati hai?', options: ['202 chhota hai', 'Request sirf le li gayi hai; bhejna baad mein workers karenge, taaki producer provider ka wait na kare', 'HTTP mein 200 allowed nahi'], answer: 1, explain: '202 Accepted = "le liya, kaam baad mein". Isse payment jaisi services kabhi SMS company ki speed pe nahi atakti.' },
      { q: 'India mein marketing push ko raat 1 baje (user ke time) kya karna chahiye?', options: ['Turant bhejo, push muft hai', 'Quiet hours: subah ke liye schedule karo (ya digest), aur bhejne se pehle preference dobara check', 'Phenk do aur kabhi mat bhejo'], answer: 1, explain: 'Quiet hours user ke local time pe. Delay karo, aur kal bhejte waqt dobara check karo ki user ne unsubscribe to nahi kiya.' },
      { q: 'Ek ₹ symbol wala English SMS 90 characters ka hai. Kitne segments?', options: ['1, kyunki 160 se kam hai', '2, kyunki ₹ GSM-7 mein nahi, to poora SMS UCS-2 (70 per SMS) mein jaata hai', '90, har character ka ek'], answer: 1, explain: 'Ek non-GSM character poore SMS ko UCS-2 bana deta hai. "Rs." likhne se wahi message 1 segment mein.' },
    ]},
    { type: 'sources', note: 'LinkedIn (2018), Netflix (2022) aur Uber (2022) ki posts kuch saal purani hain; aaj ke systems aage badh chuke honge. Razorpay post ka exact saal source pe saaf nahi tha. SMS vendor router aur failover ka design general industry approach hai.', items: [
      { title: 'Air Traffic Controller: Member-First Notifications at LinkedIn', publisher: 'LinkedIn Engineering blog', official: true, year: 2018, url: 'https://www.linkedin.com/blog/engineering/messaging-notifications/air-traffic-controller-member-first-notifications-at-linkedin', used: '5 Rights, filtering/dedupe, aggregation into digests, channel selection, delivery time optimization, upstream rate limits, Kafka + Samza + RocksDB, partition by member ID, >1B requests/day, complaints halved, P90 12s to 1.5s.' },
      { title: 'How Uber Optimizes the Timing of Push Notifications using ML and Linear Programming', publisher: 'Uber Engineering blog', official: true, year: 2022, url: 'https://www.uber.com/blog/how-uber-optimizes-push-notifications-using-ml/', used: 'Consumer Communication Gateway: problems (duplicates, conflicting pushes, no personalised timing), sharded MySQL inbox by user ID, schedule generator with XGBoost + linear programming, constraints (expiry, send window, daily cap, min gap), Kafka topic per hour + Cadence scheduler, billions per month.' },
      { title: 'Rapid Event Notification System at Netflix', publisher: 'Netflix Technology Blog', official: true, year: 2022, url: 'https://netflixtechblog.com/rapid-event-notification-system-at-netflix-6deb1d2b57d1', used: 'Priority-specific queues and clusters, hybrid push + pull (Cassandra) model, online-only push, staleness filter, bulkheaded delivery.' },
      { title: 'How Razorpay\'s Notification Service Handles Increasing Load', publisher: 'Razorpay Engineering blog (read via summaries by Arpit Bhayani and blogofcodes, Oct 2022)', url: 'https://engineering.razorpay.com/how-razorpays-notification-service-handles-increasing-load-f787623a490f', used: 'Original SQS + workers + DB + scheduler design, ~2K TPS limit, p99 2s to 4s, P0/P1 queues, per-customer and per-type rate limiting, Kinesis for async writes, separate retry handling for slow webhooks.' },
      { title: 'How we sent a push notification to millions during the Super Bowl (Duo\'s Big Game reminder)', publisher: 'Duolingo blog', official: true, year: 2024, url: 'https://blog.duolingo.com/super-bowl-commercial-2024', used: 'Goal of 4M learners within the 5-second ad; earlier largest send 500k in 60s with crashes; 95% within 3.9s and 99% within 5.7s.' },
      { title: 'Delivering Millions of Notifications within Seconds During the Super Bowl (Zhen Zhou, Duolingo)', publisher: 'InfoQ Dev Summit Boston talk', year: 2024, url: 'https://www.infoq.com/presentations/on-demand-notification-system/', used: '~800k/s vs normal ~10k/s, pre-computed audience in S3 loaded into memory, batching 500 iOS / 250 Android users per queue message, SQS FIFO 5-minute dedupe, dedicated ECS cluster, app requests after tap (10-50 each) and a mode to pause them.' },
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
