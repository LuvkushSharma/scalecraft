Lesson.register({
  id: 'decide-sync-async',
  title: 'Sync ya async?',
  minutes: 24,
  summary: `Har naye kaam pe ek sawaal: user ko yahin rok ke kaam poora karein (sync), ya "mil gaya, baad mein batayenge" bol ke queue mein daal dein (async)? Is lesson mein signals padhna seekhoge, ek decision helper chalaoge, aur dekhoge galat choice kaise site gira deti hai.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Jab tum app mein koi button dabate ho, do tareeke hain.<br>Pehla: app tumhe rok ke rakhe jab tak kaam poora na ho, phir jawab de. Ye <strong>sync</strong> hai.<br>Doosra: app bole "mil gaya, kaam chal raha hai, ho jaayega to bata denge", aur tum aage badh jao. Ye <strong>async</strong> hai.<br>Chhote kaam ke liye pehla tareeka best hai. Lambe ya bharose na karne layak kaam ke liye doosra.<br>Is lesson mein seekhenge: kaise pehchaanein ki kaunsa kaam kis tareeke se karna hai.` },
    { type: 'h2', text: 'Problem: upload button 40 second atak gaya' },
    { type: 'p', html: `xyz.com ab ek video platform hai. Pichhle lessons mein humne <a href="#/queues">Queue</a>, <a href="#/kafka">Kafka</a> aur <a href="#/resilience">timeouts, retries</a> seekh liye. Ab ek naya developer upload API likhta hai. Uska plan ek seedhi line hai:` },
    { type: 'list', ordered: true, items: [
      'Video save karo.',
      'Video ko transcode karo (360p, 720p, 1080p mein badlo).',
      'Thumbnail (chhoti preview photo) banao.',
      'Search index update karo, taaki video search mein dikhe.',
      '"Upload ho gaya" email bhejo.',
      '<em>Phir</em> user ko jawab do.',
    ]},
    { type: 'p', html: `Sab ek ke baad ek, ek hi request ke andar. User poore time screen pe "Uploading..." dekhta rehta hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Timeout', html: `<strong>Ye kya hai:</strong> intezaar ki ek limit. "Itne second mein jawab nahi aaya, to haar maan lo aur error do."<br><strong>Kyun chahiye:</strong> browser, Load Balancer aur mobile network sab kisi ek request pe hamesha nahi ruk sakte. Unke connections aur memory atke rehte hain.<br><strong>Iske bina:</strong> ek atki hui request hamesha khuli rehti, aur aisi hazaaron requests server ko bhar deti.<br><strong>Example:</strong> AWS Application Load Balancer ka default idle timeout 60 second hai. xyz.com ne apne LB pe 30 second set kiya hai.` },
    { type: 'p', html: `Result: 5 minute ka video transcode hone mein ~40 second lagte hain. LB ka timeout 30 second pe request kaat deta hai. User ko error dikhta hai. Wo dobara upload karta hai. Ab server pe <strong>do</strong> transcoding jobs chal rahe hain. Galti code ki nahi thi, <strong>decision</strong> ki thi: ye kaam sync nahi hona chahiye tha.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Synchronous (sync)', html: `<strong>Ye kya hai:</strong> caller (user ya doosri service) request bhejta hai aur <em>wahin ruka rehta hai</em> jab tak poora kaam khatam ho ke jawab na aa jaaye. Jaise phone call: jab tak saamne wala jawab na de, tum line pe ho. Normal HTTP request/response yahi hai.<br><strong>Kyun chahiye:</strong> jab user ko jawab ke bina aage badhna hi nahi (jaise login), to seedha wait karna sabse simple aur sabse tez hai.<br><strong>Iske bina:</strong> har chhote kaam ke liye bhi "baad mein batayenge" bolna padta. Login jaisa 50 ms ka kaam bhi ajeeb aur slow lagta.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Asynchronous (async)', html: `<strong>Ye kya hai:</strong> server request ko <em>accept</em> karta hai, kaam ko kahin likh deta hai (jaise ek <a href="#/queues">Queue</a> mein), aur turant bolta hai "mil gaya". Asli kaam baad mein hota hai. Jaise WhatsApp message: bhej diya, ab saamne wala jab padhe. Tum apna kaam karte raho.<br><strong>Kyun chahiye:</strong> lambe kaam (minutes) mein user ko rokna namumkin hai. Timeout kaat dega.<br><strong>Iske bina:</strong> upload wali kahani: timeouts, user ka retry, aur double kaam.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Job aur Worker', html: `<strong>Ye kya hai:</strong> <strong>Job</strong> = ek kaam ki parchi, jaise "video 42 ko transcode karo". Har job ka ek ID hota hai (<code>j_42</code>). <strong>Worker</strong> = ek alag background program jo queue se jobs uthata hai aur ek ek karke karta hai. Worker ke saamne koi user wait nahi kar raha.<br><strong>Kyun chahiye:</strong> kaam ko user ki request se alag karna hai. API parchi likhti hai, worker kaam karta hai.<br><strong>Iske bina:</strong> API ko khud sab karna padta, aur user ko tab tak rukna padta.` },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "async = fast"', html: `Async kaam ko <strong>tez nahi</strong> karta. Transcoding ab bhi 40 second leti hai (queue ki wajah se thodi zyada bhi). Fark sirf itna hai ki <em>user ko us 40 second ke liye roka nahi jaata</em>, aur server ka thread/connection free rehta hai. Async "intezaar" ko user se hata ke system ke andar le jaata hai.` },

    { type: 'h2', text: 'Roadmap ka decision table' },
    { type: 'p', html: `Ye table "it depends" ko concrete signals mein badal deta hai. Requirements padhte waqt in signals ko dhoondho:` },
    { type: 'table', head: ['Go synchronous (request / response) jab…', 'Go asynchronous (queue + worker) jab…'], rows: [
      ['User ko result chahiye aage badhne ke liye (login, menu/page fetch karna)', 'Kaam slow hai: seconds se ghante (video transcoding, report generation, ML jobs)'],
      ['Kaam ek second se kaafi kam mein khatam ho jaata hai', 'Traffic spiky hai aur use smooth karna hai (flash sale orders)'],
      ['Calls ki chain chhoti hai (2-3 hops)', 'Ek event pe kai downstream systems react karte hain'],
      ['Failure turant dikhana chahiye', 'Third party slow ya flaky hai aur retries chahiye'],
    ], caption: 'Source: roadmap phase 5, "Synchronous or asynchronous?"' },
    { type: 'callout', tone: 'term', title: 'Naya word: Hop', html: `<strong>Ye kya hai:</strong> ek service se doosri service ko ek network call. User → API → Payment service → Bank = 3 hops.<br><strong>Kyun chahiye (ginna):</strong> har hop thoda time leta hai aur fail ho sakta hai. Hops gin ke pata chalta hai ki sync chain kitni kamzor hai.<br><strong>Iske bina (bina gine):</strong> log 8-10 services ko ek ke baad ek sync call kar dete hain, aur fir sochte hain site slow aur flaky kyun hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Third party aur flaky', html: `<strong>Ye kya hai:</strong> <strong>Third party</strong> = bahar ki company ki service jo tumhare control mein nahi (SMS bhejne wali, email wali, payment wali). <strong>Flaky</strong> = kabhi chalti hai, kabhi timeout ya error deti hai, bina kisi pattern ke.<br><strong>Kyun dhyaan dena hai:</strong> tum unhe theek nahi kar sakte. Bas unki problem se apne users ko bacha sakte ho.<br><strong>Iske bina (sync mein rakha to):</strong> unki har hichki tumhare user ko error ke roop mein dikhegi.` },

    { type: 'h2', text: 'Har row, ek ek karke: scenario, wajah, jaal' },
    { type: 'p', html: `Table ki har line ek <strong>signal</strong> hai: requirement ki wo baat jo decision badal deti hai. Ab har signal ko xyz.com ke ek asli feature pe dekhte hain. Har ek ke saath ek <strong>jaal</strong> (trap) bhi hai: wo galti jo log aksar karte hain.` },
    { type: 'h3', text: 'Sync 1: user ko result chahiye aage badhne ke liye' },
    { type: 'p', html: `<strong>Scenario:</strong> xyz.com pe login. Bina login ke user home page tak nahi ja sakta.<br><strong>Wajah:</strong> user waise bhi ruka hua hai. "Baad mein batayenge" bolne se uska wait khatam nahi hota, bas ek extra poll judta hai.<br><strong>Jaal:</strong> "user ko result chahiye" ka matlab hamesha sync nahi. Video upload mein bhi user ko result chahiye, lekin wo minutes ka kaam hai. Tab bhi async, bas progress dikhao. Ye signal tabhi sync bolta hai jab kaam chhota bhi ho.` },
    { type: 'h3', text: 'Sync 2: kaam ek second se kaafi kam mein khatam' },
    { type: 'p', html: `<strong>Scenario:</strong> video page kholna. Database se title, likes, comments padhna ~30-80 ms.<br><strong>Wajah:</strong> itna chhota kaam queue mein daalna ulta slow hai. Queue ek extra hop hai, aur worker ke uthane ka wait alag.<br><strong>Jaal:</strong> "abhi fast hai" ko hamesha maan lena. Agar page kabhi 5 second ka ho gaya (jaise bina index ki query), to fix query ka hai, async ka nahi.` },
    { type: 'h3', text: 'Sync 3: calls ki chain chhoti hai (2-3 hops)' },
    { type: 'p', html: `<strong>Scenario:</strong> "Like" button: App → Like API → database. 2 hops.<br><strong>Wajah:</strong> kam hops = kam time jodna aur kam failure ke chances. Sync yahan safe hai.<br><strong>Jaal:</strong> chain dheere dheere lambi hoti hai. Aaj Like API sirf DB call karti hai. Kal koi "like pe notification bhi bhej do" sync mein jod deta hai. Har naya side-kaam async event ban sakta hai.` },
    { type: 'h3', text: 'Sync 4: failure turant dikhana hai' },
    { type: 'p', html: `<strong>Scenario:</strong> username choose karna. "riya123 already taken" user ko usi second dikhna chahiye.<br><strong>Wajah:</strong> user isi jawab pe agla kadam leta hai (doosra naam try karta hai). Error baad mein aaye to bekaar.<br><strong>Jaal:</strong> socho "async mein bhi failure dikh sakta hai". Dikh sakta hai, lekin tab tak user aage nikal chuka hota hai. Isliye async design mein bhi jo checks turant ho sakte hain (input sahi hai? login hai?) wo 202 dene se <em>pehle</em> sync mein karo.` },
    { type: 'h3', text: 'Async 1: kaam slow hai (seconds se ghante)' },
    { type: 'p', html: `<strong>Scenario:</strong> video transcoding (minutes), creator ka "monthly earnings report" PDF (minutes), AI se auto-captions (minutes).<br><strong>Wajah:</strong> koi request itna wait nahi kar sakti. Timeout aayega, aur server ka thread (ek request sambhalne wala hissa) poore time bandha rahega.<br><strong>Jaal:</strong> timeout badha ke 10 minute kar dena. Beech ke proxies, mobile network aur user ka sabr waise bhi pehle toot jaayenge.` },
    { type: 'h3', text: 'Async 2: traffic spiky hai, smooth karna hai' },
    { type: 'p', html: `<strong>Scenario:</strong> xyz.com pe "Premium 50% off, sirf 10 baje". 10:00 pe ek minute mein 5 lakh "Buy" clicks. Normal din pe sirf 50 per minute.<br><strong>Wajah:</strong> queue aane wali speed aur kaam karne wali speed ko alag kar deti hai. Clicks queue mein line lagate hain. Workers apni stable speed se kaam karte hain. Isse <a href="#/queues">load levelling</a> kehte hain.<br><strong>Jaal:</strong> queue lagataar overload ka ilaaj nahi. Agar har minute aane wale kaam workers ki capacity se zyada hain, to line bas lambi hoti jaayegi.` },
    { type: 'h3', text: 'Async 3: ek event pe kai systems react karte hain' },
    { type: 'p', html: `<strong>Scenario:</strong> naya video publish hua. Search ko index karna hai, followers ko notification, recommendations ko update, analytics ko count.<br><strong>Wajah:</strong> Upload API ek <strong>event</strong> daal deti hai. Event = ek chhoti khabar ki "ye ho gaya", jaise "video 42 published". Har team apna kaam khud uthati hai. Nayi team aaye to API ka code nahi badalta. Ye <a href="#/queues">pub/sub</a> hai.<br><strong>Jaal:</strong> API se chaaron ko sync call karna. Ek bhi team ki service slow hui, to upload slow. Ek bhi down, to upload fail.` },
    { type: 'h3', text: 'Async 4: third party slow ya flaky, retries chahiye' },
    { type: 'p', html: `<strong>Scenario:</strong> "Video live hai" email ek email company bhejti hai. Kabhi wo 5 second atakti hai, kabhi 503 deti hai.<br><strong>Wajah:</strong> queue mein job rahega to worker araam se retry kar sakta hai, ruk ruk ke (1 s, 2 s, 4 s...). User ka kaam pehle hi ho chuka hai.<br><strong>Jaal:</strong> retry sync request ke andar karna. Teen retries × 5 second = user 15 second se ruka hai. Aur retry tabhi safe hai jab kaam <a href="#/pagination-idempotency">idempotent</a> ho (do baar karne pe bhi asar ek baar).` },

    { type: 'h2', text: 'Chain jitni lambi, utni kamzor' },
    { type: 'p', html: `"Chain chhoti rakho (2-3 hops)" wala rule kahan se aata hai? Sync chain mein har hop ka time <strong>jud</strong> jaata hai, aur har hop ki success chance <strong>guna</strong> ho jaati hai. Agar har service 99.9% time sahi chalti hai, to 3 services ki chain sirf 0.999 × 0.999 × 0.999 ≈ 99.7% time sahi chalegi. Khud dekho:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Sync hops ki chain: <strong class="dsa-vn"></strong></label><input class="dsa-n" type="range" min="1" max="12" step="1" value="3"></div>
          <div><label>Har hop ka time (ms): <strong class="dsa-vl"></strong></label><input class="dsa-l" type="range" min="5" max="500" step="5" value="50"></div>
          <div><label>Har hop ki success: <strong class="dsa-va"></strong></label><input class="dsa-a" type="range" min="0" max="4" step="1" value="2"></div>
          <div><label>Timeout (ms): <strong class="dsa-vt"></strong></label><input class="dsa-t" type="range" min="200" max="30000" step="100" value="1000"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Total time (sum)</span><strong class="dsa-o-lat"></strong></div>
          <div class="stat"><span>Poori chain sahi chale</span><strong class="dsa-o-ok"></strong></div>
          <div class="stat"><span>Har 1 lakh requests mein fail</span><strong class="dsa-o-fail"></strong></div>
        </div>
        <div class="calc-note dsa-note"></div>`;
      const $ = c => el.querySelector(c);
      const AV = [0.99, 0.995, 0.999, 0.9995, 0.9999];
      const upd = () => {
        const n = +$('.dsa-n').value, l = +$('.dsa-l').value, a = AV[+$('.dsa-a').value], t = +$('.dsa-t').value;
        const tot = n * l, ok = Math.pow(a, n), fail = Math.round((1 - ok) * 100000);
        $('.dsa-vn').textContent = n; $('.dsa-vl').textContent = l; $('.dsa-va').textContent = (a * 100).toFixed(2).replace(/0+$/, '').replace(/\.$/, '') + '%'; $('.dsa-vt').textContent = t.toLocaleString('en-IN');
        $('.dsa-o-lat').textContent = tot.toLocaleString('en-IN') + ' ms';
        $('.dsa-o-ok').textContent = (ok * 100).toFixed(2) + '%';
        $('.dsa-o-fail').textContent = fail.toLocaleString('en-IN');
        let note = 'Formula: total time = hops × time per hop; success = (per-hop success)^hops. ';
        if (tot > t) note += `Chain ka total (${tot.toLocaleString('en-IN')} ms) timeout (${t.toLocaleString('en-IN')} ms) se zyada hai: ye request har baar timeout hogi. Ye kaam sync ke laayak nahi, ya chain chhoti karo.`;
        else if (n > 3) note += `${n} hops: roadmap ke 2-3 hop rule se lambi chain. Har extra hop latency badhata hai aur failure ka ek naya darwaza kholta hai. Kuch hops async banao, ya calls parallel karo.`;
        else note += `Chhoti chain, timeout ke andar. Sync yahan theek hai.`;
        $('.dsa-note').textContent = note;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Default values pe (3 hops, 99.9% each) har 1 lakh requests mein ~300 fail hoti hain. 12 hops kar do to ~1,200. Isliye lambi sync chains microservices mein khatarnaak hain: ek slow ya flaky service poori chain ko le doobti hai (yahi <a href="#/resilience">resilience</a> lesson ka "cascading failure" hai).` },

    { type: 'h2', text: 'Async recipe: 5 kadam' },
    { type: 'p', html: `Roadmap har async kaam ke liye ek hi recipe deta hai. <a href="#/queues">Queues</a> lesson mein ise detail mein dekha tha; yahan decision ke nazariye se:` },
    { type: 'steps', items: [
      { t: 'Request accept karo', d: 'Sirf jaldi wale checks sync mein: login hai? file ka size theek hai? input valid hai? Ye galat ho to turant 400 error, kyunki "failure turant dikhana" yahan sach mein zaroori hai.' },
      { t: 'Job store karo', d: 'Database mein ek job row (status = QUEUED) aur queue mein ek message. Ab kaam "yaad" hai, server crash ho jaaye tab bhi nahi khoyega.' },
      { t: '202 Accepted + job ID wapas do', d: '202 ka matlab "request mil gayi, kaam abhi baaki hai". Job ID se user baad mein status pooch sakta hai.' },
      { t: 'Worker queue se job uthaata hai', d: 'Background worker apni speed se kaam karta hai. Fail ho to retry. Baar baar fail ho to dead-letter queue (DLQ) mein: fail hue kaam ki alag line, jise engineer baad mein dekhta hai.' },
      { t: 'Client ko batao', d: 'Chaar tareeke: push notification, SSE, webhook (agar client khud ek server hai), ya client job status poll kare. Kaunsa chunein, ye <a href="#/realtime">real-time</a> lesson ka sawaal hai.' },
    ]},
    { type: 'code', text: `
POST /videos            (file upload)
  → 202 Accepted
    { "job_id": "j_42", "status": "QUEUED", "status_url": "/jobs/j_42" }

GET /jobs/j_42          (client thodi der baad poochta hai)
  → 200 OK  { "status": "PROCESSING", "progress": 60 }

GET /jobs/j_42
  → 200 OK  { "status": "DONE", "video_url": "https://cdn.xyz.com/v/42.m3u8" }` },
    { type: 'callout', tone: 'term', title: 'Naya word: 202 Accepted', html: `<strong>Ye kya hai:</strong> ek HTTP status code. Matlab: "request mil gayi aur accept ho gayi, lekin kaam abhi poora nahi hua". 200 bolta hai "kaam ho gaya". 202 bolta hai "kaam line mein hai".<br><strong>Kyun chahiye:</strong> client ko saaf pata chalta hai ki result abhi nahi aaya, aur use job ID se baad mein poochhna hai.<br><strong>Iske bina:</strong> agar API 200 bhej de, to app samjhegi video ready hai, aur user ko toota hua link dikhega.` },

    { type: 'h2', text: 'Chala ke dekho: galat choice vs sahi choice' },
    { type: 'p', html: `Same upload, do design. Pehle scenario mein sync chain ko girte dekho, phir async version, phir dekho async design failures ko kaise jhelta hai.` },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'u', label: 'User', sub: 'video upload', x: 80, y: 160, w: 120, kind: 'client', info: 'Ye kya hai: xyz.com pe video upload karne wala creator ka app. Browser, LB aur mobile network ke timeouts (~30-60 s) is user ki request ko kaat sakte hain.' },
        { id: 'api', label: 'Upload API', x: 250, y: 160, w: 140, kind: 'server', info: 'Ye kya hai: wo server code jo upload request leta hai. Sync design mein ye khud sab kaam karwata hai aur wait karta hai. Async design mein sirf validate karta hai, job save karta hai, queue mein daalta hai aur turant 202 deta hai.' },
        { id: 'q', label: 'Job queue', sub: 'SQS / RabbitMQ', x: 440, y: 160, w: 130, kind: 'queue', info: 'Ye kya hai: kaam ki parchiyon ki line (queue). Kyun: API aur worker ko alag karti hai. Message tab tak delete nahi hota jab tak worker "ho gaya" (ack) na bole. Worker crash ho jaaye to message wapas dikh jaata hai aur koi doosra worker utha leta hai.' },
        { id: 'w', label: 'Worker', sub: 'background', x: 620, y: 160, w: 120, kind: 'server', info: 'Ye kya hai: background program jo queue se jobs uthaata hai. Spike aaye to jobs queue mein wait karte hain; zyada workers laga ke backlog jaldi khatam kar sakte hain.' },
        { id: 'tr', label: 'Transcoder', sub: '~40 s per video', x: 620, y: 50, w: 140, kind: 'server', info: 'Ye kya hai: wo machine jo video ko alag resolutions mein convert karta hai. CPU-heavy aur slow: seconds se minutes. Sync chain mein rakhne layak bilkul nahi.' },
        { id: 'em', label: 'Email provider', sub: 'third party', x: 620, y: 275, w: 140, kind: 'net', info: 'Ye kya hai: email bhejne wali bahar ki company (third party). Kabhi slow, kabhi 5xx error. Iski hichkiyon ko user ke upload se alag rakhna hai.' },
        { id: 'js', label: 'Jobs table', sub: 'status', x: 440, y: 275, w: 130, kind: 'data', info: 'Ye kya hai: database ki table jisme har job ki ek row hoti hai: QUEUED → PROCESSING → DONE / FAILED. User isi se status dekhta hai, aur duplicate upload pakadne ke liye idempotency key bhi yahin.' },
      ],
      edges: [
        { a: 'u', b: 'api' },
        { a: 'api', b: 'tr', id: 'stx', hidden: true }, { a: 'api', b: 'em', id: 'sem', hidden: true },
        { a: 'api', b: 'q' }, { a: 'q', b: 'w' }, { a: 'w', b: 'tr' }, { a: 'w', b: 'em' },
        { a: 'api', b: 'js' }, { a: 'w', b: 'js' },
      ],
      scenarios: [
        { name: 'Galat: sync chain', intro: 'Upload API sab kuch khud, ek hi request mein karta hai.', steps: [
          { title: 'Upload aaya', text: 'Creator ne 5 minute ka video upload kiya.', show: ['stx', 'sem'], set: { q: { state: 'dim' }, w: { state: 'dim' }, js: { state: 'dim' } }, go: 'u>api', msg: 'POST /videos  (180 MB)' },
          { title: 'API transcoder pe ruki', text: 'API ne transcoder ko call kiya aur <strong>wait</strong> kar rahi hai. Is beech uska thread aur user ka connection dono khule pade hain.', go: 'api>tr', after: { tr: { state: 'hot', sub: 'working... 40 s' }, api: { state: 'warn', sub: 'waiting' } } },
          { title: '30 second: timeout', text: 'Transcoding abhi 75% pe thi, lekin LB ka timeout 30 second hai. User ko error. Server pe kaam chal raha hai, lekin user ko lagta hai fail ho gaya.', go: 'bad:api>u', msg: '504 Gateway Timeout' },
          { title: 'User retry karta hai: double kaam', text: 'User ne dobara upload kiya. Ab transcoder pe <strong>do</strong> same jobs. 1,000 users aisa karein to transcoders pe 2,000 jobs, aur sab timeout. Ye khud ka banaya hua overload hai.', go: 'u>api>tr', after: { tr: { state: 'down', sub: 'overloaded: 2x jobs' } } },
          { title: 'Email kabhi gaya hi nahi', text: 'Chain beech mein toot gayi, to email step tak pahunche hi nahi. Aur agar pahunchte, to email provider ki 5 second ki slowness bhi user ke upload mein judti.', focus: ['em'], set: { em: { state: 'dim' } } },
        ]},
        { name: 'Sahi: async', intro: 'Wahi upload, roadmap ki async recipe ke saath.', steps: [
          { title: 'Upload aur quick checks', text: 'API sirf jaldi wale checks karti hai: logged in? size limit? format? Ye sync hain, kyunki galat ho to user ko turant batana hai.', go: 'u>api', msg: 'POST /videos' },
          { title: 'Job store + queue', text: 'Jobs table mein row (QUEUED) aur queue mein message.', go: ['api>js', 'api>q'], parallel: true, after: { js: { sub: 'j_42: QUEUED' } }, msg: 'INSERT job j_42 QUEUED;  SEND {job: j_42}' },
          { title: '202 Accepted, turant', text: 'User ko ~300 ms mein jawab. App "Processing..." dikha sakti hai, user doosra kaam kar sakta hai.', go: 'res:api>u', msg: '202 Accepted  { "job_id": "j_42" }' },
          { title: 'Worker kaam uthaata hai', text: 'Worker apni speed se job leta hai aur transcode karwata hai. 40 second lagein ya 4 minute, kisi ka connection khula nahi pada.', go: ['q>w', 'w>tr', 'res:tr>w'], after: { js: { sub: 'j_42: PROCESSING' } } },
          { title: 'Email aur status', text: 'Email bheja, job DONE mark kiya.', go: ['w>em', 'w>js'], parallel: true, after: { js: { state: 'ok', sub: 'j_42: DONE' } } },
          { title: 'User ko pata chala', text: 'App ne status poll kiya (ya push notification aaya). Video ready.', go: ['u>api>js', 'res:js>api>u'], msg: 'GET /jobs/j_42  →  { "status": "DONE" }' },
        ]},
        { name: 'Async: worker crash', intro: 'Async design mein failure kaisa dikhta hai?', steps: [
          { title: 'Worker ne job uthaya', go: 'q>w', text: 'Message ab "in flight" hai: queue ne use delete nahi kiya, bas doosre workers se chhupa diya hai, jab tak ye worker "ho gaya" (ack) na bole.', after: { q: { sub: 'j_42 in flight' } } },
          { title: 'Worker crash', text: 'Transcoding ke beech worker ki machine gir gayi. Ack kabhi nahi aaya.', set: { w: { state: 'down', sub: 'CRASH' } }, go: 'lost:w>tr' },
          { title: 'Message wapas aata hai', text: 'Chhupne ki ek time limit hoti hai (SQS mein isse visibility timeout kehte hain). Wo khatam hone pe message phir dikhne lagta hai. Naya worker (restart hua) use utha leta hai. User ko kuch pata nahi chala, bas thoda zyada time laga.', set: { w: { state: 'ok', sub: 'naya worker' }, q: { sub: 'j_42 retry' } }, go: ['q>w', 'w>tr', 'res:tr>w'] },
          { title: 'Keemat: duplicate ho sakta hai', text: 'Kya pata purana worker crash se pehle aadha kaam kar chuka tha. Isliye workers <a href="#/pagination-idempotency">idempotent</a> hone chahiye: same job do baar chale to bhi result ek hi ho.', go: 'w>js', after: { js: { state: 'ok', sub: 'j_42: DONE (once)' } } },
        ]},
        { name: 'Async: email provider flaky', steps: [
          { title: 'Email fail', text: 'Video ready hai, lekin email provider 503 de raha hai.', go: ['w>em', 'bad:em>w'], set: { em: { state: 'warn', sub: '503 errors' } } },
          { title: 'Upload pe koi asar nahi', text: 'User ka upload pehle hi 202 le chuka hai aur video live hai. Email ek alag job hai jo retry ho sakta hai.', set: { js: { state: 'ok', sub: 'video: DONE' } }, focus: ['js'] },
          { title: 'Retry with backoff', text: 'Worker 1s, 2s, 4s... ruk ke dobara try karta hai (exponential backoff). Provider theek hua, email chala gaya. 5 baar bhi fail hota to message DLQ mein jaata aur koi engineer dekhta.', set: { em: { state: 'ok', sub: 'recovered' } }, go: ['w>em', 'res:em>w'] },
        ]},
      ],
    },

    { type: 'h2', text: 'Decision helper: sawaal ka jawab do, recommendation lo' },
    { type: 'p', html: `Har naye feature pe ye 7 sawaal poochho. Neeche ke buttons se ek example load karo, ya khud jawab badal ke dekho recommendation kaise badalta hai. Har jawab ke saath <em>kyun</em> bhi likha aayega.` },
    { type: 'custom',
      Q: [
        { k: 'need', q: 'User ko aage badhne ke liye isi kaam ka result chahiye?', o: ['Haan', 'Nahi'] },
        { k: 'dur', q: 'Kaam kitna time leta hai?', o: ['< 200 ms', '200 ms - 1 s', '1 - 30 s', '> 30 s (minutes/ghante)'] },
        { k: 'hops', q: 'Sync karein to kitne service hops ki chain banegi?', o: ['1-3', '4 ya zyada'] },
        { k: 'fan', q: 'Is ek event pe kai doosre systems ko react karna hai?', o: ['Nahi, bas ek', 'Haan, kai'] },
        { k: 'spiky', q: 'Traffic spiky hai (sale, launch, match)?', o: ['Nahi', 'Haan'] },
        { k: 'flaky', q: 'Koi slow/flaky third party beech mein hai?', o: ['Nahi', 'Haan'] },
        { k: 'failNow', q: 'Failure user ko turant dikhana zaroori hai?', o: ['Nahi', 'Haan'] },
      ],
      presets: {
        'Login': { need: 0, dur: 0, hops: 0, fan: 0, spiky: 0, flaky: 0, failNow: 1 },
        'Video upload': { need: 1, dur: 3, hops: 1, fan: 1, spiky: 0, flaky: 0, failNow: 0 },
        'Flash sale order': { need: 0, dur: 1, hops: 0, fan: 1, spiky: 1, flaky: 0, failNow: 1 },
        'Payment': { need: 0, dur: 1, hops: 0, fan: 1, spiky: 0, flaky: 1, failNow: 1 },
        'Monthly report PDF': { need: 0, dur: 3, hops: 0, fan: 0, spiky: 0, flaky: 0, failNow: 0 },
      },
      // a: answers as option indexes. need: 0 = haan, 1 = nahi.
      decide(a) {
        const need = a.need === 0, why = [], tips = [];
        let v;
        if (a.dur === 3) {
          v = 'async';
          why.push('Kaam minutes/ghante leta hai: koi bhi HTTP request itna wait nahi kar sakti (timeouts ~30-60 s). Ye async ka sabse strong signal hai.');
          if (need) tips.push('User ko result chahiye, isliye 202 + job ID do, progress bar dikhao, aur khatam hone pe push / SSE / email se batao.');
        } else if (a.dur === 2) {
          v = 'async';
          why.push('Kaam seconds leta hai: sync mein thread aur connection itni der bandhe rahenge, aur spike mein server ke saare threads bhar jaayenge.');
          if (need) tips.push('User wait karega, to 202 ke baad SSE ya har 1-2 s poll se live status dikhao. User ko lagna chahiye ki kuch ho raha hai.');
        } else if (need) {
          v = 'sync';
          why.push('User ko result chahiye aur kaam ek second se kam ka hai: seedha request/response sabse simple aur sabse fast hai.');
          const side = [];
          if (a.fan === 1) side.push('kai downstream systems ko batana (event publish karo, unka wait mat karo)');
          if (a.flaky === 1) side.push('flaky third party ko sync path se bahar rakho, ya strict timeout + "pending" state + webhook se baad mein confirm karo');
          if (a.spiky === 1) side.push('spike mein bhaari hissa queue mein daal ke smooth karo; sync mein sirf jaldi wala accept/validate');
          if (side.length) { v = 'hybrid'; why.push('Lekin kuch hisse async hone chahiye: ' + side.join('; ') + '.'); }
        } else {
          const sig = [];
          if (a.fan === 1) sig.push('kai systems react karte hain');
          if (a.spiky === 1) sig.push('traffic spiky hai');
          if (a.flaky === 1) sig.push('third party flaky hai, retries chahiye');
          if (a.hops === 1) sig.push('chain lambi hai');
          if (sig.length) { v = 'async'; why.push('User ko is result ka wait nahi karna, aur ' + sig.join(', ') + '. User ko rokne ka koi faayda nahi.'); }
          else { v = 'either'; why.push('Kaam chhota hai, koi async signal nahi. Sync sabse simple hai; async tabhi jab volume itna ho ki is kaam ko batch karna sasta pade.'); }
        }
        if (a.hops === 1 && (v === 'sync' || v === 'hybrid')) tips.push('4+ hops ki sync chain: har hop latency jodta hai aur failure ka chance guna karta hai. Calls parallel karo, cache karo, ya non-critical hops async banao.');
        if (a.failNow === 1 && (v === 'async' || v === 'hybrid')) tips.push('Jo galtiyan turant pakdi ja sakti hain (invalid input, auth, stock zero) unhe 202 dene se PEHLE sync mein check karo. Baaki failures job status (FAILED) ya notification se.');
        if (a.failNow === 1 && v === 'sync') why.push('Failure turant dikhana hai: sync mein error seedha usi response mein.');
        if (v !== 'sync' && v !== 'either' && a.flaky === 1) tips.push('Retries exponential backoff ke saath, aur workers idempotent rakho taaki retry se kaam do baar na ho.');
        const label = { sync: 'Synchronous', async: 'Asynchronous (queue + worker)', hybrid: 'Hybrid: core sync, baaki async', either: 'Dono chalega: sync se shuru karo' }[v];
        return { v, label, why, tips };
      },
      render(el) {
        const self = this, ans = Object.assign({}, this.presets['Video upload']);
        el.innerHTML = `<div class="dsa-pre" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px"></div><div class="dsa-qs"></div>
          <div class="dsa-out" style="margin-top:14px;padding:14px;border:1px solid var(--line-2);border-radius:var(--r);background:var(--surface-2)"></div>`;
        const pre = el.querySelector('.dsa-pre'), qs = el.querySelector('.dsa-qs'), out = el.querySelector('.dsa-out');
        pre.innerHTML = '<span style="font:13px var(--f-mono);color:var(--ink-3);align-self:center">Example:</span>';
        Object.keys(this.presets).forEach(n => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small ghost'; b.textContent = n; b.onclick = () => { Object.assign(ans, self.presets[n]); draw(); }; pre.appendChild(b); });
        const draw = () => {
          qs.innerHTML = '';
          this.Q.forEach(q => {
            const row = document.createElement('div'); row.style.margin = '0 0 10px';
            row.innerHTML = `<div style="font-weight:600;margin-bottom:5px">${q.q}</div>`;
            const chips = document.createElement('div'); chips.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px';
            q.o.forEach((o, i) => { const c = document.createElement('button'); c.type = 'button'; c.className = 'chip' + (ans[q.k] === i ? ' on' : ''); c.textContent = o; c.onclick = () => { ans[q.k] = i; draw(); }; chips.appendChild(c); });
            row.appendChild(chips); qs.appendChild(row);
          });
          const r = self.decide(ans);
          const col = { sync: 'var(--green)', async: 'var(--violet)', hybrid: 'var(--amber)', either: 'var(--accent)' }[r.v];
          out.innerHTML = `<div style="font:13px var(--f-mono);color:var(--ink-3)">Recommendation</div>
            <div style="font:700 22px var(--f-display);color:${col};margin:2px 0 8px">${r.label}</div>
            <ul style="margin:0 0 0 18px;padding:0">${r.why.map(x => `<li>${x}</li>`).join('')}${r.tips.map(x => `<li style="color:var(--ink-2)">${x}</li>`).join('')}</ul>`;
        };
        draw();
      },
    },

    { type: 'h2', text: 'Worked scenarios: jaane pehchaane apps' },
    { type: 'h3', text: '1. Instagram / xyz.com login: sync' },
    { type: 'p', html: `User password daal ke wait kar raha hai, bina login ke ek kadam aage nahi ja sakta, check ~50 ms ka hai, aur galat password turant batana hai. Chaaron sync signals ek saath. Login ko async banana (202 + "status poll karo") bas UX ko kharab karega aur kuch nahi bachaayega.` },
    { type: 'h3', text: '2. YouTube-style video upload: async' },
    { type: 'p', html: `Transcoding minutes leti hai, aur ek upload pe transcoding, thumbnail, search index, subscribers ko notification, sab react karte hain. Upload API sirf file le ke 202 deti hai; baaki sab workers aur events. Upar wala flow yahi tha.` },
    { type: 'h3', text: '3. Flash sale (Big Billion Day jaisi sale): hybrid' },
    { type: 'p', html: `10 baje sale khulte hi ek minute mein lakhon "Buy" clicks. Agar har click sync mein payment, inventory, invoice, email sab karwaye, to database aur payment gateway dono pighal jaayenge. Hybrid design: sync mein sirf jaldi wali cheez (user valid hai? stock counter mein se ek atomically ghataya, jaise Redis <code>DECR</code>), aur turant "order received". Baaki order processing queue se workers apni speed se karte hain. Queue <strong>spike ko smooth</strong> karti hai: aane ki speed kitni bhi ho, processing ki speed stable.` },
    { type: 'h3', text: '4. Razorpay / Stripe payment: hybrid, webhook ke saath' },
    { type: 'p', html: `User pay button dabata hai. Payment provider bank ke saath kaam karta hai, jisme kabhi seconds lagte hain, kabhi network beech mein toot jaata hai. Isliye payment providers final result ek <strong>webhook</strong> se bhejte hain: provider ka server tumhare server ko HTTP call karke batata hai "payment X successful". App order ko "payment pending" rakhti hai aur webhook aane pe confirm karti hai. User ka checkout sync dikhta hai, lekin asli confirmation async hai.` },
    { type: 'h3', text: '5. Trap: "OTP SMS user ko chahiye, to sync bhejo"' },
    { type: 'p', html: `Login ke liye OTP. Socho: "user ko OTP ke bina aage nahi badhna, to SMS sync bhejo". Trap! User ko <em>HTTP response</em> mein OTP nahi chahiye, use SMS chahiye, jo waise bhi phone pe alag se aayega. SMS provider (third party) kabhi 3-5 second atakta hai. Sync bhejoge to "Send OTP" button atkega, aur provider ka har outage tumhare login ko giraayega. Sahi: OTP generate karke store karo (sync, fast), SMS job queue mein daalo, turant "OTP bheja gaya" dikhao. Worker retry kare, provider down ho to doosre provider pe fallback.` },
    { type: 'callout', tone: 'warn', title: 'Ulta trap: sab kuch async', html: `Async seekhne ke baad kuch log har cheez queue mein daalne lagte hain. Profile page fetch, search results, login: inhe async karne se user ko poll karna padega, debugging mushkil, aur latency <em>badh</em> jaayegi (queue ka extra hop). Aur sabse buri cheez: <strong>queue pe request-reply</strong>, yaani request queue mein daalo, phir same HTTP request mein reply ka wait karo. Isme async ki complexity aur sync ka wait, dono ek saath milte hain.` },

    { type: 'h2', text: 'Practice: 6 chhote cases' },
    { type: 'p', html: `Pehle khud socho: sync, async ya hybrid? Phir "Signal dikhao" dabao. Phir jawab dekho. Jawab ke saath jaal bhi likha hai.` },
    { type: 'custom',
      cases: [
        { q: 'xyz.com pe "Download my data": user apne saare videos, comments aur history ki ZIP file maangta hai. 20 GB tak ho sakti hai.', signal: 'Kaam bahut lamba (minutes se ghante). User ko abhi result nahi chahiye, bas jab ready ho tab link.', pick: 'Async', why: 'Request pe job banao, 202 do, worker ZIP banaye aur object storage mein rakhe. Ready hone pe email mein download link.', trap: 'ZIP ko request ke andar banane ki koshish: timeout, aur user retry karke 2-3 ZIP jobs khade kar dega.' },
        { q: 'Search box mein type karte hi suggestions ("cric" → "cricket highlights").', signal: 'User har akshar pe jawab ka wait kar raha hai. Kaam ~20-50 ms ka.', pick: 'Sync', why: 'Suggestion tabhi kaam ka hai jab turant aaye. Queue mein daal ke baad mein bhejna bekaar hai.', trap: '"Bahut traffic hai to async karo." Traffic ka ilaaj cache aur zyada servers hain, async nahi.' },
        { q: 'Creator ne video ka title badla. Title save hona chahiye, aur search index mein bhi naya title aana chahiye.', signal: 'Save karna user ko turant dikhna chahiye. Search index ek alag system hai jo thoda baad mein update ho sakta hai.', pick: 'Hybrid', why: 'Title database mein sync save karo aur 200 do. Phir "title changed" event daalo. Search worker kuch second mein index update kar dega.', trap: 'Search index ko sync update karna: search cluster slow ho to title save bhi slow ya fail.' },
        { q: 'Har roz raat 2 baje, har creator ko kal ke views ka summary email.', signal: 'Koi user wait nahi kar raha. Lakhon emails. Email company flaky ho sakti hai.', pick: 'Async (scheduled batch jobs)', why: 'Ek scheduler raat 2 baje lakhon jobs queue mein daalta hai. Workers dheere dheere bhejte hain, fail hone pe retry.', trap: 'Ek hi script mein for-loop se lakhon emails sync bhejna: beech mein crash hua to pata hi nahi kaun reh gaya.' },
        { q: 'xyz.com ka wallet: user ₹100 se Premium khareedta hai. Balance se paise katne hain.', signal: 'Paisa. User ko turant "ho gaya" ya "balance kam hai" dikhna chahiye. Sab apne database ke andar, koi third party nahi.', pick: 'Sync', why: 'Balance check aur katna ek database transaction mein ~10 ms ka kaam hai. Failure (kam balance) turant dikhana hai.', trap: 'Receipt email aur "Premium badge" analytics ko bhi isi request mein daalna. Wo async side-effects hain.' },
        { q: 'Live match ke dauraan "Predict the winner" poll. 30 second mein 20 lakh votes.', signal: 'Bahut spiky traffic. User ko bas "vote mil gaya" chahiye, total baad mein dikhe to chalega.', pick: 'Hybrid (jaldi accept, baad mein ginti)', why: 'Sync mein sirf check (user ne pehle vote kiya?) aur vote ko queue/stream mein daalo. Workers totals jodte hain. User ko turant "vote mil gaya".', trap: 'Har vote pe ek hi database row ka counter sync badhana: sab ek row pe ladenge aur DB atak jaayega.' },
      ],
      render(el) {
        const cases = this.cases, T = { case: 'Case', hint: 'Signal dikhao', ans: 'Jawab dikhao', prev: '← Pichhla', next: 'Agla →', signal: 'Signal', trap: 'Jaal' };
        let i = 0, hint = false, ans = false;
        const draw = () => {
          const c = cases[i];
          el.innerHTML = `<div style="font-size:12px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.06em">${T.case} ${i + 1} / ${cases.length}</div>
            <div style="font:600 17px/1.45 var(--f-body);color:var(--ink);margin:4px 0 10px">${c.q}</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px">
              <button type="button" class="btn small" data-a="hint">${T.hint}</button>
              <button type="button" class="btn small primary" data-a="ans">${T.ans}</button>
              <button type="button" class="btn small ghost" data-a="prev">${T.prev}</button>
              <button type="button" class="btn small ghost" data-a="next">${T.next}</button></div>
            <div class="calc-note" style="${hint ? '' : 'display:none'}"><strong>${T.signal}:</strong> ${c.signal}</div>
            <div style="${ans ? '' : 'display:none'};margin-top:10px;border:1px solid var(--line-2);border-left:4px solid var(--green);border-radius:var(--r);background:var(--surface-2);padding:10px 12px">
              <div style="font:700 16px var(--f-display);color:var(--ink)">${c.pick}</div>
              <p style="margin:6px 0">${c.why}</p><p style="margin:6px 0"><strong>${T.trap}:</strong> ${c.trap}</p></div>`;
          el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
            const a = b.dataset.a;
            if (a === 'hint') hint = true; else if (a === 'ans') { hint = true; ans = true; }
            else { i = (i + (a === 'next' ? 1 : cases.length - 1)) % cases.length; hint = false; ans = false; }
            draw();
          });
        };
        draw();
      },
    },

    { type: 'h2', text: 'User ko result kaise batayein?' },
    { type: 'p', html: `Async mein ek naya sawaal aata hai: kaam khatam hua, ab user ko kaise pata chale? Chaar tareeke hain. Har ek ka chhota sa matlab:` },
    { type: 'callout', tone: 'term', title: 'Naye words: Polling, SSE, Push, Webhook', html: `<strong>Ye kya hai:</strong> <strong>Polling</strong> = app har kuch second pe poochhti hai "ho gaya?". <strong>SSE (Server-Sent Events)</strong> = browser ek connection khula rakhta hai aur server us pe updates bhejta rehta hai. <strong>Push notification</strong> = phone pe notification, app band ho tab bhi. <strong>Webhook</strong> = ek server doosre server ko HTTP call karke batata hai "ye ho gaya".<br><strong>Kyun chahiye:</strong> 202 ke baad user ko result kisi na kisi tareeke se pahunchna hi chahiye.<br><strong>Iske bina:</strong> user ko kabhi pata nahi chalega ki video ready hai, ya fail ho gaya.` },
    { type: 'table', head: ['Tareeka', 'Kab', 'Example'], rows: [
      ['Status polling', 'Simple, koi persistent connection nahi; kuch second ki deri chalegi', 'Report ka status har 3 s pe check'],
      ['SSE (Server-Sent Events)', 'Browser khula hai aur live progress dikhana hai', 'Upload 10% … 60% … DONE'],
      ['Push notification', 'User ne app band kar di ho', '"Tumhara video live hai"'],
      ['Webhook', 'Client khud ek server hai (doosri company)', 'Payment provider merchant ko batata hai'],
    ]},
    { type: 'p', html: `Kaunsa tareeka kab, ye <a href="#/realtime">Polling, SSE, WebSockets</a> lesson mein detail mein hai.` },

    { type: 'h2', text: 'Async ke chhupe kharche (interview depth)' },
    { type: 'list', items: [
      '<strong>Eventual consistency:</strong> 202 ke baad kuch der tak system "aadha" hai: video upload hua lekin search mein nahi dikhta. UI ko ye state dikhani padegi ("Processing...").',
      '<strong>Duplicates:</strong> Queues aam taur pe at-least-once deliver karti hain (kam se kam ek baar, kabhi kabhi do baar), to ek job do baar aa sakta hai. Workers idempotent banao (job ID se check karo "ye pehle ho chuka?").',
      '<strong>Ordering:</strong> Do jobs ulte order mein process ho sakte hain. Order zaroori ho to per-key ordering (jaise <a href="#/kafka">Kafka</a> partition key) chahiye.',
      '<strong>Monitoring:</strong> Sync mein error turant dikhta hai. Async mein failure chupchaap DLQ mein baith jaata hai. Queue depth, sabse purane message ki umar, aur DLQ size pe alerts lagao.',
      '<strong>Backlog:</strong> Queue spike ko absorb karti hai, lagataar overload ko nahi. Agar aane ki speed workers ki speed se hamesha zyada hai, backlog bas badhta jaayega.',
      '<strong>Debugging:</strong> Ek request ka kaam kai processes mein bikhar jaata hai. Har job pe ek trace ID / job ID chalao taaki logs jod sako.',
    ]},
    { type: 'callout', tone: 'tip', title: 'Decide (roadmap rule)', html: `User result ka wait kar raha hai, kaam &lt; 1 s, chain 2-3 hops, failure turant dikhana hai → <strong>sync</strong>. Kaam slow hai, traffic spiky hai, kai systems react karte hain, ya third party flaky hai → <strong>async</strong>: accept → job store → 202 + job ID → worker → notify. Zyada tar asli features <strong>hybrid</strong> hote hain: chhota core sync, side-effects async.` },

    { type: 'h2', text: 'Interview mein ye kaise bolein' },
    { type: 'steps', items: [
      { t: 'Feature ko kaamon mein todo', d: '"Upload" ek kaam nahi hai. Save, transcode, thumbnail, index, email: paanch kaam. Har kaam ka decision alag.' },
      { t: 'Har kaam pe 4 sawaal', d: 'User iska wait kar raha hai? Kitna time leta hai? Kitne hops? Koi third party hai? In jawabon se sync ya async.' },
      { t: 'Core sync, side-effects async', d: 'Jo user ko abhi chahiye (save, validate) wo sync. Baaki events aur queues se. Zyada tar features hybrid hote hain.' },
      { t: 'Async ki keemat bhi bolo', d: 'Job status kaise dikhega (poll/SSE/push/webhook), duplicates ke liye idempotency, fail hone pe retry + DLQ, aur queue depth pe alert.' },
    ]},
    { type: 'h2', text: 'Poori picture' },
    { type: 'diagram', title: 'xyz.com: kaunsa kaam sync, kaunsa async', height: 560,
      groups: [
        { label: 'APIs: user yahan ruka hai', x: 178, y: 14, w: 154, h: 530 },
        { label: 'Async: baad mein', x: 565, y: 140, w: 150, h: 392 },
      ],
      nodes: [
        { id: 'app', label: 'xyz.com app', sub: 'user', x: 80, y: 280, w: 120, kind: 'client', info: 'Ye kya hai: user ka browser ya phone app. Har button ek API call karta hai. Kuch ka jawab turant aata hai (sync), kuch ka "mil gaya, baad mein batayenge" (async).' },
        { id: 'login', label: 'Login API', sub: 'sync', x: 255, y: 70, kind: 'server', info: 'Ye kya hai: password check karne wali API. Sync kyun: user bina login aage nahi ja sakta, kaam ~50 ms ka hai, aur galat password turant batana hai.' },
        { id: 'comment', label: 'Comment API', sub: 'hybrid', x: 255, y: 200, kind: 'server', info: 'Ye kya hai: comment save karne wali API. Hybrid kyun: comment DB mein sync save (user use turant dekhe), lekin notification aur count update ek event se async.' },
        { id: 'upload', label: 'Upload API', sub: 'async: 202', x: 255, y: 350, kind: 'server', info: 'Ye kya hai: video lene wali API. Async kyun: transcoding minutes leti hai. API sirf quick checks karti hai, job ki status row (QUEUED) likhti hai, job queue mein daalti hai aur 202 + job ID deti hai.' },
        { id: 'checkout', label: 'Checkout API', sub: 'hybrid + webhook', x: 255, y: 490, kind: 'server', info: 'Ye kya hai: Premium khareedne wali API. Hybrid kyun: order "pending" sync mein banta hai (DB mein row), lekin payment ka final result provider baad mein webhook se bhejta hai.' },
        { id: 'db', label: 'Main DB', sub: 'users, jobs, orders', x: 455, y: 135, kind: 'data', info: 'Ye kya hai: xyz.com ka main database. Users, comments, job status (QUEUED → DONE) aur orders (pending → paid) yahin. Status poochhne pe jawab yahin se.' },
        { id: 'q', label: 'Queue', sub: 'jobs + events', x: 455, y: 350, kind: 'queue', info: 'Ye kya hai: kaam ki parchiyon ki line. Kyun: API aur workers ko alag karti hai. Spike yahan line mein rukta hai, workers apni speed se uthaate hain.' },
        { id: 'w', label: 'Workers', sub: 'transcode, email', x: 640, y: 350, w: 130, kind: 'server', info: 'Ye kya hai: background programs. Queue se job uthaate hain, kaam karte hain, fail hone pe backoff ke saath retry. Idempotent, taaki duplicate delivery se nuksaan na ho.' },
        { id: 'mail', label: 'Email / SMS', sub: 'third party', x: 640, y: 200, w: 130, kind: 'net', info: 'Ye kya hai: bahar ki company jo email/SMS bhejti hai. Flaky ho sakti hai, isliye sirf workers isse baat karte hain, kabhi user ki request nahi.' },
        { id: 'search', label: 'Search index', sub: 'updated later', x: 640, y: 490, w: 130, kind: 'data', info: 'Ye kya hai: wo system jisse search chalta hai. Naya video ya naya title kuch second baad yahan aata hai. Ye eventual consistency hai, aur theek hai.' },
        { id: 'psp', label: 'Payment provider', sub: 'third party', x: 455, y: 490, w: 150, kind: 'net', info: 'Ye kya hai: Razorpay/Stripe jaisi company jo bank se baat karti hai. Bank mein seconds lag sakte hain, isliye final "paid" ka jawab webhook se aata hai.' },
      ],
      edges: [
        { a: 'app', b: 'login' },
        { a: 'app', b: 'comment' },
        { a: 'app', b: 'upload' },
        { a: 'app', b: 'checkout' },
        { a: 'login', b: 'db', label: 'check' },
        { a: 'comment', b: 'db', label: 'save' },
        { a: 'comment', b: 'q', kind: 'evt' },
        { a: 'upload', b: 'q', label: 'job' },
        { a: 'checkout', b: 'psp', label: 'pay' },
        { a: 'q', b: 'w' },
        { a: 'w', b: 'mail', label: 'send' },
        { a: 'w', b: 'search', label: 'index' },
        { a: 'w', b: 'db', label: 'DONE' },
      ],
      paths: [
        { name: 'Login (sync)', text: 'App ne password bheja, API ne DB mein check kiya, ~50 ms mein jawab. Koi queue nahi.', go: ['app>login>db', 'res:db>login>app'] },
        { name: 'Comment (hybrid)', text: 'Comment sync save hua aur turant dikha. Notification ka event queue mein gaya, worker ne baad mein bheja.', go: ['app>comment>db', 'res:comment>app', 'evt:comment>q>w>mail'] },
        { name: 'Upload (async)', text: 'API ne job queue mein daala (status QUEUED) aur turant 202 diya. Worker ne transcode kiya, search update kiya, DB mein DONE likha.', go: ['app>upload>q', 'res:upload>app', 'q>w>search', 'w>db'] },
        { name: 'Payment (webhook)', text: 'Order "pending" bana, user provider pe gaya. Provider ne baad mein webhook se "paid" bataya, API ne order confirm kiya.', go: ['app>checkout>psp', 'evt:psp>checkout', 'res:checkout>app'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Sync = caller ruk ke jawab ka wait karta hai. Async = "mil gaya" turant, kaam baad mein worker karta hai.</li>
      <li>Sync jab: user ko result chahiye, kaam &lt; 1 s, chain 2-3 hops, failure turant dikhana hai.</li>
      <li>Async jab: kaam slow hai, traffic spiky hai, kai systems react karte hain, ya third party flaky hai.</li>
      <li>Async recipe: accept → job store → 202 + job ID → worker → notify (poll, SSE, push ya webhook).</li>
      <li>Async kaam ko tez nahi karta. Bas wait ko user se hata ke system ke andar le jaata hai.</li>
      <li>Sync chain mein time judta hai aur success guna hota hai: 0.999 ki power hops.</li>
      <li>Zyada tar features hybrid: chhota core sync, side-effects async. Quick checks hamesha 202 se pehle.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['Async: user kabhi slow kaam pe nahi atakta, server threads free', 'Async: spikes queue mein absorb, workers average load ke liye size', 'Async: flaky third party ki failure user tak nahi pahunchti, retries aasaan', 'Sync: simple code, turant error, debugging aasaan, koi extra component nahi'],
      costs: ['Async: queue + workers + jobs table = zyada moving parts aur zyada monitoring', 'Async: eventual consistency, duplicates, ordering ki chinta', 'Async: user ko status dikhane ke liye extra kaam (polling/SSE/push)', 'Sync: lambi chain mein latency judti hai aur failure chance guna hota hai; slow kaam timeout karta hai'],
    },
    { type: 'think', questions: [
      { q: 'xyz.com pe "comment post karo". Comment save karna, notification bhejna, spam check karna, comment count badhana. Kya sync, kya async?', a: 'Comment save karna sync (user apna comment turant dekhna chahta hai, aur fail ho to batana hai). Notification, count update aur search indexing async (event publish). Spam check: agar fast model hai (~50 ms) to sync, warna comment pehle "pending" dikhao aur async check karo. Ye classic hybrid hai.' },
      { q: 'Ek team ne async design banaya: API message queue mein daalti hai, phir usi HTTP request mein 10 second tak reply queue pe wait karti hai. Kya galat hai?', a: 'Ye queue pe request-reply hai: user ab bhi wait kar raha hai (sync ka dard), aur upar se queue, correlation IDs, timeouts ki complexity (async ka dard). Ya to seedha sync call karo (agar kaam fast hai), ya sach mein async karo: 202 + job ID, aur result baad mein batao.' },
      { q: 'Async upload mein 202 dene ke baad worker ko pata chala video corrupt hai. User ko kaise batayein?', a: 'Job status FAILED with reason, aur user ko push notification / email / UI pe status. Isi wajah se jo checks jaldi ho sakte hain (file type, size, header check) unhe 202 se pehle sync mein karo, taaki zyada tar failures turant dikh jaayein.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Video transcoding (~2 minute) ke liye sabse sahi design?', options: ['Sync call, timeout 5 minute kar do', 'Accept → job store → 202 + job ID → worker → notify', 'Client khud transcode kare'], answer: 1, explain: 'Slow kaam async ka sabse strong signal hai. Timeout badhana connections aur threads ko minutes tak baandh deta hai, aur beech ke proxies waise bhi kaat denge.' },
      { q: 'Har service 99.9% reliable hai. 10 services ki sync chain kitni baar poori sahi chalegi (approx)?', options: ['99.9%', '99.0%', '90%'], answer: 1, explain: '0.999^10 ≈ 0.990. Yaani 100 mein ~1 request fail. Chain chhoti rakho.' },
      { q: 'HTTP 202 Accepted ka matlab?', options: ['Kaam ho gaya', 'Request mil gayi, processing abhi baaki hai', 'Request reject'], answer: 1, explain: '202 async APIs ka standard jawab hai: accept kiya, kaam baad mein.' },
      { q: 'Async kaam ko kya karta hai?', options: ['Kaam ko tez karta hai', 'User ko wait se bachata hai; kaam utna hi time leta hai', 'Kaam ki zaroorat khatam kar deta hai'], answer: 1, explain: 'Async sirf wait ko user se hata ke system ke andar le jaata hai. Total kaam same (ya thoda zyada).' },
    ]},
    { type: 'sources', items: [
      { title: 'RFC 9110: HTTP Semantics, section 15.3.3 (202 Accepted)', publisher: 'IETF', official: true, url: 'https://www.rfc-editor.org/rfc/rfc9110#name-202-accepted', used: '202 ka matlab: request accept hui, processing poori nahi hui.' },
      { title: 'Amazon SQS visibility timeout', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html', used: 'Worker crash pe message wapas dikhne ka behaviour.' },
      { title: 'Edit attributes for your Application Load Balancer (idle timeout)', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-load-balancer-attributes.html', used: 'ALB ka default idle timeout 60 second (range 1-4000 s).' },
      { title: 'Handling payment events with webhooks', publisher: 'Stripe documentation', official: true, url: 'https://docs.stripe.com/webhooks/handling-payment-events', used: 'Payment ka final result (payment_intent.succeeded) webhook se async handle karne ki salah.' },
      { title: 'DECR command', publisher: 'Redis documentation', official: true, url: 'https://redis.io/docs/latest/commands/decr/', used: 'Flash sale mein stock counter ko atomically ghatana.' },
    ]},
  ],
});
