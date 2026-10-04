Lesson.register({
  id: 'sharding',
  title: 'Partitioning aur sharding',
  minutes: 34,
  summary: `Replicas ne reads aur availability sambhal li, lekin har write abhi bhi ek hi leader pe jaata hai, aur data ek machine ki disk se bada ho raha hai. Sharding matlab data ko tukdon mein baant ke alag machines pe rakhna, taaki writes aur storage dono scale hon. Sabse bada faisla: shard key.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `xyz.com ka data itna bada ho gaya hai ki ek computer mein samaata hi nahi. Aur naye changes (writes) itne aate hain ki ek computer thak jaata hai.<br>Copies (replicas) banane se kaam nahi chalega, kyunki har copy ko bhi har change likhna padta hai.<br>Hal: data ko <strong>hisson mein baant do</strong>. Jaise ek library ki kitaabein kai almaariyon mein: A-F pehli almaari, G-M doosri. Har almaari alag computer.<br>Is lesson ka asli sawaal: <strong>kaunsi cheez kis almaari mein jaaye</strong>, taaki koi ek almaari bhar na jaaye, aur cheez dhoondhne ke liye saari almaariyan na kholni padein.` },
    { type: 'h2', text: 'Problem: leader ab writes nahi jhel pa raha' },
    { type: 'p', html: `Pichhle lesson mein xyz.com ko leader + replicas mile. Reads baant diye, failover aa gaya. Lekin ab xyz.com pe orders, chats aur posts itne badh gaye ki:` },
    { type: 'list', items: [
      `<strong>Writes:</strong> ~40,000 writes/sec. Ek SQL leader kuch hazaar se ~10,000 writes/sec tak aaraam se karta hai. Replicas yahan kuch nahi karte, kyunki har replica ko bhi har write apply karna hai.`,
      `<strong>Storage:</strong> data 20 TB ho gaya. Roadmap ke hisaab se ek database machine ~1-5 TB tak comfortable rehti hai. Uske baad backups, index rebuild, naya replica banana: sab ghanton/dinon ka kaam.`,
      `<strong>Bigger machine?</strong> Kar chuke. Sabse badi machine bhi ek limit pe ruk jaati hai.`,
    ]},
    { type: 'p', html: `Jawab: data ko <strong>tukdon</strong> mein baanto. Har tukda alag machine pe, apne writes aur apni storage ke saath. 4 tukde = roughly 4 guna writes aur 4 guna storage.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Partition aur Shard', html: `<strong>Ye kya hai:</strong> <strong>partitioning</strong> = ek bade dataset ko chhote hisson mein todna. Jab ye hisse <strong>alag machines</strong> pe rakhe jaate hain, to har hisse ko <strong>shard</strong> kehte hain aur process ko <strong>sharding</strong>. (Cassandra, Kafka, DynamoDB "partition" bolte hain; MongoDB, Vitess "shard". Idea same.)<br><strong>Kyun chahiye:</strong> har shard apne hisse ke writes khud leta hai aur apna data khud rakhta hai. 4 shards = lagbhag 4 guna writes aur 4 guna storage.<br><strong>Iske bina:</strong> saare writes ek leader pe, saara data ek disk pe, aur ek din wo limit aa hi jaati hai.<br><strong>Example:</strong> 20 TB orders, 4 shards: har shard pe ~5 TB aur ~10,000 writes/sec.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Shard key', html: `<strong>Ye kya hai:</strong> wo column jiski value se tay hota hai ki ek row kis shard mein jaayegi, jaise <code>user_id</code>. Library mein kitaab ka naam (A-F, G-M) shard key jaisa hai.<br><strong>Kyun chahiye:</strong> isi se pata chalta hai ki data kahan rakhna hai aur baad mein kahan dhoondhna hai.<br><strong>Iske bina:</strong> data kahin bhi pada ho sakta hai, aur har query ko saare shards kholne padenge.<br><strong>Dhyaan do:</strong> ye is lesson ka sabse bada faisla hai, aur baad mein badalna bahut mehenga.` },

    { type: 'h2', text: 'Vertical vs horizontal partitioning' },
    { type: 'p', html: `Data todne ke do bilkul alag tareeke hain. Naam milte-julte hain, isliye log confuse hote hain.` },
    { type: 'compare',
      left: { title: 'Vertical: columns/tables alag karo', ascii: `
users table
┌────┬──────┬───────┬──────────┐
│ id │ name │ email │ bio, pic │
└────┴──────┴───────┴──────────┘
        ↓ split
┌────┬──────┬───────┐ ┌────┬──────────┐
│ id │ name │ email │ │ id │ bio, pic │
└────┴──────┴───────┘ └────┴──────────┘
  hot, chhota            bada, kam padha`, html: `Ek table ke columns alag karo, ya alag features ke tables alag databases mein (users DB, orders DB, chat DB). Isse <em>functional partitioning</em> bhi kehte hain. Aasaan pehla step, lekin har hissa phir bhi ek machine pe hai: users table khud 10 TB ho gayi to ye nahi bachayega.` },
      right: { title: 'Horizontal: rows alag karo', ascii: `
orders table (1 arab rows)
        ↓ split by user_id
┌─────────────┐ ┌─────────────┐
│ Shard 1     │ │ Shard 2     │
│ users A...  │ │ users B...  │
│ same columns│ │ same columns│
└─────────────┘ └─────────────┘`, html: `Har shard mein <strong>same schema</strong> (schema = table ka dhaancha: kaunse columns, kis type ke), lekin alag rows. Yahi asli <strong>sharding</strong> hai. Isse writes aur storage dono bina limit scale ho sakte hain, lekin queries, joins aur transactions mushkil ho jaate hain.` },
    },
    { type: 'callout', tone: 'mistake', title: 'Pehle ye try karo', html: `Sharding <strong>mehenga</strong> hai: har query ko shard key ka dhyaan, cross-shard joins mushkil, operations bhaari. Roadmap ka order yaad rakho: indexes → cache → read replicas → bada machine → vertical/functional split → <strong>tab</strong> sharding. Bahut saari companies ek achhe Postgres/MySQL pe saalon chalti hain.` },

    { type: 'h2', text: 'Request apna shard kaise dhoondhti hai?' },
    { type: 'p', html: `Data ab 3 machines pe hai. Koi bhi query aaye, kisi ko to batana padega ki "user 42 ka data Shard 2 pe hai". Ye kaam ek <strong>router</strong> karta hai. Router teen jagah ho sakta hai: app ke andar ek library, beech mein ek proxy (Vitess ka VTGate), ya database ka coordinator node (Citus). Teeno ka kaam same: shard key dekho, shard nikaalo, query wahan bhejo.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Shard router', html: `<strong>Ye kya hai:</strong> ek chhota sa "rasta batane wala". Query aati hai, wo shard key ki value dekhta hai aur batata hai "ye Shard 2 pe hai".<br><strong>Kyun chahiye:</strong> app ko har baar khud hisaab na lagana pade, aur shards ka naksha (map) ek jagah rahe. Shard badle to sirf router ka map badlo.<br><strong>Iske bina:</strong> har app server mein naksha alag alag copy, aur ek bhi purana raha to galat shard pe query.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Scatter-gather', html: `<strong>Ye kya hai:</strong> jab query mein shard key nahi hoti, router use <strong>saare</strong> shards pe bhejta hai (scatter = bikherna) aur unke jawab jodta hai (gather = ikattha karna).<br><strong>Kab theek:</strong> kabhi kabhi ki query, jaise admin report.<br><strong>Problem:</strong> har shard ko kaam karna padta hai, aur poori query <strong>sabse slow shard</strong> jitni slow hoti hai. Agar tumhari sabse common query scatter-gather ban rahi hai, to shard key galat chuni hai.<br><strong>Example:</strong> 4 shards, teen 20 ms mein jawab dete hain, ek 900 ms mein: query 900 ms ki.` },
    { type: 'flow', title: 'Orders, user_id se sharded', height: 340,
      nodes: [
        { id: 'app', label: 'App server', x: 80, y: 170, w: 120, kind: 'server', info: 'Ye kya hai: xyz.com ka API server. Ise sirf query bhejni hai; kaunse shard pe, ye router decide karta hai.' },
        { id: 'rt', label: 'Shard router', sub: 'key → shard', x: 260, y: 170, w: 150, kind: 'net', info: 'Ye kya hai: rasta batane wala (router). Shard key ki value se shard nikaalta hai, jaise hash(user_id) se. Agar query mein shard key nahi hai, to sab shards se poochhna padta hai (scatter-gather) aur results jodne padte hain. Ye app library, proxy (VTGate) ya coordinator (Citus) ho sakta hai.' },
        { id: 's1', label: 'Shard 1', sub: 'users ka 1/3', x: 500, y: 55, w: 150, kind: 'data', meter: true, load: 40, info: 'Ye kya hai: data ka pehla hissa, ek alag database machine (asal mein leader + replicas, pichhla lesson). Isme sirf unhi users ke orders hain jinka hash isse map hota hai.' },
        { id: 's2', label: 'Shard 2', sub: 'users ka 1/3', x: 500, y: 170, w: 150, kind: 'data', meter: true, load: 40, info: 'Ye kya hai: doosra hissa. Same schema (same columns), alag users. Shards ek doosre ke baare mein kuch nahi jaante.' },
        { id: 's3', label: 'Shard 3', sub: 'users ka 1/3', x: 500, y: 285, w: 150, kind: 'data', meter: true, load: 40, info: 'Ye kya hai: teesra hissa. Har shard apne writes khud leta hai, isliye total write capacity roughly 3 guna.' },
      ],
      edges: [{ a: 'app', b: 'rt' }, { a: 'rt', b: 's1' }, { a: 'rt', b: 's2' }, { a: 'rt', b: 's3' }],
      scenarios: [
        { name: 'Ek shard (happy)', steps: [
          { title: 'Riya apne orders kholti hai', text: 'Query mein shard key (user_id) hai. Badhiya.', go: 'app>rt', msg: 'SELECT * FROM orders WHERE user_id = 42' },
          { title: 'Router shard nikaalta hai', text: 'hash(42) se Shard 2 nikla. Sirf wahi machine kaam karegi; baaki do ko pata bhi nahi chala.', set: { s1: { state: 'dim' }, s3: { state: 'dim' } }, go: 'rt>s2', msg: 'hash(42) → Shard 2' },
          { title: 'Jawab', text: 'Ek machine, ek index lookup, fast. Isliye shard key wahi chuno jo tumhari <strong>sabse common query</strong> mein hai.', go: 'res:s2>rt>app', after: { s2: { state: 'hit' } } },
          { title: 'Writes bhi baant gaye', text: 'Har naya order apne user ke shard pe jaata hai. Teeno machines writes le rahi hain: write capacity 3 guna.', flood: { paths: ['app>rt>s1', 'app>rt>s2', 'app>rt>s3'], n: 12 }, set: { s1: { state: '' }, s3: { state: '' } } },
        ]},
        { name: 'Scatter-gather', intro: 'Admin dashboard: "aaj ke saare orders jo ₹5,000 se upar hain". Isme user_id hai hi nahi.', steps: [
          { title: 'Query bina shard key', text: 'Router ko nahi pata ye orders kahan hain. Kisi bhi shard pe ho sakte hain.', go: 'app>rt', msg: 'SELECT * FROM orders WHERE created_at >= today AND amount > 5000\nORDER BY amount DESC LIMIT 20' },
          { title: 'Scatter: sabko poochho', text: 'Router query teeno shards pe bhejta hai. Ise <strong>scatter</strong> kehte hain.', parallel: true, go: ['rt>s1', 'rt>s2', 'rt>s3'] },
          { title: 'Ek shard slow', text: 'Shard 3 pe abhi koi backup chal raha hai. Wo 900 ms le raha hai. Router ko <strong>sabka</strong> jawab chahiye, to poori query 900 ms ki.', set: { s3: { state: 'warn', sub: 'slow: 900 ms' } }, parallel: true, go: ['res:s1>rt', 'res:s2>rt'] },
          { title: 'Gather: jodo aur sort karo', text: 'Har shard ne apne top 20 bheje. Router 60 rows ko merge karke final top 20 nikaalta hai. Ise <strong>gather</strong> kehte hain. Shards jitne zyada, utna zyada kaam aur utna zyada chance ki koi ek slow ho (tail latency).', go: ['res:s3>rt', 'res:rt>app'], msg: '3 × top 20 → merge → top 20' },
        ]},
        { name: 'Hot shard', intro: 'Ek celebrity seller ne sale lagayi. Uske saare orders ek hi user_id pe.', steps: [
          { title: 'Ek key pe toofan', text: 'Seller ka user_id = 7. hash(7) → Shard 1. Saari sale ki writes ussi key pe.', flood: { paths: ['app>rt>s1'], n: 16 }, after: { s1: { load: 99, state: 'hot', sub: 'HOT: seller 7' }, s2: { load: 25 }, s3: { load: 25 } } },
          { title: 'Baaki shards khaali', text: 'Shard 2 aur 3 aaraam se baithe hain. Total capacity bahut hai, lekin ek shard ki limit hit. Isse <strong>hot shard</strong> ya <strong>hot partition</strong> kehte hain, aur ek key ki wajah se ho to <strong>celebrity key</strong>.', focus: ['s1', 's2', 's3'] },
          { title: 'Shard 1 ke doosre users bhi pareshan', text: 'Jo aam users Shard 1 pe hain unki queries bhi slow. Ek ki problem, sabki problem. Fixes neeche "Hot shards" section mein.', go: ['app>rt>s1', 'bad:s1>rt>app'], msg: 'timeout: Shard 1 overloaded' },
        ]},
        { name: 'Ek shard down', steps: [
          { title: 'Shard 3 crash', text: 'Shard 3 ki machine gayi (aur failover abhi chal raha hai).', set: { s3: { state: 'down', sub: 'DOWN' } }, go: 'lost:rt>s3' },
          { title: 'Shard 1 aur 2 ke users: sab normal', text: 'Unke orders bilkul theek. Ye sharding ka chhupa faayda hai: failure ka <strong>blast radius</strong> (failure kitno ko nuksaan karta hai) chhota. Poori site nahi, sirf 1/3 users affected.', go: ['app>rt>s1', 'res:s1>rt>app'] },
          { title: 'Shard 3 ke users: error', text: 'Unke liye "orders load nahi ho rahe". Isliye har shard khud bhi replicated hota hai (leader + replicas + failover). Sharding scale deta hai, replication availability: asli systems dono saath use karte hain.', go: ['app>rt>s3', 'bad:s3>rt>app'], msg: '503: shard 3 unavailable' },
        ]},
      ],
    },

    { type: 'h2', text: 'Shard kaise chunein: 4 strategies' },
    { type: 'h3', text: '1. Range-based sharding' },
    { type: 'p', html: `Key ki <strong>range</strong> ke hisaab se: user_id 1-1 crore Shard 1, 1-2 crore Shard 2... ya naam A-F, G-M... ya date: Jan-Mar Shard 1, Apr-Jun Shard 2. Dictionary ke volumes jaisa.<br><strong>Worked example:</strong> 4 shards: user_id 1-25 lakh Shard 1, 25-50 lakh Shard 2, 50-75 lakh Shard 3, 75 lakh se upar Shard 4. Aaj 10,000 naye users aaye. Unke id 80 lakh ke aas paas hain (auto-increment, yaani har naye user ko agla number). To <strong>saare 10,000 Shard 4 pe</strong>, aur naye users hi sabse active hote hain.` },
    { type: 'list', items: [
      `<strong>Faayda:</strong> range queries ek ya do shards pe ("1 se 7 March ke orders", "user_id 500 se 600"). Sorted order bana rehta hai.`,
      `<strong>Nuksaan:</strong> agar key badhti hui hai (timestamp, auto-increment id), to <strong>saare naye writes aakhri shard pe</strong>. Baaki shards purana data sambhal ke so rahe hain. Classic hot shard.`,
      `<strong>Kahan:</strong> Bigtable/HBase (row-key ranges, jo bade hone pe split hote hain), MongoDB range sharding, time-series data.`,
    ]},
    { type: 'h3', text: '2. Hash-based sharding' },
    { type: 'p', html: `Key ka <strong>hash</strong> nikaalo (ek function jo kisi bhi value ko random-jaise number mein badal deta hai), phir us number se shard chuno. user 41 aur user 42 bilkul alag shards pe ja sakte hain. Data aur load barabar fail jaata hai.<br><strong>Worked example:</strong> 4 shards, shard = hash(user_id) % 4. Wahi 10,000 naye users ~2,500-2,500 chaaron shards pe. Lekin "user_id 500 se 600 tak" waali query ab chaaron shards pe jaayegi.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Hash function', html: `<strong>Ye kya hai:</strong> ek formula jo input (jaise <code>"user:42"</code>) ko ek bada number bana deta hai. Same input = hamesha same number. Lekin input mein chhota sa farak (42 → 43) = bilkul alag number. Examples: MurmurHash, xxHash, MD5.<br><strong>Kyun chahiye:</strong> isi se keys shards pe "random jaisi" lekin hamesha same jagah bikharti hain. Router baad mein wahi formula chala ke shard dhoondh leta hai.<br><strong>Iske bina:</strong> ya to ranges (naye users ek jagah jama), ya har key ka hisaab ek table mein likhna padta.<br><strong>% (modulo):</strong> bhaag dene ke baad bacha hua hissa. 10 % 4 = 2. Isliye <code>hash % 4</code> hamesha 0, 1, 2 ya 3 deta hai: chaar shards mein se ek.` },
    { type: 'list', items: [
      `<strong>Faayda:</strong> even spread, sequential keys bhi bikhar jaati hain.`,
      `<strong>Nuksaan:</strong> range queries ab scatter-gather ("user_id 500-600" sab shards pe). Aur agar <code>hash % N</code> kiya, to N badalte hi lagbhag saara data idhar-udhar (agla lesson, Consistent hashing, isi ka hal hai).`,
      `<strong>Kahan:</strong> Cassandra, DynamoDB (partition key ka hash), Citus, Vitess ka hash vindex, Redis Cluster.`,
    ]},
    { type: 'h3', text: '3. Directory / lookup-based sharding' },
    { type: 'p', html: `Ek alag chhota sa table (<strong>directory</strong>) rakho: "tenant 7 → Shard 3", "tenant 8 → Shard 1" (tenant = ek customer company, jiska apna alag data hai). Router pehle directory dekhta hai. Koi formula nahi, poora control.<br><strong>Worked example:</strong> xyz.com Business ke 1,000 chhote customers (companies) aur 1 bahut bada customer, "MegaCorp", jo akela 30% traffic laata hai. Directory mein likh do: "MegaCorp → Shard 4 (sirf uska)", baaki 1,000 Shard 1-3 pe barabar. Kal MegaCorp aur bada hua? Sirf uski entry badlo aur use naye shard pe le jao.` },
    { type: 'list', items: [
      `<strong>Faayda:</strong> kisi bhi key ko kahin bhi rakh sakte ho. Ek bada customer (company) apne alag shard pe; ek hot tenant ko akele move kar sakte ho bina baaki ko chhede.`,
      `<strong>Nuksaan:</strong> har query se pehle ek extra lookup (isliye directory ko cache karte hain), aur directory khud highly available honi chahiye, warna wahi SPOF.`,
      `<strong>Kahan:</strong> multi-tenant SaaS (har company ek tenant). Vitess ke <em>lookup vindex</em> bhi isi idea pe hain.`,
    ]},
    { type: 'h3', text: '4. Geo sharding' },
    { type: 'p', html: `User ke <strong>desh ya region</strong> se: India ke users ka data Mumbai shard pe, Europe ka Frankfurt pe.<br><strong>Worked example:</strong> xyz.com ke 55% users India, 15% US, 15% Europe, 15% baaki. 4 geo shards banaye to India wala shard average (25%) se 2.2 guna bhaari: 55 ÷ 25 = 2.2.` },
    { type: 'list', items: [
      `<strong>Faayda:</strong> data user ke paas (latency kam), aur <strong>data residency</strong> laws (kuch desh chahte hain unke citizens ka data desh ke andar rahe) follow karna aasaan.`,
      `<strong>Nuksaan:</strong> desh barabar nahi hote. xyz.com ke aadhe users India mein hain to India wala shard baaki sab se kai guna bhaari. Roadmap ke shabdon mein: India us shard ko pighla dega. Isliye geo ke <em>andar</em> phir hash sharding karte hain.`,
    ]},
    { type: 'table', head: ['Strategy', 'Spread', 'Range query', 'Resharding', 'Best kab'], rows: [
      ['Range', 'Key pe depend; sequential key = hot', 'Achhi', 'Range split karna aasaan', 'Time-series, sorted scans'],
      ['Hash', 'Barabar', 'Scatter-gather', 'mod N bura; fixed partitions / consistent hashing achha', 'Default for user/entity data'],
      ['Directory', 'Jaisa tum rakho', 'Depends', 'Sabse flexible (entry badlo)', 'Multi-tenant, bade customers'],
      ['Geo', 'Desh ke size jaisa (uneven)', 'Region ke andar', 'Mushkil', 'Latency + data residency'],
    ]},

    { type: 'h3', text: 'Strategy lab: kaunsi key kahan jaati hai' },
    { type: 'p', html: `Har chhota dabba ek user hai (number = user_id). Rang batata hai wo kis shard pe hai. Strategy badlo, phir "10 naye users" dabao aur dekho naye users kahan girte hain. "Celebrity" on karo: user 7 akela 30% traffic laata hai.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="sl-st" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">
          <button type="button" class="btn small primary sl-add">+ 10 naye users</button>
          <button type="button" class="btn small sl-cel"></button>
          <button type="button" class="btn small ghost sl-reset">Reset</button>
        </div>
        <div class="sl-rule calc-note" style="margin-top:10px"></div>
        <div class="sl-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(40px,1fr));gap:6px;margin-top:12px"></div>
        <div class="sl-bars" style="margin-top:14px"></div>
        <div class="calc-note sl-note"></div>`;
      const q = s => el.querySelector(s);
      const COL = ['var(--accent)', 'var(--green)', 'var(--amber)', 'var(--violet)'];
      const ST = { range: 'Range', hash: 'Hash', dir: 'Directory', geo: 'Geo' };
      const RULE = {
        range: 'Niyam: user_id 1-10 → Shard 1, 11-20 → Shard 2, 21-30 → Shard 3, 31 se upar → Shard 4.',
        hash: 'Niyam: shard = hash("id:" + id) % 4. Har id ka "random jaisa" lekin pakka shard. (Chhote numbers mein thoda upar neeche hota hai; lakhon keys pe lagbhag barabar.)',
        dir: 'Niyam: ek lookup table. Naya user aaye to use sabse khaali shard pe likh do. Celebrity on ho to user 7 ko Shard 4 akele mil jaata hai.',
        geo: 'Niyam: desh se. India → Shard 1, US → Shard 2, Europe → Shard 3, baaki → Shard 4. (55% users India ke.)',
      };
      const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; return h >>> 0; };
      const country = id => { const r = hash('c:' + id) % 100; return r < 55 ? 0 : r < 70 ? 1 : r < 85 ? 2 : 3; };
      const CN = ['IN', 'US', 'EU', '..'];
      let st = 'range', n = 40, cel = false;
      function place(st, n, cel) {
        const shard = [], cnt = [0, 0, 0, 0];
        for (let id = 1; id <= n; id++) {
          let s;
          if (st === 'range') s = id <= 10 ? 0 : id <= 20 ? 1 : id <= 30 ? 2 : 3;
          else if (st === 'hash') s = hash('id:' + id) % 4;
          else if (st === 'geo') s = country(id);
          else if (cel && id === 7) s = 3;
          else { const pool = cel ? [0, 1, 2] : [0, 1, 2, 3]; s = pool.reduce((b, x) => cnt[x] < cnt[b] ? x : b, pool[0]); }
          shard[id] = s; cnt[s]++;
        }
        const w = id => cel && id === 7 ? 0.3 * (n - 1) / 0.7 : 1;
        const tr = [0, 0, 0, 0]; let tot = 0;
        for (let id = 1; id <= n; id++) { tr[shard[id]] += w(id); tot += w(id); }
        return { shard, cnt, traffic: tr.map(t => t / tot) };
      }
      const upd = () => {
        const sb = q('.sl-st'); sb.innerHTML = '';
        Object.entries(ST).forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (k === st ? ' on' : ''); b.textContent = v; b.onclick = () => { st = k; upd(); }; sb.appendChild(b); });
        q('.sl-cel').textContent = 'Celebrity (user 7): ' + (cel ? 'ON' : 'OFF');
        q('.sl-add').disabled = n >= 80;
        q('.sl-rule').textContent = RULE[st];
        const r = place(st, n, cel);
        let g = '';
        for (let id = 1; id <= n; id++) {
          const isNew = id > 40, star = cel && id === 7;
          g += `<div title="user ${id}" style="border:2px solid ${COL[r.shard[id]]};border-radius:6px;background:${star ? 'var(--surface)' : 'var(--surface-2)'};text-align:center;padding:3px 0;font:${isNew || star ? 700 : 400} 12px var(--f-mono);color:var(--ink)${isNew ? ';box-shadow:0 0 0 2px var(--line-2)' : ''}">${star ? '★' : ''}${id}${st === 'geo' ? `<div style="font-size:10px;color:var(--ink-3)">${CN[country(id)]}</div>` : ''}</div>`;
        }
        q('.sl-grid').innerHTML = g;
        q('.sl-bars').innerHTML = r.cnt.map((c, i) => {
          const p = r.traffic[i] * 100;
          return `<div style="display:grid;grid-template-columns:72px 1fr 104px;gap:8px;align-items:center;margin:5px 0">
            <strong style="color:${COL[i]};font-family:var(--f-display);white-space:nowrap">Shard ${i + 1}</strong>
            <div style="height:12px;background:var(--surface-2);border:1px solid var(--line);border-radius:6px;overflow:hidden"><div style="height:100%;width:${p.toFixed(1)}%;background:${COL[i]}"></div></div>
            <span style="font:12px var(--f-mono);color:var(--ink-2)">${c} user${c === 1 ? '' : 's'}, ${p.toFixed(0)}%</span></div>`;
        }).join('') + '<div style="font-size:12px;color:var(--ink-3)">Bar = us shard pe traffic ka hissa. Barabar ho to har shard ~25%.</div>';
        const mx = Math.max(...r.traffic), hot = r.traffic.indexOf(mx) + 1;
        let note;
        if (st === 'range') note = n > 40 ? `Naye ${n - 40} users (moti border) SAB Shard 4 pe gaye, kyunki naye id hamesha sabse bade hote hain. Shard 4: ${r.cnt[3]} users, baaki 10-10. Badhti hui key + range = ek garam shard.` + (cel ? ` Aur user 7 (celebrity) Shard 1 pe: wahan ${(r.traffic[0] * 100).toFixed(0)}% traffic.` : '') : 'Abhi sab barabar (10-10). Ab "+ 10 naye users" dabao.' + (cel ? ` Celebrity user 7 Shard 1 pe hai: wahan ${(r.traffic[0] * 100).toFixed(0)}% traffic.` : '');
        else if (st === 'hash') note = cel ? `Users barabar bikhre, lekin user 7 ka saara traffic ek hi shard pe: Shard ${hot} pe ${(mx * 100).toFixed(0)}% traffic. Hash keys ko baantta hai, ek key ke traffic ko nahi.` : `Naye users bhi chaaron shards pe bikhar gaye (${r.cnt.join(', ')}). Lekin "user_id 11 se 20" jaisi range query ab chaaron shards pe jaayegi.`;
        else if (st === 'dir') note = cel ? `Directory ne user 7 ko Shard 4 akele de diya (${(r.traffic[3] * 100).toFixed(0)}% traffic, lekin sirf 1 user). Baaki ${n - 1} users Shard 1-3 pe barabar. Poora control, lekin har query se pehle table dekhna padta hai.` : `Har naya user sabse khaali shard pe (${r.cnt.join(', ')}). Table mein ${n} entries: har user ki ek line. Ye table khud fast aur highly available honi chahiye.`;
        else note = `India wala Shard 1: ${r.cnt[0]} users (${(r.traffic[0] * 100).toFixed(0)}% traffic). Desh barabar nahi hote, isliye geo shard ke andar phir hash karte hain.` + (cel ? ` Celebrity user 7 Europe (${CN[country(7)]}) ka hai, to Shard ${country(7) + 1} pe bhi ${(r.traffic[country(7)] * 100).toFixed(0)}% traffic.` : '');
        q('.sl-note').textContent = note;
      };
      q('.sl-add').onclick = () => { n = Math.min(80, n + 10); upd(); };
      q('.sl-cel').onclick = () => { cel = !cel; upd(); };
      q('.sl-reset').onclick = () => { n = 40; cel = false; upd(); };
      upd();
    }},
    { type: 'h2', text: 'Khud chuno: shard key playground' },
    { type: 'p', html: `xyz.com ke 4 shards hain. Dataset chuno, shard key chuno, aur dekho aaj ke 20,000 writes shards pe kaise baante, kaunsa shard garam hua, aur kaunsi queries ek shard pe chalti hain vs sab shards pe (scatter-gather). Phir "celebrity" toggle on karke dekho.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="sk-ds" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="sk-keys" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>
        <div class="sk-celeb" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>
        <div class="sk-bars" style="margin-top:14px"></div>
        <div class="stats">
          <div class="stat"><span>Sabse bhaari shard</span><strong class="sk-max"></strong></div>
          <div class="stat"><span>Ideal (barabar)</span><strong>25%</strong></div>
          <div class="stat"><span>Imbalance (max ÷ avg)</span><strong class="sk-imb"></strong></div>
        </div>
        <div class="sk-q" style="margin-top:14px"></div>
        <div class="calc-note sk-note"></div>`;
      const DS = {
        orders: { name: 'Orders', celeb: 'Flash-sale reseller: 15% orders ek hi user ke', keys: {
          user_id: 'user_id (hash)', order_id: 'order_id (hash)', created_at: 'created_at (range)', country: 'country (geo)' },
          queries: [['user_id', 'Riya ke saare orders ("My orders")', true], ['order_id', 'Order #9912 ki detail', false], ['created_at', 'Aaj ke saare orders (report)', false], ['country', 'India ke saare orders', false]] },
        chat: { name: 'Chat messages', celeb: 'Giant group chat: 20% messages ek hi group mein', keys: {
          conversation_id: 'conversation_id (hash)', sender_id: 'sender_id (hash)', created_at: 'created_at (range)', country: 'country (geo)' },
          queries: [['conversation_id', 'Ek chat ki history kholna', true], ['sender_id', 'Riya ne kya kya bheja', false], ['created_at', 'Pichhle 1 ghante ke messages', false], ['country', 'India ke saare messages', false]] },
      };
      let ds = 'orders', key = 'user_id', celeb = false;
      const q = s => el.querySelector(s);
      const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; };
      const COUNTRY = [['IN', 0.55, 0], ['US', 0.15, 1], ['EU', 0.15, 2], ['OTHER', 0.15, 3]];
      function distribute(dsName, k, cel) {
        let seed = 12345;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        const cnt = [0, 0, 0, 0], N = 20000;
        for (let i = 0; i < N; i++) {
          const r = rnd(); let ctry = 'OTHER', geo = 3, acc = 0;
          for (const [c, p, g] of COUNTRY) { acc += p; if (r < acc) { ctry = c; geo = g; break; } }
          const isCeleb = cel && rnd() < (dsName === 'orders' ? 0.15 : 0.20);
          const row = {
            user_id: isCeleb && dsName === 'orders' ? 7 : 1 + Math.floor(rnd() * 50000),
            order_id: 1000000 + i,
            conversation_id: isCeleb && dsName === 'chat' ? 1 : 1 + Math.floor(rnd() * 30000),
            sender_id: 1 + Math.floor(rnd() * 50000),
          };
          let s;
          if (k === 'created_at') s = 3; // shards = quarters; aaj ke writes current quarter wale Shard 4 pe
          else if (k === 'country') s = geo;
          else s = hash(k + ':' + row[k]) % 4;
          cnt[s]++;
        }
        return cnt.map(c => c / N);
      }
      const chips = (box, map, get, set) => { box.innerHTML = ''; Object.entries(map).forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (get() === k ? ' on' : ''); b.textContent = v; b.onclick = () => { set(k); upd(); }; box.appendChild(b); }); };
      const upd = () => {
        const D = DS[ds];
        chips(q('.sk-ds'), { orders: 'Orders', chat: 'Chat messages' }, () => ds, v => { ds = v; key = Object.keys(DS[v].keys)[0]; });
        chips(q('.sk-keys'), D.keys, () => key, v => key = v);
        chips(q('.sk-celeb'), { off: 'Celebrity: off', on: D.celeb }, () => celeb ? 'on' : 'off', v => celeb = v === 'on');
        const sh = distribute(ds, key, celeb);
        const mx = Math.max(...sh), imb = mx / 0.25;
        q('.sk-bars').innerHTML = sh.map((p, i) => {
          const col = p >= 0.38 ? 'var(--red)' : p >= 0.32 ? 'var(--amber)' : 'var(--green)';
          return `<div style="display:grid;grid-template-columns:70px 1fr 56px;gap:10px;align-items:center;margin:6px 0">
            <strong style="font-family:var(--f-display)">Shard ${i + 1}</strong>
            <div style="height:14px;background:var(--surface-2);border-radius:7px;overflow:hidden"><div style="height:100%;width:${(p * 100).toFixed(1)}%;background:${col};transition:width .4s"></div></div>
            <span style="font:13px var(--f-mono)">${(p * 100).toFixed(1)}%</span></div>`;
        }).join('');
        q('.sk-max').textContent = (mx * 100).toFixed(1) + '%';
        q('.sk-imb').textContent = imb.toFixed(2) + 'x';
        q('.sk-q').innerHTML = D.queries.map(([f, label, main]) => {
          const one = f === key;
          return `<div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px;padding:6px 0;border-bottom:1px solid var(--line)">
            <span>${main ? '★ ' : ''}${label}${main ? ' <em style="color:var(--ink-3)">(sabse common)</em>' : ''}</span>
            <strong style="color:${one ? 'var(--green)' : 'var(--amber)'}">${one ? '1 shard' : 'scatter-gather: 4 shards'}</strong></div>`;
        }).join('');
        let note;
        if (key === 'created_at') note = 'Range by time: purana data quarters mein bikhra hai, lekin AAJ ke saare writes current quarter wale Shard 4 pe. Baaki 3 shards writes ke liye bekaar. Roadmap ki warning: timestamp shard key mat banao.';
        else if (key === 'country') note = 'Geo: India ke 55% users ek shard pe. Celebrity ho na ho, ye shard hamesha garam. Geo sirf latency/data-residency ke liye, aur uske andar hash sharding.';
        else if (mx >= 0.38) note = 'Hash ne baaki sab barabar baanta, lekin ek celebrity key ka saara traffic ek hi shard pe (ek key hamesha ek hi shard pe jaati hai). Fix: us key ko split karo (key + bucket/suffix), uske reads cache karo, ya use alag shard do.';
        else if (D.queries[0][0] !== key) note = 'Load barabar hai, lekin sabse common query ab scatter-gather ban gayi: har "chat kholo"/"my orders" pe 4 shards ko poochhna. Shard key sabse common query se chuno.';
        else note = 'Badhiya: load barabar aur sabse common query ek hi shard pe. Yahi roadmap ka Decide rule hai.' + (celeb ? ' (Celebrity ne thoda uneven kiya, nazar rakho.)' : '');
        q('.sk-note').textContent = note;
      };
      upd();
    }},

    { type: 'h2', text: 'Hot shards aur celebrity keys' },
    { type: 'p', html: `Hash sharding <em>keys</em> ko barabar baantta hai, <em>traffic</em> ko nahi. Ek key ka saara data hamesha ek hi shard pe jaata hai. To agar ek key (ek celebrity ki post, ek giant group chat, ek bada enterprise customer) baaki sab se 1,000 guna zyada traffic laaye, uska shard garam hoga hi.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Hot shard aur celebrity key', html: `<strong>Ye kya hai:</strong> <strong>hot shard</strong> = wo shard jis pe baaki sab se kahin zyada traffic aa raha hai. Jab iski wajah ek akeli key ho (ek celebrity ka account, ek viral post, ek giant group chat), to us key ko <strong>celebrity key</strong> (ya hot key) kehte hain.<br><strong>Kyun samajhna zaroori:</strong> system ki capacity utni hi hai jitni sabse garam shard ki. 4 shards mein se ek 100% pe = system atak gaya, chahe baaki 3 khaali hon.<br><strong>Iske bina (dhyaan na diya to):</strong> ek viral post aur us shard ke saare aam users bhi slow ya timeout.<br><strong>Example:</strong> 4 shards, har ek 10,000 writes/sec jhel sakta hai. Ek celebrity ki live sale pe 15,000 writes/sec ek hi key pe aayi: us shard pe 15,000, jabki total capacity 40,000 thi.` },
    { type: 'table', head: ['Fix', 'Kaise', 'Kab'], rows: [
      ['Behtar shard key', 'Aisi key jisme traffic natural taur pe bikhra ho', 'Design ke time, sabse sasta'],
      ['Key splitting / salting', 'Hot key ke peeche ek suffix: <code>post_99#0</code> ... <code>post_99#9</code>. Writes 10 shards pe bikhrte hain; read pe 10 jagah se jod lo', 'Write-hot keys (counters, likes)'],
      ['Time bucket', 'Key = <code>conversation_id + week</code>: ek bahut lambi chat ka data kai partitions mein, har partition limited size', 'Lambi history wale chats, logs'],
      ['Cache / request coalescing', 'Read-hot key ko cache mein; ek saath aayi same requests ko ek hi DB query bana do', 'Read-hot keys (viral post)'],
      ['Alag shard do', 'Directory se bade customer ko apna dedicated shard', 'Multi-tenant, enterprise customers'],
    ]},
    { type: 'callout', tone: 'why', title: 'Asli duniya: Discord aur Slack', html: `<strong>Discord</strong> (engineering blog, 2023): messages ko <code>channel_id</code> + ek fixed time window ("bucket") se partition kiya jaata hai. Bade servers ke busy channels phir bhi <em>hot partitions</em> banate the, aur ek garam node poore cluster ki latency bigaad deta tha. Unhone database ke aage Rust mein "data services" banayi jo same data ki ek saath aayi requests ko ek query mein jod deti hain (request coalescing), aur requests ko channel ke hisaab se same instance pe route karti hain.<br><br><strong>Slack</strong> (engineering blog, 2020): pehle ek workspace ka saara data ek shard pe tha. Bade enterprise customers ke shards hardware ki limit hit karte the jabki baaki shards khaali the. Vitess pe move karke wo kuch data <code>channel_id</code> jaise keys se shard kar paaye, jisse load kahin zyada barabar faila.` },

    { type: 'h2', text: 'Cross-shard queries aur joins' },
    { type: 'p', html: `Ek machine pe <code>JOIN</code> free jaisa lagta tha. Sharding ke baad agar orders Shard 2 pe hain aur unke products Shard 4 pe, to database khud join nahi kar sakta. Options:` },
    { type: 'list', items: [
      `<strong>Co-location:</strong> related tables ko <em>same key</em> se shard karo. User ke orders, uska cart, uske addresses: sab <code>user_id</code> se, to sab ek hi shard pe aur join local. Citus is idea ko "co-location" kehta hai.`,
      `<strong>Reference tables:</strong> chhoti, kam badalne wali tables (countries, categories) ki poori copy <em>har</em> shard pe. Citus inhe "reference tables" kehta hai.`,
      `<strong>Denormalize:</strong> order row mein hi product ka naam aur price copy kar do. Join ki zaroorat hi khatam (cost: update pe kai jagah badalna).`,
      `<strong>App-level join:</strong> do queries chalao aur code mein jodo. Chalega, lekin network hops badhte hain.`,
    ]},
    { type: 'p', html: `<strong>Cross-shard transactions</strong> sabse mushkil: "Riya ke wallet (Shard 1) se 100 kaato, Aman ke (Shard 3) mein daalo" ab do machines pe hai. Iske liye two-phase commit ya sagas chahiye ("Sagas aur distributed transactions" lesson). Isliye shard key aisi chuno ki zyaadatar transactions ek hi shard ke andar rahein. Isi tarah, <strong>globally unique</strong> constraint (jaise unique username) bhi har shard akele check nahi kar sakta.` },

    { type: 'h2', text: 'Secondary indexes on sharded data' },
    { type: 'p', html: `Orders <code>user_id</code> se sharded hain. Ab support team ko chahiye: "phone number 98xxx wale orders" ya "status = pending". Ye shard key nahi hai. Index kahan rakhein? Do tareeke:` },
    { type: 'callout', tone: 'term', title: 'Naya word: Secondary index', html: `<strong>Ye kya hai:</strong> index = kitaab ke peeche wali list ("status pending → page 12, 40, 77"), jisse poori table padhe bina rows mil jaati hain (Indexes lesson yaad karo). <strong>Secondary</strong> index = shard key ke <em>alawa</em> kisi aur column (status, phone) pe index.<br><strong>Kyun chahiye:</strong> support, admin aur search ko shard key ke alawa cheezon se bhi dhoondhna hai.<br><strong>Iske bina:</strong> har shard ki poori table scan, har baar.<br><strong>Sharding mein sawaal:</strong> ye list har shard apni rakhe (local), ya ek alag sharded list sabke liye (global)?` },
    { type: 'compare',
      left: { title: 'Local index (har shard apna)', ascii: `
Shard 1: orders + index(status)
Shard 2: orders + index(status)
Shard 3: orders + index(status)

query status=pending → sab shards`, html: `Har shard sirf apni rows ka index rakhta hai. <strong>Writes aasaan</strong> (row aur index same machine pe, same transaction). Lekin query by status = <strong>scatter-gather</strong>. MongoDB, Cassandra secondary indexes, DynamoDB ka <em>local</em> secondary index is family ke hain.` },
      right: { title: 'Global index (khud sharded)', ascii: `
Index shard A: status a..m → order ids
Index shard B: status n..z → order ids

query status=pending → sirf index shard B
               → phir woh orders fetch`, html: `Index ko <em>indexed value</em> ke hisaab se alag shard karo. <strong>Read</strong> sirf ek index shard pe. Lekin har write ko ab <strong>do jagah</strong> likhna (row ek shard pe, index entry doosre pe), aur aksar index async update hota hai, to thodi der purana. DynamoDB ke <em>global</em> secondary indexes aur Vitess ke lookup vindexes isi tarah ke hain.` },
    },
    { type: 'p', html: `Khud gino. Shards kitne hain, aur ek query "status = pending" kitne orders match karti hai, wo chuno. Lab dikhayegi ki ek read aur ek write mein kitne shards ko kaam karna padta hai:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="ix-m" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="row2" style="margin-top:12px">
          <div><label>Data shards: <strong class="ix-nv"></strong></label><input class="ix-n" type="range" min="4" max="64" step="4" value="8"></div>
          <div><label>"status = pending" kitne orders: <strong class="ix-kv"></strong></label><input class="ix-k" type="range" min="1" max="20" step="1" value="5"></div>
        </div>
        <div class="ix-viz" style="margin-top:12px"></div>
        <div class="stats">
          <div class="stat"><span>Ek read: shards ko calls</span><strong class="ix-r"></strong></div>
          <div class="stat"><span>Ek naya order: kitni jagah likhna</span><strong class="ix-w"></strong></div>
          <div class="stat"><span>Index hamesha taaza?</span><strong class="ix-f"></strong></div>
        </div>
        <div class="calc-note ix-note"></div>`;
      const q = s => el.querySelector(s);
      let mode = 'local';
      function sim(mode, N, K) {
        let seed = 42;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        const hit = new Set();
        for (let i = 0; i < K; i++) hit.add(Math.floor(rnd() * N));
        if (mode === 'local') return { asked: N, data: hit, reads: N, writes: 1 };
        return { asked: hit.size, data: hit, reads: 1 + hit.size, writes: 2 };
      }
      const upd = () => {
        const mb = q('.ix-m'); mb.innerHTML = '';
        [['local', 'Local index (har shard apna)'], ['global', 'Global index (alag sharded)']].forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (k === mode ? ' on' : ''); b.textContent = v; b.onclick = () => { mode = k; upd(); }; mb.appendChild(b); });
        const N = +q('.ix-n').value, K = +q('.ix-k').value;
        q('.ix-nv').textContent = N; q('.ix-kv').textContent = K;
        const r = sim(mode, N, K);
        let h = '<div style="font-size:12px;color:var(--ink-3);margin-bottom:4px">Data shards (neela = is read ne isko poochha, ● = isme match hai)</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(26px,1fr));gap:4px">';
        for (let i = 0; i < N; i++) {
          const asked = mode === 'local' || r.data.has(i), has = r.data.has(i);
          h += `<div style="height:26px;border-radius:5px;border:1px solid ${asked ? 'var(--accent)' : 'var(--line)'};background:${asked ? 'var(--accent-soft)' : 'var(--surface-2)'};display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--ink)">${has ? '●' : ''}</div>`;
        }
        h += '</div>';
        if (mode === 'global') h += '<div style="margin-top:8px;display:inline-block;padding:4px 10px;border-radius:6px;border:2px solid var(--violet);font-size:12px;color:var(--ink)">Index shard: "pending" → ' + K + ' order ids</div>';
        q('.ix-viz').innerHTML = h;
        q('.ix-r').textContent = r.reads + (mode === 'local' ? ' (sab shards)' : ' (1 index + ' + r.asked + ' data)');
        q('.ix-w').textContent = r.writes === 1 ? '1 shard' : '2 shards';
        q('.ix-f').textContent = mode === 'local' ? 'Haan' : 'Aksar thoda late';
        q('.ix-note').textContent = mode === 'local'
          ? `Har shard ka apna index hai, to naya order aur uski index entry ek hi machine pe, ek hi transaction mein. Lekin "pending orders" ka read ${N} shards ko poochhta hai, chahe match sirf ${r.data.size} shards mein ho. Shards ${N * 4} karo to har read ${N * 4} calls.`
          : `Pehle index shard se "pending" wale ${K} order ids mile, phir sirf un ${r.asked} data shards se orders laaye: total ${r.reads} calls, chahe ${N} shards hon. Keemat: har naye order pe 2 jagah likhna (data shard + index shard), aur index aksar async update hota hai, to ek pal ke liye naya order list mein na dikhe.`;
      };
      ['.ix-n', '.ix-k'].forEach(s => q(s).addEventListener('input', upd));
      upd();
    }},
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `"Index bana diya to query fast ho gayi" sharded duniya mein adhoora sach hai. Local index ke saath query har shard pe fast hai, lekin <strong>har</strong> shard ko poochhna padta hai. 4 shards pe chalta hai; 400 shards pe ye har query ko 400 calls bana deta hai. Frequent queries ke liye global index ya alag store (jaise search ke liye Elasticsearch) socho.` },

    { type: 'h2', text: 'Resharding / rebalancing' },
    { type: 'p', html: `4 shards bhi full ho gaye. Ab ek aur machine chahiye (maan lo 5). Data ko naye shards pe le jaana <strong>resharding</strong> (ya rebalancing) kehlata hai, aur ye site chalte chalte karna padta hai. Shard kaise chuna tha, usi se tay hota hai ki ye kitna dard dega.` },
    { type: 'list', items: [
      `<strong>Bura tareeka, <code>hash % N</code>:</strong> N = 4 se 5 karte hi har key ka <code>hash % 5</code> alag aata hai, to lagbhag 80% data ko move karna padta hai. Agla lesson (Consistent hashing) mein ye khud slider se dekhoge.`,
      `<strong>Fixed number of many partitions:</strong> shuru se hi bahut saare chhote <em>logical</em> shards bana do (jaise 1,024), aur unhe thodi si machines pe rakho (har machine pe 256). Key → logical shard ka formula <strong>kabhi nahi badalta</strong>. Nayi machine aayi to bas kuch poore logical shards uspe move karo. Instagram ne 2012 ki apni post mein yahi bataya tha: hazaaron logical shards, jo shuru mein kuch hi physical database servers pe map the. Citus bhi table ko fixed shards mein todta hai (default 32) jinhe workers ke beech move kiya ja sakta hai. Redis Cluster mein ye 16,384 "hash slots" hain.`,
      `<strong>Splitting:</strong> range ya hash-range shards bade/garam ho jaayein to unhe beech se do mein tod do. HBase/Bigtable regions aur DynamoDB partitions aise hi split hote hain. DynamoDB ke 2022 paper ke mutabik wo partition ko traffic dekh ke split karta hai, sirf beech se nahi.`,
    ]},
    { type: 'p', html: `Farak khud dekho: machines 4 se badhao, aur dekho kitna data move karna padta hai aur usme kitna time lagega:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Machines: 4 se <strong class="rs-mv"></strong></label><input class="rs-m" type="range" min="5" max="16" step="1" value="5"></div>
          <div><label>Kul data: <strong class="rs-dv"></strong></label><input class="rs-d" type="range" min="1" max="100" step="1" value="20"></div>
        </div>
        <div class="rs-bars" style="margin-top:14px"></div>
        <div class="calc-note rs-note"></div>`;
      const q = s => el.querySelector(s);
      const N = 4, P = 1024, SPEED = 1000; // MB/s total copy speed
      const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; return h >>> 0; };
      const KEYS = []; for (let i = 0; i < 20000; i++) KEYS.push(hash('order:' + i));
      function movedMod(M) { let m = 0; for (const h of KEYS) if (h % N !== h % M) m++; return m / KEYS.length; }
      function movedLogical(M) {
        const base = Math.floor(P / M), extra = P % M;
        const target = []; for (let i = 0; i < M; i++) target.push(base + (i < extra ? 1 : 0));
        let keep = 0; for (let i = 0; i < N; i++) keep += Math.min(P / N, target[i]);
        return (P - keep) / P;
      }
      const hrs = tb => tb * 1e6 / SPEED / 3600;
      const upd = () => {
        const M = +q('.rs-m').value, D = +q('.rs-d').value;
        q('.rs-mv').textContent = M; q('.rs-dv').textContent = D + ' TB';
        const a = movedMod(M), b = movedLogical(M), ideal = (M - N) / M;
        const row = (name, f, col) => `<div style="margin:8px 0"><div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px;font-size:14px"><strong>${name}</strong><span style="font:13px var(--f-mono)">${(f * 100).toFixed(1)}% = ${(f * D).toFixed(1)} TB, ~${hrs(f * D).toFixed(1)} ghante</span></div>
          <div style="height:12px;background:var(--surface-2);border:1px solid var(--line);border-radius:6px;overflow:hidden;margin-top:4px"><div style="height:100%;width:${(f * 100).toFixed(1)}%;background:${col}"></div></div></div>`;
        q('.rs-bars').innerHTML = row('hash % N', a, 'var(--red)') + row('1,024 logical shards', b, 'var(--green)') + `<div style="font-size:12px;color:var(--ink-3)">Kam se kam jitna hilana hi padega: (${M} − 4) ÷ ${M} = ${(ideal * 100).toFixed(1)}%. Copy speed maana 1 GB/s.</div>`;
        q('.rs-note').textContent = M % N === 0
          ? `${M}, 4 ka pura multiple hai, to hash % N bhi sirf ${(a * 100).toFixed(0)}% hilaata hai (minimum): har purana shard barabar hisson mein bat jaata hai. Isliye kuch teams hamesha double karti hain (4 → 8 → 16). Lekin har baar double karna mehenga, aur 5, 6, 7 jaise numbers pe hash % N bahut zyada hilaata hai.`
          : `hash % N mein ${(a * 100).toFixed(0)}% keys ka shard badal gaya, kyunki formula hi badal gaya. Logical shards mein formula (key → 1,024 mein se ek) kabhi nahi badalta; bas ${Math.round(b * P)} poore logical shards nayi machines pe gaye: ${(b * 100).toFixed(1)}%, yaani lagbhag minimum.`;
      };
      ['.rs-m', '.rs-d'].forEach(s => q(s).addEventListener('input', upd));
      upd();
    }},
    { type: 'p', html: `Data move karne ke steps, site band kiye bina:` },
    { type: 'steps', items: [
      { t: 'Copy', d: 'Jo data move karna hai uska snapshot naye shard pe copy karo. Purana shard abhi bhi saare reads/writes le raha hai.' },
      { t: 'Catch up', d: 'Copy ke dauraan jo naye writes aaye, unhe replication log (binlog/WAL) se naye shard pe chalate raho, jab tak wo bas milliseconds peeche na reh jaaye. Vitess ise VReplication se karta hai.' },
      { t: 'Verify', d: 'Dono taraf data compare karo (row counts, checksums).' },
      { t: 'Cutover', d: 'Ek pal ke liye us data ke writes roko, aakhri changes apply karo, router ka map badlo, writes naye shard pe kholo. Ye pause seconds ka hona chahiye.' },
      { t: 'Cleanup', d: 'Kuch din baad, sab theek dikhe to purane shard se wo data hatao.' },
    ]},

    { type: 'h2', text: 'Vitess aur Citus: sharding ready-made' },
    { type: 'p', html: `Khud sharding router, resharding aur failover likhna bahut kaam hai. Do popular open-source systems ye kaam SQL databases ke upar karte hain:` },
    { type: 'table', head: ['', 'Vitess', 'Citus'], rows: [
      ['Kis pe', 'MySQL', 'PostgreSQL (extension)'],
      ['Kahan se aaya', 'YouTube ne MySQL scale karne ke liye banaya; ab CNCF project', 'Citus Data ne banaya, ab Microsoft ka; Azure pe managed bhi'],
      ['Router', '<strong>VTGate</strong>: stateless proxy, app usse normal MySQL ki tarah baat karta hai', '<strong>Coordinator</strong> node query leta hai aur workers pe bhejta hai'],
      ['Har shard', 'MySQL + <strong>VTTablet</strong> (uske saamne ek sidecar jo connection pooling, health aur replication sambhalta hai)', '<strong>Worker</strong> nodes pe normal Postgres tables (shards)'],
      ['Shard key', '<strong>Vindex</strong>: column value → keyspace ID; shards keyspace ID ki ranges (<code>-80</code>, <code>80-</code>)', '<strong>Distribution column</strong>, hash karke shard'],
      ['Secondary lookups', 'Lookup vindex (global index jaisa)', 'Co-location + reference tables'],
      ['Resharding', 'VReplication se online, ranges split karke', 'Shards ko workers ke beech move/rebalance'],
      ['Real use', 'Slack (2020 tak ~99% MySQL traffic Vitess pe), YouTube, kai aur', 'Multi-tenant SaaS, real-time analytics'],
    ]},
    { type: 'p', html: `Dono ka core idea wahi hai jo humne flow mein dekha: ek router jo shard key se shard nikaale, shard key na ho to scatter-gather, aur har shard khud replicated. Topology ki jaankari (kaunsa shard kahan, leader kaun) Vitess ek alag <em>topology service</em> (jaise etcd/ZooKeeper) mein rakhta hai, aur Citus coordinator ki metadata tables mein.` },

    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Decide: shard key kaise chunein', html: `Shard key apni <strong>sabse common query</strong> se chuno.<br>• <strong>Chat messages:</strong> <code>conversation_id</code> se shard karo, taaki ek chat ki poori history ek hi shard pe ho.<br>• <strong>Orders:</strong> <code>user_id</code> se, "my orders" ke liye.<br>• <strong>Bacho</strong> un keys se jo traffic ek jagah jama karti hain: <strong>timestamp</strong> (saare naye writes ek shard pe) ya <strong>country</strong> (India apne shard ko pighla dega).` },
    { type: 'table', head: ['Sawaal', 'Achha jawab'], rows: [
      ['Writes ya data ek node se bada?', 'Haan to shard. Sirf reads/HA problem hai to pehle replicas'],
      ['Sabse common query kis cheez se filter karti hai?', 'Wahi shard key'],
      ['Kya us key ki values bahut saari aur traffic bikhra hua hai?', 'Haan = achhi key. Kuch hi values (country, status) ya badhti hui (time) = buri'],
      ['Related tables?', 'Same key se shard karo (co-location)'],
      ['Aage chal ke machines badhengi?', 'Shuru se bahut saare logical shards ya consistent hashing'],
    ]},

    { type: 'h2', text: 'Poori picture' },
    { type: 'diagram', title: 'Sharding: xyz.com ka poora setup', height: 620,
      groups: [
        { label: 'Users + app', x: 270, y: 4, w: 420, h: 210 },
        { label: 'Routing', x: 30, y: 234, w: 660, h: 104 },
        { label: 'Shards', x: 20, y: 384, w: 680, h: 222 },
      ],
      nodes: [
        { id: 'users', label: 'xyz.com users', sub: 'Riya, Aman...', x: 360, y: 60, kind: 'client', info: 'Ye kya hai: xyz.com ke log. Har user ka data us shard pe hai jo uske user_id se nikalta hai.' },
        { id: 'app', label: 'App servers', x: 360, y: 170, w: 160, kind: 'server', info: 'Ye kya hai: xyz.com ka code. Ye seedha shards ko nahi jaanta; har query router ko deta hai.' },
        { id: 'cache', label: 'Hot-key cache', sub: 'viral post', x: 600, y: 170, w: 150, kind: 'cache', info: 'Ye kya hai: RAM wala cache (jaise Redis). Celebrity/viral key ke reads yahin se, taaki uska shard garam na ho.' },
        { id: 'rt', label: 'Shard router', sub: 'VTGate / Citus', x: 360, y: 290, w: 170, kind: 'net', info: 'Ye kya hai: rasta batane wala. Shard key dekh ke shard chunta hai. Key na ho to saare shards se poochhta hai (scatter-gather) aur jawab jodta hai.' },
        { id: 'map', label: 'Shard map', sub: 'directory / etcd', x: 120, y: 290, w: 150, kind: 'data', info: 'Ye kya hai: naksha ki kaunsi key ya range kis shard pe hai (aur directory ke khaas entries, jaise MegaCorp → Shard 4). Router ise cache karta hai. Resharding pe yahi badalta hai.' },
        { id: 'gidx', label: 'Global index', sub: 'status → ids', x: 600, y: 290, w: 150, kind: 'data', info: 'Ye kya hai: shard key ke alawa kisi column (status, phone) se dhoondhne ka alag sharded index. Read ek jagah se, lekin har write 2 jagah aur index thoda late ho sakta hai.' },
        { id: 's1', label: 'Shard 1', sub: 'hash range A', x: 100, y: 430, w: 140, kind: 'data', info: 'Ye kya hai: data ka ek hissa. Andar se leader + replicas (pichhla lesson), apne writes khud leta hai.' },
        { id: 's2', label: 'Shard 2', sub: 'Riya ka data', x: 270, y: 430, w: 140, kind: 'data', info: 'Ye kya hai: doosra hissa. Riya ke saare orders, cart, addresses yahin (co-location), to "my orders" ek hi shard pe.' },
        { id: 's3', label: 'Shard 3', sub: 'bhar raha hai', x: 440, y: 430, w: 140, kind: 'data', info: 'Ye kya hai: teesra hissa, jo bada ho gaya hai. Iske kuch logical shards naye shard pe move ho rahe hain.' },
        { id: 's4', label: 'Shard 4', sub: 'MegaCorp (dir)', x: 610, y: 430, w: 140, kind: 'data', info: 'Ye kya hai: directory se ek bade customer ko diya gaya apna shard, taaki uska traffic baaki users ko slow na kare.' },
        { id: 'nw', label: 'New shard', sub: 'resharding', x: 440, y: 560, w: 140, kind: 'data', info: 'Ye kya hai: nayi machine. Copy → catch up → verify → cutover ke baad router ka map badalta hai aur traffic yahan aane lagta hai.' },
      ],
      edges: [
        { a: 'users', b: 'app', n: 1 },
        { a: 'app', b: 'rt', n: 2 },
        { a: 'rt', b: 's2', n: 3, label: 'hash(user_id)' },
        { a: 'rt', b: 's1', dashed: true },
        { a: 'rt', b: 's3', dashed: true },
        { a: 'rt', b: 's4', dashed: true },
        { a: 'rt', b: 'map', label: 'kahan?' },
        { a: 'rt', b: 'gidx', label: 'status' },
        { a: 'app', b: 'cache', label: 'hot key' },
        { a: 's3', b: 'nw', kind: 'evt', dashed: true, label: 'copy + catch up' },
      ],
      paths: [
        { name: 'My orders', text: 'Query mein user_id hai: router ne hash se Shard 2 chuna. Ek shard, fast.', go: ['users>app>rt>s2'] },
        { name: 'Admin report', text: 'Shard key nahi: router ne chaaron shards se poochha aur jawab jode (scatter-gather).', go: ['app>rt>s1', 'rt>s2', 'rt>s3', 'rt>s4'] },
        { name: 'Status se dhoondho', text: 'Global index se pending order ids mile, phir sirf unke shard se orders.', go: ['app>rt>gidx', 'rt>s3'] },
        { name: 'Viral post', text: 'Celebrity key ke reads cache se: shard tak pahunchte hi nahi.', go: ['users>app>cache'] },
        { name: 'Resharding', text: 'Shard 3 ka hissa naye shard pe copy ho raha hai; cutover pe shard map badlega.', go: ['s3>nw', 'rt>map'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Sharding = data ko hisson mein baant ke alag machines pe. Writes aur storage scale hote hain; replication sirf reads aur availability.</li>
      <li>Shard key sabse bada faisla: sabse common query se chuno (chat → conversation_id, orders → user_id).</li>
      <li>Range: range queries achhi, lekin badhti key (time, auto-increment) = saare naye writes ek shard pe. Hash: barabar spread, range queries scatter. Directory: poora control, extra lookup. Geo: paas aur laws ke liye, lekin desh barabar nahi.</li>
      <li>Hash keys baantta hai, traffic nahi: celebrity key ke liye splitting, cache, ya apna shard.</li>
      <li>Shard key ke bina query = scatter-gather, sabse slow shard jitni slow.</li>
      <li>Joins/transactions ek shard mein rakho: co-location, reference tables, denormalize.</li>
      <li>Local index: write aasaan, read sab shards pe. Global index: read ek jagah, write do jagah aur thoda late.</li>
      <li>Resharding: hash % N mat karo; shuru se bahut saare logical shards (ya consistent hashing), aur copy → catch up → verify → cutover.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Writes aur storage machines ke saath badhte hain', 'Har shard chhota: backups, index, naye replicas fast', 'Failure ka blast radius chhota (ek shard = kuch users)', 'Geo sharding se data users ke paas aur residency laws follow'], costs: ['Galat shard key = hot shards ya har query scatter-gather', 'Cross-shard joins, transactions aur unique constraints mushkil', 'Secondary indexes: ya scatter-gather ya do jagah writes', 'Resharding ek bada, risky operation', 'Operations ka bojh: N shards × (leader + replicas)'] },

    { type: 'think', questions: [
      { q: 'xyz.com pe ek "likes" table hai: (post_id, user_id, time). Sabse common query: "is post pe kitne likes" aur "kya maine is post ko like kiya". Shard key kya rakhoge? Viral post pe kya hoga?', a: 'post_id: dono queries ek shard pe. Lekin viral post ki saari likes ek shard pe (celebrity key). Fix: count ko alag counter mein rakho jo key splitting (post_99#0..#9) se likha jaaye aur cache se padha jaaye, ya likes ko queue mein batch karke count update karo. "Kya maine like kiya" ke liye (post_id, user_id) lookup same shard pe hi rehta hai.' },
      { q: 'Ek B2B app hai jahan 10,000 chhoti companies aur 3 bahut badi companies hain. Hash(company_id) sharding mein kya problem aayegi, aur kya karoge?', a: 'Teen badi companies jis shard pe jaayengi wo garam hoga, aur ek badi company akeli ek shard se badi bhi ho sakti hai. Directory-based sharding: badi companies ko dedicated shards, chhoti companies hash se baaki pe. Aur agar ek company bhi ek machine se badi ho, to uske andar ek aur key (jaise channel_id/project_id) se shard karo, jaisa Slack ne kiya.' },
      { q: 'Tumne 4 shards ke saath hash % 4 use kiya. 2 saal baad 6 chahiye. Ab kya options hain?', a: 'hash % 6 pe switch karna matlab lagbhag do-tihaai data move (lab mein ~66%, jabki minimum ~33% hai). Better: ek baar ke liye migrate karke fixed bahut saare logical shards (jaise 1,024) pe aa jao jinhe machines pe map karte ho, ya consistent hashing. Aage se sirf poore logical shards move honge. Migration copy → catch up → verify → cutover steps se, live.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'WhatsApp jaisi chat ke messages ke liye sabse achhi shard key?', options: ['created_at', 'conversation_id', 'country'], answer: 1, explain: 'Sabse common query "is chat ki history" hai. conversation_id se poori chat ek shard pe. created_at se saare naye writes ek shard pe, country se India ka shard pighlega.' },
      { q: 'Orders created_at (range) se sharded hain. Sabse badi problem?', options: ['Range queries slow', 'Aaj ke saare writes ek hi (latest) shard pe', 'Data barabar nahi bikhrta purane shards mein'], answer: 1, explain: 'Time badhta hi jaata hai, to har naya order latest range wale shard pe. Baaki shards writes mein bekaar.' },
      { q: 'Query mein shard key nahi hai. Router kya karega?', options: ['Error', 'Scatter-gather: saare shards pe bhejo, results jodo', 'Random ek shard'], answer: 1, explain: 'Router ko pata nahi data kahan hai, to sabse poochhna padta hai. Query sabse slow shard jitni slow.' },
      { q: 'Global secondary index ka nuksaan kya hai?', options: ['Query har shard pe jaati hai', 'Har write ko index ke shard pe bhi likhna padta hai, aur index aksar thoda purana hota hai', 'Index sirf ek shard pe ban sakta hai'], answer: 1, explain: 'Global index reads ko fast karta hai (ek index shard), keemat writes pe aur consistency pe. Local index ka ulta trade-off hai.' },
      { q: 'Directory-based sharding ka sabse bada faayda?', options: ['Koi lookup nahi lagta', 'Kisi bhi key (jaise ek bada customer) ko akele kisi bhi shard pe rakh ya move kar sakte ho', 'Range queries hamesha ek shard pe'], answer: 1, explain: 'Directory ek table hai: "key → shard". Formula nahi, to kisi bhi entry ko badal ke us key ko move kar sakte ho. Keemat: har query se pehle lookup, aur table khud highly available honi chahiye.' },
      { q: 'hash % N ke saath 4 se 5 machines kiye. Lagbhag kitna data move hoga?', options: ['~20%', '~50%', '~80%'], answer: 2, explain: 'Formula badalte hi har key ka hash % 5 naya. Lab mein 79.7% aaya. Logical shards ke saath sirf ~20% (minimum) move hota.' },
      { q: 'Replication aur sharding mein se write capacity kaun badhata hai?', options: ['Replication', 'Sharding', 'Dono barabar'], answer: 1, explain: 'Replicas sab writes copy karte hain. Shards writes ko baant lete hain. Asli systems mein dono saath: har shard ke replicas.' },
    ]},
    { type: 'sources', note: 'Product-specific facts aur real-world examples inhi sources se.', items: [
      { title: 'Vitess docs: Architecture aur Vindexes', publisher: 'Vitess (CNCF)', official: true, url: 'https://vitess.io/docs/reference/features/vindexes/', used: 'VTGate, VTTablet, topology service, vindex → keyspace ID, shard ranges (-80, 80-), lookup vindexes, scatter queries.' },
      { title: 'Citus docs: Concepts aur configuration (citus.shard_count)', publisher: 'Citus Data / Microsoft', official: true, url: 'https://docs.citusdata.com/en/stable/get_started/concepts.html', used: 'Coordinator + workers, distribution column, hash shards, default shard count 32, reference tables, co-location.' },
      { title: 'Scaling Datastores at Slack with Vitess', publisher: 'Slack Engineering (2020)', official: true, url: 'https://slack.engineering/scaling-datastores-at-slack-with-vitess/', used: 'Workspace-based sharding ke hot spots, channel-based sharding, ~99% MySQL traffic Vitess pe.' },
      { title: 'How Discord Stores Trillions of Messages', publisher: 'Discord blog (2023)', official: true, url: 'https://discord.com/blog/how-discord-stores-trillions-of-messages', used: 'channel_id + time bucket partitioning, hot partitions, request coalescing data services.' },
      { title: 'Sharding & IDs at Instagram', publisher: 'Instagram Engineering (2012)', official: true, url: 'https://instagram-engineering.com/sharding-ids-at-instagram-1cf5a71e5a5c', used: 'Hazaaron logical shards kam physical servers pe, logical shards ko move karke scale.' },
      { title: 'Designing Data-Intensive Applications, chapter 6 (Partitioning)', publisher: "Martin Kleppmann, O'Reilly (2017)", url: 'https://dataintensive.net/', used: 'Key-range vs hash partitioning, skew aur hot spots, local (document-partitioned) vs global (term-partitioned) secondary indexes, fixed number of partitions se rebalancing, hash mod N ki problem.' },
      { title: 'Amazon DynamoDB (USENIX ATC 2022)', publisher: 'USENIX / Amazon', official: true, url: 'https://www.usenix.org/system/files/atc22-elhemali.pdf', used: 'Partition key hash, key-range partitions, traffic-based partition splitting.' },
    ]},
  ],
});
