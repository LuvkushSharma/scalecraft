Lesson.register({
  id: 'what-is-system-design',
  title: 'System design kya hai?',
  minutes: 18,
  summary: `System design ka matlab hai decide karna ki ek app ke peeche kaun kaun se "boxes" honge (servers, databases, caches) aur unke beech data kaise behega. Code likhne se pehle ka naksha.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Tum phone pe ek app kholte ho aur page turant aa jaata hai. Ye jaadu nahi hai. Kahin door bahut saare computers milke tumhara kaam kar rahe hain.<br><br>Ye lesson ek hi sawaal ka jawab deta hai: <strong>kitne computers chahiye, har ek kya kaam karega, aur wo aapas mein kaise baat karenge?</strong> Isi plan ko system design kehte hain.` },

    { type: 'h2', text: 'Simple definition' },
    { type: 'p', html: `Jab tum xyz.com kholte ho, tumhe sirf ek page dikhta hai. Lekin uske peeche kai computers kaam kar rahe hote hain. Har computer ka apna kaam hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: System design', html: `<strong>Ye kya hai:</strong> ek app ke peeche ke computers ka plan. Kaunse parts honge, har part kya karega, aur data ek part se doosre tak kaise jaayega.<br><strong>Kyun chahiye:</strong> 10 log aur 1 crore log, dono ke liye ek hi setup kaam nahi karta. Plan pehle banana padta hai.<br><strong>Iske bina:</strong> app chhote traffic pe chalegi, lekin bheed aate hi slow hogi ya band ho jayegi. Aur data kho sakta hai.` },
    { type: 'callout', tone: 'analogy', html: `Ghar banane se pehle architect naksha banata hai: kitne kamre, pipes kahan se jayenge, light kahan aayegi. Eent lagana baad ka kaam hai. System design wahi naksha hai. Code likhna eent lagana hai.` },
    { type: 'p', html: `Diagram mein hum har part ko ek <strong>box</strong> ki tarah draw karte hain. Boxes ke beech <strong>arrows</strong> batate hain ki request kis taraf jaati hai. Lekin ye boxes asli mein kaise dikhte hain? Neeche dekho.` },
    { type: 'image', src: 'assets/img/what-is-system-design/server-room-cern.jpg', alt: 'Ek bade data center ka kamra jismein lambi lambi rows mein metal ki almariyan (server racks) khadi hain', caption: 'Diagram ka har "box" asli duniya mein aisi almariyon mein lage computers hain. Is kamre ko data center kehte hain (ye photo CERN, Geneva ka hai). Bade apps ke aise kai data centers hote hain.', credit: { text: 'Florian Hirzinger, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:CERN_Server_03.jpg', license: 'CC BY-SA 3.0' } },

    { type: 'h2', text: 'Pehle 5 boxes ko pehchaano' },
    { type: 'p', html: `Lagbhag har bade app mein yahi 5 boxes baar baar aate hain. Abhi bas inka naam aur kaam samjho. Har ek ka poora lesson aage aayega.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Request aur Response', html: `<strong>Ye kya hai:</strong> <em>Request</em> ek sawaal hai jo tumhara phone ya browser bhejta hai, jaise "mujhe homepage do". <em>Response</em> uska jawab hai, jaise homepage ka content.<br><strong>Kyun chahiye:</strong> internet pe saara kaam isi sawaal-jawab se hota hai.<br><strong>Example:</strong> tumne xyz.com pe ek photo kholi. Ek request gayi, ek response (photo) aaya.` },
    { type: 'callout', tone: 'term', title: 'Box 1: Server', html: `<strong>Ye kya hai:</strong> ek computer, tumhare laptop jaisa, jo 24 ghante on rehta hai aur internet se juda hai. Tumhara code (app ka logic) isi pe chalta hai.<br><strong>Kyun chahiye:</strong> koi to chahiye jo request le, kaam kare (jaise login check), aur response bheje.<br><strong>Iske bina:</strong> app ka koi dimaag hi nahi. Request bhejoge to sunne wala koi nahi.` },
    { type: 'callout', tone: 'term', title: 'Box 2: Database', html: `<strong>Ye kya hai:</strong> ek program jo data ko <em>disk</em> pe permanently save karta hai aur jaldi dhoondh ke deta hai. Users, posts, comments sab yahin rehte hain.<br><strong>Kyun chahiye:</strong> server ki memory (RAM) temporary hai. Server restart hua to RAM saaf.<br><strong>Iske bina:</strong> restart hote hi saare accounts aur posts gayab.<br><strong>Example:</strong> PostgreSQL, MySQL, MongoDB.` },
    { type: 'callout', tone: 'term', title: 'Box 3: Load Balancer', html: `<strong>Ye kya hai:</strong> servers ke aage khada ek traffic police. Har aane wali request ko dekhta hai aur ek server ko de deta hai.<br><strong>Kyun chahiye:</strong> jab ek server kaafi nahi rehta, hum kai servers lagate hain. Kisi ko to batana padega ki kaunsi request kis server pe jaaye.<br><strong>Iske bina:</strong> saare users ek hi server pe gir padenge, ya users ko khud server choose karna padega.` },
    { type: 'callout', tone: 'term', title: 'Box 4: Cache', html: `<strong>Ye kya hai:</strong> ek chhoti, bahut fast memory jahan hum baar baar maangi jaane wali cheezein rakh lete hain. Data <em>RAM</em> mein hota hai, isliye disk wale database se kai guna fast.<br><strong>Kyun chahiye:</strong> trending posts ko 1 lakh log dekhte hain. Har baar database se poochhna bekaar mehnat hai.<br><strong>Iske bina:</strong> database pe bahut load, sab kuch slow.<br><strong>Example:</strong> Redis, sabse popular cache software.` },
    { type: 'callout', tone: 'term', title: 'Box 5: CDN (Content Delivery Network)', html: `<strong>Ye kya hai:</strong> duniya bhar ke shehron mein rakhe gaye bahut saare chhote servers, jo images aur videos ki copies rakhte hain.<br><strong>Kyun chahiye:</strong> agar server Mumbai mein hai aur user America mein, to har image ko aadhi duniya travel karni padegi. CDN user ke paas wali copy de deta hai.<br><strong>Iske bina:</strong> door ke users ke liye images aur videos bahut slow.` },
    { type: 'callout', tone: 'term', title: 'Do aur words: Bottleneck aur SPOF', html: `<strong>Bottleneck:</strong> system ka wo hissa jo sabse pehle thak jaata hai aur poore system ki speed rok deta hai. Jaise ek patli pipe jisse paani dheere nikalta hai.<br><strong>SPOF (Single Point of Failure):</strong> wo ek hissa jiske girne se poora system gir jaaye. Agar sirf ek server hai, to wahi SPOF hai.` },

    { type: 'h2', text: 'Ek website kaise badi hoti hai' },
    { type: 'p', html: `Neeche diagram mein xyz.com ki poori kahani hai. "Next step" dabao. Dhyaan do: har naya box <strong>kisi problem ke baad</strong> hi aata hai. Phir doosre do scenarios chalao: wahan cheezein tootti hain.` },
    { type: 'flow', title: 'xyz.com: day 1 se 1 crore users tak', height: 340,
      nodes: [
        { id: 'users', label: 'Users', sub: 'browser / app', x: 80, y: 180, w: 120, kind: 'client', info: 'Ye kya hai: wo log jo xyz.com use kar rahe hain, apne browser ya phone app se. Shuru mein 10, baad mein 1 crore. Har user requests bhejta hai.' },
        { id: 'cdn', label: 'CDN', sub: 'images, videos', x: 250, y: 64, w: 130, kind: 'net', hidden: true, info: 'Ye kya hai: duniya bhar mein faile chhote servers jo images aur videos ki copies rakhte hain. Kyun: Chennai ka user Chennai ke paas wali copy le leta hai, America se nahi. Iska poora lesson Phase 2 mein hai.' },
        { id: 'lb', label: 'Load Balancer', sub: 'traffic baantna', x: 250, y: 180, w: 140, kind: 'edge', hidden: true, info: 'Ye kya hai: servers ke aage khada traffic police. Iska ek hi sawaal hai: "ye request kaunse server ko doon?" Kyun: ab kai servers hain, kisi ko traffic baantna padega.' },
        { id: 's1', label: 'Server 1', sub: 'code + data', x: 440, y: 120, w: 130, kind: 'server', meter: true, load: 10, info: 'Ye kya hai: application server, yaani wo computer jahan tumhara code chalta hai. Request aati hai, ye logic chalata hai, response bhejta hai. Meter dikhata hai ki ye kitna busy hai.' },
        { id: 's2', label: 'Server 2', sub: 'same code', x: 440, y: 250, w: 130, kind: 'server', meter: true, hidden: true, info: 'Ye kya hai: Server 1 ki exact copy, same code. Kyun: do servers matlab double capacity, aur ek gire to doosra chalta rahe.' },
        { id: 'cache', label: 'Cache', sub: 'Redis, RAM mein', x: 630, y: 90, w: 130, kind: 'cache', hidden: true, info: 'Ye kya hai: fast memory (RAM) jahan baar baar maangi jaane wali cheezein rakhi jaati hain. Kyun: RAM se padhna disk wale database se kai guna fast hai, aur database ko aaraam milta hai.' },
        { id: 'db', label: 'Database', sub: 'permanent data', x: 630, y: 250, w: 130, kind: 'data', meter: true, hidden: true, info: 'Ye kya hai: wo program jo data ko disk pe permanently rakhta hai: users, posts, comments. Kyun: server restart ho jaye to bhi data safe rahe.' },
      ],
      edges: [
        { a: 'users', b: 's1', id: 'direct' },
        { a: 'users', b: 'cdn' }, { a: 'users', b: 'lb' },
        { a: 'lb', b: 's1' }, { a: 'lb', b: 's2' },
        { a: 's1', b: 'cache' }, { a: 's2', b: 'cache' },
        { a: 's1', b: 'db' }, { a: 's2', b: 'db' },
      ],
      scenarios: [{ name: 'xyz.com ka safar', intro: 'Day 1: tumne xyz.com banaya. Ek hi server hai. "Start" dabao.', steps: [
        { title: 'Day 1: kuch users, ek server', text: 'Sab kuch ek hi machine pe: code bhi, data bhi. 10-20 users ke liye ye bilkul theek hai. Simple cheez se shuru karna hi sahi hai.', go: ['users>s1', 'res:s1>users'] },
        { title: 'Problem: server restart hua, data gayab', text: 'Data server ki RAM mein tha. Restart pe RAM saaf ho gayi. <strong>Solution:</strong> data ko alag Database mein rakho jo disk pe permanently save karta hai.', show: ['db'], set: { s1: { sub: 'sirf code' } }, go: ['users>s1>db', 'res:db>s1>users'] },
        { title: 'Problem: 10,000 users aa gaye', text: 'Ek server ki ek limit hai: kitna CPU (sochne ki taakat) aur kitni RAM. Dekho meter red ho gaya. Requests slow ho rahi hain, kuch fail bhi. Server ab <strong>bottleneck</strong> hai.', flood: { paths: ['users>s1'], n: 14 }, after: { s1: { load: 96, state: 'hot', sub: 'overloaded!' } } },
        { title: 'Solution: Load Balancer + Server 2', text: 'Ek aur server lagaya (same code). Aage Load Balancer rakha jo decide karta hai kaunsi request kis server pe jaaye. Load aadha aadha baant gaya.', show: ['lb', 's2'], hide: ['direct'], set: { s1: { load: 50, state: '', sub: 'same code' }, s2: { load: 50 } }, flood: { paths: ['users>lb>s1', 'users>lb>s2'], n: 10 } },
        { title: 'Problem: database har request pe pareshan', text: 'Har page ke liye database se poochhna padta hai. Database ab naya bottleneck ban gaya (meter dekho).', set: { db: { load: 92, state: 'hot' } }, go: ['users>lb>s1>db', 'res:db>s1>lb>users'] },
        { title: 'Solution: Cache', text: 'Jo data baar baar maanga jaata hai (jaise trending posts), usse cache mein RAM mein rakh liya. Ab zyada requests cache se hi answer ho jaati hain. Database ko aaraam.', show: ['cache'], set: { db: { load: 30, state: '' } }, go: ['users>lb>s1>cache', 'res:cache>s1>lb>users'], after: { cache: { state: 'hit' } } },
        { title: 'Problem: users duniya bhar se, images slow', text: 'Server India mein hai, user America mein. Har image ko aadhi duniya travel karni padti hai. <strong>Solution:</strong> CDN, jo images aur videos users ke paas wale servers pe copy karke rakhta hai.', show: ['cdn'], set: { cache: { state: '' } }, go: ['users>cdn', 'res:cdn>users'] },
        { title: 'Ye hai har bade system ka skeleton', text: 'Users → CDN / Load Balancer → Servers → Cache → Database. YouTube, Uber, ChatGPT sab isi skeleton se badhte hain. Course mein hum har box ko alag alag, detail mein padhenge.' },
      ]},
      { name: 'Server crash (SPOF)', intro: 'Pehle ek hi server hai. Wo crash ho jaata hai. Phir dekhte hain do servers kaise bachate hain.', steps: [
        { title: 'Ek hi server, aur wo gir gaya', text: 'Bijli gayi, ya code mein bug aaya. Server band. Request aadhe raste mein kho gayi.', show: ['db'], go: 'lost:users>s1', after: { s1: { state: 'down', sub: 'DOWN' } } },
        { title: 'Poori website band', text: 'Database theek hai, lekin uske paas pahunchne wala koi nahi. Ek server = <strong>SPOF</strong>. Users ko error dikhta hai.', focus: ['s1'], msg: 'Error: site can\'t be reached' },
        { title: 'Fix: do servers + Load Balancer', text: 'Ab Load Balancer hai aur Server 2 bhi. Load Balancer dekhta hai ki Server 1 jawab nahi de raha, to saari requests Server 2 ko bhejta hai.', show: ['lb', 's2'], hide: ['direct'], go: ['users>lb>s2>db', 'res:db>s2>lb>users'], set: { s2: { load: 80 } } },
        { title: 'Site chalu, thodi slow', text: 'Ek server ka kaam ab ek hi server kar raha hai, to load zyada hai. Lekin site band nahi hui. Naya sawaal: agar Load Balancer khud gira to? Iska jawab Load Balancer lesson mein.', focus: ['lb', 's2'] },
      ]},
      { name: 'Cache down', intro: 'Sab boxes lage hain. Achanak cache band ho jaata hai.', steps: [
        { title: 'Server cache se poochhta hai', text: 'Request aayi. Server pehle cache dekhta hai, lekin cache jawab nahi deta.', show: ['lb', 's2', 'cache', 'db'], hide: ['direct'], go: 'users>lb>s1>cache', after: { cache: { state: 'down', sub: 'DOWN' } } },
        { title: 'Saari requests database pe', text: 'Ab har request seedha database pe. Jo kaam cache aaraam se karta tha, wo sab database pe gir pada. Meter dekho.', flood: { paths: ['users>lb>s1>db', 'users>lb>s2>db'], n: 12 }, after: { db: { load: 97, state: 'hot', sub: 'bahut load!' } } },
        { title: 'Sabak', text: 'Data safe hai, kyunki asli data database mein hai. Lekin site slow ho gayi. Cache speed ke liye hai, data rakhne ke liye nahi. Isliye database ko itna mazboot rakhna padta hai ki cache gire to bhi kuch der jhel sake.', focus: ['db'] },
      ]}],
    },
    { type: 'callout', tone: 'mistake', html: `Beginners ko lagta hai ki achha design matlab zyada boxes. Ulta hai. Har box paisa leta hai, sambhalna padta hai, aur toot bhi sakta hai. <strong>Rule: problem aane pe solution lagao, pehle nahi.</strong>` },

    { type: 'h2', text: 'Monolith: shuru karne ka sahi tareeka' },
    { type: 'callout', tone: 'term', title: 'Naya word: Monolith', html: `<strong>Ye kya hai:</strong> poora app ek hi program mein. Login, posts, search, payments, sab ek hi codebase mein, ek saath deploy hote hain.<br><strong>Kyun chahiye:</strong> shuru mein team chhoti hai aur features jaldi badalte hain. Ek program banana, test karna aur chalana sabse aasaan hai.<br><strong>Iske bina:</strong> agar day 1 se app ko 10 chhote programs (<em>microservices</em>) mein todoge, to unke beech network calls, alag deployments aur debugging ka jhanjhat bina wajah aa jayega.` },
    { type: 'p', html: `Monolith "purana" ya "galat" nahi hai. Bahut saari badi companies ne monolith se shuru kiya aur saalon tak usi pe chalin. Monolith ko bhi Load Balancer ke peeche kai copies mein chala sakte ho, jaise upar diagram mein Server 1 aur Server 2.` },
    { type: 'compare',
      left: { title: 'Monolith kab theek hai', html: `• Team chhoti hai (1-15 log)<br>• Product abhi ban raha hai, roz badal raha hai<br>• Traffic itna hai ki kuch servers kaafi hain<br>• Tumhe jaldi launch karna hai` },
      right: { title: 'Todne ka time kab aata hai', html: `• Kai teams ek hi code pe ek doosre ka kaam rok rahi hain<br>• Ek hissa (jaise video processing) baaki se bahut alag scale maangta hai<br>• Ek chhota bug poora app gira deta hai<br>• Iska poora lesson: "Architecture styles" (Phase 3)` },
    },

    { type: 'h2', text: 'HLD vs LLD' },
    { type: 'callout', tone: 'term', title: 'Naya word: HLD aur LLD', html: `<strong>HLD (High-Level Design):</strong> door se dekha gaya naksha. Kaunse boxes (servers, database, cache, queue) honge aur arrows kaise chalenge.<br><strong>LLD (Low-Level Design):</strong> ek box ke andar zoom karke dekhna. Kaunsi classes, functions, aur code kaise likha jaayega.` },
    { type: 'table', head: ['', 'High-Level Design (HLD)', 'Low-Level Design (LLD)'], rows: [
      ['Kya decide karta hai', 'Kaunse boxes (services, DB, cache, queue) aur arrows', 'Ek box ke andar classes, functions, code'],
      ['xyz.com example', '"Profile data Redis mein cache hoga, PostgreSQL mein store"', '"UserService class mein getProfile() method"'],
      ['Kaun poochhta hai', 'System design interview, architecture review', 'Machine coding / OOP interview, code review'],
      ['Ye course', 'Yahi padhenge', 'Alag topic hai'],
    ]},

    { type: 'h2', text: 'Functional vs non-functional requirements' },
    { type: 'p', html: `Design shuru karne se pehle do tarah ke sawaal poochhte hain. Pehla: app <em>kya</em> karega? Doosra: app <em>kitna achha</em> karega?` },
    { type: 'callout', tone: 'term', title: 'Naya word: Requirements', html: `<strong>Functional requirement:</strong> app kya kar sakta hai, yaani features. "User post daal sake."<br><strong>Non-functional requirement:</strong> app kitna fast, kitna bharosemand, kitna bada hai. "Page 200 ms mein khule." Ye features nahi, qualities hain.` },
    { type: 'compare',
      left: { title: 'Functional: kya karega?', html: `xyz.com ke liye:<br>• User sign up kar sake<br>• User post daal sake<br>• User doosron ki posts dekh sake<br>• User search kar sake` },
      right: { title: 'Non-functional: kitna achha?', html: `• Page 200 ms mein khule (latency)<br>• 99.9% time chalu rahe (availability)<br>• 1 crore users handle kare (scale)<br>• Post kabhi gum na ho (durability)` },
    },
    { type: 'p', html: `Non-functional words har interview mein aate hain. Har ek ka simple matlab, aur kaunsa box usme madad karta hai:` },
    { type: 'table', head: ['Word', 'Simple matlab', 'xyz.com number', 'Kaunsa box madad karta hai'], rows: [
      ['Latency', 'Ek request ka jawab aane mein kitna time', '200 ms se kam', 'Cache, CDN'],
      ['Availability', 'Kitna time site chalu rehti hai', '99.9% = saal mein ~8.8 ghante band', 'Kai servers + Load Balancer'],
      ['Scale', 'Kitne users / requests jhel sakta hai', '1 crore users/din', 'Load Balancer, zyada servers'],
      ['Durability', 'Save kiya data kabhi kho na jaaye', '0 posts gum', 'Database (aur uski copies)'],
      ['Consistency', 'Sabko same, latest data dikhe', 'Like count sabko same', 'Database design (Phase 3)'],
      ['Cost', 'Mahine ka kharcha', '₹50,000/mahina budget', 'Kam boxes, sahi size'],
    ], caption: '1 ms = second ka hazaarwan hissa. 200 ms = second ka paanchwan hissa.' },
    { type: 'callout', tone: 'why', html: `Functional requirements batate hain <strong>kaunse features</strong> banane hain. Non-functional requirements batate hain <strong>kaunse boxes</strong> lagane hain. "1 crore users" sunte hi tumhe Load Balancer aur caching yaad aana chahiye. Yahi skill ye course banayega.` },

    { type: 'h3', text: 'Khud try karo: requirements se boxes tak' },
    { type: 'p', html: `Neeche users ki ginti badlo aur requirements tick karo. Widget batayega ki xyz.com ko kaunse boxes chahiye, aur <em>kyun</em>. Dekho ki 50 users pe kitna kam chahiye, aur 1 crore pe kitna zyada.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Users per din</label><select class="wsd-u">
            <option value="50">50</option><option value="10000">10,000</option><option value="1000000">10 lakh</option><option value="10000000" selected>1 crore</option></select></div>
          <div class="wsd-checks" style="display:flex;flex-direction:column;gap:6px;font-size:14px">
            <label><input type="checkbox" class="wsd-g"> Users duniya bhar se</label>
            <label><input type="checkbox" class="wsd-m"> Bahut saari photos / videos</label>
            <label><input type="checkbox" class="wsd-a" checked> Site band nahi honi chahiye (99.9%+)</label>
            <label><input type="checkbox" class="wsd-r" checked> Same data baar baar padha jaata hai</label>
          </div>
        </div>
        <div class="stats">
          <div class="stat"><span>Peak requests / second</span><strong class="wsd-rps"></strong></div>
          <div class="stat"><span>Servers chahiye</span><strong class="wsd-sv"></strong></div>
          <div class="stat"><span>Boxes ki ginti</span><strong class="wsd-nb"></strong></div>
        </div>
        <div class="wsd-out" style="display:flex;flex-direction:column;gap:6px;margin-top:10px"></div>
        <div class="calc-note">Andaaza: har user din mein ~20 requests karta hai. Sabse busy time pe traffic average ka 3 guna hota hai. Ek simple server ~500 requests/second sambhal leta hai. Asli number app pe depend karta hai; tareeka yahi rehta hai.</div>`;
      const q = s => el.querySelector(s);
      const row = (name, why, on) => `<div style="display:flex;gap:10px;align-items:flex-start;padding:8px 10px;border:1px solid var(--line);border-radius:var(--r-sm);background:${on ? 'var(--surface-2)' : 'transparent'};opacity:${on ? 1 : 0.6}"><strong style="min-width:118px;color:${on ? 'var(--ink)' : 'var(--ink-3)'}">${on ? '✓' : '–'} ${name}</strong><span style="color:var(--ink-2);font-size:14px">${why}</span></div>`;
      const upd = () => {
        const users = Number(q('.wsd-u').value), G = q('.wsd-g').checked, M = q('.wsd-m').checked, A = q('.wsd-a').checked, R = q('.wsd-r').checked;
        const rps = users * 20 / 86400 * 3;
        let sv = Math.max(1, Math.ceil(rps / 500)); if (A) sv = Math.max(2, sv);
        const lb = sv >= 2, cache = R && rps >= 50, cdn = G || M;
        q('.wsd-rps').textContent = rps < 1 ? rps.toFixed(2) : Math.round(rps).toLocaleString('en-IN');
        q('.wsd-sv').textContent = sv;
        q('.wsd-nb').textContent = sv + 1 + (lb ? 1 : 0) + (cache ? 1 : 0) + (cdn ? 1 : 0);
        q('.wsd-out').innerHTML = [
          row('Server', sv === 1 ? 'Ek server kaafi hai. Load bahut kam hai.' : `${sv} servers, kyunki ${A && Math.ceil(rps / 500) < 2 ? 'ek gire to doosra chale (availability).' : 'ek server ~500 req/s hi sambhal sakta hai.'}`, true),
          row('Database', 'Hamesha chahiye: data disk pe permanently save hona chahiye.', true),
          row('Load Balancer', lb ? 'Kai servers hain, to traffic baantne wala chahiye.' : 'Ek hi server hai, baantne ko kuch nahi.', lb),
          row('Cache', cache ? 'Same data baar baar padha jaata hai aur traffic bada hai. Database ko bachao.' : (R ? 'Traffic itna kam hai ki database aaraam se sambhal lega. Abhi zarurat nahi.' : 'Har baar alag data maanga jaata hai, cache ka faayda kam.'), cache),
          row('CDN', cdn ? 'Photos/videos ya door ke users: copies users ke paas rakho.' : 'Users paas hain aur bhaari files kam. Abhi zarurat nahi.', cdn),
        ].join('');
      };
      el.querySelectorAll('select, input').forEach(i => i.addEventListener('input', upd));
      el.querySelectorAll('input[type=checkbox]').forEach(i => i.addEventListener('change', upd));
      upd();
    }},
    { type: 'p', html: `Try karke dekho: <strong>50 users</strong> aur sab boxes untick karo. Sirf <strong>Server + Database</strong> bachte hain. <strong>1 crore users</strong> pe peak ~6,944 requests/second hoti hain, yaani ~14 servers, Load Balancer aur cache. Same app, bilkul alag design. Isliye requirements pehle poochhte hain.` },

    { type: 'h2', text: 'Architecture diagram kaise padhein' },
    { type: 'p', html: `Har lesson ke end mein ek bada diagram hai. Use padhne ke 5 simple rules:` },
    { type: 'steps', items: [
      { t: 'Box = ek component', d: 'Har box ek computer ya program hai: server, database, cache. Box ka colour uska type batata hai (Welcome page pe colours ki table hai).' },
      { t: 'Arrow = request ka raasta', d: 'Arrow batata hai ki kaun kisko request bhejta hai. Arrow ki nok jis taraf hai, request udhar jaati hai. Jawab usi raaste se wapas aata hai.' },
      { t: 'Number = order', d: 'Arrows pe 1, 2, 3 likha ho to wahi sequence hai. Pehle 1 hota hai, phir 2.' },
      { t: 'Dashed line = "baad mein" ya "kabhi kabhi"', d: 'Dashed arrow ka matlab hai ki ye kaam request ke saath turant nahi hota, ya sirf kuch cases mein hota hai.' },
      { t: 'Left se right padho', d: 'Aksar users left mein, data right mein hota hai. Ek request ko users se database tak ungli se follow karo. Phir socho: ye box gire to kya hoga?' },
    ]},

    { type: 'h2', text: 'Trade-off: har choice ki ek keemat' },
    { type: 'callout', tone: 'term', title: 'Naya word: Trade-off', html: `<strong>Ye kya hai:</strong> ek cheez paane ke liye doosri cheez chhodna. Cache lagaya to speed mili, lekin kharcha aur "purana data dikhne" ka risk aaya.<br><strong>Kyun zaroori hai:</strong> system design mein koi box free nahi aata. Har box kuch deta hai aur kuch leta hai.` },
    { type: 'callout', tone: 'mistake', html: `System design mein ek "sahi answer" nahi hota. Har choice ek <strong>trade-off</strong> hai: kuch milta hai, kuch chukana padta hai. Achha designer wo hai jo bata sake ki usne kya choose kiya aur <em>kyun</em>.` },

    { type: 'h2', text: 'Decide: kaunsi requirement sabse zaroori?' },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `Ek cab booking app socho (jaise Uber, ya xyz.com ka "xyz Rides").<br><strong>Functional:</strong> ride book karna, driver ko live map pe dekhna, payment karna, ride rate karna.<br><strong>Non-functional:</strong> availability (app chalu rahe), latency (booking 2 second mein), scale (shaam ki bheed), consistency (ek driver do logon ko na mile).<br><strong>Shanivaar raat 8 baje sabse zyada kya chubhega?</strong> Availability. App band = koi ride nahi = seedha paisa aur users ka bharosa gaya, aur log doosra app khol lenge. Isliye peak time ke liye extra servers aur "ek gire to doosra" wala design pehle banta hai.` },

    { type: 'diagram', title: 'xyz.com: poori picture, ek nazar mein', height: 490,
      groups: [
        { label: 'Users', x: 10, y: 140, w: 140, h: 120 },
        { label: 'Edge', x: 205, y: 30, w: 170, h: 380 },
        { label: 'Servers', x: 390, y: 150, w: 160, h: 330 },
        { label: 'Data', x: 565, y: 80, w: 150, h: 390 },
      ],
      nodes: [
        { id: 'users', label: 'Users', sub: 'browser / app', x: 80, y: 200, w: 120, kind: 'client', info: 'Ye kya hai: xyz.com ke users, browser ya phone app se. Har kahani yahin se shuru hoti hai: user ek request bhejta hai.' },
        { id: 'cdn', label: 'CDN', sub: 'images, videos', x: 290, y: 90, w: 130, kind: 'net', info: 'Ye kya hai: users ke paas rakhe chhote servers jo photos aur videos ki copies dete hain. Kyun yahan: bhaari files door ke server se na aayein, paas se aayein.' },
        { id: 'lb', label: 'Load Balancer', sub: 'traffic police', x: 290, y: 320, w: 140, kind: 'edge', info: 'Ye kya hai: servers ke aage ka traffic police. Kyun yahan: kai servers hain, har request ko ek theek server pe bhejna hai, aur gire hue server ko chhodna hai.' },
        { id: 's1', label: 'Server 1', sub: 'monolith code', x: 470, y: 220, w: 130, kind: 'server', info: 'Ye kya hai: wo computer jahan xyz.com ka code (ek monolith) chalta hai. Kyun yahan: request ka asli kaam yahi karta hai: login check, post banana, page taiyaar karna.' },
        { id: 's2', label: 'Server 2', sub: 'same code', x: 470, y: 420, w: 130, kind: 'server', info: 'Ye kya hai: Server 1 ki copy. Kyun yahan: zyada traffic ke liye double capacity, aur Server 1 gire to site chalti rahe.' },
        { id: 'cache', label: 'Cache', sub: 'Redis (RAM)', x: 640, y: 150, w: 120, kind: 'cache', info: 'Ye kya hai: RAM mein rakhi fast copy, baar baar maange jaane wale data ki. Kyun yahan: database ka load kam aur jawab jaldi.' },
        { id: 'db', label: 'Database', sub: 'PostgreSQL', x: 640, y: 420, w: 120, kind: 'data', info: 'Ye kya hai: data ka permanent ghar, disk pe. Kyun yahan: users, posts, comments kabhi kho na jaayein. Cache khaali ho jaaye to bhi asli data yahin hai.' },
      ],
      edges: [
        { a: 'users', b: 'lb', n: 1, label: 'request' },
        { a: 'users', b: 'cdn', label: 'images', dashed: true },
        { a: 'lb', b: 's1', n: 2 },
        { a: 'lb', b: 's2' },
        { a: 's1', b: 'cache', n: 3 },
        { a: 's1', b: 'db', n: 4 },
        { a: 's2', b: 'cache' },
        { a: 's2', b: 'db' },
      ],
      paths: [
        { name: 'Page request', text: 'User → Load Balancer (1) → Server 1 (2) → pehle Cache (3). Cache mein na mile to Database (4). Jawab usi raaste wapas.', go: ['users>lb>s1>cache', 's1>db'] },
        { name: 'Photo / video', text: 'Bhaari files CDN se aati hain, jo user ke paas hai. Server ko pata bhi nahi chalta.', go: ['users>cdn'] },
        { name: 'Server 1 gira', text: 'Load Balancer gire hue Server 1 ko chhod deta hai. Requests Server 2 pe jaati hain. Site chalu rehti hai.', go: ['users>lb>s2>cache', 's2>db'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>System design = kaunse boxes, har box ka kaam, aur unke beech data kaise behega. Code se pehle ka naksha.</li>
      <li>5 basic boxes: Server (code chalata hai), Database (data permanently), Load Balancer (traffic baantta hai), Cache (fast copy), CDN (files users ke paas).</li>
      <li>Har box kisi problem ki wajah se aata hai. Problem nahi, to box nahi.</li>
      <li>Monolith se shuru karna sahi hai. Todna tab, jab dard ho.</li>
      <li>HLD = boxes aur arrows. LLD = ek box ke andar ka code.</li>
      <li>Functional = kya karega. Non-functional = kitna fast, kitna chalu, kitna bada, kitna sasta.</li>
      <li>Har choice ek trade-off hai. "Kyun" bata pao, wahi achha design hai.</li>
    </ul>` },

    { type: 'tradeoffs', gains: ['Zyada boxes = zyada users jhel sakte ho (scale)', 'Copies (2 servers) = ek gire to bhi site chalu', 'Cache aur CDN = pages aur images jaldi', 'Plan pehle = baad mein kam todna-phodna'], costs: ['Har box ka kharcha (servers ka kiraya)', 'Har box ek aur cheez jo toot sakti hai', 'Zyada boxes = samajhna aur debug karna mushkil', 'Cache = purana data dikhne ka risk'] },

    { type: 'think', questions: [
      { q: 'xyz.com pe sirf 50 log aate hain. Kya hume Load Balancer aur Cache lagana chahiye?', a: 'Nahi. Ek server aaraam se 50 users handle kar lega. Extra components matlab extra cost, extra cheezein jo toot sakti hain, aur extra complexity. Rule: problem aane pe solution lagao, pehle nahi. (Widget mein 50 users chuno aur dekho.)' },
      { q: 'Diagram mein Load Balancer lagane se kaunsi do problems solve huin?', a: '1) Capacity: load do servers mein baant gaya. 2) Reliability: ab ek server gire to doosra chalta rahega ("Server crash" scenario). Lekin dhyaan do, ab Load Balancer khud ek naya box ban gaya jo gir sakta hai. Iska solution Load Balancer lesson mein.' },
      { q: 'Ek video app (jaise xyz TV) ke liye 4 functional aur 4 non-functional requirements likho. IPL final ki raat kaunsi non-functional requirement sabse zyada chubhegi?', a: 'Functional: video dekhna, search, account banana, subscription lena. Non-functional: availability, latency (video jaldi shuru ho), scale (crores log ek saath), cost (video bhejna mehnga hai). Final ki raat availability aur scale sabse zaroori: app band hua to crores log naraz, aur ye raat dobara nahi aayegi.' },
    ]},
    { type: 'quiz', questions: [
      { q: '"Page 200 ms mein khulna chahiye" kis type ki requirement hai?', options: ['Functional', 'Non-functional', 'LLD'], answer: 1, explain: 'Ye feature nahi, quality hai: system kitna fast hai. Latency, availability, scale, durability sab non-functional hain.' },
      { q: 'xyz.com ka data server restart pe gayab ho gaya. Kya missing tha?', options: ['Load Balancer', 'Database jo disk pe data rakhe', 'CDN'], answer: 1, explain: 'Server ki memory (RAM) temporary hoti hai. Permanent data ke liye Database chahiye jo disk pe likhta hai.' },
      { q: 'Kaunsa component "ye request kaunse server pe jaaye?" decide karta hai?', options: ['Cache', 'CDN', 'Load Balancer'], answer: 2, explain: 'Load Balancer ka yahi ek kaam hai. Cache fast copy rakhta hai, CDN files users ke paas rakhta hai.' },
      { q: 'Cache band ho gaya. Kya hoga?', options: ['Saara data hamesha ke liye gaya', 'Site slow hogi kyunki saara load database pe aayega', 'Kuch nahi, cache ka koi kaam hi nahi'], answer: 1, explain: 'Cache sirf fast copy hai. Asli data database mein safe hai. Lekin ab har request database pe jaati hai, to database pe load badhta hai aur site slow hoti hai.' },
      { q: 'Ek naya startup, 3 developers, pehla version banana hai. Sabse samajhdaar shuruaat?', options: ['Day 1 se 20 microservices', 'Ek monolith, ek server aur ek database', 'Pehle 5 countries mein CDN'], answer: 1, explain: 'Monolith sabse jaldi banta, test hota aur chalta hai. Problem aane pe hi naye boxes lagao.' },
    ]},
  ],
});
