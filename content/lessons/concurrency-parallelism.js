Lesson.register({
  id: 'concurrency-parallelism',
  title: 'Concurrency vs parallelism',
  minutes: 25,
  summary: `Concurrency = bahut saare kaam ek saath <em>sambhalna</em>. Parallelism = bahut saare kaam sach mein ek hi pal mein <em>karna</em>. Isi farak se samajh aata hai ki ek 4-core server 4 se kahin zyada requests kaise sambhal leta hai, Node.js ek thread pe kaise chalta hai, Python ka GIL kya hai, race condition se likes kaise gum hote hain, aur 100 cores lagane se bhi kaam 100 guna fast kyun nahi hota.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Socho tum ek chat app pe 5 doston se baat kar rahe ho. Ek dost type kar raha hai to tum uska intezaar nahi karte, doosre ko reply kar dete ho. Tum ek ho, lekin paanchon baatein chal rahi hain. Ye <strong>concurrency</strong> hai.<br>Ab socho tumhare 4 bhai-behen bhi madad kar rahe hain, har ek ek alag chat pe. Ab sach mein 4 kaam ek hi pal mein ho rahe hain. Ye <strong>parallelism</strong> hai.<br>Server bhi yahi karta hai. Is lesson mein dekhenge ki kab kaun sa tareeka kaam aata hai, aur jab kai haath ek hi cheez (jaise likes ki ginti) ko ek saath chhoote hain to galti kaise hoti hai.` },
    { type: 'h2', text: 'Problem: server 90% time khaali baitha hai' },
    { type: 'p', html: `Pichhle lesson mein humne dekha ki server ka <strong>throughput</strong> ek point pe ruk jaata hai. Ab andar jhaanko. xyz.com ka <code>/feed</code> endpoint ek request pe lagbhag ye karta hai:` },
    { type: 'code', text: `
1. Request parse karo, user check karo        ~5 ms   (CPU kaam)
2. Database se posts laao                     ~80 ms  (wait: DB jawab de raha hai)
3. JSON banao, response bhejo                 ~5 ms   (CPU kaam)
                                       total  ~90 ms, jismein CPU sirf ~10 ms busy` },
    { type: 'p', html: `Agar server ek time pe sirf <strong>ek</strong> request le, to wo 80 ms tak haath pe haath rakh ke DB ka intezaar karega. Ek second mein sirf ~11 requests (1000 / 90). CPU ~89% time khaali, aur bahar 500 users line mein. Machine badi karne se (<a href="#/scalability">vertical scaling</a>) bhi kuch nahi hoga: problem CPU ki speed nahi, <strong>intezaar</strong> hai.` },
    { type: 'p', html: `Jawab: jab ek request DB ka wait kar rahi ho, tab CPU doosri request ka kaam kar le. Ye idea hi <strong>concurrency</strong> hai. Aur jab ek se zyada CPU core hon aur sach mein do kaam ek hi pal mein chalen, wo <strong>parallelism</strong>.` },

    { type: 'h2', text: 'Do words, ek bada farak' },
    { type: 'callout', tone: 'term', title: 'Naya word: Concurrency', html: `<strong>Ye kya hai:</strong> ek hi time period mein bahut saare kaam <em>sambhalna</em>, beech beech mein switch karke sabko aage badhana. Zaroori nahi ki koi do kaam ek hi pal mein chal rahe hon. Jaise ek support agent 5 chat windows sambhalta hai: ek customer type kar raha hai, tab tak doosre ko reply. Ek hi insaan, paanch conversations aage badh rahi hain.<br><strong>Kyun chahiye:</strong> web request ka zyaadatar time intezaar (DB, network) mein jaata hai. Concurrency us intezaar mein CPU se doosri request ka kaam karwa leti hai.<br><strong>Iske bina:</strong> upar wala hisaab: CPU ~89% time khaali, aur ek server sirf ~11 requests/second.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Parallelism', html: `<strong>Ye kya hai:</strong> bahut saare kaam sach mein <em>ek hi pal mein</em> chalna. Iske liye hardware chahiye: kai CPU <strong>core</strong> (ek core = CPU ke andar ek alag "dimaag" jo ek time pe ek kaam ki line chalata hai). 5 support agents, har ek apni chat pe: ye parallelism hai.<br><strong>Kyun chahiye:</strong> jis kaam mein intezaar nahi, sirf hisaab hai (video encode, photo resize), wo sirf zyada cores se hi tez hota hai.<br><strong>Iske bina:</strong> 8-core machine pe ek hi core kaam karta hai, 7 khaali baithe rehte hain.` },
    { type: 'compare',
      left: { title: 'Concurrency (1 core)', ascii: `core: [A][B][A][C][B][A][C]
       ek pal mein sirf ek kaam,
       lekin teeno aage badh rahe`, html: `Structure ki baat: program aise likha hai ki kaam todke, interleave karke chalaaye ja sakein.` },
      right: { title: 'Parallelism (3 cores)', ascii: `core1: [A][A][A][A]
core2: [B][B][B][B]
core3: [C][C][C][C]`, html: `Execution ki baat: kaam sach mein ek saath chal rahe hain. Iske liye kai cores chahiye.` },
    },
    { type: 'p', html: `Go language ke co-creator Rob Pike ki ek famous talk ka title hi yahi hai: <em>"Concurrency is not parallelism"</em>. Unki line ka matlab: concurrency kaam ko <em>organise</em> karne ka tareeka hai (dealing with lots of things at once), parallelism unhe <em>ek saath chalaana</em> (doing lots of things at once). Concurrent program ko zyada cores do, to wo parallel bhi chal sakta hai. Lekin 1 core pe bhi concurrency faayda deti hai, agar kaam mein intezaar ho.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "concurrent matlab ek saath chal rahe"', html: `Nahi. 1 core wala purana laptop bhi music, browser aur chat ek saath "chalata" dikhta tha. Asal mein OS har kuch milliseconds mein switch kar raha tha, itna tez ki tumhe sab ek saath lage. Ye concurrency thi, parallelism nahi. Interview mein ye farak saaf bolna bahut points deta hai.` },

    { type: 'h2', text: 'CPU-bound vs I/O-bound: pehle pehchaano kaam kis type ka hai' },
    { type: 'callout', tone: 'term', title: 'Naya word: CPU-bound', html: `<strong>Ye kya hai:</strong> aisa kaam jismein time CPU ke calculations mein jaata hai. CPU tez ho ya zyada cores hon, tabhi ye fast hoga. Example: xyz.com pe upload hui photo ka thumbnail banana, video encode karna, password hash karna (bcrypt), bada JSON parse karna, ML model chalana.<br><strong>Kyun pehchaanna zaroori:</strong> iska ilaaj parallelism hai (zyada cores, zyada processes).<br><strong>Galat pehchaana to:</strong> async ya zyada threads lagaoge aur kuch nahi milega, ulta event loop atak jaayega.` },
    { type: 'callout', tone: 'term', title: 'Naya word: I/O-bound', html: `<strong>Ye kya hai:</strong> aisa kaam jismein zyada time <em>intezaar</em> mein jaata hai: database ka jawab, doosri service ki API call, disk read, network. <strong>I/O</strong> = Input/Output, yaani CPU ke bahar ki duniya se baat. Is wait ke dauraan CPU ko kuch karna hi nahi hota. Most web APIs (xyz.com ka <code>/feed</code>, <code>/profile</code>) I/O-bound hain.<br><strong>Kyun pehchaanna zaroori:</strong> iska ilaaj concurrency hai (async, ya cores se kai guna zyada threads).<br><strong>Galat pehchaana to:</strong> "ek worker per core" rakhoge aur CPU 10% pe baitha rahega, users line mein.` },
    { type: 'table', head: ['', 'CPU-bound', 'I/O-bound'], rows: [
      ['Time kahan jaata hai', 'CPU calculation', 'DB / network / disk ka wait'],
      ['Concurrency (1 core pe interleave) se faayda?', 'Bahut kam', 'Bahut zyada'],
      ['Parallelism (zyada cores) se faayda?', 'Haan, seedha', 'Haan, lekin concurrency sasti padti hai'],
      ['Sahi tool', 'Processes / threads = cores ke barabar', 'Async event loop ya cores se kai guna zyada threads'],
    ]},
    { type: 'p', html: `Padhne se zyada dekhne ki cheez hai. Neeche simulator mein kuch tasks hain. Har task: thoda CPU kaam, phir wait (DB call), phir thoda CPU kaam. Ek grid box = 10 ms. Teen tareeke se chalao aur total time dekho:` },
    { type: 'list', items: [
      `<strong>Sequential, 1 core:</strong> ek task poora khatam, tab agla. Wait ke time core khaali baitha rehta hai (blocking).`,
      `<strong>Concurrent, 1 core:</strong> jaise hi ek task wait mein jaata hai, core doosre task ko utha leta hai.`,
      `<strong>Parallel, 4 cores:</strong> chaar cores, har core bhi concurrent tareeke se kaam karta hai.`,
    ]},
    { type: 'custom', render(el) {
      const PRE = { io: [1, 6, 1], cpu: [6, 1, 1] };
      el.innerHTML = `<div class="chips cpKind" role="group" aria-label="Task type">
          <button type="button" class="chip on" data-k="io">I/O-heavy API (DB calls)</button>
          <button type="button" class="chip" data-k="cpu">CPU-heavy (thumbnail banana)</button>
          <button type="button" class="chip" data-k="mix">Mix (aadhe aadhe)</button></div>
        <label style="margin-top:10px">Kitne tasks (requests): <strong class="cpNv">4</strong></label>
        <input class="cpN" type="range" min="1" max="8" step="1" value="4" aria-label="Number of tasks">
        <div class="cpPanels" style="margin-top:12px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:var(--ink-2);margin-top:6px">
          <span><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:var(--accent);vertical-align:middle"></span> CPU pe chal raha</span>
          <span><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:var(--amber);opacity:.5;vertical-align:middle"></span> wait (DB / network)</span>
          <span><span style="display:inline-block;width:12px;height:12px;border-radius:3px;border:1px dashed var(--ink-3);vertical-align:middle"></span> ready, par core khaali nahi</span></div>
        <div class="stats">
          <div class="stat"><span>Sequential, 1 core</span><strong class="cpS"></strong></div>
          <div class="stat"><span>Concurrent, 1 core</span><strong class="cpC"></strong></div>
          <div class="stat"><span>Parallel, 4 cores</span><strong class="cpP"></strong></div>
        </div>
        <div class="calc-note cpNote"></div>`;
      const mkTasks = (kind, n) => { const out = []; for (let i = 0; i < n; i++) { const k = kind === 'mix' ? (i % 2 ? 'cpu' : 'io') : kind; out.push({ segs: [['c', PRE[k][0]], ['w', PRE[k][1]], ['c', PRE[k][2]]] }); } return out; };
      const seq = tasks => { const rows = tasks.map(() => []); let t = 0, busy = 0; tasks.forEach((tk, i) => { for (let j = 0; j < t; j++) rows[i].push(' '); tk.segs.forEach(([s, d]) => { for (let j = 0; j < d; j++) { rows[i].push(s === 'c' ? 'C' : 'W'); if (s === 'c') busy++; } }); t += tk.segs.reduce((a, x) => a + x[1], 0); }); return { rows, total: t, busy }; };
      const sched = (tasks, K) => {
        const st = tasks.map(tk => ({ si: 0, rem: tk.segs[0][1], core: -1, done: false }));
        const rows = tasks.map(() => []), ready = tasks.map((_, i) => i), free = new Array(K).fill(true);
        let t = 0, busy = 0;
        while (st.some(s => !s.done) && t < 1000) {
          while (ready.length && free.includes(true)) { const i = ready.shift(), c = free.indexOf(true); free[c] = false; st[i].core = c; }
          const enq = [];
          st.forEach((s, i) => {
            if (s.done) { rows[i].push(' '); return; }
            const kind = tasks[i].segs[s.si][0];
            if (kind === 'c' && s.core < 0) { rows[i].push('.'); return; }
            rows[i].push(kind === 'c' ? 'C' : 'W'); if (kind === 'c') busy++;
            if (--s.rem === 0) {
              if (kind === 'c') { free[s.core] = true; s.core = -1; }
              if (++s.si >= tasks[i].segs.length) { s.done = true; return; }
              s.rem = tasks[i].segs[s.si][1];
              if (tasks[i].segs[s.si][0] === 'c') enq.push(i);
            }
          });
          ready.push(...enq); t++;
        }
        return { rows, total: t, busy };
      };
let kind = 'io';
      const panel = (title, res, maxT) => {
        const n = res.rows.length, L = 34, W = 640, cw = (W - L - 6) / maxT, rh = 22, H = n * (rh + 4) + 22;
        let g = '';
        res.rows.forEach((r, i) => {
          const y = i * (rh + 4) + 2;
          g += `<text x="0" y="${y + rh - 6}" font-size="14" fill="var(--ink-3)" font-family="var(--f-mono)">T${i + 1}</text>`;
          r.forEach((c, j) => {
            const x = L + j * cw;
            if (c === 'C') g += `<rect x="${x}" y="${y}" width="${cw - 1}" height="${rh}" rx="2" fill="var(--accent)"/>`;
            else if (c === 'W') g += `<rect x="${x}" y="${y}" width="${cw - 1}" height="${rh}" rx="2" fill="var(--amber)" opacity=".5"/>`;
            else if (c === '.') g += `<rect x="${x + .5}" y="${y + .5}" width="${cw - 2}" height="${rh - 1}" rx="2" fill="none" stroke="var(--ink-3)" stroke-dasharray="2 2"/>`;
          });
        });
        const xe = L + res.total * cw, yb = n * (rh + 4) + 2;
        g += `<line x1="${xe}" y1="0" x2="${xe}" y2="${yb}" stroke="var(--red)" stroke-width="1.5"/>`;
        g += `<text x="${Math.min(xe + 4, W - 70)}" y="${yb + 16}" font-size="14" fill="var(--ink-2)" font-family="var(--f-mono)">${res.total * 10} ms</text>`;
        return `<div style="font-size:13px;font-weight:600;color:var(--ink);margin:10px 0 4px">${title}</div>
          <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" role="img" aria-label="${title}: ${res.total * 10} ms">${g}</svg>`;
      };
      const draw = () => {
        const n = Number(el.querySelector('.cpN').value);
        el.querySelector('.cpNv').textContent = n;
        const T = mkTasks(kind, n), a = seq(T), b = sched(T, 1), c = sched(T, 4);
        const maxT = a.total;
        el.querySelector('.cpPanels').innerHTML =
          panel('Sequential, 1 core (blocking)', a, maxT) +
          panel('Concurrent, 1 core (interleaved)', b, maxT) +
          panel('Parallel, 4 cores', c, maxT);
        const pct = r => Math.round(r.busy / r.total * 100) + '%';
        el.querySelector('.cpS').textContent = a.total * 10 + ' ms';
        el.querySelector('.cpC').textContent = b.total * 10 + ' ms';
        el.querySelector('.cpP').textContent = c.total * 10 + ' ms';
        const x1 = (a.total / b.total).toFixed(1), x4 = (a.total / c.total).toFixed(1);
        let note = `Sequential mein core sirf ${pct(a)} time busy tha, concurrent mein ${pct(b)}. `;
        if (kind === 'io') note += `I/O-heavy kaam: <strong>bina naya core lagaye</strong> concurrency ne ${x1}x speedup diya, kyunki wait ke time core doosra kaam kar raha tha. 4 cores ne ${x4}x diya.`;
        else if (kind === 'cpu') note += `CPU-heavy kaam: concurrency se sirf ${x1}x (bas thode se wait ka faayda). Core pehle se busy hai, interleave karne se kaam kam nahi hota. Yahan asli speedup parallelism se: 4 cores pe ${x4}x.`;
        else note += `Mix: CPU-heavy tasks core pakad ke baithte hain, aur I/O tasks ko ready hone ke baad bhi wait karna padta hai (dashed boxes). Concurrency ${x1}x, 4 cores ${x4}x.`;
        if (n === 1) note = 'Sirf 1 task: teeno tareeke barabar. Concurrency aur parallelism tabhi kaam aate hain jab ek se zyada kaam hon.';
        el.querySelector('.cpNote').innerHTML = note;
      };
      el.querySelectorAll('.cpKind .chip').forEach(b => b.onclick = () => {
        kind = b.dataset.k;
        el.querySelectorAll('.cpKind .chip').forEach(x => x.classList.toggle('on', x === b));
        draw();
      });
      el.querySelector('.cpN').oninput = draw;
      draw();
    }},

    { type: 'p', html: `Default setting (I/O-heavy, 4 tasks) pe numbers: sequential <strong>320 ms</strong>, concurrent 1 core pe <strong>110 ms</strong>, 4 cores pe <strong>80 ms</strong>. Concurrency ne bina ek bhi naya core khareede ~3x fast kar diya. Ab "CPU-heavy" dabao: concurrency sirf 320 → 280 ms, jabki 4 cores 80 ms. <strong>Ye is lesson ka sabse important sabak hai:</strong> I/O-bound kaam ka ilaaj concurrency, CPU-bound kaam ka ilaaj parallelism.` },
    { type: 'callout', tone: 'tip', html: `Simulator mein switch karna "free" dikhaya hai. Asli computer mein har switch ki chhoti si keemat hai (context switch, neeche dekho). Aur ek baat: 8 I/O tasks pe bhi 1 core ka time 160 ms hai, kyunki ab core 100% busy hai. Concurrency wait ko bhar sakti hai, CPU ka kaam kam nahi kar sakti.` },

    { type: 'h2', text: 'Kaam kaun chalata hai: process aur thread' },
    { type: 'p', html: `Theek hai, "core doosra kaam utha le". Lekin OS ko pata kaise chale ki "kaam" kya hai? Iske do unit hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Process', html: `<strong>Ye kya hai:</strong> ek chalta hua program, apni <em>alag memory</em> ke saath. Tum <code>node server.js</code> chalao, ek process bana. Do processes ek doosre ki memory nahi chhoo sakte; OS (operating system: Linux, Windows) unhe deewar se alag rakhta hai.<br><strong>Kyun chahiye:</strong> isolation: ek crash ho jaaye to doosra bacha rehta hai. Aur alag processes alag cores pe sach mein parallel chalte hain.<br><strong>Keemat:</strong> banana mehenga, aur aapas mein baat karni ho to network, pipe ya shared file/DB jaise raaste chahiye.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Thread', html: `<strong>Ye kya hai:</strong> process ke andar ek "execution line". Ek process mein kai threads ho sakte hain, aur sab <em>wahi memory share</em> karte hain. Har thread ka apna stack (local variables) hota hai, par heap (shared objects, jaise likes counter) sabka common.<br><strong>Kyun chahiye:</strong> ek program ke andar kai kaam ek saath, saste mein: naya process banane se kahin halka, aur data share karna tez.<br><strong>Khatra:</strong> isi sharing se race condition paida hoti hai (thodi der mein dekhenge).` },
    { type: 'table', head: ['', 'Process', 'Thread'], rows: [
      ['Memory', 'Alag, isolated', 'Process ke saare threads ke saath shared'],
      ['Banane ka kharcha', 'Zyada (nayi memory space)', 'Kam'],
      ['Ek crash hua to', 'Baaki processes safe', 'Poora process (saare threads) gir sakta hai'],
      ['Aapas mein baat', 'IPC: pipe, socket, queue (slow)', 'Seedha shared variable (tez, par lock chahiye)'],
      ['xyz.com mein example', 'Gunicorn ke 9 worker processes', 'Java/Tomcat server ke 200 request threads'],
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: Context switch', html: `<strong>Ye kya hai:</strong> core ek thread se doosre pe jaaye, to OS ko pehle wale ki "jagah" save karni padti hai (registers, kahan tak chala tha) aur naye ki load karni padti hai. Is badli ko <strong>context switch</strong> kehte hain.<br><strong>Kyun hota hai:</strong> isi se ek core pe kai threads baari baari chal paate hain (concurrency).<br><strong>Keemat:</strong> ek switch kuch microseconds ka, lekin chhupi keemat badi: naye thread ka data CPU cache mein nahi hota, to wo thodi der slow chalta hai. Process-to-process switch thread switch se mehenga hai, kyunki memory ka naksha (address space) bhi badalta hai.` },
    { type: 'p', html: `OS ka <strong>scheduler</strong> decide karta hai ki kaunsa thread kab, kis core pe chale. Do moke pe switch hota hai: (1) thread khud ruk gaya (DB/network ka wait, lock ka wait), ya (2) uska time slice khatam ho gaya aur OS ne zabardasti hata diya (<strong>preemption</strong>), taaki ek thread core pe kabza na kar le.` },
    { type: 'callout', tone: 'warn', title: 'Toh 10,000 threads bana do?', html: `Purana tareeka tha "har request ke liye ek thread". 10,000 users = 10,000 threads. Problem: har thread ka stack memory leta hai (Linux pe default stack size aksar 8 MB reserve hota hai, asli use kam, par phir bhi), aur hazaaron threads ke beech scheduler itna switch karta hai ki CPU ka bada hissa "switching" mein hi chala jaata hai. Isi ko 2000s mein <strong>C10K problem</strong> kaha gaya: ek server pe 10,000 connections kaise sambhalein. Iske do jawab nikle: <strong>thread pools</strong> aur <strong>event loop</strong>.` },

    { type: 'h2', text: 'Async I/O aur event loop (Node.js ka tareeka)' },
    { type: 'p', html: `Idea: thread ko wait karne hi mat do. Jab code DB ko query bheje, wo <em>ruke nahi</em>, bas bole "jawab aaye to ye function chala dena" aur agle kaam pe chala jaaye. Isko <strong>non-blocking</strong> ya <strong>async I/O</strong> kehte hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Event loop', html: `<strong>Ye kya hai:</strong> ek single thread jo ek loop mein ghoomta rehta hai: "kaunsa kaam ready hai? (koi naya request aaya, kisi DB call ka jawab aaya, koi timer poora hua)". Ready kaam ka <strong>callback</strong> (jo function baad mein chalana tha) chalata hai, phir agla. Saare connections pe nazar OS rakhta hai (Linux pe <code>epoll</code>, Mac pe <code>kqueue</code>), aur jo ready ho uski khabar loop ko deta hai.<br><strong>Kyun chahiye:</strong> ek hi thread hazaaron connections sambhal leta hai, har connection ke liye alag thread ki memory nahi lagti.<br><strong>Iske bina:</strong> har connection ka ek thread: 10,000 users = 10,000 threads (upar wali C10K problem).` },
    { type: 'ascii', text: `            ┌──────────── Event loop (1 JS thread) ────────────┐
 request 1 →│ parse (2ms) → db.query(...) ──┐ (wait nahi kiya)  │
 request 2 →│ parse (2ms) → db.query(...) ──┤                  │
 request 3 →│ parse (2ms) → db.query(...) ──┤                  │
            │      ... DB jawab dene laga ...│                  │
            │ callback 2: JSON bhejo ←───────┘                  │
            │ callback 1: JSON bhejo                            │
            └───────────────────────────────────────────────────┘
  Ek thread, hazaaron open connections. Jab tak kaam chhote CPU tukde hain.`, caption: 'Node.js ek JavaScript thread pe hazaaron concurrent requests aise sambhalta hai.' },
    { type: 'p', html: `Node.js mein ye kaam <strong>libuv</strong> naam ki C library karti hai. Network I/O ke liye wo seedha OS ka async mechanism use karti hai. Jo kaam OS async nahi de sakta (zyaadatar file system calls, <code>dns.lookup</code>, aur kuch bhaari <code>crypto</code> aur <code>zlib</code> kaam), unke liye libuv ka ek chhota <strong>thread pool</strong> hai, jiska default size <strong>4</strong> hai (env variable <code>UV_THREADPOOL_SIZE</code> se badal sakte ho, max 1024). Matlab "Node single-threaded hai" poora sach nahi: <em>tumhara JavaScript</em> ek thread pe chalta hai.` },
    { type: 'callout', tone: 'warn', title: 'Event loop ka kamzor point: CPU kaam', html: `Ek hi thread hai, to agar ek request ne 2 second ka CPU kaam kiya (bada JSON parse, image resize, galat likha regex), to us 2 second <strong>saare</strong> users atak jaate hain. Simulator ka "Mix" mode yaad karo: CPU-heavy task core pakad ke baitha tha. Isliye Node ki official guide kehti hai: <em>event loop ko block mat karo</em>. CPU kaam ko <code>worker_threads</code>, alag process ya alag service (queue ke peeche) mein bhejo.` },
    { type: 'p', html: `Aur parallelism? Ek Node process sirf ek core pe JavaScript chalata hai. 8-core machine ka poora use karne ke liye 8 Node processes chalate hain (Node ka <code>cluster</code> module, PM2, ya Kubernetes mein kai chhote pods), aur aage load balancer. Yahi pattern Python ke <code>asyncio</code>, Nginx, Redis (mainly single-threaded command execution) mein bhi dikhta hai.` },

    { type: 'h2', text: "Python ka GIL: threads hain, par ek time pe ek hi" },
    { type: 'callout', tone: 'term', title: 'Naya word: GIL (Global Interpreter Lock)', html: `<strong>Ye kya hai:</strong> standard Python (CPython) ke andar ek global lock. Rule: ek process mein, ek pal mein, sirf <strong>ek thread</strong> Python bytecode chala sakta hai.<br><strong>Kyun bana:</strong> CPython ki memory management ko simple aur safe rakhne ke liye.<br><strong>Iska asar:</strong> 8 threads, 8 cores, phir bhi pure-Python CPU kaam lagbhag 1 core jitna hi fast.` },
    { type: 'list', items: [
      `<strong>I/O-bound kaam pe GIL zyada nahi chubhta:</strong> jab thread DB/network ka wait karta hai, wo GIL chhod deta hai, aur doosra thread chal leta hai. Isliye Python mein I/O ke liye threads ya <code>asyncio</code> theek kaam karte hain.`,
      `<strong>CPU-bound kaam ke liye:</strong> <code>multiprocessing</code> / <code>ProcessPoolExecutor</code> (har process ka apna GIL, to sach mein parallel), ya aisi C libraries (jaise NumPy) jo bhaari maths ke dauraan GIL chhod deti hain.`,
      `<strong>Web servers:</strong> isiliye Django/Flask apps Gunicorn ke kai worker <em>processes</em> mein chalte hain, threads mein nahi.`,
    ]},
    { type: 'callout', tone: 'why', title: 'GIL ab hat raha hai (dheere dheere)', html: `<strong>PEP 703</strong> ne GIL ko optional banane ka plan diya. <strong>Python 3.13</strong> (2024) mein pehli baar ek alag <strong>free-threaded build</strong> aaya (experimental), jise <code>python3.13t</code> jaise naam se chalate hain. <strong>PEP 779</strong> (June 2025 mein accept hua) ke baad <strong>Python 3.14</strong> mein ye build "officially supported" hai, experimental nahi. Lekin dhyan do: ye abhi bhi <em>optional, alag build</em> hai. Normal <code>python3</code> download mein GIL ab bhi ON hai. Free-threaded build mein single-thread code thoda slow hota hai (Python docs ke hisaab se platform ke mutabik ~1-8%), aur har C extension library abhi tayaar nahi. Interview mein ye bolna: "default CPython mein GIL hai; 3.13+ mein optional free-threaded build hai, 3.14 se officially supported".` },

    { type: 'h2', text: 'Naya problem: likes gum ho rahe hain (race condition)' },
    { type: 'p', html: `Concurrency ne speed di, lekin ek naya bug laayi. xyz.com ka Java server har request ek alag thread pe chalata hai, aur ek popular post ka like counter memory mein rakhta hai. Code bilkul seedha dikhta hai:` },
    { type: 'code', text: `likes = likes + 1      // ek line, lekin CPU ke liye teen kadam:
  1. READ   likes ko memory se padho        (100)
  2. ADD    usmein 1 jodo                    (101)
  3. WRITE  wapas memory mein likho          (101)` },
    { type: 'p', html: `Agar do threads in teen kadamon ko <em>beech mein</em> mila dein (dono ne 100 padha, phir dono ne 101 likha), to do likes aaye aur counter sirf 1 badha. Ise <strong>lost update</strong> kehte hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Race condition', html: `<strong>Ye kya hai:</strong> jab result is baat pe depend kare ki threads kis order mein chale ("kaun race jeeta"). Code 1,000 baar sahi chalta hai, 1,001vi baar galat, aur test pe kabhi pakad mein nahi aata. Jis code ke hisse mein shared data padha-likha jaata hai use <strong>critical section</strong> kehte hain.<br><strong>Kyun khatarnaak:</strong> koi error nahi, koi crash nahi: chupchaap galat data (likes gum, paisa do baar kata).<br><strong>Kab hota hai:</strong> jab do threads ek hi data ko bina rok-tok padhte aur likhte hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Mutex / Lock', html: `<strong>Ye kya hai:</strong> <strong>mutex</strong> (mutual exclusion) ya <strong>lock</strong> ek token hai jo ek time pe sirf ek thread ke paas ho sakta hai. Critical section mein ghusne se pehle lock lo, nikalte waqt chhodo. Doosra thread lock maangega to tab tak rukega jab tak pehla chhod na de. Java mein <code>synchronized</code>, Python mein <code>threading.Lock()</code>, Go mein <code>sync.Mutex</code>.<br><strong>Kyun chahiye:</strong> READ-ADD-WRITE ke beech koi doosra thread na ghuse.<br><strong>Iske bina:</strong> lost updates. <strong>Keemat:</strong> baaki threads ko line mein rukna padta hai.` },
    { type: 'flow', height: 300, title: 'Do threads, ek likes counter',
      nodes: [
        { id: 'r', label: 'Riya', sub: 'like dabaya', x: 90, y: 60, w: 140, kind: 'client', info: 'Ye kya hai: xyz.com ki user Riya. Usne post pe like dabaya. Uski request server ke Thread A ko mili.' },
        { id: 'a', label: 'Aman', sub: 'like dabaya', x: 90, y: 240, w: 140, kind: 'client', info: 'Ye kya hai: doosra user, Aman. Usne lagbhag usi millisecond mein like dabaya. Uski request Thread B ko mili.' },
        { id: 't1', label: 'Thread A', x: 300, y: 60, w: 150, kind: 'server', info: 'Ye kya hai: server process ke andar ek thread (kaam karne ki ek line). Iska apna stack hai (local variable <code>tmp</code>), lekin likes counter shared heap memory mein hai.' },
        { id: 't2', label: 'Thread B', x: 300, y: 240, w: 150, kind: 'server', info: 'Ye kya hai: usi process ka doosra thread, doosre core pe ya same core pe interleave hoke chal raha. Same shared memory dekhta hai.' },
        { id: 'lk', label: 'Lock: likes', sub: 'free', x: 300, y: 150, w: 130, h: 50, kind: 'queue', info: 'Ye kya hai: ek mutex (lock) jo likes counter ki raksha karta hai. Ek time pe ek hi thread iska maalik. Baaki line mein wait karte hain (blocked, CPU use nahi karte).' },
        { id: 'lk2', label: 'Lock: views', sub: 'free', x: 470, y: 150, w: 110, h: 50, kind: 'queue', hidden: true, info: 'Ye kya hai: ek doosra mutex, views counter ke liye. Do locks + ulta order = deadlock ka nuskha.' },
        { id: 'm', label: 'likes = 100', sub: 'shared memory', x: 630, y: 150, w: 140, kind: 'data', info: 'Ye kya hai: shared heap memory mein rakha ek number (likes ki ginti). Dono threads ise padh aur likh sakte hain. <code>likes + 1</code> ek kadam nahi, teen hain: READ, ADD, WRITE.' },
      ],
      edges: [
        { a: 'r', b: 't1' }, { a: 'a', b: 't2' },
        { a: 't1', b: 'lk' }, { a: 't2', b: 'lk' },
        { a: 't1', b: 'm' }, { a: 't2', b: 'm' },
        { a: 't1', b: 'lk2', hidden: true }, { a: 't2', b: 'lk2', hidden: true },
      ],
      scenarios: [
        { name: 'Bina lock: lost update', steps: [
          { title: 'Do likes ek saath aaye', text: 'Riya aur Aman ne ek hi pal mein like dabaya. Server ne dono requests do alag threads ko de di. Code mein koi lock nahi hai.', go: ['r>t1', 'a>t2'], parallel: true },
          { title: 'Thread A ne padha', text: 'Thread A: <code>tmp = likes</code> → 100. Abhi likha nahi hai.', go: ['t1>m', 'res:m>t1'], msg: 'A: READ likes → 100', after: { t1: { sub: 'tmp = 100' } } },
          { title: 'Context switch: Thread B ne bhi padha', text: 'A ke likhne se pehle scheduler ne B ko chala diya (ya B doosre core pe parallel chal raha tha). B ko bhi 100 hi dikha.', go: ['t2>m', 'res:m>t2'], msg: 'B: READ likes → 100', after: { t2: { sub: 'tmp = 100' } } },
          { title: 'Thread A ne 101 likha', text: 'A: <code>likes = tmp + 1</code> → 101. Ab tak sahi.', go: 't1>m', msg: 'A: WRITE likes = 101', after: { m: { label: 'likes = 101' } } },
          { title: 'Thread B ne bhi 101 likha', text: 'B ke paas purana <code>tmp = 100</code> tha. Usne bhi 101 likha, A ka update mit gaya. <strong>Do likes, counter +1.</strong> Koi error nahi, koi crash nahi: chupchaap galat data. Ye race condition ki sabse khatarnak baat hai.', go: 'bad:t2>m', msg: 'B: WRITE likes = 101   (102 hona chahiye tha)', after: { m: { state: 'warn', sub: '102 hona tha!' } } },
        ]},
        { name: 'Lock ke saath (sahi)', steps: [
          { title: 'Do likes ek saath aaye', text: 'Wahi do requests. Ab code critical section se pehle lock leta hai.', go: ['r>t1', 'a>t2'], parallel: true },
          { title: 'Thread A ne lock liya', text: 'A pehle pahuncha, lock free tha, A maalik ban gaya.', go: 't1>lk', msg: 'A: lock(likes) → mil gaya', after: { lk: { state: 'ok', sub: 'owner: A' } } },
          { title: 'Thread B ko rukna pada', text: 'B ne bhi lock maanga, lekin A ke paas hai. B <strong>blocked</strong>: OS use side mein rakh deta hai, CPU waste nahi karta.', go: 'bad:t2>lk', msg: 'B: lock(likes) → wait...', after: { t2: { state: 'warn', sub: 'waiting' } } },
          { title: 'A ne READ + WRITE poora kiya', text: 'Lock ke andar A ne 100 padha aur 101 likha. Beech mein koi nahi ghus sakta.', go: ['t1>m', 'res:m>t1'], msg: 'A: READ 100 → WRITE 101', after: { m: { label: 'likes = 101' } } },
          { title: 'A ne lock chhoda, B ko mila', text: 'A ne unlock kiya. OS ne B ko jagaya, B ab maalik.', go: ['t1>lk', 't2>lk'], msg: 'A: unlock   B: lock → mil gaya', after: { lk: { sub: 'owner: B' }, t2: { state: '', sub: '' }, t1: { sub: 'done' } } },
          { title: 'B ne 101 padha, 102 likha', text: 'Ab B ko taaza value 101 mili. Final: <strong>102</strong>. Sahi. Keemat: B ko thoda rukna pada. Lock jitni der pakdoge, utna hi baaki threads line mein.', go: ['t2>m', 'res:m>t2'], msg: 'B: READ 101 → WRITE 102, unlock', after: { m: { label: 'likes = 102', state: 'ok', sub: 'sahi' }, lk: { state: '', sub: 'free' } } },
        ]},
        { name: 'Deadlock: do locks, ulta order', steps: [
          { title: 'Ek naya feature, do locks', text: 'Ab like dabane pe likes <em>aur</em> views dono update hote hain, aur views ka apna lock hai. Thread A code mein pehle likes-lock leta hai, phir views-lock. Kisi ne doosri jagah (Thread B ka code path) ulta likh diya: pehle views, phir likes.', show: ['lk2', 't1-lk2', 't2-lk2'], go: ['r>t1', 'a>t2'], parallel: true },
          { title: 'A ne likes-lock liya', text: 'A ke paas ab likes-lock.', show: ['lk2', 't1-lk2', 't2-lk2'], go: 't1>lk', msg: 'A: lock(likes) → mil gaya', after: { lk: { state: 'ok', sub: 'owner: A' } } },
          { title: 'B ne views-lock liya', text: 'Usi waqt B ne views-lock le liya. Abhi tak sab normal.', show: ['lk2', 't1-lk2', 't2-lk2'], go: 't2>lk2', msg: 'B: lock(views) → mil gaya', after: { lk2: { state: 'ok', sub: 'owner: B' } } },
          { title: 'A ko views chahiye, B ke paas hai', text: 'A apna doosra lock maangta hai. B ke paas hai, to A rukta hai, likes-lock pakde pakde.', show: ['lk2', 't1-lk2', 't2-lk2'], go: 'bad:t1>lk2', msg: 'A: lock(views) → wait (B ke paas)', after: { t1: { state: 'warn', sub: 'waiting for B' } } },
          { title: 'B ko likes chahiye, A ke paas hai', text: 'B bhi rukta hai, views-lock pakde pakde. Ab A, B ka wait kar raha hai aur B, A ka. <strong>Koi kabhi aage nahi badhega.</strong> Ye <strong>deadlock</strong> hai. CPU 0% pe, server "zinda" dikhta hai, lekin har nayi like request bhi in locks pe atakti jaayegi, threads khatam, site hang.', go: 'bad:t2>lk', show: ['lk2', 't1-lk2', 't2-lk2'], msg: 'B: lock(likes) → wait (A ke paas)   ⇒ DEADLOCK', after: { t2: { state: 'warn', sub: 'waiting for A' }, lk: { state: 'down', sub: 'stuck' }, lk2: { state: 'down', sub: 'stuck' } } },
        ]},
      ],
    },

    { type: 'callout', tone: 'term', title: 'Naya word: Deadlock', html: `<strong>Ye kya hai:</strong> do (ya zyada) threads ek doosre ke pakde hue lock ka hamesha intezaar karte rahein. Koi aage nahi badhta.<br><strong>Kab hota hai:</strong> chaar shartein ek saath sach hon tabhi (Coffman conditions): (1) lock ek time pe ek ka hi, (2) ek lock pakad ke doosra maangna, (3) koi zabardasti lock chheen nahi sakta, (4) intezaar ka gol chakkar (A → B → A). Ek bhi shart tod do, deadlock nahi hoga.<br><strong>Asar:</strong> CPU 0%, server "zinda" dikhta hai, lekin requests atakti jaati hain aur site hang.` },
    { type: 'list', items: [
      `<strong>Lock ordering (sabse common fix):</strong> poori codebase mein ek rule: hamesha pehle likes-lock, phir views-lock. Gol chakkar ban hi nahi sakta. Databases bhi yahi salah dete hain: rows ko hamesha same order (jaise id ke order) mein lock karo.`,
      `<strong>Timeout:</strong> <code>tryLock(100 ms)</code>; nahi mila to jo pakda hai chhodo, thoda ruko, dobara try karo.`,
      `<strong>Ek hi lock / lock hi mat lo:</strong> atomic operations (<code>AtomicInteger.incrementAndGet()</code>, CPU ka compare-and-swap) ya ek hi thread ko owner bana do (event loop / actor style). Simple counter ke liye lock overkill hai.`,
      `<strong>Detection:</strong> databases (PostgreSQL, MySQL) deadlock khud pakadte hain aur ek transaction ko abort kar dete hain; app ko retry karna aana chahiye.`,
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "mere server mein lock hai, to safe hoon"', html: `<code>synchronized</code> ya <code>threading.Lock</code> sirf <em>usi process</em> ke threads ko rokta hai. xyz.com ke 10 servers hain; Riya ki request server 1 pe aur Aman ki server 2 pe gayi, to dono ke apne alag lock hain aur race wapas aa gayi. Kai servers ke beech wahi problem database row lock, atomic Redis <code>INCR</code>, ya optimistic version check se solve hoti hai. Ye poori kahani <a href="#/pattern-contention">Contention lesson</a> mein hai. Aur asal mein likes jaisa counter memory mein nahi, DB/Redis mein atomic increment se rakhte hain.` },

    { type: 'h2', text: 'Thread pools aur worker pools: threads ko reuse karo' },
    { type: 'p', html: `Race aur deadlock samajh liye. Ab wapas speed pe. "Har request ka naya thread" do wajah se fail hota hai: thread banana-mitaana mehenga hai, aur traffic spike mein threads ki ginti ki koi limit nahi (10,000 threads = memory khatam). Jawab: <strong>pool</strong>.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Thread pool / Worker pool', html: `<strong>Ye kya hai:</strong> pehle se bane hue, fixed ginti ke threads (maan lo 50) jo ek <strong>queue</strong> se kaam uthaate rehte hain. Request aayi → queue mein → koi khaali thread uthaata hai → kaam khatam → thread wapas pool mein, agle kaam ke liye. <strong>Worker pool</strong> wahi idea hai, bas workers threads ki jagah processes ho sakte hain (Gunicorn workers, Celery workers, background job workers).<br><strong>Kyun chahiye:</strong> threads baar baar banane ka kharcha bachta hai, aur spike mein bhi threads ki ginti ek hadd mein rehti hai.<br><strong>Iske bina:</strong> har request ka naya thread: spike mein hazaaron threads, memory khatam, server gira.` },
    { type: 'steps', items: [
      { t: 'Bounded', d: 'Pool size fixed hai, to spike mein bhi server ki memory aur CPU ek limit mein rehti hai. Extra kaam queue mein rukta hai.' },
      { t: 'Reuse', d: 'Thread baar baar banane ki keemat nahi. Tomcat (Java) ka default request pool 200 threads ka hai, Go apne goroutines ko kuch OS threads pe chalata hai, Node ka libuv pool 4 ka.' },
      { t: 'Queue bhi bounded rakho', d: 'Queue anant hogi to spike mein latency anant. Queue full ho to jaldi mana karo (HTTP 503 / 429). Ise <strong>backpressure</strong> kehte hain; detail <a href="#/queues">Queues lesson</a> mein.' },
      { t: 'Connection pool bhi isi family ka', d: 'Database connections bhi mehenge hain, to app unka pool rakhta hai. 50 threads aur 10 DB connections ho to DB pe 40 threads wait karenge: pool sizes ek doosre se match karne padte hain.' },
    ]},
    { type: 'h3', text: 'Kitne threads/workers? Ek formula' },
    { type: 'p', html: `Agar ek request <code>C</code> ms CPU pe aur <code>W</code> ms wait mein bitaati hai, to ek core ko busy rakhne ke liye lagbhag <code>1 + W/C</code> threads chahiye (jab ek wait kare, doosra chale). Java Concurrency in Practice (Brian Goetz) ka mashhoor rule of thumb:` },
    { type: 'code', text: `threads ≈ cores × (1 + W / C)

CPU-bound  (W ≈ 0)          → threads ≈ cores          (zyada se sirf switching badhegi)
I/O-bound  (C=10, W=90 ms)  → threads ≈ cores × 10     (4 cores → 40 threads)` },
    { type: 'p', html: `Khud try karo. Default: xyz.com ka <code>/feed</code>, 4 cores, 10 ms CPU, 90 ms DB wait.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <label>Cores: <strong class="wsCv"></strong><input class="wsC" type="range" min="1" max="32" step="1" value="4" aria-label="Cores"></label>
          <label>CPU time per request (ms): <strong class="wsCpuV"></strong><input class="wsCpu" type="range" min="1" max="100" step="1" value="10" aria-label="CPU ms"></label>
          <label>Wait time per request (ms): <strong class="wsWv"></strong><input class="wsW" type="range" min="0" max="500" step="5" value="90" aria-label="Wait ms"></label>
          <label>Workers / threads: <strong class="wsNv"></strong><input class="wsN" type="range" min="1" max="400" step="1" value="4" aria-label="Workers"></label>
        </div>
        <div class="stats">
          <div class="stat"><span>Suggested workers</span><strong class="wsSug"></strong></div>
          <div class="stat"><span>Max throughput</span><strong class="wsTp"></strong></div>
          <div class="stat"><span>CPU busy</span><strong class="wsU"></strong></div>
          <div class="stat"><span>Bottleneck</span><strong class="wsB"></strong></div>
        </div>
        <button type="button" class="btn small ghost wsUse" style="margin-top:8px">Suggested value lagao</button>
        <div class="calc-note wsNote"></div>`;
      const q = c => el.querySelector(c);
      const draw = () => {
        const cores = +q('.wsC').value, c = +q('.wsCpu').value, w = +q('.wsW').value, n = +q('.wsN').value;
        q('.wsCv').textContent = cores; q('.wsCpuV').textContent = c; q('.wsWv').textContent = w; q('.wsNv').textContent = n;
        const sug = Math.round(cores * (1 + w / c));
        const byWorkers = n * 1000 / (c + w), byCpu = cores * 1000 / c, tp = Math.min(byWorkers, byCpu);
        const util = tp * c / (cores * 1000);
        q('.wsSug').textContent = sug;
        q('.wsTp').textContent = Math.round(tp) + ' req/s';
        q('.wsU').textContent = Math.round(util * 100) + '%';
        const cpuBound = byCpu <= byWorkers;
        q('.wsB').textContent = cpuBound ? 'CPU' : 'Workers kam';
        let note = cpuBound && n <= Math.ceil(sug * 1.1)
          ? `Sahi jagah: ${n} workers pe CPU poora busy aur throughput ${Math.round(byCpu)} req/s (${cores} cores × 1000 / ${c} ms). Isse aage chhat CPU ki hai.`
          : cpuBound
          ? `CPU 100% busy: ${cores} cores × 1000 / ${c} ms = ${Math.round(byCpu)} req/s ki chhat. Isse zyada workers (${n}) se throughput nahi badhega; bas har request CPU ke liye line mein lagegi (latency badhegi), memory aur context switches badhenge. Ab chahiye: zyada cores ya zyada servers.`
          : `Har worker ek request pe ${c + w} ms atka rehta hai, to ${n} workers × 1000 / ${c + w} = ${Math.round(byWorkers)} req/s. CPU ${Math.round(util * 100)}% hi busy: cores bekaar baithe hain. Workers ~${sug} tak badhao.`;
        q('.wsNote').textContent = note;
      };
      el.querySelectorAll('input').forEach(i => i.oninput = draw);
      q('.wsUse').onclick = () => { const cores = +q('.wsC').value, c = +q('.wsCpu').value, w = +q('.wsW').value; q('.wsN').value = Math.min(400, Math.round(cores * (1 + w / c))); draw(); };
      draw();
    }},
    { type: 'p', html: `Default pe: 4 workers sirf <strong>40 req/s</strong> dete hain aur CPU 10% busy. "Suggested" dabao: 40 workers → <strong>400 req/s</strong>, CPU 100%. Ab workers 200 kar do: throughput wahi 400, kyunki chhat ab CPU hai. Ab wait 0 aur CPU 50 ms karo (thumbnail jaisa CPU-bound kaam): suggested = cores ke barabar. Ye formula shuruaati andaza hai; asli number load test (aur p99 latency dekh ke) se tune hota hai.` },

    { type: 'h2', text: "Amdahl's law: 100 cores, phir bhi 100x kyun nahi?" },
    { type: 'p', html: `xyz.com ki team ko ek bada kaam fast karna hai: raat ko saari videos ki report banana. Socha: 1 core pe 100 minute, 100 cores pe 1 minute. Lekin har kaam ka kuch hissa <strong>serial</strong> hota hai, jo baanta hi nahi ja sakta: data load karna, sab results ko jodna (merge), ek shared lock, ek shared database. 1967 mein Gene Amdahl ne dikhaya ki yahi serial hissa poori speed ki chhat bana deta hai.` },
    { type: 'callout', tone: 'term', title: "Naya word: Amdahl's law", html: `<strong>Ye kya hai:</strong> ek formula jo batata hai ki zyada cores se kaam kitna tez ho sakta hai. Agar kaam ka <code>p</code> hissa parallel ho sakta hai (aur <code>1 − p</code> serial hai), to <code>N</code> cores pe speedup:<br><code>Speedup = 1 / ((1 − p) + p / N)</code><br>Jab N bahut bada ho, <code>p/N</code> lagbhag 0, to speedup ki chhat = <code>1 / (1 − p)</code>. 90% parallel kaam kabhi 10x se zyada fast nahi hoga, chahe 1 lakh cores laga do.<br><strong>Kyun zaroori:</strong> cores khareedne se pehle pata chal jaata hai ki faayda hoga ya nahi.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <label>Parallel hissa p: <strong class="amPv"></strong><input class="amP" type="range" min="0" max="99" step="1" value="90" aria-label="Parallel fraction"></label>
          <label>Cores N: <strong class="amNv"></strong><input class="amN" type="range" min="0" max="10" step="1" value="3" aria-label="Cores, powers of two"></label>
        </div>
        <svg class="amSvg" viewBox="0 0 640 260" style="width:100%;height:auto;display:block;margin-top:10px" role="img" aria-label="Speedup vs cores"></svg>
        <div class="stats">
          <div class="stat"><span>Speedup</span><strong class="amS"></strong></div>
          <div class="stat"><span>Ideal (N)</span><strong class="amI"></strong></div>
          <div class="stat"><span>Efficiency</span><strong class="amE"></strong></div>
          <div class="stat"><span>Chhat (N → ∞)</span><strong class="amM"></strong></div>
        </div>
        <div class="calc-note amNote"></div>`;
      const q = c => el.querySelector(c);
      const sp = (p, n) => 1 / ((1 - p) + p / n);
      const draw = () => {
        const p = +q('.amP').value / 100, k = +q('.amN').value, n = 2 ** k;
        q('.amPv').textContent = Math.round(p * 100) + '%'; q('.amNv').textContent = n;
        const s = sp(p, n), cap = 1 / (1 - p);
        const f = v => v >= 100 ? v.toFixed(0) : v.toFixed(2).replace(/\.?0+$/, '');
        q('.amS').textContent = f(s) + 'x'; q('.amI').textContent = n + 'x';
        q('.amE').textContent = Math.round(s / n * 100) + '%'; q('.amM').textContent = f(cap) + 'x';
        const L = 44, R = 624, T = 12, B = 224, yMax = Math.max(4, Math.min(1024, cap * 1.15));
        const X = kk => L + kk / 10 * (R - L), Y = v => B - Math.min(v, yMax) / yMax * (B - T);
        let g = `<line x1="${L}" y1="${B}" x2="${R}" y2="${B}" stroke="var(--line-2)"/><line x1="${L}" y1="${T}" x2="${L}" y2="${B}" stroke="var(--line-2)"/>`;
        for (let i = 0; i <= 10; i += 2) g += `<text x="${X(i)}" y="${B + 16}" font-size="11" text-anchor="middle" fill="var(--ink-3)" font-family="var(--f-mono)">${2 ** i}</text>`;
        g += `<text x="${(L + R) / 2}" y="${B + 32}" font-size="11" text-anchor="middle" fill="var(--ink-3)">cores (N)</text><text x="${L + 6}" y="${T + 10}" font-size="11" fill="var(--ink-3)">speedup</text>`;
        [0, 0.5, 1].forEach(fr => { const v = yMax * fr; g += `<text x="${L - 6}" y="${Y(v) + 4}" font-size="11" text-anchor="end" fill="var(--ink-3)" font-family="var(--f-mono)">${Math.round(v)}</text>`; });
        let ideal = '', act = '';
        for (let t = 0; t <= 100; t++) { const kk = t / 10, nn = 2 ** kk; if (nn <= yMax) ideal += (ideal ? 'L' : 'M') + X(kk).toFixed(1) + ' ' + Y(nn).toFixed(1); act += (t ? 'L' : 'M') + X(kk).toFixed(1) + ' ' + Y(sp(p, nn)).toFixed(1); }
        g += `<path d="${ideal}" fill="none" stroke="var(--ink-3)" stroke-dasharray="4 4"/>`;
        g += `<line x1="${L}" y1="${Y(cap)}" x2="${R}" y2="${Y(cap)}" stroke="var(--red)" stroke-dasharray="2 3"/><text x="${R}" y="${Y(cap) - 5}" font-size="11" text-anchor="end" fill="var(--red)">chhat ${f(cap)}x</text>`;
        g += `<path d="${act}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>`;
        g += `<circle cx="${X(k)}" cy="${Y(s)}" r="5" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>`;
        q('.amSvg').innerHTML = g;
        q('.amNote').textContent = p === 0 ? 'p = 0: kuch bhi parallel nahi, cores lagao ya na lagao, speedup 1x.'
          : `${n} cores pe ${f(s)}x, yaani har core sirf ${Math.round(s / n * 100)}% kaam ka. Serial ${Math.round((1 - p) * 100)}% hissa chhat ${f(cap)}x pe rok deta hai. Dashed line = ideal (N cores = Nx).`;
      };
      el.querySelectorAll('input').forEach(i => i.oninput = draw);
      draw();
    }},
    { type: 'p', html: `Try karo: p = 90%, N = 8 → <strong>4.71x</strong> (8x nahi). N = 1024 → 9.91x, chhat 10x. p = 50% pe chhat sirf 2x. p = 99%, N = 64 → ~39x. Sabak: zyada cores khareedne se pehle <strong>serial hissa chhota karo</strong>: shared lock hatao, ek central DB pe har cheez mat likho, merge step ko bhi baanto.` },
    { type: 'callout', tone: 'why', title: 'Lekin web servers to "almost linear" scale karte hain?', html: `Haan, kyunki xyz.com ke alag alag users ki requests ek doosre se lagbhag independent hain: p ≈ 1 lagta hai. Har naya server lagbhag utni hi extra requests sambhalta hai. Serial hissa chhupa hota hai <strong>shared cheezon</strong> mein: ek primary database, ek global lock, ek hot counter. Jab wahi saturate hota hai, naye app servers lagane se kuch nahi hota. Isiliye scaling ki kahani aage cache, replication aur sharding pe jaati hai. (Ek related idea, <strong>Gustafson's law</strong>: jab cores badhte hain to log aksar kaam bhi bada kar dete hain, jaise zyada data process karna; tab parallel hissa badhta hai aur speedup better dikhta hai.)` },

    { type: 'h2', text: 'Ye sab server sizing se kaise juda hai' },
    { type: 'p', html: `Ab asli sawaal: xyz.com ke ek 4-core server pe kitne workers chalaayein? Har popular stack ka apna model hai, lekin sab upar wali do baaton pe tike hain: <em>cores parallelism dete hain, concurrency wait ko bharti hai</em>.` },
    { type: 'table', head: ['Stack', 'Concurrency kaise', 'Parallelism kaise', 'Typical setting (4 cores)'], rows: [
      ['Python (Django/Flask) + Gunicorn', 'Har sync worker ek time pe 1 request; ya async/thread workers', 'Kai worker processes (har ek ka apna GIL)', 'Gunicorn docs ka shuruaati andaza: (2 × cores) + 1 = 9 workers'],
      ['Node.js', 'Event loop: ek process, hazaaron connections', 'Har core pe ek process (cluster / PM2 / pods)', '4 processes'],
      ['Java (Spring/Tomcat)', 'Thread pool (Tomcat default 200 threads)', 'Threads khud kai cores pe chalte hain', '1 process, ~200 threads'],
      ['Go', 'Goroutines (bahut halke, lakhon ban sakte hain)', 'Go runtime unhe sab cores pe chalata hai', '1 process'],
    ], caption: 'Ye shuruaati defaults hain. Asli number load test se tune hota hai.' },
    { type: 'p', html: `Gunicorn ka <code>2 × cores + 1</code> bhi isi logic se hai: unke docs ke hisaab se har core pe ek worker request process karta hai to doosra socket se padh-likh raha hota hai. Agar tumhara API bahut I/O-heavy hai (zyaadatar DB/API calls ka wait), to async ya threaded workers lo, ya workers badhao: <strong>I/O-heavy API cores se kahin zyada workers rakh sakta hai</strong>, kyunki zyaadatar workers wait kar rahe hote hain, CPU nahi kha rahe. CPU-heavy service (thumbnails, encoding) pe workers ≈ cores, warna sirf context switching aur memory badhegi.` },
    { type: 'p', html: `Ek server ka throughput nikal gaya (upar wala calculator), to kitne servers chahiye ye seedha maths hai: peak QPS ÷ ek server ka safe QPS × headroom. Ye poora tareeka <a href="#/decide-servers">Kitne servers chahiye?</a> lesson mein hai.` },
    { type: 'callout', tone: 'tip', title: 'Decide: concurrency ya parallelism, aur kaunsa tool', html: `Pehle pucho: <strong>kaam ka time kahan jaata hai, CPU mein ya wait mein?</strong> (profiler ya metrics se, andaaze se nahi).<br>• <strong>I/O-bound</strong> (APIs, DB calls, chat, proxies) → concurrency: async/event loop, ya threads/workers ≈ <code>cores × (1 + W/C)</code>. Cores se kai guna workers theek hain.<br>• <strong>CPU-bound</strong> (image/video, ML, hashing, compression) → parallelism: workers ≈ cores, alag processes (Python mein multiprocessing), aur aise kaam ko request path se nikaal ke queue + background workers mein daalo.<br>• <strong>Shared data likhna hai</strong> → pehle sharing hatao (har request apna data, ya atomic DB/Redis op); zaroori ho to lock, hamesha same order mein, chhoti der ke liye. Kai servers ho to lock DB/Redis level pe (<a href="#/pattern-contention">Contention</a>).<br>• <strong>Zyada cores se fast nahi ho raha</strong> → Amdahl: serial hissa (shared DB, global lock, merge) dhoondho aur chhota karo.` },
    { type: 'callout', tone: 'mistake', title: 'Ek aur confusion: "async = fast"', html: `Async ek request ko fast nahi karta. 80 ms ki DB query async mein bhi 80 ms hi legi. Async sirf ye karta hai ki wait ke dauraan server <em>doosri requests</em> sambhal le, yaani <strong>throughput</strong> badhta hai, latency nahi ghatti. Aur CPU-heavy kaam ko async banane se kuch nahi milta, ulta event loop block hota hai.` },

    { type: 'diagram', title: 'xyz.com mein concurrency: poori picture', height: 610,
      groups: [
        { label: 'App server (4 cores)', x: 20, y: 210, w: 680, h: 115 },
        { label: 'Shared data', x: 20, y: 350, w: 680, h: 115 },
        { label: 'Background (CPU-bound)', x: 190, y: 490, w: 400, h: 105 },
      ],
      nodes: [
        { id: 'users', label: 'Users', sub: 'hazaaron ek saath', x: 360, y: 50, w: 160, kind: 'client', info: 'Ye kya hai: xyz.com ke users, jo ek hi second mein hazaaron requests bhejte hain. Inhe sambhalna hi concurrency ka kaam hai.' },
        { id: 'lb', label: 'Load Balancer', x: 360, y: 150, w: 150, kind: 'net', info: 'Ye kya hai: requests ko kai servers mein baantne wala. Har server ke andar concurrency, servers ke beech parallelism: dono milke throughput dete hain.' },
        { id: 'wp', label: 'Worker pool', sub: '~40 workers (I/O)', x: 240, y: 270, w: 160, kind: 'server', info: 'Ye kya hai: fixed ginti ke threads/workers jo queue se requests uthaate hain. /feed jaisa kaam I/O-bound hai (10 ms CPU, 90 ms wait), to 4 cores pe ~40 workers: cores × (1 + W/C).' },
        { id: 'cp', label: 'DB conn pool', sub: '20 connections', x: 510, y: 270, w: 150, kind: 'queue', info: 'Ye kya hai: database connections ka pool, baar baar connection banane se bachne ke liye. Iska size worker pool se match karna padta hai, warna workers yahan line mein lagte hain.' },
        { id: 'redis', label: 'Redis', sub: 'atomic INCR', x: 110, y: 410, w: 140, kind: 'cache', info: 'Ye kya hai: tez, RAM wala store. Likes counter yahan atomic INCR se badhta hai: ek hi step mein READ-ADD-WRITE, to kai servers ke beech bhi race condition nahi.' },
        { id: 'q', label: 'Job queue', sub: 'resize jobs', x: 330, y: 410, w: 140, kind: 'queue', info: 'Ye kya hai: kaam ki line. CPU-heavy kaam (photo resize) request ke raaste se hata ke yahan daala jaata hai, taaki API workers / event loop atke nahi.' },
        { id: 'db', label: 'Database', sub: 'row locks', x: 580, y: 410, w: 140, kind: 'data', info: 'Ye kya hai: asli data. Kai servers ki concurrent writes ko ye row locks aur transactions se sahi rakhta hai, aur deadlock pakad ke ek transaction ko abort karta hai.' },
        { id: 'cpu', label: 'Thumbnail workers', sub: 'workers = cores', x: 470, y: 545, w: 170, kind: 'server', info: 'Ye kya hai: alag processes jo queue se resize jobs uthaate hain. Kaam CPU-bound hai, to workers ≈ cores (parallelism). Zyada workers = sirf context switching.' },
      ],
      edges: [
        { a: 'users', b: 'lb', n: 1 },
        { a: 'lb', b: 'wp', n: 2 },
        { a: 'wp', b: 'cp', n: 3, label: 'DB call' },
        { a: 'cp', b: 'db', n: 4 },
        { a: 'wp', b: 'redis', label: 'INCR likes' },
        { a: 'wp', b: 'q', dashed: true, kind: 'evt', label: 'resize job' },
        { a: 'q', b: 'cpu', kind: 'evt' },
        { a: 'cpu', b: 'db', dashed: true, label: 'save' },
      ],
      paths: [
        { name: 'Feed (I/O-bound)', text: 'Worker ne request li, DB pool se connection liya aur jawab ka intezaar kiya. Wait ke dauraan doosre workers CPU use karte rahe: concurrency.', go: ['users>lb>wp>cp>db'] },
        { name: 'Like (shared counter)', text: 'Kai servers ek hi counter badhaate hain. Process ka lock kaafi nahi, isliye Redis ka atomic INCR.', go: ['users>lb>wp>redis'] },
        { name: 'Photo upload (CPU-bound)', text: 'Resize CPU kha jaata, to API ne sirf job queue mein daali aur turant jawab diya. Thumbnail workers (cores jitne) parallel mein resize karke DB mein save karte hain.', go: ['users>lb>wp>q>cpu>db'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Concurrency = kai kaam sambhalna (wait mein switch). Parallelism = kai kaam sach mein ek saath (kai cores).</li>
      <li>Pehle pehchaano: I/O-bound (wait zyada) → concurrency; CPU-bound (hisaab zyada) → parallelism.</li>
      <li>Process = alag memory, safe. Thread = shared memory, sasta, lekin race condition ka khatra.</li>
      <li>Event loop (Node.js) = ek thread, hazaaron connections; CPU-heavy kaam use rok deta hai.</li>
      <li>Python ka GIL: default build mein ek process mein ek time pe ek thread; CPU kaam ke liye processes.</li>
      <li>Shared data: lock, atomic ops; kai locks hamesha same order mein (deadlock se bachaav). Kai servers ho to lock DB/Redis level pe.</li>
      <li>Workers ≈ cores × (1 + W/C). Amdahl: serial hissa speedup ki chhat hai.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: [
        'Concurrency: wait ke time CPU kaam karta hai, ek hi machine pe kai guna zyada requests',
        'Parallelism: CPU-heavy kaam cores ke saath lagbhag linear fast (jab tak serial hissa chhota)',
        'Thread/worker pools: bounded memory, threads reuse, spike mein bhi server zinda',
        'Event loop: ek thread pe hazaaron connections, bahut kam memory per connection',
      ],
      costs: [
        'Shared memory ke saath race conditions: chupchaap galat data, test mein pakadna mushkil',
        'Locks: waiting, contention, aur galat order pe deadlock',
        'Context switching aur har thread ki memory: bahut zyada threads ulta slow karte hain',
        'Event loop ek CPU-heavy request se poora atak jaata hai',
        "Amdahl: serial hissa speedup ki chhat bana deta hai; cores khareedna har baar kaam nahi aata",
        'Debugging mushkil: bug timing pe depend karta hai, har baar reproduce nahi hota',
      ],
    },

    { type: 'think', questions: [
      { q: 'xyz.com ka Node.js API achha chal raha tha. Naya feature aaya: upload pe server khud 4K photo resize karta hai. Ab saare users ke liye /feed bhi slow ho gaya, jabki feed ka resize se koi lena dena nahi. Kyun, aur fix kya?', a: 'Resize CPU-bound kaam hai aur Node mein tumhara JavaScript ek hi event loop thread pe chalta hai. Jab tak resize chal raha, loop kisi aur callback (feed ke requests bhi) ko nahi chala sakta. Fix: resize ko event loop se hatao: worker_threads, alag process, ya behtar: upload ke baad job queue mein daalo aur alag thumbnail workers (workers ≈ cores) se karao.' },
      { q: 'Ek Python Flask service 8-core machine pe ek process, 8 threads mein chal rahi hai. Kaam: har request pe bhaari pure-Python calculation. CPU sirf ~12-13% dikh raha hai. Kya ho raha hai?', a: 'GIL. Default CPython mein ek process ke andar ek time pe ek hi thread Python bytecode chala sakta hai, to 8 threads milke lagbhag 1 core (8 mein se 1 = 12.5%) hi use kar rahe hain. Fix: Gunicorn ke ~8 worker processes (ya multiprocessing), ya calculation ko NumPy jaisi library mein le jao jo GIL chhodti hai. Python 3.13+ ka free-threaded build bhi ek option hai, lekin tab saari C libraries ki support check karni hogi.' },
      { q: 'Team ne report job ko 8 se 64 cores pe chalaaya, time sirf 8 min se 6 min hua. Tum kya check karoge?', a: "Amdahl's law: koi bada serial hissa hai. Jaise sab workers ek hi DB table pe likh rahe hain, ek global lock, ya end mein ek single-threaded merge. Profile karo ki time kahan jaata hai, serial hissa todo (partition karke likho, merge ko tree jaisa parallel karo). Cores aur badhaane se faayda nahi." },
      { q: 'Interview: "Hamare API ke 4-core servers pe 4 hi workers kyun nahi? Ek worker per core to logical hai."', a: 'Ek worker per core tabhi sahi hai jab kaam CPU-bound ho. API zyaadatar I/O-bound hai: agar request 10 ms CPU aur 90 ms DB wait hai, to 4 workers ke saath CPU ~10% busy aur throughput ~40 req/s. Cores × (1 + W/C) ≈ 40 workers (ya async I/O) se CPU poora use hota hai aur ~400 req/s. Upar ki limit CPU, memory aur DB connection pool se aati hai; load test se tune karo.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Ek core wala server do requests ko interleave karke chala raha hai (ek DB wait kare to doosri chale). Ye kya hai?', options: ['Parallelism', 'Concurrency (bina parallelism)', 'Dono', 'Kuch nahi, ye sequential hai'], answer: 1, explain: 'Ek pal mein sirf ek kaam chal raha hai, lekin dono aage badh rahe hain. Parallelism ke liye ek se zyada cores chahiye.' },
      { q: 'Kaunsa kaam concurrency (async / zyada threads) se sabse zyada fayda uthayega, bina naye cores ke?', options: ['Video encoding', 'Bahut saari doosri APIs ko call karke results jodna', 'Password hashing (bcrypt)', 'Bade matrix ka multiplication'], answer: 1, explain: 'API calls I/O-bound hain: zyaadatar time wait. Baaki teeno CPU-bound hain, unhe cores (parallelism) chahiye.' },
      { q: 'Do threads ne ek saath likes = likes + 1 chalaaya, bina lock ke. Shuru mein 100 tha. Final value kya ho sakti hai?', options: ['Sirf 102', '101 ya 102', 'Sirf 101', '100'], answer: 1, explain: 'Agar dono ne READ ek saath (dono 100) kiya to lost update: 101. Agar ek ka WRITE doosre ke READ se pehle hua to 102. Result timing pe depend karta hai: yahi race condition hai.' },
      { q: 'p = 0.8 (80% kaam parallel). Kitne bhi cores laga do, maximum speedup?', options: ['8x', '5x', '80x', 'Cores ke barabar'], answer: 1, explain: 'Chhat = 1 / (1 − p) = 1 / 0.2 = 5x.' },
      { q: 'Default CPython (python3, standard build) ke baare mein sahi kya hai?', options: ['GIL Python 3.13 mein poori tarah hat gaya', 'GIL default build mein hai; 3.13+ mein ek optional free-threaded build hai, 3.14 se officially supported', 'GIL sirf I/O threads ko rokta hai', 'Python mein threads hote hi nahi'], answer: 1, explain: 'PEP 703 ne optional GIL ka raasta diya, 3.13 mein free-threaded build experimental aaya, aur PEP 779 ke baad 3.14 mein officially supported hai, lekin default build abhi bhi GIL wala hai.' },
      { q: 'Thread A ke paas lock L1 hai aur wo L2 maang raha hai; Thread B ke paas L2 hai aur wo L1 maang raha hai. Sabse common permanent fix?', options: ['Threads badhao', 'Saare code mein locks hamesha same order mein lo', 'CPU tez karo', 'Lock hata do aur dua karo'], answer: 1, explain: 'Same lock order se "gol chakkar" (circular wait) ban hi nahi sakta, to deadlock nahi hota. Timeout ek backup safety hai.' },
    ]},
    { type: 'sources', items: [
      { title: 'Python support for free threading (HOWTO)', publisher: 'Python documentation', official: true, url: 'https://docs.python.org/3/howto/free-threading-python.html', used: 'Free-threaded build 3.13 se, 3.14 mein supported, GIL default build mein ON, single-thread overhead ~1-8%, python3.14t naming.' },
      { title: 'PEP 703: Making the Global Interpreter Lock Optional in CPython', publisher: 'Python Software Foundation', official: true, url: 'https://peps.python.org/pep-0703/', used: 'GIL ko optional banane ka design.' },
      { title: 'PEP 779: Criteria for supported status for free-threaded Python', publisher: 'Python Software Foundation', official: true, url: 'https://peps.python.org/pep-0779/', used: 'June 2025 mein accept; 3.14 mein free-threaded build "supported" lekin optional aur alag.' },
      { title: "Don't Block the Event Loop (or the Worker Pool)", publisher: 'Node.js official docs', official: true, url: 'https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop', used: 'Ek JS thread, worker pool kaun use karta hai (fs, dns.lookup, crypto, zlib), CPU kaam se event loop block hona.' },
      { title: 'Thread pool work scheduling', publisher: 'libuv documentation', official: true, url: 'https://docs.libuv.org/en/v1.x/threadpool.html', used: 'Default pool size 4, UV_THREADPOOL_SIZE, max 1024.' },
      { title: 'Gunicorn design: How many workers?', publisher: 'Gunicorn documentation', official: true, url: 'https://gunicorn.org/design/', used: '(2 × cores) + 1 workers ka shuruaati andaza aur uski wajah.' },
      { title: 'Concurrency is not parallelism (Rob Pike talk)', publisher: 'The Go Blog', official: true, url: 'https://go.dev/blog/waza-talk', year: 2013, used: 'Concurrency (structure) vs parallelism (execution) ka farak.' },
      { title: 'Validity of the single processor approach to achieving large scale computing capabilities (Amdahl)', publisher: 'AFIPS Spring Joint Computer Conference', url: 'https://doi.org/10.1145/1465482.1465560', year: 1967, used: "Amdahl's law ka original argument." },
    ]},
  ],
});
