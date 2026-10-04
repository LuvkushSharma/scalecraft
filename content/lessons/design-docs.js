Lesson.register({
  id: 'design-docs',
  title: 'Google Docs',
  minutes: 40,
  summary: `xyz.com Docs: teen log ek hi paragraph mein ek saath type kar rahe hain, aur aakhir mein sabki screen pe <em>bilkul same</em> document chahiye. Per-document session routing, naive merge kyun tootta hai, Operational Transformation (Google Docs ka tareeka) vs CRDTs (khud chala ke), operation log + snapshots, version history, presence aur cursors, offline edits, aur permissions.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Socho tum aur tumhara dost ek hi school project ki file pe kaam kar rahe ho, do alag laptops pe, ek hi waqt.<br>Tum ek line likhte ho, wo usi line mein ek word jodta hai. Dono ko ek doosre ka kaam turant dikhna chahiye.<br>Aakhir mein dono ki screen pe <strong>bilkul ek jaisa</strong> document hona chahiye, aur kisi ka likha hua gayab nahi hona chahiye.<br>Ye lesson sikhata hai ki Google Docs jaisa app ye kaise karta hai: zero se, ek-ek problem leke.` },
    { type: 'callout', tone: 'tip', title: 'Pehle khud try karo', html: `10 minute kaagaz pe socho: document mein "I like tea" likha hai. Riya aur Aman dono ek hi millisecond mein "tea" se pehle kuch type karte hain: Riya "green ", Aman "hot ". Network ki wajah se dono ko ek doosre ka edit thodi der baad milta hai. Dono ki screen pe aakhir mein kya dikhega? Same dikhega? Phir yahan compare karo.` },
    { type: 'p', html: `Ye lesson <a href="#/realtime">WebSockets</a> aur <a href="#/consistency">consistency</a> lesson ke CRDT hisse pe tika hai. Google ne 2010 mein Google Drive blog pe teen posts ki series likhi thi ki naya Google Docs editor collaboration kaise karta hai (operational transformation aur ek client-server protocol). Wo 15 saal purani hai, aur Google ka aaj ka internal design public nahi; lekin core idea aaj bhi wahi padhaya jaata hai. Saath mein Figma ki 2019 aur 2022 ki engineering posts (unka multiplayer system), Google Wave ka OT whitepaper (2010), aur Martin Kleppmann ka CRDT research use karenge.` },

    { type: 'h2', text: 'Step 0: zero se, ek document aur do log' },
    { type: 'p', html: `Design se pehle sabse simple tareeka socho. Document server pe ek file hai. Tum file kholte ho, poora text tumhare browser mein aa jaata hai. Tum type karte ho. "Save" dabaate ho to <strong>poora document</strong> wapas server pe chala jaata hai, aur server purani file ko nayi se badal deta hai.` },
    { type: 'p', html: `Jab tak ek hi insaan edit kar raha hai, ye bilkul theek chalta hai. Ab do log ek saath edit karein. Riya aur Aman dono ne "I like tea" khola. Riya ne "green " joda, Aman ne "hot " joda. Dono ne Save dabaya. Server ke paas do poore documents aaye. Wo kya kare? Sabse aasaan rule: <strong>jo baad mein aaya, wahi rakho</strong>.` },
    { type: 'callout', tone: 'term', title: 'Naya word: last-write-wins (LWW)', html: `<strong>Ye kya hai:</strong> conflict ka sabse simple rule. Do log ek hi cheez badlein, to jiska save server pe <em>baad mein</em> pahuncha, sirf wahi bachta hai.<br><strong>Kyun log ise chunte hain:</strong> likhna bahut aasaan hai, aur kuch cheezon ke liye theek hai (jaise profile photo, ya ek shape ka colour).<br><strong>Iske bina (aur iske saath bhi):</strong> text ke liye ye toot jaata hai. Pehle wale ka <em>poora</em> edit chupchaap gayab, bina kisi error ke. Neeche khud karke dekho.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">
          <div><label for="docs-lw-a">Riya ki screen (type karke badlo)</label><input id="docs-lw-a" class="docs-lwa" type="text" maxlength="40" value="I like green tea" style="width:100%;font-family:var(--f-mono)"><button type="button" class="btn small primary docs-lsa" style="margin-top:6px">Riya: Save</button></div>
          <div><label for="docs-lw-b">Aman ki screen (type karke badlo)</label><input id="docs-lw-b" class="docs-lwb" type="text" maxlength="40" value="I like hot tea" style="width:100%;font-family:var(--f-mono)"><button type="button" class="btn small primary docs-lsb" style="margin-top:6px">Aman: Save</button></div>
        </div>
        <div class="stats" style="margin-top:10px"><div class="stat"><span>Server pe document</span><strong class="docs-lsrv" style="font-family:var(--f-mono)"></strong></div><div class="stat"><span>Kiska save jeeta</span><strong class="docs-lwho"></strong></div></div>
        <div style="margin-top:6px"><button type="button" class="btn small ghost docs-lrs">Reset</button></div>
        <div class="calc-note docs-lnote"></div>`;
      const BASE = 'I like tea';
      let srv = BASE, who = '-', saves = [];
      const words = s => s.split(/\s+/).filter(Boolean);
      const added = s => { const b = words(BASE).slice(); return words(s).filter(w => { const i = b.indexOf(w); if (i >= 0) { b.splice(i, 1); return false; } return true; }); };
      const lost = (mine, final) => { const f = words(final); return added(mine).filter(w => { const i = f.indexOf(w); if (i >= 0) { f.splice(i, 1); return false; } return true; }); };
      const upd = () => {
        el.querySelector('.docs-lsrv').textContent = '"' + srv + '"';
        el.querySelector('.docs-lwho').textContent = who;
        const A = el.querySelector('.docs-lwa').value, B = el.querySelector('.docs-lwb').value;
        let n;
        if (saves.length < 2) n = saves.length === 0 ? 'Abhi kisi ne save nahi kiya. Dono buttons dabao, kisi bhi order mein.' : 'Ek save ho gaya. Ab doosre ka Save dabao.';
        else {
          const la = lost(A, srv), lb = lost(B, srv);
          const parts = [];
          if (la.length) parts.push(`Riya ka likha "${la.join(' ')}" gayab`);
          if (lb.length) parts.push(`Aman ka likha "${lb.join(' ')}" gayab`);
          n = parts.length ? `Dono ne save kiya, lekin server ne sirf ${who} ka poora document rakha. ${parts.join(', ')}. Kisi ko error nahi mila. Ye hai last-write-wins ka nuksaan.` : 'Is baar kuch nahi khoya, kyunki dono ne ek hi text likha (ya kuch joda hi nahi). Alag alag jagah alag words jodo aur phir try karo.';
        }
        el.querySelector('.docs-lnote').textContent = n;
      };
      const save = (name, val) => { srv = val; who = name; saves.push(name); if (saves.length > 2) saves = saves.slice(-2); upd(); };
      el.querySelector('.docs-lsa').addEventListener('click', () => save('Riya', el.querySelector('.docs-lwa').value));
      el.querySelector('.docs-lsb').addEventListener('click', () => save('Aman', el.querySelector('.docs-lwb').value));
      el.querySelector('.docs-lrs').addEventListener('click', () => { srv = BASE; who = '-'; saves = []; upd(); });
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd));
      upd();
    }},
    { type: 'p', html: `Ab socho, Riya save ke baad 1 ghanta aur likhti hai, aur Aman 1 second baad ek comma badal ke save karta hai. Riya ka ek ghante ka kaam gayab. Isliye collaborative text editor mein <strong>LWW mana hai</strong>. Hume teen badlaav chahiye, aur har badlaav ek naya hissa (component) laayega:` },
    { type: 'list', ordered: true, items: [
      `<strong>Poora document mat bhejo, sirf badlaav bhejo.</strong> "Position 7 pe 'hot ' daalo" jaisa chhota message. Isse <em>operation</em> kehte hain (neeche card hai). Server dono badlaav jod sakta hai, ek ko phenkna nahi padta.`,
      `<strong>Save button hatao, har badlaav turant bhejo.</strong> Iske liye browser aur server ke beech ek khula connection chahiye: <a href="#/realtime">WebSocket</a>.`,
      `<strong>Ek "referee" rakho jo order tay kare.</strong> Do badlaav ek saath aayein to koi ek tay kare ki pehle kaun, aur doosre ko adjust kare. Ye hoga ek document ka <em>session server</em>, aur adjust karne ka tareeka <em>Operational Transformation</em> ya <em>CRDT</em>.`,
    ]},
    { type: 'callout', tone: 'term', title: 'Yaad dilaana: WebSocket', html: `<strong>Ye kya hai:</strong> browser aur server ke beech ek connection jo khula rehta hai, aur dono taraf se kabhi bhi message bhej sakte hain (<a href="#/realtime">Real-time lesson</a> mein detail).<br><strong>Kyun chahiye:</strong> har keystroke ka chhota message turant jaana chahiye, aur doosron ke edits server se bina maange aane chahiye.<br><strong>Iske bina:</strong> browser ko har second server se poochna padta "kuch naya?" (polling). Ye slow bhi hai aur server pe bekaar load bhi.` },

    { type: 'h2', text: 'Step 1: requirements' },
    { type: 'compare',
      left: { title: 'Functional', html: `• Document banao, kholo, edit karo (text + formatting)<br>• Kai log ek saath edit karein, ek doosre ka typing live dikhe<br>• Doosron ke cursors aur naam dikhein (presence)<br>• Share: viewer / commenter / editor<br>• Version history ("kal shaam wala version")<br>• Internet gaya to bhi type karte raho, wapas aane pe sync<br><br><strong>Out of scope:</strong> spreadsheets ke formulas, comments ka detail, search` },
      right: { title: 'Non-functional', html: `• <strong>Convergence</strong>: sab edits pahunchne ke baad sabki copy bilkul same<br>• Apna typing turant dikhe (network ka intezaar nahi)<br>• Doosron ke edits ~100s of ms mein<br>• Koi acknowledged edit kabhi na khoye<br>• User ka <em>intent</em> bache (jo likha wahi jagah pe)<br>• Ek popular doc pe 100+ editors bhi chal jaaye` },
    },
    { type: 'callout', tone: 'term', title: 'Naya word: convergence', html: `<strong>Ye kya hai:</strong> har editor ke browser mein document ki apni copy hoti hai, aur edits alag alag order mein pahunch sakte hain. <strong>Convergence</strong> ka matlab: jab saare edits sab tak pahunch jaayein, to har copy <strong>character-by-character same</strong> ho.<br><strong>Kyun chahiye:</strong> agar Riya ki screen pe "green hot tea" aur Aman ki pe "hot green tea" reh gaya, to dono alag document pe kaam kar rahe hain aur unhe pata bhi nahi.<br><strong>Iske bina:</strong> copies chupchaap alag ho jaati hain (diverge), aur aage ke saare edits galat jagah lagte hain.<br><strong>Doosri shart, intent preservation:</strong> merge ke baad bhi har user ka edit wahin ho jahan usne socha tha, aur kisi ka text gayab na ho (LWW yahi tod deta hai).` },

    { type: 'h2', text: 'Step 2: napkin maths' },
    { type: 'p', html: `Maan lo xyz.com Docs pe peak pe 10 lakh documents ek saath khule hain, average 2 editors per doc, aur ek typing user ~5 characters/second. Agar har keystroke ek operation hai to 10 lakh × 2 × 5 = <strong>1 crore ops/second</strong> poore system mein. Lekin ek <em>document</em> ke andar sirf ~10 ops/second. Ye do numbers poora design tay karte hain: total load bahut bada (bahut servers chahiye), lekin <strong>har document chhota aur independent</strong> hai. To documents ko servers pe baant do, aur ek document ka kaam ek hi jagah karo. (Ye "maan lo" numbers hain, Google ke nahi.)` },
    { type: 'h2', text: 'Step 3: API aur data model' },
    { type: 'p', html: `Document kholna aur list dekhna normal REST hai. Editing ek lambe khule <a href="#/realtime">WebSocket</a> pe hoti hai, kyunki dono taraf se chhote messages lagaataar chalte hain. Har edit ek <strong>operation</strong> hai, poora document nahi:` },
    { type: 'callout', tone: 'term', title: 'Naya word: operation (op)', html: `<strong>Ye kya hai:</strong> document ka ek chhota badlaav, data ki tarah likha hua. Jaise <code>{InsertText 'hot ' @7}</code>: "position 7 pe 'hot ' daalo". Position = shuru se kitne characters ke baad (I=0, space=1, l=2 ... "tea" ka t = 7).<br><strong>Kyun chahiye:</strong> do logon ke ops ko jodna mumkin hai (dono ka text rakho), jabki do poore documents mein se ek hi chun sakte the. Aur network pe 4 characters jaate hain, 50 page nahi.<br><strong>Iske bina:</strong> wapas LWW, aur kisi ka kaam gayab.<br><strong>Example:</strong> Google ke 2010 ke post ke mutabik Google Docs mein saare edits teen basic types mein toot jaate the: <strong>InsertText</strong>, <strong>DeleteText</strong> aur <strong>ApplyStyle</strong> (text ke range pe bold, colour waghera).` },
    { type: 'callout', tone: 'term', title: 'Naya word: rev (revision number)', html: `<strong>Ye kya hai:</strong> server har accepted op ko document ke andar ek badhta number deta hai: 1, 2, 3... Jaise register mein har entry ka serial number.<br><strong>Kyun chahiye:</strong> client bata sake "maine ye op rev 17 dekh ke banaya" (isse <code>base_rev</code> kehte hain). Server dekhta hai ki tab se beech mein kaunse naye ops aa chuke hain, aur unke hisaab se adjust karta hai. Reconnect pe client bolta hai "main rev 120 tak dekh chuka hoon, aage ka do".<br><strong>Iske bina:</strong> kisi ko pata nahi ki doosre ne kya dekha tha, to adjust karna aur resume karna dono namumkin.` },
    { type: 'code', text: `
GET  /api/docs/42                     → { title, role: "editor", snapshot_rev: 5000, ... }
WS   /api/docs/42/session             (doc 42 ke session server tak route hota hai)

Client → server:  { "type": "op",  "base_rev": 17, "op": {"insert": "hot ", "at": 7}, "client_op_id": "r-31" }
Server → client:  { "type": "ack", "client_op_id": "r-31", "rev": 18 }
Server → others:  { "type": "op",  "rev": 18, "op": {"insert": "hot ", "at": 7}, "by": "riya" }
Both ways:        { "type": "presence", "user": "riya", "cursor": 11, "color": "violet" }   (save nahi hota)` },
    { type: 'p', html: `Upar ke messages mein do naye words hain. <strong>ack</strong> (acknowledgement) = server ka jawab "tumhara op mil gaya, safe hai, aur iska rev 18 hai". <strong>presence</strong> = "kaun document mein hai aur uska cursor kahan hai". Neeche data model mein teen aur cheezein aayengi; pehle unhe seedhe shabdon mein samjho:` },
    { type: 'callout', tone: 'term', title: 'Naye words: op log, snapshot, presence', html: `<strong>Op log</strong><br><strong>Ye kya hai:</strong> ek list jisme har accepted op rev number ke saath, ek ke baad ek, likha jaata hai. Sirf aakhir mein jodte hain (append-only), beech mein kabhi badalte nahi.<br><strong>Kyun chahiye:</strong> server crash ho jaaye to bhi saare edits bache rahein; purana version dekhna ho to log se dobara bana lo.<br><strong>Iske bina:</strong> server ki memory gayi to edits gaye, aur "kal wala version" kabhi nahi milega.<br><br><strong>Snapshot</strong><br><strong>Ye kya hai:</strong> kisi rev pe poore document ki ek photo (copy), jaise "rev 5000 pe document aisa tha".<br><strong>Kyun chahiye:</strong> document kholne ke liye shuru se 10 lakh ops dobara lagane (replay) ki jagah, latest photo + uske baad ke thode ops.<br><strong>Iske bina:</strong> purane documents bahut der mein khulenge.<br><br><strong>Presence</strong><br><strong>Ye kya hai:</strong> abhi kaun document mein hai, kiska cursor kahan hai, kisne kya select kiya.<br><strong>Kyun chahiye:</strong> doosre ka cursor dikhe to log ek doosre ke upar type nahi karte.<br><strong>Iske bina:</strong> editing andhere mein. Lekin ise save karne ki zaroorat nahi, isliye ye disk pe nahi jaata.` },
    { type: 'table', head: ['Data', 'Fields', 'Kahan'], rows: [
      ['Document', 'doc_id, title, owner, created_at, latest_rev', 'SQL / metadata DB'],
      ['Permission', 'doc_id, principal (user/group/link), role (viewer/commenter/editor)', 'SQL, cache ke saath'],
      ['Operation log', 'doc_id, rev (1, 2, 3...), op, user, timestamp', 'Append-only, partition key doc_id'],
      ['Snapshot', 'doc_id, rev, poore document ka encoded state', 'Object storage (blob) + index'],
      ['Presence', 'doc_id, user, cursor, selection, color', 'Sirf memory / pub/sub, kabhi disk nahi'],
    ]},
    { type: 'p', html: `<strong>rev</strong> yahan dil hai. Client batata hai "maine ye op rev 17 dekh ke banaya" (<code>base_rev</code>), aur server tay karta hai ki ye rev 18 banega, ya beech mein kisi aur ke ops aa chuke hain jinke hisaab se ise adjust karna hai. Google ke 2010 protocol mein bhi server ek <strong>revision log</strong> rakhta tha aur client yaad rakhta tha ki usne aakhri kaunsa revision dekha.` },

    { type: 'h2', text: 'Step 4: high-level design, ek document = ek ghar' },
    { type: 'p', html: `Pehla idea: normal stateless servers ke peeche load balancer, har op DB mein likho. Problem: Riya ka op server 1 pe, Aman ka op usi millisecond mein server 2 pe. Dono servers alag order mein ops accept karte hain, aur ab koi ek "sach" nahi hai ki pehle kya hua. Har op pe DB mein lock ya cross-server coordination bahut slow hogi.` },
    { type: 'callout', tone: 'term', title: 'Naya word: session server (document ka owner)', html: `<strong>Ye kya hai:</strong> ek server jo kisi document ka "referee" hai. Wo document ko apni memory (RAM) mein khula rakhta hai, har aane wale op ko rev number deta hai, zaroorat ho to adjust karta hai, aur sabko bhejta (broadcast karta) hai. Ek document ka ek hi owner; lekin ek server pe hazaaron alag documents ho sakte hain.<br><strong>Kyun chahiye:</strong> "pehle kaun aaya" ka ek hi jawab chahiye. Ek jagah faisla ho to wo jawab ek hi hoga.<br><strong>Iske bina:</strong> do servers ek hi document ke ops alag order mein accept karenge, aur document ke do alag itihaas ban jaayenge.` },
    { type: 'callout', tone: 'term', title: 'Naya word: per-document session routing', html: `<strong>Ye kya hai:</strong> ek router jo har WebSocket connection ka <code>doc_id</code> dekh ke use us document ke owner session server pe bhejta hai. Mapping ya to <a href="#/consistent-hashing">consistent hashing</a> se (doc_id ka hash → server), ya ek chhoti table (registry) se: "doc 42 → server 1".<br><strong>Kyun chahiye:</strong> normal load balancer har request kisi bhi server pe bhej deta hai. Yahan ek document ke saare editors <em>ek hi</em> server pe chahiye.<br><strong>Iske bina:</strong> Riya server 1 pe, Aman server 2 pe, aur do "referee" aapas mein ladte rahenge.` },
    { type: 'p', html: `Solution: <strong>ek document ke saare editors ek hi session server pe</strong>, router <code>doc_id</code> se server chunta hai. Alag documents alag servers pe, to total load bhi bant jaata hai. Figma ne 2019 mein likha tha ki unke yahan har multiplayer document ke liye server pe ek alag process hota hai, aur wahi us document ka authority hai. Google ke apne routing ki detail public nahi; ye aam industry pattern hai.` },
    { type: 'flow', title: 'Doc 42: routing, op log aur failover', height: 350,
      nodes: [
        { id: 'r', label: 'Riya', sub: 'editor', x: 75, y: 90, w: 120, kind: 'client', info: 'Ye kya hai: Riya ka browser (client). Document ki apni copy rakhta hai, apne edits turant apni screen pe lagata hai (server ka intezaar nahi), aur ops WebSocket pe bhejta hai.' },
        { id: 'a', label: 'Aman', sub: 'editor', x: 75, y: 260, w: 120, kind: 'client', info: 'Ye kya hai: Aman ka browser. Same document, apni copy. Doosron ke ops server se aate hain aur wo apni copy pe lagata hai.' },
        { id: 'lb', label: 'Doc router', sub: 'doc_id → server', x: 250, y: 175, w: 130, kind: 'net', info: 'Ye kya hai: wo router jo har WebSocket connection ko doc_id ke hisaab se sahi session server pe bhejta hai. Mapping consistent hashing se ya ek chhoti registry (doc 42 → srv 1) se. Server badla to registry update.' },
        { id: 's1', label: 'Session srv 1', sub: 'doc 42 in memory', x: 450, y: 90, w: 150, kind: 'server', info: 'Ye kya hai: doc 42 ka owner (referee). Document memory mein, ops ko rev number deta hai, zaroorat ho to transform karta hai, op log mein likhta hai, sabko broadcast karta hai. Ek doc ke liye ek hi owner, isliye order ka ek hi sach.' },
        { id: 's2', label: 'Session srv 2', sub: 'other docs', x: 450, y: 260, w: 150, kind: 'server', info: 'Ye kya hai: ek aur session server, jo doosre documents ka owner hai. Srv 1 mara to doc 42 ki zimmedari isko mil sakti hai.' },
        { id: 'log', label: 'Op log', sub: 'append-only', x: 630, y: 90, w: 140, kind: 'data', info: 'Ye kya hai: append-only list jisme har accepted op (doc_id, rev, op, user) likha jaata hai. Ack se pehle yahan durable likha jaata hai, taaki server crash pe bhi acknowledged edit na khoye. Version history bhi isi se.' },
        { id: 'snap', label: 'Snapshots', sub: 'object storage', x: 630, y: 260, w: 140, kind: 'data', info: 'Ye kya hai: document ki photos. Har kuch hazaar ops (ya kuch seconds) pe poore document ki copy, rev number ke saath. Document kholne pe: latest snapshot + uske baad ke ops replay.' },
      ],
      edges: [{ a: 'r', b: 'lb' }, { a: 'a', b: 'lb' }, { a: 'lb', b: 's1' }, { a: 'lb', b: 's2' }, { a: 's1', b: 'log' }, { a: 's1', b: 'snap' }, { a: 's2', b: 'snap' }, { a: 's2', b: 'log' }],
      scenarios: [
        { name: 'Ek edit ka safar', steps: [
          { title: 'Riya type karti hai', text: 'Riya ki screen pe "hot " turant dikh gaya (optimistic). Op WebSocket pe nikla, base_rev 17 ke saath.', go: 'r>lb>s1', msg: '{ op: insert "hot " @7, base_rev: 17 }' },
          { title: 'Server order deta hai', text: 'Rev 17 ke baad koi aur op nahi aaya, to transform ki zaroorat nahi. Is op ko rev 18 mila.', focus: ['s1'], set: { s1: { sub: 'rev 18' } } },
          { title: 'Pehle durable', text: 'Ack bhejne se pehle op log mein append. Ab server mar bhi jaaye to ye edit bacha hai.', go: ['s1>log', 'res:log>s1'], msg: 'APPEND doc=42 rev=18 op=insert "hot " @7 by=riya' },
          { title: 'Ack aur broadcast', text: 'Riya ko ack (tumhara op rev 18 hai), Aman ko op khud. Aman apni copy pe lagata hai.', parallel: true, go: ['res:s1>lb>r', 's1>lb>a'], msg: 'riya ← ack r-31 rev 18\naman ← op rev 18 insert "hot " @7' },
        ]},
        { name: 'Bina doc routing', intro: 'Agar router doc_id na dekhe, normal round-robin kare, to?', steps: [
          { title: 'Riya srv 1 pe, Aman srv 2 pe', text: 'Dono ne ek saath type kiya. Riya ka op srv 1 pe, Aman ka srv 2 pe.', parallel: true, go: ['r>lb>s1', 'a>lb>s2'], set: { s2: { sub: 'doc 42 copy #2', state: 'warn' } } },
          { title: 'Do servers, do "rev 18"', text: 'Dono servers ne apne apne op ko rev 18 de diya aur log mein likhne chale. Ab ek hi document ke do alag itihaas. Kaun sahi? Bachne ke liye har op pe dono servers ko aapas mein lock/coordinate karna padega: har keystroke pe extra network round trip.', parallel: true, go: ['s1>log', 's2>log'], after: { log: { state: 'hot', sub: 'conflict!' } } },
          { title: 'Fix: doc_id se route', text: 'Router doc 42 ke saare connections srv 1 pe bhejta hai. Ek owner, ek order, koi cross-server lock nahi. Load phir bhi baantna hai, isliye alag documents alag servers pe.', set: { s2: { sub: 'other docs', state: '' }, log: { state: '', sub: 'append-only' } }, go: 'a>lb>s1' },
        ]},
        { name: 'Session server crash', steps: [
          { title: 'Srv 1 mara', text: 'Machine gayi. Riya aur Aman ke WebSockets toot gaye. Unke screens pe "reconnecting..." aur unke unacked ops local pending list mein safe hain.', set: { s1: { state: 'down', sub: 'DOWN' } }, go: ['lost:r>lb', 'lost:a>lb'] },
          { title: 'Naya owner', text: 'Health check fail. Router/registry doc 42 ko srv 2 ko de deta hai (lease, yaani kuch seconds ki "owner hone ki permission" jo renew karni padti hai; ya consistent hashing ring mein agla server).', set: { s2: { sub: 'doc 42 owner (new)' } }, focus: ['lb', 's2'] },
          { title: 'State wapas banao', text: 'Srv 2 latest snapshot (rev 5000) laata hai, phir op log se rev 5001 se aakhri rev tak saare ops replay. Memory mein document wapas wahi jo crash se pehle tha.', go: ['s2>snap', 'res:snap>s2', 's2>log', 'res:log>s2'], msg: 'load snapshot@5000; replay ops 5001..5212' },
          { title: 'Clients reconnect', text: 'Clients naye server se judte hain aur bolte hain "maine aakhri rev 5210 dekha tha". Server unhe beech ke ops bhejta hai, aur unke pending ops (purane base_rev ke saath) transform karke accept karta hai. Koi acked edit nahi khoya.', parallel: true, go: ['r>lb>s2', 'a>lb>s2'], after: { s2: { state: 'ok' } } },
        ]},
        { name: 'Snapshot banana', steps: [
          { title: 'Ops jama ho rahe hain', text: 'Doc 42 pe ek mahine mein lakhon ops. Har baar kholne pe sab replay karna slow hoga.', focus: ['log'] },
          { title: 'Snapshot likho', text: 'Har kuch hazaar ops (ya time interval) pe session server poore document ko encode karke object storage mein likhta hai, rev number ke saath. Figma ki 2022 post ke mutabik unka server har 30-60 second pe poori file ko binary encode + compress karke S3 mein likhta tha (checkpoint).', go: ['s1>snap', 'res:snap>s1'], msg: 'PUT snapshots/42@5000.bin' },
          { title: 'Purane ops?', text: 'Snapshot ke pehle wale ops replay ke liye ab zaroori nahi. Version history chahiye to rakho (sasta cold storage), warna compaction (purane, ab bekaar ops ko saaf karna) se hata do.', focus: ['log', 'snap'] },
        ]},
      ],
    },
    { type: 'h2', text: 'Deep dive 1: concurrent edits, naive vs OT vs CRDT' },
    { type: 'p', html: `Ek owner server order to de deta hai, lekin asli mushkil abhi baaki hai. Riya aur Aman dono apne edits <em>turant apni screen pe</em> lagate hain (warna typing lag karegi). Matlab jab Aman ka op Riya tak pahunchta hai, Riya ka document <strong>pehle hi badal chuka hai</strong>. Aman ka "position 7" ab Riya ke document mein galat jagah ho sakta hai. Google ke 2010 post ka example bhi yahi tha: ek user ne shuru mein 2 characters jode, doosre ka delete op bina badle lagaya to galat characters mit gaye.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Operational Transformation (OT)', html: `<strong>Ye kya hai:</strong> aane wale op ko <strong>adjust (transform)</strong> karna, un ops ke hisaab se jo us op ke banne ke baad, lekin uske pahunchne se pehle, lag chuke hain.<br><strong>Example:</strong> Aman ka <code>insert "hot " @7</code> aaya, lekin Riya pehle hi position 7 pe "green " (6 characters) daal chuki hai. To Riya ki copy pe Aman ka op 6 aage khiskao: <code>@13</code>. Delete ke saath bhi: kisi ne pehle 5 characters mitaaye, to unke baad wali positions 5 peeche.<br><strong>Kyun chahiye:</strong> position ek moving target hai; doosre ke edit ke baad wahi number kisi aur character ki taraf ishaara karta hai.<br><strong>Iske bina:</strong> text galat jagah ghusta hai, galat characters mitte hain, aur copies alag ho jaati hain.<br>Google Docs ne 2010 mein yahi approach batayi thi: InsertText, DeleteText aur ApplyStyle ke har jode ke liye transform rules.` },
    { type: 'callout', tone: 'term', title: 'Naya word: tie-break rule', html: `<strong>Ye kya hai:</strong> jab do log <em>bilkul same position</em> pe ek saath likhein, to kiska text pehle aaye, ye tay karne ka ek fixed rule. Jaise "user ID chhoti ho to uska text left mein".<br><strong>Kyun chahiye:</strong> aisi situation mein "sahi" jawab koi nahi hota. Bas har copy pe <em>same</em> jawab hona chahiye.<br><strong>Iske bina:</strong> har screen apne text ko pehle rakhegi, aur copies alag ho jaayengi.` },
    { type: 'h3', text: 'OT step by step: khud do users ban ke chalao' },
    { type: 'p', html: `Neeche ek chhota editor hai jisme tum <strong>Riya aur Aman dono</strong> ho. Har ek ke liye op chuno (insert ya delete, kahan, kya). Phir "Agla step" dabao aur dekho ek-ek message kaise chalta hai: dono apni screen pe turant op lagate hain, ek op server pe pehle pahunchta hai, doosra transform hota hai, aur aakhir mein teeno copies (Riya, server, Aman) match karti hain ya nahi. "Naive" pe switch karke dekho ki transform ke bina kya hota hai.` },
    { type: 'custom', render(el) {
      const box = 'border:1px solid var(--line);border-radius:var(--r);padding:10px;background:var(--surface)';
      const ctl = (u, nm) => `<div style="${box}"><div style="font-weight:600">${nm} ka op</div>
          <div class="chips docs-k${u}" style="padding:0;margin:4px 0"><button type="button" class="chip" data-v="ins">Insert</button><button type="button" class="chip" data-v="del">Delete</button></div>
          <label>Position: <strong class="docs-pv${u}"></strong></label><input class="docs-p${u}" type="range" min="0" max="10" step="1" style="width:100%">
          <div class="docs-ti${u}"><label>Text (max 8)</label><input class="docs-t${u}" type="text" maxlength="8" style="width:100%;font-family:var(--f-mono)"></div>
          <div class="docs-li${u}"><label>Kitne characters: <strong class="docs-lv${u}"></strong></label><input class="docs-l${u}" type="range" min="1" max="4" step="1" style="width:100%"></div>
          <div class="docs-pr${u}" style="font-family:var(--f-mono);font-size:13px;margin-top:6px;white-space:pre-wrap"></div></div>`;
      const scr = (c, nm) => `<div style="${box}"><div style="font-weight:600">${nm}</div><div class="${c}" style="font-family:var(--f-mono);font-size:14px;white-space:pre-wrap;margin-top:4px"></div></div>`;
      el.innerHTML = `<div class="chips docs-om" style="padding:0"><button type="button" class="chip on" data-v="ot">OT (transform)</button><button type="button" class="chip" data-v="naive">Naive (op jaisa aaya waisa)</button></div>
        <div class="chips docs-of" style="padding:0;margin-top:6px"><button type="button" class="chip on" data-v="A">Riya ka op server pe pehle</button><button type="button" class="chip" data-v="B">Aman ka op pehle</button></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-top:10px">${ctl('A', 'Riya')}${ctl('B', 'Aman')}</div>
        <div style="margin:10px 0;display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn small primary docs-onx">Agla step</button><button type="button" class="btn small ghost docs-ors">Shuru se</button><span class="docs-ost" style="align-self:center;color:var(--ink-3)"></span></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px">${scr('docs-sa', 'Riya ki screen')}${scr('docs-ss', 'Server (owner)')}${scr('docs-sb', 'Aman ki screen')}</div>
        <ol class="docs-olog" style="margin:10px 0 0;padding-left:20px;line-height:1.6"></ol>
        <div class="docs-ov" style="margin-top:8px;font-weight:700;font-size:17px"></div>`;
      const DOC = 'I like tea', L = DOC.length, NM = { A: 'Riya', B: 'Aman' };
      const U = { A: { t: 'ins', pos: 7, text: 'green ', len: 2 }, B: { t: 'ins', pos: 7, text: 'hot ', len: 2 } };
      let mode = 'ot', first = 'A', step = 0;
      const ap = (s, o) => o.t === 'ins' ? s.slice(0, o.pos) + o.text + s.slice(o.pos) : s.slice(0, o.pos) + s.slice(o.pos + o.len);
      const apL = (s, l) => l.reduce(ap, s);
      // transform o against p (p already applied). Returns a list of ops. Same position insert: Riya (A) goes left.
      const xf = (o, p) => { o = Object.assign({}, o);
        if (o.t === 'ins' && p.t === 'ins') { if (p.pos < o.pos || (p.pos === o.pos && p.site < o.site)) o.pos += p.text.length; return [o]; }
        if (o.t === 'ins') { const p2 = p.pos + p.len; if (o.pos >= p2) o.pos -= p.len; else if (o.pos > p.pos) o.pos = p.pos; return [o]; }
        const o2 = o.pos + o.len;
        if (p.t === 'ins') { if (p.pos <= o.pos) { o.pos += p.text.length; return [o]; } if (p.pos >= o2) return [o];
          return [{ t: 'del', pos: p.pos + p.text.length, len: o2 - p.pos, site: o.site }, { t: 'del', pos: o.pos, len: p.pos - o.pos, site: o.site }]; }
        const p2 = p.pos + p.len, ov = Math.max(0, Math.min(o2, p2) - Math.max(o.pos, p.pos)), len = o.len - ov;
        if (!len) return [];
        return [{ t: 'del', pos: o.pos < p.pos ? o.pos : (o.pos >= p2 ? o.pos - p.len : p.pos), len, site: o.site }]; };
      const op = u => { const s = U[u]; return s.t === 'ins' ? { t: 'ins', pos: s.pos, text: s.text, site: u } : { t: 'del', pos: s.pos, len: Math.min(s.len, L - s.pos), site: u }; };
      const os = o => o.t === 'ins' ? `insert "${o.text}" @${o.pos}` : `delete ${o.len} @${o.pos}`;
      const osL = l => l.length ? l.map(os).join(' + ') : 'kuch nahi (wo characters pehle hi mit chuke)';
      const q = s => '"' + s + '"';
      const sync = u => { const s = U[u];
        el.querySelectorAll('.docs-k' + u + ' .chip').forEach(c => c.classList.toggle('on', c.dataset.v === s.t));
        const pr = el.querySelector('.docs-p' + u); pr.max = s.t === 'ins' ? L : L - 1; if (s.pos > +pr.max) s.pos = +pr.max; pr.value = s.pos;
        el.querySelector('.docs-pv' + u).textContent = s.pos;
        el.querySelector('.docs-ti' + u).style.display = s.t === 'ins' ? '' : 'none';
        el.querySelector('.docs-li' + u).style.display = s.t === 'del' ? '' : 'none';
        el.querySelector('.docs-lv' + u).textContent = Math.min(s.len, L - s.pos);
        const o = op(u);
        el.querySelector('.docs-pr' + u).innerHTML = o.t === 'ins' ? DOC.slice(0, o.pos) + '<strong style="color:var(--accent)">' + (o.text || '∅') + '</strong>' + DOC.slice(o.pos) : DOC.slice(0, o.pos) + '<s style="color:var(--red)">' + DOC.slice(o.pos, o.pos + o.len) + '</s>' + DOC.slice(o.pos + o.len); };
      const run = () => {
        const F = first, S = F === 'A' ? 'B' : 'A', oF = op(F), oS = op(S), ot = mode === 'ot';
        const sp = ot ? xf(oS, oF) : [oS], fp = ot ? xf(oF, oS) : [oF];
        const r = { F, S, oF, oS, sp, fp, s1: ap(DOC, oF), s2: apL(ap(DOC, oF), sp), fFin: apL(ap(DOC, oF), sp), sFin: apL(ap(DOC, oS), fp) };
        r.loc = { A: ap(DOC, op('A')), B: ap(DOC, op('B')) };
        return r; };
      const STEPS = 6;
      const upd = () => {
        const r = run(), F = NM[r.F], S = NM[r.S], ot = mode === 'ot';
        const scr = { A: DOC, B: DOC }, rv = { A: 17, B: 17 }; let srv = DOC, srev = 17;
        const log = [];
        if (step >= 1) { scr.A = r.loc.A; scr.B = r.loc.B; log.push(`Dono ne apna op apni screen pe <strong>turant</strong> lagaya (network ka intezaar nahi), aur server ko bheja: <code>base_rev 17</code>.`); }
        if (step >= 2) { srv = r.s1; srev = 18; log.push(`${F} ka op server pe pehle pahuncha. Uska base_rev 17 = server ka rev 17, beech mein kuch nahi aaya, to jaisa hai waisa lagao: <code>${os(r.oF)}</code> → <strong>rev 18</strong>.`); }
        if (step >= 3) { srv = r.s2; srev = 19; log.push(ot ? `${S} ka op aaya, base_rev 17, lekin server rev 18 pe hai. Rev 18 (${F} ka op) ${S} ne nahi dekha tha, to server transform karta hai: <code>${os(r.oS)}</code> → <code>${osL(r.sp)}</code>${osL(r.sp) === os(r.oS) ? ' (is baar badalna nahi pada)' : ''} → <strong>rev 19</strong>.` : `${S} ka op aaya. Naive server bina adjust kiye lagata hai: <code>${os(r.oS)}</code> → rev 19.`); }
        if (step >= 4) { scr[r.F] = r.fFin; rv[r.F] = 19; log.push(`Server ${F} ko ack (rev 18) bhejta hai, phir rev 19 wala op: <code>${osL(r.sp)}</code>. ${F} ki screen pe laga.`); }
        if (step >= 5) { scr[r.S] = r.sFin; rv[r.S] = 19; log.push(ot ? `Server ${S} ko rev 18 (${F} ka op) bhejta hai. ${S} ka apna op abhi raaste mein hai (ack nahi aaya), to ${S} ka browser bhi transform karta hai: <code>${os(r.oF)}</code> → <code>${osL(r.fp)}</code>${osL(r.fp) === os(r.oF) ? ' (is baar badalna nahi pada)' : ''}. Phir ack: rev 19.` : `${S} ko ${F} ka op as-is mila: <code>${os(r.oF)}</code>. Usne seedha laga diya.`); }
        const same = scr.A === srv && scr.B === srv;
        if (step >= 6) log.push(same ? `Teeno copies same, aur kisi ka likha hua text gayab nahi hua.` : `Copies alag! Ab aage ke saare ops bhi galat jagah lagenge.`);
        el.querySelector('.docs-sa').textContent = q(scr.A) + '\nrev ' + rv.A;
        el.querySelector('.docs-ss').textContent = q(srv) + '\nrev ' + srev;
        el.querySelector('.docs-sb').textContent = q(scr.B) + '\nrev ' + rv.B;
        el.querySelector('.docs-olog').innerHTML = log.map(x => '<li>' + x + '</li>').join('');
        el.querySelector('.docs-ost').textContent = `Step ${step}/${STEPS}`;
        el.querySelector('.docs-onx').disabled = step >= STEPS;
        const v = el.querySelector('.docs-ov');
        v.textContent = step < STEPS ? '' : same ? 'Converged: Riya, server aur Aman, teeno same' : 'Diverged: copies ALAG ho gayi';
        v.style.color = same ? 'var(--green)' : 'var(--red)'; };
      const reset = () => { step = 0; upd(); };
      ['A', 'B'].forEach(u => {
        el.querySelectorAll('.docs-k' + u + ' .chip').forEach(c => c.addEventListener('click', () => { U[u].t = c.dataset.v; sync(u); reset(); }));
        el.querySelector('.docs-p' + u).addEventListener('input', e => { U[u].pos = +e.target.value; sync(u); reset(); });
        el.querySelector('.docs-l' + u).addEventListener('input', e => { U[u].len = +e.target.value; sync(u); reset(); });
        const ti = el.querySelector('.docs-t' + u); ti.value = U[u].text; ti.addEventListener('input', () => { U[u].text = ti.value; sync(u); reset(); });
        el.querySelector('.docs-l' + u).value = U[u].len; sync(u); });
      const pick = (sel, f) => el.querySelectorAll(sel + ' .chip').forEach(c => c.addEventListener('click', () => { el.querySelectorAll(sel + ' .chip').forEach(x => x.classList.toggle('on', x === c)); f(c.dataset.v); reset(); }));
      pick('.docs-om', v => { mode = v; }); pick('.docs-of', v => { first = v; });
      el.querySelector('.docs-onx').addEventListener('click', () => { if (step < STEPS) step++; upd(); });
      el.querySelector('.docs-ors').addEventListener('click', reset);
      upd();
    }},
    { type: 'p', html: `Kuch cheezein try karo: (1) default pe OT chalao, phir Naive. (2) Riya ka op "Delete, position 2, 4 characters" ("like" mitao) aur Aman ka "Insert 'very ' @7": OT mein "very " sahi jagah bachta hai. (3) Dono ek hi range delete karein: OT mein wo ek hi baar mitti hai, do baar nahi. (4) Aman ka insert Riya ke delete range ke <em>beech</em> mein rakho: Aman ki taraf Riya ka delete do tukdon mein toot jaata hai, taaki Aman ka text bache.` },
    { type: 'h3', text: 'CRDT: seedhe shabdon mein' },
    { type: 'p', html: `OT ek jagah (server) pe order tay karke positions adjust karta hai. Ek doosra raasta bhi hai: <strong>positions use hi mat karo</strong>. Socho class ke har bachche ka roll number hai. "Teesri bench pe baitha bachcha" badal sakta hai (koi aage baith gaya), lekin "roll number 12" hamesha wahi bachcha hai. CRDT text ke har character ko aisa hi permanent naam deta hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: CRDT (text ke liye)', html: `<strong>Ye kya hai:</strong> CRDT = Conflict-free Replicated Data Type. Ek aisa data structure jisme har copy ke ops <em>kisi bhi order</em> mein lagao, aakhir mein sab copies same ho jaati hain. Text CRDT har character ko ek <strong>permanent unique ID</strong> deta hai, jaise <code>12@A</code> (user A ka 12va character). Insert bolta hai "<code>7@0</code> wale character ke <em>baad</em> daalo", position nahi. Do log same jagah daalein to ek fixed rule (bada ID pehle) order tay karta hai, aur ye rule har copy pe same chalta hai.<br><strong>Kyun chahiye:</strong> ID kabhi nahi badalti, isliye kisi transform ki zaroorat nahi, aur central server ke bina bhi (peer-to-peer, ya lambe offline ke baad) merge ho jaata hai.<br><strong>Iske bina:</strong> ya to OT (ek central order chahiye), ya LWW (text gayab).<br><a href="#/consistency">Consistency lesson</a> mein CRDT ka basic idea (G-counter) dekha tha; ye uska text wala bada bhai hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: tombstone', html: `<strong>Ye kya hai:</strong> CRDT mein delete character ko sach mein hatata nahi. Use sirf "mitaa hua" mark karta hai (screen pe nahi dikhta), jaise kitaab mein line kaat do lekin page mat phaado.<br><strong>Kyun chahiye:</strong> ho sakta hai kisi aur ka insert bolta ho "<code>7@0</code> ke baad daalo", aur 7@0 abhi abhi mita. Agar wo character gayab ho jaaye to insert ko pata hi nahi chalega kahan jaana hai.<br><strong>Iske bina:</strong> delete aur insert ek saath aayein to insert kho jaata ya galat jagah jaata. <strong>Keemat:</strong> mitaaye hue characters bhi memory mein rehte hain, isliye libraries baad mein unhe saaf (garbage collect) karne ke tareeke rakhti hain.` },
    { type: 'p', html: `Ab teeno tareeke ek saath chalao. Document "I like tea". Riya (A) aur Aman (B) ek saath edit karte hain, bina ek doosre ka edit dekhe. Har screen pehle apna op lagati hai, phir doosre ka. Teeno tareeke badal ke dekho:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="chips docs-sc" style="padding:0"><button type="button" class="chip on" data-v="0">Dono same jagah insert</button><button type="button" class="chip" data-v="1">Ek delete, ek insert</button></div>
        <div class="chips docs-md" style="padding:0;margin-top:6px"><button type="button" class="chip on" data-v="naive">Naive (op jaisa aaya waisa)</button><button type="button" class="chip" data-v="ot">OT (transform)</button><button type="button" class="chip" data-v="crdt">CRDT (character IDs)</button></div>
        <div class="docs-ops" style="font-family:var(--f-mono);font-size:13px;margin:10px 0;line-height:1.7"></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">
          <div style="border:1px solid var(--line);border-radius:var(--r);padding:10px;background:var(--surface)"><div style="font-weight:600">Riya ki screen (A)</div><div class="docs-a" style="font-family:var(--f-mono);font-size:13px;line-height:1.8"></div></div>
          <div style="border:1px solid var(--line);border-radius:var(--r);padding:10px;background:var(--surface)"><div style="font-weight:600">Aman ki screen (B)</div><div class="docs-b" style="font-family:var(--f-mono);font-size:13px;line-height:1.8"></div></div>
        </div>
        <div class="docs-v" style="margin-top:10px;font-weight:700;font-size:17px"></div>
        <div class="docs-ids" style="font-family:var(--f-mono);font-size:12px;margin-top:6px;line-height:1.9;word-break:break-word"></div>
        <div class="calc-note o-note"></div>`;
      const DOC = 'I like tea';
      const SC = [
        { a: { t: 'ins', pos: 7, text: 'green ', site: 'A' }, b: { t: 'ins', pos: 7, text: 'hot ', site: 'B' } },
        { a: { t: 'del', pos: 2, len: 5, site: 'A' }, b: { t: 'ins', pos: 7, text: 'hot ', site: 'B' } },
      ];
      let sc = 0, md = 'naive';
      const show = s => '"' + s + '"';
      const opStr = o => o.t === 'ins' ? `insert "${o.text}" @${o.pos}` : `delete ${o.len} chars @${o.pos} ("${DOC.slice(o.pos, o.pos + o.len)}")`;
      const apply = (s, o) => o.t === 'ins' ? s.slice(0, Math.min(o.pos, s.length)) + o.text + s.slice(Math.min(o.pos, s.length)) : s.slice(0, o.pos) + s.slice(o.pos + o.len);
      // OT: transform o against p which was applied first. Tie on same position: site A goes left.
      const xf = (o, p) => { o = Object.assign({}, o);
        if (o.t === 'ins' && p.t === 'ins') { if (p.pos < o.pos || (p.pos === o.pos && p.site < o.site)) o.pos += p.text.length; }
        else if (o.t === 'ins' && p.t === 'del') { if (o.pos >= p.pos + p.len) o.pos -= p.len; else if (o.pos > p.pos) o.pos = p.pos; }
        else if (o.t === 'del' && p.t === 'ins') { if (p.pos <= o.pos) o.pos += p.text.length; } // widget ke dono scenarios ke liye kaafi; asli OT mein delete-range ke andar insert ho to delete do tukdon mein tootta hai taaki insert bache
        return o; };
      // CRDT (RGA style): each char {id:[counter, site], ch, del}
      const gt = (x, y) => x[0] !== y[0] ? x[0] > y[0] : x[1] > y[1];
      const init = () => DOC.split('').map((ch, i) => ({ id: [i + 1, '0'], ch, del: false }));
      const toOps = (d, o) => { const vis = d.filter(e => !e.del);
        if (o.t === 'ins') { let origin = o.pos === 0 ? null : vis[o.pos - 1].id; return o.text.split('').map((ch, k) => { const id = [DOC.length + 1 + k, o.site], op = { t: 'ins', id, ch, origin }; origin = id; return op; }); }
        return vis.slice(o.pos, o.pos + o.len).map(e => ({ t: 'del', id: e.id })); };
      const cApply = (d, op) => { d = d.map(e => Object.assign({}, e)); const same = (x, y) => x && y && x[0] === y[0] && x[1] === y[1];
        if (op.t === 'del') { const e = d.find(x => same(x.id, op.id)); if (e) e.del = true; return d; }
        let i = op.origin ? d.findIndex(x => same(x.id, op.origin)) + 1 : 0;
        while (i < d.length && gt(d[i].id, op.id)) i++;
        d.splice(i, 0, { id: op.id, ch: op.ch, del: false }); return d; };
      const txt = d => d.filter(e => !e.del).map(e => e.ch).join('');
      const run = (sc, md) => { const { a, b } = SC[sc];
        if (md === 'naive') return { a1: apply(DOC, a), a2: apply(apply(DOC, a), b), b1: apply(DOC, b), b2: apply(apply(DOC, b), a), ra: b, rb: a };
        if (md === 'ot') { const ra = xf(b, a), rb = xf(a, b); return { a1: apply(DOC, a), a2: apply(apply(DOC, a), ra), b1: apply(DOC, b), b2: apply(apply(DOC, b), rb), ra, rb }; }
        const d0 = init(), oa = toOps(d0, a), ob = toOps(d0, b);
        let A = d0; oa.forEach(o => A = cApply(A, o)); const a1 = txt(A); ob.forEach(o => A = cApply(A, o));
        let B = d0; ob.forEach(o => B = cApply(B, o)); const b1 = txt(B); oa.forEach(o => B = cApply(B, o));
        return { a1, a2: txt(A), b1, b2: txt(B), dA: A }; };
      const upd = () => {
        const r = run(sc, md), { a, b } = SC[sc];
        el.querySelector('.docs-ops').innerHTML = `Shuru: ${show(DOC)}<br>Riya (A): ${opStr(a)}<br>Aman (B): ${opStr(b)}`;
        const recv = (o) => md === 'crdt' ? 'ID-based ops (neeche)' : opStr(o);
        el.querySelector('.docs-a').innerHTML = `Apna op: ${show(r.a1)}<br>B ka op aaya${md !== 'crdt' ? ' → ' + recv(r.ra) : ''}<br>Final: <strong>${show(r.a2)}</strong>`;
        el.querySelector('.docs-b').innerHTML = `Apna op: ${show(r.b1)}<br>A ka op aaya${md !== 'crdt' ? ' → ' + recv(r.rb) : ''}<br>Final: <strong>${show(r.b2)}</strong>`;
        const same = r.a2 === r.b2;
        const v = el.querySelector('.docs-v'); v.textContent = same ? 'Converged: dono screens same' : 'Diverged: dono screens ALAG';
        v.style.color = same ? 'var(--green)' : 'var(--red)';
        el.querySelector('.docs-ids').innerHTML = md === 'crdt' ? 'Characters with IDs (Riya ki copy): ' + r.dA.map(e => `<span style="${e.del ? 'text-decoration:line-through;color:var(--ink-3)' : ''}">[${e.ch === ' ' ? '␣' : e.ch} ${e.id[0]}@${e.id[1]}]</span>`).join(' ') : '';
        const N = {
          naive: sc === 0 ? 'Dono ne doosre ka op as-is lagaya. Same position pe do inserts, aur har screen pe doosre ka text pehle aa gaya (wo position 7 pe, apne text se pehle, ghus gaya): documents hamesha ke liye alag. Koi error bhi nahi aaya, bas chupchaap galat.' : 'Riya ne "like " mita diya, document chhota ho gaya. Aman ka "@7" ab Riya ke document ke bahar hai, to "hot " galat jagah (end pe) chala gaya. Aman ki screen sahi dikh rahi hai, Riya ki galat.',
          ot: sc === 0 ? 'Transform: same position pe tie hai, rule "A pehle (left)". Riya ki screen pe B ka op 6 aage khiska (@13), Aman ki screen pe A ka op wahin (@7). Dono ka final same.' : 'Transform: B ka insert @7 delete range ke baad tha, to 5 peeche khiska (@2). A ka delete wahin raha kyunki insert uske baad tha. Dono same "I hot tea". Google ke 2010 post ka "shift by N" idea yahi hai.',
          crdt: sc === 0 ? 'Koi position transform nahi. "green " aur "hot " dono "7@0" (space) ke baad daale gaye; tie pe bada ID pehle (B > A), to "hot " pehle aaya. Order alag ho sakta tha, lekin dono screens pe SAME rule, SAME result. Apne run ke characters saath rehte hain, bikhar ke mix nahi hote.' : 'Delete ne characters ko sirf tombstone (kata hua) kiya. Aman ka insert "␣ 7@0" ke baad ka reference rakhta hai, jo Riya ki copy mein tombstone ki tarah ab bhi hai, to sahi jagah gaya. Dono "I hot tea".',
        };
        el.querySelector('.o-note').textContent = N[md];
      };
      el.querySelectorAll('.docs-sc .chip').forEach(c => c.addEventListener('click', () => { el.querySelectorAll('.docs-sc .chip').forEach(x => x.classList.toggle('on', x === c)); sc = Number(c.dataset.v); upd(); }));
      el.querySelectorAll('.docs-md .chip').forEach(c => c.addEventListener('click', () => { el.querySelectorAll('.docs-md .chip').forEach(x => x.classList.toggle('on', x === c)); md = c.dataset.v; upd(); }));
      upd();
    }},
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"OT aur CRDT ne alag final text diya (green hot vs hot green), to ek galat hai." Nahi. Dono ne <strong>converge</strong> kiya, bas tie-break rule alag hai. Same jagah do log ek saath likhein to "sahi" order koi hota hi nahi; zaroori sirf ye hai ki <em>sab</em> ko same order dikhe aur kisi ka text kho na jaaye ya galat jagah na jaaye. Doosri galatfehmi: "last write wins kar do". Text pe LWW ka matlab ek user ka poora edit gayab, jo collaborative editor mein mana hai.` },
    { type: 'h3', text: 'Google Docs ka collaboration protocol (2010 posts se)' },
    { type: 'p', html: `OT akela kaafi nahi; kaun kab transform kare, iska ek protocol chahiye. Google ki 2010 series ke teesre post ke mutabik:` },
    { type: 'list', items: [
      `<strong>Client yaad rakhta hai</strong>: server se mila aakhri revision number, abhi tak na bheje gaye local changes, bheje gaye lekin unacknowledged changes, aur document ki apni current state.`,
      `<strong>Server yaad rakhta hai</strong>: aaye lekin abhi process na hue changes, saare processed changes ki history (<strong>revision log</strong>), aur document ki current state.`,
      `<strong>Ek time pe ek hi change "in flight"</strong>: jab tak pichhle change ka ack na aaye, naye local changes pending list mein rukte hain. Google Wave ke OT whitepaper (2010) mein bhi yahi rule hai: client ack ka intezaar karta hai, aur rukte hue ops ko <em>compose</em> (jod ke ek op) kar leta hai. Fayda: server ko har client ke liye alag state space nahi rakhna padta, sirf ek history.`,
      `<strong>Server transform karta hai</strong>: client ka change purane revision pe based hai to server use un saare revisions ke against transform karta hai jo client ne nahi dekhe, phir agla revision number deta hai. Client bhi aane wale changes ko apne pending changes ke against transform karta hai.`,
      `Post ke mutabik fayde: typing network speed pe depend nahi karti (optimistic local apply), network pe sirf minimum change jaata hai, aur server ko kisi client ki state yaad nahi rakhni padti, isliye editors badhne se server ka kaam complex nahi hota.`,
    ]},
    { type: 'p', html: `Google ne likha tha ki is OT-based protocol pe aane se pehle unka editor versions compare karke merge karta tha, aur naye system mein "collaboration conflicts" khatam ho gaye aur log ek doosre ke edits character-by-character dekh paate hain. Ye 2010 ka description hai; aaj Google Docs andar exactly kya chalata hai, public nahi.` },

    { type: 'h3', text: 'OT vs CRDT: kab kaunsa?' },
    { type: 'table', head: ['', 'OT', 'CRDT'], rows: [
      ['Core idea', 'Positions wale ops, aane pe transform', 'Har element ki unique ID, ops IDs pe, merge maths se guaranteed'],
      ['Central server', 'Practically haan (ek order dene wala); Jupiter (Xerox ka 1995 ka research system, jispe Wave ka OT bana), Wave aur Google Docs sab client-server', 'Zaroori nahi: peer-to-peer, offline, kisi bhi order mein sync'],
      ['Mushkil kahan', 'Har op-type jode ke transform rules sahi likhna; Figma ne isse "combinatorial explosion" kaha', 'Metadata: har character ka ID + tombstones, memory zyada; kuch algorithms mein interleaving bugs'],
      ['Offline', 'Lambe offline ke baad bahut ops transform karne padte hain', 'Natural fit: "local-first" (Automerge, Yjs)'],
      ['Real use', 'Google Docs (2010 posts), Google Wave', 'Yjs, Automerge; Figma ne CRDT se "inspired" central design banaya'],
    ]},
    { type: 'p', html: `<strong>Figma ka choice (2019 post):</strong> Figma ne OT ko apne problem ke liye zaroorat se zyada complex mana. Unka document text editor nahi, objects ka tree hai: <code>Map&lt;ObjectID, Map&lt;Property, Value&gt;&gt;</code>. Unhone CRDTs se inspiration li, lekin ek <strong>central server</strong> ke saath (kyunki unka server waise bhi authority hai), aur har property pe <strong>last-writer-wins</strong>: do log same object ka colour ek saath badlein to server pe jo baad mein pahuncha wo jeetega. Text ke liye ye theek nahi (ek ka poora text gayab), lekin shapes ke properties ke liye bilkul theek. Lesson: <em>apne data ki shape dekh ke merge strategy chuno</em>.` },
    { type: 'callout', tone: 'why', title: 'Interview depth: CRDTs ke "hard parts"', html: `Martin Kleppmann ke 2019 paper (PaPoC) ne dikhaya ki kuch published text CRDT algorithms mein ek <strong>interleaving anomaly</strong> hai: do log same jagah poore words likhein to characters aapas mein mix ho sakte hain ("ghroeteen" jaisa). Unke code ke mutabik Logoot aur LSEQ mein ye dikha, RGA mein nahi (hamara widget RGA jaisa hai, isliye "hot " aur "green " saaf alag rahe). Unke 2020 ke talk "CRDTs: The Hard Parts" mein aur problems: list items ko move karna, tree mein move (cycles), aur metadata overhead kam karna (Automerge ka columnar encoding). Matlab CRDT "free lunch" nahi: sahi algorithm chunna aur memory manage karna padta hai.` },
    { type: 'h2', text: 'Deep dive 2: operation log + snapshots' },
    { type: 'p', html: `Google ke 2010 post ke mutabik Google Docs document ko ek <strong>revision log</strong> ki tarah save karta tha: edits underlying characters ko seedha nahi badalte, log ke end mein jud-te hain, aur document dikhane ke liye log shuru se replay hota tha. Ye <a href="#/pattern-writes">append-only log</a> pattern hai, aur iske teen fayde hain: version history muft mein, crash ke baad state wapas banana aasaan, aur ops ka order hi document ka sach.` },
    { type: 'p', html: `Problem: ek purana document jisme 10 lakh ops hain. Har baar kholne pe 10 lakh ops replay? Slow. Fix: <strong>snapshot</strong> (checkpoint): har K ops pe poore document ki copy rev number ke saath save karo. Kholne pe: latest snapshot + uske baad ke ops. Figma ki 2022 post ek asli example hai: pehle unka server har 30-60 second pe poori file ka checkpoint S3 mein likhta tha, to crash pe 60 second tak ka kaam khatre mein tha. Unhone ek <strong>journal</strong> (DynamoDB pe write-ahead log, har change ka badhta sequence number) joda. Post ke mutabik 95% edits 600 ms ke andar durable save ho jaate hain, aur restart pe server latest checkpoint load karke uske baad ki journal entries replay karta hai. Khud K badal ke dekho (maan lo: replay speed 1 lakh ops/s, snapshot load 20 ms, document 200 KB, ek active doc pe 10 ops/s):` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="docs-n">Document ki history mein total ops: <strong class="o-nv"></strong></label><input id="docs-n" type="range" min="0" max="4" step="1" value="3"></div>
          <div><label for="docs-k">Snapshot har kitne ops pe: <strong class="o-kv"></strong></label><input id="docs-k" type="range" min="0" max="5" step="1" value="2"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Kholne pe replay (worst)</span><strong class="o-rp"></strong></div>
          <div class="stat"><span>Open time (worst)</span><strong class="o-ot"></strong></div>
          <div class="stat"><span>Snapshots (sab rakhe to)</span><strong class="o-sc"></strong></div>
          <div class="stat"><span>Snapshot writes / ghanta</span><strong class="o-sh"></strong></div>
        </div>
        <div class="calc-note o-note"></div>`;
      const NS = [1e3, 1e4, 1e5, 1e6, 1e7], KS = [100, 1000, 10000, 100000, 1e6, Infinity];
      const RATE = 1e5, LOADMS = 20, KB = 200, OPS = 10;
      const f = n => n >= 1e6 ? (n / 1e6) + 'M' : n >= 1e3 ? (n / 1e3) + 'k' : String(n);
      const t = ms => ms >= 1000 ? (ms / 1000).toFixed(1) + ' s' : Math.round(ms) + ' ms';
      const upd = () => {
        const N = NS[Number(el.querySelector('#docs-n').value)], K = KS[Number(el.querySelector('#docs-k').value)];
        el.querySelector('.o-nv').textContent = f(N); el.querySelector('.o-kv').textContent = K === Infinity ? 'kabhi nahi' : f(K);
        const has = K !== Infinity && K <= N, replay = has ? K - 1 : N, ms = (has ? LOADMS : 0) + replay / RATE * 1000;
        const cnt = has ? Math.floor(N / K) : 0, perHr = K === Infinity ? 0 : 3600 * OPS / K;
        el.querySelector('.o-rp').textContent = replay.toLocaleString('en-IN') + ' ops';
        el.querySelector('.o-ot').textContent = t(ms);
        const mb = cnt * KB / 1e3;
        el.querySelector('.o-sc').textContent = cnt.toLocaleString('en-IN') + (cnt ? (mb >= 1000 ? ` (${(mb / 1000).toFixed(1)} GB)` : ` (${mb.toFixed(1)} MB)`) : '');
        el.querySelector('.o-sh').textContent = perHr >= 1 ? Math.round(perHr) : perHr > 0 ? perHr.toFixed(2) : '0';
        el.querySelector('.o-note').textContent = !has
          ? `Koi snapshot nahi: har baar poore ${f(N)} ops replay, ${t(ms)}. ${ms > 2000 ? 'User itna wait nahi karega, aur server restart pe saare documents ka ye kaam ek saath!' : 'Chhote doc pe chal jaata hai, lekin history badhte hi slow hoga.'}`
          : `Har ${f(K)} ops pe snapshot: kholne pe max ${replay.toLocaleString('en-IN')} ops replay, ~${t(ms)}. Keemat: ${cnt.toLocaleString('en-IN')} snapshots × 200 KB, aur active doc pe ghante mein ~${perHr >= 1 ? Math.round(perHr) : perHr.toFixed(2)} snapshot writes. ${K <= 100 ? 'Bahut baar snapshot: open fast, lekin storage aur write load bekaar badha.' : K >= 1e5 ? 'Kam snapshot: storage sasta, lekin open/recovery slow.' : 'Achha balance: open fast, storage theek.'} Purane snapshots chahein to sirf kuch rakho (version history ke liye), baaki hata do.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'warn', title: 'Ack kab bhejein?', html: `Agar server op ko sirf memory mein laga ke ack bhej de aur phir crash ho, to user ko lagega edit save ho gaya, lekin wo gaya. Isliye <strong>pehle op log mein durable write, phir ack</strong>. Keemat: har op pe ek durable write ki latency. Figma ke journal ne server-side durable save ka time ~60 second (checkpoint ka gap) se ghata ke zyada tar edits ke liye 600 ms ke andar kar diya. Ye wahi idea hai jo databases ke <a href="#/db-internals">write-ahead log</a> mein hai.` },
    { type: 'h3', text: 'Version history: "kal shaam wala version dikhao"' },
    { type: 'p', html: `Google Docs mein "Last edit" pe click karke purane versions dekh sakte ho, unhe restore kar sakte ho, ya uski copy bana sakte ho. Kisi version ko naam bhi de sakte ho ("Final draft"); Google ki help page ke mutabik ek document mein 40 tak named versions. Wahi page ye bhi kehta hai ki purane versions kabhi kabhi aapas mein mila (merge) diye jaate hain, aur version history dekhne ke liye edit permission chahiye.` },
    { type: 'p', html: `Hamare design mein ye feature lagbhag muft hai, kyunki op log mein har badlaav rev number aur user ke saath pehle se hai:` },
    { type: 'list', items: [
      `<strong>Rev N ka document dikhana:</strong> N se pehle wala sabse nazdeeki snapshot lo, phir N tak ke ops replay karo. Bas.`,
      `<strong>"Kisne kya badla":</strong> har op ke saath user likha hai. UI ek user ke lagaataar ops ko ek "version" ke roop mein group karke dikhata hai (har keystroke alag version nahi).`,
      `<strong>Named version:</strong> ek chhota record "rev 5 = Pehla draft". Aise versions ke snapshots kabhi delete mat karo.`,
      `<strong>Restore:</strong> purana content ek naye op ki tarah upar likho (rev badhta rehta hai). Is tareeke mein beech ka itihaas mitta nahi, aur chalu editors ko bas ek aur op milta hai. (Ye aam design choice hai; Google andar exactly kaise karta hai, public nahi.)`,
    ]},
    { type: 'custom', render(el) {
      el.innerHTML = `<label for="docs-vh">Version (rev): <strong class="docs-vn"></strong></label><input id="docs-vh" type="range" min="0" max="12" step="1" value="12" style="width:100%">
        <div class="docs-vbar" style="display:flex;gap:3px;margin:6px 0;flex-wrap:wrap"></div>
        <div style="border:1px solid var(--line);border-radius:var(--r);padding:10px;background:var(--surface);font-family:var(--f-mono);font-size:14px;white-space:pre-wrap" class="docs-vd"></div>
        <div class="stats"><div class="stat"><span>Kisne / kya</span><strong class="docs-vw"></strong></div><div class="stat"><span>Shuru kahan se</span><strong class="docs-vs"></strong></div><div class="stat"><span>Replay kitne ops</span><strong class="docs-vr"></strong></div></div>
        <div class="calc-note docs-vnote"></div>`;
      const OPS = [
        ['Riya', 'ins', 0, 'Trip plan'], ['Riya', 'ins', 9, ': Goa'], ['Aman', 'ins', 14, ' in May'], ['Aman', 'del', 11, 3], ['Aman', 'ins', 11, 'Manali'],
        ['Riya', 'ins', 24, ', budget 20k'], ['Riya', 'del', 17, 7], ['Riya', 'ins', 17, ' in June'], ['Aman', 'ins', 0, 'Final '],
        ['Aman', 'del', 40, 3], ['Aman', 'ins', 40, '25k'], ['Riya', 'ins', 43, '!'],
      ];
      const K = 4, NAMED = { 5: 'Pehla draft', 9: 'Final' };
      const ap = (s, o) => o[1] === 'ins' ? s.slice(0, o[2]) + o[3] + s.slice(o[2]) : s.slice(0, o[2]) + s.slice(o[2] + o[3]);
      const docAt = n => OPS.slice(0, n).reduce(ap, '');
      const bar = el.querySelector('.docs-vbar');
      bar.innerHTML = Array.from({ length: 13 }, (_, i) => `<span class="docs-vc" style="flex:1;min-width:18px;text-align:center;font-size:11px;padding:3px 0;border-radius:var(--r-sm);border:1px solid var(--line)">${i % K === 0 ? '▣' : ''}${NAMED[i] ? '★' : ''}${i}</span>`).join('');
      const upd = () => {
        const n = Number(el.querySelector('#docs-vh').value), snap = Math.floor(n / K) * K, o = OPS[n - 1];
        el.querySelector('.docs-vn').textContent = n + (NAMED[n] ? ' ("' + NAMED[n] + '")' : '');
        el.querySelector('.docs-vd').textContent = '"' + docAt(n) + '"';
        el.querySelector('.docs-vw').textContent = n === 0 ? 'khaali document' : o[0] + ': ' + (o[1] === 'ins' ? `insert "${o[3]}" @${o[2]}` : `delete ${o[3]} @${o[2]}`);
        el.querySelector('.docs-vs').textContent = snap === 0 ? 'rev 0 (khaali)' : 'snapshot @ rev ' + snap;
        el.querySelector('.docs-vr').textContent = (n - snap) + ' ops';
        bar.querySelectorAll('.docs-vc').forEach((c, i) => { c.style.background = i === n ? 'var(--accent-soft)' : i >= snap && i <= n ? 'var(--surface-2)' : ''; c.style.fontWeight = i === n ? '700' : ''; });
        el.querySelector('.docs-vnote').textContent = `Rev ${n} dikhane ke liye: ${snap === 0 ? 'khaali document' : 'rev ' + snap + ' ka snapshot (▣)'} lo, phir ${n - snap} op${n - snap === 1 ? '' : 's'} replay karo. Snapshot har ${K} revs pe hai, to kabhi bhi ${K - 1} se zyada ops replay nahi karne padte. ★ = named version, iska snapshot kabhi delete nahi hota.`;
      };
      el.querySelector('#docs-vh').addEventListener('input', upd); upd();
    }},
    { type: 'h2', text: 'Deep dive 3: presence, offline aur permissions' },
    { type: 'p', html: `<strong>Presence</strong> (kaun document mein hai, kiska cursor kahan hai, kisne kya select kiya) edits se bilkul alag data hai: bahut zyada baar badalta hai (har mouse move, har arrow key), aur <strong>save karne ki zaroorat nahi</strong>. Kal kiska cursor kahan tha, kisi ko farak nahi padta. Isliye ise op log mein nahi daalte. Yjs library ki docs bhi yahi kehti hain: unka "awareness" feature cursors, naam aur colour bhejta hai, document mein store nahi hota, aur user disconnect hote hi uski awareness state hata di jaati hai.` },
    { type: 'p', html: `Bade systems mein WebSocket connections aksar alag <strong>gateway</strong> servers pe khatam hote hain (jaise <a href="#/design-whatsapp">WhatsApp</a> lesson mein), aur document ka session server alag hota hai. Tab presence ke liye ek <strong>pub/sub channel per document</strong> (jaise Redis pub/sub ka <code>doc:42</code> channel) achha fit hai: jis gateway pe doc 42 ka koi user hai wo channel subscribe karta hai. Cursor updates ko <strong>throttle</strong> bhi karte hain, aur agar ek update kho jaaye to agla aa hi raha hai. Ye aam industry approach hai; Google ke presence system ki detail public nahi.` },
    { type: 'callout', tone: 'term', title: 'Naye words: gateway, pub/sub, throttle', html: `<strong>Gateway</strong><br><strong>Ye kya hai:</strong> wo server jahan users ke WebSocket connections judte hain. Wo messages ko andar sahi service tak pahunchata hai.<br><strong>Kyun chahiye:</strong> lakhon khule connections sambhalna ek alag kaam hai. Document session servers sirf documents ka kaam karein, connections ka nahi.<br><strong>Iske bina:</strong> har session server ko har user ka connection rakhna padta, aur ek doc ke users alag gateways pe hon to unhe jodna mushkil.<br><br><strong>Pub/sub (publish/subscribe)</strong><br><strong>Ye kya hai:</strong> ek message board. Koi "doc:42" channel pe message daalta hai (publish), aur jo bhi us channel ko sun raha hai (subscribe) use turant copy milti hai.<br><strong>Kyun chahiye:</strong> Riya ke gateway ko pata nahi ki Aman kis gateway pe hai. Channel pe daal do, sahi gateways khud le lenge.<br><strong>Iske bina:</strong> har gateway ko har doosre gateway se baat karni padti.<br><br><strong>Throttle</strong><br><strong>Ye kya hai:</strong> ek limit ki itne time mein ek hi update bhejo. Jaise cursor ka position har keystroke pe nahi, kuch dozen milliseconds mein ek baar.<br><strong>Kyun chahiye:</strong> mouse hilaane se ek second mein 60 updates bante hain. Sab bhejoge to network aur servers bekaar bharenge.<br><strong>Iske bina:</strong> 100 editors wale doc pe cursor updates hi asli edits ko slow kar denge.` },
    { type: 'flow', title: 'Presence, edits, permissions aur offline', height: 340,
      nodes: [
        { id: 'r', label: 'Riya', sub: 'browser', x: 70, y: 175, w: 110, kind: 'client', info: 'Ye kya hai: Riya ka browser. Isme document ki local copy, pending ops ki list (jo abhi server ne accept nahi kiye), aur last seen rev rehta hai.' },
        { id: 'ga', label: 'Gateway A', sub: 'WebSockets', x: 215, y: 175, w: 120, kind: 'edge', info: 'Ye kya hai: wo server jahan Riya ka WebSocket connection judta hai. Kyun: lakhon khule connections sambhalna ek alag kaam hai, document ka kaam alag. Edits doc ke session server ko forward, presence pub/sub channel pe.' },
        { id: 'ps', label: 'Pub/sub', sub: 'channel doc:42', x: 395, y: 60, w: 150, kind: 'queue', info: 'Ye kya hai: ek message board jahan jo bhi "doc:42" channel sun raha hai, use har message mil jaata hai. Presence ke liye ek channel per document. Fire-and-forget: kuch updates kho bhi jaayein to chalta hai, agla update aa raha hai. Kuch bhi disk pe nahi.' },
        { id: 'ss', label: 'Doc session', sub: 'doc 42 owner', x: 395, y: 175, w: 150, kind: 'server', info: 'Ye kya hai: doc 42 ka session server (owner). Ops ko order (rev) deta hai, transform karta hai, op log mein likhta hai, aur sab gateways ko broadcast karta hai. Har op se pehle user ka role check (cache se).' },
        { id: 'acl', label: 'Permissions', sub: 'viewer/editor', x: 395, y: 295, w: 150, kind: 'data', info: 'Ye kya hai: wo database jisme likha hai ki kis user/group/link ka kya role hai: viewer, commenter, editor (Google Drive ke sharing roles bhi yahi teen hain). Session join pe check, cache mein rakho, aur role badalne pe session ko turant batao.' },
        { id: 'gb', label: 'Gateway B', sub: 'WebSockets', x: 590, y: 175, w: 120, kind: 'edge', info: 'Ye kya hai: doosra gateway server, jahan Aman ka WebSocket juda hai. Doc 42 ka channel subscribe kiya hai kyunki iska ek user doc 42 mein hai.' },
        { id: 'a', label: 'Aman', sub: 'browser', x: 650, y: 290, w: 110, kind: 'client', info: 'Ye kya hai: Aman ka browser. Riya ke edits aur uska cursor dono yahan dikhte hain.' },
      ],
      edges: [{ a: 'r', b: 'ga' }, { a: 'ga', b: 'ps' }, { a: 'ga', b: 'ss' }, { a: 'gb', b: 'ps' }, { a: 'gb', b: 'ss' }, { a: 'gb', b: 'a' }, { a: 'ss', b: 'acl' }],
      scenarios: [
        { name: 'Cursor move (presence)', steps: [
          { title: 'Riya ka cursor hila', text: 'Throttled presence update. Session server ya op log tak nahi jaata.', go: 'r>ga>ps', msg: '{ type: "presence", user: "riya", cursor: 11, color: "violet" }', set: { ss: { state: 'dim' } } },
          { title: 'Channel se fan-out', text: 'Doc 42 ke har subscribed gateway ko. Aman ko Riya ka violet cursor dikha.', go: 'evt:ps>gb>a', after: { ss: { state: '' } } },
        ]},
        { name: 'Edit op', steps: [
          { title: 'Riya ne type kiya', text: 'Local screen pe turant. Op gateway se doc session tak.', go: 'r>ga>ss', msg: '{ op: insert "hot " @7, base_rev: 120 }' },
          { title: 'Role check + order', text: 'Riya editor hai (cache se). Op ko rev 121, op log mein durable, phir ack + broadcast.', go: ['ss>acl', 'res:acl>ss'], set: { ss: { sub: 'rev 121' } } },
          { title: 'Sabko', parallel: true, go: ['res:ss>ga>r', 'ss>gb>a'], text: 'Riya ko ack, Aman ko op.' },
        ]},
        { name: 'Viewer edit kare', intro: 'Owner ne Riya ka role editor se viewer kar diya, lekin Riya ka tab abhi khula hai.', steps: [
          { title: 'Role badla', text: 'Permissions service ne session ko event bheja: riya ab viewer. Cache turant update.', go: 'acl>ss', after: { acl: { sub: 'riya = viewer' } } },
          { title: 'Riya type karne ki koshish', text: 'Purana UI ab bhi editable dikh raha tha, op aaya.', go: 'r>ga>ss' },
          { title: 'Reject', text: 'Server pe check hamesha hota hai, client pe bharosa nahi. Op reject, client apna local change ulta (rollback) karta hai aur UI read-only.', go: 'bad:ss>ga>r', msg: '{ type: "error", code: "PERMISSION_DENIED", client_op_id: "r-77" }', after: { acl: { sub: 'viewer/editor' } } },
        ]},
        { name: 'Offline aur wapas', steps: [
          { title: 'Internet gaya', text: 'Riya train mein. Connection toota, lekin editor chalta raha.', go: 'lost:r>ga', set: { r: { state: 'warn', sub: 'offline' } } },
          { title: 'Offline typing', text: 'Riya ne 3 paragraph likhe. Sab local copy pe lage, ops pending list mein (browser storage mein bhi, taaki tab band ho to bhi bache). Is beech Aman ne bhi 40 ops kiye: rev 121 se 160.', focus: ['r'], set: { r: { sub: '35 ops pending' } }, flood: { paths: ['a>gb>ss'], n: 4 } },
          { title: 'Reconnect: "maine 120 tak dekha"', text: 'Riya judti hai, aakhri rev 120 batati hai. Server rev 121-160 bhejta hai; Riya ka client unhe apne pending ops ke against transform karta hai.', go: ['r>ga>ss', 'res:ss>ga>r'], msg: 'resume { last_rev: 120 }  ←  ops 121..160' },
          { title: 'Pending ops bhejo', text: 'Phir Riya ke 35 ops (ek ek karke ya compose karke) jaate hain, server unhe 161 se aage rev deta hai, aur Aman ko broadcast. Dono converge.', go: ['r>ga>ss', 'ss>gb>a'], after: { r: { state: 'ok', sub: 'synced' } } },
        ]},
      ],
    },
    { type: 'callout', tone: 'term', title: 'Naya word: offline edits (pending queue)', html: `<strong>Ye kya hai:</strong> internet jaane pe bhi editor chalta rehta hai. Har naya op screen pe lagta hai aur ek "pending" list mein jama hota hai, browser ki apni storage mein bhi (taaki tab band hone pe bhi bache).<br><strong>Kyun chahiye:</strong> train, flight, kamzor WiFi. User ka kaam rukna nahi chahiye.<br><strong>Iske bina:</strong> connection toot-te hi editor band, ya jo likha wo gayab.<br><strong>Wapas aane pe:</strong> client batata hai "main rev 120 tak dekh chuka hoon". Server beech ke ops bhejta hai, client unhe apne pending ops ke saath milata hai (OT mein transform, CRDT mein seedha merge), phir pending ops bhejta hai.` },
    { type: 'p', html: `<strong>Offline pe asli duniya:</strong> Figma ki 2019 post ke mutabik reconnect pe client document ki fresh copy download karta hai, uske upar apne offline edits dobara lagata hai, phir normal sync shuru. Google ke 2010 protocol mein client "last synced revision" yaad rakhta hai, jo resume ke liye kaafi hai. CRDT libraries (Automerge, Yjs) ka to poora design hi offline ke liye hai: Automerge docs ke mutabik users alag alag kaam karte rahein aur connection milte hi changes automatically merge ho jaate hain. Lamba offline OT mein mehnga hai (bahut ops transform), CRDT mein natural.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Permission check UI mein kar diya, button disable hai, kaafi hai." Nahi. Koi bhi browser console se WebSocket pe op bhej sakta hai. Har op pe <strong>server</strong> role check kare (cache se, taaki fast ho), aur role badalne pe chalu sessions ko turant pata chale. Link sharing ("anyone with the link") bhi ek principal hai jisko role milta hai.` },
    { type: 'h2', text: 'Failure scenarios aur bottlenecks' },
    { type: 'callout', tone: 'term', title: 'Naye words: split brain, lease, checksum', html: `<strong>Split brain</strong>: do servers dono ko lagta hai ki "doc 42 ka owner main hoon" (jaise network thodi der toota aur dono ne ek doosre ko mara hua samjha). Ek doc ke do referee = do alag itihaas.<br><strong>Lease</strong>: <strong>Ye kya hai:</strong> owner hone ki time-limited permission, ek coordination service (jaise ZooKeeper/etcd, <a href="#/coordination">Coordination lesson</a>) se, jo har kuch second renew karni padti hai. <strong>Kyun chahiye:</strong> purana owner renew na kar paaye to permission apne aap khatam, aur tabhi naya owner banta hai. <strong>Iske bina:</strong> split brain.<br><strong>Checksum</strong>: <strong>Ye kya hai:</strong> poore document se nikla ek chhota number (hash). Do copies ka checksum same = copies same (lagbhag pakka). <strong>Kyun chahiye:</strong> transform rule mein bug ho to copies chupchaap alag hoti hain; checksum compare karke pakad lete hain. <strong>Iske bina:</strong> divergence ka pata tab chalega jab user shikayat karega.` },
    { type: 'table', head: ['Kya hua', 'Asar', 'Bachav'], rows: [
      ['Session server crash', 'Sab editors disconnect, memory ka state gaya', 'Op log se recover (snapshot + replay), naya owner, clients last_rev se resume, pending ops dobara'],
      ['Do servers ko lagta hai dono owner hain (split brain)', 'Ek doc ke do itihaas', 'Ownership lease (time-limited, coordination service se), op log mein rev pe conditional write: "rev 18 tabhi likho jab 17 aakhri ho"'],
      ['Ek doc pe 500 editors (live class notes)', 'Ek server, ek doc: hot spot', 'Ops batch/compose karo, presence throttle, sirf editors ko full stream aur viewers ko thoda delayed, editors ki limit'],
      ['Client bahut der offline', 'Hazaaron ops transform karne padenge', 'Fresh snapshot + local edits rebase (Figma jaisa); CRDT ho to seedha merge'],
      ['Op log slow', 'Ack der se, typing to local pe theek', 'Ops ko chhote batches mein likho; Figma jaisa journal; alag partition per doc'],
      ['Bug wala transform rule', 'Copies chupchaap alag (sabse khatarnak)', 'Periodic checksum: client aur server document ka hash compare karein, mismatch pe fresh snapshot'],
      ['Permission revoke', 'Purana tab edit karta rahe', 'Server-side check har op pe, revoke event se session kick'],
    ]},
    { type: 'callout', tone: 'tip', title: 'Decide: OT ya CRDT?', html: `<strong>OT</strong>: jab ek central server waise bhi hai, document mostly online edit hota hai, aur tum ek mature implementation use kar sakte ho (Google Docs ka 2010 wala raasta). <strong>CRDT</strong>: jab offline-first ya peer-to-peer chahiye, ya central ordering server nahi rakhna (Yjs, Automerge). <strong>Simple LWW per property</strong>: jab data text nahi, alag alag fields/objects hai (Figma ka raasta). Interview mein ek line: "Text ke liye OT ya sequence CRDT, ek per-document server ke saath; metadata ke liye LWW."` },
    { type: 'h2', text: 'Interview mein kaise bolein' },
    { type: 'list', ordered: true, items: [
      `<strong>Requirements:</strong> real-time multi-user editing, convergence + intent, presence, sharing roles, version history, offline. Local typing kabhi network ka wait na kare.`,
      `<strong>Shape of load:</strong> total ops bahut, lekin har doc chhota aur independent → doc_id se shard, ek owner per doc.`,
      `<strong>Merge:</strong> naive kyun toota (example do), OT transform ya CRDT IDs, tie-break rule, ek in-flight op + revision numbers.`,
      `<strong>Storage:</strong> append-only op log (pehle durable, phir ack) + periodic snapshots; version history muft.`,
      `<strong>Extras:</strong> presence ephemeral via pub/sub, server-side permission check, offline resume with last_rev.`,
      `<strong>Failures:</strong> owner crash → replay + resume, split brain → lease + conditional append, divergence → checksums.`,
    ]},
    { type: 'diagram', title: 'Poora design, ek nazar mein', height: 520,
      caption: 'Edits ek document ke owner (session server) se guzarte hain, jo order deta hai aur pehle op log mein likhta hai. Cursors alag, pub/sub se. Purane versions aur sharing normal REST API se. Upar ke buttons se ek-ek raasta dekho.',
      groups: [
        { label: 'Clients', x: 10, y: 30, w: 700, h: 100 },
        { label: 'Connections', x: 10, y: 148, w: 700, h: 104 },
        { label: 'Services', x: 10, y: 270, w: 700, h: 104 },
        { label: 'Data', x: 10, y: 392, w: 700, h: 112 },
      ],
      nodes: [
        { id: 'riya', label: 'Riya', sub: 'browser, local copy', x: 180, y: 82, kind: 'client', info: 'Ye kya hai: Riya ka browser. Document ki apni copy, pending ops ki list aur last seen rev rakhta hai. Apna edit turant screen pe lagata hai (optimistic), server ka intezaar nahi.' },
        { id: 'aman', label: 'Aman', sub: 'offline-capable', x: 540, y: 82, kind: 'client', info: 'Ye kya hai: Aman ka browser. Offline hone pe bhi editing chalti hai: ops browser storage mein pending rehte hain, aur wapas aane pe "maine rev N tak dekha" bol ke resume.' },
        { id: 'gwA', label: 'Gateway A', sub: 'WebSockets', x: 180, y: 202, kind: 'edge', info: 'Ye kya hai: wo server jahan Riya ka WebSocket juda hai. Edits ko doc ke owner tak, cursor updates ko pub/sub channel tak bhejta hai.' },
        { id: 'router', label: 'Doc router', sub: 'doc_id → owner', x: 360, y: 202, w: 130, kind: 'net', info: 'Ye kya hai: per-document routing. doc_id dekh ke batata hai ki is document ka owner session server kaun hai (consistent hashing ya registry + lease). Isi se ek doc ke saare editors ek hi server pe.' },
        { id: 'gwB', label: 'Gateway B', sub: 'WebSockets', x: 540, y: 202, kind: 'edge', info: 'Ye kya hai: doosra gateway, jahan Aman juda hai. Doc 42 ka pub/sub channel subscribe karta hai kyunki iska ek user doc 42 mein hai.' },
        { id: 'api', label: 'Docs API', sub: 'REST', x: 85, y: 322, w: 130, kind: 'server', info: 'Ye kya hai: normal request-response API: document list, kholna, share karna, version history dekhna aur restore. Real-time editing isse nahi hoti.' },
        { id: 'ss', label: 'Session server', sub: 'doc 42 owner', x: 360, y: 322, w: 150, kind: 'server', info: 'Ye kya hai: doc 42 ka referee. Document memory mein, har op ko rev number, OT transform (ya CRDT merge), pehle op log mein likhna, phir ack aur broadcast. Har op pe role check.' },
        { id: 'ps', label: 'Pub/sub', sub: 'channel doc:42', x: 600, y: 322, w: 140, kind: 'queue', info: 'Ye kya hai: presence ka message board. Cursor aur naam yahan publish, doc 42 sunne wale gateways ko turant copy. Kuch save nahi hota; ek update khoya to agla aa raha hai.' },
        { id: 'meta', label: 'Metadata + ACL', sub: 'SQL', x: 95, y: 452, w: 150, kind: 'data', info: 'Ye kya hai: document ka title, owner, aur kis user/group/link ka kya role (viewer, commenter, editor). Session server role cache karta hai aur har op pe check karta hai.' },
        { id: 'log', label: 'Op log', sub: 'append-only', x: 320, y: 452, kind: 'data', info: 'Ye kya hai: har accepted op (doc_id, rev, op, user) ki list, partition key doc_id. Ack se pehle yahan durable. Crash recovery aur version history isi se.' },
        { id: 'snap', label: 'Snapshots', sub: 'object storage', x: 540, y: 452, kind: 'data', info: 'Ye kya hai: har kuch hazaar ops pe poore document ki copy (rev ke saath). Kholna ya purana version = nazdeeki snapshot + thode ops replay. Named versions ke snapshots kabhi delete nahi.' },
      ],
      edges: [
        { a: 'riya', b: 'gwA', n: 1, label: 'op' }, { a: 'gwA', b: 'ss', n: 2 }, { a: 'ss', b: 'log', n: 3, label: 'append' },
        { a: 'ss', b: 'gwB', n: 4 }, { a: 'gwB', b: 'aman', n: 5 },
        { a: 'gwA', b: 'router', dashed: true }, { a: 'gwB', b: 'router', dashed: true },
        { a: 'gwA', b: 'ps', kind: 'evt' }, { a: 'ps', b: 'gwB', kind: 'evt', label: 'cursor' },
        { a: 'ss', b: 'snap', label: 'har K ops' }, { a: 'ss', b: 'meta', dashed: true, label: 'role?' },
        { a: 'riya', b: 'api', via: [[16, 110], [16, 262], [110, 262]], label: 'REST' }, { a: 'api', b: 'meta' }, { a: 'api', b: 'snap' }, { a: 'api', b: 'log' },
      ],
      paths: [
        { name: 'Type a letter', text: 'Riya ki screen pe turant. Op gateway se doc ke owner tak; owner rev deta hai, op log mein durable likhta hai, phir Riya ko ack aur Aman ko op.', go: ['riya>gwA>ss>log', 'ss>gwB>aman'] },
        { name: 'Two users at once', text: 'Dono ke ops ek hi owner pe pahunchte hain (router ki wajah se). Jo pehle aaya use rev 18, doosre ko transform karke rev 19. Dono browsers bhi aane wale op ko apne pending op ke against transform karte hain.', go: ['riya>gwA>ss', 'aman>gwB>ss', 'ss>log', 'gwA>router', 'gwB>router'] },
        { name: 'Cursor move', text: 'Presence op log ya owner tak nahi jaata. Gateway A pub/sub channel doc:42 pe daalta hai, Gateway B se Aman ko Riya ka cursor dikhta hai. Throttled, kuch save nahi.', go: ['riya>gwA>ps>gwB>aman'] },
        { name: 'Open old version', text: 'REST API: pehle role check, phir rev N se pehle ka snapshot + N tak ke ops op log se replay. Restore = naya op upar, itihaas nahi mitta.', go: ['riya>api>meta', 'api>snap', 'api>log'] },
        { name: 'Offline edit', text: 'Aman wapas online: router se owner mila, "maine rev 120 tak dekha" bataya, beech ke ops liye, apne pending ops transform karke bheje. Owner unhe log mein likhta hai aur Riya ko broadcast.', go: ['aman>gwB>router', 'gwB>ss>log', 'ss>gwA>riya'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Poora document save karna = last-write-wins = kisi ka text chupchaap gayab. Isliye chhote ops bhejo.</li>
      <li>Apna edit turant apni screen pe (optimistic), ops WebSocket pe, har op ke saath base_rev.</li>
      <li>Ek document ka ek owner session server (doc_id se routing): order ka ek hi sach, rev numbers.</li>
      <li>OT: aane wale op ki position un ops ke hisaab se adjust karo jo usne nahi dekhe; same jagah pe tie-break rule.</li>
      <li>CRDT: har character ki permanent ID + tombstones; kisi bhi order mein merge, offline/peer-to-peer ke liye natural.</li>
      <li>Op log pehle (durable), phir ack. Snapshots se kholna fast. Version history = snapshot + replay.</li>
      <li>Presence (cursors) alag aur ephemeral: pub/sub, throttle, kabhi disk pe nahi.</li>
      <li>Permission check hamesha server pe, har op pe.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['Per-document owner: ek order ka sach, cross-server locks nahi', 'Optimistic local apply: typing hamesha instant', 'Op log: crash recovery, version history, audit', 'Snapshots: purane docs bhi jaldi khulte hain', 'Presence alag aur ephemeral: storage pe bojh nahi'],
      costs: ['Session servers stateful: deploy/crash pe reconnect storm aur state rebuild', 'Ek bahut popular doc ek server pe hot spot', 'OT: har op-type jode ke rules, bugs chupchaap divergence', 'CRDT: har character ki ID + tombstones, memory zyada', 'Pehle durable phir ack: har op pe write latency', 'Offline lamba ho to merge mehnga ya intent unexpected'],
    },
    { type: 'think', questions: [
      { q: 'Riya ne ek paragraph delete kiya aur usi waqt Aman us paragraph ke beech mein ek word likh raha tha. OT aur CRDT mein Aman ke word ka kya hoga? Kya ye "sahi" hai?', a: 'Dono mein convergence hogi, lekin intent pe sawaal hai. Achhe OT rules mein Riya ki copy pe Aman ka insert delete ki shuruaat pe khisak jaata hai, aur Aman ki copy pe Riya ka delete do tukdon mein toot jaata hai (word ke pehle aur baad), taaki Aman ka word dono jagah bache. CRDT mein Aman ke word ka origin tombstone hai, lekin word khud visible rehta hai. Dono "kisi ka text nahi khoya" ko choose karte hain. Product chahe to user ko highlight karke dikha sakta hai. Sabak: convergence guaranteed hai, "perfect intent" nahi.' },
      { q: 'Ek doc pe 2,000 log ek live lecture ke notes dekh rahe hain, 5 edit kar rahe hain. Design kaise badloge?', a: 'Editors aur viewers alag: 5 editors doc session server se full sync. 2,000 viewers ko ops ka stream pub/sub/gateways ke through fan-out, thoda batch karke (har 200 ms). Presence sirf editors ki dikhao ya count dikhao. Viewers ko initial load ke liye snapshot CDN-friendly ho sakta hai. Session server ka kaam editors ki sankhya pe tike, viewers pe nahi.' },
      { q: 'Session server ne op ko rev 18 diya, broadcast kiya, lekin op log write fail ho gaya aur phir crash. Kya galat hua aur order kya hona chahiye?', a: 'Doosre clients ke paas rev 18 hai jo log mein nahi; recovery ke baad naya server rev 18 kisi aur op ko de dega aur copies alag ho jaayengi. Sahi order: pehle durable append (conditional, rev 18 tabhi jab 17 aakhri), phir ack aur broadcast. Agar append fail, to op reject/retry, kisi ko bhejo hi mat.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Ek document ke saare editors ko ek hi session server pe kyun bhejte hain?', options: ['Sasta hai', 'Ek owner ops ko ek single order (rev numbers) deta hai, cross-server locking ke bina', 'WebSocket sirf ek server se judta hai'], answer: 1, explain: 'Do servers ek hi doc ke ops alag order mein accept karein to do itihaas ban jaate hain. Ek owner per doc se order ka ek sach, aur alag docs alag servers pe se load bhi bant jaata hai.' },
      { q: 'Riya ne position 2-6 delete kiya, Aman ne usi waqt position 7 pe insert kiya. OT Riya ki copy pe Aman ka op kaise badlega?', options: ['Position 7 hi rahegi', 'Position 2 (5 peeche), kyunki uske pehle 5 characters mit chuke hain', 'Op drop ho jaayega'], answer: 1, explain: 'Transform: jo op pehle lag chuka hai uske hisaab se positions adjust. Delete range ke baad wali position delete length se peeche khisakti hai.' },
      { q: 'Text CRDT positions ki jagah kya use karta hai?', options: ['Timestamps', 'Har character ki permanent unique ID, aur insert "is ID ke baad" bolta hai', 'Server ke rev numbers'], answer: 1, explain: 'IDs kabhi nahi badalte, isliye kisi bhi order mein ops lagao, result same. Delete tombstone banata hai taaki references bache rahein.' },
      { q: 'Cursor positions (presence) op log mein kyun nahi likhte?', options: ['Wo secret hain', 'Bahut baar badalte hain aur unhe save karne ki zaroorat nahi; ephemeral pub/sub kaafi hai', 'Op log mein jagah nahi'], answer: 1, explain: 'Presence ka koi itihaas kaam ka nahi. Log mein daalne se storage aur replay dono bekaar badhte. Yjs ka awareness bhi document mein store nahi hota.' },
      { q: 'Riya aur Aman dono ne poora document "Save" kiya. Server last-write-wins karta hai. Kya hoga?', options: ['Dono ke edits jud jaayenge', 'Jiska save baad mein pahuncha sirf wahi bachega; doosre ka edit chupchaap gayab', 'Server error dega'], answer: 1, explain: 'LWW poore document ko ek value maanta hai. Baad wala save pehle wale ko overwrite karta hai, bina error ke. Isliye chhote ops bhejte hain jo jode ja sakein.' },
      { q: 'Rev 10,250 ka purana version dikhana hai. Snapshots har 1,000 revs pe hain. Sabse sasta tareeka?', options: ['Rev 1 se 10,250 ops replay', 'Rev 10,000 ka snapshot lo aur 250 ops replay karo', 'Latest document se ops ulte chalao'], answer: 1, explain: 'Nazdeeki pehle wala snapshot + thode ops. Isi liye snapshot aur op log dono rakhte hain.' },
      { q: 'Server op ko ack kab bheje?', options: ['Memory mein lagate hi', 'Op log mein durable likhne ke baad', 'Snapshot banne ke baad'], answer: 1, explain: 'Ack ka matlab "tumhara edit safe hai". Memory-only ack ke baad crash = user ka edit gayab. Snapshot ka intezaar bahut lamba hoga.' },
    ]},
    { type: 'sources', note: 'Google Docs ki specific baatein 2010 ki official blog series se hain (15 saal purani; aaj ka internal design public nahi). Routing, pub/sub presence aur failure handling ke kuch hisse aam industry approach hain, jaisa text mein likha hai.', items: [
      { title: "What's different about the new Google Docs: Conflict resolution", publisher: 'Google Drive Blog (John Day-Richter)', year: 2010, official: true, url: 'https://drive.googleblog.com/2010/09/whats-different-about-new-google-docs_22.html', used: 'Document as a revision log replayed from the start; InsertText/DeleteText/ApplyStyle; example of a misapplied delete; OT shift idea; style-range transform examples.' },
      { title: "What's different about the new Google Docs: Making collaboration fast", publisher: 'Google Drive Blog', year: 2010, official: true, url: 'https://drive.googleblog.com/2010/09/whats-different-about-new-google-docs.html', used: 'Collaboration protocol: client and server state, one pending change at a time, acks, server transforms against revisions the client missed, optimistic local apply, character-by-character collaboration.' },
      { title: 'Google Wave Operational Transformation (whitepaper)', publisher: 'Google (Wang, Mah, Lassen), Apache Wave archive', year: 2010, official: true, url: 'https://svn.apache.org/repos/asf/incubator/wave/whitepapers/operational-transform/operational-transform.html', used: 'Client-server OT based on Jupiter; client waits for ack before sending more; composing pending ops; single server history.' },
      { title: "How Figma's multiplayer technology works", publisher: 'Figma blog (Evan Wallace)', year: 2019, official: true, url: 'https://www.figma.com/blog/how-figmas-multiplayer-technology-works/', used: 'WebSockets, one server process per document as authority, why not OT, CRDT-inspired LWW per property, unacknowledged local changes win, reconnect = fresh copy + reapply offline edits.' },
      { title: 'Making multiplayer more reliable', publisher: 'Figma blog (Darren Tsung)', year: 2022, official: true, url: 'https://www.figma.com/blog/making-multiplayer-more-reliable/', used: 'Checkpoints every 30-60 s to S3, up to 60 s at risk, DynamoDB-backed journal with sequence numbers, 95% of edits saved within 600 ms, recovery = checkpoint + journal replay.' },
      { title: 'CRDTs: The Hard Parts', publisher: 'Martin Kleppmann (Hydra conference talk)', year: 2020, url: 'https://martin.kleppmann.com/2020/07/06/crdt-hard-parts-hydra.html', used: 'Interleaving anomaly, moving list items and trees, metadata overhead and Automerge columnar encoding; text CRDTs give each character a unique ID.' },
      { title: 'Interleaving anomalies in collaborative text editors (PaPoC 2019)', publisher: 'Kleppmann, Gomes, Mulligan, Beresford', year: 2019, url: 'https://martin.kleppmann.com/2019/03/25/papoc-interleaving-anomalies.html', used: 'Interleaving observed in Logoot and LSEQ, not in RGA.' },
      { title: 'Yjs docs: introduction and awareness', publisher: 'Yjs', official: true, url: 'https://docs.yjs.dev/getting-started/adding-awareness', used: 'Network-agnostic CRDT with shared types; awareness for cursors/names/colours is not stored in the document and is removed when a user disconnects.' },
      { title: 'Automerge: welcome / hello', publisher: 'Automerge', official: true, url: 'https://automerge.org/docs/hello/', used: 'Local-first CRDT, JSON-like documents, works offline and merges when reconnected, keeps history.' },
      { title: "Find what's changed in a file (version history)", publisher: 'Google Docs Editors Help', official: true, url: 'https://support.google.com/docs/answer/190843', used: 'Version history via Last edit; view, restore and copy earlier versions; named versions (up to 40 per document); versions may be merged; edit permission needed to see history.' },
      { title: 'High-latency, low-bandwidth windowing in the Jupiter collaboration system (UIST 1995)', publisher: 'Nichols, Curtis, Dixon, Lamping (Xerox PARC), ACM', year: 1995, url: 'https://dl.acm.org/doi/10.1145/215585.215706', used: 'The client-server OT system that the Google Wave OT design is based on (named in the table).' },
      { title: 'Share files from Google Drive', publisher: 'Google Docs Editors Help', official: true, url: 'https://support.google.com/docs/answer/2494822', used: 'Viewer, commenter and editor roles; restricted vs anyone-with-the-link access.' },
    ]},
  ],
});
