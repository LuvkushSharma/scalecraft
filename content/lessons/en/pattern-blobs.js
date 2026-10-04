Lesson.register({
  id: 'pattern-blobs',
  title: 'Large blobs (files, videos)',
  minutes: 28,
  summary: `Photos, videos, PDFs, backups: big files follow the same pattern everywhere. Upload straight into storage (pre-signed URL, in chunks, resumable), never store the same file twice (content hash), run a pipeline after upload (virus scan, thumbnail, transcoding), and deliver through a CDN. Google Drive, YouTube uploads, WhatsApp media: all are variations of this.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Photos and videos are very big files: one video can be up to 1 GB.<br>If every big file passes through our main server, the server gets crushed under the load.<br>If the mobile network breaks in the middle, the whole 1 GB has to be sent again from zero.<br>In this lesson we climb a ladder: send the file straight to storage, send it in pieces so a break restarts from the same place, prepare the video after upload, never keep the same file twice, and get it to lakhs of people quickly.` },
    { type: 'h2', text: 'The story so far' },
    { type: 'p', html: `xyz.com is now a big video platform. Every day lakhs of people upload photos, short videos, long vlogs and PDFs. In the <a href="#/object-storage">Object storage</a> lesson we learned the building blocks: an S3-like bucket, pre-signed URLs, multipart upload, chunk hashing. In the <a href="#/cdn">CDN</a> lesson we saw how bytes reach viewers all over the world.` },
    { type: 'p', html: `This lesson will not teach those blocks again. The question here is: <strong>whenever a "big file" shows up in a design, what does the whole path look like, and where do things break?</strong> Whether the interview says "design YouTube", "design Google Drive" or "send a photo on WhatsApp", it is the same pattern: 4 stages (upload, store, process, deliver), and 5 steps to build them.` },
    { type: 'callout', tone: 'term', title: 'Blob', html: `<strong>What it is:</strong> a blob (Binary Large OBject) is a big heap of bytes that the database does not need to look inside: a video, a photo, a zip. For the database it is just "some MB/GB of data".<br><strong>Why a separate name:</strong> blobs behave differently from normal data: they are big, written once, read lakhs of times, and take seconds to minutes to send over the network.<br><strong>Without it (blob kept in the DB):</strong> the database swells up, backups take hours, and every query gets slow.` },
    { type: 'callout', tone: 'term', title: 'Object storage + metadata DB', html: `<strong>What it is:</strong> object storage (Amazon S3, Google Cloud Storage, Azure Blob) = a huge, cheap warehouse for files. Each file is an "object" with a name (key), inside a <strong>bucket</strong> (a box, like a folder). Metadata DB = a normal database with one small row per file: key, owner, size, status.<br><strong>Why we need it:</strong> the rule is simple: the blob goes into object storage, and the database only keeps its address (key) and metadata.<br><strong>Without it:</strong> either GBs inside the DB, or files on one server's disk, which disappear when that server dies.` },
    { type: 'ascii', text: `
  1. UPLOAD            2. STORE              3. PROCESS                 4. DELIVER
 ──────────────     ──────────────     ───────────────────────     ──────────────
 phone → straight   S3 bucket           event → queue → workers     CDN edge →
 to S3 (pre-signed, (raw/incoming)      scan, thumbnail,            viewers
 chunks, resume)    + metadata DB       transcode, moderation       (signed URLs)
                    (status, key)       → status READY
       │                  │                     │                         │
  app server only    dedupe: the hash   idempotent workers,        app server never
  gives permission,  keeps one copy     retries, DLQ               touches the bytes
  not the bytes      of the same file` , caption: 'The 4 stages of the large blob pattern. Each stage has a "wrong" version, which we will see below.' },
    { type: 'p', html: `The words above (pre-signed, chunks, event, queue, CDN) may feel new right now. Each step below explains them one by one, with a story.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner mistake: "uploaded = video ready"', html: `"The upload is done" and "the video is ready" are two different things. S3's <code>200 OK</code> only says that the bytes arrived safely. The scan has not run yet, there is no thumbnail, and the 360p/720p versions are not made. That is why apps like YouTube show "Processing..." after an upload. Always keep a <strong>status</strong> in the design (UPLOADED → PROCESSING → READY) and drive the UI from it.` },
    { type: 'h2', text: 'The blob ladder: five steps' },
    { type: 'ascii', caption: 'Read from the bottom up. Add each step only when its problem is real.', text: `  5  CDN delivery           lakhs of viewers, bytes from the edge, signed URL/cookie
     ^  when: many people, far apart, watch the same file
  4  Dedupe (content hash)  the same bytes stored only once, "instant upload"
     ^  when: the same files arrive again and again (memes, forwards)
  3  Processing pipeline    event → queue → workers: scan, thumbnail, transcode
     ^  when: the file needs long work after upload
  2  Multipart + resumable  in pieces, in parallel, restart from the same place
     ^  when: files of ~100 MB+ or a weak network (mobile)
  1  Pre-signed URL         bytes go straight to storage, the app only gives permission
     ^  when: files bigger than a few MB, or many uploads
  0  Through the app server perfectly fine for small files (a few KB)` },
    { type: 'h2', text: 'Step 1: Pre-signed URL (which path should the bytes take?)' },
    { type: 'p', html: `The very first design decision. A new engineer often writes: <code>POST /upload</code>, the file arrives at the app server, and the app server puts it into S3. On a small site this works. But xyz.com has thousands of uploads every minute at peak time. Think about what happens: each upload holds one app server connection for as long as the user\'s network is sending bytes, and every byte travels the network twice (phone → app, app → S3).` },
    { type: 'callout', tone: 'term', title: 'Pre-signed URL', html: `<strong>What it is:</strong> a link that carries our server\'s digital signature: "whoever has this link may PUT only this one file into S3, for the next 15 minutes". The app server creates this link (a few milliseconds of work), and the phone sends the file straight to S3 using that link.<br><strong>Why we need it:</strong> the app server only says "yes or no" (permission); the GBs never pass through it.<br><strong>Without it:</strong> every upload eats an app server connection and bandwidth, and a deploy breaks all the uploads in progress.<br><strong>Example:</strong> in S3, a link made with the SDK/CLI can be valid for at most 7 days; usually we keep it to minutes.` },
    { type: 'p', html: `In the simulator below, pick the file size, the user\'s network and the peak traffic, and compare both paths. Then press "Run the pipeline" below it: it also shows what happens after the upload.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="pbSize">File</label><select id="pbSize"><option value="5">5 MB photo</option><option value="100" selected>100 MB short video</option><option value="1024">1 GB vlog</option><option value="4096">4 GB lecture</option></select></div>
          <div><label for="pbNet">The user's network</label><select id="pbNet"><option value="1">Slow 3G, 1 Mbps</option><option value="10" selected>4G, 10 Mbps</option><option value="50">Home WiFi, 50 Mbps</option><option value="200">Office fibre, 200 Mbps</option></select></div>
          <div><label for="pbU">Peak uploads per minute: <strong class="pbUv"></strong></label><input id="pbU" type="range" min="100" max="20000" step="100" value="2000"></div>
          <div><label for="pbW">Transcode workers: <strong class="pbWv"></strong></label><input id="pbW" type="range" min="1" max="50" step="1" value="10"></div>
        </div>
        <div class="pbCols" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-top:12px"></div>
        <div class="calc-note pbNote"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px"><button type="button" class="btn small primary pbRun">Run the pipeline</button></div>
        <div class="pbPipe" style="display:flex;flex-direction:column;gap:6px;margin-top:10px"></div>
        <div class="calc-note pbPNote"></div>`;
      const $ = c => el.querySelector(c);
      const fmt = n => Math.round(n).toLocaleString('en-IN');
      const dur = s => s < 90 ? Math.round(s) + ' s' : s < 5400 ? (s / 60).toFixed(1) + ' min' : (s / 3600).toFixed(1) + ' hours';
      // Pure maths (the lesson text is based on these numbers)
      const calc = (S, N, U, W) => {
        const userT = S * 8 / N;                 // seconds, on the user's network
        const hop = S * 8 / 1000;                // app → S3, 1 Gbps
        const conc = U / 60 * userT;             // Little's law: ek saath chal rahe uploads
        const gbps = U / 60 * S * 8 / 1000;      // data coming into the app fleet (Gbps); the same goes out
        const servers = Math.max(Math.ceil(gbps / 1), Math.ceil(conc / 1000), 1);
        const tbHour = U * 60 * S / 1e6;         // data through the app in the peak hour (TB), one direction
        const isVideo = S >= 50, vSec = isVideo ? S : 0;   // ~60 MB per minute = ~1 MB per second (1080p)
        const tasks = Math.ceil(vSec / 10) * 4, work = vSec * 0.5 * 4;
        const st = [['S3 event → queue', 2], ['Validate (type, size)', 1], ['Virus scan', 1 + S / 100], ['Thumbnail', 2]];
        const tr = isVideo ? work / Math.min(W, tasks) + 3 : 0;
        if (isVideo) st.push(['Transcode (4 qualities)', tr]);
        st.push(['Status READY, on the CDN', 1]);
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
        $('.pbCols').innerHTML = card('Through the app server', [
          ['The user\'s upload time', dur(r.userT + r.hop)],
          ['Uploads running at the same time', fmt(r.conc)],
          ['App fleet: data coming in', r.gbps.toFixed(1) + ' Gbps'],
          ['App fleet: out to S3', r.gbps.toFixed(1) + ' Gbps'],
          ['Servers just for uploads', fmt(r.servers)],
          ['Uploads broken by a deploy', fmt(r.conc)],
        ], true) + card('Straight to S3 (pre-signed URL)', [
          ['The user\'s upload time', dur(r.userT)],
          ['Uploads running at the same time', fmt(r.conc) + ' (on S3)'],
          ['App fleet: data coming in', '~' + (U / 60).toFixed(0) + ' KB/s'],
          ['App fleet: out to S3', '0'],
          ['Servers just for uploads', '~1 (URL signing)'],
          ['Uploads broken by a deploy', '0'],
        ], false);
        $('.pbNote').textContent = `In the peak hour, ~${r.tbHour.toFixed(1)} TB would go into the app servers and the same amount out (on the through-app path). The user's time is about the same on both paths, because the real bottleneck is the user's network. The difference is on the app servers: they would have to handle ${fmt(r.conc)} long connections and ${r.gbps.toFixed(1)} Gbps, and every deploy/restart would break all the uploads in progress. Assumption: 1 app server ≈ 1 Gbps of upload data and ~1,000 open uploads.`;
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
        $('.pbPNote').textContent = upto < 0 ? '' : `From the end of the upload to READY: ~${dur(r.total)}. The "∥" stages run side by side (both start after the scan), so only the longer one counts in the total.` + (r.isVideo ? ` The video is taken as ~${dur(r.vSec)} long (1080p ≈ 1 MB per second), cut into 10 second pieces in 4 qualities, shared across ${$('#pbW').value} workers.` : ' It is a photo, so no transcoding.');
      };
      $('.pbRun').onclick = () => {
        if (running) return; running = true;
        const r = calc(+$('#pbSize').value, +$('#pbNet').value, +$('#pbU').value, +$('#pbW').value);
        let i = 0; const step = () => { drawPipe(r, i); i++; if (i < r.st.length) setTimeout(step, 450); else running = false; };
        step();
      };
      el.querySelectorAll('select,input').forEach(x => x.addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'term', title: "Little's law (in one line)", html: `<strong>What it is:</strong> how many jobs are running in a system at the same time = how many arrive per second × how long each one stays. 33 uploads/second × 80 seconds = ~2,667 at the same time.<br><strong>Why we need it:</strong> it tells you how many connections/servers you need. This rule applies to queues, connections and servers alike.<br><strong>Without it:</strong> the capacity estimate is wrong, and you run short of servers at peak.` },
    { type: 'callout', tone: 'tip', title: 'Read the default numbers', html: `100 MB video, 4G (10 Mbps), 2,000 uploads/minute: each upload takes ~80 seconds, so by Little\'s law ~<strong>2,667 uploads</strong> are open at the same time. On the app server path, the fleet handles ~<strong>26.7 Gbps in and 26.7 Gbps out</strong>, which is ~27 servers just to pass bytes along. On the pre-signed path, the app server only gets ~33 small "give me a URL" requests per second: one server is enough. A fun fact: switch the network to WiFi, and the Gbps stays at 26.7 (the data is the same), only the number of connections goes down.` },
    { type: 'callout', tone: 'tip', title: 'Stop here if...', html: `...files are smaller than ~100 MB and users have a decent network (like profile photos, PDFs). One pre-signed PUT is enough. And if the files are only a few KB (a small avatar, the JSON of a chat attachment), step 0 (straight through the API) is fine too. Climb higher when files are big or uploads keep breaking on mobile. Depth: <a href="#/object-storage">Object storage</a>, <a href="#/latency-throughput">Latency and throughput</a>.` },

    { type: 'h2', text: 'Step 2: Multipart + resumable upload' },
    { type: 'p', html: `<strong>Story:</strong> Kabir is uploading a 1 GB vlog on 4G (10 Mbps) on a train. One pre-signed PUT, one long request. At 80%, the train enters a tunnel and the network breaks. A single PUT does not keep the half that arrived: <strong>it starts again from zero</strong>. ~11 minutes of work wasted, and if it breaks again, again. On mobile uploads this happens every day.` },
    { type: 'callout', tone: 'term', title: 'Multipart upload', html: `<strong>What it is:</strong> cutting a big file into pieces (parts) and sending them. Each part has its own pre-signed URL, parts can go in parallel, and at the end a "complete" call tells S3: "join these parts into one object".<br><strong>Why we need it:</strong> if the network breaks, only the unfinished part is sent again, not the whole file. Parallel parts are also faster.<br><strong>Without it:</strong> every break means starting from zero.<br><strong>S3 numbers:</strong> a single PUT is at most 5 GB. Multipart: parts from 5 MiB to 5 GiB (the last part can be smaller), at most 10,000 parts, objects up to ~50 TB. AWS recommends multipart above ~100 MB.` },
    { type: 'callout', tone: 'term', title: 'Resumable upload', html: `<strong>What it is:</strong> an upload that can stop and later carry on from the same place: the app remembers which parts have arrived (or asks the server), and sends the rest. Google Cloud Storage\'s "resumable upload" and the open protocol <strong>tus</strong> do exactly this; in S3 it is built from multipart + "which parts arrived" (ListParts).<br><strong>Why we need it:</strong> the app closed, the phone restarted, the rest of the upload happens tomorrow morning on WiFi.<br><strong>Without it:</strong> a long upload is a gamble.<br><strong>Careful:</strong> the parts of unfinished multipart uploads keep taking space (and money) in S3. Use a lifecycle rule to abort them automatically after a few days.` },
    { type: 'p', html: `See for yourself: pick the moment the network breaks, and compare how much must be sent again with a single PUT vs multipart.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>File</label><select class="mp-s"><option value="100">100 MB short video</option><option value="1024" selected>1 GB vlog</option><option value="4096">4 GB lecture</option></select></div>
          <div><label>Network</label><select class="mp-n"><option value="2">Weak 3G, 2 Mbps</option><option value="10" selected>4G, 10 Mbps</option><option value="50">WiFi, 50 Mbps</option></select></div>
          <div><label>Part size</label><select class="mp-p"><option value="8">8 MB</option><option value="16" selected>16 MB</option><option value="64">64 MB</option></select></div>
          <div><label>Parts at the same time: <strong class="mp-kv"></strong></label><input class="mp-k" type="range" min="1" max="8" step="1" value="4"></div>
          <div><label>When the network broke: <strong class="mp-dv"></strong></label><input class="mp-d" type="range" min="10" max="95" step="5" value="80"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Single PUT: total sent</span><strong class="mp-sb"></strong></div>
          <div class="stat"><span>Single PUT: total time</span><strong class="mp-st"></strong></div>
          <div class="stat"><span>Multipart: parts</span><strong class="mp-pc"></strong></div>
          <div class="stat"><span>Multipart: total sent</span><strong class="mp-mb"></strong></div>
          <div class="stat"><span>Multipart: total time</span><strong class="mp-mt"></strong></div>
        </div>
        <div class="calc-note mp-note"></div>
        <div class="calc-note" style="font-size:13px;color:var(--ink-3)">Model: the network is the bottleneck (1 MB = 8 Mb). Parts on the way when it broke count as half sent; only those are sent again. The network breaks only once.</div>`;
      const $ = q => el.querySelector(q);
      const f = n => Math.round(n).toLocaleString('en-IN');
      const t = x => x < 90 ? Math.round(x) + ' s' : (x / 60).toFixed(1) + ' min';
      const upd = () => {
        const S = +$('.mp-s').value, N = +$('.mp-n').value, P = +$('.mp-p').value, k = +$('.mp-k').value, d = +$('.mp-d').value / 100;
        $('.mp-kv').textContent = k; $('.mp-dv').textContent = 'at ' + Math.round(d * 100) + '%';
        const sentS = S * (1 + d), timeS = sentS * 8 / N;          // single PUT: sent up to d, then all of it again from zero
        const parts = Math.ceil(S / P);
        const lost = Math.min(S * d, k * P / 2);                    // parts on the way were half sent
        const sentM = S + lost, timeM = sentM * 8 / N;
        $('.mp-sb').textContent = f(sentS) + ' MB'; $('.mp-st').textContent = t(timeS);
        $('.mp-pc').textContent = f(parts); $('.mp-mb').textContent = f(sentM) + ' MB'; $('.mp-mt').textContent = t(timeM);
        $('.mp-sb').style.color = 'var(--red)'; $('.mp-mb').style.color = 'var(--green)';
        $('.mp-note').innerHTML = `The single PUT sent ${f(S * d)} MB, the network broke, and <strong>the whole ${f(S)} MB went again</strong>. Multipart only sent ~${f(lost)} MB of the ${k} parts that were on the way. Saved: <strong>${t(timeS - timeM)}</strong>. More parts in parallel = more to resend after a break, but a faster upload on a good network.`;
      };
      el.querySelectorAll('select,input').forEach(x => x.addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'tip', title: 'Stop here if...', html: `...your uploads are now both big and likely to break, and this step handles them. If the file only needs to be kept as it is after upload (backup, document vault), stop here. Climb higher when you need to work on the file (scan, thumbnail, video qualities). Depth: <a href="#/object-storage">Object storage (multipart, chunk hashing)</a>.` },
    { type: 'h2', text: 'Step 3: the post-upload processing pipeline' },
    { type: 'p', html: `<strong>Story:</strong> Kabir\'s 1 GB vlog has arrived in S3. But right now it is of no use to anyone: the original 1 GB file is in one big quality and will not play on a slow phone/network, there is no thumbnail, and who knows, there may be a virus inside. At peak, xyz.com gets ~2,000 uploads per minute, and each one needs a scan, a thumbnail and 4 qualities.` },
    { type: 'p', html: `The work after an upload is long (transcoding a 1 GB video takes minutes) and it can fail. So it never happens inside the upload request. The pattern: <strong>storage event → queue → workers</strong>. It is the same idea as in <a href="#/queues">queues</a>, only here S3 itself gives the trigger.` },
    { type: 'callout', tone: 'term', title: 'Storage event (S3 Event Notifications)', html: `<strong>What it is:</strong> when something happens in a bucket (an object is created or deleted), S3 automatically sends a small JSON message: which bucket, which key, what size. According to the AWS docs it can go to an SNS topic, an SQS queue, a Lambda function or EventBridge. GCS and Azure Blob have similar event notifications.<br><strong>Why we need it:</strong> we cannot trust the client\'s "upload done" (the app may close, or it may lie). The storage itself tells us that the file really arrived.<br><strong>Without it:</strong> either scan the bucket every minute, or rely on the client.<br><strong>Careful:</strong> the event is <strong>at-least-once</strong> (it can sometimes arrive twice) and usually arrives within seconds, sometimes a minute or more.` },
    { type: 'h3', text: 'The status is a state machine' },
    { type: 'table', head: ['Status', 'Meaning', 'What the UI shows', 'Who changes it'], rows: [
      ['PENDING', 'URL given, bytes not here yet', 'Nothing (or "uploading 40%" only to the uploader)', 'API server'],
      ['UPLOADED', 'The full file is in S3', '"Processing..."', 'Worker (on the S3 event)'],
      ['PROCESSING', 'Scan / thumbnail / transcode running', '"Processing..." + progress', 'Worker'],
      ['READY', 'All outputs made, published', 'In the feed, with a play button', 'Worker'],
      ['REJECTED', 'Virus, wrong type, policy violation', 'A clear error message', 'Worker'],
      ['FAILED', 'Retries ran out, in the DLQ', '"Something went wrong, please try again"', 'Worker / DLQ handler'],
    ], caption: 'A cleanup job removes old PENDING rows (the upload never came). The status only moves forward: if a duplicate event arrives, READY must not go back to PROCESSING.' },
    { type: 'h3', text: 'One event, many jobs: fan-out' },
    { type: 'p', html: `A thumbnail is 2 seconds of work, a transcode is 5 minutes, and moderation (an AI check for nudity/violence) belongs to a separate team. If everything is in one worker, a bug in one stops all of them. Better: the S3 event goes to a <strong>topic</strong> (the "notice board" of pub/sub: SNS or Kafka, from where copies go to many queues), and each job has its own queue and its own workers. This is called <strong>fan-out</strong>. Each queue runs at its own speed, with its own retries.` },
    { type: 'ascii', text: `
                         ┌──> thumbnail queue ──> thumb workers (fast, 2 s)
S3 ObjectCreated ──> topic ──> transcode queue ──> transcode workers (slow, GPU/CPU heavy)
                         └──> moderation queue ──> moderation service
                                     │
             every result ──> metadata DB; when all required jobs are done → READY` },
    { type: 'callout', tone: 'term', title: 'Transcoding and adaptive bitrate', html: `<strong>What it is:</strong> <strong>transcoding</strong> = turning the uploaded video into other formats/qualities (like 1080p, 720p, 480p, 240p). <strong>Adaptive bitrate streaming</strong> (HLS or DASH) = cutting each quality into short segments (pieces a few seconds long), plus a playlist file that lists the segments. The player looks at the network and picks a quality for each segment: 240p in a tunnel, 1080p on WiFi.<br><strong>Why we need it:</strong> one big original file will not play on every phone and every network.<br><strong>Without it:</strong> endless buffering on a slow network, and wasted data.` },
    { type: 'p', html: `<strong>How to make transcoding faster?</strong> Cut the video into 10 second pieces, put each piece on a separate worker, then join them. In the simulator, a 1 GB video took ~3.5 minutes on 10 workers and ~1 minute on 50 workers: that is parallelism. The price: more machines, and care at the joins between pieces (each piece must start at a keyframe).` },
    { type: 'callout', tone: 'warn', title: 'The danger of an infinite loop', html: `If the worker writes its output into the same bucket/prefix that has the trigger, every output creates a new event, which runs the worker again... The AWS docs themselves warn about this execution loop. Fix: separate buckets for raw and processed files, or a trigger only on the <code>incoming/</code> prefix.` },
    { type: 'callout', tone: 'tip', title: 'Stop here if...', html: `...files are unique (each user uploads their own different things: documents, private backups) and mostly only the owner reads them. A pipeline + status + idempotent workers are enough. Climb higher when the same file arrives again and again (step 4) or many people watch one file (step 5). Depth: <a href="#/queues">Message queues</a>, <a href="#/pattern-long-tasks">Long-running tasks</a>, <a href="#/pattern-multistep">Multi-step processes</a>.` },

    { type: 'h2', text: 'Step 4: Dedupe: same bytes, one copy' },
    { type: 'callout', tone: 'term', title: 'Content hash (SHA-256) and reference count', html: `<strong>What it is:</strong> a content hash = a short "fingerprint" made from all the bytes of a file (SHA-256: 64 hex characters). Same bytes = same hash; change even one byte and the hash is completely different. Reference count = a number kept with the blob: how many user files point to this blob.<br><strong>Why we need it:</strong> send the hash before the upload; if it is already in the DB, there is no need to send the bytes at all. The ref count tells you when the blob can really be removed.<br><strong>Without it:</strong> either every copy is stored separately (wasted storage), or one user\'s delete wipes out everyone\'s file.` },
    { type: 'p', html: `<strong>Story:</strong> 10,000 people upload/forward a viral meme (2 MB) on xyz.com in one day. Without dedupe: 20 GB of storage, 20 GB of upload traffic, 10,000 scans and thumbnails. All for the same bytes! In the Object storage lesson we saw chunk-level dedupe (Dropbox style). At the pattern level, the simplest version is: <strong>a hash of the whole file</strong> before the upload. If the hash is found, it is an "instant upload". But a new problem appears: <strong>delete</strong>. Riya deleted the meme. Should we remove the blob? No! 10,000 other people point to that same blob. So every blob keeps a <strong>reference count</strong>: how many files use this blob. Remove the blob only when the count reaches 0. Try it yourself:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px">
          <button type="button" class="btn small" data-a="up:A">Riya: upload meme.jpg</button>
          <button type="button" class="btn small" data-a="up:B">Aman: upload the same meme</button>
          <button type="button" class="btn small" data-a="up:C">Zoya: upload the same meme</button>
          <button type="button" class="btn small" data-a="new:C">Zoya: her own new photo</button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
          <button type="button" class="btn small ghost" data-a="del:A">Riya deletes</button>
          <button type="button" class="btn small ghost" data-a="del:B">Aman deletes</button>
          <button type="button" class="btn small ghost" data-a="del:C">Zoya: deletes the meme</button>
          <button type="button" class="btn small ghost" data-a="reset">Reset</button>
        </div>
        <div class="stats">
          <div class="stat"><span>Files (what users see)</span><strong class="pbF"></strong></div>
          <div class="stat"><span>Blobs (real copies in S3)</span><strong class="pbB"></strong></div>
          <div class="stat"><span>ref_count of the meme blob</span><strong class="pbR"></strong></div>
          <div class="stat"><span>Bytes uploaded</span><strong class="pbU"></strong></div>
        </div>
        <div class="calc-note pbLog"></div>`;
      const BL = { meme: 2, photo: 3 }; // MB
      let files, refs, sent, log;
      const reset = () => { files = {}; refs = {}; sent = 0; log = 'Start: nothing yet.'; draw(); };
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
          if (files[key]) { log = 'This user already has this file.'; return draw(); }
          files[key] = blob;
          if (refs[blob]) { refs[blob]++; log = `Hash found: instant upload, 0 bytes sent. ref_count = ${refs[blob]}.`; }
          else { refs[blob] = 1; sent += BL[blob]; log = `New hash: ${BL[blob]} MB went into S3. ref_count = 1.`; }
        } else {
          if (!files[key]) { log = 'This user does not have this file.'; return draw(); }
          delete files[key]; refs.meme--;
          if (refs.meme === 0) { delete refs.meme; log = 'ref_count reached 0: only now is the blob removed from S3 (usually a little later, by a garbage-collection job).'; }
          else log = `Only the file row was removed. The blob stays alive, because ref_count = ${refs.meme}.`;
        }
        draw();
      });
      reset();
    }},
    { type: 'callout', tone: 'mistake', title: 'Delete with dedupe', html: `Beginners often write "file delete = S3 object delete". With dedupe this is a bug: one user\'s delete will wipe out the file of 10,000 other users. A file (the user\'s record) and a blob (the bytes) are different things. Updating the ref count must be atomic (a DB transaction), and actually removing the blob should be a separate, slow garbage-collection job, so that in a race (one person deletes while another uploads the same hash at the same moment) no data is lost.` },
    { type: 'callout', tone: 'tip', title: 'Stop here if...', html: `...the cost of duplicate uploads is now saved. If files are private and only the owner reads them (backups), the step above (CDN) is not needed. Careful: cross-user dedupe brings a privacy risk (someone can check "does anyone have this file?"), so many systems only dedupe within one user\'s files. Depth: <a href="#/object-storage">Object storage (dedupe)</a>.` },

    { type: 'h2', text: 'Step 5: delivery, through a CDN' },
    { type: 'p', html: `<strong>Story:</strong> Kabir\'s vlog started trending: 10 lakh views in one day, and each view watches ~200 MB. That is ~200 TB of data in one day, for viewers from Delhi to Chennai. If all of it came from S3 (one region, Mumbai), there would be a big S3 bill, and buffering for far-away viewers. An upload happens once, a download lakhs of times. So the delivery path always goes through a <a href="#/cdn">CDN</a> (Content Delivery Network: cache servers spread around the world, called edges): bytes come from an edge server near the user\'s city, the load on S3 drops, and so does latency. Three extra points for blobs:` },
    { type: 'list', items: [
      `<strong>Private content through the CDN too.</strong> Handing out pre-signed S3 URLs throws away the benefit of the CDN. Instead, CDNs support their own signed URLs or signed cookies (CloudFront has both): a signed URL for one file, a signed cookie for many files (like all the HLS segments of one video). And lock the bucket so only the CDN can read from S3 (in CloudFront this is called Origin Access Control). Otherwise people will skip the CDN and hit the bucket directly.`,
      `<strong>Range requests.</strong> Jumped to the middle of a video? The player asks for only that part with a <code>Range: bytes=...</code> header. With segments (HLS/DASH) this is even easier: each segment is a small file that is cached separately.`,
      `<strong>A separate version for each size.</strong> A 200 px thumbnail in the feed, 1080 px in full screen. Sending a 4 MB original photo to a phone wastes both data and battery. These versions are made in the pipeline itself (or resized on the fly at the CDN, then cached).`,
    ]},
    { type: 'p', html: `See for yourself how much load the CDN takes off S3 (the origin). The <strong>hit ratio</strong> = what percent of requests were answered at the edge (did not go to the origin).` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Views per day: <strong class="cd-vv"></strong></label><input class="cd-v" type="range" min="0" max="6" step="1" value="4"></div>
          <div><label>Data per view</label><select class="cd-m"><option value="20">20 MB (short clip)</option><option value="200" selected>200 MB (vlog, 720p)</option><option value="1000">1 GB (long 1080p)</option></select></div>
          <div><label>CDN hit ratio: <strong class="cd-hv"></strong></label><input class="cd-h" type="range" min="50" max="99" step="1" value="95"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Total data per day</span><strong class="cd-tot"></strong></div>
          <div class="stat"><span>Without CDN: from S3</span><strong class="cd-no"></strong></div>
          <div class="stat"><span>With CDN: from S3</span><strong class="cd-yes"></strong></div>
          <div class="stat"><span>How much less load on S3</span><strong class="cd-x"></strong></div>
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
        $('.cd-note').innerHTML = `${f(v)} views × ${f(m)} MB = ${tb(tot)} in one day. The CDN answers ${Math.round(h * 100)}% of requests at the edge, so only ${tb(origin)} reaches S3 (${Math.round(1 / (1 - h))} times less). And viewers get the bytes from near their own city. Raising the hit ratio from 95% to 99% cuts the load on S3 by another 5 times: that is why, for popular content, the hit ratio is the most important number.`;
      };
      el.querySelectorAll('select,input').forEach(x => x.addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'tip', title: 'Stop here (the ladder is complete)', html: `After the CDN, the blob ladder is complete. Beyond this there is only tuning: multi-CDN, an origin shield (one more cache layer between the CDN and S3), on-the-fly image resizing, and storage classes (moving old, rarely watched files to cheaper storage). If files are private and only one or two people read them, even a CDN is not needed. Depth: <a href="#/cdn">CDN</a>, <a href="#/design-youtube">YouTube design</a>, <a href="#/design-drive">Google Drive design</a>.` },
    { type: 'h2', text: 'The whole pattern, run it yourself' },
    { type: 'p', html: `Now run all five steps in one diagram: upload, processing, delivery, dedupe and failures. Click each box to read what it does.` },
    { type: 'flow', height: 380,
      nodes: [
        { id: 'c', label: 'Mobile app', sub: 'Riya\'s phone', x: 80, y: 190, w: 130, kind: 'client', info: 'What it is: the xyz.com app on Riya\'s phone. It is both the uploader and the viewer. Before uploading it computes the file\'s SHA-256 hash (for dedupe), then only asks for permission. The bytes go straight to S3.' },
        { id: 'cdn', label: 'CDN', sub: 'edge servers', x: 80, y: 320, w: 130, kind: 'edge', info: 'What it is: the CDN\'s edge servers (caches near the city). Viewers get videos/photos from here. On the first request it fetches from S3 (the origin), then caches it. Private content needs the CDN\'s own signed URLs or signed cookies.' },
        { id: 'api', label: 'API server', sub: 'permission only', x: 260, y: 60, w: 140, kind: 'server', info: 'What it is: the xyz.com app/API server, which only gives permission. Login, size/type limits, quota check. It creates a row in the metadata DB and gives out pre-signed (multipart) URLs. The bytes never pass through it.' },
        { id: 'db', label: 'Metadata DB', sub: 'status, hash', x: 260, y: 320, w: 140, kind: 'data', info: 'What it is: the metadata database of the files. One row per file: id, owner, s3 key, size, sha256, status (PENDING / UPLOADED / PROCESSING / READY / REJECTED), and ref_count for dedupe. The UI works from this status.' },
        { id: 's3', label: 'S3 bucket', sub: 'raw + processed', x: 440, y: 190, w: 140, kind: 'data', info: 'What it is: object storage, where the real bytes live. Raw uploads go into an "incoming/" place (a separate bucket or prefix). Processing outputs (thumbnails, 360p/720p/1080p) go into a separate prefix. Keeping them apart matters: otherwise writing an output fires another event and a loop can form.' },
        { id: 'q', label: 'Queue', sub: 'upload events', x: 620, y: 60, w: 140, kind: 'queue', info: 'What it is: a message queue where storage events wait in line. S3\'s ObjectCreated event lands here. The S3 docs say: the event usually arrives in seconds, sometimes a minute or more, and at-least-once (a duplicate can arrive). So the workers must be idempotent.' },
        { id: 'w', label: 'Workers', sub: 'scan, transcode', x: 620, y: 320, w: 140, kind: 'server', info: 'What it is: the processing machines. They take jobs from the queue: file type check, virus scan, thumbnails, transcoding. Every step is idempotent: the same input gives the same output key, so running again does no harm. On failure, retry; on repeated failure, DLQ.' },
      ],
      edges: [{ a: 'c', b: 'api' }, { a: 'c', b: 's3' }, { a: 'c', b: 'cdn' }, { a: 'cdn', b: 's3' }, { a: 'api', b: 'db' }, { a: 's3', b: 'q' }, { a: 'q', b: 'w' }, { a: 'w', b: 'db' }, { a: 'w', b: 's3' }],
      scenarios: [
        { name: 'Upload + processing', steps: [
          { title: 'Ask for permission', text: 'The app sends the file\'s size, type and SHA-256 hash. Not the bytes.', go: 'c>api', msg: 'POST /uploads  { "size": 104857600, "type": "video/mp4", "sha256": "9f2c..." }' },
          { title: 'PENDING row + URLs', text: 'The hash was not found in the DB (a new file). A row was created, and multipart part URLs were signed for the 100 MB.', go: ['api>db', 'res:db>api', 'res:api>c'], after: { db: { sub: 'v91: PENDING' } }, msg: '{ "uploadId": "...", "parts": [ "https://...partNumber=1&X-Amz-Signature=...", ... ] }' },
          { title: 'Parts straight into S3', text: 'Parts go in parallel. If the network breaks, only the unfinished part is sent again (<a href="#/object-storage">object storage</a> lesson). After the complete call, there is one object in S3.', go: 'c>s3', after: { s3: { sub: 'incoming/v91 saved' } } },
          { title: 'S3 tells us itself', text: 'We do not trust the client\'s "done". S3\'s event goes into the queue.', go: 'evt:s3>q', msg: 'ObjectCreated:CompleteMultipartUpload  key=incoming/v91' },
          { title: 'A worker picks it up', text: 'Status PROCESSING. First a cheap check: are the first bytes of the file ("magic bytes") really MP4, or is it a renamed .exe?', go: ['q>w', 'w>db'], after: { db: { sub: 'v91: PROCESSING' }, w: { state: 'ok', sub: 'processing...' } } },
          { title: 'Write the outputs', text: 'The virus scan is clean. A thumbnail and 4 qualities were made and written into a separate prefix.', go: ['w>s3', 'res:s3>w', 'w>s3'], after: { s3: { sub: 'processed/v91/*' } }, msg: 'PUT processed/v91/thumb.jpg\nPUT processed/v91/720p/seg_0001.ts ...' },
          { title: 'READY', text: 'Only now does the video show up in the feed. The user gets a notification.', go: 'w>db', after: { db: { state: 'ok', sub: 'v91: READY' }, w: { state: '', sub: 'idle' } } },
        ]},
        { name: 'Watching (CDN)', steps: [
          { title: 'Ask for the video', text: 'The API checks permission (public? friends only?) and gives a CDN URL. For a private video, the CDN\'s signed URL/cookie, with a short expiry.', go: ['c>api', 'api>db', 'res:db>api', 'res:api>c'], msg: '{ "playlist": "https://cdn.xyz.com/v91/master.m3u8?Expires=...&Signature=..." }' },
          { title: 'First viewer: CDN miss', text: 'The edge does not have it, so it fetches it from S3 (the origin) and keeps it.', go: ['c>cdn', 'cdn>s3', 'res:s3>cdn', 'res:cdn>c'], after: { cdn: { state: 'miss', sub: 'MISS → cached' } } },
          { title: 'The other lakhs of viewers: HIT', text: 'S3 and the API do not even notice. The video is in small segments, so each segment is cached separately, and seeking is cheap.', go: ['c>cdn', 'res:cdn>c'], set: { s3: { state: 'dim' }, api: { state: 'dim' } }, after: { cdn: { state: 'hit', sub: 'HIT' } } },
        ]},
        { name: 'Virus found', steps: [
          { title: 'A normal upload', text: 'Someone uploaded "cricket_highlights.mp4".', go: ['c>api', 'res:api>c', 'c>s3', 'evt:s3>q', 'q>w'] },
          { title: 'The check fails', text: 'The magic bytes are not MP4, and the scanner caught malware. That is why raw uploads are never put straight on the CDN/public: scan first, then publish.', focus: ['w'], set: { w: { state: 'warn', sub: 'INFECTED' } } },
          { title: 'Quarantine + REJECTED', text: 'The file is moved from incoming to quarantine (or deleted), the row becomes REJECTED, and the user gets a clear message. Not one byte reached any viewer.', go: ['w>s3', 'w>db'], after: { s3: { state: 'warn', sub: 'quarantine/v92' }, db: { state: 'warn', sub: 'v92: REJECTED' } } },
        ]},
        { name: 'Worker crash', steps: [
          { title: 'Transcode in progress', text: 'A worker took the message; the transcode of a 1 GB video is running.', go: 'q>w', after: { w: { state: 'ok', sub: 'transcode 60%' } } },
          { title: 'The worker died', text: 'The machine crashed. The message had not been acked (deleted) yet.', go: 'lost:w>s3', set: { w: { state: 'down', sub: 'CRASH' } } },
          { title: 'The message comes back', text: 'The queue\'s visibility timeout ran out, and the message became visible again. A new worker picks it up. The output keys are the same (processed/v91/720p/...), so the half-written files are overwritten: no duplicate garbage. This is <strong>idempotency</strong>.', go: ['evt:q>w', 'w>s3', 'w>db'], after: { w: { state: '', sub: 'retry: OK' }, db: { sub: 'v91: READY' } } },
          { title: 'What if it fails again and again?', text: 'If a bad file crashes the worker every time (a poison message), after 3-5 tries it goes to the DLQ, the status becomes FAILED, and an alert fires. Otherwise it would jam the queue forever (<a href="#/queues">queues</a> lesson).', focus: ['q'] },
        ]},
        { name: 'Same file again', intro: '10,000 people are forwarding a viral meme.', steps: [
          { title: 'Hash first', text: 'The app sent the file\'s SHA-256.', go: 'c>api', msg: 'POST /uploads  { "sha256": "4be1...", "size": 2097152 }' },
          { title: 'DB: this hash already exists', text: 'The same bytes arrived before. No new blob is made, just a new "file" row that points to the same blob, and ref_count + 1.', go: ['api>db', 'res:db>api'], after: { db: { state: 'hit', sub: 'blob 4be1: refs 10,001' } } },
          { title: 'Instant upload', text: 'The user immediately sees "done". Not one byte went over the network, and S3 has only one copy. (For the security side of cross-user dedupe, see the object storage lesson.)', go: 'res:api>c', set: { s3: { state: 'dim' } } },
        ]},
      ],
    },
    { type: 'compare',
      left: { title: 'Wrong pattern', html: `• Upload through the app server<br>• One PUT, 2 GB, restart from zero when it breaks<br>• Transcode inside the upload request<br>• Status READY when the client says "done"<br>• Raw file straight on a public URL<br>• Delete = S3 object delete<br>• Download straight from S3` },
      right: { title: 'Right pattern', html: `• Pre-signed URL, straight to storage<br>• Multipart / resumable chunks<br>• Storage event → queue → workers<br>• Status changed by the S3 event + worker<br>• Scan first, then publish (separate prefix)<br>• Ref count, a GC job removes the blob<br>• CDN + signed URL/cookie` },
    },

    { type: 'callout', tone: 'tip', title: 'Decide', html: `As soon as you see files bigger than a few MB, use this pattern, following the ladder:<br>• Files of a few KB → straight through the API (step 0).<br>• Bigger than a few MB → <strong>upload straight into object storage with a pre-signed URL</strong> (step 1), with only metadata and status in the DB.<br>• ~100 MB+ or mobile networks → <strong>multipart, resumable</strong> (step 2).<br>• Work must be done on the file → after upload, <strong>storage event → queue → workers</strong> for scan/thumbnail/transcode (step 3).<br>• The same files again and again → <strong>dedupe by content hash</strong> + ref count (step 4).<br>• Many viewers → always download through a <strong>CDN</strong>, with signed URLs/cookies (step 5).<br>The app server's only job is to give permission; the bytes must never pass through it.` },
    { type: 'p', html: `When <strong>not</strong> to? For very small files (a few KB: a small JSON for an avatar, chat text) all this is overkill; a normal API request is fine. And even if the server must do something with the bytes right away (like encrypting with the user\'s key during upload), it is usually still done by putting the file in storage first and using a worker, not inside the request.` },

    { type: 'h2', text: 'The whole picture' },
    { type: 'diagram', title: 'Big files on xyz.com: the whole picture', height: 560,
      nodes: [
        { id: 'app', label: 'Mobile app', sub: 'hash + parts', x: 80, y: 70, kind: 'client', info: 'What it is: the uploader\'s app. It first sends the file\'s SHA-256 hash (dedupe), then sends the parts straight to S3 using pre-signed URLs. If the network breaks, only the remaining part.' },
        { id: 'api', label: 'API server', sub: 'permission only', x: 320, y: 70, kind: 'server', info: 'What it is: the xyz.com app server. Login, size/type limits, quota check, the metadata row, and pre-signed (multipart) URLs. The bytes never pass through it (step 1).' },
        { id: 'db', label: 'Metadata DB', sub: 'status, hash, refs', x: 550, y: 70, w: 150, kind: 'data', info: 'What it is: one row per file: key, owner, size, sha256, status (PENDING → UPLOADED → PROCESSING → READY), and the blob\'s ref_count (step 4).' },
        { id: 's3', label: 'S3 bucket', sub: 'incoming / processed', x: 320, y: 220, w: 150, kind: 'data', info: 'What it is: object storage. Raw uploads in incoming/, outputs (thumbnails, 240p-1080p segments) in processed/. Separate prefixes so no event loop forms.' },
        { id: 'topic', label: 'Topic + queues', sub: 'ObjectCreated', x: 550, y: 220, w: 150, kind: 'queue', info: 'What it is: the S3 event goes to a topic first, then into a separate queue for each job (thumbnail, transcode, moderation): fan-out. The event is at-least-once, so the workers are idempotent.' },
        { id: 'w', label: 'Workers', sub: 'scan, thumb, transcode', x: 550, y: 370, w: 170, kind: 'server', info: 'What it is: the processing machines (step 3). Magic bytes check, virus scan, thumbnail, parallel transcoding in 10 second pieces. Repeated failure = DLQ + alert.' },
        { id: 'cdn', label: 'CDN edge', sub: 'signed cookies', x: 80, y: 370, kind: 'edge', info: 'What it is: cache servers near the city (step 5). 95%+ of a popular video comes from here. Signed URLs/cookies for private content; the bucket is open only to the CDN.' },
        { id: 'view', label: 'Viewers', sub: '10 lakh / day', x: 80, y: 500, kind: 'client', info: 'What it is: the people watching the video. The player looks at the network and picks a quality for each segment (adaptive bitrate), and on a seek it asks only for the segment it needs.' },
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
        { name: 'Upload', text: 'The app sent the hash + size, the API gave a PENDING row and part URLs, and the parts went straight into S3 (steps 1-2).', go: ['app>api>db', 'app>s3'] },
        { name: 'Processing', text: 'The S3 event went into the topic/queue, a worker did scan + thumbnail + transcode, the outputs went into processed/, and the status became READY (step 3).', go: ['s3>topic>w>s3', 'w>db'] },
        { name: 'Dedupe', text: 'The hash was already in the DB: a new file row, ref_count + 1, and not one byte uploaded (step 4).', go: ['app>api>db'] },
        { name: 'Watch', text: 'The viewer gets segments from the CDN edge; only on a miss does the CDN fetch from S3 (the origin) (step 5).', go: ['view>cdn>s3'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>The blob goes into object storage; the DB keeps only the key + metadata + status.</li>
      <li>Step 1: pre-signed URL: the app server gives permission, the bytes go straight to storage.</li>
      <li>Step 2: for ~100 MB+ or mobile, multipart/resumable: when it breaks, only the unfinished part is sent again. S3: parts of 5 MiB-5 GiB, at most 10,000 parts.</li>
      <li>Step 3: storage event → queue → idempotent workers; "uploaded" and "READY" are different things.</li>
      <li>Step 4: dedupe by content hash; delete = decrease the ref count, a GC job removes the blob.</li>
      <li>Step 5: downloads through the CDN; the hit ratio is the most important number; signed URLs/cookies for private content.</li>
      <li>Keep raw and processed in separate prefixes/buckets, or you get an infinite event loop.</li>
    </ul>` },

    { type: 'tradeoffs',
      gains: ['Almost zero upload load on the app servers; uploads do not break on a deploy', 'When the network breaks, only the unfinished chunk is sent again', 'The same file is stored and uploaded only once (instant upload)', 'Long processing is separate from the user\'s request, with retries and a DLQ', 'Fast and cheap delivery through the CDN, less load on S3'],
      costs: ['More moving parts: bucket policies, events, queues, workers, CDN config', 'Eventual: seconds to minutes from upload to READY', 'You must handle the status state machine, cleanup jobs and idempotency yourself', 'Delete is hard with dedupe (ref count, GC), plus a cross-user privacy risk', 'Signed URLs are bearer tokens: if one leaks, anyone can use it until it expires'] },

    { type: 'think', questions: [
      { q: 'A photo was forwarded to 50 groups on WhatsApp. How many copies should the server have, and what happens when one group deletes it?', a: 'One copy of the bytes (by content hash). Each message is a reference. When one group deletes it, only its reference is removed (the ref count goes down); the blob stays as long as any reference is left, or until a retention policy ends. (This is the general idea of the pattern; WhatsApp is end-to-end encrypted, so its real implementation may differ because of encryption.)' },
      { q: 'You increased the transcode workers from 10 to 50, but the time to READY dropped only a little. What could be the reason?', a: 'The longest stage of the pipeline is now something else: maybe the virus scan (it grows with file size), the S3 event delay, or there are simply too few transcode pieces (the 10 pieces of a short video cannot be shared among 50 workers). The stage on the critical path decides the total time. For parallel stages, only the longest one counts.' },
      { q: 'An S3 event arrived twice. The worker made the thumbnail both times and wrote two thumbnail rows into the DB. The fix?', a: 'Make the worker idempotent: the output key is fixed by the file id (processed/v91/thumb.jpg), so the second time it overwrites. In the DB, an upsert (unique on file_id) or a check like "if the status is already READY, do nothing". With at-least-once delivery, every consumer must be able to handle duplicates.' },
    ]},
    { type: 'quiz', questions: [
      { q: '100 MB files, 2,000 uploads/minute, through the app server. Switch the network from 4G to WiFi (5x faster). What happens to the app fleet\'s Gbps?', options: ['5x less', 'About the same', '5x more'], answer: 1, explain: 'The same amount of data arrives every minute (2,000 × 100 MB), so the Gbps is the same (~26.7). A faster network makes each upload finish sooner, so fewer connections are open at the same time, not less bandwidth.' },
      { q: 'Who sets the status to READY after an upload?', options: ['The client, as soon as it gets the upload\'s 200 OK', 'A worker, after all the processing steps (scan, thumbnail, transcode)', 'The CDN, on the first request'], answer: 1, explain: '200 OK only means the bytes arrived. The file should be published only after the scan and transcode, and the status changes on the server side (S3 event + worker), not because the client says so.' },
      { q: 'A worker writes its outputs into the same bucket prefix that has the ObjectCreated trigger. What happens?', options: ['Nothing', 'Every output creates a new event: an infinite loop and a big bill', 'S3 rejects the output'], answer: 1, explain: 'The AWS docs warn about exactly this execution loop. Use separate buckets for raw and processed, or a prefix-filtered trigger.' },
      { q: 'With dedupe, a user deleted a file. What is the right step?', options: ['Delete the S3 object right away', 'Remove the file row and decrease ref_count; remove the blob (with a GC job) only when it reaches 0', 'Do nothing, storage is cheap'], answer: 1, explain: 'The blob is shared. The bytes must stay until the ref count is 0; the real delete is done by a separate GC job.' },
      { q: 'What is the right way to serve private videos through a CDN?', options: ['Make the bucket public', 'The CDN\'s signed URLs/cookies + a bucket open only to the CDN (origin access control)', 'Give every viewer a pre-signed S3 URL and remove the CDN'], answer: 1, explain: 'A signed URL/cookie lets in only allowed viewers, with a short expiry. Locking the bucket means nobody can skip the CDN, and the benefit of caching is kept.' },
      { q: 'A 1 GB video, on mobile, and the network broke at 80%. With multipart (16 MB parts), what must be sent again?', options: ['The whole 1 GB file', 'Only the parts that were on the way when it broke', 'Nothing, S3 fills it in by itself'], answer: 1, explain: 'The parts that already arrived are safe in S3. The app (or ListParts) knows which ones arrived; only the unfinished parts are sent again. With a single PUT, the whole file starts from zero.' },
    ]},
    { type: 'sources', note: 'Product-specific details come from these official docs; the general part of the pattern is industry practice.', items: [
      { title: 'Amazon S3 Event Notifications', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/EventNotifications.html', used: 'Destinations (SNS, SQS, Lambda, EventBridge), at-least-once delivery, typical delivery in seconds, warning about execution loops when writing to the triggering bucket.' },
      { title: 'Serve private content with signed URLs and signed cookies', publisher: 'Amazon CloudFront documentation', official: true, url: 'https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PrivateContent.html', used: 'Signed URLs vs signed cookies for private content, restricting S3 origin so it is reachable only through CloudFront.' },
      { title: 'Uploading and copying objects using multipart upload', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html', used: 'Multipart flow referenced from the object storage lesson (parallel parts, resume, complete).' },
      { title: 'Amazon S3 multipart upload limits', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html', used: 'Part size 5 MiB to 5 GiB (last part can be smaller), max 10,000 parts, max object size 48.8 TiB.' },
      { title: 'Uploading objects', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/upload-objects.html', used: 'Single PUT up to 5 GB, multipart up to 50 TB; multipart recommended for objects of 100 MB or more (from the multipart overview page).' },
      { title: 'Sharing objects with presigned URLs', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html', used: 'Presigned URL expiry: up to 7 days via SDK/CLI with SigV4, 1 min to 12 h from the console.' },
      { title: 'Streaming File Synchronization', publisher: 'Dropbox Tech blog', official: true, year: 2014, url: 'https://dropbox.tech/infrastructure/streaming-file-synchronization', used: 'Hash-before-upload idea (an older post from 2014); detailed in the object storage lesson.' },
    ]},
  ],
});
