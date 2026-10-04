Lesson.register({
  id: 'unique-ids',
  title: 'Unique ID generation',
  minutes: 32,
  summary: `Ek database ho to ID dena aasaan: 1, 2, 3. Data kai machines pe bikhar gaya to har nayi post, message aur order ko aisa ID chahiye jo kabhi takraaye nahi, jaldi bane, aur aksar time ke order mein sort ho. Is lesson mein: auto-increment, step offsets, Flickr ka ticket server, UUIDv4, UUIDv7/ULID, Twitter Snowflake (khud ID banao aur todo), Instagram ka variant, aur clock skew.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `xyz.com pe har post, har message, har like ko ek <strong>naam-number</strong> (ID) chahiye, jaise har student ka roll number.<br>Jab ek hi computer number deta tha, to 1, 2, 3 ginna aasaan tha.<br>Ab sainkdon computer ek saath posts bana rahe hain. Agar do computers ne ek hi number de diya, to do alag posts ek naam se ho jaayengi: gadbad.<br>Is lesson mein dekhenge ki bina ek doosre se poochhe, crores IDs kaise banayein jo kabhi na takraayein, aur aksar time ke order mein bhi hon.` },
    { type: 'h2', text: 'Problem: 1, 2, 3 ab kaam nahi karta' },
    { type: 'p', html: `Shuru mein xyz.com ka ek hi MySQL tha. <code>posts</code> table mein <code>id BIGINT AUTO_INCREMENT</code>. Database khud 1, 2, 3 ... deta tha. Koi soch hi nahi.` },
    { type: 'p', html: `Phir sharding lesson wala din aaya: posts 4 databases (shards) mein baant di. Har shard ka apna auto-increment hai. Shard A ki pehli post: id 1. Shard B ki pehli post: <strong>bhi id 1</strong>. Ab "post 1" kaunsi? Cache keys takraayengi, URLs takraayenge, Kafka events mein do alag posts same ID ke saath.` },
    { type: 'p', html: `Aur sirf takraav nahi. Feed dikhane ke liye posts ko "naye pehle" sort karna hai. Agar ID hi time ke hisaab se badhta ho, to <code>ORDER BY id DESC</code> kaafi hai, alag timestamp index ki zaroorat nahi. Isliye ID se humein kai cheezein chahiye:` },
    { type: 'table', head: ['Zaroorat', 'Kyun'], rows: [
      ['Unique (kabhi takraaye nahi)', 'Do posts same ID = data corruption'],
      ['Tez aur bina SPOF', 'Har post, like, message ko ID chahiye: lakhon per second. Ek central machine ruki to sab writes ruke'],
      ['Time se sortable (aksar)', 'Feeds, chats, "naye pehle" pagination: ID se hi order'],
      ['Chhota (64-bit ho to best)', 'Har table, har index, har foreign key mein ID hai. 8 bytes vs 16 bytes, arabon rows pe bada farak'],
      ['Guess na ho sake (kabhi kabhi)', 'Order #1041 dekh ke koi #1040 na khol le, competitor ginti na laga le'],
    ]},
    { type: 'callout', tone: 'term', title: '64-bit ID', html: `<strong>Ye kya hai:</strong> ek number jo 64 binary digits (bits) mein fit ho jaaye, yaani 8 bytes. Database mein ise <code>BIGINT</code> kehte hain. Sabse bada (signed) value lagbhag 9.2 × 10<sup>18</sup> hai.<br><strong>Kyun chahiye:</strong> ID har table, har index aur har foreign key mein baar baar likha jaata hai. 8 bytes ka ID 16 bytes wale se aadhi jagah leta hai, aur CPU ise ek hi baar mein compare kar leta hai.<br><strong>Iske bina:</strong> arabon rows pe indexes bade, RAM mein kam fit, queries slow.` },
    { type: 'callout', tone: 'term', title: 'Roughly sorted (k-sorted)', html: `<strong>Ye kya hai:</strong> IDs <em>lagbhag</em> time ke order mein hain. Do posts ek hi millisecond ke aas paas bani hon to unka order thoda upar neeche ho sakta hai, lekin 1 second pehle wali post ka ID hamesha chhota.<br><strong>Kyun chahiye:</strong> feed mein "naye pehle" dikhane ke liye bas <code>ORDER BY id DESC</code>. Alag timestamp index ki zaroorat nahi.<br><strong>Iske bina:</strong> har list ke liye alag time column aur alag index rakhna padta.` },
    { type: 'h2', text: 'Tareeka 1: database auto-increment' },
    { type: 'callout', tone: 'term', title: 'Auto-increment', html: `<strong>Ye kya hai:</strong> database ka apna counter. Har nayi row pe wo khud agla number de deta hai: 1, 2, 3...<br><strong>Kyun chahiye:</strong> ID ke baare mein sochna hi nahi padta. Number chhota hai, unique hai, aur badhta hua hai.<br><strong>Iske bina:</strong> app ko khud yaad rakhna padta ki "aakhri number kya tha", aur do requests ek saath aayein to dono same number utha lein.` },
    { type: 'p', html: `Ek database, ek counter. Sabse simple, aur chhote apps ke liye bilkul sahi jawab.<br><strong>Worked example:</strong> xyz.com pe Riya post karti hai: id 1041. Aman post karta hai: id 1042. Database ek ek karke deta hai, to takraav ho hi nahi sakta. Kamiyan tab dikhti hain jab scale badhta hai:` },
    { type: 'list', items: [
      `<strong>SPOF aur bottleneck:</strong> har insert ko ussi ek database se ID chahiye. Wo gira to koi kuch likh nahi sakta.`,
      `<strong>Shards pe unique nahi:</strong> har shard ka alag counter, alag 1, 2, 3.`,
      `<strong>Raaz kholta hai:</strong> <code>/orders/1041</code> dekh ke competitor samajh jaata hai tumhare kitne orders hain, aur koi <code>/orders/1040</code> try karke doosre ka order dekhne ki koshish karta hai (isliye authorization check hamesha zaroori hai).`,
    ]},

    { type: 'h2', text: 'Tareeka 2: multi-master, step offsets' },
    { type: 'callout', tone: 'term', title: 'Multi-master aur step offset', html: `<strong>Ye kya hai:</strong> <strong>multi-master</strong> = do ya zyada database servers jo dono writes lete hain. <strong>Step offset</strong> = har server ko ginti ki alag "lane" de do: sab ek jitna kadam (step) badhte hain, lekin alag number (offset) se shuru karte hain. Jaise ek stadium ke do gate: ek gate odd seat numbers deta hai, doosra even.<br><strong>Kyun chahiye:</strong> ek master gira to doosra IDs deta rahe, aur dono kabhi same number na dein.<br><strong>Iske bina:</strong> dono servers 1 se ginenge aur turant takraav.` },
    { type: 'p', html: `MySQL mein do settings: <code>auto_increment_increment = N</code> (har baar kitna badhao) aur <code>auto_increment_offset = i</code> (kahan se shuru).` },
    { type: 'ascii', text: `
N = 2 servers:   increment = 2

Server 1 (offset 1):  1, 3, 5, 7, 9 ...     (odd)
Server 2 (offset 2):  2, 4, 6, 8, 10 ...    (even)

Kabhi takraav nahi. Lekin...` },
    { type: 'list', items: [
      `<strong>Naya server jodna mushkil:</strong> N = 2 se N = 3 karna hai to sabki increment aur offset badalni hogi, aur purane numbers se takraav na ho iska dhyan. <em>Example:</em> Server 1 abhi 9 tak, Server 2 abhi 10 tak pahuncha. Naya plan: increment 3, offsets 1, 2, 3. Server 1 ka agla 10 hoga, lekin 10 Server 2 pehle hi de chuka! Isliye naye counters ko purane max (10) se upar se shuru karna padta hai: 13, 14, 15...`,
      `<strong>Time order nahi:</strong> Server 1 busy hai aur 9,001 tak pahunch gaya, Server 2 shaant hai aur 52 pe hai. Abhi bani post ka ID 54, kal wali ka 9,001. Sort by ID = galat feed.`,
    ]},

    { type: 'h2', text: 'Tareeka 3: ticket server (Flickr, 2010)' },
    { type: 'p', html: `Flickr ke saamne yahi problem thi: data sharded MySQL mein, aur IDs poore system mein unique chahiye. Unke engineering blog ki 2010 ki post ke mutabik unhone GUIDs (UUID jaise random IDs) isliye nahi liye kyunki wo bade hain aur MySQL mein unka index achha nahi banta (index RAM mein rakhna tha, to size bahut maayne rakhta tha). Hal: ek alag, chhota MySQL server jiska <strong>ek hi kaam</strong> hai IDs baantna. Isko <strong>ticket server</strong> kaha.` },
    { type: 'code', text: `
-- Ticket server pe ek table, sirf ek row
CREATE TABLE Tickets64 (
  id   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  stub CHAR(1) NOT NULL DEFAULT '',
  UNIQUE KEY stub (stub)
);

-- Naya ID chahiye:
REPLACE INTO Tickets64 (stub) VALUES ('a');   -- purani row hata ke nayi: id +1
SELECT LAST_INSERT_ID();                        -- ye mera naya ID` },
    { type: 'callout', tone: 'term', title: 'Ticket server', html: `<strong>Ye kya hai:</strong> ek chhota alag server jiska kaam sirf ek counter chalana hai. Jisko ID chahiye wo isse "ticket" (agla number) leta hai, jaise bank mein token machine.<br><strong>Kyun chahiye:</strong> data kai shards pe hai, lekin numbering ek jagah se, to poore system mein unique aur chhote 64-bit IDs.<br><strong>Iske bina:</strong> har shard apna 1, 2, 3 dega aur IDs takraayenge.` },
    { type: 'p', html: `<code>REPLACE</code> unique <code>stub</code> ki wajah se purani row delete karke nayi daalta hai, to table mein hamesha ek hi row rehti hai, aur auto-increment badhta jaata hai. SPOF se bachne ke liye Flickr ne <strong>do</strong> ticket servers chalaaye, upar wali step offset trick ke saath: ek odd numbers deta, ek even. Load dono mein baant diya.` },
    { type: 'list', items: [
      `<strong>Faayda:</strong> chhote 64-bit numeric IDs, lagbhag badhte hue, setup simple.`,
      `<strong>Nuksaan:</strong> har ID ke liye network call. Bahut zyada writes pe ticket server khud bottleneck. Do servers ho to bhi odd/even ka order milke time ke hisaab se exact nahi.`,
      `<strong>Common sudhaar:</strong> ek ek ID nahi, <strong>range</strong> maango (jaise 1,000 IDs ek baar mein). URL shortener lesson mein yahi kiya tha. Server crash = range ke kuch IDs bekaar, jo chalta hai.`,
    ]},
    { type: 'p', html: `<strong>Worked example (range):</strong> App server A ticket server se range maangta hai, milti hai 1001-2000. Server B ko milti hai 2001-3000. Ab A apne 1,000 IDs bina kisi network call ke deta hai. 1,000 IDs, sirf <strong>1 call</strong>. Lekin dekho: A ki 900th post (id 1900) B ki pehli post (id 2001) ke <em>baad</em> bani ho sakti hai, phir bhi uska ID chhota hai. Isliye order sirf "lagbhag".` },
    { type: 'callout', tone: 'term', title: 'Base62', html: `<strong>Ye kya hai:</strong> number likhne ka ek tareeka jisme 62 "digits" hain: 0-9, a-z, A-Z. Jaise decimal mein 10 digits hote hain.<br><strong>Kyun chahiye:</strong> chhote, URL mein chalne wale codes. 1041 base62 mein sirf <code>gN</code> hai (16 × 62 + 49 = 1041; g = 16, N = 49). 7 characters mein 62<sup>7</sup> ≈ 3.5 lakh crore codes aa jaate hain.<br><strong>Iske bina:</strong> link mein lamba number ya 36 character ka UUID: yaad rakhna aur share karna mushkil.` },
    { type: 'h2', text: 'Tareeka 4: UUIDv4 (random)' },
    { type: 'p', html: `Bilkul ulta soch: kisi se poochho hi mat. Har server khud ek bahut bada random number bana le. Itna bada ki do baar same aane ka chance lagbhag zero ho.` },
    { type: 'callout', tone: 'term', title: 'UUID', html: `<strong>Ye kya hai:</strong> UUID (Universally Unique Identifier) ek 128-bit number hai, aam taur pe aise likha jaata hai: <code>9f1c2b7e-4a3d-4e8b-b1f2-0c6d5e4a3b21</code> (36 characters). Iske kai "versions" hain. <strong>Version 4</strong> mein 128 mein se 122 bits random hote hain (baaki 6 bits batate hain "ye v4 hai"). UUIDs ka standard ab RFC 9562 (2024) hai, jisne purane RFC 4122 ki jagah li.<br><strong>Kyun chahiye:</strong> koi bhi machine, kabhi bhi, kisi se poochhe bina ID bana sake.<br><strong>Iske bina:</strong> har ID ke liye kisi central jagah se poochhna padta.` },
    { type: 'p', html: `Takraav ka chance kitna? 122 random bits mein ek bhi duplicate ka 50% chance tab aata hai jab lagbhag <strong>2.7 × 10<sup>18</sup></strong> UUIDs ban chuke hon (birthday problem ka hisaab). Ye itna bada hai ki asli systems mein takraav ki chinta random number generator ke kharab hone se hoti hai, maths se nahi. Slider khiska ke khud dekho:` },
    { type: 'custom', render(el) {
      const PRE = [['1 lakh', 1e5], ['1 crore', 1e7], ['1 arab (10^9)', 1e9], ['10^12', 1e12], ['10^15', 1e15], ['2.7 × 10^18', 2.7e18], ['10^19', 1e19]];
      el.innerHTML = `<label for="uiBd">Kitne UUIDv4 banaoge: <strong class="uiBdV"></strong></label>
        <input id="uiBd" type="range" min="0" max="${PRE.length - 1}" step="1" value="2">
        <div class="stats">
          <div class="stat"><span>Kam se kam ek duplicate ka chance</span><strong class="uiBdP"></strong></div>
          <div class="stat"><span>Matlab lagbhag</span><strong class="uiBdM"></strong></div>
        </div>
        <div class="calc-note uiBdN"></div>`;
      const q = s => el.querySelector(s);
      // Birthday approximation: p = 1 - e^(-n^2 / (2 * 2^122))
      const draw = () => {
        const [lab, n] = PRE[Number(q('#uiBd').value)];
        const x = (n * n) / (2 * Math.pow(2, 122));
        const p = -Math.expm1(-x);
        q('.uiBdV').textContent = lab;
        q('.uiBdP').textContent = p < 1e-3 ? p.toExponential(1) : (p * 100).toFixed(p > 0.99 ? 3 : 1) + '%';
        q('.uiBdM').textContent = p < 1e-3 ? `1 in ${Number((1 / p).toPrecision(2)).toExponential(1)}` : p > 0.99 ? 'lagbhag pakka' : `${Math.round(p * 100)} in 100`;
        q('.uiBdN').textContent = `Formula (birthday problem): p ≈ 1 − e^(−n² / 2·2^122), kyunki v4 mein 122 random bits hain. ` + (p < 1e-6 ? 'Itna chhota ki hardware ki galti ka chance isse zyada hai.' : p < 0.4 ? 'Ab dhyaan dene layak.' : 'Yahan aakar takraav ka asli khatra: ~50% tab, jab ~2.7 × 10^18 UUIDs ban chuke hon.');
      };
      q('#uiBd').addEventListener('input', draw);
      draw();
    }},
    { type: 'list', items: [
      `<strong>Faayda:</strong> koi coordination nahi, koi SPOF nahi. Mobile app offline bhi ID bana sakta hai.`,
      `<strong>Nuksaan 1, size:</strong> 16 bytes (string ho to 36). Har index, har foreign key mein double jagah.`,
      `<strong>Nuksaan 2, koi order nahi:</strong> ID se pata nahi chalta kaunsa pehle bana. Feeds ke liye alag <code>created_at</code> index chahiye.`,
      `<strong>Nuksaan 3, index pe maar:</strong> B-tree index (db-internals lesson) mein naye IDs har baar kahin bhi random jagah ghuste hain. Index ke alag alag pages baar baar disk se RAM mein aate hain aur page splits hote hain. Badhte hue IDs hamesha index ke aakhri hisse mein judte hain, jo RAM mein garam rehta hai.`,
    ]},

    { type: 'h2', text: 'Tareeka 5: UUIDv7 aur ULID (time-ordered)' },
    { type: 'p', html: `UUIDv4 ki sabse badi dikkat order thi. Ilaaj: ID ke <strong>shuru</strong> mein time daal do, baaki random. Ab IDs time ke saath badhte hain, aur phir bhi bina coordination ke bante hain.` },
    { type: 'callout', tone: 'term', title: 'UUIDv7', html: `<strong>Ye kya hai:</strong> UUID ka naya version (RFC 9562, 2024). Pehle 48 bits = Unix time milliseconds mein (1 Jan 1970 se), phir version number 7, phir random bits.<br><strong>Kyun chahiye:</strong> UUID jaisi aazaadi (koi coordination nahi) + time ka order + database index ke liye achha.<br><strong>Iske bina:</strong> ya to UUIDv4 (koi order nahi), ya Snowflake jaisa setup (machine IDs sambhalna).` },
    { type: 'callout', tone: 'term', title: 'ULID', html: `<strong>Ye kya hai:</strong> Universally Unique Lexicographically Sortable Identifier. UUIDv7 se pehle community ne banaya tha: 48 bits ms + 80 bits random, likha jaata hai 26 characters mein (Crockford base32: 0-9 aur A-Z, bina I, L, O, U ke, taaki padhne mein galti na ho).<br><strong>Kyun chahiye:</strong> wahi faayda, aur string chhoti, URL mein aasaan, text ki tarah sort karo to bhi time order.<br><strong>Iske bina:</strong> 36 character ka UUID string, jisme v4 ho to koi order nahi.` },
    { type: 'ascii', text: `
UUIDv7 (RFC 9562, May 2024), 128 bits:

| unix_ts_ms: 48 bits | ver: 4 | rand_a: 12 | var: 2 | rand_b: 62 |
  milliseconds 1970 se   "7"     random      "10"     random

ULID (community spec), 128 bits:
| timestamp ms: 48 bits | randomness: 80 bits |
  likha jaata hai 26 characters mein (Crockford base32):  01KF0K8Y5V...` },
    { type: 'p', html: `<strong>Worked example:</strong> post bani 15 Jan 2026, 10:30:00.123 UTC. Unix ms = <code>1768473000123</code>. Hex mein ye <code>019bc13478bb</code> hai (12 hex digits = 48 bits). To UUIDv7 shuru hoga <code>019bc134-78bb-7...</code> se: pehle 12 hex digits time, phir "7" version. ULID mein yahi time base32 mein <code>01KF0K8Y5V</code> (pehle 10 characters), phir 16 random characters. 1 ms baad bani post ka time hissa <code>...78bc</code>: bada, to sort karne pe baad mein aayegi.` },
    { type: 'list', items: [
      `<strong>Sortable:</strong> pehle 48 bits time hain, to sort karne pe time ka order. RFC 9562 khud kehta hai ki jahan ho sake v1/v6 ki jagah v7 use karo, aur time-ordered IDs database index ke liye kaafi behtar hain kyunki naye values index mein paas paas aate hain.`,
      `<strong>Ek millisecond mein kai IDs?</strong> RFC 9562 tareeke batata hai, jaise random hisse mein ek counter rakhna, taaki same ms ke IDs bhi badhte order mein rahein. ULID spec bhi same ms mein random hissa +1 karta hai.`,
      `<strong>Abhi bhi 128 bits:</strong> size wahi 16 bytes. Aur ID se creation time padha ja sakta hai (kabhi kabhi ye privacy ka sawaal hai).`,
      `<strong>UUID vs ULID:</strong> dono ka idea same. UUIDv7 official standard hai aur UUID column/libraries mein seedha fit. ULID ki string chhoti aur padhne mein aasaan.`,
    ]},
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "UUID to secret hai, URL mein daal do"', html: `UUIDv4 guess karna mushkil hai, lekin wo <strong>password nahi</strong> hai. Ek baar link share hua (logs, browser history, screenshot) to koi bhi khol sakta hai. Aur UUIDv7 / ULID mein to aadha hissa time hai, random kam. "Jiske paas link, wo dekh le" chahiye to alag random secret token rakho; warna har request pe authorization check karo.` },
    { type: 'h2', text: 'Tareeka 6: Twitter Snowflake (64-bit, time-ordered)' },
    { type: 'p', html: `2010 mein Twitter MySQL se Cassandra pe ja raha tha, aur Cassandra mein auto-increment jaisa kuch nahi. Unki "Announcing Snowflake" post ke mutabik zaroorat thi: <strong>har second hazaaron IDs</strong>, highly available (isliye machines ke beech koi coordination nahi), <strong>roughly sortable</strong> (paas paas time ke tweets ke IDs paas paas; README ke mutabik order ka vaada 1 second ke andar ka tha, aur koshish das-das milliseconds ki), aur sab kuch <strong>64 bits</strong> mein. UUID 128 bits ka tha, isliye nahi chala. Unhone banaya Snowflake.` },
    { type: 'callout', tone: 'term', title: 'Snowflake ID', html: `<strong>Ye kya hai:</strong> ek 64-bit number jo teen hisson ko jod ke banta hai: <strong>abhi ka time</strong> + <strong>kis machine ne banaya</strong> + <strong>us millisecond mein kaunsa number</strong>. Jaise "date + counter number + token number".<br><strong>Kyun chahiye:</strong> har machine khud, bina kisi se poochhe, unique aur time-sorted 64-bit IDs bana sake, lakhon per second.<br><strong>Iske bina:</strong> ya central counter (SPOF, network call), ya 128-bit UUID (double size).` },
    { type: 'ascii', text: `
Snowflake ID = 64 bits

| 0 |   timestamp: 41 bits    | machine: 10 bits | sequence: 12 bits |
  ^     ms, custom epoch se      datacenter 5        same ms mein
  sign bit (hamesha 0)           + worker 5          0, 1, 2 ... 4095

id = (ms_since_epoch << 22) | (machine << 12) | sequence` },
    { type: 'list', items: [
      `<strong>1 sign bit:</strong> hamesha 0, taaki number positive rahe (Java ka <code>long</code>, SQL ka <code>BIGINT</code> signed hote hain).`,
      `<strong>41 bits timestamp:</strong> milliseconds, lekin 1970 se nahi, ek <strong>custom epoch</strong> se. 2<sup>41</sup> ms ≈ <strong>69.7 saal</strong>. Twitter ka epoch 1288834974657 ms hai, yaani 4 Nov 2010; ye IDs ~2080 tak chalenge. 1970 se ginte to 40 saal pehle hi barbaad ho jaate.`,
      `<strong>10 bits machine:</strong> 1,024 generators tak. Twitter ke code mein 5 bits datacenter + 5 bits worker. Har machine ka number alag hona chahiye, warna do machines same ID bana sakti hain.`,
      `<strong>12 bits sequence:</strong> ek machine ek millisecond mein 4,096 IDs tak. Matlab ek machine se ~40 lakh IDs per second. Ek ms mein 4,096 khatam? Agle millisecond tak ruko.`,
    ]},
    { type: 'callout', tone: 'term', title: 'Epoch', html: `<strong>Ye kya hai:</strong> wo pal jahan se ginti shuru hoti hai, "time ka zero". Unix epoch 1 Jan 1970 hai. Snowflake apna <strong>custom epoch</strong> chunta hai (jaise system launch ka din).<br><strong>Kyun chahiye:</strong> 41 bits mein sirf ~69.7 saal aate hain. 1970 se ginte to 2026 tak 56 saal pehle hi kharch.<br><strong>Iske bina:</strong> IDs bas kuch saal mein khatam.` },
    { type: 'callout', tone: 'term', title: 'Bit shift aur OR', html: `<strong>Ye kya hai:</strong> <code>&lt;&lt; 22</code> (bit shift) matlab number ko 22 binary jagah baayein khiskaana, jaise decimal mein 5 ke peeche teen zero lagao to 5000. Daayein 22 bits khaali ho jaate hain. <code>|</code> (OR) un khaali jagahon mein machine aur sequence bhar deta hai.<br><strong>Kyun chahiye:</strong> teen chhote numbers ko ek 64-bit number mein pack karna, aur baad mein waapas nikaalna (shift + mask).<br><strong>Iske bina:</strong> teen alag columns rakhne padte.<br><strong>Example:</strong> time = 5, machine = 1, sequence = 2 → (5 &lt;&lt; 22) | (1 &lt;&lt; 12) | 2 = 20,971,520 + 4,096 + 2 = <strong>20,975,618</strong>.` },
    { type: 'p', html: `Sabse badi baat: ID banane ke liye <strong>network call nahi</strong>. Har app server ke andar ek chhota generator: ghadi dekho, apna machine number lagao, counter badhao. Microseconds ka kaam. Aur kyunki timestamp sabse upar ke bits mein hai, bade ID ka matlab baad mein bana. Neeche khud ek ID banao, uske bits dekho, aur kisi ID ko tod ke wapas padho:` },
    { type: 'custom', render(el) {
      const LAY = { snow: { name: 'Twitter Snowflake (41 / 10 / 12)', t: 41, m: 10, s: 12, ml: 'Machine ID' }, insta: { name: 'Instagram (41 / 13 / 10)', t: 41, m: 13, s: 10, ml: 'Logical shard ID' } };
      const EP = { tw: ['Twitter epoch (4 Nov 2010)', 1288834974657n], ig: ['Instagram epoch (Aug 2011)', 1314220021721n], c24: ['Custom: 1 Jan 2024', 1704067200000n], unix: ['Unix epoch (1970)', 0n] };
      let lay = 'snow';
      el.innerHTML = `<div class="uiLay" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="row2" style="margin-top:12px">
          <div><label for="uiEp">Epoch</label><select id="uiEp">${Object.entries(EP).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select></div>
          <div><label for="uiTs">Time (UTC, ms tak)</label><input id="uiTs" type="text" value="2026-01-15T10:30:00.123Z" style="font-family:var(--f-mono)"></div>
          <div><label for="uiM" class="uiML"></label><input id="uiM" type="number" min="0" step="1" value="37"></div>
          <div><label for="uiS">Sequence (is ms mein kaunsa ID)</label><input id="uiS" type="number" min="0" step="1" value="5"></div>
        </div>
        <button type="button" class="btn small ghost uiNow" style="margin-top:10px">Abhi ka time lo</button>
        <div class="uiBits" style="margin-top:14px;font:13px/1.9 var(--f-mono);word-break:break-all;background:var(--surface-2);border-radius:var(--r-sm);padding:10px 12px"></div>
        <div class="uiLeg" style="display:flex;flex-wrap:wrap;gap:12px;font-size:13px;margin-top:6px;color:var(--ink-2)"></div>
        <div class="stats">
          <div class="stat"><span>ID (decimal)</span><strong class="uiDec" style="font-size:17px;word-break:break-all"></strong></div>
          <div class="stat"><span>Hex</span><strong class="uiHex" style="font-size:17px;word-break:break-all"></strong></div>
        </div>
        <div class="calc-note uiNote"></div>
        <h4 style="margin:22px 0 6px;font-family:var(--f-display)">Decode: ID ko wapas todo</h4>
        <label for="uiD">Koi bhi ID (decimal)</label><input id="uiD" type="text" inputmode="numeric" style="font-family:var(--f-mono)">
        <button type="button" class="btn small uiCopy" style="margin-top:8px">Upar wala ID yahan daalo</button>
        <div class="stats">
          <div class="stat"><span>Bana kab (UTC)</span><strong class="uiDT" style="font-size:16px;word-break:break-all"></strong></div>
          <div class="stat"><span class="uiDML"></span><strong class="uiDM"></strong></div>
          <div class="stat"><span>Sequence</span><strong class="uiDS"></strong></div>
        </div>
        <div class="calc-note uiDN"></div>`;
      const q = s => el.querySelector(s);
      const fmt = b => b.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      let lastId = null;
      const build = () => {
        const L = LAY[lay], ep = EP[q('#uiEp').value][1];
        const mMax = (1 << L.m) - 1, sMax = (1 << L.s) - 1;
        q('.uiML').textContent = `${L.ml} (0 - ${mMax})`;
        q('#uiM').max = mMax; q('#uiS').max = sMax;
        const ms = Date.parse(q('#uiTs').value);
        const m = Math.floor(Number(q('#uiM').value)), s = Math.floor(Number(q('#uiS').value));
        const err = isNaN(ms) ? 'Time samajh nahi aaya. Aise likho: 2026-01-15T10:30:00.123Z'
          : !(m >= 0 && m <= mMax) ? `${L.ml} 0 se ${mMax} ke beech hona chahiye (${L.m} bits).`
          : !(s >= 0 && s <= sMax) ? `Sequence 0 se ${sMax} ke beech (${L.s} bits). ${sMax + 1} pe pahunche to generator agle millisecond ka wait karta hai.`
          : BigInt(ms) < ep ? 'Ye time epoch se pehle ka hai: timestamp negative ho jaayega. Snowflake epoch se pehle ke IDs nahi bana sakta.'
          : BigInt(ms) - ep >= (1n << 41n) ? '41 bits khatam! Epoch se ~69.7 saal baad ka time 41 bits mein fit nahi hota.' : '';
        if (err) { q('.uiNote').textContent = err; q('.uiDec').textContent = '-'; q('.uiHex').textContent = '-'; q('.uiBits').textContent = '-'; lastId = null; return; }
        const t = BigInt(ms) - ep, sh = BigInt(L.m + L.s);
        const id = (t << sh) | (BigInt(m) << BigInt(L.s)) | BigInt(s);
        lastId = id;
        const bin = id.toString(2).padStart(64, '0');
        const seg = [[0, 1, 'var(--ink-3)'], [1, 1 + L.t, 'var(--accent)'], [1 + L.t, 1 + L.t + L.m, 'var(--violet)'], [64 - L.s, 64, 'var(--amber)']];
        q('.uiBits').innerHTML = seg.map(([a, b, c]) => `<span style="color:${c};font-weight:700">${bin.slice(a, b)}</span>`).join('<span style="color:var(--line-2)">|</span>');
        q('.uiLeg').innerHTML = `<span style="color:var(--ink-3)">■ sign 1</span><span style="color:var(--accent)">■ timestamp ${L.t}</span><span style="color:var(--violet)">■ ${L.ml.toLowerCase()} ${L.m}</span><span style="color:var(--amber)">■ sequence ${L.s}</span>`;
        q('.uiDec').textContent = fmt(id);
        q('.uiHex').textContent = '0x' + id.toString(16);
        const next = ((t + 1n) << sh) | (BigInt(m) << BigInt(L.s));
        const dcw = lay === 'snow' ? ` Snowflake mein machine ${m} = datacenter ${m >> 5}, worker ${m & 31}.` : '';
        q('.uiNote').textContent = `Timestamp hissa = ${fmt(t)} ms epoch se. 1 ms baad, kisi bhi machine pe, sequence 0 ke saath bhi ID kam se kam ${fmt(next)} hoga: bada. Isliye ID se sort = time se sort.${dcw}`;
      };
      const decode = () => {
        const L = LAY[lay], ep = EP[q('#uiEp').value][1];
        q('.uiDML').textContent = L.ml;
        const raw = q('#uiD').value.replace(/[^0-9]/g, '');
        if (!raw) { ['.uiDT', '.uiDM', '.uiDS'].forEach(c => q(c).textContent = '-'); q('.uiDN').textContent = 'Ek ID daalo (sirf digits).'; return; }
        const id = BigInt(raw);
        if (id >= (1n << 63n)) { ['.uiDT', '.uiDM', '.uiDS'].forEach(c => q(c).textContent = '-'); q('.uiDN').textContent = 'Ye 63 bits se bada hai: sign bit 1 ho jaayega, ye valid Snowflake ID nahi.'; return; }
        const sh = BigInt(L.m + L.s);
        const t = id >> sh, m = (id >> BigInt(L.s)) & ((1n << BigInt(L.m)) - 1n), s = id & ((1n << BigInt(L.s)) - 1n);
        q('.uiDT').textContent = new Date(Number(t + ep)).toISOString();
        q('.uiDM').textContent = m.toString();
        q('.uiDS').textContent = s.toString();
        q('.uiDN').textContent = `Bas shift aur mask: time = id >> ${L.m + L.s}, phir + epoch. Koi database lookup nahi. Dhyaan: decode tabhi sahi hai jab layout aur epoch wahi ho jo ID banate waqt tha.`;
      };
      const drawLay = () => {
        const box = q('.uiLay'); box.innerHTML = '';
        Object.keys(LAY).forEach(k => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small' + (k === lay ? ' primary' : ''); b.textContent = LAY[k].name; b.onclick = () => { lay = k; q('#uiEp').value = k === 'insta' ? 'ig' : 'tw'; drawLay(); build(); decode(); }; box.appendChild(b); });
      };
      ['#uiTs', '#uiM', '#uiS'].forEach(s => q(s).addEventListener('input', build));
      q('#uiEp').addEventListener('change', () => { build(); decode(); });
      q('#uiD').addEventListener('input', decode);
      q('.uiNow').onclick = () => { q('#uiTs').value = new Date().toISOString(); build(); };
      q('.uiCopy').onclick = () => { if (lastId !== null) { q('#uiD').value = lastId.toString(); decode(); } };
      drawLay(); build();
      q('#uiD').value = lastId.toString(); decode();
    }},
    { type: 'h2', text: 'Instagram ka variant: ID database ke andar hi' },
    { type: 'callout', tone: 'term', title: 'Logical shard', html: `<strong>Ye kya hai:</strong> data ke hazaaron chhote "virtual" hisse, jo kuch hi asli (physical) database servers pe baante jaate hain. Jaise 2,000 folders jo 4 almaariyon mein rakhe hain.<br><strong>Kyun chahiye:</strong> server badhane pe sirf kuch folders nayi almaari mein shift karo, data ko dobara hash nahi karna padta.<br><strong>Iske bina:</strong> server badhao to lagbhag saara data idhar udhar (sharding lesson).` },
    { type: 'p', html: `Instagram ke engineering blog ki post "Sharding & IDs at Instagram" (2011) ne Snowflake jaisa hi idea liya, lekin ek alag service chalaane ki jagah ID <strong>Postgres ke andar</strong> banaya. Unka data hazaaron <strong>logical shards</strong> mein baanta tha, jo code mein kuch hi physical database servers pe map hote the. Har logical shard ek Postgres <em>schema</em> tha.` },
    { type: 'ascii', text: `
Instagram ID = 64 bits
| timestamp: 41 bits | logical shard ID: 13 bits | sequence: 10 bits |
  ms, custom epoch se    0 - 8191                    table ki sequence % 1024

Post ka example: user 31341 ka data, 2000 logical shards
  shard = 31341 % 2000 = 1341
  har shard har millisecond 1024 IDs tak` },
    { type: 'list', items: [
      `<strong>Kaise:</strong> har schema mein ek PL/pgSQL function (Postgres ke andar chalne wala code). Insert pe wo current time, apne shard ka number aur table ki auto-increment sequence ka <code>% 1024</code> jod ke ID bana deta hai.`,
      `<strong>Machine ki jagah shard:</strong> Snowflake mein beech ke bits "kaunsi machine ne banaya" batate hain. Yahan "kaunse shard mein hai" batate hain. Bonus: ID dekh ke hi pata chal jaata hai data kis shard pe hai, alag lookup nahi.`,
      `<strong>Kya bacha:</strong> koi naya ID service ya coordination system nahi chalana pada. Keemat: sequence sirf 10 bits, yaani ek shard ek ms mein 1,024 IDs tak.`,
    ]},
    { type: 'p', html: `Upar wale widget mein "Instagram" layout chuno aur dekho bits kaise khisakte hain. Discord jaise aur systems bhi Snowflake ke apne variants use karte hain, alag epoch aur alag bit split ke saath. Pattern ek hi hai: <strong>time | kaun | counter</strong>.` },

    { type: 'h2', text: 'Clock skew: jab ghadi hi jhooth bole' },
    { type: 'p', html: `Snowflake ka poora bharosa machine ki ghadi pe hai. Lekin server ki ghadiyan perfect nahi chalti. Thoda aage peeche hoti rehti hain (<strong>clock drift</strong>), aur NTP unhe theek karta hai. Kabhi kabhi theek karna matlab ghadi ko <strong>peeche</strong> karna.` },
    { type: 'callout', tone: 'term', title: 'NTP', html: `<strong>Ye kya hai:</strong> Network Time Protocol. Har machine thodi thodi der mein ek reference time server se apni ghadi milaati hai.<br><strong>Kyun chahiye:</strong> computer ki ghadi (ek chhota crystal) roz kuch milliseconds aage peeche ho jaati hai (<strong>clock drift</strong>).<br><strong>Iske bina:</strong> hafton mein machines ki ghadiyan seconds alag, aur time-based IDs ka order bekaar.` },
    { type: 'callout', tone: 'term', title: 'Clock skew', html: `<strong>Ye kya hai:</strong> do machines ki ghadiyon ka farak, ya ek machine ki ghadi ka sach se farak.<br><strong>Snowflake ke liye do khatre:</strong> (1) NTP ne ghadi <em>peeche</em> ki to wahi milliseconds dobara aayenge, aur same sequence = <strong>duplicate ID</strong>. (2) Machine A ki ghadi 50 ms aage hai to uske IDs B ke baad wale IDs se bade dikhenge: order sirf "lagbhag" sahi.<br><strong>Iske bina (dhyaan na do to):</strong> chupchaap duplicates ya ulta order.` },
    { type: 'image', src: 'assets/img/unique-ids/nist-f1-atomic-clock.jpg', maxWidth: 320, alt: 'NIST-F1 atomic clock: ek lamba metal ka dhaancha, neeche lasers aur optics ki mez', caption: 'NIST-F1, America ki ek atomic clock (1999). Aisi ghadiyan duniya ka "sahi time" rakhti hain. NTP servers ka time aakhir mein inhi jaisi reference clocks se aata hai, aur tumhare servers NTP se ghadi milaate hain. Phir bhi network delay ki wajah se har server thoda alag rehta hai: yahi clock skew.', credit: { text: 'NIST, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Nist-f1.jpg', license: 'Public domain' } },
    { type: 'flow', height: 360,
      nodes: [
        { id: 'a', label: 'App server A', sub: 'generator, m = 7', x: 360, y: 50, w: 160, kind: 'server', info: 'Ye kya hai: xyz.com ka ek app server. Iske andar Snowflake generator chal raha hai. Memory mein yaad rakhta hai: last_timestamp aur sequence.' },
        { id: 'b', label: 'App server B', sub: 'generator, m = 8', x: 360, y: 310, w: 160, kind: 'server', info: 'Ye kya hai: doosra app server, apne generator ke saath. Machine ID alag hona hi chahiye, warna dono same ID bana sakte hain.' },
        { id: 'zk', label: 'etcd / ZooKeeper', sub: 'machine ID lease', x: 110, y: 180, w: 170, kind: 'net', info: 'Ye kya hai: ek chhota, bahut reliable coordination store (key-value). Startup pe har generator yahan se ek machine ID "lease" leta hai (jab tak zinda hai, wo number sirf uska). Har ID ke liye yahan nahi aana padta, sirf startup pe. (Twitter ke Snowflake README mein machine ID bas "configured" bataya gaya hai; lease lene ka tareeka aaj ka general industry approach hai taaki do machines ko galti se same number na mile.)' },
        { id: 'ntp', label: 'NTP server', sub: 'sahi time', x: 610, y: 180, w: 150, kind: 'net', info: 'Ye kya hai: time batane wala server (reference). Machines thodi thodi der mein apni ghadi isse milaati hain. Snowflake README bhi NTP chalaane ko kehta hai.' },
        { id: 'db', label: 'Posts DB', sub: 'id PRIMARY KEY', x: 360, y: 180, w: 160, kind: 'data', info: 'Ye kya hai: posts ka database. ID primary key hai, to duplicate ID insert hote hi error. Ye aakhri suraksha hai, pehli nahi.' },
      ],
      edges: [{ a: 'a', b: 'zk' }, { a: 'b', b: 'zk' }, { a: 'a', b: 'ntp' }, { a: 'b', b: 'ntp' }, { a: 'a', b: 'db' }, { a: 'b', b: 'db' }],
      scenarios: [
        { name: 'Normal', steps: [
          { title: 'Startup: machine ID lo', text: 'Server A ne lease liya: machine 7. B ko 8 mila.', parallel: true, go: ['a>zk', 'res:zk>a', 'b>zk', 'res:zk>b'], msg: 'lease /snowflake/workers/7 → server A' },
          { title: 'Ghadi sync', text: 'NTP se time mila liya.', go: ['a>ntp', 'res:ntp>a'] },
          { title: 'ID locally, bina network call', text: 'Ghadi + machine 7 + sequence. Microseconds mein.', focus: ['a'], after: { a: { sub: 'last_ts = t, seq = 0' } }, msg: 'id = (t - epoch) << 22 | 7 << 12 | 0' },
          { title: 'Insert', text: 'Post apne ID ke saath DB mein.', go: ['a>db', 'res:db>a'] },
        ]},
        { name: 'Ghadi peeche gayi', steps: [
          { title: 'Abhi abhi ID bana', text: 'last_timestamp = 10:30:00.105 yaad hai.', focus: ['a'], set: { a: { sub: 'last_ts = .105' } } },
          { title: 'NTP ne ghadi 5 ms peeche ki', text: 'Ab A ki ghadi 10:30:00.100 bata rahi hai. Agar generator aankh band karke chale to .100 se .105 wale milliseconds dobara aayenge, aur same sequence numbers: duplicate IDs.', go: ['ntp>a'], after: { a: { state: 'warn', sub: 'now .100 < last .105' } } },
          { title: 'Generator mana karta hai', text: 'Check: now < last_timestamp? To ID mat do. Twitter ke Snowflake code ka README yahi batata hai: ghadi last ID ke time se aage nikalne tak ID generate karna band. Chhota farak ho to bas wait karo; bada farak ho to error + alert.', go: 'bad:a>db', msg: 'Clock moved backwards. Refusing to generate id for 5 ms' },
          { title: '5 ms baad sab normal', text: 'Ghadi .105 ke paar gayi, IDs phir se. Behtar setup: NTP ko ghadi dheere dheere adjust (slew) karne do, jhatke se peeche (step) nahi.', set: { a: { state: 'ok', sub: 'now .106 > last .105' } }, go: ['a>db', 'res:db>a'] },
        ]},
        { name: 'Same machine ID', intro: 'Deploy script mein gadbad: B ko bhi config se machine 7 mil gaya, lease nahi liya.', steps: [
          { title: 'Dono machine 7', text: 'Ab do generators ek hi "naam" se.', set: { b: { state: 'warn', sub: 'generator, m = 7 (!)' } }, focus: ['a', 'b'] },
          { title: 'Same millisecond, same sequence', text: 'Dono ne 10:30:00.200 pe pehla ID banaya: time same, machine same, sequence 0 same. Bit by bit same ID.', parallel: true, go: ['a>db', 'b>db'], msg: 'A: 2011747689087135744\nB: 2011747689087135744   (same!)' },
          { title: 'DB ne pakda (is baar)', text: 'Primary key ne doosra insert reject kiya. Lekin agar ID pehle cache, queue ya kisi doosre shard mein chala gaya to galti chupchaap phail jaati. Isliye machine ID hamesha lease/registry se do, haath se config se nahi.', go: ['res:db>a', 'bad:db>b'], after: { db: { state: 'warn', sub: 'duplicate key!' } }, msg: 'ERROR: duplicate key value violates unique constraint "posts_pkey"' },
        ]},
        { name: 'Sequence khatam', steps: [
          { title: 'Ek ms mein 4,096', text: 'Viral moment: A ko ek millisecond mein 4,096 se zyada IDs chahiye.', flood: { paths: ['a>db'], n: 8 }, after: { a: { state: 'hot', sub: 'seq = 4095' } } },
          { title: 'Agle ms ka wait', text: 'Sequence 12 bits mein khatam. Generator agle millisecond tak ruk jaata hai, phir sequence 0 se. Matlab ek machine ki chhat ~40 lakh IDs/second. Usse zyada chahiye to aur generators (machine IDs) jodo.', set: { a: { state: '', sub: 'next ms, seq = 0' } }, go: ['a>db', 'res:db>a'] },
        ]},
      ],
    },
    { type: 'h2', text: 'ID lab: saare tareeke, ek hi kahani pe' },
    { type: 'p', html: `Ab har tareeke ko <strong>khud chala ke</strong> dekho. Teen app servers (A, B, C) posts bana rahe hain. Upar mode chuno: har mode same posts ko apne tareeke se ID deta hai, aur table mein uski andar ki haalat dikhti hai. Neeche teen sawaal ka jawab milta hai: duplicate bane? ID se sort karne pe sahi time order aaya? Kitni baar central server ko call karna pada?` },
    { type: 'list', items: [
      `<strong>Ek DB auto-increment:</strong> sab sahi, lekin "Central calls" har post pe badhta hai. Wahi bottleneck aur SPOF.`,
      `<strong>Har shard ka counter:</strong> laal DUPLICATE dekho. Isi problem se lesson shuru hua tha.`,
      `<strong>Step offsets:</strong> duplicates nahi, lekin A busy hai to uske IDs aage nikal jaate hain: sort ka order toota.`,
      `<strong>Ticket server:</strong> 11 IDs ke liye sirf 4 calls (ranges ki wajah se). Order lagbhag.`,
      `<strong>UUIDv4 / UUIDv7 / ULID:</strong> v4 ka sort order bilkul ulta-pulta; v7 aur ULID ka sahi. Size 16 bytes.`,
      `<strong>Snowflake:</strong> 8 bytes, zero calls, sahi order. Ab clock skew try karo: <em>Reset</em> → "A ki ghadi 8 ms peeche" → "Post: server A". Safe generator mana karta hai (REFUSED). Phir "naive" tick karo: wahi ID dobara ban jaata hai (DUPLICATE). UUIDv7 mode mein yahi karo: duplicate nahi (random hissa), lekin order toot-ta hai.`,
    ]},
    { type: 'custom', render(el) {
      const MODES = {
        db: { name: 'Ek DB auto-increment', bytes: 8, how: 'Har post ke liye central DB se agla number. Unique aur sorted, lekin har ID ek network call, aur wo DB gira to sab ruka.' },
        shard: { name: 'Har shard ka apna counter', bytes: 8, how: 'A, B, C teeno 1 se ginte hain. Duplicates turant.' },
        offset: { name: 'Step offsets (N=3)', bytes: 8, how: 'A: 1, 4, 7...  B: 2, 5, 8...  C: 3, 6, 9...  Unique, lekin jo server busy wo aage nikal jaata hai: order toot-ta hai.' },
        ticket: { name: 'Ticket server (range 5)', bytes: 8, how: 'Har server ticket server se 5 IDs ki range leta hai, phir locally deta hai. Calls kam, IDs unique, order sirf lagbhag. Neeche base62 short code bhi.' },
        uuid4: { name: 'UUIDv4', bytes: 16, how: '122 random bits. Koi coordination nahi, lekin ID se time ka order bilkul nahi.' },
        uuid7: { name: 'UUIDv7', bytes: 16, how: 'Pehle 48 bits = milliseconds, baaki random. Same ms mein random hissa +1 (monotonic). Sort = time order.' },
        ulid: { name: 'ULID', bytes: 16, how: '48 bits ms + 80 random, 26 characters (Crockford base32). UUIDv7 jaisa idea, alag likhawat.' },
        snow: { name: 'Snowflake', bytes: 8, how: '41 bits time | 10 bits machine (A=1, B=2, C=3) | 12 bits sequence. Bina network call, 64-bit, sorted.' },
      };
      const T0 = Date.UTC(2026, 0, 15, 10, 30, 0, 0), EPOCH = 1288834974657n, MID = { A: 1n, B: 2n, C: 3n };
      const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ', B62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const b62 = n => { let s = ''; n = BigInt(n); do { s = B62[Number(n % 62n)] + s; n /= 62n; } while (n > 0n); return s; };
      const DEF = [['post', 'A'], ['post', 'B'], ['post', 'A'], ['post', 'A'], ['post', 'C'], ['burst', 'A'], ['post', 'B']];
      let mode = 'snow', script = DEF.slice(), naive = false;
      el.innerHTML = `<div class="uiLabM" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <div class="calc-note uiLabHow" style="margin-top:8px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">
          <button type="button" class="btn small primary" data-a="post" data-s="A">Post: server A</button>
          <button type="button" class="btn small primary" data-a="post" data-s="B">Post: server B</button>
          <button type="button" class="btn small primary" data-a="post" data-s="C">Post: server C</button>
          <button type="button" class="btn small" data-a="burst" data-s="A">Viral: A pe 5 posts ek ms mein</button>
          <button type="button" class="btn small" data-a="back" data-s="A">A ki ghadi 8 ms peeche</button>
          <button type="button" class="btn small ghost" data-a="reset">Reset</button>
        </div>
        <label style="display:flex;gap:8px;align-items:center;margin-top:8px;font-size:14px"><input type="checkbox" class="uiLabNaive"> Snowflake generator "naive" hai (ghadi peeche hone ka check nahi)</label>
        <div style="overflow-x:auto;margin-top:10px"><table class="uiLabT" style="width:100%;border-collapse:collapse;font:12px var(--f-mono)"></table></div>
        <div class="stats">
          <div class="stat"><span>IDs bane</span><strong class="uiLabN"></strong></div>
          <div class="stat"><span>Duplicates</span><strong class="uiLabD"></strong></div>
          <div class="stat"><span>ID se sort = time order?</span><strong class="uiLabS"></strong></div>
          <div class="stat"><span>Central calls</span><strong class="uiLabC"></strong></div>
          <div class="stat"><span>Size per ID</span><strong class="uiLabB"></strong></div>
        </div>
        <div class="calc-note uiLabNote"></div>`;
      const q = s => el.querySelector(s);
      const run = () => {
        let seed = 42;
        const rnd32 = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return BigInt(((t ^ (t >>> 14)) >>> 0)); };
        const rbits = n => { let v = 0n; for (let i = 0; i < Math.ceil(n / 32); i++) v = (v << 32n) | rnd32(); return v & ((1n << BigInt(n)) - 1n); };
        let clock = T0; const off = { A: 0, B: 0, C: 0 };
        const st = { ctr: 0, c: { A: 0, B: 0, C: 0 }, nx: { A: 1, B: 2, C: 3 }, T: 0, rg: {}, calls: 0, last: {}, seq: {}, mono: {} };
        const rows = []; let refused = 0;
        const gen = (s, local) => {
          if (mode === 'db') { st.calls++; return { v: BigInt(++st.ctr) }; }
          if (mode === 'shard') return { v: BigInt(++st.c[s]) };
          if (mode === 'offset') { const v = st.nx[s]; st.nx[s] += 3; return { v: BigInt(v) }; }
          if (mode === 'ticket') { let r = st.rg[s]; if (!r || r.n > r.e) { st.calls++; r = st.rg[s] = { n: st.T + 1, e: st.T + 5 }; st.T += 5; } const v = r.n++; return { v: BigInt(v), extra: 'base62: ' + b62(v) }; }
          if (mode === 'uuid4') { let v = rbits(128); v = (v & ~(0xFn << 76n)) | (4n << 76n); v = (v & ~(3n << 62n)) | (2n << 62n); return { v, hex: true }; }
          if (mode === 'uuid7' || mode === 'ulid') {
            const ms = BigInt(local); let r;
            const m = st.mono[s];
            if (m && m.ms === ms) r = m.r + 1n; else r = mode === 'ulid' ? rbits(80) : rbits(74);
            st.mono[s] = { ms, r };
            if (mode === 'ulid') return { v: (ms << 80n) | r, b32: true };
            const ra = r >> 62n, rb = r & ((1n << 62n) - 1n);
            return { v: (ms << 80n) | (7n << 76n) | (ra << 64n) | (2n << 62n) | rb, hex: true };
          }
          // snowflake
          const last = st.last[s];
          if (last !== undefined && local < last && !naive) return null;
          if (local === last) st.seq[s]++; else st.seq[s] = 0;
          st.last[s] = local;
          return { v: ((BigInt(local) - EPOCH) << 22n) | (MID[s] << 12n) | BigInt(st.seq[s]) };
        };
        const fmtId = g => {
          if (g.b32) { let v = g.v, s = ''; for (let i = 0; i < 26; i++) { s = B32[Number(v % 32n)] + s; v /= 32n; } return s; }
          if (g.hex) { const h = g.v.toString(16).padStart(32, '0'); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`; }
          return g.v.toString();
        };
        script.forEach(([a, s]) => {
          if (a === 'back') { off[s] -= 8; rows.push({ note: `${s} ki ghadi 8 ms peeche (NTP step)` }); return; }
          const n = a === 'burst' ? 5 : 1;
          clock += 2;
          for (let k = 0; k < n; k++) {
            const local = clock + off[s];
            const g = gen(s, local);
            if (!g) { refused++; rows.push({ s, local, refused: true }); continue; }
            rows.push({ s, local, g, id: fmtId(g), k: rows.filter(r => r.g).length });
          }
        });
        return { rows, refused, calls: st.calls };
      };
      const draw = () => {
        const mb = q('.uiLabM'); mb.innerHTML = '';
        Object.keys(MODES).forEach(k => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (k === mode ? ' on' : ''); b.textContent = MODES[k].name; b.onclick = () => { mode = k; draw(); }; mb.appendChild(b); });
        q('.uiLabHow').textContent = MODES[mode].how;
        const R = run(), ok = R.rows.filter(r => r.g);
        const cnt = {}; ok.forEach(r => { cnt[r.id] = (cnt[r.id] || 0) + 1; });
        const dups = ok.filter(r => cnt[r.id] > 1).length;
        const sorted = ok.slice().sort((x, y) => (x.g.v < y.g.v ? -1 : x.g.v > y.g.v ? 1 : 0));
        const inOrder = sorted.every((r, i) => i === 0 || r.k > sorted[i - 1].k);
        const th = 'text-align:left;padding:4px 6px;border-bottom:1px solid var(--line-2);color:var(--ink-3);font-family:var(--f-body)';
        q('.uiLabT').innerHTML = `<tr><th style="${th}">#</th><th style="${th}">Server</th><th style="${th}">Ghadi (ms)</th><th style="${th}">ID</th></tr>` + R.rows.map(r => {
          if (r.note) return `<tr><td colspan="4" style="padding:4px 6px;color:var(--amber)">⏱ ${r.note}</td></tr>`;
          if (r.refused) return `<tr><td style="padding:4px 6px">-</td><td style="padding:4px 6px">${r.s}</td><td style="padding:4px 6px">.${String(r.local - T0).padStart(3, '0')}</td><td style="padding:4px 6px;color:var(--red)">REFUSED: ghadi last ID se peeche</td></tr>`;
          const d = cnt[r.id] > 1;
          return `<tr><td style="padding:4px 6px">${r.k + 1}</td><td style="padding:4px 6px">${r.s}</td><td style="padding:4px 6px">.${String(r.local - T0).padStart(3, '0')}</td><td style="padding:4px 6px;word-break:break-all;color:${d ? 'var(--red)' : 'var(--ink)'};font-weight:${d ? 700 : 400}">${r.id}${r.g.extra ? ` <span style="color:var(--ink-3)">(${r.g.extra})</span>` : ''}${d ? ' DUPLICATE' : ''}</td></tr>`;
        }).join('');
        q('.uiLabN').textContent = ok.length;
        q('.uiLabD').textContent = dups;
        q('.uiLabD').style.color = dups ? 'var(--red)' : '';
        q('.uiLabS').textContent = inOrder ? 'Haan' : 'Nahi';
        q('.uiLabS').style.color = inOrder ? 'var(--green)' : 'var(--red)';
        q('.uiLabC').textContent = R.calls;
        q('.uiLabB').textContent = MODES[mode].bytes + ' bytes';
        q('.uiLabNote').textContent = `ID se sort karne pe banne ka order: ${sorted.map(r => '#' + (r.k + 1)).join(' ')}.` + (R.refused ? ` ${R.refused} IDs refuse hue (safe generator).` : '') + (dups ? ' Duplicate IDs = do alag posts ek hi naam se: data corruption.' : '');
      };
      el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { const a = b.dataset.a; if (a === 'reset') script = DEF.slice(); else script.push([a, b.dataset.s]); draw(); });
      q('.uiLabNaive').addEventListener('change', e => { naive = e.target.checked; draw(); });
      draw();
    }},

    { type: 'h2', text: 'Sab ek nazar mein' },
    { type: 'table', head: ['Tareeka', 'Size', 'Time sortable', 'Coordination', 'Kamzori', 'Kab'], rows: [
      ['DB auto-increment', '64-bit', 'Haan (ek DB mein)', 'Ek DB', 'SPOF, shards pe unique nahi, ginti dikhti hai', 'Chhota app, ek database'],
      ['Step offsets', '64-bit', 'Nahi (servers ke beech)', 'Config', 'Server jodna mushkil', 'Do-teen masters'],
      ['Ticket server (+ ranges)', '64-bit', 'Lagbhag', 'Har ID/range pe call', 'Central bottleneck', 'Chhote codes (URL shortener)'],
      ['UUIDv4', '128-bit', 'Nahi', 'Koi nahi', 'Bada, index ke liye bura', 'Sirf uniqueness, offline IDs'],
      ['UUIDv7 / ULID', '128-bit', 'Haan', 'Koi nahi', 'Bada, time dikhta hai', 'Time order + koi setup nahi'],
      ['Snowflake', '64-bit', 'Haan (k-sorted)', 'Sirf machine ID', 'Ghadi pe nirbhar, machine IDs sambhalne', 'Tweets, messages, feeds, bade scale pe'],
      ['Instagram variant', '64-bit', 'Haan', 'DB ke andar', '1,024 IDs/ms per shard', 'Sharded Postgres, ID se shard bhi pata'],
    ]},
    { type: 'callout', tone: 'tip', title: 'Decide', html: `IDs ko <strong>lagbhag time order</strong> mein chahiye (feeds, messages)? <strong>Snowflake</strong> (64-bit chahiye) ya <strong>UUIDv7</strong> (koi setup nahi chahiye). Bas uniqueness chahiye? <strong>UUIDv4</strong>. Chhote, insaan ke padhne layak codes (URL shortener)? <strong>Counter ya pehle se li hui key range</strong>, base62 mein. Ek database se kaam chal raha hai? Auto-increment hi theek hai, faltu complexity mat lao.` },
    { type: 'diagram', title: 'Unique IDs: xyz.com mein poori picture', height: 610,
      groups: [
        { label: 'Users', x: 200, y: 14, w: 320, h: 92 },
        { label: 'Data', x: 270, y: 372, w: 400, h: 226 },
      ],
      nodes: [
        { id: 'u', label: 'xyz.com app', sub: 'nayi post', x: 360, y: 66, kind: 'client', info: 'Ye kya hai: users ka phone ya browser. Post bhejta hai, ID ke baare mein kuch nahi jaanta.' },
        { id: 'lb', label: 'Load balancer', x: 360, y: 168, kind: 'net', info: 'Ye kya hai: requests ko app servers mein baantta hai (LB lesson). Kisi bhi server pe jaaye, ID unique hi banega.' },
        { id: 'a1', label: 'App server A', sub: 'Snowflake, m = 7', x: 265, y: 288, w: 150, kind: 'server', info: 'Ye kya hai: xyz.com ka app server jiske andar Snowflake generator hai. Time + machine 7 + sequence se ID, bina network call, microseconds mein.' },
        { id: 'a2', label: 'App server B', sub: 'Snowflake, m = 8', x: 455, y: 288, w: 150, kind: 'server', info: 'Ye kya hai: doosra app server, machine ID 8. Alag machine ID ki wajah se A aur B kabhi same ID nahi banate.' },
        { id: 'zk', label: 'etcd / ZooKeeper', sub: 'machine ID lease', x: 110, y: 168, w: 150, kind: 'net', info: 'Ye kya hai: coordination store. Har app server startup pe yahan se apna machine ID lease karta hai, taaki do servers ko kabhi same number na mile. Har ID pe nahi, sirf startup pe.' },
        { id: 'ntp', label: 'NTP server', sub: 'sahi time', x: 610, y: 168, w: 150, kind: 'net', info: 'Ye kya hai: time reference. Har app server isse ghadi milaata hai. Ghadi peeche gayi to generator tab tak ID nahi deta jab tak time aage na nikle.' },
        { id: 'tk', label: 'Ticket server', sub: 'ranges + base62', x: 95, y: 430, w: 150, kind: 'data', info: 'Ye kya hai: URL shortener ke liye counter. App server ek baar mein 1,000 numbers ki range leta hai, aur har number ko base62 mein chhota code (jaise gN) bana deta hai.' },
        { id: 'db', label: 'Posts DB', sub: 'id BIGINT, sharded', x: 360, y: 430, w: 150, kind: 'data', info: 'Ye kya hai: posts ka database, kai shards mein. ID primary key hai (duplicate = error). 64-bit ID se index chhota, aur badhte IDs index ke aakhri hisse mein judte hain.' },
        { id: 'kf', label: 'Events (Kafka)', sub: 'key = post id', x: 575, y: 430, w: 150, kind: 'queue', info: 'Ye kya hai: events ki stream (Kafka lesson). Har event post ID ke saath, to cache, search aur notifications sab ek hi ID se baat karte hain. Duplicate ID hota to yahan gadbad chupchaap phailti.' },
        { id: 'fd', label: 'Feed query', sub: 'ORDER BY id DESC', x: 360, y: 545, w: 170, kind: 'server', info: 'Ye kya hai: feed banane wala code. IDs time-sorted hain, to "naye pehle" ke liye bas ID se sort, aur pagination "id < last_id" se.' },
      ],
      edges: [
        { a: 'u', b: 'lb', n: 1, label: 'POST /posts' },
        { a: 'lb', b: 'a1', n: 2 },
        { a: 'lb', b: 'a2' },
        { a: 'a1', b: 'zk', label: 'lease m=7', dashed: true },
        { a: 'a2', b: 'ntp', label: 'time sync', dashed: true },
        { a: 'a1', b: 'db', n: 3, label: 'INSERT id' },
        { a: 'a2', b: 'db' },
        { a: 'a1', b: 'tk', label: 'short code', dashed: true },
        { a: 'db', b: 'kf', label: 'events', kind: 'evt' },
        { a: 'fd', b: 'db', label: 'ID se sort' },
      ],
      paths: [
        { name: 'Nayi post', text: 'Request kisi bhi app server pe gayi. Wahi server locally Snowflake ID banata hai (time | machine | sequence) aur DB mein likhta hai. Koi central call nahi.', go: ['u>lb>a1>db', 'db>kf'] },
        { name: 'Startup', text: 'Server pehle machine ID lease karta hai aur NTP se ghadi milaata hai. Iske baad hi IDs banana shuru.', go: ['a1>zk', 'a2>ntp'] },
        { name: 'Feed', text: 'IDs time-sorted hain, to feed bas ID se sort karta hai. Alag created_at index nahi chahiye.', go: ['fd>db'] },
        { name: 'Short link', text: 'URL shortener ke chhote codes ke liye ticket server se range, phir base62.', go: ['a1>tk'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>ID ko chahiye: unique, tez, aksar time-sorted, chhota (64-bit), kabhi kabhi guess na ho sake.</li>
      <li>Auto-increment: ek DB tak best. Shards pe takraav, aur SPOF.</li>
      <li>Step offsets: unique, lekin order toot-ta hai aur server jodna mushkil. Ticket server + ranges: kam calls, chhote numbers (base62 codes).</li>
      <li>UUIDv4: zero coordination, 128-bit, koi order nahi, index pe bhaari. Duplicate ka 50% chance ~2.7 × 10^18 IDs pe.</li>
      <li>UUIDv7 / ULID: shuru mein 48-bit ms time, baaki random: sorted aur coordination-free, lekin 16 bytes.</li>
      <li>Snowflake: 1 + 41 time + 10 machine + 12 sequence = 64 bits. ~69.7 saal, 4,096 IDs/ms/machine. Instagram: 41 + 13 shard + 10.</li>
      <li>Clock skew: ghadi peeche = duplicates ka khatra, isliye generator mana kare. Machine IDs lease se do.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Shards aur machines pe bina takraav ke IDs', 'Snowflake/UUIDv7: bina network call ke, microseconds mein', 'Time-sortable IDs se feeds aur pagination sasta', '64-bit IDs: chhote indexes, tez joins', 'ID se hi time (aur Instagram mein shard) pata'], costs: ['Snowflake ghadi pe nirbhar: clock skew handle karna padta hai', 'Machine IDs ko unique rakhna (lease, registry)', 'Order sirf lagbhag: alag machines ke IDs thode aage peeche', 'UUIDs ka size (16 bytes) aur v4 ka index pe asar', 'Time-based IDs creation time dikhate hain; sequential IDs ginti dikhate hain'] },
    { type: 'think', questions: [
      { q: 'xyz.com chat app: messages ek conversation mein sahi order mein dikhne chahiye. Snowflake IDs se sort karein to kya kabhi galat order ho sakta hai?', a: 'Haan, thoda. Do alag servers ki ghadiyon mein kuch ms ka farak ho to 1-2 ms ke andar bheje gaye messages ulte dikh sakte hain. Zyadatar chats mein ye chalta hai. Strict order chahiye to ek conversation ke saare messages ek hi jagah (ek partition/shard) se sequence number lein, ya server pe receive order rakho.' },
      { q: 'Tumhare paas 2,000 app servers hain jo Snowflake IDs banate hain. Kya dikkat hai?', a: '10 bits mein sirf 1,024 machine IDs hain. Options: bits ka split badlo (jaise 12 bits machine, 10 bits sequence, agar per-machine 1,024/ms kaafi ho), ya ID generation kuch dedicated servers pe karo, ya machine ID ko lease karo aur sirf active generators ko do.' },
      { q: 'Mobile app offline hai (flight mein) aur user 5 notes likhta hai. Online aate hi sync. Notes ka ID kaun banaye, aur kaunsa scheme?', a: 'Phone khud. Offline mein na DB hai na ticket server, aur Snowflake ke liye phone ko machine ID dena mushkil hai (crores phones, sirf 1,024 numbers). UUIDv7 (ya ULID) best: koi coordination nahi, aur time order bhi. Phone ki ghadi galat ho sakti hai, isliye server pe alag received_at bhi rakho.' },
      { q: 'Payment ka order ID customer ke email aur URL mein jaata hai. Auto-increment, Snowflake ya UUIDv4?', a: 'Auto-increment ginti aur agla order guess karna dikhata hai. Snowflake mein bhi time aur andaza dikhta hai. Bahar dikhne wala ID UUIDv4 jaisa random rakhna safe hai, andar database mein chahe Snowflake/BIGINT primary key ho. Aur har haal mein authorization check zaroori.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Snowflake ID ke 64 bits ka split kya hai?', options: ['32 time + 32 random', '1 sign + 41 timestamp + 10 machine + 12 sequence', '48 time + 80 random'], answer: 1, explain: 'Timestamp sabse upar ke bits mein, isliye bade ID = baad mein bana. 48 + 80 ULID hai (128 bits).' },
      { q: 'Snowflake mein custom epoch kyun?', options: ['Security ke liye', 'Taaki 41 bits ke ~69 saal system ke launch se gine jaayein, 1970 se nahi', 'Taaki ID decimal mein chhota dikhe'], answer: 1, explain: '1970 se ginte to ~40 saal ka range pehle hi kharch ho chuka hota.' },
      { q: 'Generator ne dekha ki ghadi last ID ke time se peeche hai. Sahi kadam?', options: ['Chalte raho', 'Ghadi aage nikalne tak ID dena roko (chhota farak ho to wait, bada ho to error/alert)', 'Sequence ko 0 kar do'], answer: 1, explain: 'Peeche ki ghadi pe chalte rahe to wahi milliseconds aur sequence dobara: duplicate IDs. Twitter ka Snowflake README yahi karta hai: ghadi aage nikalne tak mana.' },
      { q: 'Random UUIDv4 primary key se badi table mein inserts slow kyun ho sakte hain?', options: ['UUID banane mein time lagta hai', 'Naye keys B-tree index mein random jagahon pe girte hain: zyada page splits aur cache misses', 'UUID unique nahi hote'], answer: 1, explain: 'Badhte hue IDs (auto-increment, Snowflake, UUIDv7) index ke aakhri hisse mein judte hain jo RAM mein rehta hai.' },
      { q: 'Step offsets (A: 1, 4, 7... B: 2, 5, 8...) mein A pe 10 posts aayi, phir B pe ek. B ki nayi post ka ID kya, aur dikkat kya?', options: ['31, sab theek', '2: unique hai, lekin A ki purani posts (jaise 28) se chhota, to ID se sort karne pe nayi post peeche chali jaati hai', 'Duplicate ban jaata hai'], answer: 1, explain: 'Har server apni lane mein alag speed se badhta hai. Unique rehta hai, time order nahi. ID lab ke "Step offsets" mode mein yahi dikhta hai.' },
      { q: 'UUIDv7 ke pehle 48 bits mein kya hota hai?', options: ['Machine ka MAC address', 'Unix time, milliseconds mein', 'Random bits'], answer: 1, explain: 'Isi wajah se v7 time se sort hota hai. Baaki bits mein version (7), variant aur random hissa.' },
      { q: 'Ek arab (10^9) UUIDv4 banaye. Kam se kam ek duplicate ka chance lagbhag?', options: ['50%', '1%', '~10^-19 (lagbhag zero)'], answer: 2, explain: 'Birthday formula: n² / 2·2^122 ≈ 9.4 × 10^-20. 50% tak pahunchne ke liye ~2.7 × 10^18 UUIDs chahiye.' },
      { q: 'Flickr ne do ticket servers mein takraav kaise roka?', options: ['Dono random numbers dete the', 'Ek odd, ek even: auto-increment-increment 2, offsets 1 aur 2', 'ZooKeeper lock'], answer: 1, explain: 'Step offset trick. Dono alag lane mein ginte hain, kabhi same number nahi.' },
    ]},
    { type: 'sources', note: 'Real systems ke details inhi posts aur specs se. Twitter, Flickr aur Instagram ki posts 2010-2011 ki hain; aaj unke systems badal chuke ho sakte hain.', items: [
      { title: 'Announcing Snowflake', publisher: 'Twitter Engineering blog', official: true, year: 2010, url: 'https://blog.x.com/engineering/en_us/a/2010/announcing-snowflake', used: 'Why Twitter needed it (MySQL to Cassandra), uncoordinated, roughly sortable, 64-bit requirement.' },
      { title: 'twitter-archive/snowflake (snowflake-2010 README and code)', publisher: 'Twitter on GitHub', official: true, year: 2010, url: 'https://github.com/twitter-archive/snowflake/tree/snowflake-2010', used: '41-bit time with custom epoch (~69 years), 10-bit configured machine id, 12-bit sequence, k-sorted within ~1 s, refuses to generate when clock moves backwards, use NTP; epoch 1288834974657.' },
      { title: 'Ticket Servers: Distributed Unique Primary Keys on the Cheap', publisher: 'Code.flickr.net', official: true, year: 2010, url: 'https://code.flickr.net/2010/02/08/ticket-servers-distributed-unique-primary-keys-on-the-cheap/', used: 'Why not GUIDs, Tickets64 table with REPLACE INTO and LAST_INSERT_ID, two servers with odd/even offsets.' },
      { title: 'Sharding & IDs at Instagram', publisher: 'Instagram Engineering blog', official: true, year: 2011, url: 'https://instagram-engineering.com/sharding-ids-at-instagram-1cf5a71e5a5c', used: '41/13/10 bit layout, logical shards as Postgres schemas mapped to fewer physical servers, PL/pgSQL ID function, 31341 % 2000 = 1341 example, 1024 IDs per shard per ms.' },
      { title: 'RFC 9562: Universally Unique IDentifiers (UUIDs)', publisher: 'IETF', official: true, year: 2024, url: 'https://www.rfc-editor.org/rfc/rfc9562.html', used: 'Obsoletes RFC 4122; UUIDv4 has 122 random bits; UUIDv7 layout (48-bit ms timestamp, ver, rand_a, var, rand_b); recommends v7 over v1/v6; index locality; monotonic counter methods.' },
      { title: 'ULID specification', publisher: 'ulid/spec on GitHub', url: 'https://github.com/ulid/spec', used: '48-bit ms timestamp + 80 random bits, 26-char Crockford base32, monotonic within same ms.' },
    ]},
  ],
});
