Lesson.register({
  id: 'decide-quick',
  title: 'Quick decisions',
  minutes: 28,
  summary: `Interview mein aur asli kaam mein, aath "A ya B?" sawaal baar baar aate hain: replication ya sharding, strong ya eventual, push ya pull feed, LB ya API gateway, monolith ya microservices, Sentinel ya Cluster, CDN ya direct, optimistic ya pessimistic locking. Har ek ke signals seekho, decision deck chalao, aur galat choice ko girte dekho.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Pichhle lessons mein humne bahut saare tools seekhe: replicas, shards, CDN, gateway, locks...<br>Ab asli sawaal ye hai: <strong>kab kaunsa tool?</strong><br>Aath sawaal baar baar aate hain, har ek mein do options: A ya B.<br>Har sawaal ke andar ek chhota sa "signal" chhupa hota hai, jaise "kya yahan paisa hai?" ya "kya data ek machine mein aata hai?".<br>Is lesson mein seekhenge: signal kaise pakdein, aur usse sahi option kaise chunein.` },
    { type: 'h2', text: 'Problem: har design review mein wahi aath sawaal' },
    { type: 'p', html: `xyz.com ab bada ho gaya hai: videos, feed, chat, ticket booking, sab. Har hafte design review mein koi na koi poochta hai "yahan replica lagayein ya shard karein?", "feed push karein ya pull?". Ye sawaal naye nahi hain, aur inke jawab bhi random nahi. Har sawaal mein requirements ke andar kuch <strong>signals</strong> chhupe hote hain. Signal pehchaano, jawab apne aap mil jaata hai.` },
    { type: 'p', html: `Har concept ka andar ka kaam pichhle lessons mein seekha hai (links har section mein hain). Ye lesson sirf <strong>decision</strong> ke baare mein hai: kab A, kab B, aur kab dono.` },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "ek sahi jawab hota hai"', html: `Zyada tar sawaalon ka asli jawab hai <strong>"dono, alag jagah pe"</strong>. Sharded database ke har shard ki replicas bhi hoti hain. LB aur API gateway dono saath chalte hain. Feeds aksar hybrid hote hain. Interview mein "A, kyunki ye signal hai; lekin is hisse ke liye B" bolna, sirf "A" bolne se kahin behtar hai.` },

    { type: 'callout', tone: 'term', title: 'Naya word: Signal', html: `<strong>Ye kya hai:</strong> requirement ki wo ek baat jo decision badal deti hai. Jaise "yahan user ka paisa hai" ya "is account ke 5 crore followers hain".<br><strong>Kyun chahiye:</strong> "it depends" ko ek saaf wajah mein badalta hai. Pehle signal dhoondho, phir tool chuno.<br><strong>Iske bina:</strong> log fashion se tool chunte hain ("Cluster bada lagta hai"), aur baad mein pachhtaate hain.` },
    { type: 'h3', text: 'Pichhle lessons ke words, ek line mein' },
    { type: 'p', html: `Table padhne se pehle, saare words ek baar yaad kar lo. Har word ka poora lesson link mein hai.` },
    { type: 'table', head: ['Word', 'Ek line mein', 'Detail'], rows: [
      ['Replication', 'Same data ki poori copies kai machines pe. Ek gire to doosri kaam karti hai.', '<a href="#/replication">Replication</a>'],
      ['Sharding', 'Data ko tukdon mein baant ke har tukda alag machine pe rakhna.', '<a href="#/sharding">Sharding</a>'],
      ['HA (high availability)', 'Ek machine gire to bhi site chalti rahe.', '<a href="#/availability-spof">Availability</a>'],
      ['Strong / eventual consistency', 'Strong: sab ko hamesha latest value. Eventual: kuch second purani value dikh sakti hai, phir sab same.', '<a href="#/cap">CAP</a>'],
      ['Fan-out', 'Ek post ko bahut saare followers tak pahunchana.', '<a href="#/pattern-fanout">Fan-out</a>'],
      ['Load balancer (LB)', 'Ek hi app ki kai copies mein traffic baantne wala.', '<a href="#/load-balancer">Load balancer</a>'],
      ['API gateway', 'Sab requests ka ek darwaza: login check, rate limit, sahi service tak bhejna.', '<a href="#/resilience">Resilience</a>'],
      ['Monolith / microservices', 'Monolith: poora app ek program. Microservices: app kai chhote programs, har team ka apna.', '<a href="#/architecture-styles">Architecture styles</a>'],
      ['Redis Sentinel / Cluster', 'Sentinel: ek Redis machine ko dekhta hai, gire to copy ko boss bana deta hai. Cluster: data kai Redis machines mein baant deta hai.', '<a href="#/coordination">Coordination</a>'],
      ['CDN', 'Duniya bhar mein faile cache servers jo files user ke paas se dete hain.', '<a href="#/cdn">CDN</a>'],
      ['Locking', 'Do log ek saath ek hi cheez na badlein, iska intezaam.', '<a href="#/sql-vs-nosql">SQL vs NoSQL</a>'],
    ]},

    { type: 'h2', text: 'Roadmap ka table: aathon sawaal' },
    { type: 'table', head: ['Sawaal', 'A chuno jab…', 'B chuno jab…'], rows: [
      ['Replication ya sharding?', 'Replicate: HA chahiye ya zyada read capacity', 'Shard: writes ya data size ek node se zyada'],
      ['Strong ya eventual consistency?', 'Strong: paisa, inventory, bookings, unique usernames', 'Eventual: likes, views, feeds, search, recommendations'],
      ['Feeds ke liye push ya pull?', 'Push (fan-out on write): normal users jinke kam followers hain', 'Pull (fan-out on read): celebrities jinke millions followers hain; zyada tar systems hybrid karte hain'],
      ['Load balancer ya API gateway?', 'LB: traffic ko identical servers mein baantna', 'Gateway: auth, rate limiting, kai services tak routing; aam taur pe dono hote hain'],
      ['Monolith ya microservices?', 'Monolith: chhoti team, early product', 'Microservices: kai teams, bahut alag scaling needs'],
      ['Redis Sentinel ya Redis Cluster?', 'Sentinel: data ek node mein fit hota hai, automatic failover chahiye', 'Cluster: data ko kai nodes mein shard karna hai'],
      ['CDN ya seedha server se?', 'CDN: static ya shared content, global users, badi files', 'Direct: personalised, private, tezi se badalte responses'],
      ['Optimistic ya pessimistic locking?', 'Optimistic (version check): conflicts rare hain', 'Pessimistic / reservation hold: kai users ek hi item ke liye ladte hain (seats, flash sale)'],
    ], caption: 'Source: roadmap phase 5, "More quick decisions"' },

    { type: 'h2', text: 'Decision deck: sawaal chuno, signals bharo' },
    { type: 'p', html: `Har card ek sawaal hai. Search karo (jaise "seat", "redis", "feed") ya category chuno, phir card ke sawaalon ke jawab do. Recommendation aur uski wajah neeche turant badlegi.` },
    { type: 'custom',
      D: [
        { id: 'rs', cat: 'Data', q: 'Replication ya sharding?', kw: 'replica shard database read write ha failover size tb', link: 'replication',
          ask: [
            { k: 'ha', q: 'HA (ek node gire to bhi chale) ya zyada reads chahiye?', o: ['Haan', 'Nahi'] },
            { k: 'wr', q: 'Writes ek leader node ki capacity se zyada hain?', o: ['Nahi', 'Haan'] },
            { k: 'sz', q: 'Data ek node mein comfortable (~1-5 TB) se zyada?', o: ['Nahi', 'Haan'] },
          ],
          dec(a) {
            if (a.wr === 1 || a.sz === 1) return { p: 'B', t: 'Sharding (aur har shard ki replicas)', w: (a.wr === 1 ? 'Writes ek leader se zyada hain: replicas writes nahi baant-te, kyunki har write har replica pe likhni padti hai. ' : '') + (a.sz === 1 ? 'Data ek node mein nahi samaata: replica pe bhi poora data hota hai, to wo madad nahi karta. ' : '') + 'Data ko shards mein baanto. Har shard ki 1-2 replicas phir bhi rakho HA ke liye.' };
            if (a.ha === 0) return { p: 'A', t: 'Replication', w: 'Writes aur size ek node mein fit hain; problem availability ya read load hai. Leader + followers: reads followers pe, leader gire to follower promote. Sharding ki complexity abhi bekaar hai.' };
            return { p: '-', t: 'Abhi dono nahi', w: 'Koi signal nahi: ek node + backups kaafi hai. Pehle indexes aur cache try karo. (Production mein HA ke liye ek replica phir bhi aam baat hai.)' };
          } },
        { id: 'se', cat: 'Data', q: 'Strong ya eventual consistency?', kw: 'consistency money balance inventory booking username likes views feed stale', link: 'cap',
          ask: [
            { k: 'harm', q: 'Galat/purana value padhne se nuksaan (paisa, double booking, duplicate username)?', o: ['Haan', 'Nahi'] },
            { k: 'own', q: 'Likhne wale user ko apna change turant dikhna chahiye?', o: ['Haan', 'Nahi'] },
          ],
          dec(a) {
            if (a.harm === 0) return { p: 'A', t: 'Strong consistency', w: 'Purana value padha to asli nuksaan: do log ek hi seat, ek hi username, ya balance se zyada debit. Ek source of truth (leader / transaction) se padho aur likho, chahe latency thodi badhe.' };
            if (a.own === 0) return { p: 'B', t: 'Eventual + read-your-own-writes', w: 'Baaki duniya ko 1-2 second purana dikhe to chalega, lekin likhne wale ko apna comment/post turant dikhna chahiye. Us user ke reads kuch der leader se karo (ya client pe hi turant dikha do), baaki sab replicas/cache se.' };
            return { p: 'B', t: 'Eventual consistency', w: 'Like count 1,02,345 ho ya 1,02,351, kisi ka nuksaan nahi. Eventual se replicas, caches aur regions sab available aur fast rehte hain.' };
          } },
        { id: 'pp', cat: 'Data', q: 'Feed: push ya pull?', kw: 'feed timeline fan-out fanout celebrity follower instagram twitter', link: 'pattern-fanout',
          ask: [
            { k: 'norm', q: 'Zyada tar users ke followers kam (hazaaron tak) hain?', o: ['Haan', 'Nahi'] },
            { k: 'celeb', q: 'Kuch accounts ke millions followers hain (celebrities)?', o: ['Nahi', 'Haan'] },
          ],
          dec(a) {
            if (a.norm === 0 && a.celeb === 1) return { p: 'both', t: 'Hybrid: normal users push, celebrities pull', w: 'Normal users ke posts likhte waqt followers ki timelines mein daal do (feed padhna super fast). Celebrity ke post ko 50M timelines mein likhna minutes leta hai, to unke posts padhte waqt kheencho aur merge karo. Bade social apps aisa hi hybrid use karte hain.' };
            if (a.celeb === 1) return { p: 'B', t: 'Pull (fan-out on read)', w: 'Bahut followers wale authors ke liye har post pe millions writes mehnga aur slow hai. Padhte waqt jinhe follow karte ho unke recent posts lao aur merge karo; hot posts ko cache karo.' };
            if (a.norm === 0) return { p: 'A', t: 'Push (fan-out on write)', w: 'Har post kuch sau/hazaar timelines mein likhna sasta hai, aur feed padhna (jo likhne se kahin zyada hota hai) bas ek precomputed list read hai.' };
            return { p: 'B', t: 'Pull, simple rakho', w: 'Na kam followers wale zyada users, na celebrities: shayad feed ka scale abhi chhota hai. Padhte waqt query karo; push ki complexity tab laao jab read load maange.' };
          } },
        { id: 'lg', cat: 'Traffic', q: 'Load balancer ya API gateway?', kw: 'lb gateway auth rate limit routing microservices nginx kong envoy', link: 'resilience',
          ask: [
            { k: 'many', q: 'Kai alag services hain jinhe URL ke hisaab se route karna hai?', o: ['Nahi', 'Haan'] },
            { k: 'edge', q: 'Auth, rate limiting, API keys ek jagah lagani hain?', o: ['Nahi', 'Haan'] },
          ],
          dec(a) {
            if (a.many === 1 || a.edge === 1) return { p: 'both', t: 'API gateway + LB (dono)', w: 'Gateway entry point pe auth, rate limit aur routing (/videos → video service, /pay → payment service) karta hai. Har service ke andar phir bhi kai identical copies hain, unke beech LB traffic baantta hai. Aksar gateway khud bhi kai copies mein, ek LB ke peeche chalta hai.' };
            return { p: 'A', t: 'Load balancer', w: 'Ek hi app ke identical servers hain aur kaam bas traffic baantna aur mare server ko hataana hai. Gateway ek extra hop aur ek extra cheez hogi jise chalana padega.' };
          } },
        { id: 'mm', cat: 'Architecture', q: 'Monolith ya microservices?', kw: 'monolith microservices team deploy scaling modular', link: 'architecture-styles',
          ask: [
            { k: 'teams', q: 'Kitni teams ek hi codebase pe kaam karti hain?', o: ['1-2 teams', 'Kai teams'] },
            { k: 'stage', q: 'Product kis stage pe hai?', o: ['Early, badal raha hai', 'Mature, boundaries clear'] },
            { k: 'scale', q: 'Kuch hisson ki scaling needs bahut alag hain?', o: ['Nahi', 'Haan'] },
          ],
          dec(a) {
            if (a.teams === 1 && a.stage === 1) return { p: 'B', t: 'Microservices', w: 'Kai teams ek dusre ke deploys ka wait kar rahi hain aur boundaries clear hain: har team apni service, apna deploy, apna database.' + (a.scale === 1 ? ' Alag scaling needs (jaise transcoding vs profile) is decision ko aur pakka karti hain.' : '') };
            if (a.teams === 1) return { p: 'both', t: 'Modular monolith (beech ka raasta)', w: 'Teams kai hain lekin product abhi badal raha hai: galat boundaries pe services kaatna mehnga padta hai. Ek deploy, lekin andar saaf modules aur ownership; boundaries pakki hone pe nikaalo.' };
            if (a.scale === 1) return { p: 'A', t: 'Monolith + ek alag service', w: 'Chhoti team ke liye monolith. Jo ek hissa bilkul alag scale karta hai (jaise video transcoding workers), sirf usko alag service bana do. Poora microservices setup chhoti team ko dubo dega.' };
            return { p: 'A', t: 'Monolith', w: 'Chhoti team, early product: ek codebase, ek deploy, function calls (network nahi), aasaan debugging. Speed sabse zaroori hai.' };
          } },
        { id: 'rc', cat: 'Data', q: 'Redis Sentinel ya Redis Cluster?', kw: 'redis sentinel cluster failover shard memory ram cache session', link: 'coordination',
          ask: [
            { k: 'fit', q: 'Saara data ek node ki RAM mein (aaram se, headroom ke saath) aata hai?', o: ['Haan', 'Nahi'] },
            { k: 'ops', q: 'Ops/sec ek node ki capacity (~100k+) se zyada?', o: ['Nahi', 'Haan'] },
            { k: 'fo', q: 'Primary gire to automatic failover chahiye?', o: ['Haan', 'Nahi'] },
          ],
          dec(a) {
            if (a.fit === 1 || a.ops === 1) return { p: 'B', t: 'Redis Cluster', w: (a.fit === 1 ? 'Data ek node mein nahi samaata. ' : '') + (a.ops === 1 ? 'Ek node ki throughput kam pad rahi hai. ' : '') + 'Cluster keys ko 16,384 hash slots mein baant ke kai primaries pe shard karta hai, aur har primary ki replica gire to promote bhi karta hai. Keemat: multi-key commands sirf ek slot ki keys pe (hash tags se).' };
            if (a.fo === 0) return { p: 'A', t: 'Redis Sentinel', w: 'Data ek node mein fit hai, to sharding ki zaroorat nahi. Sentinel processes primary ko dekhte rehte hain; gire to majority se agree karke replica ko primary bana dete hain. Simple, aur saare commands chalte hain.' };
            return { p: '-', t: 'Single Redis (+ replica, manual)', w: 'Data fit hai aur kuch minute ka downtime chalega (jaise sirf cache jo DB se dobara bhar sakta hai). Ek node + replica kaafi. Jis din downtime mehnga lage, Sentinel lagao.' };
          } },
        { id: 'cd', cat: 'Traffic', q: 'CDN ya seedha server se?', kw: 'cdn edge static image video personalised private live score cache', link: 'cdn',
          ask: [
            { k: 'shared', q: 'Response sab users ke liye same hai (personalised/private nahi)?', o: ['Haan', 'Nahi'] },
            { k: 'fast', q: 'Content har second badalta hai?', o: ['Nahi', 'Haan'] },
            { k: 'heavy', q: 'Users duniya bhar mein, files badi, ya traffic bahut zyada?', o: ['Haan', 'Nahi'] },
          ],
          dec(a) {
            if (a.shared === 1) return { p: 'B', t: 'Direct from server', w: 'Har user ka response alag (feed, cart, bank statement) ya private hai: CDN pe cache karna ya to bekaar (hit rate ~0) ya khatarnaak (kisi aur ka data dikh jaaye). Page ke static hisse (JS, CSS, images) phir bhi CDN se.' + (a.heavy === 0 ? ' Private lekin badi files (jaise paid course ka video) CDN se signed, expiring URLs ke saath di ja sakti hain.' : '') };
            if (a.fast === 1) return { p: 'A', t: 'CDN, bahut chhote TTL (1-2 s) ke saath', w: 'Live score jaisa data har second badalta hai lekin sab ke liye same hai. 1-2 second ka TTL bhi origin ko lakhon requests se bacha leta hai: har edge server second mein bas ek-do baar origin se poochta hai.' };
            if (a.heavy === 0) return { p: 'A', t: 'CDN', w: 'Same content, door ke users, badi files: CDN edge pe copy rakhta hai, latency kam aur origin ka bandwidth bill kam.' };
            return { p: 'A', t: 'CDN optional', w: 'Shared content hai lekin users paas mein aur traffic chhota. Browser caching headers kaafi ho sakte hain; CDN saste mein lag jaata hai to laga lo, lekin ye urgent nahi.' };
          } },
        { id: 'ol', cat: 'Data', q: 'Optimistic ya pessimistic locking?', kw: 'lock optimistic pessimistic version seat booking flash sale conflict hold', link: 'sql-vs-nosql',
          ask: [
            { k: 'conf', q: 'Kitne log ek hi row/item ko ek saath badalne ki koshish karte hain?', o: ['Kabhi kabhi (rare)', 'Bahut saare (hot item)'] },
            { k: 'hold', q: 'User ko item kuch minute "pakad ke" rakhna hai (payment tak)?', o: ['Nahi', 'Haan'] },
          ],
          dec(a) {
            if (a.hold === 1) return { p: 'B', t: 'Reservation hold (expiry ke saath)', w: 'Seat select karke payment karne mein minutes lagte hain. Seat ko HELD (user X, 10 minute tak) mark karo; payment ho to BOOKED, warna expiry pe free. DB lock minutes tak pakadna galat hoga.' };
            if (a.conf === 1) return { p: 'B', t: 'Pessimistic locking', w: 'Hot item pe optimistic check mein 1,000 mein se 999 log "conflict, phir try karo" sunenge aur retry storm banega. Row lock (SELECT ... FOR UPDATE) ya atomic decrement se ek ek karke aage badhao.' };
            return { p: 'A', t: 'Optimistic locking (version check)', w: 'Conflicts rare hain: koi lock mat pakdo. Row mein version number rakho; update tabhi jab version wahi ho jo padha tha (UPDATE ... WHERE version = 7). Fail hua to user ko "kisi ne badla, refresh karo".' };
          } },
      ],
      render(el) {
        const D = this.D, ans = {}, cats = ['Sab', 'Data', 'Traffic', 'Architecture'];
        D.forEach(d => { ans[d.id] = {}; d.ask.forEach(q => { ans[d.id][q.k] = 0; }); });
        let cat = 'Sab', term = '';
        el.innerHTML = `<input type="text" class="dq-s" placeholder="Search: seat, redis, feed, gateway..." aria-label="Search decisions" style="width:100%;box-sizing:border-box">
          <div class="dq-c" style="display:flex;flex-wrap:wrap;gap:6px;margin:10px 0"></div>
          <div class="dq-cards" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:12px"></div>
          <div class="calc-note dq-n"></div>`;
        const cc = el.querySelector('.dq-c'), cards = el.querySelector('.dq-cards');
        const col = { A: 'var(--green)', B: 'var(--violet)', both: 'var(--amber)', '-': 'var(--ink-2)' };
        const drawCats = () => { cc.innerHTML = ''; cats.forEach(c => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (c === cat ? ' on' : ''); b.textContent = c; b.onclick = () => { cat = c; drawCats(); draw(); }; cc.appendChild(b); }); };
        const draw = () => {
          cards.innerHTML = '';
          const t = term.trim().toLowerCase();
          const vis = D.filter(d => (cat === 'Sab' || d.cat === cat) && (!t || (d.q + ' ' + d.kw).toLowerCase().includes(t)));
          vis.forEach(d => {
            const r = d.dec(ans[d.id]);
            const c = document.createElement('div');
            c.style.cssText = 'border:1px solid var(--line-2);border-radius:var(--r);padding:12px;background:var(--surface)';
            c.innerHTML = `<div style="font:12px var(--f-mono);color:var(--ink-3)">${d.cat}</div><div style="font:700 17px var(--f-display);margin:2px 0 8px">${d.q}</div>`;
            d.ask.forEach(q => {
              const row = document.createElement('div'); row.style.margin = '0 0 8px';
              row.innerHTML = `<div style="font-size:14px;margin-bottom:4px">${q.q}</div>`;
              const ch = document.createElement('div'); ch.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px';
              q.o.forEach((o, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (ans[d.id][q.k] === i ? ' on' : ''); b.textContent = o; b.onclick = () => { ans[d.id][q.k] = i; draw(); }; ch.appendChild(b); });
              row.appendChild(ch); c.appendChild(row);
            });
            const out = document.createElement('div');
            out.style.cssText = 'margin-top:10px;padding-top:10px;border-top:1px dashed var(--line-2)';
            out.innerHTML = `<div style="font:700 16px var(--f-display);color:${col[r.p]}">→ ${r.t}</div><div style="font-size:14px;color:var(--ink-2);margin-top:4px">${r.w}</div><div style="font-size:13px;margin-top:6px"><a href="#/${d.link}">Gehrai mein padho</a></div>`;
            c.appendChild(out); cards.appendChild(c);
          });
          el.querySelector('.dq-n').textContent = vis.length ? `${vis.length} / ${D.length} cards dikh rahe hain.` : 'Koi card match nahi hua. Doosra word try karo (jaise "lock", "cdn", "team").';
        };
        el.querySelector('.dq-s').addEventListener('input', e => { term = e.target.value; draw(); });
        drawCats(); draw();
      },
    },

    { type: 'h2', text: 'Aathon sawaal, ek ek karke' },
    { type: 'h3', text: '1. Replication ya sharding?' },
    { type: 'p', html: `<a href="#/replication">Replication</a> = same data ki poori copies kai machines pe. <a href="#/sharding">Sharding</a> = data ko tukdon mein baant ke har tukda alag machine pe. Signal ye hai ki <em>kya</em> ek node pe zyada ho gaya. Reads zyada hain ya node gire to site band nahi honi chahiye → replicas (har replica reads le sakti hai, aur leader gire to promote ho sakti hai). Lekin writes ya data size zyada hai → replicas bekaar, kyunki har write har replica pe bhi likhni padti hai aur har replica pe poora data hota hai. Tab shard karo. Asli systems mein dono: har shard ke 2-3 replicas.` },
    { type: 'p', html: `<strong>xyz.com scenario:</strong> comments ki table 800 GB hai aur 90% traffic sirf padhna hai. Database CPU 80% pe hai, lekin writes kam hain.<br><strong>Wajah:</strong> problem reads ki hai. 2 read replicas lagao: reads teen machines mein bant jaate hain, aur leader gire to ek replica uski jagah le leti hai.<br><strong>Jaal:</strong> "bada system hai to shard karo". Sharding ke baad har query ko pata hona chahiye ki data kis shard pe hai, aur joins mushkil. Jab tak writes aur size ek node mein aate hain, sharding sirf dard hai.` },
    { type: 'h3', text: '2. Strong ya eventual consistency?' },
    { type: 'p', html: `Sawaal poochho: "agar koi 2 second purana value padh le to kya bigdega?" Bank balance, seat, inventory, unique username: do log ek saath "available" padh lein to double booking ya paise ka nuksaan. Wahan <strong>strong</strong> (ek source of truth, transaction). Likes, views, feed, search, recommendations: thoda purana dikhe to kisi ko pata bhi nahi chalega. Wahan <strong>eventual</strong>, jo zyada fast aur zyada available hai. Theory <a href="#/cap">CAP aur PACELC</a> mein hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: read-your-own-writes', html: `<strong>Ye kya hai:</strong> eventual system mein bhi ek chhoti guarantee: <strong>jo user likhta hai, use apna change turant dikhe</strong>, chahe doosron ko thodi der baad dikhe.<br><strong>Kyun chahiye:</strong> tumne comment kiya aur refresh pe wo gayab dikha, to lagega bug hai.<br><strong>Iske bina:</strong> user dobara comment karega, aur ab do comments.<br><strong>Kaise:</strong> us user ke reads kuch second leader se karo, ya app khud turant dikha de.` },
    { type: 'p', html: `<strong>xyz.com scenario:</strong> xyz.com wallet balance (strong) aur video ke like count (eventual), dono ek hi page pe.<br><strong>Wajah:</strong> wallet galat dikha to user ka paisa do baar kharch ho sakta hai, isliye leader/transaction se padho. Like count 2 second purana ho to koi nuksaan nahi, isliye cache ya replica se padho.<br><strong>Jaal:</strong> "poori app strong rakho, safe rahega". Har read leader pe jaayega, replicas aur cache bekaar, aur site slow. Consistency <em>har data ke liye alag</em> chuni jaati hai, poori app ke liye ek nahi.` },
    { type: 'h3', text: '3. Feed: push ya pull?' },
    { type: 'callout', tone: 'term', title: 'Naye words: fan-out on write (push) aur fan-out on read (pull)', html: `<strong>Ye kya hai:</strong> <strong>Fan-out</strong> = ek cheez ko kai jagah pahunchana. <strong>Push / fan-out on write</strong>: jab koi post kare, usi waqt uske har follower ki precomputed timeline (Redis list) mein post ID daal do. Padhna bahut sasta. <strong>Pull / fan-out on read</strong>: post sirf author ke paas; jab koi feed khole, tab jinhe wo follow karta hai unke recent posts nikaal ke merge karo. Likhna sasta, padhna mehnga.<br><strong>Kyun chahiye (chunna):</strong> feed kholna sabse zyada hone wala kaam hai. Kaam likhte waqt karein ya padhte waqt, isi se speed aur kharcha tay hota hai.<br><strong>Iske bina (galat model):</strong> ya to celebrity post pe crores writes ka toofan, ya har feed khulne pe bhaari queries.` },
    { type: 'p', html: `Normal user ke 300 followers: push = 300 chhote writes, aaram se. Celebrity ke 5 crore followers: push = 5 crore writes ek post pe, minutes ka backlog. Isliye bade apps <strong>hybrid</strong> karte hain: normal authors push, celebrities pull, aur feed kholte waqt dono merge. Real example: Twitter ke engineers ne 2012-13 ke ek talk mein bataya tha ki tweets followers ki Redis timelines mein push hote the, lekin bahut zyada followers wale accounts ke tweets padhte waqt jode jaate the. Ye talk ab kaafi purana hai, lekin idea aaj bhi standard hai. Neeche ke flow mein ise girte aur theek hote dekho.` },
    { type: 'p', html: `<strong>xyz.com scenario:</strong> xyz.com pe Riya ke 300 followers hain, aur ek cricket star ke 5 crore.<br><strong>Wajah:</strong> Riya ke post ko 300 timelines mein likhna sasta hai. Star ke post ko 5 crore jagah likhna minutes leta hai, to uske posts padhte waqt jode jaate hain.<br><strong>Jaal:</strong> ek hi model sab pe lagana. Sirf push = celebrity post pe write storm. Sirf pull = har feed kholne pe sau logon ke posts dhoondhna, jo crores reads pe bahut mehnga hai.` },
    { type: 'h3', text: '4. Load balancer ya API gateway?' },
    { type: 'p', html: `<a href="#/load-balancer">Load balancer</a> ek hi service ki identical copies mein traffic baantta hai aur mare server ko hata deta hai. <a href="#/resilience">API gateway</a> sabka ek darwaza hai: token check, rate limiting, API keys, aur URL dekh ke sahi service tak bhejna (<code>/videos</code> → video service). Ye competitor nahi, alag layers hain: client → gateway → (har service ke andar) LB → servers. Ek hi app ho aur auth app khud karti ho, to sirf LB kaafi.` },

    { type: 'p', html: `<strong>xyz.com scenario:</strong> xyz.com ke paas video, payments aur chat services hain. Har service ki 4-10 copies chal rahi hain.<br><strong>Wajah:</strong> bahar wale clients ke liye ek gateway (login check, rate limit, <code>/pay</code> ko payment service tak). Gateway ke peeche har service ke aage ek LB, jo us service ki copies mein traffic baantta hai.<br><strong>Jaal:</strong> "gateway aa gaya, LB hata do". Gateway ko phir bhi kisi tarah 10 copies mein baantna hai, aur gateway khud bhi kai copies mein chalta hai. Dono alag kaam karte hain.` },
    { type: 'h3', text: '5. Monolith ya microservices?' },
    { type: 'p', html: `Ye technology se zyada <strong>team</strong> ka sawaal hai. 5 log, naya product, features roz badal rahe: <a href="#/architecture-styles">monolith</a> sabse tez hai (ek deploy, function calls, ek database). Microservices tab faayda dete hain jab 20 teams ek dusre ke deploy ka wait kar rahi hon, ya ek hissa (jaise video transcoding) baaki app se bilkul alag scale karta ho. Beech ka raasta: <strong>modular monolith</strong>, ek deploy lekin andar saaf boundaries. Chhoti team microservices le le to har feature mein network calls, distributed debugging aur <a href="#/distributed-tx">distributed transactions</a> ka dard.` },
    { type: 'p', html: `<strong>xyz.com scenario:</strong> xyz.com shuru mein 4 engineers ki team thi. Ab 15 teams hain, aur video transcoding ko 200 machines chahiye jabki profile page ko 4.<br><strong>Wajah:</strong> jab 4 log the, monolith sabse tez tha. Ab teams ek doosre ke deploy ka wait karti hain, aur transcoding ki scaling bilkul alag hai. Isliye transcoding sabse pehle alag service bani, phir dheere dheere baaki.<br><strong>Jaal:</strong> "Netflix microservices use karta hai, hum bhi karenge" pehle din se. 4 logon ki team 20 services chalayegi to aadha time network bugs aur deploys mein jaayega.` },
    { type: 'h3', text: '6. Redis Sentinel ya Redis Cluster?' },
    { type: 'p', html: `Dono Redis ko HA dete hain, fark sharding ka hai. <a href="#/coordination">Sentinel</a> ek primary + replicas ko dekhta hai aur primary gire to replica promote karta hai; data ek hi node mein rehta hai. <strong>Redis Cluster</strong> keys ko 16,384 hash slots mein baant ke kai primaries pe shard karta hai, aur failover bhi khud karta hai. Signal: data (aur ops/sec) ek node mein aata hai? → Sentinel. Nahi aata → Cluster. Cluster ki keemat: ek command mein kai keys tabhi jab wo same slot mein hon.` },
    { type: 'p', html: `<strong>xyz.com scenario:</strong> xyz.com ke login sessions: 3 GB data. Feed timelines: 400 GB data.<br><strong>Wajah:</strong> sessions ek node ki RAM mein aaram se aate hain, bas machine gire to session na khoye: Sentinel. Timelines 400 GB ek node mein nahi aati: Cluster, jo data kai machines mein baant deta hai.<br><strong>Jaal:</strong> Cluster mein ek command ki saari keys same slot mein honi chahiye. <code>MGET user:1 user:2</code> alag slots pe fail hoga. Code ko pehle se iske hisaab se likhna padta hai (hash tags).` },
    { type: 'h3', text: '7. CDN ya seedha server se?' },
    { type: 'p', html: `<a href="#/cdn">CDN</a> tab chamakta hai jab ek hi response bahut logon ko jaana hai: images, videos, JS/CSS, live score JSON. Personalised (tumhara feed, cart), private (bank statement) ya har request pe alag responses CDN pe cache karna ya to bekaar hai (koi do users same nahi maangte) ya khatarnaak (kisi aur ka data dikh sakta hai). Bahut tezi se badalta lekin shared data (live score) phir bhi CDN pe 1-2 second TTL ke saath, ye napkin maths ka classic example hai.` },
    { type: 'p', html: `<strong>xyz.com scenario:</strong> xyz.com ka homepage JS bundle (sab ke liye same) aur "Continue watching" list (har user ki alag).<br><strong>Wajah:</strong> JS bundle CDN pe: crores users, ek hi file, paas ke edge se. Continue watching seedha server se, kyunki koi do users ki list same nahi.<br><strong>Jaal:</strong> personalised response CDN pe galti se cache ho gaya, to ek user ki list doosre ko dikh sakti hai. Personal responses pe <code>Cache-Control: private</code> lagao.` },
    { type: 'h3', text: '8. Optimistic ya pessimistic locking?' },
    { type: 'callout', tone: 'term', title: 'Naye words: optimistic aur pessimistic locking', html: `<strong>Ye kya hai:</strong> do log ek hi row ek saath badlein to kya ho, iske teen tareeke.<br><strong>Optimistic</strong>: "conflict shayad nahi hoga". Koi lock nahi; har row mein ek <code>version</code>. Update karte waqt check: <code>UPDATE ... SET ..., version = 8 WHERE id = 5 AND version = 7</code>. Kisi aur ne pehle badal diya to 0 rows update, aur tum retry karte ho. <strong>Pessimistic</strong>: "conflict hoga hi". Pehle lock lo (<code>SELECT ... FOR UPDATE</code>), doosre wait karein. <strong>Reservation hold</strong>: lambe kaam (payment) ke liye row ko "HELD till 10:15" mark karna, lock nahi pakadna.<br><strong>Kyun chahiye:</strong> do updates ek doosre ko chupchaap mita na dein, aur ek seat do logon ko na bik jaaye.<br><strong>Iske bina:</strong> "lost update": A aur B dono ne version 7 padha, dono ne likha, aur A ka badlaav gayab. Seat ke case mein double booking.` },
    { type: 'p', html: `Profile edit, wiki page, settings: do log ek saath shayad hi badlein → optimistic, sasta aur bina wait. Concert seat ya flash sale ka last iPhone: hazaaron log ek hi row pe → optimistic mein 999 log fail hokar retry karenge aur DB pe retry storm. Wahan pessimistic lock ya reservation hold (expiry ke saath).` },

    { type: 'p', html: `<strong>xyz.com scenario:</strong> profile bio edit (optimistic) aur concert ki seat A1 (reservation hold).<br><strong>Wajah:</strong> bio pe do log ek saath shayad hi likhein, to version check kaafi. Seat A1 pe 1,000 log ek saath, aur payment mein 10 minute: seat ko HELD mark karo.<br><strong>Jaal:</strong> DB lock (<code>SELECT ... FOR UPDATE</code>) ko payment ke 10 minute tak pakde rakhna. Baaki sab requests us row pe atak jaayengi, aur connections khatam ho jaayenge.` },

    { type: 'h2', text: 'Galat choice ko girte dekho: celebrity aur push feed' },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'au', label: 'Author', sub: 'post karta hai', x: 80, y: 70, w: 130, kind: 'client', info: 'Ye kya hai: post karne wala user. Normal user ke ~300 followers, celebrity ke 5 crore.' },
        { id: 'ps', label: 'Post service', sub: 'posts table', x: 280, y: 70, w: 150, kind: 'server', info: 'Ye kya hai: posts ki service. Post save karta hai (source of truth) aur fan-out ke liye event queue mein daalta hai. Pull model mein feed service yahin se celebrity ke recent posts maangti hai.' },
        { id: 'fq', label: 'Fan-out queue', x: 480, y: 70, w: 140, kind: 'queue', info: 'Ye kya hai: kaam ki line. Har post ka "followers ki timelines mein daalo" kaam yahan aata hai. Ek celebrity post = crores chhote kaam.' },
        { id: 'fw', label: 'Fan-out workers', x: 640, y: 190, w: 140, kind: 'server', info: 'Ye kya hai: background programs. Followers ki list padh ke har follower ki timeline mein post ID likhte hain.' },
        { id: 'tl', label: 'Timeline cache', sub: 'Redis lists', x: 460, y: 270, w: 150, kind: 'cache', info: 'Ye kya hai: Redis mein har user ki pehle se bani (precomputed) feed: post IDs ki list. Feed kholna = ek list read, bahut fast.' },
        { id: 'fs', label: 'Feed service', x: 280, y: 270, w: 140, kind: 'server', info: 'Ye kya hai: wo service jo feed kholne pe jawab deti hai. Timeline cache se precomputed list, aur hybrid mein follow kiye celebrities ke recent posts post service se, dono merge.' },
        { id: 'rd', label: 'Reader', sub: 'feed kholta hai', x: 80, y: 270, w: 130, kind: 'client', info: 'Ye kya hai: feed kholne wala follower. Reads writes se kai guna zyada hote hain.' },
      ],
      edges: [{ a: 'au', b: 'ps' }, { a: 'ps', b: 'fq' }, { a: 'fq', b: 'fw' }, { a: 'fw', b: 'tl' }, { a: 'rd', b: 'fs' }, { a: 'fs', b: 'tl' }, { a: 'fs', b: 'ps', id: 'pull', dashed: true }],
      scenarios: [
        { name: 'Normal user: push', steps: [
          { title: 'Post', text: 'Riya (300 followers) ne post kiya.', go: 'au>ps>fq', msg: 'POST /posts  { author: riya }' },
          { title: 'Fan-out on write', text: 'Workers 300 timelines mein post ID daal dete hain: kuch milliseconds ka kaam.', go: 'fq>fw>tl', after: { tl: { state: 'ok', sub: '+300 entries' } }, msg: 'LPUSH timeline:<follower> post_991   × 300' },
          { title: 'Feed padhna sasta', text: 'Follower feed kholta hai: bas ek precomputed list. Reads fast, kyunki kaam likhte waqt ho chuka tha.', go: ['rd>fs>tl', 'res:tl>fs>rd'], msg: 'LRANGE timeline:aman 0 49' },
        ]},
        { name: 'Galat: celebrity push', intro: 'Ek celebrity (5 crore followers) bhi push se.', steps: [
          { title: 'Celebrity post', text: 'Ek post, lekin fan-out ka kaam 5 crore timelines ka.', set: { au: { sub: '5 crore followers' } }, go: 'au>ps>fq', after: { fq: { state: 'hot', sub: '5 crore jobs!' } } },
          { title: 'Workers dabe', text: 'Workers ~1 lakh writes/sec kar paate hain to bhi 5 crore writes ~8 minute. Is beech normal users ke posts bhi isi queue mein peeche atke.', flood: { paths: ['fq>fw>tl'], n: 14 }, after: { fw: { state: 'hot', sub: 'backlog' }, tl: { state: 'warn', sub: 'write storm' } } },
          { title: 'Followers ko post late', text: 'Aadhe followers ko post minutes baad dikhta hai, aur Riya jaise normal users ke posts bhi late. Ek author ne sabka feed slow kar diya.', go: ['rd>fs>tl', 'bad:tl>fs>rd'], msg: 'feed: celebrity post missing, 8 min late' },
        ]},
        { name: 'Fix: hybrid', intro: 'Normal authors push, celebrities pull.', steps: [
          { title: 'Celebrity post: koi fan-out nahi', text: 'Post service sirf post save karti hai. Queue khaali, workers aaram se.', set: { au: { sub: '5 crore followers' }, fq: { state: 'dim' }, fw: { state: 'dim' } }, go: 'au>ps', after: { ps: { state: 'ok', sub: 'celebrity post saved' } } },
          { title: 'Feed kholte waqt merge', text: 'Feed service do jagah se laati hai: precomputed timeline (normal friends ke posts) + follow kiye celebrities ke recent posts (pull). Merge, sort, done.', parallel: true, go: ['rd>fs', 'fs>tl', 'fs>ps'] },
          { title: 'Response', text: 'Celebrity ke recent posts bahut log maangte hain, to wo khud cache mein hot rehte hain. Pull ka extra read sasta pad jaata hai.', go: ['res:ps>fs', 'res:fs>rd'], after: { fs: { state: 'ok', sub: 'merged feed' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'Doosra galat choice: hot seat pe optimistic locking' },
    { type: 'p', html: `xyz.com ab concert tickets bhi bechta hai. Front row seat A1 ke liye 10 baje 1,000 log ek saath click karte hain. Dekho optimistic locking yahan kaise toot-ta hai, aur reservation hold kaise bachata hai.` },
    { type: 'flow', height: 300,
      nodes: [
        { id: 'ua', label: 'User A', x: 90, y: 55, w: 120, kind: 'client', info: 'Ye kya hai: pehla user. Profile scenario mein apna bio edit kar raha hai; seat scenarios mein A1 chahta hai.' },
        { id: 'ub', label: 'User B', x: 90, y: 150, w: 120, kind: 'client', info: 'Ye kya hai: doosra user, usi waqt usi seat ke liye.' },
        { id: 'cr', label: 'Baaki 998', sub: 'same seat chahiye', x: 90, y: 245, w: 140, kind: 'client', info: 'Ye kya hai: flash sale ki bheed. Sab ek hi row ke peeche.' },
        { id: 'api', label: 'Booking API', x: 330, y: 150, w: 140, kind: 'server', info: 'Ye kya hai: booking ki service. Seat select aur booking ka logic. Yahin decide hota hai ki conflict kaise sambhalein.' },
        { id: 'db', label: 'Seats DB', sub: 'row: A1', x: 560, y: 150, w: 140, kind: 'data', meter: true, load: 20, info: 'Ye kya hai: seats ka database. Har seat ek row: status (AVAILABLE / HELD / BOOKED), held_by, hold_until, version. Source of truth, strong consistency chahiye.' },
      ],
      edges: [{ a: 'ua', b: 'api' }, { a: 'ub', b: 'api' }, { a: 'cr', b: 'api' }, { a: 'api', b: 'db' }],
      scenarios: [
        { name: 'Optimistic: rare conflict', intro: 'Profile bio edit: do log ek saath ek hi profile shayad hi badlein.', steps: [
          { title: 'Padho, version ke saath', text: 'User A apna profile padhta hai: version 7.', set: { ub: { state: 'dim' }, cr: { state: 'dim' }, db: { sub: 'profile v7' } }, go: ['ua>api>db', 'res:db>api>ua'], msg: 'SELECT bio, version FROM profiles WHERE id = 5   → v7' },
          { title: 'Update sirf agar version wahi', text: 'Koi lock nahi pakda. Update mein version check. Kisi ne beech mein nahi badla, to 1 row update.', go: ['ua>api>db', 'res:db>api>ua'], after: { db: { state: 'ok', sub: 'profile v8' } }, msg: 'UPDATE profiles SET bio = ?, version = 8\n WHERE id = 5 AND version = 7      → 1 row' },
          { title: 'Kyun achha', text: 'Koi wait nahi, koi lock nahi. Conflict hota to 0 rows aata aur user ko "refresh karo" bolte. Rare conflicts ke liye ye sabse sasta hai.', focus: ['db'] },
        ]},
        { name: 'Galat: optimistic on hot seat', steps: [
          { title: '1,000 log ek saath padhte hain', text: 'Sabko A1 AVAILABLE, version 3 dikhi.', parallel: true, go: ['ua>api', 'ub>api', 'cr>api'], after: { api: { state: 'warn', sub: '1,000 requests' } } },
          { title: 'Sab update bhejte hain', text: 'Sab <code>WHERE version = 3</code> ke saath. Sirf ek jeetta hai.', flood: { paths: ['ua>api>db', 'ub>api>db', 'cr>api>db'], n: 12 }, after: { db: { load: 85, state: 'hot', sub: '1 win, 999 fail' } }, msg: 'UPDATE seats ... WHERE id = A1 AND version = 3   → 0 rows (×999)' },
          { title: 'Retry storm', text: '999 log "conflict" sunke retry karte hain, phir fail, phir retry. DB pe ek hi row ke liye hazaaron bekaar queries. Users ko baar baar error. Optimistic ka assumption ("conflict rare hai") yahan jhooth tha.', go: ['bad:api>ub', 'bad:api>cr'], parallel: true, flood: { paths: ['cr>api>db'], n: 10 }, after: { db: { load: 99, state: 'down', sub: 'hot row overload' } } },
        ]},
        { name: 'Fix: reservation hold', steps: [
          { title: 'Atomic hold', text: 'Ek hi atomic statement: seat sirf tab HELD hogi jab abhi AVAILABLE hai. Database row ko ek ek karke lock karke ye chalaata hai.', go: ['ua>api>db', 'res:db>api>ua'], after: { db: { state: 'warn', sub: 'A1 HELD by A, 10 min' } }, msg: "UPDATE seats SET status='HELD', held_by='A', hold_until=now()+10min\n WHERE id='A1' AND status='AVAILABLE'      → 1 row" },
          { title: 'Baaki ko turant saaf jawab', text: '0 rows: seat le li gayi. Retry ka koi faayda nahi, to user ko turant doosri seat dikhao. Hot seats ke liye aage queue / waiting room bhi lagate hain.', parallel: true, go: ['ub>api>db', 'res:db>api', 'bad:api>ub'], msg: '→ 0 rows   "A1 abhi kisi aur ne pakdi hai"' },
          { title: 'Payment hua to BOOKED, warna free', text: 'User A ne 10 minute mein pay kiya → BOOKED. Nahi kiya → background job hold_until ke baad seat AVAILABLE kar deta hai. Lock minutes tak pakadna nahi pada.', go: ['ua>api>db'], after: { db: { state: 'ok', sub: 'A1 BOOKED' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'Worked scenarios' },
    { type: 'h3', text: 'IRCTC Tatkal / BookMyShow seat' },
    { type: 'p', html: `Signals: paisa + seat (double booking = asli nuksaan), hazaaron log ek hi item pe, payment mein minutes. Decisions: <strong>strong consistency</strong> (card 2), <strong>reservation hold with expiry</strong> (card 8), seat map page CDN pe nahi (har second badalta, aur galat "available" dikhna bura UX) lekin poster, JS, images CDN se (card 7).` },
    { type: 'h3', text: 'YouTube video ke views aur likes' },
    { type: 'p', html: `Views 10,23,456 dikhe ya 10,23,470, koi farq nahi. <strong>Eventual</strong> (card 2). Har view pe DB row update nahi, counters Redis mein aur batch mein flush. Video file aur thumbnails <strong>CDN</strong> (card 7). Lekin "Watch later" list personalised hai → direct.` },
    { type: 'h3', text: 'Ek startup: 4 engineers, naya app' },
    { type: 'p', html: `Ek team, product har hafte badal raha. <strong>Monolith</strong> (card 5), ek database jisme ek replica HA ke liye (card 1: replication, sharding nahi), aur sirf <strong>LB</strong> (card 4). Kuch saal baad 10 teams aur alag scaling needs → tab modular monolith, phir services.` },
    { type: 'h3', text: 'Trap 1: "Writes slow hain, read replicas laga do"' },
    { type: 'p', html: `xyz.com ka chat DB writes pe 95% CPU pe hai. Kisi ne kaha "2 aur replicas laga do". Trap! Replica pe bhi har write likhni padti hai, aur writes sirf leader leta hai. Replicas sirf reads aur HA mein madad karti hain; writes ki problem ka ilaaj <strong>sharding</strong> hai (card 1). Ulta, synchronous replicas writes ko aur slow kar sakti hain.` },
    { type: 'h3', text: 'Trap 2: "Redis Cluster lagao, bada lagta hai"' },
    { type: 'p', html: `Sessions ka data 3 GB hai, ek node mein aaram se. Cluster lene se multi-key commands pe pabandi, zyada nodes, zyada ops kaam, aur faayda zero. Data fit hai aur failover chahiye → <strong>Sentinel</strong> (ya managed Redis jisme failover built-in ho). Cluster tab, jab data ya ops/sec ek node se bahar jaayein (card 6).` },

    { type: 'h2', text: 'Practice: 8 chhote cases' },
    { type: 'p', html: `Har case ke liye pehle khud socho: kaunsa sawaal hai, aur A ya B? Phir signal dekho, phir jawab.` },
    { type: 'custom',
      cases: [
        { q: 'xyz.com ka "watch history" table 30 TB ka ho gaya hai, aur har second 2 lakh naye rows aate hain.', signal: 'Size aur writes, dono ek node se bahar.', pick: 'Sharding (har shard ki replicas ke saath)', why: 'Replica pe bhi poora 30 TB aur har write. Sirf sharding size aur writes ko baant sakti hai. user_id se shard karo, taaki ek user ki history ek jagah rahe.', trap: '"Bas aur replicas laga do." Replicas reads baant-ti hain, writes nahi.' },
        { q: 'xyz.com pe coupon "FIRST50" sirf pehle 1,000 users ke liye hai.', signal: 'Ginti jo galat nahi honi chahiye: 1,001wa coupon = paisa ka nuksaan.', pick: 'Strong consistency (atomic counter ya transaction)', why: 'Counter ek source of truth pe atomically ghatao (DB transaction ya Redis DECR). Zero hone pe "khatam".', trap: 'Har region apni copy se "abhi kitne bache" padhe. Eventual copies mein 1,000 se zyada coupons nikal jaayenge.' },
        { q: 'xyz.com pe ek naya "Shorts" feed. Zyada tar creators ke 200-5,000 followers, kuch ke 1 crore se zyada.', signal: 'Normal authors kam followers wale, kuch celebrities.', pick: 'Hybrid: normal push, celebrities pull', why: 'Normal posts likhte waqt timelines mein. Celebrity posts feed kholte waqt jodo. Threshold (jaise 1 lakh followers) napkin maths se.', trap: 'Sab ke liye push: ek celebrity post = 1 crore writes, aur baaki sab ke posts uske peeche atke.' },
        { q: 'xyz.com ab apni API bahar ke developers ko de raha hai: har developer ka API key, aur har key pe 100 requests/minute ki limit.', signal: 'API keys, rate limiting, ek jagah.', pick: 'API gateway (aur peeche LB)', why: 'Key check aur rate limit har service mein alag likhna galat hai. Gateway ek darwaze pe ye karta hai, phir LB service ki copies mein baantta hai.', trap: 'Rate limit har server pe alag rakhna: 10 servers = asal mein 1,000/minute.' },
        { q: '3 engineers, 2 mahine purana app "xyz notes". Features roz badal rahe hain.', signal: 'Chhoti team, early product.', pick: 'Monolith', why: 'Ek codebase, ek deploy, function calls. Sabse tez seekhna aur badalna.', trap: 'Pehle din 12 microservices. Har feature mein 4 services badlo, aur network bugs dhoondho.' },
        { q: 'Rate limiter ke counters Redis mein: 2 GB data, lekin Redis gira to saare limits band ho jaate hain.', signal: 'Data ek node mein fit, failover chahiye.', pick: 'Redis Sentinel (ya managed Redis with failover)', why: 'Sharding ki zaroorat nahi. Sentinel primary pe nazar rakhta hai aur gire to replica ko primary bana deta hai.', trap: 'Cluster lena "future ke liye". Multi-key commands pe pabandi aur zyada machines, abhi bina faayde ke.' },
        { q: 'Har user ka "Your 2025 on xyz.com" recap page: uske top videos, uske ghante.', signal: 'Personalised: har user ka alag.', pick: 'Direct from server (static assets CDN se)', why: 'Ye response sirf ek user ke liye hai. CDN pe hit rate zero, aur galti se kisi aur ko dikh sakta hai. JS, CSS aur images phir bhi CDN se.', trap: 'Poore page ko CDN pe cache kar dena bina private header ke.' },
        { q: 'xyz.com ke live event ke 500 VIP passes, 10:00 baje sale, 2 lakh log ready.', signal: 'Hot item: hazaaron log ek hi cheez pe, aur payment mein minutes.', pick: 'Reservation hold (expiry ke saath), aage waiting room', why: 'Ek atomic UPDATE pass ko HELD karta hai sirf agar AVAILABLE ho. Payment 10 minute mein nahi hua to wapas free. Bheed ko waiting room se dheere andar bhejo.', trap: 'Optimistic version check: 2 lakh mein se lagbhag sab "conflict" sunenge aur retry storm DB gira dega.' },
      ],
      render(el) {
        const cases = this.cases, T = { case: 'Case', hint: 'Signal dikhao', ans: 'Jawab dikhao', prev: '← Pichhla', next: 'Agla →', signal: 'Signal', trap: 'Jaal' };
        let i = 0, hint = false, ans = false;
        const draw = () => {
          const c = cases[i];
          el.innerHTML = `<div style="font-size:12px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.06em">${T.case} ${i + 1} / ${cases.length}</div>
            <div style="font:600 17px/1.45 var(--f-body);color:var(--ink);margin:4px 0 10px">${c.q}</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px">
              <button type="button" class="btn small" data-a="hint">${T.hint}</button>
              <button type="button" class="btn small primary" data-a="ans">${T.ans}</button>
              <button type="button" class="btn small ghost" data-a="prev">${T.prev}</button>
              <button type="button" class="btn small ghost" data-a="next">${T.next}</button></div>
            <div class="calc-note" style="${hint ? '' : 'display:none'}"><strong>${T.signal}:</strong> ${c.signal}</div>
            <div style="${ans ? '' : 'display:none'};margin-top:10px;border:1px solid var(--line-2);border-left:4px solid var(--green);border-radius:var(--r);background:var(--surface-2);padding:10px 12px">
              <div style="font:700 16px var(--f-display);color:var(--ink)">${c.pick}</div>
              <p style="margin:6px 0">${c.why}</p><p style="margin:6px 0"><strong>${T.trap}:</strong> ${c.trap}</p></div>`;
          el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
            const a = b.dataset.a;
            if (a === 'hint') hint = true; else if (a === 'ans') { hint = true; ans = true; }
            else { i = (i + (a === 'next' ? 1 : cases.length - 1)) % cases.length; hint = false; ans = false; }
            draw();
          });
        };
        draw();
      },
    },

    { type: 'callout', tone: 'tip', title: 'Decide (roadmap rules, ek line mein)', html: `Reads/HA → replicate; writes/size → shard. Paisa/inventory/bookings/usernames → strong; likes/views/feed/search → eventual. Kam followers → push; celebrity → pull; asli mein hybrid. Identical servers → LB; auth/rate-limit/routing → gateway; aam taur pe dono. Chhoti team → monolith; kai teams + alag scaling → microservices. Ek node mein fit → Sentinel; shard chahiye → Cluster. Shared/static/global → CDN; personalised/private → direct. Rare conflict → optimistic; hot item → pessimistic / hold.` },

    { type: 'h2', text: 'Interview mein ye kaise bolein' },
    { type: 'steps', items: [
      { t: 'Signal pehle bolo', d: '"Yahan paisa hai", "data 12 TB hai", "ek author ke 5 crore followers". Interviewer ko dikhe ki choice requirement se aayi.' },
      { t: 'Simple option se shuru', d: 'Replica, monolith, LB, Sentinel, optimistic: jab tak signal B na maange, A. Kam moving parts.' },
      { t: '"Dono, alag jagah" bolne se mat daro', d: 'Shards ki replicas, gateway + LB, hybrid feed. Har hisse ke liye alag choice.' },
      { t: 'Kab badlega, ye bhi bolo', d: '"Writes 3 guna ho gaye to shard karenge", "teams 10 ho gayi to services nikaalenge". Decision ke saath uski expiry.' },
    ]},
    { type: 'h2', text: 'Poori picture' },
    { type: 'diagram', title: 'xyz.com: aathon choices kahan lagi', height: 630,
      nodes: [
        { id: 'users', label: 'Users', sub: 'app + browser', x: 90, y: 60, w: 120, kind: 'client', info: 'Ye kya hai: xyz.com ke users. Kuch requests CDN pe khatam ho jaati hain (videos, JS), baaki gateway se andar jaati hain.' },
        { id: 'cdn', label: 'CDN', sub: 'videos, JS, images', x: 300, y: 60, w: 150, kind: 'edge', info: 'Ye kya hai: user ke paas wale cache servers. Choice 7: shared aur badi files CDN se. Personal cheezein (continue watching) yahan nahi.' },
        { id: 'gw', label: 'API gateway', sub: 'auth, rate limit', x: 300, y: 180, w: 150, kind: 'net', info: 'Ye kya hai: sab API requests ka ek darwaza. Choice 4: login check, rate limit aur URL dekh ke sahi service tak bhejna yahan.' },
        { id: 'sess', label: 'Redis Sentinel', sub: 'sessions, 3 GB', x: 560, y: 180, w: 150, kind: 'cache', info: 'Ye kya hai: login sessions ka Redis. Choice 6: data ek node mein fit hai, bas failover chahiye, isliye Sentinel, Cluster nahi.' },
        { id: 'lb', label: 'Load balancers', sub: 'copies ke beech', x: 300, y: 300, w: 150, kind: 'net', info: 'Ye kya hai: har service ke aage LB, jo us service ki identical copies mein traffic baantta hai. Choice 4: gateway ke saath LB bhi, dono.' },
        { id: 'feed', label: 'Feed service', sub: 'hybrid feed', x: 110, y: 430, w: 140, kind: 'server', info: 'Ye kya hai: feed banane wali service. Choice 3: normal authors ke posts pehle se timelines mein (push), celebrities ke posts padhte waqt (pull). Choice 5: alag team, alag service.' },
        { id: 'booking', label: 'Booking service', sub: 'tickets', x: 360, y: 430, w: 140, kind: 'server', info: 'Ye kya hai: event tickets bechne wali service. Choice 8: hot seats pe reservation hold, kyunki hazaaron log ek seat pe.' },
        { id: 'profile', label: 'Profile service', sub: 'bio, settings', x: 560, y: 430, w: 140, kind: 'server', info: 'Ye kya hai: profile edit wali service. Choice 8: conflicts rare, isliye optimistic version check, koi lock nahi.' },
        { id: 'tl', label: 'Timeline cache', sub: 'Redis Cluster', x: 95, y: 570, w: 150, kind: 'cache', info: 'Ye kya hai: har user ki bani-banayi feed list. 400 GB, ek node mein nahi aati: choice 6 ka Cluster. Choice 2: eventual, post kuch second late aaye to chalega.' },
        { id: 'seats', label: 'Seats DB', sub: 'strong + hold', x: 410, y: 570, w: 140, kind: 'data', info: 'Ye kya hai: seats ka SQL database. Choice 2: strong consistency, ek seat do logon ko nahi. Status AVAILABLE → HELD → BOOKED.' },
        { id: 'usersdb', label: 'Users DB', sub: 'leader + replicas', x: 590, y: 570, w: 150, kind: 'data', info: 'Ye kya hai: users ka database. Choice 1: data ek node mein aata hai, reads zyada hain, to replicas (sharding nahi). Edit karne wala apna change leader se padhta hai.' },
        { id: 'posts', label: 'Posts DB', sub: 'sharded', x: 255, y: 570, w: 130, kind: 'data', info: 'Ye kya hai: saare posts. Choice 1: size aur writes ek node se bahar, isliye author_id se sharded, har shard ki replicas.' },
      ],
      edges: [
        { a: 'users', b: 'cdn', label: 'files' },
        { a: 'users', b: 'gw', label: 'API' },
        { a: 'gw', b: 'sess', label: 'session' },
        { a: 'gw', b: 'lb' },
        { a: 'lb', b: 'feed' },
        { a: 'lb', b: 'booking' },
        { a: 'lb', b: 'profile' },
        { a: 'feed', b: 'tl', label: 'push' },
        { a: 'feed', b: 'posts', label: 'celeb pull' },
        { a: 'booking', b: 'seats', label: 'hold' },
        { a: 'profile', b: 'usersdb', label: 'version' },
      ],
      paths: [
        { name: 'Video dekho', text: 'Video aur JS sab ke liye same hain, to CDN ke paas wale server se aaye. Origin tak request gayi hi nahi.', go: ['users>cdn', 'res:cdn>users'] },
        { name: 'Feed kholo', text: 'Gateway ne session check kiya, LB ne feed service ki ek copy chuni. Timeline cache se list, aur celebrities ke posts posts DB se, dono merge.', go: ['users>gw>sess', 'gw>lb>feed>tl', 'feed>posts', 'res:feed>lb>gw>users'] },
        { name: 'Seat book karo', text: 'Booking service ne seat ko ek atomic UPDATE se HELD kiya (strong). Payment 10 minute mein, warna seat free.', go: ['users>gw>lb>booking>seats', 'res:seats>booking>lb>gw>users'] },
        { name: 'Profile edit', text: 'Profile service ne version check ke saath update kiya (optimistic). Users DB ke leader pe likha, replicas pe baad mein pahuncha.', go: ['users>gw>lb>profile>usersdb', 'res:usersdb>profile>lb>gw>users'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Reads ya HA ki problem → replication. Writes ya size ki problem → sharding. Asli mein dono.</li>
      <li>Paisa, stock, seats, unique usernames → strong. Likes, views, feed, search → eventual.</li>
      <li>Kam followers → push. Celebrity → pull. Bade apps → hybrid.</li>
      <li>LB = ek service ki copies mein baantna. Gateway = sabka darwaza (auth, rate limit, routing). Aam taur pe dono.</li>
      <li>Chhoti team, naya product → monolith. Kai teams + alag scaling → microservices. Beech mein modular monolith.</li>
      <li>Data ek Redis node mein fit → Sentinel. Shard chahiye → Cluster (16,384 slots).</li>
      <li>Shared/static/badi files → CDN. Personal/private → seedha server.</li>
      <li>Rare conflict → optimistic (version). Hot item → pessimistic ya reservation hold with expiry.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['Har "A ya B" ka jawab ab requirements ke signals se aata hai, guess se nahi', 'Simple option (replica, monolith, LB, Sentinel, optimistic) pehle: kam moving parts', 'Hybrid jawab (feed, LB + gateway) dono duniya ka faayda dete hain'],
      costs: ['B side ke options (sharding, microservices, Cluster, pessimistic) zyada complex aur mehnge hain', 'Hybrid designs mein do raaste maintain karne padte hain (push + pull merge)', 'Signals waqt ke saath badalte hain: aaj ka sahi jawab 2 saal baad galat ho sakta hai'],
    },
    { type: 'think', questions: [
      { q: 'xyz.com pe username signup. Do log ek saath "riya" maangte hain. Card 2 aur card 8 dono ka jawab do.', a: 'Strong consistency: unique username double nahi hona chahiye. Locking: zyada tar usernames pe conflict rare hai, to sabse simple hai DB ka UNIQUE constraint (insert fail ho to "taken"). Ye ek tarah ka optimistic approach hai: lock nahi, conflict pe fail. Hold tabhi jab signup multi-step ho aur username minutes tak reserve karna ho.' },
      { q: 'Feed hybrid mein "celebrity" kise maanein? Threshold kaise chunoge?', a: 'Followers ki ek limit (jaise 10k-1 lakh) se upar wale authors pull. Threshold napkin maths se: fan-out workers kitne writes/sec kar sakte hain, aur post kitni der mein sab tak pahunchni chahiye. Followers ki limit cross karte hi author ko pull list mein daal do.' },
      { q: 'Live cricket score JSON: sab ke liye same, har 2 second badalta hai, 3 crore viewers. CDN ya direct?', a: 'CDN, 1-2 second TTL ke saath. Har edge second mein ek-do baar origin se laata hai, baaki crores requests edge se. Direct karte to origin pe ~1.5 crore requests/sec (3 crore ÷ 2 s). "Badalta hai" ka matlab "CDN nahi" nahi hai; "personalised" ka matlab hai.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'DB ka data 12 TB ho gaya aur badh raha hai. Kya karein?', options: ['Aur read replicas', 'Sharding', 'Bada cache'], answer: 1, explain: 'Har replica pe poora 12 TB hota hai. Size ek node se bahar → shard (aur har shard ki replicas).' },
      { q: 'Celebrity ke 5 crore followers. Unke posts ke liye sabse sahi?', options: ['Push to all followers', 'Pull at read time (hybrid ka hissa)', 'Har follower ko email'], answer: 1, explain: 'Ek post pe 5 crore writes = minutes ka backlog. Celebrity posts read time pe merge karo.' },
      { q: 'Profile settings update ke liye locking?', options: ['Optimistic version check', 'SELECT FOR UPDATE har read pe', 'Global lock'], answer: 0, explain: 'Conflicts rare hain. Version check sasta hai aur koi wait nahi.' },
      { q: 'API gateway aane ke baad kya LB hata sakte hain?', options: ['Haan, gateway sab karta hai', 'Nahi, aam taur pe dono hote hain: gateway entry pe, LB har service ki copies ke beech', 'LB hi gateway hai'], answer: 1, explain: 'Gateway auth/routing karta hai; har service ki identical copies mein traffic LB baantta hai.' },
    ]},
    { type: 'sources', items: [
      { title: 'Redis Cluster specification (hash slots)', publisher: 'Redis documentation', official: true, url: 'https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/', used: '16,384 hash slots, multi-key operations same slot ki keys tak, hash tags.' },
      { title: 'High availability with Redis Sentinel', publisher: 'Redis documentation', official: true, url: 'https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/', used: 'Sentinel monitoring aur automatic failover ka kaam.' },
      { title: 'Timelines at Scale (Raffi Krikorian, QCon 2012)', publisher: 'InfoQ', url: 'https://www.infoq.com/presentations/Twitter-Timeline-Scalability/', used: 'Twitter ka fan-out on write Redis timelines mein, aur high-follower accounts ke tweets read time pe merge. 2012-13 ka talk hai, purana.' },
      { title: 'PostgreSQL: Explicit locking (row-level locks, SELECT FOR UPDATE)', publisher: 'PostgreSQL documentation', official: true, url: 'https://www.postgresql.org/docs/current/explicit-locking.html', used: 'Pessimistic row lock ka behaviour.' },
    ]},
  ],
});
