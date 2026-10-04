Lesson.register({
  id: 'design-id-kv',
  title: 'Unique ID generator aur KV store',
  minutes: 42,
  summary: `Do classic "building block khud banao" sawaal. Pehla: har second hazaaron unique, time-ordered IDs dene wali service (Twitter Snowflake ka design). Doosra: Amazon ke Dynamo paper jaisa key-value store, jisme phase 2 aur 3 ka lagbhag sab kuch ek saath aata hai: consistent hashing, vnodes, N/R/W quorums, vector clocks, gossip, Merkle trees, hinted handoff, read repair, aur har node ke andar LSM storage.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Is lesson mein do chhoti lekin bahut zaroori machines banayenge. Pehli: ek "number dene wali machine". xyz.com pe har second hazaaron naye posts aur messages bante hain, aur har ek ko ek alag number (ID) chahiye. 200 servers ek saath number bana rahe hain, phir bhi do kabhi same na hon. Doosri: ek bahut bada "key se value" wala store, jaise ek giant dictionary: word do, meaning lo. Ye dictionary hazaaron machines pe bati hai, kuch machines roz kharab hoti hain, phir bhi koi likhna (write) kabhi mana na ho aur data kabhi na khoye. Dono mein ek hi baat common hai: <strong>koi ek boss machine nahi</strong> jis pe sab atke.` },
    { type: 'callout', tone: 'tip', title: 'Pehle khud try karo', html: `Do sawaal, 10-10 minute: (1) 200 servers ko har second hazaaron IDs chahiye, koi do kabhi same na hon, aur IDs time ke order mein lagbhag sort hon. (2) Ek key-value store jo kabhi write mana na kare, chahe kuch servers mar jaayein. Kaagaz pe socho, phir padho.` },
    { type: 'p', html: `Dono sawaalon ka ek hi mood hai: <strong>koi central boss nahi</strong>. Twitter ne 2010 mein Snowflake isliye banaya kyunki unhe aise IDs chahiye the jo machines bina aapas mein baat kiye bana sakein. Amazon ne 2007 ke Dynamo paper mein aisa store bataya jahan har node barabar hai, koi leader nahi. Concepts ki kahani pehle ke lessons mein hai (<a href="#/unique-ids">Unique IDs</a>, <a href="#/consistent-hashing">Consistent hashing</a>, <a href="#/consistency">Quorums</a>). Yahan hum unhe jod ke <strong>service</strong> banate hain.` },

    { type: 'h2', text: 'Part 1: Unique ID generator service' },
    { type: 'callout', tone: 'term', title: 'Unique ID', html: `<strong>Ye kya hai:</strong> har cheez (post, message, order) ka ek number jo poori duniya mein sirf usi ka ho, jaise har phone ka alag IMEI number. Database use dhoondhne, jodne aur sort karne ke liye isi ko use karta hai.<br><strong>Kyun chahiye:</strong> jab data ek database pe tha, database khud 1, 2, 3... (auto-increment) de deta tha. Ab data kai machines pe hai, aur kai servers ek saath naye posts bana rahe hain. Sabko ek hi counter se poochhna slow aur khatarnaak (wo gira to koi post nahi ban sakta).<br><strong>Iske bina:</strong> do posts ko same ID mil sakti hai: ek ka comment doosre pe dikhega, ya ek post doosri ko overwrite kar degi.` },
    { type: 'h3', text: 'Requirements' },
    { type: 'compare',
      left: { title: 'Functional', html: `• <code>next_id()</code>: ek naya 64-bit ID (64 bits = ek number jo lagbhag 1.8 × 10<sup>19</sup> tak jaata hai, aur Java ke <code>long</code> ya SQL ke <code>BIGINT</code> mein fit hota hai)<br>• IDs kabhi repeat na hon, kisi bhi machine pe<br>• Lagbhag time ke order mein (naya tweet = bada ID)<br>• (Optional) ek baar mein batch: 100 IDs` },
      right: { title: 'Non-functional', html: `• Twitter ki 2010 post: <strong>har second hazaaron IDs</strong>, highly available<br>• Snowflake README: kam se kam 10k IDs/second per process, ~2 ms response (network ke alawa)<br>• Machines ke beech koi coordination nahi<br>• 64 bits mein fit (Java long, SQL BIGINT)` },
    },
    { type: 'p', html: `Twitter us waqt MySQL se Cassandra (ek distributed database, Part 2 mein iski baat hogi) pe ja raha tha, aur Cassandra mein auto-increment jaisa kuch nahi hota. Ek central counter (ticket server) SPOF aur bottleneck dono hota; UUID (ek random 128-bit ID) bahut lamba hota aur time ke order mein nahi. Isliye Snowflake.` },
    { type: 'callout', tone: 'term', title: 'Snowflake ID', html: `<strong>Ye kya hai:</strong> ek 64-bit number jo teen tukdon ko jod ke banta hai: <strong>time</strong> (abhi kitne millisecond hue) + <strong>machine number</strong> (kis server ne banaya) + <strong>sequence</strong> (us millisecond mein us server ka kaunsa number). Jaise ek ticket pe "date-time + counter number + us din ka serial".<br><strong>Kyun chahiye:</strong> har server apna ID khud bana leta hai, kisi se poochhe bina. Machine number alag hai, to do servers kabhi takraate nahi. Time sabse aage hai, to naye IDs bade hote hain (lagbhag sorted).<br><strong>Iske bina:</strong> ya to central counter (slow, SPOF), ya random UUID (128 bits, time-order nahi, database index ke liye bura).` },
    { type: 'p', html: `Layout aur clock skew ki poori kahani <a href="#/unique-ids">Unique IDs</a> lesson mein hai. Yahan design wala sawaal: <strong>bits kaise baantein?</strong>` },
    { type: 'h3', text: 'Bit budget: 63 bits, teen hisse' },
    { type: 'p', html: `Pehla bit "sign bit" hai (number positive hai ya negative); use 0 rakhte hain taaki ID hamesha positive rahe. Bache 63 bits. Time "custom epoch" se gina jaata hai (epoch = wo shuruaati pal jisse ghadi 0 se ginti hai; Twitter ne apni ek tareekh chuni taaki bits bachein). Jitne bits time ko doge, utne saal chalega. Jitne machine ko, utni machines. Jitne sequence ko, utne IDs per millisecond. Ek ka faayda = doosre ka nuksaan. Khelo:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Timestamp bits (ms): <strong class="idb-tv"></strong></label><input class="idb-t" type="range" min="35" max="45" step="1" value="41"></div>
          <div><label>Machine bits: <strong class="idb-mv"></strong></label><input class="idb-m" type="range" min="4" max="16" step="1" value="10"></div>
          <div><label>Kitni machines chahiye: <strong class="idb-nv"></strong></label><input class="idb-n" type="range" min="10" max="5000" step="10" value="200"></div>
          <div><label>Ek machine pe peak IDs/second: <strong class="idb-pv"></strong></label><input class="idb-p" type="range" min="1000" max="10000000" step="1000" value="50000"></div>
        </div>
        <svg class="idb-svg" viewBox="0 0 320 44" style="width:100%;height:auto;margin-top:10px" role="img" aria-label="64-bit ID ka bit layout"></svg>
        <div class="stats">
          <div class="stat"><span>Sequence bits (bache)</span><strong class="idb-s"></strong></div>
          <div class="stat"><span>Kitne saal chalega</span><strong class="idb-y"></strong></div>
          <div class="stat"><span>Max machines</span><strong class="idb-mm"></strong></div>
          <div class="stat"><span>IDs/second per machine (max)</span><strong class="idb-ps"></strong></div>
        </div>
        <div class="calc-note idb-note"></div>`;
      const q = s => el.querySelector(s);
      const fmt = n => n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 3).replace(/\.?0+$/, '') + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'k' : String(n);
      const upd = () => {
        const t = +q('.idb-t').value, m = +q('.idb-m').value, need = +q('.idb-n').value, peak = +q('.idb-p').value;
        const s = 63 - t - m;
        q('.idb-tv').textContent = t; q('.idb-mv').textContent = m; q('.idb-nv').textContent = need; q('.idb-pv').textContent = fmt(peak);
        const years = Math.pow(2, t) / (365.25 * 24 * 3600 * 1000);
        const maxM = Math.pow(2, m), perSec = s >= 1 ? Math.pow(2, s) * 1000 : 0;
        q('.idb-s').textContent = s >= 1 ? s : 'kuch nahi!';
        q('.idb-y').textContent = years >= 100 ? years.toFixed(0) : years.toFixed(1);
        q('.idb-mm').textContent = maxM.toLocaleString('en-US');
        q('.idb-ps').textContent = s >= 1 ? fmt(perSec) : '0';
        const W = 300 / 64, x0 = 10; let x = x0;
        const seg = (bits, col, lab) => { const w = bits * W; const r = `<rect x="${x}" y="6" width="${Math.max(w, 0)}" height="22" fill="${col}" stroke="var(--bg)" stroke-width="1"/>` + (() => { const full = lab + ' ' + bits, t = full.length * 5.6 < w - 4 ? full : String(bits).length * 5.6 < w - 4 ? String(bits) : ''; return t && lab ? `<text x="${x + w / 2}" y="21" text-anchor="middle" font-size="9" fill="var(--bg)" font-family="var(--f-mono)">${t}</text>` : ''; })(); x += Math.max(w, 0); return r; };
        q('.idb-svg').innerHTML = seg(1, 'var(--ink-3)', '') + seg(t, 'var(--accent)', 'time') + seg(m, 'var(--violet)', 'machine') + seg(Math.max(s, 0), 'var(--green)', 'seq') +
          `<text x="${x0}" y="40" font-size="9" fill="var(--ink-2)" font-family="var(--f-mono)">bit 63 (sign)</text><text x="310" y="40" text-anchor="end" font-size="9" fill="var(--ink-2)" font-family="var(--f-mono)">bit 0</text>`;
        const probs = [];
        if (s < 1) probs.push('sequence ke liye ek bhi bit nahi bacha: ek machine ek ms mein ek bhi ID nahi bana sakti');
        if (need > maxM) probs.push(`${need} machines chahiye, lekin ${m} bits mein sirf ${maxM} naam hain`);
        if (s >= 1 && peak > perSec) probs.push(`ek machine ko ${fmt(peak)}/s chahiye, lekin sequence sirf ${fmt(perSec)}/s deta hai`);
        if (years < 20) probs.push(`sirf ${years.toFixed(1)} saal: system ke zinda rehte hi IDs khatam`);
        q('.idb-note').textContent = probs.length ? 'Problem: ' + probs.join('; ') + '.' : `Fit hai. ${t}/${m}/${s} layout: ~${years.toFixed(1)} saal (custom epoch se), ${maxM} machines, har machine ${fmt(perSec)} IDs/second tak.` + (t === 41 && m === 10 ? ' Yahi Twitter Snowflake ka layout hai.' : ' Ek hisse ko jo mila, wo baaki do se kata.');
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Twitter ke layout (41 / 10 / 12) pe: 2<sup>41</sup> ms ≈ <strong>69.7 saal</strong>, 2<sup>10</sup> = <strong>1,024 machines</strong>, aur 2<sup>12</sup> = 4,096 IDs har millisecond, yaani ek machine ~<strong>41 lakh IDs/second</strong> tak (README ka target sirf 10k/second tha, to kaafi jagah bachi). Agar tumhe 5,000 machines chahiye, machine bits badhao; sequence ya saal kategi. Instagram ne 41 / 13 / 10 liya tha, kyunki unke "machine" bits asal mein logical shards the (<a href="#/unique-ids">Unique IDs</a> lesson mein dekho).` },
    { type: 'p', html: `Ulta bhi kar sakte hain: kisi bhi Snowflake ID ko tod ke dekh sakte ho ki wo kab aur kis machine pe bana. Twitter ke layout mein machine ke 10 bits aage do hisson mein bate the: 5 bits data center + 5 bits worker (server). Neeche ek ID chuno ya apna number daalo:` },
    { type: 'custom', render(el) {
      // Snowflake decoder: 41-bit ms since Twitter epoch | 5-bit datacenter | 5-bit worker | 12-bit sequence
      const EPOCH = 1288834974657n;
      const PRESETS = [['Flow wala ID', '2106693309475987456'], ['Same ms, agla sequence', '2106693309475987457'], ['Same ms, dc 2 worker 1', '2106693309476114432'], ['1 ms baad', '2106693309480181760']];
      el.innerHTML = `<div class="sfd-pre" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <div style="margin-top:8px"><label>Snowflake ID: <input class="sfd-in" type="text" inputmode="numeric" value="2106693309475987456" style="width:100%;max-width:300px;font-family:var(--f-mono)"></label></div>
        <div class="sfd-bits" style="font-family:var(--f-mono);font-size:11px;word-break:break-all;margin-top:8px;line-height:1.6"></div>
        <div class="stats">
          <div class="stat"><span>Time (UTC)</span><strong class="sfd-t"></strong></div>
          <div class="stat"><span>Data center</span><strong class="sfd-d"></strong></div>
          <div class="stat"><span>Worker</span><strong class="sfd-w"></strong></div>
          <div class="stat"><span>Sequence</span><strong class="sfd-s"></strong></div>
        </div>
        <div class="calc-note sfd-note"></div>`;
      const q = s => el.querySelector(s);
      const pre = q('.sfd-pre');
      PRESETS.forEach(([n, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small ghost'; b.textContent = n; b.onclick = () => { q('.sfd-in').value = v; upd(); }; pre.appendChild(b); });
      const upd = () => {
        const raw = q('.sfd-in').value.trim();
        if (!/^[0-9]{1,19}$/.test(raw) || BigInt(raw) >= (1n << 63n)) { q('.sfd-note').textContent = 'Ek positive number daalo jo 63 bits mein fit ho (19 digits tak).'; return; }
        const id = BigInt(raw);
        const ts = id >> 22n, dc = (id >> 17n) & 31n, wk = (id >> 12n) & 31n, sq = id & 4095n;
        const ms = ts + EPOCH;
        const b = id.toString(2).padStart(64, '0');
        const col = (s, c) => `<span style="color:${c}">${s}</span>`;
        q('.sfd-bits').innerHTML = col(b.slice(0, 1), 'var(--ink-3)') + ' ' + col(b.slice(1, 42), 'var(--accent)') + ' ' + col(b.slice(42, 47), 'var(--violet)') + ' ' + col(b.slice(47, 52), 'var(--violet)') + ' ' + col(b.slice(52), 'var(--green)');
        q('.sfd-t').textContent = new Date(Number(ms)).toISOString().replace('T', ' ').replace('Z', '');
        q('.sfd-d').textContent = String(dc); q('.sfd-w').textContent = String(wk); q('.sfd-s').textContent = String(sq);
        q('.sfd-note').textContent = `Time hissa = ${ts} ms, Twitter epoch (4 Nov 2010) ke baad. Formula: time = ID >> 22, dc = (ID >> 17) & 31, worker = (ID >> 12) & 31, sequence = ID & 4095. Dhyaan do: time sabse baayein (sabse bade bits) hai, isliye baad mein bani ID hamesha bada number hoti hai, chahe machine koi bhi ho.`;
      };
      q('.sfd-in').addEventListener('input', upd); upd();
    }},
    { type: 'p', html: `Presets ko compare karo: "agla sequence" sirf aakhri bits mein +1 hai. "dc 2 worker 1" same millisecond mein doosri machine pe bana: time same, machine bits alag, isliye ID alag. "1 ms baad" wali ID baaki sab se badi hai. Yahi "roughly sorted by time" ka matlab hai.` },
    { type: 'h3', text: 'Service ya library?' },
    { type: 'p', html: `Twitter ka Snowflake ek alag <strong>service</strong> tha: Scala mein likha Thrift server (Thrift = servers ke aapas mein function call karne ka ek tareeka, gRPC jaisa), jise doosri services network pe call karti thi. Doosra tareeka: generator ko har app server ke andar <strong>library</strong> bana ke chalao (Instagram ne to ise database ke andar hi daal diya tha). Dono sahi hain:` },
    { type: 'table', head: ['', 'Alag ID service (Snowflake 2010)', 'Library har app server mein'], rows: [
      ['Latency', 'Ek network call (~1-2 ms)', 'Microseconds, network nahi'],
      ['Machine IDs', 'Sirf ID servers ko chahiye (kam, stable)', 'Har app server ko chahiye (zyada, autoscaling mein aate jaate)'],
      ['Clock problems', 'Kuch machines pe nazar rakhni hai', 'Saikdon machines ki ghadiyan'],
      ['Languages', 'Ek implementation, sab use karein', 'Har language mein dobara likho'],
      ['Failure', 'Service down = IDs nahi (isliye kai copies)', 'App zinda hai to ID bhi'],
    ]},
    { type: 'p', html: `xyz.com ke liye hum service banate hain, do data centers mein. Chala ke dekho. (Machine ID kaun deta hai, ye Twitter ki post mein detail se nahi; README "configured machine id" kehta hai. Aam taur pe industry mein ye config se, ya ZooKeeper/etcd jaise coordination store se lease le ke diya jaata hai, jaisa yahan dikhaya hai.)` },
    { type: 'callout', tone: 'term', title: 'Worker registry aur lease', html: `<strong>Ye kya hai:</strong> <em>ZooKeeper</em> ya <em>etcd</em> ek chhota, bahut bharose wala store hai jahan servers aapas mein "ye mera hai" likh sakte hain (detail <a href="#/coordination">Coordination</a> lesson mein). <em>Lease</em> = kiraaye pe li hui cheez: "worker number 2 mera hai, agle 30 second ke liye"; server baar baar renew karta rehta hai.<br><strong>Kyun chahiye:</strong> do ID servers ko kabhi same machine number nahi milna chahiye, warna same millisecond mein same ID ban sakti hai.<br><strong>Iske bina:</strong> haath se config likhna padta; ek galti (do servers pe same number) = duplicate IDs, jo sabse khatarnaak bug hai.` },
    { type: 'flow', height: 340, title: 'ID service, do data centers',
      nodes: [
        { id: 'svc', label: 'Post service', sub: 'needs IDs', x: 90, y: 170, w: 140, kind: 'server', info: 'Ye kya hai: xyz.com ki koi bhi service jise naye post/message ke liye ID chahiye. Iski client library ke paas ID servers ki list hai, taaki ek gire to doosra try kar sake.' },
        { id: 'w1', label: 'ID server', sub: 'dc 1, worker 1', x: 340, y: 60, w: 150, kind: 'server', info: 'Ye kya hai: Snowflake jaisa ID banane wala server. Machine bits = 5 bits datacenter (1) + 5 bits worker (1). Kisi aur ID server se baat nahi karta, isliye fast hai.' },
        { id: 'w2', label: 'ID server', sub: 'dc 1, worker 2', x: 340, y: 170, w: 150, kind: 'server', info: 'Ye kya hai: doosra ID server, same data center mein, lekin alag worker number. Isliye same millisecond aur same sequence pe bhi ID alag.' },
        { id: 'w3', label: 'ID server', sub: 'dc 2, worker 1', x: 340, y: 280, w: 150, kind: 'server', info: 'Ye kya hai: doosre data center ka ID server. Worker number 1 dobara use hua, lekin datacenter bits alag (2), to ID phir bhi unique.' },
        { id: 'cfg', label: 'Worker registry', sub: 'etcd / ZooKeeper', x: 600, y: 170, w: 170, kind: 'net', info: 'Ye kya hai: etcd/ZooKeeper jaisa coordination store. Sirf startup pe kaam aata hai: har ID server yahan se apna (datacenter, worker) number lease pe leta hai, taaki do servers ko same number na mile. Har ID ke liye yahan nahi aana padta.' },
      ],
      edges: [{ a: 'svc', b: 'w1' }, { a: 'svc', b: 'w2' }, { a: 'svc', b: 'w3' }, { a: 'w1', b: 'cfg', dashed: true }, { a: 'w2', b: 'cfg', dashed: true }, { a: 'w3', b: 'cfg', dashed: true }],
      scenarios: [
        { name: 'Normal', steps: [
          { title: 'Startup: number lo', parallel: true, go: ['w1>cfg', 'res:cfg>w1', 'w2>cfg', 'res:cfg>w2', 'w3>cfg', 'res:cfg>w3'], text: 'Har ID server ne apna number lease pe liya. Jab tak server zinda hai aur lease renew karta hai, number uska.' },
          { title: 'ID maango', go: ['svc>w2', 'res:w2>svc'], text: 'Post service ne kisi bhi ID server ko call kiya. Server ne apni ghadi, apna number aur sequence jod ke ID banaya. Koi doosra server shaamil nahi.', msg: 'next_id() → 2106693309475987456\n= time (Twitter epoch se) | dc 1 | worker 2 | seq 0' },
          { title: 'Batch', go: ['svc>w1', 'res:w1>svc'], text: 'Network call bachaane ke liye client ek baar mein 100 IDs maang sakta hai aur memory mein rakh sakta hai. Keemat: in IDs ka time thoda purana, to order thoda aur "lagbhag" ho jaata hai.', msg: 'next_ids(100) → [..100 IDs..]' },
        ]},
        { name: 'Ek server mara', steps: [
          { title: 'Worker 2 crash', set: { w2: { state: 'down', sub: 'DOWN' } }, go: ['svc>w2', 'bad:w2>svc'], text: 'Call fail ya timeout.' },
          { title: 'Doosre se le lo', go: ['svc>w1', 'res:w1>svc'], text: 'Client library ne list mein agla server try kiya. Kyunki servers ke beech koi coordination nahi, koi bhi server kisi ka kaam kar sakta hai. Yahi "uncoordinated" design ka faayda hai.' },
          { title: 'Lease khatam', after: { cfg: { sub: 'dc1/w2 free' } }, focus: ['cfg'], text: 'Worker 2 ki lease expire hui. Naya server ye number tabhi le jab purane server ke aakhri ID ka time nikal chuka ho, warna takraav ka khatra (isliye lease expiry ke baad thoda ruko).' },
        ]},
        { name: 'Data center gaya', steps: [
          { title: 'dc 1 offline', set: { w1: { state: 'down', sub: 'dc 1 DOWN' }, w2: { state: 'down', sub: 'dc 1 DOWN' } }, focus: ['w1', 'w2'], text: 'Poora data center 1 network se kat gaya.' },
          { title: 'dc 2 chalta rahe', go: ['svc>w3', 'res:w3>svc'], text: 'dc 2 ka server IDs deta raha. Datacenter bits alag hain, to dc 1 wapas aane pe bhi koi ID takraayega nahi. Koi "global" faisla lene ki zaroorat hi nahi padi.' },
        ]},
        { name: 'Ghadi peeche', steps: [
          { title: 'NTP ne ghadi 3 ms peeche ki', set: { w3: { state: 'warn', sub: 'clock < last_ts' } }, focus: ['w3'], text: 'NTP (Network Time Protocol: wo service jo server ki ghadi ko internet ki sahi ghadi se milati rehti hai) ne ghadi thodi peeche kar di. Ab ghadi pichhli ID ke time se peeche hai, to nayi ID purani se chhoti ban sakti hai, ya duplicate. Snowflake README ke mutabik aise mein generator ID dena band kar deta hai, jab tak ghadi pichhle ID ke time se aage na nikal jaaye.' },
          { title: 'Client doosre server pe', go: ['svc>w3', 'bad:w3>svc', 'svc>w1', 'res:w1>svc'], set: { w1: { state: '', sub: 'dc 1, worker 1' } }, text: 'w3 ne mana kiya (error), client ne doosre server se le liya. Monitoring: "clock went backwards" errors ka alert. Detail <a href="#/unique-ids">Unique IDs</a> lesson ke clock skew wale diagram mein.' },
        ]},
      ],
    },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "Snowflake IDs strictly sorted hain"', html: `Nahi. Alag machines ki ghadiyan thodi alag hain, aur same millisecond ke andar machine bits order tay karte hain, time nahi. Twitter ne khud "roughly sortable" kaha. Agar tumhe strict order chahiye (jaise ek chat ke messages), to ek partition ke andar ek hi sequence chahiye; global IDs se ye guarantee nahi milti.` },

    { type: 'h2', text: 'Part 2: Dynamo-style key-value store' },
    { type: 'p', html: `Amazon ka 2007 ka Dynamo paper ek problem se shuru hota hai: <strong>shopping cart</strong>. Customer "add to cart" dabaye aur jawab aaye "abhi nahi ho sakta", ye Amazon ke liye seedha nuksaan aur bharosa toot-na tha. Paper ke mutabik Shopping Cart Service ek busy din pe karodon (tens of millions) requests sambhalti thi. Requirement: store <strong>hamesha writeable</strong> rahe, disks girein, network toote, poora data center jaaye.` },
    { type: 'callout', tone: 'term', title: 'Key-value (KV) store', html: `<strong>Ye kya hai:</strong> sabse simple database: ek <strong>key</strong> do (jaise <code>cart:42</code>), uski <strong>value</strong> lo (jaise cart ke items). Ek giant dictionary jaisa. Na tables ke joins, na complex queries. Value ke andar kya hai, store ko farak nahi padta (Dynamo ke liye value bas bytes ka dher hai, aam taur pe 1 MB se chhoti).<br><strong>Kyun chahiye:</strong> cart, session, user settings jaise data ko hamesha sirf key se dhoondha jaata hai. Itne simple kaam ke liye store ko bahut bada aur bahut tez banaya ja sakta hai.<br><strong>Iske bina:</strong> ek normal SQL database pe ye kaam chalaate, jo ek machine se bada karna mushkil hai, aur us machine ke girte hi "add to cart" band.` },
    { type: 'h3', text: 'Requirements' },
    { type: 'compare',
      left: { title: 'Functional', html: `• <code>get(key)</code><br>• <code>put(key, value)</code><br>• Sirf primary key se access; ek key ke andar hi kaam<br><br><strong>Out of scope:</strong> joins, range queries, multi-key transactions` },
      right: { title: 'Non-functional (Dynamo paper)', html: `• Always writeable, kuch nodes mare hon tab bhi<br>• Latency 99.9th percentile pe naapi jaati hai (paper ka example: 500 requests/s peak pe 99.9% requests 300 ms ke andar)<br>• <strong>Incremental scalability</strong>: ek ek node jodte jao<br>• <strong>Symmetry</strong> aur decentralization: har node barabar, koi master nahi` },
    },
    { type: 'callout', tone: 'term', title: '99.9th percentile (p99.9)', html: `<strong>Ye kya hai:</strong> 1,000 requests ko time ke hisaab se chhote se bade tak line mein lagao. 999vi request kitna time leti hai, wo p99.9 hai.<br><strong>Kyun chahiye:</strong> average achha ho sakta hai jabki kuch users ko bahut der lag rahi ho. Amazon ne average ki jagah p99.9 isliye chuna taaki <strong>lagbhag har</strong> customer ka anubhav achha rahe, sirf "aam" customer ka nahi.<br><strong>Iske bina:</strong> "average 20 ms" dekh ke khush rehte, jabki har hazaar mein ek customer 3 second ka intezaar kar raha hota (aur aksar wahi sabse zyada kharidne wale hote hain, jinke cart bade hain).` },
    { type: 'h3', text: 'API' },
    { type: 'code', text: `
get(key)                  →  [ (value, context), ... ]   // ek se zyada versions aa sakte hain!
put(key, context, value)  →  ok

key ko MD5 se hash karke 128-bit number banta hai → ring pe position
context = version ki jaankari (vector clock), client ise wapas bhejta hai` },
    { type: 'p', html: `Do shabd: <strong>hash</strong> (jaise MD5) ek function hai jo kisi bhi text ko ek bada, random-sa dikhne wala number bana deta hai; same text pe hamesha same number. Isse keys machines mein barabar bikhar jaati hain. <strong>context</strong> ek chhota tag hai jo batata hai "tumne kaunsa version padha tha"; client agle put mein ise wapas bhejta hai (aage vector clocks mein samjhenge).` },
    { type: 'p', html: `Dhyaan do: <code>get</code> <strong>kai values</strong> lauta sakta hai. Normal databases mein aisa nahi hota. Ye Dynamo ka sabse ajeeb aur sabse important faisla hai: jab do versions takraayein, store khud ek ko nahi phenkta; client (application) ko dono deta hai. Aage dekhenge kyun.` },
    { type: 'h3', text: 'Har problem ka ek tool' },
    { type: 'p', html: `Dynamo paper ka ek table poore design ka naksha hai. Har row ek problem hai jo "koi master nahi, hamesha writeable" se paida hoti hai:` },
    { type: 'table', head: ['Problem', 'Technique', 'Faayda'], rows: [
      ['Data ko nodes mein baantna', 'Consistent hashing (+ virtual nodes)', 'Node aaye/jaaye to thoda sa data hi hile'],
      ['Writes ke liye high availability', 'Vector clocks, read pe reconciliation', 'Write kabhi mana nahi; versions baad mein sulajhte hain'],
      ['Temporary failures', 'Sloppy quorum + hinted handoff', 'Kuch replicas down hon tab bhi read/write'],
      ['Permanent failures se recovery', 'Anti-entropy with Merkle trees', 'Replicas ko background mein sync, kam data bhej ke'],
      ['Membership aur failure detection', 'Gossip protocol', 'Koi central registry nahi; har node barabar'],
    ]},
    { type: 'p', html: `Ye naam abhi ajeeb lagenge, ghabrao mat. Ab ek ek karke. Har ek pehle ek problem ki tarah aayega, phir uska tool, plain shabdon mein. Saath mein dekhenge ki aaj ke do open-source Dynamo-style stores, <strong>Cassandra</strong> aur <strong>Riak</strong>, isko kaise karte hain (unke official docs se).` },

    { type: 'h3', text: '1. Data kahan rahe: consistent hashing + vnodes' },
    { type: 'p', html: `Problem: TBs ka data hai, ek machine pe nahi aata. Usse kai machines (nodes) pe baantna padega. Seedha tareeka <code>hash(key) % N</code> (N = machines ki ginti) hai, lekin ek node jodte hi N badalta hai aur lagbhag saari keys jagah badal leti hain: bahut bada data move. Solution: <a href="#/consistent-hashing">consistent hashing</a>.` },
    { type: 'callout', tone: 'term', title: 'Consistent hashing ring aur coordinator', html: `<strong>Ye kya hai:</strong> saare possible hash numbers ko ek gol ghadi (ring) ki tarah socho. Har node ring pe kisi jagah baithta hai. Key ka hash bhi ring pe ek jagah deta hai. Wahan se <strong>clockwise</strong> chalo: jo pehla node mile, wo us key ka maalik, yaani <strong>coordinator</strong> (wo node jo is key ke read/write ko sambhalta hai).<br><strong>Kyun chahiye:</strong> naya node aaye to sirf uske bagal wali keys hilti hain, baaki sab apni jagah.<br><strong>Iske bina:</strong> <code>% N</code> mein ek machine jodne pe lagbhag poora data ek machine se doosri pe copy hota, hafton tak.` },
    { type: 'callout', tone: 'term', title: 'Virtual node (vnode)', html: `<strong>Ye kya hai:</strong> ek physical machine ring pe ek jagah nahi, <strong>kai jagah</strong> baithti hai. Har jagah ek "token" ya virtual node hai. 4 machines × 8 vnodes = ring pe 32 nishaan.<br><strong>Kyun chahiye:</strong> sirf ek jagah ho to kisi machine ko ring ka bada tukda milta hai, kisi ko chhota. Aur ek machine gire to uska saara load sirf agle ek node pe girta hai. Kai chhote tukde = load barabar, aur failure ka load sab mein bat jaata hai.<br><strong>Iske bina:</strong> ek machine 40% data sambhal rahi hogi aur doosri 10%, aur ek failure agle node ko dooba dega.` },
    { type: 'p', html: `Dynamo paper ke mutabik vnodes ke teen faayde: node gire to uska load baaki sab mein barabar batt jaata hai; naya node aaye to sabse thoda thoda load leta hai; aur badi machine ko zyada vnodes de sakte ho (alag size ki machines ek saath chal sakti hain). Aaj ke systems: <strong>Riak</strong> ke docs ke mutabik Riak har bucket/key ka 160-bit hash leta hai aur ring ko fixed partitions mein baantta hai (default <code>ring_size</code> 64), har partition ek vnode ka. <strong>Cassandra</strong> ke docs batate hain ki 2.x mein har node ke default 256 random tokens hote the; 3.x se ek naya allocator kam tokens mein bhi ring ko barabar baant deta hai, kyunki bahut zyada tokens se repair jaise kaam slow hote the.` },
    { type: 'callout', tone: 'term', title: 'Preference list', html: `<strong>Ye kya hai:</strong> kisi key ki <strong>N</strong> copies kahan rahengi (N = kitni copies; aam taur pe 3): coordinator, phir ring pe clockwise agle N-1 nodes. Is list ko <strong>preference list</strong> kehte hain. Vnodes ki wajah se agle do positions same physical machine ki ho sakti hain, to Dynamo list banate waqt aisi positions <strong>skip</strong> karta hai, taaki N copies N <em>alag</em> machines pe hon. Paper ke mutabik list ko alag data centers mein bhi phailaya jaata hai, taaki poora data center gire to bhi data bacha rahe.<br><strong>Kyun chahiye:</strong> ek machine ki disk kabhi bhi mar sakti hai; data teen alag machines pe ho to bhi bacha rahe.<br><strong>Iske bina:</strong> teeno "copies" ek hi machine ke teen vnodes pe ho sakti thi, aur ek machine girte hi teeno gayab.` },
    { type: 'p', html: `Khud chala ke dekho: machines aur vnodes badlo, key chuno, aur ek machine ko down karo. Ring yahan 0 se 359 tak hai (asli ring 2<sup>128</sup> ya 2<sup>160</sup> tak hota hai, idea same hai):` },
    { type: 'custom', render(el) {
      const COL = ['var(--accent)', 'var(--violet)', 'var(--green)', 'var(--amber)', 'var(--red)', 'var(--ink-2)'];
      const KEYS = ['cart:42', 'cart:7', 'user:riya', 'video:99'];
      const NAMES = ['A', 'B', 'C', 'D', 'E', 'F'];
      el.innerHTML = `<div class="row2">
          <div><label>Physical machines: <strong class="rg-mv"></strong></label><input class="rg-m" type="range" min="3" max="6" step="1" value="4"></div>
          <div><label>Vnodes per machine: <strong class="rg-vv"></strong></label><input class="rg-v" type="range" min="0" max="5" step="1" value="0"></div>
        </div>
        <div style="font-size:13px;color:var(--ink-2);margin-top:6px">Key:</div><div class="rg-k" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <div style="font-size:13px;color:var(--ink-2);margin-top:6px">Down machine (click karke toggle):</div><div class="rg-d" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <svg class="rg-svg" viewBox="0 0 300 300" style="width:100%;max-width:300px;height:auto;display:block;margin:10px auto" role="img" aria-label="Consistent hashing ring"></svg>
        <div class="stats">
          <div class="stat"><span>Key ka hash</span><strong class="rg-h"></strong></div>
          <div class="stat"><span>Preference list (N=3)</span><strong class="rg-p"></strong></div>
          <div class="stat"><span>Sabse bada / chhota hissa</span><strong class="rg-l"></strong></div>
        </div>
        <div class="calc-note rg-note"></div>`;
      const q = s => el.querySelector(s);
      let key = KEYS[0]; const down = new Set();
      const fnv = s => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } x ^= x >>> 16; x = Math.imul(x, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16; return (x >>> 0); };
      const chips = (box, list, isOn, click) => { box.innerHTML = ''; list.forEach(v => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (isOn(v) ? ' on' : ''); b.textContent = v; b.onclick = () => { click(v); upd(); }; box.appendChild(b); }); };
      const upd = () => {
        const M = +q('.rg-m').value, V = Math.pow(2, +q('.rg-v').value);
        q('.rg-mv').textContent = M; q('.rg-vv').textContent = V;
        [...down].forEach(d => { if (NAMES.indexOf(d) >= M) down.delete(d); });
        chips(q('.rg-k'), KEYS, k => k === key, k => { key = k; });
        chips(q('.rg-d'), NAMES.slice(0, M), n => down.has(n), n => { down.has(n) ? down.delete(n) : down.add(n); });
        const toks = [];
        for (let m = 0; m < M; m++) for (let v = 0; v < V; v++) toks.push({ m, pos: fnv('x' + NAMES[m] + '#' + v) % 3600 / 10 });
        toks.sort((a, b) => a.pos - b.pos || a.m - b.m);
        const share = new Array(M).fill(0);
        toks.forEach((t, i) => { const prev = toks[(i - 1 + toks.length) % toks.length].pos; share[t.m] += ((t.pos - prev + 360) % 360) || (toks.length === 1 ? 360 : 0); });
        const h = fnv(key) % 3600 / 10;
        let start = toks.findIndex(t => t.pos >= h); if (start < 0) start = 0;
        const pref = [], skipped = [], hinted = [];
        for (let i = 0; i < toks.length && pref.length < 3; i++) {
          const t = toks[(start + i) % toks.length];
          if (pref.some(p => p.m === t.m) || hinted.some(p => p.m === t.m)) { skipped.push(t); continue; }
          if (down.has(NAMES[t.m])) { hinted.push(t); continue; }
          pref.push(t);
        }
        const cx = 150, cy = 150, R = 110;
        const pt = (deg, r) => [cx + r * Math.sin(deg * Math.PI / 180), cy - r * Math.cos(deg * Math.PI / 180)];
        let svg = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="var(--line-2)" stroke-width="2"/>`;
        toks.forEach(t => { const [x, y] = pt(t.pos, R); const isP = pref.includes(t); const r0 = V >= 16 ? 3.5 : 6; svg += `<circle cx="${x}" cy="${y}" r="${isP ? 9 : r0}" fill="${down.has(NAMES[t.m]) ? 'var(--surface-2)' : COL[t.m]}" stroke="${isP ? 'var(--ink)' : 'var(--bg)'}" stroke-width="${isP ? 2.5 : 1}"/>`; if (V > 4 && !isP) return; const [lx, ly] = pt(t.pos, R + 18); svg += `<text x="${lx}" y="${ly + 4}" text-anchor="middle" font-size="11" fill="var(--ink-2)" font-family="var(--f-mono)">${NAMES[t.m]}</text>`; });
        const [kx, ky] = pt(h, R - 26); const [kx2, ky2] = pt(h, R - 6);
        svg += `<line x1="${kx}" y1="${ky}" x2="${kx2}" y2="${ky2}" stroke="var(--ink)" stroke-width="2"/><text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="12" fill="var(--ink)" font-family="var(--f-mono)">${key}</text><text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="11" fill="var(--ink-2)" font-family="var(--f-mono)">hash = ${h}</text>`;
        q('.rg-svg').innerHTML = svg;
        q('.rg-h').textContent = h;
        q('.rg-p').textContent = pref.map(p => NAMES[p.m]).join(', ') + (pref.length < 3 ? ' (sirf ' + pref.length + ')' : '');
        const mx = Math.max(...share), mn = Math.min(...share);
        q('.rg-l').textContent = Math.round(mx / 3.6) + '% / ' + Math.round(mn / 3.6) + '%';
        const parts = [];
        if (!pref.length) { q('.rg-note').textContent = 'Saari machines down hain: koi copy nahi rakh sakta. Asli cluster mein itne saare ek saath kam hi girte hain; isiliye copies alag racks aur data centers mein rakhte hain.'; return; }
        parts.push(`Hash ${h} se clockwise chale: pehli healthy machine ${NAMES[pref[0].m]} coordinator hai.`);
        if (skipped.length) parts.push(`${skipped.length} token(s) skip hue kyunki wo machine pehle se list mein thi (teen copies teen alag machines pe).`);
        if (hinted.length) parts.push(`${hinted.map(t => NAMES[t.m]).join(', ')} down hai, to list mein agli healthy machine aayi: wo copy "hint" ke saath rakhegi (sloppy quorum, aage dekhenge).`);
        const ideal = Math.round(100 / M);
        parts.push(V === 1 ? `Har machine ka sirf 1 token: hisse bahut asmaan (${Math.round(mx / 3.6)}% vs ${Math.round(mn / 3.6)}%, jabki barabar hota to ${ideal}%). Vnodes badhao.` : `${V} vnodes per machine: hisse ${Math.round(mx / 3.6)}% se ${Math.round(mn / 3.6)}% ke beech (barabar = ${ideal}%).` + (V < 32 ? ' Random tokens ko barabar hone ke liye kaafi saare chahiye.' : ' Ab lagbhag barabar.'));
        q('.rg-note').textContent = parts.join(' ');
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Default (4 machines, 1 vnode each) pe ek machine ke paas ring ka ~58% hai aur ek ke paas sirf ~5%. 4 vnodes pe 34% vs 14%, aur 16 vnodes pe 27% vs 24% (barabar = 25%). Jagah random chuni jaati hai, isliye vnodes badhane pe bhi kabhi kabhi thoda upar-neeche hota hai (32 pe 30% vs 20%); barabari ke liye bahut saare tokens chahiye. Isiliye Cassandra 2.x ka default 256 tha. Ek machine down karo: preference list mein agli healthy machine aa jaati hai. Ye "sloppy quorum" hai, jo agle hisse mein aata hai.` },
    { type: 'h3', text: '2. Copies aur quorum: N, R, W' },
    { type: 'callout', tone: 'term', title: 'N, R, W aur quorum', html: `<strong>Ye kya hai:</strong> <strong>N</strong> = har key ki kitni copies (replicas). <strong>W</strong> = write tab "safal" maana jaaye jab kam se kam W copies ne "likh liya" bola ho. <strong>R</strong> = read tab poora jab kam se kam R copies ne jawab diya ho. <em>Quorum</em> = itne votes jitne faisla lene ke liye kaafi hain.<br><strong>Kyun chahiye:</strong> saari N copies ka wait karna slow hai (sabse slow machine ka intezaar), aur ek bhi copy down ho to kuch na ho. W aur R chhote rakh ke speed aur availability milti hai. Agar <code>R + W &gt; N</code>, to jinse padha aur jinpe likha, un dono groups mein kam se kam ek copy common hoti hai, to read ko taaza write dikhta hai.<br><strong>Iske bina:</strong> ya to har baar saari copies ka wait (slow, ek failure = error), ya ek copy pe bharosa (purana data ya data loss).` },
    { type: 'p', html: `Quorum ki poori kahani aur ek bada lab <a href="#/consistency">Consistency models aur quorums</a> lesson mein hai. Paper ke mutabik Dynamo ke kai instances <strong>(N, R, W) = (3, 2, 2)</strong> chalaate the. Latency R (ya W) nodes mein se sabse slow wale se tay hoti hai, isliye R aur W aam taur pe N se chhote rakhe jaate hain. Chhota sa lab yahan:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>N (copies): <strong class="qm-nv"></strong></label><input class="qm-n" type="range" min="1" max="5" step="1" value="3"></div>
          <div><label>W (write ke liye haan): <strong class="qm-wv"></strong></label><input class="qm-w" type="range" min="1" max="5" step="1" value="2"></div>
          <div><label>R (read ke liye jawab): <strong class="qm-rv"></strong></label><input class="qm-r" type="range" min="1" max="5" step="1" value="2"></div>
          <div><label>Kitni copies down: <strong class="qm-dv"></strong></label><input class="qm-d" type="range" min="0" max="5" step="1" value="0"></div>
        </div>
        <div class="qm-box" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>
        <div class="stats">
          <div class="stat"><span>Write ho payega?</span><strong class="qm-wo"></strong></div>
          <div class="stat"><span>Read ho payega?</span><strong class="qm-ro"></strong></div>
          <div class="stat"><span>R + W &gt; N? (overlap)</span><strong class="qm-ov"></strong></div>
          <div class="stat"><span>Kitni copies gir sakti hain (write / read)</span><strong class="qm-tol"></strong></div>
        </div>
        <div class="calc-note qm-note"></div>`;
      const q = s => el.querySelector(s);
      const upd = () => {
        const N = +q('.qm-n').value;
        ['.qm-w', '.qm-r', '.qm-d'].forEach(c => { const i = q(c); i.max = c === '.qm-d' ? N : N; if (+i.value > N) i.value = N; });
        const W = +q('.qm-w').value, R = +q('.qm-r').value, D = +q('.qm-d').value, up = N - D;
        q('.qm-nv').textContent = N; q('.qm-wv').textContent = W; q('.qm-rv').textContent = R; q('.qm-dv').textContent = D;
        const ov = Math.max(0, R + W - N);
        let box = '';
        for (let i = 0; i < N; i++) {
          const isDown = i >= up, inW = i < W, inR = i >= N - R;
          box += `<div style="min-width:64px;padding:8px;border-radius:var(--r-sm);border:2px solid ${isDown ? 'var(--red)' : 'var(--line-2)'};background:${isDown ? 'var(--surface-2)' : 'var(--surface)'};text-align:center;font:13px var(--f-mono)">copy ${i + 1}<br>${isDown ? '<span style="color:var(--red)">down</span>' : (inW ? '<span style="color:var(--accent)">W</span> ' : '') + (inR ? '<span style="color:var(--green)">R</span>' : '') || '-'}</div>`;
        }
        q('.qm-box').innerHTML = box;
        const wo = up >= W, ro = up >= R;
        const set = (c, ok, t) => { const e = q(c); e.textContent = t; e.style.color = ok ? 'var(--green)' : 'var(--red)'; };
        set('.qm-wo', wo, wo ? 'haan' : 'nahi (strict quorum)');
        set('.qm-ro', ro, ro ? 'haan' : 'nahi');
        set('.qm-ov', R + W > N, R + W > N ? 'haan, ' + ov + ' common' : 'nahi');
        q('.qm-tol').textContent = (N - W) + ' / ' + (N - R);
        const notes = [];
        notes.push(R + W > N ? `R + W = ${R + W} > ${N}: write wali ${W} copies aur read wali ${R} copies mein kam se kam ${ov} common hai (dabbe mein W aur R dono wali). Read ko taaza version milega (agar sab healthy aur strict quorum).` : `R + W = ${R + W}, N = ${N} se zyada nahi: read aisi copies se ho sakta hai jinpe abhi naya write pahuncha hi nahi. Purana data mil sakta hai.`);
        if (!wo) notes.push(`Sirf ${up} copies zinda, W = ${W} chahiye: strict quorum mein write mana. Dynamo yahan sloppy quorum se ring ke agle healthy node pe copy rakh deta hai (neeche flow mein).`);
        if (W === N) notes.push('W = N: ek bhi copy down = write band. "Always writeable" ke ulta.');
        if (W === 1) notes.push('W = 1: tez, lekin wo ek copy write ke turant baad mar gayi to data gaya.');
        q('.qm-note').textContent = notes.join(' ');
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `(3, 2, 2) pe: ek copy down ho to bhi read aur write dono chalte hain, aur R + W = 4 &gt; 3. D = 2 karo: strict quorum mein dono band. Aaj ke systems yahi knobs dete hain. <strong>Riak</strong> docs: har request N, R, W choose kar sakti hai, aur ek extra <strong>DW</strong> ("durable write": kitni copies ne disk pe pakka likh liya). <strong>Cassandra</strong> docs: har query ka consistency level, jaise <code>ONE</code>, <code>QUORUM</code> (majority, yaani N/2 + 1), <code>ALL</code>, aur kai data centers ke liye <code>LOCAL_QUORUM</code> (sirf apne data center ki majority, taaki door ke data center ka wait na ho).` },
    { type: 'p', html: `Neeche ke flow mein teen naye tools aate hain. Pehle unhe seedhe shabdon mein:` },
    { type: 'callout', tone: 'term', title: 'Read repair', html: `<strong>Ye kya hai:</strong> read karte waqt coordinator R copies se jawab leta hai. Agar koi copy purani nikli, to wahin usko naya version bhej deta hai. "Padhte padhte theek karna."<br><strong>Kyun chahiye:</strong> W &lt; N hai, to kuch copies thodi der peeche reh jaati hain. Jo keys log padhte hain, wo apne aap theek ho jaati hain.<br><strong>Iske bina:</strong> peeche wali copy hamesha peeche rehti, jab tak koi aur background process na chale.` },
    { type: 'callout', tone: 'term', title: 'Sloppy quorum', html: `<strong>Ye kya hai:</strong> "strict" quorum mein sirf key ki apni N copies (preference list) vote kar sakti hain. <em>Sloppy</em> quorum mein list ke <strong>pehle N healthy</strong> nodes vote karte hain: koi down ho to ring pe agla zinda node uski jagah le leta hai.<br><strong>Kyun chahiye:</strong> Dynamo ka wada "always writeable" hai. Do copies down hon tab bhi cart update hona chahiye.<br><strong>Iske bina:</strong> W healthy copies na milein to write mana: customer ko "abhi nahi ho sakta".` },
    { type: 'callout', tone: 'term', title: 'Hinted handoff', html: `<strong>Ye kya hai:</strong> jo node kisi aur ki jagah copy rakhta hai, wo saath mein ek "hint" (parchi) rakhta hai: "ye asal mein C ki hai". C wapas aate hi wo copy C ko de deta hai aur apni mita deta hai.<br><strong>Kyun chahiye:</strong> sloppy quorum mein copies galat jagah chali gayi thi. Hint se wo apne asli ghar wapas pahunchti hain.<br><strong>Iske bina:</strong> C wapas aata to uske paas downtime ke saare writes missing hote. <strong>Cassandra</strong> docs: hints default <strong>3 ghante</strong> tak ki downtime ke liye bante hain (<code>max_hint_window</code>); usse lamba down raha to repair (Merkle trees, aage) chahiye.` },
    { type: 'p', html: `Ab ek key, preference list <strong>A, B, C</strong> (N = 3), aur ring pe agla node D. Saare scenarios chalao:` },
    { type: 'flow', height: 340, title: 'Ek key ki zindagi (N=3, R=2, W=2)',
      nodes: [
        { id: 'c', label: 'Client', sub: 'cart service', x: 80, y: 170, w: 120, kind: 'client', info: 'Ye kya hai: application jo store use karti hai (jaise xyz.com ka cart service). Dynamo mein client library khud bhi coordinator dhoondh sakti hai, ya Load Balancer kisi bhi node pe bhej deta hai jo aage forward karta hai.' },
        { id: 'a', label: 'Node A', sub: 'coordinator', x: 280, y: 170, w: 150, kind: 'data', info: 'Ye kya hai: is key ka coordinator, preference list mein pehla node. Write ka naya version (vector clock ke saath) banata hai, khud save karta hai, aur baaki N-1 ko bhejta hai. W jawab aate hi client ko success.' },
        { id: 'b', label: 'Node B', sub: 'replica', x: 530, y: 60, w: 150, kind: 'data', info: 'Ye kya hai: storage node, is key ki preference list mein doosra. Ek copy yahan rehti hai.' },
        { id: 'r', label: 'Node C', sub: 'replica', x: 530, y: 170, w: 150, kind: 'data', info: 'Ye kya hai: storage node, preference list mein teesra. Teesri copy yahan. Kabhi slow, kabhi down.' },
        { id: 'd', label: 'Node D', sub: 'ring pe agla', x: 530, y: 280, w: 150, kind: 'data', info: 'Ye kya hai: ring pe agla storage node, is key ki preference list ke top 3 mein nahi. Lekin jab top 3 mein se koi down ho, to D uski jagah copy rakhta hai, ek "hint" ke saath ki asal maalik kaun hai.' },
      ],
      edges: [{ a: 'c', b: 'a' }, { a: 'a', b: 'b' }, { a: 'a', b: 'r' }, { a: 'a', b: 'd', id: 'ad', hidden: true }, { a: 'd', b: 'r', id: 'dr', hidden: true, dashed: true }],
      scenarios: [
        { name: 'put (W=2)', steps: [
          { title: 'Write aaya', go: 'c>a', text: 'Cart mein ek item joda.', msg: 'put("cart:42", ctx, [phone, cover])' },
          { title: 'A khud save, B aur C ko bheja', after: { a: { sub: 'v2 saved' } }, parallel: true, go: ['a>b', 'a>r'], text: 'Coordinator ne naya version banaya, apne paas likha, aur dono replicas ko bheja.' },
          { title: 'B ka ack: W = 2 poora', go: 'res:b>a', after: { b: { sub: 'v2' }, r: { state: 'warn', sub: 'abhi v1 (slow)' } }, text: 'A (khud) + B = 2 acks. C abhi slow hai, uska wait nahi. Client ko success.' },
          { title: 'Client ko OK', go: 'res:a>c', text: 'W = 2 pe latency C jaise slow node se bachi rahi. C ko v2 thodi der mein pahunch jaayega.', msg: 'ok' },
        ]},
        { name: 'get (R=2) + read repair', steps: [
          { title: 'Read aaya', go: 'c>a', set: { b: { sub: 'v2' }, r: { state: 'warn', sub: 'v1 (purana)' } }, text: 'Cart dikhana hai.', msg: 'get("cart:42")' },
          { title: 'Do replicas se poochha', parallel: true, go: ['a>b', 'a>r', 'res:b>a', 'res:r>a'], text: 'B ne v2 diya, C ne v1. Vector clocks se A dekhta hai ki v2, v1 ke baad ka hai (v1 purana, phenk sakte hain).' },
          { title: 'Client ko naya, C ko theek', parallel: true, go: ['res:a>c', 'a>r'], after: { r: { state: 'ok', sub: 'v2 (repaired)' } }, text: 'Client ko v2. Saath mein A ne C ko v2 bhej diya. Isko <strong>read repair</strong> kehte hain: padhte waqt jo replica peeche mila, use wahin theek kar do.', msg: 'C ← v2   (read repair)' },
        ]},
        { name: 'C down: sloppy quorum', steps: [
          { title: 'C gira', set: { r: { state: 'down', sub: 'DOWN' } }, go: 'c>a', text: 'C temporarily down (maintenance, ya network). Strict quorum hota to sirf A + B bache: W = 2 abhi bhi mil jaata. Lekin agar B bhi down ho? Dynamo phir bhi write nahi rokta.' },
          { title: 'Copy D ko, hint ke saath', show: ['ad'], parallel: true, go: ['a>b', 'a>d'], after: { d: { state: 'warn', sub: 'hint: for C' } }, text: 'Dynamo ka <strong>sloppy quorum</strong>: preference list ke pehle N <em>healthy</em> nodes. C ki jagah D ne copy rakhi, metadata mein hint ke saath ki "ye asal mein C ki hai". D ise ek alag local store mein rakhta hai.' },
          { title: 'Write safal', parallel: true, go: ['res:b>a', 'res:d>a', 'res:a>c'], text: 'Teen copies phir bhi bani (A, B, D). Customer ko kabhi "cart update nahi ho sakta" nahi dikha.' },
        ]},
        { name: 'C wapas: hinted handoff', steps: [
          { title: 'C zinda hua', set: { r: { state: 'ok', sub: 'wapas, v1' }, d: { state: 'warn', sub: 'hint: for C' } }, show: ['dr'], focus: ['r'], text: 'D apne hinted store ko baar baar scan karta hai aur C ki health dekhta hai.' },
          { title: 'D ne copy lauta di', go: 'evt:d>r', after: { r: { sub: 'v2' }, d: { state: '', sub: 'ring pe agla' } }, text: '<strong>Hinted handoff</strong>: D ne C ki copy C ko pahuncha di, aur transfer safal hone pe apni local copy hata di. Total copies phir 3, sahi jagah pe.' },
          { title: 'Kab kaam nahi karta', focus: ['d'], text: 'Paper khud kehta hai: hinted handoff tab achha hai jab failures chhote hon aur membership kam badle. Agar D bhi C ke lautne se pehle mar gaya, to hint gaya. Iske liye agla tool: Merkle trees se anti-entropy.' },
        ]},
      ],
    },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "sloppy quorum mein bhi R + W > N = latest read"', html: `Nahi. Maan lo network do hisson mein toota: ek taraf write A aur D pe gaya (B, C us taraf se dikh hi nahi rahe the), aur doosri taraf kisi aur client ka read B aur C se hua. R + W = 4 &gt; 3, phir bhi dono sets mein ek bhi common node nahi, aur read ne purana data diya. Dynamo ne availability ke liye ye keemat jaan-boojh ke di; isliye usko versions ko sulajhaane ka tareeka bhi chahiye tha: vector clocks.` },
    { type: 'h3', text: '3. Do versions takraaye: vector clocks' },
    { type: 'p', html: `Problem: network toota, cart ki do copies pe alag alag badlaav hue. Ab kaunsa sahi? "Jiska timestamp bada, wo jeeta" (<strong>last write wins</strong>) aasaan hai, lekin ek "add to cart" chupchaap gayab ho sakta hai. Amazon ke liye ye manzoor nahi tha. Unhe ye pata karna tha ki do versions mein se <strong>ek doosre ke baad ka hai</strong>, ya dono <strong>alag alag shaakhaayein</strong> hain.` },
    { type: 'callout', tone: 'term', title: 'Vector clock', html: `<strong>Ye kya hai:</strong> har version ke saath ek chhoti list: <code>[(node, counter), ...]</code>, jaise "Sx ne 2 baar likha, Sy ne 1 baar". Jo node write sambhalta hai, wo list mein apna counter +1 karta hai. Ye ghadi ka time nahi, sirf "kisne kitni baar badla" ki ginti hai. Do lists compare karo: agar ek ke saare counters doosre se ≤ hain, to wo purana hai (phenk sakte ho). Agar kuch counters ek mein bade aur kuch doosre mein, to dono <strong>concurrent</strong> hain: kisi ne doosre ko nahi dekha.<br><strong>Kyun chahiye:</strong> ye pakka pata chalta hai ki ek version doosre ke <em>baad</em> ka hai ya dono alag shaakhaayein hain. Concurrent ho to store dono rakhta hai aur read pe client ko dono deta hai, koi badlaav chupchaap nahi khota.<br><strong>Iske bina:</strong> sirf timestamp dekhte (last write wins), aur servers ki ghadiyan thodi alag hone se ek "add to cart" chupchaap gayab ho sakta tha.` },
    { type: 'p', html: `Paper ka example, apne shabdon mein (Sx, Sy, Sz teen nodes hain):` },
    { type: 'ascii', text: `
D1 [Sx:1]                 client ne likha, Sx ne sambhala
 │
D2 [Sx:2]                 same client ne update kiya, phir Sx. D2 > D1
 ├──────────────────────┐
D3 [Sx:2, Sy:1]          D4 [Sx:2, Sz:1]
 (update, Sy ne likha)    (kisi aur client ne D2 padh ke update kiya, Sz ne likha)
 │                        │
 └──── D3 aur D4: concurrent! dono rakho ────┘
              │
   client ne dono padhe, merge kiya (cart = dono ke items), Sx ne likha
              │
D5 [Sx:3, Sy:1, Sz:1]     ab D5 sab se naya` },
    { type: 'custom', render(el) {
      const P = { D1: [1, 0, 0], D2: [2, 0, 0], D3: [2, 1, 0], D4: [2, 0, 1], D5: [3, 1, 1] };
      const N = ['Sx', 'Sy', 'Sz'];
      const row = (k) => `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0"><strong style="min-width:84px">Version ${k}</strong>` +
        N.map((n, i) => `<label style="display:flex;gap:4px;align-items:center;font:13px var(--f-mono)">${n}<input class="vc-${k}${i}" type="number" min="0" max="9" value="0" style="width:56px"></label>`).join('') + `</div>`;
      el.innerHTML = `<div style="font-size:14px;color:var(--ink-2)">Paper ke versions chuno (pehla click = P, doosra = Q), ya numbers khud badlo:</div>
        <div class="vc-pre" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"></div>${row('P')}${row('Q')}
        <div class="stats"><div class="stat"><span>P</span><strong class="vc-p"></strong></div><div class="stat"><span>Q</span><strong class="vc-q"></strong></div><div class="stat"><span>Rishta</span><strong class="vc-rel"></strong></div></div>
        <div class="calc-note vc-note"></div>`;
      const q = s => el.querySelector(s);
      let turn = 0;
      const setV = (k, v) => v.forEach((x, i) => { q(`.vc-${k}${i}`).value = x; });
      const get = k => N.map((_, i) => Math.max(0, Math.min(9, parseInt(q(`.vc-${k}${i}`).value, 10) || 0)));
      const txt = v => '[' + v.map((x, i) => x ? `${N[i]}:${x}` : '').filter(Boolean).join(', ') + ']';
      const pre = q('.vc-pre');
      Object.keys(P).forEach(name => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small ghost'; b.textContent = name + ' ' + txt(P[name]); b.onclick = () => { setV(turn ? 'Q' : 'P', P[name]); turn = 1 - turn; upd(); }; pre.appendChild(b); });
      const upd = () => {
        const a = get('P'), b = get('Q');
        const le = a.every((x, i) => x <= b[i]), ge = a.every((x, i) => x >= b[i]);
        q('.vc-p').textContent = txt(a); q('.vc-q').textContent = txt(b);
        let rel, note;
        if (le && ge) { rel = 'barabar'; note = 'Dono same version hain.'; }
        else if (le) { rel = 'Q naya hai'; note = 'P ke saare counters Q se chhote ya barabar: Q ne P ko "dekh" ke likha gaya. P phenk sakte hain (store khud kar leta hai, syntactic reconciliation).'; }
        else if (ge) { rel = 'P naya hai'; note = 'Q ke saare counters P se chhote ya barabar: Q purana, phenk sakte hain.'; }
        else { rel = 'concurrent (takraav)'; note = 'Kuch counter P mein bade, kuch Q mein. Kisi ne doosre ko nahi dekha. Store dono rakhega aur read pe client ko dono dega; client merge karke naya version likhega (semantic reconciliation).'; }
        const r = q('.vc-rel'); r.textContent = rel; r.style.color = rel.startsWith('concurrent') ? 'var(--red)' : 'var(--green)';
        q('.vc-note').textContent = note;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd));
      setV('P', P.D3); setV('Q', P.D4); upd();
    }},
    { type: 'p', html: `Kitni baar aisa takraav hota hai? Paper ne shopping cart service ko 24 ghante naapa: <strong>99.94%</strong> requests ko bilkul ek hi version mila. Divergent versions bahut kam bane, aur paper ke mutabik unki wajah failures kam, ek saath likhne wale clients (concurrent writers) zyada the. Ek aur practical baat: vector clock lamba na ho jaaye, isliye jab list mein pairs ek threshold (paper ka example: 10) se zyada hon, sabse purana pair hata diya jaata hai.` },
    { type: 'callout', tone: 'warn', title: 'Har Dynamo-jaisa store vector clocks nahi rakhta', html: `Cassandra ne Dynamo se ring, gossip, hinted handoff aur Merkle-tree repair liye, lekin versions ke liye <strong>last-write-wins timestamps</strong> rakhe (Cassandra docs). Simple hai, lekin concurrent writes mein ek chupchaap haar jaata hai. Paper bhi batata hai ki kuch Amazon services ne khud "last write wins" chuna tha. Faisla business ka hai: cart ke liye merge, profile photo ke liye LWW chalega.` },
    { type: 'p', html: `<strong>Riak</strong> ne Dynamo wala raasta zyada qareeb se pakda. Riak docs ke mutabik: agar bucket pe <code>allow_mult = true</code> ho, to concurrent writes pe Riak dono values rakhta hai, jinhe <strong>siblings</strong> kehte hain, aur app ko unhe sulajhaana padta hai (docs isi setting ki salah dete hain). <code>false</code> ho to timestamp se ek jeet-ta hai. Riak 2.0 se vector clocks ki jagah <strong>dotted version vectors</strong> (DVV) recommend karta hai: har value ke saath "kis update ne ise banaya" ka chhota nishaan, taaki duplicate siblings pehchaan ke hataaye ja sakein (warna bahut saare clients ek saath likhein to siblings ka dher, "sibling explosion", ban sakta hai).` },
    { type: 'h3', text: '4. Permanent failure: Merkle trees se anti-entropy' },
    { type: 'p', html: `Problem: hinted handoff chhoti outages ke liye hai. Agar hint wala node khud mar gaya, ya ek replica hafte bhar baad lauta, to wo bahut peeche hoga. Read repair sirf un keys ko theek karta hai jo koi padhta hai. Baaki keys ko kaun theek kare? Background mein replicas ko aapas mein milaana padega (<strong>anti-entropy</strong>). Lekin do replicas ke crores keys ek ek karke compare karna bahut data bhejna hai.` },
    { type: 'callout', tone: 'term', title: 'Anti-entropy aur Merkle tree', html: `<strong>Ye kya hai:</strong> <em>Anti-entropy</em> = background mein do replicas ko aapas mein milaa ke farak theek karna. <em>Merkle tree</em> = hashes ka ek ped. Sabse neeche (leaves) har key range ka hash (hash = data ka chhota fingerprint). Unke upar har node apne do bachchon ke hash ka hash. Sabse upar ek root hash. Do replicas ke root same = poora data same; ek bhi byte ka farak ho to root badal jaata hai. Farak ho to sirf un shaakhaon mein utro jinke hash alag hain.<br><strong>Kyun chahiye:</strong> crores keys ek ek karke bhejne ki jagah sirf kuch hashes bhej ke farak dhoondh lo.<br><strong>Iske bina:</strong> ya to replicas hamesha ke liye alag reh jaate (jo keys koi nahi padhta unka read repair kabhi nahi hota), ya poora data network pe compare karna padta.` },
    { type: 'image', src: 'assets/img/design-id-kv/hash-tree.png', alt: 'Merkle tree ka diagram: neeche chaar data blocks L1 se L4, unke upar har block ka hash, phir do do hashes ko jod ke Hash 0 aur Hash 1, aur sabse upar Top Hash', caption: 'Merkle (hash) tree: har data block ka hash neeche, do do hashes jod ke upar wala hash, aur sabse upar ek "Top Hash" (root). Kisi bhi block ka ek byte badla to us raaste ke saare hashes aur root badal jaate hain.', credit: { text: 'Azaghal (David Göthberg ki illustration pe based), Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Hash_Tree.svg', license: 'CC0' } },
    { type: 'p', html: `Dynamo mein har node apni har key range (ek vnode ki range) ka alag Merkle tree rakhta hai. Do replicas apne common ranges ke roots exchange karte hain, aur sirf alag shaakhaon mein neeche jaate hain. Khud dekho: replica B ki kuch ranges "kharab" karo aur gino kitne hash compare hue.` },
    { type: 'custom', render(el) {
      const LEAVES = 16;
      el.innerHTML = `<div style="font-size:14px;color:var(--ink-2)">Replica B ki kaunsi ranges peeche hain? (click karke toggle)</div>
        <div class="mk-chips" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px"></div>
        <svg class="mk-svg" viewBox="0 0 320 136" style="width:100%;max-width:560px;height:auto;margin-top:10px" role="img" aria-label="Merkle tree comparison"></svg>
        <div style="font-size:13px;color:var(--ink-2)"><span style="color:var(--red)">●</span> hash alag (neeche jao) &nbsp; <span style="color:var(--green)">●</span> hash same (yahin ruko) &nbsp; <span style="color:var(--ink-3)">●</span> dekhne ki zaroorat hi nahi</div>
        <div class="stats">
          <div class="stat"><span>Hash comparisons</span><strong class="mk-c"></strong></div>
          <div class="stat"><span>Ranges jo sync karni hain</span><strong class="mk-r"></strong></div>
          <div class="stat"><span>Bina tree: leaf hashes</span><strong class="mk-n"></strong></div>
        </div>
        <div class="calc-note mk-note"></div>`;
      const q = s => el.querySelector(s);
      const h = s => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0).toString(16).padStart(8, '0'); };
      const bad = new Set([5]);
      const build = side => { const lv = [[]]; for (let i = 0; i < LEAVES; i++) lv[0].push(h(`range${i}:v${side === 'B' && bad.has(i) ? 1 : 2}`)); while (lv[lv.length - 1].length > 1) { const p = lv[lv.length - 1], n = []; for (let i = 0; i < p.length; i += 2) n.push(h(p[i] + p[i + 1])); lv.push(n); } return lv.reverse(); };
      const upd = () => {
        const chips = q('.mk-chips'); chips.innerHTML = '';
        for (let i = 0; i < LEAVES; i++) { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (bad.has(i) ? ' on' : ''); b.textContent = 'r' + i; b.onclick = () => { bad.has(i) ? bad.delete(i) : bad.add(i); upd(); }; chips.appendChild(b); }
        const A = build('A'), B = build('B');
        const state = A.map(l => l.map(() => 'skip'));
        let comps = 0; const ranges = [];
        const walk = (d, i) => { comps++; const same = A[d][i] === B[d][i]; state[d][i] = same ? 'same' : 'diff'; if (same) return; if (d === A.length - 1) { ranges.push(i); return; } walk(d + 1, 2 * i); walk(d + 1, 2 * i + 1); };
        walk(0, 0);
        let svg = '';
        const pos = (d, i) => { const n = Math.pow(2, d), gap = 300 / n; return [10 + gap * (i + 0.5), 14 + d * 30]; };
        for (let d = 1; d < A.length; d++) for (let i = 0; i < A[d].length; i++) { const [x, y] = pos(d, i), [px, py] = pos(d - 1, i >> 1); svg += `<line x1="${px}" y1="${py}" x2="${x}" y2="${y}" stroke="var(--line-2)" stroke-width="1"/>`; }
        const col = s => s === 'same' ? 'var(--green)' : s === 'diff' ? 'var(--red)' : 'var(--surface-2)';
        for (let d = 0; d < A.length; d++) for (let i = 0; i < A[d].length; i++) { const [x, y] = pos(d, i), r = d === A.length - 1 ? 6 : 8; svg += `<circle cx="${x}" cy="${y}" r="${r}" fill="${col(state[d][i])}" stroke="var(--line-2)"/>`; }
        q('.mk-svg').innerHTML = svg;
        q('.mk-c').textContent = comps;
        q('.mk-r').textContent = ranges.length ? ranges.map(i => 'r' + i).join(', ') : 'koi nahi';
        q('.mk-n').textContent = LEAVES;
        q('.mk-note').textContent = !ranges.length ? 'Root hash same: ek hi comparison mein pata chal gaya ki dono replicas bilkul barabar hain. Ye sabse common case hai, aur sabse sasta.' : `${ranges.length} range(s) alag: ${comps} hash comparisons, aur sirf ${ranges.length} range(s) ka data bhejna padega. Asli system mein har leaf ke neeche hazaaron keys hoti hain, to bachat kai guna badi hai.` + (comps >= LEAVES ? ' Dhyaan do: jab bahut ranges alag hon, comparisons leaf count ke paas pahunch jaate hain. Tree sabse zyada tab bachata hai jab farak thoda ho, jo aam case hai.' : '');
      };
      upd();
    }},
    { type: 'p', html: `Ek range kharab ho to: root (1) + har level pe do bachche (4 levels × 2) = <strong>9 comparisons</strong>, 16 leaf hashes ki jagah. Sab theek ho to sirf 1. Trees jitne bade, bachat utni zyada. Paper ek nuksaan bhi batata hai: node aaye ya jaaye to bahut saari key ranges badalti hain aur trees dobara banane padte hain. Isliye baad mein Dynamo ne ring ko <strong>barabar size ke fixed partitions</strong> mein baanta (paper ki "strategy 3"), taaki ranges stable rahein.` },
    { type: 'p', html: `Aaj ke systems: <strong>Riak</strong> docs ke mutabik uska Active Anti-Entropy (AAE) Merkle trees ko <strong>disk pe</strong> rakhta hai (memory kam lage, restart ke baad dobara banane na padein), har naye write pe tree turant update karta hai, aur default hafte mein ek baar saare trees mita ke data se dobara banata hai, taaki disk ki chupi kharabi (silent corruption) bhi pakdi jaaye. <strong>Cassandra</strong> docs: read repair aur hinted handoff "best-effort" hain; pakki eventual consistency ke liye operator <em>repair</em> chalata hai, jisme replicas Merkle trees bana ke exchange karte hain aur alag ranges sync karte hain (poore data ka ya sirf kuch sub-ranges ka).` },
    { type: 'h3', text: '5. Kaun zinda hai, kaun ring mein hai: gossip' },
    { type: 'p', html: `Problem: koi master nahi hai jo sabko bataye ki ring mein kaunse nodes hain aur kaun kis range ka maalik hai. Phir bhi har node ko ye pata hona chahiye, warna wo request galat jagah bhejega.` },
    { type: 'callout', tone: 'term', title: 'Gossip protocol', html: `<strong>Ye kya hai:</strong> afwaah ki tarah: har node har thodi der (jaise har second) mein kisi <strong>random</strong> doosre node se baat karta hai aur dono apni jaankari (kaun ring mein hai, kaun zinda hai, kiske paas kaunse tokens hain) mila lete hain. Jaise school mein ek baat kuch hi "rounds" mein poori class tak pahunch jaati hai.<br><strong>Kyun chahiye:</strong> koi master nahi hai, phir bhi har node ko poore cluster ka naksha chahiye, taaki wo request sahi node pe bheje.<br><strong>Iske bina:</strong> ek central registry chahiye hoti, jo khud SPOF aur bottleneck ban jaati.` },
    { type: 'p', html: `Afwaah kitni tez phailti hai? Ek node ko pata chala "naya node X ring mein aaya". Har round (maan lo 1 second) mein jis jis ko pata hai, wo kuch random nodes ko bata deta hai. Simulator (seeded random, har baar same nateeja):` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Cluster mein nodes: <strong class="gs-nv"></strong></label><input class="gs-n" type="range" min="10" max="2000" step="10" value="100"></div>
          <div><label>Har round kitnon ko batata hai (fanout): <strong class="gs-fv"></strong></label><input class="gs-f" type="range" min="1" max="3" step="1" value="1"></div>
        </div>
        <svg class="gs-svg" viewBox="0 0 320 120" style="width:100%;max-width:560px;height:auto;margin-top:10px" role="img" aria-label="Har round ke baad kitne nodes ko pata hai"></svg>
        <div class="stats">
          <div class="stat"><span>Sabko pata chalne mein rounds</span><strong class="gs-r"></strong></div>
          <div class="stat"><span>Aadhe ko pata chalne mein</span><strong class="gs-h"></strong></div>
          <div class="stat"><span>log2(nodes)</span><strong class="gs-l"></strong></div>
          <div class="stat"><span>Kul messages</span><strong class="gs-m"></strong></div>
        </div>
        <div class="calc-note gs-note"></div>`;
      const q = s => el.querySelector(s);
      const sim = (n, f) => {
        let seed = 42 + n * 7 + f; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
        const know = new Uint8Array(n); know[0] = 1; let cnt = 1, rounds = 0, msgs = 0; const hist = [1];
        while (cnt < n && rounds < 200) {
          const now = []; for (let i = 0; i < n; i++) if (know[i]) now.push(i);
          now.forEach(i => { for (let k = 0; k < f; k++) { let j = Math.floor(rnd() * (n - 1)); if (j >= i) j++; msgs++; if (!know[j]) { know[j] = 2; } } });
          cnt = 0; for (let i = 0; i < n; i++) { if (know[i]) { know[i] = 1; cnt++; } }
          rounds++; hist.push(cnt);
        }
        return { rounds, msgs, hist };
      };
      const upd = () => {
        const n = +q('.gs-n').value, f = +q('.gs-f').value;
        q('.gs-nv').textContent = n; q('.gs-fv').textContent = f;
        const r = sim(n, f);
        const half = r.hist.findIndex(c => c >= n / 2);
        q('.gs-r').textContent = r.rounds; q('.gs-h').textContent = half; q('.gs-l').textContent = Math.log2(n).toFixed(1);
        q('.gs-m').textContent = r.msgs.toLocaleString('en-US');
        const bw = 300 / r.hist.length;
        q('.gs-svg').innerHTML = r.hist.map((c, i) => { const hgt = 90 * c / n; return `<rect x="${10 + i * bw}" y="${100 - hgt}" width="${Math.max(bw - 2, 1)}" height="${hgt}" fill="${c === n ? 'var(--green)' : 'var(--accent)'}"/>`; }).join('') + `<line x1="10" y1="100" x2="310" y2="100" stroke="var(--line-2)"/><text x="10" y="114" font-size="9" fill="var(--ink-2)" font-family="var(--f-mono)">round 0</text><text x="310" y="114" text-anchor="end" font-size="9" fill="var(--ink-2)" font-family="var(--f-mono)">round ${r.rounds}</text>`;
        q('.gs-note').textContent = `${n} nodes, fanout ${f}: ${r.rounds} rounds mein sabko pata chal gaya. Shuru mein dheere (1, 2, 4...), beech mein bahut tez (har round ginti lagbhag dugni), aakhir mein phir dheere (aakhri kuch nodes tak random pahunchna mushkil). Nodes 10 guna karo: rounds bas thode se badhte hain. Isliye gossip hazaaron nodes tak scale karta hai.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Default (100 nodes, fanout 1): <strong>11 rounds</strong> mein sabko pata. 1,000 nodes: 17 rounds; 2,000 nodes: 19. Nodes 10 guna hue, rounds sirf ~6 badhe (log ki tarah badhta hai). Fanout 2 karo to 1,000 nodes 10 rounds mein. <strong>Cassandra</strong> docs ke mutabik har node har second: apni "heartbeat" (main zinda hoon) ginti badhata hai, ek random node se gossip karta hai, kabhi kabhi kisi unreachable node se bhi koshish karta hai, aur zaroorat ho to ek seed node se. Kaun "down" hai, ye faisla har node khud ek <strong>Phi Accrual failure detector</strong> se karta hai: kisi node ki heartbeat badhni band ho jaaye to dheere dheere uske down hone ka shak badhta hai, aur ek hadd ke baad use down maan liya jaata hai. <strong>Riak</strong> docs: jab koi node ring pe apna hissa badalta hai, wo gossip se sabko batata hai, aur nodes samay samay pe apni jaankari dobara announce karte hain taaki chhoota hua update bhi pahunch jaaye.` },
    { type: 'steps', items: [
      { t: 'Node jodna: explicit', d: 'Paper ke mutabik Amazon mein node outages aksar temporary hoti hain, isliye ek node ka chup ho jaana "ring se nikal gaya" nahi maana jaata. Admin command line ya browser se ek node ko batata hai "X ko ring mein jodo/hatao". Wo node ye badlaav apne persistent store mein likhta hai.' },
      { t: 'Gossip se phailna', d: 'Har node har second ek random peer chunta hai aur dono apni membership history mila lete hain. Tokens (kaun node ring pe kahan) bhi isi baatcheet mein phailte hain. Isliye har node khud jaanta hai ki kisi key ke liye kis node ke paas jaana hai.' },
      { t: 'Seeds', d: 'Agar admin ne A ko aur B ko alag alag joda, to shuru mein dono ek doosre ko nahi jaante: ring do tukdon mein bat sakti hai. Iske liye kuch nodes "seeds" hain jinhe sab jaante hain (static config ya config service se). Sab aakhir mein seed se milte hain, to tukde jud jaate hain.' },
      { t: 'Failure detection: local', d: 'Node A ko B jawab nahi de raha, to A apne liye B ko "down" maanta hai aur uski jagah doosre nodes use karta hai, aur thodi thodi der mein B ko check karta rehta hai. Ye global faisla nahi hai; har node apni nazar se dekhta hai. Permanent hatana sirf admin ke explicit command se.' },
    ]},
    { type: 'p', html: `Naya node X ring mein aata hai to wo kuch ranges ka maalik banta hai, aur jin nodes ke paas wo ranges thi wo X ko keys transfer karte hain (paper mein ek confirmation round ke saath, taaki duplicate transfer na ho). Vnodes ki wajah se ye load bahut saare nodes se thoda thoda aata hai.` },

    { type: 'h3', text: '6. Ek node ke andar: LSM storage' },
    { type: 'p', html: `Ab tak hum nodes ke beech ki baat kar rahe the. Ek node apni disk pe data kaise rakhta hai? Paper ke mutabik har storage node ke teen hisse hain: request coordination, membership + failure detection, aur ek local <strong>storage engine</strong> (wo hissa jo disk pe data likhta aur padhta hai). Dynamo mein ye <strong>pluggable</strong> tha (badla ja sakta tha): zyaadatar production instances Berkeley DB (BDB) Transactional Data Store chalaate the, aur badi values ke liye MySQL bhi option tha. Har request ke liye coordinator ek chhoti state machine chalata hai: nodes ko bhejo, jawab ka wait, retries, aur read ke baad zaroorat ho to read repair.` },
    { type: 'p', html: `Aaj ke Dynamo-style stores mein sabse common engine <strong>LSM tree</strong> hai. Cassandra ke docs ke mutabik uska storage engine LSM pe bana hai, aur wo "write-heavy" (bahut saare writes wale) kaam ke liye optimize hai. "Always writeable" store ke liye ye bilkul fit hai. (B-tree se comparison aur andar ki detail <a href="#/db-internals">Database internals</a> lesson mein.)` },
    { type: 'callout', tone: 'term', title: 'LSM tree (Log-Structured Merge tree)', html: `<strong>Ye kya hai:</strong> data likhne ka ek tareeka jisme disk pe kabhi purani jagah badli nahi jaati, sirf naya data <em>aage jodte</em> hain. Paanch hisse: (1) <strong>Commit log</strong>: har write pehle disk pe ek lambi diary ke aakhir mein likha jaata hai (write-ahead log). (2) <strong>Memtable</strong>: RAM mein ek sorted table jisme naye writes jaate hain. (3) <strong>SSTable</strong> (Sorted String Table): memtable bhar jaaye to wo disk pe ek sorted file ban ke "flush" hoti hai; ye file phir kabhi nahi badalti. (4) <strong>Compaction</strong>: background mein kai chhoti SSTables ko jod ke ek badi file, purane versions aur deleted data hata ke. (5) <strong>Bloom filter</strong>: har SSTable ke saath ek chhota filter jo batata hai "ye key is file mein <em>pakka nahi</em> hai" ya "shayad hai".<br><strong>Kyun chahiye:</strong> disk pe sequential (aage aage) likhna random jagah badalne se bahut tez hai. Write ke raaste mein koi padhna nahi.<br><strong>Iske bina (B-tree mein):</strong> har write disk pe sahi jagah dhoondh ke badalta hai: random disk access, writes slow.` },
    { type: 'flow', height: 330, title: 'Ek node ke andar: LSM write aur read',
      nodes: [
        { id: 'rq', label: 'Request', sub: 'put / get', x: 90, y: 165, w: 130, kind: 'client', info: 'Ye kya hai: coordinator se is node tak aaya hua read ya write (jaise put("cart:42") ya get("cart:42")).' },
        { id: 'cl', label: 'Commit log', sub: 'disk, append-only', x: 310, y: 50, w: 160, kind: 'data', info: 'Ye kya hai: disk pe ek lambi diary. Har write pehle iske aakhir mein juda jaata hai. Yahan kyun: RAM crash mein mit jaati hai; ye diary dobara padh ke memtable wapas banaya jaata hai. Cassandra docs: default "periodic" mode mein write turant ack hota hai aur diary har 10 second disk pe pakki (fsync) hoti hai, to crash mein utna tak ka data ja sakta hai; "batch" mode mein pakka hone ke baad hi ack.' },
        { id: 'mt', label: 'Memtable', sub: 'RAM, sorted', x: 310, y: 280, w: 160, kind: 'cache', info: 'Ye kya hai: RAM mein ek sorted table jisme naye writes jaate hain. Yahan kyun: RAM mein likhna bahut tez; aur taaza data ke reads bhi yahin se, bina disk ke. Ek limit pe bhar ke disk pe flush hoti hai.' },
        { id: 'bf', label: 'Bloom filters', sub: 'har SSTable ka 1', x: 560, y: 50, w: 170, kind: 'cache', info: 'Ye kya hai: har SSTable ke saath ek chhota bit-array. Poochho "cart:42 is file mein hai?": jawab "pakka nahi" ya "shayad haan". Yahan kyun: jin files mein key pakka nahi, unhe disk se padhna hi nahi padta. Detail <a href="#/ds-for-scale">Data structures for scale</a> lesson mein.' },
        { id: 'ss', label: 'SSTables', sub: 'disk, kabhi nahi badalti', x: 560, y: 280, w: 180, kind: 'data', info: 'Ye kya hai: disk pe sorted files, jo memtable flush se banti hain aur phir kabhi badalti nahi. Ek key ke purane aur naye versions alag alag files mein ho sakte hain; compaction unhe jodta hai.' },
      ],
      edges: [{ a: 'rq', b: 'cl' }, { a: 'rq', b: 'mt' }, { a: 'mt', b: 'ss' }, { a: 'rq', b: 'bf', id: 'rb', hidden: true }, { a: 'bf', b: 'ss', id: 'bs', hidden: true }, { a: 'cl', b: 'mt', id: 'cm', hidden: true, dashed: true }],
      scenarios: [
        { name: 'Write', steps: [
          { title: 'Pehle diary mein', go: 'rq>cl', after: { cl: { sub: '+ cart:42 v3' } }, text: 'Write sabse pehle commit log ke aakhir mein juda. Aage aage likhna (sequential) disk pe sabse tez kaam hai.', msg: 'append: cart:42 = [phone, cover, case]' },
          { title: 'Phir memtable mein', go: ['rq>mt', 'res:mt>rq'], after: { mt: { sub: 'cart:42 v3 (RAM)' } }, text: 'Phir RAM ki sorted table mein. Bas. Disk pe kuch dhoondhna nahi pada, isliye write bahut tez. Coordinator ko "likh liya".', msg: 'ack' },
        ]},
        { name: 'Flush', steps: [
          { title: 'Memtable bhar gaya', set: { mt: { state: 'hot', sub: 'full (limit)' } }, focus: ['mt'], text: 'Memtable ek tay limit tak bhar gaya (ya commit log bahut bada ho gaya).' },
          { title: 'Disk pe nayi SSTable', go: 'evt:mt>ss', after: { mt: { state: '', sub: 'khaali, naya' }, ss: { state: 'ok', sub: '+1 file (sorted)' }, cl: { sub: 'purana hissa mitaya' } }, text: 'Memtable sorted order mein disk pe ek nayi SSTable ban gaya. Ab commit log ka wo hissa zaroori nahi, mita diya jaata hai.' },
        ]},
        { name: 'Read', steps: [
          { title: 'Pehle memtable', go: ['rq>mt', 'res:mt>rq'], set: { mt: { state: 'miss', sub: 'cart:42 nahi' } }, text: 'Sabse taaza data memtable mein hota hai. Yahan nahi mila.', msg: 'get("cart:42")' },
          { title: 'Bloom filters se poochho', show: ['rb', 'bs'], go: ['rq>bf', 'res:bf>rq'], after: { bf: { sub: '4 mein se 3: pakka nahi' } }, text: '4 SSTables hain. Unke bloom filters ne kaha: 3 files mein key pakka nahi, 1 mein shayad. Disk se sirf 1 file padhni hai, 4 nahi.' },
          { title: 'Sirf ek file padho', go: ['bf>ss', 'res:ss>bf>rq'], after: { ss: { state: 'hit', sub: 'file 2 se mila' } }, text: 'Mil gaya. LSM ki keemat yahi hai: read ko kai jagah dekhna pad sakta hai (memtable + kai files). Bloom filters aur compaction is keemat ko chhota rakhte hain.' },
        ]},
        { name: 'Crash', steps: [
          { title: 'Node crash', set: { mt: { state: 'down', sub: 'RAM gayi' } }, focus: ['mt'], text: 'Bijli gayi, process mara. Memtable RAM mein tha, wo mit gaya. Jo writes abhi flush nahi hue the, unka kya?' },
          { title: 'Diary se wapas', show: ['cm'], go: 'evt:cl>mt', after: { mt: { state: 'ok', sub: 'replay se wapas' } }, text: 'Restart pe node commit log dobara padhta hai (replay) aur memtable wapas bana leta hai. Jo write ack hua tha aur diary mein pakka tha, wo bach gaya.' },
        ]},
        { name: 'Compaction', steps: [
          { title: 'Bahut saari files', set: { ss: { state: 'warn', sub: '12 files, purane versions' } }, focus: ['ss'], text: 'Har flush ek nayi file. Ek key ke purane versions aur deleted keys ke "tombstones" (mitaane ke nishaan) bhi files mein pade hain. Reads ko zyada files dekhni padti hain.' },
          { title: 'Jodo aur saaf karo', after: { ss: { state: 'ok', sub: '3 badi files' } }, focus: ['ss'], text: 'Background compaction kai files ko merge-sort karke nayi file likhta hai, purane versions aur deletes hata ke, phir purani files mitata hai. Keemat (Cassandra docs): ek hi data kai baar dobara likha jaata hai, jise <strong>write amplification</strong> kehte hain, aur ye background disk I/O badhata hai.' },
        ]},
      ],
    },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "LSM mein delete turant data mita deta hai"', html: `Nahi. SSTables kabhi nahi badalti, to delete bhi ek naya write hai: ek <strong>tombstone</strong> ("ye key mit chuki hai" ka nishaan). Asli data compaction mein hi hatta hai. Dynamo-style store mein ye aur zaroori hai: agar tombstone sab replicas tak pahunchne se pehle hata diya, to koi purana replica mita hua data "zinda" karke wapas phaila sakta hai.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "DynamoDB = Dynamo paper"', html: `Naam milta hai, design nahi. AWS ki 2022 ki USENIX paper ke mutabik <strong>DynamoDB</strong> (managed service) mein har partition ke replicas ek <strong>replication group</strong> banaate hain jo Multi-Paxos (ek consensus algorithm, jisse machines vote karke ek leader chunti hain; <a href="#/consensus">Consensus</a> lesson) se leader chunte hain: writes leader ke through, strongly consistent reads possible. Yaani leaderless nahi. 2007 ka Dynamo andar ka system tha. Dynamo-style leaderless design aaj Cassandra aur Riak jaise systems mein dikhta hai.` },
    { type: 'h2', text: 'Kya kya toot sakta hai' },
    { type: 'table', head: ['Failure', 'KV store kya karta hai', 'Keemat'], rows: [
      ['Ek node kuch minute down', 'Sloppy quorum: agla healthy node copy rakhta hai, hint ke saath; wapas aane pe hinted handoff', 'Thodi der copies "galat" jagah; read purana mil sakta hai'],
      ['Node hafte bhar down / disk gayi', 'Merkle tree anti-entropy background mein sync karta hai', 'Background network aur disk load'],
      ['Poora data center gaya', 'Preference list kai data centers mein, to doosre DC ki copies kaam karti hain', 'Cross-DC replication ka kharcha aur latency'],
      ['Network partition', 'Dono taraf writes chalte rehte hain; vector clocks se concurrent versions pakde jaate hain', 'Client ko merge karna padta hai (complexity app mein)'],
      ['Hot key', 'Ek key ke saare reads/writes usi N nodes pe', 'Vnodes yahan madad nahi karte; app-level cache ya key ko tod ke rakho'],
      ['ID server ki ghadi peeche', 'Generator ID dena rokta hai, client doosre server pe', 'Kuch ms ka error; alert'],
      ['Do ID servers ko same number', 'Duplicate IDs (sabse khatarnak)', 'Lease + DB primary key aakhri suraksha'],
      ['Node crash (RAM ka memtable gaya)', 'Commit log replay se memtable wapas', 'Periodic sync mein aakhri kuch second ka ack hua data ja sakta hai; baaki replicas pe copy bachi hai'],
      ['Delete ke baad replica lamba down', 'Tombstone hatne ke baad lauta replica mita hua data wapas phaila sakta hai', 'Tombstones kuch din rakho aur us se pehle repair zaroor chalao'],
      ['Bahut saari SSTables', 'Reads slow (kai files dekhni padti hain)', 'Compaction (background disk I/O ki keemat), bloom filters'],
    ]},

    { type: 'callout', tone: 'why', title: 'Decide', html: `<strong>IDs:</strong> time-sorted chahiye (feeds, messages)? Snowflake ya UUIDv7 (time-ordered UUID). Bas unique chahiye? UUIDv4 (random UUID). Machines kam hon to service, bahut zyada aur autoscaling ho to soch ke library (machine ID management mushkil). <strong>KV store:</strong> simple key lookup bahut bade scale pe, aur "hamesha writeable" business ke liye zaroori? Dynamo-style leaderless (Cassandra jaisa), (3,2,2). Strong consistency chahiye? Leader-based replication (jaise DynamoDB ka Multi-Paxos per partition). Interview mein dono raaste aur unki keemat bolo.` },

    { type: 'h2', text: 'Interview mein kaise bolein' },
    { type: 'steps', items: [
      { t: 'ID generator', d: 'Requirements (64-bit, time-sorted, uncoordinated). Snowflake 41/10/12, bits ka budget, service vs library, machine ID lease, clock backwards pe mana, batch IDs.' },
      { t: 'KV: API aur requirements', d: 'get/put, always writeable ya consistent? p99.9 latency. Ye ek sawaal poora design badal deta hai.' },
      { t: 'Partitioning', d: 'Consistent hashing + vnodes, preference list alag machines aur DCs mein.' },
      { t: 'Replication', d: 'N/R/W, (3,2,2) common; R + W > N ka matlab aur sloppy quorum mein uski seema.' },
      { t: 'Conflicts', d: 'Vector clocks + client merge, ya LWW agar data loss chalta hai.' },
      { t: 'Failures', d: 'Hinted handoff (temporary), read repair (padhte waqt), Merkle trees (background), gossip + seeds (membership).' },
      { t: 'Storage', d: 'Har node pe LSM: commit log + memtable (tez writes), SSTables + bloom filters (reads), compaction (safai), tombstones (deletes).' },
    ]},

    { type: 'diagram', title: 'Poora design, ek nazar mein', height: 560,
      groups: [
        { label: 'Apps', x: 150, y: 8, w: 220, h: 92 },
        { label: 'ID generator', x: 10, y: 140, w: 200, h: 250 },
        { label: 'KV store: barabar nodes ki ring', x: 290, y: 140, w: 422, h: 395 },
      ],
      nodes: [
        { id: 'svc', label: 'xyz.com services', sub: 'posts, cart', x: 260, y: 55, w: 200, kind: 'client', info: 'Ye kya hai: xyz.com ki services (posts, chat, cart). Naye post ke liye ID maangti hain, aur cart jaisa data KV store mein rakhti hain.' },
        { id: 'idgen', label: 'ID servers', sub: 'Snowflake 41/10/12', x: 110, y: 200, w: 170, kind: 'server', info: 'Ye kya hai: Snowflake jaise ID generators, kai copies, kai data centers mein. Har ID = time + machine number + sequence. Aapas mein koi baat nahi; ghadi peeche jaaye to ID dena rok dete hain.' },
        { id: 'reg', label: 'Worker registry', sub: 'etcd / ZooKeeper', x: 110, y: 340, w: 170, kind: 'net', info: 'Ye kya hai: coordination store jahan se har ID server startup pe apna machine number lease pe leta hai, taaki do servers ko kabhi same number na mile.' },
        { id: 'co', label: 'Coordinator', sub: 'pref list + vector clock', x: 400, y: 200, w: 190, kind: 'server', info: 'Ye kya hai: key ke hash se ring pe pehla healthy node. Write pe naya version (vector clock) banata hai, N copies ko bhejta hai, W acks pe OK. Read pe R jawab leta hai, conflict ho to dono versions deta hai, aur read repair karta hai.' },
        { id: 'na', label: 'Replica B', sub: 'copy 2', x: 625, y: 170, w: 150, kind: 'data', info: 'Ye kya hai: preference list ka doosra node (alag physical machine). Key ki ek copy yahan.' },
        { id: 'nb', label: 'Replica C', sub: 'copy 3, kabhi down', x: 625, y: 300, w: 150, kind: 'data', info: 'Ye kya hai: preference list ka teesra node. Down ho to sloppy quorum mein D uski jagah leta hai; lautne pe hinted handoff, aur lamba down rahe to Merkle repair.' },
        { id: 'nd', label: 'Node D', sub: 'hint: for C', x: 625, y: 430, w: 150, kind: 'data', info: 'Ye kya hai: ring pe agla node. C down tha to C ki copy hint ke saath yahan rakhi (sloppy quorum). C wapas aate hi copy lauta deta hai (hinted handoff).' },
        { id: 'lsm', label: 'LSM storage', sub: 'log, memtable, SSTables', x: 400, y: 340, w: 190, kind: 'data', info: 'Ye kya hai: har node ke andar ka storage engine. Write: commit log + memtable (tez). Flush se SSTables, bloom filters se reads, compaction se safai, deletes = tombstones.' },
        { id: 'gos', label: 'Gossip + seeds', sub: 'kaun zinda, kaun kahan', x: 380, y: 490, w: 170, kind: 'net', info: 'Ye kya hai: har node har second ek random node se cluster ki jaankari milata hai (membership, tokens, heartbeats). Seeds se naye nodes judte hain. Har node khud tay karta hai kaun down hai (Cassandra: Phi Accrual detector).' },
      ],
      edges: [
        { a: 'svc', b: 'idgen', n: 1, label: 'next_id()' },
        { a: 'idgen', b: 'reg', dashed: true, label: 'lease' },
        { a: 'svc', b: 'co', n: 2, label: 'put / get' },
        { a: 'co', b: 'na', n: 3 },
        { a: 'co', b: 'nb' },
        { a: 'co', b: 'nd', dashed: true },
        { a: 'co', b: 'lsm', label: 'local write' },
        { a: 'nd', b: 'nb', kind: 'evt', label: 'handoff' },
        { a: 'na', b: 'nb', kind: 'evt', dashed: true, both: true, label: 'Merkle repair' },
        { a: 'gos', b: 'nd', kind: 'evt', both: true, label: 'gossip' },
        { a: 'co', b: 'gos', kind: 'evt', dashed: true, both: true, via: [[290, 250], [290, 490]] },
      ],
      paths: [
        { name: 'Generate ID', text: 'Startup pe ID server registry se apna machine number lease pe leta hai. Phir har next_id() bina kisi se poochhe: time + machine + sequence. ~1 ms, network call ke saath.', go: ['svc>idgen>reg'] },
        { name: 'Write key', text: 'put(cart:42) → coordinator (hash se ring pe) → naya vector clock version → apni LSM storage (commit log + memtable) + B aur C ko bhejo → W = 2 acks pe client ko OK.', go: ['svc>co>na', 'co>nb', 'co>lsm'] },
        { name: 'Read with quorum', text: 'get(cart:42) → coordinator R = 2 replicas se poochhta hai → purane versions hatao, concurrent ho to dono client ko → peeche wali copy ko read repair.', go: ['svc>co>na', 'co>nb'] },
        { name: 'Node fails', text: 'C down → gossip/failure detector se pata → sloppy quorum: copy D pe hint ke saath → C lauta to hinted handoff → lamba down raha to B aur C Merkle trees se sync.', go: ['co>nd>nb', 'na>nb', 'gos>nd'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li><strong>Snowflake ID</strong> = time (41) + machine (10) + sequence (12) bits: har server khud ID banata hai, IDs lagbhag time-sorted, ~70 saal, 1,024 machines.</li>
      <li>Machine number <strong>lease</strong> se unique; ghadi peeche jaaye to generator ruk jaata hai.</li>
      <li>KV store: <strong>consistent hashing + vnodes</strong> se data baanto; preference list mein N <em>alag</em> machines.</li>
      <li><strong>N/R/W</strong>: (3, 2, 2) common; R + W &gt; N = overlap, lekin sloppy quorum mein ye guarantee toot sakti hai.</li>
      <li>Conflicts: <strong>vector clocks</strong> (Dynamo, Riak siblings/DVV) ya <strong>last-write-wins</strong> (Cassandra).</li>
      <li>Failures: <strong>hinted handoff</strong> (chhoti), <strong>read repair</strong> (padhte waqt), <strong>Merkle anti-entropy</strong> (background, lambi).</li>
      <li><strong>Gossip</strong> se membership, koi master nahi; seeds se naye nodes judte hain.</li>
      <li>Har node pe <strong>LSM</strong>: commit log + memtable (tez writes), SSTables + bloom filters, compaction, tombstones.</li>
    </ul>` },

    { type: 'tradeoffs', gains: ['Snowflake: koi coordination nahi, har machine lakhon IDs/second, time-sorted', 'Consistent hashing + vnodes: node jodna/hatana sasta, load barabar', 'Sloppy quorum + hinted handoff: writes kabhi nahi rukte', 'Vector clocks: koi "add to cart" chupchaap gayab nahi', 'Merkle trees: replicas ko milaane mein bahut kam data', 'Gossip: koi master nahi, koi SPOF nahi', 'LSM storage: bahut tez writes'], costs: ['IDs sirf "roughly" sorted; clock skew ka dhyaan', 'Eventual consistency: purana read possible', 'Client ko conflicting versions merge karne padte hain', 'Hinted handoff aur anti-entropy ka background load', 'Debug karna mushkil: koi ek jagah "sach" nahi', 'Multi-key transactions nahi', 'LSM: reads kai files dekhte hain, compaction data dobara likhta hai (write amplification)'] },

    { type: 'think', questions: [
      { q: 'xyz.com ka "likes count" Dynamo-style store mein hai. Do log ek saath like karte hain, alag partitions ki taraf. Vector clocks ke saath client merge kaise karega? LWW mein kya hoga?', a: 'Agar value sirf ek number hai (count = 10), to merge mein pata nahi chalta kaun se likes alag the: dono versions 11 kehte hain. LWW mein bhi 11, ek like gaya. Sahi tareeka: value mein "kis user ne like kiya" ka set rakho (ya har node ka alag counter, jaise CRDT counter), merge = union/sum. Ye dikhata hai ki conflict resolution data ke structure pe nirbhar hai.' },
      { q: 'N = 3, W = 1, R = 1. Kya faayda, kya nuksaan?', a: 'Faayda: sabse kam latency aur sabse zyada availability (ek bhi node zinda ho to write). Nuksaan: R + W = 2, N se kam, to read aksar purana data de sakta hai; aur write sirf ek node pe hone ke baad wo node mar jaaye to data gaya. Paper bhi kehta hai ki zyaadatar production services W ko 1 se bada rakhti thi durability ke liye.' },
      { q: 'Ek user ne cart se item delete kiya. Replica C us waqt 2 hafte ke liye down tha, aur baaki replicas ne compaction mein tombstone hata diya. C wapas aaya. Kya ho sakta hai, aur kaise bachoge?', a: 'C ke paas item abhi bhi hai, aur baaki pe na data hai na tombstone. Anti-entropy ko lagega C ke paas "naya" data hai aur wo item doosre replicas pe wapas phaila dega: mita hua item zinda. Bachaav: tombstones ko kuch din (lambi outage se zyada) rakho, aur us waqt ke andar repair zaroor chalao; bahut lamba down raha node ko seedha wapas mat jodo, pehle saaf karke dobara bootstrap karo.' },
      { q: 'Snowflake service ko 5 data centers aur har DC mein 50 servers chahiye. 41/10/12 layout mein 5 bits DC + 5 bits worker kaafi hai? Kya badloge?', a: '5 bits DC = 32 data centers (5 kaafi), 5 bits worker = 32 servers per DC (50 nahi aate). Option: 3 bits DC (8) + 7 bits worker (128). Total 10 bits wahi, bas baantwara badla. Ya machine bits 11 karke sequence 11 bits (2,048/ms, phir bhi ~20 lakh/s per machine).' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Dynamo mein vnodes ka sabse bada faayda kya hai?', options: ['Data encrypt hota hai', 'Node gire ya aaye to load bahut saare nodes mein barabar batta hai, aur badi machines ko zyada vnodes de sakte hain', 'Reads strongly consistent ho jaate hain'], answer: 1, explain: 'Paper ke teen faayde: failure ka load sab mein bata, naya node sabse thoda thoda leta hai, heterogeneous machines.' },
      { q: 'Hinted handoff kis failure ke liye hai?', options: ['Permanent disk failure', 'Temporary node/network failure', 'Clock skew'], answer: 1, explain: 'Chhoti outage mein agla healthy node copy hint ke saath rakhta hai aur maalik ke lautne pe de deta hai. Lambi/permanent failure ke liye Merkle-tree anti-entropy.' },
      { q: 'Do vector clocks [Sx:2, Sy:1] aur [Sx:2, Sz:1] ka rishta?', options: ['Pehla naya', 'Doosra naya', 'Concurrent: dono rakho, client merge kare'], answer: 2, explain: 'Sy ka counter pehle mein bada, Sz ka doosre mein. Kisi ne doosre ko nahi dekha.' },
      { q: 'Merkle trees anti-entropy ko sasta kyun banate hain?', options: ['Data compress karte hain', 'Root same ho to ek comparison mein kaam khatam; alag ho to sirf alag shaakhaon mein utarte hain', 'Disk fast karte hain'], answer: 1, explain: 'Hash ka ped: farak dhoondhne ke liye poora data nahi, sirf kuch hashes exchange hote hain.' },
      { q: 'LSM store mein write itna tez kyun hota hai?', options: ['Data compress hota hai', 'Write sirf commit log ke aakhir mein judta hai aur RAM ke memtable mein jaata hai; disk pe koi jagah dhoondh ke badalni nahi padti', 'Writes kabhi disk pe nahi jaate'], answer: 1, explain: 'Sequential append + RAM. Keemat baad mein chukaate hain: reads kai files dekhte hain (bloom filters madad karte hain) aur compaction data dobara likhta hai (write amplification).' },
      { q: 'N = 3, W = 2, R = 2. Do copies down hain. Strict quorum mein kya hoga?', options: ['Read aur write dono chalenge', 'Dono mana, kyunki sirf 1 copy zinda hai aur 2 chahiye', 'Sirf read chalega'], answer: 1, explain: 'Quorum widget mein D = 2 karke dekho. Dynamo isi jagah sloppy quorum se ring ke agle healthy nodes use karke write chalu rakhta hai.' },
      { q: 'Snowflake ka 12-bit sequence ek millisecond mein khatam ho jaaye to generator kya karta hai?', options: ['Random number deta hai', 'Agle millisecond tak rukta hai aur sequence 0 se', 'Machine ID badal deta hai'], answer: 1, explain: '4,096 per ms per machine ki chhat. Isse zyada chahiye to aur machines, ya bits ka baantwara badlo.' },
    ]},
    { type: 'sources', note: 'Snowflake (2010) aur Dynamo paper (2007) purane hain. Twitter ka original Snowflake repo 2021 mein archive ho gaya; DynamoDB ka design Dynamo paper se alag hai (2022 paper dekho).', items: [
      { title: 'Announcing Snowflake', publisher: 'Twitter Engineering blog', official: true, year: 2010, url: 'https://blog.x.com/engineering/en_us/a/2010/announcing-snowflake', used: 'MySQL to Cassandra motivation, tens of thousands of IDs/second, uncoordinated, roughly sortable, 64-bit requirement.' },
      { title: 'twitter-archive/snowflake (snowflake-2010 README)', publisher: 'Twitter on GitHub', official: true, year: 2010, url: 'https://github.com/twitter-archive/snowflake/tree/snowflake-2010', used: 'Scala Thrift server, 41-bit ms time with custom epoch (69 years), 10-bit configured machine id, 12-bit sequence, 10k IDs/s per process and ~2 ms targets, NTP, refuse IDs when clock runs backwards, archived 2021.' },
      { title: 'Dynamo: Amazon\'s Highly Available Key-value Store', publisher: 'Amazon (SOSP 2007 paper)', official: true, year: 2007, url: 'https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf', used: 'Shopping cart always-writeable motivation, p99.9 SLA example, get/put with context, MD5 keys, consistent hashing + virtual nodes and their advantages, preference list skipping, cross-DC placement, vector clocks and example, truncation threshold, (3,2,2), sloppy quorum, hinted handoff, Merkle anti-entropy per key range, gossip every second, seeds, explicit membership, BDB storage engine, 99.94% single-version measurement, strategy 3.' },
      { title: 'Dynamo (architecture overview)', publisher: 'Apache Cassandra documentation', official: true, url: 'https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html', used: 'Cassandra uses token ring with vnodes (256 random tokens per node default in 2.x, smarter allocator from 3.x), gossip every second with a random peer and seeds, Phi Accrual failure detector, hinted handoff, read repair, Merkle-tree repair, consistency levels ONE/QUORUM/ALL/LOCAL_QUORUM, and last-write-wins timestamps instead of vector clocks.' },
      { title: 'Storage Engine', publisher: 'Apache Cassandra documentation', official: true, url: 'https://cassandra.apache.org/doc/latest/cassandra/architecture/storage-engine.html', used: 'LSM-based engine for write-heavy workloads, commit log (WAL) then memtable then flush to immutable SSTables, periodic (10 s default) vs batch commitlog_sync, Bloom filter per SSTable, compaction and write amplification.' },
      { title: 'Hints', publisher: 'Apache Cassandra documentation', official: true, url: 'https://cassandra.apache.org/doc/latest/cassandra/managing/operating/hints.html', used: 'Coordinator stores hints for unavailable replicas, max_hint_window default 3 hours.' },
      { title: 'Clusters (Riak KV concepts)', publisher: 'Riak KV documentation', official: true, url: 'https://docs.riak.com/riak/kv/latest/learn/concepts/clusters/index.html', used: '160-bit hash of bucket/key, ring split into partitions owned by vnodes, any node can coordinate, N/R/W and DW, ring state shared by gossip and re-announced periodically.' },
      { title: 'Causal Context (Riak KV concepts)', publisher: 'Riak KV documentation', official: true, url: 'https://docs.riak.com/riak/kv/latest/learn/concepts/causal-context/index.html', used: 'Vector clocks, siblings with allow_mult (recommended true) vs timestamp resolution, dotted version vectors recommended from 2.0 to avoid sibling explosion.' },
      { title: 'Active Anti-Entropy (Riak KV concepts)', publisher: 'Riak KV documentation', official: true, url: 'https://docs.riak.com/riak/kv/latest/learn/concepts/active-anti-entropy/index.html', used: 'Merkle hash tree exchange, persistent on-disk trees updated on writes, trees regenerated weekly by default to catch silent corruption.' },
      { title: 'Riak KV configuration reference', publisher: 'Riak KV documentation', official: true, url: 'https://docs.riak.com/riak/kv/latest/configuring/reference/index.html', used: 'ring_size default 64, power of 2, between 8 and 1024.' },
      { title: 'Amazon DynamoDB: A Scalable, Predictably Performant, and Fully Managed NoSQL Database Service', publisher: 'AWS (USENIX ATC 2022 paper)', official: true, year: 2022, url: 'https://www.usenix.org/conference/atc22/presentation/vig', used: 'DynamoDB partitions replicated by Multi-Paxos replication groups with a leader, i.e. different from the 2007 leaderless Dynamo.' },
    ]},
  ],
});
