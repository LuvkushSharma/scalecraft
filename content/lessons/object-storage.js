Lesson.register({
  id: 'object-storage',
  title: 'Object storage aur pre-signed URLs',
  minutes: 32,
  summary: `Photos, videos, PDFs aur backups database mein nahi rakhte. Wo object storage (S3, GCS, Azure Blob) mein jaate hain, aur database mein sirf unka pata (pointer) rehta hai. Is lesson mein: block vs file vs object storage, pre-signed URLs se direct upload, multipart aur resumable uploads, chunking + hashing se dedupe, GFS/HDFS andar se, replication vs erasure coding, aur hot/cold/archive tiers.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `xyz.com pe log videos aur photos daalte hain. Ye files bahut badi hoti hain.<br>Database chhoti chhoti baatein (naam, likes, comments) rakhne ke liye bana hai, badi files ke liye nahi.<br>Isliye badi files ek alag, bahut saste aur bahut bade "godown" mein jaati hain. Database bas yaad rakhta hai ki kaunsi file godown mein kis naam se padi hai.<br>Is lesson mein seekhenge: wo godown kaise kaam karta hai, phone seedha usme file kaise daale, aur crores files ko sasta aur safe kaise rakhein.` },
    { type: 'h2', text: 'Problem: 2 GB ki video kahan rakhein?' },
    { type: 'p', html: `Queues lesson mein xyz.com video platform ban gaya tha: users video upload karte hain, workers use transcode karte hain. Lekin ek sawaal humne chhod diya tha: <strong>video ki file asal mein rehti kahan hai?</strong>` },
    { type: 'p', html: `Pehla idea: database mein hi daal do, ek <code>BLOB</code> column mein. Chhote scale pe chal bhi jaata hai. Phir xyz.com pe roz 1 lakh videos aane lagte hain, har ek ~500 MB. Roz <strong>50 TB</strong> naya data. Dekho kya kya tootta hai:` },
    { type: 'list', items: [
      `<strong>Database phool jaata hai.</strong> DB ki disk mehengi SSD hoti hai, aur saare indexes, backups, replicas is bhaari data ko bhi dhote hain. Ek backup jo 10 minute leta tha, ab 10 ghante.`,
      `<strong>Replication lag.</strong> Har 500 MB ki video primary se har replica pe copy hogi. Chhoti chhoti user/comment writes us line mein peeche atak jaati hain.`,
      `<strong>App servers bhi phanste hain.</strong> 2 GB ki file user ke phone se app server pe aati hai, phir app server se aage. Ek upload 10 minute ek connection aur memory pakad ke rakhta hai. 200 uploads ek saath, aur homepage kholne wale users line mein.`,
      `<strong>Bekaar ki features.</strong> Video ke liye joins, transactions, indexes kisi kaam ke nahi. Bas "ye bytes rakho, baad mein wapas do" chahiye.`,
    ]},
    { type: 'callout', tone: 'term', title: 'Blob', html: `<strong>Ye kya hai:</strong> Blob (Binary Large OBject) matlab koi bhi badi file jise system bas "bytes ka dher" maanta hai: photo, video, PDF, backup. System ko andar ki cheez se matlab nahi.<br><strong>Kyun chahiye:</strong> ye naam isliye ki hum in files ko normal data (naam, number) se alag treat karna chahte hain.<br><strong>Iske bina:</strong> hum video ko bhi ek normal row ki tarah DB mein thoonsenge, aur upar wali saari dikkatein aayengi.` },
    { type: 'callout', tone: 'term', title: 'Object storage', html: `<strong>Ye kya hai:</strong> ek service jo blobs rakhti hai. Tum ek <strong>key</strong> (file ka poora naam, jaise <code>videos/u42/trip.mp4</code>) ke saath bytes dete ho. Wo unhe sasta aur safe rakhti hai, aur internet (HTTP) pe wapas deti hai. Socho ek bahut bada godown jahan har dabbe pe ek unique label hai.<br><strong>Kyun chahiye:</strong> xyz.com ko roz 50 TB videos rakhne hain, sasta, bina khoye, aur duniya bhar ko dikhane ke liye.<br><strong>Iske bina:</strong> database phoolega, mehengi SSD bharegi, backups ghanton chalenge.<br><strong>Example:</strong> Amazon S3, Google Cloud Storage (GCS) aur Azure Blob Storage teen sabse bade naam hain.` },
    { type: 'compare',
      left: { title: 'Pehle: sab kuch DB mein', ascii: `
App
 ↓
Database
  users, comments
  + 50 TB videos/day  (BLOB)
  backups: 10 ghante
  replicas: lag` },
      right: { title: 'Ab: DB mein sirf pointer', ascii: `
App
 ├─> Database (chhota, fast)
 │     video_id, owner, title,
 │     s3_key, size, status
 │
 └─> Object storage (S3)
       videos/u42/trip.mp4
       (bytes yahan)` },
    },

    { type: 'h2', text: 'Block vs file vs object storage' },
    { type: 'p', html: `Storage teen shakal mein milta hai. Teeno alag sawaal ka jawab hain, isliye interview mein ye farak saaf hona chahiye.` },
    { type: 'callout', tone: 'term', title: 'Block storage', html: `<strong>Ye kya hai:</strong> ek "kachchi disk". Data chhote, ek jaise size ke <strong>blocks</strong> (jaise 4 KB) mein rehta hai, aur har block ka ek number hota hai. Disk ko file ya folder ka pata hi nahi. Upar baitha operating system (file system) ya database tay karta hai ki kaunsa block kiska hai. Aam taur pe ek waqt mein ek hi machine ise use karti hai.<br><strong>Kyun chahiye:</strong> database ko kisi badi file ke beech ke 4 KB baar baar, bahut tezi se badalne hote hain. Block storage yahi deta hai, sub-millisecond mein.<br><strong>Iske bina:</strong> database ko har chhoti update pe badi file dobara likhni padti. Bahut slow.<br><strong>Example:</strong> tumhare laptop ki SSD, AWS EBS volume (cloud machine ki disk).` },
    { type: 'callout', tone: 'term', title: 'File storage', html: `<strong>Ye kya hai:</strong> wahi folders aur files jo tum roz dekhte ho: <code>/reports/2025/march.pdf</code>. Jab ye tree network pe kai machines ko ek saath dikhta hai, use <strong>shared file system</strong> kehte hain (NFS, AWS EFS, Azure Files). File ke beech ke kuch bytes badal sakte ho, rename kar sakte ho, lock laga sakte ho.<br><strong>Kyun chahiye:</strong> jab kai servers ko bilkul same files chahiye, normal file paths ke saath (jaise ek purana app jo disk pe files likhta hai).<br><strong>Iske bina:</strong> har server ke paas apni alag copy, aur wo copies aapas mein mel nahi khaayengi.` },
    { type: 'callout', tone: 'term', title: 'Bucket, key aur object', html: `<strong>Ye kya hai:</strong> object storage ki teen cheezein. <strong>Bucket</strong> = ek bada dabba (jaise <code>xyz-videos</code>). <strong>Key</strong> = dabbe ke andar file ka poora naam. <strong>Object</strong> = bytes + thodi jaankari (metadata: type, size, tags). Duniya <strong>flat</strong> hai: koi asli folder nahi, bas key → object. Access HTTP se: <code>PUT</code> (rakho), <code>GET</code> (do), <code>DELETE</code> (hatao).<br><strong>Kyun chahiye:</strong> flat duniya ko hazaaron machines pe baantna aasaan hai, isliye size lagbhag unlimited aur GB ka bhaav bahut kam.<br><strong>Iske bina (keemat):</strong> object ko beech mein se edit nahi kar sakte. 1 byte bhi badalna hai to poora naya object likho.` },
    { type: 'table', head: ['', 'Block', 'File', 'Object'], rows: [
      ['Kaise dikhta hai', 'Numbered blocks, ek kachchi disk', 'Folders ka tree', 'Bucket + flat keys'],
      ['Kaise access', 'OS / DB, disk ki tarah', 'NFS/SMB, normal file paths', 'HTTP API (PUT/GET)'],
      ['Beech mein edit', 'Haan, bahut fast', 'Haan', 'Nahi, poora object dobara'],
      ['Kitne machines', 'Aam taur pe ek', 'Kai, shared', 'Koi bhi, internet pe bhi'],
      ['Latency', 'Sub-millisecond', 'Kuch milliseconds', 'Kuch ms se zyada (har request HTTP)'],
      ['Example', 'AWS EBS, laptop SSD', 'AWS EFS, NFS server', 'S3, GCS, Azure Blob'],
      ['xyz.com mein', 'Postgres ki data disk', 'Purane tool ke shared reports', 'Videos, thumbnails, backups'],
    ]},
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "S3 mein folders hain na?"', html: `S3 console mein folders dikhte hain, lekin asal mein ek hi flat list hai. <code>videos/u42/trip.mp4</code> poori ek key hai; "/" sirf naam ka hissa hai. Console use <strong>prefix</strong> ke hisaab se folder jaisa dikha deta hai. Isliye "folder rename" S3 mein ek operation nahi hai: andar ki har key ko copy + delete karna padta hai.` },
    { type: 'p', html: `Farak padhne se zyada <strong>karke</strong> samajh aata hai. Neeche ek kaam chuno, aur dekho teeno storage us kaam ko kaise karte hain:` },
    { type: 'custom', render(el) {
      const KINDS = ['Block', 'File', 'Object'];
      const VIEW = [
        'Disk: [#0][#1][#2][#3]...\n#812 → trip.mp4 ka hissa\n(sirf numbers, naam OS yaad rakhta hai)',
        '/videos/\n  u42/\n    trip.mp4\n    goa.mp4',
        'bucket: xyz-videos\n"videos/u42/trip.mp4" → bytes\n"videos/u42/goa.mp4"  → bytes',
      ];
      const TASKS = [
        { name: '10 GB file ke beech 4 KB badlo', r: [
          ['good', 'Seedha block #812 pe naye 4 KB likho. Bas ek block.', '~0.1 ms'],
          ['good', 'File kholo, us offset pe 4 KB likho. Network pe ek chhota call.', 'kuch ms'],
          ['bad', 'Beech mein edit hota hi nahi. Poora 10 GB naya object upload karo.', '10 GB ÷ 100 MB/s ≈ 100 s'] ] },
        { name: '50 servers ek saath same files padhein', r: [
          ['bad', 'Aam taur pe ek disk ek hi machine se judti hai. 50 ko chahiye to 50 copies.', '50 copies'],
          ['good', 'Sab 50 servers ek hi shared folder mount karte hain. Sabko same tree dikhta hai.', '1 copy'],
          ['good', 'Sab HTTP GET se padh lete hain. Koi mount nahi, koi limit nahi.', '1 copy'] ] },
        { name: '1 crore users ko photo dikhao', r: [
          ['bad', 'Disk ek machine ke andar hai. Internet se seedha koi nahi pahunch sakta.', 'server banana padega'],
          ['bad', 'Shared folder office/data center ke andar ke liye hai, internet ke liye nahi.', 'server banana padega'],
          ['good', 'Har object ka ek HTTP URL. Aage CDN laga do, crores users seedhe padh lein.', 'URL + CDN'] ] },
        { name: '5 PB purane videos sasta rakho', r: [
          ['bad', 'Fast disk, GB ka bhaav sabse zyada. Itni badi ek disk hoti bhi nahi.', 'sabse mehenga'],
          ['ok', 'Ho jaayega, lekin shared file system ka GB bhi mehenga hai.', 'mehenga'],
          ['good', 'Isi ke liye bana hai: sasta GB, aur purana data saste "cold" tiers mein (aage dekhenge).', 'sabse sasta'] ] },
      ];
      const COL = { good: 'var(--green)', ok: 'var(--amber)', bad: 'var(--red)' };
      const WORD = { good: 'Badhiya', ok: 'Chal jaayega', bad: 'Galat tool' };
      let cur = 0;
      el.innerHTML = `<div class="osBfoT" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="osBfoG" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin-top:14px"></div>
        <div class="calc-note osBfoN"></div>`;
      const draw = () => {
        const tb = el.querySelector('.osBfoT'); tb.innerHTML = '';
        TASKS.forEach((t, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (i === cur ? ' on' : ''); b.textContent = t.name; b.onclick = () => { cur = i; draw(); }; tb.appendChild(b); });
        const T = TASKS[cur];
        el.querySelector('.osBfoG').innerHTML = KINDS.map((k, i) => {
          const [v, how, cost] = T.r[i];
          return `<div style="border:1px solid var(--line-2);border-top:4px solid ${COL[v]};border-radius:var(--r-sm);padding:10px;background:var(--surface)">
            <div style="font:700 15px var(--f-display);color:var(--ink)">${k} storage</div>
            <pre style="font:11px/1.4 var(--f-mono);color:var(--ink-3);background:var(--surface-2);border-radius:6px;padding:6px;margin:6px 0;white-space:pre-wrap">${VIEW[i]}</pre>
            <div style="font-weight:700;color:${COL[v]}">${WORD[v]}</div>
            <div style="font-size:14px;color:var(--ink-2);margin-top:4px">${how}</div>
            <div style="font:12px var(--f-mono);color:var(--ink-3);margin-top:6px">${cost}</div></div>`;
        }).join('');
        const best = KINDS.filter((k, i) => T.r[i][0] === 'good').join(' aur ');
        el.querySelector('.osBfoN').textContent = `"${T.name}": sahi tool = ${best} storage. Koi ek storage har kaam mein best nahi, isliye xyz.com teeno use karta hai: DB ki disk block pe, videos object pe.`;
      };
      draw();
    }},

    { type: 'h2', text: 'S3, GCS, Azure Blob: kya guarantee milti hai?' },
    { type: 'p', html: `Teeno ka model same hai (bucket/container + key + object). Naam thode alag: Azure mein bucket ko <strong>container</strong> aur object ko <strong>blob</strong> kehte hain. Hum S3 ke numbers dekhenge kyunki wo sabse zyada use hota hai:` },
    { type: 'table', head: ['Cheez', 'S3 mein', 'Matlab kya'], rows: [
      ['Durability (design)', '99.999999999% ("11 nines") per saal', 'AWS ka apna example: 1 crore objects rakho to average mein 10,000 saal mein ek object khone ki ummeed. Ye design target hai, data har region mein kam se kam 3 Availability Zones mein rakha jaata hai. Availability Zone = ek shehar ke paas ek alag data center (alag bijli, alag network), taaki ek building ki aag doosri ko na chhue.'],
      ['Availability (S3 Standard)', '99.99% design', 'Saal mein ~53 minute tak "abhi nahi mil raha" ho sakta hai. Durability (data khoya nahi) aur availability (abhi mil raha hai) alag cheezein hain.'],
      ['Consistency', 'Strong read-after-write (Dec 2020 se)', 'PUT safal hua to agla GET aur LIST naya data hi dikhayega. Usse pehle overwrite/delete ke baad thodi der purana data dikh sakta tha.'],
      ['Ek object kitna bada', 'Max ~50 TB (Dec 2025 se; pehle 5 TB)', 'Ek single PUT mein max 5 GB. Usse bada? Multipart upload zaroori.'],
      ['Multipart parts', '1 se 10,000 parts, har part 5 MiB se 5 GiB (aakhri part chhota ho sakta hai)', '10,000 × 5 GiB ≈ 48.8 TiB, yahi max object size hai.'],
    ], caption: 'Numbers AWS ke official docs se (sources neeche). Doosre clouds ke numbers thode alag hain, idea same.' },
    { type: 'callout', tone: 'term', title: 'Durability vs availability', html: `<strong>Ye kya hai:</strong> do alag sawaal. <strong>Durability</strong> = data kabhi khoyega to nahi? (disk mari, data center jala, phir bhi bytes bache?) <strong>Availability</strong> = abhi is second mein mil jaayega?<br><strong>Kyun chahiye:</strong> design karte waqt dono ke liye alag tayyari hoti hai. Durability ke liye copies alag buildings mein. Availability ke liye backup raaste aur jaldi failover.<br><strong>Iske bina:</strong> log "99.99%" sun ke sochte hain data 99.99% safe hai. Galat: wo availability hai.<br><strong>Example:</strong> object storage durability pe bahut zor deta hai. Video 5 minute na khule, chal jaayega. Video hamesha ke liye kho jaaye, to wapas nahi aata.` },

    { type: 'h2', text: 'Pre-signed URLs: bytes app server se guzrein hi nahi' },
    { type: 'p', html: `Data S3 mein rakhna tay hua. Lekin upload ka raasta abhi bhi galat hai: phone → app server → S3. Har GB do baar network pe chalta hai aur app server ka connection 10 minute busy. Behtar: phone <strong>seedha S3</strong> mein upload kare. Lekin S3 to private hai; kisi ko bhi likhne denge to koi bhi kuch bhi bhar dega. Jawab: <strong>pre-signed URL</strong>.` },
    { type: 'callout', tone: 'term', title: 'Signature (digital sign)', html: `<strong>Ye kya hai:</strong> ek lamba code jo kisi message aur ek <em>secret key</em> ko mila ke maths se banta hai. Message ka ek bhi akshar badlo, to code bilkul badal jaata hai. Aur bina secret ke sahi code koi nahi bana sakta.<br><strong>Kyun chahiye:</strong> S3 ko pakka karna hai ki "ye permission sach mein xyz.com ke server ne di hai, aur kisi ne raaste mein badli nahi".<br><strong>Iske bina:</strong> koi bhi URL mein key ya expiry badal ke doosre ki file overwrite kar deta.` },
    { type: 'callout', tone: 'term', title: 'Pre-signed URL', html: `<strong>Ye kya hai:</strong> ek normal S3 URL jisme kuch extra hisse jude hain: kaunsa bucket, kaunsi key, kaunsa kaam (PUT = upload, GET = download), kab tak valid (expiry), aur in sab pe app server ki secret key se bana <strong>signature</strong>. Socho ek one-time entry pass: "sirf ye ek kamra, sirf aaj 4 baje tak".<br><strong>Kyun chahiye:</strong> phone seedha S3 mein upload kare, lekin sirf wahi ek file, sirf thodi der ke liye.<br><strong>Iske bina:</strong> ya to bytes app server se guzrein (slow, mehenga), ya bucket sabke liye khula (koi bhi kuch bhi bhar de).<br><strong>Bonus:</strong> URL banane ke liye S3 ko call bhi nahi karna padta. App server apne andar maths se bana leta hai. JWT lesson jaisa idea: secret se sign, saamne wala check kare.` },
    { type: 'flow', title: 'Video upload: pre-signed URL ke saath', height: 340,
      nodes: [
        { id: 'c', label: 'Mobile app', sub: 'Riya, 2 GB video', x: 80, y: 170, w: 140, kind: 'client', info: 'Ye kya hai: Riya ka phone, jisme xyz.com ki app hai. Upload yahin se seedha S3 jaata hai. App server se sirf permission (URL) maangta hai.' },
        { id: 'app', label: 'App server', sub: 'sirf URL deta hai', x: 290, y: 60, w: 150, kind: 'server', info: 'Ye kya hai: xyz.com ka apna server (hamara code). Is design mein sirf permission deta hai. Check karta hai: Riya logged in hai? File size aur type allowed hai? Phir DB mein PENDING row banata hai aur ek pre-signed PUT URL sign karta hai. Video ke bytes isse kabhi nahi guzarte.' },
        { id: 'db', label: 'Metadata DB', sub: 'videos table', x: 290, y: 280, w: 150, kind: 'data', info: 'Ye kya hai: xyz.com ka normal database. Har video ki ek row: video_id, owner, s3_key, size, status (PENDING / UPLOADED / READY). Bytes nahi, sirf pata aur haal.' },
        { id: 's3', label: 'S3 bucket', sub: 'xyz-videos', x: 510, y: 170, w: 150, kind: 'data', info: 'Ye kya hai: object storage ka dabba jahan asli bytes rehte hain. Har request pe signature aur expiry check karta hai. Upload hone pe khud ek chhota sandesh (S3 event notification) bhej sakta hai: queue ko, ya AWS ki doosri services ko.' },
        { id: 'q', label: 'Queue', sub: 'upload events', x: 640, y: 60, w: 130, kind: 'queue', info: 'Ye kya hai: messages ki line. S3 ka "ObjectCreated" (file ban gayi) event yahan aata hai. Queues lesson wala pattern: kaam likh do, worker apni speed se karega.' },
        { id: 'w', label: 'Worker', sub: 'status, thumbnail', x: 640, y: 280, w: 130, kind: 'server', info: 'Ye kya hai: background mein chalne wala program. Event padh ke DB mein status UPLOADED karta hai, phir thumbnail / transcoding jaise kaam shuru karta hai.' },
      ],
      edges: [{ a: 'c', b: 'app' }, { a: 'app', b: 'db' }, { a: 'c', b: 's3' }, { a: 's3', b: 'q' }, { a: 'q', b: 'w' }, { a: 'w', b: 'db' }, { a: 'w', b: 's3' }],
      scenarios: [
        { name: 'Upload (happy path)', steps: [
          { title: 'App permission maangti hai', text: 'Video nahi bheji, sirf chhota sa JSON: "mujhe 2 GB ki mp4 upload karni hai".', go: 'c>app', msg: 'POST /videos/upload-url\n{ "size": 2147483648, "type": "video/mp4" }' },
          { title: 'Server check karke DB mein PENDING row', text: 'Login check, size limit check (maan lo max 5 GB), phir row: status = PENDING. Key server khud chunta hai, user nahi, taaki koi doosre ki file overwrite na kar sake.', go: ['app>db', 'res:db>app'], after: { db: { sub: 'v91: PENDING' } }, msg: 'INSERT videos (id=v91, owner=42, key="videos/42/v91.mp4", status="PENDING")' },
          { title: 'URL sign hota hai, S3 ko call kiye bina', text: 'Server apni secret key se URL sign karta hai: method PUT, ye key, 15 minute expiry. Ye kaam kuch microseconds ka hai.', focus: ['app'], msg: 'https://xyz-videos.s3.amazonaws.com/videos/42/v91.mp4\n  ?X-Amz-Expires=900&X-Amz-Signature=8f3c...&...' },
          { title: 'URL app ko mila', text: 'App server ka kaam khatam. Is request ne milliseconds liye, minutes nahi.', go: 'res:app>c' },
          { title: 'Phone seedha S3 mein upload', text: 'Ab 2 GB seedhe S3 mein. S3 signature check karta hai: sahi hai, expire nahi hua, method aur key match. Upload shuru. (Itni badi file ke liye asal mein multipart upload hoga, aage dekhenge.)', go: 'c>s3', after: { s3: { sub: 'v91.mp4 saved' } }, msg: 'PUT <pre-signed URL>\nContent-Type: video/mp4\n<2 GB bytes>' },
          { title: 'S3: 200 OK', text: 'S3 ne file durably save kar li.', go: 'res:s3>c', msg: '200 OK  ETag: "9b2cf5..."' },
          { title: 'S3 khud batata hai: file aa gayi', text: 'Hum client ki baat pe bharosa nahi karte ("maine upload kar diya"). S3 ka apna event queue mein jaata hai, worker DB update karta hai aur processing shuru.', go: ['evt:s3>q', 'evt:q>w', 'w>db'], after: { db: { sub: 'v91: UPLOADED' } }, msg: 'event: ObjectCreated:Put  key=videos/42/v91.mp4  size=2147483648' },
        ]},
        { name: 'Download (dekhna)', intro: 'Private video: sirf owner aur uske friends dekh sakte hain.', steps: [
          { title: 'App video maangti hai', text: 'Server permission check karta hai: kya ye user ye video dekh sakta hai?', go: ['c>app', 'app>db', 'res:db>app'], msg: 'GET /videos/v91' },
          { title: 'Pre-signed GET URL', text: 'Is baar method GET, expiry chhoti (maan lo 10 minute). Public videos ke liye aksar CDN URL dete hain, taaki CDN lesson wala caching kaam aaye.', go: 'res:app>c', msg: '{ "url": "https://xyz-videos.s3.amazonaws.com/videos/42/v91.mp4?X-Amz-Expires=600&X-Amz-Signature=..." }' },
          { title: 'Bytes seedhe S3 (ya CDN) se', text: 'App server pe phir koi bojh nahi.', go: ['c>s3', 'res:s3>c'], after: { s3: { state: 'hit' } } },
        ]},
        { name: 'Failure: URL expire', intro: 'Riya ne URL liya, phir phone jeb mein daal diya. 20 minute baad upload dabaya.', steps: [
          { title: 'URL mila (15 min expiry)', text: 'Sab normal.', go: ['c>app', 'res:app>c'] },
          { title: '20 minute baad upload', text: 'S3 time check karta hai: signature ki expiry nikal chuki. Request reject. Ek baarik baat: S3 expiry request <em>shuru</em> hone ke time check karta hai. Agar upload expiry se pehle shuru ho gaya tha, to beech mein expiry aane pe bhi chalta rehta hai; lekin connection toot ke dobara shuru kiya to fail.', go: 'bad:c>s3', after: { s3: { state: 'warn', sub: '403: expired' } }, msg: '403 Forbidden\n<Code>AccessDenied</Code>  Request has expired' },
          { title: 'Fix: naya URL maango', text: 'Client 403 dekh ke app server se naya URL le leta hai (login aur permission phir se check hote hain, jo achhi baat hai). Expiry chhoti rakhna security hai: URL leak ho bhi jaaye to thodi der hi kaam ka.', go: ['c>app', 'res:app>c', 'c>s3'], after: { s3: { state: '', sub: 'v91.mp4 saved' } } },
        ]},
        { name: 'Failure: upload adhoora', intro: 'Train mein network chala gaya, Riya ne app band kar di.', steps: [
          { title: 'URL mila, row PENDING', text: 'Server ne row bana di thi.', go: ['c>app', 'app>db', 'res:app>c'], after: { db: { sub: 'v91: PENDING' } } },
          { title: 'Upload beech mein toota', text: 'Bytes raaste mein hi kho gaye. S3 mein koi poora object nahi bana, to koi event bhi nahi.', go: 'lost:c>s3' },
          { title: 'DB mein row latki hui', text: 'Row hamesha PENDING rahegi. Agar UI isko "video" maan ke dikhaye to toota hua thumbnail. Isliye UI sirf UPLOADED/READY dikhata hai.', focus: ['db'], set: { db: { state: 'warn', sub: 'v91: PENDING (24h)' } } },
          { title: 'Safai ka kaam', text: 'Ek cleanup job 24 ghante se purani PENDING rows hata deta hai. Multipart uploads ke adhoore parts ke liye S3 ka lifecycle rule (AbortIncompleteMultipartUpload) lagate hain, warna wo parts chupchaap storage bill mein judte rehte hain.', go: 'w>db', after: { db: { state: '', sub: 'v91 deleted' } } },
        ]},
      ],
    },
    { type: 'callout', tone: 'warn', title: 'Pre-signed URL ek bearer token hai', html: `Jiske haath URL laga, wo use kar sakta hai, bina login ke. Isliye: expiry chhoti rakho (minutes), key server chune, aur upload ke liye limits lagao. S3 ka <strong>pre-signed POST</strong> ek policy ke saath aata hai jisme <code>content-length-range</code> jaisi shartein likh sakte ho (jaise "1 byte se 5 GB tak"). Upload ke baad bhi file ko trusted mat maano: worker type check, virus scan aur size check kare. S3 docs ke mutabik lambi chalne wali (IAM user ki) keys se bana URL max 7 din valid ho sakta hai, aur kuch ghante wali temporary keys se bana URL un keys ke expire hote hi mar jaata hai.` },

    { type: 'h3', text: 'Signature lab: S3 URL kaise check karta hai' },
    { type: 'p', html: `App server ne Riya ko ek URL diya: <code>PUT</code>, key <code>videos/42/v91.mp4</code>, expiry 15 minute (900 seconds). Ab tum "chalaak user" bano. URL mein kuch badlo, ya der se use karo, aur step by step dekho S3 kya check karta hai. (Signature yahan ek chhote toy hash se bana hai; asli S3 HMAC-SHA256 use karta hai, idea same.)` },
    { type: 'custom', render(el) {
      const SECRET = 'xyz-server-secret';
      const sign = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); };
      const ORIG = { m: 'PUT', k: 'videos/42/v91.mp4', e: 900 };
      const SIG = sign([SECRET, ORIG.m, ORIG.k, ORIG.e].join('|'));
      el.innerHTML = `<div class="row2">
          <div><label for="osSgM">Method</label><select id="osSgM"><option>PUT</option><option>GET</option><option>DELETE</option></select></div>
          <div><label for="osSgK">Key</label><select id="osSgK"><option>videos/42/v91.mp4</option><option>videos/7/other.mp4</option></select></div>
          <div><label for="osSgE">Expires (URL mein likha)</label><select id="osSgE"><option value="900">900 (asli)</option><option value="604800">604800 (7 din, chhed-chhaad)</option></select></div>
          <div><label for="osSgT">URL kitni der baad use kiya: <strong class="osSgTV"></strong></label><input id="osSgT" type="range" min="0" max="30" step="1" value="2"></div>
        </div>
        <pre class="ascii osSgU" style="margin-top:12px;white-space:pre-wrap;word-break:break-all"></pre>
        <ol class="osSgC" style="margin:8px 0 0;padding-left:22px;line-height:1.7"></ol>
        <div class="osSgR" style="margin-top:8px;font:700 16px var(--f-display)"></div>`;
      const q = s => el.querySelector(s);
      const draw = () => {
        const m = q('#osSgM').value, k = q('#osSgK').value, e = Number(q('#osSgE').value), t = Number(q('#osSgT').value);
        q('.osSgTV').textContent = t + ' min';
        q('.osSgU').textContent = `${m} https://xyz-videos.s3.amazonaws.com/${k}\n  ?X-Amz-Expires=${e}&X-Amz-Signature=${SIG}`;
        const recomputed = sign([SECRET, m, k, e].join('|'));
        const sigOk = recomputed === SIG, timeOk = t * 60 <= e;
        const rows = [
          [true, `S3 URL se method, key aur expiry padhta hai: ${m}, ${k}, ${e}s.`],
          [sigOk, `S3 apne paas rakhi secret copy se signature dobara banata hai: <code>${recomputed}</code>. URL wala: <code>${SIG}</code>. ${sigOk ? 'Match.' : 'Match nahi! Kisi ne URL badla hai.'}`],
        ];
        if (sigOk) rows.push([timeOk, `Time check: ${t} min = ${t * 60}s, limit ${e}s. ${timeOk ? 'Abhi valid.' : 'Expire ho chuka.'}`]);
        q('.osSgC').innerHTML = rows.map(([ok, txt]) => `<li style="color:${ok ? 'var(--ink-2)' : 'var(--red)'}">${ok ? '✓' : '✗'} ${txt}</li>`).join('');
        const r = q('.osSgR');
        if (!sigOk) { r.textContent = '403 Forbidden: SignatureDoesNotMatch'; r.style.color = 'var(--red)'; }
        else if (!timeOk) { r.textContent = '403 Forbidden: Request has expired'; r.style.color = 'var(--red)'; }
        else { r.textContent = '200 OK: upload allowed'; r.style.color = 'var(--green)'; }
      };
      el.querySelectorAll('select,input').forEach(x => x.addEventListener('input', draw));
      el.querySelectorAll('select').forEach(x => x.addEventListener('change', draw));
      draw();
    }},
    { type: 'callout', tone: 'tip', title: 'Lab se seekh', html: `Method, key ya expiry, kuch bhi badla to signature mel nahi khata, kyunki naya sahi signature banane ke liye secret chahiye jo sirf server ke paas hai. Kuch nahi badla lekin 15 minute ke baad aaye, to "expired". Isliye pre-signed URL safe hai: <strong>jo likha hai wahi, jab tak likha hai tab tak</strong>.` },

    { type: 'h2', text: 'Multipart aur resumable uploads' },
    { type: 'p', html: `2 GB ek hi PUT (ek hi lambi request) mein bheja aur 1.8 GB pe network toota? Poora 1.8 GB bekaar, zero se shuru. Mobile pe ye roz ki baat hai: lift, train, tunnel. Hal: file ko <strong>tukdon</strong> mein bhejo. Jo tukde pahunch gaye wo safe; toota sirf wahi jo raaste mein tha.` },
    { type: 'callout', tone: 'term', title: 'Multipart upload', html: `<strong>Ye kya hai:</strong> S3 ka tareeka jisme ek badi file ko <strong>parts</strong> (jaise 16 MB ke) mein alag alag upload karte hain, aur aakhir mein S3 unhe jod ke ek object bana deta hai.<br><strong>Kyun chahiye:</strong> (1) network toote to sirf adhoora part dobara, (2) kai parts ek saath (parallel) jaayein to upload tez, (3) 5 GB se badi file ek PUT mein jaa hi nahi sakti.<br><strong>Iske bina:</strong> har toot pe zero se shuru. Kamzor network pe badi video kabhi upload hi na ho.` },
    { type: 'callout', tone: 'term', title: 'UploadId aur ETag', html: `<strong>Ye kya hai:</strong> <strong>UploadId</strong> = is ek multipart upload ka ticket number. Saare parts isi number ke saath bheje jaate hain. <strong>ETag</strong> = har part ke jawab mein S3 ek chhota fingerprint deta hai: "haan, part 7 mujhe mil gaya, ye raha uska fingerprint".<br><strong>Kyun chahiye:</strong> aakhir mein S3 ko batana hai "part 1 ye tha, part 2 ye tha...". ETags se S3 pakka karta hai ki jode ja rahe parts wahi hain jo pahunche the.<br><strong>Iske bina:</strong> pata hi nahi chalega kaunse parts pahunche, aur galat part jud sakta hai.` },
    { type: 'steps', items: [
      { t: 'Initiate (shuru)', d: 'App server S3 se multipart upload shuru karwata hai aur ek <code>UploadId</code> milta hai.' },
      { t: 'Har part ka URL', d: 'Har part number (1, 2, 3 ...) ke liye alag pre-signed URL. Client in parts ko <strong>parallel</strong> aur kisi bhi order mein bhej sakta hai. Har part ke jawab mein ek <code>ETag</code> (us part ka fingerprint) aata hai, client use yaad rakhta hai.' },
      { t: 'Network toota?', d: 'Jo parts pahunch gaye (ETag mil gaya) wo S3 mein pade hain. Sirf adhoore parts dobara bhejo. S3 ka <code>ListParts</code> bata deta hai kaunse parts pahunche.' },
      { t: 'Complete', d: 'Saare part numbers + ETags bhejo. S3 unhe part number ke order mein jod ke ek object bana deta hai.' },
      { t: 'Abort / cleanup', d: 'Upload chhod diya? Abort karo, ya lifecycle rule se X din baad apne aap. Tab tak parts ka storage ka paisa lagta hai.' },
    ]},
    { type: 'callout', tone: 'term', title: 'Resumable upload', html: `<strong>Ye kya hai:</strong> Google Cloud Storage (GCS) ka tareeka. Shuru mein ek <strong>session URI</strong> (is upload ka apna URL) milta hai. File line se, tukda tukda bhejte ho. Network toote to server se poochho: "kitne bytes mile?" Server bolta hai "pehle 96 MB", aur tum wahin se aage bhejte ho.<br><strong>Kyun chahiye:</strong> wahi faayda (toot pe zero se nahi), lekin client ka kaam simple: parts ka hisaab nahi rakhna, bas "kahan tak pahuncha" poochhna.<br><strong>Iske bina:</strong> har toot pe poori file dobara.<br><strong>Detail:</strong> GCS docs ke mutabik session ek hafte tak valid rehta hai, aur har tukda (aakhri ko chhod ke) 256 KiB ka multiple hona chahiye.` },
    { type: 'table', head: ['', 'Single PUT', 'Multipart (S3)', 'Resumable (GCS)'], rows: [
      ['Kaise bhejte', 'Poori file ek request mein', 'Parts alag alag, parallel bhi, phir "Complete"', 'Ek session, tukde line se'],
      ['Toot pe kya bekaar', 'Us attempt ka sab kuch', 'Sirf raaste wale parts', 'Sirf aakhri adhoora tukda'],
      ['Speed', 'Ek connection', 'Kai connections ek saath: tez', 'Ek connection (simple)'],
      ['Kab', 'Chhoti files (kuch MB)', 'Badi files, achha network, speed chahiye', 'Mobile, kamzor network, simple client'],
    ]},
    { type: 'p', html: `Khud chala ke dekho. Tareeka chuno, upload shuru karo, beech mein network kaato, phir resume karo. Teeno tareekon ko ek hi file pe try karo aur "bekaar gaya data" compare karo. (Maan lo ek connection 1 MB per tick chalata hai.)` },
    { type: 'custom', render(el) {
      const MODES = { single: 'Single PUT', multi: 'Multipart (S3)', resum: 'Resumable (GCS)' };
      el.innerHTML = `<div class="osUpM" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="row2" style="margin-top:10px">
          <div><label for="osFile">File size</label><select id="osFile"><option value="64">64 MB</option><option value="200" selected>200 MB</option><option value="500">500 MB</option></select></div>
          <div><label for="osChunk">Part / tukda size: <strong class="osChunkV">16 MB</strong></label><input id="osChunk" type="range" min="5" max="50" step="1" value="16"></div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">
          <button type="button" class="btn small primary osStart">Upload shuru / Resume</button>
          <button type="button" class="btn small osKill">Network kaato</button>
          <button type="button" class="btn small ghost osReset">Reset</button>
        </div>
        <div class="osGrid" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:14px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:8px;font-size:13px;color:var(--ink-3)">
          <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--surface-2);border:1px solid var(--line-2)"></span> baaki</span>
          <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--accent)"></span> ja raha hai</span>
          <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--green)"></span> pahunch gaya (safe)</span>
          <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--red)"></span> toota, dobara jaayega</span>
        </div>
        <div class="stats">
          <div class="stat"><span>Server pe safe</span><strong class="osDone"></strong></div>
          <div class="stat"><span>Bekaar gaya data</span><strong class="osWaste"></strong></div>
          <div class="stat"><span>Time (ticks)</span><strong class="osTicks"></strong></div>
        </div>
        <div class="calc-note osNote"></div>`;
      const RATE = 1; // har connection ko 1 MB per tick
      const fileSel = el.querySelector('#osFile'), chunkIn = el.querySelector('#osChunk');
      let mode = 'multi', st, timer = null;
      const par = () => mode === 'multi' ? 3 : 1;
      const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
      const init = () => {
        const F = Number(fileSel.value), C = Number(chunkIn.value);
        el.querySelector('.osChunkV').textContent = C + ' MB';
        const parts = [];
        if (mode === 'single') parts.push({ size: F, sent: 0, s: 'wait' });
        else for (let left = F; left > 0; left -= C) parts.push({ size: Math.min(C, left), sent: 0, s: 'wait' });
        st = { F, C, parts, running: false, waste: 0, ticks: 0, kills: 0 };
        stop(); draw();
      };
      const tick = () => {
        if (!st.running) return;
        st.ticks++;
        let up = st.parts.filter(p => p.s === 'up').length;
        for (const p of st.parts) { if (up >= par()) break; if (p.s === 'wait' || p.s === 'fail') { p.s = 'up'; p.sent = 0; up++; } }
        for (const p of st.parts) if (p.s === 'up') { p.sent += Math.min(RATE, p.size - p.sent); if (p.sent >= p.size) p.s = 'done'; }
        if (st.parts.every(p => p.s === 'done')) { st.running = false; stop(); }
        draw();
      };
      // Toot pe: jo part/tukda raaste mein tha, uske bheje bytes bekaar. Single PUT mein wahi poori file hai.
      const kill = () => {
        if (!st.running) return;
        st.running = false; stop(); st.kills++;
        for (const p of st.parts) if (p.s === 'up') { st.waste += p.sent; p.sent = 0; p.s = 'fail'; }
        draw();
      };
      const start = () => { if (st.running || st.parts.every(p => p.s === 'done')) return; st.running = true; if (!timer) timer = setInterval(tick, 90); };
      const draw = () => {
        const mb = el.querySelector('.osUpM'); mb.innerHTML = '';
        Object.keys(MODES).forEach(k => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (k === mode ? ' on' : ''); b.textContent = MODES[k]; b.onclick = () => { mode = k; init(); }; mb.appendChild(b); });
        const n = st.parts.length;
        const safe = st.parts.filter(p => p.s === 'done').reduce((a, p) => a + p.size, 0);
        el.querySelector('.osGrid').innerHTML = st.parts.map((p, i) => {
          const bg = p.s === 'done' ? 'var(--green)' : p.s === 'fail' ? 'var(--red)' : p.s === 'up' ? 'var(--accent)' : 'var(--surface-2)';
          const pct = p.s === 'up' ? Math.round(p.sent / p.size * 100) : 100;
          const wide = mode === 'single';
          return `<div title="${i + 1}: ${p.size} MB" style="width:${wide ? '100%' : '26px'};height:26px;border-radius:4px;border:1px solid var(--line-2);background:var(--surface-2);position:relative;overflow:hidden">
            <div style="position:absolute;left:0;bottom:0;${wide ? `height:100%;width:${p.s === 'wait' ? 0 : pct}%` : `width:100%;height:${p.s === 'wait' ? 0 : pct}%`};background:${bg}"></div>
            <span style="position:relative;font:10px var(--f-mono);color:var(--ink-2);display:block;text-align:center;line-height:26px">${wide ? p.size + ' MB, ek request' : i + 1}</span></div>`;
        }).join('');
        el.querySelector('.osDone').textContent = `${safe} / ${st.F} MB`;
        el.querySelector('.osWaste').textContent = st.waste + ' MB';
        el.querySelector('.osTicks').textContent = st.ticks;
        const maxLoss = mode === 'single' ? 'poori file tak' : mode === 'multi' ? `${par()} × ${st.C} = ${par() * st.C} MB` : `${st.C} MB (ek tukda)`;
        let note = mode === 'single' ? `Single PUT: ${st.F} MB ek hi request mein. ` : mode === 'multi' ? `${n} parts, ek saath 3 parts jaate hain. ` : `${n} tukde, ek ke baad ek, ek hi session mein. `;
        if (safe === st.F) note += mode === 'multi' ? `Poora! Ab "Complete" call saare ETags ke saath, S3 ${n} parts jod deta hai.` : 'Upload poora!';
        else if (st.kills && !st.running) note += `Network toota. Har toot pe zyada se zyada ${maxLoss} bekaar. ` + (mode === 'single' ? 'Resume ka matlab yahan: zero se dobara.' : mode === 'resum' ? 'Resume pe client poochhta hai "kitne bytes mile?" aur wahin se aage.' : 'Sirf laal parts dobara jaayenge.');
        else if (st.running) note += 'Chal raha hai... beech mein "Network kaato" dabao.';
        else note += 'Upload shuru karo.';
        el.querySelector('.osNote').textContent = note;
      };
      el.querySelector('.osStart').onclick = start;
      el.querySelector('.osKill').onclick = kill;
      el.querySelector('.osReset').onclick = init;
      fileSel.addEventListener('change', init); chunkIn.addEventListener('input', init);
      init();
    }},
    { type: 'callout', tone: 'tip', title: 'Part size kaise chunein?', html: `Chhote parts: toot pe kam nuksaan, lekin zyada requests (har part ek HTTP call). Bade parts: kam requests, lekin toot pe zyada dobara. Mobile pe aksar 5-16 MB, data center ke andar 64-128 MB. S3 ki docs ~100 MB se badi files ke liye multipart ki salah deti hain. Aur 10,000 parts ki limit yaad rakho: 1 TB ki file 5 MB parts mein nahi jaa sakti (2 lakh parts ho jaate), use ~100 MB+ parts chahiye.` },

    { type: 'h2', text: 'Chunking + content hashing: same data dobara mat bhejo' },
    { type: 'p', html: `Ab ek doosri problem. xyz.com pe "Drive" feature aaya: users apni files sync karte hain. Riya ne 200 MB ki presentation mein ek slide badli. Poori 200 MB dobara upload? Aur ek viral video 5,000 logon ne download karke wapas upload kar di: 5,000 copies store?` },
    { type: 'p', html: `Idea: file ko chunks mein todo, aur har chunk ka <strong>hash</strong> nikaalo. Hash ek chhota fingerprint hai: same bytes ka hamesha same hash, aur bytes mein zara sa badlav to bilkul alag hash. Upload se pehle client server se poochhta hai: "in hashes mein se tumhare paas kaunse nahi hain?" Sirf wahi chunks jaate hain.` },
    { type: 'callout', tone: 'term', title: 'Hash (fingerprint)', html: `<strong>Ye kya hai:</strong> ek function (jaise SHA-256) jo kisi bhi size ke data se ek chhota, fixed size ka code banata hai (SHA-256 ka 32 bytes). Same bytes = hamesha same hash. Ek byte bhi badla = bilkul alag hash. Bilkul ungli ke nishaan jaisa.<br><strong>Kyun chahiye:</strong> 4 MB ka chunk bhejne ki jagah sirf uska 32 byte ka hash bhej ke poochh sakte hain "ye tumhare paas hai?"<br><strong>Iske bina:</strong> pata karne ke liye ki server ke paas data hai ya nahi, poora data hi bhejna padta.` },
    { type: 'callout', tone: 'term', title: 'Content-addressing aur dedupe', html: `<strong>Ye kya hai:</strong> agar chunk ka naam hi uska hash ho (<code>chunks/9f86d0...</code>), to ise <strong>content-addressed storage</strong> kehte hain: naam content se banta hai. Do users ke paas same chunk = same naam = ek hi copy rakho. Isko <strong>dedupe</strong> (deduplication, yaani dohraav hatana) kehte hain.<br><strong>Kyun chahiye:</strong> viral video ki 5,000 copies ki jagah ek copy. Ek slide badli to sirf wo chunk upload.<br><strong>Iske bina:</strong> storage aur upload dono kai guna.<br><strong>Bonus:</strong> download ke baad hash dobara nikaal ke check kar sakte ho ki data raaste mein kharab to nahi hua (<strong>integrity check</strong>).` },
    { type: 'p', html: `Real example: Dropbox ke engineering blog (2014, purani post) ke mutabik har file <strong>4 MB ke blocks</strong> mein tooti jaati thi, har block ka SHA-256 hash, aur client pehle hashes ki list bhejta tha. Server "ye blocks chahiye" bolta, aur sirf wahi upload hote. Neeche toy version chalao (chunk lagbhag 8 characters ka, aur ek chhota toy hash; asli systems SHA-256 jaisa strong hash use karte hain). Pehle "Fixed-size" mode mein try karo, phir "Content-defined" mein:` },
    { type: 'custom', render(el) {
      const V1 = 'xyz.com pe Riya ka travel vlog: Goa trip ke paanch din, din 1 se 5';
      const CH = 8;
      const hash = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return ('0000000' + h.toString(16)).slice(-8).slice(0, 6); };
      const fixedSplit = s => { const out = []; for (let i = 0; i < s.length; i += CH) out.push(s.slice(i, i + CH)); return out; };
      // Content-defined: boundary wahan jahan pichhle 3 characters ka chhota hash 5 se divide ho (min 4, max 14 characters)
      const cdcSplit = s => { const o = []; let st = 0; for (let i = 0; i < s.length; i++) { const len = i - st + 1; let h = 0; for (const c of s.slice(Math.max(0, i - 2), i + 1)) h = (h * 31 + c.charCodeAt(0)) % 1000; if ((len >= 4 && h % 5 === 0) || len >= 14) { o.push(s.slice(st, i + 1)); st = i + 1; } } if (st < s.length) o.push(s.slice(st)); return o; };
      let cdc = false;
      const split = s => cdc ? cdcSplit(s) : fixedSplit(s);
      let stored = new Set(split(V1).map(hash));
      el.innerHTML = `<div style="font-size:14px;color:var(--ink-3)">Server pe pehle se (v1):</div>
        <div style="font:13px var(--f-mono);background:var(--surface-2);border-radius:var(--r-sm);padding:8px 10px;margin:4px 0 12px;word-break:break-all">${V1}</div>
        <div class="osCdcM" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px"><button type="button" class="chip on" data-m="0">Fixed-size (har 8 char)</button><button type="button" class="chip" data-m="1">Content-defined</button></div>
        <label for="osV2">Naya version (v2), edit karo:</label>
        <input id="osV2" type="text" style="width:100%;font-family:var(--f-mono)">
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">
          <button type="button" class="btn small" data-p="mid">Beech mein ek word badlo</button>
          <button type="button" class="btn small" data-p="front">Shuru mein ek letter jodo</button>
          <button type="button" class="btn small ghost" data-p="same">v1 jaisa hi</button>
        </div>
        <div class="osChunks" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:14px"></div>
        <div class="stats">
          <div class="stat"><span>Kul chunks</span><strong class="osT"></strong></div>
          <div class="stat"><span>Naye (upload)</span><strong class="osN"></strong></div>
          <div class="stat"><span>Skip (server pe hai)</span><strong class="osS"></strong></div>
        </div>
        <div class="calc-note osDN"></div>`;
      const inp = el.querySelector('#osV2');
      const P = { same: V1, mid: V1.replace('trip', 'tour'), front: 'X' + V1 };
      const upd = () => {
        const parts = split(inp.value);
        let nw = 0;
        el.querySelector('.osChunks').innerHTML = parts.map(p => {
          const h = hash(p), old = stored.has(h);
          if (!old) nw++;
          return `<div style="border:1px solid ${old ? 'var(--line-2)' : 'var(--accent)'};background:${old ? 'var(--surface-2)' : 'var(--accent-soft)'};border-radius:var(--r-sm);padding:4px 6px;font:12px var(--f-mono)">
            <div style="white-space:pre">"${p.replace(/</g, '&lt;')}"</div><div style="color:${old ? 'var(--ink-3)' : 'var(--accent-ink)'}">${h} ${old ? 'skip' : 'UPLOAD'}</div></div>`;
        }).join('');
        el.querySelector('.osT').textContent = parts.length;
        el.querySelector('.osN').textContent = nw;
        el.querySelector('.osS').textContent = parts.length - nw;
        el.querySelector('.osDN').textContent = nw === 0 ? 'Kuch naya nahi: ek bhi byte upload nahi hoga. Yahi dedupe hai.'
          : nw <= 2 ? `Sirf ${nw} chunk naye. Baaki server pe pehle se hain, unka sirf hash bheja gaya.`
          : `${nw} chunks naye dikh rahe hain. Agar tumne shuru mein kuch joda hai, to har chunk ki boundary khisak gayi aur saare chunks "naye" lagne lage. Ye fixed-size chunking ki kamzori hai. Ab "Content-defined" dabao.`;
      };
      el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { cdc = b.dataset.m === '1'; el.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === b)); stored = new Set(split(V1).map(hash)); upd(); });
      el.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { inp.value = P[b.dataset.p]; upd(); });
      inp.addEventListener('input', upd);
      inp.value = P.mid; upd();
    }},
    { type: 'callout', tone: 'why', title: 'Interview depth: content-defined chunking', html: `Widget mein "Shuru mein ek letter jodo" dono modes mein dabao. Fixed-size chunks mein ek byte jodne se uske baad ki har boundary khisak jaati hai, to lagbhag har chunk naya lagta hai. Iska ilaaj <strong>content-defined chunking</strong>: boundary ek fixed jagah pe nahi, balki data ke content se tay hoti hai (ek <em>rolling hash</em> chalate hain, aur jahan uski value kisi pattern se match kare wahan chunk kaat do). Ab ek byte jodne se sirf aas paas ke ek do chunks badalte hain (widget mein 9 mein se sirf 1 naya). Backup tools aur dedupe systems aksar yahi karte hain.` },
    { type: 'callout', tone: 'warn', html: `Alag alag users ke beech dedupe ka ek security pehlu bhi hai: agar server sirf hash dekh ke bol de "ye file to hai", to koi bas hash bata ke kisi aur ki file "claim" kar sakta hai, ya pata laga sakta hai ki kisi ke paas ek khaas file hai ya nahi. Isliye cross-user dedupe mein server ko proof chahiye ki client ke paas sach mein bytes hain, ya dedupe sirf ek user ke andar karte hain.` },

    { type: 'h2', text: 'Andar se: GFS aur HDFS' },
    { type: 'p', html: `S3 jaisi service ek computer pe nahi chal sakti: petabytes data hazaaron disks pe. Ye kaise organise hota hai? Iska classic jawab Google ka <strong>GFS (Google File System)</strong> paper hai (2003), aur uska open-source bhai <strong>HDFS</strong> (Hadoop Distributed File System). Idea do hisson mein baantna hai:` },
    { type: 'callout', tone: 'term', title: 'Distributed file system', html: `<strong>Ye kya hai:</strong> ek file system jo dikhta ek jaisa hai (files, naam), lekin uske peeche sainkdon ya hazaaron machines ki disks judi hain. Ek file ke tukde alag alag machines pe rehte hain.<br><strong>Kyun chahiye:</strong> ek machine ki disk mein petabytes nahi aate, aur ek machine mare to data nahi khona chahiye.<br><strong>Iske bina:</strong> data ek machine ki disk tak simit, aur wo machine gayi to data gaya.<br><strong>Example:</strong> GFS (Google), HDFS (Hadoop). Aaj ke object stores bhi andar isi tarah ke ideas pe bane hain.` },
    { type: 'list', items: [
      `<strong>Master</strong> (HDFS mein NameNode): ek machine jo sirf <em>metadata</em> (data ke baare mein data) rakhti hai, jaise library ka catalogue. Kaunsi file, kaunse chunks, har chunk kis machine pe. Ye sab RAM mein, isliye fast.`,
      `<strong>Chunkservers</strong> (HDFS mein DataNodes): wo machines jinki disks pe asli bytes rehte hain, library ki almaariyon jaisi. GFS paper mein file <strong>64 MB ke chunks</strong> mein tooti, har chunk default <strong>3 machines</strong> pe. HDFS docs mein typical block size 128 MB hai, replication bhi 3.`,
      `<strong>Bytes kabhi master se nahi guzarte.</strong> Client master se sirf poochhta hai "chunk kahan hai?", phir seedha chunkserver se padhta hai. Bilkul pre-signed URL wala idea: control ek jagah, data doosre raaste.`,
    ]},
    { type: 'flow', title: 'GFS / HDFS: ek chunk ki zindagi', height: 330,
      nodes: [
        { id: 'cl', label: 'Client', sub: 'analytics job', x: 120, y: 70, w: 140, kind: 'client', info: 'Ye kya hai: wo program jise file padhni/likhni hai (yahan ek analytics job), GFS/HDFS ki client library ke saath. Master se location poochhta hai, aur us jawab ko kuch der cache bhi karta hai taaki master pe bojh kam rahe.' },
        { id: 'm', label: 'Master', sub: 'NameNode: metadata', x: 460, y: 70, w: 170, kind: 'server', info: 'Ye kya hai: cluster ka catalogue-keeper. File → chunks, aur chunk → kin machines pe. Sab RAM mein. Chunkservers isse heartbeats bhejte hain. Data path mein nahi hai, isliye ek master hazaaron clients sambhal leta hai.' },
        { id: 'cs1', label: 'Chunkserver 1', sub: 'chunk C', x: 120, y: 270, w: 140, kind: 'data', info: 'Ye kya hai: data rakhne wali ek machine. Chunks ko local disk pe normal files ki tarah rakhta hai. Har kuch seconds master ko heartbeat: "main zinda hoon, mere paas ye chunks hain".' },
        { id: 'cs2', label: 'Chunkserver 2', sub: 'chunk C', x: 290, y: 270, w: 140, kind: 'data', info: 'Ye kya hai: ek aur data machine, jisme chunk C ki doosri copy hai, alag machine (aur GFS mein aksar alag rack) pe. Agar Chunkserver 1 mar jaaye to client yahan se padh leta hai, aur master kisi naye server pe teesri copy bana deta hai taaki phir se 3 copies ho jaayein.' },
        { id: 'cs3', label: 'Chunkserver 3', sub: 'chunk C', x: 460, y: 270, w: 140, kind: 'data', info: 'Ye kya hai: teesri data machine, chunk C ki teesri copy ke saath. 3 copies ka matlab: koi bhi 2 machines ek saath gir jaayein tab bhi data safe. Keemat: har 1 GB data ke liye 3 GB disk.' },
        { id: 'cs4', label: 'Chunkserver 4', sub: 'khaali jagah', x: 630, y: 270, w: 140, kind: 'data', info: 'Ye kya hai: ek khaali jagah wali data machine. Abhi chunk C nahi hai. Kisi copy ke marne pe master isko nayi copy ke liye chun sakta hai.' },
      ],
      edges: [{ a: 'cl', b: 'm' }, { a: 'cl', b: 'cs1' }, { a: 'cl', b: 'cs2' }, { a: 'm', b: 'cs1' }, { a: 'm', b: 'cs2' }, { a: 'm', b: 'cs3' }, { a: 'm', b: 'cs4' }, { a: 'cs1', b: 'cs2' }, { a: 'cs2', b: 'cs3' }, { a: 'cs3', b: 'cs4' }],
      scenarios: [
        { name: 'Read', steps: [
          { title: 'Client: chunk kahan hai?', text: 'File ka naam aur offset bhejta hai. Client byte offset ko chunk number mein badal leta hai (offset ÷ 64 MB).', go: 'cl>m', msg: 'where is /logs/day1, chunk #7 ?' },
          { title: 'Master: ye teen machines', text: 'Master sirf jawab deta hai. Bytes nahi.', go: 'res:m>cl', msg: 'chunk #7 = handle 0x2af1, replicas: cs1, cs2, cs3' },
          { title: 'Client seedha paas wale chunkserver se', text: 'Teen mein se jo sabse paas (network mein) hai, usse padh liya. Master ko pata bhi nahi chala.', go: ['cl>cs2', 'res:cs2>cl'], set: { m: { state: 'dim' } }, after: { cs2: { state: 'hit' } } },
        ]},
        { name: 'Write (pipeline)', steps: [
          { title: 'Master se poochha', text: 'Master teen replicas batata hai aur unme se ek ko us waqt ke liye <strong>primary</strong> banata hai, jo writes ka order tay karega.', go: ['cl>m', 'res:m>cl'] },
          { title: 'Data ek chain mein', text: 'Client data sirf pehli machine ko bhejta hai. Wo aage, wo aage. Har machine ka network poora istemaal hota hai, client ka upload teen guna nahi hota. (GFS paper mein data flow aur control flow alag hain; ye data flow hai.)', go: 'cl>cs1>cs2>cs3', after: { cs1: { sub: 'chunk C v2' }, cs2: { sub: 'chunk C v2' }, cs3: { sub: 'chunk C v2' } } },
          { title: 'Teeno ne likha, client ko OK', text: 'Primary teeno se confirm leke client ko success bolta hai. Kisi ek ne fail kiya to client ko error milta hai aur wo retry karta hai.', go: 'res:cs1>cl' },
        ]},
        { name: 'Failure: chunkserver mara', steps: [
          { title: 'Chunkserver 1 ki disk mari', text: 'Ab chunk C ki sirf do copies bachi.', set: { cs1: { state: 'down', sub: 'DOWN' } }, focus: ['cs1'] },
          { title: 'Heartbeat nahi aayi', text: 'Master ko kuch der se cs1 ki heartbeat nahi mili. Wo use mara hua maan leta hai aur dekhta hai: kaunse chunks ab 3 se kam copies pe hain?', go: 'lost:cs1>m', after: { m: { state: 'warn', sub: 'chunk C: 2 copies!' } } },
          { title: 'Re-replication', text: 'Master cs3 ko bolta hai: chunk C ki copy cs4 ko do. Data machines ke beech seedha chalta hai.', go: ['m>cs3', 'cs3>cs4'], after: { cs4: { state: 'ok', sub: 'chunk C (nayi)' }, m: { state: '', sub: 'chunk C: 3 copies' } } },
          { title: 'Wapas 3 copies', text: 'User ko kuch pata nahi chala. Bade clusters mein roz kai disks marti hain, isliye ye "normal" hai, emergency nahi. GFS paper ka ek mool idea: failures normal maano, exception nahi.', focus: ['cs4'] },
        ]},
        { name: 'Failure: master mara', steps: [
          { title: 'Master down', text: 'Bytes sab safe hain, lekin kisi ko pata nahi kaunsa chunk kahan hai. Naye reads/writes ruk gaye.', set: { m: { state: 'down', sub: 'DOWN' } }, go: 'bad:cl>m' },
          { title: 'Isliye master ka bhi backup', text: 'GFS mein master apna operation log kai machines pe replicate karta tha aur read-only "shadow masters" the. HDFS mein high availability setup mein ek standby NameNode taiyaar rehta hai jo failover pe active ban jaata hai. Ek master = simple design, lekin SPOF ka khayal alag se rakhna padta hai.', set: { m: { state: 'ok', sub: 'standby ab active' } }, go: ['cl>m', 'res:m>cl'] },
        ]},
      ],
    },
    { type: 'image', src: 'assets/img/object-storage/server-racks.jpg', alt: 'Data center mein server racks ki lambi line, har rack mein upar se neeche tak machines', caption: 'Asli data center: har rack mein dazanon machines, har machine mein kai disks. GFS/HDFS ya S3 jaisa system aisi hazaaron machines ko ek bade storage jaisa dikhata hai. Roz kuch disks marti hain, isliye copies ya erasure coding zaroori.', credit: { text: 'Victor Grigas, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Wikimedia_Foundation_Servers-8055_13.jpg', license: 'CC BY-SA 3.0' } },
    { type: 'callout', tone: 'why', title: 'Chunks itne bade (64-128 MB) kyun?', html: `Master har chunk ka hisaab RAM mein rakhta hai. Chunks bade = ginti kam = master ki RAM kam aur client ko master se kam baar poochhna padta hai. Ye systems badi files (logs, crawls, analytics data) ko shuru se aakhir tak padhne ke liye bane the. Keemat: lakhon chhoti files (jaise thumbnails) inke liye buri hain, har ek ek poora metadata entry kha jaati hai. Isliye photos/videos ke liye aaj object storage use karte hain, aur S3 jaisi services andar apna alag design rakhti hain (AWS uski poori details publish nahi karta; upar wala master + storage nodes ka idea general approach hai).` },

    { type: 'h2', text: 'Replication vs erasure coding' },
    { type: 'p', html: `3 copies rakhna simple hai, lekin har 1 TB ke liye 3 TB disk. Petabytes pe ye bahut paisa hai. Kya kam extra disk mein utni hi safety mil sakti hai? Haan: <strong>erasure coding</strong>.` },
    { type: 'callout', tone: 'term', title: 'Erasure coding (EC)', html: `<strong>Ye kya hai:</strong> data ko <strong>k</strong> tukdon mein todo, aur maths se <strong>m</strong> extra "parity" (jaanch wale) tukde banao. Ye k + m tukde alag machines pe rakho. Jaadu: <strong>koi bhi k tukde</strong> bache hon, poora data wapas ban jaata hai. Sabse common maths ka naam <strong>Reed-Solomon</strong> hai, isliye likhte hain RS(k, m).<br><strong>Kyun chahiye:</strong> 3 copies jitni (ya zyada) safety, lekin bahut kam extra disk.<br><strong>Iske bina:</strong> petabytes pe 200% extra disk ka bill.<br><strong>Example:</strong> RS(6, 3) = 6 data + 3 parity. Koi bhi 3 machines mar jaayein to bhi data safe, aur extra disk sirf 3/6 = 50%.` },
    { type: 'ascii', text: `
Sabse chhota example: XOR parity (k=2, m=1)

  A = 0101 (5)        B = 0011 (3)
  P = A XOR B = 0110 (6)          ← parity tukda

  A wali machine mari?  A = P XOR B = 0110 XOR 0011 = 0101 (5)  ✓

Reed-Solomon isi idea ko aage le jaata hai: m parity tukde,
koi bhi m tukde kho jaayein, baaki se sab wapas.`, caption: 'XOR ek tukda bacha sakta hai. Reed-Solomon kai.' },
    { type: 'p', html: `Scheme chuno, data size daalo, phir boxes pe click karke machines "maaro" aur dekho data bachta hai ya nahi:` },
    { type: 'custom', render(el) {
      const S = {
        r3: { name: '3x replication', rep: 3 },
        r2: { name: '2x replication', rep: 2 },
        rs63: { name: 'RS(6,3)', k: 6, m: 3 },
        rs104: { name: 'RS(10,4)', k: 10, m: 4 },
      };
      let cur = 'r3', dead = new Set();
      el.innerHTML = `<div class="osSch" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div style="margin-top:12px;max-width:320px"><label for="osTB">Asli data (TB)</label><input id="osTB" type="number" min="1" step="1" value="100"></div>
        <div class="osBoxes" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:14px"></div>
        <div class="osAlive" style="margin-top:10px;font:600 15px var(--f-display)"></div>
        <div class="stats">
          <div class="stat"><span>Kul disk chahiye</span><strong class="osRaw"></strong></div>
          <div class="stat"><span>Extra (overhead)</span><strong class="osOv"></strong></div>
          <div class="stat"><span>Kitni machines mar sakti hain</span><strong class="osTol"></strong></div>
          <div class="stat"><span>Ek tukda rebuild: kitne padhne</span><strong class="osReb"></strong></div>
        </div>
        <div class="calc-note osEN"></div>`;
      const tb = el.querySelector('#osTB');
      const draw = () => {
        const s = S[cur];
        const isRep = !!s.rep;
        const n = isRep ? s.rep : s.k + s.m;
        const tol = isRep ? s.rep - 1 : s.m;
        const factor = isRep ? s.rep : (s.k + s.m) / s.k;
        const data = Math.max(0, Number(tb.value) || 0);
        el.querySelector('.osSch').innerHTML = '';
        Object.keys(S).forEach(k => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small' + (k === cur ? ' primary' : ''); b.textContent = S[k].name; b.onclick = () => { cur = k; dead = new Set(); draw(); }; el.querySelector('.osSch').appendChild(b); });
        const box = el.querySelector('.osBoxes');
        box.innerHTML = '';
        for (let i = 0; i < n; i++) {
          const lab = isRep ? 'Copy ' + (i + 1) : (i < s.k ? 'D' + (i + 1) : 'P' + (i - s.k + 1));
          const d = dead.has(i);
          const b = document.createElement('button');
          b.type = 'button';
          b.style.cssText = `min-width:54px;padding:8px 6px;border-radius:var(--r-sm);font:600 13px var(--f-mono);cursor:pointer;border:1px solid ${d ? 'var(--red)' : 'var(--line-2)'};background:${d ? 'var(--red)' : (isRep || i < s.k ? 'var(--data-f)' : 'var(--cache-f)')};color:${d ? 'var(--surface)' : 'var(--ink)'};text-decoration:${d ? 'line-through' : 'none'}`;
          b.textContent = lab;
          b.setAttribute('aria-pressed', d ? 'true' : 'false');
          b.onclick = () => { if (dead.has(i)) dead.delete(i); else dead.add(i); draw(); };
          box.appendChild(b);
        }
        const ok = dead.size <= tol;
        const a = el.querySelector('.osAlive');
        a.textContent = dead.size === 0 ? 'Sab machines zinda. Kisi box pe click karke use maaro.'
          : ok ? `${dead.size} mari, data SAFE (${tol} tak jhel sakta hai)` : `${dead.size} mari: DATA LOST (sirf ${tol} tak jhel sakta tha)`;
        a.style.color = dead.size === 0 ? 'var(--ink-2)' : ok ? 'var(--green)' : 'var(--red)';
        el.querySelector('.osRaw').textContent = (data * factor).toFixed(0) + ' TB';
        el.querySelector('.osOv').textContent = Math.round((factor - 1) * 100) + '%';
        el.querySelector('.osTol').textContent = tol;
        el.querySelector('.osReb').textContent = isRep ? '1 copy' : s.k + ' tukde';
        el.querySelector('.osEN').textContent = isRep
          ? `Replication: ek copy mari to bas kisi doosri copy se seedha copy. Rebuild sasta aur fast, reads bhi kisi bhi copy se. Keemat: ${Math.round((factor - 1) * 100)}% extra disk.`
          : `${s.name}: ${s.k} data + ${s.m} parity tukde, sirf ${Math.round((factor - 1) * 100)}% extra disk mein ${s.m} failures. Keemat: ek tukda kho jaaye to use banane ke liye ${s.k} doosre tukde network se padhne padte hain, aur encode/decode mein CPU lagta hai.`;
      };
      tb.addEventListener('input', draw);
      draw();
    }},
    { type: 'table', head: ['', '3x replication', 'Erasure coding (jaise RS(6,3))'], rows: [
      ['Extra disk', '200%', '50% (RS(10,4) mein 40%)'],
      ['Kitne failures', '2', '3 (RS(10,4) mein 4)'],
      ['Read', 'Kisi bhi copy se, seedha', 'Normal read theek; tukda missing ho to k tukde jodne padte hain'],
      ['Ek tukda kho gaya, rebuild', '1 copy padho', 'k tukde padho (6 ya 10 guna network)'],
      ['CPU', 'Kuch nahi', 'Encode/decode ka kaam'],
      ['Best kab', 'Hot data, chhoti files, jo baar baar padha jaata hai', 'Bada, thanda data: purane videos, backups, logs'],
    ], caption: 'HDFS docs ka example: 6 blocks ki file 3x replication mein 18 blocks leti hai, RS(6,3) mein sirf 9.' },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "replication = backup"', html: `Replication aur erasure coding <strong>hardware failure</strong> se bachate hain. Lekin agar kisi ne galti se <code>DELETE</code> chala diya ya bug ne file kharab likh di, to wo galti saari copies pe turant pahunch jaati hai. Iske liye alag cheezein chahiye: <strong>versioning</strong> (S3 har object ke purane versions rakh sakta hai), alag account/region mein backup, aur delete pe protection (S3 Object Lock jaisa).` },

    { type: 'h2', text: 'Storage tiers: hot, cold, archive' },
    { type: 'p', html: `xyz.com ki 90% views pehle 30 din mein aati hain. 3 saal purane videos shaayad hi koi dekhta hai, lekin delete bhi nahi kar sakte. Sabko sabse mehenge, sabse fast storage mein kyun rakhein? Cloud providers alag <strong>storage classes</strong> dete hain: jitna kam access, utna sasta rakhna, lekin nikaalna mehenga ya slow.` },
    { type: 'callout', tone: 'term', title: 'Storage class (tier)', html: `<strong>Ye kya hai:</strong> ek hi object storage ke andar alag "dabbe", har ek ka alag bhaav. <strong>Hot</strong> = roz padha jaane wala data, rakhna mehenga, padhna muft. <strong>Cold</strong> = kabhi kabhar padha jaane wala, rakhna sasta, padhne pe alag fees. <strong>Archive</strong> = shaayad kabhi nahi, rakhna bahut sasta, lekin nikaalne mein minutes se 2 din tak.<br><strong>Kyun chahiye:</strong> xyz.com ke petabytes purane videos ka bill 5-20 guna kam ho sakta hai.<br><strong>Iske bina:</strong> 3 saal purana, koi na dekhne wala video bhi sabse mehenge dabbe mein, har mahine.` },
    { type: 'table', head: ['Tier', 'S3 class', 'Nikaalne ka time', 'Min. kitne din ka paisa', 'Kab'], rows: [
      ['Hot', 'S3 Standard', 'Milliseconds', 'Koi minimum nahi', 'Naye videos, thumbnails, roz ka data'],
      ['Warm', 'Standard-IA (Infrequent Access)', 'Milliseconds', '30 din', 'Mahine mein kabhi kabhi: purane videos'],
      ['Cold', 'Glacier Instant Retrieval', 'Milliseconds', '90 din', 'Saal mein kuch baar, lekin turant chahiye'],
      ['Archive', 'Glacier Flexible Retrieval', 'Minutes se ghante', '90 din', 'Purane backups'],
      ['Deep archive', 'Glacier Deep Archive', '12 se 48 ghante', '180 din', 'Kanoon ke liye 7 saal rakhna, shaayad kabhi nahi chahiye'],
    ], caption: 'AWS S3 storage classes page se. GCS mein inke naam Standard, Nearline, Coldline, Archive hain; Azure mein Hot, Cool, Cold, Archive. Infrequent/cold classes mein data nikaalne (retrieval) pe alag fees bhi lagti hai.' },
    { type: 'callout', tone: 'term', title: 'Retrieval fee aur minimum duration', html: `<strong>Ye kya hai:</strong> saste tiers ki do chhupi shartein. <strong>Retrieval fee</strong> = har GB padhne pe alag paisa. <strong>Minimum duration</strong> = object kam se kam itne din ka paisa dega, chahe pehle delete kar do.<br><strong>Kyun chahiye (provider ko):</strong> sasta GB tabhi possible hai jab data lamba ruke aur kam padha jaaye.<br><strong>Iske bina (tumhare liye):</strong> agar ye shartein bhool gaye, to "sasta" tier mehenga pad sakta hai. Neeche calculator mein khud dekho.` },
    { type: 'p', html: `Data ko haath se move nahi karte. <strong>Lifecycle rules</strong> likhte hain: "30 din baad Standard-IA mein, 1 saal baad Glacier mein, 7 saal baad delete". Aur agar pata hi nahi ki kaunsa data kab padha jaayega, to S3 Intelligent-Tiering access dekh ke khud move karta hai (thodi monitoring fees ke badle). <strong>Lifecycle rule</strong> = bucket pe likha ek niyam, jo S3 khud har din chalata hai: "X din purane objects ko Y tier mein le jao" ya "Z din baad delete karo". Iske bina kisi engineer ko har mahine script chalani padti.` },
    { type: 'h3', text: 'Cost calculator: kaunsa tier sach mein sasta?' },
    { type: 'p', html: `Data size, har mahine kitna data padha jaata hai, aur kitne mahine rakhna hai, ye daalo. Calculator har tier ka bill nikaalta hai (AWS us-east-1 ke list prices, 2026 mein dekhe gaye; prices badalte rehte hain, aur request fees chhod di hain). 1 TB = 1,000 GB maana hai.` },
    { type: 'custom', render(el) {
      const C = [
        { n: 'S3 Standard', t: 'Hot', p: 0.023, r: 0, d: 0, inst: true, wait: 'milliseconds' },
        { n: 'Standard-IA', t: 'Warm', p: 0.0125, r: 0.01, d: 30, inst: true, wait: 'milliseconds' },
        { n: 'Glacier Instant Retrieval', t: 'Cold', p: 0.004, r: 0.03, d: 90, inst: true, wait: 'milliseconds' },
        { n: 'Glacier Flexible Retrieval', t: 'Archive', p: 0.0036, r: 0.01, d: 90, inst: false, wait: 'minutes se ghante' },
        { n: 'Glacier Deep Archive', t: 'Deep archive', p: 0.00099, r: 0.02, d: 180, inst: false, wait: '12-48 ghante' },
      ];
      el.innerHTML = `<div class="row2">
          <div><label for="osTiTB">Data (TB)</label><input id="osTiTB" type="number" min="1" step="1" value="100"></div>
          <div><label for="osTiR">Har mahine kitna % data padha jaata hai: <strong class="osTiRV"></strong></label><input id="osTiR" type="range" min="0" max="100" step="1" value="1"></div>
          <div><label for="osTiM">Kitne mahine rakhna hai: <strong class="osTiMV"></strong></label><input id="osTiM" type="range" min="1" max="36" step="1" value="12"></div>
          <div><label style="display:flex;gap:8px;align-items:center;margin-top:22px"><input type="checkbox" class="osTiI" checked> User click kare to turant chahiye</label></div>
        </div>
        <div style="overflow-x:auto;margin-top:12px"><table class="osTiT" style="width:100%;border-collapse:collapse;font-size:14px"></table></div>
        <div class="calc-note osTiN"></div>`;
      const q = s => el.querySelector(s);
      const fmt = v => '$' + Math.round(v).toLocaleString('en-US');
      const draw = () => {
        const tb = Math.max(0, Number(q('#osTiTB').value) || 0), pct = Number(q('#osTiR').value), months = Number(q('#osTiM').value), inst = q('.osTiI').checked;
        q('.osTiRV').textContent = pct + '%'; q('.osTiMV').textContent = months;
        const gb = tb * 1000, rd = gb * pct / 100;
        const rows = C.map(c => { const bm = Math.max(months, c.d / 30); return Object.assign({ mo: gb * c.p + rd * c.r, tot: gb * c.p * bm + rd * c.r * months, bm, ok: !inst || c.inst }, c); });
        const okRows = rows.filter(r => r.ok);
        const best = okRows.reduce((a, b) => (b.tot < a.tot ? b : a), okRows[0]);
        const th = 'text-align:left;padding:6px;border-bottom:1px solid var(--line-2);color:var(--ink-3);font-weight:600';
        const td = 'padding:6px;border-bottom:1px solid var(--line);';
        q('.osTiT').innerHTML = `<tr><th style="${th}">Tier</th><th style="${th}">Rakhna / mahina</th><th style="${th}">Padhna / mahina</th><th style="${th}">Kul (${months} mahine)</th><th style="${th}">Wait</th></tr>` + rows.map(r => {
          const st = !r.ok ? 'color:var(--ink-3);text-decoration:line-through;' : r === best ? 'color:var(--green);font-weight:700;' : 'color:var(--ink-2);';
          const minNote = r.bm > months ? ` <span style="color:var(--amber)">(min ${r.d} din ka bill)</span>` : '';
          return `<tr><td style="${td}${st}">${r.t}: ${r.n}</td><td style="${td}${st}">${fmt(gb * r.p)}</td><td style="${td}${st}">${fmt(rd * r.r)}</td><td style="${td}${st}">${fmt(r.tot)}${minNote}</td><td style="${td}${st}">${r.wait}</td></tr>`;
        }).join('');
        const std = rows[0];
        q('.osTiN').textContent = `Sabse sasta (shartein maan ke): ${best.n}, ${fmt(best.tot)}. Standard ke ${fmt(std.tot)} se ${std.tot ? Math.round((1 - best.tot / std.tot) * 100) : 0}% kam. ` + (inst ? 'Flexible aur Deep Archive kaat diye kyunki unme minutes se ghanton ka wait hai. ' : '') + 'Read % badha ke dekho: jitna zyada padhoge, cold tiers ki retrieval fees utni bhaari.';
      };
      el.querySelectorAll('input').forEach(x => x.addEventListener('input', draw));
      q('.osTiI').addEventListener('change', draw);
      draw();
    }},
    { type: 'p', html: `Calculator se teen baatein dikhti hain (100 TB, 12 mahine, "turant chahiye" on):<br>• 1% data har mahine padha: Glacier Instant Retrieval ~$5,160 vs Standard ~$27,600. Lagbhag 81% bachat.<br>• 50% padha: ab Standard-IA (~$21,000) sabse sasta, kyunki Instant Retrieval ki $0.03/GB padhne ki fees bhaari ho gayi.<br>• 100% padha: Instant Retrieval (~$40,800) Standard (~$27,600) se bhi mehenga! Hot data ko cold tier mein daalna ulta padta hai.` },
    { type: 'image', src: 'assets/img/object-storage/tape-library.jpg', alt: 'Ek tape library ke andar: dono taraf hazaaron tape cartridges ki deewarein, beech mein ek robot arm', caption: 'Ek tape library ka andar (NERSC, US). Robot arm tape nikaal ke drive mein daalta hai. Archive storage aksar aise saste, slow media pe hota hai, isliye nikaalne mein ghante lagte hain. (AWS ye publicly nahi batata ki Glacier andar kya use karta hai; ye photo sirf idea ke liye.)', credit: { text: 'Derrick Coetzee, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Interior_of_StorageTek_tape_library_at_NERSC_(1).jpg', license: 'CC0' } },
    { type: 'callout', tone: 'mistake', title: 'Sasta tier hamesha sasta nahi', html: `Archive mein GB ka bhaav bahut kam hai, lekin (1) minimum duration: 180 din ka paisa lagega chahe 2 din mein delete karo, (2) har retrieval ka alag paisa, (3) Deep Archive se file 12+ ghante mein aati hai. Jo data user kabhi bhi click karke dekh sakta hai, use Deep Archive mein daala to user ghanton wait karega. Tier access pattern dekh ke chuno, sirf GB price dekh ke nahi.` },

    { type: 'h2', text: 'Poori picture: xyz.com ka storage design' },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `Jo bhi cheez kuch KB se badi hai aur poori ek saath padhi jaati hai (photo, video, PDF, backup), wo <strong>object storage</strong> mein jaati hai; database mein sirf uska pointer aur metadata. Client ko <strong>pre-signed URL</strong> se seedha upload karne do, taaki gigabytes kabhi tumhare app servers se na guzrein. Badi files ke liye multipart/resumable upload, aur purane data ke liye lifecycle rules se saste tiers.` },

    { type: 'diagram', title: 'Object storage: poori picture', height: 610,
      groups: [
        { label: 'Users', x: 20, y: 18, w: 680, h: 102 },
        { label: 'Control (chhota data)', x: 20, y: 180, w: 190, h: 270 },
        { label: 'Data path (bade bytes)', x: 265, y: 180, w: 190, h: 410 },
        { label: 'Delivery + purana data', x: 510, y: 180, w: 190, h: 270 },
      ],
      nodes: [
        { id: 'ph', label: 'Riya ka phone', sub: 'uploader', x: 115, y: 75, kind: 'client', info: 'Ye kya hai: video upload karne wali user ki app. Server se sirf permission (pre-signed URLs) leti hai, phir bytes seedha S3 mein multipart/resumable tareeke se bhejti hai.' },
        { id: 'vw', label: 'Viewer', sub: 'video dekhta', x: 605, y: 75, kind: 'client', info: 'Ye kya hai: video dekhne wala user. App server se video ka page aur CDN/pre-signed GET URL leta hai, phir bytes CDN se aate hain.' },
        { id: 'app', label: 'App server', sub: 'URL sign karta', x: 115, y: 245, kind: 'server', info: 'Ye kya hai: xyz.com ka apna code. Login aur limits check karta hai, key chunta hai, PENDING row banata hai, aur pre-signed URLs sign karta hai. Video ke bytes isse kabhi nahi guzarte.' },
        { id: 'db', label: 'Metadata DB', sub: 'pointer + status', x: 115, y: 395, kind: 'data', info: 'Ye kya hai: normal database. Har video ki row: owner, title, s3_key, size, status (PENDING / UPLOADED / READY). Bytes nahi, sirf pata aur haal.' },
        { id: 's3', label: 'S3 bucket', sub: 'Standard (hot)', x: 360, y: 245, kind: 'data', info: 'Ye kya hai: object storage. Signature aur expiry check karke upload leta hai, parts jodta hai. Andar data alag Availability Zones mein replication ya erasure coding se safe rehta hai.' },
        { id: 'q', label: 'Queue', sub: 'upload events', x: 360, y: 395, kind: 'queue', info: 'Ye kya hai: messages ki line. S3 ka ObjectCreated event yahan aata hai, taaki processing client ki baat pe nahi, S3 ke sach pe chale.' },
        { id: 'wk', label: 'Workers', sub: 'scan, transcode', x: 360, y: 535, kind: 'server', info: 'Ye kya hai: background programs. File check (type, virus), video ke chhote versions banana, thumbnail. Output wapas S3 mein likhte hain aur DB mein status READY.' },
        { id: 'cdn', label: 'CDN', sub: 'edge cache', x: 605, y: 245, kind: 'edge', info: 'Ye kya hai: duniya bhar mein faile cache servers (CDN lesson). Viewers ko paas se video dete hain. Cache miss pe hi S3 se laate hain, isliye S3 pe bojh aur bahar data bhejne ka bill kam.' },
        { id: 'cold', label: 'Cold / Archive', sub: 'IA, Glacier', x: 605, y: 395, kind: 'data', info: 'Ye kya hai: saste storage classes. Lifecycle rule purane videos ko yahan le aata hai (jaise 30 din baad IA, 1 saal baad Glacier). Rakhna sasta, padhna mehenga ya slow.' },
      ],
      edges: [
        { a: 'ph', b: 'app', n: 1, label: 'upload URL do' },
        { a: 'app', b: 'db', n: 2, label: 'PENDING row' },
        { a: 'ph', b: 's3', n: 3, label: 'PUT parts' },
        { a: 's3', b: 'q', n: 4, label: 'ObjectCreated', kind: 'evt' },
        { a: 'q', b: 'wk', n: 5, kind: 'evt' },
        { a: 'wk', b: 'db', n: 6, label: 'READY' },
        { a: 'wk', b: 's3', label: 'outputs', via: [[480, 535], [480, 264]] },
        { a: 'vw', b: 'cdn', label: 'watch' },
        { a: 'cdn', b: 's3', label: 'cache miss' },
        { a: 's3', b: 'cold', label: 'lifecycle', dashed: true },
      ],
      paths: [
        { name: 'Upload', text: 'Phone permission maangta hai, server PENDING row + pre-signed URLs deta hai, parts seedha S3 mein, S3 ka event queue se worker tak, worker status READY karta hai.', go: ['ph>app>db', 'ph>s3>q>wk>db'] },
        { name: 'Watch', text: 'Viewer CDN se video leta hai. CDN ke paas na ho tabhi S3 se aata hai. App server pe bytes ka bojh zero.', go: ['vw>cdn>s3'] },
        { name: 'Purana data', text: 'Lifecycle rule khud purane objects ko saste tier mein le jaata hai. DB ka pointer wahi rehta hai.', go: ['s3>cold'] },
        { name: 'Upload toota', text: 'Network gaya to sirf adhoore parts dobara jaate hain. Kabhi poora na hua to cleanup job PENDING row hata deta hai aur lifecycle rule adhoore parts.', go: ['ph>s3', 'wk>db'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Badi files (photo, video, PDF, backup) object storage mein. Database mein sirf pointer aur status.</li>
      <li>Block = kachchi disk (DB ke liye), File = shared folders, Object = bucket + key, HTTP se, beech mein edit nahi.</li>
      <li>Durability (data khoye nahi) aur availability (abhi mile) alag cheezein hain. S3: 11 nines durability design.</li>
      <li>Pre-signed URL = ek file, ek kaam, thodi der. Signature badla ya time nikla = 403.</li>
      <li>Multipart (S3) aur resumable (GCS): toot pe sirf adhoora tukda dobara. 10,000 parts ki limit yaad rakho.</li>
      <li>Chunk + hash = dedupe aur sirf badla hua hissa upload. Content-defined chunking boundary khisakne se bachata hai.</li>
      <li>3x replication = 200% extra, simple aur fast rebuild. Erasure coding RS(6,3) = 50% extra, rebuild mehenga.</li>
      <li>Hot / cold / archive: access pattern dekh ke tier chuno, retrieval fees aur minimum duration ke saath.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Bahut sasta per GB, aur lagbhag unlimited jagah', 'Bahut zyada durability bina khud replication sambhale', 'Pre-signed URLs: app servers pe upload ka bojh zero', 'Multipart: network toote to sirf adhoora part dobara', 'Erasure coding aur tiers se petabytes pe bhi kharcha kaabu mein', 'CDN aur event pipelines ke saath seedha jud jaata hai'], costs: ['Object ko beech mein edit nahi kar sakte; poora dobara likhna', 'Har request HTTP: database/disk jitni kam latency nahi', 'Pre-signed URL leak = jab tak expiry, koi bhi use kare', 'DB row aur S3 object alag jagah: dono ko sync rakhna (PENDING, cleanup) tumhara kaam', 'Request aur data bahar nikaalne (egress) ka alag bill', 'Cold tiers: retrieval fees aur ghanton ka wait'] },

    { type: 'think', questions: [
      { q: 'xyz.com profile photo upload ke liye bhi pre-signed URL lagaye ya simple server upload kaafi hai? Photo ~2 MB hai.', a: 'Dono chal sakte hain. 2 MB chhota hai, server se guzarna bahut bura nahi. Lekin lakhon users roz photo badal rahe hon to bandwidth aur connections ka hisaab jud jaata hai, aur ek hi pattern (pre-signed) har upload ke liye rakhna simple hai. Server upload tab theek hai jab server ko bytes pe turant kuch karna ho, jaise resize karke hi save karna; tab bhi aksar upload ke baad worker se resize karte hain.' },
      { q: 'Dropbox jaisa sync: user ne 1 GB ki video file ka sirf naam badla. Kitna data upload hona chahiye?', a: 'Lagbhag zero. Naam metadata hai, bytes nahi badle. Client chunk hashes nikaalega, saare server pe pehle se hain, to sirf metadata update (naya naam → wahi chunk list) jaayega. Isliye design mein metadata DB aur chunk/blob store alag rakhte hain.' },
      { q: 'Ek bucket mein 10 PB purane videos hain jo saal mein ek do baar dekhe jaate hain. 3x replication ki jagah RS(10,4) lagaya. Kya kho diya?', a: 'Disk 30 PB se ghat ke 14 PB, aur failures jhelne ki taakat 2 se badh ke 4. Kho diya: koi tukda missing ho to padhne/rebuild ke liye 10 tukde network se jodne padte hain (zyada network, CPU, latency). Rarely padhe jaane wale bade data ke liye ye sauda achha hai; hot, chhote, baar baar padhe jaane wale data ke liye replication behtar.' },
      { q: 'xyz.com ke 2 lakh purane videos ko lifecycle rule ne Glacier Deep Archive mein daal diya. Ek din ek purana video viral ho gaya aur log click karne lage. Kya hoga, aur design kaise badloge?', a: 'Deep Archive se nikaalne mein 12-48 ghante lagte hain, to users ko video nahi milega. Hal: jo data user kabhi bhi click kar sakta hai use instant tiers (Standard-IA ya Glacier Instant Retrieval) mein rakho, ya S3 Intelligent-Tiering lagao jo access dekh ke khud move kare. Deep Archive sirf un cheezon ke liye jo user ko seedhe kabhi nahi dikhti (kanooni records, purane backups).' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Postgres database ki data files aam taur pe kis storage pe hoti hain?', options: ['Object storage', 'Block storage', 'Archive tier'], answer: 1, explain: 'Database ko beech ke chhote blocks bahut fast badalne hote hain. Block storage (local SSD, EBS) yahi deta hai. Object storage mein beech mein edit hota hi nahi.' },
      { q: 'Pre-signed URL ka sabse bada faayda?', options: ['File apne aap compress ho jaati hai', 'Client seedha S3 mein upload karta hai, bytes app server se nahi guzarte, aur access sirf ek key, ek method, thodi der ke liye milta hai', 'S3 ko login ki zaroorat khatam ho jaati hai, hamesha ke liye'], answer: 1, explain: 'Signature mein bucket, key, method aur expiry bandhe hain. App server sirf permission deta hai, data ka raasta seedha phone se S3.' },
      { q: '1.9 GB bhejne ke baad network toota. 16 MB parts, 3 parallel. Multipart mein zyada se zyada kitna dobara bhejna padega?', options: ['Poora 1.9 GB', 'Lagbhag 48 MB (3 adhoore parts)', 'Kuch nahi'], answer: 1, explain: 'Jo parts poore pahunch gaye (ETag mila) wo S3 mein safe hain. Sirf jo 3 parts raaste mein the, wahi dobara: max 3 × 16 MB.' },
      { q: 'RS(6,3) erasure coding ke baare mein kya sahi hai?', options: ['200% extra disk, 2 failures', '50% extra disk, koi bhi 3 tukde kho jaayein to bhi data safe', '0% extra disk, 6 failures'], answer: 1, explain: '6 data + 3 parity = 9 tukde 6 ke data ke liye: 50% extra. Koi bhi 6 bache hon to data wapas ban jaata hai, yaani 3 tak failures.' },
      { q: 'Pre-signed PUT URL mein kisi ne key badal ke doosre user ki file ka naam daal diya. S3 kya karega?', options: ['Upload le lega, kyunki URL valid hai', '403 SignatureDoesNotMatch, kyunki signature purani key pe bana tha aur naya banane ke liye secret chahiye', 'Doosre user ko email bhejega'], answer: 1, explain: 'Signature method, key aur expiry sab pe bana hai. Ek bhi cheez badli to S3 ka dobara banaya signature mel nahi khata.' },
      { q: 'GCS resumable upload mein network toota. Client wapas aake sabse pehle kya karta hai?', options: ['Poori file zero se bhejta hai', 'Session URI pe poochhta hai "kitne bytes mile?" aur wahin se aage bhejta hai', 'Naya bucket banata hai'], answer: 1, explain: 'Progress server pe save hai. Client sirf baaki hissa bhejta hai. Session ek hafte tak valid rehta hai.' },
      { q: '100 TB data, aur har mahine poora 100% padha jaata hai. Glacier Instant Retrieval mein daalein?', options: ['Haan, GB sabse sasta hai', 'Nahi: $0.03/GB padhne ki fees se bill Standard se bhi zyada ho jaata hai (calculator: ~$3,400 vs ~$2,300 har mahine)', 'Fark nahi padta'], answer: 1, explain: 'Saste tiers sirf kam padhe jaane wale data ke liye saste hain. Hot data ko cold tier mein daalna ulta padta hai.' },
      { q: 'Kanoon ke liye 7 saal rakhne hain bank statements ke PDFs, jo shaayad kabhi koi nahi kholega. Best tier?', options: ['S3 Standard', 'Deep archive (Glacier Deep Archive jaisa)', 'Redis'], answer: 1, explain: 'Sabse sasta per GB, aur kabhi kabhar 12-48 ghante ka wait chal jaayega. Roz khulne wali files ke liye ye galat choice hoti.' },
    ]},
    { type: 'sources', note: 'Numbers aur limits inhi official docs aur papers se liye gaye hain.', items: [
      { title: 'Amazon S3 multipart upload limits', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html', used: '10,000 parts, part size 5 MiB to 5 GiB, last part can be smaller, max object size.' },
      { title: 'Amazon S3 increases the maximum object size to 50 TB', publisher: 'AWS What\'s New', official: true, year: 2025, url: 'https://aws.amazon.com/about-aws/whats-new/2025/12/amazon-s3-maximum-object-size-50-tb/', used: 'Max object size raised from 5 TB to 50 TB (Dec 2025).' },
      { title: 'Uploading and copying objects using multipart upload', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html', used: 'Initiate/upload parts/complete flow, parallel and any-order parts, ETags, ListParts, charges for incomplete uploads, AbortIncompleteMultipartUpload lifecycle rule, ~100 MB recommendation.' },
      { title: 'Download and upload objects with presigned URLs', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html', used: 'Expiry up to 7 days with IAM user (SigV4), temporary credentials shorten it, expiry checked at request start, presigned URLs act as bearer tokens.' },
      { title: 'Amazon S3 Update: Strong Read-After-Write Consistency', publisher: 'AWS News Blog', official: true, year: 2020, url: 'https://aws.amazon.com/blogs/aws/amazon-s3-update-strong-read-after-write-consistency/', used: 'Strong read-after-write for GET, PUT, LIST since December 2020, earlier eventual consistency.' },
      { title: 'Data protection in Amazon S3', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/DataDurability.html', used: '11 nines durability design, 99.99% availability, at least 3 Availability Zones.' },
      { title: 'Amazon S3 storage classes', publisher: 'AWS', official: true, url: 'https://aws.amazon.com/s3/storage-classes/', used: 'Retrieval times and minimum storage durations per class.' },
      { title: 'Amazon S3 pricing', publisher: 'AWS', official: true, url: 'https://aws.amazon.com/s3/pricing/', used: 'US East storage prices per GB-month and per-GB retrieval fees used in the tier cost calculator (checked 2026).' },
      { title: 'Authenticating requests: AWS Signature Version 4', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-authenticating-requests.html', used: 'Pre-signed URL signature is an HMAC-SHA256 over method, path, query and expiry; a changed field gives SignatureDoesNotMatch.' },
      { title: 'Resumable uploads', publisher: 'Google Cloud Storage documentation', official: true, url: 'https://cloud.google.com/storage/docs/resumable-uploads', used: 'Session URI, resume from persisted offset, 256 KiB chunk multiple, one-week session.' },
      { title: 'The Google File System', publisher: 'Google (SOSP paper)', official: true, year: 2003, url: 'https://research.google/pubs/the-google-file-system/', used: 'Single master with metadata only, chunkservers, 64 MB chunks, 3 replicas default, heartbeats, data pushed along a chain, shadow masters.' },
      { title: 'HDFS Architecture', publisher: 'Apache Hadoop documentation', official: true, url: 'https://hadoop.apache.org/docs/stable/hadoop-project-dist/hadoop-hdfs/HdfsDesign.html', used: 'NameNode/DataNode roles, typical 128 MB block, replication 3, user data never flows through NameNode.' },
      { title: 'HDFS Erasure Coding', publisher: 'Apache Hadoop documentation', official: true, url: 'https://hadoop.apache.org/docs/stable/hadoop-project-dist/hadoop-hdfs/HDFSErasureCoding.html', used: '200% vs 50% overhead, RS(6,3) and RS(10,4) policies, 18 vs 9 blocks example, CPU and network costs.' },
      { title: 'Streaming File Synchronization', publisher: 'Dropbox Tech blog', official: true, year: 2014, url: 'https://dropbox.tech/infrastructure/streaming-file-synchronization', used: '4 MB blocks hashed with SHA-256; client commits a block list and uploads only blocks the server asks for.' },
    ]},
  ],
});
