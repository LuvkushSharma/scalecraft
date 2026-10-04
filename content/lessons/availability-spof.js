Lesson.register({
  id: 'availability-spof',
  title: 'Availability, nines aur SPOF',
  minutes: 26,
  summary: `Availability = system kitne % time chalu hai. "99.9%" sunne mein perfect lagta hai, lekin iska matlab saal mein ~9 ghante downtime hai. Downtime ka sabse bada dushman hai Single Point of Failure: ek aisa box jo gira to sab gira. Is lesson mein nines ka hisaab, MTBF/MTTR, redundancy (active-active, active-passive), failover, serial vs parallel availability ka calculator, data ki redundancy, aur availability zones/regions.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Socho tumhari website raat 2 baje band ho gayi aur subah 9 baje tak kisi ko pata nahi chala. Saat ghante tak koi user kuch nahi kar paaya.<br>Availability ka sawaal simple hai: <strong>"jab koi user aaye, to site chalu mile, iska kitna bharosa hai?"</strong><br>Iska jawab ek number hai (jaise 99.9%), aur us number ko badhane ka tareeka bhi simple hai: <strong>har zaroori cheez ki ek extra copy rakho</strong>, taaki ek kharab ho to doosri kaam sambhal le, aur ye switch apne aap, jaldi ho.` },

    { type: 'h2', text: 'Problem: xyz.com raat bhar band raha' },
    { type: 'p', html: `Pichhle lesson mein xyz.com ke paas Load Balancer ke peeche 2 servers aa gaye. Ek raat database wali machine ki disk kharab ho gayi. Servers chal rahe the, lekin data ke bina har page pe error. Subah engineer jaaga, nayi machine banayi, backup se data daala: 7 ghante lage.` },
    { type: 'p', html: `Users ka sawaal: "tumhari site kitni bharosemand hai?" Iska jawab dene ke liye engineers ek number use karte hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Availability', html: `<strong>Ye kya hai:</strong> kitne % time system chalu hai aur sahi se jawab de raha hai. Formula: <code>uptime ÷ (uptime + downtime)</code>.<br><strong>Kyun chahiye:</strong> "site bahut bharosemand hai" koi naap nahi sakta. "99.9%" naapa ja sakta hai, wada kiya ja sakta hai, aur usse design decide hota hai.<br><strong>Iske bina:</strong> pata hi nahi chalega ki kitni redundancy chahiye, ya kab "kaafi achha" ho gaya.<br><strong>Example:</strong> ek mahine (30 din = 720 ghante) mein xyz.com 7 ghante band raha: 713 ÷ 720 = <strong>99.03%</strong>.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Downtime', html: `<strong>Ye kya hai:</strong> wo time jab users ke liye system kaam nahi kar raha: band, ya itna slow ki bekaar, ya galat error de raha. <strong>Uptime</strong> iska ulta hai.<br><strong>Do qism:</strong> <em>planned</em> (pehle se bata ke, upgrade ke liye) aur <em>unplanned</em> (achanak crash). Users ke liye dono same dukh dete hain.` },

    { type: 'h2', text: 'Nines: availability ko number mein socho' },
    { type: 'p', html: `"Hamari site hamesha chalti hai" koi engineer nahi bolta. Bolte hain "99.9% available". In 9s ko <strong>nines</strong> kehte hain: 99.9% = "three nines", 99.99% = "four nines". Slider ghuma ke dekho ki har extra 9 kitna farak daalta hai:` },
    { type: 'custom', render(el) {
      const opts = [['90%', 0.9], ['99% (two nines)', 0.99], ['99.9% (three nines)', 0.999], ['99.95%', 0.9995], ['99.99% (four nines)', 0.9999], ['99.999% (five nines)', 0.99999]];
      el.innerHTML = `<label>Availability target</label>
        <input class="nR" type="range" min="0" max="${opts.length - 1}" step="1" value="2">
        <div class="stats">
          <div class="stat"><span>Target</span><strong class="nT"></strong></div>
          <div class="stat"><span>Downtime per year</span><strong class="nY"></strong></div>
          <div class="stat"><span>Per month</span><strong class="nM"></strong></div>
          <div class="stat"><span>Per day</span><strong class="nD"></strong></div>
        </div>
        <div class="calc-note nN"></div>`;
      const fmt = s => s >= 86400 ? (s / 86400).toFixed(s < 864000 ? 2 : 1) + ' days' : s >= 3600 ? (s / 3600).toFixed(1) + ' hours' : s >= 600 ? Math.round(s / 60) + ' min' : s >= 60 ? (s / 60).toFixed(1) + ' min' : Math.round(s) + ' sec';
      const notes = [
        'Har din 2.4 ghante band. Koi bhi serious product ye accept nahi karega.',
        'Saal mein ~3.65 din band. Internal tools ke liye chal sakta hai.',
        'Saal mein ~8.8 ghante. Bahut saari normal websites yahi target karti hain.',
        'Saal mein ~4.4 ghante. Ek achha practical target.',
        'Saal mein ~53 minute. Payments, bade apps. Ab koi bhi manual fix itna fast nahi hota, failover automatic hona chahiye.',
        'Saal mein ~5 minute. Telecom/critical infra level. Har extra 9 cost aur complexity kai guna badhata hai.',
      ];
      const r = el.querySelector('.nR');
      const upd = () => {
        const [name, a] = opts[r.value];
        const down = 1 - a;
        el.querySelector('.nT').textContent = name.split(' ')[0];
        el.querySelector('.nY').textContent = fmt(down * 365 * 86400);
        el.querySelector('.nM').textContent = fmt(down * 365 / 12 * 86400);
        el.querySelector('.nD').textContent = fmt(down * 86400);
        el.querySelector('.nN').textContent = notes[r.value];
      };
      r.addEventListener('input', upd);
      upd();
    }},
    { type: 'table', head: ['Availability', 'Downtime per year', 'Per month'], rows: [
      ['99% (two nines)', '≈ 3.65 din', '≈ 7.3 ghante'],
      ['99.9% (three nines)', '≈ 8.8 ghante', '≈ 44 minute'],
      ['99.99% (four nines)', '≈ 53 minute', '≈ 4.4 minute'],
      ['99.999% (five nines)', '≈ 5.3 minute', '≈ 26 second'],
    ], caption: 'Ye table yaad rakhne layak hai. Har extra 9 = downtime 10 guna kam.' },
    { type: 'callout', tone: 'why', title: '100% kyun nahi?', html: `Google ki SRE book ka seedha sabak: 100% lagbhag kabhi sahi target nahi hai. Har agla 9 pichhle se kahin zyada mehenga padta hai (zyada copies, zyada automation, zyada engineers ka time). Aur user ka apna phone network, WiFi, battery khud 99.99% se kam bharosemand hain, to wo farak mehsoos hi nahi karega. Isliye target business ke hisaab se: chat app 99.9%, payments 99.99%.` },
    { type: 'p', html: `Ek aur tareeka: time ki jagah <strong>requests</strong> gino. Availability = safal requests ÷ kul requests. Ek din mein 25 lakh requests aur target 99.99% = din mein 250 tak failed requests chal sakti hain. Bade systems (jaise Google) aksar yahi naap use karte hain, kyunki "aadha system chalu" jaisi halat bhi isme sahi se gini jaati hai. Jitna failure target ke andar "allowed" hai, use <strong>error budget</strong> kehte hain: budget bacha hai to naye features release karo, khatam ho gaya to ruk ke stability sudhaaro.` },
    { type: 'h2', text: 'Availability, reliability, fault tolerance: chaar milte julte words' },
    { type: 'p', html: `Ye words interview mein bahut ulte seedhe use hote hain. Ek ek karke dekho:` },
    { type: 'callout', tone: 'term', title: 'Naya word: Reliability', html: `<strong>Ye kya hai:</strong> system <em>sahi</em> kaam karta hai ya nahi, lambe time tak, bina galti ke. Availability poochhti hai "chalu hai?"; reliability poochhti hai "jo kar raha hai, sahi kar raha hai?".<br><strong>Example:</strong> bank app khul raha hai (available) lekin balance galat dikha raha hai (unreliable). Dono chahiye.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Fault tolerance', html: `<strong>Ye kya hai:</strong> ek hissa (fault) toot jaaye to bhi system bina ruke, bina user ko pata chale chalta rahe. Jaise ek server gira aur requests chup chaap doosre pe chali gayin.<br><strong>Kyun chahiye:</strong> hardware, network, software: kuch na kuch roz tootta hai. Bade system mein "kuch toota hua" normal halat hai.<br><strong>Iske bina:</strong> har chhoti kharabi = users ko error.` },
    { type: 'callout', tone: 'term', title: 'Naya word: High availability (HA)', html: `<strong>Ye kya hai:</strong> system ko aise design karna ki downtime bahut kam ho (jaise 99.99%). Iska tareeka: redundancy + automatic failover. Thoda sa jhatka chal sakta hai (kuch seconds ki errors jab tak backup sambhale).<br><strong>Fault tolerance se farak:</strong> fault tolerance ka matlab <em>zero</em> rukawat (aksar do copies bilkul saath chalti hain). HA ka matlab <em>jaldi wapas</em>. Fault tolerance zyada mehenga hai; zyada tar websites HA se kaam chalaati hain.` },
    { type: 'table', head: ['Word', 'Sawaal', 'xyz.com example'], rows: [
      ['Availability', 'Chalu hai? Kitne % time?', '99.9% time site khulti hai'],
      ['Reliability', 'Sahi kaam karta hai?', 'Like dabaya to sach mein ek hi like juda'],
      ['Fault tolerance', 'Ek hissa toota to bhi bina ruke chalta hai?', 'Server gira, kisi user ko error nahi'],
      ['High availability', 'Toota to kitni jaldi wapas?', 'DB gira, 30 second mein replica ne sambhala'],
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `"Available" ka matlab "sahi" nahi. Ek system jo har request pe turant <code>500 error</code> lautata hai, technically "jawab de raha hai", lekin wo available nahi gina jaana chahiye. Isliye availability naapte waqt "safal requests" gino, sirf "server zinda hai" nahi.` },

    { type: 'h2', text: 'MTBF aur MTTR: girna kam karo, ya uthna tez?' },
    { type: 'callout', tone: 'term', title: 'Naye words: MTBF aur MTTR', html: `<strong>MTBF (Mean Time Between Failures):</strong> average kitni der baad cheez girti hai. Jaise "server mahine mein ek baar crash hota hai" = MTBF 720 ghante.<br><strong>MTTR (Mean Time To Recovery/Repair):</strong> gira to average kitni der mein wapas chalu. Jaise "engineer uth ke theek karta hai, 1 ghanta" = MTTR 1 ghanta.<br><strong>Kyun chahiye:</strong> availability inhi do se banti hai: <code>Availability = MTBF ÷ (MTBF + MTTR)</code>. Ye batata hai ki mehnat kahan lagaayein.` },
    { type: 'p', html: `Example: server mahine mein ek baar girta hai (MTBF 720 h), aur theek karne mein 1 ghanta (MTTR 1 h): 720 ÷ 721 = <strong>99.86%</strong>. Ab do raaste: girna aadha karo (MTBF 1,440 h) to 99.93%. Ya recovery automatic karo, 6 minute (MTTR 0.1 h): <strong>99.986%</strong>. Recovery tez karna aksar sasta aur zyada asardaar hai. Khud dekho:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>MTBF: har <strong class="mB"></strong> ghante mein ek failure</label><input class="mBr" type="range" min="24" max="2160" step="24" value="720"></div>
          <div><label>MTTR: theek hone mein <strong class="mR"></strong> minute</label><input class="mRr" type="range" min="1" max="240" step="1" value="60"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Availability</span><strong class="mA"></strong></div>
          <div class="stat"><span>Saal mein failures</span><strong class="mF"></strong></div>
          <div class="stat"><span>Downtime per year</span><strong class="mD"></strong></div>
        </div>
        <div class="calc-note mN"></div>`;
      const upd = () => {
        const b = +el.querySelector('.mBr').value, rMin = +el.querySelector('.mRr').value, r = rMin / 60;
        const a = b / (b + r), fy = 8760 / (b + r), dy = fy * rMin;
        el.querySelector('.mB').textContent = b.toLocaleString('en-IN');
        el.querySelector('.mR').textContent = rMin;
        el.querySelector('.mA').textContent = (a * 100).toFixed(3) + '%';
        el.querySelector('.mF').textContent = fy.toFixed(1);
        el.querySelector('.mD').textContent = dy >= 120 ? (dy / 60).toFixed(1) + ' ghante' : Math.round(dy) + ' min';
        el.querySelector('.mN').textContent = rMin <= 5
          ? 'Itna tez recovery sirf automation se aata hai: health check ne pakda, backup ne turant jagah li. Insaan ko jagaane mein hi 5 minute lag jaate hain.'
          : rMin >= 60
          ? 'Recovery mein insaan lag raha hai (alert, uthna, laptop, fix). MTTR slider ko 6 minute pe le jao aur dekho availability kitni uchhalti hai.'
          : 'Beech ka raasta: thoda automation, thoda insaan. Failures kam karna (MTBF badhana) mehenga hai; recovery tez karna aksar sasta.';
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd));
      upd();
    }},
    { type: 'h2', text: 'Single Point of Failure (SPOF)' },
    { type: 'callout', tone: 'term', title: 'Naya word: SPOF (Single Point of Failure)', html: `<strong>Ye kya hai:</strong> wo ek component jiske girne se poora system gir jaata hai, kyunki uski koi copy nahi. Jaise ghar ka ek hi darwaza, aur uska taala atak gaya.<br><strong>Kyun dhoondhna zaroori:</strong> system utna hi bharosemand hai jitna uska sabse kamzor, akela hissa. 10 servers hon aur database ek, to database hi tumhari availability tay karta hai.<br><strong>Iske bina (SPOF chhod diya to):</strong> baaki sab par lagaya paisa bekaar, ek cheez giri aur site gayi.<br><strong>Kaise hataayein:</strong> us cheez ki ek <strong>redundant</strong> (extra, backup) copy rakho, aur girne pe apne aap switch karo.` },
    { type: 'p', html: `Neeche xyz.com ke architecture mein ek ek karke components girao aur dekho kaun SPOF hai. Har box pe click karke uski explanation padho:` },
    { type: 'flow', height: 360,
      nodes: [
        { id: 'u', label: 'Users', x: 80, y: 160, w: 110, kind: 'client', info: 'Ye kya hai: xyz.com ke users. Unhe sirf itna dikhta hai: site khuli ya nahi.' },
        { id: 'lb', label: 'Load Balancer', x: 270, y: 160, w: 150, kind: 'edge', info: 'Ye kya hai: saare traffic ka darwaza, jo requests ko servers mein baantta hai. Saara traffic isi se guzarta hai, isliye akela LB khud SPOF hai.' },
        { id: 'lb2', label: 'Standby LB', sub: 'backup', x: 270, y: 300, w: 150, kind: 'edge', hidden: true, info: 'Ye kya hai: main LB ki copy jo normally kuch nahi karti, bas uski "heartbeat" sunti hai. Main LB gira to ye uski jagah le leti hai. Isko active-passive setup kehte hain.' },
        { id: 's1', label: 'Server 1', x: 470, y: 90, w: 130, kind: 'server', info: 'Ye kya hai: xyz.com ka code chalane wala server. Iski copy (Server 2) hai, isliye ye SPOF nahi.' },
        { id: 's2', label: 'Server 2', x: 470, y: 230, w: 130, kind: 'server', info: 'Ye kya hai: Server 1 ki copy. Dono saath kaam karte hain (active-active), ek gire to doosra sab sambhal leta hai.' },
        { id: 'db', label: 'Database', x: 650, y: 160, w: 110, kind: 'data', info: 'Ye kya hai: xyz.com ka saara data. Shuru mein ye akela hai, to iske girne pe koi bhi server kisi kaam ka nahi: SPOF.' },
        { id: 'db2', label: 'DB replica', sub: 'copy', x: 650, y: 300, w: 110, kind: 'data', hidden: true, info: 'Ye kya hai: database ki ek copy jo har badlaav lagataar copy karti rehti hai (replication). Main DB gira to isko naya main bana dete hain (promote).' },
      ],
      edges: [
        { a: 'u', b: 'lb' }, { a: 'lb', b: 's1' }, { a: 'lb', b: 's2' },
        { a: 'u', b: 'lb2', dashed: true }, { a: 'lb2', b: 's1', dashed: true }, { a: 'lb2', b: 's2', dashed: true },
        { a: 's1', b: 'db' }, { a: 's2', b: 'db' },
        { a: 'db', b: 'db2', dashed: true, hidden: true }, { a: 's2', b: 'db2', hidden: true },
      ],
      scenarios: [
        { name: 'Server 1 gira', steps: [
          { title: 'Server 1 crash', text: 'Hardware fail ho gaya.', set: { s1: { state: 'down', sub: 'DOWN' } }, focus: ['s1'] },
          { title: 'Load Balancer sab Server 2 ko bhejta hai', text: 'LB ka health check (har kuch second mein "zinda ho?" poochhna) fail hua, to LB ne Server 1 ko list se hata diya. User ko pata bhi nahi chala. Server SPOF <strong>nahi</strong> hai, kyunki uski copy hai.', go: ['u>lb>s2>db', 'res:db>s2>lb>u'] },
        ]},
        { name: 'Database gira', steps: [
          { title: 'Database crash', text: 'Disk fail ho gayi.', set: { db: { state: 'down', sub: 'DOWN' } }, focus: ['db'] },
          { title: 'Dono servers zinda, phir bhi site down', text: 'Servers chal rahe hain lekin data ke bina kuch nahi kar sakte. <strong>Database yahan SPOF hai.</strong>', go: ['u>lb>s1', 'lost:s1>db'], after: { s1: { sub: '500 error' }, s2: { sub: '500 error' } } },
          { title: 'Fix: replica jo pehle se taiyaar hai', text: 'Ek <strong>replica</strong> (copy) har badlaav lagataar copy kar rahi thi. Main DB gira to replica ko naya main bana diya (promote) aur servers ab usse baat karte hain. Downtime: ghanton ki jagah seconds se kuch minute. Iski poori kahani "Database replication" lesson mein.', show: ['db2', 'db-db2', 's2-db2'], set: { db2: { state: 'ok', sub: 'ab main!' }, s1: { sub: '' }, s2: { sub: '' } }, go: ['u>lb>s2>db2', 'res:db2>s2>lb>u'] },
        ]},
        { name: 'Load Balancer gira', steps: [
          { title: 'LB crash', text: 'Load Balancer hi gir gaya.', set: { lb: { state: 'down', sub: 'DOWN' } }, go: 'lost:u>lb' },
          { title: 'Sab kuch theek hai, phir bhi koi andar nahi aa sakta', text: 'Servers aur DB healthy hain, lekin darwaza hi band hai. <strong>Akela LB bhi SPOF hai.</strong>', focus: ['lb'] },
          { title: 'Fix: standby LB', text: 'Ek backup LB rakho jo main LB ki "heartbeat" sunta rehta hai. Heartbeat band hui to wo turant main LB ka address (IP) le leta hai aur traffic sambhal leta hai. Is switch ko <strong>failover</strong> kehte hain.', show: ['lb2'], set: { lb2: { state: 'ok', sub: 'ab active!' } }, go: ['u>lb2>s1>db', 'res:db>s1>lb2>u'] },
        ]},
      ],
    },
    { type: 'callout', tone: 'tip', title: 'SPOF dhoondhne ka tareeka', html: `Apne architecture ka diagram banao. Har box pe ungli rakh ke poochho: <strong>"ye gira to kya hoga?"</strong> Agar jawab "sab band" hai, to wo SPOF hai. Sirf servers nahi, ye bhi dekho: DNS provider, ek hi network cable/switch, ek hi data center ki bijli, ek hi payment provider, aur haan, wo ek engineer jise hi pata hai ki deploy kaise hota hai.` },
    { type: 'h2', text: 'Redundancy ke do style' },
    { type: 'callout', tone: 'term', title: 'Naya word: Redundancy', html: `<strong>Ye kya hai:</strong> kisi zaroori cheez ki ek se zyada copy rakhna, taaki ek toote to doosri kaam kare. Jaise phone mein do SIM: ek ka network gaya to doosre se call.<br><strong>Kyun chahiye:</strong> SPOF hataane ka yahi ek tareeka hai.<br><strong>Iske bina:</strong> har component ek SPOF.<br><strong>Keemat:</strong> copies ka paisa, aur copies ko aapas mein "sync" (ek jaisa) rakhne ki mehnat.` },
    { type: 'image', src: 'assets/img/availability-spof/backup-generator.jpg', alt: 'Ek data center ke andar bada hara diesel generator, jis pe "Generator B" likha hai', caption: 'Redundancy sirf software mein nahi hoti. Ye ek data center ka diesel generator hai, naam dekho: "Generator B". Bijli gayi to batteries kuch minute chalaati hain aur generator chalu ho jaata hai. Aur "A" bhi hai, kyunki generator bhi SPOF na bane.', credit: { text: 'Mikael Häggström, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Power_generator_of_a_hospital_data_center.jpg', license: 'CC0' } },
    { type: 'compare',
      left: { title: 'Active-passive', ascii: `
   [ LB-A ]  ← kaam kar raha
   [ LB-B ]  ← sirf wait (standby)

A gira → B active` , html: 'Ek kaam karta hai, doosra khaali baith ke intezaar. Simple, aur data ek hi jagah likha jaata hai (conflict nahi). Lekin backup ki capacity normally bekaar, aur switch hone mein kuch seconds se minute lagte hain. Databases aksar aise chalte hain (primary + standby).' },
      right: { title: 'Active-active', ascii: `
   [ Server 1 ] ← kaam kar raha
   [ Server 2 ] ← kaam kar raha

1 gira → 2 sab sambhale` , html: 'Dono saath kaam karte hain, dono ki capacity use hoti hai, aur switch ka time lagbhag zero. Stateless app servers ke liye perfect. Lekin dhyaan: agar dono 80% pe chal rahe the, to ek girne pe doosre pe 160% aa jayega aur wo bhi gir jayega.' },
    },
    { type: 'callout', tone: 'warn', title: 'Headroom rakho', html: `Active-active mein servers ko 100% tak mat chalao. Aim karo 50-70% ka, taaki ek server ya ek poora data center gire to baaki uska load utha sakein. Isliye real fleets mein capacity hamesha thodi "extra" dikhti hai. Aur ye "extra" bekaar nahi, ye tumhara insurance hai.` },

    { type: 'h3', text: 'Failover: backup ko kaise pata chale ki ab uski baari hai?' },
    { type: 'callout', tone: 'term', title: 'Naya word: Failover', html: `<strong>Ye kya hai:</strong> main component gira to uska kaam backup ko <em>apne aap</em> saunpna. Wapas main pe aana <strong>failback</strong> kehlata hai.<br><strong>Kyun chahiye:</strong> backup tabhi kaam ka hai jab switch jaldi ho. 99.99% mein saal ke sirf 53 minute milte hain, insaan ke jaagne ka time nahi.<br><strong>Iske bina:</strong> backup pada rahega aur site down, jab tak koi manually switch na kare.` },
    { type: 'steps', items: [
      { t: 'Heartbeat / health check', d: 'Backup (ya LB) har 1-5 second mein poochhta hai "zinda ho?". Jaise <code>GET /health</code> pe 200 aana chahiye.' },
      { t: 'Kuch baar fail hone do', d: 'Ek baar jawab na aaye to network ka jhatka ho sakta hai. Aksar 3 baar lagaatar fail = "mara hua" maante hain. Jaldbaazi = bina wajah failover.' },
      { t: 'Backup kaam leta hai', d: 'Standby LB main ka IP le leta hai, ya replica database "primary" ban jaata hai, ya DNS naya address bata deta hai.' },
      { t: 'Baaki sab ko batao', d: 'Clients/servers naye address pe jaate hain. Jo requests beech mein atkin, wo retry hoti hain.' },
      { t: 'Purana wapas aaye to dhyaan', d: 'Purana main jaag ke khud ko phir se main na samjhe! Do "main" ek saath = <strong>split brain</strong> (dono alag alag data likhte hain). Isse bachne ke tareeke replication aur coordination lessons mein.' },
    ]},
    { type: 'callout', tone: 'mistake', html: `"Backup hai, to safe hain" galat soch hai agar failover kabhi <strong>test</strong> nahi kiya. Bahut saare outages mein backup tha, lekin switch fail hua (galat config, purana data, ya backup itna chhota ki load nahi utha paaya). Isliye badi companies jaan bujh ke cheezein band karke dekhti hain (Netflix ka Chaos Monkey isi ka famous example hai).` },

    { type: 'h3', text: 'Data ki redundancy: replicas aur backups' },
    { type: 'p', html: `Server ki copy banana aasaan hai (same code). <strong>Data</strong> ki copy alag mamla hai, kyunki data har second badalta hai. Do alag cheezein chahiye:` },
    { type: 'table', head: ['', 'Replica', 'Backup'], rows: [
      ['Ye kya hai', 'Database ki live copy, har badlaav seconds mein copy', 'Kisi pal ki "photo" (snapshot), jaise roz raat 2 baje'],
      ['Kis cheez se bachata hai', 'Machine/disk/zone ka girna: turant switch', 'Galti se delete, bug ne data bigaada, hack: purane pal pe wapas jao'],
      ['Kahan rakhte hain', 'Doosri machine, aksar doosri availability zone', 'Alag jagah (object storage), doosre region mein bhi'],
      ['Kamzori', 'Galti bhi turant copy ho jaati hai (DELETE replica pe bhi chala)', 'Restore mein ghante; aakhri backup ke baad ka data ja sakta hai'],
    ]},
    { type: 'callout', tone: 'mistake', html: `"Hamare paas replica hai, to backup ki zaroorat nahi" bahut khatarnaak galti hai. Kisi ne galti se <code>DELETE FROM users</code> chala diya to replica bhi ek second mein khaali. Replica availability ke liye, backup data bachane ke liye. Dono chahiye, aur backup ko kabhi kabhi restore karke dekho ki sach mein chalta hai.` },
    { type: 'h2', text: 'Availability ka hisaab: serial vs parallel' },
    { type: 'p', html: `Ek request ko LB, server aur database, teeno se guzarna padta hai. To poore system ki availability kitni? Do simple niyam hain:` },
    { type: 'callout', tone: 'term', title: 'Naya word: Serial (ek ke baad ek)', html: `<strong>Ye kya hai:</strong> jab request ko A <em>aur</em> B <em>aur</em> C sab se guzarna hai. Koi ek gira to request fail.<br><strong>Hisaab:</strong> availabilities ka <strong>guna</strong>: <code>A × B × C</code>. Har nayi kadi total ko <em>kam</em> karti hai.<br><strong>Example:</strong> LB 99.9%, server 99.9%, DB 99.9%: 0.999 × 0.999 × 0.999 = <strong>99.70%</strong>. Har hissa "three nines" tha, lekin poora system 99.7% (saal mein ~26 ghante down).` },
    { type: 'callout', tone: 'term', title: 'Naya word: Parallel (copies, koi bhi ek chal jaaye)', html: `<strong>Ye kya hai:</strong> jab ek hi kaam ki do copies hain aur koi bhi ek chalu ho to kaam ho jaata hai.<br><strong>Hisaab:</strong> dono ek saath gire, iska chance = <code>(1 − A) × (1 − A)</code>. To availability = <code>1 − (1 − A)²</code>. Har nayi copy total ko <em>badhati</em> hai.<br><strong>Example:</strong> do servers, dono 99%: dono ek saath down ka chance 1% × 1% = 0.01%. Availability = <strong>99.99%</strong>. Do "two nines" machines se "four nines"!` },
    { type: 'p', html: `Ab khud banao. Har tier (LB, app servers, database) ki availability aur copies chuno. Calculator har tier ko parallel ki tarah, aur teeno tiers ko serial ki tarah jodta hai:` },
    { type: 'custom', render(el) {
      const TIERS = ['Load Balancer', 'App servers', 'Database'], AV = [0.99, 0.999, 0.9995, 0.9999];
      const st = [{ a: 1, n: 1 }, { a: 1, n: 1 }, { a: 1, n: 1 }];
      el.innerHTML = `<div class="avT" style="display:grid;gap:10px"></div>
        <div class="stats"><div class="stat"><span>Poora system</span><strong class="avA"></strong></div><div class="stat"><span>Downtime per year</span><strong class="avD"></strong></div><div class="stat"><span>Sabse kamzor kadi</span><strong class="avW"></strong></div></div>
        <div class="calc-note avN"></div>`;
      const box = el.querySelector('.avT');
      const pct = a => a >= 0.9999999 ? '> 99.99999%' : (a * 100).toFixed(a > 0.99999 ? 5 : a > 0.9999 ? 4 : 3) + '%';
      const tierA = t => 1 - Math.pow(1 - AV[t.a], t.n);
      const dt = a => { const m = (1 - a) * 525600; return m >= 120 ? (m / 60).toFixed(1) + ' ghante' : m >= 1 ? m.toFixed(1) + ' min' : m * 60 >= 1 ? Math.round(m * 60) + ' sec' : '< 1 sec'; };
      TIERS.forEach((name, i) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;border:1px solid var(--line);border-radius:var(--r);padding:8px 10px';
        row.innerHTML = `<strong style="min-width:120px">${name}</strong>
          <select class="avS" aria-label="${name} availability">${AV.map((a, k) => `<option value="${k}"${k === 1 ? ' selected' : ''}>har copy ${(a * 100).toFixed(2).replace(/\.?0+$/, '')}%</option>`).join('')}</select>
          <span style="display:flex;gap:4px">${[1, 2, 3].map(n => `<button type="button" class="chip avC" data-n="${n}">${n} ${n === 1 ? 'copy' : 'copies'}</button>`).join('')}</span>
          <span class="avR" style="margin-left:auto;font-family:var(--f-mono);font-size:13px;color:var(--ink-2)"></span>`;
        row.querySelector('.avS').onchange = e => { st[i].a = +e.target.value; upd(); };
        row.querySelectorAll('.avC').forEach(b => b.onclick = () => { st[i].n = +b.dataset.n; upd(); });
        box.appendChild(row);
      });
      const upd = () => {
        let total = 1, worst = 0;
        [...box.children].forEach((row, i) => {
          const a = tierA(st[i]); total *= a; if (a < tierA(st[worst])) worst = i;
          row.querySelectorAll('.avC').forEach(b => b.classList.toggle('on', +b.dataset.n === st[i].n));
          row.querySelector('.avR').textContent = 'tier: ' + pct(a);
        });
        el.querySelector('.avA').textContent = pct(total);
        el.querySelector('.avD').textContent = dt(total);
        el.querySelector('.avW').textContent = TIERS[worst];
        const ones = st.filter(t => t.n === 1).length;
        el.querySelector('.avN').textContent = ones === 3
          ? 'Teen kadiyan serial mein, har ek akeli: total har hisse se kam. Ab har tier pe "2 copies" dabao.'
          : ones > 0
          ? `Abhi bhi ${ones} tier akela hai (SPOF). Total lagbhag usi akele tier ke barabar atka hai: sabse kamzor kadi chain tay karti hai.`
          : 'Har tier pe copies: total har akele hisse se bhi zyada! Lekin ye hisaab maanta hai ki copies alag alag girti hain aur switch turant hota hai. Asli zindagi mein dono copies ek hi building mein hon to saath gir sakti hain, isliye copies alag zones mein rakhte hain.';
      };
      upd();
    }},
    { type: 'p', html: `Teeno 99.9% aur 1-1 copy: <strong>99.700%</strong> (~26 ghante/saal). Teeno pe 2 copies: <strong>99.9997%</strong> (~1.6 minute/saal). Ab sirf database ko 1 copy pe wapas karo: total gir ke <strong>99.900%</strong> (~8.8 ghante). Ek akela tier poore system ko apne level pe kheench laata hai.` },
    { type: 'callout', tone: 'warn', title: 'Ye hisaab kab jhooth bolta hai', html: `<ul><li><strong>Copies saath girti hain:</strong> dono servers ek hi rack, ek hi bijli, ek hi zone mein = ek hi failure dono ko le doobta hai. Formula maanta hai ki failures alag alag (independent) hain.</li><li><strong>Failover turant nahi:</strong> switch mein 30 second lage to wo bhi downtime hai.</li><li><strong>Ek hi bug sab copies mein:</strong> same code, same bug. Ek kharab deploy saari copies ko ek saath gira sakta hai. Isliye deploy dheere dheere (ek ek server) karte hain.</li></ul>` },
    { type: 'h2', text: 'Regions aur availability zones' },
    { type: 'p', html: `Do servers ek hi building mein hain aur building ki bijli chali gayi, ya aag lagi, ya baadh aayi? Dono gaye. Calculator ka "alag alag girna" yahan toot jaata hai. Isliye cloud providers (AWS, Google Cloud, Azure) do level dete hain:` },
    { type: 'callout', tone: 'term', title: 'Naya word: Availability Zone (AZ)', html: `<strong>Ye kya hai:</strong> ek shehar/ilaake ke andar ek ya zyada data centers ka group, jiski apni alag bijli, cooling aur network hai. AWS ke hisaab se ek region ke AZs aapas mein kai kilometre door hain (lekin 100 km ke andar), aur bahut tez network se jude hain.<br><strong>Kyun chahiye:</strong> ek building ki aag, bijli ya network ki kharabi sirf ek AZ ko giraati hai. Copies 2-3 AZs mein baanto.<br><strong>Iske bina:</strong> tumhari "do copies" ek hi kharabi se saath gir sakti hain.<br><strong>Example:</strong> AWS Mumbai region (<code>ap-south-1</code>) ke andar kai AZs hain. AWS ka har region kam se kam 3 AZs ka hota hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Region', html: `<strong>Ye kya hai:</strong> ek alag shehar/desh mein AZs ka poora group (Mumbai, Hyderabad, Singapore, Virginia). Regions ek doosre se poori tarah alag rakhe jaate hain.<br><strong>Kyun chahiye:</strong> poore ilaake ki aafat (bada toofan, bijli grid, ya cloud ki poore region ki galti) se bachne ke liye, aur door ke users ke paas server rakhne ke liye.<br><strong>Keemat:</strong> multi-region bahut mehenga aur complex hai: data ko hazaaron km door copy karna padta hai (latency), aur dono jagah likhne pe conflicts.` },
    { type: 'table', head: ['Kahan copy rakhi', 'Kis cheez se bachaati hai', 'Kis se nahi'], rows: [
      ['Same machine pe 2 processes', 'Ek process crash', 'Machine, disk, bijli'],
      ['Same AZ mein 2 machines', 'Ek machine/disk ka girna', 'Building ki bijli, aag, network'],
      ['2-3 AZs mein (same region)', 'Ek poore data center ka girna', 'Poore region ki aafat'],
      ['2 regions mein', 'Poore region ka girna', 'Tumhare apne code ka bug (wo dono jagah hai!)'],
    ], caption: 'Zyada tar products ke liye "multi-AZ" sahi jagah hai. Multi-region tab, jab business ko sach mein chahiye.' },
    { type: 'callout', tone: 'why', title: 'Decide', html: `<strong>Har tier pe kam se kam 2 copies</strong>, alag alag availability zones mein, <strong>automatic failover</strong> ke saath (health checks + standby/replica). Stateless servers ko active-active chalao, database ko primary + standby (active-passive). Servers ko 50-70% pe chalao taaki ek zone gire to baaki uthaa lein. Data ka backup alag jagah. <strong>Multi-region</strong> tabhi jab target 99.99% se upar ho ya kanoon/door ke users maangein, kyunki uska kharcha aur complexity bahut zyada hai.` },
    { type: 'diagram', title: 'xyz.com high availability: poori picture', height: 600,
      groups: [
        { label: 'AZ a', x: 30, y: 110, w: 310, h: 360 },
        { label: 'AZ b', x: 380, y: 110, w: 310, h: 360 },
        { label: 'Doosra region', x: 250, y: 490, w: 300, h: 100 },
      ],
      nodes: [
        { id: 'users', label: 'Users', x: 200, y: 60, kind: 'client', info: 'Ye kya hai: xyz.com ke users. Unke liye availability ka matlab bas itna: jab bhi aayein, site chale.' },
        { id: 'dns', label: 'DNS', sub: 'health-checked', x: 520, y: 60, kind: 'net', info: 'Ye kya hai: naam (xyz.com) ko IP mein badalne wali phonebook. Kyun yahan: DNS bhi copies mein hota hai, aur zaroorat pade to zinda LB ka address bata sakta hai.' },
        { id: 'lb1', label: 'LB (active)', x: 185, y: 170, kind: 'edge', info: 'Ye kya hai: abhi kaam kar raha Load Balancer, servers mein traffic baantta hai aur health checks se gire server ko hataata hai.' },
        { id: 'lb2', label: 'LB (standby)', x: 535, y: 170, kind: 'edge', info: 'Ye kya hai: doosre AZ mein LB ki copy. Heartbeat sunti hai; main LB gira to uska kaam le leti hai (active-passive failover).' },
        { id: 's1', label: 'Server 1', sub: 'active', x: 185, y: 290, kind: 'server', info: 'Ye kya hai: stateless app server, AZ a mein. Server 2 ke saath active-active. 50-70% pe chalta hai taaki Server 2 ka load bhi utha sake.' },
        { id: 's2', label: 'Server 2', sub: 'active', x: 535, y: 290, kind: 'server', info: 'Ye kya hai: Server 1 ki copy, doosre AZ mein. Ek poora zone gire to bhi ye chalta rahe.' },
        { id: 'dbp', label: 'DB primary', x: 185, y: 410, kind: 'data', info: 'Ye kya hai: main database jahan saari writes jaati hain. Har badlaav replica ko bhejta hai.' },
        { id: 'dbr', label: 'DB replica', sub: 'standby', x: 535, y: 410, kind: 'data', info: 'Ye kya hai: primary ki live copy, doosre AZ mein. Primary gira to isko promote karke naya primary banate hain (failover).' },
        { id: 'bk', label: 'Backups', sub: 'roz ka snapshot', x: 430, y: 545, kind: 'data', info: 'Ye kya hai: database ki roz ki "photo", doosre region ke storage mein. Kyun: galti se delete ya bug se bigde data ko purane pal pe wapas laane ke liye. Replica ye nahi kar sakti.' },
      ],
      edges: [
        { a: 'users', b: 'dns', n: 1, label: 'IP?' },
        { a: 'users', b: 'lb1', n: 2 },
        { a: 'users', b: 'lb2', dashed: true, via: [[360, 100], [535, 100]] },
        { a: 'lb1', b: 'lb2', dashed: true, both: true, kind: 'evt', label: 'heartbeat' },
        { a: 'lb1', b: 's1', n: 3 }, { a: 'lb1', b: 's2' },
        { a: 'lb2', b: 's2', dashed: true },
        { a: 's1', b: 'dbp', n: 4 }, { a: 's2', b: 'dbp' },
        { a: 's2', b: 'dbr', dashed: true },
        { a: 'dbp', b: 'dbr', kind: 'evt', label: 'replication' },
        { a: 'dbp', b: 'bk', dashed: true, kind: 'evt', label: 'roz raat', via: [[185, 545]] },
      ],
      paths: [
        { name: 'Normal din', text: 'DNS se LB ka address, active LB ne server chuna, server ne primary DB se data liya. Primary har badlaav replica ko bhej raha hai.', go: ['users>dns', 'users>lb1>s1>dbp', 'dbp>dbr'] },
        { name: 'Server 1 gira', text: 'Health check fail. LB saara traffic Server 2 (doosre AZ) ko bhejta hai. Headroom tha, to Server 2 sambhal leta hai.', go: ['users>lb1>s2>dbp'] },
        { name: 'LB gira', text: 'Heartbeat band. Standby LB ne kaam le liya, ab users usi pe aate hain.', go: ['lb1>lb2', 'users>lb2>s2>dbp'] },
        { name: 'AZ a poora gira', text: 'LB, Server 1 aur primary DB teeno gaye. Standby LB active, replica promote hoke naya primary. Site chalu, sirf AZ b se.', go: ['users>lb2>s2>dbr'] },
        { name: 'Galti se delete', text: 'DELETE replica pe bhi copy ho gaya. Bachaav sirf backup: kal raat ke snapshot se restore.', go: ['dbp>bk'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Availability = uptime ÷ kul time (ya safal requests ÷ kul requests). 99.9% ≈ 8.8 ghante/saal, 99.99% ≈ 53 minute/saal. Har 9 = downtime 10 guna kam, kharcha kai guna zyada.</li>
      <li>Availability = MTBF ÷ (MTBF + MTTR). Recovery tez karna (automation) aksar girna kam karne se sasta.</li>
      <li>SPOF = akela hissa jiske girne se sab gire. Har box pe poochho: "ye gira to?"</li>
      <li>Redundancy: active-active (dono kaam karein, stateless servers) ya active-passive (ek wait kare, databases). Headroom 50-70%.</li>
      <li>Failover = health check/heartbeat + automatic switch. Test nahi kiya to bharosa mat karo. Split brain se bacho.</li>
      <li>Serial = guna (har kadi total ghataati hai). Parallel = 1 − (1 − A)ⁿ (har copy badhaati hai). Copies alag AZs mein, warna saath girengi.</li>
      <li>Replica girne se bachaati hai, backup galti/bug se. Dono chahiye.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Ek machine, ek zone gire to bhi site chalu', 'Raat 3 baje bina insaan ke recovery (automatic failover)', 'Planned maintenance bina downtime (ek copy band, doosri chalu)', 'Galti se delete hua data backup se wapas'], costs: ['Har copy ka paisa, aur headroom ki khaali capacity ka paisa', 'Copies ko sync rakhna: replication lag, split brain ka khatra', 'Failover ka logic khud ek complex cheez hai jo test karna padta hai', 'Multi-region: bahut mehenga, latency aur data conflicts'] },
    { type: 'think', questions: [
      { q: 'xyz.com ke 10 servers hain, 2 Load Balancers hain, lekin ek hi database hai. SPOF kya hai?', a: 'Database. Redundancy ki chain utni hi strong hai jitni uski sabse kamzor kadi. Servers ki ginti badhane se database SPOF nahi hata. Fix: replica (doosre AZ mein) + automatic failover, aur backups.' },
      { q: '99.99% availability chahiye. Kya on-call engineer ko alert bhej ke manually fix karna kaafi hai?', a: 'Nahi. 99.99% = mahine mein sirf ~4.4 minute downtime. Engineer ke uthne, laptop kholne mein hi itna time lag jaata hai. Failover automatic hona chahiye (health checks + standby).' },
      { q: 'Tumhare dono app servers same AZ mein hain, har ek 99.9%. Calculator kehta hai 99.9999%. Kya ye sach hai?', a: 'Nahi. Formula maanta hai ki dono alag alag girte hain. Same AZ mein bijli ya network jaate hi dono saath girenge. Asli availability AZ ki availability se zyada nahi ho sakti. Fix: ek server doosre AZ mein.' },
      { q: 'Payment provider (bahar ki company) 99.9% available hai. Tumhara poora system 99.99% hai. Checkout ki availability kitni?', a: 'Serial: 0.9999 × 0.999 ≈ 99.89%. Checkout tumhare sabse kamzor dependency jitna hi achha hai. Bachaav: do payment providers (parallel) ya failure pe "baad mein retry" wala graceful fallback.' },
    ]},
    { type: 'quiz', questions: [
      { q: '99.9% availability ka matlab saal mein lagbhag kitna downtime?', options: ['~9 minute', '~9 ghante', '~9 din'], answer: 1, explain: '0.1% of 365 din ≈ 8.8 ghante. Har extra 9 isse 10 guna kam karta hai.' },
      { q: 'SPOF kaise hataate hain?', options: ['Server ko bada karke', 'Us component ki redundant copy rakh ke, automatic failover ke saath', 'Cache lagake'], answer: 1, explain: 'Redundancy: copy jo original gire to kaam sambhal le, aur switch apne aap ho.' },
      { q: 'Active-active mein dono servers 80% load pe hain. Ek gira. Kya hoga?', options: ['Kuch nahi', 'Doosre pe ~160% load, wo bhi gir sakta hai', 'Load Balancer naya server bana dega'], answer: 1, explain: 'Isliye headroom rakhte hain: 50-70% utilisation target.' },
      { q: 'LB 99.9%, server 99.9%, DB 99.9%, sab akele, serial mein. Total?', options: ['99.9%', '~99.7%', '~99.99%'], answer: 1, explain: 'Serial = guna: 0.999³ ≈ 0.997. Har kadi total ko ghataati hai.' },
      { q: 'Do servers, har ek 99% available, koi bhi ek chale to kaafi. Total?', options: ['98%', '99%', '99.99%'], answer: 2, explain: 'Dono saath girne ka chance 1% × 1% = 0.01%. To 99.99% (agar wo alag alag girte hain).' },
      { q: 'MTBF 720 ghante, MTTR 1 ghanta. Availability lagbhag?', options: ['99.86%', '99.99%', '72%'], answer: 0, explain: '720 ÷ (720 + 1) ≈ 0.9986. MTTR 6 minute karo to ~99.986%.' },
      { q: 'Kisi ne galti se users table delete kar di. Kya bachayega?', options: ['Replica', 'Backup', 'Load Balancer'], answer: 1, explain: 'Replica pe bhi delete turant copy ho jaata hai. Sirf purane pal ka backup data wapas la sakta hai.' },
    ]},
    { type: 'sources', note: 'Nines, availability ke formulas aur cloud zones ki jaankari inhi sources se.', items: [
      { title: 'Embracing Risk (Site Reliability Engineering book, chapter 3)', publisher: 'Google', official: true, year: 2016, url: 'https://sre.google/sre-book/embracing-risk/', used: 'Time-based vs request-based availability, 99.99% ≈ 52.56 min/year, 2.5M requests with 250 allowed errors example, error budgets, each extra nine costs far more, 100% is rarely the right target.' },
      { title: 'Regions and Availability Zones', publisher: 'AWS', official: true, url: 'https://aws.amazon.com/about-aws/global-infrastructure/regions_az/', used: 'Each region has at least three isolated AZs; AZs are many kilometres apart but within 100 km; each AZ has independent power, cooling and networking.' },
      { title: 'Regions and Zones (Amazon EC2 User Guide)', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html', used: 'Spreading instances across AZs protects from failure of one location; regions are isolated from each other.' },
      { title: 'The Netflix Simian Army', publisher: 'Netflix TechBlog', official: true, year: 2011, url: 'https://netflixtechblog.com/the-netflix-simian-army-16e57fbab116', used: 'Chaos Monkey randomly turns off production instances to prove the system survives failures (an older post, but the idea is still used).' },
    ]},
  ],
});
