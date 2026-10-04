Lesson.register({
  id: 'estimation-recipe',
  title: '5-step estimation recipe',
  minutes: 27,
  summary: `Numbers yaad ho gaye. Ab unhe ek fixed order mein lagana: users → traffic → storage → bandwidth → servers. Har step ke baad ek design conclusion bolna hai, kyunki estimation ka poora point wahi conclusion hai. Har step ka ek chhota worked example aur apna calculator, phir ek poora estimator jo saare formulas ek saath dikhata hai.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Pichle lesson mein tumne numbers yaad kiye. Ab sawaal hai: unhe <strong>kis order</strong> mein lagaayein?<br>Socho ek recipe card: pehle kitne log aayenge (users), phir wo kitni baar click karenge (traffic), phir kitna data jamaa hoga (storage), phir kitna data bhejna padega (bandwidth), aur end mein kitne computers chahiye (servers).<br>Har step ke baad ek line ka faisla bolna hai: "cache chahiye", "ek database kaafi", "CDN abhi nahi". Is lesson mein har step ek chhote example aur calculator ke saath.` },

    { type: 'h2', text: 'Problem: numbers hain, order nahi' },
    { type: 'p', html: `Pichle lesson mein 15 numbers yaad kiye. Lekin interview mein jab interviewer bolta hai "xyz.com pe comments feature design karo, 10 million daily users", to log aksar random jagah se shuru kar dete hain: kabhi storage, kabhi servers, kabhi bandwidth. Beech mein units mix ho jaati hain (per day vs per second), replicas bhool jaate hain, aur end mein ek bada number aata hai jiska koi matlab nahi nikalta.` },
    { type: 'p', html: `Solution: ek <strong>recipe</strong>. Har baar same 5 steps, same order mein. Har step pichle step ka output use karta hai, isliye kuch chhootta nahi.` },
    { type: 'ascii', text: `
 1. USERS        DAU
      │
      v
 2. TRAFFIC      writes/s, reads/s (avg aur peak), read:write ratio
      │
      v
 3. STORAGE      per day → per year → total (years × replicas)
      │
      v
 4. BANDWIDTH    QPS × payload size (in aur out)
      │
      v
 5. SERVERS      peak QPS ÷ ek server ki capacity × 1.5 headroom
      │
      v
    DESIGN CONCLUSION  (cache? sharding? CDN? kitne servers?)`, caption: 'Har step ke baad ek line mein conclusion bolo.' },

    { type: 'h2', text: 'Step 1: Users' },
    { type: 'p', html: `Hamesha <strong>daily active users</strong> se shuru karo. Agar sirf monthly users diye hain, to DAU aksar MAU ka <strong>20-50%</strong> hota hai. Social/chat apps jinhe log roz kholte hain wo upar ke end pe, aur occasional apps (travel booking, tax filing) neeche ke end pe.` },
    { type: 'callout', tone: 'term', title: 'Naye words: DAU aur MAU', html: `<strong>Ye kya hai:</strong> <strong>DAU</strong> (Daily Active Users) = ek din mein kitne <em>alag</em> log app kholte hain. <strong>MAU</strong> (Monthly Active Users) = ek mahine mein kitne alag log. Ek user jo mahine mein 3 baar aaya, MAU mein 1 baar ginta hai, lekin DAU mein sirf un 3 dino mein. Isliye DAU hamesha MAU se kam ya barabar.<br><strong>Kyun chahiye:</strong> traffic roz ka hota hai, isliye hisaab DAU se shuru hota hai. Companies aksar MAU batati hain, to DAU nikaalna padta hai.<br><strong>Iske bina:</strong> MAU ko roz ka user maan liya to traffic 2-5 guna zyada aayega, aur bekaar servers khareedoge.` },
    { type: 'code', text: `
xyz.com: 50 million MAU, log hafte mein kuch baar aate hain → DAU ≈ 20% × 50M = 10M DAU` },
    { type: 'p', html: `Khud try karo: MAU daalo aur slider se chuno ki app kitni "roz wali" hai:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>MAU (millions)</label><input class="er1M" type="number" value="50" min="0" step="1"></div>
          <div><label>DAU / MAU: <strong class="er1PV"></strong></label><input class="er1P" type="range" min="5" max="80" step="5" value="20"></div>
        </div>
        <div class="stats"><div class="stat"><span>DAU</span><strong class="er1D"></strong></div><div class="stat"><span>App ka type</span><strong class="er1T"></strong></div></div>
        <div class="calc-note er1N"></div>`;
      const upd = () => {
        const m = Math.max(0, Number(el.querySelector('.er1M').value) || 0), pc = Number(el.querySelector('.er1P').value), d = m * pc / 100;
        el.querySelector('.er1PV').textContent = pc + '%';
        el.querySelector('.er1D').textContent = (+d.toPrecision(3)) + 'M';
        el.querySelector('.er1T').textContent = pc >= 50 ? 'roz wali (chat, social)' : pc >= 20 ? 'hafte mein kuch baar' : 'kabhi kabhi (travel, tax)';
        el.querySelector('.er1N').textContent = `DAU = ${m}M × ${pc}% = ${+d.toPrecision(3)}M. Aage ka saara hisaab isi number se chalega.`;
      };
      ['.er1M', '.er1P'].forEach(c => el.querySelector(c).addEventListener('input', upd)); upd();
    }},

    { type: 'h2', text: 'Step 2: Traffic' },
    { type: 'p', html: `Do tarah ka traffic alag ginte hain, kyunki dono ka design alag hai: <strong>writes</strong> (naya data banana: post, comment, like) aur <strong>reads</strong> (data dekhna: feed, profile).` },
    { type: 'code', text: `
Writes/day = DAU × writes per user     →  avg write QPS = writes/day ÷ 10^5
Reads/day  = DAU × reads per user      →  avg read QPS  = reads/day ÷ 10^5
Peak QPS   = avg QPS × 2 to 5   (live events pe 10+)

xyz.com: 10M DAU × 5 comments = 50M writes/day  → 500/s avg  → 1,500/s peak (×3)
         reads 20× writes     = 1B reads/day    → 10k/s avg  → 30k/s peak` },
    { type: 'callout', tone: 'term', title: 'Naya word: Read:write ratio', html: `<strong>Ye kya hai:</strong> har ek write ke peeche kitne reads. 20:1 matlab ek comment ek baar likha jaata hai aur 20 baar padha jaata hai.<br><strong>Kyun chahiye:</strong> ye design ka sabse bada signal hai. <strong>Zyada reads</strong> (10:1 ya upar) → cache aur read replicas. <strong>Zyada writes</strong> (logging, metrics, chat messages) → write-optimised storage, queues, sharding.<br><strong>Iske bina:</strong> reads aur writes ko ek hi "traffic" maan liya, to ya cache bhool jaoge ya galat jagah lagaoge.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Peak factor', html: `<strong>Ye kya hai:</strong> sabse busy time ka traffic ÷ average traffic. Normal apps ×2 se ×5. Cricket final ya flash sale pe ×10 ya usse bhi zyada.<br><strong>Kyun chahiye:</strong> servers peak ke liye chahiye. Peak factor jitna bada, utna zyada <em>khaali capacity</em> baaki time pada rehta hai (paisa), ya phir <strong>autoscaling</strong> (load dekh ke servers apne aap badhana-ghataana) chahiye.<br><strong>Iske bina:</strong> average pe plan kiya, aur roz busy time pe site slow.` },
    { type: 'p', html: `Step 2 ka calculator. Default xyz.com comments wala hai:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>DAU (millions)</label><input class="er2D" type="number" value="10" min="0" step="1"></div>
          <div><label>Writes per user per day</label><input class="er2W" type="number" value="5" min="0" step="1"></div>
          <div><label>Reads per write: <strong class="er2RV"></strong></label><input class="er2R" type="range" min="1" max="100" step="1" value="20"></div>
          <div><label>Peak factor: <strong class="er2PV"></strong></label><input class="er2P" type="range" min="1" max="10" step="1" value="3"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Write QPS avg / peak</span><strong class="er2Wq"></strong></div>
          <div class="stat"><span>Read QPS avg / peak</span><strong class="er2Rq"></strong></div>
        </div>
        <pre class="ascii er2F" style="margin-top:12px;white-space:pre-wrap"></pre>
        <div class="calc-note er2N"></div>`;
      const n = v => v >= 1e9 ? +(v / 1e9).toPrecision(3) + 'B' : v >= 1e6 ? +(v / 1e6).toPrecision(3) + 'M' : v >= 1e3 ? +(v / 1e3).toPrecision(3) + 'k' : (+v.toPrecision(3)).toString();
      const upd = () => {
        const d = Math.max(0, Number(el.querySelector('.er2D').value) || 0) * 1e6, w = Math.max(0, Number(el.querySelector('.er2W').value) || 0);
        const r = Number(el.querySelector('.er2R').value), pk = Number(el.querySelector('.er2P').value);
        const wd = d * w, rd = wd * r, wq = wd / 1e5, rq = rd / 1e5;
        el.querySelector('.er2RV').textContent = r + ':1'; el.querySelector('.er2PV').textContent = '×' + pk;
        el.querySelector('.er2Wq').textContent = n(wq) + ' / ' + n(wq * pk);
        el.querySelector('.er2Rq').textContent = n(rq) + ' / ' + n(rq * pk);
        el.querySelector('.er2F').textContent = `writes/day = ${n(d)} × ${w} = ${n(wd)}   → ÷ 10^5 = ${n(wq)}/s → × ${pk} = ${n(wq * pk)}/s\nreads/day  = ${n(wd)} × ${r} = ${n(rd)}   → ÷ 10^5 = ${n(rq)}/s → × ${pk} = ${n(rq * pk)}/s`;
        el.querySelector('.er2N').textContent = (r >= 10 ? `Read-heavy (${r}:1): cache aur read replicas. ` : r <= 2 ? `Write-heavy (${r}:1): write path pe dhyaan (queue, sharding). ` : `Mixed (${r}:1). `) + (wq * pk > 10000 ? 'Peak writes 10k/s se upar: ek SQL node kaafi nahi.' : 'Peak writes ek SQL primary ki range mein.');
      };
      ['.er2D', '.er2W', '.er2R', '.er2P'].forEach(c => el.querySelector(c).addEventListener('input', upd)); upd();
    }},

    { type: 'h2', text: 'Step 3: Storage' },
    { type: 'code', text: `
Daily storage  = writes/day × size per write
Yearly         = daily × 400
Total          = yearly × years kept × 3 replicas

xyz.com: 50M × 1 KB = 50 GB/day → × 400 = 20 TB/year → × 5 years × 3 = 300 TB` },
    { type: 'p', html: `Do baatein dhyaan rakho. (1) <strong>Replicas</strong>: data ki 3 copies rakhte hain (failure se bachne ke liye), to disk 3× chahiye. Ye bhoolna sabse common galti hai. (2) <strong>Media alag ginno</strong>: photo/video metadata se aksar ~100× bada hota hai, aur alag jagah (object storage) jaata hai. 1 KB comment aur 500 KB photo ko ek hi "size" mein mat milao.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Replication factor', html: `<strong>Ye kya hai:</strong> har data ki kitni copies alag machines pe rakhte ho. Aksar 3.<br><strong>Kyun chahiye:</strong> disk marti hain, machines girti hain. 3 copies ho to ek-do jaane pe bhi data bacha rehta hai ("Replication" lesson).<br><strong>Iske bina (hisaab mein bhoola):</strong> disk ka andaza 3 guna kam, aur launch ke kuch mahine baad jagah khatam.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Retention', html: `<strong>Ye kya hai:</strong> data kitne saal rakhna hai. 5 saal ka retention matlab 5 saal ka data disk pe.<br><strong>Kyun chahiye:</strong> total storage = per saal × kitne saal. Purana data aksar sasti "cold" storage mein shift (archive) kar dete hain, taaki main database chhota rahe.<br><strong>Iske bina:</strong> sirf ek saal ka hisaab lagaya, aur teesre saal database phat gaya.` },
    { type: 'p', html: `Step 3 ka calculator. Media (photo) aur text ko alag gin-ta hai, jaisa hona chahiye:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Writes per day (millions)</label><input class="er3W" type="number" value="50" min="0" step="1"></div>
          <div><label>Text/metadata per write (KB)</label><input class="er3S" type="number" value="1" min="0" step="0.1"></div>
          <div><label>Kitne % writes mein photo: <strong class="er3MV"></strong></label><input class="er3M" type="range" min="0" max="100" step="5" value="0"></div>
          <div><label>Photo size (KB)</label><input class="er3MS" type="number" value="500" min="0" step="50"></div>
          <div><label>Retention: <strong class="er3YV"></strong></label><input class="er3Y" type="range" min="1" max="10" step="1" value="5"></div>
          <div><label>Replicas: <strong class="er3RV"></strong></label><input class="er3R" type="range" min="1" max="5" step="1" value="3"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Text per day</span><strong class="er3D"></strong></div>
          <div class="stat"><span>Text total (DB)</span><strong class="er3T"></strong></div>
          <div class="stat"><span>Media per day</span><strong class="er3MD"></strong></div>
          <div class="stat"><span>Media total</span><strong class="er3MT"></strong></div>
        </div>
        <pre class="ascii er3F" style="margin-top:12px;white-space:pre-wrap"></pre>
        <div class="calc-note er3N"></div>`;
      const by = b => { const u = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB']; let i = 0; while (b >= 1000 && i < u.length - 1) { b /= 1000; i++; } return (+b.toPrecision(3)) + ' ' + u[i]; };
      const g = c => Math.max(0, Number(el.querySelector(c).value) || 0);
      const n = v => v >= 1e9 ? +(v / 1e9).toPrecision(3) + 'B' : v >= 1e6 ? +(v / 1e6).toPrecision(3) + 'M' : v >= 1e3 ? +(v / 1e3).toPrecision(3) + 'k' : (+v.toPrecision(3)).toString();
      const upd = () => {
        const w = g('.er3W') * 1e6, kb = g('.er3S'), mp = g('.er3M'), ms = g('.er3MS'), yr = g('.er3Y'), rf = g('.er3R');
        const day = w * kb * 1e3, yearB = day * 400, tot = yearB * yr * rf, mday = w * mp / 100 * ms * 1e3, mtot = mday * 400 * yr * rf;
        el.querySelector('.er3MV').textContent = mp + '%'; el.querySelector('.er3YV').textContent = yr + ' saal'; el.querySelector('.er3RV').textContent = rf;
        el.querySelector('.er3D').textContent = by(day); el.querySelector('.er3T').textContent = by(tot);
        el.querySelector('.er3MD').textContent = by(mday); el.querySelector('.er3MT').textContent = by(mtot);
        el.querySelector('.er3F').textContent = `text : ${n(w)} writes × ${kb} KB = ${by(day)}/day → × 400 = ${by(yearB)}/year → × ${yr} × ${rf} = ${by(tot)}\nmedia: ${mp}% × ${n(w)} × ${ms} KB = ${by(mday)}/day → total ${by(mtot)}`;
        el.querySelector('.er3N').textContent = (tot >= 5e12 ? `Text ${by(tot)}: ek DB ke ~1-5 TB se bada → sharding ya archiving. ` : tot >= 1e12 ? `Text ${by(tot)}: ek DB ki upper range, growth pe nazar. ` : `Text ${by(tot)}: ek database mein aaram se. `) + (mday > 0 ? `Media ${by(mday)}/day: DB mein nahi, object storage (S3 jaisa) mein, aur CDN se serve.` : '');
      };
      ['.er3W', '.er3S', '.er3M', '.er3MS', '.er3Y', '.er3R'].forEach(c => el.querySelector(c).addEventListener('input', upd)); upd();
    }},

    { type: 'h2', text: 'Step 4: Bandwidth' },
    { type: 'code', text: `
Ingress (andar aata data)  = write QPS × payload size
Egress  (bahar jaata data) = read QPS  × payload size

xyz.com peak: 30k reads/s × 1 KB = 30 MB/s ≈ 240 Mbps  → chhota, koi CDN nahi chahiye text ke liye
Agar har read ek 500 KB photo ho: 30k × 500 KB = 15 GB/s → CDN ke bina possible hi nahi` },
    { type: 'callout', tone: 'term', title: 'Naye words: Ingress aur egress', html: `<strong>Ye kya hai:</strong> <strong>ingress</strong> = users se tumhare servers ki taraf aane wala data (uploads, posts). <strong>Egress</strong> = tumhare servers se users ki taraf jaane wala data (pages, images, videos).<br><strong>Kyun chahiye:</strong> network ki pipe aur bill dono isi se tay hote hain. Cloud providers aksar egress ka paisa lete hain (ingress aksar free).<br><strong>Iske bina:</strong> photo/video app ka egress bhool gaye to network choke, aur mahine ke end mein bada bill. Bada egress = "CDN pe daalo".` },
    { type: 'p', html: `Step 4 ka calculator. Yaad: network bits mein naapte hain, to MB/s × 8 = Mbps.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Average read QPS</label><input class="er4Q" type="number" value="10000" min="0" step="1000"></div>
          <div><label>Response size (KB)</label><input class="er4S" type="number" value="1" min="0" step="1"></div>
          <div><label>Peak factor: <strong class="er4PV"></strong></label><input class="er4P" type="range" min="1" max="10" step="1" value="3"></div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px" class="er4Pre"></div>
        <div class="stats">
          <div class="stat"><span>Egress avg</span><strong class="er4A"></strong></div>
          <div class="stat"><span>Egress peak</span><strong class="er4B"></strong></div>
          <div class="stat"><span>Ek mahine mein</span><strong class="er4M"></strong></div>
        </div>
        <div class="calc-note er4N"></div>`;
      const by = b => { const u = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB']; let i = 0; while (b >= 1000 && i < u.length - 1) { b /= 1000; i++; } return (+b.toPrecision(3)) + ' ' + u[i]; };
      const bits = b => { const v = b * 8; return v >= 1e9 ? +(v / 1e9).toPrecision(3) + ' Gbps' : +(v / 1e6).toPrecision(3) + ' Mbps'; };
      [['Text comments', 10000, 1], ['Photo feed', 10000, 500], ['Video (1 MB chunk)', 10000, 1000]].forEach(p => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small ghost'; b.textContent = p[0]; b.onclick = () => { el.querySelector('.er4Q').value = p[1]; el.querySelector('.er4S').value = p[2]; upd(); }; el.querySelector('.er4Pre').appendChild(b); });
      const upd = () => {
        const q = Math.max(0, Number(el.querySelector('.er4Q').value) || 0), kb = Math.max(0, Number(el.querySelector('.er4S').value) || 0), pk = Number(el.querySelector('.er4P').value);
        const avg = q * kb * 1e3, peak = avg * pk, month = avg * 2.6e6;
        el.querySelector('.er4PV').textContent = '×' + pk;
        el.querySelector('.er4A').textContent = by(avg) + '/s';
        el.querySelector('.er4B').textContent = by(peak) + '/s = ' + bits(peak);
        el.querySelector('.er4M').textContent = by(month);
        el.querySelector('.er4N').textContent = `${q.toLocaleString('en-US')}/s × ${kb} KB = ${by(avg)}/s. Peak × ${pk} = ${bits(peak)}. ` + (peak * 8 >= 1e10 ? 'Das Gbps se zyada: CDN ke bina namumkin. Files object storage mein, users ko CDN edges se.' : peak * 8 >= 1e9 ? 'Gbps range: CDN lagao, origin ka bojh aur bill dono ghatenge.' : 'Chhota: app servers khud bhej sakte hain. CDN sirf static files (JS, images) ke liye.');
      };
      ['.er4Q', '.er4S', '.er4P'].forEach(c => el.querySelector(c).addEventListener('input', upd)); upd();
    }},

    { type: 'h2', text: 'Step 5: Servers' },
    { type: 'code', text: `
Servers = peak QPS ÷ ek server ki capacity × 1.5 headroom
Phir unhe kam se kam 2-3 availability zones mein baanto.
Connections ke liye: concurrent users ÷ connections per gateway

xyz.com: (1,500 + 30,000) ÷ 2,000 × 1.5 ≈ 24 app servers → 3 zones × 8` },
    { type: 'p', html: `Ek server ki capacity pichle lesson ki table se: simple API 1k-10k req/s, lekin asli kaam wali requests (DB calls, logic) ke liye 1k-2k maano. <strong>1.5× headroom</strong> isliye taaki har server ~65% pe chale, ek zone gire to baaki do zone (lagbhag poori capacity pe) kaam chala lein, aur deploy ke time kuch servers band hon tab bhi chale.` },

    { type: 'p', html: `Step 5 ka calculator. Do mode hain: normal requests (HTTP), aur lambe connections (chat, live score jaisi WebSocket apps), jahan ginti "kitne log ek saath jude hain" se hoti hai:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px" class="er5Mode"></div>
        <div class="row2">
          <div><label class="er5L1"></label><input class="er5Q" type="number" value="31500" min="0" step="500"></div>
          <div><label class="er5L2"></label><input class="er5C" type="number" value="2000" min="1" step="100"></div>
          <div><label>Headroom: <strong class="er5HV"></strong></label><input class="er5H" type="range" min="1" max="2" step="0.1" value="1.5"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Kaam ke liye</span><strong class="er5A"></strong></div>
          <div class="stat"><span>Headroom ke saath</span><strong class="er5B"></strong></div>
          <div class="stat"><span>3 zones mein</span><strong class="er5Z"></strong></div>
        </div>
        <div class="calc-note er5N"></div>`;
      const MODES = [['Requests (HTTP)', 'Peak QPS (reads + writes)', 'Ek server ki capacity (req/s)', 31500, 2000], ['Connections (WebSocket)', 'Ek saath online users', 'Connections per gateway', 100000000, 100000]];
      let mode = 0;
      const drawMode = () => { const box = el.querySelector('.er5Mode'); box.innerHTML = ''; MODES.forEach((m, k) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (k === mode ? ' on' : ''); b.textContent = m[0]; b.onclick = () => { mode = k; el.querySelector('.er5Q').value = m[3]; el.querySelector('.er5C').value = m[4]; drawMode(); upd(); }; box.appendChild(b); }); el.querySelector('.er5L1').textContent = MODES[mode][1]; el.querySelector('.er5L2').textContent = MODES[mode][2]; };
      const upd = () => {
        const q = Math.max(0, Number(el.querySelector('.er5Q').value) || 0), c = Math.max(1, Number(el.querySelector('.er5C').value) || 1), h = Number(el.querySelector('.er5H').value);
        const raw = q / c, withH = Math.max(2, Math.ceil(raw * h - 1e-9)), z = Math.ceil(withH / 3) * 3, f = x => x.toLocaleString('en-US');
        el.querySelector('.er5HV').textContent = '×' + h.toFixed(1);
        el.querySelector('.er5A').textContent = f(+raw.toPrecision(3));
        el.querySelector('.er5B').textContent = f(withH);
        el.querySelector('.er5Z').textContent = f(z) + ' (3 × ' + f(z / 3) + ')';
        el.querySelector('.er5N').textContent = `${f(q)} ÷ ${f(c)} = ${f(+raw.toPrecision(3))}; × ${h.toFixed(1)} = ${f(withH)} (kam se kam 2, taaki ek gire to doosra chale); 3 zones mein barabar = ${f(z)}.` + (mode === 1 ? ' Saath mein ek registry chahiye jo yaad rakhe kaunsa user kis gateway pe juda hai, taaki message sahi gateway tak jaaye.' : '');
      };
      ['.er5Q', '.er5C', '.er5H'].forEach(k => el.querySelector(k).addEventListener('input', upd)); drawMode(); upd();
    }},

    { type: 'h2', text: 'Poora estimator: khud chala ke dekho' },
    { type: 'p', html: `Saare 5 steps ek jagah. Har input badlo aur dekho har formula kaise badalta hai, aur neeche design conclusion kab palat-ta hai. Presets se shuru karo, phir apne numbers daalo.` },
    { type: 'custom', render(el) {
      const F = [
        ['erDau', 'DAU (millions)', 10, 0.1],
        ['erW', 'Writes per user per day', 5, 0.1],
        ['erRw', 'Read:write ratio (reads per write)', 20, 1],
        ['erSz', 'Object size (KB)', 1, 0.1],
        ['erYr', 'Retention (years)', 5, 1],
        ['erRf', 'Replication factor', 3, 1],
        ['erPk', 'Peak multiplier', 3, 1],
        ['erSv', 'Ek server ki capacity (req/s)', 2000, 100],
      ];
      const PRE = [
        ['xyz.com comments', [10, 5, 20, 1, 5, 3, 3, 2000]],
        ['Twitter-like text', [200, 2, 50, 1, 5, 3, 3, 5000]],
        ['URL shortener', [50, 2, 100, 0.5, 5, 3, 3, 2000]],
        ['Photo app (media)', [50, 1, 100, 500, 5, 3, 3, 2000]],
      ];
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px" class="erPre"></div>
        <div class="row2">${F.map(f => `<div><label for="${f[0]}">${f[1]}</label><input id="${f[0]}" type="number" value="${f[2]}" min="0" step="${f[3]}"></div>`).join('')}</div>
        <div class="stats">
          <div class="stat"><span>Write QPS avg / peak</span><strong class="erWq"></strong></div>
          <div class="stat"><span>Read QPS avg / peak</span><strong class="erRq"></strong></div>
          <div class="stat"><span>Total storage</span><strong class="erSt"></strong></div>
          <div class="stat"><span>Egress at peak</span><strong class="erEg"></strong></div>
          <div class="stat"><span>App servers</span><strong class="erNs"></strong></div>
          <div class="stat"><span>Cache (20% hot)</span><strong class="erCa"></strong></div>
        </div>
        <pre class="ascii erF" style="margin-top:12px;white-space:pre-wrap;font-size:12.5px"></pre>
        <div class="calc-note"><strong>Design conclusions</strong><ul class="erC" style="margin:6px 0 0;padding-left:20px"></ul></div>`;
      const box = el.querySelector('.erPre');
      PRE.forEach(p => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small ghost'; b.textContent = p[0]; b.onclick = () => { F.forEach((f, i) => { el.querySelector('#' + f[0]).value = p[1][i]; }); upd(); }; box.appendChild(b); });
      const n = v => v >= 1e9 ? +(v / 1e9).toPrecision(3) + 'B' : v >= 1e6 ? +(v / 1e6).toPrecision(3) + 'M' : v >= 1e3 ? +(v / 1e3).toPrecision(3) + 'k' : (+v.toPrecision(3)).toString();
      const by = b => { const u = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB']; let i = 0; while (b >= 1000 && i < u.length - 1) { b /= 1000; i++; } return (+b.toPrecision(3)) + ' ' + u[i]; };
      const upd = () => {
        const v = F.map(f => Math.max(0, Number(el.querySelector('#' + f[0]).value) || 0));
        const [dauM, w, rw, kb, yr, rf, pk, sv] = v;
        const dau = dauM * 1e6, size = kb * 1e3;
        const wDay = dau * w, rDay = wDay * rw;
        const wq = wDay / 1e5, rq = rDay / 1e5, wp = wq * pk, rp = rq * pk;
        const sDay = wDay * size, sYr = sDay * 400, sTot = sYr * yr * rf;
        const inA = wq * size, outA = rq * size, inP = wp * size, outP = rp * size;
        const raw = sv > 0 ? (wp + rp) / sv * 1.5 : 0;
        const srv = sv > 0 ? Math.max(2, Math.ceil(raw - 1e-9)) : 0, perZone = Math.ceil(srv / 3);
        const cache = rDay * size * 0.2;
        el.querySelector('.erWq').textContent = n(wq) + ' / ' + n(wp) + ' per s';
        el.querySelector('.erRq').textContent = n(rq) + ' / ' + n(rp) + ' per s';
        el.querySelector('.erSt').textContent = by(sTot);
        el.querySelector('.erEg').textContent = by(outP) + '/s';
        el.querySelector('.erNs').textContent = srv + ' (3 × ' + perZone + ')';
        el.querySelector('.erCa').textContent = by(cache);
        el.querySelector('.erF').textContent =
`1 USERS     DAU = ${n(dau)}
2 TRAFFIC   writes/day = ${n(dau)} × ${w} = ${n(wDay)}
            reads/day  = ${n(wDay)} × ${rw} = ${n(rDay)}
            write QPS = ${n(wDay)} ÷ 10^5 = ${n(wq)}/s   peak × ${pk} = ${n(wp)}/s
            read QPS  = ${n(rDay)} ÷ 10^5 = ${n(rq)}/s   peak × ${pk} = ${n(rp)}/s
3 STORAGE   per day  = ${n(wDay)} × ${kb} KB = ${by(sDay)}
            per year = ${by(sDay)} × 400 = ${by(sYr)}
            total    = ${by(sYr)} × ${yr} yr × ${rf} replicas = ${by(sTot)}
4 BANDWIDTH in  = ${n(wq)}/s × ${kb} KB = ${by(inA)}/s   (peak ${by(inP)}/s)
            out = ${n(rq)}/s × ${kb} KB = ${by(outA)}/s   (peak ${by(outP)}/s ≈ ${n(outP * 8 / 1e9)} Gbps)
5 SERVERS   (${n(wp)} + ${n(rp)}) ÷ ${n(sv)} × 1.5 = ${raw.toFixed(1)} → ${srv} servers, 3 zones × ${perZone}
  CACHE     reads/day × size × 20% = ${n(rDay)} × ${kb} KB × 0.2 = ${by(cache)}`;
        const C = [];
        if (rw >= 10) C.push(`Read:write ${rw}:1 → read-heavy. Cache lagao aur DB pe read replicas.`);
        else if (rw <= 2) C.push(`Read:write sirf ${rw}:1 → write-heavy. Write path pe dhyaan: queue, write-optimised store (Cassandra jaisa), sharding.`);
        else C.push(`Read:write ${rw}:1 → mixed. Cache faayda dega, lekin writes ko bhi plan karo.`);
        if (wp > 10000) C.push(`Peak writes ${n(wp)}/s → ek SQL node (~5k-20k simple writes/s) jitna aaram se le, usse zyada. Writes shard karo ya Cassandra jaisa store.`);
        else if (wp > 5000) C.push(`Peak writes ${n(wp)}/s → ek SQL primary ki limit ke paas (5k-20k). Sharding ka plan ready rakho.`);
        else C.push(`Peak writes ${n(wp)}/s → ek database primary aaram se sambhal lega.`);
        const media = kb >= 100;
        if (media) C.push(`Object ${kb} KB ka hai: ye media hai. Files object storage (S3 jaisa) mein, DB mein sirf metadata (~1 KB). Storage ${by(sTot)} DB mein nahi, object storage mein jaayega.`);
        if (rp > 20000) C.push(media ? `Peak reads ${n(rp)}/s media ke → CDN edges serve karein; origin tak sirf misses aayein.` : `Peak reads ${n(rp)}/s → ek DB node akela nahi jhel sakta. Cache mandatory, plus replicas.`);
        if (media) {}
        else if (sTot >= 5e12) C.push(`Total storage ${by(sTot)} → ek DB ke comfortable size (~1-5 TB) se bahut bada. Sharding ya archiving zaroori.`);
        else if (sTot >= 1e12) C.push(`Total storage ${by(sTot)} → ek DB ki upper range. Growth pe nazar, archiving socho.`);
        else C.push(`Total storage ${by(sTot)} → ek database mein aaram se.`);
        if (outP >= 1e9) C.push(`Peak egress ${by(outP)}/s → bahut bada. Ye content CDN (aur media ho to object storage) se serve karo.`);
        C.push(`${srv} app servers, kam se kam 3 zones mein. ` + (media ? `Hot media ~${by(cache)}: ye Redis nahi, CDN edges ka kaam hai.` : `Cache ~${by(cache)}${cache > 1e11 ? ': ek machine ki RAM mein nahi aayega, kai cache nodes (Redis Cluster) chahiye' : ''}.`));
        el.querySelector('.erC').innerHTML = C.map(c => '<li>' + c + '</li>').join('');
      };
      F.forEach(f => el.querySelector('#' + f[0]).addEventListener('input', upd));
      upd();
    }},
    { type: 'callout', tone: 'tip', title: '"20% hot" cache kahan se aaya?', html: `Zyada tar apps mein thoda sa data hi zyada tar traffic kheenchta hai (aaj ke trending posts, popular profiles). Isse aksar <strong>80/20 rule</strong> kehte hain: ~20% data se ~80% reads. Isliye cache ka rough size = ek din ke read data ka 20%. Ye <em>upper bound</em> jaisa hai: asli mein bahut saare reads same items ke hote hain, to unique data aur bhi kam hota hai.` },

    { type: 'p', html: `"Twitter-like text" preset dabao: roadmap ke worked example ke saare numbers wahi aate hain (4k/12k writes, 200k/600k reads, 400 GB/day, 160 TB/year, 2.4 PB). Servers 184 aate hain kyunki estimator reads <em>aur</em> writes dono jodta hai; roadmap sirf reads (600k ÷ 5k × 1.5 = 180) leta hai. 2% ka farak, conclusion same. Agle lesson mein ye poora example detail mein.` },

    { type: 'h2', text: 'Estimate galat ho to kya toot-ta hai' },
    { type: 'p', html: `xyz.com comments ka estimate upar wala hai: 10k reads/s average, 30k peak. Teen teams ne teen tarah se plan kiya. Har scenario chalao:` },
    { type: 'flow', height: 300,
      nodes: [
        { id: 'u', label: 'Users', sub: '10M DAU', x: 80, y: 150, w: 130, kind: 'client', info: 'Ye kya hai: xyz.com ke 10 million daily users (DAU). Raat 9 baje sabse zyada (peak ≈ 3× average).' },
        { id: 'lb', label: 'Load Balancer', x: 255, y: 150, w: 140, kind: 'net', info: 'Ye kya hai: wo box jo aane wali requests ko kai app servers mein baant-ta hai. Iske peeche kitne servers hon, ye Step 5 ka sawaal hai.' },
        { id: 'app', label: 'App servers', sub: 'fleet', x: 445, y: 150, w: 150, kind: 'server', meter: true, load: 40, info: 'Ye kya hai: page/API ka code chalane wale computers. Har server ~2,000 req/s asli kaam ke saath. Kitne chahiye: peak QPS ÷ 2,000 × 1.5.' },
        { id: 'cache', label: 'Redis cache', sub: '~200 GB hot', x: 625, y: 60, w: 160, kind: 'cache', info: 'Ye kya hai: RAM mein rakha tez store. Kyun yahan: reads:writes 20:1 hai, to cache sabse zyada reads utha leta hai. Size estimate: ek din ke read data ka ~20%.' },
        { id: 'db', label: 'Database', sub: '5k-20k ops/s', x: 625, y: 240, w: 160, kind: 'data', meter: true, load: 30, info: 'Ye kya hai: comments ka asli, pakka data. Ek SQL node ~5k-20k simple ops/s. 30k peak reads isse bahut zyada hain, isliye cache aur replicas.' },
      ],
      edges: [{ a: 'u', b: 'lb' }, { a: 'lb', b: 'app' }, { a: 'app', b: 'cache' }, { a: 'app', b: 'db' }],
      scenarios: [
        { name: 'Sahi estimate', steps: [
          { title: 'Peak ke liye plan', text: '30k peak reads + 1.5k writes ÷ 2,000 × 1.5 ≈ 24 servers. Raat 9 baje bhi har server ~65% pe.', flood: { paths: ['u>lb>app'], n: 10 }, after: { app: { load: 65, sub: '24 servers, ~65%' } }, msg: '(1,500 + 30,000) ÷ 2,000 × 1.5 ≈ 24' },
          { title: 'Cache zyada reads utha leta hai', text: 'Read-heavy (20:1) dekh ke cache lagaya. Maan lo 90% hit rate: 30k mein se 27k reads Redis se.', go: ['app>cache', 'res:cache>app'], after: { cache: { state: 'hit', sub: '~27k/s HIT' } } },
          { title: 'DB aaram mein', text: 'DB tak sirf ~3k reads + 1.5k writes. Ek node ki range ke andar.', go: ['app>db', 'res:db>app'], after: { db: { load: 40, state: 'ok', sub: '~4.5k ops/s' } } },
          { title: 'User khush', go: 'res:app>lb>u', text: 'Estimate ne bataya kya chahiye, aur utna hi banaya.' },
        ]},
        { name: 'Average pe plan (failure)', intro: 'Team ne 10k average dekha aur peak factor bhool gayi.', steps: [
          { title: 'Din mein sab theek', text: '10k ÷ 2,000 × 1.5 ≈ 8 servers. Dopahar mein ~65% load, sab green.', flood: { paths: ['u>lb>app'], n: 5 }, after: { app: { load: 65, sub: '8 servers' } } },
          { title: 'Raat 9 baje: peak ×3', text: '30k requests/s aayin, capacity 16k. Requests line mein, latency aasmaan pe, timeouts.', flood: { paths: ['u>lb>app'], n: 16 }, after: { app: { load: 100, state: 'hot', sub: 'overloaded' } } },
          { title: 'Site down har raat', text: 'Servers average ke liye the, users peak pe aate hain. Fix: hamesha <strong>peak</strong> QPS se servers gino (ya autoscaling jo peak se pehle scale kare).', go: 'bad:app>lb>u', after: { u: { state: 'down', sub: 'errors' } } },
        ]},
        { name: 'Read:write ignore (failure)', intro: 'Team ne servers sahi gine, lekin "DB to hai hi" soch ke cache nahi lagaya.', steps: [
          { title: 'Cache hai hi nahi', text: 'Saare 30k peak reads seedhe DB pe.', set: { cache: { state: 'dim', sub: 'nahi lagaya' } }, flood: { paths: ['app>db'], n: 14 }, after: { db: { load: 100, state: 'hot', sub: '31.5k ops/s!' } } },
          { title: 'DB ghut-ta hai', text: 'Ek SQL node ~5k-20k ops/s. 31.5k pe queries slow, connections full. App servers bhi DB ka wait karte karte atak gaye.', go: 'bad:db>app>lb>u', after: { app: { state: 'warn', sub: 'waiting on DB' } } },
          { title: 'Fix', text: 'Read:write 20:1 ne pehle hi bata diya tha: cache aur read replicas. Estimate ka matlab number nahi, ye conclusion tha.', focus: ['cache', 'db'] },
        ]},
      ],
    },

    { type: 'h2', text: 'Sirf wahi estimate karo jo design badle' },
    { type: 'callout', tone: 'why', title: 'Decide', html: `<strong>Only estimate what changes the design.</strong> Har number ke baad conclusion bolo. Agar reads 200k/s hain, to conclusion hai: "ek database ye serve nahi kar sakta, cache aur replicas chahiye". Ye line zor se bolo. Maths ka point yahi hai. Jo number kisi bhi faisle ko nahi chhoota (jaise login API ka bandwidth jab wo 1 MB/s hai), use skip karo ya ek line mein khatam karo.` },
    { type: 'table', head: ['Agar number ye bole', 'To design mein ye'], rows: [
      ['Read:write ≥ 10:1', 'Cache + read replicas'],
      ['Peak writes > ~10k/s', 'Ek SQL node kaafi nahi: shard karo ya Cassandra jaisa write-optimised store'],
      ['Total data > ~5 TB', 'Sharding ya archiving'],
      ['Egress bahut bada (GB/s)', 'CDN; media object storage mein'],
      ['Concurrent connections lakhon mein', 'Gateways ka fleet (har ek ~100k) + user → gateway registry'],
      ['Sab chhota (< 1k/s, < 1 TB)', 'Ek simple setup: 2 servers + ek DB + replica. Over-engineer mat karo'],
    ]},

    { type: 'h2', text: 'Rounding ke rules' },
    { type: 'list', items: [
      `<strong>Ek ya do significant digits.</strong> 86,400 → 10^5. 365 → 400. 1,157/s → "~1k/s". 183.6 servers → "~180-200".`,
      `<strong>Powers of ten mein socho.</strong> 2 × 10^8 users × 10^2 reads = 2 × 10^10 reads/day. Exponents jodo, zeros mat gino.`,
      `<strong>Har number ke saath unit.</strong> "/s", "/day", "GB", "GB/s". Bina unit ka number interview mein sabse jaldi galat hota hai.`,
      `<strong>Ek direction mein round karo jab doubt ho.</strong> Capacity (storage, servers) thoda upar round karo, taaki headroom mile.`,
      `<strong>Assumptions zor se bolo.</strong> "Main maan raha hoon peak 3× hai, aur ek post 1 KB." Interviewer assumption badle to bas wo step dobara karo.`,
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `(1) <strong>Replicas bhoolna</strong>: 160 TB/year ke 5 saal = 800 TB, lekin 3 copies ke saath 2.4 PB. (2) <strong>Media aur metadata ek saath</strong>: 1 KB post aur 500 KB photo ka average nikaalna. Dono alag store mein jaate hain, alag gino. (3) <strong>Average pe servers gin-na</strong>: peak factor bhoola to site roz busy time pe giregi. (4) <strong>Bits/bytes</strong>: 600 MB/s = 4.8 Gbps, 600 Mbps nahi.` },
    { type: 'callout', tone: 'tip', title: 'Interview mein kaise bolein', html: `"Main 5 steps mein chalunga: users, traffic, storage, bandwidth, servers. DAU 10M maan raha hoon..." Har step ke baad ruk ke conclusion: "...to 30k peak reads, ek DB nahi sambhalega, cache lagayenge." Poora estimate 3-5 minute mein khatam karo; interview ka asli time design pe jaana chahiye.` },

    { type: 'diagram', title: 'Recipe ki poori picture: xyz.com comments', height: 400,
      groups: [
        { label: 'Recipe ke 5 steps', x: 8, y: 40, w: 704, h: 120 },
        { label: 'Assumptions aur har step ka faisla', x: 8, y: 220, w: 704, h: 130 },
      ],
      nodes: [
        { id: 'users', label: 'Users', sub: '10M DAU', x: 76, y: 110, w: 120, kind: 'client', info: 'Ye kya hai: Step 1. 50M MAU × 20% = 10M DAU. Aage ka saara hisaab isi number se.' },
        { id: 'traffic', label: 'Traffic', sub: '30k reads/s peak', x: 218, y: 110, w: 120, kind: 'server', info: 'Ye kya hai: Step 2. 10M × 5 = 50M writes/din → 500/s, peak 1.5k/s. Reads 20× = 1B/din → 10k/s, peak 30k/s.' },
        { id: 'storage', label: 'Storage', sub: '300 TB total', x: 360, y: 110, w: 120, kind: 'data', info: 'Ye kya hai: Step 3. 50M × 1 KB = 50 GB/din → × 400 = 20 TB/saal → × 5 saal × 3 replicas = 300 TB.' },
        { id: 'bw', label: 'Bandwidth', sub: '30 MB/s peak', x: 502, y: 110, w: 120, kind: 'net', info: 'Ye kya hai: Step 4. 30k reads/s × 1 KB = 30 MB/s ≈ 240 Mbps egress. Ingress sirf 1.5k × 1 KB = 1.5 MB/s.' },
        { id: 'servers', label: 'Servers', sub: '~24 app servers', x: 644, y: 110, w: 120, kind: 'server', info: 'Ye kya hai: Step 5. (1.5k + 30k) ÷ 2,000 × 1.5 ≈ 24 servers.' },
        { id: 'assume', label: 'Assumptions', sub: 'peak ×3, 1 KB', x: 76, y: 290, w: 120, kind: 'client', info: 'Ye kya hai: wo andaze jo zor se bole aur likhe: DAU/MAU 20%, 5 comments/user, read:write 20:1, peak ×3, 1 KB, 5 saal, 3 replicas. Interviewer koi badle to sirf us step se aage dobara.' },
        { id: 'cache', label: 'Cache', sub: '+ read replicas', x: 218, y: 290, w: 120, kind: 'cache', info: 'Ye kya hai: Step 2 ka faisla. 20:1 read-heavy aur 30k reads/s: ek DB akela nahi jhelega. Redis cache ~20% hot data (~200 GB) + read replicas.' },
        { id: 'shard', label: 'Sharding', sub: '300 TB ≫ 5 TB', x: 360, y: 290, w: 120, kind: 'data', info: 'Ye kya hai: Step 3 ka faisla. Ek DB ka comfortable size ~1-5 TB; 300 TB ke liye data kai machines mein baanto, aur purana data archive karo.' },
        { id: 'cdn', label: 'CDN baad mein', sub: 'text chhota hai', x: 502, y: 290, w: 120, kind: 'edge', info: 'Ye kya hai: Step 4 ka faisla. 240 Mbps text ke liye CDN zaroori nahi. Agar comments mein photos aayein (500 KB) to 15 GB/s: tab CDN + object storage.' },
        { id: 'lb', label: 'LB + 3 zones', sub: '8 per zone', x: 644, y: 290, w: 120, kind: 'net', info: 'Ye kya hai: Step 5 ka faisla. 24 servers Load Balancer ke peeche, 3 availability zones mein 8-8, taaki ek zone gire to site chale.' },
      ],
      edges: [
        { a: 'users', b: 'traffic', n: 1 },
        { a: 'traffic', b: 'storage', n: 2 },
        { a: 'storage', b: 'bw', n: 3 },
        { a: 'bw', b: 'servers', n: 4 },
        { a: 'assume', b: 'users', dashed: true },
        { a: 'traffic', b: 'cache', kind: 'evt' },
        { a: 'storage', b: 'shard', kind: 'evt' },
        { a: 'bw', b: 'cdn', kind: 'evt' },
        { a: 'servers', b: 'lb', kind: 'evt' },
      ],
      paths: [
        { name: 'Recipe', text: 'Users → traffic → storage → bandwidth → servers. Har step pichle ka output use karta hai.', go: ['assume>users>traffic>storage>bw>servers'] },
        { name: 'Faisle', text: 'Har number ke neeche ek faisla: cache + replicas, sharding, CDN abhi nahi, 24 servers 3 zones mein.', go: ['traffic>cache', 'storage>shard', 'bw>cdn', 'servers>lb'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Hamesha same order: users → traffic → storage → bandwidth → servers.</li>
      <li>DAU se shuru karo; sirf MAU mile to DAU ≈ 20-50% of MAU.</li>
      <li>Traffic: per day ÷ 10^5 = average QPS, × 2-5 = peak. Reads aur writes alag; ratio cache ka faisla karta hai.</li>
      <li>Storage: per day × 400 × saal × 3 replicas. Media alag gino, wo object storage mein jaata hai.</li>
      <li>Bandwidth: QPS × size; Gbps mein aaye to CDN. Bytes × 8 = bits.</li>
      <li>Servers: peak ÷ ek server ki capacity × 1.5, kam se kam 2, 3 zones mein. Connections: online users ÷ ~100k.</li>
      <li>Sirf wahi estimate karo jo design badle, aur har step ke baad conclusion zor se bolo.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Fixed order: kuch chhootta nahi (replicas, peak, media)', 'Har step ek design decision deta hai, random maths nahi', 'Assumption badle to sirf ek step dobara', 'Interviewer ko tumhari soch saaf dikhti hai'], costs: ['Assumptions (peak factor, size, ratio) galat to sab galat: isliye unhe bol ke likho', 'Rough numbers asli capacity planning (load test, real metrics) ki jagah nahi le sakte', 'Recipe pe zyada time lagaya to design ke liye time kam', '"20% hot" aur "×1.5" jaise rules har system pe fit nahi, ye starting point hain'] },

    { type: 'think', questions: [
      { q: 'xyz.com ka ek analytics feature har page view pe ek event likhta hai: 1B events/day, har event 200 B, aur koi user events padhta nahi (sirf raat ko batch report). Recipe chalao. Kya cache chahiye?', a: '1B ÷ 10^5 = 10k writes/s, peak ~30k/s. Storage 1B × 200 B = 200 GB/day → 80 TB/year. Reads almost zero, to cache bekaar. Ye write-heavy hai: events queue/Kafka mein daalo, write-optimised ya columnar/analytics store mein batch mein likho. Read:write ratio ne poora design palat diya.' },
      { q: 'Interviewer bolta hai "peak 3× nahi, IPL final pe 10×". Recipe mein kya kya badlega?', a: 'Sirf traffic ke peak numbers aur unse nikle servers aur bandwidth. Storage nahi badlega (total data same, bas jaldi aaya). Servers ~3.3× zyada, ya pre-scaling/autoscaling ka plan. Isliye assumptions alag likhte hain: ek badla, sirf dependent steps dobara.' },
      { q: 'Estimate ne 2 app servers bataye aur ek 50 GB DB. Kya fir bhi Load Balancer aur replica lagaoge?', a: 'Haan, lekin capacity ke liye nahi, availability ke liye. 2 servers LB ke peeche taaki ek gire to site chale, aur DB ki ek replica failover ke liye. Estimate scale ka sawaal answer karta hai; SPOF hatana alag requirement hai.' },
    ]},
    { type: 'quiz', questions: [
      { q: '5 steps ka sahi order?', options: ['Servers → storage → users → traffic → bandwidth', 'Users → traffic → storage → bandwidth → servers', 'Storage → users → servers → traffic → bandwidth'], answer: 1, explain: 'Har step pichle ka output use karta hai: users se traffic, traffic se storage aur bandwidth, aur peak traffic se servers.' },
      { q: '20M DAU, har user 10 reads/day. Average read QPS?', options: ['~200/s', '~2,000/s', '~20,000/s'], answer: 1, explain: '20M × 10 = 2 × 10^8 reads/day ÷ 10^5 = 2,000/s. Peak ×3 ≈ 6,000/s.' },
      { q: '100 GB/day naya data, 5 saal, 3 replicas. Total?', options: ['~150 TB', '~600 TB', '~1.8 PB'], answer: 1, explain: '100 GB × 400 = 40 TB/year × 5 = 200 TB × 3 replicas = 600 TB.' },
      { q: 'Peak 40k req/s, ek server 2k req/s. Kitne servers (headroom ke saath)?', options: ['20', '30', '60'], answer: 1, explain: '40k ÷ 2k = 20 × 1.5 = 30, phir 3 zones mein 10-10.' },
      { q: 'App ke 40M MAU hain aur log hafte mein 2-3 baar aate hain. DAU ka sahi andaza?', options: ['40M', '~8-12M', '~1M'], answer: 1, explain: 'Hafte mein kuch baar aane wale apps ka DAU ≈ 20-30% of MAU: 8-12M. MAU ko DAU maanna traffic ko kai guna badha deta hai.' },
      { q: '30 MB/s egress kitne Mbps hai?', options: ['30 Mbps', '240 Mbps', '3.75 Mbps'], answer: 1, explain: 'Bytes × 8 = bits: 30 × 8 = 240 Mbps.' },
      { q: 'Estimate se pata chala egress 20 GB/s hai (photos). Sabse important conclusion?', options: ['Zyada app servers', 'CDN aur object storage', 'Database sharding'], answer: 1, explain: 'Bada egress = media ko CDN edges se serve karo, files object storage mein. App servers aur DB ko ye bytes chhoone hi nahi chahiye.' },
    ]},
    { type: 'sources', note: 'Recipe, shortcuts aur xyz.com wale ballpark numbers roadmap ke Phase 4 se. Neeche ke sources se kuch facts cross-check kiye.', items: [
      { title: 'Amazon EC2 On-Demand Pricing: Data Transfer', publisher: 'AWS', official: true, url: 'https://aws.amazon.com/ec2/pricing/on-demand/', used: 'Data coming in from the internet is not charged, data going out (egress) is charged per GB: why big egress means a big bill and a CDN.' },
      { title: 'Regions and Availability Zones', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html', used: 'What an availability zone is; spreading servers across zones.' },
      { title: 'Pareto principle', publisher: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Pareto_principle', used: 'The 80/20 rule of thumb behind "cache ~20% of daily read data".' },
    ]},
  ],
});
