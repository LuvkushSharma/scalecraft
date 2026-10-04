Lesson.register({
  id: 'coordination',
  title: 'Leader election, locks, Redis Sentinel',
  minutes: 34,
  summary: `Jab bahut saari machines saath kaam karti hain, to teen sawaal roz uthte hain: kaun zinda hai, leader kaun hai, aur lock kiske paas hai. Is lesson mein heartbeats, leader election, ZooKeeper/etcd, distributed locks + fencing tokens, gossip, Redis Sentinel, Redis Cluster, split brain aur quorums, sab ek hi kahani mein.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Socho ek class project mein 20 bachche hain, aur teacher ne kaha "koi ek board pe likh do". Agar sab ek saath likhne daudein, to board pe gadbad. Agar koi na likhe, to kaam ruka.<br>Servers ke saath bhi yahi hota hai. Unhe aapas mein tay karna padta hai: kaun zinda hai, boss (leader) kaun hai, aur abhi kaun likh sakta hai (lock).<br>Mushkil ye hai ki network kabhi kabhi toot-ta hai, aur koi server kabhi kabhi "so" jaata hai. Ye lesson sikhata hai ki in sab ke bawajood sab ek hi faisle pe kaise pahunchein.` },
    { type: 'h2', text: 'Problem: 20 servers, koi "boss" nahi' },
    { type: 'p', html: `xyz.com ab bada ho chuka hai. Load Balancer ke peeche 20 app servers hain, Redis cache hai, database ke replicas hain. Ab ek naya feature aaya: <strong>har raat 2 baje saare users ko "aaj ki top videos" wala email</strong>. Developer ne ek cron job likh diya aur deploy kar diya.` },
    { type: 'p', html: `Agli subah support team pareshaan: har user ko <strong>20 email</strong> mile. Kyun? Cron job har server pe chala. 20 servers, 20 baar. Kisi ko pata hi nahi tha ki "ye kaam sirf ek server karega".` },
    { type: 'p', html: `Yahi distributed systems ki asli mushkil hai. Ek machine pe sab aasaan tha. Bahut saari machines pe teen sawaal har jagah aate hain:` },
    { type: 'list', items: [
      '<strong>Kaun zinda hai?</strong> Server 7 jawab nahi de raha. Mara hai, ya bas slow hai? (failure detection)',
      '<strong>Leader kaun hai?</strong> Kuch kaam sirf ek machine ko karna chahiye. (leader election)',
      '<strong>Lock kiske paas hai?</strong> Do machines ek hi cheez ek saath na badlein. (distributed locks)',
    ]},
    { type: 'p', html: `In teeno ko milake <strong>coordination</strong> kehte hain. Aur inka goal ek hi hai: <strong>high availability</strong>. Koi machine gire, to system khud samjhe, khud sambhle, aur users ko pata bhi na chale.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Coordination', html: `<strong>Ye kya hai:</strong> kai machines ka aapas mein tay karna ki kaun kya karega. Jaise "aaj ka email sirf Server 3 bhejega".<br><strong>Kyun chahiye:</strong> 20 servers ko ek hi code chal raha hai. Bina coordination ke sab ek hi kaam 20 baar kar dete hain, ya ek hi data ek saath badal ke bigaad dete hain.<br><strong>Iske bina:</strong> 20 emails, double payments, corrupt reports.` },
    { type: 'callout', tone: 'term', title: 'Naya word: High availability (HA)', html: `<strong>Ye kya hai:</strong> system ka zyada se zyada time chalu rehna, chahe koi machine gir jaaye.<br><strong>Kyun chahiye:</strong> 20 machines mein roz kuch na kuch toot-ta hai. Har baar insaan ka wait nahi kar sakte.<br><strong>Iske bina:</strong> har crash pe outage, jab tak koi engineer jaag ke theek na kare.` },

    { type: 'h2', text: 'Heartbeats aur failure detection' },
    { type: 'callout', tone: 'term', title: 'Naya word: Heartbeat', html: `<strong>Ye kya hai:</strong> ek chhota sa "main zinda hoon" message, jo ek machine har thodi der (jaise har 1 second) mein doosri ko bhejti hai. Jaise phone pe har thodi der "haan, sun raha hoon" bolna.<br><strong>Kyun chahiye:</strong> doosri machines ko pata chale ki ye machine abhi kaam kar rahi hai.<br><strong>Iske bina:</strong> mari hui machine ko bhi requests jaati rahengi, aur koi uski jagah nahi lega.<br><strong>Example:</strong> Availability lesson mein standby Load Balancer yahi karta tha: active LB ki heartbeat band, to standby ne kaam sambhal liya.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Failure detector aur timeout', html: `<strong>Ye kya hai:</strong> failure detector wo hissa hai jo heartbeats dekh ke faisla karta hai "ye machine dead hai". Sabse simple niyam: <strong>timeout</strong>, yaani "itne second tak heartbeat nahi aayi, to dead maano".<br><strong>Kyun chahiye:</strong> isi faisle pe failover hota hai: naya leader, naya master.<br><strong>Iske bina:</strong> system kabhi nahi jaanega ki kuch toota hai.` },
    { type: 'p', html: `Sunne mein simple hai: "5 second tak heartbeat nahi aayi to dead". Lekin ek gehri problem hai: <strong>network pe "mara hua" aur "bahut slow" mein farak karna namumkin hai</strong>. Heartbeat late kyun aayi? Ho sakta hai:` },
    { type: 'list', items: [
      'Machine sach mein crash ho gayi.',
      'Machine zinda hai, lekin uska program ek <strong>GC pause</strong> mein atka hai. (GC = garbage collection: Java/Go jaisi languages beech beech mein bekaar memory saaf karti hain, aur us dauraan program kuch milliseconds se kuch seconds tak poora ruk sakta hai.)',
      'Network mein packet der se pahuncha ya kho gaya.',
      'Machine itni busy hai ki heartbeat bhejne ka time hi nahi mila.',
    ]},
    { type: 'p', html: `Isliye har failure detector ek <strong>timeout</strong> chunta hai, aur ye ek trade-off hai. Chhota timeout = crash jaldi pakdo, lekin zinda machines ko galti se "dead" bolo (<strong>false positive</strong>, yaani jhootha alarm). Lamba timeout = kam galtiyan, lekin asli crash pakadne mein der. Khud try karo:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<label>Timeout: <strong class="co-hb-tv"></strong> (itni der heartbeat na aaye to "dead")</label>
        <input class="co-hb-t" type="range" min="15" max="100" step="5" value="30">
        <div class="co-hb-strip" style="position:relative;height:34px;margin:12px 0 4px;background:var(--surface-2);border-radius:var(--r-sm);overflow:hidden"></div>
        <div style="display:flex;justify-content:space-between;font:12px var(--f-mono);color:var(--ink-3)"><span>0 min</span><span>5 min</span><span>10 min</span></div>
        <div class="stats">
          <div class="stat"><span>Jhoothe alarm (10 min mein)</span><strong class="co-hb-fa"></strong></div>
          <div class="stat"><span>Asli crash pakadne mein</span><strong class="co-hb-det"></strong></div>
          <div class="stat"><span>Sabse lamba normal gap</span><strong class="co-hb-max"></strong></div>
        </div>
        <div class="calc-note co-hb-note"></div>`;
      // Heartbeat every 1 s for 10 minutes. Seeded: small network jitter, some late packets,
      // and occasional sender pauses (GC / busy) of 1-6 s where nothing is sent.
      let seed = 2024;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      const arr = [];
      let t = 0;
      while (t < 600) {
        arr.push(t + 0.02 + rnd() * 0.1 + (rnd() < 0.03 ? 0.3 + rnd() * 0.9 : 0));
        t += 1;
        if (rnd() < 0.015) t += 1 + rnd() * 5;
      }
      arr.sort((a, b) => a - b);
      const gaps = [];
      for (let i = 1; i < arr.length; i++) gaps.push({ at: arr[i - 1], g: arr[i] - arr[i - 1] });
      const maxGap = Math.max(...gaps.map(x => x.g));
      const s = el.querySelector('.co-hb-t');
      const upd = () => {
        const T = Number(s.value) / 10;
        const bad = gaps.filter(x => x.g > T);
        el.querySelector('.co-hb-tv').textContent = T.toFixed(1) + ' s';
        el.querySelector('.co-hb-fa').textContent = String(bad.length);
        el.querySelector('.co-hb-det').textContent = '~' + T.toFixed(1) + ' s';
        el.querySelector('.co-hb-max').textContent = maxGap.toFixed(1) + ' s';
        el.querySelector('.co-hb-strip').innerHTML = gaps.filter(x => x.g > 1.6).map(x => {
          const isBad = x.g > T;
          return `<div title="gap ${x.g.toFixed(1)} s" style="position:absolute;top:${isBad ? 3 : 11}px;bottom:${isBad ? 3 : 11}px;left:${(x.at / 600 * 100).toFixed(2)}%;width:${Math.max(0.5, x.g / 600 * 100).toFixed(2)}%;background:${isBad ? 'var(--red)' : 'var(--amber)'};border-radius:2px"></div>`;
        }).join('');
        el.querySelector('.co-hb-note').textContent = bad.length > 5
          ? 'Bahut jhoothe alarm. Har alarm pe failover hoga: leader badlega, connections tootenge, bina wajah hungama. Lal patti = galat "dead" faisla.'
          : bad.length > 0
            ? 'Kuch jhoothe alarm abhi bhi. Machine bas atki thi, mari nahi thi. Lal patti = galat "dead" faisla, peeli = lamba gap jo timeout ke andar raha.'
            : 'Zero jhoothe alarm, lekin asli crash ke baad itni der tak system "zinda" samajhta rahega aur requests waste hongi. Koi perfect timeout nahi hota.';
      };
      s.addEventListener('input', upd); upd();
    }},
    { type: 'p', html: `Simulator mein 10 minute ke heartbeats hain, kabhi kabhi machine 1-6 second ke liye atak jaati hai. 1.5 s timeout pe 21 jhoothe alarm aate hain, 7 s pe zero, lekin tab asli crash pakadne mein bhi ~7 s lagte hain. Real systems isi liye timeout ko network aur workload dekh ke tune karte hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Phi accrual failure detector', html: `<strong>Ye kya hai:</strong> fixed timeout ki jagah ek smarter detector. Ye "dead ya alive" nahi bolta. Ye ek <strong>shak ka number</strong> (phi, φ) deta hai: "itni der ki chuppi, is machine ke <em>normal</em> pattern ke hisaab se, kitni ajeeb hai?" Number threshold se upar gaya, tab "dead".<br><strong>Kyun chahiye:</strong> har machine aur har network alag hai. Ek machine har 1 s pe heartbeat bhejti hai, doosri (door ke data center mein) aam taur pe 3 s pe. Ek hi fixed timeout dono ke liye galat hoga. Phi khud seekh leta hai ki kiska "normal" kya hai.<br><strong>Iske bina:</strong> ya to door wali machine pe roz jhoothe alarm, ya paas wali ka crash der se pakda jaayega.<br><strong>Kahan:</strong> Cassandra (setting <code>phi_convict_threshold</code>, default 8) aur Akka. Idea 2004 ke Hayashibara paper se aaya.` },
    { type: 'p', html: `<strong>Cassandra ka simple formula:</strong> pichhle heartbeats ke beech ka <strong>average gap</strong> yaad rakho. Phir:` },
    { type: 'code', text: `φ = (aakhri heartbeat se ab tak ka time ÷ average gap) × 0.434      (0.434 = 1 / ln 10)

Example, threshold 8:
  Machine P: average gap 1 s.  "dead" tab jab chuppi > 8 ÷ 0.434 × 1 s ≈ 18.4 s
  Machine Q: average gap 3 s.  "dead" tab jab chuppi > 8 ÷ 0.434 × 3 s ≈ 55 s
Same threshold, lekin har machine ka apna "kitni der bahut zyada hai".` },
    { type: 'p', html: `Phi ka matlab samjho: φ = 1 matlab "itni chuppi 10 mein 1 baar normal hai", φ = 2 = "100 mein 1", φ = 8 = "10 crore mein 1". Chuppi time slider se badhao aur dekho dono machines ka shak kaise badhta hai:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Aakhri heartbeat se chuppi: <strong class="co-phi-tv"></strong></label><input class="co-phi-t" type="range" min="0" max="70" step="1" value="10"></div>
          <div><label>Threshold (phi_convict_threshold): <strong class="co-phi-hv"></strong></label><input class="co-phi-h" type="range" min="1" max="16" step="1" value="8"></div>
        </div>
        <div class="co-phi-rows" style="margin-top:12px;display:grid;gap:10px"></div>
        <div class="calc-note co-phi-note"></div>`;
      const M = [['Machine P (paas, har ~1 s)', 1], ['Machine Q (door, har ~3 s)', 3]];
      const tE = el.querySelector('.co-phi-t'), hE = el.querySelector('.co-phi-h');
      const phi = (t, mean) => t / mean / Math.LN10;
      const upd = () => {
        const t = +tE.value, th = +hE.value;
        el.querySelector('.co-phi-tv').textContent = t + ' s';
        el.querySelector('.co-phi-hv').textContent = th;
        el.querySelector('.co-phi-rows').innerHTML = M.map(([name, mean]) => {
          const v = phi(t, mean), dead = v > th, w = Math.min(100, v / 16 * 100);
          return `<div><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;font-size:14px"><span>${name}</span><strong style="color:${dead ? 'var(--red)' : 'var(--green)'}">φ = ${v.toFixed(1)} · ${dead ? 'DEAD maana' : 'zinda maana'}</strong></div>
            <div style="position:relative;height:14px;background:var(--surface-2);border-radius:var(--r-sm);margin-top:4px;overflow:hidden"><div style="height:100%;width:${w.toFixed(1)}%;background:${dead ? 'var(--red)' : 'var(--accent)'}"></div><div style="position:absolute;top:0;bottom:0;left:calc(${(th / 16 * 100).toFixed(1)}% - 1px);width:2px;background:var(--ink)"></div></div>
            <div style="font-size:13px;color:var(--ink-3);margin-top:2px">is threshold pe "dead" tab: chuppi > ${(th * Math.LN10 * mean).toFixed(1)} s</div></div>`;
        }).join('');
        el.querySelector('.co-phi-note').textContent = `Kaali line = threshold. Same chuppi (${t} s) pe P ka shak Q se 3 guna hai, kyunki P aam taur pe 3 guna jaldi bolti hai. Threshold kam karo: crash jaldi pakdoge, lekin jhoothe alarm badhenge. Badhao: ulta.`;
      };
      tE.addEventListener('input', upd); hE.addEventListener('input', upd); upd();
    }},

    { type: 'h2', text: 'Leader election: ek hi boss kyun?' },
    { type: 'p', html: `Wapas email wale bug pe. Fix: 20 servers mein se <strong>ek leader</strong> chuno. Sirf leader cron job chalayega.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Leader election', html: `<strong>Ye kya hai:</strong> machines ka milke ek "boss" chunna, aur boss gire to naya chunna. Baaki machines <strong>followers</strong> kehlati hain.<br><strong>Kyun chahiye:</strong> kuch kaam sirf ek hi machine ko karna chahiye, aur sabko pata hona chahiye ki wo kaun hai.<br><strong>Iske bina:</strong> ya to koi kaam nahi karega, ya sab karenge (20 emails).<br><strong>Example:</strong> neeche etcd ke saath 3 workers mein se ek leader banta hai, aur uske crash pe ~10-15 s mein naya.` },
    { type: 'p', html: `Leader kaam ka hai jab:` },
    { type: 'list', items: [
      '<strong>Ek hi baar hone wala kaam</strong>: daily email, billing run, cleanup job.',
      '<strong>Ek hi writer</strong>: database replication mein saare writes ek primary pe jaate hain taaki order ek rahe.',
      '<strong>Decisions ek jagah</strong>: kaun sa shard kis server pe, kaun sa partition kaun sa consumer padhega.',
    ]},
    { type: 'p', html: `Naive tareeka: "sabse chhote ID wala server leader". Problem: agar network do hisson mein toot gaya, to dono hisson ko lagega ki doosra hissa mar gaya, aur <strong>dono apna leader chun lenge</strong>. Do leaders = do baar email, ya do log alag alag data likh rahe. Isko <strong>split brain</strong> kehte hain (neeche detail mein).` },
    { type: 'p', html: `Sahi tareeka: leader tab hi leader hai jab <strong>majority</strong> (aadhe se zyada) machines ne use maana ho. Do alag majorities ho hi nahi sakti (5 mein se 3 aur 3 mein kam se kam ek common hoga), isliye ek time pe ek hi leader. Isko <strong>consensus</strong> kehte hain: kai machines ka ek hi faisle pe pakka agree karna, chahe kuch machines giri hon. <strong>Raft</strong> ek mashhoor consensus algorithm hai. Isme har election ka ek number (term) hota hai, har machine ek term mein ek hi vote deti hai, aur majority vote wala leader banta hai. Raft ki poori kahani (log replication, terms) aage "Consensus" lesson mein hai.` },
    { type: 'callout', tone: 'tip', html: `Practical baat: apne app ke andar Raft khud mat likho. Ek ready-made coordination service use karo jo andar Raft/consensus chalati hai: <strong>etcd</strong> ya <strong>ZooKeeper</strong>. Tumhara app bas usse poochhta hai "kya main leader ban sakta hoon?"` },

    { type: 'h2', text: 'ZooKeeper aur etcd' },
    { type: 'callout', tone: 'term', title: 'Naya word: Coordination service (ZooKeeper, etcd)', html: `<strong>Ye kya hai:</strong> ek chhota, bahut bharosemand key-value store (naam → value wali diary), jo 3 ya 5 machines pe chalta hai aur andar consensus use karta hai (ZooKeeper ka protocol ZAB, etcd ka Raft). <strong>ZooKeeper</strong> Apache ka hai, <strong>etcd</strong> CNCF ka.<br><strong>Kyun chahiye:</strong> "kaun leader hai", "config kya hai", "kaun sa server zinda hai" jaise chhote lekin <em>bahut important</em> facts ek aisi jagah rakhne hain jo ek machine girne pe bhi sahi jawab de.<br><strong>Iske bina:</strong> har app ko khud Raft likhna padta, jo bahut mushkil aur bug-prone hai.<br><strong>Dhyan:</strong> ye bade data ke liye nahi hain. Example: Kubernetes apni poori cluster state etcd mein rakhta hai.` },
    { type: 'p', html: `Inke teen superpowers leader election aur locks ko aasaan banate hain. Teen naye shabd: <strong>lease</strong> = TTL (expiry time) wala "kiraya", jise client baar baar renew karta hai; <strong>watch</strong> = "is key pe kuch badle to mujhe batao" wali ghanti; <strong>revision</strong> = har badlav pe badhne wala number.` },
    { type: 'table', head: ['Feature', 'ZooKeeper mein', 'etcd mein', 'Kaam kya aata hai'], rows: [
      ['Auto-delete jab client mare', '<strong>Ephemeral znode</strong>: session khatam to node delete', '<strong>Lease</strong>: TTL wala; client keepalive bhejta rahe, ruk gaya to lease expire aur uski keys delete', 'Leader mara to uska "main leader hoon" record khud gayab'],
      ['Badlav ki khabar', '<strong>Watch</strong>: classic watch ek baar fire hoti hai (3.6+ mein persistent watches bhi)', '<strong>Watch</strong>: key ya prefix pe changes ki stream', 'Followers ko turant pata chale ki leader gaya'],
      ['Badhta hua number', '<strong>Sequential znode</strong> (lock-0000000007), zxid / version', '<strong>Revision</strong>: har change pe 64-bit cluster-wide counter badhta hai', 'Kaun pehle aaya, aur fencing tokens (neeche)'],
    ]},
    { type: 'p', html: `Leader election ka recipe etcd mein: har worker ek hi key <code>/xyz/email-leader</code> banane ki koshish karta hai, "sirf tab banao jab pehle se na ho" condition ke saath, apni lease attach karke. Jo pehle bana le wo leader. Baaki us key pe watch laga ke baith jaate hain. Chala ke dekho:` },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'w1', label: 'Worker 1', sub: 'app server', x: 110, y: 60, kind: 'server', info: 'Ye kya hai: xyz.com ka ek app server. Ye etcd mein leader key banane ki koshish karta hai. Leader bana to har kuch seconds mein lease keepalive bhejta hai.' },
        { id: 'w2', label: 'Worker 2', sub: 'app server', x: 110, y: 170, kind: 'server', info: 'Ye kya hai: doosra app server. Leader nahi bana to leader key pe watch lagata hai, taaki key delete hote hi khabar mile.' },
        { id: 'w3', label: 'Worker 3', sub: 'app server', x: 110, y: 280, kind: 'server', info: 'Ye kya hai: teesra app server. Same: follower ban ke watch karta hai.' },
        { id: 'etcd', label: 'etcd cluster', sub: '3 nodes, Raft', x: 400, y: 170, w: 170, kind: 'data', info: 'Ye kya hai: coordination service, 3 machines ka. Kyun: leader kaun hai, ye ek bharosemand jagah likha ho. Andar 3 machines Raft se har write pe majority agreement leti hain, isliye ek machine gire to bhi sahi jawab deta hai. Leases ka TTL track karta hai aur watches pe events bhejta hai.' },
        { id: 'mail', label: 'Email service', sub: 'nightly digest', x: 630, y: 60, w: 150, kind: 'queue', info: 'Ye kya hai: raat ka digest email bhejne wali service. Sirf leader ko ise call karna chahiye, warna users ko duplicate email jayenge.' },
      ],
      edges: [{ a: 'w1', b: 'etcd' }, { a: 'w2', b: 'etcd' }, { a: 'w3', b: 'etcd' }, { a: 'w1', b: 'mail' }, { a: 'w2', b: 'mail' }],
      scenarios: [
        { name: 'Election (happy path)', steps: [
          { title: 'Teeno leader banna chahte hain', text: 'Teeno workers ek saath etcd se kehte hain: "<code>/xyz/email-leader</code> key mere naam se bana do, agar pehle se nahi hai". Har ek ke paas 10 second TTL wali lease hai.', parallel: true, go: ['w1>etcd', 'w2>etcd', 'w3>etcd'], msg: 'TXN  if create_revision(/xyz/email-leader) == 0\n     then PUT /xyz/email-leader = "worker-1"  (lease 10s)' },
          { title: 'Sirf ek jeetta hai', text: 'etcd saari requests ek order mein lagata hai. Worker 1 ki request pehle lagi, key ban gayi. Baaki do ki condition fail: key pehle se hai.', parallel: true, go: ['res:etcd>w1', 'bad:etcd>w2', 'bad:etcd>w3'], after: { w1: { state: 'ok', sub: 'LEADER' }, w2: { sub: 'follower, watching' }, w3: { sub: 'follower, watching' } } },
          { title: 'Leader zinda rehne ka saboot deta hai', text: 'Leader har ~3 second mein lease keepalive bhejta hai. Jab tak keepalive aata rahe, lease aur key zinda.', go: 'evt:w1>etcd', msg: 'LeaseKeepAlive(lease=7a1f)  → TTL reset to 10s' },
          { title: 'Sirf leader kaam karta hai', text: 'Raat 2 baje sirf Worker 1 digest bhejta hai. Har user ko ek email. Bug fixed.', go: 'w1>mail', msg: 'POST /send-digest  (once)' },
        ]},
        { name: 'Leader crash', steps: [
          { title: 'Worker 1 crash', text: 'Leader ki machine gir gayi.', set: { w1: { state: 'down', sub: 'CRASHED' } }, focus: ['w1'] },
          { title: 'Keepalive band', text: 'Ab koi keepalive nahi aa raha. etcd ko pata nahi ki machine mari hai ya slow hai, wo bas TTL ginta hai.', go: 'lost:w1>etcd', after: { etcd: { sub: 'lease TTL: 3..2..1' } } },
          { title: 'Lease expire, key delete', text: '10 second baad lease expire. etcd leader key apne aap delete kar deta hai, aur jo watch kar rahe the unhe event bhejta hai.', parallel: true, go: ['evt:etcd>w2', 'evt:etcd>w3'], after: { etcd: { sub: 'key deleted' } }, msg: 'WATCH event: DELETE /xyz/email-leader' },
          { title: 'Naya election', text: 'Dono followers phir se key banane ki koshish karte hain. Worker 2 jeet gaya.', parallel: true, go: ['w2>etcd', 'w3>etcd'], after: { w2: { state: 'ok', sub: 'NEW LEADER' } } },
          { title: 'Kaam chalu', text: 'Kisi insaan ne kuch nahi kiya. ~10-15 second mein naya leader. Ye automatic failover hai.', go: 'w2>mail' },
        ]},
        { name: 'Leader atak gaya (GC pause)', intro: 'Sabse khatarnaak case: leader mara nahi, bas 15 second ke liye ruk gaya.', steps: [
          { title: 'Worker 1 ruk gaya', text: 'Worker 1 leader hai aur digest bhejna shuru hi karne wala tha, tabhi uske program mein lamba GC pause aa gaya. Wo zinda hai, bas jam hai.', set: { w1: { state: 'warn', sub: 'leader, GC pause' } }, focus: ['w1'] },
          { title: 'Lease expire', text: 'Pause ke dauraan keepalive nahi gaya. 10 second baad etcd ne lease khatam ki aur followers ko bataya.', go: ['lost:w1>etcd', 'evt:etcd>w2'], after: { etcd: { sub: 'key deleted' } } },
          { title: 'Worker 2 naya leader', text: 'Worker 2 leader bana aur digest bhej diya.', go: ['w2>etcd', 'w2>mail'], after: { w2: { state: 'ok', sub: 'NEW LEADER' } } },
          { title: 'Worker 1 jaagta hai, purani soch ke saath', text: 'Pause khatam. Worker 1 ke dimaag mein abhi bhi "main leader hoon" hai, kyunki pause ke beech use kuch pata hi nahi chala. Wo bhi digest bhej deta hai. <strong>Do leaders, duplicate emails.</strong>', go: 'w1>mail', after: { mail: { state: 'hot', sub: 'DUPLICATE!' } } },
          { title: 'Seekh', text: 'Lease "sirf ek leader" ki garantee nahi deti, kyunki purana leader ko pata nahi chalta ki wo ab leader nahi raha. Fix: jis cheez pe kaam ho raha hai wo khud check kare ki request current leader ki hai. Iska tareeka fencing token hai, agla section.', focus: ['w1', 'w2'] },
        ]},
      ],
    },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion', html: `"etcd/ZooKeeper use kar liya, to ab ek time pe ek hi leader pakka." Nahi. Coordination service ke <em>andar</em> sab consistent hai, lekin tumhara app server pause ho sakta hai, aur use pata nahi chalega ki uski lease kab expire hui. Isliye kaam ke time pe bhi check chahiye (fencing).` },

    { type: 'h2', text: 'Distributed locks aur fencing tokens' },
    { type: 'p', html: `Naya problem: xyz.com pe creators ka monthly earning report ek shared file/row mein banta hai. Do workers ek saath likhenge to report kharab. Chahiye ek <strong>lock</strong>: jiske paas lock, wahi likhe.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Distributed lock', html: `<strong>Ye kya hai:</strong> ek "chaabi" jo ek time pe sirf ek machine ke paas ho sakti hai. Jiske paas chaabi, wahi shared cheez badle. Ek program ke andar ye lock (mutex) memory mein hota hai; distributed lock alag alag machines ke beech kaam karta hai, isliye ek shared jagah rakha jaata hai: Redis, etcd ya ZooKeeper.<br><strong>Kyun chahiye:</strong> do workers ek hi report ek saath likhein to report kharab.<br><strong>Iske bina:</strong> race condition: dono padhte, dono likhte, ek ka kaam gayab.<br><strong>Example:</strong> Redis mein <code>SET lock:report worker-A NX PX 30000</code> = "key tabhi banao jab na ho (NX), aur 30,000 ms baad khud mita do (PX)".` },
    { type: 'p', html: `<strong>TTL kyun?</strong> Agar lock lene wala crash ho gaya aur lock kabhi chhoota hi nahi, to sab hamesha ke liye ruk jaayenge. TTL ke baad lock apne aap free. Lekin TTL ek nayi problem laata hai: agar holder mara nahi, bas <strong>TTL se zyada der ruk gaya</strong>? Yahi Martin Kleppmann ka famous example hai. Teeno scenarios chalao, khaas kar teesra:` },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'A', label: 'Worker A', x: 100, y: 60, w: 140, kind: 'server', info: 'Ye kya hai: pehla worker (app server). Lock leta hai, phir storage mein likhta hai. Har write ke saath apna fencing token bhejta hai.' },
        { id: 'B', label: 'Worker B', x: 100, y: 270, w: 140, kind: 'server', info: 'Ye kya hai: doosra worker. Lock free hone ka wait karta hai.' },
        { id: 'lock', label: 'Lock service', sub: 'etcd / ZooKeeper', x: 360, y: 165, w: 150, kind: 'data', info: 'Ye kya hai: wo service jo lock deti hai. Lock deta hai TTL (lease) ke saath. Har baar lock dene pe ek badhta hua number bhi deta hai: fencing token. etcd mein ye key ka revision ho sakta hai, ZooKeeper mein zxid ya znode version.' },
        { id: 'store', label: 'Storage', sub: 'earnings report', x: 620, y: 165, w: 150, kind: 'data', meter: false, info: 'Ye kya hai: database/file jahan asli data likha jaata hai. Fencing ke saath ye yaad rakhta hai ki ab tak ka sabse bada token kaunsa dekha, aur usse chhote token wali write reject kar deta hai.' },
      ],
      edges: [{ a: 'A', b: 'lock' }, { a: 'B', b: 'lock' }, { a: 'A', b: 'store' }, { a: 'B', b: 'store' }],
      scenarios: [
        { name: 'Happy path', steps: [
          { title: 'A lock leta hai', text: 'Worker A lock maangta hai. Lock free hai, mil gaya, 30 s TTL ke saath. Saath mein token 33.', go: ['A>lock', 'res:lock>A'], after: { A: { state: 'ok', sub: 'lock, token 33' }, lock: { sub: 'held by A (33)' } }, msg: 'acquire("report")  →  OK, token = 33, ttl = 30s' },
          { title: 'B ko wait', text: 'Worker B bhi maangta hai. Lock busy hai, B intezaar karta hai.', go: ['B>lock', 'bad:lock>B'], after: { B: { sub: 'waiting' } } },
          { title: 'A likhta hai', text: 'A report likhta hai, token ke saath. Storage note karta hai: sabse bada token ab 33.', go: ['A>store', 'res:store>A'], after: { store: { sub: 'last token = 33' } }, msg: 'WRITE report  (token=33)  → OK' },
          { title: 'A lock chhodta hai', text: 'Kaam khatam, A lock release karta hai. Release mein check hota hai ki lock abhi bhi A ka hi hai (kisi aur ka lock galti se na chhoote).', go: 'A>lock', after: { A: { state: '', sub: 'done' }, lock: { sub: 'free' } } },
        ]},
        { name: 'GC pause, bina fencing', intro: 'Sirf TTL wala lock, storage koi check nahi karta.', steps: [
          { title: 'A ke paas lock', text: 'A ne lock liya (token 33, TTL 30 s).', go: ['A>lock', 'res:lock>A'], after: { A: { state: 'ok', sub: 'lock, token 33' }, lock: { sub: 'held by A' } } },
          { title: 'A atak gaya', text: 'Likhne se theek pehle A ka process 40 second ke GC pause mein chala gaya. Use koi khabar nahi ki ghadi chal rahi hai.', set: { A: { state: 'warn', sub: 'GC pause 40s' } }, focus: ['A'] },
          { title: 'Lock expire', text: '30 s poore. Lock service ke hisaab se A ka lock khatam.', focus: ['lock'], set: { lock: { state: 'warn', sub: 'TTL expired, free' } } },
          { title: 'B lock leta hai aur likhta hai', text: 'B ko lock mil gaya (token 34). B naya, sahi report likhta hai.', go: ['B>lock', 'res:lock>B', 'B>store'], after: { lock: { state: '', sub: 'held by B' }, B: { state: 'ok', sub: 'lock, token 34' }, store: { sub: 'B ka data' } } },
          { title: 'A jaagta hai aur likh deta hai', text: 'A ko lagta hai lock abhi bhi uske paas hai. Wo apna purana data likh deta hai, B ka kaam overwrite. <strong>Report corrupt</strong>, aur kisi ko error bhi nahi dikha.', go: 'A>store', after: { A: { state: '', sub: 'thinks it has lock' }, store: { state: 'down', sub: 'CORRUPTED' } }, msg: 'WRITE report  (from A, stale)  → OK  (!!)' },
        ]},
        { name: 'GC pause + fencing token', intro: 'Same kahani, lekin storage har write ka token check karta hai.', steps: [
          { title: 'A ke paas lock, token 33', text: 'Lock ke saath badhta hua number mila: 33.', go: ['A>lock', 'res:lock>A'], after: { A: { state: 'ok', sub: 'lock, token 33' }, lock: { sub: 'held by A (33)' } } },
          { title: 'A atak gaya, lock expire', text: 'Wahi 40 s ka GC pause. 30 s baad lock free.', set: { A: { state: 'warn', sub: 'GC pause 40s' }, lock: { state: 'warn', sub: 'TTL expired' } }, focus: ['A', 'lock'] },
          { title: 'B ko token 34', text: 'B ne lock liya. Naya token hamesha pichhle se bada: 34.', go: ['B>lock', 'res:lock>B'], after: { lock: { state: '', sub: 'held by B (34)' }, B: { state: 'ok', sub: 'lock, token 34' } } },
          { title: 'B likhta hai token 34 ke saath', text: 'Storage token dekhta hai: 34 > 33, accept. Ab yaad rakhta hai: sabse bada 34.', go: ['B>store', 'res:store>B'], after: { store: { state: 'ok', sub: 'last token = 34' } }, msg: 'WRITE report  (token=34)  → OK' },
          { title: 'A ki purani write REJECT', text: 'A jaag ke token 33 ke saath likhta hai. Storage: "maine 34 dekh liya hai, 33 purana hai." Write reject. Data safe. A ko error milta hai aur wo samajh jaata hai ki uska lock gaya.', go: ['A>store', 'bad:store>A'], after: { A: { state: 'down', sub: 'rejected: stale token' } }, msg: 'WRITE report  (token=33)  → REJECTED: token 33 < 34' },
        ]},
      ],
    },
    { type: 'callout', tone: 'term', title: 'Naya word: Fencing token', html: `<strong>Ye kya hai:</strong> lock ke saath milne wala ek <strong>hamesha badhta hua number</strong> (33, phir 34, phir 35...). Client har write ke saath ye number bhejta hai. Storage sabse bada dekha hua number yaad rakhta hai aur usse chhote number wali write reject karta hai.<br><strong>Kyun chahiye:</strong> TTL wala lock "purane holder" ko nahi rok sakta jo so ke jaaga aur sochta hai lock abhi bhi uska hai.<br><strong>Iske bina:</strong> upar wala "GC pause, bina fencing" scenario: report chupchaap corrupt.<br><strong>Example:</strong> A ke paas token 33, B ke paas 34. Storage ne 34 dekh liya, to A ki 33 wali write reject.` },
    { type: 'p', html: `Khud timing badal ke dekho. A ko lock 0 s pe milta hai (token 33) aur wo 2 s pe likhne wala hai, lekin beech mein pause aa jaata hai. B lock ka intezaar kar raha hai aur lock milte hi 1 s mein likhta hai (token 34):` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Lock TTL: <strong class="co-f-tv"></strong></label><input class="co-f-t" type="range" min="5" max="60" step="5" value="30"></div>
          <div><label>A ka GC pause: <strong class="co-f-pv"></strong></label><input class="co-f-p" type="range" min="0" max="60" step="2" value="40"></div>
        </div>
        <label style="display:flex;gap:8px;align-items:center;margin-top:10px"><input type="checkbox" class="co-f-fen" checked> Storage fencing token check karta hai</label>
        <div class="co-f-tl" style="margin-top:10px;font:14px/1.7 var(--f-mono)"></div>
        <div class="stats"><div class="stat"><span>Report ka haal</span><strong class="co-f-res"></strong></div></div>`;
      const tE = el.querySelector('.co-f-t'), pE = el.querySelector('.co-f-p'), fE = el.querySelector('.co-f-fen');
      const upd = () => {
        const ttl = +tE.value, pause = +pE.value, fen = fE.checked, aw = 2 + pause, lines = [];
        el.querySelector('.co-f-tv').textContent = ttl + ' s'; el.querySelector('.co-f-pv').textContent = pause + ' s';
        lines.push('0 s: A ko lock, token 33');
        let res, col;
        if (aw < ttl) { lines.push(`${aw} s: A likhta hai (token 33) → OK`, `${aw} s: A lock chhodta hai, B ko lock (token 34)`); res = 'Sahi'; col = 'var(--green)'; }
        else {
          const bw = ttl + 1;
          lines.push(`${ttl} s: TTL khatam, B ko lock (token 34)`);
          const ev = [[bw, 'B likhta hai (token 34) → OK'], [aw, null]].sort((x, y) => x[0] - y[0] || (x[1] ? -1 : 1));
          let maxTok = 33, last = '';
          ev.forEach(([t, txt]) => {
            if (txt) { lines.push(`${t} s: ${txt}`); maxTok = 34; last = 'B'; }
            else if (fen && maxTok > 33) lines.push(`${t} s: A jaag ke likhta hai (token 33) → REJECT, 33 < 34`);
            else { lines.push(`${t} s: A jaag ke likhta hai (token 33) → OK`); last = 'A'; }
          });
          if (last === 'A') { res = 'CORRUPT (A ka purana data)'; col = 'var(--red)'; } else { res = fen && aw > bw ? 'Sahi (fencing ne bachaya)' : 'Sahi (B ka data aakhri)'; col = 'var(--green)'; }
        }
        el.querySelector('.co-f-tl').innerHTML = lines.map(x => '• ' + x).join('<br>');
        const r = el.querySelector('.co-f-res'); r.textContent = res; r.style.color = col;
      };
      [tE, pE].forEach(x => x.addEventListener('input', upd)); fE.addEventListener('change', upd); upd();
    }},
    { type: 'callout', tone: 'tip', title: 'Ye try karo', html: `Default (TTL 30 s, pause 40 s, fencing on): A ki write reject, report sahi. Ab fencing ka checkbox hatao: report <strong>CORRUPT</strong>. Phir TTL 60 s karo: pause (40 s) TTL ke andar, sab sahi. Lekin pause 60 s karo, problem wapas. Seekh: TTL badhane se problem sirf door hoti hai, khatam nahi. Fencing hi asli fix hai.` },
    { type: 'p', html: `Do zaroori baatein:` },
    { type: 'list', items: [
      '<strong>Fencing ke liye storage ka saath chahiye.</strong> Agar storage token check hi nahi kar sakta (jaise koi purani external API), to fencing kaam nahi karegi. Tab conditional writes (version check) jaise doosre tareeke dhoondhne padte hain.',
      '<strong>Token kahan se aaye?</strong> ZooKeeper ka zxid/znode version aur etcd ka revision naturally badhte hain, isliye ye seedhe token ban jaate hain. Ek simple Redis <code>SET NX</code> lock aisa number nahi deta; Redis ke multi-node "Redlock" algorithm pe isi wajah se Kleppmann aur Redis ke creator ke beech mashhoor bahas hui thi.',
    ]},
    { type: 'callout', tone: 'why', title: 'Efficiency lock vs correctness lock', html: `Kleppmann ka useful farak: agar lock sirf <strong>efficiency</strong> ke liye hai (do workers ek hi thumbnail do baar na banayein; galti hui to bas thoda kaam waste), to simple Redis lock kaafi hai. Agar lock <strong>correctness</strong> ke liye hai (paisa, inventory, data corruption), to consensus wali service (etcd/ZooKeeper) + fencing tokens use karo.` },

    { type: 'h2', text: 'Gossip: bina boss ke khabar phailana' },
    { type: 'p', html: `Heartbeats ka ek problem: agar 1,000 nodes hain aur har node har doosre ko heartbeat bheje, to har second ~10 lakh messages. Ek central "monitor" rakho to wo SPOF aur bottleneck. Tisra raasta: <strong>gossip</strong>.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Gossip protocol', html: `<strong>Ye kya hai:</strong> har node har round (jaise har second) kuch <strong>random</strong> nodes ko chunta hai aur unke saath apni jaankari exchange karta hai: "mujhe pata hai ki node 17 zinda hai (heartbeat no. 902), node 40 ne 3 rounds se kuch nahi bola". Jaise school mein afwaah phailti hai: har koi do-teen logon ko batata hai, aur thode hi rounds mein poore school ko pata.<br><strong>Kyun chahiye:</strong> 1,000 nodes mein "sab sabko ping" = har second ~10 lakh messages. Gossip mein har node ka kaam chhota aur fixed.<br><strong>Iske bina:</strong> ya to messages ka toofan, ya ek central monitor jo khud SPOF aur bottleneck.<br><strong>Example:</strong> neeche simulator mein 1,000 nodes, fanout 1: ~18 rounds mein sabko khabar.` },
    { type: 'p', html: `Kitne rounds lagte hain? Khud chala ke dekho. Ek node ke paas nayi khabar hai (jaise "node 7 down hai"). Har round mein jo jaanta hai wo <em>fanout</em> jitne random nodes ko batata hai:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><span style="font-size:14px;color:var(--ink-2)">Nodes:</span><span class="co-g-n" style="display:flex;flex-wrap:wrap;gap:6px"></span></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px"><span style="font-size:14px;color:var(--ink-2)">Fanout (har round kitno ko batao):</span><span class="co-g-k" style="display:flex;flex-wrap:wrap;gap:6px"></span></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px"><button type="button" class="btn small primary co-g-step">Next round</button><button type="button" class="btn small ghost co-g-all">Poora chalao</button><button type="button" class="btn small ghost co-g-reset">Reset</button></div>
        <div class="co-g-grid" style="display:flex;flex-wrap:wrap;gap:2px;margin:14px 0;max-width:100%"></div>
        <div class="stats">
          <div class="stat"><span>Round</span><strong class="co-g-r"></strong></div>
          <div class="stat"><span>Jinko pata hai</span><strong class="co-g-c"></strong></div>
          <div class="stat"><span>Messages bheje</span><strong class="co-g-m"></strong></div>
          <div class="stat"><span>log₂(N)</span><strong class="co-g-l"></strong></div>
        </div>
        <div class="calc-note co-g-note"></div>`;
      let N = 100, K = 1, seed, known, round, msgs, newly;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      const reset = () => { seed = 7; known = new Array(N).fill(-1); known[0] = 0; round = 0; msgs = 0; newly = [0]; draw(); };
      const step = () => {
        if (known.every(x => x >= 0)) return false;
        round++;
        newly = [];
        const informed = [];
        for (let i = 0; i < N; i++) if (known[i] >= 0 && known[i] < round) informed.push(i);
        informed.forEach(i => { for (let j = 0; j < K; j++) { let t; do { t = Math.floor(rnd() * N); } while (t === i); msgs++; if (known[t] < 0) { known[t] = round; newly.push(t); } } });
        return true;
      };
      const chips = (sel, vals, get, set) => {
        const box = el.querySelector(sel); box.innerHTML = '';
        vals.forEach(v => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (get() === v ? ' on' : ''); b.textContent = v; b.onclick = () => { set(v); reset(); }; box.appendChild(b); });
      };
      const draw = () => {
        chips('.co-g-n', [10, 50, 100, 500, 1000], () => N, v => N = v);
        chips('.co-g-k', [1, 2, 3], () => K, v => K = v);
        const sz = N <= 100 ? 14 : N <= 500 ? 8 : 6;
        el.querySelector('.co-g-grid').innerHTML = known.map(r => `<span style="width:${sz}px;height:${sz}px;border-radius:2px;background:${r < 0 ? 'var(--surface-2)' : r === round && round > 0 ? 'var(--amber)' : 'var(--accent)'};border:1px solid var(--line)"></span>`).join('');
        const c = known.filter(x => x >= 0).length;
        el.querySelector('.co-g-r').textContent = String(round);
        el.querySelector('.co-g-c').textContent = c + ' / ' + N;
        el.querySelector('.co-g-m').textContent = msgs.toLocaleString('en-IN');
        el.querySelector('.co-g-l').textContent = Math.log2(N).toFixed(1);
        el.querySelector('.co-g-note').textContent = c === N
          ? `Sabko ${round} rounds mein pata chal gaya, ${msgs.toLocaleString('en-IN')} messages mein. Dhyaan do: shuru mein khabar har round double hoti hai, aur aakhri kuch nodes tak pahunchne mein sabse zyada rounds lagte hain (random chunne mein unka number der se aata hai).`
          : 'Neela = pehle se pata, peela = isi round mein pata chala, grey = abhi tak nahi pata.';
      };
      el.querySelector('.co-g-step').onclick = () => { step(); draw(); };
      el.querySelector('.co-g-all').onclick = () => { let guard = 0; while (step() && guard++ < 200); draw(); };
      el.querySelector('.co-g-reset').onclick = reset;
      reset();
    }},
    { type: 'p', html: `Fanout 1 ke saath 100 nodes ~12 rounds mein aur 1,000 nodes ~18 rounds mein sab jaan jaate hain. Nodes 10 guna badhe, rounds sirf ~6 badhe. Yahi gossip ki taakat hai: rounds lagbhag <strong>log N</strong> ke hisaab se badhte hain, aur har node ka kaam har round chhota aur fixed rehta hai. Fanout 2 karo to 100 nodes ~7-8 rounds, 1,000 nodes ~11 rounds.` },
    { type: 'table', head: ['Kahan use hota hai', 'Kya gossip karte hain'], rows: [
      ['Cassandra', 'Har second kuch nodes ke saath cluster membership aur state. Inhi gossip messages ke gaps se phi accrual detector chalta hai.'],
      ['Redis Cluster', '"Cluster bus" pe ping/pong messages: kaun zinda hai, kis node ke paas kaun se slots hain.'],
      ['Consul (Serf)', 'SWIM-style gossip: membership aur failure detection. Agar seedha ping fail ho, to doosre nodes se "tum bhi try karo" (indirect probe) karwata hai, taaki ek kharab network link se jhootha "dead" na ho.'],
    ]},
    { type: 'callout', tone: 'mistake', html: `Gossip <strong>eventually</strong> sabko batata hai, turant nahi, aur alag alag nodes kuch der tak alag cheez maan sakte hain. Isliye gossip "kaun zinda hai" jaisi cheezon ke liye badhiya hai, lekin "leader kaun hai" jaise sakht faislon ke liye akela kaafi nahi: wahan majority vote / consensus chahiye.` },

    { type: 'h2', text: 'Redis replication' },
    { type: 'p', html: `Ab yahi ideas ek asli system pe lagate hain: xyz.com ka Redis (cache, sessions, rate-limit counters). Ek hi Redis node tha. Wo gira to cache lesson wala scene: saara load database pe. Pehla kadam: <strong>replica</strong>.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Replica aur asynchronous replication', html: `<strong>Ye kya hai:</strong> replica = master ki ek live copy, doosri machine pe. <strong>Asynchronous</strong> = master pehle client ko "OK" bolta hai, aur copy replica ko <em>baad mein</em> (kuch milliseconds baad) bhejta hai.<br><strong>Kyun chahiye:</strong> master gire to data ki ek taaza copy tayyar hai. Async isliye ki client ko replica ka intezaar na karna pade (tez).<br><strong>Iske bina:</strong> master ki machine gayi to saara cache/session data gaya.<br><strong>Keemat:</strong> "OK" ke baad aur copy pahunchne se pehle master mara, to wo write kho gayi. Neeche widget mein ginti dekho.` },
    { type: 'list', items: [
      'Replica master se connect hota hai, pehle poora snapshot leta hai, phir master pe hone wala har write command stream mein receive karta hai.',
      'Ye replication <strong>asynchronous</strong> hai: master client ko "OK" pehle bolta hai, replica tak baad mein bhejta hai. Fast hai, lekin agar master "OK" bolke turant mar gaya, to wo write replica tak shayad pahunchi hi na ho.',
      '<code>WAIT 1 100</code> jaisa command client ko kuch replicas ke acknowledgement ka wait karwa sakta hai. Isse data kho jaane ka chance kam hota hai, lekin Redis ke docs saaf kehte hain ki isse Redis strongly consistent nahi ban jaata.',
      'Replicas se reads bhi ho sakte hain, lekin wo thoda purana data de sakte hain (replication lag).',
    ]},
    { type: 'p', html: `Kitni writes kho sakti hain? App har 10 ms mein ek write karta hai. Replica <em>lag</em> (copy kitni peeche hai) chuno, aur master 1 second pe crash hota hai. <code>WAIT</code> on karo to client har write pe replica ke "mil gaya" ka intezaar karta hai:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<label>Replication lag: <strong class="co-r-lv"></strong></label><input class="co-r-l" type="range" min="0" max="300" step="10" value="80">
        <label style="display:flex;gap:8px;align-items:center;margin-top:10px"><input type="checkbox" class="co-r-w"> Har write ke baad <code>WAIT 1 500</code> (1 replica ka ack, max 500 ms)</label>
        <div class="co-r-bar" style="display:flex;flex-wrap:wrap;gap:2px;margin-top:12px"></div>
        <div class="stats">
          <div class="stat"><span>Client ko "OK" mile</span><strong class="co-r-ok"></strong></div>
          <div class="stat"><span>"OK" mila, phir bhi kho gayi</span><strong class="co-r-lost"></strong></div>
          <div class="stat"><span>Har write ka extra wait</span><strong class="co-r-lat"></strong></div>
        </div>
        <div class="calc-note co-r-note"></div>`;
      const lE = el.querySelector('.co-r-l'), wE = el.querySelector('.co-r-w');
      const upd = () => {
        const lag = +lE.value, wait = wE.checked, crash = 1000;
        let ok = 0, lost = 0, html = '';
        for (let t = 0; t < crash; t += 10) {
          const replicated = t + lag < crash;
          const acked = wait ? replicated : true;
          if (acked) ok++;
          if (acked && !replicated) lost++;
          if (t >= 600) html += `<span title="write at ${t} ms" style="width:10px;height:14px;border-radius:2px;background:${!acked ? 'var(--surface-2)' : replicated ? 'var(--green)' : 'var(--red)'}"></span>`;
        }
        el.querySelector('.co-r-lv').textContent = lag + ' ms';
        el.querySelector('.co-r-bar').innerHTML = html;
        el.querySelector('.co-r-ok').textContent = ok + ' / 100';
        el.querySelector('.co-r-lost').textContent = String(lost);
        el.querySelector('.co-r-lat').textContent = wait ? '+' + lag + ' ms' : '0 ms';
        el.querySelector('.co-r-note').textContent = `Aakhri 400 ms ki writes dikhayi hain. Hara = replica tak pahunchi, laal = client ko OK mila lekin crash mein kho gayi, grey = client ko OK mila hi nahi (WAIT timeout/crash; client retry karega). Bina WAIT: lag ÷ 10 ms jitni writes (yahan ${Math.ceil(lag / 10)}) chupchaap gayab. WAIT ke saath "OK" wali koi nahi khoti, lekin har write ${lag} ms dheemi. Aur WAIT bhi Redis ko strongly consistent nahi banata: failover mein Sentinel koi aisa replica bhi chun sakta hai jise wo write nahi mili.`;
      };
      lE.addEventListener('input', upd); wE.addEventListener('change', upd); upd();
    }},
    { type: 'p', html: `Replica hai, lekin master gira to replica ko master <em>kaun banayega</em>? Raat 3 baje engineer ko jagao? Yahan aata hai Sentinel.` },

    { type: 'h2', text: 'Redis Sentinel: automatic failover' },
    { type: 'callout', tone: 'term', title: 'Naya word: Redis Sentinel', html: `<strong>Ye kya hai:</strong> chowkidaar processes ka ek group (default port 26379), jo Redis master aur replicas pe nazar rakhta hai aur master girne pe replica ko khud master bana deta hai.<br><strong>Kyun chahiye:</strong> failover raat 3 baje bhi seconds mein, bina insaan ke.<br><strong>Iske bina:</strong> master gira to jab tak engineer jaag ke replica promote na kare, writes band.<br><strong>Chaar kaam (Redis docs):</strong> <strong>monitoring</strong> (sab theek chal raha hai?), <strong>notification</strong> (kuch toota to batao), <strong>automatic failover</strong> (master gira to replica ko promote karo) aur <strong>configuration provider</strong> (clients Sentinel se poochhte hain "abhi master kaun hai?").` },
    { type: 'p', html: `Do shabd dhyaan se samjho, kyunki interview mein yahi poochha jaata hai:` },
    { type: 'list', items: [
      '<strong>SDOWN</strong> (subjectively down): <em>ek</em> Sentinel ko <code>down-after-milliseconds</code> tak master se sahi jawab nahi mila. Ye bas uski raay hai.',
      '<strong>ODOWN</strong> (objectively down): kam se kam <strong>quorum</strong> jitne Sentinels maante hain ki master down hai. <strong>Quorum</strong> = "kam se kam itne log agree karein" wala number, jo config mein likha hota hai, jaise 2.',
      'Lekin failover <em>shuru</em> karne ke liye ek Sentinel ko leader chuna jaana chahiye, aur uske liye <strong>saare Sentinels ki majority</strong> ka vote chahiye. Matlab quorum sirf "failure detect" karta hai; failover ki permission majority deti hai.',
      'Isliye docs kehte hain: kam se kam <strong>3 Sentinels, teen alag machines pe</strong>. 2 Sentinels mein ek machine gire to majority (2) nahi bachti.',
    ]},
    { type: 'flow', height: 320,
      nodes: [
        { id: 'app', label: 'App server', x: 90, y: 170, w: 120, kind: 'server', info: 'Ye kya hai: xyz.com ka app server. Redis ka address hard-code nahi karta: Sentinel se poochhta hai ki "mymaster" abhi kahan hai. Redis client libraries ye kaam khud kar leti hain.' },
        { id: 'master', label: 'Redis master', sub: '10.0.0.1:6379', x: 380, y: 80, w: 140, kind: 'cache', info: 'Ye kya hai: main Redis node. Saare writes yahan. Har write async replica ko bhi jaata hai.' },
        { id: 'replica', label: 'Redis replica', sub: '10.0.0.2:6379', x: 380, y: 260, w: 140, kind: 'cache', info: 'Ye kya hai: master ki copy. Failover pe yahi promote hoke naya master banta hai.' },
        { id: 's1', label: 'Sentinel 1', x: 630, y: 60, w: 140, h: 50, kind: 'net', info: 'Ye kya hai: ek Sentinel process (chowkidaar). Har second master aur replica ko PING karta hai. Doosre Sentinels se baat karke ODOWN aur leader election karta hai.' },
        { id: 's2', label: 'Sentinel 2', x: 630, y: 170, w: 140, h: 50, kind: 'net', info: 'Ye kya hai: doosra Sentinel, alag machine pe. Clients isse bhi master ka address poochh sakte hain.' },
        { id: 's3', label: 'Sentinel 3', x: 630, y: 280, w: 140, h: 50, kind: 'net', info: 'Ye kya hai: teesra Sentinel. 3 mein se 2 = majority, isliye ek Sentinel gire to bhi failover ho sakta hai.' },
      ],
      edges: [
        { a: 'app', b: 'master' }, { a: 'app', b: 'replica' }, { a: 'app', b: 's2' },
        { a: 'master', b: 'replica' },
        { a: 's1', b: 'master', dashed: true }, { a: 's2', b: 'master', dashed: true }, { a: 's3', b: 'master', dashed: true },
        { a: 's1', b: 'replica', dashed: true }, { a: 's2', b: 'replica', dashed: true }, { a: 's3', b: 'replica', dashed: true },
        { a: 's1', b: 's2', hidden: true, id: 'v12' }, { a: 's2', b: 's3', hidden: true, id: 'v23' },
      ],
      scenarios: [
        { name: 'Normal din', steps: [
          { title: 'Master kaun hai?', text: 'App start hote hi Sentinel se master ka address poochhta hai.', go: ['app>s2', 'res:s2>app'], msg: 'SENTINEL get-master-addr-by-name mymaster\n→ 10.0.0.1 6379' },
          { title: 'Write master pe', text: 'App session data master pe likhta hai. Master turant OK bolta hai.', go: ['app>master', 'res:master>app'], msg: 'SET session:riya ... → OK' },
          { title: 'Async replication', text: 'Master wahi command replica ko bhejta hai, client ke OK ke baad.', go: 'evt:master>replica' },
          { title: 'Sentinels nazar rakhte hain', text: 'Teeno Sentinels lagatar master ko PING karte hain aur jawab paate hain.', parallel: true, go: ['evt:s1>master', 'evt:s2>master', 'evt:s3>master'] },
        ]},
        { name: 'Master crash: failover', steps: [
          { title: 'Master gir gaya', text: 'Master ki machine crash.', set: { master: { state: 'down', sub: 'DOWN' } }, focus: ['master'] },
          { title: 'PING ka jawab nahi: SDOWN', text: '<code>down-after-milliseconds</code> (maan lo 5 s) tak jawab nahi. Har Sentinel apni taraf se master ko SDOWN maanta hai.', parallel: true, go: ['lost:s1>master', 'lost:s2>master', 'lost:s3>master'], after: { s1: { sub: 'SDOWN' }, s2: { sub: 'SDOWN' }, s3: { sub: 'SDOWN' } } },
          { title: 'Quorum: ODOWN', text: 'Sentinels aapas mein poochhte hain. Quorum 2 hai aur 3 agree karte hain, to master ODOWN.', show: ['v12', 'v23'], parallel: true, go: ['evt:s1>s2', 'evt:s3>s2'], after: { s1: { sub: 'ODOWN' }, s2: { sub: 'ODOWN' }, s3: { sub: 'ODOWN' } } },
          { title: 'Majority se failover leader', text: 'Ek Sentinel (yahan Sentinel 1) vote maangta hai. 3 mein se 2+ votes = majority, wo failover ka leader bana.', go: ['s1>s2', 'res:s2>s1'], after: { s1: { state: 'ok', sub: 'failover leader' } } },
          { title: 'Replica promote', text: 'Leader Sentinel replica ko master bana deta hai. Baaki replicas (agar hon) naye master se replicate karne lagte.', go: 's1>replica', after: { replica: { state: 'ok', label: 'NEW master', sub: '10.0.0.2:6379' } }, msg: 'REPLICAOF NO ONE' },
          { title: 'App ko naya address', text: 'Connection toota to app phir Sentinel se poochhta hai aur naye master pe chala jaata hai. Downtime: detection + election, aam taur pe kuch seconds.', go: ['app>s2', 'res:s2>app', 'app>replica'], msg: 'get-master-addr-by-name mymaster → 10.0.0.2 6379' },
        ]},
        { name: 'Partition: split brain', intro: 'Master mara nahi. Bas network toota: master + app ek taraf, Sentinels + replica doosri taraf.', steps: [
          { title: 'Network split', text: 'Master Sentinels ko dikhna band. Lekin app abhi bhi master tak pahunch raha hai.', parallel: true, go: ['lost:s1>master', 'lost:s2>master', 'lost:s3>master'], set: { master: { state: 'warn', sub: 'isolated (alive!)' } } },
          { title: 'Sentinels failover kar dete hain', text: 'Sentinels ki nazar mein master ODOWN. Majority mili, replica promote.', go: 's1>replica', after: { replica: { state: 'ok', label: 'NEW master' } } },
          { title: 'Do masters!', text: 'App ka connection purane master se toota hi nahi, wo usi pe likhta ja raha hai. Ab do masters hain: <strong>split brain</strong>.', go: ['app>master', 'res:master>app'], after: { master: { state: 'hot', sub: 'still taking writes' } }, msg: 'SET cart:riya ... → OK   (purane master pe)' },
          { title: 'Network theek: writes gayab', text: 'Partition theek hone pe purana master replica bana diya jaata hai aur naye master ka data copy karta hai. Is dauraan uspe hui saari writes <strong>hamesha ke liye gayi</strong>.', go: 'evt:replica>master', after: { master: { state: 'down', label: 'Redis (old)', sub: 'writes discarded' } } },
          { title: 'Bachav: min-replicas-to-write', text: 'Master pe <code>min-replicas-to-write 1</code> aur <code>min-replicas-max-lag 10</code> set karo. Agar master ~10 s tak kisi replica se baat na kar paaye, to wo writes lena band kar deta hai. Isolated master jaldi "ruk" jaata hai, kam data khota hai. Keemat: agar saare replicas down hon, to master bhi writes nahi lega.', focus: ['master'] },
        ]},
      ],
    },

    { type: 'h2', text: 'Redis Cluster: jab data ek node mein na samaaye' },
    { type: 'p', html: `Sentinel <em>availability</em> deta hai, lekin saara data abhi bhi ek master pe hai. xyz.com ka Redis data 300 GB ho gaya, aur ek machine pe itni RAM ya itne writes nahi sambhal sakte. Tab chahiye <strong>sharding</strong>: data ko kai masters mein baanto. Redis ka built-in tareeka hai <strong>Redis Cluster</strong>.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Redis Cluster aur hash slot', html: `<strong>Ye kya hai:</strong> kai Redis masters ka group, jo data aapas mein baant lete hain. Baantne ka tareeka: <strong>16,384 dabbe (hash slots)</strong>. Har key ek dabbe mein jaati hai, aur har master kuch dabbon ka maalik hai.<br><strong>Kyun chahiye:</strong> 300 GB ek machine mein nahi aata. 3 masters = har ek pe ~100 GB, aur writes bhi teen jagah bant gaye.<br><strong>Iske bina:</strong> ek machine ki RAM aur CPU hi poori limit.<br><strong>Example:</strong> key "foo" → slot 12182 → jo master slots 10923-16383 ka maalik hai, wahan. Naya master jodo to kuch slots uske paas move hote hain; formula nahi badalta.` },
    { type: 'list', items: [
      'Poora key space <strong>16,384 hash slots</strong> mein bata hai. Har key ka slot: <code>CRC16(key) mod 16384</code>. Har master kuch slots ka maalik hai.',
      'Do keys ko ek hi slot pe rakhna ho (multi-key commands ke liye), to <strong>hash tag</strong> use karo: <code>user:{42}:profile</code> aur <code>user:{42}:feed</code> mein sirf <code>{}</code> ke andar wala "42" hash hota hai, to dono same slot pe.',
      'Har master ke apne replicas hote hain. Master gire to uska replica, baaki <strong>masters ki majority</strong> ke vote se, promote hota hai. Cluster ko alag Sentinel nahi chahiye.',
      'Nodes aapas mein ek alag "cluster bus" port (data port + 10000, jaise 16379) pe gossip karte hain: kaun zinda hai, kiske paas kaun se slots.',
      'Koi proxy nahi: client khud sahi node se baat karta hai. Galat node pe gaya to redirect milta hai.',
    ]},
    { type: 'p', html: `Key likho aur dekho wo kaunse slot aur kaunse master pe jaayegi. (Ye wahi CRC16 hai jo Redis use karta hai; 3 masters ka default split.)` },
    { type: 'custom', render(el) {
      el.innerHTML = `<label>Redis key</label>
        <input class="co-k-in" type="text" value="user:{42}:profile" style="width:100%;max-width:340px;font:15px var(--f-mono);padding:8px;border:1px solid var(--line-2);border-radius:var(--r-sm);background:var(--surface);color:var(--ink)">
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px" class="co-k-ex"></div>
        <div class="stats">
          <div class="stat"><span>Hash hone wala hissa</span><strong class="co-k-h"></strong></div>
          <div class="stat"><span>CRC16</span><strong class="co-k-c"></strong></div>
          <div class="stat"><span>Slot (mod 16384)</span><strong class="co-k-s"></strong></div>
          <div class="stat"><span>Master</span><strong class="co-k-m"></strong></div>
        </div>
        <div class="co-k-bar" style="position:relative;height:28px;border-radius:var(--r-sm);overflow:hidden;display:flex;margin-top:6px"></div>
        <div class="calc-note">Slots: Master A 0-5460, Master B 5461-10922, Master C 10923-16383. Redis docs ke examples se match karo: "foo" → 12182, "somekey" → 11058, "foo{hash_tag}" → 2515.</div>`;
      const crc16 = str => {
        const bytes = new TextEncoder().encode(str);
        let c = 0;
        for (const x of bytes) { c ^= x << 8; for (let i = 0; i < 8; i++) { c = (c & 0x8000) ? ((c << 1) ^ 0x1021) : (c << 1); c &= 0xffff; } }
        return c;
      };
      const tagOf = k => { const a = k.indexOf('{'); if (a < 0) return k; const b = k.indexOf('}', a + 1); if (b < 0 || b === a + 1) return k; return k.slice(a + 1, b); };
      const masters = [['Master A', 0, 5460, 'var(--accent)'], ['Master B', 5461, 10922, 'var(--violet)'], ['Master C', 10923, 16383, 'var(--amber)']];
      const inp = el.querySelector('.co-k-in');
      const ex = el.querySelector('.co-k-ex');
      ['user:{42}:profile', 'user:{42}:feed', 'user:42', 'foo', 'somekey', 'foo{hash_tag}', 'video:9001:views'].forEach(k => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = k; b.onclick = () => { inp.value = k; upd(); }; ex.appendChild(b);
      });
      const upd = () => {
        const key = inp.value;
        const h = tagOf(key), c = crc16(h), slot = c % 16384;
        const m = masters.find(x => slot >= x[1] && slot <= x[2]);
        el.querySelector('.co-k-h').textContent = h === key ? '(poori key)' : '"' + h + '"';
        el.querySelector('.co-k-c').textContent = '0x' + c.toString(16).toUpperCase().padStart(4, '0');
        el.querySelector('.co-k-s').textContent = String(slot);
        el.querySelector('.co-k-m').textContent = m[0];
        el.querySelector('.co-k-bar').innerHTML = masters.map(x => `<div style="flex:${x[2] - x[1] + 1};background:${x[3]};opacity:${x === m ? 1 : 0.25}"></div>`).join('') +
          `<div style="position:absolute;top:0;bottom:0;width:3px;background:var(--ink);left:calc(${(slot / 16384 * 100).toFixed(2)}% - 1px)"></div>`;
      };
      inp.addEventListener('input', upd); upd();
    }},
    { type: 'h3', text: 'MOVED aur ASK redirects' },
    { type: 'p', html: `Smart clients apne paas "kaunsa slot kis node pe" ka map rakhte hain. Lekin map purana ho sakta hai (failover hua, ya slots ek node se doosre pe move ho rahe hain). Tab node redirect bhejta hai:` },
    { type: 'compare',
      left: { title: 'MOVED (permanent)', html: `<code>-MOVED 3999 10.0.0.6:6381</code><br><br>"Slot 3999 ab pakka us node ka hai." Client query wahan dobara bhejta hai aur <strong>apna slot map update</strong> kar leta hai, taaki agli baar seedha sahi node pe jaaye.` },
      right: { title: 'ASK (temporary)', html: `<code>-ASK 3999 10.0.0.6:6381</code><br><br>"Ye slot abhi migrate ho raha hai, ye wali key shayad naye node pe hai." Client <strong>sirf ye ek query</strong> wahan bhejta hai, pehle <code>ASKING</code> command ke saath, aur <strong>map update nahi karta</strong>. Migration poori hone pe MOVED aayega.` },
    },
    { type: 'callout', tone: 'warn', title: 'Redis Cluster bhi writes kho sakta hai', html: `Replication async hai, isliye Redis Cluster ke spec ke hisaab se kuch chhote time windows mein acknowledged writes kho sakti hain, khaas kar network partition ke minority side pe. Failover tab hota hai jab master ko masters ki majority <code>NODE_TIMEOUT</code> se zyada der tak na dekh paaye. Redis ko cache, sessions, counters ke liye use karo; jis data ka ek bhi write khona mana hai, uske liye primary database.` },

    { type: 'h2', text: 'Split brain' },
    { type: 'callout', tone: 'term', title: 'Naya word: Split brain', html: `<strong>Ye kya hai:</strong> jab ek cluster ke do hisse ek doosre ko na dekh paayein aur <strong>dono khud ko leader/master maan ke writes lene lagein</strong>. Ek dimaag, do hisson mein bata hua.<br><strong>Kyun khatarnaak:</strong> dono taraf alag alag data ban jaata hai. Network theek hone pe kisi ek ka data phenkna padta hai, ya mushkil merge.<br><strong>Iske bina (agar rokte):</strong> data hamesha ek hi kahani batata.<br><strong>Example:</strong> upar Sentinel ka "Partition" scenario: purane master pe hui cart writes hamesha ke liye gayab.` },
    { type: 'p', html: `Upar teen jagah dekha: GC pause wala purana leader, isolated Redis master, aur "sabse chhota ID" wala naive election. Bachne ke tareeke:` },
    { type: 'table', head: ['Tareeka', 'Kaise bachata hai'], rows: [
      ['Majority quorum', 'Sirf wahi hissa leader chun sakta hai jismein aadhe se zyada nodes hain. Do hisson mein majority ek hi ke paas ho sakti hai.'],
      ['Term / epoch number', 'Har naye leader ka number bada. Purane number wale ke messages ignore (Raft ka term, Redis Cluster ka configEpoch).'],
      ['Fencing tokens', 'Storage khud purane leader/lock holder ki writes reject karta hai.'],
      ['Isolated leader khud ruk jaaye', 'Jaise <code>min-replicas-to-write</code>: majority/replicas se contact gaya to writes lena band.'],
      ['STONITH', '"Shoot The Other Node In The Head": classic HA setups mein naya leader purane ki power/network hi kaat deta hai, taaki wo kuch likh na sake.'],
    ]},

    { type: 'h2', text: 'Quorums: majority aur odd numbers' },
    { type: 'callout', tone: 'term', title: 'Naya word: Quorum (majority)', html: `<strong>Ye kya hai:</strong> faisla tabhi pakka jab aadhe se zyada machines (majority) haan bolein. 5 mein se 3.<br><strong>Kyun chahiye:</strong> do alag majorities kabhi nahi ban sakti (3 + 3 &gt; 5), to network toote tab bhi do leaders nahi ban sakte.<br><strong>Iske bina:</strong> har tukda apna leader chunega: split brain.<br><strong>Example:</strong> 5 nodes, 2|3 mein toote: sirf 3 wali side kaam karti hai, 2 wali side ruk jaati hai.` },
    { type: 'p', html: `Sab ki jad mein ek hi idea hai: <strong>majority</strong>. N machines mein majority = ⌊N/2⌋ + 1 (⌊ ⌋ = neeche ki taraf round). Cluster tab tak kaam karta hai jab tak majority zinda aur aapas mein connected hai, isliye ye <strong>⌊(N-1)/2⌋ failures</strong> jhel sakta hai. Nodes pe click karke unhe girao, aur partition slider se network todo:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><span style="font-size:14px;color:var(--ink-2)">Cluster size N:</span><span class="co-q-n" style="display:flex;flex-wrap:wrap;gap:6px"></span></div>
        <label style="margin-top:10px;display:block">Network partition: left side pe <strong class="co-q-pv"></strong> nodes</label>
        <input class="co-q-p" type="range" min="0" max="7" step="1" value="0">
        <div class="co-q-nodes" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:14px 0"></div>
        <div class="stats">
          <div class="stat"><span>Majority chahiye</span><strong class="co-q-maj"></strong></div>
          <div class="stat"><span>Kitne failures jhel sakta</span><strong class="co-q-tol"></strong></div>
          <div class="stat"><span>Leader / writes</span><strong class="co-q-st"></strong></div>
        </div>
        <div class="calc-note co-q-note"></div>`;
      let N = 5, part = 0, dead = new Set();
      const p = el.querySelector('.co-q-p');
      const draw = () => {
        const nb = el.querySelector('.co-q-n'); nb.innerHTML = '';
        [3, 4, 5, 6, 7].forEach(v => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (v === N ? ' on' : ''); b.textContent = v; b.onclick = () => { N = v; dead = new Set(); part = Math.min(part, N); p.value = part; draw(); }; nb.appendChild(b); });
        p.max = N;
        el.querySelector('.co-q-pv').textContent = part === 0 ? '0 (koi partition nahi)' : part + ' | right: ' + (N - part);
        const box = el.querySelector('.co-q-nodes'); box.innerHTML = '';
        for (let i = 0; i < N; i++) {
          if (part > 0 && i === part) { const w = document.createElement('span'); w.style.cssText = 'width:4px;height:44px;background:var(--red);border-radius:2px'; w.title = 'network partition'; box.appendChild(w); }
          const d = document.createElement('button'); d.type = 'button';
          const isDead = dead.has(i);
          d.textContent = isDead ? 'X' : 'N' + (i + 1);
          d.setAttribute('aria-label', 'Node ' + (i + 1) + (isDead ? ' dead' : ' alive'));
          d.style.cssText = `width:44px;height:44px;border-radius:50%;border:2px solid ${isDead ? 'var(--red)' : 'var(--green)'};background:${isDead ? 'var(--surface-2)' : 'var(--surface)'};color:${isDead ? 'var(--red)' : 'var(--ink)'};font:600 13px var(--f-mono);cursor:pointer`;
          d.onclick = () => { if (dead.has(i)) dead.delete(i); else dead.add(i); draw(); };
          box.appendChild(d);
        }
        const maj = Math.floor(N / 2) + 1, tol = Math.floor((N - 1) / 2);
        const groups = part > 0 ? [[0, part], [part, N]] : [[0, N]];
        const alive = groups.map(([a, b]) => { let c = 0; for (let i = a; i < b; i++) if (!dead.has(i)) c++; return c; });
        const winner = alive.findIndex(c => c >= maj);
        el.querySelector('.co-q-maj').textContent = maj + ' of ' + N;
        el.querySelector('.co-q-tol').textContent = String(tol);
        el.querySelector('.co-q-st').textContent = winner < 0 ? 'RUKA HUA' : (part > 0 ? (winner === 0 ? 'left side' : 'right side') : 'chal raha');
        el.querySelector('.co-q-st').style.color = winner < 0 ? 'var(--red)' : 'var(--green)';
        let note;
        if (winner < 0 && part > 0 && dead.size === 0) note = `Kisi bhi side pe ${maj} nahi. Dono side ruk gaye: ye safe hai (split brain nahi hua), lekin cluster unavailable. Even N pe barabar split (jaise 2|2, 3|3) yahi karta hai.`;
        else if (winner < 0) note = `Sirf ${Math.max(...alive)} connected zinda nodes, majority ${maj} chahiye. Cluster writes lena band kar deta hai, taaki galat faisla na ho.`;
        else if (part > 0) note = `Sirf ek side (${alive[winner]} nodes) ke paas majority hai, wahi leader chunegi. Doosri side ruk jaati hai. Do majorities kabhi nahi ban sakti, isliye split brain nahi.`;
        else note = `${alive[0]} nodes zinda, majority ${maj}. Theek. ${N % 2 === 0 ? `Dhyaan do: ${N} nodes bhi sirf ${tol} failure jhelte hain, utna hi jitna ${N - 1} nodes. Extra node ka kharcha, fayda zero.` : ''}`;
        el.querySelector('.co-q-note').textContent = note;
      };
      p.addEventListener('input', () => { part = Number(p.value); if (part >= N) { part = 0; p.value = 0; } draw(); });
      draw();
    }},
    { type: 'table', head: ['N (nodes)', 'Majority', 'Kitne gir sakte', 'Comment'], rows: [
      ['1', '1', '0', 'Koi fault tolerance nahi'],
      ['2', '2', '0', '1 se bhi bura: do machines, dono zaroori'],
      ['3', '2', '1', 'Sabse common minimum'],
      ['4', '3', '1', '3 jitna hi tolerant, ek extra machine bekaar'],
      ['5', '3', '2', 'Production etcd/ZooKeeper ka aam size'],
      ['7', '4', '3', 'Zyada nodes = har write pe zyada votes = thoda slow'],
    ]},
    { type: 'callout', tone: 'why', title: 'Odd numbers kyun?', html: `Do wajah: (1) N=4 utne hi failures jhelta hai jitna N=3, to 4th node pe paisa waste. (2) Even N ka barabar split (2|2) dono hisson ko bina majority chhod deta hai, poora cluster ruk jaata hai. Odd N mein split hamesha ek side ko majority deta hai.` },
    { type: 'callout', tone: 'mistake', html: `"Zyada nodes = zyada achha." Coordination clusters mein nahi. Har write pe majority ka jawab chahiye, to 7 ya 9 nodes writes ko slow karte hain. Isliye etcd/ZooKeeper aam taur pe 3 ya 5 nodes pe chalte hain. Reads/traffic badhana ho to ye clusters badhane ka tareeka nahi hai.` },

    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>Ek Redis node + replicas, aur automatic failover chahiye?</strong> Redis Sentinel.<br><strong>Data ya traffic ek Redis node ke liye bahut bada?</strong> Redis Cluster, jo sharding bhi karta hai aur failover bhi.<br><strong>Bharosemand leader ya config store chahiye?</strong> etcd ya ZooKeeper, jo consensus pe bane hain.` },
    { type: 'table', head: ['Zaroorat', 'Choose', 'Kyun'], rows: [
      ['Cache/sessions, data ek machine mein fit', 'Redis + replica + 3 Sentinels', 'Simple, automatic failover'],
      ['Redis data 100s of GB ya writes bahut zyada', 'Redis Cluster', '16,384 slots kai masters mein; har master ke replicas'],
      ['Sirf ek worker cron/job chalaye', 'etcd/ZooKeeper leader election (lease)', 'Lease expire pe automatic naya leader'],
      ['Duplicate kaam rokna (efficiency)', 'Simple Redis lock (SET NX PX)', 'Galti hui to bas thoda extra kaam'],
      ['Data corruption rokna (correctness)', 'etcd/ZooKeeper lock + fencing token', 'Purane holder ki write storage reject kare'],
      ['Badi fleet mein membership / kaun zinda', 'Gossip (SWIM / Cassandra-style)', 'Koi central SPOF nahi, log N rounds'],
    ]},

    { type: 'h2', text: 'Poori picture' },
    { type: 'diagram', title: 'xyz.com ka coordination layer: poori picture', height: 540,
      groups: [
        { label: 'App servers', x: 10, y: 8, w: 700, h: 100 },
        { label: 'Coordination aur data', x: 10, y: 138, w: 700, h: 108 },
        { label: 'Redis', x: 10, y: 276, w: 700, h: 256 },
      ],
      nodes: [
        { id: 'w1', label: 'Worker 1', sub: 'LEADER', x: 150, y: 62, kind: 'server', info: 'Ye kya hai: xyz.com ka app server jo abhi leader hai. etcd mein leader key iski lease se bandhi hai, aur ye har ~3 s keepalive bhejta hai. Sirf yahi nightly email bhejta hai.' },
        { id: 'w2', label: 'Worker 2', sub: 'follower', x: 360, y: 62, kind: 'server', info: 'Ye kya hai: follower app server. Leader key pe watch lagaye baitha hai; key delete hui to turant election.' },
        { id: 'w3', label: 'Worker 3', sub: 'follower', x: 570, y: 62, kind: 'server', info: 'Ye kya hai: teesra app server. Redis use karne se pehle Sentinel se poochhta hai "master kaun hai?".' },
        { id: 'etcd', label: 'etcd cluster', sub: '3 nodes · Raft', x: 110, y: 198, kind: 'data', info: 'Ye kya hai: coordination service. Leader key + lease, locks, config. Majority (3 mein se 2) zinda ho tab tak sahi jawab.' },
        { id: 'store', label: 'Reports DB', sub: 'fencing check', x: 290, y: 198, kind: 'data', info: 'Ye kya hai: jahan earnings report likhi jaati hai. Sabse bada fencing token yaad rakhta hai aur purane token wali write reject karta hai.' },
        { id: 'sent', label: 'Sentinel ×3', sub: 'quorum 2', x: 610, y: 198, kind: 'net', info: 'Ye kya hai: teen Sentinels, alag machines pe. SDOWN → ODOWN (quorum) → majority se failover leader → replica promote.' },
        { id: 'master', label: 'Redis master', sub: 'writes', x: 250, y: 336, kind: 'cache', info: 'Ye kya hai: main Redis node: sessions, cache, counters. Writes yahan, aur async replica tak.' },
        { id: 'replica', label: 'Redis replica', sub: 'async copy', x: 480, y: 336, kind: 'cache', info: 'Ye kya hai: master ki copy. Master gire to Sentinel ise naya master banata hai.' },
        { id: 'rc', label: 'Redis Cluster', sub: '16,384 slots', x: 480, y: 470, w: 160, kind: 'cache', info: 'Ye kya hai: jab data ek master mein na samaaye. Kai masters, har ek kuch slots ka maalik, har ek ke replicas, nodes aapas mein gossip karte hain. Alag Sentinel nahi chahiye.' },
      ],
      edges: [
        { a: 'w1', b: 'etcd', n: 1, label: 'lease' },
        { a: 'w2', b: 'etcd', dashed: true, kind: 'evt' },
        { a: 'w1', b: 'store', n: 2, label: 'token 34' },
        { a: 'w3', b: 'sent', label: 'master?' },
        { a: 'w3', b: 'master', label: 'SET / GET' },
        { a: 'sent', b: 'master', dashed: true },
        { a: 'sent', b: 'replica', dashed: true, label: 'promote' },
        { a: 'master', b: 'replica', kind: 'evt', label: 'async' },
        { a: 'master', b: 'rc', dashed: true, label: 'shard' },
      ],
      paths: [
        { name: 'Leader election', text: 'Worker 1 ne etcd mein leader key apni lease ke saath banayi. Worker 2 watch kar raha hai: lease expire hui to wo naya leader.', go: ['w1>etcd', 'w2>etcd'] },
        { name: 'Safe write', text: 'Lock + fencing token ke saath write. Storage purane token (33) wali write reject karta hai.', go: ['w1>etcd', 'w1>store'] },
        { name: 'Redis failover', text: 'App Sentinel se master poochhta hai. Master gira to Sentinels quorum + majority se replica ko promote karte hain.', go: ['w3>sent', 'sent>master', 'sent>replica', 'w3>master'] },
        { name: 'Scale out', text: 'Data ek master se bada ho gaya: Redis Cluster mein 16,384 slots kai masters mein bant jaate hain.', go: ['master>rc'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Heartbeat + timeout = failure detection. Network pe "mara" aur "slow" alag nahi dikhte, isliye timeout hamesha trade-off hai. Phi accrual har machine ka normal seekh ke shak ka number deta hai.</li>
      <li>Leader election: majority wala hi leader. etcd/ZooKeeper (consensus) + lease + watch se aasaan.</li>
      <li>Lease/TTL wala lock purane holder ko nahi rokta (GC pause). Correctness ke liye fencing token, jo storage check kare.</li>
      <li>Gossip: random nodes se baat, ~log N rounds mein sabko khabar, koi central SPOF nahi. Lekin sakht faislon ke liye nahi.</li>
      <li>Redis replication async hai: "OK" mili write bhi kho sakti hai. Sentinel = monitoring + automatic failover (quorum detect karta hai, majority failover authorize karti hai), kam se kam 3.</li>
      <li>Redis Cluster: CRC16(key) mod 16384 slots, hash tag {} se keys saath, MOVED (permanent) vs ASK (temporary).</li>
      <li>Split brain se bachav: majority quorum, term/epoch, fencing, isolated leader khud ruke. Odd number of nodes (3 ya 5).</li>
    </ul>` },

    { type: 'tradeoffs',
      gains: ['Machine gire to system khud failover karta hai (raat 3 baje kisi ko jagana nahi)', 'Singleton kaam sirf ek baar hote hain', 'Locks + fencing se shared data safe', 'Gossip se badi fleet bina central SPOF ke monitor', 'Redis Cluster se data/traffic kai machines mein'],
      costs: ['Har cheez timeout pe tiki hai: jhoothe alarm vs slow detection', 'Coordination cluster (3-5 nodes) chalana, monitor karna padta hai', 'Failover ke dauraan kuch seconds downtime aur async replication mein kuch writes kho sakti hain', 'Majority na mile to system ruk jaata hai (safety ke liye availability chhodi)', 'Locks aur leases sahi lagana mushkil: GC pause, clock, network sab dushman'] },

    { type: 'think', questions: [
      { q: 'xyz.com ka etcd cluster 2 data centers mein hai: DC1 mein 3 nodes, DC2 mein 2 nodes. DC1 poora down ho gaya. Kya hoga?', a: 'DC2 mein sirf 2 of 5 bache, majority 3 chahiye. etcd writes lena band kar dega: leader elections, locks sab ruk jaayenge. Fix: nodes 3 jagah baanto (jaise 2+2+1 teen zones mein), taaki koi bhi ek jagah girne pe majority bache.' },
      { q: 'Tumhare lock ka TTL 30 s hai aur kaam aam taur pe 5 s ka hai. Kya TTL ko 10 minute kar dene se GC pause wali problem khatam?', a: 'Nahi, sirf kam hogi. Pause ya network delay kabhi bhi TTL se lamba ho sakta hai. Aur lamba TTL ka nuksaan: holder sach mein crash hua to 10 minute tak koi kaam nahi. Sahi fix: fencing token, ya kaam ke beech lease renew karo aur storage pe conditional write.' },
      { q: 'Sentinel setup: 3 Sentinels, quorum 2. Do Sentinels wali machines gir gayin, master bhi gir gaya. Failover hoga?', a: 'Nahi. Ek bacha Sentinel quorum (2) tak nahi pahunchta, aur failover ke liye 3 mein se majority (2) ka vote bhi chahiye. Isliye Sentinels ko alag alag failure zones mein rakho, aur app servers jaisi machines pe bhi chala sakte ho.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Redis Cluster mein key ka slot kaise nikalta hai?', options: ['MD5(key) mod number of nodes', 'CRC16(key) mod 16384', 'Consistent hashing ring with virtual nodes'], answer: 1, explain: '16,384 fixed slots. Nodes badalne pe slots move hote hain, formula nahi badalta. Hash tag {} ho to sirf uske andar ka hissa hash hota hai.' },
      { q: 'Client ko -ASK redirect mila. Use kya karna chahiye?', options: ['Slot map update karke sab queries naye node pe bhejo', 'Sirf ye query ASKING ke saath naye node pe bhejo, map mat badlo', 'Error user ko dikhao'], answer: 1, explain: 'ASK temporary hai (slot migrate ho raha hai). MOVED permanent hai, uspe map update karte hain.' },
      { q: 'Fencing token kya rokta hai?', options: ['Lock service ka crash', 'Purane lock holder (jo pause se jaaga) ki stale write', 'Network partition'], answer: 1, explain: 'Storage sabse bada token yaad rakhta hai aur chhote token wali write reject karta hai.' },
      { q: '5 nodes ka cluster kitne failures jhel sakta hai?', options: ['1', '2', '4'], answer: 1, explain: 'Majority = 3. ⌊(5-1)/2⌋ = 2 gir sakte hain.' },
      { q: 'Sentinel mein "quorum = 2" ka matlab?', options: ['2 Sentinels master ko down maanein to wo ODOWN; failover ke liye phir bhi majority ka vote chahiye', '2 replicas chahiye', 'Failover 2 second mein'], answer: 0, explain: 'Quorum sirf failure detection ke liye hai. Failover leader ko Sentinels ki majority authorize karti hai.' },
      { q: 'Phi accrual detector fixed timeout se behtar kyun hai?', options: ['Wo kabhi galti nahi karta', 'Wo har machine ke normal heartbeat pattern ke hisaab se shak naapta hai', 'Wo heartbeats bhejna band kar deta hai'], answer: 1, explain: 'Average gap 1 s wali machine ko ~18 s chuppi pe dead maanega, 3 s wali ko ~55 s pe (threshold 8, Cassandra formula). Galti phir bhi ho sakti hai, bas kam.' },
      { q: 'Gossip mein nodes 10 guna badhe (100 → 1,000). Sabko khabar pahunchne ke rounds?', options: ['10 guna', 'Lagbhag log N ke hisaab se, thode hi zyada', 'Utne hi'], answer: 1, explain: 'Simulator mein fanout 1 pe ~12 se ~18 rounds. Khabar har round lagbhag double hoti hai.' },
      { q: 'Async replication mein lag 80 ms hai aur app har 10 ms likhta hai. Master achanak mara. Lagbhag kitni "OK" mili writes kho sakti hain?', options: ['0', '~8', '~80'], answer: 1, explain: 'Aakhri 80 ms ki writes (80 ÷ 10 = 8) abhi replica tak nahi pahunchi thi. WAIT se ye bachti hain, lekin har write dheemi.' },
    ]},
    { type: 'sources', note: 'Version-specific facts (slots, formulas, Sentinel rules, lease/watch behaviour) inhi docs se check kiye gaye.', items: [
      { title: 'Redis cluster specification', publisher: 'Redis documentation', official: true, url: 'https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/', used: '16,384 slots, CRC16 (XMODEM) mod 16384, hash tags, MOVED vs ASK + ASKING, cluster bus port +10000, PFAIL/FAIL, failover by majority of masters, write-loss windows, NODE_TIMEOUT. Example slot values used to check the widget.' },
      { title: 'High availability with Redis Sentinel', publisher: 'Redis documentation', official: true, url: 'https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/', used: 'Four Sentinel roles, port 26379, quorum vs majority, SDOWN/ODOWN, at least three Sentinels on separate boxes, partition write loss and min-replicas-to-write / min-replicas-max-lag.' },
      { title: 'How to do distributed locking', publisher: 'Martin Kleppmann (blog)', year: 2016, url: 'https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html', used: 'GC pause + lease expiry scenario, fencing tokens (33/34 example), efficiency vs correctness locks, ZooKeeper zxid/version as token.' },
      { title: 'etcd API: leases, watches, revisions', publisher: 'etcd documentation', official: true, url: 'https://etcd.io/docs/v3.5/learning/api/', used: 'Lease TTL + keepalive, keys deleted on expiry, watch streams, 64-bit store revision.' },
      { title: 'ZooKeeper Programmer\'s Guide', publisher: 'Apache ZooKeeper', official: true, url: 'https://zookeeper.apache.org/doc/current/zookeeperProgrammers.html', used: 'Ephemeral and sequential znodes, one-time watches and persistent watches since 3.6.0, majority requirement.' },
      { title: 'Failure detection and recovery', publisher: 'DataStax Cassandra documentation', official: true, url: 'https://docs.datastax.com/en/cassandra-oss/3.0/cassandra/architecture/archDataDistributeFailDetect.html', used: 'Accrual failure detection over gossip inter-arrival times, phi_convict_threshold tuning.' },
      { title: 'FailureDetector.java (Cassandra source)', publisher: 'Apache Cassandra (GitHub)', official: true, url: 'https://github.com/apache/cassandra/blob/trunk/src/java/org/apache/cassandra/gms/FailureDetector.java', used: 'ArrivalWindow.phi: φ = (t / average gap) × 1/ln 10, PHI_FACTOR; default threshold 8 ka asar.' },
      { title: 'The φ Accrual Failure Detector (Hayashibara, Défago, Yared, Katayama)', publisher: 'IEEE SRDS paper', year: 2004, url: 'https://doi.org/10.1109/RELDIS.2004.1353004', used: 'Phi accrual ka asli idea: fixed timeout ki jagah suspicion level.' },
    ]},
  ],
});
