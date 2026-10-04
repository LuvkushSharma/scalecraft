Lesson.register({
  id: 'estimation-examples',
  title: 'Worked examples',
  minutes: 30,
  summary: `Three real-looking questions, fully solved with the recipe: a Twitter-like feed, WhatsApp-style chat connections, and a live cricket score for 30 million people. Each example goes through every step of the recipe (users → QPS → peak → storage → bandwidth → servers), and the sliders are set to the roadmap's numbers. Move them and see when the design flips: when sharding, when a CDN, when a thousand gateways.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `So far you have learned the numbers and the recipe. Now we run them on three real-looking apps: a feed app, a chat app, and a live cricket score.<br>The way of doing the maths is the same in all three, but each time a <strong>different number</strong> comes out as the biggest, and that number tells you which component to add.<br>Every example has sliders. Move them and see when "one server is enough" becomes "a thousand servers", and when a single CDN saves everything.` },
    { type: 'p', html: `In the last lesson we learned the recipe: users → traffic → storage → bandwidth → servers, with a conclusion after each step. Now we run it on three different kinds of systems. Each has a different "bottleneck": in the first it is <strong>reads and storage</strong>, in the second <strong>connections</strong>, in the third <strong>tens of millions of identical requests in the same moment</strong>. This shows how napkin maths <em>chooses</em> the design.` },
    { type: 'callout', tone: 'tip', title: 'Try it yourself first', html: `Read the question of each example and spend 3 minutes doing the maths on paper yourself, then compare with the answer below. Remember: 1 day ≈ 10^5 s, 1 year ≈ 400 days, peak ≈ 3×, headroom 1.5×.` },

    { type: 'h2', text: 'Example 1: A Twitter-like feed' },
    { type: 'p', html: `<strong>Question:</strong> xyz.com is building a Twitter-like app. <strong>200M DAU</strong>. Each user makes <strong>2 posts</strong> a day and <strong>views 100 posts</strong>. One post (text + metadata) is ~1 KB. 10% of posts have an image of ~500 KB. Data is kept for 5 years with 3 replicas. Peak 3×. One app server handles ~5k req/s.` },
    { type: 'table', head: ['Step', 'Maths', 'Result and conclusion'], rows: [
      ['Write QPS', '200M × 2 / 10^5', '≈ 4k/s, peak ≈ 12k/s. More than one SQL node handles comfortably: shard, or use Cassandra'],
      ['Read QPS', '200M × 100 / 10^5', '≈ 200k/s, peak ≈ 600k/s. Read:write is 50:1, so cache heavily and build feeds in advance (precompute)'],
      ['Text storage', '400M × 1 KB', '400 GB/day ≈ 160 TB/year; × 5 years × 3 replicas ≈ 2.4 PB. Sharding is a must'],
      ['Media', '10% with 500 KB image', '40M × 500 KB = 20 TB/day. Object storage plus CDN'],
      ['App servers', '600k ÷ 5k × 1.5', '≈ 180 servers, across 3 zones'],
    ], caption: 'The roadmap\'s worked example, as it is. The calculator below shows this table in full steps from users to servers, and you can change every assumption.' },
    { type: 'callout', tone: 'term', title: 'New word: Precompute feed (fan-out on write)', html: `<strong>What it is:</strong> building each user's feed (a list of post IDs) in advance and keeping it in a cache. When someone posts, the post ID is added right away to the feed list of each of their followers. This is called <strong>fan-out on write</strong> ("fan-out" = one thing spreading to many places).<br><strong>Why we need it:</strong> finding and sorting the posts of 500 people when a feed is opened is very expensive at 200k/s. Now reading is just picking up a list. Writing gets a bit more expensive, reading gets much cheaper; with 50:1 read:write this is a good deal.<br><strong>Without it:</strong> every feed request queries many shards and sorts: at 600k/s peak the database chokes. (For celebrities with tens of millions of followers we do the opposite: their posts are merged in at read time. Twitter's engineers described this approach in a 2013 talk. This is covered in detail in the "Instagram / Twitter feed" design lesson.)` },
    { type: 'p', html: `Now move the sliders. Everything is set to the roadmap's numbers. See which conclusion flips when: set DAU to 20M, do you still need sharding? Set media to 0%, do you still need a CDN?` },

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
        ['exSv', 'One app server (req/s)', 500, 20000, 500, 5000, 'n'],
      ];
      el.innerHTML = `<div class="row2">${S.map(s => s[6] === 'r'
          ? `<div><label for="${s[0]}">${s[1]}: <strong class="${s[0]}V"></strong></label><input id="${s[0]}" type="range" min="${s[2]}" max="${s[3]}" step="${s[4]}" value="${s[5]}"></div>`
          : `<div><label for="${s[0]}">${s[1]}</label><input id="${s[0]}" type="number" min="${s[2]}" max="${s[3]}" step="${s[4]}" value="${s[5]}"></div>`).join('')}</div>
        <div style="margin-top:10px"><button type="button" class="btn small ghost exReset">Back to the roadmap numbers</button></div>
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
        const wC = wp > 10000 ? 'More than one SQL node handles comfortably: shard, or use Cassandra' : wp > 5000 ? 'Close to the limit of one SQL primary: keep a sharding plan ready' : 'One primary DB (with a replica) will handle the writes';
        const rC = (ratio >= 10 ? `Read:write is ${n(ratio)}:1, so heavy caching and precomputed feeds` : `Read:write only ${n(ratio)}:1: a cache will help, but writes matter just as much`) + (rp > 20000 ? '. One DB cannot handle these reads' : '. One DB + replicas will also work');
        const tC = tTot >= 5e12 ? 'Sharding mandatory' : tTot >= 1e12 ? 'The upper range of one DB: plan archiving/sharding' : 'It will fit in one database';
        const mC = mp === 0 ? 'No media: no need for object storage/CDN' : mDay >= 1e12 ? 'Object storage plus CDN' : 'Object storage; a CDN is optional for now (still a cheap win)';
        const rows = [
          ['Users', `${n(dau)} DAU`, `writes/day = ${n(dau)} × ${po} = ${n(wDay)}; reads/day = ${n(dau)} × ${vw} = ${n(rDay)}`],
          ['Write QPS', `${n(dau)} × ${po} / 10^5`, `≈ ${n(wq)}/s, peak ≈ ${n(wp)}/s. ${wC}`],
          ['Read QPS', `${n(dau)} × ${vw} / 10^5`, `≈ ${n(rq)}/s, peak ≈ ${n(rp)}/s. ${rC}`],
          ['Text storage', `${n(wDay)} × ${kb} KB`, `${by(tDay)}/day ≈ ${by(tYr)}/year; × ${yr} years × ${rf} replicas ≈ ${by(tTot)}. ${tC}`],
          ['Media', `${Math.round(mp * 100)}% with ${img} KB image`, `${n(mCnt)} × ${img} KB = ${by(mDay)}/day. ${mC}`],
          ['Text egress (peak)', `${n(rp)} × ${kb} KB`, `≈ ${by(rp * kb * 1e3)}/s ≈ ${n(rp * kb * 8e3 / 1e9)} Gbps. ${rp * kb * 8e3 >= 1e10 ? 'Big: spread it over many servers and zones' : 'The app servers can handle it'}`],
          ['Media egress (peak)', `${n(rp)} × ${Math.round(mp * 100)}% × ${img} KB`, `≈ ${by(mEg)}/s${mEg >= 1e9 ? ': not possible from app servers, use CDN edges' : ''}`],
          ['App servers', `${n(rp)} ÷ ${n(sv)} × 1.5`, `≈ ${srv} servers across 3 zones (${Math.ceil(srv / 3)} per zone)`],
        ];
        el.querySelector('.exT').innerHTML = rows.map((r, i) => `<tr style="border-top:1px solid var(--line)"><td style="padding:8px 6px;font-weight:700;color:var(--ink);vertical-align:top">${r[0]}</td><td style="padding:8px 6px;font-family:var(--f-mono);font-size:12.5px;color:var(--ink-2);vertical-align:top">${r[1]}</td><td style="padding:8px 6px;color:var(--ink);vertical-align:top">${r[2]}</td></tr>`).join('');
        el.querySelector('.exN').textContent = 'The media egress line is not in the roadmap table; it assumes that the image of every viewed image-post is downloaded once.';
      };
      S.forEach(s => el.querySelector('#' + s[0]).addEventListener('input', upd));
      el.querySelector('.exReset').onclick = () => { S.forEach(s => { el.querySelector('#' + s[0]).value = s[5]; }); upd(); };
      upd();
    }},

    { type: 'p', html: `What the numbers told us became the architecture: 180 app servers, a feed cache, a sharded posts store, and object storage + CDN for media. Play it and see which number each box is there for:` },
    { type: 'flow', height: 340,
      nodes: [
        { id: 'u', label: 'Users', sub: '200M DAU', x: 80, y: 175, w: 130, kind: 'client', info: 'What it is: the 200M daily users of the app. They write 400M posts/day and read 20B posts/day.' },
        { id: 'cdn', label: 'CDN', sub: 'images', x: 270, y: 55, w: 140, kind: 'edge', info: 'What it is: servers spread around the world, close to users, that keep copies of files. At peak ~30 GB/s of images. The app servers cannot even touch these bytes; CDN edges around the world serve them.' },
        { id: 'app', label: 'App servers', sub: '~180, 3 zones', x: 270, y: 175, w: 150, kind: 'server', meter: true, load: 60, info: 'What it is: the computers that run the feed/post code. 600k peak reads ÷ 5k per server × 1.5 headroom ≈ 180. Stateless, behind a Load Balancer (one box in the diagram).' },
        { id: 'obj', label: 'Object storage', sub: '20 TB/day', x: 490, y: 55, w: 170, kind: 'data', info: 'What it is: a cheap, almost limitless store for big files (like S3). Every day ~40M images × 500 KB = 20 TB. The files live here; the DB keeps only their URL/ID. On a CDN miss, the image is fetched from here.' },
        { id: 'cache', label: 'Feed cache', sub: 'precomputed feeds', x: 490, y: 175, w: 170, kind: 'cache', info: 'What it is: a ready-made feed (list of post IDs) for each user, kept in RAM. It exists because of the 50:1 read:write ratio. Most of the 600k peak reads/s end here.' },
        { id: 'db', label: 'Posts DB', sub: 'sharded, 2.4 PB', x: 490, y: 295, w: 170, kind: 'data', meter: true, load: 35, info: 'What it is: the real, permanent record of posts. 12k writes/s at peak and 2.4 PB: never one machine. Many shards (or a Cassandra cluster), with a shard key like post_id/user_id.' },
      ],
      edges: [{ a: 'u', b: 'cdn' }, { a: 'u', b: 'app' }, { a: 'app', b: 'cache' }, { a: 'app', b: 'db' }, { a: 'app', b: 'obj' }, { a: 'cdn', b: 'obj' }],
      scenarios: [
        { name: 'Write a post', steps: [
          { title: 'Riya posts (with an image)', text: 'One of the 12k writes/s at peak.', go: 'u>app', msg: 'POST /posts { text, image }' },
          { title: 'Image into object storage', text: 'The 500 KB file goes to object storage; the DB keeps only its key.', go: ['app>obj', 'res:obj>app'], msg: 'PUT img/9f3a.jpg  (500 KB)' },
          { title: 'Post record on its shard', text: 'A ~1 KB record, on its own shard.', go: ['app>db', 'res:db>app'], msg: 'INSERT post 777 (shard = hash(post_id) % N)' },
          { title: 'Update followers\' feeds (fan-out)', text: 'Post 777 is added to the feed lists of Riya\'s followers. Writing is expensive, but this is what makes reading cheap.', go: 'app>cache', after: { cache: { sub: '+777 in 300 feeds' } } },
        ]},
        { name: 'Read the feed', steps: [
          { title: 'Feed opened', text: 'One of the 600k/s at peak.', go: 'u>app', msg: 'GET /feed' },
          { title: 'Ready-made feed from the cache', text: 'No sorting, no join. Just pick up the list.', go: ['app>cache', 'res:cache>app'], set: { db: { state: 'dim' } }, after: { cache: { state: 'hit', sub: 'HIT' } } },
          { title: 'Text back, images from the CDN', text: 'The response has image URLs. The browser gets images straight from the CDN: no 30 GB/s load on the app servers.', parallel: true, go: ['res:app>u', 'u>cdn', 'res:cdn>u'], after: { cdn: { state: 'hit', sub: 'HIT' } } },
        ]},
        { name: 'CDN miss', steps: [
          { title: 'New image, not on the edge', text: 'An image that was just posted is asked for at an edge for the first time.', go: 'u>cdn', after: { cdn: { state: 'miss', sub: 'MISS' } } },
          { title: 'The edge fetches from the origin', text: 'The CDN picks up the image from object storage and keeps a copy.', go: ['cdn>obj', 'res:obj>cdn'] },
          { title: 'The next millions of views from the edge', text: 'One miss, then all hits.', go: 'res:cdn>u', after: { cdn: { state: 'hit', sub: 'cached' } } },
        ]},
        { name: 'Feed cache down (failure)', intro: 'The cache was protecting the DB from 600k/s. What now?', steps: [
          { title: 'The feed cache fell over', text: 'All feeds are gone.', set: { cache: { state: 'down', sub: 'DOWN' } }, go: 'lost:app>cache' },
          { title: '600k/s on the DB', text: 'Now every feed must be built from the DB: for every request, fetch posts from many shards and sort them. The shards choke.', flood: { paths: ['app>db'], n: 16 }, after: { db: { load: 100, state: 'hot', sub: 'overloaded' } } },
          { title: 'Lesson', text: 'The cache that came because of the 50:1 ratio is now critical. That is why the cache is replicated and multi-zone, and if it fails the app runs in <strong>degraded mode</strong> (only recent posts, fewer items) instead of crashing onto the whole DB.', go: 'bad:app>u', focus: ['cache', 'db'] },
        ]},
      ],
    },

    { type: 'h2', text: 'Example 2: WhatsApp-style chat connections' },
    { type: 'p', html: `<strong>Question:</strong> xyz.com Chat. At peak <strong>100M users are online</strong>, and each one's phone keeps a <strong>WebSocket</strong> open so messages arrive instantly. How many servers?` },
    { type: 'p', html: `Here QPS is not the question at all. An online user sends nothing most of the time; they just keep the connection open. The bottleneck is <strong>how many connections can be kept open at the same time</strong>. This is the second formula of step 5 of the recipe: concurrent users ÷ connections per gateway.` },
    { type: 'callout', tone: 'term', title: 'New word: Gateway (connection server)', html: `<strong>What it is:</strong> the server that users' phones stay connected to through a long <strong>WebSocket</strong> connection (WebSocket = a connection that stays open so the server can send a message at any time; remember the "Polling, SSE, WebSockets" lesson). It does little business logic; its job is to keep hundreds of thousands of idle connections alive and push a message onto the right connection as soon as it arrives.<br><strong>Why we need it:</strong> 100M open connections cannot fit on one machine. One gateway can hold ~50k-500k idle connections; in estimates assume <strong>100k</strong>.<br><strong>Without it:</strong> either the phone asks again and again for every message (polling: a lot of load, late messages), or everything sits on one machine (impossible).` },
    { type: 'code', text: `
Gateways = 100M ÷ 100k per gateway ≈ 1,000 gateway servers
Plus: a registry that says "user → which gateway", so messages can be routed.` },
    { type: 'callout', tone: 'why', title: 'Why is the registry needed?', html: `Riya is connected to gateway #7, Aman to gateway #842. Riya's message arrives at #7. How does #7 know where Aman is? Asking 1,000 gateways ("do you have Aman?") for every message is impossible. So we keep a <strong>registry</strong> (an in-memory key-value store, like Redis): <code>aman → gw-842</code>. Write the entry on connect, remove it on disconnect, and do one lookup per message.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="waOn">Online users at peak: <strong class="waOnV"></strong></label><input id="waOn" type="range" min="1" max="500" step="1" value="100"></div>
          <div><label for="waPer">Connections per gateway: <strong class="waPerV"></strong></label><input id="waPer" type="range" min="10000" max="500000" step="10000" value="100000"></div>
          <div><label for="waRc">Reconnect window after a crash (s)</label><input id="waRc" type="number" min="1" max="600" step="1" value="10"></div>
          <div><label for="waEnt">Registry entry size (bytes)</label><input id="waEnt" type="number" min="10" max="1000" step="10" value="100"></div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"><button type="button" class="chip waHr">Headroom ×1.5: OFF</button></div>
        <div class="stats">
          <div class="stat"><span>Gateways</span><strong class="waG"></strong></div>
          <div class="stat"><span>Registry</span><strong class="waR"></strong></div>
          <div class="stat"><span>One gateway crash = reconnects</span><strong class="waX"></strong></div>
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
`Gateways  = ${n(on)} ÷ ${n(per)} per gateway${hr ? ' × 1.5' : ''} = ${g.toLocaleString('en-US')}   ${g >= 3 ? '(3 zones × ~' + Math.ceil(g / 3).toLocaleString('en-US') + ')' : '(in different zones)'}
Registry  = ${n(on)} entries × ${ent} B = ${by(reg)}
Crash     = ${n(each)} users of one gateway reconnect in ${rc} s = ~${n(rps)} new connections/s on the other gateways`;
        const C = [];
        C.push(g <= 1 ? 'Only one gateway: all users on one machine, no registry needed. But that machine is a SPOF, so keep at least 2 (and then you need a registry).' : `${g.toLocaleString('en-US')} gateways: nobody knows which gateway a user is on unless there is a registry. A registry is a must.`);
        if (per < 50000) C.push(`Only ${n(per)} connections per gateway: the fleet is very big. Event-driven servers (non-blocking I/O like epoll, or runtimes like Erlang/Go) fit more connections on one machine.`);
        C.push(reg > 1e11 ? `Registry ${by(reg)}: bigger than the RAM of a normal cache node, so shard the registry too (like Redis Cluster).` : `Registry ${by(reg)}: fits easily in RAM, but keep it replicated (every message goes through it).`);
        if (rps > 5000) C.push(`~${n(rps)} reconnects/s after a crash: this is a "reconnect storm". Clients should reconnect with a random delay (jitter), and the other gateways need headroom.`);
        el.querySelector('.waC').innerHTML = C.map(c => '<li>' + c + '</li>').join('');
      };
      ['#waOn', '#waPer', '#waRc', '#waEnt'].forEach(s => el.querySelector(s).addEventListener('input', upd));
      el.querySelector('.waHr').onclick = () => { hr = !hr; upd(); };
      upd();
    }},
    { type: 'p', html: `With the defaults: 100M ÷ 100k = <strong>1,000 gateways</strong>, just like the roadmap. ~100 B per registry entry is a rough assumption (user ID + gateway ID + a bit of overhead); with that the registry is ~10 GB, which fits easily in RAM. Turn headroom ON and you get 1,500: this is what production needs, because if one gateway fails its 100k users must go somewhere else. (100k is a safe estimate: in a 2015 benchmark, the Phoenix framework team showed ~2 million idle WebSocket connections on one big server. In a real app every connection also does some work, so we assume fewer.)` },

    { type: 'h3', text: 'The rest of the recipe: messages, storage, bandwidth' },
    { type: 'p', html: `The connections gave us the gateways. But finish the recipe: how many messages come in, how much data piles up, how much bandwidth? The roadmap does not give these numbers, so all the values below are <strong>our assumptions</strong> (you can change all of them). Default: at peak every online user sends ~30 messages an hour, one message (text + IDs + time) is ~100 B, history is kept for 1 year, 3 replicas.` },
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
4 BANDWIDTH in = ${n(peak)} × ${sz} B = ${by(bw)}/s ≈ ${n(bw * 8 / 1e9)} Gbps  (in 1-to-1 chat, out is the same)
5 SERVERS   gateways = ${n(on)} ÷ 100k = ${Math.ceil(on / 1e5).toLocaleString('en-US')}  (the calculator above)`;
        const C = [];
        C.push(peak > 1e5 ? `${n(peak)} messages/s at peak: too much for one SQL database. Write-heavy, read by key (chat_id + time): a wide-column, sharded store like Cassandra.` : `${n(peak)} messages/s: one good database (with replicas) will handle it.`);
        C.push(tot >= 5e12 ? `Storage ${by(tot)}: sharding for sure. Or a WhatsApp-like design: delete a message from the server once it is delivered, then storage is very small.` : `Storage ${by(tot)}: it will fit on one or two machines.`);
        C.push(`Bandwidth ${n(bw * 8 / 1e9)} Gbps: messages are small, so the network is not the bottleneck. The real bottleneck is connections (gateways).`);
        el.querySelector('.wmN').innerHTML = '<ul style="margin:0;padding-left:20px">' + C.map(c => '<li>' + c + '</li>').join('') + '</ul>';
      };
      F.forEach(f => el.querySelector('.' + f[0]).addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `With the defaults: 100M × 30 ÷ 3,600 ≈ <strong>833k messages/s</strong> at peak, ~278k/s on average, ~28 billion messages a day. At 100 B each that is ~2.8 TB/day, and 1 year × 3 replicas = <strong>~3.3 PB</strong>. Bandwidth is only ~83 MB/s (~0.67 Gbps). The lesson: in chat, three different numbers choose three different components: connections → gateways, messages/s → a write-heavy sharded store, and bandwidth → nothing special.` },

    { type: 'p', html: `What did 1,000 gateways change in the design? A message is no longer "send it to the server"; it becomes "first find where to send it, then send it". Play it:` },
    { type: 'flow', height: 380,
      nodes: [
        { id: 'riya', label: 'Riya', sub: 'phone', x: 80, y: 70, w: 120, kind: 'client', info: 'What it is: the user sending the message. Riya\'s phone is connected to gateway #7 through a WebSocket.' },
        { id: 'gwa', label: 'Gateway #7', sub: '~100k conns', x: 260, y: 70, w: 150, kind: 'server', meter: true, load: 60, info: 'What it is: a server that holds connections, one of the 1,000 gateways. ~100k phones including Riya\'s are connected to it. When a message arrives, it asks the registry where the receiver is.' },
        { id: 'gwb', label: 'Gateway #842', sub: '~100k conns', x: 460, y: 70, w: 150, kind: 'server', meter: true, load: 60, info: 'What it is: another gateway (connection server). Aman\'s phone is connected to this gateway, so Aman\'s messages go through it.' },
        { id: 'aman', label: 'Aman', sub: 'phone', x: 640, y: 70, w: 120, kind: 'client', info: 'What it is: the receiver of the message. Aman\'s phone is also connected to a gateway through a WebSocket, but probably not Riya\'s gateway. So we first ask the registry which gateway Aman is on. If Aman is offline, the message waits in a store and a push notification is sent.' },
        { id: 'reg', label: 'Registry', sub: 'user → gateway', x: 260, y: 220, w: 160, kind: 'cache', info: 'What it is: an address book that says which user is on which gateway. An in-memory key-value store: aman → gw-842. 100M entries, ~10 GB (rough). Write on connect, remove on disconnect. One lookup per message, so it must be fast and replicated.' },
        { id: 'gwc', label: 'Gateway #15', sub: 'spare capacity', x: 640, y: 220, w: 120, kind: 'server', info: 'What it is: another gateway that has headroom (free space). When a gateway fails, its users reconnect here.' },
        { id: 'store', label: 'Inbox store', sub: 'offline msgs', x: 460, y: 330, w: 160, kind: 'data', info: 'What it is: a database for the messages of offline users. Messages for a receiver who is offline wait here. As soon as the phone comes online, the gateway delivers them.' },
      ],
      edges: [{ a: 'riya', b: 'gwa' }, { a: 'gwa', b: 'gwb' }, { a: 'gwb', b: 'aman' }, { a: 'gwa', b: 'reg' }, { a: 'gwb', b: 'reg' }, { a: 'gwa', b: 'store' }, { a: 'aman', b: 'gwc' }, { a: 'gwc', b: 'reg' }, { a: 'gwc', b: 'store' }, { a: 'gwa', b: 'gwc' }],
      scenarios: [
        { name: 'Route a message', steps: [
          { title: 'Riya sends a message', text: 'On the open WebSocket, instantly.', go: 'riya>gwa', msg: '{ to: "aman", text: "are you watching the match?" }' },
          { title: 'Where is Aman?', text: 'Gateway #7 asks the registry.', go: ['gwa>reg', 'res:reg>gwa'], after: { reg: { state: 'hit', sub: 'aman → gw-842' } }, msg: 'GET conn:aman  →  gw-842' },
          { title: 'To the right gateway', text: 'An internal call between gateways. #842 pushes the message onto Aman\'s open connection.', go: 'gwa>gwb>aman', after: { aman: { state: 'ok', sub: 'got the message' } } },
        ]},
        { name: 'Aman offline', steps: [
          { title: 'A message arrives', text: 'Riya sent it.', go: 'riya>gwa' },
          { title: 'Registry: no entry', text: 'Aman\'s phone is off, so his entry was removed when he disconnected.', go: ['gwa>reg', 'bad:reg>gwa'], after: { reg: { state: 'miss', sub: 'aman: offline' } }, set: { aman: { state: 'dim', sub: 'offline' } } },
          { title: 'Keep it in the inbox', text: 'The message goes to the offline store. When Aman comes online, whichever gateway he connects to will pick it up from the inbox and deliver it.', go: 'gwa>store', after: { store: { sub: '1 msg for aman' } } },
        ]},
        { name: 'Gateway crash (failure)', intro: 'The hardware of gateway #842 fails. The connections of its ~100k phones break at the same moment.', steps: [
          { title: '#842 is down', text: '100k users disconnected in one moment.', set: { gwb: { state: 'down', sub: 'DOWN' } }, go: 'lost:gwb>aman' },
          { title: 'Reconnect storm', text: '100k phones reconnect right away. Within 10 seconds = ~10k new connections/s on the other gateways. That is why clients reconnect with a random delay (jitter), and gateways need headroom.', flood: { paths: ['aman>gwc'], n: 12 }, after: { gwc: { state: 'warn', sub: 'reconnect storm' } } },
          { title: 'Registry update', text: 'Aman is now on #15. A new entry is written. (The old entry "gw-842" was stale: that is why entries have a TTL/heartbeat.)', go: 'gwc>reg', after: { reg: { sub: 'aman → gw-15' }, gwc: { state: 'ok', sub: 'Aman is here' } } },
          { title: 'The message gets through again', text: 'Riya\'s next message gets the new address from the registry. Messages that came in between are delivered from the inbox.', go: ['riya>gwa', 'gwa>reg', 'res:reg>gwa', 'gwa>gwc>aman'] },
        ]},
      ],
    },

    { type: 'h2', text: 'Example 3: Live cricket score, 30M viewers' },
    { type: 'p', html: `<strong>Question:</strong> an India-Pakistan match. On the xyz.com Live app, <strong>30 million (3 crore) people</strong> are watching the score. Every app asks for the latest score <strong>every 5 seconds</strong> (polling). What do we need?` },
    { type: 'callout', tone: 'term', title: 'New word: Polling', html: `<strong>What it is:</strong> the app asks the server every few seconds "is there anything new?", whether something changed or not.<br><strong>Why it is here:</strong> it is the simplest way, and it is a normal HTTP GET, so a CDN can cache it.<br><strong>Without it (if you used push):</strong> you would need 30M open WebSocket connections (a gateway fleet like Example 2). For data that is "the same for everyone", like a score, polling + CDN is often cheaper.` },
    { type: 'code', text: `
30M ÷ 5 s = 6M requests/s

From your own servers: 6M ÷ 5k per server × 1.5 ≈ 1,800 servers   (scary!)
From a CDN:            the score JSON is the SAME for everyone → edges cache it ~1-2 s
                       → the origin gets only a few requests/s from each edge` },
    { type: 'p', html: `This is the magic of this example: <strong>"terrifying for your servers, trivial for a CDN"</strong>. The score is exactly the same for every viewer; nothing is personalised. So an edge server fetches the score from the origin once, keeps it for 1-2 seconds, and in that time answers hundreds of thousands of requests from its area by itself. The napkin maths told us the architecture.` },
    { type: 'table', head: ['Recipe step', 'Maths', 'Result and conclusion'], rows: [
      ['1 Users', '30M viewers at the same time', 'Everyone watches at the same time during the match: this is the peak, no extra ×3'],
      ['2 Traffic', '30M ÷ 5 s', '6M requests/s. All reads, and the answer is the same for everyone'],
      ['3 Storage', '~300 balls × ~1 KB (assumption)', '~300 KB per match: almost nothing. Storage is not a question here at all'],
      ['4 Bandwidth', '6M/s × 1 KB', '6 GB/s ≈ 48 Gbps of egress: expensive to send from your own data centre, easy from CDN edges'],
      ['5 Servers', '6M ÷ 5k × 1.5', 'Without a CDN ~1,800 origin servers; with a CDN ~100 req/s at the origin = 2 servers (the minimum, for availability)'],
    ], caption: 'The whole recipe in one table. The 1 KB JSON and 300 balls are our assumptions. You can change everything in the calculator below.' },
    { type: 'callout', tone: 'term', title: 'New words: Origin and TTL', html: `<strong>What it is:</strong> the <strong>origin</strong> = your real server that the CDN fetches content from (here: the score service). <strong>TTL</strong> (time to live) = how long a CDN edge keeps a response before asking the origin for a new one.<br><strong>Why we need it:</strong> a TTL of 1 s means the score is at most ~1 s old (at the edge), and each edge sends about 1 request/s to the origin. The load of millions of viewers never reaches the origin.<br><strong>Without it:</strong> TTL 0 (no cache) = every request reaches the origin = 6M/s. A very long TTL (1 minute) = an old score: a four is hit and the app learns about it a minute later.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="ckV">Viewers: <strong class="ckVV"></strong></label><input id="ckV" type="range" min="1" max="100" step="1" value="30"></div>
          <div><label for="ckP">Poll interval: <strong class="ckPV"></strong></label><input id="ckP" type="range" min="1" max="30" step="1" value="5"></div>
          <div><label for="ckT">CDN TTL: <strong class="ckTV"></strong></label><input id="ckT" type="range" min="1" max="10" step="1" value="1"></div>
          <div><label for="ckE">CDN edge locations (assumption)</label><input id="ckE" type="number" min="1" max="2000" step="10" value="100"></div>
          <div><label for="ckS">Score JSON size (KB, assumption)</label><input id="ckS" type="number" min="0.1" max="100" step="0.1" value="1"></div>
          <div><label for="ckSv">One origin server (req/s)</label><input id="ckSv" type="number" min="100" max="50000" step="100" value="5000"></div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"><button type="button" class="chip ckCdn"></button><button type="button" class="chip ckBust"></button></div>
        <div class="stats">
          <div class="stat"><span>Client requests</span><strong class="ckQ"></strong></div>
          <div class="stat"><span>Requests at origin</span><strong class="ckO"></strong></div>
          <div class="stat"><span>Origin servers</span><strong class="ckN"></strong></div>
          <div class="stat"><span>Score at most this old</span><strong class="ckSt"></strong></div>
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
Origin          = ${cached ? `${edges} edges × (1 ÷ ${ttl} s TTL) = ${n(origin)}/s   (CDN absorbs ${(100 * (1 - origin / q)).toFixed(4)}%)` : `${n(q)}/s   (${cdn ? 'every URL different, every CDN request is a MISS' : 'no CDN'})`}
Origin servers  = ${n(origin)} ÷ ${n(sv)} × 1.5 → ${srv.toLocaleString('en-US')}${srv === 2 ? ' (min 2, for availability)' : ''}
Egress (total)  = ${n(q)} × ${kb} KB = ${by(eg)}/s ≈ ${n(eg * 8 / 1e9)} Gbps  → ${cached ? 'at the CDN edges' : 'from YOUR servers'}
Score staleness ≤ TTL + poll = ${cached ? ttl + ' + ' : ''}${p} s`;
        el.querySelector('.ckC').textContent = cached
          ? `The CDN did the job: of ${n(q)}/s, only ~${n(origin)}/s reach the origin. ${srv} servers are enough. The price: the score can be up to ${stale} s old, which is fine for cricket (for moments like a wicket you can send a separate push).`
          : `${n(q)}/s at the origin: ${srv.toLocaleString('en-US')} servers and ${by(eg)}/s of egress from your data centre. ${bust ? 'One small mistake (a different URL for every request) made the whole CDN useless.' : 'For data that is the same for everyone, this is a complete waste of money.'}`;
      };
      ['#ckV', '#ckP', '#ckT', '#ckE', '#ckS', '#ckSv'].forEach(s => el.querySelector(s).addEventListener('input', upd));
      el.querySelector('.ckCdn').onclick = () => { cdn = !cdn; upd(); };
      el.querySelector('.ckBust').onclick = () => { bust = !bust; upd(); };
      upd();
    }},
    { type: 'p', html: `The 100 edge locations and the 1 KB JSON are our assumptions (the roadmap does not give them). A real CDN has many servers in one location, so the origin gets a few more requests, and general CDN techniques like an "origin shield" (one more cache layer between the edges and the origin) and "request collapsing" (turning many misses for the same thing at one edge into a single origin request) bring it down again. The order of magnitude stays the same: <strong>hundreds to thousands per second instead of millions per second</strong>.` },

    { type: 'flow', height: 320,
      nodes: [
        { id: 'v', label: 'Viewers', sub: '30M, poll 5 s', x: 80, y: 160, w: 140, kind: 'client', info: 'What it is: the 30 million apps watching the match, each sending GET /live/score.json every 5 seconds. In total ~6M requests/s.' },
        { id: 'cdn', label: 'CDN edges', sub: 'TTL 1-2 s', x: 285, y: 160, w: 150, kind: 'edge', info: 'What it is: edge servers (CDN) around the world, close to users\' cities. The score JSON is the same for everyone, so each edge caches it for 1-2 s and gives the same copy to all viewers in its area.' },
        { id: 'o', label: 'Score service', sub: 'origin', x: 490, y: 160, w: 150, kind: 'server', meter: true, load: 10, info: 'What it is: our real server (the origin). It builds a small JSON of the latest score. With the CDN, it gets only ~1 request per TTL from each edge.' },
        { id: 'sc', label: 'Scorer', sub: 'stadium', x: 645, y: 55, w: 120, kind: 'client', info: 'What it is: the scorer in the stadium (a person + an app) who enters an update after every ball. Very few writes: ~1 per ball.' },
        { id: 'db', label: 'Score DB', sub: 'ball by ball', x: 645, y: 265, w: 120, kind: 'data', info: 'What it is: the database that keeps a record of every ball. Very small data. The score service writes the latest state here.' },
      ],
      edges: [{ a: 'v', b: 'cdn' }, { a: 'cdn', b: 'o' }, { a: 'sc', b: 'o' }, { a: 'o', b: 'db' }],
      scenarios: [
        { name: 'Edge hit', steps: [
          { title: 'Millions of polls at the edge', text: 'Every 5 seconds, tens of millions of apps. All reach the nearest edge.', flood: { paths: ['v>cdn'], n: 14 }, msg: 'GET /live/score.json' },
          { title: 'The edge answers by itself', text: 'The score is not even 1 second old yet. The origin does not even know.', go: 'res:cdn>v', set: { o: { state: 'dim' } }, after: { cdn: { state: 'hit', sub: 'HIT' } }, msg: '200 OK  { "IND": "187/4", "overs": "32.3" }   Age: 0.6' },
        ]},
        { name: 'A ball is bowled, TTL ends', steps: [
          { title: 'Scorer update', text: 'A four! The score service writes it to the DB.', go: ['sc>o', 'o>db', 'res:db>o'], after: { o: { sub: '191/4' } }, msg: 'POST ball 32.4 → FOUR' },
          { title: 'The edge\'s TTL ends', text: 'After 1 s each edge sends only <strong>one</strong> request to the origin (even if thousands of requests reached that edge in that moment).', go: ['cdn>o', 'res:o>cdn'], after: { cdn: { state: 'ok', sub: 'refreshed 191/4' } } },
          { title: 'Everyone gets the new score', text: 'All polls in the next 1 s get the new score from the edge. Max delay ≈ TTL + poll interval.', flood: { paths: ['res:cdn>v'], n: 10 } },
        ]},
        { name: 'No CDN / cache-busting (failure)', intro: 'Someone added ?t=timestamp to the URL for "fresh data". Now every request is a different URL, so for the CDN every request is a MISS.', steps: [
          { title: 'Every request reaches the origin', text: '6M requests/s go straight to the score service.', flood: { paths: ['v>cdn>o'], n: 18 }, set: { cdn: { state: 'miss', sub: 'all MISS' } }, after: { o: { load: 100, state: 'hot', sub: '6M req/s!' } } },
          { title: 'The origin falls over', text: 'This needed ~1,800 servers. There are 2. At the biggest moment of the match, the app has no score.', go: 'bad:o>cdn>v', after: { o: { state: 'down', sub: 'DOWN' }, v: { state: 'down', sub: 'no score' } } },
          { title: 'Fix', text: 'The same URL for everyone, the right <code>Cache-Control: max-age=1</code> header, and the CDN on. The napkin maths had already said it: 6M/s is a job only for a CDN.', focus: ['cdn'] },
        ]},
      ],
    },

    { type: 'h2', text: 'All three together' },
    { type: 'table', head: ['System', 'Bottleneck number', 'What it chose'], rows: [
      ['Twitter-like feed', '600k reads/s peak, 50:1, 2.4 PB, 20 TB/day media', 'Feed cache + precompute, sharded store / Cassandra, object storage + CDN, ~180 servers'],
      ['WhatsApp-style chat', '100M concurrent connections', '~1,000 gateways + user → gateway registry, inbox for offline'],
      ['Live cricket score', '6M req/s, but the same data for everyone', 'CDN with 1-2 s TTL; origin almost idle'],
    ]},
    { type: 'callout', tone: 'why', title: 'Decide', html: `In each example one number decides the design. In the feed it is <strong>read:write and storage</strong>, in chat it is <strong>concurrent connections</strong>, in the live score it is <strong>"same data for everyone" × QPS</strong>. Estimate, find that number, and say the conclusion out loud: "6M/s, but an identical response, so a CDN." That line wins the interview.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `(1) <strong>Measuring every system by QPS</strong>: in chat the real question is connections, not QPS. (2) <strong>Seeing 6M req/s and ordering 1,800 servers</strong>: first ask "is the response the same for everyone?" If yes, a CDN. (3) <strong>Mixing media and text</strong>: 2.4 PB of text goes in the DB, 20 TB/day of media goes separately to object storage; the two have different designs.` },

    { type: 'diagram', title: 'All three examples: from number to design', height: 470,
      groups: [
        { label: 'Feed (Example 1)', x: 8, y: 30, w: 704, h: 120 },
        { label: 'Chat (Example 2)', x: 8, y: 170, w: 704, h: 120 },
        { label: 'Live score (Example 3)', x: 8, y: 310, w: 704, h: 120 },
      ],
      nodes: [
        { id: 'f1', label: '200M DAU', sub: '2 posts, 100 views', x: 90, y: 95, w: 150, kind: 'client', info: 'What it is: the inputs of Example 1. 200M daily users, each writes 2 posts and views 100. 10% of posts have a 500 KB image.' },
        { id: 'f2', label: '600k reads/s', sub: '50:1, 2.4 PB', x: 270, y: 95, w: 150, kind: 'server', info: 'What it is: the result of the recipe. Reads 200k/s avg, 600k/s peak; writes 12k/s peak; text 2.4 PB (5 years × 3); media 20 TB/day.' },
        { id: 'f3', label: 'Feed cache', sub: '+ sharded posts', x: 450, y: 95, w: 150, kind: 'cache', info: 'What it is: a decision. 50:1 read-heavy → precomputed feeds in a cache. 12k writes/s and 2.4 PB → a sharded store or Cassandra.' },
        { id: 'f4', label: 'CDN + S3', sub: '~180 app servers', x: 630, y: 95, w: 150, kind: 'edge', info: 'What it is: a decision. 20 TB/day of media in object storage, ~30 GB/s of image egress from a CDN. App servers: 600k ÷ 5k × 1.5 ≈ 180.' },
        { id: 'c1', label: '100M online', sub: '1 WebSocket each', x: 90, y: 235, w: 150, kind: 'client', info: 'What it is: the inputs of Example 2. 100M phones at peak, each with one open WebSocket connection.' },
        { id: 'c2', label: '100M conns', sub: '~833k msgs/s', x: 270, y: 235, w: 150, kind: 'server', info: 'What it is: the result of the recipe. The bottleneck is connections. Messages (our assumption) ~833k/s at peak, ~3 PB a year (3 copies), bandwidth only ~0.7 Gbps.' },
        { id: 'c3', label: '1,000 gateways', sub: '100k each', x: 450, y: 235, w: 150, kind: 'server', info: 'What it is: a decision. 100M ÷ 100k = 1,000 connection servers (~1,500 with headroom), over 3 zones.' },
        { id: 'c4', label: 'Registry', sub: '+ message store', x: 630, y: 235, w: 150, kind: 'cache', info: 'What it is: a decision. A user → gateway address book (in RAM, ~10 GB), and a write-heavy sharded store for messages.' },
        { id: 'l1', label: '30M viewers', sub: 'poll every 5 s', x: 90, y: 375, w: 150, kind: 'client', info: 'What it is: the inputs of Example 3. 30M apps ask for the score every 5 seconds.' },
        { id: 'l2', label: '6M req/s', sub: 'same JSON for all', x: 270, y: 375, w: 150, kind: 'server', info: 'What it is: the result of the recipe. 30M ÷ 5 = 6M/s, 6 GB/s of egress. But the answer is exactly the same for every viewer.' },
        { id: 'l3', label: 'CDN, TTL 1 s', sub: 'edges answer', x: 450, y: 375, w: 150, kind: 'edge', info: 'What it is: a decision. Edges cache the score for 1 s; of 6M/s only ~100/s reach the origin.' },
        { id: 'l4', label: 'Origin: 2', sub: 'not 1,800', x: 630, y: 375, w: 150, kind: 'server', info: 'What it is: a decision. With the CDN, 2 origin servers are enough (2 for availability). Without a CDN you would need ~1,800.' },
      ],
      edges: [
        { a: 'f1', b: 'f2', n: 1 }, { a: 'f2', b: 'f3', n: 2 }, { a: 'f3', b: 'f4', n: 3 },
        { a: 'c1', b: 'c2', n: 1 }, { a: 'c2', b: 'c3', n: 2 }, { a: 'c3', b: 'c4', n: 3 },
        { a: 'l1', b: 'l2', n: 1 }, { a: 'l2', b: 'l3', n: 2 }, { a: 'l3', b: 'l4', n: 3 },
      ],
      paths: [
        { name: 'Feed', text: 'Reads and storage are the biggest: cache + precompute, sharding, CDN + object storage for media.', go: ['f1>f2>f3>f4'] },
        { name: 'Chat', text: 'Connections are the biggest: 1,000 gateways + a registry; a sharded store for messages.', go: ['c1>c2>c3>c4'] },
        { name: 'Live score', text: '6M/s but the same for everyone: the CDN handles it all, 2 servers at the origin.', go: ['l1>l2>l3>l4'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>The same recipe in every example: users → QPS → peak → storage → bandwidth → servers.</li>
      <li>Each system has a different bottleneck number: reads + storage in the feed, connections in chat, "same data × QPS" in the live score.</li>
      <li>Feed: 600k reads/s at peak, 50:1 → cache + precomputed feeds; 2.4 PB → sharding; 20 TB/day of media → object storage + CDN.</li>
      <li>Chat: 100M ÷ 100k = 1,000 gateways + a registry (user → gateway); a gateway crash = a reconnect storm, so jitter + headroom.</li>
      <li>Live score: 30M ÷ 5 s = 6M/s, but identical JSON → a CDN with a 1 s TTL; origin ~100 req/s.</li>
      <li>A cache-busting URL (?t=now) makes the CDN useless: for freshness use a short TTL and keep the URL the same.</li>
      <li>Say your assumptions out loud; if one changes, redo only the steps after it.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['The design comes straight from the numbers, not from guessing', 'A number behind every box: the answer to the interviewer\'s "why" is ready', 'When an assumption changes (DAU, poll interval), you instantly see what flips', 'Protection from over-engineering: small numbers, simple design'], costs: ['If the assumptions (peak 3×, 100k per gateway, 1 KB) are wrong, the conclusion can shake too', 'Napkin maths does not show edge cases: celebrity posts, reconnect storms and hot keys need separate thought', 'The CDN answer brings staleness (the score can be ~TTL + poll old)', 'Precomputed feeds make writing expensive'] },

    { type: 'think', questions: [
      { q: 'In the feed example, change DAU from 200M to 2M (slider). Which conclusions flipped?', a: '2M × 2 = 4M writes/day → 40/s avg, 120/s peak: one DB primary is enough. Reads 2k/s avg, 6k/s peak: a cache is good, but one DB + replicas would also work. Text storage 4 GB/day → 1.6 TB/year → 5 years × 3 replicas = 24 TB: the widget will still say "sharding". But this data arrives slowly over 5 years (~1.6 TB per copy per year), so for the first 1-2 years one DB + replicas will do; after that, sharding or archiving. Media 200 GB/day: object storage, CDN optional. App servers ~2. The design became much simpler.' },
      { q: 'In the live score, the poll interval was changed from 5 s to 1 s so the score feels "more live". What changes at the origin (CDN on)? What changes for viewers?', a: 'Client requests go up 5× (6M → 30M/s), but nothing changes at the origin: edges still send one request per TTL (~100/s). The CDN egress went up 5× (the bill!). For viewers the max delay is TTL + poll = 2 s instead of 6 s. If it truly has to be instant, think of push (SSE/WebSocket) instead of polling, or push for moments like a wicket.' },
      { q: 'In the chat example, a gateway can hold 1M connections instead of 100k (better tech). Is the registry no longer needed?', a: 'No. 100M ÷ 1M = 100 gateways, still more than one. As long as the sender and receiver can be on different gateways, you need a registry. And yes, after a crash 1M users will reconnect at once: an even bigger reconnect storm.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Feed example: 200M DAU × 100 views/day. Peak read QPS (×3)?', options: ['~60k/s', '~600k/s', '~6M/s'], answer: 1, explain: '200M × 100 = 2 × 10^10 / 10^5 = 200k/s avg × 3 = 600k/s.' },
      { q: 'Text storage of 400 GB/day, 5 years, 3 replicas?', options: ['~600 TB', '~2.4 PB', '~24 PB'], answer: 1, explain: '400 GB × 400 = 160 TB/year × 5 = 800 TB × 3 = 2.4 PB.' },
      { q: '100M users online, one gateway holds 100k connections. How many gateways?', options: ['100', '1,000', '10,000'], answer: 1, explain: '10^8 ÷ 10^5 = 10^3 = 1,000. Plus a user → gateway registry.' },
      { q: '30M viewers, each polling every 5 s. Requests/s and the right answer?', options: ['600k/s, big servers', '6M/s, a CDN because the response is the same for everyone', '30M/s, WebSockets'], answer: 1, explain: '30M ÷ 5 = 6M/s. Edges cache the identical JSON for 1-2 s, so the origin gets only a few requests/s.' },
      { q: 'Chat example: 100M online, each user sends 30 messages an hour. Peak messages/s?', options: ['~8k/s', '~833k/s', '~30M/s'], answer: 1, explain: '100M × 30 ÷ 3,600 ≈ 833k/s. That many writes need a sharded, write-optimised store.' },
      { q: 'What happened when ?t=timestamp was added to the live score URL?', options: ['The score became fresher', 'Every request had a different URL, every request was a MISS at the CDN, 6M/s at the origin', 'Nothing'], answer: 1, explain: 'The cache key is the URL. Every URL different = the cache is useless. For freshness use a short TTL; do not change the URL.' },
    ]},
    { type: 'sources', note: 'The main numbers of all three examples come from Phase 4 of the roadmap. The chat message and score JSON numbers are our own assumptions (as said in the text). Other facts come from the sources below.', items: [
      { title: 'Timelines at Scale (talk by Raffi Krikorian)', publisher: 'InfoQ / QCon (Twitter engineering)', year: 2013, url: 'https://www.infoq.com/presentations/Twitter-Timeline-Scalability/', used: 'Twitter precomputed home timelines in an in-memory cache (fan-out on write) and treated accounts with huge follower counts differently. 2013 talk; the idea is still the standard way to explain feeds.' },
      { title: 'The Road to 2 Million Websocket Connections in Phoenix', publisher: 'Phoenix Framework blog', year: 2015, url: 'https://phoenixframework.org/blog/the-road-to-2-million-websocket-connections', used: 'One large server holding ~2 million idle WebSocket connections in a benchmark; why 100k per gateway is a safe estimate.' },
      { title: 'WhatsApp Privacy Policy', publisher: 'WhatsApp', official: true, url: 'https://www.whatsapp.com/legal/privacy-policy', used: 'Messages are deleted from WhatsApp servers once delivered (undelivered ones are kept for a while): why server-side storage can be small.' },
      { title: 'Cache-Control header', publisher: 'MDN Web Docs', official: true, url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control', used: 'max-age tells shared caches (CDNs) how many seconds to keep a response; the URL is part of the cache key.' },
    ]},
  ],
});
