Lesson.register({
  id: 'estimation-recipe',
  title: 'A 5-step estimation recipe',
  minutes: 27,
  summary: `You know the numbers. Now use them in a fixed order: users → traffic → storage → bandwidth → servers. After each step you say a design conclusion, because that conclusion is the whole point of estimation. Each step has a small worked example and its own calculator, and then a full estimator shows all the formulas together.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `In the last lesson you learned the numbers. Now the question is: <strong>in what order</strong> do we use them?<br>Think of a recipe card: first, how many people will come (users); then how many times they will click (traffic); then how much data will pile up (storage); then how much data we must send (bandwidth); and at the end, how many computers we need (servers).<br>After each step you say a one-line decision: "we need a cache", "one database is enough", "no CDN yet". In this lesson every step comes with a small example and a calculator.` },

    { type: 'h2', text: 'The problem: we have numbers, but no order' },
    { type: 'p', html: `In the last lesson we learned 15 numbers. But in an interview, when the interviewer says "design a comments feature for xyz.com, 10 million daily users", people often start from a random place: sometimes storage, sometimes servers, sometimes bandwidth. Along the way units get mixed (per day vs per second), replicas are forgotten, and at the end a big number appears that means nothing.` },
    { type: 'p', html: `The solution: a <strong>recipe</strong>. The same 5 steps every time, in the same order. Each step uses the output of the step before it, so nothing is missed.` },
    { type: 'ascii', text: `
 1. USERS        DAU
      │
      v
 2. TRAFFIC      writes/s, reads/s (avg and peak), read:write ratio
      │
      v
 3. STORAGE      per day → per year → total (years × replicas)
      │
      v
 4. BANDWIDTH    QPS × payload size (in and out)
      │
      v
 5. SERVERS      peak QPS ÷ capacity of one server × 1.5 headroom
      │
      v
    DESIGN CONCLUSION  (cache? sharding? CDN? how many servers?)`, caption: 'After each step, say the conclusion in one line.' },

    { type: 'h2', text: 'Step 1: Users' },
    { type: 'p', html: `Always start with <strong>daily active users</strong>. If you are only given monthly users, DAU is usually <strong>20-50%</strong> of MAU. Social and chat apps that people open every day are at the top end, and occasional apps (travel booking, tax filing) are at the bottom end.` },
    { type: 'callout', tone: 'term', title: 'New words: DAU and MAU', html: `<strong>What it is:</strong> <strong>DAU</strong> (Daily Active Users) = how many <em>different</em> people open the app in one day. <strong>MAU</strong> (Monthly Active Users) = how many different people in one month. A user who came 3 times in a month counts once in MAU, but appears in DAU only on those 3 days. So DAU is always less than or equal to MAU.<br><strong>Why we need it:</strong> traffic happens every day, so the maths starts from DAU. Companies often report MAU, so you have to work out DAU.<br><strong>Without it:</strong> if you treat MAU as daily users, the traffic comes out 2-5 times too high, and you buy servers you do not need.` },
    { type: 'code', text: `
xyz.com: 50 million MAU, people come a few times a week → DAU ≈ 20% × 50M = 10M DAU` },
    { type: 'p', html: `Try it: enter the MAU and use the slider to choose how "daily" the app is:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>MAU (millions)</label><input class="er1M" type="number" value="50" min="0" step="1"></div>
          <div><label>DAU / MAU: <strong class="er1PV"></strong></label><input class="er1P" type="range" min="5" max="80" step="5" value="20"></div>
        </div>
        <div class="stats"><div class="stat"><span>DAU</span><strong class="er1D"></strong></div><div class="stat"><span>Type of app</span><strong class="er1T"></strong></div></div>
        <div class="calc-note er1N"></div>`;
      const upd = () => {
        const m = Math.max(0, Number(el.querySelector('.er1M').value) || 0), pc = Number(el.querySelector('.er1P').value), d = m * pc / 100;
        el.querySelector('.er1PV').textContent = pc + '%';
        el.querySelector('.er1D').textContent = (+d.toPrecision(3)) + 'M';
        el.querySelector('.er1T').textContent = pc >= 50 ? 'daily use (chat, social)' : pc >= 20 ? 'a few times a week' : 'once in a while (travel, tax)';
        el.querySelector('.er1N').textContent = `DAU = ${m}M × ${pc}% = ${+d.toPrecision(3)}M. All the next maths runs on this number.`;
      };
      ['.er1M', '.er1P'].forEach(c => el.querySelector(c).addEventListener('input', upd)); upd();
    }},

    { type: 'h2', text: 'Step 2: Traffic' },
    { type: 'p', html: `We count two kinds of traffic separately, because each one needs a different design: <strong>writes</strong> (creating new data: a post, a comment, a like) and <strong>reads</strong> (looking at data: a feed, a profile).` },
    { type: 'code', text: `
Writes/day = DAU × writes per user     →  avg write QPS = writes/day ÷ 10^5
Reads/day  = DAU × reads per user      →  avg read QPS  = reads/day ÷ 10^5
Peak QPS   = avg QPS × 2 to 5   (10+ for live events)

xyz.com: 10M DAU × 5 comments = 50M writes/day  → 500/s avg  → 1,500/s peak (×3)
         reads 20× writes     = 1B reads/day    → 10k/s avg  → 30k/s peak` },
    { type: 'callout', tone: 'term', title: 'New word: Read:write ratio', html: `<strong>What it is:</strong> how many reads there are for each write. 20:1 means a comment is written once and read 20 times.<br><strong>Why we need it:</strong> this is the biggest signal for the design. <strong>Many reads</strong> (10:1 or more) → cache and read replicas. <strong>Many writes</strong> (logging, metrics, chat messages) → write-optimised storage, queues, sharding.<br><strong>Without it:</strong> if you treat reads and writes as one "traffic", you either forget the cache or put it in the wrong place.` },
    { type: 'callout', tone: 'term', title: 'New word: Peak factor', html: `<strong>What it is:</strong> traffic at the busiest time ÷ average traffic. Normal apps ×2 to ×5. A cricket final or a flash sale ×10 or even more.<br><strong>Why we need it:</strong> you need servers for the peak. The bigger the peak factor, the more <em>empty capacity</em> sits idle the rest of the time (money), or else you need <strong>autoscaling</strong> (adding and removing servers automatically based on load).<br><strong>Without it:</strong> you plan for the average, and every day at the busy time the site is slow.` },
    { type: 'p', html: `The calculator for step 2. The default is the xyz.com comments example:` },
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
        el.querySelector('.er2N').textContent = (r >= 10 ? `Read-heavy (${r}:1): cache and read replicas. ` : r <= 2 ? `Write-heavy (${r}:1): focus on the write path (queue, sharding). ` : `Mixed (${r}:1). `) + (wq * pk > 10000 ? 'Peak writes above 10k/s: one SQL node is not enough.' : 'Peak writes are within the range of one SQL primary.');
      };
      ['.er2D', '.er2W', '.er2R', '.er2P'].forEach(c => el.querySelector(c).addEventListener('input', upd)); upd();
    }},

    { type: 'h2', text: 'Step 3: Storage' },
    { type: 'code', text: `
Daily storage  = writes/day × size per write
Yearly         = daily × 400
Total          = yearly × years kept × 3 replicas

xyz.com: 50M × 1 KB = 50 GB/day → × 400 = 20 TB/year → × 5 years × 3 = 300 TB` },
    { type: 'p', html: `Keep two things in mind. (1) <strong>Replicas</strong>: we keep 3 copies of the data (to survive failures), so we need 3× the disk. Forgetting this is the most common mistake. (2) <strong>Count media separately</strong>: a photo or video is often ~100× bigger than its metadata, and it goes to a different place (object storage). Do not mix a 1 KB comment and a 500 KB photo into one "size".` },
    { type: 'callout', tone: 'term', title: 'New word: Replication factor', html: `<strong>What it is:</strong> how many copies of each piece of data you keep on different machines. Usually 3.<br><strong>Why we need it:</strong> disks die and machines fail. With 3 copies, the data survives even if one or two are lost (the "Replication" lesson).<br><strong>Without it (if you forget it in the maths):</strong> your disk estimate is 3 times too small, and a few months after launch you run out of space.` },
    { type: 'callout', tone: 'term', title: 'New word: Retention', html: `<strong>What it is:</strong> how many years the data must be kept. A 5-year retention means 5 years of data on disk.<br><strong>Why we need it:</strong> total storage = per year × number of years. Old data is often moved (archived) to cheaper "cold" storage, so the main database stays small.<br><strong>Without it:</strong> you plan for only one year, and in the third year the database bursts.` },
    { type: 'p', html: `The calculator for step 3. It counts media (photos) and text separately, as it should:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Writes per day (millions)</label><input class="er3W" type="number" value="50" min="0" step="1"></div>
          <div><label>Text/metadata per write (KB)</label><input class="er3S" type="number" value="1" min="0" step="0.1"></div>
          <div><label>% of writes with a photo: <strong class="er3MV"></strong></label><input class="er3M" type="range" min="0" max="100" step="5" value="0"></div>
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
        el.querySelector('.er3MV').textContent = mp + '%'; el.querySelector('.er3YV').textContent = yr + ' years'; el.querySelector('.er3RV').textContent = rf;
        el.querySelector('.er3D').textContent = by(day); el.querySelector('.er3T').textContent = by(tot);
        el.querySelector('.er3MD').textContent = by(mday); el.querySelector('.er3MT').textContent = by(mtot);
        el.querySelector('.er3F').textContent = `text : ${n(w)} writes × ${kb} KB = ${by(day)}/day → × 400 = ${by(yearB)}/year → × ${yr} × ${rf} = ${by(tot)}\nmedia: ${mp}% × ${n(w)} × ${ms} KB = ${by(mday)}/day → total ${by(mtot)}`;
        el.querySelector('.er3N').textContent = (tot >= 5e12 ? `Text ${by(tot)}: bigger than one DB's ~1-5 TB → sharding or archiving. ` : tot >= 1e12 ? `Text ${by(tot)}: the upper range of one DB, watch the growth. ` : `Text ${by(tot)}: fits easily in one database. `) + (mday > 0 ? `Media ${by(mday)}/day: not in the DB but in object storage (like S3), served through a CDN.` : '');
      };
      ['.er3W', '.er3S', '.er3M', '.er3MS', '.er3Y', '.er3R'].forEach(c => el.querySelector(c).addEventListener('input', upd)); upd();
    }},

    { type: 'h2', text: 'Step 4: Bandwidth' },
    { type: 'code', text: `
Ingress (data coming in)   = write QPS × payload size
Egress  (data going out)   = read QPS  × payload size

xyz.com peak: 30k reads/s × 1 KB = 30 MB/s ≈ 240 Mbps  → small, no CDN needed for text
If every read were a 500 KB photo: 30k × 500 KB = 15 GB/s → impossible without a CDN` },
    { type: 'callout', tone: 'term', title: 'New words: Ingress and egress', html: `<strong>What it is:</strong> <strong>ingress</strong> = data coming from users towards your servers (uploads, posts). <strong>Egress</strong> = data going from your servers to users (pages, images, videos).<br><strong>Why we need it:</strong> both the network pipe and the bill depend on it. Cloud providers usually charge for egress (ingress is usually free).<br><strong>Without it:</strong> if you forget the egress of a photo or video app, the network chokes, and at the end of the month there is a big bill. Big egress = "put it on a CDN".` },
    { type: 'p', html: `The calculator for step 4. Remember: networks are measured in bits, so MB/s × 8 = Mbps.` },
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
          <div class="stat"><span>In one month</span><strong class="er4M"></strong></div>
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
        el.querySelector('.er4N').textContent = `${q.toLocaleString('en-US')}/s × ${kb} KB = ${by(avg)}/s. Peak × ${pk} = ${bits(peak)}. ` + (peak * 8 >= 1e10 ? 'More than ten Gbps: impossible without a CDN. Files in object storage, served to users from CDN edges.' : peak * 8 >= 1e9 ? 'Gbps range: add a CDN; both the load on the origin and the bill will go down.' : 'Small: the app servers can send it themselves. A CDN only for static files (JS, images).');
      };
      ['.er4Q', '.er4S', '.er4P'].forEach(c => el.querySelector(c).addEventListener('input', upd)); upd();
    }},

    { type: 'h2', text: 'Step 5: Servers' },
    { type: 'code', text: `
Servers = peak QPS ÷ capacity of one server × 1.5 headroom
Then spread them over at least 2-3 availability zones.
For connections: concurrent users ÷ connections per gateway

xyz.com: (1,500 + 30,000) ÷ 2,000 × 1.5 ≈ 24 app servers → 3 zones × 8` },
    { type: 'p', html: `The capacity of one server comes from the table in the last lesson: a simple API does 1k-10k req/s, but for requests that do real work (DB calls, logic) assume 1k-2k. We keep <strong>1.5× headroom</strong> so that each server runs at ~65%, so the other two zones (at almost full capacity) can carry the load if one zone fails, and so the site still works when some servers are stopped during a deploy.` },

    { type: 'p', html: `The calculator for step 5. It has two modes: normal requests (HTTP), and long connections (WebSocket apps like chat or live scores), where you count "how many people are connected at the same time":` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px" class="er5Mode"></div>
        <div class="row2">
          <div><label class="er5L1"></label><input class="er5Q" type="number" value="31500" min="0" step="500"></div>
          <div><label class="er5L2"></label><input class="er5C" type="number" value="2000" min="1" step="100"></div>
          <div><label>Headroom: <strong class="er5HV"></strong></label><input class="er5H" type="range" min="1" max="2" step="0.1" value="1.5"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>For the work</span><strong class="er5A"></strong></div>
          <div class="stat"><span>With headroom</span><strong class="er5B"></strong></div>
          <div class="stat"><span>Over 3 zones</span><strong class="er5Z"></strong></div>
        </div>
        <div class="calc-note er5N"></div>`;
      const MODES = [['Requests (HTTP)', 'Peak QPS (reads + writes)', 'Capacity of one server (req/s)', 31500, 2000], ['Connections (WebSocket)', 'Users online at the same time', 'Connections per gateway', 100000000, 100000]];
      let mode = 0;
      const drawMode = () => { const box = el.querySelector('.er5Mode'); box.innerHTML = ''; MODES.forEach((m, k) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (k === mode ? ' on' : ''); b.textContent = m[0]; b.onclick = () => { mode = k; el.querySelector('.er5Q').value = m[3]; el.querySelector('.er5C').value = m[4]; drawMode(); upd(); }; box.appendChild(b); }); el.querySelector('.er5L1').textContent = MODES[mode][1]; el.querySelector('.er5L2').textContent = MODES[mode][2]; };
      const upd = () => {
        const q = Math.max(0, Number(el.querySelector('.er5Q').value) || 0), c = Math.max(1, Number(el.querySelector('.er5C').value) || 1), h = Number(el.querySelector('.er5H').value);
        const raw = q / c, withH = Math.max(2, Math.ceil(raw * h - 1e-9)), z = Math.ceil(withH / 3) * 3, f = x => x.toLocaleString('en-US');
        el.querySelector('.er5HV').textContent = '×' + h.toFixed(1);
        el.querySelector('.er5A').textContent = f(+raw.toPrecision(3));
        el.querySelector('.er5B').textContent = f(withH);
        el.querySelector('.er5Z').textContent = f(z) + ' (3 × ' + f(z / 3) + ')';
        el.querySelector('.er5N').textContent = `${f(q)} ÷ ${f(c)} = ${f(+raw.toPrecision(3))}; × ${h.toFixed(1)} = ${f(withH)} (at least 2, so if one fails the other keeps running); equal over 3 zones = ${f(z)}.` + (mode === 1 ? ' You also need a registry that remembers which user is connected to which gateway, so a message reaches the right gateway.' : '');
      };
      ['.er5Q', '.er5C', '.er5H'].forEach(k => el.querySelector(k).addEventListener('input', upd)); drawMode(); upd();
    }},

    { type: 'h2', text: 'The full estimator: try it yourself' },
    { type: 'p', html: `All 5 steps in one place. Change any input and watch every formula change, and see when the design conclusion below flips. Start with the presets, then enter your own numbers.` },
    { type: 'custom', render(el) {
      const F = [
        ['erDau', 'DAU (millions)', 10, 0.1],
        ['erW', 'Writes per user per day', 5, 0.1],
        ['erRw', 'Read:write ratio (reads per write)', 20, 1],
        ['erSz', 'Object size (KB)', 1, 0.1],
        ['erYr', 'Retention (years)', 5, 1],
        ['erRf', 'Replication factor', 3, 1],
        ['erPk', 'Peak multiplier', 3, 1],
        ['erSv', 'Capacity of one server (req/s)', 2000, 100],
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
        if (rw >= 10) C.push(`Read:write ${rw}:1 → read-heavy. Add a cache and read replicas on the DB.`);
        else if (rw <= 2) C.push(`Read:write only ${rw}:1 → write-heavy. Focus on the write path: queue, a write-optimised store (like Cassandra), sharding.`);
        else C.push(`Read:write ${rw}:1 → mixed. A cache will help, but plan for the writes too.`);
        if (wp > 10000) C.push(`Peak writes ${n(wp)}/s → more than one SQL node (~5k-20k simple writes/s) handles comfortably. Shard the writes or use a store like Cassandra.`);
        else if (wp > 5000) C.push(`Peak writes ${n(wp)}/s → close to the limit of one SQL primary (5k-20k). Keep a sharding plan ready.`);
        else C.push(`Peak writes ${n(wp)}/s → one database primary will handle it easily.`);
        const media = kb >= 100;
        if (media) C.push(`The object is ${kb} KB: this is media. Files go to object storage (like S3), only metadata (~1 KB) in the DB. The ${by(sTot)} of storage goes to object storage, not the DB.`);
        if (rp > 20000) C.push(media ? `Peak media reads ${n(rp)}/s → CDN edges serve them; only misses reach the origin.` : `Peak reads ${n(rp)}/s → one DB node cannot handle this alone. A cache is a must, plus replicas.`);
        if (media) {}
        else if (sTot >= 5e12) C.push(`Total storage ${by(sTot)} → far bigger than the comfortable size of one DB (~1-5 TB). Sharding or archiving is needed.`);
        else if (sTot >= 1e12) C.push(`Total storage ${by(sTot)} → the upper range of one DB. Watch the growth, think about archiving.`);
        else C.push(`Total storage ${by(sTot)} → fits easily in one database.`);
        if (outP >= 1e9) C.push(`Peak egress ${by(outP)}/s → very big. Serve this content from a CDN (and object storage if it is media).`);
        C.push(`${srv} app servers, in at least 3 zones. ` + (media ? `Hot media ~${by(cache)}: this is a job for CDN edges, not Redis.` : `Cache ~${by(cache)}${cache > 1e11 ? ': it will not fit in the RAM of one machine, you need several cache nodes (Redis Cluster)' : ''}.`));
        el.querySelector('.erC').innerHTML = C.map(c => '<li>' + c + '</li>').join('');
      };
      F.forEach(f => el.querySelector('#' + f[0]).addEventListener('input', upd));
      upd();
    }},
    { type: 'callout', tone: 'tip', title: 'Where does the "20% hot" cache come from?', html: `In most apps a small part of the data gets most of the traffic (today's trending posts, popular profiles). This is often called the <strong>80/20 rule</strong>: ~20% of the data gets ~80% of the reads. So a rough cache size = 20% of one day's read data. This is more like an <em>upper bound</em>: in reality many reads are for the same items, so the unique data is even smaller.` },

    { type: 'p', html: `Press the "Twitter-like text" preset: you get all the numbers of the roadmap's worked example (4k/12k writes, 200k/600k reads, 400 GB/day, 160 TB/year, 2.4 PB). It shows 184 servers because the estimator adds reads <em>and</em> writes; the roadmap takes only reads (600k ÷ 5k × 1.5 = 180). A 2% difference, the same conclusion. The next lesson goes through this whole example in detail.` },

    { type: 'h2', text: 'What breaks when the estimate is wrong' },
    { type: 'p', html: `The estimate for xyz.com comments is the one above: 10k reads/s average, 30k at peak. Three teams planned in three different ways. Play each scenario:` },
    { type: 'flow', height: 300,
      nodes: [
        { id: 'u', label: 'Users', sub: '10M DAU', x: 80, y: 150, w: 130, kind: 'client', info: 'What it is: the 10 million daily users (DAU) of xyz.com. Most of them come at 9 pm (peak ≈ 3× average).' },
        { id: 'lb', label: 'Load Balancer', x: 255, y: 150, w: 140, kind: 'net', info: 'What it is: the box that shares incoming requests across many app servers. How many servers sit behind it is the question of step 5.' },
        { id: 'app', label: 'App servers', sub: 'fleet', x: 445, y: 150, w: 150, kind: 'server', meter: true, load: 40, info: 'What it is: the computers that run the page/API code. Each server does ~2,000 req/s of real work. How many we need: peak QPS ÷ 2,000 × 1.5.' },
        { id: 'cache', label: 'Redis cache', sub: '~200 GB hot', x: 625, y: 60, w: 160, kind: 'cache', info: 'What it is: a fast store kept in RAM. Why it is here: reads:writes is 20:1, so the cache takes most of the reads. Size estimate: ~20% of one day\'s read data.' },
        { id: 'db', label: 'Database', sub: '5k-20k ops/s', x: 625, y: 240, w: 160, kind: 'data', meter: true, load: 30, info: 'What it is: the real, permanent data of the comments. One SQL node does ~5k-20k simple ops/s. 30k peak reads is far more than that, so we need a cache and replicas.' },
      ],
      edges: [{ a: 'u', b: 'lb' }, { a: 'lb', b: 'app' }, { a: 'app', b: 'cache' }, { a: 'app', b: 'db' }],
      scenarios: [
        { name: 'Correct estimate', steps: [
          { title: 'Plan for the peak', text: '30k peak reads + 1.5k writes ÷ 2,000 × 1.5 ≈ 24 servers. Even at 9 pm each server is at ~65%.', flood: { paths: ['u>lb>app'], n: 10 }, after: { app: { load: 65, sub: '24 servers, ~65%' } }, msg: '(1,500 + 30,000) ÷ 2,000 × 1.5 ≈ 24' },
          { title: 'The cache takes most reads', text: 'We saw read-heavy (20:1) and added a cache. Say the hit rate is 90%: 27k of the 30k reads come from Redis.', go: ['app>cache', 'res:cache>app'], after: { cache: { state: 'hit', sub: '~27k/s HIT' } } },
          { title: 'The DB is relaxed', text: 'Only ~3k reads + 1.5k writes reach the DB. Within the range of one node.', go: ['app>db', 'res:db>app'], after: { db: { load: 40, state: 'ok', sub: '~4.5k ops/s' } } },
          { title: 'Happy users', go: 'res:app>lb>u', text: 'The estimate told us what we need, and we built exactly that.' },
        ]},
        { name: 'Planned on average (failure)', intro: 'The team looked at the 10k average and forgot the peak factor.', steps: [
          { title: 'All fine during the day', text: '10k ÷ 2,000 × 1.5 ≈ 8 servers. In the afternoon ~65% load, everything green.', flood: { paths: ['u>lb>app'], n: 5 }, after: { app: { load: 65, sub: '8 servers' } } },
          { title: '9 pm: peak ×3', text: '30k requests/s arrive, capacity is 16k. Requests wait in line, latency shoots up, timeouts.', flood: { paths: ['u>lb>app'], n: 16 }, after: { app: { load: 100, state: 'hot', sub: 'overloaded' } } },
          { title: 'The site goes down every night', text: 'The servers were for the average, but users come at the peak. Fix: always count servers from the <strong>peak</strong> QPS (or use autoscaling that scales up before the peak).', go: 'bad:app>lb>u', after: { u: { state: 'down', sub: 'errors' } } },
        ]},
        { name: 'Ignored read:write (failure)', intro: 'The team counted servers correctly, but thought "we have a DB anyway" and added no cache.', steps: [
          { title: 'There is no cache', text: 'All 30k peak reads go straight to the DB.', set: { cache: { state: 'dim', sub: 'not added' } }, flood: { paths: ['app>db'], n: 14 }, after: { db: { load: 100, state: 'hot', sub: '31.5k ops/s!' } } },
          { title: 'The DB chokes', text: 'One SQL node does ~5k-20k ops/s. At 31.5k, queries slow down and connections fill up. The app servers also get stuck waiting for the DB.', go: 'bad:db>app>lb>u', after: { app: { state: 'warn', sub: 'waiting on DB' } } },
          { title: 'Fix', text: 'The 20:1 read:write ratio had already told us: cache and read replicas. The point of the estimate was not the number, it was this conclusion.', focus: ['cache', 'db'] },
        ]},
      ],
    },

    { type: 'h2', text: 'Only estimate what changes the design' },
    { type: 'callout', tone: 'why', title: 'Decide', html: `<strong>Only estimate what changes the design.</strong> Say the conclusion after every number. If reads are 200k/s, the conclusion is: "one database cannot serve this; we need a cache and replicas". Say this line out loud. That is the point of the maths. A number that does not touch any decision (like the bandwidth of the login API when it is 1 MB/s) should be skipped or finished in one line.` },
    { type: 'table', head: ['If the number says this', 'Then the design does this'], rows: [
      ['Read:write ≥ 10:1', 'Cache + read replicas'],
      ['Peak writes > ~10k/s', 'One SQL node is not enough: shard, or use a write-optimised store like Cassandra'],
      ['Total data > ~5 TB', 'Sharding or archiving'],
      ['Very big egress (GB/s)', 'CDN; media in object storage'],
      ['Hundreds of thousands of concurrent connections', 'A fleet of gateways (~100k each) + a user → gateway registry'],
      ['Everything small (< 1k/s, < 1 TB)', 'A simple setup: 2 servers + one DB + a replica. Do not over-engineer'],
    ]},

    { type: 'h2', text: 'Rules for rounding' },
    { type: 'list', items: [
      `<strong>One or two significant digits.</strong> 86,400 → 10^5. 365 → 400. 1,157/s → "~1k/s". 183.6 servers → "~180-200".`,
      `<strong>Think in powers of ten.</strong> 2 × 10^8 users × 10^2 reads = 2 × 10^10 reads/day. Add the exponents; do not count zeros one by one.`,
      `<strong>A unit with every number.</strong> "/s", "/day", "GB", "GB/s". A number without a unit is the fastest way to go wrong in an interview.`,
      `<strong>When in doubt, round in one direction.</strong> Round capacity (storage, servers) up a little, so you get headroom.`,
      `<strong>Say your assumptions out loud.</strong> "I am assuming the peak is 3× and one post is 1 KB." If the interviewer changes an assumption, just redo that step.`,
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `(1) <strong>Forgetting replicas</strong>: 160 TB/year for 5 years = 800 TB, but with 3 copies it is 2.4 PB. (2) <strong>Mixing media and metadata</strong>: taking the average of a 1 KB post and a 500 KB photo. They go to different stores, so count them separately. (3) <strong>Counting servers on the average</strong>: forget the peak factor and the site falls over every day at the busy time. (4) <strong>Bits/bytes</strong>: 600 MB/s = 4.8 Gbps, not 600 Mbps.` },
    { type: 'callout', tone: 'tip', title: 'How to say it in an interview', html: `"I will go in 5 steps: users, traffic, storage, bandwidth, servers. I am assuming 10M DAU..." After each step, pause and give the conclusion: "...so 30k peak reads; one DB will not handle it, so we add a cache." Finish the whole estimate in 3-5 minutes; the real interview time should go to the design.` },

    { type: 'diagram', title: 'The full picture of the recipe: xyz.com comments', height: 400,
      groups: [
        { label: 'The 5 steps of the recipe', x: 8, y: 40, w: 704, h: 120 },
        { label: 'Assumptions and the decision of each step', x: 8, y: 220, w: 704, h: 130 },
      ],
      nodes: [
        { id: 'users', label: 'Users', sub: '10M DAU', x: 76, y: 110, w: 120, kind: 'client', info: 'What it is: step 1. 50M MAU × 20% = 10M DAU. All the next maths runs on this number.' },
        { id: 'traffic', label: 'Traffic', sub: '30k reads/s peak', x: 218, y: 110, w: 120, kind: 'server', info: 'What it is: step 2. 10M × 5 = 50M writes/day → 500/s, peak 1.5k/s. Reads 20× = 1B/day → 10k/s, peak 30k/s.' },
        { id: 'storage', label: 'Storage', sub: '300 TB total', x: 360, y: 110, w: 120, kind: 'data', info: 'What it is: step 3. 50M × 1 KB = 50 GB/day → × 400 = 20 TB/year → × 5 years × 3 replicas = 300 TB.' },
        { id: 'bw', label: 'Bandwidth', sub: '30 MB/s peak', x: 502, y: 110, w: 120, kind: 'net', info: 'What it is: step 4. 30k reads/s × 1 KB = 30 MB/s ≈ 240 Mbps of egress. Ingress is only 1.5k × 1 KB = 1.5 MB/s.' },
        { id: 'servers', label: 'Servers', sub: '~24 app servers', x: 644, y: 110, w: 120, kind: 'server', info: 'What it is: step 5. (1.5k + 30k) ÷ 2,000 × 1.5 ≈ 24 servers.' },
        { id: 'assume', label: 'Assumptions', sub: 'peak ×3, 1 KB', x: 76, y: 290, w: 120, kind: 'client', info: 'What it is: the guesses you say out loud and write down: DAU/MAU 20%, 5 comments per user, read:write 20:1, peak ×3, 1 KB, 5 years, 3 replicas. If the interviewer changes one, redo only from that step.' },
        { id: 'cache', label: 'Cache', sub: '+ read replicas', x: 218, y: 290, w: 120, kind: 'cache', info: 'What it is: the decision of step 2. 20:1 read-heavy and 30k reads/s: one DB alone cannot handle it. A Redis cache for ~20% hot data (~200 GB) + read replicas.' },
        { id: 'shard', label: 'Sharding', sub: '300 TB ≫ 5 TB', x: 360, y: 290, w: 120, kind: 'data', info: 'What it is: the decision of step 3. The comfortable size of one DB is ~1-5 TB; for 300 TB, split the data over many machines and archive old data.' },
        { id: 'cdn', label: 'CDN later', sub: 'text is small', x: 502, y: 290, w: 120, kind: 'edge', info: 'What it is: the decision of step 4. A CDN is not needed for 240 Mbps of text. If comments had photos (500 KB) it would be 15 GB/s: then a CDN + object storage.' },
        { id: 'lb', label: 'LB + 3 zones', sub: '8 per zone', x: 644, y: 290, w: 120, kind: 'net', info: 'What it is: the decision of step 5. 24 servers behind a Load Balancer, 8 in each of 3 availability zones, so the site keeps running if one zone fails.' },
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
        { name: 'Recipe', text: 'Users → traffic → storage → bandwidth → servers. Each step uses the output of the one before.', go: ['assume>users>traffic>storage>bw>servers'] },
        { name: 'Decisions', text: 'Under every number, one decision: cache + replicas, sharding, no CDN yet, 24 servers over 3 zones.', go: ['traffic>cache', 'storage>shard', 'bw>cdn', 'servers>lb'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Always the same order: users → traffic → storage → bandwidth → servers.</li>
      <li>Start from DAU; if you only get MAU, DAU ≈ 20-50% of MAU.</li>
      <li>Traffic: per day ÷ 10^5 = average QPS, × 2-5 = peak. Reads and writes separately; the ratio decides the cache.</li>
      <li>Storage: per day × 400 × years × 3 replicas. Count media separately; it goes to object storage.</li>
      <li>Bandwidth: QPS × size; if it comes out in Gbps, use a CDN. Bytes × 8 = bits.</li>
      <li>Servers: peak ÷ capacity of one server × 1.5, at least 2, over 3 zones. Connections: online users ÷ ~100k.</li>
      <li>Only estimate what changes the design, and say the conclusion out loud after every step.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['A fixed order: nothing is missed (replicas, peak, media)', 'Every step gives a design decision, not random maths', 'If an assumption changes, only one step is redone', 'The interviewer can clearly see how you think'], costs: ['If the assumptions (peak factor, size, ratio) are wrong, everything is wrong: so say them and write them down', 'Rough numbers cannot replace real capacity planning (load tests, real metrics)', 'Spending too long on the recipe leaves less time for the design', 'Rules like "20% hot" and "×1.5" do not fit every system; they are starting points'] },

    { type: 'think', questions: [
      { q: 'An analytics feature of xyz.com writes one event for every page view: 1B events/day, each event 200 B, and no user reads the events (only a nightly batch report). Run the recipe. Do we need a cache?', a: '1B ÷ 10^5 = 10k writes/s, peak ~30k/s. Storage 1B × 200 B = 200 GB/day → 80 TB/year. Reads are almost zero, so a cache is useless. This is write-heavy: put events into a queue/Kafka and write them in batches to a write-optimised or columnar/analytics store. The read:write ratio flipped the whole design.' },
      { q: 'The interviewer says "the peak is not 3×; on IPL final day it is 10×". What changes in the recipe?', a: 'Only the peak traffic numbers, and the servers and bandwidth that come from them. Storage does not change (the total data is the same, it just arrives faster). About 3.3× more servers, or a plan for pre-scaling/autoscaling. That is why assumptions are written separately: change one, redo only the steps that depend on it.' },
      { q: 'The estimate says 2 app servers and a 50 GB DB. Would you still add a Load Balancer and a replica?', a: 'Yes, but for availability, not capacity. 2 servers behind an LB so the site runs if one fails, and one DB replica for failover. The estimate answers the question of scale; removing SPOFs is a separate requirement.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'The correct order of the 5 steps?', options: ['Servers → storage → users → traffic → bandwidth', 'Users → traffic → storage → bandwidth → servers', 'Storage → users → servers → traffic → bandwidth'], answer: 1, explain: 'Each step uses the output of the one before: traffic from users, storage and bandwidth from traffic, and servers from peak traffic.' },
      { q: '20M DAU, each user does 10 reads/day. Average read QPS?', options: ['~200/s', '~2,000/s', '~20,000/s'], answer: 1, explain: '20M × 10 = 2 × 10^8 reads/day ÷ 10^5 = 2,000/s. Peak ×3 ≈ 6,000/s.' },
      { q: '100 GB of new data per day, 5 years, 3 replicas. Total?', options: ['~150 TB', '~600 TB', '~1.8 PB'], answer: 1, explain: '100 GB × 400 = 40 TB/year × 5 = 200 TB × 3 replicas = 600 TB.' },
      { q: 'Peak 40k req/s, one server does 2k req/s. How many servers (with headroom)?', options: ['20', '30', '60'], answer: 1, explain: '40k ÷ 2k = 20 × 1.5 = 30, then 10 in each of 3 zones.' },
      { q: 'An app has 40M MAU and people come 2-3 times a week. A good estimate of DAU?', options: ['40M', '~8-12M', '~1M'], answer: 1, explain: 'For apps used a few times a week, DAU ≈ 20-30% of MAU: 8-12M. Treating MAU as DAU makes the traffic many times too big.' },
      { q: 'How many Mbps is 30 MB/s of egress?', options: ['30 Mbps', '240 Mbps', '3.75 Mbps'], answer: 1, explain: 'Bytes × 8 = bits: 30 × 8 = 240 Mbps.' },
      { q: 'The estimate shows egress is 20 GB/s (photos). The most important conclusion?', options: ['More app servers', 'CDN and object storage', 'Database sharding'], answer: 1, explain: 'Big egress = serve media from CDN edges, keep files in object storage. The app servers and DB should not touch these bytes at all.' },
    ]},
    { type: 'sources', note: 'The recipe, shortcuts and xyz.com ballpark numbers come from Phase 4 of the roadmap. Some facts were cross-checked with the sources below.', items: [
      { title: 'Amazon EC2 On-Demand Pricing: Data Transfer', publisher: 'AWS', official: true, url: 'https://aws.amazon.com/ec2/pricing/on-demand/', used: 'Data coming in from the internet is not charged, data going out (egress) is charged per GB: why big egress means a big bill and a CDN.' },
      { title: 'Regions and Availability Zones', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html', used: 'What an availability zone is; spreading servers across zones.' },
      { title: 'Pareto principle', publisher: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Pareto_principle', used: 'The 80/20 rule of thumb behind "cache ~20% of daily read data".' },
    ]},
  ],
});
