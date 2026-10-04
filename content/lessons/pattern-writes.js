Lesson.register({
  id: 'pattern-writes',
  title: 'Scaling writes',
  minutes: 30,
  summary: `Reads ko cache aur copies se sasta kar sakte hain, writes ko nahi: har write ko kahin durable jagah pahunchna hi hai. Writes badhne pe seedhi ye hai: batching → write-optimised (LSM) DB → sharding → Kafka buffer → memory mein aggregate karke likhna. Har rung kab, kitne ka, aur kahan haarta hai.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Padhne wale kaam ko copies bana ke sasta kar sakte hain. Likhne wale kaam ko nahi.<br>Har "likhna" (write) ek pakki jagah pahunchna hi chahiye, warna data kho jaayega.<br>Jab xyz.com pe har second lakhon views, likes aur location updates aate hain, database likhte likhte thak jaata hai.<br>Is lesson mein writes ki seedhi hai: 5 tareeke, saste se mehenge tak, aur har tareeke ki keemat.` },
    { type: 'h2', text: 'Ab tak ki kahani' },
    { type: 'p', html: `<a href="#/pattern-reads">Scaling reads</a> mein dekha ki reads ko index, cache, replicas, CDN aur precomputed views se sambhalte hain. Sab ka trick ek tha: <strong>copy banao aur copy se padho</strong>.` },
    { type: 'p', html: `Writes mein ye trick ulta pad jaata hai. Har copy ko bhi wo write chahiye. Cache ek write ko "sokh" nahi sakta. Replica har write dobara karti hai. Isliye writes ke liye alag seedhi chahiye.` },
    { type: 'p', html: `xyz.com pe ab do write-heavy cheezein hain. (1) <strong>View counter</strong>: har video play pe "+1 view", aur har 10 second "user ne yahan tak dekha" (watch progress). (2) <strong>Live location</strong> wala naya feature: delivery partner ya driver har kuch second apni location bhejta hai, jaise Uber. Dono mein writes reads se zyada hain. Aur IPL final jaise din pe 10 guna spike.` },
    { type: 'callout', tone: 'term', title: 'Write-heavy', html: `<strong>Ye kya hai:</strong> aisa system jahan writes reads ke barabar ya zyada hon: metrics, logs, location pings, clicks, views, chat messages.<br><strong>Kyun pehchaanna zaroori:</strong> read wale ilaaj (cache, replicas) yahan kaam nahi aate. Roadmap ke examples: Uber location updates, ad click aggregation, view counters, metrics.<br><strong>Iske bina:</strong> tum replicas lagate rahoge aur writes phir bhi atke rahenge.` },
    { type: 'callout', tone: 'term', title: 'Durable write aur fsync', html: `<strong>Ye kya hai:</strong> <strong>durable</strong> = server ne "OK" bola to data crash ke baad bhi bacha rahega. Iske liye DB data ko disk pe pakka karta hai. <strong>fsync</strong> = OS ko bolna "abhi disk pe likho, apne buffer (temporary memory) mein mat rakho".<br><strong>Kyun chahiye:</strong> bina fsync ke, bijli gayi to "saved" data bhi gaya.<br><strong>Iske bina:</strong> users ko "saved" dikhta, lekin data gayab.<br><strong>Kharcha:</strong> fsync slow hai (SSD pe bhi ~0.1-1 ms ya zyada). Yahi har write ka asli fixed kharcha hai. Detail: WAL, <a href="#/db-internals">DB internals</a> lesson mein.` },

    { type: 'h2', text: 'Seedhi ek nazar mein' },
    { type: 'steps', items: [
      { t: 'Batch writes', d: 'Batching = bahut saare chhote writes jama karke ek saath likhna. Symptom: DB har chhote INSERT pe commit aur fsync kar raha hai, CPU/disk full. Ilaaj: 500 rows ek saath likho. Kharcha: thodi der (batch bharne ka wait), crash pe buffer ka risk.' },
      { t: 'Write-optimised DB (LSM)', d: 'LSM DB = aisa database jo naya data hamesha file ke end mein jodta hai (append), beech mein jagah dhoond ke nahi likhta. Symptom: batching ke baad bhi B-tree indexes disk pe random jagah likh rahe hain. Ilaaj: Cassandra, ScyllaDB, RocksDB jaisa LSM DB. Kharcha: reads thode mehenge, background safai (compaction), kam flexible queries.' },
      { t: 'Shard by a well-spread key', d: 'Sharding = data ko kai machines (shards) mein baantna, har machine apna hissa likhe. Symptom: ek machine (ya uski copies ka set) ki hadd aa gayi. Ilaaj: key ke hash se kai shards mein baanto. Kharcha: kai shards pe phaili queries, rebalancing, hot keys.' },
      { t: 'Buffer through Kafka', d: 'Kafka = ek tez, pakka "log" jisme events line se jama hote hain, aur DB unhe baad mein apni speed se padhta hai. Symptom: spikes pe DB slow, ingest API timeouts, events khote hain. Ilaaj: pehle Kafka mein jodo, DB baad mein. Kharcha: data der se dikhta hai (consumer lag), ek aur system.' },
      { t: 'Aggregate in memory', d: 'Aggregation = har event alag likhne ki jagah RAM mein jod ke sirf total likhna. Symptom: har event ek DB write hai, aur ek viral video ka counter ek hi row pe garam. Ilaaj: 5 second tak RAM mein gino, phir ek write: "+1,000". Kharcha: count thoda purana, crash pe recount ka intezaam.' },
    ]},
    { type: 'callout', tone: 'why', title: 'Ye order kyun?', html: `Batching sirf code change hai. LSM ek naya DB hai lekin ek hi cluster. Sharding se har query ko shard ka pata hona chahiye. Kafka se poora system async ho jaata hai: "OK" ka matlab ab "DB mein hai" nahi raha. Aggregation se data ka matlab hi badal jaata hai: tum har event nahi, uska jod rakhte ho. Har rung pichhle se zyada <strong>semantics</strong> badalta hai.` },

    { type: 'h2', text: 'Har rung, thoda gehrai mein' },
    { type: 'p', html: `Har rung ka format same: xyz.com ki kahani numbers ke saath → tareeka seedhe shabdon mein → kab rukna hai → gehri lesson ka link. Uske baad poori seedhi ek widget aur ek diagram mein.` },
    { type: 'h3', text: 'Rung 1: batching' },
    { type: 'p', html: `<strong>Kahani:</strong> xyz.com ka view counter shuru mein simple tha: har play pe ek <code>INSERT</code> Postgres mein. 1k events/second tak sab theek. 5k/second pe DB ka disk aur CPU full. Ajeeb baat: har INSERT bahut chhota hai (~200 bytes). Phir bhi DB thak gaya. Kyun? Kyunki kaam ka bada hissa data likhna nahi, balki har baar ka "commit + fsync" hai.` },
    { type: 'callout', tone: 'term', title: 'Batching', html: `<strong>Ye kya hai:</strong> bahut saare chhote kaam jama karke ek bade kaam mein karna. Jaise 500 chitthiyan ek hi daak ke thaile mein bhejna, har chitthi ke liye alag chakkar ki jagah.<br><strong>Kyun chahiye:</strong> har write ka ek <strong>fixed kharcha</strong> hai (network round trip, transaction, commit, fsync) aur ek <strong>per-row kharcha</strong>. Batching fixed kharche ko 500 rows mein baant deti hai.<br><strong>Iske bina:</strong> 500 rows = 500 commits = 500 fsyncs. DB apna zyada time "pakka karne" mein lagata hai.<br><strong>Example:</strong> ye har level pe hota hai: client 10 events ek request mein bheje, server 500 rows ek INSERT (ya <code>COPY</code>) mein, DB kai transactions ek fsync mein (Postgres mein ise group commit kehte hain), Kafka producer kai messages ek request mein.` },
    { type: 'p', html: `<strong>Batching lab.</strong> Ek ingest server events jama karta hai, aur jab <em>batch size</em> poora ho ya 50 ms ho jaayein (jo pehle ho), DB mein likhta hai. Model: har commit ka fixed kharcha ~0.15 ms DB time, har row ~0.05 ms. "OK kab bhejo" badal ke dekho: speed vs crash risk.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2"><div><label>Aate hue events/s: <strong class="bt-lv"></strong></label><input class="bt-l" type="range" min="1000" max="30000" step="1000" value="15000"></div>
        <div><label>Batch size: <strong class="bt-bv"></strong></label><input class="bt-b" type="range" min="0" max="5" step="1" value="0"></div></div>
        <div style="margin:8px 0;display:flex;flex-wrap:wrap;gap:6px"><button type="button" class="chip on bt-m1">OK flush ke baad</button><button type="button" class="chip bt-m2">OK turant (RAM mein)</button></div>
        <div style="font-size:13px;color:var(--ink-2)">DB load meter</div>
        <div style="height:14px;background:var(--surface-2);border-radius:7px;overflow:hidden"><div class="bt-bar" style="height:14px"></div></div>
        <div class="stats">
          <div class="stat"><span>DB capacity</span><strong class="bt-cap"></strong></div>
          <div class="stat"><span>DB load</span><strong class="bt-u"></strong></div>
          <div class="stat"><span>"OK" milne mein</span><strong class="bt-lat"></strong></div>
          <div class="stat"><span>Crash pe khatra</span><strong class="bt-risk"></strong></div>
        </div>
        <div class="calc-note bt-note"></div>`;
      const $ = c => el.querySelector(c);
      const SIZES = [1, 10, 50, 100, 500, 1000];
      let after = true;
      $('.bt-m1').onclick = () => { after = true; upd(); }; $('.bt-m2').onclick = () => { after = false; upd(); };
      const f = n => n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : Math.round(n) + '';
      const upd = () => {
        const lam = +$('.bt-l').value, B = SIZES[+$('.bt-b').value];
        const eff = Math.max(1, Math.min(B, lam * 0.05));
        const cap = 1000 * eff / (0.15 + 0.05 * eff);
        const u = lam / cap;
        const wait = B === 1 ? 0 : Math.min(B / lam * 1000, 50);
        $('.bt-m1').classList.toggle('on', after); $('.bt-m2').classList.toggle('on', !after);
        $('.bt-lv').textContent = f(lam); $('.bt-bv').textContent = B + (eff < B ? ' (50 ms mein sirf ' + Math.round(eff) + ' aate hain)' : '');
        $('.bt-cap').textContent = f(cap) + ' rows/s';
        $('.bt-u').textContent = Math.round(u * 100) + '%';
        const bar = $('.bt-bar'); bar.style.width = Math.min(100, u * 100) + '%'; bar.style.background = u > 1 ? 'var(--red)' : u > 0.7 ? 'var(--amber)' : 'var(--green)';
        $('.bt-lat').textContent = u > 1 ? 'timeouts' : after ? '~' + Math.round(wait + 2) + ' ms' : '~1 ms';
        $('.bt-risk').textContent = after || B === 1 ? '0 events' : 'upto ' + Math.round(eff) + ' events';
        $('.bt-note').innerHTML = (u > 1 ? `<strong>Overload: DB se ${(u).toFixed(1)}× zyada maang rahe ho.</strong> ` + (B >= 500 ? 'Batching ki hadd aa gayi (~20k rows/s ek machine). Ab agla rung chahiye. ' : 'Batch size badhao. ') : '') +
          `Batch ${Math.round(eff)} rows: har row ka DB time = ${(0.15 / eff + 0.05).toFixed(3)} ms. Batch 1 pe ~5k rows/s, batch 500 pe ~20k rows/s: 4× tez, 500× nahi, kyunki per-row kaam (index update) utna hi rehta hai. ` +
          (after ? 'OK flush ke baad: koi data nahi khota, bas user ko batch bharne tak rukna padta hai.' : 'OK turant: user ko fast jawab, lekin server flush se pehle mara to RAM ka poora batch gaya.');
      };
      $('.bt-l').addEventListener('input', upd); $('.bt-b').addEventListener('input', upd); upd();
    }},
    { type: 'p', html: `<strong>Kharcha:</strong> (1) <strong>der</strong>: event batch bharne tak ruka; (2) <strong>crash risk</strong>: batch RAM mein tha aur server mar gaya to wo events gaye. Isliye client ko OK flush ke baad do, ya buffer Kafka jaisi durable jagah ho. <strong>Limit:</strong> batching per-row kaam (index updates, disk pe random writes) kam nahi karti.` },
    { type: 'callout', tone: 'tip', title: 'Kab rukna hai (batching)', html: `Jab DB pe commits ki ginti kam ho gayi, aur DB load normal din pe ~60% se neeche hai, ruko. Agla rung tab: batching ke baad bhi disk random writes se bhara hai (per-row kaam), aur ek machine ~20k rows/s pe atak gayi.` },
    { type: 'h3', text: 'Rung 2: write-optimised DB (LSM)' },
    { type: 'p', html: `<strong>Kahani:</strong> batching ke baad Postgres ~20k rows/s tak gaya. Ab 40k events/s aa rahe hain. Disk ka graph dekho: wo "random writes" se bhara hai. <code>views</code> table pe 3 indexes hain. Har nayi row ke liye har index mein disk ka koi alag page badalna padta hai.` },
    { type: 'callout', tone: 'term', title: 'B-tree (Postgres/MySQL ka tareeka)', html: `<strong>Ye kya hai:</strong> ek sorted tree jo disk pe pages mein rehta hai. Nayi row aayi to wo uski sahi sorted jagah pe <em>update</em> hoti hai, jaise almari mein kitaab ko uski sahi jagah ghusana.<br><strong>Kyun achha:</strong> reads aur range queries bahut tez.<br><strong>Writes pe dikkat:</strong> har row = disk ki alag alag jagah pe chhote updates (random writes). Bahut writes pe disk thak jaati hai.` },
    { type: 'callout', tone: 'term', title: 'LSM tree (memtable, SSTable, compaction)', html: `<strong>Ye kya hai:</strong> LSM (Log-Structured Merge) tree ek alag tareeka hai. Naya data pehle RAM ki ek sorted list (<strong>memtable</strong>) mein, aur crash safety ke liye ek append-only log mein jaata hai. Memtable bhar gayi to wo poori ek baar mein disk pe ek sorted file (<strong>SSTable</strong>) ban jaati hai. Baad mein background mein chhoti files merge hoti hain (<strong>compaction</strong>). Jaise roz ki notes ek notebook ke end mein likhna, aur weekend pe saaf copy banana.<br><strong>Kyun chahiye:</strong> disk pe sirf sequential (line se) writes. Ye random writes se kai guna sasti hain.<br><strong>Iske bina:</strong> B-tree ki random writes ek machine ko ~20k rows/s pe rok deti hain.<br><strong>Example:</strong> Cassandra, ScyllaDB, RocksDB, HBase isi pe bane hain. Detail: <a href="#/db-internals">LSM tree</a>.` },
    { type: 'p', html: `<strong>Kharcha:</strong> reads ko kai files dekhni padti hain (Bloom filters madad karte hain). Compaction background mein CPU aur disk khaata hai. Discord ne 2023 mein likha ki Cassandra pe compaction peeche reh jaane se reads mehengi aur latency kharab hoti thi. Aur Cassandra jaise DBs mein queries ki aazadi kam: table ko <em>query ke hisaab se</em> design karna padta hai, joins nahi.` },
    { type: 'callout', tone: 'tip', title: 'Kab rukna hai (LSM)', html: `Jab ek replica set (Cassandra mein aam taur pe 3 copies, RF 3) aaram se writes le raha hai, ruko. Agla rung tab: ek replica set ki hadd aa gayi (napkin: ~50k writes/s), ya data kai TB ka ho gaya. Bonus: Cassandra/ScyllaDB pehle se hi data ko nodes mein hash se baant-te hain, to agla rung (sharding) unme lagbhag built-in hai.` },
    { type: 'h3', text: 'Rung 3: shard by a well-spread key' },
    { type: 'p', html: `<strong>Kahani:</strong> xyz.com ab 5 lakh (500k) view events/s pe hai. Ek replica set ~50k/s. Matlab 10 guna kam. Replicas yahan kuch nahi karengi: har replica har write karti hai.` },
    { type: 'callout', tone: 'term', title: 'Shard aur shard key', html: `<strong>Ye kya hai:</strong> <strong>shard</strong> = data ka ek hissa, apni machine(s) pe. <strong>Shard key</strong> = wo column jisse decide hota hai ki row kis shard pe jaaye, aam taur pe <code>hash(key) % shards</code> ya consistent hashing se.<br><strong>Kyun chahiye:</strong> 10 shards = har shard ko 1/10 writes. Capacity lagbhag shards ke saath badhti hai.<br><strong>Iske bina:</strong> ek hi machine ki disk aur CPU poori site ki write limit.<br><strong>Example:</strong> 500k/s ÷ 50k = 10 shards × 3 replicas = 30 nodes.` },
    { type: 'callout', tone: 'term', title: 'Hot shard aur hot key', html: `<strong>Ye kya hai:</strong> jab ek shard (ya ek key) ko baaki se kahin zyada writes milein. <strong>Hot key</strong> = ek hi key pe bahut writes, jaise viral video 91 ka counter.<br><strong>Kyun hota hai:</strong> galat shard key. <code>timestamp</code> ya <code>date</code> se saare naye writes ek hi shard pe. <code>country</code> se India wala shard hamesha garam. Ek viral item hamesha ek hi shard pe.<br><strong>Iske bina (dhyaan na do):</strong> 10 shards hain, lekin ek garam aur 9 khaali. Capacity 10× nahi, 1× hi.` },
    { type: 'p', html: `<strong>Well-spread key</strong> sabse zaroori shabd hai: <code>video_id</code> ya <code>user_id</code> ka hash achha phailta hai. <strong>Kharcha:</strong> kai shards pe phaili queries (scatter-gather), resharding, aur celebrity keys. Poora detail: <a href="#/sharding">sharding</a> aur <a href="#/consistent-hashing">consistent hashing</a>.` },
    { type: 'callout', tone: 'tip', title: 'Kab rukna hai (sharding)', html: `Jab average aur peak dono load shards mein ~60% se neeche fit hon aur koi shard baaki se bahut garam na ho, ruko. Agla rung tab: average theek hai lekin <strong>peak</strong> (IPL final, 10× spike) pe timeouts, aur peak ke liye machines rakhna bahut mehenga hai. Ya ek hi key garam hai, jise sharding baant nahi sakti.` },
    { type: 'h3', text: 'Rung 4: buffer through Kafka' },
    { type: 'p', html: `<strong>Kahani:</strong> normal din xyz.com pe 3 lakh events/s aate hain. IPL final ke last over mein 30 lakh/s. DB ko 30 lakh ke liye size karna = 10 guna machines, jo saal mein 20 din kaam aayengi. Aur agar DB peak pe slow hua, to ingest API ke threads atakte hain, apps retry karte hain, load aur badhta hai, aur events kho jaate hain.` },
    { type: 'callout', tone: 'term', title: 'Kafka (topic, partition, offset)', html: `<strong>Ye kya hai:</strong> Kafka ek bahut tez, pakka <strong>log</strong> hai: events ek lambi line mein end pe jude jaate hain, disk pe aur kai machines pe copy. <strong>Topic</strong> = ek naam wali line (jaise <code>views</code>). <strong>Partition</strong> = topic ke tukde, taaki kai machines saath kaam karein. <strong>Offset</strong> = line mein event ka number, jisse padhne wala yaad rakhta hai ki kahan tak padh liya.<br><strong>Kyun chahiye:</strong> ingest API sirf Kafka mein jodta hai (sequential write, bahut tez) aur turant "OK". DB baad mein apni speed se padh ke likhta hai. Kafka ek <strong>shock absorber</strong> hai: spike log mein jama, baad mein khaali.<br><strong>Iske bina:</strong> DB ko peak ke liye size karo, ya spike pe events khoyo.<br>Detail: <a href="#/kafka">Kafka</a>, aur ye <a href="#/queues">queue-based load levelling</a> hai.` },
    { type: 'callout', tone: 'term', title: 'Consumer aur consumer lag', html: `<strong>Ye kya hai:</strong> <strong>consumer</strong> = wo program jo Kafka se events padh ke DB mein likhta hai. <strong>Consumer lag</strong> = log mein likhe gaye aur padhe gaye events ke beech ka fasla, jaise "6 minute peeche".<br><strong>Kyun zaroori:</strong> lag = DB ka data kitna purana hai.<br><strong>Iske bina (monitor na karo):</strong> sab "green" dikhega, lekin counter 6 minute purana atka rahega aur kisi ko pata nahi chalega.` },
    { type: 'p', html: `<strong>Kharcha:</strong> (1) "OK" ka matlab ab "Kafka mein safe" hai, "DB mein dikh raha" nahi: user ne abhi jo likha wo turant read pe na dikhe; (2) <strong>consumer lag</strong> monitor karna padta hai; (3) consumers ko idempotent banana padta hai (do baar chale to bhi asar ek baar), kyunki Kafka at-least-once deta hai: retry pe duplicate; (4) ek aur cluster chalana. <strong>Limit:</strong> Kafka load ko <em>time mein phailata</em> hai, kam nahi karta. Har event phir bhi kabhi na kabhi ek DB write hai.` },
    { type: 'callout', tone: 'tip', title: 'Kab rukna hai (Kafka)', html: `Jab DB ko sirf <strong>average</strong> ke liye size kiya ho, peak Kafka sokh le, aur lag spike ke baad kuch minute mein khatam ho jaaye, ruko. Agla rung tab: data <strong>jodne layak</strong> hai (counts, sums) aur DB writes ki ginti hi bahut zyada hai, ya ek row garam hai.` },
    { type: 'h3', text: 'Rung 5: aggregate in memory before writing' },
    { type: 'p', html: `<strong>Kahani:</strong> video 91 viral. Us ek video pe ~10k views/s. Har view ek <code>count = count + 1</code>, aur saare ek hi row pe. Ek row ek hi shard pe hoti hai, aur us row ko ek baar mein ek hi update badal sakta hai (row lock). Sharding yahan kuch nahi kar sakti. Lekin hume har view alag se nahi chahiye. Hume sirf <strong>total</strong> chahiye.` },
    { type: 'callout', tone: 'term', title: 'In-memory aggregation aur window', html: `<strong>Ye kya hai:</strong> events ko RAM mein jodna, aur ek tay time (<strong>window</strong>, jaise 5 second) ke baad sirf total DB mein likhna. Roadmap ke shabdon mein: "count 1,000 likes, write once".<br><strong>Kyun chahiye:</strong> 50,000 writes ki jagah 1 write. Hot key ka sabse seedha ilaaj.<br><strong>Iske bina:</strong> ek viral video ka counter poore shard ko garam kar deta hai.<br><strong>Kahan nahi chalega:</strong> chat messages, payments, orders. Inhe har ek alag save karna hai.` },
    { type: 'callout', tone: 'term', title: 'Aggregator aur write-behind', html: `<strong>Ye kya hai:</strong> <strong>aggregator</strong> = wo consumer jo jodne ka kaam karta hai. Kafka mein partition key = <code>video_id</code>, to ek video ke saare events ek hi aggregator ke paas aate hain. <strong>Write-behind</strong> (write-back) = pehle tez jagah (RAM ya Redis <code>INCR</code>) mein likho, DB mein baad mein ek saath. Ye bhi isi rung ka roop hai.<br><strong>Kyun chahiye:</strong> live counter turant badhta dikhe, aur DB pe bojh na pade.<br><strong>Iske bina:</strong> har +1 seedha DB pe.<br><strong>Khatra:</strong> flush se pehle crash = RAM ka count gaya, agar tumne replay ka intezaam nahi kiya.` },
    { type: 'p', html: `<strong>Aggregation lab.</strong> Ek viral video pe views/s aur window chuno. Model: ek DB row ~1,000 updates/s tak jhel sakti hai (row lock ki wajah se updates ek ke baad ek hote hain; ye napkin number hai). Phir crash ka order badal ke dekho.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div><label>Ek video pe views/s: <strong class="ag-rv"></strong></label><input class="ag-r" type="range" min="2" max="5" step="0.1" value="4"></div>
        <div style="margin:8px 0;display:flex;flex-wrap:wrap;gap:6px" class="ag-w"></div>
        <div style="margin:4px 0 8px;display:flex;flex-wrap:wrap;gap:6px"><button type="button" class="chip on ag-c1">Flush, phir offset commit</button><button type="button" class="chip ag-c2">Offset commit, phir flush</button></div>
        <div style="font-size:13px;color:var(--ink-2)">Row 91 ka load meter</div>
        <div style="height:14px;background:var(--surface-2);border-radius:7px;overflow:hidden"><div class="ag-bar" style="height:14px"></div></div>
        <div class="stats">
          <div class="stat"><span>Events per window</span><strong class="ag-e"></strong></div>
          <div class="stat"><span>DB writes/s (is video)</span><strong class="ag-db"></strong></div>
          <div class="stat"><span>Count kitna purana</span><strong class="ag-st"></strong></div>
          <div class="stat"><span>Crash pe</span><strong class="ag-cr"></strong></div>
        </div>
        <div class="calc-note ag-note"></div>`;
      const $ = c => el.querySelector(c);
      const WS = [0, 1, 5, 10, 60];
      let wi = 2, safe = true;
      WS.forEach((w, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = w === 0 ? 'Har event likho' : w + ' s window'; b.onclick = () => { wi = i; upd(); }; $('.ag-w').appendChild(b); });
      $('.ag-c1').onclick = () => { safe = true; upd(); }; $('.ag-c2').onclick = () => { safe = false; upd(); };
      const f = n => n >= 1e3 ? Math.round(n).toLocaleString('en-IN') : (n < 1 ? n.toFixed(2) : Math.round(n) + '');
      const upd = () => {
        const r = Math.round(Math.pow(10, +$('.ag-r').value) / 10) * 10, W = WS[wi];
        const ev = W === 0 ? 1 : r * W, db = W === 0 ? r : 1 / W, u = db / 1000;
        $('.ag-w').querySelectorAll('.chip').forEach((b, i) => b.classList.toggle('on', i === wi));
        $('.ag-c1').classList.toggle('on', safe); $('.ag-c2').classList.toggle('on', !safe);
        $('.ag-rv').textContent = f(r);
        $('.ag-e').textContent = W === 0 ? '1 (har event)' : f(ev);
        $('.ag-db').textContent = f(db);
        $('.ag-st').textContent = W === 0 ? '~0 s' : '~' + W + ' s';
        $('.ag-cr').textContent = W === 0 ? '0 khoye' : safe ? 'replay, 0 khoye' : f(ev) + ' views khoye';
        const bar = $('.ag-bar'); bar.style.width = Math.max(1, Math.min(100, u * 100)) + '%'; bar.style.background = u > 1 ? 'var(--red)' : u > 0.7 ? 'var(--amber)' : 'var(--green)';
        $('.ag-note').innerHTML = (W === 0 ? (u > 1 ? `<strong>Row ${u.toFixed(1)}× overloaded.</strong> Har view ek UPDATE, sab ek hi row pe. ` : `Abhi row jhel rahi hai (${Math.round(u * 100)}%). `) :
          `${f(ev)} views → 1 write. Row load ${(u * 100).toFixed(u * 100 < 1 ? 3 : 0)}%. `) +
          (W === 0 ? 'Window chuno aur dekho writes kaise girte hain.' : safe ? 'Crash hua to aggregator pichhle committed offset se dobara padhega aur wahi window phir ginega. Flush ke saath last offset bhi likho, taaki double count na ho.' : `Galat order: Kafka ko lagta hai ye events ho chuke. Crash pe RAM ke ${f(ev)} views hamesha ke liye gaye (undercount).`);
      };
      $('.ag-r').addEventListener('input', upd); upd();
    }},
    { type: 'p', html: `<strong>Kharcha:</strong> count window jitna purana (5 s), crash pe recount (offsets flush ke baad commit, aur idempotent flush), aur sirf <strong>jodne layak</strong> data pe kaam karta hai (counts, sums, min/max, latest value). Isi idea ke bade roop stream processors hain (Flink, Kafka Streams) jo windows, late events aur state checkpoints sambhalte hain; detail: <a href="#/big-data">batch vs stream processing</a>.` },
    { type: 'callout', tone: 'tip', title: 'Kab rukna hai (aggregation)', html: `Ye seedhi ka sabse upar ka rung hai. Iske baad bas Kafka partitions aur aggregator workers badhao; dono horizontally scale hote hain. Window utna hi bada rakho jitna purana count users ko chal jaaye (views ke liye 5-10 s theek, billing ke liye nahi).` },
    { type: 'h2', text: 'Escalation ladder: slider ghumao' },
    { type: 'p', html: `Slider = peak pe <strong>view events per second</strong> (har event ~200 bytes). Widget kam se kam zaroori rung, architecture, "OK" milne ki latency, data kitna purana dikhega, machines, aur agla rung kyun, sab dikhata hai. Chip daba ke kisi neeche wale rung pe atak ke dekho.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div><label>Peak writes (events) per second: <strong class="pw-v"></strong></label><input class="pw-s" type="range" min="2" max="7" step="0.05" value="4.6"></div>
        <div class="pw-chips" style="margin:10px 0;display:flex;flex-wrap:wrap;gap:6px"></div>
        <div class="pw-ladder" style="display:grid;gap:6px"></div>
        <svg class="pw-svg" viewBox="0 0 360 122" style="width:100%;max-width:520px;height:auto;margin-top:12px;display:block"></svg>
        <div class="stats">
          <div class="stat"><span>Zaroori rung</span><strong class="pw-need"></strong></div>
          <div class="stat"><span>"OK" latency</span><strong class="pw-ack"></strong></div>
          <div class="stat"><span>DB mein dikhne tak</span><strong class="pw-stale"></strong></div>
          <div class="stat"><span>Machines (approx)</span><strong class="pw-mach"></strong></div>
        </div>
        <div class="calc-note pw-note"></div>`;
      const $ = c => el.querySelector(c);
      const R = [
        { n: 'Ek-ek INSERT, ek Postgres', cap: 5e3, ack: 5, st: 'turant', why: 'Har INSERT apna transaction, apna fsync, aur har index ka update. ~5k/s pe disk aur CPU full.' },
        { n: '+ Batching (500 rows ek saath)', cap: 2e4, ack: 30, st: '~50 ms', why: 'Commit ka kharcha 500 rows mein bant gaya (~20k rows/s), lekin B-tree indexes abhi bhi disk pe random jagah update hote hain. Ek node ki hadd.' },
        { n: '+ LSM DB (Cassandra/ScyllaDB, 3 nodes RF 3)', cap: 5e4, ack: 30, st: '~50 ms', why: 'Sequential appends: ~50k/s per node. Lekin har write teeno replicas pe jaata hai, to 3 nodes = 50k/s. Ek replica set ki hadd.' },
        { n: '+ Sharding (key: video_id hash)', cap: 1e6, ack: 30, st: '~50 ms', why: 'Shards jodo, capacity badhao: 1M/s pe ~60 nodes. Lekin DB ko <em>peak</em> ke liye size karna pada (baaki time ~2/3 khaali), aur DB slow hua to ingest API seedha fail.' },
        { n: '+ Kafka buffer (DB average ke liye)', cap: 3e6, ack: 10, st: '~1 s (spike pe minutes)', why: 'Kafka spike sokh leta hai, DB sirf average (peak/3) ke liye. Lekin har event abhi bhi ek DB write, aur viral video ke saare writes ek hi row pe (hot key).' },
        { n: '+ In-memory aggregation (5 s window)', cap: Infinity, ack: 10, st: '~5 s', why: 'Counters ke liye ~100 events → 1 write. Ab limit Kafka partitions aur aggregator workers, dono horizontally badhte hain. Kharcha: count ~5 s purana, aur crash pe recount ka intezaam.' },
      ];
      const f = n => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + 'k' : Math.round(n).toString();
      const model = (w, r) => {
        const dbW = r === 5 ? w / 100 : r === 4 ? w / 3 : w;
        const db = r <= 1 ? 1 : r === 2 ? 3 : Math.max(3, Math.ceil(dbW / 5e4) * 3);
        const brokers = r >= 4 ? Math.max(3, Math.ceil(3 * w / 5e5)) : 0;
        const agg = r >= 4 ? Math.max(2, Math.ceil(w / 2e5)) : 0;
        const app = Math.max(2, Math.ceil(w / 1e4));
        return { dbW, db, brokers, agg, app, util: w / R[r].cap };
      };
      let forced = -1;
      const chips = $('.pw-chips');
      ['Auto'].concat(R.map((x, i) => 'Rung ' + i)).forEach((t, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = t;
        b.onclick = () => { forced = i - 1; upd(); }; chips.appendChild(b);
      });
      const box = (t, x, y, w, on) => `<g opacity="${on ? 1 : 0.3}"><rect x="${x}" y="${y}" width="${w}" height="34" rx="7" fill="${on ? 'var(--accent-soft)' : 'var(--surface-2)'}" stroke="${on ? 'var(--accent)' : 'var(--line-2)'}" ${on ? '' : 'stroke-dasharray="4 3"'}/><text x="${x + w / 2}" y="${y + 21}" text-anchor="middle" font-size="12" fill="var(--ink)" font-family="var(--f-body)">${t}</text></g>`;
      const ln = (x1, y1, x2, y2, on) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink-3)" stroke-width="1.2" opacity="${on ? 1 : 0.2}"/>`;
      const upd = () => {
        const w = Math.round(Math.pow(10, +$('.pw-s').value));
        const need = R.findIndex(x => w <= x.cap);
        const r = forced < 0 ? need : forced;
        const m = model(w, r);
        $('.pw-v').textContent = f(w) + '/s';
        chips.querySelectorAll('.chip').forEach((b, i) => b.classList.toggle('on', i - 1 === forced));
        $('.pw-ladder').innerHTML = R.map((x, i) => {
          const u = w / x.cap, pct = Math.min(100, u * 100);
          const col = u > 1 ? 'var(--red)' : u > 0.7 ? 'var(--amber)' : 'var(--green)';
          const tag = i < need ? 'kaafi nahi' : i === need ? 'yahan tak chadho' : 'abhi zaroorat nahi';
          return `<div style="border:1px solid ${i === r ? 'var(--accent)' : 'var(--line)'};border-radius:var(--r-sm);padding:6px 10px;background:${i === r ? 'var(--accent-soft)' : 'var(--surface)'};opacity:${i > need && i !== r ? 0.6 : 1}">
            <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px;font-size:14px"><strong>${i}. ${x.n}</strong><span style="color:var(--ink-3);font-size:12px">max ~${x.cap === Infinity ? '∞ (workers badhao)' : f(x.cap) + '/s'} · ${tag}</span></div>
            <div style="height:6px;background:var(--surface-2);border-radius:3px;margin-top:4px"><div style="height:6px;width:${x.cap === Infinity ? 2 : pct}%;background:${col};border-radius:3px"></div></div></div>`;
        }).join('');
        const k = r >= 4;
        const dbTxt = r === 0 ? 'Postgres (1 node)' : r === 1 ? 'Postgres, batched inserts' : r === 2 ? 'LSM DB: 3 nodes, RF 3' : `LSM DB: ${m.db} nodes, ${m.db / 3} shards × RF 3`;
        $('.pw-svg').innerHTML = ln(85, 37, 95, 37, true) + ln(175, 37, 185, 37, k) + ln(260, 37, 270, 37, k) +
          ln(135, 54, 135, 82, !k) + ln(312, 54, 312, 82, k) +
          box('Clients', 10, 20, 75, true) + box(r >= 1 ? 'Ingest+batch' : 'Ingest', 95, 20, 80, true) + box('Kafka', 185, 20, 75, k) + box(r === 5 ? 'Aggregator' : 'Consumer', 270, 20, 85, k) +
          box(dbTxt, 60, 82, 290, true);
        $('.pw-need').textContent = need + '. ' + R[need].n.replace('+ ', '').replace(/ \(.*/, '');
        $('.pw-ack').textContent = m.util > 1 ? 'timeouts' : '~' + R[r].ack + ' ms';
        $('.pw-stale').textContent = m.util > 1 ? 'events khoye' : R[r].st;
        $('.pw-mach').textContent = String(m.app + m.db + m.brokers + m.agg);
        $('.pw-note').innerHTML = (m.util > 1 ? `<strong>Rung ${r} pe atke ho: ${Math.round(m.util * 10) / 10}× overload.</strong> ` : '') +
          `Rung ${r} pe: DB tak ${f(m.dbW)} writes/s; ${m.app} ingest servers, ${m.db} DB node${m.db > 1 ? 's' : ''}${k ? `, ${m.brokers} Kafka brokers, ${m.agg} ${r === 5 ? 'aggregators' : 'consumers'}` : ''}. Data ingress ~${w * 200 >= 1e9 ? (w * 200 / 1e9).toFixed(1) + " GB/s" : f(w * 200 / 1e6) + " MB/s"}. <strong>Agla rung kyun:</strong> ${R[r].why}` +
          `<br>Assumptions (roadmap phase 4): Postgres ~5k-20k simple writes/s, LSM node ~50k writes/s, replication factor 3, Kafka broker ~500k small msgs/s, ingest server ~10k events/s, peak = 3× average, aggregation 100:1 (counters only).`;
      };
      $('.pw-s').addEventListener('input', upd); upd();
    }},
    { type: 'callout', tone: 'tip', title: 'Widget se kya seekhna hai', html: `Default ~40k events/s pe rung 2 (LSM, 3 nodes) kaafi hai. "Rung 1" chip: Postgres batched bhi 2× overloaded. 2M/s pe rung 4: sirf Kafka ki wajah se DB ~2M ki jagah ~667k/s ke liye size hota hai. 10M/s pe rung 5: aggregation se DB pe sirf ~100k writes/s. Dhyaan do: Kafka aur aggregation ke baad "OK" fast hai, lekin data <strong>der se</strong> dikhta hai. Write scaling ka asli sauda yahi hai: <strong>freshness dekar throughput lena</strong>.` },
    { type: 'callout', tone: 'warn', title: 'Aggregation har data pe nahi chalti', html: `View count, likes, clicks, metrics: inka sirf <em>jod</em> chahiye, to 1,000 events ko "+1,000" bana sakte ho. Chat messages, payments, orders: har ek ko alag se save karna hai. Wahan seedhi rung 4 pe ruk jaati hai: Kafka + zyada shards. Location updates beech mein hain: sirf <em>latest</em> location chahiye to har driver ki purani pings phenk do (last-write-wins), aur history alag sasti storage mein.` },

    { type: 'h2', text: 'Architecture ko rung by rung badhte dekho' },
    { type: 'flow', height: 340,
      nodes: [
        { id: 'c', label: 'Viewers', sub: 'view events', x: 75, y: 160, w: 120, kind: 'client', info: 'Ye kya hai: xyz.com ke viewers ki apps. Kyun yahan: har video play pe app ek chhota event bhejti hai: { video_id, user_id, ts }. IPL final pe ye 10 guna ho jaata hai.' },
        { id: 'app', label: 'Ingest API', x: 240, y: 160, w: 130, kind: 'server', meter: true, load: 20, info: 'Ye kya hai: wo servers jo events lete hain (ingest = andar lena). Stateless. Kyun yahan: rung 1 se ye events ko memory mein thodi der jama karke batch mein bhejte hain; rung 4 se sirf Kafka mein.' },
        { id: 's1', label: 'Postgres', sub: 'views table', x: 630, y: 90, w: 140, kind: 'data', meter: true, load: 20, info: 'Ye kya hai: database jahan views pakke hote hain. Shuru mein ek Postgres. Rung 2 pe LSM-based DB (Cassandra/ScyllaDB). Rung 3 pe ye shard A ban jaata hai: video_id ke hash ka aadha hissa.' },
        { id: 's2', label: 'Shard B', sub: 'hash half 2', x: 630, y: 240, w: 140, kind: 'data', hidden: true, meter: true, load: 40, info: 'Ye kya hai: doosra shard (data ka doosra hissa, apni machines pe), rung 3. Kyun yahan: writes do jagah bant jaate hain. Key ka hash decide karta hai ki row kis shard pe jaayegi. Detail: Sharding lesson.' },
        { id: 'k', label: 'Kafka', sub: 'topic: views', x: 300, y: 290, w: 120, kind: 'queue', hidden: true, info: 'Ye kya hai: Kafka, ek pakka append-only log (events line mein end pe jude), rung 4. Kyun yahan: ingest API event yahan jod ke turant OK bolta hai, aur spike yahin jama hota hai. Partition key = video_id, to ek video ke events ek hi partition mein order se.' },
        { id: 'agg', label: 'Aggregator', sub: 'RAM counts', x: 470, y: 290, w: 140, kind: 'server', hidden: true, meter: true, load: 30, info: 'Ye kya hai: Kafka se padhne wala program. Rung 4 pe simple consumer (har event ek write). Rung 5 pe aggregator: 5 s tak har video ka count RAM mein jodta hai, phir ek write. Offsets flush ke BAAD commit karta hai.' },
      ],
      edges: [{ a: 'c', b: 'app' }, { a: 'app', b: 's1', id: 'a1' }, { a: 'app', b: 's2', id: 'a2' }, { a: 'app', b: 'k' }, { a: 'k', b: 'agg' }, { a: 'agg', b: 's1' }, { a: 'agg', b: 's2' }],
      scenarios: [
        { name: 'Rung 0-3: batch, LSM, shard', steps: [
          { title: 'Rung 0: ek-ek INSERT', text: 'Har event pe ek INSERT, ek transaction, ek fsync, aur <code>views</code> table ke teen indexes ka update. 1k/s tak sab theek.', go: ['c>app>s1', 'res:s1>app>c'], msg: 'INSERT INTO views (video_id, user_id, ts) VALUES (91, 7, now());  -- ×1, COMMIT, fsync' },
          { title: '5k/s paar: disk full', text: 'Symptom: DB ka disk I/O aur CPU full, commit latency badhi, jabki har INSERT simple hai. Kaam ka bada hissa "commit + fsync" hai, data nahi.', flood: { paths: ['c>app>s1'], n: 12 }, after: { s1: { state: 'hot', load: 97, sub: 'fsync per row' } } },
          { title: 'Rung 1: batching', text: 'Ingest API 50 ms ya 500 events (jo pehle ho) jama karta hai, phir ek multi-row INSERT (ya <code>COPY</code>). Ek commit, ek fsync, 500 rows. Kharcha: event ~50 ms der se DB mein, aur flush se pehle server crash = buffer gaya (isliye client ko OK flush ke baad do, ya rung 4 tak jao).', go: 'app>s1', set: { app: { sub: 'buffer 500 / 50 ms' } }, after: { s1: { state: 'ok', load: 35, sub: 'batched' } }, msg: 'INSERT INTO views VALUES (91,7,..), (91,8,..), ... ×500;  -- 1 COMMIT' },
          { title: 'Rung 2: LSM DB', text: 'Postgres ke B-tree indexes har row pe disk ki random jagah chhoote hain. LSM DB pehle RAM (memtable) + sequential log mein likhta hai, baad mein background mein sorted files merge karta hai (compaction). Writes sasti, reads thodi mehngi. Detail: <a href="#/db-internals">LSM tree</a>.', go: 'app>s1', set: { s1: { label: 'Cassandra A', sub: 'memtable + log', state: 'ok', load: 30 } } },
          { title: 'Rung 3: shard', text: 'Ek replica set ~50k/s. Aage: <code>hash(video_id)</code> se data shards mein baanto. Key aisi chuno jo achhi tarah phaile; <code>date</code> jaisi key se aaj ke saare writes ek shard pe jaate. Detail: <a href="#/sharding">sharding</a>.', show: ['s2'], set: { s2: { label: 'Cassandra B' } }, parallel: true, go: ['c>app>s1', 'c>app>s2'], after: { s1: { load: 45 }, s2: { load: 45 } } },
        ]},
        { name: 'Rung 4-5: Kafka, aggregation', intro: 'Do shards hain. Ab IPL final: 10 guna spike.', steps: [
          { title: 'Spike: DB slow, API timeouts', text: 'DB peak ke liye size nahi tha. Writes slow, ingest API ke threads atke, timeouts. Phone apps retry karte hain, aur load badhta hai. Events khote hain.', show: ['s2'], set: { s1: { label: 'Cassandra A' }, s2: { label: 'Cassandra B' } }, flood: { paths: ['c>app>s1', 'c>app>s2'], n: 16 }, after: { s1: { state: 'hot', load: 99 }, s2: { state: 'hot', load: 99 }, app: { state: 'warn', load: 95, sub: 'timeouts' } } },
          { title: 'Rung 4: Kafka beech mein', text: 'Ingest API ab sirf Kafka mein append karta hai (sequential disk write, replicated) aur turant OK. DB ko seedha koi nahi chhoota. Spike Kafka ke log mein jama ho jaata hai. Detail: <a href="#/kafka">Kafka</a>.', show: ['k'], hide: ['a1', 'a2'], go: ['c>app>k', 'res:app>c'], after: { app: { state: 'ok', load: 30, sub: '' }, k: { sub: 'lag: 2 min' } }, msg: 'produce views  key=91  {"video":91,"user":7}  acks=all' },
          { title: 'Consumer apni speed se', text: 'Consumer Kafka se padhta hai aur DB mein <em>DB ki</em> speed se likhta hai. Spike khatam hone pe lag apne aap khatam. DB ab average ke liye size hota hai, peak ke liye nahi.', show: ['agg'], set: { agg: { label: 'Consumer', sub: '1 event = 1 write' } }, go: ['k>agg', 'agg>s1', 'agg>s2'], after: { s1: { state: 'ok', load: 60 }, s2: { state: 'ok', load: 60 } } },
          { title: 'Hot key: viral video', text: 'Video 91 viral. Uske saare events ek partition mein aur ek hi row pe <code>count = count + 1</code>, hazaaron baar per second. Ek row = ek shard = ek garam jagah.', go: ['k>agg>s1', 'k>agg>s1'], after: { s1: { state: 'hot', load: 95, sub: 'row 91 garam' } } },
          { title: 'Rung 5: memory mein jodo', text: 'Aggregator 5 second tak RAM mein ginta hai: <code>{91: 48,210, 77: 312, ...}</code>. Phir har video ke liye <em>ek</em> write. 48,210 writes → 1. Roadmap: "count 1,000 likes, write once". Kafka offsets flush ke baad commit.', set: { agg: { label: 'Aggregator', sub: 'v91: +48,210' } }, go: ['k>agg', 'agg>s1'], after: { s1: { state: 'ok', load: 15, sub: '1 write / 5 s / video' } }, msg: 'UPDATE video_views SET count = count + 48210 WHERE video_id = 91;' },
        ]},
        { name: 'Failure: consumer lag', intro: 'Top rung pe ho. Match ka last over, events 20 guna.', steps: [
          { title: 'Kafka sab sambhal leta hai...', text: 'Ingest API khush, Kafka append karta ja raha. Koi event nahi khoya.', show: ['s2', 'k', 'agg'], hide: ['a1', 'a2'], set: { agg: { label: 'Aggregator', sub: 'RAM counts' }, s1: { label: 'Cassandra A', sub: '' }, s2: { label: 'Cassandra B' } }, flood: { paths: ['c>app>k'], n: 14 }, after: { k: { state: 'warn', sub: 'lag: 6 min' } } },
          { title: '...lekin aggregator peeche', text: 'Aggregators ka CPU full, wo utni tez nahi padh pa rahe jitna aa raha hai. <strong>Consumer lag</strong> = log mein likhe gaye aur padhe gaye ke beech ka fasla. 6 minute ka lag = DB ka count 6 minute purana.', go: 'k>agg', after: { agg: { state: 'hot', load: 99, sub: 'CPU 100%' } } },
          { title: 'User ko counter atka dikhta hai', text: 'Video page "1.2M views" pe atka hai jabki sab dekh rahe hain. Data khoya nahi, bas der hai. Lekin agar isi count se kuch aur decide hota hai (trending list, ads billing), to wo bhi 6 minute purana.', show: ['a1'], go: ['c>app>s1', 'res:s1>app>c'], after: { s1: { state: 'warn', sub: 'count: 6 min purana' } } },
          { title: 'Fix', text: 'Lag pe alert lagao (sirf CPU pe nahi). Aggregators badhao, lekin ek consumer group mein partitions se zyada consumers kaam nahi aate, isliye known events se pehle partitions kaafi rakho. Window bada karo (10 s) taaki DB writes aur kam hon. UI pe "~1.2M" jaisa approx count chalega.', hide: ['a1'], go: ['k>agg', 'agg>s1', 'agg>s2'], after: { k: { state: 'ok', sub: 'lag: 3 s' }, agg: { state: 'ok', load: 60, sub: '8 workers' }, s1: { state: 'ok', sub: 'fresh' } } },
        ]},
        { name: 'Failure: aggregator crash', intro: 'Aggregator ke RAM mein 4 second ke counts hain, abhi flush nahi hue.', steps: [
          { title: 'Crash', text: 'Process mar gaya. RAM ke counts gaye.', show: ['s2', 'k', 'agg'], hide: ['a1', 'a2'], set: { s1: { label: 'Cassandra A', sub: '' }, s2: { label: 'Cassandra B' }, agg: { label: 'Aggregator', state: 'down', sub: 'DOWN: RAM gaya', load: 0 } }, go: 'lost:k>agg' },
          { title: 'Agar offsets pehle commit kiye the', text: 'Galat tareeka: event padhte hi offset commit. Kafka sochta hai ye events ho gaye. Restart pe wo dobara nahi aayenge: 4 second ke views hamesha ke liye gaye (undercount).', focus: ['k'], set: { k: { state: 'warn', sub: 'offset aage: data gaya' } } },
          { title: 'Sahi tareeka: flush ke baad commit', text: 'Offsets tabhi commit karo jab DB mein flush ho gaya. Restart pe aggregator pichhle committed offset se dobara padhta hai aur wahi 4 second phir se ginta hai. Kafka ki retention ki wajah se ye replay possible hai.', set: { agg: { state: 'ok', sub: 'replay from offset', load: 40 }, k: { state: 'ok', sub: 'replay' } }, go: ['k>agg', 'agg>s1'] },
          { title: 'Double count ka khatra', text: 'Agar flush ho gaya aur commit se pehle crash hua, to replay pe wahi count dobara judega (overcount). Ilaaj: flush ke saath hi DB mein "last applied offset" bhi likho (ek hi write mein), aur replay pe pehle se applied offsets skip karo. Ye idempotent write hai. Views jaise counters mein thoda overcount aksar chal jaata hai; billing mein nahi.', go: 'agg>s1', after: { s1: { sub: 'count + last_offset' } }, msg: 'UPDATE video_views SET count = count + 48210, last_offset = 99812\nWHERE video_id = 91 AND last_offset < 99812;' },
        ]},
      ],
    },

    { type: 'table', head: ['Rung', 'Symptom jo isse force karta hai', 'Kya badhta hai', 'Kharcha', 'Kahan haarta hai'], rows: [
      ['Batching', 'Bahut chhote transactions, commit/fsync bound', 'Rows per second per node', 'Thodi der, buffer crash risk', 'Per-row index kaam, ek node'],
      ['LSM DB', 'B-tree random writes, disk IOPS full', 'Writes per node (sequential)', 'Reads mehngi, compaction, query limits', 'Ek replica set'],
      ['Sharding', 'Ek node/replica set ki hadd, data TB mein', 'Total write capacity (linear-ish)', 'Cross-shard queries, resharding', 'Hot keys; peak sizing'],
      ['Kafka buffer', 'Spikes pe timeouts, events khote hain', 'Peak absorb; DB average pe', 'Async, consumer lag, ek aur cluster', 'Har event abhi bhi ek write'],
      ['Aggregation', 'Counters, ek row pe hazaaron writes', 'Writes 100× tak kam', 'Staleness, recount logic', 'Sirf jodne layak data'],
    ], caption: 'Roadmap: "Batch writes → write-optimised DB (LSM) → shard by a well-spread key → buffer through Kafka → aggregate in memory before writing."' },

    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `<strong>1. "Writes slow hain, read replicas laga do."</strong> Replicas har write dobara karti hain. Write capacity same rehti hai, aur kharcha badhta hai.<br><strong>2. "Writes ko Redis cache mein likh do, ho gaya."</strong> Redis RAM hai. Bina persistence ke restart = data gaya. Redis mein <code>INCR</code> karke baad mein DB mein flush karna rung 5 ka hi ek roop hai, aur uske crash ke niyam wahi hain.<br><strong>3. "Kafka laga diya to DB ka load kam ho gaya."</strong> Kafka load ko <em>time mein phaila</em> deta hai, kam nahi karta. Average load DB ko phir bhi uthana hai. Kam karna hai to batching ya aggregation.<br><strong>4. "Sharding se sab theek."</strong> Ek viral video ki saari writes ek hi key pe hain, aur ek key hamesha ek hi shard pe. Hot key ka ilaaj aggregation ya key splitting (<code>video91#0..#9</code>) hai.` },

    { type: 'h2', text: 'Real duniya mein' },
    { type: 'p', html: `Discord ne March 2023 ki post mein bataya ki unke trillions messages Cassandra pe the (177 nodes), jo LSM-based hai, aur hot partitions (ek bahut busy channel) poore cluster ki latency bigaad dete the. Unhone ScyllaDB (wahi LSM model, C++ mein) pe migrate kiya aur 72 nodes pe aa gaye, saath mein Rust ki "data services" jo ek hi data ki ek saath aayi requests ko ek query mein jodti hain. Kafka khud LinkedIn pe activity events (page views, clicks) ke bade write stream ko sambhalne ke liye bana tha: <a href="#/kafka">Kafka lesson</a>. Ad clicks aur metrics systems mein window-based aggregation (har minute ka count) standard industry tareeka hai.` },

    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `Pehle poochho: <strong>kya har event alag se chahiye, ya sirf uska jod/latest value?</strong> Phir neeche se chadho. Chhote-chhote commits? <strong>Batch</strong>. Ek node ki disk random writes se bhari? <strong>LSM DB</strong>. Ek replica set kaafi nahi ya data TB mein? <strong>Shard</strong> ek achhe phaile key se. Spikes pe timeouts? <strong>Kafka buffer</strong>, DB average ke liye. Counters/metrics, ya ek key pe hazaaron writes? <strong>Memory mein aggregate</strong> karke likho. Har rung pe batao ki freshness kitni gayi: interviewer yahi sunna chahta hai.` },

    { type: 'h2', text: 'Poori picture' },
    { type: 'p', html: `Saare paanch rung ek saath, xyz.com ke view counter mein. Upar wala hissa user ke "OK" tak hai (tez). Neeche wala sab baad mein, apni speed se. Buttons daba ke ek ek raasta dekho.` },
    { type: 'diagram', title: 'Scaling writes: poori seedhi xyz.com mein', height: 480,
      groups: [
        { label: 'Sync: user ko OK milne tak', x: 20, y: 30, w: 680, h: 120 },
        { label: 'Async: apni speed se', x: 20, y: 172, w: 680, h: 292 },
      ],
      nodes: [
        { id: 'cl', label: 'Viewer apps', sub: 'client batching', x: 95, y: 90, kind: 'client', info: 'Ye kya hai: xyz.com ki apps jo har play pe view event bhejti hain. Kyun yahan: app khud bhi 10 events ek request mein bhej sakti hai (client batching), taaki network round trips kam hon.' },
        { id: 'ing', label: 'Ingest API', sub: 'rung 1: batch', x: 280, y: 90, kind: 'server', info: 'Ye kya hai: events lene wale stateless servers. Kyun yahan: events ko 50 ms / 500 rows tak jama karke ek saath bhejte hain (rung 1), aur rung 4 ke baad sirf Kafka mein append karke turant OK dete hain.' },
        { id: 'kf', label: 'Kafka', sub: 'rung 4: topic views', x: 530, y: 90, w: 150, kind: 'queue', info: 'Ye kya hai: pakka, append-only log. Kyun yahan: spike ka shock absorber. Partition key = video_id, to ek video ke events ek hi aggregator ke paas. Consumer lag pe alert zaroori.' },
        { id: 'arc', label: 'Archiver', sub: 'raw → files', x: 230, y: 240, kind: 'server', info: 'Ye kya hai: doosra consumer group jo har raw event bade batches mein files mein likhta hai. Kyun yahan: analytics aur history ke liye har event chahiye, lekin DB mein nahi; sasti storage mein.' },
        { id: 'agg', label: 'Aggregator', sub: 'rung 5: 5 s window', x: 470, y: 240, w: 150, kind: 'server', info: 'Ye kya hai: consumer jo 5 second tak har video ka count RAM mein jodta hai, phir ek write. Kyun yahan: 50,000 writes → 1, hot key ka ilaaj. Flush ke baad hi offset commit, aur last offset DB mein.' },
        { id: 'pg', label: 'Video page', sub: 'count padhe', x: 640, y: 240, w: 120, kind: 'client', info: 'Ye kya hai: video page ka read path. Kyun yahan: ye dikhata hai ki count kitna fresh hai: window (5 s) + consumer lag jitna purana. Isliye UI pe "~1.2M" jaisa approx count.' },
        { id: 's3', label: 'Object storage', sub: 'raw history', x: 230, y: 390, w: 150, kind: 'data', info: 'Ye kya hai: S3 jaisi sasti file storage. Kyun yahan: har raw event ki history (billing audit, analytics) bade files mein. Detail: object storage lesson.' },
        { id: 'sa', label: 'Cassandra A', sub: 'rung 2+3: LSM', x: 430, y: 390, w: 150, kind: 'data', info: 'Ye kya hai: LSM database ka ek shard (rung 2 + 3). Kyun yahan: sequential writes sasti, aur hash(video_id) se data shards mein bant-ta hai. Har shard ki 3 copies (RF 3).' },
        { id: 'sb', label: 'Cassandra B', sub: 'doosra shard', x: 620, y: 390, w: 150, kind: 'data', info: 'Ye kya hai: doosra shard. Kyun yahan: writes ki capacity shards ke saath badhti hai. Achhi tarah phaili key (video_id ka hash) se koi shard akela garam nahi hota.' },
      ],
      edges: [
        { a: 'cl', b: 'ing', n: 1 },
        { a: 'ing', b: 'kf', n: 2, label: 'append' },
        { a: 'kf', b: 'agg', n: 3 },
        { a: 'agg', b: 'sa', n: 4, label: '+50,000' },
        { a: 'agg', b: 'sb' },
        { a: 'kf', b: 'arc', kind: 'evt' },
        { a: 'arc', b: 's3', label: 'batch files' },
        { a: 'pg', b: 'sb', kind: 'res', label: 'read' },
      ],
      paths: [
        { name: 'View → OK', text: 'App ne event bheja, ingest ne Kafka mein joda aur ~10 ms mein OK. DB ko abhi koi nahi chhoota.', go: ['cl>ing>kf', 'res:ing>cl'] },
        { name: 'Count update', text: 'Aggregator ne 5 second ke views RAM mein jode, phir har video ke shard pe ek write.', go: ['kf>agg>sa', 'agg>sb'] },
        { name: 'Raw history', text: 'Doosra consumer har raw event bade batches mein sasti storage mein likhta hai.', go: ['kf>arc>s3'] },
        { name: 'Read count', text: 'Video page shard se count padhta hai. Wo window + lag jitna purana ho sakta hai.', go: ['pg>sb', 'res:sb>pg'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Writes ko copies se sasta nahi kar sakte: har copy ko bhi write chahiye. Isliye alag seedhi.</li>
      <li>Seedhi: batching → LSM DB → sharding (achhi phaili key) → Kafka buffer → memory mein aggregation.</li>
      <li>Batching har write ka fixed kharcha (commit, fsync) baant-ti hai; per-row kaam nahi.</li>
      <li>LSM sequential append karta hai: writes sasti, reads aur compaction ka kharcha.</li>
      <li>Shard key achhi phaili ho (hash of id), time ya country nahi. Ek hot key ko sharding nahi baant sakti.</li>
      <li>Kafka load ko time mein phailata hai, kam nahi karta. "OK" = Kafka mein safe. Consumer lag monitor karo.</li>
      <li>Aggregation sirf jodne layak data pe (counts, sums, latest). Offsets flush ke baad commit karo.</li>
      <li>Har rung pe freshness dekar throughput milta hai. Interview mein ye sauda bolo.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['Write throughput 1,000× tak (batching, LSM, shards, aggregation)', 'Spikes pe bhi API fast aur events safe (Kafka)', 'Hot keys ka ilaaj (aggregation, key splitting)', 'DB average load ke liye size, peak ke liye nahi: sasta'],
      costs: ['Freshness: data ms se seconds/minutes der se dikhta hai', '"OK" ka matlab badalta hai: Kafka mein safe, DB mein nahi', 'Duplicates aur crash recovery: idempotent consumers, offset discipline', 'LSM aur sharding se queries ki aazadi kam (joins, ad-hoc queries)', 'Zyada systems: Kafka, aggregators, lag monitoring'] },

    { type: 'think', questions: [
      { q: 'xyz.com chat: 2 lakh messages/s peak. Aggregation laga sakte ho?', a: 'Nahi. Har message alag se store hona chahiye; "+1,000 messages" ka koi matlab nahi. Seedhi: client/server batching, LSM DB (Discord jaisa Cassandra/ScyllaDB), shard by channel_id (ya channel + time bucket taaki ek bada channel ek partition ko na phula de), aur Kafka buffer agar spikes hain. Bas.' },
      { q: 'Driver app har 4 second location bhejti hai, 10 lakh drivers online. Kitne writes/s, aur kahan likhoge?', a: '10 lakh / 4 = 2.5 lakh writes/s. Lekin sirf latest location chahiye matching ke liye: in-memory store (Redis GEO ya sharded in-memory service) mein overwrite karo, DB mein har ping nahi. History (trip ka raasta) Kafka se batch mein sasti storage (S3/Cassandra) mein. Ye "sirf latest value" wala aggregation hai.' },
      { q: 'Aggregator offsets pehle commit karta hai, phir DB mein flush. Kya galat ho sakta hai?', a: 'Commit ke baad, flush se pehle crash = wo events Kafka ki nazar mein ho chuke, restart pe dobara nahi aayenge: undercount, data gaya. Sahi order: flush, phir commit. Aur flush ke saath last offset likho taaki commit se pehle crash pe replay double count na kare.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Batching kis kharche ko kam karti hai?', options: ['Per-row index update', 'Har write ka fixed kharcha: round trip, commit, fsync', 'Disk ki size'], answer: 1, explain: 'Fixed kharcha 500 rows mein bant jaata hai. Per-row kaam utna hi rehta hai, isliye agla rung LSM.' },
      { q: 'LSM tree writes ke liye tez kyun hai?', options: ['Data compress karta hai', 'RAM + append-only log mein likhta hai, disk pe sorted files baad mein ek saath', 'Indexes nahi rakhta'], answer: 1, explain: 'Random in-place updates ki jagah sequential writes. Kharcha reads aur compaction pe.' },
      { q: 'Kafka buffer ke baad DB ka average load...', options: ['Kam ho jaata hai', 'Utna hi rehta hai, bas time mein phail jaata hai', 'Zero'], answer: 1, explain: 'Kafka peak ko smooth karta hai. Load kam karne ke liye batching ya aggregation.' },
      { q: 'Shard key ke liye sabse kharab choice, write-heavy events table ke liye?', options: ['hash(user_id)', 'hash(video_id)', 'created_at (time)'], answer: 2, explain: 'Saare naye writes "abhi" ke time pe hain, to ek hi shard garam. Hash wali keys phaila deti hain.' },
      { q: 'Viral video pe 1 lakh likes/s, ek hi row pe. Sabse seedha ilaaj?', options: ['Aur shards', 'Memory mein aggregate karke har kuch second ek write (ya counter ko sub-keys mein todna)', 'Read replicas'], answer: 1, explain: 'Ek key hamesha ek shard pe. Writes ki ginti hi kam karni padegi: aggregation ya key splitting.' },
    ]},
    { type: 'sources', note: 'Capacity numbers roadmap phase 4 ke napkin-maths ballparks hain (Postgres ~5k-20k writes/s, Cassandra node ~10k-50k writes/s, Kafka 100s of MB/s per broker), benchmark nahi.', items: [
      { title: 'How Discord Stores Trillions of Messages', publisher: 'Discord engineering blog', official: true, url: 'https://discord.com/blog/how-discord-stores-trillions-of-messages', year: 2023, used: '177 Cassandra nodes → 72 ScyllaDB nodes, hot partitions hurting cluster latency, LSM compaction overhead, request coalescing in Rust data services.' },
      { title: 'PostgreSQL docs: Populating a Database (COPY, batching inserts)', publisher: 'PostgreSQL', official: true, url: 'https://www.postgresql.org/docs/current/populate.html', used: 'Many inserts in one transaction / COPY are much faster than single-row commits.' },
      { title: 'Apache Kafka documentation: consumer offsets and delivery semantics', publisher: 'Apache Kafka', official: true, url: 'https://kafka.apache.org/documentation/#semantics', used: 'Committing offsets before vs after processing gives at-most-once vs at-least-once; replay from committed offset.' },
    ]},
  ],
});
