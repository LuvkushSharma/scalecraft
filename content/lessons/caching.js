Lesson.register({
  id: 'caching',
  title: 'Cache: hit, miss aur Redis',
  minutes: 22,
  summary: `Database har request pe thak raha hai. Cache ek fast "yaad-daasht" hai jo baar baar maangi jaane wali cheezon ko RAM mein rakhta hai, taaki database se baar baar na poochhna pade.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Socho tumse koi poochhe "13 × 17 kitna hota hai?" Pehli baar tum kaagaz pe hisaab lagaoge. Agar 1000 log yahi sawaal poochhein, to har baar hisaab nahi lagaoge. Ek baar answer (221) yaad kar loge aur turant bol doge.<br>Website ke saath bhi yahi hota hai. Lakhon log <em>same</em> cheez maangte hain. Har baar database se dobara nikaalna slow aur mehenga hai.<br><strong>Cache</strong> = answers ki ek chhoti, bahut tez "yaad-daasht". Is lesson mein dekhenge ye kaise kaam karta hai, kab galat answer de sakta hai, aur kab ise lagana hi nahi chahiye.` },

    { type: 'h2', text: 'Problem: database bottleneck' },
    { type: 'p', html: `Load Balancer lesson ke end mein dekha: servers 10 ho gaye, lekin database ek hi hai. Saare 10 servers usi ek database se data maangte hain.` },
    { type: 'p', html: `xyz.com ke homepage pe "trending posts" dikhte hain. 1 lakh users homepage kholte hain, matlab database se <em>wahi same sawaal</em> 1 lakh baar. Answer har baar same hai, phir bhi database har baar poora kaam karta hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: bottleneck', html: `<strong>Ye kya hai:</strong> system ka wo ek hissa jo sabse pehle bhar jaata hai aur baaki sabko dheema kar deta hai. Jaise bottle ka patla muh: bottle kitni bhi badi ho, paani utna hi niklega jitna muh se nikal sakta hai.<br><strong>Yahan:</strong> servers 10 ho gaye, lekin database ek hai. Wahi patla muh hai.<br><strong>Iske bina samjhe:</strong> log servers badhaate rehte hain aur site phir bhi slow rehti hai, kyunki asli rukawat kahin aur hai.` },

    { type: 'h2', text: 'Disk slow, RAM fast' },
    { type: 'p', html: `Computer data do jagah rakh sakta hai. Ek <strong>disk</strong> (SSD ya hard disk) pe, ek <strong>RAM</strong> mein. Dono ka farak samajhna zaroori hai, kyunki cache ka poora idea isi farak pe khada hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: RAM aur disk', html: `<strong>Ye kya hai:</strong> <strong>RAM</strong> computer ki "kaam karne wali" memory hai: bahut tez, lekin chhoti, mehngi, aur bijli jaate hi khaali. <strong>Disk</strong> (SSD) badi aur sasti hai, aur bijli jaane pe bhi data bachata hai, lekin RAM se kaafi dheemi.<br><strong>Kyun chahiye:</strong> database apna asli data disk pe rakhta hai taaki wo kabhi kho na jaaye. Hum hot data ki ek copy RAM mein rakhenge taaki wo tez mile.<br><strong>Iske bina:</strong> har request disk tak jaati, aur upar se database ka saara kaam (dhoondhna, sort, join) har baar.<br><strong>Example:</strong> RAM se ek chhoti value padhna ~100 nanoseconds. SSD se ek random read ~100-150 microseconds, yaani ~1000 guna zyada.` },
    { type: 'image', src: 'assets/img/caching/ram-ddr4.jpg', alt: 'Ek RAM stick (DDR4 memory module): laal heat-spreader wala ek lamba patla circuit board, neeche sone jaise pins', caption: 'Ye RAM ki ek stick hai (DDR4). Server mein aisi kai sticks lagti hain. Redis jaisa cache apna saara data isi tarah ki memory mein rakhta hai, isliye wo itna tez hai, aur isi wajah se uski jagah limited aur mehngi hai.', credit: { text: 'ElooKoN, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:RAM_Module_(SDRAM-DDR4).jpg', license: 'CC BY-SA 4.0' } },
    { type: 'p', html: `Ek database query mein disk ke saath saath network aur database ka apna kaam bhi judta hai. Isliye ek normal query ~5-10 ms leti hai. Wahi answer agar RAM mein pehle se rakha ho to ~0.5-1 ms mein mil jaata hai (zyada tar time network ka). Toh kyun na answer ek baar nikaal ke RAM mein rakh lein?` },
    { type: 'callout', tone: 'term', title: 'Naya word: Cache', html: `<strong>Ye kya hai:</strong> ek temporary, tez storage jahan baar baar maangi jaane wali cheezon ki <em>copy</em> rakhte hain.<br><strong>Kyun chahiye:</strong> taaki same sawaal ka answer database ki jagah RAM se mil jaaye: user ko jaldi, database ko aaraam.<br><strong>Iske bina:</strong> har request database tak jaati hai. Traffic badha to database pehle bharta hai aur poori site slow ho jaati hai.<br><strong>Example:</strong> xyz.com ki trending list 1 lakh baar maangi gayi. Cache ke saath database se sirf 1 baar nikaali, baaki 99,999 baar RAM se.` },
    { type: 'callout', tone: 'term', title: 'Naya word: source of truth', html: `<strong>Ye kya hai:</strong> wo jagah jahan data ka <em>asli, sahi</em> version rehta hai. Hamare case mein database.<br><strong>Kyun chahiye:</strong> cache sirf copy hai. Copy aur asli mein jhagda ho to asli jeet-ta hai.<br><strong>Iske bina:</strong> pata hi nahi chalega kaunsi value sahi hai.` },
    { type: 'compare',
      left: { title: 'Without cache', ascii: `
User
 ↓
Server
 ↓
Database   (har baar ~10 ms)
 ↓
Response` },
      right: { title: 'With cache', ascii: `
User
 ↓
Server
 ↓
Cache ─── HIT (~1 ms) ──> Response
 ↓
MISS
 ↓
Database
 ↓
Cache mein save
 ↓
Response` },
    },

    { type: 'h2', text: 'Cache ke andar kya hota hai: key, value, TTL' },
    { type: 'p', html: `Cache ek bahut simple cheez hai: ek badi si <strong>table</strong> jisme har line mein ek naam (key) aur uska data (value) hota hai. Teen words samajh lo, baaki sab inhi se banta hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: key-value', html: `<strong>Ye kya hai:</strong> data rakhne ka sabse simple tareeka. <strong>Key</strong> = ek unique naam, jaise <code>user:42</code>. <strong>Value</strong> = us naam ke saath rakha data, jaise <code>{"name":"Riya"}</code>. Phone ki contact list jaisa: naam se number milta hai.<br><strong>Kyun chahiye:</strong> key pata ho to value turant milti hai. Koi search ya join nahi.<br><strong>Iske bina:</strong> cache ko bhi database jaisa "dhoondhna" padta, aur speed chali jaati.` },
    { type: 'callout', tone: 'term', title: 'Naya word: TTL (Time To Live)', html: `<strong>Ye kya hai:</strong> har key pe lagaya gaya ek timer. TTL 300 second = 5 minute baad key apne aap delete ho jaayegi.<br><strong>Kyun chahiye:</strong> cache ki copy dheere dheere purani ho jaati hai. TTL ensure karta hai ki koi copy hamesha ke liye purani na rahe. Aur RAM bhi khaali hoti rehti hai.<br><strong>Iske bina:</strong> agar kisi ne copy update karna bhool gaye, to purana data hamesha dikhta rahega.<br><strong>Example:</strong> trending list ka TTL 60 s: list zyada se zyada 1 minute purani dikhegi.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Redis', html: `<strong>Ye kya hai:</strong> ek alag server (program) jo key-value data <strong>RAM mein</strong> rakhta hai. Cache ke liye sabse popular choice.<br><strong>Kyun chahiye:</strong> xyz.com ke 10 app servers hain. Sab ek hi Redis se baat karte hain, to ek server ne jo cache kiya wo baaki 9 ko bhi mil jaata hai.<br><strong>Iske bina:</strong> har server apni alag chhoti copy rakhta, aur 10 jagah alag alag purana data hota.<br><strong>Example:</strong> RAM mein hone ki wajah se ek Redis server simple GET/SET ke lakhon operations per second tak kar leta hai (machine aur setup pe depend karta hai).` },
    { type: 'p', html: `Redis se baat chhote commands mein hoti hai. Sabse kaam ke paanch:` },
    { type: 'table', head: ['Command', 'Kya karta hai', 'Example jawab'], rows: [
      ['<code>SET user:42 Riya EX 300</code>', 'Key mein value rakho, 300 s ke TTL ke saath', '<code>OK</code>'],
      ['<code>GET user:42</code>', 'Key ki value do', '<code>"Riya"</code>, ya key na ho to <code>(nil)</code>'],
      ['<code>DEL user:42</code>', 'Key hata do', '<code>(integer) 1</code> (kitni keys hatin)'],
      ['<code>TTL user:42</code>', 'Kitne second bache?', '<code>287</code>; <code>-1</code> = koi timer nahi; <code>-2</code> = key hai hi nahi'],
      ['<code>INCR views:7</code>', 'Number ko 1 badhao (atomic: do log ek saath badhaayein to bhi ginti sahi)', '<code>(integer) 1</code>, phir 2, 3...'],
    ]},
    { type: 'p', html: `Khud chala ke dekho. Neeche ek chhota sa nakli Redis hai. Buttons se commands chalao, ya khud type karo. "Ghadi +60 s" se time aage badhao aur dekho TTL wali keys kaise gayab hoti hain:` },
    { type: 'custom', render(el) {
      const PRE = ['SET user:42 Riya EX 120', 'GET user:42', 'TTL user:42', 'GET user:7', 'INCR views:7', 'SET config dark-mode', 'TTL config', 'DEL user:42'];
      el.innerHTML = `<div class="crd-pre" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;align-items:center">
          <input class="crd-in" type="text" aria-label="Redis command" value="GET user:42" style="flex:1 1 200px;min-width:0;font-family:var(--f-mono)">
          <button type="button" class="btn small primary crd-run">Chalao</button>
          <button type="button" class="btn small crd-t">Ghadi +60 s</button>
          <button type="button" class="btn small ghost crd-reset">Reset</button>
        </div>
        <div class="stats"><div class="stat"><span>Ghadi</span><strong class="crd-clock"></strong></div><div class="stat"><span>Keys</span><strong class="crd-n"></strong></div></div>
        <div class="crd-keys" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"></div>
        <pre class="ascii crd-log" style="min-height:7em;margin-top:10px;white-space:pre-wrap"></pre>
        <div class="calc-note">Commands: SET key value [EX second], GET key, DEL key, TTL key, EXPIRE key second, INCR key. Ye asli Redis nahi, bas uska chhota sa model hai.</div>`;
      const q = s => el.querySelector(s);
      let db, now, log;
      const alive = k => db[k] && (db[k].exp === null || db[k].exp > now);
      const sweep = () => Object.keys(db).forEach(k => { if (!alive(k)) delete db[k]; });
      const run = line => {
        const a = line.trim().split(/\s+/); const c = (a[0] || '').toUpperCase(); const k = a[1]; let r;
        sweep();
        if (c === 'SET' && k && a[2] !== undefined) {
          let exp = null;
          if (a[3] && a[3].toUpperCase() === 'EX') { const n = parseInt(a[4], 10); if (!(n > 0)) r = '(error) ERR invalid expire time'; else exp = now + n; }
          if (!r) { db[k] = { v: a[2], exp }; r = 'OK'; }
        } else if (c === 'GET' && k) r = alive(k) ? '"' + db[k].v + '"' : '(nil)';
        else if (c === 'DEL' && k) { r = '(integer) ' + (alive(k) ? 1 : 0); delete db[k]; }
        else if (c === 'TTL' && k) r = '(integer) ' + (!alive(k) ? -2 : db[k].exp === null ? -1 : db[k].exp - now);
        else if (c === 'EXPIRE' && k && a[2]) { if (alive(k)) { db[k].exp = now + parseInt(a[2], 10); r = '(integer) 1'; } else r = '(integer) 0'; }
        else if (c === 'INCR' && k) {
          if (!alive(k)) { db[k] = { v: '1', exp: null }; r = '(integer) 1'; }
          else if (!/^-?\d+$/.test(db[k].v)) r = '(error) ERR value is not an integer or out of range';
          else { db[k].v = String(Number(db[k].v) + 1); r = '(integer) ' + db[k].v; }
        } else r = '(error) Ye command is model mein nahi hai';
        sweep();
        log.push('> ' + line.trim() + '\n' + r);
        draw();
      };
      const draw = () => {
        q('.crd-clock').textContent = now + ' s';
        const ks = Object.keys(db);
        q('.crd-n').textContent = ks.length;
        q('.crd-keys').innerHTML = ks.length ? ks.map(k => `<div style="padding:6px 10px;border-radius:var(--r-sm);border:1px solid var(--cache-s);background:var(--cache-f);color:var(--cache-t);font:13px var(--f-mono)"><strong>${k}</strong> = ${db[k].v}<br><span style="color:var(--ink-3)">${db[k].exp === null ? 'TTL: koi timer nahi' : 'TTL: ' + (db[k].exp - now) + ' s bache'}</span></div>`).join('') : '<span style="color:var(--ink-3);font-size:14px">Cache khaali hai.</span>';
        q('.crd-log').textContent = log.slice(-6).join('\n') || 'Upar koi button dabao.';
      };
      const reset = () => { db = {}; now = 0; log = []; draw(); };
      PRE.forEach(p => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = p; b.onclick = () => { q('.crd-in').value = p; run(p); }; q('.crd-pre').appendChild(b); });
      q('.crd-run').onclick = () => run(q('.crd-in').value);
      q('.crd-in').addEventListener('keydown', e => { if (e.key === 'Enter') run(q('.crd-in').value); });
      q('.crd-t').onclick = () => { now += 60; const before = Object.keys(db).length; sweep(); const gone = before - Object.keys(db).length; log.push('(ghadi ' + now + ' s' + (gone ? ': ' + gone + ' key expire ho gayi' : '') + ')'); draw(); };
      q('.crd-reset').onclick = reset;
      reset();
    }},
    { type: 'p', html: `Try karo: <code>SET user:42 Riya EX 120</code>, phir "Ghadi +60 s" do baar. <code>TTL</code> pehle 120, phir 60 dikhayega, aur 120 s pe key gayab: <code>GET</code> ab <code>(nil)</code> deta hai. <code>config</code> pe TTL nahi lagaya, to wo kabhi expire nahi hogi (<code>TTL</code> = -1). Asli Redis expired keys ko do tareeke se hataata hai: koi key padhne aaye tab check karke (lazy), aur background mein random keys check karke (active).` },
    { type: 'h2', text: 'Cache hit aur cache miss, chala ke dekho' },
    { type: 'callout', tone: 'term', title: 'Naye words: cache hit aur cache miss', html: `<strong>Cache hit:</strong> jo maanga wo cache mein mil gaya. Tez raasta (~1 ms).<br><strong>Cache miss:</strong> cache mein nahi mila. Ab database tak jaana padega (slow raasta, ~10 ms), aur answer ko agli baar ke liye cache mein rakh denge.<br>Pehli baar har cheez miss hoti hai. Cache ka faayda tab hai jab wahi cheez baar baar maangi jaaye.` },
    { type: 'callout', tone: 'term', title: 'Naya word: cache-aside', html: `<strong>Ye kya hai:</strong> cache use karne ka sabse common tareeka. App server khud teen kaam karta hai: (1) pehle cache mein dekho, (2) nahi mila to database se lao, (3) laake cache mein TTL ke saath rakh do.<br><strong>Kyun chahiye:</strong> simple hai, aur cache mein sirf wahi aata hai jo sach mein maanga gaya.<br><strong>Iske bina:</strong> ya to sab kuch pehle se cache mein bharna padta (RAM ki barbaadi), ya cache kabhi bharta hi nahi.<br>Naam "aside" isliye: cache side mein baitha hai, app use bharta hai. Agle lesson mein iske bhai-bandhu (write-through, write-back...) dekhenge.` },
    { type: 'p', html: `Har scenario chalao. Kisi bhi box pe click karo, wo kya hai ye dikhega. Teesra aur chautha scenario dikhate hain ki cache kab <em>galti</em> karta hai aur kab <em>gir</em> jaata hai.` },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'u', label: 'User', sub: 'profile khola', x: 80, y: 170, w: 130, kind: 'client', info: 'Ye kya hai: xyz.com ka user, apne browser ya app se. Wo xyz.com/profile/42 khol raha hai. Use pata nahi ki answer cache se aaya ya database se; use bas speed mehsoos hoti hai.' },
        { id: 'app', label: 'App server', x: 280, y: 170, w: 140, kind: 'server', info: 'Ye kya hai: xyz.com ka code chalane wala server. Yahan cache-aside ka logic hai: pehle Redis mein dekho; mila to wahi do; nahi mila to database se lao, Redis mein TTL ke saath rakho, phir do.' },
        { id: 'cache', label: 'Redis cache', sub: 'RAM, ~1 ms', x: 520, y: 75, w: 160, kind: 'cache', info: 'Ye kya hai: RAM mein key-value rakhne wala alag server. Tez lekin chhota aur temporary. Har key pe TTL (expiry timer) laga hai. Ye database ki jagah nahi leta, sirf uska bojh kam karta hai.' },
        { id: 'db', label: 'Database', sub: 'disk, ~10 ms', x: 520, y: 265, w: 160, kind: 'data', meter: true, load: 40, info: 'Ye kya hai: source of truth, asli aur permanent data yahan disk pe hai. Cache ka poora kaam isi ko bachaana hai. Meter dikhata hai ki ye kitna busy hai.' },
      ],
      edges: [{ a: 'u', b: 'app' }, { a: 'app', b: 'cache' }, { a: 'app', b: 'db' }],
      scenarios: [
        { name: 'Pehli baar (miss)', steps: [
          { title: 'Request aayi', text: 'User ne profile 42 kholi.', go: 'u>app', msg: 'GET /profile/42' },
          { title: 'Cache check: MISS', text: 'Server Redis se poochhta hai "user:42 hai?" Pehli baar hai, to nahi. Ye <strong>cache miss</strong> hai.', go: ['app>cache', 'bad:cache>app'], after: { cache: { state: 'miss', sub: 'MISS' } }, msg: 'GET user:42  →  (nil)' },
          { title: 'Database se lao', text: 'Ab slow raasta: database query.', go: ['app>db', 'res:db>app'], msg: 'SELECT * FROM users WHERE id = 42   (~10 ms)' },
          { title: 'Cache mein save karo', text: 'Agli baar ke liye result Redis mein rakh do, 5 minute ke TTL ke saath.', go: 'app>cache', after: { cache: { state: '', sub: 'user:42 saved' } }, msg: 'SET user:42 {...} EX 300' },
          { title: 'Response', text: 'User ko data mila. Is baar total ~12 ms (cache check + database + save).', go: 'res:app>u' },
        ]},
        { name: 'Doosri baar (hit)', steps: [
          { title: 'Request aayi', text: 'Kisi ne phir profile 42 kholi.', go: 'u>app', msg: 'GET /profile/42' },
          { title: 'Cache check: HIT', text: 'Redis ke paas hai! Ye <strong>cache hit</strong> hai. Database ko pata bhi nahi chala.', go: ['app>cache', 'res:cache>app'], set: { db: { state: 'dim' } }, after: { cache: { state: 'hit', sub: 'HIT' } }, msg: 'GET user:42  →  {"name":"Riya"}   (~1 ms)' },
          { title: 'Response, 10 guna fast', text: 'Agar 90% requests aise hit hon, to database ka load 10 guna kam.', go: 'res:app>u' },
        ]},
        { name: 'Stale data', intro: 'Riya ne apna naam "Riya S" kar diya. Dekho kya gadbad ho sakti hai.', steps: [
          { title: 'Update database mein gaya', text: 'Naya naam database mein likh diya.', go: ['u>app>db', 'res:db>app'], after: { db: { sub: 'name = Riya S' } }, msg: 'UPDATE users SET name = "Riya S" WHERE id = 42' },
          { title: 'Lekin cache mein purana naam', text: 'Redis ko kisi ne nahi bataya. Usme abhi bhi "Riya" hai, aur TTL khatam hone tak (5 minute) rahega.', focus: ['cache'], set: { cache: { state: 'warn', sub: 'Riya (purana!)' } } },
          { title: 'Doosre users ko purana naam dikhta hai', text: 'Ise <strong>stale data</strong> kehte hain: cache aur database mein alag value.', go: ['u>app>cache', 'res:cache>app>u'] },
          { title: 'Fix: update ke saath cache key delete karo', text: 'Database update karte hi cache se <code>user:42</code> hata do. Agli request pe miss hoga, database se naya naam aayega, cache refresh. Ye <strong>cache invalidation</strong> hai.', go: 'app>cache', after: { cache: { state: '', sub: 'user:42 deleted' } }, msg: 'DEL user:42' },
        ]},
        { name: 'Redis down', steps: [
          { title: 'Redis crash', text: 'Cache server gir gaya.', set: { cache: { state: 'down', sub: 'DOWN' } }, go: 'lost:app>cache' },
          { title: 'Saara traffic database pe', text: 'Achhe design mein server cache fail hone pe seedha database pe chala jaata hai, to site chalu rehti hai. Lekin jo 90% load cache utha raha tha, wo achanak database pe.', flood: { paths: ['u>app>db'], n: 14 }, after: { db: { load: 98, state: 'hot', sub: 'overloaded!' } } },
          { title: 'Lesson', text: 'Cache ne database ko itna bachaaya ki database ab cache ke bina survive nahi kar sakta. Isliye Redis ki bhi ek copy (replica) rakhte hain jo turant jagah le sake, aur database ki capacity itni rakhte hain ki thodi der jhel sake.', focus: ['db'] },
        ]},
      ],
    },
    { type: 'callout', tone: 'term', title: 'Naye words: stale data aur cache invalidation', html: `<strong>Stale data:</strong> cache mein padi purani copy, jabki database mein value badal chuki hai. User ko galat (purana) data dikhta hai.<br><strong>Cache invalidation:</strong> asli data badalne pe cache ki copy ko hata dena (ya badal dena), taaki agli baar taaza data aaye.<br><strong>Kyun zaroori:</strong> bina iske cache tez to hai, lekin jhooth bolta hai.<br>Ise system design ki sabse tricky cheezon mein gina jaata hai. Agle lesson mein iske paanch tareeke aur ek chhupi race condition dekhenge.` },
    { type: 'callout', tone: 'term', title: 'Naya word: replica', html: `<strong>Ye kya hai:</strong> kisi server ki ek live copy jo har badlaav saath saath leti rehti hai.<br><strong>Kyun chahiye:</strong> asli (primary) Redis gire to replica turant uski jagah le leta hai. Redis mein ye kaam <strong>Sentinel</strong> naam ka helper apne aap karta hai (failover).<br><strong>Iske bina:</strong> Redis gira to cache poora khaali, aur saara traffic database pe (upar wala "Redis down" scenario).` },
    { type: 'h2', text: 'Hit rate ka jaadu' },
    { type: 'callout', tone: 'term', title: 'Naya word: hit rate', html: `<strong>Ye kya hai:</strong> 100 requests mein se kitni cache se answer huin. 90 hits = 90% hit rate.<br><strong>Kyun zaroori:</strong> yahi ek number batata hai ki cache kitna kaam ka hai. Database pe load = total requests × (1 − hit rate).<br><strong>Iske bina:</strong> pata hi nahi chalega ki cache sach mein madad kar raha hai ya bas ek aur server ka kharcha hai.` },
    { type: 'p', html: `<strong>Chhota sa hisaab:</strong> xyz.com pe 10,000 requests per second. Hit ~1 ms, miss ~11 ms (cache check 1 ms + database 10 ms).` },
    { type: 'table', head: ['Hit rate', 'Database pe queries/sec', 'Average time'], rows: [
      ['0% (cache bekaar)', '10,000', '11 ms'],
      ['90%', '10,000 × 0.10 = 1,000', '0.9 × 1 + 0.1 × 11 = 2 ms'],
      ['99%', '10,000 × 0.01 = 100', '0.99 × 1 + 0.01 × 11 = 1.1 ms'],
    ]},
    { type: 'p', html: `90% se 99% sirf "9 aur" lagta hai, lekin database ka load <strong>10 guna</strong> aur gir jaata hai (1,000 se 100). Slider ghuma ke khud dekho:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="ca-qps">Requests per second</label><input id="ca-qps" class="ca-qps" type="number" value="10000" min="1" step="1"></div>
          <div><label for="ca-hr">Cache hit rate: <strong class="ca-hrv">90%</strong></label><input id="ca-hr" class="ca-hr" type="range" min="0" max="99" step="1" value="90"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Database queries/sec</span><strong class="ca-dbq"></strong></div>
          <div class="stat"><span>Average latency</span><strong class="ca-lat"></strong></div>
          <div class="stat"><span>DB load vs no cache</span><strong class="ca-red"></strong></div>
        </div>
        <div class="calc-note">Maan ke chale: cache hit ~1 ms, database ~10 ms (miss pe dono lagte hain: ~11 ms). Ek normal SQL database server ~5,000-10,000 simple queries/sec aaraam se karta hai.</div>`;
      const q = el.querySelector('.ca-qps'), r = el.querySelector('.ca-hr');
      const upd = () => {
        const qps = Math.max(0, Number(q.value) || 0), hr = Number(r.value) / 100;
        el.querySelector('.ca-hrv').textContent = Math.round(hr * 100) + '%';
        el.querySelector('.ca-dbq').textContent = Math.round(qps * (1 - hr)).toLocaleString('en-IN');
        el.querySelector('.ca-lat').textContent = (hr * 1 + (1 - hr) * 11).toFixed(1) + ' ms';
        el.querySelector('.ca-red').textContent = Math.round((1 - hr) * 100) + '%';
      };
      q.addEventListener('input', upd); r.addEventListener('input', upd); upd();
    }},

    { type: 'h2', text: 'Cache kahan kahan hota hai?' },
    { type: 'p', html: `Redis akela cache nahi hai. Request user se database tak jaate hue kai jagah se guzarti hai, aur har jagah ek cache ho sakta hai. Jitna user ke paas, utna tez.` },
    { type: 'table', head: ['Jagah', 'Kya cache hota hai', 'Example'], rows: [
      ['Browser', 'Images, CSS, JS', 'xyz.com ka logo dobara download nahi hota'],
      ['CDN (duniya bhar mein faile cache servers, do lesson baad)', 'Jo sabke liye same hai', 'Videos, images, live score JSON'],
      ['App server ki apni memory', 'Chhota, bahut hot data', 'Config, feature flags'],
      ['Distributed cache (Redis)', 'Shared data, saare servers ke liye ek', 'User profiles, sessions, trending list'],
    ]},

    { type: 'h2', text: 'Kab cache lagayein, kab nahi' },
    { type: 'compare',
      left: { title: 'Cache mat lagao', html: `• Bank balance jo abhi debit karna hai (purana balance = galat paisa)<br>• Seat availability checkout ke time<br>• Data jo har baar alag key se maanga jaata hai (hit rate kam)<br>• Chhota traffic jahan database aaraam se sambhal raha hai` },
      right: { title: 'Cache lagao', html: `• Reads, writes se bahut zyada (10:1 ya zyada)<br>• Thoda purana data chalega (kuch seconds)<br>• Same items baar baar maange jaate hain<br>• Examples: profiles, product pages, trending posts, feeds` },
    },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `Cache tab lagao jab <strong>teeno</strong> sach hon: (1) reads, writes se kaafi zyada (10:1 ya zyada), (2) data kuch second purana chal sakta hai, (3) same cheezein baar baar maangi jaati hain. Shuru karo <strong>cache-aside + TTL</strong> se, aur update pe key delete karo. Paise ya seats jaisi cheez jo "abhi ke abhi sahi" honi chahiye, wo hamesha database se padho.` },
    { type: 'callout', tone: 'mistake', html: `Cache database ka <strong>replacement nahi</strong> hai. Cache mein data temporary hai: TTL khatam, memory full, ya restart, aur data gayab. Asli data hamesha database mein rakho. Aur ek doosri galti: cache ko "fail" hone pe site ko bhi fail kar dena. Redis na mile to code ko database pe chale jaana chahiye (ek chhote timeout ke baad), error nahi dena chahiye.` },
    { type: 'diagram', title: 'Cache: poori picture', height: 600,
      groups: [
        { label: 'Users', x: 20, y: 14, w: 680, h: 92 },
        { label: 'Servers', x: 20, y: 124, w: 680, h: 214 },
        { label: 'Data', x: 20, y: 356, w: 680, h: 230 },
      ],
      nodes: [
        { id: 'users', label: 'Users', sub: 'browser cache', x: 360, y: 60, w: 170, kind: 'client', info: 'Ye kya hai: xyz.com kholne wale log. Unka browser bhi ek chhota cache hai: logo, CSS, JS dobara download nahi hote.' },
        { id: 'lb', label: 'Load Balancer', x: 360, y: 170, w: 160, kind: 'net', info: 'Ye kya hai: requests ko 10 app servers mein baantne wala (pichhla lesson). Isi wajah se cache har server ki apni memory mein nahi, ek shared Redis mein rakhte hain.' },
        { id: 'app', label: 'App servers', sub: 'cache-aside code', x: 360, y: 280, w: 180, kind: 'server', info: 'Ye kya hai: xyz.com ka code. Har read pe pehle Redis, miss pe database, phir Redis mein SET with TTL. Har write pe pehle database update, phir Redis key DEL.' },
        { id: 'redis', label: 'Redis', sub: 'RAM, ~1 ms', x: 170, y: 420, w: 170, kind: 'cache', info: 'Ye kya hai: shared, RAM wala key-value cache. 90%+ reads yahin khatam ho jaate hain, to database ko aaraam. Har key pe TTL.' },
        { id: 'rep', label: 'Redis replica', sub: 'Sentinel failover', x: 170, y: 535, w: 170, kind: 'cache', info: 'Ye kya hai: Redis ki live copy. Primary gire to Sentinel ise naya primary bana deta hai, taaki cache khaali na ho aur database pe achanak poora load na aaye.' },
        { id: 'db', label: 'Database', sub: 'source of truth', x: 550, y: 420, w: 170, kind: 'data', info: 'Ye kya hai: asli, permanent data, disk pe. Sirf misses aur writes yahan aate hain. Cache gira to ise thodi der poora load jhelna padta hai.' },
      ],
      edges: [
        { a: 'users', b: 'lb', n: 1 },
        { a: 'lb', b: 'app', n: 2 },
        { a: 'app', b: 'redis', n: 3, both: true, label: 'GET / SET' },
        { a: 'app', b: 'db', n: 4, label: 'miss / write' },
        { a: 'redis', b: 'rep', dashed: true, label: 'copy' },
        { a: 'app', b: 'users', kind: 'res', label: 'response', via: [[640, 280], [640, 60]] },
      ],
      paths: [
        { name: 'Cache hit', text: 'Request Redis tak gayi, value mil gayi (~1 ms). Database ko pata bhi nahi chala.', go: ['users>lb>app>redis', 'app>users'] },
        { name: 'Cache miss', text: 'Redis mein nahi mila: database se laaye (~10 ms), Redis mein TTL ke saath rakha, phir jawab diya.', go: ['users>lb>app>redis', 'app>db', 'app>redis', 'app>users'] },
        { name: 'Write', text: 'Naya data pehle database mein, phir Redis se purani key DELETE. Agli read miss hogi aur taaza data laayegi.', go: ['users>lb>app>db', 'app>redis'] },
        { name: 'Redis gira', text: 'Replica naya primary ban jaata hai. Tab tak app seedha database se padhta hai (site chalti rehti hai, bas slow).', go: ['redis>rep', 'app>db'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Cache = baar baar maangi jaane wali cheezon ki RAM mein copy. Database (source of truth) mein asli data rehta hai.</li>
      <li>RAM disk se kaafi tez hai, lekin chhoti, mehngi aur temporary. Isliye sirf hot data cache karo.</li>
      <li>Cache hit = tez raasta. Cache miss = database se lao aur cache mein rakh do (cache-aside).</li>
      <li>Har key pe TTL lagao: purani copy hamesha ke liye nahi rahegi.</li>
      <li>Database update karo, phir cache key delete karo (invalidation), warna stale data dikhega.</li>
      <li>Hit rate sabse zaroori number hai: DB load = requests × (1 − hit rate).</li>
      <li>Redis gire to bhi site chale: database pe fallback, aur Redis ka replica.</li>
      <li>Default: cache-aside + TTL. Paise aur seats jaisi "abhi sahi" values database se hi padho.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Reads 10x+ fast', 'Database ka load bahut kam', 'Sasta: RAM ka thoda kharcha database ko bada karne se sasta'], costs: ['Stale data ka risk (invalidation mushkil)', 'Ek aur component jo gir sakta hai', 'RAM limited hai, sab kuch cache nahi ho sakta', 'Cache gira to database pe achanak load'] },
    { type: 'think', questions: [
      { q: 'xyz.com pe har user ki search query alag hai ("blue shoes size 9 under 2000"). Kya search results cache karna faayde ka hai?', a: 'Shayad bahut kam. Har query alag key hai, to hit rate kam rahega. Popular queries ("iphone", "cricket") cache karna faayde ka hai, long-tail (bahut kam baar aane wali) nahi. Cache tab kaam karta hai jab same cheez baar baar maangi jaaye.' },
      { q: 'TTL 1 second rakhein ya 1 ghanta? Profile data ke liye.', a: 'Trade-off hai. Lamba TTL = zyada hits, database ko aaraam, lekin stale data ka risk zyada. Chhota TTL = taaza data, lekin zyada misses. Profile ke liye kuch minute + update pe key delete karna achha balance hai.' },
      { q: 'Hit rate 90% hai aur database 1,000 queries/sec pe aaraam se chal raha hai. Traffic 5 guna ho gaya. Hit rate 90% hi raha. Kya database bachega?', a: 'Database pe ab 5,000 queries/sec aayengi (50,000 × 0.10). Agar wo itna nahi jhel sakta to nahi bachega. Raaste: hit rate badhao (lamba TTL, zyada RAM), ya database scale karo (read replicas, agle lessons). Yaad rakho: cache load ko kam karta hai, khatam nahi.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Cache miss ke baad cache-aside pattern mein server kya karta hai?', options: ['Error return', 'Database se laake cache mein save karta hai, phir return', 'Cache ko restart karta hai'], answer: 1, explain: 'Cache-aside: cache check → miss → database → cache mein save (TTL ke saath) → return.' },
      { q: 'User ne naam badla, lekin doosron ko purana naam dikh raha hai. Ye kya hai?', options: ['Cache stampede', 'Stale data', 'Cache hit'], answer: 1, explain: 'Cache aur database mein alag value. Fix: update pe cache key delete karo.' },
      { q: 'Kaunsi cheez cache karna sabse kam safe hai?', options: ['Trending posts', 'User profile photo', 'Payment se pehle bank balance'], answer: 2, explain: 'Paisa debit karne se pehle hamesha source of truth (database) se padho. Purana balance = asli nuksaan.' },
      { q: 'Redis mein <code>TTL user:42</code> ne <code>-2</code> diya. Matlab?', options: ['Key 2 second mein expire hogi', 'Key hai hi nahi (ya expire ho chuki)', 'Key pe koi timer nahi'], answer: 1, explain: '-2 = key nahi hai. -1 = key hai lekin koi TTL nahi. Positive number = itne second bache.' },
    ]},
    { type: 'sources', note: 'Redis commands aur latency numbers inse check kiye gaye.', items: [
      { title: 'EXPIRE command (Appendix: Redis expires)', publisher: 'Redis documentation', official: true, url: 'https://redis.io/docs/latest/commands/expire/', used: 'TTL ka matlab, SET pe TTL hatna, lazy (passive) aur active expiry.' },
      { title: 'TTL command', publisher: 'Redis documentation', official: true, url: 'https://redis.io/docs/latest/commands/ttl/', used: 'TTL ka -2 (key nahi) aur -1 (koi expiry nahi) jawab.' },
      { title: 'Latency numbers every programmer should know', publisher: 'Jeff Dean / Peter Norvig (GitHub gist by jboner)', url: 'https://gist.github.com/jboner/2841832', used: 'RAM read ~100 ns vs SSD random read ~150 µs: rough orders of magnitude. Numbers kuch saal purane hain, lekin farak ka andaza aaj bhi sahi hai.' },
    ]},
  ],
});
