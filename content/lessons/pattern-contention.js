Lesson.register({
  id: 'pattern-contention',
  title: 'Contention: sab ek hi cheez chahte hain',
  minutes: 28,
  summary: `Jab hazaaron log ek hi second mein ek hi cheez (aakhri hoodie, ek seat, ek ticket) lena chahte hain, to naive code ek item do logon ko bech deta hai. Is lesson mein: row locks, optimistic concurrency, atomic Redis operations, distributed locks, "10 minute hold" reservations aur virtual waiting rooms, aur kab kaunsa chunna hai.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Socho xyz.com pe sirf 100 hoodies hain aur 2,000 log ek hi second mein "Buy" dabaate hain.<br>Computer ek saath bahut saare kaam karta hai. Agar dhyaan na diya, to wo ek hi hoodie do logon ko bech dega.<br>Is lesson mein hum ek <strong>seedhi</strong> (ladder) chadhenge: sabse simple tareeke se shuru, aur upar tabhi jaayenge jab neeche wala tareeka bheed mein toot jaaye.<br>Har danda ek tool hai: taala lagana, likhte waqt check karna, super-fast counter, time wala taala, aur bheed ke liye line.<br>Aakhir mein ek simulator mein 1,000 logon ko 10 seats ke liye ladwa ke dekhenge ki kaunsa tool kya karta hai.` },
    { type: 'h2', text: 'Problem: 8 baje, 100 hoodies, 2,000 fans' },
    { type: 'p', html: `xyz.com pe ek bada creator apni limited merch drop karta hai: sirf <strong>100 hoodies</strong>, sale theek raat 8:00 baje. 8:00:00 pe 2,000 fans ek saath "Buy" dabaate hain. Hamara purana code bahut seedha tha:` },
    { type: 'code', text: `stock = SELECT qty FROM items WHERE id = 'hoodie'   -- 1. padho
if stock > 0:
    UPDATE items SET qty = stock - 1 WHERE id = 'hoodie' -- 2. likho
    create_order(user)
else:
    return "Sold out"` },
    { type: 'p', html: `Ek user ke liye bilkul sahi. Lekin 2,000 log ek saath? Do requests ne <em>ek hi pal</em> mein qty padhi: dono ko "1" dikha. Dono ne socha "ek bacha hai, mera". Dono ne qty = 0 likha. <strong>Ek hoodie, do orders.</strong> Isko <em>oversell</em> kehte hain, aur flash sale mein ye do nahi, sainkdon baar hota hai.` },
    { type: 'callout', tone: 'term', title: 'Contention', html: `<strong>Ye kya hai:</strong> bahut saare requests ek hi <em>shared</em> cheez (ek row, ek counter, ek seat) ko ek hi waqt pe badalna chahte hain. Jaise ek hi darwaze se 2,000 log ek saath ghusna chahein.<br><strong>Kyun samajhna zaroori:</strong> normal din mein requests alag alag rows chhooti hain, isliye problem dikhti hi nahi. Flash sale mein sab <strong>ek hi row</strong> pe toot padte hain, aur tabhi bugs nikalte hain.<br><strong>Iske bina (agar ignore kiya):</strong> ek item do logon ko bikta hai, ya system line mein atak ke slow ho jaata hai.` },
    { type: 'callout', tone: 'term', title: 'Race condition (aur lost update)', html: `<strong>Ye kya hai:</strong> race condition = result is baat pe depend kare ki kaunsa request pehle pahuncha, aur galat order mein galat result aaye. Upar wala case ek khaas race hai: <strong>lost update</strong>. Do log ek hi purani value padhte hain aur dono apni "nayi" value likh dete hain. Ek ki update doosre ne mita di.<br><strong>Kyun samajhna zaroori:</strong> ye bug test mein kabhi nahi dikhta (ek user, ek request), sirf asli bheed mein.<br><strong>Iske bina (agar roka nahi):</strong> oversell, galat balance, galat counters. Rate limiting lesson mein Redis counter ke saath yahi dekha tha (<a href="#/rate-limiting">Rate limiting</a>).` },
    { type: 'callout', tone: 'term', title: 'Transaction', html: `<strong>Ye kya hai:</strong> database ke kai kaam (queries) ka ek packet: <code>BEGIN</code> se shuru, <code>COMMIT</code> pe pakka. Ya to saare kaam honge, ya ek bhi nahi (beech mein fail hua to <code>ROLLBACK</code>).<br><strong>Kyun chahiye:</strong> "stock ghatao + order banao" aadha nahi hona chahiye.<br><strong>Iske bina:</strong> stock ghat gaya, order bana hi nahi (ya ulta). Details <a href="#/sql-vs-nosql">Databases lesson</a> mein.` },
    { type: 'ascii', caption: 'Read-then-write race: time upar se neeche', text: `time   Request A (Riya)          Request B (Kabir)        DB qty
 t1    SELECT qty  -> 1                                         1
 t2                              SELECT qty  -> 1               1
 t3    UPDATE qty = 0                                           0
 t4                              UPDATE qty = 0                 0
 t5    order #501 bana           order #502 bana        (1 hoodie, 2 orders!)` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "transaction laga do, ho gaya"', html: `Bahut log sochte hain <code>BEGIN ... COMMIT</code> mein daal diya to race khatam. <strong>Nahi.</strong> Har database ka ek <strong>isolation level</strong> hota hai (setting jo batati hai ki ek saath chal rahi transactions ek doosre ka kitna kaam dekh sakti hain). Postgres aur MySQL ka default level (Read Committed / Repeatable Read) is read-then-write ko automatically serialize nahi karta: dono transactions qty = 1 padh sakti hain. Transaction "sab ya kuch nahi" deta hai, "ek ek karke" nahi. Isolation levels ki kahani <a href="#/sql-vs-nosql">Databases lesson</a> mein hai. Race todne ke liye neeche wale tools chahiye.` },
    { type: 'p', html: `Ye pattern har jagah dikhta hai: BookMyShow pe ek seat, Tatkal train ticket, flash sale ka aakhri phone, online auction ki aakhri bid, ek hi cab do riders ko. Tools paanch hain. Har ek ka apna daam hai, isliye hum unhe ek <strong>seedhi</strong> ki tarah dekhenge.` },
    { type: 'h2', text: 'Contention ki seedhi: paanch dande' },
    { type: 'p', html: `Niyam simple hai: <strong>sabse neeche wale dande se shuru karo</strong>. Upar tabhi chadho jab neeche wala tumhari bheed mein toot jaaye. Har upar wala danda zyada taakat deta hai, lekin zyada parts, zyada code aur zyada cheezein jo kharab ho sakti hain.` },
    { type: 'ascii', caption: 'Neeche se upar padho. Har danda tab chahiye jab neeche wala kam pad jaaye.', text: `  5  Hold + waiting room   "seat 10 min tumhari" + bheed ko line mein roko
     ^  jab: kharidna ek process hai (payment), aur bheed backend se 100x
  4  Distributed lock+TTL  "ek waqt mein ek hi worker" (DB ke bahar ki cheez)
     ^  jab: jo bachana hai wo DB row nahi (external API, job)
  3  Atomic Redis          counter RAM mein, check + ghatana ek step (~1 ms)
     ^  jab: ek hot counter pe hazaaron/second
  2  Optimistic (version)  bina taale, likhte waqt check "kisi ne badla?"
     ^  jab: padhne aur likhne ke beech minutes (user form bhar raha),
     ^       itni der taala nahi rakh sakte; jhagda kabhi kabhi
  1  Row lock (FOR UPDATE) DB row pe taala, baaki line mein
     ^  jab: jhagda aksar, sab ek DB mein, traffic normal
  0  Naive read-then-write oversell! (kabhi mat karo)` },
    { type: 'callout', tone: 'tip', title: 'Har danda isi tarah padhenge', html: `(1) xyz.com ki ek kahani numbers ke saath, (2) tool seedhe shabdon mein, (3) khel ke dekhne wala widget ya diagram, (4) <strong>"Yahin ruk jao agar..."</strong>: kab upar chadhne ki zaroorat nahi, aur (5) gehrai ke liye kaunsa lesson padhna hai.` },
    { type: 'h2', text: 'Danda 1: Row lock (pessimistic locking)' },
    { type: 'p', html: `<strong>Kahani:</strong> xyz.com pe creators apni kamaai ek <strong>wallet</strong> mein rakhte hain. Riya ke wallet mein ₹1,000 hain. Uske phone aur laptop dono se ek hi pal mein "₹800 nikaalo" chala gaya. Dono requests ne balance padha (₹1,000), dono ne socha "kaafi hai", dono ne ₹800 nikaal diye. Balance ab −₹600. Normal din mein xyz.com pe ~50 withdrawals/second hote hain, lekin lakhon alag wallets pe. Ek wallet pe jhagda kabhi kabhi hota hai, par jab hota hai to paisa galat hota hai.` },
    { type: 'callout', tone: 'term', title: 'Lock (taala) aur row lock', html: `<strong>Ye kya hai:</strong> lock = ek "occupied" ka board. Jo pehle board laga de, wahi kaam karega; baaki ruk ke intezaar karenge. <strong>Row lock</strong> = database ki <em>ek row</em> (jaise Riya ka wallet, ya hoodie ka stock) pe laga taala.<br><strong>Kyun chahiye:</strong> padhne aur likhne ke beech koi aur us row ko na chhoo sake.<br><strong>Iske bina:</strong> do requests ek hi purani value padh ke dono likh deti hain: lost update.` },
    { type: 'callout', tone: 'term', title: 'Pessimistic vs optimistic', html: `<strong>Ye kya hai:</strong> lost update rokne ke do soch. <strong>Pessimistic</strong> (niraashawadi): "jhagda hoga hi, isliye pehle taala lagao, phir kaam karo." <strong>Optimistic</strong> (aashawadi): "jhagda shayad hi ho, bina taale kaam kar lo, aur likhte waqt check kar lo ki beech mein kisi ne badla to nahi."<br><strong>Kyun chahiye:</strong> jhagda kitna common hai, us hisaab se sahi soch chunni hoti hai.<br><strong>Iske bina:</strong> galat soch = ya to bekaar ki line (pessimistic jahan jhagda nahi), ya retries ka toofan (optimistic jahan jhagda hi jhagda).` },
    { type: 'p', html: `<code>SELECT ... FOR UPDATE</code> database ko bolta hai: "ye row main badalne wala hoon, mere COMMIT/ROLLBACK tak koi aur isse FOR UPDATE se padh ya badal nahi sakta." Doosri transaction wahin ruk jaati hai. Plain SELECT (bina FOR UPDATE) wale readers ko Postgres/MySQL ek snapshot (data ki pakki hui aakhri photo) se purani committed value dikha dete hain, unhe block nahi karte.` },
    { type: 'code', text: `BEGIN;
SELECT qty FROM items WHERE id = 'hoodie' FOR UPDATE;   -- lock + read
-- app: if qty > 0 ...
UPDATE items SET qty = qty - 1 WHERE id = 'hoodie';
INSERT INTO orders (user_id, item_id) VALUES (42, 'hoodie');
COMMIT;                                                 -- lock chhoota` },
    { type: 'list', items: [
      '<strong>Kab achha:</strong> conflict aksar hote hain, data paisa/inventory jaisa critical hai, aur sab kuch ek hi database mein hai. Code simple aur sahi.',
      '<strong>Bottleneck:</strong> ek row pe ek waqt mein ek hi transaction. Agar transaction 5 ms leti hai to us row pe max ~200 purchases/second. 2,000 log ek second mein aaye aur sab khareedna chahein, to line ~10 second mein khatam hoti hai: aakhri banda ~9 second rukta hai. Saath hi har waiting request ek <strong>DB connection</strong> pakde baithi hai (neeche card). Connections khatam to poori site (jo is sale se juda bhi nahi) atak jaati hai.',
      '<strong>Lock ko chhota rakho:</strong> lock ke andar kabhi network call (payment gateway, email) mat karo. Lock sirf DB ke andar ke kuch milliseconds ke liye.',
      '<strong>Timeout:</strong> Postgres mein <code>lock_timeout</code> (default 0 = hamesha wait), MySQL InnoDB mein <code>innodb_lock_wait_timeout</code> (default 50 s). Sale ke liye inhe chhota rakho, taaki user ko jaldi "dobara try karo" mile, 50 second ka spinner nahi.',
      '<strong>NOWAIT / SKIP LOCKED:</strong> <code>FOR UPDATE NOWAIT</code> lock na mile to turant error. <code>FOR UPDATE SKIP LOCKED</code> locked rows ko chhod ke agli free row deta hai: "koi bhi khaali seat de do" ya job queue (Long-running tasks lesson) ke liye perfect. Postgres 9.5+ aur MySQL 8.0+ mein hai.',
    ]},
    { type: 'callout', tone: 'term', title: 'DB connection pool', html: `<strong>Ye kya hai:</strong> app servers aur database ke beech pehle se khule hue connections ka ek set, jaise 100 phone lines. Har query ke liye ek line chahiye, kaam khatam to line wapas.<br><strong>Kyun chahiye:</strong> har query pe naya connection kholna slow hai, aur database ek limit tak hi connections jhel sakta hai.<br><strong>Iske bina (ya jab khatam ho jaaye):</strong> lock ke liye ruki har request ek line pakde baithi hai. 100 lines bhar gayi to homepage, login, sab "connection nahi mila" pe atak jaate hain.` },
    { type: 'p', html: `Neeche khud dekho: ek row pe line kitni lambi banti hai. Transaction ka time aur buyers badlo.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Ek transaction ka time (lock kitni der): <strong class="rl-tv"></strong></label><input class="rl-t" type="range" min="1" max="50" step="1" value="5"></div>
          <div><label>Ek second mein kitne buyers (sab ek hi row pe): <strong class="rl-nv"></strong></label><input class="rl-n" type="range" min="50" max="5000" step="50" value="2000"></div>
          <div><label>DB connection pool: <strong class="rl-pv"></strong></label><input class="rl-p" type="range" min="20" max="500" step="10" value="100"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Row ki max speed</span><strong class="rl-rate"></strong></div>
          <div class="stat"><span>Line khatam hone mein</span><strong class="rl-done"></strong></div>
          <div class="stat"><span>Aakhri buyer ka wait</span><strong class="rl-wait"></strong></div>
          <div class="stat"><span>1 second pe line mein khade</span><strong class="rl-q"></strong></div>
        </div>
        <div class="calc-note rl-note"></div>`;
      const $ = s => el.querySelector(s);
      const f = n => Math.round(n).toLocaleString('en-IN');
      const sec = ms => ms < 1000 ? f(ms) + ' ms' : (ms / 1000).toFixed(1) + ' s';
      const upd = () => {
        const t = +$('.rl-t').value, n = +$('.rl-n').value, pool = +$('.rl-p').value;
        $('.rl-tv').textContent = t + ' ms'; $('.rl-nv').textContent = f(n); $('.rl-pv').textContent = f(pool);
        const rate = 1000 / t;                 // ek row pe max transactions per second
        const done = Math.max(1000, n * t);    // buyers 0..1 s mein aate hain; line kab khaali
        const wait = Math.max(t, n * t - 1000 + t);
        const q = Math.max(0, Math.round(n - rate)); // 1 s pe kitne abhi bhi line mein
        $('.rl-rate').textContent = f(rate) + ' / s';
        $('.rl-done').textContent = sec(done);
        $('.rl-wait').textContent = sec(wait);
        $('.rl-q').textContent = f(q);
        $('.rl-q').style.color = q > pool ? 'var(--red)' : '';
        $('.rl-note').innerHTML = q === 0
          ? `Row ek second mein ${f(rate)} transactions jhel leti hai, aur buyers ${f(n)} hain. <strong>Koi line nahi.</strong> Yahan row lock bilkul theek tool hai.`
          : q > pool
            ? `1 second pe <strong>${f(q)} requests</strong> lock ke liye ruki hain, har ek ek DB connection pakde. Pool sirf ${f(pool)} ka hai: <strong>pool khatam</strong>, baaki poori site bhi atki. Yahan upar wala danda chahiye (atomic counter, waiting room).`
            : `${f(q)} requests line mein, pool (${f(pool)}) abhi bacha hai. Aakhri buyer ${sec(wait)} rukta hai. Chal jaayega, lekin bheed thodi aur badhi to pool khatam.`;
      };
      ['.rl-t', '.rl-n', '.rl-p'].forEach(c => $(c).addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'term', title: 'Deadlock', html: `<strong>Ye kya hai:</strong> A ne seat 1 lock ki aur seat 2 maang raha hai. B ne seat 2 lock ki aur seat 1 maang raha hai. Dono hamesha ek doosre ka wait karenge, jaise do log ek patli gali mein aamne saamne, koi peeche nahi hatta.<br><strong>Kyun samajhna zaroori:</strong> jab ek request kai rows lock karti hai (do seats, do wallets), ye hota hi hai.<br><strong>Iske bina (agar dhyaan na diya):</strong> database ise detect karke ek transaction ko maar deta hai (error), aur app ko retry karna padta hai. Bachav: multiple rows hamesha <strong>ek hi order</strong> mein lock karo (jaise seat id ascending: <code>ORDER BY id FOR UPDATE</code>).` },
    { type: 'callout', tone: 'tip', title: 'Yahin ruk jao agar...', html: `...jhagda ek row pe kabhi kabhi hota hai, ek row pe sau-do sau/second se kam log hain, aur sab data ek hi database mein hai. Wallet, bank transfer, order status: inke liye row lock (ya ek conditional UPDATE) hi kaafi hai. Upar ke dande yahan sirf complexity badhaayenge. Gehrai: <a href="#/sql-vs-nosql">Databases (ACID, isolation)</a>, <a href="#/db-internals">DB internals</a>.` },

    { type: 'h2', text: 'Danda 2: Optimistic concurrency (version / compare-and-set)' },
    { type: 'p', html: `<strong>Kahani:</strong> xyz.com ke ek bade channel ke do moderators, Meera aur Arjun, ek hi video ka title aur description edit karte hain. Meera ne edit form 9:00 pe khola, Arjun ne 9:01 pe. Meera 9:03 pe Save dabaati hai, Arjun 9:04 pe. Arjun ka Save Meera ka poora kaam chupchaap mita deta hai (lost update). Row lock yahan kaam nahi karega: form 3-4 minute khula rehta hai, aur itni der DB connection aur taala pakad ke baithna namumkin hai. Aur jhagda rare hai: xyz.com pe roz ~10 lakh edits hote hain, unme se shayad 100 hi ek saath same cheez pe.` },
    { type: 'callout', tone: 'term', title: 'Version column', html: `<strong>Ye kya hai:</strong> row mein ek number (<code>version</code>) jo har update pe 1 badhta hai. Jaise document ke upar "v7" likha ho.<br><strong>Kyun chahiye:</strong> likhte waqt pata chal jaata hai ki maine jo padha tha (v7), wo abhi bhi wahi hai ya kisi ne beech mein badal diya (ab v8).<br><strong>Iske bina:</strong> app ko pata hi nahi chalta ki uska data purana ho chuka hai.` },
    { type: 'callout', tone: 'term', title: 'Compare-and-set (CAS)', html: `<strong>Ye kya hai:</strong> "value tabhi badlo jab wo abhi bhi wahi ho jo maine dekhi thi." Compare aur write ek hi atomic step mein (atomic = beech mein koi ghus nahi sakta). Database mein ye <code>UPDATE ... WHERE version = 7</code> hai.<br><strong>Kyun chahiye:</strong> bina taale ke bhi lost update ruk jaata hai. Agar 0 rows badli, to kisi ne beech mein badal diya: dobara padho aur retry karo, ya user ko batao.<br><strong>Iske bina:</strong> optimistic soch ke paas check karne ka koi tareeka nahi.<br><strong>Example:</strong> Meera ka Save (v7 → v8) chal gaya. Arjun ka Save "WHERE version = 7" bhejta hai, 0 rows. Arjun ko dikhta hai: "ye video kisi ne abhi badla hai, naya version dekho."` },
    { type: 'code', text: `-- 1. padho (koi lock nahi)
SELECT qty, version FROM items WHERE id = 'hoodie';          -- (1, 7)
-- 2. likho, sirf agar kisi ne beech mein nahi chhua
UPDATE items SET qty = 0, version = 8
 WHERE id = 'hoodie' AND version = 7;                        -- 1 row = jeet, 0 rows = conflict

-- Counter jaise simple case mein ek hi statement kaafi hai (DB khud row lock leta hai):
UPDATE items SET qty = qty - 1 WHERE id = 'hoodie' AND qty > 0;   -- 1 row = bik gaya` },
    { type: 'p', html: `Ye idea har jagah milta hai: DynamoDB ki <em>conditional writes</em> (<code>ConditionExpression</code>), HTTP mein <code>ETag</code> (server ka diya hua "is resource ka version" tag) + <code>If-Match</code> header ("sirf tab badlo jab version abhi bhi yahi ho"; warna 412 Precondition Failed), Elasticsearch ka <code>if_seq_no</code>, Kubernetes ka <code>resourceVersion</code>. Wiki page ya Google Doc jaisa "do log ek hi profile edit kar rahe" case optimistic ka perfect use hai: conflict rare, aur hua to user ko "page badal gaya, refresh karo" dikha do.` },
    { type: 'callout', tone: 'warn', title: 'Optimistic ki kamzori: hot row', html: `Jab sab log <strong>ek hi row</strong> pe hain, har 5 ms mein sirf ek CAS jeet sakta hai, baaki sab haarte hain, retry karte hain, aur phir haarte hain. Kaam barbaad, DB pe load badhta hai, aur users ko error milte hain jabki stock abhi bacha hai. Simulator mein "Optimistic" ko 100 se 500 hoodies pe chala ke dekhna.` },
    { type: 'callout', tone: 'tip', title: 'Yahin ruk jao agar...', html: `...jhagda rare hai (profile, settings, wiki, document edit), ya padhne aur likhne ke beech user ka "sochne ka time" hai. Optimistic sasta hai: koi taala nahi, koi line nahi. Lekin agar ek hi row pe sab ek second mein toot padein (flash sale), to optimistic sabse bura hai (simulator mein dekhoge). Tab danda 3. Gehrai: <a href="#/consistency">Consistency</a>, <a href="#/object-storage">Object storage (ETag)</a>.` },
    { type: 'h2', text: 'Danda 3: Atomic Redis operations' },
    { type: 'p', html: `<strong>Kahani:</strong> wapas hoodie sale pe. 2,000 fans, 100 hoodies, sab ek second mein. Upar widget mein dekha: row lock pe 1 second ke baad ~1,800 requests line mein khadi, aur 100 connections ka pool khatam. Optimistic aur bura (simulator mein dekhoge). Asli kaam bas itna hai: <strong>ek number ko 100 se 0 tak, ek ek karke, bina galti ghatana</strong>. Iske liye poora database transaction bahut bhaari hai.` },
    { type: 'callout', tone: 'term', title: 'Atomic operation', html: `<strong>Ye kya hai:</strong> aisa kaam jo ek hi jhatke mein hota hai. Beech mein koi aur request ghus ke aadhi-adhoori value nahi dekh sakti. "Padho, check karo, ghatao" agar teen alag steps hain, to beech mein race. Agar ek atomic step hai, to race hi nahi.<br><strong>Kyun chahiye:</strong> bina taale aur bina line ke bhi sahi result.<br><strong>Iske bina:</strong> GET aur DECR ke beech doosra client ghus jaata hai.` },
    { type: 'callout', tone: 'term', title: 'Redis aur Lua script', html: `<strong>Ye kya hai:</strong> Redis ek in-memory store hai (data RAM mein, isliye bahut tez), jo <a href="#/caching">Caching lesson</a> mein dekha tha. Redis commands ek ek karke chalata hai, isliye har single command (jaise <code>DECR</code> = 1 ghatao) apne aap atomic hai. <strong>Lua script</strong> = chhota sa program jo Redis ke andar chalta hai. Redis poora script khatam karke hi agla command leta hai, isliye "check + ghatao" bhi ek atomic step ban jaata hai.<br><strong>Kyun chahiye:</strong> ~1 ms mein faisla, database ko chhue bina.<br><strong>Iske bina:</strong> har buyer ke liye ek DB transaction aur row lock ki line.` },
    { type: 'p', html: `Database ki row ek waqt mein ek transaction ko deti hai, aur har transaction disk, locks aur commit ka kharcha uthaati hai. Flash sale mein jahan sirf ek <em>number</em> ghatana hai, ye bahut mehnga hai. Redis us number ko RAM mein rakhta hai aur commands ek ek karke chalata hai, isliye har command apne aap <strong>atomic</strong> hai (beech mein koi doosra command ghus nahi sakta).` },
    { type: 'list', items: [
      '<code>DECR stock:hoodie</code> naya value lautata hai. Agar result &lt; 0 aaya to tum late the: <code>INCR</code> karke wapas karo aur "Sold out" bolo. Simple, lekin counter thodi der ke liye negative dikh sakta hai.',
      '<strong>Lua script</strong> (<code>EVAL</code>) ya Redis Functions: "check + decrement" ek hi script mein. Redis poora script chala ke hi agla command leta hai, isliye ye check-then-act bhi atomic ho jaata hai. Neeche diagram ka "Atomic Redis" scenario yahi hai. Script chhota rakho: jab tak script chal rahi, Redis baaki sab ko rok ke rakhta hai.',
      '<strong>Speed:</strong> ek Redis node lakh+ simple operations per second kar leta hai, ~1 ms network round trip ke saath. Database row lock ke 200/s se kahin aage.',
      '<strong>Jeetne ke baad:</strong> Redis sirf "kaun jeeta" decide karta hai. Asli order (payment, address) ek <a href="#/queues">queue</a> ke through DB mein likha jaata hai, apni speed se.',
    ]},
    { type: 'callout', tone: 'warn', title: 'Redis source of truth nahi hai', html: `<strong>Source of truth</strong> = wo jagah jiska data "asli sach" maana jaata hai. Redis ye nahi ho sakta. Redis crash ho aur aakhri kuch writes disk tak na pahunche (ye uski disk-save setting AOF/RDB pe depend karta hai), ya <strong>failover</strong> ho (main Redis mara, uski copy yaani replica ne jagah li) aur replica thoda peeche ho, to counter galat ho sakta hai. Isliye: (1) DB mein bhi orders ka count rakho aur sale ke baad <strong>reconcile</strong> karo (dono jagah ke numbers milao, farak ho to theek karo); (2) DB mein ek aakhri safety net rakho, jaise <code>UPDATE ... WHERE qty &gt; 0</code> ya unique constraint (ek seat ka ek hi booking). Redis bheed rokta hai, DB sach ka faisla karta hai.` },
    { type: 'callout', tone: 'tip', title: 'Yahin ruk jao agar...', html: `...problem bas "ek counter ko bheed mein sahi ghatana" hai, aur kharidna ek click hai (likes, coupon codes, flash sale ka "pehle 100"). Atomic Redis + queue + DB safety net ek hot counter ke liye kaafi hai. Upar tab jao jab (a) jo bachana hai wo counter nahi, koi bahar ki cheez hai (danda 4), ya (b) user ko payment ke liye minutes chahiye aur bheed backend se kai guna hai (danda 5). Gehrai: <a href="#/caching">Caching</a>, <a href="#/queues">Message queues</a>, <a href="#/pattern-writes">Scaling writes</a>.` },
    { type: 'h2', text: 'Chala ke dekho: aakhri hoodie, do fans' },
    { type: 'p', html: `Ab tak ke teen dande ek hi race pe chala ke dekho. Stock mein <strong>sirf 1 hoodie</strong> bachi hai. Riya aur Kabir ek hi millisecond mein Buy dabaate hain. Har scenario ek alag tool hai. Pehle "Naive" (danda 0) chalao, phir baaki.` },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'a', label: 'Riya', sub: 'Buy dabaya', x: 90, y: 75, w: 130, kind: 'client', info: 'Ye kya hai: pehli fan, Riya, jo aakhri hoodie khareedna chahti hai. Uski request xyz.com ke kisi ek checkout server pe pahunchti hai.' },
        { id: 'b', label: 'Kabir', sub: 'Buy dabaya', x: 90, y: 255, w: 130, kind: 'client', info: 'Ye kya hai: doosra fan, Kabir. Usi millisecond mein request bhejta hai. Asli sale mein aise hazaaron hote hain, sab ek hi row ke peeche.' },
        { id: 'app', label: 'Checkout API', sub: 'stateless servers', x: 320, y: 165, w: 160, kind: 'server', info: 'Ye kya hai: checkout service, jo "Buy" ka kaam karti hai. Isme kai servers hain, aur har request alag server pe ja sakti hai. Isliye server ki memory mein lock rakhna bekaar hai: Riya ka server Kabir ke server ka lock nahi dekh sakta. Faisla shared jagah (DB ya Redis) pe hona chahiye.' },
        { id: 'db', label: 'Postgres', sub: 'items: qty = 1', x: 580, y: 235, w: 170, kind: 'data', info: 'Ye kya hai: xyz.com ka main database, aur source of truth (asli sach yahin). items table mein hoodie ki ek row: qty aur version. Contention isi ek row pe hai.' },
        { id: 'r', label: 'Redis', sub: 'stock:hoodie = 1', x: 580, y: 75, w: 170, kind: 'cache', hidden: true, info: 'Ye kya hai: in-memory store (data RAM mein, bahut tez). Redis commands ek ek karke chalte hain (ek main thread), isliye DECR ya Lua script beech mein kisi aur se toot nahi sakti. Flash sale ka counter yahan rakhte hain; asli order DB mein baad mein likha jaata hai.' },
      ],
      edges: [{ a: 'a', b: 'app' }, { a: 'b', b: 'app' }, { a: 'app', b: 'db' }, { a: 'app', b: 'r', id: 'ar', hidden: true }],
      scenarios: [
        { name: 'Naive: oversell', intro: 'Purana read-then-write code, koi protection nahi.', steps: [
          { title: 'Dono ne qty padhi', text: 'Riya aur Kabir ki requests lagbhag saath DB tak pahunchti hain. Dono ko qty = 1 dikhta hai.', parallel: true, go: ['a>app>db', 'b>app>db'], msg: 'A: SELECT qty → 1\nB: SELECT qty → 1' },
          { title: 'Dono ne likha', text: 'Dono apne hisaab se "1 - 1 = 0" likhte hain. DB ko koi shikayat nahi: dono valid UPDATE hain.', parallel: true, go: ['res:db>app>a', 'res:db>app>b'], after: { db: { state: 'warn', sub: 'qty = 0, orders = 2' } }, msg: 'A: UPDATE qty = 0  ✓\nB: UPDATE qty = 0  ✓' },
          { title: 'Oversell', text: 'Do confirmation emails gaye, hoodie ek. Ab ek fan ko refund aur sorry mail. 2,000 fans ki sale mein ye sainkdon baar hoga (neeche simulator mein dekhoge).', set: { a: { state: 'ok', sub: 'order #501' }, b: { state: 'down', sub: '#502: oversold' } }, focus: ['a', 'b'] },
        ]},
        { name: 'Row lock (FOR UPDATE)', intro: 'Pessimistic: pehle row pe taala, phir padho.', steps: [
          { title: 'Riya ne row lock ki', text: '<code>SELECT ... FOR UPDATE</code> row padhta bhi hai aur us pe <strong>lock</strong> bhi laga deta hai, transaction khatam hone tak.', go: ['a>app>db', 'res:db>app'], after: { db: { state: 'hot', sub: 'locked by A, qty = 1' } }, msg: 'BEGIN;\nSELECT qty FROM items WHERE id=\'hoodie\' FOR UPDATE;  → 1' },
          { title: 'Kabir ko intezaar', text: 'Kabir ka bhi FOR UPDATE aata hai. Row locked hai, to uski query <strong>ruk jaati hai</strong> (block). Uska DB connection bhi tab tak bandha rehta hai.', go: 'b>app>db', after: { b: { state: 'warn', sub: 'waiting...' } }, msg: 'B: SELECT ... FOR UPDATE   (blocked)' },
          { title: 'Riya ka commit', text: 'Riya qty = 0 likhti hai aur COMMIT. Lock chhoot jaata hai.', go: 'res:db>app>a', after: { a: { state: 'ok', sub: 'order #501' }, db: { state: '', sub: 'qty = 0' } }, msg: 'UPDATE items SET qty = 0 ...; COMMIT;' },
          { title: 'Kabir ko sahi jawab', text: 'Ab Kabir ki query chalti hai aur use <strong>taaza</strong> value milti hai: 0. Use "Sold out". Koi oversell nahi. Daam: Kabir ne wait kiya, aur bheed mein ye wait lamba hota jaata hai.', go: 'res:db>app>b', after: { b: { state: 'miss', sub: 'Sold out' } }, msg: 'B: → qty = 0  →  "Sold out"' },
        ]},
        { name: 'Optimistic (version)', intro: 'Lock nahi, likhte waqt check: "jo maine padha tha, wo abhi bhi wahi hai?"', steps: [
          { title: 'Dono ne version 7 padha', text: 'Row mein ek <code>version</code> column hai. Dono ko qty = 1, version = 7 dikhta hai. Koi lock nahi laga.', parallel: true, go: ['a>app>db', 'b>app>db'], after: { db: { sub: 'qty = 1, v = 7' } }, msg: 'SELECT qty, version → (1, 7)' },
          { title: 'Riya ka conditional UPDATE', text: 'Update tabhi ho jab version abhi bhi 7 ho. Ho gaya: 1 row updated, version ab 8.', go: ['app>db', 'res:db>app>a'], after: { db: { sub: 'qty = 0, v = 8' }, a: { state: 'ok', sub: 'order #501' } }, msg: 'UPDATE items SET qty = 0, version = 8\n WHERE id = \'hoodie\' AND version = 7;   → 1 row' },
          { title: 'Kabir ka UPDATE: 0 rows', text: 'Kabir bhi "WHERE version = 7" bhejta hai, lekin ab version 8 hai. <strong>0 rows updated</strong> = kisi ne beech mein badal diya. App samajh jaata hai: conflict.', go: ['app>db', 'bad:db>app'], after: { b: { state: 'warn', sub: 'conflict' } }, msg: 'UPDATE ... WHERE version = 7;   → 0 rows' },
          { title: 'Retry: dobara padho', text: 'App Kabir ke liye phir se padhta hai: qty = 0. Jawab "Sold out". Conflict kam ho to ye bahut sasta hai; bheed mein retry ka toofan aata hai.', go: ['app>db', 'res:db>app>b'], after: { b: { state: 'miss', sub: 'Sold out' } } },
        ]},
        { name: 'Atomic Redis', intro: 'Stock counter Redis mein, check aur ghatana ek hi atomic step.', steps: [
          { title: 'Counter Redis mein', text: 'Sale se pehle stock Redis mein load kiya: <code>stock:hoodie = 1</code>. Ab DB is hot path mein nahi.', show: ['r', 'ar'], set: { db: { state: 'dim', sub: 'orders (async)' } }, focus: ['r'] },
          { title: 'Dono ka Lua script', text: 'Script: "agar stock > 0 to DECR karo aur 1 lautao, warna 0". Redis ek script poora chala ke hi agla command leta hai, to beech mein koi ghus nahi sakta.', parallel: true, go: ['a>app>r', 'b>app>r'], msg: '-- buy.lua (EVAL ... 1 stock:hoodie)\nlocal s = tonumber(redis.call(\'GET\', KEYS[1]))\nif s > 0 then redis.call(\'DECR\', KEYS[1]) return 1 end\nreturn 0' },
          { title: 'Ek jeeta, ek "Sold out"', text: 'Pehla script 1 lautata hai (stock 0), doosra 0. ~1 ms mein dono ko jawab, koi wait queue nahi. Jeetne wale ka order baad mein queue ke through DB mein likha jaata hai.', parallel: true, go: ['res:r>app>a', 'bad:r>app>b'], after: { r: { state: 'ok', sub: 'stock:hoodie = 0' }, a: { state: 'ok', sub: 'won' }, b: { state: 'miss', sub: 'Sold out' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'Danda 4: Distributed lock with TTL (kab, aur kab nahi)' },
    { type: 'p', html: `<strong>Kahani:</strong> har raat 2 baje xyz.com ka <strong>payout job</strong> chalta hai: ~40,000 creators ka hisaab banata hai aur bank API ko "inhe paisa bhejo" bolta hai. Ek server mar na jaaye isliye job 3 servers pe schedule hai. Bina kisi rok ke teeno chal padenge, aur har creator ko <strong>teen baar</strong> paisa. Yahan bachane wali cheez database ki ek row nahi, ek <em>kaam</em> hai (aur bahar ka bank). Row lock yahan fit nahi hota.` },
    { type: 'callout', tone: 'term', title: 'Distributed lock', html: `<strong>Ye kya hai:</strong> ek taala jo kai machines ke beech shared hai. Ek common jagah (Redis, ZooKeeper, etcd) mein ek key: jisne pehle likh di, wahi "lock holder". Baaki dekh ke ruk jaate hain.<br><strong>Kyun chahiye:</strong> 3 servers, ek kaam. Sirf ek hi chale.<br><strong>Iske bina:</strong> har server apne aap ko akela samjhta hai: teen payouts, teen emails, teen reports.` },
    { type: 'callout', tone: 'term', title: 'TTL (time to live)', html: `<strong>Ye kya hai:</strong> key ki expiry. <code>PX 30000</code> = 30 second baad key apne aap mit jaayegi.<br><strong>Kyun chahiye:</strong> lock holder server crash ho gaya to wo kabhi "unlock" nahi bolega. TTL ke baad taala khud khul jaata hai aur doosra server kaam utha leta hai.<br><strong>Iske bina:</strong> ek crash = taala hamesha ke liye band, payout kabhi nahi chalega.` },
    { type: 'callout', tone: 'term', title: 'Fencing token', html: `<strong>Ye kya hai:</strong> har baar lock dete waqt ek badhta hua number (33, 34, 35...). Lock holder har write ke saath apna number bhejta hai. Storage (DB, file service) yaad rakhta hai ki ab tak sabse bada number kaunsa dekha, aur usse chhote number wali write <strong>reject</strong> kar deta hai.<br><strong>Kyun chahiye:</strong> TTL ka ek jaal hai. Lock holder ruka (jaise <strong>GC pause</strong>: program ki memory saaf karte waqt kuch second ke liye sab kuch ruk jaana), TTL khatam, doosre ko lock mil gaya. Pehla jaaga aur use pata hi nahi ki lock ab uska nahi.<br><strong>Iske bina:</strong> do log ek saath "lock holder", aur purane ki der se aayi write naye ka kaam bigaad deti hai.` },
    { type: 'p', html: `<a href="#/coordination">Coordination lesson</a> mein dekha: <code>SET lock:x owner NX PX 30000</code> se Redis mein ek lock (<code>NX</code> = sirf tab likho jab key pehle se na ho, yaani koi aur holder nahi; <code>PX 30000</code> = 30 s ka TTL), jo crash hone pe TTL ke baad khud khul jaata hai, aur <strong>fencing token</strong> jo purane lock holder ki der se aayi write ko reject karta hai. Contention mein iska role chhota hai:` },
    { type: 'list', items: [
      '<strong>Kab use karo:</strong> jab protect karne wali cheez database row nahi hai. Jaise ek creator ka payout ek hi worker chalaye, ek external API ko ek waqt mein ek hi call jaaye, ya ek bada report ek hi baar bane.',
      '<strong>Kab nahi:</strong> inventory ke har purchase pe. Har request lock le, kaam kare, lock chhode: ye row lock jaisa hi serial hai, plus Redis ka ek extra round trip aur TTL ka khatra. Agar data ek DB mein hai to DB ka lock ya conditional UPDATE behtar hai.',
      '<strong>TTL ka jaal:</strong> holder TTL se zyada atak gaya (GC pause, slow network) to do log ek saath "lock holder" ban jaate hain. Correctness chahiye to fencing token aur storage pe check zaroori. Neeche khud dekho.',
      '<strong>Lock chhodna bhi dhyaan se:</strong> sirf apna lock mitao. Key ki value (tumhara random owner id) match ho tabhi delete: Redis 8.4+ mein <code>DELEX key IFEQ value</code>, purane versions mein ek chhota Lua script. Warna TTL ke baad doosre ka lock tum mita doge.',
    ]},

    { type: 'p', html: `<strong>Khel ke dekho:</strong> Worker A ko lock (token 33) mila. 2 second kaam ke baad wo ek GC pause mein atak jaata hai. Worker B har second lock try karta hai. TTL aur pause badlo, aur fencing on/off karke dekho.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Lock TTL: <strong class="dl-tv"></strong></label><input class="dl-t" type="range" min="10" max="60" step="5" value="30"></div>
          <div><label>Worker A ka pause (GC): <strong class="dl-pv"></strong></label><input class="dl-p" type="range" min="0" max="60" step="5" value="0"></div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin:10px 0"><button type="button" class="chip dl-f">Fencing token: OFF</button></div>
        <div class="dl-tracks" style="display:grid;gap:6px;font-size:13px"></div>
        <ol class="dl-log" style="font-family:var(--f-mono);font-size:12.5px;margin:10px 0 0;padding-left:20px"></ol>
        <div class="calc-note dl-note"></div>`;
      const $ = s => el.querySelector(s);
      let fence = false;
      const span = 75; // seconds shown on the bar
      const bar = (lbl, segs) => `<div style="display:flex;align-items:center;gap:8px"><span style="width:62px;flex:none">${lbl}</span><div style="position:relative;flex:1;height:18px;background:var(--surface-2);border-radius:var(--r-sm);overflow:hidden">${segs.map(([a, b, c]) => `<div style="position:absolute;top:0;bottom:0;left:${a / span * 100}%;width:${Math.max(1, (b - a) / span * 100)}%;background:${c}"></div>`).join('')}</div></div>`;
      const upd = () => {
        const ttl = +$('.dl-t').value, P = +$('.dl-p').value;
        $('.dl-tv').textContent = ttl + ' s'; $('.dl-pv').textContent = P + ' s';
        $('.dl-f').textContent = 'Fencing token: ' + (fence ? 'ON' : 'OFF'); $('.dl-f').classList.toggle('on', fence);
        const aWrite = P + 3;                 // A: 2 s kaam, P s pause, phir 1 s mein write
        const log = [], segsA = [[0, 2, 'var(--green)']], segsB = [];
        log.push('t=0s   A ne lock liya (token 33), kaam shuru');
        if (P > 0) segsA.push([2, 2 + P, 'var(--amber)']);
        let note;
        if (aWrite <= ttl) {
          segsA.push([2 + P, aWrite, 'var(--green)']);
          if (P > 0) log.push(`t=2s   A ruk gaya (GC pause ${P} s)`);
          log.push(`t=${aWrite}s  A ne likha (token 33) aur lock chhoda`);
          segsB.push([aWrite, aWrite + 3, 'var(--green)']);
          log.push(`t=${aWrite}s  B ko lock mila (token 34): kaam pehle hi ho chuka, B kuch nahi karta`);
          note = `A ka kaam (${aWrite} s) TTL (${ttl} s) se pehle khatam. Ek waqt mein ek hi holder. <strong>Safe.</strong>`;
        } else {
          log.push(`t=2s   A ruk gaya (GC pause ${P} s)`);
          log.push(`t=${ttl}s  TTL khatam, key mit gayi. A ko pata nahi.`);
          log.push(`t=${ttl}s  B ko lock mila (token 34)`);
          log.push(`t=${ttl + 1}s  B ne likha (token 34). Storage ka sabse bada token: 34`);
          segsB.push([ttl, ttl + 1, 'var(--green)']);
          segsA.push([2 + P, aWrite, fence ? 'var(--ink-3)' : 'var(--red)']);
          if (fence) {
            log.push(`t=${aWrite}s  A jaaga, likha (token 33): REJECT (33 < 34)`);
            note = `A ka pause TTL se lamba tha, isliye ${ttl} s se ${aWrite} s tak <strong>do log khud ko holder samajh rahe the</strong>. Lekin storage ne token 33 dekh ke A ki purani write reject kar di. <strong>Fencing ne bachaya.</strong>`;
          } else {
            log.push(`t=${aWrite}s  A jaaga, likha (token 33): ACCEPT. B ka kaam bigda!`);
            note = `A ka pause TTL se lamba tha. ${ttl} s se ${aWrite} s tak <strong>do lock holders</strong>. A ki der se aayi write ne B ka kaam overwrite kar diya: payout do baar ya galat data. <strong>Sirf TTL kaafi nahi</strong>; fencing ON karke dekho.`;
          }
        }
        $('.dl-tracks').innerHTML = bar('Worker A', segsA) + bar('Worker B', segsB) + `<div style="color:var(--ink-3);font-size:12px">Bar 0 se ${span} s. Green = kaam, amber = pause, red = galat write, grey = reject hui write.</div>`;
        $('.dl-log').innerHTML = log.map(x => `<li>${x}</li>`).join('');
        $('.dl-note').innerHTML = note;
      };
      $('.dl-f').onclick = () => { fence = !fence; upd(); };
      ['.dl-t', '.dl-p'].forEach(c => $(c).addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'tip', title: 'Yahin ruk jao agar...', html: `...tumhe bas "ek waqt mein ek hi worker" chahiye, kaam idempotent hai (do baar chale to bhi nuksaan nahi), aur protect hone wali cheez DB row nahi hai. Inventory ya seats ke liye distributed lock mat lagao: wahan danda 1-3 behtar hain. Aur jahan correctness paisa hai, wahan fencing token ya DB ka conditional write saath mein. Gehrai: <a href="#/coordination">Coordination (leases, fencing)</a>, <a href="#/consensus">Consensus</a>.` },

    { type: 'h2', text: 'Danda 5: "10 minute ke liye hold" + virtual waiting room' },
    { type: 'p', html: `Ab xyz.com ek live creator meetup ke <strong>500 seats</strong> bechta hai. Problem badal gaya: buy ek click nahi, ek process hai. User seat chunta hai, phir payment page pe 2-3 minute lagata hai. Agar seat payment ke baad lock karein, to do log ek seat ke liye pay kar denge. Agar seat chunte hi permanently de dein, to jo log payment chhod ke chale gaye unki seats hamesha ke liye atak jaayengi.` },
    { type: 'callout', tone: 'term', title: 'Hold (temporary reservation)', html: `<strong>Ye kya hai:</strong> seat ko thodi der ke liye (maan lo 10 minute) tumhare naam kar dena. Is beech koi aur use nahi le sakta. Payment ho gaya to hold <em>booking</em> ban jaata hai. Time khatam aur payment nahi hua, to hold <strong>expire</strong> aur seat wapas sabke liye. BookMyShow aur IRCTC ka "session timer" yahi hai.<br><strong>Kyun chahiye:</strong> payment mein minutes lagte hain. Itni der row lock nahi pakad sakte, aur bina rok ke do log ek seat ke liye pay kar denge.<br><strong>Iske bina:</strong> ya double booking, ya abandon ki hui seats hamesha ke liye "atki".` },
    { type: 'callout', tone: 'term', title: 'Webhook', html: `<strong>Ye kya hai:</strong> bahar ki service (yahan payment gateway) ka hamare server ko kiya hua call: "payment #8812 ho gaya". Hum unhe pehle se ek URL de dete hain, wo kaam hone pe us URL pe batate hain.<br><strong>Kyun chahiye:</strong> payment kab poora hoga, ye gateway jaanta hai, hum nahi. Baar baar poochhne (polling) se behtar.<br><strong>Iske bina:</strong> hamein pata hi nahi chalega ki kab booking pakki karni hai.` },
    { type: 'code', text: `-- seats: id, status (AVAILABLE | HELD | BOOKED), held_by, hold_until
-- Hold lena: ek hi atomic conditional UPDATE (expired holds bhi le sakte ho)
UPDATE seats SET status = 'HELD', held_by = 42, hold_until = now() + interval '10 minutes'
 WHERE id = 'A12'
   AND (status = 'AVAILABLE' OR (status = 'HELD' AND hold_until < now()));   -- 1 row = mila

-- Payment success webhook aane pe: sirf apna, abhi bhi valid hold hi book ho
UPDATE seats SET status = 'BOOKED'
 WHERE id = 'A12' AND status = 'HELD' AND held_by = 42 AND hold_until > now();` },
    { type: 'list', items: [
      '<strong>Expiry ke do tareeke:</strong> (1) <em>lazy</em>: upar jaisa, query hi <code>hold_until &lt; now()</code> ko free maan leti hai, koi background job zaroori nahi; (2) Redis mein <code>SET hold:A12 user42 NX EX 600</code>, key khud gayab ho jaati hai. Aksar dono: Redis tez check ke liye, DB sach ke liye, aur ek sweeper job jo purane HELD rows saaf kare.',
      '<strong>Payment late aaya to?</strong> Hold expire ho chuka aur seat kisi aur ki ho gayi, lekin paisa kat gaya. Isliye payment ka webhook upar wala conditional UPDATE chalata hai; 0 rows = automatic refund. Ye multi-step flow hai, jiski poori kahani <a href="#/pattern-multistep">Multi-step processes</a> mein hai.',
      '<strong>Hold kitna lamba?</strong> Chhota hold = abandon ki hui seats jaldi wapas, lekin dheere users ka payment beech mein kat sakta hai. Lamba = zyada seats "atki" dikhti hain. 5-15 minute common hai.',
    ]},
    { type: 'h3', text: 'Waiting room: bheed ko darwaze pe roko' },
    { type: 'p', html: `Locks aur holds ek seat pe jhagda suljhaate hain. Lekin jab 2 lakh log 8:00 pe aate hain aur seats sirf 500 hain, to asli problem ye hai ki <strong>2 lakh requests</strong> checkout service, DB aur payment gateway pe ek saath girti hain. Sab kuch slow, timeouts, retries, aur retry se aur load. Jitne logon ko seat milni hi nahi, wo bhi system ko gira rahe hain.` },
    { type: 'callout', tone: 'term', title: 'Virtual waiting room', html: `<strong>Ye kya hai:</strong> ek halka sa page/service jo checkout ke <em>aage</em> baithta hai. Har aane wale ko line mein ek number deta hai ("aap 18,402 number pe ho, ~2 minute"). Peeche ka system jitna jhel sakta hai (maan lo 200 users/second), utne hi log andar bheje jaate hain.<br><strong>Kyun chahiye:</strong> 2 lakh log, 500 seats. Jinhe seat milni hi nahi, wo bhi checkout aur DB ko gira rahe hain. Waiting room bheed ko CDN pe hi rok leta hai.<br><strong>Iske bina:</strong> sab slow, timeouts, log refresh karte hain aur load aur badhta hai.<br><strong>Example:</strong> ticketing aur badi sales mein ye common industry approach hai. CDN providers jaise Cloudflare aur Akamai, aur Queue-it jaisi services ye ready-made dete hain.` },
    { type: 'callout', tone: 'term', title: 'Admission token', html: `<strong>Ye kya hai:</strong> waiting room se baari aane pe mila ek signed (chhed-chhaad pakad lene wala) chhota sa pass: "Riya, 8:08 tak andar ja sakti hai".<br><strong>Kyun chahiye:</strong> checkout bina valid token ke request maanta hi nahi. Isliye koi line tod ke seedha checkout URL nahi khol sakta.<br><strong>Iske bina:</strong> waiting room sirf ek dikhawa: chalaak users aur bots seedha andar.` },
    { type: 'list', items: [
      '<strong>Halka kyun?</strong> Waiting room page static/CDN se serve hota hai aur status thodi thodi der mein poll karta hai. Ek "line mein ho" page dikhana checkout chalane se hazaar guna sasta.',
      '<strong>Fairness:</strong> 7:55 se aaye logon ko kaise order karein? Kai systems sale shuru hone se pehle aaye sab logon ko <em>random</em> order dete hain (taaki bots aur fast internet waale jeet na jaayein), aur baad mein aaye logon ko FIFO (jo pehle aaya, wo pehle).',
      '<strong>Bots:</strong> token ek user/device se bandha hota hai aur expire hota hai, taaki ek bot 1,000 tabs se line na tod sake. CAPTCHA, login aur per-user limit (ek account = 4 tickets) saath mein lagte hain (<a href="#/rate-limiting">Rate limiting</a>).',
      '<strong>Honesty:</strong> stock khatam ho jaaye to line mein khade sab logon ko turant batao. Ghanton line mein khade rakh ke "sold out" bolna sabse bura experience hai.',
    ]},
    { type: 'flow', height: 340,
      nodes: [
        { id: 'f', label: 'Fans', sub: '2 lakh, 8:00 PM', x: 85, y: 170, w: 130, kind: 'client', info: 'Ye kya hai: saare users jo meetup ki seat chahte hain (2 lakh log, 500 seats). Zyadatar ko seat nahi milegi; system ka kaam unhe jaldi aur imaandari se batana hai.' },
        { id: 'w', label: 'Waiting room', sub: 'CDN edge', x: 265, y: 170, w: 150, kind: 'edge', info: 'Ye kya hai: virtual waiting room, checkout ke aage ka halka darwaza. Line lagaata hai, position dikhata hai, aur ek fixed rate pe admission token deta hai. CDN/edge pe chalta hai taaki bheed origin tak na pahunche.' },
        { id: 'api', label: 'Checkout', sub: 'token check', x: 455, y: 170, w: 140, kind: 'server', meter: true, load: 30, info: 'Ye kya hai: checkout service. Sirf valid admission token wale requests maanta hai. Seat hold karta hai, payment shuru karta hai, aur payment webhook pe booking pakki karta hai.' },
        { id: 'r', label: 'Redis holds', sub: 'hold:A12 TTL 600s', x: 630, y: 70, w: 150, kind: 'cache', info: 'Ye kya hai: holds ka tez register, Redis mein. Har hold ek key: SET hold:seat user NX EX 600. NX = sirf agar pehle se na ho (ek seat, ek holder). EX = 10 minute baad khud gayab.' },
        { id: 'db', label: 'Seats DB', sub: 'status per seat', x: 630, y: 270, w: 150, kind: 'data', info: 'Ye kya hai: seats ka database, source of truth. Har seat ka status AVAILABLE / HELD / BOOKED, held_by, hold_until. Booking ka aakhri faisla yahan ek conditional UPDATE se hota hai.' },
        { id: 'pay', label: 'Payment', sub: 'gateway', x: 455, y: 295, w: 140, kind: 'net', info: 'Ye kya hai: bahar ka payment gateway (Razorpay/Stripe jaisa). Payment ka result webhook se checkout ko batata hai. Iska call kabhi bhi kisi lock ke andar nahi hota.' },
      ],
      edges: [{ a: 'f', b: 'w' }, { a: 'w', b: 'api' }, { a: 'api', b: 'r' }, { a: 'api', b: 'db' }, { a: 'api', b: 'pay' }],
      scenarios: [
        { name: 'Happy path', steps: [
          { title: 'Line mein number', text: 'Riya 8:00:01 pe aati hai. Waiting room use position deta hai. Checkout ko abhi kuch pata bhi nahi.', go: ['f>w', 'res:w>f'], after: { w: { sub: 'Riya: #18,402' } }, msg: 'GET /queue  →  { position: 18402, eta: "2 min" }' },
          { title: 'Baari aayi: token', text: 'Line 200 users/second ki speed se aage badhti hai. Riya ko signed admission token milta hai (kuch minute valid).', go: ['res:w>f'], msg: 'admit_token = sign(user=riya, exp=8:08)' },
          { title: 'Seat A12 hold', text: 'Checkout token check karta hai, phir Redis mein atomic hold aur DB mein HELD. 10 minute ka timer shuru.', go: ['f>w>api', 'api>r', 'res:r>api', 'api>db'], after: { r: { state: 'ok', sub: 'hold:A12 = riya' }, db: { sub: 'A12: HELD till 8:16' } }, msg: 'SET hold:A12 riya NX EX 600   → OK' },
          { title: 'Payment', text: 'Riya pay karti hai. Gateway webhook bhejta hai. Checkout conditional UPDATE chalata hai: "HELD by riya aur hold_until > now". 1 row = booking pakki.', go: ['api>pay', 'res:pay>api', 'api>db'], after: { db: { state: 'ok', sub: 'A12: BOOKED (riya)' } }, msg: 'UPDATE seats SET status=\'BOOKED\' WHERE id=\'A12\' AND held_by=riya AND hold_until > now()  → 1 row' },
        ]},
        { name: 'Hold expire', intro: 'Kabir ne seat hold ki, phir tab band kar diya.', steps: [
          { title: 'Kabir ka hold', text: 'Kabir ko A13 ka hold mila, 10 minute.', go: ['w>api>r', 'api>db'], after: { r: { sub: 'hold:A13 = kabir' }, db: { sub: 'A13: HELD' } } },
          { title: 'Kabir chala gaya', text: 'Payment page pe Kabir ne tab band kar diya. Koi "cancel" request nahi aayi. Bina expiry ke A13 hamesha ke liye atak jaati.', set: { f: { state: 'dim' } }, focus: ['r'] },
          { title: 'Das minute baad', text: 'Redis key TTL se khud gayab. DB ki row bhi <code>hold_until &lt; now()</code> ki wajah se ab "free" maani jaati hai.', set: { r: { state: 'warn', sub: 'hold:A13 expired' }, db: { sub: 'A13: free (expired)' } }, focus: ['r', 'db'] },
          { title: 'Line wale ko seat', text: 'Waiting room mein khade agle user ko token mila, aur use A13 mil gayi. Abandon hui seat bechi gayi, oversell nahi.', go: ['f>w>api>r', 'api>db'], after: { f: { state: '' }, r: { state: 'ok', sub: 'hold:A13 = meera' }, db: { sub: 'A13: HELD (meera)' } } },
        ]},
        { name: 'Late payment', intro: 'Hold expire ho gaya, lekin user ka payment ab aaya.', steps: [
          { title: 'Hold expire, seat kisi aur ki', text: 'Arjun ka hold 8:16 pe khatam hua, aur 8:17 pe A14 Meera ne hold kar li.', set: { db: { sub: 'A14: HELD (meera)' } }, focus: ['db'] },
          { title: 'Arjun ka webhook 8:18 pe', text: 'Gateway kehta hai Arjun ka payment ho gaya. Checkout conditional UPDATE chalata hai.', go: ['res:pay>api', 'api>db', 'bad:db>api'], msg: 'UPDATE ... WHERE id=\'A14\' AND held_by=arjun AND hold_until > now()  → 0 rows' },
          { title: 'Refund, oversell nahi', text: '0 rows = seat ab Arjun ki nahi. Checkout automatic refund shuru karta hai aur Arjun ko sach batata hai. Bina is check ke A14 do logon ko bik jaati.', go: 'api>pay', after: { pay: { state: 'warn', sub: 'refund arjun' }, api: { state: 'warn' } }, msg: 'POST /refunds { payment: arjun_8812 }' },
        ]},
        { name: 'Spike: room bachaata hai', intro: '2 lakh log ek minute mein.', steps: [
          { title: 'Bheed waiting room pe', text: 'Saari bheed CDN edge pe rukti hai. Ye static page aur chhote poll requests hain, CDN inhe aaraam se jhel leta hai.', flood: { paths: ['f>w'], n: 14 }, after: { w: { state: 'hot', sub: '2 lakh in line' } } },
          { title: 'Andar sirf 200/s', text: 'Checkout tak utne hi log aate hain jitne wo jhel sakta hai. Load meter normal rehta hai.', flood: { paths: ['w>api'], n: 4, gap: 300 }, after: { api: { load: 55, sub: 'steady 200/s' } } },
          { title: 'Sold out: sabko batao', text: '500 seats book ya hold ho gayi. Waiting room line mein khade baaki sab ko turant "sold out" dikhata hai, taaki wo bekaar intezaar na karein.', go: 'res:w>f', after: { w: { state: 'warn', sub: 'SOLD OUT shown' } } },
        ]},
      ],
    },
    { type: 'callout', tone: 'tip', title: 'Yahin ruk jao agar...', html: `...ye seedhi ka sabse ooncha danda hai. Isse upar sirf "aur zyada" hai: kai regions, bot detection, aur counters ko shard karna (tukdon mein baantna: har show/event ka alag counter). Waiting room tabhi lagao jab demand backend ki capacity se <strong>kai guna</strong> ho, aur sirf us event ke liye (baaki din "passthrough", yaani sabko seedha andar). Normal din pe waiting room bas latency badhata hai. Gehrai: <a href="#/rate-limiting">Rate limiting</a>, <a href="#/pattern-spikes">Traffic spikes</a>, <a href="#/pattern-multistep">Multi-step processes (payment ke baad)</a>, <a href="#/design-bookmyshow">BookMyShow design</a>.` },
    { type: 'h2', text: 'Simulator: 1,000 log, 10 seats (aur badi bheed)' },
    { type: 'p', html: `Ab paanchon dande (aur danda 0, "koi protection nahi") ek hi bheed pe chalao. Pehle preset <strong>"1,000 log, 10 seats"</strong> chunno, phir badi bheed wale presets. Har strategy pe click karo aur numbers dekho: kaun oversell karta hai, kaun line lagwata hai, kaun retries mein kaam barbaad karta hai.` },
    { type: 'custom', render(el) {
      function pcSim(mode, N, K) {
        let seed = 20240917;
        const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
        const D = 5, TO = 2000, ADMIT = 200, HOLD = 600;
        const arr = []; for (let i = 0; i < N; i++) arr.push(rnd() * 1000);
        arr.sort((a, b) => a - b);
        const r = { ok: 0, over: 0, retry: 0, err: 0, soldout: 0, lat: [], peak: 0, unit: 'ms', expired: 0 };
        const heap = [];
        const push = e => { heap.push(e); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p].t <= heap[i].t) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
        const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, rr = l + 1; let m = i; if (l < heap.length && heap[l].t < heap[m].t) m = l; if (rr < heap.length && heap[rr].t < heap[m].t) m = rr; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
        if (mode === 'none') {
          let stock = K, inflight = 0;
          arr.forEach((a, i) => push({ t: a, k: 'read', i }));
          const seen = [];
          while (heap.length) {
            const e = pop();
            if (e.k === 'read') {
              seen[e.i] = stock;
              if (stock > 0) { inflight++; r.peak = Math.max(r.peak, inflight); push({ t: e.t + D, k: 'write', i: e.i, a: arr[e.i] }); }
              else { r.soldout++; r.lat.push(1); }
            } else { inflight--; stock = seen[e.i] - 1; r.ok++; r.lat.push(e.t - e.a); }
          }
          r.over = Math.max(0, r.ok - K);
        } else if (mode === 'lock') {
          let stock = K, free = 0; const ends = [];
          arr.forEach(a => {
            const start = Math.max(a, free);
            if (start - a > TO) { r.err++; r.lat.push(TO); ends.push([a, a + TO]); return; }
            const hold = stock > 0 ? D : 1; const end = start + hold; free = end;
            if (stock > 0) { stock--; r.ok++; } else r.soldout++;
            r.lat.push(end - a); ends.push([a, end]);
          });
          const ev = []; ends.forEach(([s, e]) => { ev.push([s, 1]); ev.push([e, -1]); });
          ev.sort((x, y) => x[0] - y[0] || x[1] - y[1]); let c = 0; ev.forEach(x => { c += x[1]; r.peak = Math.max(r.peak, c); });
        } else if (mode === 'occ') {
          let stock = K, ver = 0, inflight = 0;
          arr.forEach((a, i) => push({ t: a, k: 'read', i, n: 0, a }));
          while (heap.length) {
            const e = pop();
            if (e.k === 'read') {
              if (stock <= 0) { r.soldout++; r.lat.push(e.t + 1 - e.a); continue; }
              inflight++; r.peak = Math.max(r.peak, inflight);
              push({ t: e.t + D, k: 'cas', i: e.i, n: e.n, a: e.a, v: ver });
            } else {
              inflight--;
              if (e.v === ver) { ver++; stock--; r.ok++; r.lat.push(e.t - e.a); }
              else if (e.n >= 4) { r.err++; r.lat.push(e.t - e.a); }
              else { r.retry++; const back = D * Math.pow(2, e.n) * (0.5 + rnd()); push({ t: e.t + back, k: 'read', i: e.i, n: e.n + 1, a: e.a }); }
            }
          }
        } else if (mode === 'atomic') {
          let stock = K, free = 0; const OP = 0.01;
          arr.forEach(a => {
            const start = Math.max(a + 0.5, free); free = start + OP;
            if (stock > 0) { stock--; r.ok++; } else r.soldout++;
            r.lat.push(free + 0.5 - a);
          });
          r.peak = 1;
        } else { // hold + waiting room, times in seconds
          r.unit = 's';
          let avail = K, wl = 0, fullAt = -1; const WL = Math.ceil(K * 0.3);
          arr.forEach((a, idx) => push({ t: idx / ADMIT + 1, k: 'admit', a: a / 1000 }));
          const give = t => { if (rnd() < 0.25) push({ t: t + HOLD, k: 'expire' }); else push({ t: t + 60 + rnd() * 240, k: 'pay' }); };
          while (heap.length) {
            const e = pop();
            if (e.k === 'admit') {
              if (fullAt >= 0) { r.soldout++; r.lat.push(fullAt + 0.5 - e.a); continue; }
              r.lat.push(e.t - e.a);
              if (avail > 0) { avail--; give(e.t); }
              else if (wl < WL) { wl++; if (wl === WL) fullAt = e.t; }
            } else if (e.k === 'pay') r.ok++;
            else { r.expired++; if (wl > 0) { wl--; give(e.t); } else avail++; }
          }
          r.soldout += wl;
          r.peak = Math.min(ADMIT, N);
        }
        r.lat.sort((a, b) => a - b);
        const q = p => r.lat.length ? r.lat[Math.min(r.lat.length - 1, Math.floor(p * r.lat.length))] : 0;
        r.p50 = q(0.5); r.p99 = q(0.99);
        delete r.lat;
        return r;
      }
      const pcNote = (m, r, N, K, left) => {
        const f = n => Math.round(n).toLocaleString('en-IN');
        if (m === 'none') return r.over ? `<strong>${f(r.over)} orders</strong> aise confirm hue jinka item (hoodie/seat) hai hi nahi. Jo bhi qty update hone se pehle padh leta hai, use purani value dikhti hai (lost update). Har oversell = refund + gussa fan.` : `Is baar oversell nahi hua, kyunki bheed kam thi. Bheed badhao aur dekho.`;
        if (m === 'lock') return r.err ? `Oversell 0, lekin row pe ek waqt mein ek hi transaction. Line itni lambi ki <strong>${f(r.err)} logon</strong> ko 2 s timeout pe error mila, aur peak pe ${f(r.peak)} requests DB connections pakde khadi thin. Sold-out check bhi lock ke liye line mein lagta hai.` : `Oversell 0. Daam: line. Aakhri logon ne ~${f(r.p99)} ms wait kiya, aur peak pe ${f(r.peak)} DB connections ek saath bandhe the.`;
        if (m === 'occ') return `Oversell 0, lekin CAS <strong>${f(r.retry)} baar</strong> haara aur retry hua; ${f(r.err)} log max retries ke baad haar gaye.` + (left ? ` Aur <strong>${f(left)} items bachi reh gayin</strong>: ek hot row pe har 5 ms mein sirf ek jeet sakta hai, baaki kaam barbaad.` : ` Conflict kam ho to ye sasta hai; bheed jitni zyada, barbaadi utni zyada.`);
        if (m === 'atomic') return `Exactly ${f(r.ok)} bike, oversell 0, aur sabko ~1 ms mein jawab. Sale ke dauraan DB ko ek bhi sync transaction nahi; jeetne walon ke orders queue se baad mein likhe jaate hain.`;
        return `${f(r.ok)} logon ne pay kiya. ${f(r.expired)} holds expire hue (log payment chhod gaye) aur wo items waitlist ke logon ko di gayin (jab tak waitlist mein koi tha).` + (left ? ` ${f(left)} items waitlist khatam hone ke baad wapas stock mein aayin.` : '') + ` Backend pe kabhi 200 users/s se zyada nahi, aur sabko ~${r.p99.toFixed(1)} s mein saaf jawab (hold, waitlist ya sold out).`;
      };
      const M = [['none', 'Koi protection nahi'], ['lock', 'Row lock'], ['occ', 'Optimistic + retry'], ['atomic', 'Atomic Redis'], ['hold', 'Hold + waiting room']];
      el.innerHTML = `<div class="pc-pre" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;align-items:center"><span style="font-size:13px;color:var(--ink-3)">Preset:</span></div>
        <div class="pc-modes" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px"></div>
        <div class="row2">
          <div><label>Log jo 1 second mein Buy dabaate hain: <strong class="pc-nv"></strong></label><input class="pc-n" type="range" min="200" max="10000" step="200" value="2000"></div>
          <div><label>Stock (hoodies / seats): <strong class="pc-kv"></strong></label><input class="pc-k" type="range" min="10" max="1000" step="10" value="100"></div>
        </div>
        <div style="margin-top:14px;font-size:13px;color:var(--ink-3)">Green = asli stock se bike, red = oversold (jo items hain hi nahi), khaali = unsold</div>
        <div style="position:relative;height:16px;background:var(--surface-2);border-radius:var(--r-sm);overflow:hidden;margin-top:4px">
          <div class="pc-bar" style="height:100%;background:var(--green);width:0"></div>
          <div class="pc-barx" style="position:absolute;top:0;height:100%;background:var(--red);width:0"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Confirmed orders</span><strong class="pc-ok"></strong></div>
          <div class="stat"><span>Oversold (fake orders)</span><strong class="pc-over"></strong></div>
          <div class="stat"><span>Conflicts / retries</span><strong class="pc-retry"></strong></div>
          <div class="stat"><span>Errors (timeout / gave up)</span><strong class="pc-err"></strong></div>
          <div class="stat"><span>Stock bacha (unsold)</span><strong class="pc-left"></strong></div>
          <div class="stat"><span>Jawab ka time p50 / p99</span><strong class="pc-lat"></strong></div>
          <div class="stat"><span>Backend pe peak load</span><strong class="pc-peak"></strong></div>
        </div>
        <div class="calc-note pc-note"></div>
        <div class="calc-note" style="font-size:13px;color:var(--ink-3)">Model: fans 1 second mein random (seeded, har baar same) aate hain. DB transaction 5 ms. Row lock: app timeout 2 s, sold-out check bhi 1 ms lock leta hai. Optimistic: max 4 retries, exponential backoff + jitter. Redis: 1 ms round trip. Waiting room: 200 users/s andar, 10 min hold, 25% log payment chhod dete hain, waitlist = stock ka 30%.</div>`;
      const $ = s => el.querySelector(s);
      let mode = 'none';
      const box = $('.pc-modes');
      M.forEach(([id, name]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = name; b.dataset.m = id; b.onclick = () => { mode = id; upd(); }; box.appendChild(b); });
      const PRE = [['1,000 log, 10 seats', 1000, 10], ['2,000 fans, 100 hoodies', 2000, 100], ['2,000 fans, 500 hoodies', 2000, 500], ['10,000 fans, 100 hoodies', 10000, 100]];
      const pre = $('.pc-pre');
      PRE.forEach(([name, n, k]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small ghost'; b.textContent = name; b.onclick = () => { $('.pc-n').value = n; $('.pc-k').value = k; upd(); }; pre.appendChild(b); });
      const fmt = n => Math.round(n).toLocaleString('en-IN');
      const t = (v, u) => u === 's' ? v.toFixed(1) + ' s' : (v < 10 ? v.toFixed(1) : fmt(v)) + ' ms';
      const upd = () => {
        const N = +$('.pc-n').value, K = +$('.pc-k').value;
        $('.pc-nv').textContent = fmt(N); $('.pc-kv').textContent = fmt(K);
        box.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.m === mode));
        const r = pcSim(mode, N, K);
        const sold = Math.min(r.ok, K), left = Math.max(0, K - r.ok);
        $('.pc-ok').textContent = fmt(r.ok);
        $('.pc-over').textContent = fmt(r.over);
        $('.pc-over').style.color = r.over ? 'var(--red)' : '';
        $('.pc-retry').textContent = fmt(r.retry);
        $('.pc-err').textContent = fmt(r.err);
        $('.pc-err').style.color = r.err ? 'var(--amber)' : '';
        $('.pc-left').textContent = fmt(left);
        $('.pc-lat').textContent = t(r.p50, r.unit) + ' / ' + t(r.p99, r.unit);
        $('.pc-peak').textContent = mode === 'atomic' ? '0 DB txns (Redis)' : mode === 'hold' ? fmt(r.peak) + ' users/s' : fmt(r.peak) + (mode === 'lock' ? ' DB conns' : ' DB txns');
        const tot = Math.max(K, r.ok);
        $('.pc-bar').style.width = (sold / tot * 100) + '%';
        $('.pc-barx').style.left = (sold / tot * 100) + '%'; $('.pc-barx').style.width = (r.over / tot * 100) + '%';
        $('.pc-note').innerHTML = pcNote(mode, r, N, K, left);
      };
      $('.pc-n').addEventListener('input', upd); $('.pc-k').addEventListener('input', upd); $('.pc-n').value = 1000; $('.pc-k').value = 10; upd();
    }},
    { type: 'p', html: `<strong>1,000 log, 10 seats</strong> pe: koi protection nahi = <strong>54 orders, yaani 44 seats oversold</strong>. Row lock = theek 10, aakhri log ~47 ms rukte hain, peak pe 50 DB connections. Optimistic = 10, lekin 94 CAS haare aur retry hue. Atomic Redis = 10, sabko ~1 ms. Hold + waiting room = 10 paid, 3 holds expire hoke line wale ko mile. Chhoti bheed mein row lock bhi theek chalta hai. Ab <strong>2,000 fans, 100 hoodies</strong> pe kya dikhta hai:` },
    { type: 'list', items: [
      '<strong>Koi protection nahi:</strong> 1,082 orders confirm, yaani <strong>982 oversold</strong>. Sabse fast (5 ms) aur sabse galat.',
      '<strong>Row lock:</strong> theek 100 bike, oversell 0. Lekin median user (beech wala, p50) ~0.9 s line mein, aur peak pe ~1,400 requests ek saath DB connection pakde baithi. 500 hoodies kar do: line 2 s timeout se lambi ho jaati hai aur 1,000 log error dekhte hain.',
      '<strong>Optimistic + retry:</strong> 100 bike, lekin 3,677 haare hue CAS aur 737 log jo retries ke baad haar gaye. 500 hoodies pe asli jhatka: sirf 217 bike, <strong>283 bachi reh gayin</strong> jabki 1,783 log error dekh ke chale gaye. Hot row pe optimistic galat tool hai.',
      '<strong>Atomic Redis:</strong> exactly 100, ~1 ms, DB ko sale ke dauraan chhua bhi nahi.',
      '<strong>Hold + waiting room:</strong> backend pe sirf 200 users/s, 33 abandon hue holds expire hoke waitlist ko mile, aur har fan ko ~2 s mein saaf jawab. Ye "buy = ek process" wale cases (seats, tickets) ka jawab hai.',
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "app server mein lock laga do"', html: `Java ka <code>synchronized</code> ya Python ka <code>threading.Lock</code> sirf <em>usi process</em> (ek chalta hua program) ke threads (us program ke andar ke kaam karne wale) ko rokta hai. xyz.com ke 20 checkout servers hain; Riya server 3 pe aur Kabir server 11 pe. Dono ke apne alag lock, dono jeet gaye. Contention ka faisla hamesha <strong>shared jagah</strong> pe hota hai: DB row, Redis key, ya lock service.` },
    { type: 'callout', tone: 'mistake', title: 'Ek aur confusion: "check karo, phir likho" do alag queries mein', html: `<code>if (redis.GET(stock) &gt; 0) redis.DECR(stock)</code> dikhne mein sahi hai, lekin GET aur DECR ke beech doosra client ghus sakta hai. Atomic matlab <strong>check aur write ek hi step</strong>: ek conditional UPDATE, ek Lua script, ya DECR ka result dekh ke faisla.` },

    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Decide: contention ka tool kaise chunein', html: `Pehla sawaal: <strong>kitni bheed ek hi cheez pe?</strong> Doosra: <strong>kharidna ek click hai ya ek process (payment, form)?</strong><br>• Conflict rare (profile edit, wiki, settings) → <strong>optimistic</strong> (danda 2: version / ETag).<br>• Conflict common, data ek DB mein, normal traffic (bank transfer, wallet) → <strong>row lock</strong> (danda 1) ya single conditional UPDATE.<br>• Ek hot counter pe flash-sale bheed → <strong>atomic Redis</strong> (danda 3: DECR / Lua), DB baad mein, aur DB mein safety net.<br>• User ko sochne/pay karne ka time chahiye (seats, tickets) → <strong>hold with expiry</strong> (danda 5).<br>• Demand supply se bahut zyada aur backend jhel nahi sakta → aage <strong>virtual waiting room</strong> (danda 5).<br>• Resource DB row nahi (external API, ek-hi-baar chalne wala job) → <strong>distributed lock + TTL + fencing</strong> (danda 4).` },
    { type: 'table', head: ['Tool', 'Oversell rokta hai?', 'Bheed mein', 'Kahan dikhta hai'], rows: [
      ['Row lock (FOR UPDATE)', 'Haan', 'Line lambi, connections bandhte hain', 'Bank/wallet, ek DB wala inventory'],
      ['Optimistic (version / CAS)', 'Haan', 'Retry ka toofan, kaam barbaad', 'Profile/doc edit, DynamoDB conditional write, HTTP If-Match'],
      ['Atomic Redis (DECR / Lua)', 'Haan (DB safety net ke saath)', 'Bahut tez, ~1 ms', 'Flash sale counter, likes, rate limits'],
      ['Distributed lock + TTL', 'Haan, fencing ke saath', 'Serial, ek extra hop', 'Ek-hi-worker jobs, external API'],
      ['Hold + expiry', 'Haan', 'Abandon hui cheez wapas aati hai', 'BookMyShow, IRCTC Tatkal, ticket sites'],
      ['Virtual waiting room', 'Khud nahi (bheed rokta hai)', 'Backend ko fixed rate', 'Concert tickets, badi sales'],
    ]},

    { type: 'h2', text: 'Poori picture' },
    { type: 'diagram', title: 'xyz.com pe contention ki seedhi: har danda kahan baitha hai', height: 540,
      groups: [
        { label: 'Darwaza', x: 14, y: 14, w: 156, h: 238 },
        { label: 'Async', x: 242, y: 290, w: 176, h: 236 },
      ],
      nodes: [
        { id: 'fans', label: 'Fans', sub: '2 lakh, 8:00 PM', x: 92, y: 72, w: 140, kind: 'client', info: 'Ye kya hai: xyz.com ke users jo ek hi cheez (hoodie, seat) chahte hain. Contention inhi ki bheed se shuru hoti hai.' },
        { id: 'wr', label: 'Waiting room', sub: 'CDN edge, danda 5', x: 92, y: 200, w: 140, kind: 'edge', info: 'Ye kya hai: virtual waiting room. Bheed ko line mein rakhta hai aur ~200 users/s ko admission token ke saath andar bhejta hai. Normal din pe passthrough.' },
        { id: 'api', label: 'Checkout API', sub: 'stateless servers', x: 330, y: 200, w: 160, kind: 'server', info: 'Ye kya hai: "Buy" sambhaalne wali service, kai servers pe. Khud koi lock nahi rakhti (servers alag hain); faisla hamesha shared jagah pe: Redis ya Postgres.' },
        { id: 'redis', label: 'Redis', sub: 'stock, holds, locks', x: 530, y: 72, w: 170, kind: 'cache', info: 'Ye kya hai: in-memory store. Teen kaam: atomic stock counter (danda 3: DECR / Lua), seat holds with TTL (danda 5: SET NX EX 600), aur distributed locks (danda 4: SET NX PX).' },
        { id: 'db', label: 'Postgres', sub: 'rows, version, seats', x: 530, y: 330, w: 170, kind: 'data', info: 'Ye kya hai: source of truth. Wallets pe row lock (danda 1), edits pe version check (danda 2), seats ka HELD/BOOKED status, aur flash sale ke baad aakhri safety net (WHERE qty > 0).' },
        { id: 'pay', label: 'Payment', sub: 'gateway + webhook', x: 92, y: 350, w: 140, kind: 'net', info: 'Ye kya hai: bahar ka payment gateway. Payment ka result webhook se aata hai. Ise kabhi lock ke andar call nahi karte.' },
        { id: 'q', label: 'Order queue', sub: 'winners only', x: 330, y: 340, w: 150, kind: 'queue', info: 'Ye kya hai: message queue. Redis ne jinhe "jeeta" bola, unke orders yahan line mein. DB pe sale ke pal ka load nahi padta.' },
        { id: 'ow', label: 'Order worker', sub: 'idempotent', x: 330, y: 470, w: 150, kind: 'server', info: 'Ye kya hai: queue se order utha ke DB mein likhne wala worker. Order id se dedupe karta hai, taaki retry pe duplicate order na bane.' },
        { id: 'job', label: 'Payout job', sub: '3 servers, 2 AM', x: 530, y: 470, w: 170, kind: 'server', info: 'Ye kya hai: raat ka creator payout job, 3 servers pe scheduled. Distributed lock (TTL + fencing token) se sirf ek hi chalta hai.' },
      ],
      edges: [
        { a: 'fans', b: 'wr', n: 1, label: 'line' },
        { a: 'wr', b: 'api', n: 2, label: 'token' },
        { a: 'api', b: 'redis', n: 3, label: 'DECR / hold' },
        { a: 'api', b: 'db', label: 'lock / version' },
        { a: 'api', b: 'pay', label: 'pay' },
        { a: 'api', b: 'q', n: 4 },
        { a: 'q', b: 'ow' },
        { a: 'ow', b: 'db', label: 'INSERT' },
        { a: 'job', b: 'redis', via: [[690, 470], [690, 72]], label: 'lock + TTL' },
        { a: 'job', b: 'db', label: 'token 34' },
      ],
      paths: [
        { name: 'Row lock', text: 'Danda 1: Checkout (ya wallet service) Postgres mein SELECT ... FOR UPDATE karta hai. Doosre line mein rukte hain. Normal traffic ke liye kaafi.', go: ['api>db'] },
        { name: 'Optimistic', text: 'Danda 2: bina taale padho, phir UPDATE ... WHERE version = 7. 0 rows = kisi ne badla, retry ya user ko batao.', go: ['api>db'] },
        { name: 'Atomic Redis', text: 'Danda 3: Redis Lua script ek step mein check + DECR (~1 ms). Jeetne wale queue se DB mein, worker idempotent.', go: ['fans>wr>api>redis', 'api>q>ow>db'] },
        { name: 'Lock + TTL', text: 'Danda 4: teen servers pe payout job; SET NX PX se ek ko lock milta hai. Har write ke saath fencing token, DB purana token reject karta hai.', go: ['job>redis', 'job>db'] },
        { name: 'Hold + waiting room', text: 'Danda 5: line, token, Redis mein 10 min hold, DB mein HELD, payment, phir webhook pe conditional UPDATE se BOOKED.', go: ['fans>wr>api>redis', 'api>pay', 'api>db'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Contention = bahut log, ek hi cheez, ek hi pal. Naive "padho, phir likho" = lost update = oversell.</li>
      <li>App server ke andar ka lock bekaar hai (servers alag). Faisla shared jagah pe: DB row, Redis key.</li>
      <li>Danda 1, row lock: sahi aur simple, lekin ek row pe ~1/(transaction time) speed aur DB connections ki line.</li>
      <li>Danda 2, optimistic (version / CAS): rare jhagde aur lambe edits ke liye. Hot row pe retries ka toofan.</li>
      <li>Danda 3, atomic Redis (DECR / Lua): hot counter ~1 ms mein. DB mein safety net aur reconcile zaroori.</li>
      <li>Danda 4, distributed lock + TTL: DB ke bahar ki cheez ke liye. TTL akela kaafi nahi; fencing token chahiye.</li>
      <li>Danda 5, hold + waiting room: payment jaise process ke liye time wala hold, aur bheed ko CDN pe line mein roko.</li>
      <li>Neeche se shuru karo; upar tabhi chadho jab neeche wala danda tumhari bheed mein toote.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['Oversell aur double booking khatam: ek item, ek kharidaar', 'Atomic Redis + queue se flash sale ~1 ms mein, DB bacha rehta hai', 'Holds se abandon hui seats apne aap wapas bikti hain', 'Waiting room se backend predictable load pe, aur users ko saaf jawab'],
      costs: ['Row locks: line, connection pool khatam hone ka khatra, deadlocks', 'Optimistic: hot row pe retries aur unsold stock', 'Redis counter: ek aur system, DB se reconcile karna padta hai', 'Holds: expiry, late payment, refund ka extra logic', 'Waiting room: extra infra, fairness aur bots ka sir dard'] },

    { type: 'think', questions: [
      { q: 'Online auction: ek painting pe aakhri 10 second mein 500 bids aati hain. Har bid tabhi valid hai jab wo current highest se zyada ho. Kaunsa tool?', a: 'Conditional write: <code>UPDATE auctions SET top_bid = 5200, top_bidder = 42 WHERE id = 7 AND top_bid &lt; 5200</code>. 1 row = tumhari bid jeeti, 0 rows = kisi ne zyada lagaya. Ye optimistic/CAS ka hi roop hai lekin retry ki zaroorat nahi: haari hui bid ko bas "outbid" bata do. Bahut zyada bheed ho to bids ko auction id se partition karke ek single writer (ya Redis Lua script) se serialize karte hain.' },
      { q: 'Redis counter ne 100 jeetne wale chun liye, lekin order likhne wala queue consumer 3 orders pe crash hota raha. Ab kya?', a: 'Redis ka faisla "reservation" hai, order nahi. Consumer idempotent hona chahiye (order_id se dedupe) aur retry kare; baar baar fail ho to DLQ mein jaaye aur alarm baje. Agar order kabhi nahi ban paaya, to us user ko batao aur stock wapas Redis mein INCR karo. Sale ke baad Redis count vs DB orders reconcile karo.' },
      { q: 'IRCTC Tatkal 10 baje khulta hai. Waiting room ke bina kya hoga, aur sirf rate limiting kyun kaafi nahi?', a: 'Bina waiting room ke saari bheed login, search aur booking pe ek saath girti hai; sab slow, timeouts, aur users refresh karke aur load badhaate hain. Rate limiting extra requests ko 429 se mana karti hai, lekin unfair hai (jiska request kismat se ghus gaya wo jeeta) aur users phir bhi retry karte rehte hain. Waiting room order deta hai, position dikhata hai, aur backend ko utna hi bhejta hai jitna wo jhel sake.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Do requests ne qty = 1 padha aur dono ne qty = 0 likha. Isko kya kehte hain?', options: ['Deadlock', 'Lost update (race condition)', 'Cache miss', 'Split brain'], answer: 1, explain: 'Dono ne purani value padh ke apni update likhi; ek ki update doosre ne mita di. Ye lost update hai, jo race condition ka ek type hai.' },
      { q: 'UPDATE items SET qty = 0, version = 8 WHERE id = 1 AND version = 7 ne 0 rows lautaye. Matlab?', options: ['Database down hai', 'Kisi ne beech mein row badal di; dobara padho aur retry karo', 'Item delete ho gaya, hamesha', 'Transaction deadlock mein hai'], answer: 1, explain: 'Optimistic concurrency: version match nahi hua, to koi aur pehle likh chuka hai. Taaza value padho aur faisla dobara lo.' },
      { q: '1 lakh fans, 500 hoodies, sab ek second mein. Sabse achha combo?', options: ['Har request pe SELECT FOR UPDATE', 'Optimistic retry with 10 retries', 'Atomic Redis counter (Lua/DECR) + order queue, aage waiting room', 'App server mein synchronized block'], answer: 2, explain: 'Hot counter pe atomic Redis tez aur sahi hai, orders queue se DB mein jaate hain, aur waiting room backend ko bheed se bachata hai. Row lock line lagata hai, optimistic retries mein doobta hai, aur app-level lock alag servers pe kaam hi nahi karta.' },
      { q: 'User ne seat hold ki, 10 minute baad hold expire hua, aur 11ve minute pe uska payment success webhook aaya. Sahi behaviour?', options: ['Seat use de do, chahe kisi aur ne le li ho', 'Conditional UPDATE (held_by = user AND hold_until > now) fail hoga; refund karo', 'Webhook ignore karo', 'Dono ko seat de do'], answer: 1, explain: 'Booking pakki karne wala UPDATE check karta hai ki hold abhi bhi usi user ka aur valid hai. 0 rows = seat ab uski nahi, to automatic refund aur saaf message.' },
      { q: 'Payout job ka Redis lock TTL 30 s hai. Worker A 40 s ke GC pause mein atak gaya. Kya hoga, aur kya bachata hai?', options: ['Kuch nahi, Redis A ka intezaar karega', 'TTL ke baad B ko lock milega; A jaag ke purani write bhejega. Fencing token (storage chhota token reject kare) bachata hai', 'Redis A ko crash kar dega', 'TTL badhane se problem hamesha ke liye khatam'], answer: 1, explain: 'TTL khatam hote hi key mit jaati hai aur B holder ban jaata hai. A ko pata nahi chalta. Storage agar sabse bada token yaad rakhe aur chhote token wali write reject kare, to A ki der se aayi write nuksaan nahi karti. TTL badhana sirf khidki chhoti karta hai, khatam nahi.' },
    ]},
    { type: 'sources', note: 'Version-specific defaults aur behaviour inhi docs se check kiye gaye.', items: [
      { title: 'Explicit Locking (row-level locks, FOR UPDATE, NOWAIT, SKIP LOCKED, deadlocks)', publisher: 'PostgreSQL documentation', official: true, url: 'https://www.postgresql.org/docs/current/explicit-locking.html', used: 'FOR UPDATE blocking behaviour, deadlock detection, lock ordering advice.' },
      { title: 'SELECT: The Locking Clause', publisher: 'PostgreSQL documentation', official: true, url: 'https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE', used: 'NOWAIT and SKIP LOCKED semantics.' },
      { title: 'InnoDB Locking Reads and innodb_lock_wait_timeout', publisher: 'MySQL 8.0 Reference Manual', official: true, url: 'https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html', used: 'FOR UPDATE in MySQL, NOWAIT/SKIP LOCKED in 8.0, default lock wait timeout 50 s.' },
      { title: 'Scripting with Lua (atomicity of scripts)', publisher: 'Redis documentation', official: true, url: 'https://redis.io/docs/latest/develop/interact/programmability/eval-intro/', used: 'Scripts run atomically and block other clients while running.' },
      { title: 'Distributed Locks with Redis', publisher: 'Redis documentation', official: true, url: 'https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/', used: 'SET key value NX PX 30000 se lock, random value se safe release, DELEX IFEQ (Redis 8.4+) ya Lua script.' },
      { title: 'Waiting Room: queueing methods and scheduled events', publisher: 'Cloudflare documentation', official: true, url: 'https://developers.cloudflare.com/waiting-room/reference/queueing-methods/', used: 'FIFO, random, passthrough aur reject queueing methods; event pre-queue aur "shuffle at event start" se fairness.' },
      { title: 'Condition expressions (conditional writes)', publisher: 'Amazon DynamoDB documentation', official: true, url: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html', used: 'Conditional put/update: write tabhi jab condition sach ho, warna ConditionalCheckFailed. Optimistic concurrency ka DynamoDB roop.' },
      { title: 'How to do distributed locking', publisher: 'Martin Kleppmann (blog)', url: 'https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html', year: 2016, used: 'TTL lock pitfalls and fencing tokens (recap from Coordination lesson).' },
    ]},
  ],
});
