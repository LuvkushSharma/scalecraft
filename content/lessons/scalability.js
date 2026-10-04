Lesson.register({
  id: 'scalability',
  title: 'Scalability: vertical vs horizontal',
  minutes: 24,
  summary: `Scalability ka matlab: users 100 guna badhein to system bhi bina toote badh sake. Iske do tareeke hain: machine ko bada karo (vertical) ya machines badhao (horizontal). Horizontal tabhi aasaan hai jab servers "stateless" hon, isliye sessions ko server se bahar rakhte hain. Aur jab traffic din bhar upar neeche hota hai, to autoscaling apne aap servers jodta aur hatata hai. Is lesson mein dono tareekon ki limits, kharcha, sessions ke teen tareeke, aur autoscaling ka simulator.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Tumhari website pe kal 1,000 log aaye the. Aaj ek video viral hua aur 1 lakh log aa gaye. Ek computer itne logon ka kaam nahi kar paata, site atak jaati hai.<br>Do hi raaste hain: <strong>ek bada, zyada taakatwar computer</strong> le aao, ya <strong>bahut saare normal computer</strong> lagao jo kaam aapas mein baant lein.<br>Is lesson mein dekhenge ki dono kab kaam aate hain, kab fail hote hain, aur computers ko "bhulakkad" (stateless) kyun banana padta hai taaki kaam baantna aasaan ho.` },

    { type: 'h2', text: 'Problem: xyz.com viral ho gaya' },
    { type: 'p', html: `xyz.com abhi ek hi server pe chalta hai. Server ek computer hai jo users ki requests ka jawab deta hai (pichhle lessons mein dekha). Kal 1,000 users the, aaj 1 lakh.` },
    { type: 'callout', tone: 'term', title: 'Naye words: CPU aur RAM', html: `<strong>Ye kya hai:</strong> <strong>CPU</strong> computer ka "dimaag" hai jo hisaab aur kaam karta hai. Uske andar kai <strong>cores</strong> hote hain; har core ek waqt mein ek kaam kar sakta hai. Cloud mein inhe aksar <strong>vCPU</strong> (virtual CPU) mein ginte hain. <strong>RAM</strong> computer ki tez, chhoti, kaam-chalau memory hai jahan abhi chal rahe kaam ka data rakha jaata hai.<br><strong>Kyun chahiye:</strong> har request thoda CPU time aur thodi RAM khaati hai. Server kitni requests sambhal sakta hai, ye inhi se tay hota hai.<br><strong>Iske bina:</strong> CPU full = requests line mein lagti hain. RAM full = server bahut slow ya crash.` },
    { type: 'p', html: `Ek server ke paas fixed CPU aur RAM hai. Ek point ke baad aur capacity nahi bachti: requests line mein lagti hain, page slow hota hai, phir <strong>timeout</strong> (user ka browser itna ruk ke haar maan leta hai aur error dikhata hai).` },
    { type: 'callout', tone: 'term', title: 'Naya word: Scalability', html: `<strong>Ye kya hai:</strong> system ki wo khoobi ki load (users, requests, data) badhne pe hum resources jod ke usse sambhal sakein, bina system dobara banaye aur bina speed giraye.<br><strong>Kyun chahiye:</strong> xyz.com ke users din ba din badh rahe hain. Aaj ka setup kal ke traffic pe toot jaayega.<br><strong>Iske bina:</strong> har baar traffic badhne pe site down, aur engineers raat bhar aag bujhaate rahenge.<br><strong>Example:</strong> 1,000 se 1 lakh users (100 guna) hue. Agar 100 guna servers jod ke site pehle jitni fast rahe, to system scalable hai.` },
    { type: 'p', html: `Scalability ke do raaste hain. Pehla aur sabse simple jawab: <strong>machine badi kar do</strong>.` },

    { type: 'h2', text: 'Vertical scaling: badi machine' },
    { type: 'callout', tone: 'term', title: 'Naya word: Vertical scaling (scale up)', html: `<strong>Ye kya hai:</strong> wahi ek server, lekin zyada CPU cores, zyada RAM, tez disk ke saath. Jaise apna phone bech ke ek bada, tez phone le aana.<br><strong>Kyun chahiye:</strong> code mein ek line badle bina capacity badh jaati hai. Shuruaat mein yahi sabse sasta aur tez raasta hai.<br><strong>Iske bina:</strong> chhote traffic ke liye bhi tumhe kai machines, Load Balancer aur unka setup sambhalna padta, jo shuruaat mein bekaar ki mehnat hai.<br><strong>Example:</strong> 4 vCPU, 8 GB RAM wala server hata ke 32 vCPU, 128 GB RAM wala lagaya. Lagbhag 8 guna capacity.` },
    { type: 'p', html: `Neeche chala ke dekho. Har box pe click karo to uski explanation milegi. Meter dikhata hai ki server kitna busy hai: green theek, orange tight, red overloaded.` },
    { type: 'flow', height: 240,
      nodes: [
        { id: 'u', label: 'Users', sub: 'badhte ja rahe', x: 90, y: 120, w: 140, kind: 'client', info: 'Ye kya hai: xyz.com kholne wale log, phone aur laptop pe. Har click ek request ban ke server tak jaata hai. Inki ginti hi load hai.' },
        { id: 'net', label: 'Internet', x: 260, y: 120, w: 120, kind: 'net', info: 'Ye kya hai: wo network jisse user ki request server tak pahunchti hai (DNS, routers, cables). Is lesson mein ye sirf raasta hai, iski capacity ki chinta nahi.' },
        { id: 's', label: 'Server', sub: '4 vCPU, 8 GB RAM', x: 460, y: 120, w: 200, h: 66, kind: 'server', meter: true, load: 20, info: 'Ye kya hai: xyz.com ka code chalane wala akela computer. Vertical scaling mein isi ko bada karte hain. Meter = CPU kitna busy hai.' },
        { id: 'db', label: 'Database', x: 650, y: 120, w: 120, kind: 'data', info: 'Ye kya hai: wo jagah jahan users, posts jaise data hamesha ke liye save hota hai. Server har request pe isse data maangta hai.' },
      ],
      edges: [{ a: 'u', b: 'net' }, { a: 'net', b: 's' }, { a: 's', b: 'db' }],
      scenarios: [
        { name: 'Badi machine lagao', steps: [
          { title: '1,000 users: aaraam', text: 'Server 30% busy. Sab mast.', flood: { paths: ['u>net>s>db'], n: 4 }, after: { s: { load: 30 } } },
          { title: '10,000 users: server haanf raha hai', text: 'CPU 95%. Requests line mein lag rahi hain, pages slow.', flood: { paths: ['u>net>s'], n: 14 }, after: { s: { load: 95, state: 'hot' } } },
          { title: 'Vertical scaling: bada server', text: 'Same code, bas machine 8 guna badi. Code mein ek line nahi badli. Isliye vertical scaling pehla, sabse aasaan step hai.', set: { s: { label: 'Bada server', sub: '32 vCPU, 128 GB RAM', load: 25, state: '' } }, flood: { paths: ['u>net>s>db'], n: 8 } },
          { title: '1 crore users: sabse badi machine bhi full', text: 'Machines ki ek limit hai. Isse badi machine bazaar mein hai hi nahi. Upar se ye abhi bhi <strong>ek</strong> machine hai.', flood: { paths: ['u>net>s'], n: 16 }, after: { s: { load: 100, state: 'hot', sub: 'isse bada koi nahi' } } },
        ]},
        { name: 'Upgrade ka downtime', intro: 'Machine badi karne ke liye usse band karna padta hai. Us waqt kya hota hai?', steps: [
          { title: 'Upgrade shuru: server band', text: 'Cloud mein bhi machine ka size badalne ke liye aksar usse stop karke naye size pe start karna padta hai. Kuch minute ke liye server hai hi nahi.', set: { s: { state: 'down', sub: 'resize ho raha', load: 0 } } },
          { title: 'Users ko error', text: 'Request internet tak aati hai, aage koi jawab dene wala nahi. User ko "site can\'t be reached" dikhta hai.', go: 'lost:u>net>s', msg: 'connection refused' },
          { title: 'Wapas chalu, bada server', text: 'Kuch minute baad naya bada server chalu. Isliye upgrades raat 3 baje kiye jaate hain, jab users sabse kam hon. Phir bhi kuch log pareshan hue.', set: { s: { state: 'ok', label: 'Bada server', sub: '32 vCPU, 128 GB RAM', load: 20 } }, go: ['u>net>s>db', 'res:db>s>net>u'] },
        ]},
        { name: 'Machine crash', intro: 'Hardware kabhi bhi kharab ho sakta hai: disk, power supply, memory chip.', steps: [
          { title: 'Server ka power supply jal gaya', text: 'Kitna bhi bada server ho, hai to ek hi.', set: { s: { state: 'down', sub: 'DOWN', load: 0 } }, focus: ['s'] },
          { title: 'Poori website band', text: 'Database theek hai, internet theek hai, lekin beech ka akela server gaya to sab gaya. Ise <strong>Single Point of Failure (SPOF)</strong> kehte hain. Agle lesson mein iska poora ilaaj.', go: 'lost:u>net>s', msg: '502 / timeout' },
        ]},
      ],
    },
    { type: 'h3', text: 'Vertical scaling ki teen deewarein' },
    { type: 'list', items: [
      `<strong>Hard limit (ceiling):</strong> ek machine kitni bhi badi ho, uski hadd hai. AWS ki aam general-purpose machines lagbhag 192 vCPU tak jaati hain. Sabse badi special machine (2024 mein launch) mein 1,920 vCPU aur 32 TB RAM hai, aur wo bahut mehengi, khaas database ke liye bani hai. Uske upar kuch nahi.`,
      `<strong>Kharcha:</strong> cloud mein ek machine family ke andar size double karo to price bhi lagbhag double hota hai (seedha hisaab). Lekin sabse top ki special machines aur khud khareede physical servers mein, top-end pe har extra core kaafi mehenga padta hai. Aur jo machine tumne peak ke liye li, wo raat ko khaali baith ke bhi poora paisa leti hai.`,
      `<strong>Ek hi machine:</strong> wo giri to sab gira (SPOF), aur upgrade ke liye bhi band karni padti hai. Aur ek baat: bahut saare cores tabhi kaam aate hain jab tumhara code unhe ek saath use kar sake. Ye "Concurrency vs parallelism" lesson mein dekhenge.`,
    ]},
    { type: 'tradeoffs', gains: ['Code mein koi change nahi', 'Simple: ek hi machine manage karni hai', 'Shuruaat mein sabse sasta raasta', 'Machines ke beech network ka koi jhanjhat nahi: sab ek hi memory mein'], costs: ['Hard limit: isse badi machine nahi milti', 'Top-end machines bahut mehengi', 'Abhi bhi ek SPOF', 'Upgrade ke liye aksar downtime'] },
    { type: 'h2', text: 'Horizontal scaling: machines badhao' },
    { type: 'callout', tone: 'term', title: 'Naya word: Horizontal scaling (scale out)', html: `<strong>Ye kya hai:</strong> ek bade server ki jagah kai normal servers, sab same code chalate hue. Kaam unke beech baant diya jaata hai. Zyada traffic? Ek aur server jodo (scale out). Traffic kam? Ek hata do (scale in).<br><strong>Kyun chahiye:</strong> isme koi ceiling nahi: 2, 20, 2,000 servers. Aur ek server gire to baaki chalte rehte hain.<br><strong>Iske bina:</strong> tum hamesha sabse badi machine ki limit aur uske SPOF mein phanse rahoge.<br><strong>Example:</strong> Google, Netflix, Instagram jaisi companies hazaaron normal servers chalati hain, ek "super computer" nahi.` },
    { type: 'image', src: 'assets/img/scalability/wikimedia-servers.jpg', alt: 'Data center mein server racks ki lambi line, har rack mein upar se neeche tak dozens patle servers lage hue', caption: 'Horizontal scaling asal mein aisi dikhti hai: racks mein lage bahut saare normal, patle servers (ye Wikipedia chalane wale Wikimedia ke servers hain). Har patli plate ek alag computer hai.', credit: { text: 'Victor Grigas, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Wikimedia_Foundation_Servers-8055_35.jpg', license: 'CC BY-SA 3.0' } },
    { type: 'p', html: `Lekin ek sawaal: user ko kaise pata ki kaunse server pe jaaye? User ko to ek hi address pata hai: xyz.com. Iske liye beech mein ek naya component chahiye.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Load Balancer (chhota intro)', html: `<strong>Ye kya hai:</strong> servers ke aage baitha ek "traffic police". Saari requests pehle isi pe aati hain, aur ye har request ko kisi ek free server ki taraf bhej deta hai.<br><strong>Kyun chahiye:</strong> users ko ek hi address dikhe, aur andar kitne bhi servers hon, kaam barabar baante.<br><strong>Iske bina:</strong> users ko khud server chunna padta, ek server pe bheed aur doosra khaali, aur gira hua server bhi requests khaata rehta.<br>Iska poora lesson Phase 2 mein hai (algorithms, health checks). Abhi itna kaafi hai.` },
    { type: 'flow', height: 340,
      nodes: [
        { id: 'u', label: 'Users', x: 80, y: 170, w: 110, kind: 'client', info: 'Ye kya hai: xyz.com ke users. Unhe sirf ek address pata hai (xyz.com). Andar kitne servers hain, unhe fark nahi padta.' },
        { id: 'lb', label: 'Load Balancer', sub: 'traffic baantna', x: 260, y: 170, w: 150, kind: 'edge', info: 'Ye kya hai: har aati request ko kisi ek server pe bhejne wala traffic police. Kyun: kai servers ke beech kaam baantna aur gire hue server ko chhod dena.' },
        { id: 's1', label: 'Server 1', x: 470, y: 70, w: 130, kind: 'server', meter: true, load: 20, info: 'Ye kya hai: ek normal size ka server, xyz.com ka poora code chalata hai. Baaki servers iski hoo-ba-hoo copy hain.' },
        { id: 's2', label: 'Server 2', x: 470, y: 170, w: 130, kind: 'server', meter: true, load: 20, info: 'Ye kya hai: Server 1 ki copy, same code. Kyun: kaam aadha aadha bant jaata hai, aur ek gire to doosra chalta rahe.' },
        { id: 's3', label: 'Server 3', x: 470, y: 270, w: 130, kind: 'server', meter: true, hidden: true, info: 'Ye kya hai: traffic badhne pe joda gaya naya server. Isi jodne ko horizontal scaling (scale out) kehte hain.' },
        { id: 'sess', label: 'Session store', sub: 'Redis', x: 650, y: 170, w: 120, kind: 'cache', hidden: true, info: 'Ye kya hai: ek shared, tez memory wala store (Redis) jahan "kaun logged in hai" likha rehta hai. Kyun: ab koi bhi server kisi bhi user ko pehchaan sakta hai, servers stateless ho jaate hain.' },
      ],
      edges: [
        { a: 'u', b: 'lb' }, { a: 'lb', b: 's1' }, { a: 'lb', b: 's2' }, { a: 'lb', b: 's3' },
        { a: 's1', b: 'sess' }, { a: 's2', b: 'sess' }, { a: 's3', b: 'sess' },
      ],
      scenarios: [
        { name: 'Machines badhao', steps: [
          { title: 'Do servers, traffic badh raha hai', text: 'Load Balancer aadha aadha baant raha hai, lekin dono ab 85% pe hain.', flood: { paths: ['u>lb>s1', 'u>lb>s2'], n: 12 }, after: { s1: { load: 85, state: 'warn' }, s2: { load: 85, state: 'warn' } } },
          { title: 'Server 3 jodo', text: 'Naya server, same code. Load Balancer ko bata diya, bas. Ab load teen hisson mein.', show: ['s3'], set: { s1: { load: 57, state: '' }, s2: { load: 57, state: '' }, s3: { load: 57 } }, flood: { paths: ['u>lb>s1', 'u>lb>s2', 'u>lb>s3'], n: 12 } },
          { title: 'Ek server gira? Koi baat nahi', text: 'Server 2 down hua, lekin 1 aur 3 chal rahe hain. Website chalu. Horizontal scaling se capacity bhi milti hai aur reliability bhi.', set: { s2: { state: 'down', sub: 'DOWN', load: 0 }, s1: { load: 85 }, s3: { load: 85 } }, flood: { paths: ['u>lb>s1', 'u>lb>s3'], n: 8 } },
        ]},
        { name: 'Stateful server ki problem', intro: 'Ek chhupi hui problem. Dekho kya hota hai jab server user ki info apni memory mein rakhta hai.', steps: [
          { title: 'Riya login karti hai, Server 1 pe', text: 'Server 1 apni memory mein likh leta hai: "session abc = Riya, logged in". Isko <strong>state</strong> kehte hain.', go: ['u>lb>s1', 'res:s1>lb>u'], after: { s1: { sub: 'memory: Riya ✓' } } },
          { title: 'Agli request Server 2 pe gayi', text: 'Load Balancer ne Riya ki agli request Server 2 ko di. Server 2 ki memory mein Riya hai hi nahi.', go: 'u>lb>s2', after: { s2: { sub: 'Riya kaun?', state: 'miss' } } },
          { title: 'Riya ko phir se login karna pada', text: 'Bahut bura experience. Aur agar Server 1 crash ho jaye, uske saare logged-in users ek saath logout.', go: 'bad:s2>lb>u', msg: '401: please login again' },
          { title: 'Fix: state ko server se bahar nikalo', text: 'Session info ek shared store (Redis) mein rakho. Ab servers <strong>stateless</strong> hain: unki memory mein user ka kuch nahi. Koi bhi server kisi bhi user ko serve kar sakta hai.', show: ['sess'], set: { s1: { sub: 'stateless' }, s2: { sub: 'stateless', state: '' } }, go: ['u>lb>s2>sess', 'res:sess>s2>lb>u'], after: { sess: { state: 'hit', sub: 'abc = Riya ✓' } } },
        ]},
        { name: 'Sticky sessions ka jugaad', intro: 'Ek aur tareeka: Load Balancer Riya ko hamesha usi server pe bheje. Chalta hai, jab tak wo server zinda hai.', steps: [
          { title: 'LB Riya ko Server 1 se "chipka" deta hai', text: 'LB ek cookie lagata hai: "ye user Server 1 ka". Riya ki har request Server 1 pe. Ise <strong>sticky session</strong> kehte hain.', go: ['u>lb>s1', 'res:s1>lb>u'], after: { s1: { sub: 'Riya yahan chipki' } } },
          { title: 'Sab theek chal raha hai', text: 'Riya ki agli request bhi Server 1 pe gayi, wo logged in hai. Koi Redis nahi chahiye tha.', go: ['u>lb>s1', 'res:s1>lb>u'] },
          { title: 'Server 1 crash', text: 'Server 1 ki memory ke saath Riya ka session bhi gaya. LB ab Riya ko Server 2 pe bhejta hai, jo usse jaanta hi nahi.', set: { s1: { state: 'down', sub: 'DOWN' } }, go: 'u>lb>s2', after: { s2: { state: 'miss', sub: 'Riya kaun?' } } },
          { title: 'Nateeja: logout + load barabar nahi', text: 'Server 1 ke saare users logout. Upar se, chipke users ki wajah se load barabar nahi bantta: kuch server bhare, kuch khaali. Isliye sticky sessions sirf jugaad hai, asli fix stateless servers hain.', go: 'bad:s2>lb>u', msg: '401: please login again' },
        ]},
      ],
    },
    { type: 'tradeoffs', gains: ['Almost unlimited growth: aur servers jodo', 'Ek server gire to baaki chalte rahein', 'Normal machines saste aur turant milte hain', 'Bina downtime upgrade: ek ek server badlo (rolling update)'], costs: ['Load Balancer, shared session store jaise naye components', 'State ko bahar nikalna padta hai', 'Zyada machines = zyada monitoring, deployment ki mehnat', 'Machines network pe baat karti hain: thodi extra latency aur naye failure'] },
    { type: 'h2', text: 'Stateless vs stateful: horizontal ki asli shart' },
    { type: 'callout', tone: 'term', title: 'Naya word: State', html: `<strong>Ye kya hai:</strong> wo cheez jo system ko <em>yaad</em> rakhni padti hai, ek request se agli request tak. Jaise "Riya logged in hai", "Riya ki cart mein 2 cheezein hain", "video 3:42 pe ruka tha".<br><strong>Kyun zaroori:</strong> iske bina har click pe user ko sab kuch dobara batana padega.<br><strong>Problem kahan:</strong> agar ye yaad ek server ki apni memory mein hai, to wo yaad sirf usi server ke paas hai.` },
    { type: 'callout', tone: 'term', title: 'Naye words: Stateful vs stateless server', html: `<strong>Stateful server:</strong> user ki info (login, cart) apni memory mein rakhta hai. Agli request usi server pe aani chahiye, warna "tum kaun?".<br><strong>Stateless server:</strong> requests ke beech kuch yaad nahi rakhta. Har request ke saath jo chahiye wo ya to request mein aata hai, ya shared jagah (database, cache) se padha jaata hai. Koi bhi request kisi bhi server pe ja sakti hai.<br><strong>Kyun chahiye:</strong> stateless servers ko jab chaaho jodo, hatao, restart karo: koi user ka data nahi khota.<br><strong>Iske bina:</strong> server jodna aur hatana dono khatarnaak, aur crash = users logout.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Session (aur cookie)', html: `<strong>Ye kya hai:</strong> session = login ke baad server ki taraf ka record: "session id abc123 = Riya, logged in, 10 baje tak valid". <strong>Cookie</strong> = browser mein rakhi chhoti si entry (jaise <code>session=abc123</code>) jo har request ke saath apne aap server tak jaati hai.<br><strong>Kyun chahiye:</strong> isi se server har request pe pehchaanta hai ki ye Riya hai, bina har baar password maange.<br><strong>Iske bina:</strong> har page pe dobara login.` },
    { type: 'p', html: `Session (aur baaki state) kahan rakhein, iske teen common tareeke hain:` },
    { type: 'table', head: ['Tareeka', 'Kaise kaam karta hai', 'Achha', 'Bura'], rows: [
      ['<strong>Sticky sessions</strong>', 'Load Balancer ek user ko hamesha usi server pe bhejta hai (cookie ya IP dekh ke). Session server ki memory mein.', 'Code change nahi, sabse jaldi', 'Server gira = uske users logout. Load barabar nahi bantta. Server hatana mushkil.'],
      ['<strong>Shared session store</strong>', 'Session ek shared, tez store (aksar Redis, ek RAM wala database) mein. Har server wahan se padhta hai.', 'Servers poore stateless. Server gire to koi logout nahi.', 'Ek aur component chalana padta hai, har request pe ~1 ms extra. Store khud bhi redundant chahiye.'],
      ['<strong>Token client ke paas</strong>', 'Login pe server ek signed token (jaise JWT, "AuthN, AuthZ, JWT" lesson mein dekha) deta hai. Browser har request ke saath bhejta hai, server signature check karta hai.', 'Server pe session rakhna hi nahi. Sabse simple scaling.', 'Token ko beech mein cancel (logout/ban) karna mushkil. Token bada ho to har request bhaari.'],
    ], caption: 'Real systems aksar 2 aur 3 mix karte hain: chhota token + zaroori cheezein shared store mein.' },
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `"Stateless" ka matlab ye <strong>nahi</strong> ki app mein koi state nahi. State hai, bas server ki apni memory se nikal ke shared jagah (database, Redis, token) mein chali gayi. Problem chhupti nahi, ek jagah ikatthi ho jaati hai, jise alag se scale karna padta hai.` },
    { type: 'callout', tone: 'mistake', html: `Horizontal scaling sabse aasaan <strong>application servers</strong> ke liye hai (kyunki unhe stateless banaya ja sakta hai). <strong>Database</strong> ko horizontally scale karna kaafi mushkil hai, kyunki uska poora kaam hi state rakhna hai. Iske liye replication aur sharding aayenge, Phase 2 mein. Isliye aksar database pehle vertically scale kiya jaata hai.` },
    { type: 'h2', text: 'Khud tolo: ek badi machine ya kai chhoti?' },
    { type: 'p', html: `Ab numbers ke saath dekhte hain. Is calculator ke simple maan-ke-chalo numbers: ek vCPU lagbhag <strong>250 requests/second</strong> sambhalta hai (simple JSON API), server ko max <strong>70%</strong> tak chalaate hain (baaki headroom = achanak bheed ke liye jagah), aur cloud mein kharcha lagbhag <strong>₹4 per vCPU per ghanta</strong> (seedha size ke hisaab se). Horizontal mein har server 8 vCPU ka, aur kam se kam 2 servers.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Headroom', html: `<strong>Ye kya hai:</strong> server ki capacity ka wo hissa jo jaan bujh ke khaali chhodte hain.<br><strong>Kyun chahiye:</strong> traffic achanak badhe, ya ek server gire, to baaki ke paas uska kaam uthane ki jagah ho.<br><strong>Iske bina:</strong> 100% pe chal rahe servers pe thoda sa bhi extra load aaya to requests line mein lagti hain aur sab slow (latency lesson mein iska graph dekhenge).` },
    { type: 'custom', render(el) {
      const PER = 250, UT = 0.7, LAD = [2, 4, 8, 16, 32, 48, 64, 96, 128, 192], PR = 4, SM = 8;
      const STEPS = [1000, 2000, 5000, 10000, 20000, 30000, 40000, 60000, 100000];
      el.innerHTML = `<label>Peak traffic: <strong class="scP"></strong> requests/second</label>
        <input class="scR" type="range" min="0" max="${STEPS.length - 1}" step="1" value="3">
        <div class="row2" style="margin-top:12px">
          <div style="border:1px solid var(--line);border-radius:var(--r);padding:10px"><strong>Vertical: ek badi machine</strong><div class="stats scV"></div></div>
          <div style="border:1px solid var(--line);border-radius:var(--r);padding:10px"><strong>Horizontal: kai 8-vCPU servers</strong><div class="stats scH"></div></div>
        </div>
        <div class="calc-note scN"></div>`;
      const r = el.querySelector('.scR');
      const st = (a, b) => `<div class="stat"><span>${a}</span><strong>${b}</strong></div>`;
      const nf = x => x.toLocaleString('en-IN');
      const upd = () => {
        const need = STEPS[r.value];
        el.querySelector('.scP').textContent = nf(need);
        const v = need / (PER * UT), m = LAD.find(x => x >= v);
        const n = Math.max(2, Math.ceil(need / (SM * PER * UT))), left = (n - 1) * SM * PER;
        el.querySelector('.scV').innerHTML = m
          ? st('Chahiye', v.toFixed(1) + ' vCPU') + st('Machine', m + ' vCPU') + st('Kharcha', '₹' + nf(m * PR) + '/ghanta') + st('Machine giri to', '0 req/s bache')
          : st('Chahiye', v.toFixed(1) + ' vCPU') + st('Machine', 'koi nahi!') + st('Kharcha', '-') + st('Machine giri to', '-');
        el.querySelector('.scH').innerHTML = st('Servers', n + ' × 8 vCPU') + st('Kul vCPU', nf(n * SM)) + st('Kharcha', '₹' + nf(n * SM * PR) + '/ghanta') + st('1 server gira to', nf(left) + ' req/s bache');
        el.querySelector('.scN').textContent = !m
          ? `${nf(need)} req/s ke liye ${v.toFixed(0)} vCPU chahiye, aur aam badi machines 192 vCPU pe ruk jaati hain. Vertical ka raasta khatam. Horizontal mein bas ${n} servers lagao.`
          : need <= 2000
          ? `Itne kam traffic pe ek machine sasti ya barabar hai aur simple hai. Lekin wo giri to site band. Horizontal ke 2 servers thoda zyada kharcha karke ek ke girne pe bhi ${nf(left)} req/s sambhal lete hain.`
          : `Kharcha lagbhag barabar (cloud mein price size ke saath seedha badhta hai). Asli farak: badi machine giri to 0 bacha, jabki ${n} servers mein se ek gira to bhi ${nf(left)} req/s (zaroorat ${nf(need)}) chal rahe hain.`;
      };
      r.addEventListener('input', upd);
      upd();
    }},
    { type: 'p', html: `Slider ko 10,000 pe rakho: vertical mein 64 vCPU ki ek machine (₹256/ghanta), horizontal mein 8 servers (wahi 64 vCPU, wahi ₹256/ghanta). Kharcha same, lekin ek server gire to horizontal ke paas abhi bhi 14,000 req/s bache. Ab 40,000 pe le jao: 229 vCPU chahiye, aur vertical ka raasta band.` },
    { type: 'callout', tone: 'tip', html: `Ye calculator sirf andaza hai. Asli numbers code, data aur machine pe bahut depend karte hain. Interview mein yahi andaza kaafi hai: "ek simple API server ~1,000-2,000 req/s, aur 50-70% utilisation pe plan karo". Ye numbers "Napkin maths" lesson mein dobara aayenge.` },
    { type: 'h2', text: 'Elasticity aur autoscaling: traffic ke saath saans lena' },
    { type: 'p', html: `Naya problem. xyz.com pe raat 2 baje 500 req/s aate hain, shaam 8 baje 5,000, aur cricket match ke din 9,000. Agar peak ke hisaab se servers din bhar chalaao, to aadha din paisa jalta hai. Agar average ke hisaab se chalaao, to peak pe site girti hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Elasticity', html: `<strong>Ye kya hai:</strong> system ki wo khoobi ki load ke saath capacity apne aap <em>badhe aur ghate</em>, jaise rubber band.<br><strong>Kyun chahiye:</strong> peak pe site na gire, aur khaali time pe bekaar servers ka bill na aaye.<br><strong>Iske bina:</strong> ya to hamesha peak ka paisa do, ya peak pe site girne do.<br>Scalability = "badh <em>sakta</em> hai". Elasticity = "zaroorat ke hisaab se khud badhta <em>aur</em> ghatta hai".` },
    { type: 'callout', tone: 'term', title: 'Naya word: Autoscaling', html: `<strong>Ye kya hai:</strong> cloud ka ek feature jo ek metric (jaise servers ka average CPU) dekhta rehta hai aur khud servers jodta (scale out) ya hatata (scale in) hai.<br><strong>Kyun chahiye:</strong> elasticity bina insaan ke: raat 3 baje bhi koi button nahi dabana padta.<br><strong>Iske bina:</strong> ek engineer graph dekh ke haath se servers jodta, aur hamesha der se.<br><strong>Example:</strong> AWS mein "target tracking" policy: "servers ka average CPU 50% ke aas paas rakho". CPU 50% se upar gaya to servers jodo, neeche gaya to dheere dheere hatao. Bilkul thermostat (AC ka temperature setting) jaisa.` },
    { type: 'steps', items: [
      { t: 'Naapo', d: 'Har minute servers ka CPU (ya har server pe requests per second) naapa jaata hai.' },
      { t: 'Target se milao', d: 'Target 70% hai aur abhi 90% hai? Hisaab: kitne servers jodun ki wapas ~70% aa jaaye.' },
      { t: 'Naya server chalao', d: 'Ek tayyar image (OS + code) se naya server start hota hai. Isme 1-5 minute lag sakte hain.' },
      { t: 'Warm-up', d: 'Server start hua, code load hua, cache garam hua. Tab tak usse poora load nahi dete. Isko warm-up time kehte hain.' },
      { t: 'Load Balancer mein jodo', d: 'Health check pass hua to LB usse traffic dena shuru karta hai. Server stateless hai, to turant kaam ka.' },
      { t: 'Scale in (dheere)', d: 'Load kam hua to server hatao, lekin pehle uski chal rahi requests poori hone do (draining). Aur hatane mein jaldi mat karo, warna jodna-hatana jhoolta rahega.' },
    ]},
    { type: 'p', html: `Ab ek din chala ke dekho. Har bar = ek ghante ka traffic. Har server max 1,000 req/s sambhalta hai, aur autoscaler 70% target rakhta hai (yaani har 700 req/s pe ek server, kam se kam 2). Reactive autoscaling pichhle ghante ka traffic dekh ke faisla leta hai, kyunki naya server banne mein time lagta hai. Shaam 8 baje (hour 20) cricket match ka spike hai.` },
    { type: 'custom', render(el) {
      const T = [1200, 800, 600, 500, 500, 600, 1000, 1800, 2600, 3000, 3200, 3300, 3400, 3200, 3000, 3000, 3200, 3600, 4200, 5000, 9000, 5200, 3500, 2000];
      const CAP = 1000, D = t => Math.max(2, Math.ceil(t / 700)), PEAK = Math.max(...T), AVG = T.reduce((a, b) => a + b, 0) / 24;
      const MODES = [
        ['Fixed: peak ke liye', h => D(PEAK), 'Din bhar 13 servers. Kabhi overload nahi, lekin raat ko 13 mein se 11 khaali baithe bill bana rahe hain.'],
        ['Fixed: average ke liye', h => D(AVG), 'Din bhar 5 servers. Sasta, lekin match ke waqt (hour 20, 21) site overload. Average ke liye plan karna sabse aam galti hai.'],
        ['Autoscaling (reactive)', h => D(T[(h + 23) % 24]), 'Servers traffic ke saath upar neeche. Dheere badhne wala traffic aaraam se sambhal liya (headroom ki wajah se). Lekin hour 20 ka achanak spike: autoscaler ne hour 19 ke traffic ke hisaab se 8 servers rakhe the, aur 9,000 aa gaye. Ek ghanta overload.'],
        ['Autoscaling + pre-scale', h => (h >= 19 && h <= 21) ? Math.max(D(T[(h + 23) % 24]), D(PEAK)) : D(T[(h + 23) % 24]), 'Match ka time pehle se pata tha, to hour 19 se 21 tak pehle se 13 servers (scheduled scaling). Koi overload nahi, aur kharcha fixed-peak ke aadhe se bhi kam.'],
      ];
      el.innerHTML = `<div class="chips asM" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <svg class="asSvg" viewBox="0 0 480 200" style="width:100%;margin-top:10px" role="img" aria-label="24 ghante ka traffic aur servers"></svg>
        <div style="font-size:13px;color:var(--ink-3)">Bar = traffic (red = overload). Line = servers ki total capacity.</div>
        <div class="stats asS"></div><div class="calc-note asN"></div>`;
      const box = el.querySelector('.asM'), svg = el.querySelector('.asSvg');
      let mode = 2;
      MODES.forEach((m, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = m[0]; b.onclick = () => { mode = i; draw(); }; box.appendChild(b); });
      const draw = () => {
        [...box.children].forEach((b, i) => b.classList.toggle('on', i === mode));
        const f = MODES[mode][1], top = 13000, X = h => 20 + h * 19, Y = v => 180 - v / top * 165;
        let s = '', line = '', sh = 0, ov = [];
        T.forEach((t, h) => { const n = f(h), c = n * CAP; sh += n; const bad = t > c; if (bad) ov.push(h);
          s += `<rect x="${X(h) + 2}" y="${Y(t)}" width="15" height="${180 - Y(t)}" rx="2" fill="var(${bad ? '--red' : '--accent'})" opacity="0.85"></rect>`;
          line += `${h ? 'L' : 'M'}${X(h)} ${Y(c)} L${X(h) + 19} ${Y(c)} `; });
        s += `<path d="${line}" fill="none" stroke="var(--amber)" stroke-width="2.5"></path><line x1="20" y1="180" x2="476" y2="180" stroke="var(--line)"></line>`;
        [0, 6, 12, 18, 23].forEach(h => { s += `<text x="${X(h) + 9}" y="196" font-size="10" text-anchor="middle" fill="var(--ink-3)">${h}h</text>`; });
        svg.innerHTML = s;
        el.querySelector('.asS').innerHTML = `<div class="stat"><span>Server-ghante (kharcha)</span><strong>${sh}</strong></div><div class="stat"><span>Overload kab hua</span><strong>${ov.length ? ov.map(h => h + 'h').join(', ') : 'koi nahi'}</strong></div><div class="stat"><span>Kharcha (₹32/server/ghanta)</span><strong>₹${(sh * 32).toLocaleString('en-IN')}</strong></div>`;
        el.querySelector('.asN').textContent = MODES[mode][2];
      };
      draw();
    }},
    { type: 'p', html: `Charon modes ka hisaab: fixed-peak 312 server-ghante, 0 overload. Fixed-average 120, lekin 2 ghante overload. Reactive autoscaling sirf 110, lekin spike wala 1 ghanta overload. Autoscaling + pre-scale 122, aur 0 overload. Sabak: <strong>autoscaling dheere badhne wale traffic ke liye badhiya hai, lekin achanak aane wale spike ke liye der se jaagta hai.</strong> Pata ho ki spike aane wala hai (sale, match, launch), to pehle se scale karo.` },
    { type: 'callout', tone: 'warn', title: 'Autoscaling ki limits', html: `<ul><li><strong>Der:</strong> metric naapne, faisla lene, server banane aur warm-up mein milake kai minute. Spike usse tez aaya to bachaav sirf headroom hai.</li><li><strong>Database nahi badhta:</strong> app servers 10 se 50 ho gaye, lekin sab ek hi database pe tut pade. Bottleneck bas aage khisak gaya.</li><li><strong>Min aur max zaroor rakho:</strong> min (jaise 2, alag zones mein) taaki ek gire to bhi site chale. Max taaki ek bug ya bot attack 1,000 servers ka bill na bana de.</li><li><strong>Stateful servers ke saath nahi chalta:</strong> scale in pe server hataya to uske users ka data gaya. Pehle stateless banao.</li></ul>` },
    { type: 'h2', text: 'Kab kya choose karein?' },
    { type: 'callout', tone: 'why', title: 'Decide', html: `<strong>Pehle vertical</strong> (badi machine), jab tak sasta aur safe hai, kyunki ye simple hai. <strong>Horizontal pe jao</strong> jab ek machine traffic nahi sambhal pa rahi, ya jab ek machine ka girna afford nahi kar sakte. Horizontal tabhi aasaan hai jab servers <strong>stateless</strong> hon, isliye state ko database aur cache mein dhakelo.` },
    { type: 'table', head: ['Situation', 'Kya karein', 'Kyun'], rows: [
      ['Naya startup, 500 users', 'Ek achha server (+ backup)', 'Fleet lagana paisa aur mehnat dono waste'],
      ['Ek server 80% pe, growth dheemi', 'Vertical: ek size bada', 'Sabse jaldi, code change nahi'],
      ['Downtime bilkul nahi chalega', 'Horizontal: kam se kam 2 servers, alag zones mein', 'Ek gire to doosra chale'],
      ['Traffic din bhar upar neeche', 'Horizontal + autoscaling', 'Peak pe zyada, raat ko kam servers'],
      ['Pata hai kal sale/match hai', 'Autoscaling + pehle se scale (pre-scale)', 'Reactive scaling spike ke liye der se jaagta hai'],
      ['Database thak gaya', 'Pehle vertical + cache + read replicas; phir sharding', 'Database ko horizontal karna sabse mushkil'],
    ]},
    { type: 'diagram', title: 'Scalability: poori picture', height: 500,
      groups: [
        { label: 'Users', x: 20, y: 14, w: 680, h: 92 },
        { label: 'Entry + control', x: 20, y: 116, w: 680, h: 120 },
        { label: 'App servers', x: 20, y: 248, w: 680, h: 112 },
        { label: 'State yahan rehta hai', x: 20, y: 372, w: 680, h: 116 },
      ],
      nodes: [
        { id: 'users', label: 'Users', sub: 'web + app', x: 360, y: 60, kind: 'client', info: 'Ye kya hai: xyz.com ke users. Unhe sirf ek naam pata hai: xyz.com. Peeche 2 server hon ya 200, unke liye kuch nahi badalta.' },
        { id: 'dns', label: 'DNS', sub: 'naam → LB ka IP', x: 150, y: 180, kind: 'net', info: 'Ye kya hai: internet ki phonebook. xyz.com naam ko Load Balancer ke IP address mein badalta hai. Servers badalte rahein, ye address same rehta hai.' },
        { id: 'lb', label: 'Load Balancer', sub: 'kaam baantna', x: 360, y: 180, w: 150, kind: 'edge', info: 'Ye kya hai: saari requests ka pehla stop, jo unhe zinda servers mein baantta hai. Kyun: horizontal scaling isi ke bina possible nahi. Gira hua server health check se bahar.' },
        { id: 'auto', label: 'Autoscaler', sub: 'target CPU 70%', x: 580, y: 180, w: 150, kind: 'queue', info: 'Ye kya hai: metric (CPU ya req/s per server) dekh ke servers jodne/hatane wala. Kyun: peak pe capacity, raat ko bachat. Min 2, max tay rakho.' },
        { id: 's1', label: 'Server 1', sub: 'stateless', x: 170, y: 310, kind: 'server', info: 'Ye kya hai: xyz.com ka code chalane wala normal server. Stateless hai: user ka kuch yaad nahi rakhta, isliye kabhi bhi hata ya badla ja sakta hai.' },
        { id: 's2', label: 'Server 2', sub: 'stateless', x: 360, y: 310, kind: 'server', info: 'Ye kya hai: Server 1 ki copy. Koi bhi request kisi bhi server pe ja sakti hai, kyunki session Redis mein hai.' },
        { id: 's3', label: 'Server 3', sub: 'naya (autoscale)', x: 550, y: 310, kind: 'server', info: 'Ye kya hai: traffic badhne pe autoscaler ka joda hua server. Warm-up ke baad LB isko traffic dena shuru karta hai.' },
        { id: 'sess', label: 'Session store', sub: 'Redis', x: 265, y: 432, kind: 'cache', info: 'Ye kya hai: login sessions ka shared, tez (RAM wala) store. Kyun: isi ki wajah se app servers stateless hain. Ye khud bhi redundant hona chahiye.' },
        { id: 'db', label: 'Database', sub: 'pehle vertical', x: 455, y: 432, kind: 'data', info: 'Ye kya hai: xyz.com ka asli data. State yahin hai, isliye isko scale karna sabse mushkil: pehle badi machine, phir replicas aur sharding (Phase 2).' },
      ],
      edges: [
        { a: 'users', b: 'dns', n: 1, label: 'IP?' },
        { a: 'users', b: 'lb', n: 2 },
        { a: 'lb', b: 's1' }, { a: 'lb', b: 's2', n: 3 }, { a: 'lb', b: 's3' },
        { a: 'lb', b: 'auto', dashed: true, kind: 'evt', label: 'metrics' },
        { a: 'auto', b: 's3', dashed: true, kind: 'evt', label: '+1 server' },
        { a: 's1', b: 'sess' }, { a: 's2', b: 'sess', n: 4 }, { a: 's2', b: 'db', n: 5 }, { a: 's3', b: 'db' },
      ],
      paths: [
        { name: 'Normal request', text: 'DNS se LB ka address, LB ne Server 2 chuna, Server 2 ne Redis se session padha (Riya logged in), phir DB se data.', go: ['users>dns', 'users>lb>s2>sess', 's2>db'] },
        { name: 'Traffic spike', text: 'LB ke metrics mein CPU 70% se upar. Autoscaler ne Server 3 joda, warm-up ke baad LB usse bhi kaam deta hai.', go: ['lb>auto>s3', 'lb>s3>db'] },
        { name: 'Server crash', text: 'Server 2 gira. LB ka health check fail, traffic Server 1 aur 3 pe. Session Redis mein hai, to koi logout nahi. Autoscaler ek naya server bana deta hai.', go: ['users>lb>s1>sess', 'lb>s3'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Scalability = load badhe to resources jod ke sambhal sako, bina system dobara banaye.</li>
      <li>Vertical (badi machine): simple, code same. Lekin hard limit, top-end mehenga, ek SPOF, upgrade pe downtime.</li>
      <li>Horizontal (zyada machines): almost unlimited aur ek gire to baaki chalein. Lekin Load Balancer aur stateless servers chahiye.</li>
      <li>Stateless = server requests ke beech kuch yaad nahi rakhta. State (session, cart) Redis/DB/token mein.</li>
      <li>Sticky sessions sirf jugaad hai: server gira to uske users logout.</li>
      <li>Elasticity/autoscaling = metric dekh ke servers khud jodna/hatana. Dheere traffic ke liye badhiya, achanak spike ke liye pre-scale karo.</li>
      <li>50-70% utilisation pe plan karo (headroom). Database sabse aakhir mein aur sabse mushkil se scale hota hai.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Traffic 100 guna ho to bhi site chal sakti hai', 'Horizontal + stateless = ek server ka girna koi badi baat nahi', 'Autoscaling se raat ko kam servers, kam bill', 'Bina downtime deploy aur upgrade (ek ek server badlo)'], costs: ['Zyada components: Load Balancer, session store, autoscaler', 'State ko bahar nikalne ki mehnat, aur wo store khud scale karna', 'Autoscaling spike ke liye der se jaagta hai: headroom aur pre-scale ka paisa', 'Database ab bhi sabse mushkil hissa'] },
    { type: 'think', questions: [
      { q: 'Tumhare 3 servers hain aur shopping cart server ki memory mein rakha hai. Kya problem aayegi?', a: 'Agli request doosre server pe gayi to cart khaali dikhega. Aur jis server pe cart tha wo restart hua (ya autoscaler ne hata diya) to cart gaya. Fix: cart ko Redis/database mein rakho taaki servers stateless rahein.' },
      { q: 'Startup ke paas 500 users hain. 5 servers + Load Balancer lagaye, ya ek achha server?', a: 'Ek achha server (shayad ek backup ke saath). 500 users ke liye fleet lagana paisa aur complexity dono waste. Jab traffic ya reliability ki need badhe, tab horizontal.' },
      { q: 'Autoscaling laga hai, phir bhi IPL final ke pehle 10 minute mein site gir gayi. Kyun, aur kya karte?', a: 'Traffic kuch hi minute mein kai guna badha. Autoscaler ko metric dekhne, server banane aur warm-up mein kai minute lage, tab tak purane servers overload. Fix: match ka time pata tha, to pehle se scale (scheduled/pre-scaling), zyada headroom, aur kam zaroori features band karne ka plan.' },
      { q: 'App servers 10 se 40 kar diye, phir bhi site slow hai. Kahan dekhoge?', a: 'Shayad bottleneck database hai: 40 servers ab ek hi DB pe 4 guna queries bhej rahe hain. Horizontal scaling ne problem aage khiska di. Cache, read replicas, query/index sudhar, ya sharding sochna padega.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Server ko 8 GB se 64 GB RAM pe upgrade karna kya hai?', options: ['Horizontal scaling', 'Vertical scaling', 'Sharding'], answer: 1, explain: 'Same machine ko bada karna = vertical. Machines ki ginti badhana = horizontal.' },
      { q: 'Horizontal scaling ke liye servers ko kya hona chahiye?', options: ['Stateless', 'Bahut bade', 'Ek hi data center mein'], answer: 0, explain: 'Stateless servers kuch yaad nahi rakhte, isliye koi bhi request kisi bhi server pe ja sakti hai.' },
      { q: 'Vertical scaling ki sabse badi kami?', options: ['Code dobara likhna padta hai', 'Hard limit hai aur ek SPOF bana rehta hai', 'Load Balancer chahiye'], answer: 1, explain: 'Sabse badi machine ki bhi limit hai, aur wo ek hi machine hai jo gir sakti hai.' },
      { q: 'Sticky sessions ki problem kya hai?', options: ['Wo bahut slow hain', 'Server gira to uske users ka session gaya, aur load barabar nahi bantta', 'Wo HTTPS ke saath kaam nahi karte'], answer: 1, explain: 'Session ek hi server ki memory mein hai. Asli fix: shared session store ya token, taaki server stateless ho.' },
      { q: 'Autoscaling target 70% CPU, har server 1,000 req/s max. Traffic 5,600 req/s. Kitne servers chahiye?', options: ['6', '8', '56'], answer: 1, explain: '70% pe har server ~700 req/s leta hai. 5,600 ÷ 700 = 8 servers.' },
      { q: 'Elasticity aur scalability mein farak?', options: ['Dono same hain', 'Scalability = badh sakta hai; elasticity = load ke hisaab se khud badhta aur ghatta hai', 'Elasticity sirf database ke liye hai'], answer: 1, explain: 'Scalable system mein capacity jodi ja sakti hai. Elastic system ye apne aap dono taraf karta hai.' },
    ]},
    { type: 'sources', note: 'Machine sizes aur autoscaling ka behaviour inhi official docs se.', items: [
      { title: 'Target tracking scaling policies for Amazon EC2 Auto Scaling', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-target-tracking.html', used: 'Target tracking works like a thermostat (example: keep average CPU at 50%), scale out above target and scale in more gradually, instance warm-up, rounding up when adding instances.' },
      { title: 'New Amazon EC2 High Memory U7inh instance on HPE server for large in-memory databases', publisher: 'AWS News Blog', official: true, year: 2024, url: 'https://aws.amazon.com/blogs/aws/new-amazon-ec2-high-memory-u7inh-instance-on-hpe-server-for-large-in-memory-databases/', used: 'Largest single cloud machine at launch: 1,920 vCPUs and 32 TB memory, built for big in-memory databases (the vertical-scaling ceiling).' },
      { title: 'Amazon EC2 M7i instances', publisher: 'AWS', official: true, url: 'https://aws.amazon.com/ec2/instance-types/m7i/', used: 'General-purpose sizes go from 2 up to 192 vCPUs; on-demand price grows roughly in step with size inside one family (used for the planner\'s simple per-vCPU price).' },
    ]},
  ],
});
