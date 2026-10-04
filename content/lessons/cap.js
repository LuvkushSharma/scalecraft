Lesson.register({
  id: 'cap',
  title: 'CAP aur PACELC',
  minutes: 22,
  summary: `Do data centres ke beech ka network toot gaya. Ab har replicated system ko ek mushkil faisla lena padta hai: galat (purana) data dikhao, ya error do? CAP ye faisla samjhata hai, aur PACELC batata hai ki bina kisi failure ke bhi roz ek chhota faisla hota hai: speed ya consistency.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `xyz.com ka data ab do shehron mein rakha hai, Mumbai aur Singapore. Dono jagah ek copy hai.<br>Ek din dono shehron ke beech ka cable kat gaya. Dono jagah ke computers chal rahe hain, bas ek doosre se baat nahi kar pa rahe.<br>Ab ek user kuch maangta hai. Computer ke paas sirf do raaste hain: <strong>"abhi nahi ho sakta" bole</strong>, ya <strong>jo purana data uske paas hai wahi de de</strong>.<br>Ye lesson sikhata hai ki kab kaunsa raasta chunna hai, aur ye bhi ki cable theek ho tab bhi ek chhota sa roz ka faisla hota hai: tez jawab ya bilkul taaza jawab.` },
    { type: 'h2', text: 'Problem: cable kat gaya, ab kya?' },
    { type: 'p', html: `Phase 2 mein xyz.com ne bahut kuch seekha: data ki copies (replication), data ke tukde (sharding), aur machines ka aapas mein faisla lena (coordination). Ab xyz.com ke users India ke saath South-East Asia mein bhi hain, isliye data do regions mein hai: <strong>Mumbai</strong> aur <strong>Singapore</strong>. Har region ke paas apni copy hai, aur dono ke beech ek network link hai jisse updates aate jaate hain.` },
    { type: 'callout', tone: 'term', title: 'Naye words: region, replica, majority', html: `<strong>Region:</strong> ek shehar ya ilaaka jahan cloud company ka data center hai (jaise "Mumbai region"). Region ke andar machines ek doosre se ~1 ms mein baat karti hain; do regions ke beech kai dasiyon milliseconds lagte hain.<br><strong>Replica:</strong> data ki ek poori copy, kisi doosri machine pe (replication lesson). Seat A7 kiski hai, ye baat 3 machines pe likhi ho to 3 replicas hain.<br><strong>Majority:</strong> aadhe se zyada. 3 replicas mein majority = 2. Rule: koi bhi pakka faisla tabhi jab majority haan bole, kyunki do alag groups dono majority nahi ho sakte (coordination lesson).<br><strong>Kyun chahiye:</strong> copies isliye ki ek machine ya ek shehar gire to data bacha rahe aur paas wale users ko tez jawab mile.<br><strong>Iske bina:</strong> ek hi copy, ek hi shehar: Singapore ke user ko har click pe Mumbai tak jaana padta, aur Mumbai gira to sab gaya.` },
    { type: 'image', src: 'assets/img/cap/submarine-cable-map.jpg', alt: 'Duniya ka naksha jis pe laal lakeerein samundar ke neeche bichhe internet cables dikhati hain; India, Singapore aur Europe ke beech bahut saare cables', caption: 'Ye duniya ke undersea (samundar ke neeche) internet cables ka naksha hai (2015 ka data). Mumbai aur Singapore jaise regions isi tarah ke cables se jude hain. Jahaz ka langar ya bhookamp ek cable kaat de, to regions ke beech ka raasta toot sakta hai ya bahut slow ho sakta hai. Yahi "partition" ka asli roop hai.', credit: { text: 'Greg Mahlknecht (cable data) and OpenStreetMap contributors, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Submarine_cable_map_umap.png', license: 'CC BY-SA 2.0' } },
    { type: 'p', html: `Naya feature launch hua: <strong>xyz Tickets</strong>, jahan log concerts aur cricket matches ki seats book karte hain. Ek din Mumbai aur Singapore ke beech ka link toot gaya (undersea cable ka issue, router ki galat config, kuch bhi). Dono regions ke servers zinda hain, users dono taraf aa rahe hain, bas regions ek doosre se baat nahi kar pa rahe.` },
    { type: 'p', html: `Usi waqt Mumbai mein Riya seat <strong>A7</strong> book karti hai. Singapore mein Aman bhi A7 book karna chahta hai. Singapore ke server ko Riya ki booking ka pata hi nahi. Ab Singapore ka server kya kare?` },
    { type: 'compare',
      left: { title: 'Option 1: mana kar do', html: `"Abhi booking nahi ho sakti, thodi der baad try karo."<br><br>Data galat nahi hoga (koi double booking nahi), lekin Aman ko <strong>error</strong> mila. System ne <strong>consistency</strong> chuni.` },
      right: { title: 'Option 2: haan bol do', html: `"A7 aapki ho gayi!"<br><br>Aman khush, system chalu raha. Lekin network theek hone pe pata chalega ki A7 do logon ko bik gayi. System ne <strong>availability</strong> chuni.` },
    },
    { type: 'p', html: `Teesra option nahi hai. Singapore ke paas Mumbai ki khabar laane ka koi raasta hi nahi, to wo ya to ruk sakta hai ya andaaze se jawab de sakta hai. Bas yahi <strong>CAP theorem</strong> ka saar hai. Ab teeno letters ko dhang se samjhte hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Network partition', html: `<strong>Ye kya hai:</strong> machines zinda hain, lekin unke beech ke messages <strong>pahunch nahi paate</strong> (kho jaate hain ya bahut der se aate hain). Network do (ya zyada) hisson mein bant jaata hai. Har hissa andar se theek chal raha hai, bas doosre hisse ko dekh nahi sakta.<br><strong>Kyun samajhna zaroori:</strong> jab tak data ki copies alag machines pe hain, ye kabhi na kabhi hoga hi: cable kategi, router galat configure hoga, firewall ka rule galti se lagega.<br><strong>Agar isko ignore karo:</strong> system ka behaviour us din "jo bhi ho jaaye" hoga: kabhi double booking, kabhi poori site atak jaayegi, aur kisi ko pata nahi kyun.<br><strong>Dhyaan do:</strong> sharding wala "partition" (data ke tukde) alag cheez hai. Yahan partition matlab <em>network ka tootna</em>.` },

    { type: 'h2', text: 'C, A aur P: plain words mein, aur asli matlab' },
    { type: 'p', html: `CAP teen cheezon ke naam ka chhota roop hai. Eric Brewer ne 2000 mein ek conjecture diya (conjecture = aisa andaaza jo abhi prove nahi hua). 2002 mein Seth Gilbert aur Nancy Lynch ne use maths se prove kiya, aur tab teeno letters ki <strong>pakki definitions</strong> likhi gayin. Log aksar CAP ko dheele matlab mein bolte hain, isliye ek ek letter alag se, ek chhote example ke saath:` },
    { type: 'callout', tone: 'term', title: 'C = Consistency (matlab linearizability)', html: `<strong>Ye kya hai:</strong> system aise behave kare <strong>jaise data ki sirf ek hi copy ho</strong>. Jaise hi ek write successful hua, uske baad shuru hone wala har read (kisi bhi replica se, duniya mein kahin se bhi) wahi naya value dekhe, ya usse bhi naya. Purana kabhi nahi.<br><strong>Kyun chahiye:</strong> kuch data mein "thoda purana" bhi galat hai. Seat A7 Riya ki ho chuki hai, to Aman ko A7 khaali dikhna = double booking.<br><strong>Iske bina:</strong> do users ek hi cheez ke do alag sach dekhte hain, aur dono us pe action le lete hain.<br><strong>Example:</strong> 10:00:00 pe Riya ki booking ka "OK" aaya. 10:00:01 pe Aman Singapore se A7 dekhta hai. C wala system Aman ko "booked" hi dikhayega, chahe Singapore ki copy tak update abhi pahuncha ho ya nahi (zaroorat ho to wo Mumbai se pooch ke aayega).<br>Is strong guarantee ka technical naam <strong>linearizability</strong> hai: har operation ek pal mein "ho jaata" hai, aur sab log ek hi order dekhte hain. (Isse kamzor levels bhi hote hain, jaise causal ya eventual; wo agle lesson "Consistency models aur quorums" mein.)` },
    { type: 'callout', tone: 'term', title: 'A = Availability (CAP wali)', html: `<strong>Ye kya hai:</strong> jo bhi server zinda hai aur request paata hai, wo <strong>asli jawab de, error nahi</strong>. Formal definition: har non-failing (zinda) node ko mili har request ka aakhir mein ek non-error response aana chahiye.<br><strong>Kyun chahiye:</strong> user ko "kuch galat ho gaya" page dikhana bhi nuksaan hai: like nahi laga, post nahi dikhi, user chala gaya.<br><strong>Iske bina:</strong> network ki ek chhoti dikkat pe bhi poore region ke users ko error.<br><strong>Example:</strong> cable kata hai. Aman Singapore server pe like dabata hai. A wala system bolega "liked!", chahe Mumbai ko abhi pata na ho. "Abhi nahi ho sakta" bolna = availability tooti.<br><strong>Dhyaan do:</strong> ye "99.9% uptime" wali availability se alag aur bahut strict hai: partition ke dauraan <em>har</em> zinda node, chahe wo chhote, kate hue hisse mein ho, jawab de.` },
    { type: 'callout', tone: 'term', title: 'P = Partition tolerance', html: `<strong>Ye kya hai:</strong> network messages kho sakte hain ya der se aa sakte hain, aur system <strong>phir bhi chalne ki koshish kare</strong>, ruk ke baith na jaaye. Formally: network kitne bhi messages gira sakta hai.<br><strong>Kyun chahiye:</strong> P koi "feature" nahi jo aap on/off karo. Ye bas sach ko maanna hai ki network tootega.<br><strong>Iske bina:</strong> system ka design maan leta hai "network kabhi nahi tootega". Jis din toota, us din kya hoga ye kisi ne socha hi nahi.<br><strong>Example:</strong> Mumbai ↔ Singapore cable 3 ghante kata raha. Partition tolerant system ne pehle se tay rule follow kiya (CP ya AP). Non-tolerant system kabhi hang hua, kabhi galat data diya.` },
    { type: 'table', head: ['Letter', 'Galat samajh', 'Sahi matlab'], rows: [
      ['C', 'Data "theek" hai, ya ACID wala C', 'Har read latest successful write dekhe, jaise ek hi copy ho (linearizability)'],
      ['A', 'Site 99.9% up hai', 'Har zinda node, partition mein bhi, har request ka non-error jawab de'],
      ['P', 'System partitions "support" karta hai', 'Network messages gira sakta hai; ye hoga hi, aapki choice nahi'],
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common confusion: do alag "C"', html: `ACID ka C (database ke rules na tootein: jaise balance negative na ho, foreign key valid ho) aur CAP ka C (sab replicas pe ek hi latest value dikhe) <strong>bilkul alag cheezein hain</strong>. Ek hi word, do matlab. Interview mein "consistency" bolo to saath mein batao kaunsi wali.` },
    { type: 'p', html: `Ab theorem ek line mein: <strong>jab network partition ho, to ek replicated system ya to C de sakta hai ya A, dono nahi.</strong> Proof ka idea upar ki Riya-Aman kahani hi hai: Singapore ko Mumbai ka naya write dikh hi nahi sakta. Agar wo jawab deta hai (A), to purana data de sakta hai (C toota). Agar sahi data ki guarantee chahiye (C), to use chup rehna padega (A toota).` },

    { type: 'h2', text: 'Chala ke dekho: normal, CP aur AP' },
    { type: 'p', html: `Setup: seat data ki <strong>3 replicas</strong> hain. 2 Mumbai mein, 1 Singapore mein. Kisi bhi faisle ke liye majority (3 mein se 2) chahiye, jaisa coordination lesson mein dekha tha. Har scenario chalao aur dekho partition mein kya badalta hai:` },
    { type: 'flow', height: 170,
      nodes: [
        { id: 'ua', label: 'Riya', sub: 'Mumbai user', x: 70, y: 85, w: 110, kind: 'client', info: 'Ye kya hai: Mumbai ke paas rehne wali ek user. Uski requests Mumbai region pe jaati hain, kyunki wo paas hai (kam latency).' },
        { id: 'dm', label: 'Mumbai DB', sub: '2 of 3 replicas', x: 215, y: 85, w: 130, kind: 'data', info: 'Ye kya hai: Mumbai region mein seat data ki 2 copies (replicas). 3 mein se 2 = majority, isliye partition ke dauraan bhi ye side akele faisle le sakti hai (CP mode mein).' },
        { id: 'ln', label: 'Network link', sub: 'Mumbai ↔ SG', x: 360, y: 85, w: 110, kind: 'net', info: 'Ye kya hai: dono regions ke beech ka network (undersea cables, routers). Isi ke through updates ek region se doosre tak jaate hain. Ye tootna hi partition hai. Normal din pe Mumbai se Singapore tak ek round trip mein kai dasiyon milliseconds lagte hain.' },
        { id: 'ds', label: 'Singapore DB', sub: '1 of 3 replicas', x: 505, y: 85, w: 130, kind: 'data', info: 'Ye kya hai: Singapore region ki 1 copy (replica). Paas ke users ko tez jawab dene ke liye yahan rakhi hai. Akele ye minority hai: partition mein CP mode isse faisle lene nahi deta, AP mode deta hai.' },
        { id: 'ub', label: 'Aman', sub: 'Singapore user', x: 650, y: 85, w: 110, kind: 'client', info: 'Ye kya hai: Singapore ke paas rehne wala ek user. Uski requests Singapore region pe jaati hain.' },
      ],
      edges: [{ a: 'ua', b: 'dm' }, { a: 'dm', b: 'ln' }, { a: 'ln', b: 'ds' }, { a: 'ds', b: 'ub' }],
      scenarios: [
        { name: 'Normal din', intro: 'Network theek hai. Dekho ek write aur ek door ka read kaise chalta hai.', steps: [
          { title: 'Riya A7 book karti hai', text: 'Request Mumbai pe aayi.', go: 'ua>dm', msg: 'POST /book  { seat: "A7", user: "riya" }' },
          { title: 'Majority mili, commit', text: 'Mumbai ki 2 replicas ne likh liya: 3 mein se 2 = majority. Write pakka. Riya ko confirmation.', go: 'res:dm>ua', after: { dm: { state: 'ok', sub: 'A7 = Riya' } }, msg: '200 OK  A7 confirmed' },
          { title: 'Singapore tak copy', text: 'Wahi update link ke through Singapore ki replica tak bhi jaata hai.', go: 'evt:dm>ln>ds', after: { ds: { state: 'ok', sub: 'A7 = Riya' } } },
          { title: 'Aman A7 dekhta hai', text: 'Aman ka read Singapore pe aaya. Linearizable read ke liye Singapore pehle Mumbai (majority) se pakka karta hai ki uske paas latest hai. Isme link ka ek round trip lagta hai: ye <strong>consistency ki keemat latency</strong> hai, bina kisi failure ke bhi. Yahi PACELC ka "else" hissa hai (neeche).', go: ['ub>ds', 'ds>ln>dm', 'res:dm>ln>ds', 'res:ds>ub'], msg: 'GET /seat/A7  →  booked (Riya)' },
        ]},
        { name: 'Partition: CP mode', intro: 'Link toota. System ne consistency chuni hai.', steps: [
          { title: 'Link toota', text: 'Mumbai aur Singapore dono zinda, lekin ek doosre ko messages nahi pahunch rahe.', set: { ln: { state: 'down', sub: 'PARTITION' } }, go: 'lost:dm>ln' },
          { title: 'Riya ki booking: chal jaati hai', text: 'Mumbai ke paas 3 mein se 2 replicas hain = majority. Wo safely faisla le sakta hai.', go: ['ua>dm', 'res:dm>ua'], after: { dm: { state: 'ok', sub: 'A7 = Riya' } }, msg: '200 OK  A7 confirmed (2 of 3 replicas)' },
          { title: 'Aman ki booking: error', text: 'Singapore akela hai (1 of 3). Use nahi pata ki Mumbai mein kya hua. Galat jawab dene se achha, wo <strong>mana kar deta hai</strong>. Data safe raha, lekin Singapore ke users ke liye ye feature abhi <strong>unavailable</strong> hai.', go: ['ub>ds', 'bad:ds>ub'], set: { ds: { state: 'warn', sub: 'minority: ruka' } }, msg: '503 Service Unavailable  "Thodi der baad try karein"' },
          { title: 'Aman ka read bhi error', text: 'Read bhi mana, kyunki Singapore ki copy purani ho sakti hai aur CP ka vaada hai "kabhi purana nahi". (Kuch systems minority side pe "shayad purana" read allow karte hain, lekin tab wo read linearizable nahi rehta.)', go: ['ub>ds', 'bad:ds>ub'], msg: 'GET /seat/A7  →  503' },
          { title: 'Network theek: catch up', text: 'Link wapas aaya. Singapore majority se missing updates le leta hai. Koi conflict nahi, kyunki partition mein sirf ek side ne likha tha.', set: { ln: { state: '', sub: 'Mumbai ↔ SG' } }, go: 'evt:dm>ln>ds', after: { ds: { state: 'ok', sub: 'A7 = Riya' } } },
        ]},
        { name: 'Partition: AP mode', intro: 'Wahi partition. Is baar system ne availability chuni hai.', steps: [
          { title: 'Link toota', text: 'Same situation.', set: { ln: { state: 'down', sub: 'PARTITION' } }, go: 'lost:dm>ln' },
          { title: 'Riya ki booking: confirmed', text: 'Mumbai apni copy pe likh deta hai.', go: ['ua>dm', 'res:dm>ua'], after: { dm: { state: 'ok', sub: 'A7 = Riya' } }, msg: '200 OK  A7 confirmed' },
          { title: 'Aman ki booking: bhi confirmed!', text: 'Singapore ki copy mein A7 abhi khaali dikhti hai, to wo bhi haan bol deta hai. Dono users khush. Abhi tak.', go: ['ub>ds', 'res:ds>ub'], after: { ds: { state: 'ok', sub: 'A7 = Aman' } }, msg: '200 OK  A7 confirmed' },
          { title: 'Network theek: conflict', text: 'Updates exchange hue: ek hi seat, do maalik. Agar system <strong>last-write-wins</strong> use kare (jiska timestamp bada wo jeeta), to Riya ki booking chupchaap gayab ho jaati hai, jabki use confirmation mil chuka tha.', set: { ln: { state: '', sub: 'Mumbai ↔ SG' } }, go: ['evt:dm>ln>ds', 'evt:ds>ln>dm'], parallel: true, after: { dm: { state: 'hot', sub: 'CONFLICT' }, ds: { state: 'hot', sub: 'CONFLICT' } } },
          { title: 'Ab compensation', text: 'Ek user ko sorry email, refund ya doosri seat. Ise <strong>compensation</strong> kehte hain: galti ke baad usko business ke tareeke se theek karna. Seat ke liye ye bura deal hai. Isliye seat lock CP hona chahiye.', focus: ['ua', 'ub'] },
        ]},
        { name: 'Likes: AP sahi hai', intro: 'Wahi partition, lekin is baar data hai concert post ke likes. Yahan AP kyun theek hai?', steps: [
          { title: 'Link toota', text: 'Same situation.', set: { ln: { state: 'down', sub: 'PARTITION' } }, go: 'lost:dm>ln' },
          { title: 'Dono taraf likes', text: 'Mumbai mein 2 likes, Singapore mein 3. Dono sides accept karti hain. Har side apne apne likes alag ginti hai.', go: ['ua>dm', 'ub>ds'], parallel: true, after: { dm: { sub: 'likes: M=2, S=0' }, ds: { sub: 'likes: M=0, S=3' } } },
          { title: 'Thoda purana count dikha', text: 'Riya ko 2 dikhte hain, Aman ko 3. Asli total 5 hai. Kisi ka nuksaan nahi hua, bas count thoda purana.', go: ['res:dm>ua', 'res:ds>ub'], parallel: true },
          { title: 'Network theek: merge, kuch nahi khoya', text: 'Har side ki ginti alag rakhi thi, to merge aasaan: Mumbai ke 2 + Singapore ke 3 = 5. Ye ek <strong>CRDT</strong> (agle lesson mein) ka chhota example hai. Error dene se kahin behtar.', set: { ln: { state: '', sub: 'Mumbai ↔ SG' } }, go: ['evt:dm>ln>ds', 'evt:ds>ln>dm'], parallel: true, after: { dm: { state: 'ok', sub: 'likes = 5' }, ds: { state: 'ok', sub: 'likes = 5' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'Partition simulator: khud todo, khud dekho' },
    { type: 'p', html: `Ab tum system chalao. Do features hain: <strong>seat A7 ka lock</strong> aur ek concert post ke <strong>likes</strong>. Har feature ke liye CP ya AP chuno, cable kaato, dono taraf writes aur reads bhejo, phir network theek karke dekho reconciliation (dono copies ko wapas ek karna) mein kya hota hai.` },
    { type: 'list', items: [
      `<strong>Try 1 (default):</strong> seat CP, likes AP. Cable kaato. Mumbai mein A7 book karo (chalega), Singapore mein A7 book karo (503 error). Dono taraf 2-3 likes. Singapore pe Read. Phir heal: A7 Riya ki, likes ka total sahi.`,
      `<strong>Try 2:</strong> Reset, seat ko AP karo. Cable kaato, dono taraf A7 book karo. Dono ko confirmation! Heal karo: last-write-wins ek booking kha jaata hai, "kho gayi" counter 1 ho jaata hai.`,
      `<strong>Try 3:</strong> Reset, likes ko CP karo. Partition mein Singapore ke likes pe bhi error. Socho: kya ek like ke liye error dikhana sahi deal hai?`,
    ]},
    { type: 'custom', render(el) {
      function capCore() {
        const who = { M: 'Riya', S: 'Aman' }, place = { M: 'Mumbai', S: 'Singapore' };
        const fresh = () => ({ link: true, mode: { seat: 'CP', likes: 'AP' }, t: 0,
          rep: { M: { seat: null, likes: { M: 0, S: 0 } }, S: { seat: null, likes: { M: 0, S: 0 } } },
          st: { ok: 0, err: 0, lost: 0 }, log: [] });
        let S = fresh();
        const other = s => (s === 'M' ? 'S' : 'M');
        const sum = l => l.M + l.S;
        const say = (cls, txt) => { S.log.unshift({ cls, txt }); if (S.log.length > 7) S.log.pop(); };
        const blocked = (side, f) => !S.link && S.mode[f] === 'CP' && side === 'S';
        const err = (side, what) => { S.st.err++; say('bad', `${place[side]}: ${what} → ERROR 503. Ye minority side hai (3 mein se 1 replica); majority se baat nahi ho pa rahi, isliye mana kar diya.`); };
        const act = {
          reset() { S = fresh(); },
          get() { return S; },
          setMode(f, m) { if (S.link) S.mode[f] = m; },
          cut() { if (!S.link) return; S.link = false; say('warn', 'Mumbai ↔ Singapore cable kat gaya. Dono taraf servers zinda hain, bas ek doosre ko messages nahi pahunch rahe.'); },
          book(side) {
            if (blocked(side, 'seat')) return err(side, `${who[side]} ki A7 booking`);
            const r = S.rep[side];
            if (r.seat) { say('', `${place[side]}: "A7 pehle se ${r.seat.who} ki hai" (ye sahi jawab hai, error nahi).`); return; }
            const v = { who: who[side], ts: ++S.t };
            if (S.link) { S.rep.M.seat = { ...v }; S.rep.S.seat = { ...v }; } else r.seat = v;
            S.st.ok++;
            say('ok', `${place[side]}: A7 ${who[side]} ke naam CONFIRMED (time ${v.ts}).${S.link ? '' : ' Doosri side ko abhi pata nahi.'}`);
          },
          like(side) {
            if (blocked(side, 'likes')) return err(side, 'like');
            S.t++;
            if (S.link) { S.rep.M.likes[side]++; S.rep.S.likes[side]++; } else S.rep[side].likes[side]++;
            S.st.ok++;
            say('ok', `${place[side]}: like +1 → yahan total ${sum(S.rep[side].likes)}.`);
          },
          read(side) {
            const r = S.rep[side], o = S.rep[other(side)];
            const parts = [];
            for (const f of ['seat', 'likes']) {
              if (blocked(side, f)) { S.st.err++; parts.push(f === 'seat' ? 'A7: ERROR 503' : 'likes: ERROR 503'); continue; }
              const val = f === 'seat' ? (r.seat ? r.seat.who : 'khaali') : sum(r.likes);
              const oval = f === 'seat' ? (o.seat ? o.seat.who : 'khaali') : sum(o.likes);
              parts.push((f === 'seat' ? 'A7: ' : 'likes: ') + val + (!S.link && S.mode[f] === 'AP' && val !== oval ? ' (doosri side pe ' + oval + '!)' : ''));
            }
            say(parts.some(p => p.includes('ERROR')) ? 'bad' : parts.some(p => p.includes('!')) ? 'warn' : '', `${place[side]} read → ${parts.join(', ')}`);
          },
          heal() {
            if (S.link) return;
            S.link = true;
            const M = S.rep.M, Sg = S.rep.S, out = [];
            if (S.mode.seat === 'CP') { Sg.seat = M.seat ? { ...M.seat } : null; out.push('A7: Singapore ne Mumbai (majority) ki copy le li, koi conflict nahi'); }
            else if (M.seat && Sg.seat && (M.seat.who !== Sg.seat.who || M.seat.ts !== Sg.seat.ts)) {
              const win = M.seat.ts > Sg.seat.ts ? M.seat : Sg.seat, lose = win === M.seat ? Sg.seat : M.seat;
              M.seat = { ...win }; Sg.seat = { ...win }; S.st.lost++;
              out.push(`A7 CONFLICT: dono ko confirmation mila tha! Last-write-wins: ${win.who} jeeta (time ${win.ts} > ${lose.ts}), ${lose.who} ki booking chupchaap gayab`);
            } else { const v = M.seat || Sg.seat; M.seat = v ? { ...v } : null; Sg.seat = v ? { ...v } : null; out.push('A7: sirf ek side ne badla tha, wahi copy dono jagah'); }
            if (S.mode.likes === 'CP') { Sg.likes = { ...M.likes }; out.push(`likes: Singapore ne Mumbai ki copy le li (${sum(M.likes)})`); }
            else { const m = { M: Math.max(M.likes.M, Sg.likes.M), S: Math.max(M.likes.S, Sg.likes.S) }; M.likes = { ...m }; Sg.likes = { ...m }; out.push(`likes merge: Mumbai ke ${m.M} + Singapore ke ${m.S} = ${sum(m)}, ek bhi like nahi khoya`); }
            say(S.st.lost ? 'warn' : 'ok', 'Network theek. Reconciliation: ' + out.join('; ') + '.');
          },
        };
        return act;
      }
      const sim = capCore();
      el.innerHTML = `<div class="cp-modes" style="display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:12px 0">
          <button type="button" class="btn small primary cp-link"></button>
          <button type="button" class="btn small ghost cp-reset">Reset</button>
          <span class="cp-linkst" style="font:600 13px var(--f-mono)"></span>
        </div>
        <div class="cp-sides" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px"></div>
        <div class="stats">
          <div class="stat"><span>Confirmations diye</span><strong class="cp-ok"></strong></div>
          <div class="stat"><span>Errors (unavailable)</span><strong class="cp-err"></strong></div>
          <div class="stat"><span>Confirmed writes jo kho gayi</span><strong class="cp-lost"></strong></div>
        </div>
        <div class="cp-log" style="margin-top:10px;font:12.5px/1.5 var(--f-mono);background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r-sm);padding:8px 10px;min-height:60px"></div>
        <div class="calc-note">3 replicas: 2 Mumbai mein (majority), 1 Singapore mein. Link theek ho to har write turant dono taraf. Mode sirf tab badal sakte ho jab link theek ho. Har feature ka mode alag hai: yahi "per-feature choice" hai.</div>`;
      const q = s => el.querySelector(s);
      const place = { M: 'Mumbai', S: 'Singapore' }, user = { M: 'Riya', S: 'Aman' }, reps = { M: '2 of 3 replicas', S: '1 of 3 replicas' };
      const mkBtn = (txt, cls, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small ' + cls; b.textContent = txt; b.onclick = () => { fn(); draw(); }; return b; };
      const draw = () => {
        const S = sim.get();
        const modes = q('.cp-modes'); modes.innerHTML = '';
        [['seat', 'Seat A7 lock'], ['likes', 'Post ke likes']].forEach(([f, name]) => {
          const wrap = document.createElement('span'); wrap.style.cssText = 'display:inline-flex;flex-wrap:wrap;gap:6px;align-items:center';
          const l = document.createElement('span'); l.textContent = name + ':'; l.style.cssText = 'font-size:14px;color:var(--ink-2)'; wrap.appendChild(l);
          ['CP', 'AP'].forEach(m => {
            const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (S.mode[f] === m ? ' on' : ''); b.textContent = m;
            b.disabled = !S.link; if (!S.link) b.title = 'Pehle network theek karo';
            b.onclick = () => { sim.setMode(f, m); draw(); }; wrap.appendChild(b);
          });
          modes.appendChild(wrap);
        });
        q('.cp-link').textContent = S.link ? 'Cable kaato (partition)' : 'Network theek karo (heal)';
        q('.cp-linkst').textContent = S.link ? 'Link: OK' : 'Link: PARTITION';
        q('.cp-linkst').style.color = S.link ? 'var(--green)' : 'var(--red)';
        const sides = q('.cp-sides'); sides.innerHTML = '';
        ['M', 'S'].forEach(sd => {
          const r = S.rep[sd], card = document.createElement('div');
          const minority = !S.link && sd === 'S' && (S.mode.seat === 'CP' || S.mode.likes === 'CP');
          card.style.cssText = `border:1.5px solid ${minority ? 'var(--amber)' : 'var(--line)'};border-radius:var(--r);padding:10px;background:var(--surface)`;
          card.innerHTML = `<div style="font-weight:700">${place[sd]} <span style="font-weight:400;color:var(--ink-3);font-size:13px">(${reps[sd]})</span></div>
            <div style="font:13px/1.6 var(--f-mono);margin:6px 0">A7: <strong>${r.seat ? r.seat.who : 'khaali'}</strong><br>likes: <strong>${r.likes.M + r.likes.S}</strong> <span style="color:var(--ink-3)">(M ${r.likes.M} + S ${r.likes.S})</span></div>`;
          const bx = document.createElement('div'); bx.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px';
          bx.append(mkBtn('A7 book (' + user[sd] + ')', 'primary', () => sim.book(sd)), mkBtn('Like +1', 'ghost', () => sim.like(sd)), mkBtn('Read', 'ghost', () => sim.read(sd)));
          card.appendChild(bx); sides.appendChild(card);
        });
        q('.cp-ok').textContent = S.st.ok; q('.cp-err').textContent = S.st.err; q('.cp-lost').textContent = S.st.lost;
        q('.cp-lost').style.color = S.st.lost ? 'var(--red)' : '';
        const col = { bad: 'var(--red)', warn: 'var(--amber)', ok: 'var(--green)', '': 'var(--ink-2)' };
        q('.cp-log').innerHTML = S.log.length ? S.log.map((l, i) => `<div style="color:${col[l.cls]};${i ? 'opacity:.75' : ''}">• ${l.txt}</div>`).join('') : '<div style="color:var(--ink-3)">Shuru karo: "Cable kaato" dabao, phir dono taraf A7 book karo aur Like dabao.</div>';
      };
      q('.cp-link').onclick = () => { const S = sim.get(); if (S.link) sim.cut(); else sim.heal(); draw(); };
      q('.cp-reset').onclick = () => { sim.reset(); draw(); };
      draw();
    }},
    { type: 'p', html: `Jo dekha uska saar: <strong>CP</strong> mein minority side (Singapore) errors deti hai lekin heal pe kuch theek nahi karna padta. <strong>AP</strong> mein sab jawab dete hain, lekin heal pe divergent (alag alag ho chuki) copies ko merge karna padta hai. Kuch data aasaani se merge hota hai (likes: har side ka count jod do), kuch bilkul nahi hota (ek seat, do maalik). Isliye <strong>faisla data dekh ke hota hai</strong>, poore system ke liye ek baar nahi.` },
    { type: 'callout', tone: 'tip', title: 'Partition ke teen phase (Brewer, 2012)', html: `Brewer ki salah: partition ko ek "mode" ki tarah handle karo. (1) <strong>Detect</strong> karo ki partition shuru hua (aam taur pe timeout se). (2) <strong>Partition mode</strong> mein jao: kuch operations band ya limited karo (jaise booking band, browsing chalu). (3) <strong>Recovery</strong>: network theek hone pe copies ko merge karo aur jo galtiyan hui unki <strong>compensation</strong> karo (refund, sorry email, doosri seat). Airlines bhi overbooking ke saath yahi karti hain: galti ho to baad mein compensation.` },

    { type: 'h2', text: '"3 mein se 2 chuno" kyun galat tasveer hai' },
    { type: 'p', html: `CAP aksar ek triangle ke saath padhaya jaata hai: "C, A, P mein se koi 2 chuno: CA, CP ya AP." Sunne mein aasaan, lekin is se teen galat ideas dimaag mein baith jaate hain:` },
    { type: 'steps', items: [
      { t: 'P optional nahi hai', d: `Jaise hi data do machines pe hai aur beech mein network hai, network kabhi na kabhi tootega: cable, switch, galat firewall rule, ya ek machine ka lamba GC pause (program kuch second ke liye memory saaf karne ruk jaata hai) jisme wo "gayab" lagti hai. "Hum P nahi chunte" ka matlab hai "hum maan lete hain network kabhi nahi tootega", aur jab tootega tab system kya karega ye kisi ne socha hi nahi. To asli choice sirf do hai: <strong>partition ke dauraan C ya A</strong>.` },
      { t: 'Choice sirf partition ke time hai', d: `Jab network theek hai (zyaadatar time), system ko C aur A dono mil sakte hain. CAP kehta hai ki partition ke dauraan dono nahi milenge. Normal din ke liye CAP kuch nahi kehta. Normal din ka trade-off PACELC batata hai (neeche).` },
      { t: 'Ye ek switch nahi, ek dial hai', d: `Ek hi app mein alag features alag choices kar sakte hain (seat CP, likes AP), ek hi database mein alag queries alag levels maang sakti hain (Cassandra mein har query ka apna consistency level), aur bahut se systems na poore C hain na poore A (sirf kuch nodes jawab dete hain, ya data thoda purana but bounded).` },
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common confusion: "hamara system CA hai"', html: `"CA" ka matlab: consistent aur available, lekin partition hua to? Ek <strong>single machine</strong> wala database (ek PostgreSQL server bina replicas) ek tarah se CA hai, kyunki uske andar koi network partition hai hi nahi. Lekin jaise hi do machines aayin, partition possible hai, aur tab ya to wo ruk jaayega (C chuna) ya purana data dega (A chuna). Distributed system ke liye "CA" ka koi practical matlab nahi.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion: "AP matlab data kabhi consistent nahi"', html: `AP system ko bhi saari copies aakhir mein same karni hoti hain. Isko <strong>eventual consistency</strong> kehte hain: abhi copies alag ho sakti hain, lekin naye writes ruk jaayein to thodi der mein sab ek jaisi ho jaati hain. AP sirf ye kehta hai ki partition ke dauraan wo error ke bajaye shayad-purana jawab dega. Aur CP ka matlab "kabhi down nahi" bhi nahi: CP system partition mein minority side pe jaan bujh ke unavailable hota hai.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion: node crash bhi CAP hai?', html: `Nahi. CAP sirf <strong>network partition</strong> ki baat karta hai, jahan nodes zinda hain par baat nahi kar sakte. Ek node ka crash ho jaana alag problem hai (failover, replicas wale lessons). Haan, doosri machines ke nazariye se "crash hua" aur "network kata" aksar ek jaisa dikhta hai: dono mein jawab nahi aata. Isi confusion se split brain hota hai, jo coordination lesson mein dekha.` },

    { type: 'h2', text: 'CP aur AP: asli examples' },
    { type: 'p', html: `Real systems pe label lagane mein savdhaani chahiye: zyaadatar databases configurable hain, aur strict CAP definition mein bahut kam systems poore "CP" ya poore "AP" hain. Phir bhi default behaviour ke hisaab se ye tasveer kaam ki hai:` },
    { type: 'table', head: ['Kya', 'Partition mein choice', 'Kyun'], rows: [
      ['Bank ledger, balance', 'CP', 'Galat balance pe paisa nikal gaya to asli nuksaan. Error behtar.'],
      ['Seat booking ka lock', 'CP', 'Ek seat do logon ko bikna (double booking) error se bura.'],
      ['etcd, ZooKeeper', 'CP', 'Writes ke liye majority chahiye. Minority side writes mana karti hai (coordination lesson). etcd reads bhi default mein linearizable hain; ZooKeeper reads default mein local server se aate hain aur thode purane ho sakte hain (latest chahiye to pehle sync).'],
      ['Google Spanner', 'CP', 'Partition mein consistency chunta hai. Google ka private network partitions itne kam karta hai ki users ke liye ye lagbhag "CA jaisa" lagta hai (Brewer, 2017).'],
      ['Likes, views, feed', 'AP', 'Count 3 se galat ho to koi nuksaan nahi. Error dikhana bura UX.'],
      ['DNS', 'AP', 'Resolvers purana record TTL tak cache se dete rehte hain. Thoda purana IP chalega, DNS ka band hona nahi.'],
      ['Shopping cart (Amazon Dynamo)', 'AP', '"Add to cart" kabhi fail nahi hona chahiye. Conflicting carts baad mein merge (agla lesson).'],
      ['Cassandra, Riak', 'Default AP, tunable', 'Har query consistency level chunti hai (ONE, QUORUM, ALL). Zyada nodes maango to zyada consistent, kam available.'],
      ['DynamoDB', 'Tunable reads', 'Default eventually consistent reads; ConsistentRead=true se strongly consistent read, jo eventually consistent read se do guna mehnga hai. Andar har partition leader-based hai (replication lesson).'],
    ]},
    { type: 'callout', tone: 'warn', title: 'Labels ka ek sach', html: `Martin Kleppmann ne 2015 mein ek mashhoor blog post likhi: databases ko "CP" ya "AP" kehna band karo. Wajah: strict definitions se dekho to ZooKeeper ke default reads linearizable nahi, aur ek normal leader-follower database CAP-available nahi (leader se kate client ko writes nahi milte). Isliye interview mein label ke saath ye bhi batao ki <strong>partition mein exactly kya hoga</strong>: kaun si side writes legi, reads kitne purane ho sakte hain.` },

    { type: 'h2', text: 'PACELC: jab sab theek ho, tab bhi ek faisla' },
    { type: 'p', html: `Partitions kabhi kabhi hote hain. Lekin "Normal din" scenario mein dekha: Singapore ka linearizable read bhi Mumbai tak ka chakkar lagata hai. Ye keemat <strong>har request pe, har din</strong> lagti hai. Daniel Abadi ne 2012 mein isko CAP ke saath jod ke ek naam diya:` },
    { type: 'callout', tone: 'term', title: 'Naya word: PACELC ("pass-elk")', html: `<strong>Ye kya hai:</strong> CAP ka bada roop. Letter by letter:<br>• <strong>P</strong>A/<strong>C</strong>: <em>if <strong>P</strong>artition</em>, to <strong>A</strong>vailability ya <strong>C</strong>onsistency chuno (yahi CAP hai).<br>• <strong>E</strong>L/<strong>C</strong>: <em><strong>E</strong>lse</em>, yaani normal din, to <strong>L</strong>atency (speed) ya <strong>C</strong>onsistency chuno.<br><strong>Kyun chahiye:</strong> partition saal mein kuch ghante hota hai, lekin latency ka sawaal <em>har request pe</em> aata hai. Jab data ki copies hain, har write pe ya to doosri copies ka wait karo (consistent, slow) ya mat karo (fast, lekin kuch reads purane).<br><strong>Iske bina:</strong> sirf CAP dekh ke design karoge to normal din ki slowness (door ke region ka wait) kabhi hisaab mein nahi aayegi.<br><strong>Example:</strong> Mumbai ↔ Singapore round trip 60 ms. Har write pe Singapore ka wait = har write +60 ms (EC). Wait nahi = write 2 ms, lekin Singapore ka read ~30+ ms tak purana ho sakta hai (EL).` },
    { type: 'p', html: `Khud feel karo. Mumbai mein leader hai, Singapore mein ek replica. Write aur read ka tareeka badlo aur dekho latency aur freshness kaise badalti hai:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Mumbai ↔ door wala region, round trip: <strong class="pl-rv"></strong></label><input class="pl-rtt" type="range" min="10" max="250" step="5" value="60"></div>
          <div><label>Ek page load pe kitni DB reads (ek ke baad ek): <strong class="pl-cv"></strong></label><input class="pl-calls" type="range" min="1" max="10" step="1" value="5"></div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px"><span style="font-size:14px;color:var(--ink-2)">Write:</span><span class="pl-w" style="display:flex;flex-wrap:wrap;gap:6px"></span></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px"><span style="font-size:14px;color:var(--ink-2)">Singapore user ka read:</span><span class="pl-r" style="display:flex;flex-wrap:wrap;gap:6px"></span></div>
        <div class="stats">
          <div class="stat"><span>Write latency (Mumbai user)</span><strong class="pl-wl"></strong></div>
          <div class="stat"><span>Ek read (Singapore user)</span><strong class="pl-rl"></strong></div>
          <div class="stat"><span>Poora page (Singapore)</span><strong class="pl-pg"></strong></div>
          <div class="stat"><span>Purana data dikh sakta?</span><strong class="pl-st"></strong></div>
        </div>
        <div class="calc-note pl-note"></div>`;
      const q = s => el.querySelector(s);
      let w = 'async', r = 'local';
      const chips = (box, opts, cur, set) => { box.innerHTML = ''; opts.forEach(([v, t]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (v === cur ? ' on' : ''); b.textContent = t; b.onclick = () => { set(v); upd(); }; box.appendChild(b); }); };
      const upd = () => {
        const rtt = Number(q('.pl-rtt').value), calls = Number(q('.pl-calls').value);
        chips(q('.pl-w'), [['async', 'Local ack (async copy)'], ['sync', 'Remote ack ka wait (sync)']], w, v => { w = v; });
        chips(q('.pl-r'), [['local', 'Local replica se'], ['leader', 'Leader (Mumbai) se']], r, v => { r = v; });
        const wl = w === 'async' ? 2 : 2 + rtt, rl = r === 'local' ? 1 : 1 + rtt, stale = w === 'async' && r === 'local';
        q('.pl-rv').textContent = rtt + ' ms'; q('.pl-cv').textContent = calls;
        q('.pl-wl').textContent = wl + ' ms'; q('.pl-rl').textContent = rl + ' ms'; q('.pl-pg').textContent = calls * rl + ' ms';
        q('.pl-st').textContent = stale ? 'Haan' : 'Nahi'; q('.pl-st').style.color = stale ? 'var(--amber)' : 'var(--green)';
        q('.pl-note').textContent = stale
          ? `EL choice: sab kuch fast (write ${wl} ms, page ${calls * rl} ms), lekin copy Singapore tak pahunchne mein kam se kam ~${Math.round(rtt / 2)} ms (aur load pe zyada) lagta hai. Us window mein Singapore purana data dekh sakta hai.`
          : r === 'leader'
            ? `EC choice: har read leader se, to hamesha latest. Keemat: har read pe ${rtt} ms ka round trip, aur ${calls} reads wala page ${calls * rl} ms. Door ke users ke liye site slow.`
            : `Writes Singapore ke ack ka wait karti hain (${wl} ms), isliye ack ke baad Singapore ki copy mein naya data pakka hai aur reads local (${rl} ms). Keemat writes pe aayi. Aur partition mein ye write ruk jaayegi: ye PC wala hissa hai.`;
      };
      ['.pl-rtt', '.pl-calls'].forEach(s => q(s).addEventListener('input', upd));
      upd();
    }},
    { type: 'p', html: `Ye simple model hai (local disk write ~2 ms, local read ~1 ms maana), lekin baat asli hai: ek hi region ke andar round trip ~1 ms ke aas paas hota hai, Mumbai se Singapore jaise paas ke regions ke beech kuch dasiyon ms, aur India se US tak 200 ms se upar. Consistency ki keemat <strong>doori</strong> se badhti hai.` },
    { type: 'table', head: ['System (default)', 'PACELC', 'Matlab'], rows: [
      ['Dynamo, Cassandra, Riak', 'PA / EL', 'Partition mein available; normal din pe bhi fast, consistency kam. Query ka level badha ke EC ki taraf ja sakte ho.'],
      ['BigTable, HBase, VoltDB, Megastore', 'PC / EC', 'Hamesha consistency: partition mein bhi, normal din pe bhi. Keemat latency aur availability.'],
      ['MongoDB (2012 ka analysis)', 'PA / EC', 'Normal din consistent (primary se reads), lekin primary kat jaaye to purane primary ki unreplicated writes rollback mein ja sakti thin.'],
      ['Yahoo PNUTS', 'PC / EL', 'Normal din pe latency ke liye consistency chhodta hai, lekin partition mein aur consistency nahi khota, availability khota hai.'],
      ['Google Spanner', 'PC / EC', 'Strong consistency hamesha. Latency ki keemat (commit pe majority ka wait) chukata hai.'],
    ], caption: 'Pehli chaar classifications Abadi ke 2012 ke paper se hain; tab se in systems ke defaults aur features badle hain, to inhe us waqt ki tasveer samjho.' },

    { type: 'h2', text: 'Choice per feature, poore system ke liye nahi' },
    { type: 'p', html: `Sabse kaam ki seekh: "hamara system CP hai" ya "AP hai" bolna aadha jawab hai. Ek hi app ke andar har data ka nuksaan alag hai. xyz Tickets ko feature by feature dekho:` },
    { type: 'p', html: `Table dekhne se pehle khud try karo. Har feature ke liye socho: partition mein <strong>galat data</strong> zyada bura hai ya <strong>error</strong>? Phir CP ya AP chuno:` },
    { type: 'custom', render(el) {
      const F = [
        ['Seat A7 kiski hai', 'CP', 'Do logon ko ek seat = refund, gussa, bura naam. Error behtar.'],
        ['Wallet balance se payment', 'CP', 'Purane balance pe paisa kat gaya to asli nuksaan. Error behtar.'],
        ['Naya username "riya"', 'CP', 'Do log ek naam le lein to baad mein kise hatayein? Ek jagah, ek sach.'],
        ['Concert post ke likes', 'AP', 'Count thoda purana chalega. Like pe error = bura UX.'],
        ['Movie review likhna', 'AP', 'Review 30 second baad doosre region mein dikhe to chalega.'],
        ['Event ka poster aur description', 'AP', 'Purani description kuch der chalegi; page band hona nahi chalega.'],
      ];
      const pick = {};
      el.innerHTML = `<div class="cpq-rows" style="display:grid;gap:8px"></div><div class="stats"><div class="stat"><span>Sahi jawab</span><strong class="cpq-score"></strong></div></div><div class="calc-note">Har row pe CP ya AP dabao. Jawab aur wajah turant dikhegi.</div>`;
      const rows = el.querySelector('.cpq-rows');
      const draw = () => {
        rows.innerHTML = '';
        F.forEach(([name, ans, why], i) => {
          const r = document.createElement('div');
          r.style.cssText = 'border:1px solid var(--line);border-radius:var(--r-sm);padding:8px 10px;background:var(--surface)';
          const top = document.createElement('div'); top.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between';
          const t = document.createElement('strong'); t.textContent = name; t.style.fontSize = '14px'; top.appendChild(t);
          const bx = document.createElement('span'); bx.style.cssText = 'display:flex;gap:6px';
          ['CP', 'AP'].forEach(m => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (pick[i] === m ? ' on' : ''); b.textContent = m; b.onclick = () => { pick[i] = m; draw(); }; bx.appendChild(b); });
          top.appendChild(bx); r.appendChild(top);
          if (pick[i]) { const fb = document.createElement('div'); const ok = pick[i] === ans; fb.style.cssText = 'margin-top:6px;font-size:13.5px;color:' + (ok ? 'var(--green)' : 'var(--amber)'); fb.textContent = (ok ? 'Sahi: ' : 'Socho dobara, jawab ' + ans + ': ') + why; r.appendChild(fb); }
          rows.appendChild(r);
        });
        const done = Object.keys(pick).length, right = F.filter((f, i) => pick[i] === f[1]).length;
        el.querySelector('.cpq-score').textContent = right + ' / ' + F.length + (done < F.length ? ' (' + (F.length - done) + ' baaki)' : '');
      };
      draw();
    }},
    { type: 'table', head: ['xyz Tickets feature', 'Partition mein', 'Kyun', 'Kaise banate hain'], rows: [
      ['Seat lock (A7 kiski?)', 'CP', 'Double booking = paise wapas, gussa user, bura naam', 'Ek strongly consistent store (leader wala SQL ya etcd/Spanner jaisa). Conditional write (sharat wala write): "A7 do sirf agar abhi khaali hai", lock pe TTL (time to live: itne time baad lock apne aap khul jaaye, jaise 10 minute) taaki payment na hua to seat khul jaaye'],
      ['Payment / wallet balance', 'CP', 'Galat balance = asli paisa', 'Strongly consistent SQL, transactions'],
      ['Unique username', 'CP', 'Do log "riya" le lein to baad mein kise hatayein?', 'Unique constraint ek jagah'],
      ['Reviews aur ratings', 'AP', 'Naya review 30 second baad dikhe to chalega', 'Multi-region replicas, async copy, eventual consistency'],
      ['Likes, view counts', 'AP', 'Count thoda purana chalega; error nahi', 'Har region apna count, merge pe jodo (CRDT counter)'],
      ['Event listing, posters', 'AP', 'Purani description kuch der chalegi', 'Cache, CDN, read replicas'],
    ]},
    { type: 'p', html: `Roadmap ka example bilkul yahi hai: <strong>BookMyShow seat locking ke liye CP</strong> aur <strong>movie reviews ke liye AP</strong>. Ek app, do choices, kyunki do alag data.` },
    { type: 'callout', tone: 'why', title: 'Partition mein CP feature ka UX', html: `CP choose karne ka matlab ye nahi ki user ko ugly error do. Minority region ke users ko achhe se batao: "Booking abhi thodi der ke liye band hai, aapki seat safe hai, 2 minute mein try karein." Baaki site (browsing, reviews, posters) AP hai, wo chalti rahti hai. Isko <strong>graceful degradation</strong> kehte hain (resilience lesson mein dekha).` },
    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Decide: C ya A?', html: `Ek sawaal poochho: <strong>"Kya bura hai: galat data dikhana, ya error dikhana?"</strong><br><br>Galat balance ya double-booked seat, error se bura hai: <strong>consistency chuno</strong> (CP). Like count 3 se galat hona error se behtar hai: <strong>availability chuno</strong> (AP). Ek hi app dono choices alag jagah kar sakti hai: BookMyShow seat locking ke liye CP aur movie reviews ke liye AP.<br><br>Phir PACELC ka sawaal: normal din pe bhi, kya ye feature har request pe door ke region ka wait afford kar sakta hai? Nahi, to EL (fast, thoda purana); haan aur zaroori hai, to EC.` },
    { type: 'table', head: ['Strong consistency chahiye', 'Eventual chalega'], rows: [
      ['Paisa, wallet, ledger', 'Likes, views, followers count'],
      ['Inventory, seats, bookings', 'Feeds, timelines'],
      ['Unique usernames, coupon ek baar', 'Search results, recommendations'],
      ['Distributed locks, leader election', 'Analytics dashboards'],
    ], caption: 'Roadmap ki quick decisions table se' },

    { type: 'diagram', title: 'CAP aur PACELC: poori picture', height: 530,
      groups: [
        { label: 'Mumbai (majority)', x: 14, y: 96, w: 330, h: 236 },
        { label: 'Singapore (minority)', x: 376, y: 96, w: 330, h: 236 },
      ],
      nodes: [
        { id: 'riya', label: 'Riya', sub: 'Mumbai users', x: 177, y: 48, kind: 'client', info: 'Ye kya hai: Mumbai ke paas ke users. Unki requests paas wale Mumbai region pe jaati hain, taaki jawab tez aaye.' },
        { id: 'aman', label: 'Aman', sub: 'Singapore users', x: 543, y: 48, kind: 'client', info: 'Ye kya hai: Singapore ke paas ke users. Unki requests Singapore region pe jaati hain.' },
        { id: 'appM', label: 'App servers', sub: 'Mumbai', x: 177, y: 160, w: 160, kind: 'server', info: 'Ye kya hai: xyz Tickets ka code, Mumbai mein. Har feature ke liye alag rule follow karta hai: seat ke liye CP store, likes ke liye AP store.' },
        { id: 'appS', label: 'App servers', sub: 'Singapore', x: 543, y: 160, w: 160, kind: 'server', info: 'Ye kya hai: wahi code, Singapore mein. Partition ke time ye seat booking pe saaf message dikhata hai ("thodi der baad try karein"), baaki site chalu rakhta hai (graceful degradation).' },
        { id: 'seatM', label: 'Seat store', sub: 'CP: 2 of 3', x: 95, y: 280, kind: 'data', info: 'Ye kya hai: seat kiski hai, ye likhne wala strongly consistent store. 3 replicas mein se 2 Mumbai mein = majority. Partition mein bhi Mumbai side booking le sakti hai.' },
        { id: 'likesM', label: 'Likes store', sub: 'AP: local count', x: 255, y: 280, kind: 'data', info: 'Ye kya hai: likes aur reviews ka store. Har region apna count rakhta hai aur turant jawab deta hai. Network theek hone pe counts jud jaate hain (CRDT counter).' },
        { id: 'likesS', label: 'Likes store', sub: 'AP: local count', x: 465, y: 280, kind: 'data', info: 'Ye kya hai: Singapore ka likes store. Partition mein bhi likes leta hai; Aman ko thoda purana total dikh sakta hai, error kabhi nahi.' },
        { id: 'seatS', label: 'Seat replica', sub: 'CP: 1 of 3', x: 625, y: 280, kind: 'data', info: 'Ye kya hai: seat store ki teesri replica. Akeli ye minority hai, isliye partition ke dauraan booking aur linearizable reads mana karti hai.' },
        { id: 'link', label: 'Undersea link', sub: 'Mumbai ↔ SG', x: 360, y: 470, w: 150, kind: 'net', info: 'Ye kya hai: regions ke beech ka network. Normal din pe yahan se updates jaate hain (round trip kai dasiyon ms: PACELC ki "latency" keemat). Ye toota = partition: CAP ka faisla.' },
      ],
      edges: [
        { a: 'riya', b: 'appM', n: 1 },
        { a: 'appM', b: 'seatM', n: 2, label: 'book A7' },
        { a: 'appM', b: 'likesM', label: 'like +1' },
        { a: 'aman', b: 'appS' },
        { a: 'appS', b: 'likesS', label: 'like +1' },
        { a: 'appS', b: 'seatS', label: 'book A7' },
        { a: 'seatM', b: 'link', n: 3, kind: 'evt', label: 'seat sync', via: [[95, 470]] },
        { a: 'link', b: 'seatS', kind: 'evt', via: [[625, 470]] },
        { a: 'likesM', b: 'link', kind: 'evt', both: true },
        { a: 'likesS', b: 'link', kind: 'evt', both: true, label: 'merge counts' },
      ],
      paths: [
        { name: 'Normal booking', text: 'Riya ki booking Mumbai ki majority (2 of 3) pe pakki hui, phir cable se Singapore ki copy tak gayi.', go: ['riya>appM>seatM', 'seatM>link>seatS'] },
        { name: 'Partition: seat (CP)', text: 'Cable kata. Singapore minority hai, isliye A7 booking pe "thodi der baad try karein". Double booking kabhi nahi.', go: ['aman>appS>seatS', 'seatS>link'] },
        { name: 'Partition: like (AP)', text: 'Singapore like turant le leta hai. Cable theek hone pe dono regions ke counts jud jaate hain, kuch nahi khota.', go: ['aman>appS>likesS', 'likesS>link>likesM'] },
        { name: 'Normal din (PACELC)', text: 'Koi failure nahi. Seat ka taaza read Mumbai tak round trip karta hai (EC: slow, sahi). Likes local copy se (EL: tez, thoda purana).', go: ['aman>appS>seatS', 'seatS>link>seatM', 'appS>likesS'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li><strong>Partition</strong> = machines zinda, lekin beech ka network toota. Jab copies alag machines pe hain, ye hoga hi.</li>
      <li><strong>C</strong> (linearizable) = jaise ek hi copy ho. <strong>A</strong> = har zinda server error ke bina jawab de. <strong>P</strong> = network tootne ko maan ke chalna.</li>
      <li>CAP: partition ke dauraan C ya A, dono nahi. "3 mein se 2 chuno" galat tasveer hai, kyunki P optional nahi.</li>
      <li>CP = minority side mana karti hai (seat, paisa, username). AP = sab jawab dete hain, baad mein merge (likes, feed, DNS, cart).</li>
      <li>PACELC: partition na ho tab bhi har request pe <strong>latency vs consistency</strong> ka faisla. Doori jitni, keemat utni.</li>
      <li>Faisla <strong>per feature</strong>: BookMyShow seat lock CP, movie reviews AP.</li>
      <li>Decide sawaal: "kya bura hai, galat data ya error?"</li>
      <li>Labels (CP/AP) ke bajaye batao: partition mein exactly kya hoga.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['CP: data kabhi galat ya conflicting nahi; heal ke baad kuch merge nahi karna', 'AP: har region chalta rahta hai, users ko error nahi, latency kam', 'Per-feature choice: jahan zaroori wahan safety, baaki jagah speed', 'PACELC soch: normal din ki latency ka bhi hisaab rehta hai'],
      costs: ['CP: partition mein minority side ke users ke liye feature band; normal din pe bhi coordination ki latency', 'AP: purana data, conflicts, merge logic aur compensation ka kaam', 'Do tarah ke stores aur rules: zyada complexity', 'Labels (CP/AP) asli behaviour chhupa dete hain; har feature ka partition behaviour likhna padta hai'],
    },

    { type: 'think', questions: [
      { q: 'xyz.com ka chat feature: messages aur "online/offline" status. Partition mein dono ke liye CP ya AP?', a: 'Online status: AP. Thoda purana "online" dikhna chalega. Messages: zyaadatar AP bhi chalta hai (message local region mein accept karo, baad mein deliver aur order theek karo), kyunki "message nahi gaya" error bahut bura UX hai. Lekin har message ko ek unique ID do taaki heal pe duplicates hata sako. Agar order bahut zaroori hai (jaise payment chat), tab us hisse ko consistent banao.' },
      { q: 'Teen regions hain: Mumbai, Singapore, Frankfurt, har jagah ek replica (N = 3), majority writes. Frankfurt ka link kata. Kaun writes le sakta hai? Aur agar Mumbai aur Singapore ke beech bhi link kat jaaye?', a: 'Pehle case mein Mumbai + Singapore (2 of 3) majority hain, wo writes lete rahenge; Frankfurt (1 of 3) mana karega. Doosre case mein teeno ek doosre se kate hain, kisi ke paas majority nahi: CP system poori tarah writes band kar dega. Availability ki ye keemat hai.' },
      { q: 'Ek interviewer kehta hai "MongoDB CP hai, Cassandra AP hai". Tum isme kya nuance jodoge?', a: 'Dono configurable hain. Cassandra mein QUORUM reads + writes (aur lightweight transactions) se kaafi consistent behaviour mil sakta hai, ONE se bahut available. MongoDB mein read concern / write concern aur secondaries se reads ke hisaab se behaviour badalta hai. Behtar jawab: "Partition mein ye exactly kya karega": kaun si side writes legi, reads kitne purane ho sakte hain, heal pe kya merge hoga.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'CAP theorem ka sahi matlab kya hai?', options: ['Har system C, A, P mein se koi 2 hamesha chunta hai', 'Network partition ke dauraan system linearizable consistency aur availability dono nahi de sakta', 'Distributed systems kabhi consistent nahi ho sakte'], answer: 1, explain: 'Choice sirf partition ke time hai. Jab network theek hai tab C aur A dono mil sakte hain. Aur P koi option nahi, network tootega hi.' },
      { q: 'Partition mein CP system ki minority side kya karti hai?', options: ['Purana data deti hai', 'Writes (aur linearizable reads) mana karti hai, error deti hai', 'Khud ko leader bana leti hai'], answer: 1, explain: 'Minority ko pata nahi majority side pe kya hua, isliye galat jawab dene ke bajaye mana karti hai. Data safe, availability gayi.' },
      { q: 'PACELC ka "ELC" hissa kis baare mein hai?', options: ['Partition ke baad recovery', 'Normal din pe latency vs consistency ka trade-off', 'Encryption, logging, caching'], answer: 1, explain: 'Else (no partition): har write pe doosri copies ka wait (consistent, slow) ya nahi (fast, kabhi kabhi purana).' },
      { q: 'xyz Tickets mein kaunsa pair sahi hai?', options: ['Seat lock: AP, Reviews: CP', 'Seat lock: CP, Reviews: AP', 'Dono AP, kyunki availability sabse zaroori hai'], answer: 1, explain: 'Double booking error se bura hai (CP). Purana review error se behtar hai (AP). Choice per feature.' },
      { q: 'ACID ka C aur CAP ka C:', options: ['Ek hi cheez hain', 'Alag hain: ACID ka C = database ke rules na tootein; CAP ka C = sab replicas ek latest value dikhayein', 'CAP ka C sirf SQL databases mein hota hai'], answer: 1, explain: 'Ek word, do matlab. Interview mein clear karo kaunsi consistency ki baat ho rahi hai.' },
    ]},
    { type: 'sources', note: 'Definitions, system classifications aur product behaviour inhi se check kiye gaye. Abadi ka paper 2012 ka hai; tab se kai databases badle hain.', items: [
      { title: 'Brewer\'s conjecture and the feasibility of consistent, available, partition-tolerant web services', publisher: 'Gilbert & Lynch, ACM SIGACT News', year: 2002, url: 'https://groups.csail.mit.edu/tds/papers/Gilbert/Brewer2.pdf', used: 'CAP ka formal proof; C = linearizability (atomic consistency), A = har non-failing node ka response, partition = lost messages.' },
      { title: 'CAP Twelve Years Later: How the "Rules" Have Changed', publisher: 'Eric Brewer, IEEE Computer (InfoQ reprint)', year: 2012, url: 'https://www.infoq.com/articles/cap-twelve-years-later-how-the-rules-have-changed/', used: '"2 of 3" kyun misleading hai, choice sirf partition mein, partition mode ke teen steps (detect, partition mode, recovery) aur compensation.' },
      { title: 'Consistency Tradeoffs in Modern Distributed Database System Design', publisher: 'Daniel Abadi, IEEE Computer', year: 2012, url: 'https://www.cs.umd.edu/~abadi/papers/abadi-pacelc.pdf', used: 'PACELC definition; Dynamo/Cassandra/Riak PA/EL, VoltDB/Megastore/BigTable/HBase PC/EC, MongoDB PA/EC, PNUTS PC/EL.' },
      { title: 'Please stop calling databases CP or AP', publisher: 'Martin Kleppmann (blog)', year: 2015, url: 'https://martin.kleppmann.com/2015/05/11/please-stop-calling-databases-cp-or-ap.html', used: 'Strict CAP definitions; ZooKeeper ke default reads linearizable nahi (sync); labels kyun gumraah karte hain.' },
      { title: 'Inside Cloud Spanner and the CAP Theorem', publisher: 'Google Cloud blog (Eric Brewer)', official: true, year: 2017, url: 'https://cloud.google.com/blog/products/databases/inside-cloud-spanner-and-the-cap-theorem', used: 'Spanner technically CP hai, lekin itna available ki users ise effectively CA maan sakte hain.' },
      { title: 'etcd API guarantees', publisher: 'etcd documentation', official: true, url: 'https://etcd.io/docs/v3.5/learning/api_guarantees/', used: 'Reads default mein linearizable (Raft se); serializable reads tez lekin purane ho sakte hain.' },
      { title: 'DynamoDB read consistency', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html', used: 'Default eventually consistent reads, ConsistentRead option, strongly consistent reads ka do guna cost.' },
    ]},
  ],
});
