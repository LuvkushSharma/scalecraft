Lesson.register({
  id: 'design-uber',
  title: 'Uber / Ola',
  minutes: 45,
  summary: `Course ka capstone. Lakhon drivers har kuch second mein apni location bhejte hain, aur rider ko 2 second mein sahi driver chahiye. Location firehose, H3 geo index, ETA-based matching, trip state machine, stream processing se surge pricing, aur payments ka hand-off: ab tak jo bhi seekha, sab ek jagah judta hai.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Tum app kholte ho, "Book ride" dabaate ho, aur 2-3 second mein ek driver ka naam aur gaadi number aa jaata hai.<br>Iske peeche shehar ke hazaaron drivers ke phone har kuch second mein bata rahe hain "main yahan hoon".<br>Server ko itni saari locations sambhaalni hain, tumhare paas ka <em>sahi</em> driver chunna hai, ek driver ko do logon ko nahi dena, aur trip ke end mein paisa sirf ek baar kaatna hai.<br>Aur jab match khatam hone pe sab ek saath ride maangein, to price thoda badha ke aur drivers ko us area mein bulana hai.<br>Ye lesson yahi sab zero se banata hai.` },
    { type: 'callout', tone: 'tip', title: 'Pehle khud try karo', html: `Neeche padhne se pehle 10 minute kaagaz pe socho: 10 lakh drivers ki live location kahan rakhoge? Rider ke paas ka "sabse achha" driver kaise dhoondhoge? Ek driver ko do riders ek saath na mil jaayein, ye kaise pakka karoge? Phir yahan compare karo.` },

    { type: 'p', html: `Ye lesson Uber ke engineers ke public material pe based hai: Uber Engineering blog, Uber ke official marketplace pages, ek SIGMOD 2021 paper, aur Uber ke Chief Systems Architect ka 2015 ka talk. Uber ka system 10+ saal mein kai baar badla hai, isliye har jagah saal likha hai, aur jahan Uber ne koi component baad mein replace kiya, wo bhi bataya hai. Ola ne apne internals itne detail mein public nahi kiye, isliye design Uber ke sources se banaya hai; core problems dono ke same hain.` },
    { type: 'p', html: `Ye lesson pichhle lessons ke blocks dobara use karta hai: <a href="#/ds-for-scale">H3 aur geohash</a>, <a href="#/kafka">Kafka</a>, <a href="#/realtime">WebSockets aur push</a>, <a href="#/consistent-hashing">consistent hashing</a>, <a href="#/distributed-tx">sagas</a>. Inhe poora dobara nahi padhayenge, lekin har naya hissa pehli baar aate hi ek chhote card mein samjhaayenge: ye kya hai, kyun chahiye, aur iske bina kya tootega.` },

    { type: 'h2', text: 'Step 0: sabse simple version, aur wo kyun tootta hai' },
    { type: 'p', html: `Shuru zero se karte hain. Maan lo xyz.com ne apni chhoti si ride app banayi. Ek server hai aur ek database table <code>drivers</code>, jisme har driver ki latitude/longitude (zameen pe jagah ke do numbers) likhi hai.` },
    { type: 'list', ordered: true, items: [
      `Driver ka phone har kuch second mein server ko bolta hai: "main abhi yahan hoon". Ise <strong>location ping</strong> kehte hain. Server table mein us driver ki row update kar deta hai.`,
      `Rider "Book" dabata hai. Server table ke saare drivers se rider ki doori nikaalta hai aur sabse paas wale ko ride de deta hai.`,
      `Trip khatam hone pe server card se paisa kaat leta hai.`,
    ]},
    { type: 'p', html: `Ek chhote shehar mein 50 drivers ke saath ye chal jaayega. Ab socho 10 lakh drivers. Paanch jagah ye design tootega:` },
    { type: 'table', head: ['Kahan tootta hai', 'Kyun', 'Is lesson mein fix'], rows: [
      ['Location pings', 'Lakhon updates har second; ek database table itne writes nahi jhel sakti, aur data 4 second mein purana bhi', 'Step 2 aur 4: RAM mein geo index, history Kafka mein'],
      ['"Sabse paas wala driver"', 'Har request pe 10 lakh doori nikaalna bahut slow; aur seedhi doori road ki asli doori nahi', 'Deep dive 1 aur 2: H3 cells, phir road ETA se ranking'],
      ['Ek driver, do riders', 'Do requests ek saath aayein to dono ko same driver mil sakta hai', 'Step 5 aur Deep dive 3: conditional write, state machine'],
      ['Paisa', 'Payment slow ho to "End trip" atak jaata hai; retry pe do baar kat sakta hai', 'Deep dive 3 aur Payments: events, idempotency, ledger'],
      ['Demand achaanak 10 guna', 'Sabko "no cars", lamba wait', 'Deep dive 4: surge pricing, stream processing'],
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: Latitude / longitude (lat/lng)', html: `<strong>Ye kya hai:</strong> zameen pe kisi bhi jagah ka "address" do numbers mein. Latitude batata hai kitna upar-neeche (north-south), longitude kitna left-right (east-west). Jaise Bengaluru MG Road ≈ 12.9756, 77.6067.<br><strong>Kyun chahiye:</strong> phone ka GPS yahi do numbers deta hai, aur poora system inhi se kaam karta hai.<br><strong>Iske bina:</strong> "driver kahan hai" batane ka koi common tareeka nahi hoga.` },

    { type: 'h2', text: 'Step 1: requirements' },
    { type: 'compare',
      left: { title: 'Functional', html: `• Rider pickup aur drop daale, fare aur pickup ETA dekhe<br>• Ride request kare, ek driver match ho<br>• Driver offer accept/reject kare<br>• Dono ek doosre ko map pe live dekhein<br>• Trip start, end, phir payment<br>• Demand zyada ho to price badhe (surge)<br><br><strong>Out of scope:</strong> ratings, pooling ki detail, driver onboarding` },
      right: { title: 'Non-functional', html: `• Match jaldi: kuch seconds mein<br>• Location ingest bahut zyada writes/sec sambhale<br>• Ek driver kabhi do riders ko assign na ho (strong consistency yahan)<br>• Map pe driver ki position thodi purani ho to chalega (yahan freshness &gt; perfect consistency)<br>• High availability: ride beech mein toote nahi<br>• Paisa exactly once kate` },
    },
    { type: 'callout', tone: 'term', title: 'Naya word: Strong consistency vs "thoda purana chalega"', html: `<strong>Ye kya hai:</strong> <strong>Strong consistency</strong> matlab jo bhi data padhe, use hamesha sabse latest, sahi value mile, aur do log ek saath likhein to dono ke likhe ka koi garbad mix na bane. Iska ulta: data thodi der purana dikh sakta hai (<em>eventual consistency</em>), lekin system tez aur sasta rehta hai.<br><strong>Kyun chahiye:</strong> ride app mein kuch data mein galti chal jaati hai (driver map pe 4 second purani jagah dikhe) aur kuch mein bilkul nahi (ek driver do riders ko de diya).<br><strong>Iske bina:</strong> agar har cheez strong rakhi to system slow aur mehenga; agar har cheez loose rakhi to double booking aur double charge. Detail <a href="#/consistency">consistency lesson</a> mein.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Poore system ko strongly consistent bana do." Nahi. Uber mein do bilkul alag tarah ka data hai. <strong>Driver ki location</strong> har 4 second mein badal jaati hai; 4 second purani location bhi chalegi, aur ek ping kho gaya to agla aa jaayega. <strong>Trip aur payment</strong> ka data galat hua to ek driver do jagah bhej diya ya paisa do baar kata. Pehle wale ke liye speed, doosre ke liye correctness. Achha design dono ko alag treat karta hai.` },

    { type: 'h2', text: 'Step 2: napkin maths, location firehose' },
    { type: 'p', html: `Uber ke Chief Systems Architect Matt Ranney ne 2015 ke talk mein bataya tha ki driver ka phone har <strong>4 second</strong> mein location bhejta tha, aur geo index ko <strong>10 lakh writes/second</strong> sambhalne ke target se design kiya gaya tha (talk 2015 ka hai; aaj ke numbers alag honge). Neeche ke baaki numbers "maan lo" wale hain, Uber ke asli nahi. Values badal ke dekho:` },
    { type: 'callout', tone: 'term', title: 'Naya word: Firehose', html: `<strong>Ye kya hai:</strong> firehose matlab aag bujhane wala mota pipe. System design mein: data ki itni tez, lagaataar dhaar ki use ek ek karke dhyan se (jaise database mein har ek ko save karke) sambhalna mumkin nahi.<br><strong>Kyun chahiye ye soch:</strong> driver locations ek firehose hain: har second lakhon chhote messages, aur har message kuch hi seconds mein purana. Isliye inke liye alag, halka raasta banana padega.<br><strong>Iske bina:</strong> agar pings ko normal "important data" ki tarah treat kiya, to wahi database jo trips aur payments sambhaal raha hai, pings ke bojh se gir jaayega.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="uber-nd">Online drivers (lakh)</label><input id="uber-nd" type="number" value="10" min="0.1" step="0.5"></div>
          <div><label for="uber-pi">Ping interval (seconds)</label><input id="uber-pi" type="number" value="4" min="1" step="1"></div>
          <div><label for="uber-pb">Bytes per ping</label><input id="uber-pb" type="number" value="100" min="20" step="10"></div>
          <div><label for="uber-rd">Rides per day (millions)</label><input id="uber-rd" type="number" value="20" min="1" step="1"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Location writes/s</span><strong class="o-w"></strong></div>
          <div class="stat"><span>Ingest bandwidth</span><strong class="o-bw"></strong></div>
          <div class="stat"><span>Raw pings per day</span><strong class="o-day"></strong></div>
          <div class="stat"><span>Geo index RAM</span><strong class="o-ram"></strong></div>
          <div class="stat"><span>Ride requests/s (peak ×3)</span><strong class="o-rq"></strong></div>
        </div>
        <div class="calc-note o-n"></div>`;
      const v = id => Math.max(0, Number(el.querySelector('#' + id).value) || 0);
      const f = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(0) + 'k' : Math.round(n).toString();
      const sz = b => b >= 1e12 ? (b / 1e12).toFixed(1) + ' TB' : b >= 1e9 ? (b / 1e9).toFixed(1) + ' GB' : (b / 1e6).toFixed(0) + ' MB';
      const upd = () => {
        const drivers = v('uber-nd') * 1e5, iv = Math.max(1, v('uber-pi')), bytes = v('uber-pb'), rides = v('uber-rd') * 1e6;
        const w = drivers / iv, rq = rides / 1e5 * 3;
        el.querySelector('.o-w').textContent = f(w) + '/s';
        el.querySelector('.o-bw').textContent = sz(w * bytes) + '/s';
        el.querySelector('.o-day').textContent = sz(w * bytes * 86400);
        el.querySelector('.o-ram').textContent = sz(drivers * 200);
        el.querySelector('.o-rq').textContent = f(rq) + '/s';
        el.querySelector('.o-n').textContent = `Location writes ride requests se ~${Math.round(w / Math.max(rq, 1))}x zyada hain. Geo index mein sirf har driver ki LATEST location chahiye (~200 bytes maana), jo RAM mein aaram se fit hoti hai. Poori history (raw pings) disk/Kafka ka kaam hai, geo index ka nahi. Ek din ≈ 10^5 seconds maana.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Teen conclusions: (1) 2.5 lakh writes/second ek normal SQL database pe daalna bekaar hai, aur wo data 4 second baad purana bhi ho jaata hai. (2) Har driver ki sirf <em>latest</em> location RAM (computer ki tez, temporary memory) mein ek <strong>geo index</strong> mein rakho. (3) Poori history chahiye (analytics, ETA models, disputes) to use <a href="#/kafka">Kafka</a> pe bhejo, geo index ke raaste mein nahi.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Geo index', html: `<strong>Ye kya hai:</strong> ek data structure jo jagah ke hisaab se cheezein dhoondhna fast banata hai. Duniya ko chhote khaano (cells) mein baant do, aur har khaane ki list rakho: "is cell mein abhi ye drivers hain". Jaise school ki attendance class-wise rakhi jaati hai, poore school ki ek lambi list mein nahi.<br><strong>Kyun chahiye:</strong> rider ke paas ke drivers dhoondhne ke liye sirf uske cell aur padosi cells dekho, 10 lakh drivers nahi.<br><strong>Iske bina:</strong> har request pe har driver se doori nikaalni padegi, jo lakhon calculations hai, har second hazaaron requests pe.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Kafka (event log)', html: `<strong>Ye kya hai:</strong> ek lamba, append-only "register" jisme services events likhti hain (jaise "d17 yahan tha 18:42:03 pe"), aur doosri services apni speed se padhti hain. Detail <a href="#/kafka">Kafka lesson</a> mein.<br><strong>Kyun chahiye:</strong> pings ki history analytics, ETA models aur surge ko chahiye, lekin matching ko nahi. Kafka history sambhaal leta hai bina matching ko slow kiye.<br><strong>Iske bina:</strong> history save karne ke liye location service ko har ping pe database ka wait karna padta.` },

    { type: 'h2', text: 'Step 3: API aur core entities' },
    { type: 'code', text: `
# Driver app: ek persistent connection (WebSocket) pe har ~4 s
→ { "type": "loc", "driver": "d17", "lat": 12.9756, "lng": 77.6067, "ts": 1720000000 }

# Rider: fare + ETA dekhna
GET  /v1/estimate?from=12.97,77.60&to=12.93,77.62   →  { "fare": 212, "surge": 1.4, "pickupEta": "4 min" }

# Rider: ride maangna (retry safe)
POST /v1/rides   Idempotency-Key: 7f3c...
  body: { "from": {...}, "to": {...}, "product": "auto" }   →  202 { "rideId": "r9", "state": "REQUESTED" }

# Driver: offer ka jawaab
POST /v1/offers/o55/accept   →  200 { "rideId": "r9", "state": "ACCEPTED" }

# Driver: trip ke steps
POST /v1/rides/r9/arrived | /start | /end` },
    { type: 'callout', tone: 'term', title: 'Naya word: Persistent connection (WebSocket)', html: `<strong>Ye kya hai:</strong> phone aur server ke beech ek connection jo ek baar khulta hai aur khula rehta hai, taaki dono taraf se jab chaho message bhej sako. <a href="#/realtime">WebSocket</a> iska sabse common tareeka hai.<br><strong>Kyun chahiye:</strong> driver har 4 second ping bhejta hai, aur server ko driver tak offer turant bhejna hai. Har baar naya HTTPS connection kholna (handshake, encryption setup) phone ki battery aur server ka CPU dono khaata.<br><strong>Iske bina:</strong> har ping pe naya connection, zyada latency, aur server driver ko khud se kuch bhej hi nahi sakta (use driver ke poochhne ka intezaar karna padta).` },
    { type: 'callout', tone: 'term', title: 'Naya word: Idempotency-Key', html: `<strong>Ye kya hai:</strong> request ke saath bheja gaya ek unique random ID. Server yaad rakhta hai ki ye ID wala kaam ho chuka hai. Wahi ID dobara aaye to kaam dobara nahi karta, bas pichhla jawaab lauta deta hai.<br><strong>Kyun chahiye:</strong> metro mein network atak gaya, app ne "Book ride" request dobara bheji. Server ko pata hona chahiye ki ye wahi purani request hai.<br><strong>Iske bina:</strong> ek tap pe do rides book, ya ek trip ka do baar paisa. Detail <a href="#/pagination-idempotency">idempotency lesson</a> mein.` },
    { type: 'table', head: ['Entity', 'Kya hai', 'Kahan rehta hai', 'Kitna consistent'], rows: [
      ['DriverLocation', 'driver → latest lat/lng, cell, ts', 'In-memory geo index (+ stream to Kafka)', 'Thoda purana chalega'],
      ['Driver (supply)', 'status: offline / available / offered / on_trip, vehicle', 'Strongly consistent store', 'Strict (double assignment rokna hai)'],
      ['Ride / Trip (demand)', 'rider, pickup, drop, state, driver, fare', 'Strongly consistent store', 'Strict'],
      ['Offer', 'ride → ek driver ko, expiry ke saath', 'Strongly consistent store', 'Strict'],
      ['Surge', 'H3 cell → multiplier', 'Fast key-value store', 'Kuch seconds purana chalega'],
    ]},

    { type: 'h2', text: 'Step 4: high-level design, part 1: location path' },
    { type: 'p', html: `Sabse bhaari traffic pehle. Driver app ek <strong>persistent connection</strong> rakhta hai (har ping pe naya HTTPS handshake bahut mehenga hoga). Pehle galat design dekho, phir sahi. Saare scenarios chalao:` },
    { type: 'callout', tone: 'term', title: 'Naya word: Gateway', html: `<strong>Ye kya hai:</strong> servers ka wo layer jo lakhon phones ke khule connections (WebSocket) pakad ke rakhta hai. Ye khud business logic nahi karta: message aaya to sahi andar wali service ko de diya, aur andar se kuch bhejna ho to sahi phone tak pahuncha diya. Jaise building ka reception.<br><strong>Kyun chahiye:</strong> lakhon khule connections sambhaalna apne aap mein bhaari kaam hai (memory, network). Ise alag rakhne se andar ki services sirf apna kaam karti hain, aur gateways ko alag se badhaya ja sakta hai.<br><strong>Iske bina:</strong> har service ko khud lakhon connections rakhne padte, aur ek service deploy karte hi saare drivers disconnect.` },
    { type: 'callout', tone: 'term', title: 'Naya word: TTL (Time To Live)', html: `<strong>Ye kya hai:</strong> data pe lagi expiry. "Ye entry 30 second tak zinda hai; naya update na aaye to apne aap mit jaayegi."<br><strong>Kyun chahiye:</strong> driver ka phone band hua ya tunnel mein gaya, to wo "logout" bhi nahi bhejega. TTL usse geo index se apne aap hata deta hai.<br><strong>Iske bina:</strong> geo index mein "bhoot" drivers bhar jaayenge jo kab ke chale gaye, aur riders ko unhe offer jaata rahega.` },
    { type: 'callout', tone: 'term', title: 'Naya word: H3 cell', html: `<strong>Ye kya hai:</strong> Uber ka banaya ek tareeka jo poori duniya ko chhote <strong>hexagons</strong> (6 kone wale khaane, jaise madhumakhi ke chhatte mein) mein baant-ta hai. Har hexagon ka ek fixed ID hai. Function <code>latLngToCell(lat, lng, res)</code> kisi bhi jagah ko us jagah ke hexagon ka ID bana deta hai; <code>res</code> (resolution) batata hai hexagon kitne bade hon.<br><strong>Kyun chahiye:</strong> geo index ke "khaane" yahi hexagons hain. Ping aaya, cell ID nikaala, driver us cell ki list mein. Ye pure maths hai, koi database call nahi.<br><strong>Iske bina:</strong> har driver ka cell nikaalne ka koi common, fast tareeka nahi. Detail Deep dive 1 mein.` },
    { type: 'flow', title: 'Location firehose', height: 330,
      nodes: [
        { id: 'drv', label: 'Driver app', sub: 'ping har ~4 s', x: 85, y: 170, w: 130, kind: 'client', info: 'Ye kya hai: driver ke phone ki app. GPS se apni lat/lng padh ke har kuch second mein ek ping bhejti hai. Uber ke 2015 talk ke mutabik ye interval 4 second tha. Poore firehose ki shuruaat yahin se.' },
        { id: 'gw', label: 'WS gateway', sub: 'lakhon connections', x: 255, y: 170, w: 140, kind: 'net', info: 'Ye kya hai: wo servers jo lakhon phones ke khule connections (WebSocket ya similar) pakad ke rakhte hain. Kyun: har ping pe naya connection mehenga hai. Har ping ko location service tak forward karte hain. Stateless hain (apne paas koi zaroori data nahi rakhte): ek gateway gire to phone doosre se reconnect kar leta hai.' },
        { id: 'loc', label: 'Location svc', sub: 'lat/lng → H3 cell', x: 440, y: 170, w: 150, kind: 'server', info: 'Ye kya hai: wo service jo har ping ko sambhaalti hai. Ping check karti hai (GPS ka achaanak 5 km kood jaana, fake location), lat/lng se H3 cell nikaalti hai, geo index update karti hai, aur ping ko Kafka pe bhejti hai. Kai machines pe cell ke hisaab se baanti hui (sharded), kyunki ek machine itne pings nahi sambhaal sakti.' },
        { id: 'geo', label: 'Geo index', sub: 'cell → drivers (RAM)', x: 630, y: 80, w: 150, kind: 'cache', info: 'Ye kya hai: RAM mein rakhi ek list: H3 cell → us cell ke available drivers aur unki latest location. Kyun: "paas ke drivers" milliseconds mein mil jaayein. Har entry pe TTL, taaki band phone wala driver apne aap hat jaaye. 2015 mein Uber yahan Google S2 cells use karta tha; 2018 mein Uber ne apna hexagon grid H3 open source kiya.' },
        { id: 'kf', label: 'Kafka', sub: 'location stream', x: 630, y: 260, w: 150, kind: 'queue', info: 'Ye kya hai: har ping ki history ka append-only log. Isse analytics, ETA model training, surge pipeline aur trip ka distance/fare calculation padhte hain. Geo index ke raaste mein nahi hai, to Kafka slow ho to bhi matching nahi rukti.' },
        { id: 'db', label: 'SQL database', sub: 'naive design', x: 440, y: 55, w: 150, kind: 'data', hidden: true, info: 'Ye kya hai: Step 0 wala galat design: har ping ko ek normal SQL table mein UPDATE karna. 2.5 lakh writes/second, aur data 4 second mein purana. Sirf dikhane ke liye ki ye kyun tootta hai.' },
      ],
      edges: [{ a: 'drv', b: 'gw' }, { a: 'gw', b: 'loc' }, { a: 'loc', b: 'geo' }, { a: 'loc', b: 'kf' }, { a: 'loc', b: 'db', id: 'ldb', hidden: true }],
      scenarios: [
        { name: 'Ping (happy path)', steps: [
          { title: 'Driver ping', text: 'Driver ka phone apni location bhejta hai, pehle se khule connection pe.', go: 'drv>gw>loc', msg: '{ driver: "d17", lat: 12.9756, lng: 77.6067, ts }' },
          { title: 'Cell nikaalo', text: 'latLngToCell(lat, lng, res) → H3 cell ID. Pure maths, koi DB call nahi.', focus: ['loc'], msg: 'cell = 8961… (res 9)' },
          { title: 'Index update + stream', text: 'Geo index mein driver ko naye cell mein daalo (cell nahi badla to sirf location aur TTL refresh). Saath hi ping Kafka pe, history ke liye. Dono kaam ek doosre ka wait nahi karte.', parallel: true, go: ['loc>geo', 'evt:loc>kf'], after: { geo: { state: 'ok', sub: 'd17 updated' } } },
        ]},
        { name: 'Naive: har ping DB mein', intro: 'Pehla idea jo sabko aata hai. Dekho kya hota hai.', steps: [
          { title: 'Har ping = ek UPDATE', text: 'Location service har ping pe SQL table update karta hai.', show: ['db', 'ldb'], set: { geo: { state: 'dim' }, kf: { state: 'dim' } }, go: 'drv>gw>loc>db', msg: 'UPDATE drivers SET lat=?, lng=? WHERE id=?' },
          { title: '2.5 lakh writes/second', text: 'Lakhon drivers, har 4 second. Disk, locks, indexes aur replication sab pe bojh. Aur "paas ke drivers" ki query ko bhi isi table pe lat/lng range scan karna padega.', flood: { paths: ['drv>gw>loc>db'], n: 14 }, after: { db: { state: 'hot', sub: 'overloaded' } } },
          { title: 'DB gir gaya', text: 'Writes ka queue badhta gaya, matching ki reads time out. Aur sabse bura: ye saara data 4 second baad waise bhi bekaar tha. Fix: latest location RAM ke geo index mein, history Kafka mein.', set: { db: { state: 'down', sub: 'DOWN' } }, go: 'bad:db>loc' },
        ]},
        { name: 'Driver tunnel mein', steps: [
          { title: 'Pings band', text: 'Driver underpass mein gaya, ya app band kar di. Pings aana band.', go: 'lost:drv>gw', set: { drv: { state: 'warn', sub: 'no signal' } } },
          { title: 'TTL khatam', text: 'Geo index mein har driver entry ka TTL hai (jaise 30 second; exact value Uber ne public nahi kiya). Naya ping nahi aaya to entry expire. Matching ab is driver ko offer nahi bhejega.', set: { geo: { state: 'miss', sub: 'd17 expired' } }, focus: ['geo'] },
          { title: 'Signal wapas', text: 'Phone ne reconnect kiya, agla ping aaya, driver phir se index mein. Koi manual cleanup nahi chahiye.', set: { drv: { state: '' } }, go: 'drv>gw>loc>geo', after: { geo: { state: 'ok', sub: 'd17 back' } } },
        ]},
        { name: 'Location node crash', steps: [
          { title: 'Ek shard gira', text: 'Location service ka ek node (jo kuch cells ka maalik tha) crash.', set: { loc: { state: 'down', sub: 'node down' } }, go: 'lost:gw>loc' },
          { title: 'Ring re-balance', text: 'Baaki nodes ko pata chalta hai ki ek saathi gira (isse membership protocol kehte hain), aur us node ke cells padosi nodes mein baant diye jaate hain (consistent hashing ring ke hisaab se). 2015-16 mein Uber ne iske liye apni library Ringpop banayi thi (neeche detail).', set: { loc: { state: 'ok', sub: 'cells moved' } }, focus: ['loc'] },
          { title: 'Data khud wapas', text: 'Location data ephemeral hai: naye owner ke paas data nahi tha, lekin agle 4 second mein har driver ka naya ping aa gaya aur index phir se bhar gaya. Isliye is data ko disk pe durable rakhne ki zaroorat hi nahi.', go: 'drv>gw>loc>geo', after: { geo: { state: 'ok', sub: 'refilled' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'Deep dive 1: geo index, S2 se H3 tak' },
    { type: 'p', html: `Sawaal: "is rider ke paas kaun se available drivers hain?" Har driver se doori nikaalna (lakhon calculations har request pe) kaam nahi karega. Isliye duniya ko <strong>cells</strong> mein baant-te hain, aur index rakhte hain: cell → us cell ke drivers. Rider ke cell aur uske padosi cells ke drivers hi candidates hain. Ye idea <a href="#/ds-for-scale">Bloom filter, HyperLogLog, Geohash</a> lesson mein detail mein hai.` },
    { type: 'table', head: ['Kab', 'Uber kya use karta tha', 'Source kya kehta hai'], rows: [
      ['2015', 'Google S2 cells', 'Matt Ranney ke talk ke summary ke mutabik: S2 ke level 12 cells (~3.3-6.4 km²), cell ID hi shard key, location updates replicas ko bheje jaate the, reads replicas badha ke scale.'],
      ['2018', 'H3 (Uber ka apna hexagon grid, open source)', 'Uber blog (June 2018): marketplace events ko hexagon cells mein bucket karte hain; surge pricing aur dispatch jaise city-wide decisions isi pe.'],
      ['Aaj', 'H3 library active hai (h3geo.org)', 'Uber ka current internal dispatch index public nahi hai; H3 ka marketplace use publicly documented hai.'],
    ]},
    { type: 'p', html: `Hexagon hi kyun? Square grid mein side wala padosi 1 door hai aur kone wala ~1.41. Hexagon ke saare 6 padosi centre se <strong>ek hi doori</strong> pe. "1 ring door" ka matlab har disha mein lagbhag same distance, isliye "paas ke drivers dhoondho" (k-ring) aur surge ki smoothing dono saaf rehte hain. H3 ke 16 resolutions hain; har level pe cell ~7 guna chhota.` },
    { type: 'callout', tone: 'term', title: 'Naya word: k-ring', html: `<strong>Ye kya hai:</strong> ek cell aur uske aas paas k "rings" tak ke saare cells (H3 mein function <code>gridDisk</code>). k = 1 matlab 7 cells (apna + 6 padosi), k = 2 matlab 19 cells.<br><strong>Kyun chahiye:</strong> rider ke cell ke bilkul border pe khada driver bhi paas hai, isliye sirf apna cell kaafi nahi. Matching rider ka k-ring padhta hai; kam drivers mile to k badhata hai.<br><strong>Iske bina:</strong> ya to sirf ek cell (border wale paas ke drivers chhoot jaayein) ya poora shehar (bahut slow).` },
    { type: 'table', head: ['H3 resolution', 'Ek hexagon ka average area', 'Average edge (kinara)', 'Kya samajh lo'], rows: [
      ['7', '~5.16 km²', '~1.41 km', 'Ek chhota mohalla / area; poore shehar ke trends ke liye'],
      ['8', '~0.74 km²', '~531 m', 'Kuch blocks; surge jaise "area" ke faislon ke liye theek size'],
      ['9', '~0.105 km²', '~201 m', 'Ek-do gali; "paas ke drivers" ke liye'],
    ], caption: 'Numbers h3geo.org ki official cell statistics table se (H3 v4). Har resolution pe ek hexagon ke 7 chhote "bachche" hote hain, isliye area ~7 guna chhota. Uber kaunsa resolution kahan use karta hai, ye public nahi; ye sirf size ka andaaza hai.' },
    { type: 'p', html: `Ab khud chala ke dekho. Beech wala mota hexagon rider hai. Har hexagon mein likha number = us cell mein abhi kitne available drivers hain. k badhao aur dekho kitne cells padhne padte hain aur kitne drivers milte hain:` },
    { type: 'custom', render(el) {
      const rng = seed => { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = s * 16807 % 2147483647) / 2147483647; };
      const make = mode => { const R = rng(mode === 'day' ? 11 : 5), c = []; for (let q = -4; q <= 4; q++) for (let r = -4; r <= 4; r++) if (Math.abs(q + r) <= 4) { const x = R(); c.push({ q, r, n: mode === 'day' ? Math.floor(x * 3) : (x < 0.1 ? 1 : 0) }); } return c; };
      const hd = c => (Math.abs(c.q) + Math.abs(c.r) + Math.abs(c.q + c.r)) / 2;
      const EDGE = { 7: 1406, 8: 531, 9: 201 };
      let mode = 'day', k = 1, C = make(mode);
      el.innerHTML = `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"><button type="button" class="chip on" data-m="day">Shaam 6 baje (bheed)</button><button type="button" class="chip" data-m="night">Raat 3 baje (sunsaan)</button></div>
        <svg class="ub-kr" viewBox="0 0 340 290" style="width:100%;max-width:420px;display:block;margin:0 auto"></svg>
        <div class="row2">
          <div><label>k (kitni rings): <strong class="ub-kv"></strong></label><input class="ub-k" type="range" min="0" max="4" step="1" value="1"></div>
          <div><label>H3 resolution</label><select class="ub-res"><option value="9">9 (~201 m edge)</option><option value="8">8 (~531 m edge)</option><option value="7">7 (~1.41 km edge)</option></select></div>
        </div>
        <div style="margin:6px 0"><button type="button" class="btn small primary ub-auto">Auto: k badhao jab tak 5 drivers na milein</button></div>
        <div class="stats">
          <div class="stat"><span>Cells padhe (1 + 3k(k+1))</span><strong class="ub-c"></strong></div>
          <div class="stat"><span>Drivers mile</span><strong class="ub-d"></strong></div>
          <div class="stat"><span>Search ka radius (lagbhag)</span><strong class="ub-r"></strong></div>
        </div>
        <div class="calc-note ub-n"></div>`;
      const q = s => el.querySelector(s), svg = q('.ub-kr'), SZ = 20, cx = 170, cy = 145;
      const pos = c => [cx + SZ * Math.sqrt(3) * (c.q + c.r / 2), cy + SZ * 1.5 * c.r];
      const pts = (x, y) => [...Array(6)].map((_, i) => { const a = Math.PI / 180 * (60 * i - 30); return (x + (SZ - 1.2) * Math.cos(a)).toFixed(1) + ',' + (y + (SZ - 1.2) * Math.sin(a)).toFixed(1); }).join(' ');
      const draw = () => {
        const S = C.filter(c => hd(c) <= k), drv = S.reduce((a, c) => a + c.n, 0), res = Number(q('.ub-res').value), rad = k * Math.sqrt(3) * EDGE[res];
        svg.innerHTML = C.map(c => { const [x, y] = pos(c), on = hd(c) <= k, me = c.q === 0 && c.r === 0;
          return `<polygon points="${pts(x, y)}" fill="${on ? 'var(--accent-soft)' : 'var(--surface-2)'}" stroke="${me ? 'var(--accent)' : 'var(--line-2)'}" stroke-width="${me ? 3 : 1}"/>` + (c.n ? `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" font-size="12" font-family="var(--f-mono)" fill="${on ? 'var(--accent-ink)' : 'var(--ink-3)'}">${c.n}</text>` : ''); }).join('');
        q('.ub-kv').textContent = k; q('.ub-k').value = k;
        q('.ub-c').textContent = S.length;
        q('.ub-d').textContent = drv;
        q('.ub-r').textContent = k === 0 ? 'sirf apna cell' : (rad >= 1000 ? (rad / 1000).toFixed(1) + ' km' : Math.round(rad) + ' m');
        q('.ub-n').textContent = mode === 'day'
          ? `Bheed ke time k = 1 (7 cells) mein hi ${C.filter(c => hd(c) <= 1).reduce((a, c) => a + c.n, 0)} drivers: kaam ho gaya. Poore shehar ke lakhon drivers ko chhua bhi nahi. Ab ye candidates ETA ke liye aage jaayenge.`
          : `Raat ko paas ke cells khaali. 5 drivers ke liye k = 4 (61 cells) tak jaana pada. Jitna bada k, utna door driver aur utna lamba pickup; ek limit ke baad "no cars available" behtar.`;
      };
      el.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => { mode = b.dataset.m; C = make(mode); k = 1; el.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === b)); draw(); }));
      q('.ub-k').addEventListener('input', () => { k = Number(q('.ub-k').value); draw(); });
      q('.ub-res').addEventListener('input', draw);
      q('.ub-auto').onclick = () => { k = 0; while (k < 4 && C.filter(c => hd(c) <= k).reduce((a, c) => a + c.n, 0) < 5) k++; draw(); };
      draw();
    }},
    { type: 'p', html: `Dhyan do: cells ki ginti 1, 7, 19, 37, 61 badhti hai (formula 1 + 3k(k+1)). Resolution 9 pe k = 1 ka radius ~350 m hai, aur resolution 7 pe wahi k = 1 ~2.4 km. Bade cells = kam cells padhne padte hain lekin har cell mein zyada drivers jo door bhi ho sakte hain; chhote cells = zyada precise lekin zyada cells. Sahi resolution shehar ki density pe nirbhar hai.` },
    { type: 'h3', text: 'Index ko kai machines pe kaise baantein? Ringpop (2015-16)' },
    { type: 'p', html: `Ek machine ki RAM aur CPU poore shehar ke pings nahi sambhal sakti. Uber ne 2015 mein Node.js library <strong>Ringpop</strong> open source ki (blog post 2016). Har location/dispatch worker ek <a href="#/consistent-hashing">consistent hashing</a> ring pe baitha, aur har cell ka ek owner. Request kisi bhi node pe aaye, wo khud handle karta ya sahi owner ko forward karta ("handle or forward"). Kaun zinda hai, ye <strong>SWIM gossip</strong> se pata chalta: nodes ek doosre ko ping karte aur membership ki khabar phailaate.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Gossip protocol (SWIM)', html: `<strong>Ye kya hai:</strong> machines ke ek group (cluster) mein "kaun zinda hai" pata karne ka tareeka, bina kisi central "attendance register" ke. Har node thodi thodi der mein kisi random node ko ping karta hai; jawaab na aaye to doosron se us node ko ping karwata hai; phir "X shayad down hai" ki khabar baaki messages ke saath phaila deta hai, jaise class mein gossip phailti hai. Kuch hi rounds mein poore cluster ko pata chal jaata hai.<br><strong>Kyun chahiye:</strong> ring ko pata hona chahiye ki kaunsa node gira, taaki uske cells kisi aur ko mil sakein.<br><strong>Iske bina:</strong> ek central register chahiye hota, jo khud gir sakta hai (single point of failure), ya gira hua node cells ka maalik bana rehta aur un cells ke pings kho jaate.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Sharding (consistent hashing ring ke saath)', html: `<strong>Ye kya hai:</strong> <a href="#/sharding">Sharding</a> = data ko kai machines mein baantna, har machine ek hissa. Yahan har cell ka ek "owner" node hai. <a href="#/consistent-hashing">Consistent hashing</a> ek gol ring pe nodes aur cells dono ko rakhta hai; cell ka owner = ring pe uske aage wala pehla node.<br><strong>Kyun chahiye:</strong> ek machine ki RAM aur CPU poore shehar ke pings nahi jhel sakti. Ring ka fayda: ek node gire ya naya aaye, to sirf thode cells ka owner badalta hai, sab ka nahi.<br><strong>Iske bina:</strong> ya to ek machine (jaldi bhar jaayegi) ya simple "cell % N" baantna, jisme ek machine badhaate hi lagbhag saare cells idhar udhar ho jaate.` },
    { type: 'callout', tone: 'warn', title: 'Ye kahani purani hai', html: `Ringpop ki GitHub repos 2020 mein archive ho gayin. Uber ke 2021 ke "Fulfillment Platform re-architecture" post ne khud likha ki purane system (rt-demand, rt-supply services, Ringpop ke saath in-memory serialization, Cassandra aur Redis storage) mein availability ko consistency se upar rakha gaya tha, multi-entity writes atomic nahi the, aur Ringpop ke peer-to-peer design ki scaling limits thi. Naye platform ne Google Cloud Spanner pe transactions apnaaye (Deep dive 3 mein). Interview mein Ringpop ko "pattern" ki tarah bolo (consistent hashing + gossip), "Uber aaj yahi chalata hai" ki tarah nahi.` },
    { type: 'h3', text: 'Hot cell: match khatam, stadium khaali' },
    { type: 'p', html: `Shard key = cell ID ka nuksaan: 50,000 log ek stadium se nikle to saari reads aur writes ek hi cell ke owner pe. Bachaav: (1) ghani jagah finer resolution (chhote cells, load kai owners mein bant jaata hai), (2) hot cells ke read replicas (2015 ke talk mein bhi reads replicas badha ke scale ki baat thi), (3) matching ko har request pe alag chalaane ki jagah chhote batches mein chalao (Deep dive 2).` },

    { type: 'h2', text: 'Step 5: high-level design, part 2: ride request aur dispatch' },
    { type: 'p', html: `2015 ke talk ke mutabik Uber ke dispatch mein teen hisse the: <strong>supply</strong> service (drivers, unki gaadi, seats, state), <strong>demand</strong> service (rider ki request aur zaroorat), aur <strong>DISCO</strong> (DISpatch Optimization) jo dono ko milata hai. Geo index sirf mote taur pe candidates deta hai; asli ranking road pe <strong>ETA</strong> se hoti hai, seedhi doori se nahi.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Dispatch', html: `<strong>Ye kya hai:</strong> "kaunsi gaadi kis request pe jaayegi" ka faisla, aur us gaadi ko offer bhejna. Is service ko <strong>matching</strong> service bhi kehte hain.<br><strong>Kyun chahiye:</strong> geo index sirf batata hai ki paas kaun hai. Kaun <em>best</em> hai (road pe kitni der), kise offer bhejna hai, aur driver mana kare to aage kya, ye sab dispatch tay karta hai.<br><strong>Iske bina:</strong> rider ko ya to galat driver milega (nadi ke us paar wala) ya ek driver ko do jagah bhej diya jaayega.` },
    { type: 'callout', tone: 'term', title: 'Naya word: ETA (Estimated Time of Arrival)', html: `<strong>Ye kya hai:</strong> andaaza ki koi cheez kitni der mein pahunchegi. Yahan: driver ko rider tak road se pahunchne mein kitne minute lagenge.<br><strong>Kyun chahiye:</strong> 400 m door ka driver flyover ke us paar ho to 9 minute le sakta hai, aur 900 m door wala 3 minute. Ranking minutes se honi chahiye, meters se nahi.<br><strong>Iske bina:</strong> "sabse paas" driver chuna jaayega jo asal mein sabse der se aayega. ETA kaise banta hai, Deep dive 5 mein.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Conditional write (compare-and-set)', html: `<strong>Ye kya hai:</strong> database ko bolna "ye value badlo, <em>lekin sirf tab</em> jab abhi bhi purani value X ho". Jaise <code>UPDATE ... WHERE state='available' AND v=41</code>. Agar beech mein kisi aur ne badal diya, to tumhara write fail ho jaata hai aur tumhe pata chal jaata hai.<br><strong>Kyun chahiye:</strong> do dispatch workers ek hi second mein ek hi driver ko chunein, to sirf ek jeete.<br><strong>Iske bina:</strong> dono "available" padhte, dono "offered" likhte, aur ek driver ko do offers chale jaate. Detail <a href="#/pattern-contention">contention</a> lesson mein.` },
    { type: 'flow', title: 'Ride request → driver offer', height: 330,
      nodes: [
        { id: 'rid', label: 'Rider app', sub: 'ride maangi', x: 85, y: 80, w: 130, kind: 'client', info: 'Ye kya hai: rider ke phone ki app. Rider pickup aur drop daal ke request karta hai. Request ke saath Idempotency-Key, taaki network retry pe do rides na ban jaayein.' },
        { id: 'dem', label: 'Demand svc', sub: 'ride: REQUESTED', x: 270, y: 80, w: 140, kind: 'server', info: 'Ye kya hai: rider ki ride requests sambhaalne wali service ("demand" = jo ride maang rahe hain). Ride ko strongly consistent store mein REQUESTED state mein banata hai aur dispatch ko bolta hai. 2015 ke talk mein isse demand service kaha gaya.' },
        { id: 'dis', label: 'Dispatch', sub: 'DISCO', x: 470, y: 170, w: 150, kind: 'server', info: 'Ye kya hai: matching ka dimaag. Candidates laata hai (geo index), har candidate ka pickup ETA mangwata hai, best chunta hai, driver ko lock karke offer bhejta hai. Uber ke public page ke mutabik aaj requests ko kuch seconds ke batch mein milaya jaata hai.' },
        { id: 'geo', label: 'Geo index', sub: 'k-ring candidates', x: 270, y: 260, w: 140, kind: 'cache', info: 'Ye kya hai: wahi RAM wala cell → drivers index jo location path bharta hai. Yahan se rider ke H3 cell ka k-ring padha jaata hai: paas ke available drivers ki list. Sirf mota filter; asli ranking ETA se.' },
        { id: 'eta', label: 'ETA service', sub: 'road graph + ML', x: 640, y: 60, w: 130, kind: 'server', info: 'Ye kya hai: wo service jo batati hai ki driver ko pickup tak road se kitne minute lagenge. Har (driver, pickup) jode ka asli road ETA. Routing engine road graph pe shortest path nikaalta hai, aur 2022 se DeepETA model uspe correction lagata hai (Deep dive 5).' },
        { id: 'drv', label: 'Driver app', sub: 'offer screen', x: 640, y: 280, w: 130, kind: 'client', info: 'Ye kya hai: driver ke phone pe offer wali screen. Driver ko offer push hota hai (wahi khule WebSocket connection se): pickup kahan, kitni door. Kuch seconds mein accept na kare to offer expire aur agla driver.' },
      ],
      edges: [{ a: 'rid', b: 'dem' }, { a: 'dem', b: 'dis' }, { a: 'dis', b: 'geo' }, { a: 'dis', b: 'eta' }, { a: 'dis', b: 'drv' }],
      scenarios: [
        { name: 'Match (happy path)', steps: [
          { title: 'Request', text: 'Rider ne ride maangi. Ride REQUESTED state mein save.', go: 'rid>dem>dis', msg: 'POST /v1/rides  Idempotency-Key: 7f3c…' },
          { title: 'Candidates', text: 'Rider ke cell ka 1-ring: 7 cells, inme 12 available drivers.', go: ['dis>geo', 'res:geo>dis'], msg: 'gridDisk(cell, 1) → [d17, d4, d88, …]' },
          { title: 'ETA se rank', text: 'Seedhi doori ke hisaab se d4 sabse paas hai, lekin wo flyover ke us paar hai: road ETA 9 min. d17 thoda door, road ETA 3 min. Jeeta d17.', go: ['dis>eta', 'res:eta>dis'], msg: 'd4: 400 m, 9 min | d17: 900 m, 3 min' },
          { title: 'Lock + offer', text: 'd17 ko atomically "offered" mark karo (sirf tab jab wo abhi bhi available ho), phir offer bhejo.', go: 'dis>drv', msg: 'offer o55 → d17 (expiry ke saath)', after: { drv: { state: 'ok', sub: 'offer mila' } } },
          { title: 'Accept', text: 'Driver ne accept kiya. Ride ACCEPTED, rider ko driver dikh gaya.', go: ['res:drv>dis', 'res:dis>dem>rid'], msg: 'ride r9: ACCEPTED, driver d17, ETA 3 min' },
        ]},
        { name: 'Driver ne ignore kiya', steps: [
          { title: 'Offer gaya', text: 'd17 ko offer bheja.', go: 'rid>dem>dis>drv', msg: 'offer o55 → d17' },
          { title: 'Timeout', text: 'Driver chai pe hai, offer expire. Lock chhoot jaata hai (lock pe bhi TTL tha).', set: { drv: { state: 'warn', sub: 'no response' } }, focus: ['drv'] },
          { title: 'Agla candidate', text: 'Dispatch list mein agla best (d88) chunta hai aur use offer bhejta hai. Rider ko sirf thoda zyada "Finding your ride" dikhta hai.', set: { drv: { state: '', sub: 'd88 ko offer' } }, go: 'dis>drv', after: { drv: { state: 'ok' } } },
        ]},
        { name: 'Double assignment race', intro: 'Do riders ke requests ek hi second mein, dono ke liye best driver d17.', steps: [
          { title: 'Do requests', text: 'Do alag dispatch workers dono d17 ko chunte hain.', go: ['rid>dem>dis'], set: { dis: { state: 'warn', sub: '2 workers, 1 driver' } } },
          { title: 'Conditional write', text: 'Dono "d17: available → offered" likhne ki koshish karte hain, sirf condition ke saath (jaise version check ya compare-and-set). Pehla jeetta hai, doosre ka write fail.', focus: ['dis'], msg: 'UPDATE supply SET state=offered, v=v+1 WHERE id=d17 AND state=available AND v=41' },
          { title: 'Haarne wala aage badhta hai', text: 'Doosra worker agla candidate le leta hai. Ek driver ko kabhi do offers nahi gaye. Ye <a href="#/pattern-contention">contention</a> pattern hai.', set: { dis: { state: 'ok', sub: 'no double booking' } }, go: 'dis>drv' },
        ]},
        { name: 'Koi driver nahi', steps: [
          { title: 'Khaali ring', text: 'Raat 3 baje, 1-ring mein 0 available drivers.', go: ['rid>dem>dis', 'dis>geo', 'bad:geo>dis'], msg: 'gridDisk(cell, 1) → []' },
          { title: 'Ring badhao', text: 'k = 2, 3 tak dhoondho. Lekin bahut door ka driver 25 min ka pickup ETA dega, jo rider ke liye bekaar hai; ek limit ke baad "no cars available".', go: ['dis>geo', 'res:geo>dis'], msg: 'gridDisk(cell, 3) → [d203: ETA 21 min]' },
          { title: 'Signal aage', text: 'Ye demand-supply imbalance surge pipeline tak pahunchta hai (Deep dive 4), jo price badha ke paas ke drivers ko is area mein bulata hai.', set: { dis: { state: 'warn', sub: 'demand > supply' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'Deep dive 2: matching, "sabse paas" sabse achha nahi' },
    { type: 'p', html: `Do galatfehmiyan todni hain. <strong>Pehli:</strong> "sabse kam doori wala driver". Uber ke official matching page ka kehna hai ki sabse paas wala hamesha sabse jaldi pahunchne wala nahi hota: traffic, flyover, nadi, one-way sab beech mein aate hain. Isliye rank <strong>road ETA</strong> se.` },
    { type: 'p', html: `<strong>Doosri:</strong> "har request aate hi turant match kar do". Uber ke page ke mutabik shuru mein yahi hota tha (rider ko turant sabse paas wala driver), aur zyada tar riders ke liye theek tha, lekin kuch riders ko lamba wait milta tha, jo poore shehar mein jud ke bahut ho jaata. Ab request ke baad <strong>kuch seconds</strong> rukte hain, us beech aaye saare riders aur drivers ko ek <strong>batch</strong> mein dekh ke aise jode banate hain ki <em>sabka total</em> wait kam ho. 2015 ke talk mein bhi ye idea tha ki jo driver trip khatam karne wala hai, wo door khade khaali driver se behtar match ho sakta hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Batched matching', html: `<strong>Ye kya hai:</strong> requests ko ek ek karke "pehle aao pehle pao" match karne ki jagah, ek chhoti time window (kuch seconds) ki saari requests aur saare free drivers ko ek saath dekh ke best jodiyan banana. Ise <strong>assignment problem</strong> kehte hain: N riders, N drivers, har jode ki ek cost (ETA), total cost minimum karo.<br><strong>Kyun chahiye:</strong> jo driver R1 ke liye "thoda sa" behtar hai, wahi R3 ke liye "bahut" behtar ho sakta hai. Saath dekhoge tabhi ye dikhega.<br><strong>Iske bina:</strong> har faisla us pal achha lagta hai, lekin shehar ka total wait badh jaata hai (neeche widget mein dekho).` },
    { type: 'p', html: `Khud dekho. Teen riders R1, R2, R3 isi kram mein aaye, teen drivers free hain. Table mein har jode ka pickup ETA (minutes) hai:` },
    { type: 'custom', render(el) {
      const rng = seed => { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = s * 16807 % 2147483647) / 2147483647; };
      const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
      const gen = k => { if (k === 0) return [[2, 3, 9], [3, 10, 12], [8, 9, 4]]; const R = rng(1000 + k * 7919); return [0, 1, 2].map(() => [0, 1, 2].map(() => 2 + Math.floor(R() * 12))); };
      const greedy = M => { const used = new Set(), p = []; for (let i = 0; i < 3; i++) { let b = -1; for (let j = 0; j < 3; j++) if (!used.has(j) && (b < 0 || M[i][j] < M[i][b])) b = j; used.add(b); p.push(b); } return p; };
      const best = M => { let bp = null, bs = 1e9; PERMS.forEach(p => { const s = p.reduce((a, j, i) => a + M[i][j], 0); if (s < bs) { bs = s; bp = p; } }); return bp; };
      const tot = (M, p) => p.reduce((a, j, i) => a + M[i][j], 0);
      let k = 0, mode = 'g';
      el.innerHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
          <button type="button" class="btn small primary uber-bg">Turant (greedy)</button>
          <button type="button" class="btn small ghost uber-bb">Batch (kuch second ruk ke)</button>
          <button type="button" class="btn small ghost uber-bn">Naya scenario</button></div>
        <div class="uber-tbl" style="overflow-x:auto"></div>
        <div class="stats"><div class="stat"><span>Greedy total wait</span><strong class="uber-tg"></strong></div><div class="stat"><span>Batch total wait</span><strong class="uber-tb"></strong></div><div class="stat"><span>Scenario</span><strong class="uber-sc"></strong></div></div>
        <div class="calc-note uber-bnote"></div>`;
      const draw = () => {
        const M = gen(k), g = greedy(M), b = best(M), p = mode === 'g' ? g : b;
        let h = '<table style="border-collapse:collapse;font-family:var(--f-mono);font-size:14px"><tr><th style="padding:6px 10px"></th>' + ['D1', 'D2', 'D3'].map(d => `<th style="padding:6px 10px;color:var(--ink-2)">${d}</th>`).join('') + '</tr>';
        M.forEach((row, i) => { h += `<tr><th style="padding:6px 10px;color:var(--ink-2)">R${i + 1}</th>` + row.map((v, j) => { const on = p[i] === j; return `<td style="padding:6px 10px;text-align:center;border:1px solid var(--line);${on ? 'background:var(--accent-soft);color:var(--accent-ink);font-weight:700' : 'color:var(--ink-2)'}">${v}</td>`; }).join('') + '</tr>'; });
        el.querySelector('.uber-tbl').innerHTML = h + '</table>';
        const tg = tot(M, g), tb = tot(M, b);
        el.querySelector('.uber-tg').textContent = tg + ' min';
        el.querySelector('.uber-tb').textContent = tb + ' min';
        el.querySelector('.uber-sc').textContent = '#' + (k + 1);
        el.querySelector('.uber-bnote').textContent = mode === 'g'
          ? `Greedy: R1 aaya, usne apna sabse paas driver le liya; phir R2 ne bache hue mein se; phir R3. Har faisla us waqt achha tha, lekin total ${tg} min.`
          : (tb < tg ? `Batch: teeno ko saath dekha, total ${tb} min (greedy se ${tg - tb} min kam). Dhyan do: kisi ek rider ko greedy se thoda zyada wait mil sakta hai; batch "sabka total" ghata-ta hai.` : `Is scenario mein greedy ka jawaab hi best tha (${tb} min). Batch kabhi total ko bura nahi karta, bas har baar fayda nahi deta.`);
        el.querySelector('.uber-bg').className = 'btn small uber-bg ' + (mode === 'g' ? 'primary' : 'ghost');
        el.querySelector('.uber-bb').className = 'btn small uber-bb ' + (mode === 'b' ? 'primary' : 'ghost');
      };
      el.querySelector('.uber-bg').onclick = () => { mode = 'g'; draw(); };
      el.querySelector('.uber-bb').onclick = () => { mode = 'b'; draw(); };
      el.querySelector('.uber-bn').onclick = () => { k = (k + 1) % 8; draw(); };
      draw();
    }},
    { type: 'p', html: `Pehle scenario mein greedy 16 min deta hai aur batch 10 min. Asli system mein N hazaaron mein hota hai, to sab permutations nahi aazma sakte; aise problems ke liye optimisation algorithms (jaise assignment/matching algorithms) use hote hain. Uber ne apna exact algorithm public nahi kiya; public page sirf idea batata hai.` },
    { type: 'table', head: ['Approach', 'Faayda', 'Keemat'], rows: [
      ['Sabse kam seedhi doori', 'Simple, fast', 'Road reality ignore; nadi ke us paar wala driver chun lega'],
      ['Sabse kam ETA, turant', 'Har rider ke liye us pal achha', 'Shehar ke total wait ke liye bura ho sakta hai'],
      ['Batch + ETA', 'Total wait kam, drivers ka khaali ghoomna kam', 'Har rider kuch seconds extra rukta hai; heavy computation'],
    ]},
    { type: 'callout', tone: 'tip', title: 'Offer ek driver ko, ek baar mein', html: `Offer ek hi driver ko bhejo, timeout ke saath, aur driver pe lock lagao. Ek saath 5 drivers ko bhejna ("jo pehle accept kare") rider ke liye tez lagta hai, lekin 4 drivers ka time barbaad aur unka bharosa kam. Lock pe bhi TTL rakho, taaki crash hua dispatch worker driver ko hamesha ke liye "offered" mein na phansa de.` },

    { type: 'h2', text: 'Deep dive 3: trip ek state machine hai' },
    { type: 'p', html: `Ek ride ki zindagi mein bahut log haath lagate hain: rider (cancel), driver (accept, arrived, start, end), dispatch (timeout), payments. Agar har service apne hisaab se "status" column badle to ajeeb cheezein hongi: cancel hui ride pe "start trip", ya ek trip do baar "end". Isliye ride ko ek <strong>state machine</strong> banao: kaun si state se kaun sa event kis state mein le jaa sakta hai, ye pehle se likha hai. Baaki sab reject.` },
    { type: 'callout', tone: 'term', title: 'Naya word: State machine', html: `<strong>Ye kya hai:</strong> ek cheez (yahan ride) hamesha kuch fixed <strong>states</strong> mein se ek mein hoti hai (REQUESTED, ACCEPTED, ...), aur sirf pehle se likhe allowed <strong>transitions</strong> se hi state badalti hai. Jaise traffic light: laal se seedha "peeli-hari ek saath" nahi ho sakti.<br><strong>Kyun chahiye:</strong> ride ko kai log chhoote hain (rider, driver, dispatch, payments). Rules ek jagah likhe hon to koi bhi galat badlav (jaise "ON_TRIP se ACCEPTED") apne aap reject ho jaata hai.<br><strong>Iske bina:</strong> cancel hui ride pe "start trip", ya ek trip do baar "end", aur do baar paisa.<br>Uber ke 2021 fulfillment post ke mutabik naya platform entities ko <strong>statecharts</strong> (state machines jinke andar chhoti state machines ho sakti hain) se model karta hai.` },
    { type: 'ascii', text: `
             accept            arrive            start             end              pay
REQUESTED ─────────> ACCEPTED ────────> ARRIVED ────────> ON_TRIP ────────> COMPLETED ──────> PAID
   │  │                 │                  │
   │  └─ timeout ──> NO_DRIVERS            │
   └──── cancel ────────┴──── cancel ──────┴──> CANCELLED   (ARRIVED ke baad cancel pe fee lag sakti hai)` },
    { type: 'p', html: `Events daba ke dekho. Har sahi transition pe version badhta hai; galat event reject hota hai; aur ek hi event do baar aaye (network retry) to dobara kuch nahi badalta:` },
    { type: 'custom', render(el) {
      const T = { REQUESTED: { accept: 'ACCEPTED', timeout: 'NO_DRIVERS', cancel: 'CANCELLED' }, ACCEPTED: { arrive: 'ARRIVED', cancel: 'CANCELLED' }, ARRIVED: { start: 'ON_TRIP', cancel: 'CANCELLED' }, ON_TRIP: { end: 'COMPLETED' }, COMPLETED: { pay: 'PAID' }, PAID: {}, CANCELLED: {}, NO_DRIVERS: {} };
      const S = Object.keys(T), EV = ['accept', 'arrive', 'start', 'end', 'pay', 'cancel', 'timeout'];
      let st = 'REQUESTED', v = 1, last = null, log = [];
      el.innerHTML = `<div style="color:var(--ink-2);font-size:13px;margin-bottom:4px">States:</div><div class="uber-sm-states" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px"></div>
        <div class="uber-sm-ev" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px"></div>
        <div class="stats"><div class="stat"><span>State</span><strong class="uber-sm-s"></strong></div><div class="stat"><span>Version</span><strong class="uber-sm-v"></strong></div></div>
        <div class="calc-note uber-sm-log" style="font-family:var(--f-mono);font-size:13px;white-space:pre-wrap"></div>`;
      const evBox = el.querySelector('.uber-sm-ev');
      evBox.innerHTML = '<span style="align-self:center;color:var(--ink-2);font-size:13px">Events:</span>';
      EV.forEach(e => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small ghost'; b.textContent = e; b.onclick = () => fire(e); evBox.appendChild(b); });
      const rb = document.createElement('button'); rb.type = 'button'; rb.className = 'btn small'; rb.textContent = 'reset'; rb.onclick = () => { st = 'REQUESTED'; v = 1; last = null; log = []; draw(); }; evBox.appendChild(rb);
      const fire = e => {
        const to = T[st][e];
        if (to) { log.unshift(`✓ ${e}: ${st} → ${to}  (UPDATE … WHERE state='${st}' AND v=${v})`); st = to; v++; last = e; }
        else if (e === last) log.unshift(`↺ ${e} dobara aaya: state already ${st}. Kuch nahi badla, wahi jawaab wapas (idempotent).`);
        else log.unshift(`✗ ${e}: ${st} se allowed nahi. Reject.`);
        log = log.slice(0, 6); draw();
      };
      const draw = () => {
        el.querySelector('.uber-sm-states').innerHTML = S.map(s => `<span class="chip${s === st ? ' on' : ''}">${s}</span>`).join('');
        el.querySelector('.uber-sm-s').textContent = st;
        el.querySelector('.uber-sm-v').textContent = 'v' + v;
        el.querySelector('.uber-sm-log').textContent = log.length ? log.join('\n') : 'Koi event dabao. Try karo: accept, phir start (reject hoga, kyunki pehle arrive chahiye).';
      };
      draw();
    }},
    { type: 'p', html: `Andar se har transition ek <strong>conditional write</strong> hai: "state badlo, lekin sirf tab jab abhi bhi purani state aur purana version ho". Do log ek saath badalne ki koshish karein (rider cancel daba raha hai aur driver start), to sirf ek jeetega; doosre ko taaza state dikha ke reject. Isliye trip store <strong>strongly consistent</strong> chahiye.` },

    { type: 'h3', text: 'Trip data kahan rakhein? Uber ki kahani, saal ke saath' },
    { type: 'callout', tone: 'term', title: 'Naya word: CDC (Change Data Capture)', html: `<strong>Ye kya hai:</strong> database mein jo bhi row badli, uski ek event stream apne aap nikaalna. "Trip COMPLETED hua" CDC se ek event ban jaata hai.<br><strong>Kyun chahiye:</strong> doosri services (search, analytics, notifications) ko badlav jaanne ke liye database ko baar baar poochhna nahi padta.<br><strong>Iske bina:</strong> har service database ko baar baar "kuch badla kya?" poochhti (polling), jo database pe bekaar ka bojh hai.` },
    { type: 'table', head: ['Kab', 'Kya tha', 'Kyun badla'], rows: [
      ['2014 tak', 'Trips ek single PostgreSQL mein', 'Uber ke Mezzanine post ke mutabik early 2014 mein trips table itni badi ho gayi ki naya column ya index jodna downtime laata tha, aur disk khatam ho rahi thi.'],
      ['2014-16', '<strong>Schemaless</strong>: MySQL ke upar Uber ka apna append-only, sharded store', 'Trip UUID se shard, JSON cells jo kabhi overwrite nahi hote. Horizontal scale mila, lekin API bahut seemit thi.'],
      ['2015-2020', 'Dispatch (rt-demand, rt-supply) Ringpop ke saath in-memory, Cassandra/Redis mein', '2021 ke post ke mutabik: availability pehle, consistency "best effort"; do entities ek saath badalni hon to atomic nahi, baad mein reconcile karna padta.'],
      ['2021', '<strong>Docstore</strong> (Schemaless ka successor)', 'Feb 2021 post: MySQL ke upar, har partition Raft (ek consensus tareeka jisme nodes vote karke ek hi order pe agree karte hain) se 3-5 nodes pe copy, ek partition ke andar strict serializability (sab ko writes ek hi sahi order mein dikhein), transactions, CDC.'],
      ['2021', 'Fulfillment platform <strong>Google Cloud Spanner</strong> pe', 'July 2021 post: multi-table transactions (kai tables ek saath badlein, ya kuch nahi), external consistency (poori duniya mein commits ek sahi time-order mein dikhein), statecharts se entities, aur commit ke baad ke kaam ke liye <strong>LATE</strong> (Uber ka ek system jo ye kaam kam se kam ek baar zaroor chalata hai: at-least-once).'],
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: Outbox (transaction ke saath event)', html: `<strong>Ye kya hai:</strong> database mein state badalne aur "ye hua" wala event likhne ko <em>ek hi transaction</em> mein karna. Event pehle ek "outbox" table mein jaata hai, phir wahan se Kafka pe.<br><strong>Kyun chahiye:</strong> trip COMPLETED save ho gaya lekin event bhejne se pehle server crash, to payments ko kabhi pata nahi chalega.<br><strong>Iske bina:</strong> kabhi state badli aur event gaya nahi (paisa nahi kata), kabhi event gaya aur state nahi badli. Detail <a href="#/distributed-tx">sagas aur outbox</a> lesson mein.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Trip end hua, to trip service hi card se paisa kaat le." Agar payment gateway slow ho to driver ka "End trip" button 10 second atka rahega, aur gateway down ho to trip hi end nahi hogi. Behtar: trip transaction mein sirf state COMPLETED karo aur ek event chhodo; payments apni speed se, retries ke saath, us event ko process kare. Ye <a href="#/distributed-tx">saga / outbox</a> wala pattern hai.` },
    { type: 'flow', title: 'Trip end → payment hand-off', height: 330,
      nodes: [
        { id: 'drv', label: 'Driver app', sub: '"End trip"', x: 85, y: 165, w: 130, kind: 'client', info: 'Ye kya hai: driver ki app, yahan trip ke aakhri pal mein. Driver ne drop pe pahunch ke End trip dabaya. Request ke saath request ID, taaki retry safe rahe.' },
        { id: 'trip', label: 'Trip service', sub: 'state machine', x: 275, y: 165, w: 150, kind: 'server', info: 'Ye kya hai: wo service jo ride ki state machine chalati hai. Transition validate karta hai (ON_TRIP → COMPLETED), fare nikaalta hai, aur ek hi transaction mein state + "trip completed" event likhta hai.' },
        { id: 'tdb', label: 'Trip store', sub: 'Spanner (2021+)', x: 275, y: 280, w: 150, kind: 'data', info: 'Ye kya hai: rides ka asli, bharosemand database. Strongly consistent, transactional (kai badlav ek saath, ya sab ya kuch nahi). Uber ke 2021 post ke mutabik fulfillment entities ab Google Cloud Spanner pe hain. Usse pehle Schemaless/Cassandra jaise stores the.' },
        { id: 'kf', label: 'Kafka', sub: 'trip events', x: 470, y: 165, w: 130, kind: 'queue', info: 'Ye kya hai: trip events ka log ("r9 COMPLETED"). Trip events ki stream. Payments, receipts, rider app updates, analytics: sab apni speed se padhte hain. Uber ke 2021 paper ke mutabik Uber pe Kafka mein roz trillions messages aate hain.' },
        { id: 'pay', label: 'Payments', sub: 'Gulfstream', x: 640, y: 70, w: 130, kind: 'server', info: 'Ye kya hai: paisa kaatne aur driver ko dene wala system. Uber ka payments platform (2020 post mein "fifth generation" kaha gaya): double-entry accounting, immutable orders, aur deterministic unique IDs se har order exactly once process.' },
        { id: 'rid', label: 'Rider app', sub: 'push: receipt', x: 640, y: 260, w: 130, kind: 'client', info: 'Ye kya hai: rider ki app, jo khula connection rakhti hai. Rider ko trip khatam hone aur receipt ki khabar push se milti hai. Uber ka push platform RAMEN (2020 post) yahi kaam karta hai.' },
      ],
      edges: [{ a: 'drv', b: 'trip' }, { a: 'trip', b: 'tdb' }, { a: 'trip', b: 'kf' }, { a: 'kf', b: 'pay' }, { a: 'kf', b: 'rid' }],
      scenarios: [
        { name: 'Trip complete (happy)', steps: [
          { title: 'End trip', text: 'Driver ne End trip dabaya.', go: 'drv>trip', msg: 'POST /v1/rides/r9/end  (request-id: e-771)' },
          { title: 'Ek transaction', text: 'ON_TRIP → COMPLETED, fare save, aur "completed" event bhi usi transaction mein (outbox jaisa). Ya to sab hoga ya kuch nahi.', go: ['trip>tdb', 'res:tdb>trip'], msg: 'state=COMPLETED, fare=212, v=6' },
          { title: 'Driver ko turant OK', text: 'Driver ko payment ka wait nahi karna padta.', go: 'res:trip>drv', after: { drv: { state: 'ok', sub: 'trip done' } } },
          { title: 'Event fan-out', text: 'Event Kafka pe; payments aur rider app dono ko apni copy.', go: ['evt:trip>kf'] },
          { title: 'Paisa + receipt', text: 'Payments order banake charge karta hai; rider ko receipt push.', parallel: true, go: ['evt:kf>pay', 'evt:kf>rid'], after: { pay: { state: 'ok', sub: 'charged once' } } },
        ]},
        { name: 'End trip do baar', steps: [
          { title: 'Network atka', text: 'Driver ka pehla request pahuncha aur commit bhi hua, lekin jawaab raaste mein kho gaya. App ne retry kiya.', go: ['drv>trip', 'trip>tdb', 'lost:trip>drv'] },
          { title: 'Retry aaya', text: 'Wahi request-id dobara. Trip pehle se COMPLETED; conditional write (WHERE state=ON_TRIP) fail hota hai.', go: 'drv>trip', msg: 'request-id e-771 already applied', set: { trip: { state: 'warn', sub: 'duplicate' } } },
          { title: 'Same jawaab wapas', text: 'Koi naya event nahi, koi doosra charge nahi. Driver ko wahi purana success. Ise idempotency kehte hain.', go: 'res:trip>drv', set: { trip: { state: 'ok', sub: 'idempotent' } } },
        ]},
        { name: 'Payments down', steps: [
          { title: 'Payments gira', text: 'Payments service ka deploy kharab, sab pods crash.', set: { pay: { state: 'down', sub: 'DOWN' } }, focus: ['pay'] },
          { title: 'Trips phir bhi khatam', text: 'Trips normal complete ho rahe hain; events Kafka mein jama (backlog). Riders ko receipt thodi der se.', flood: { paths: ['drv>trip>kf'], n: 6 }, after: { kf: { state: 'warn', sub: 'backlog' } } },
          { title: 'Wapas aaya, catch up', text: 'Payments wapas, purane offset se padhta hai. Har event ka deterministic order ID hai, to koi event do baar aaye to bhi charge ek hi baar (Gulfstream post ka exactly-once idea).', set: { pay: { state: 'ok', sub: 'catching up' } }, flood: { paths: ['evt:kf>pay'], n: 6 }, after: { kf: { state: '', sub: 'trip events' } } },
        ]},
      ],
    },
    { type: 'p', html: `Ek purani, mazedaar trick bhi jaan lo. 2015 ke talk ke mutabik, poore datacenter ke fail hone pe trip ki state na khoye, iske liye Uber driver ke phone ko hi ek "backup" ki tarah use karta tha: server encrypted <strong>state digest</strong> phone pe bhejta rehta, aur failover ke baad backup datacenter phone se wo state wapas le leta. Aaj multi-region transactional stores (jaise Spanner) ye kaam database level pe karte hain, lekin idea yaad rakhne layak hai: jo client lagaataar baat kar raha hai, wo recovery ka source ban sakta hai.` },

    { type: 'h3', text: 'Payments, high level: paisa kab aur kaise kat-ta hai' },
    { type: 'p', html: `Payments ka poora system apne aap mein ek bada design hai. Interview mein usually high level kaafi hai: <em>kab</em> price tay hota hai, <em>kab</em> card pe paisa roka jaata hai, <em>kab</em> asli charge hota hai, aur double charge kaise rokte hain. Uber ke public pages se ye picture banti hai:` },
    { type: 'steps', items: [
      { t: 'Upfront fare (request se pehle)', d: 'Uber ke August 2016 newsroom post ke mutabik rider ko request se pehle hi exact price dikhta hai, range nahi. Ye expected time, distance, traffic aur us waqt ki demand (surge) se banta hai. Post ke mutabik ye 2016 mein US aur India mein uberX ke liye aaya. Agar trip bahut badal jaaye (destination badla, kai stops), to fare asli time aur distance se dobara banta hai.' },
      { t: 'Authorization hold (card pe paisa "roka")', d: 'Uber ke help/blog page ke mutabik ride request ke time ya uske baad card pe fare jitni ek temporary "pending" rok lag sakti hai. Ye check karta hai ki card mein paisa hai aur fraud rokta hai. Cancel kiya to rok hat jaati hai.' },
      { t: 'Trip end → asli charge', d: 'Trip COMPLETED ka event payments tak jaata hai (upar wala flow). Rok final charge ban jaati hai. Final fare kam hua to sirf utna hi kat-ta hai aur baaki rok hat jaati hai.' },
      { t: 'Ledger + driver payout', d: 'Uber ke 2020 post ke mutabik Gulfstream paisa lene (collection) aur dene (disbursement) dono ka platform hai, double-entry accounting pe. Har order immutable hai, pehle save hota hai phir process, aur unique order ID se exactly once.' },
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: Authorization hold', html: `<strong>Ye kya hai:</strong> bank ko bolna "is card pe ₹212 abhi rok lo, kaatna baad mein". Rider ke bank statement mein ye "pending" dikhta hai.<br><strong>Kyun chahiye:</strong> trip shuru hone se pehle pata chal jaaye ki card chalega. Trip ke baad pata chalta ki card khaali hai, to driver ki mehnat ka paisa kaun dega?<br><strong>Iske bina:</strong> bahut saari "free" rides aur fraud, ya har ride se pehle hi poora charge (jo cancel pe refund ka jhanjhat banta).` },
    { type: 'callout', tone: 'term', title: 'Naya word: Double-entry ledger', html: `<strong>Ye kya hai:</strong> paise ka hisaab jisme har lenden do jagah likha jaata hai: ek account se nikla (debit), doosre mein gaya (credit). Dono ka jod hamesha zero. Entries kabhi mitaayi nahi jaatin; galti sudhaarni ho to ek nayi ulti entry.<br><strong>Kyun chahiye:</strong> paisa "hawa mein" na banta hai na gaayab hota hai. Kisi bhi pal hisaab mila ke dekha ja sakta hai (reconcile).<br><strong>Iske bina:</strong> ek bug se rider ka paisa kata lekin driver ko nahi mila, aur kisi ko pata bhi nahi chalega.` },
    { type: 'p', html: `Khud dekho. Neeche ke rates sirf "maan lo" wale hain (base ₹50, ₹12 per km, ₹2 per minute, aur platform fee 25%), Uber ke asli rates nahi:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Andaaza: distance (km)</label><input class="ubp-ek" type="number" value="8" min="1" step="1"></div>
          <div><label>Andaaza: time (min)</label><input class="ubp-em" type="number" value="25" min="1" step="1"></div>
          <div><label>Asli: time (min, traffic ke baad)</label><input class="ubp-am" type="number" value="31" min="1" step="1"></div>
          <div><label>Surge</label><select class="ubp-s"><option value="1">1.0×</option><option value="1.4">1.4×</option><option value="1.8">1.8×</option></select></div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0"><button type="button" class="chip ubp-d">Rider ne beech mein destination badla (+5 km, +12 min)</button><button type="button" class="chip ubp-c">Rider ne cancel kiya</button></div>
        <div class="stats">
          <div class="stat"><span>Upfront fare (dikhaaya)</span><strong class="ubp-u"></strong></div>
          <div class="stat"><span>Card pe hold</span><strong class="ubp-h"></strong></div>
          <div class="stat"><span>Final charge</span><strong class="ubp-f"></strong></div>
        </div>
        <div class="calc-note ubp-l" style="font-family:var(--f-mono);font-size:13px;white-space:pre-wrap"></div>`;
      const q = s => el.querySelector(s), num = s => Math.max(0, Number(q(s).value) || 0);
      let dest = false, cancel = false;
      const fare = (km, min, s) => Math.round((50 + 12 * km + 2 * min) * s);
      const upd = () => {
        const ek = num('.ubp-ek'), em = num('.ubp-em'), am = num('.ubp-am'), s = Number(q('.ubp-s').value);
        const up = fare(ek, em, s), fin = cancel ? 0 : dest ? fare(ek + 5, am + 12, s) : up, fee = Math.round(fin * 0.25);
        q('.ubp-u').textContent = '₹' + up; q('.ubp-h').textContent = '₹' + up;
        q('.ubp-f').textContent = '₹' + fin;
        q('.ubp-d').classList.toggle('on', dest); q('.ubp-c').classList.toggle('on', cancel);
        q('.ubp-l').textContent = cancel
          ? `Cancel: hold ₹${up} hata di gayi. Ledger mein koi charge entry nahi.`
          : `${dest ? `Trip badal gayi: fare asli distance aur time se dobara bana (₹${fin}).` : `Trip normal: asli time ${am} min tha, phir bhi upfront ₹${up} hi laga.`}\nLedger (double-entry):\n  rider card        -₹${fin}\n  driver earnings   +₹${fin - fee}\n  platform fee      +₹${fee}\n  jod               ₹0`;
      };
      q('.ubp-d').onclick = () => { dest = !dest; cancel = false; upd(); };
      q('.ubp-c').onclick = () => { cancel = !cancel; dest = false; upd(); };
      el.querySelectorAll('input,select').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Default values pe upfront fare ₹196 hai (50 + 12×8 + 2×25). Traffic se trip 31 minute ki hui, phir bhi ₹196 hi: risk platform ne liya. Destination badla to fare asli 13 km aur 43 min se ₹292 ban jaata hai. Ledger mein rider se nikla har rupaya kahin na kahin likha hai, isliye hisaab hamesha milta hai.` },

    { type: 'h2', text: 'Deep dive 4: surge pricing, stream processing per hexagon' },
    { type: 'p', html: `Match khatam hua, 50,000 log ek saath ride maang rahe hain, aur paas mein 200 drivers. Price same rakho to kya hoga? Jo pehle dabaye use ride, baaki ko "no cars" aur lamba wait. Uber ke official surge page ke mutabik surge ek "relief valve" hai: jab kisi area mein riders available drivers se zyada hon, price badhta hai, jisse kuch riders rukte hain aur aas paas ke drivers us area mein aate hain. Ye hyperlocal hai (poore shehar pe ek price nahi), aur imbalance jitna zyada, badlav utna zyada.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Surge multiplier', html: `<strong>Ye kya hai:</strong> ek number (jaise 1.8×) jisse normal fare guna hota hai, jab kisi chhote area mein riders free drivers se zyada hon. Har hexagon ka apna multiplier.<br><strong>Kyun chahiye:</strong> thode riders ruk jaate hain (ya baad mein book karte hain), aur aas paas ke drivers ko is area mein aane ka kaaran milta hai. Demand aur supply wapas barabar.<br><strong>Iske bina:</strong> jo pehle tap kare use ride, baaki sabko "no cars" aur bahut lamba wait.` },
    { type: 'p', html: `Asli system kaise bana hai? Uber ke engineers ke SIGMOD 2021 paper "Real-time Data Infrastructure at Uber" ke mutabik surge ek <strong>streaming pipeline</strong> hai jo ek time window mein trip data aur rider/driver status se <strong>har hexagon area ka pricing multiplier</strong> nikaalti hai: Kafka se data aata hai, Flink mein ek complex machine-learning based algorithm chalta hai, aur result ek key-value store mein jaata hai taaki fare nikaalte waqt turant mil jaaye.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Stream processing (Flink)', html: `<strong>Ye kya hai:</strong> data ko roz raat ek baar (batch) process karne ki jagah, har event aate hi lagaataar process karna. <strong>Apache Flink</strong> ek stream processing engine hai: Kafka se events padhta hai, unhe <strong>time windows</strong> mein group karta hai ("pichhle 1 minute mein is hexagon mein kitni requests"), aur result aage bhejta hai. Uske paas apni state (counters) hoti hai jo crash pe checkpoint (bachaayi hui copy) se wapas aati hai.<br><strong>Kyun chahiye:</strong> surge ko <em>abhi</em> ki demand chahiye. Kal raat ka batch result stadium ke 10 minute ke rush ke kisi kaam ka nahi.<br><strong>Iske bina:</strong> har request pe database mein "pichhle 1 minute ki requests gino" query, lakhon baar, ya phir purana data. Detail <a href="#/big-data">big data lesson</a> mein.` },
    { type: 'callout', tone: 'warn', title: 'Neeche ka widget simplified model hai', html: `Uber ka asli surge algorithm ML based hai aur public nahi hai. Neeche ka formula sirf idea mehsoos karne ke liye hai: <code>ratio = demand ÷ supply</code>; smoothing on ho to cell ka ratio aur uske 6 padosiyon ke average ratio ka aadha-aadha; ratio &lt; 1.2 pe 1.0×, warna <code>1 + 0.5 × (ratio − 1)</code>, max 3.0×. Matlab ratio 2 → 1.5×, ratio 3 → 2.0×, ratio 5 ya zyada → 3.0×.` },
    { type: 'p', html: `Kisi bhi hexagon pe tap karo, phir uski demand (pichhli window ki requests) aur supply (free drivers) badlo. Beech wala hexagon stadium hai:` },
    { type: 'custom', render(el) {
      const rng = seed => { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = s * 16807 % 2147483647) / 2147483647; };
      const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
      const mult = r => r < 1.2 ? 1 : Math.min(3, Math.round((1 + 0.5 * (r - 1)) * 10) / 10);
      const fresh = () => { const R = rng(7), c = []; for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) if (Math.abs(q + r) <= 2) { const ctr = q === 0 && r === 0; c.push({ q, r, d: ctr ? 30 : Math.round(3 + R() * 9), s: ctr ? 8 : Math.round(4 + R() * 8) }); } return c; };
      let C = fresh(), sel = C.findIndex(c => c.q === 0 && c.r === 0), smooth = true, boost = 1;
      el.innerHTML = `<svg class="uber-hx" viewBox="0 0 330 290" style="width:100%;max-width:420px;display:block;margin:0 auto;touch-action:manipulation"></svg>
        <div class="row2">
          <div><label for="uber-hd">Selected cell: demand (requests)</label><input id="uber-hd" type="range" min="0" max="60" step="1"></div>
          <div><label for="uber-hs">Selected cell: supply (free drivers)</label><input id="uber-hs" type="range" min="0" max="40" step="1"></div>
          <div><label for="uber-hb">Poore shehar ki demand × (baarish, office chhutti)</label><input id="uber-hb" type="range" min="0.5" max="2" step="0.1" value="1"></div>
          <div style="display:flex;align-items:flex-end;gap:8px;flex-wrap:wrap"><button type="button" class="btn small uber-hsm">Smoothing: ON</button><button type="button" class="btn small ghost uber-hr">Reset</button></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Selected: demand / supply</span><strong class="uber-o1"></strong></div>
          <div class="stat"><span>Selected: ratio → surge</span><strong class="uber-o2"></strong></div>
          <div class="stat"><span>Surging cells</span><strong class="uber-o3"></strong></div>
          <div class="stat"><span>City max</span><strong class="uber-o4"></strong></div>
        </div>
        <div class="calc-note uber-o5"></div>`;
      const svg = el.querySelector('.uber-hx'), hd = el.querySelector('#uber-hd'), hs = el.querySelector('#uber-hs'), hb = el.querySelector('#uber-hb');
      const SZ = 30, cx = 165, cy = 145;
      const pos = c => [cx + SZ * Math.sqrt(3) * (c.q + c.r / 2), cy + SZ * 1.5 * c.r];
      const pts = (x, y) => [...Array(6)].map((_, i) => { const a = Math.PI / 180 * (60 * i - 30); return (x + (SZ - 1.5) * Math.cos(a)).toFixed(1) + ',' + (y + (SZ - 1.5) * Math.sin(a)).toFixed(1); }).join(' ');
      const compute = () => {
        const idx = {}; C.forEach((c, i) => idx[c.q + ',' + c.r] = i);
        const raw = C.map(c => c.d * boost / Math.max(c.s, 1));
        return C.map((c, i) => { const nb = DIRS.map(([a, b]) => idx[(c.q + a) + ',' + (c.r + b)]).filter(j => j !== undefined); const avg = nb.reduce((t, j) => t + raw[j], 0) / nb.length; const r = smooth ? 0.5 * raw[i] + 0.5 * avg : raw[i]; return { r, m: mult(r) }; });
      };
      const draw = () => {
        const out = compute();
        svg.innerHTML = C.map((c, i) => { const [x, y] = pos(c), m = out[i].m, col = m >= 2 ? 'var(--red)' : m > 1 ? 'var(--amber)' : 'var(--surface-2)', op = m > 1 ? (0.25 + 0.6 * Math.min(1, (m - 1) / 2)).toFixed(2) : 1;
          return `<g data-i="${i}" style="cursor:pointer"><polygon points="${pts(x, y)}" fill="${col}" fill-opacity="${op}" stroke="${i === sel ? 'var(--accent)' : 'var(--line-2)'}" stroke-width="${i === sel ? 3 : 1}"/><text x="${x.toFixed(1)}" y="${(y + 5).toFixed(1)}" text-anchor="middle" font-size="13" font-family="var(--f-mono)" fill="var(--ink)">${m.toFixed(1)}×</text></g>`; }).join('');
        svg.querySelectorAll('g').forEach(g => g.addEventListener('click', () => { sel = Number(g.dataset.i); sync(); draw(); }));
        const o = out[sel], c = C[sel], sur = out.filter(x => x.m > 1).length, mx = Math.max(...out.map(x => x.m));
        el.querySelector('.uber-o1').textContent = `${Math.round(c.d * boost)} / ${c.s}`;
        el.querySelector('.uber-o2').textContent = `${o.r.toFixed(2)} → ${o.m.toFixed(1)}×`;
        el.querySelector('.uber-o3').textContent = `${sur} / ${C.length}`;
        el.querySelector('.uber-o4').textContent = mx.toFixed(1) + '×';
        el.querySelector('.uber-o5').textContent = smooth
          ? 'Smoothing ON: har cell padosiyon ka bhi dhyan rakhta hai. Price ek gali paar karte hi achaanak nahi uchhalta, aur paas ke drivers ko "us taraf chalo" ka dheere badhta signal milta hai. Hexagons ke saare padosi same doori pe hain, isliye ye average saaf hai.'
          : 'Smoothing OFF: har cell sirf apna ratio dekhta hai. Stadium cell bahut upar, padosi normal: border pe khade rider ko 100 meter chalne se aadha price, aur drivers ke liye signal jhatkedaar.';
        el.querySelector('.uber-hsm').textContent = 'Smoothing: ' + (smooth ? 'ON' : 'OFF');
      };
      const sync = () => { hd.value = C[sel].d; hs.value = C[sel].s; };
      hd.addEventListener('input', () => { C[sel].d = Number(hd.value); draw(); });
      hs.addEventListener('input', () => { C[sel].s = Number(hs.value); draw(); });
      hb.addEventListener('input', () => { boost = Number(hb.value); draw(); });
      el.querySelector('.uber-hsm').onclick = () => { smooth = !smooth; draw(); };
      el.querySelector('.uber-hr').onclick = () => { C = fresh(); sel = C.findIndex(c => c.q === 0 && c.r === 0); smooth = true; boost = 1; hb.value = 1; sync(); draw(); };
      sync(); draw();
    }},
    { type: 'p', html: `Shuru mein stadium cell (30 requests, 8 drivers) smoothing ON pe 1.8× aur OFF pe 2.4× dikhata hai, kyunki ON mein uske shaant padosi average ko neeche kheenchte hain. Stadium ki supply 30 tak le jaao: surge gayab. Ye wahi "relief valve" hai: drivers aaye, imbalance gaya, price normal.` },

    { type: 'p', html: `Ab pipeline. Paper ki ek khaas line yaad rakhne layak hai: surge <strong>data freshness aur availability ko consistency se upar</strong> rakhta hai. Der se aaye messages surge calculation mein shaamil hi nahi hote, kyunki har window ka result ek strict end-to-end latency ke andar chahiye. Isliye surge wala Kafka cluster high throughput ke liye configure hai, "ek bhi message na khoye" ke liye nahi. Aur disaster ke liye <strong>active-active</strong> setup:` },
    { type: 'callout', tone: 'term', title: 'Naya word: Active-active', html: `<strong>Ye kya hai:</strong> do (ya zyada) regions (alag shehron ke data centers) mein same system <strong>ek saath</strong> chal raha hai, dono "garam".<br><strong>Kyun chahiye:</strong> ek region gire to doosra pehle se taiyaar hai; "standby ko jagaane" ka minutes ka wait nahi.<br><strong>Iske bina:</strong> region girte hi surge ruk jaata jab tak backup shuru na ho. Keemat: kaam do jagah, yaani compute double.` },
    { type: 'flow', title: 'Surge pipeline (SIGMOD 2021 paper ke hisaab se)', height: 310,
      nodes: [
        { id: 'apps', label: 'Apps + services', sub: 'trip, rider, driver', x: 85, y: 150, w: 150, kind: 'client', info: 'Ye kya hai: Uber ki apps aur andar ki services jo events paida karti hain. Rider requests, driver status aur trip events. Ye sab events Kafka mein jaate hain.' },
        { id: 'rk', label: 'Regional Kafka', sub: 'har region', x: 260, y: 150, w: 140, kind: 'queue', info: 'Ye kya hai: har region (data center area) ka apna Kafka. Paper ke mutabik saare trip events pehle apne region ke Kafka cluster mein jaate hain, kyunki paas wala cluster tez aur sasta hai.' },
        { id: 'ak', label: 'Aggregate Kafka', sub: 'global view', x: 430, y: 150, w: 140, kind: 'queue', info: 'Ye kya hai: ek bada Kafka jisme sab regions ka data jud jaata hai. Regional clusters ka data aggregate clusters mein replicate hota hai (Uber ka uReplicator), taaki har region ke paas poori duniya ka same input ho.' },
        { id: 'fl', label: 'Flink: region A', sub: 'per hexagon', x: 610, y: 60, w: 150, kind: 'server', info: 'Ye kya hai: region A mein chalta stream processing job. Bada, bahut memory wala Flink job: time window mein har hexagon ke liye demand, supply aur ML model se multiplier. Primary region ka result use hota hai.' },
        { id: 'kv', label: 'Pricing KV', sub: 'cell → multiplier', x: 610, y: 150, w: 150, kind: 'data', info: 'Ye kya hai: ek simple, tez "key → value" database (yahan hexagon ID → multiplier). Fast key-value store (paper mein active/active database). Fare service yahan se hexagon ka multiplier turant padhti hai.' },
        { id: 'fl2', label: 'Flink: region B', sub: 'standby nahi, garam', x: 430, y: 262, w: 150, kind: 'server', info: 'Ye kya hai: region B mein wahi job ki garam copy. Doosre region mein wahi job, wahi aggregate input pe, independently chal raha hai. Flink ki state itni badi hai ki regions ke beech synchronously copy nahi hoti; isliye har region khud compute karta hai aur same input se same result pe pahunchta hai.' },
        { id: 'fare', label: 'Fare / estimate', sub: 'GET /estimate', x: 610, y: 262, w: 150, kind: 'server', info: 'Ye kya hai: wo service jo rider ko "₹212" jaisa price dikhati hai. Rider ko fare dikhate waqt pickup hexagon ka multiplier padhti hai.' },
      ],
      edges: [{ a: 'apps', b: 'rk' }, { a: 'rk', b: 'ak' }, { a: 'ak', b: 'fl' }, { a: 'fl', b: 'kv' }, { a: 'kv', b: 'fare' }, { a: 'ak', b: 'fl2' }, { a: 'fl2', b: 'kv', id: 'f2kv', dashed: true, hidden: true }],
      scenarios: [
        { name: 'Har window ka surge', steps: [
          { title: 'Events aaye', text: 'Stadium wale hexagon se requests ki baarish, drivers kam.', flood: { paths: ['evt:apps>rk>ak'], n: 8 } },
          { title: 'Window compute', text: 'Dono regions ke Flink jobs same input padh ke har hexagon ka multiplier nikaalte hain.', parallel: true, go: ['evt:ak>fl', 'evt:ak>fl2'], msg: 'window 18:42:00-18:43:00  cell 8961… → 1.8×' },
          { title: 'Primary likhta hai', text: 'Sirf primary region (A) ka update service KV mein likhta hai.', go: 'fl>kv', after: { kv: { state: 'ok', sub: 'stadium: 1.8×' } } },
          { title: 'Fare mein use', text: 'Rider ke estimate pe naya multiplier. Kuch seconds purana bhi chalega.', go: ['fare>kv', 'res:kv>fare'], msg: 'fare = base × 1.8' },
        ]},
        { name: 'Late events', steps: [
          { title: 'Ek region ke events late', text: 'Network jhatke se kuch events window band hone ke baad pahunche.', go: 'lost:apps>rk', set: { rk: { state: 'warn', sub: 'late msgs' } } },
          { title: 'Chhod do', text: 'Paper ke mutabik late messages surge calculation mein shaamil nahi hote. Thoda kam accurate, lekin time pe. Payment mein ye kabhi nahi chalega; surge mein chalta hai.', go: ['evt:ak>fl', 'fl>kv'], set: { rk: { state: '' } }, after: { kv: { state: 'ok', sub: 'on time' } } },
        ]},
        { name: 'Region A down', steps: [
          { title: 'Disaster', text: 'Region A gira.', set: { fl: { state: 'down', sub: 'region down' } }, focus: ['fl'] },
          { title: 'B primary bana', text: 'Ek all-active coordinating service region B ko primary bana deti hai. B ka Flink pehle se garam tha, to bas uska update service KV mein likhna shuru karta hai.', set: { fl2: { state: 'ok', sub: 'PRIMARY' } }, show: ['f2kv'], go: 'fl2>kv', after: { kv: { state: 'ok', sub: 'fed by B' } } },
          { title: 'Keemat', text: 'Har region mein poora redundant pipeline chalta hai: compute bahut. Paper khud ise compute intensive kehta hai. Surge business ke liye itna zaroori hai ki ye keemat chukaayi jaati hai.', go: ['fare>kv', 'res:kv>fare'] },
        ]},
      ],
    },

    { type: 'h2', text: 'Deep dive 5: ETA, routing engine + ML correction' },
    { type: 'p', html: `ETA har jagah hai: matching ki ranking, rider ko dikhne wala pickup time, fare. Uber ke Feb 2022 ke DeepETA post ke mutabik ye do parton mein banta hai:` },
    { type: 'steps', items: [
      { t: 'Routing engine', d: 'Road network ko chhote segments mein toda jaata hai: graph ke edges, har edge ka weight = us segment ko paar karne ka time (real-time traffic ke saath). Shortest path algorithm best route dhoondhta hai aur segments ke time jod ke pehla ETA deta hai. (Maps routing ka detail <a href="#/design-maps">Google Maps</a> lesson mein.)' },
      { t: 'ML residual (DeepETA)', d: 'Routing ETA aur asli lage time mein farak hota hai (signal, pickup point dhoondhna, mausam). Ek model sirf ye <strong>farak</strong> predict karta hai, origin, destination, time, live traffic aur request type (ride ya delivery) jaise features se. Final ETA = routing ETA + predicted correction.' },
    ]},
    { type: 'list', items: [
      `<strong>Pehle:</strong> post ke mutabik kai saal tak Uber gradient-boosted trees (XGBoost: bahut saare chhote "agar-to" decision trees ko jod ke bana model) use karta tha; model itna bada ho gaya ki aur scale karna mushkil hua, isliye deep learning pe gaye.`,
      `<strong>Model:</strong> ek linear transformer (transformer ek tarah ka neural network hai; "linear" wala sasta aur tez hai), embedding tables (har road segment jaisi cheez ke liye seekhe hue numbers ki list) mein crores parameters, lekin har prediction pe sirf ~0.25% parameters chhoota hai.`,
      `<strong>Latency:</strong> ETA kuch milliseconds mein chahiye; post ise Uber ka sabse zyada QPS (queries per second) wala model kehta hai.`,
      `<strong>Serving:</strong> Michelangelo pe (Uber ka ML platform, 2017 mein public hua), routing frontend uRoute ke peeche.`,
    ]},
    { type: 'callout', tone: 'tip', title: 'Pattern pehchano', html: `"Physics/graph se ek base answer, ML se sirf correction" ek bahut kaam ka pattern hai: model chhota rehta hai, routing engine ko chhede bina accuracy badhti hai, aur model fail ho to base answer fallback ban jaata hai.` },

    { type: 'h2', text: 'Live tracking: rider ko driver hilta hua dikhe' },
    { type: 'p', html: `Rider app ko driver ki location aur trip status chahiye. Pehle Uber ke apps <strong>polling</strong> karte the. Uber ke Dec 2020 RAMEN post ke mutabik peak pe API gateway ki <strong>80% requests polling</strong> thi: battery khatam, network bhara, app slow. Isliye push platform banaya: 2015 mein <a href="#/realtime">SSE</a> pe, upar apni reliability layer ke saath; 2019 se gRPC (Google ka banaya tez request-response tareeka) based, dono taraf ki streaming. Post ke time pe ~15 lakh concurrent connections aur 2.5 lakh+ messages/second.` },
    { type: 'p', html: `Flow: driver ka ping location service tak (upar wala diagram), wahan se rider ke liye ek update ban ke push platform pe, jo rider ke open connection pe bhej deta hai. Har ping rider tak bhejna zaroori nahi; map smooth dikhane ke liye app beech ki position animate kar leta hai.` },

    { type: 'h2', text: 'Bottlenecks aur failures, ek jagah' },
    { type: 'table', head: ['Kya toota', 'Kya hota hai', 'Bachaav'], rows: [
      ['Location ingest overload', 'Geo index ya location shards hot, pings drop', 'Cell se sharding, replicas, ping interval adaptive (khade driver kam bhejein), Kafka ko raaste se bahar rakho'],
      ['Hot cell (stadium, airport)', 'Ek shard pe saara load', 'Finer resolution, read replicas, batched matching'],
      ['Gateway node gira', 'Us node ke phones disconnect', 'Stateless gateways; app exponential backoff + jitter se reconnect'],
      ['Driver ne offer ignore kiya', 'Rider wait karta reh jaata', 'Offer TTL, lock TTL, agla candidate'],
      ['Do workers, ek driver', 'Double assignment', 'Conditional write / transaction (strongly consistent supply store)'],
      ['Payments down', 'Charge nahi ho raha', 'Trip complete karo, event Kafka mein; deterministic order ID se exactly once'],
      ['Region down', 'Surge, dispatch ruk sakte hain', 'Active-active (surge), multi-region transactional store (trips)'],
    ]},

    { type: 'h2', text: 'Interview mein kaise bolein' },
    { type: 'steps', items: [
      { t: 'Do tarah ka data', d: 'Location: high volume, ephemeral, thoda purana chalega → RAM geo index + Kafka. Trip/supply/payment: strongly consistent → transactional store.' },
      { t: 'Napkin maths', d: '10 lakh drivers / 4 s = 2.5 lakh writes/s. Isliye DB nahi, in-memory index.' },
      { t: 'Geo index', d: 'H3 cells, cell se sharding, k-ring search, TTL. Hot cells ka plan.' },
      { t: 'Matching', d: 'Candidates cells se, rank road ETA se, kuch seconds ka batch, ek driver ko offer + timeout, conditional write se lock.' },
      { t: 'Trip state machine', d: 'Allowed transitions, versioned conditional writes, idempotent retries, outbox event → payments async.' },
      { t: 'Payments', d: 'Upfront fare, card pe authorization hold, trip end event pe final charge async, double-entry ledger, unique order ID se exactly once.' },
      { t: 'Surge', d: 'Kafka → Flink windows per hexagon → KV; freshness > consistency; active-active.' },
      { t: 'Evolution', d: 'S2 → H3, Ringpop → Spanner-based fulfillment, Schemaless → Docstore. Dikhao ki tum trade-offs samajhte ho, naam ratte nahi.' },
    ]},
    { type: 'callout', tone: 'why', title: 'Decide', html: `• "Paas mein kaun hai?" aur cheezein har kuch second hilti hain → <strong>H3/geohash cells + in-memory index (Redis GEO ya custom)</strong>, TTL ke saath. Static places → Elasticsearch/PostGIS.<br>• Ek resource (driver, seat) ko do log na le paayein → <strong>strongly consistent store + conditional write/transaction</strong>.<br>• Multi-step lifecycle (ride, order) → <strong>state machine</strong> + idempotent transitions + events.<br>• Live aggregate (surge, trending) → <strong>Kafka + stream processor windows</strong>, freshness &gt; perfect accuracy.<br>• Paisa → exactly-once via idempotency keys, async from the critical path.` },

    { type: 'diagram', title: 'Poora design, ek nazar mein', height: 620,
      caption: 'Upar: location ka firehose (RAM mein, thoda purana chalega). Beech: ride request, matching aur trip (strongly consistent). Neeche: trip ke baad ka kaam (payments, receipt) jo events se async hota hai. Buttons se ek-ek raasta dekho.',
      groups: [
        { label: 'Location path (har ~4 s)', x: 8, y: 28, w: 570, h: 92 },
        { label: 'Surge (stream processing)', x: 8, y: 146, w: 420, h: 92 },
        { label: 'Ride request, matching, trip', x: 8, y: 266, w: 708, h: 212 },
        { label: 'Trip ke baad (async)', x: 148, y: 506, w: 424, h: 96 },
      ],
      nodes: [
        { id: 'drv', label: 'Driver app', sub: 'GPS ping', x: 75, y: 80, w: 120, kind: 'client', info: 'Ye kya hai: driver ke phone ki app. Har ~4 second (Uber ka 2015 number) apni lat/lng bhejti hai, aur offers yahin aate hain. Poore firehose ki shuruaat.' },
        { id: 'wsg', label: 'WS gateway', sub: 'WebSocket', x: 215, y: 80, w: 120, kind: 'net', info: 'Ye kya hai: lakhon phones ke khule WebSocket connections pakadne wale servers. Ping andar bhejte hain aur offer bahar. Stateless: ek gire to phone doosre se jud jaata hai.' },
        { id: 'loc', label: 'Location svc', sub: 'lat/lng → H3', x: 360, y: 80, w: 120, kind: 'server', info: 'Ye kya hai: har ping ko check karke H3 cell nikaalne wali service. Geo index update karti hai aur ping ko Kafka pe history ke liye bhejti hai. Cell ke hisaab se kai machines pe sharded.' },
        { id: 'geo', label: 'Geo index', sub: 'cell → drivers', x: 505, y: 80, w: 120, kind: 'cache', info: 'Ye kya hai: RAM mein "H3 cell → available drivers" ki list, har entry pe TTL. Kyun: paas ke drivers milliseconds mein. 2015 mein S2 cells, 2018 se Uber ka apna H3.' },
        { id: 'kf', label: 'Kafka', sub: 'pings + requests', x: 360, y: 200, w: 120, kind: 'queue', info: 'Ye kya hai: events ka append-only log. Location pings aur ride requests yahan aate hain, taaki surge, analytics aur ETA training apni speed se padh sakein, matching ko roke bina.' },
        { id: 'fl', label: 'Flink surge', sub: 'window/hexagon', x: 215, y: 200, w: 120, kind: 'server', info: 'Ye kya hai: stream processing job. Har time window mein har hexagon ki demand aur supply dekh ke multiplier nikaalta hai (SIGMOD 2021 paper). Late events chhod deta hai; freshness pehle. Do regions mein active-active.' },
        { id: 'kv', label: 'Pricing KV', sub: 'cell → 1.8×', x: 75, y: 200, w: 120, kind: 'data', info: 'Ye kya hai: tez key-value store: hexagon ID → surge multiplier. Fare banate waqt yahin se turant padha jaata hai.' },
        { id: 'rid', label: 'Rider app', sub: 'book ride', x: 75, y: 320, w: 120, kind: 'client', info: 'Ye kya hai: rider ke phone ki app. Fare dekhti hai, ride maangti hai (Idempotency-Key ke saath), aur push se driver ki location aur receipt paati hai.' },
        { id: 'api', label: 'API + fare', sub: 'estimate, rides', x: 215, y: 320, w: 120, kind: 'net', info: 'Ye kya hai: rider ki HTTP requests ka darwaaza. Estimate pe pickup hexagon ka surge multiplier padh ke upfront fare banata hai, aur ride request trip service ko deta hai.' },
        { id: 'trip', label: 'Trip svc', sub: 'state machine', x: 360, y: 320, w: 120, kind: 'server', info: 'Ye kya hai: ride ki zindagi sambhaalne wali service (demand side). Ride REQUESTED se PAID tak sirf allowed transitions se, har baar conditional write. Request ko Kafka pe bhi daalti hai (surge ke liye demand).' },
        { id: 'dis', label: 'Dispatch', sub: 'batch + ETA', x: 505, y: 320, w: 120, kind: 'server', info: 'Ye kya hai: matching ka dimaag (Uber ka purana naam DISCO). Geo index se candidates, ETA se ranking, kuch seconds ka batch, driver pe lock, ek driver ko ek offer timeout ke saath.' },
        { id: 'eta', label: 'ETA svc', sub: 'routing + ML', x: 650, y: 320, w: 120, kind: 'server', info: 'Ye kya hai: "driver ko road se kitne minute" batane wali service. Routing engine road graph pe base ETA, DeepETA model (2022 post) uspe correction.' },
        { id: 'tdb', label: 'Trip store', sub: 'Spanner (2021+)', x: 360, y: 440, w: 120, kind: 'data', info: 'Ye kya hai: rides aur drivers ki state ka strongly consistent, transactional database. 2021 se Uber ka fulfillment Google Cloud Spanner pe; pehle Schemaless, Cassandra, Redis jaise stores the.' },
        { id: 'evt', label: 'Trip events', sub: 'outbox → Kafka', x: 360, y: 560, w: 120, kind: 'queue', info: 'Ye kya hai: "ride r9 COMPLETED" jaise events ki stream, jo state ke saath hi likhi jaati hai (outbox/CDC). Payments aur push isse apni speed se padhte hain.' },
        { id: 'pay', label: 'Payments', sub: 'Gulfstream', x: 505, y: 560, w: 120, kind: 'server', info: 'Ye kya hai: paisa lene aur driver ko dene wala platform. Hold ko final charge banata hai. Double-entry ledger, immutable orders, unique order ID se exactly once (2020 post).' },
        { id: 'push', label: 'Push', sub: 'RAMEN', x: 215, y: 560, w: 120, kind: 'net', info: 'Ye kya hai: Uber ka push platform (2020 post). Polling ki jagah server khud rider/driver ke phone pe update bhejta hai: driver kahan hai, trip status, receipt.' },
      ],
      edges: [
        { a: 'drv', b: 'wsg' }, { a: 'wsg', b: 'loc' }, { a: 'loc', b: 'geo' },
        { a: 'loc', b: 'kf', kind: 'evt' }, { a: 'kf', b: 'fl', kind: 'evt' }, { a: 'fl', b: 'kv' },
        { a: 'api', b: 'kv', label: 'surge ×' },
        { a: 'rid', b: 'api' }, { a: 'api', b: 'trip' }, { a: 'trip', b: 'kf', kind: 'evt', label: 'requests' },
        { a: 'trip', b: 'dis' }, { a: 'dis', b: 'geo', label: 'k-ring' }, { a: 'dis', b: 'eta' },
        { a: 'dis', b: 'tdb', label: 'lock driver' }, { a: 'trip', b: 'tdb' },
        { a: 'dis', b: 'wsg', label: 'offer', via: [[440, 140], [280, 140]] },
        { a: 'tdb', b: 'evt', kind: 'evt', label: 'outbox / CDC' }, { a: 'evt', b: 'pay', kind: 'evt' }, { a: 'evt', b: 'push', kind: 'evt' },
        { a: 'push', b: 'rid', kind: 'res', label: 'receipt' },
      ],
      paths: [
        { name: 'Driver location', text: 'Driver app → WS gateway → location service (H3 cell nikaala) → geo index (RAM, TTL). Saath mein ping Kafka pe history ke liye.', go: ['drv>wsg>loc>geo', 'loc>kf'] },
        { name: 'Request ride', text: 'Rider app → API: pickup hexagon ka surge padh ke upfront fare. "Book" pe trip service ride ko REQUESTED state mein trip store mein likhti hai.', go: ['rid>api>kv', 'rid>api>trip>tdb'] },
        { name: 'Match', text: 'Dispatch: geo index se k-ring candidates, ETA service se road ETA, driver pe conditional-write lock, phir WS gateway se driver ko offer.', go: ['trip>dis>geo', 'dis>eta', 'dis>tdb', 'dis>wsg>drv'] },
        { name: 'Surge', text: 'Pings (supply) aur requests (demand) Kafka mein → Flink har window, har hexagon ka multiplier → Pricing KV → fare mein.', go: ['loc>kf>fl>kv', 'trip>kf', 'api>kv'] },
        { name: 'Trip end + payment', text: 'Trip COMPLETED aur event ek transaction mein → Kafka → payments hold ko final charge banata hai (exactly once) → push se rider ko receipt.', go: ['trip>tdb>evt>pay', 'evt>push>rid'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Do tarah ka data: location (bahut zyada, jaldi purana, thoda purana chalega) → RAM geo index + Kafka; trip, driver state aur paisa → strongly consistent store.</li>
      <li>10 lakh drivers ÷ 4 s = 2.5 lakh writes/s: isliye normal database nahi, in-memory index with TTL.</li>
      <li>H3 hexagons: lat/lng → cell ID, k-ring (1, 7, 19, 37... cells) se paas ke drivers; cell ID se sharding, hot cells ka plan.</li>
      <li>Matching: candidates cells se, ranking road ETA se, kuch seconds ka batch, ek driver ko ek offer + timeout, conditional write se lock.</li>
      <li>Ride ek state machine hai: sirf allowed transitions, versioned conditional writes, retries idempotent.</li>
      <li>Payments async: upfront fare, card pe hold, trip end event pe final charge, double-entry ledger, unique ID se exactly once.</li>
      <li>Surge: Kafka → Flink windows per hexagon → KV; freshness &gt; perfect accuracy; active-active regions.</li>
      <li>Uber ne component badle (S2 → H3, Ringpop → Spanner, Schemaless → Docstore): naam nahi, trade-offs yaad rakho.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['In-memory geo index: lakhon writes/s, millisecond nearby queries', 'Location aur trip data alag: har ek ko sahi consistency', 'Batched, ETA-based matching: shehar ka total wait kam', 'State machine + conditional writes: double assignment aur double charge nahi', 'Async payments via Kafka: trip end kabhi payment pe atakta nahi', 'Streaming surge: har hexagon ka price kuch seconds mein'],
      costs: ['Location RAM mein: node gire to kuch seconds ka data gaya (agla ping bhar deta hai)', 'Strongly consistent store: zyada latency, mehenga (Spanner)', 'Batching: har rider kuch seconds extra rukta hai', 'Surge late events chhod deta hai: thoda kam accurate', 'Active-active: compute double', 'Bahut saari moving parts: debugging aur on-call mushkil'] },

    { type: 'think', questions: [
      { q: 'Driver ka phone khada hai (signal pe, ya ride ka wait). Kya use har 4 second ping karna chahiye?', a: 'Zaroori nahi. Adaptive interval: hilte driver zyada baar, khade driver kam (sirf TTL refresh ke liye). Isse firehose ka load aur phone ki battery dono bachte hain. Lekin TTL ping interval se lamba hona chahiye, warna khade driver index se gaayab ho jaayenge.' },
      { q: 'Surge mein late events chhodna theek hai, to payment events mein kyun nahi?', a: 'Surge har kuch seconds mein naye window se dobara banta hai; ek window thoda galat hua to agla theek kar dega, aur galti ka asar chhota hai. Payment ek baar ka permanent record hai; event chhoda to paisa ya to kata nahi ya galat kata. Isliye payments ke liye lossless Kafka setup, retries, DLQ aur idempotency; surge ke liye throughput aur freshness.' },
      { q: 'Rider ne cancel dabaya aur usi second driver ne "arrived". Kya hona chahiye?', a: 'Dono conditional writes hain jo current state aur version check karte hain. Jo pehle commit hua wo jeeta. Agar arrived pehle hua to cancel ab ARRIVED se hai (state machine ke hisaab se allowed, shayad fee ke saath). Agar cancel pehle hua to arrived reject, aur driver app ko "ride cancelled" dikha do. Koi bhi in-between ajeeb state nahi banti.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Driver locations ke liye normal SQL table mein UPDATE kyun nahi?', options: ['SQL lat/lng store nahi kar sakta', 'Lakhon writes/second aur data kuch seconds mein purana: RAM ka geo index sasta aur fast hai', 'SQL mein indexes nahi hote'], answer: 1, explain: '10 lakh drivers / 4 s = 2.5 lakh writes/s. Sirf latest location chahiye, jo RAM mein fit hai; history Kafka pe.' },
      { q: 'Matching mein candidates ko kis se rank karna chahiye?', options: ['Seedhi (aerial) doori', 'Road ETA', 'Driver ki rating'], answer: 1, explain: 'Uber ka matching page khud kehta hai ki sabse paas hamesha sabse jaldi nahi: flyover, nadi, traffic. Geo index sirf candidates deta hai, rank ETA se.' },
      { q: 'Batched matching ka asli fayda kya hai?', options: ['Har rider ko hamesha sabse paas driver', 'Kuch seconds ki requests saath dekh ke shehar ka total wait kam', 'Servers ka CPU bachta hai'], answer: 1, explain: 'Widget ke pehle scenario mein greedy 16 min, batch 10 min. Kisi ek rider ko thoda zyada wait mil sakta hai, total kam hota hai.' },
      { q: 'Ek driver do riders ko assign na ho, iske liye sabse zaroori kya hai?', options: ['Bahut tez geo index', 'Supply state pe conditional write / transaction (available → offered)', 'Driver ko do offers bhej ke dekhna'], answer: 1, explain: 'Contention ka standard fix: sirf tab badlo jab state abhi bhi available ho. Haarne wala agla candidate le.' },
      { q: 'H3 mein rider ke cell ka k = 2 wala k-ring kitne cells ka hota hai?', options: ['7', '19', '12'], answer: 1, explain: 'Formula 1 + 3k(k+1): k = 1 pe 7, k = 2 pe 19, k = 3 pe 37. Widget mein k badha ke yahi ginti dikhti hai.' },
      { q: 'Ride request ke time card pe "pending" authorization hold kyun lagta hai?', options: ['Rider se do baar paisa lene ke liye', 'Pehle hi pata chal jaaye ki card chalega aur fraud ruke; trip ke baad hold hi final charge banta hai', 'Driver ko turant paisa dene ke liye'], answer: 1, explain: 'Uber ke page ke mutabik hold duplicate charge nahi hai. Trip ke baad wo final charge ban jaata hai, aur cancel pe hat jaata hai.' },
      { q: 'SIGMOD 2021 paper ke mutabik Uber ki surge pipeline kis cheez ko priority deti hai?', options: ['Har message ka exactly-once processing', 'Data freshness aur availability, consistency se upar', 'Raat ka batch job'], answer: 1, explain: 'Late messages chhod diye jaate hain, Kafka cluster throughput ke liye, aur regions mein active-active redundant Flink jobs.' },
    ]},

    { type: 'sources', note: 'Uber-specific hisse inhi sources se hain. Kai sources kuch saal purane hain; saal har item pe likha hai, aur jahan Uber ne baad mein component badla, wo lesson mein bataya hai. Napkin maths ke numbers "maan lo" wale hain.', items: [
      { title: 'How Uber Scales Their Real-Time Market Platform', publisher: 'High Scalability, summary of Matt Ranney\'s (Uber Chief Systems Architect) talk "Scaling Uber\'s Real-time Market Platform"', year: 2015, url: 'https://highscalability.com/how-uber-scales-their-real-time-market-platform/', used: 'Supply/demand/DISCO split, 4-second pings, S2 level-12 cells as shard key, 1M writes/s design goal, ETA over distance, matching drivers about to finish trips, Ringpop + SWIM, state digest on driver phones for DC failover.' },
      { title: 'Ringpop: Scalable, Fault-Tolerant Application-Layer Sharding', publisher: 'Uber Engineering blog', year: 2016, official: true, url: 'https://www.uber.com/blog/ringpop-open-source-nodejs-library/', used: 'Consistent hashing ring, SWIM gossip membership, handle-or-forward, use in geospatial/dispatch.' },
      { title: 'H3: Uber\'s Hexagonal Hierarchical Spatial Index', publisher: 'Uber Engineering blog', year: 2018, official: true, url: 'https://www.uber.com/blog/h3/', used: 'Bucketing marketplace events in hexagons, surge and dispatch use, equal neighbour distance, 16 resolutions, k-ring.' },
      { title: 'How does Uber match riders with drivers?', publisher: 'Uber marketplace page', official: true, url: 'https://www.uber.com/us/en/marketplace/matching/', used: 'Closest is not always quickest; early first-come matching; batched matching after a few seconds to reduce total wait.' },
      { title: 'How surge pricing works', publisher: 'Uber marketplace page', official: true, url: 'https://www.uber.com/us/en/marketplace/pricing/surge-pricing/', used: 'Surge as a relief valve, hyperlocal, tied to the size of the imbalance, frequent updates.' },
      { title: 'Real-time Data Infrastructure at Uber (Fu, Soman)', publisher: 'SIGMOD 2021 paper by Uber engineers', year: 2021, official: true, url: 'https://arxiv.org/abs/2104.00087', used: 'Surge as Kafka → Flink (ML) → KV per hexagon per window; freshness/availability over consistency; late messages dropped; active-active regions with redundant Flink; uReplicator; trillions of Kafka messages per day (as of Oct 2020).' },
      { title: 'Uber\'s Fulfillment Platform: Ground-up Re-architecture', publisher: 'Uber Engineering blog', year: 2021, official: true, url: 'https://www.uber.com/blog/fulfillment-platform-rearchitecture/', used: 'Old rt-demand/rt-supply with Ringpop, Cassandra/Redis and best-effort consistency; move to Google Cloud Spanner, statecharts, transaction coordinator, LATE.' },
      { title: 'Evolving Schemaless into a Distributed SQL Database (Docstore)', publisher: 'Uber Engineering blog', year: 2021, official: true, url: 'https://www.uber.com/blog/schemaless-sql-database/', used: 'Schemaless limits; Docstore on MySQL with Raft per partition, strict serializability per partition, transactions, CDC.' },
      { title: 'Project Mezzanine: The Great Migration', publisher: 'Uber Engineering blog', year: 2015, official: true, url: 'https://www.uber.com/blog/mezzanine-codebase-data-migration/', used: 'Trips outgrowing a single PostgreSQL in early 2014; migration to Schemaless.' },
      { title: 'DeepETA: How Uber Predicts Arrival Times Using Deep Learning', publisher: 'Uber Engineering blog', year: 2022, official: true, url: 'https://www.uber.com/blog/deepeta-how-uber-predicts-arrival-times/', used: 'Routing engine on road graph + ML residual, XGBoost before, linear transformer, few-ms latency, highest-QPS model, served via Michelangelo.' },
      { title: 'Uber\'s Real-Time Push Platform (RAMEN)', publisher: 'Uber Engineering blog', year: 2020, official: true, url: 'https://www.uber.com/blog/real-time-push-platform/', used: '80% of gateway requests were polling; SSE (2015) then gRPC (2019+); 1.5M concurrent connections, 250k+ messages/s.' },
      { title: 'Revolutionizing Money Movements at Scale with Strong Data Consistency', publisher: 'Uber Engineering blog', year: 2020, official: true, url: 'https://www.uber.com/blog/money-scale-strong-data/', used: 'Gulfstream: double-entry, immutable orders, deterministic IDs for exactly-once, orders processed asynchronously via topics.' },
      { title: 'Tables of Cell Statistics Across Resolutions', publisher: 'H3 official docs (h3geo.org)', official: true, url: 'https://h3geo.org/docs/core-library/restable/', used: 'Average hexagon area and edge length for resolutions 7-9, 7 children per hexagon, 16 resolutions (0-15).' },
      { title: 'What is an authorization hold?', publisher: 'Uber blog / help page', official: true, url: 'https://www.uber.com/en-GB/blog/what-is-an-authorization-hold/', used: 'Temporary hold at or after request, becomes the final charge, not a duplicate charge, removed on cancel.' },
      { title: 'Upfront fares: no math and no surprises', publisher: 'Uber Newsroom', year: 2016, official: true, url: 'https://www.uber.com/newsroom/upfront-fares-no-math-and-no-surprises', used: 'Exact fare shown before request from expected time, distance, traffic and demand; rolled out for uberX in 2016 incl. India; recalculated if the trip changes a lot.' },
    ]},
  ],
});
