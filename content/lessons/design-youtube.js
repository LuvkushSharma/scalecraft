Lesson.register({
  id: 'design-youtube',
  title: 'YouTube / Netflix',
  minutes: 40,
  summary: `Badi video files lena, unhe darjan bhar qualities mein badalna, aur duniya bhar mein bina atke chalana. Zero se: video file, tukde (segments), playlist (manifest), aur player jo khud quality chunta hai. Phir resumable upload, transcoding DAG, per-title encoding, Netflix Open Connect jaisa CDN, Vitess pe metadata, recommendations aur view counts. Netflix aur YouTube ke engineering posts pe based.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Riya ne apne phone se 2 GB ki Goa trip video banayi aur xyz.com pe daalni hai. Metro mein net baar baar jaata hai.<br>Usi waqt lakhon log xyz.com pe videos dekh rahe hain: koi bade TV pe ghar ke WiFi se, koi purane phone pe kamzor 4G se.<br>Hume teen kaam karne hain: (1) badi file bina toote andar lana, (2) usse har phone aur har internet ke liye chhote, alag alag versions banana, (3) har viewer tak video aise pahunchana ki wo kabhi atke nahi.<br>YouTube aur Netflix roz yahi karte hain, crores logon ke liye. Ye lesson dikhata hai kaise.` },
    { type: 'callout', tone: 'tip', title: 'Pehle khud try karo', html: `10 minute kaagaz pe socho: ek creator 2 GB ki video upload karta hai, aur 1 crore log alag alag phones, TVs aur networks pe use dekhna chahte hain. Kaun se boxes chahiye? Train tunnel mein ghuse to video atke kyun nahi? Phir yahan compare karo.` },

    { type: 'p', html: `xyz.com ab ek video platform hai. <a href="#/queues">Queues</a>, <a href="#/object-storage">object storage</a> aur <a href="#/cdn">CDN</a> wale lessons mein humne iske tukde dekhe the. Ab poora system ek saath design karenge, aur dekhenge ki asli companies (Netflix aur YouTube) ne kya kiya.` },
    { type: 'p', html: `Dono ka kaam ek jaisa dikhta hai, lekin pressure alag jagah hai:` },
    { type: 'compare',
      left: { title: 'YouTube: upload heavy', html: `• Koi bhi upload kar sakta hai (user generated content)<br>• YouTube ke official blog (2021) ke mutabik har minute <strong>500+ ghante</strong> ki video upload hoti hai<br>• Isliye sabse bada sawaal: itni saari videos ko alag alag qualities mein badalna (isko <em>transcoding</em> kehte hain, neeche samjhayenge). YouTube ne iske liye apni khud ki chip (VCU) tak bana di` },
      right: { title: 'Netflix: delivery heavy', html: `• Catalog chhota aur professional (studios se aata hai)<br>• Har movie ko compress karne pe bahut mehnat ki ja sakti hai (har movie ke liye alag settings: per-title encoding)<br>• Asli sawaal delivery: crores log ek saath dekhte hain. Isliye Netflix ne apna khud ka delivery network (CDN) banaya: <strong>Open Connect</strong>` },
    },
    { type: 'p', html: `Abhi in words (transcoding, CDN) ka matlab nahi pata, koi baat nahi. Agle hisse mein hum zero se shuru karenge.` },

    { type: 'h2', text: 'Step 0: video phone tak kaise pahunchta hai, zero se' },
    { type: 'p', html: `<a href="#/design-hotstar">JioHotstar wale lesson</a> mein humne live cricket ke liye segments, packager, manifest aur ABR ko bahut detail mein dekha tha. Wahan video "abhi" ban raha tha (live). Yahan video pehle se recorded hai (isko <strong>VOD</strong>, video on demand, kehte hain). Basics wahi hain, to pehle ek chhota recap, bilkul seedhe words mein.` },
    { type: 'callout', tone: 'term', title: 'Naya word: encoding aur codec', html: `<strong>Ye kya hai:</strong> camera ki raw video bahut badi hoti hai (1080p pe ~1.2 Gbps, yaani har second ~155 MB). <strong>Encoding</strong> use compress karti hai: har frame poora likhne ki jagah sirf ye likhti hai ki pichhle frame se kya badla. In rules ke set ko <strong>codec</strong> kehte hain (H.264, VP9, AV1...).<br><strong>Kyun chahiye:</strong> wahi video ~5 Mbps mein aa jaati hai, sau guna se bhi zyada chhoti, aur aankh ko farak kam dikhta hai.<br><strong>Iske bina:</strong> ek minute ki video GBs ki hoti, kisi phone tak pahunch hi nahi paati.` },
    { type: 'callout', tone: 'term', title: 'Naya word: transcoding aur quality ladder', html: `<strong>Ye kya hai:</strong> creator ki file ko khol ke (decode) dobara alag alag sizes mein compress karna (encode): 240p, 480p, 720p, 1080p... Har version ek <strong>rendition</strong> hai, aur saari renditions ki list ek <strong>ladder</strong> (seedhi), neeche kam quality, upar zyada.<br><strong>Kyun chahiye:</strong> kamzor 4G wale ko chhota version chahiye, bade TV wale ko bada. Ek hi file sabke liye kaam nahi karti.<br><strong>Iske bina:</strong> ya to slow internet pe video baar baar atkegi, ya tez internet pe bekaar dhundhli dikhegi.` },
    { type: 'callout', tone: 'term', title: 'Naya word: segment (video ka tukda)', html: `<strong>Ye kya hai:</strong> har rendition ko 2-6 second ke chhote tukdon mein kaat ke alag files bana dete hain: <code>seg_0001.m4s</code>, <code>seg_0002.m4s</code>... Jaise ek lambi kitaab ke alag panne.<br><strong>Kyun chahiye:</strong> (1) pehla tukda aate hi video chal padti hai, poori file ka wait nahi; (2) har naye tukde pe quality badal sakte hain; (3) chhoti, kabhi na badalne wali files ko duniya bhar ke cache servers aaram se rakh sakte hain.<br><strong>Iske bina:</strong> 2 GB ki ek lambi file: der se start, beech mein quality badalna lagbhag namumkin, aur 5 minute dekh ke band kiya to baaki download bekaar.` },
    { type: 'callout', tone: 'term', title: 'Naya word: manifest (tukdon ki list)', html: `<strong>Ye kya hai:</strong> ek chhoti text file jo player ko batati hai: "is video ki ye qualities hain, aur har quality ke tukde in URLs pe hain". HLS mein iska naam <code>.m3u8</code>, DASH mein <code>.mpd</code>.<br><strong>Kyun chahiye:</strong> player ko pata hona chahiye ki kaunse tukde maangne hain aur kahan se.<br><strong>Iske bina:</strong> player ke paas tukde hote hue bhi wo unhe dhoondh nahi paata, jaise bina index ki kitaab.` },
    { type: 'callout', tone: 'term', title: 'Naya word: player aur ABR', html: `<strong>Ye kya hai:</strong> phone/TV ki app ka wo hissa jo tukde download karke chalata hai. Har agla tukda maangne se pehle wo dekhta hai: "mera internet kitna tez hai, aur mere paas kitne second ki video pehle se padi hai (<strong>buffer</strong>)?" Phir sahi quality chunta hai. Isko <strong>ABR</strong> (Adaptive Bitrate) kehte hain.<br><strong>Kyun chahiye:</strong> metro ki tunnel mein net gire to agla tukda 240p ka; bahar aate hi wapas 720p. Video atakti nahi.<br><strong>Iske bina:</strong> ek fixed quality: kamzor network pe video baar baar ruk jaati hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: CDN', html: `<strong>Ye kya hai:</strong> Content Delivery Network. Duniya bhar ke shehron mein rakhe hazaron cache servers, jo popular files ki copy apne paas rakhte hain (<a href="#/cdn">CDN lesson</a>).<br><strong>Kyun chahiye:</strong> Mumbai ka viewer tukda Mumbai ke paas wale server se le, America ke data center se nahi. Tez bhi, aur hamare main servers pe bojh bhi nahi.<br><strong>Iske bina:</strong> saare viewers ki requests ek jagah: Tbps ka traffic, jo koi ek data center bhej hi nahi sakta.` },
    { type: 'p', html: `Poori chain ek line mein:` },
    { type: 'ascii', text: `
 Creator ─upload─> storage ─> transcoding (5-20 qualities) ─> tukde + manifest
                                                                   │
 Viewer ka player <──── CDN (paas wala cache server) <─────────────┘
   (har tukde se pehle quality chunta hai)`, caption: 'Ek video ki zindagi. Is lesson ke har hisse mein inhi boxes ko detail mein dekhenge.' },

    { type: 'h2', text: 'Step 1: requirements' },
    { type: 'compare',
      left: { title: 'Functional', html: `• Creator video upload kare (GBs tak), beech mein net toote to wahin se resume ho<br>• Video kai qualities (240p se 4K) mein process ho<br>• Viewer kisi bhi device pe dekhe, seek kare<br>• Title, description, thumbnail, view count dikhe<br>• Home page pe "tumhare liye" videos (recommendations, high level)<br><br><strong>Out of scope:</strong> comments, live streaming (wo <a href="#/design-hotstar">JioHotstar</a> lesson mein), ads` },
      right: { title: 'Non-functional', html: `• Playback smooth: kam se kam <strong>rebuffering</strong> (video ka atakna)<br>• Start jaldi ho (1-2 second)<br>• Upload kabhi lost na ho (durability)<br>• Bahut high availability, duniya bhar mein<br>• Bandwidth ka kharcha kam (ye sabse bada bill hai)<br>• Processing thodi der le sakti hai (minutes chalega)` },
    },
    { type: 'callout', tone: 'term', title: 'Naya word: Rebuffering', html: `<strong>Ye kya hai:</strong> video chalte chalte ruk jaaye aur gol gol spinner ghoome, use <strong>rebuffering</strong> (ya stall) kehte hain. Player ke buffer mein aage chalane ke liye video ka data khatam ho gaya.<br><strong>Kyun maayne rakhta hai:</strong> streaming companies ke liye ye sabse bura experience hai. Log video band karke chale jaate hain.<br><strong>Is design mein:</strong> ABR, CDN aur buffer, teeno isi ko rokne ke liye hain.` },

    { type: 'h2', text: 'Step 2: napkin maths' },
    { type: 'p', html: `Upload rate YouTube ke blog se liya (500 ghante per minute, 2021). Baaki sab "maan lo" numbers hain, sirf andaaza lagane ke liye. Values badlo:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="ytH">Upload: ghante video per minute</label><input id="ytH" type="number" value="500" min="1" step="10"></div>
          <div><label for="ytL">Saari qualities milake bitrate (Mbps)</label><input id="ytL" type="number" value="10" min="1" step="1"></div>
          <div><label for="ytV">Ek saath dekhne wale (millions)</label><input id="ytV" type="number" value="10" min="1" step="1"></div>
          <div><label for="ytB">Ek viewer ka average bitrate (Mbps)</label><input id="ytB" type="number" value="3" min="0.5" step="0.5"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Nayi video per din</span><strong class="ytD"></strong></div>
          <div class="stat"><span>Naya storage per din</span><strong class="ytS"></strong></div>
          <div class="stat"><span>Viewers ko outgoing traffic</span><strong class="ytE"></strong></div>
        </div>
        <div class="calc-note ytN"></div>`;
      const q = s => el.querySelector(s);
      const upd = () => {
        const h = Math.max(0, +q('#ytH').value || 0), l = Math.max(0, +q('#ytL').value || 0);
        const v = Math.max(0, +q('#ytV').value || 0), b = Math.max(0, +q('#ytB').value || 0);
        const hoursDay = h * 60 * 24;
        const pb = hoursDay * 3600 * l * 1e6 / 8 / 1e15;
        const tbps = v * 1e6 * b * 1e6 / 1e12;
        q('.ytD').textContent = Math.round(hoursDay).toLocaleString('en-IN') + ' ghante';
        q('.ytS').textContent = pb >= 1 ? pb.toFixed(2) + ' PB' : (pb * 1000).toFixed(0) + ' TB';
        q('.ytE').textContent = tbps.toFixed(0) + ' Tbps';
        q('.ytN').textContent = `Har ghante video ko ${l} Mbps (saari qualities ka jod) pe rakho to ek ghanta ≈ ${(3600 * l / 8 / 1000).toFixed(1)} GB. Do sabak: (1) storage har din petabytes mein badhta hai, to sasta object storage chahiye. (2) Outgoing traffic Tbps mein hai: koi ek data center ye nahi bhej sakta, CDN zaroori hai.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Default values pe: 500 × 60 × 24 = 7,20,000 ghante nayi video roz, aur 10 Mbps pe har ghanta ~4.5 GB, to <strong>~3.24 PB roz</strong>. Aur 1 crore log 3 Mbps pe = <strong>30 Tbps</strong>. Ye do numbers poore design ko chalate hain.` },

    { type: 'h2', text: 'Step 3: API aur core entities' },
    { type: 'code', text: `
# 1) Upload session shuru karo (metadata + file size)
POST /videos?uploadType=resumable
  body: { "title": "Goa vlog", "size": 2147483648 }
  →  200 OK   Location: /upload/session/abc123      (session URL)

# 2) Bytes bhejo, tukdon mein
PUT /upload/session/abc123      Content-Range: bytes 0-8388607/2147483648
  →  308 Resume Incomplete      Range: bytes=0-8388607

# 3) Dekhna (player ko manifest milta hai, segments CDN se)
GET /videos/v91/manifest.m3u8  →  qualities ki list + segment URLs
GET https://cdn.xyz.com/v91/720p/seg_0042.m4s

# 4) View report (async, batch mein gina jaata hai)
POST /videos/v91/views   { "watched_s": 37 }   →  202 Accepted` },
    { type: 'table', head: ['Entity', 'Kya rakhta hai', 'Kahan'], rows: [
      ['Video', 'id, owner, title, duration, status (UPLOADING → PROCESSING → READY), visibility', 'Metadata DB (sharded MySQL; YouTube mein Vitess, deep dive 5)'],
      ['Rendition', 'video_id, codec, resolution, bitrate, manifest path. Ek video ki 10-20 renditions', 'Metadata DB'],
      ['Segment', 'Video ke 2-6 second ke tukde, har rendition ke alag', 'Object storage + CDN (DB mein nahi)'],
      ['Raw upload', 'Creator ki original file', 'Object storage (raw bucket)'],
      ['View count', 'video_id → approx count', 'Alag counter store, batch se update'],
    ]},

    { type: 'h2', text: 'Step 4: high-level design, upload se READY tak' },
    { type: 'p', html: `Pehla aadha system: video andar lana aur use dekhne layak banana. Ye <a href="#/pattern-blobs">large blobs</a> aur <a href="#/pattern-long-tasks">long-running tasks</a> patterns ka combination hai. Diagram se pehle uske boxes ek ek karke:` },
    { type: 'callout', tone: 'term', title: 'Box: Upload API (aur session URL)', html: `<strong>Ye kya hai:</strong> ek chhota server jo sirf "haan, tum upload kar sakti ho" bolta hai, aur ek khaas URL deta hai jis pe file ke bytes bhejne hain (session URL / <a href="#/object-storage">pre-signed URL</a>).<br><strong>Kyun chahiye:</strong> login, file size aur type check karna, aur DB mein video ki entry banana. Bytes khud isse nahi guzarte.<br><strong>Iske bina:</strong> ya to koi bhi kuch bhi upload kar de, ya 2 GB ki file hamare app server se guzre aur use minutes tak busy rakhe.` },
    { type: 'callout', tone: 'term', title: 'Box: object storage (raw aur encoded)', html: `<strong>Ye kya hai:</strong> S3 / Google Cloud Storage jaisi service jo badi files sasti aur surakshit rakhti hai (har file ki kai copies). Hum do "buckets" (folders) rakhenge: <em>raw</em> (creator ki original file) aur <em>encoded</em> (taiyaar tukde aur manifests).<br><strong>Kyun chahiye:</strong> napkin maths ne bola roz petabytes aate hain. Normal database ya server ki disk ye nahi sambhal sakti.<br><strong>Iske bina:</strong> files kho sakti hain, aur storage ka bill kai guna.` },
    { type: 'callout', tone: 'term', title: 'Box: metadata DB', html: `<strong>Ye kya hai:</strong> ek database jisme video ki <em>jaankari</em> hai, bytes nahi: title, owner, status (UPLOADING, PROCESSING, READY), kaunsi qualities taiyaar hain.<br><strong>Kyun chahiye:</strong> watch page ko ye chhoti jaankari milliseconds mein chahiye, aur status se pata chalta hai video dikhani hai ya nahi.<br><strong>Iske bina:</strong> kisi ko pata nahi ki video taiyaar hai ya aadhi bani hai.` },
    { type: 'callout', tone: 'term', title: 'Box: orchestrator, queue aur workers', html: `<strong>Ye kya hai:</strong> <em>Orchestrator</em> ek manager hai: wo ek video ke kaam ko chhote tasks mein todta hai ("chunk 17 ko 720p banao"), unhe ek <a href="#/queues">queue</a> (kaam ki line) mein daalta hai, aur hisaab rakhta hai kaun sa ho gaya. <em>Workers</em> hazaron machines hain jo line se ek task uthati hain, karti hain, aur agla uthati hain.<br><strong>Kyun chahiye:</strong> ek ghante ki video ko 10 qualities mein ek machine pe banane mein ghante lagte. Hazaron machines pe saath saath minutes.<br><strong>Iske bina:</strong> creator ghanton wait kare, aur machine crash ho to poora kaam zero se.` },
    { type: 'p', html: `Ab har scenario chalao, aur boxes pe click karke unka role padho.` },
    { type: 'flow', title: 'Upload aur processing pipeline', height: 360,
      nodes: [
        { id: 'c', label: 'Creator', sub: 'app / browser', x: 75, y: 180, w: 120, kind: 'client', info: 'Ye kya hai: video upload karne wala user (Riya) aur uski app. Uska phone file ko tukdon (chunks) mein bhejta hai, aur yaad rakhta hai kitna bheja ja chuka hai.' },
        { id: 'api', label: 'Upload API', sub: 'session banata hai', x: 250, y: 60, w: 140, kind: 'server', info: 'Ye kya hai: ek chhota server jo upload ki permission deta hai. Login, file size aur type check karta hai, DB mein video row banata hai (status UPLOADING), aur ek upload session URL deta hai. Video ke bytes isse nahi guzarte: wo seedhe storage mein jaate hain (pre-signed / session URL).' },
        { id: 'raw', label: 'Raw storage', sub: 'original file', x: 250, y: 300, w: 140, kind: 'data', info: 'Ye kya hai: object storage (S3/GCS jaisa) ka ek bucket, yaani badi files ki sasti, kabhi na khone wali almari, jahan creator ki original file rakhi jaati hai. Upload poora hote hi ye ek event bhejta hai. Original kabhi delete nahi karte: kal naya codec aaya to isi se dobara encode hoga.' },
        { id: 'db', label: 'Metadata DB', sub: 'Vitess / MySQL', x: 440, y: 60, w: 150, kind: 'data', info: 'Ye kya hai: video ki details wala database (bytes nahi, sirf jaankari). Video ki row: title, owner, status, renditions ki list. YouTube ne isi MySQL ko scale karne ke liye Vitess banaya (neeche deep dive).' },
        { id: 'orch', label: 'DAG orchestrator', sub: 'jobs + queue', x: 440, y: 180, w: 150, kind: 'queue', info: 'Ye kya hai: kaam baantne wala manager. Ek video ke processing ko chhote tasks ke graph (DAG) mein todta hai, tasks ko queue mein daalta hai, kaun sa task kis pe depend karta hai uska hisaab rakhta hai, aur fail hue tasks dobara chalata hai.' },
        { id: 'w', label: 'Encode workers', sub: 'hazaaron', x: 630, y: 180, w: 130, kind: 'server', info: 'Ye kya hai: video compress karne wali machines ka bada fleet (stateless: apne paas kuch yaad nahi rakhte). Har worker ek chhota task karta hai: jaise "chunk 17 ko 720p pe encode karo". Netflix (2015) ke mutabik ye cloud instances pe chalte hain, aur instance achanak band ho to sirf us chhote task ka kaam dobara hota hai.' },
        { id: 'out', label: 'Encoded storage', sub: 'segments → CDN', x: 630, y: 300, w: 150, kind: 'data', info: 'Ye kya hai: object storage ka doosra bucket, taiyaar maal ke liye. Har quality ke segments aur manifest files yahan. CDN inhi ko duniya bhar mein phailata hai.' },
      ],
      edges: [{ a: 'c', b: 'api' }, { a: 'c', b: 'raw' }, { a: 'api', b: 'db' }, { a: 'raw', b: 'orch' }, { a: 'orch', b: 'db' }, { a: 'orch', b: 'w' }, { a: 'w', b: 'raw' }, { a: 'w', b: 'out' }],
      scenarios: [
        { name: 'Upload', steps: [
          { title: 'Session maango', text: 'App pehle sirf metadata bhejta hai: title aur file size. Abhi koi video byte nahi.', go: 'c>api', msg: 'POST /videos?uploadType=resumable  { title, size: 2 GB }' },
          { title: 'DB mein row, status UPLOADING', text: 'API video ki row banata hai aur ek session URL deta hai.', go: ['api>db', 'res:api>c'], after: { db: { sub: 'v91: UPLOADING' } }, msg: '200 OK   Location: /upload/session/abc123' },
          { title: 'Bytes seedhe storage mein', text: 'File 8 MB ke tukdon mein seedhe storage mein jaati hai. App server pe 2 GB ka bojh nahi.', flood: { paths: ['c>raw'], n: 6 }, after: { raw: { state: 'ok', sub: 'v91.mp4 (2 GB)' } }, msg: 'PUT /upload/session/abc123   Content-Range: bytes 0-8388607/2147483648' },
          { title: 'Upload poora: event', text: 'Storage "file aa gayi" event bhejta hai. Orchestrator kaam shuru karta hai aur status PROCESSING.', go: ['evt:raw>orch', 'orch>db'], after: { db: { sub: 'v91: PROCESSING' } } },
        ]},
        { name: 'Transcoding DAG', intro: 'Ab ek 2 GB file se 10-20 renditions banani hain.', steps: [
          { title: 'Video ko tukdon mein baanto', text: 'Orchestrator video ko chunks (jaise 1-3 minute) mein todta hai aur har chunk × har quality ke liye ek task banata hai. 60 minute ÷ 3 = 20 chunks, × 10 qualities = 200 tasks.', focus: ['orch'], after: { orch: { sub: '200 tasks queued' } } },
          { title: 'Workers parallel mein', text: 'Saikdon workers ek saath alag alag chunks uthate hain, raw file ka sirf apna hissa padhte hain.', parallel: true, go: ['orch>w', 'w>raw', 'res:raw>w'], after: { w: { state: 'hot', sub: 'encoding...' } } },
          { title: 'Segments likho', text: 'Har encoded chunk check hota hai, phir encoded storage mein. Saare chunks aane pe assemble + package (HLS/DASH segments + manifest).', flood: { paths: ['w>out'], n: 6 }, after: { w: { state: '', sub: 'hazaaron' }, out: { state: 'ok', sub: '10 renditions' } } },
          { title: 'READY', text: 'Orchestrator DB mein status READY karta hai. Ab video dekhi ja sakti hai.', go: ['res:w>orch', 'orch>db'], after: { db: { state: 'ok', sub: 'v91: READY' } } },
        ]},
        { name: 'Net toota (resume)', intro: 'Riya metro mein 2 GB upload kar rahi thi. 1.2 GB pe network gaya.', steps: [
          { title: 'Upload beech mein toota', text: 'Ek chunk raaste mein hi kho gaya.', go: 'lost:c>raw', after: { c: { state: 'warn', sub: 'offline' } } },
          { title: 'Wapas online: poochho kitna pahuncha', text: 'App khaali PUT bhejta hai: "kitne bytes mile?" Server batata hai 1.2 GB tak. Isliye zero se shuru nahi karna.', set: { c: { state: '', sub: 'online' } }, go: ['c>raw', 'res:raw>c'], msg: 'PUT /upload/session/abc123   Content-Range: bytes */2147483648\n→ 308 Resume Incomplete   Range: bytes=0-1288490187' },
          { title: 'Wahin se aage', text: 'Bacha hua 0.8 GB hi bheja. Session URL kuch der tak valid rehta hai (kitni der, ye service tay karti hai).', flood: { paths: ['c>raw'], n: 4 }, after: { raw: { state: 'ok', sub: 'complete' } } },
        ]},
        { name: 'Worker mar gaya', steps: [
          { title: 'Encoding chal rahi hai', text: '200 tasks, workers busy.', go: 'orch>w', after: { w: { state: 'hot', sub: 'encoding...' } } },
          { title: 'Ek machine achanak band', text: 'Cloud ka sasta (spot) instance waapas le liya gaya. Us pe chunk 17 ka 720p task chal raha tha.', set: { w: { state: 'down', sub: 'chunk 17 lost' } }, focus: ['w'] },
          { title: 'Sirf ek task dobara', text: 'Orchestrator ko heartbeat/timeout se pata chala. Sirf chunk 17 ka task dobara queue mein. Baaki 199 tasks pe koi asar nahi. Poori video ek machine pe hoti to ghanton ka kaam doob jaata.', set: { w: { state: 'ok', sub: 'retry chunk 17' } }, go: ['orch>w', 'w>out'], after: { w: { state: '', sub: 'hazaaron' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'Deep dive 1: resumable upload' },
    { type: 'p', html: `Problem: 2 GB ki file ek hi HTTP request mein bheji aur 90% pe net gaya, to sab zero se. Mobile pe ye roz hota hai. Solution: upload ko ek <strong>session</strong> bana do jiska server yaad rakhe ki kitne bytes aa chuke. YouTube Data API ka resumable upload protocol bilkul isi tarah kaam karta hai:` },
    { type: 'steps', items: [
      { t: 'Session shuru', d: 'Pehli request mein sirf metadata aur file ka size. Jawab ke <code>Location</code> header mein ek unique session URL aata hai.' },
      { t: 'Tukdon mein PUT', d: 'File chunks mein bhejo. YouTube ki docs ke mutabik chunk size 256 KB ka multiple hona chahiye (aakhri chunk chhod ke). Beech ke har chunk pe server <code>308 Resume Incomplete</code> bolta hai, aakhri pe <code>201 Created</code>.' },
      { t: 'Toot gaya? Status poochho', d: 'Khaali PUT with <code>Content-Range: bytes */TOTAL</code>. Server <code>308</code> aur <code>Range</code> header mein batata hai kitne bytes mil chuke.' },
      { t: 'Wahin se resume', d: 'Agla byte se aage bhejo. Kuch dobara nahi.' },
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `"Upload API" aur "storage" ek hi cheez nahi. API server sirf permission aur session deta hai; GBs ke bytes seedhe object storage mein jaate hain (<a href="#/object-storage">pre-signed URLs</a>). Agar 2 GB app server se guzrega to wo minutes tak busy rahega aur har GB do baar network pe chalega.` },

    { type: 'h2', text: 'Deep dive 2: transcoding as a DAG' },
    { type: 'p', html: `Creator ne 4K mein shoot ki video upload ki. Lekin kisi ka phone 2G pe hai, kisi ka TV 4K pe. Ek hi file sabko nahi chalegi. Isliye har video ko kai versions mein badalna padta hai. Pehle teen words:` },
    { type: 'callout', tone: 'term', title: 'Thoda aur detail: codec, bitrate, resolution', html: `Step 0 mein inka basic idea dekha. Ab thoda andar se:<br><strong>Codec</strong> video ko compress karne ka tareeka (H.264/AVC, HEVC, VP9, AV1). Naye codecs kam bytes mein wahi quality dete hain lekin encode karne mein zyada CPU khaate hain.<br><strong>Resolution</strong> picture kitne pixels ki hai (480p, 720p, 1080p, 4K).<br><strong>Bitrate</strong> ek second video ke liye kitne bits (jaise 3,000 kbps = 3 Mbps). Zyada bitrate = zyada detail = zyada data.` },
    { type: 'callout', tone: 'term', title: 'Thoda aur detail: rendition aur bitrate ladder', html: `<strong>Transcoding</strong>: ek encoded video ko decode karke doosre codec/resolution/bitrate mein dobara encode karna. Har output version ek <strong>rendition</strong> hai. Saari renditions ki list (jaise 240p se le kar 1080p @ 5,800 kbps tak) ko <strong>bitrate ladder</strong> kehte hain: seedhi ki tarah, har rung ek quality.` },
    { type: 'callout', tone: 'term', title: 'Naya word: DAG', html: `<strong>Ye kya hai:</strong> DAG (Directed Acyclic Graph) kaamon ka ek naksha hai. Teer batate hain "ye kaam us kaam ke baad", aur koi gol chakkar (cycle) nahi hota. Jaise: pehle file check karo, phir tukde karo, phir har tukda encode karo, phir jodo.<br><strong>Kyun chahiye:</strong> jo kaam ek doosre pe depend nahi karte (chunk 3 ka 720p aur chunk 9 ka 240p), wo saath saath (parallel) chal sakte hain. Aur fail ho to sirf wahi ek kaam dobara.<br><strong>Iske bina:</strong> sab kaam ek lambi line mein, ek ke baad ek: slow, aur beech mein kuch toota to shuru se.` },
    { type: 'p', html: `Netflix ne 2015 ke apne post "High Quality Video Encoding at Scale" mein apni pipeline batayi thi (post purani hai, lekin idea aaj bhi standard hai). Usi pe based simplified DAG:` },
    { type: 'ascii', text: `
 raw file
    │
    v
 inspect      (validate, index banao, source fingerprints)
    │
    v
 split ──┬─> chunk 1 @ 240p  ─┐
         ├─> chunk 1 @ 720p  ─┤      har task ke baad turant check;
         ├─>   ...            ├─>    fail → sirf wahi task retry
         └─> chunk N @ 1080p ─┘
                    │
                    v
 assemble (har rung) ─> validate (fingerprint match) ─> package (HLS/DASH) ─> READY

 raw ──┬─> thumbnails
       ├─> captions        (ye branches encode ke saath parallel)
       └─> moderation`, caption: 'Transcoding DAG (simplified). Teer = "iske baad".' },
    { type: 'list', items: [
      `<strong>Inspect pehle:</strong> Netflix ke post ke mutabik kharab source file ko theek karne ki koshish nahi karte, use reject karke partner se dobara maangte hain ("garbage in, garbage out"). Inspection bhi chunks mein parallel hoti hai, aur yahin source ke fingerprints banaye jaate hain.`,
      `<strong>Chunks parallel:</strong> lambi video ko chunks mein tod ke hazaaron machines pe ek saath encode. Har chunk encode hote hi check hota hai, to galti turant pakdi jaati hai, poori movie ke khatam hone ka wait nahi.`,
      `<strong>Assemble + validate:</strong> chunks jod ke, encode ke fingerprints ko source ke fingerprints se milaate hain, taaki chunks galat order mein na jude hon ya boundary pe frames gire/double na hue hon.`,
      `<strong>Result:</strong> Netflix ne likha ki chunked encoding se pehle ek 1080p movie mein <em>din</em> lag sakte the, aur nayi pipeline mein poora title kuch <em>ghanton</em> mein inspect + encode ho jaata tha.`,
    ]},
    { type: 'callout', tone: 'term', title: 'Box: packager', html: `<strong>Ye kya hai:</strong> DAG ka aakhri step. Wo har quality ki encoded video ko 2-6 second ke tukdon (segments) mein kaatta hai aur manifest (tukdon ki list) likhta hai, HLS aur/ya DASH format mein.<br><strong>Kyun chahiye:</strong> player tukde aur manifest hi samajhta hai. Ek hi encoded video se HLS (Apple devices) aur DASH (baaki) dono ban sakte hain.<br><strong>Iske bina:</strong> encode ho chuki video bhi player ke kaam ki nahi: na turant start, na quality switch.<br>Live mein packager har 4 second naya tukda kaatta hai (<a href="#/design-hotstar">JioHotstar</a>). VOD mein ye ek baar, poori video ke liye, chalta hai.` },
    { type: 'p', html: `Khud dekho chunking kitna farak dalta hai. CPU ki speed "maan lo" number hai:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="ytcL">Video length (minutes)</label><input id="ytcL" type="number" value="60" min="1" step="1"></div>
          <div><label for="ytcC">Chunk length (minutes)</label><input id="ytcC" type="number" value="3" min="0.5" step="0.5"></div>
          <div><label for="ytcR">Ladder rungs (renditions)</label><input id="ytcR" type="number" value="10" min="1" step="1"></div>
          <div><label for="ytcW">Workers</label><input id="ytcW" type="number" value="200" min="1" step="10"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Tasks</span><strong class="ytcT"></strong></div>
          <div class="stat"><span>Ek machine pe</span><strong class="ytcS"></strong></div>
          <div class="stat"><span>Chunked, parallel</span><strong class="ytcP"></strong></div>
          <div class="stat"><span>Ek crash = kitna kaam doobaa</span><strong class="ytcX"></strong></div>
        </div>
        <div class="calc-note ytcN"></div>`;
      const q = s => el.querySelector(s), SP = 2;
      const fm = m => m >= 120 ? (m / 60).toFixed(1) + ' ghante' : Math.round(m) + ' min';
      const upd = () => {
        const L = Math.max(1, +q('#ytcL').value || 1), C = Math.max(0.5, +q('#ytcC').value || 0.5);
        const R = Math.max(1, Math.round(+q('#ytcR').value || 1)), W = Math.max(1, Math.round(+q('#ytcW').value || 1));
        const chunks = Math.ceil(L / C), tasks = chunks * R, waves = Math.ceil(tasks / W);
        const serial = L * R * SP, par = waves * C * SP;
        q('.ytcT').textContent = tasks.toLocaleString('en-IN');
        q('.ytcS').textContent = fm(serial);
        q('.ytcP').textContent = fm(par);
        q('.ytcX').textContent = fm(C * SP);
        q('.ytcN').textContent = `Maan lo ek minute video ko ek rung mein encode karne mein ${SP} minute CPU lagta hai. ${chunks} chunks × ${R} rungs = ${tasks} tasks, ${W} workers pe ${waves} round(s). Chunk jitna chhota, utna parallel aur crash pe utna kam nuksaan, lekin har chunk ka overhead aur encoder ko aage-peeche dekhne ka mauka kam (Netflix ne bhi ye penalty maani hai). Assemble aur packaging ka time alag se judta hai.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},

    { type: 'h3', text: 'Ek ladder sabke liye? Per-title encoding' },
    { type: 'p', html: `Pehla design: har video ke liye same ladder. Netflix ne 2010 ke aas paas yahi kiya tha: ek fixed ladder jiska sabse upar ka rung 1080p @ 5,800 kbps tha. Problem: videos bahut alag hoti hain. Ek cartoon mein bade flat rang hain aur kam motion, to wo kam bits mein hi saaf dikhta hai. Ek action movie (dhamaake, paani, film grain) ko 5,800 kbps pe bhi kahin kahin blocks dikhte hain.` },
    { type: 'p', html: `Netflix ke December 2015 ke post "Per-Title Encode Optimization" ka idea: har title ke liye trial encodes chalao, quality napo, aur <strong>us title ka apna ladder</strong> banao. Unke diye examples:` },
    { type: 'table', head: ['Title (Netflix post, 2015)', 'Fixed ladder', 'Per-title ladder'], rows: [
      ['BoJack Horseman (simple animation)', '1,750 kbps pe sirf 480p', '1,540 kbps pe hi 1080p shuru'],
      ['Orange Is the New Black (average)', 'Top rung 1080p @ 5,800 kbps', 'Top rung 1080p @ 4,640 kbps (~20% kam bits, wahi quality)'],
      ['Complex action title', '5,800 kbps pe bhi artifacts', 'Top rung 5,800 se upar bhi ja sakta hai'],
    ]},
    { type: 'p', html: `Khud khel ke dekho. Neeche ek <strong>"maan lo" model</strong> hai (asli VMAF nahi, sirf idea samjhane ke liye): har resolution ka quality score 0-100, bitrate aur video ki complexity ke hisaab se. Fixed ladder Netflix post ke points jaisa hai: 2,350 kbps se neeche 480p, 2,350-4,299 pe 720p, 4,300 se upar 1080p. Per-title wala har bitrate pe us video ke liye sabse achha resolution chunta hai.` },
    { type: 'custom', render(el) {
      const RES = [['480p', 0.41, 70], ['720p', 0.92, 85], ['1080p', 2.07, 96]], CX = { cartoon: 0.2, drama: 0.55, action: 1.3 }, K = 1200, BWS = [1050, 1750, 2350, 3000, 4300, 5800];
      const score = (r, b, c) => r[2] * (1 - Math.exp(-b / (c * r[1] * K)));
      const fixed = b => b < 2350 ? 0 : b < 4300 ? 1 : 2;
      el.innerHTML = `<div class="chips ptT" role="group" aria-label="Video type">
          <button type="button" class="chip" data-t="cartoon">Cartoon (flat rang)</button>
          <button type="button" class="chip" data-t="drama">Drama (average)</button>
          <button type="button" class="chip" data-t="action">Action (dhamaake, grain)</button>
        </div>
        <div class="chips ptB" role="group" aria-label="Bitrate" style="margin-top:6px">${BWS.map(b => `<button type="button" class="chip" data-b="${b}">${b.toLocaleString('en-IN')} kbps</button>`).join('')}</div>
        <div class="ptRows" style="margin-top:10px;display:grid;gap:6px"></div>
        <div class="stats">
          <div class="stat"><span>Fixed ladder: resolution · score</span><strong class="ptF"></strong></div>
          <div class="stat"><span>Per-title: resolution · score</span><strong class="ptP"></strong></div>
          <div class="stat"><span>Quality ka farak</span><strong class="ptD"></strong></div>
        </div>
        <div class="calc-note ptN"></div>`;
      const q = s => el.querySelector(s);
      let t = 'cartoon', b = 1750;
      const NOTE = {
        cartoon: 'Cartoon mein kam detail hai, to 1080p kam bits mein hi saaf ho jaata hai. Fixed ladder 1,750 pe 480p deta hai; per-title 1080p (BoJack Horseman ke saath Netflix ne yahi dekha: 1,540 kbps pe hi 1080p). Upar ke rungs (4,300 vs 5,800) mein farak lagbhag zero: wo bits bekaar.',
        drama: 'Average video pe dono ladders kaafi paas hain. Farak kinaron pe hai: neeche 720p behtar, aur upar sabse bada rung thoda chhota rakh ke bhi wahi quality (Netflix: Orange Is the New Black ka top rung 5,800 ki jagah 4,640).',
        action: 'Action mein bahut detail aur motion. 4,300 kbps pe 1080p ke itne saare pixels ko kam bits milte hain, blocks dikhte hain; is bitrate pe 720p zyada saaf. Per-title yahan resolution neeche rakhta hai, aur top rung 5,800 se upar bhi le ja sakta hai.',
      };
      const draw = () => {
        const c = CX[t], s = RES.map(r => score(r, b, c)), best = s.indexOf(Math.max(...s)), f = fixed(b);
        q('.ptRows').innerHTML = RES.map((r, i) => `<div style="display:flex;align-items:center;gap:8px;font:13px var(--f-mono)">
            <span style="width:48px">${r[0]}</span>
            <span style="flex:1;height:14px;background:var(--surface-2);border-radius:var(--r-sm);overflow:hidden"><span style="display:block;height:100%;width:${s[i].toFixed(0)}%;background:${i === best ? 'var(--accent)' : 'var(--ink-3)'}"></span></span>
            <span style="width:30px;text-align:right">${s[i].toFixed(0)}</span>
            <span style="width:96px;color:var(--ink-3)">${i === best ? 'per-title' : ''}${i === best && i === f ? ' + ' : ''}${i === f ? 'fixed' : ''}</span></div>`).join('');
        q('.ptF').textContent = RES[f][0] + ' · ' + s[f].toFixed(0);
        q('.ptP').textContent = RES[best][0] + ' · ' + s[best].toFixed(0);
        q('.ptD').textContent = '+' + (s[best] - s[f]).toFixed(0);
        q('.ptN').textContent = NOTE[t];
        el.querySelectorAll('[data-t]').forEach(x => x.classList.toggle('on', x.dataset.t === t));
        el.querySelectorAll('[data-b]').forEach(x => x.classList.toggle('on', +x.dataset.b === b));
      };
      el.querySelectorAll('[data-t]').forEach(x => x.onclick = () => { t = x.dataset.t; draw(); });
      el.querySelectorAll('[data-b]').forEach(x => x.onclick = () => { b = +x.dataset.b; draw(); });
      draw();
    }},
    { type: 'p', html: `Try karo: <strong>Cartoon + 1,750</strong>: fixed 480p (score 70), per-title 1080p (93). <strong>Action + 4,300</strong>: fixed 1080p (71), per-title 720p (81). <strong>Drama + 4,300</strong>: dono 1080p, koi farak nahi. Har bitrate pe "sabse achhe" resolution ko jodne wali line hi convex hull hai (neeche).` },
    { type: 'callout', tone: 'why', title: 'Interview depth: convex hull aur VMAF', html: `Har resolution ka ek bitrate range hota hai jisme wo baaki resolutions se behtar dikhta hai. Kam bitrate pe 1080p ke bahut saare pixels ko kam bits milte hain to blocks dikhte hain; wahan 720p behtar. Saare resolutions ke "best" hisson ko jodne se ek boundary banti hai jise Netflix <strong>convex hull</strong> kehta hai, aur ladder ke rungs isi ke paas chune jaate hain. Quality napne ke liye Netflix ne <strong>VMAF</strong> banaya (University of Southern California ke saath), ek perceptual metric jo insaan ki aankh jaisa score dene ki koshish karta hai.` },
    { type: 'p', html: `Aur aage: Netflix ke March 2018 ke post "Dynamic Optimizer" mein unit <em>title</em> ki jagah <strong>shot</strong> ho gaya. Shot ek camera ka chhota hissa hai jisme frames ek jaise hote hain. Har shot ke liye alag resolution/quality chuni jaati hai, aur keyframes shot boundaries pe rakhe jaate hain. Post ke mutabik fixed-QP encoding ke muqable teen codecs (x264, VP9, x265) pe lagbhag 28-38% bitrate bachat hui, same quality pe. Ye sab tabhi mumkin hai jab encoding chunked aur parallel ho: compute zyada lagta hai, lekin ek baar encode, karodon baar stream.` },
    { type: 'callout', tone: 'tip', title: 'YouTube ka jawab: custom hardware', html: `YouTube ka problem ulta hai: titles bahut zyada (500+ ghante har minute), har ek pe itna mehnga analysis mushkil. YouTube ke April 2021 ke blog ke mutabik unhone transcoding ke liye apni chip banayi, <strong>VCU (Video Coding Unit)</strong>, codename Argos, jo unke pichhle software-on-servers system se 20-33x zyada compute efficient batayi gayi. Lesson: jab ek hi kaam crores baar ho, to us kaam ke liye special hardware bhi sasta pad sakta hai.` },

    { type: 'h2', text: 'Deep dive 3: HLS/DASH aur adaptive bitrate' },
    { type: 'p', html: `Ab dekhne wala hissa. Pehla idea: poori 1080p file ek baar mein bhej do. Teen problems: (1) Riya metro mein hai, bandwidth har second badalti hai; (2) seek karna ho to beech ka hissa chahiye; (3) 5 minute dekh ke band kiya to baaki file ka data bekaar gaya.` },
    { type: 'p', html: `Solution: har rendition ko <strong>chhote segments</strong> (kuch seconds ke) mein kaato, aur ek <strong>manifest</strong> file mein likho kaun kaun si qualities hain aur unke segments kahan hain. Player khud har segment se pehle tay karta hai kaunsi quality maangni hai. Isko <strong>adaptive bitrate (ABR)</strong> streaming kehte hain.` },
    { type: 'callout', tone: 'term', title: 'Thoda aur detail: HLS, DASH, segment, buffer', html: `Step 0 ke words, ab naam ke saath. <strong>HLS</strong> (HTTP Live Streaming, Apple ka) aur <strong>MPEG-DASH</strong> (ek open standard) dono ka idea same: video = bahut saare chhote files, normal HTTP pe. HLS ki manifest <code>.m3u8</code> playlist hoti hai, DASH ki <code>.mpd</code>. <strong>Segment</strong>: ek chhoti file (Apple ki HLS authoring guide 6 second ka target suggest karti hai). <strong>Buffer</strong>: player ke paas pehle se download kiya hua aage ka video, seconds mein. Buffer khatam = rebuffering.` },
    { type: 'code', text: `
# master.m3u8 (HLS): kaunsi qualities hain
#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=560000,RESOLUTION=512x288
360p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1750000,RESOLUTION=854x480
480p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1280x720
720p/index.m3u8

# 720p/index.m3u8: is quality ke segments
#EXT-X-TARGETDURATION:6
#EXTINF:6.0,
seg_0001.m4s
#EXTINF:6.0,
seg_0002.m4s` },
    { type: 'p', html: `Kyunki segments normal HTTP files hain, unhe koi bhi CDN cache kar sakta hai. Aur kyunki har quality ke segments time pe aligned hain (segment 42 har rung mein same seconds ka), player segment 41 720p mein aur segment 42 360p mein le sakta hai. Bas yahi switch hai.` },

    { type: 'h3', text: 'Simulator: player quality kaise chunta hai' },
    { type: 'p', html: `Neeche 3 minute ka ek seeded network trace hai (har baar same). Segment 4 second ka, player max 30 second aage tak buffer karta hai, aur ladder ke rungs 235 se 5,800 kbps tak (ek example ladder; sabse upar ka rung Netflix ke purane fixed ladder jaisa). Network aur player ka logic badlo, aur time slider ghuma ke dekho kis pal kya ho raha hai.` },
    { type: 'custom', render(el) {
      /*SIM*/
      const LAD = [235, 560, 1050, 1750, 3000, 5800], SEG = 4, MAXB = 30, T = 180;
      const trace = (kind) => {
        let s = kind === 'wifi' ? 11 : kind === 'metro' ? 29 : 47;
        const rnd = () => (s = s * 16807 % 2147483647) / 2147483647;
        const bw = [];
        let walk = 2000;
        for (let t = 0; t < T; t++) {
          let v;
          if (kind === 'wifi') v = 7000 * (0.85 + 0.3 * rnd());
          else if (kind === 'metro') {
            v = 3200 * (0.7 + 0.6 * rnd());
            if ((t >= 50 && t < 72) || (t >= 120 && t < 135)) v = 150 + 250 * rnd();
          } else {
            walk += (rnd() - 0.5) * 900;
            walk = Math.max(400, Math.min(3600, walk));
            v = walk;
          }
          bw.push(Math.round(v));
        }
        return bw;
      };
      const sim = (bw, algo) => {
        const dt = 0.1, out = [], stalls = [];
        let buf = 0, playing = false, started = -1, dl = null, idle = false;
        let est = [], rebufN = 0, rebufS = 0, inStall = false, sw = 0, last = -1, sumR = 0, nSeg = 0;
        const pick = () => {
          if (algo === 'high') return LAD.length - 1;
          const e = est.length ? est.length / est.reduce((a, x) => a + 1 / x, 0) : 0;
          const byRate = () => { let k = 0; LAD.forEach((r, i) => { if (r <= 0.8 * e) k = i; }); return k; };
          if (algo === 'rate') return byRate();
          if (nSeg < 3) return byRate();
          const lo = 8, hi = 24;
          if (buf <= lo) return 0;
          if (buf >= hi) return LAD.length - 1;
          return Math.floor((buf - lo) / (hi - lo) * (LAD.length - 1));
        };
        const startDl = () => { const k = pick(); dl = { k, left: LAD[k] * SEG, t0: 0 }; };
        startDl();
        for (let i = 0; i < T / dt; i++) {
          const t = i * dt, sec = Math.floor(t + 1e-9);
          if (dl) {
            dl.left -= bw[sec] * dt; dl.t0 += dt;
            if (dl.left <= 0) {
              buf += SEG; nSeg++; sumR += LAD[dl.k];
              if (last >= 0 && dl.k !== last) sw++;
              last = dl.k;
              est.push(LAD[dl.k] * SEG / dl.t0); if (est.length > 3) est.shift();
              dl = null;
            }
          }
          if (!dl && buf <= MAXB - SEG) startDl();
          if (playing) {
            buf -= dt;
            if (buf <= 0) { buf = 0; playing = false; inStall = true; rebufN++; stalls.push([t, t]); }
          } else if (buf >= SEG) {
            playing = true;
            if (started < 0) started = t;
            inStall = false;
          }
          if (inStall) { rebufS += dt; stalls[stalls.length - 1][1] = t + dt; }
          if (i % 10 === 9) out.push({ t: sec, bw: bw[sec], r: LAD[dl ? dl.k : last < 0 ? 0 : last], buf: +buf.toFixed(2) });
        }
        return { out, stalls, rebufN, rebufS: Math.round(rebufS), sw, avg: nSeg ? Math.round(sumR / nSeg) : 0, start: +started.toFixed(1) };
      };
      /*ENDSIM*/
      el.innerHTML = `<div class="chips ytaNet" role="group" aria-label="Network">
          <button type="button" class="chip" data-n="wifi">Ghar ka WiFi</button>
          <button type="button" class="chip" data-n="metro">Metro (2 tunnels)</button>
          <button type="button" class="chip" data-n="crowd">Bheed wala 4G</button>
        </div>
        <div class="chips ytaAlg" role="group" aria-label="Player logic" style="margin-top:6px">
          <button type="button" class="chip" data-a="high">Hamesha 1080p (no ABR)</button>
          <button type="button" class="chip" data-a="rate">ABR: throughput-based</button>
          <button type="button" class="chip" data-a="buffer">ABR: buffer-based</button>
        </div>
        <svg class="ytaSvg" viewBox="0 0 640 262" style="width:100%;height:auto;display:block;margin-top:10px" role="img" aria-label="Bandwidth, chosen bitrate and buffer over time"></svg>
        <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:13px;color:var(--ink-3)">
          <span><span style="display:inline-block;width:14px;height:3px;background:var(--ink-3);vertical-align:middle"></span> network bandwidth</span>
          <span><span style="display:inline-block;width:14px;height:3px;background:var(--accent);vertical-align:middle"></span> player ka chuna rung</span>
          <span><span style="display:inline-block;width:14px;height:3px;background:var(--green);vertical-align:middle"></span> buffer (seconds)</span>
          <span><span style="display:inline-block;width:14px;height:10px;background:var(--red);opacity:.35;vertical-align:middle"></span> rebuffering</span>
        </div>
        <label for="ytaT" style="margin-top:8px">Time: <strong class="ytaTv"></strong></label>
        <input id="ytaT" type="range" min="0" max="179" value="60" style="width:100%">
        <div class="stats">
          <div class="stat"><span>Rebuffer events</span><strong class="ytaRb"></strong></div>
          <div class="stat"><span>Ruka hua time</span><strong class="ytaRs"></strong></div>
          <div class="stat"><span>Average bitrate</span><strong class="ytaAv"></strong></div>
          <div class="stat"><span>Quality switches</span><strong class="ytaSw"></strong></div>
          <div class="stat"><span>Start hone mein</span><strong class="ytaSt"></strong></div>
        </div>
        <div class="calc-note ytaN"></div>`;
      const q = s => el.querySelector(s), svg = q('.ytaSvg');
      let net = 'metro', alg = 'high', R = null;
      const X = t => 40 + t * 3.3, Y1 = k => 140 - Math.min(k, 9000) / 9000 * 125, Y2 = b => 250 - b / 30 * 70;
      const NOTE = {
        high: 'Player hamesha sabse upar ka rung maangta hai. Network uski speed na de to har segment late, buffer khaali, video atakti hai. Tez WiFi pe ye theek chalta hai, mobile pe nahi.',
        rate: 'Player pichhle 3 segments ki download speed se andaaza lagata hai aur 80% safety margin ke saath rung chunta hai. Atakta kam hai, lekin safe khelta hai: tez WiFi pe bhi 5,800 nahi chunta kyunki 0.8 × 7,000 < 5,800.',
        buffer: 'Shuru ke 3 segments speed se, uske baad buffer dekh ke: buffer 8 s se kam to sabse neeche, 24 s se zyada to sabse upar, beech mein seedhi line. Buffer ek shock absorber hai. Netflix aur Stanford ke 2014 ke paper ne isi tarah ke buffer-based approach se rebuffers 10-20% kam kiye the.',
      };
      const draw = () => {
        R = sim(trace(net), alg);
        const o = R.out;
        const line = (f, cls) => `<polyline fill="none" style="${cls}" points="${o.map(p => X(p.t).toFixed(1) + ',' + f(p).toFixed(1)).join(' ')}"/>`;
        const step = o.map((p, i) => `${X(p.t).toFixed(1)},${Y1(p.r).toFixed(1)} ${X(p.t + 1).toFixed(1)},${Y1(p.r).toFixed(1)}`).join(' ');
        let g = '';
        [0, 3000, 6000, 9000].forEach(k => { g += `<line x1="40" x2="634" y1="${Y1(k)}" y2="${Y1(k)}" style="stroke:var(--line);stroke-width:1"/><text x="36" y="${Y1(k) + 4}" text-anchor="end" style="fill:var(--ink-3);font:10px var(--f-mono)">${k / 1000}M</text>`; });
        [0, 15, 30].forEach(b => { g += `<line x1="40" x2="634" y1="${Y2(b)}" y2="${Y2(b)}" style="stroke:var(--line);stroke-width:1"/><text x="36" y="${Y2(b) + 4}" text-anchor="end" style="fill:var(--ink-3);font:10px var(--f-mono)">${b}s</text>`; });
        R.stalls.forEach(s => { g += `<rect x="${X(s[0]).toFixed(1)}" y="12" width="${Math.max(2, (s[1] - s[0]) * 3.3).toFixed(1)}" height="240" style="fill:var(--red);opacity:.3"/>`; });
        g += line(p => Y1(p.bw), 'stroke:var(--ink-3);stroke-width:1.5');
        g += `<polyline fill="none" style="stroke:var(--accent);stroke-width:2.5" points="${step}"/>`;
        g += line(p => Y2(p.buf), 'stroke:var(--green);stroke-width:2');
        g += `<text x="44" y="11" style="fill:var(--ink-3);font:11px var(--f-body)">kbps</text><text x="44" y="166" style="fill:var(--ink-3);font:11px var(--f-body)">buffer</text>`;
        g += `<line class="ytaCur" x1="0" x2="0" y1="12" y2="252" style="stroke:var(--ink);stroke-width:1;stroke-dasharray:3 3"/>`;
        svg.innerHTML = g;
        q('.ytaRb').textContent = R.rebufN;
        q('.ytaRs').textContent = R.rebufS + ' s';
        q('.ytaAv').textContent = R.avg.toLocaleString('en-IN') + ' kbps';
        q('.ytaSw').textContent = R.sw;
        q('.ytaSt').textContent = R.start + ' s';
        q('.ytaN').textContent = NOTE[alg];
        el.querySelectorAll('[data-n]').forEach(b => b.classList.toggle('on', b.dataset.n === net));
        el.querySelectorAll('[data-a]').forEach(b => b.classList.toggle('on', b.dataset.a === alg));
        cur();
      };
      const cur = () => {
        const t = +q('#ytaT').value, p = R.out[t];
        const l = svg.querySelector('.ytaCur'); l.setAttribute('x1', X(t)); l.setAttribute('x2', X(t));
        const st = R.stalls.some(s => t >= Math.floor(s[0]) && t < s[1]);
        q('.ytaTv').textContent = `${t}s · network ${p.bw.toLocaleString('en-IN')} kbps · rung ${p.r.toLocaleString('en-IN')} kbps · buffer ${p.buf.toFixed(1)} s${st ? ' · ATKA HUA' : ''}`;
      };
      el.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { net = b.dataset.n; draw(); });
      el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { alg = b.dataset.a; draw(); });
      q('#ytaT').addEventListener('input', cur);
      draw();
    }},
    { type: 'p', html: `Kya dikha? <strong>Metro + Hamesha 1080p</strong>: 19 baar atka, 3 minute mein ~97 second ruka, aur start hone mein 7 second. Wahi network, <strong>throughput-based ABR</strong>: zero rebuffer, average ~1,550 kbps. <strong>Buffer-based</strong>: zero rebuffer aur average ~2,230 kbps, lekin quality zyada baar badli (19 switches vs 7). Aur ghar ke WiFi pe "hamesha 1080p" bhi bilkul theek chala: problem high quality nahi, network ke hisaab se na badalna hai.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion: quality server badalta hai?', html: `Nahi. ABR mein server "dumb" hai: wo bas files rakhta hai. Har segment se pehle <strong>player (client)</strong> tay karta hai kaunsa rung maangna hai, apne buffer aur download speed dekh ke. Isi wajah se segments ko CDN pe normal files ki tarah cache kar sakte hain. Doosri galatfehmi: "sabse achha ABR = sabse zyada average quality". Asal mein teen cheezein balance karni hain: rebuffering (sabse bura), quality, aur baar baar switching (aankh ko chubhta hai).` },

    { type: 'h2', text: 'Deep dive 4: CDN, Netflix Open Connect' },
    { type: 'p', html: `Napkin maths mein 30 Tbps nikla. <a href="#/cdn">CDN lesson</a> mein dekha tha ki commercial CDN cache miss pe origin se laata hai (pull). Netflix ne ek alag rasta liya. Open Connect ke official overview ke mutabik Netflix ne 2011 mein apna CDN banana shuru kiya, aur iske building block hain <strong>Open Connect Appliances (OCAs)</strong>: Netflix ke banaye cache servers jo sirf video files store karke HTTP/HTTPS pe serve karte hain.` },
    { type: 'p', html: `Pehle teen naye words, kyunki Open Connect inhi ke around bana hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: ISP aur IX (internet exchange)', html: `<strong>Ye kya hai:</strong> <strong>ISP</strong> (Internet Service Provider) wo company hai jo tumhe internet deti hai (Jio, Airtel, tumhara local broadband). <strong>IX</strong> ek building hai jahan bahut saari network companies apne cables ek bade switch se jodti hain, taaki data seedha ek doosre ko de sakein. Is seedhe len-den ko <strong>peering</strong> kehte hain. Kisi bade network ko paise de ke uske raaste data bhejna <strong>transit</strong> kehlata hai.<br><strong>Kyun chahiye (is design mein):</strong> video jitna user ke ISP ke paas se aaye, utna tez, aur utna kam paisa transit pe.<br><strong>Iske bina:</strong> har video door ke data center se, kai networks paar karke: zyada latency, zyada kharcha, aur peak time pe raaste jam.` },
    { type: 'image', src: 'assets/img/design-youtube/ix-switch-rack.jpg', alt: 'Frankfurt ke DE-CIX internet exchange mein network switch ke racks, jaali wale darwaazon ke peeche peele fiber cables', caption: 'Ek internet exchange (DE-CIX, Frankfurt) ke switch racks, 2011. Peele cables alag alag networks ke hain. Netflix jaise CDN aise IX points pe apne servers lagate hain, taaki kai ISPs ko peering se seedha video de sakein.', credit: { text: 'Stefan Funke, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:DE-CIX_GERMANY_-_Switch_Rack_(6218137120).jpg', license: 'CC BY-SA 2.0' } },
    { type: 'callout', tone: 'term', title: 'Box: OCA (Open Connect Appliance)', html: `<strong>Ye kya hai:</strong> Netflix ka banaya ek cache server: bahut saari disks, jo sirf video files rakhta hai aur HTTP/HTTPS pe bhejta hai. Ye ISP ke andar ya IX pe lagta hai.<br><strong>Kyun chahiye:</strong> Netflix ke tukde user ke sabse paas. Bytes internet ke bade raaston (backbone) pe chalte hi nahi.<br><strong>Iske bina:</strong> har stream door se, aur Netflix ko commercial CDN ya transit ko bahut zyada paisa dena padta.` },
    { type: 'callout', tone: 'term', title: 'Box: control plane aur steering', html: `<strong>Ye kya hai:</strong> <em>Control plane</em> = wo services jo faisle leti hain (login, licence, kaunsi file, kaunsa server), bytes nahi bhejti. Netflix ki control plane AWS cloud mein hai. <em>Steering</em> uska wo hissa hai jo har viewer ke liye sabse achhe OCAs chunta hai, unki health, unke paas kaunsi files hain, aur network routes (BGP, internet ka "kaunsa raasta kahan jaata hai" wala system) dekh ke.<br><strong>Kyun chahiye:</strong> hazaron OCAs mein se sahi wala chunna, aur kharab wale ko users ko na dena.<br><strong>Iske bina:</strong> users kisi bhi OCA pe jaate, jisme shayad file hi nahi, ya jo band pada hai.` },
    { type: 'list', items: [
      `<strong>ISP ke andar (embedded):</strong> qualifying ISPs (jaise tumhara broadband provider) ko Netflix OCAs free deta hai; ISP bijli, jagah aur network deta hai. Video tumhare ISP ke network se bahar jaati hi nahi.`,
      `<strong>Internet exchange (IX) pe:</strong> jahan bahut saare networks aapas mein judte hain, wahan bhi OCAs lagte hain, jo peering ke through ISPs ko serve karte hain.`,
      `<strong>Control plane AWS mein:</strong> OCAs user data, viewing history ya DRM info nahi rakhte. Login, licence check, "kaunsi files chahiye" aur "kaunse OCA se" ka faisla AWS mein chalne wali services karti hain.`,
      `<strong>Proactive fill:</strong> Netflix ke 2016 ke post "Netflix and Fill" ke mutabik, kyunki Netflix achhe se predict kar leta hai ki log kya aur kab dekhenge, zyaadatar content raat ke off-peak <em>fill windows</em> mein pehle se OCAs pe daal diya jaata hai. Commercial CDN demand pe bharta hai; Open Connect pehle se.`,
    ]},
    { type: 'flow', title: 'Netflix playback aur Open Connect', height: 340,
      nodes: [
        { id: 'c', label: 'Viewer', sub: 'TV / phone', x: 80, y: 180, w: 120, kind: 'client', info: 'Ye kya hai: TV/phone pe Netflix app aur uska player. Play dabane pe pehle AWS se baat karta hai, phir video ke bytes seedhe OCA se leta hai. Kaunsa rung lena hai, ye ABR logic yahin chalta hai.' },
        { id: 'play', label: 'Playback API', sub: 'AWS', x: 260, y: 60, w: 150, kind: 'server', info: 'Ye kya hai: AWS mein chalne wali service jo play ki request sambhalti hai. Official overview ke mutabik: user authorised hai? licence hai? is device aur network ke liye kaunsi files chahiye? Ye sab AWS mein tay hota hai.' },
        { id: 'steer', label: 'Steering', sub: 'cache control, AWS', x: 500, y: 60, w: 160, kind: 'server', info: 'Ye kya hai: control plane ka wo hissa jo har viewer ke liye OCA chunta hai. OCAs apni health, BGP routes aur kaunsi files unke paas hain, ye sab regularly yahan report karte hain. Steering inhi se client ke liye sabse achhe OCAs chunta hai aur unke URLs banata hai.' },
        { id: 'isp', label: 'OCA in ISP', sub: 'embedded', x: 300, y: 290, w: 140, kind: 'edge', info: 'Ye kya hai: ISP ke network ke andar laga Netflix ka cache server (OCA). User ke sabse paas. ISP khud tay karta hai ki uske kaunse customers is OCA pe route hon.' },
        { id: 'ix', label: 'OCA at IX', sub: 'peering', x: 520, y: 290, w: 140, kind: 'edge', info: 'Ye kya hai: internet exchange (IX) building mein laga OCA. Kai ISPs ko peering ke through serve karta hai, aur fill ke time doosre OCAs ke liye source bhi ban sakta hai.' },
        { id: 's3', label: 'S3 origin', sub: 'encoded files', x: 650, y: 180, w: 110, kind: 'data', info: 'Ye kya hai: original copy ka bhandaar (origin), Amazon S3 object storage. Encoding ke baad saari files Amazon S3 mein deploy hoti hain (Netflix and Fill post). Har OCA S3 se nahi bharta; tiered fill hota hai.' },
      ],
      edges: [{ a: 'c', b: 'play' }, { a: 'play', b: 'steer' }, { a: 'c', b: 'isp' }, { a: 'c', b: 'ix' }, { a: 'ix', b: 'isp' }, { a: 's3', b: 'ix' }, { a: 'isp', b: 'steer', dashed: true }, { a: 'ix', b: 'steer', dashed: true }],
      scenarios: [
        { name: 'Play dabaya', steps: [
          { title: 'App AWS se poochhta hai', text: 'Login, subscription, licence aur device check.', go: 'c>play', msg: 'POST /playback  { title: 81234, device: "android-tv" }' },
          { title: 'Kaunse OCA?', text: 'Playback service steering se poochhti hai. Steering ko pata hai kis OCA pe ye files hain, kaun healthy hai, aur kaun user ke network ke sabse paas hai.', go: ['play>steer', 'res:steer>play'] },
          { title: 'URLs client ko', text: 'Client ko OCAs ke URLs milte hain, sabse achha pehle.', go: 'res:play>c', msg: '{ urls: ["https://oca-isp-1...", "https://oca-ix-7..."] }' },
          { title: 'Video ISP ke andar se', text: 'Segments ISP ke andar wale OCA se. Bytes internet ke backbone pe chalte hi nahi. Player har segment pe ABR se rung chunta hai.', flood: { paths: ['res:isp>c'], n: 6 }, after: { isp: { state: 'hit', sub: 'serving' } } },
        ]},
        { name: 'Raat ka fill', intro: 'Kal ek nayi popular series release hogi. Aaj raat use OCAs tak pahunchana hai.', steps: [
          { title: 'Fill master S3 se', text: 'Control plane kuch OCAs ko "fill master" chunta hai. Wo S3 se title download karte hain, off-peak window mein.', go: 'evt:s3>ix', after: { ix: { state: 'ok', sub: 'new title' } } },
          { title: 'Report: ab mere paas hai', text: 'OCA control plane ko batata hai ki title ab uske paas hai.', go: 'evt:ix>steer' },
          { title: 'Paas wale OCAs us se bharte hain', text: 'Baaki OCAs ko ab S3 ki jagah paas ka OCA fill source milta hai (peer/tier fill). Sab S3 se khinchte to mehnga aur slow hota.', go: ['evt:ix>isp', 'evt:isp>steer'], after: { isp: { state: 'ok', sub: 'new title' } } },
          { title: 'Subah: title live', text: 'Kaafi jagah copies hone ke baad title "live" maana jaata hai. Release ke din viewers ki demand pe miss ka toofan nahi.', focus: ['isp', 'ix'] },
        ]},
        { name: 'ISP ka OCA down', steps: [
          { title: 'OCA gir gaya', text: 'Hardware fail. Report bhejna band.', set: { isp: { state: 'down', sub: 'DOWN' } }, focus: ['isp'] },
          { title: 'Chalu stream ka segment fail', text: 'Player ka agla segment request fail hua. Buffer mein abhi kuch seconds bache hain, to video abhi bhi chal rahi hai.', go: 'bad:c>isp' },
          { title: 'Agla URL try', text: 'Client ke paas ek se zyada URLs the; wo agle OCA se segments lene lagta hai. (Fallback ka exact logic Netflix ne publicly detail nahi kiya; ek se zyada URLs dena aur fail pe agla try karna aam industry tareeka hai.) Thoda door hai, to ABR shayad ek rung neeche aaye.', flood: { paths: ['res:ix>c'], n: 5 }, after: { ix: { state: 'hot', sub: 'extra load' } } },
          { title: 'Naye users ko ye OCA milta hi nahi', text: 'Steering ko report aani band, to naye play requests ko ye OCA diya hi nahi jaata. Netflix ke mutabik kharab appliance ko wo bas replace kar dete hain.', go: ['c>play', 'play>steer'] },
        ]},
      ],
    },

    { type: 'h2', text: 'Deep dive 5: metadata, aur YouTube ne Vitess kyun banaya' },
    { type: 'p', html: `Video ke bytes object storage aur CDN mein hain. Lekin title, owner, status, renditions, channel, playlists: ye chhota, structured data hai jisme relations hain. Iske liye SQL natural fit hai. YouTube shuru se MySQL pe tha.` },
    { type: 'p', html: `Vitess ki official history ke mutabik 2010 ke aas paas YouTube ka MySQL peak traffic pe saans phoolne laga tha. Pehle read replicas lagaye, phir writes ke liye <a href="#/sharding">sharding</a> karni padi. Problem: sharding ka logic har app mein likhna, connections ka toofan, aur ek buri query poore DB ko gira de. Jawab: app aur MySQL ke beech ek layer, <strong>Vitess</strong>. Docs ke mutabik isse YouTube ka user base 50x se zyada badh paaya. Baad mein Vitess open source hua aur November 2019 mein CNCF se graduate hua; Slack jaisi companies bhi ise use karti hain.` },
    { type: 'callout', tone: 'term', title: 'Box: Vitess', html: `<strong>Ye kya hai:</strong> MySQL ke aage lagne wali ek layer jo bahut saare MySQL databases (shards) ko app ke liye ek bade database jaisa dikhati hai. <a href="#/sharding">Sharding</a> = data ko kai databases mein baantna, jaise video_id ke hisaab se.<br><strong>Kyun chahiye:</strong> ek MySQL server ki writes aur connections ki ek limit hai. YouTube us limit se aage nikal gaya tha.<br><strong>Iske bina:</strong> har app ko khud yaad rakhna padta ki kaunsa video kis shard pe hai, connections ka toofan, aur ek buri query poora DB gira deti.` },
    { type: 'callout', tone: 'term', title: 'Vitess ke parts', html: `<strong>VTGate</strong>: ek proxy jo MySQL protocol bolta hai. App ko lagta hai wo ek normal MySQL se baat kar raha hai; VTGate query ko sahi shard pe bhejta hai.<br><strong>VTTablet</strong>: har MySQL ke saath chalne wala agent: connection pooling, query ki safety checks, replication sambhalna.<br><strong>Topology service</strong>: ek chhota, strongly consistent store (etcd, ZooKeeper ya Consul) jisme likha hai kaunsa shard kahan hai aur kaun primary hai.` },
    { type: 'flow', title: 'Video metadata on Vitess', height: 320,
      nodes: [
        { id: 'app', label: 'App servers', sub: 'watch page', x: 80, y: 180, w: 120, kind: 'server', info: 'Ye kya hai: xyz.com ke web/app servers jo watch page banate hain. Watch page ke liye video ka title, channel, renditions chahiye. App normal SQL likhta hai, shards ke baare mein nahi sochta.' },
        { id: 'gate', label: 'VTGate', sub: 'query router', x: 260, y: 180, w: 130, kind: 'net', info: 'Ye kya hai: Vitess ka router (proxy), app aur saare MySQL shards ke beech. Query parse karke dekhta hai ki shard key (yahan video_id) di hai ya nahi. Di hai to seedha ek shard; nahi di to saare shards pe (scatter). Hazaaron app connections ko chhote MySQL connection pools pe multiplex karta hai.' },
        { id: 'topo', label: 'Topology', sub: 'etcd / ZooKeeper', x: 260, y: 60, w: 150, kind: 'data', info: 'Ye kya hai: ek chhota, bharosemand store jisme naksha likha hai. Shard map aur har shard ka current primary. Failover ke baad yahin update hota hai, aur VTGate yahin se naya raasta seekhta hai.' },
        { id: 's1', label: 'Shard A', sub: 'VTTablet + MySQL', x: 470, y: 110, w: 160, kind: 'data', info: 'Ye kya hai: ek MySQL database jisme videos ka ek hissa hai: video_id ke hash ki ek range ke videos. Primary MySQL + uske saath VTTablet.' },
        { id: 'rep', label: 'A replica', sub: 'standby', x: 645, y: 185, w: 120, kind: 'data', info: 'Ye kya hai: Shard A ki live copy (replica). Normal din mein reads le sakti hai; primary gire to promote ki ja sakti hai.' },
        { id: 's2', label: 'Shard B', sub: 'VTTablet + MySQL', x: 470, y: 260, w: 160, kind: 'data', info: 'Ye kya hai: doosra MySQL shard, hash range ka doosra hissa. Shards badhane hon to Vitess resharding karke range ko aur todta hai.' },
      ],
      edges: [{ a: 'app', b: 'gate' }, { a: 'gate', b: 'topo' }, { a: 'gate', b: 's1' }, { a: 'gate', b: 's2' }, { a: 's1', b: 'rep' }, { a: 'gate', b: 'rep', id: 'g-rep', hidden: true }],
      scenarios: [
        { name: 'Shard key wali query', steps: [
          { title: 'App normal SQL bhejta hai', text: 'App ko shards ka pata nahi.', go: 'app>gate', msg: "SELECT title, channel_id, status FROM videos WHERE video_id = 'v91'" },
          { title: 'VTGate shard chunta hai', text: 'video_id ka hash → Shard A ki range. Sirf ek shard ko query.', go: ['gate>s1', 'res:s1>gate'], after: { s1: { state: 'hit' } } },
          { title: 'Jawab', text: 'Ek shard, ek fast query. Watch page ki 99% queries aisi honi chahiye.', go: 'res:gate>app' },
        ]},
        { name: 'Scatter query', intro: 'Ab query mein shard key nahi hai.', steps: [
          { title: 'Channel ke saare videos', text: 'Agar shard key video_id hai, to "channel X ke videos" kisi bhi shard pe ho sakte hain.', go: 'app>gate', msg: "SELECT video_id FROM videos WHERE channel_id = 'c7' ORDER BY created DESC LIMIT 20" },
          { title: 'Saare shards se poochho', text: 'VTGate har shard pe query chalata hai aur results jodta hai. 2 shards pe chalta hai, 200 pe mehnga. Ilaaj: ek lookup table (channel → video_ids), jise Vitess mein lookup vindex kehte hain, ya channel ke liye alag sharded table.', parallel: true, go: ['gate>s1', 'gate>s2'], after: { s1: { state: 'warn' }, s2: { state: 'warn' } } },
          { title: 'Merge karke jawab', text: 'Sabse slow shard jitna hi fast. Isliye shard key access pattern dekh ke chunte hain.', parallel: true, go: ['res:s1>gate', 'res:s2>gate'], after: { s1: { state: '' }, s2: { state: '' } } },
        ]},
        { name: 'Primary down', steps: [
          { title: 'Shard A ka primary gira', text: 'Writes fail hone lage. Shard B pe koi asar nahi: sharding se blast radius chhota.', set: { s1: { state: 'down', sub: 'PRIMARY DOWN' } }, go: 'bad:gate>s1' },
          { title: 'Replica promote', text: 'Vitess ke failover tools (reparent; automatic ke liye VTOrc) sabse up-to-date replica ko naya primary banate hain aur topology update karte hain.', set: { rep: { state: 'ok', sub: 'NEW PRIMARY' } }, go: 'evt:gate>topo', show: ['g-rep'] },
          { title: 'VTGate naye primary pe', text: 'App ko kuch badalna nahi pada. Kuch seconds ki writes retry hui; async replication ho to aakhri kuch writes khone ka risk (replication lesson yaad karo).', go: ['app>gate', 'gate>rep', 'res:rep>gate', 'res:gate>app'] },
        ]},
      ],
    },

    { type: 'h2', text: 'Deep dive 6: view counts' },
    { type: 'p', html: `Seedha tareeka: har view pe <code>UPDATE videos SET views = views + 1 WHERE video_id = 'v91'</code>. Ek viral video pe 1 lakh views per second aaye to <strong>ek hi row</strong> pe 1 lakh writes per second: row lock ke liye line lagegi, us shard ka primary pighal jaayega, aur watch page bhi slow (wahi DB). Ye <a href="#/pattern-writes">scaling writes</a> wala classic hot-row problem hai.` },
    { type: 'p', html: `Solution: view ko ek <strong>event</strong> banao, gino memory mein, likho batch mein.` },
    { type: 'callout', tone: 'term', title: 'Box: event log (Kafka) aur aggregator', html: `<strong>Ye kya hai:</strong> <a href="#/kafka">Kafka</a> ek lamba, append-only log hai: events ek line mein likhe jaate hain aur kuch din tak rakhe jaate hain. Usko <em>partitions</em> (alag alag lines) mein baanta jaata hai. <em>Aggregator</em> ek chhota program hai jo log padhta hai aur RAM mein ginti karta hai.<br><strong>Kyun chahiye:</strong> crores views ko DB tak seedha bhejne ki jagah pehle ek jagah jama karo, phir jod ke ek baar likho.<br><strong>Iske bina:</strong> har view ek DB write, viral video ki ek row pe lakhon writes per second, aur DB gir jaata hai.` },
    { type: 'steps', items: [
      { t: 'Event bhejo', d: 'Player "view hua" event bhejta hai (aksar kuch seconds dekhne ke baad). API turant <code>202 Accepted</code>, DB ko chhua bhi nahi.' },
      { t: 'Log mein daalo', d: 'Event <a href="#/kafka">Kafka</a> jaise log mein, partition key = video_id. Ek video ke saare events ek hi partition mein, to ek hi aggregator unhe ginta hai.' },
      { t: 'Memory mein gino', d: 'Aggregator har video ke liye RAM mein counter rakhta hai: v91 → +8,43,000.' },
      { t: 'Har N second pe ek write', d: 'N second baad ek hi write: <code>views = views + 843000</code>. 1 lakh writes/sec ki jagah har 10 second mein 1.' },
      { t: 'Validate', d: 'Bots aur spam views alag pipeline mein filter hote hain. Public count isliye thoda peeche aur approximate rehta hai.' },
    ]},
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="ytvV">Viral video: views per second</label><input id="ytvV" type="number" value="100000" min="1" step="1000"></div>
          <div><label for="ytvN">Flush har kitne second (N)</label><input id="ytvN" type="range" min="1" max="60" value="10"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Seedha: row writes/sec</span><strong class="ytvA"></strong></div>
          <div class="stat"><span>Batch: row writes/sec</span><strong class="ytvB"></strong></div>
          <div class="stat"><span>Ek write mein jod</span><strong class="ytvC"></strong></div>
          <div class="stat"><span>Count kitna purana (max)</span><strong class="ytvD"></strong></div>
        </div>
        <div class="calc-note ytvE"></div>`;
      const q = s => el.querySelector(s);
      const upd = () => {
        const v = Math.max(1, +q('#ytvV').value || 1), n = Math.max(1, +q('#ytvN').value || 1);
        q('.ytvA').textContent = v.toLocaleString('en-IN');
        q('.ytvB').textContent = (1 / n).toFixed(n === 1 ? 0 : 2);
        q('.ytvC').textContent = '+' + (v * n).toLocaleString('en-IN');
        q('.ytvD').textContent = n + ' s';
        q('.ytvE').textContent = `Writes ${(v * n).toLocaleString('en-IN')} guna kam, badle mein count ${n} second tak purana. Aggregator crash ho jaaye to memory ke views ud jaate hain, lekin events Kafka mein hain: naya aggregator aakhri committed offset se dobara gin leta hai. Count aur offset ek saath (atomically) save na hon to kuch views do baar gine ja sakte hain; view count ke liye ye chhota farak chalta hai, paise ke liye nahi.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `YouTube ka official help page bhi yahi kehta hai: views validate hote hain taaki insaani activity hi gini jaaye, isliye count der se update ho sakta hai, YouTube use kuch der dheema ya freeze kar sakta hai, aur kam quality ke playbacks (jaise ek hi video kai tabs mein) discard ho sakte hain. Real-time analytics ke numbers watch page ke count se match na karein, ye bhi wahan likha hai. Matlab: <strong>view count jaan boojh ke approximate aur eventually consistent hai</strong>.` },
    { type: 'callout', tone: 'tip', title: 'Unique viewers?', html: `"Kitne <em>alag</em> logon ne dekha" ginne ke liye har user id yaad rakhna mehnga hai. Wahan <a href="#/ds-for-scale">HyperLogLog</a> jaisa probabilistic structure kaam aata hai: kuch KB memory mein ~1% error ke saath crores unique users (Redis ka HyperLogLog 12 KB mein ~0.81%).` },

    { type: 'h2', text: 'Deep dive 7: recommendations (high level)' },
    { type: 'p', html: `Problem: xyz.com pe crores videos hain, lekin home page pe sirf ~20 jagah hain. Kaunsi 20? YouTube ke VP of Engineering ne 2021 ke official blog mein likha ki 2008 mein YouTube sabko ek hi "Trending" list dikhata tha, sabse zyada views wali videos. Tab zyaadatar viewing search ya bahar ke links se aati thi. Aaj unke mutabik recommendations se aane wali viewing subscriptions aur search se bhi zyada hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: recommendation system', html: `<strong>Ye kya hai:</strong> ek system jo har user ke liye andaaza lagata hai ki wo kaunsi video dekhna pasand karega, aur wahi home page aur "Up next" mein dikhata hai.<br><strong>Kyun chahiye:</strong> crores videos mein se tumhare kaam ki 20 dhoondhna, jo tum khud search karke kabhi na dhoondh pao.<br><strong>Iske bina:</strong> sabko same popular videos. Coding seekhne wale ko bhi movie trailers, aur chhote creators ki achhi videos kabhi kisi tak nahi pahunchti.` },
    { type: 'p', html: `Har request pe crores videos ko ek bade model se score karna bahut slow hai: paper ke mutabik serving ka budget sirf kuch das milliseconds ka hota hai. Isliye YouTube ka 2016 ka research paper (RecSys conference) system ko <strong>do stages</strong> mein todta hai. Paper purana hai, models tab se badal chuke honge, lekin do-stage idea aaj bhi industry standard hai:` },
    { type: 'steps', items: [
      { t: 'Candidate generation (crores → saikdon)', d: 'Ek sasta, tez model user ki watch history aur searches dekh ke saikdon "shayad pasand aayengi" videos nikalta hai. Paper ke mutabik serving pe ye approximate nearest neighbour lookup se hota hai: user aur videos ko numbers ki list (embedding) mein badlo, aur user ke sabse "paas" wali videos uthao.' },
      { t: 'Ranking (saikdon → darjan bhar)', d: 'Ab sirf saikdon videos hain, to ek bada, mehnga model har ek ko saikdon features (video kitni nayi, user ne is channel ko kitna dekha...) ke saath score karta hai. Paper mein score ka matlab tha: is video ko dikhane pe user kitna time dekhega (expected watch time), sirf click nahi.' },
      { t: 'Final list', d: 'Top scores ko kuch rules (ek hi channel baar baar na aaye, purani dekhi video na aaye) ke baad home page pe dikhao.' },
    ]},
    { type: 'callout', tone: 'why', title: 'Click kyun nahi, watch time kyun?', html: `YouTube ke 2021 blog ke mutabik 2011 mein unhone dekha ki click ka matlab ye nahi ki user ne video dekhi bhi. Chamakdaar thumbnail pe click, aur video kuch aur nikli (<em>clickbait</em>). 2012 mein unhone watch time ko signal banaya, aur blog ke mutabik views turant ~20% gire, lekin unhone ise sahi faisla maana. Baad mein surveys (1-5 star) se "valued watchtime", aur likes, shares, dislikes bhi jude.` },
    { type: 'p', html: `Neeche ek chhota xyz.com catalog hai (12 videos, numbers "maan lo"). Interests chuno, phir ranking ka objective badlo aur dekho clickbait kaise upar neeche hota hai:` },
    { type: 'custom', render(el) {
      const V = [['IPL ke 10 best catches', ['cricket'], 8, 0.12, 0.7], ['Virat ka shatak: highlights', ['cricket'], 20, 0.10, 0.6], ['SHOCKING! Dhoni ne ye kya kiya??', ['cricket'], 10, 0.25, 0.1], ['Python 1 ghante mein', ['coding'], 60, 0.06, 0.35], ['Recursion 5 minute mein', ['coding'], 5, 0.09, 0.8], ['Ye trick 99% coders nahi jaante!!', ['coding'], 8, 0.22, 0.12], ['Lo-fi beats for study', ['music'], 90, 0.05, 0.3], ['Arijit live concert', ['music'], 45, 0.08, 0.5], ['Black hole kya hai?', ['science'], 15, 0.08, 0.7], ['Rocket kaise udta hai', ['science'], 12, 0.07, 0.75], ['Naya movie trailer (trending)', ['trending'], 3, 0.15, 0.9], ['Cricket ball ki physics', ['cricket', 'science'], 14, 0.07, 0.8]];
      const TAGS = ['cricket', 'coding', 'music', 'science'];
      el.innerHTML = `<div style="font-size:13px;color:var(--ink-3)">User ki history mein kya hai:</div>
        <div class="chips rcI" role="group" aria-label="Interests">${TAGS.map(t => `<button type="button" class="chip" data-i="${t}">${t}</button>`).join('')}</div>
        <div style="font-size:13px;color:var(--ink-3);margin-top:6px">Ranking kis cheez pe:</div>
        <div class="chips rcO" role="group" aria-label="Objective">
          <button type="button" class="chip" data-o="click">Click ki sambhavna</button>
          <button type="button" class="chip" data-o="watch">Expected watch time</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;margin-top:10px">
          <div><strong style="font-size:13px">Stage 1: candidates</strong><div class="rcC" style="font-size:13px;line-height:1.6"></div></div>
          <div><strong style="font-size:13px">Stage 2: ranked top 4</strong><ol class="rcR" style="font-size:13px;line-height:1.6;margin:4px 0 0 18px;padding:0"></ol></div>
        </div>
        <div class="calc-note rcN"></div>`;
      const q = s => el.querySelector(s);
      let I = ['cricket', 'coding'], obj = 'click';
      const draw = () => {
        const cand = V.filter(v => v[1].includes('trending') || v[1].some(t => I.includes(t)));
        const sc = v => { const m = v[1].filter(t => I.includes(t)).length > 1 ? 1.5 : 1; return obj === 'click' ? v[3] * m : v[3] * v[2] * v[4] * m; };
        const top = cand.map(v => [v, sc(v)]).sort((a, b) => b[1] - a[1]).slice(0, 4);
        q('.rcC').innerHTML = V.map(v => `<div style="${cand.includes(v) ? '' : 'opacity:.35;text-decoration:line-through'}">${v[0]}</div>`).join('');
        q('.rcR').innerHTML = top.map(([v, s]) => `<li>${v[0]} <span style="color:var(--ink-3);font-family:var(--f-mono)">${obj === 'click' ? 'click ' + Math.round(s * 100) + '%' : s.toFixed(2) + ' min'}</span></li>`).join('');
        const bait = top.filter(([v]) => v[4] < 0.2).length;
        q('.rcN').textContent = `12 videos se ${cand.length} candidates bache (sasta filter: interests + trending). Asli YouTube pe ye crores se saikdon hota hai. ` + (obj === 'click' ? `Click pe rank kiya to top 4 mein ${bait} clickbait video(s): log click karte hain, phir sirf 10-12% dekh ke chhod dete hain.` : `Watch time pe rank (click × length × kitna hissa dekha) kiya to top 4 mein ${bait} clickbait. Lambi aur poori dekhi jaane wali videos upar aayin.`);
        el.querySelectorAll('[data-i]').forEach(b => b.classList.toggle('on', I.includes(b.dataset.i)));
        el.querySelectorAll('[data-o]').forEach(b => b.classList.toggle('on', b.dataset.o === obj));
      };
      el.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { const t = b.dataset.i; I = I.includes(t) ? I.filter(x => x !== t) : I.concat(t); draw(); });
      el.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { obj = b.dataset.o; draw(); });
      draw();
    }},
    { type: 'p', html: `Default (cricket + coding) pe: click objective ke top 2 dono clickbait hain (25% aur 22% click). Watch time objective pe "Python 1 ghante mein" (1.26 min per impression) aur "Virat ka shatak" (1.20) upar, clickbait top 4 se bahar. Yahi YouTube ke 2012 wale badlav ka idea hai.` },
    { type: 'p', html: `<strong>System mein kahan baithta hai?</strong> Wahi watch events jo view count ke liye Kafka mein jaate hain, recommendations ke training data bhi hain. Models offline (batch mein, kuch ghanton/din mein) train hote hain. Home page khulne pe ek <em>recommendation service</em> user ki recent history leti hai, candidates nikalti hai, rank karti hai, aur list lautati hai. Public sources exact services nahi batate; ye split (offline training, online serving, events ka ek hi stream) aam industry tareeka hai. Netflix ne 2017 ke apne post mein bataya ki wo sirf titles hi nahi, har title ki thumbnail (artwork) bhi har member ke liye personalise karta hai: kisi ko actor wali image, kisi ko action scene wali.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion: "recommendation = sabse popular"', html: `Popular list sabke liye same hoti hai, to wo sirf ek candidate source hai (widget mein "trending"). Recommendation personal hai: do log ek hi time pe alag home page dekhte hain. Aur "achha" ka matlab sirf click nahi: watch time, survey aur likes jaise signals milake.` },
    { type: 'h2', text: 'Failure scenarios aur bottlenecks' },
    { type: 'table', head: ['Kya toota', 'Asar', 'Bachav'], rows: [
      ['Upload beech mein toota', 'Creator ka GBs ka kaam', 'Resumable session: server batata hai kitne bytes mile, wahin se aage'],
      ['Encode worker mar gaya', 'Ek chunk ka task', 'Chhote idempotent tasks + retry; Netflix spot instances pe isi wajah se chala paata hai'],
      ['Kharab source file', 'Saari renditions kharab', 'Shuru mein inspection; reject karke dobara maango. Assemble ke baad fingerprint match'],
      ['Ek poison video har baar encoder crash kare', 'Workers baar baar marte hain', 'Retry limit, phir dead-letter queue + insaan dekhe (queues lesson)'],
      ['Network gira', 'Rebuffer ka khatra', 'ABR neeche ke rung pe; buffer shock absorber'],
      ['CDN node / OCA down', 'Us area ke viewers', 'Client ke paas kai URLs, steering health dekh ke naye users ko doosra node'],
      ['Nayi hit series, sab ek saath', 'Origin pe miss ka toofan', 'Proactive fill: release se pehle hi OCAs pe (Open Connect)'],
      ['Metadata shard primary down', 'Us shard ke videos ke writes', 'Replica promote (Vitess reparent); doosre shards normal'],
      ['Viral video ki views', 'Ek row pe hot writes', 'Events + in-memory aggregation + batch writes'],
      ['Recommendation service slow ya down', 'Home page khaali ya slow', 'Timeout ke baad pehle se bani (cached) popular/trending list dikhao; home page kabhi khaali nahi (aam industry tareeka)'],
    ]},
    { type: 'callout', tone: 'why', title: 'Sabse bada kharcha kahan?', html: `Compute ek baar lagta hai (encode), bandwidth har view pe. Isliye dono companies encoding pe itna invest karti hain: har 1% bitrate bachat crores views pe guna ho jaati hai. Netflix ka per-title aur per-shot encoding, YouTube ki VCU chip, aur Open Connect, teeno isi equation ke jawab hain.` },

    { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>Apna CDN kab?</strong> Jab video traffic itna bada ho ki ISPs ke saath seedha kaam karna sasta pade aur aap predict kar sako kya dekha jaayega (Netflix). Warna commercial CDN.<br><strong>Kitni encoding mehnat?</strong> Views per title zyada (Netflix) → per-title/per-shot analysis worth it. Uploads bahut zyada aur zyaadatar videos kam dekhe jaate hain (YouTube) → pehle sasta default ladder, aur popular videos ko baad mein behtar codecs mein re-encode karna ek aam industry approach hai.<br><strong>Segment length?</strong> Chhote segments = jaldi switch aur start, lekin zyada requests; VOD mein ~4-6 second common hai.` },
    { type: 'h2', text: 'Interview mein kaise bolein' },
    { type: 'list', ordered: true, items: [
      `<strong>Requirements:</strong> upload, process, watch. NFRs: smooth playback (rebuffer kam), fast start, durability, global scale, bandwidth cost.`,
      `<strong>Numbers:</strong> petabytes per day storage, Tbps egress → object storage + CDN zaroori.`,
      `<strong>Upload:</strong> resumable chunked upload seedha object storage mein (pre-signed/session URL), metadata DB mein status.`,
      `<strong>Processing:</strong> event → DAG orchestrator → chunk × rung tasks on a queue → workers → assemble, validate, package HLS/DASH → READY. Per-title encoding ka zikr bonus.`,
      `<strong>Playback:</strong> manifest + segments, client-side ABR, CDN (Open Connect: ISP ke andar appliances, proactive off-peak fill).`,
      `<strong>Metadata:</strong> sharded MySQL via Vitess, shard key video_id, scatter queries se bacho.`,
      `<strong>Counts:</strong> events → Kafka → aggregate → batch write; approximate aur thoda delayed.`,
      `<strong>Recommendations (agar poochha jaaye):</strong> do stage: sasta candidate generation (crores → saikdon), phir ranking model (watch time pe), offline training, wahi event stream.`,
    ]},
    { type: 'diagram', title: 'Poora design, ek nazar mein', height: 500,
      caption: 'Upar: video andar aana aur taiyaar hona. Beech mein: dekhna (bytes CDN se, faisle API se). Neeche: views aur recommendations ke liye events. Buttons se ek ek raasta dekho.',
      groups: [
        { label: 'Upload aur processing', x: 10, y: 26, w: 700, h: 212 },
        { label: 'Watch', x: 10, y: 260, w: 700, h: 104 },
        { label: 'Async events', x: 190, y: 384, w: 520, h: 102 },
      ],
      nodes: [
        { id: 'creator', label: 'Creator app', sub: 'chunks bhejti hai', x: 90, y: 80, kind: 'client', info: 'Ye kya hai: video upload karne wale ki app. File ko chhote chunks mein bhejti hai aur net toote to wahin se resume karti hai.' },
        { id: 'upapi', label: 'Upload API', sub: 'session URL', x: 270, y: 80, kind: 'server', info: 'Ye kya hai: permission dene wala chhota server. Login aur file check karke session URL deta hai aur DB mein video ki row (UPLOADING) banata hai. Bytes isse nahi guzarte.' },
        { id: 'raw', label: 'Raw storage', sub: 'original file', x: 450, y: 80, kind: 'data', info: 'Ye kya hai: object storage ka bucket jisme creator ki original file. Upload poora hote hi event bhejta hai. Original rakhte hain taaki naye codec aane pe dobara encode ho sake.' },
        { id: 'orch', label: 'DAG orchestrator', sub: 'tasks + queue', x: 630, y: 80, kind: 'queue', info: 'Ye kya hai: kaam baantne wala manager. Video ko chunk × quality tasks mein todta hai, queue mein daalta hai, fail hue tasks retry karta hai, aur status DB mein likhta hai.' },
        { id: 'meta', label: 'Metadata DB', sub: 'MySQL + Vitess', x: 270, y: 200, kind: 'data', info: 'Ye kya hai: video ki jaankari ka database (title, owner, status, qualities). Sharded MySQL, jise Vitess ek DB jaisa dikhata hai. Shard key video_id.' },
        { id: 'enc', label: 'Encoded storage', sub: 'tukde + manifest', x: 450, y: 200, kind: 'data', info: 'Ye kya hai: taiyaar maal ka bucket: har quality ke 2-6 s ke tukde aur manifest. CDN yahin se (ya Netflix mein S3 se fill karke) copies leta hai.' },
        { id: 'workers', label: 'Encode workers', sub: 'transcode, package', x: 630, y: 200, kind: 'server', info: 'Ye kya hai: hazaron machines jo ek ek task karti hain: chunk ko ek quality mein encode, phir jodna, check karna aur HLS/DASH tukde + manifest banana (packager).' },
        { id: 'viewer', label: 'Viewer player', sub: 'ABR', x: 90, y: 320, kind: 'client', info: 'Ye kya hai: phone/TV ka player. Manifest leta hai, phir har tukde se pehle buffer aur speed dekh ke quality chunta hai. View events bhi yahi bhejta hai.' },
        { id: 'cdn', label: 'CDN / OCAs', sub: 'paas ke cache', x: 270, y: 320, kind: 'edge', info: 'Ye kya hai: user ke paas ke cache servers (Netflix mein ISP ke andar OCAs). Video ke saare bytes yahin se jaate hain, raat ko pehle se bhare jaate hain (proactive fill).' },
        { id: 'play', label: 'API servers', sub: 'watch + home', x: 450, y: 320, kind: 'server', info: 'Ye kya hai: watch page aur home page ke servers. Login/licence check, metadata, manifest ka URL aur sahi CDN server (steering) dete hain. Bytes nahi bhejte.' },
        { id: 'reco', label: 'Recommendations', sub: '2 stage', x: 630, y: 320, kind: 'server', info: 'Ye kya hai: home page ki "tumhare liye" list banane wali service. Candidate generation (crores → saikdon), phir ranking (expected watch time). Down ho to popular list dikhao.' },
        { id: 'kafka', label: 'View events', sub: 'Kafka log', x: 270, y: 440, kind: 'queue', info: 'Ye kya hai: append-only event log, partition key video_id. Har "view hua" event yahan. Yahi stream view counts aur recommendations ki training dono ko khilati hai.' },
        { id: 'agg', label: 'Aggregator', sub: 'RAM mein ginti', x: 450, y: 440, kind: 'server', info: 'Ye kya hai: events padh ke har video ki ginti RAM mein jodta hai, bots filter hote hain, aur har N second pe ek batch write karta hai. Hot row khatam.' },
        { id: 'counter', label: 'View counts', sub: 'approx, late', x: 630, y: 440, kind: 'data', info: 'Ye kya hai: video_id → views ka store. Har N second ek write. Watch page yahin se count padhta hai; thoda purana aur approximate, jaan boojh ke.' },
      ],
      edges: [
        { a: 'creator', b: 'upapi', n: 1 }, { a: 'upapi', b: 'meta', n: 2 },
        { a: 'creator', b: 'raw', n: 3, label: 'chunks', via: [[130, 140], [330, 140]] },
        { a: 'raw', b: 'orch', n: 4, kind: 'evt' }, { a: 'orch', b: 'workers', n: 5 },
        { a: 'workers', b: 'raw', dashed: true }, { a: 'workers', b: 'enc', n: 6 },
        { a: 'orch', b: 'meta', label: 'READY', dashed: true },
        { a: 'enc', b: 'cdn' }, { a: 'cdn', b: 'viewer', kind: 'res' },
        { a: 'viewer', b: 'play', via: [[180, 380], [360, 380]] }, { a: 'play', b: 'meta' },
        { a: 'play', b: 'reco' }, { a: 'play', b: 'counter' },
        { a: 'viewer', b: 'kafka', kind: 'evt', via: [[90, 440]] }, { a: 'kafka', b: 'agg', kind: 'evt' }, { a: 'agg', b: 'counter' },
        { a: 'kafka', b: 'reco', kind: 'evt', dashed: true },
      ],
      paths: [
        { name: 'Upload', text: 'Creator → Upload API (session, DB mein UPLOADING) → chunks seedhe raw storage → event → orchestrator → workers → tukde + manifest → DB mein READY.', go: ['creator>upapi>meta', 'creator>raw>orch>workers>enc', 'orch>meta'] },
        { name: 'Watch', text: 'Player API se metadata aur manifest URL leta hai, phir saare tukde paas ke CDN/OCA se, har tukde pe ABR se quality chunta hai.', go: ['viewer>play>meta', 'enc>cdn>viewer'] },
        { name: 'View count', text: 'Player "view hua" event bhejta hai → Kafka → aggregator RAM mein ginta hai → har N s ek batch write → watch page approx count padhta hai.', go: ['viewer>kafka>agg>counter', 'play>counter'] },
        { name: 'Recommendations', text: 'Home page khulte hi API recommendation service se list maangta hai. Model wahi view events se offline seekhta hai.', go: ['viewer>play>reco', 'kafka>reco'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Badi upload: Upload API sirf permission aur session URL deta hai; bytes chunks mein seedhe object storage mein, net toote to wahin se resume.</li>
      <li>Transcoding ek DAG hai: video ko chunk × quality tasks mein todo, hazaron workers pe parallel, fail ho to sirf wahi task dobara.</li>
      <li>Har video ki 10-20 qualities (ladder). Netflix har title (aur har shot) ka apna ladder banata hai: simple video kam bits mein, complex zyada mein.</li>
      <li>Packager tukde (segments) + manifest banata hai. Player har tukde se pehle buffer aur speed dekh ke quality chunta hai (ABR). Faisla client pe.</li>
      <li>Bytes CDN se: Netflix Open Connect ke OCAs ISP ke andar aur IX pe, raat ko pehle se bhare jaate hain. Faisle (login, kaunsa OCA) AWS control plane mein.</li>
      <li>Metadata chhota aur relational: sharded MySQL, Vitess ke peeche, shard key video_id.</li>
      <li>Views: events → Kafka → RAM mein ginti → batch write. Count approximate aur thoda late, jaan boojh ke.</li>
      <li>Recommendations: do stage (sasta candidates, phir ranking on watch time), wahi event stream se seekhte hain.</li>
    </ul>` },

    { type: 'tradeoffs', gains: [
      'Chunked parallel encoding: ghanton ki jagah minutes, crash pe chhota nuksaan',
      'ABR: har network pe chalti video, rebuffer bahut kam',
      'Segments normal HTTP files: koi bhi CDN cache kare',
      'Open Connect: bytes ISP ke andar se, transit ka kharcha aur latency kam',
      'Vitess: MySQL ke saath rehte hue horizontal scale',
      'Batched view counts: hot row khatam',
      'Two-stage recommendations: crores videos mein se milliseconds mein personal list',
    ], costs: [
      'Har video ki 10-20 copies: storage kai guna',
      'Encoding compute bahut mehnga (YouTube ne custom chip tak banayi)',
      'ABR mein quality badalti rehti hai; buffer = live se thoda peeche',
      'Apna CDN = hardware, ISP partnerships, operations team',
      'Scatter queries aur resharding ki complexity',
      'View count approximate aur late',
      'Recommendations ke liye training pipeline, models aur clickbait jaise side effects ki nigrani',
    ]},

    { type: 'think', questions: [
      { q: 'Ek creator ne 3 ghante ki 4K video upload ki aur chahta hai ki wo 5 minute mein "dekhne layak" ho jaaye. DAG mein kya badloge?', a: 'Pehle sirf neeche ke 2-3 rungs (jaise 360p, 720p) encode karke video READY kar do, aur baaki rungs (1080p, 4K, naye codecs) baad mein background mein. Chunks parallel hain to ek rung ka time chunk length pe depend karta hai, video length pe nahi. Manifest mein naye rungs aate hi player unhe use karne lagega.' },
      { q: 'Live cricket match mein ye design kahan tootega?', a: 'Video pehle se available nahi, to proactive fill nahi ho sakta; encoding real-time mein karni padti hai; segments chhote rakhne padte hain taaki delay kam ho; aur crores log ek hi segment ek hi second mein maangte hain (thundering herd at CDN). Iske liye JioHotstar wala lesson dekho: pre-scaling, CDN request collapsing, chhote buffers.' },
      { q: 'Netflix har title ka per-title ladder banata hai. YouTube ke liye har video pe ye karna kyun mushkil hai?', a: 'Har minute 500+ ghante upload hote hain aur zyaadatar videos kam dekhe jaate hain. Trial encodes ka compute har video pe lagana mehnga, jab ki bachat sirf views se aati hai. Isliye effort popularity ke hisaab se lagana samajhdaari hai.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'ABR mein agle segment ki quality kaun tay karta hai?', options: ['CDN server', 'Encoding pipeline', 'Player (client), apne buffer aur download speed dekh ke', 'Metadata DB'], answer: 2, explain: 'Server sirf files rakhta hai. Har segment se pehle player rung chunta hai, isliye segments normal cacheable HTTP files reh sakte hain.' },
      { q: 'Netflix video ko chunks mein tod ke encode kyun karta hai?', options: ['Chunks ki quality behtar hoti hai', 'Parallel encoding se time kam, aur machine crash pe sirf ek chunk dobara', 'CDN sirf chunks samajhta hai'], answer: 1, explain: 'Netflix ke 2015 post ke mutabik chunked encoding se din ka kaam ghanton mein, aur spot instance band hone pe sirf chhota task reschedule hota hai.' },
      { q: 'Open Connect ka "proactive fill" kya hai?', options: ['User ke request pe origin se lana', 'Popularity predict karke raat ke off-peak time mein content pehle se OCAs pe daalna', 'Har OCA pe poora catalog hamesha'], answer: 1, explain: 'Commercial CDNs aksar demand pe bharte hain. Netflix predict kar paata hai kya dekha jaayega, isliye fill windows mein pehle se bhar deta hai.' },
      { q: 'Viral video ke view count ke liye sabse achha design?', options: ['Har view pe UPDATE views = views + 1', 'Events ko log mein daalo, memory mein gino, har kuch second pe ek batch write', 'Har view ke liye nayi row, phir COUNT(*) on every page load'], answer: 1, explain: 'Hot row se bachne ke liye aggregate karke likho. Count thoda late aur approximate hoga, jo is use case mein chalta hai.' },
      { q: 'Vitess mein agar query mein shard key nahi hai to kya hota hai?', options: ['Query fail', 'VTGate saare shards pe query chalata hai (scatter) aur results jodta hai', 'Random shard se jawab'], answer: 1, explain: 'Scatter queries chalti hain lekin mehngi hain. Common access patterns ke liye shard key ya lookup vindex chahiye.' },
      { q: 'Recommendation system ko do stages (candidate generation + ranking) mein kyun todte hain?', options: ['Do teams ke liye kaam baantne ke liye', 'Crores videos ko mehnge model se har request pe score karna bahut slow hai; sasta stage saikdon chunta hai, mehnga model sirf unhe rank karta hai', 'Taaki clickbait upar aaye'], answer: 1, explain: 'YouTube ke 2016 paper mein candidate generation crores ko saikdon tak laata hai, phir ranking model saikdon features ke saath sirf un saikdon ko score karta hai, expected watch time pe.' },
    ]},
    { type: 'sources', note: 'Netflix aur YouTube ke specific claims inhi sources se hain. Purane posts ka saal saath mein likha hai; kai details ab badal chuki hongi.', items: [
      { title: 'High Quality Video Encoding at Scale', publisher: 'Netflix TechBlog', year: 2015, official: true, url: 'https://netflixtechblog.com/high-quality-video-encoding-at-scale-d159db052746', used: 'Cloud encoding pipeline: source inspection, reject bad sources, chunked parallel inspection/encoding, per-chunk checks, assembler, fingerprint validation, days → hours, spot instances.' },
      { title: 'Per-Title Encode Optimization', publisher: 'Netflix TechBlog', year: 2015, official: true, url: 'https://netflixtechblog.com/per-title-encode-optimization-7e99442b62a2', used: 'Fixed vs per-title ladder, convex hull, BoJack 1540 kbps 1080p, OITNB 4640 vs 5800 kbps (~20%), VMAF mention.' },
      { title: 'Dynamic optimizer: a perceptual video encoding optimization framework', publisher: 'Netflix TechBlog', year: 2018, official: true, url: 'https://netflixtechblog.com/dynamic-optimizer-a-perceptual-video-encoding-optimization-framework-e19f1e3a277f', used: 'Shot-based encoding, keyframes at shot boundaries, ~28-38% savings over fixed-QP across x264/VP9/x265.' },
      { title: 'Open Connect Overview', publisher: 'Netflix (openconnect.netflix.com)', official: true, url: 'https://openconnect.netflix.com/Open-Connect-Overview.pdf', used: 'OCAs, started 2011, embedded in ISPs vs IX, control plane in AWS, steering via URLs, playback steps, OCAs store no user data.' },
      { title: 'Netflix and Fill', publisher: 'Netflix TechBlog', year: 2016, official: true, url: 'https://netflixtechblog.com/netflix-and-fill-c43a32b490c0', used: 'Titles deployed to S3, proactive caching in off-peak fill windows, fill masters, peer/tier/cache fill order, title liveness.' },
      { title: 'A Buffer-Based Approach to Rate Adaptation (SIGCOMM 2014)', publisher: 'Stanford University and Netflix', year: 2014, url: 'https://web.stanford.edu/class/cs244/papers/sigcomm2014-video.pdf', used: 'Buffer-based ABR idea, capacity estimate needed mainly at startup, 10-20% fewer rebuffers vs then-default algorithm.' },
      { title: 'Reimagining video infrastructure to empower YouTube', publisher: 'YouTube Official Blog', year: 2021, official: true, url: 'https://blog.youtube/inside-youtube/new-era-video-infrastructure/', used: '500+ hours uploaded per minute, VCU (Argos) transcoding chip, 20-33x compute efficiency.' },
      { title: 'Resumable uploads (YouTube Data API)', publisher: 'Google for Developers', official: true, url: 'https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol', used: 'Session URI via Location header, 308 Resume Incomplete, Content-Range status check, 256 KB chunk multiples.' },
      { title: 'History of Vitess / What is Vitess', publisher: 'vitess.io docs', official: true, url: 'https://vitess.io/docs/overview/history/', used: 'Started at YouTube ~2010 for MySQL scaling, 50x growth, CNCF graduation Nov 2019; VTGate, VTTablet, topology service.' },
      { title: 'How engagement metrics are counted', publisher: 'YouTube Help', official: true, url: 'https://support.google.com/youtube/answer/2991785', used: 'Views validated, may be delayed/frozen/adjusted, low-quality playbacks discarded, analytics vs public count differ.' },
      { title: 'On YouTube\'s recommendation system', publisher: 'YouTube Official Blog', year: 2021, official: true, url: 'https://blog.youtube/inside-youtube/on-youtubes-recommendation-system/', used: '2008 popularity-based Trending page, recommendations now drive more viewing than subscriptions or search, clicks vs watchtime (2011-2012, ~20% drop in views), valued watchtime surveys, likes/shares/dislikes, 80 billion signals.' },
      { title: 'Deep Neural Networks for YouTube Recommendations (RecSys 2016)', publisher: 'Google Research', year: 2016, official: true, url: 'https://research.google/pubs/deep-neural-networks-for-youtube-recommendations/', used: 'Two-stage design: candidate generation (millions → hundreds, approximate nearest neighbour at serving) and ranking (hundreds of features, expected watch time per impression), tens-of-milliseconds serving budget.' },
      { title: 'Artwork Personalization at Netflix', publisher: 'Netflix TechBlog', year: 2017, official: true, url: 'https://netflixtechblog.com/artwork-personalization-c589f074ad76', used: 'Netflix personalises not just which titles are recommended but also which artwork image each member sees.' },
      { title: 'HLS Authoring Specification for Apple Devices', publisher: 'Apple Developer', official: true, url: 'https://developer.apple.com/documentation/http-live-streaming/hls-authoring-specification-for-apple-devices', used: '6 second target segment duration.' },
    ]},
  ],
});
