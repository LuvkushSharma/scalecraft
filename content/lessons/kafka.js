Lesson.register({
  id: 'kafka',
  title: 'Kafka aur event streams',
  minutes: 35,
  summary: `Queue ek to-do list hai: kaam hua, message gayab. Lekin jab ek hi event (jaise "video upload hua") ko das teams padhna chahein, apni apni speed se, aur kal wali events dobara padhni hon, tab chahiye ek log: Kafka. Topics, partitions, offsets, consumer groups, replication, aur DB aur Kafka ko sync rakhne ke do patterns: CDC aur transactional outbox.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Pichhle lesson ki queue mein kaam hua to message mit gaya.<br>Lekin kabhi ek hi khabar ("video upload hua") das alag teams ko chahiye hoti hai, aur kuch teams ko <strong>purani</strong> khabrein bhi dobara padhni hain.<br>Kafka ek lambi diary jaisa hai: har nayi baat end mein likhi jaati hai, padhne se kuch mitta nahi, aur har reader apna bookmark khud rakhta hai.<br>Is lesson mein dekhenge: wo diary kaise tukdon mein bant ke tez chalti hai, readers kaam kaise baant-te hain, machine gire to data kaise bachta hai, aur database ke saath Kafka ko sync kaise rakhte hain.` },
    { type: 'h2', text: 'Problem: queue mein kal ka data nahi milta' },
    { type: 'p', html: `Pichhle lesson mein xyz.com ne "video.uploaded" event ko pub/sub se transcoder, email aur analytics tak pahunchaya. Ab company badi ho gayi. Har hafte koi nayi team aati hai:` },
    { type: 'list', items: [
      `<strong>Search team:</strong> "Har naya video search index mein chahiye."`,
      `<strong>Recommendations team (nayi):</strong> "Hume pichhle 7 din ke saare upload aur view events chahiye, model train karna hai."`,
      `<strong>Analytics team:</strong> "Hamare code mein bug tha, kal ke counts galat hain. Kal ke events dobara process karne hain."`,
      `<strong>Har second lakhon "video viewed" events</strong>, jo har request pe aate hain.`,
    ]},
    { type: 'p', html: `Queue yahan kyun fail hoti hai? Queue mein message <strong>ack hote hi delete</strong> ho jaata hai. Nayi team ko purane events kahin nahi milenge. Bug fix ke baad "kal se dobara padho" possible nahi. Aur har subscriber ke liye alag copy (fanout) ka matlab hai: 10 teams = har event ki 10 copies, aur broker har message ka "kisne padha, kisne nahi" hisaab rakhta hai, jo lakhon events per second pe bhaari padta hai.` },
    { type: 'callout', tone: 'analogy', title: 'To-do list vs newspaper archive', html: `<strong>Queue = to-do list.</strong> Har kaam ek insaan karta hai, kaam hote hi line kaat di. <strong>Kafka = newspaper archive.</strong> Har din ka akhbaar ek ke baad ek rack mein lagta hai aur kuch time tak waisa hi rehta hai. Koi reader aaj ka padh raha hai, koi teen din pichhe hai, koi naya reader pehle din se padhna shuru karta hai. Akhbaar padhne se gayab nahi hota. Har reader bas apna "bookmark" yaad rakhta hai.` },
    { type: 'callout', tone: 'term', title: 'Log (append-only)', html: `<strong>Ye kya hai:</strong> yahan <strong>log</strong> ka matlab error logs nahi. Log ek aisi list hai jisme naya record hamesha <strong>end mein judta</strong> hai, aur purane records kabhi badalte nahi. Har record ka ek number hota hai: 0, 1, 2, 3...<br><strong>Kyun chahiye:</strong> sirf end mein likhna disk ke liye sabse tez kaam hai, aur kyunki kuch mitta nahi, koi bhi reader kisi bhi number se padh sakta hai.<br><strong>Iske bina:</strong> padhne ke baad data gayab (queue jaisa), to nayi team ya bug fix ke liye purana data nahi milta.<br><strong>Example:</strong> event 0 = "video 7 upload", event 1 = "video 9 upload", event 2 = "video 7 publish"... list bas lambi hoti jaati hai.` },
    { type: 'callout', tone: 'term', title: 'Event aur event stream', html: `<strong>Ye kya hai:</strong> event = "kuch hua" ka ek chhota record, jaise <code>{ "type": "uploaded", "video_id": 7, "time": "21:05" }</code>. Event stream = aise events ki kabhi na khatam hone wali line.<br><strong>Kyun chahiye:</strong> "ye hua" batane se har team apne hisaab se react kar sakti hai. Bhejne wale ko nahi pata hona chahiye ki kaun kya karega.<br><strong>Iske bina:</strong> upload service ko har team ko alag se call karna padta.` },

    { type: 'h2', text: 'Kafka ka janam: LinkedIn, 2011' },
    { type: 'p', html: `Kafka LinkedIn mein bana. 2011 ke paper "Kafka: a Distributed Messaging System for Log Processing" (Jay Kreps, Neha Narkhede, Jun Rao) mein unhone samjhaya ki purane messaging systems unke kaam ke kyun nahi the. Paper 2011 ka hai, Kafka tab se bahut badal chuka hai, lekin core ideas wahi hain:` },
    { type: 'list', items: [
      `<strong>Clicks, page views, logs ka data</strong> asli user data se kai guna zyada tha, aur use offline (Hadoop: bade data ko raat bhar process karne wala system) aur real-time dono jagah chahiye tha. Purane systems ya to sirf offline loading ke liye the, ya har message ke delivery state ka bhaari hisaab rakhte the.`,
      `<strong>Message ka koi alag ID nahi.</strong> Har message ki pehchaan uska <strong>offset</strong> hai: log mein uski jagah. Broker ko koi alag index nahi rakhna padta.`,
      `<strong>Consumer pull karta hai</strong> (broker push nahi karta), apni speed se. Aur "kahan tak padha" ka hisaab broker nahi, consumer rakhta hai. Isliye broker "stateless" jaisa aur halka rehta hai.`,
      `<strong>Delete kab?</strong> Kisi ke padhne pe nahi, time ke hisaab se: paper ke mutabik aam taur pe 7 din. Is wajah se ek "side effect" muft mila: consumer pichhe jaake dobara padh sakta hai (<strong>rewind / replay</strong>).`,
      `<strong>Speed ke tricks:</strong> messages batch (ek saath kai) mein bhejna, OS ke <strong>page cache</strong> pe bharosa (RAM ka wo hissa jahan OS haal hi mein padhi/likhi file khud yaad rakhta hai), aur <code>sendfile</code> (OS ka shortcut jo file se seedha network pe data bhejta hai, beech ki copies bachaata hai).`,
      `<strong>Delivery guarantee:</strong> at-least-once. Paper ke time replication nahi tha; broker ki disk gayi to unconsumed data gaya. Replication baad mein aaya (neeche dekhenge).`,
    ]},

    { type: 'h2', text: 'Building blocks: topic, partition, offset' },
    { type: 'p', html: `Kafka ke paanch building blocks. Har ek ka chhota card padho, phir neeche ka chitra sab ko jod deta hai.` },
    { type: 'callout', tone: 'term', title: 'Broker', html: `<strong>Ye kya hai:</strong> ek Kafka server (machine). Kai brokers milke ek <strong>cluster</strong> banate hain.<br><strong>Kyun chahiye:</strong> ek machine ki disk aur network ki seema hai. Kai brokers = zyada data, zyada speed, aur ek gire to baaki chalte rahein.<br><strong>Iske bina:</strong> ek machine = ek single point of failure.` },
    { type: 'callout', tone: 'term', title: 'Topic', html: `<strong>Ye kya hai:</strong> ek naam wala log, ek tarah ke events ke liye. Jaise <code>video-events</code>, <code>payments</code>. Ek folder samjho jisme sirf ek type ki cheezein.<br><strong>Kyun chahiye:</strong> readers ko sirf wo events padhne hain jinki unhe parwah hai.<br><strong>Iske bina:</strong> saare events ek dher mein, har reader ko sab chhaan-na padta.` },
    { type: 'callout', tone: 'term', title: 'Partition', html: `<strong>Ye kya hai:</strong> topic ke tukde. Har partition apne aap mein ek alag append-only log hai, aur alag broker pe reh sakta hai.<br><strong>Kyun chahiye:</strong> ek topic ka saara traffic ek machine pe nahi aata, aur kai readers alag partitions parallel padh sakte hain.<br><strong>Iske bina:</strong> topic ek machine ki speed pe atak jaata.<br><strong>Example:</strong> <code>video-events</code> ke 6 partitions, 3 brokers pe, har broker pe 2.` },
    { type: 'callout', tone: 'term', title: 'Offset', html: `<strong>Ye kya hai:</strong> partition ke andar record ka number (0, 1, 2...). Jaise kitaab ka page number.<br><strong>Kyun chahiye:</strong> reader ko bas ek number yaad rakhna hai: "main page 42 tak padh chuka". Isko <strong>committed offset</strong> (bookmark) kehte hain.<br><strong>Iske bina:</strong> broker ko har message ke liye yaad rakhna padta ki kisne padha, jo bahut bhaari hai.<br><strong>Dhyaan:</strong> order sirf <em>ek partition ke andar</em> guaranteed hai, poore topic mein nahi.` },
    { type: 'callout', tone: 'term', title: 'Producer aur consumer (Kafka mein)', html: `<strong>Ye kya hai:</strong> producer = jo records topic mein likhta hai. Consumer = jo padhta hai. Kafka consumer khud <strong>pull</strong> karta hai ("mujhe offset 43 se do"), broker push nahi karta.<br><strong>Kyun chahiye:</strong> pull se har consumer apni speed pe padhta hai. Slow consumer pe broker data nahi thopta.<br><strong>Iske bina:</strong> broker ko har consumer ki speed sambhalni padti.` },
    { type: 'ascii', text: `
Topic: video-events   (3 partitions)

Partition 0:  [0][1][2][3][4][5][6][7]  ← naya record yahan judta hai
Partition 1:  [0][1][2][3][4]
Partition 2:  [0][1][2][3][4][5][6]
                       ↑           ↑
          analytics ka bookmark    search ka bookmark
          (offset 2 tak padha)     (offset 6 tak padha)

Records padhne se delete NAHI hote. Retention (jaise 7 din) ke baad purane segments delete.`, caption: 'Har consumer group ka apna bookmark (committed offset) hota hai.' },
    { type: 'callout', tone: 'term', title: 'Consumer group', html: `<strong>Ye kya hai:</strong> ek "team" jo topic ko milke padhti hai, jaise "search-indexer" group mein 4 machines. Niyam: <strong>group ke andar har partition sirf ek consumer ko milta hai</strong>. Alag groups bilkul independent: har group ko poora topic milta hai, apne bookmarks ke saath.<br><strong>Kyun chahiye:</strong> group ke andar kaam baant jaata hai (queue jaisa), aur groups ke beech har team ko poori copy milti hai (pub/sub jaisa). Ek hi cheez se dono.<br><strong>Iske bina:</strong> ya to har machine poora topic padhti (duplicate kaam), ya har team ke liye data ki copy banani padti.<br><strong>Example:</strong> 6 partitions, search group mein 3 machines → har machine ko 2 partitions. Analytics group bhi wahi 6 partitions alag se padhta hai.` },

    { type: 'callout', tone: 'term', title: 'Message key', html: `<strong>Ye kya hai:</strong> har record ke saath ek chhota label jo producer deta hai, jaise <code>video_7</code>. Kafka key ka hash nikaal ke partition chunta hai: <code>hash(key) % partitions</code>. <strong>Hash</strong> = ek function jo text ko ek bada number bana deta hai; same text pe hamesha same number.<br><strong>Kyun chahiye:</strong> same key hamesha same partition mein jaati hai, to ek video ke saare events ek hi line mein, order mein.<br><strong>Iske bina:</strong> ek video ke events alag partitions mein bikhar jaate, aur "deleted" pehle process ho sakta tha, "published" baad mein.` },
    { type: 'callout', tone: 'term', title: 'Consumer lag', html: `<strong>Ye kya hai:</strong> reader kitna pichhe hai. Lag = partition ka latest offset − group ka committed offset.<br><strong>Kyun chahiye:</strong> Kafka ki sabse zaroori health metric. Lag badh raha hai = consumer producer se slow hai.<br><strong>Iske bina:</strong> pata hi nahi chalega ki search 2 ghante purana data dikha raha hai.<br><strong>Example:</strong> latest offset 10,000, committed 9,400 → lag 600 records.` },
    { type: 'h2', text: 'Chala ke dekho: ek topic, do teams' },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'prod', label: 'Upload service', sub: 'producer', x: 90, y: 165, w: 140, kind: 'server', info: 'Ye kya hai: video upload karne wali service, yahan producer. Har event ke saath ek key bhejta hai (yahan video_id). Same key hamesha same partition mein jaati hai, isliye ek video ke events order mein rehte hain.' },
        { id: 'p0', label: 'Partition 0', sub: 'offset 0..41', x: 330, y: 90, w: 150, kind: 'queue', info: 'Ye kya hai: topic ka pehla tukda, ek append-only log. Naye records end mein judte hain. Padhne se kuch delete nahi hota. Retention (default 7 din) ke baad purane hisse delete hote hain.' },
        { id: 'p1', label: 'Partition 1', sub: 'offset 0..37', x: 330, y: 240, w: 150, kind: 'queue', info: 'Ye kya hai: topic ka doosra tukda, aksar doosre broker pe. Partitions jitne zyada, ek group mein utne zyada consumers parallel kaam kar sakte hain.' },
        { id: 'gA', label: 'Search indexer', sub: 'group: search', x: 600, y: 60, w: 170, kind: 'server', info: 'Ye kya hai: search team ka consumer group "search". Har video ko search index (Elasticsearch jaisa) mein daalta hai. Apna offset khud commit karta hai.' },
        { id: 'gB', label: 'Analytics', sub: 'group: analytics', x: 600, y: 165, w: 170, kind: 'server', info: 'Ye kya hai: analytics team ka consumer group. Search se bilkul independent. Ye slow ho ya down ho, search pe koi asar nahi.' },
        { id: 'rec', label: 'Recommendations', sub: 'group: recs (naya)', x: 600, y: 275, w: 170, kind: 'server', hidden: true, info: 'Ye kya hai: nayi recommendations team ka naya consumer group. Pehli baar aaya hai, to offset 0 se (sabse purane available record se) padhna shuru kar sakta hai: ye replay hai.' },
      ],
      edges: [{ a: 'prod', b: 'p0' }, { a: 'prod', b: 'p1' }, { a: 'p0', b: 'gA' }, { a: 'p1', b: 'gA' }, { a: 'p0', b: 'gB' }, { a: 'p1', b: 'gB' }, { a: 'p0', b: 'rec', id: 'p0r', hidden: true }, { a: 'p1', b: 'rec', id: 'p1r', hidden: true }],
      scenarios: [
        { name: 'Likho aur padho', steps: [
          { title: 'Producer event likhta hai', text: 'Key = video_7. Kafka key ka hash nikaal ke partition chunta hai: <code>hash(key) % partitions</code>. video_7 → partition 0. Record end mein juda, offset mila 42.', go: 'prod>p0', after: { p0: { sub: 'offset 0..42' } }, msg: 'produce topic=video-events key="video_7"\nvalue={ "type": "uploaded", "video_id": 7 }\n→ partition 0, offset 42' },
          { title: 'Doosri key, doosra partition', text: 'video_9 ka hash partition 1 deta hai. Alag videos alag partitions mein, parallel.', go: 'prod>p1', after: { p1: { sub: 'offset 0..38' } }, msg: 'key="video_9" → partition 1, offset 38' },
          { title: 'Dono groups padhte hain', text: 'Search aur analytics dono ko <strong>same record</strong> milta hai. Koi copy nahi bani: dono same log ko padh rahe hain, bas dono ke bookmarks alag hain.', parallel: true, go: ['evt:p0>gA', 'evt:p0>gB'], after: { gA: { state: 'ok' }, gB: { state: 'ok' } } },
          { title: 'Offset commit', text: 'Kaam ke baad har group apna offset commit karta hai: "search ne partition 0 mein 42 tak padh liya". Ye bookmark Kafka ke andar ek internal topic (<code>__consumer_offsets</code>) mein save hota hai. Record abhi bhi log mein hai.', focus: ['gA', 'gB'], msg: 'commit group=search  partition=0  offset=43  (agla padhna hai)' },
        ]},
        { name: 'Replay: nayi team', intro: 'Recommendations team aaj join hui. Use pichhle 7 din chahiye.', steps: [
          { title: 'Naya consumer group', text: 'Naye group ka koi committed offset nahi hai. Setting <code>auto.offset.reset=earliest</code> ("bookmark na ho to shuru se padho") se wo sabse purane bache record se shuru karta hai.', show: ['rec', 'p0r', 'p1r'], focus: ['rec'] },
          { title: 'Shuru se padhna', text: 'Producer ko kuch nahi karna pada. Search aur analytics ko pata bhi nahi chala. Naya group 7 din ke events apni speed se padh raha hai.', parallel: true, go: ['evt:p0>rec', 'evt:p1>rec'], after: { rec: { state: 'hot', sub: 'replaying 7 days' } } },
          { title: 'Bug fix ke baad rewind', text: 'Analytics ke code mein bug tha. Fix deploy kiya, phir group ka offset kal subah pe reset kar diya. Kal ke saare events dobara process. Queue mein ye possible hi nahi tha.', go: 'evt:p0>gB', set: { gB: { state: 'warn', sub: 'rewound to yesterday' } }, msg: 'kafka-consumer-groups --group analytics --reset-offsets --to-datetime 2026-10-03T00:00:00 --execute' },
        ]},
        { name: 'Crash before commit', intro: 'Search indexer ne kaam kiya, lekin offset commit se pehle mar gaya.', steps: [
          { title: 'Records 43-45 process hue', text: 'Search ne teen records index kar diye.', go: 'evt:p0>gA', set: { gA: { state: 'hot', sub: 'indexed 43..45' } } },
          { title: 'Crash, commit nahi hua', text: 'Committed offset abhi bhi 43 hai.', set: { gA: { state: 'down', sub: 'CRASHED' } }, focus: ['gA'] },
          { title: 'Restart: 43 se dobara', text: 'Naya instance committed offset 43 se padhta hai. 43-45 <strong>dobara</strong> process. Yahi Kafka ka at-least-once hai. Bachaav: indexing <strong>idempotent</strong> rakho (video_id se upsert), to dobara karne se kuch nahi bigadta.', go: 'evt:p0>gA', set: { gA: { state: 'ok', sub: 'reprocessed 43..45' } } },
        ]},
        { name: 'Slow consumer (lag)', steps: [
          { title: 'Analytics down', text: 'Analytics ka cluster 2 ghante ke liye down.', set: { gB: { state: 'down', sub: 'DOWN' } }, focus: ['gB'] },
          { title: 'Baaki sab normal', text: 'Producer likhta raha, search padhta raha. Ek consumer ki problem doosron tak nahi pahunchi. Analytics ka <strong>consumer lag</strong> (latest offset minus uska offset) badhta gaya.', flood: { paths: ['prod>p0', 'prod>p1'], n: 8 }, after: { gB: { sub: 'lag: 2 hours' } } },
          { title: 'Wapas aake catch up', text: 'Analytics apne bookmark se aage padhne laga. Lekin dhyaan: agar lag <strong>retention se zyada</strong> ho jaata (maan lo 8 din down), to purane records delete ho chuke hote aur wo data us group ke liye gaya. Isliye lag pe alarm lagate hain.', parallel: true, go: ['evt:p0>gB', 'evt:p1>gB'], set: { gB: { state: 'ok', sub: 'catching up' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'Simulator: partitions aur consumers' },
    { type: 'p', html: `Consumer group mein ek partition ek hi consumer ko milta hai. Partitions aur consumers ki ginti badlo aur dekho kaun kya padhta hai. Phir ek key type karo (jaise <code>user_42</code>) aur dekho wo kis partition mein jaati hai, aur partitions badhane pe kya hota hai.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Partitions: <strong class="kc-vp"></strong></label><input class="kc-p" type="range" min="1" max="12" step="1" value="6"></div>
          <div><label>Consumers in group: <strong class="kc-vc"></strong></label><input class="kc-c" type="range" min="1" max="12" step="1" value="4"></div>
        </div>
        <div class="kc-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;margin-top:14px"></div>
        <div class="stats">
          <div class="stat"><span>Active consumers</span><strong class="kc-act"></strong></div>
          <div class="stat"><span>Idle consumers</span><strong class="kc-idle"></strong></div>
          <div class="stat"><span>Max parallelism</span><strong class="kc-par"></strong></div>
        </div>
        <div class="calc-note kc-note"></div>
        <div style="margin-top:16px"><label>Key type karo</label><input class="kc-key" type="text" value="user_42"></div>
        <div class="stats">
          <div class="stat"><span>Partition (abhi)</span><strong class="kc-kp"></strong></div>
          <div class="stat"><span>Kaunsa consumer</span><strong class="kc-kc"></strong></div>
          <div class="stat"><span>Partition (+1 partition ke baad)</span><strong class="kc-kp2"></strong></div>
        </div>
        <div class="calc-note kc-knote"></div>`;
      const $ = c => el.querySelector(c);
      // Simple deterministic string hash (FNV-1a 32-bit). Real Kafka uses murmur2; idea is the same.
      const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
      // Range-style assignment: first (P % C) consumers get one extra partition.
      const assign = (P, C) => { const out = []; const base = Math.floor(P / C), extra = P % C; let p = 0; for (let c = 0; c < C; c++) { const n = base + (c < extra ? 1 : 0); const list = []; for (let k = 0; k < n; k++) list.push(p++); out.push(list); } return out; };
      const upd = () => {
        const P = +$('.kc-p').value, C = +$('.kc-c').value;
        $('.kc-vp').textContent = P; $('.kc-vc').textContent = C;
        const a = assign(P, C), owner = {};
        a.forEach((list, c) => list.forEach(p => owner[p] = c));
        $('.kc-grid').innerHTML = a.map((list, c) => `<div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:8px 10px;background:${list.length ? 'var(--surface)' : 'var(--surface-2)'};opacity:${list.length ? 1 : 0.65}">
            <div style="font:600 13px var(--f-display);color:var(--ink)">Consumer ${c + 1}</div>
            <div style="font:12px var(--f-mono);color:${list.length ? 'var(--ink-2)' : 'var(--red)'};margin-top:4px">${list.length ? list.map(p => 'P' + p).join(', ') : 'IDLE'}</div></div>`).join('');
        const active = a.filter(l => l.length).length;
        $('.kc-act').textContent = active; $('.kc-idle').textContent = C - active; $('.kc-par').textContent = Math.min(P, C);
        const counts = a.filter(l => l.length).map(l => l.length);
        let note;
        if (C > P) note = `${C} consumers, sirf ${P} partitions: ${C - P} consumers khaali baithe hain. Group ki parallelism partitions ki ginti se zyada nahi ho sakti. Isliye topic banate time aage ki growth ke hisaab se partitions rakho.`;
        else if (Math.max(...counts) !== Math.min(...counts)) note = `Partitions barabar nahi bante (${P} ÷ ${C}): kuch consumers ke paas ${Math.max(...counts)} partitions, kuch ke paas ${Math.min(...counts)}. Jiske paas zyada, wahi group ki speed tay karega.`;
        else note = `Barabar bantwara: har consumer ke paas ${counts[0]} partition(s). Ek consumer gire to rebalance hoke uske partitions baaki consumers mein baant diye jaate hain.`;
        $('.kc-note').textContent = note;
        const key = $('.kc-key').value || '';
        if (!key) { $('.kc-kp').textContent = '-'; $('.kc-kc').textContent = '-'; $('.kc-kp2').textContent = '-'; $('.kc-knote').textContent = 'Koi key daalo.'; return; }
        const h = hash(key), kp = h % P, kp2 = h % (P + 1);
        $('.kc-kp').textContent = 'P' + kp;
        $('.kc-kc').textContent = 'Consumer ' + (owner[kp] + 1);
        $('.kc-kp2').textContent = 'P' + kp2;
        let moved = 0; for (let i = 1; i <= 100; i++) { const hh = hash('user_' + i); if (hh % P !== hh % (P + 1)) moved++; }
        $('.kc-knote').textContent = `Same key hamesha P${kp} mein jaayegi, to "${key}" ke saare events order mein rahenge. Lekin partitions ${P} se ${P + 1} karte hi ${kp === kp2 ? 'ye key to wahin rahi, par' : 'ye key P' + kp2 + ' pe chali gayi, aur'} user_1..user_100 mein se ${moved} keys ka partition badal gaya. Badlaav ke time naye aur purane events alag partitions mein = us key ka order toot sakta hai. (Simulator simple hash use karta hai; asli Kafka murmur2 use karta hai, idea same hai.)`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'term', title: 'Rebalance', html: `<strong>Ye kya hai:</strong> group mein koi consumer aaya ya gaya, to partitions dobara baant-na. Kafka ka <strong>group coordinator</strong> (ek broker) ye karwata hai. Consumers usse lagataar <strong>heartbeat</strong> ("main zinda hoon") bhejte hain; heartbeat band = consumer mara maana jaata hai.<br><strong>Kyun chahiye:</strong> mara hua consumer ke partitions kisi ko to padhne honge, aur naya consumer aaye to use bhi kaam milna chahiye.<br><strong>Iske bina:</strong> crash hue consumer ke partitions hamesha ke liye ruk jaate.<br><strong>Do style:</strong> <strong>eager</strong> (purana tareeka): sab consumers apne saare partitions chhod dete hain, sab rukta hai, phir naya bantwara ("stop-the-world"). <strong>Cooperative / incremental</strong>: sirf wahi partitions hilte hain jinka owner badalna hai, baaki chalte rehte hain. Kafka 4.0 mein naya consumer group protocol (KIP-848) GA hua, jo isi incremental idea pe hai (consumer pe <code>group.protocol=consumer</code>).` },
    { type: 'p', html: `<strong>Consumer group lab.</strong> Topic ke 6 partitions, har partition mein producer 100 records/second likhta hai (kul 600/s). Har consumer 250 records/second padh sakta hai. Shuru mein 2 consumers. "▶ 10 s" dabao, phir consumer jodo ya crash karo, aur har partition ka lag dekho. Rebalance ke time partition 2 second ruk jaata hai (peela). Crash ke baad group ko pata chalne mein 3 second lagte hain (heartbeat band).` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="kg-strat" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
          <button type="button" class="btn small primary kg-t1">▶ 1 s</button><button type="button" class="btn small primary kg-t10">▶ 10 s</button>
          <button type="button" class="btn small kg-add">+ Consumer</button><button type="button" class="btn small kg-crash">Consumer crash</button><button type="button" class="btn small ghost kg-reset">Reset</button>
        </div>
        <div class="kg-mem" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px"></div>
        <div class="kg-parts" style="display:grid;gap:6px;margin-top:10px"></div>
        <div class="stats">
          <div class="stat"><span>Time</span><strong class="kg-o-t"></strong></div>
          <div class="stat"><span>Total lag</span><strong class="kg-o-lag"></strong></div>
          <div class="stat"><span>Padhne ki speed / aane ki speed</span><strong class="kg-o-cap"></strong></div>
        </div>
        <ol class="kg-log" style="margin:10px 0 0;padding-left:22px;font:13px/1.6 var(--f-mono);color:var(--ink-2)"></ol>
        <div class="calc-note kg-note"></div>`;
      const P = 6, RATE = 100, CAP = 250, DETECT = 3, PAUSE = 2;
      let strat = 'eager', S;
      const mk = st => {
        const S = { t: 0, strat: st, members: [{ id: 1, alive: true }, { id: 2, alive: true }], next: 3, owner: [], latest: Array(P).fill(1000), done: Array(P).fill(1000), paused: Array(P).fill(0), rebAt: null, log: [] };
        const live = () => S.members.filter(m => m.alive).map(m => m.id);
        const range = ids => { const o = []; const n = ids.length, base = Math.floor(P / n), ex = P % n; let p = 0; ids.forEach((id, i) => { for (let k = 0; k < base + (i < ex ? 1 : 0); k++) o[p++] = id; }); return o; };
        const sticky = ids => { const n = ids.length, cap = Math.ceil(P / n), cnt = {}; ids.forEach(i => cnt[i] = 0); const o = Array(P).fill(null);
          for (let p = 0; p < P; p++) { const w = S.owner[p]; if (w != null && cnt[w] != null && cnt[w] < cap && cnt[w] < Math.floor(P / n)) { o[p] = w; cnt[w]++; } }
          for (let p = 0; p < P; p++) if (o[p] == null) { const w = ids.slice().sort((a, b) => cnt[a] - cnt[b] || a - b)[0]; o[p] = w; cnt[w]++; } return o; };
        S.live = live;
        S.rebalance = () => { const ids = live(); const o = S.strat === 'eager' ? range(ids) : sticky(ids); const moved = []; for (let p = 0; p < P; p++) if (o[p] !== S.owner[p]) moved.push(p);
          for (let p = 0; p < P; p++) if (S.strat === 'eager' || moved.includes(p)) S.paused[p] = PAUSE; S.owner = o; S.rebAt = null;
          S.log.push(`t=${S.t}s rebalance (${S.strat === 'eager' ? 'eager: sab ruke' : 'cooperative'}): ${moved.length ? moved.map(p => 'P' + p).join(', ') + ' ka owner badla' : 'koi badlaav nahi'}`); };
        S.owner = range(live());
        S.add = () => { if (S.members.length >= 8) return; S.members.push({ id: S.next++, alive: true }); S.rebAt = S.t; S.log.push(`t=${S.t}s C${S.next - 1} group mein aaya`); };
        S.crash = () => { const m = S.members.filter(m => m.alive).pop(); if (!m || live().length < 2) return; m.alive = false; S.rebAt = S.t + DETECT; S.log.push(`t=${S.t}s C${m.id} crash (group ko abhi pata nahi)`); };
        S.tick = () => { if (S.rebAt !== null && S.t >= S.rebAt) S.rebalance();
          const ids = live(), np = {}; S.owner.forEach(o => np[o] = (np[o] || 0) + 1);
          for (let p = 0; p < P; p++) { S.latest[p] += RATE; const o = S.owner[p]; if (S.paused[p] > 0) { S.paused[p]--; continue; } if (!ids.includes(o)) continue; S.done[p] = Math.min(S.latest[p], S.done[p] + CAP / np[o]); }
          S.t++; };
        S.lag = () => S.latest.reduce((a, l, p) => a + l - S.done[p], 0);
        return S;
      };
      const draw = () => {
        const sb = el.querySelector('.kg-strat'); sb.innerHTML = '';
        [['eager', 'Eager rebalance (stop-the-world)'], ['coop', 'Cooperative (sticky)']].forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small' + (strat === k ? ' primary' : ''); b.textContent = v; b.onclick = () => { strat = k; S = mk(strat); draw(); }; sb.appendChild(b); });
        const ids = S.live();
        el.querySelector('.kg-mem').innerHTML = S.members.map(m => `<span class="chip${m.alive ? ' on' : ''}" style="${m.alive ? '' : 'color:var(--red);text-decoration:line-through'}">C${m.id}</span>`).join('');
        el.querySelector('.kg-parts').innerHTML = Array.from({ length: P }, (_, p) => {
          const lag = Math.round(S.latest[p] - S.done[p]), o = S.owner[p], dead = !ids.includes(o), pz = S.paused[p] > 0;
          const st = dead ? 'owner mara: koi nahi padh raha' : pz ? 'rebalance: ruka' : '';
          const col = dead ? 'var(--red)' : pz ? 'var(--amber)' : 'var(--accent)';
          return `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;font:13px var(--f-mono);color:var(--ink-2)"><span style="min-width:62px"><strong style="color:var(--ink)">P${p}</strong>→C${o}</span>
            <span style="flex:1;min-width:50px;height:12px;background:var(--surface-2);border-radius:6px;overflow:hidden"><span style="display:block;height:100%;width:${Math.min(100, lag / 15)}%;background:${col}"></span></span>
            <span style="min-width:64px">lag ${lag}</span>${st ? `<span style="color:${col};font-size:12px">${st}</span>` : ''}</div>`; }).join('');
        el.querySelector('.kg-o-t').textContent = S.t + ' s';
        el.querySelector('.kg-o-lag').textContent = Math.round(S.lag()).toLocaleString('en-IN');
        const cap = Math.min(ids.length * CAP, P * CAP);
        el.querySelector('.kg-o-cap').textContent = cap + ' / ' + P * RATE;
        el.querySelector('.kg-log').innerHTML = S.log.slice(-4).map(l => '<li>' + l + '</li>').join('') || '<li>Abhi koi event nahi. ▶ dabao.</li>';
        let n = cap < P * RATE ? `${ids.length} consumers × 250 = ${cap}/s, lekin aa rahe hain 600/s. Lag har second badhega. Kam se kam 3 consumers chahiye (600 ÷ 250 = 2.4).` : `${ids.length} consumers × 250 = ${cap}/s, aane wale 600/s se zyada. Lag ghatega aur 0 tak aayega.`;
        if (ids.length > P) n += ` Lekin ${ids.length - P} consumers ke paas koi partition nahi: wo idle hain.`;
        if (S.rebAt !== null) n += ` Crash ka pata ${S.rebAt - S.t} second mein chalega; tab tak mare consumer ke partitions ka lag badhta rahega.`;
        n += strat === 'eager' ? ' Eager mode: har rebalance pe saare 6 partitions 2 s ruke.' : ' Cooperative mode: rebalance pe sirf jinka owner badla wahi ruke.';
        el.querySelector('.kg-note').textContent = n;
      };
      el.querySelector('.kg-t1').onclick = () => { S.tick(); draw(); };
      el.querySelector('.kg-t10').onclick = () => { for (let i = 0; i < 10; i++) S.tick(); draw(); };
      el.querySelector('.kg-add').onclick = () => { S.add(); draw(); };
      el.querySelector('.kg-crash').onclick = () => { S.crash(); draw(); };
      el.querySelector('.kg-reset').onclick = () => { S = mk(strat); draw(); };
      S = mk(strat); draw();
    }},
    { type: 'callout', tone: 'tip', html: `Try karo: "▶ 10 s" (2 consumers, lag 1,000 tak badha), phir "+ Consumer", phir "▶ 10 s". Eager mode mein add ke baad saare partitions 2 s ruke aur t=20 pe lag 1,000. Reset karke Cooperative chuno, wahi steps: sirf P2, P5 hile, aur t=20 pe lag sirf 333. Isliye naye systems cooperative / KIP-848 rebalancing use karte hain.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Consumers badhao, speed badh jaayegi." Sirf partitions ki ginti tak! 6 partitions pe 10 consumers lagaoge to 4 bekaar baithe rahenge. Aur ek partition ke andar kaam ek hi consumer karta hai, to ek slow partition (hot key) poore group ko pichhe rakh sakta hai.` },

    { type: 'h2', text: 'Ordering per key' },
    { type: 'p', html: `Kafka sirf <strong>ek partition ke andar</strong> order ki guarantee deta hai, poore topic mein nahi. To jin events ka order maayne rakhta hai unhe same partition mein bhejo, yaani <strong>same key</strong> do. Example: ek video ke events <code>uploaded → transcoded → published → deleted</code>. Key = <code>video_id</code>. Agar key random hoti to "deleted" pehle process ho sakta tha aur "published" baad mein: deleted video phir se dikhne lagta.` },
    { type: 'list', items: [
      `<strong>Key choose karna = shard key choose karna.</strong> Key aisi ho jo order ki zaroorat ko capture kare (order_id, user_id, video_id) aur load ko bhi barabar baante.`,
      `<strong>Hot key:</strong> ek celebrity ke video pe crore events, sab ek partition mein. Wo partition aur uska consumer bottleneck. Upaay: key mein thoda split (<code>video_7#3</code>) jahan strict order zaroori nahi.`,
      `<strong>Partitions baad mein badhaye to</strong> <code>hash % N</code> badal jaata hai, keys naye partitions pe jaati hain (simulator mein dekha). Isliye shuru mein hi socha-samjha number rakho.`,
      `<strong>Key nahi di?</strong> Producer records ko partitions mein faila deta hai (load ke liye achha, order ki koi guarantee nahi).`,
    ]},

    { type: 'p', html: `<strong>Ordering lab.</strong> 5 events is order mein bheje gaye: video 7 uploaded, video 9 uploaded, video 7 published, video 9 published, video 7 deleted. Topic ke 3 partitions, har partition ka apna consumer. Key ke saath aur bina key ke dekho, aur P2 ke consumer ko slow karo (jaise ek lamba GC pause: program memory saaf karne ke liye kuch der ruk jaata hai).` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="ko-modes" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <label style="display:block;margin-top:10px;font:14px var(--f-body);color:var(--ink-2)"><input class="ko-slow" type="checkbox" checked> P2 ka consumer slow (har event 3 second)</label>
        <div class="ko-parts" style="display:grid;gap:6px;margin-top:10px;font:13px var(--f-mono);color:var(--ink-2)"></div>
        <ol class="ko-log" style="margin:10px 0 0;padding-left:22px;font:13px/1.6 var(--f-mono);color:var(--ink-2)"></ol>
        <div class="stats">
          <div class="stat"><span>Video 7 ka final status</span><strong class="ko-v7"></strong></div>
          <div class="stat"><span>Video 9 ka final status</span><strong class="ko-v9"></strong></div>
        </div>
        <div class="calc-note ko-note"></div>`;
      const EV = [['7', 'uploaded'], ['9', 'uploaded'], ['7', 'published'], ['9', 'published'], ['7', 'deleted']];
      let mode = 'key';
      const run = () => {
        const box = el.querySelector('.ko-modes'); box.innerHTML = '';
        [['key', 'Key = video_id'], ['nokey', 'Bina key (round robin)']].forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small' + (mode === k ? ' primary' : ''); b.textContent = v; b.onclick = () => { mode = k; run(); }; box.appendChild(b); });
        const slow = el.querySelector('.ko-slow').checked;
        const parts = [[], [], []];
        EV.forEach((e, i) => { const p = mode === 'key' ? (e[0] === '7' ? 0 : 1) : i % 3; parts[p].push(e); });
        const done = [];
        parts.forEach((list, p) => { let t = 0; list.forEach(e => { t += p === 2 && slow ? 3 : 1; done.push({ t, p, e }); }); });
        done.sort((a, b) => a.t - b.t || a.p - b.p);
        const state = {};
        done.forEach(d => { state[d.e[0]] = d.e[1]; });
        el.querySelector('.ko-parts').innerHTML = parts.map((l, p) => `<div><strong style="color:var(--ink)">P${p}</strong>: ${l.length ? l.map(e => 'v' + e[0] + ' ' + e[1]).join(' → ') : '(khaali)'}</div>`).join('');
        el.querySelector('.ko-log').innerHTML = done.map(d => `<li>t=${d.t}s · P${d.p} consumer: video ${d.e[0]} → ${d.e[1]}</li>`).join('');
        const v7 = el.querySelector('.ko-v7'); v7.textContent = state['7']; v7.style.color = state['7'] === 'deleted' ? 'var(--green)' : 'var(--red)';
        const v9 = el.querySelector('.ko-v9'); v9.textContent = state['9']; v9.style.color = state['9'] === 'published' ? 'var(--green)' : 'var(--red)';
        el.querySelector('.ko-note').textContent = mode === 'key' ? 'Video 7 ke teeno events ek hi partition (P0) mein, to ek hi consumer ne line se process kiye. Slow consumer ho ya na ho, final status sahi: deleted.' : state['7'] === 'deleted' ? 'Bina key ke video 7 ke events P0, P2, P1 mein bikhar gaye. Abhi luck se order sahi raha, kyunki sab consumers ek jaisi speed pe the. "Slow" on karke dekho.' : 'Bina key: video 7 ka "published" slow P2 mein atka raha aur "deleted" ke BAAD process hua. Deleted video phir se published dikh raha hai! Topic mein global order nahi hota, sirf partition ke andar.';
      };
      el.querySelector('.ko-slow').addEventListener('change', run); run();
    }},
    { type: 'h2', text: 'Retention aur replay' },
    { type: 'callout', tone: 'term', title: 'Retention', html: `<strong>Ye kya hai:</strong> Kafka records kitni der rakhega. Default 7 din (<code>log.retention.hours=168</code>). Uske baad purane hisse (segments) delete, chahe kisi ne padha ho ya nahi.<br><strong>Kyun chahiye:</strong> disk anant nahi hai. Aur readers ko pichhe jaane ki ek tay khidki milti hai.<br><strong>Iske bina:</strong> ya to disk bhar jaati, ya padhte hi delete (queue jaisa, replay khatam).` },
    { type: 'callout', tone: 'term', title: 'Replay (rewind)', html: `<strong>Ye kya hai:</strong> consumer group ka bookmark pichhe le jaana aur wahan se dobara padhna.<br><strong>Kyun chahiye:</strong> bug fix ke baad galat processing theek karna, nayi team ko history dena, naye system ko shuru se bharna.<br><strong>Iske bina:</strong> galti hamesha ke liye data mein reh jaati.` },
    { type: 'callout', tone: 'term', title: 'Log compaction', html: `<strong>Ye kya hai:</strong> time ke hisaab se delete karne ki jagah, har key ka sirf <strong>latest</strong> record bachao (<code>cleanup.policy=compact</code>).<br><strong>Kyun chahiye:</strong> jab topic kisi "current state" ko represent kare, jaise har user ki latest profile. Naya consumer shuru se padh ke poori current state bana sakta hai, bina saalon ki history ke.<br><strong>Iske bina:</strong> ya to sab history rakho (mehenga), ya purana delete karo aur kuch keys ki state hi gayab.<br><strong>Example:</strong> user_42 ne 50 baar naam badla. Compaction ke baad sirf aakhri naam bacha.` },
    { type: 'table', head: ['Setting', 'Matlab', 'Kab'], rows: [
      ['Time retention (default 7 din: <code>log.retention.hours=168</code>)', 'Itne purane records delete', 'Normal event streams'],
      ['Size retention', 'Partition itna bada ho to purana hissa delete', 'Disk budget fix ho'],
      ['Log compaction (<code>cleanup.policy=compact</code>)', 'Har key ka sirf <strong>latest</strong> record bachao', 'Jaise "user ki latest profile" ya table ki current state: naya consumer poori state bana sake'],
      ['Infinite / tiered storage', 'Purana data sasti storage pe', 'Event log hi source of truth ho (event sourcing)'],
    ]},
    { type: 'p', html: `Replay ke teen bade use: <strong>nayi team</strong> ko history chahiye, <strong>bug fix</strong> ke baad dobara process, aur <strong>naya system</strong> (jaise nayi search engine) ko shuru se bharna. Ye Kafka ki sabse badi taakat hai jo queue mein nahi hai.` },

    { type: 'p', html: `<strong>Retention + replay calculator.</strong> xyz.com ka <code>video-events</code> topic: roz 10 lakh events (har event ~1 KB), replication factor 3. Analytics consumer apni poori speed pe roz 30 lakh events padh sakta hai. Retention aur "analytics kitne din down raha" badlo.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Retention: <strong class="kr-vr"></strong></label><input class="kr-r" type="range" min="1" max="14" step="1" value="7"></div>
          <div><label>Analytics down raha: <strong class="kr-vd"></strong></label><input class="kr-d" type="range" min="0" max="12" step="1" value="2"></div>
        </div>
        <svg class="kr-svg" viewBox="0 0 600 120" style="width:100%;height:auto;display:block;margin-top:10px" role="img" aria-label="Retention window"></svg>
        <div class="stats">
          <div class="stat"><span>Wapas aane pe lag</span><strong class="kr-o-lag"></strong></div>
          <div class="stat"><span>Kho gaye (retention se bahar)</span><strong class="kr-o-lost"></strong></div>
          <div class="stat"><span>Catch-up time</span><strong class="kr-o-cu"></strong></div>
          <div class="stat"><span>Disk (3 copies)</span><strong class="kr-o-disk"></strong></div>
        </div>
        <div class="calc-note kr-note"></div>`;
      const RATE = 1e6, SPEED = 3e6;
      const L = n => (n / 1e5).toLocaleString('en-IN') + ' lakh';
      const upd = () => {
        const R = +el.querySelector('.kr-r').value, D = +el.querySelector('.kr-d').value;
        el.querySelector('.kr-vr').textContent = R + ' din'; el.querySelector('.kr-vd').textContent = D + ' din';
        const lost = Math.max(0, D - R) * RATE, lag = Math.min(D, R) * RATE, cuH = lag / (SPEED - RATE) * 24;
        const W = 14, X = d => 30 + (d / W) * 540;
        let svg = `<rect x="${X(W - R)}" y="30" width="${X(W) - X(W - R)}" height="34" rx="4" fill="var(--accent-soft)" stroke="var(--accent)"/>
          <text x="${X(W - R / 2)}" y="52" text-anchor="middle" font-size="14" fill="var(--ink)" font-family="var(--f-mono)">retention: ${R} din</text>
          <line x1="30" x2="570" y1="80" y2="80" stroke="var(--line-2)"/>
          <text x="30" y="100" font-size="14" fill="var(--ink-3)" font-family="var(--f-mono)">14 din pehle</text><text x="570" y="100" text-anchor="end" font-size="14" fill="var(--ink-3)" font-family="var(--f-mono)">aaj</text>`;
        if (D > 0) svg += `<line x1="${X(W - D)}" x2="${X(W - D)}" y1="18" y2="80" stroke="${D > R ? 'var(--red)' : 'var(--green)'}" stroke-width="3"/><text x="${Math.max(X(W - D), 100)}" y="14" text-anchor="middle" font-size="13" fill="${D > R ? 'var(--red)' : 'var(--green)'}" font-family="var(--f-mono)">analytics ka bookmark</text>`;
        el.querySelector('.kr-svg').innerHTML = svg;
        el.querySelector('.kr-o-lag').textContent = L(lag);
        const lo = el.querySelector('.kr-o-lost'); lo.textContent = lost ? L(lost) : '0'; lo.style.color = lost ? 'var(--red)' : 'var(--green)';
        el.querySelector('.kr-o-cu').textContent = lag ? Math.round(cuH) + ' ghante' : '-';
        el.querySelector('.kr-o-disk').textContent = R * 3 + ' GB';
        el.querySelector('.kr-note').textContent = (D === 0 ? 'Koi downtime nahi, lag 0. ' : D > R ? `Analytics ${D} din down raha, retention sirf ${R} din. Bookmark ke baad ke pehle ${D - R} din ke records delete ho chuke: ${L(lost)} events hamesha ke liye gaye. Isliye lag pe alarm, aur retention normal downtime se lamba rakho. ` : `Analytics ${D} din pichhe hai, lekin sab records abhi retention mein hain. Kuch nahi khoya. Wo 30 lakh/din padhta hai aur 10 lakh/din naye aate hain, to har din 20 lakh lag ghatta hai: ${Math.round(cuH)} ghante mein barabar. `) + `Nayi team aaj aaye to ${R} din (${L(R * RATE)} events) ka history replay kar sakti hai. Keemat: ${R} din × 10 lakh × 1 KB × 3 copies = ${R * 3} GB disk.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'h2', text: 'Replication: broker gire to data na jaaye' },
    { type: 'p', html: `2011 ke paper mein replication "future work" thi. Aaj har partition ki kai copies hoti hain (<strong>replication factor</strong>, aam taur pe 3), alag alag brokers pe.` },
    { type: 'callout', tone: 'term', title: 'Replication factor, leader, follower', html: `<strong>Ye kya hai:</strong> har partition ki kai copies (<strong>replicas</strong>), alag brokers pe. Replication factor 3 = teen copies. Ek copy <strong>leader</strong> hai: saare writes wahi leta hai. Baaki <strong>followers</strong>: leader se lagataar naye records khinchte (fetch karte) rehte hain.<br><strong>Kyun chahiye:</strong> ek broker ki disk mari to data doosri copy mein bacha hai, aur ek follower naya leader ban jaata hai.<br><strong>Iske bina:</strong> ek machine gayi, us partition ka data gaya.` },
    { type: 'callout', tone: 'term', title: 'ISR (in-sync replicas)', html: `<strong>Ye kya hai:</strong> wo replicas jo leader ke saath "taal mein" hain, yaani zyada pichhe nahi (<code>replica.lag.time.max.ms</code> se zyada pichhe hua to ISR se bahar). Record <strong>committed</strong> tab maana jaata hai jab saare ISR ke paas aa jaaye; consumers sirf committed records dekhte hain.<br><strong>Kyun chahiye:</strong> leader gire to naya leader sirf ISR mein se chuna jaata hai, kyunki sirf unke paas har committed record hai.<br><strong>Iske bina:</strong> pichhe wala replica leader ban jaata aur committed data gayab.` },
    { type: 'callout', tone: 'term', title: 'acks aur min.insync.replicas', html: `<strong>Ye kya hai:</strong> <code>acks</code> producer ki setting hai: "save ho gaya" ka jawab kab chahiye. <code>acks=0</code> = kisi ka wait nahi. <code>acks=1</code> = sirf leader ne likha. <code>acks=all</code> = saare ISR ne likha. <code>min.insync.replicas</code> topic/broker setting hai: <code>acks=all</code> ke saath, ISR mein kam se kam itne replicas na hon to write reject.<br><strong>Kyun chahiye:</strong> speed aur safety ke beech apna balance chunna.<br><strong>Iske bina:</strong> ya har write dheema, ya payments ka data bhi risk pe.<br><strong>Default:</strong> Kafka 3.0 se producer ka default <code>acks=all</code> aur idempotent producer on. Common setup: replication factor 3, <code>min.insync.replicas=2</code>.` },
    { type: 'callout', tone: 'term', title: 'Controller aur KRaft', html: `<strong>Ye kya hai:</strong> controller = cluster ka "manager". Ye <strong>metadata</strong> rakhta hai: kaunse brokers zinda hain, kaunsa topic kitne partitions ka, har partition ka leader kaun. Leader gire to naya leader yahi chunta hai. <strong>KRaft</strong> = Kafka ka apna tareeka is metadata ko kai controllers (aam taur pe 3 ya 5) mein Raft consensus se sambhaalne ka (Raft: machines ka vote karke ek baat pe sehmat hona; Consensus lesson mein).<br><strong>Kyun chahiye:</strong> kisi ko to faisla lena hai ki naya leader kaun, aur ye faisla khud bhi ek machine ke girne se nahi rukna chahiye.<br><strong>Iske bina:</strong> leader gira to partition hamesha ke liye bina leader.<br><strong>History:</strong> pehle ye kaam ek alag system ZooKeeper karta tha. Kafka 4.0 (March 2025) se ZooKeeper poori tarah hata diya gaya: ab sirf KRaft mode. Ek system kam chalana padta hai.` },
    { type: 'flow', title: 'Ek partition, teen replicas', height: 330,
      nodes: [
        { id: 'prod', label: 'Producer', sub: 'acks=all', x: 90, y: 60, w: 130, kind: 'server', info: 'Ye kya hai: event likhne wali service. Producer sirf leader ko likhta hai. acks setting tay karti hai ki confirmation kab milega.' },
        { id: 'l', label: 'Broker 1', sub: 'LEADER, P0', x: 330, y: 165, w: 150, kind: 'data', info: 'Ye kya hai: wo Kafka server jiske paas partition 0 ki leader copy hai. Saare writes (aur default mein reads) yahin. Followers isse records fetch karte hain.' },
        { id: 'f2', label: 'Broker 2', sub: 'follower (ISR)', x: 600, y: 60, w: 160, kind: 'data', info: 'Ye kya hai: doosra Kafka server, partition 0 ki follower copy ke saath. Leader se lagataar fetch karta hai. ISR mein hai kyunki pichhe nahi hai, to leader gire to ye leader ban sakta hai.' },
        { id: 'f3', label: 'Broker 3', sub: 'follower (ISR)', x: 600, y: 270, w: 160, kind: 'data', info: 'Ye kya hai: teesra Kafka server, teesri copy. Replication factor 3 ka matlab teen brokers pe data.' },
        { id: 'ctrl', label: 'Controller', sub: 'KRaft quorum', x: 330, y: 290, w: 150, kind: 'net', info: 'Ye kya hai: cluster ka "manager": kaun broker zinda hai, kaun leader hai, ye metadata rakhta hai aur leader gire to naya chunta hai. Pehle ye kaam ZooKeeper ke saath hota tha; Kafka 4.0 (March 2025) se ZooKeeper poori tarah hata diya gaya aur Kafka ka apna Raft-based KRaft mode hi chalta hai.' },
      ],
      edges: [{ a: 'prod', b: 'l' }, { a: 'l', b: 'f2' }, { a: 'l', b: 'f3' }, { a: 'ctrl', b: 'l' }, { a: 'ctrl', b: 'f2', id: 'cf2' }, { a: 'ctrl', b: 'f3', id: 'cf3' }, { a: 'prod', b: 'f2', id: 'pf2', hidden: true }, { a: 'f2', b: 'f3', id: 'f23', hidden: true }],
      scenarios: [
        { name: 'acks=all (happy)', steps: [
          { title: 'Producer leader ko likhta hai', go: 'prod>l', text: 'Record leader ke log mein juda.', msg: 'produce P0  acks=all' },
          { title: 'Followers copy karte hain', parallel: true, go: ['l>f2', 'l>f3'], text: 'Dono followers ne record fetch kar liya.', after: { f2: { state: 'ok' }, f3: { state: 'ok' } } },
          { title: 'Ab ack', go: 'res:l>prod', text: 'Saare ISR ke paas aa gaya, record committed. Producer ko ack. Thoda zyada latency (followers ka wait), lekin teen copies.', msg: 'ack: partition 0, offset 4521' },
        ]},
        { name: 'Leader crash (acks=all)', steps: [
          { title: 'Record committed tha', parallel: true, go: ['prod>l', 'l>f2', 'l>f3', 'res:l>prod'], text: 'Pichhla record teeno ke paas.' },
          { title: 'Broker 1 gira', set: { l: { state: 'down', sub: 'DOWN' } }, text: 'Leader ka machine crash.', focus: ['l'] },
          { title: 'Controller naya leader chunta hai', text: 'Controller ko broker 1 ke heartbeat band milte hain. ISR mein se Broker 2 ko leader bana deta hai. Kyunki Broker 2 ISR mein tha, uske paas har committed record hai.', go: 'evt:ctrl>f2', after: { f2: { state: 'ok', sub: 'NEW LEADER, P0' } } },
          { title: 'Producer naye leader ko likhta hai', text: 'Producer ka metadata refresh hua, ab Broker 2 ko likhta hai. Broker 3 ab Broker 2 se copy karta hai. Koi committed data nahi khoya.', show: ['pf2', 'f23'], go: ['prod>f2', 'f2>f3', 'res:f2>prod'] },
        ]},
        { name: 'acks=1: data loss', intro: 'Speed ke liye producer ne acks=1 rakha.', steps: [
          { title: 'Leader ne likha, turant ack', go: ['prod>l', 'res:l>prod'], text: 'Followers ka wait nahi. Producer khush: "save ho gaya".', msg: 'ack (sirf leader ne likha)' },
          { title: 'Copy hone se pehle crash', set: { l: { state: 'down', sub: 'DOWN' } }, go: 'lost:l>f2', text: 'Followers fetch kar paate usse pehle leader gira.' },
          { title: 'Naye leader ke paas record hi nahi', go: 'evt:ctrl>f2', after: { f2: { state: 'warn', sub: 'leader, record gayab!' } }, text: 'Broker 2 leader bana, lekin us record ke bina. Producer ko "ack" mila tha, phir bhi record <strong>gaya</strong>. Logs/metrics ke liye shayad chalta hai, payments ke liye bilkul nahi.' },
        ]},
        { name: 'Followers down + min ISR', intro: 'Replication factor 3, min.insync.replicas = 2, acks=all.', steps: [
          { title: 'Do followers gire', set: { f2: { state: 'down', sub: 'DOWN' }, f3: { state: 'down', sub: 'DOWN' } }, text: 'ISR mein ab sirf leader bacha (1 < 2).', focus: ['f2', 'f3'] },
          { title: 'Write reject', go: ['prod>l', 'bad:l>prod'], text: 'Leader write mana kar deta hai. Kafka ne yahan <strong>availability ke upar durability</strong> chuni: sirf ek copy pe data lena risky hai. Producer retry karega jab tak replicas wapas na aayein.', msg: 'error: NOT_ENOUGH_REPLICAS' },
        ]},
      ],
    },
    { type: 'p', html: `<strong>acks + ISR lab.</strong> Ek partition, replication factor 3 (1 leader + 2 followers). Settings chuno, kitne followers abhi in-sync hain wo chuno, aur dekho: write accept hua ya nahi, aur ack ke turant baad leader mar jaaye (followers ke copy karne se pehle) to record bachega ya nahi.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div style="font:600 13px var(--f-body);color:var(--ink-2);margin-bottom:6px">Producer acks</div><div class="ka-acks" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div style="font:600 13px var(--f-body);color:var(--ink-2);margin:10px 0 6px">min.insync.replicas</div><div class="ka-min" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div style="font:600 13px var(--f-body);color:var(--ink-2);margin:10px 0 6px">In-sync followers abhi</div><div class="ka-f" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <label style="display:block;margin-top:10px;font:14px var(--f-body);color:var(--ink-2)"><input class="ka-crash" type="checkbox" checked> Ack ke turant baad leader crash (followers ne abhi copy nahi kiya)</label>
        <div class="stats">
          <div class="stat"><span>ISR size</span><strong class="ka-o-isr"></strong></div>
          <div class="stat"><span>Write</span><strong class="ka-o-w"></strong></div>
          <div class="stat"><span>Speed</span><strong class="ka-o-sp"></strong></div>
          <div class="stat"><span>Leader crash ke baad record</span><strong class="ka-o-r"></strong></div>
        </div>
        <div class="calc-note ka-note"></div>`;
      let acks = 'all', min = 2, f = 2;
      const btns = (sel, opts, get, set) => { const box = el.querySelector(sel); box.innerHTML = ''; opts.forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small' + (get() === k ? ' primary' : ''); b.textContent = v; b.onclick = () => { set(k); run(); }; box.appendChild(b); }); };
      const decide = (acks, min, f, crash) => {
        const isr = 1 + f;
        if (acks === 'all' && isr < min) return { w: 'REJECTED', r: '-', n: `ISR mein sirf ${isr}, lekin min.insync.replicas = ${min}. Leader write mana karta hai (NOT_ENOUGH_REPLICAS). Kafka ne yahan availability chhodi taaki data sirf ek copy pe na rahe. Producer retry karega.` };
        const sp = acks === '0' ? 'sabse tez' : acks === '1' ? 'tez' : 'thoda dheema';
        if (!crash) return { w: 'OK', sp, r: 'safe', n: acks === '0' ? 'Crash nahi hua to sab theek dikhta hai. Lekin acks=0 mein producer ko kabhi pata hi nahi chalta ki write hua bhi ya nahi.' : 'Koi crash nahi, record safe. Ab "leader crash" on karke asli farak dekho.' };
        if (acks === 'all') return f > 0 ? { w: 'OK', sp, r: 'SAFE', n: `acks=all: ack tabhi aaya jab saare ${isr} ISR replicas ke paas record tha. Leader gira, ek ISR follower leader bana, record uske paas hai. Ye "crash ke baad copy nahi hua" wali situation acks=all mein ho hi nahi sakti.` } : { w: 'OK', sp, r: 'OFFLINE', n: 'ISR mein sirf leader tha aur min.insync.replicas = 1 ne write le liya. Leader gira to koi in-sync copy nahi bachi. Unclean election off hai, to partition tab tak band jab tak wo broker wapas na aaye. Disk mari to data gaya. Isliye min.insync.replicas = 2 rakhte hain.' };
        if (acks === '1') return f > 0 ? { w: 'OK', sp, r: 'LOST', n: 'acks=1: sirf leader ne likha aur turant ack. Followers copy karein usse pehle leader mara. Naya leader (ek follower) ke paas record nahi. Producer ko "saved" bola gaya tha, phir bhi record gaya. min.insync.replicas acks=1 pe lagta hi nahi.' } : { w: 'OK', sp, r: 'OFFLINE', n: 'Sirf leader ke paas copy thi. Leader gira, partition band jab tak broker wapas na aaye.' };
        return { w: 'OK?', sp, r: 'LOST', n: 'acks=0: producer ne bheja aur aage badh gaya. Leader ne likha bhi ya nahi, kisi ko nahi pata. Crash pe record gaya. Sirf aise data ke liye jahan kuch khona chalta hai (metrics).' };
      };
      const run = () => {
        btns('.ka-acks', [['0', 'acks=0'], ['1', 'acks=1'], ['all', 'acks=all']], () => acks, k => acks = k);
        btns('.ka-min', [[1, '1'], [2, '2'], [3, '3']], () => min, k => min = k);
        btns('.ka-f', [[0, '0 (sirf leader)'], [1, '1'], [2, '2']], () => f, k => f = k);
        const r = decide(acks, min, f, el.querySelector('.ka-crash').checked);
        el.querySelector('.ka-o-isr').textContent = 1 + f;
        const w = el.querySelector('.ka-o-w'); w.textContent = r.w; w.style.color = r.w === 'REJECTED' ? 'var(--amber)' : 'var(--ink)';
        el.querySelector('.ka-o-sp').textContent = r.sp || '-';
        const o = el.querySelector('.ka-o-r'); o.textContent = r.r; o.style.color = /SAFE|safe/.test(r.r) ? 'var(--green)' : r.r === '-' ? 'var(--ink-3)' : 'var(--red)';
        el.querySelector('.ka-note').textContent = r.n;
      };
      el.querySelector('.ka-crash').addEventListener('change', run); run();
    }},
    { type: 'callout', tone: 'tip', html: `Saar: <strong>acks=all + min.insync.replicas=2 + replication factor 3</strong> = ek broker gire to bhi koi acknowledged record nahi khota, aur writes chalte rehte hain. Do brokers gire to writes ruk jaate hain (REJECTED), lekin data galat nahi hota. acks=1 tez hai lekin "ack mila, phir bhi gaya" ho sakta hai.` },
    { type: 'callout', tone: 'warn', title: 'Unclean leader election', html: `Agar saare ISR replicas gir jaayein, to kya ek pichhe wale (non-ISR) replica ko leader bana dein? Usse topic jaldi chalu hoga lekin kuch committed records kho jaayenge. Kafka by default <strong>nahi</strong> banata (<code>unclean.leader.election.enable=false</code>), yaani consistency pehle. Ye wahi CAP wala trade-off hai jo Theory phase mein aayega.` },

    { type: 'h2', text: 'Delivery semantics, Kafka mein' },
    { type: 'table', head: ['Semantics', 'Consumer kya karta hai', 'Crash pe'], rows: [
      ['At-most-once', 'Pehle offset commit, phir process', 'Process ke beech crash = records skip (loss)'],
      ['At-least-once', 'Pehle process, phir offset commit (sabse common)', 'Commit se pehle crash = records dobara (duplicate)'],
      ['Exactly-once (Kafka ke andar)', 'Idempotent producer + transactions: "padha, process kiya, output likha, offset commit kiya" sab ek atomic transaction mein; consumers <code>isolation.level=read_committed</code> (sirf poori hui transactions ke records dekho)', 'Ya to sab hua ya kuch nahi. Kafka Streams ise ek setting se deta hai'],
    ]},
    { type: 'callout', tone: 'mistake', title: 'Exactly-once ki seema', html: `Kafka transactions ka exactly-once sirf <strong>Kafka se Kafka</strong> tak hai (topic padho → topic mein likho). Agar consumer bahar kuch karta hai (email bhejna, Postgres mein likhna, payment API call), to Kafka uski guarantee nahi de sakta. Wahan wahi purana niyam: at-least-once + idempotent consumer (event ID ya key se dedup / upsert).` },
    { type: 'callout', tone: 'term', title: 'Idempotent producer', html: `<strong>Ye kya hai:</strong> aisa producer jiska retry log mein duplicate nahi banata. Har record pe producer ID + sequence number lagta hai; broker same sequence dobara aaye to pehchaan ke nahi likhta.<br><strong>Kyun chahiye:</strong> producer ne record bheja, ack raste mein kho gaya, producer ne retry kiya. Bina idempotence ke log mein do copies.<br><strong>Iske bina:</strong> har network glitch pe duplicate events.<br><strong>Default:</strong> Kafka 3.0 se on.` },
    { type: 'callout', tone: 'tip', title: 'Kafka ab queue bhi?', html: `Consumer group ka niyam "ek partition = ek consumer" parallelism ko partitions tak baandh deta hai. Isliye Kafka mein <strong>share groups</strong> aaye ("Queues for Kafka", KIP-932): ek hi partition ke records kai consumers milke padhte hain, har record ka alag ack aur delivery count ke saath, bilkul queue jaisa. Kafka 4.0 mein early access tha, Kafka 4.2 mein production-ready ghoshit hua. Interview mein ise awareness ke level pe jaanna kaafi hai; classic answer abhi bhi "jobs ke liye queue, events ke liye log" hai.` },

    { type: 'h2', text: 'CDC: database ke changes ko stream banao' },
    { type: 'p', html: `xyz.com ka asli data Postgres mein hai. Search index, cache, analytics warehouse sabko DB ke changes chahiye. Har jagah code mein "DB update ke baad Kafka mein bhi bhejo" likhna bhool-chook wala kaam hai. Behtar: database khud jo likhta hai usi ko padh lo.` },
    { type: 'callout', tone: 'term', title: 'Transaction log (WAL / binlog)', html: `<strong>Ye kya hai:</strong> database ki apni "diary". Har change (insert, update, delete) table mein jaane se pehle yahan likha jaata hai. Postgres mein ise <strong>WAL</strong> (write-ahead log), MySQL mein <strong>binlog</strong> kehte hain.<br><strong>Kyun chahiye:</strong> crash ke baad DB isi diary se khud ko theek karta hai, aur replicas isi ko padh ke copy bante hain (Replication lesson).<br><strong>Iske bina:</strong> crash pe adhure changes, aur replicas ko changes ka pata nahi.` },
    { type: 'callout', tone: 'term', title: 'CDC (Change Data Capture) aur Debezium', html: `<strong>Ye kya hai:</strong> CDC tool database ki diary (WAL/binlog) ko ek replica ki tarah padhta hai aur har insert/update/delete ko event bana ke Kafka mein bhejta hai. <strong>Debezium</strong> sabse popular open-source CDC tool hai. Postgres ke liye ye logical decoding aur ek <strong>replication slot</strong> (DB mein ek bookmark ki "yahan tak padha") use karta hai. Pehli baar poori table ka snapshot leta hai, phir live changes.<br><strong>Kyun chahiye:</strong> app code ko Kafka ke baare mein jaanna hi nahi padta, aur jo commit hua wahi event bana: koi change chhoot nahi sakta.<br><strong>Iske bina:</strong> har jagah code mein "DB ke baad Kafka bhi" yaad rakhna, aur kabhi na kabhi koi bhoolega.<br><strong>Event mein:</strong> <code>before</code>, <code>after</code>, <code>op</code> (c = create, u = update, d = delete, r = snapshot read), aur source metadata.` },
    { type: 'code', text: `{
  "before": { "id": 7, "title": "My vlog", "status": "PROCESSING" },
  "after":  { "id": 7, "title": "My vlog", "status": "PUBLISHED" },
  "op": "u",
  "source": { "table": "videos", "lsn": 23983712 },
  "ts_ms": 1791090000000
}` },
    { type: 'p', html: `Faayda: app code ko Kafka ke baare mein jaanna hi nahi padta, aur jo commit hua wahi event bana (koi change chhoot nahi sakta). Kamzori: events "table row badli" ke level ke hain, business meaning ("video published") nahi; aur table ka schema badla to consumers toot sakte hain. Is kami ko outbox pattern bharta hai.` },

    { type: 'h2', text: 'Transactional outbox: dual-write problem ka ilaaj' },
    { type: 'callout', tone: 'term', title: 'Dual write', html: `<strong>Ye kya hai:</strong> ek kaam mein do alag systems mein likhna (jaise Postgres <em>aur</em> Kafka), jinke beech koi shared transaction nahi.<br><strong>Kyun dikkat:</strong> beech mein crash ya ek system down = ek mein likha, doosre mein nahi. Koi error page nahi dikhta, data chupke se bigad jaata hai.<br><strong>Example:</strong> video DB mein hai, search mein kabhi nahi aaya.` },
    { type: 'callout', tone: 'term', title: 'Transactional outbox', html: `<strong>Ye kya hai:</strong> event ko seedha Kafka mein bhejne ki jagah, apne hi DB ki ek <strong>outbox</strong> table mein likho, business data ke saath <strong>usi transaction</strong> mein. Phir ek alag process (Debezium ya ek chhota relay) outbox se events utha ke Kafka mein publish karta hai.<br><strong>Kyun chahiye:</strong> ab service sirf ek system (DB) mein likhti hai. Ya dono rows bachi, ya koi nahi. Event kabhi "aadha" nahi hota.<br><strong>Iske bina:</strong> dual write ke saare gadbad scenarios (neeche flow aur lab).<br><strong>Keemat:</strong> publish thoda der se, aur at-least-once: consumers ko event ID se dedup karna padta hai.` },
    { type: 'p', html: `Upload service ko do kaam karne hain: <code>videos</code> table mein row likhna, aur Kafka mein "video.uploaded" bhejna. Ye do <strong>alag systems</strong> hain, inke beech koi shared transaction nahi. Isko <strong>dual write</strong> kehte hain, aur ye chupke se data bigaadta hai. Saare scenarios chalao:` },
    { type: 'flow', title: 'Dual write vs outbox', height: 330,
      nodes: [
        { id: 'svc', label: 'Upload service', x: 90, y: 165, w: 140, kind: 'server', info: 'Ye kya hai: video upload ka business logic. Use DB mein bhi likhna hai aur baaki duniya ko event bhi dena hai.' },
        { id: 'db', label: 'Postgres', sub: 'videos + outbox', x: 330, y: 75, w: 160, kind: 'data', info: 'Ye kya hai: hamara main database, source of truth. Outbox pattern mein isi DB mein ek "outbox" table hoti hai: id, aggregatetype, aggregateid, type, payload.' },
        { id: 'k', label: 'Kafka', sub: 'topic: videos', x: 600, y: 165, w: 140, kind: 'queue', info: 'Ye kya hai: Kafka cluster, event log jahan se baaki services padhti hain. Kyun: ek event, kai readers.' },
        { id: 'dbz', label: 'Debezium', sub: 'CDC, reads WAL', x: 330, y: 275, w: 160, kind: 'server', hidden: true, info: 'Ye kya hai: CDC tool. Outbox table ke inserts ko WAL se padh ke Kafka mein publish karta hai. Debezium ka "outbox event router" aggregatetype se topic aur aggregateid se key banata hai.' },
        { id: 's', label: 'Search indexer', sub: 'consumer', x: 600, y: 290, w: 150, kind: 'server', info: 'Ye kya hai: search team ka consumer. Event ID se dedup karta hai, kyunki outbox at-least-once hai: kabhi kabhi same event do baar.' },
      ],
      edges: [{ a: 'svc', b: 'db' }, { a: 'svc', b: 'k', id: 'sk' }, { a: 'db', b: 'dbz', id: 'dd', hidden: true }, { a: 'dbz', b: 'k', id: 'dk', hidden: true }, { a: 'k', b: 's' }],
      scenarios: [
        { name: 'Dual write: Kafka fail', steps: [
          { title: 'DB commit ho gaya', go: ['svc>db', 'res:db>svc'], text: 'Video row save.', after: { db: { state: 'ok', sub: 'video 7 saved' } }, msg: 'INSERT INTO videos ... ; COMMIT' },
          { title: 'Kafka publish fail', go: 'lost:svc>k', set: { svc: { state: 'warn' } }, text: 'Kafka timeout, ya service ka pod theek isi waqt restart ho gaya. Event kabhi nahi gaya.' },
          { title: 'Chupa hua nuksaan', text: 'DB mein video hai, lekin search ko kabhi pata nahi chalega. Koi error page nahi, koi alarm nahi. Mahine baad koi poochhta hai "mera video search mein kyun nahi aata?"', set: { s: { state: 'warn', sub: 'video 7 missing!' } }, focus: ['s'] },
        ]},
        { name: 'Dual write: ulta order', intro: 'To pehle Kafka, phir DB?', steps: [
          { title: 'Pehle event', go: ['svc>k', 'evt:k>s'], text: 'Event chala gaya, search ne index bhi kar diya.', after: { s: { sub: 'indexed video 7' } } },
          { title: 'DB transaction fail', go: ['svc>db', 'bad:db>svc'], after: { db: { state: 'down', sub: 'ROLLBACK' } }, text: 'Constraint error / DB down. Row kabhi nahi bani.' },
          { title: 'Ghost event', text: 'Search mein ek aisa video hai jo exist hi nahi karta. Order badalne se problem nahi gayi, bas ulti ho gayi.', set: { s: { state: 'warn', sub: 'ghost video 7!' } }, focus: ['s'] },
        ]},
        { name: 'Outbox pattern', intro: 'Ilaaj: event ko bhi DB mein, usi transaction mein likho.', steps: [
          { title: 'Ek transaction, do inserts', hide: ['sk'], show: ['dbz', 'dd', 'dk'], go: ['svc>db', 'res:db>svc'], text: 'Video row aur outbox row <strong>ek hi DB transaction</strong> mein. Ya dono save, ya koi nahi. Dual write khatam: service ab sirf ek system mein likhti hai.', after: { db: { state: 'ok', sub: 'video + outbox row' } }, msg: 'BEGIN;\n  INSERT INTO videos (id, title) VALUES (7, \'My vlog\');\n  INSERT INTO outbox (id, aggregatetype, aggregateid, type, payload)\n    VALUES (\'e-901\', \'video\', \'7\', \'VideoUploaded\', \'{...}\');\nCOMMIT;' },
          { title: 'Debezium WAL padhta hai', go: 'evt:db>dbz', text: 'Outbox ka insert WAL mein aaya, Debezium ne padh liya. (Bina CDC ke ek chhota "relay" process bhi outbox table poll karke ye kar sakta hai.)' },
          { title: 'Kafka mein publish', go: ['evt:dbz>k', 'evt:k>s'], text: 'Event Kafka mein gaya, key = aggregateid (7), to video 7 ke saare events order mein. Search ne index kiya.', after: { s: { state: 'ok', sub: 'indexed video 7' } } },
          { title: 'Duplicate ka dhyaan', text: 'Agar Debezium publish ke baad, apni position save karne se pehle restart ho, to event dobara jaayega. Outbox at-least-once hai. Consumer event ID (<code>e-901</code>) se dedup karta hai, to koi nuksaan nahi.', go: 'evt:k>s', set: { s: { sub: 'e-901 seen: skip' } } },
        ]},
      ],
    },
    { type: 'p', html: `<strong>Dual-write crash lab.</strong> Teen tareeke, char crash points. Har combination ka nateeja dekho, aur neeche wali line mein ek tareeke ke saare crash points ek saath.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div style="font:600 13px var(--f-body);color:var(--ink-2);margin-bottom:6px">Tareeka</div><div class="kd-m" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div style="font:600 13px var(--f-body);color:var(--ink-2);margin:10px 0 6px">Kya bigda?</div><div class="kd-c" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <ol class="kd-log" style="margin:12px 0 0;padding-left:22px;font:13px/1.6 var(--f-mono);color:var(--ink-2)"></ol>
        <div class="stats">
          <div class="stat"><span>DB mein video 7</span><strong class="kd-db"></strong></div>
          <div class="stat"><span>Search ko mile events</span><strong class="kd-k"></strong></div>
          <div class="stat"><span>Nateeja</span><strong class="kd-r"></strong></div>
        </div>
        <div style="font:600 13px var(--f-body);color:var(--ink-2);margin:12px 0 6px">Is tareeke ka nateeja, har crash point pe</div><div class="kd-mx" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <div class="calc-note kd-note"></div>`;
      const M = { dbk: 'Pehle DB, phir Kafka', kdb: 'Pehle Kafka, phir DB', ob: 'Outbox + CDC' };
      const C = { none: 'Kuch nahi', crash1: 'Pehle write ke baad service crash', down2: 'Doosra system down', relay: 'Relay publish ke baad restart' };
      let m = 'dbk', c = 'crash1';
      const sim = (m, c) => {
        const L = []; let db = false, ev = 0, err = false;
        if (m === 'dbk') {
          db = true; L.push('INSERT video 7 + COMMIT (DB)');
          if (c === 'crash1') L.push('CRASH: service mari, Kafka publish kabhi nahi hua');
          else if (c === 'down2') { L.push('Kafka publish: timeout, retries bhi fail'); }
          else { ev = 1; L.push('Kafka publish: video.uploaded'); }
        } else if (m === 'kdb') {
          ev = 1; L.push('Kafka publish: video.uploaded (search ne index bhi kar diya)');
          if (c === 'crash1') L.push('CRASH: service mari, DB insert kabhi nahi hua');
          else if (c === 'down2') L.push('DB insert: error → ROLLBACK');
          else { db = true; L.push('INSERT video 7 + COMMIT (DB)'); }
        } else {
          if (c === 'down2') { err = true; L.push('BEGIN; INSERT video; INSERT outbox → DB error → ROLLBACK (dono nahi bane)'); L.push('User ko error, wo dobara try karega'); }
          else {
            db = true; L.push('BEGIN; INSERT video 7; INSERT outbox e-901; COMMIT');
            if (c === 'crash1') L.push('CRASH: service mari. Koi baat nahi, event outbox mein durable hai');
            ev = 1; L.push('Debezium ne WAL se e-901 padha → Kafka publish');
            if (c === 'relay') { ev = 2; L.push('Debezium restart (position save nahi hui thi) → e-901 dobara publish'); L.push('Search: e-901 pehle dekha hai → SKIP (dedup)'); }
          }
        }
        let r;
        if (db && ev >= 1) r = ev > 1 ? (m === 'ob' ? 'OK (dedup)' : 'DUPLICATE') : 'OK';
        else if (!db && ev === 0) r = err ? 'OK (saaf error)' : 'OK';
        else if (db) r = 'EVENT MISSING';
        else r = 'GHOST EVENT';
        return { L, db, ev, r };
      };
      const btns = (sel, map, get, set) => { const box = el.querySelector(sel); box.innerHTML = ''; Object.entries(map).forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small' + (get() === k ? ' primary' : ''); b.textContent = v; b.onclick = () => { set(k); run(); }; box.appendChild(b); }); };
      const good = r => r.startsWith('OK');
      const run = () => {
        btns('.kd-m', M, () => m, k => m = k); btns('.kd-c', C, () => c, k => c = k);
        const x = sim(m, c);
        el.querySelector('.kd-log').innerHTML = x.L.map(l => `<li style="color:${/CRASH|error|fail/.test(l) ? 'var(--red)' : 'var(--ink-2)'}">${l}</li>`).join('');
        el.querySelector('.kd-db').textContent = x.db ? 'haan' : 'nahi';
        el.querySelector('.kd-k').textContent = x.ev;
        const r = el.querySelector('.kd-r'); r.textContent = x.r; r.style.color = good(x.r) ? 'var(--green)' : 'var(--red)';
        el.querySelector('.kd-mx').innerHTML = Object.keys(C).map(k => { const y = sim(m, k).r; return `<span class="chip" style="color:${good(y) ? 'var(--green)' : 'var(--red)'};${k === c ? 'border-color:var(--accent)' : ''}">${C[k]}: ${y}</span>`; }).join('');
        const N = { 'EVENT MISSING': 'DB mein video hai, Kafka mein event nahi. Search ko kabhi pata nahi chalega. Koi error nahi, koi alarm nahi: sabse khatarnak bug.', 'GHOST EVENT': 'Kafka mein event hai, DB mein video nahi. Search ek aisa video dikha raha hai jo exist hi nahi karta.', 'OK (dedup)': 'Outbox at-least-once hai: restart pe event do baar gaya. Search ne event ID se pehchaan ke skip kiya. Delivery do baar, asar ek baar.', 'OK (saaf error)': 'Transaction fail hua to na video bana na event. Sab consistent, user ko saaf error mila aur wo retry kar sakta hai.' };
        el.querySelector('.kd-note').textContent = N[x.r] || (m === 'ob' ? 'Outbox: DB aur event ek saath atomic. Service crash ho bhi jaaye, event DB mein durable hai aur publish ho hi jaayega.' : c === 'relay' ? 'Is tareeke mein relay hai hi nahi, to ye crash point lagu nahi. Baaki points try karo.' : 'Sab theek raha, kyunki kuch bigda nahi. Dual write sirf "happy path" pe kaam karta hai.');
      };
      run();
    }},
    { type: 'callout', tone: 'mistake', title: '"Bas try-catch laga ke retry kar lenge"', html: `Retry tab kaam karta hai jab process zinda ho. Agar DB commit ke baad aur Kafka publish se pehle pod hi mar gaya (deploy, OOM), to retry karne wala koi nahi bacha. Outbox mein event DB mein durable hai, to wo kabhi nahi khoyega: relay/Debezium aaj nahi to 5 minute baad bhej dega.` },

    { type: 'h2', text: 'Decide: queue, Kafka ya pub/sub?' },
    { type: 'table', head: ['Zaroorat', 'Pick', 'Example'], rows: [
      ['Jobs workers mein baanto; har job ek baar, phir delete; per-message retries aur DLQ', 'Queue: SQS, RabbitMQ, Celery/Sidekiq on Redis', 'Emails bhejna, images resize, videos transcode'],
      ['High-throughput event stream, kai independent consumers, replay, ordering per key', 'Log: Kafka, Kinesis, Pulsar', 'Order events → billing, analytics, notifications, search indexing'],
      ['Ek message abhi ke abhi kai subscribers ko, loss chalta hai', 'Pub/sub: Redis Pub/Sub, SNS, Google Pub/Sub', 'Chat message ko un gateway servers tak jahan recipients connected hain'],
      ['Multi-step business process, retries, timeouts, human steps', 'Workflow engine: Temporal, Step Functions', 'Payment → creator approval → publish'],
    ], caption: 'Roadmap phase 5 ki decision table.' },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>Queue ek to-do list hai</strong>: har job ek worker ek baar karta hai, phir gayab. <strong>Kafka ek newspaper archive hai</strong>: kai alag readers same events apni speed se padhte hain aur purane dobara padh sakte hain. Rule of thumb: <em>"Ye kaam karo"</em> → queue. <em>"Ye hua, aur kai teams ko parwah hai"</em> → Kafka. Aur roadmap ki warning yaad rakho: chhote system mein seedha Kafka aur microservices pe mat koodo; ek Postgres + ek simple queue bahut door tak jaate hain.` },

    { type: 'h2', text: 'Poori picture' },
    { type: 'diagram', title: 'xyz.com event platform: poori picture', height: 500,
      groups: [
        { label: 'Kafka cluster', x: 262, y: 26, w: 196, h: 456 },
      ],
      nodes: [
        { id: 'app', label: 'Upload service', sub: 'business logic', x: 100, y: 60, kind: 'server', info: 'Ye kya hai: video upload ka code. Ye Kafka ko seedha nahi likhta: video row aur outbox row ek hi DB transaction mein likhta hai (dual write se bachne ke liye).' },
        { id: 'pg', label: 'Postgres', sub: 'videos + outbox', x: 100, y: 190, kind: 'data', info: 'Ye kya hai: main database, source of truth. Har change pehle WAL (DB ki diary) mein jaata hai, jise Debezium padhta hai.' },
        { id: 'dbz', label: 'Debezium', sub: 'CDC, reads WAL', x: 100, y: 320, kind: 'server', info: 'Ye kya hai: CDC tool. Outbox ke inserts WAL se padh ke Kafka mein publish karta hai, key = video_id. At-least-once, isliye consumers dedup karte hain.' },
        { id: 'views', label: 'Player apps', sub: 'view events', x: 100, y: 450, kind: 'client', info: 'Ye kya hai: video dekhne wale apps (unke peeche ka API). Har second lakhon "video viewed" events seedha Kafka mein, key = video_id. Yahan DB nahi, to outbox ki zaroorat nahi.' },
        { id: 'ctrl', label: 'KRaft controllers', sub: 'metadata, leaders', x: 360, y: 90, w: 170, kind: 'net', info: 'Ye kya hai: cluster ke manager (3 machines, Raft se sehmat). Kaun broker zinda, har partition ka leader kaun. Broker gire to naya leader yahi chunte hain. Kafka 4.0 se ZooKeeper nahi.' },
        { id: 'topic', label: 'video-events', sub: '6 partitions × 3', x: 360, y: 255, w: 170, kind: 'queue', info: 'Ye kya hai: topic, 6 partitions mein bata, har partition ki 3 copies (leader + 2 followers) alag brokers pe. acks=all, min.insync.replicas=2, retention 7 din.' },
        { id: 'mon', label: 'Lag alarm', sub: 'per group', x: 360, y: 420, w: 170, kind: 'net', info: 'Ye kya hai: monitoring jo har consumer group ka lag (latest − committed offset) dekhti hai. Lag retention ke paas pahunche to data khone ka khatra: alarm.' },
        { id: 'gs', label: 'Search group', sub: '→ Elasticsearch', x: 610, y: 110, w: 170, kind: 'server', info: 'Ye kya hai: consumer group "search". Har video ko search index mein upsert karta hai (idempotent). Commit process ke baad: at-least-once.' },
        { id: 'ga', label: 'Analytics group', sub: '→ warehouse', x: 610, y: 255, w: 170, kind: 'server', info: 'Ye kya hai: consumer group "analytics", search se independent. Bug fix ke baad offset reset karke kal ka data dobara padh sakta hai.' },
        { id: 'gr', label: 'Recs group', sub: 'naya: replay', x: 610, y: 400, w: 170, kind: 'server', info: 'Ye kya hai: nayi recommendations team ka group. auto.offset.reset=earliest se 7 din ki history replay karke model banata hai.' },
      ],
      edges: [
        { a: 'app', b: 'pg', n: 1, label: 'video + outbox' },
        { a: 'pg', b: 'dbz', n: 2, label: 'WAL' },
        { a: 'dbz', b: 'topic', n: 3, label: 'publish' },
        { a: 'views', b: 'topic', label: 'key=video_id' },
        { a: 'ctrl', b: 'topic', dashed: true, label: 'leaders' },
        { a: 'topic', b: 'gs', n: 4, kind: 'evt' },
        { a: 'topic', b: 'ga', kind: 'evt' },
        { a: 'topic', b: 'gr', kind: 'evt', label: 'replay' },
        { a: 'topic', b: 'mon', dashed: true, label: 'offsets' },
      ],
      paths: [
        { name: 'Upload event', text: 'Video row aur outbox row ek transaction mein. Debezium ne WAL se padha aur Kafka mein bheja. Search ne index kiya.', go: ['app>pg>dbz>topic>gs'] },
        { name: 'View events', text: 'Lakhon view events seedha Kafka mein, key = video_id, to ek video ke events ek partition mein order mein. Analytics padhta hai.', go: ['views>topic>ga'] },
        { name: 'Replay', text: 'Naya recs group shuru se (7 din) padhta hai. Producer aur baaki groups ko kuch pata nahi chalta.', go: ['topic>gr'] },
        { name: 'Broker down', text: 'Ek broker gira. Controllers ne ISR mein se naya leader chuna. acks=all ki wajah se koi acknowledged record nahi khoya.', go: ['ctrl>topic'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Queue = to-do list (padha to gaya). Kafka = append-only log (padhne se kuch nahi mitta, retention ke baad delete).</li>
      <li>Topic → partitions → offsets. Order sirf partition ke andar. Same key = same partition = us key ka order.</li>
      <li>Consumer group: group ke andar ek partition ek consumer ko (max parallelism = partitions). Alag groups independent.</li>
      <li>Consumer aaye/jaaye to rebalance. Cooperative / KIP-848 rebalance sirf zaroori partitions hilata hai. Lag = sabse zaroori metric.</li>
      <li>Replay: bookmark pichhe karo. Lag retention se lamba hua to data gaya.</li>
      <li>Replication factor 3 + acks=all + min.insync.replicas=2 = ek broker gire to bhi koi acknowledged record nahi khota. KRaft controllers leader chunte hain (Kafka 4.0 se ZooKeeper nahi).</li>
      <li>Dual write (DB + Kafka) chupke se data bigaadta hai. Outbox + CDC (Debezium) se ek transaction, phir at-least-once publish, consumer dedup.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['Ek event, kitne bhi independent consumers, bina copies ke', 'Replay: nayi team, bug fix, naya system shuru se bharna', 'Bahut zyada throughput (sequential disk writes, batching, page cache)', 'Per-key ordering', 'Replication + acks=all se durable', 'CDC/outbox se DB aur baaki duniya sync'],
      costs: ['Operate karna mushkil: brokers, partitions, rebalancing, monitoring', 'Group ki parallelism partitions tak seemit; partitions baad mein badhana order tod sakta hai', 'Per-message retry/DLQ built-in nahi (queue jaisa nahi); khud banana padta hai', 'Sirf partition ke andar order; global order nahi', 'At-least-once: consumers idempotent banane padte hain', 'Chhote use-case ke liye overkill'] },

    { type: 'think', questions: [
      { q: 'xyz.com ka "video viewed" topic: 12 partitions. Analytics group mein 20 consumers lagaye, phir bhi lag kam nahi ho raha. Kyun, aur kya karoge?', a: 'Group mein max 12 consumers kaam kar sakte hain; 8 idle hain. Ya to har consumer ko tez karo (batching, kam DB calls), ya partitions badhao (key mapping badlegi, order-sensitive consumers ka dhyaan rakho). Ye bhi check karo ki koi ek partition hot to nahi (ek viral video key).' },
      { q: 'Payment service "payment.succeeded" event bhejti hai. acks, min.insync.replicas aur consumer side pe kya settings/design choose karoge?', a: 'Replication factor 3, acks=all, min.insync.replicas=2, idempotent producer, unclean leader election off. Event outbox se publish ho taaki DB aur Kafka sync rahein. Consumers at-least-once (process ke baad commit) aur payment_id se idempotent.' },
      { q: 'Debezium se seedha videos table ki CDC karein, ya outbox table banayein? Dono ka ek faayda batao.', a: 'Seedha CDC: app code mein zero change, har change pakka capture. Outbox: events business-level hote hain ("VideoPublished"), table ka internal schema chhupa rehta hai, aur event ka format service ke control mein. Public events ke liye outbox behtar; internal replication/search sync ke liye seedha CDC kaafi.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Kafka mein record kab delete hota hai?', options: ['Jab sab consumers padh lein', 'Retention time/size ke baad (ya compaction mein purani value)', 'Turant ack ke baad'], answer: 1, explain: 'Padhne se delete nahi hota. Isi se replay possible hai.' },
      { q: '8 partitions, ek consumer group mein 10 consumers. Kya hoga?', options: ['Saare 10 kaam karenge', '8 kaam karenge, 2 idle', 'Kafka error dega'], answer: 1, explain: 'Group ke andar ek partition ek hi consumer ko milta hai.' },
      { q: 'Ek user ke saare events order mein process hon, iske liye?', options: ['Partitions 1 kar do hamesha', 'user_id ko message key banao', 'Consumers zyada karo'], answer: 1, explain: 'Same key → same partition → partition ke andar order. Ek partition se bhi order milta, lekin scale khatam.' },
      { q: 'Service ne DB commit kiya, phir Kafka publish se pehle crash ho gayi. Is problem ka standard ilaaj?', options: ['Kafka pehle, DB baad mein', 'Transactional outbox (event usi DB transaction mein), phir CDC/relay se publish', 'Do baar publish karo'], answer: 1, explain: 'Dual write ka koi order safe nahi. Outbox event ko DB ke saath atomic bana deta hai.' },
      { q: 'acks=1 ke saath kya risk hai?', options: ['Duplicate records', 'Leader ne ack diya, followers copy karein usse pehle leader gira to record kho sakta hai', 'Producer slow ho jaata hai'], answer: 1, explain: 'acks=1 sirf leader ka confirm hai. Durable writes ke liye acks=all + min.insync.replicas.' },
      { q: 'Eager rebalance aur cooperative rebalance mein farak?', options: ['Koi farak nahi', 'Eager mein sab consumers apne saare partitions chhod ke rukte hain; cooperative mein sirf jinka owner badla wahi rukte hain', 'Cooperative mein partitions kabhi nahi hilte'], answer: 1, explain: 'Lab mein: consumer jodne pe eager ne saare 6 partitions 2 s roke (t=20 pe lag 1,000), cooperative ne sirf P2, P5 (lag 333). Kafka 4.0 ka KIP-848 protocol isi incremental idea pe hai.' },
      { q: 'Analytics group 9 din down raha, retention 7 din. Wapas aane pe kya hoga?', options: ['Sab events mil jaayenge', 'Bookmark ke baad ke pehle 2 din ke events delete ho chuke: wo is group ke liye hamesha ke liye gaye', 'Kafka retention apne aap badha dega'], answer: 1, explain: 'Retention padhne ka wait nahi karta. Lag pe alarm lagao aur retention normal downtime se lamba rakho.' },
    ]},
    { type: 'sources', note: 'Paper 2011 ka hai: replication, KRaft, transactions jaise features baad mein aaye, unke liye current official docs use kiye.', items: [
      { title: 'Kafka: a Distributed Messaging System for Log Processing', publisher: 'LinkedIn (Kreps, Narkhede, Rao), NetDB workshop 2011', official: true, year: 2011, url: 'https://notes.stephenholiday.com/Kafka.pdf', used: 'Why existing messaging systems were a poor fit, offset as message id, pull model, consumer-side state, time-based retention (typically 7 days) and rewind, sendfile/page cache, partition as unit of parallelism in a consumer group, ZooKeeper role then, at-least-once, replication as future work.' },
      { title: 'Apache Kafka design documentation (4.2)', publisher: 'Apache Kafka', official: true, url: 'https://kafka.apache.org/42/design/design/', used: 'Leader/follower replication, ISR and replica.lag.time.max.ms, committed records, acks=all with min.insync.replicas, unclean leader election default, delivery semantics, log compaction, pull rationale.' },
      { title: 'Apache Kafka 4.0.0 Release Announcement', publisher: 'Apache Kafka blog', official: true, year: 2025, url: 'https://kafka.apache.org/blog/2025/03/18/apache-kafka-4.0.0-release-announcement/', used: 'Kafka 4.0 runs without ZooKeeper (KRaft only); new consumer rebalance protocol (KIP-848) GA, opt-in with group.protocol=consumer; early access of Queues for Kafka (KIP-932).' },
      { title: 'Kafka 4.2 upgrade notes', publisher: 'Apache Kafka', official: true, url: 'https://kafka.apache.org/42/getting-started/upgrade/', used: 'Queues for Kafka (share groups) production-ready in 4.2.' },
      { title: 'What\'s New in Apache Kafka 3.0.0 (KIP-679)', publisher: 'Apache Kafka blog', official: true, url: 'https://blogsarchive.apache.org/kafka/entry/what-s-new-in-apache6', used: 'Producer defaults acks=all and enable.idempotence=true since 3.0.' },
      { title: 'Debezium PostgreSQL connector', publisher: 'Debezium documentation', official: true, url: 'https://debezium.io/documentation/reference/stable/connectors/postgresql.html', used: 'Logical decoding, replication slot, pgoutput, initial snapshot, change event fields (before, after, op, source).' },
      { title: 'Outbox Event Router', publisher: 'Debezium documentation', official: true, url: 'https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html', used: 'Dual-write problem, outbox table columns, routing by aggregatetype, aggregateid as key, at-least-once and consumer dedup by event id.' },
    ]},
  ],
});
