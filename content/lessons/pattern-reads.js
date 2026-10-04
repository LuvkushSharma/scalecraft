Lesson.register({
  id: 'pattern-reads',
  title: 'Scaling reads',
  minutes: 28,
  summary: `Har bada system read-heavy hota hai: log dekhte zyada hain, likhte kam. Reads badhne pe ek seedhi seedhi (ladder) hai: index → cache → read replicas → CDN → precomputed views. Har rung kab chadhna hai, kya kharcha hai, aur kahan wo bhi haar jaata hai.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `xyz.com pe ek video ek baar upload hota hai, lekin lakhon log use dekhte hain.<br>Har "dekhna" ek <strong>read</strong> hai: server ko data padh ke bhejna padta hai.<br>Jab reads bahut badh jaate hain, database thak jaata hai aur page slow ho jaata hai.<br>Is lesson mein ek seedhi (ladder) hai: 5 tareeke, saste se mehnge tak. Har baar sirf utna chadho jitna zaroori ho.` },
    { type: 'h2', text: 'Ab tak ki kahani' },
    { type: 'p', html: `Pichhle phases mein humne tools ek ek karke seekhe: <a href="#/db-internals">index</a>, <a href="#/caching">cache</a>, <a href="#/replication">replication</a>, <a href="#/cdn">CDN</a>. Phase 5 mein dekha ki kis sawaal pe kaunsa tool. Ab phase 6: <strong>patterns</strong>.` },
    { type: 'callout', tone: 'term', title: 'Pattern', html: `<strong>Ye kya hai:</strong> ek problem jo har bade design mein baar baar aati hai, aur uska ek tested ilaaj.<br><strong>Kyun chahiye:</strong> interview ya real kaam mein har baar zero se sochna nahi padta. Problem pehchaano, pattern lagao.<br><strong>Iske bina:</strong> tum har system mein wahi galtiyan dobara karoge, aur ilaaj galat order mein lagaoge.` },
    { type: 'p', html: `Pehla pattern sabse common hai: <strong>reads ka badhna</strong>. xyz.com pe ek video page hai: title, channel ka naam, views, comments. Ek video upload hota hai (1 write). Lekin lakhon log use dekhte hain (lakhon reads). Instagram feed, product pages, YouTube video ka metadata, sab yahi shakal hai.` },
    { type: 'callout', tone: 'term', title: 'Read, write aur read:write ratio', html: `<strong>Ye kya hai:</strong> <strong>read</strong> = data padhna (page kholna). <strong>Write</strong> = data badalna (video upload, comment). <strong>Read:write ratio</strong> = har ek write ke peeche kitne reads. URL shortener mein ~100:1 tha. Social feeds mein aksar 100:1 se 1000:1.<br><strong>Kyun chahiye:</strong> ye ratio batata hai ki mehnat kahan lagani hai. Ratio bada ho to system <strong>read-heavy</strong> hai, aur saara dhyaan read path ko sasta banane pe.<br><strong>Iske bina:</strong> tum galat cheez optimize karoge, jaise writes tez karna jab dard reads mein hai.` },
    { type: 'callout', tone: 'term', title: 'Escalation ladder (seedhi)', html: `<strong>Ye kya hai:</strong> ek seedhi jiske har daande (<strong>rung</strong>) pe ek naya tool hai. Neeche wale rung saste aur simple. Upar wale mehnge aur complex.<br><strong>Kyun chahiye:</strong> niyam simple ho jaata hai: <strong>tab tak upar mat chadho jab tak neeche wala rung sach mein haar na jaaye</strong>. Har rung ek symptom se trigger hota hai, jo tum metrics (graphs) mein dekh sakte ho.<br><strong>Iske bina:</strong> log seedha sabse mehenga tool laga dete hain, aur asli chhoti problem (jaise missing index) chhupi reh jaati hai.` },

    { type: 'h2', text: 'Seedhi ek nazar mein' },
    { type: 'p', html: `Pehle paanchon rung ek line mein. Har ek ka poora card aur kahani neeche "Har rung, thoda gehrai mein" mein hai. Abhi bas shakal dekho: <strong>symptom</strong> (kya dikh raha hai) → <strong>ilaaj</strong> → <strong>kharcha</strong>.` },
    { type: 'steps', items: [
      { t: 'Index', d: 'Index = DB ki kitaab ke peeche wala "index" page, jisse sahi row seedha mil jaati hai. Symptom: ek query slow hai kyunki DB poora table padh raha hai. Ilaaj: sahi column pe index. Kharcha: thoda disk, har write thoda slow.' },
      { t: 'Cache (Redis)', d: 'Cache = jo jawab baar baar maange jaate hain unki copy RAM mein (Redis ek aisi RAM wali store hai). Symptom: queries fast hain, lekin DB ka CPU same sawaalon ke jawab dete dete bhar gaya. Ilaaj: hot data RAM mein. Kharcha: purana (stale) data, invalidation, ek aur component.' },
      { t: 'Read replicas', d: 'Replica = DB ki poori copy jo sirf padhne ke kaam aati hai. Symptom: cache misses hi itne hain ki ek DB machine nahi jhel pa rahi, ya cache gire to DB mar jaata hai. Ilaaj: DB ki copies, reads unpe. Kharcha: copy thodi peeche (replication lag), zyada machines.' },
      { t: 'CDN', d: 'CDN = duniya bhar mein faile servers jo users ke paas copy rakhte hain. Symptom: sabke liye same content (images, video, public pages) bhi hamare main server tak aa raha hai, aur door ke users ko der lagti hai. Ilaaj: edge servers pe copy. Kharcha: CDN bill, purge (copy mitana) ka dhyaan.' },
      { t: 'Precomputed / materialized views', d: 'Precomputed view = jawab pehle se bana ke rakhna, jaise exam se pehle formula sheet. Symptom: jo page har user ke liye alag hai (feed, dashboard) wo har read pe joins aur ginti karta hai. Ilaaj: jawab pehle se taiyaar, read = ek lookup. Kharcha: write path pe extra kaam, data thoda purana.' },
    ]},
    { type: 'callout', tone: 'why', title: 'Ye order kyun?', html: `Har agla rung pichhle se <strong>zyada complex</strong> hai aur naye failure modes laata hai. Index ek SQL line hai. Cache ke saath stale data aata hai. Replicas ke saath lag. CDN ke saath purge. Precomputed views ke saath poora naya write pipeline. Isliye sabse sasta ilaaj pehle. Bahut log seedha Redis lagate hain jab asli dikkat ek missing index thi.` },

    { type: 'h2', text: 'Har rung, thoda gehrai mein' },
    { type: 'p', html: `Har rung ke liye ek hi format: xyz.com ki kahani numbers ke saath → tareeka seedhe shabdon mein → kab rukna hai → gehri lesson ka link.` },
    { type: 'h3', text: 'Rung 1: index (pehle hamesha yahi)' },
    { type: 'p', html: `<strong>Kahani:</strong> xyz.com ke channel page pe "is channel ke latest 20 videos" dikhte hain. <code>videos</code> table mein 1 crore (10 million) rows hain. Traffic sirf 20 requests/second hai, phir bhi page 0.5 second leta hai. Kyun? Kyunki DB ko pata hi nahi ki channel 77 ki videos kahan hain. Wo har row padh ke check karta hai.` },
    { type: 'callout', tone: 'term', title: 'Full table scan', html: `<strong>Ye kya hai:</strong> DB ka table ki <em>har</em> row ek ek karke padhna, jaise bina index ki kitaab mein ek shabd dhoondhne ke liye har page palatna.<br><strong>Kyun hota hai:</strong> jis column pe tum filter kar rahe ho (<code>channel_id</code>) uska koi index nahi.<br><strong>Iske bina (index ke bina):</strong> 1 crore rows × har request. Table badhegi, query aur slow hogi, chahe traffic kam ho.` },
    { type: 'callout', tone: 'term', title: 'Index', html: `<strong>Ye kya hai:</strong> DB ke andar ek alag sorted list (aksar B-tree naam ka tree), jo batati hai "channel 77 ki rows yahan hain". Jaise kitaab ke peeche wala index page.<br><strong>Kyun chahiye:</strong> DB seedha sahi jagah jaata hai. 1 crore rows ki jagah sirf ~4 tree levels aur 20 rows padhta hai.<br><strong>Iske bina:</strong> full scan. Cache ya replicas laga ke bhi har miss 500 ms ka rahega.<br><strong>Example:</strong> <code>CREATE INDEX ON videos (channel_id, created_at DESC)</code>: 500 ms → ~5 ms.` },
    { type: 'callout', tone: 'term', title: 'EXPLAIN', html: `<strong>Ye kya hai:</strong> ek SQL command jo query chalaane se pehle batata hai ki DB use <em>kaise</em> chalayega: full scan ("Seq Scan") ya index ("Index Scan").<br><strong>Kyun chahiye:</strong> slow query ka asli kaaran 10 second mein pata chal jaata hai.<br><strong>Iske bina:</strong> andaaze se ilaaj, jaise missing index ke upar Redis laga dena.` },
    { type: 'p', html: `<strong>Index lab.</strong> Table ka size badlo. Dekho full scan kitni rows padhta hai, aur index kitne levels. Assumption: full scan ~2 crore rows/second padhta hai, aur index ka har level ~1 ms (worst case, page disk se aaye).` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div><label>videos table mein rows: <strong class="ix-v"></strong></label><input class="ix-s" type="range" min="3" max="9" step="1" value="7"></div>
        <div class="stats">
          <div class="stat"><span>Full scan: rows padhi</span><strong class="ix-fr"></strong></div>
          <div class="stat"><span>Full scan: time</span><strong class="ix-ft"></strong></div>
          <div class="stat"><span>Index: tree levels</span><strong class="ix-h"></strong></div>
          <div class="stat"><span>Index: time</span><strong class="ix-it"></strong></div>
        </div>
        <div class="ix-bars" style="display:grid;gap:6px;margin-top:10px"></div>
        <div class="calc-note ix-note"></div>`;
      const $ = c => el.querySelector(c);
      const f = n => n >= 1e9 ? n / 1e9 + ' arab' : n >= 1e7 ? n / 1e7 + ' crore' : n >= 1e5 ? n / 1e5 + ' lakh' : n.toLocaleString('en-IN');
      const ms = x => x >= 1000 ? (x / 1000).toFixed(x >= 1e4 ? 0 : 1) + ' s' : (x < 10 ? x.toFixed(1) : Math.round(x)) + ' ms';
      const upd = () => {
        const n = Math.pow(10, +$('.ix-s').value);
        const full = n / 2e7 * 1000;
        const h = Math.ceil(Math.log(n) / Math.log(200));
        const idx = h * 1 + 1;
        $('.ix-v').textContent = f(n);
        $('.ix-fr').textContent = f(n);
        $('.ix-ft').textContent = ms(full);
        $('.ix-h').textContent = h + ' (+20 rows)';
        $('.ix-it').textContent = '~' + ms(idx);
        const mx = Math.max(full, idx);
        const bar = (t, v, col) => `<div><div style="font-size:13px;color:var(--ink-2)">${t}: ${ms(v)}</div><div style="height:10px;background:var(--surface-2);border-radius:5px"><div style="height:10px;width:${Math.max(1, v / mx * 100)}%;background:${col};border-radius:5px"></div></div></div>`;
        $('.ix-bars').innerHTML = bar('Full scan', full, 'var(--red)') + bar('Index', idx, 'var(--green)');
        $('.ix-note').innerHTML = (full < idx ? `Chhoti table pe full scan khud hi bahut tez hai (sab RAM mein). Yahan index se fark nahi padta, DB khud full scan chun leta hai. ` : `Index ${Math.round(full / idx).toLocaleString('en-IN')}× tez. `) + `Table 10 guna badi hui to full scan bhi 10 guna slow, lekin index mein levels mushkil se ek badhta hai (har level ~200 guna zyada rows sambhaalta hai).`;
      };
      $('.ix-s').addEventListener('input', upd); upd();
    }},
    { type: 'p', html: `<strong>Kharcha:</strong> har index disk leta hai. Har INSERT/UPDATE thoda slow hota hai, kyunki index bhi update hota hai. Composite index (do columns wala) ka column order query ke WHERE aur ORDER BY se match karna chahiye (leftmost prefix rule, <a href="#/db-internals">DB internals</a> lesson mein).` },
    { type: 'callout', tone: 'tip', title: 'Kab rukna hai (index)', html: `Jab <code>EXPLAIN</code> mein har important query index use kar rahi ho, aur DB CPU normal din pe ~60% se neeche ho, to bas. Agla rung tab chadho jab <strong>queries fast hain lekin bahut saari hain</strong>. Index query ki speed badhata hai, <em>queries ki ginti</em> kam nahi karta. Ek DB machine ~10k simple reads/second pe bhar jaati hai (roadmap ka napkin number).` },
    { type: 'h3', text: 'Rung 2: cache' },
    { type: 'p', html: `<strong>Kahani:</strong> index lag gaya, har query ~5 ms. Phir ek video viral hua: 1 lakh (100k) reads/second. Ek DB machine ~10k/s pe hi CPU 100% pe hai. Lekin dhyaan se dekho: zyadatar log <em>wahi</em> 50 popular videos dekh rahe hain. DB ek hi sawaal ka jawab hazaaron baar dobara bana raha hai.` },
    { type: 'callout', tone: 'term', title: 'Cache aur Redis', html: `<strong>Ye kya hai:</strong> cache = popular jawabon ki copy tez memory (RAM) mein. <strong>Redis</strong> = ek popular alag server jo key → value RAM mein rakhta hai aur ~1 ms mein deta hai.<br><strong>Kyun chahiye:</strong> same sawaal ka jawab DB se dobara banane ki jagah RAM se utha lo. DB ko sirf naye ya bhoole hue sawaal dikhte hain.<br><strong>Iske bina:</strong> har viewer ki request DB tak. 1 lakh/s = 10 DB machines sirf ek hi data baar baar padhne ke liye.<br><strong>Example:</strong> key <code>ch:77:latest</code> → 20 videos ki list, 60 second ke liye.` },
    { type: 'callout', tone: 'term', title: 'Cache hit, miss, hit rate, TTL', html: `<strong>Ye kya hai:</strong> <strong>hit</strong> = jawab cache mein mil gaya. <strong>Miss</strong> = nahi mila, DB se laana pada. <strong>Hit rate</strong> = 100 mein se kitne hits. <strong>TTL</strong> (time to live) = copy kitni der baad apne aap mit jaaye.<br><strong>Kyun chahiye:</strong> DB pe load = reads × (1 − hit rate). Yahi ek formula batata hai ki cache kitna bacha raha hai.<br><strong>Iske bina:</strong> tum "cache laga diya" bol ke khush ho jaoge, jabki misses hi DB ko gira rahe honge.` },
    { type: 'callout', tone: 'term', title: 'Cache-aside', html: `<strong>Ye kya hai:</strong> sabse common tareeka: app pehle cache dekhta hai. Miss pe DB se laata hai, phir cache mein TTL ke saath rakh deta hai.<br><strong>Kyun chahiye:</strong> simple hai, aur cache gira to bhi app DB se kaam chala sakta hai (agar DB jhel sake).<br><strong>Iske bina:</strong> har jagah alag alag logic, aur galti se purana data hamesha ke liye cache mein. Detail: <a href="#/caching-strategies">caching strategies</a>.` },
    { type: 'p', html: `<strong>Miss calculator.</strong> Reads aur hit rate badlo. Dekho DB tak kitne misses pahunchte hain, aur kitni DB machines chahiye (~10k reads/s har machine). Phir "Redis gira" dabao.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2"><div><label>Reads per second: <strong class="mc-rv"></strong></label><input class="mc-r" type="range" min="3" max="6.5" step="0.1" value="5"></div>
        <div><label>Cache hit rate: <strong class="mc-hv"></strong></label><input class="mc-h" type="range" min="50" max="99" step="1" value="90"></div></div>
        <div style="margin:8px 0"><button type="button" class="btn small mc-k">Redis gira</button></div>
        <div class="stats">
          <div class="stat"><span>Cache se (hits)</span><strong class="mc-hit"></strong></div>
          <div class="stat"><span>DB tak (misses)</span><strong class="mc-miss"></strong></div>
          <div class="stat"><span>DB machines chahiye</span><strong class="mc-db"></strong></div>
        </div>
        <div style="height:14px;background:var(--surface-2);border-radius:7px;margin-top:10px;display:flex;overflow:hidden"><div class="mc-b1" style="background:var(--green)"></div><div class="mc-b2" style="background:var(--red)"></div></div>
        <div class="calc-note mc-note"></div>`;
      const $ = c => el.querySelector(c);
      const f = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + 'k' : Math.round(n) + '';
      let down = false;
      $('.mc-k').onclick = () => { down = !down; $('.mc-k').classList.toggle('primary', down); $('.mc-k').textContent = down ? 'Redis wapas lao' : 'Redis gira'; upd(); };
      const upd = () => {
        const r = Math.round(Math.pow(10, +$('.mc-r').value)), h = +$('.mc-h').value / 100;
        const hit = down ? 0 : Math.round(r * h), miss = r - hit, db = Math.max(1, Math.ceil(miss / 1e4));
        const normal = Math.max(1, Math.ceil(Math.round(r * (1 - h)) / 1e4));
        $('.mc-rv').textContent = f(r) + '/s'; $('.mc-hv').textContent = Math.round(h * 100) + '%';
        $('.mc-hit').textContent = f(hit) + '/s'; $('.mc-miss').textContent = f(miss) + '/s'; $('.mc-db').textContent = db;
        $('.mc-b1').style.width = (hit / r * 100) + '%'; $('.mc-b2').style.width = (miss / r * 100) + '%';
        $('.mc-note').innerHTML = down
          ? `<strong>Redis down:</strong> saare ${f(r)}/s DB pe. Normal din ke ${f(r * (1 - h))}/s ka ~${Math.round(1 / (1 - h))} guna. Agar tumhare paas sirf ${normal} DB machine${normal > 1 ? 's' : ''} hai, site gir jaayegi. Isliye cache ke peeche bhi kuch bachaav chahiye (replicas, request collapsing).`
          : `DB load = ${f(r)} × (1 − ${h.toFixed(2)}) = ${f(miss)}/s. Hit rate 90% se 99% karo: misses 10 guna kam. Lekin 1M reads/s pe 90% hit = 100k misses/s, jo ek DB machine ka 10 guna hai. Wahan agla rung chahiye.`;
      };
      $('.mc-r').addEventListener('input', upd); $('.mc-h').addEventListener('input', upd); upd();
    }},
    { type: 'p', html: `<strong>Kharcha:</strong> stale data (TTL aur invalidation sambhaalna padta hai), Redis ke servers chalana, aur ek khatarnaak dependency: cache gira to DB pe poora load. <strong>Limit:</strong> misses. Aur long-tail data (har user ki alag search) cache mein hit hi nahi hota, kyunki har sawaal naya hai.` },
    { type: 'callout', tone: 'tip', title: 'Kab rukna hai (cache)', html: `Jab hit rate 90%+ ho, misses ek DB machine ke comfortable range mein hon (~60% CPU), aur Redis gire to bhi DB kuch minute jhel sake, to ruko. Agla rung tab: <strong>misses hi DB ko bhar dein</strong>, ya cache ka girna site gira sakta ho.` },
    { type: 'h3', text: 'Rung 3: read replicas' },
    { type: 'p', html: `<strong>Kahani:</strong> xyz.com ab 5 lakh (500k) reads/second pe hai. Cache 90% hits de raha hai. Phir bhi 10% misses = 50k/s DB pe. Ek DB machine ~10k/s jhelti hai. Matlab DB 5 guna overloaded. Aur agar Redis kabhi gira, to saare 500k/s DB pe.` },
    { type: 'callout', tone: 'term', title: 'Leader aur read replica', html: `<strong>Ye kya hai:</strong> <strong>leader</strong> (primary) = asli DB jahan saare writes jaate hain. <strong>Read replica</strong> = leader ki poori copy jo leader ke har change ko apne paas copy karti rehti hai, aur sirf reads ke liye use hoti hai.<br><strong>Kyun chahiye:</strong> 1 leader + 5 replicas = reads ke liye 6 machines. Aur leader gira to ek replica ko leader bana sakte ho.<br><strong>Iske bina:</strong> misses ek hi machine pe. Uski CPU limit hi poori site ki limit.<br><strong>Example:</strong> 50k misses/s ÷ 10k = 5 machines → 1 leader + 4-5 replicas.` },
    { type: 'callout', tone: 'term', title: 'Replication lag', html: `<strong>Ye kya hai:</strong> leader pe change hone aur replica tak pahunchne ke beech ka time. Aam taur pe milliseconds, load mein seconds bhi.<br><strong>Kyun zaroori hai samajhna:</strong> replica se padha to user ko kabhi kabhi purana data dikhega, apna hi abhi kiya change bhi.<br><strong>Iske bina (agar ignore karo):</strong> "maine title badla, save hi nahi hua!" jaise bug reports. Ilaaj: <strong>read-your-writes</strong>, yaani jisne abhi likha, uske reads kuch second leader se.` },
    { type: 'p', html: `<strong>Kharcha:</strong> har replica ek poori machine + poora data. <strong>Limit:</strong> replicas <strong>writes ke liye kuch nahi karti</strong>. Har replica ko har write apply karna padta hai. Bahut zyada replicas = leader pe change bhejne ka bojh aur zyada lag. Isliye log aam taur pe kuch hi replicas rakhte hain. Detail: <a href="#/replication">replication</a>.` },
    { type: 'callout', tone: 'tip', title: 'Kab rukna hai (replicas)', html: `Jab misses aur "cache down" dono ka load replicas mein ~60% se neeche fit ho jaaye, ruko. Agla rung tab: (a) bahut saara traffic <strong>public, sabke liye same</strong> content ka hai, ya door ke users slow hain → CDN; (b) read khud <strong>mehenga</strong> hai (joins) → precomputed views. Agar dard writes mein hai, to ye ladder chhodo aur <a href="#/pattern-writes">Scaling writes</a> dekho.` },
    { type: 'h3', text: 'Rung 4: CDN' },
    { type: 'p', html: `<strong>Kahani:</strong> 10 lakh (1M) reads/second. Inmein 80% requests aisi hain jo <strong>har user ke liye same</strong> hain: thumbnails, video page ka public data, channel page. Hamare servers Mumbai mein hain. US ke user ko har baar ~200 ms round trip. Aur origin pe 1M/s aa raha hai, jabki 80% jawab sabke liye ek jaise hain.` },
    { type: 'callout', tone: 'term', title: 'CDN, edge aur origin', html: `<strong>Ye kya hai:</strong> <strong>CDN</strong> (Content Delivery Network) = duniya bhar ke shehron mein rakhe servers (<strong>edges</strong>) ka network. Wo hamare apne servers (<strong>origin</strong>) se jawab ki copy le ke user ke paas rakh lete hain.<br><strong>Kyun chahiye:</strong> user ko paas wala edge ~15 ms mein jawab deta hai, aur 80% requests origin tak aati hi nahi.<br><strong>Iske bina:</strong> har user, har baar, poori duniya ka chakkar lagata hai, aur origin ko sabka load. Bandwidth ka bill bhi bada.` },
    { type: 'callout', tone: 'term', title: 'Cache-Control header aur purge', html: `<strong>Ye kya hai:</strong> <code>Cache-Control</code> = response ke saath ek line jo CDN ko batati hai "kya cache karo, kitni der". <code>public, max-age=60</code> = sab ke liye 60 second rakho. <code>private</code> = CDN cache mat karo. <strong>Purge</strong> = CDN ko bolna "ye copy abhi mita do".<br><strong>Kyun chahiye:</strong> isi se tum control karte ho ki kya edge pe rahe aur kya nahi.<br><strong>Iske bina:</strong> ya to kisi ka private data doosre ko dikh jaaye, ya CDN kuch cache hi na kare.` },
    { type: 'p', html: `<strong>Kharcha:</strong> CDN ka bill (per GB), purge ka dhyaan, aur sirf <strong>public, same-for-everyone</strong> responses ke liye kaam ka. <strong>Limit:</strong> personalized responses (feed, cart, notifications) CDN pe cache nahi hote. Detail: <a href="#/cdn">CDN</a>.` },
    { type: 'callout', tone: 'tip', title: 'Kab rukna hai (CDN)', html: `Jab public traffic ka bada hissa (80-95%) edge pe hit ho raha ho aur origin aram mein ho, ruko. Agla rung tab: bacha hua <strong>personalized</strong> traffic bhi mehenga ho jaaye, kyunki har request pe joins aur sorting ho rahi hai.` },
    { type: 'h3', text: 'Rung 5: denormalised aur precomputed views' },
    { type: 'p', html: `<strong>Kahani:</strong> "Mere subscriptions" feed har user ka alag hai. Riya 200 channels follow karti hai. Har baar feed kholne pe DB ko 200 channels ki latest videos jodni (join) aur time se sort karni padti hain. Ye read sirf <em>zyada</em> nahi, <em>mehenga</em> hai. 2 lakh feed reads/second × heavy join = replicas phir garam. Aur CDN ise cache nahi kar sakta.` },
    { type: 'callout', tone: 'term', title: 'Denormalisation', html: `<strong>Ye kya hai:</strong> padhne ki speed ke liye data ki copy jaan-boojh ke doosri jagah bhi rakhna. Jaise video row mein hi <code>channel_name</code> likh dena, taaki channels table se join na karna pade.<br><strong>Kyun chahiye:</strong> join hata do, to read ek seedha lookup.<br><strong>Iske bina:</strong> har read pe join. Join bade data pe CPU khaata hai.<br><strong>Kharcha:</strong> channel ka naam badla to har video row update karni padegi.` },
    { type: 'callout', tone: 'term', title: 'Materialized view aur precomputed view', html: `<strong>Ye kya hai:</strong> <strong>materialized view</strong> = DB ke andar ek query ka result, table ki tarah save. Postgres mein <code>CREATE MATERIALIZED VIEW</code>. Ye apne aap refresh nahi hota; tum <code>REFRESH MATERIALIZED VIEW</code> chalate ho. <strong>Precomputed view</strong> (general naam) = koi bhi pehle se bana hua jawab, DB mein, Redis mein ya search index mein, jise ek background job update karta hai.<br><strong>Kyun chahiye:</strong> mehenga kaam <strong>write time</strong> pe ek baar, read time pe sirf ek lookup.<br><strong>Iske bina:</strong> har read pe wahi join aur ginti, lakhon baar.` },
    { type: 'p', html: `<strong>Tareeka:</strong> naya video aaya → ek background job (DB ke change stream ya <a href="#/kafka">Kafka</a> event se) subscribers ke ready feeds update karta hai. Har ghante → ek job "is mahine ke top 10 videos" table refresh karta hai. Ye <a href="#/architecture-styles">CQRS</a> ka hi roop hai: likhne ka model alag, padhne ka model alag aur ready-made.` },
    { type: 'p', html: `<strong>Kharcha:</strong> (1) write path pe extra kaam aur ek naya pipeline (change stream, workers) jo fail ho sakta hai; (2) view thoda <strong>purana</strong> hota hai (seconds se ghante); (3) storage, kyunki ek hi data kai shaklon mein. <strong>Limit:</strong> agar data har second badalta hai aur har user ke liye alag combination hai, to precompute karna padhne se mehenga ho sakta hai. Yahi sawaal feed design mein "fan-out on write vs read" ban jaata hai, jo <a href="#/pattern-fanout">fan-out lesson</a> mein hai.` },
    { type: 'callout', tone: 'tip', title: 'Kab rukna hai (precomputed views)', html: `Ye seedhi ka sabse upar ka rung hai. Iske baad reads ke liye bas machines (Redis shards, replicas, edges) badhao. Precompute <strong>sirf un pages ka</strong> karo jo mehenge bhi hain aur bahut padhe bhi jaate hain. Agar ek view ko update karna uske padhe jaane se zyada baar hota hai (bahut likha, kam padha), to wo precompute ghaate ka sauda hai.` },
    { type: 'h2', text: 'Escalation ladder: slider ghumao' },
    { type: 'p', html: `Slider = xyz.com pe peak pe reads per second. Widget batata hai ki <strong>kam se kam</strong> kaunse rung tak chadhna padega, architecture kaisa dikhega, user ko latency kitni, kitni machines, aur kaunsi cheez agla rung force karegi. Kisi rung ka chip daba ke us rung pe "atak" ke dekho: overload kahan hota hai.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div><label>Peak reads per second: <strong class="pr-v"></strong></label><input class="pr-s" type="range" min="1" max="7" step="0.05" value="4.5"></div>
        <div class="chips pr-chips" style="margin:10px 0;display:flex;flex-wrap:wrap;gap:6px"></div>
        <div class="pr-ladder" style="display:grid;gap:6px"></div>
        <svg class="pr-svg" viewBox="0 0 360 122" style="width:100%;max-width:520px;height:auto;margin-top:12px;display:block"></svg>
        <div class="stats">
          <div class="stat"><span>Zaroori rung</span><strong class="pr-need"></strong></div>
          <div class="stat"><span>User latency (avg)</span><strong class="pr-lat"></strong></div>
          <div class="stat"><span>Machines (approx)</span><strong class="pr-mach"></strong></div>
          <div class="stat"><span>Bottleneck load</span><strong class="pr-util"></strong></div>
        </div>
        <div class="calc-note pr-note"></div>`;
      const $ = c => el.querySelector(c);
      const R = [
        { n: 'Sirf DB, bina index', cap: 50, data: 500, why: 'Har query 1 crore rows ka table scan karti hai (~0.5 s). ~50 reads/s pe hi DB ka CPU aur disk full.' },
        { n: '+ Index', cap: 1e4, data: 5, why: 'Query ab ~5 ms, lekin ek DB node ~10k reads/s pe CPU 100%. Aur zyada-tar sawaal wahi ke wahi hain.' },
        { n: '+ Cache (Redis, 90% hit)', cap: 1e5, data: 1.5, why: '90% reads RAM se, lekin 10% misses (~10k/s) DB node ko phir bhar dete hain. Aur Redis gira to 100% load DB pe.' },
        { n: '+ Read replicas (1 leader + 5)', cap: 6e5, data: 1.5, why: '6 DB nodes × 10k = 60k misses/s. Aage: har replica har write copy karti hai, lag badhta hai, origin pe 100+ app servers, aur door ke users ko har baar poora round trip.' },
        { n: '+ CDN (80% traffic public)', cap: 3e6, data: 1.5, why: 'Public 80% edge se. Bacha 20% personalized (feed, "mere liye") CDN cache nahi kar sakta, har miss pe joins. Origin ~600k/s pe phir full.' },
        { n: '+ Precomputed views', cap: Infinity, data: 1, why: 'Personalized read bhi ab ek key lookup. Redis shards badhao, reads horizontally scale. Ab dard write side pe: har naye post pe views update karna (Scaling writes, Fan-out lessons).' },
      ];
      const f = n => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + 'k' : Math.round(n).toString();
      const model = (load, r) => {
        const origin = r >= 4 ? load * 0.2 : load;
        const misses = r >= 2 ? origin * 0.1 : origin;
        const db = r <= 2 ? 1 : r === 5 ? 3 : 1 + Math.min(5, Math.max(1, Math.ceil(misses / 1e4) - 1));
        const app = Math.max(2, Math.ceil(origin / 5000));
        const redis = r >= 2 ? Math.max(1, Math.ceil(origin / 1e5)) : 0;
        const oLat = 60 + 2 + R[r].data;
        const lat = r >= 4 ? 0.8 * 15 + 0.2 * oLat : oLat;
        return { origin, misses, db, app, redis, lat, util: load / R[r].cap };
      };
      let forced = -1;
      const chips = $('.pr-chips');
      ['Auto'].concat(R.map((x, i) => 'Rung ' + i)).forEach((t, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = t;
        b.onclick = () => { forced = i - 1; upd(); }; chips.appendChild(b);
      });
      const boxes = [['User', 10, 20, 90], ['CDN', 135, 20, 90], ['App', 260, 20, 90], ['Redis', 5, 82, 80], ['Views', 95, 82, 80], ['DB', 185, 82, 80], ['Replicas', 275, 82, 80]];
      const activeAt = r => ['User', 'App', 'DB'].concat(r >= 2 ? ['Redis'] : [], r >= 3 ? ['Replicas'] : [], r >= 4 ? ['CDN'] : [], r >= 5 ? ['Views'] : []);
      const upd = () => {
        const load = Math.round(Math.pow(10, +$('.pr-s').value));
        const need = R.findIndex(x => load <= x.cap);
        const r = forced < 0 ? need : forced;
        const m = model(load, r);
        $('.pr-v').textContent = f(load) + '/s';
        chips.querySelectorAll('.chip').forEach((b, i) => b.classList.toggle('on', i - 1 === forced));
        $('.pr-ladder').innerHTML = R.map((x, i) => {
          const u = load / x.cap, pct = Math.min(100, u * 100);
          const col = u > 1 ? 'var(--red)' : u > 0.7 ? 'var(--amber)' : 'var(--green)';
          const tag = i < need ? 'kaafi nahi' : i === need ? 'yahan tak chadho' : 'abhi zaroorat nahi';
          return `<div style="border:1px solid ${i === r ? 'var(--accent)' : 'var(--line)'};border-radius:var(--r-sm);padding:6px 10px;background:${i === r ? 'var(--accent-soft)' : 'var(--surface)'};opacity:${i > need && i !== r ? 0.6 : 1}">
            <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px;font-size:14px"><strong>${i}. ${x.n}</strong><span style="color:var(--ink-3);font-size:12px">max ~${x.cap === Infinity ? '∞ (shards badhao)' : f(x.cap) + '/s'} · ${tag}</span></div>
            <div style="height:6px;background:var(--surface-2);border-radius:3px;margin-top:4px"><div style="height:6px;width:${x.cap === Infinity ? 2 : pct}%;background:${col};border-radius:3px"></div></div></div>`;
        }).join('');
        const act = activeAt(r);
        const pos = Object.fromEntries(boxes.map(b => [b[0], b]));
        const line = (a, b2) => { const A = pos[a], B = pos[b2]; const on = act.includes(a) && act.includes(b2);
          const ax = A[1] + A[3] / 2, ay = A[2] + 34, bx = B[1] + B[3] / 2, by = B[2];
          const same = A[2] === B[2];
          return `<line x1="${same ? A[1] + A[3] : ax}" y1="${same ? A[2] + 17 : ay}" x2="${same ? B[1] : bx}" y2="${same ? B[2] + 17 : by}" stroke="var(--ink-3)" stroke-width="1.2" opacity="${on ? 1 : 0.2}"/>`; };
        $('.pr-svg').innerHTML = line('User', 'CDN') + line('CDN', 'App') + line('App', 'Redis') + line('App', 'Views') + line('App', 'DB') + line('App', 'Replicas') +
          (act.includes('CDN') ? '' : `<path d="M100 37 C 160 -8, 200 -8, 260 37" fill="none" stroke="var(--ink-3)" stroke-width="1.2"/>`) +
          boxes.map(([t, x, y, w]) => { const on = act.includes(t);
            return `<g opacity="${on ? 1 : 0.3}"><rect x="${x}" y="${y}" width="${w}" height="34" rx="7" fill="${on ? 'var(--accent-soft)' : 'var(--surface-2)'}" stroke="${on ? 'var(--accent)' : 'var(--line-2)'}" ${on ? '' : 'stroke-dasharray="4 3"'}/><text x="${x + w / 2}" y="${y + 21}" text-anchor="middle" font-size="12" fill="var(--ink)" font-family="var(--f-body)">${t}${t === 'DB' && r >= 1 ? ' + idx' : ''}</text></g>`; }).join('');
        $('.pr-need').textContent = need + '. ' + R[need].n.replace('+ ', '');
        $('.pr-lat').textContent = m.util > 1 ? 'timeouts' : Math.round(m.lat) + ' ms';
        $('.pr-mach').textContent = (m.app + m.db + m.redis) + (r >= 4 ? ' + CDN' : '');
        $('.pr-util').textContent = r === 5 ? 'scale-out' : Math.round(m.util * 100) + '%';
        $('.pr-note').innerHTML = (m.util > 1 ? `<strong>Rung ${r} pe atke ho: ${Math.round(m.util * 10) / 10}× overload.</strong> ` : '') +
          `Rung ${r} pe: origin ${f(m.origin)}/s, DB tak ${f(r === 5 ? 0 : m.misses)}/s; ${m.app} app servers (~5k req/s each), ${m.db} DB node${m.db > 1 ? "s" : ""}, ${m.redis} Redis node${m.redis === 1 ? "" : "s"}. <strong>Agla rung kyun:</strong> ${R[r].why} ` +
          `<br>Assumptions (roadmap phase 4): indexed query ~5 ms, DB node ~10k reads/s, Redis ~100k ops/s, cache hit 90%, app server ~5k req/s, user→origin ~60 ms, user→CDN edge ~15 ms.`;
      };
      $('.pr-s').addEventListener('input', upd); upd();
    }},
    { type: 'callout', tone: 'tip', title: 'Widget se kya seekhna hai', html: `Default 31,623 reads/s pe (slider 4.5) rung 2 kaafi hai: index + Redis, ~64 ms. "Rung 1" chip dabao: ek DB node 3.2× overloaded. 1M/s pe rung 4 chahiye, aur latency ~63 ms se girke ~25 ms, kyunki 80% reads paas ke CDN edge se. Dhyaan do: rung 2 aur 3 latency nahi badalte, <strong>capacity</strong> badhaate hain; CDN dono badhaata hai.` },

    { type: 'h2', text: 'Architecture ko rung by rung badhte dekho' },
    { type: 'callout', tone: 'term', title: 'Cache stampede (thundering herd)', html: `<strong>Ye kya hai:</strong> jab bahut saari requests ek saath cache miss karti hain aur sab ek saath DB pe toot padti hain. Jaise school ki chhutti ki ghanti pe sab bachche ek hi darwaaze pe.<br><strong>Kab hota hai:</strong> popular key ka TTL khatam hua, cache restart hua, ya CDN poora purge hua.<br><strong>Iske bina (ilaaj ke bina):</strong> jo DB normal din 10% load jhel raha tha, use ek second mein 100% milta hai, aur wo gir jaata hai.` },
    { type: 'callout', tone: 'term', title: 'Request collapsing aur stale-while-revalidate', html: `<strong>Ye kya hai:</strong> <strong>request collapsing</strong> (single-flight, coalescing) = ek hi key ke liye 1,000 requests aayein to sirf <em>ek</em> DB/origin tak jaaye, baaki 999 uske jawab ka intezaar karein. <strong>Stale-while-revalidate</strong> = purani copy turant dikhao, aur peeche se nayi copy laao.<br><strong>Kyun chahiye:</strong> stampede ka seedha ilaaj.<br><strong>Iske bina:</strong> har miss ek alag DB query, ek hi jawab ke liye hazaaron baar.` },
    { type: 'p', html: `Ek hi diagram, jo har step pe ek naya box jodta hai. Pehle do scenarios seedhi chadhte hain, baaki do batate hain ki sabse upar pahunch ke bhi kya toot sakta hai.` },
    { type: 'flow', height: 340,
      nodes: [
        { id: 'u', label: 'Users', sub: 'video page', x: 65, y: 175, w: 110, kind: 'client', info: 'Ye kya hai: xyz.com ke viewers (browser ya app). Zyadatar sirf padhte hain: video page, channel page, feed. Inhi ke reads ki wajah se poori seedhi chadhni padti hai.' },
        { id: 'cdn', label: 'CDN edge', sub: 'paas ka server', x: 215, y: 70, w: 130, kind: 'edge', hidden: true, info: 'Ye kya hai: CDN ka paas wala server (edge), rung 4. Kyun yahan: public responses (thumbnails, video page ka public JSON) ki copy user ke shehar mein rakhta hai. Personalized requests ko cache nahi karta, seedha origin bhejta hai. Detail: CDN lesson.' },
        { id: 'app', label: 'App servers', x: 365, y: 175, w: 130, kind: 'server', meter: true, load: 30, info: 'Ye kya hai: xyz.com ka code chalane wale servers (origin). Stateless, saamne Load Balancer hai (yahan nahi dikhaya). Kyun yahan: har rung ka logic yahin hai: pehle cache dekho, phir precomputed view, phir replica.' },
        { id: 'redis', label: 'Redis cache', sub: 'RAM, ~1 ms', x: 595, y: 45, w: 160, kind: 'cache', hidden: true, info: 'Ye kya hai: RAM wala cache server, rung 2. Kyun yahan: popular jawabon ki copy ~1 ms mein deta hai (cache-aside). 90% hit rate = DB pe sirf 10% reads.' },
        { id: 'views', label: 'Precomputed', sub: 'ready-made answers', x: 595, y: 130, w: 160, kind: 'data', hidden: true, info: 'Ye kya hai: pehle se bane hue jawabon ki store, rung 5. Kyun yahan: mehenge jawab (har user ka feed, top videos, dashboard numbers) ek background job DB ke changes dekh ke pehle hi bana deta hai. Read = ek key lookup.' },
        { id: 'db', label: 'DB leader', sub: 'source of truth', x: 595, y: 215, w: 160, kind: 'data', meter: true, load: 20, info: 'Ye kya hai: asli database (Postgres/MySQL leader), source of truth. Kyun yahan: saare writes yahin jaate hain. Ek machine roughly ~10k simple indexed reads/s jhelti hai (roadmap ka napkin number).' },
        { id: 'rep', label: 'Read replicas', sub: 'copies, thoda lag', x: 595, y: 300, w: 160, kind: 'data', hidden: true, info: 'Ye kya hai: leader ki copies jo sirf reads ke liye hain, rung 3. Kyun yahan: misses ka load baant leti hain. Ye async copy karti hain (thoda lag). Har replica har write apply karti hai, isliye writes ka bojh kam nahi hota.' },
      ],
      edges: [{ a: 'u', b: 'app', id: 'direct' }, { a: 'u', b: 'cdn' }, { a: 'cdn', b: 'app' }, { a: 'app', b: 'redis' }, { a: 'app', b: 'views' }, { a: 'app', b: 'db' }, { a: 'app', b: 'rep' }, { a: 'db', b: 'rep' }, { a: 'db', b: 'views', dashed: true }],
      scenarios: [
        { name: 'Rung 0-2: index, cache', steps: [
          { title: 'Rung 0: bina index', text: 'Channel page pe "is channel ke latest 20 videos". <code>videos</code> table mein 1 crore rows, <code>channel_id</code> pe koi index nahi. DB har request pe poora table padhta hai (full scan).', go: ['u>app>db', 'res:db>app>u'], after: { db: { state: 'hot', sub: 'full scan ~500 ms', load: 90 } }, msg: 'SELECT * FROM videos WHERE channel_id = 77\nORDER BY created_at DESC LIMIT 20;   -- Seq Scan, 1 cr rows' },
          { title: 'Rung 1: index lagao', text: 'Composite index <code>(channel_id, created_at)</code>. Ab DB seedha sahi jagah jaata hai aur 20 rows padhta hai. 500 ms se ~5 ms. Ek SQL line, koi naya server nahi. <strong>Hamesha pehle yahi check karo</strong> (EXPLAIN chalao).', go: ['u>app>db', 'res:db>app>u'], set: { db: { state: 'ok', sub: 'index: ~5 ms', load: 15 } }, msg: 'CREATE INDEX idx_videos_ch_time ON videos (channel_id, created_at DESC);' },
          { title: 'Traffic 10k/s paar', text: 'Video viral hua. Queries fast hain, lekin bahut saari, aur zyadatar <em>same</em> sawaal. Ek DB node ~10k reads/s pe CPU full. Symptom: DB CPU 100%, p99 latency badhi, jabki har query akele mein fast hai.', flood: { paths: ['u>app>db'], n: 12 }, after: { db: { state: 'hot', sub: 'CPU 100%', load: 97 } } },
          { title: 'Rung 2: cache', text: 'Redis aaya. Pehli request miss: DB se laao, Redis mein TTL ke saath rakho.', show: ['redis'], go: ['u>app', 'app>redis', 'bad:redis>app', 'app>db', 'res:db>app', 'app>redis'], after: { redis: { sub: 'ch:77:latest saved' } }, msg: 'GET ch:77:latest → (nil)\nSET ch:77:latest [...] EX 60' },
          { title: 'Ab 90% hits', text: 'Baaki requests RAM se ~1 ms mein. DB pe sirf misses aur writes. 100k reads/s pe bhi DB ko sirf ~10k/s dikhte hain.', go: ['u>app>redis', 'res:redis>app>u'], after: { redis: { state: 'hit', sub: 'HIT 90%' }, db: { state: 'ok', sub: '~10% misses', load: 35 } } },
        ]},
        { name: 'Rung 3-5: replicas, CDN, views', intro: 'Ab xyz.com 10 lakh reads/s ki taraf. Cache already hai.', steps: [
          { title: 'Misses bhi bahut ho gaye', text: '500k reads/s × 10% miss = 50k/s DB pe. Ek leader nahi jhel sakta. Aur agar Redis gira, saare 500k/s DB pe.', show: ['redis'], flood: { paths: ['u>app>redis', 'u>app>db'], n: 12 }, after: { db: { state: 'hot', sub: 'misses: 50k/s', load: 98 } } },
          { title: 'Rung 3: read replicas', text: 'Leader ki 5 copies. Misses replicas pe, writes sirf leader pe. Leader replicas ko change log bhejta rehta hai (async). Ab DB side pe ~60k misses/s ki jagah. Detail: <a href="#/replication">replication</a>.', show: ['rep'], go: ['u>app>rep', 'res:rep>app>u', 'evt:db>rep'], after: { db: { state: 'ok', sub: 'writes + few reads', load: 40 }, rep: { sub: '5 replicas' } } },
          { title: 'Rung 4: CDN', text: 'Thumbnails, video page ka public JSON, channel page: sabke liye same. Inhe CDN edge pe rakho (<code>Cache-Control: public, max-age=60</code>). 80% requests origin tak aati hi nahi, aur user ko paas ka server ~15 ms mein jawab deta hai.', show: ['cdn'], hide: ['direct'], go: ['u>cdn', 'res:cdn>u'], after: { cdn: { state: 'hit', sub: 'HIT ~80%' }, app: { load: 15 } }, msg: 'GET /v/abc123.json  →  HIT (edge Mumbai), Age: 23' },
          { title: 'Personalized page: CDN bekaar', text: '"Mere subscriptions ka feed" har user ka alag hai. CDN cache nahi kar sakta (<code>Cache-Control: private</code>). Har miss pe app ko 200 channels ke latest videos jodne padte hain: join + sort. Replicas phir garam.', go: ['u>cdn>app>rep', 'res:rep>app>cdn>u'], after: { rep: { state: 'hot', sub: 'feed joins: heavy', load: 90 } }, msg: 'GET /feed  (private)  →  JOIN subscriptions × videos, ORDER BY time, LIMIT 50' },
          { title: 'Rung 5: precomputed views', text: 'Har user ka feed pehle se taiyaar rakho. Naya video aaya to background job (DB ke change stream / <a href="#/kafka">Kafka</a> se) subscribers ke ready feeds update karta hai. Read = ek key GET. Expensive kaam read time se hat ke write time pe chala gaya.', show: ['views'], go: ['evt:db>views', 'u>cdn>app>views', 'res:views>app>cdn>u'], after: { views: { state: 'hit', sub: 'feed:42 ready' }, rep: { state: 'ok', sub: 'halka', load: 30 } }, msg: 'GET feed:42  →  [v91, v88, v87, ...]   (~1 ms)' },
        ]},
        { name: 'Failure: CDN purge stampede', intro: 'Sab rungs lage hain. Raat 2 baje naya page design deploy hua, aur engineer ne "purge everything" daba diya.', steps: [
          { title: 'Sab ek saath purge', text: 'Saare edge servers ne apni copies phenk di. Saath mein deploy ne Redis keys ka version badal diya (<code>v2:</code> prefix), to cache bhi khaali. Ab har request miss.', show: ['cdn', 'redis', 'views', 'rep'], hide: ['direct'], set: { cdn: { state: 'miss', sub: 'purged: 0% hit' }, redis: { state: 'miss', sub: 'v2 keys: empty' } } },
          { title: 'Stampede origin pe', text: 'Jo 80% traffic edge pe rukta tha, aur jo 90% Redis pe, sab ek hi second mein origin aur DB pe. Ek popular video ke liye hazaaron edges aur hazaaron app threads <em>ek hi</em> jawab DB se maang rahe hain. Isko <strong>cache stampede</strong> (thundering herd) kehte hain.', flood: { paths: ['u>cdn>app>rep', 'u>cdn>app>db'], n: 16 }, after: { app: { state: 'hot', load: 99, sub: 'queue full' }, rep: { state: 'down', sub: 'timeouts' }, db: { state: 'hot', load: 99, sub: 'overloaded' } } },
          { title: 'Ilaaj 1: request collapsing', text: 'CDN pe <strong>request collapsing</strong> aur origin shield: ek edge pe ek key ke liye sirf ek request origin jaaye, baaki uska intezaar karein. App pe <strong>single-flight / lock</strong>: ek key ke liye ek hi DB query. Facebook ke memcache paper mein ise "leases" se kiya gaya tha. Detail: <a href="#/caching-strategies">cache stampede</a>.', go: ['u>cdn>app>db', 'res:db>app>cdn>u'], after: { rep: { state: 'warn', sub: 'recovering' }, db: { state: 'warn', load: 60, sub: '1 query/key' } } },
          { title: 'Ilaaj 2: purge ka tareeka', text: 'Sab ek saath purge mat karo. <strong>Soft purge / stale-while-revalidate</strong>: purani copy dikhate raho jab tak nayi aa rahi hai. Sirf badle hue URLs purge karo, aur cache keys ko versioned file names se badlo (<code>app.v2.js</code>) taaki purge ki zaroorat hi na pade. Cache dheere dheere warm karo.', go: ['u>cdn', 'res:cdn>u'], after: { cdn: { state: 'hit', sub: 'stale served' }, redis: { state: 'ok', sub: 'warming' }, app: { state: 'ok', load: 25, sub: '' }, rep: { state: 'ok', sub: 'normal' }, db: { state: 'ok', load: 30, sub: 'normal' } } },
        ]},
        { name: 'Failure: replica lag', intro: 'Riya ne apne video ka title badla.', steps: [
          { title: 'Write leader pe', text: 'Title update leader pe gaya, commit ho gaya.', show: ['rep', 'redis'], go: ['u>app>db', 'res:db>app>u'], after: { db: { sub: 'title = "Goa vlog 2"' } }, msg: 'UPDATE videos SET title = \'Goa vlog 2\' WHERE id = 91' },
          { title: 'Read replica se, purana title', text: 'Page refresh kiya. Read replica pe gaya, jo abhi 2 second peeche hai. Riya ko purana title dikha: "mera save hua hi nahi!"', go: ['u>app>rep', 'res:rep>app>u'], after: { rep: { state: 'warn', sub: 'lag 2 s: purana' } } },
          { title: 'Fix: read-your-writes', text: 'Jo user ne abhi likha, uske apne reads kuch second tak leader se (ya cache ko write ke saath update karo). Baaki duniya replica se thoda purana dekhe to chalega. Detail: <a href="#/replication">replication lag</a>.', go: ['u>app>db', 'res:db>app>u'], after: { u: { state: 'ok', sub: 'naya title' } } },
        ]},
      ],
    },

    { type: 'table', head: ['Rung', 'Symptom jo isse force karta hai', 'Kya badhta hai', 'Kharcha', 'Kahan haarta hai'], rows: [
      ['Index', 'Ek query slow, EXPLAIN mein full scan', 'Har query ki speed', 'Disk, writes thode slow', 'Query count; ~10k/s per node'],
      ['Cache', 'DB CPU high, same keys baar baar', 'Capacity (hit rate ke hisaab se)', 'Stale data, invalidation, Redis ops', 'Misses, long-tail, cache down'],
      ['Read replicas', 'Misses hi DB ko bhar dete hain', 'Read capacity, availability', 'Machines, replication lag', 'Writes; lag; kuch replicas tak'],
      ['CDN', 'Public content origin pe, door users slow', 'Capacity + latency', 'CDN bill, purge', 'Personalized responses'],
      ['Precomputed views', 'Read khud expensive (joins, aggregation)', 'Expensive reads ko lookup banana', 'Write pipeline, staleness, storage', 'Bahut tez badalta, unique data'],
    ], caption: 'Roadmap: "Apply in that order; each step is more complex than the last."' },

    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `<strong>1. "Slow hai, Redis laga do."</strong> Pehle EXPLAIN. Missing index ko cache se chhupaoge to har miss abhi bhi 500 ms ka hai, aur cache gira to site gayi.<br><strong>2. "Read replicas se writes bhi scale honge."</strong> Nahi. Har replica har write apply karti hai. Writes ke liye <a href="#/pattern-writes">Scaling writes</a> wala ladder hai.<br><strong>3. "CDN sirf images ke liye hai."</strong> Public JSON/HTML bhi CDN pe chhote TTL (1-60 s) ke saath cache ho sakta hai: live score, trending list, video page ka public hissa.<br><strong>4. "Rung chadh gaye to neeche wale hata do."</strong> Nahi. Ladder <em>jodta</em> hai. Sabse upar pe bhi index, cache, replicas sab kaam kar rahe hain.` },

    { type: 'h2', text: 'Real duniya mein' },
    { type: 'p', html: `Facebook ne 2013 ke NSDI paper "Scaling Memcache at Facebook" mein bataya ki unke read-heavy workload ke liye memcache ek bada cache layer tha jo database ke saamne baitha tha, aur stampede rokne ke liye "leases" use hote the: ek key ke liye har 10 second mein sirf ek client ko DB se laane ka token. Paper ke hisaab se ek test mein isse peak DB query rate ~17k/s se ~1.3k/s aa gaya. Ye paper purana hai, lekin cache stampede ka ye ilaaj aaj bhi wahi hai. Discord ne 2023 mein bataya ki unki data services ek hi row ki ek saath aayi requests ko ek DB query mein jod deti hain (request coalescing), wahi idea jo upar stampede ilaaj mein tha.` },

    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `Neeche se shuru karo aur <strong>symptom dekh ke</strong> ek rung chadho. Query slow? <strong>Index</strong>. DB CPU high, same keys? <strong>Cache</strong>. Misses ya cache-failure ka darr? <strong>Read replicas</strong>. Public, sabke liye same content ya door ke users? <strong>CDN</strong>. Read khud expensive (joins/aggregation), har user ka alag? <strong>Precompute karo</strong> (denormalise, materialized/precomputed view). Interview mein ladder bolo, phir batao tumhare numbers pe kaunsa rung zaroori hai: "200k reads/s, 90% hit → 20k misses → ek DB node kaafi nahi → 2-3 replicas."` },

    { type: 'h2', text: 'Poori picture' },
    { type: 'p', html: `Saare paanch rung ek saath, xyz.com ke andar. Har rung ka number box ke neeche likha hai. Buttons daba ke ek ek raasta dekho.` },
    { type: 'diagram', title: 'Scaling reads: poori seedhi xyz.com mein', height: 540,
      groups: [
        { label: 'Origin: xyz.com ke apne servers', x: 30, y: 200, w: 660, h: 120 },
        { label: 'Data', x: 30, y: 336, w: 660, h: 190 },
      ],
      nodes: [
        { id: 'users', label: 'Viewers', sub: 'browser / app', x: 360, y: 50, kind: 'client', info: 'Ye kya hai: xyz.com ke users. Kyun yahan: inke lakhon reads hi is poori seedhi ki wajah hain. Har write ke peeche 100-1000 reads.' },
        { id: 'cdn', label: 'CDN edge', sub: 'rung 4: public', x: 360, y: 150, w: 150, kind: 'edge', info: 'Ye kya hai: user ke shehar ka CDN server. Kyun yahan: public, sabke liye same jawab (thumbnails, video page) yahin se ~15 ms mein. 80% requests origin tak aati hi nahi. Personalized requests (Cache-Control: private) seedhe aage jaati hain.' },
        { id: 'app', label: 'App servers', sub: 'LB ke peeche', x: 360, y: 260, kind: 'server', info: 'Ye kya hai: xyz.com ka code (origin). Load Balancer ke peeche stateless servers. Kyun yahan: yahi decide karta hai ki jawab kahan se aaye: pehle Redis, phir precomputed view, phir replica. Writes leader ko bhejta hai.' },
        { id: 'redis', label: 'Redis cache', sub: 'rung 2: ~1 ms', x: 130, y: 260, w: 150, kind: 'cache', info: 'Ye kya hai: RAM wala cache. Kyun yahan: popular jawab ~1 ms mein, cache-aside ke saath. 90% hit = DB pe sirf 10%. Stampede se bachne ke liye request collapsing.' },
        { id: 'views', label: 'Precomputed', sub: 'rung 5: ready feeds', x: 590, y: 260, w: 160, kind: 'data', info: 'Ye kya hai: pehle se bane jawab (har user ka feed, top 10, dashboard totals). Kyun yahan: mehenga join read time pe nahi, write time pe ek baar. Read = ek key lookup.' },
        { id: 'db', label: 'DB leader', sub: 'rung 1: indexes', x: 170, y: 400, w: 160, kind: 'data', info: 'Ye kya hai: asli database, source of truth. Saare writes yahan. Kyun yahan: rung 1 (sahi indexes) isi pe lagta hai. EXPLAIN se har important query ka index check karo.' },
        { id: 'rep', label: 'Read replicas', sub: 'rung 3: copies', x: 395, y: 400, w: 150, kind: 'data', info: 'Ye kya hai: leader ki read-only copies. Kyun yahan: cache misses ka load baantti hain, aur leader gire to backup. Dhyaan: replication lag; jisne abhi likha uske reads leader se (read-your-writes).' },
        { id: 'job', label: 'View builder', sub: 'change events', x: 600, y: 400, w: 150, kind: 'queue', info: 'Ye kya hai: background job jo DB ke changes (change stream ya Kafka events) sunta hai. Kyun yahan: naya video aaya to subscribers ke ready feeds aur top-10 tables update karta hai. Ye fail ho to views purane ho jaate hain, isliye retries aur monitoring.' },
      ],
      edges: [
        { a: 'users', b: 'cdn', n: 1 },
        { a: 'cdn', b: 'app', n: 2, label: 'miss / private' },
        { a: 'app', b: 'redis', n: 3 },
        { a: 'app', b: 'views' },
        { a: 'app', b: 'rep', n: 4, label: 'miss' },
        { a: 'app', b: 'db', label: 'writes' },
        { a: 'db', b: 'rep', kind: 'evt' },
        { a: 'db', b: 'job', kind: 'evt', via: [[170, 490], [600, 490]], label: 'changes' },
        { a: 'job', b: 'views', kind: 'evt', label: 'update' },
      ],
      paths: [
        { name: 'CDN hit', text: 'Public video page: paas wala edge ~15 ms mein jawab de deta hai. Origin ko pata bhi nahi chalta.', go: ['users>cdn', 'res:cdn>users'] },
        { name: 'Cache hit / miss', text: 'Edge pe nahi mila: app pehle Redis dekhta hai (~1 ms). Miss hua to replica se padh ke Redis mein rakh deta hai.', go: ['users>cdn>app>redis', 'app>rep', 'res:rep>app>cdn>users'] },
        { name: 'Ready feed', text: '"Mere subscriptions" feed: koi join nahi, sirf ek key lookup precomputed store se.', go: ['users>cdn>app>views', 'res:views>app>cdn>users'] },
        { name: 'Write → copies', text: 'Naya video leader pe likha. Replicas copy karti hain, aur view builder ready feeds update karta hai.', go: ['app>db', 'evt:db>rep', 'evt:db>job>views'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Reads ki seedhi: index → cache → read replicas → CDN → precomputed views. Saste se mehenge tak, isi order mein.</li>
      <li>Har rung ek symptom se chadho: slow query = index; same sawaal baar baar = cache; misses bhi bahut = replicas; public content / door users = CDN; read khud mehenga = precompute.</li>
      <li>Index query ko tez karta hai, ginti kam nahi karta. Hamesha pehle EXPLAIN.</li>
      <li>DB load = reads × (1 − hit rate). 1M/s pe 90% hit bhi 100k misses/s hai.</li>
      <li>Replicas reads badhaati hain, writes nahi. Unke saath replication lag aata hai (read-your-writes se ilaaj).</li>
      <li>CDN sirf public, sabke liye same content cache kare. Personalized = private.</li>
      <li>Har copy purani ho sakti hai. Ek saath purge = stampede; ilaaj request collapsing + stale-while-revalidate.</li>
      <li>Upar chadhne pe neeche wale rung hatte nahi, sab saath kaam karte hain.</li>
    </ul>` },

    { type: 'tradeoffs',
      gains: ['Reads 10× se 1000× tak scale, mostly sasti machines (RAM, replicas, edges) se', 'Latency kam: RAM ~1 ms, CDN edge user ke paas', 'DB source of truth bana rehta hai, bas kam pareshaan hota hai', 'Har rung alag se measure aur tune ho sakta hai'],
      costs: ['Har copy = staleness: cache TTL, replica lag, CDN max-age, view refresh', 'Invalidation aur purge mushkil; galat purge = stampede', 'Zyada moving parts: Redis cluster, replicas, CDN config, view pipelines', 'Upar ke layers neeche wale ko itna bachate hain ki unke girne pe neeche wala nahi bachta', 'Writes ke liye kuch nahi; wo alag ladder hai'] },

    { type: 'think', questions: [
      { q: 'xyz.com pe search page slow hai. Har user alag query likhta hai. Cache lagaoge?', a: 'Pehle index (yahan search index jaise Elasticsearch, kyunki LIKE \'%x%\' B-tree index use nahi kar sakta). Har query alag hai to cache ka hit rate kam rahega; sirf top popular queries cache karo. Search lesson dekho. Ladder ka pehla rung yahan "sahi index" hai, Redis nahi.' },
      { q: 'Creator dashboard: "pichhle 30 din mein har din ke views". Har baar dashboard khulne pe 3 crore view events pe GROUP BY. Kaunsa rung?', a: 'Precomputed view. Ek job har din (ya har ghante) daily totals ek chhoti table mein likhe: (video_id, date, views). Dashboard sirf 30 rows padhta hai. Data ek ghanta purana chalega. Cache se kaam nahi chalega kyunki pehli baar ka miss hi bahut mehnga hai.' },
      { q: 'Cache 95% hit pe hai, DB 30% CPU pe. Boss bolta hai "replicas lagao, traffic badhega". Sahi?', a: 'Abhi zaroorat nahi, lekin socho cache gira to: 100% load DB pe = aaj ka ~20 guna (5% → 100%). Agar DB wo nahi jhel sakta to ek replica availability ke liye (aur failover ke liye) laga lena samajhdaari hai. Rung chadhne ka trigger sirf capacity nahi, failure mein bachna bhi hai.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'EXPLAIN mein "Seq Scan on videos (rows=10,000,000)". Pehla kadam?', options: ['Redis cache', 'Sahi index', 'Read replica'], answer: 1, explain: 'Full scan ka ilaaj index hai. Cache ke peeche chhupaoge to har miss phir bhi slow hai.' },
      { q: 'Writes bottleneck hain. Read replicas help karengi?', options: ['Haan, load baant dengi', 'Nahi, har replica ko har write apply karna hota hai', 'Sirf async replicas'], answer: 1, explain: 'Replication read capacity badhata hai, write capacity nahi. Writes ke liye batching, LSM, sharding wala ladder.' },
      { q: 'Kaunsa response CDN pe cache karna theek NAHI hai?', options: ['Video ka thumbnail', 'Live match ka score JSON (TTL 2 s)', 'User ka personal feed'], answer: 2, explain: 'Feed har user ka alag hai (private). CDN pe cache hua to doosre ko kisi aur ka feed dikh sakta hai. Iske liye precomputed per-user feed origin pe.' },
      { q: 'Deploy ke baad CDN poora purge kiya aur DB gir gaya. Sabse sahi ilaaj?', options: ['DB ka size double', 'Request collapsing + soft purge (stale-while-revalidate) + versioned URLs', 'CDN hata do'], answer: 1, explain: 'Stampede = ek saath bahut misses. Collapsing har key ke liye ek origin request bhejta hai, soft purge purani copy dikhata rehta hai, versioned URLs purge ki zaroorat hi hata dete hain.' },
      { q: 'Precomputed view ka main kharcha kya hai?', options: ['Read slow ho jaata hai', 'Write time pe extra kaam aur data thoda purana', 'Index nahi lag sakta'], answer: 1, explain: 'Kaam read se write pe shift hota hai. Har change pe view update karna padta hai, aur view kuch der peeche ho sakta hai.' },
    ]},
    { type: 'sources', note: 'Capacity numbers roadmap phase 4 ke napkin-maths ballparks hain (DB node ~10k reads/s, Redis ~100k ops/s, app server 1k-10k req/s), benchmark nahi.', items: [
      { title: 'Scaling Memcache at Facebook (NSDI 2013)', publisher: 'USENIX / Facebook', official: true, url: 'https://www.usenix.org/conference/nsdi13/technical-sessions/presentation/nishtala', year: 2013, used: 'Cache layer in front of DB for a read-heavy workload; leases (one token per key per 10 s) against thundering herds; reported peak DB query drop from ~17k/s to ~1.3k/s.' },
      { title: 'How Discord Stores Trillions of Messages', publisher: 'Discord engineering blog', official: true, url: 'https://discord.com/blog/how-discord-stores-trillions-of-messages', year: 2023, used: 'Request coalescing in data services: concurrent requests for the same row become one DB query.' },
      { title: 'PostgreSQL docs: Materialized Views and REFRESH MATERIALIZED VIEW', publisher: 'PostgreSQL', official: true, url: 'https://www.postgresql.org/docs/current/rules-materializedviews.html', used: 'Materialized view stores a query result; it is refreshed explicitly, not automatically.' },
      { title: 'RFC 5861: HTTP Cache-Control Extensions for Stale Content', publisher: 'IETF', official: true, url: 'https://www.rfc-editor.org/rfc/rfc5861', used: 'stale-while-revalidate: serve a stale copy while revalidating in the background.' },
    ]},
  ],
});
