Lesson.register({
  id: 'pattern-blobs',
  title: 'Large blobs (files, videos)',
  minutes: 28,
  summary: `Photos, videos, PDFs, backups: badi files ka ek hi pattern har jagah dikhta hai. Upload seedha storage mein (pre-signed URL, chunks mein, resumable), same file dobara store nahi (content hash), upload ke baad ek pipeline (virus scan, thumbnail, transcoding), aur delivery CDN se. Google Drive, YouTube uploads, WhatsApp media: sab isi ke variations.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Photos aur videos bahut badi files hoti hain: ek video 1 GB tak ki ho sakti hai.<br>Agar har badi file hamare main server se hoke guzre, to server us bojh ke neeche dab jaata hai.<br>Mobile network beech mein toot jaaye, to 1 GB phir se zero se bhejna padta hai.<br>Is lesson mein ek seedhi chadhenge: file seedhe storage mein bhejna, tukdon mein bhejna taaki toote to wahin se shuru ho, upload ke baad video ko taiyaar karna, same file do baar na rakhna, aur lakhon logon tak tez pahunchana.` },
    { type: 'h2', text: 'Ab tak ki kahani' },
    { type: 'p', html: `xyz.com ab ek bada video platform hai. Roz lakhon log photos, short videos, lambi vlogs aur PDFs upload karte hain. <a href="#/object-storage">Object storage</a> lesson mein humne building blocks seekhe the: S3 jaisa bucket, pre-signed URL, multipart upload, chunk hashing. <a href="#/cdn">CDN</a> lesson mein dekha ki duniya bhar ke viewers tak bytes kaise pahunchte hain.` },
    { type: 'p', html: `Ye lesson un blocks ko dobara nahi padhayega. Yahan sawaal ye hai: <strong>jab bhi kisi design mein "badi file" aaye, to poora raasta kaisa dikhta hai, aur kahan kahan cheezein toot-ti hain?</strong> Interview mein "design YouTube" ho ya "design Google Drive" ya "WhatsApp pe photo bhejna", ye same pattern hai: 4 stage (upload, store, process, deliver), aur unhe banane ke 5 dande.` },
    { type: 'callout', tone: 'term', title: 'Blob', html: `<strong>Ye kya hai:</strong> Blob (Binary Large OBject) matlab bytes ka ek bada dher jiske andar database ko jhaankna nahi hai: ek video, ek photo, ek zip. Database ke liye ye bas "kuch MB/GB ka data" hai.<br><strong>Kyun alag naam:</strong> blobs ka bartaav normal data se alag hai: bade, ek baar likhe, lakhon baar padhe, aur network pe bhejne mein seconds se minutes.<br><strong>Iske bina (blob ko DB mein rakha):</strong> database phool jaata hai, backups ghanton ke, aur har query slow.` },
    { type: 'callout', tone: 'term', title: 'Object storage + metadata DB', html: `<strong>Ye kya hai:</strong> object storage (Amazon S3, Google Cloud Storage, Azure Blob) = files ka ek bahut bada, sasta godown. Har file ek "object", ek naam (key) ke saath, ek <strong>bucket</strong> (folder jaisa dabba) mein. Metadata DB = normal database jisme har file ki ek chhoti row: key, owner, size, status.<br><strong>Kyun chahiye:</strong> rule simple hai: blob object storage mein, database mein sirf uska pata (key) aur metadata.<br><strong>Iske bina:</strong> ya to DB mein GBs, ya files kisi ek server ki disk pe, jo mari to files gayab.` },
    { type: 'ascii', text: `
  1. UPLOAD            2. STORE              3. PROCESS                 4. DELIVER
 ──────────────     ──────────────     ───────────────────────     ──────────────
 phone → seedha     S3 bucket           event → queue → workers     CDN edge →
 S3 (pre-signed,    (raw/incoming)      scan, thumbnail,            viewers
 chunks, resume)    + metadata DB       transcode, moderation       (signed URLs)
                    (status, key)       → status READY
       │                  │                     │                         │
  app server sirf    dedupe: hash        idempotent workers,        app server bytes
  permission deta    se same file        retries, DLQ               kabhi nahi chhoota
  hai, bytes nahi    ek hi baar` , caption: 'Large blob pattern ke 4 stage. Har stage ka ek "galti" wala version hai, jo neeche dekhenge.' },
    { type: 'p', html: `Upar ke shabd (pre-signed, chunks, event, queue, CDN) abhi naye lag rahe hain. Neeche har danda inhe ek ek karke, kahani ke saath samjhayega.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "upload hua = video ready"', html: `"Upload ho gaya" aur "video ready hai" do alag cheezein hain. S3 ka <code>200 OK</code> sirf itna kehta hai ki bytes safe pahunch gaye. Abhi scan nahi hua, thumbnail nahi bana, 360p/720p version nahi bane. Isliye YouTube jaisi apps upload ke baad "Processing..." dikhati hain. Design mein hamesha ek <strong>status</strong> rakho (UPLOADED → PROCESSING → READY) aur UI ko usi ke hisaab se chalao.` },

    { type: 'h2', text: 'Blobs ki seedhi: paanch dande' },
    { type: 'ascii', caption: 'Neeche se upar padho. Har danda tab lagao jab uski problem sach mein ho.', text: `  5  CDN delivery           lakhon viewers, edge se bytes, signed URL/cookie
     ^  jab: ek file ko bahut log, door door se dekhte hain
  4  Dedupe (content hash)  same bytes ek hi baar store, "instant upload"
     ^  jab: same files baar baar aati hain (memes, forwards)
  3  Processing pipeline    event → queue → workers: scan, thumbnail, transcode
     ^  jab: upload ke baad file pe lamba kaam karna hai
  2  Multipart + resumable  tukdon mein, parallel, toote to wahin se
     ^  jab: files ~100 MB+ ya network kamzor (mobile)
  1  Pre-signed URL         bytes seedhe storage mein, app sirf permission de
     ^  jab: files kuch MB se badi, ya uploads bahut
  0  App server ke through  chhoti files (kuch KB) ke liye bilkul theek` },
    { type: 'h2', text: 'Danda 1: Pre-signed URL (bytes kis raaste se jaayein?)' },
    { type: 'p', html: `Sabse pehla design faisla. Naya engineer aksar likhta hai: <code>POST /upload</code>, file app server pe aayi, app server ne S3 mein daal di. Chhoti site pe chal jaata hai. Lekin xyz.com pe peak time pe har minute hazaaron uploads hain. Socho kya hota hai: har upload utni der app server ka ek connection pakad ke baitha hai jitni der user ka network bytes bhej raha hai, aur har byte do baar network pe chalta hai (phone → app, app → S3).` },
    { type: 'callout', tone: 'term', title: 'Pre-signed URL', html: `<strong>Ye kya hai:</strong> ek link jisme hamare server ka digital signature hai: "is link wala, sirf is ek file ko, agle 15 minute tak, S3 mein PUT kar sakta hai". App server ye link banata hai (milliseconds ka kaam), aur phone us link pe file seedhe S3 ko bhejta hai.<br><strong>Kyun chahiye:</strong> app server sirf "haan ya na" (permission) deta hai; GBs uske paas se nahi guzarte.<br><strong>Iske bina:</strong> har upload app server ka connection aur bandwidth khaata hai, aur deploy pe saare chalte uploads toot jaate hain.<br><strong>Example:</strong> S3 mein SDK/CLI se bane link ki expiry max 7 din tak ho sakti hai; aam taur pe minutes rakhte hain.` },
    { type: 'p', html: `Neeche simulator mein file size, user ka network aur peak traffic chuno, aur dono raaste compare karo. Phir neeche "Pipeline chalao" dabao: upload ke baad kya kya hota hai, wo bhi dikhega.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="pbSize">File</label><select id="pbSize"><option value="5">5 MB photo</option><option value="100" selected>100 MB short video</option><option value="1024">1 GB vlog</option><option value="4096">4 GB lecture</option></select></div>
          <div><label for="pbNet">User ka network</label><select id="pbNet"><option value="1">Slow 3G, 1 Mbps</option><option value="10" selected>4G, 10 Mbps</option><option value="50">Home WiFi, 50 Mbps</option><option value="200">Office fibre, 200 Mbps</option></select></div>
          <div><label for="pbU">Peak uploads per minute: <strong class="pbUv"></strong></label><input id="pbU" type="range" min="100" max="20000" step="100" value="2000"></div>
          <div><label for="pbW">Transcode workers: <strong class="pbWv"></strong></label><input id="pbW" type="range" min="1" max="50" step="1" value="10"></div>
        </div>
        <div class="pbCols" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-top:12px"></div>
        <div class="calc-note pbNote"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px"><button type="button" class="btn small primary pbRun">Pipeline chalao</button></div>
        <div class="pbPipe" style="display:flex;flex-direction:column;gap:6px;margin-top:10px"></div>
        <div class="calc-note pbPNote"></div>`;
      const $ = c => el.querySelector(c);
      const fmt = n => Math.round(n).toLocaleString('en-IN');
      const dur = s => s < 90 ? Math.round(s) + ' s' : s < 5400 ? (s / 60).toFixed(1) + ' min' : (s / 3600).toFixed(1) + ' ghante';
      // Pure maths (lesson text in iske numbers pe based hai)
      const calc = (S, N, U, W) => {
        const userT = S * 8 / N;                 // seconds, user ke network pe
        const hop = S * 8 / 1000;                // app → S3, 1 Gbps
        const conc = U / 60 * userT;             // Little's law: ek saath chal rahe uploads
        const gbps = U / 60 * S * 8 / 1000;      // app fleet mein aane wala data (Gbps); bahar bhi utna hi
        const servers = Math.max(Math.ceil(gbps / 1), Math.ceil(conc / 1000), 1);
        const tbHour = U * 60 * S / 1e6;         // peak ghante mein app se guzra data (TB), ek direction
        const isVideo = S >= 50, vSec = isVideo ? S : 0;   // ~60 MB per minute = ~1 MB per second (1080p)
        const tasks = Math.ceil(vSec / 10) * 4, work = vSec * 0.5 * 4;
        const st = [['S3 event → queue', 2], ['Validate (type, size)', 1], ['Virus scan', 1 + S / 100], ['Thumbnail', 2]];
        const tr = isVideo ? work / Math.min(W, tasks) + 3 : 0;
        if (isVideo) st.push(['Transcode (4 qualities)', tr]);
        st.push(['Status READY, CDN pe', 1]);
        const total = 2 + 1 + (1 + S / 100) + Math.max(2, tr) + 1;
        return { userT, hop, conc, gbps, servers, tbHour, st, total, isVideo, vSec };
      };
      let running = false;
      const upd = () => {
        const S = +$('#pbSize').value, N = +$('#pbNet').value, U = +$('#pbU').value, W = +$('#pbW').value;
        $('.pbUv').textContent = fmt(U); $('.pbWv').textContent = W;
        const r = calc(S, N, U, W);
        const card = (t, rows, warn) => `<div style="border:1px solid ${warn ? 'var(--red)' : 'var(--green)'};border-radius:var(--r);padding:10px 12px;background:var(--surface)">
          <div style="font-weight:600;margin-bottom:6px">${t}</div>${rows.map(([k, v]) => `<div style="display:flex;justify-content:space-between;gap:8px;font-size:14px;padding:2px 0;border-bottom:1px dashed var(--line)"><span style="color:var(--ink-3)">${k}</span><strong style="font-family:var(--f-mono)">${v}</strong></div>`).join('')}</div>`;
        $('.pbCols').innerHTML = card('App server ke through', [
          ['User ka upload time', dur(r.userT + r.hop)],
          ['Ek saath chal rahe uploads', fmt(r.conc)],
          ['App fleet: andar aata data', r.gbps.toFixed(1) + ' Gbps'],
          ['App fleet: S3 ko bahar', r.gbps.toFixed(1) + ' Gbps'],
          ['Sirf upload ke liye servers', fmt(r.servers)],
          ['Deploy pe toote uploads', fmt(r.conc)],
        ], true) + card('Seedha S3 (pre-signed URL)', [
          ['User ka upload time', dur(r.userT)],
          ['Ek saath chal rahe uploads', fmt(r.conc) + ' (S3 pe)'],
          ['App fleet: andar aata data', '~' + (U / 60).toFixed(0) + ' KB/s'],
          ['App fleet: S3 ko bahar', '0'],
          ['Sirf upload ke liye servers', '~1 (URL sign)'],
          ['Deploy pe toote uploads', '0'],
        ], false);
        $('.pbNote').textContent = `Peak ghante mein app servers se ~${r.tbHour.toFixed(1)} TB andar aur utna hi bahar jaata (through-app raaste mein). User ka time dono mein lagbhag same hai, kyunki asli rukawat user ka network hai. Fark app servers pe hai: unhe ${fmt(r.conc)} lambe connections aur ${r.gbps.toFixed(1)} Gbps sambhalne padte, aur har deploy/restart pe beech ke saare uploads toot-te. Assumption: 1 app server ≈ 1 Gbps upload data aur ~1,000 khule uploads.`;
        drawPipe(r, -1);
      };
      const drawPipe = (r, upto) => {
        const max = Math.max(...r.st.map(s => s[1]));
        $('.pbPipe').innerHTML = r.st.map(([n, t], i) => {
          const on = i <= upto, par = n.startsWith('Thumbnail') || n.startsWith('Transcode');
          return `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <span style="min-width:150px;font-size:13px;color:${on ? 'var(--ink)' : 'var(--ink-3)'}">${par ? '∥ ' : ''}${n}</span>
            <span style="flex:1;min-width:80px;height:12px;border-radius:6px;background:var(--surface-2);border:1px solid var(--line);overflow:hidden"><span style="display:block;height:100%;width:${Math.max(4, t / max * 100).toFixed(0)}%;background:${on ? 'var(--green)' : 'var(--line-2)'};transition:background .3s"></span></span>
            <strong style="font:13px var(--f-mono);min-width:60px;text-align:right">${dur(t)}</strong></div>`;
        }).join('');
        $('.pbPNote').textContent = upto < 0 ? '' : `Upload khatam hone se READY tak ~${dur(r.total)}. "∥" wale stages saath saath chalte hain (dono scan ke baad shuru), isliye total mein sirf lamba wala gina.` + (r.isVideo ? ` Video ~${dur(r.vSec)} ka maana (1080p ≈ 1 MB per second), 10 second ke tukde 4 qualities mein, ${$('#pbW').value} workers pe baante.` : ' Photo hai, to transcoding nahi.');
      };
      $('.pbRun').onclick = () => {
        if (running) return; running = true;
        const r = calc(+$('#pbSize').value, +$('#pbNet').value, +$('#pbU').value, +$('#pbW').value);
        let i = 0; const step = () => { drawPipe(r, i); i++; if (i < r.st.length) setTimeout(step, 450); else running = false; };
        step();
      };
      el.querySelectorAll('select,input').forEach(x => x.addEventListener('input', upd)); upd();
    }},

    { type: 'callout', tone: 'term', title: "Little's law (ek line mein)", html: `<strong>Ye kya hai:</strong> ek saath system mein kitne kaam chal rahe hain = har second kitne aate hain × har ek kitni der rehta hai. 33 uploads/second × 80 second = ~2,667 ek saath.<br><strong>Kyun chahiye:</strong> isi se pata chalta hai kitne connections/servers chahiye. Ye rule queues, connections, servers sab pe lagta hai.<br><strong>Iske bina:</strong> capacity ka andaza galat, aur peak pe servers kam pad jaate hain.` },
    { type: 'callout', tone: 'tip', title: 'Default numbers padh ke dekho', html: `100 MB video, 4G (10 Mbps), 2,000 uploads/minute: har upload ~80 second chalta hai, to Little's law se ek saath ~<strong>2,667 uploads</strong> khule hain. App server raaste mein fleet pe ~<strong>26.7 Gbps andar aur 26.7 Gbps bahar</strong>, yaani ~27 servers sirf bytes aage badhaane ke liye. Pre-signed raaste mein app server ko bas har second ~33 chhoti "URL do" requests: ek server kaafi. Ek mazedaar baat: network ko WiFi kar do, Gbps wahi 26.7 rehta hai (data utna hi hai), bas connections kam ho jaate hain.` },
    { type: 'callout', tone: 'tip', title: 'Yahin ruk jao agar...', html: `...files ~100 MB se chhoti hain aur users ka network theek hai (jaise profile photos, PDFs). Ek pre-signed PUT kaafi hai. Aur agar files kuch KB ki hain (chhota avatar, chat attachment ka JSON), to danda 0 (seedha API) bhi theek hai. Upar tab jao jab files bade hon ya mobile pe upload toot-te hon. Gehrai: <a href="#/object-storage">Object storage</a>, <a href="#/latency-throughput">Latency aur throughput</a>.` },

    { type: 'h2', text: 'Danda 2: Multipart + resumable upload' },
    { type: 'p', html: `<strong>Kahani:</strong> Kabir train mein 4G (10 Mbps) pe 1 GB ka vlog upload kar raha hai. Ek pre-signed PUT, ek lambi request. 80% pe train tunnel mein gayi, network toota. Ek single PUT aadha nahi bachta: <strong>zero se dobara</strong>. ~11 minute ka kaam barbaad, aur dobara toota to phir se. Mobile uploads mein ye roz ki baat hai.` },
    { type: 'callout', tone: 'term', title: 'Multipart upload', html: `<strong>Ye kya hai:</strong> badi file ko tukdon (parts) mein kaat ke bhejna. Har part ka apna pre-signed URL, parts parallel bhi ja sakte hain, aur aakhir mein ek "complete" call S3 ko bolti hai: "in parts ko jod ke ek object bana do".<br><strong>Kyun chahiye:</strong> network toota to sirf adhoora part dobara jaata hai, poori file nahi. Parallel parts se tez bhi.<br><strong>Iske bina:</strong> har toot-ne pe zero se.<br><strong>S3 ke numbers:</strong> ek single PUT max 5 GB. Multipart: part 5 MiB se 5 GiB (aakhri part chhota ho sakta hai), max 10,000 parts, object max ~50 TB. AWS ~100 MB se upar multipart ki salah deta hai.` },
    { type: 'callout', tone: 'term', title: 'Resumable upload', html: `<strong>Ye kya hai:</strong> upload jo ruk ke baad mein wahin se chal sake: app yaad rakhti hai ki kaunse parts pahunch gaye (ya server se poochh leti hai), aur baaki bhejti hai. Google Cloud Storage ka "resumable upload" aur open protocol <strong>tus</strong> yahi karte hain; S3 mein ye multipart + "kaunse parts aaye" (ListParts) se banta hai.<br><strong>Kyun chahiye:</strong> app band ho gayi, phone restart hua, kal subah WiFi pe baaki upload.<br><strong>Iske bina:</strong> lamba upload = jua.<br><strong>Dhyaan:</strong> adhoore multipart uploads ke parts S3 mein jagah (aur paisa) lete rehte hain. Lifecycle rule se kuch din baad unhe apne aap abort karwao.` },
    { type: 'p', html: `Khud dekho: network kis pal toote, aur single PUT vs multipart mein kitna dobara bhejna pada.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>File</label><select class="mp-s"><option value="100">100 MB short video</option><option value="1024" selected>1 GB vlog</option><option value="4096">4 GB lecture</option></select></div>
          <div><label>Network</label><select class="mp-n"><option value="2">Kamzor 3G, 2 Mbps</option><option value="10" selected>4G, 10 Mbps</option><option value="50">WiFi, 50 Mbps</option></select></div>
          <div><label>Part size</label><select class="mp-p"><option value="8">8 MB</option><option value="16" selected>16 MB</option><option value="64">64 MB</option></select></div>
          <div><label>Ek saath kitne parts: <strong class="mp-kv"></strong></label><input class="mp-k" type="range" min="1" max="8" step="1" value="4"></div>
          <div><label>Network kab toota: <strong class="mp-dv"></strong></label><input class="mp-d" type="range" min="10" max="95" step="5" value="80"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Single PUT: kul bheja</span><strong class="mp-sb"></strong></div>
          <div class="stat"><span>Single PUT: kul time</span><strong class="mp-st"></strong></div>
          <div class="stat"><span>Multipart: parts</span><strong class="mp-pc"></strong></div>
          <div class="stat"><span>Multipart: kul bheja</span><strong class="mp-mb"></strong></div>
          <div class="stat"><span>Multipart: kul time</span><strong class="mp-mt"></strong></div>
        </div>
        <div class="calc-note mp-note"></div>
        <div class="calc-note" style="font-size:13px;color:var(--ink-3)">Model: network hi rukawat hai (1 MB = 8 Mb). Toot-te waqt jo parts raaste mein the, wo aadhe bheje maane; sirf wahi dobara jaate hain. Network ek hi baar toot-ta hai.</div>`;
      const $ = q => el.querySelector(q);
      const f = n => Math.round(n).toLocaleString('en-IN');
      const t = x => x < 90 ? Math.round(x) + ' s' : (x / 60).toFixed(1) + ' min';
      const upd = () => {
        const S = +$('.mp-s').value, N = +$('.mp-n').value, P = +$('.mp-p').value, k = +$('.mp-k').value, d = +$('.mp-d').value / 100;
        $('.mp-kv').textContent = k; $('.mp-dv').textContent = Math.round(d * 100) + '% pe';
        const sentS = S * (1 + d), timeS = sentS * 8 / N;          // single PUT: d tak bheja, phir zero se poora
        const parts = Math.ceil(S / P);
        const lost = Math.min(S * d, k * P / 2);                    // raaste wale parts aadhe bheje the
        const sentM = S + lost, timeM = sentM * 8 / N;
        $('.mp-sb').textContent = f(sentS) + ' MB'; $('.mp-st').textContent = t(timeS);
        $('.mp-pc').textContent = f(parts); $('.mp-mb').textContent = f(sentM) + ' MB'; $('.mp-mt').textContent = t(timeM);
        $('.mp-sb').style.color = 'var(--red)'; $('.mp-mb').style.color = 'var(--green)';
        $('.mp-note').innerHTML = `Single PUT ne ${f(S * d)} MB bheja, network toota, aur <strong>poori ${f(S)} MB phir se</strong>. Multipart ne sirf raaste wale ${k} parts ka ~${f(lost)} MB dobara bheja. Bachat: <strong>${t(timeS - timeM)}</strong>. Parts zyada parallel = toot-ne pe zyada dobara, lekin achhe network pe tez upload.`;
      };
      el.querySelectorAll('select,input').forEach(x => x.addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'tip', title: 'Yahin ruk jao agar...', html: `...ab tumhare uploads bade aur toot-ne layak dono hain, aur ye danda unhe sambhaal leta hai. Agar upload ke baad file ko jaisa hai waisa hi rakhna hai (backup, document vault), to yahin bas. Upar tab jao jab file pe kaam karna hai (scan, thumbnail, video qualities). Gehrai: <a href="#/object-storage">Object storage (multipart, chunk hashing)</a>.` },
    { type: 'h2', text: 'Danda 3: post-upload processing pipeline' },
    { type: 'p', html: `<strong>Kahani:</strong> Kabir ka 1 GB vlog S3 mein aa gaya. Lekin abhi wo kisi ke kaam ka nahi: original 1 GB file ek hi badi quality mein hai, slow phone/network pe nahi chalegi, thumbnail nahi hai, aur kya pata andar virus ho. xyz.com pe peak pe ~2,000 uploads/minute aate hain, har ek ko scan, thumbnail aur 4 qualities chahiye.` },
    { type: 'p', html: `Upload ke baad ka kaam lamba hai (1 GB video ka transcode minutes leta hai) aur fail ho sakta hai. Isliye ye kabhi upload request ke andar nahi hota. Pattern: <strong>storage event → queue → workers</strong>. Ye <a href="#/queues">queues</a> wala hi idea hai, bas trigger S3 khud deta hai.` },
    { type: 'callout', tone: 'term', title: 'Storage event (S3 Event Notifications)', html: `<strong>Ye kya hai:</strong> bucket mein kuch hua (object bana, delete hua) to S3 apne aap ek chhota JSON message bhejta hai: kaunsa bucket, kaunsi key, kitna size. AWS docs ke mutabik ye SNS topic, SQS queue, Lambda function ya EventBridge ko ja sakta hai. GCS aur Azure Blob mein bhi aisi hi event notifications hain.<br><strong>Kyun chahiye:</strong> client ke "upload ho gaya" pe bharosa nahi kar sakte (app band ho sakti hai, jhooth bol sakti hai). Storage khud batata hai ki file sach mein aa gayi.<br><strong>Iske bina:</strong> ya to har minute bucket ko scan karo, ya client ke bharose raho.<br><strong>Dhyaan:</strong> event <strong>at-least-once</strong> hai (kabhi do baar aa sakta hai) aur aam taur pe seconds mein, kabhi minute+ mein aata hai.` },
    { type: 'h3', text: 'Status ek state machine hai' },
    { type: 'table', head: ['Status', 'Matlab', 'UI kya dikhaye', 'Kaun badalta hai'], rows: [
      ['PENDING', 'URL diya, bytes abhi nahi aaye', 'Kuch nahi (ya "uploading 40%" sirf uploader ko)', 'API server'],
      ['UPLOADED', 'S3 mein poori file hai', '"Processing..."', 'Worker (S3 event pe)'],
      ['PROCESSING', 'Scan / thumbnail / transcode chal raha', '"Processing..." + progress', 'Worker'],
      ['READY', 'Saare outputs bane, publish', 'Feed mein, play button', 'Worker'],
      ['REJECTED', 'Virus, galat type, policy violation', 'Saaf error message', 'Worker'],
      ['FAILED', 'Retries khatam, DLQ mein', '"Kuch gadbad hui, dobara try karo"', 'Worker / DLQ handler'],
    ], caption: 'Ek cleanup job purani PENDING rows hataata hai (upload kabhi aaya hi nahi). Status sirf aage badhta hai: duplicate event aaye to READY wapas PROCESSING nahi hona chahiye.' },
    { type: 'h3', text: 'Ek event, kai kaam: fan-out' },
    { type: 'p', html: `Thumbnail 2 second ka kaam hai, transcode 5 minute ka, moderation (AI se nudity/violence check) ek alag team ka. Sab ek hi worker mein daale to ek ka bug sabko rokta hai. Behtar: S3 event ek <strong>topic</strong> pe (pub/sub ka "notice board": SNS ya Kafka, jahan se kai queues ko copy jaati hai), aur har kaam ki apni queue aur apne workers. Ise <strong>fan-out</strong> kehte hain. Har queue apni speed se, apne retries ke saath.` },
    { type: 'ascii', text: `
                         ┌──> thumbnail queue ──> thumb workers (fast, 2 s)
S3 ObjectCreated ──> topic ──> transcode queue ──> transcode workers (slow, GPU/CPU heavy)
                         └──> moderation queue ──> moderation service
                                     │
             sab ka result ──> metadata DB; jab saare zaroori kaam done → READY` },
    { type: 'callout', tone: 'term', title: 'Transcoding aur adaptive bitrate', html: `<strong>Ye kya hai:</strong> <strong>transcoding</strong> = uploaded video ko doosre formats/qualities mein badalna (jaise 1080p, 720p, 480p, 240p). <strong>Adaptive bitrate streaming</strong> (HLS ya DASH) = har quality ko chhote segments (kuch seconds ke tukde) mein kaatna, aur ek playlist file jo batati hai kaunse segments hain. Player network dekh ke har segment ke liye quality chunta hai: tunnel mein 240p, WiFi pe 1080p.<br><strong>Kyun chahiye:</strong> ek hi badi original file har phone aur har network pe nahi chalegi.<br><strong>Iske bina:</strong> slow network pe buffering hi buffering, aur data ki barbaadi.` },
    { type: 'p', html: `<strong>Transcode tez kaise?</strong> Video ko 10-10 second ke tukdon mein kaato, har tukda alag worker pe, phir jod do. Simulator mein 1 GB video ke liye 10 workers pe ~3.5 minute, 50 workers pe ~1 minute laga: yahi parallelism hai. Keemat: zyada machines, aur tukdon ke joints pe dhyaan (har tukda keyframe se shuru hona chahiye).` },
    { type: 'callout', tone: 'warn', title: 'Infinite loop ka khatra', html: `Agar worker output usi bucket/prefix mein likhe jis pe trigger laga hai, to har output ek naya event banata hai, jo phir worker chalata hai... AWS docs khud is execution loop ki warning dete hain. Fix: raw aur processed ke liye alag bucket, ya trigger sirf <code>incoming/</code> prefix pe.` },
    { type: 'callout', tone: 'tip', title: 'Yahin ruk jao agar...', html: `...files unique hain (har user apni alag cheez upload karta hai: documents, private backups) aur zyadatar sirf owner hi padhta hai. Pipeline + status + idempotent workers kaafi hain. Upar tab jao jab same file baar baar aaye (danda 4) ya ek file ko bahut log dekhein (danda 5). Gehrai: <a href="#/queues">Message queues</a>, <a href="#/pattern-long-tasks">Long-running tasks</a>, <a href="#/pattern-multistep">Multi-step processes</a>.` },

    { type: 'h2', text: 'Danda 4: Dedupe: same bytes, ek copy' },
    { type: 'callout', tone: 'term', title: 'Content hash (SHA-256) aur reference count', html: `<strong>Ye kya hai:</strong> content hash = file ke saare bytes se nikla ek chhota "fingerprint" (SHA-256: 64 hex characters). Same bytes = same hash; ek bhi byte badla to bilkul alag hash. Reference count = blob ke saath ek number: kitni user files is blob ko point karti hain.<br><strong>Kyun chahiye:</strong> upload se pehle hash bhejo; DB mein mil gaya to bytes bhejne ki zaroorat hi nahi. Ref count se pata chalta hai blob kab sach mein hata sakte hain.<br><strong>Iske bina:</strong> ya to har copy alag (storage barbaad), ya ek user ka delete sabki file uda de.` },
    { type: 'p', html: `<strong>Kahani:</strong> ek viral meme (2 MB) ek din mein 10,000 log xyz.com pe upload/forward karte hain. Bina dedupe ke: 20 GB storage, 20 GB upload traffic, 10,000 baar scan aur thumbnail. Ek hi bytes ke liye! Object storage lesson mein chunk-level dedupe dekha (Dropbox style). Pattern level pe sabse simple version: <strong>poori file ka hash</strong> upload se pehle. Hash mila to "instant upload". Lekin ek nayi problem aati hai: <strong>delete</strong>. Riya ne meme delete kiya. Kya blob hata dein? Nahi! 10,000 aur log usi blob ki taraf point kar rahe hain. Isliye har blob ke saath <strong>reference count</strong> rakhte hain: kitni files is blob ko use kar rahi hain. Count 0 pe hi blob hatao. Khud karke dekho:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px">
          <button type="button" class="btn small" data-a="up:A">Riya: meme.jpg upload</button>
          <button type="button" class="btn small" data-a="up:B">Aman: wahi meme upload</button>
          <button type="button" class="btn small" data-a="up:C">Zoya: wahi meme upload</button>
          <button type="button" class="btn small" data-a="new:C">Zoya: apni nayi photo</button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
          <button type="button" class="btn small ghost" data-a="del:A">Riya delete</button>
          <button type="button" class="btn small ghost" data-a="del:B">Aman delete</button>
          <button type="button" class="btn small ghost" data-a="del:C">Zoya: meme delete</button>
          <button type="button" class="btn small ghost" data-a="reset">Reset</button>
        </div>
        <div class="stats">
          <div class="stat"><span>Files (users ko dikhti)</span><strong class="pbF"></strong></div>
          <div class="stat"><span>Blobs (S3 mein asli copies)</span><strong class="pbB"></strong></div>
          <div class="stat"><span>Meme blob ka ref_count</span><strong class="pbR"></strong></div>
          <div class="stat"><span>Bytes upload hue</span><strong class="pbU"></strong></div>
        </div>
        <div class="calc-note pbLog"></div>`;
      const BL = { meme: 2, photo: 3 }; // MB
      let files, refs, sent, log;
      const reset = () => { files = {}; refs = {}; sent = 0; log = 'Shuru: kuch nahi.'; draw(); };
      const draw = () => {
        el.querySelector('.pbF').textContent = Object.keys(files).length;
        el.querySelector('.pbB').textContent = Object.keys(refs).length;
        el.querySelector('.pbR').textContent = refs.meme || 0;
        el.querySelector('.pbU').textContent = sent + ' MB';
        el.querySelector('.pbLog').textContent = log;
      };
      el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
        const [a, u] = b.dataset.a.split(':');
        if (a === 'reset') return reset();
        const blob = a === 'new' ? 'photo' : 'meme', key = u + ':' + blob;
        if (a === 'up' || a === 'new') {
          if (files[key]) { log = 'Ye file is user ke paas pehle se hai.'; return draw(); }
          files[key] = blob;
          if (refs[blob]) { refs[blob]++; log = `Hash mila: instant upload, 0 bytes gaye. ref_count = ${refs[blob]}.`; }
          else { refs[blob] = 1; sent += BL[blob]; log = `Naya hash: ${BL[blob]} MB S3 mein gaye. ref_count = 1.`; }
        } else {
          if (!files[key]) { log = 'Is user ke paas ye file hai hi nahi.'; return draw(); }
          delete files[key]; refs.meme--;
          if (refs.meme === 0) { delete refs.meme; log = 'ref_count 0 hua: ab hi blob S3 se hataya (aksar thodi der baad, ek garbage-collection job se).'; }
          else log = `Sirf file row hati. Blob zinda hai, kyunki ref_count = ${refs.meme}.`;
        }
        draw();
      });
      reset();
    }},
    { type: 'callout', tone: 'mistake', title: 'Dedupe ke saath delete', html: `Beginner aksar "file delete = S3 object delete" likh dete hain. Dedupe ke baad ye bug hai: ek user ka delete doosre 10,000 users ki file uda dega. File (user ka record) aur blob (bytes) alag cheezein hain. Ref count ko update karna atomic hona chahiye (DB transaction), aur asli blob hatana ek alag, dheere chalne wala garbage-collection kaam ho, taaki race mein (ek delete kar raha, doosra usi waqt same hash upload) data na ude.` },
    { type: 'callout', tone: 'tip', title: 'Yahin ruk jao agar...', html: `...ab duplicate uploads ka kharcha bach gaya. Agar files private hain aur sirf owner padhta hai (backups), to upar ka danda (CDN) zaroori nahi. Dhyaan: cross-user dedupe se ek privacy khatra aata hai (koi check kar sakta hai ki "ye file kisi ke paas hai kya"), isliye kai systems sirf ek hi user ke andar dedupe karte hain. Gehrai: <a href="#/object-storage">Object storage (dedupe)</a>.` },

    { type: 'h2', text: 'Danda 5: delivery, CDN se' },
    { type: 'p', html: `<strong>Kahani:</strong> Kabir ka vlog trending mein aa gaya: ek din mein 10 lakh views, har view ~200 MB dekhta hai. Matlab ek din mein ~200 TB data, Delhi se Chennai tak ke viewers ko. Sab S3 (ek region, Mumbai) se aaye to S3 ka bill bhi, door ke viewers ki buffering bhi. Upload ek baar hota hai, download lakhon baar. Isliye delivery ka raasta hamesha <a href="#/cdn">CDN</a> (Content Delivery Network: duniya bhar mein faile cache servers, jinhe edge kehte hain) se: bytes user ke shehar ke paas ke edge server se aate hain, S3 pe bojh kam, aur latency kam. Blobs ke liye teen extra baatein:` },
    { type: 'list', items: [
      `<strong>Private content bhi CDN se.</strong> Pre-signed S3 URL dene se CDN ka faayda chala jaata hai. Iski jagah CDN khud signed URLs ya signed cookies support karte hain (CloudFront mein dono hain): signed URL ek file ke liye, signed cookie bahut saari files ke liye (jaise ek video ke saare HLS segments). Aur bucket ko lock karo taaki sirf CDN hi S3 se padh sake (CloudFront mein isko Origin Access Control kehte hain). Warna log CDN ko bypass karke seedha bucket maar denge.`,
      `<strong>Range requests.</strong> Video ke beech mein seek kiya? Player <code>Range: bytes=...</code> header se sirf woh hissa maangta hai. Segments (HLS/DASH) ke saath ye aur aasaan: har segment ek chhoti, alag cache hone wali file.`,
      `<strong>Har size ka alag version.</strong> Feed mein 200 px thumbnail, full screen pe 1080 px. Mobile pe 4 MB ki original photo bhejna data aur battery dono ki barbaadi. Ye versions pipeline mein hi ban jaate hain (ya CDN pe on-the-fly resize, phir cache).`,
    ]},
    { type: 'p', html: `Khud dekho CDN kitna bojh S3 (origin) se hata deta hai. <strong>Hit ratio</strong> = kitne percent requests edge pe hi mil gayin (origin tak nahi gayin).` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Views per din: <strong class="cd-vv"></strong></label><input class="cd-v" type="range" min="0" max="6" step="1" value="4"></div>
          <div><label>Har view kitna data</label><select class="cd-m"><option value="20">20 MB (short clip)</option><option value="200" selected>200 MB (vlog, 720p)</option><option value="1000">1 GB (lamba 1080p)</option></select></div>
          <div><label>CDN hit ratio: <strong class="cd-hv"></strong></label><input class="cd-h" type="range" min="50" max="99" step="1" value="95"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Kul data per din</span><strong class="cd-tot"></strong></div>
          <div class="stat"><span>Bina CDN: S3 se</span><strong class="cd-no"></strong></div>
          <div class="stat"><span>CDN ke saath: S3 se</span><strong class="cd-yes"></strong></div>
          <div class="stat"><span>S3 pe bojh kitna kam</span><strong class="cd-x"></strong></div>
        </div>
        <div class="calc-note cd-note"></div>`;
      const V = [1000, 10000, 100000, 500000, 1000000, 5000000, 10000000];
      const $ = q => el.querySelector(q);
      const f = n => Math.round(n).toLocaleString('en-IN');
      const tb = mb => mb >= 1e6 ? (mb / 1e6).toFixed(1) + ' TB' : mb >= 1000 ? (mb / 1000).toFixed(1) + ' GB' : f(mb) + ' MB';
      const upd = () => {
        const v = V[+$('.cd-v').value], m = +$('.cd-m').value, h = +$('.cd-h').value / 100;
        $('.cd-vv').textContent = f(v); $('.cd-hv').textContent = Math.round(h * 100) + '%';
        const tot = v * m, origin = tot * (1 - h);
        $('.cd-tot').textContent = tb(tot); $('.cd-no').textContent = tb(tot); $('.cd-yes').textContent = tb(origin);
        $('.cd-x').textContent = Math.round(1 / (1 - h)) + 'x';
        $('.cd-note').innerHTML = `${f(v)} views × ${f(m)} MB = ${tb(tot)} ek din mein. CDN ${Math.round(h * 100)}% requests edge pe hi nipta deta hai, to S3 tak sirf ${tb(origin)} jaata hai (${Math.round(1 / (1 - h))} guna kam). Aur viewers ko bytes apne shehar ke paas se milte hain. Hit ratio 95% se 99% karna S3 ka bojh 5 guna aur ghata deta hai: isliye popular cheezon pe hit ratio sabse zaroori number hai.`;
      };
      el.querySelectorAll('select,input').forEach(x => x.addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'tip', title: 'Yahin ruk jao (seedhi poori)', html: `CDN ke baad blobs ki seedhi poori. Isse aage sirf tuning hai: multi-CDN, origin shield (CDN aur S3 ke beech ek aur cache layer), on-the-fly image resize, aur storage classes (purani, kam dekhi files ko sasti storage mein bhejna). Agar files private hain aur sirf ek-do log padhte hain, to CDN bhi zaroori nahi. Gehrai: <a href="#/cdn">CDN</a>, <a href="#/design-youtube">YouTube design</a>, <a href="#/design-drive">Google Drive design</a>.` },
    { type: 'h2', text: 'Poora pattern, chala ke dekho' },
    { type: 'p', html: `Ab paanchon dande ek diagram mein chala ke dekho: upload, processing, delivery, dedupe aur failures. Har box pe click karke uska kaam padho.` },
    { type: 'flow', height: 380,
      nodes: [
        { id: 'c', label: 'Mobile app', sub: 'Riya ka phone', x: 80, y: 190, w: 130, kind: 'client', info: 'Ye kya hai: xyz.com ki app, Riya ke phone pe. Uploader bhi yahi, viewer bhi yahi. Upload se pehle file ka SHA-256 hash nikaal leta hai (dedupe ke liye), phir sirf permission maangta hai. Bytes seedhe S3 jaate hain.' },
        { id: 'cdn', label: 'CDN', sub: 'edge servers', x: 80, y: 320, w: 130, kind: 'edge', info: 'Ye kya hai: CDN ke edge servers (shehar ke paas ke cache). Viewers ko video/photo yahin se milte hain. Pehli request pe S3 (origin) se laata hai, phir cache karta hai. Private content ke liye CDN ke apne signed URLs ya signed cookies lagte hain.' },
        { id: 'api', label: 'API server', sub: 'sirf permission', x: 260, y: 60, w: 140, kind: 'server', info: 'Ye kya hai: xyz.com ka app/API server, jo sirf permission deta hai. Login, size/type limits, quota check. Metadata DB mein row banata hai, pre-signed (multipart) URLs deta hai. Bytes isse kabhi nahi guzarte.' },
        { id: 'db', label: 'Metadata DB', sub: 'status, hash', x: 260, y: 320, w: 140, kind: 'data', info: 'Ye kya hai: files ka metadata database. Har file ki row: id, owner, s3 key, size, sha256, status (PENDING / UPLOADED / PROCESSING / READY / REJECTED), aur dedupe ke liye ref_count. UI isi status ko dekh ke kaam karta hai.' },
        { id: 's3', label: 'S3 bucket', sub: 'raw + processed', x: 440, y: 190, w: 140, kind: 'data', info: 'Ye kya hai: object storage, jahan asli bytes rehte hain. Raw uploads ek "incoming/" jagah (alag bucket ya prefix) mein aate hain. Processing ke outputs (thumbnails, 360p/720p/1080p) alag prefix mein. Alag rakhna zaroori: warna output likhne pe phir event aayega aur loop ban sakta hai.' },
        { id: 'q', label: 'Queue', sub: 'upload events', x: 620, y: 60, w: 140, kind: 'queue', info: 'Ye kya hai: message queue jisme storage ke events line mein rukte hain. S3 ka ObjectCreated event yahan. S3 docs: event aam taur pe seconds mein, kabhi minute ya zyada, aur at-least-once (duplicate aa sakta hai). Isliye workers idempotent hone chahiye.' },
        { id: 'w', label: 'Workers', sub: 'scan, transcode', x: 620, y: 320, w: 140, kind: 'server', info: 'Ye kya hai: processing machines. Queue se kaam uthate hain: file type check, virus scan, thumbnails, transcoding. Har step idempotent: same input pe same output key, dobara chale to bhi nuksaan nahi. Fail ho to retry, baar baar fail ho to DLQ.' },
      ],
      edges: [{ a: 'c', b: 'api' }, { a: 'c', b: 's3' }, { a: 'c', b: 'cdn' }, { a: 'cdn', b: 's3' }, { a: 'api', b: 'db' }, { a: 's3', b: 'q' }, { a: 'q', b: 'w' }, { a: 'w', b: 'db' }, { a: 'w', b: 's3' }],
      scenarios: [
        { name: 'Upload + processing', steps: [
          { title: 'Permission maango', text: 'App file ka size, type aur SHA-256 hash bhejti hai. Bytes nahi.', go: 'c>api', msg: 'POST /uploads  { "size": 104857600, "type": "video/mp4", "sha256": "9f2c..." }' },
          { title: 'PENDING row + URLs', text: 'Hash DB mein nahi mila (nayi file). Row bani, aur 100 MB ke liye multipart ke part URLs sign hue.', go: ['api>db', 'res:db>api', 'res:api>c'], after: { db: { sub: 'v91: PENDING' } }, msg: '{ "uploadId": "...", "parts": [ "https://...partNumber=1&X-Amz-Signature=...", ... ] }' },
          { title: 'Parts seedhe S3 mein', text: 'Parts parallel jaate hain. Network toote to sirf adhoora part dobara (<a href="#/object-storage">object storage</a> lesson). Complete call ke baad S3 mein ek object.', go: 'c>s3', after: { s3: { sub: 'incoming/v91 saved' } } },
          { title: 'S3 khud batata hai', text: 'Client ke "ho gaya" pe bharosa nahi. S3 ka event queue mein.', go: 'evt:s3>q', msg: 'ObjectCreated:CompleteMultipartUpload  key=incoming/v91' },
          { title: 'Worker uthata hai', text: 'Status PROCESSING. Pehle sasta check: file ke pehle bytes ("magic bytes") sach mein MP4 ke hain ya naam badla hua .exe?', go: ['q>w', 'w>db'], after: { db: { sub: 'v91: PROCESSING' }, w: { state: 'ok', sub: 'processing...' } } },
          { title: 'Outputs likho', text: 'Virus scan saaf. Thumbnail aur 4 qualities bane, alag prefix mein likhe.', go: ['w>s3', 'res:s3>w', 'w>s3'], after: { s3: { sub: 'processed/v91/*' } }, msg: 'PUT processed/v91/thumb.jpg\nPUT processed/v91/720p/seg_0001.ts ...' },
          { title: 'READY', text: 'Ab hi video feed mein dikhega. User ko notification.', go: 'w>db', after: { db: { state: 'ok', sub: 'v91: READY' }, w: { state: '', sub: 'idle' } } },
        ]},
        { name: 'Dekhna (CDN)', steps: [
          { title: 'Video maango', text: 'API permission check karta hai (public? friends-only?) aur CDN ka URL deta hai. Private video ho to CDN ka signed URL/cookie, chhoti expiry ke saath.', go: ['c>api', 'api>db', 'res:db>api', 'res:api>c'], msg: '{ "playlist": "https://cdn.xyz.com/v91/master.m3u8?Expires=...&Signature=..." }' },
          { title: 'Pehla viewer: CDN miss', text: 'Edge ke paas nahi hai, wo S3 (origin) se laata hai aur rakh leta hai.', go: ['c>cdn', 'cdn>s3', 'res:s3>cdn', 'res:cdn>c'], after: { cdn: { state: 'miss', sub: 'MISS → cached' } } },
          { title: 'Baaki lakhon viewers: HIT', text: 'S3 aur API dono ko pata bhi nahi chalta. Video chhote segments mein hai, to har segment alag se cache hota hai, aur seek karna sasta.', go: ['c>cdn', 'res:cdn>c'], set: { s3: { state: 'dim' }, api: { state: 'dim' } }, after: { cdn: { state: 'hit', sub: 'HIT' } } },
        ]},
        { name: 'Virus mila', steps: [
          { title: 'Upload normal', text: 'Kisi ne "cricket_highlights.mp4" upload ki.', go: ['c>api', 'res:api>c', 'c>s3', 'evt:s3>q', 'q>w'] },
          { title: 'Check fail', text: 'Magic bytes MP4 ke nahi, aur scanner ne malware pakda. Isliye raw uploads ko kabhi seedha CDN/public pe nahi daalte: pehle scan, phir publish.', focus: ['w'], set: { w: { state: 'warn', sub: 'INFECTED' } } },
          { title: 'Quarantine + REJECTED', text: 'File incoming se hata ke quarantine mein (ya delete), row REJECTED, user ko saaf message. Kisi viewer tak ek byte nahi pahuncha.', go: ['w>s3', 'w>db'], after: { s3: { state: 'warn', sub: 'quarantine/v92' }, db: { state: 'warn', sub: 'v92: REJECTED' } } },
        ]},
        { name: 'Worker crash', steps: [
          { title: 'Transcode beech mein', text: 'Worker ne message uthaya, 1 GB video ka transcode chal raha hai.', go: 'q>w', after: { w: { state: 'ok', sub: 'transcode 60%' } } },
          { title: 'Worker mar gaya', text: 'Machine crash. Message ka ack (delete) nahi hua tha.', go: 'lost:w>s3', set: { w: { state: 'down', sub: 'CRASH' } } },
          { title: 'Message wapas aata hai', text: 'Queue ka visibility timeout khatam, message phir dikhne laga. Naya worker uthata hai. Output keys same hain (processed/v91/720p/...), to adhoore files overwrite ho jaati hain: koi duplicate kachra nahi. Yahi <strong>idempotency</strong> hai.', go: ['evt:q>w', 'w>s3', 'w>db'], after: { w: { state: '', sub: 'retry: OK' }, db: { sub: 'v91: READY' } } },
          { title: 'Agar baar baar fail?', text: 'Kharab file har baar worker ko gira de (poison message) to 3-5 tries ke baad DLQ mein, status FAILED, aur alert. Warna wo queue ko hamesha jaam rakhegi (<a href="#/queues">queues</a> lesson).', focus: ['q'] },
        ]},
        { name: 'Same file dobara', intro: 'Ek viral meme 10,000 log forward kar rahe hain.', steps: [
          { title: 'Hash pehle', text: 'App ne file ka SHA-256 bheja.', go: 'c>api', msg: 'POST /uploads  { "sha256": "4be1...", "size": 2097152 }' },
          { title: 'DB: ye hash pehle se hai', text: 'Same bytes pehle aa chuke. Naya blob nahi banega, bas ek nayi "file" row jo usi blob ki taraf point kare, aur ref_count + 1.', go: ['api>db', 'res:db>api'], after: { db: { state: 'hit', sub: 'blob 4be1: refs 10,001' } } },
          { title: 'Instant upload', text: 'User ko turant "ho gaya". Ek byte network pe nahi gaya, S3 mein ek hi copy. (Cross-user dedupe ke security pehlu ke liye object storage lesson dekho.)', go: 'res:api>c', set: { s3: { state: 'dim' } } },
        ]},
      ],
    },

    { type: 'compare',
      left: { title: 'Galat pattern', html: `• Upload app server ke through<br>• Ek hi PUT, 2 GB, toota to zero se<br>• Upload request ke andar hi transcode<br>• Client ke "done" pe status READY<br>• Raw file seedhe public URL pe<br>• Delete = S3 object delete<br>• Download seedha S3 se` },
      right: { title: 'Sahi pattern', html: `• Pre-signed URL, seedha storage<br>• Multipart / resumable chunks<br>• Storage event → queue → workers<br>• S3 event + worker se status badle<br>• Pehle scan, phir publish (alag prefix)<br>• Ref count, GC job blob hataaye<br>• CDN + signed URL/cookie` },
    },

    { type: 'callout', tone: 'tip', title: 'Decide', html: `Kuch MB se badi file dikhte hi ye pattern lagao, seedhi ke hisaab se:<br>• Kuch KB ki files → seedha API (danda 0).<br>• Kuch MB se badi → <strong>pre-signed URL se seedha object storage mein upload</strong> (danda 1), DB mein sirf metadata aur status.<br>• ~100 MB+ ya mobile network → <strong>multipart, resumable</strong> (danda 2).<br>• File pe kaam karna hai → upload ke baad <strong>storage event → queue → workers</strong> se scan/thumbnail/transcode (danda 3).<br>• Same files baar baar → <strong>content hash se dedupe</strong> + ref count (danda 4).<br>• Bahut viewers → download hamesha <strong>CDN</strong> se, signed URL/cookie ke saath (danda 5).<br>App server ka kaam sirf permission dena hai; bytes kabhi uske paas se na guzrein.` },
    { type: 'p', html: `Kab <strong>nahi</strong>? Bahut chhoti files (kuch KB: avatar ka ek chhota JSON, chat ka text) ke liye ye sab overkill hai; normal API request theek hai. Aur agar server ko bytes pe turant kuch karna hi hai (jaise upload pe hi encryption with user ki key), tab bhi aksar pehle storage mein daal ke worker se karte hain, request ke andar nahi.` },

    { type: 'h2', text: 'Poori picture' },
    { type: 'diagram', title: 'xyz.com pe badi files: poori picture', height: 560,
      nodes: [
        { id: 'app', label: 'Mobile app', sub: 'hash + parts', x: 80, y: 70, kind: 'client', info: 'Ye kya hai: uploader ki app. Pehle file ka SHA-256 hash bhejti hai (dedupe), phir pre-signed URLs pe parts seedhe S3 ko. Network toota to sirf bacha hua part.' },
        { id: 'api', label: 'API server', sub: 'sirf permission', x: 320, y: 70, kind: 'server', info: 'Ye kya hai: xyz.com ka app server. Login, size/type limit, quota check, metadata row, aur pre-signed (multipart) URLs. Bytes kabhi isse nahi guzarte (danda 1).' },
        { id: 'db', label: 'Metadata DB', sub: 'status, hash, refs', x: 550, y: 70, w: 150, kind: 'data', info: 'Ye kya hai: har file ki row: key, owner, size, sha256, status (PENDING → UPLOADED → PROCESSING → READY), aur blob ka ref_count (danda 4).' },
        { id: 's3', label: 'S3 bucket', sub: 'incoming / processed', x: 320, y: 220, w: 150, kind: 'data', info: 'Ye kya hai: object storage. Raw uploads incoming/ mein, outputs (thumbnails, 240p-1080p segments) processed/ mein. Alag prefix taaki event loop na bane.' },
        { id: 'topic', label: 'Topic + queues', sub: 'ObjectCreated', x: 550, y: 220, w: 150, kind: 'queue', info: 'Ye kya hai: S3 event pehle topic pe, phir har kaam (thumbnail, transcode, moderation) ki apni queue (fan-out). Event at-least-once, isliye workers idempotent.' },
        { id: 'w', label: 'Workers', sub: 'scan, thumb, transcode', x: 550, y: 370, w: 170, kind: 'server', info: 'Ye kya hai: processing machines (danda 3). Magic bytes check, virus scan, thumbnail, 10-10 second ke tukdon mein parallel transcode. Baar baar fail = DLQ + alert.' },
        { id: 'cdn', label: 'CDN edge', sub: 'signed cookies', x: 80, y: 370, kind: 'edge', info: 'Ye kya hai: shehar ke paas ke cache servers (danda 5). Popular video ka 95%+ yahin se. Private content ke liye signed URL/cookie; bucket sirf CDN ke liye khula.' },
        { id: 'view', label: 'Viewers', sub: '10 lakh / din', x: 80, y: 500, kind: 'client', info: 'Ye kya hai: video dekhne wale. Player network dekh ke har segment ki quality chunta hai (adaptive bitrate), aur seek pe sirf zaroori segment maangta hai.' },
      ],
      edges: [
        { a: 'app', b: 'api', n: 1, label: 'URL' },
        { a: 'api', b: 'db', label: 'PENDING' },
        { a: 'app', b: 's3', n: 2, label: 'parts' },
        { a: 's3', b: 'topic', n: 3, kind: 'evt' },
        { a: 'topic', b: 'w', n: 4, label: 'job' },
        { a: 'w', b: 's3', label: 'outputs' },
        { a: 'w', b: 'db', via: [[690, 370], [690, 70]], label: 'READY' },
        { a: 'cdn', b: 's3', label: 'origin' },
        { a: 'cdn', b: 'view', n: 5, kind: 'res', label: 'video' },
      ],
      paths: [
        { name: 'Upload', text: 'App ne hash + size bheja, API ne PENDING row aur part URLs diye, parts seedhe S3 mein (danda 1-2).', go: ['app>api>db', 'app>s3'] },
        { name: 'Processing', text: 'S3 ka event topic/queue mein, worker ne scan + thumbnail + transcode kiya, outputs processed/ mein, status READY (danda 3).', go: ['s3>topic>w>s3', 'w>db'] },
        { name: 'Dedupe', text: 'Hash DB mein pehle se mila: nayi file row, ref_count + 1, ek byte bhi upload nahi (danda 4).', go: ['app>api>db'] },
        { name: 'Watch', text: 'Viewer CDN edge se segments leta hai; miss pe hi CDN S3 (origin) se laata hai (danda 5).', go: ['view>cdn>s3'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Blob object storage mein, DB mein sirf key + metadata + status.</li>
      <li>Danda 1: pre-signed URL: app server permission deta hai, bytes seedhe storage mein.</li>
      <li>Danda 2: ~100 MB+ ya mobile pe multipart/resumable: toota to sirf adhoora part dobara. S3: part 5 MiB-5 GiB, max 10,000 parts.</li>
      <li>Danda 3: storage event → queue → idempotent workers; "upload hua" aur "READY" alag cheezein.</li>
      <li>Danda 4: content hash se dedupe; delete = ref count ghatao, blob GC job hataaye.</li>
      <li>Danda 5: download CDN se; hit ratio sabse zaroori number; private content ke liye signed URL/cookie.</li>
      <li>Raw aur processed alag prefix/bucket, warna event ka infinite loop.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['App servers pe upload ka bojh lagbhag zero; deploy pe upload nahi toot-te', 'Network toote to sirf adhoora chunk dobara', 'Same file ek hi baar store aur upload (instant upload)', 'Lamba processing user ke request se alag; retries aur DLQ ke saath', 'CDN se tez aur sasti delivery, S3 pe bojh kam'],
      costs: ['Zyada moving parts: bucket policies, events, queues, workers, CDN config', 'Eventual: upload ke baad READY hone mein seconds se minutes', 'Status state machine, cleanup jobs aur idempotency khud sambhalni padti hai', 'Dedupe ke saath delete mushkil (ref count, GC) aur cross-user privacy risk', 'Signed URLs bearer tokens hain: leak hue to expiry tak koi bhi use kar sakta hai'] },

    { type: 'think', questions: [
      { q: 'WhatsApp pe ek photo 50 groups mein forward hui. Server pe kitni copies honi chahiye, aur jab ek group delete kare to kya ho?', a: 'Bytes ki ek hi copy (content hash se). Har message ek reference hai. Ek group delete kare to sirf uska reference hatta hai (ref count ghatta), blob tab tak rehta hai jab tak koi reference bacha hai, ya retention policy khatam na ho. (Ye pattern ka general idea hai; WhatsApp end-to-end encrypted hai, to asli implementation encryption ki wajah se alag ho sakti hai.)' },
      { q: 'Transcode workers 10 se 50 kar diye, lekin READY hone ka time sirf thoda ghata. Kya wajah ho sakti hai?', a: 'Pipeline ka sabse lamba stage ab kuch aur hai: shayad virus scan (file size ke saath badhta hai), S3 event ka delay, ya transcode ke tukde hi kam hain (chhoti video ke 10 tukde 50 workers mein nahi baant sakte). Jo stage critical path pe hai, wahi total time tay karta hai. Parallel stages mein sirf sabse lamba gina jaata hai.' },
      { q: 'S3 event do baar aaya. Worker ne dono baar thumbnail banaya aur DB mein do thumbnail rows likh di. Fix?', a: 'Worker ko idempotent banao: output key file id se tay ho (processed/v91/thumb.jpg), to doosri baar overwrite hoga. DB mein upsert (file_id pe unique) ya "status already READY hai to kuch mat karo" check. At-least-once delivery ke saath har consumer ko duplicates jhelne aane chahiye.' },
    ]},
    { type: 'quiz', questions: [
      { q: '100 MB files, 2,000 uploads/minute, app server ke through. Network 4G se WiFi kar do (5x tez). App fleet ka Gbps kya hoga?', options: ['5x kam', 'Lagbhag same', '5x zyada'], answer: 1, explain: 'Har minute utna hi data aata hai (2,000 × 100 MB), to Gbps same (~26.7). Tez network se har upload jaldi khatam hota hai, to ek saath khule connections kam hote hain, bandwidth nahi.' },
      { q: 'Upload ke baad status READY kaun karta hai?', options: ['Client, upload ka 200 OK milte hi', 'Worker, saare processing steps (scan, thumbnail, transcode) ke baad', 'CDN, pehli request pe'], answer: 1, explain: '200 OK sirf bytes ka pahunchna hai. Scan aur transcode ke baad hi file publish honi chahiye, aur status server-side (S3 event + worker) se badalta hai, client ki baat se nahi.' },
      { q: 'Worker apne outputs usi bucket prefix mein likh raha hai jis pe ObjectCreated trigger laga hai. Kya hoga?', options: ['Kuch nahi', 'Har output naya event banayega: infinite loop aur bill', 'S3 output reject kar dega'], answer: 1, explain: 'AWS docs isi execution loop ki warning dete hain. Raw aur processed ke liye alag bucket ya prefix-filtered trigger rakho.' },
      { q: 'Dedupe ke saath ek user ne file delete ki. Sahi kadam?', options: ['S3 object turant delete', 'File row hatao, ref_count ghatao; 0 hone pe hi (GC job se) blob hatao', 'Kuch mat karo, storage sasta hai'], answer: 1, explain: 'Blob shared hai. Ref count 0 hone tak bytes rehne chahiye; asli delete ek alag GC job karta hai.' },
      { q: 'Private videos CDN se serve karne ka sahi tareeka?', options: ['Bucket public kar do', 'CDN ke signed URLs/cookies + bucket sirf CDN ke liye khula (origin access control)', 'Har viewer ko pre-signed S3 URL, CDN hata do'], answer: 1, explain: 'Signed URL/cookie se sirf allowed viewer, chhoti expiry ke saath. Bucket lock karne se koi CDN bypass nahi kar sakta, aur caching ka faayda bhi bacha rehta hai.' },
      { q: '1 GB video, mobile pe, 80% pe network toota. Multipart (16 MB parts) ke saath kya dobara bhejna padega?', options: ['Poori 1 GB file', 'Sirf wo parts jo toot-te waqt raaste mein the', 'Kuch nahi, S3 khud bhar dega'], answer: 1, explain: 'Pahunch chuke parts S3 ke paas safe hain. App (ya ListParts) se pata chalta hai kaunse aaye; sirf adhoore parts dobara jaate hain. Single PUT mein poori file zero se.' },
    ]},
    { type: 'sources', note: 'Product-specific details inhi official docs se liye; pattern ka general hissa industry practice hai.', items: [
      { title: 'Amazon S3 Event Notifications', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/EventNotifications.html', used: 'Destinations (SNS, SQS, Lambda, EventBridge), at-least-once delivery, typical delivery in seconds, warning about execution loops when writing to the triggering bucket.' },
      { title: 'Serve private content with signed URLs and signed cookies', publisher: 'Amazon CloudFront documentation', official: true, url: 'https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PrivateContent.html', used: 'Signed URLs vs signed cookies for private content, restricting S3 origin so it is reachable only through CloudFront.' },
      { title: 'Uploading and copying objects using multipart upload', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html', used: 'Multipart flow referenced from the object storage lesson (parallel parts, resume, complete).' },
      { title: 'Amazon S3 multipart upload limits', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html', used: 'Part size 5 MiB to 5 GiB (last part can be smaller), max 10,000 parts, max object size 48.8 TiB.' },
      { title: 'Uploading objects', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/upload-objects.html', used: 'Single PUT up to 5 GB, multipart up to 50 TB; multipart recommended for objects of 100 MB or more (from the multipart overview page).' },
      { title: 'Sharing objects with presigned URLs', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html', used: 'Presigned URL expiry: up to 7 days via SDK/CLI with SigV4, 1 min to 12 h from the console.' },
      { title: 'Streaming File Synchronization', publisher: 'Dropbox Tech blog', official: true, year: 2014, url: 'https://dropbox.tech/infrastructure/streaming-file-synchronization', used: 'Hash-before-upload idea (older post); detailed in the object storage lesson.' },
    ]},
  ],
});
