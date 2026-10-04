Lesson.register({
  id: 'big-data',
  title: 'Batch vs stream processing',
  minutes: 42,
  summary: `xyz.com har din crore events paida karta hai: views, clicks, searches, uploads. "Kal sabse zyada dekhe gaye videos?" aur "abhi is second kitne log live match dekh rahe hain?" dono sawaal isi data se aate hain, lekin ek ka jawab ghanton mein chalega aur doosre ka seconds mein chahiye. Is lesson mein batch aur stream processing, MapReduce (khud chala ke), Spark, Flink, Kafka Streams, windows (tumbling, sliding, session), event time aur watermarks, ETL vs ELT, data lake / warehouse / lakehouse, Lambda vs Kappa, aur OLTP vs OLAP.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `xyz.com pe har second lakhon chhoti chhoti cheezein hoti hain: kisi ne video dekha, kisi ne like kiya, kisi ne search kiya.<br>In sab ko jodke sawaalon ke jawab chahiye: "kal sabse zyada kya dekha gaya?" aur "abhi is pal kitne log live hain?"<br>Pehla sawaal aaram se raat bhar mein ho sakta hai. Doosre ka jawab har kuch second mein chahiye.<br>Is lesson mein seekhenge ki itne bade data ko <strong>ek saath dher bana ke</strong> (batch) aur <strong>behti nadi ki tarah</strong> (stream) kaise ginte hain, aur ye kaam main website ke database se alag kyun hota hai.` },
    { type: 'h2', text: 'Problem: production database pe analytics mat chalao' },
    { type: 'p', html: `Pichhle lesson mein xyz.com ki services ne events bhejna seekha: <code>VideoViewed</code>, <code>VideoUploaded</code>, <code>SearchDone</code>. Ab har team ke paas sawaal hain:` },
    { type: 'list', items: [
      `<strong>Product team:</strong> "Kal ke top 100 videos kaun se the? Har creator ki monthly earnings?"`,
      `<strong>Recommendations team:</strong> "Pichhle 90 din ke saare watch events pe model train karna hai."`,
      `<strong>Live team:</strong> "Cricket final pe <em>abhi</em> kitne log dekh rahe hain? Har 10 second update chahiye."`,
      `<strong>Ads/fraud team:</strong> "Ek IP se 1 minute mein 500 ad clicks? <em>Turant</em> rok do."`,
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: Event', html: `<strong>Ye kya hai:</strong> ek chhota sa record ki "kuch hua": kaun, kya, kab. Jaise <code>{ type: "VideoViewed", user: 912, video: 7, time: "20:15:03" }</code>.<br><strong>Kyun chahiye:</strong> saare sawaal ("kitne views?", "kaun fraud kar raha?") in records ko gin ke hi jawab milte hain.<br><strong>Iske bina:</strong> sirf aaj ki halat (DB ki current row) bachti hai, kya kya hua uska itihaas nahi.` },
    { type: 'p', html: `Pehla idea: ye sab main Postgres pe <code>SELECT ... GROUP BY</code> se nikaal lo. Dikkat: maan lo din mein 50 crore view events. Ek "top videos" query crore rows padhegi. Wo disk aur CPU kha jaayegi. Usi waqt users ke login aur uploads slow ho jaayenge. Production DB chhoti, tez, ek-ek row wali queries ke liye bana hai. Crore rows ko scan karke jodne ke liye nahi.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Production database', html: `<strong>Ye kya hai:</strong> wo database jisse website <em>abhi</em> chal rahi hai: login, upload, comment sab yahin likhte aur padhte hain.<br><strong>Kyun bachana hai:</strong> iska har millisecond users ke liye hai.<br><strong>Iske upar bhaari analytics chalao to:</strong> site slow, aur bura din ho to down.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Data pipeline', html: `<strong>Ye kya hai:</strong> wo raasta jisse raw data (events, logs, DB changes) ek jagah se nikalta hai, saaf aur process hota hai, aur kisi kaam ki jagah pahunchta hai (dashboard, report, ML model, alert). Socho ek conveyor belt jo kachcha maal ek factory se doosri tak le jaata hai.<br><strong>Kyun chahiye:</strong> analytics, recommendations, fraud detection, trending, live leaderboards: sab ko events chahiye, lekin production DB ko chhue bina.<br><strong>Iske bina:</strong> har team apni bhaari query seedhe production DB pe chalayegi.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Batch processing', html: `<strong>Ye kya hai:</strong> data ka ek <em>bada, tay hissa</em> (jaise "kal ke saare events") ek saath uthao, process karo, result likho. Data ka ek shuru aur ek ant hai: isko <strong>bounded</strong> data kehte hain. Jaise teacher saal ke end mein saari copies ek saath check kare.<br><strong>Kyun chahiye:</strong> poore data pe sahi, pakka aur sasta jawab. Galti ho to dobara chala sakte ho.<br><strong>Iske bina:</strong> mahine ki payouts ya ML training ke liye pakka number nahi.<br><strong>Example:</strong> raat 2 baje "kal ki report" job. Result ghanton baad milta hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Stream processing', html: `<strong>Ye kya hai:</strong> events jaise jaise aate hain, waise waise process karo. Flow kabhi khatam nahi hota: isko <strong>unbounded</strong> data kehte hain. Jaise cricket ka scoreboard, jo har ball pe badalta hai.<br><strong>Kyun chahiye:</strong> kuch jawab seconds mein chahiye: live viewers, fraud click, trending abhi.<br><strong>Iske bina:</strong> fraud raat ko pata chalega, jab paisa ja chuka hoga.<br><strong>Dikkat:</strong> "poora data" kabhi hota hi nahi, isliye "pichhle 1 minute" jaise <em>windows</em> mein sochna padta hai (aage widget mein).` },
    { type: 'compare',
      left: { title: 'Batch', html: `• Input: bounded (kal ka data)<br>• Kab: schedule pe (har raat, har ghanta)<br>• Latency: minutes se ghante<br>• Complete aur sahi, dobara chala sakte ho<br>• Tools: MapReduce/Hadoop, Spark, warehouse SQL<br>• Example: daily report, ML training, monthly creator payouts` },
      right: { title: 'Stream', html: `• Input: unbounded (events aate rehte hain)<br>• Kab: hamesha chalu<br>• Latency: milliseconds se seconds<br>• Late/out-of-order events ka jhanjhat; state sambhalna mushkil<br>• Tools: Flink, Kafka Streams, Spark Structured Streaming<br>• Example: live viewers, fraud checks, surge pricing, trending` },
    },
    { type: 'callout', tone: 'term', title: 'Naya word: Latency (data ki)', html: `<strong>Ye kya hai:</strong> event hone aur uska result dashboard pe dikhne ke beech ka time. Stream mein seconds, batch mein ghante.<br><strong>Kyun zaroori:</strong> yahi tay karta hai ki batch chalega ya stream chahiye.<br><strong>Dhyaan do:</strong> kam latency ke saath aksar kam "pakkapan" aata hai (late events chhoot sakte hain).` },
    { type: 'p', html: `Khud feel karo. Neeche xyz.com ka ek din hai: har ghante kitne lakh views aaye. Slider se "abhi ka time" aage badhao aur dekho stream dashboard aur batch report kya dikhate hain.` },
    { type: 'custom', render(el) {
      const H = [3, 2, 1, 1, 1, 2, 4, 6, 8, 9, 10, 11, 12, 12, 11, 11, 12, 14, 17, 20, 22, 21, 15, 8];
      const LATE = 0.01;
      el.innerHTML = `<label>Abhi ka time: <strong class="bs-tv"></strong></label><input class="bs-t" type="range" min="1" max="27" step="1" value="20">
        <svg class="bs-svg" viewBox="0 0 640 170" style="width:100%;height:auto;margin-top:8px;display:block" role="img" aria-label="Har ghante ke views"></svg>
        <div class="stats">
          <div class="stat"><span>Asli views (aaj ab tak)</span><strong class="bs-true"></strong></div>
          <div class="stat"><span>Stream dashboard</span><strong class="bs-st"></strong></div>
          <div class="stat"><span>Batch report (aaj ki)</span><strong class="bs-bt"></strong></div>
        </div>
        <div class="calc-note bs-note"></div>`;
      const $ = c => el.querySelector(c);
      const hh = t => (t % 24 < 10 ? '0' : '') + (t % 24) + ':00' + (t >= 24 ? ' (agla din)' : '');
      const upd = () => {
        const t = +$('.bs-t').value, upto = Math.min(t, 24);
        const tru = H.slice(0, upto).reduce((a, b) => a + b, 0), total = H.reduce((a, b) => a + b, 0);
        $('.bs-tv').textContent = hh(t);
        let svg = '';
        H.forEach((v, i) => { const x = 20 + i * 25, hgt = v * 5.5; svg += `<rect x="${x}" y="${130 - hgt}" width="19" height="${hgt}" rx="3" fill="${i < upto ? 'var(--accent)' : 'var(--line-2)'}" opacity="${i < upto ? 1 : .6}"/>`; if (i % 3 === 0) svg += `<text x="${x + 9}" y="148" text-anchor="middle" font-size="11" fill="var(--ink-3)" font-family="var(--f-mono)">${i}h</text>`; });
        svg += `<line x1="${20 + Math.min(t, 24) * 25 - 3}" y1="8" x2="${20 + Math.min(t, 24) * 25 - 3}" y2="134" stroke="var(--red)" stroke-width="2"/>`;
        svg += `<text x="620" y="166" text-anchor="end" font-size="11" fill="var(--ink-3)">batch job: raat 02:00-03:00</text>`;
        $('.bs-svg').innerHTML = svg;
        $('.bs-true').textContent = tru + ' lakh';
        $('.bs-st').textContent = '~' + (tru * (1 - LATE)).toFixed(1) + ' lakh (10 s purana)';
        const done = t >= 27;
        $('.bs-bt').textContent = done ? total + ' lakh (pakka)' : t >= 26 ? 'job chal raha hai...' : 'abhi nahi (raat 2 baje)';
        $('.bs-note').textContent = done
          ? `Batch ne poore din ka data ek saath gina: ${total} lakh, late events bhi shaamil. Lekin ye number tab mila jab din khatam hue 3 ghante ho chuke. Stream ne din bhar ~${(total * (1 - LATE)).toFixed(1)} lakh dikhaya: ~1% events (offline phones) der se aaye aur live ginti se chhoot gaye.`
          : `Stream dashboard har ~10 second update hota hai, lekin ~1% events der se pahunchte hain (phone offline tha), to live number thoda kam hai. Batch report abhi hai hi nahi: wo din khatam hone ke baad, raat 2 baje ek saath chalegi.`;
      };
      $('.bs-t').addEventListener('input', upd); upd();
    }},
    { type: 'p', html: `Seekh: stream <strong>jaldi</strong> deta hai, batch <strong>pakka</strong> deta hai. Isliye bahut companies dono rakhti hain. Ab dono ke tools ek ek karke.` },

    { type: 'h2', text: 'MapReduce: ek bade kaam ko hazaar machines mein baantna' },
    { type: 'p', html: `2000 ke dashak ki shuruaat mein Google ke paas poore web ke pages aur logs the: itna data jo ek machine pe kabhi process na ho. Har team apna alag distributed code likhti thi: data machines mein kaise baantein, machine mar jaaye to kya, results kaise jodein. 2004 mein Jeffrey Dean aur Sanjay Ghemawat ne paper likha: <em>"MapReduce: Simplified Data Processing on Large Clusters"</em> (OSDI 2004). Idea itna simple tha ki programmer sirf do functions likhe, aur baaki saari mushkil (baantna, machines ka marna, results jodna) library sambhale.` },
    { type: 'callout', tone: 'term', title: 'Naya word: MapReduce', html: `<strong>Ye kya hai:</strong> bade data ko hazaar machines mein baant ke process karne ka ek tareeka (aur uska software). Tum sirf do chhote functions likhte ho: <em>map</em> aur <em>reduce</em>.<br><strong>Kyun chahiye:</strong> data ek machine pe samaata nahi; hazaar machines chahiye, aur unhe sambhalna (baantna, marna, jodna) mushkil hai. MapReduce ye mushkil kaam khud karta hai.<br><strong>Iske bina:</strong> har team apna distributed code likhti, aur har baar machine marne pe job toot-ta.<br><strong>Example:</strong> classroom ke 40 bachche ek moti kitaab ke words ginein: har bachcha apne 10 page gine (map), phir "a" se "m" wale words ek bachche ko, baaki doosre ko (shuffle), aur wo jod dein (reduce).` },
    { type: 'callout', tone: 'term', title: 'Naye words: Map, Shuffle, Reduce, Combiner', html: `<strong>Map:</strong> har input record pe chalne wala function jo <code>(key, value)</code> pairs nikaalta hai. <em>Key</em> = kis cheez ki ginti, <em>value</em> = kitna. Word count mein: har word ke liye <code>(word, 1)</code>.<br><strong>Shuffle:</strong> framework ka kaam (tumhara code nahi): same key wale saare pairs ek hi machine pe ikatthe karna, aur key ke hisaab se sort karna. Kaunsi machine? Key ke <em>hash</em> (key se nikla ek number) se tay hota hai.<br><strong>Reduce:</strong> ek key aur uski saari values leke unhe jodne wala function: <code>("live", [1,1,1,1]) → ("live", 4)</code>.<br><strong>Combiner (optional):</strong> mapper ki machine pe hi chhota reduce, taaki network pe kam pairs jaayein.<br><strong>Kyun teen step:</strong> map aur reduce dono parallel chalte hain, kyunki har machine apna alag hissa sambhalti hai. Shuffle hi wo pul hai jo sahi data sahi machine tak le jaata hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Distributed file system (GFS, HDFS)', html: `<strong>Ye kya hai:</strong> ek "badi hard disk" jo asal mein hazaar machines ki disks se bani hai. File ko 64 MB jaise tukdon (blocks) mein kaat ke alag machines pe rakhta hai, har tukde ki 3 copies. Google ka GFS, Hadoop ka HDFS. Aaj zyaadatar S3 jaisi object storage ye kaam karti hai.<br><strong>Kyun chahiye:</strong> MapReduce ka input aur output yahin rehta hai. Ek machine mare to doosri copy kaam aati hai.<br><strong>Iske bina:</strong> ek machine ki disk kharab = data gaya.` },
    { type: 'p', html: `Neeche xyz.com ke search log ki 4 lines hain, do machines (mappers) mein baanti hui. Har step pe "Agla step" dabao. Combiner on/off karke dekho ki network pe kitne pairs jaate hain.` },
    { type: 'custom', render(el) {
      const SPLITS = [['cricket live score', 'live cricket match'], ['cricket highlights', 'live news live']];
      const R = 2;
      const h = w => { let s = 0; for (const c of w) s += c.charCodeAt(0); return s; };
      const part = w => h(w) % R;
      const STEPS = ['Input', 'Map', 'Combine', 'Shuffle', 'Reduce'];
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
          <button type="button" class="btn small ghost bd-prev">Pichhla</button>
          <button type="button" class="btn small primary bd-next">Agla step</button>
          <label style="display:flex;gap:6px;align-items:center;font-size:14px;color:var(--ink-2)"><input class="bd-comb" type="checkbox"> Combiner on</label>
        </div>
        <div class="chips bd-steps" style="margin-top:10px"></div>
        <div class="bd-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:10px"></div>
        <div class="stats">
          <div class="stat"><span>Pairs mappers ne nikaale</span><strong class="bd-emit"></strong></div>
          <div class="stat"><span>Pairs network pe (shuffle)</span><strong class="bd-net"></strong></div>
          <div class="stat"><span>Final output</span><strong class="bd-out"></strong></div>
        </div>
        <div class="calc-note bd-note"></div>`;
      const $ = c => el.querySelector(c);
      let step = 0;
      const box = (title, body, tone) => `<div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:8px 10px;background:${tone ? 'var(--accent-soft)' : 'var(--surface)'}"><div style="font:600 13px var(--f-display);color:var(--ink);margin-bottom:4px">${title}</div><div style="font:12.5px/1.6 var(--f-mono);color:var(--ink-2);word-break:break-word">${body}</div></div>`;
      const compute = comb => {
        const mapped = SPLITS.map(lines => lines.flatMap(l => l.split(' ').map(w => [w, 1])));
        const combined = mapped.map(pairs => { const m = {}; pairs.forEach(([w, v]) => m[w] = (m[w] || 0) + v); return Object.entries(m); });
        const sent = comb ? combined : mapped;
        const groups = Array.from({ length: R }, () => ({}));
        sent.forEach(pairs => pairs.forEach(([w, v]) => { const g = groups[part(w)]; (g[w] = g[w] || []).push(v); }));
        const reduced = groups.map(g => Object.keys(g).sort().map(w => [w, g[w].reduce((a, b) => a + b, 0)]));
        return { mapped, combined, sent, groups, reduced, emitted: mapped.flat().length, net: sent.flat().length };
      };
      const upd = () => {
        const comb = $('.bd-comb').checked;
        if (!comb && step === 2) step = 3;
        const c = compute(comb);
        $('.bd-steps').innerHTML = STEPS.map((s, i) => `<span class="chip${i === step ? ' on' : ''}" style="${!comb && i === 2 ? 'opacity:.45;text-decoration:line-through' : ''}">${i + 1}. ${s}</span>`).join('');
        let html = '';
        if (step === 0) html = SPLITS.map((ls, i) => box(`Split ${i + 1} → Mapper ${i + 1}`, ls.map(l => `"${l}"`).join('<br>'))).join('');
        if (step === 1) html = c.mapped.map((ps, i) => box(`Mapper ${i + 1}: map()`, ps.map(([w, v]) => `(${w}, ${v})`).join('<br>'), 1)).join('');
        if (step === 2) html = c.combined.map((ps, i) => box(`Mapper ${i + 1}: combine()`, ps.map(([w, v]) => `(${w}, ${v})`).join('<br>'), 1)).join('');
        if (step === 3) html = c.groups.map((g, i) => box(`Reducer ${i} ko mila (sorted)`, Object.keys(g).sort().map(w => `${w} [h=${h(w)}] → [${g[w].join(', ')}]`).join('<br>'), 1)).join('');
        if (step === 4) html = c.reduced.map((ps, i) => box(`Reducer ${i}: reduce()`, ps.map(([w, v]) => `${w}: <strong>${v}</strong>`).join('<br>'), 1)).join('');
        $('.bd-grid').innerHTML = html;
        $('.bd-emit').textContent = step >= 1 ? c.emitted : '-';
        $('.bd-net').textContent = step >= 3 ? c.net : '-';
        $('.bd-out').textContent = step >= 4 ? c.reduced.flat().map(([w, v]) => w + ':' + v).join(' ') : '-';
        const notes = [
          '4 lines, 2 splits. Asli MapReduce mein input 16-64 MB ke tukdon (splits) mein baanta jaata tha, aur har split ek map task banta tha. Master (ek coordinator) map tasks idle machines ko deta hai, aur koshish karta hai ki task wahi machine pe chale jahan us split ki copy disk pe hai (data ke paas compute bhejo, data ko network pe mat ghumao).',
          `Har mapper ne har word ke liye (word, 1) nikaala: total ${c.emitted} pairs. Mappers aapas mein baat nahi karte: isliye parallel aur independent. Output mapper ki apni local disk pe likha jaata hai, R hisson mein baant ke.`,
          `Combiner ne mapper pe hi same words jod diye: Mapper 1 ke ${c.mapped[0].length} pairs ab ${c.combined[0].length}, Mapper 2 ke ${c.mapped[1].length} ab ${c.combined[1].length}. Ye tabhi chalta hai jab operation (jaise sum) ko tukdon mein karke jodne se same jawab aaye.`,
          `Shuffle: har pair ka reducer = hash(word) mod ${R}. Yahan hash = letters ke codes ka jod (sirf samjhaane ke liye). Same word hamesha same reducer pe, chahe kisi bhi mapper se aaye. Reducer apne pairs mappers ki disks se network pe kheenchta hai aur key se sort karta hai. Network pe ${c.net} pairs gaye${comb ? ' (combiner ki wajah se ' + c.emitted + ' ki jagah)' : ''}. Asli jobs mein yahi step sabse mehenga hota hai.`,
          'Reduce: har reducer apne words ki values jodta hai. Reducers bhi parallel chalte hain kyunki unke words alag hain. Output distributed file system (Google mein GFS) pe likha jaata hai.',
        ];
        $('.bd-note').textContent = notes[step];
        $('.bd-prev').disabled = step === 0; $('.bd-next').disabled = step === 4;
      };
      $('.bd-next').addEventListener('click', () => { step = Math.min(4, step + 1); if (!$('.bd-comb').checked && step === 2) step = 3; upd(); });
      $('.bd-prev').addEventListener('click', () => { step = Math.max(0, step - 1); if (!$('.bd-comb').checked && step === 2) step = 1; upd(); });
      $('.bd-comb').addEventListener('change', upd); upd();
    }},

    { type: 'h3', text: 'Paper se teen gehri baatein' },
    { type: 'list', items: [
      `<strong>Machines marti hain, ye normal hai.</strong> Hazaaron sasti machines mein roz koi na koi girti hai. Master workers ko baar baar ping karta hai; koi jawab na de to uske tasks doosri machine ko de deta hai. Mazedaar baat: us machine ke <em>poore ho chuke</em> map tasks bhi dobara chalte hain, kyunki unka output usi mari hui machine ki local disk pe tha. Map aur reduce functions deterministic hon to dobara chalane se same result aata hai: isi se fault tolerance "muft" mili.`,
      `<strong>Stragglers (pichhad jaane wale).</strong> Ek kharaab disk wali machine poore job ko rok sakti hai, kyunki job tabhi khatam jab aakhri task khatam. Ilaaj: job ke end ke paas bache hue tasks ki <em>backup copies</em> doosri machines pe bhi chalao; jo pehle khatam, wahi jeeta. Paper ke 1 TB sort experiment mein backup tasks band karne pe job 44% zyada time leta tha (891 s ki jagah 1283 s).`,
      `<strong>Data ke paas compute.</strong> Network us zamane mein sabse kam resource tha. Input GFS mein 64 MB blocks ki 3 copies mein pada hota tha, aur master map task wahi machine pe bhejta jahan copy thi. Bade jobs mein zyaadatar input local disk se padha jaata, network se nahi.`,
    ]},
    { type: 'p', html: `Paper mein Google ka production indexing system bhi MapReduce pe dobara likha gaya tha, aur web pages se data nikaalne, machine learning, graph computations jaise kaamon mein use hota tha. Doug Cutting aur Mike Cafarella ne (aur baad mein Yahoo ne bade paimaane pe) iska open-source roop banaya: <strong>Hadoop</strong> (HDFS + Hadoop MapReduce), jo 2010s ka "big data" ka matlab ban gaya. Paper 2004 ka hai; aaj Google aur baaki duniya MapReduce ki jagah naye systems use karti hai, lekin map → shuffle → reduce ka idea har tool ke andar zinda hai.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"MapReduce ek database hai." Nahi, ye ek <strong>programming model + execution engine</strong> hai: files padho, transform karo, files likho. Data rakhne ka kaam file system (GFS/HDFS, aaj S3) ka hai. Aur "reduce" ka matlab hamesha "chhota karna" nahi; reducer ek key ki saari values pe jo chahe kar sakta hai (sort, list banana, join).` },

    { type: 'h2', text: 'Spark: disk nahi, memory' },
    { type: 'p', html: `MapReduce ki ek badi kamzori hai. Har job ka output disk (HDFS) pe likho, agla job wahan se padhe. Machine learning ka algorithm same data pe 20 baar ghoomta hai (isko <em>iterations</em> kehte hain). Matlab 20 baar disk pe likhna aur padhna. Disk RAM se bahut dheemi hai. Data scientist ek sawaal poochhe, 10 minute ruke, doosra poochhe, phir 10 minute.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Apache Spark', html: `<strong>Ye kya hai:</strong> ek batch processing engine (UC Berkeley se aaya, Matei Zaharia aur saathi) jo beech ka data <strong>memory (RAM) mein</strong> rakh sakta hai, har step ke baad disk pe nahi.<br><strong>Kyun chahiye:</strong> jo kaam same data pe baar baar ghoomte hain (ML training, ek ke baad ek sawaal), unke liye har baar disk se padhna bahut dheema hai.<br><strong>Iske bina:</strong> MapReduce mein 20 iterations = 20 baar disk ka chakkar.<br><strong>Example:</strong> xyz.com ka "kal ke top 10 videos" job, neeche code mein.` },
    { type: 'callout', tone: 'term', title: 'Naye words: RDD aur lineage', html: `<strong>RDD (Resilient Distributed Dataset):</strong> Spark ka core idea (NSDI 2012 paper). Ek read-only dataset jo kai machines mein tukdon (<em>partitions</em>) mein bikhra hai, aur memory mein rakha ja sakta hai.<br><strong>Lineage:</strong> har tukde ka "janam ka record": kis input se, kin steps (filter, map...) se bana. Machine mar jaaye to Spark sirf wo tukda in steps se dobara bana leta hai. Poore data ki copies rakhne ki zaroorat nahi.<br><strong>Iske bina:</strong> memory ka data machine ke saath gaya; ya to har cheez ki copy rakho (mehenga) ya poora job dobara chalao.<br>Paper ke mutabik iterative aur interactive kaamon mein memory mein rakhne se ~10 guna (order of magnitude) tak ka farq aaya.` },
    { type: 'callout', tone: 'term', title: 'Naya word: DAG', html: `<strong>Ye kya hai:</strong> DAG (Directed Acyclic Graph) steps ka ek naksha jisme arrows sirf aage jaate hain, kabhi wapas ghoom ke loop nahi banate.<br><strong>Kyun chahiye:</strong> Spark mein tum <code>read → filter → map → join → groupBy → write</code> likhte ho. Spark turant kuch nahi chalata (isko <strong>lazy</strong> kehte hain). Pehle poora DAG banata hai, phir optimise karke chalata hai: kaun se steps ek hi machine pe saath chal sakte hain (bina shuffle), aur shuffle kahan zaroori hai.<br><strong>Iske bina:</strong> MapReduce mein har cheez ko zabardasti map + reduce ke jodon mein todna padta tha, aur har jode ke beech disk.` },
    { type: 'code', text: `# PySpark: "kal ke top 10 videos" (xyz.com)
views = spark.read.parquet("s3://xyz-lake/events/date=2026-10-03/")   # data lake se
top = (views.filter(views.type == "VideoViewed")
            .groupBy("video_id").count()          # yahan shuffle
            .orderBy("count", ascending=False)
            .limit(10))
top.write.mode("overwrite").saveAsTable("analytics.top_videos_daily")` },
    { type: 'callout', tone: 'term', title: 'Naya word: Parquet', html: `<strong>Ye kya hai:</strong> data files ka ek format jo data ko <em>column-wise</em> rakhta hai (ek column ki saari values saath) aur compress karta hai. Upar code mein events isi format mein hain.<br><strong>Kyun chahiye:</strong> analytics query aksar 30 mein se 2-3 columns maangti hai. Parquet se sirf wahi columns padhne padte hain, aur file 5-10 guna chhoti ho sakti hai.<br><strong>Iske bina:</strong> JSON/CSV files mein har query poori line padhti hai, har baar.<br>(Column-wise ka poora fayda OLTP vs OLAP section mein dekhenge.)` },
    { type: 'p', html: `Ab number feel karo. Ek ML job 100 GB data pe kai baar ghoomta hai. MapReduce har iteration ke baad disk pe likhta aur agli baar disk se padhta hai. Spark ek baar padh ke memory mein rakh leta hai.` },
    { type: 'custom', render(el) {
      const READ = 100, WRITE = 100, CPU = 20, MEM = 5, M = 10;
      el.innerHTML = `<label>Iterations (same data pe kitni baar ghoomna): <strong class="sp-kv"></strong></label><input class="sp-k" type="range" min="1" max="30" step="1" value="10">
        <label style="display:flex;gap:6px;align-items:center;margin-top:8px;font-size:14px;color:var(--ink-2)"><input class="sp-crash" type="checkbox"> Beech mein 10 mein se 1 machine mar gayi</label>
        <div class="sp-bars" style="margin-top:10px;display:flex;flex-direction:column;gap:8px"></div>
        <div class="stats">
          <div class="stat"><span>MapReduce (disk har baar)</span><strong class="sp-mr"></strong></div>
          <div class="stat"><span>Spark (memory)</span><strong class="sp-sp"></strong></div>
          <div class="stat"><span>Spark kitna tez</span><strong class="sp-x"></strong></div>
        </div>
        <div class="calc-note sp-note"></div>
        <div class="calc-note">Maan liya (sirf samjhane ke liye): 100 GB disk se padhna 100 s, disk pe likhna 100 s, ek iteration ka compute 20 s, memory se padhna 5 s. 10 machines.</div>`;
      const $ = c => el.querySelector(c);
      const fm = s => s >= 120 ? (s / 60).toFixed(1) + ' min' : Math.round(s) + ' s';
      const upd = () => {
        const k = +$('.sp-k').value, crash = $('.sp-crash').checked;
        let mr = k * (READ + CPU + WRITE), sp = READ + k * (MEM + CPU) + WRITE;
        const mrC = (READ + CPU + WRITE) / M, spC = READ / M + CPU / M;
        if (crash) { mr += mrC; sp += spC; }
        $('.sp-kv').textContent = k;
        const mx = Math.max(mr, sp);
        const bar = (n, v, col) => `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span style="flex:0 0 96px;font-size:13px;color:var(--ink-2)">${n}</span><span style="flex:1 1 160px;height:16px;background:var(--surface-2);border-radius:4px;position:relative"><span style="position:absolute;left:0;top:0;bottom:0;width:${(v / mx * 100).toFixed(1)}%;background:${col};border-radius:4px"></span></span><span style="flex:0 0 70px;text-align:right;font:13px var(--f-mono);color:var(--ink)">${fm(v)}</span></div>`;
        $('.sp-bars').innerHTML = bar('MapReduce', mr, 'var(--amber)') + bar('Spark', sp, 'var(--accent)');
        $('.sp-mr').textContent = fm(mr); $('.sp-sp').textContent = fm(sp);
        $('.sp-x').textContent = (mr / sp).toFixed(1) + 'x';
        $('.sp-note').textContent = (k === 1
          ? 'Sirf 1 iteration: dono ko data ek baar padhna aur ek baar likhna hi hai, to farq lagbhag zero. Spark ka fayda tab hai jab data baar baar use ho.'
          : `${k} iterations: MapReduce ne ${k} baar padha aur ${k} baar likha. Spark ne ek baar padha, ${k} baar memory se use kiya, aur end mein ek baar likha. Iterations badhao to farq badhta hai: 10 pe ~5x, 30 pe ~7x (in numbers pe kabhi ~9x se upar nahi, kyunki compute dono mein same hai).`)
          + (crash ? ` Machine mari: MapReduce ne uske tasks dobara chalaye (+${fm(mrC)}); Spark ne lineage se sirf mari machine ke tukde dobara banaye (+${fm(spC)}). Dono bach gaye, kisi ne poora job dobara nahi chalaya.` : '');
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Spark memory mein hai, to hamesha MapReduce se 100 guna tez." Nahi. Ek baar padh ke ek baar likhne wale simple job mein dono ko disk se guzarna hi hai (widget mein 1 iteration). Aur data RAM se bada ho to Spark ko bhi disk pe "spill" karna padta hai. Fayda baar baar same data use karne mein hai.` },
    { type: 'p', html: `Aaj Spark batch ka default tool hai: SQL (Spark SQL), ML (MLlib), aur <strong>Structured Streaming</strong> bhi, jo stream ko chhote chhote batches (micro-batches) mein process karta hai. Isse ek hi code style mein batch aur near-real-time dono ho jaate hain, lekin micro-batch ki wajah se latency aam taur pe ~100 ms se kuch seconds tak hoti hai.` },

    { type: 'h2', text: 'Stream processing: Flink aur Kafka Streams' },
    { type: 'p', html: `Live match ke viewer count ke liye "kal raat" ka intezaar nahi chalega. Events Kafka mein aa hi rahe hain (Kafka lesson); ab chahiye ek engine jo unhe lagatar padhe, ginti <em>yaad</em> rakhe (state), aur har kuch second mein result nikaale.` },
    { type: 'callout', tone: 'term', title: 'Naya word: State (stream mein)', html: `<strong>Ye kya hai:</strong> stream job ki apni "yaad-daasht": abhi tak ki gintiyan, totals, ya pichhle events. Jaise "video 7: 2,31,045 views ab tak".<br><strong>Kyun chahiye:</strong> har naya event akela kuch nahi batata. Ginti ke liye pichhli ginti yaad honi chahiye.<br><strong>Iske bina:</strong> har event pe DB se puraani ginti padho aur likho: crore events pe DB doob jaayega.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Apache Flink', html: `<strong>Ye kya hai:</strong> ek distributed stream processing engine jo events ko ek ek karke (micro-batch nahi) process karta hai. Apna cluster chalta hai: ek <em>JobManager</em> (manager) aur kai <em>TaskManagers</em> (kaam karne wali machines).<br><strong>Kyun chahiye:</strong> teen cheezein ise khaas banati hain: (1) <strong>state</strong> har key (jaise video_id) ki, machines mein bikhri hui, fault-tolerant; (2) <strong>checkpoints</strong> (neeche); (3) <strong>event time</strong> aur <strong>windows</strong> ka gehra support (aage dekhenge).<br><strong>Iske bina:</strong> bade, stateful, live jobs (ad clicks ki ginti, fraud) ke liye khud ka crash-safe system banana padta.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Checkpoint', html: `<strong>Ye kya hai:</strong> har kuch second mein Flink saari state ki ek consistent "photo" durable storage (S3) mein rakhta hai, aur <em>usi photo ke saath</em> Kafka ka position (offset) bhi. Jaise video game ka save point.<br><strong>Kyun chahiye:</strong> machine mare to aakhri save point se state wapas laao, aur Kafka ko wahi se dobara padho. Kuch bhi do baar nahi gina jaata, kuch chhoot-ta nahi: isko state pe <strong>exactly-once</strong> kehte hain.<br><strong>Iske bina:</strong> memory ki ginti machine ke saath gayi.` },
    { type: 'p', html: `Khud chala ke dekho. Video 7 pe har second 1,000 view events aa rahe hain. Flink ginti kar raha hai. Checkpoint kitni der mein lena hai, aur crash kab hua, wo chuno. Phir checkpoint band karke dekho kya bigadta hai.` },
    { type: 'custom', render(el) {
      const R = 1000, RESTART = 10, CATCH = 10, AUTO = 5;
      el.innerHTML = `<div class="chips fk-m" role="group" aria-label="Mode"><button type="button" class="chip on" data-m="ck">Flink checkpoint ON</button><button type="button" class="chip" data-m="no">Bina checkpoint (sirf offset commit)</button></div>
        <div class="row2" style="margin-top:10px">
          <div class="fk-cw"><label>Checkpoint har: <strong class="fk-cv"></strong></label><input class="fk-c" type="range" min="5" max="60" step="5" value="30"></div>
          <div><label>Crash kab hua: <strong class="fk-tv"></strong></label><input class="fk-t" type="range" min="1" max="120" step="1" value="77"></div>
        </div>
        <svg class="fk-svg" viewBox="0 0 640 90" style="width:100%;height:auto;margin-top:10px;display:block" role="img" aria-label="Checkpoint timeline"></svg>
        <div class="stats">
          <div class="stat"><span>Asli views (crash tak)</span><strong class="fk-true"></strong></div>
          <div class="stat"><span>Wapas kahan se</span><strong class="fk-from"></strong></div>
          <div class="stat"><span>Dobara padhe events</span><strong class="fk-rep"></strong></div>
          <div class="stat"><span>Recovery ke baad ginti</span><strong class="fk-cnt"></strong></div>
        </div>
        <div class="calc-note fk-note"></div>`;
      const $ = c => el.querySelector(c);
      let mode = 'ck';
      const n = v => v.toLocaleString('en-IN');
      const upd = () => {
        const C = +$('.fk-c').value, T = +$('.fk-t').value, tru = R * T;
        $('.fk-cv').textContent = C + ' s'; $('.fk-tv').textContent = T + ' s'; $('.fk-cw').style.display = mode === 'ck' ? '' : 'none';
        const X = t => 20 + t * 5;
        let svg = `<line x1="20" y1="50" x2="620" y2="50" stroke="var(--line-2)" stroke-width="2"/>`;
        for (let t = 0; t <= 120; t += 20) svg += `<text x="${X(t)}" y="80" text-anchor="middle" font-size="11" fill="var(--ink-3)" font-family="var(--f-mono)">${t}s</text>`;
        let from, rep, cnt;
        if (mode === 'ck') {
          for (let t = C; t <= 120; t += C) svg += `<rect x="${X(t) - 4}" y="40" width="8" height="20" rx="2" fill="${t <= T ? 'var(--green)' : 'var(--line-2)'}"/>`;
          from = Math.floor(T / C) * C; rep = (T - from) * R; cnt = tru;
        } else {
          for (let t = AUTO; t <= 120; t += AUTO) svg += `<circle cx="${X(t)}" cy="50" r="2.5" fill="${t <= T ? 'var(--ink-3)' : 'var(--line-2)'}"/>`;
          from = Math.floor(T / AUTO) * AUTO; rep = (T - from) * R; cnt = rep;
        }
        svg += `<rect x="${X(from)}" y="34" width="${Math.max(2, X(T) - X(from))}" height="32" fill="var(--amber)" opacity=".3"/>`;
        svg += `<text x="${X(T)}" y="26" text-anchor="middle" font-size="16" fill="var(--red)">✖</text>`;
        $('.fk-svg').innerHTML = svg;
        $('.fk-true').textContent = n(tru);
        $('.fk-from').textContent = from + ' s';
        $('.fk-rep').textContent = n(rep);
        $('.fk-cnt').textContent = n(cnt) + (cnt === tru ? ' ✓' : ' ✗');
        $('.fk-cnt').style.color = cnt === tru ? 'var(--green)' : 'var(--red)';
        $('.fk-note').textContent = mode === 'ck'
          ? `Aakhri checkpoint ${from} s pe tha: us waqt ki ginti (${n(from * R)}) aur Kafka offset dono saath save the. Flink ne dono wapas laaye aur ${T - from} s ke ${n(rep)} events Kafka se dobara padhe. Ginti bilkul sahi. Recovery ~${RESTART + Math.ceil((T - from) / CATCH)} s (restart ~${RESTART} s + replay 10x speed pe). Checkpoint jaldi jaldi lo to replay kam, lekin har checkpoint ka thoda kharcha (S3 pe likhna).`
          : `Kafka consumer ne offset har ${AUTO} s commit kiya (${from} s tak), lekin ginti sirf memory mein thi. Crash ke baad offset ${from} s se shuru hua aur ginti 0 se: ${n(tru - cnt)} views gayab. Isliye state aur offset ek saath, ek hi photo mein save hone chahiye.`;
      };
      el.querySelectorAll('.fk-m .chip').forEach(b => b.addEventListener('click', () => { mode = b.dataset.m; el.querySelectorAll('.fk-m .chip').forEach(x => x.classList.toggle('on', x === b)); upd(); }));
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'term', title: 'Naya word: Kafka Streams', html: `<strong>Ye kya hai:</strong> koi alag cluster nahi, ek <strong>Java library</strong> jo tumhari apni service ke andar chalti hai. Input Kafka se, output Kafka mein. State machine ki local disk pe ek chhote database (<em>RocksDB</em>) mein, aur uska backup ek Kafka topic (<em>changelog</em>) mein.<br><strong>Kyun chahiye:</strong> agar data pehle se Kafka mein hai aur logic ek service jitna hai, to Flink jaisa poora naya cluster chalana zyada hai. Bas apni service ki aur copies chalao; Kafka partitions unme baant deta hai. Windowing aur exactly-once bhi support karta hai.<br><strong>Iske bina:</strong> chhote stream kaam ke liye bhi alag cluster, alag team, alag deploy.<br><strong>Example:</strong> "har user ke pichhle 5 minute ke likes" gin ke spam check.` },
    { type: 'p', html: `Kafka Streams ka scaling neeche chala ke dekho. Topic <code>likes</code> ke <strong>6 partitions</strong> hain (Kafka lesson yaad karo: partition = topic ka ek hissa, aur ek partition ek waqt pe group ke ek hi member ko milta hai). Har partition ki ginti (state) usi instance ke paas rehti hai jiske paas partition hai. Instances badhao ghatao:` },
    { type: 'custom', render(el) {
      const P = 6, IN = 24000, CAP = 5000, ST = [41, 38, 44, 36, 40, 39];
      el.innerHTML = `<label>App instances (copies): <strong class="ks-nv"></strong></label><input class="ks-n" type="range" min="1" max="8" step="1" value="2">
        <div class="ks-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin-top:10px"></div>
        <div class="stats">
          <div class="stat"><span>Kaam kar rahe instances</span><strong class="ks-busy"></strong></div>
          <div class="stat"><span>Capacity vs input</span><strong class="ks-cap"></strong></div>
          <div class="stat"><span>Last change pe state restore</span><strong class="ks-mv"></strong></div>
        </div>
        <div class="calc-note ks-note"></div>
        <div class="calc-note">Maan liya: input 24,000 events/s, ek instance 5,000/s sambhal sakta hai, har partition ki state ~40 MB. Is widget mein partitions round-robin baante hain; asli Kafka ka sticky/cooperative assignment kam partitions hilata hai.</div>`;
      const $ = c => el.querySelector(c);
      let prev = 2;
      const own = N => Array.from({ length: P }, (_, i) => i % N);
      const upd = () => {
        const N = +$('.ks-n').value; $('.ks-nv').textContent = N;
        const a = own(N), b = own(prev);
        const moved = a.map((x, i) => x !== b[i] ? i : -1).filter(i => i >= 0);
        let html = '';
        for (let k = 0; k < N; k++) {
          const ps = a.map((x, i) => x === k ? i : -1).filter(i => i >= 0);
          html += `<div style="border:1px solid ${ps.length ? 'var(--accent)' : 'var(--line)'};border-radius:var(--r-sm);padding:8px;background:${ps.length ? 'var(--accent-soft)' : 'transparent'};opacity:${ps.length ? 1 : .55}"><div style="font:600 13px var(--f-display);color:var(--ink)">Instance ${k + 1}</div><div style="font:12.5px/1.6 var(--f-mono);color:var(--ink-2)">${ps.length ? ps.map(p => `P${p}${moved.includes(p) ? ' ↻' : ''}`).join(', ') + '<br>state: ' + ps.reduce((s, p) => s + ST[p], 0) + ' MB' : 'idle: koi partition nahi'}</div></div>`;
        }
        $('.ks-grid').innerHTML = html;
        const busy = Math.min(N, P), cap = busy * CAP;
        $('.ks-busy').textContent = busy + ' / ' + N;
        $('.ks-cap').textContent = (cap / 1000) + 'k / ' + (IN / 1000) + 'k per s';
        $('.ks-cap').style.color = cap >= IN ? 'var(--green)' : 'var(--red)';
        $('.ks-mv').textContent = moved.length ? moved.length + ' partitions (' + moved.reduce((s, p) => s + ST[p], 0) + ' MB)' : '0';
        $('.ks-note').textContent = (cap < IN
          ? `${busy} instance ${cap / 1000}k events/s hi sambhal sakte hain, input ${IN / 1000}k/s hai: lag (pichhe rehna) badhta jaayega. Aur instances chalao.`
          : N > P ? `${N} instances, lekin sirf ${P} partitions: ${N - P} instance khaali baithe hain. Max parallelism = partitions ki ginti. Aur chahiye to topic ke partitions badhao (pehle se plan karo).`
          : `${N} instances ${P} partitions baant rahe hain, capacity kaafi hai.`)
          + (moved.length ? ` ↻ wale partitions naye instance pe gaye: unki state changelog topic se dobara local disk pe bharni padi (restore), tab tak wo partitions thode ruke.` : '');
        prev = N;
      };
      $('.ks-n').addEventListener('input', upd); upd();
    }},
    { type: 'compare',
      left: { title: 'Flink', html: `• Alag cluster (JobManager + TaskManagers)<br>• Kai sources/sinks: Kafka, files, databases<br>• Bahut badi state, event time, complex windows<br>• Alag team/ops chahiye<br>• Example: ad clicks ka windowed aggregation, fraud rules` },
      right: { title: 'Kafka Streams', html: `• Library: tumhari service ke andar<br>• Input aur output dono Kafka<br>• State local RocksDB + changelog topic<br>• Scale = service ki copies (max = partitions)<br>• Example: har user ke pichhle 5 min ke likes, chhoti enrichment` },
    },
    { type: 'p', html: `Ab tak ke tukde jodo: apps events Kafka mein bhejte hain. Flink unhe live ginta hai. Saath mein events ek sasti storage (data lake) mein bhi jama hote hain, jahan raat ko Spark poora hisaab karta hai. Dono ke results ek analytics database (ClickHouse) mein jaate hain. Har box pe click karke padho, phir scenarios chalao: stream, batch, crash, aur der se aaya event.` },
    { type: 'flow', title: 'xyz.com ka data platform: stream aur batch saath', height: 330,
      nodes: [
        { id: 'app', label: 'xyz.com apps', sub: 'events', x: 75, y: 170, w: 120, kind: 'server', info: 'Ye kya hai: xyz.com ki website aur mobile apps ke servers. Har view, click, search ek event banta hai aur Kafka mein jaata hai. Isse production DB pe analytics ka koi load nahi.' },
        { id: 'k', label: 'Kafka', sub: 'view-events', x: 235, y: 170, w: 120, kind: 'queue', info: 'Ye kya hai: events ki ek lambi, durable diary (Kafka lesson). Stream jobs yahan se live padhte hain; ek connector yahi events files bana ke data lake tak bhi pahunchata hai. Retention (jitne din data rakha) ke andar dobara padh (replay) sakte ho.' },
        { id: 'fl', label: 'Flink job', sub: '10 s windows', x: 420, y: 75, w: 140, kind: 'server', meter: true, load: 40, info: 'Ye kya hai: stream processing engine (upar dekha). Har video ke views 10-second ke tukdon (windows) mein ginta hai. Ginti (state) memory mein, checkpoints S3 mein. Seconds mein result.' },
        { id: 'dash', label: 'Dashboards', x: 625, y: 50, w: 150, kind: 'client', info: 'Ye kya hai: wo screens jo product team aur creators dekhte hain: live viewer count, creator analytics, daily reports. Sab ClickHouse se padhte hain.' },
        { id: 'ch', label: 'ClickHouse', sub: 'OLAP store', x: 625, y: 170, w: 150, kind: 'data', info: 'Ye kya hai: analytics ke liye bana database (OLAP, lesson ke end mein detail). Data column-wise rakhta hai, isliye arabon rows pe "har video ke total views" jaisi queries seconds mein. Live (Flink) aur daily (Spark) dono results yahin aate hain. BigQuery/Snowflake/Druid bhi isi jagah ho sakte the.' },
        { id: 'lake', label: 'S3 data lake', sub: 'Parquet files', x: 420, y: 265, w: 140, kind: 'data', info: 'Ye kya hai: data lake = sasti object storage (S3) jahan saare raw events Parquet files mein, date ke folders mein pade hain. Saalon ka data rakhna sasta. Batch jobs aur ML training yahan se padhte hain.' },
        { id: 'sp', label: 'Spark job', sub: 'har raat 2 baje', x: 625, y: 290, w: 140, kind: 'server', info: 'Ye kya hai: batch processing engine (upar dekha). Har raat kal ke poore data pe chalta hai: exact counts, creator earnings, ML features. Der se aaye events bhi isme shaamil ho jaate hain.' },
      ],
      edges: [{ a: 'app', b: 'k' }, { a: 'k', b: 'fl' }, { a: 'fl', b: 'ch' }, { a: 'ch', b: 'dash' }, { a: 'k', b: 'lake' }, { a: 'lake', b: 'sp' }, { a: 'sp', b: 'ch' }],
      scenarios: [
        { name: 'Stream: live count', steps: [
          { title: 'Events aaye', text: 'Lakhon log final dekh rahe hain. Har player har kuch second mein "still watching" event bhejta hai.', flood: { paths: ['app>k'], n: 10, kind: 'evt' }, msg: '{ "type": "Heartbeat", "video_id": 7, "user": 912, "event_time": "20:15:03" }' },
          { title: 'Flink ginta hai', text: 'Flink events ko video_id se baant ke (keyBy) har 10-second window mein unique viewers ginta hai. Ginti state mein hai, DB mein nahi.', go: 'evt:k>fl', after: { fl: { state: 'hot', sub: 'window 20:15:00-10' } } },
          { title: 'Window band, result bahar', text: 'Window khatam hote hi result ClickHouse mein. Dashboard pe count ~10-15 second purana hai, lekin live jaisa.', go: ['fl>ch', 'res:ch>dash'], after: { fl: { state: 'ok', sub: '10 s windows' }, dash: { sub: 'LIVE: 2.3 crore' } }, msg: 'video 7, window [20:15:00, 20:15:10) → viewers 2,31,04,512' },
        ]},
        { name: 'Batch: daily report', steps: [
          { title: 'Events lake mein', text: 'Ek connector (jaise Kafka Connect S3 sink) events ko har kuch minute mein Parquet files bana ke S3 mein likhta hai.', go: 'evt:k>lake', after: { lake: { sub: 'date=2026-10-03/' } } },
          { title: 'Raat 2 baje Spark', text: 'Kal ka poora data: bounded. Spark exact unique viewers, watch time, creator earnings nikaalta hai. Isme der se aaye events bhi shaamil hain.', go: 'lake>sp', set: { sp: { state: 'hot', sub: 'processing kal' } } },
          { title: 'Result OLAP mein', text: 'Daily tables ClickHouse/warehouse mein. Subah product team ke dashboard pe kal ki pakki report.', go: ['sp>ch', 'res:ch>dash'], after: { sp: { state: 'ok', sub: 'done 03:40' } } },
        ]},
        { name: 'Flink crash', steps: [
          { title: 'TaskManager mar gaya', text: 'Ek Flink machine crash. Uske paas jin videos ki ginti thi, wo memory mein thi.', set: { fl: { state: 'down', sub: 'CRASH' } }, focus: ['fl'] },
          { title: 'Checkpoint se wapas', text: 'Flink pichhle checkpoint (maan lo 30 second pehle) se saari state wapas laata hai, aur Kafka offsets bhi wahi se: <em>state aur position ek saath</em>.', set: { fl: { state: 'warn', sub: 'restore ckpt #812' } }, focus: ['fl'] },
          { title: 'Replay aur catch up', text: 'Pichhle 30 second ke events Kafka se dobara padhe. Ginti mein na kuch chhuta na do baar gina gaya (state ke liye exactly-once). Lekin agar sink (ClickHouse) mein seedhe likh diya tha, wahan duplicate na ho iske liye sink idempotent ya transactional chahiye.', go: 'evt:k>fl', after: { fl: { state: 'ok', sub: 'caught up' } } },
        ]},
        { name: 'Late event', steps: [
          { title: 'Phone offline tha', text: 'Ek user metro mein tha. Uske phone ne 20:15:03 ke events 20:16:40 pe bheje.', go: 'app>k', msg: 'event_time 20:15:03, arrival 20:16:40  (97 s late)' },
          { title: 'Window pehle hi band', text: 'Flink ne [20:15:00, 20:15:10) window ka result pehle hi bhej diya tha. Ab ye event "late" hai. Default mein drop; ya "allowed lateness" ke andar ho to result update; ya side output mein alag rakho.', go: 'evt:k>fl', set: { fl: { state: 'warn', sub: 'late: side output' } } },
          { title: 'Batch sab theek karta hai', text: 'Raat ka Spark job poore din ka data dekhta hai, late events bhi. Isliye billing jaisi pakki ginti batch se, live ginti stream se: roadmap ka "batch reconciliation" yahi hai.', go: ['evt:k>lake', 'lake>sp', 'sp>ch'] },
        ]},
      ],
    },

    { type: 'h2', text: 'Windowing: kabhi na khatam hone wale stream ko tukdon mein ginna' },
    { type: 'p', html: `Batch mein "kal ke views" poochhna aasaan hai: kal khatam ho chuka. Stream kabhi khatam nahi hota, to "total views" kab bataoge? Jawab: stream ko time ke <strong>windows</strong> mein kaato aur har window ka result nikaalo.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Window', html: `<strong>Ye kya hai:</strong> time ka ek tukda jiske andar ke events ek saath gine jaate hain, jaise "20:15:00 se 20:15:10 tak".<br><strong>Kyun chahiye:</strong> stream kabhi khatam nahi hota, to "total" kabhi final nahi. Window ek chhota, khatam hone wala hissa bana deti hai jiska result bheja ja sake.<br><strong>Iske bina:</strong> ya to ginti kabhi bahar hi nahi aayegi, ya har event pe ek naya number (bahut shor).<br>Niyam: window mein start shaamil hota hai, end nahi. [10, 20) mein 10 hai, 20 nahi.` },
    { type: 'p', html: `Teen mashhoor tarah ki windows hain (Flink docs ke naam). Har ek ko neeche ke 13 events pe samjho. Events in seconds pe aaye: <code>2, 5, 7, 12, 14, 18, 21, 23, 24, 38, 41, 44, 57</code>.` },
    { type: 'callout', tone: 'term', title: 'Tumbling window', html: `<strong>Ye kya hai:</strong> fixed size ki windows, ek ke baad ek, bina overlap: [0,10), [10,20), [20,30)... Har event <em>theek ek</em> window mein.<br><strong>Worked example (size 10 s):</strong> [0,10) = 3 (2, 5, 7), [10,20) = 3, [20,30) = 3, [30,40) = 1, [40,50) = 2, [50,60) = 1. Jod = 13, kyunki koi event do baar nahi gina.<br><strong>Kab:</strong> "har minute kitne views", billing ke hisaab. <strong>Kab nahi:</strong> jab smooth "pichhle 1 minute" chahiye har few second pe.` },
    { type: 'callout', tone: 'term', title: 'Sliding window', html: `<strong>Ye kya hai:</strong> fixed size, lekin har <em>slide</em> pe nayi window shuru hoti hai, isliye windows overlap karti hain.<br><strong>Worked example (size 10 s, slide 5 s):</strong> windows [0,10), [5,15), [10,20)... Event 12 do windows mein hai: [5,15) aur [10,20). [5,15) mein 4 events (5, 7, 12, 14). Har event ~size/slide = 2 windows mein ginta hai.<br><strong>Kab:</strong> "pichhle 1 minute ka average, har 10 second update" (size 60, slide 10). <strong>Kharcha:</strong> zyada windows, zyada kaam aur state.` },
    { type: 'callout', tone: 'term', title: 'Session window', html: `<strong>Ye kya hai:</strong> koi fixed size nahi. Events aate rahein to window chalti rahe. <em>Gap</em> jitna sannata ho jaaye to window band.<br><strong>Worked example (gap 5 s):</strong> 2 se 24 tak har event pichhle se 5 s ke andar aaya, to ek hi session [2, 29) mein 9 events (end = aakhri event 24 + gap 5). Phir 38 tak sannata: naya session [38, 49) mein 3 events. Phir 57: teesra session. Gap 3 s karo to pehla lamba session 3 tukdon mein toot jaata hai.<br><strong>Kab:</strong> "user ka ek viewing session kitna lamba tha". <strong>Dhyaan:</strong> har user (key) ke apne sessions hote hain.` },
    { type: 'p', html: `Ab khud chalao. Window type badlo, size/slide/gap ghumao, aur dekho kaunsa event kis window mein gaya aur har window ki ginti kya hai. Upar ke worked examples yahan check kar sakte ho.` },
    { type: 'custom', render(el) {
      const EV = [2, 5, 7, 12, 14, 18, 21, 23, 24, 38, 41, 44, 57];
      const T = 60;
      el.innerHTML = `<div class="chips bd-wt" role="group" aria-label="Window type">
          <button type="button" class="chip on" data-t="tumbling">Tumbling</button>
          <button type="button" class="chip" data-t="sliding">Sliding</button>
          <button type="button" class="chip" data-t="session">Session</button>
        </div>
        <div class="row2" style="margin-top:10px">
          <div class="bd-w-size"><label>Window size: <strong class="bd-vs"></strong></label><input class="bd-s" type="range" min="5" max="30" step="5" value="10"></div>
          <div class="bd-w-slide"><label>Slide: <strong class="bd-vsl"></strong></label><input class="bd-sl" type="range" min="5" max="30" step="5" value="5"></div>
          <div class="bd-w-gap"><label>Session gap: <strong class="bd-vg"></strong></label><input class="bd-g" type="range" min="2" max="15" step="1" value="5"></div>
        </div>
        <svg class="bd-svg" viewBox="0 0 640 240" style="width:100%;height:auto;margin-top:10px;display:block" role="img" aria-label="Events aur windows ka timeline"></svg>
        <div class="stats">
          <div class="stat"><span>Windows (jinme events hain)</span><strong class="bd-nw"></strong></div>
          <div class="stat"><span>Ek event kitni windows mein</span><strong class="bd-per"></strong></div>
          <div class="stat"><span>Sabse badi ginti</span><strong class="bd-max"></strong></div>
        </div>
        <div class="calc-note bd-wnote"></div>`;
      const $ = c => el.querySelector(c);
      let type = 'tumbling';
      const windows = (type, size, slide, gap) => {
        let w = [];
        if (type === 'tumbling') for (let s = 0; s < T; s += size) w.push([s, s + size]);
        if (type === 'sliding') for (let s = -size + slide; s < T; s += slide) w.push([s, s + size]);
        if (type === 'session') {
          // Flink-style: each event opens [t, t+gap); overlapping/touching windows merge.
          EV.forEach(t => { const last = w[w.length - 1]; if (last && t <= last[1]) last[1] = t + gap; else w.push([t, t + gap]); });
        }
        return w.map(([s, e]) => ({ s, e, n: EV.filter(t => t >= s && t < e).length })).filter(x => x.n > 0);
      };
      const X = t => 20 + (Math.max(-5, Math.min(T + 5, t)) + 5) * (600 / (T + 10));
      const upd = () => {
        const size = +$('.bd-s').value; const sl = $('.bd-sl'); if (+sl.value > size) sl.value = size;
        const slide = +sl.value, gap = +$('.bd-g').value;
        $('.bd-vs').textContent = size + ' s'; $('.bd-vsl').textContent = slide + ' s'; $('.bd-vg').textContent = gap + ' s';
        $('.bd-w-size').style.display = type === 'session' ? 'none' : '';
        $('.bd-w-slide').style.display = type === 'sliding' ? '' : 'none';
        $('.bd-w-gap').style.display = type === 'session' ? '' : 'none';
        const W = windows(type, size, slide, gap);
        const lanes = type === 'sliding' ? Math.ceil(size / slide) : 1;
        const laneH = Math.min(34, 150 / lanes);
        let svg = `<line x1="20" y1="200" x2="620" y2="200" stroke="var(--line-2)" stroke-width="1.5"/>`;
        for (let t = 0; t <= T; t += 10) svg += `<line x1="${X(t)}" y1="196" x2="${X(t)}" y2="204" stroke="var(--ink-3)"/><text x="${X(t)}" y="222" text-anchor="middle" font-size="12" fill="var(--ink-3)" font-family="var(--f-mono)">${t}s</text>`;
        W.forEach((w, i) => {
          const lane = type === 'sliding' ? (((w.s / slide) % lanes) + lanes) % lanes : i % 2;
          const y = 20 + lane * laneH + (type === 'sliding' ? 0 : 40);
          const x1 = X(w.s), x2 = X(w.e);
          svg += `<rect x="${x1 + 1}" y="${y}" width="${Math.max(4, x2 - x1 - 2)}" height="${laneH - 6}" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.2"/>`;
          svg += `<text x="${(x1 + x2) / 2}" y="${y + (laneH - 6) / 2 + 4}" text-anchor="middle" font-size="12" font-weight="600" fill="var(--accent-ink)" font-family="var(--f-mono)">${w.n}</text>`;
        });
        EV.forEach(t => { svg += `<circle cx="${X(t)}" cy="200" r="5.5" fill="var(--ink)" stroke="var(--surface)" stroke-width="1.5"/>`; });
        $('.bd-svg').innerHTML = svg;
        const total = W.reduce((a, w) => a + w.n, 0);
        $('.bd-nw').textContent = W.length;
        $('.bd-per').textContent = (total / EV.length).toFixed(2).replace(/\.00$/, '');
        $('.bd-max').textContent = Math.max(...W.map(w => w.n));
        const list = W.map(w => `[${w.s},${w.e}): ${w.n}`).join('  ');
        const why = type === 'tumbling' ? 'Har event theek ek window mein, isliye windows ki gintiyon ka jod = 13.'
          : type === 'sliding' ? `Har window ${size} s ki, har ${slide} s pe nayi. Ek event ~${size / slide} windows mein gina jaata hai, isliye gintiyon ka jod 13 se zyada. Kuch windows 0 se pehle shuru hoti hain (windows epoch se aligned hain); sirf wahi windows dikh rahi hain jinme koi event hai, jaise Flink sirf event aane pe window banata hai.`
          : `Sessions ka koi fixed size nahi: ${gap} s ya usse kam ka fark ho to event pichhle session mein judta hai, warna naya session. Session ka end = aakhri event + gap. Gap chhota karo to ek lamba session kai chhote sessions mein toot jaata hai.`;
        $('.bd-wnote').textContent = list + '. ' + why;
      };
      el.querySelectorAll('.bd-wt .chip').forEach(b => b.addEventListener('click', () => {
        type = b.dataset.t; el.querySelectorAll('.bd-wt .chip').forEach(x => x.classList.toggle('on', x === b)); upd();
      }));
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},

    { type: 'h3', text: 'Event time vs processing time, aur late events' },
    { type: 'p', html: `Upar humne maan liya ki event jis second hua, usi second pahuncha. Asli duniya mein aisa nahi: phone metro mein offline tha, network slow tha, ya Kafka consumer pichhe chal raha tha. Ab sawaal: event ko kis window mein ginein: jab wo <em>hua</em>, ya jab wo <em>pahuncha</em>?` },
    { type: 'callout', tone: 'term', title: 'Naye words: event time aur processing time', html: `<strong>Event time:</strong> event asal mein kab hua (event ke andar likha timestamp). Jaise photo pe chhapi hui date.<br><strong>Processing time:</strong> engine ki ghadi ke hisaab se event kab process hua. Jaise photo aapko kab mili.<br><strong>Kyun farq padta hai:</strong> processing time simple aur tez hai, lekin der se aaye events galat window mein chale jaate hain, aur kal ka data dobara chalao (replay) to result alag aata hai. Event time sahi hai, lekin ek nayi mushkil laata hai: engine ko kaise pata ki ab is window ke saare events aa gaye?` },
    { type: 'callout', tone: 'term', title: 'Naya word: Watermark', html: `<strong>Ye kya hai:</strong> event time mode mein engine ka elaan: "ab mujhe lagta hai ki time T se pehle ke saare events aa chuke". Watermark T se aage nikla to window [.., T) band karke result bhej do.<br><strong>Kaise banta hai:</strong> aam tareeka (<em>bounded out-of-orderness</em>): watermark = ab tak dekha sabse bada event time − ek allowed delay.<br><strong>Kyun chahiye:</strong> iske bina event time window kabhi band hi nahi hogi (shayad koi aur purana event aa jaaye?).<br><strong>Late event:</strong> watermark ke baad bhi purana event aaye to wo <em>late</em> hai. Flink default (allowed lateness 0) mein use drop karta hai. Tum allowed lateness doge to result update ho sakta hai, ya use side output (alag dabba) mein le sakte ho.<br><strong>Example:</strong> delay 5 s. Sabse bada event time 25 s dekha, to watermark 20 s: window [10,20) ab band.` },
    { type: 'p', html: `Neeche wahi 13 events hain, lekin ab har ek ka <strong>arrival time</strong> bhi hai. Event <code>18s</code> wala user offline tha: wo <code>33s</code> pe pahuncha. Event <code>7s</code> bhi network ki wajah se <code>11s</code> pe pahuncha. Tumbling 10 s windows. Mode badlo aur allowed delay ghumao:` },
    { type: 'custom', render(el) {
      // [event_time, arrival_time]
      const EV = [[2, 3], [5, 6], [7, 11], [12, 13], [14, 15], [18, 33], [21, 22], [23, 24], [24, 25], [38, 39], [41, 42], [44, 45], [57, 58]];
      const SIZE = 10, T = 60, DS = [0, 2, 5, 10, 20];
      el.innerHTML = `<div class="chips bd-tm" role="group" aria-label="Time mode">
          <button type="button" class="chip" data-m="proc">Processing time</button>
          <button type="button" class="chip on" data-m="event">Event time + watermark</button>
        </div>
        <div class="bd-dwrap" style="margin-top:10px"><label>Allowed delay (watermark = max event time − delay): <strong class="bd-vd"></strong></label><input class="bd-d" type="range" min="0" max="4" step="1" value="0"></div>
        <div style="overflow-x:auto;margin-top:10px"><table style="width:100%;border-collapse:collapse;font:13px var(--f-mono);color:var(--ink)">
          <thead><tr style="color:var(--ink-2);text-align:left"><th style="padding:6px;border-bottom:1px solid var(--line)">Window</th><th style="padding:6px;border-bottom:1px solid var(--line)">Sahi ginti</th><th style="padding:6px;border-bottom:1px solid var(--line)">Result</th><th style="padding:6px;border-bottom:1px solid var(--line)">Result kab (arrival s)</th></tr></thead>
          <tbody class="bd-tb"></tbody></table></div>
        <div class="stats">
          <div class="stat"><span>Galat windows</span><strong class="bd-wrong"></strong></div>
          <div class="stat"><span>Drop hue late events</span><strong class="bd-drop"></strong></div>
          <div class="stat"><span>[10,20) ka result kitni der baad</span><strong class="bd-lat"></strong></div>
        </div>
        <div class="calc-note bd-tnote"></div>`;
      const $ = c => el.querySelector(c);
      let mode = 'event';
      const run = (mode, D) => {
        const wins = []; for (let s = 0; s < T; s += SIZE) wins.push({ s, e: s + SIZE, truth: 0, n: 0, fired: null });
        EV.forEach(([et]) => wins[Math.floor(et / SIZE)].truth++);
        const order = EV.slice().sort((a, b) => a[1] - b[1]);
        const dropped = [];
        if (mode === 'proc') {
          order.forEach(([et, at]) => wins[Math.floor(at / SIZE)].n++);
          wins.forEach(w => { w.fired = w.e; });
        } else {
          let maxEt = -Infinity;
          order.forEach(([et, at]) => {
            const w = wins[Math.floor(et / SIZE)];
            if (w.fired !== null) dropped.push(et); else w.n++;
            maxEt = Math.max(maxEt, et);
            const wm = maxEt - D;
            wins.forEach(x => { if (x.fired === null && wm >= x.e) x.fired = at; });
          });
        }
        return { wins, dropped };
      };
      const upd = () => {
        const D = DS[+$('.bd-d').value];
        $('.bd-vd').textContent = D + ' s';
        $('.bd-dwrap').style.display = mode === 'event' ? '' : 'none';
        const { wins, dropped } = run(mode, D);
        $('.bd-tb').innerHTML = wins.map(w => {
          const ok = w.fired === null || w.n === w.truth;
          return `<tr><td style="padding:6px;border-bottom:1px solid var(--line)">[${w.s},${w.e})</td><td style="padding:6px;border-bottom:1px solid var(--line)">${w.truth}</td><td style="padding:6px;border-bottom:1px solid var(--line);color:${ok ? 'var(--green)' : 'var(--red)'};font-weight:600">${w.fired === null ? '…' : w.n}${ok ? '' : ' ✗'}</td><td style="padding:6px;border-bottom:1px solid var(--line);color:var(--ink-2)">${w.fired === null ? 'abhi khuli (watermark ' + w.e + ' tak nahi pahuncha)' : w.fired + 's'}</td></tr>`;
        }).join('');
        const wrong = wins.filter(w => w.fired !== null && w.n !== w.truth).length;
        const w1 = wins[1];
        $('.bd-wrong').textContent = wrong;
        $('.bd-drop').textContent = dropped.length ? dropped.map(t => t + 's').join(', ') : '0';
        $('.bd-lat').textContent = w1.fired === null ? 'abhi nahi' : (w1.fired - w1.e) + ' s';
        let note;
        if (mode === 'proc') note = 'Processing time mein har event apne arrival ke hisaab se gina gaya. 7s wala 11s pe pahuncha to [10,20) mein chala gaya ([0,10) mein ek kam), aur 18s wala 33s pe pahuncha to [30,40) mein (wahan ek zyada). [10,20) ki ginti 3 sahi dikhti hai, lekin galat events se: sirf ittefaq. Results turant milte hain, lekin galat; aur kal ka data replay karo to arrival times alag honge, result bhi alag.';
        else if (dropped.length) note = `Delay ${D} s: watermark jaldi aage badha, [10,20) jaldi band hua (${w1.fired}s pe), aur 18s wala event late aake drop ho gaya. Tez lekin adhoora. Delay badhao.`;
        else note = `Delay ${D} s: watermark dheere chala, 18s wala event window band hone se pehle aa gaya, saari gintiyan sahi. Keemat: result der se. Dhyaan do, 25s ke baad 39s tak koi naya aage ka event nahi aaya (33s wala to purana 18s ka tha), to watermark bhi ruka raha: watermark sirf naye events se aage badhta hai. [50,60) abhi bhi khuli hai kyunki 60s ke aage ka koi event aaya hi nahi.`;
        $('.bd-tnote').textContent = note;
      };
      el.querySelectorAll('.bd-tm .chip').forEach(b => b.addEventListener('click', () => {
        mode = b.dataset.m; el.querySelectorAll('.bd-tm .chip').forEach(x => x.classList.toggle('on', x === b)); upd();
      }));
      $('.bd-d').addEventListener('input', upd); upd();
    }},
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Stream processing mein result hamesha final hota hai." Nahi. Stream ka result <strong>jaldi aur lagbhag sahi</strong> hota hai; late events, retries, ya bugs ki wajah se thoda farq ho sakta hai. Isliye paise jaise numbers (ad billing, creator payouts) ke liye baad mein batch se <strong>reconcile</strong> karte hain. Doosri galti: watermark delay ko bahut chhota rakhna (zyada events drop) ya bahut bada (dashboard "live" hi nahi raha).` },

    { type: 'h2', text: 'ETL vs ELT' },
    { type: 'p', html: `Data kai jagah se aata hai: Postgres ke users/payments, Kafka ke events, ad partner ki CSV files. Analytics ke liye use ek jagah, saaf shakal mein laana hai. Teen kaam hain: <strong>Extract</strong> (source se nikaalo), <strong>Transform</strong> (saaf karo, join karo, galat rows hatao, format badlo), <strong>Load</strong> (destination mein daalo). Sawaal bas order ka hai.` },
    { type: 'compare',
      left: { title: 'ETL: pehle transform, phir load', ascii: `
Sources ──► Transform server ──► Warehouse
            (Spark / ETL tool)   (sirf saaf data)`, html: `Purana tareeka, jab warehouse storage aur compute mehenge the. Sirf kaam ka, saaf data andar jaata hai. Achha jab sensitive fields (phone, card) warehouse tak pahunchne hi nahi chahiye. Nuksaan: transform mein bug ya naya sawaal = source se dobara nikaalo; raw data andar hai hi nahi.` },
      right: { title: 'ELT: pehle load, phir transform', ascii: `
Sources ──► Warehouse/Lake (raw) ──► SQL transform
                                     (andar hi, dbt jaise tools)`, html: `Cloud warehouses (BigQuery, Snowflake) mein storage sasta aur compute bahut, to raw data seedha load karo aur transform warehouse ke andar SQL se. Raw data hamesha bacha rehta hai: naya sawaal = nayi query, dobara extract nahi. Nuksaan: raw (aur shayad sensitive) data andar aa gaya, uska access control aur kharcha sambhalna padta hai.` },
    },

    { type: 'callout', tone: 'term', title: 'Naye words: ETL aur ELT', html: `<strong>Ye kya hai:</strong> data ko sources se analytics ki jagah tak laane ke do order. <strong>ETL</strong> = Extract → Transform → Load (pehle saaf karo, phir daalo). <strong>ELT</strong> = Extract → Load → Transform (pehle kachcha daalo, andar saaf karo).<br><strong>Kyun chahiye:</strong> source ka data gandha aur bikhra hota hai: galat rows, alag formats, private fields. Analytics ko saaf, juda hua data chahiye.<br><strong>Iske bina:</strong> har analyst apne tareeke se saaf karega, aur do reports ke numbers kabhi match nahi karenge.` },
    { type: 'p', html: `Farq tab dikhta hai jab kuch <em>badalta</em> hai. Neeche xyz.com ke view events mein 6 fields hain. ETL transform sirf 3 kaam ki fields rakhta hai. Source (Kafka) sirf 7 din ka data rakhta hai, warehouse mein 365 din ka hai. Mode chuno, phir har situation pe click karo:` },
    { type: 'custom', render(el) {
      const RAW = ['user_id', 'phone', 'video_id', 'device', 'watch_s', 'country'], CLEAN = ['video_id', 'watch_s', 'country'];
      const DAYS = 365, RET = 7;
      const Q = {
        q1: { n: 'Har country ka watch time', etl: [1, 'Seedha query: country aur watch_s dono warehouse mein hain.'], elt: [1, 'Raw table se SQL transform pehle hi saaf table bana chuka hai. Seedha query.'] },
        q2: { n: 'Naya sawaal: device-wise watch time', etl: [0, `device field transform mein phenk di gayi thi. Transform badlo aur source se dobara extract karo, lekin Kafka mein sirf ${RET} din bache hain: ${DAYS - RET} din ka device data hamesha ke liye gaya.`], elt: [1, `device raw table mein pada hai. Ek nayi SQL query, aur poore ${DAYS} din ka jawab.`] },
        q3: { n: 'Transform mein bug mila (watch_s galat)', etl: [0, `Warehouse mein galat numbers load ho chuke, aur raw data andar hai hi nahi. Sirf pichhle ${RET} din source se dobara la sakte ho.`], elt: [1, `Raw data safe hai. SQL theek karo, poore ${DAYS} din ka saaf table dobara bana lo.`] },
        q4: { n: 'Phone number kahan pahuncha?', etl: [1, 'Transform ne phone pehle hi hata diya: warehouse tak kabhi pahuncha hi nahi. Privacy ke liye achha.'], elt: [0, 'Phone raw table mein aa gaya. Ab us table ka access control, masking aur delete requests sambhalni padengi.'] },
      };
      el.innerHTML = `<div class="chips et-m" role="group" aria-label="Mode"><button type="button" class="chip on" data-m="etl">ETL</button><button type="button" class="chip" data-m="elt">ELT</button></div>
        <div class="et-fl" style="margin-top:10px;font:13px/1.8 var(--f-mono);color:var(--ink-2)"></div>
        <div class="chips et-q" style="margin-top:10px">${Object.entries(Q).map(([k, q]) => `<button type="button" class="chip" data-q="${k}">${q.n}</button>`).join('')}</div>
        <div class="et-ans calc-note" style="font-size:15px"></div>
        <div class="stats"><div class="stat"><span>Warehouse mein fields</span><strong class="et-nf"></strong></div><div class="stat"><span>4 situations mein theek</span><strong class="et-sc"></strong></div></div>`;
      const $ = c => el.querySelector(c);
      let mode = 'etl', q = 'q2';
      const tag = (f, on) => `<span style="display:inline-block;margin:2px;padding:1px 7px;border-radius:6px;border:1px solid ${on ? 'var(--accent)' : 'var(--line)'};color:${on ? 'var(--ink)' : 'var(--ink-3)'};${on ? '' : 'text-decoration:line-through'}">${f}</span>`;
      const upd = () => {
        const keep = mode === 'etl' ? CLEAN : RAW;
        $('.et-fl').innerHTML = (mode === 'etl'
          ? 'Kafka (7 din) → <strong>Transform server</strong> → Warehouse<br>Warehouse mein: '
          : 'Kafka (7 din) → Warehouse <strong>raw table</strong> → SQL transform → saaf table<br>Warehouse mein: ') + RAW.map(f => tag(f, keep.includes(f))).join('');
        el.querySelectorAll('.et-q .chip').forEach(b => b.classList.toggle('on', b.dataset.q === q));
        const [ok, txt] = Q[q][mode];
        $('.et-ans').innerHTML = `<strong style="color:${ok ? 'var(--green)' : 'var(--red)'}">${ok ? '✓' : '✗'}</strong> ${txt}`;
        $('.et-nf').textContent = keep.length + ' / ' + RAW.length;
        $('.et-sc').textContent = Object.values(Q).filter(x => x[mode][0]).length + ' / 4';
      };
      el.querySelectorAll('.et-m .chip').forEach(b => b.addEventListener('click', () => { mode = b.dataset.m; el.querySelectorAll('.et-m .chip').forEach(x => x.classList.toggle('on', x === b)); upd(); }));
      el.querySelectorAll('.et-q .chip').forEach(b => b.addEventListener('click', () => { q = b.dataset.q; upd(); }));
      upd();
    }},
    { type: 'p', html: `ETL 4 mein se 2 mein theek (country query, privacy), ELT 3 mein (lekin privacy mein kamzor). Isliye aaj ka common raasta: <strong>ELT</strong>, lekin load se pehle hi sensitive fields (phone, card) mask ya hash kar do. Ye thoda sa "T" pehle karna hai.` },

    { type: 'h2', text: 'Data lake, warehouse, lakehouse' },
    { type: 'p', html: `Events aur reports ko <em>rakhna</em> kahan hai? Teen jawab hain, aur teeno aaj bhi use hote hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Data warehouse', html: `<strong>Ye kya hai:</strong> analytics ke liye bana database: saaf, structured tables, tez SQL. Schema (columns aur unke types) pehle se tay hota hai, data likhte waqt hi check hota hai (<em>schema-on-write</em>). Examples: BigQuery, Snowflake, Redshift.<br><strong>Kyun chahiye:</strong> business log seedhe SQL ya dashboard se jawab nikaal sakein, aur numbers bharose layak hon.<br><strong>Iske bina:</strong> har report ke liye engineer ko raw files mein ghusna padta.<br><strong>Kamzori:</strong> mehenga, aur images/raw logs jaisi cheezein iske liye nahi bani.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Data lake', html: `<strong>Ye kya hai:</strong> sasti object storage (S3/GCS) pe <em>kuch bhi</em> raw files: JSON events, Parquet, images, logs. Schema padhte waqt lagta hai (<em>schema-on-read</em>).<br><strong>Kyun chahiye:</strong> saalon ka saara raw data sasta rakhna, aur ML training jaise kaam jo raw data maangte hain.<br><strong>Iske bina:</strong> raw data ya to phenk do ya mehenge warehouse mein rakho.<br><strong>Kamzori:</strong> dhyaan na do to "data swamp" (kisi ko pata nahi kya kahan hai, kaunsi file sahi hai). Aur plain files mein <strong>ACID</strong> nahi: aadha likha batch bhi readers ko dikh jaata hai (neeche widget).` },
    { type: 'callout', tone: 'term', title: 'Naya word: Lakehouse (table format)', html: `<strong>Ye kya hai:</strong> lake ki sasti, open files (Parquet) ke upar ek <strong>table format</strong> layer: Delta Lake, Apache Iceberg, Apache Hudi. Ye ek <em>transaction log</em> rakhta hai: "table ke version 7 mein ye files hain". Reader sirf log mein likhe version ki files padhta hai.<br><strong>Kyun chahiye:</strong> isse lake ko warehouse jaise features milte hain: ACID transactions, schema, purane versions ("time travel"), deletes. Ek hi copy data pe SQL engines (Spark, Trino) aur ML dono.<br><strong>Iske bina:</strong> lake + warehouse dono rakho, data do jagah copy, do bill.<br>Databricks ke logon ka 2021 ka CIDR paper is idea ka mashhoor bayaan hai.` },
    { type: 'table', head: ['', 'Warehouse', 'Lake', 'Lakehouse'], rows: [
      ['Data', 'Saaf tables', 'Raw files, kuch bhi', 'Open files + table format'],
      ['Schema', 'Likhte waqt', 'Padhte waqt', 'Likhte waqt (lekin evolve ho sakta)'],
      ['Kharcha', 'Zyada', 'Sabse kam', 'Kam storage, compute alag'],
      ['Best for', 'BI dashboards, SQL reports', 'Raw archive, ML training', 'Dono ek jagah, ek copy'],
      ['Khatra', 'Lock-in, kharcha', 'Data swamp, ACID nahi', 'Naya, setup ki samajh chahiye'],
    ]},
    { type: 'p', html: `Lakehouse ka "transaction log" kya bachata hai, step by step dekho. Ek table S3 mein files ki shakal mein hai, har file mein 50 rows. Left: plain lake (reader folder ki saari files padhta hai). Right: lakehouse (reader sirf log ka latest version padhta hai).` },
    { type: 'custom', render(el) {
      const ST = [
        { t: 'Shuru', p: [['f1', 50], ['f2', 50]], pr: 100, l: [['f1', 50], ['f2', 50]], v: 'v1: f1, f2', lr: 100, n: 'Table mein 100 rows. Dono mein same.' },
        { t: 'Naya batch likh rahe (f3, f4)', p: [['f1', 50], ['f2', 50], ['f3', 50, 'new']], pr: 150, l: [['f1', 50], ['f2', 50], ['f3', 50, 'hidden']], v: 'v1: f1, f2', lr: 100, n: 'Job ne f3 likh di, f4 abhi baaki. Plain lake ka reader folder dekhta hai aur aadha batch padh leta hai (150, galat). Lakehouse reader log ka v1 padhta hai: 100, consistent.' },
        { t: 'Writer crash', p: [['f1', 50], ['f2', 50], ['f3', 50, 'bad']], pr: 150, l: [['f1', 50], ['f2', 50], ['f3', 50, 'hidden']], v: 'v1: f1, f2', lr: 100, n: 'Job mar gaya. Plain lake mein f3 akeli pad gayi: har reader ko aadha batch hamesha dikhega. Lakehouse mein commit hua hi nahi, to f3 kisi version mein nahi: koi reader use nahi dekhta (baad mein cleanup).' },
        { t: 'Retry: f3b, f4b likhe', p: [['f1', 50], ['f2', 50], ['f3', 50, 'bad'], ['f3b', 50], ['f4b', 50]], pr: 250, l: [['f1', 50], ['f2', 50], ['f3', 50, 'hidden'], ['f3b', 50], ['f4b', 50]], v: 'v2: f1, f2, f3b, f4b', lr: 200, n: 'Retry kamyaab. Sahi jawab 200. Plain lake mein purani f3 bhi padhi gayi: 250 (duplicate). Lakehouse ne ek atomic commit kiya, v2 = f1, f2, f3b, f4b: 200.' },
        { t: 'User 42 ka data delete', p: [['f1', 50], ['f2', 40, 'new'], ['f3', 50, 'bad'], ['f3b', 50], ['f4b', 50]], pr: 240, l: [['f1', 50], ['f2b', 40], ['f3b', 50], ['f4b', 50]], v: 'v3: f1, f2b, f3b, f4b', lr: 190, n: 'User 42 ki 10 rows f2 mein thi. Plain lake: f2 ko jagah pe overwrite, purana version gaya, aur overwrite ke beech reader ko f2 gayab bhi dikh sakti thi. Lakehouse: nayi file f2b likhi, phir commit v3. Reader ko ya v2 dikha ya v3, beech ki halat kabhi nahi.' },
        { t: 'Time travel: kal ka version', p: null, l: [['f1', 50], ['f2', 50], ['f3b', 50], ['f4b', 50]], v: 'read v2', lr: 200, n: 'Audit ke liye "kal ka table" chahiye. Lakehouse: v2 padho, uski files abhi bhi S3 mein hain (retention tak): 200 rows. Plain lake: purana f2 overwrite ho chuka, kal ka version hai hi nahi.' },
      ];
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><button type="button" class="btn small ghost lh-p">Pichhla</button><button type="button" class="btn small primary lh-n">Agla step</button><strong class="lh-t" style="font-size:14px;color:var(--ink)"></strong></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-top:10px">
          <div style="border:1px solid var(--line);border-radius:var(--r);padding:10px"><div style="font:600 13px var(--f-mono);color:var(--ink-3)">PLAIN LAKE</div><div class="lh-pf" style="margin:6px 0"></div><div class="lh-pr" style="font-size:14px"></div></div>
          <div style="border:1px solid var(--line);border-radius:var(--r);padding:10px"><div style="font:600 13px var(--f-mono);color:var(--ink-3)">LAKEHOUSE (Iceberg / Delta)</div><div class="lh-lf" style="margin:6px 0"></div><div class="lh-v" style="font:12.5px var(--f-mono);color:var(--ink-2)"></div><div class="lh-lr" style="font-size:14px"></div></div>
        </div>
        <div class="calc-note lh-note"></div>`;
      const $ = c => el.querySelector(c);
      let k = 0;
      const chip = ([n, r, f]) => `<span style="display:inline-block;margin:2px;padding:2px 8px;border-radius:6px;font:12.5px var(--f-mono);border:1.5px ${f === 'hidden' ? 'dashed var(--line-2)' : 'solid ' + (f === 'bad' ? 'var(--red)' : f === 'new' ? 'var(--amber)' : 'var(--accent)')};color:${f === 'hidden' ? 'var(--ink-3)' : 'var(--ink)'}">${n} (${r})</span>`;
      const good = [100, 100, 100, 200, 190, 200];
      const upd = () => {
        const s = ST[k];
        $('.lh-t').textContent = (k + 1) + '/' + ST.length + ': ' + s.t;
        $('.lh-pf').innerHTML = s.p ? s.p.map(chip).join('') : '<span style="color:var(--ink-3)">purana version nahi bacha</span>';
        $('.lh-pr').innerHTML = s.p ? `Reader ko: <strong style="color:${s.pr === good[k] ? 'var(--green)' : 'var(--red)'}">${s.pr} rows</strong>` : `<strong style="color:var(--red)">✗ time travel nahi</strong>`;
        $('.lh-lf').innerHTML = s.l.map(chip).join('');
        $('.lh-v').textContent = 'log: ' + s.v;
        $('.lh-lr').innerHTML = `Reader ko: <strong style="color:var(--green)">${s.lr} rows</strong>`;
        $('.lh-note').textContent = s.n;
        $('.lh-p').disabled = k === 0; $('.lh-n').disabled = k === ST.length - 1;
      };
      $('.lh-n').addEventListener('click', () => { k = Math.min(ST.length - 1, k + 1); upd(); });
      $('.lh-p').addEventListener('click', () => { k = Math.max(0, k - 1); upd(); });
      upd();
    }},

    { type: 'h2', text: 'Lambda vs Kappa architecture' },
    { type: 'p', html: `Humne upar dekha: stream tez lekin lagbhag sahi, batch dheema lekin pakka. Dono chahiye to kaise jodein? Do mashhoor jawab hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Lambda architecture', html: `<strong>Ye kya hai:</strong> Nathan Marz (Storm ke creator) ka idea. Data <strong>do raaston</strong> se jaata hai: <strong>batch layer</strong> (poora raw data, har kuch ghante pakka result) aur <strong>speed layer</strong> (stream, sirf haal ke data ka jaldi wala result). <strong>Serving layer</strong> query ke time dono ko jodti hai: purana hissa batch se, taaza hissa speed se.<br><strong>Kyun chahiye:</strong> stream jaldi hai par kabhi kabhi galat; batch pakka hai par der se. Lambda dono ke fayde ek saath deta hai.<br><strong>Iske bina (sirf batch):</strong> live number nahi. <strong>(Sirf purana stream):</strong> pakka number nahi.<br>(Ye AWS Lambda serverless se bilkul alag cheez hai, bas naam same.)` },
    { type: 'callout', tone: 'term', title: 'Naya word: Kappa architecture', html: `<strong>Ye kya hai:</strong> Jay Kreps (Kafka ke co-creator) ka 2014 ka idea: <em>sirf stream processing rakho</em>. Kafka mein data itni der rakho jitni dobara process karne ke liye chahiye. Logic badla? Naya job version log ke shuru (offset 0) se chalao, nayi table mein likho, pakad le to switch.<br><strong>Kyun chahiye:</strong> Lambda mein same logic do baar, do frameworks mein likhna padta hai. Kappa mein ek hi code.<br><strong>Iske bina:</strong> do codebases jo kabhi na kabhi alag numbers denge.<br><strong>Keemat:</strong> Kafka mein lamba data rakhna, aur replay ka time.` },
    { type: 'ascii', text: `
LAMBDA                                   KAPPA
                ┌─► Batch (Spark) ─┐                  ┌─► Stream job v1 ─► table_v1 (live)
Events ─► Kafka ┤                  ├─► Merge   Events ─► Kafka (lambi retention)
                └─► Speed (Flink) ─┘    query          └─► Stream job v2 ─► table_v2
                                                            (offset 0 se replay; pakad le
 Same logic DO baar, do systems mein                         to switch, v1 band)`, caption: 'Kappa mein reprocessing bhi stream se hi: bas log shuru se dobara padho.' },
    { type: 'p', html: `<strong>Lambda ki dikkat:</strong> "views kaise ginne hain" ka logic do baar likhna padta hai, do alag frameworks mein, aur dono ko hamesha match rakhna. Jay Kreps (Kafka ke co-creator) ne 2014 ke apne article "Questioning the Lambda Architecture" mein yahi dard bataya aur simple ilaaj sujhaya, jise unhone khud mazaak mein <strong>Kappa architecture</strong> naam diya: <em>sirf stream processing rakho</em>. Kafka mein data itni der rakho jitni dobara process karne ke liye chahiye. Logic badla? Naya job version log ke shuru se chalao, nayi output table mein likho, jab wo pakad le to app ko us table pe switch karo aur purana job/table hata do.` },
    { type: 'p', html: `Kappa ka asli sawaal: "replay mein kitna time aur kitni storage?" Neeche xyz.com ke numbers ghumao. Ek baat dhyaan do: replay ke dauraan naye live events bhi aate rehte hain, isliye job ko live speed se <em>tez</em> chalna padta hai, warna wo kabhi pakad hi nahi paayega.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="chips lk-m" role="group" aria-label="Architecture"><button type="button" class="chip" data-m="lambda">Lambda</button><button type="button" class="chip on" data-m="kappa">Kappa</button></div>
        <div class="row2" style="margin-top:10px">
          <div><label>Live events/sec: <strong class="lk-rv"></strong></label><input class="lk-r" type="range" min="10" max="200" step="10" value="50"></div>
          <div><label>Kitne din dobara process karne hain: <strong class="lk-dv"></strong></label><input class="lk-d" type="range" min="1" max="90" step="1" value="30"></div>
        </div>
        <div class="lk-sw"><label>Replay job ki speed (live ka kitna guna): <strong class="lk-mv"></strong></label><input class="lk-x" type="range" min="1" max="20" step="1" value="10"></div>
        <div class="stats">
          <div class="stat"><span>Codebases (logic kitni jagah)</span><strong class="lk-cb"></strong></div>
          <div class="stat"><span>Reprocess kitni der</span><strong class="lk-t"></strong></div>
          <div class="stat"><span>Raw data kahan, kitna</span><strong class="lk-s"></strong></div>
        </div>
        <div class="calc-note lk-note"></div>
        <div class="calc-note">Maan liya: ek event ~1 KB, Kafka har data ki 3 copies rakhta hai. Kafka ka tiered storage purana data sasti object storage mein bhej sakta hai, jisse lambi retention sasti ho jaati hai.</div>`;
      const $ = c => el.querySelector(c);
      let mode = 'kappa';
      const tb = b => b >= 1e15 ? (b / 1e15).toFixed(2) + ' PB' : (b / 1e12).toFixed(1) + ' TB';
      const upd = () => {
        const r = +$('.lk-r').value * 1000, d = +$('.lk-d').value, m = +$('.lk-x').value;
        $('.lk-rv').textContent = (r / 1000) + 'k'; $('.lk-dv').textContent = d; $('.lk-mv').textContent = m + 'x';
        $('.lk-sw').style.display = mode === 'kappa' ? '' : 'none';
        const bytes = r * 86400 * d * 1000;
        if (mode === 'kappa') {
          const days = m > 1 ? d / (m - 1) : Infinity;
          $('.lk-cb').textContent = '1';
          $('.lk-t').textContent = m > 1 ? (days < 1 ? (days * 24).toFixed(1) + ' ghante' : days.toFixed(1) + ' din') : 'kabhi nahi';
          $('.lk-s').textContent = 'Kafka: ' + tb(bytes * 3);
          $('.lk-note').textContent = m > 1
            ? `${d} din ka backlog, job live se ${m} guna tez: har second wo ${m} second ka data padhta hai, lekin 1 second ka naya bhi aa jaata hai. Backlog ${m - 1} guna speed se ghatta hai: ${d} / ${m - 1} ≈ ${days < 1 ? (days * 24).toFixed(1) + ' ghante' : days.toFixed(1) + ' din'}. Tab tak purana job aur purani table chalti rehti hai, phir switch.`
            : 'Replay job sirf live speed pe hai: backlog kabhi kam nahi hoga. Replay ke liye zyada machines/partitions chahiye.';
        } else {
          $('.lk-cb').textContent = '2 (batch + speed)';
          $('.lk-t').textContent = 'agli batch run (ghante)';
          $('.lk-s').textContent = 'Lake (S3): ' + tb(bytes);
          $('.lk-note').textContent = `Logic badla (jaise bot filter): Spark wale batch code mein bhi aur Flink wale speed code mein bhi. Batch layer agli run mein lake ke poore ${d} din ka data dobara nikaal deti hai. Raw data sasti lake mein, Kafka mein lambi retention nahi chahiye. Lekin do codebases ko hamesha ek jaisa rakhna padta hai, aur jab wo alag numbers dein to "kaunsa sahi?" ki behes.`;
        }
      };
      el.querySelectorAll('.lk-m .chip').forEach(b => b.addEventListener('click', () => { mode = b.dataset.m; el.querySelectorAll('.lk-m .chip').forEach(x => x.classList.toggle('on', x === b)); upd(); }));
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'list', items: [
      `<strong>Lambda kab:</strong> batch ka pakka hisaab zaroori (billing, payouts), batch pehle se maujood, ya historical data itna bada ki stream se replay mehenga.`,
      `<strong>Kappa kab:</strong> ek hi codebase chahiye, stream engine (Flink) mature hai, aur log mein replay jitna data rakh sakte ho (ya log + lake se replay).`,
      `<strong>Asli duniya:</strong> aksar beech ka raasta: stream se live numbers, aur raat ka batch reconciliation sirf un numbers ka jahan paisa juda hai. Roadmap ka ad-click aggregation design bhi yahi kehta hai: Kafka → Flink windows → OLAP store, plus exact billing ke liye batch.`,
    ]},

    { type: 'h2', text: 'OLTP vs OLAP: row store vs column store' },
    { type: 'p', html: `Shuru mein sawaal tha: analytics production Postgres pe kyun nahi? Ab gehra jawab. Dono tarah ke kaam ka <em>shape</em> hi alag hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: OLTP', html: `<strong>Ye kya hai:</strong> OLTP (Online Transaction Processing) = app ka roz ka kaam: "user 42 ki profile do", "ye comment save karo". Har query <em>kuch rows</em>, <em>saare columns</em>, bahut saari queries per second, milliseconds mein. Postgres, MySQL.<br><strong>Kaise rakhta hai:</strong> <strong>row-wise</strong>: ek row ke saare columns disk pe saath.<br><strong>Kyun:</strong> ek user ki poori row ek hi jagah se mil jaaye.<br><strong>Iske bina:</strong> har login pe 30 alag jagah jaana padta.` },
    { type: 'callout', tone: 'term', title: 'Naya word: OLAP', html: `<strong>Ye kya hai:</strong> OLAP (Online Analytical Processing) = sawaal-jawab ka kaam: "pichhle mahine har country ka total watch time". Har query <em>crore rows</em> lekin <em>2-3 columns</em>, kam queries, seconds mein theek. ClickHouse, BigQuery, Snowflake, Druid.<br><strong>Kaise rakhta hai:</strong> <strong>column-wise</strong>: ek column ki saari values disk pe saath.<br><strong>Kyun:</strong> query sirf zaroori columns padhe, aur ek jaisi values saath hone se compression zabardast.<br><strong>Iske bina:</strong> har analytics query poori table ke saare columns padhegi.` },
    { type: 'ascii', text: `
Table: views (video_id, user_id, country, device, watch_s, date, ...30 columns)

ROW STORE (Postgres)                 COLUMN STORE (ClickHouse / BigQuery)
[7, 912, IN, android, 41, ...]       video_id: 7, 7, 9, 7, 3 ...
[9, 113, US, web,     12, ...]       country : IN, US, IN, IN, IN ...  ← same values saath:
[7, 455, IN, ios,     300, ...]      watch_s : 41, 12, 300, 9, 77 ...     compress bahut achha
  ↑ ek row = ek jagah                  ↑ ek column = ek jagah

"SUM(watch_s) GROUP BY country" → row store ko saare 30 columns padhne padte hain,
                                   column store sirf 2 (country, watch_s).`, caption: 'Column store sirf wahi padhta hai jo query ko chahiye, aur ek tarah ki values saath hone se compression bhi zabardast.' },
    { type: 'p', html: `Number feel karo. Query: <code>SELECT country, SUM(watch_s) FROM views GROUP BY country</code> (2 columns chahiye).` },
    { type: 'custom', render(el) {
      const ROWS = [1e6, 1e7, 1e8, 1e9];
      const RL = ['10 lakh', '1 crore', '10 crore', '100 crore'];
      el.innerHTML = `<div class="row2">
          <div><label>Rows: <strong class="bd-vr"></strong></label><input class="bd-r" type="range" min="0" max="3" step="1" value="2"></div>
          <div><label>Table ke columns: <strong class="bd-vc"></strong></label><input class="bd-c" type="range" min="5" max="50" step="5" value="30"></div>
        </div>
        <div style="margin-top:8px"><label>Column compression (maan lo): <strong class="bd-vz"></strong></label><input class="bd-z" type="range" min="1" max="10" step="1" value="4"></div>
        <div class="stats">
          <div class="stat"><span>Row store padhega</span><strong class="bd-rb"></strong></div>
          <div class="stat"><span>Column store padhega</span><strong class="bd-cb"></strong></div>
          <div class="stat"><span>Farq</span><strong class="bd-x"></strong></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Scan time, row (500 MB/s)</span><strong class="bd-rt"></strong></div>
          <div class="stat"><span>Scan time, column (500 MB/s)</span><strong class="bd-ct"></strong></div>
        </div>
        <div class="calc-note">Assumption: har value ~8 bytes, ek disk/SSD stream ~500 MB/s, query ko 2 columns chahiye. Asli engines kai disks/machines pe parallel padhte hain aur indexes/partitions se aur bhi kam padhte hain; yahan sirf ratio samajhna hai.</div>`;
      const $ = c => el.querySelector(c);
      const gb = b => b >= 1e9 ? (b / 1e9).toFixed(1) + ' GB' : (b / 1e6).toFixed(0) + ' MB';
      const sec = s => s >= 120 ? (s / 60).toFixed(1) + ' min' : s.toFixed(1) + ' s';
      const upd = () => {
        const n = ROWS[+$('.bd-r').value], k = +$('.bd-c').value, z = +$('.bd-z').value;
        $('.bd-vr').textContent = RL[+$('.bd-r').value]; $('.bd-vc').textContent = k; $('.bd-vz').textContent = z + 'x';
        const rowB = n * k * 8, colB = n * 2 * 8 / z;
        $('.bd-rb').textContent = gb(rowB); $('.bd-cb').textContent = gb(colB);
        $('.bd-x').textContent = Math.round(rowB / colB) + 'x kam';
        $('.bd-rt').textContent = sec(rowB / 500e6); $('.bd-ct').textContent = sec(colB / 500e6);
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Ab ulta dekho: app ka OLTP kaam, jaise "user 42 ki poori row do" ya "ek row update karo", dono stores mein kitni jagah chhoota hai?` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Table ke columns: <strong class="ol-cv"></strong></label><input class="ol-c" type="range" min="5" max="50" step="5" value="30"></div>
          <div><label>Aisi queries per second: <strong class="ol-qv"></strong></label><input class="ol-q" type="range" min="1000" max="20000" step="1000" value="10000"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Row store: jagahen per query</span><strong class="ol-r"></strong></div>
          <div class="stat"><span>Column store: jagahen per query</span><strong class="ol-k"></strong></div>
          <div class="stat"><span>Column store: reads per second</span><strong class="ol-t"></strong></div>
        </div>
        <div class="calc-note ol-note"></div>`;
      const $ = c => el.querySelector(c);
      const upd = () => {
        const k = +$('.ol-c').value, q = +$('.ol-q').value;
        $('.ol-cv').textContent = k; $('.ol-qv').textContent = q.toLocaleString('en-IN');
        $('.ol-r').textContent = '1 page (index se)';
        $('.ol-k').textContent = k + ' column files';
        $('.ol-t').textContent = (k * q).toLocaleString('en-IN') + ' vs ' + q.toLocaleString('en-IN');
        $('.ol-note').textContent = `Row store mein user 42 ki poori row ek hi page (disk ka chhota block) mein hai: index se seedha wahan, 1 read. Column store mein ${k} columns ${k} alag jagah pade hain: ${k} reads. ${q.toLocaleString('en-IN')} queries/s pe ye ${(k * q).toLocaleString('en-IN')} reads/s ban jaata hai, ${k} guna zyada. Update aur bura: compressed column blocks ko dobara likhna padta hai. Isliye app ka DB row store, analytics column store.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'list', items: [
      `<strong>Ulta bhi sach:</strong> column store mein "user 42 ki poori row do" ya ek row update karna mehenga hai (30 alag jagah jaana). Isliye app ka main DB OLTP rehta hai, aur data CDC/Kafka se OLAP store mein copy hota hai.`,
      `<strong>Roadmap ki line:</strong> OLTP = Postgres, OLAP = ClickHouse / BigQuery. Dono ek doosre ka kaam achhe se nahi karte.`,
      `<strong>Beech ka raasta:</strong> chhote data pe Postgres ka read replica analytics ke liye kaafi hai (main DB bacha rehta hai). Crore rows aur roz ke dashboards aaye, tab OLAP.`,
    ]},

    { type: 'h2', text: 'Decide' },
    { type: 'table', head: ['Sawaal', 'Pick', 'xyz.com example'], rows: [
      ['Result seconds mein chahiye?', 'Stream (Flink, Kafka Streams)', 'Live viewer count, fraud click check, trending abhi'],
      ['Result ghanton baad chalega, pakka hona chahiye?', 'Batch (Spark, warehouse SQL)', 'Daily report, creator payouts, ML training'],
      ['Logic chhota, data pehle se Kafka mein, ek team?', 'Kafka Streams (library)', 'Har user ke pichhle 5 min ke likes'],
      ['Bada job, bhaari state, event time, kai sources?', 'Flink', 'Ad clicks ka windowed aggregation'],
      ['Analytics queries kahan?', 'OLAP (ClickHouse, BigQuery), production OLTP pe nahi', 'Creator dashboard'],
      ['Raw data saalon tak sasta rakhna?', 'Data lake (S3 + Parquet), zaroorat ho to lakehouse table format', 'Saare events ka archive'],
    ]},
    { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>Result seconds mein chahiye</strong> (surge pricing, fraud checks, live viewer counts)? <strong>Stream processing.</strong> <strong>Result ghanton ruk sakta hai</strong> (daily reports, model training, monthly settlements)? <strong>Batch.</strong> Paisa juda ho to dono: stream se jaldi wala number, batch se pakka reconciliation.` },

    { type: 'diagram', title: 'xyz.com data platform: poori picture', height: 640,
      groups: [
        { label: 'Sources', x: 20, y: 16, w: 680, h: 92 },
        { label: 'Processing', x: 14, y: 140, w: 700, h: 230 },
        { label: 'Serving', x: 20, y: 410, w: 680, h: 216 },
      ],
      nodes: [
        { id: 'apps', label: 'xyz.com apps', sub: 'view, like, search', x: 120, y: 62, w: 160, kind: 'client', info: 'Ye kya hai: website aur mobile apps ke servers. Har kaam ek event banta hai aur Kafka mein jaata hai, production DB pe analytics ka load nahi.' },
        { id: 'pg', label: 'Postgres', sub: 'OLTP, row store', x: 360, y: 62, w: 150, kind: 'data', info: 'Ye kya hai: app ka production database (users, payments). Iske changes CDC (change log padhne wala tool) se Kafka mein jaate hain, taaki analytics isko na chhooye.' },
        { id: 'partner', label: 'Partner files', sub: 'ad CSV, daily', x: 590, y: 62, w: 150, kind: 'server', info: 'Ye kya hai: bahar ki company ki roz ki CSV files (ad spend). ELT style mein seedhe lake mein raw load hoti hain, phir SQL se saaf.' },
        { id: 'kafka', label: 'Kafka', sub: 'events log, 7 din', x: 240, y: 192, w: 150, kind: 'queue', info: 'Ye kya hai: saare events ki durable diary. Stream jobs live padhte hain, ek connector inhe lake mein files banake likhta hai. Kappa style replay bhi yahin se.' },
        { id: 'flink', label: 'Flink', sub: 'windows, watermark', x: 95, y: 318, w: 150, kind: 'server', info: 'Ye kya hai: stream engine. Event time pe 10 s tumbling windows, watermark ke saath, state + checkpoints. Live viewer counts ClickHouse mein likhta hai.' },
        { id: 'ks', label: 'Spam check', sub: 'Kafka Streams', x: 280, y: 318, w: 150, kind: 'server', info: 'Ye kya hai: ek chhoti service jiske andar Kafka Streams library chalti hai. Har user ke pichhle 5 min ke likes ginti hai; zyada hon to spam flag. Scale = partitions jitni copies.' },
        { id: 'lake', label: 'Lakehouse', sub: 'S3 Parquet + Iceberg', x: 470, y: 318, w: 160, kind: 'data', info: 'Ye kya hai: sasti S3 storage mein saalon ka raw data, Parquet files mein, Iceberg table format ke saath (ACID, time travel, deletes). Batch aur ML dono yahin se padhte hain.' },
        { id: 'spark', label: 'Spark', sub: 'raat 2 baje', x: 640, y: 318, w: 120, kind: 'server', info: 'Ye kya hai: batch engine. Har raat kal ke poore data pe exact counts, creator payouts, late events ke saath reconciliation. Result ClickHouse mein.' },
        { id: 'olap', label: 'ClickHouse', sub: 'OLAP, column store', x: 200, y: 466, w: 170, kind: 'data', info: 'Ye kya hai: analytics database, data column-wise. Live (Flink) aur pakke (Spark) dono numbers yahin. Arabon rows pe GROUP BY seconds mein.' },
        { id: 'dash', label: 'Dashboards', sub: 'creators, product', x: 200, y: 578, w: 170, kind: 'client', info: 'Ye kya hai: creator analytics, live viewer count, daily reports. Live numbers "approx" label ke saath, pakke numbers subah batch se.' },
        { id: 'ml', label: 'ML training', sub: 'recommendations', x: 560, y: 578, w: 170, kind: 'server', info: 'Ye kya hai: recommendations team ke jobs jo pichhle 90 din ke raw watch events lakehouse se padh ke model train karte hain.' },
      ],
      edges: [
        { a: 'apps', b: 'kafka', n: 1, label: 'events' },
        { a: 'pg', b: 'kafka', label: 'CDC' },
        { a: 'kafka', b: 'flink', n: 2 },
        { a: 'kafka', b: 'ks', kind: 'evt' },
        { a: 'kafka', b: 'lake', label: 'S3 sink' },
        { a: 'partner', b: 'lake', label: 'ELT load' },
        { a: 'lake', b: 'spark' },
        { a: 'spark', b: 'olap', via: [[640, 466]], label: 'pakke numbers' },
        { a: 'flink', b: 'olap', n: 3, label: 'live counts' },
        { a: 'olap', b: 'dash', n: 4, kind: 'res' },
        { a: 'lake', b: 'ml' },
      ],
      paths: [
        { name: 'Live count (stream)', text: 'Event Kafka mein, Flink 10 s window mein gine, ClickHouse mein likhe, dashboard pe ~10-15 s mein.', go: ['apps>kafka>flink>olap>dash'] },
        { name: 'Raat ka batch', text: 'Events lake mein jama, raat 2 baje Spark poore din ka pakka hisaab ClickHouse mein daale.', go: ['apps>kafka>lake>spark>olap>dash'] },
        { name: 'Spam check', text: 'Kafka Streams wali service har user ke likes live ginti hai.', go: ['apps>kafka>ks'] },
        { name: 'ML + ELT', text: 'DB changes (CDC) aur partner files raw lake mein; ML jobs wahin se padhte hain.', go: ['pg>kafka>lake>ml', 'partner>lake'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Analytics production DB pe nahi: events Kafka mein, phir alag data pipelines.</li>
      <li>Batch = bounded data, ghanton baad, pakka (MapReduce, Spark). Stream = unbounded, seconds mein, lagbhag sahi (Flink, Kafka Streams).</li>
      <li>MapReduce: map → shuffle (same key ek reducer pe) → reduce. Spark wahi idea memory mein, lineage se recovery; fayda baar baar same data use karne mein.</li>
      <li>Flink: alag cluster, state + checkpoints (state aur offset ek saath). Kafka Streams: service ke andar library, max parallelism = partitions.</li>
      <li>Windows: tumbling (no overlap), sliding (overlap), session (gap se band). Event time + watermark; late events drop, update ya side output.</li>
      <li>ETL = pehle saaf, phir load. ELT = raw load, andar SQL se saaf (naye sawaal aasaan, privacy ka dhyaan).</li>
      <li>Warehouse (saaf SQL tables), lake (sasti raw files), lakehouse (lake + transaction log: ACID, time travel).</li>
      <li>Lambda = batch + speed, do codebases. Kappa = sirf stream + replay. OLTP row store, OLAP column store.</li>
    </ul>` },

    { type: 'tradeoffs',
      gains: ['Production DB bacha rehta hai; analytics alag systems pe', 'Batch: poora data, pakke results, sasta, dobara chala sakte ho', 'Stream: seconds mein results, live features (counts, fraud, surge)', 'Column stores: arabon rows pe GROUP BY seconds mein', 'Lake/lakehouse: saalon ka raw data sasta, naye sawaal purane data pe'],
      costs: ['Naye systems: Kafka, Flink/Spark, OLAP, lake: sabka ops', 'Stream: late events, watermarks, state, exactly-once ki mushkil', 'Batch: results ghanton purane', 'Lambda: same logic do jagah; Kappa: lambi retention aur replay ka kharcha', 'Data copies kai jagah: consistency, privacy (delete requests) aur kharcha sambhalna'] },

    { type: 'think', questions: [
      { q: 'xyz.com pe har creator ko har mahine views ke hisaab se paisa milta hai. Creator dashboard pe "aaj ke views" live dikhane hain. Kya design karoge?', a: 'Live dashboard: Kafka → Flink (video/creator ke hisaab se tumbling windows, event time, thoda allowed delay) → ClickHouse → dashboard, "approx, live" label ke saath. Payout: raat/mahine ka Spark batch job lake ke poore data pe (late events, bot filtering, refunds ke saath) jo pakka number nikaale. Jab dono mein farq ho to batch sahi maana jaata hai.' },
      { q: 'Watermark delay 2 second rakha to bahut events drop ho rahe hain, 5 minute rakha to dashboard "live" nahi lagta. Kya karoge?', a: 'Pehle data dekho: events kitni der se aate hain (p99 delay). Delay ko us hisaab se (jaise 10-30 s) rakho. Saath mein allowed lateness do taaki thode late events result update kar sakein, aur bahut late events side output mein bhejo jo baad mein batch reconciliation mein jaayein. UI mein jaldi wala result dikhao aur update hone do.' },
      { q: 'Analytics team kehti hai "sab kuch Postgres read replica pe chala lenge, ClickHouse nahi chahiye". Kab ye theek hai, kab nahi?', a: 'Chhote data (kuch crore rows tak, kam dashboards) pe replica theek hai: main DB pe load nahi, koi naya system nahi. Jab queries arabon rows scan karein, ya replica ka lag aur slow queries replication ko pichhe karein, ya bahut log ek saath dashboards chalayein, tab column store (ClickHouse/BigQuery) chahiye, kyunki row store har query mein saare columns padhta hai.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'MapReduce mein shuffle step kya karta hai?', options: ['Input ko random order mein karta hai', 'Same key wale saare pairs ek reducer pe ikatthe karke key se sort karta hai', 'Output ko compress karta hai'], answer: 1, explain: 'Partition = hash(key) mod R. Same key hamesha same reducer pe, phir sort/group, phir reduce.' },
      { q: 'Combiner kab use kar sakte hain?', options: ['Hamesha', 'Jab operation (jaise sum, count) ko tukdon mein karke jodne se same result aaye', 'Sirf jab ek mapper ho'], answer: 1, explain: 'Combiner mapper pe partial reduce karta hai, network pe kam pairs. Average jaise operation ke liye seedha nahi chalega (sum aur count alag bhejne padte hain).' },
      { q: '"Pichhle 1 minute ke views, har 10 second update" ke liye kaunsi window?', options: ['Tumbling 1 minute', 'Sliding: size 1 minute, slide 10 second', 'Session, gap 10 second'], answer: 1, explain: 'Overlapping windows har slide pe nayi shuru hoti hain; har event 6 windows mein ginta hai.' },
      { q: 'Event time processing mein watermark kya batata hai?', options: ['Server ki current ghadi', 'Engine ka andaaza ki is time se pehle ke saare events aa chuke, ab window band kar sakte hain', 'Kafka ka offset'], answer: 1, explain: 'Watermark aage badhe to us time tak ki windows fire hoti hain. Uske baad aaye purane events late hain.' },
      { q: 'Kappa architecture mein logic badalne pe purana data dobara kaise process hota hai?', options: ['Alag batch system se', 'Naya stream job log ke shuru se replay karta hai, nayi table mein likhta hai, phir switch', 'Purana data reprocess nahi hota'], answer: 1, explain: 'Jay Kreps ka idea: ek hi stream codebase, lambi retention, replay se reprocessing.' },
      { q: '"Har country ka total watch time" query ke liye column store kyun tez hai?', options: ['Usme indexes nahi hote', 'Wo sirf zaroori 2 columns padhta hai aur ek tarah ki values achhe se compress hoti hain', 'Wo data RAM mein hi rakhta hai hamesha'], answer: 1, explain: 'Row store ko poori rows (saare columns) padhni padti hain. 30 mein se 2 columns + compression = dasiyon guna kam bytes.' },
      { q: 'Analytics team ko ek naya sawaal poochhna hai jiski field ETL transform ne pehle hi hata di thi. Kaunsa approach yahan behtar tha?', options: ['ETL', 'ELT: raw data warehouse/lake mein pada hai, bas nayi SQL', 'Dono mein same'], answer: 1, explain: 'ELT mein raw data bachta hai, naya sawaal = nayi query. ETL mein source se dobara extract karna padta, aur source ki retention ke bahar ka data gaya.' },
      { q: 'Plain data lake ke muqable lakehouse table format (Iceberg/Delta) ka main fayda?', options: ['Files chhoti ho jaati hain', 'Transaction log: reader sirf committed version dekhta hai (ACID), purane versions aur deletes possible', 'Data RAM mein rehta hai'], answer: 1, explain: 'Aadha likha ya crash hua batch kabhi readers ko nahi dikhta, aur time travel ke liye purane versions log mein hain.' },
      { q: 'Kafka Streams app ke topic mein 6 partitions hain. 10 instances chalaye to?', options: ['10 guna speed', '6 instances kaam karenge, 4 idle', 'Kafka partitions apne aap 10 ho jaayenge'], answer: 1, explain: 'Ek partition ek waqt pe group ke ek hi member ke paas. Max parallelism = partitions ki ginti.' },
    ]},
    { type: 'sources', note: 'MapReduce (2004) aur RDD (2012) papers purane hain; unke ideas aaj ke tools mein hain lekin exact implementation badal chuka hai. Flink aur Kafka Streams ke liye current official docs use kiye.', items: [
      { title: 'MapReduce: Simplified Data Processing on Large Clusters', publisher: 'Google (Jeffrey Dean, Sanjay Ghemawat), OSDI 2004', year: 2004, official: true, url: 'https://static.googleusercontent.com/media/research.google.com/en//archive/mapreduce-osdi04.pdf', used: 'Map/reduce model and word count, M splits of 16-64 MB, master assigning tasks, intermediate data on local disk partitioned by hash(key) mod R, reducers reading remotely and sorting, combiner, re-executing completed map tasks on failure, locality with GFS 64 MB blocks x3, backup tasks (1 TB sort 891 s vs 1283 s without, +44%), production indexing use.' },
      { title: 'Resilient Distributed Datasets: A Fault-Tolerant Abstraction for In-Memory Cluster Computing', publisher: 'UC Berkeley (Zaharia et al.), NSDI 2012', year: 2012, official: true, url: 'https://www.usenix.org/conference/nsdi12/technical-sessions/presentation/zaharia', used: 'RDDs as in-memory distributed datasets, lineage-based fault tolerance, order-of-magnitude gains for iterative and interactive workloads.' },
      { title: 'Windows (DataStream API)', publisher: 'Apache Flink documentation', official: true, url: 'https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/operators/windows/', used: 'Tumbling, sliding (size + slide, element in multiple windows), session (gap, no fixed start/end) windows; epoch alignment; start inclusive/end exclusive; firing when watermark passes window end; allowed lateness default 0 and late data dropped or sent to side output.' },
      { title: 'Kafka Streams introduction', publisher: 'Apache Kafka documentation', official: true, url: 'https://kafka.apache.org/42/streams/introduction/', used: 'Kafka Streams as a client library inside your application, input/output in Kafka, stateful processing, windowing, exactly-once, no separate cluster.' },
      { title: 'Kafka Streams architecture: stream partitions and tasks', publisher: 'Apache Kafka documentation', official: true, url: 'https://kafka.apache.org/documentation/streams/architecture', used: 'Tasks per input partition; maximum parallelism bounded by partitions; extra instances stay idle; local state stores backed by changelog topics and restored on failover.' },
      { title: 'Fault Tolerance via State Snapshots', publisher: 'Apache Flink documentation', official: true, url: 'https://nightlies.apache.org/flink/flink-docs-stable/docs/learn-flink/fault_tolerance/', used: 'Checkpoints as consistent snapshots of operator state together with source offsets, restore and replay after failure, exactly-once state semantics.' },
      { title: 'Apache Iceberg table spec', publisher: 'Apache Iceberg', official: true, url: 'https://iceberg.apache.org/spec/', used: 'Table metadata and snapshots listing data files, atomic commits, readers see a consistent snapshot, time travel to older snapshots, row-level deletes.' },
      { title: 'Questioning the Lambda Architecture', publisher: "O'Reilly Radar (Jay Kreps)", year: 2014, url: 'https://www.oreilly.com/radar/questioning-the-lambda-architecture/', used: 'What Lambda architecture is, the pain of maintaining logic in two systems, the Kappa alternative: keep data in Kafka, reprocess by running a second job from the start into a new table, then switch.' },
      { title: 'Lakehouse: A New Generation of Open Platforms that Unify Data Warehousing and Advanced Analytics', publisher: 'Databricks (Armbrust, Ghodsi, Xin, Zaharia), CIDR 2021', year: 2021, official: true, url: 'https://www.databricks.com/research/lakehouse-a-new-generation-of-open-platforms-that-unify-data-warehousing-and-advanced-analytics', used: 'Lakehouse definition: open direct-access formats like Parquet, warehouse-like management, support for ML, as an alternative to separate lake + warehouse.' },
    ]},
  ],
});
