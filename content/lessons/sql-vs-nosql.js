Lesson.register({
  id: 'sql-vs-nosql',
  title: 'Databases: SQL aur NoSQL family',
  minutes: 34,
  summary: `Database chunna design ka sabse bada faisla hai. Is lesson mein: relational model aur joins, ACID transactions, isolation levels (do transactions ko side by side chala ke anomalies khud dekho), NoSQL ka poora parivaar (key-value, document, wide-column, graph, time-series, search, vector) unke access pattern ke hisaab se, aur normalization vs denormalization. End mein ek seedha rule: shuru Postgres/MySQL se karo.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `xyz.com ka saara data (users, posts, coins, chat) kahin to rakhna padta hai. Us jagah ko <strong>database</strong> kehte hain.<br>Database kai tarah ke hote hain, jaise almaari, tijori aur file folder alag kaam ke liye hote hain.<br>Kuch database paise jaise data ko ekdum safe rakhte hain. Kuch lakhon chat messages tez likhte hain. Kuch "milti julti cheezein" dhoondhte hain.<br>Is lesson mein seekhoge: kaunsa database kis kaam ke liye, aur kyun zyada tar shuruaat ek normal SQL database se hi hoti hai.` },
    { type: 'h2', text: 'Problem: xyz.com ka data badh raha hai' },
    { type: 'callout', tone: 'term', title: 'Yaad karo: Database', html: `<strong>Ye kya hai:</strong> ek program jo data ko disk pe sambhaal ke rakhta hai, aur tumhe use dhoondhne, badalne aur mitaane deta hai.<br><strong>Kyun chahiye:</strong> server restart ho, ya 10 servers ek saath kaam karein, sabko ek hi sahi data dikhna chahiye.<br><strong>Iske bina:</strong> data server ki RAM ya alag alag files mein bikhra rahega. Restart pe gayab, aur do servers do alag "sach" dikhayenge.` },
    { type: 'p', html: `Ab tak xyz.com ke paas ek database tha, aur humne uske saamne cache aur CDN laga diye. Lekin ab product team naye features maang rahi hai: creators ko <strong>coins</strong> (tip) bhejna, <strong>chat</strong>, posts ka <strong>search</strong>, "aapko ye bhi pasand aayega" <strong>recommendations</strong>, aur servers ke <strong>metrics</strong> (CPU, speed jaise numbers). Har feature ka data alag shakal ka hai. Aur har feature use alag tarah se padhta hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Access pattern', html: `<strong>Ye kya hai:</strong> data ko <em>kaise</em> padha aur likha jaata hai. Jaise: "ek user ko uske ID se laao", "is chat ke last 50 messages", "kal har sheher mein kitne views".<br><strong>Kyun chahiye:</strong> har database kuch access patterns ke liye bahut tez hota hai aur baaki ke liye slow. Pattern pata ho to sahi database chun sakte ho.<br><strong>Iske bina:</strong> brand naam dekh ke database chunoge, aur baad mein pata chalega ki tumhari sabse zaroori query us database mein slow ya namumkin hai.` },
    { type: 'p', html: `Log aksar poochhte hain "SQL achha ya NoSQL?" Ye galat sawaal hai. Sahi sawaal: <strong>is data ka access pattern kya hai?</strong> Brand naam baad mein. Pehle samjho ki SQL database kya guarantee deta hai. Phir dekho NoSQL kab aur kyun.` },

    { type: 'h2', text: 'Relational model: tables aur joins' },
    { type: 'callout', tone: 'term', title: 'Naye words: table, row, column, schema, SQL', html: `<strong>Ye kya hai:</strong> relational database data ko <strong>tables</strong> mein rakhta hai, bilkul spreadsheet jaisa. Har <strong>row</strong> ek cheez hai (ek user). Har <strong>column</strong> ek property hai (naam, email). Table ka structure pehle se tay hota hai: isko <strong>schema</strong> kehte hain. Data ko <strong>SQL</strong> (Structured Query Language) naam ki bhasha se padhte aur likhte hain. Isliye inhe "SQL databases" bhi kehte hain.<br><strong>Kyun chahiye:</strong> schema ek pakka niyam hai. Galat shakal ka data (jaise email ki jagah number) database andar aane hi nahi deta.<br><strong>Iske bina:</strong> har service apne hisaab se data likhegi, aur kuch mahine mein aadhe users ke paas "email", aadhe ke paas "Email" field hogi.<br><strong>Real products:</strong> PostgreSQL, MySQL, SQL Server, Oracle, SQLite.` },
    { type: 'callout', tone: 'term', title: 'Naye words: primary key, foreign key', html: `<strong>Ye kya hai:</strong> <strong>primary key</strong> har row ka unique ID hai (jaise <code>users.id = 42</code>). <strong>Foreign key</strong> doosri table ki kisi row ki taraf ishaara hai (jaise <code>posts.user_id = 42</code>, matlab "ye post user 42 ki hai").<br><strong>Kyun chahiye:</strong> isse tables aapas mein jud jaati hain. Database khud check karta hai ki foreign key kisi asli row ki taraf hi ishaara kare.<br><strong>Iske bina:</strong> kisi post ka <code>user_id = 999</code> ho sakta hai jabki user 999 exist hi nahi karta. Feed mein "unknown author" dikhega.` },
    { type: 'ascii', text: `
users                         posts
+----+-------+                +-----+---------+--------------+
| id | name  |                | id  | user_id | title        |
+----+-------+                +-----+---------+--------------+
| 42 | Riya  | <------------- | 101 |   42    | Mumbai rains |
|  7 | Aman  | <---------.    | 102 |    7    | Cricket      |
+----+-------+            '-- | 103 |   42    | DSA notes    |
                              +-----+---------+--------------+`, caption: 'Naam ek hi jagah (users) mein. Posts sirf user_id rakhte hain.' },
    { type: 'p', html: `"Feed mein har post ke saath author ka naam dikhao" ke liye do tables ko jodna padta hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Join', html: `<strong>Ye kya hai:</strong> SQL ka ek kaam jo do tables ki rows ko ek matching column se jod deta hai. Yahan <code>posts.user_id</code> ko <code>users.id</code> se milaya, to har post ke saath uske author ka naam aa gaya.<br><strong>Kyun chahiye:</strong> naam sirf ek jagah (users) mein rakha hai. Join se jab chaaho, jahan chaaho, saath dikha sakte ho.<br><strong>Iske bina:</strong> ya to app code mein do alag queries chala ke khud milaana padega, ya naam ki copy har post mein rakhni padegi (neeche "denormalization" mein iski keemat dekhoge).` },
    { type: 'code', text: `SELECT posts.title, users.name
FROM posts
JOIN users ON users.id = posts.user_id
WHERE posts.id IN (101, 102, 103);

-- title         | name
-- Mumbai rains  | Riya
-- Cricket       | Aman
-- DSA notes     | Riya` },
    { type: 'p', html: `Relational model ki taakat: data ek baar, ek jagah, aur <em>koi bhi</em> sawaal baad mein poocha ja sakta hai ("Riya ke saare posts", "sabse zyada likes wale users", "Mumbai ke users ke posts"). Tumhe pehle se nahi pata hona chahiye ki kal kaunsi query chahiye. Early product ke liye ye bahut keemti hai.` },

    { type: 'h2', text: 'ACID: paise wale kaam ki guarantee' },
    { type: 'p', html: `Naya feature: Riya, creator Aman ko 100 coins tip karti hai. Isme do kaam hain: Riya ke coins −100, aur Aman ke +100. Socho pehla kaam ho gaya, aur doosre se pehle server crash ho gaya. 100 coins hawa mein gayab! Isliye SQL databases <strong>transactions</strong> dete hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Transaction', html: `<strong>Ye kya hai:</strong> kai operations ka ek group, jise database <strong>ek hi kaam</strong> maanta hai. Shuru <code>BEGIN</code> se, khatam <code>COMMIT</code> se. Ya to saare operations honge, ya ek bhi nahi. Beech mein gadbad ho to <code>ROLLBACK</code>: sab pehle jaisa.<br><strong>Kyun chahiye:</strong> coins transfer jaise kaam mein "aadha hua" sabse khatarnaak haalat hai.<br><strong>Iske bina:</strong> har crash, timeout ya bug ke baad kuch paise gayab ya double. Fir koi insaan logs padh ke haath se theek karega.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Constraint', html: `<strong>Ye kya hai:</strong> database mein likha hua ek niyam, jaise <code>CHECK (coins >= 0)</code> ("balance kabhi negative nahi") ya <code>UNIQUE (email)</code> ("ek email, ek account").<br><strong>Kyun chahiye:</strong> niyam database mein hai, to koi bhi service ya buggy script use tod nahi sakti.<br><strong>Iske bina:</strong> niyam sirf app code mein hoga. Ek nayi service jo ye check bhool gayi, wo galat data likh degi.` },
    { type: 'p', html: `Transactions jo chaar guarantees dete hain, unhe milake <strong>ACID</strong> kehte hain. Har letter ek alag gadbad se bachata hai:` },
    { type: 'table', head: ['Letter', 'Matlab', 'Coins example mein'], rows: [
      ['<strong>A</strong>tomicity', 'Sab ya kuch nahi', 'Debit hua aur credit nahi, aisa kabhi nahi'],
      ['<strong>C</strong>onsistency', 'Database ke rules (constraints) kabhi nahi tootte', '<code>CHECK (coins >= 0)</code>: balance negative nahi ho sakta'],
      ['<strong>I</strong>solation', 'Ek saath chal rahi transactions ek doosre ka adha-adhoora kaam na dekhein', 'Do tips ek saath aayein to bhi ginti sahi'],
      ['<strong>D</strong>urability', 'COMMIT ke baad data crash se bhi bachega', 'OK mil gaya to coins pakke (agla lesson: write-ahead log)'],
    ]},
    { type: 'flow', height: 330,
      nodes: [
        { id: 'riya', label: 'Riya', sub: 'tip 100 coins', x: 75, y: 165, w: 120, kind: 'client', info: 'Ye kya hai: xyz.com ki user, apne phone app se. Wo creator Aman ko 100 coins bhej rahi hai, aur chahti hai ki ya to tip pahunche, ya uske coins wapas rahein.' },
        { id: 'app', label: 'Wallet service', x: 260, y: 165, w: 150, kind: 'server', info: 'Ye kya hai: xyz.com ka server jo coins ka kaam sambhaalta hai. Ye transaction shuru karta hai, dono UPDATE chalata hai, phir COMMIT. Isko bas BEGIN/COMMIT likhna hai; "sab ya kuch nahi" ki guarantee database deta hai.' },
        { id: 'db', label: 'PostgreSQL', sub: 'transaction', x: 470, y: 165, w: 150, kind: 'data', info: 'Ye kya hai: xyz.com ka main SQL database. Transaction ke andar ke badlav doosron ko COMMIT tak nahi dikhte. Crash ho to adhoori transaction rollback ho jaati hai.' },
        { id: 'wr', label: 'Riya: 500', sub: 'wallets row', x: 640, y: 70, w: 130, kind: 'data', info: 'Ye kya hai: wallets table mein Riya ki row (uska balance). Is table pe CHECK constraint hai: coins >= 0.' },
        { id: 'wa', label: 'Aman: 100', sub: 'wallets row', x: 640, y: 260, w: 130, kind: 'data', info: 'Ye kya hai: wallets table mein creator Aman ki row (uska balance). Tip ka paisa yahan judna chahiye.' },
      ],
      edges: [{ a: 'riya', b: 'app' }, { a: 'app', b: 'db' }, { a: 'db', b: 'wr' }, { a: 'db', b: 'wa' }],
      scenarios: [
        { name: 'Commit (happy path)', steps: [
          { title: 'Tip request', go: 'riya>app', text: 'Riya ne "Send 100" dabaya.', msg: 'POST /tips { to: "aman", coins: 100 }' },
          { title: 'BEGIN + debit', go: 'app>db>wr', text: 'Transaction shuru. Riya ki row se 100 ghataaye. Abhi ye badlav sirf is transaction ko dikhta hai.', set: { wr: { label: 'Riya: 400', sub: 'uncommitted' } }, msg: 'BEGIN;\nUPDATE wallets SET coins = coins - 100 WHERE user = \'riya\';' },
          { title: 'Credit', go: 'db>wa', text: 'Aman ki row mein 100 jode.', set: { wa: { label: 'Aman: 200', sub: 'uncommitted' } }, msg: 'UPDATE wallets SET coins = coins + 100 WHERE user = \'aman\';' },
          { title: 'COMMIT', go: ['app>db', 'res:db>app>riya'], text: 'Dono badlav ek saath pakke aur sabko dikhne lage. Total coins pehle 600, ab bhi 600.', after: { wr: { state: 'ok', sub: 'committed' }, wa: { state: 'ok', sub: 'committed' } }, msg: 'COMMIT;  →  200 OK' },
        ]},
        { name: 'Crash beech mein', intro: 'Debit ho chuka, credit se pehle wallet service ka server mar gaya.', steps: [
          { title: 'BEGIN + debit', go: 'riya>app>db>wr', text: 'Riya ke 100 ghate (uncommitted).', set: { wr: { label: 'Riya: 400', sub: 'uncommitted' } } },
          { title: 'Server crash', set: { app: { state: 'down', sub: 'CRASH' } }, go: 'lost:app>db', text: 'Credit wali query kabhi pahunchi hi nahi. COMMIT bhi nahi hua.' },
          { title: 'Database rollback karta hai', text: 'Connection toota, transaction adhoori thi, to database ne use <strong>rollback</strong> kar diya. Riya ke 500 wapas. Ye <strong>Atomicity</strong> hai: aadha kaam kabhi pakka nahi hota.', focus: ['wr'], set: { wr: { label: 'Riya: 500', state: 'ok', sub: 'rolled back' } } },
        ]},
        { name: 'Bina transaction ke', intro: 'Developer ne BEGIN/COMMIT nahi likha. Har UPDATE apne aap turant commit (autocommit).', steps: [
          { title: 'Debit (turant pakka)', go: 'riya>app>db>wr', text: 'Riya ke 100 ghate aur turant commit.', set: { wr: { label: 'Riya: 400', sub: 'committed' } } },
          { title: 'Crash', set: { app: { state: 'down', sub: 'CRASH' } }, go: 'lost:app>db', text: 'Credit nahi hua.' },
          { title: '100 coins gayab', text: 'Riya: 400, Aman: 100. Total 600 se 500. Koi rollback nahi kyunki database ke liye ye do alag kaam the. Paise ke kaam mein ye sabse bura bug hai.', focus: ['wr', 'wa'], set: { wr: { state: 'warn' }, wa: { state: 'warn', sub: 'credit nahi aaya' } } },
        ]},
        { name: 'Rule toota (Consistency)', intro: 'Riya ke paas 500 hain, wo 600 bhejne ki koshish karti hai.', steps: [
          { title: 'Debit 600', go: 'riya>app>db>wr', text: 'Database CHECK constraint dekhta hai: coins >= 0. 500 − 600 = −100. Rule toota.', set: { wr: { state: 'down', sub: 'CHECK failed' } }, msg: 'ERROR: new row violates check constraint "coins_non_negative"' },
          { title: 'Poori transaction rollback', go: 'res:db>app>riya', text: 'Error aaya, transaction cancel, Aman ko kuch nahi gaya. Rule database mein likha hai, isliye koi bhi buggy service use tod nahi sakti.', set: { wr: { state: 'ok', sub: 'unchanged: 500' } }, msg: '400 Bad Request: insufficient coins' },
        ]},
      ],
    },

    { type: 'h3', text: 'ACID lab: har letter hata ke dekho' },
    { type: 'p', html: `Upar ke diagram mein A aur C dikhe. Ab chaaron letters ka chhota demo. Letter chuno, guarantee <strong>ON</strong> ya <strong>OFF</strong> karo, aur "Agla step" dabao. Dekho total coins (600) bachte hain ya nahi:` },
    { type: 'custom', render(el) {
      const T = { lab: { A: 'A: Atomicity', C: 'C: Consistency', I: 'I: Isolation', D: 'D: Durability' }, on: 'Guarantee ON', off: 'Guarantee OFF', next: 'Agla step', reset: 'Restart', riya: 'Riya', aman: 'Aman', total: 'Total coins (Riya + Aman)', want: 'Aman ka sahi answer', start: 'Shuru', wait: 'step chale. "Agla step" dabao.' };
      // each step: [text, riya, aman]; balances after the step
      const S = {
        A: { setup: 'Riya → Aman 100 coins. Debit ke baad, credit se pehle server crash.',
          on: [['BEGIN; Riya −100 (abhi pakka nahi)', 400, 100], ['Server crash. COMMIT kabhi nahi aaya.', 400, 100], ['Restart: database adhoori transaction rollback karta hai.', 500, 100]],
          off: [['Riya −100, turant pakka (koi transaction nahi)', 400, 100], ['Server crash. Credit kabhi nahi chala.', 400, 100], ['Restart: koi rollback nahi. 100 coins gayab.', 400, 100]],
          v: { on: 'Atomicity: aadha kaam kabhi pakka nahi hua. Total 600.', off: 'Bina atomicity: total 600 se 500. Ye bug paise wale app ko khatam kar deta hai.' } },
        C: { setup: 'Riya ke paas 500 hain, wo galti se 600 bhejti hai.',
          on: [['Riya −600 → −100. CHECK (coins >= 0) toota → ERROR', 500, 100], ['Poori transaction cancel. Aman ko kuch nahi gaya.', 500, 100]],
          off: [['Riya −600 → −100. Koi niyam nahi, chal gaya.', -100, 100], ['Aman +600', -100, 700]],
          v: { on: 'Consistency: database ka niyam kabhi nahi toota. Riya ko "coins kam hain" error mila.', off: 'Total abhi bhi 600, lekin Riya ka balance −100! Niyam toota: 100 coins hawa se ban gaye.' } },
        I: { setup: 'Aman ke 100 coins. Riya +50 ki tip bhejti hai, aur usi pal Kabir +20 ki. Har tip Aman ke coins "padho, jodo, likho" karti hai. Sahi answer: Aman = 170.', exp: 170,
          on: [['Tip 1: Riya −50, Aman +50 (atomic: coins = coins + 50)', 450, 150], ['Tip 2 ruki: tip 1 ka kaam khatam hone ka wait', 450, 150], ['Tip 2: Aman ka naya value 150 padha, +20', 450, 170]],
          off: [['Tip 1 Aman ke coins padhta hai: 100. Tip 2 bhi padhta hai: 100', 500, 100], ['Tip 1: Riya −50, Aman ko likhta hai 100 + 50 = 150', 450, 150], ['Tip 2 likhta hai 100 + 20 = 120 (purane 100 pe!)', 450, 120]],
          v: { on: 'Isolation: dono tips ne ek doosre ka adha kaam nahi dekha. Aman: 170, sahi.', off: 'Lost update: Aman ko 170 milne chahiye the, mile 120. Riya ki +50 tip kho gayi.' } },
        D: { setup: 'Riya → Aman 100 coins. App ko "Tip bhej di" dikh gaya. Turant bijli chali gayi.',
          on: [['Badlav pehle log file mein disk pe pakka (fsync)', 400, 200], ['Phir app ko OK. Bijli gayi, RAM saaf.', 400, 200], ['Restart: log padh ke sab wapas', 400, 200]],
          off: [['Badlav sirf RAM mein. App ko turant OK', 400, 200], ['Bijli gayi, RAM saaf. Disk pe purana data', 500, 100], ['Restart: database ko tip ka pata hi nahi', 500, 100]],
          v: { on: 'Durability: jis cheez ka OK mila, wo crash ke baad bhi bachi. (Kaise? Agla lesson: write-ahead log.)', off: 'Riya ko "tip bhej di" dikha tha, lekin Aman ko kabhi nahi mili. Jo OK hua tha, wo kho gaya.' } },
      };
      let L = 'A', on = true, i = 0;
      el.innerHTML = `<div class="acid-l" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="acid-o" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>
        <div class="acid-s calc-note"></div>
        <ol class="acid-steps" style="margin:10px 0 0;padding-left:22px;display:grid;gap:6px"></ol>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"><button type="button" class="btn small primary acid-n">${T.next}</button><button type="button" class="btn small ghost acid-r">${T.reset}</button></div>
        <div class="stats acid-st"></div>
        <div class="acid-v calc-note" style="font-weight:600"></div>`;
      const q = s => el.querySelector(s);
      const chips = (box, items, cur, set) => { box.innerHTML = ''; items.forEach(([k, t]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (cur === k ? ' on' : ''); b.setAttribute('aria-pressed', cur === k); b.textContent = t; b.onclick = () => { set(k); i = 0; draw(); }; box.appendChild(b); }); };
      const draw = () => {
        chips(q('.acid-l'), Object.entries(T.lab), L, k => L = k);
        chips(q('.acid-o'), [[true, T.on], [false, T.off]], on, k => on = k);
        const sc = S[L], st = sc[on ? 'on' : 'off'];
        q('.acid-s').innerHTML = `<strong>${T.start}:</strong> ${sc.setup}`;
        q('.acid-steps').innerHTML = st.map((s, k) => `<li style="opacity:${k < i ? 1 : 0.35};${k === i - 1 ? 'font-weight:600;color:var(--accent-ink)' : 'color:var(--ink)'}">${k < i ? s[0] : '...'}</li>`).join('');
        const cur = i ? st[i - 1] : [0, 500, 100], tot = cur[1] + cur[2], end = i >= st.length;
        const red = c => c ? 'color:var(--red)' : '';
        const third = sc.exp ? `<div class="stat"><span>${T.want}</span><strong>${sc.exp}</strong></div>` : `<div class="stat"><span>${T.total}</span><strong style="${red(tot !== 600)}">${tot}</strong></div>`;
        q('.acid-st').innerHTML = `<div class="stat"><span>${T.riya}</span><strong style="${red(cur[1] < 0)}">${cur[1]}</strong></div><div class="stat"><span>${T.aman}</span><strong style="${red(sc.exp && end && cur[2] !== sc.exp)}">${cur[2]}</strong></div>` + third;
        q('.acid-v').textContent = end ? sc.v[on ? 'on' : 'off'] : `${i}/${st.length} ${T.wait}`;
        q('.acid-v').style.color = end ? (on ? 'var(--green)' : 'var(--red)') : '';
        q('.acid-n').disabled = end;
      };
      q('.acid-n').onclick = () => { i++; draw(); };
      q('.acid-r').onclick = () => { i = 0; draw(); };
      draw();
    }},
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: ACID ka "C" aur CAP ka "C"', html: `Naam same, matlab alag. ACID ka <strong>Consistency</strong> = "database ke niyam (constraints) kabhi nahi tootte". Aage CAP lesson mein ek aur "Consistency" aayegi, jiska matlab hai "har copy pe latest data dikhe". Dono ko mix mat karna.` },

    { type: 'h2', text: 'Isolation levels: jab do transactions ek saath chalein' },
    { type: 'p', html: `xyz.com pe har second hazaaron transactions ek saath chalti hain. Agar database unhe ek ke baad ek (line mein) chalaaye to sab safe, lekin bahut slow. Isliye database unhe <em>overlap</em> hone deta hai, aur <strong>isolation level</strong> tay karta hai ki overlap mein kitni gadbad allowed hai. Zyada isolation = kam gadbad, lekin zyada waiting/retries.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Isolation level', html: `<strong>Ye kya hai:</strong> ek setting jo batati hai ki ek transaction, saath chal rahi doosri transactions ka adhoora kaam kitna dekh sakti hai.<br><strong>Kyun chahiye:</strong> poori safety (sab line mein) slow hai, aur kuch kaam thodi gadbad seh sakte hain. Level se tum speed aur safety ke beech chunte ho.<br><strong>Iske bina:</strong> ya to sab kuch line mein chalega (site slow), ya koi niyam nahi hoga (paise ki ginti galat).` },
    { type: 'p', html: `SQL standard ke 4 levels hain. Neeche se upar, har level pichhle se zyada safe aur thoda zyada mehenga:` },
    { type: 'table', head: ['Level', 'Seedhe shabdon mein', 'Kab theek hai'], rows: [
      ['<strong>Read Uncommitted</strong>', 'Doosron ka adhoora (uncommitted) kaam bhi dikh sakta hai', 'Lagbhag kabhi nahi. Postgres ise chalata hi nahi (Read Committed jaisa treat karta hai)'],
      ['<strong>Read Committed</strong>', 'Har query sirf pakka (committed) data dekhti hai. Lekin do queries ke beech data badal sakta hai', 'Zyada tar web app pages. Postgres ka default'],
      ['<strong>Repeatable Read</strong>', 'Transaction ko shuru ka ek "photo" (snapshot) milta hai. Andar ki saari reads usi photo se', 'Reports, ek se zyada reads jo aapas mein match karein. MySQL ka default'],
      ['<strong>Serializable</strong>', 'Result aisa, jaise transactions ek ke baad ek (line mein) chali hon', 'Paise, booking, niyam jo kai rows pe nirbhar hon. Retry logic ke saath'],
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: MVCC / snapshot', html: `<strong>Ye kya hai:</strong> Postgres aur MySQL (InnoDB) har row ke kai versions rakhte hain. Isko <strong>Multi-Version Concurrency Control (MVCC)</strong> kehte hain. Isse ek transaction ko ek <strong>snapshot</strong> mil sakta hai: "data jaisa mere shuru hone ke waqt tha", ek photo ki tarah.<br><strong>Kyun chahiye:</strong> padhne wale ko likhne wale ka wait nahi karna padta. Dono saath chalte hain.<br><strong>Iske bina:</strong> har read ko lock lena padta, aur ek lambi report saari writes ko rok deti.` },
    { type: 'callout', tone: 'term', title: 'Naye words: Lock aur Deadlock', html: `<strong>Ye kya hai:</strong> <strong>lock</strong> ek row pe lagaya "abhi main use kar raha hoon" ka board. Doosri transaction ko wait karna padta hai. <strong>Shared lock</strong> = "main padh raha hoon, tum bhi padh sakte ho, badal nahi sakte". <strong>Exclusive lock</strong> = "main badal raha hoon, koi haath mat lagao". <strong>Deadlock</strong> = do transactions ek doosre ke lock ka wait kar rahi hain, koi aage nahi badh sakti. Database ek ko cancel (rollback) kar deta hai.<br><strong>Kyun chahiye:</strong> locks se do log ek saath ek hi row nahi badal paate.<br><strong>Iske bina:</strong> do writes ek doosre ko mita deti hain (neeche "lost update").` },
    { type: 'p', html: `Ab paanch classic gadbad (<strong>anomalies</strong>). Har ek ko ek line mein samjho, phir demo mein khud chalao:` },
    { type: 'list', items: [
      '<strong>Dirty read</strong>: tumne kisi ka <em>adhoora</em> kaam padh liya, jo baad mein cancel ho gaya. Jaise ek post pe 999 likes dikhe, jo kabhi asli the hi nahi.',
      '<strong>Non-repeatable read</strong>: ek hi transaction mein ek row do baar padhi, aur beech mein kisi ne use badal diya. Pehli baar "Riya", doosri baar "Riya S".',
      '<strong>Phantom read</strong>: "user 42 ke kitne posts?" do baar poocha. Beech mein kisi ne <em>nayi row</em> daal di, to count 3 se 4. Purani row nahi badli, ek nayi "bhoot" row aa gayi.',
      '<strong>Lost update</strong>: do log ek hi value padhte hain, dono apna jod ke likhte hain. Doosre ne pehle ka kaam mita diya. (ACID lab mein Aman ki tip.)',
      '<strong>Write skew</strong>: do log same data padh ke <em>alag alag rows</em> badalte hain. Har ek ka faisla akele mein sahi tha, lekin dono milake niyam tod dete hain.',
    ]},
    { type: 'p', html: `Neeche demo mein anomaly chuno, database aur isolation level chuno, aur dono transactions (T1, T2) ko step by step chalao. T1 aur T2 do alag users ki requests hain jo ek hi waqt pe chal rahi hain. Har result asli Postgres aur MySQL ke documented behaviour pe based hai:` },
    { type: 'custom', render(el) {
      const OUT = {
        pg: { RU: { dirty: 'prevented', nonrep: 'happens', phantom: 'happens', lost: 'happens', skew: 'happens' },
              RC: { dirty: 'prevented', nonrep: 'happens', phantom: 'happens', lost: 'happens', skew: 'happens' },
              RR: { dirty: 'prevented', nonrep: 'prevented', phantom: 'prevented', lost: 'error', skew: 'happens' },
              S:  { dirty: 'prevented', nonrep: 'prevented', phantom: 'prevented', lost: 'error', skew: 'error' } },
        my: { RU: { dirty: 'happens', nonrep: 'happens', phantom: 'happens', lost: 'happens', skew: 'happens' },
              RC: { dirty: 'prevented', nonrep: 'happens', phantom: 'happens', lost: 'happens', skew: 'happens' },
              RR: { dirty: 'prevented', nonrep: 'prevented', phantom: 'prevented', lost: 'happens', skew: 'happens' },
              S:  { dirty: 'block', nonrep: 'block', phantom: 'block', lost: 'deadlock', skew: 'deadlock' } },
      };
      const DB = { pg: 'PostgreSQL', my: 'MySQL (InnoDB)' };
      const LV = { RU: 'Read Uncommitted', RC: 'Read Committed', RR: 'Repeatable Read', S: 'Serializable' };
      const DEF = { pg: 'RC', my: 'RR' };
      const A = {
        dirty: { name: 'Dirty read', setup: 'posts.id = 7 ke likes = 10', steps: [
          { w: 'T2', sql: 'BEGIN;\nUPDATE posts SET likes = 999 WHERE id = 7;', r: { _: 'Row badla, lekin COMMIT nahi hua (ek bug ne galat value likhi).' } },
          { w: 'T1', sql: 'SELECT likes FROM posts WHERE id = 7;', r: { happens: '→ <strong>999</strong>. Uncommitted value padh li!', prevented: '→ <strong>10</strong>. Sirf committed data dikhta hai.', block: 'Ruk gaya. Serializable mein ye SELECT locking read ban jaata hai, aur row pe T2 ka lock hai.' } },
          { w: 'T2', sql: 'ROLLBACK;', r: { _: 'Badlav cancel. 999 kabhi exist hi nahi kiya.', block: 'Rollback hua, lock chhoota. Ab T1 ka SELECT chala: → <strong>10</strong>.' } },
        ], v: { happens: 'Dirty read hua: T1 ne 999 dikhaya jo database mein kabhi commit hi nahi hua.', prevented: 'Dirty read nahi hua. T1 ne hamesha last committed value dekhi.', block: 'Dirty read nahi hua, T1 lock ke liye ruka. Safe, lekin waiting ki keemat pe.' } },
        nonrep: { name: 'Non-repeatable read', setup: 'users.id = 42 ka naam "Riya"', steps: [
          { w: 'T1', sql: 'BEGIN;\nSELECT name FROM users WHERE id = 42;', r: { _: '→ "Riya"' } },
          { w: 'T2', sql: 'UPDATE users SET name = \'Riya S\' WHERE id = 42;', r: { _: 'Update ho gaya.', block: 'Ruk gaya: T1 ke locking read ne row pe shared lock rakha hai.' } },
          { w: 'T2', sql: 'COMMIT;', r: { _: 'Committed.', block: '(T2 abhi bhi wait kar raha hai.)' } },
          { w: 'T1', sql: 'SELECT name FROM users WHERE id = 42;', r: { happens: '→ <strong>"Riya S"</strong>. Same transaction, same query, alag answer!', prevented: '→ <strong>"Riya"</strong>. T1 apne snapshot se padh raha hai.', block: '→ <strong>"Riya"</strong>. T1 ke COMMIT ke baad hi T2 aage badhega.' } },
        ], v: { happens: 'Non-repeatable read hua: ek hi transaction mein ek row do baar padhi aur value badal gayi.', prevented: 'Nahi hua. Snapshot ki wajah se T1 ko poori transaction mein ek jaisa data dikha.', block: 'Nahi hua. Locks ki wajah se T2 ko wait karna pada.' } },
        phantom: { name: 'Phantom read', setup: 'user 42 ke 3 posts hain', steps: [
          { w: 'T1', sql: 'BEGIN;\nSELECT COUNT(*) FROM posts WHERE user_id = 42;', r: { _: '→ 3' } },
          { w: 'T2', sql: 'INSERT INTO posts (user_id, title) VALUES (42, \'Naya post\');', r: { _: 'Nayi row add.', block: 'Ruk gaya: T1 ne us range pe next-key (gap) locks liye hain, nayi row us gap mein nahi ghus sakti.' } },
          { w: 'T2', sql: 'COMMIT;', r: { _: 'Committed.', block: '(T2 abhi bhi wait kar raha hai.)' } },
          { w: 'T1', sql: 'SELECT COUNT(*) FROM posts WHERE user_id = 42;', r: { happens: '→ <strong>4</strong>. Ek "phantom" row aa gayi!', prevented: '→ <strong>3</strong>. Snapshot mein nayi row nahi hai.', block: '→ <strong>3</strong>.' } },
        ], v: { happens: 'Phantom hua: kisi row ki value nahi badli, balki condition se match karne wali NAYI row aa gayi.', prevented: 'Nahi hua (snapshot).', block: 'Nahi hua (gap locks se insert ruka).' } },
        lost: { name: 'Lost update', setup: 'Aman ke coins = 100. T1 +50 tip, T2 +20 tip. Sahi answer: 170', steps: [
          { w: 'T1', sql: 'BEGIN;\nSELECT coins FROM wallets WHERE user = \'aman\';', r: { _: '→ 100. App sochta hai: 100 + 50 = 150' } },
          { w: 'T2', sql: 'BEGIN;\nSELECT coins FROM wallets WHERE user = \'aman\';', r: { _: '→ 100. App sochta hai: 100 + 20 = 120' } },
          { w: 'T1', sql: 'UPDATE wallets SET coins = 150 WHERE user = \'aman\';', r: { _: 'Update ho gaya (row pe T1 ka lock).', deadlock: 'Ruk gaya: dono ke SELECT ne shared lock liye the, T1 ko exclusive lock chahiye.' } },
          { w: 'T2', sql: 'UPDATE wallets SET coins = 120 WHERE user = \'aman\';', r: { _: 'Ruk gaya: T1 ke lock ka wait.', deadlock: '<strong>Deadlock</strong>: T1 T2 ka wait kar raha, T2 T1 ka. InnoDB ek ko (yahan T2) rollback karta hai. T1 ka UPDATE ab chal gaya.' } },
          { w: 'T1', sql: 'COMMIT;', r: { _: 'Committed: 150.', happens: 'Committed: 150. Ab T2 ka ruka hua UPDATE chalta hai aur 120 likh deta hai.', error: 'Committed: 150. T2 jaagta hai, lekin row uske snapshot ke baad badli hai → <strong>ERROR: could not serialize access due to concurrent update</strong>.' } },
          { w: 'T2', sql: 'COMMIT;  (ya retry)', r: { happens: 'Committed. Final coins = <strong>120</strong>.', error: 'T2 fail hua, app retry karta hai: naya read 150, +20 = <strong>170</strong>.', deadlock: 'T2 retry karta hai: naya read 150, +20 = <strong>170</strong>.' } },
        ], v: { happens: 'Lost update hua: final 120, T1 ki +50 tip kho gayi. Dono ne purana 100 padh ke apna jod likha.', error: 'Bacha: database ne T2 ko error diya, app ne retry kiya. Final 170. Retry logic likhna zaroori hai.', deadlock: 'Bacha: deadlock se ek transaction rollback, retry ke baad 170.' } },
        skew: { name: 'Write skew', setup: 'Rule: kam se kam 1 moderator on-duty. Asha aur Bilal dono on-duty', steps: [
          { w: 'T1', sql: 'BEGIN;  -- Asha chutti chahti hai\nSELECT COUNT(*) FROM mods WHERE on_duty;', r: { _: '→ 2. "Bilal hai, main ja sakti hoon."' } },
          { w: 'T2', sql: 'BEGIN;  -- Bilal bhi\nSELECT COUNT(*) FROM mods WHERE on_duty;', r: { _: '→ 2. "Asha hai, main ja sakta hoon."' } },
          { w: 'T1', sql: 'UPDATE mods SET on_duty = false WHERE name = \'Asha\';', r: { _: 'Ho gaya (sirf Asha ki row).', deadlock: 'Ruk gaya: Bilal ki transaction ne SELECT mein shared locks liye hain.' } },
          { w: 'T2', sql: 'UPDATE mods SET on_duty = false WHERE name = \'Bilal\';', r: { _: 'Ho gaya (alag row, koi takraav nahi dikha).', deadlock: '<strong>Deadlock</strong>. InnoDB T2 ko rollback karta hai, T1 aage badhta hai.' } },
          { w: 'T1', sql: 'COMMIT;', r: { _: 'Committed.' } },
          { w: 'T2', sql: 'COMMIT;', r: { happens: 'Committed.', error: '<strong>ERROR: could not serialize access due to read/write dependencies</strong>. Retry: count ab 1 hai, app chutti mana kar deta hai.', deadlock: 'T2 retry: count ab 1, app chutti mana kar deta hai.' } },
        ], v: { happens: 'Write skew hua: dono ne alag rows badli, har ek ka check sahi tha, lekin milake 0 moderators on-duty. Rule toot gaya.', error: 'Bacha: Postgres ka Serializable (SSI) ne pakda ki dono ne ek doosre ke padhe hue data ko badla, aur ek ko fail kiya.', deadlock: 'Bacha: locks + deadlock se ek transaction rollback, retry pe rule bach gaya.' } },
      };
      let an = 'lost', db = 'pg', lv = 'RC', i = 0;
      el.innerHTML = `<div class="iso-a" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="iso-d" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>
        <div class="iso-l" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>
        <div class="iso-setup calc-note"></div>
        <div class="iso-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:10px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">
          <button type="button" class="btn small primary iso-next">Next step</button>
          <button type="button" class="btn small ghost iso-reset">Restart</button>
        </div>
        <div class="iso-v calc-note" style="font-weight:600"></div>`;
      const q = s => el.querySelector(s);
      const chips = (box, map, get, set, extra) => {
        box.innerHTML = '';
        Object.keys(map).forEach(k => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (get() === k ? ' on' : ''); b.setAttribute('aria-pressed', get() === k); b.textContent = map[k] + (extra ? extra(k) : ''); b.onclick = () => { set(k); i = 0; draw(); }; box.appendChild(b); });
      };
      const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
      const draw = () => {
        chips(q('.iso-a'), Object.fromEntries(Object.entries(A).map(([k, v]) => [k, v.name])), () => an, k => an = k);
        chips(q('.iso-d'), DB, () => db, k => db = k);
        chips(q('.iso-l'), LV, () => lv, k => lv = k, k => DEF[db] === k ? ' (default)' : '');
        const S = A[an], out = OUT[db][lv][an];
        q('.iso-setup').innerHTML = `<strong>Shuru mein:</strong> ${S.setup}.` + (db === 'pg' && lv === 'RU' ? ' (Postgres mein Read Uncommitted asal mein Read Committed jaisa hi chalta hai.)' : '');
        const col = who => S.steps.map((st, k) => {
          if (st.w !== who) return `<div style="min-height:20px"></div>`;
          const done = k < i, now = k === i - 1;
          const res = st.r[out] || (out === 'error' || out === 'deadlock' || out === 'block' ? (st.r.prevented || st.r._) : st.r._) || st.r._ || '';
          return `<div style="border:1px solid ${now ? 'var(--accent)' : 'var(--line)'};background:${now ? 'var(--accent-soft)' : 'var(--surface)'};border-radius:var(--r-sm);padding:8px;opacity:${done ? 1 : 0.35}">
            <div style="font-size:12px;color:var(--ink-3)">Step ${k + 1}</div>
            <pre style="margin:4px 0;white-space:pre-wrap;word-break:break-word;font:12px/1.4 var(--f-mono);color:var(--ink)">${esc(st.sql)}</pre>
            <div style="font-size:13px;color:var(--ink-2)">${done ? res : '...'}</div></div>`;
        }).join('');
        q('.iso-grid').innerHTML = ['T1', 'T2'].map(w => `<div><div style="font:700 15px var(--f-display);margin-bottom:6px">${w}</div><div style="display:grid;gap:6px">${col(w)}</div></div>`).join('');
        const end = i >= S.steps.length;
        q('.iso-v').innerHTML = end ? `${DB[db]}, ${LV[lv]}: ${S.v[out] || S.v.prevented}` : `${i}/${S.steps.length} steps chale. "Next step" dabao.`;
        q('.iso-next').disabled = end;
      };
      q('.iso-next').onclick = () => { i++; draw(); };
      q('.iso-reset').onclick = () => { i = 0; draw(); };
      draw();
    }},
    { type: 'p', html: `Demo mein do aur shabd aaye. <strong>Gap lock</strong> (MySQL): rows ke <em>beech ki khaali jagah</em> pe lock, taaki koi nayi row us range mein ghus na sake. Isse phantom rukta hai. <strong>SSI</strong> (Serializable Snapshot Isolation, Postgres ka Serializable): ye pehle se lock nahi lagata. Ye dekhta rehta hai ki kis transaction ne kya padha aur kya likha. Khatarnaak pattern dikha, to ek transaction ko error deta hai, aur app use retry karta hai.` },
    { type: 'p', html: `Demo ka saar ek table mein. "Bacha" ke andar bhi farak hai: kahin snapshot se, kahin wait (lock) se, kahin error aur retry se.` },
    { type: 'table', head: ['Level', 'Dirty read', 'Non-repeatable', 'Phantom', 'Lost update', 'Write skew'], caption: 'Postgres / MySQL InnoDB. "-" = ho sakta hai, "bacha" = nahi hota.', rows: [
      ['Read Uncommitted', 'Postgres: bacha · MySQL: -', '-', '-', '-', '-'],
      ['Read Committed', 'bacha', '-', '-', '-', '-'],
      ['Repeatable Read', 'bacha', 'bacha', 'bacha (snapshot; MySQL mein sirf plain reads ke liye)', 'Postgres: bacha (error) · MySQL: -', '-'],
      ['Serializable', 'bacha', 'bacha', 'bacha', 'bacha', 'bacha'],
    ]},
    { type: 'callout', tone: 'warn', title: 'Defaults yaad rakho', html: `<strong>PostgreSQL ka default Read Committed hai. MySQL InnoDB ka default Repeatable Read.</strong> Dono defaults mein <em>lost update</em> (MySQL) ya <em>lost update + write skew</em> (Postgres RC) ho sakte hain. Zyada tar apps ko poora Serializable nahi chahiye; bas khatarnaak jagahon pe sahi tool: <code>UPDATE wallets SET coins = coins + 50</code> (atomic, read-modify-write database ke andar), <code>SELECT ... FOR UPDATE</code> (row lock), ya version column se optimistic check (har row ke saath ek version number; likhte waqt check karo ki beech mein number badla to nahi, badla ho to retry). Aur Serializable/Repeatable Read pe app mein retry logic zaroori hai.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Mere code mein transaction hai, to race condition nahi hogi." (Race condition = do kaam ek saath chal ke ek doosre ka result bigaad dein.) Galat. Transaction <strong>atomicity</strong> deta hai (sab ya kuch nahi), lekin isolation level ke hisaab se doosri transactions ke saath race phir bhi ho sakti hai. Demo mein lost update dekho: dono transactions poori tarah "transactional" thin, phir bhi 50 coins gaye.` },

    { type: 'h2', text: 'NoSQL family: access pattern se pehchano' },
    { type: 'p', html: `SQL database kai saal tak har kaam ke liye kaafi hai. NoSQL tab aata hai jab koi <em>ek</em> access pattern itna bada ya alag ho jaaye ki general-purpose database uske liye mehenga ya slow pade. "NoSQL" ek family ka naam hai, ek database ka nahi. Har member ek khaas shape ke data aur query ke liye bana hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: NoSQL', html: `<strong>Ye kya hai:</strong> "Not only SQL". Un databases ka family naam jo data ko tables + joins ke alawa kisi aur shakal mein rakhte hain: key-value, document, wide-column, graph, aur aage.<br><strong>Kyun chahiye:</strong> kuch access patterns (lakhon chat messages per second, "dost ke dost", "milti julti video") ke liye ek khaas shakal bahut tez aur sasti padti hai.<br><strong>Iske bina:</strong> har kaam ek general SQL database se karoge. Zyada tar kaam chal jaayega, lekin kuch bahut bade ya ajeeb patterns pe wo slow ya mehenga ho jaayega.` },
    { type: 'p', html: `Ab har family ko ek ek karke dekhte hain. Har ek ke liye: ye kya hai, xyz.com ka data usme kaisa dikhega, kab use karo, kab nahi, aur real products.` },

    { type: 'h3', text: '1. Relational (SQL): tables + joins' },
    { type: 'p', html: `Isse upar mil chuke ho. <strong>Ye kya hai:</strong> tables, rows, columns, joins, transactions. <strong>xyz.com mein:</strong> users, posts, wallets, follows. <strong>Kab use karo:</strong> paise, relationships, aur jab pata nahi kal kaunsi query chahiye. <strong>Kab nahi:</strong> ek hi pattern pe lakhon writes per second (chat, sensor data), ya "milti julti meaning" jaisi search. <strong>Products:</strong> PostgreSQL, MySQL, SQL Server, Oracle. Bade scale ke liye distributed SQL bhi hain: CockroachDB, Google Spanner, YugabyteDB.` },

    { type: 'h3', text: '2. Key-value: ek naam, ek cheez' },
    { type: 'callout', tone: 'term', title: 'Naya word: Key-value store', html: `<strong>Ye kya hai:</strong> ek bahut bada dictionary. Har cheez ka ek naam (<strong>key</strong>) aur uske saath kuch bhi data (<strong>value</strong>). Sirf do kaam: "is key ki value do" (GET) aur "is key mein ye rakho" (PUT). Jaise locker number se locker kholna: number pata hai to turant, number nahi pata to kuch nahi.<br><strong>Kyun chahiye:</strong> jab har request ko bas ek cheez uske ID se chahiye, ye sabse tez aur sabse aasaani se scale hone wala tareeka hai. Latency har baar lagbhag same (predictable).<br><strong>Iske bina:</strong> har page load pe session check ke liye main SQL database pe query. Lakhon users pe wo database sirf sessions mein bhar jaayega.` },
    { type: 'ascii', text: `
key                       value
session:8f2a91        →   { user: 42, expires: "21:30" }
cart:42               →   [ "course-7", "ebook-12" ]
ratelimit:42:2026-10  →   37
settings:42           →   { theme: "dark", lang: "hi" }`, caption: 'xyz.com ka key-value data. Value ke andar kya hai, database ko farak nahi padta.' },
    { type: 'p', html: `<strong>Kab use karo:</strong> sessions, cache, cart, user settings, rate-limit counters, feature flags. <strong>Kab nahi:</strong> jab value ke <em>andar</em> ki field se dhoondhna ho ("saare users jinka theme dark hai"), ya joins chahiye. <strong>Products:</strong> Redis (RAM mein, bahut tez), Amazon DynamoDB (managed, disk pe, huge scale), etcd (config ke liye).` },

    { type: 'h3', text: '3. Document: ek JSON mein poori cheez' },
    { type: 'callout', tone: 'term', title: 'Naya word: Document store', html: `<strong>Ye kya hai:</strong> har cheez ek <strong>document</strong> hai: ek JSON object, jisme andar lists aur aur objects ho sakte hain (nested). Har document ki fields alag ho sakti hain.<br><strong>Kyun chahiye:</strong> jo cheez hamesha ek saath padhi jaati hai (ek course page ke saare sections), wo ek hi jagah ek hi read mein mil jaati hai. Naye type ke item ke liye schema badalne ki zaroorat nahi.<br><strong>Iske bina:</strong> ek course page ke liye 6 tables join karni padtin (course, sections, videos, quizzes, tags...), aur har naye content type pe nayi table.` },
    { type: 'code', text: `// courses collection, ek document
{
  "_id": "course-7",
  "title": "DSA in 30 days",
  "author": { "id": 42, "name": "Riya" },
  "sections": [
    { "title": "Arrays", "videos": ["v1", "v2"] },
    { "title": "Trees",  "videos": ["v3"], "quiz": { "questions": 10 } }
  ],
  "tags": ["dsa", "beginner"]
}` },
    { type: 'p', html: `<strong>Kab use karo:</strong> course/product catalog jahan har item ki fields alag hain, CMS pages, user profiles jo ek saath padhe jaate hain. <strong>Kab nahi:</strong> jab bahut saare documents aapas mein jude hon aur unke beech transactions chahiye (paise), ya ek hi data bahut jagah copy ho raha ho. <strong>Products:</strong> MongoDB, Google Firestore, Couchbase. (Postgres ka <code>JSONB</code> column bhi documents rakh sakta hai.)` },

    { type: 'h3', text: '4. Wide-column: bahut saare writes, key se padhna' },
    { type: 'callout', tone: 'term', title: 'Naya word: Wide-column store', html: `<strong>Ye kya hai:</strong> data bahut saari machines pe baanta hota hai. Har row ek <strong>partition key</strong> ke hisaab se kisi ek machine pe jaati hai, aur us partition ke andar rows ek <strong>clustering key</strong> (aksar time) se sorted rehti hain. Socho har chat ka apna alag register, jisme messages time ke order mein likhe hain.<br><strong>Kyun chahiye:</strong> har second lakhon chhote writes, aur padhna hamesha ek hi tarah se ("is chat ke latest 50 messages"). Ye store dono kaam bahut tez karta hai, aur machines jodne se aur tez.<br><strong>Iske bina:</strong> ek SQL database ko lakhon inserts per second sambhaalne padte. Ek machine ki hadd jaldi aa jaati.` },
    { type: 'callout', tone: 'term', title: 'Partition key aur clustering key', html: `<strong>Ye kya hai:</strong> Cassandra mein table banate waqt tum batate ho: <code>PRIMARY KEY ((conversation_id), sent_at)</code>. <strong>Partition key</strong> (conversation_id) decide karti hai data kis machine pe jaayega; ek conversation ke saare messages ek saath. <strong>Clustering key</strong> (sent_at) us partition ke andar sort order.<br><strong>Kyun chahiye:</strong> "is chat ke last 50 messages" ek hi machine se, ek hi lagataar (sequential) read mein.<br><strong>Iske bina:</strong> messages saari machines pe bikhre hote, aur har chat kholne pe sabse poochhna padta.<br><strong>Example:</strong> Discord ne apne messages isi model mein rakhe (pehle Cassandra, 2023 mein ScyllaDB pe shift).` },
    { type: 'ascii', text: `
partition: conversation_id = c-9  (machine 3 pe)
  sent_at              sender   body
  2026-10-04 10:00:01  42       "match dekha?"
  2026-10-04 10:00:07  7        "haan, last over!"
  2026-10-04 10:00:15  42       "kal milte hain"

partition: conversation_id = c-12 (machine 1 pe)
  ...`, caption: 'xyz.com chat: ek conversation = ek partition, andar time se sorted.' },
    { type: 'p', html: `<strong>Kab use karo:</strong> chat messages, activity feeds, location history, IoT/events, jahan writes bahut zyada aur padhna key se. <strong>Kab nahi:</strong> ad-hoc queries ("saare messages jisme word X hai"), joins, multi-row transactions. Yahan query pehle se socho, phir table banao. <strong>Products:</strong> Apache Cassandra, ScyllaDB, Google Bigtable, Apache HBase.` },

    { type: 'h3', text: '5. Graph: rishton ka jaal' },
    { type: 'callout', tone: 'term', title: 'Naya word: Graph database', html: `<strong>Ye kya hai:</strong> data <strong>nodes</strong> (cheezein: users, videos) aur <strong>edges</strong> (rishte: "follows", "liked") ke roop mein. Har node ke paas uske rishton ki seedhi list hoti hai, to ek se doosre pe "chalna" bahut sasta hai.<br><strong>Kyun chahiye:</strong> "Riya ke dost ke dost jo Riya ke dost nahi hain" jaise <strong>multi-hop</strong> sawaal (kai kadam ka safar) graph DB mein natural hain.<br><strong>Iske bina:</strong> SQL mein har hop ek aur join. 3-4 hop pe query lambi, mushkil aur badi tables pe slow ho jaati hai.` },
    { type: 'ascii', text: `
 (Riya) --follows--> (Aman) --follows--> (Kabir)
   |                    |
 liked               liked
   v                    v
 (video: DSA-1)     (video: Cricket)

Query: Riya -> follows -> follows -> ?   =>  Kabir (suggest karo)`, caption: 'xyz.com ka follow graph. "Aapke liye suggested creators" do hop mein.' },
    { type: 'p', html: `<strong>Kab use karo:</strong> friend/creator suggestions, fraud rings (kai fake accounts ek hi phone/card se jude), knowledge graphs. <strong>Kab nahi:</strong> simple CRUD (bas save karo, ID se laao), ya bahut zyada write throughput. Chhote graphs ke liye Postgres ki recursive queries bhi kaafi hain. <strong>Products:</strong> Neo4j, Amazon Neptune, TigerGraph.` },

    { type: 'h3', text: '6. Time-series: time ke saath badalte numbers' },
    { type: 'callout', tone: 'term', title: 'Naya word: Time-series database', html: `<strong>Ye kya hai:</strong> aisa database jo "kis cheez ka, kis waqt, kya number tha" rakhta hai. Jaise har 15 second pe har server ka CPU. Data hamesha time ke order mein aata hai, aur purana kam zaroori hota jaata hai.<br><strong>Kyun chahiye:</strong> ye store numbers ko bahut compress karta hai (Prometheus ki docs ke mutabik lagbhag 1-2 bytes per sample), time range pe average/max jaldi nikalta hai, aur purana data apne aap mita deta hai.<br><strong>Iske bina:</strong> SQL table mein har 15 second pe har server ki ek row. Mahino mein arabon rows, disk bhari, aur "pichhle 1 ghante ka average" slow.` },
    { type: 'ascii', text: `
metric: cpu_percent{server="api-3"}
  10:00:00  41
  10:00:15  44
  10:00:30  97   <- spike!
  10:00:45  95
Query: pichhle 5 minute ka average CPU, har server ka`, caption: 'xyz.com ke servers ke metrics.' },
    { type: 'p', html: `<strong>Kab use karo:</strong> server metrics, app latency, video watch-time per minute, sensor readings. <strong>Kab nahi:</strong> business entities jaise users, orders, coins (unke liye SQL). <strong>Products:</strong> Prometheus (default retention 15 din), InfluxDB, TimescaleDB (Postgres extension).` },

    { type: 'h3', text: '7. Search engine: shabdon se dhoondhna' },
    { type: 'callout', tone: 'term', title: 'Naya word: Search engine aur inverted index', html: `<strong>Ye kya hai:</strong> ek database jo text ke andar ke <em>shabdon</em> se dhoondhta hai. Andar ek <strong>inverted index</strong> hota hai: har shabd ke saamne un documents ki list jinme wo shabd hai, bilkul kitaab ke peeche wale index ki tarah.<br><strong>Kyun chahiye:</strong> "cricket highlights" likho, to sab posts jinme ye shabd hain, sabse relevant pehle (ranking). Spelling galat ho ("cricet") to bhi milta hai (fuzzy). Filters bhi ("sirf Hindi, sirf is hafte").<br><strong>Iske bina:</strong> SQL mein <code>WHERE title LIKE '%cricket%'</code>: har row padhni padti hai, ranking nahi, spelling galti pe kuch nahi milta.` },
    { type: 'ascii', text: `
shabd        ->  post IDs
"cricket"    ->  102, 205, 311
"highlights" ->  205, 311, 480
"mumbai"     ->  101, 205

"cricket highlights"  =>  205, 311 (dono shabd)  -> ranking -> 311 pehle`, caption: 'xyz.com posts ka inverted index (search lesson mein detail).' },
    { type: 'p', html: `<strong>Kab use karo:</strong> site search, autocomplete, logs mein dhoondhna, filters wale catalog. <strong>Kab nahi:</strong> source of truth ke roop mein (asli data kahin aur rakho, yahan copy), ya transactions ke liye. <strong>Products:</strong> Elasticsearch, OpenSearch, Apache Solr (sab Lucene library pe bane). Chhote scale pe Postgres ka built-in full-text search bhi chal jaata hai.` },

    { type: 'h3', text: '8. Vector: "matlab" se milti julti cheezein' },
    { type: 'callout', tone: 'term', title: 'Naya word: Embedding aur vector database', html: `<strong>Ye kya hai:</strong> ek AI model kisi text, image ya video ko numbers ki ek lambi list mein badal deta hai (jaise 768 numbers). Isko <strong>embedding</strong> (ya vector) kehte hain. Milte julte matlab wali cheezon ki lists aapas mein paas paas hoti hain. <strong>Vector database</strong> "is list ke sabse paas wali 10 lists" jaldi dhoondhta hai. Ye approximate tareeke (jaise HNSW naam ka graph index) use karta hai: thoda sa accuracy chhod ke bahut zyada speed.<br><strong>Kyun chahiye:</strong> "aisi aur videos", "is sawaal se milte julte help articles" (AI chatbot ke liye), jahan shabd alag ho sakte hain lekin matlab same ("kaar" aur "gaadi").<br><strong>Iske bina:</strong> sirf keyword search. "Gaadi kaise chalayein" wala user "driving lessons" wala video kabhi nahi dekh paata.` },
    { type: 'ascii', text: `
video                   embedding (chhota karke)
"DSA arrays part 1"  -> [0.81, 0.10, 0.33, ...]
"Arrays for beginners" -> [0.79, 0.12, 0.30, ...]   <- paas!
"Mumbai rain vlog"   -> [0.05, 0.92, 0.11, ...]   <- door

Query: "DSA arrays part 1" ke sabse paas 2  =>  "Arrays for beginners", ...`, caption: 'xyz.com recommendations: paas wale vectors = milta julta content.' },
    { type: 'p', html: `<strong>Kab use karo:</strong> recommendations, semantic search, AI chatbot ke liye apne documents dhoondhna (isko RAG kehte hain: pehle milte julte documents dhoondho, phir AI unhe padh ke jawab de). <strong>Kab nahi:</strong> exact match ("email = x") ya keyword search; wahan normal index ya search engine behtar. <strong>Products:</strong> pgvector (Postgres extension; HNSW aur IVFFlat indexes), Pinecone, Milvus, Weaviate, Qdrant. Pehle se Postgres hai to pgvector se shuru karna aksar kaafi hai.` },

    { type: 'h3', text: 'Ek query, aath databases' },
    { type: 'p', html: `Ab khud dekho ki ek hi sawaal alag databases mein kaisa chalta hai. Sawaal chuno:` },
    { type: 'custom', render(el) {
      const F = ['Relational', 'Key-value', 'Document', 'Wide-column', 'Graph', 'Time-series', 'Search', 'Vector'];
      const LBL = { g: 'Best fit', o: 'Chal jaayega', x: 'Galat tool' };
      // per query: [verdict letter for each family, one-line reason]
      const Q = [
        { q: 'Riya → Aman 100 coins transfer', r: [['g', 'Transaction: dono rows ek saath, ya kuch nahi'], ['x', 'Do keys ek saath badalne ki pakki guarantee mushkil'], ['o', 'MongoDB mein multi-document transactions hain, lekin mehenge'], ['x', 'Multi-row transaction ke liye bana hi nahi'], ['x', 'Paise ke liye nahi'], ['x', 'Numbers time pe, balance nahi'], ['x', 'Copy hai, source of truth nahi'], ['x', 'Similarity ke liye hai']] },
        { q: 'Session token se user nikaalo', r: [['o', 'Chalega, lekin har page pe main DB pe bojh'], ['g', 'GET session:8f2a91: ek key, sub-millisecond'], ['o', 'Chalega, thoda zyada'], ['o', 'Key se padh sakte ho, lekin overkill'], ['x', 'Rishte nahi hain yahan'], ['x', 'Galat shakal'], ['x', 'Galat shakal'], ['x', 'Galat shakal']] },
        { q: 'Chat c-9 ke latest 50 messages', r: [['o', 'Index ke saath chhote scale pe theek; lakhon writes/sec pe mushkil'], ['x', 'Poori list ek value mein? Har message pe poori value dobara likho'], ['o', 'Chalega, lekin bade chats pe documents bahut bade'], ['g', 'Ek partition, time se sorted, ek read'], ['x', 'Rishte nahi, list hai'], ['o', 'Time order hai, lekin text messages ke liye nahi bana'], ['x', 'Source of truth nahi'], ['x', 'Similarity nahi chahiye']] },
        { q: 'Riya ke dost ke dost (suggestions)', r: [['o', 'Self-join do baar; 3-4 hop pe slow'], ['x', 'Rishte follow nahi kar sakta'], ['x', 'Har hop pe alag reads, app mein jodo'], ['x', 'Joins nahi'], ['g', 'Edges pe chalna hi iska kaam hai'], ['x', 'Galat shakal'], ['x', 'Galat shakal'], ['o', 'Milte julte users de sakta hai, rishte nahi']] },
        { q: 'Pichhle 1 ghante ka average CPU', r: [['o', 'Chhote scale pe theek, bade pe bahut rows'], ['x', 'Range query nahi'], ['x', 'Galat shakal'], ['o', 'Time-sorted partitions se ho sakta hai'], ['x', 'Galat shakal'], ['g', 'Compressed, time range aggregate, purana data auto-delete'], ['o', 'Logs/metrics ke liye use hota hai, mehenga'], ['x', 'Galat shakal']] },
        { q: 'Search "cricet highlights" (galat spelling)', r: [['o', 'Built-in full-text chhote scale pe; fuzzy/ranking kamzor'], ['x', 'Shabd se nahi dhoondh sakta'], ['o', 'Kuch text search hai, limited'], ['x', 'Ad-hoc text search nahi'], ['x', 'Galat shakal'], ['x', 'Galat shakal'], ['g', 'Inverted index + fuzzy + ranking'], ['o', 'Matlab se milega, spelling/keyword mein kamzor']] },
        { q: '"Is video jaisi aur videos"', r: [['o', 'pgvector extension ke saath haan'], ['x', 'Similarity nahi'], ['x', 'Similarity nahi'], ['x', 'Similarity nahi'], ['o', '"Jinhone ye dekha unhone ye bhi" rishton se'], ['x', 'Galat shakal'], ['o', 'Keyword "more like this", matlab nahi'], ['g', 'Nearest neighbours: matlab se milte julte']] },
      ];
      let k = 0;
      el.innerHTML = `<div class="qf-q" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="qf-g" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:12px"></div>
        <div class="calc-note qf-n"></div>`;
      const q = s => el.querySelector(s);
      const COL = { g: 'var(--green)', o: 'var(--amber)', x: 'var(--red)' };
      const draw = () => {
        q('.qf-q').innerHTML = '';
        Q.forEach((x, j) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (j === k ? ' on' : ''); b.setAttribute('aria-pressed', j === k); b.textContent = x.q; b.onclick = () => { k = j; draw(); }; q('.qf-q').appendChild(b); });
        q('.qf-g').innerHTML = Q[k].r.map(([v, why], j) => `<div style="border:1px solid var(--line);border-left:4px solid ${COL[v]};border-radius:var(--r-sm);padding:8px;background:${v === 'g' ? 'var(--accent-soft)' : 'var(--surface)'}"><div style="font:700 14px var(--f-display);color:var(--ink)">${F[j]}</div><div style="font-size:12px;font-weight:600;color:${COL[v]}">${LBL[v]}</div><div style="font-size:13px;color:var(--ink-2);margin-top:2px">${why}</div></div>`).join('');
        const best = Q[k].r.map((x, j) => x[0] === 'g' ? F[j] : null).filter(Boolean);
        q('.qf-n').textContent = `Is sawaal ke liye best: ${best.join(', ')}. Dhyaan do: Relational lagbhag har jagah "chal jaayega" hai. Isliye shuruaat usi se hoti hai.`;
      };
      draw();
    }},

    { type: 'h3', text: 'Ek nazar mein: poori family' },
    { type: 'table', head: ['Type', 'Data ki shape aur query', 'Real products', 'xyz.com mein', 'Kab NAHI'], rows: [
      ['<strong>Key-value</strong>', 'key → value. Sirf key se get/put. Bahut fast, predictable latency', 'Redis, DynamoDB', 'Sessions, cart, user settings, rate-limit counters', 'Value ke andar ki field se search ya joins chahiye'],
      ['<strong>Document</strong>', 'key → JSON document (nested). Poora document ek saath padho', 'MongoDB, Firestore', 'Post ka content blocks, CMS pages, product catalog jahan har item ki fields alag', 'Bahut saare documents ke beech relationships aur transactions'],
      ['<strong>Wide-column</strong>', 'Partition key se data ek machine pe, andar clustering key se sorted. Bahut tez writes', 'Cassandra, ScyllaDB, Bigtable, HBase', 'Chat messages (partition = conversation, sort = time), location history, events', 'Ad-hoc queries, joins, "sab users jinka naam R se shuru"'],
      ['<strong>Graph</strong>', 'Nodes + edges. Multi-hop queries ("dost ke dost")', 'Neo4j, Amazon Neptune', 'Friend suggestions, fraud rings', 'Simple CRUD; bahut bada write throughput'],
      ['<strong>Time-series</strong>', '(metric, time) → value. Time range pe aggregate, purana data compress/delete', 'Prometheus, InfluxDB, TimescaleDB', 'Server CPU, request latency, video watch-time per minute', 'Business entities jaise users/orders'],
      ['<strong>Search engine</strong>', 'Inverted index: shabd → documents. Full-text, fuzzy, filters, ranking', 'Elasticsearch, OpenSearch', 'Posts ka search, "cricet" likhne pe bhi "cricket"', 'Source of truth ke roop mein; transactions'],
      ['<strong>Vector</strong>', 'Embedding (numbers ki list) → "sabse milte julte" items (nearest neighbour)', 'pgvector, Pinecone, Milvus', '"Aisi aur videos", AI chatbot ke liye documents dhoondhna', 'Exact match ya keyword search (wahan normal index ya search engine)'],
    ]},
    { type: 'callout', tone: 'term', title: 'Bonus family: Columnar warehouse', html: `<strong>Ye kya hai:</strong> analytics (reports) ke liye database, jo data ko row ki jagah <strong>column</strong> ke hisaab se rakhta hai: saari "city" values ek saath, saari "views" values ek saath.<br><strong>Kyun chahiye:</strong> "kal har sheher mein kitne views" jaise sawaal ko billions rows mein se sirf 2 columns padhne hain. Column ek saath hain, to sirf wahi padhe jaate hain, aur ek jaisi values bahut compress hoti hain. Jawab seconds mein.<br><strong>Iske bina:</strong> ye report main Postgres pe chalegi, har row ke saare columns padhegi, minutes lagayegi, aur us dauraan users ki queries dheemi kar degi.<br><strong>Products:</strong> ClickHouse, BigQuery, Snowflake, Amazon Redshift. Ye app ke chhote reads/writes ke liye nahi, sirf reports ke liye hain.` },

    { type: 'h3', text: 'Real systems: polyglot' },
    { type: 'p', html: `Bade systems ek database nahi chunte. Wo kaam ke hisaab se kai databases rakhte hain. Isko <strong>polyglot persistence</strong> kehte hain (polyglot = kai bhashayein bolne wala). Iske liye teen naye words chahiye:` },
    { type: 'callout', tone: 'term', title: 'Naya word: Source of truth', html: `<strong>Ye kya hai:</strong> kisi data ki <em>asli</em> jagah. Baaki sab jagah uski copies hain. Jhagda ho to source of truth jeet-ta hai.<br><strong>Kyun chahiye:</strong> jab ek post Postgres, Elasticsearch aur cache teeno mein ho, to kisi ek ko "asli" maanna padega.<br><strong>Iske bina:</strong> teen jagah teen alag values, aur koi nahi bata sakta kaunsi sahi hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: CDC (Change Data Capture)', html: `<strong>Ye kya hai:</strong> ek tool jo database ki apni "change diary" (Postgres ka WAL, agle lesson mein) padhta hai, aur har insert/update/delete ko ek <strong>event</strong> (sandesh) bana ke <strong>Kafka</strong> mein daal deta hai. Kafka ek lambi, order wali message line hai (Kafka lesson mein detail). Doosre systems wahan se padh ke apni copy update karte hain.<br><strong>Kyun chahiye:</strong> app ko sirf Postgres mein likhna hai. Search index jaisi copies apne aap sync hoti hain.<br><strong>Iske bina:</strong> app ko do jagah likhna padega (<strong>dual write</strong>). Ek write fail hua, to dono copies hamesha ke liye alag.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Eventual consistency', html: `<strong>Ye kya hai:</strong> copy turant nahi, <em>thodi der baad</em> sahi ho jaati hai. Naya post Postgres mein abhi, search mein 1-2 second baad.<br><strong>Kyun chahiye:</strong> copies ko alag (async) update karne se main write fast rehta hai, aur search down ho to bhi post save ho jaata hai.<br><strong>Iske bina:</strong> har write tab tak rukta jab tak saari copies update na ho jaayein. Ek copy down = poori site ke writes down.` },
    { type: 'p', html: `Chala ke dekho:` },
    { type: 'flow', height: 360,
      nodes: [
        { id: 'app', label: 'xyz.com services', x: 100, y: 180, w: 160, kind: 'server', info: 'Ye kya hai: xyz.com ke servers (posts, chat, search features). Alag features alag databases use karte hain, aur service code ko pata hai kaunsa data kahan hai.' },
        { id: 'pg', label: 'PostgreSQL', sub: 'users, posts, coins', x: 345, y: 60, w: 160, kind: 'data', info: 'Ye kya hai: main SQL database. Users, posts, wallets ka source of truth. Transactions aur joins yahin. Default choice.' },
        { id: 'redis', label: 'Redis', sub: 'sessions, counters', x: 345, y: 180, w: 160, kind: 'cache', info: 'Ye kya hai: RAM wala key-value store. Sessions, cache, live counters (unread badge). Bahut fast, lekin source of truth nahi.' },
        { id: 'cass', label: 'Cassandra', sub: 'chat messages', x: 345, y: 300, w: 160, kind: 'data', info: 'Ye kya hai: wide-column store. Bahut saare chhote writes, conversation_id se padhna. Chat messages ka source of truth yahi hai.' },
        { id: 'cdc', label: 'CDC + Kafka', sub: 'change stream', x: 610, y: 60, w: 150, kind: 'queue', info: 'Ye kya hai: Change Data Capture tool + Kafka. Postgres ki change diary (WAL) padh ke har insert/update ko event bana deta hai, taaki copies apne aap sync hon. Kafka lesson mein detail.' },
        { id: 'es', label: 'Elasticsearch', sub: 'search index', x: 610, y: 300, w: 150, kind: 'data', info: 'Ye kya hai: search engine. Posts ki copy, inverted index ke saath. Source of truth nahi: gir jaaye to Postgres se dobara bana sakte hain.' },
      ],
      edges: [{ a: 'app', b: 'pg' }, { a: 'app', b: 'redis' }, { a: 'app', b: 'cass' }, { a: 'app', b: 'es' }, { a: 'pg', b: 'cdc' }, { a: 'cdc', b: 'es' }],
      scenarios: [
        { name: 'Naya post', steps: [
          { title: 'Post Postgres mein', go: ['app>pg', 'res:pg>app'], text: 'Source of truth mein transaction ke saath save.', msg: 'INSERT INTO posts (...) VALUES (...)' },
          { title: 'Change stream', go: 'evt:pg>cdc', text: 'CDC ne Postgres ke log se naya row pakda aur event banaya. App ko Elasticsearch mein alag se likhne ki zaroorat nahi (dual write ka jhanjhat nahi).' },
          { title: 'Search index update', go: 'evt:cdc>es', text: 'Indexer ne post ko Elasticsearch mein daala. Kuch second baad search mein dikhega (eventual consistency).', after: { es: { state: 'ok', sub: 'post indexed' } } },
        ]},
        { name: 'Search', steps: [
          { title: 'Search query', go: ['app>es', 'res:es>app'], text: '"cricet highlights" (spelling galat). Search engine fuzzy match karke "cricket" wale posts deta hai. Postgres ke LIKE se ye na fast hota, na itna smart.', msg: 'GET /posts/_search { "match": { "title": { "query": "cricet highlights", "fuzziness": "AUTO" } } }' },
          { title: 'Details source of truth se', go: ['app>pg', 'res:pg>app'], text: 'Search ne IDs diye; zaroorat ho to taaza details (likes, deleted?) Postgres/cache se.' },
        ]},
        { name: 'Chat message', steps: [
          { title: 'Message Cassandra mein', go: ['app>cass', 'res:cass>app'], text: 'Har second hazaaron messages. Cassandra append-style writes bahut tez karta hai (agla lesson: LSM tree).', msg: 'INSERT INTO messages (conversation_id, sent_at, sender, body) VALUES (...)' },
          { title: 'Unread count Redis mein', go: ['app>redis', 'res:redis>app'], text: 'Badge ka count Redis ke atomic counter mein.', msg: 'INCR unread:user:42' },
        ]},
        { name: 'Search index peeche / down', intro: 'Elasticsearch cluster restart ho raha hai.', steps: [
          { title: 'Post phir bhi save', go: ['app>pg', 'res:pg>app', 'evt:pg>cdc'], text: 'Source of truth theek hai, to koi data nahi khoya.' },
          { title: 'Indexing ruk gayi', go: 'lost:cdc>es', set: { es: { state: 'down', sub: 'DOWN' } }, text: 'Events Kafka mein jama ho rahe hain. Search mein naye posts nahi dikhte (degraded), baaki site chalu.', after: { cdc: { state: 'warn', sub: 'backlog badh raha' } } },
          { title: 'Wapas aane pe catch-up', go: 'evt:cdc>es', set: { es: { state: '', sub: 'catching up' } }, text: 'Indexer backlog se replay karke index ko pakad leta hai. Agar index poora kharab ho jaaye to Postgres se dobara bana lo. Isliye search engine ko source of truth nahi banate.', after: { cdc: { state: '', sub: 'change stream' }, es: { state: 'ok', sub: 'in sync' } } },
        ]},
      ],
    },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "SQL scale nahi karta"', html: `SQL databases bahut door tak scale karte hain: indexes (agla lesson), caching, read replicas (data ki padhne wali copies) aur sharding (data ko kai machines mein baantna; tools: Vitess, Citus). In sab ke apne lessons aage hain. YouTube ka metadata sharded MySQL pe chala (Vitess wahin bana). NoSQL ka asli faayda "scale" nahi, balki ek <em>khaas</em> access pattern ke liye built-in partitioning aur predictable performance hai, aur iski keemat hai kam flexible queries. Aur "schemaless" ka matlab schema nahi hai aisa nahi: schema ab tumhare app code mein hai.` },

    { type: 'h2', text: 'Normalization vs denormalization' },
    { type: 'callout', tone: 'term', title: 'Naye words: Normalization aur denormalization', html: `<strong>Ye kya hai:</strong> <strong>Normalization</strong> = har fact sirf ek jagah store karo (author ka naam sirf users table mein, posts mein sirf user_id). <strong>Denormalization</strong> = padhne ki speed ke liye data ki copies jaan-boojh ke rakho (har post ke saath author_name bhi).<br><strong>Kyun chahiye:</strong> normalization writes ko aasaan aur sahi rakhta hai (naam badla to ek jagah). Denormalization reads ko fast karta hai (join nahi).<br><strong>Iske bina (dono mein se kuch soche bina):</strong> ya to har jagah copies (badalna mushkil, data bemel), ya bade scale pe har read pe mehenge joins.` },
    { type: 'p', html: `Normalization ke kuch formal niyam hain jinhe <strong>normal forms</strong> kehte hain. Seedhe shabdon mein: <strong>1NF</strong> = ek cell mein ek hi value (comma wali list nahi). <strong>2NF/3NF</strong> = har column sirf apni table ki key ke baare mein ho; author ka naam post ke baare mein nahi, user ke baare mein hai, to wo users table mein jaayega. Interview mein itna bolna kaafi hai: "3NF tak normalize karo, phir measure karke jahan zaroori ho wahan denormalize."` },
    { type: 'p', html: `Khud try karo. Ek hi data, do designs. Do kaam karke dekho:` },
    { type: 'custom', render(el) {
      const users = [[42, 'Riya'], [7, 'Aman'], [9, 'Kabir']];
      const posts = [[101, 42, 'Mumbai rains'], [102, 7, 'Cricket'], [103, 42, 'DSA notes'], [104, 9, 'Guitar'], [105, 42, 'Trip vlog'], [106, 7, 'Memes']];
      let mode = 'norm', act = null, renamed = false, failHalf = false;
      el.innerHTML = `<div class="nd-m" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">
          <button type="button" class="btn small nd-feed">Feed dikhao (post + author naam)</button>
          <button type="button" class="btn small nd-ren">Riya ne naam badla: "Riya S"</button>
          <button type="button" class="btn small ghost nd-crash">Rename beech mein crash</button>
          <button type="button" class="btn small ghost nd-reset">Reset</button>
        </div>
        <div class="nd-t" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-top:12px;font-size:13px"></div>
        <div class="stats"><div class="stat"><span>Tables padhi</span><strong class="nd-r"></strong></div><div class="stat"><span>Rows likhi</span><strong class="nd-w"></strong></div></div>
        <div class="nd-n calc-note"></div>`;
      const q = s => el.querySelector(s);
      const cell = (txt, hi) => `<td style="padding:3px 6px;border-top:1px solid var(--line);${hi ? 'background:var(--accent-soft);font-weight:700' : ''}">${txt}</td>`;
      const tbl = (title, head, rows) => `<div style="overflow-x:auto"><div style="font:700 14px var(--f-display);margin-bottom:4px">${title}</div><table style="border-collapse:collapse;width:100%"><tr>${head.map(h => `<th style="text-align:left;padding:3px 6px;color:var(--ink-3)">${h}</th>`).join('')}</tr>${rows.join('')}</table></div>`;
      const draw = () => {
        q('.nd-m').innerHTML = '';
        [['norm', 'Normalized'], ['denorm', 'Denormalized']].forEach(([k, t]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (mode === k ? ' on' : ''); b.textContent = t; b.onclick = () => { mode = k; act = null; renamed = false; failHalf = false; draw(); }; q('.nd-m').appendChild(b); });
        const uname = id => (id === 42 && renamed) ? 'Riya S' : users.find(u => u[0] === id)[1];
        let n = 0;
        const uRows = users.map(u => `<tr>${cell(u[0])}${cell(uname(u[0]), u[0] === 42 && renamed)}</tr>`);
        let pRows;
        if (mode === 'norm') {
          pRows = posts.map(p => `<tr>${cell(p[0])}${cell(p[1])}${cell(p[2])}</tr>`);
          q('.nd-t').innerHTML = tbl('users', ['id', 'name'], uRows) + tbl('posts', ['id', 'user_id', 'title'], pRows);
        } else {
          pRows = posts.map(p => {
            let nm = users.find(u => u[0] === p[1])[1], hi = false;
            if (p[1] === 42 && renamed) { n++; const ok = !failHalf || n <= 1; if (ok) { nm = 'Riya S'; hi = true; } }
            return `<tr>${cell(p[0])}${cell(p[2])}${cell(nm, hi)}</tr>`;
          });
          q('.nd-t').innerHTML = tbl('users', ['id', 'name'], uRows) + tbl('posts', ['id', 'title', 'author_name (copy)'], pRows);
        }
        const riyaPosts = posts.filter(p => p[1] === 42).length;
        let r = '-', w = '-', note = 'Ek kaam chuno.';
        if (act === 'feed') {
          r = mode === 'norm' ? '2 (join)' : '1 (koi join nahi)'; w = '0';
          note = mode === 'norm' ? 'Feed ke liye posts aur users ko join karna pada. Chhote scale pe ye bilkul theek hai; bahut bade scale pe har feed load pe join mehenga ho sakta hai.' : 'Naam post ke saath hi pada hai, ek hi table padhi. Isliye bade feeds, NoSQL documents aur caches mein denormalization common hai.';
        } else if (act === 'ren') {
          r = '-'; w = mode === 'norm' ? '1' : String(1 + riyaPosts);
          note = mode === 'norm' ? 'Sirf users table ki 1 row. Har jagah naya naam apne aap dikhega, kyunki naam ek hi jagah hai.' : `users ki 1 row + Riya ke ${riyaPosts} posts ki copies = ${1 + riyaPosts} rows. Agar Riya ke 30,000 posts hote to 30,001 writes. Aur ek bhi chhoot gaya to purana naam dikhega.`;
        } else if (act === 'crash') {
          w = mode === 'norm' ? '1' : `2 of ${1 + riyaPosts}`;
          note = mode === 'norm' ? 'Normalized mein ek hi row thi, to "aadha update" jaisa kuch hai hi nahi.' : 'Users aur ek post update hue, phir crash. Ab kuch posts pe "Riya", kuch pe "Riya S". Data inconsistent. Fix: copies ko ek transaction mein badlo (agar ek database mein hain), ya background job/event se baar baar sync karo aur thodi der ki gadbad accept karo.';
        }
        q('.nd-r').textContent = r; q('.nd-w').textContent = w; q('.nd-n').textContent = note;
      };
      q('.nd-feed').onclick = () => { act = 'feed'; draw(); };
      q('.nd-ren').onclick = () => { act = 'ren'; renamed = true; failHalf = false; draw(); };
      q('.nd-crash').onclick = () => { act = 'crash'; renamed = true; failHalf = true; draw(); };
      q('.nd-reset').onclick = () => { act = null; renamed = false; failHalf = false; draw(); };
      draw();
    }},
    { type: 'p', html: `Rule of thumb: <strong>shuru normalized se</strong> karo (sahi data). Jab koi read path sach mein slow ho aur measure kar liya ho, tab sirf usi ke liye denormalize karo (ek extra column, ek precomputed table, ya ek cache), aur tay karo ki copies kaise sync hongi.` },

    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Default rule', html: `<strong>PostgreSQL ya MySQL se shuru karo</strong>, jab tak koi <em>thos</em> wajah na ho. Ye transactions, joins, constraints, indexes, JSON columns, aur extensions (pgvector, TimescaleDB, full-text search) sab dete hain, aur sabse flexible hain jab access patterns abhi saaf nahi. Specialised database tab jodo jab ek specific access pattern ki zaroorat saaf dikhe.` },
    { type: 'table', head: ['Requirement mein signal', 'Lean towards'], caption: 'Roadmap ki "SQL or NoSQL?" table', rows: [
      ['Paise, inventory, bookings: kuch bhi jo double-count nahi hona chahiye', 'SQL (ACID transactions)'],
      ['Data mein relationships hain aur kai tarah se query hoga', 'SQL'],
      ['Access pattern abhi saaf nahi, early product', 'SQL; sabse flexible'],
      ['Bahut zyada writes, key se simple access (chat, events, IoT, location history)', 'Wide-column: Cassandra, ScyllaDB, Bigtable'],
      ['Huge scale pe simple get/put, predictable latency (sessions, cart, settings)', 'Key-value: DynamoDB, Redis'],
      ['Flexible, nested, alag alag schema, ek blob ki tarah padha jaaye (catalog, CMS)', 'Document: MongoDB, Firestore'],
      ['Multi-hop relationship queries (friends of friends, fraud rings)', 'Graph: Neo4j, Neptune'],
      ['Metrics aur time-stamped measurements', 'Time-series: Prometheus, InfluxDB, TimescaleDB'],
      ['Full-text, fuzzy ya faceted search', 'Elasticsearch / OpenSearch, main DB ke saath'],
      ['AI aur recommendations ke liye "milta julta matlab"', 'Vector: pgvector, Pinecone, Milvus'],
      ['Billions rows pe analytics', 'Columnar warehouse: ClickHouse, BigQuery, Snowflake'],
      ['Files, images, video', 'Object storage (S3, GCS); metadata DB mein'],
    ]},

    { type: 'diagram', title: 'xyz.com ka data: poori picture', height: 480,
      groups: [
        { label: 'Online stores', x: 14, y: 236, w: 692, h: 92 },
        { label: 'Async copies + analytics', x: 10, y: 362, w: 600, h: 96 },
      ],
      nodes: [
        { id: 'users', label: 'Users', sub: 'app / browser', x: 360, y: 50, w: 150, kind: 'client', info: 'Ye kya hai: xyz.com ke users, phone app ya browser se. Unhe database se matlab nahi; bas tip turant pahunche, chat tez khule, search sahi mile.' },
        { id: 'app', label: 'xyz.com services', sub: 'API servers', x: 360, y: 160, w: 180, kind: 'server', info: 'Ye kya hai: xyz.com ke servers. Har feature apne access pattern ke hisaab se sahi database se baat karta hai. Code ko pata hai kaunsa data kahan rehta hai.' },
        { id: 'ts', label: 'Prometheus', sub: 'metrics', x: 100, y: 160, kind: 'data', info: 'Ye kya hai: time-series database. Servers har kuch second pe CPU, latency jaise numbers yahan bhejte hain. Dashboards aur alerts isi se. Purana data apne aap hat jaata hai.' },
        { id: 'graph', label: 'Neo4j', sub: 'follow graph', x: 620, y: 160, kind: 'data', info: 'Ye kya hai: graph database. Kaun kisko follow karta hai, rishton ka jaal. "Aapke liye suggested creators" (dost ke dost) yahan se. Chhote scale pe ye kaam Postgres bhi kar leta.' },
        { id: 's3', label: 'Object storage', sub: 'videos (S3)', x: 620, y: 50, kind: 'data', info: 'Ye kya hai: badi files (videos, images) ki jagah. Database mein sirf file ka pata (URL) aur details; file khud yahan. Storage lesson mein detail.' },
        { id: 'redis', label: 'Redis', sub: 'sessions, cache', x: 80, y: 290, w: 118, kind: 'cache', info: 'Ye kya hai: key-value store, RAM mein. Sessions, cache, unread counters, rate limits. Bahut tez, lekin source of truth nahi.' },
        { id: 'pg', label: 'PostgreSQL', sub: 'source of truth', x: 220, y: 290, w: 118, kind: 'data', info: 'Ye kya hai: relational (SQL) database. Users, posts, follows, wallets. ACID transactions aur joins. xyz.com ka default aur sabse zaroori database.' },
        { id: 'cass', label: 'Cassandra', sub: 'chat messages', x: 360, y: 290, w: 118, kind: 'data', info: 'Ye kya hai: wide-column store. Partition = conversation, andar time se sorted. Lakhon chhote writes per second. Chat ka source of truth.' },
        { id: 'es', label: 'Elasticsearch', sub: 'search copy', x: 500, y: 290, w: 118, kind: 'data', info: 'Ye kya hai: search engine (inverted index). Posts ki copy jo CDC se aati hai. Fuzzy search aur ranking. Kharab ho to Postgres se dobara banao.' },
        { id: 'vec', label: 'Vector DB', sub: 'recommendations', x: 640, y: 290, w: 118, kind: 'data', info: 'Ye kya hai: vector database (jaise pgvector). Har video ka embedding. "Is jaisi aur videos" ke liye nearest neighbours dhoondhta hai.' },
        { id: 'cdc', label: 'CDC + Kafka', sub: 'change events', x: 225, y: 420, w: 130, kind: 'queue', info: 'Ye kya hai: Postgres ki change diary (WAL) padh ke har badlav ko event banata hai. Search, vector aur analytics ki copies isi se sync hoti hain. App ko dual write nahi karna padta.' },
        { id: 'wh', label: 'ClickHouse', sub: 'analytics', x: 74, y: 420, w: 120, kind: 'data', info: 'Ye kya hai: columnar warehouse. "Kal har sheher mein kitne views" jaisi reports billions rows pe seconds mein, bina main Postgres ko dheema kiye.' },
      ],
      edges: [
        { a: 'users', b: 'app', n: 1 },
        { a: 'app', b: 'pg', n: 2 },
        { a: 'app', b: 'redis' },
        { a: 'app', b: 'cass' },
        { a: 'app', b: 'es' },
        { a: 'app', b: 'vec' },
        { a: 'app', b: 'ts', dashed: true, label: 'metrics' },
        { a: 'app', b: 'graph', label: 'suggest' },
        { a: 'app', b: 's3', dashed: true, label: 'videos' },
        { a: 'pg', b: 'cdc', kind: 'evt', n: 3 },
        { a: 'cdc', b: 'es', kind: 'evt', label: 'index' },
        { a: 'cdc', b: 'vec', kind: 'evt', label: 'embeddings', via: [[560, 420]] },
        { a: 'cdc', b: 'wh', kind: 'evt' },
      ],
      paths: [
        { name: 'Tip (paise)', text: 'Coins ka transfer Postgres ki ek ACID transaction mein: debit aur credit ek saath, ya kuch nahi.', go: ['users>app>pg'] },
        { name: 'Chat message', text: 'Message Cassandra mein (conversation partition), unread badge Redis ke counter mein.', go: ['users>app>cass', 'app>redis'] },
        { name: 'Naya post → search', text: 'Post Postgres mein save. CDC ne badlav pakda aur Elasticsearch mein copy daali. 1-2 second baad search mein dikhta hai (eventual consistency).', go: ['users>app>pg>cdc>es', 'app>es'] },
        { name: 'Recommendations', text: 'Naye videos ke embeddings CDC pipeline se vector DB mein. App "is jaisi aur" nearest neighbours se laata hai.', go: ['pg>cdc>vec', 'users>app>vec'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Database brand se nahi, <strong>access pattern</strong> se chuno: data kaise padha aur likha jaayega.</li>
      <li>Default: <strong>PostgreSQL ya MySQL</strong>. Transactions, joins, constraints, aur sabse flexible.</li>
      <li><strong>ACID</strong>: Atomicity (sab ya kuch nahi), Consistency (niyam nahi tootte), Isolation (saath chalti transactions ek doosre ka adhoora kaam nahi dekhtin), Durability (OK ke baad crash se bhi bacha).</li>
      <li>Isolation levels: Read Committed (Postgres default) aur Repeatable Read (MySQL default) mein bhi lost update / write skew ho sakte hain. Atomic UPDATE, <code>FOR UPDATE</code> ya Serializable + retry.</li>
      <li>NoSQL family: key-value (ID se), document (nested JSON), wide-column (bahut writes, key se), graph (rishte), time-series (metrics), search (shabd), vector (matlab).</li>
      <li>Real systems polyglot hain, lekin har data ka <strong>ek source of truth</strong>; copies CDC se sync, thodi der baad (eventual consistency).</li>
      <li>Shuru normalized se. Denormalize sirf measure karke, aur copies sync karne ka plan ke saath.</li>
    </ul>` },
    { type: 'tradeoffs', gains: [
      'SQL: transactions, constraints, joins, flexible queries; ek default jo saalon chalta hai',
      'Sahi isolation + atomic updates se paise/bookings jaise data mein races band',
      'NoSQL: ek khaas access pattern ke liye huge scale, built-in partitioning, predictable latency',
      'Polyglot: har feature ko uske hisaab ka tool',
    ], costs: [
      'Zyada isolation = zyada locks/waits ya errors, aur retry logic likhna',
      'NoSQL mein ad-hoc queries aur joins mushkil; query pehle se design karni padti hai',
      'Denormalized copies sync rakhna ek naya kaam aur bugs ka source',
      'Har extra database = extra operations, monitoring, on-call aur sync pipelines',
    ]},
    { type: 'think', questions: [
      { q: 'xyz.com pe "like" button: ek user ek post ko ek hi baar like kar sake, aur count sahi rahe. Lost update aur duplicate kaise rokoge?', a: 'likes table mein (user_id, post_id) pe UNIQUE constraint: duplicate like database hi rok dega. Count ke liye UPDATE posts SET likes = likes + 1 (atomic), app mein read-then-write nahi. Bahut zyada traffic pe count ko Redis mein INCR karke batch mein flush karo (write-back), aur likes table ko source of truth rakho.' },
      { q: 'Ek teammate kehta hai "Chat ke liye MongoDB, users ke liye Cassandra, search ke liye Postgres." Kya sawaal poochhoge?', a: 'Har ek ka access pattern kya hai? Users relational hain (profiles, follows, payments) → SQL natural. Chat bahut write-heavy aur conversation se padha jaata hai → wide-column fit. Search ke liye Postgres full-text chhote scale pe chal jaata hai, lekin fuzzy/ranking/bade scale pe Elasticsearch. Aur source of truth kaun hai, copies kaise sync hongi?' },
      { q: 'Postgres Read Committed pe ek "seat booking" mein do log ek hi seat book kar le rahe hain. Teen fixes batao.', a: '1) SELECT ... FOR UPDATE se seat row lock karo. 2) Conditional atomic update: UPDATE seats SET booked_by = 42 WHERE id = 7 AND booked_by IS NULL, aur dekho kitni rows badli (0 = kisi aur ne le li). 3) Us transaction ko Serializable pe chalao aur serialization error pe retry. (Bonus: UNIQUE constraint on (show_id, seat_no) bookings table mein.)' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Coins transfer mein debit ke baad aur credit se pehle crash. Kaunsi property bachaati hai?', options: ['Isolation', 'Atomicity', 'Durability'], answer: 1, explain: 'Atomicity: transaction ya to poori, ya bilkul nahi. Adhoori transaction rollback.' },
      { q: 'PostgreSQL aur MySQL InnoDB ke default isolation levels?', options: ['Dono Serializable', 'Postgres: Read Committed, MySQL: Repeatable Read', 'Postgres: Repeatable Read, MySQL: Read Committed'], answer: 1, explain: 'Docs ke hisaab se Postgres default Read Committed, InnoDB default Repeatable Read.' },
      { q: 'Do moderators ne alag alag rows update karke rule tod diya (0 on-duty). Ye kaunsi anomaly hai, aur kaunsa level ise rokta hai?', options: ['Dirty read; Read Committed', 'Write skew; Serializable', 'Phantom; Read Uncommitted'], answer: 1, explain: 'Write skew: dono ne same data padha, alag rows likhi. Repeatable Read/snapshot bhi ise nahi rokta; Serializable (ya explicit locks) chahiye.' },
      { q: 'Chat app: har second lakhon messages, padhna hamesha "is conversation ke latest messages". Sabse natural fit?', options: ['Graph DB', 'Wide-column (Cassandra/ScyllaDB)', 'Columnar warehouse'], answer: 1, explain: 'Partition = conversation, clustering = time. Write-heavy, key se access.' },
      { q: 'Search ke liye Elasticsearch use kar rahe ho. Source of truth kahan hona chahiye?', options: ['Elasticsearch mein', 'Main database (jaise Postgres) mein, ES uski copy', 'Redis mein'], answer: 1, explain: 'Search index ek derived copy hai jo CDC se sync hoti hai. Kharab ho to source of truth se dobara bana lo.' },
      { q: 'App ko "Tip bhej di" dikha, phir turant bijli gayi. Restart ke baad bhi tip honi chahiye. Ye ACID ka kaunsa letter hai?', options: ['Atomicity', 'Consistency', 'Durability'], answer: 2, explain: 'Durability: COMMIT ka OK mil gaya, to data crash ke baad bhi rehna chahiye. Database ye write-ahead log se karta hai (agla lesson).' },
      { q: 'xyz.com chahta hai "is video jaisi aur videos" dikhana, chahe title ke shabd alag hon. Kaunsi family?', options: ['Search engine (keywords)', 'Vector database (embeddings)', 'Time-series'], answer: 1, explain: 'Matlab se milti julti cheezein = embeddings ke nearest neighbours. Keyword search alag shabdon wale milte julte videos miss kar dega.' },
      { q: '"Riya ke dost ke dost jo uske dost nahi hain" bahut bade scale pe, roz kai baar. Kaunsa tool sabse natural hai?', options: ['Graph database', 'Key-value store', 'Columnar warehouse'], answer: 0, explain: 'Multi-hop rishte graph DB ka asli kaam hai. Chhote scale pe Postgres ke self-joins bhi chal jaate hain.' },
    ]},
    { type: 'sources', note: 'Isolation behaviour aur defaults inhi se check kiye gaye.', items: [
      { title: 'Transaction Isolation', publisher: 'PostgreSQL documentation', official: true, url: 'https://www.postgresql.org/docs/current/transaction-iso.html', used: 'Default Read Committed; Read Uncommitted behaves as Read Committed; Repeatable Read has no phantoms and raises serialization errors on concurrent update; Serializable via SSI.' },
      { title: 'Transaction Isolation Levels (InnoDB)', publisher: 'MySQL 8.4 Reference Manual', official: true, url: 'https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html', used: 'Default Repeatable Read; consistent snapshot reads; next-key/gap locks; Serializable converts plain SELECT to FOR SHARE.' },
      { title: 'Hermitage: testing transaction isolation levels', publisher: 'Martin Kleppmann (GitHub)', url: 'https://github.com/ept/hermitage', used: 'Which anomalies (lost update P4, write skew G2-item, phantoms) each Postgres/MySQL level actually prevents.' },
      { title: 'pgvector: open-source vector similarity search for Postgres', publisher: 'pgvector (GitHub)', official: true, url: 'https://github.com/pgvector/pgvector', used: 'Vector search inside Postgres; HNSW and IVFFlat approximate indexes; L2, inner product and cosine distance.' },
      { title: 'Storage', publisher: 'Prometheus documentation', official: true, url: 'https://prometheus.io/docs/prometheus/latest/storage/', used: 'Time-series storage in two-hour blocks with a WAL, about 1-2 bytes per sample, default retention 15 days.' },
      { title: 'How Discord Stores Trillions of Messages', publisher: 'Discord engineering blog (2023)', official: true, url: 'https://discord.com/blog/how-discord-stores-trillions-of-messages', used: 'Messages in a wide-column store, Cassandra to ScyllaDB migration.' },
    ]},
  ],
});
