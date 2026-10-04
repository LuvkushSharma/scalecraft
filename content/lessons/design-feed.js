Lesson.register({
  id: 'design-feed',
  title: 'Instagram / Twitter feed',
  minutes: 45,
  summary: `App kholte hi un logon ke latest posts dikhne chahiye jinhe tum follow karte ho: 200 ms ke andar, 20 crore users ke liye. Aur jab koi celebrity post kare jiske 10 crore followers hain, tab bhi system na gire. Hum feed zero se banayenge: feed list pehle se banana (push) ya padhte waqt banana (pull), dono ka mix (hybrid), cache, ranking aur scroll ke liye cursor.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Instagram kholo to upar se neeche posts ki ek lambi list aati hai: tumhare dosto ki photos, kisi creator ki video. Ye list kisi ne pehle se banayi hai, ya abhi abhi ban rahi hai? Agar har baar sau logon ke posts dhoondh ke jodna pade, to app slow ho jaayega. Agar har post pe crore logon ki list update karni pade, to celebrity ke ek post se system hil jaayega. Is lesson mein hum dekhenge ki feed kab aur kaise banti hai, kaise "achhe" posts upar aate hain, aur scroll karte waqt agle posts bina dohraaye kaise aate hain.` },
    { type: 'callout', tone: 'tip', title: 'Pehle khud try karo', html: `10 minute kaagaz pe socho: Riya 300 logon ko follow karti hai. App kholte hi use unke latest posts dikhne chahiye. Ye list kab banaoge: jab koi post kare tab, ya jab Riya app khole tab? Aur agar kisi ke 10 crore followers hon? Phir yahan compare karo.` },
    { type: 'p', html: `Pichhle lesson (<a href="#/design-whatsapp">WhatsApp</a>) mein group fan-out dekha: ek message, sau-hazaar phones. Feed usi problem ka bada bhai hai: ek post, <strong>crores</strong> followers. Aur feed mein ek naya twist hai: users chahte hain ki sabse <em>interesting</em> posts upar hon, sirf latest nahi. Ye lesson Twitter ke "Timelines at Scale" talk (2013), Twitter ke 2023 mein open-source kiye recommendation algorithm, aur Instagram/Meta ke posts pe based hai.` },

    { type: 'h2', text: 'Step 1: requirements' },
    { type: 'compare',
      left: { title: 'Functional', html: `• User post kare (text, photo, video)<br>• Follow / unfollow<br>• Home feed: jinhe follow karte ho unke posts, naye ya ranked order mein<br>• Scroll karte jao, aur purane posts load hon (pagination)<br><br><strong>Out of scope:</strong> comments, DMs, search, ads, Explore/Reels recommendations (bas ranking ka idea dekhenge)` },
      right: { title: 'Non-functional', html: `• Feed load fast: ~200 ms<br>• Bahut read-heavy: log post kam karte hain, scroll zyada<br>• Thoda purana feed chalta hai: naya post kuch seconds der se dikhe to theek (<strong>eventual consistency</strong>)<br>• Celebrity ka post bhi system ko na giraye<br>• High availability: feed khaali dikhe, ye bhi bura hai` },
    },
    { type: 'callout', tone: 'term', title: 'Naya word: eventual consistency', html: `<strong>Ye kya hai:</strong> "aakhir mein sab sahi ho jaayega". Aman ne post kiya, to wo Riya ki feed mein turant nahi, lekin kuch seconds mein zaroor aa jaayega.<br><strong>Kyun chahiye:</strong> crore feeds ko ek hi pal mein update karna bahut mehenga hai. Thodi der chalti hai.<br><strong>Iske bina:</strong> har post pe sab feeds ek saath lock karke update karne padte: system bahut slow. Detail <a href="#/consistency">Consistency</a> lesson mein.` },

    { type: 'h2', text: 'Step 2: feed ke basics, bilkul zero se' },
    { type: 'p', html: `Koi bhi diagram banane se pehle, chhote chhote hisse samjho. Hum xyz.com pe ek photo-sharing app bana rahe hain.` },
    { type: 'h3', text: '2a. Feed, timeline aur follower graph' },
    { type: 'callout', tone: 'term', title: 'Naye words: home feed, user timeline', html: `<strong>Home feed:</strong> <strong>Ye kya hai:</strong> app kholte hi dikhne wali posts ki list, un sab logon ki jinhe tum follow karte ho. <strong>Kyun chahiye:</strong> yahi app ka main page hai, sabse zyada yahi khulta hai.<br><strong>User timeline:</strong> <strong>Ye kya hai:</strong> ek insaan ke apne saare posts, latest pehle (uski profile). <strong>Kyun chahiye:</strong> home feed asal mein in user timelines ka mix hai.<br><strong>Iske bina:</strong> user ko har dost ki profile alag alag kholni padti.` },
    { type: 'callout', tone: 'term', title: 'Naya word: follower graph', html: `<strong>Ye kya hai:</strong> "kaun kisko follow karta hai" ki list, jaise "riya → aman" (Riya, Aman ko follow karti hai). Isse do sawaal poochhe jaate hain: "Riya kise follow karti hai?" aur "Aman ke followers kaun hain?".<br><strong>Kyun chahiye:</strong> feed banane ke liye pata hona chahiye ki kiske posts kisko dikhane hain.<br><strong>Iske bina:</strong> feed ban hi nahi sakti.<br><strong>Dhyaan do:</strong> ye graph barabar nahi hota. Zyada log ke kuch sau followers, lekin kuch accounts ke crores. Neeche ki tasveer jaisa: kuch bade gole (bahut connections), baaki chhote.` },
    { type: 'image', src: 'assets/img/design-feed/social-graph.jpg', maxWidth: 560, alt: 'Ek social network graph: sainkadon chhote gole (log) aur unke beech patli lines, beech mein kuch bade gole jinke bahut saare connections hain', caption: 'Ek asli social network ka graph (League of Nations ke logon ka, ek research project se). Har gola ek insaan, har line ek rishta. Beech ke bade gole "hubs" hain jinke bahut connections hain. Feed mein yahi hubs celebrities hain, aur yahi sabse badi problem banenge.', credit: { text: 'Martin Grandjean, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Social_Network_Analysis_Visualization.png', license: 'CC BY-SA 3.0' } },
    { type: 'h3', text: '2b. Feed kab banayein? Do raaste' },
    { type: 'p', html: `Riya Aman, Dev aur ek film star ko follow karti hai. Riya ki feed = in teeno ke posts, latest pehle. Ye list do waqt pe ban sakti hai: jab Riya feed khole (padhte waqt), ya jab koi post kare (likhte waqt).` },
    { type: 'callout', tone: 'term', title: 'Naya word: fan-out', html: `<strong>Ye kya hai:</strong> ek post ko bahut saare followers tak pahunchaana. Ek se bahut ki taraf, jaise pankhe ki hawa.<br><strong>Fan-out on read (pull):</strong> post sirf author ki timeline mein likho. Riya feed khole tab us waqt sabki timelines padh ke jodo.<br><strong>Fan-out on write (push):</strong> post hote hi uska ID har follower ki apni ready list mein daal do. Riya feed khole to bas apni list padho.<br><strong>Kyun chahiye ye soch:</strong> kaam ya to post ke waqt hoga ya padhne ke waqt. Kab karna sasta hai, yahi feed design ka asli sawaal hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: feed cache (Redis list)', html: `<strong>Ye kya hai:</strong> har user ki ek ready list, RAM mein (jaise Redis), jisme sirf post IDs hain, latest pehle: <code>feed:riya = [907, 905, 880, ...]</code>.<br><strong>Kyun chahiye:</strong> push mein feed pehle se ban ke rakhi rehti hai; padhna bas ek list read, milliseconds mein.<br><strong>Iske bina:</strong> har feed open pe sau timelines dhoondh ke jodni padti.<br><strong>Kyun "cache":</strong> ye asli data nahi hai; asli posts database mein hain. List kho jaaye to dobara ban sakti hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: celebrity problem', html: `<strong>Ye kya hai:</strong> push mein ek post = jitne followers utne writes. Normal user (200 followers) ke liye 200 chhote writes, koi baat nahi. Lekin 10 crore followers wale star ka ek post = 10 crore writes.<br><strong>Kyun zaroori:</strong> aise ek post se queue mein minutes ka jaam lag jaata hai, aur baaki sabke posts bhi late.<br><strong>Hal (aage detail):</strong> <em>hybrid</em>: normal users ke liye push, celebrities ke liye pull.` },
    { type: 'p', html: `Chhote se xyz.com pe khud dekho. Riya Aman, Dev aur Star ko follow karti hai. Mode badlo, post karwao, aur gino ki post pe kitne writes hue aur Riya ke feed kholne pe kitna kaam hua:` },
    { type: 'custom', render(el) {
      const FOL = { Aman: ['Riya', 'Zoya'], Dev: ['Riya', 'Kabir', 'Meera'], Star: ['Riya', 'Zoya', 'Kabir', 'Meera'] };
      const READERS = ['Riya', 'Zoya', 'Kabir', 'Meera'], RIYA_FOLLOWS = ['Aman', 'Dev', 'Star'];
      let mode, next, tl, lists, wTot, log, shown;
      const reset = () => { next = 901; tl = { Aman: [], Dev: [], Star: [] }; lists = {}; READERS.forEach(r => lists[r] = []); wTot = 0; log = ['Shuru: koi post nahi.']; shown = null; };
      el.innerHTML = `<div class="chips fdm-mode" style="padding:0"><button type="button" class="chip on" data-m="push">Push (write pe)</button><button type="button" class="chip" data-m="pull">Pull (read pe)</button><button type="button" class="chip" data-m="hyb">Hybrid</button></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0">
          <button type="button" class="btn small" data-a="Aman">Aman post kare (2 followers)</button>
          <button type="button" class="btn small" data-a="Dev">Dev post kare (3 followers)</button>
          <button type="button" class="btn small" data-a="Star">Star post kare (celebrity)</button>
          <button type="button" class="btn small primary fdm-open">Riya feed khole</button>
          <button type="button" class="btn small ghost fdm-reset">Reset</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px" class="fdm-boxes"></div>
        <div class="stats"><div class="stat"><span>Ab tak post pe writes</span><strong class="fdm-w"></strong></div><div class="stat"><span>Riya ke feed open pe reads</span><strong class="fdm-r"></strong></div></div>
        <div class="calc-note fdm-log" style="max-height:140px;overflow:auto"></div>`;
      const q = s => el.querySelector(s);
      const pushes = a => mode === 'push' || (mode === 'hyb' && a !== 'Star');
      const draw = () => {
        const box = (t, items, note) => `<div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:8px;background:var(--surface-2)"><strong style="font-size:14px">${t}</strong><div style="font-family:var(--f-mono);font-size:13px;margin-top:4px;word-break:break-word">${items.length ? items.join(', ') : '<span style="color:var(--ink-3)">' + (note || 'khaali') + '</span>'}</div></div>`;
        q('.fdm-boxes').innerHTML = Object.keys(tl).map(a => box(`Timeline: ${a}`, tl[a].map(x => x.id))).join('') +
          READERS.map(r => box(`feed:${r.toLowerCase()} (list)`, lists[r].map(x => x.id), mode === 'pull' ? 'pull: list nahi banti' : 'khaali')).join('') +
          box('Riya ko dikha', shown ? shown.map(x => x.a + ' ' + x.id) : [], 'abhi feed nahi kholi');
        q('.fdm-w').textContent = wTot;
        q('.fdm-r').textContent = shown ? shown.reads : '-';
        q('.fdm-log').innerHTML = log.slice(-5).map(x => '• ' + x).join('<br>');
      };
      el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
        const a = b.dataset.a, p = { a, id: next++ };
        tl[a].unshift(p); let w = 1;
        if (pushes(a)) { FOL[a].forEach(r => lists[r].unshift(p)); w += FOL[a].length; }
        wTot += w;
        log.push(`${a} ne post ${p.id} kiya: ${w} write${w > 1 ? 's' : ''} (1 apni timeline${pushes(a) ? ' + ' + FOL[a].length + ' followers ki lists' : ', followers ki lists nahi chhui'}).${a === 'Star' && pushes(a) ? ' Asli duniya mein ye 10 crore writes hote!' : ''}`);
        draw();
      });
      q('.fdm-open').onclick = () => {
        let items, reads;
        if (mode === 'push') { items = lists.Riya.slice(); reads = 1; }
        else if (mode === 'pull') { items = RIYA_FOLLOWS.flatMap(a => tl[a]); reads = RIYA_FOLLOWS.length; }
        else { items = lists.Riya.concat(tl.Star); reads = 2; }
        items = items.sort((x, y) => y.id - x.id).slice(0, 6);
        shown = items; shown.reads = reads;
        log.push(mode === 'push' ? 'Riya: sirf apni ready list padhi (1 read). Sabse sasta.' : mode === 'pull' ? `Riya: ${RIYA_FOLLOWS.length} timelines padhi aur merge ki. Asli duniya mein 300 follows = 300 reads, har feed open pe.` : 'Riya: apni list (Aman, Dev ke posts) + Star ki timeline = 2 reads, phir merge.');
        draw();
      };
      el.querySelectorAll('.fdm-mode .chip').forEach(c => c.onclick = () => { el.querySelectorAll('.fdm-mode .chip').forEach(x => x.classList.toggle('on', x === c)); mode = c.dataset.m; reset(); log = [`Mode: ${c.textContent}. Sab reset.`]; draw(); });
      q('.fdm-reset').onclick = () => { reset(); draw(); };
      mode = 'push'; reset(); draw();
    }},
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `"Push hamesha best hai, kyunki padhna sasta hai." Sirf tab tak jab followers kam hon. Star ka ek post push mein utne writes karwata hai jitne uske followers. Aur "pull hamesha best hai, kyunki likhna sasta hai" bhi galat: har feed open pe sau timelines padhna, aur reads writes se 50 guna zyada hain. Isliye asli systems <strong>hybrid</strong> chalate hain.` },

    { type: 'h2', text: 'Step 3: napkin maths' },
    { type: 'p', html: `Roadmap ka worked example: 200M daily users, har user din mein 2 post karta hai aur 100 posts dekhta hai. Numbers badal ke dekho (ye "maan lo" wale numbers hain):` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="fd-dau">Daily active users (millions)</label><input id="fd-dau" type="number" value="200" min="1" step="1"></div>
          <div><label for="fd-ppd">Posts per user per day</label><input id="fd-ppd" type="number" value="2" min="0.1" step="0.1"></div>
          <div><label for="fd-vpd">Posts dekhe per user per day</label><input id="fd-vpd" type="number" value="100" min="1" step="1"></div>
          <div><label for="fd-fol">Average followers</label><input id="fd-fol" type="number" value="200" min="1" step="1"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Post writes/s (avg)</span><strong class="o-w"></strong></div>
          <div class="stat"><span>Feed reads/s (avg)</span><strong class="o-r"></strong></div>
          <div class="stat"><span>Read : write</span><strong class="o-rw"></strong></div>
          <div class="stat"><span>Fan-out writes/s (push)</span><strong class="o-fo"></strong></div>
          <div class="stat"><span>Text data per day</span><strong class="o-tx"></strong></div>
          <div class="stat"><span>Media per day (10% × 500 KB)</span><strong class="o-md"></strong></div>
        </div>
        <div class="calc-note o-note"></div>`;
      const v = id => Math.max(0.1, Number(el.querySelector('#' + id).value) || 0.1);
      const f = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : n.toFixed(0);
      const sz = b => b >= 1e12 ? (b / 1e12).toFixed(1) + ' TB' : (b / 1e9).toFixed(0) + ' GB';
      const upd = () => {
        const dau = v('fd-dau') * 1e6, ppd = v('fd-ppd'), vpd = v('fd-vpd'), fol = v('fd-fol');
        const posts = dau * ppd, w = posts / 1e5, r = dau * vpd / 1e5;
        el.querySelector('.o-w').textContent = f(w) + '/s (peak ~' + f(w * 3) + ')';
        el.querySelector('.o-r').textContent = f(r) + '/s (peak ~' + f(r * 3) + ')';
        el.querySelector('.o-rw').textContent = Math.round(r / w) + ' : 1';
        el.querySelector('.o-fo').textContent = f(w * fol) + '/s';
        el.querySelector('.o-tx').textContent = sz(posts * 1e3);
        el.querySelector('.o-md').textContent = sz(posts * 0.1 * 5e5);
        el.querySelector('.o-note').textContent = `Assumptions: ek din ≈ 10^5 s, peak ≈ 3× average, ek post ka text + metadata ≈ 1 KB. Conclusion: reads writes se ${Math.round(r / w)} guna, to feed pehle se bana ke rakhna (precompute) aur cache karna samajhdaari hai. Lekin agar har post har follower ki list mein likhein, to ${f(w * fol)} writes/s: average follower count hi decide karta hai ki "push" kitna mehnga hai.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},

    { type: 'h2', text: 'Step 4: API aur data model' },
    { type: 'p', html: `Teen kaam: post karna, follow karna, aur feed padhna. Feed ek baar mein poori nahi aati, 20-20 ke tukdon (pages) mein aati hai. Har jawab ke saath server ek <em>cursor</em> deta hai: ek bookmark ki "yahan tak dekh liya". Agla page maangte waqt app wahi bookmark wapas bhejta hai. Cursor ki poori kahani neeche "cursor pagination" deep dive mein.` },
    { type: 'code', text: `
POST /posts                      body: { text, media_ids[] }      → 201 { post_id }
POST /users/{id}/follow
GET  /feed?limit=20              → { posts: [...], next_cursor: "1719…:9f2" }
GET  /feed?limit=20&cursor=1719…:9f2   → agle (purane) 20` },
    { type: 'table', head: ['Entity', 'Fields', 'Kahan'], rows: [
      ['Post', 'post_id (time-ordered), author_id, text, media URLs, created_at', 'Sharded DB (Instagram: sharded PostgreSQL, 2012); media blob store + CDN'],
      ['Follow', 'follower_id, followee_id, created_at', 'Graph store / sharded table, dono directions ke index (Twitter 2013: Flock)'],
      ['Feed (timeline)', 'user_id → [post_id, post_id, ...] latest pehle', 'Redis list, sirf IDs, length capped'],
      ['User', 'user_id, name, avatar, follower_count, is_celebrity', 'Sharded DB + cache'],
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: hydration', html: `<strong>Ye kya hai:</strong> feed cache mein sirf post IDs hoti hain (8 bytes each), poora post nahi. Feed dikhane se pehle un IDs ko poore posts mein badalna (text, photo ka URL, author ka naam, like count) <strong>hydration</strong> kehlata hai, jaise sukhe beej mein paani daal ke poora paudha banana.<br><strong>Kyun chahiye:</strong> post edit ya delete ho to sirf ek jagah badlo, crores feeds mein nahi. Aur lists chhoti rehti hain.<br><strong>Iske bina:</strong> har feed list mein poore posts ki copies: memory 100 guna, aur ek edit pe crores jagah badlaav.` },

    { type: 'h2', text: 'Step 5: sabse seedha design, aur wo kyun tootega' },
    { type: 'p', html: `Pehla idea: jab Riya feed khole, database se poochh lo:` },
    { type: 'code', text: `
SELECT p.* FROM posts p
JOIN follows f ON f.followee_id = p.author_id
WHERE f.follower_id = 'riya'
ORDER BY p.created_at DESC
LIMIT 20;` },
    { type: 'p', html: `Chhote xyz.com pe ye kaam karta hai. Lekin socho: Riya 300 logon ko follow karti hai. Ye query 300 authors ke posts dhoondhti hai (jo alag alag shards pe hain, kyunki posts author ke hisaab se shard hain), unhe merge aur sort karti hai, aur ye kaam <strong>har feed open pe</strong> hota hai, 2 lakh baar per second. Ek hi kaam baar baar, aur har baar bahut saare shards pe (scatter-gather). Isko <strong>fan-out on read</strong> (ya pull) kehte hain: feed padhte waqt banta hai.` },
    { type: 'p', html: `Reads 50 guna zyada hain. To ulta socho: feed <strong>likhte waqt</strong> hi bana do. Riya ke liye ek ready list rakho; jab bhi koi jise Riya follow karti hai post kare, uska post_id Riya ki list mein daal do. Feed padhna ab ek simple list read hai. Ye <strong>fan-out on write</strong> (ya push) hai.` },

    { type: 'h2', text: 'Step 6: fan-out on write (push)' },
    { type: 'p', html: `Twitter ne 2013 ke "Timelines at Scale" talk mein (VP Engineering Raffi Krikorian) bataya tha ki unki home timeline isi tarah bani thi: har user ki timeline Redis cluster mein ek list, jisme sirf tweet IDs (aur thodi info), har list ki ek copy teen machines pe, aur ek list mein max ~800 entries. Tab ke numbers: ~150M active users, timeline reads ~300k QPS (har second itni requests), tweets ~5k/s average. Ye 10+ saal purani jaankari hai, aaj ka X ka system badal chuka hai, lekin core idea aaj bhi interview ka standard jawab hai.` },
    { type: 'flow', title: 'Fan-out on write', height: 330,
      nodes: [
        { id: 'a', label: 'Aman (posts)', x: 75, y: 80, w: 120, kind: 'client', info: 'Ye kya hai: post karne wala user (Aman ka phone). Uske followers hain; har follower ki feed list mein uska post_id jaana hai.' },
        { id: 'post', label: 'Post service', x: 255, y: 80, w: 140, kind: 'server', info: 'Ye kya hai: post service, jo naya post save karti hai (time-ordered post_id ke saath), Aman ko turant "posted" bolti hai, aur fan-out ka kaam queue mein daal deti hai. Kyun: Aman ko fan-out poora hone ka wait na karna pade.' },
        { id: 'pdb', label: 'Post DB', sub: 'sharded', x: 455, y: 50, w: 130, kind: 'data', info: 'Ye kya hai: Post DB, posts ka asli ghar (source of truth), author_id ya post_id se kai shards mein baanta hua. Photo/video yahan nahi, blob store + CDN mein; yahan sirf unka URL.' },
        { id: 'fo', label: 'Fan-out workers', sub: 'queue + workers', x: 255, y: 220, w: 150, kind: 'queue', info: 'Ye kya hai: ek queue (kaam ki line) aur uske workers (background programs). Queue se "Aman ne post kiya" uthate hain, Aman ke followers laate hain, aur har follower ki Redis list mein post_id daalte hain. Instagram ne 2011 mein bataya tha ki feed fan-out Gearman task queue ke workers karte the.' },
        { id: 'graph', label: 'Follower graph', sub: 'who follows Aman', x: 470, y: 175, w: 140, kind: 'data', info: 'Ye kya hai: follower graph, "kaun kisko follow karta hai" ka store. Fan-out ke liye "Aman ke followers" chahiye, aur reads ke liye "Riya kise follow karti hai". Twitter (2013) mein ye Flock naam ki service thi.' },
        { id: 'redis', label: 'Feed cache', sub: 'Redis lists', x: 470, y: 285, w: 140, kind: 'cache', info: 'Ye kya hai: feed cache, har user ki ek Redis list jisme latest post_ids hain. LPUSH (list ke aage daalo) se naya ID aage, LTRIM (list kaato) se lambai capped (Twitter 2013: ~800). Sirf IDs, isliye memory kam. Kai copies (replicas), taaki ek node girne pe feeds gayab na hon.' },
        { id: 'r', label: 'Riya (reads)', x: 640, y: 180, w: 120, kind: 'client', info: 'Ye kya hai: Riya ka phone, feed padhne wali. Uski list pehle se taiyaar hai: ek read, kuch milliseconds. (Asli mein beech mein feed service hai jo hydration aur ranking karti hai; Step 8 ka diagram.)' },
      ],
      edges: [{ a: 'a', b: 'post' }, { a: 'post', b: 'pdb' }, { a: 'post', b: 'fo' }, { a: 'fo', b: 'graph' }, { a: 'fo', b: 'redis' }, { a: 'r', b: 'redis' }],
      scenarios: [
        { name: 'Normal post', steps: [
          { title: 'Aman post karta hai', go: ['a>post>pdb', 'res:pdb>post', 'res:post>a'], text: 'Post save, post_id mila. Aman ko turant "posted". Ab tak koi feed update nahi hua.', msg: 'POST /posts → 201 { post_id: 1719000000123 }' },
          { title: 'Fan-out job queue mein', go: 'evt:post>fo', text: 'Async: "post 1719000000123 by aman" ka event. Ye kaam background mein hoga.' },
          { title: 'Followers kaun?', go: ['fo>graph', 'res:graph>fo'], text: 'Aman ke 200 followers. Twitter (2013) sirf unhe fan-out karta tha jo pichhle 30 din mein active the; baaki ki feed login pe bana di jaati thi.', msg: 'followers(aman) → [riya, zoya, ... 200]' },
          { title: 'Har follower ki list mein daalo', go: 'fo>redis', text: '200 chhote writes. Har ek: list ke aage ID daalo, phir purane kaat do.', msg: 'LPUSH feed:riya 1719000000123\nLTRIM feed:riya 0 799', after: { redis: { state: 'ok', sub: '+200 writes' } } },
          { title: 'Riya feed kholti hai', go: ['r>redis', 'res:redis>r'], text: 'Ek list read, already sorted. Yahi push ka faayda: padhna bahut sasta.', msg: 'LRANGE feed:riya 0 19', after: { r: { state: 'ok', sub: 'feed in ~ms' } } },
        ]},
        { name: 'Celebrity post (sirf push)', intro: 'Ab ek celebrity post karta hai jiske 10 crore followers hain.', steps: [
          { title: 'Post save: normal', go: ['a>post>pdb', 'evt:post>fo'], set: { a: { label: 'Celebrity', sub: '100M followers' } }, text: 'Yahan tak sab same.' },
          { title: '10 crore writes', flood: { paths: ['fo>redis'], n: 14 }, text: 'Ek post = 100M Redis writes. Twitter ke 2013 talk ke summary mein likha hai ki bade accounts ka fan-out kabhi kabhi ~5 minute tak le leta tha, jabki target ~5 second tha.', after: { fo: { state: 'hot', sub: 'backlog: minutes' }, redis: { state: 'hot', sub: 'write storm' } } },
          { title: 'Side effects', go: 'r>redis', text: 'Is beech baaki sab ke normal posts bhi isi queue mein phanse. Aur ajeeb bug: agar doosra celebrity is post ka reply kare, to reply kuch followers ko original se <em>pehle</em> dikh sakta hai (Twitter ne ye race bataya tha). Plus memory: wahi ID 10 crore lists mein.', after: { r: { state: 'warn', sub: 'post late' } } },
        ]},
        { name: 'Feed cache node gaya', steps: [
          { title: 'Redis node down', set: { redis: { state: 'down', sub: 'node lost' } }, go: ['r>redis', 'bad:redis>r'], text: 'Riya ki list jis node pe thi, wo gir gaya.' },
          { title: 'Replica ya rebuild', text: 'Pehla bachaav: replica (Twitter: har list 3 machines pe). Agar wo bhi nahi, to feed service pull mode se feed dobara banati hai: Riya kise follow karti hai (graph) + unke latest posts (Post DB) + merge. Slow, lekin sahi. Isliye feed cache ko <strong>cache</strong> maano, source of truth nahi.', focus: ['graph', 'pdb'], after: { redis: { state: 'warn', sub: 'rebuilding' } } },
        ]},
      ],
    },
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `"Feed cache mein poore posts rakh do, hydration ka jhanjhat khatam." Phir ek post edit ya delete hua to 10 crore lists mein dhoondh ke badalna padega, aur memory 100 guna. Feed list mein <strong>sirf IDs</strong> rakho; post ka content ek hi jagah (post cache/DB). Delete hua post hydration ke time filter ho jaata hai.` },

    { type: 'h2', text: 'Step 7: push vs pull vs hybrid, khud mehsoos karo' },
    { type: 'p', html: `Followers slider ko 10 se 10 crore tak le jao, aur dekho teeno tareekon ka kharcha kaise badalta hai. <strong>Hybrid</strong> ka matlab: normal accounts push, lekin "celebrity" accounts ka fan-out nahi hota; unke posts feed padhte waqt (pull) jod diye jaate hain. Celebrity toggle se is account ko celebrity bana do:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="fd-f">Is account ke followers: <strong class="o-fv"></strong></label><input id="fd-f" type="range" min="0" max="70" step="1" value="20"></div>
          <div><label style="display:flex;gap:8px;align-items:center;margin-top:22px"><input type="checkbox" class="fd-celeb"> Celebrity treat karo (hybrid mein fan-out skip)</label></div>
        </div>
        <div style="overflow-x:auto"><table class="fd-t" style="width:100%;border-collapse:collapse;font-size:14px;margin-top:10px"></table></div>
        <div class="calc-note o-note"></div>
        <div class="calc-note">Assumptions ("maan lo"): ek typical follower 300 accounts follow karta hai jinme 5 celebrity hain; har follower din mein 10 baar feed kholta hai; fan-out workers is post ke liye ~10 lakh (1M) writes/s kar paate hain; ek feed entry = 8 byte ID × 3 replicas.</div>`;
      const g = s => el.querySelector(s);
      const K = 300, C = 5, R = 10, RATE = 1e6;
      const fmt = n => n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(Math.round(n));
      const tm = s => s === 0 ? 'turant (read pe)' : s < 1 ? '< 1 s' : s < 120 ? s.toFixed(0) + ' s' : (s / 60).toFixed(1) + ' min';
      const mem = b => b === 0 ? '0' : b >= 1e9 ? (b / 1e9).toFixed(1) + ' GB' : b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB' : b >= 1e3 ? (b / 1e3).toFixed(1) + ' KB' : b + ' B';
      const cell = (t, hi) => `<td style="padding:6px 8px;border-top:1px solid var(--line);${hi ? 'color:var(--red);font-weight:600' : ''}">${t}</td>`;
      const upd = () => {
        const F = Math.round(Math.pow(10, 1 + Number(g('#fd-f').value) / 10)), celeb = g('.fd-celeb').checked;
        g('.o-fv').textContent = fmt(F);
        const push = { w: F, d: F / RATE, m: F * 24, o: '1 list read', a: 0 };
        const pull = { w: 1, d: 0, m: 0, o: K + ' lookups + merge', a: F * R };
        const hyb = celeb ? { w: 1, d: 0, m: 0, o: `1 list read + ${C} celeb lookups`, a: F * R } : { w: F, d: F / RATE, m: F * 24, o: `1 list read + ${C} celeb lookups`, a: 0 };
        const rows = [
          ['Post pe writes', x => fmt(x.w), x => x.w >= 1e6],
          ['Aakhri follower tak', x => tm(x.d), x => x.d >= 60],
          ['Feed cache memory (is post ki)', x => mem(x.m), x => x.m >= 1e9],
          ['Har feed open pe kaam', x => x.o, x => x.o.startsWith(String(K))],
          ['Is account ki timeline reads/din', x => fmt(x.a), x => x.a >= 1e8],
        ];
        g('.fd-t').innerHTML = `<tr><th style="text-align:left;padding:6px 8px"></th><th style="text-align:left;padding:6px 8px">Push</th><th style="text-align:left;padding:6px 8px">Pull</th><th style="text-align:left;padding:6px 8px">Hybrid</th></tr>` +
          rows.map(([l, f, bad]) => `<tr><td style="padding:6px 8px;border-top:1px solid var(--line);color:var(--ink-2)">${l}</td>${[push, pull, hyb].map(x => cell(f(x), bad(x))).join('')}</tr>`).join('');
        let note;
        if (F >= 1e6 && !celeb) note = `${fmt(F)} followers aur celebrity OFF: hybrid bhi abhi push hi kar raha hai, ${fmt(F)} writes aur ~${tm(F / RATE)} ki der. Toggle ON karo: writes 1, der zero. Badle mein is account ke posts roz ${fmt(F * R)} baar padhe jaayenge, to unhe ek hot cache key bana ke replicate karo.`;
        else if (F < 1e5 && celeb) note = `Sirf ${fmt(F)} followers ko celebrity bana ke bachaye sirf ${fmt(F)} writes, lekin uske har follower ko har feed open pe ek extra lookup. Chhote accounts ke liye push hi sasta hai.`;
        else if (celeb) note = `Celebrity ON: post pe sirf 1 write. Feed padhte waqt har follower ki list mein uske ${C} celebrities ke latest posts merge hote hain. Pull ka 300-lookup dard nahi, push ka write storm nahi: isliye zyada systems hybrid karte hain.`;
        else note = `Normal account: push sasta hai (${fmt(F)} writes, ${tm(F / RATE)}), aur har feed open sirf 1 list read. Pull mein har feed open pe ${K} lookups: reads 50× zyada hain, isliye ye mehnga padta hai.`;
        g('.o-note').textContent = note;
      };
      g('#fd-f').addEventListener('input', upd); g('.fd-celeb').addEventListener('change', upd); upd();
    }},
    { type: 'callout', tone: 'tip', title: 'Decide', html: `Roadmap ka rule: <strong>Push (fan-out on write)</strong> normal users ke liye jinke followers kam hain. <strong>Pull (fan-out on read)</strong> celebrities ke liye jinke crores followers hain. <strong>Zyada systems hybrid karte hain.</strong> Threshold (jaise 1 lakh ya 10 lakh followers) data dekh ke tune karo. Inactive users (jo mahino se nahi aaye) ke liye fan-out mat karo, unki feed login pe pull se bana do.` },

    { type: 'h2', text: 'Step 8: hybrid read path' },
    { type: 'p', html: `Ab feed padhne wala raasta poora dekho. Twitter ke 2013 talk ka summary bhi isi direction ki baat karta hai: bade follower wale accounts ko write ke waqt fan-out karne ki jagah read ke waqt merge karna. Beech mein ek <strong>feed service</strong> hai jo sab jodti hai. Ek naya hissa bhi aata hai: <strong>ranker</strong>.` },
    { type: 'callout', tone: 'term', title: 'Naya word: ranker (ML model)', html: `<strong>Ye kya hai:</strong> ek service jo har post ko ek number (score) deti hai: "Riya is post ko kitna pasand karegi". Ye score ek <em>ML model</em> se aata hai: ek program jo purane data (kisne kya like kiya) se pattern seekhta hai aur andaaza lagata hai.<br><strong>Kyun chahiye:</strong> sirf "latest pehle" mein dosto ke zaroori posts neeche dab jaate hain.<br><strong>Iske bina:</strong> feed sirf time order mein; chal jaati hai, lekin kam interesting. Isliye ranker slow ho to time order hi fallback hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: hot key', html: `<strong>Ye kya hai:</strong> cache ki ek key jise ek saath bahut zyada log padhte hain, jaise ek celebrity ki timeline.<br><strong>Kyun dikkat:</strong> ek key ek hi cache server pe hoti hai; crore reads us ek server ko garam (overload) kar dete hain.<br><strong>Hal:</strong> us key ki kai copies (replicas), aur feed service ki apni memory mein 1-2 second ka chhota cache. Detail <a href="#/caching-strategies">Caching strategies</a> mein.` },
    { type: 'flow', title: 'Riya feed kholti hai (hybrid)', height: 320,
      nodes: [
        { id: 'r', label: 'Riya (app)', x: 75, y: 165, w: 120, kind: 'client', info: 'Ye kya hai: Riya ka phone. App khulte hi GET /feed?limit=20 bhejta hai. Scroll karne pe agla page cursor (bookmark) ke saath maangta hai.' },
        { id: 'fs', label: 'Feed service', sub: 'merge + hydrate', x: 270, y: 165, w: 140, kind: 'server', info: 'Ye kya hai: feed service, feed ka "jodne wala". Riya ki ready list + celebrities ke posts merge karti hai, ranker se order leti hai, IDs ko poore posts mein badalti hai (hydration), aur cursor banati hai. Stateless, isliye kai copies chala sakte hain.' },
        { id: 'redis', label: 'Feed cache', sub: 'push wali list', x: 500, y: 40, w: 140, kind: 'cache', info: 'Ye kya hai: feed cache mein Riya ki ready list: normal accounts ke post IDs, fan-out on write (push) se bhari hui.' },
        { id: 'graph', label: 'Following', sub: 'celebs Riya follows', x: 500, y: 120, w: 140, kind: 'data', info: 'Ye kya hai: follower graph ka hissa: Riya kin celebrities ko follow karti hai. Kyun: unka fan-out nahi hua, to unke posts padhte waqt jodne honge. Ye list chhoti hai aur cache ho jaati hai.' },
        { id: 'celeb', label: 'Celeb timelines', sub: 'hot, replicated', x: 500, y: 200, w: 140, kind: 'cache', info: 'Ye kya hai: har celebrity ki apni timeline (latest post IDs) cache mein. Crores log padhte hain, to ye hot keys hain: kai replicas, aur feed service ki apni memory mein bhi kuch seconds ka local cache.' },
        { id: 'pcache', label: 'Post cache', sub: 'hydration', x: 500, y: 280, w: 140, kind: 'cache', info: 'Ye kya hai: post cache, post_id → poora post (text, photo ka CDN URL, author, counts). Hydration yahin se. Cache mein na mile (miss) to Post DB se. Delete ho chuka post yahin pakda jaata hai.' },
        { id: 'rank', label: 'Ranker', sub: 'ML scores', x: 270, y: 285, w: 130, kind: 'server', info: 'Ye kya hai: ranker (ML model wali service). Har candidate post ko score deta hai: Riya like/comment/share karegi, iska andaaza (probability). Slow ho to timeout, aur feed service time order pe wapas.' },
      ],
      edges: [{ a: 'r', b: 'fs' }, { a: 'fs', b: 'redis' }, { a: 'fs', b: 'graph' }, { a: 'fs', b: 'celeb' }, { a: 'fs', b: 'pcache' }, { a: 'fs', b: 'rank' }],
      scenarios: [
        { name: 'Hybrid feed load', steps: [
          { title: 'Request', go: 'r>fs', text: 'Riya ne app khola.', msg: 'GET /feed?limit=20' },
          { title: 'Precomputed list', go: ['fs>redis', 'res:redis>fs'], text: 'Normal accounts ke posts pehle se list mein. Ek read.', msg: 'LRANGE feed:riya 0 199' },
          { title: 'Celebrities jodo', parallel: true, go: ['fs>graph', 'fs>celeb'], text: 'Riya 5 celebrities follow karti hai. Unki timelines se latest IDs lo (5 chhote reads, parallel).' },
          { title: 'Merge + rank', go: ['res:celeb>fs', 'fs>rank', 'res:rank>fs'], text: 'Dono lists merge = candidates. Ranker har candidate ko score deta hai, top 20 chune.' },
          { title: 'Hydrate + bhejo', go: ['fs>pcache', 'res:pcache>fs', 'res:fs>r'], text: '20 IDs → poore posts (media URLs CDN ke). Saath mein next_cursor.', msg: '{ posts: [...20], next_cursor: "1719000000123" }', after: { r: { state: 'ok', sub: 'feed ready' } } },
        ]},
        { name: 'Ranker slow', intro: 'ML model ka server overloaded hai.', steps: [
          { title: 'Candidates taiyaar', go: ['r>fs', 'fs>redis', 'res:redis>fs'], text: 'List mil gayi.' },
          { title: 'Ranker timeout', go: ['fs>rank', 'lost:rank>fs'], set: { rank: { state: 'down', sub: 'timeout 80ms' } }, text: 'Ranker ne time pe jawab nahi diya.' },
          { title: 'Graceful degradation', go: ['fs>pcache', 'res:pcache>fs', 'res:fs>r'], text: 'Khaali screen dikhane se behtar: time order (latest pehle) mein feed bhej do. User ko thoda kam "smart" feed mila, lekin mila. Ise <a href="#/resilience">graceful degradation</a> kehte hain.', after: { r: { state: 'warn', sub: 'chronological' } } },
        ]},
        { name: 'Celebrity viral post', intro: 'Ek celebrity ne post kiya, crores followers ek saath app kholte hain.', steps: [
          { title: 'Sab ek hi key padhte hain', flood: { paths: ['r>fs>celeb'], n: 12 }, text: 'Har feed load us celebrity ki timeline padhta hai: ek <strong>hot key</strong>.', after: { celeb: { state: 'hot', sub: 'hot key' } } },
          { title: 'Bachaav', go: ['fs>celeb', 'res:celeb>fs'], text: 'Hot key ko kai replicas pe rakho, aur feed service ki local memory mein 1-2 second cache karo: ek feed-service instance us key ke liye cache se sirf ek baar poochhe. (<a href="#/caching-strategies">Hot keys</a> lesson dekho.)', after: { celeb: { state: 'ok', sub: 'replicas + local' } } },
        ]},
        { name: 'Deleted post / unfollow', steps: [
          { title: 'List mein purane IDs', go: ['r>fs', 'fs>redis', 'res:redis>fs'], text: 'Aman ne ek post delete kiya, aur Riya ne Kabir ko unfollow kiya. Lekin Riya ki list mein dono ke IDs abhi bhi hain.' },
          { title: 'Read pe filter', go: ['fs>pcache', 'bad:pcache>fs', 'fs>graph', 'res:graph>fs'], text: 'Hydration pe deleted post ka record nahi mila: hata do. Kabir ka post: following check se hata do. Background job baad mein list saaf kar degi. Crores lists ko turant update karne ki koshish mat karo.', after: { r: { state: 'ok', sub: 'filtered' } } },
        ]},
      ],
    },
    { type: 'h3', text: 'Feed cache kitna bada?' },
    { type: 'p', html: `Napkin: 200M users × 800 IDs × 8 bytes ≈ <strong>1.3 TB</strong>, × 3 replicas ≈ <strong>3.8 TB</strong> RAM (Redis overhead alag). Ek machine pe nahi aayega, to Redis Cluster mein user_id se shard karo (<a href="#/consistent-hashing">consistent hashing</a>). Isliye list ki lambai cap karte hain (koi 800 posts se peeche scroll kare to pull se laao), aur inactive users ki list rakhte hi nahi.` },

    { type: 'h2', text: 'Deep dive: ranking (awareness level)' },
    { type: 'p', html: `Instagram 2010 mein launch hua to feed seedha time order mein tha. Instagram ke head ke 2021 ke post ke mutabik 2016 tak log apni feed ke ~70% posts miss kar rahe the, jinme close logon ke lagbhag aadhe posts bhi the. Isliye unhone feed ko <strong>rank</strong> karna shuru kiya: har post ke liye andaaza lagao ki tum us pe kitna interact karoge, aur usi hisaab se order.` },
    { type: 'callout', tone: 'term', title: 'Naye words: candidate generation, ranking', html: `<strong>Candidate generation (retrieval):</strong> <strong>Ye kya hai:</strong> crores posts mein se kuch sau ya hazaar "shayad interesting" posts jaldi se chun lena (sasta, mota filter).<br><strong>Ranking:</strong> <strong>Ye kya hai:</strong> un candidates ko ek bhaari ML model se score dena (mehnga, isliye sirf thode posts pe).<br><strong>Kyun dono:</strong> bhaari model crores posts pe chalana impossible hai; sasta filter akela utna achha order nahi deta. Isliye <strong>funnel</strong>: har stage pe posts kam, model bhaari.<br><strong>Iske bina:</strong> ya to feed slow, ya bekaar order.` },
    { type: 'steps', items: [
      { t: 'Candidate sourcing', d: 'Twitter ke 2023 open-source blog ke mutabik "For You" har request pe ~1,500 candidates nikaalta tha, lagbhag aadhe un accounts se jinhe tum follow karte ho (in-network, Earlybird search index se) aur aadhe baahar se (out-of-network: graph aur embeddings se). Instagram Feed mein candidates mainly followed accounts ke recent posts hain.' },
      { t: 'Light ranking', d: 'Ek chhota, tez model candidates ko pehle chhaant-ta hai. Meta ke 2023 Explore post mein bhi pehla stage ek halka model hai jo bade model se seekhta hai.' },
      { t: 'Heavy ranking', d: 'Twitter: ~48M parameter neural network jo har tweet ke liye like, retweet, reply jaise engagements ki probabilities nikaalta hai. Instagram (2021 post): andaaza ki tum post pe kuch second rukoge, comment, like, reshare ya profile tap karoge.' },
      { t: 'Filters + mixing', d: 'Blocked/muted accounts, deleted ya policy-violating posts hatao, ek hi author ke lagaatar bahut posts na hon (diversity), phir ads aur suggestions mix karo. Twitter mein ye Home Mixer service karti thi.' },
    ]},
    { type: 'p', html: `Twitter ke 2023 blog ke mutabik ye poora pipeline din mein ~5 billion baar chalta tha, average 1.5 second se kam mein. Ranking ka ek toy version khud chala ke dekho (posts aur probabilities banawati hain):` },
    { type: 'custom', render(el) {
      const P = [
        { n: 'Aman: beach photo', age: 0.5, l: 0.10, c: 0.01, s: 0.00 },
        { n: 'Zoya: exam result!', age: 5, l: 0.60, c: 0.35, s: 0.05 },
        { n: 'Celebrity: movie trailer', age: 2, l: 0.35, c: 0.02, s: 0.20 },
        { n: 'Kabir: coding meme', age: 1, l: 0.45, c: 0.05, s: 0.25 },
        { n: 'xyz.com Tech: blog post', age: 12, l: 0.08, c: 0.01, s: 0.03 },
        { n: 'Cousin: wedding photo', age: 20, l: 0.70, c: 0.25, s: 0.02 },
      ];
      el.innerHTML = `<div class="row2">
          <div><label for="fd-wl">Like ka weight: <strong class="o-wl"></strong></label><input id="fd-wl" type="range" min="0" max="10" step="1" value="1"></div>
          <div><label for="fd-wc">Comment ka weight: <strong class="o-wc"></strong></label><input id="fd-wc" type="range" min="0" max="10" step="1" value="5"></div>
          <div><label for="fd-ws">Share ka weight: <strong class="o-ws"></strong></label><input id="fd-ws" type="range" min="0" max="10" step="1" value="3"></div>
          <div><label style="display:flex;gap:8px;align-items:center;margin-top:22px"><input type="checkbox" class="fd-dec" checked> Purane posts ka score ghatao (recency)</label></div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-top:10px">
          <div><strong>Time order (latest pehle)</strong><ol class="fd-chr" style="margin:6px 0 0 18px;color:var(--ink-2)"></ol></div>
          <div><strong>Ranked (score)</strong><ol class="fd-rk" style="margin:6px 0 0 18px"></ol></div>
        </div>
        <div class="calc-note">score = like_weight × P(like) + comment_weight × P(comment) + share_weight × P(share); recency ON ho to × 1/(1 + age_hours/6). Asli systems mein dasiyon predictions aur hazaaron signals hote hain; idea yahi hai.</div>`;
      const g = s => el.querySelector(s);
      const upd = () => {
        const wl = +g('#fd-wl').value, wc = +g('#fd-wc').value, ws = +g('#fd-ws').value, dec = g('.fd-dec').checked;
        g('.o-wl').textContent = wl; g('.o-wc').textContent = wc; g('.o-ws').textContent = ws;
        const sc = P.map(p => ({ ...p, sc: (wl * p.l + wc * p.c + ws * p.s) * (dec ? 1 / (1 + p.age / 6) : 1) }));
        g('.fd-chr').innerHTML = [...P].sort((a, b) => a.age - b.age).map(p => `<li>${p.n} <span style="color:var(--ink-3)">(${p.age} h)</span></li>`).join('');
        g('.fd-rk').innerHTML = [...sc].sort((a, b) => b.sc - a.sc || a.age - b.age).map(p => `<li>${p.n} <span style="color:var(--ink-3);font-family:var(--f-mono)">${p.sc.toFixed(2)}</span></li>`).join('');
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener(i.type === 'checkbox' ? 'change' : 'input', upd)); upd();
    }},
    { type: 'p', html: `Khel ke dekho: default pe Zoya ka exam result sabse upar hai, jabki time order mein wo chauthe number pe tha (comments ka weight zyada hai). Share ka weight 10 aur comment ka 0 karo: meme aur trailer upar aa jaate hain. Recency band karo: 20 ghante purani wedding photo chauthe se doosre number pe aa jaati hai, aur 30 minute purani beach photo (jis pe kam log interact karte hain) neeche hi rehti hai. Ye weights hi product ki "personality" hain, aur inhe A/B tests se tune kiya jaata hai.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `"Ranking ke liye har feed open pe poore Instagram ke saare posts score karo." Nahi, wo impossible hai. Bhaari model sirf kuch sau candidates pe chalta hai; candidates sasti tricks (followed accounts ki lists, pre-computed embeddings) se aate hain. Interview mein funnel bolo: <strong>retrieve → light rank → heavy rank → filter/mix</strong>.` },

    { type: 'h2', text: 'Deep dive: cursor pagination' },
    { type: 'p', html: `Riya ne 20 posts dekhe, neeche scroll kiya. Agle 20 kaise do? Seedha idea: <code>?page=2</code> yaani offset 20. Problem: jab tak Riya pehle 20 padh rahi thi, 3 naye posts upar aa gaye. Ab "position 20 se 40" mein wo 3 posts aa jaate hain jo Riya pehle dekh chuki thi: <strong>duplicates</strong>. (Delete hone pe ulta: posts <strong>chhoot</strong> jaate hain.)` },
    { type: 'compare',
      left: { title: 'Offset (page=2)', ascii: `
Pehli call:  [P50 P49 ... P31]   (20)
  ... 3 naye post aaye: P53 P52 P51
Doosri call: offset 20
  [P33 P32 P31 P30 ... P14]
   ^^^^^^^^^^^ ye 3 dobara!` },
      right: { title: 'Cursor (max_id)', ascii: `
Pehli call:  [P50 ... P31]
  next_cursor = P31
  ... 3 naye post aaye
Doosri call: "P31 se purane do"
  [P30 P29 ... P11]
   koi duplicate nahi` },
    },
    { type: 'p', html: `Khud chala ke dekho. Page size 5 hai. "Page 1 lo" dabao, phir "2 naye posts aaye", phir "Agla page". Offset wale column mein laal posts duplicates hain. Reset karke "Upar ka 1 post delete" try karo: offset ek post chhod deta hai (skip), cursor nahi.` },
    { type: 'custom', render(el) {
      const PS = 5;
      let list, top, M, log;
      const reset = () => { list = []; for (let i = 60; i >= 41; i--) list.push(i); top = 60; M = { off: { seen: [], pages: 0, last: [] }, cur: { seen: [], pages: 0, last: [], c: null } }; log = ['Server pe posts P60 se P41 (bada number = naya).']; };
      el.innerHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
          <button type="button" class="btn small primary fdc-p1">Page 1 lo</button>
          <button type="button" class="btn small fdc-new">2 naye posts aaye</button>
          <button type="button" class="btn small fdc-del">Upar ka 1 post delete</button>
          <button type="button" class="btn small primary fdc-next">Agla page</button>
          <button type="button" class="btn small ghost fdc-reset">Reset</button></div>
        <div style="font-family:var(--f-mono);font-size:13px;margin-bottom:8px;word-break:break-word">Server ki list: <span class="fdc-list"></span></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">
          <div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:8px"><strong>Offset (?page=N)</strong><div class="fdc-off" style="font-family:var(--f-mono);font-size:13px;margin-top:6px"></div></div>
          <div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:8px"><strong>Cursor (?cursor=last_id)</strong><div class="fdc-cur" style="font-family:var(--f-mono);font-size:13px;margin-top:6px"></div></div>
        </div>
        <div class="calc-note fdc-log"></div>`;
      const q = s => el.querySelector(s);
      const fetch = (k, first) => {
        const m = M[k]; let page;
        if (k === 'off') page = list.slice(first ? 0 : m.pages * PS, (first ? 0 : m.pages * PS) + PS);
        else page = (first || m.c == null ? list : list.filter(x => x < m.c)).slice(0, PS);
        if (first) { m.seen = []; m.pages = 0; m.c = null; }
        const dup = page.filter(x => m.seen.includes(x));
        const lo = page.length ? Math.min(...page) : null;
        const skipped = lo == null ? [] : list.filter(x => x > lo && !m.seen.includes(x) && !page.includes(x) && x <= (m.seen.length ? Math.max(...m.seen) : top));
        m.last = page.map(x => ({ x, dup: dup.includes(x) }));
        m.seen = m.seen.concat(page.filter(x => !m.seen.includes(x)));
        m.pages++; if (lo != null) m.c = lo;
        return { dup, skipped };
      };
      const show = (k, r) => {
        const m = M[k];
        return `Page ${m.pages}: ` + (m.last.length ? m.last.map(o => `<span style="${o.dup ? 'color:var(--red);font-weight:700' : ''}">P${o.x}</span>`).join(' ') : '-') +
          (r ? `<br>${r.dup.length ? '<span style="color:var(--red)">Duplicate: ' + r.dup.map(x => 'P' + x).join(', ') + '</span>' : 'Koi duplicate nahi'}${r.skipped.length ? '<br><span style="color:var(--red)">Chhoot gaya: ' + r.skipped.map(x => 'P' + x).join(', ') + '</span>' : ''}` : '') +
          (k === 'cur' && m.c != null ? `<br>next_cursor = ${m.c}` : '');
      };
      let R = {};
      const draw = () => {
        q('.fdc-list').textContent = list.slice(0, 12).map(x => 'P' + x).join(' ') + ' ...';
        q('.fdc-off').innerHTML = M.off.pages ? show('off', R.off) : 'abhi kuch nahi';
        q('.fdc-cur').innerHTML = M.cur.pages ? show('cur', R.cur) : 'abhi kuch nahi';
        q('.fdc-log').innerHTML = log.slice(-3).map(x => '• ' + x).join('<br>');
      };
      q('.fdc-p1').onclick = () => { R = { off: fetch('off', true), cur: fetch('cur', true) }; log.push('Dono ne pehle 5 posts liye.'); draw(); };
      q('.fdc-new').onclick = () => { list.unshift(++top, ++top); list.sort((a, b) => b - a); log.push(`2 naye posts upar aaye: P${top - 1}, P${top}. Baaki sab ek-ek jagah neeche khisak gaye.`); draw(); };
      q('.fdc-del').onclick = () => { const d = list.shift(); log.push(`P${d} delete hua. Baaki sab ek jagah upar khisak gaye.`); draw(); };
      q('.fdc-next').onclick = () => { if (!M.off.pages) { log.push('Pehle "Page 1 lo" dabao.'); draw(); return; } R = { off: fetch('off'), cur: fetch('cur') }; log.push('Dono ne agla page maanga.'); draw(); };
      q('.fdc-reset').onclick = () => { reset(); R = {}; draw(); };
      reset(); draw();
    }},
    { type: 'p', html: `Twitter ki purani developer docs bhi yahi kehti thi: timeline lagaatar badalti hai, isliye page number ki jagah <code>max_id</code> (sabse chhoti ID jo tumne dekhi) se aage padho, aur naye posts ke liye <code>since_id</code>. Ye tabhi chalta hai jab post IDs <strong>time-ordered</strong> hon (Snowflake jaisi, <a href="#/unique-ids">Unique IDs</a> lesson). Cursor database ke liye bhi sasta hai: "id &lt; X LIMIT 20" index se seedha, jabki bada offset pehle hazaaron rows gin ke phenkta hai. Detail: <a href="#/pagination-idempotency">Pagination</a> lesson.` },
    { type: 'callout', tone: 'warn', title: 'Ranked feed mein cursor', html: `Ranked feed time order mein nahi hota, to "P31 se purane" ka matlab nahi banta. Public sources iski detail nahi dete; aam taur pe industry mein feed service pehli request pe ek ranked list bana ke thodi der cache kar leti hai, aur cursor us list mein ek <strong>opaque token</strong> (jaise session id + position) hota hai. Client ko token ka matlab jaanne ki zaroorat nahi, bas wapas bhejna hai. Isse page 2 wahi ranking continue karta hai, chahe beech mein scores badal gaye hon.` },

    { type: 'h2', text: 'Deep dive: caching, kaun si cheez kahan' },
    { type: 'p', html: `Feed design asal mein caches ka design hai, kyunki reads writes se 50 guna zyada hain. Har cache ek alag kaam karta hai:` },
    { type: 'table', head: ['Cache', 'Kya rakhta hai', 'Kyun', 'Kho jaaye to'], rows: [
      ['Feed cache (Redis lists)', 'Har user ki ready list: post IDs', 'Push ka nateeja; feed padhna ek read', 'Pull se dobara banao (slow, lekin sahi)'],
      ['Post cache', 'post_id → poora post', 'Hydration: ek feed = 20 posts', 'Post DB se padho; DB pe load badhega'],
      ['Celeb timelines + local cache', 'Celebrities ke latest IDs', 'Hot keys; crores reads', 'Replica se, ya celeb ki user timeline DB se'],
      ['CDN', 'Photos, videos', 'Bade bytes users ke paas se', 'Object storage se (mehenga, slow)'],
      ['User/profile cache', 'Naam, avatar, follow lists', 'Har post ke saath author dikhana hai', 'User DB se'],
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: cache hit ratio', html: `<strong>Ye kya hai:</strong> 100 lookups mein se kitne cache mein mil gaye (hit). 99% hit = 100 mein 1 hi DB tak gaya (miss).<br><strong>Kyun zaroori:</strong> lookups bahut zyada hain, to 1% ka farak bhi DB pe lakhon requests ka farak hai.<br><strong>Iske bina (hit ratio kam):</strong> database pe itna load ki wo gir jaaye. Detail <a href="#/caching">Caching</a> lesson mein.` },
    { type: 'p', html: `Khud dekho (ye "maan lo" numbers hain): hit ratio 99% se 90% karo aur DB ka load dekho. Phir celebrity ke hot key pe local cache on/off karo.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Feed loads per second: <strong class="fdk-fv"></strong></label><input class="fdk-f" type="range" min="10000" max="600000" step="10000" value="200000"></div>
          <div><label>Posts per feed load: <strong class="fdk-pv"></strong></label><input class="fdk-p" type="range" min="5" max="50" step="5" value="20"></div>
          <div><label>Post cache hit ratio (%): <strong class="fdk-hv"></strong></label><input class="fdk-h" type="range" min="50" max="99.9" step="0.1" value="99"></div>
          <div><label>Feed service instances: <strong class="fdk-iv"></strong></label><input class="fdk-i" type="range" min="10" max="500" step="10" value="200"></div>
          <div><label style="display:flex;gap:8px;align-items:center;margin-top:22px"><input type="checkbox" class="fdk-l" checked> Celeb key ka 1 second local cache</label></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Post lookups/s (hydration)</span><strong class="fdk-o1"></strong></div>
          <div class="stat"><span>Post DB reads/s (misses)</span><strong class="fdk-o2"></strong></div>
          <div class="stat"><span>Celeb key pe Redis reads/s</span><strong class="fdk-o3"></strong></div>
        </div>
        <div class="calc-note fdk-note"></div>`;
      const g = s => el.querySelector(s);
      const f = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(Math.round(n));
      const upd = () => {
        const F = +g('.fdk-f').value, P = +g('.fdk-p').value, H = +g('.fdk-h').value, I = +g('.fdk-i').value, L = g('.fdk-l').checked;
        g('.fdk-fv').textContent = f(F); g('.fdk-pv').textContent = P; g('.fdk-hv').textContent = H.toFixed(1); g('.fdk-iv').textContent = I;
        const look = F * P, miss = look * (1 - H / 100), celeb = L ? I : F;
        g('.fdk-o1').textContent = f(look); g('.fdk-o2').textContent = f(miss); g('.fdk-o3').textContent = f(celeb);
        g('.fdk-note').textContent = `${f(F)} feed loads × ${P} posts = ${f(look)} post lookups har second. ${H.toFixed(1)}% hit ratio pe ${f(miss)} lookups har second DB tak jaate hain (misses). Maan lo har feed load ek popular celebrity ki timeline bhi padhta hai: local cache ${L ? 'ON: har instance second mein ek hi baar Redis se poochhta hai, to sirf ' + f(celeb) + ' reads/s' : 'OFF: saare ' + f(celeb) + ' reads/s ek hi Redis key pe, wo server garam ho jaayega'}.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener(i.type === 'checkbox' ? 'change' : 'input', upd)); upd();
    }},

    { type: 'h2', text: 'Posts aur media ka storage' },
    { type: 'p', html: `Instagram ke 2011 ke engineering post (tab ~1.4 crore users, 3 engineers) ka stack seedha is design se milta hai: posts aur metadata <strong>PostgreSQL</strong> mein, photos <strong>Amazon S3</strong> mein aur <strong>CloudFront CDN</strong> se serve, main feed aur activity feed <strong>Redis</strong> mein, aur feed fan-out <strong>Gearman task queue</strong> ke workers karte the. 2012 ke post mein unhone bataya ki PostgreSQL ko hazaaron logical shards mein baanta aur IDs aisi banayi jinme time + shard id + sequence ho (<a href="#/unique-ids">Unique IDs</a> mein detail). Ye purane posts hain; aaj Instagram Meta ke infrastructure pe hai aur stack badal chuka hai.` },
    { type: 'list', items: [
      `<strong>Posts</strong>: author_id ya post_id se shard. Time-ordered IDs se "latest posts of X" ek index range scan.`,
      `<strong>Media</strong>: upload <a href="#/object-storage">object storage</a> mein (pre-signed URL), alag alag sizes mein resize, aur <a href="#/cdn">CDN</a> se serve. Feed response mein sirf URLs; bytes kabhi feed service se nahi guzarte.`,
      `<strong>Counts</strong> (likes, views): har like pe post row update mat karo; events queue mein daal ke batch mein jodo (<a href="#/kafka">Kafka</a>). Count thoda purana chalega.`,
    ]},

    { type: 'h2', text: 'Failure scenarios aur bottlenecks' },
    { type: 'table', head: ['Kya toota', 'Kya hota hai', 'Bachaav'], rows: [
      ['Celebrity post (push)', 'Crores writes, minutes ka backlog, baaki posts bhi late', 'Hybrid: celebs ka fan-out nahi, read pe merge'],
      ['Fan-out queue backlog', 'Posts feed mein der se', 'Workers autoscale, active users pehle, inactive skip'],
      ['Feed cache node lost', 'Kuch users ki feed khaali', 'Replicas (Twitter 2013: 3 copies), pull se rebuild'],
      ['Hot celebrity key', 'Ek Redis node garam', 'Replicas + local in-process cache, request coalescing'],
      ['Ranker slow/down', 'Feed load slow', 'Timeout + chronological fallback'],
      ['Reply pehle, original baad', 'Ajeeb order (Twitter ne bataya tha)', 'Read pe merge/sort; hybrid se celebrity race kam'],
      ['Delete / unfollow / block', 'Purane IDs lists mein', 'Read-time filter + background cleanup'],
      ['Offset pagination', 'Duplicates / chhoote posts', 'Cursor (max_id ya opaque token)'],
    ]},

    { type: 'h2', text: 'Interview mein kaise bolein' },
    { type: 'steps', items: [
      { t: 'Maths se shuru', d: '200M DAU: ~4k posts/s, ~200k feed reads/s, 50:1 read-heavy. Isliye precompute + cache.' },
      { t: 'Data model', d: 'Posts (sharded, time-ordered IDs), follow graph, per-user feed list (sirf IDs, capped), media in blob store + CDN.' },
      { t: 'Push vs pull', d: 'Fan-out on write normal users ke liye, read pe merge celebrities ke liye, hybrid. Inactive users skip.' },
      { t: 'Read path', d: 'Feed service: list + celeb timelines → candidates → rank → filter → hydrate → cursor.' },
      { t: 'Ranking funnel', d: 'Candidate generation → light ranker → heavy ranker → filters/mixing (Twitter 2023, Instagram).' },
      { t: 'Failures', d: 'Celebrity storm, hot keys, cache loss → rebuild, ranker timeout → chronological fallback.' },
    ]},

    { type: 'diagram', title: 'Poora design, ek nazar mein', height: 620,
      groups: [
        { label: 'Media', x: 12, y: 124, w: 156, h: 236 },
        { label: 'Data + caches', x: 552, y: 20, w: 160, h: 590 },
      ],
      nodes: [
        { id: 'author', label: 'Aman (app)', sub: 'post karta hai', x: 90, y: 70, w: 130, kind: 'client', info: 'Ye kya hai: post karne wale ka phone. Text Post service ko, photo/video seedha object storage mein (pre-signed URL).' },
        { id: 'post', label: 'Post service', sub: 'save + event', x: 270, y: 70, w: 130, kind: 'server', info: 'Ye kya hai: post service. Post ko time-ordered ID ke saath Post DB mein save karti hai, user ko turant "posted", aur fan-out ka event queue mein.' },
        { id: 'fo', label: 'Fan-out workers', sub: 'queue + workers', x: 270, y: 190, w: 130, kind: 'queue', info: 'Ye kya hai: queue + background workers. Normal author: har active follower ki feed list mein ID (push). Celebrity: fan-out nahi, sirf uski celeb timeline update (hybrid).' },
        { id: 'pdb', label: 'Post DB', sub: 'sharded', x: 630, y: 70, w: 130, kind: 'data', info: 'Ye kya hai: posts ka asli ghar (source of truth), sharded, time-ordered IDs. Feed cache kho jaaye to yahin se feed dobara banti hai.' },
        { id: 'graph', label: 'Follower graph', sub: 'who follows who', x: 630, y: 190, w: 130, kind: 'data', info: 'Ye kya hai: kaun kisko follow karta hai. Fan-out ke liye "Aman ke followers", read ke liye "Riya kin celebs ko follow karti hai".' },
        { id: 'redis', label: 'Feed cache', sub: 'Redis lists (IDs)', x: 630, y: 310, w: 130, kind: 'cache', info: 'Ye kya hai: har user ki ready list, sirf post IDs, lambai capped (~800), replicated. Push ka nateeja.' },
        { id: 'celeb', label: 'Celeb timelines', sub: 'hot keys', x: 630, y: 430, w: 130, kind: 'cache', info: 'Ye kya hai: celebrities ke latest post IDs. Read pe merge hote hain (pull). Hot keys, isliye replicas + feed service ka local cache.' },
        { id: 'pcache', label: 'Post cache', sub: 'hydration', x: 630, y: 550, w: 130, kind: 'cache', info: 'Ye kya hai: post_id → poora post. 20 IDs ko 20 poore posts mein badalta hai; miss pe Post DB. Deleted posts yahin filter.' },
        { id: 'fs', label: 'Feed service', sub: 'merge, rank, cursor', x: 270, y: 430, w: 140, kind: 'server', info: 'Ye kya hai: feed jodne wali stateless service: apni list + celeb timelines merge, ranker se order, hydration, filters (deleted, unfollowed), aur cursor.' },
        { id: 'rank', label: 'Ranker', sub: 'ML scores', x: 270, y: 550, w: 130, kind: 'server', info: 'Ye kya hai: ML model wali service jo candidates ko score deti hai. Timeout pe feed service time order pe laut aati hai (graceful degradation).' },
        { id: 'reader', label: 'Riya (app)', sub: 'feed padhti hai', x: 90, y: 430, w: 130, kind: 'client', info: 'Ye kya hai: feed padhne wale ka phone. GET /feed?limit=20, aur scroll pe cursor ke saath agla page. Photos CDN se.' },
        { id: 'blob', label: 'Object storage', sub: 'photos, videos', x: 90, y: 190, w: 130, kind: 'data', info: 'Ye kya hai: S3 jaisa sasta, durable file store. Media ke bytes kabhi feed service se nahi guzarte.' },
        { id: 'cdn', label: 'CDN', sub: 'edge cache', x: 90, y: 310, w: 130, kind: 'edge', info: 'Ye kya hai: users ke paas ke cache servers. Feed mein sirf media URLs; photo CDN se aati hai.' },
      ],
      edges: [
        { a: 'author', b: 'post', n: 1 },
        { a: 'post', b: 'pdb', n: 2 },
        { a: 'post', b: 'fo', kind: 'evt', n: 3 },
        { a: 'fo', b: 'graph', label: 'followers' },
        { a: 'fo', b: 'redis', n: 4 },
        { a: 'fo', b: 'celeb', dashed: true },
        { a: 'author', b: 'blob' },
        { a: 'blob', b: 'cdn' },
        { a: 'cdn', b: 'reader' },
        { a: 'reader', b: 'fs', n: 5 },
        { a: 'fs', b: 'redis', n: 6 },
        { a: 'fs', b: 'graph' },
        { a: 'fs', b: 'celeb', label: 'celeb merge' },
        { a: 'fs', b: 'rank', n: 7 },
        { a: 'fs', b: 'pcache', n: 8 },
      ],
      paths: [
        { name: 'Post', text: 'Aman post karta hai → Post DB mein save → event queue mein → workers followers laate hain → har active follower ki Redis list mein post ID (push).', go: ['author>post>pdb', 'post>fo>graph', 'fo>redis'] },
        { name: 'Open feed', text: 'Riya → feed service → apni ready list + celebs ki timelines (merge) → ranker → post cache se hydration → 20 posts + cursor. Photos CDN se.', go: ['reader>fs>redis', 'fs>graph', 'fs>celeb', 'fs>rank', 'fs>pcache', 'cdn>reader'] },
        { name: 'Celebrity post', text: 'Star post karta hai → Post DB → fan-out nahi! Sirf uski celeb timeline update. Followers ki feed load pe ye post merge hota hai (pull).', go: ['author>post>pdb', 'post>fo>celeb', 'reader>fs>celeb'] },
        { name: 'Scroll (cursor)', text: 'Neeche scroll: app next_cursor bhejta hai → feed service list mein usi jagah se aage ke IDs → hydration. Naye posts aaye to bhi duplicate nahi.', go: ['reader>fs>redis', 'fs>pcache'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Feed bahut <strong>read-heavy</strong> hai (~50:1), isliye feed pehle se bana ke (precompute) cache karte hain.</li>
      <li><strong>Push</strong> (fan-out on write): post pe har follower ki list mein ID. Padhna sasta, likhna followers jitna mehenga.</li>
      <li><strong>Pull</strong> (fan-out on read): post pe 1 write, padhte waqt sab timelines jodo. Likhna sasta, padhna mehenga.</li>
      <li><strong>Hybrid</strong>: normal users push, celebrities pull, read pe merge. Inactive users ka fan-out skip.</li>
      <li>Feed cache mein <strong>sirf IDs</strong>, capped; content post cache se (<strong>hydration</strong>). Cache kho jaaye to pull se rebuild.</li>
      <li>Ranking ek <strong>funnel</strong>: candidates → light rank → heavy rank → filters/mix. Ranker slow ho to time order.</li>
      <li>Scroll ke liye <strong>cursor</strong>, offset nahi: duplicates aur chhoote posts nahi.</li>
      <li>Hot celebrity keys: <strong>replicas + local cache</strong>. Media hamesha object storage + CDN se.</li>
    </ul>` },

    { type: 'tradeoffs', gains: ['Push: feed read ek list read, ~ms', 'Pull for celebs: post pe 1 write, koi storm nahi', 'Hybrid: dono ka best, zyada systems yahi karte hain', 'Sirf IDs cache: kam memory, edit/delete ek jagah', 'Ranking: log zyada relevant posts dekhte hain', 'Cursor: duplicates nahi, DB pe sasta'], costs: ['Push: write amplification aur TBs RAM', 'Feed eventually consistent: post kuch seconds/minutes der se', 'Hybrid: read path complex (merge, do raaste)', 'Ranking: ML infra, latency, aur "feed kyun aisa hai" wali shikayatein', 'Read-time filtering: har feed load pe extra kaam', 'Cursor: "page 7 pe jao" jaisa jump nahi'] },

    { type: 'think', questions: [
      { q: 'Riya 2 saal baad app kholti hai. Uski feed list expire ho chuki hai (inactive users ka fan-out nahi hota). Ab kya karoge?', a: 'Pull mode se feed banao: Riya kise follow karti hai (graph) → unke latest posts (post DB/user timelines) → merge + rank → Redis mein uski list daal do aur use ab active maano. Pehli load thodi slow hogi; "loading" skeleton dikhao. Twitter (2013) bhi inactive users ke liye yahi karta tha.' },
      { q: 'Ek normal user achanak viral ho gaya: kal 500 followers, aaj 50 lakh. Hybrid system mein kya hona chahiye?', a: 'Celebrity flag static nahi hona chahiye. Follower count threshold cross hote hi account ko celebrity mark karo; uske naye posts ka fan-out band, read pe merge. Jo posts pehle push ho chuke wo lists mein rehne do. Flag flip ke beech ke posts ke liye dono raaste duplicate de sakte hain, isliye merge pe post_id se dedupe karo.' },
      { q: 'Unfollow ke baad bhi Kabir ke purane posts Riya ki Redis list mein hain. Turant saaf karna chahiye ya nahi?', a: 'Turant crores lists badalna mehnga hai. Read pe following check se filter karo (sasta, sahi), aur background job list se IDs dheere dheere hata de. User ko sahi feed dikhta hai, system pe spike nahi.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Fan-out on write (push) ka sabse bada faayda?', options: ['Post karna sasta ho jaata hai', 'Feed padhna ek precomputed list read ban jaata hai', 'Memory kam lagti hai'], answer: 1, explain: 'Feed reads writes se ~50 guna zyada hain, isliye kaam write ke waqt kar lena (precompute) faayde ka hai. Kharcha: write amplification aur memory.' },
      { q: '10 crore followers wala account post kare, to hybrid design kya karta hai?', options: ['10 crore lists mein post_id daalta hai', 'Fan-out skip; followers ki feed load pe uske latest posts merge hote hain', 'Post ko 1 ghante baad deliver karta hai'], answer: 1, explain: 'Celebrity ke liye pull: 1 write, aur read pe merge. Uski timeline hot key banti hai, to replicas + local cache.' },
      { q: 'Feed cache (Redis list) mein kya rakhna chahiye?', options: ['Poore posts with images', 'Sirf post IDs (capped length)', 'Sirf follower IDs'], answer: 1, explain: 'IDs chhote hain aur post ka content ek hi jagah rehta hai (hydration). Twitter (2013) bhi IDs (aur thodi info) hi rakhta tha, ~800 per list.' },
      { q: 'Infinite scroll feed ke liye offset (page=2) kyun galat hai?', options: ['Offset slow hai sirf', 'Naye posts aane se items khisak jaate hain: duplicates ya miss', 'Offset security risk hai'], answer: 1, explain: 'Cursor (max_id ya opaque token) "jahan chhoda wahan se" padhta hai, list badalne se farak nahi padta, aur DB pe bhi sasta hai.' },
      { q: 'Ranking pipeline ka sahi order?', options: ['Heavy rank → candidate generation → filter', 'Candidate generation → light rank → heavy rank → filters/mixing', 'Filters → heavy rank on all posts'], answer: 1, explain: 'Funnel: sasti retrieval se kuch sau/hazaar candidates, phir halka model, phir bhaari model sirf top pe, phir filters aur mixing (Twitter 2023, Meta Explore 2023).' },
    ]},
    { type: 'sources', note: 'Twitter ke architecture numbers 2013 ke talk se hain aur ranking details 2023 ke blog se; dono ab purane ho sakte hain. Instagram stack 2011-2012 ka hai.', items: [
      { title: 'The Architecture Twitter Uses To Deal With 150M Active Users, 300K QPS, A 22 MB/S Firehose...', publisher: 'High Scalability (summary of Raffi Krikorian, "Timelines at Scale", QCon 2013)', year: 2013, url: 'https://highscalability.com/the-architecture-twitter-uses-to-deal-with-150m-active-users/', used: 'Redis home timelines with 3 replicas, ~800 entries, fan-out only to users active in 30 days, ~300k QPS reads, 5k/s tweets, celebrity fan-out up to ~5 min vs 5 s target, reply-before-original race, merge high-follower accounts at read time, Flock graph.' },
      { title: 'Twitter\'s Recommendation Algorithm', publisher: 'Twitter Engineering blog', official: true, year: 2023, url: 'https://blog.x.com/engineering/en_us/topics/open-source/2023/twitter-recommendation-algorithm', used: '~1,500 candidates per request, ~50% in-network, ~48M-parameter heavy ranker predicting engagements, filters and mixing, ~5B runs/day, < 1.5 s average.' },
      { title: 'the-algorithm (README)', publisher: 'Twitter / X on GitHub', official: true, year: 2023, url: 'https://github.com/twitter/the-algorithm', used: 'Component names: Earlybird search index (in-network), light and heavy ranker, Home Mixer on Product Mixer, visibility filters, RealGraph, SimClusters, TwHIN.' },
      { title: 'Shedding More Light on How Instagram Works', publisher: 'Instagram (Adam Mosseri)', official: true, year: 2021, url: 'https://about.instagram.com/blog/announcements/shedding-more-light-on-how-instagram-works', used: 'Chronological at launch, ranking from 2016 because ~70% of posts were missed; signals and predicted actions; separate ranking for Feed, Stories, Explore, Reels.' },
      { title: 'Scaling the Instagram Explore recommendations system', publisher: 'Engineering at Meta', official: true, year: 2023, url: 'https://engineering.fb.com/2023/08/09/ml-applications/scaling-instagram-explore-recommendations-system/', used: 'Multi-stage funnel: retrieval, first-stage (light) ranking, second-stage ranking, final reranking with filters/diversity; caching and pre-computation.' },
      { title: 'What Powers Instagram: Hundreds of Instances, Dozens of Technologies', publisher: 'Instagram Engineering', official: true, year: 2011, url: 'https://instagram-engineering.com/what-powers-instagram-hundreds-of-instances-dozens-of-technologies-adf2e22da2ad', used: 'PostgreSQL for data, S3 + CloudFront for photos, Redis for main feed and activity feed, Gearman workers for feed fan-out (read via the High Scalability summary of the same post).' },
      { title: 'Sharding & IDs at Instagram', publisher: 'Instagram Engineering', official: true, year: 2012, url: 'https://instagram-engineering.com/sharding-ids-at-instagram-1cf5a71e5a5c', used: 'Logical shards on PostgreSQL and time-ordered 64-bit IDs (time + shard + sequence).' },
      { title: 'Get Tweet timelines: guides (working with timelines)', publisher: 'Twitter Developer Platform docs', official: true, url: 'https://developer.twitter.com/en/docs/twitter-api/v1/tweets/timelines/guides', used: 'Why page-based pagination fails on changing timelines; max_id and since_id cursoring.' },
    ]},
  ],
});
