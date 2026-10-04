Lesson.register({
  id: 'replication',
  title: 'Database replication',
  minutes: 32,
  summary: `xyz.com ka database ab bhi ek hi machine hai: wo gira to site giri, aur saare reads usi pe. Replication matlab same data ki copies kai machines pe. Isse reads baant sakte ho aur leader gire to koi doosra uski jagah le sakta hai. Lekin copies kabhi kabhi peeche reh jaati hain, aur yahin se asli maza (aur bugs) shuru hote hain.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `xyz.com ka saara data (users, posts, likes) abhi ek hi computer pe hai. Wo computer kharab hua to poori site band, aur data bhi khatre mein.<br>Hal simple hai: <strong>same data ki copies 2-3 computers pe rakho</strong>, aur har naya change sab copies tak pahunchao.<br>Ek computer gira to doosra kaam sambhaal leta hai. Aur padhne wale kaam sab copies mein baant sakte ho.<br>Mushkil bas ek hai: copies kabhi kabhi thodi <strong>peeche</strong> reh jaati hain. Is lesson mein dekhenge ki tab kya gadbad hoti hai, aur usse kaise bachte hain.` },
    { type: 'h2', text: 'Problem: ek database, do dukh' },
    { type: 'p', html: `Ab tak xyz.com mein: Load Balancer ke peeche kai stateless servers, Redis cache, aur <strong>ek</strong> database. "Availability aur SPOF" lesson mein dekha tha ki database gira to saare servers bekaar ho jaate hain. Aisi akeli cheez jiske girne se sab gire, use <strong>Single Point of Failure (SPOF)</strong> kehte hain. Cache ne reads kam kiye, lekin do problems bachi hain:` },
    { type: 'list', items: [
      `<strong>Dukh 1, SPOF:</strong> database ki disk mari, ya machine restart hui, to poori site down. Aur agar disk hi kharab hui to data bhi gaya.`,
      `<strong>Dukh 2, reads ka bojh:</strong> cache miss, search, profile pages, feeds: xyz.com ab ~20,000 reads/sec bhejta hai, jabki ek SQL machine ~5,000-10,000 queries/sec aaraam se karti hai. Machine badi karne ki bhi limit hai.`,
    ]},
    { type: 'p', html: `Dono ka ek hi jawab: data ki <strong>copies</strong> rakho, alag alag machines pe.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Replication', html: `<strong>Ye kya hai:</strong> same data ki copy kai machines pe rakhna, aur har naye change ko sab copies tak pahunchate rehna. Har copy ko <strong>replica</strong> kehte hain.<br><strong>Kyun chahiye:</strong> ek machine gire to doosri ke paas poora data ho, aur padhne (read) ka kaam kai machines mein bat sake.<br><strong>Iske bina:</strong> ek disk kharab = data gaya, ek machine restart = site band, aur saare reads ek hi machine pe.<br><strong>Dhyaan do:</strong> ye cache jaisi adhoori, temporary copy nahi hai. Har replica ek poora database hai, disk pe, saara data liye hue.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Read aur Write', html: `<strong>Write</strong> = data badalna: naya post daalna, naam badalna, like karna (SQL mein INSERT, UPDATE, DELETE). <strong>Read</strong> = sirf dekhna: feed kholna, profile padhna (SELECT). Zyaadatar apps mein reads, writes se 10-100 guna zyada hote hain. Ye baat is lesson mein baar baar kaam aayegi.` },

    { type: 'h2', text: 'Leader-follower: sabse common setup' },
    { type: 'p', html: `Sabse simple aur sabse zyada use hone wala tareeka: ek machine ko <strong>leader</strong> bana do. Saare <strong>writes sirf leader pe</strong> jaate hain. Leader har change ek list (log) mein likhta hai aur wo list baaki machines (<strong>followers</strong>) ko bhejta hai. Followers wahi changes usi order mein apne paas karte hain. Reads leader se bhi ho sakte hain aur followers se bhi.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Leader aur Follower', html: `<strong>Ye kya hai:</strong> <strong>Leader</strong> wo akela database hai jo writes leta hai. <strong>Follower</strong> uski copy hai jo sirf leader se changes leke apne paas likhta hai, aur reads ka jawab deta hai. Jaise class ka ek monitor board pe likhta hai aur baaki bachche apni copy mein utaarte hain.<br><strong>Kyun chahiye:</strong> agar sab machines writes lein to do log ek hi row ko alag alag badal denge aur jhagda (conflict) hoga. Ek hi likhne wala = koi jhagda nahi.<br><strong>Iske bina:</strong> ya to ek hi machine (SPOF), ya copies jo aapas mein alag ho jaayein.<br><strong>Kai naam, ek cheez:</strong> Leader = primary (purane docs mein "master"). Follower = replica = secondary = standby (purane docs mein "slave"). PostgreSQL "primary/standby" bolta hai, MySQL "source/replica".` },
    { type: 'callout', tone: 'term', title: 'Naya word: Replication log (WAL, binlog)', html: `<strong>Ye kya hai:</strong> database ki ek diary jisme har change order mein likha jaata hai: "row 42 ka naam badla", "post 881 insert hua". Nayi line hamesha neeche judti hai, purani kabhi nahi badalti (isse <em>append-only</em> kehte hain). PostgreSQL mein ise <strong>WAL</strong> (write-ahead log) kehte hain, MySQL mein <strong>binlog</strong>.<br><strong>Kyun chahiye:</strong> leader yahi diary followers ko bhejta (stream karta) hai. Follower diary ko line by line dobara chalata (replay karta) hai, isliye uska data leader jaisa ban jaata hai, bas thodi der baad.<br><strong>Iske bina:</strong> follower ko pata hi nahi chalega ki kya badla, aur kis order mein.` },
    { type: 'ascii', text: `
                 writes (INSERT / UPDATE / DELETE)
App servers ───────────────────────────────> Leader
     │                                          │ log stream (WAL / binlog)
     │ reads                         ┌──────────┴──────────┐
     └──────────────> Replica 1 <────┘                     └────> Replica 2 <── reads` },
    { type: 'p', html: `Chala ke dekho. Teen scenarios hain: normal write aur read, replica peeche reh gaya (lag), aur uska fix.` },
    { type: 'flow', title: 'Leader + do replicas', height: 330,
      nodes: [
        { id: 'u', label: 'User', sub: 'Riya', x: 75, y: 165, w: 110, kind: 'client', info: 'Ye kya hai: xyz.com ki ek user, Riya. Wo post likhti hai, profile badalti hai, aur pages padhti hai.' },
        { id: 'app', label: 'App server', sub: 'router logic', x: 235, y: 165, w: 130, kind: 'server', info: 'Ye kya hai: xyz.com ka code chalane wala server. Is design mein ye (ya ek DB proxy, yaani database ke aage baitha ek chhota router) decide karta hai: write hai to leader pe bhejo, read hai to kisi replica pe. Ye routing logic hi read-your-own-writes jaisi problems ka fix bhi rakhta hai.' },
        { id: 'L', label: 'Leader DB', sub: 'saare writes', x: 470, y: 60, w: 150, kind: 'data', meter: true, load: 45, info: 'Ye kya hai: wo akeli database machine jo writes leti hai. Har change apne log (WAL/binlog) mein likhta hai aur followers ko bhejta hai. Reads bhi le sakta hai, lekin hum use writes ke liye free rakhna chahte hain.' },
        { id: 'f1', label: 'Replica 1', sub: 'sirf reads', x: 470, y: 270, w: 150, kind: 'data', meter: true, load: 30, info: 'Ye kya hai: leader ki ek poori copy (follower). Leader ka log replay karta hai. Writes nahi leta (read-only). Agar ye busy ho ya network slow ho, to leader se peeche reh jaata hai: isse replication lag kehte hain.' },
        { id: 'f2', label: 'Replica 2', sub: 'sirf reads', x: 645, y: 165, w: 130, kind: 'data', meter: true, load: 30, info: 'Ye kya hai: doosri copy (follower). Jitne zyada replicas, utni zyada read capacity. Lekin har replica ko har write apply karna padta hai.' },
      ],
      edges: [{ a: 'u', b: 'app' }, { a: 'app', b: 'L' }, { a: 'app', b: 'f1' }, { a: 'app', b: 'f2' }, { a: 'L', b: 'f1' }, { a: 'L', b: 'f2' }],
      scenarios: [
        { name: 'Write + read (happy)', steps: [
          { title: 'Riya post likhti hai', text: 'Write hai, to app server use seedha <strong>leader</strong> pe bhejta hai. Replicas writes nahi lete.', go: 'u>app>L', msg: 'INSERT INTO posts (id, user_id, text) VALUES (881, 42, "Hello xyz!")' },
          { title: 'Leader commit karke OK bolta hai', text: 'Leader ne apni disk aur log mein likha aur turant "saved" bol diya. Abhi replicas ko kuch pata nahi. Ye <strong>asynchronous</strong> replication hai (default setup).', go: 'res:L>app>u', after: { L: { sub: 'post 881 ✓' } }, msg: '201 Created' },
          { title: 'Log replicas tak jaata hai', text: 'Background mein leader apna log dono replicas ko stream karta hai. Wo change replay karte hain. Kuch milliseconds mein dono ke paas bhi post 881.', parallel: true, go: ['evt:L>f1', 'evt:L>f2'], after: { f1: { sub: 'post 881 ✓' }, f2: { sub: 'post 881 ✓' } }, msg: 'WAL record: INSERT posts 881' },
          { title: 'Reads replicas pe baant do', text: 'Ab hazaaron log feed padh rahe hain. App server reads ko dono replicas pe baant deta hai. Leader ke paas writes ke liye jagah bachi rehti hai. <strong>Reads scale ho gaye.</strong>', flood: { paths: ['u>app>f1', 'u>app>f2'], n: 12 }, after: { f1: { load: 60 }, f2: { load: 60 }, L: { load: 35 } } },
          { title: 'Leader gira to?', text: 'Ab data teen machines pe hai. Leader mar bhi jaaye to ek replica ko leader banaya ja sakta hai (failover, neeche ke diagram mein). Ek machine ki disk jaane se data nahi jaata.', focus: ['f1', 'f2'] },
        ]},
        { name: 'Lag: purana data', intro: 'Replica hamesha leader ke saath nahi chalta. Dekho kya ho sakta hai.', steps: [
          { title: 'Riya naam badalti hai', text: 'Write leader pe gaya, commit hua, Riya ko "saved" mila.', go: ['u>app>L', 'res:L>app>u'], after: { L: { sub: 'name = Riya S' } }, msg: 'UPDATE users SET name = "Riya S" WHERE id = 42' },
          { title: 'Replica 2 ko mil gaya, Replica 1 peeche', text: 'Replica 1 ek bhaari report query mein busy hai, uska apply 3 second peeche chal raha hai. Isse <strong>replication lag</strong> kehte hain.', go: 'evt:L>f2', after: { f2: { sub: 'Riya S ✓' }, f1: { state: 'warn', sub: '3 s peeche' } } },
          { title: 'Riya refresh karti hai', text: 'Uska read Replica 1 pe gaya. Wahan abhi bhi purana naam! Riya ko lagta hai save hi nahi hua. Wo dobara edit karti hai, support ko complaint karti hai...', go: ['u>app>f1', 'res:f1>app>u'], msg: 'SELECT name FROM users WHERE id = 42   →  "Riya"   (purana!)' },
          { title: 'Thodi der baad sab theek', text: 'Replica 1 ne lag poora kar liya. Ab sab jagah "Riya S". Is behaviour ko <strong>eventual consistency</strong> kehte hain: abhi nahi, lekin aakhir mein sab copies same ho jaati hain.', go: 'evt:L>f1', after: { f1: { state: '', sub: 'Riya S ✓' } } },
        ]},
        { name: 'Fix: read-your-own-writes', intro: 'Roadmap ka example: user ne apna profile badla, to kuch seconds uske apne reads leader se karo.', steps: [
          { title: 'Riya naam badalti hai', text: 'Write leader pe. App server yaad rakh leta hai: "user 42 ne abhi likha hai" (session/cookie mein last-write time).', go: ['u>app>L', 'res:L>app>u'], after: { L: { sub: 'name = Riya S' }, app: { sub: '42: leader 10 s' }, f1: { state: 'warn', sub: '3 s peeche' } }, msg: 'UPDATE users SET name = "Riya S" WHERE id = 42\nsession: last_write_at = now' },
          { title: 'Riya ka refresh: leader se', text: 'Last write ko 10 second nahi hue, to app server Riya ka <em>apna</em> read leader pe bhejta hai. Naya naam dikha. Riya khush.', go: ['u>app>L', 'res:L>app>u'], msg: 'read from LEADER (own write < 10 s ago)  →  "Riya S"' },
          { title: 'Baaki users: replicas se hi', text: 'Aman Riya ka profile dekh raha hai. Uska read replica pe hi jaata hai. 3 second purana naam dikh gaya to koi nuksaan nahi: Aman ko pata hi nahi ki naam abhi badla. Leader pe sirf thode se extra reads aaye.', go: ['u>app>f1', 'res:f1>app>u'], msg: 'other user → replica  →  "Riya" (3 s purana, chalega)' },
          { title: '10 second baad: wapas normal', text: 'Window khatam, Riya ke reads bhi wapas replicas pe. Tab tak replicas pakad chuke hain. Window lag se lambi honi chahiye, warna fix aadha hai.', go: 'evt:L>f1', after: { app: { sub: 'router logic' }, f1: { state: '', sub: 'Riya S ✓' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'Synchronous, asynchronous, semi-sync' },
    { type: 'p', html: `Sabse bada sawaal: leader user ko "saved" <strong>kab</strong> bole? Apni disk pe likhte hi, ya replica ke confirm karne ke baad? Isi ek faisle se speed aur data safety dono badalti hain. Teen tareeke hain. Pehle ek ek karke samjho, phir neeche khud chala ke dekho.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Ack (acknowledgement)', html: `<strong>Ye kya hai:</strong> ek chhota "mil gaya" wala jawab. Replica leader ko bolta hai "ye change mere paas aa gaya".<br><strong>Kyun chahiye:</strong> leader ko pata chale ki copy sach mein ban gayi, sirf bheji nahi.<br><strong>Iske bina:</strong> leader andaaze pe chalta hai ki replica ke paas sab hai.<br>Aur <strong>round trip</strong> = message jaane aur jawab wapas aane ka total time. Same building mein ~1 ms, India se US ~200 ms.` },
    { type: 'h3', text: '1. Asynchronous: "likh diya, baaki baad mein"' },
    { type: 'p', html: `<strong>Kaise:</strong> leader apni disk pe likhta hai aur turant user ko "saved" bol deta hai. Replicas ko change background mein jaata hai. Leader unka wait nahi karta.<br><strong>Worked example:</strong> xyz.com pe 2,000 writes/sec aate hain. Replica 0.5 second peeche chal raha hai. Matlab kisi bhi pal ~2,000 × 0.5 = <strong>~1,000 writes</strong> aise hain jo "saved" dikh chuke hain lekin sirf leader ke paas hain. Leader ki machine abhi jal jaaye to ye 1,000 writes gaye.<br><strong>Achha:</strong> sabse fast (write ~2 ms). Replica down ho to bhi writes chalte rehte hain.<br><strong>Bura:</strong> leader crash pe haal ke writes kho sakte hain. Replica se padho to purana data mil sakta hai.<br><strong>Kab:</strong> default setup. Likes, views, feeds jaise data jahan 1-2 second ka nuksaan chal jaaye. Door wale region ke replicas hamesha async.` },
    { type: 'h3', text: '2. Synchronous: "sab copies ban gayi, tab saved"' },
    { type: 'p', html: `<strong>Kaise:</strong> leader write karta hai, replica ko bhejta hai, aur jab tak replica bole "maine bhi likh liya" tab tak user ko jawab nahi deta.<br><strong>Worked example:</strong> replica same data center mein hai (round trip 2 ms). Write ka time 2 ms (apni disk) + 2 ms (round trip) + 1 ms (replica ka likhna) = <strong>~5 ms</strong>. Replica doosre continent mein ho (150 ms) to har write ~153 ms. Aur agar required replica band hai, to writes <strong>ruk jaate hain</strong>.<br><strong>Achha:</strong> leader mare to bhi koi "saved" write nahi khota.<br><strong>Bura:</strong> har write slow, aur sabse slow replica sabki speed tay karta hai. Ek replica gira to site writes nahi le sakti.<br><strong>Kab:</strong> paisa, wallet, orders, jahan ek bhi write khona manzoor nahi. Aur replica paas mein ho.` },
    { type: 'h3', text: '3. Semi-sync: "kam se kam ek copy pakki"' },
    { type: 'p', html: `<strong>Kaise:</strong> beech ka raasta. Leader tab "saved" bolta hai jab <strong>kam se kam ek</strong> replica ka ack aa jaaye. Baaki replicas async chalte hain.<br><strong>Worked example:</strong> 2 replicas, round trip 2 ms. Write ~4 ms (sync se thoda kam, kyunki sabse fast replica ka ack hi kaafi hai). Ek replica band ho, to bhi chalega: doosre ka ack mil jaata hai. Dono band hon, to MySQL 10 second wait karke chupchaap async ban jaata hai.<br><strong>Achha:</strong> zero loss (agar ack dene wala replica promote ho), aur ek replica ke girne se writes nahi rukte.<br><strong>Bura:</strong> har write pe ek round trip extra. Fallback ke baad safety chali jaati hai, isliye uspe alert chahiye.<br><strong>Kab:</strong> zyaadatar serious production databases: paas wale zone mein ek semi-sync replica, baaki async.` },
    { type: 'table', head: ['Mode', 'Leader "OK" kab bolta hai', 'Speed', 'Leader crash pe data'], rows: [
      ['Asynchronous', 'Apni disk pe likhte hi. Replicas baad mein copy karte hain.', 'Sabse fast', 'Jo writes abhi replicas tak nahi pahunche, wo gaye'],
      ['Synchronous', 'Jab replica(s) bhi likh dein (ya apply kar dein).', 'Har write pe network round trip, slowest replica ka wait', 'Kuch nahi jaata, lekin replica down = writes atak jaate hain'],
      ['Semi-sync', 'Jab kam se kam ek replica ne change receive kar liya.', 'Ek round trip extra', 'Kuch nahi jaata, agar wahi replica promote ho'],
    ]},
    { type: 'callout', tone: 'term', title: 'Asli databases mein semi-sync', html: `<strong>Ye kya hai:</strong> upar wala "kam se kam ek copy pakki" tareeka, jaise asli databases mein milta hai.<br><strong>MySQL:</strong> iska <strong>semisynchronous</strong> mode leader commit ka jawab tab deta hai jab kam se kam ek replica (setting se 1 ya zyada) bol de ki "change mere log mein aa gaya". Default wait point <code>AFTER_SYNC</code> hai, jisme user ko OK tabhi milta hai jab replica ke paas copy pahunch chuki ho. Agar koi replica 10 second (default timeout) mein jawab na de, to MySQL wapas async pe aa jaata hai taaki site na ruke. PostgreSQL mein aisa hi control <code>synchronous_standby_names</code> se milta hai, jaise <code>ANY 1 (s1, s2)</code>: "dono mein se koi ek confirm kare".` },
    { type: 'p', html: `Khud khel ke dekho. Mode chuno, replica kitna door hai wo badlo, aur dekho har write kitna slow hota hai aur leader achanak mare to kitne writes jaate hain:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="rp-modes" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="row2" style="margin-top:12px">
          <div><label>Leader → replica round trip: <strong class="rp-rttv"></strong></label><input class="rp-rtt" type="range" min="1" max="150" step="1" value="2"></div>
          <div><label>Async lag (replica kitna peeche): <strong class="rp-lagv"></strong></label><input class="rp-lag" type="range" min="0" max="5000" step="50" value="500"></div>
        </div>
        <div class="row2" style="margin-top:8px">
          <div><label>Writes per second</label><input class="rp-wps" type="number" min="0" step="100" value="2000"></div>
          <div><label>Zinda replicas (2 mein se)</label><div class="rp-alive" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px"></div></div>
        </div>
        <div class="rp-viz" style="margin-top:14px"></div>
        <div class="stats">
          <div class="stat"><span>Ek write ka time</span><strong class="rp-lat"></strong></div>
          <div class="stat"><span>Leader abhi mare to khoye writes</span><strong class="rp-loss"></strong></div>
          <div class="stat"><span>Site writes le rahi hai?</span><strong class="rp-up"></strong></div>
        </div>
        <div class="calc-note rp-note"></div>`;
      const MODES = { async: 'Asynchronous', semi: 'Semi-sync (1 ack)', sync: 'Synchronous (dono replicas)' };
      let mode = 'async', alive = 2;
      const q = s => el.querySelector(s);
      const LOCAL = 2, APPLY = 1, TIMEOUT = 10000;
      const fmt = n => n.toLocaleString('en-IN');
      const chips = (box, map, get, set) => {
        box.innerHTML = '';
        Object.entries(map).forEach(([k, v]) => {
          const b = document.createElement('button'); b.type = 'button';
          b.className = 'chip' + (String(get()) === String(k) ? ' on' : ''); b.textContent = v;
          b.onclick = () => { set(k); upd(); }; box.appendChild(b);
        });
      };
      const upd = () => {
        chips(q('.rp-modes'), MODES, () => mode, k => mode = k);
        chips(q('.rp-alive'), { 2: '2', 1: '1', 0: '0' }, () => alive, k => alive = Number(k));
        const rtt = Number(q('.rp-rtt').value), lag = Number(q('.rp-lag').value);
        const wps = Math.max(0, Number(q('.rp-wps').value) || 0);
        q('.rp-rttv').textContent = rtt + ' ms' + (rtt <= 2 ? ' (same data center)' : rtt >= 60 ? ' (doosra region)' : '');
        q('.rp-lagv').textContent = lag + ' ms';
        let lat, loss, up, note;
        if (mode === 'async') {
          lat = LOCAL + ' ms';
          up = 'Haan';
          if (alive === 0) { loss = 'Sab naye writes'; note = 'Async mein leader replicas ka wait nahi karta, isliye replicas mare to bhi writes chalte rehte hain. Lekin ab koi copy nahi ban rahi: leader mara to replicas ke marne ke baad ke saare writes gaye.'; }
          else { loss = '~' + fmt(Math.round(wps * lag / 1000)); note = `Write sirf leader ki disk ka wait karta hai (~${LOCAL} ms). Lekin replica ${lag} ms peeche hai, to us waqt "saved" dikh chuke ~${fmt(Math.round(wps * lag / 1000))} writes kisi aur machine pe nahi hain. Leader ki machine gayi to wo bhi gaye.`; }
        } else if (mode === 'semi') {
          if (alive >= 1) { lat = (LOCAL + rtt) + ' ms'; loss = '0'; up = 'Haan'; note = `Har write ek round trip (${rtt} ms) extra wait karta hai, jab tak ek replica bole "mil gaya". Leader mare to wo replica promote karo jiske paas sab hai: kuch nahi khota. ${alive === 1 ? 'Ek replica down hai, phir bhi chal raha hai kyunki sirf 1 ack chahiye.' : ''}`; }
          else { lat = fmt(LOCAL + TIMEOUT) + ' ms, phir ' + LOCAL + ' ms'; loss = 'Sab naye writes'; up = 'Haan (async ban ke)'; note = 'Koi replica ack nahi de raha. MySQL timeout (default 10 s) tak wait karta hai, phir chupchaap async ban jaata hai. Site chalti rehti hai, lekin safety chali gayi. Isliye is fallback pe alert lagao.'; }
        } else {
          if (alive === 2) { lat = (LOCAL + rtt + APPLY) + ' ms'; loss = '0'; up = 'Haan'; note = `Har write tab tak rukta hai jab tak <strong>dono</strong> replicas apply na kar dein (${rtt} ms round trip + apply). Zero loss, lekin sabse slow replica sabki speed tay karta hai.`; }
          else { lat = 'Atka hua'; loss = '0'; up = 'Nahi!'; note = 'Ek required replica down hai, to leader har commit pe uska intezaar karta reh jaata hai. PostgreSQL mein bhi yahi hota hai: sync standby na mile to commits wait karte hain. Data safe, lekin site write nahi kar sakti. Isliye log "sab replicas sync" kam rakhte hain; "kisi ek ya majority ka ack" zyada common hai.'; }
        }
        q('.rp-lat').textContent = lat; q('.rp-loss').textContent = loss; q('.rp-up').textContent = up;
        // log positions: how far behind the leader each copy is (in writes)
        const behind = Math.round(wps * lag / 1000), TOP = 50000;
        const pos = mode === 'async' ? [behind, behind] : mode === 'semi' ? [0, behind] : [0, 0];
        const rows = [['Leader', TOP, false]].concat([0, 1].map(i => ['Replica ' + (i + 1), TOP - pos[i], i >= alive]));
        const win = Math.max(2 * behind, 100);
        const stuck = mode === 'sync' && alive < 2;
        q('.rp-viz').innerHTML = '<div style="font-size:13px;color:var(--ink-3);margin-bottom:6px">Log mein kaun kahan tak pahuncha (aakhri ' + fmt(win) + ' writes ki khidki):</div>' + rows.map(([name, at, down]) => {
          const pct = down ? 0 : Math.max(0, Math.min(100, 100 - (TOP - at) / win * 100));
          const tag = down ? 'DOWN' : name === 'Leader' ? '#' + fmt(at) + (stuck ? ' (commit atka)' : '') : '#' + fmt(at) + (TOP - at ? ' (' + fmt(TOP - at) + ' peeche)' : ' (barabar)');
          const col = down ? 'var(--red)' : name === 'Leader' ? 'var(--accent)' : TOP - at ? 'var(--amber)' : 'var(--green)';
          return '<div style="display:flex;align-items:center;gap:8px;margin:4px 0"><span style="width:76px;font-size:13px;color:var(--ink-2)">' + name + '</span><span style="flex:1;height:12px;border-radius:6px;background:var(--surface-2);border:1px solid var(--line);overflow:hidden"><span style="display:block;height:100%;width:' + pct + '%;background:' + col + '"></span></span><span style="min-width:120px;font:12px var(--f-mono);color:var(--ink-2)">' + tag + '</span></div>';
        }).join('');
        q('.rp-note').innerHTML = note;
      };
      ['.rp-rtt', '.rp-lag', '.rp-wps'].forEach(s => q(s).addEventListener('input', upd));
      upd();
    }},
    { type: 'callout', tone: 'tip', title: 'Asli duniya mein kya chalta hai', html: `Zyaadatar setups mein ek replica <strong>same region, alag availability zone</strong> mein semi-sync/sync (round trip ~1-2 ms, sasta), aur door wale region ke replicas async (wahan 100 ms ka wait har write pe nahi chal sakta). Isse paas wali machine pe zero loss, aur door wali disaster recovery ke liye.` },

    { type: 'h2', text: 'Replication lag ko samjho' },
    { type: 'p', html: `Async replica hamesha thoda peeche hota hai. Normal din pe ye milliseconds hai. Lekin lag badh jaata hai jab: leader pe writes ka toofan ho, replica pe koi lambi query CPU kha rahi ho, network slow ho, ya ek bahut bada transaction (1 crore rows update) replay ho raha ho. Kabhi kabhi lag seconds se minutes tak chala jaata hai. Isliye lag ko monitor karte hain (PostgreSQL mein <code>pg_stat_replication</code>, MySQL mein replica status) aur bahut peeche wale replica ko read traffic se hata dete hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Replication lag', html: `<strong>Ye kya hai:</strong> replica leader se kitna peeche hai, seconds mein (ya writes mein). Lag 2 s = replica ke paas wahi data hai jo leader ke paas 2 second pehle tha.<br><strong>Kyun samajhna zaroori:</strong> async replica se padhoge to kabhi kabhi purana data milega. Ye bug nahi, async ki keemat hai.<br><strong>Iska dhyaan na rakha to:</strong> users ko apna hi naya post gayab dikhega, comments aate jaate dikhenge, aur support tickets aayenge.` },
    { type: 'p', html: `Lag se teen classic gadbad hoti hain. Inke naam interviews mein poochhe jaate hain:` },
    { type: 'callout', tone: 'term', title: 'Gadbad 1: Read-your-own-writes toota', html: `<strong>Ye kya hai:</strong> ek guarantee (vaada): <strong>jo maine khud likha, wo mujhe turant dikhe</strong>. Doosron ko thoda purana dikhe to chalega, lekin mujhe apna comment, apna naya naam, apni nayi photo dikhni chahiye.<br><strong>Kyun chahiye:</strong> user ko bharosa ho ki uska kaam save hua.<br><strong>Iske bina:</strong> user sochta hai "save nahi hua" aur dobara submit karta hai (duplicate posts!), ya support ko complaint.<br><strong>Example:</strong> Riya ne naam "Riya S" kiya, refresh kiya, read 3 s peeche wale replica pe gaya, aur purana "Riya" dikha.` },
    { type: 'callout', tone: 'term', title: 'Gadbad 2: Monotonic reads toota', html: `<strong>Ye kya hai:</strong> guarantee ki <strong>time peeche nahi jaata</strong>. Ek baar naya data dekh liya, to agle read pe purana nahi dikhna chahiye. (Monotonic = sirf aage badhne wala.)<br><strong>Kyun chahiye:</strong> warna cheezein aati jaati dikhti hain, jaise koi bhoot.<br><strong>Iske bina:</strong> pehla refresh fast replica pe gaya (naya comment dikha), doosra slow replica pe (comment gayab!). User ko lagta hai comment delete ho gaya.` },
    { type: 'callout', tone: 'term', title: 'Gadbad 3: Consistent prefix toota', html: `<strong>Ye kya hai:</strong> guarantee ki <strong>jo cheezein ek order mein hui, wo usi order mein dikhein</strong>. Sawaal pehle, jawab baad mein.<br><strong>Kyun chahiye:</strong> chat aur comments mein order hi matlab banata hai.<br><strong>Iske bina:</strong> Aman ne poochha "kal milein?", Riya ne jawab diya "haan, 5 baje". Agar ye do writes alag alag raaston se (jaise alag shards, jo agle lesson mein aayenge) alag lag ke saath replicate hon, to kisi teesre ko pehle jawab dikhe aur baad mein sawaal.<br><strong>Fix:</strong> ek dusre se jude writes ko ek hi order wale log mein rakho (jaise ek chat ke saare messages hamesha ek hi leader ke log mein). Ek leader wale ek database mein ye apne aap milta hai, kyunki ek hi log hai.` },
    { type: 'p', html: `Neeche ka timeline khelo. Riya ne t = 0 pe naam badla. Do replicas hain, alag lag ke saath. Riya 6 baar refresh karti hai. Routing policy badal ke dekho kab use purana naam dikhta hai:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="ry-pol" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="row2" style="margin-top:12px">
          <div><label>Replica A ka lag: <strong class="ry-av"></strong></label><input class="ry-a" type="range" min="0" max="5" step="0.5" value="1"></div>
          <div><label>Replica B ka lag: <strong class="ry-bv"></strong></label><input class="ry-b" type="range" min="0" max="5" step="0.5" value="4"></div>
        </div>
        <div class="ry-win-row" style="margin-top:8px"><label>Leader window (write ke baad kitni der leader se padhein): <strong class="ry-wv"></strong></label><input class="ry-w" type="range" min="0" max="6" step="0.5" value="3"></div>
        <div class="ry-out" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:8px;margin-top:14px"></div>
        <div class="stats">
          <div class="stat"><span>Apna write nahi dikha</span><strong class="ry-ryw"></strong></div>
          <div class="stat"><span>Time peeche gaya</span><strong class="ry-mono"></strong></div>
          <div class="stat"><span>Leader pe reads</span><strong class="ry-lead"></strong></div>
        </div>
        <div class="calc-note ry-note"></div>`;
      const POL = { random: 'Koi bhi replica', leader: 'Leader window', sticky: 'Sticky replica', lsn: 'Position check' };
      const NOTE = {
        random: 'Har read random replica pe. Slow replica B pe gaye reads purana naam dikhate hain, aur fast A ke baad B pe gaye to naya naam "gayab" ho jaata hai (time peeche).',
        leader: 'Roadmap wala fix: apne write ke baad kuch seconds Riya ke reads leader se. Window chhoti aur lag bada ho, to window ke baad phir purana dikh sakta hai. Window ko lag se lamba rakho, aur lag ko monitor karo.',
        sticky: 'Riya hamesha replica B pe (user_id ke hash se). Time kabhi peeche nahi jaata (monotonic reads mil gaye), lekin B slow hai to shuru mein apna write nahi dikhta. Sticky sirf monotonic reads deta hai, read-your-writes nahi.',
        lsn: 'Sabse precise fix: write ke baad leader apni log position (PostgreSQL LSN / MySQL GTID) batata hai. Read sirf us replica pe jaata hai jo us position tak pahunch chuka; koi nahi pahuncha to leader pe. Hamesha sahi, aur leader pe kam se kam load. Cost: ye position track karni padti hai.',
      };
      let pol = 'random';
      const q = s => el.querySelector(s);
      const TIMES = [0.5, 1, 1.5, 2.5, 3.5, 5];
      const upd = () => {
        const box = q('.ry-pol'); box.innerHTML = '';
        Object.entries(POL).forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (k === pol ? ' on' : ''); b.textContent = v; b.onclick = () => { pol = k; upd(); }; box.appendChild(b); });
        const lagA = Number(q('.ry-a').value), lagB = Number(q('.ry-b').value), win = Number(q('.ry-w').value);
        q('.ry-av').textContent = lagA + ' s'; q('.ry-bv').textContent = lagB + ' s'; q('.ry-wv').textContent = win + ' s';
        q('.ry-win-row').style.display = pol === 'leader' ? '' : 'none';
        const out = simulate(pol, lagA, lagB, win);
        q('.ry-out').innerHTML = out.reads.map(r => {
          const col = r.fresh ? 'var(--green)' : 'var(--red)';
          return `<div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:8px;background:var(--surface-2)">
            <div style="font:12px var(--f-mono);color:var(--ink-3)">t = ${r.t} s</div>
            <div style="font-weight:700;color:var(--ink)">${r.from}</div>
            <div style="color:${col};font-weight:700">${r.fresh ? 'Riya S' : 'Riya'}</div>
            <div style="font-size:12px;color:var(--ink-3)">${r.flag || (r.fresh ? 'naya' : '')}</div></div>`;
        }).join('');
        q('.ry-ryw').textContent = out.ryw; q('.ry-mono').textContent = out.mono; q('.ry-lead').textContent = out.leader + ' / 6';
        q('.ry-note').textContent = NOTE[pol];
      };
      function simulate(p, lagA, lagB, win) {
        let seed = 7;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        const lag = { 'Replica A': lagA, 'Replica B': lagB };
        let seenNew = false, ryw = 0, mono = 0, leader = 0;
        const reads = TIMES.map(t => {
          const pick = rnd() < 0.5 ? 'Replica A' : 'Replica B';
          let from;
          if (p === 'random') from = pick;
          else if (p === 'leader') from = t <= win ? 'Leader' : pick;
          else if (p === 'sticky') from = 'Replica B';
          else { const ok = ['Replica A', 'Replica B'].filter(r => t >= lag[r]); from = ok.length ? (ok.includes(pick) ? pick : ok[0]) : 'Leader'; }
          const fresh = from === 'Leader' || t >= lag[from];
          if (from === 'Leader') leader++;
          let flag = '';
          if (!fresh) { ryw++; flag = 'apna write gayab'; if (seenNew) { mono++; flag = 'time peeche!'; } }
          if (fresh) seenNew = true;
          return { t, from, fresh, flag };
        });
        return { reads, ryw, mono, leader };
      }
      ['.ry-a', '.ry-b', '.ry-w'].forEach(s => q(s).addEventListener('input', upd));
      upd();
    }},
    { type: 'p', html: `Fixes ek jagah:` },
    { type: 'table', head: ['Fix', 'Kaise', 'Kya deta hai', 'Cost'], rows: [
      ['Apne reads leader se, kuch seconds', 'Write ke baad session mein time note karo; window ke andar us user ke reads leader pe', 'Read-your-own-writes (agar window > lag)', 'Leader pe thode extra reads'],
      ['Jo cheez sirf user khud edit karta hai, leader se', 'Apna profile, apni settings hamesha leader se; doosron ke profiles replicas se', 'Read-your-own-writes', 'Simple, lekin leader load badh sakta hai'],
      ['Log position check', 'Write pe LSN/GTID lo; sirf utna pakad chuke replica se padho', 'Read-your-own-writes, exact', 'Position track karna, thoda complex'],
      ['Sticky replica per user', 'user_id ke hash se hamesha same replica', 'Monotonic reads', 'Wo replica gira to switch pe phir jhatka'],
      ['Jude writes ek hi log mein', 'Ek chat ke saare messages ek hi leader ke log mein', 'Consistent prefix', 'Partition key soch ke chunni padti hai (sharding lesson)'],
      ['Lag monitor + bura replica hatao', 'Lag 5 s se upar gaya to us replica ko read pool se nikaalo', 'Sab fixes ko sahara', 'Baaki replicas pe load badhta hai'],
    ]},

    { type: 'h2', text: 'Failover: leader mar gaya, ab kya?' },
    { type: 'p', html: `Replicas sirf reads ke liye nahi hain. Asli kaam: leader gire to ek replica ko <strong>naya leader</strong> banana. Is process ko <strong>failover</strong> kehte hain, aur replica ko leader banana <strong>promotion</strong>.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Failover aur Promotion', html: `<strong>Ye kya hai:</strong> leader mare to ek follower ko naya leader bana dena (<strong>promotion</strong>), aur sabko bata dena ki ab writes yahan bhejo. Poori process = <strong>failover</strong>.<br><strong>Kyun chahiye:</strong> bina leader ke koi write nahi ho sakta. Jitni jaldi naya leader, utna kam downtime.<br><strong>Iske bina:</strong> leader mara to koi insaan raat 3 baje uthke haath se replica ko leader banaye: 30-60 minute downtime.<br><strong>Heartbeat</strong> = har second bheja jaane wala chhota "zinda ho?" message. Jawab na aaye to shak hota hai ki machine mar gayi.` },
    { type: 'callout', tone: 'tip', title: 'Failover ke 5 steps', html: `<strong>1. Detect:</strong> koi monitor (jaise MySQL ke liye Orchestrator, PostgreSQL ke liye Patroni, ya cloud ka managed service) leader ko har second heartbeat bhejta hai. Kuch heartbeats miss = "leader mara hua maano".<br><strong>2. Choose:</strong> jo replica sabse aage hai (log mein sabse aage tak pahuncha), wahi naya leader.<br><strong>3. Promote:</strong> use writes lene do; baaki replicas ab usse copy karein.<br><strong>4. Redirect:</strong> app servers ko naya address batao (DNS, virtual IP, ya DB proxy update).<br><strong>5. Fence:</strong> purana leader wapas aaye to wo khud ko leader na samjhe.` },
    { type: 'p', html: `Do mushkil sawaal: <strong>kitni der wait karein?</strong> Timeout chhota (2 s) to ek chhote network jhatke pe bhi failover ho jaayega, jo khud risky hai. Lamba (60 s) to itni der writes band. Aur <strong>async mein jo writes replica tak nahi pahunche the, unka kya?</strong> Neeche dekho.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Split brain', html: `<strong>Ye kya hai:</strong> ek hi waqt pe <strong>do</strong> machines khud ko leader samjhein aur dono writes lein. Jaise ek class mein do monitor, dono alag alag baatein board pe likh rahe hon.<br><strong>Kab hota hai:</strong> leader mara nahi, sirf network kat gaya. Baaki duniya ko laga wo mar gaya aur naya leader bana diya.<br><strong>Iske nuksaan:</strong> do alag "sach". Ek hi seat do logon ko bik jaati hai, ek hi wallet do baar kharch hota hai. Baad mein jodna (merge) aksar haath se karna padta hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Quorum, Fencing, Epoch, Lease', html: `<strong>Quorum (majority):</strong> faisla tabhi maano jab aadhe se zyada nodes (node = group ki ek machine) agree karein (3 mein se 2, 5 mein se 3). Network do tukdon mein bata ho to majority sirf ek tukde mein ho sakti hai, isliye do leader nahi bante.<br><strong>Epoch (ya term):</strong> har naye leader ko ek badhta number milta hai: pehla leader epoch 1, agla epoch 2. Number se pata chalta hai kaun naya hai.<br><strong>Fencing:</strong> purane leader ko zabardasti rokna. Jaise storage ya proxy bole "epoch 1 wale writes reject, ab epoch 2 ka zamana hai". Ya uski power/network hi kaat do (is trick ka mazedaar naam STONITH hai: "shoot the other node in the head").<br><strong>Lease:</strong> leader ko "10 second ke liye leader" ki permission milti hai. Majority se renew na ho paaye to wo khud writes lena band kar deta hai.<br><strong>Kyun chahiye:</strong> inke bina failover split brain bana sakta hai. Gehrai "Coordination" aur "Consensus" lessons mein.` },
    { type: 'flow', title: 'Failover aur split brain', height: 330,
      nodes: [
        { id: 'app', label: 'App servers', sub: 'writes bhejte', x: 100, y: 165, w: 140, kind: 'server', info: 'Ye kya hai: xyz.com ke servers jo database ko writes bhejte hain. Inhe bas itna pata hona chahiye ki abhi leader kaun hai. Ye info DNS, virtual IP ya ek DB proxy ke through milti hai.' },
        { id: 'L', label: 'DB-1', sub: 'leader', x: 360, y: 60, w: 140, kind: 'data', info: 'Ye kya hai: abhi ka leader database. Writes yahi leta hai aur log replicas ko bhejta hai.' },
        { id: 'f1', label: 'DB-2', sub: 'replica', x: 360, y: 270, w: 140, kind: 'data', info: 'Ye kya hai: ek follower copy. Is example mein ye DB-3 se aage hai, isliye failover pe yahi promote hoga.' },
        { id: 'f2', label: 'DB-3', sub: 'replica', x: 620, y: 270, w: 140, kind: 'data', info: 'Ye kya hai: doosri follower copy. Failover ke baad ye naye leader (DB-2) se copy karna shuru karta hai.' },
        { id: 'mon', label: 'Failover manager', sub: 'heartbeats', x: 610, y: 60, w: 170, kind: 'net', info: 'Ye kya hai: ek chowkidaar program jo leader ko har second "zinda ho?" poochhta hai (heartbeat) aur leader mare to failover chalata hai (jaise Orchestrator, Patroni, ya managed cloud DB ka control plane). Ye khud bhi 3 ya 5 nodes ka group hota hai jo majority se faisla karta hai, taaki ye khud SPOF na bane.' },
      ],
      edges: [{ a: 'app', b: 'L' }, { a: 'app', b: 'f1' }, { a: 'L', b: 'f1' }, { a: 'L', b: 'f2' }, { a: 'f1', b: 'f2' }, { a: 'mon', b: 'L' }, { a: 'mon', b: 'f1' }, { a: 'mon', b: 'f2' }],
      scenarios: [
        { name: 'Leader crash (async)', steps: [
          { title: 'Normal din', text: 'Leader ne write #1042 commit kiya aur user ko OK bhej diya. Async hai: DB-2 abhi #1041 tak hai, DB-3 #1040 tak.', go: ['app>L', 'res:L>app'], set: { f1: { sub: 'last: #1041' }, f2: { sub: 'last: #1040' } }, after: { L: { sub: 'last: #1042' } }, msg: 'UPDATE wallet SET coins = coins + 50 WHERE user_id = 42   -- #1042, "saved" ✓' },
          { title: 'Leader crash', text: 'Power supply gayi. #1042 abhi kisi replica ko bheja hi nahi gaya tha.', set: { L: { state: 'down', sub: 'DOWN' } }, go: 'lost:L>f1' },
          { title: 'Heartbeats fail', text: 'Failover manager ko 3 heartbeat ka jawab nahi mila. Wo maan leta hai ki leader mar gaya.', go: 'lost:mon>L', after: { mon: { sub: 'DB-1 dead (3 miss)' } } },
          { title: 'Sabse aage wala replica promote', text: 'DB-2 (#1041) DB-3 (#1040) se aage hai, to DB-2 naya leader. DB-3 ko bola: ab DB-2 se copy karo.', go: ['mon>f1', 'mon>f2', 'evt:f1>f2'], after: { f1: { state: 'ok', label: 'DB-2', sub: 'NEW leader' }, f2: { sub: 'follows DB-2' } } },
          { title: 'Writes naye leader pe', text: 'App servers ko naya address mila (DNS/proxy update). Site wapas chalu, downtime bas detect + promote jitna.', go: ['app>f1', 'res:f1>app'] },
          { title: 'Lekin #1042 gaya', text: 'User ne "50 coins added" dekha tha, lekin naye leader ke paas wo write hai hi nahi. <strong>Async replication + failover = kuch committed writes kho sakte hain.</strong> Wallet jaisi cheez ke liye ye manzoor nahi: semi-sync ya sync chahiye.', focus: ['f1'], set: { f1: { state: 'warn', sub: 'no #1042!' } } },
        ]},
        { name: 'Semi-sync bachata hai', steps: [
          { title: 'Write pehle replica tak', text: 'Semi-sync: leader ne #1042 DB-2 ko bheja aur uske "mil gaya" ka wait kiya. Uske baad hi user ko OK.', go: ['app>L', 'evt:L>f1', 'res:f1>L', 'res:L>app'], after: { L: { sub: 'last: #1042' }, f1: { sub: 'last: #1042' }, f2: { sub: 'last: #1040' } }, msg: 'commit #1042 → wait for 1 replica ack → OK' },
          { title: 'Leader crash', text: 'Same crash.', set: { L: { state: 'down', sub: 'DOWN' } }, go: 'lost:mon>L', after: { mon: { sub: 'DB-1 dead' } } },
          { title: 'DB-2 promote: kuch nahi khoya', text: 'DB-2 ke paas #1042 hai. Promote kiya, DB-3 ko catch up karaya. Jo bhi user ko "saved" dikha tha, wo sab safe. Keemat: har write pe ek round trip extra.', go: ['mon>f1', 'evt:f1>f2', 'app>f1'], after: { f1: { state: 'ok', sub: 'NEW leader, #1042 ✓' }, f2: { sub: 'catching up' } } },
        ]},
        { name: 'Split brain', intro: 'Sabse khatarnaak failure: leader mara nahi, sirf alag pad gaya.', steps: [
          { title: 'Network toota, leader zinda', text: 'DB-1 chal raha hai, lekin network ke ek tukde ki wajah se failover manager aur replicas usse baat nahi kar paa rahe.', set: { L: { state: 'warn', sub: 'cut off, zinda' } }, go: 'lost:mon>L' },
          { title: 'Manager DB-2 ko promote karta hai', text: 'Manager ki nazar mein DB-1 mar gaya. DB-2 naya leader.', go: 'mon>f1', after: { f1: { state: 'ok', sub: 'NEW leader' } } },
          { title: 'Do leaders!', text: 'Kuch app servers ab bhi DB-1 se jude hain aur wahan likh rahe hain, baaki DB-2 pe. Dono khud ko leader samajhte hain. Isse <strong>split brain</strong> kehte hain.', parallel: true, go: ['app>L', 'app>f1'], after: { L: { state: 'hot', sub: 'leader?!' }, f1: { state: 'hot', sub: 'leader?!' } }, msg: 'DB-1: seat 14A → Riya\nDB-2: seat 14A → Aman' },
          { title: 'Data do raaston pe', text: 'Ab do alag sach hain. Ek hi seat do logon ko bik gayi. Network jud bhi jaaye to inhe automatically merge karna aksar namumkin: kaunsa sahi? Haath se reconcile karna padta hai.', focus: ['L', 'f1'] },
          { title: 'Fix: fencing + quorum', text: 'Har promotion pe ek badhta number (<strong>epoch / term</strong>) milta hai. Naya leader epoch 2, purana epoch 1. Storage ya proxy epoch 1 wale writes reject karta hai. Saath mein purana leader majority se contact khote hi khud writes lena band kar deta hai (lease khatam). Aur failover manager majority (quorum) se hi faisla leta hai.', go: ['app>L', 'bad:L>app'], after: { L: { state: 'down', sub: 'fenced (epoch 1)' } }, msg: 'write rejected: epoch 1 < current epoch 2' },
        ]},
      ],
    },
    { type: 'h3', text: 'Split brain lab: network kaato, leaders gino' },
    { type: 'p', html: `Cluster mein kitne nodes hain, network kahan kate, aur kaunsi suraksha on hai: ye chuno. Lab batayegi ki kitne leaders bane, aur 10 second (100 writes/sec, aadhe har taraf ke apps se) mein kya hua. Khaas karke dekho: <strong>4 nodes, 2-2 ka cut, quorum on</strong>. Aur <strong>5 nodes, 3-2 ka cut, quorum off</strong>.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="sb-n" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div style="margin-top:10px"><label>Purane leader (DB-1) ke saath kitne nodes bache: <strong class="sb-kv"></strong></label><input class="sb-k" type="range" min="1" max="4" step="1" value="1"></div>
        <div class="sb-t" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>
        <div class="sb-svg" style="margin-top:12px"></div>
        <div class="stats">
          <div class="stat"><span>Kitne leaders</span><strong class="sb-l"></strong></div>
          <div class="stat"><span>Purane leader ne liye writes</span><strong class="sb-wx"></strong></div>
          <div class="stat"><span>Naye leader ne liye writes</span><strong class="sb-wy"></strong></div>
        </div>
        <div class="calc-note sb-note"></div>`;
      const q = s => el.querySelector(s);
      let n = 5, quorum = false, fence = false;
      function sim(n, k, quorum, fence) {
        const maj = Math.floor(n / 2) + 1, X = k, Y = n - k;
        const newL = Y >= 1 && (!quorum || Y >= maj);
        let oldL = !quorum || X >= maj, fenced = false;
        if (oldL && newL && fence) { oldL = false; fenced = true; }
        return { maj, X, Y, oldL, newL, fenced, leaders: (oldL ? 1 : 0) + (newL ? 1 : 0), wx: oldL ? 500 : 0, wy: newL ? 500 : 0 };
      }
      const chip = (box, txt, on, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (on ? ' on' : ''); b.textContent = txt; b.onclick = fn; box.appendChild(b); };
      const upd = () => {
        const nb = q('.sb-n'); nb.innerHTML = '';
        [3, 4, 5].forEach(v => chip(nb, v + ' nodes', v === n, () => { n = v; upd(); }));
        const tb = q('.sb-t'); tb.innerHTML = '';
        chip(tb, 'Quorum rule: ' + (quorum ? 'ON' : 'OFF'), quorum, () => { quorum = !quorum; upd(); });
        chip(tb, 'Fencing (epoch): ' + (fence ? 'ON' : 'OFF'), fence, () => { fence = !fence; upd(); });
        const ki = q('.sb-k'); ki.max = n - 1; if (+ki.value > n - 1) ki.value = n - 1;
        const k = +ki.value; q('.sb-kv').textContent = k + ' (doosri taraf ' + (n - k) + ')';
        const r = sim(n, k, quorum, fence);
        const W = 420, gap = 50, cw = (W - 20 - gap) / n;
        let svg = `<svg viewBox="0 0 ${W} 130" width="100%" role="img" aria-label="Cluster partition" style="display:block;max-width:600px;margin:0 auto">`;
        const cx = i => i < k ? 10 + i * cw + cw / 2 : 10 + gap + i * cw + cw / 2;
        const lineX = 10 + k * cw + gap / 2;
        svg += `<line x1="${lineX}" y1="8" x2="${lineX}" y2="122" stroke="var(--red)" stroke-width="2" stroke-dasharray="6 5"/>`;
        svg += `<text x="${lineX}" y="126" font-size="11" text-anchor="middle" fill="var(--red)">network kata</text>`;
        for (let i = 0; i < n; i++) {
          const lead = (i === 0 && r.oldL) || (i === k && r.newL);
          const fencedHere = i === 0 && r.fenced;
          const fill = lead ? 'var(--accent-soft)' : 'var(--surface-2)', stroke = lead ? 'var(--accent)' : fencedHere ? 'var(--red)' : 'var(--line-2)';
          svg += `<circle cx="${cx(i)}" cy="58" r="24" fill="${fill}" stroke="${stroke}" stroke-width="${lead ? 3 : 1.5}"/>`;
          svg += `<text x="${cx(i)}" y="62" font-size="13" text-anchor="middle" fill="var(--ink)" font-weight="700">DB-${i + 1}</text>`;
          const tag = lead ? (i === 0 ? 'leader (e1)' : 'leader (e2)') : fencedHere ? 'fenced' : i === 0 ? 'step down' : '';
          if (tag) svg += `<text x="${cx(i)}" y="100" font-size="11" text-anchor="middle" fill="${lead ? 'var(--accent)' : 'var(--red)'}">${tag}</text>`;
        }
        svg += `</svg>`;
        q('.sb-svg').innerHTML = svg;
        q('.sb-l').textContent = r.leaders + (r.leaders === 2 ? ' (split brain!)' : r.leaders === 0 ? ' (writes band)' : '');
        q('.sb-wx').textContent = r.wx + (r.oldL ? '' : r.fenced ? ' (reject)' : ' (ruka)');
        q('.sb-wy').textContent = r.wy + (r.newL ? '' : ' (koi leader nahi)');
        let note;
        if (r.leaders === 2) note = `Dono taraf leader! ${r.wx} writes DB-1 pe aur ${r.wy} naye leader pe, alag alag. Network judne pe do sach milenge. Quorum rule ya fencing on karke dekho.`;
        else if (r.leaders === 0) note = `Majority ${r.maj} chahiye, lekin dono taraf sirf ${r.X} aur ${r.Y}. Koi leader nahi, writes band. Data safe hai, lekin site likh nahi sakti. Isliye clusters mein odd number (3, 5) rakhte hain: 4 nodes ka 2-2 cut sab rok deta hai.`;
        else if (r.fenced) note = `Naye leader ko epoch 2 mila, aur fencing ne DB-1 (epoch 1) ke writes reject kar diye. Ek hi sach bacha. Lekin dhyaan do: yahan ${r.Y === 1 ? 'naya leader akela ek node hai, bina majority ke' : 'leader minority ya majority, kahin bhi ban sakta hai'}. Fencing tabhi kaam karta hai jab fence (storage, proxy) tak sahi epoch pahunche. Isliye asli systems quorum + fencing dono lagate hain.`;
        else if (r.oldL) note = `Majority (${r.maj}) purane leader ki taraf hai, to DB-1 hi leader rehta hai aur doosri taraf koi naya leader nahi banta. Chhota tukda sirf ruk jaata hai.`;
        else note = `Majority (${r.maj}) doosri taraf hai. Wahan naya leader (epoch 2) bana. DB-1 apni lease renew nahi kar paaya, to usne khud writes lena band kar diya. Ek hi leader.`;
        q('.sb-note').textContent = note;
      };
      q('.sb-k').addEventListener('input', upd);
      upd();
    }},
    { type: 'callout', tone: 'why', title: 'Asli kahani: GitHub, October 2018', html: `GitHub ki post-incident report (2018) ke mutabik: East Coast hub aur primary data center ke beech network sirf <strong>43 second</strong> ke liye toota. Itne mein unke failover tool Orchestrator ne West Coast ke database ko primary bana diya, aur apps ne wahan writes bhejne shuru kar diye. East Coast ke purane primary pe kuch seconds ke writes the jo West tak replicate nahi hue the, aur ab West pe naye writes bhi aa gaye. Dono taraf alag data, to seedha wapas switch karna safe nahi tha. Nateeja: <strong>24 ghante 11 minute</strong> tak degraded service, backups se restore, aur kuch writes ka manual reconciliation. Sabak: failover automatic hona chahiye, lekin cross-region failover ke rules (kab, kahan) bahut soch ke.` },

    { type: 'h2', text: 'Multi-leader: jab ek leader kaafi nahi' },
    { type: 'p', html: `Ab xyz.com India aur US dono mein popular hai. Leader Mumbai mein hai. New York ke user ka har write 200 ms door Mumbai jaata hai, aur Mumbai region gira to US ke writes bhi band. Idea: <strong>har region mein ek leader</strong>. Har leader apne region ke writes leta hai aur doosre leaders ko async bhejta hai. Ise <strong>multi-leader</strong> (multi-primary, active-active) replication kehte hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Multi-leader (active-active)', html: `<strong>Ye kya hai:</strong> ek se zyada leaders, har ek writes leta hai aur apne changes baaki leaders ko bhejta hai. "Active-active" = dono taraf ke data center ek saath kaam kar rahe hain.<br><strong>Kyun chahiye:</strong> door ke users ka write paas wale leader pe (200 ms ki jagah 5 ms), aur ek poora region gire to doosra likhta rahe.<br><strong>Iske bina:</strong> ek hi leader: door wale users ke har write pe lamba wait, aur us region ke girne pe sab writes band.<br><strong>Worked example:</strong> New York ka user, Mumbai leader: har write ~200 ms (round trip). Virginia mein bhi leader: ~5 ms. Lekin Mumbai aur Virginia ek doosre ko ~100-200 ms baad pata chalta hai, aur isi beech conflicts paida hote hain.` },
    { type: 'ascii', text: `
 India users ──writes──> Leader (Mumbai) <════ async, dono taraf ════> Leader (Virginia) <──writes── US users
                              │                                              │
                         replicas (reads)                               replicas (reads)` },
    { type: 'p', html: `Multi-leader kahan dikhta hai:` },
    { type: 'list', items: [
      `<strong>Multi-region apps:</strong> har region apne users ke writes paas mein le, ek region gire to doosra chalta rahe.`,
      `<strong>Offline clients:</strong> phone ka notes ya calendar app. Har device offline hone pe apne aap mein ek "leader" hai: wahan likho, net aane pe sync. Ye bhi multi-leader hi hai, bas har device ek leader.`,
      `<strong>Collaborative editing:</strong> Google Docs jaise apps mein har user ka browser local edit leta hai aur baad mein merge hota hai (Google Docs lesson mein detail).`,
    ]},
    { type: 'p', html: `Keemat: <strong>conflicts</strong>. Riya ne Mumbai mein apna username "riya" se "riya_s" kiya, aur usi second US mein uske doosre device se "riya.dev". Dono leaders ne apna write accept kar liya. Jab ye sync honge, kiska jeetega?` },
    { type: 'table', head: ['Conflict ka hal', 'Kaise', 'Problem'], rows: [
      ['Conflict hone hi mat do', 'Har user ka "home region": uske saare writes hamesha usi leader pe', 'Sabse practical. Lekin user travel kare ya region gire to phir conflict possible'],
      ['Last write wins (LWW)', 'Jiska timestamp bada, wo jeeta; doosra chupchaap delete', 'Data khota hai, aur alag machines ki clocks pe bharosa nahi kar sakte'],
      ['Merge / app ko poochho', 'Dono versions rakho, app ya user decide kare (jaise Git merge conflict)', 'Extra code aur UX'],
      ['CRDTs', 'Aise data types jo maths se hamesha same result pe merge hote hain (counters, sets, text)', 'Har data ke liye nahi; "Consistency" lesson mein'],
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: Last write wins (LWW) aur clock skew', html: `<strong>Ye kya hai:</strong> LWW = har write pe ek timestamp (time ki muhar). Conflict hone pe bada timestamp jeetta hai, chhota chupchaap phenk diya jaata hai.<br><strong>Kyun log use karte hain:</strong> bahut simple, koi user se poochhna nahi.<br><strong>Problem:</strong> har machine ki apni ghadi hai, aur ghadiyan thoda aage peeche chalti hain. Is farak ko <strong>clock skew</strong> kehte hain. 500 ms ka skew ho to jo write asal mein baad mein hua, wo "pehle" ka lag sakta hai, aur asli last write hi phenk diya jaata hai.` },
    { type: 'p', html: `Khel ke dekho. Riya ne Mumbai mein username "riya_s" kiya (t = 0). Uske US wale device se "riya.dev" kiya gaya, thoda aage ya peeche. Dono leaders ke beech ek taraf ka safar 100 ms hai. Conflict ka hal chuno aur US server ki ghadi aage peeche karo:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="ml-s" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="row2" style="margin-top:12px">
          <div><label>US wala edit kab hua (asli time): <strong class="ml-dv"></strong></label><input class="ml-d" type="range" min="-1000" max="1000" step="50" value="300"></div>
          <div><label>US server ki ghadi ka farak (skew): <strong class="ml-kv"></strong></label><input class="ml-k" type="range" min="-2000" max="2000" step="100" value="-500"></div>
        </div>
        <div class="ml-out" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:14px"></div>
        <div class="stats">
          <div class="stat"><span>Asli aakhri edit</span><strong class="ml-real"></strong></div>
          <div class="stat"><span>Dono leaders pe final</span><strong class="ml-fin"></strong></div>
          <div class="stat"><span>Sahi jeeta?</span><strong class="ml-ok"></strong></div>
        </div>
        <div class="calc-note ml-note"></div>`;
      const q = s => el.querySelector(s);
      const S = { lww: 'Last write wins', home: 'Home region (Mumbai)', merge: 'Dono rakho (merge)' };
      const V = { MUM: 'riya_s', US: 'riya.dev' };
      let st = 'lww';
      const ONE = 100;
      function sim(d, skew, st) {
        const later = d > 0 ? 'US' : d < 0 ? 'MUM' : 'TIE';
        const concurrent = Math.abs(d) < ONE;
        const tsU = d + skew;
        let fin, right, lost = 0, extra = 0;
        if (st === 'lww') { fin = tsU > 0 ? 'US' : 'MUM'; lost = 1; right = later === 'TIE' || fin === later; }
        else if (st === 'home') { fin = d + ONE > 0 ? 'US' : 'MUM'; extra = 2 * ONE; right = later === 'TIE' || fin === later; }
        else { fin = concurrent ? 'BOTH' : later; right = true; }
        return { later, concurrent, tsU, fin, right, lost, extra };
      }
      const upd = () => {
        const sb = q('.ml-s'); sb.innerHTML = '';
        Object.entries(S).forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (k === st ? ' on' : ''); b.textContent = v; b.onclick = () => { st = k; upd(); }; sb.appendChild(b); });
        const d = +q('.ml-d').value, skew = +q('.ml-k').value;
        q('.ml-dv').textContent = (d > 0 ? '+' : '') + d + ' ms'; q('.ml-kv').textContent = (skew > 0 ? '+' : '') + skew + ' ms';
        const r = sim(d, skew, st);
        const card = (t, a, b) => `<div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:8px;background:var(--surface-2)"><div style="font:12px var(--f-mono);color:var(--ink-3)">${t}</div><div style="font-weight:700;color:var(--ink)">${a}</div><div style="font-size:12px;color:var(--ink-3)">${b}</div></div>`;
        q('.ml-out').innerHTML = card('Mumbai leader', '"riya_s"', 'asli time 0 ms, timestamp 0 ms') + card(st === 'home' ? 'US device → Mumbai' : 'Virginia leader', '"riya.dev"', 'asli time ' + d + ' ms, timestamp ' + r.tsU + ' ms');
        q('.ml-real').textContent = r.later === 'TIE' ? 'ek saath' : '"' + V[r.later] + '"';
        q('.ml-fin').textContent = r.fin === 'BOTH' ? 'dono, app poochhega' : '"' + V[r.fin] + '"';
        q('.ml-ok').textContent = r.fin === 'BOTH' ? 'user tay karega' : r.right ? 'Haan' : 'Nahi!';
        let note;
        if (st === 'lww') note = r.right ? `Bade timestamp wala jeeta, aur wahi asli aakhri edit tha. Lekin haarne wala edit chupchaap phenka gaya (${r.lost} write gaya). Ab skew ko ${d > 0 ? 'aur negative' : 'positive'} karke dekho.` : `Gadbad! Asli aakhri edit "${V[r.later]}" tha, lekin ghadi ke farak (${skew} ms) ki wajah se uski muhar chhoti ho gayi aur wo phenk diya gaya. Kisi ko error bhi nahi dikha. Isliye LWW sirf wahan jahan kuch writes khona chalta hai.`;
        else if (st === 'home') note = `Riya ka home region Mumbai hai, to US device ka write bhi Mumbai leader pe jaata hai (+${r.extra} ms round trip). Ek hi leader order tay karta hai: jo baad mein pahuncha wo jeeta. Koi ghadi nahi, koi conflict nahi. Keemat: US se Riya ke writes slow, aur Mumbai gire to Riya ke writes band (jab tak home badla na jaaye).`;
        else note = r.concurrent ? `Dono edits ek doosre ke pahunchne se pehle hue (farak ${Math.abs(d)} ms < ${ONE} ms safar). Asli conflict! Dono versions rakhe gaye, app Riya se poochhega "kaunsa naam rakhein?" Kuch nahi khoya, lekin extra UX aur code.` : `Farak ${Math.abs(d)} ms hai, safar ${ONE} ms. Baad wale edit ne pehle wala dekh liya tha, to ye conflict nahi, simple update hai: "${V[r.later]}" jeeta. Sirf ${ONE} ms se kam farak pe asli conflict hota hai.`;
        q('.ml-note').textContent = note;
      };
      ['.ml-d', '.ml-k'].forEach(s => q(s).addEventListener('input', upd));
      upd();
    }},
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `"Multi-leader se writes scale ho jaayenge" sochna galat hai. Har leader ko <strong>har</strong> doosre leader ka har write bhi apply karna padta hai. Multi-leader ka faayda <strong>latency aur region-failure tolerance</strong> hai, write capacity nahi. Writes scale karne ke liye sharding chahiye (agla lesson).` },

    { type: 'h2', text: 'Leaderless (Dynamo-style): koi boss nahi' },
    { type: 'p', html: `Teesra tareeka: koi leader hi nahi. Client (ya ek <strong>coordinator</strong>, yaani wo node jo client ki taraf se baaki replicas se baat karta hai) har write <strong>kai replicas ko ek saath</strong> bhejta hai, aur read bhi kai replicas se karta hai. Amazon ka 2007 ka Dynamo paper ye idea popular kiya; Cassandra, ScyllaDB aur Riak isi family ke hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Quorum (N, W, R)', html: `<strong>Ye kya hai:</strong> teen numbers ka niyam. <strong>N</strong> = har data ki kitni copies. <strong>W</strong> = write ko "ho gaya" maanne ke liye kitne replicas ka ack chahiye. <strong>R</strong> = read pe kitne replicas se poochhna hai.<br><strong>Kyun chahiye:</strong> koi leader nahi hai jo bataye ki naya data kiske paas hai. Agar <strong>R + W &gt; N</strong>, to read wale aur write wale replicas mein kam se kam ek common hoga, aur uske paas naya data hoga.<br><strong>Iske bina:</strong> write ek replica pe gaya, read doosre se hua: purana data, aur pata bhi nahi chala.<br>Peeche reh gaye replicas ko <strong>read repair</strong> (read ke time purani copy theek karna) aur background mein copies milaane wala process (anti-entropy) pakda dete hain. Iski chhupi kamzoriyan "Consistency models aur quorums" lesson mein.` },
    { type: 'p', html: `Maan lo har data ki <strong>N = 3</strong> copies hain. Write ko success tab maano jab <strong>W = 2</strong> replicas bolein "likh liya". Read pe <strong>R = 2</strong> replicas se poochho aur jiska version naya ho wo lo. Kyunki R + W = 4 &gt; N = 3, read wale 2 aur write wale 2 replicas mein kam se kam ek common hoga, jiske paas naya data hai. Ek replica down ho to bhi writes aur reads chalte rehte hain, koi failover nahi chahiye.` },
    { type: 'p', html: `Chala ke dekho. Kisi replica pe click karke use band/chalu karo. W aur R badlo. Lab hamesha <strong>sabse bura case</strong> dikhati hai: write sirf W replicas tak pahuncha, aur read pehle purane wale replicas se poochhta hai.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="qw-n" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="row2" style="margin-top:12px">
          <div><label>W (write ke liye acks): <strong class="qw-wv"></strong></label><input class="qw-w" type="range" min="1" max="5" step="1" value="2"></div>
          <div><label>R (read pe kitne se poochho): <strong class="qw-rv"></strong></label><input class="qw-r" type="range" min="1" max="5" step="1" value="2"></div>
        </div>
        <div class="qw-svg" style="margin-top:12px"></div>
        <div class="stats">
          <div class="stat"><span>Write (v2)</span><strong class="qw-wo"></strong></div>
          <div class="stat"><span>Read ko mila</span><strong class="qw-ro"></strong></div>
          <div class="stat"><span>R + W &gt; N?</span><strong class="qw-ov"></strong></div>
        </div>
        <div class="calc-note qw-note"></div>`;
      const q = s => el.querySelector(s);
      let N = 3, down = [];
      function sim(N, W, R, down) {
        const alive = []; for (let i = 0; i < N; i++) if (!down.includes(i)) alive.push(i);
        const wOk = alive.length >= W;
        const got = wOk ? alive.slice(0, W) : [];            // worst case: write reached only W replicas
        const stale = alive.filter(i => !got.includes(i));
        const rOk = alive.length >= R;
        const asked = rOk ? stale.concat(got).slice(0, R) : []; // worst case: read asks stale ones first
        const fresh = asked.some(i => got.includes(i));
        return { alive: alive.length, wOk, got, rOk, asked, fresh, overlap: R + W > N };
      }
      const upd = () => {
        const nb = q('.qw-n'); nb.innerHTML = '';
        [3, 5].forEach(v => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (v === N ? ' on' : ''); b.textContent = 'N = ' + v; b.onclick = () => { N = v; down = []; q('.qw-w').max = N; q('.qw-r').max = N; if (+q('.qw-w').value > N) q('.qw-w').value = N; if (+q('.qw-r').value > N) q('.qw-r').value = N; upd(); }; nb.appendChild(b); });
        const W = +q('.qw-w').value, R = +q('.qw-r').value;
        q('.qw-wv').textContent = W; q('.qw-rv').textContent = R;
        const r = sim(N, W, R, down);
        const gap = 420 / N;
        let svg = `<svg viewBox="0 0 420 110" width="100%" role="img" aria-label="Replicas" style="display:block;max-width:560px;margin:0 auto">`;
        for (let i = 0; i < N; i++) {
          const x = gap * i + gap / 2, isDown = down.includes(i), has = r.got.includes(i), ask = r.asked.includes(i);
          const stroke = isDown ? 'var(--red)' : ask ? 'var(--accent)' : 'var(--line-2)';
          svg += `<g data-i="${i}" style="cursor:pointer"><circle cx="${x}" cy="46" r="28" fill="${isDown ? 'var(--surface)' : has ? 'var(--accent-soft)' : 'var(--surface-2)'}" stroke="${stroke}" stroke-width="${ask ? 3 : 1.5}" ${isDown ? 'stroke-dasharray="5 4"' : ''}/>`;
          svg += `<text x="${x}" y="42" font-size="12" text-anchor="middle" fill="var(--ink)" font-weight="700">R${i + 1}</text>`;
          svg += `<text x="${x}" y="58" font-size="11" text-anchor="middle" fill="${isDown ? 'var(--red)' : has ? 'var(--accent)' : 'var(--ink-3)'}">${isDown ? 'DOWN' : has ? 'v2 (naya)' : 'v1'}</text>`;
          if (ask) svg += `<text x="${x}" y="96" font-size="11" text-anchor="middle" fill="var(--accent)">poochha</text>`;
          svg += `</g>`;
        }
        q('.qw-svg').innerHTML = svg + '</svg>';
        q('.qw-svg').querySelectorAll('g[data-i]').forEach(g => g.addEventListener('click', () => { const i = +g.dataset.i; down = down.includes(i) ? down.filter(x => x !== i) : down.concat(i); upd(); }));
        q('.qw-wo').textContent = r.wOk ? 'OK (' + W + ' acks)' : 'FAIL (' + r.alive + ' zinda < ' + W + ')';
        q('.qw-ro').textContent = !r.rOk ? 'FAIL' : !r.wOk ? 'v1 (write hua hi nahi)' : r.fresh ? 'v2 (naya)' : 'v1 (purana!)';
        q('.qw-ov').textContent = (R + W) + (r.overlap ? ' > ' : ' ≤ ') + N + (r.overlap ? ' haan' : ' nahi');
        let note;
        if (!r.wOk) note = `Sirf ${r.alive} replicas zinda, lekin W = ${W}. Write fail: client ko error milega. W chhota karo ya replica chalu karo.`;
        else if (!r.rOk) note = `Read ko ${R} replicas chahiye, zinda sirf ${r.alive}. Read fail.`;
        else if (r.fresh) note = `Read ne ${R} replicas se poochha, aur unmein kam se kam ek ke paas v2 tha. Version number dekh ke naya wala chuna. ${r.overlap ? 'R + W > N hai, isliye ye hamesha hoga.' : 'Is baar kismat se mila, guarantee nahi.'} Purani copy wale replicas ko read repair se v2 bhej diya jaata hai.`;
        else note = `R + W = ${R + W}, N = ${N}. Read wale replicas aur write wale replicas mein koi common nahi: read ko sirf purana v1 mila, aur use pata bhi nahi chala. Ye fast hai (kam replicas ka wait), lekin purana data mil sakta hai.`;
        q('.qw-note').textContent = note;
      };
      ['.qw-w', '.qw-r'].forEach(s => q(s).addEventListener('input', upd));
      q('.qw-w').max = N; q('.qw-r').max = N;
      upd();
    }},
    { type: 'callout', tone: 'mistake', title: 'Naam se dhoka', html: `Amazon <strong>DynamoDB</strong> naam se Dynamo jaisa lagta hai, lekin uske 2022 ke USENIX paper ke mutabik har partition (data ka ek hissa, agle lesson mein detail) ki replicas (alag availability zones mein) ek group banati hain jisme Multi-Paxos (leader chunne ka ek majority-vote tareeka, Consensus lesson mein) se ek <strong>leader</strong> chuna jaata hai. Writes aur strongly consistent reads sirf leader karta hai, aur write tab ack hota hai jab majority replicas ne log likh liya. Yaani DynamoDB andar se leader-based hai, Dynamo paper wala leaderless nahi.` },

    { type: 'h2', text: 'Teeno ek nazar mein' },
    { type: 'table', head: ['', 'Leader-follower', 'Multi-leader', 'Leaderless'], rows: [
      ['Writes kahan', 'Sirf ek leader', 'Har region/device ka leader', 'Kai replicas, quorum se'],
      ['Conflicts', 'Nahi (ek hi likhne wala)', 'Haan, resolve karne padte hain', 'Haan (versions, read repair)'],
      ['Leader gira to', 'Failover chahiye (seconds)', 'Doosre leaders chalte rehte', 'Kuch nahi, quorum mil raha to'],
      ['Examples', 'PostgreSQL, MySQL, MongoDB replica set, Redis replicas', 'Multi-region active-active setups, offline-first apps', 'Cassandra, ScyllaDB, Riak, Dynamo paper'],
      ['Kab', 'Default. 90% apps ke liye', 'Multi-region writes, offline clients', 'Bahut high write availability, multi-DC'],
    ]},

    { type: 'h2', text: 'Replica backup nahi hai' },
    { type: 'callout', tone: 'mistake', title: 'Sabse costly confusion', html: `Kisi ne galti se <code>DELETE FROM users</code> chala diya. Replication kya karega? Wo delete <strong>turant saare replicas pe bhi</strong> chala dega. Replication hardware failure se bachata hai, insaani galti ya bug se nahi. Uske liye alag se <strong>backups</strong> chahiye (daily snapshot + log archive, jisse kisi bhi second pe wapas ja sako, ise point-in-time recovery kehte hain).` },

    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Decide: replication kab?', html: `Replicate karo jab <strong>high availability</strong> chahiye ya <strong>read capacity</strong> kam pad rahi hai. Replication <strong>write capacity nahi badhata</strong>, kyunki har copy ko har write apply karna hi padta hai: 3 replicas = wahi writes 3 baar. Agar writes bottleneck hain, to sharding chahiye.<br><br><strong>Example (roadmap se):</strong> user ne apna profile update kiya, to kuch seconds tak uske apne reads leader pe bhejo, taaki lagging replica se use purana version kabhi na dikhe.` },
    { type: 'table', head: ['Situation', 'Choice'], rows: [
      ['Ek DB, SPOF hatana hai', 'Leader + 1-2 replicas, ek alag availability zone mein, automatic failover'],
      ['Paisa, wallet, orders: ek bhi write khona manzoor nahi', 'Semi-sync/sync replica paas wale zone mein'],
      ['Reads bahut, writes kam (feeds, profiles)', 'Async read replicas + read-your-own-writes routing'],
      ['Users kai continents mein, writes paas chahiye', 'Multi-leader, har user ka home region (conflicts kam)'],
      ['Writes hi zyada hain', 'Replication kaafi nahi: sharding (agla lesson)'],
    ]},

    { type: 'h2', text: 'Poori picture' },
    { type: 'diagram', title: 'Replication: xyz.com ka poora setup', height: 600,
      groups: [
        { label: 'Users + app', x: 190, y: 6, w: 310, h: 310 },
        { label: 'Control', x: 510, y: 100, w: 180, h: 106 },
        { label: 'Data (copies)', x: 22, y: 346, w: 680, h: 236 },
      ],
      nodes: [
        { id: 'users', label: 'xyz.com users', sub: 'Riya, Aman...', x: 360, y: 60, kind: 'client', info: 'Ye kya hai: xyz.com ke log, jo post likhte (writes) aur feed padhte (reads) hain. Reads writes se kahin zyada hain, isliye replicas ka faayda bada hai.' },
        { id: 'lb', label: 'Load Balancer', x: 360, y: 160, kind: 'net', info: 'Ye kya hai: requests ko kai app servers mein baantne wala (load balancer lesson). Database replication se iska seedha lena dena nahi, bas request ko app tak laata hai.' },
        { id: 'app', label: 'App servers', sub: 'read/write router', x: 360, y: 270, w: 180, kind: 'server', info: 'Ye kya hai: xyz.com ka code. Yahi tay karta hai: write ho to leader, read ho to replica, aur jisne abhi likha uske reads kuch seconds leader se (read-your-own-writes).' },
        { id: 'mgr', label: 'Failover manager', sub: 'heartbeats', x: 600, y: 160, w: 160, kind: 'net', info: 'Ye kya hai: chowkidaar (jaise Patroni ya Orchestrator), khud 3-5 nodes ka group jo majority se faisla karta hai. Leader ko heartbeat bhejta hai; leader mare to standby ko promote karta hai aur purane ko fence karta hai.' },
        { id: 'leader', label: 'Leader DB', sub: 'saare writes', x: 360, y: 400, w: 150, kind: 'data', info: 'Ye kya hai: akela database jo writes leta hai. Har change WAL/binlog mein likh ke sab copies ko bhejta hai.' },
        { id: 'semi', label: 'Standby', sub: 'semi-sync, AZ-b', x: 600, y: 400, w: 160, kind: 'data', info: 'Ye kya hai: paas wale zone (alag building) mein ek copy jiska ack aane ke baad hi user ko "saved" milta hai. Leader mare to isi ko promote karte hain: koi saved write nahi khota.' },
        { id: 'rr1', label: 'Read replica 1', sub: 'async', x: 110, y: 400, w: 140, kind: 'data', info: 'Ye kya hai: async copy jo sirf reads ka jawab deti hai. Thoda lag ho sakta hai, isliye bahut peeche ho jaaye to read pool se hatao.' },
        { id: 'rr2', label: 'Read replica 2', sub: 'async', x: 110, y: 540, w: 140, kind: 'data', info: 'Ye kya hai: doosri read copy. Har naya replica = aur read capacity, lekin write capacity wahi (har copy har write apply karti hai).' },
        { id: 'bk', label: 'Backups', sub: 'snapshot + WAL', x: 360, y: 540, w: 140, kind: 'data', info: 'Ye kya hai: roz ka snapshot aur log ka archive, alag storage pe. Galti se DELETE chal jaaye to replicas bhi delete kar denge; tab yahi bachaata hai (point-in-time recovery).' },
        { id: 'dr', label: 'DR replica', sub: 'Virginia, async', x: 600, y: 540, w: 160, kind: 'data', info: 'Ye kya hai: door ke region mein async copy (DR = disaster recovery). Poora Mumbai region gire to yahan se site chala sakte hain, kuch seconds ke writes khone ke risk ke saath.' },
      ],
      edges: [
        { a: 'users', b: 'lb', n: 1 },
        { a: 'lb', b: 'app', n: 2 },
        { a: 'app', b: 'leader', n: 3, label: 'writes' },
        { a: 'leader', b: 'semi', label: 'sync ack' },
        { a: 'app', b: 'rr1' },
        { a: 'app', b: 'rr2' },
        { a: 'leader', b: 'rr1', kind: 'evt', dashed: true },
        { a: 'leader', b: 'rr2', kind: 'evt', dashed: true },
        { a: 'leader', b: 'bk', kind: 'evt', dashed: true, label: 'archive' },
        { a: 'leader', b: 'dr', kind: 'evt', dashed: true, label: 'async' },
        { a: 'mgr', b: 'leader', dashed: true },
        { a: 'mgr', b: 'semi', kind: 'bad', label: 'promote' },
      ],
      paths: [
        { name: 'Write', text: 'Post likha: app ne leader pe bheja, leader ne standby ka ack liya, phir "saved".', go: ['users>lb>app>leader>semi'] },
        { name: 'Read', text: 'Feed padhna: app reads ko async replicas mein baant deta hai. Leader writes ke liye free rehta hai.', go: ['users>lb>app>rr1', 'app>rr2'] },
        { name: 'Apna naya data', text: 'Riya ne abhi likha: kuch seconds uske reads leader se, taaki purana na dikhe.', go: ['users>lb>app>leader'] },
        { name: 'Failover', text: 'Leader ke heartbeat band: manager standby ko promote karta hai aur purane leader ko fence.', go: ['mgr>leader', 'mgr>semi'] },
        { name: 'Copies', text: 'Leader ka log har copy tak: read replicas, backup archive aur door ka DR replica.', go: ['leader>rr1', 'leader>rr2', 'leader>bk', 'leader>dr'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Replication = same data ki copies kai machines pe. Faayda: availability (ek gire to doosra) aur read capacity. Write capacity nahi badhti.</li>
      <li>Leader-follower default hai: writes sirf leader pe, log (WAL/binlog) followers tak. Multi-leader = paas mein writes, lekin conflicts. Leaderless = N, W, R quorum, koi failover nahi.</li>
      <li>Async fast hai lekin crash pe haal ke writes kho sakte hain. Sync zero loss lekin slow aur replica gira to writes atke. Semi-sync beech ka raasta.</li>
      <li>Replication lag se teen gadbad: apna write na dikhna, time peeche jaana, order ulta. Fix: apne reads leader se / log position check / sticky replica / jude writes ek log mein.</li>
      <li>Failover = detect, sabse aage wala replica chuno, promote, redirect, fence.</li>
      <li>Split brain se bachne ke liye: majority (quorum) se faisla, odd number of nodes, aur fencing (epoch, lease).</li>
      <li>Conflict mein LWW ghadi pe bharosa karta hai aur chupchaap data phenkta hai. Home region sabse practical.</li>
      <li>Replica backup nahi hai: galti se DELETE sab copies pe chalta hai.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Leader gire to replica promote: SPOF gaya', 'Reads kai machines pe baant sakte ho', 'Ek machine ki disk mari to data safe', 'Users ke paas (doosre region) copy rakh ke reads fast'], costs: ['Async: replication lag, purana data, failover pe kuch writes kho sakte hain', 'Sync/semi-sync: har write slow, aur replica issue pe writes atak sakte hain', 'Failover tricky: false alarms, split brain, fencing ka jhanjhat', 'Multi-leader/leaderless: conflicts resolve karne padte hain', 'Write capacity nahi badhti, aur har replica ka storage + machine ka kharcha'] },

    { type: 'think', questions: [
      { q: 'xyz.com pe likes ka counter aur user ka wallet balance, dono same database mein hain. Async replication chal raha hai. Kya dono ke liye theek hai?', a: 'Likes ke liye haan: failover pe 2-3 likes kho gaye to koi nahi rota, aur replica se thoda purana count dikhna chalega. Wallet ke liye nahi: failover pe "added" dikh chuka paisa gayab ho sakta hai. Wallet ke writes ke liye semi-sync (ya sync) replica chahiye, aur balance padhna leader se. Ek hi system mein data ke hisaab se alag guarantee chahiye ho sakti hai.' },
      { q: 'Failover timeout 2 second rakha. Har hafte bina wajah failover ho raha hai. Kyun, aur kya karein?', a: 'Chhota timeout = chhota network jhatka ya GC pause (program ka memory saaf karne ke liye ek-do second ruk jaana) bhi "leader mar gaya" lagta hai. Har failover khud risky hai (async writes khona, split brain ka chance, connections tootna). Timeout thoda bada karo (10-30 s), kai alag jagah se health check lo (majority vote), aur fencing pakki rakho. Speed aur false alarms ke beech balance hai.' },
      { q: 'Failover manager ke liye 4 nodes rakhein ya 5? 4 to zyada sasta hai.', a: 'Majority 4 mein 3 hai, aur 5 mein bhi 3. Yaani 4 nodes bhi sirf 1 failure jhel sakte hain (jaise 3), aur network 2-2 mein kate to kisi taraf majority nahi: koi leader nahi. 5 nodes 2 failures jhelte hain. Isliye odd number (3 ya 5): even number extra machine ka paisa leta hai, faayda nahi deta.' },
      { q: 'Read-your-own-writes ke liye "10 second leader se padho" lagaya. Ek din replica ka lag 30 second ho gaya. Kya hoga?', a: 'Window ke baad Riya ke reads phir lagging replica pe jaayenge aur use 20 second tak purana data dikh sakta hai. Fix: lag monitor karo aur zyada lag wale replica ko read pool se hata do, ya window ki jagah log position (LSN/GTID) check use karo jo lag pe depend hi nahi karta.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'xyz.com ke writes 3x ho gaye aur leader 95% CPU pe hai. 3 aur replicas jodne se kya hoga?', options: ['Writes 3x fast ho jaayenge', 'Writes pe koi faayda nahi; har replica bhi har write apply karta hai, leader pe bhi utne hi writes', 'Leader ka load aadha ho jaayega'], answer: 1, explain: 'Replication reads aur availability ke liye hai. Writes sirf leader leta hai. Write bottleneck ka jawab sharding hai.' },
      { q: 'Asynchronous replication mein leader crash pe kya ho sakta hai?', options: ['Kuch nahi, replicas ke paas sab hai', 'Jo writes user ko "saved" dikh chuke the lekin replica tak nahi pahunche, wo kho sakte hain', 'Saara data kho jaata hai'], answer: 1, explain: 'Async mein leader replica ka wait nahi karta. Lag window ke writes sirf leader ki disk pe the.' },
      { q: 'Riya ne comment kiya, refresh pe comment dikha, doosre refresh pe gayab. Kaunsi guarantee tooti?', options: ['Monotonic reads', 'Durability', 'Quorum'], answer: 0, explain: 'Pehla read naye replica se, doosra purane se: time peeche gaya. Fix: user ko same replica pe sticky rakho, ya position check.' },
      { q: 'Split brain se bachne ke liye kya zaroori hai?', options: ['Zyada replicas', 'Majority (quorum) se leader chunna aur purane leader ko fence karna (epoch/lease)', 'Async replication'], answer: 1, explain: 'Majority sirf ek network tukde mein ho sakti hai, aur fencing purane leader ke writes ko reject karti hai.' },
      { q: 'Leaderless cluster, N = 3, W = 1, R = 1. Kya hoga?', options: ['Hamesha naya data milega', 'Bahut fast, lekin read ko purana data mil sakta hai kyunki R + W = 2, N se bada nahi', 'Writes fail honge'], answer: 1, explain: 'R + W > N nahi hai, to read wala replica aur write wala replica alag ho sakte hain. Speed milti hai, freshness ki guarantee nahi.' },
      { q: 'Multi-leader mein last write wins (LWW) ka sabse bada khatra?', options: ['Bahut slow hai', 'Ghadiyon ke farak (clock skew) se asli aakhri edit chupchaap phenka ja sakta hai', 'Conflicts ko user se poochhta hai'], answer: 1, explain: 'LWW timestamp pe chalta hai. Ghadi 500 ms peeche ho to baad wala edit "purana" lagta hai aur bina error ke gayab.' },
      { q: 'Kisi ne galti se table drop kar di. 3 replicas hain. Data wapas kaise aayega?', options: ['Replica se', 'Backup + point-in-time recovery se; replicas pe bhi drop chal chuka hai', 'Failover se'], answer: 1, explain: 'Replication galtiyon ko bhi copy karta hai. Backups alag cheez hain.' },
    ]},
    { type: 'sources', note: 'Version-specific facts aur real incident inhi sources se liye gaye.', items: [
      { title: 'MySQL Reference Manual: Semisynchronous Replication', publisher: 'Oracle / MySQL docs', official: true, url: 'https://dev.mysql.com/doc/refman/8.4/en/replication-semisync.html', used: 'Semi-sync behaviour, AFTER_SYNC default wait point, 10 s default timeout aur async fallback, wait_for_replica_count.' },
      { title: 'PostgreSQL docs: Log-Shipping Standby Servers (streaming + synchronous replication)', publisher: 'PostgreSQL Global Development Group', official: true, url: 'https://www.postgresql.org/docs/current/warm-standby.html', used: 'Async default aur data-loss window, synchronous_standby_names (FIRST/ANY), synchronous_commit levels, sync standby na ho to commits wait karte hain.' },
      { title: 'October 21 post-incident analysis', publisher: 'GitHub Blog (2018)', official: true, url: 'https://github.blog/news-insights/company-news/oct21-post-incident-analysis/', used: '43 second partition, Orchestrator cross-region promotion, unreplicated writes, 24 h 11 min degradation.' },
      { title: 'Amazon DynamoDB: A Scalable, Predictably Performant, and Fully Managed NoSQL Database Service', publisher: 'USENIX ATC 2022 (Amazon authors)', official: true, url: 'https://www.usenix.org/system/files/atc22-elhemali.pdf', used: 'Partition replication groups across AZs, Multi-Paxos leader, quorum-acknowledged writes.' },
      { title: 'Dynamo: Amazon\'s Highly Available Key-value Store', publisher: 'SOSP 2007 (Amazon)', official: true, url: 'https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf', used: 'Leaderless replication, N/R/W quorums.' },
      { title: 'Designing Data-Intensive Applications, chapter 5 (Replication)', publisher: "Martin Kleppmann, O'Reilly (2017)", url: 'https://dataintensive.net/', used: 'Leader-follower, multi-leader aur leaderless ki categories; read-your-writes, monotonic reads, consistent prefix reads; LWW aur clock skew ka khatra.' },
      { title: 'Cassandra documentation: Dynamo architecture', publisher: 'Apache Cassandra', official: true, url: 'https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html', used: 'Tunable consistency, R + W > RF overlap.' },
    ]},
  ],
});
