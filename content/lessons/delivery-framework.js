Lesson.register({
  id: 'delivery-framework',
  title: 'Kisi bhi system ko design karne ka method',
  minutes: 32,
  summary: `Ab tak humne blocks seekhe: Load Balancer, Cache, Queue, Sharding. Lekin interview mein ya design doc mein sawaal aata hai "WhatsApp design karo" aur dimaag blank. Ye lesson ek fixed 6-step method deta hai (requirements → estimate → entities + API → high-level design → deep dives → wrap up) jo har problem pe chalta hai, time budget ke saath.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Socho tumhe Lego ke saare pieces pata hain, lekin koi bolta hai "ek ghar banao" aur tum ulti-seedhi cheezein jodne lagte ho. Ghar tab banta hai jab pehle socho: kitne kamre, kitna bada, phir neev, phir deewaar, phir chhat. System design mein bhi aisa hi hai. Ye lesson ek <strong>6 kadam ka tareeka</strong> sikhata hai jo har sawaal pe chalta hai: pehle poochho kya banana hai, phir kitna bada, phir data aur APIs, phir simple design, phir uski kamzoriyan theek karo, aur end mein batao kya chhoda. Har kadam ka ek chhota time hota hai, taaki sabse zaroori hisse ke liye time bache.` },
    { type: 'h2', text: 'Problem: blocks pata hain, design shuru kahan se karein?' },
    { type: 'p', html: `Socho xyz.com ka interviewer bolta hai: <em>"xyz.com pe ek Pastebin jaisa feature design karo: user text/code paste kare, ek link mile, koi bhi link khol ke padh sake."</em> Tumhe Cache aata hai, Sharding aata hai, Kafka aata hai. Phir bhi aksar ye hota hai:` },
    { type: 'list', items: [
      `Pehle hi minute mein board pe 12 boxes bana diye: Kafka, microservices, Cassandra... aur pata hi nahi kaunsa box kis problem ke liye hai.`,
      `Ya 15 minute numbers mein ulajh gaye ("1 billion users × 2.3 KB..."), aur design ke liye time hi nahi bacha.`,
      `Ya design bana diya, lekin interviewer ne poochha "DB mar gaya to?" aur koi jawab nahi.`,
    ]},
    { type: 'p', html: `Problem knowledge ki nahi, <strong>order</strong> ki hai. Agar har baar same sequence follow karo, to dimaag ko pata hota hai ki abhi kya sochna hai aur kya baad mein. Ye sequence interview, practice problems aur office ke real design docs, teeno mein same kaam karta hai.` },
    { type: 'callout', tone: 'term', title: 'Delivery framework', html: `<strong>Ye kya hai:</strong> ek fixed order (checklist jaisa) jisme system design "deliver" kiya jaata hai, yaani sunaya aur banaya jaata hai.<br><strong>Kyun chahiye:</strong> dimaag ko har waqt pata rehta hai ki abhi kya sochna hai aur kya baad mein. Koi zaroori cheez chhoot-ti nahi.<br><strong>Iske bina:</strong> ya to pehle minute mein 12 boxes, ya 15 minute numbers mein, ya failure ka koi jawab nahi.<br><strong>Dhyaan do:</strong> framework tumhe <em>answer</em> nahi deta. Ye batata hai ki answer tak <em>kis raaste</em> se pahunchna hai.` },

    { type: 'h2', text: 'Poora method ek nazar mein' },
    { type: 'p', html: `Pehle chhota sa naksha. Har step ka matlab neeche apne section mein, aasaan shabdon aur ek chhote example ke saath samjhaya hai. Abhi bas order yaad karo.` },
    { type: 'steps', items: [
      { t: '1. Requirements (≈5 min)', d: 'Poochho: system kya karega (features), kya nahi karega, aur kitna fast, kitna bada, kitna reliable hona chahiye. Har "kitna" ke saath ek number.' },
      { t: '2. Estimate (≈3-5 min)', d: 'Mote mote numbers: har second kitni requests, padhna zyada hai ya likhna, kitna data jama hoga. Har number ke baad ek faisla ("matlab cache chahiye").' },
      { t: '3. Core entities aur API (≈5 min)', d: 'Main cheezein jinka data rakhna hai (User, Paste, Ride...) aur app server se kaun kaun si requests bhejega.' },
      { t: '4. High-level design (≈10-15 min)', d: 'Sabse simple boxes ka design jo har feature chala de: client → Load Balancer → services → database. Phir ek request ko shuru se end tak bolke chalao.' },
      { t: '5. Deep dives (≈15-20 min)', d: 'Step 1 ke "kitna fast/bada/reliable" wale numbers pe wapas jao. Dekho design kahan toot-ta hai (bheed wali jagah, akela box jo gir sakta hai, purana data) aur use theek karo. Seniority yahin dikhti hai.' },
      { t: '6. Wrap up (≈3-5 min)', d: 'Batao kya chhoda aur kyun (trade-offs), kaun se numbers pe nazar rakhoge (monitoring), aur zyada time hota to kya karte.' },
    ]},
    { type: 'callout', tone: 'why', title: 'Ye order hi kyun?', html: `Har step agle step ka input hai. Requirements ke bina pata nahi kya estimate karna hai. Numbers ke bina pata nahi cache chahiye ya nahi. Entities aur API ke bina boxes ka koi matlab nahi. Simple design ke bina deep dive kis cheez ka? Aur deep dive ke bina trade-offs kahan se aayenge? Ulta order chalao to har step andaaze pe chalta hai.` },
    { type: 'table', caption: 'Time budget. Ranges roadmap ke hain; 45 aur 60 min ke columns ek practical split hain (shuru ki 2-5 min intro aur end ke sawaalon ke liye chhodi hain).', head: ['Stage', 'Range', '45 min interview', '60 min interview'], rows: [
      ['Requirements', '≈5 min', '5', '5'],
      ['Estimate', '≈3-5 min', '3', '5'],
      ['Entities + API', '≈5 min', '5', '5'],
      ['High-level design', '≈10-15 min', '12', '15'],
      ['Deep dives', '≈15-20 min', '15', '20'],
      ['Wrap up', '≈3-5 min', '3', '5'],
      ['<strong>Total</strong>', '', '<strong>43</strong>', '<strong>55</strong>'],
    ]},
    { type: 'callout', tone: 'tip', title: 'Sabse bada time kahan jaata hai?', html: `Dekho: deep dives ka hissa sabse bada hai (~35%). Matlab interviewer ka asli interest "boxes bana lo" mein nahi, "boxes ke toot-ne pe kya karoge" mein hai. Agar HLD tak pahunchte pahunchte 35 minute ho gaye, to tumne sabse keemti hissa kho diya. Isliye pehle ke 4 steps <em>jaan-boojh ke chhote</em> rakhne hain.` },

    { type: 'h2', text: 'Step 1: Requirements (≈5 min)' },
    { type: 'p', html: `Sawaal hamesha jaan-boojh ke adhoora hota hai. "Pastebin design karo" mein ye nahi bataya ki login chahiye ya nahi, paste kitne bade, kitne users, expire hote hain ya nahi. Interviewer dekhna chahta hai ki tum <strong>poochhte</strong> ho ya andaaza laga ke bhaag padte ho. Do tarah ki requirements nikaalni hain:` },
    { type: 'callout', tone: 'term', title: 'Functional requirement (FR)', html: `<strong>Ye kya hai:</strong> system <em>kya karta hai</em>, yaani ek feature. Hamesha user ki taraf se likho: "Users can create a paste", "Users can open a paste by its link".<br><strong>Kyun chahiye:</strong> yahi list tay karti hai ki kaun se APIs aur boxes banenge.<br><strong>Iske bina:</strong> tum aisi cheez bana doge jo kisi ne maangi hi nahi, ya zaroori feature bhool jaoge.<br><strong>Example:</strong> xyz Paste ke 3 FR: paste banao, link se padho, paste ek din baad expire ho sake. 3-5 core wale chuno, 15 nahi.` },
    { type: 'callout', tone: 'term', title: 'Non-functional requirement (NFR)', html: `<strong>Ye kya hai:</strong> system <em>kaisa</em> hona chahiye. Feature nahi, quality. Chaar aam qualities: kitna fast (latency), kitna bada (scale), kitna kam band ho (availability), aur data kitni jaldi sabko sahi dikhe (consistency).<br><strong>Kyun chahiye:</strong> yahi numbers baad mein deep dives ka agenda bante hain. Cache, replica, sharding sab inhi ki wajah se aate hain.<br><strong>Iske bina:</strong> "fast hona chahiye" se koi faisla nahi nikalta. Number chahiye: "fast" nahi, "99% requests 200 ms se kam mein".<br><strong>Example:</strong> "10M naye paste roz, 99.9% time chalu, koi paste kabhi na khoye."` },
    { type: 'callout', tone: 'term', title: 'p99 latency, availability aur consistency', html: `<strong>p99 latency:</strong> 100 requests ko time ke hisaab se line mein lagao. 99th request ka time p99 hai. "p99 &lt; 200 ms" matlab 100 mein se 99 requests 200 ms se pehle khatam. Average se behtar, kyunki average slow users ko chhupa deta hai.<br><strong>Availability:</strong> kitne % time system chalu hai. 99.9% = saal mein lagbhag 8.8 ghante band chal sakta hai; 99.99% = sirf ~53 minute.<br><strong>Consistency:</strong> likhne ke baad sabko naya data kitni jaldi dikhe. <em>Strong</em> = turant, sabko. <em>Eventual</em> = thodi der (jaise 1-2 second) mein. Strong mehenga hai, isliye pehle poochho: kya thodi der chalegi?` },
    { type: 'callout', tone: 'term', title: 'Out of scope', html: `<strong>Ye kya hai:</strong> wo cheezein jo tum is design mein jaan-boojh ke <em>nahi</em> banaoge, aur ye zor se bol dete ho: "Login, syntax highlighting aur paste edit karna out of scope hai."<br><strong>Kyun chahiye:</strong> interviewer ko pata chal jaata hai ki tumne socha hai, bhoola nahi. Aur tumhara time bachta hai.<br><strong>Iske bina:</strong> design phailta jaata hai, aur 45 minute mein kuch bhi poora nahi hota.` },
    { type: 'h3', text: 'Clarifying questions kaise poochhein' },
    { type: 'p', html: `Achhe sawaal wo hain jinke jawab se <strong>design badalta</strong> hai. "Kaunsa programming language?" se design nahi badalta. "Paste kitne bade ho sakte hain?" se badalta hai (1 KB ho to DB mein, 10 MB ho to object storage mein). Ek simple checklist:` },
    { type: 'table', head: ['Kya poochho', 'Pastebin ke liye example', 'Jawab se kya decide hota hai'], rows: [
      ['Users kaun, kitne?', '"Kitne naye paste roz? Kitne reads?"', 'Ek DB kaafi hai ya sharding; cache chahiye ya nahi'],
      ['Data kitna bada?', '"Max paste size? Average?"', 'Content DB mein ya object storage mein'],
      ['Read vs write', '"Ek paste kitni baar khulta hai?"', 'Read-heavy → cache/CDN ka investment'],
      ['Kitna fresh chahiye?', '"Paste banate hi doosre ko dikhna chahiye?"', 'Strong vs eventual consistency, replica se read kar sakte hain ya nahi'],
      ['Kitna zaroori hai?', '"Paste kabhi khona nahi chahiye? Thoda downtime chalega?"', 'Replication, durability, availability target'],
      ['Lifecycle', '"Paste expire hote hain?"', 'Cleanup job, TTL, storage ka hisaab'],
    ]},
    { type: 'callout', tone: 'tip', title: 'Jab interviewer bole "tum hi decide karo"', html: `Bahut baar jawab milta hai "tum batao". Tab ek reasonable assumption bolo aur aage badho: <em>"Main maan raha hoon 10M naye paste per day aur reads 100 guna, theek hai?"</em> Assumption likh ke rakho, taaki baad mein usi pe wapas aa sako. Chup rehna ya 10 sawaal ek saath poochhna dono galat hain.` },
    { type: 'compare',
      left: { title: 'Weak requirements', html: `"Pastebin hai na, users paste karenge, padhenge. System scalable aur fast hona chahiye, highly available bhi."<br><br>Na out of scope, na numbers. "Scalable" aur "fast" se koi design decision nahi nikalta.` },
      right: { title: 'Strong requirements', html: `<strong>Functional:</strong> (1) user text paste kare, short link mile; (2) link se koi bhi padh sake; (3) paste optional expiry ke saath.<br><strong>Out of scope:</strong> login, edit, search, syntax highlighting.<br><strong>NFR:</strong> 10M paste/day, reads 100:1, read p99 &lt; 200 ms, 99.9% available, paste kabhi khoye nahi, naya paste 1-2 sec mein dikh jaaye to chalega (eventual OK).` },
    },
    { type: 'callout', tone: 'tip', title: 'Step card 1: Requirements', html: `<strong>Input:</strong> interviewer ka ek line ka sawaal.<br><strong>Kya karte ho:</strong> 3-4 sawaal poochho, FR likho, out of scope bolo, NFR numbers ke saath likho.<br><strong>Output (board pe):</strong> teen chhoti lists: FR, Out, NFR.<br><strong>Mini example (xyz.com "Like" button):</strong> FR: user video like/unlike kare, video pe total likes dikhe. Out: kisne like kiya ki list. NFR: 2 crore DAU (roz ke users), har user din mein ~10 likes, like dabate hi apne ko turant dikhe, doosron ko count 5 sec late dikhe to chalega (eventual), koi like kabhi khoye nahi.<br><strong>Done jab:</strong> har NFR mein ek number hai, aur interviewer ne "haan theek hai" bola.` },
    { type: 'p', html: `Ab khud practice karo. <strong>Mode 1:</strong> har line padho aur batao ki wo FR hai, achha NFR (number ke saath) hai, ya "khokhla" NFR jisme koi number nahi. <strong>Mode 2:</strong> ek product diya hai; uske liye sabse zaroori NFR chuno.` },
    { type: 'custom', render(el) {
      const SORT = [
        ['Users ek video upload kar sakein', 'fr', 'Ye ek feature hai: system kya karta hai.'],
        ['Video page 99% baar 300 ms se kam mein khule', 'nfr', 'Quality + number (p99 jaisa). Isse faisla nikalta hai: cache/CDN chahiye.'],
        ['System fast hona chahiye', 'vague', 'Kitna fast? Bina number ke koi design faisla nahi nikalta. Pucho ya assume karo: "p99 < 200 ms".'],
        ['Users kisi video pe comment kar sakein', 'fr', 'Feature hai. API mein iska ek endpoint banega.'],
        ['Roz 5 crore video views, peak pe 3 guna', 'nfr', 'Scale ka number. Isse QPS nikalta hai, aur pata chalta hai kitne servers.'],
        ['System highly scalable ho', 'vague', 'Har system yahi bolta hai. Kitne users? Kitni requests? Number do.'],
        ['Saal mein 99.95% time chalu rahe', 'nfr', 'Availability ka number: saal mein ~4.4 ghante tak band. Isse replicas aur failover ka faisla hota hai.'],
        ['Users channel subscribe kar sakein', 'fr', 'Feature hai: system kya karta hai.'],
        ['Achha user experience ho', 'vague', 'Sunne mein achha, lekin isse koi box nahi chunta. Latency ya availability ke number mein badlo.'],
        ['Naya comment doosron ko 5 second ke andar dikh jaaye', 'nfr', 'Consistency ka number: eventual chalega, 5 sec tak. Isse replica se padhna allowed hai.'],
        ['Database reliable ho', 'vague', 'Reliable matlab kya? "Koi comment kabhi na khoye" ya "99.99% available" jaisa saaf likho.'],
        ['User apni watch history dekh sake', 'fr', 'Feature hai. Entity: WatchEvent, API: GET /history.'],
      ];
      const PICK = [
        { p: 'xyz Pay: user A se user B ko ₹500 bhejna', o: ['Like count 5 sec late chalega (eventual)', 'Balance kabhi galat ya do baar kata na dikhe (strong consistency + durability)', 'Video 4K mein chale', 'Feed 500 ms mein khule'], a: 1, e: 'Paison mein "thoda late sahi" nahi chalta. Pehla NFR: strong consistency aur durability. Speed doosre number pe.' },
        { p: 'xyz Chat: online dost ko message bhejna', o: ['Message ~500 ms se kam mein pahunche, aur kabhi na khoye', 'Roz ek baar backup', 'Search results 2 sec mein', 'Profile photo HD ho'], a: 0, e: 'Chat ka asli wada: turant aur bina khoye. Isi se WebSockets aur message store ka design nikalta hai.' },
        { p: 'xyz Live: cricket final ka live score, 5 crore log ek saath', o: ['Har user ko score bilkul ek hi millisecond pe', 'Score 1-2 sec late chalega, lekin 5 crore concurrent users sambhale', 'Score permanent archive mein', 'Admin panel sundar ho'], a: 1, e: 'Yahan scale hi sabse bada khatra hai. 1-2 sec late chalega (eventual), isse CDN aur caching ka raasta khulta hai.' },
        { p: 'xyz Paste: ek paste Twitter pe viral', o: ['Write p99 < 10 ms', 'Read p99 < 200 ms, reads writes se 100 guna', 'Har paste ka exact view count turant', 'Paste editor mein colours'], a: 1, e: 'Read-heavy system mein read latency sabse zaroori NFR hai. Isi se cache aur CDN aate hain.' },
      ];
      const LAB = { fr: 'FR', nfr: 'Achha NFR', vague: 'Khokhla NFR' };
      el.innerHTML = `<div class="chips dfq-m" style="padding:0">
          <button type="button" class="chip on" data-m="0">Mode 1: sort karo</button>
          <button type="button" class="chip" data-m="1">Mode 2: sahi NFR chuno</button></div>
        <div class="dfq-body" style="margin-top:12px"></div>
        <div class="stats"><div class="stat"><span>Sahi</span><strong class="dfq-s">0 / 0</strong></div></div>
        <div class="calc-note dfq-n"></div>`;
      const $ = c => el.querySelector(c);
      let mode = 0, i = 0, ok = 0, done = 0, locked = false;
      const btn = (t, k) => `<button type="button" class="btn small ghost" data-k="${k}" style="margin:4px 6px 0 0;text-align:left">${t}</button>`;
      const draw = () => {
        const list = mode ? PICK : SORT;
        $('.dfq-s').textContent = ok + ' / ' + done;
        if (i >= list.length) { $('.dfq-body').innerHTML = `<div style="color:var(--ink)">Round khatam: ${ok} / ${list.length} sahi.</div>` + btn('Phir se', 'again'); $('.dfq-n').textContent = ''; }
        else if (!mode) { const s = SORT[i]; $('.dfq-body').innerHTML = `<div style="font:600 16px var(--f-body);color:var(--ink)">${i + 1}/${SORT.length}. "${s[0]}"</div><div>${btn('FR', 'fr')}${btn('Achha NFR', 'nfr')}${btn('Khokhla NFR', 'vague')}</div>`; }
        else { const s = PICK[i]; $('.dfq-body').innerHTML = `<div style="font:600 16px var(--f-body);color:var(--ink)">${i + 1}/${PICK.length}. ${s.p}</div><div style="display:flex;flex-direction:column;align-items:flex-start">${s.o.map((o, k) => btn(o, k)).join('')}</div>`; }
        locked = false;
        $('.dfq-body').querySelectorAll('[data-k]').forEach(b => b.onclick = () => answer(b.dataset.k));
      };
      const answer = k => {
        if (k === 'again') { i = 0; ok = 0; done = 0; $('.dfq-n').textContent = ''; draw(); return; }
        if (k === 'next') { i++; draw(); return; }
        if (locked) return; locked = true; done++;
        let right, why;
        if (!mode) { right = k === SORT[i][1]; why = `Sahi jawab: ${LAB[SORT[i][1]]}. ${SORT[i][2]}`; }
        else { right = +k === PICK[i].a; why = `Sahi jawab: "${PICK[i].o[PICK[i].a]}". ${PICK[i].e}`; }
        if (right) ok++;
        $('.dfq-n').textContent = (right ? 'Sahi! ' : 'Nahi. ') + why;
        $('.dfq-s').textContent = ok + ' / ' + done;
        $('.dfq-body').insertAdjacentHTML('beforeend', btn('Agla →', 'next'));
        $('.dfq-body').querySelector('[data-k="next"]').onclick = () => answer('next');
      };
      $('.dfq-m').querySelectorAll('.chip').forEach(c => c.onclick = () => { mode = +c.dataset.m; i = 0; ok = 0; done = 0; $('.dfq-n').textContent = ''; $('.dfq-m').querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === c)); draw(); });
      draw();
    }},
    { type: 'h2', text: 'Step 2: Estimate, sirf wo numbers jo design badlein (≈3-5 min)' },
    { type: 'callout', tone: 'term', title: 'Back-of-envelope estimate (napkin maths)', html: `<strong>Ye kya hai:</strong> mote mote andaaze, jaise lifafe ke peeche pencil se kiye hon. Exact answer nahi, sirf <em>order of magnitude</em>: 100 per second hai ya 1 lakh per second? 1 GB hai ya 100 TB?<br><strong>Kyun chahiye:</strong> 10x-100x ka farq hi design badalta hai. 100/s ke liye ek server, 1 lakh/s ke liye cache, replicas, shayad sharding.<br><strong>Iske bina:</strong> ya to chhote system pe bekaar ka bada design, ya bade system pe aisa design jo pehle hi din gir jaaye.` },
    { type: 'callout', tone: 'term', title: 'QPS aur read:write ratio', html: `<strong>Ye kya hai:</strong> QPS (queries per second) = har second kitni requests aati hain. Read:write ratio = har ek "likhne" (naya paste) pe kitne "padhne" (paste kholna).<br><strong>Kyun chahiye:</strong> QPS batata hai kitni machines chahiye. Ratio batata hai ki mehnat kahan lagani hai: reads zyada hon to cache, writes zyada hon to fast likhne wala database.<br><strong>Iske bina:</strong> pata hi nahi chalega ki cache lagana hai ya nahi.<br><strong>Dhyaan do:</strong> "average" QPS din bhar ka hisaab hai. Asli traffic shaam ko ya kisi viral moment pe kai guna hota hai, isliye <strong>peak</strong> = average × 2-3 (ya zyada).` },
    { type: 'callout', tone: 'term', title: 'Storage, concurrent connections aur DAU', html: `<strong>Storage:</strong> kitna data jama hoga, jaise 5 saal mein. Ye batata hai ki ek database kaafi hai, ya bade blobs ko <a href="#/object-storage">object storage</a> (S3 jaisa sasta, bada file store) mein rakhna padega.<br><strong>Concurrent connections:</strong> ek hi waqt pe kitne users ka connection khula rehta hai. Normal website mein request aayi, jawab gaya, connection band. Lekin chat ya live score mein connection minutes tak khula rehta hai, aur har khula connection ek server ki memory khaata hai.<br><strong>DAU (daily active users):</strong> din mein kitne alag users app kholte hain. Aksar QPS isi se nikalta hai: DAU × har user ki requests ÷ 10<sup>5</sup> seconds.` },
    { type: 'p', html: `Sirf chaar numbers zyaadatar kaafi hote hain, aur har ek ke baad ek <strong>conclusion</strong> bolna zaroori hai. Number bina conclusion ke bekaar hai. Trick: ek din ≈ 86,400 seconds ≈ <strong>10<sup>5</sup> seconds</strong> maan lo.` },
    { type: 'table', head: ['Number', 'xyz Paste ka hisaab', 'Conclusion (yahi asli point hai)'], rows: [
      ['Write QPS', '10M / 10<sup>5</sup> ≈ <strong>100/s</strong>, peak ×3 ≈ 300/s', 'Ek achha DB primary aaram se sambhal lega. Writes ke liye sharding abhi nahi chahiye.'],
      ['Read QPS + read:write', '100 × 100 ≈ <strong>10,000/s</strong>, peak ≈ 30,000/s', 'Read-heavy (100:1). Cache aur CDN sabse bada lever hai, DB ko bachana hai.'],
      ['Storage', '10M × 10 KB avg = 100 GB/day → ~36 TB/year → <strong>~180 TB in 5 years</strong>', 'Content ek DB mein nahi rakhna. Text blobs object storage (S3 jaisa) mein, chhota metadata (paste ki jaankari: id, size, time; ~200 bytes/paste ≈ 3.6 TB in 5 yrs) DB mein.'],
      ['Concurrent connections', 'Har request chhoti HTTP call, koi lamba connection nahi', 'Is problem mein ye number design nahi badalta, isliye skip. (Chat jaise system mein yahi sabse important number hota hai: lakhon WebSockets.)'],
    ]},
    { type: 'compare',
      left: { title: 'Weak estimate', html: `"DAU (daily users) 500M, har user 3.7 paste, average 9.4 KB, to 17.4 TB per day, 6.35 PB per year, replication factor 3 se 19.05 PB, bandwidth 201 MB/s..."<br><br>10 minute gaye, koi conclusion nahi. Interviewer soch raha hai: "to? iska design pe kya asar?"` },
      right: { title: 'Strong estimate', html: `"~100 writes/s, ~10k reads/s. <strong>Matlab read-heavy, cache lagega.</strong> 5 saal mein ~180 TB content. <strong>Matlab content object storage mein, DB mein sirf metadata.</strong> Writes chhote hain, <strong>to ek primary DB kaafi.</strong>"<br><br>2-3 minute, teen design decisions.` },
    },
    { type: 'callout', tone: 'tip', html: `Agar koi number kisi design decision ko nahi badal raha, to use skip karna bilkul theek hai. Kuch interviewers estimates ko poori tarah skip bhi karwa dete hain, aur bolte hain "jab zaroorat pade tab calculate karna". Tab deep dive ke beech mein chhota sa hisaab karo, wahi number ke saath decision lo.` },

    { type: 'callout', tone: 'tip', title: 'Step card 2: Estimate', html: `<strong>Input:</strong> Step 1 ke NFR numbers (users, roz ke actions, data size).<br><strong>Kya karte ho:</strong> 3-4 numbers nikaalo, har ek ke baad "matlab...".<br><strong>Output (board pe):</strong> ek chhoti list: number → faisla.<br><strong>Mini example (xyz.com "Like" button):</strong> 2 crore DAU × 10 likes = 20 crore likes/din ÷ 10<sup>5</sup> ≈ <strong>2,000 likes/s</strong>, peak ×3 ≈ 6,000/s. <em>Matlab:</em> har like pe ek hi video ki row update karna (count++) viral video pe garam ho jaayega, isliye counter ko baad mein (deep dive) baantna padega. Like count padhna har video page pe hota hai: maan lo 50,000 reads/s. <em>Matlab:</em> count cache mein.<br><strong>Done jab:</strong> har number ke saath ek design faisla likha hai, aur 5 minute se kam laga.` },

    { type: 'h2', text: 'Step 3: Core entities aur API (≈5 min)' },
    { type: 'callout', tone: 'term', title: 'Entity aur API endpoint', html: `<strong>Ye kya hai:</strong> <em>Entity</em> = system ke main "nouns", wo cheezein jinka data store hota hai. Uber ke liye User, Rider, Driver, Ride, Location. Pastebin ke liye User aur Paste. <em>API endpoint</em> = ek darwaza jisse app server se kuch maangti hai, jaise <code>POST /pastes</code> (naya paste banao) ya <code>GET /pastes/{id}</code> (paste lao).<br><strong>Kyun chahiye:</strong> boxes banane se pehle pata hona chahiye ki kaunsa data rakhna hai aur kaun si requests aayengi. Boxes inhi ko serve karte hain.<br><strong>Iske bina:</strong> HLD ke boxes ka koi matlab nahi; "ye service kya karegi?" ka jawab nahi hota.<br><strong>Dhyaan do:</strong> abhi poora DB schema nahi, sirf naam aur 3-4 important fields.` },
    { type: 'code', text: `
Entities
  Paste { id (short code), content_key (object storage mein kahan), size,
          created_at, expires_at, owner_id? }
  User  { id, ... }          // login out of scope, isliye sirf placeholder

API
  POST /pastes
    body: { "content": "...", "expires_in": "1d" }
    → 201 { "id": "aZ3k9Qx", "url": "https://xyz.com/p/aZ3k9Qx" }

  GET /pastes/aZ3k9Qx
    → 200 { "content": "...", "created_at": "...", "expires_at": "..." }
    → 404 agar nahi mila ya expire ho gaya` },
    { type: 'list', items: [
      `<strong>Har functional requirement ke liye kam se kam ek endpoint</strong>. Requirement 1 → POST, requirement 2 → GET. Requirement 3 (expiry) ek field se hi ho gaya. Agar koi requirement kisi endpoint pe map nahi hoti, kuch chhoot gaya hai.`,
      `<strong>REST by default</strong> (har cheez ka ek URL, aur GET/POST/PUT/DELETE jaise verbs), plural nouns (<code>/pastes</code>). Real-time cheezon (chat, live location) ke liye "events" bhi likho, jo ek hamesha khule WebSocket connection pe aate-jaate hain: <code>ws: message.send</code>, <code>ws: message.new</code>.`,
      `<strong>User id kabhi body mein mat lo</strong>; wo login ke baad mile auth token (request ke header mein) se aata hai. Body mein lene ka matlab koi bhi kisi aur ke naam se request bhej de.`,
      `List wale endpoints mein <strong>pagination</strong> ka zikr karo: poori list ek saath nahi, 20-20 ke pages, aur agla page ek "cursor" (bookmark) se. Create wale mein <strong>idempotency key</strong>: client har request ke saath ek unique key bhejta hai, taaki network retry pe same paste do baar na bane. Ek line kaafi hai, detail <a href="#/pagination-idempotency">is lesson</a> mein.`,
    ]},
    { type: 'callout', tone: 'tip', title: 'Step card 3: Entities aur API', html: `<strong>Input:</strong> FR list (Step 1).<br><strong>Kya karte ho:</strong> nouns likho, phir har FR ke liye ek endpoint ya event.<br><strong>Output (board pe):</strong> 2-4 entities aur 2-5 endpoints.<br><strong>Mini example (xyz.com "Like" button):</strong> Entities: <code>Like { user_id, video_id, created_at }</code>, <code>Video { id, like_count }</code>. API: <code>PUT /videos/{id}/like</code> (like), <code>DELETE /videos/{id}/like</code> (unlike), aur <code>GET /videos/{id}</code> mein <code>like_count</code>. PUT isliye, kyunki do baar dabane pe bhi ek hi like rehna chahiye. user_id body mein nahi, login token se.<br><strong>Done jab:</strong> har FR kisi endpoint pe map ho gaya.` },
    { type: 'h2', text: 'Step 4: High-level design (≈10-15 min)' },
    { type: 'p', html: `Ab boxes. Lekin rule ek hi: <strong>sabse simple design jo har functional requirement poori kare</strong>. Abhi scale, failure, viral traffic ki chinta nahi; wo Step 5 ka kaam hai. Shape lagbhag hamesha yahi hota hai: <code>client → LB / API gateway → services → databases</code>.` },
    { type: 'callout', tone: 'term', title: 'High-level design (HLD) aur stateless service', html: `<strong>Ye kya hai:</strong> HLD = poore system ka "door se" naksha: kaun se bade boxes hain (Load Balancer, services, database, storage) aur request kis raaste chalti hai. Andar ka code ya table ka har column nahi. <em>Stateless service</em> = aisa server jo kisi user ka data apni memory mein yaad nahi rakhta; sab kuch database ya cache mein. Isliye koi bhi request kisi bhi copy pe ja sakti hai.<br><strong>Kyun chahiye:</strong> HLD se interviewer ko dikhta hai ki har feature kaise chalega. Stateless rakhne se Load Balancer ke peeche jitni chaaho copies laga sakte ho.<br><strong>Iske bina:</strong> deep dive kis cheez ka karoge? Pehle ek chalta hua design chahiye, tabhi uski kamzori dikhti hai.` },
    { type: 'list', ordered: true, items: [
      `Har API endpoint ko ek-ek karke lo, aur poochho: ye request kis box se guzregi, data kahan likha/padha jaayega?`,
      `Har naya box tabhi lagao jab koi requirement ya estimate use maange. Object storage isliye kyunki estimate ne 180 TB bola. Cache abhi nahi, kyunki simple design bina cache ke bhi <em>sahi</em> kaam karta hai; cache "fast" ke liye hai, jo NFR hai.`,
      `<strong>Ek request ko shuru se end tak bolke chalao</strong>: "Client POST bhejta hai, LB kisi bhi Paste service instance ko deta hai, service ek unique ID banati hai, content object storage mein, metadata DB mein, phir 201 wapas." Isse interviewer ko dikhta hai ki boxes sirf sajaawat nahi.`,
      `Jahan koi mushkil cheez dikhe (ID kaise unique banegi? expire kaise hoga?), use ek line mein note karo: "isko deep dive mein dekhenge". Abhi wahan ruko mat.`,
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Simple design" ka matlab "kamzor design" nahi. Simple design wo base hai jis pe har improvement ka <em>reason</em> dikhta hai. Agar pehle hi Kafka, 5 microservices aur Cassandra laga diye, to koi poochhe "Kafka kyun?" to jawab nahi hoga, kyunki koi problem abhi tak dikhi hi nahi jo Kafka maange.` },

    { type: 'callout', tone: 'tip', title: 'Step card 4: High-level design', html: `<strong>Input:</strong> entities, API, aur estimate ke faisle.<br><strong>Kya karte ho:</strong> har endpoint ke liye boxes jodo, phir ek request zor se bolke chalao.<br><strong>Output (board pe):</strong> 4-7 boxes ka diagram aur "deep dive mein dekhenge" ki chhoti list.<br><strong>Mini example (xyz.com "Like" button):</strong> App → Load Balancer → Like service → Likes DB (table <code>likes(user_id, video_id)</code>, dono milke unique) aur Videos DB mein <code>like_count</code>. Bolke chalao: "PUT aaya, Like service ne likes table mein row daali; agar row pehle se thi to kuch nahi; nayi thi to like_count +1; 200 wapas." Note: "viral video pe count++ garam hoga, deep dive mein."<br><strong>Done jab:</strong> har FR is diagram se chal jaata hai, aur tumne kam se kam ek request end to end boli.` },

    { type: 'h3', text: 'Chala ke dekho: framework se design kaise ugta hai' },
    { type: 'p', html: `Neeche ka diagram khaali shuru hota hai (sirf Client). "Framework step by step" scenario mein har stage ke saath boxes judte hain, bilkul waise jaise interview mein board pe judte. Baaki do scenarios wo failures hain jo deep dive mein milte hain. Har box pe click karke uska role bhi padho.` },
    { type: 'flow', title: 'xyz Paste: skeleton step by step', height: 360,
      nodes: [
        { id: 'c', label: 'Client', sub: 'browser / app', x: 80, y: 180, w: 120, kind: 'client', info: 'Ye kya hai: user ka browser ya app. Paste banane wala ya link khol ke padhne wala user. Requirements isi ki taraf se likhi jaati hain: "users can create a paste", "users can read a paste".' },
        { id: 'lb', label: 'LB / Gateway', sub: 'routing, limits', x: 245, y: 180, w: 130, kind: 'net', hidden: true, info: 'Ye kya hai: Load Balancer / API gateway, system ka ek public darwaza. Requests ko healthy Paste service instances mein baant-ta hai, TLS khatam karta hai, aur rate limit jaise common kaam yahin hote hain. HLD mein ye lagbhag hamesha pehla box hota hai.' },
        { id: 'svc', label: 'Paste service', sub: 'stateless', x: 420, y: 180, w: 140, kind: 'server', meter: true, load: 20, hidden: true, info: 'Ye kya hai: hamara apna code (business logic). Kaam: unique short ID banana, content ko object storage mein aur metadata ko DB mein likhna, read pe dono jodna, expiry check karna. Stateless hai (koi user data apni memory mein nahi), isliye LB ke peeche jitne chaaho instances laga lo.' },
        { id: 'cache', label: 'Redis cache', sub: 'hot pastes', x: 615, y: 60, w: 170, kind: 'cache', hidden: true, info: 'Ye kya hai: RAM mein rakha tez key-value store. Deep dive mein juda, kyunki estimate ne bola reads 100:1. Popular pastes ka metadata (aur chhota content) RAM mein, ~1 ms mein. DB aur object storage ko har read se bachata hai. Expiry ke saath TTL bhi set karte hain taaki expired paste cache se na dikhe.' },
        { id: 'db', label: 'Metadata DB', sub: 'id → info', x: 615, y: 180, w: 170, kind: 'data', meter: true, load: 10, hidden: true, info: 'Ye kya hai: wo database jo har paste ki jaankari (metadata) rakhta hai. Har paste ki chhoti si row: id, content_key, size, created_at, expires_at. ~200 bytes per paste, 5 saal mein ~3.6 TB. Access pattern sirf "id se lookup" hai, to key-value ya simple SQL table dono chalenge. Source of truth yahi hai.' },
        { id: 'blob', label: 'Object storage', sub: 'paste content', x: 615, y: 300, w: 170, kind: 'data', hidden: true, info: 'Ye kya hai: S3 jaisa file store, bade, kabhi na badalne wale blobs ke liye sasta aur bahut durable. Estimate ne 5 saal mein ~180 TB bola, jo ek DB mein rakhna mehenga aur slow hota. DB mein sirf uska key (content_key) rehta hai.' },
        { id: 'cdn', label: 'CDN', sub: 'edge copies', x: 245, y: 300, w: 130, kind: 'edge', hidden: true, info: 'Ye kya hai: CDN, duniya bhar mein faile edge servers jo copies rakhte hain. Deep dive mein juda: viral paste ko duniya bhar ke users ke paas wale edge servers se serve karta hai. Ek hi paste baar baar maanga jaaye to request hamare servers tak aati hi nahi. Trade-off: delete/expire hone ke baad bhi TTL tak edge pe purani copy reh sakti hai.' },
      ],
      edges: [
        { a: 'c', b: 'lb' }, { a: 'lb', b: 'svc' }, { a: 'svc', b: 'db' }, { a: 'svc', b: 'blob' },
        { a: 'svc', b: 'cache' }, { a: 'c', b: 'cdn' }, { a: 'cdn', b: 'lb' },
      ],
      scenarios: [
        { name: 'Framework step by step', intro: 'Board khaali hai. "Start" dabao aur har stage ke saath design bante dekho.', steps: [
          { title: 'Requirements: kya banana hai', focus: ['c'], set: { c: { sub: 'create + read' } }, text: 'Abhi koi box nahi! Pehle 3 functional requirements: paste banao, link se padho, optional expiry. Out of scope: login, edit, search. NFRs: reads p99 &lt; 200 ms, 99.9% available, paste kabhi na khoye.', msg: 'FR: create, read, expiry\nOut: login, edit, search\nNFR: p99 < 200ms, 99.9%, durable' },
          { title: 'Estimate: kitna bada', focus: ['c'], text: 'Teen numbers, teen conclusions: ~100 writes/s (ek DB primary kaafi), ~10k reads/s (read-heavy, cache aage kaam aayega), ~180 TB content in 5 years (content object storage mein jaayega).', msg: 'writes ~100/s | reads ~10k/s (100:1) | ~180 TB / 5 yr' },
          { title: 'Entities aur API', focus: ['c'], text: 'Nouns: Paste (aur User placeholder). Do endpoints, har functional requirement ke liye ek. Ab pata hai boxes ko kya kaam karna hai.', msg: 'POST /pastes      { content, expires_in }\nGET  /pastes/{id}' },
          { title: 'High-level design: sabse simple', show: ['lb', 'svc', 'db', 'blob'], focus: ['lb', 'svc', 'db', 'blob'], text: 'Client → LB → stateless Paste service → Metadata DB + Object storage. Object storage isliye, kyunki estimate ne 180 TB bola. Cache aur CDN abhi <strong>nahi</strong>: design inke bina bhi sahi kaam karta hai.' },
          { title: 'Ek write ko end to end chalao', go: ['c>lb>svc', 'svc>blob', 'svc>db', 'res:svc>lb>c'], text: 'Service ID banati hai, pehle content object storage mein, phir metadata row DB mein (content pehle, taaki DB row kabhi kisi missing blob ki taraf ishaara na kare), phir link wapas.', msg: 'POST /pastes → 201 { id: "aZ3k9Qx" }' },
          { title: 'Ek read ko end to end chalao', go: ['c>lb>svc', 'svc>db', 'svc>blob', 'res:svc>lb>c'], text: 'ID se metadata (expiry check), phir content_key se content. Kaam karta hai. Ab sawaal: kya ye NFRs bhi poori karta hai? Yahin se deep dive shuru.', msg: 'GET /pastes/aZ3k9Qx → 200' },
          { title: 'Deep dive: reads 100:1 → cache', show: ['cache'], go: ['c>lb>svc', 'svc>cache', 'res:svc>lb>c'], set: { db: { state: 'dim' }, blob: { state: 'dim' } }, after: { cache: { state: 'hit' } }, text: 'Estimate ka "read-heavy" conclusion ab kaam aaya. Popular pastes Redis se ~1 ms mein. DB aur object storage ka load bahut gir gaya.' },
          { title: 'Deep dive: viral + global → CDN', show: ['cdn'], go: ['c>cdn', 'res:cdn>c'], set: { cache: { state: '' } }, after: { cdn: { state: 'hit' } }, text: 'Paste kabhi badalta nahi (immutable), to CDN pe cache karna safe aur sasta hai. Paas wala edge server jawab de deta hai; hamare servers tak request aati hi nahi.' },
          { title: 'Wrap up', set: { db: { state: '' }, blob: { state: '' }, cdn: { state: '' } }, focus: ['cache', 'cdn', 'blob'], text: 'Trade-offs: cache/CDN ki wajah se expired ya deleted paste TTL tak dikh sakta hai; object storage sasta hai lekin DB se slow. Monitor: p99 read latency, cache hit ratio, DB CPU, 5xx rate. Zyada time hota to: expiry cleanup job, abuse/spam detection, rate limiting per IP.' },
        ]},
        { name: 'Deep dive: viral paste', intro: 'Sirf simple HLD hai (na cache, na CDN). Ek paste Twitter pe viral ho gaya. NFR kehta hai p99 &lt; 200 ms. Kya hoga?', steps: [
          { title: 'Simple HLD, normal din', show: ['lb', 'svc', 'db', 'blob'], go: ['c>lb>svc>db', 'res:db>svc>lb>c'], text: 'Normal traffic pe sab theek. Har read DB aur object storage tak jaata hai.' },
          { title: 'Viral: ek hi paste pe 30k reads/s', flood: { paths: ['c>lb>svc>db'], n: 14 }, after: { db: { state: 'hot', sub: '30k reads/s', load: 95 }, svc: { load: 80 } }, text: 'Saari requests ek hi row (ek hi key) pe. Isko <strong>hot spot / hot key</strong> kehte hain. DB ka CPU 95%, queries queue mein lagne lagi.' },
          { title: 'Why it fails: NFR toota', go: 'bad:db>svc>lb>c', text: 'Latency 200 ms se upar, kuch requests timeout. Aur sabse bura: baaki saare normal pastes bhi slow, kyunki DB sabka shared hai. Ek paste ne poora feature gira diya.', msg: '504 Gateway Timeout' },
          { title: 'Fix 1: cache (hot key RAM mein)', show: ['cache'], set: { db: { state: '', sub: 'id → info', load: 15 } }, flood: { paths: ['c>lb>svc>cache'], n: 10 }, after: { cache: { state: 'hit', sub: 'viral paste' } }, text: 'Pehli read ke baad paste Redis mein. Ab 30k reads/s RAM se. DB phir se shaant. (Bahut bade hot key pe ek Redis node bhi garam ho sakta hai; tab service ki local memory mein bhi chhota cache ya Redis replicas.)' },
          { title: 'Fix 2: CDN (request aaye hi nahi)', show: ['cdn'], set: { cache: { state: '' }, svc: { load: 20 } }, flood: { paths: ['c>cdn'], n: 10 }, after: { cdn: { state: 'hit', sub: 'serving viral' } }, text: 'Paste immutable hai, to CDN edge pe rakh do. Zyaadatar requests hamare LB tak pahunchti hi nahi. Trade-off: deleted paste CDN TTL tak dikh sakta hai, isliye TTL chhota rakho ya delete pe CDN purge karo.' },
        ]},
        { name: 'Deep dive: DB primary mar gaya', intro: 'Deep dive ka classic sawaal: "Ye box mar jaaye to kya hoga?" Har box ke liye poochho. Yahan Metadata DB.', steps: [
          { title: 'Poora design, sab theek', show: ['lb', 'svc', 'db', 'blob', 'cache'], go: ['c>lb>svc>cache', 'res:svc>lb>c'], text: 'Cache ke saath design chal raha hai.' },
          { title: 'DB primary crash', set: { db: { state: 'down', sub: 'DOWN' } }, focus: ['db'], text: 'Ek hi Metadata DB tha. Ye <strong>SPOF (single point of failure)</strong> hai: iske girne se naye paste banna band.' },
          { title: 'Writes fail', go: ['c>lb>svc>db', 'bad:svc>lb>c'], text: 'Content object storage mein chala bhi gaya to metadata row nahi likhi ja sakti. User ko error. (Bacha hua blob orphan ho gaya; baad mein cleanup job usse hata sakta hai.)', msg: 'POST /pastes → 503 Service Unavailable' },
          { title: 'Reads: popular chal rahe, purane nahi', go: ['c>lb>svc>cache', 'res:svc>lb>c', 'c>lb>svc>db', 'bad:svc>lb>c'], text: 'Cache mein jo pastes the wo chal rahe hain (graceful degradation). Cache miss wale sab fail. Availability NFR (99.9%) toot gaya.' },
          { title: 'Fix: replica + automatic failover', set: { db: { state: 'ok', sub: 'replica promoted' } }, go: ['c>lb>svc>db', 'res:db>svc>lb>c'], text: 'Primary ke saath ek standby replica. Primary gira to replica ko primary bana do (failover, seconds mein). Trade-off: replication async ho to aakhri kuch writes kho sakte hain; NFR "paste kabhi na khoye" hai, to kam se kam ek replica ko synchronous rakho, thodi slow writes ki keemat pe.' },
        ]},
      ],
    },
    { type: 'h2', text: 'Step 5: Deep dives (≈15-20 min), seniority yahin dikhti hai' },
    { type: 'p', html: `Simple design kaam karta hai. Ab Step 1 ki NFR list nikaalo aur ek-ek karke poochho: <strong>"kya mera design ye number poora karta hai? Nahi to kahan toot-ta hai?"</strong> Deep dive ka agenda tum khud nahi gadhte; wo tumhari NFRs aur estimates se aata hai. Upar ke diagram ke do failure scenarios isi tarah mile the.` },
    { type: 'callout', tone: 'term', title: 'Hot spot, bottleneck aur SPOF', html: `<strong>Hot spot:</strong> ek hi cheez (ek row, ek key, ek server) pe sabka load aa jaana, jaise viral paste ki ek hi row pe 30,000 reads/s. Baaki machines khaali, ye ek garam.<br><strong>Bottleneck:</strong> raaste ka sabse patla hissa. Traffic badhne pe jo box sabse pehle bharta hai, poora system usi ki speed se chalta hai.<br><strong>SPOF (single point of failure):</strong> wo akela box jiske girne se poora system (ya ek poora feature) gir jaata hai, kyunki uski koi doosri copy nahi.<br><strong>Kyun chahiye ye words:</strong> deep dive inhi teen ko dhoondhne ka kaam hai. Har box pe ek baar ungli rakh ke poochho: "ye garam hoga? ye sabse pehle bharega? ye mar gaya to?"` },
    { type: 'table', head: ['Kya dhoondho', 'Sawaal jo khud se poochho', 'Aam fix (aur uski keemat)'], rows: [
      ['Hot spots', 'Kya koi ek key/row/partition pe sabka load aata hai? (viral paste, celebrity, ek popular item)', 'Cache, CDN, key ko split karna, replicas. Keemat: stale data, complexity'],
      ['Bottlenecks', 'Estimate ke peak QPS pe sabse pehle kaunsa box bharega?', 'Horizontal scaling, read replicas, sharding, queue se async. Keemat: zyada boxes, consistency mushkil'],
      ['SPOFs', 'Har box ke liye: ye mar jaaye to kya? Kya iski koi doosri copy hai?', 'Replication + failover, multiple instances behind LB. Keemat: paisa, replication lag'],
      ['Consistency', 'Kya kisi user ko purana/galat data dikh sakta hai? Kya ye chalega?', 'Strong vs eventual chuno (CAP/PACELC), read-your-writes. Keemat: latency ya availability'],
      ['Failure scenarios', 'Network slow ho, dependency timeout de, retry ho, message do baar aaye to?', 'Timeouts, retries with backoff, idempotency, circuit breaker, DLQ. Keemat: complexity'],
    ]},
    { type: 'list', items: [
      `<strong>2-3 deep dives kaafi hain</strong>, 10 nahi. Sabse bade risk se shuru karo (jo NFR sabse zyada khatre mein hai). Pastebin mein: read latency (hot key) aur durability (DB failure). Unique ID generation teesra achha topic hai.`,
      `<strong>Har fix ke saath uski keemat bolo.</strong> "Cache lagaya" adhoora hai. "Cache lagaya, ab expired paste TTL tak dikh sakta hai, isliye TTL = min(expires_at, 1 hour)" poora jawab hai.`,
      `<strong>Interviewer ke hint suno.</strong> Junior level pe interviewer khud deep dive ka topic deta hai; senior level pe ummeed hoti hai ki tum khud agenda chalao. Lekin agar interviewer kisi taraf ishaara kare ("aur agar ye paste 1 crore log kholein?"), apna plan chhod ke wahi jao. Wo tumhe points dene ki koshish kar raha hai.`,
      `<strong>Ek monologue mat karo.</strong> Har deep dive ke baad ruk ke poochho: "Isko aur gehra karein ya agle topic pe chalein?"`,
    ]},

    { type: 'callout', tone: 'tip', title: 'Step card 5: Deep dives', html: `<strong>Input:</strong> NFR list + HLD + "deep dive mein dekhenge" wali list.<br><strong>Kya karte ho:</strong> sabse bade 2-3 khatre chuno; har ek ke liye problem → kyun toot-ta hai → fix → keemat.<br><strong>Output (board pe):</strong> HLD mein naye boxes (cache, replica, queue...) aur har ek ke saath ek trade-off.<br><strong>Mini example (xyz.com "Like" button):</strong> Problem: viral video pe 6,000 likes/s ek hi <code>like_count</code> row pe, DB lock ki line lag gayi. Fix: count ko 10 alag rows (shards) mein baanto; har like kisi ek random row ko +1 kare; padhne pe 10 ka jod, jo cache mein 5 sec ke liye. Keemat: count 5 sec tak purana dikh sakta hai, jo Step 1 ke NFR ne allow kiya tha.<br><strong>Done jab:</strong> sabse khatarnak NFR ka jawab hai, aur har box ke liye "ye mar gaya to?" ek baar poochha.` },

    { type: 'h2', text: 'Step 6: Wrap up (≈3-5 min)' },
    { type: 'p', html: `Aakhri minutes mein teen cheezein, chhoti aur saaf:` },
    { type: 'callout', tone: 'term', title: 'Monitoring aur metric', html: `<strong>Ye kya hai:</strong> metric = ek number jo system lagataar report karta hai, jaise p99 latency, 5xx errors per minute, cache hit ratio (kitne % reads cache se mile). Monitoring = in numbers ko dashboard pe dekhna aur hadd paar hone pe alert.<br><strong>Kyun chahiye:</strong> design kaagaz pe sahi ho sakta hai, lekin production mein pata kaise chalega ki NFR poore ho rahe hain? Metrics se.<br><strong>Iske bina:</strong> users shikayat karenge tab pata chalega. Detail <a href="#/operations">operations lesson</a> mein.` },
    { type: 'list', ordered: true, items: [
      `<strong>Trade-offs jo tumne liye</strong>: "Eventual consistency li read speed ke liye; object storage liya cost ke liye, latency ki keemat pe."`,
      `<strong>Kya monitor karoge</strong>: "p99 read latency, cache hit ratio, DB CPU aur replication lag, 5xx rate, object storage errors. Alert agar hit ratio 90% se gire."`,
      `<strong>Zyada time hota to</strong>: "Expired pastes ka cleanup job, spam/abuse detection, per-IP rate limiting, multi-region."`,
    ]},
    { type: 'compare',
      left: { title: 'Weak wrap up', html: `"Toh ye mera design hai. Ye scalable hai aur highly available hai. Kuch aur?"<br><br>Har design "scalable" hone ka daawa karta hai. Kuch naya nahi bataya.` },
      right: { title: 'Strong wrap up', html: `"Teen bade trade-offs: (1) CDN/cache ki wajah se deleted paste ~1 hour tak dikh sakta hai; (2) sync replica se writes ~5-10 ms slow, lekin paste nahi khoyega; (3) sequential IDs guessable hain, isliye scramble kiye. Monitor: p99, hit ratio, replication lag. Agla kaam: cleanup job aur abuse detection."` },
    },

    { type: 'callout', tone: 'tip', title: 'Step card 6: Wrap up', html: `<strong>Input:</strong> deep dives ke trade-offs.<br><strong>Kya karte ho:</strong> 3 bade trade-offs, 2-3 metrics, 1-2 "agla kaam".<br><strong>Output:</strong> 30-60 second ka chhota summary.<br><strong>Mini example (xyz.com "Like" button):</strong> "Count 5 sec tak purana dikh sakta hai, speed ke liye. Unique (user, video) se do baar like nahi hota. Monitor: like API p99, count shards ka load, cache hit ratio. Zyada time: bots se fake likes rokna."<br><strong>Done jab:</strong> interviewer ko pata hai tumne kya chhoda aur kyun.` },

    { type: 'h2', text: 'Wo skeleton jisse lagbhag har design ugta hai' },
    { type: 'p', html: `Roadmap ek generic skeleton deta hai. Lagbhag har real system (Uber, WhatsApp, YouTube, Zomato) isi ka koi version hai. Tumhara kaam har case study mein ye decide karna hai ki <strong>kaunse boxes jodne, hatane ya scale karne hain, aur kyun</strong>.` },
    { type: 'p', html: `Har box pehle ke lessons mein aa chuka hai. Ek line mein yaad: <strong>DNS</strong> naam (xyz.com) ko server ke address mein badalta hai. <strong>CDN</strong> users ke paas copies rakhta hai. <strong>Load balancer / API gateway</strong> requests ko servers mein baant-ta hai. <strong>Redis cache</strong> RAM mein tez copies. <strong>Primary DB + read replicas</strong>: ek database jisme likhte hain, aur uski copies jinse padhte hain. <strong>Kafka / queue + workers</strong>: kaam ki line, jise baad mein background workers karte hain. <strong>Object storage</strong>: badi files ka sasta store.` },
    { type: 'ascii', caption: 'Generic skeleton. Pastebin ne isme se Client, LB, Service, Cache, DB, Object storage aur CDN liye; Kafka/workers ki zaroorat nahi padi (abhi).', text: `
                               Client app
                                   │
            ┌──────────────────────┼─────────────────────────┐
            v                      v                         v
           DNS          CDN: static and media      Load balancer / API gateway
                                                         │            │
                                                     Service A     Service B
                                                     │      │          │
                                                     v      v          v
                                              Redis cache  Primary DB  Kafka / queue
                                                              │            │
                                                              v            v
                                                       Read replicas    Workers
                                                                           │
                                                                           v
                                                                    Object storage` },
    { type: 'table', head: ['Box', 'Kab jodo (kaunsi requirement/number ise maangta hai)'], rows: [
      ['Cache', 'Read-heavy (read:write 10:1 ya zyada), latency target tight, ya ek hi cheez baar baar maangi jaati hai'],
      ['CDN', 'Static/media content, global users, immutable cheezein'],
      ['Read replicas', 'Reads ek DB se zyada, thoda purana data chalega'],
      ['Kafka / queue + workers', 'Kaam jo user ke response ke liye zaroori nahi (emails, analytics, thumbnails), traffic spikes absorb karna, ek event pe kai consumers'],
      ['Object storage', 'Bade blobs: images, videos, files, ya bahut saara text'],
      ['Service A / B split', 'Alag hisse alag speed se scale hote hain, ya alag teams own karti hain. Sirf "microservices achhe hote hain" reason nahi hai'],
    ]},
    { type: 'h2', text: 'Common mistakes (aur unka ilaaj)' },
    { type: 'p', html: `Pehle chaar roadmap ne khas taur pe naam liye hain. Baaki wo hain jo interviews mein baar baar dikhte hain.` },
    { type: 'callout', tone: 'mistake', title: '1. Simple design se pehle Kafka aur microservices', html: `Pehle 2 minute mein "Kafka, 6 microservices, Cassandra, Kubernetes". Problem: koi requirement abhi tak inhe maang hi nahi rahi. <strong>Ilaaj:</strong> pehle simple design jo kaam kare, phir har naya box kisi NFR ya number ke reason se. "Kafka isliye kyunki click analytics redirect ko slow nahi karna chahiye" theek hai; "Kafka isliye kyunki scale" nahi.` },
    { type: 'callout', tone: 'mistake', title: '2. 10 minute estimate, conclusion zero', html: `Bahut saare numbers, decimal tak, aur end mein "to ye bada system hai". <strong>Ilaaj:</strong> 3-5 minute, 3-4 numbers, aur har number ke baad ek "matlab...": "10k reads/s, matlab cache". Jo number kisi decision ko nahi badalta, use skip karo.` },
    { type: 'callout', tone: 'mistake', title: '3. Technology ka naam, reason nahi', html: `"Yahan MongoDB lagayenge." Kyun? "Kyunki scalable hai." Ye jawab nahi hai. <strong>Ilaaj:</strong> pehle access pattern bolo, phir technology: "Sirf id se lookup, koi join nahi, TBs data, isliye key-value store; DynamoDB ya Cassandra jaisa." Technology badal sakti hai; reasoning hi asli answer hai.` },
    { type: 'callout', tone: 'mistake', title: '4. Kabhi nahi poochha "ye box mar gaya to?"', html: `Design mein ek DB, ek cache, ek ID generator, aur kisi ka failure discuss nahi hua. <strong>Ilaaj:</strong> deep dive mein har box pe ek baar ungli rakh ke bolo: "ye gira to kya hoga, aur user ko kya dikhega?" Replica, failover, fail-open/fail-closed, graceful degradation: inme se kuch na kuch har box ke liye.` },
    { type: 'callout', tone: 'mistake', title: '5. Bina clarifying questions ke shuru', html: `"Design Twitter" sunte hi drawing. Baad mein pata chala interviewer ko sirf timeline chahiye thi, DMs nahi. <strong>Ilaaj:</strong> pehle 5 minute requirements aur out-of-scope. Jo nahi pata, assumption bol ke likh lo.` },
    { type: 'callout', tone: 'mistake', title: '6. Trade-offs nahi bole', html: `Har decision "best" bataya. Real engineering mein free lunch nahi hota: cache = stale data, sharding = cross-shard queries mushkil, async = eventual consistency. <strong>Ilaaj:</strong> har bade decision ke saath ek line: "isse X milta hai, keemat Y hai, aur yahan Y chalega kyunki..."` },
    { type: 'callout', tone: 'mistake', title: '7. Time management: HLD mein 35 minute', html: `Boxes perfect karne mein itna time gaya ki deep dive ke liye 5 minute bache, jabki wahi sabse zyada marks wala hissa hai. <strong>Ilaaj:</strong> ghadi dekho. ~25 minute tak HLD khatam aur ek request end-to-end chal chuki ho. Neeche ka practice tool isi ki aadat daalta hai.` },
    { type: 'callout', tone: 'mistake', title: '8. Chup-chaap drawing, ya non-stop bolna', html: `Interviewer tumhara dimaag dekhna chahta hai, sirf final picture nahi. <strong>Ilaaj:</strong> sochte hue bolo ("main yahan cache isliye soch raha hoon..."), aur har stage ke end mein check karo: "Theek lag raha hai? Kisi cheez pe gehra jaayein?"` },
    { type: 'callout', tone: 'mistake', title: '9. Scale jo kisi ne maanga hi nahi', html: `Sawaal tha "ek college ke liye notice board", jawab mein multi-region active-active aur sharding. Over-engineering bhi utna hi galat hai jitna under-engineering. <strong>Ilaaj:</strong> numbers ke hisaab se design karo. 100 QPS ke liye ek achha server aur ek DB replica ke saath bilkul sahi jawab hai.` },
    { type: 'h2', text: 'Practice: kaunsa step chhoota?' },
    { type: 'p', html: `Neeche paanch candidates ke jawab ka chhota sa record hai. Har ek ne ek step skip kiya, aur uski keemat baad mein chukaayi. Padho aur pakdo kaunsa step gayab hai.` },
    { type: 'custom', render(el) {
      const ST = ['Requirements', 'Estimate', 'Entities + API', 'High-level design', 'Deep dives', 'Wrap up'];
      const C = [
        { t: 'xyz Chat design', log: ['"Main maan raha hoon 1:1 aur groups, calls out of scope. Message 500 ms mein, kabhi na khoye."', '"10 crore DAU, peak pe 3 crore online, matlab 3 crore khule connections."', 'Entities: User, Conversation, Message. Events: message.send, message.new.', 'Deep dive: gateway gire to reconnect, duplicate ke liye client_msg_id...', 'Wrap up: trade-offs aur metrics.'], a: 3, e: 'Entities ke baad seedha deep dive. Koi simple design board pe nahi bana, aur ek message ko end to end nahi chalaya. Interviewer ko pata hi nahi ki "gateway" kahan hai aur message kis raaste jaata hai.' },
        { t: 'xyz Paste design', log: ['Seedha boxes: "LB, Paste service, Cassandra, Kafka, Redis, CDN."', '"10M paste/day matlab ~100 writes/s."', 'API: POST /pastes, GET /pastes/{id}.', 'Deep dive: Cassandra sharding...', 'Wrap up.'], a: 0, e: 'Requirements nahi poochhe. Baad mein pata chala login chahiye tha aur paste 50 MB tak ke ho sakte the (object storage!). Kafka kis requirement ke liye tha, koi nahi jaanta.' },
        { t: 'xyz Feed design', log: ['FR: post, follow, home feed. Out: ads, ranking. NFR: feed 500 ms, eventual chalega.', 'Entities: User, Post, Follow. API: POST /posts, GET /feed?cursor=', 'HLD: Post service, Follow service, Feed service, DBs. Ek feed read chalaya.', 'Deep dive: "feed ko precompute karenge... shayad? Pata nahi kitne followers hote hain."', 'Wrap up.'], a: 1, e: 'Estimate skip hua. Isliye deep dive mein pata hi nahi tha ki ek post kitne feeds mein jaata hai (200 followers? 1 crore?). Celebrity problem ka number ke bina koi jawab nahi bana.' },
        { t: 'xyz Like button design', log: ['FR: like/unlike, count dikhe. NFR: 2 crore DAU, count 5 sec late chalega.', '~2,000 likes/s, peak 6,000/s; matlab ek row pe garmi.', 'Entities + API: Like, Video; PUT /videos/{id}/like.', 'HLD: Like service + DB, ek request end to end.', 'Deep dive: count shards + cache. Phir... time khatam, interviewer ne "thanks" bola.'], a: 5, e: 'Wrap up nahi hua. Design achha tha, lekin trade-offs (count 5 sec purana), metrics aur agla kaam kabhi bola hi nahi. Aakhri 3 minute bachane chahiye the.' },
        { t: 'xyz Rate limiter design', log: ['FR: per API key 100 req/min, 429 + Retry-After. NFR: har request pe 2-3 ms se zyada nahi.', '~1M checks/s, sab RAM mein fit, matlab Redis cluster.', 'Gateway → Redis → services. Ek request: key nikalo, count check, forward ya 429.', 'Deep dive: race condition, Lua script, Redis down pe fail-open.', 'Wrap up: trade-offs, metrics.'], a: 2, e: 'Entities aur API skip hue. Rule ka shape kya hai (key type, limit, window)? Gateway Redis se kya poochhta hai? Bina iske HLD ke arrows ka matlab saaf nahi hua, aur interviewer ko khud poochhna pada.' },
      ];
      el.innerHTML = `<div class="dfm-head" style="font:600 16px var(--f-body);color:var(--ink)"></div>
        <ol class="dfm-log" style="margin:8px 0 0 20px;padding:0;font-size:14px;line-height:1.55;color:var(--ink-2)"></ol>
        <div style="margin-top:10px;font-size:14px;color:var(--ink-2)">Kaunsa step gayab hai?</div>
        <div class="dfm-opts" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px"></div>
        <div class="stats"><div class="stat"><span>Sahi</span><strong class="dfm-s">0 / 0</strong></div><div class="stat"><span>Case</span><strong class="dfm-c"></strong></div></div>
        <div class="calc-note dfm-n"></div>
        <div style="margin-top:8px"><button type="button" class="btn small primary dfm-next">Agla case →</button></div>`;
      const $ = c => el.querySelector(c);
      let i = 0, ok = 0, done = 0, locked = false;
      const draw = () => {
        const c = C[i];
        $('.dfm-head').textContent = c.t;
        $('.dfm-log').innerHTML = c.log.map(x => `<li>${x}</li>`).join('');
        $('.dfm-opts').innerHTML = ST.map((x, k) => `<button type="button" class="btn small ghost" data-k="${k}">${x}</button>`).join('');
        $('.dfm-c').textContent = (i + 1) + ' / ' + C.length;
        $('.dfm-s').textContent = ok + ' / ' + done;
        $('.dfm-n').textContent = 'Socho: kis step ka output (FR list, numbers, API, diagram, fixes, summary) is record mein nahi dikhta?';
        locked = false;
        $('.dfm-opts').querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
          if (locked) return; locked = true; done++;
          const right = +b.dataset.k === c.a; if (right) ok++;
          b.classList.remove('ghost'); if (right) b.classList.add('primary');
          $('.dfm-s').textContent = ok + ' / ' + done;
          $('.dfm-n').textContent = (right ? 'Sahi! ' : `Nahi. Gayab step: ${ST[c.a]}. `) + c.e;
        });
      };
      $('.dfm-next').onclick = () => { i = (i + 1) % C.length; if (i === 0) { ok = 0; done = 0; } draw(); };
      draw();
    }},
    { type: 'h2', text: 'Practice tool: framework khud chalao' },
    { type: 'p', html: `Ek prompt chuno, interview ki length chuno, aur timer chalao. Har stage pe checklist tick karo (pehle kaagaz pe khud socho!), phir "Model answer" khol ke compare karo. Budget bar dikhata hai ki plan ke hisaab se abhi tumhe kis stage pe hona chahiye.` },
    { type: 'custom', render(el) {
      const STAGES = [
        { name: 'Requirements', b45: 5, b60: 5, checks: ['3-5 functional requirements, "users can ..." ki shakal mein', 'Out of scope saaf bola', 'NFRs numbers ke saath: scale, latency, availability', 'Consistency need decide ki (strong ya eventual)'] },
        { name: 'Estimate', b45: 3, b60: 5, checks: ['QPS (average + peak)', 'Read:write ratio', 'Storage ya concurrent connections (jo relevant ho)', 'Har number ke baad ek design conclusion'] },
        { name: 'Entities + API', b45: 5, b60: 5, checks: ['Core entities (nouns) aur 2-4 key fields', 'Har functional requirement ka endpoint ya event', 'User id auth token se, body se nahi'] },
        { name: 'High-level design', b45: 12, b60: 15, checks: ['Client → LB / gateway → services → DB', 'Har functional requirement is design se poori hoti hai', 'Ek request end to end bolke chalayi', 'Mushkil hisse "deep dive mein dekhenge" note kiye'] },
        { name: 'Deep dives', b45: 15, b60: 20, checks: ['NFRs pe wapas gaye: hot spot / bottleneck dhoondha', 'Har box ke liye "ye mar gaya to?"', 'Consistency ya failure scenario discuss kiya', 'Har fix ki keemat (trade-off) boli'] },
        { name: 'Wrap up', b45: 3, b60: 5, checks: ['Bade trade-offs summarize kiye', 'Kya monitor karoge (2-3 metrics)', 'Zyada time hota to kya karte'] },
      ];
      const P = [
        { name: 'URL shortener', q: 'xyz.co jaisa URL shortener design karo (Bitly jaisa).', a: [
          '<strong>FR:</strong> lamba URL do, short link lo; short link kholo to redirect; optional custom alias aur expiry. <strong>Out:</strong> accounts, dashboards. <strong>NFR:</strong> redirect bahut fast (~50 ms se kam), bahut high availability (link toota = kisi aur ki site tooti), codes kabhi takraayein nahi. Naya link turant kaam kare, baaki eventual chalega.',
          '100M naye links/day → ~1k writes/s. Har link ~100 baar khulta hai → ~100k reads/s (peak ×3). <strong>Matlab read-heavy, cache sabse important.</strong> ~500 bytes/link → ~50 GB/day → ~90 TB in 5 years. <strong>Matlab sharded key-value store.</strong> 7 base62 chars = 62^7 ≈ 3.5 trillion codes, kaafi.',
          '<strong>Link</strong> { code, long_url, created_at, expires_at }. <code>POST /links { url }</code> → 201 { short }. <code>GET /{code}</code> → 301/302 with Location header.',
          'Client → LB → stateless app servers → ID generator (unique numbers, base62 mein) + key-value DB (code → URL). Redirect: app server DB se URL padh ke 301/302 bhejta hai. End to end ek create aur ek click chalao.',
          '(1) Hot links: Redis cache, 99% redirects ~1 ms. (2) ID generator SPOF/bottleneck: har server 1,000 IDs ki range ek saath le. (3) 301 vs 302: analytics chahiye to 302 (ya 301 chhote cache time ke saath). (4) Click analytics: DB mein count++ nahi, queue mein event (async). (5) Sequential codes guessable: scramble.',
          'Trade-offs: 302 = zyada load lekin har click count; range-based IDs = crash pe kuch IDs waste. Monitor: redirect p99, cache hit ratio, ID ranges ka use, queue lag. Zyada time: abuse/malware link detection, custom domains.',
        ]},
        { name: 'Chat (1:1 + groups)', q: 'xyz Chat design karo: 1:1 aur group messages, online/offline delivery.', a: [
          '<strong>FR:</strong> 1:1 message bhejo/pao; groups (maan lo kuch sau members tak); sent/delivered/read receipts; offline user ko baad mein mile. <strong>Out:</strong> voice/video calls, stories, payments. <strong>NFR:</strong> online user ko ~500 ms se kam mein; message kabhi na khoye; ek conversation mein order sahi.',
          '100M DAU × 50 messages = 5B/day → ~50k msgs/s (peak ~150k). <strong>Concurrent connections</strong> sabse important number: peak pe maan lo 30M online → 30M persistent connections. Agar ek gateway ~1 lakh sambhale → ~300 gateway servers. <strong>Matlab connection layer alag aur horizontally scaled.</strong> ~100 bytes/message → ~500 GB/day.',
          '<strong>User, Conversation, Message</strong> { id (time-ordered), conv_id, sender, text, client_msg_id }, <strong>Receipt</strong>. Events (WebSocket): <code>message.send</code>, <code>message.new</code>, <code>message.ack</code>, <code>message.read</code>. REST: <code>GET /conversations/{id}/messages?cursor=</code> history ke liye.',
          'Client ↔ WebSocket gateways (lamba connection) → chat service → message store (conversation_id se partitioned). Ek registry (Redis): user → kis gateway pe connected. Send flow: save → registry se recipient ka gateway dhoondho → push. Offline ho to push notification service.',
          '(1) Gateway mar gaya: clients reconnect karke "last message id ke baad ka sab" maangte hain. (2) Retry pe duplicate: client_msg_id se idempotency. (3) Order: per-conversation time-ordered IDs. (4) Bade groups: fan-out ka kaam queue + workers pe. (5) Delivered/read: chhote events, eventual chalega.',
          'Trade-offs: at-least-once + dedupe (exactly-once mehenga); receipts thode late. Monitor: connections per gateway, send→deliver latency, undelivered backlog. Zyada time: end-to-end encryption, media (object storage + CDN), multi-device sync.',
        ]},
        { name: 'News feed', q: 'xyz.com ka home feed design karo: jinko follow karte ho unke posts, naye pehle.', a: [
          '<strong>FR:</strong> post banao; users ko follow karo; home feed mein followed logon ke posts, naye pehle, scroll karte jao. <strong>Out:</strong> ML ranking, ads, comments. <strong>NFR:</strong> feed ~500 ms se kam mein khule; naya post kuch seconds late dikhe to chalega (eventual); bahut high availability.',
          '200M DAU, 1 post/day → ~2k writes/s. Feed din mein 10 baar → 2B reads/day → ~20k reads/s. Average 200 followers → har post 200 feeds mein → ~400k feed inserts/s. <strong>Matlab read-heavy, feeds precompute karne layak; fan-out ka kaam async.</strong> Kuch celebrities ke crores followers: <strong>ek post = crores writes</strong>, alag treatment chahiye.',
          '<strong>User, Post</strong> { id, author, text, media_url, created_at }, <strong>Follow</strong> { follower, followee }, <strong>FeedItem</strong>. <code>POST /posts</code>, <code>POST /follows</code>, <code>GET /feed?cursor=</code> (cursor pagination, offset nahi).',
          'Simple: Client → LB → Post service (post DB) + Follow service (follow table) + Feed service. Feed read pe: followees ki list lo, unke latest posts lo, merge karke sort (fan-out on read). Kaam karta hai, lekin har feed open pe 200 jagah se padhna slow hai: deep dive mein note.',
          '(1) Read latency: har user ka feed Redis mein precompute (fan-out on write) via queue + workers. (2) Celebrity: unke posts fan-out mat karo, read time pe merge (hybrid). (3) Worker crash: queue retry, idempotent insert. (4) Feed cache sirf active users ke liye, baaki on-demand.',
          'Trade-offs: hybrid = do code paths; feed kuch seconds stale. Monitor: feed p99, fan-out queue lag, cache hit ratio. Zyada time: ranking, media via CDN, inactive users ke feeds evict karna.',
        ]},
        { name: 'Rate limiter', q: 'xyz.com APIs ke liye rate limiter design karo (per user / IP / API key).', a: [
          '<strong>FR:</strong> rules jaise "per API key 100 requests/min, per endpoint"; limit cross ho to 429 + Retry-After; rules config se badal sakein. <strong>Out:</strong> billing, ML-based bot detection. <strong>NFR:</strong> har request pe bas kuch ms extra; kai servers ke beech sahi ginti; khud kabhi poori API na giraaye. Decide: Redis down ho to fail-open ya fail-closed?',
          'Peak ~1M API req/s → ~1M counter checks/s. Active keys maan lo 10M × ~100 bytes ≈ 1 GB. <strong>Matlab poora state RAM mein fit (Redis), disk DB hot path pe nahi.</strong> 1M ops/s ek node ke liye zyada → <strong>Redis cluster, key se shard.</strong>',
          '<strong>Rule</strong> { key_type, endpoint, limit, window }, <strong>Bucket</strong> { key, tokens, last_refill }. Internal call: <code>allow(key, rule) → { allowed, remaining, retry_after }</code>. Bahar: <code>429 Too Many Requests</code> + <code>Retry-After</code> header.',
          'Client → API gateway (rate-limit middleware) → Redis (counters/buckets) → allowed ho to backend services. Rules ek config store se aate hain aur gateway memory mein cache hote hain. End to end: request → key nikalo → Redis check → forward ya 429.',
          '(1) Race condition: do servers same counter padh ke dono "allowed" bolein → atomic Lua script. (2) Algorithm: token bucket (bursts allowed) vs sliding window (smooth). (3) Redis down: fail-open (API chalti rahe, limit nahi) vs fail-closed (safe, lekin outage). (4) Hot key: ek bada customer ek shard garam kare.',
          'Trade-offs: thodi inaccuracy li latency ke liye; fail-open chuna to abuse ka risk. Monitor: 429 rate per rule, Redis latency, middleware ka added p99. Zyada time: multi-region limits, local in-memory pre-check.',
        ]},
      ];
      el.innerHTML = `<div class="chips df-p" role="group" aria-label="Prompt" style="padding:0"></div>
        <div class="chips df-len" role="group" aria-label="Interview length" style="padding:8px 0 0">
          <button type="button" class="chip on" data-l="45">45 min interview</button>
          <button type="button" class="chip" data-l="60">60 min interview</button>
        </div>
        <div class="df-bar" style="display:flex;gap:3px;margin-top:14px;position:relative"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px">
          <button type="button" class="btn small primary df-go">Timer start</button>
          <button type="button" class="btn small ghost df-reset">Reset timer</button>
          <label style="display:flex;gap:6px;align-items:center;font-size:14px;color:var(--ink-2)"><input type="checkbox" class="df-fast"> 10x speed (demo ke liye)</label>
        </div>
        <div class="stats">
          <div class="stat"><span>Timer</span><strong class="df-t">00:00</strong></div>
          <div class="stat"><span>Plan ke hisaab se abhi</span><strong class="df-now" style="font-size:17px"></strong></div>
          <div class="stat"><span>Checklist</span><strong class="df-done"></strong></div>
        </div>
        <div class="chips df-st" role="group" aria-label="Stage" style="padding:14px 0 0"></div>
        <div class="df-card" style="margin-top:10px;border:1px solid var(--line);border-radius:var(--r);background:var(--surface-2);padding:12px 14px"></div>
        <div class="calc-note df-note"></div>`;
      const $ = c => el.querySelector(c);
      let pi = 0, len = 45, si = 0, sec = 0, timer = null, reveal = false;
      const ticks = P.map(() => STAGES.map(s => s.checks.map(() => false)));
      const budgets = () => STAGES.map(s => len === 45 ? s.b45 : s.b60);
      const total = () => budgets().reduce((a, b) => a + b, 0);
      // which stage the plan says you should be in after m minutes
      const stageAt = m => { let acc = 0; const b = budgets(); for (let i = 0; i < b.length; i++) { acc += b[i]; if (m < acc) return i; } return -1; };
      const mmss = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
      const SHORT = ['Req', 'Est', 'API', 'HLD', 'Deep', 'Wrap'];
      $('.df-p').innerHTML = P.map((p, i) => `<button type="button" class="chip${i ? '' : ' on'}" data-i="${i}">${p.name}</button>`).join('');
      const drawBar = () => {
        const b = budgets(), T = total(), m = sec / 60, plan = stageAt(m);
        $('.df-bar').innerHTML = b.map((x, i) => {
          const isPlan = i === plan, isSel = i === si;
          return `<div data-s="${i}" title="${STAGES[i].name}: ${x} min" style="flex:${x} 1 0;min-width:26px;cursor:pointer;border-radius:6px;padding:5px 2px;text-align:center;overflow:hidden;white-space:nowrap;font:600 10.5px/1.3 var(--f-body);color:${isPlan ? 'var(--accent-ink)' : 'var(--ink-2)'};background:${isPlan ? 'var(--accent-soft)' : 'var(--surface-2)'};border:2px solid ${isSel ? 'var(--accent)' : 'var(--line)'}">${SHORT[i]}<br>${x}m</div>`;
        }).join('') + `<div aria-hidden="true" style="position:absolute;top:-4px;bottom:-4px;width:2px;background:var(--red);left:${Math.min(100, (m / T) * 100).toFixed(2)}%"></div>`;
        $('.df-bar').querySelectorAll('[data-s]').forEach(d => d.onclick = () => { si = +d.dataset.s; reveal = false; draw(); });
        $('.df-t').textContent = mmss(sec) + ' / ' + T + ':00';
        $('.df-now').textContent = plan < 0 ? 'Time khatam' : STAGES[plan].name;
        const tk = ticks[pi], all = tk.flat().length, done = tk.flat().filter(Boolean).length;
        $('.df-done').textContent = done + ' / ' + all;
        drawNote(b, T, plan);
      };
      const drawCard = () => {
        const b = budgets(), tk = ticks[pi];
        $('.df-st').innerHTML = STAGES.map((s, i) => `<button type="button" class="chip${i === si ? ' on' : ''}" data-s="${i}">${tk[i].every(Boolean) ? '✓ ' : ''}${i + 1}. ${s.name}</button>`).join('');
        $('.df-st').querySelectorAll('.chip').forEach(c => c.onclick = () => { si = +c.dataset.s; reveal = false; draw(); });
        const S = STAGES[si];
        $('.df-card').innerHTML = `<div style="font:600 15px var(--f-display);color:var(--ink)">${si + 1}. ${S.name} <span style="font:400 13px var(--f-body);color:var(--ink-3)">budget ${b[si]} min (${len} min plan)</span></div>
          <div style="margin:6px 0 4px;font-size:14px;color:var(--ink-2)">Prompt: ${P[pi].q}</div>
          ${S.checks.map((c, k) => `<label style="display:flex;gap:8px;align-items:flex-start;margin-top:6px;font-size:14px;color:var(--ink)"><input type="checkbox" data-k="${k}"${tk[si][k] ? ' checked' : ''} style="margin-top:3px"> <span>${c}</span></label>`).join('')}
          <button type="button" class="btn small ghost df-rev" style="margin-top:10px">${reveal ? 'Model answer chhupao' : 'Model answer dikhao'}</button>
          <div class="df-ans" style="margin-top:8px;font-size:14px;line-height:1.6;color:var(--ink-2);border-left:3px solid var(--accent);padding-left:10px"${reveal ? '' : ' hidden'}>${P[pi].a[si]}</div>`;
        $('.df-card').querySelectorAll('input[data-k]').forEach(x => x.onchange = () => { tk[si][+x.dataset.k] = x.checked; draw(); });
        $('.df-rev').onclick = () => { reveal = !reveal; draw(); };
      };
      const drawNote = (b, T, plan) => {
        const S = STAGES[si], tk = ticks[pi];
        let note;
        if (plan < 0) note = 'Time khatam. Jo stages adhoore hain, wahi tumhari agli practice ka focus hain.';
        else if (sec > 0 && plan > si) note = `Plan ke hisaab se ab "${STAGES[plan].name}" chal raha hona chahiye, tum "${S.name}" pe ho. Interview mein yahin deep dive ka time khota hai: ek line mein khatam karo aur aage badho.`;
        else if (tk[si].every(Boolean)) note = `"${S.name}" ki checklist poori. ${si < 5 ? 'Agle stage pe chalo.' : 'Poora framework ho gaya!'}`;
        else note = `Pehle kaagaz pe khud likho, phir checklist tick karo, phir model answer se compare karo. Deep dives ka budget sabse bada hai (${b[4]} of ${T} min).`;
        $('.df-note').textContent = note;
      };
      const draw = () => { drawCard(); drawBar(); };
      const stop = () => { if (timer) clearInterval(timer); timer = null; $('.df-go').textContent = sec >= total() * 60 ? 'Phir se start' : sec > 0 ? 'Timer resume' : 'Timer start'; };
      $('.df-go').onclick = () => {
        if (timer) { stop(); return; }
        if (sec >= total() * 60) sec = 0;
        $('.df-go').textContent = 'Pause';
        timer = setInterval(() => {
          if (!el.isConnected) { stop(); return; }
          sec = Math.min(total() * 60, sec + ($('.df-fast').checked ? 10 : 1));
          if (sec >= total() * 60) stop();
          drawBar();
        }, 1000);
      };
      $('.df-reset').onclick = () => { stop(); sec = 0; $('.df-go').textContent = 'Timer start'; draw(); };
      $('.df-p').querySelectorAll('.chip').forEach(c => c.onclick = () => {
        pi = +c.dataset.i; si = 0; reveal = false;
        $('.df-p').querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === c));
        draw();
      });
      $('.df-len').querySelectorAll('.chip').forEach(c => c.onclick = () => {
        len = +c.dataset.l;
        $('.df-len').querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === c));
        if (sec > total() * 60) sec = total() * 60;
        draw();
      });
      draw();
    }},
    { type: 'callout', tone: 'tip', title: 'Practice ka tareeka (roadmap ka)', html: `Phase 8 ke har real system ke liye: pehle khud kaagaz pe <strong>40 minute</strong> framework ke saath design karo, <em>phir</em> course lesson ya company ka engineering blog padh ke compare karo. Pehle padh liya to tum sirf yaad kar rahe ho, design nahi.` },

    { type: 'callout', tone: 'why', title: 'Decide: har stage pe ek sawaal', html: `Atak jao to yahi poochho:<br>
      <strong>1. Requirements:</strong> "Kya mujhe pata hai kya banana hai, kya <em>nahi</em> banana, aur kitna fast/bada/reliable?"<br>
      <strong>2. Estimate:</strong> "Kya ye number koi design decision badalta hai?" Nahi to skip.<br>
      <strong>3. Entities + API:</strong> "Kya har functional requirement ka ek endpoint ya event hai?"<br>
      <strong>4. HLD:</strong> "Kya ye sabse simple design hai jo har FR poori kare, aur kya maine ek request end to end chalayi?"<br>
      <strong>5. Deep dives:</strong> "Kaunsa NFR abhi toot-ta hai, aur kaunsa box mar jaaye to kya hoga?"<br>
      <strong>6. Wrap up:</strong> "Maine kya chhoda, kyun, aur kya dekh ke pata chalega ki ye kaam kar raha hai?"<br><br>
      Aur ek rule jo sab pe lagta hai: <strong>har box ka ek reason ho, aur har reason ki ek keemat.</strong>` },

    { type: 'diagram', title: 'Poora method, ek nazar mein', height: 650,
      caption: 'Baayein: 6 steps, order mein. Daayein: har step ke end mein board pe kya likha hona chahiye. Dotted line: deep dive ka agenda Step 1 ke NFRs se aata hai.',
      groups: [
        { label: 'Steps (order mein)', x: 10, y: 20, w: 300, h: 610 },
        { label: 'Output (board pe kya bana)', x: 330, y: 20, w: 380, h: 610 },
      ],
      nodes: [
        { id: 's1', label: '1. Requirements', sub: '≈5 min', x: 200, y: 80, w: 180, kind: 'client', info: 'Ye kya hai: pehla step, jisme poochhte ho kya banana hai. Kyun: iske bina pata nahi kya estimate karna hai ya kaunse boxes chahiye. FR, out of scope, aur NFR numbers ke saath.' },
        { id: 's2', label: '2. Estimate', sub: '≈3-5 min', x: 200, y: 180, w: 180, kind: 'net', info: 'Ye kya hai: mote mote numbers (QPS, read:write, storage, connections). Kyun: 10x-100x ka farq design badalta hai. Har number ke baad ek faisla.' },
        { id: 's3', label: '3. Entities + API', sub: '≈5 min', x: 200, y: 280, w: 180, kind: 'data', info: 'Ye kya hai: main nouns (User, Paste) aur endpoints/events. Kyun: boxes inhi requests aur data ko serve karte hain. Har FR ka ek endpoint.' },
        { id: 's4', label: '4. High-level design', sub: '≈10-15 min', x: 200, y: 380, w: 180, kind: 'server', info: 'Ye kya hai: sabse simple boxes ka design jo har FR chala de (client → LB → services → DB). Kyun: deep dive ke liye pehle ek chalta hua design chahiye. Ek request end to end bolo.' },
        { id: 's5', label: '5. Deep dives', sub: '≈15-20 min', x: 200, y: 480, w: 180, kind: 'threat', info: 'Ye kya hai: NFRs pe wapas jaake hot spots, bottlenecks, SPOFs, consistency aur failures theek karna. Kyun: yahi sabse bada hissa hai aur seniority yahin dikhti hai.' },
        { id: 's6', label: '6. Wrap up', sub: '≈3-5 min', x: 200, y: 580, w: 180, kind: 'cache', info: 'Ye kya hai: aakhri summary. Kyun: interviewer ko dikhe ki tum design ki seemaayein jaante ho: trade-offs, monitoring, aur zyada time hota to kya karte.' },
        { id: 'o1', label: 'FR + Out of scope + NFR', sub: 'har NFR mein ek number', x: 515, y: 80, w: 330, kind: 'client', info: 'Ye kya hai: Step 1 ka output. Teen chhoti lists. Example: "paste banao, padho, expiry | Out: login | p99 < 200 ms, 99.9%, eventual OK".' },
        { id: 'o2', label: '3-4 numbers + faisle', sub: '"10k reads/s, matlab cache"', x: 515, y: 180, w: 330, kind: 'net', info: 'Ye kya hai: Step 2 ka output. Har number ke saath "matlab...". Jo number koi faisla nahi badalta, wo skip.' },
        { id: 'o3', label: 'Entities + endpoints', sub: 'har FR ka ek endpoint ya event', x: 515, y: 280, w: 330, kind: 'data', info: 'Ye kya hai: Step 3 ka output. 2-4 entities 3-4 fields ke saath, aur POST/GET jaise endpoints. user_id token se, body se nahi.' },
        { id: 'o4', label: '4-7 boxes ka diagram', sub: 'ek request end to end chali', x: 515, y: 380, w: 330, kind: 'server', info: 'Ye kya hai: Step 4 ka output. Simple boxes, har box ka reason, aur "deep dive mein dekhenge" ki chhoti list.' },
        { id: 'o5', label: 'Fixes + unki keemat', sub: 'hot spot, SPOF, consistency', x: 515, y: 480, w: 330, kind: 'threat', info: 'Ye kya hai: Step 5 ka output. Naye boxes (cache, replica, queue...) aur har ek ke saath ek trade-off. 2-3 deep dives kaafi.' },
        { id: 'o6', label: '3 trade-offs + metrics', sub: 'aur "zyada time hota to..."', x: 515, y: 580, w: 330, kind: 'cache', info: 'Ye kya hai: Step 6 ka output. 30-60 second ka summary: kya chhoda aur kyun, kya monitor karoge, agla kaam kya.' },
      ],
      edges: [
        { a: 's1', b: 's2', n: 1 }, { a: 's2', b: 's3', n: 2 }, { a: 's3', b: 's4', n: 3 }, { a: 's4', b: 's5', n: 4 }, { a: 's5', b: 's6', n: 5 },
        { a: 's1', b: 'o1' }, { a: 's2', b: 'o2' }, { a: 's3', b: 'o3' }, { a: 's4', b: 'o4' }, { a: 's5', b: 'o5' }, { a: 's6', b: 'o6' },
        { a: 's1', b: 's5', dashed: true, kind: 'evt', label: 'NFR = agenda', via: [[50, 80], [50, 480]] },
      ],
      paths: [
        { name: 'Order', text: 'Requirements → Estimate → Entities + API → HLD → Deep dives → Wrap up. Har step agle ka input hai; ulta chalao to har step andaaze pe chalta hai.', go: ['s1>s2>s3>s4>s5>s6'] },
        { name: 'Har step ka output', text: 'Har step ke end mein board pe ek cheez likhi honi chahiye. Agar output nahi bana, wo step adhoora hai.', go: ['s1>o1', 's2>o2', 's3>o3', 's4>o4', 's5>o5', 's6>o6'] },
        { name: 'NFR → deep dive', text: 'Deep dive ka agenda tum khud nahi gadhte. Step 1 ke NFR numbers hi batate hain ki design kahan toot-ta hai.', go: ['o1>s1>s5>o5'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Order fix hai: <strong>Requirements → Estimate → Entities + API → HLD → Deep dives → Wrap up</strong>. Har step agle ka input.</li>
      <li>Requirements = FR (kya karta hai) + <strong>out of scope</strong> + NFR (kaisa hai) <strong>numbers ke saath</strong>. "Fast" nahi, "p99 &lt; 200 ms".</li>
      <li>Estimate mein 3-4 numbers, har ek ke baad <strong>"matlab..."</strong>. Jo number faisla nahi badalta, skip.</li>
      <li>Har FR ka ek endpoint ya event. user_id auth token se, body se kabhi nahi.</li>
      <li>HLD = <strong>sabse simple</strong> design jo har FR chala de, aur ek request end to end bolke chalao.</li>
      <li>Deep dives sabse bada hissa (~35%): NFRs pe wapas jao, hot spot / bottleneck / SPOF dhoondho, har fix ki keemat bolo.</li>
      <li>Wrap up: 3 trade-offs, 2-3 metrics, "zyada time hota to". Ghadi dekho: ~25 min tak HLD khatam.</li>
      <li>Har box ka ek reason ho, aur har reason ki ek keemat.</li>
    </ul>` },

    { type: 'h2', text: 'Trade-offs: framework follow karne ke' },
    { type: 'tradeoffs',
      gains: ['Koi zaroori hissa (requirements, failures, trade-offs) nahi chhoot-ta', 'Time sahi jagah jaata hai: deep dives ko sabse bada hissa milta hai', 'Har box ka reason dikhta hai, isliye "kyun?" ka jawab hamesha ready', 'Interviewer ko pata rehta hai tum kahan ho, aur woh beech mein steer kar sakta hai', 'Office ke real design docs ka bhi yahi structure: requirements, estimates, API, design, risks'],
      costs: ['Rigid ho jaao to interviewer ke hint miss ho sakte hain; framework guide hai, jail nahi', 'Kuch problems (data pipelines, rate limiter jaise building blocks) mein API ya estimate ka roop alag hota hai; adapt karna padta hai', 'Shuru ke 15 minute "boring" lagte hain aur jaldi boxes banane ka mann karta hai', 'Time budget practice ke bina kaam nahi karta: ghadi ke saath kai baar karna padta hai'] },

    { type: 'think', questions: [
      { q: 'Interviewer bolta hai "Instagram design karo" aur kuch nahi batata. Pehle 2 minute mein kya bologe?', a: 'Koi box nahi. Pehle scope: "Instagram bahut bada hai. Main teen core features lunga: photo upload, follow, home feed. Stories, DMs, reels, search out of scope, theek hai?" Phir NFRs ke liye assumptions: "~500M DAU, feed ~500 ms mein, post kuch seconds late dikhe to chalega, photos kabhi na khoyein." Interviewer haan ya na bolega, aur tumhara scope fix ho gaya.' },
      { q: 'Tumhare estimate ne bola "sirf 50 writes/s aur 500 reads/s". Iska design pe kya asar hona chahiye?', a: 'Ye chhota system hai. Ek primary DB + ek replica (availability ke liye), 2-3 stateless app servers behind LB kaafi hain. Sharding, Kafka, multi-region nahi chahiye, aur ye bolna bhi achha answer hai: "Is scale pe sharding ki zaroorat nahi; agar 100x badhe to pehle read replicas aur cache, phir sharding." Over-engineering na karna bhi ek skill hai.' },
      { q: 'HLD ke baad 20 minute bache hain, aur tumhari NFR list mein 6 cheezein hain. Kaise chunoge ki kis pe deep dive karna hai?', a: 'Risk ke hisaab se: kaunsa NFR is design mein sabse pehle toot-ega aur toot-ne pe sabse zyada nuksaan karega? Usually: (1) jo estimate ka sabse bada number hai (hot reads, lakhon connections), (2) jo data khone ya galat dikhne se juda hai (durability, consistency), (3) koi saaf SPOF. 2-3 chuno, interviewer se confirm karo, baaki wrap up mein ek line mein.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Framework ka sahi order kya hai?', options: ['HLD → requirements → estimate → deep dives', 'Requirements → estimate → entities + API → HLD → deep dives → wrap up', 'Estimate → HLD → API → requirements', 'Deep dives → HLD → wrap up'], answer: 1, explain: 'Har step agle ka input hai: requirements se pata chalta hai kya estimate karna hai, numbers se pata chalta hai kaunse boxes chahiye, aur simple design ke baad hi deep dive mein uski kamzoriyan dikhti hain.' },
      { q: '45-60 minute interview mein sabse zyada time kis stage ko milna chahiye?', options: ['Requirements', 'Estimate', 'Deep dives (≈15-20 min)', 'Wrap up'], answer: 2, explain: 'Deep dives mein NFRs pe wapas jaake hot spots, bottlenecks, SPOFs aur failures theek karte ho. Roadmap ke shabdon mein, seniority yahin dikhti hai.' },
      { q: 'Estimate stage ka sabse achha output kya hai?', options: ['Bahut saare exact numbers', '3-4 numbers aur har ek ke saath design conclusion ("10k reads/s, matlab cache")', 'Sirf DAU', 'Server ka exact model'], answer: 1, explain: 'Number tabhi kaam ka hai jab wo koi decision badle. 10 minute ka calculation bina conclusion ke ek common beginner mistake hai.' },
      { q: 'High-level design mein Kafka kab laana chahiye?', options: ['Hamesha, ye best practice hai', 'Jab koi requirement ya number use maange (jaise kaam jo response ke liye zaroori nahi, spikes, kai consumers)', 'Kabhi nahi', 'Sirf jab interviewer bole'], answer: 1, explain: 'Pehle simple design jo har FR poori kare. Har naya box kisi problem ke reason se aata hai. Bina reason ke Kafka/microservices = roadmap ki pehli common mistake.' },
      { q: 'Inme se kaunsa ek achha non-functional requirement hai?', options: ['System scalable hona chahiye', 'Users video upload kar sakein', '99% video pages 300 ms se kam mein khulein', 'Achha user experience'], answer: 2, explain: 'NFR ek quality hai aur usme number hona chahiye. "Scalable" aur "achha experience" mein number nahi, isliye unse koi faisla nahi nikalta. "Video upload" ek feature (FR) hai.' },
      { q: 'Wrap up mein kya NAHI chahiye?', options: ['Trade-offs jo tumne liye', 'Kya monitor karoge', 'Zyada time hota to kya karte', '"Ye design scalable aur highly available hai" bina kisi detail ke'], answer: 3, explain: 'Generic daawe kuch nahi batate. Specific trade-offs, metrics aur next steps batate hain ki tum design ki seemaayein samajhte ho.' },
    ]},
    { type: 'sources', note: 'Framework aur time budget course ke roadmap PDF (phase 7) se hain; neeche ke sources se cross-check kiya.', items: [
      { title: 'System Design Interview Delivery Framework', publisher: 'Hello Interview', url: 'https://www.hellointerview.com/learn/system-design/in-a-hurry/delivery', used: 'Stages (requirements, core entities, API, high-level design, deep dives), ~5 min requirements, estimates only when they change the design, user id from auth token, keep requirements short.' },
      { title: 'System Design Interview: An Insider\'s Guide (chapter: a framework for system design interviews)', publisher: 'The Pragmatic Engineer (review of Alex Xu\'s book, 2020)', url: 'https://blog.pragmaticengineer.com/system-design-interview-an-insiders-guide-review/', used: 'Review describing the book\'s similar 4-step process (scope, high-level design, deep dive, wrap up) and its hour-long split: 10-15 min high-level design, 10-25 min deep dive, a few minutes to wrap up. Used to sanity-check our budget.' },
    ]},
  ],
});
