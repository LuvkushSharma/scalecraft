Lesson.register({
  id: 'pagination-idempotency',
  title: 'Pagination aur idempotency',
  minutes: 26,
  summary: `Do cheezein jo har achhi API mein hoti hain. Pagination: 10 lakh posts ek saath mat bhejo, thoda thoda bhejo (offset vs cursor, aur offset bade scale pe kyun tootta hai, live demo ke saath). Idempotency: agar network ki wajah se request do baar chali gayi, to kaam do baar nahi hona chahiye, khaas kar paise ka (idempotency keys, server unhe kaise store karta hai, PUT vs POST).`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Do chhoti si problems, lekin har bade app mein aati hain.<br><strong>Pehli:</strong> Riya ke feed mein 50,000 posts hain. Sab ek saath bhejenge to phone hang ho jaayega. Isliye 20-20 karke bhejte hain. Lekin "agle 20" ka hisaab galat hua, to posts repeat hongi ya gayab ho jaayengi.<br><strong>Doosri:</strong> Riya ne "Pay ₹500" dabaya, aur internet beech mein atak gaya. App dobara bhejti hai. Server ko pehchanna chahiye ki "ye wahi purana payment hai", warna paise do baar katenge.<br>Is lesson mein dono ka sahi ilaaj, khud chala ke.` },

    { type: 'h2', text: 'Part 1: Pagination' },
    { type: 'p', html: `xyz.com pe Riya ke feed mein 50,000 posts hain. Agar API <code>GET /feed</code> pe saari 50,000 bhej de, to kya hoga?` },
    { type: 'list', items: [
      `Response lagbhag 50 MB ka. Phone ka data aur battery khatam.`,
      `Database ko 50,000 rows padh ke bhejni padengi. Har user ke liye. Database thak jaayega.`,
      `Aur user dekhega sirf pehli 10-20 posts. Baaki sab bekaar mehnat.`,
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: pagination', html: `<strong>Ye kya hai:</strong> bade result ko chhote hisson (<strong>pages</strong>) mein bhejna. Pehle 20, user neeche scroll kare to agle 20. Har page mein kitne items, use <strong>limit</strong> (ya page size) kehte hain.<br><strong>Kyun chahiye:</strong> response chhota aur tez rahe, database utna hi padhe jitna dikhna hai.<br><strong>Iske bina:</strong> bade users ke liye API slow, phone pe bhaari, aur database pe bekaar bojh.<br><strong>Example:</strong> Google search ka "1 2 3 ... Next", ya Instagram ka infinite scroll (neeche jaate raho, posts aate rahenge). Dono andar se pagination hi hain.` },
    { type: 'p', html: `Sawaal ye hai: server ko kaise bataayein ki "agle 20" kaun se hain? Iske do main tareeke hain.` },

    { type: 'h3', text: 'Tareeka 1: Offset pagination' },
    { type: 'code', text: `
GET /feed?limit=20&offset=0     → post 1 se 20
GET /feed?limit=20&offset=20    → post 21 se 40
GET /feed?limit=20&offset=40    → post 41 se 60

SQL:  SELECT * FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 20` },
    { type: 'callout', tone: 'term', title: 'Naya word: offset', html: `<strong>Ye kya hai:</strong> "shuru ki kitni items chhod do". <code>offset=40</code> matlab pehli 40 chhodo, phir <code>limit</code> jitni do.<br><strong>Kyun chahiye:</strong> sabse aasaan tareeka hai. "Page 5" = <code>offset = (5-1) × 20 = 80</code>. Seedha kisi bhi page pe jump.<br><strong>Iske bina:</strong> page numbers wala UI ("1 2 3 ... 50") banana mushkil.<br><strong>Dikkat:</strong> do problems. Neeche khud dekho.` },
    { type: 'p', html: `<strong>Problem 1: list hilti hai.</strong> Offset ginti pe chalta hai ("pehli 5 chhodo"). Agar user ke page 1 dekhne aur page 2 maangne ke beech list badal gayi (nayi post aayi ya koi post delete hui), to ginti khisak jaati hai. Demo mein har page 5 posts ka hai:` },
    { type: 'custom', render(el) {
      const S = {
        off: 'Offset se page 2 lo', cur: 'Cursor se page 2 lo', add: '2 nayi posts aa gayin', del: 'Ek dekhi hui post delete hui', reset: 'Reset',
        db: 'Database (newest upar)', seen: 'User ko dikha', missing: 'Kabhi nahi dikhi: ',
        start: 'Page 1 load hua: posts 20 se 16. Ab "2 nayi posts aa gayin" ya "Ek dekhi hui post delete hui" dabao, phir dono tareeke se page 2 lo aur compare karo.',
        added: 'Kisi ne 2 nayi posts daali. Wo list ke sabse upar aa gayin, baaki sab 2 jagah neeche khisak gaye.',
        deleted: 'Post 18 delete ho gayi (user use dekh chuka tha). Uske neeche wali sab posts 1 jagah upar khisak gayin.',
        offDup: d => `Offset 5 ka matlab "pehli 5 chhodo". Lekin list khisak chuki thi, to ${d} post(s) jo user dekh chuka tha, phir se aa gayin (laal).`,
        offMiss: m => `Offset 5 ne "pehli 5" chhodi, lekin list upar khisak chuki thi. Post ${m} kisi page pe nahi aayi: user ne use kabhi nahi dekha!`,
        offOk: 'Beech mein kuch nahi badla tha, to offset theek chala. Ab list badal ke phir try karo.',
        curOk: last => `Cursor ka matlab "post ${last} se purani wali 5 do". Upar kitni bhi nayi posts aayein ya beech mein kuch delete ho, ye hamesha sahi jagah se shuru karta hai. Na duplicate, na gayab.`,
        again: 'Page 2 pehle hi le liya. Reset dabao aur doosra tareeka try karo.',
      };
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px">
          <button type="button" class="btn small primary pg-off">${S.off}</button><button type="button" class="btn small primary pg-cur">${S.cur}</button>
          <button type="button" class="btn small pg-new">${S.add}</button><button type="button" class="btn small pg-del">${S.del}</button><button type="button" class="btn small ghost pg-reset">${S.reset}</button>
        </div>
        <div class="row2" style="margin-top:14px">
          <div><div style="font-weight:700;font-family:var(--f-display)">${S.db}</div><div class="pg-db"></div></div>
          <div><div style="font-weight:700;font-family:var(--f-display)">${S.seen}</div><div class="pg-seen"></div><div class="pg-miss" style="margin-top:6px;color:var(--red);font-size:13px"></div></div>
        </div>
        <div class="calc-note pg-note"></div>`;
      let db, seen, next, done;
      const q = c => el.querySelector(c);
      const chip = (txt, style) => `<span style="display:inline-block;margin:3px;padding:3px 8px;border-radius:6px;font:13px var(--f-mono);${style}">${txt}</span>`;
      const draw = (miss) => {
        q('.pg-db').innerHTML = db.map(id => chip('post ' + id, id >= 100 ? 'background:var(--accent-soft);color:var(--accent-ink)' : 'background:var(--surface-2)')).join('');
        q('.pg-seen').innerHTML = seen.map(s => chip('p' + s.page + ': ' + s.id, s.dup ? 'background:color-mix(in srgb,var(--red) 18%,var(--surface));color:var(--red)' : 'background:var(--surface-2)')).join('');
        q('.pg-miss').textContent = miss && miss.length ? S.missing + miss.map(m => 'post ' + m).join(', ') : '';
      };
      const reset = () => { db = []; for (let i = 20; i >= 1; i--) db.push(i); seen = db.slice(0, 5).map(id => ({ id, dup: false, page: 1 })); next = 100; done = false; draw(); q('.pg-note').textContent = S.start; };
      const take = page => { const have = new Set(seen.map(s => s.id)); page.forEach(id => seen.push({ id, dup: have.has(id), page: 2 })); done = true; return page.filter(id => have.has(id)).length; };
      // posts that are older than page 1's last post but newer than page 2's first one, and were never shown
      const missing = () => { const p1 = seen.filter(s => s.page === 1), p2 = seen.filter(s => s.page === 2); const lo = p2.length ? p2[0].id : 0, hi = p1[p1.length - 1].id; const have = new Set(seen.map(s => s.id)); return db.filter(id => id < hi && id > lo && !have.has(id)); };
      q('.pg-new').onclick = () => { db.unshift(next + 1, next); next += 2; draw(); q('.pg-note').textContent = S.added; };
      q('.pg-del').onclick = () => { db = db.filter(id => id !== 18); draw(); q('.pg-note').textContent = S.deleted; };
      q('.pg-off').onclick = () => { if (done) { q('.pg-note').textContent = S.again; return; } const d = take(db.slice(5, 10)); const m = missing(); draw(m); q('.pg-note').textContent = d ? S.offDup(d) : m.length ? S.offMiss(m.join(', ')) : S.offOk; };
      q('.pg-cur').onclick = () => { if (done) { q('.pg-note').textContent = S.again; return; } const last = seen.filter(s => s.page === 1).slice(-1)[0].id; take(db.filter(id => id < last).slice(0, 5)); draw(missing()); q('.pg-note').textContent = S.curOk(last); };
      q('.pg-reset').onclick = reset;
      reset();
    }},
    { type: 'h3', text: 'Tareeka 2: Cursor (keyset) pagination' },
    { type: 'p', html: `Cursor ka idea: "kitni chhodo" mat bolo. Bolo <strong>"kahan tak dekh liya"</strong>. Jaise kitaab mein bookmark: "page 47 ke baad se padho". Beech mein kitne bhi page jud jaayein, bookmark wahi rehta hai.` },
    { type: 'code', text: `
GET /feed?limit=20
→ { "data": [ ...20 posts... ], "next_cursor": "eyJpZCI6OTgxMn0", "has_more": true }

GET /feed?limit=20&cursor=eyJpZCI6OTgxMn0     ← "post 9812 se purani 20 do"

SQL:  SELECT * FROM posts WHERE id < 9812 ORDER BY id DESC LIMIT 20` },
    { type: 'callout', tone: 'term', title: 'Naya word: cursor', html: `<strong>Ye kya hai:</strong> server ka diya hua ek chhota "bookmark" jo batata hai ki pichhla page kahan khatam hua. Aksar pichhle page ke aakhri item ka id (ya time) hota hai, encode karke ek string bana diya jaata hai.<br><strong>Kyun chahiye:</strong> agla page hamesha sahi jagah se shuru ho, chahe list mein nayi cheezein aayein ya kuch delete ho.<br><strong>Iske bina:</strong> offset ki tarah duplicates aur gayab posts.<br><strong>Example:</strong> <code>eyJpZCI6OTgxMn0</code> asal mein <code>{"id":9812}</code> ko base64url mein (URL-safe base64, aakhri <code>=</code> hata ke) likha hua hai. Client ko iske andar jhaankna nahi chahiye, bas agli request mein wapas bhej dena hai. Isliye ise <strong>opaque</strong> cursor kehte hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: keyset aur index', html: `<strong>Ye kya hai:</strong> cursor ka database wala naam <strong>keyset pagination</strong> hai: "jo key (id ya time) maine aakhri dekhi, uske baad ki rows do" (<code>WHERE id &lt; 9812</code>). Ye tez isliye hai kyunki database ke paas <strong>index</strong> hota hai. Index ek sorted list hai, kitaab ke peeche wale index jaisi: "id 9812 → yahan". Database seedha us jagah jump karta hai.<br><strong>Kyun chahiye:</strong> page 1 ho ya page 5000, kaam utna hi.<br><strong>Iske bina:</strong> database ko shuru se gin ke aana padta hai (agla hissa dekho). Index ka poora lesson (db-internals) aage hai.` },
    { type: 'callout', tone: 'warn', title: 'Sort key unique honi chahiye', html: `Agar feed <code>created_at</code> (time) se sorted hai, aur do posts ka time bilkul same hai, to <code>WHERE created_at &lt; X</code> ek post chhod dega. Ilaaj: <strong>tie-breaker</strong> jodo. Sort <code>(created_at, id)</code> pe karo, aur cursor mein dono rakho: <code>WHERE (created_at, id) &lt; ('2026-10-01 10:00', 9812)</code>. Index bhi isi jode pe banao.` },

    { type: 'h3', text: 'Problem 2: offset bade scale pe slow hota hai' },
    { type: 'p', html: `<code>OFFSET 100000</code> ka matlab hai "pehli 1 lakh rows chhodo". Lekin database ke paas "1 lakh chhodo" ka shortcut nahi hai. Use pehli 1,00,000 rows ek ek karke padhni padti hain, phir phenkni padti hain, tab jaake 20 milti hain. Jitna neeche scroll, utna slow. Cursor mein index se seedha jump. Neeche slider chala ke dekho:` },
    { type: 'custom', render(el) {
      const S = { page: 'Page number', size: 'Page size (limit)', off: 'Offset: database kitni rows padhta hai', cur: 'Cursor: database kitni rows padhta hai', ratio: 'Offset kitna zyada kaam',
        note: (p, n, o) => `Page ${p} ke liye offset = (${p} - 1) × ${n} = ${o.toLocaleString('en-IN')}. Database ${o.toLocaleString('en-IN')} rows padh ke phenkta hai, phir ${n} deta hai. Cursor index se seedha sahi jagah pahunchta hai aur sirf ${n} padhta hai (plus index mein dhoondhne ke kuch steps).` };
      el.innerHTML = `<div class="row2"><div><label>${S.page}: <strong class="po-pv"></strong></label><input type="range" class="po-p" min="1" max="5000" value="1" aria-label="${S.page}"></div>
        <div><label>${S.size}: <strong class="po-nv"></strong></label><input type="range" class="po-n" min="10" max="100" step="10" value="20" aria-label="${S.size}"></div></div>
        <div class="po-bars" style="margin-top:12px"></div><div class="stats po-stats"></div><div class="calc-note po-note"></div>`;
      const q = c => el.querySelector(c);
      const bar = (label, v, max, col) => `<div style="margin:6px 0"><div style="font-size:13px;color:var(--ink-2)">${label}: <strong style="font-family:var(--f-mono)">${v.toLocaleString('en-IN')}</strong></div><div style="height:12px;background:var(--surface-2);border-radius:6px;overflow:hidden"><div style="height:12px;width:${Math.max(0.6, 100 * v / max)}%;background:${col}"></div></div></div>`;
      const draw = () => {
        const p = +q('.po-p').value, n = +q('.po-n').value, o = (p - 1) * n, offRows = o + n, curRows = n;
        q('.po-pv').textContent = p; q('.po-nv').textContent = n;
        q('.po-bars').innerHTML = bar(S.off, offRows, offRows, 'var(--red)') + bar(S.cur, curRows, offRows, 'var(--green)');
        q('.po-stats').innerHTML = `<div class="stat"><span>${S.ratio}</span><strong>${Math.round(offRows / curRows).toLocaleString('en-IN')}×</strong></div>`;
        q('.po-note').textContent = S.note(p, n, o);
      };
      q('.po-p').oninput = draw; q('.po-n').oninput = draw; draw();
    }},
    { type: 'table', head: ['', 'Offset', 'Cursor (keyset)'], rows: [
      ['"Page 7 pe jao"', 'Haan, seedha', 'Nahi (sirf aage/peeche)'],
      ['Deep pages pe speed', 'Slow hoti jaati hai (offset + limit rows padhta hai)', 'Hamesha fast (sirf limit rows)'],
      ['Naya data aane / delete hone pe', 'Duplicates ya gayab items', 'Stable'],
      ['"Total 50,000 results"', 'Aksar dikhate hain (lekin COUNT(*) bhi mehenga hai)', 'Aksar nahi, sirf has_more'],
      ['Kahan use', 'Chhoti admin tables, search ke page numbers', 'Feeds, chats, infinite scroll, badi lists, API exports'],
    ]},
    { type: 'p', html: `Asli APIs mein: Stripe list APIs <code>limit</code>, <code>starting_after</code> (pichhle page ka aakhri object id) aur <code>has_more</code> use karti hain. Slack <code>cursor</code> leta hai aur <code>next_cursor</code> lautata hai. GitHub ke kai endpoints page number use karte hain, kuch <code>before</code>/<code>after</code> cursor, aur agle page ka link response ke <code>Link</code> header mein deta hai.` },
    { type: 'callout', tone: 'mistake', html: `<strong>"Cursor bhi to bas page number hai."</strong> Nahi. Page number ek ginti hai ("21vi item se"); cursor ek jagah hai ("post 9812 ke baad se"). Ginti list badalne pe galat ho jaati hai, jagah nahi. Doosri galti: limit pe hadd na lagana. Client <code>?limit=1000000</code> bhej de to pagination ka faayda gaya. Server pe max limit rakho (jaise 100), jaise GitHub karta hai.` },
    { type: 'h2', text: 'Part 2: Idempotency' },
    { type: 'p', html: `Riya xyz.com pe ₹500 ka premium plan khareed rahi hai. "Pay" dabaya. Request server tak pahunchi, paisa kat gaya. Lekin jawab wapas aate waqt network toot gaya.` },
    { type: 'p', html: `Riya ki app ko sirf <strong>timeout</strong> dikha (yaani "itni der mein jawab nahi aaya"). App ko pata hi nahi ki payment hua ya nahi. Teen possibilities hain: request server tak pahunchi hi nahi, ya pahunchi aur kaam hua, ya pahunchi aur kaam beech mein atka. App ke paas pata karne ka koi tareeka nahi. To app retry karti hai. Ab kya ₹500 do baar katenge?` },
    { type: 'callout', tone: 'term', title: 'Naya word: idempotent', html: `<strong>Ye kya hai:</strong> ek operation <strong>idempotent</strong> hai agar use ek baar karo ya das baar, aakhri result same rahe. Lift ka button jaisa: ek baar dabao ya paanch baar, lift ek hi baar aati hai.<br><strong>Kyun chahiye:</strong> network pe retry hona tay hai. Agar operation idempotent hai, to retry bilkul safe hai.<br><strong>Iske bina:</strong> har retry pe double payment, double order, double message.<br><strong>Example:</strong> "Riya ka naam = Riya S set karo" idempotent hai (5 baar bhi karo, naam Riya S). "Riya ke wallet mein ₹500 jodo" idempotent nahi (5 baar = ₹2500).` },
    { type: 'table', head: ['HTTP method', 'Safe?', 'Idempotent?', 'Kyun'], rows: [
      ['GET, HEAD', 'Haan', 'Haan', 'Sirf padhta hai, kuch nahi badalta'],
      ['PUT', 'Nahi', 'Haan', '"Ye resource ab bilkul aisa hai": 5 baar karo, haal wahi'],
      ['DELETE', 'Nahi', 'Haan', 'Post 9 delete: doosri baar bhi post 9 deleted hi hai (jawab 404 ho sakta hai, haal same)'],
      ['POST', 'Nahi', 'Nahi', '"Naya payment banao": har baar naya payment!'],
      ['PATCH', 'Nahi', 'Zaroori nahi', '"name = Riya S" idempotent hai, lekin "followers + 1" nahi. Depend karta hai ki patch kya kehta hai'],
    ]},
    { type: 'h3', text: 'PUT vs POST: kaun banata hai id?' },
    { type: 'p', html: `<strong>POST</strong> collection pe jaata hai: <code>POST /orders</code> = "ek naya order banao, id tum (server) do". Do baar bheja, do orders, do alag ids.` },
    { type: 'p', html: `<strong>PUT</strong> ek pakke address pe jaata hai: <code>PUT /orders/7f3a91c2</code> = "is id wala order ab bilkul aisa hai". Yahan id client ne banaya. Do baar bheja, to bhi ek hi order <code>7f3a91c2</code>: pehli baar bana, doosri baar wahi data dobara likha gaya. Isliye agar client khud ek unique id bana sake, to create ko bhi PUT se idempotent bana sakte ho.` },
    { type: 'callout', tone: 'mistake', html: `<strong>"PUT update ke liye, POST create ke liye."</strong> Aadha sach hai. Asli farak hai: PUT ka matlab "is address pe ye poori cheez rakh do" (isliye idempotent), POST ka matlab "is collection ko ye do, wo jo chahe kare" (isliye nahi). Zyada tar APIs mein server id banata hai, isliye create POST se hota hai, aur tab retry-safety ke liye <strong>idempotency key</strong> chahiye.` },

    { type: 'h3', text: 'Ilaaj: idempotency key' },
    { type: 'p', html: `Client har naye action ke liye ek unique <strong>idempotency key</strong> banata hai (jaise ek random UUID) aur request ke header mein bhejta hai. Retry mein <em>wahi key</em> jaati hai. Server kaam karne se pehle dekhta hai: "ye key pehle dekhi hai? Haan, to naya kaam mat karo, pichhla result lauta do."` },
    { type: 'callout', tone: 'term', title: 'Naya word: idempotency key', html: `<strong>Ye kya hai:</strong> ek lamba random string (jaise <code>7f3a91c2-...</code>) jo ek "user ki ek koshish" ko pehchanta hai. Header mein jaata hai: <code>Idempotency-Key: 7f3a91c2-...</code><br><strong>Kyun chahiye:</strong> server pehchaan sake ki do requests asal mein ek hi kaam hain (pehli + uska retry), na ki do alag kaam.<br><strong>Iske bina:</strong> server ke liye har POST naya hai. Retry = double charge.<br><strong>Example:</strong> Stripe ki saari POST requests ye header leti hain. Stripe pehli request ka status code aur body save karta hai, aur same key pe wahi lauta deta hai, chahe pehli baar error hi kyun na aaya ho. Keys 24 ghante purani hone ke baad hataayi ja sakti hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: UUID', html: `<strong>Ye kya hai:</strong> UUID (Universally Unique Identifier) ek 128-bit random jaisa id hai, jaise <code>7f3a91c2-5b1e-4c8a-9d2f-0e6b3a1c4d55</code>. Itne saare possible UUIDs hain ki do baar same banna practically namumkin hai.<br><strong>Kyun chahiye:</strong> app bina server se poochhe khud ek unique key bana sake.<br><strong>Iske bina:</strong> key ke liye pehle server ko call karna padta, jo khud fail ho sakti hai.` },
    { type: 'h3', text: 'Server keys ko kaise store karta hai' },
    { type: 'p', html: `Server ke paas ek chhoti table hoti hai (database mein, ya Redis mein). Har key ki ek row:` },
    { type: 'table', head: ['Column', 'Kya rakhta hai', 'Kyun'], rows: [
      ['<code>key</code> (UNIQUE)', '7f3a91c2-...', 'Database khud guarantee kare ki ek key ki do rows na banein'],
      ['<code>user_id</code>', '42', 'Ek user ki key se doosre user ka result na mile'],
      ['<code>request_hash</code>', 'amount=500, plan=premium ka fingerprint', 'Same key alag data ke saath aaye to pakad sakein'],
      ['<code>status</code>', 'in_progress / done', 'Pata rahe ki pehli request abhi chal rahi hai ya khatam'],
      ['<code>response</code>', '201 + body', 'Retry pe wahi jawab lautana, kaam dobara kiye bina'],
      ['<code>created_at</code>', 'time', 'Kuch time baad (jaise 24 ghante) purani keys hata do'],
    ]},
    { type: 'steps', items: [
      { t: 'Key ko pehle "in_progress" likho', d: 'INSERT karo. Agar UNIQUE constraint ki wajah se fail hua, to key pehle se hai: step 4 pe jao. Ye ek atomic step hai, isliye do requests ek saath aayein to bhi sirf ek jeetegi.' },
      { t: 'Asli kaam karo', d: 'Bank ko charge karo, order banao, jo bhi kaam hai.' },
      { t: 'Result save karo', d: 'status = done, response = 201 + body. Phir client ko jawab bhejo.' },
      { t: 'Key pehle se thi?', d: 'Data alag hai (request_hash match nahi) → 422 error. Status in_progress hai → 409 "abhi chal raha hai, thoda ruk ke poochho". Status done hai → saved response wapas, bina kaam kiye.' },
    ]},
    { type: 'p', html: `Ye 409 aur 422 wale niyam IETF ke ek draft standard (<em>The Idempotency-Key HTTP Header Field</em>) mein bhi likhe hain. Ye abhi tak RFC nahi bana (Internet-Draft hai), lekin Stripe jaisi APIs yahi pattern pehle se use karti hain. Ab khud chala ke dekho:` },
    { type: 'custom', render(el) {
      const S = {
        useKey: 'Idempotency key use karo', lose: 'Jawab raaste mein kho jaaye (timeout)',
        pay: 'Pay ₹500 (nayi koshish)', retry: 'Retry (wahi koshish)', dbl: 'Double tap (2 ek saath)', bad: 'Wahi key, ₹600 ke saath', reset: 'Reset',
        charged: 'Bank se kata', charges: 'Charges', table: 'Server ki keys table', none: '(khaali)', cols: ['key', 'amount', 'status', 'saved response'],
        noAttempt: 'Pehle "Pay ₹500" dabao.',
        start: 'Shuru mein key OFF hai. "Jawab kho jaaye" ON karke Pay dabao, phir Retry. Phir key ON karke yahi dohrao.',
        timeout: ' App ko jawab nahi mila (timeout). Use nahi pata kya hua.',
        got: r => ` App ko jawab mila: ${r}.`,
        charge: (k) => k ? `Key ${k} nayi thi: pehle "in_progress" likha, bank se ₹500 kata, result save kiya.` : 'Bina key ke: server ne seedha bank se ₹500 kaata.',
        replay: k => `Key ${k} pehle se "done" hai. Bank ko call hi nahi kiya, saved response wapas bheja.`,
        conflict: k => `Key ${k} abhi "in_progress" hai (pehli request chal rahi hai). Doosri ko 409: "thoda ruk ke poochho".`,
        mismatch: k => `Key ${k} ₹500 ke liye bani thi, ab ₹600 aaya. Server ne 422 diya: same key alag kaam ke liye nahi chalegi.`,
        dblNoKey: 'Do taps, bina key: dono requests ne alag alag charge kiya!',
        dblKey: k => `Do taps, wahi key ${k}: pehli ne "in_progress" likha, doosri ko 409 mila, sirf ek charge.`,
      };
      const KEYS = ['7f3a91c2', 'b81e44d0', 'c2d9a017', 'e4f0b3a8', '19ab77c5', '5d02e6f1'];
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:14px"><label><input type="checkbox" class="ik-use"> ${S.useKey}</label><label><input type="checkbox" class="ik-lose"> ${S.lose}</label></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"><button type="button" class="btn small primary ik-pay">${S.pay}</button><button type="button" class="btn small ik-retry">${S.retry}</button><button type="button" class="btn small ik-dbl">${S.dbl}</button><button type="button" class="btn small ik-bad">${S.bad}</button><button type="button" class="btn small ghost ik-reset">${S.reset}</button></div>
        <div class="stats ik-stats"></div><div style="font-weight:700;font-family:var(--f-display);margin-top:8px">${S.table}</div><div class="ik-tab" style="overflow-x:auto"></div><div class="calc-note ik-note"></div>`;
      const q = c => el.querySelector(c);
      let st;
      const reset = () => { st = { keys: {}, order: [], charged: 0, n: 0, cur: null }; draw(); q('.ik-note').textContent = S.start; };
      const draw = () => {
        q('.ik-stats').innerHTML = `<div class="stat"><span>${S.charged}</span><strong>₹${st.charged}</strong></div><div class="stat"><span>${S.charges}</span><strong>${st.n}</strong></div>`;
        const td = 'style="padding:4px 8px;border-bottom:1px solid var(--line);font:12.5px var(--f-mono)"';
        q('.ik-tab').innerHTML = st.order.length ? `<table style="border-collapse:collapse;margin-top:4px"><tr>${S.cols.map(c => `<th ${td}>${c}</th>`).join('')}</tr>${st.order.map(k => { const r = st.keys[k]; return `<tr><td ${td}>${k}</td><td ${td}>₹${r.amount}</td><td style="padding:4px 8px;border-bottom:1px solid var(--line);font:12.5px var(--f-mono);color:${r.status === 'done' ? 'var(--green)' : 'var(--amber)'}">${r.status}</td><td ${td}>${r.resp || '-'}</td></tr>`; }).join('')}</table>` : `<div style="color:var(--ink-3);font-size:13px">${S.none}</div>`;
      };
      const charge = a => { st.charged += a; st.n++; };
      // one request reaching the server; returns [status text, explanation]
      const server = (key, amount, finish = true) => {
        if (!key) { charge(amount); return ['201 paid', S.charge(null)]; }
        const r = st.keys[key];
        if (r) { if (r.amount !== amount) return ['422 Unprocessable', S.mismatch(key)]; if (r.status === 'in_progress') return ['409 Conflict', S.conflict(key)]; return [r.resp + ' (replay)', S.replay(key)]; }
        st.keys[key] = { amount, status: 'in_progress', resp: '' }; st.order.push(key);
        charge(amount);
        if (finish) { st.keys[key].status = 'done'; st.keys[key].resp = '201 paid'; }
        return ['201 paid', S.charge(key)];
      };
      const send = (amount, fresh) => {
        if (fresh) st.cur = q('.ik-use').checked ? KEYS[st.order.length % KEYS.length] + '-' + (st.order.length + 1) : 'nokey';
        if (!st.cur) { q('.ik-note').textContent = S.noAttempt; return; }
        const key = st.cur === 'nokey' ? null : st.cur;
        const [r, why] = server(key, amount);
        q('.ik-note').textContent = why + (q('.ik-lose').checked ? S.timeout : S.got(r)); draw();
      };
      q('.ik-pay').onclick = () => send(500, true);
      q('.ik-retry').onclick = () => send(500, false);
      q('.ik-bad').onclick = () => { if (!st.cur || st.cur === 'nokey') { q('.ik-note').textContent = S.noAttempt; return; } send(600, false); };
      q('.ik-dbl').onclick = () => {
        const use = q('.ik-use').checked; st.cur = use ? KEYS[st.order.length % KEYS.length] + '-' + (st.order.length + 1) : 'nokey';
        if (!use) { server(null, 500); server(null, 500); q('.ik-note').textContent = S.dblNoKey; draw(); return; }
        server(st.cur, 500, false); server(st.cur, 500); const r = st.keys[st.cur]; r.status = 'done'; r.resp = '201 paid';
        q('.ik-note').textContent = S.dblKey(st.cur); draw();
      };
      q('.ik-reset').onclick = reset;
      reset();
    }},
    { type: 'p', html: `Ab yahi cheez request ke safar mein dekho. Har scenario mein bank ka meter dekho: kitni baar paisa kata.` },
    { type: 'flow', height: 300,
      nodes: [
        { id: 'app', label: 'xyz app', sub: 'Riya', x: 90, y: 150, w: 120, kind: 'client', info: 'Ye kya hai: Riya ke phone pe xyz.com ki app. Har payment koshish ke liye ek nayi idempotency key banati hai (pehle tap pe), aur retry mein wahi key dobara bhejti hai.' },
        { id: 'api', label: 'Payment API', x: 320, y: 150, w: 140, kind: 'server', info: 'Ye kya hai: xyz.com ka server jo payment request leta hai. Kaam karne se pehle keys table mein key check karta hai: nayi hai to kaam, purani hai to saved jawab.' },
        { id: 'keys', label: 'Keys table', sub: 'key → result', x: 320, y: 265, w: 150, kind: 'data', hidden: true, info: 'Ye kya hai: database ki ek table jisme har key aur uska result (kuch ghante/din ke liye) rakha hai. Key column UNIQUE hai, isliye ek key ki do rows ban hi nahi sakti. Isi se duplicate pakda jaata hai.' },
        { id: 'bank', label: 'Bank / PSP', sub: 'paisa katna', x: 580, y: 150, w: 140, kind: 'server', meter: true, load: 0, info: 'Ye kya hai: bank ya payment company (PSP = Payment Service Provider) jahan asli paisa kat-ta hai. Meter dikhata hai kitni baar charge hua.' },
      ],
      edges: [{ a: 'app', b: 'api' }, { a: 'api', b: 'bank' }, { a: 'api', b: 'keys' }],
      scenarios: [
        { name: 'Bina idempotency key', steps: [
          { title: 'Riya "Pay ₹500" dabati hai', go: 'app>api>bank', text: 'Paisa kat gaya.', after: { bank: { load: 50, sub: 'charged: ₹500' } }, msg: 'POST /payments { amount: 500 }' },
          { title: 'Jawab raaste mein kho gaya', go: 'lost:api>app', text: 'App ko timeout mila. Use nahi pata ki payment hua ya nahi.' },
          { title: 'App retry karti hai', text: 'POST idempotent nahi hai. Server ke liye ye bilkul nayi request hai.', go: 'app>api>bank', after: { bank: { load: 100, state: 'hot', sub: 'charged: ₹1000 !!' } }, msg: 'POST /payments { amount: 500 }' },
          { title: 'Double charge', text: 'Riya ke ₹1000 kat gaye. Real duniya mein ye sabse bure bugs mein se ek hai.', go: 'res:api>app' },
        ]},
        { name: 'Idempotency key ke saath', steps: [
          { title: 'App ek unique key banati hai', text: 'Har naye payment attempt ke liye nayi key. Ye key request ke header mein jaati hai.', show: ['keys'], go: 'app>api', msg: 'POST /payments { amount: 500 }\nIdempotency-Key: 7f3a-91c2-...' },
          { title: 'Server key save karta hai, phir charge', go: ['api>keys', 'api>bank'], text: 'Pehli baar dekhi key: pehle "in_progress" likho, kaam karo, phir result key ke saath save karo.', after: { bank: { load: 50, sub: 'charged: ₹500' }, keys: { sub: '7f3a → paid ✓' } } },
          { title: 'Jawab kho gaya', go: 'lost:api>app', text: 'Wahi network problem.' },
          { title: 'Retry, WAHI key ke saath', text: 'Server keys table mein dekhta hai: ye key pehle aa chuki hai aur result "paid" hai. Bank ko dobara call hi nahi kiya.', go: ['app>api', 'api>keys', 'res:keys>api'], after: { keys: { state: 'hit' } }, msg: 'Idempotency-Key: 7f3a-91c2-...  →  already processed' },
          { title: 'Pichhla result wapas', text: 'Riya ko "Payment successful" dikha, aur ₹500 sirf ek baar kate.', go: 'res:api>app', after: { bank: { state: 'ok' } } },
        ]},
        { name: 'Do requests ek saath (409)', steps: [
          { title: 'Pehli request aati hai', text: 'Key nayi hai. Server ne key ko "in_progress" likha aur bank ko call kiya. Bank thoda slow hai.', show: ['keys'], go: ['app>api', 'api>keys'], after: { keys: { sub: '7f3a → in_progress', state: 'warn' }, bank: { load: 50, sub: 'charging...' } }, msg: 'POST /payments  Idempotency-Key: 7f3a-...' },
          { title: 'Double tap: doosri request, wahi key', text: 'Pehli abhi khatam nahi hui. Server ne table dekhi: key "in_progress" hai. Doosri ko turant 409 Conflict: "abhi chal raha hai, thoda ruk ke poochho".', go: ['app>api', 'api>keys', 'res:keys>api', 'bad:api>app'], msg: 'HTTP/1.1 409 Conflict' },
          { title: 'Pehli khatam', text: 'Bank ne ek baar charge kiya. Key "done" ho gayi. Agar key ka INSERT atomic na hota (pehle padho, phir likho), to dono requests "nayi key" dekhte aur dono charge karte.', go: ['api>bank', 'res:bank>api', 'res:api>app'], after: { keys: { sub: '7f3a → paid ✓', state: 'ok' }, bank: { sub: 'charged: ₹500' } } },
        ]},
        { name: 'Wahi key, alag data (422)', steps: [
          { title: 'Pehla payment ho chuka', text: 'Key 7f3a ₹500 ke liye "done" hai.', show: ['keys'], go: ['app>api', 'api>keys', 'api>bank'], after: { keys: { sub: '7f3a → ₹500 paid' }, bank: { load: 50, sub: 'charged: ₹500' } } },
          { title: 'App mein bug: wahi key, ₹600', text: 'Ek bug ki wajah se app ne purani key nayi amount ke saath bhej di.', go: 'app>api', msg: 'POST /payments { amount: 600 }\nIdempotency-Key: 7f3a-...' },
          { title: 'Fingerprint match nahi hua', text: 'Server ne request ka hash saved hash se milaya: alag hai. Purana result lautana galat hoga (Riya ko lagega ₹600 diye), naya charge bhi galat. Isliye 422 error, bank ko call nahi.', go: ['api>keys', 'res:keys>api', 'bad:api>app'], after: { keys: { state: 'warn' } }, msg: 'HTTP/1.1 422 Unprocessable Content\n{ "error": "key reused with different request" }' },
        ]},
      ],
    },
    { type: 'callout', tone: 'why', title: 'Ye har jagah kyun zaroori hai', html: `Network kabhi bhi fail ho sakta hai, aur client ko kabhi pakka pata nahi chalta ki server ne kaam kiya ya nahi. Isliye distributed systems ka niyam hai: <strong>retries honge hi</strong>. Retry safe tabhi hai jab operation idempotent ho. Payments, orders, bookings, message sending: sab jagah ye pattern hai.` },
    { type: 'callout', tone: 'tip', title: 'Key ke bina bhi idempotent banane ke tareeke', html: `<strong>Absolute value set karo</strong>, badhao mat: "balance = 1500" (idempotent) vs "balance + 500" (nahi). <strong>Condition lagao</strong>: <code>UPDATE orders SET status='paid' WHERE id=7 AND status='pending'</code>. Doosri baar koi row match nahi hogi. <strong>Queue messages</strong>: queues aksar ek message ek se zyada baar de deti hain (at-least-once). Consumer har message ka id ek "processed" table mein likhta hai aur dobara aaye to chhod deta hai. Ise <em>idempotent consumer</em> kehte hain (queues lesson mein detail).` },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>Pagination:</strong> feeds, chats, infinite scroll aur koi bhi badi ya tezi se badalti list: <strong>cursor (keyset)</strong>, unique sort key (time + id) pe index ke saath. Offset sirf chhoti, kam badalne wali lists ke liye jahan "page 7 pe jao" chahiye (admin tables). Server pe max limit hamesha.<br><strong>Idempotency:</strong> GET, PUT, DELETE ko waise hi idempotent rakho. Jo POST paisa, order, booking ya message banata hai, uspe <strong>Idempotency-Key</strong> lo, key UNIQUE constraint ke saath atomically save karo, response store karo, aur keys ko ~24 ghante baad expire karo.` },
    { type: 'diagram', title: 'Pagination + idempotency: poori picture', height: 420,
      groups: [
        { label: 'API servers', x: 165, y: 138, w: 390, h: 104 },
        { label: 'Data', x: 40, y: 290, w: 640, h: 100 },
      ],
      nodes: [
        { id: 'app', label: 'Riya ka app', sub: 'feed + payments', x: 120, y: 70, kind: 'client', info: 'Ye kya hai: xyz.com ki app. Feed ke liye pichhle page ka next_cursor wapas bhejti hai. Payment ke liye har koshish pe ek nayi idempotency key banati hai aur retry mein wahi bhejti hai.' },
        { id: 'lb', label: 'Load Balancer', x: 360, y: 70, kind: 'net', info: 'Ye kya hai: requests ko kai API servers mein baantne wala (iska poora lesson aage hai). Isi wajah se retry kisi doosre server pe ja sakta hai, aur keys server ki memory mein nahi, shared table mein rakhni padti hain.' },
        { id: 's1', label: 'API server 1', x: 250, y: 200, kind: 'server', info: 'Ye kya hai: xyz.com ke API code ki ek copy. Feed request pe cursor decode karke "WHERE id < cursor" query chalata hai. Retry isi pe aaya, phir bhi keys table se pata chala ki payment ho chuka.' },
        { id: 's2', label: 'API server 2', x: 470, y: 200, kind: 'server', info: 'Ye kya hai: API code ki doosri copy. Pehli payment request isi pe aayi: key "in_progress" likhi, bank ko charge kiya, result save kiya.' },
        { id: 'posts', label: 'Posts DB', sub: 'index (time, id)', x: 120, y: 340, kind: 'data', info: 'Ye kya hai: posts ki table, (created_at, id) pe index ke saath. Index ki wajah se cursor query seedha sahi jagah jump karti hai: page 1 ho ya page 5000, utna hi kaam.' },
        { id: 'keys', label: 'Keys table', sub: 'UNIQUE key', x: 360, y: 340, kind: 'data', info: 'Ye kya hai: idempotency keys ki shared table: key, user, request hash, status, saved response. UNIQUE constraint do requests ko ek saath jeetne nahi deta. 24 ghante baad purani keys hat jaati hain.' },
        { id: 'bank', label: 'Payment provider', sub: 'bank / PSP', x: 600, y: 340, w: 150, kind: 'net', info: 'Ye kya hai: bahar ki company jo asli paisa kaatati hai. Hamara kaam: ek koshish ke liye ise sirf ek baar call karna. Achhe providers khud bhi idempotency key lete hain, to hum unhe apni key aage bhej dete hain.' },
      ],
      edges: [
        { a: 'app', b: 'lb', n: 1 },
        { a: 'lb', b: 's1' },
        { a: 'lb', b: 's2' },
        { a: 's1', b: 'posts', label: 'id < cursor' },
        { a: 's1', b: 'keys', label: 'key: done' },
        { a: 's2', b: 'keys', label: 'INSERT key' },
        { a: 's2', b: 'bank', label: 'charge once' },
      ],
      paths: [
        { name: 'Feed: agla page', text: 'App next_cursor bhejti hai. Server index se seedha us jagah se agli 20 posts laata hai. Na duplicate, na gayab.', go: ['app>lb>s1>posts'] },
        { name: 'Pay: pehli baar', text: 'Nayi key: server 2 ne key "in_progress" likhi, bank se ek baar kata, result save kiya.', go: ['app>lb>s2>keys', 's2>bank'] },
        { name: 'Retry: doosre server pe', text: 'Jawab kho gaya tha, retry server 1 pe gaya. Shared keys table mein key "done" mili: saved jawab wapas, bank ko call nahi.', go: ['app>lb>s1>keys'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Pagination = bada result chhote pages mein. Server pe max limit zaroor.</li>
      <li>Offset = "pehli N chhodo": aasaan, page jump, lekin list badle to duplicates/gayab, aur deep pages slow (offset + limit rows padhta hai).</li>
      <li>Cursor (keyset) = "is jagah ke baad do": stable aur hamesha tez, index ke saath. Sort key unique rakho (time + id).</li>
      <li>Idempotent = kitni baar bhi chalao, aakhri haal same. GET, PUT, DELETE haan; POST nahi; PATCH depend karta hai.</li>
      <li>PUT pakke address pe "ye rakh do" (idempotent); POST collection pe "naya banao" (nahi).</li>
      <li>Idempotency key: client ek koshish = ek key, retry mein wahi key. Server key ko UNIQUE ke saath atomically save kare, response store kare.</li>
      <li>Same key + in_progress = 409, same key + alag data = 422, same key + done = saved jawab.</li>
      <li>Keys shared store mein hon (kisi bhi server pe retry aaye), aur kuch time baad expire hon.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Chhote, tez responses; DB utna hi padhta hai jitna dikhna hai', 'Cursor: deep scroll pe bhi same speed, list badle to bhi sahi', 'Retries safe: na double charge, na double order', 'Network timeout ke baad bhi client ko pakka jawab mil jaata hai'], costs: ['Cursor se "page 37 pe jao" aur total count dena mushkil', 'Har sort order ke liye sahi index chahiye', 'Idempotency: har POST pe ek extra DB write/read aur keys ki storage', 'Atomic insert, request hash, expiry, 409/422: sahi banana ek mehnat ka kaam hai'] },
    { type: 'think', questions: [
      { q: 'Riya ne "Pay" do baar jaldi jaldi dabaya (double tap). Kya idempotency key se bachav hoga?', a: 'Haan, agar app ek payment attempt ke liye ek hi key banaye aur dono taps mein wahi bheje. Isliye key "screen khulne pe" ya "pehle tap pe" banti hai, har tap pe nahi. Dono ek saath pahunchi to doosri ko 409 milega. UI mein button disable karna bhi madad karta hai.' },
      { q: 'Infinite scroll wale feed ke liye offset ya cursor?', a: 'Cursor. Feed mein naya content lagatar aata hai (offset se duplicates), aur users bahut neeche tak scroll karte hain (offset slow hota jaata hai).' },
      { q: 'Keys sirf API server ki RAM mein rakhi (har server apni). Kya galat ho sakta hai?', a: 'Retry Load Balancer ki wajah se doosre server pe ja sakta hai, jahan key hai hi nahi: double charge. Server restart pe bhi saari keys gayab. Keys shared, durable store (database table ya replicated Redis) mein rakho.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Kaunsa HTTP method by default idempotent NAHI hai?', options: ['GET', 'PUT', 'POST'], answer: 2, explain: 'POST aam taur pe naya resource banata hai. Har call = naya resource.' },
      { q: 'Retry mein idempotency key kaisi honi chahiye?', options: ['Nayi random key', 'Pehle wali same key', 'Koi key nahi'], answer: 1, explain: 'Same key se hi server pehchanta hai ki ye wahi operation hai.' },
      { q: 'OFFSET 100000 slow kyun hai?', options: ['Network slow hai', 'DB ko 1 lakh rows padh ke chhodni padti hain', 'JSON bada hai'], answer: 1, explain: 'Database ke paas "chhodo" ka shortcut nahi. Cursor index se seedha sahi jagah jump karta hai.' },
      { q: 'Page 1 dekhne ke baad 2 nayi posts aayin. Offset se page 2 lene pe kya hoga?', options: ['Sab theek', 'Page 1 ki aakhri 2 posts phir se dikhengi', '2 posts gayab ho jaayengi'], answer: 1, explain: 'Nayi posts upar judne se sab 2 jagah neeche khisak gaye. "Pehli 5 chhodo" ab 2 purani posts dobara deta hai.' },
      { q: 'Wahi idempotency key, lekin pehli request abhi chal hi rahi hai. Server kya kare?', options: ['Dobara charge kare', '409 Conflict: thoda ruk ke poochho', 'Key delete kar de'], answer: 1, explain: 'Status in_progress hai. Kaam dobara karna double charge hai. 409 bolo; client thoda ruk ke retry kare, tab saved result milega.' },
      { q: 'PUT /orders/7f3a ko do baar bheja. Kitne orders?', options: ['Ek', 'Do', 'Error'], answer: 0, explain: 'PUT ek pakke address pe "ye rakh do" hai. Doosri baar wahi data dobara likha gaya, order ek hi.' },
    ]},
    { type: 'sources', note: 'Idempotency keys aur pagination ke tathya inhi se.', items: [
      { title: 'Idempotent requests (API reference)', publisher: 'Stripe docs', official: true, url: 'https://docs.stripe.com/api/idempotent_requests', used: 'Idempotency-Key header, saved status code and body (even 500s), keys up to 255 chars, prunable after 24 hours, parameter mismatch errors, no effect on GET/DELETE.' },
      { title: 'Designing robust and predictable APIs with idempotency', publisher: 'Stripe blog (Brandur Leach)', official: true, year: 2017, url: 'https://stripe.com/blog/idempotency', used: 'Why clients cannot know if a timed-out request ran, retries with the same key, exponential backoff.' },
      { title: 'The Idempotency-Key HTTP Header Field (Internet-Draft 07)', publisher: 'IETF HTTPAPI working group', official: true, year: 2025, url: 'https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/', used: '400 for a missing key, 409 while the first request is still processing, 422 for reuse with a different payload; still a draft, not an RFC.' },
      { title: 'RFC 9110: HTTP Semantics (sections 9.2.1, 9.2.2)', publisher: 'IETF', official: true, year: 2022, url: 'https://www.rfc-editor.org/rfc/rfc9110.html', used: 'Safe and idempotent methods; PUT and DELETE idempotent, POST not.' },
      { title: 'We need tool support for keyset pagination (No Offset)', publisher: 'Use The Index, Luke (Markus Winand)', url: 'https://use-the-index-luke.com/no-offset', used: 'Why OFFSET reads and discards rows, keyset with an index, unique sort key / tie-breaker.' },
      { title: 'Pagination (API reference)', publisher: 'Stripe docs', official: true, url: 'https://docs.stripe.com/api/pagination', used: 'limit, starting_after, ending_before and has_more on list endpoints.' },
      { title: 'Pagination through Web API collections', publisher: 'Slack developer docs', official: true, url: 'https://docs.slack.dev/apis/web-api/pagination', used: 'cursor parameter and response_metadata.next_cursor.' },
      { title: 'Using pagination in the REST API', publisher: 'GitHub Docs', official: true, url: 'https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api', used: 'Link header with rel="next", page or before/after parameters, per_page max usually 100.' },
    ]},
  ],
});
