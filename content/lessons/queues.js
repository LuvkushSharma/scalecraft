Lesson.register({
  id: 'queues',
  title: 'Message queues',
  minutes: 30,
  summary: `Kuch kaam itne slow hote hain ki user ko unka wait karwana galat hai: video process karna, email bhejna, report banana. Message queue ek "to-do list" hai jisme server kaam likh ke turant aage badh jaata hai, aur workers apni speed se kaam utha ke karte hain. Saath mein: ack, retries, dead-letter queue, backpressure, aur "exactly-once" ka sach.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Kuch kaam lambe hote hain: video taiyaar karna, email bhejna, report banana.<br>Agar server har kaam khatam hone tak user ko rok ke rakhe, to user pareshaan aur server jaam.<br>Isliye server kaam ek <strong>list</strong> mein likh deta hai aur user ko turant bolta hai: "mil gaya, ho jaayega".<br>Peeche alag machines (workers) list se ek ek kaam uthati hain aur karti hain.<br>Is lesson mein seekhenge: wo list kaise kaam karti hai, machine beech mein mar jaaye to kya hota hai, aur list bahut lambi ho jaaye to kya karein.` },
    { type: 'h2', text: 'Problem: request atak jaati hai' },
    { type: 'p', html: `xyz.com ab ek video platform ban chuka hai. Load Balancer, cache, CDN, replicas sab lag gaye. Ab naya feature: users apne videos upload karte hain. Upload ke baad server ko teen kaam karne hain: video ko 360p/720p/1080p mein convert karna (<strong>transcoding</strong>, 2-5 minute), thumbnail banana, aur followers ko email bhejna.` },
    { type: 'p', html: `Pehla design sabse seedha: upload request ke andar hi ye saare kaam kar do, aur kaam khatam hone pe user ko "Done" bhejo. Kya bigadta hai?` },
    { type: 'list', items: [
      `<strong>User 5 minute tak loading spinner dekhta hai.</strong> Mobile network pe beech mein connection toota, to poora kaam bekaar aur user dobara upload karega.`,
      `<strong>Server ke threads/connections atke rehte hain.</strong> Ek server maan lo 200 requests ek saath sambhalta hai. 200 uploads 5-5 minute chal rahe hain to baaki saare users (jo sirf homepage kholna chahte the) line mein.`,
      `<strong>Spike (achanak bheed) pe sab girta hai.</strong> Raat 9 baje 10 guna uploads aaye. Har request apne saath 5 minute ka heavy kaam laayi. Servers overload, timeouts, error.`,
      `<strong>Email provider slow hai ya down hai?</strong> To upload bhi fail. Ek third-party ki problem ne hamara core feature gira diya.`,
    ]},
    { type: 'callout', tone: 'why', title: 'Asli sawaal', html: `Kya user ko sach mein in kaamon ke <em>khatam hone</em> ka wait karna zaroori hai? Nahi. User ko bas itna jaanna hai ki "tumhara video mil gaya, process ho raha hai". Kaam baad mein, alag se, apni speed se ho sakta hai.` },
    { type: 'callout', tone: 'term', title: 'Asynchronous (async) processing', html: `<strong>Ye kya hai:</strong> kaam ko "baad mein" karwana. <strong>Synchronous</strong> = kaam karo, khatam hone tak ruko, phir jawab do. <strong>Asynchronous</strong> = kaam kahin likh do, turant jawab do ("mil gaya"), aur kaam koi aur baad mein kare. Jaise app mein "report export" dabao aur wo bole "ready hone pe email aayega".<br><strong>Kyun chahiye:</strong> user ko slow kaam ka wait nahi karna padta, aur server ka thread turant free.<br><strong>Iske bina:</strong> har lamba kaam ek user ko minutes tak rokta hai, aur server ki capacity atki rehti hai.` },
    { type: 'callout', tone: 'term', title: 'Message', html: `<strong>Ye kya hai:</strong> ek chhota sa note jo batata hai "kya kaam karna hai". Jaise <code>{ "job_id": 42, "video_id": 7 }</code>. Bas kuch sau bytes.<br><strong>Kyun chahiye:</strong> kaam karne wale ko poori video nahi chahiye, bas itna pata hona chahiye ki kaunsi video. Video khud storage mein padi hai.<br><strong>Iske bina:</strong> badi files idhar udhar bhejni padti, sab slow aur mehenga.` },
    { type: 'callout', tone: 'term', title: 'Message queue', html: `<strong>Ye kya hai:</strong> ek alag service jo messages ko <strong>line mein</strong> sambhaal ke rakhti hai, jaise ek shared to-do list. Jo pehle aaya, aam taur pe wo pehle nikalta hai. Examples: RabbitMQ, Amazon SQS, aur Celery (Python) / Sidekiq (Ruby) jaisi job libraries jo Redis pe chalti hain.<br><strong>Kyun chahiye:</strong> API aur kaam karne wali machines ke beech ek "bharosemand beech wala". API likh ke aage badh jaaye, workers apni speed se uthayein.<br><strong>Iske bina:</strong> API ko khud kaam karna padta, ya worker ko seedha call karna padta. Worker busy ya down ho to kaam gaya.<br><strong>Example:</strong> xyz.com pe har upload ek message banata hai. Raat 9 baje 20,000 messages line mein, workers ek ek karke nipta rahe hain.` },
    { type: 'callout', tone: 'term', title: 'Producer, consumer (worker), broker', html: `<strong>Ye kya hai:</strong> teen kirdaar. <strong>Producer</strong> = jo message line mein daalta hai (hamara Upload API). <strong>Consumer</strong> ya <strong>worker</strong> = jo message nikaal ke asli kaam karta hai (video convert karne wali machine). <strong>Broker</strong> = beech wali queue service khud (RabbitMQ, SQS).<br><strong>Kyun chahiye:</strong> teeno alag hain, to teeno ko alag se badha ya badal sakte ho. 2 workers se 200 kar do, API ko pata bhi nahi chalega.<br><strong>Iske bina:</strong> sab ek hi program mein, ek ka bojh sab ko girata hai.` },
    { type: 'compare',
      left: { title: 'Synchronous (pehle)', ascii: `
User ──upload──> Server
                  │ transcode (3 min)
                  │ thumbnail (5 s)
                  │ email (2 s, kabhi 30 s)
User <──"Done"─── Server
  (5 minute baad, agar
   connection bacha raha)` },
      right: { title: 'Asynchronous (queue ke saath)', ascii: `
User ──upload──> Server ──job──> Queue
User <──202 Accepted──┘           │
  (~200 ms mein)                  v
                        Worker 1, Worker 2 ...
                        apni speed se kaam
                        → status update
                        → user ko notification` },
    },
    { type: 'p', html: `Isko roadmap ki "async recipe" kehte hain: <strong>request accept karo → job store karo → <code>202 Accepted</code> + job ID wapas do → worker queue se job uthaye → client ko push, SSE, webhook ya status polling se batao</strong> (ye sab "realtime" lesson mein). (202 Accepted ka matlab hai "request mil gayi, kaam abhi baaki hai".)` },

    { type: 'h2', text: 'Ek message ki zindagi' },
    { type: 'p', html: `Flow dekhne se pehle chaar chhote words samajh lo. Inhi pe poora lesson tika hai.` },
    { type: 'steps', items: [
      { t: 'Send', d: 'Producer message bhejta hai. Broker use disk pe (aur aksar doosri machines pe copy karke) likhta hai, phir producer ko bolta hai "save ho gaya". RabbitMQ mein is "save ho gaya" ko <strong>publisher confirm</strong> kehte hain.' },
      { t: 'Receive', d: 'Worker message leta hai. Message abhi <strong>delete nahi</strong> hota. Wo bas doosre workers se chhupa diya jaata hai.' },
      { t: 'Process', d: 'Worker asli kaam karta hai: video convert, email, database update.' },
      { t: 'Ack (ya delete)', d: 'Kaam pura hone pe worker bolta hai "ho gaya" (SQS mein <code>DeleteMessage</code> call). Tab broker message hamesha ke liye hata deta hai.' },
      { t: 'Ack nahi aaya?', d: 'SQS: ek tay time ke baad message phir sab ko dikhne lagta hai. RabbitMQ: worker ka connection toote to message turant wapas line mein. Dono jagah message dobara diya jaata hai.' },
    ]},
    { type: 'callout', tone: 'term', title: 'Ack (acknowledgement) aur nack', html: `<strong>Ye kya hai:</strong> ack = worker ka broker ko "kaam ho gaya, message hata do" wala signal. Nack (ya reject) = "nahi ho paya", saath mein ye bhi bata sakte ho ki wapas line mein daalo ya nahi.<br><strong>Kyun chahiye:</strong> broker ko kaise pata chale ki kaam sach mein hua? Sirf ack se. Ack aane tak broker message sambhaal ke rakhta hai.<br><strong>Iske bina:</strong> broker message dete hi bhool jaata. Worker beech mein mara to kaam hamesha ke liye gaya.` },
    { type: 'callout', tone: 'term', title: 'In-flight message', html: `<strong>Ye kya hai:</strong> wo message jo kisi worker ne le liya hai lekin abhi ack nahi kiya. Ye "raaste mein" hai: queue mein hai, lekin doosron ko nahi dikhta.<br><strong>Kyun chahiye:</strong> do workers ek hi kaam na uthayein, lekin worker mar jaaye to message bach jaaye.<br><strong>Iske bina:</strong> ya to do workers same video banate (barbaadi), ya message dete hi delete ho jaata (khone ka khatra).<br><strong>Example:</strong> SQS standard queue mein ek waqt pe lagbhag 120,000 tak in-flight messages ho sakte hain.` },
    { type: 'callout', tone: 'term', title: 'Visibility timeout (SQS)', html: `<strong>Ye kya hai:</strong> message lene ke baad wo kitni der doosron se chhupa rahe. Default 30 second, max 12 ghante. Time khatam aur ack nahi aaya, to message phir se line mein dikhne lagta hai.<br><strong>Kyun chahiye:</strong> SQS ko pata nahi ki worker zinda hai ya mar gaya. Ye timer hi uska "shayad mar gaya" wala andaza hai.<br><strong>Iske bina:</strong> mara hua worker ka message hamesha chhupa rehta, kaam kabhi nahi hota.<br><strong>Dhyaan:</strong> timer kaam ke time se chhota rakha to zinda worker ke rehte hi message doosre ko mil jaayega. Neeche khel ke dekho.` },
    { type: 'callout', tone: 'term', title: 'Prefetch (RabbitMQ)', html: `<strong>Ye kya hai:</strong> ek worker ke paas ek saath kitne unacked (bina ack wale) messages ho sakte hain. Jaise prefetch = 10.<br><strong>Kyun chahiye:</strong> RabbitMQ messages khud worker ki taraf dhakelta hai. Limit na ho to ek worker ke paas 10,000 messages jama ho jaate, aur baaki workers khaali baithte.<br><strong>Iske bina:</strong> kaam tedha baantta hai, aur worker ki memory bhar sakti hai.` },
    { type: 'p', html: `<strong>Visibility timeout lab.</strong> Ek video ka kaam (job time) chuno, timeout chuno. Har patti ek "delivery" hai: kisi worker ko message mila aur usne kaam shuru kiya. Laal X = worker crash. <strong>Heartbeat</strong> ka matlab: worker kaam ke beech har aadhe timeout pe SQS ko bolta hai "main zinda hoon, timer badha do" (<code>ChangeMessageVisibility</code>).` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Job time (kaam kitna lamba): <strong class="qv-vj"></strong></label><input class="qv-j" type="range" min="10" max="300" step="10" value="180"></div>
          <div><label>Visibility timeout: <strong class="qv-vv"></strong></label><input class="qv-v" type="range" min="10" max="600" step="10" value="30"></div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:16px;margin-top:8px;font:14px var(--f-body);color:var(--ink-2)">
          <label><input class="qv-hb" type="checkbox"> Heartbeat (timer badhate raho)</label>
          <label><input class="qv-cr" type="checkbox"> Worker A aadhe kaam pe crash</label>
        </div>
        <svg class="qv-svg" viewBox="0 0 600 236" style="width:100%;height:auto;display:block;margin-top:10px" role="img" aria-label="Deliveries timeline"></svg>
        <div class="stats">
          <div class="stat"><span>Deliveries</span><strong class="qv-o-n"></strong></div>
          <div class="stat"><span>Barbaad kaam</span><strong class="qv-o-w"></strong></div>
          <div class="stat"><span>Kaam pura hua</span><strong class="qv-o-d"></strong></div>
          <div class="stat"><span>Crash ke baad wait</span><strong class="qv-o-r"></strong></div>
        </div>
        <div class="calc-note qv-note"></div>`;
      const $ = c => el.querySelector(c);
      const sim = (J, V, hb, crash) => {
        const D = []; let vis, del = Infinity;
        const add = s => { const c = crash && D.length === 0; const d = { s, c, end: c ? s + J / 2 : s + J }; D.push(d); if (!c) del = Math.min(del, d.end);
          if (hb) { if (c) { const step = V / 2; vis = s + Math.floor((J / 2) / step) * step + V; } else vis = Infinity; } else vis = s + V; };
        add(0);
        while (vis < del && D.length < 40) add(vis);
        return { D, del };
      };
      const upd = () => {
        const J = +$('.qv-j').value, V = +$('.qv-v').value, hb = $('.qv-hb').checked, cr = $('.qv-cr').checked;
        $('.qv-vj').textContent = J + ' s'; $('.qv-vv').textContent = V + ' s';
        const { D, del } = sim(J, V, hb, cr);
        const tmax = Math.max(...D.map(d => d.end), del) * 1.05, X = t => 96 + (t / tmax) * 489;
        const rows = D.slice(0, 7), rh = 26;
        let svg = `<line x1="96" x2="585" y1="196" y2="196" stroke="var(--line-2)"/>
          <text x="96" y="216" font-size="14" fill="var(--ink-3)" font-family="var(--f-mono)">0 s</text>
          <text x="585" y="216" text-anchor="end" font-size="14" fill="var(--ink-3)" font-family="var(--f-mono)">${Math.round(tmax)} s</text>
          <line x1="${X(del)}" x2="${X(del)}" y1="8" y2="196" stroke="var(--green)" stroke-dasharray="4 3"/>
          <text x="${Math.min(X(del) + 4, 520)}" y="190" font-size="14" fill="var(--green)" font-family="var(--f-mono)">delete</text>`;
        rows.forEach((d, i) => {
          const y = 12 + i * rh, nm = 'Worker ' + String.fromCharCode(65 + i);
          svg += `<text x="90" y="${y + 15}" text-anchor="end" font-size="14" fill="var(--ink-2)" font-family="var(--f-mono)">${nm}</text>
            <rect x="${X(d.s)}" y="${y}" width="${Math.max(2, X(d.end) - X(d.s))}" height="20" rx="3" fill="${i === 0 ? 'var(--accent)' : 'var(--amber)'}" opacity="0.85"/>`;
          if (d.c) svg += `<text x="${X(d.end) + 3}" y="${y + 16}" font-size="16" font-weight="700" fill="var(--red)">X</text>`;
        });
        if (D.length > 7) svg += `<text x="585" y="${12 + 7 * rh + 4}" text-anchor="end" font-size="14" fill="var(--ink-3)" font-family="var(--f-mono)">+${D.length - 7} aur</text>`;
        $('.qv-svg').innerHTML = svg;
        const wasted = D.reduce((a, d) => a + (d.end - d.s), 0) - J;
        $('.qv-o-n').textContent = D.length;
        $('.qv-o-w').textContent = Math.round(wasted) + ' s';
        $('.qv-o-d').textContent = Math.round(del) + ' s';
        $('.qv-o-r').textContent = cr && D[1] ? Math.round(D[1].s - J / 2) + ' s' : '-';
        let note;
        if (!cr && D.length > 1) note = `Timeout (${V} s) job (${J} s) se chhota hai. Worker A zinda hai, phir bhi ${V} s pe SQS ne socha "shayad mar gaya" aur message Worker B ko de diya. Phir C ko... Ek hi video ${D.length} baar ban rahi hai. Fix: timeout job time se bada rakho, ya heartbeat on karo.`;
        else if (!cr) note = hb ? `Heartbeat har ${V / 2} s pe timer badhata raha, to message sirf Worker A ke paas raha. Ek delivery, zero barbaadi.` : `Timeout (${V} s) job (${J} s) se bada hai, to ek hi delivery. Ab "crash" on karke dekho ki bada timeout crash ke baad kitna mehenga hai.`;
        else note = `Worker A ${J / 2} s pe mara. Message ${Math.round(D[1].s - J / 2)} s baad Worker B ko mila. ` + (hb ? `Heartbeat ke saath timeout chhota (${V} s) rakh sakte ho, to crash jaldi pakda jaata hai. Ye best combo hai: chhota timeout + heartbeat.` : V >= J ? `Bada timeout duplicates rokta hai, lekin crash ke baad message itni der chhupa raha. Chhota timeout + heartbeat dono problems hal karta hai.` : `Chhota timeout bina heartbeat ke: crash jaldi pakda gaya, lekin zinda workers ke kaam bhi duplicate ho rahe hain.`);
        $('.qv-note').textContent = note;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'tip', html: `Defaults pe (job 180 s, timeout 30 s) ek video <strong>6 baar</strong> banti hai: deliveries 0, 30, 60, 90, 120, 150 s pe. Heartbeat on karo: 1 delivery. Ab crash bhi on karo: A 90 s pe mara, B ko 120 s pe mila (sirf 30 s wait). Heartbeat band karke timeout 600 s karo: B ko 600 s pe mila, yaani <strong>510 s</strong> tak video atki rahi. Isliye: chhota timeout + heartbeat.` },
    { type: 'callout', tone: 'term', title: 'Poison message aur dead-letter queue (DLQ)', html: `<strong>Ye kya hai:</strong> poison message = aisa message jo kabhi successful nahi hoga (corrupt video, code ka bug, gayab record). DLQ = ek alag "kharab messages" wali queue. Kuch koshishon ke baad poison message main line se nikaal ke yahan rakh dete hain.<br><strong>Kyun chahiye:</strong> poison message baar baar wapas aata hai aur har baar worker ka time khaata hai.<br><strong>Iske bina:</strong> ek kharab video hamesha retry hoti rahegi, workers ka time barbaad, aur kabhi kabhi poori line ruk jaati hai.` },
    { type: 'h2', text: 'Chala ke dekho: queue + workers' },
    { type: 'p', html: `Chaar scenarios hain. Pehle happy path, phir teen cheezein jo real life mein zaroor hoti hain: worker beech mein mar jaata hai, ek kharab message baar baar fail hota hai, aur traffic ka spike aata hai. Boxes pe click karke unka role padho.` },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'u', label: 'Riya ka app', sub: 'video upload', x: 80, y: 165, w: 130, kind: 'client', info: 'Ye kya hai: Riya ke phone ki xyz.com app. Video file pehle object storage mein upload hoti hai (wo alag lesson hai). Yahan hum sirf "ab is video ko process karo" wala kaam dekh rahe hain.' },
        { id: 'api', label: 'Upload API', sub: 'producer', x: 240, y: 165, w: 130, kind: 'server', info: 'Ye kya hai: hamara server jo upload ke baad "process karo" request leta hai. Is design mein ye producer hai. Ye heavy kaam khud nahi karta. Bas jobs table mein entry banata hai, queue mein message daalta hai, aur turant 202 Accepted de deta hai. Isliye ye fast aur halka rehta hai.' },
        { id: 'db', label: 'Jobs table', sub: 'status', x: 240, y: 55, w: 130, kind: 'data', info: 'Ye kya hai: database ki ek table jisme har job ki ek row hai. Status: QUEUED, PROCESSING, DONE, FAILED. User "mera video ready hua?" yahin se dekhta hai. Queue status store karne ki jagah nahi hai; wo sirf kaam pahunchane ki jagah hai.' },
        { id: 'q', label: 'Queue', sub: 'broker', x: 420, y: 165, w: 140, kind: 'queue', info: 'Ye kya hai: broker (RabbitMQ / SQS), yaani kaam ki line. Messages ko durable tareeke se rakhta hai jab tak koi worker unhe successfully process karke ack na kar de. Ek message ek hi worker ko diya jaata hai (point-to-point).' },
        { id: 'w1', label: 'Worker 1', sub: 'consumer', x: 620, y: 75, w: 150, kind: 'server', info: 'Ye kya hai: ek machine jo sirf video convert karti hai (consumer). Queue se message leta hai, kaam karta hai (transcode, email), phir broker ko ack bhejta hai: "ho gaya, ab delete kar do". Workers stateless hote hain, to inhe 2 se 200 karna aasaan hai.' },
        { id: 'w2', label: 'Worker 2', sub: 'consumer', x: 620, y: 255, w: 150, kind: 'server', info: 'Ye kya hai: Worker 1 jaisi doosri machine. Dono workers same queue se messages lete hain, isliye kaam apne aap baant jaata hai. Ise competing consumers pattern kehte hain.' },
        { id: 'dlq', label: 'Dead-letter Q', sub: 'kharab messages', x: 420, y: 290, w: 140, kind: 'queue', hidden: true, info: 'Ye kya hai: dead-letter queue (DLQ), kharab messages ki alag line. Jo message baar baar fail ho, use main queue se hata ke yahan rakh dete hain, taaki wo baaki kaam ko block na kare. Engineer baad mein dekh ke fix karta hai aur message wapas bhej sakta hai (redrive).' },
      ],
      edges: [{ a: 'u', b: 'api' }, { a: 'api', b: 'db' }, { a: 'api', b: 'q' }, { a: 'q', b: 'w1' }, { a: 'q', b: 'w2' }, { a: 'w1', b: 'db', id: 'wd' }, { a: 'q', b: 'dlq', id: 'qd', hidden: true }],
      scenarios: [
        { name: 'Happy path', steps: [
          { title: 'Upload complete, processing maango', text: 'Riya ka video upload ho gaya. App bolti hai: ise process karo.', go: 'u>api', msg: 'POST /videos/7/process' },
          { title: 'Job record banao', text: 'API jobs table mein ek row likhta hai: job 42, status QUEUED.', go: ['api>db', 'res:db>api'], after: { db: { sub: 'job 42: QUEUED' } }, msg: 'INSERT INTO jobs (id, video_id, status) VALUES (42, 7, \'QUEUED\')' },
          { title: 'Queue mein message daalo', text: 'Message chhota hai: sirf job ID aur video ID. Video file khud queue mein nahi jaati (wo bahut badi hai). Broker message ko disk pe save karke producer ko "mil gaya" bolta hai.', go: 'api>q', after: { q: { sub: '1 message' } }, msg: 'SEND  { "job_id": 42, "video_id": 7 }' },
          { title: 'Turant jawab: 202 Accepted', text: 'Upload request ~200 ms mein khatam. Riya app band kar sakti hai. Server ka thread free.', go: 'res:api>u', msg: '202 Accepted\n{ "job_id": 42, "status": "QUEUED" }' },
          { title: 'Worker message leta hai', text: 'Worker 1 queue se message receive karta hai. Abhi message <strong>delete nahi</strong> hua. Wo "in-flight" hai: doosre workers ko nahi dikhta, lekin broker ke paas abhi bhi hai.', go: 'q>w1', set: { w1: { state: 'hot', sub: 'transcoding...' } }, after: { q: { sub: 'msg 42: in-flight' } } },
          { title: 'Kaam khatam, status update, ack', text: 'Transcoding ho gayi. Worker status DONE likhta hai, phir broker ko <strong>ack</strong> bhejta hai. Ack milne pe hi broker message delete karta hai.', go: ['w1>db', 'w1>q'], after: { w1: { state: 'ok', sub: 'done' }, db: { sub: 'job 42: DONE' }, q: { sub: 'empty' } }, msg: 'UPDATE jobs SET status = \'DONE\' WHERE id = 42\nACK msg 42   →  broker deletes it' },
          { title: 'Riya ko kaise pata chala?', text: 'App ya to thodi thodi der mein <code>GET /jobs/42</code> poochhti hai (polling), ya server push notification / SSE bhejta hai. Ye dono agle "realtime" lesson mein.', go: ['u>api>db', 'res:db>api>u'], msg: 'GET /jobs/42  →  { "status": "DONE" }' },
        ]},
        { name: 'Worker crash (ack se pehle)', intro: 'Worker kaam ke beech mein mar gaya. Message kho jaayega?', steps: [
          { title: 'Worker 1 ne message liya', text: 'Message 42 in-flight hai.', go: 'q>w1', set: { w1: { state: 'hot', sub: 'transcoding...' } }, after: { q: { sub: 'msg 42: in-flight' } } },
          { title: 'Crash!', text: 'Worker 1 ka machine gir gaya (memory khatam, deploy, hardware). Ack kabhi nahi aaya.', set: { w1: { state: 'down', sub: 'CRASHED' } }, go: 'lost:w1>q' },
          { title: 'Broker message wapas line mein daalta hai', text: '<strong>SQS</strong> mein: message ka <strong>visibility timeout</strong> (default 30 second) khatam hone pe wo phir se dikhne lagta hai. <strong>RabbitMQ</strong> mein: worker ka connection band hote hi unacked message turant requeue ho jaata hai, "redelivered" flag ke saath.', focus: ['q'], after: { q: { state: 'warn', sub: 'msg 42: visible' } } },
          { title: 'Worker 2 ko mila, kaam pura', text: 'Worker 2 ne same message liya, kaam kiya, ack kiya. Message khoya nahi. Isko <strong>at-least-once delivery</strong> kehte hain: message kam se kam ek baar zaroor process hoga.', go: ['q>w2', 'w2>q'], set: { w2: { state: 'hot', sub: 'transcoding...' } }, after: { w2: { state: 'ok', sub: 'done + ack' }, q: { state: '', sub: 'empty' } } },
          { title: 'Chhupa hua khatra: duplicate', text: 'Socho Worker 1 crash se pehle followers ko email bhej chuka tha. Ab Worker 2 phir bhejega. Followers ko <strong>do emails</strong>. At-least-once ka matlab hai "kabhi kabhi do baar". Isliye consumer ko <strong>idempotent</strong> banana padta hai: same message do baar aaye to bhi asar ek hi baar ho (neeche crash lab mein khel ke dekho).', focus: ['w2'] },
        ]},
        { name: 'Poison message → DLQ', intro: 'Ek video file corrupt hai. Transcoder har baar us pe crash/fail hoga.', steps: [
          { title: 'Attempt 1: fail', text: 'Worker 1 ne message 99 liya, file corrupt, error. Worker <strong>nack</strong> bhejta hai ("nahi ho paya") ya bas ack nahi karta.', go: ['q>w1', 'bad:w1>q'], set: { w1: { state: 'warn', sub: 'error!' } }, after: { q: { sub: 'msg 99: attempt 1' } } },
          { title: 'Retry, backoff ke saath', text: 'Message wapas aata hai aur doosra worker try karta hai. Achha system har retry ke beech wait badhata hai (1 s, 2 s, 4 s...), taaki agar problem temporary ho (DB thodi der down) to use theek hone ka time mile.', go: ['q>w2', 'bad:w2>q'], set: { w2: { state: 'warn', sub: 'error!' } }, after: { q: { sub: 'msg 99: try 2..5' } } },
          { title: 'Limit cross: DLQ mein bhejo', text: 'Ye message kabhi successful nahi hoga. Agar hamesha retry karte rahe to workers ka time barbaad aur baaki messages ruke. Isliye limit: SQS mein <code>maxReceiveCount</code> (maan lo 5), RabbitMQ quorum queue mein <code>delivery-limit</code>. Limit ke baad message <strong>dead-letter queue</strong> mein chala jaata hai.', show: ['dlq', 'qd'], go: 'bad:q>dlq', after: { dlq: { state: 'warn', sub: 'msg 99 + alarm' }, q: { sub: 'normal' }, w1: { state: '' }, w2: { state: '' } } },
          { title: 'Baaki kaam normal chalta hai', text: 'Ek kharab message ne poori line nahi roki.', parallel: true, go: ['q>w1', 'q>w2'], after: { w1: { state: 'ok', sub: 'ok' }, w2: { state: 'ok', sub: 'ok' } } },
          { title: 'Engineer fix karta hai, redrive', text: 'DLQ pe alarm laga hai. Engineer ne dekha: ek naye video format ka bug tha. Code fix kiya, phir DLQ ke messages wapas main queue mein bhej diye (<strong>redrive</strong>).', go: 'evt:dlq>q', after: { dlq: { state: '', sub: 'empty' } } },
        ]},
        { name: 'Spike absorb', intro: 'Raat 9 baje ek bada creator live aaya. Uploads 5 guna.', steps: [
          { title: 'Uploads ki baarish', text: 'Har upload API se queue mein. API ka kaam halka hai (ek insert, ek send), to API bach gaya.', flood: { paths: ['u>api>q'], n: 14 }, after: { q: { state: 'warn', sub: 'depth: 21,000' }, api: { state: 'ok' } } },
          { title: 'Workers apni hi speed pe', text: 'Workers pe bojh nahi badha: wo pehle jitni hi speed se messages lete rahe. Queue ne extra kaam ko "store" kar liya. Isko <strong>queue-based load levelling</strong> kehte hain: aane wala traffic oopar neeche, processing steady.', parallel: true, go: ['q>w1', 'q>w2'], set: { w1: { state: 'hot', sub: 'steady pace' }, w2: { state: 'hot', sub: 'steady pace' } } },
          { title: 'Keemat: der', text: 'Kuch nahi gira, lekin jo video 9:05 pe aaya wo shayad 9:30 pe ready hua. Async ka trade-off: <strong>availability ke badle latency</strong>. Fix: queue depth ya "sabse purane message ki age" dekh ke workers autoscale karo.', focus: ['q'] },
          { title: 'Agar spike khatam hi na ho?', text: 'Agar producers hamesha consumers se tez hain, queue anant tak nahi badh sakti (disk/memory khatam). Tab system ko producer ko <strong>"ruko"</strong> bolna padta hai: queue ki max length set karo, aur API naye jobs pe 503 / 429 + Retry-After de. Ye <strong>backpressure</strong> hai.', go: ['u>api', 'bad:api>u'], after: { q: { state: 'hot', sub: 'FULL (max length)' } }, msg: '503 Service Unavailable\nRetry-After: 60' },
        ]},
      ],
    },

    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Queue lagane se kaam fast ho jaata hai." Nahi! Transcoding ab bhi 3 minute leti hai. Queue kaam ko <strong>request ke raaste se hata deti hai</strong> aur traffic ko smooth karti hai. Total kaam utna hi hai; agar workers kam hain to backlog banega. Throughput badhana hai to workers badhao.` },

    { type: 'callout', tone: 'term', title: 'Backlog aur queue-based load levelling', html: `<strong>Ye kya hai:</strong> backlog = queue mein jama hua, abhi tak na hua kaam. Load levelling = queue ko producer aur workers ke beech "shock absorber" ki tarah lagana: aane wala traffic oopar neeche ho, workers ek steady speed se kaam karein.<br><strong>Kyun chahiye:</strong> workers ko <strong>peak</strong> ke liye nahi, <strong>average</strong> traffic ke liye size kar sakte ho. Sasta.<br><strong>Iske bina:</strong> ya to peak ke hisaab se 5 guna machines (zyadatar time khaali), ya spike pe sab girta hai.<br><strong>Shart:</strong> average load capacity se kam ho, aur users thodi der jhel sakein.` },
    { type: 'callout', tone: 'term', title: 'Backpressure', html: `<strong>Ye kya hai:</strong> slow hissa tez hisse ko "dheere karo" ya "abhi nahi" ka signal bheje. Jaise queue full ho to API naye jobs pe <code>503</code> / <code>429</code> + <code>Retry-After</code> lautaye.<br><strong>Kyun chahiye:</strong> queue anant tak nahi badh sakti. Disk/memory khatam hogi aur broker khud gir jaayega.<br><strong>Iske bina:</strong> sab kuch dheere dheere doobta hai, aur aakhir mein ek saath girta hai.` },
    { type: 'h2', text: 'Simulator: spike, backlog aur backpressure' },
    { type: 'p', html: `120 minute ka din. Minute 10 se 20 tak spike aata hai. Har worker 60 jobs per minute karta hai. Sliders ghuma ke dekho: queue kitni lambi hoti hai, sabse purana job kitni der wait karta hai, kab queue full hoke requests reject hone lagti hain (backpressure), aur poison messages capacity kaise khaate hain.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Normal jobs / minute: <strong class="qs-vbase"></strong></label><input class="qs-base" type="range" min="100" max="2000" step="50" value="600"></div>
          <div><label>Spike ke time jobs / minute: <strong class="qs-vspike"></strong></label><input class="qs-spike" type="range" min="0" max="6000" step="100" value="3000"></div>
          <div><label>Workers (60 jobs/min each): <strong class="qs-vw"></strong></label><input class="qs-w" type="range" min="1" max="60" step="1" value="15"></div>
          <div><label>Queue max length: <strong class="qs-vmax"></strong></label><input class="qs-max" type="range" min="5000" max="100000" step="5000" value="50000"></div>
          <div><label>Poison messages (har ek 5 baar try, phir DLQ): <strong class="qs-vp"></strong></label><input class="qs-p" type="range" min="0" max="20" step="1" value="0"></div>
        </div>
        <svg class="qs-chart" viewBox="0 0 600 210" style="width:100%;height:auto;display:block;margin-top:12px" role="img" aria-label="Queue depth over 120 minutes"></svg>
        <div class="stats">
          <div class="stat"><span>Max queue depth</span><strong class="qs-o-max"></strong></div>
          <div class="stat"><span>Sabse lamba wait</span><strong class="qs-o-wait"></strong></div>
          <div class="stat"><span>Rejected (503)</span><strong class="qs-o-rej"></strong></div>
          <div class="stat"><span>DLQ mein</span><strong class="qs-o-dlq"></strong></div>
          <div class="stat"><span>Backlog khatam</span><strong class="qs-o-drain"></strong></div>
        </div>
        <div class="calc-note qs-note"></div>`;
      const $ = c => el.querySelector(c);
      const fmt = n => Math.round(n).toLocaleString('en-IN');
      const T = 120, SP0 = 10, SP1 = 20, TRIES = 5;
      const upd = () => {
        const base = +$('.qs-base').value, spike = Math.max(base, +$('.qs-spike').value);
        const W = +$('.qs-w').value, maxLen = +$('.qs-max').value, p = +$('.qs-p').value / 100;
        $('.qs-vbase').textContent = fmt(base); $('.qs-vspike').textContent = fmt(spike);
        $('.qs-vw').textContent = W; $('.qs-vmax').textContent = fmt(maxLen); $('.qs-vp').textContent = Math.round(p * 100) + '%';
        const cap = W * 60, eff = cap / (1 + (TRIES - 1) * p);
        let q = 0, rej = 0, dlq = 0, maxQ = 0, maxWait = 0, drain = null; const depth = [];
        for (let t = 0; t < T; t++) {
          const arr = t >= SP0 && t < SP1 ? spike : base;
          q += arr;
          if (q > maxLen) { rej += q - maxLen; q = maxLen; }
          const done = Math.min(q, eff);
          q -= done; dlq += done * p;
          depth.push(q);
          maxQ = Math.max(maxQ, q); maxWait = Math.max(maxWait, q / eff);
          if (t >= SP1 && drain === null && q < 1) drain = t;
        }
        const top = Math.max(maxQ, 1000) * 1.15, X = i => 46 + i * (540 / (T - 1)), Y = v => 180 - (v / top) * 160;
        const pts = depth.map((v, i) => X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ');
        const maxLine = maxLen <= top ? `<line x1="46" x2="586" y1="${Y(maxLen)}" y2="${Y(maxLen)}" stroke="var(--red)" stroke-dasharray="5 4"/><text x="584" y="${Y(maxLen) - 5}" text-anchor="end" font-size="13" fill="var(--red)" font-family="var(--f-mono)">max length</text>` : '';
        $('.qs-chart').innerHTML = `<rect x="${X(SP0)}" y="20" width="${X(SP1) - X(SP0)}" height="160" fill="var(--accent-soft)"/>
          <text x="${(X(SP0) + X(SP1)) / 2}" y="16" text-anchor="middle" font-size="13" fill="var(--ink-3)" font-family="var(--f-mono)">spike</text>
          <line x1="46" x2="586" y1="180" y2="180" stroke="var(--line-2)"/><line x1="46" x2="46" y1="20" y2="180" stroke="var(--line-2)"/>
          <text x="40" y="24" text-anchor="end" font-size="13" fill="var(--ink-3)" font-family="var(--f-mono)">${fmt(top)}</text>
          <text x="40" y="183" text-anchor="end" font-size="13" fill="var(--ink-3)" font-family="var(--f-mono)">0</text>
          <text x="316" y="200" text-anchor="middle" font-size="13" fill="var(--ink-3)" font-family="var(--f-mono)">minute 0 → 120 (line = queue mein pending jobs)</text>
          ${maxLine}<polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>`;
        $('.qs-o-max').textContent = fmt(maxQ);
        $('.qs-o-wait').textContent = maxWait < 1 ? '< 1 min' : maxWait.toFixed(1) + ' min';
        $('.qs-o-rej').textContent = fmt(rej);
        $('.qs-o-dlq').textContent = fmt(dlq);
        $('.qs-o-drain').textContent = maxQ < 1 ? 'kabhi bana hi nahi' : drain === null ? '120 min mein nahi' : 'minute ' + drain;
        let note;
        if (base >= eff) note = `Normal traffic (${fmt(base)}/min) hi workers ki asli capacity (${fmt(eff)}/min) se zyada hai. Queue kabhi khaali nahi hogi, bas badhti jaayegi. Queue sirf spikes absorb karti hai, lagataar overload nahi. Workers badhao, ya backpressure se producers ko roko.`;
        else if (rej > 0) note = `Spike itna bada tha ki queue max length tak bhar gayi aur ${fmt(rej)} jobs reject hue (API ne 503/429 diya). Ye backpressure hai: ghabraahat mein sab girane se behtar hai saaf "abhi nahi" bolna. Limit badhao, workers badhao, ya client ko baad mein retry karne do.`;
        else if (drain === null) note = `Queue ne spike sambhal liya, lekin backlog 120 minute mein bhi khatam nahi hua: spike ke baad workers ke paas sirf ${fmt(eff - base)} jobs/min ki extra capacity bachti hai. Users ko ghanton wait. Autoscaling chahiye.`;
        else note = `Queue ne spike absorb kar liya: koi request reject nahi hui. Spike ke time har minute ${fmt(spike - eff)} jobs zyada aaye, wo queue mein jama hue, aur baad mein ${fmt(eff - base)}/min ki extra capacity se khatam hue. Keemat: sabse bura job ~${maxWait.toFixed(0)} minute ruka.`;
        if (p > 0) note += ` Poison messages ${Math.round(p * 100)}% hain, lekin har ek 5 baar try hota hai, isliye wo capacity ka ${Math.round((1 - 1 / (1 + (TRIES - 1) * p)) * 100)}% kha gaye (asli capacity ${fmt(cap)}/min se ghat ke ${fmt(eff)}/min). DLQ isi barbaadi ko seemit rakhta hai.`;
        $('.qs-note').textContent = note;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'tip', html: `Default values pe: 15 workers = 900 jobs/min capacity. Spike mein 3,000/min aaye, to 10 minute tak har minute 2,100 jama: backlog ~21,000. Spike ke baad sirf 300/min extra capacity, to khatam hone mein ~70 minute. Ab "Poison" ko 5% karo: capacity ~17% gir jaati hai aur backlog 120 minute mein khatam hi nahi hota. Ek chhota sa bug kitna mehnga hai!` },

    { type: 'h2', text: 'Point-to-point vs pub/sub' },
    { type: 'p', html: `Ab tak ki queue <strong>point-to-point</strong> thi: ek message, ek worker. Lekin "video upload hua" ki khabar mein teen alag teams interested hain: transcoder, email service, analytics. Har ek ko apni <em>copy</em> chahiye. Isko <strong>publish/subscribe (pub/sub)</strong> kehte hain.` },
    { type: 'compare',
      left: { title: 'Point-to-point (queue)', html: `• Ek message → <strong>ek</strong> consumer<br>• Kai workers aapas mein kaam baant-te hain<br>• "Ye kaam karo" type messages<br>• Example: transcode job, email bhejna` },
      right: { title: 'Pub/sub (topic / fanout)', html: `• Ek message → <strong>har subscriber</strong> ko copy<br>• Publisher ko nahi pata kaun kaun sun raha hai<br>• "Ye hua" type events<br>• Example: video.uploaded → transcoder, email, analytics` },
    },
    { type: 'callout', tone: 'term', title: 'Point-to-point queue', html: `<strong>Ye kya hai:</strong> ek line, kai workers. Har message <strong>sirf ek</strong> worker ko milta hai. Workers aapas mein kaam baant lete hain (isko <strong>competing consumers</strong> bhi kehte hain).<br><strong>Kyun chahiye:</strong> "ye video convert karo" jaisa kaam ek hi baar hona chahiye. Do workers same video banayein to barbaadi.<br><strong>Iske bina:</strong> kaam baantne ka koi saaf tareeka nahi.<br><strong>Example:</strong> 6 transcode jobs, 3 workers → har worker ko lagbhag 2.` },
    { type: 'callout', tone: 'term', title: 'Pub/sub (publish / subscribe)', html: `<strong>Ye kya hai:</strong> ek message, kai <strong>subscribers</strong> (sunne wale), aur har subscriber ko apni copy. Bhejne wala (<strong>publisher</strong>) ek baar "ye hua" bolta hai, aur jisne bhi subscribe kiya hai sab ko khabar mil jaati hai.<br><strong>Kyun chahiye:</strong> "video upload hua" pe teen teams ko kaam karna hai. Upload API teeno ko alag alag call kare, to har nayi team ke liye API ka code badalna padega.<br><strong>Iske bina:</strong> publisher sab ko jaanta hai, sab se juda hai. Ek subscriber slow, to publisher bhi slow.<br><strong>Example:</strong> 6 upload events, 3 subscribers → 18 copies (har subscriber ko 6).` },
    { type: 'callout', tone: 'term', title: 'Exchange aur binding (RabbitMQ)', html: `<strong>Ye kya hai:</strong> RabbitMQ mein producer seedha queue mein nahi, ek <strong>exchange</strong> (chhantne wali machine) mein message bhejta hai. Exchange <strong>bindings</strong> (rules) dekh ke message ek ya kai queues mein daalta hai. Types: <strong>direct</strong> (routing key bilkul match), <strong>fanout</strong> (har judi queue ko copy), <strong>topic</strong> (pattern match, jaise <code>video.*</code>), <strong>headers</strong> (headers match).<br><strong>Kyun chahiye:</strong> isi se ek hi broker point-to-point aur pub/sub dono kar leta hai.<br><strong>Iske bina:</strong> producer ko har queue ka naam pata hona padta.<br><strong>AWS pe:</strong> yahi kaam <strong>SNS topic → kai SQS queues</strong> karte hain (har subscriber ki apni SQS queue).` },
    { type: 'p', html: `<strong>Pub/sub lab.</strong> 6 upload events (v1 se v6). Mode chuno aur dekho kis consumer ko kaunsa message mila. "Email service down" on karo: durable queue mein message intezaar karta hai, Redis Pub/Sub jaise plain pub/sub mein wo kho jaata hai.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="qp-modes" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <label style="display:block;margin-top:10px;font:14px var(--f-body);color:var(--ink-2)"><input class="qp-down" type="checkbox"> Email service (ya Worker 2) v4, v5 ke time down</label>
        <div class="qp-grid" style="margin-top:12px;display:grid;gap:6px"></div>
        <div class="stats">
          <div class="stat"><span>Kul deliveries</span><strong class="qp-tot"></strong></div>
          <div class="stat"><span>Intezaar ke baad mile</span><strong class="qp-late"></strong></div>
          <div class="stat"><span>Kho gaye</span><strong class="qp-lost"></strong></div>
        </div>
        <div class="calc-note qp-note"></div>`;
      const MODES = { p2p: 'Point-to-point: 1 queue, 3 workers', ps: 'Pub/sub: 3 subscribers (durable)', psg: 'Pub/sub + har subscriber mein 2 workers', redis: 'Plain pub/sub (Redis, no storage)' };
      const M = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'], DOWN = ['v4', 'v5'];
      let mode = 'p2p';
      const run = () => {
        const down = el.querySelector('.qp-down').checked;
        const box = el.querySelector('.qp-modes'); box.innerHTML = '';
        Object.entries(MODES).forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small' + (mode === k ? ' primary' : ''); b.textContent = v; b.onclick = () => { mode = k; run(); }; box.appendChild(b); });
        const rows = []; let tot = 0, late = 0, lost = 0;
        if (mode === 'p2p') {
          const W = { 'Worker 1': [], 'Worker 2': [], 'Worker 3': [] }, names = Object.keys(W); let k = 0;
          M.forEach(m => { const av = names.filter(n => !(down && n === 'Worker 2' && DOWN.includes(m))); W[av[k % av.length]].push({ m }); k++; tot++; });
          names.forEach(n => rows.push([n, W[n]]));
        } else {
          const subs = ['Transcoder', 'Email', 'Analytics'];
          subs.forEach(sb => {
            const got = M.map(m => {
              if (down && sb === 'Email' && DOWN.includes(m)) { if (mode === 'redis') { lost++; return { m, lost: 1 }; } late++; tot++; return { m, late: 1 }; }
              tot++; return { m };
            });
            if (mode === 'psg') { rows.push([sb + ' · w1', got.filter((g, i) => i % 2 === 0)]); rows.push([sb + ' · w2', got.filter((g, i) => i % 2 === 1)]); }
            else rows.push([sb, got]);
          });
        }
        el.querySelector('.qp-grid').innerHTML = rows.map(([n, list]) => `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px"><span style="min-width:120px;font:600 13px var(--f-mono);color:var(--ink-2)">${n}</span>` +
          list.map(g => `<span class="chip${g.lost || g.late ? '' : ' on'}" style="${g.lost ? 'text-decoration:line-through;color:var(--red)' : g.late ? 'color:var(--amber)' : ''}">${g.m}${g.late ? ' (baad mein)' : g.lost ? ' (gaya)' : ''}</span>`).join('') + `</div>`).join('');
        el.querySelector('.qp-tot').textContent = tot;
        el.querySelector('.qp-late').textContent = late;
        el.querySelector('.qp-lost').textContent = lost;
        const N = { p2p: `Har message sirf ek worker ko: 6 messages, 6 deliveries, har worker ke ~2.` + (down ? ' Worker 2 down tha to uski baari ke messages baaki workers ko mil gaye. Kaam ruka nahi.' : ''),
          ps: `Har subscriber ko har message ki copy: 6 × 3 = 18 deliveries.` + (down ? ' Email ki apni durable queue thi, to v4, v5 wahin intezaar karte rahe aur service lautne pe mil gaye.' : ''),
          psg: `Copy har subscriber ko, lekin subscriber ke andar 2 workers point-to-point baant-te hain. Yahi asli duniya ka pattern hai: pub/sub bahar, competing consumers andar.` + (down ? ' Email ke v4, v5 durable queue mein ruke, baad mein mile.' : ''),
          redis: `Plain pub/sub message store nahi karta. Jo us waqt sun raha hai, bas usi ko milta hai.` + (down ? ' Email down tha, to v4, v5 hamesha ke liye gaye. Isliye "khona chalta hai" wale kaam ke liye hi.' : ' Abhi koi down nahi, to sab ko mila. "down" on karke dekho.') };
        el.querySelector('.qp-note').textContent = N[mode];
      };
      el.querySelector('.qp-down').addEventListener('input', run); run();
    }},
    { type: 'flow', title: 'Pub/sub: ek event, teen subscribers', height: 320,
      nodes: [
        { id: 'api', label: 'Upload API', sub: 'publisher', x: 100, y: 160, w: 140, kind: 'server', info: 'Ye kya hai: Upload API, is baar publisher ke roop mein. Ek baar "video.uploaded" event bhejta hai. Use nahi pata ki kitne log sun rahe hain. Kal ek nayi team subscribe kare to Upload API ka code nahi badalta.' },
        { id: 'ex', label: 'Fanout exchange', sub: 'video.uploaded', x: 330, y: 160, w: 160, kind: 'queue', info: 'Ye kya hai: fanout exchange (RabbitMQ) ya SNS topic (AWS), yaani copy banane wali machine. Har subscriber ke liye message ki copy banata hai. Durable setup mein har subscriber ki apni queue hoti hai.' },
        { id: 't', label: 'Transcoder', sub: 'apni queue', x: 590, y: 55, w: 160, kind: 'server', info: 'Ye kya hai: video convert karne wali team ki service. Subscriber 1, apni alag queue ke saath. Uske paas 50 workers ho sakte hain jo us queue ko point-to-point tareeke se baant-te hain.' },
        { id: 'n', label: 'Email service', sub: 'apni queue', x: 590, y: 160, w: 160, kind: 'server', info: 'Ye kya hai: email bhejne wali service. Subscriber 2. Followers ko "naya video" email.' },
        { id: 'a', label: 'Analytics', sub: 'apni queue', x: 590, y: 265, w: 160, kind: 'server', info: 'Ye kya hai: analytics service jo ginti aur charts banati hai. Subscriber 3: upload counts, dashboards.' },
      ],
      edges: [{ a: 'api', b: 'ex' }, { a: 'ex', b: 't' }, { a: 'ex', b: 'n' }, { a: 'ex', b: 'a' }],
      scenarios: [
        { name: 'Fan-out', steps: [
          { title: 'Ek event publish', text: 'Upload API ne ek hi message bheja.', go: 'evt:api>ex', msg: 'PUBLISH video.uploaded { "video_id": 7, "user": "riya" }' },
          { title: 'Teen copies', text: 'Exchange ne har subscriber ki queue mein copy daal di. Teeno apni speed se kaam karenge, ek doosre ko jaane bina.', parallel: true, go: ['evt:ex>t', 'evt:ex>n', 'evt:ex>a'], after: { t: { state: 'ok' }, n: { state: 'ok' }, a: { state: 'ok' } } },
        ]},
        { name: 'Subscriber down (durable queues)', steps: [
          { title: 'Email service down', text: 'Deploy chal raha hai, email service 10 minute ke liye band.', set: { n: { state: 'down', sub: 'DOWN' } }, focus: ['n'] },
          { title: 'Event aaya', text: 'Transcoder aur analytics ko turant mila. Email service ki copy uski <strong>durable queue</strong> mein jama ho gayi.', parallel: true, go: ['evt:api>ex', 'evt:ex>t', 'evt:ex>a'], after: { n: { sub: 'queue: 1 waiting' } } },
          { title: 'Service wapas, backlog process', text: 'Email service ne jama messages utha liye. Kuch nahi khoya.', set: { n: { state: 'ok', sub: 'catching up' } }, go: 'evt:ex>n' },
        ]},
        { name: 'Plain pub/sub (Redis Pub/Sub)', intro: 'Redis Pub/Sub jaisa "fire and forget" system message store nahi karta.', steps: [
          { title: 'Email service disconnected', text: 'Same situation: email service thodi der ke liye gayab.', set: { n: { state: 'down', sub: 'DOWN' } }, focus: ['n'] },
          { title: 'Message sirf online walon ko', text: 'Jo us waqt connected the unhe mila. Email service ke liye message <strong>hamesha ke liye gaya</strong>. Koi queue nahi, koi replay nahi.', parallel: true, go: ['evt:api>ex', 'evt:ex>t', 'evt:ex>a', 'lost:ex>n'] },
          { title: 'To ye kab theek hai?', text: 'Jab message "abhi ke abhi" ka ho aur khona chalta ho: jaise chat message ko us gateway server tak pahunchana jahan user abhi connected hai (asli message to DB mein save hai). Realtime lesson mein yahi dekhenge.', focus: ['ex'] },
        ]},
      ],
    },

    { type: 'h2', text: 'RabbitMQ vs Amazon SQS' },
    { type: 'table', head: ['', 'RabbitMQ', 'Amazon SQS'], rows: [
      ['Kya hai', 'Open-source broker, khud chalao (ya managed service lo)', 'AWS ki fully managed queue, servers ki tension nahi'],
      ['Routing', 'Exchanges + bindings: direct, fanout, topic, headers', 'Sirf queue. Fan-out ke liye SNS topic → kai SQS queues'],
      ['Message milna', 'Broker push karta hai consumers ko (prefetch limit ke saath)', 'Consumer poll karta hai; long polling se 20 second tak wait kar sakta hai'],
      ['Ack nahi aaya to', 'Connection/channel band hone pe requeue; ack timeout (default 30 min) pe channel band', 'Visibility timeout (default 30 s, max 12 h) ke baad message phir visible'],
      ['Ordering', 'Ek queue + ek consumer mein order; kai consumers/requeue pe order toot sakta hai', 'Standard: best-effort order, at-least-once. FIFO: har message group ke andar strict order'],
      ['Duplicates', 'Redelivery possible (at-least-once)', 'Standard: kabhi kabhi duplicate. FIFO: 5 minute ke dedup window mein duplicate sends hata deta hai'],
      ['Message kitni der rukta hai', 'Ack hone tak (chaaho to TTL laga do)', 'Default 4 din, max 14 din; ek message max 1 MiB'],
      ['DLQ', 'Dead-letter exchange: reject (requeue=false), TTL expire, queue length limit, quorum queue delivery-limit (RabbitMQ 4.0+ mein default 20)', 'Redrive policy: maxReceiveCount ke baad DLQ. DLQ se wapas bhejna (redrive) bhi support'],
      ['Kab chuno', 'Complex routing, low latency, apna infra, AMQP protocol (RabbitMQ ki standard "bhasha")', 'AWS pe ho, zero ops chahiye, bahut bada aur unpredictable scale'],
    ]},
    { type: 'callout', tone: 'term', title: 'SQS FIFO queue', html: `<strong>Ye kya hai:</strong> FIFO = First In, First Out. Aisi SQS queue jisme har message ke saath ek <strong>message group ID</strong> hota hai (jaise <code>user_42</code>). Ek group ke messages strict order mein, ek ek karke milte hain: jab tak pehla in-flight hai, agla us group ka nahi milega. Alag groups parallel chalte hain. Saath mein <strong>deduplication ID</strong>: 5 minute ke andar same ID wala message dobara bheja to queue use dobara nahi daalti.<br><strong>Kyun chahiye:</strong> jahan order zaroori hai, jaise ek user ke "account bana" → "naam badla" → "account band" events.<br><strong>Iske bina:</strong> standard queue mein "account band" pehle process ho sakta hai.<br><strong>Dhyaan:</strong> AWS ise "exactly-once processing" kehta hai, lekin ye <em>queue mein duplicate na aane</em> ki guarantee hai. Worker ack se pehle crash ho jaaye to message dobara milega hi. Aur speed kam hai: bina batching ke ~300 calls/second (high-throughput mode mein kaafi zyada).` },

    { type: 'h2', text: 'Delivery semantics: at-most, at-least, exactly-once' },
    { type: 'p', html: `Network aur machines kabhi bhi gir sakte hain. Sawaal ye hai: crash hone pe message ka kya hoga? Teen jawab hain, aur farak mostly ek cheez se aata hai: <strong>worker ack kab bhejta hai</strong>. Ye teen "delivery guarantees" (ya delivery semantics) kehlate hain.` },
    { type: 'callout', tone: 'term', title: 'At-most-once (zyada se zyada ek baar)', html: `<strong>Ye kya hai:</strong> message milte hi ack (ya auto-ack), phir kaam. Kaam ke beech crash hua to message gaya, kyunki broker use pehle hi delete kar chuka.<br><strong>Kyun chahiye:</strong> sabse sasta aur tez. Duplicate kabhi nahi.<br><strong>Iske bina (yaani jab ye galat choice hai):</strong> zaroori kaam (payment, email) chupchaap kho sakta hai.<br><strong>Example:</strong> "typing..." indicator, live viewer count, debug logs. Ek kho gaya to kisi ko fark nahi.` },
    { type: 'callout', tone: 'term', title: 'At-least-once (kam se kam ek baar)', html: `<strong>Ye kya hai:</strong> pehle kaam, phir ack. Ack se pehle crash hua to broker message dobara dega. Message khoyega nahi, lekin kabhi kabhi <strong>do baar</strong> process hoga.<br><strong>Kyun chahiye:</strong> zyadatar kaam khona mehenga hai. SQS, RabbitMQ (manual ack) aur Kafka, sab ka normal tareeka yahi hai.<br><strong>Iske bina:</strong> crash pe kaam gayab.<br><strong>Example:</strong> video transcode do baar hua to bas thoda CPU barbaad. Lekin email do baar gaya to user naraaz.` },
    { type: 'callout', tone: 'term', title: 'Idempotent (do baar karo, asar ek baar)', html: `<strong>Ye kya hai:</strong> aisa kaam jise 1 baar karo ya 5 baar, nateeja same. Jaise lift ka button 5 baar dabao, lift ek hi baar aati hai.<br><strong>Kyun chahiye:</strong> at-least-once mein duplicate aayenge hi. Consumer idempotent ho to duplicate se koi nuksaan nahi.<br><strong>Iske bina:</strong> har retry ek naya side-effect: do emails, do baar paise kate, count do baar badha.<br><strong>Example:</strong> <code>status = 'DONE'</code> 10 baar likho, safe. <code>views = views + 1</code> 10 baar, galat.` },
    { type: 'callout', tone: 'term', title: 'Exactly-once / effectively-once', html: `<strong>Ye kya hai:</strong> message ka <em>asar</em> bilkul ek baar ho. Practically ye <strong>at-least-once + idempotency</strong> se banta hai: duplicate aata hai, lekin system use pehchaan ke ignore karta hai. Isliye kai log ise "effectively-once" kehte hain.<br><strong>Kyun chahiye:</strong> payments, orders, emails, counters, jahan na khona chalega na doubling.<br><strong>Iske bina:</strong> ya loss, ya duplicate. Teesra raasta nahi.` },
    { type: 'table', head: ['Guarantee', 'Kaise', 'Crash pe kya', 'Kab theek'], rows: [
      ['At-most-once', 'Message milte hi ack, phir kaam', 'Kaam ke beech crash = message gaya (loss), lekin duplicate kabhi nahi', 'Metrics, logs, "typing..." indicator: kuch kho jaaye to chalta hai'],
      ['At-least-once', 'Pehle kaam, phir ack', 'Ack se pehle crash = message dobara aayega (duplicate possible), loss nahi', 'Zyadatar systems ka default'],
      ['Exactly-once (effect)', 'At-least-once + idempotent consumer ya dedup', 'Message dobara aa sakta hai, lekin uska <em>asar</em> ek hi baar', 'Payments, orders, emails, counters'],
    ]},
    { type: 'callout', tone: 'mistake', title: '"Exactly-once delivery" ka myth', html: `Distributed system mein ye guarantee karna ki message network pe <em>bilkul ek hi baar</em> pahunche, practically possible nahi: agar ack raste mein kho gaya, sender ko kabhi pata nahi chalega ki message pahuncha ya nahi, to use dobara bhejna hi padega. Jo log "exactly-once" kehte hain unka matlab hota hai <strong>exactly-once processing</strong>: duplicates aayenge, lekin system unhe pehchaan ke ignore karega. Yaani at-least-once + idempotency.` },
    { type: 'h3', text: 'Crash lab: har point pe crash karke dekho' },
    { type: 'p', html: `Worker ka kaam: followers ko "naya video" email bhejna (msg 42). Pehli line mein worker ka style chuno, doosri line mein crash ka point. Log padho, aur "har crash point pe nateeja" wali line dekho: ek style ke liye saare crash points ka result ek saath.<br>Chaar styles: <strong>at-most-once</strong> (auto-ack), <strong>at-least-once</strong> (kaam phir ack), <strong>dedup record</strong> (pehle check "sent:42" likha hai kya, email ke baad record likho), aur <strong>idempotency key</strong> (email provider ko key 42 bhejo, provider khud duplicate pehchaanta hai).` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div style="font:600 13px var(--f-body);color:var(--ink-2);margin-bottom:6px">Worker ka style</div>
        <div class="qd-modes" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div style="font:600 13px var(--f-body);color:var(--ink-2);margin:12px 0 6px">Worker A kab crash hua?</div>
        <div class="qd-crash" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <ol class="qd-log" style="margin:14px 0 0;padding-left:22px;font:13px/1.6 var(--f-mono);color:var(--ink-2)"></ol>
        <div class="stats">
          <div class="stat"><span>Emails gaye</span><strong class="qd-n"></strong></div>
          <div class="stat"><span>Result</span><strong class="qd-r"></strong></div>
        </div>
        <div style="font:600 13px var(--f-body);color:var(--ink-2);margin:12px 0 6px">Is style ka nateeja, har crash point pe</div>
        <div class="qd-matrix" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <div class="calc-note qd-note"></div>`;
      const MODES = { amo: 'At-most-once (auto-ack)', alo: 'At-least-once', idem: 'At-least-once + dedup record', key: 'At-least-once + idempotency key' };
      const CRASH = { none: 'Koi crash nahi', afterRecv: 'Lene ke turant baad', beforeWork: 'Email se pehle', afterWork: 'Email ke turant baad', beforeAck: 'Ack se theek pehle', ackLost: 'Ack network mein kho gaya' };
      const STEPS = { amo: ['recvack', 'work'], alo: ['recv', 'work', 'ack'], idem: ['recv', 'check', 'work', 'record', 'ack'], key: ['recv', 'workkey', 'ack'] };
      let mode = 'alo', crash = 'afterWork';
      const simulate = (mode, crash) => {
        const log = []; let emails = 0, acked = false; const keys = new Set(), sent = new Set();
        const runWorker = (name, crashAt) => {
          const st = STEPS[mode];
          for (let i = 0; i < st.length; i++) {
            const s = st[i], isWork = s === 'work' || s === 'workkey';
            if (crashAt === 'beforeWork' && isWork) { log.push(['x', name + ' CRASH (email se pehle)']); return; }
            if (crashAt === 'beforeAck' && s === 'ack') { log.push(['x', name + ' CRASH (ack se theek pehle)']); return; }
            if (s === 'recvack') { acked = true; log.push(['', name + ' ne msg 42 liya, broker ne turant delete kiya (auto-ack)']); }
            if (s === 'recv') log.push(['', name + ' ne msg 42 liya (in-flight)']);
            if (s === 'check') { if (sent.has(42)) { log.push(['ok', name + ': "sent:42" record mila → email SKIP']); i = st.indexOf('ack') - 1; continue; } log.push(['', name + ': "sent:42" record dekha → nahi hai']); }
            if (s === 'work') { emails++; log.push(['', name + ': email bheja (total ' + emails + ')']); }
            if (s === 'workkey') { if (keys.has(42)) log.push(['ok', name + ': email provider ne key 42 pehchaani → naya email nahi']); else { keys.add(42); emails++; log.push(['', name + ': email bheja, Idempotency-Key: 42 (total ' + emails + ')']); } }
            if (s === 'record') { sent.add(42); log.push(['', name + ': "sent:42" record likha']); }
            if (s === 'ack') { if (crashAt === 'ackLost') log.push(['x', name + ': ACK bheja, lekin network mein kho gaya']); else { acked = true; log.push(['', name + ': ACK → broker ne msg 42 delete kiya']); } }
            if (crashAt === 'afterRecv' && (s === 'recv' || s === 'recvack')) { log.push(['x', name + ' CRASH (lene ke turant baad)']); return; }
            if (crashAt === 'afterWork' && isWork) { log.push(['x', name + ' CRASH (email ke turant baad)']); return; }
          }
        };
        runWorker('Worker A', crash);
        if (!acked) { log.push(['w', 'Broker: ack nahi mila → timeout ke baad msg 42 dobara diya']); runWorker('Worker B', 'none'); }
        else if (emails === 0) log.push(['w', 'Broker: msg 42 to pehle hi delete ho chuka. Koi retry nahi.']);
        return { log, emails };
      };
      const res = n => n === 0 ? 'LOST' : n > 1 ? 'DUPLICATE' : 'OK';
      const col = r => r === 'OK' ? 'var(--green)' : 'var(--red)';
      const btns = (sel, map, get, set) => {
        const box = el.querySelector(sel); box.innerHTML = '';
        Object.entries(map).forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small' + (get() === k ? ' primary' : ''); b.textContent = v; b.onclick = () => { set(k); run(); }; box.appendChild(b); });
      };
      const run = () => {
        btns('.qd-modes', MODES, () => mode, k => mode = k);
        btns('.qd-crash', CRASH, () => crash, k => crash = k);
        const r = simulate(mode, crash), R = res(r.emails);
        const C = { x: 'var(--red)', ok: 'var(--green)', w: 'var(--amber)', '': 'var(--ink-2)' };
        el.querySelector('.qd-log').innerHTML = r.log.map(([k, l]) => `<li style="color:${C[k]}">${l}</li>`).join('');
        el.querySelector('.qd-n').textContent = r.emails;
        const s = el.querySelector('.qd-r'); s.textContent = R; s.style.color = col(R);
        el.querySelector('.qd-matrix').innerHTML = Object.keys(CRASH).map(c => { const x = res(simulate(mode, c).emails); return `<span class="chip" style="color:${col(x)};${c === crash ? 'border-color:var(--accent)' : ''}">${CRASH[c]}: ${x}</span>`; }).join('');
        let note;
        if (R === 'LOST') note = 'At-most-once ka khatra: broker ne message dete hi delete kar diya, kaam hua hi nahi. Follower ko kabhi email nahi milega.';
        else if (R === 'DUPLICATE' && mode === 'idem') note = 'Dedup record ka chhupa gap: email chala gaya, lekin "sent:42" likhne se pehle crash. Worker B ko record nahi mila, to email phir gaya. Email aur record ek saath (atomic) nahi likh sakte, isliye ye gap rehta hai. Fix: idempotency key provider tak bhejo, ya side-effect bhi apne DB mein ho to record ke saath ek hi transaction mein.';
        else if (R === 'DUPLICATE') note = 'At-least-once ka khatra: kaam ho chuka tha, lekin broker tak ack nahi pahuncha. Broker ki nazar mein message process hi nahi hua, to dobara bheja. Follower ko do emails.';
        else if (mode === 'amo' && crash === 'ackLost') note = 'Auto-ack mein alag ack hota hi nahi, broker ne dete hi delete kar diya. To yahan kuch nahi bigda. Lekin "Lene ke turant baad" crash karke dekho.';
        else if (mode === 'key') note = 'Idempotency key har crash point pe bachata hai: duplicate request bhi provider tak pahunche, to wo key dekh ke purana jawab lauta deta hai. Delivery at-least-once, asar exactly-once.';
        else note = r.log.some(l => l[0] === 'ok') ? 'Message do baar aaya, lekin Worker B ne record dekh ke email skip kiya. Delivery at-least-once, asar exactly-once.' : 'Sab theek: email exactly ek baar gaya.';
        el.querySelector('.qd-note').textContent = note;
      };
      run();
    }},
    { type: 'callout', tone: 'tip', html: `Lab ka saar (har style ke 6 crash points pe): <strong>at-most-once</strong> 2 jagah LOST. <strong>At-least-once</strong> 3 jagah DUPLICATE. <strong>Dedup record</strong> sirf 1 jagah DUPLICATE ("email ke turant baad", record likhne se pehle). <strong>Idempotency key</strong> har jagah OK. Isliye "exactly-once" koi broker ki setting nahi, consumer ka design hai.` },
    { type: 'callout', tone: 'tip', title: 'Idempotent consumer kaise banayein', html: `• Har message ka unique ID ho (producer ne diya, jaise <code>job_id</code> ya event ID).<br>• Consumer ek "processed IDs" table rakhe, aur DB change + "ID processed" record <strong>ek hi transaction</strong> mein likhe.<br>• Ya kaam ko khud idempotent banao: <code>status = 'DONE'</code> set karna 10 baar bhi safe hai, <code>count = count + 1</code> nahi.<br>• External APIs (payment, email) ko idempotency key bhejo, jaise Foundations wale idempotency lesson mein dekha.` },

    { type: 'h2', text: 'Retries with backoff' },
    { type: 'p', html: `Message fail hua to turant dobara try karna aksar galat hai. Agar fail isliye hua ki database overloaded hai, to 1,000 workers ka turant retry DB ko aur dabaayega. Isliye retry ke beech <strong>wait badhate jaate hain</strong> (exponential backoff), aur thoda random farak (<strong>jitter</strong>) daalte hain taaki saare workers ek saath retry na karein.` },
    { type: 'table', head: ['Attempt', 'Wait (backoff)', 'Jitter ke saath (example)', 'Kya ho raha hai'], rows: [
      ['1', '-', '-', 'Pehli koshish, fail'],
      ['2', '1 s', '0.7 s', 'Shayad temporary glitch tha'],
      ['3', '2 s', '1.6 s', ''],
      ['4', '4 s', '3.1 s', ''],
      ['5', '8 s', '6.4 s', 'Aakhri koshish'],
      ['-', '-', '-', 'maxReceiveCount = 5 cross → DLQ + alarm'],
    ]},
    { type: 'p', html: `SQS mein backoff ka ek simple tareeka: fail hone pe <code>ChangeMessageVisibility</code> se us message ka visibility timeout badha do. RabbitMQ mein aksar alag "retry" queues banti hain jinke messages TTL ke baad wapas main queue mein dead-letter hote hain. Retries, timeouts aur jitter ki poori kahani "API gateway, retries, circuit breaker" lesson mein hai.` },
    { type: 'callout', tone: 'term', title: 'Exponential backoff aur jitter', html: `<strong>Ye kya hai:</strong> backoff = har fail ke baad agli koshish se pehle ka wait <strong>double</strong> karte jaana (1 s, 2 s, 4 s, 8 s). Jitter = us wait mein thoda random farak daalna, taaki sab ek hi pal pe retry na karein.<br><strong>Kyun chahiye:</strong> agar database thodi der ke liye down hai, to use saans lene ka time chahiye. Aur 1,000 workers ek saath "1 second baad" retry karein to DB pe ek saath 1,000 ka hathoda padta hai.<br><strong>Iske bina:</strong> retries khud hi naya traffic spike ban jaate hain, aur bimaar system theek hi nahi ho paata.` },
    { type: 'p', html: `<strong>Retry + DLQ lab.</strong> Teen tarah ki failure chuno aur <code>maxReceiveCount</code> (kitni baar try ke baad DLQ) badlo. Neeche: 100 messages ek saath fail hue, unke retries kis second pe padte hain, jitter ke saath aur bina.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="qr-sc" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="row2" style="margin-top:10px">
          <div><label>maxReceiveCount: <strong class="qr-vm"></strong></label><input class="qr-m" type="range" min="1" max="8" step="1" value="5"></div>
          <div><label style="display:block;margin-top:18px"><input class="qr-j" type="checkbox"> Jitter on (100 messages ka graph)</label></div>
        </div>
        <div class="qr-tl" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px"></div>
        <div class="stats">
          <div class="stat"><span>Attempts</span><strong class="qr-o-a"></strong></div>
          <div class="stat"><span>Nateeja</span><strong class="qr-o-r"></strong></div>
          <div class="stat"><span>Retries ka peak (per second)</span><strong class="qr-o-p"></strong></div>
        </div>
        <svg class="qr-svg" viewBox="0 0 600 160" style="width:100%;height:auto;display:block;margin-top:8px" role="img" aria-label="Retries per second"></svg>
        <div class="calc-note qr-note"></div>`;
      const SC = { glitch: 'Chhota glitch (2 baar fail)', down: 'Database 20 s down', poison: 'Poison message (hamesha fail)' };
      let sc = 'down';
      const timeline = (sc, max) => { const A = []; let t = 0;
        for (let k = 1; k <= max; k++) { if (k > 1) t += Math.pow(2, k - 2);
          const ok = sc === 'glitch' ? k >= 3 : sc === 'down' ? t >= 20 : false; A.push({ k, t, ok }); if (ok) return { A, ok: true, t }; }
        return { A, ok: false, t }; };
      const herd = jit => { let seed = 42; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647; const B = new Array(17).fill(0);
        for (let m = 0; m < 100; m++) { let t = 0; for (let k = 0; k < 4; k++) { const w = Math.pow(2, k); t += jit ? rnd() * w * 2 : w; if (t < 17) B[Math.floor(t)]++; } } return B; };
      const run = () => {
        const box = el.querySelector('.qr-sc'); box.innerHTML = '';
        Object.entries(SC).forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small' + (sc === k ? ' primary' : ''); b.textContent = v; b.onclick = () => { sc = k; run(); }; box.appendChild(b); });
        const max = +el.querySelector('.qr-m').value, jit = el.querySelector('.qr-j').checked;
        el.querySelector('.qr-vm').textContent = max;
        const r = timeline(sc, max);
        el.querySelector('.qr-tl').innerHTML = r.A.map(a => `<span class="chip" style="color:${a.ok ? 'var(--green)' : 'var(--red)'}">#${a.k} @ ${a.t} s: ${a.ok ? 'OK' : 'fail'}</span>`).join('') + (r.ok ? '' : `<span class="chip" style="color:var(--amber)">→ DLQ + alarm</span>`);
        el.querySelector('.qr-o-a').textContent = r.A.length;
        const o = el.querySelector('.qr-o-r'); o.textContent = r.ok ? 'OK, ' + r.t + ' s pe' : 'DLQ, ' + r.t + ' s pe'; o.style.color = r.ok ? 'var(--green)' : 'var(--red)';
        const B = herd(jit), pk = Math.max(...B), bw = 540 / B.length;
        el.querySelector('.qr-o-p').textContent = pk;
        el.querySelector('.qr-svg').innerHTML = `<line x1="40" x2="580" y1="120" y2="120" stroke="var(--line-2)"/>` +
          B.map((v, i) => `<rect x="${40 + i * bw + 3}" y="${120 - v}" width="${bw - 6}" height="${v}" rx="2" fill="var(--accent)"/>`).join('') +
          `<text x="40" y="146" font-size="14" fill="var(--ink-3)" font-family="var(--f-mono)">second 0</text><text x="580" y="146" text-anchor="end" font-size="14" fill="var(--ink-3)" font-family="var(--f-mono)">16</text>
           <text x="44" y="14" font-size="14" fill="var(--ink-3)" font-family="var(--f-mono)">retries / second (max 100)</text>`;
        let n = sc === 'glitch' ? 'Teesri koshish (3 s pe) chal gayi. Chhote glitch ke liye 2-3 retries kaafi.' : sc === 'down' ? (r.ok ? `Database 20 s pe wapas aaya, aur attempt ${r.A.length} (${r.t} s pe) chal gaya. Backoff ne DB ko saans lene di.` : `DB sirf 20 s down tha, lekin ${max} attempts ${r.t} s mein khatam. Achha message DLQ mein chala gaya! maxReceiveCount itna rakho ki attempts ka total wait normal outages se lamba ho.`) : `Poison message kabhi theek nahi hoga. ${max} attempts ke baad DLQ. Bina limit ke ye hamesha ghoomta rehta.`;
        n += jit ? ` Jitter on: retries bikhar gaye, peak ${pk} per second.` : ` Jitter off: saare 100 retries ek hi second pe (1, 3, 7, 15 s), peak ${pk}. Ise "thundering herd" kehte hain. Jitter on karke dekho.`;
        el.querySelector('.qr-note').textContent = n;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', run)); run();
    }},
    { type: 'callout', tone: 'tip', html: `"Database 20 s down" pe <code>maxReceiveCount</code> = 5: attempts 0, 1, 3, 7, 15 s pe, sab fail, aur ek <em>achha</em> message DLQ mein. 6 karo: attempt 6 (31 s pe) chal jaata hai. Jitter off: 100 retries ek hi second pe (peak 100). Jitter on: peak 63, baaki bikhar gaye.` },
    { type: 'callout', tone: 'warn', title: 'Retry sirf idempotent kaam ka', html: `Retry = same message dobara. Agar consumer idempotent nahi hai, to har retry ek naya duplicate side-effect bana sakta hai. Retries aur idempotency hamesha saath chalte hain.` },

    { type: 'h2', text: 'Dead-letter queue (DLQ), thoda gehrai mein' },
    { type: 'list', items: [
      `<strong>Kyun:</strong> ek <strong>poison message</strong> (jo kabhi successful nahi hoga: corrupt data, code bug, missing record) baar baar retry hoke workers ka time khaata hai. FIFO queue mein to wo apne poore group ko rok deta hai.`,
      `<strong>Kaise:</strong> SQS mein <em>redrive policy</em> pe <code>maxReceiveCount</code>. RabbitMQ mein <em>dead-letter exchange</em> set karo; message reject (requeue=false), TTL expire, queue length limit, ya quorum queue ke delivery-limit pe wahan jaata hai.`,
      `<strong>DLQ ko kabhi chupchaap mat chhodo:</strong> "DLQ mein message aaya" pe alarm lagao. DLQ ek dustbin nahi, ek "hospital" hai: fix karo, phir redrive.`,
      `<strong>Retention ka jaal (SQS):</strong> standard queue mein message ki expiry uske <em>original</em> enqueue time se ginti hai. Message main queue mein 1 din raha, DLQ ki retention 4 din hai, to DLQ mein sirf 3 din bachega. Isliye DLQ ki retention main queue se lambi rakho (SQS max 14 din).`,
      `<strong>Order ka dhyaan:</strong> FIFO queue ke saath DLQ order tod sakta hai (ek message beech se nikal gaya). Jahan sequence sab kuch hai, wahan soch ke use karo.`,
    ]},

    { type: 'h2', text: 'Backpressure' },
    { type: 'p', html: `Queue spikes ko absorb karti hai, lekin agar producer <em>hamesha</em> consumer se tez hai, to queue sirf problem ko aage khisakati hai: memory/disk bharti hai, har job ka wait badhta jaata hai, aur aakhir mein broker khud gir sakta hai. <strong>Backpressure</strong> matlab: slow hissa tez hisse ko "dheere karo" ka signal bheje.` },
    { type: 'table', head: ['Tareeka', 'Kaise', 'Example'], rows: [
      ['Bounded queue + reject', 'Max length; full hone pe naye messages reject. API user ko 503/429 + Retry-After deta hai', 'RabbitMQ <code>max-length</code> with <code>overflow=reject-publish</code>'],
      ['Producer ko block karo', 'Broker producer ki speed dheemi kar deta hai', 'RabbitMQ memory/disk alarm pe publishing connections block karta hai'],
      ['Consumer pe limit', 'Worker ek saath sirf N unacked messages leta hai, taaki khud overload na ho', 'RabbitMQ prefetch; SQS mein worker jitna maange utna hi'],
      ['Consumers badhao', 'Queue depth / oldest message age dekh ke autoscale', 'KEDA, AWS autoscaling on SQS metrics'],
      ['Load shedding', 'Kam zaroori kaam chhod do', 'Analytics events drop, payments nahi'],
    ]},

    { type: 'h2', text: 'Decide: queue kab, kab nahi' },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>Queue ek to-do list hai: har job ek worker ek baar karta hai, phir job gayab.</strong> Rule of thumb: <em>"Ye kaam karo"</em> → queue (SQS, RabbitMQ, Celery/Sidekiq). <em>"Ye hua, aur kai teams ko parwah hai, aur replay chahiye"</em> → Kafka jaisa log (agla lesson). <em>"Abhi jo online hain unhe batao, khona chalta hai"</em> → plain pub/sub (Redis Pub/Sub).` },
    { type: 'table', head: ['Sync rakho jab', 'Async (queue + worker) karo jab'], rows: [
      ['User ko result chahiye aage badhne ke liye (login, page load)', 'Kaam slow hai: seconds se ghante (transcoding, reports, ML)'],
      ['Kaam 1 second se kaafi kam mein hota hai', 'Traffic spiky hai aur smooth karna hai'],
      ['Chain chhoti hai (2-3 hops)', 'Ek event pe kai downstream systems react karte hain'],
      ['Failure turant user ko dikhana hai', 'Third party slow/flaky hai aur retries chahiye'],
    ]},

    { type: 'h2', text: 'Poori picture' },
    { type: 'diagram', title: 'xyz.com upload pipeline: poori picture', height: 505,
      groups: [
        { label: 'Async: baad mein, apni speed se', x: 405, y: 92, w: 310, h: 398 },
      ],
      nodes: [
        { id: 'app', label: 'Riya ka app', sub: 'upload + status', x: 110, y: 60, kind: 'client', info: 'Ye kya hai: user ki xyz.com app. Video file storage mein daalti hai, phir "process karo" bolti hai, aur baad mein status poochhti hai (ya push paati hai).' },
        { id: 's3', label: 'Object storage', sub: 'asli video file', x: 300, y: 60, kind: 'data', info: 'Ye kya hai: badi files ki jagah (S3 jaisi). Kyun: video GBs ki hai, wo queue mein nahi jaati. Message mein sirf video ID jaata hai, worker file yahan se padhta hai.' },
        { id: 'api', label: 'Upload API', sub: 'producer', x: 110, y: 200, kind: 'server', info: 'Ye kya hai: producer. Job row likhta hai, event publish karta hai, aur ~200 ms mein 202 Accepted de deta hai. Heavy kaam kabhi nahi karta, isliye spike mein bhi bachta hai.' },
        { id: 'jobs', label: 'Jobs table', sub: 'QUEUED → DONE', x: 300, y: 360, kind: 'data', info: 'Ye kya hai: har job ka status (QUEUED, PROCESSING, DONE, FAILED). Kyun: queue status batane ki jagah nahi hai. User ka "ready hua?" yahin se jawab paata hai.' },
        { id: 'topic', label: 'Fanout / SNS', sub: 'video.uploaded', x: 300, y: 200, kind: 'queue', info: 'Ye kya hai: pub/sub ka copy banane wala hissa (RabbitMQ fanout exchange ya SNS topic). Ek event, har subscriber queue ko copy. Nayi team aaye to bas nayi queue jodo.' },
        { id: 'tq', label: 'Transcode queue', sub: 'point-to-point', x: 480, y: 150, w: 130, kind: 'queue', info: 'Ye kya hai: transcoder team ki apni durable queue. Andar point-to-point: har job ek hi worker ko. Visibility timeout + heartbeat, maxReceiveCount ke baad DLQ.' },
        { id: 'eq', label: 'Email queue', sub: 'point-to-point', x: 480, y: 295, w: 130, kind: 'queue', info: 'Ye kya hai: email team ki apni queue. Email service down ho to messages yahin intezaar karte hain, khote nahi.' },
        { id: 'tw', label: 'Transcoders', sub: 'worker pool', x: 640, y: 150, w: 130, kind: 'server', info: 'Ye kya hai: video convert karne wali machines. Competing consumers: jitni zyada, utna tez backlog khatam. Queue depth dekh ke autoscale. Kaam idempotent: same output file overwrite.' },
        { id: 'ew', label: 'Email workers', sub: 'idempotency key', x: 640, y: 295, w: 130, kind: 'server', info: 'Ye kya hai: followers ko email bhejne wale workers. Har email ke saath idempotency key, taaki redelivery pe duplicate email na jaaye.' },
        { id: 'dlq', label: 'DLQ + alarm', sub: 'poison messages', x: 480, y: 440, w: 130, kind: 'queue', info: 'Ye kya hai: dead-letter queue. maxReceiveCount ke baad kharab message yahan, aur alarm bajta hai. Engineer fix karke redrive karta hai.' },
        { id: 'mail', label: 'Email provider', sub: 'third party', x: 640, y: 440, w: 130, kind: 'net', info: 'Ye kya hai: bahar ki email company. Slow ya down ho sakti hai. Queue ki wajah se iski problem upload ko nahi girati, sirf email der se jaata hai.' },
      ],
      edges: [
        { a: 'app', b: 's3', n: 1 },
        { a: 'app', b: 'api', n: 2, label: 'process' },
        { a: 'api', b: 'jobs', n: 3, label: 'QUEUED' },
        { a: 'api', b: 'topic', n: 4 },
        { a: 'topic', b: 'tq', kind: 'evt' },
        { a: 'topic', b: 'eq', kind: 'evt' },
        { a: 'tq', b: 'tw', n: 5 },
        { a: 'tw', b: 's3', via: [[640, 60]], label: 'read/write' },
        { a: 'tw', b: 'jobs', n: 6, label: 'DONE', via: [[555, 222], [395, 222]] },
        { a: 'eq', b: 'ew' },
        { a: 'ew', b: 'mail', label: 'send' },
        { a: 'eq', b: 'dlq', kind: 'bad' },
        { a: 'tq', b: 'dlq', kind: 'bad', via: [[555, 185], [555, 440]] },
      ],
      paths: [
        { name: 'Upload', text: 'File storage mein, phir "process karo". API ne row likhi, event daala, aur turant 202 diya.', go: ['app>s3', 'app>api>jobs', 'api>topic', 'res:api>app'] },
        { name: 'Transcode', text: 'Event ki copy transcode queue mein. Ek worker ne liya, file padhi, nayi files likhi, status DONE, phir ack.', go: ['topic>tq>tw>s3', 'tw>jobs'] },
        { name: 'Email + DLQ', text: 'Email queue se worker ne liya aur provider ko bheja. Jo message baar baar fail ho, wo DLQ mein aur alarm baja.', go: ['topic>eq>ew>mail', 'bad:eq>dlq'] },
        { name: 'Status', text: 'App ne poochha "ready hua?". API ne jobs table padh ke DONE bataya. (Push / SSE realtime lesson mein.)', go: ['app>api>jobs', 'res:jobs>api>app'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Queue = kaam ki shared to-do list. Producer daalta hai, worker uthata hai, broker sambhaalta hai. User ko turant 202, kaam baad mein.</li>
      <li>Message tab tak delete nahi hota jab tak ack na aaye. Beech mein wo in-flight (chhupa) rehta hai.</li>
      <li>Visibility timeout job se chhota = duplicate kaam. Bahut bada = crash ke baad lamba wait. Best: chhota timeout + heartbeat.</li>
      <li>At-most-once = kho sakta hai. At-least-once = do baar ho sakta hai. Exactly-once = at-least-once + idempotency (dedup record ya idempotency key).</li>
      <li>Point-to-point = ek message ek worker. Pub/sub = har subscriber ko copy. Asli design: pub/sub bahar, har subscriber ki apni durable queue andar.</li>
      <li>Retries mein exponential backoff + jitter. maxReceiveCount ke baad DLQ + alarm, phir fix aur redrive.</li>
      <li>Queue spikes absorb karti hai, lagataar overload nahi. Wahan backpressure (429/503) ya zyada workers.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['User ko turant jawab (202), request kabhi slow kaam pe nahi atakti', 'Spikes absorb: workers average load ke liye size', 'Decoupling: email provider gire to upload nahi girta', 'Retries + DLQ se failures sambhalna aasaan', 'Workers alag se scale (2 se 200)'],
      costs: ['Ek aur component chalana, monitor karna (broker bhi gir sakta hai)', 'Result der se: user ko status poll ya push chahiye', 'At-least-once = duplicates: har consumer idempotent banana padta hai', 'Ordering kamzor: kai workers/retries order bigaad dete hain', 'Debugging mushkil: ek request ab kai services aur time mein bikhri hai'] },

    { type: 'think', questions: [
      { q: 'xyz.com pe "Password reset email" bhejna hai. Queue lagaoge? Agar haan, to user ko kya dikhaoge aur duplicate email kitna bura hai?', a: 'Haan: email provider slow/down ho to login flow nahi atakna chahiye. User ko turant "agar account hai to email bheja gaya" dikhao. Duplicate reset email chhota nuksaan hai (do links, purana link invalid kar do), lekin email lost hona bura hai, to at-least-once sahi choice hai.' },
      { q: 'SQS visibility timeout 30 second hai aur transcoding 3 minute leti hai. Kya hoga?', a: '30 second baad message phir visible ho jaayega aur doosra worker bhi wahi video transcode karne lagega, phir teesra... Ek video 6 baar process. Fix: visibility timeout kaam ke max time se zyada rakho, ya kaam ke beech mein heartbeat ki tarah ChangeMessageVisibility se badhate raho. Aur consumer idempotent ho.' },
      { q: 'Queue depth 0 hai lekin users shikayat kar rahe hain ki emails nahi aa rahe. Kya dekhoge?', a: 'DLQ! Shayad har message fail hoke DLQ mein ja raha hai (bug, expired API key). Main queue khaali dikhti hai kyunki messages wahan se nikal jaate hain. Isliye DLQ depth pe alarm zaroori hai.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Worker ne message process kiya, lekin ack bhejne se pehle crash ho gaya. At-least-once queue mein kya hoga?', options: ['Message hamesha ke liye kho jaayega', 'Message dobara deliver hoga, kaam do baar ho sakta hai', 'Broker khud kaam pura kar dega'], answer: 1, explain: 'Ack nahi mila to broker maanta hai kaam nahi hua, aur message redeliver karta hai. Isliye consumer idempotent hona chahiye.' },
      { q: 'Ek message har baar consumer ko crash karata hai. Sahi design?', options: ['Hamesha retry karte raho', 'Kuch attempts ke baad dead-letter queue mein bhejo aur alarm lagao', 'Queue delete kar do'], answer: 1, explain: 'Poison message ko limit (maxReceiveCount / delivery-limit) ke baad DLQ mein bhejo, taaki baaki kaam chale, aur engineer use dekh sake.' },
      { q: '"Exactly-once" practically kaise milta hai?', options: ['Broker ki ek setting se, bina consumer badle', 'At-least-once delivery + idempotent processing / dedup', 'At-most-once delivery se'], answer: 1, explain: 'Network pe duplicate rokna possible nahi. Duplicates aane do, lekin consumer unhe pehchaan ke unka asar ek hi baar hone de.' },
      { q: 'Producers lagataar consumers se 2 guna tez hain. Queue lagane se kya hoga?', options: ['Problem hal: queue sab absorb karegi', 'Queue badhti jaayegi; backpressure ya zyada consumers chahiye', 'Messages apne aap fast process honge'], answer: 1, explain: 'Queue sirf temporary spikes absorb karti hai. Lagataar overload pe capacity badhao ya producers ko roko (backpressure).' },
      { q: '"Video upload hua" event transcoder, email aur analytics teeno ko chahiye. Kaunsa pattern?', options: ['Point-to-point queue', 'Pub/sub (fanout), har subscriber ki apni durable queue', 'Synchronous HTTP calls teeno ko'], answer: 1, explain: 'Pub/sub mein har subscriber ko copy milti hai. Durable per-subscriber queue se koi subscriber down ho to bhi message nahi khota.' },
      { q: 'SQS visibility timeout 30 s hai, job 3 minute ka, heartbeat nahi. Kya hoga?', options: ['Sab theek, ek delivery', 'Har 30 s pe message doosre worker ko milega: ek video ~6 baar banegi', 'Message DLQ mein chala jaayega'], answer: 1, explain: 'Timer khatam hote hi SQS maan leta hai worker mar gaya. Deliveries 0, 30, 60, 90, 120, 150 s pe. Fix: chhota timeout + heartbeat (ChangeMessageVisibility), ya timeout job se lamba.' },
      { q: 'Worker "sent:42" record check karta hai, email bhejta hai, phir record likhta hai. Kahan crash pe ab bhi duplicate email jaayega?', options: ['Ack se theek pehle', 'Email ke baad, record likhne se pehle', 'Message lene ke turant baad'], answer: 1, explain: 'Email chala gaya, record nahi bana. Redelivery pe naya worker record nahi paata aur phir bhejta hai. Idempotency key provider tak bhejo, ya side-effect aur record ek transaction mein.' },
    ]},
    { type: 'sources', note: 'Product-specific facts (defaults, limits) inhi official docs se liye gaye hain. Versions ke saath ye badal sakte hain.', items: [
      { title: 'Amazon SQS visibility timeout', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html', used: 'In-flight messages, default 30 s visibility timeout, 12 hour limit, ChangeMessageVisibility, at-least-once note.' },
      { title: 'Exactly-once processing in Amazon SQS (FIFO)', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-exactly-once-processing.html', used: '5-minute deduplication interval, deduplication ID, content-based deduplication.' },
      { title: 'Using dead-letter queues in Amazon SQS', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html', used: 'Redrive policy, maxReceiveCount, retention based on original enqueue time, FIFO ordering caveat, redrive.' },
      { title: 'Consumer Acknowledgements and Publisher Confirms', publisher: 'RabbitMQ documentation', official: true, url: 'https://www.rabbitmq.com/docs/confirms', used: 'Manual vs automatic ack, requeue of unacked deliveries on connection close, redelivered flag, prefetch, nack/reject.' },
      { title: 'Dead Letter Exchanges', publisher: 'RabbitMQ documentation', official: true, url: 'https://www.rabbitmq.com/docs/dlx', used: 'Events that dead-letter a message: reject without requeue, TTL, length limit, delivery limit.' },
      { title: 'Configurable Limits and Timeouts', publisher: 'RabbitMQ documentation', official: true, url: 'https://www.rabbitmq.com/docs/limits', used: 'consumer_timeout default 30 minutes; quorum queue delivery-limit default 20 since 4.0.' },
      { title: 'AMQP 0-9-1 Model Explained', publisher: 'RabbitMQ documentation', official: true, url: 'https://www.rabbitmq.com/tutorials/amqp-concepts', used: 'Exchange types (direct, fanout, topic, headers) and bindings.' },
      { title: 'Amazon SQS message quotas and standard queue quotas', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-messages.html', used: 'Max message size 1 MiB, retention default 4 din / max 14 din, visibility timeout 30 s / 12 h, long polling max 20 s, ~120,000 in-flight (standard), FIFO 300 calls/s bina batching.' },
      { title: 'Exponential Backoff And Jitter (2015)', publisher: 'AWS Architecture Blog (Marc Brooker)', official: true, year: 2015, url: 'https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/', used: 'Exponential backoff, full jitter ka idea, aur kaise jitter retries ki bheed todta hai. Post purani hai lekin idea aaj bhi standard hai.' },
    ]},
  ],
});
