Lesson.register({
  id: 'estimation-examples',
  title: 'Worked examples',
  minutes: 30,
  summary: `Teen asli-jaise sawaal, recipe ke saath poore hal kiye: Twitter-jaisa feed, WhatsApp-style chat connections, aur 3 crore logon ke liye live cricket score. Har example recipe ke saare steps (users → QPS → peak → storage → bandwidth → servers) se guzarta hai, aur sliders roadmap ke numbers pe set hain. Unhe hilao aur dekho kab design palat-ta hai: kab sharding, kab CDN, kab hazaar gateways.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Ab tak tumne numbers aur recipe seekhi. Ab unhe teen asli jaise apps pe chalate hain: ek feed app, ek chat app, aur ek live cricket score.<br>Teeno mein hisaab ka tareeka same hai, lekin har baar ek <strong>alag number</strong> sabse bada nikalta hai, aur wahi number batata hai ki kaunsa component lagana hai.<br>Har example mein sliders hain. Unhe hilao aur dekho kab "ek server kaafi" se "hazaar servers" ho jaata hai, aur kab ek CDN sab bacha leta hai.` },
    { type: 'p', html: `Pichle lesson mein recipe seekhi: users → traffic → storage → bandwidth → servers, aur har step ke baad ek conclusion. Ab teen alag tarah ke systems pe chalate hain. Teeno ka "bottleneck" alag hai: pehle mein <strong>reads aur storage</strong>, doosre mein <strong>connections</strong>, teesre mein <strong>ek hi pal mein karodon same requests</strong>. Yahi dikhata hai ki napkin maths design ko kaise <em>chunta</em> hai.` },
    { type: 'callout', tone: 'tip', title: 'Pehle khud try karo', html: `Har example ka sawaal padh ke 3 minute khud kaagaz pe hisaab lagao, phir neeche se milao. Yaad rakho: 1 din ≈ 10^5 s, 1 saal ≈ 400 din, peak ≈ 3×, headroom 1.5×.` },

    { type: 'h2', text: 'Example 1: Twitter-jaisa feed' },
    { type: 'p', html: `<strong>Sawaal:</strong> xyz.com ek Twitter-jaisa app bana raha hai. <strong>200M DAU</strong>. Har user din mein <strong>2 posts</strong> karta hai aur <strong>100 posts dekhta</strong> hai. Ek post (text + metadata) ~1 KB. 10% posts mein ~500 KB ki image. Data 5 saal, 3 replicas. Peak 3×. Ek app server ~5k req/s.` },
    { type: 'table', head: ['Step', 'Maths', 'Result aur conclusion'], rows: [
      ['Write QPS', '200M × 2 / 10^5', '≈ 4k/s, peak ≈ 12k/s. Ek SQL node jitna aaram se leta hai usse zyada: shard karo, ya Cassandra'],
      ['Read QPS', '200M × 100 / 10^5', '≈ 200k/s, peak ≈ 600k/s. Read:write 50:1 hai, to heavy caching aur feeds pehle se bana ke (precompute) rakho'],
      ['Text storage', '400M × 1 KB', '400 GB/day ≈ 160 TB/year; × 5 years × 3 replicas ≈ 2.4 PB. Sharding mandatory'],
      ['Media', '10% with 500 KB image', '40M × 500 KB = 20 TB/day. Object storage plus CDN'],
      ['App servers', '600k ÷ 5k × 1.5', '≈ 180 servers, 3 zones mein'],
    ], caption: 'Roadmap ka worked example, as-is. Neeche ka calculator isi table ko users se servers tak poore steps mein dikhata hai, aur har assumption badal sakte ho.' },
    { type: 'callout', tone: 'term', title: 'Naya word: Precompute feed (fan-out on write)', html: `<strong>Ye kya hai:</strong> har user ki feed (post IDs ki list) pehle se bana ke cache mein rakhna. Jab koi post karta hai, tabhi uske har follower ki feed list mein us post ka ID daal dete hain. Isse <strong>fan-out on write</strong> kehte hain ("fan-out" = ek cheez ka kai jagah phail jaana).<br><strong>Kyun chahiye:</strong> feed kholte waqt 500 logon ke posts dhoondh ke sort karna 200k/s pe bahut mehenga hai. Ab padhna bas ek list uthana hai. Likhna thoda mehenga, padhna bahut sasta; 50:1 read:write mein ye sauda faayde ka hai.<br><strong>Iske bina:</strong> har feed request pe kai shards pe query aur sorting: 600k/s peak pe database ghut jaayega. (Celebrity jinke crore followers hain, unke liye ulta karte hain: unke posts padhte waqt jodte hain. Twitter ke engineers ne 2013 ke ek talk mein yahi tareeka bataya tha. Ye "Instagram / Twitter feed" design lesson mein detail mein.)` },
    { type: 'p', html: `Ab sliders hilao. Har cheez roadmap ke numbers pe set hai. Dekho kaunsa conclusion kab palat-ta hai: DAU 20M karo to sharding ki zaroorat? Media 0% karo to CDN?` },

    { type: 'custom', render(el) {
      const S = [
        ['exDau', 'DAU (millions)', 10, 500, 10, 200, 'r'],
        ['exPo', 'Posts per user per day', 1, 10, 1, 2, 'r'],
        ['exVw', 'Posts viewed per user per day', 10, 500, 10, 100, 'r'],
        ['exMp', 'Posts with image (%)', 0, 50, 1, 10, 'r'],
        ['exKb', 'Post size (KB)', 0.1, 10, 0.1, 1, 'n'],
        ['exImg', 'Image size (KB)', 10, 5000, 10, 500, 'n'],
        ['exYr', 'Years kept', 1, 20, 1, 5, 'n'],
        ['exRf', 'Replicas', 1, 5, 1, 3, 'n'],
        ['exPk', 'Peak multiplier', 1, 10, 1, 3, 'n'],
        ['exSv', 'Ek app server (req/s)', 500, 20000, 500, 5000, 'n'],
      ];
      el.innerHTML = `<div class="row2">${S.map(s => s[6] === 'r'
          ? `<div><label for="${s[0]}">${s[1]}: <strong class="${s[0]}V"></strong></label><input id="${s[0]}" type="range" min="${s[2]}" max="${s[3]}" step="${s[4]}" value="${s[5]}"></div>`
          : `<div><label for="${s[0]}">${s[1]}</label><input id="${s[0]}" type="number" min="${s[2]}" max="${s[3]}" step="${s[4]}" value="${s[5]}"></div>`).join('')}</div>
        <div style="margin-top:10px"><button type="button" class="btn small ghost exReset">Roadmap ke numbers pe wapas</button></div>
        <div style="overflow-x:auto;margin-top:12px"><table class="exT" style="width:100%;border-collapse:collapse;font-size:14px"></table></div>
        <div class="calc-note exN"></div>`;
      const n = v => v >= 1e9 ? +(v / 1e9).toPrecision(3) + 'B' : v >= 1e6 ? +(v / 1e6).toPrecision(3) + 'M' : v >= 1e3 ? +(v / 1e3).toPrecision(3) + 'k' : (+v.toPrecision(3)).toString();
      const by = b => { const u = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB']; let i = 0; while (b >= 1000 && i < u.length - 1) { b /= 1000; i++; } return (+b.toPrecision(3)) + ' ' + u[i]; };
      const val = id => Math.max(0, Number(el.querySelector('#' + id).value) || 0);
      const upd = () => {
        S.filter(s => s[6] === 'r').forEach(s => { el.querySelector('.' + s[0] + 'V').textContent = s[0] === 'exDau' ? val(s[0]) + 'M' : s[0] === 'exMp' ? val(s[0]) + '%' : val(s[0]); });
        const dau = val('exDau') * 1e6, po = val('exPo'), vw = val('exVw'), mp = val('exMp') / 100, kb = val('exKb'), img = val('exImg'), yr = val('exYr'), rf = val('exRf'), pk = val('exPk'), sv = val('exSv');
        const wDay = dau * po, rDay = dau * vw, wq = wDay / 1e5, rq = rDay / 1e5, wp = wq * pk, rp = rq * pk;
        const ratio = po ? vw / po : 0;
        const tDay = wDay * kb * 1e3, tYr = tDay * 400, tTot = tYr * yr * rf;
        const mCnt = wDay * mp, mDay = mCnt * img * 1e3;
        const mEg = rp * mp * img * 1e3;
        const srv = sv ? Math.ceil(rp / sv * 1.5 - 1e-9) : 0;
        const wC = wp > 10000 ? 'Ek SQL node jitna aaram se leta hai usse zyada: shard karo, ya Cassandra' : wp > 5000 ? 'Ek SQL primary ki limit ke paas: sharding ka plan ready rakho' : 'Ek primary DB (replica ke saath) writes sambhal lega';
        const rC = (ratio >= 10 ? `Read:write ${n(ratio)}:1 hai, to heavy caching aur precomputed feeds` : `Read:write sirf ${n(ratio)}:1: cache madad karega, lekin writes bhi utne hi important`) + (rp > 20000 ? '. Ek DB ye reads nahi jhel sakta' : '. Ek DB + replicas bhi chal jaayega');
        const tC = tTot >= 5e12 ? 'Sharding mandatory' : tTot >= 1e12 ? 'Ek DB ki upper range: archiving/sharding ka plan' : 'Ek database mein aa jaayega';
        const mC = mp === 0 ? 'Koi media nahi: object storage/CDN ki zaroorat nahi' : mDay >= 1e12 ? 'Object storage plus CDN' : 'Object storage; CDN abhi optional (phir bhi sasta faayda)';
        const rows = [
          ['Users', `${n(dau)} DAU`, `writes/day = ${n(dau)} × ${po} = ${n(wDay)}; reads/day = ${n(dau)} × ${vw} = ${n(rDay)}`],
          ['Write QPS', `${n(dau)} × ${po} / 10^5`, `≈ ${n(wq)}/s, peak ≈ ${n(wp)}/s. ${wC}`],
          ['Read QPS', `${n(dau)} × ${vw} / 10^5`, `≈ ${n(rq)}/s, peak ≈ ${n(rp)}/s. ${rC}`],
          ['Text storage', `${n(wDay)} × ${kb} KB`, `${by(tDay)}/day ≈ ${by(tYr)}/year; × ${yr} years × ${rf} replicas ≈ ${by(tTot)}. ${tC}`],
          ['Media', `${Math.round(mp * 100)}% with ${img} KB image`, `${n(mCnt)} × ${img} KB = ${by(mDay)}/day. ${mC}`],
          ['Text egress (peak)', `${n(rp)} × ${kb} KB`, `≈ ${by(rp * kb * 1e3)}/s ≈ ${n(rp * kb * 8e3 / 1e9)} Gbps. ${rp * kb * 8e3 >= 1e10 ? 'Bada: kai servers aur zones mein baant ke' : 'App servers sambhal lenge'}`],
          ['Media egress (peak)', `${n(rp)} × ${Math.round(mp * 100)}% × ${img} KB`, `≈ ${by(mEg)}/s${mEg >= 1e9 ? ': app servers se possible nahi, CDN edges se' : ''}`],
          ['App servers', `${n(rp)} ÷ ${n(sv)} × 1.5`, `≈ ${srv} servers across 3 zones (${Math.ceil(srv / 3)} per zone)`],
        ];
        el.querySelector('.exT').innerHTML = rows.map((r, i) => `<tr style="border-top:1px solid var(--line)"><td style="padding:8px 6px;font-weight:700;color:var(--ink);vertical-align:top">${r[0]}</td><td style="padding:8px 6px;font-family:var(--f-mono);font-size:12.5px;color:var(--ink-2);vertical-align:top">${r[1]}</td><td style="padding:8px 6px;color:var(--ink);vertical-align:top">${r[2]}</td></tr>`).join('');
        el.querySelector('.exN').textContent = 'Media egress wali line roadmap table mein nahi hai; ye maan ke nikaali hai ki har dekhi gayi image-post ki image ek baar download hoti hai.';
      };
      S.forEach(s => el.querySelector('#' + s[0]).addEventListener('input', upd));
      el.querySelector('.exReset').onclick = () => { S.forEach(s => { el.querySelector('#' + s[0]).value = s[5]; }); upd(); };
      upd();
    }},

    { type: 'p', html: `Numbers ne jo bataya, wahi architecture ban gaya: 180 app servers, ek feed cache, sharded posts store, aur media ke liye object storage + CDN. Chala ke dekho har box kis number ki wajah se hai:` },
    { type: 'flow', height: 340,
      nodes: [
        { id: 'u', label: 'Users', sub: '200M DAU', x: 80, y: 175, w: 130, kind: 'client', info: 'Ye kya hai: app ke 200M daily users. Ye 400M posts/day likhte hain, 20B posts/day padhte hain.' },
        { id: 'cdn', label: 'CDN', sub: 'images', x: 270, y: 55, w: 140, kind: 'edge', info: 'Ye kya hai: duniya bhar mein users ke paas rakhe servers jo files ki copy rakhte hain. Peak pe ~30 GB/s images. Ye bytes app servers chhoo bhi nahi sakte; duniya bhar ke CDN edges serve karte hain.' },
        { id: 'app', label: 'App servers', sub: '~180, 3 zones', x: 270, y: 175, w: 150, kind: 'server', meter: true, load: 60, info: 'Ye kya hai: feed/post ka code chalane wale computers. 600k peak reads ÷ 5k per server × 1.5 headroom ≈ 180. Stateless, Load Balancer ke peeche (diagram mein ek box).' },
        { id: 'obj', label: 'Object storage', sub: '20 TB/day', x: 490, y: 55, w: 170, kind: 'data', info: 'Ye kya hai: badi files rakhne ka sasta, lagbhag bina limit ka store (S3 jaisa). Har din ~40M images × 500 KB = 20 TB. Files yahan (S3 jaisa), DB mein sirf unka URL/ID. CDN miss pe yahin se image uthata hai.' },
        { id: 'cache', label: 'Feed cache', sub: 'precomputed feeds', x: 490, y: 175, w: 170, kind: 'cache', info: 'Ye kya hai: RAM mein rakhi har user ki ready-made feed (post IDs ki list). 50:1 read:write ki wajah se. 600k peak reads/s ka zyada tar hissa yahin khatam.' },
        { id: 'db', label: 'Posts DB', sub: 'sharded, 2.4 PB', x: 490, y: 295, w: 170, kind: 'data', meter: true, load: 35, info: 'Ye kya hai: posts ka asli, pakka record. 12k writes/s peak aur 2.4 PB: ek machine kabhi nahi. Bahut saare shards (ya Cassandra cluster), shard key jaise post_id/user_id.' },
      ],
      edges: [{ a: 'u', b: 'cdn' }, { a: 'u', b: 'app' }, { a: 'app', b: 'cache' }, { a: 'app', b: 'db' }, { a: 'app', b: 'obj' }, { a: 'cdn', b: 'obj' }],
      scenarios: [
        { name: 'Post likho', steps: [
          { title: 'Riya post karti hai (image ke saath)', text: '12k writes/s peak mein se ek.', go: 'u>app', msg: 'POST /posts { text, image }' },
          { title: 'Image object storage mein', text: '500 KB file object storage mein; DB mein sirf uska key.', go: ['app>obj', 'res:obj>app'], msg: 'PUT img/9f3a.jpg  (500 KB)' },
          { title: 'Post ka record shard pe', text: '~1 KB ka record, apne shard pe.', go: ['app>db', 'res:db>app'], msg: 'INSERT post 777 (shard = hash(post_id) % N)' },
          { title: 'Followers ki feeds update (fan-out)', text: 'Riya ke followers ki feed lists mein post 777 add. Likhna mehenga, lekin isi se padhna sasta.', go: 'app>cache', after: { cache: { sub: '+777 in 300 feeds' } } },
        ]},
        { name: 'Feed padho', steps: [
          { title: 'Feed kholi', text: '600k/s peak mein se ek.', go: 'u>app', msg: 'GET /feed' },
          { title: 'Ready-made feed cache se', text: 'Koi sorting, koi join nahi. Bas list uthao.', go: ['app>cache', 'res:cache>app'], set: { db: { state: 'dim' } }, after: { cache: { state: 'hit', sub: 'HIT' } } },
          { title: 'Text wapas, images CDN se', text: 'Response mein image URLs hain. Browser images seedhe CDN se laata hai: app servers pe 30 GB/s ka bojh nahi.', parallel: true, go: ['res:app>u', 'u>cdn', 'res:cdn>u'], after: { cdn: { state: 'hit', sub: 'HIT' } } },
        ]},
        { name: 'CDN miss', steps: [
          { title: 'Nayi image, edge pe nahi', text: 'Abhi abhi post hui image kisi edge pe pehli baar maangi gayi.', go: 'u>cdn', after: { cdn: { state: 'miss', sub: 'MISS' } } },
          { title: 'Edge origin se laata hai', text: 'CDN object storage se image uthata hai aur apne paas rakh leta hai.', go: ['cdn>obj', 'res:obj>cdn'] },
          { title: 'Agle lakhon views edge se', text: 'Ek miss, phir sab hits.', go: 'res:cdn>u', after: { cdn: { state: 'hit', sub: 'cached' } } },
        ]},
        { name: 'Feed cache down (failure)', intro: 'Cache ne DB ko 600k/s se bachaya hua tha. Ab?', steps: [
          { title: 'Feed cache gir gaya', text: 'Saari feeds gayab.', set: { cache: { state: 'down', sub: 'DOWN' } }, go: 'lost:app>cache' },
          { title: '600k/s DB pe', text: 'Ab har feed DB se banana padega: har request pe kai shards se posts laao, sort karo. Shards ghut jaate hain.', flood: { paths: ['app>db'], n: 16 }, after: { db: { load: 100, state: 'hot', sub: 'overloaded' } } },
          { title: 'Sabak', text: 'Jo cache 50:1 ratio ki wajah se aaya, wo ab critical hai. Isliye cache replicated aur multi-zone hota hai, aur gire to app <strong>degraded mode</strong> mein (sirf recent posts, kam items) chalta hai, poore DB pe toot nahi padta.', go: 'bad:app>u', focus: ['cache', 'db'] },
        ]},
      ],
    },

    { type: 'h2', text: 'Example 2: WhatsApp-style chat connections' },
    { type: 'p', html: `<strong>Sawaal:</strong> xyz.com Chat. Peak pe <strong>100M users online</strong>, aur har ek ka phone ek <strong>WebSocket</strong> khula rakhta hai taaki message turant aa sake. Kitne servers?` },
    { type: 'p', html: `Yahan QPS sawaal hi nahi hai. Ek online user zyada tar time kuch nahi bhejta, bas connection khula rakhta hai. Bottleneck hai <strong>kitne connections ek saath khule rakh sakte hain</strong>. Recipe ka Step 5 ka doosra formula: concurrent users ÷ connections per gateway.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Gateway (connection server)', html: `<strong>Ye kya hai:</strong> wo server jisse users ke phones ka lamba <strong>WebSocket</strong> connection juda rehta hai (WebSocket = ek connection jo khula rehta hai, taaki server kabhi bhi message bhej sake; "Polling, SSE, WebSockets" lesson yaad karo). Ye business logic kam karta hai; iska kaam lakhon idle connections ko zinda rakhna aur message aate hi sahi connection pe dhakel dena.<br><strong>Kyun chahiye:</strong> 100M khule connections kisi ek machine pe nahi aa sakte. Ek gateway ~50k-500k idle connections rakh sakta hai; estimate mein <strong>100k</strong> maano.<br><strong>Iske bina:</strong> ya to har message ke liye phone baar baar poochhe (polling: bahut bojh, der se message), ya ek machine pe sab (namumkin).` },
    { type: 'code', text: `
Gateways = 100M ÷ 100k per gateway ≈ 1,000 gateway servers
Plus: ek registry jo bataaye "user → kis gateway pe hai", taaki message route ho sake.` },
    { type: 'callout', tone: 'why', title: 'Registry kyun zaroori hai?', html: `Riya gateway #7 pe judi hai, Aman gateway #842 pe. Riya ka message #7 pe aaya. #7 ko kaise pata ki Aman kahan hai? 1,000 gateways se poochhna ("Aman tumhare paas hai?") har message pe impossible. Isliye ek <strong>registry</strong> (in-memory key-value store, jaise Redis) rakhte hain: <code>aman → gw-842</code>. Connect pe entry likho, disconnect pe hatao, har message pe ek lookup.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="waOn">Online users at peak: <strong class="waOnV"></strong></label><input id="waOn" type="range" min="1" max="500" step="1" value="100"></div>
          <div><label for="waPer">Connections per gateway: <strong class="waPerV"></strong></label><input id="waPer" type="range" min="10000" max="500000" step="10000" value="100000"></div>
          <div><label for="waRc">Crash ke baad reconnect window (s)</label><input id="waRc" type="number" min="1" max="600" step="1" value="10"></div>
          <div><label for="waEnt">Registry entry size (bytes)</label><input id="waEnt" type="number" min="10" max="1000" step="10" value="100"></div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"><button type="button" class="chip waHr">Headroom ×1.5: OFF</button></div>
        <div class="stats">
          <div class="stat"><span>Gateways</span><strong class="waG"></strong></div>
          <div class="stat"><span>Registry</span><strong class="waR"></strong></div>
          <div class="stat"><span>Ek gateway crash = reconnects</span><strong class="waX"></strong></div>
        </div>
        <pre class="ascii waF" style="margin-top:12px;white-space:pre-wrap;font-size:12.5px"></pre>
        <div class="calc-note"><ul class="waC" style="margin:0;padding-left:20px"></ul></div>`;
      let hr = false;
      const n = v => v >= 1e9 ? +(v / 1e9).toPrecision(3) + 'B' : v >= 1e6 ? +(v / 1e6).toPrecision(3) + 'M' : v >= 1e3 ? +(v / 1e3).toPrecision(3) + 'k' : (+v.toPrecision(3)).toString();
      const by = b => { const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0; while (b >= 1000 && i < u.length - 1) { b /= 1000; i++; } return (+b.toPrecision(3)) + ' ' + u[i]; };
      const upd = () => {
        const on = Number(el.querySelector('#waOn').value) * 1e6, per = Number(el.querySelector('#waPer').value);
        const rc = Math.max(1, Number(el.querySelector('#waRc').value) || 1), ent = Math.max(1, Number(el.querySelector('#waEnt').value) || 1);
        el.querySelector('.waOnV').textContent = n(on);
        el.querySelector('.waPerV').textContent = n(per);
        const hb = el.querySelector('.waHr'); hb.className = 'chip waHr' + (hr ? ' on' : ''); hb.textContent = 'Headroom ×1.5: ' + (hr ? 'ON' : 'OFF');
        const g = Math.ceil(on / per * (hr ? 1.5 : 1) - 1e-9), each = on / g, reg = on * ent, rps = each / rc;
        el.querySelector('.waG').textContent = g.toLocaleString('en-US');
        el.querySelector('.waR').textContent = n(on) + ' entries, ~' + by(reg);
        el.querySelector('.waX').textContent = n(each) + ' users, ~' + n(rps) + '/s';
        el.querySelector('.waF').textContent =
`Gateways  = ${n(on)} ÷ ${n(per)} per gateway${hr ? ' × 1.5' : ''} = ${g.toLocaleString('en-US')}   ${g >= 3 ? '(3 zones × ~' + Math.ceil(g / 3).toLocaleString('en-US') + ')' : '(alag alag zones mein)'}
Registry  = ${n(on)} entries × ${ent} B = ${by(reg)}
Crash     = ek gateway ke ${n(each)} users ${rc} s mein reconnect = ~${n(rps)} naye connections/s baaki gateways pe`;
        const C = [];
        C.push(g <= 1 ? 'Sirf ek gateway: sab users ek hi machine pe, registry ki zaroorat nahi. Lekin wo machine SPOF hai, to kam se kam 2 rakho (aur tab registry chahiye).' : `${g.toLocaleString('en-US')} gateways: user kis gateway pe hai, ye kisi ko pata nahi jab tak registry na ho. Registry mandatory.`);
        if (per < 50000) C.push(`Sirf ${n(per)} connections per gateway: fleet bahut bada. Event-driven servers (epoll jaisa non-blocking I/O, ya Erlang/Go jaise runtimes) se ek machine pe zyada connections milte hain.`);
        C.push(reg > 1e11 ? `Registry ${by(reg)}: ek normal cache node ki RAM se bada, registry ko bhi shard karo (Redis Cluster jaisa).` : `Registry ${by(reg)}: RAM mein aaram se aata hai, lekin replicated rakho (har message isse guzarta hai).`);
        if (rps > 5000) C.push(`Crash pe ~${n(rps)} reconnects/s: ye "reconnect storm" hai. Clients random delay (jitter) ke saath reconnect karein, aur baaki gateways mein headroom ho.`);
        el.querySelector('.waC').innerHTML = C.map(c => '<li>' + c + '</li>').join('');
      };
      ['#waOn', '#waPer', '#waRc', '#waEnt'].forEach(s => el.querySelector(s).addEventListener('input', upd));
      el.querySelector('.waHr').onclick = () => { hr = !hr; upd(); };
      upd();
    }},
    { type: 'p', html: `Default pe: 100M ÷ 100k = <strong>1,000 gateways</strong>, roadmap jaisa hi. Registry entry ka ~100 B ek rough assumption hai (user ID + gateway ID + thoda overhead); us hisaab se registry ~10 GB, jo RAM mein aaram se aata hai. Headroom ON karo to 1,500: production mein yahi chahiye, kyunki ek gateway gira to uske 100k users ko kahin aur jaana hai. (100k ek safe estimate hai: Phoenix framework ki team ne 2015 ke ek benchmark mein ek bade server pe ~20 lakh idle WebSocket connections dikhaye the. Asli app mein har connection kuch kaam bhi karta hai, isliye kam maante hain.)` },

    { type: 'h3', text: 'Baaki recipe: messages, storage, bandwidth' },
    { type: 'p', html: `Connections se gateways nikle. Lekin recipe poori karo: kitne messages aate hain, kitna data jamaa hota hai, kitni bandwidth? Roadmap ye numbers nahi deta, to neeche ki saari values <strong>hamari assumptions</strong> hain (sab badal sakte ho). Default: peak pe har online user ghante mein ~30 messages, ek message (text + IDs + time) ~100 B, history 1 saal, 3 replicas.` },
    { type: 'custom', render(el) {
      const F = [['wmOn', 'Online users at peak (millions)', 100], ['wmPh', 'Messages per online user per hour', 30], ['wmSz', 'Message size (bytes)', 100], ['wmPk', 'Peak ÷ average', 3], ['wmYr', 'History kept (years)', 1], ['wmRf', 'Replicas', 3]];
      el.innerHTML = `<div class="row2">${F.map(f => `<div><label>${f[1]}</label><input class="${f[0]}" type="number" min="0" step="any" value="${f[2]}"></div>`).join('')}</div>
        <div class="stats">
          <div class="stat"><span>Messages/s peak / avg</span><strong class="wmQ"></strong></div>
          <div class="stat"><span>Messages per day</span><strong class="wmD"></strong></div>
          <div class="stat"><span>Storage total</span><strong class="wmS"></strong></div>
          <div class="stat"><span>Bandwidth peak (in)</span><strong class="wmB"></strong></div>
        </div>
        <pre class="ascii wmF" style="margin-top:12px;white-space:pre-wrap;font-size:12.5px"></pre>
        <div class="calc-note wmN"></div>`;
      const n = v => v >= 1e9 ? +(v / 1e9).toPrecision(3) + 'B' : v >= 1e6 ? +(v / 1e6).toPrecision(3) + 'M' : v >= 1e3 ? +(v / 1e3).toPrecision(3) + 'k' : (+v.toPrecision(3)).toString();
      const by = b => { const u = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB']; let i = 0; while (b >= 1000 && i < u.length - 1) { b /= 1000; i++; } return (+b.toPrecision(3)) + ' ' + u[i]; };
      const g = c => Math.max(0, Number(el.querySelector('.' + c).value) || 0);
      const upd = () => {
        const on = g('wmOn') * 1e6, ph = g('wmPh'), sz = g('wmSz'), pk = Math.max(1, g('wmPk')), yr = g('wmYr'), rf = g('wmRf');
        const peak = on * ph / 3600, avg = peak / pk, day = avg * 1e5, sDay = day * sz, tot = sDay * 400 * yr * rf, bw = peak * sz;
        el.querySelector('.wmQ').textContent = n(peak) + ' / ' + n(avg);
        el.querySelector('.wmD').textContent = n(day);
        el.querySelector('.wmS').textContent = by(tot);
        el.querySelector('.wmB').textContent = by(bw) + '/s';
        el.querySelector('.wmF').textContent =
`1 USERS     ${n(on)} online at peak
2 TRAFFIC   peak = ${n(on)} × ${ph}/hour ÷ 3,600 = ${n(peak)} msgs/s;  avg = ÷ ${pk} = ${n(avg)}/s
            per day = ${n(avg)} × 10^5 = ${n(day)} messages
3 STORAGE   ${n(day)} × ${sz} B = ${by(sDay)}/day → × 400 × ${yr} yr × ${rf} = ${by(tot)}
4 BANDWIDTH in = ${n(peak)} × ${sz} B = ${by(bw)}/s ≈ ${n(bw * 8 / 1e9)} Gbps  (1-to-1 chat mein out bhi utna hi)
5 SERVERS   gateways = ${n(on)} ÷ 100k = ${Math.ceil(on / 1e5).toLocaleString('en-US')}  (upar wala calculator)`;
        const C = [];
        C.push(peak > 1e5 ? `${n(peak)} messages/s peak: ek SQL database ke bas ka nahi. Write-heavy, key se padhna (chat_id + time): Cassandra jaisa wide-column, sharded store.` : `${n(peak)} messages/s: ek achha database (replicas ke saath) sambhal lega.`);
        C.push(tot >= 5e12 ? `Storage ${by(tot)}: sharding pakka. Ya WhatsApp jaisa design: deliver hote hi server se message hata do, tab storage bahut kam.` : `Storage ${by(tot)}: ek-do machines mein aa jaayega.`);
        C.push(`Bandwidth ${n(bw * 8 / 1e9)} Gbps: messages chhote hain, isliye network bottleneck nahi. Asli bottleneck connections (gateways) hai.`);
        el.querySelector('.wmN').innerHTML = '<ul style="margin:0;padding-left:20px">' + C.map(c => '<li>' + c + '</li>').join('') + '</ul>';
      };
      F.forEach(f => el.querySelector('.' + f[0]).addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Default pe: 100M × 30 ÷ 3,600 ≈ <strong>833k messages/s</strong> peak, ~278k/s average, ~28 billion messages/day. 100 B each = ~2.8 TB/day, aur 1 saal × 3 replicas = <strong>~3.3 PB</strong>. Bandwidth sirf ~83 MB/s (~0.67 Gbps). Sabak: chat mein teen alag numbers teen alag components chunte hain: connections → gateways, messages/s → write-heavy sharded store, aur bandwidth → koi khaas cheez nahi.` },

    { type: 'p', html: `1,000 gateways ka matlab design mein kya badla? Message ab "server ko bhejo" nahi, "pehle dhoondo kahan bhejna hai, phir bhejo" ho gaya. Chala ke dekho:` },
    { type: 'flow', height: 380,
      nodes: [
        { id: 'riya', label: 'Riya', sub: 'phone', x: 80, y: 70, w: 120, kind: 'client', info: 'Ye kya hai: message bhejne wali user. Riya ka phone gateway #7 se WebSocket se juda hai.' },
        { id: 'gwa', label: 'Gateway #7', sub: '~100k conns', x: 260, y: 70, w: 150, kind: 'server', meter: true, load: 60, info: 'Ye kya hai: connections sambhalne wala server, 1,000 gateways mein se ek. Riya samet ~100k phones isse jude hain. Message aane pe registry se poochhta hai ki receiver kahan hai.' },
        { id: 'gwb', label: 'Gateway #842', sub: '~100k conns', x: 460, y: 70, w: 150, kind: 'server', meter: true, load: 60, info: 'Ye kya hai: ek aur gateway (connection server). Aman ka phone is gateway se juda hai, isliye Aman ke messages isi ke through jaate hain.' },
        { id: 'aman', label: 'Aman', sub: 'phone', x: 640, y: 70, w: 120, kind: 'client', info: 'Ye kya hai: message ka receiver. Aman ka phone bhi ek gateway se WebSocket pe juda hai, lekin shayad Riya wale gateway se nahi. Isliye pehle registry se poochhna padta hai ki Aman kis gateway pe hai. Aman offline ho to message store mein rukta hai aur push notification jaata hai.' },
        { id: 'reg', label: 'Registry', sub: 'user → gateway', x: 260, y: 220, w: 160, kind: 'cache', info: 'Ye kya hai: ek address book jo batati hai kaunsa user kis gateway pe hai. In-memory key-value store: aman → gw-842. 100M entries, ~10 GB (rough). Connect pe likho, disconnect pe hatao. Har message pe ek lookup, isliye fast aur replicated hona chahiye.' },
        { id: 'gwc', label: 'Gateway #15', sub: 'spare capacity', x: 640, y: 220, w: 120, kind: 'server', info: 'Ye kya hai: ek aur gateway jisme headroom (khaali jagah) hai. Kisi gateway ke girne pe uske users yahan reconnect karte hain.' },
        { id: 'store', label: 'Inbox store', sub: 'offline msgs', x: 460, y: 330, w: 160, kind: 'data', info: 'Ye kya hai: offline users ke messages ka database. Jo receiver offline hai, uske messages yahan rukte hain. Phone online aate hi gateway inhe deliver kar deta hai.' },
      ],
      edges: [{ a: 'riya', b: 'gwa' }, { a: 'gwa', b: 'gwb' }, { a: 'gwb', b: 'aman' }, { a: 'gwa', b: 'reg' }, { a: 'gwb', b: 'reg' }, { a: 'gwa', b: 'store' }, { a: 'aman', b: 'gwc' }, { a: 'gwc', b: 'reg' }, { a: 'gwc', b: 'store' }, { a: 'gwa', b: 'gwc' }],
      scenarios: [
        { name: 'Message route', steps: [
          { title: 'Riya message bhejti hai', text: 'Khule WebSocket pe, turant.', go: 'riya>gwa', msg: '{ to: "aman", text: "match dekh raha hai?" }' },
          { title: 'Aman kahan hai?', text: 'Gateway #7 registry se poochhta hai.', go: ['gwa>reg', 'res:reg>gwa'], after: { reg: { state: 'hit', sub: 'aman → gw-842' } }, msg: 'GET conn:aman  →  gw-842' },
          { title: 'Sahi gateway tak', text: 'Gateways ke beech internal call. #842 Aman ke khule connection pe message dhakel deta hai.', go: 'gwa>gwb>aman', after: { aman: { state: 'ok', sub: 'message mila' } } },
        ]},
        { name: 'Aman offline', steps: [
          { title: 'Message aaya', text: 'Riya ne bheja.', go: 'riya>gwa' },
          { title: 'Registry: koi entry nahi', text: 'Aman ka phone band hai, to uski entry disconnect pe hata di gayi thi.', go: ['gwa>reg', 'bad:reg>gwa'], after: { reg: { state: 'miss', sub: 'aman: offline' } }, set: { aman: { state: 'dim', sub: 'offline' } } },
          { title: 'Inbox mein rakho', text: 'Message offline store mein. Aman online aayega, jis bhi gateway se judega wo inbox se uthake deliver karega.', go: 'gwa>store', after: { store: { sub: '1 msg for aman' } } },
        ]},
        { name: 'Gateway crash (failure)', intro: 'Gateway #842 ka hardware fail. Uske ~100k phones ka connection ek saath toota.', steps: [
          { title: '#842 gir gaya', text: '100k users ek pal mein disconnected.', set: { gwb: { state: 'down', sub: 'DOWN' } }, go: 'lost:gwb>aman' },
          { title: 'Reconnect storm', text: '100k phones turant reconnect karte hain. 10 second mein = ~10k naye connections/s baaki gateways pe. Isliye clients random delay (jitter) ke saath reconnect karte hain, aur gateways mein headroom chahiye.', flood: { paths: ['aman>gwc'], n: 12 }, after: { gwc: { state: 'warn', sub: 'reconnect storm' } } },
          { title: 'Registry update', text: 'Aman ab #15 pe hai. Nayi entry likhi. (Purani entry "gw-842" stale thi: isliye entries pe TTL/heartbeat rakhte hain.)', go: 'gwc>reg', after: { reg: { sub: 'aman → gw-15' }, gwc: { state: 'ok', sub: 'Aman yahan' } } },
          { title: 'Message phir se pahunchta hai', text: 'Riya ka agla message registry se naya address leta hai. Beech mein aaye messages inbox se deliver.', go: ['riya>gwa', 'gwa>reg', 'res:reg>gwa', 'gwa>gwc>aman'] },
        ]},
      ],
    },

    { type: 'h2', text: 'Example 3: Live cricket score, 30M viewers' },
    { type: 'p', html: `<strong>Sawaal:</strong> India-Pakistan match. xyz.com Live ki app pe <strong>3 crore (30M) log</strong> score dekh rahe hain. Har app <strong>har 5 second</strong> pe latest score maangti hai (polling). Kya chahiye?` },
    { type: 'callout', tone: 'term', title: 'Naya word: Polling', html: `<strong>Ye kya hai:</strong> app har kuch second pe server se poochhti hai "kuch naya hai?", chahe kuch badla ho ya nahi.<br><strong>Kyun yahan:</strong> sabse simple tareeka hai, aur normal HTTP GET hai, to CDN use cache kar sakta hai.<br><strong>Iske bina (push use kiya to):</strong> 30M khule WebSocket connections chahiye honge (Example 2 jaisa gateway fleet). Score jaise "sabke liye same" data ke liye polling + CDN aksar sasta padta hai.` },
    { type: 'code', text: `
30M ÷ 5 s = 6M requests/s

Apne servers se: 6M ÷ 5k per server × 1.5 ≈ 1,800 servers   (darawna!)
CDN se:          score JSON sabke liye SAME hai → edges ~1-2 s cache karein
                 → origin ko har edge se sirf kuch requests/s` },
    { type: 'p', html: `Yahi is example ka jaadu hai: <strong>"terrifying for your servers, trivial for a CDN"</strong>. Score har viewer ke liye bilkul same hai, koi personalisation nahi. To ek edge server ek baar origin se score laata hai, 1-2 second rakhta hai, aur us dauraan us area ke lakhon requests khud answer kar deta hai. Napkin maths ne architecture bata di.` },
    { type: 'table', head: ['Recipe step', 'Maths', 'Result aur conclusion'], rows: [
      ['1 Users', '30M viewers ek saath', 'Match ke time sab ek saath: yahi peak hai, alag se ×3 nahi'],
      ['2 Traffic', '30M ÷ 5 s', '6M requests/s. Sab reads, aur sabka jawab same'],
      ['3 Storage', '~300 balls × ~1 KB (assumption)', '~300 KB per match: na ke barabar. Storage yahan koi sawaal hi nahi'],
      ['4 Bandwidth', '6M/s × 1 KB', '6 GB/s ≈ 48 Gbps egress: apne data centre se bhejna mehenga, CDN edges se aasaan'],
      ['5 Servers', '6M ÷ 5k × 1.5', 'Bina CDN ~1,800 origin servers; CDN ke saath origin pe ~100 req/s = 2 servers (min, availability ke liye)'],
    ], caption: 'Poora recipe ek table mein. 1 KB JSON aur 300 balls hamari assumptions hain. Neeche ke calculator mein sab badal sakte ho.' },
    { type: 'callout', tone: 'term', title: 'Naye words: Origin aur TTL', html: `<strong>Ye kya hai:</strong> <strong>Origin</strong> = tumhara asli server jahan se CDN content uthata hai (yahan: score service). <strong>TTL</strong> (time to live) = CDN edge kisi response ko kitni der apne paas rakhe, phir origin se naya maange.<br><strong>Kyun chahiye:</strong> TTL 1 s matlab score max ~1 s purana (edge pe), aur har edge origin ko lagbhag 1 request/s bhejta hai. Lakhon viewers ka bojh origin tak pahunchta hi nahi.<br><strong>Iske bina:</strong> TTL 0 (cache nahi) = har request origin tak = 6M/s. TTL bahut lamba (1 minute) = score purana, chauka laga aur app ko minute baad pata chala.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="ckV">Viewers: <strong class="ckVV"></strong></label><input id="ckV" type="range" min="1" max="100" step="1" value="30"></div>
          <div><label for="ckP">Poll interval: <strong class="ckPV"></strong></label><input id="ckP" type="range" min="1" max="30" step="1" value="5"></div>
          <div><label for="ckT">CDN TTL: <strong class="ckTV"></strong></label><input id="ckT" type="range" min="1" max="10" step="1" value="1"></div>
          <div><label for="ckE">CDN edge locations (assumption)</label><input id="ckE" type="number" min="1" max="2000" step="10" value="100"></div>
          <div><label for="ckS">Score JSON size (KB, assumption)</label><input id="ckS" type="number" min="0.1" max="100" step="0.1" value="1"></div>
          <div><label for="ckSv">Ek origin server (req/s)</label><input id="ckSv" type="number" min="100" max="50000" step="100" value="5000"></div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"><button type="button" class="chip ckCdn"></button><button type="button" class="chip ckBust"></button></div>
        <div class="stats">
          <div class="stat"><span>Client requests</span><strong class="ckQ"></strong></div>
          <div class="stat"><span>Origin pe requests</span><strong class="ckO"></strong></div>
          <div class="stat"><span>Origin servers</span><strong class="ckN"></strong></div>
          <div class="stat"><span>Score max purana</span><strong class="ckSt"></strong></div>
        </div>
        <pre class="ascii ckF" style="margin-top:12px;white-space:pre-wrap;font-size:12.5px"></pre>
        <div class="calc-note ckC"></div>`;
      let cdn = true, bust = false;
      const n = v => v >= 1e9 ? +(v / 1e9).toPrecision(3) + 'B' : v >= 1e6 ? +(v / 1e6).toPrecision(3) + 'M' : v >= 1e3 ? +(v / 1e3).toPrecision(3) + 'k' : (+v.toPrecision(3)).toString();
      const by = b => { const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0; while (b >= 1000 && i < u.length - 1) { b /= 1000; i++; } return (+b.toPrecision(3)) + ' ' + u[i]; };
      const upd = () => {
        const v = Number(el.querySelector('#ckV').value) * 1e6, p = Number(el.querySelector('#ckP').value), ttl = Number(el.querySelector('#ckT').value);
        const edges = Math.max(1, Number(el.querySelector('#ckE').value) || 1), kb = Math.max(0, Number(el.querySelector('#ckS').value) || 0), sv = Math.max(1, Number(el.querySelector('#ckSv').value) || 1);
        el.querySelector('.ckVV').textContent = n(v); el.querySelector('.ckPV').textContent = p + ' s'; el.querySelector('.ckTV').textContent = ttl + ' s';
        const cb = el.querySelector('.ckCdn'); cb.className = 'chip ckCdn' + (cdn ? ' on' : ''); cb.textContent = 'CDN: ' + (cdn ? 'ON' : 'OFF');
        const bb = el.querySelector('.ckBust'); bb.className = 'chip ckBust' + (bust ? ' on' : ''); bb.textContent = 'Cache-busting URL (?t=now): ' + (bust ? 'ON' : 'OFF');
        const q = v / p, cached = cdn && !bust;
        const origin = cached ? Math.min(q, edges / ttl) : q;
        const srv = Math.max(2, Math.ceil(origin / sv * 1.5 - 1e-9));
        const eg = q * kb * 1e3;
        const stale = cached ? ttl + p : p;
        el.querySelector('.ckQ').textContent = n(q) + '/s';
        el.querySelector('.ckO').textContent = n(origin) + '/s';
        el.querySelector('.ckN').textContent = srv.toLocaleString('en-US');
        el.querySelector('.ckSt').textContent = '~' + stale + ' s';
        el.querySelector('.ckF').textContent =
`Client requests = ${n(v)} ÷ ${p} s = ${n(q)}/s
Origin          = ${cached ? `${edges} edges × (1 ÷ ${ttl} s TTL) = ${n(origin)}/s   (CDN absorbs ${(100 * (1 - origin / q)).toFixed(4)}%)` : `${n(q)}/s   (${cdn ? 'har URL alag, CDN ka har request MISS' : 'koi CDN nahi'})`}
Origin servers  = ${n(origin)} ÷ ${n(sv)} × 1.5 → ${srv.toLocaleString('en-US')}${srv === 2 ? ' (min 2, availability ke liye)' : ''}
Egress (total)  = ${n(q)} × ${kb} KB = ${by(eg)}/s ≈ ${n(eg * 8 / 1e9)} Gbps  → ${cached ? 'CDN ke edges pe' : 'TUMHARE servers se'}
Score staleness ≤ TTL + poll = ${cached ? ttl + ' + ' : ''}${p} s`;
        el.querySelector('.ckC').textContent = cached
          ? `CDN ne kaam kar diya: ${n(q)}/s mein se origin tak sirf ~${n(origin)}/s. ${srv} servers kaafi. Keemat: score ${stale} s tak purana ho sakta hai, jo cricket ke liye chalta hai (wicket jaise moments pe alag se push bhej sakte ho).`
          : `Origin pe ${n(q)}/s: ${srv.toLocaleString('en-US')} servers aur ${by(eg)}/s egress tumhare data centre se. ${bust ? 'Ek chhoti si galti (har request ka URL alag) ne poora CDN bekaar kar diya.' : 'Same-for-everyone data ke liye ye bilkul bekaar kharcha hai.'}`;
      };
      ['#ckV', '#ckP', '#ckT', '#ckE', '#ckS', '#ckSv'].forEach(s => el.querySelector(s).addEventListener('input', upd));
      el.querySelector('.ckCdn').onclick = () => { cdn = !cdn; upd(); };
      el.querySelector('.ckBust').onclick = () => { bust = !bust; upd(); };
      upd();
    }},
    { type: 'p', html: `Edge locations ka 100 aur JSON ka 1 KB hamari assumptions hain (roadmap inhe nahi deta). Asli CDN mein ek location pe kai servers hote hain, to origin ko thodi zyada requests aati hain, aur "origin shield" (edges aur origin ke beech ek aur cache layer) aur "request collapsing" (ek edge pe same cheez ke liye ek saath aaye kai misses ko ek hi origin request bana dena) jaisi general CDN techniques use phir kam kar deti hain. Order of magnitude wahi: <strong>millions/s ki jagah sau-hazaar/s</strong>.` },

    { type: 'flow', height: 320,
      nodes: [
        { id: 'v', label: 'Viewers', sub: '30M, poll 5 s', x: 80, y: 160, w: 140, kind: 'client', info: 'Ye kya hai: match dekhne wale 3 crore (30M) apps, har 5 second pe GET /live/score.json. Kul ~6M requests/s.' },
        { id: 'cdn', label: 'CDN edges', sub: 'TTL 1-2 s', x: 285, y: 160, w: 150, kind: 'edge', info: 'Ye kya hai: duniya bhar ke edge servers (CDN), users ke shehar ke paas. Score JSON sabke liye same hai, to har edge use 1-2 s cache karta hai aur apne area ke saare viewers ko wahi deta hai.' },
        { id: 'o', label: 'Score service', sub: 'origin', x: 490, y: 160, w: 150, kind: 'server', meter: true, load: 10, info: 'Ye kya hai: hamara asli server (origin). Latest score ka chhota JSON banata hai. CDN ke saath ise sirf har edge se ~1 request per TTL milti hai.' },
        { id: 'sc', label: 'Scorer', sub: 'stadium', x: 645, y: 55, w: 120, kind: 'client', info: 'Ye kya hai: stadium mein baitha scorer (ek insaan + app) jo har ball ke baad update daalta hai. Writes bahut kam: ~1 per ball.' },
        { id: 'db', label: 'Score DB', sub: 'ball by ball', x: 645, y: 265, w: 120, kind: 'data', info: 'Ye kya hai: har ball ka record rakhne wala database. Bahut chhota data. Score service latest state yahan likhti hai.' },
      ],
      edges: [{ a: 'v', b: 'cdn' }, { a: 'cdn', b: 'o' }, { a: 'sc', b: 'o' }, { a: 'o', b: 'db' }],
      scenarios: [
        { name: 'Edge hit', steps: [
          { title: 'Lakhon polls edge pe', text: 'Har 5 second, karodon apps. Sab nearest edge pe pahunchte hain.', flood: { paths: ['v>cdn'], n: 14 }, msg: 'GET /live/score.json' },
          { title: 'Edge khud jawab deta hai', text: 'Score abhi 1 second purana bhi nahi. Origin ko pata bhi nahi chala.', go: 'res:cdn>v', set: { o: { state: 'dim' } }, after: { cdn: { state: 'hit', sub: 'HIT' } }, msg: '200 OK  { "IND": "187/4", "overs": "32.3" }   Age: 0.6' },
        ]},
        { name: 'Ball hua, TTL khatam', steps: [
          { title: 'Scorer update', text: 'Chauka! Score service DB mein likhti hai.', go: ['sc>o', 'o>db', 'res:db>o'], after: { o: { sub: '191/4' } }, msg: 'POST ball 32.4 → FOUR' },
          { title: 'Edge ka TTL khatam', text: 'Har edge 1 s baad sirf <strong>ek</strong> request origin ko bhejta hai (bhale hi us pal us edge pe hazaaron requests aayi hon).', go: ['cdn>o', 'res:o>cdn'], after: { cdn: { state: 'ok', sub: 'refreshed 191/4' } } },
          { title: 'Sabko naya score', text: 'Agle 1 s ke saare polls naya score edge se paate hain. Max delay ≈ TTL + poll interval.', flood: { paths: ['res:cdn>v'], n: 10 } },
        ]},
        { name: 'CDN nahi / cache-busting (failure)', intro: 'Kisi ne URL mein ?t=timestamp jod diya "fresh data" ke liye. Ab har request alag URL hai, CDN ke liye har request MISS.', steps: [
          { title: 'Har request origin tak', text: '6M requests/s seedhe score service pe.', flood: { paths: ['v>cdn>o'], n: 18 }, set: { cdn: { state: 'miss', sub: 'all MISS' } }, after: { o: { load: 100, state: 'hot', sub: '6M req/s!' } } },
          { title: 'Origin gir jaata hai', text: 'Iske liye ~1,800 servers chahiye the. Hain 2. Match ke sabse bade pal pe app pe score nahi.', go: 'bad:o>cdn>v', after: { o: { state: 'down', sub: 'DOWN' }, v: { state: 'down', sub: 'score nahi' } } },
          { title: 'Fix', text: 'Same URL sabke liye, sahi <code>Cache-Control: max-age=1</code> header, aur CDN on. Napkin maths ne pehle hi bata diya tha: 6M/s sirf CDN ka kaam hai.', focus: ['cdn'] },
        ]},
      ],
    },

    { type: 'h2', text: 'Teeno ek saath' },
    { type: 'table', head: ['System', 'Bottleneck number', 'Isne kya chuna'], rows: [
      ['Twitter-like feed', '600k reads/s peak, 50:1, 2.4 PB, 20 TB/day media', 'Feed cache + precompute, sharded store / Cassandra, object storage + CDN, ~180 servers'],
      ['WhatsApp-style chat', '100M concurrent connections', '~1,000 gateways + user → gateway registry, inbox for offline'],
      ['Live cricket score', '6M req/s, lekin sabke liye same data', 'CDN with 1-2 s TTL; origin almost idle'],
    ]},
    { type: 'callout', tone: 'why', title: 'Decide', html: `Har example mein ek hi number design ka faisla karta hai. Feed mein <strong>read:write aur storage</strong>, chat mein <strong>concurrent connections</strong>, live score mein <strong>"same data for everyone" × QPS</strong>. Estimate karo, us number ko dhoondo, aur conclusion zor se bolo: "6M/s, lekin identical response, to CDN." Wahi line interview jeet-ti hai.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `(1) <strong>Har system ko QPS se naapna</strong>: chat mein asli sawaal connections hai, QPS nahi. (2) <strong>6M req/s dekh ke 1,800 servers order karna</strong>: pehle poochho "kya response sabke liye same hai?" Agar haan, CDN. (3) <strong>Media aur text ek mein milana</strong>: 2.4 PB text DB mein, 20 TB/day media alag object storage mein; dono ka design alag.` },

    { type: 'diagram', title: 'Teeno examples: number se design tak', height: 470,
      groups: [
        { label: 'Feed (Example 1)', x: 8, y: 30, w: 704, h: 120 },
        { label: 'Chat (Example 2)', x: 8, y: 170, w: 704, h: 120 },
        { label: 'Live score (Example 3)', x: 8, y: 310, w: 704, h: 120 },
      ],
      nodes: [
        { id: 'f1', label: '200M DAU', sub: '2 posts, 100 views', x: 90, y: 95, w: 150, kind: 'client', info: 'Ye kya hai: Example 1 ke inputs. 200M daily users, har ek 2 post likhta, 100 dekhta. 10% posts mein 500 KB image.' },
        { id: 'f2', label: '600k reads/s', sub: '50:1, 2.4 PB', x: 270, y: 95, w: 150, kind: 'server', info: 'Ye kya hai: recipe ka nateeja. Reads 200k/s avg, 600k/s peak; writes 12k/s peak; text 2.4 PB (5 saal × 3); media 20 TB/din.' },
        { id: 'f3', label: 'Feed cache', sub: '+ sharded posts', x: 450, y: 95, w: 150, kind: 'cache', info: 'Ye kya hai: faisla. 50:1 read-heavy → precomputed feeds cache mein. 12k writes/s aur 2.4 PB → sharded store ya Cassandra.' },
        { id: 'f4', label: 'CDN + S3', sub: '~180 app servers', x: 630, y: 95, w: 150, kind: 'edge', info: 'Ye kya hai: faisla. 20 TB/din media object storage mein, ~30 GB/s image egress CDN se. App servers: 600k ÷ 5k × 1.5 ≈ 180.' },
        { id: 'c1', label: '100M online', sub: '1 WebSocket each', x: 90, y: 235, w: 150, kind: 'client', info: 'Ye kya hai: Example 2 ke inputs. Peak pe 100M phones, har ek ka ek khula WebSocket connection.' },
        { id: 'c2', label: '100M conns', sub: '~833k msgs/s', x: 270, y: 235, w: 150, kind: 'server', info: 'Ye kya hai: recipe ka nateeja. Bottleneck connections hain. Messages (hamari assumption) ~833k/s peak, ~3 PB/saal (3 copies), bandwidth sirf ~0.7 Gbps.' },
        { id: 'c3', label: '1,000 gateways', sub: '100k each', x: 450, y: 235, w: 150, kind: 'server', info: 'Ye kya hai: faisla. 100M ÷ 100k = 1,000 connection servers (headroom ke saath ~1,500), 3 zones mein.' },
        { id: 'c4', label: 'Registry', sub: '+ message store', x: 630, y: 235, w: 150, kind: 'cache', info: 'Ye kya hai: faisla. User → gateway ki address book (RAM, ~10 GB), aur messages ke liye write-heavy sharded store.' },
        { id: 'l1', label: '30M viewers', sub: 'poll every 5 s', x: 90, y: 375, w: 150, kind: 'client', info: 'Ye kya hai: Example 3 ke inputs. 30M apps, har 5 second pe score maangti hain.' },
        { id: 'l2', label: '6M req/s', sub: 'same JSON for all', x: 270, y: 375, w: 150, kind: 'server', info: 'Ye kya hai: recipe ka nateeja. 30M ÷ 5 = 6M/s, 6 GB/s egress. Lekin har viewer ka jawab bilkul same.' },
        { id: 'l3', label: 'CDN, TTL 1 s', sub: 'edges answer', x: 450, y: 375, w: 150, kind: 'edge', info: 'Ye kya hai: faisla. Edges score 1 s cache karte hain; 6M/s mein se origin tak sirf ~100/s.' },
        { id: 'l4', label: 'Origin: 2', sub: 'not 1,800', x: 630, y: 375, w: 150, kind: 'server', info: 'Ye kya hai: faisla. CDN ke saath 2 origin servers kaafi (availability ke liye 2). Bina CDN ~1,800 chahiye hote.' },
      ],
      edges: [
        { a: 'f1', b: 'f2', n: 1 }, { a: 'f2', b: 'f3', n: 2 }, { a: 'f3', b: 'f4', n: 3 },
        { a: 'c1', b: 'c2', n: 1 }, { a: 'c2', b: 'c3', n: 2 }, { a: 'c3', b: 'c4', n: 3 },
        { a: 'l1', b: 'l2', n: 1 }, { a: 'l2', b: 'l3', n: 2 }, { a: 'l3', b: 'l4', n: 3 },
      ],
      paths: [
        { name: 'Feed', text: 'Reads aur storage sabse bade: cache + precompute, sharding, media ke liye CDN + object storage.', go: ['f1>f2>f3>f4'] },
        { name: 'Chat', text: 'Connections sabse bade: 1,000 gateways + registry; messages ke liye sharded store.', go: ['c1>c2>c3>c4'] },
        { name: 'Live score', text: '6M/s lekin sabke liye same: CDN sab sambhal leta hai, origin pe 2 servers.', go: ['l1>l2>l3>l4'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Har example mein same recipe: users → QPS → peak → storage → bandwidth → servers.</li>
      <li>Har system ka bottleneck number alag: feed mein reads + storage, chat mein connections, live score mein "same data × QPS".</li>
      <li>Feed: 600k reads/s peak, 50:1 → cache + precomputed feeds; 2.4 PB → sharding; 20 TB/din media → object storage + CDN.</li>
      <li>Chat: 100M ÷ 100k = 1,000 gateways + registry (user → gateway); gateway crash = reconnect storm, jitter + headroom.</li>
      <li>Live score: 30M ÷ 5 s = 6M/s, lekin identical JSON → CDN with 1 s TTL; origin ~100 req/s.</li>
      <li>Cache-busting URL (?t=now) CDN ko bekaar kar deta hai: freshness ke liye chhota TTL, URL same.</li>
      <li>Assumptions zor se bolo; ek badle to sirf us se aage ke steps dobara.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Numbers se design seedha nikalta hai, guess nahi', 'Har box ke peeche ek number: interviewer ko "kyun" ka jawab ready', 'Assumption badle (DAU, poll interval) to turant dikhta hai kya palat-ta hai', 'Over-engineering se bachav: chhote numbers pe simple design'], costs: ['Assumptions (peak 3×, 100k per gateway, 1 KB) galat to conclusion bhi hil sakta hai', 'Napkin maths edge cases nahi dikhata: celebrity posts, reconnect storms, hot keys alag se sochne padte hain', 'CDN ka jawab staleness laata hai (score ~TTL + poll purana)', 'Precompute feeds likhne ko mehenga banata hai'] },

    { type: 'think', questions: [
      { q: 'Feed example mein DAU 200M se 2M kar do (slider). Kaunse conclusions palat gaye?', a: '2M × 2 = 4M writes/day → 40/s avg, 120/s peak: ek DB primary kaafi. Reads 2k/s avg, 6k/s peak: cache achha hai par ek DB + replicas bhi chal jaata. Text storage 4 GB/day → 1.6 TB/year → 5 years × 3 replicas = 24 TB: widget abhi bhi "sharding" bolega. Lekin ye data 5 saal mein dheere dheere aata hai (har copy ~1.6 TB/year), to pehle 1-2 saal ek DB + replicas chal jaayenge; uske baad sharding ya archiving. Media 200 GB/day: object storage, CDN optional. App servers ~2. Design kaafi simple ho gaya.' },
      { q: 'Live score mein poll interval 5 s se 1 s kar diya taaki score "aur live" lage. Origin pe kya farak padega (CDN on)? Viewers ko kya farak padega?', a: 'Client requests 5× (6M → 30M/s), lekin origin pe kuch nahi badla: edges ab bhi har TTL pe ek request bhejte hain (~100/s). CDN ka egress 5× hua (bill!). Viewers ko max delay TTL + poll = 2 s instead of 6 s. Agar sach mein instant chahiye, polling ki jagah push (SSE/WebSocket) socho, ya wicket jaise moments pe push.' },
      { q: 'Chat example mein ek gateway 100k ki jagah 1M connections rakh sake (better tech). Kya registry ki zaroorat khatam?', a: 'Nahi. 100M ÷ 1M = 100 gateways, abhi bhi ek se zyada. Jab tak sender aur receiver alag gateways pe ho sakte hain, registry chahiye. Haan, crash pe ek saath 1M users reconnect karenge: reconnect storm aur bada.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Feed example: 200M DAU × 100 views/day. Peak read QPS (×3)?', options: ['~60k/s', '~600k/s', '~6M/s'], answer: 1, explain: '200M × 100 = 2 × 10^10 / 10^5 = 200k/s avg × 3 = 600k/s.' },
      { q: 'Text storage 400 GB/day, 5 saal, 3 replicas?', options: ['~600 TB', '~2.4 PB', '~24 PB'], answer: 1, explain: '400 GB × 400 = 160 TB/year × 5 = 800 TB × 3 = 2.4 PB.' },
      { q: '100M users online, ek gateway 100k connections. Kitne gateways?', options: ['100', '1,000', '10,000'], answer: 1, explain: '10^8 ÷ 10^5 = 10^3 = 1,000. Plus registry user → gateway.' },
      { q: '30M viewers, har 5 s poll. Requests/s aur sahi jawab?', options: ['600k/s, bade servers', '6M/s, CDN kyunki response sabke liye same hai', '30M/s, WebSockets'], answer: 1, explain: '30M ÷ 5 = 6M/s. Identical JSON ko edges 1-2 s cache karte hain, origin pe bas kuch requests/s.' },
      { q: 'Chat example: 100M online, har user ghante mein 30 messages. Peak messages/s?', options: ['~8k/s', '~833k/s', '~30M/s'], answer: 1, explain: '100M × 30 ÷ 3,600 ≈ 833k/s. Itne writes ke liye sharded, write-optimised store chahiye.' },
      { q: 'Live score URL mein ?t=timestamp jodne se kya hua?', options: ['Score zyada fresh', 'Har request alag URL, CDN pe har request MISS, origin pe 6M/s', 'Kuch nahi'], answer: 1, explain: 'Cache key URL hai. Har URL alag = cache bekaar. Freshness ke liye chhota TTL use karo, URL nahi badlo.' },
    ]},
    { type: 'sources', note: 'Teeno examples ke main numbers roadmap ke Phase 4 se. Chat messages aur score JSON ke numbers hamari assumptions hain (text mein bataya hai). Baaki facts neeche ke sources se.', items: [
      { title: 'Timelines at Scale (talk by Raffi Krikorian)', publisher: 'InfoQ / QCon (Twitter engineering)', year: 2013, url: 'https://www.infoq.com/presentations/Twitter-Timeline-Scalability/', used: 'Twitter precomputed home timelines in an in-memory cache (fan-out on write) and treated accounts with huge follower counts differently. 2013 talk; the idea is still the standard way to explain feeds.' },
      { title: 'The Road to 2 Million Websocket Connections in Phoenix', publisher: 'Phoenix Framework blog', year: 2015, url: 'https://phoenixframework.org/blog/the-road-to-2-million-websocket-connections', used: 'One large server holding ~2 million idle WebSocket connections in a benchmark; why 100k per gateway is a safe estimate.' },
      { title: 'WhatsApp Privacy Policy', publisher: 'WhatsApp', official: true, url: 'https://www.whatsapp.com/legal/privacy-policy', used: 'Messages are deleted from WhatsApp servers once delivered (undelivered ones are kept for a while): why server-side storage can be small.' },
      { title: 'Cache-Control header', publisher: 'MDN Web Docs', official: true, url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control', used: 'max-age tells shared caches (CDNs) how many seconds to keep a response; the URL is part of the cache key.' },
    ]},
  ],
});
