Lesson.register({
  id: 'design-delivery',
  title: 'Zomato / Swiggy',
  minutes: 40,
  summary: `Teen taraf ka marketplace: customer, restaurant/store, aur delivery partner. Raat 8-10 baje ka bhaari peak, aur ek order jo kai services ke beech bahut saari states se guzarta hai. Serviceability (kaun deliver ho sakta hai), order state machine, payments, Kafka events, delivery partner assignment aur batching, aur live tracking: Swiggy aur Zomato ke engineers ne khud jo likha hai, uske hisaab se.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Tum phone pe Swiggy ya Zomato kholte ho. App ko turant batana hai ki tumhare ghar tak kaun kaun si dukaan cheez pahuncha sakti hai, aur kitne minute mein.<br>Order karte hi paisa kat-na chahiye (sirf ek baar!), dukaan ko khabar jaani chahiye, aur ek bike wale partner ko sahi waqt pe bhejna hai.<br>Phir tum map pe partner ko apne ghar ki taraf aate dekhte ho.<br>Ye sab raat 8-10 baje, jab poora shehar ek saath order karta hai, tab bhi chalna chahiye. Ye lesson yahi sikhata hai, ek-ek tukda zero se.` },
    { type: 'callout', tone: 'tip', title: 'Pehle khud try karo', html: `10 minute socho: customer app khole to 2,000 restaurants mein se kaun se dikhayein, aur har ek pe "32 min" kaise likhein? Order hone ke baad delivery partner ko <em>kab</em> bhejein? Payment ka jawaab na aaye to kya karein? Phir yahan compare karo.` },
    { type: 'p', html: `Ye ek <strong>case study</strong> hai. Swiggy (Swiggy Bytes blog) aur Zomato (Zomato engineering blog) ke engineers ne serviceability, delivery time prediction, assignment, batching, payments routing aur tracking pe kaafi likha hai; ye lesson unhi posts pe based hai, aur har jagah post ka saal likha hai (kai posts 2018-2023 ke hain, cheezein tab se badli hongi). Jo hisse public nahi hain (jaise unke order service ka exact database ya Kafka topics), wahan saaf bataya hai ki ye aam industry approach hai.` },
    { type: 'p', html: `Ye pichhle lessons ke blocks use karta hai: <a href="#/ds-for-scale">geohash</a>, <a href="#/kafka">Kafka</a>, <a href="#/distributed-tx">sagas</a>, <a href="#/pagination-idempotency">idempotency</a>, <a href="#/realtime">real-time push</a>, aur <a href="#/design-uber">Uber</a> wala matching. Uber se sabse bada farak: yahan beech mein ek <strong>teesri party</strong> (restaurant ya store) hai jiska kaam (khana banana, packing) time leta hai aur hamare control mein nahi. Ghabrao mat: in mein se har word ko is lesson mein dobara, zero se, samjhaayenge jab wo pehli baar kaam aayega.` },

    { type: 'h2', text: 'Step 0: bilkul zero se, sabse seedha version' },
    { type: 'p', html: `Koi bhi diagram banane se pehle ek kahani. Riya Bengaluru mein rehti hai. Wo app kholti hai, ek dukaan chunti hai, order karti hai, aur 30 minute mein saamaan aa jaata hai. Is kahani mein chaar kirdaar hain: <strong>Riya ka app</strong>, <strong>dukaan (restaurant/store) ka app</strong>, <strong>delivery partner ka app</strong>, aur beech mein <strong>hamara system</strong> (servers aur databases).` },
    { type: 'p', html: `Sabse seedha design ye hoga: ek server aur ek database. Server ek computer hai jo apps ke sawaal sunta hai aur jawab deta hai. Database wo jagah hai jahan saari dukaanein, orders aur partners likhe hain. Ab is seedhe design ko chaar kaam do aur dekho kahan tootta hai:` },
    { type: 'steps', items: [
      { t: 'Kaam 1: "mere paas kaun hai?"', d: 'Har app khulne pe server saari dukaanon ki list padhe aur har ek ki doori nikaale. Lakhon dukaanein, har minute lakhon visits: database thak jaayega. <strong>Iska ilaaj:</strong> map ko chhote dabbon (geohash, clusters) mein baanto taaki sirf paas wali dukaanein dekhni padein, aur baar baar ke calculations ko yaad rakho (cache). Step 4 mein.' },
      { t: 'Kaam 2: order aur paisa', d: 'Order banana, paisa katna, dukaan ko batana: koi ek step beech mein fail ho gaya to? Paisa kat gaya aur order nahi bana? <strong>Ilaaj:</strong> order ki har haalat (state) saaf likho (state machine), har request ka ek unique token (idempotency key), aur khabar baakiyon tak ek event stream (Kafka) se. Step 5 mein.' },
      { t: 'Kaam 3: kaunsa partner?', d: 'Sabse paas wale ko bhej do? Wo dukaan pe 10 minute khada rahega jab tak khana bane, aur doosre order ke liye koi nahi bachega. <strong>Ilaaj:</strong> predictions + sahi waqt pe bhejna (JIT) + do orders ek saath (batching). Deep dive 1 mein.' },
      { t: 'Kaam 4: map pe live partner', d: 'Har customer app har 2 second server se poochhe "partner kahan hai?" to server pe bekaar bojh. <strong>Ilaaj:</strong> server khud bataaye (push) ek khule connection pe (MQTT). Deep dive 3 mein.' },
    ]},
    { type: 'p', html: `Aur sabse upar: ye sab raat ke peak pe, jab load din se kai guna hota hai (Deep dive 4). Ek akela server ye sab nahi kar sakta, isliye system ko kai chhoti services mein baant-te hain. Pehle do basic words:` },
    { type: 'callout', tone: 'term', title: 'Naya word: Microservice', html: `<strong>Ye kya hai:</strong> ek chhota, alag program jo sirf ek kaam karta hai (jaise sirf payments, ya sirf partner dhoondhna) aur doosri services se network pe baat karta hai.<br><strong>Kyun chahiye:</strong> har hissa apni zaroorat ke hisaab se badhaya ja sakta hai. Listing pe crores calculations hain, payments pe kam; dono ko alag machines mil sakti hain. Alag teams alag services pe kaam kar sakti hain.<br><strong>Iske bina:</strong> ek bada program (monolith) jisme ek chhoti galti poora app gira sakti hai, aur listing badhane ke liye payments bhi badhane padte.<br><strong>Example:</strong> Swiggy ke 2021 post ke mutabik unke paas "hundreds of microservices" hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Cache', html: `<strong>Ye kya hai:</strong> tez memory mein rakhi hui ek copy, kisi aise jawab ki jo nikaalne mein mehenga tha. Jaise baar baar poochhe jaane wale sawaal ka jawab ek parchi pe likh ke jeb mein rakh lena.<br><strong>Kyun chahiye:</strong> "dukaan X se ghar Y tak road se kitne km?" har baar nikaalna slow aur mehenga hai. Ek baar nikaal ke yaad rakh lo.<br><strong>Iske bina:</strong> har app visit pe hazaaron mehenge calculations, app slow, aur bill bada. Detail <a href="#/caching">Caching lesson</a> mein.` },

    { type: 'h2', text: 'Step 1: requirements' },
    { type: 'callout', tone: 'term', title: 'Naya word: Three-sided marketplace', html: `<strong>Ye kya hai:</strong> ek platform jo <strong>teen</strong> alag groups ko milata hai: customer (order karta hai), merchant (restaurant ya store, order taiyaar karta hai), aur delivery partner (pahunchata hai).<br><strong>Kyun zaroori samajhna:</strong> har design faisla teeno pe asar daalta hai. Customer ko sahi time chahiye, merchant ko orders, partner ko kamai (zyada orders, kam khaali intezaar).<br><strong>Iske bina (sirf customer ka socho to):</strong> sabse paas wala partner bhej doge, wo dukaan pe khada rahega, uski kamai ghategi, aur partners app chhod denge. Phir customers ke liye bhi koi nahi bachega.` },
    { type: 'compare',
      left: { title: 'Functional', html: `• Location ke hisaab se deliver ho sakne wale restaurants/stores dikhao, har ek pe delivery time<br>• Menu, cart, checkout, payment<br>• Order place → restaurant accept → taiyaar → pickup → deliver<br>• Cancel (customer ya restaurant), refund<br>• Delivery partner assign karo, live tracking<br><br><strong>Out of scope:</strong> reviews, ads, restaurant onboarding` },
      right: { title: 'Non-functional', html: `• Home page/listing fast: kuch sau ms (sau restaurants ka calculation har request pe)<br>• Dinner peak sambhalo, raat mein scale down (paisa bachao)<br>• Delivery time ka promise sahi ho: na zyada, na kam<br>• Order aur payment kabhi khoye ya double na ho<br>• Ek service gire to poora app na gire` },
    },

    { type: 'h2', text: 'Step 2: napkin maths, asli load kahan hai?' },
    { type: 'p', html: `Napkin maths matlab kaagaz pe mote mote andaaze: kitna load, kahan. Ek word pehle: <strong>serviceability check</strong> = ek sawaal "kya ye dukaan is customer tak theek time mein pahuncha sakti hai?" (Step 4 mein poora samjhenge). Har app visit pe ye sawaal paas ki har dukaan ke liye poochha jaata hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: P99 latency', html: `<strong>Ye kya hai:</strong> 100 requests mein se sabse slow 1 ko chhod ke, baaki 99 jitne time mein khatam hoti hain, wo time. "P99 200 ms" = 99% requests 200 ms (0.2 second) ke andar.<br><strong>Kyun chahiye:</strong> average dhokha deta hai: average 50 ms ho sakta hai jabki har 100 mein se kai log 2 second wait kar rahe hon. P99 batata hai ki sabse naraaz users ka anubhav kaisa hai.<br><strong>Iske bina:</strong> hum sochte "sab fast hai" aur lakhon users ko slow app milti.` },
    { type: 'p', html: `Sabse hairaani ki baat: sabse bhaari kaam <strong>order hone se pehle</strong> hai. Swiggy ke 2021 post ke mutabik peak pe ~1 lakh app visits per minute maan lo aur har location ke aas paas ~2,000 restaurants/stores, to har minute ~20 crore serviceability evaluations, P99 200 ms ke andar. Orders ka number iske saamne chhota hai: news reports ke mutabik Zomato ne 31 Dec 2020 ko peak pe ~4,100 orders per minute dekhe. Baaki values "maan lo" hain. Badal ke dekho:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="dl-v">Peak app visits per minute (hazaar)</label><input id="dl-v" type="number" value="100" min="1" step="10"></div>
          <div><label for="dl-r">Paas ke restaurants/stores per visit</label><input id="dl-r" type="number" value="2000" min="10" step="100"></div>
          <div><label for="dl-o">Peak orders per minute</label><input id="dl-o" type="number" value="4000" min="10" step="100"></div>
          <div><label for="dl-e">Events per order (state changes, pings nahi)</label><input id="dl-e" type="number" value="10" min="1" step="1"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Serviceability evals/s</span><strong class="dl-o1"></strong></div>
          <div class="stat"><span>Orders/s</span><strong class="dl-o2"></strong></div>
          <div class="stat"><span>Order events/s (Kafka)</span><strong class="dl-o3"></strong></div>
          <div class="stat"><span>Evals per order</span><strong class="dl-o4"></strong></div>
        </div>
        <div class="calc-note dl-n"></div>`;
      const v = id => Math.max(0, Number(el.querySelector('#' + id).value) || 0);
      const f = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : n.toFixed(n < 10 ? 1 : 0);
      const upd = () => {
        const evals = v('dl-v') * 1e3 * v('dl-r') / 60, ops = v('dl-o') / 60, eps = ops * v('dl-e');
        el.querySelector('.dl-o1').textContent = f(evals) + '/s';
        el.querySelector('.dl-o2').textContent = f(ops) + '/s';
        el.querySelector('.dl-o3').textContent = f(eps) + '/s';
        el.querySelector('.dl-o4').textContent = f(evals / Math.max(ops, 0.001));
        el.querySelector('.dl-n').textContent = `Har order ke peeche ~${f(evals / Math.max(ops, 0.001))} serviceability calculations. Matlab dukaanein dikhane ka kaam (sirf padhna: read path) order banane ke kaam (likhna: write path) se kai hazaar guna bhaari hai. Isliye listing pe speed ke tareeke (cache, memory mein rakhe index), aur order pe sahi-pan (correctness) ke tareeke.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},

    { type: 'h2', text: 'Step 3: API aur core entities' },
    { type: 'p', html: `<strong>API</strong> = wo fixed sawaal jo app server se poochh sakta hai (jaise "mere paas ki dukaanein do"). <strong>Entities</strong> = wo cheezein jinka data hum rakhte hain (dukaan, order, payment...). Neeche har line ek API hai: <code>GET</code> = kuch padhna, <code>POST</code> = kuch karna/badalna. Kuch naye words (Idempotency-Key, MQTT) abhi bas naam hain; jab unka kaam aayega tab poora samjhayenge.` },
    { type: 'code', text: `
GET  /v1/listing?lat=12.97&lng=77.60          → [{ restaurant, eta: "32 min", fee, serviceable: true }, ...]
POST /v1/cart/checkout                        → { total, eta, deliveryFee }       # serviceability dobara check
POST /v1/orders   Idempotency-Key: 1b9e...    → 201 { orderId: "o42", state: "PAYMENT_PENDING" }
POST /v1/orders/o42/cancel                    → { state: "CANCELLED", refund: "initiated" }
# Restaurant tablet / app
POST /v1/merchant/orders/o42/accept | /ready
# Delivery partner app
POST /v1/dp/orders/o42/arrived | /picked-up | /delivered
# Customer tracking: persistent connection (MQTT / WebSocket), server push
SUB  orders/o42/track  → { state, dpLat, dpLng, eta }` },
    { type: 'table', head: ['Entity', 'Kya hai', 'Kahan (aam approach)'], rows: [
      ['Restaurant / Store', 'location, cluster, menu, open hours', 'SQL + search index + heavy cache (menu bahut padha jaata hai, kam badalta hai)'],
      ['Cart', 'items, customer', 'Fast KV (session jaisa)'],
      ['Order', 'items, amounts, state, restaurant, customer, DP', 'Transactional store (SQL); state machine'],
      ['Payment', 'order, amount, gateway, status, idempotency key', 'Transactional store, ledger'],
      ['Delivery partner (DP / DE)', 'status, current orders, latest location', 'Location in-memory/geo store; status transactional'],
      ['Assignment', 'order ↔ DP, earmarked/dispatched', 'Transactional (ek DP ko ek order do baar na mile)'],
    ]},
    { type: 'p', html: `Table ke teesre column ke words: <strong>SQL / transactional store</strong> = aisa database jo ek saath kai badlaav "sab ya kuch nahi" ki tarah karta hai (paisa aur order ke liye zaroori). <strong>Fast KV</strong> (key-value) = bahut tez, simple store jahan ek key se ek value milti hai (cart jaisi chhoti, temporary cheezein). <strong>Ledger</strong> = paise ka khaata jahan har entry sirf jodi jaati hai, kabhi mitaayi nahi jaati. <strong>Search index</strong> = naam ya jagah se tez dhoondhne ke liye ek alag copy.` },
    { type: 'callout', tone: 'term', title: 'Naya word: DE / DP', html: `<strong>Ye kya hai:</strong> Swiggy apne delivery partners ko <strong>Delivery Executive (DE)</strong> likhta hai, Zomato <strong>Delivery Partner (DP)</strong>. Dono ek hi cheez hain: bike pe order pahunchane wala insaan. Is lesson mein hum "partner" bolenge.<br><strong>Kyun chahiye:</strong> dono companies ke blogs padhoge to dono words milenge; ek hi matlab hai.` },

    { type: 'h2', text: 'Step 4: discovery, "kaun deliver ho sakta hai?"' },
    { type: 'p', html: `Swiggy ke 2018 post ki pehli line ka idea: delivery ka kaam order se shuru nahi hota, <strong>app khulte hi</strong> shuru hota hai. Pehli call delivery system ko jaati hai: kaun se restaurants is customer tak deliver ho sakte hain, aur har ek ka delivery time kya hoga. Swiggy ise <strong>serviceability</strong> kehta hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Serviceability', html: `<strong>Ye kya hai:</strong> ek sawaal ka jawab: "kya ye dukaan is customer ki location tak, theek-thaak time mein, deliver kar sakti hai?"<br><strong>Kyun chahiye:</strong> app pe sirf wahi dukaanein dikhni chahiye jo sach mein pahuncha sakein, aur har ek pe sahi time ("32 min").<br><strong>Iske bina:</strong> customer door ki dukaan chunega, order 70 minute mein aayega, ya cancel hoga.<br><strong>Andar kya kya:</strong> Swiggy ke Dec 2020 post ke mutabik is check mein shaamil hai: geo filter (paas kaun), asli road distance, aas paas ke partners pe dabaav (stress), delivery time ka prediction, surge fee, aur aakhir mein "dikhayein ya nahi" ka faisla.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"5 km ke circle ke andar ke saare restaurants dikha do." Swiggy ke post ke mutabik seedha circle (radial filter) mein <strong>direction</strong> nahi hai: nadi, highway ya one-way ke us paar ka 3 km wala restaurant asal mein 25 minute door ho sakta hai, aur Ahmedabad ke khaali road ka 4 km Bengaluru ke traffic ke 4 km jaisa nahi. Isliye Swiggy shehar ko <strong>clusters</strong> (polygons) mein baant-ta hai aur define karta hai ki kaunsa customer cluster kin restaurant clusters se jud sakta hai.` },
    { type: 'callout', tone: 'term', title: 'Naye words: cluster (polygon) aur point-in-polygon', html: `<strong>Ye kya hai:</strong> <strong>polygon</strong> = map pe kai kono wali band shakal (jaise ek mohalle ki boundary). Swiggy shehar ko aise polygons mein baant-ta hai, inhe <strong>clusters</strong> kehte hain. <strong>Point-in-polygon (PIP)</strong> = ek ganit ka check: "ye point (customer) is shakal ke andar hai ya bahar?"<br><strong>Kyun chahiye:</strong> cluster banane wale log nadi, flyover, traffic sab dekh ke tay karte hain ki "is mohalle se un mohallon tak delivery theek hai". Circle ye nahi samajhta.<br><strong>Iske bina:</strong> nadi ke us paar ki dukaanein dikhengi jo late aayengi, aur road se paas wali dukaanein chhoot jaayengi.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Geohash', html: `<strong>Ye kya hai:</strong> duniya ke map ko chhote chhote dabbon (cells) ki grid mein baant ke, har dabbe ko ek chhota naam dena, jaise <code>tdr1v</code>. Naam jitna lamba, dabba utna chhota. Level 7 ka dabba lagbhag 150 m ka, level 8 lagbhag 40 m × 20 m ka. Paas paas ki jagahon ke naam aksar same shuruaat wale hote hain.<br><strong>Kyun chahiye:</strong> "customer kis cluster mein hai?" ke liye saare polygons pe PIP chalaana mehenga hai. Pehle customer ka geohash nikaalo, phir sirf us dabbe ko chhoone wale 2-3 clusters pe PIP chalao. Swiggy ne yahi kiya (2021 post).<br><strong>Iske bina:</strong> har request pe shehar ke saikdon polygons check karne padte, aur P99 200 ms ka target toot jaata. Detail <a href="#/ds-for-scale">Data structures for scale</a> lesson mein.` },
    { type: 'p', html: `Khud dekho circle aur clusters ka farak. Ek nakli shehar hai (har dabba 1 km). Beech mein ek nadi hai jise sirf neeche wale pul se paar kar sakte ho. Har dukaan ke upar uska road time likha hai (5 min + 3 min per km, "maan lo"). Promise: 35 min.` },
    { type: 'custom', render(el) {
      // Toy city map: 1 cell = 1 km. Nadi (river) x = 6 km pe, pul (bridge) sirf neeche y = 5.8 km pe.
      const C = { x: 3.5, y: 2.5 }, RX = 6, BR = { x: 6, y: 5.8 }, PROMISE = 35, K = 40;
      const R = [[1.2, 0.8], [2.6, 4.1], [4.4, 1.6], [5.3, 3.4], [6.4, 1.6], [7.2, 1.2], [6.6, 5.2], [0.6, 5.4], [8.4, 4.8], [3.9, 5.5], [5.6, 0.5], [8.2, 2.6]];
      const road = (x, y) => x > RX ? Math.abs(C.x - BR.x) + Math.abs(C.y - BR.y) + Math.abs(BR.x - x) + Math.abs(BR.y - y) : Math.abs(C.x - x) + Math.abs(C.y - y);
      const mins = (x, y) => Math.round(5 + 3 * road(x, y));
      const air = (x, y) => Math.hypot(C.x - x, C.y - y);
      let mode = 'radial';
      el.innerHTML = `<div class="chips"><button type="button" class="chip on" data-m="radial">Circle (radial)</button><button type="button" class="chip" data-m="cluster">Clusters (road time)</button></div>
        <div class="dl-gr"><label for="dl-gr">Circle ka radius: <b class="dl-grv"></b> km</label><input id="dl-gr" type="range" min="2" max="5" step="0.5" value="4"></div>
        <svg viewBox="-6 -6 372 252" style="width:100%;max-width:520px;display:block;margin:10px 0" class="dl-gmap" role="img" aria-label="Toy city map"></svg>
        <div class="stats">
          <div class="stat"><span>Dukaanein dikhi</span><strong class="dl-g1"></strong></div>
          <div class="stat"><span>Dikhi par ${PROMISE} min se late</span><strong class="dl-g2"></strong></div>
          <div class="stat"><span>Pahuncha sakti thi, par chhoot gayi</span><strong class="dl-g3"></strong></div>
        </div>
        <div class="calc-note dl-gn"></div>`;
      const svg = el.querySelector('.dl-gmap');
      const draw = () => {
        const rad = Number(el.querySelector('#dl-gr').value);
        el.querySelector('.dl-grv').textContent = rad;
        el.querySelector('.dl-gr').style.display = mode === 'radial' ? '' : 'none';
        let s = '';
        for (let i = 0; i < 9; i++) for (let j = 0; j < 6; j++) {
          const ok = mode === 'cluster' && mins(i + 0.5, j + 0.5) <= PROMISE;
          const me = i === 3 && j === 2;
          s += `<rect x="${i * K}" y="${j * K}" width="${K}" height="${K}" fill="${me ? 'var(--accent-soft)' : ok ? 'var(--surface-2)' : 'none'}" stroke="var(--line)" stroke-width="1"/>`;
        }
        s += `<rect x="${RX * K - 5}" y="0" width="10" height="240" fill="var(--accent)" opacity="0.35"/><rect x="${RX * K - 9}" y="${BR.y * K - 5}" width="18" height="10" fill="var(--ink-3)"/>`;
        s += `<text x="${RX * K + 8}" y="14" font-size="11" fill="var(--ink-2)">nadi</text><text x="${RX * K + 12}" y="${BR.y * K - 8}" font-size="11" fill="var(--ink-2)">pul</text>`;
        if (mode === 'radial') s += `<circle cx="${C.x * K}" cy="${C.y * K}" r="${rad * K}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="6 4"/>`;
        let shown = 0, late = 0, missed = 0;
        R.forEach(([x, y], k) => {
          const m = mins(x, y), vis = mode === 'radial' ? air(x, y) <= rad : m <= PROMISE;
          if (vis) { shown++; if (m > PROMISE) late++; } else if (m <= PROMISE) missed++;
          const col = !vis ? 'var(--ink-3)' : m > PROMISE ? 'var(--red)' : 'var(--green)';
          s += `<circle cx="${x * K}" cy="${y * K}" r="${vis ? 8 : 5}" fill="${col}" opacity="${vis ? 1 : 0.5}"/><text x="${x * K}" y="${y * K - 11}" font-size="10" text-anchor="middle" fill="var(--ink-2)">${m}m</text>`;
        });
        s += `<circle cx="${C.x * K}" cy="${C.y * K}" r="7" fill="var(--ink)"/><text x="${C.x * K}" y="${C.y * K + 20}" font-size="11" text-anchor="middle" fill="var(--ink)">Riya</text>`;
        svg.innerHTML = s;
        el.querySelector('.dl-g1').textContent = shown;
        el.querySelector('.dl-g2').textContent = late;
        el.querySelector('.dl-g3').textContent = missed;
        el.querySelector('.dl-gn').textContent = mode === 'radial'
          ? `Circle sirf hawa ki doori dekhta hai. ${late} dukaan(ein) nadi ke us paar hain: circle ke andar, par pul se ghoom ke ${PROMISE} min se zyada. Aur ${missed} dukaan(ein) circle ke bahar hain jabki road se jaldi pahunch sakti thi.`
          : `Ab sirf wo dabbe (clusters) jude hain jahan se road ka time ${PROMISE} min ke andar hai (halke rang wale). ${shown} dukaanein dikhi, ${late} late, ${missed} chhooti. Direction (nadi, pul) apne aap gin li gayi.`;
      };
      el.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => { mode = b.dataset.m; el.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === b)); draw(); }));
      el.querySelector('#dl-gr').addEventListener('input', draw); draw();
    }},
    { type: 'p', html: `Default (4 km circle) pe: 8 dukaanein dikhti hain, jinme se 2 nadi ke paar hain aur 36-40 min lengi, aur 3 jo 22-33 min mein pahuncha sakti thi, wo circle ke bahar hone se chhoot gayi. Clusters mode mein 9 dukaanein dikhti hain aur ek bhi late nahi. Yahi Swiggy ka sabak hai: doori nahi, <strong>road ka time</strong> maayne rakhta hai.` },
    { type: 'callout', tone: 'term', title: 'Naye words: road distance, OpenStreetMap, A*', html: `<strong>Ye kya hai:</strong> hawa ki seedhi doori nahi, asli sadkon pe chal ke doori. Iske liye ek road map chahiye: <strong>Google Directions</strong> (paid service) ya <strong>OpenStreetMap (OSM)</strong> (free, logon ka banaya duniya ka map). <strong>A*</strong> ("A-star") ek algorithm hai jo is road map pe sabse chhota raasta dhoondhta hai; Swiggy dono taraf se ek saath search chalata hai (bidirectional), taaki jaldi mile.<br><strong>Kyun chahiye:</strong> widget mein dekha: hawa ki doori jhooth bolti hai.<br><strong>Iske bina:</strong> galat ETA, galat dukaanein. Lekin ye calculation mehenga hai, isliye iska jawab <strong>cache</strong> karte hain (neeche ka diagram).` },
    { type: 'callout', tone: 'term', title: 'Naya word: Stress (aur uski state machine)', html: `<strong>Ye kya hai:</strong> ek area (zone) mein orders kitne hain aur free partners kitne, iska naap. Swiggy ise kuch levels mein rakhta hai (normal, high...) aur level ek tay niyam se hi badalta hai. Aise "kuch fixed haalaton aur unke beech ke niyamon" wale model ko <strong>finite state machine (FSM)</strong> kehte hain; order ke liye bhi yahi idea Step 5 mein aayega.<br><strong>Kyun chahiye:</strong> baarish ya festival pe orders achanak badhte hain, partners nahi. Stress system baaki systems ko bolta hai: "dheere chalo, door ki dukaanein abhi mat dikhao".<br><strong>Iske bina:</strong> har order le liya jaayega aur saare orders late honge.` },
    { type: 'flow', title: 'Listing: serviceability check', height: 330,
      nodes: [
        { id: 'app', label: 'Customer app', sub: 'home / listing', x: 85, y: 170, w: 130, kind: 'client', info: 'Ye kya hai: customer ke phone ki app. Is design mein: home page, listing, search, menu aur checkout, sab pe ye serviceability check maangti hai (Swiggy 2021 post).' },
        { id: 'list', label: 'Listing API', sub: 'rank + promos', x: 255, y: 170, w: 140, kind: 'server', info: 'Ye kya hai: wo service jo home page ki list banati hai. Serviceable dukaanein leke unhe order mein lagati hai (ranking), offers aur collections jodti hai. Swiggy 2021 post ke mutabik har service ka P99 budget ~50 ms tak ho sakta hai, kyunki ek page ke liye kai services ek saath chalti hain.' },
        { id: 'svc', label: 'Serviceability', sub: 'filter, ETA, fee', x: 440, y: 170, w: 150, kind: 'server', info: 'Ye kya hai: "kaun deliver kar sakta hai, kitne time mein" ka jawab dene wali service. Ye geo filter, distance, time prediction, stress aur surge fee ko jod ke har dukaan pe faisla karti hai. Har request pe ~2,000 dukaanon ke liye.' },
        { id: 'geo', label: 'Geo filter', sub: 'geohash → clusters', x: 630, y: 60, w: 150, kind: 'cache', info: 'Ye kya hai: "customer kis cluster mein hai, aur us cluster se kaunse dukaan-clusters jude hain?" ka jawab. Har polygon pe point-in-polygon check mehenga hai, isliye Swiggy ne geohash se clusters ka memory mein rakha index banaya: pehle geohash se 2-3 candidate clusters, phir unpe hi PIP check.' },
        { id: 'dist', label: 'Distance svc', sub: 'cached road dist', x: 630, y: 170, w: 150, kind: 'cache', info: 'Ye kya hai: dukaan se customer tak road ki doori batane wali service. Source Google Directions ya OpenStreetMap (OSM pe bidirectional A* search). Dono mehenge, isliye (dukaan ka geohash, customer ka geohash) jodi ko key bana ke jawab cache karti hai.' },
        { id: 'stress', label: 'Stress system', sub: 'zone ka FSM', x: 630, y: 280, w: 150, kind: 'server', info: 'Ye kya hai: har zone ke partners pe kitna dabaav hai, ye batane wala system (orders vs free partners, baarish, festival). Swiggy ise ek finite state machine ki tarah chalata hai: stress levels = states. Stress badhe to doosre systems ko kaam halka karne (degrade) ko bolta hai.' },
      ],
      edges: [{ a: 'app', b: 'list' }, { a: 'list', b: 'svc' }, { a: 'svc', b: 'geo' }, { a: 'svc', b: 'dist' }, { a: 'svc', b: 'stress' }],
      scenarios: [
        { name: 'Listing (happy)', steps: [
          { title: 'App khula', text: 'Customer ki location ke saath listing request.', go: 'app>list>svc', msg: 'GET /v1/listing?lat=12.97&lng=77.60' },
          { title: 'Geo filter', text: 'Geohash se customer ka cluster, phir us cluster se jude restaurant clusters, phir unke restaurants. ~2,000 candidates.', go: ['svc>geo', 'res:geo>svc'], msg: 'geohash → cluster C17 → 2,140 restaurants' },
          { title: 'Distance + time', text: 'Har candidate ki road distance cache se, phir delivery time prediction. Jo bahut door/late, wo bahar.', go: ['svc>dist', 'res:dist>svc'], msg: 'r12: 3.1 km, 31 min | r40: 7.9 km, 58 min ✗' },
          { title: 'Stress check', text: 'Zone normal hai, koi extra fee nahi.', go: ['svc>stress', 'res:stress>svc'], after: { stress: { state: 'ok', sub: 'level: normal' } } },
          { title: 'Listing', text: 'Serviceable list rank hoke app ko. Ye sab kuch sau ms mein.', go: 'res:svc>list>app', msg: '[{ r12, "31 min" }, { r7, "24 min" }, ...]' },
        ]},
        { name: 'Baarish: stress high', steps: [
          { title: 'Baarish shuru', text: 'Orders badhe, kai partners ruk gaye. Stress system ne zone ko high stress state mein daala.', set: { stress: { state: 'hot', sub: 'level: high' } }, focus: ['stress'] },
          { title: 'Graceful degradation', text: 'Swiggy 2020 post ke mutabik stress mein serviceability lambe last-mile ya zyada delivery time wale orders lena band karti hai, aur surge fee lag sakti hai. Customer ko kam restaurants dikhte hain, lekin jo dikhte hain wo time pe aate hain.', go: ['app>list>svc', 'svc>stress', 'res:stress>svc'], set: { svc: { state: 'warn', sub: 'radius chhota' } } },
          { title: 'Kyun?', text: 'Fleet minute mein nahi badh sakta, demand badh sakti hai. Har order le liya to sab late. Overbooking se behtar hai thoda kam lena.', go: 'res:svc>list>app', msg: 'kam restaurants + "baarish fee"' },
        ]},
        { name: 'Geo index fail', steps: [
          { title: 'Index kharab', text: 'Geohash index / in-memory cache mein gadbad, ya customer ki location kisi defined cluster mein nahi.', set: { geo: { state: 'down', sub: 'index error' } }, go: ['svc>geo', 'bad:geo>svc'] },
          { title: 'Radial fallback', text: 'Swiggy 2021 post: aise mein system seedhe circle wale (radial) geo filter pe fallback karta hai. Kam accurate, lekin app khaali nahi dikhta.', set: { svc: { state: 'warn', sub: 'radial mode' } }, go: ['svc>dist', 'res:dist>svc'] },
          { title: 'Listing phir bhi aayi', text: 'Degraded, lekin kaam karti hui. Ye "fail soft" design hai.', go: 'res:svc>list>app' },
        ]},
        { name: 'Distance cache miss', steps: [
          { title: 'Naya pair', text: 'Naye area ka customer, uska geohash pair cache mein nahi.', go: ['svc>dist'], set: { dist: { state: 'miss', sub: 'miss' } } },
          { title: 'Mehenga calculation', text: 'OSM graph pe A* search ya Google API call: dono slow ya mehenge. Hazaaron pairs ke liye har request pe ye kar nahi sakte.', focus: ['dist'], msg: 'A* on India road graph …' },
          { title: 'Cache ka design', text: 'Swiggy ne geohash level 8 ko kaafi accurate paaya, lekin saare L8 pairs sau arabon keys ho jaate. Isliye sirf zyada order wale pairs L8 pe, baaki level 7 (sasta, thoda kam accurate). TTL aur memory limits ke saath.', go: 'res:dist>svc', after: { dist: { state: 'ok', sub: 'L7/L8 cache' } } },
        ]},
      ],
    },

    { type: 'h3', text: '"32 min" kahan se aata hai? Delivery time equation' },
    { type: 'callout', tone: 'term', title: 'Naye words: ETA aur prediction model', html: `<strong>Ye kya hai:</strong> <strong>ETA</strong> (Estimated Time of Arrival) = "kitni der mein pahunchega" ka andaaza. <strong>Prediction model</strong> (ML model) = ek program jo lakhon purane orders ke data se seekhta hai aur naye order ke liye andaaza lagata hai, jaise "is dukaan pe ye 3 items banne mein ~14 min".<br><strong>Kyun chahiye:</strong> app pe dikhaana hai "32 min", aur partner kab bhejna hai ye bhi isi se tay hota hai.<br><strong>Iske bina:</strong> ya to sab pe ek fixed "40 min" (kabhi jhooth, kabhi bahut zyada), ya partner galat waqt pe pahunchega.` },
    { type: 'p', html: `Swiggy ke 2018 post ne delivery time ko ek seedhe formula mein likha. Order hote hi do kaam <strong>saath saath</strong> chalte hain: restaurant khana banata hai, aur system partner dhoondh ke restaurant bhejta hai. Isliye dono mein se jo lamba ho, wahi ginta hai:` },
    { type: 'code', text: `Delivery time = max( assignment delay + first mile ,  prep time ) + last mile

assignment delay : order se partner assign hone tak
first mile       : partner ka restaurant tak pahunchna
prep time        : restaurant ka khana taiyaar karna
last mile        : restaurant se customer ke darwaaze tak` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="dl-ad">Assignment delay: <b class="dl-adv"></b> min</label><input id="dl-ad" type="range" min="0" max="15" step="1" value="0"></div>
          <div><label for="dl-fm">First mile: <b class="dl-fmv"></b> min</label><input id="dl-fm" type="range" min="1" max="20" step="1" value="5"></div>
          <div><label for="dl-pt">Prep time: <b class="dl-ptv"></b> min</label><input id="dl-pt" type="range" min="2" max="40" step="1" value="15"></div>
          <div><label for="dl-lm">Last mile: <b class="dl-lmv"></b> min</label><input id="dl-lm" type="range" min="3" max="30" step="1" value="12"></div>
        </div>
        <div class="dl-bar" style="margin:12px 0"></div>
        <div class="stats">
          <div class="stat"><span>Delivery time</span><strong class="dl-t"></strong></div>
          <div class="stat"><span>Partner wait at restaurant</span><strong class="dl-w"></strong></div>
          <div class="stat"><span>Bottleneck</span><strong class="dl-b"></strong></div>
        </div>
        <div class="calc-note dl-tn"></div>`;
      const g = id => Number(el.querySelector('#' + id).value);
      const seg = (w, total, color, label) => !w ? '' : `<div style="flex:0 0 ${(100 * w / total).toFixed(2)}%;background:${color};color:var(--ink);font-size:12px;padding:4px 2px;text-align:center;overflow:hidden;white-space:nowrap;border-right:1px solid var(--bg)">${w ? label : ''}</div>`;
      const upd = () => {
        const ad = g('dl-ad'), fm = g('dl-fm'), pt = g('dl-pt'), lm = g('dl-lm');
        ['ad', 'fm', 'pt', 'lm'].forEach(k => { el.querySelector('.dl-' + k + 'v').textContent = g('dl-' + k); });
        const reach = ad + fm, pick = Math.max(reach, pt), total = pick + lm, wait = Math.max(0, pt - reach), late = Math.max(0, reach - pt);
        const T = Math.max(total, 1);
        el.querySelector('.dl-bar').innerHTML = `<div style="font-size:12px;color:var(--ink-2);margin-bottom:4px">Partner ki timeline</div><div style="display:flex;border:1px solid var(--line);border-radius:var(--r-sm);overflow:hidden">${seg(ad, T, 'var(--surface-2)', 'assign')}${seg(fm, T, 'var(--accent-soft)', 'first mile')}${seg(wait, T, 'var(--amber)', 'wait')}${seg(lm, T, 'var(--accent-soft)', 'last mile')}</div>
          <div style="font-size:12px;color:var(--ink-2);margin:8px 0 4px">Restaurant ki timeline</div><div style="display:flex;border:1px solid var(--line);border-radius:var(--r-sm);overflow:hidden">${seg(pt, T, 'var(--surface-2)', 'prep')}${seg(late, T, 'var(--red)', 'khana thanda')}${seg(lm, T, 'transparent', '')}</div>`;
        el.querySelector('.dl-t').textContent = total + ' min';
        el.querySelector('.dl-w').textContent = wait + ' min';
        el.querySelector('.dl-b').textContent = pt > reach ? 'Kitchen' : pt < reach ? 'Partner' : 'Barabar';
        el.querySelector('.dl-tn').textContent = wait > 0
          ? `Partner ${wait} min restaurant pe khada rahega. Agar assignment ko ${wait} min der se karein (ya partner ko earmark karke der se bhejein), delivery time phir bhi ${total} min rahega aur partner un ${wait} min mein koi aur kaam kar sakta hai. Yahi "Just-in-time" assignment ka idea hai.`
          : late > 0 ? `Khana ${late} min pehle taiyaar hai aur partner ka wait kar raha hai: khana thanda, customer ko late. Yahan partner jaldi dhoondhna (assignment delay kam) sabse zaroori hai.`
          : `Partner aur khana ek hi waqt pe taiyaar: perfect timing, koi waste nahi.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Default values Swiggy ke 2019 post ka example hain: khana 15 min mein, partner 5 min mein pahunch jaata hai, to partner 10 min khada rahega. Din bhar ke ye 10-10 minute jud ke har partner ke orders per day kam kar dete hain. Har term ek prediction hai, aur har ek ka galat hona alag nuksaan karta hai: prep time zyada aanka to khana pada pada thanda, first mile kam aanka to order late.` },

    { type: 'h2', text: 'Step 5: order ek state machine hai' },
    { type: 'callout', tone: 'term', title: 'Naya word: State machine', html: `<strong>Ye kya hai:</strong> kisi cheez ki kuch fixed haalatein (states) aur ek list ki kaunsi haalat se kaunsi haalat mein ja sakte hain (transitions). Jaise traffic light: laal → hara → peela → laal. Laal se seedha peela nahi.<br><strong>Kyun chahiye:</strong> order ko 5 alag log/systems chhoote hain. Niyam saaf ho to galat kram ki request (jaise payment se pehle "delivered") seedha reject ho jaati hai.<br><strong>Iske bina:</strong> order "delivered" bhi aur "cancelled" bhi, ek saath. Refund bhi gaya aur partner ko paisa bhi. Support team ka sir dard.` },
    { type: 'p', html: `Order ko customer, restaurant, partner, payments aur support sab chhoote hain. Isliye order ki state ek <strong>state machine</strong> se hi badalti hai (ye idea <a href="#/design-uber">Uber lesson</a> mein widget ke saath dekha). Swiggy ke 2019 delivery partner app post ke mutabik partner app bhi har delivery flow ke liye ek finite state machine maanta hai.` },
    { type: 'ascii', text: `
PAYMENT_PENDING ──paid──> PLACED ──accept──> ACCEPTED ──> PREPARING ──ready──> READY ──pickup──> PICKED_UP ──> DELIVERED
      │                     │                  │             │                   │
      │ fail/timeout        │ reject           │             │                   │   (partner side, saath saath:
      v                     v                  v             v                   v    assigned → arrived → picked up)
   FAILED            CANCELLED + refund   CANCELLED + refund (kis stage pe cancel hua, uske hisaab se policy/fee)` },
    { type: 'p', html: `Khud chala ke dekho. Har button ek event hai (kisi ne kuch kiya). Gehre rang wale buttons abhi allowed hain. Har sahi transition ek "event" Kafka pe bhejta hai (Kafka = sabko khabar dene wali line, neeche poora samjhaya hai). Galat kram mein dabao to machine mana kar degi. "Wahi event dobara" network retry jaisa hai: same event ID dobara aaya.` },
    { type: 'custom', render(el) {
      // Order state machine: sirf allowed transitions chalte hain. Har sahi transition = ek event (Kafka pe).
      const ST = ['PAYMENT_PENDING', 'PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'PICKED_UP', 'DELIVERED', 'FAILED', 'CANCELLED'];
      const TR = {
        PAYMENT_PENDING: { pay_ok: 'PLACED', pay_fail: 'FAILED', cancel: 'CANCELLED' },
        PLACED: { accept: 'ACCEPTED', reject: 'CANCELLED', cancel: 'CANCELLED' },
        ACCEPTED: { prep: 'PREPARING', cancel: 'CANCELLED' },
        PREPARING: { ready: 'READY', cancel: 'CANCELLED' },
        READY: { pickup: 'PICKED_UP' },
        PICKED_UP: { deliver: 'DELIVERED' },
      };
      const EV = [['pay_ok', 'Payment success'], ['pay_fail', 'Payment fail'], ['accept', 'Dukaan: accept'], ['reject', 'Dukaan: reject'], ['prep', 'Banana shuru'], ['ready', 'Ready'], ['pickup', 'Partner: picked up'], ['deliver', 'Partner: delivered'], ['cancel', 'Customer: cancel']];
      const NOTE = { reject: 'refund shuru (saga ka ulta kadam)', cancel: 'refund/fee policy ke hisaab se', pay_fail: 'customer ko dobara try ka option' };
      let state, seen, last, log, pub;
      const reset = () => { state = 'PAYMENT_PENDING'; seen = new Set(); last = null; log = []; pub = 0; draw(); };
      el.innerHTML = `<div class="dl-sm-st" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px"></div>
        <div class="dl-sm-btn" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px"><button type="button" class="btn small ghost dl-sm-dup">Wahi event dobara (retry)</button><button type="button" class="btn small ghost dl-sm-rst">Reset</button></div>
        <div class="stats"><div class="stat"><span>Abhi ki state</span><strong class="dl-sm-cur" style="font-size:15px;word-break:break-all"></strong></div><div class="stat"><span>Kafka pe events</span><strong class="dl-sm-pub"></strong></div></div>
        <div class="calc-note dl-sm-log" style="font-family:var(--f-mono);font-size:12px"></div>`;
      const fire = (ev, id) => {
        if (seen.has(id)) { log.unshift(`↺ ${ev} (id ${id}) pehle hi ho chuka: ignore. Kuch double nahi hua.`); return draw(); }
        const nx = (TR[state] || {})[ev];
        if (!nx) { log.unshift(`✗ ${ev}: ${state} se ye allowed nahi. Reject, state wahi.`); return draw(); }
        seen.add(id); last = [ev, id]; pub++;
        log.unshift(`✓ ${state} → ${nx}  | event "order.${nx.toLowerCase()}" Kafka pe${NOTE[ev] ? ' | ' + NOTE[ev] : ''}`);
        state = nx; draw();
      };
      let n = 0;
      const draw = () => {
        el.querySelector('.dl-sm-st').innerHTML = ST.map(s => `<span class="chip${s === state ? ' on' : ''}" style="cursor:default">${s}</span>`).join('');
        el.querySelector('.dl-sm-cur').textContent = state;
        el.querySelector('.dl-sm-pub').textContent = pub;
        el.querySelector('.dl-sm-log').innerHTML = log.slice(0, 6).join('<br>') || 'Koi event dabao. Galat kram mein bhi try karo (jaise pehle "Partner: delivered").';
        el.querySelectorAll('.dl-sm-btn button').forEach(b => { b.classList.toggle('primary', !!(TR[state] || {})[b.dataset.e]); });
      };
      el.querySelector('.dl-sm-btn').innerHTML = EV.map(([e, l]) => `<button type="button" class="btn small" data-e="${e}">${l}</button>`).join('');
      el.querySelectorAll('.dl-sm-btn button').forEach(b => b.addEventListener('click', () => fire(b.dataset.e, 'e' + (++n))));
      el.querySelector('.dl-sm-dup').addEventListener('click', () => { if (last) fire(last[0], last[1]); });
      el.querySelector('.dl-sm-rst').addEventListener('click', reset);
      reset();
    }},
    { type: 'p', html: `Sahi kram (Payment success → accept → banana shuru → Ready → picked up → delivered) mein 6 events Kafka pe jaate hain aur order DELIVERED. Shuru mein hi "Partner: delivered" dabao to reject. Retry wala button kitni bhi baar dabao, events ki ginti nahi badhti: yahi <strong>idempotent</strong> transition hai (neeche samjhaya hai).` },
    { type: 'table', head: ['Stage / leg', 'Kaun badalta hai', 'Public source mein kya'], rows: [
      ['Ordered → Assigned (O2A)', 'Assignment engine', 'Swiggy 2023 tracking ETA post: order journey ke 4 legs ke liye 4 alag models: O2A, First Mile, Wait Time, Last Mile.'],
      ['Assigned → Arrived (First Mile)', 'Partner app (location pings)', 'Same post: assigned stage model partner ki live pings use karta hai.'],
      ['Arrived → Picked up (Wait Time)', 'Restaurant + partner', 'Restaurant ka stress, live orders, items count features hain.'],
      ['Preparing → Ready', 'Restaurant app', 'Zomato (2020): restaurant partner app mein "Food Order Ready" button jodha, taaki asli prep time pata chale.'],
      ['Picked up → Delivered (Last Mile)', 'Partner app', 'Zomato DP-ETA (2022): pickup se drop-zone geofence tak, aur geofence se handover tak alag predict.'],
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: Geofence', html: `<strong>Ye kya hai:</strong> map pe ek invisible boundary (circle ya polygon). Partner us boundary ke andar aaya to app/server ko event milta hai, jaise "customer ke building ke paas pahunch gaya".<br><strong>Kyun chahiye:</strong> "arrived" jaisi states apne aap mark ho jaati hain, aur ETA ke liye pata chalta hai ki aakhri hissa (building dhoondhna, lift, gate) kab shuru hua.<br><strong>Iske bina:</strong> partner ko har baar button dabana padta (bhool jaaye to data galat), aur aakhri minutes ka andaaza kamzor.` },

    { type: 'h3', text: 'Order place karna: payments aur events' },
    { type: 'p', html: `Order, payment aur restaurant, partner, customer ko khabar: ye sab ek database transaction mein nahi ho sakta (payment gateway bahar ki company hai). Aam industry approach: order service apni state transactionally likhe aur ek event chhode; baaki services Kafka se padhein. Swiggy ke 2022 incident post ke mutabik unka order fulfilment journey ek Kafka cluster pe 50 se zyada services ko jodta hai (exact topics public nahi). Is raaste ke chaar naye words pehle:` },
    { type: 'callout', tone: 'term', title: 'Naya word: Idempotency key', html: `<strong>Ye kya hai:</strong> har "Place order" request ke saath app ek unique random token bhejti hai (jaise <code>1b9e…</code>). Server yaad rakhta hai: is token ka order ban chuka hai to dobara nahi banata, pehle wala hi lauta deta hai.<br><strong>Kyun chahiye:</strong> customer ne do baar tap kiya, ya network ne jawab kho diya aur app ne retry kiya. Server ko ek hi request do baar milti hai.<br><strong>Iske bina:</strong> do orders, do baar paisa. Detail <a href="#/pagination-idempotency">Idempotency lesson</a> mein.` },
    { type: 'callout', tone: 'term', title: 'Naye words: event, Kafka, topic', html: `<strong>Ye kya hai:</strong> <strong>event</strong> = ek chhota sandesh "ye ho gaya" (jaise "order o42 PLACED"). <strong>Kafka</strong> = ek bahut bada, tikau register jisme services events likhti hain aur doosri services apni speed se padhti hain. Events <strong>topics</strong> (alag register, jaise "order-events") mein jaate hain; har topic kai <strong>partitions</strong> (hisson) mein bata hota hai taaki kai machines saath kaam karein.<br><strong>Kyun chahiye:</strong> order service ko dukaan, assignment, notification, analytics, sabko alag alag call nahi karna padta. Ek event likha, sabne padh liya. Koi service slow ya band ho to baad mein padh legi.<br><strong>Iske bina:</strong> order service 10 services ko call karegi; ek bhi slow hui to customer ka "Place order" atak jaayega. Detail <a href="#/kafka">Kafka lesson</a> mein.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Outbox pattern', html: `<strong>Ye kya hai:</strong> order service order ki nayi state aur "bhejna hai" wala event, dono ek hi database transaction mein apne DB mein likhti hai (event ek "outbox" table mein). Ek alag chhota process outbox se events utha ke Kafka pe daalta hai.<br><strong>Kyun chahiye:</strong> DB mein likha aur Kafka pe bhejne se pehle server crash ho gaya, to event kho jaata. Outbox mein event DB ke saath safe hai.<br><strong>Iske bina:</strong> order PLACED hai lekin dukaan ko kabhi khabar nahi gayi. Customer intezaar karta reh gaya.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Saga (compensation)', html: `<strong>Ye kya hai:</strong> kai services mein phaile kaam ko chhote kadmon mein karna, jahan har kadam ka ek "ulta kadam" (compensation) tay hota hai. Order cancel hua to ulta kadam = refund.<br><strong>Kyun chahiye:</strong> payment gateway aur dukaan hamare database ka hissa nahi, to ek transaction se "sab undo" nahi ho sakta.<br><strong>Iske bina:</strong> order cancel, lekin paisa kata hua. Detail <a href="#/distributed-tx">Distributed transactions</a> lesson mein.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Payment gateway (PG)', html: `<strong>Ye kya hai:</strong> bahar ki company (payment service provider) jo app aur bank, card network ya UPI ke beech paisa le jaane ka kaam karti hai.<br><strong>Kyun chahiye:</strong> hum khud har bank se nahi jud sakte; PG ye kaam karta hai.<br><strong>Iske bina:</strong> online payment hi nahi.<br><strong>Extra:</strong> Swiggy ke 2022 post ke mutabik har payment method (card, UPI, net banking, wallet) ke kai PGs hote hain. Ek ML model (pichhle data se seekh ke andaaza lagane wala program) har transaction ko us PG pe bhejta hai jiska success rate abhi sabse achha ho. Jab koi PG ka jawab late aaye, wo baad mein khud hamare server ko bata deta hai; is "ulti call" ko <strong>webhook</strong> kehte hain.` },

    { type: 'flow', title: 'Order place → payment → events', height: 340,
      nodes: [
        { id: 'app', label: 'Customer app', sub: 'Place order', x: 85, y: 170, w: 130, kind: 'client', info: 'Ye kya hai: customer ki app. Checkout pe "Place order" bhejti hai, saath mein Idempotency-Key, taaki double tap ya network retry pe do orders na banein.' },
        { id: 'ord', label: 'Order service', sub: 'state machine', x: 265, y: 170, w: 140, kind: 'server', info: 'Ye kya hai: order ka maalik. Order banata hai, state machine chalata hai, aur har state change ka event (outbox se) chhodta hai. Aam taur pe SQL jaisa transactional store (Swiggy/Zomato ne apna exact order DB public nahi kiya).' },
        { id: 'pay', label: 'Payments', sub: 'PG router (ML)', x: 265, y: 55, w: 140, kind: 'server', info: 'Ye kya hai: hamari payments service. Payment record banata hai (idempotency key ke saath) aur transaction ko best PG pe bhejta hai. Swiggy 2022 post: har method ke liye alag model; UPI ke liye haal ke success/fail counts se ek probability formula (Beta distribution) se chunav, cards ke liye 5% transactions pe naye PG try karna (exploration) taaki pata rahe kaun sudhra.' },
        { id: 'pg', label: 'Payment gateway', sub: 'bahar ki company', x: 465, y: 55, w: 140, kind: 'net', info: 'Ye kya hai: bahar ki payment company (PSP / PG) jo bank, card network ya UPI se baat karti hai. Hamare control mein nahi: slow bhi ho sakti hai, down bhi. Isliye timeout = "pata nahi".' },
        { id: 'kf', label: 'Kafka', sub: 'order events', x: 465, y: 250, w: 130, kind: 'queue', info: 'Ye kya hai: order events ka register (stream). Dukaan ko khabar, assignment, customer updates, analytics: sab yahan se padhte hain. Swiggy 2022 post ke mutabik fulfilment journey ka ek cluster 50+ services ko jodta hai.' },
        { id: 'rest', label: 'Restaurant app', sub: 'naya order!', x: 640, y: 165, w: 130, kind: 'client', info: 'Ye kya hai: dukaan ke tablet/phone ki app. Naya order aata hai: accept ya reject. Accept ke baad prep shuru, aur "Food Order Ready" (Zomato) dabane pe READY.' },
        { id: 'asg', label: 'Assignment', sub: 'partner dhoondho', x: 640, y: 290, w: 130, kind: 'server', info: 'Ye kya hai: partner chunne wali service. Order event aate hi partner dhoondhne ka kaam shuru (agla deep dive). Kab bhejna hai, ye prep time ke andaaze pe depend karta hai.' },
      ],
      edges: [{ a: 'app', b: 'ord' }, { a: 'ord', b: 'pay' }, { a: 'pay', b: 'pg' }, { a: 'ord', b: 'kf' }, { a: 'kf', b: 'rest' }, { a: 'kf', b: 'asg' }],
      scenarios: [
        { name: 'Order (happy)', steps: [
          { title: 'Place order', text: 'Order PAYMENT_PENDING state mein bana.', go: 'app>ord', msg: 'POST /v1/orders  Idempotency-Key: 1b9e…' },
          { title: 'Payment', text: 'Payments best PG chunta hai aur charge karta hai (UPI ho to customer apne UPI app mein approve karta hai).', go: ['ord>pay>pg', 'res:pg>pay>ord'], msg: 'route → PG-2 (success rate abhi best) → SUCCESS' },
          { title: 'PLACED + event', text: 'Ek transaction mein state PLACED aur outbox mein "order placed" event. Customer ko turant confirmation.', parallel: true, go: ['res:ord>app', 'evt:ord>kf'], after: { ord: { state: 'ok', sub: 'PLACED' } } },
          { title: 'Fan-out', text: 'Restaurant ko naya order, assignment ko kaam. Dono apni speed se.', parallel: true, go: ['evt:kf>rest', 'evt:kf>asg'], after: { rest: { state: 'ok', sub: 'accept?' } } },
        ]},
        { name: 'Payment ka jawaab nahi', intro: 'Sabse khatarnaak case: paisa kata ya nahi, pata nahi.', steps: [
          { title: 'PG slow', text: 'Request gayi, jawaab timeout. Ho sakta hai paisa kat gaya ho, ho sakta hai nahi.', go: ['app>ord', 'ord>pay>pg', 'lost:pg>pay'], set: { pg: { state: 'warn', sub: 'timeout' } } },
          { title: '"Unknown" maano, fail nahi', text: 'Order PAYMENT_PENDING hi rahe. Customer ko "confirm kar rahe hain" dikhao. Naya charge kabhi mat bhejo; usi payment ID se PG se status poochho, ya PG ke webhook ka wait.', set: { pay: { state: 'warn', sub: 'status: unknown' } }, focus: ['pay'] },
          { title: 'Status mila', text: 'PG ne bataya: SUCCESS. Ab order PLACED aur event. Agar FAILED aata to order FAILED aur customer ko retry ka option. Har case mein ek order, ek charge. Detail <a href="#/design-payments">Payments lesson</a> mein.', go: ['pay>pg', 'res:pg>pay>ord', 'evt:ord>kf'], set: { pg: { state: '' }, pay: { state: 'ok', sub: 'SUCCESS' } } },
        ]},
        { name: 'Restaurant ne reject kiya', steps: [
          { title: 'Reject', text: 'Item khatam / kitchen band. Restaurant ne reject dabaya.', go: 'evt:rest>kf>ord', set: { rest: { state: 'warn', sub: 'rejected' } } },
          { title: 'Compensation', text: 'Order CANCELLED aur paisa wapas: ye ek saga ka compensating step hai. Refund ka bhi idempotency key, taaki do baar refund na ho.', go: ['ord>pay>pg', 'res:pg>pay>ord'], msg: 'refund(order o42, key: refund-o42)' },
          { title: 'Sabko khabar', text: '"Cancelled" event: assignment partner ko chhod de, customer ko notification.', parallel: true, go: ['evt:ord>kf', 'evt:kf>asg'], after: { ord: { state: 'ok', sub: 'CANCELLED' } } },
        ]},
        { name: 'Kafka partitions offline', intro: 'Swiggy ka asli incident (2022 #BehindTheBug post).', steps: [
          { title: 'Kuch partitions gaye', text: 'Ek cluster ki kuch partitions 4 minute offline. Producers publish nahi kar paaye: post ke mutabik 18 services prabhavit, checkout pe confirm order exceptions.', set: { kf: { state: 'down', sub: 'partitions offline' } }, go: ['app>ord', 'bad:ord>kf'] },
          { title: 'Retry ka toofan', text: 'Har client retry karta raha. Post ke mutabik 10 min tak 100 ms ki linear backoff ke bawajood cluster pe ingress ~100x badh gaya. Kuch Java clients ek library bug ki wajah se purane metadata pe atak gaye aur restart tak recover nahi hue.', flood: { paths: ['bad:ord>kf'], n: 12 }, set: { ord: { state: 'hot', sub: 'retry storm' } } },
          { title: 'Seekh', text: 'Restart ke baad clients theek, ~2 ghante mein poori tarah normal. Post ki seekh: retry policy aisi ho ki problem ke waqt cluster pe aur bojh na daale, aur client libraries update rakho. (Aam tareeka: exponential backoff + jitter, yaani har retry ke baad wait double karo, aur usme thoda random time jodo taaki hazaaron clients ek hi pal pe wapas na toot padein.) Outbox pattern se order DB mein event safe rehta hai aur Kafka wapas aane pe chala jaata hai.', set: { kf: { state: 'ok', sub: 'recovered' }, ord: { state: '' } }, go: 'evt:ord>kf' },
        ]},
      ],
    },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Payment timeout hua, to dobara charge bhej do." Agar pehla charge asal mein ho chuka tha, customer ka paisa do baar katega. Timeout ka matlab <strong>"pata nahi"</strong> hai, "fail" nahi. Hamesha usi payment ID/idempotency key se status poochho.` },

    { type: 'h2', text: 'Deep dive 1: partner assignment, kab aur kise' },
    { type: 'p', html: `Swiggy ke 2019 post ka sabse kaam ka sentence (paraphrase): sabse paas wala partner us ek order ke liye achha hai, lekin poore system ke liye aksar bura, kyunki delivery time badhte hain aur efficiency girti hai. Ye wahi lesson hai jo <a href="#/design-uber">Uber ke batched matching</a> mein dekha, bas yahan ek aur variable hai: <strong>khana kab taiyaar hoga</strong>.` },
    { type: 'p', html: `Pehle "sabse paas wala" ki problem khud dekho. Teen orders ek ke baad ek aaye, teen partners free hain. Table mein har partner ko har order ki dukaan tak kitne minute lagenge. "Sabse paas wala" tareeka har order ko, aane ke kram mein, uska sabse paas ka free partner de deta hai. Doosra tareeka saare orders aur partners ko <strong>ek saath</strong> dekh ke wo jodiyan chunta hai jisme kul minute sabse kam hon.` },
    { type: 'custom', render(el) {
      // 3 orders, 3 free partners. Cell = partner ko us order ki dukaan tak pahunchne mein minutes (first mile).
      const P = ['A', 'B', 'C'], O = ['O1', 'O2', 'O3'];
      const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
      let M = [[3, 5, 12], [4, 14, 15], [10, 6, 7]], seed = 7;
      const greedy = m => { const used = new Set(), a = []; m.forEach(row => { let best = -1; row.forEach((v, j) => { if (!used.has(j) && (best < 0 || v < row[best])) best = j; }); used.add(best); a.push(best); }); return a; };
      const optimal = m => PERMS.reduce((b, p) => { const s = p.reduce((x, j, i) => x + m[i][j], 0); return s < b.s ? { p, s } : b; }, { p: null, s: Infinity }).p;
      const score = (m, a) => ({ total: a.reduce((x, j, i) => x + m[i][j], 0), worst: Math.max(...a.map((j, i) => m[i][j])) });
      el.innerHTML = `<div class="dl-mt" style="overflow-x:auto"></div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0"><button type="button" class="btn small dl-m1">Example (Swiggy jaisa)</button><button type="button" class="btn small ghost dl-mr">Naye numbers (seeded)</button></div>
        <div class="stats">
          <div class="stat"><span>Sabse paas wala, order ke kram se</span><strong class="dl-mg" style="font-size:16px"></strong></div>
          <div class="stat"><span>Sabko saath dekh ke (best)</span><strong class="dl-mo" style="font-size:16px"></strong></div>
        </div>
        <div class="calc-note dl-mn"></div>`;
      const draw = () => {
        const g = greedy(M), o = optimal(M), sg = score(M, g), so = score(M, o);
        const cell = (i, j) => { const tg = g[i] === j, to = o[i] === j; return `<td style="padding:6px 10px;text-align:center;border:1px solid var(--line);${to ? 'background:var(--accent-soft);font-weight:700;' : ''}${tg ? 'outline:2px dashed var(--red);outline-offset:-4px;' : ''}">${M[i][j]}</td>`; };
        el.querySelector('.dl-mt').innerHTML = `<table style="border-collapse:collapse;font-size:14px"><tr><th style="padding:6px 10px"></th>${P.map(p => `<th style="padding:6px 10px">Partner ${p}</th>`).join('')}</tr>${O.map((r, i) => `<tr><th style="padding:6px 10px">${r}</th>${P.map((_, j) => cell(i, j)).join('')}</tr>`).join('')}</table><div style="font-size:12px;color:var(--ink-2);margin-top:4px">Laal dashed = "sabse paas wala" tareeka. Rang bhara = best jodi. Numbers = dukaan tak minutes.</div>`;
        el.querySelector('.dl-mg').textContent = `kul ${sg.total} min, sabse bura ${sg.worst} min`;
        el.querySelector('.dl-mo').textContent = `kul ${so.total} min, sabse bura ${so.worst} min`;
        el.querySelector('.dl-mn').textContent = sg.total === so.total
          ? `Is baar dono tareeke barabar nikle (kul ${so.total} min). Aisa bhi hota hai, lekin hamesha nahi: "Naye numbers" dabate raho.`
          : `O1 ne apna sabse paas wala partner le liya, to baad ke orders ko door wale mile. Sabko saath dekhne se kul ${sg.total - so.total} min bache${sg.worst !== so.worst ? ` aur sabse bura order ${sg.worst} se ${so.worst} min pe aaya` : ''}.`;
      };
      el.querySelector('.dl-m1').addEventListener('click', () => { M = [[3, 5, 12], [4, 14, 15], [10, 6, 7]]; draw(); });
      el.querySelector('.dl-mr').addEventListener('click', () => { M = O.map(() => P.map(() => { seed = seed * 16807 % 2147483647; return 2 + seed % 14; })); draw(); });
      draw();
    }},
    { type: 'p', html: `Example mein: sabse paas wala tareeka kul 24 min (O2 ko 14 min wala partner B mila), saath dekhne wala kul 16 min (O1 ko B, O2 ko A). Is "kaun kiske saath" wale sawaal ko computer science mein <strong>bipartite matching</strong> kehte hain (do groups, orders aur partners, ke beech jodiyan). Bade numbers pe industry Hungarian algorithm ya min-cost flow jaise tareeke use karti hai, aur faisla har kuch second ke batch mein leti hai. Swiggy ka exact solver public nahi; ye aam approach hai.` },
    { type: 'p', html: `Swiggy ke post ne iske upar teen strategies batayin:` },
    { type: 'steps', items: [
      { t: 'Just-in-time (JIT) assignment', d: 'Partner ko restaurant pe khada na rakho. Naive tareeka: assignment ko (prep time − average first mile) jitna der se karo; lekin averages galat hote hain, aur der ke baad koi partner na mila to order late. Behtar: partner ko abhi <strong>earmark</strong> karo (wo kisi aur order ke liye eligible nahi), lekin <strong>dispatch</strong> tab karo jab wo theek waqt pe pahunche. Earmark kiya hua partner zaroorat padne pe kisi aur order se <strong>swap</strong> bhi ho sakta hai.' },
      { t: 'Next-order assignment', d: 'Jo partner abhi ek order deliver kar raha hai lekin 10 min mein free hoga aur restaurant se 5 min door hai, wo 20 min prep wale order ke liye perfect hai. "Busy" partners ko bhi consider karne se candidate pool bada hota hai. Risk: agar wo der se free hua to naya order late.' },
      { t: 'Batching', d: 'Ek hi restaurant (ya paas paas) se do orders, paas paas ke customers: ek partner dono le jaaye. Orders per partner badhte hain. Lekin har order ka promise bachana zaroori hai, aur window kitni ho (5 min? 10 min?) ye time (pre-dinner vs dinner) aur jagah (ghana shehar vs suburb) ke saath badalta hai. Swiggy ke 2021 paper ke mutabik batched orders ke delivery time ke liye ML system ne promise ke andar deliveries ~6% badhayi.' },
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: Earmark vs dispatch', html: `<strong>Ye kya hai:</strong> <strong>Earmark</strong> = system ne man mein tay kar liya ki ye partner is order ke liye hai (doosre orders ke liye "reserved"), lekin partner ko abhi bheja nahi. <strong>Dispatch</strong> = partner ke app pe order chala gaya aur wo nikal pada.<br><strong>Kyun chahiye:</strong> beech ka waqt system ko faisla badalne ki aazaadi deta hai (swap), aur partner dukaan pe khada nahi rehta.<br><strong>Iske bina:</strong> ya to partner jaldi bhej ke dukaan pe khada karo, ya der se dhoondho aur koi na mile.` },
    { type: 'flow', title: 'Assignment: JIT, swap, batch', height: 340,
      nodes: [
        { id: 'ord', label: 'Order event', sub: 'Kafka se', x: 85, y: 170, w: 130, kind: 'queue', info: 'Ye kya hai: Kafka se aaya "order placed / accepted" event. Isi se assignment ka kaam shuru hota hai.' },
        { id: 'asg', label: 'Assignment', sub: 'earmark / dispatch', x: 295, y: 170, w: 150, kind: 'server', info: 'Ye kya hai: partner chunne wala engine. Hazaaron pending orders aur partners ko dekh ke jodiyan banata hai, earmark karta hai, sahi waqt pe dispatch karta hai, aur zaroorat pe swap ya batch karta hai. Swiggy ke shabdon mein, e-commerce ki tarah din nahi, sirf kuch minute milte hain.' },
        { id: 'time', label: 'Time models', sub: 'prep, travel ETA', x: 295, y: 55, w: 150, kind: 'server', info: 'Ye kya hai: andaaze lagane wale ML models. Prep time (Zomato ka FPT model), first mile aur last mile travel time, partner kab free hoga: sab predictions. Assignment ki har strategy inhi ki accuracy pe tiki hai.' },
        { id: 'dei', label: 'Partner index', sub: 'location + status', x: 295, y: 290, w: 150, kind: 'cache', info: 'Ye kya hai: har partner ki latest location aur status (free, busy, kab free hoga) ki tez list. Memory mein rakha geo index (geohash ya H3 jaise map ke dabbe), taaki "is dukaan ke 2 km mein kaun" turant mile. Exact store public nahi; Zomato ke 2023 MongoDB case study ke mutabik partner locations aur order assignment MongoDB pe bhi chalte hain.' },
        { id: 'pa', label: 'Partner A', sub: 'restaurant se 5 min', x: 610, y: 100, w: 140, kind: 'client', info: 'Ye kya hai: ek delivery partner ka phone app. Dispatch hone pe order dikhta hai; partner accept/reject kar sakta hai.' },
        { id: 'pb', label: 'Partner B', sub: 'abhi delivery pe', x: 610, y: 245, w: 140, kind: 'client', info: 'Ye kya hai: ek aur partner ka app. Shayad kisi aur order pe hai aur thodi der mein free hoga.' },
      ],
      edges: [{ a: 'ord', b: 'asg' }, { a: 'asg', b: 'time' }, { a: 'asg', b: 'dei' }, { a: 'asg', b: 'pa' }, { a: 'asg', b: 'pb' }],
      scenarios: [
        { name: 'JIT: earmark, phir dispatch', steps: [
          { title: 'Order O1 aaya', text: 'Restaurant ne accept kiya, prep shuru.', go: 'evt:ord>asg' },
          { title: 'Predictions', text: 'Prep ~15 min. Paas ke partners: A 5 min door.', go: ['asg>time', 'res:time>asg', 'asg>dei', 'res:dei>asg'], msg: 'prep(O1)=15m | A: first mile 5m' },
          { title: 'Earmark', text: 'A ko O1 ke liye earmark kiya, bheja nahi. Abhi bhejte to A 10 min restaurant pe khada rehta.', set: { pa: { state: 'warn', sub: 'earmarked: O1' } }, focus: ['asg'] },
          { title: 'Theek waqt pe dispatch', text: '~10 min baad A ko dispatch. A pahuncha, khana taiyaar. Wait ~0, delivery time wahi.', go: 'asg>pa', set: { pa: { state: 'ok', sub: 'dispatched: O1' } } },
        ]},
        { name: 'Swap (O2 aaya)', intro: 'Swiggy 2019 post ka example.', steps: [
          { title: 'A earmarked for O1', text: 'O1 ke liye A earmark hai (B thoda door tha).', set: { pa: { state: 'warn', sub: 'earmarked: O1' } }, go: 'evt:ord>asg' },
          { title: 'O2 aaya', text: 'Ek minute baad O2 aaya, ek aise restaurant se jahan B bahut door hai aur A paas.', go: ['evt:ord>asg', 'asg>dei', 'res:dei>asg'], msg: 'O2: A 4 min, B 18 min' },
          { title: 'Swap', text: 'A abhi dispatch nahi hua tha, to A → O2 aur B → O1 kar do. Dono orders theek se deliver. Agar A pehle hi dispatch ho chuka hota to O2 bura jaata.', parallel: true, go: ['asg>pa', 'asg>pb'], set: { pa: { state: 'ok', sub: 'O2' }, pb: { state: 'ok', sub: 'O1' } } },
        ]},
        { name: 'Busy partner (next order)', steps: [
          { title: 'O3: 20 min prep', text: 'Bhaari order, prep ~20 min.', go: 'evt:ord>asg' },
          { title: 'B busy hai, lekin', text: 'B abhi ek delivery pe hai: ~10 min mein free, phir restaurant se ~5 min. Total 15 < 20.', go: ['asg>time', 'res:time>asg'], msg: 'B: free in 10m + 5m first mile = 15m ≤ prep 20m' },
          { title: 'B ko next order', text: 'B ko O3 assign. Pool bada, aur B ka wait bhi kam. Risk: B late free hua to O3 late, isliye "kab free hoga" ka prediction accurate chahiye.', go: 'asg>pb', set: { pb: { state: 'ok', sub: 'next: O3' } } },
        ]},
        { name: 'Partner ne reject kiya', steps: [
          { title: 'Dispatch', text: 'A ko O1 dispatch kiya.', go: 'asg>pa' },
          { title: 'Reject', text: 'A ne reject kar diya (bike puncture, shift khatam). JIT ka risk: humne der se dispatch kiya tha, ab buffer kam hai.', go: 'bad:pa>asg', set: { pa: { state: 'down', sub: 'rejected' } } },
          { title: 'Turant reassign', text: 'Agla best (B). Order thoda late ho sakta hai; tracking ETA update aur customer ko sahi time. Isliye JIT mein rejection ki probability bhi model mein gintee hai.', go: ['asg>dei', 'res:dei>asg', 'asg>pb'], set: { pb: { state: 'ok', sub: 'O1' } } },
        ]},
        { name: 'Batching', steps: [
          { title: 'Do orders, ek restaurant', text: 'O1 aur O2 ek hi restaurant se, 3 min ke farak pe, customers paas paas.', go: ['evt:ord>asg', 'evt:ord>asg'], msg: 'O1 + O2: same restaurant, drops 4 min apart' },
          { title: 'Promise check', text: 'Kya ek partner dono le jaaye to dono apne promised time ke andar pahunchenge? Neeche wale widget mein khud check karo.', go: ['asg>time', 'res:time>asg'] },
          { title: 'Ek partner, do orders', text: 'Haan, to A ko dono. Ek partner bacha, wo kisi aur order pe ja sakta hai.', go: 'asg>pa', set: { pa: { state: 'ok', sub: 'batch: O1+O2' } } },
        ]},
      ],
    },

    { type: 'p', html: `Batch karein ya nahi? Do orders O1 aur O2 ek hi restaurant se, dono ka promise same. O1 ka khana 15 min pe taiyaar, O2 ka "gap" minute baad. Ek partner dono ke ready hone ka wait karta hai, phir drop order wo chunta hai jisme sabse late order kam late ho. (Simplified model: partner pehle se restaurant pe hai.)` },
    { type: 'custom', render(el) {
      const PREP = 15;
      const calc = (gap, lm1, lm2, d12, P) => {
        const solo1 = PREP + lm1, solo2 = PREP + gap + lm2, pick = PREP + gap;
        const a = { first: 'O1', t1: pick + lm1, t2: pick + lm1 + d12 }, b = { first: 'O2', t2: pick + lm2, t1: pick + lm2 + d12 };
        const best = Math.max(a.t1, a.t2) <= Math.max(b.t1, b.t2) ? a : b;
        const soloDE = lm1 + lm2, batchDE = gap + (best.first === 'O1' ? lm1 : lm2) + d12;
        return { solo1, solo2, best, ok: best.t1 <= P && best.t2 <= P, soloDE, batchDE, saved: soloDE - batchDE };
      };
      el.innerHTML = `<div class="row2">
          <div><label for="dl-g">O2 kitni der baad ready: <b class="dl-gv"></b> min</label><input id="dl-g" type="range" min="0" max="15" step="1" value="3"></div>
          <div><label for="dl-d">Dono customers ke beech: <b class="dl-dv"></b> min</label><input id="dl-d" type="range" min="1" max="15" step="1" value="4"></div>
          <div><label for="dl-l1">Restaurant → customer 1: <b class="dl-l1v"></b> min</label><input id="dl-l1" type="range" min="3" max="25" step="1" value="10"></div>
          <div><label for="dl-l2">Restaurant → customer 2: <b class="dl-l2v"></b> min</label><input id="dl-l2" type="range" min="3" max="25" step="1" value="12"></div>
          <div><label for="dl-p">Promise (dono ke liye): <b class="dl-pv"></b> min</label><input id="dl-p" type="range" min="20" max="50" step="1" value="35"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Alag alag (O1 / O2)</span><strong class="dl-s"></strong></div>
          <div class="stat"><span>Batch (O1 / O2)</span><strong class="dl-bt"></strong></div>
          <div class="stat"><span>Partner-minutes bache</span><strong class="dl-sv"></strong></div>
          <div class="stat"><span>Faisla</span><strong class="dl-v"></strong></div>
        </div>
        <div class="calc-note dl-bn"></div>`;
      const g = id => Number(el.querySelector('#' + id).value);
      const upd = () => {
        [['g', 'dl-g'], ['d', 'dl-d'], ['l1', 'dl-l1'], ['l2', 'dl-l2'], ['p', 'dl-p']].forEach(([k, id]) => { el.querySelector('.dl-' + k + 'v').textContent = g(id); });
        const r = calc(g('dl-g'), g('dl-l1'), g('dl-l2'), g('dl-d'), g('dl-p')), P = g('dl-p');
        el.querySelector('.dl-s').textContent = `${r.solo1} / ${r.solo2} min`;
        el.querySelector('.dl-bt').textContent = `${r.best.t1} / ${r.best.t2} min`;
        el.querySelector('.dl-sv').textContent = r.saved + ' min';
        const v = r.ok && r.saved > 0;
        el.querySelector('.dl-v').textContent = v ? 'Batch karo' : 'Mat karo';
        el.querySelector('.dl-v').style.color = v ? 'var(--green)' : 'var(--red)';
        el.querySelector('.dl-bn').textContent = !r.ok
          ? `Batch mein koi order ${P} min ka promise tod deta (${Math.max(r.best.t1, r.best.t2)} min). Customer ko diya waada pehle; ye batch mat karo.`
          : r.saved <= 0 ? `Promise bachta hai, lekin partner ka time nahi bachta (customers bahut door ya wait bahut lamba). Fayda nahi.`
          : `Pehle ${r.best.first} drop karo. Dono promise ke andar, aur ek partner ke ${r.saved} min bache: doosra partner kisi aur order pe ja sakta hai. Keemat: kisi ek customer ko alag delivery se thoda zyada time.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Default pe batch 28 / 32 min deta hai (alag alag 25 / 30) aur partner ke 5 min bachte hain. "O2 kitni der baad" ko 8 karo: O2 37 min pe pahunchega, promise toot gaya. Customers ke beech 12 min karo: wahi. Yahi Swiggy ke post ki duvidha hai: window badi = zyada batching, lekin pehla order zyada der wait karta hai.` },

    { type: 'h2', text: 'Deep dive 2: har jagah predictions' },
    { type: 'p', html: `Upar ki har strategy ek prediction pe tiki hai. Dono companies ne apne models ke baare mein likha hai:` },
    { type: 'table', head: ['Kya predict', 'Kaun, kab', 'Kya kiya (paraphrase)'], rows: [
      ['Food Preparation Time (FPT)', 'Zomato, 2020', 'Dish ke naam ko embeddings mein (lakhon alag dishes, isliye one-hot nahi), restaurant ki entity embedding, aur restaurant ke pichhle 5 completed + abhi chal rahe orders ka sequence. Mean absolute error 4.64 se 4.13 min. Pehle FPT = accept se pickup tak maante the, jisme partner ki der bhi ghus jaati; isliye restaurant app mein "Food Order Ready" button.'],
      ['Partner travel time (DP-ETA)', 'Zomato, 2022', 'Chhote shehron mein map data kamzor, partner apne raaste lete hain; isliye map-graph model se tree model (LightGBM) pe gaye, har shehar ka alag model. Thousands QPS, CPU pe milliseconds. FastAPI serving ~2-3 ms vs MLflow ~7-8 ms; base model ka serving kharcha ~$10/din se kam.'],
      ['Road distance', 'Swiggy, 2021', 'OSM (A*) ya Google Directions, geohash L7/L8 pairs pe cached (upar ka diagram).'],
      ['Tracking screen ETA', 'Swiggy, 2023', 'Order ke 4 legs (O2A, First Mile, Wait Time, Last Mile) ke 4 alag models; prediction fixed intervals pe refresh, live partner pings, restaurant stress, baarish jaise features ke saath.'],
      ['Batched order delivery time', 'Swiggy, 2021 paper', 'Batch hone wale orders ke liye alag ML system; promise ke andar deliveries ~6% zyada.'],
    ]},
    { type: 'p', html: `Table ke kuch words seedhe shabdon mein: <strong>embedding</strong> = kisi cheez (jaise dish ka naam "paneer tikka") ko numbers ki ek chhoti list mein badalna, taaki milti-julti cheezon ki list bhi milti-julti ho. <strong>One-hot</strong> = har dish ke liye ek alag khaana (lakhon dishes = lakhon khaane), isliye bekaar. <strong>Mean absolute error (MAE)</strong> = andaaza average kitne minute galat tha. <strong>LightGBM</strong> = ek tez, popular ML tareeka jo bahut saare chhote "agar-to" decision trees jodta hai. <strong>FastAPI / MLflow</strong> = model ko ek API ki tarah chalaane ke do tools.` },
    { type: 'callout', tone: 'warn', title: 'Ek insaani detail', html: `Zomato ke 2022 ETA post ke mutabik wo apne delivery partners ko ETA ya countdown <strong>nahi</strong> dikhate, taaki road pe jaldbaazi aur rash driving na ho. System design sirf servers nahi; incentives bhi design hain.` },

    { type: 'h2', text: 'Deep dive 3: live tracking' },
    { type: 'p', html: `Swiggy ke 2018 post ke mutabik customers 20-45 min ke wait mein tracking screen pe baar baar lautte hain. Har customer har kuch second poll kare to API pe bekaar load (Uber ke RAMEN post mein peak pe 80% requests polling thi). Isliye server se <strong>push</strong>. Zomato ne 2026 mein apni Android library <strong>Pulse</strong> open source ki: <strong>MQTT</strong> pe persistent connections, jo delivery partner app, consumer app aur Hyperpure app mein live location aur order lifecycle events le jaati hai. Unke post ke mutabik HTTP polling mein headers ka overhead aksar asli data se zyada tha.` },
    { type: 'callout', tone: 'term', title: 'Naya word: MQTT', html: `<strong>Ye kya hai:</strong> <strong>MQTT</strong> ek halka "publish-subscribe" protocol (baat karne ke niyam) hai jo kamzor mobile networks ke liye bana. Phone ek <strong>broker</strong> (beech ka daakiya server) se ek connection khula rakhta hai aur topics subscribe karta hai (jaise <code>orders/o42/track</code>). Jo bhi us topic pe publish kare, broker turant us phone tak pahuncha deta hai.<br><strong>Kyun chahiye:</strong> customer ko partner har kuch second mein naye jagah dikhna chahiye, bina baar baar poochhe. MQTT ke header chhote hain aur reconnect ke niyam protocol mein hi hain.<br><strong>Iske bina:</strong> polling (neeche), ya WebSocket pe khud saare niyam banane padte.` },
    { type: 'callout', tone: 'term', title: 'Naye words: polling vs push', html: `<strong>Ye kya hai:</strong> <strong>Polling</strong> = app har 2 second server se poochhe "kuch naya?" (zyadatar jawab "nahi"). <strong>Push</strong> = connection khula rahe, aur server tabhi bheje jab sach mein kuch naya ho.<br><strong>Kyun chahiye (push):</strong> maan lo 5 lakh log tracking screen pe hain aur har 2 second poll karte hain = 2.5 lakh requests/second, jinme se zyadatar bekaar. Push mein requests sirf utni jitni naye pings.<br><strong>Iske bina:</strong> server aur battery dono pe bekaar bojh. Detail <a href="#/realtime">Real-time lesson</a> mein.` },

    { type: 'flow', title: 'Live tracking: partner se customer ke map tak', height: 330,
      nodes: [
        { id: 'cust', label: 'Customer app', sub: 'tracking screen', x: 85, y: 70, w: 130, kind: 'client', info: 'Ye kya hai: customer ki app ki tracking screen. Order ke topic ko subscribe kiya hua hai; naya update aate hi map aur ETA badal jaate hain. Do updates ke beech app partner ko smoothly animate karta hai.' },
        { id: 'dp', label: 'Partner app', sub: 'pings + status', x: 85, y: 260, w: 130, kind: 'client', info: 'Ye kya hai: partner ka app. Har kuch second location (ping) aur status (arrived, picked up, delivered) bhejta hai. Swiggy ke 2019 partner app post ke mutabik app kamzor network mein bhi chalta hai: local storage source of truth, lazy sync module aur retry framework (exponential/linear backoff).' },
        { id: 'br', label: 'MQTT broker', sub: 'pub-sub, push', x: 300, y: 165, w: 150, kind: 'net', info: 'Ye kya hai: MQTT ka beech wala server (daakiya) jo lakhon khule connections sambhalta hai. Partner app publish karta hai, customer app subscribe. Zomato Pulse client side pe automatic reconnect aur subscription recovery karta hai. (Server side broker ki details Zomato ne public nahi ki.)' },
        { id: 'trk', label: 'Tracking svc', sub: 'state + location', x: 510, y: 165, w: 140, kind: 'server', info: 'Ye kya hai: tracking ka dimaag. Pings check karta hai (GPS ka achanak kood jaana, nakli location), order ki latest location/state save karta hai, ETA refresh mangwata hai, aur customer ke topic pe update publish karta hai.' },
        { id: 'eta', label: 'ETA models', sub: '4 legs (Swiggy)', x: 648, y: 55, w: 132, kind: 'server', info: 'Ye kya hai: "kitni der aur" batane wale ML models. Order abhi kis leg mein hai, uske hisaab se model: O2A, First Mile, Wait Time ya Last Mile (Swiggy 2023). Fixed intervals pe refresh.' },
        { id: 'db', label: 'Tracking store', sub: 'MongoDB (Zomato)', x: 648, y: 285, w: 132, kind: 'data', info: 'Ye kya hai: latest location aur status ka database. MongoDB ke 2023 customer case study ke mutabik Zomato ka order tracking (live statuses aur partner locations) MongoDB pe chalta hai. Ye vendor ka likha case study hai, Zomato ka engineering post nahi.' },
      ],
      edges: [{ a: 'dp', b: 'br' }, { a: 'cust', b: 'br' }, { a: 'br', b: 'trk' }, { a: 'trk', b: 'db' }, { a: 'trk', b: 'eta' }],
      scenarios: [
        { name: 'Ping → map (happy)', steps: [
          { title: 'Ping', text: 'Partner app ne location publish ki.', go: 'dp>br>trk', msg: 'pub dp/d88/loc { lat, lng, ts }' },
          { title: 'Save + ETA', text: 'Latest location save, aur current leg (last mile) ka ETA refresh.', go: ['trk>db', 'trk>eta', 'res:eta>trk'], msg: 'leg=LM → eta 9 min' },
          { title: 'Push', text: 'Customer ke topic pe publish, broker turant phone tak. Koi polling nahi.', go: 'evt:trk>br>cust', msg: 'orders/o42/track { lat, lng, eta: "9 min" }', after: { cust: { state: 'ok', sub: '9 min' } } },
        ]},
        { name: 'Status: picked up', steps: [
          { title: 'Picked up', text: 'Partner ne "picked up" dabaya.', go: 'dp>br>trk', msg: 'POST picked-up (order o42)' },
          { title: 'State machine', text: 'Tracking/order service transition validate karta hai (READY → PICKED_UP) aur save. Event Kafka pe bhi jaata hai (pichhla diagram).', go: ['trk>db', 'res:db>trk'], after: { trk: { state: 'ok', sub: 'PICKED_UP' } } },
          { title: 'Customer ko', text: '"Your order is on the way" turant.', go: 'evt:trk>br>cust' },
        ]},
        { name: 'Partner ka network gaya', steps: [
          { title: 'Basement / lift', text: 'Partner customer ki building ki lift mein; network gaya. Pings ruk gaye.', go: 'lost:dp>br', set: { dp: { state: 'warn', sub: 'offline' } } },
          { title: 'Customer ko kya dikhe?', text: 'Last known location aur "updated 1 min ago". ETA model time elapsed se adjust karta hai. Galat jagah animate karte rehna se behtar hai sach dikhana.', focus: ['cust'], set: { cust: { state: 'warn', sub: 'last seen 1m' } } },
          { title: 'Wapas online', text: 'Partner ne offline mein "delivered" dabaya tha; app ne use locally rakha aur network aate hi retry ke saath sync kiya. Server pe transition idempotent hai, to retry se kuch double nahi hota.', set: { dp: { state: '' } }, go: ['dp>br>trk', 'trk>db', 'evt:trk>br>cust'], after: { cust: { state: 'ok', sub: 'DELIVERED' } } },
        ]},
        { name: 'Customer app background mein', steps: [
          { title: 'App band', text: 'Customer ne doosra app khola; OS ne connection kaat diya.', go: 'lost:br>cust', set: { cust: { state: 'dim', sub: 'background' } } },
          { title: 'Important updates', text: 'Bade status changes (picked up, delivered) push notification se bhi jaate hain (aam industry approach).', go: 'evt:trk>br', msg: 'notification: "Order picked up"' },
          { title: 'App wapas', text: 'App khulte hi client reconnect karta hai aur topics dobara subscribe (Pulse ka "subscription recovery"), phir taaza state.', set: { cust: { state: 'ok', sub: 'live' } }, go: ['cust>br', 'evt:br>cust'] },
        ]},
      ],
    },

    { type: 'h2', text: 'Deep dive 4: dinner peak aur failures' },
    { type: 'p', html: `Swiggy ke Mar 2021 post ke mutabik unki ek storefront service lunch pe ~1 lakh se ~3 lakh requests/minute tak jaati thi, aur dinner pe ~5 lakh rpm; din mein 4-6 ghante peak aur 6-8 ghante lagbhag zero. Peak ke liye 24 ghante machines chalaana paisa jalana hai, isliye compute aur storage ko demand ke saath <strong>autoscale</strong> (load badhe to machines apne aap badhao, ghate to ghatao). Usi post mein "hundreds of microservices" aur average 3-5x fan-out ki baat hai, jisse kai services ka P99 budget ~50 ms reh jaata hai.` },
    { type: 'list', items: [
      `<strong>Diamond call graph:</strong> S1 → S2, S3 → dono S5 ko call karein to S5 pe double load. Swiggy post: S5 dheema pade to fault ko S2/S3 tak rokna (timeouts = ek had ke baad intezaar band; circuit breaker = baar baar fail ho rahi service ko kuch der call hi mat karo; fallback = koi purana/default jawab do), S1 tak na pahunchne dena. Detail <a href="#/resilience">Resilience</a> lesson mein.`,
      `<strong>Cache ka girna:</strong> latency budget ke liye caching zaroori, lekin bada cache miss ho to database budget mein jawaab nahi de paata aur cascading failure. Isliye cache bhi highly available, aur DB pe stampede se bachaav.`,
      `<strong>Demand-supply equilibrium:</strong> fleet minute mein nahi badhta. Stress state machine se serviceability ghatao, surge/baarish fee, lamba last mile band. Overbook karke sabko late karne se behtar.`,
      `<strong>Pre-planned events (New Year's Eve):</strong> Zomato ke NYE 2023 post ke ek summary ke mutabik unhone demand forecast se capacity planning, apne in-house benchmarking tool se saikdon microservices ka load test, aur chaos testing (jaan boojh ke failures daalna) ki. (Ye point ek secondary summary pe based hai, isliye detail kam hai.)`,
    ]},
    { type: 'h3', text: 'Simulator: baarish wali shaam, stress aur degradation' },
    { type: 'p', html: `Servers to autoscale ho jaate hain, lekin <strong>partners autoscale nahi hote</strong>. Swiggy ka stress system (Step 4) isi ke liye hai. Neeche ek khilona model hai: ek zone, agle 30 minute. Stress = orders ÷ free partners. Level ke hisaab se system kaam halka karta hai (graceful degradation). Thresholds aur percent "maan lo" hain; Swiggy ne apne asli numbers public nahi kiye.` },
    { type: 'custom', render(el) {
      // Toy stress model. Saare thresholds aur percent "maan lo" hain; Swiggy ke asli numbers public nahi.
      const LV = [
        { name: 'Normal', max: 1.0, cut: 0, cap: 1, act: 'Kuch nahi. Saari serviceable dukaanein, koi extra fee nahi.' },
        { name: 'High', max: 1.4, cut: 0.15, cap: 1, act: 'Lambe last-mile wale orders band, ₹20 surge fee.' },
        { name: 'Very high', max: 2.0, cut: 0.3, cap: 1.2, act: 'Radius chhota, ₹35 fee, batching window badi (ek partner, do orders).' },
        { name: 'Extreme', max: Infinity, cut: 0.5, cap: 1.2, act: 'Sirf bahut paas ki dukaanein; baaki "abhi delivery nahi ho sakti".' },
      ];
      el.innerHTML = `<div class="row2">
          <div><label for="dl-so">Agle 30 min mein orders (zone): <b class="dl-sov"></b></label><input id="dl-so" type="range" min="50" max="600" step="10" value="300"></div>
          <div><label for="dl-sp">Free partners: <b class="dl-spv"></b></label><input id="dl-sp" type="range" min="50" max="400" step="10" value="200"></div>
        </div>
        <label style="display:flex;gap:8px;align-items:center;margin:8px 0"><input type="checkbox" class="dl-sr"> Baarish shuru (orders +40%, partners −20%)</label>
        <div class="stats">
          <div class="stat"><span>Stress level</span><strong class="dl-s1" style="font-size:16px"></strong></div>
          <div class="stat"><span>Late orders, bina degradation</span><strong class="dl-s2"></strong></div>
          <div class="stat"><span>Late orders, degradation ke saath</span><strong class="dl-s3"></strong></div>
          <div class="stat"><span>Orders jo aaj nahi liye</span><strong class="dl-s4"></strong></div>
        </div>
        <div class="calc-note dl-sn"></div>`;
      const g = id => Number(el.querySelector('#' + id).value);
      const upd = () => {
        const rain = el.querySelector('.dl-sr').checked;
        el.querySelector('.dl-sov').textContent = g('dl-so'); el.querySelector('.dl-spv').textContent = g('dl-sp');
        const orders = Math.round(g('dl-so') * (rain ? 1.4 : 1)), partners = Math.round(g('dl-sp') * (rain ? 0.8 : 1));
        const r = orders / partners, L = LV.find(l => r <= l.max);
        const accepted = Math.round(orders * (1 - L.cut)), cap = Math.round(partners * L.cap);
        const lateNo = Math.max(0, orders - partners), lateYes = Math.max(0, accepted - cap);
        el.querySelector('.dl-s1').textContent = `${L.name} (${r.toFixed(2)})`;
        el.querySelector('.dl-s2').textContent = lateNo;
        el.querySelector('.dl-s3').textContent = lateYes;
        el.querySelector('.dl-s4').textContent = orders - accepted;
        el.querySelector('.dl-sn').textContent = `${orders} orders, ${partners} partners (har partner 30 min mein ~1 order, maan lo). Action: ${L.act} Bina degradation ${lateNo} orders late; degradation ke saath ${lateYes} late, aur ${orders - accepted} orders liye hi nahi gaye.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Default (300 orders, 200 partners) pe stress 1.50 = "Very high". Sab orders le lete to 100 late hote. Degradation ke saath 90 orders liye hi nahi gaye (customers ko door ki dukaanein nahi dikhi), aur ek bhi late nahi. Ab baarish on karo: 420 orders, 160 partners, "Extreme". Bina degradation 260 late; degradation ke saath 18 late aur 210 orders aaj nahi. Ye kadwa sauda hai: kuch customers ko "nahi" bolna, taaki baakiyon ka waada toote nahi.` },
    { type: 'h2', text: 'Interview mein kaise bolein' },
    { type: 'steps', items: [
      { t: 'Teen sides', d: 'Customer, merchant, partner. Merchant ka prep time hamare control mein nahi, aur sab kuch usse bandha hai.' },
      { t: 'Read path bhaari', d: 'Listing pe har visit ~2,000 restaurants ka serviceability check. Geo clusters in-memory, distance cache, ETA models fast. Fallbacks (radial filter).' },
      { t: 'Delivery time equation', d: 'max(assignment + first mile, prep) + last mile. Har term ek model.' },
      { t: 'Order state machine', d: 'PAYMENT_PENDING → PLACED → ACCEPTED → READY → PICKED_UP → DELIVERED, cancel/refund branches, idempotent transitions, outbox → Kafka.' },
      { t: 'Payments', d: 'Idempotency key, timeout = unknown, status check/webhook, refund as compensation, PG routing.' },
      { t: 'Assignment', d: 'Closest nahi, global optimum: JIT (earmark/dispatch), next-order, batching with promise check.' },
      { t: 'Tracking', d: 'Push (MQTT/WebSocket), offline-tolerant partner app, leg-wise ETA.' },
      { t: 'Peak', d: 'Autoscale, stress-based degradation, retry discipline, load tests before NYE.' },
    ]},
    { type: 'callout', tone: 'why', title: 'Decide', html: `• "Is location tak kaun deliver kar sakta hai?" → static places ke liye <strong>polygons/clusters + geohash index</strong> (ya Elasticsearch/PostGIS geo filters), road distance ka <strong>cache</strong>; seedha circle sirf fallback.<br>• Order jaisa multi-step lifecycle → <strong>state machine</strong> + idempotent transitions + <strong>outbox → Kafka</strong> events; cross-service rollback → <strong>saga compensation</strong> (refund).<br>• Payment timeout → <strong>unknown</strong> maano, status poochho, kabhi blind retry nahi.<br>• Moving partners → in-memory geo index; matching → global optimisation (batch/JIT), sabse paas wala nahi.<br>• Live updates → <strong>push</strong> (MQTT/WebSocket/SSE), polling nahi.` },

    { type: 'diagram', title: 'Poora design, ek nazar mein', height: 580,
      caption: 'Teen apps, ek gateway, aur peeche services. Dukaanein dikhana (read) sabse bhaari; order aur paisa (write) sabse nazuk; partner aur map ke liye push. Upar ke buttons se ek-ek raasta dekho.',
      groups: [
        { label: 'Apps (teen sides)', x: 10, y: 12, w: 700, h: 104 },
        { label: 'Darwaaza + push', x: 10, y: 135, w: 700, h: 100 },
        { label: 'Services', x: 10, y: 250, w: 700, h: 214 },
        { label: 'Dabaav + bahar ki companies', x: 10, y: 480, w: 700, h: 92 },
      ],
      nodes: [
        { id: 'cust', label: 'Customer app', sub: 'browse, order, map', x: 90, y: 70, kind: 'client', info: 'Ye kya hai: customer ke phone ki app. Dukaanein dekhti hai, order karti hai (Idempotency-Key ke saath), aur tracking screen pe MQTT se live updates leti hai.' },
        { id: 'merch', label: 'Dukaan app', sub: 'accept, ready', x: 450, y: 70, kind: 'client', info: 'Ye kya hai: restaurant/store ke tablet ki app. Kafka event se naya order aata hai; accept/reject aur "ready" dabati hai. Zomato ne asli prep time jaanne ke liye "Food Order Ready" button joda.' },
        { id: 'dp', label: 'Partner app', sub: 'pings, status', x: 630, y: 70, kind: 'client', info: 'Ye kya hai: delivery partner ka app. Har kuch second location bhejta hai, dispatch pe order leta hai, aur kamzor network mein bhi status locally rakh ke baad mein sync karta hai (Swiggy 2019).' },
        { id: 'gw', label: 'API gateway', sub: 'login, routing', x: 90, y: 185, kind: 'net', info: 'Ye kya hai: saari normal (HTTP) requests ka ek darwaaza. Login check karta hai aur request sahi service tak bhejta hai. Aam industry approach; Swiggy/Zomato ka exact gateway public nahi.' },
        { id: 'br', label: 'MQTT broker', sub: 'push, pub-sub', x: 270, y: 185, kind: 'net', info: 'Ye kya hai: lakhon khule connections ka daakiya. Partner app location publish karti hai, customer app subscribe karti hai; dispatch bhi isi raaste partner tak jaa sakta hai. Zomato ki Pulse library (2026) MQTT pe hai.' },
        { id: 'trk', label: 'Tracking svc', sub: 'location + state', x: 630, y: 185, kind: 'server', info: 'Ye kya hai: pings ko check karke latest location save karti hai, ETA refresh karwati hai, aur customer ke topic pe update bhejti hai. Status badle (picked up) to event Kafka pe.' },
        { id: 'svc', label: 'Serviceability', sub: 'kaun, kitni der', x: 90, y: 300, kind: 'server', info: 'Ye kya hai: listing ke peeche ka dimaag. Har visit pe ~2,000 dukaanon ke liye: cluster filter, road distance, ETA, stress, fee, aur "dikhayein ya nahi". Swiggy: ~20 crore evaluations/min peak pe, P99 < 200 ms.' },
        { id: 'ord', label: 'Order service', sub: 'state machine', x: 270, y: 300, kind: 'server', info: 'Ye kya hai: order ka maalik. Sirf allowed transitions (PLACED → ACCEPTED ...), idempotent, aur har change ka event outbox se Kafka pe. Cancel/reject pe saga ka ulta kadam: refund.' },
        { id: 'kf', label: 'Kafka', sub: 'order events', x: 450, y: 300, kind: 'queue', info: 'Ye kya hai: events ka tikau register. Dukaan, assignment, notifications, analytics sab yahan se padhte hain. Swiggy 2022: ek cluster pe 50+ services; retries bina soche chalaao to cluster pe 100x load.' },
        { id: 'asg', label: 'Assignment', sub: 'JIT, batch, swap', x: 630, y: 300, kind: 'server', info: 'Ye kya hai: partner chunne wala engine. Sabse paas wala nahi, sabko saath dekh ke jodi. Earmark karke sahi waqt pe dispatch, zaroorat pe swap, aur promise bache to batching.' },
        { id: 'geo', label: 'Geo + distance', sub: 'geohash, cache', x: 90, y: 415, kind: 'cache', info: 'Ye kya hai: memory mein rakha geohash → clusters index, aur (geohash, geohash) jodi pe cached road distance (OSM/Google). Index fail ho to seedha circle (radial) fallback.' },
        { id: 'pay', label: 'Payments', sub: 'PG router', x: 270, y: 415, kind: 'server', info: 'Ye kya hai: hamari payment service. Idempotency key se ek hi charge, best PG chunna (ML), timeout = "pata nahi" (status poochho ya webhook), refund bhi apni key ke saath.' },
        { id: 'models', label: 'ETA models', sub: 'prep, travel', x: 450, y: 415, kind: 'server', info: 'Ye kya hai: andaaze lagane wale ML models: prep time (Zomato FPT), partner travel (Zomato DP-ETA), aur tracking ke 4 legs (Swiggy). Listing, assignment aur tracking teeno inhe use karte hain.' },
        { id: 'pidx', label: 'Partner index', sub: 'location, status', x: 630, y: 415, kind: 'cache', info: 'Ye kya hai: har partner ki latest location aur haalat (free, busy, kab free) memory mein, map ke dabbon (cells) ke hisaab se. Assignment "is dukaan ke paas kaun" yahin se poochhta hai.' },
        { id: 'stress', label: 'Stress FSM', sub: 'zone ka dabaav', x: 90, y: 530, kind: 'server', info: 'Ye kya hai: har zone mein orders vs free partners ka level (state machine). High stress pe radius chhota, fee, lambe orders band: graceful degradation.' },
        { id: 'pg', label: 'PG companies', sub: 'bahar ki companies', x: 270, y: 530, kind: 'net', info: 'Ye kya hai: bank/UPI/card se baat karne wali bahar ki companies. Hamare control mein nahi, isliye kai PGs aur routing.' },
      ],
      edges: [
        { a: 'cust', b: 'gw', n: 1, label: 'listing, order' },
        { a: 'gw', b: 'svc' }, { a: 'svc', b: 'geo' }, { a: 'svc', b: 'stress', dashed: true, via: [[180, 360], [180, 530]] },
        { a: 'svc', b: 'models', dashed: true },
        { a: 'gw', b: 'ord', n: 2 }, { a: 'ord', b: 'pay', n: 3 }, { a: 'pay', b: 'pg' },
        { a: 'ord', b: 'kf', n: 4, kind: 'evt' }, { a: 'kf', b: 'merch', kind: 'evt' },
        { a: 'kf', b: 'asg', n: 5, kind: 'evt' }, { a: 'asg', b: 'pidx' }, { a: 'asg', b: 'models', dashed: true },
        { a: 'asg', b: 'br', n: 6, label: 'dispatch' },
        { a: 'dp', b: 'br' }, { a: 'br', b: 'trk' }, { a: 'trk', b: 'kf', kind: 'evt' },
        { a: 'br', b: 'cust', kind: 'res', label: 'live map' },
      ],
      paths: [
        { name: 'Browse', text: 'App → gateway → serviceability: geohash se cluster, cache se road distance, ETA models se time, stress se fee/radius. ~2,000 dukaanein, 200 ms ke andar.', go: ['cust>gw>svc>geo', 'svc>stress', 'svc>models'] },
        { name: 'Place order', text: 'Idempotency-Key ke saath order → payments → PG. Paisa confirm, state PLACED, event outbox se Kafka pe, Kafka se dukaan app tak.', go: ['cust>gw>ord>pay>pg', 'ord>kf>merch'] },
        { name: 'Assign rider', text: 'Kafka event → assignment: partner index se paas ke partners, ETA models se prep/travel, sabko saath dekh ke jodi, sahi waqt pe dispatch push se partner app tak.', go: ['kf>asg>pidx', 'asg>models', 'asg>br>dp'] },
        { name: 'Track', text: 'Partner app ping → broker → tracking svc (save, ETA refresh) → broker → customer ka map. Status change ka event Kafka pe bhi.', go: ['dp>br>trk', 'trk>br>cust', 'trk>kf'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Teen sides: customer, dukaan, partner. Dukaan ka prep time hamare control mein nahi, aur sab kuch usse bandha hai.</li>
      <li>Sabse bhaari kaam listing hai: har visit pe ~2,000 serviceability checks. Clusters + geohash index, road distance cache, aur fallback (circle).</li>
      <li>Delivery time = max(assignment + first mile, prep) + last mile. Har term ek ML andaaza.</li>
      <li>Order ek state machine hai: sirf allowed transitions, idempotent, har change ka event outbox se Kafka pe. Cancel = saga ka ulta kadam (refund).</li>
      <li>Payment timeout = "pata nahi", fail nahi. Usi ID se status poochho; kabhi blind retry nahi.</li>
      <li>Partner: sabse paas wala nahi, sabko saath dekh ke. JIT (earmark → dispatch), swap, next-order, batching with promise check.</li>
      <li>Tracking: push (MQTT), polling nahi; partner app offline mein bhi kaam kare.</li>
      <li>Peak: servers autoscale hote hain, partners nahi. Stress level pe degradation, retries mein backoff + jitter, NYE se pehle load test.</li>
    </ul>` },
    { type: 'h2', text: 'Trade-offs jo humne liye' },
    { type: 'tradeoffs',
      gains: ['Clusters + geohash index: directional, fast serviceability', 'Distance cache (L7/L8): crores of evaluations sasti', 'Outbox + Kafka: order service decoupled, services apni speed se', 'JIT + batching: partner ka wait kam, orders per partner zyada', 'Push tracking: polling ka load gaya, updates turant', 'Stress-based degradation: peak pe bhi waade nibhte hain'],
      costs: ['Clusters manually/semi-automatically maintain karne padte', 'L7 cache pairs thode kam accurate', 'Events eventually consistent: customer ko status kuch second der se', 'JIT/batch predictions galat to orders late, khana thanda', 'Persistent connections: lakhon sockets/brokers chalaana', 'Degradation: peak pe kam restaurants, extra fee (customer naraaz)'] },

    { type: 'think', questions: [
      { q: 'Customer ne listing pe "28 min" dekha, checkout pe "41 min" aaya. Kya galat hua, aur kya karna chahiye?', a: 'Listing aur checkout ke beech zone ka stress badh gaya hoga (baarish, partners kam), ya cart mein bhaari items se prep time badha. Isliye checkout pe serviceability aur ETA dobara nikaalte hain (Swiggy ke post ke mutabik checkout pe bhi ye check hota hai). Customer ko naya, sach time dikhao; purana promise rakh ke late karna zyada nuksaan karta hai.' },
      { q: 'Restaurant ne order accept kiya, partner assign ho gaya, phir customer ne cancel kiya. Kaun kaun se compensating steps chahiye?', a: 'Order state CANCELLED (state machine allow kare to, aur policy ke hisaab se fee), refund (apni idempotency key ke saath), restaurant ko cancel event (prep rok de), assignment ko event (partner ko free/reassign karo), customer ko notification. Har step event se, idempotent, taaki retry safe ho. Ye ek saga hai.' },
      { q: 'Batching window 5 min se 10 min kar di. Kya badhega, kya ghatega?', a: 'Zyada orders batch honge, orders per partner badhenge, kharcha ghatega. Lekin pehle order ko doosre ka zyada wait, to uska delivery time badhega aur promise todne ka risk. Swiggy ke post ke mutabik sahi window time (dinner vs pre-dinner) aur area (ghana vs suburb) ke saath badalti hai, isliye ek fixed number nahi.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Zomato/Swiggy jaisi app mein sabse zyada computation kahan hota hai?', options: ['Order place karte waqt', 'Listing/home page pe serviceability evaluations', 'Payment mein'], answer: 1, explain: 'Har visit pe ~2,000 restaurants ka check: Swiggy ke hisaab se peak pe ~20 crore evaluations per minute. Orders iske saamne bahut kam.' },
      { q: 'Delivery time = max(assignment delay + first mile, prep time) + last mile. Max kyun?', options: ['Galti se', 'Partner ka pahunchna aur khana banna saath saath chalte hain; jo lamba, wahi ginta hai', 'Last mile sabse bada hota hai'], answer: 1, explain: 'Do parallel kaam. Partner jaldi pahuncha to wait karega; khana jaldi bana to thanda hoga.' },
      { q: 'JIT assignment mein partner ko "earmark" karke der se "dispatch" kyun karte hain?', options: ['Partner ko restaurant pe khada na rehna pade, aur naya order aaye to swap ka option rahe', 'Payment confirm hone ka wait', 'Server load kam karne ke liye'], answer: 0, explain: 'Swiggy ke 2019 post ka example: earmarked partner ko O1 se O2 pe swap karke dono orders achhe se deliver ho sakte the.' },
      { q: 'Payment gateway ka jawaab timeout ho gaya. Sahi kadam?', options: ['Turant dobara charge karo', 'Order FAILED karke customer ko bolo phir se try karo', 'Status unknown maano, usi payment ID se status poochho / webhook ka wait'], answer: 2, explain: 'Paisa shayad kat chuka hai. Blind retry = double charge ka risk.' },
      { q: 'Swiggy ka Kafka incident (2022) kya sikhata hai?', options: ['Kafka use mat karo', 'Retries bina soche cluster pe load 100x tak badha sakte hain; retry policy aur client versions dhyan se', 'Partitions kabhi offline nahi hoti'], answer: 1, explain: 'Partitions 4 min gaye, lekin retry storm aur ek client bug ne asar lamba kar diya.' },
    ]},
    { type: 'sources', note: 'Swiggy/Zomato-specific hisse inhi sources se hain; har post ka saal likha hai, kai kuch saal purane hain. Order store, Kafka topics aur broker ki internals public nahi hain; wahan lesson ne aam industry approach bataya hai. Napkin maths ke baaki numbers "maan lo" wale hain.', items: [
      { title: 'The Swiggy Delivery Challenge (Part One)', publisher: 'Swiggy Bytes (Swiggy engineering blog)', year: 2018, official: true, url: 'https://bytes.swiggy.com/the-swiggy-delivery-challenge-part-one-6a2abb4f82f6', used: 'Delivery starts at app open; serviceability; delivery time equation; prep-time and first-mile prediction challenges; 300-500 restaurants shown.' },
      { title: 'The Swiggy Delivery Challenge (Part Two)', publisher: 'Swiggy Bytes', year: 2019, official: true, url: 'https://bytes.swiggy.com/the-swiggy-delivery-challenge-part-two-f095930816e3', used: 'Closest DE is globally bad; JIT (earmark vs dispatch, swap example, 15 vs 5 min example); next-order assignment; batching window trade-offs.' },
      { title: 'What Serviceability means at Swiggy?', publisher: 'Swiggy Bytes', year: 2020, official: true, url: 'https://bytes.swiggy.com/what-serviceability-means-at-swiggy-c94c1aad352a', used: 'Serviceability responsibilities, radial vs directional (cluster) filtering, OSM distances, stress FSM and graceful degradation, surge fee.' },
      { title: 'Designing the Serviceability Platform at Swiggy for High Scale, Part 1', publisher: 'Swiggy Bytes', year: 2021, official: true, url: 'https://bytes.swiggy.com/designing-the-serviceability-platform-at-swiggy-for-high-scale-part-1-751a631f0379', used: '100k visits/min × 2000 = ~200M evaluations/min, P99 < 200 ms; geohash-indexed clusters + PIP; radial fallback; Google/OSM distances cached by geohash L7/L8 pairs.' },
      { title: 'A brief introduction to Engineering challenges at Swiggy', publisher: 'Swiggy Bytes', year: 2021, official: true, url: 'https://bytes.swiggy.com/engineering-challenges-at-swiggy-430dea6c86a3', used: 'Lunch 100K→300K rpm, dinner ~500K rpm; autoscaling; fan-out 3-5x, ~50 ms P99 budgets; diamond call graph; cache failure risk.' },
      { title: 'Where is my order? (Part I): ML-powered ETA', publisher: 'Swiggy Bytes', year: 2023, official: true, url: 'https://bytes.swiggy.com/how-ml-powers-when-is-my-order-coming-part-i-4ef24eae70da', used: 'Four legs (O2A, FM, WT, LM), four models, periodic refresh, real-time features.' },
      { title: '#BehindTheBug: Kafka Under The Water', publisher: 'Swiggy Bytes', year: 2022, official: true, url: 'https://bytes.swiggy.com/behindthebug-kafka-under-the-water-288c3d05b202', used: 'Kafka used for orchestration/choreography; 50+ services on one fulfilment cluster; 4-min partition outage, 18 services, ~100x ingress from retries, client bug, recovery.' },
      { title: 'An ML approach for routing payment transactions', publisher: 'Swiggy Bytes', year: 2022, official: true, url: 'https://bytes.swiggy.com/an-ml-approach-for-routing-payment-transactions-5a14efb643a8', used: 'Multiple PGs per method; per-method routing models; Beta sampling for UPI; 5% exploration for cards.' },
      { title: 'Architecture and Design Principles Behind Swiggy\'s Delivery Partners App', publisher: 'Swiggy Bytes', year: 2019, official: true, url: 'https://bytes.swiggy.com/architecture-and-design-principles-behind-the-swiggys-delivery-partners-app-4db1d87a048a', used: 'FSM per delivery flow, native storage as source of truth, lazy sync and retry framework for flaky networks.' },
      { title: 'Paper on ML based batching prediction published', publisher: 'Swiggy Bytes (CODS-COMAD 2021 paper)', year: 2021, official: true, url: 'https://bytes.swiggy.com/paper-on-ml-based-batching-prediction-published-ba3f16d060c1', used: '~6% more deliveries within estimate for batched orders.' },
      { title: 'Making Swiggy\'s order tracking a magical experience', publisher: 'Swiggy Bytes', year: 2018, official: true, url: 'https://bytes.swiggy.com/making-swiggys-order-tracking-a-magical-experience-37464b878fc7', used: 'Customers return to tracking screen repeatedly during 20-45 min wait.' },
      { title: 'The Deep Tech Behind Estimating Food Preparation Time', publisher: 'Zomato blog', year: 2020, official: true, url: 'https://www.zomato.com/blog/food-preparation-time', used: 'FPT components, dish embeddings, restaurant embeddings, sequence of last 5 orders, MAE 4.64→4.13 min, Food Order Ready button.' },
      { title: 'The accurate ETA to customer satisfaction (Parts One and Two)', publisher: 'Zomato blog', year: 2022, official: true, url: 'https://www.zomato.com/blog/the-accurate-eta-to-customer-satisfaction-part-two', used: 'ETA used in browsing, assignment, tracking; map-graph → LightGBM tree model; per-city models; FastAPI vs MLflow latency; <$10/day; no ETA countdown shown to DPs.' },
      { title: 'Pulse: resilient MQTT infrastructure for Android', publisher: 'Zomato / Eternal engineering blog', year: 2026, official: true, url: 'https://www.eternal.com/blog/pulse', used: 'MQTT for live location and order lifecycle events across DP, consumer and Hyperpure apps; polling overhead; reconnect and subscription recovery.' },
      { title: 'Zomato case study', publisher: 'MongoDB blog (vendor-written customer story)', year: 2023, url: 'https://mongodb.com/company/blog/innovation/zomato-manages-high-volume-data-delivers-high-speed-success', used: 'Order tracking (live statuses, DP locations) and order assignment on MongoDB.' },
      { title: 'Zomato receives record 4,100 orders per minute on New Year\'s Eve', publisher: 'Business Today (news report)', year: 2021, url: 'https://www.businesstoday.in/latest/trends/story/zomato-receives-record-4100-orders-per-minute-on-new-years-eve-283215-2021-01-01', used: 'Peak orders per minute for napkin maths.' },
      { title: 'Zomato\'s NYE: behind the scenes (summary of Zomato\'s "A Tale of Scale" post)', publisher: 'Biweekly Engineering (secondary summary)', year: 2024, url: 'https://biweekly-engineering.beehiiv.com/p/zomatos-nye-behind-scenes-biweekly-engineering-episode-28', used: 'Capacity planning, in-house benchmarking across microservices, chaos testing before NYE.' },
    ]},
  ],
});
