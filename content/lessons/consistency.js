Lesson.register({
  id: 'consistency',
  title: 'Consistency models aur quorums',
  minutes: 25,
  summary: `"Consistent" ek switch nahi, ek seedhi (ladder) hai: linearizable se eventual tak. Har seedhi ki keemat alag hai. Is lesson mein har level ka matlab xyz.com ke examples se, N/W/R quorums ka khel (slider ke saath), aur jab do copies takraayein to unhe merge kaise karte hain: last-write-wins, vector clocks aur CRDTs.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `xyz.com ka data kai machines pe copy hokar rakha hai. Jab Riya kuch badalti hai, to ye badlaav har copy tak ek saath nahi pahunchta.<br>To beech ke us chhote time mein koi aur user kya dekhega? Naya data, purana data, ya kuch ulta-pulta?<br>Is sawaal ke alag alag "vaade" hote hain. Kuch vaade bahut pakke (lekin slow), kuch dheele (lekin tez). Is lesson mein har vaada ek kahani aur ek chhote khel ke saath, phir ye ki kitni copies se poochhna kaafi hai (quorum), aur jab do copies aapas mein takraayein to kya karein.` },
    { type: 'h2', text: 'Problem: "consistent" ka matlab kya?' },
    { type: 'p', html: `CAP lesson mein CAP wala C dekha: linearizability, sabse strong vaada. Lekin wo mehnga hai: har read ya write pe majority ka wait, door ke regions tak round trips, aur partition mein errors. xyz.com ke har feature ko itna mehnga vaada nahi chahiye.` },
    { type: 'list', items: [
      `Riya ne comment kiya. <strong>Use khud</strong> apna comment turant dikhna chahiye. Aman ko 2 second baad dikhe to koi baat nahi.`,
      `Chat mein Aman ka reply ("haan, chalte hain!") kabhi bhi Riya ke sawaal ("movie chalein?") se <strong>pehle</strong> nahi dikhna chahiye.`,
      `Video ka view count 10 second purana ho to bhi chalega.`,
      `Username "riya" do logon ko kabhi nahi milna chahiye, chahe kuch bhi ho.`,
    ]},
    { type: 'p', html: `Chaar features, chaar alag vaade. Agar tum sabke liye sabse strong level lo, to site slow aur mehngi. Sabke liye sabse weak lo, to bugs. Isliye levels ke naam aur matlab jaanna zaroori hai: taaki <strong>jitna chahiye utna hi vaada karo, usse zyada mehnga nahi</strong>.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Consistency model', html: `<strong>Ye kya hai:</strong> system aur developer ke beech ek contract (vaada): "reads mein tumhe kaun kaun se values dikh sakte hain, aur kaun se <em>kabhi nahi</em>."<br><strong>Kyun chahiye:</strong> jab copies kai hon, to "read kya laayega" ka jawab apne aap saaf nahi hota. Model batata hai ki app kis cheez pe bharosa kar sakti hai.<br><strong>Iske bina:</strong> developer maan leta hai "hamesha latest milega", aur production mein purana data aate hi bug.<br><strong>Rule:</strong> jitna strong model, utne kam "ajeeb" results possible, aur utni zyada coordination (machines ka aapas mein poochhna) chahiye, yaani zyada latency.` },
    { type: 'ascii', text: `
STRONG  (zyada coordination, zyada latency, partition mein errors)
  │
  │   Linearizable      ── jaise ek hi copy ho, real time order
  │   Sequential        ── sab ek hi order dekhein (real time zaroori nahi)
  │   Causal            ── "wajah" hamesha "nateeje" se pehle dikhe
  │   Read-your-writes  ┐
  │   Monotonic reads   ┘ ── ek user ke session ke vaade
  │   Eventual          ── aakhir mein sab same, beech mein kuch bhi
  ▼
WEAK    (fast, partition mein bhi chalta, ajeeb results possible)`, caption: 'Consistency ki seedhi. Upar wala model neeche walon ke saare vaade bhi deta hai.' },

    { type: 'h2', text: 'Seedhi ka har step, timeline ke saath' },
    { type: 'p', html: `Har model ke liye ek chhota timeline: left mein jo read <strong>allowed</strong> hai, right mein jo <strong>forbidden</strong> (mana) hai. Time left se right chalta hai. <code>[----]</code> ek operation hai: shuru se khatam tak.` },

    { type: 'h3', text: '1. Strong / linearizable' },
    { type: 'callout', tone: 'term', title: 'Linearizable (strong consistency)', html: `<strong>Ye kya hai:</strong> system aise behave kare jaise data ki <strong>ek hi copy</strong> ho. Har operation apne shuru aur khatam ke beech kisi ek pal mein "ho jaata" hai. Jo write khatam ho chuka, uske baad shuru hua har read use (ya usse naya) dekhega. Aur agar kisi ek read ne naya value dekh liya, to uske baad koi bhi read purana nahi dekh sakta.<br><strong>Kyun chahiye:</strong> username, seat, balance jaisi cheezon mein "thoda purana" bhi galat faisla karwa deta hai.<br><strong>Iske bina:</strong> Riya ne naam "riya_s" kar liya, OK bhi mil gaya, phir bhi Aman ko purana naam "riya" khaali dikhta hai aur wo use le leta hai.<br><strong>Example:</strong> Riya ka write 10:00:00.000 se 10:00:00.050 tak chala. Aman ka read 10:00:00.080 pe shuru hua: use naya naam hi milna chahiye. Agar Aman ka read 10:00:00.020 pe shuru hota (write ke beech mein), to purana ya naya, dono chalte.` },
    { type: 'compare',
      left: { title: 'Allowed', ascii: `
Riya:  [ username = riya_s ]
                        ↑ done
Aman:                      [ read ] → riya_s ✓` },
      right: { title: 'Forbidden', ascii: `
Riya:  [ username = riya_s ]
                        ↑ done
Aman:                      [ read ] → riya   ✗
(write khatam ho chuka tha,
 phir bhi purana naam)` },
    },
    { type: 'p', html: `<strong>xyz.com mein kahan:</strong> unique username, seat lock, wallet balance, distributed lock. <strong>Keemat:</strong> har write (aur aksar har read) pe majority/leader se coordination; partition mein minority side ruk jaati hai (CAP lesson).` },

    { type: 'h3', text: '2. Sequential' },
    { type: 'callout', tone: 'term', title: 'Sequential consistency', html: `<strong>Ye kya hai:</strong> saare operations ka <strong>ek hi order</strong> hai jo sab log dekhte hain, aur har user ke apne operations usi order mein hain jismein usne kiye. Lekin wo order real time (ghadi ka time) se match kare, ye zaroori nahi. Kisi ko thoda peeche ka "snapshot" dikh sakta hai, bas sabka order same hona chahiye.<br><strong>Kyun chahiye:</strong> agar do log alag order dekhein ("pehle A phir B" vs "pehle B phir A"), to dono alag nateeje nikaalte hain.<br><strong>Iske bina:</strong> Neha ko lagta hai Riya ne pehle post kiya, Kabir ko lagta hai Aman ne; dono ke screens pe alag kahani.<br><strong>Example:</strong> Riya ka write khatam ho gaya, phir bhi Aman purana value padh sakta hai (linearizable mein ye mana tha). Lekin jab Aman ne ek baar naya value dekh liya, uske agle read mein purana kabhi nahi.` },
    { type: 'compare',
      left: { title: 'Allowed', ascii: `
Riya posts:  P1 ........ P2
Aman posts:       A1

Neha dekhti: P1, A1, P2  ✓
Kabir dekhta: P1, A1      ✓
 (P2 abhi nahi pahuncha,
  lekin order wahi)` },
      right: { title: 'Forbidden', ascii: `
Neha dekhti:  P1, A1
Kabir dekhta: A1, P1   ✗
 (do log alag order dekh
  rahe hain)
Ya: P2 dikhe, P1 nahi    ✗` },
    },
    { type: 'p', html: `Linearizable se farak: linearizable mein real time bhi maayne rakhta hai (khatam hua write ke baad purana nahi). Sequential mein sirf "sab ek order pe agree karein" chahiye. Practical databases mein ye kam hi alag se bola jaata hai; zyaadatar ya to linearizable milta hai ya causal se kamzor.` },

    { type: 'h3', text: '3. Causal' },
    { type: 'callout', tone: 'term', title: 'Causal consistency', html: `<strong>Ye kya hai:</strong> agar ek operation doosre ki <strong>wajah</strong> se hua (usne pehle wala dekha aur uske jawab mein kiya), to har koi pehle "wajah" dekhega, phir "nateeja". Jin operations ka aapas mein koi rishta nahi (<strong>concurrent</strong>, yaani kisi ko doosre ka pata nahi tha), unka order alag logon ko alag dikh sakta hai.<br><strong>Kyun chahiye:</strong> jawab bina sawaal ke dikhe to bakwaas lagta hai; "block" se pehle "post" dikhe to galat log post dekh lete hain.<br><strong>Iske bina:</strong> Neha ko "haan, chalte hain!" dikhta hai, lekin "movie chalein?" nahi.<br><strong>Example:</strong> Riya: "movie chalein?" → Aman (padh ke): "haan!" → Kabir (alag se): "hello". Neha ko "hello" kahin bhi dikh sakta hai, lekin "haan!" hamesha sawaal ke baad.` },
    { type: 'compare',
      left: { title: 'Allowed', ascii: `
Riya: "movie chalein?"
Aman (padh ke): "haan!"
Kabir (alag se): "hello"

Neha: question, hello, haan ✓
Ishan: hello, question, haan ✓
 (hello concurrent hai,
  kahin bhi aa sakta)` },
      right: { title: 'Forbidden', ascii: `
Neha dekhti hai:
  "haan!"
  ... question abhi nahi  ✗

(jawab dikha, sawaal nahi:
 wajah se pehle nateeja)` },
    },
    { type: 'p', html: `<strong>xyz.com mein kahan:</strong> chat, comment threads ("reply" apne parent se pehle kabhi nahi), "maine Riya ko block kiya, phir post kiya" (block pehle lagna chahiye). Causal consistency partition mein bhi chal sakti hai (agar client apne replica se juda rahe), isliye ye AP systems ke liye sabse strong practical level maana jaata hai.` },

    { type: 'h3', text: '4. Read-your-writes aur 5. Monotonic reads' },
    { type: 'p', html: `Ye dono <strong>session guarantees</strong> hain: poore system ka nahi, sirf <em>ek user ke apne session</em> ka vaada. Replication lesson mein inko lag wale timeline widget ke saath dekha tha; yahan sirf yaad dilana:` },
    { type: 'callout', tone: 'term', title: 'Read-your-writes', html: `<strong>Ye kya hai:</strong> jo <strong>tumne khud</strong> likha, wo tumhe apne agle reads mein hamesha dikhega. Doosron ke liye koi vaada nahi.<br><strong>Kyun chahiye:</strong> user ko lagta hai uska kaam "save" hua. Refresh pe gayab dikhe to wo dobara post karta hai (duplicate) ya ghabra jaata hai.<br><strong>Iske bina:</strong> Riya comment karti hai, refresh karti hai, aur read ek peeche chal rahe replica pe chala gaya: comment gayab!<br><strong>Example:</strong> Riya ka comment leader pe 10:00:00 pe likha gaya, replica 2 second peeche hai. Agle 5 second Riya ke apne reads leader se: comment hamesha dikhta hai. Aman ke reads replica se: 2 second baad dikhe to bhi theek.` },
    { type: 'callout', tone: 'term', title: 'Monotonic reads', html: `<strong>Ye kya hai:</strong> ek user ke reads <strong>time mein peeche nahi jaate</strong>. Jo ek baar dekh liya, uske baad usse purana kabhi nahi dikhega. ("Monotonic" = sirf ek direction mein badhne wala.)<br><strong>Kyun chahiye:</strong> refresh karne pe cheezein gayab hokar wapas aayein to user ko lagta hai data kho gaya.<br><strong>Iske bina:</strong> Aman ko pehle 5 comments dikhe, refresh pe 4 (doosre, peeche wale replica se), phir 5. Ajeeb.<br><strong>Example:</strong> Aman ko hamesha replica 2 se jodo (sticky routing). Replica 2 khud kabhi peeche nahi jaata, to Aman ka view bhi nahi.` },
    { type: 'compare',
      left: { title: 'Read-your-writes', ascii: `
Riya: [ comment "wah!" ]
Riya:                  [ refresh ] → "wah!" dikha ✓
Riya:                  [ refresh ] → gayab        ✗
Aman:                  [ refresh ] → abhi nahi    ✓
 (Aman ke liye vaada nahi)` },
      right: { title: 'Monotonic reads', ascii: `
Aman: [ read ] → 5 comments
Aman:          [ read ] → 5 ya zyada  ✓
Aman:          [ read ] → 4           ✗
 (time peeche nahi jaata:
  jo dekh liya, wo wapas
  gayab nahi hota)` },
    },
    { type: 'p', html: `<strong>Fix (replication lesson se):</strong> read-your-writes ke liye apne likhe ke kuch seconds baad tak reads leader se, ya replica tab tak ruke jab tak wo user ke last write ki position tak na pahunch jaaye. Monotonic reads ke liye user ko hamesha same replica pe chipka do (sticky routing).` },

    { type: 'h3', text: '6. Eventual consistency' },
    { type: 'callout', tone: 'term', title: 'Eventual consistency', html: `<strong>Ye kya hai:</strong> agar naye writes aana band ho jaayein, to <strong>aakhir mein</strong> saari copies same value pe pahunch jaayengi. Beech mein koi bhi copy koi bhi (purana) value de sakti hai, aur "aakhir mein" kitni der baad, iska koi vaada nahi.<br><strong>Kyun chahiye:</strong> ye sabse sasta aur sabse tez hai, aur partition mein bhi har replica chalti rehti hai. Views, likes, recommendations ke liye kaafi.<br><strong>Iske bina (yaani hamesha strong):</strong> har view count pe majority ka wait: site slow aur mehngi, bina kisi faayde ke.<br><strong>Example:</strong> video ke views 1000 se 1003 hue. Replica B thodi der 1000 dikhata hai, phir 1003. Koi nuksaan nahi.` },
    { type: 'compare',
      left: { title: 'Allowed', ascii: `
views: 1000 → 1003 (likha)
Replica A: 1003
Replica B: 1000  (abhi purana) ✓
...thodi der baad...
Replica B: 1003              ✓` },
      right: { title: 'Forbidden', ascii: `
Writes band ho gaye,
ghante beet gaye,
Replica A: 1003
Replica B: 1000  hamesha ke
liye                      ✗` },
    },
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `"Eventual" ka matlab "kuch seconds" nahi hai. Normal din pe copies milliseconds mein mil jaati hain, lekin model koi time limit nahi deta. Partition, overloaded replica ya bug mein ye minutes ya ghante bhi ho sakta hai. Isliye eventual consistency pe chalne wale feature ko <strong>purane aur ulte-pulte reads ke saath bhi sahi kaam karna</strong> chahiye.` },

    { type: 'h3', text: 'Timeline lab: har model mein kaun se reads allowed hain?' },
    { type: 'p', html: `Ab khud khelo. Upar se ek model chuno. Timeline mein <strong>W</strong> = write, <strong>R</strong> = read; patti jitni lambi, operation utni der chala. Har read ke neeche uske possible jawab hain: kisi pe click karo aur dekho ki is model mein wo <strong>allowed</strong> hai ya <strong>forbidden</strong>, aur kyun. Kuch reads ka jawab pichhle read pe depend karta hai: pehle wala chuno.` },
    { type: 'custom', render(el) {
      const M = [
        { k: 'lin', name: 'Linearizable', setup: 'Shuru mein bio = v1. Riya bio = v2 likhti hai (time 10 se 60).', rows: [['Riya', [[10, 60, 'w', 'W: v2']]], ['Aman', [[15, 30, 'r', 'R1']]], ['Neha', [[35, 50, 'r', 'R2']]], ['Kabir', [[70, 90, 'r', 'R3']]]],
          reads: [
            { id: 'R1', who: 'Aman, time 15-30', c: [['v1', () => true, () => 'Write abhi chal raha hai (10-60). Overlap wale read ko purana ya naya, dono chalte hain.'], ['v2', () => true, () => 'Write chal raha hai, ho sakta hai wo isi pal "ho gaya" ho. Naya bhi allowed.']] },
            { id: 'R2', who: 'Neha, time 35-50', dep: 'R1', c: [['v1', p => p !== 'v2', p => p === 'v2' ? 'Forbidden: R1 (jo pehle khatam hua) v2 dekh chuka. Linearizable mein uske baad shuru hua koi bhi read purana nahi dekh sakta.' : 'R1 ne bhi v1 dekha tha, aur write abhi chal raha hai: v1 abhi bhi chalega.'], ['v2', () => true, () => 'Write chal raha hai; naya dikhna hamesha theek.']] },
            { id: 'R3', who: 'Kabir, time 70-90', c: [['v1', () => false, () => 'Forbidden: write 60 pe khatam ho chuka, ye read 70 pe shuru hua. Ab sirf naya.'], ['v2', () => true, () => 'Write khatam hone ke baad shuru hua read: naya value hi.']] },
          ] },
        { k: 'seq', name: 'Sequential', setup: 'Shuru mein bio = v1. Riya bio = v2 likhti hai (10-30). Aman do baar padhta hai, write khatam hone ke baad.', rows: [['Riya', [[10, 30, 'w', 'W: v2']]], ['Aman', [[45, 60, 'r', 'R1'], [70, 90, 'r', 'R2']]]],
          reads: [
            { id: 'R1', who: 'Aman, time 45-60', c: [['v1', () => true, () => 'Allowed! Write khatam ho chuka, phir bhi. Sequential mein real time zaroori nahi: order "Aman ka read, phir Riya ka write" bhi ek valid order hai. (Linearizable mein ye forbidden tha.)'], ['v2', () => true, () => 'Allowed: order "Riya ka write, phir Aman ka read".']] },
            { id: 'R2', who: 'Aman, time 70-90', dep: 'R1', c: [['v1', p => p !== 'v2', p => p === 'v2' ? 'Forbidden: R1 ne v2 dekha, matlab order mein write R1 se pehle hai. R2 to R1 ke baad hai, to purana v1 kisi bhi order mein nahi aa sakta.' : 'Allowed: order "R1, R2, phir write" bhi valid hai.'], ['v2', () => true, () => 'Allowed: write R2 se pehle rakh do.']] },
          ] },
        { k: 'cau', name: 'Causal', setup: 'Chat. Riya: Q = "movie chalein?". Aman ne Q padha, phir A = "haan!" likha. Kabir ne alag se H = "hello" likha. Neha baad mein chat kholti hai.', rows: [['Riya', [[5, 20, 'w', 'W: Q']]], ['Aman', [[25, 35, 'r', 'R: Q'], [40, 55, 'w', 'W: A']]], ['Kabir', [[20, 40, 'w', 'W: H']]], ['Neha', [[65, 85, 'r', 'R1']]]],
          reads: [
            { id: 'R1', who: 'Neha ko kaunsi list dikh sakti hai', c: [['Q, A', () => true, () => 'Allowed: sawaal pehle, jawab baad mein. H abhi nahi pahuncha, theek hai.'], ['A', () => false, () => 'Forbidden: jawab dikha, sawaal nahi. A ki wajah Q hai, to Q pehle dikhna chahiye.'], ['H, Q, A', () => true, () => 'Allowed: H concurrent hai (kisi ne kisi ko nahi dekha), kahin bhi aa sakta hai.'], ['A, Q', () => false, () => 'Forbidden: nateeja wajah se pehle. Ulta order.'], ['H', () => true, () => 'Allowed: Q aur A abhi pahunche hi nahi. Koi wajah-nateeja nahi toota.'], ['Q, A, H', () => true, () => 'Allowed: H ka Q aur A se koi rishta nahi, end mein bhi chalega.']] },
          ] },
        { k: 'ryw', name: 'Read-your-writes', setup: 'Riya comment "wah!" likhti hai (10-30). Phir Riya aur Aman dono refresh karte hain.', rows: [['Riya', [[10, 30, 'w', 'W: wah!'], [45, 60, 'r', 'R1']]], ['Aman', [[45, 60, 'r', 'R2']]]],
          reads: [
            { id: 'R1', who: 'Riya ka refresh', c: [['comment dikha', () => true, () => 'Allowed: apna likha hua dikhna hi chahiye.'], ['comment nahi dikha', () => false, () => 'Forbidden: Riya ne khud likha tha. Read-your-writes ka vaada toota.']] },
            { id: 'R2', who: 'Aman ka refresh', c: [['comment dikha', () => true, () => 'Allowed.'], ['comment nahi dikha', () => true, () => 'Allowed: vaada sirf Riya ke liye hai. Aman ko thodi der baad dikhe to bhi theek.']] },
          ] },
        { k: 'mon', name: 'Monotonic reads', setup: 'Neha ne comment kiya: count 4 se 5 hua (5-20). Aman do baar padhta hai.', rows: [['Neha', [[5, 20, 'w', 'W: 5']]], ['Aman', [[30, 45, 'r', 'R1'], [60, 80, 'r', 'R2']]]],
          reads: [
            { id: 'R1', who: 'Aman ka pehla read', c: [['4', () => true, () => 'Allowed: replica abhi peeche ho sakta hai.'], ['5', () => true, () => 'Allowed.']] },
            { id: 'R2', who: 'Aman ka doosra read', dep: 'R1', c: [['4', p => p !== '5', p => p === '5' ? 'Forbidden: Aman 5 dekh chuka. Ab 4 dikhna = time peeche gaya.' : 'Allowed: pehle bhi 4 dekha tha, peeche nahi gaya. (Purana hai, lekin ye model sirf "peeche mat jao" kehta hai.)'], ['5', () => true, () => 'Allowed: aage badhna hamesha theek.']] },
          ] },
        { k: 'ev', name: 'Eventual', setup: 'Views 1000 the. Riya ke click se 1003 hue (5-15). Aman replica B se padhta hai: ek baar turant, ek baar ghanton baad (beech mein koi naya write nahi).', rows: [['Riya', [[5, 15, 'w', 'W: 1003']]], ['Aman', [[20, 30, 'r', 'R1'], [80, 95, 'r', 'R2']]]],
          reads: [
            { id: 'R1', who: 'Aman, turant baad', c: [['1000', () => true, () => 'Allowed: replica B abhi peeche hai.'], ['1003', () => true, () => 'Allowed.'], ['1050', () => false, () => 'Forbidden: ye value kabhi kisi ne likhi hi nahi.']] },
            { id: 'R2', who: 'Aman, ghanton baad', c: [['1000', () => false, () => 'Forbidden: writes ruk gaye aur bahut time beet gaya. Ab tak sab copies 1003 pe aa jaani chahiye thi (convergence).'], ['1003', () => true, () => 'Allowed: copies mil gayin.']] },
          ] },
      ];
      let mi = 0; let sel = {};
      el.innerHTML = `<div class="tl-modes" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <div class="tl-setup" style="margin:10px 0 6px;font-size:14px;color:var(--ink-2)"></div>
        <div class="tl-rows" style="display:grid;gap:6px"></div>
        <div class="tl-reads" style="display:grid;gap:10px;margin-top:12px"></div>
        <div class="stats"><div class="stat"><span>Is model mein allowed jawab</span><strong class="tl-cnt"></strong></div></div>`;
      const q = s => el.querySelector(s);
      const draw = () => {
        const m = M[mi];
        const modes = q('.tl-modes'); modes.innerHTML = '';
        M.forEach((x, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (i === mi ? ' on' : ''); b.textContent = x.name; b.onclick = () => { mi = i; sel = {}; draw(); }; modes.appendChild(b); });
        q('.tl-setup').textContent = m.setup;
        q('.tl-rows').innerHTML = m.rows.map(([who, bars]) => `<div style="display:flex;align-items:center;gap:8px"><span style="width:52px;flex:none;font-size:13px;font-weight:600">${who}</span><div style="position:relative;flex:1;height:26px;border-bottom:1px dashed var(--line-2)">${bars.map(([a, b, k, t]) => `<span style="position:absolute;left:${a}%;width:${b - a}%;top:2px;height:22px;border-radius:6px;border:1.5px solid ${k === 'w' ? 'var(--accent)' : 'var(--violet)'};background:${k === 'w' ? 'var(--accent-soft)' : 'var(--surface-2)'};font:600 11px/20px var(--f-mono);text-align:center;overflow:hidden;white-space:nowrap;color:var(--ink)">${t}</span>`).join('')}</div></div>`).join('') + `<div style="display:flex;gap:8px"><span style="width:52px;flex:none"></span><div style="flex:1;display:flex;justify-content:space-between;font:11px var(--f-mono);color:var(--ink-3)"><span>time 0</span><span>50</span><span>100</span></div></div>`;
        const box = q('.tl-reads'); box.innerHTML = ''; let okCount = 0, total = 0;
        m.reads.forEach(r => {
          const d = document.createElement('div');
          d.style.cssText = 'border:1px solid var(--line);border-radius:var(--r-sm);padding:8px 10px;background:var(--surface)';
          const h = document.createElement('div'); h.style.cssText = 'font-size:14px;margin-bottom:6px'; h.innerHTML = `<strong>${r.id}</strong> (${r.who}): kya laa sakta hai?`; d.appendChild(h);
          const prev = r.dep ? sel[r.dep] : null;
          const cs = document.createElement('div'); cs.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px';
          r.c.forEach(([v, ok]) => { total++; if (!r.dep || prev) { if (ok(prev)) okCount++; } const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (sel[r.id] === v ? ' on' : ''); b.textContent = v; b.onclick = () => { sel[r.id] = v; draw(); }; cs.appendChild(b); });
          d.appendChild(cs);
          const fb = document.createElement('div'); fb.style.cssText = 'margin-top:6px;font-size:13.5px';
          if (r.dep && !prev) { fb.textContent = `Pehle ${r.dep} ka jawab chuno: ye read uspe depend karta hai.`; fb.style.color = 'var(--ink-3)'; }
          else if (sel[r.id]) { const [, ok, why] = r.c.find(c => c[0] === sel[r.id]); const y = ok(prev); fb.textContent = (y ? 'ALLOWED: ' : 'FORBIDDEN: ') + why(prev); fb.style.color = y ? 'var(--green)' : 'var(--red)'; }
          else { fb.textContent = 'Koi jawab chuno.'; fb.style.color = 'var(--ink-3)'; }
          d.appendChild(fb); box.appendChild(d);
        });
        q('.tl-cnt').textContent = okCount + ' / ' + total + (m.reads.some(r => r.dep && !sel[r.dep]) ? ' (dependent read baaki)' : '');
      };
      draw();
    }},
    { type: 'h3', text: 'Ek nazar mein' },
    { type: 'table', head: ['Model', 'xyz.com feature', 'Partition mein?', 'Keemat'], rows: [
      ['Linearizable', 'Username, seat lock, balance', 'Minority side ruk jaati hai', 'Sabse zyada: har op pe coordination'],
      ['Sequential', 'Sab ek order pe agree (kam hi alag se milta)', 'Minority side ruk jaati hai', 'Zyada'],
      ['Causal', 'Chat, comment replies', 'Chal sakta hai, agar client apne replica se juda rahe', 'Dependencies track karni padti hain'],
      ['Read-your-writes', 'Apna profile, apna comment', 'Chal sakta hai, agar client apne replica se juda rahe', 'Routing logic'],
      ['Monotonic reads', 'Comment list, inbox', 'Chal sakta hai', 'Sticky routing'],
      ['Eventual', 'Views, likes, recommendations', 'Har replica chalti hai', 'Sabse kam'],
    ], caption: 'Partition column Jepsen ki consistency models map pe based hai.' },

    { type: 'h2', text: 'Quorums: N, W, R ka khel' },
    { type: 'p', html: `Replication lesson mein leaderless (Dynamo-style) replication dekha tha: koi leader nahi, client ya ek <strong>coordinator</strong> node har write kai replicas ko bhejta hai. Wahan formula dekha: <strong>R + W &gt; N</strong>. Ab ise gehrai se samjhte hain, kyunki isi ek formula se "kitna consistent" aur "kitna available" dono tay hote hain.` },
    { type: 'callout', tone: 'term', title: 'N, W, R', html: `<strong>Ye kya hai:</strong> teen numbers jo leaderless store ko batate hain kitna intezaar karna hai.<br>• <strong>N</strong> = har key ki kitni copies (replicas).<br>• <strong>W</strong> = write ko "successful" maanne ke liye kitne replicas ka "haan, likh liya" (ack) chahiye.<br>• <strong>R</strong> = read pe kitne replicas ka jawab chahiye; unme se jiska <strong>version</strong> (data ka number, jaise v1, v2) sabse naya, wahi value lo.<br><strong>Kyun chahiye:</strong> saare N ka wait karo to ek slow ya mara hua replica sab rok deta hai. Sirf ek ka wait karo to purana data mil sakta hai. W aur R beech ka raasta hain.<br><strong>Iske bina:</strong> ya to har failure pe error, ya har doosre read pe purana data.<br><strong>Example:</strong> Amazon ke Dynamo paper (2007) mein bahut si services ka common setting <strong>(N, R, W) = (3, 2, 2)</strong> tha.` },
    { type: 'p', html: `Formula ka logic ek line ka hai: agar R + W &gt; N, to read wale R replicas aur write wale W replicas mein <strong>kam se kam ek common</strong> hona hi chahiye (jagah hi nahi bachti alag rehne ki). Wo common replica latest value laata hai. Jaise 3 kursiyaan hain: ek group 2 pe baitha, doosra group bhi 2 pe baithega to kam se kam ek kursi dono ki common hogi.` },
    { type: 'callout', tone: 'term', title: 'Read repair aur anti-entropy', html: `<strong>Ye kya hai:</strong> peeche reh gaye replicas ko theek karne ke do tareeke. <strong>Read repair:</strong> read ke time coordinator ne dekha ki ek replica purana version de raha hai, to usi waqt use naya version bhej deta hai. <strong>Anti-entropy:</strong> background job jo replicas ka data aapas mein compare karke differences theek karti hai (Dynamo mein Merkle trees se, taaki poora data na bhejna pade).<br><strong>Kyun chahiye:</strong> W &lt; N ka matlab hai kuch replicas har write ke baad peeche reh jaate hain. Unhe kabhi na kabhi pakadna hai.<br><strong>Iske bina:</strong> purani copies hamesha purani rehtin, aur agla replica fail hote hi naya data kho sakta tha.` },
    { type: 'flow', height: 340,
      nodes: [
        { id: 'c', label: 'Client', sub: 'xyz.com app', x: 80, y: 175, w: 120, kind: 'client', info: 'Ye kya hai: xyz.com ka app server jo key-value store use kar raha hai. Iske liye ye ek simple PUT/GET hai.' },
        { id: 'co', label: 'Coordinator', sub: 'N=3, W=2, R=2', x: 265, y: 175, w: 140, kind: 'server', info: 'Ye kya hai: wo node jo is request ko sambhalta hai (manager ki tarah). Write ko N replicas tak bhejta hai aur W acks ka wait karta hai; read pe R replicas ke jawab ka wait karke sabse naya version chunta hai. Dynamo mein ye key ke preference list ka pehla healthy node hota hai.' },
        { id: 'r1', label: 'Replica 1', sub: 'v1', x: 480, y: 50, w: 130, kind: 'data', info: 'Ye kya hai: key ki pehli copy, ek alag machine pe. Har copy ke saath version info (Dynamo mein vector clock, Cassandra mein timestamp) save hoti hai.' },
        { id: 'r2', label: 'Replica 2', sub: 'v1', x: 480, y: 135, w: 130, kind: 'data', info: 'Ye kya hai: doosri copy, alag machine pe. N = 3 mein ye teeno mein se ek vote hai: W = 2 ke liye write isse ya kisi aur ek replica se ack leta hai, aur R = 2 ke liye read bhi do replicas se poochhta hai. Isliye koi bhi ek replica pichhe ho, tab bhi read aur write ka overlap kam se kam ek replica pe hota hai.' },
        { id: 'r3', label: 'Replica 3', sub: 'v1', x: 480, y: 220, w: 130, kind: 'data', info: 'Ye kya hai: teesri copy. Kabhi slow, kabhi down: quorum isi liye hai ki ek slow replica ka wait na karna pade.' },
        { id: 'r4', label: 'Node D', sub: 'hinted replica', x: 480, y: 305, w: 130, kind: 'data', hidden: true, info: 'Ye kya hai: ring pe agla healthy node, jo normally is key ki copy nahi rakhta. Sloppy quorum mein ye temporarily Replica 3 ki jagah write le leta hai, ek "hint" ke saath ki asli maalik kaun hai.' },
      ],
      edges: [{ a: 'c', b: 'co' }, { a: 'co', b: 'r1' }, { a: 'co', b: 'r2' }, { a: 'co', b: 'r3' }, { a: 'co', b: 'r4', id: 'cr4', hidden: true }, { a: 'r3', b: 'r4', id: 'h34', hidden: true }],
      scenarios: [
        { name: 'Write W=2, read R=2', intro: 'Riya ne apna bio badla. N=3, W=2, R=2.', steps: [
          { title: 'Write teeno ko', text: 'Coordinator naya version (v2) teeno replicas ko ek saath bhejta hai.', go: ['c>co', 'co>r1', 'co>r2', 'co>r3'], parallel: true, msg: 'PUT bio:riya = "chai lover" (v2)' },
          { title: '2 acks aaye: success', text: 'Replica 1 aur 2 ne ack kiya. W = 2 poora, client ko success. Replica 3 slow tha, uske paas abhi v1 hi hai. Uska wait nahi kiya: yahi quorum ka faayda hai.', go: ['res:r1>co', 'res:r2>co', 'res:co>c'], parallel: true, after: { r1: { sub: 'v2', state: 'ok' }, r2: { sub: 'v2', state: 'ok' }, r3: { sub: 'v1 (slow)', state: 'warn' } }, msg: '200 OK (2 of 3 acks)' },
          { title: 'Read: 2 replicas se poochho', text: 'Aman ne Riya ka bio khola. Maan lo coordinator ne Replica 2 aur Replica 3 se poocha (worst case: ek purana wala bhi aa gaya).', go: ['c>co', 'co>r2', 'co>r3'], parallel: true, msg: 'GET bio:riya  (R=2)' },
          { title: 'Naya version jeeta', text: 'Replica 2 ne v2 diya, Replica 3 ne v1. Coordinator version compare karke v2 chunta hai. Overlap ne bachaya: Replica 2 dono groups mein tha.', go: ['res:r2>co', 'res:r3>co', 'res:co>c'], parallel: true, msg: 'v2 > v1  →  "chai lover"' },
          { title: 'Read repair', text: 'Coordinator ne dekha Replica 3 peeche hai, to use v2 bhej diya. Ab teeno same.', go: 'co>r3', after: { r3: { sub: 'v2 (repaired)', state: 'ok' } } },
        ]},
        { name: 'Replica down', intro: 'Replica 3 mar gaya. Kya system chalega?', steps: [
          { title: 'Replica 3 down', text: 'Ek replica gaya.', set: { r3: { state: 'down', sub: 'DOWN' } }, go: 'lost:co>r3' },
          { title: 'Write: phir bhi success', text: 'Replica 1 aur 2 ne ack kiya. W = 2 mil gaya. Koi failover nahi chahiye, koi leader election nahi. N - W = 1 failure jhel liya.', go: ['c>co', 'co>r1', 'co>r2', 'res:co>c'], after: { r1: { sub: 'v2', state: 'ok' }, r2: { sub: 'v2', state: 'ok' } }, msg: '200 OK (2 of 3)' },
          { title: 'Replica 2 bhi down', text: 'Ab sirf ek zinda. Write ko 2 acks chahiye, 1 hi mil sakta hai.', set: { r2: { state: 'down', sub: 'DOWN' } }, go: ['c>co', 'co>r1', 'res:r1>co'] },
          { title: 'Write fail', text: 'Strict quorum mana kar deta hai: consistency bachi, availability gayi. N - W se zyada failures = writes band; N - R se zyada = reads band.', go: 'bad:co>c', msg: '503  "only 1 of 3 replicas available, need 2"' },
        ]},
        { name: 'R=1, W=1: stale read', intro: 'Speed ke liye W=1, R=1. Ab R + W = 2, jo N = 3 se bada nahi.', steps: [
          { title: 'Write sirf ek ack pe', text: 'Replica 1 ne ack kiya, success. Baaki dono abhi purane.', set: { co: { sub: 'N=3, W=1, R=1' } }, go: ['c>co', 'co>r1', 'res:co>c'], after: { r1: { sub: 'v2', state: 'ok' } }, msg: '200 OK (1 ack)' },
          { title: 'Read ek replica se', text: 'Read Replica 3 pe gaya.', go: ['c>co', 'co>r3', 'res:r3>co'] },
          { title: 'Purana data!', text: 'Replica 3 ke paas v1. Read set {3} aur write set {1} mein koi common nahi. Ye <strong>stale read</strong> hai. Fast tha, lekin vaada sirf eventual consistency ka hai.', go: 'res:co>c', set: { r3: { state: 'warn', sub: 'v1 (stale!)' } }, msg: '"purana bio"  ✗' },
        ]},
        { name: 'Sloppy quorum', intro: 'Dynamo ka "hamesha writeable" trick. Replica 2 aur 3 tak network nahi pahunch raha.', steps: [
          { title: '2 replicas unreachable', text: 'Strict quorum hota to W = 2 nahi milta aur write fail.', set: { r2: { state: 'down', sub: 'unreachable' }, r3: { state: 'down', sub: 'unreachable' } }, go: ['lost:co>r2', 'lost:co>r3'], parallel: true },
          { title: 'Agla healthy node lo', text: 'Dynamo "first N healthy nodes" pe likhta hai: ring pe aage wala Node D Replica 3 ki jagah write le leta hai, saath mein <strong>hint</strong>: "ye asal mein Replica 3 ka hai".', show: ['r4', 'cr4'], go: ['c>co', 'co>r1', 'co>r4'], after: { r1: { sub: 'v2', state: 'ok' }, r4: { sub: 'v2 + hint: R3', state: 'warn' } } },
          { title: 'W = 2 "mil gaya"', text: 'Do acks aaye (Replica 1 + Node D), to success. Lekin dhyaan do: inme se ek apne ghar wala replica nahi hai. Ab agar koi R = 2 read Replica 2 + 3 se ho jaaye (jab wo wapas aayein), to overlap nahi milega: <strong>R + W &gt; N ki guarantee yahan toot jaati hai</strong>.', go: ['res:r1>co', 'res:r4>co', 'res:co>c'], parallel: true, msg: '200 OK (sloppy quorum)' },
          { title: 'Hinted handoff', text: 'Network theek, Replica 2 aur 3 wapas. Node D hint wala data Replica 3 ko de deta hai aur apni temporary copy mita deta hai. Is process ko <strong>hinted handoff</strong> kehte hain. Replica 2 abhi bhi v1 pe hai: use read repair ya anti-entropy pakdegi.', set: { r3: { state: '', sub: 'v1' }, r2: { state: '', sub: 'v1' } }, show: ['h34'], go: 'evt:r4>r3', after: { r3: { sub: 'v2 (handoff)', state: 'ok' }, r4: { sub: 'hint delivered', state: 'dim' } } },
        ]},
      ],
    },

    { type: 'callout', tone: 'term', title: 'Sloppy quorum aur hinted handoff', html: `<strong>Ye kya hai:</strong> jab key ke "ghar wale" replicas tak network nahi pahunchta, to write kisi aur healthy node pe temporarily rakh do, saath mein ek <strong>hint</strong> (parchi): "ye asal mein Replica 3 ka hai". Isko <strong>sloppy quorum</strong> kehte hain. Jab Replica 3 wapas aata hai, wo node data use de deta hai aur apni copy mita deta hai: ye <strong>hinted handoff</strong> hai.<br><strong>Kyun chahiye:</strong> Amazon ka "add to cart" kabhi fail nahi hona chahiye tha, chahe do replicas down hon.<br><strong>Iske bina:</strong> strict quorum mein W replicas na milein to write fail: user ko error.<br><strong>Keemat:</strong> write "ghar ke bahar" pada hai, to R + W &gt; N hote hue bhi read purana data de sakta hai, jab tak handoff na ho jaaye. Cassandra mein bhi hinted handoff hai (wahan hints sirf replicas tak data pahunchane ke liye hain; consistency level mein unki ginti nahi hoti, sirf ANY level mein).` },
    { type: 'h3', text: 'Quorum lab: khud N, W, R chuno' },
    { type: 'p', html: `Neeche ka lab worst case dikhata hai. Ye cheezein try karo:` },
    { type: 'list', items: [
      `<strong>Dynamo (3,2,2):</strong> Write, phir Read. Read pehle purane replica (R3) se poochhta hai, lekin doosra replica latest wala hota hai: overlap. Ek replica maaro: sab chalta hai. Do maaro: Write FAIL.`,
      `<strong>Fast: W=1, R=1:</strong> Write, phir Read: STALE READ. R + W = 2 ≤ 3. Lekin 2 replicas maar ke bhi writes aur reads chalti hain.`,
      `<strong>Read-heavy: R=1, W=N:</strong> Reads ek hi replica se (sabse tez) aur hamesha fresh, kyunki har write sab pe gaya. Keemat: ek bhi replica down, to writes band. Dynamo paper mein kuch read-heavy services ne yahi setting use ki thi.`,
      `<strong>5 copies (5,3,3):</strong> 2 replicas maaro, phir bhi sab chalta hai aur overlap pakka.`,
    ]},
    { type: 'custom', render(el) {
      function quorumCore() {
        const S = { N: 3, W: 2, R: 2, dead: new Set(), ver: [1, 1, 1], latest: 1, wset: [], rset: [], last: null };
        const alive = () => S.ver.map((_, i) => i).filter(i => !S.dead.has(i));
        return {
          S,
          setN(n) { S.N = n; S.W = Math.min(S.W, n); S.R = Math.min(S.R, n); S.dead = new Set(); S.ver = Array(n).fill(1); S.latest = 1; S.wset = []; S.rset = []; S.last = null; },
          setW(w) { S.W = Math.max(1, Math.min(S.N, w)); },
          setR(r) { S.R = Math.max(1, Math.min(S.N, r)); },
          toggle(i) { if (S.dead.has(i)) S.dead.delete(i); else S.dead.add(i); },
          write() {
            const a = alive(); S.rset = [];
            if (a.length < S.W) { S.wset = []; S.last = { kind: 'wfail', alive: a.length }; return S.last; }
            const v = S.latest + 1; S.wset = a.slice(0, S.W); S.wset.forEach(i => { S.ver[i] = v; }); S.latest = v;
            S.last = { kind: 'wok', v, set: S.wset.slice() }; return S.last;
          },
          read() {
            const a = alive();
            if (a.length < S.R) { S.rset = []; S.last = { kind: 'rfail', alive: a.length }; return S.last; }
            // worst case: the coordinator happens to ask stale replicas first
            const order = a.slice().sort((x, y) => (S.ver[x] - S.ver[y]) || (x - y));
            S.rset = order.slice(0, S.R);
            const got = Math.max(...S.rset.map(i => S.ver[i]));
            const overlap = S.rset.filter(i => S.ver[i] === S.latest);
            const repaired = S.rset.filter(i => S.ver[i] < got);
            repaired.forEach(i => { S.ver[i] = got; }); // read repair
            S.last = { kind: 'rok', got, fresh: got === S.latest, overlap, repaired, set: S.rset.slice() }; return S.last;
          },
          repair() { alive().forEach(i => { S.ver[i] = S.latest; }); S.wset = []; S.rset = []; S.last = { kind: 'repair' }; return S.last; },
        };
      }
      const qc = quorumCore(), S = qc.S;
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center"><span style="font-size:14px;color:var(--ink-2)">Presets:</span><span class="cq-pre" style="display:flex;flex-wrap:wrap;gap:6px"></span></div>
        <div class="row2" style="margin-top:10px">
          <div><label>N (copies): <strong class="cq-nv"></strong></label><input class="cq-n" type="range" min="1" max="7" step="1" value="3"></div>
          <div><label>W (write acks): <strong class="cq-wv"></strong></label><input class="cq-w" type="range" min="1" max="3" step="1" value="2"></div>
          <div><label>R (read replies): <strong class="cq-rv"></strong></label><input class="cq-r" type="range" min="1" max="3" step="1" value="2"></div>
        </div>
        <div style="font-size:13px;color:var(--ink-3);margin-top:8px">Replica pe click karke use maaro / zinda karo.</div>
        <div class="cq-nodes" style="display:flex;flex-wrap:wrap;gap:10px;margin:10px 0"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          <button type="button" class="btn small primary cq-write">Write (naya version)</button>
          <button type="button" class="btn small primary cq-read">Read</button>
          <button type="button" class="btn small ghost cq-rep">Anti-entropy (sab sync)</button>
        </div>
        <div class="cq-res" style="margin-top:10px;padding:8px 10px;border-radius:var(--r-sm);background:var(--surface-2);border:1px solid var(--line);font-size:14px;min-height:22px"></div>
        <div class="stats">
          <div class="stat"><span>R + W vs N</span><strong class="cq-sum"></strong></div>
          <div class="stat"><span>Stale read possible?</span><strong class="cq-st"></strong></div>
          <div class="stat"><span>Writes chalti hain jab tak down ≤</span><strong class="cq-wt"></strong></div>
          <div class="stat"><span>Reads chalti hain jab tak down ≤</span><strong class="cq-rt"></strong></div>
        </div>
        <div class="calc-note">Worst case dikhaya gaya hai: write sirf pehle W zinda replicas tak pahunchta hai (baaki slow the), aur read pehle purane replicas se poochhta hai. Read ke baad read repair hota hai. Sloppy quorum is widget mein band hai (strict quorum).</div>`;
      const q = s => el.querySelector(s);
      const nI = q('.cq-n'), wI = q('.cq-w'), rI = q('.cq-r');
      const say = (html, col) => { const r = q('.cq-res'); r.innerHTML = html; r.style.color = col || 'var(--ink)'; };
      const draw = () => {
        wI.max = S.N; rI.max = S.N; nI.value = S.N; wI.value = S.W; rI.value = S.R;
        q('.cq-nv').textContent = S.N; q('.cq-wv').textContent = S.W; q('.cq-rv').textContent = S.R;
        const box = q('.cq-nodes'); box.innerHTML = '';
        S.ver.forEach((v, i) => {
          const dead = S.dead.has(i), inW = S.wset.includes(i), inR = S.rset.includes(i), fresh = v === S.latest;
          const b = document.createElement('button'); b.type = 'button';
          b.setAttribute('aria-label', 'Replica ' + (i + 1) + (dead ? ' down' : ' version ' + v));
          b.style.cssText = `width:64px;padding:6px 0;border-radius:var(--r);border:2px solid ${dead ? 'var(--red)' : inR ? 'var(--violet)' : inW ? 'var(--accent)' : 'var(--line-2)'};background:${dead ? 'var(--surface-2)' : 'var(--surface)'};color:var(--ink);cursor:pointer;font:600 13px var(--f-mono);line-height:1.5`;
          b.innerHTML = `R${i + 1}<br><span style="color:${dead ? 'var(--red)' : fresh ? 'var(--green)' : 'var(--amber)'}">${dead ? 'DOWN' : 'v' + v}</span><br><span style="font-size:11px;color:var(--ink-3)">${[inW ? 'W' : '', inR ? 'R' : ''].filter(Boolean).join('+') || '&nbsp;'}</span>`;
          b.onclick = () => { qc.toggle(i); draw(); };
          box.appendChild(b);
        });
        const sum = S.R + S.W, strong = sum > S.N;
        q('.cq-sum').textContent = `${S.R} + ${S.W} = ${sum} ${strong ? '>' : '≤'} ${S.N}`;
        q('.cq-st').textContent = strong ? 'Nahi (overlap pakka)' : 'Haan';
        q('.cq-st').style.color = strong ? 'var(--green)' : 'var(--amber)';
        q('.cq-wt').textContent = S.N - S.W; q('.cq-rt').textContent = S.N - S.R;
      };
      const setN = () => { qc.setN(Number(nI.value)); say('Naya cluster: sab replicas v1 pe.'); draw(); };
      nI.addEventListener('input', setN);
      wI.addEventListener('input', () => { qc.setW(Number(wI.value)); draw(); });
      rI.addEventListener('input', () => { qc.setR(Number(rI.value)); draw(); });
      [['Dynamo (3,2,2)', 3, 2, 2], ['Fast: W=1, R=1', 3, 1, 1], ['Read-heavy: R=1, W=N', 3, 3, 1], ['5 copies (5,3,3)', 5, 3, 3]].forEach(([t, n, w, r]) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = t;
        b.onclick = () => { qc.setN(n); qc.setW(w); qc.setR(r); say(t + ': sab replicas v1 pe. Ab Write, phir Read dabao.'); draw(); };
        q('.cq-pre').appendChild(b);
      });
      q('.cq-write').onclick = () => {
        const r = qc.write();
        if (r.kind === 'wfail') say(`Write FAIL: sirf ${r.alive} replica zinda, W = ${S.W} acks chahiye. Consistency bachi, availability gayi.`, 'var(--red)');
        else say(`Write v${r.v} OK: acks R${r.set.map(i => i + 1).join(', R')} se. Baaki replicas abhi purane.`, 'var(--green)');
        draw();
      };
      q('.cq-read').onclick = () => {
        const r = qc.read();
        if (r.kind === 'rfail') say(`Read FAIL: sirf ${r.alive} replica zinda, R = ${S.R} chahiye.`, 'var(--red)');
        else if (r.fresh) say(`Read v${r.got}: latest mila. Overlap (latest wale replica jo read mein aaye): R${r.overlap.map(i => i + 1).join(', R')}.${r.repaired.length ? ' Read repair: R' + r.repaired.map(i => i + 1).join(', R') + ' update.' : ''}`, 'var(--green)');
        else say(`STALE READ: v${r.got} mila, jabki latest v${S.latest} hai. Read set (R${r.set.map(i => i + 1).join(', R')}) mein latest wala koi replica nahi tha.`, 'var(--amber)');
        draw();
      };
      q('.cq-rep').onclick = () => { qc.repair(); say('Anti-entropy: saare zinda replicas latest version pe.'); draw(); };
      say('Write dabao, phir Read. Phir W ya R ghatao ya replicas maaro aur dobara try karo.');
      draw();
    }},
    { type: 'p', html: `Lab ka saar ek table mein (N = 3):` },
    { type: 'table', head: ['W', 'R', 'R + W > N?', 'Writes jhelein', 'Reads jhelein', 'Kab use karein'], rows: [
      ['2', '2', 'Haan (4 > 3)', '1 down', '1 down', 'Default balance: consistent reads, ek failure tak sab chalu'],
      ['1', '1', 'Nahi (2)', '2 down', '2 down', 'Sabse fast aur available; stale reads chalein (views, likes)'],
      ['3', '1', 'Haan (4 > 3)', '0 down', '2 down', 'Bahut zyada reads, kam writes'],
      ['1', '3', 'Haan (4 > 3)', '2 down', '0 down', 'Writes kabhi fail na hon; reads mehnge aur fragile'],
    ]},

    { type: 'callout', tone: 'mistake', title: 'Common confusion: "R + W > N = linearizable"', html: `Nahi. R + W &gt; N sirf ye pakka karta hai ki read set aur write set mein ek common replica hoga. Fir bhi gadbad ho sakti hai:<br>• <strong>Sloppy quorum</strong>: W acks "ghar ke bahar" wale nodes se aaye (upar diagram), to overlap ki guarantee gayi.<br>• <strong>Adhoora write</strong>: write 1 replica pe pahuncha aur fail hua (W nahi mila). Client ko error mila, lekin wo 1 copy wapas nahi hatti: koi read use dekh sakta hai, koi nahi.<br>• <strong>Read aur write ek saath</strong>: write chal hi raha hai, to ek read naya dekh sakta hai aur uske baad wala read purana.<br>• <strong>Concurrent writes + last-write-wins</strong>: ek write chupchaap kho sakta hai (neeche).<br>Abadi ne bhi 2012 mein yahi likha tha: Dynamo-style systems R + W badha ke zyada consistent hote hain, lekin poori linearizability nahi milti. Linearizable chahiye to consensus (Raft/Paxos) wala system lo.` },

    { type: 'h2', text: 'Tunable consistency: har query ka apna level' },
    { type: 'p', html: `Quorum ka sabse bada faayda: N fix hai, lekin W aur R <strong>har request pe alag</strong> ho sakte hain. Ek hi database mein likes ka count ONE pe padho (fast), aur payment status QUORUM pe. Isko <strong>tunable consistency</strong> kehte hain.` },
    { type: 'h3', text: 'Cassandra ke consistency levels' },
    { type: 'p', html: `Cassandra Dynamo ke idea pe bana hai. Yahan har query ke saath ek <strong>consistency level</strong> bhejte hain, jo batata hai kitne replicas ka jawab chahiye. RF (replication factor) = N, yaani har row ki kitni copies. <strong>DC (datacenter)</strong> = ek region ka data centre; Cassandra ek cluster ko kai DCs mein phaila sakta hai.` },
    { type: 'table', head: ['Level', 'Kitne replicas', 'Kab'], rows: [
      ['ONE (aur TWO, THREE)', '1 (ya 2, 3)', 'Sabse fast aur available; stale reads possible'],
      ['QUORUM', 'Majority: ⌊RF/2⌋ + 1 (multi-DC mein saare DCs ke RF ka total)', 'Write QUORUM + read QUORUM = overlap'],
      ['LOCAL_QUORUM', 'Sirf apne datacenter ki majority', 'Multi-region mein: overlap apne DC ke andar, doosre DC ka wait nahi (PACELC ka EL)'],
      ['EACH_QUORUM', 'Har datacenter mein majority (writes)', 'Har region mein pakka, lekin sabse slow'],
      ['LOCAL_ONE', '1, apne DC se', 'Cross-region traffic se bachna'],
      ['ALL', 'Saare replicas', 'Sabse consistent, lekin ek replica down = fail'],
      ['ANY', 'Koi bhi node, hint bhi chalega (sirf writes)', 'Write kabhi fail na ho; durability sabse kamzor'],
    ]},
    { type: 'p', html: `Teen sabse common levels ek example se (RF = 3; teen replicas ka jawab aane mein 2 ms, 5 ms aur 40 ms lagte hain, kyunki teesra door ke zone mein hai):` },
    { type: 'list', items: [
      `<strong>ONE:</strong> sirf sabse tez replica ka wait: <strong>2 ms</strong>. 2 replicas down hon tab bhi chalega. Lekin ONE write + ONE read mein overlap ki guarantee nahi: purana data mil sakta hai.`,
      `<strong>QUORUM:</strong> 2 replicas ka wait, yaani doosre number wala: <strong>5 ms</strong>. 1 replica down jhel leta hai. QUORUM write + QUORUM read = 2 + 2 &gt; 3, overlap pakka.`,
      `<strong>ALL:</strong> teeno ka wait, yaani sabse slow wala: <strong>40 ms</strong>. Ek bhi replica down = request fail. Sabse kam available.`,
    ]},
    { type: 'p', html: `Ab khud mila ke dekho. Write aur read ke level alag alag chuno, replicas maaro, aur dekho latency, overlap aur failure kaise badalte hain:` },
    { type: 'custom', render(el) {
      const LAT = { 3: [2, 5, 40], 5: [2, 4, 6, 40, 60] };
      const need = (lv, rf) => lv === 'ONE' ? 1 : lv === 'QUORUM' ? Math.floor(rf / 2) + 1 : rf;
      function tunCore(rf, wl, rl, dead) {
        const alive = LAT[rf].filter((_, i) => !dead.includes(i)).sort((a, b) => a - b);
        const nw = need(wl, rf), nr = need(rl, rf);
        const res = n => alive.length >= n ? { ok: true, ms: alive[n - 1] } : { ok: false };
        return { nw, nr, w: res(nw), r: res(nr), overlap: nw + nr > rf, wTol: rf - nw, rTol: rf - nr };
      }
      let rf = 3, wl = 'QUORUM', rl = 'QUORUM', dead = [];
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center">
          <span style="display:flex;flex-wrap:wrap;gap:6px;align-items:center"><span style="font-size:14px;color:var(--ink-2)">RF (copies):</span><span class="tu-rf" style="display:flex;gap:6px"></span></span>
          <span style="display:flex;flex-wrap:wrap;gap:6px;align-items:center"><span style="font-size:14px;color:var(--ink-2)">Write level:</span><span class="tu-w" style="display:flex;gap:6px;flex-wrap:wrap"></span></span>
          <span style="display:flex;flex-wrap:wrap;gap:6px;align-items:center"><span style="font-size:14px;color:var(--ink-2)">Read level:</span><span class="tu-r" style="display:flex;gap:6px;flex-wrap:wrap"></span></span>
        </div>
        <div style="font-size:13px;color:var(--ink-3);margin-top:8px">Replica pe click karke use down / up karo. Har box mein us replica ka jawab aane ka time.</div>
        <div class="tu-nodes" style="display:flex;flex-wrap:wrap;gap:8px;margin:8px 0"></div>
        <div class="stats">
          <div class="stat"><span>Write</span><strong class="tu-wo"></strong></div>
          <div class="stat"><span>Read</span><strong class="tu-ro"></strong></div>
          <div class="stat"><span>Overlap pakka? (W + R &gt; RF)</span><strong class="tu-ov"></strong></div>
          <div class="stat"><span>Kitne down jhel sakte (write / read)</span><strong class="tu-tol"></strong></div>
        </div>
        <div class="calc-note tu-note"></div>`;
      const q = s => el.querySelector(s);
      const chips = (box, opts, cur, set) => { box.innerHTML = ''; opts.forEach(v => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (v === cur ? ' on' : ''); b.textContent = v; b.onclick = () => { set(v); draw(); }; box.appendChild(b); }); };
      const draw = () => {
        chips(q('.tu-rf'), [3, 5], rf, v => { rf = v; dead = []; });
        chips(q('.tu-w'), ['ONE', 'QUORUM', 'ALL'], wl, v => { wl = v; });
        chips(q('.tu-r'), ['ONE', 'QUORUM', 'ALL'], rl, v => { rl = v; });
        const box = q('.tu-nodes'); box.innerHTML = '';
        LAT[rf].forEach((ms, i) => { const d = dead.includes(i); const b = document.createElement('button'); b.type = 'button';
          b.style.cssText = `width:62px;padding:6px 0;border-radius:var(--r);border:2px solid ${d ? 'var(--red)' : 'var(--line-2)'};background:${d ? 'var(--surface-2)' : 'var(--surface)'};color:var(--ink);cursor:pointer;font:600 13px/1.5 var(--f-mono)`;
          b.innerHTML = `R${i + 1}<br><span style="color:${d ? 'var(--red)' : 'var(--ink-2)'}">${d ? 'DOWN' : ms + ' ms'}</span>`;
          b.onclick = () => { dead = d ? dead.filter(x => x !== i) : [...dead, i]; draw(); }; box.appendChild(b); });
        const r = tunCore(rf, wl, rl, dead);
        const out = (x, n) => x.ok ? `OK, ${x.ms} ms (${n} ka wait)` : `FAIL (${n} chahiye)`;
        q('.tu-wo').textContent = out(r.w, r.nw); q('.tu-wo').style.color = r.w.ok ? 'var(--green)' : 'var(--red)';
        q('.tu-ro').textContent = out(r.r, r.nr); q('.tu-ro').style.color = r.r.ok ? 'var(--green)' : 'var(--red)';
        q('.tu-ov').textContent = `${r.nw} + ${r.nr} ${r.overlap ? '>' : '≤'} ${rf}: ${r.overlap ? 'Haan' : 'Nahi, stale read ho sakta'}`; q('.tu-ov').style.color = r.overlap ? 'var(--green)' : 'var(--amber)';
        q('.tu-tol').textContent = `${r.wTol} / ${r.rTol}`;
        q('.tu-note').textContent = !r.w.ok || !r.r.ok ? 'Zinda replicas level ki zaroorat se kam hain: request error deti hai. Consistency bachi, availability gayi.'
          : r.overlap ? `Har read kam se kam ek aise replica ko chhoota hai jiske paas latest write hai. Keemat: ${Math.max(r.w.ms, r.r.ms)} ms tak ka wait.`
          : `Sabse tez (${Math.max(r.w.ms, r.r.ms)} ms tak), lekin read un replicas pe ja sakta hai jinhone write nahi liya: views/likes ke liye theek, username ke liye nahi.`;
      };
      draw();
    }},
    { type: 'p', html: `Ek baat zaroor try karo: RF = 3, QUORUM/QUORUM, aur sabse tez replica R1 ko maaro. Request ab bhi chalti hai, lekin latency 5 ms se <strong>40 ms</strong> ho jaati hai, kyunki ab doosra jawab door wale replica se aata hai. Quorum failure jhel leta hai, lekin uski keemat latency mein dikhti hai.` },
    { type: 'p', html: `Cassandra version ke liye <strong>vector clocks nahi</strong>, balki har column ke saath ek timestamp rakhta hai, aur conflict pe <strong>sabse bade timestamp wala jeetta hai</strong> (last-write-wins, per cell). Jo levels upar dekhe, unke saath read repair, hinted handoff aur Merkle-tree wali anti-entropy repair bhi chalti hai, bilkul Dynamo jaisi. Agar kisi operation ko linearizable chahiye (jaise "username sirf tab do jab khaali ho"), to Cassandra ke <strong>lightweight transactions</strong> (Paxos pe based, <code>IF NOT EXISTS</code>) use hote hain: kaafi slow, isliye kabhi kabhi hi.` },
    { type: 'h3', text: 'DynamoDB' },
    { type: 'p', html: `Amazon DynamoDB (naam milta hai lekin andar se leader-based hai, replication lesson dekho) mein choice har read pe hai: default <strong>eventually consistent read</strong>, ya <code>ConsistentRead: true</code> se <strong>strongly consistent read</strong>, jo latest successful write dikhata hai aur do guna mehnga padta hai. Global secondary indexes aur streams sirf eventually consistent hain. Multi-region <strong>global tables</strong> mein default eventual consistency hai (doosre regions tak aam taur pe ek second ke andar), aur June 2025 se multi-Region strong consistency (MRSC) bhi generally available hai, jisme write lautne se pehle doosre region tak synchronously copy hota hai: PACELC ka EC, latency ki keemat pe.` },

    { type: 'h2', text: 'Conflict resolution: jab do copies takraayein' },
    { type: 'p', html: `AP systems, multi-leader setups aur sloppy quorums mein ek hi key pe <strong>do writes ek saath</strong> (ya partition ke dono taraf) ho sakti hain. Dono replicas ne apna apna version "successful" bola. Network milne pe ab do alag versions hain. Kaunsa rakhein? Teen bade tareeke hain, sabse simple se sabse smart tak.` },
    { type: 'callout', tone: 'term', title: 'Concurrent writes', html: `<strong>Ye kya hai:</strong> do writes <strong>concurrent</strong> hain agar jab ek hua tab use doosre ka pata nahi tha: na A ne B dekha, na B ne A.<br><strong>Kyun samajhna zaroori:</strong> ye "same second" ki baat nahi. Do writes 5 minute ke gap pe bhi concurrent ho sakti hain agar beech mein partition tha. Concurrent writes mein "kaun pehle" ka koi sahi jawab hi nahi hota, isliye inhe merge karne ka rule chahiye.<br><strong>Iske bina:</strong> system chupchaap ek write chun leta hai aur doosre user ka kaam gayab.<br><strong>Example:</strong> partition mein Riya (Mumbai) ne bio "chai lover" kiya, Aman ke laptop pe usi account se (Singapore) "coffee lover". Dono ko "saved" mila. Network jud gaya: ab do versions.` },

    { type: 'h3', text: '1. Last-write-wins (LWW)' },
    { type: 'p', html: `Har write ke saath ek timestamp lagao. Conflict pe jiska timestamp bada, wo jeeta; doosra chupchaap phenk do. Simple hai, koi extra data nahi, isliye bahut popular: Cassandra har cell pe yahi karta hai, aur DynamoDB global tables (default mode) mein bhi regions ke beech conflict pe last writer wins hota hai. Dynamo paper mein bhi ek session-data service ne yahi mode chuna tha.` },
    { type: 'p', html: `Do problems: (1) concurrent writes mein ek write <strong>hamesha khota hai</strong>, chahe dono users ko "saved" mila ho. (2) Timestamp har machine ki apni ghadi (clock) se aata hai, aur machines ki ghadiyaan kabhi perfectly match nahi karti. Isko <strong>clock skew</strong> kehte hain. NTP se ghadiyaan aam taur pe milliseconds ke andar rehti hain, lekin galat config, VM pause ya network gadbad mein skew bahut bada ho sakta hai. Khud dekho kya hota hai:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Node A ki ghadi kitni aage: <strong class="lw-sv"></strong></label><input class="lw-s" type="range" min="0" max="200" step="5" value="50"></div>
          <div><label>Aman ne Riya ke kitni der baad likha (asli time): <strong class="lw-gv"></strong></label><input class="lw-g" type="range" min="5" max="200" step="5" value="30"></div>
        </div>
        <div class="ascii lw-tl" style="margin-top:10px;white-space:pre;overflow-x:auto;font:12.5px/1.5 var(--f-mono)"></div>
        <div class="stats">
          <div class="stat"><span>Riya ka timestamp (Node A)</span><strong class="lw-ta"></strong></div>
          <div class="stat"><span>Aman ka timestamp (Node B)</span><strong class="lw-tb"></strong></div>
          <div class="stat"><span>LWW ne kise rakha</span><strong class="lw-w"></strong></div>
        </div>
        <div class="calc-note lw-note"></div>`;
      function lwwCore(skew, gap) {
        const tsA = 100 + skew, tsB = 100 + gap;
        const winner = tsB > tsA ? 'Aman' : tsA > tsB ? 'Riya' : 'tie';
        return { tsA, tsB, winner, lost: winner !== 'Aman' };
      }
      const q = s => el.querySelector(s);
      const upd = () => {
        const skew = Number(q('.lw-s').value), gap = Number(q('.lw-g').value), r = lwwCore(skew, gap);
        q('.lw-sv').textContent = skew + ' ms'; q('.lw-gv').textContent = gap + ' ms';
        q('.lw-ta').textContent = r.tsA + ' ms'; q('.lw-tb').textContent = r.tsB + ' ms';
        q('.lw-w').textContent = r.winner === 'tie' ? 'Barabar!' : r.winner;
        q('.lw-w').style.color = r.lost ? 'var(--red)' : 'var(--green)';
        q('.lw-tl').textContent = `Asli time:   Riya likhti hai @100 ms (Node A)   Aman likhta hai @${100 + gap} ms (Node B)\nTimestamp:   Riya = ${r.tsA}   Aman = ${r.tsB}\nAsli naya:   Aman ka bio   →   LWW rakhta: ${r.winner === 'tie' ? 'tie-break rule' : r.winner + ' ka bio'}`;
        q('.lw-note').textContent = r.winner === 'Aman'
          ? `Theek: skew (${skew} ms) gap (${gap} ms) se chhota hai, to timestamps ne asli order hi dikhaya. Riya ka write fir bhi gaya, lekin wo sach mein purana tha.`
          : r.winner === 'tie'
            ? `Timestamps barabar (${r.tsA} ms). Ab koi tie-break rule (jaise node id ya value compare) jeetega, asli order nahi. Aman ka naya write kho sakta hai.`
            : `DATA LOSS: Aman ne baad mein likha, lekin Node A ki ghadi ${skew} ms aage thi, to Riya ka purana write "naya" dikha. Aman ko "saved" mila tha, aur uska bio chupchaap mit gaya. Jab bhi skew > gap, LWW asli order ulta kar deta hai.`;
      };
      ['.lw-s', '.lw-g'].forEach(s => q(s).addEventListener('input', upd));
      upd();
    }},
    { type: 'p', html: `<strong>LWW kab theek hai:</strong> jab data immutable ho (har write ki key unique, jaise UUID wale events: kabhi conflict hi nahi), ya kuch writes ka khona chalega (last seen time, cache-jaisa data). <strong>Kab nahi:</strong> counters, carts, jahan har user ka edit maayne rakhta hai.` },

    { type: 'h3', text: '2. Vector clocks: pehle pata karo conflict hai bhi ya nahi' },
    { type: 'p', html: `LWW ka asli dukh: wo <strong>"naya version"</strong> aur <strong>"concurrent version"</strong> mein farak nahi kar sakta. Har baar ek ko jeeta deta hai. Dynamo ne iske liye <strong>vector clocks</strong> use kiye.` },
    { type: 'callout', tone: 'term', title: 'Vector clock', html: `<strong>Ye kya hai:</strong> har version ke saath ek chhoti list: <strong>(server, counter)</strong> pairs, jaise <code>[(Sx, 2), (Sy, 1)]</code>. Jo server write sambhalta hai, wo apna counter +1 karta hai. Ye version ki "family history" hai.<br><strong>Kaise compare:</strong> agar A ke saare counters B ke counters se ≤ hain, to A purana hai aur B usi ki kahani aage badhata hai: A phenk do. Agar kisi ek counter mein A bada aur kisi doosre mein B bada, to dono <strong>concurrent</strong> hain: asli conflict. Tab dono versions (<strong>siblings</strong>) rakho aur app se merge karwao.<br><strong>Kyun chahiye:</strong> LWW "naya" aur "concurrent" mein farak nahi kar pata. Vector clock kar pata hai.<br><strong>Iske bina:</strong> concurrent edit mein ek user ka kaam chupchaap gayab.` },
    { type: 'p', html: `Neeche Dynamo paper ka hi example hai (D1 se D5, servers Sx, Sy, Sz), bas data xyz.com ki video watchlist hai. Step by step chalo, aur kisi bhi do versions ko compare karke dekho:` },
    { type: 'custom', render(el) {
      function vcCompare(a, b) {
        const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
        let le = true, ge = true;
        keys.forEach(k => { const x = a[k] || 0, y = b[k] || 0; if (x > y) le = false; if (x < y) ge = false; });
        if (le && ge) return 'same';
        if (le) return 'before';
        if (ge) return 'after';
        return 'concurrent';
      }
      const V = [
        { id: 'D1', c: { Sx: 1 }, items: ['Dangal'], t: 'Riya ne watchlist banayi aur "Dangal" daala. Server Sx ne write sambhala, apna counter 1 kiya.' },
        { id: 'D2', c: { Sx: 2 }, items: ['Dangal', 'Lagaan'], t: 'Riya ne "Lagaan" joda. Phir Sx ne sambhala: Sx = 2. D2 ki ghadi D1 se har jagah ≥ hai, to D2 naya hai aur D1 phenka ja sakta hai.' },
        { id: 'D3', c: { Sx: 2, Sy: 1 }, items: ['Dangal', 'Lagaan', 'Sholay'], t: 'Riya ke phone ne D2 padha aur "Sholay" joda. Is baar server Sy ne sambhala: D2 ki ghadi + (Sy, 1).' },
        { id: 'D4', c: { Sx: 2, Sz: 1 }, items: ['Dangal', 'Lagaan', 'PK'], t: 'Usi waqt Riya ke laptop ne bhi D2 hi padha tha (D3 nahi) aur "PK" joda. Server Sz ne sambhala. Ab D3 aur D4 ek doosre ko nahi jaante: CONCURRENT. System dono rakhta hai (siblings).' },
        { id: 'D5', c: { Sx: 3, Sy: 1, Sz: 1 }, items: ['Dangal', 'Lagaan', 'Sholay', 'PK'], t: 'Agle read pe app ko D3 aur D4 dono mile. App ne merge kiya (dono lists ka union) aur Sx ke through likha. Nayi ghadi dono ki ghadiyon ka max + Sx ka ek tick: D5 dono se naya, conflict khatam.' },
      ];
      let k = 0;
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
          <button type="button" class="btn small ghost vc-prev">Pichhla</button>
          <button type="button" class="btn small primary vc-next">Agla step</button>
          <strong class="vc-step" style="font-family:var(--f-mono)"></strong>
        </div>
        <div class="vc-text" style="margin:10px 0;font-size:15px"></div>
        <div class="vc-list" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px"></div>
        <div class="calc-note vc-leaf"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:12px">
          <span style="font-size:14px;color:var(--ink-2)">Do versions compare karo:</span>
          <select class="vc-a" aria-label="Pehla version" style="background:var(--surface);color:var(--ink);border:1px solid var(--line-2);border-radius:var(--r-sm);padding:4px 6px;font:14px var(--f-body)"></select><select class="vc-b" aria-label="Doosra version" style="background:var(--surface);color:var(--ink);border:1px solid var(--line-2);border-radius:var(--r-sm);padding:4px 6px;font:14px var(--f-body)"></select>
        </div>
        <div class="vc-cmp" style="margin-top:8px;font-size:14px"></div>`;
      const q = s => el.querySelector(s);
      const fmt = c => '[' + Object.keys(c).map(n => `(${n}, ${c[n]})`).join(', ') + ']';
      const leaves = () => V.slice(0, k + 1).filter(v => !V.slice(0, k + 1).some(o => o !== v && vcCompare(v.c, o.c) === 'before'));
      const fillSel = (sel, def) => { sel.innerHTML = V.slice(0, k + 1).map(v => `<option>${v.id}</option>`).join(''); sel.value = def; };
      const cmp = () => {
        const a = V.find(v => v.id === q('.vc-a').value), b = V.find(v => v.id === q('.vc-b').value), r = vcCompare(a.c, b.c);
        const msg = { same: `${a.id} aur ${b.id} ek hi version hain.`, before: `${a.id} → ${b.id}: ${b.id} naya hai (har counter ≥, kam se kam ek bada). ${a.id} phenka ja sakta hai.`, after: `${b.id} → ${a.id}: ${a.id} naya hai. ${b.id} phenka ja sakta hai.`, concurrent: `${a.id} ∥ ${b.id}: CONCURRENT. Dono mein kuch aisa hai jo doosre mein nahi (ek mein ek counter bada, doosre mein doosra). Dono rakho, app merge karega.` }[r];
        q('.vc-cmp').innerHTML = `<span style="font-family:var(--f-mono)">${fmt(a.c)} vs ${fmt(b.c)}</span><br><strong style="color:${r === 'concurrent' ? 'var(--amber)' : 'var(--ink)'}">${msg}</strong>`;
      };
      const draw = () => {
        q('.vc-step').textContent = `Step ${k + 1} / ${V.length}`;
        q('.vc-text').textContent = V[k].t;
        q('.vc-prev').disabled = k === 0; q('.vc-next').disabled = k === V.length - 1;
        const lv = leaves();
        q('.vc-list').innerHTML = V.slice(0, k + 1).map(v => {
          const live = lv.includes(v);
          return `<div style="border:1.5px solid ${live ? (lv.length > 1 ? 'var(--amber)' : 'var(--green)') : 'var(--line)'};border-radius:var(--r-sm);padding:8px;background:var(--surface);opacity:${live ? 1 : 0.55}">
            <strong>${v.id}</strong> <span style="font-size:12px;color:var(--ink-3)">${live ? 'rakha hai' : 'purana, phenk do'}</span>
            <div style="font:12.5px var(--f-mono);margin:4px 0">${fmt(v.c)}</div>
            <div style="font-size:13px;color:var(--ink-2)">${v.items.join(', ')}</div></div>`;
        }).join('');
        q('.vc-leaf').textContent = lv.length > 1 ? `Store mein ${lv.length} siblings: ${lv.map(v => v.id).join(' aur ')}. Koi doosre se naya nahi, to system khud nahi chun sakta.` : `Store mein sirf ${lv[0].id} bacha hai: baaki sab uske purane versions hain.`;
        fillSel(q('.vc-a'), V[Math.max(0, k - 1)].id); fillSel(q('.vc-b'), V[k].id); cmp();
      };
      q('.vc-prev').onclick = () => { k = Math.max(0, k - 1); draw(); };
      q('.vc-next').onclick = () => { k = Math.min(V.length - 1, k + 1); draw(); };
      q('.vc-a').onchange = cmp; q('.vc-b').onchange = cmp;
      draw();
    }},
    { type: 'p', html: `Dynamo ke paper se kuch asli baatein: (1) Merge app karta hai, isliye "add" kabhi nahi khota; lekin <strong>delete wapas aa sakta hai</strong>: agar laptop ne "Dangal" hataya aur phone ne concurrently kuch joda, to union mein Dangal laut aata hai. (2) Vector clock lamba na ho jaaye, isliye jab pairs ek limit (paper mein misaal ~10) se zyada hon to sabse purana pair hata dete hain; ye kabhi kabhi ghalat "concurrent" bata sakta hai, lekin production mein ye problem nahi dikhi. (3) Ek din ke measurement mein shopping cart service ki <strong>99.94%</strong> requests ko sirf ek version mila: conflicts asli hain, lekin kam hote hain. Vector clocks aur Lamport timestamps ki poori theory "Consensus, Raft aur clocks" lesson mein.` },

    { type: 'h3', text: '3. CRDTs: aisa data jo khud merge ho jaaye' },
    { type: 'p', html: `Vector clocks conflict <em>dhoondhte</em> hain, merge phir bhi app ko likhna padta hai. Kya data ko hi aisa bana sakte hain ki merge hamesha automatic aur sahi ho? Haan, kuch data types ke liye.` },
    { type: 'callout', tone: 'term', title: 'CRDT (Conflict-free Replicated Data Type)', html: `<strong>Ye kya hai:</strong> aise data types jinka merge rule maths se aisa bana hai ki kisi bhi order mein merge karo, kitni bhi baar (ek hi update do baar aaye to bhi), aakhir mein saari replicas <strong>same value</strong> pe pahunchengi. 2011 mein Shapiro aur saathiyon ne inhe formal roop diya.<br><strong>Kyun chahiye:</strong> AP system mein har replica bina poochhe writes leti hai. CRDT ho to merge ke liye na coordination chahiye, na app ka custom code.<br><strong>Iske bina:</strong> ya to LWW (writes khote hain) ya vector clocks + app ka khud ka merge code.<br><strong>Example:</strong> likes counter: Mumbai pe 2, Singapore pe 3. Merge ke baad dono pe 5, chahe sync kitni bhi baar, kisi bhi order mein ho.` },
    { type: 'p', html: `Sabse simple CRDT: <strong>G-counter</strong> (grow-only counter). Ek number ki jagah har replica ka <strong>apna alag slot</strong>: <code>{A: 2, B: 3, C: 0}</code>. Replica sirf apna slot badhati hai. Merge = har slot ka <strong>max</strong>. Value = saare slots ka <strong>jod</strong>. Neeche teen replicas pe likes daalo aur sync karo. Saath mein ek "naive" counter bhi chal raha hai jo sirf ek number rakhta hai aur merge pe do numbers ka max leta hai:` },
    { type: 'custom', render(el) {
      function gcounterCore() {
        const ids = ['A', 'B', 'C'];
        const S = { g: {}, naive: {} };
        const reset = () => { ids.forEach(r => { S.g[r] = { A: 0, B: 0, C: 0 }; S.naive[r] = 0; }); };
        reset();
        return {
          S, ids, reset,
          inc(r) { S.g[r][r]++; S.naive[r]++; },
          sync(x, y) { ids.forEach(k => { const m = Math.max(S.g[x][k], S.g[y][k]); S.g[x][k] = m; S.g[y][k] = m; }); const n = Math.max(S.naive[x], S.naive[y]); S.naive[x] = n; S.naive[y] = n; },
          value(r) { return ids.reduce((s, k) => s + S.g[r][k], 0); },
          truth() { return ids.reduce((s, k) => s + Math.max(...ids.map(r => S.g[r][k])), 0); },
        };
      }
      const g = gcounterCore();
      el.innerHTML = `<div class="gc-reps" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px">
          <span style="font-size:14px;color:var(--ink-2)">Sync (gossip):</span>
          <button type="button" class="btn small ghost" data-s="A,B">A ↔ B</button>
          <button type="button" class="btn small ghost" data-s="B,C">B ↔ C</button>
          <button type="button" class="btn small ghost" data-s="A,C">A ↔ C</button>
          <button type="button" class="btn small ghost gc-reset">Reset</button>
        </div>
        <div class="stats">
          <div class="stat"><span>Asli total likes</span><strong class="gc-t"></strong></div>
          <div class="stat"><span>G-counter (A / B / C)</span><strong class="gc-g"></strong></div>
          <div class="stat"><span>Naive counter (A / B / C)</span><strong class="gc-n"></strong></div>
        </div>
        <div class="calc-note gc-note"></div>`;
      const q = s => el.querySelector(s);
      const draw = () => {
        const box = q('.gc-reps'); box.innerHTML = '';
        g.ids.forEach(r => {
          const d = document.createElement('div');
          d.style.cssText = 'border:1px solid var(--line);border-radius:var(--r-sm);padding:8px;background:var(--surface)';
          d.innerHTML = `<strong>Replica ${r}</strong><div style="font:12.5px/1.6 var(--f-mono);margin:4px 0">{ ${g.ids.map(k => `${k}: ${g.S.g[r][k]}`).join(', ')} }<br>value = ${g.value(r)}<br><span style="color:var(--ink-3)">naive = ${g.S.naive[r]}</span></div>`;
          const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small primary'; b.textContent = 'Like +1 yahan';
          b.onclick = () => { g.inc(r); draw(); };
          d.appendChild(b); box.appendChild(d);
        });
        const t = g.truth(), gv = g.ids.map(r => g.value(r)), nv = g.ids.map(r => g.S.naive[r]);
        q('.gc-t').textContent = t; q('.gc-g').textContent = gv.join(' / '); q('.gc-n').textContent = nv.join(' / ');
        const conv = gv.every(v => v === t), naiveLoss = t - Math.max(...nv);
        q('.gc-note').textContent = conv && t > 0
          ? `G-counter: teeno replicas ${t} pe converge, ek bhi like nahi khoya.${naiveLoss > 0 ? ` Naive counter (merge = do numbers ka max) ${Math.max(...nv)} pe atka: ${naiveLoss} likes gayab.` : ''}`
          : t === 0 ? 'Alag alag replicas pe Like dabao (jaise A pe 2, B pe 3), phir Sync karo.' : `Abhi replicas alag hain (${gv.join(' / ')}). Sync karte jao: har sync mein har slot ka max liya jaata hai.`;
      };
      el.querySelectorAll('[data-s]').forEach(b => { b.onclick = () => { const [x, y] = b.dataset.s.split(','); g.sync(x, y); draw(); }; });
      q('.gc-reset').onclick = () => { g.reset(); draw(); };
      draw();
    }},
    { type: 'p', html: `Try karo: A pe 2 likes, B pe 3 likes, phir A ↔ B. G-counter dono pe 5, naive dono pe 3: 2 likes gayab. Phir C pe 1 like, B ↔ C, A ↔ C: G-counter teeno pe 6, naive 3 pe atka. Aur A ↔ B baar baar dabao: G-counter 6 hi rehta hai (max ko dobara lena kuch nahi badalta), jabki agar merge "jod do" hota to har sync pe count double ho jaata.` },
    { type: 'table', head: ['CRDT', 'Kya karta hai', 'xyz.com mein'], rows: [
      ['G-counter', 'Sirf badhta counter: har replica ka slot, merge = max', 'Views, likes'],
      ['PN-counter', 'Do G-counters: ek plus ka, ek minus ka; value = P - N', 'Like aur unlike dono'],
      ['OR-set (observed-remove set)', 'Set jismein add aur remove dono; concurrent add jeetta hai', 'Watchlist, tags, group members'],
      ['Sequence / text CRDTs', 'Characters ki list jahan sab concurrently type karein', 'Collaborative docs (Google Docs lesson)'],
    ]},
    { type: 'p', html: `Asli duniya mein: Riak ne counters, sets aur maps jaise CRDT data types diye; Redis ke Active-Active (multi-region) databases CRDTs pe chalte hain; aur kai collaborative editing tools apne "multiplayer" editing ke liye CRDTs ya unse inspired techniques use karte hain. <strong>Limit:</strong> har business rule CRDT mein nahi baithta. "Balance kabhi 0 se neeche na jaaye" ya "seat ek hi ko mile" ko bina coordination ke merge nahi kar sakte: wahan CP chahiye.` },

    { type: 'table', head: ['Tareeka', 'Kaise', 'Faayda', 'Keemat'], rows: [
      ['Last-write-wins', 'Bada timestamp jeeta', 'Sabse simple, koi extra data nahi', 'Concurrent writes khote hain; clock skew se naya write bhi kho sakta hai'],
      ['Vector clocks + siblings', 'Version history se "naya" vs "concurrent" pehchano; concurrent ho to app merge kare', 'Kuch chupchaap nahi khota', 'App ko merge likhna padta hai; deletes laut sakte hain; clocks bade hote hain'],
      ['CRDTs', 'Data type ka merge khud maths se sahi', 'Automatic, coordination-free merge', 'Sirf kuch data types; business rules (balance ≥ 0) nahi bachte'],
      ['Conflict hone hi mat do', 'Har key ka ek owner/leader (CP)', 'Koi merge nahi', 'Partition mein minority side unavailable'],
    ]},

    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Decide: quorum aur consistency level', html: `<strong>N = 3, W = 2, R = 2</strong> se har read kam se kam ek aise replica ko chhoota hai jiske paas latest write hai. Ye default rakho. Jahan thoda purana data chalega (views, likes, feeds), wahan speed ke liye <strong>W ya R ghatao</strong> (jaise ONE). Jahan linearizable chahiye (username, seat, paisa), wahan quorum pe bharosa mat karo: consensus wala store (etcd, Spanner, leader wala SQL) ya Cassandra ke lightweight transactions lo.` },
    { type: 'table', head: ['Feature', 'Model', 'Kaise'], rows: [
      ['Username, seat, balance', 'Linearizable', 'Leader / consensus wala store, conditional writes'],
      ['Chat, comment threads', 'Causal', 'Message pe "kis ke reply mein" ki info; client ka sticky replica'],
      ['Apna profile, apna post', 'Read-your-writes', 'Kuch seconds apne reads leader se, ya replica position check'],
      ['Inbox, comment list', 'Monotonic reads', 'User ko ek hi replica pe sticky rakho'],
      ['Views, likes', 'Eventual + CRDT counter', 'ONE level, G/PN-counter merge'],
      ['Profile bio (multi-region)', 'Eventual + LWW', 'Chalega agar kabhi kabhi ek edit khoye; warna vector clocks/siblings'],
    ]},

    { type: 'diagram', title: 'Consistency aur quorums: poori picture', height: 530,
      groups: [
        { label: 'N = 3 replicas (ek key)', x: 28, y: 258, w: 526, h: 108 },
      ],
      nodes: [
        { id: 'app', label: 'xyz.com app', sub: 'har query ka level', x: 360, y: 50, w: 180, kind: 'client', info: 'Ye kya hai: xyz.com ka code. Har feature ke hisaab se level chunta hai: views ONE pe, bio QUORUM pe, username consensus store pe.' },
        { id: 'coord', label: 'Coordinator', sub: 'N=3, W/R per query', x: 290, y: 170, w: 180, kind: 'server', info: 'Ye kya hai: wo node jo request sambhalta hai. Write N replicas ko bhejta hai aur W acks ka wait karta hai; read pe R jawab leke sabse naya version chunta hai aur purane replica ko read repair karta hai.' },
        { id: 'cons', label: 'Consensus store', sub: 'username, seat', x: 590, y: 170, w: 180, kind: 'data', info: 'Ye kya hai: Raft/Paxos wala store (etcd, Spanner, leader wala SQL). Jahan linearizable chahiye (username, seat, paisa), wahan quorum ke bajaye ye. Partition mein minority side ruk jaati hai.' },
        { id: 'r1', label: 'Replica 1', sub: 'v2 + version', x: 110, y: 320, kind: 'data', info: 'Ye kya hai: key ki ek copy, version info ke saath (Dynamo mein vector clock, Cassandra mein timestamp). Conflict pe LWW, siblings ya CRDT merge yahin lagta hai.' },
        { id: 'r2', label: 'Replica 2', sub: 'v2', x: 290, y: 320, kind: 'data', info: 'Ye kya hai: doosri copy. W = 2 aur R = 2 ke saath ye ya koi aur ek replica read aur write dono groups mein common hota hai: overlap.' },
        { id: 'r3', label: 'Replica 3', sub: 'v1 (peeche)', x: 470, y: 320, kind: 'data', info: 'Ye kya hai: teesri copy, abhi peeche. Read repair, hinted handoff ya anti-entropy ise pakda dete hain. ONE read agar yahan aaya to purana data.' },
        { id: 'hint', label: 'Node D', sub: 'hint for R3', x: 640, y: 320, w: 130, kind: 'data', info: 'Ye kya hai: ring pe agla healthy node. Replica 3 down tha to sloppy quorum ne write yahan rakha, hint ke saath. R3 wapas aaya to hinted handoff.' },
        { id: 'ae', label: 'Anti-entropy', sub: 'Merkle-tree repair', x: 290, y: 470, w: 180, kind: 'queue', info: 'Ye kya hai: background job jo replicas ka data compare karke differences theek karta hai. Jo data koi padhta hi nahi, wo bhi aakhir mein same ho jaata hai (eventual consistency).' },
      ],
      edges: [
        { a: 'app', b: 'coord', n: 1, label: 'GET / PUT' },
        { a: 'app', b: 'cons', label: 'strong ops' },
        { a: 'coord', b: 'r1', n: 2 },
        { a: 'coord', b: 'r2' },
        { a: 'coord', b: 'r3' },
        { a: 'coord', b: 'hint', dashed: true, label: 'sloppy write' },
        { a: 'hint', b: 'r3', kind: 'evt' },
        { a: 'ae', b: 'r1', kind: 'evt', dashed: true },
        { a: 'ae', b: 'r2', kind: 'evt', dashed: true },
        { a: 'ae', b: 'r3', kind: 'evt', dashed: true },
      ],
      paths: [
        { name: 'QUORUM write + read', text: 'Write ko R1 aur R2 ne ack kiya (W = 2). Read R2 aur R3 se (R = 2): R2 common hai, naya version jeeta, R3 ko read repair.', go: ['app>coord>r1', 'coord>r2', 'coord>r3'] },
        { name: 'ONE read (fast)', text: 'Sirf ek replica se jawab: sabse tez. R3 pe gaya to purana v1 mila. Views/likes ke liye chalega.', go: ['app>coord>r3'] },
        { name: 'Replica down: hinted handoff', text: 'R3 down tha. Write Node D pe hint ke saath. R3 wapas aaya to Node D ne data de diya.', go: ['app>coord>hint>r3'] },
        { name: 'Username (linearizable)', text: 'Unique username quorum pe nahi, consensus store pe: "do sirf agar khaali hai".', go: ['app>cons'] },
        { name: 'Background repair', text: 'Anti-entropy Merkle trees se replicas compare karke peeche wale ko theek karti hai.', go: ['ae>r1', 'ae>r2', 'ae>r3'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Consistency ek seedhi hai: linearizable → sequential → causal → (read-your-writes, monotonic reads) → eventual. Upar = zyada pakka, zyada slow.</li>
      <li>Linearizable = jaise ek copy, real time order. Sequential = sab ek order, real time zaroori nahi. Causal = wajah pehle, nateeja baad mein.</li>
      <li>Read-your-writes aur monotonic reads ek user ke session ke vaade hain: leader se read, sticky replica.</li>
      <li>Quorum: <strong>R + W &gt; N</strong> to read aur write mein kam se kam ek common replica. (3, 2, 2) default.</li>
      <li>Tunable: ONE (tez, purana ho sakta), QUORUM (balance), ALL (sabse pakka, ek down = fail).</li>
      <li>Quorum bhi linearizable nahi: sloppy quorum, adhoore writes, LWW. Hinted handoff aur anti-entropy baad mein theek karte hain.</li>
      <li>Conflicts: LWW (simple, writes khote hain), vector clocks (conflict pehchano, app merge kare), CRDTs (khud merge, jaise G-counter).</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['Har feature ko utna hi vaada jitna chahiye: kam latency, kam kharcha', 'Quorums: failover ke bina failures jhelna (N - W writes ke liye, N - R reads ke liye)', 'Tunable levels: ek hi database mein fast aur safe dono queries', 'Vector clocks aur CRDTs: AP systems mein bhi writes chupchaap nahi khote'],
      costs: ['Weak models mein ajeeb results (purana data, ulta order) jinke liye app ko taiyaar rehna padta hai', 'Strong models: har op pe coordination, latency, partition mein errors', 'Quorum bhi linearizable nahi (sloppy quorum, adhoore writes, LWW)', 'LWW clock skew se data khota hai; vector clocks/CRDTs app aur storage dono ko complex banate hain'],
    },

    { type: 'think', questions: [
      { q: 'N = 5 hai. Tum chahte ho ki writes 2 failures jhel lein aur reads bhi fresh hon. W aur R kya rakhoge?', a: 'Writes 2 failures jhelein to W ≤ 3. Fresh reads ke liye R + W > 5, to W = 3 ke saath R ≥ 3. To (N, W, R) = (5, 3, 3): writes aur reads dono 2 failures jhelte hain, aur overlap pakka. (Sloppy quorum band ho tab.)' },
      { q: 'xyz.com ke "follow" button ke liye follower count dikhana hai, aur ek user unfollow bhi kar sakta hai. G-counter kaafi hai?', a: 'Nahi, G-counter sirf badhta hai. PN-counter chahiye: ek G-counter follows ka, ek unfollows ka, value = P - N. Aur "kya Riya Aman ko follow karti hai?" jaisa sawaal ek set ka hai: OR-set jaisa CRDT, ya us relation ko ek hi jagah (leader) pe rakhna.' },
      { q: 'Do data centres mein Cassandra hai, har DC mein RF = 3. Mumbai ke app servers LOCAL_QUORUM pe likhte aur padhte hain. Mumbai ke users ke liye kya guarantee hai, aur Singapore ke users ke liye?', a: 'Mumbai ke andar LOCAL_QUORUM write (2 of 3) + LOCAL_QUORUM read (2 of 3) overlap karte hain, to Mumbai ke users latest dekhenge, bina Singapore ka wait kiye (fast). Singapore ke users (jo apne DC se LOCAL_QUORUM padhte hain) ko Mumbai ka write tab dikhega jab async copy pahunchegi: unke liye eventual. Ye PACELC ka EL choice hai.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'N = 3, W = 1, R = 1. Kya stale read possible hai?', options: ['Nahi, kyunki 3 copies hain', 'Haan, kyunki R + W = 2 ≤ N, read aur write sets alag ho sakte hain', 'Sirf jab koi replica down ho'], answer: 1, explain: 'Write ek replica pe, read kisi doosre se: koi overlap nahi. Saare replicas zinda hon tab bhi.' },
      { q: 'Chat mein Neha ko Aman ka "haan!" dikha, lekin Riya ka sawaal "movie chalein?" nahi. Kaunsa model toota?', options: ['Causal consistency', 'Read-your-writes', 'Monotonic reads'], answer: 0, explain: 'Jawab sawaal ki wajah se tha. Causal consistency kehti hai wajah hamesha nateeje se pehle dikhe.' },
      { q: 'Vector clocks [(Sx, 2), (Sy, 1)] aur [(Sx, 2), (Sz, 1)] ka rishta?', options: ['Pehla naya hai', 'Doosra naya hai', 'Concurrent: dono rakho aur merge karo'], answer: 2, explain: 'Pehle mein Sy bada, doosre mein Sz bada. Koi doosre ko poori tarah cover nahi karta: concurrent.' },
      { q: 'LWW mein naya write kab khota hai, chahe writes concurrent na hon?', options: ['Kabhi nahi', 'Jab purane write wale node ki ghadi itni aage ho ki uska timestamp bada aa jaaye (clock skew)', 'Jab N bahut bada ho'], answer: 1, explain: 'Timestamp machine ki ghadi se aata hai. Skew > writes ke beech ka gap = order ulta, naya write mit gaya.' },
      { q: 'Sloppy quorum ka sabse bada risk?', options: ['Writes slow ho jaate hain', 'W acks ghar ke bahar wale nodes se aa sakte hain, to R + W > N hote hue bhi read purana data de sakta hai', 'Data permanently delete ho jaata hai'], answer: 1, explain: 'Availability ke liye overlap ki guarantee chhodi. Hinted handoff baad mein data asli replica tak pahunchata hai.' },
    ]},
    { type: 'sources', note: 'Dynamo paper poora padha gaya; numbers aur examples (3,2,2), D1-D5, 99.94%, truncation ~10 wahi se. Product behaviour official docs se.', items: [
      { title: 'Dynamo: Amazon\'s Highly Available Key-value Store', publisher: 'SOSP 2007 (Amazon)', official: true, year: 2007, url: 'https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf', used: 'N/R/W aur R + W > N, common (3,2,2), sloppy quorum + hinted handoff (node A/D example), vector clocks ka D1-D5 example, syntactic vs semantic reconciliation, deleted items wapas aana, clock truncation, Merkle-tree anti-entropy, read-heavy R=1/W=N, LWW mode, 99.94% single version.' },
      { title: 'Dynamo-style architecture and consistency levels', publisher: 'Apache Cassandra documentation', official: true, url: 'https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html', used: 'ONE/TWO/THREE/QUORUM/ALL/LOCAL_QUORUM/EACH_QUORUM/LOCAL_ONE/ANY, per-cell timestamps se last-write-wins (vector clocks nahi), read repair, hinted handoff, anti-entropy repair.' },
      { title: 'How is the consistency level configured?', publisher: 'DataStax Cassandra documentation', official: true, url: 'https://docs.datastax.com/en/cassandra-oss/3.0/cassandra/dml/dmlConfigConsistency.html', used: 'QUORUM ka formula (multi-DC mein RFs ka total), LOCAL_QUORUM ka matlab.' },
      { title: 'DynamoDB read consistency', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html', used: 'Eventually vs strongly consistent reads, cost, GSIs/streams sirf eventual, global tables MREC vs MRSC.' },
      { title: 'DynamoDB global tables with multi-Region strong consistency is now generally available', publisher: 'AWS What\'s New', official: true, year: 2025, url: 'https://aws.amazon.com/about-aws/whats-new/2025/06/amazon-dynamo-db-global-tables-multi-region-strong-consistency-generally-available/', used: 'MRSC GA date (June 2025).' },
      { title: 'Consistency Models', publisher: 'Jepsen', url: 'https://jepsen.io/consistency/models', used: 'Linearizable, sequential, causal ki definitions aur partition mein kaun se models available reh sakte hain.' },
      { title: 'Consistency Tradeoffs in Modern Distributed Database System Design', publisher: 'Daniel Abadi, IEEE Computer', year: 2012, url: 'https://www.cs.umd.edu/~abadi/papers/abadi-pacelc.pdf', used: 'R + W > N se bhi Dynamo-style systems poori (Gilbert-Lynch) consistency nahi dete.' },
      { title: 'Conflict-free Replicated Data Types', publisher: 'Shapiro, Preguiça, Baquero, Zawirski (SSS 2011 / INRIA)', year: 2011, url: 'https://hal.inria.fr/inria-00609399v1', used: 'CRDT ki definition, state-based merge (max) se convergence, G-counter / PN-counter / OR-set.' },
    ]},
  ],
});
