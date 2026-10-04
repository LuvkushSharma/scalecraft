Lesson.register({
  id: 'design-youtube',
  title: 'YouTube / Netflix',
  minutes: 40,
  summary: `Take in huge video files, turn each one into a dozen qualities, and play them all over the world without stopping. From zero: the video file, pieces (segments), the playlist (manifest), and the player that picks the quality by itself. Then resumable upload, the transcoding DAG, per-title encoding, a CDN like Netflix Open Connect, metadata on Vitess, recommendations and view counts. Based on Netflix and YouTube engineering posts.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Riya made a 2 GB video of her Goa trip on her phone and wants to put it on xyz.com. In the metro, her internet keeps dropping.<br>At the same time, lakhs of people are watching videos on xyz.com: some on a big TV with home WiFi, some on an old phone with weak 4G.<br>We have three jobs: (1) bring the big file in without breaking, (2) make small, different versions of it for every phone and every internet speed, (3) deliver the video to every viewer so that it never stops.<br>YouTube and Netflix do this every day, for crores of people. This lesson shows how.` },
    { type: 'callout', tone: 'tip', title: 'Try it yourself first', html: `Think on paper for 10 minutes. A creator uploads a 2 GB video, and 1 crore people want to watch it on different phones, TVs and networks. Which boxes do you need? Why does the video not stop when you enter a train tunnel? Then compare with this page.` },

    { type: 'p', html: `xyz.com is now a video platform. In the <a href="#/queues">queues</a>, <a href="#/object-storage">object storage</a> and <a href="#/cdn">CDN</a> lessons we saw some of its parts. Now we will design the whole system together, and see what real companies (Netflix and YouTube) did.` },
    { type: 'p', html: `Both do a similar job, but the pressure is in different places:` },
    { type: 'compare',
      left: { title: 'YouTube: upload heavy', html: `• Anyone can upload (user generated content)<br>• According to YouTube's official blog (2021), <strong>500+ hours</strong> of video are uploaded every minute<br>• So the biggest question is: how to turn so many videos into different qualities (this is called <em>transcoding</em>, explained below). YouTube even built its own chip (VCU) for this` },
      right: { title: 'Netflix: delivery heavy', html: `• The catalog is smaller and professional (it comes from studios)<br>• Netflix can spend a lot of effort compressing each movie (separate settings for each movie: per-title encoding)<br>• The real question is delivery: crores of people watch at the same time. So Netflix built its own delivery network (CDN): <strong>Open Connect</strong>` },
    },
    { type: 'p', html: `If you do not know these words (transcoding, CDN) yet, that is fine. In the next part we start from zero.` },

    { type: 'h2', text: 'Step 0: how a video reaches your phone, from zero' },
    { type: 'p', html: `In the <a href="#/design-hotstar">JioHotstar lesson</a> we studied segments, the packager, the manifest and ABR in a lot of detail for live cricket. There, the video was being made "right now" (live). Here, the video is already recorded (this is called <strong>VOD</strong>, video on demand). The basics are the same, so first a short recap in very simple words.` },
    { type: 'callout', tone: 'term', title: 'New word: encoding and codec', html: `<strong>What it is:</strong> raw video from a camera is very big (about 1.2 Gbps at 1080p, which is about 155 MB every second). <strong>Encoding</strong> compresses it: instead of writing every full frame, it only writes what changed since the last frame. The set of rules for this is called a <strong>codec</strong> (H.264, VP9, AV1...).<br><strong>Why we need it:</strong> the same video fits in about 5 Mbps. That is more than a hundred times smaller, and the eye sees very little difference.<br><strong>Without it:</strong> one minute of video would be GBs in size and could not reach any phone.` },
    { type: 'callout', tone: 'term', title: 'New word: transcoding and the quality ladder', html: `<strong>What it is:</strong> opening the creator's file (decode) and compressing it again (encode) into different sizes: 240p, 480p, 720p, 1080p... Each version is a <strong>rendition</strong>. The list of all renditions is a <strong>ladder</strong>: low quality at the bottom, high quality at the top.<br><strong>Why we need it:</strong> a person on weak 4G needs a small version. A person with a big TV needs a big one. One file cannot work for everyone.<br><strong>Without it:</strong> either the video keeps stopping on slow internet, or it looks blurry on fast internet for no reason.` },
    { type: 'callout', tone: 'term', title: 'New word: segment (a piece of video)', html: `<strong>What it is:</strong> we cut every rendition into small pieces of 2-6 seconds and save each piece as its own file: <code>seg_0001.m4s</code>, <code>seg_0002.m4s</code>... Like the separate pages of a long book.<br><strong>Why we need it:</strong> (1) the video starts as soon as the first piece arrives, with no wait for the whole file; (2) the quality can change at every new piece; (3) small files that never change are easy to keep on cache servers all over the world.<br><strong>Without it:</strong> one long 2 GB file: slow start, almost no way to change quality in the middle, and if you stop after 5 minutes, the rest of the download is wasted.` },
    { type: 'callout', tone: 'term', title: 'New word: manifest (the list of pieces)', html: `<strong>What it is:</strong> a small text file that tells the player: "this video has these qualities, and the pieces of each quality are at these URLs". In HLS it is called <code>.m3u8</code>, in DASH it is <code>.mpd</code>.<br><strong>Why we need it:</strong> the player must know which pieces to ask for and where.<br><strong>Without it:</strong> the pieces exist, but the player cannot find them, like a book with no index.` },
    { type: 'callout', tone: 'term', title: 'New word: player and ABR', html: `<strong>What it is:</strong> the part of the phone or TV app that downloads the pieces and plays them. Before asking for each next piece, it checks: "how fast is my internet, and how many seconds of video do I already have saved (the <strong>buffer</strong>)?" Then it picks the right quality. This is called <strong>ABR</strong> (Adaptive Bitrate).<br><strong>Why we need it:</strong> if the internet drops in a metro tunnel, the next piece is 240p. As soon as you come out, it goes back to 720p. The video does not stop.<br><strong>Without it:</strong> one fixed quality, and the video keeps stopping on a weak network.` },
    { type: 'callout', tone: 'term', title: 'New word: CDN', html: `<strong>What it is:</strong> Content Delivery Network. Thousands of cache servers in cities around the world, which keep copies of popular files (<a href="#/cdn">CDN lesson</a>).<br><strong>Why we need it:</strong> a viewer in Mumbai gets the piece from a server near Mumbai, not from a data center in America. It is faster, and our main servers get no load.<br><strong>Without it:</strong> all viewers ask one place: Tbps of traffic, which no single data center can send.` },
    { type: 'p', html: `The whole chain in one line:` },
    { type: 'ascii', text: `
 Creator ─upload─> storage ─> transcoding (5-20 qualities) ─> pieces + manifest
                                                                   │
 Viewer's player <──── CDN (nearby cache server) <─────────────────┘
   (picks the quality before every piece)`, caption: 'The life of one video. In every part of this lesson we look at these boxes in detail.' },
    { type: 'h2', text: 'Step 1: requirements' },
    { type: 'compare',
      left: { title: 'Functional', html: `• A creator uploads a video (up to many GBs). If the internet breaks in the middle, it continues from the same point<br>• The video is processed into many qualities (240p to 4K)<br>• A viewer watches on any device and can seek (jump to any time)<br>• Show the title, description, thumbnail and view count<br>• "For you" videos on the home page (recommendations, high level)<br><br><strong>Out of scope:</strong> comments, live streaming (that is in the <a href="#/design-hotstar">JioHotstar</a> lesson), ads` },
      right: { title: 'Non-functional', html: `• Smooth playback: as little <strong>rebuffering</strong> (the video getting stuck) as possible<br>• Fast start (1-2 seconds)<br>• An upload is never lost (durability)<br>• Very high availability, all over the world<br>• Low bandwidth cost (this is the biggest bill)<br>• Processing may take a little time (minutes are fine)` },
    },
    { type: 'callout', tone: 'term', title: 'New word: rebuffering', html: `<strong>What it is:</strong> the video stops while playing and a round spinner turns. This is called <strong>rebuffering</strong> (or a stall). The player's buffer has run out of video data to play next.<br><strong>Why it matters:</strong> for streaming companies this is the worst experience. People close the video and leave.<br><strong>In this design:</strong> ABR, the CDN and the buffer are all there to stop it.` },

    { type: 'h2', text: 'Step 2: napkin maths' },
    { type: 'p', html: `The upload rate comes from YouTube's blog (500 hours per minute, 2021). All other numbers are "let us assume" numbers, only to get a rough idea. Change the values:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="ytH">Upload: hours of video per minute</label><input id="ytH" type="number" value="500" min="1" step="10"></div>
          <div><label for="ytL">Bitrate of all qualities together (Mbps)</label><input id="ytL" type="number" value="10" min="1" step="1"></div>
          <div><label for="ytV">Viewers at the same time (millions)</label><input id="ytV" type="number" value="10" min="1" step="1"></div>
          <div><label for="ytB">Average bitrate of one viewer (Mbps)</label><input id="ytB" type="number" value="3" min="0.5" step="0.5"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>New video per day</span><strong class="ytD"></strong></div>
          <div class="stat"><span>New storage per day</span><strong class="ytS"></strong></div>
          <div class="stat"><span>Outgoing traffic to viewers</span><strong class="ytE"></strong></div>
        </div>
        <div class="calc-note ytN"></div>`;
      const q = s => el.querySelector(s);
      const upd = () => {
        const h = Math.max(0, +q('#ytH').value || 0), l = Math.max(0, +q('#ytL').value || 0);
        const v = Math.max(0, +q('#ytV').value || 0), b = Math.max(0, +q('#ytB').value || 0);
        const hoursDay = h * 60 * 24;
        const pb = hoursDay * 3600 * l * 1e6 / 8 / 1e15;
        const tbps = v * 1e6 * b * 1e6 / 1e12;
        q('.ytD').textContent = Math.round(hoursDay).toLocaleString('en-IN') + ' hours';
        q('.ytS').textContent = pb >= 1 ? pb.toFixed(2) + ' PB' : (pb * 1000).toFixed(0) + ' TB';
        q('.ytE').textContent = tbps.toFixed(0) + ' Tbps';
        q('.ytN').textContent = `If every hour of video is kept at ${l} Mbps (all qualities added together), one hour ≈ ${(3600 * l / 8 / 1000).toFixed(1)} GB. Two lessons: (1) storage grows by petabytes every day, so we need cheap object storage. (2) Outgoing traffic is in Tbps: no single data center can send this, so a CDN is a must.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `With the default values: 500 × 60 × 24 = 7,20,000 hours of new video every day, and at 10 Mbps each hour is ~4.5 GB, so <strong>~3.24 PB per day</strong>. And 1 crore people at 3 Mbps = <strong>30 Tbps</strong>. These two numbers drive the whole design.` },

    { type: 'h2', text: 'Step 3: API and core entities' },
    { type: 'code', text: `
# 1) Start an upload session (metadata + file size)
POST /videos?uploadType=resumable
  body: { "title": "Goa vlog", "size": 2147483648 }
  →  200 OK   Location: /upload/session/abc123      (session URL)

# 2) Send the bytes, in pieces
PUT /upload/session/abc123      Content-Range: bytes 0-8388607/2147483648
  →  308 Resume Incomplete      Range: bytes=0-8388607

# 3) Watch (the player gets the manifest, the segments come from the CDN)
GET /videos/v91/manifest.m3u8  →  list of qualities + segment URLs
GET https://cdn.xyz.com/v91/720p/seg_0042.m4s

# 4) View report (async, counted in batches)
POST /videos/v91/views   { "watched_s": 37 }   →  202 Accepted` },
    { type: 'table', head: ['Entity', 'What it holds', 'Where'], rows: [
      ['Video', 'id, owner, title, duration, status (UPLOADING → PROCESSING → READY), visibility', 'Metadata DB (sharded MySQL; Vitess at YouTube, deep dive 5)'],
      ['Rendition', 'video_id, codec, resolution, bitrate, manifest path. One video has 10-20 renditions', 'Metadata DB'],
      ['Segment', '2-6 second pieces of the video, separate for each rendition', 'Object storage + CDN (not in the DB)'],
      ['Raw upload', 'The creator\'s original file', 'Object storage (raw bucket)'],
      ['View count', 'video_id → approximate count', 'A separate counter store, updated in batches'],
    ]},

    { type: 'h2', text: 'Step 4: high-level design, from upload to READY' },
    { type: 'p', html: `The first half of the system: bringing the video in and making it ready to watch. It combines the <a href="#/pattern-blobs">large blobs</a> and <a href="#/pattern-long-tasks">long-running tasks</a> patterns. Before the diagram, here are its boxes one by one:` },
    { type: 'callout', tone: 'term', title: 'Box: Upload API (and session URL)', html: `<strong>What it is:</strong> a small server that only says "yes, you may upload", and gives a special URL where the file bytes must be sent (a session URL / <a href="#/object-storage">pre-signed URL</a>).<br><strong>Why we need it:</strong> to check the login, the file size and type, and to create the video's entry in the DB. The bytes themselves do not pass through it.<br><strong>Without it:</strong> either anyone could upload anything, or a 2 GB file would pass through our app server and keep it busy for minutes.` },
    { type: 'callout', tone: 'term', title: 'Box: object storage (raw and encoded)', html: `<strong>What it is:</strong> a service like S3 or Google Cloud Storage that keeps big files cheaply and safely (several copies of each file). We keep two "buckets" (folders): <em>raw</em> (the creator's original file) and <em>encoded</em> (the finished pieces and manifests).<br><strong>Why we need it:</strong> the napkin maths said petabytes arrive every day. A normal database or a server's disk cannot handle that.<br><strong>Without it:</strong> files could be lost, and the storage bill would be many times bigger.` },
    { type: 'callout', tone: 'term', title: 'Box: metadata DB', html: `<strong>What it is:</strong> a database with <em>information</em> about the video, not its bytes: title, owner, status (UPLOADING, PROCESSING, READY), and which qualities are ready.<br><strong>Why we need it:</strong> the watch page needs this small information in milliseconds, and the status tells us whether to show the video or not.<br><strong>Without it:</strong> nobody knows if a video is ready or only half made.` },
    { type: 'callout', tone: 'term', title: 'Box: orchestrator, queue and workers', html: `<strong>What it is:</strong> the <em>orchestrator</em> is a manager. It breaks the work for one video into small tasks ("turn chunk 17 into 720p"), puts them in a <a href="#/queues">queue</a> (a line of work), and keeps track of which ones are done. <em>Workers</em> are thousands of machines. Each one takes a task from the line, does it, and takes the next one.<br><strong>Why we need it:</strong> making 10 qualities of a one hour video on one machine would take hours. On thousands of machines at the same time, it takes minutes.<br><strong>Without it:</strong> the creator waits for hours, and if a machine crashes, all the work starts again from zero.` },
    { type: 'p', html: `Now run each scenario, and click the boxes to read their role.` },
    { type: 'flow', title: 'Upload and processing pipeline', height: 360,
      nodes: [
        { id: 'c', label: 'Creator', sub: 'app / browser', x: 75, y: 180, w: 120, kind: 'client', info: 'What it is: the user who uploads the video (Riya) and her app. Her phone sends the file in pieces (chunks), and remembers how much has already been sent.' },
        { id: 'api', label: 'Upload API', sub: 'makes a session', x: 250, y: 60, w: 140, kind: 'server', info: 'What it is: a small server that gives permission to upload. It checks the login, file size and type, creates the video row in the DB (status UPLOADING), and gives an upload session URL. The video bytes do not pass through it: they go straight to storage (pre-signed / session URL).' },
        { id: 'raw', label: 'Raw storage', sub: 'original file', x: 250, y: 300, w: 140, kind: 'data', info: 'What it is: a bucket in object storage (like S3/GCS), a cheap cupboard for big files that never loses them. The creator\'s original file is kept here. As soon as the upload is complete, it sends an event. We never delete the original: if a new codec comes tomorrow, we encode again from it.' },
        { id: 'db', label: 'Metadata DB', sub: 'Vitess / MySQL', x: 440, y: 60, w: 150, kind: 'data', info: 'What it is: the database with the video\'s details (only information, no bytes). The video row: title, owner, status, list of renditions. YouTube built Vitess to scale this MySQL (deep dive below).' },
        { id: 'orch', label: 'DAG orchestrator', sub: 'jobs + queue', x: 440, y: 180, w: 150, kind: 'queue', info: 'What it is: the manager that shares out the work. It breaks the processing of one video into a graph (DAG) of small tasks, puts the tasks in a queue, tracks which task depends on which, and runs failed tasks again.' },
        { id: 'w', label: 'Encode workers', sub: 'thousands', x: 630, y: 180, w: 130, kind: 'server', info: 'What it is: a big fleet of machines that compress video (stateless: they remember nothing themselves). Each worker does one small task, like "encode chunk 17 at 720p". According to Netflix (2015), they run on cloud instances, and if an instance shuts down suddenly, only that small task is redone.' },
        { id: 'out', label: 'Encoded storage', sub: 'segments → CDN', x: 630, y: 300, w: 150, kind: 'data', info: 'What it is: a second object storage bucket, for the finished product. The segments and manifest files of every quality are here. The CDN spreads exactly these files around the world.' },
      ],
      edges: [{ a: 'c', b: 'api' }, { a: 'c', b: 'raw' }, { a: 'api', b: 'db' }, { a: 'raw', b: 'orch' }, { a: 'orch', b: 'db' }, { a: 'orch', b: 'w' }, { a: 'w', b: 'raw' }, { a: 'w', b: 'out' }],
      scenarios: [
        { name: 'Upload', steps: [
          { title: 'Ask for a session', text: 'First the app only sends metadata: the title and file size. No video bytes yet.', go: 'c>api', msg: 'POST /videos?uploadType=resumable  { title, size: 2 GB }' },
          { title: 'Row in the DB, status UPLOADING', text: 'The API creates the video row and gives a session URL.', go: ['api>db', 'res:api>c'], after: { db: { sub: 'v91: UPLOADING' } }, msg: '200 OK   Location: /upload/session/abc123' },
          { title: 'Bytes go straight to storage', text: 'The file goes straight to storage in 8 MB pieces. The app server does not carry 2 GB.', flood: { paths: ['c>raw'], n: 6 }, after: { raw: { state: 'ok', sub: 'v91.mp4 (2 GB)' } }, msg: 'PUT /upload/session/abc123   Content-Range: bytes 0-8388607/2147483648' },
          { title: 'Upload complete: event', text: 'Storage sends a "file has arrived" event. The orchestrator starts work and the status becomes PROCESSING.', go: ['evt:raw>orch', 'orch>db'], after: { db: { sub: 'v91: PROCESSING' } } },
        ]},
        { name: 'Transcoding DAG', intro: 'Now we must make 10-20 renditions from one 2 GB file.', steps: [
          { title: 'Split the video into pieces', text: 'The orchestrator cuts the video into chunks (for example 1-3 minutes) and makes one task for each chunk × each quality. 60 minutes ÷ 3 = 20 chunks, × 10 qualities = 200 tasks.', focus: ['orch'], after: { orch: { sub: '200 tasks queued' } } },
          { title: 'Workers in parallel', text: 'Hundreds of workers take different chunks at the same time, and each reads only its own part of the raw file.', parallel: true, go: ['orch>w', 'w>raw', 'res:raw>w'], after: { w: { state: 'hot', sub: 'encoding...' } } },
          { title: 'Write the segments', text: 'Each encoded chunk is checked, then saved in encoded storage. When all chunks are there, they are assembled and packaged (HLS/DASH segments + manifest).', flood: { paths: ['w>out'], n: 6 }, after: { w: { state: '', sub: 'thousands' }, out: { state: 'ok', sub: '10 renditions' } } },
          { title: 'READY', text: 'The orchestrator sets the status to READY in the DB. Now the video can be watched.', go: ['res:w>orch', 'orch>db'], after: { db: { state: 'ok', sub: 'v91: READY' } } },
        ]},
        { name: 'Internet broke (resume)', intro: 'Riya was uploading 2 GB in the metro. At 1.2 GB the network went away.', steps: [
          { title: 'Upload broke in the middle', text: 'One chunk was lost on the way.', go: 'lost:c>raw', after: { c: { state: 'warn', sub: 'offline' } } },
          { title: 'Back online: ask how much arrived', text: 'The app sends an empty PUT: "how many bytes did you get?" The server says up to 1.2 GB. So there is no need to start from zero.', set: { c: { state: '', sub: 'online' } }, go: ['c>raw', 'res:raw>c'], msg: 'PUT /upload/session/abc123   Content-Range: bytes */2147483648\n→ 308 Resume Incomplete   Range: bytes=0-1288490187' },
          { title: 'Continue from there', text: 'Only the remaining 0.8 GB is sent. The session URL stays valid for some time (the service decides how long).', flood: { paths: ['c>raw'], n: 4 }, after: { raw: { state: 'ok', sub: 'complete' } } },
        ]},
        { name: 'A worker died', steps: [
          { title: 'Encoding is running', text: '200 tasks, the workers are busy.', go: 'orch>w', after: { w: { state: 'hot', sub: 'encoding...' } } },
          { title: 'One machine suddenly stops', text: 'The cloud took back a cheap (spot) instance. The 720p task of chunk 17 was running on it.', set: { w: { state: 'down', sub: 'chunk 17 lost' } }, focus: ['w'] },
          { title: 'Only one task again', text: 'The orchestrator noticed through a heartbeat/timeout. Only the chunk 17 task goes back to the queue. The other 199 tasks are not affected. If the whole video were on one machine, hours of work would be lost.', set: { w: { state: 'ok', sub: 'retry chunk 17' } }, go: ['orch>w', 'w>out'], after: { w: { state: '', sub: 'thousands' } } },
        ]},
      ],
    },
    { type: 'h2', text: 'Deep dive 1: resumable upload' },
    { type: 'p', html: `Problem: you send a 2 GB file in one single HTTP request and the internet goes at 90%. Everything starts again from zero. On mobile this happens every day. Solution: make the upload a <strong>session</strong>, where the server remembers how many bytes have arrived. The YouTube Data API's resumable upload protocol works exactly like this:` },
    { type: 'steps', items: [
      { t: 'Start the session', d: 'The first request has only the metadata and the file size. The <code>Location</code> header of the reply has a unique session URL.' },
      { t: 'PUT in pieces', d: 'Send the file in chunks. According to YouTube\'s docs, the chunk size must be a multiple of 256 KB (except the last chunk). For every chunk in the middle the server answers <code>308 Resume Incomplete</code>, and for the last one <code>201 Created</code>.' },
      { t: 'Broken? Ask for the status', d: 'Send an empty PUT with <code>Content-Range: bytes */TOTAL</code>. The server answers <code>308</code> and tells you in the <code>Range</code> header how many bytes it has.' },
      { t: 'Resume from there', d: 'Send from the next byte onwards. Nothing is sent twice.' },
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `The "Upload API" and the "storage" are not the same thing. The API server only gives permission and a session. The GBs of bytes go straight into object storage (<a href="#/object-storage">pre-signed URLs</a>). If 2 GB passed through the app server, it would stay busy for minutes and every GB would travel over the network twice.` },

    { type: 'h2', text: 'Deep dive 2: transcoding as a DAG' },
    { type: 'p', html: `The creator uploaded a video shot in 4K. But one viewer's phone is on 2G, another's TV is 4K. One file will not work for everyone. So every video must be turned into many versions. First three words:` },
    { type: 'callout', tone: 'term', title: 'A bit more detail: codec, bitrate, resolution', html: `We saw the basic idea in Step 0. Now a little deeper:<br><strong>Codec</strong>: the method used to compress video (H.264/AVC, HEVC, VP9, AV1). Newer codecs give the same quality in fewer bytes, but need more CPU to encode.<br><strong>Resolution</strong>: how many pixels the picture has (480p, 720p, 1080p, 4K).<br><strong>Bitrate</strong>: how many bits are used for one second of video (for example 3,000 kbps = 3 Mbps). More bitrate = more detail = more data.` },
    { type: 'callout', tone: 'term', title: 'A bit more detail: rendition and bitrate ladder', html: `<strong>Transcoding</strong>: decoding an encoded video and encoding it again in another codec, resolution or bitrate. Each output version is a <strong>rendition</strong>. The list of all renditions (for example from 240p up to 1080p @ 5,800 kbps) is called the <strong>bitrate ladder</strong>: like a ladder, each rung is one quality.` },
    { type: 'callout', tone: 'term', title: 'New word: DAG', html: `<strong>What it is:</strong> a DAG (Directed Acyclic Graph) is a map of jobs. Arrows say "this job comes after that job", and there is no loop (cycle). For example: first check the file, then cut it into pieces, then encode each piece, then join them.<br><strong>Why we need it:</strong> jobs that do not depend on each other (720p of chunk 3 and 240p of chunk 9) can run at the same time (in parallel). And if one fails, only that one job runs again.<br><strong>Without it:</strong> all jobs in one long line, one after another: slow, and if something breaks in the middle, we start again.` },
    { type: 'p', html: `Netflix described its pipeline in its 2015 post "High Quality Video Encoding at Scale" (the post is old, but the idea is still standard today). A simplified DAG based on it:` },
    { type: 'ascii', text: `
 raw file
    │
    v
 inspect      (validate, build an index, source fingerprints)
    │
    v
 split ──┬─> chunk 1 @ 240p  ─┐
         ├─> chunk 1 @ 720p  ─┤      check right after each task;
         ├─>   ...            ├─>    fail → retry only that task
         └─> chunk N @ 1080p ─┘
                    │
                    v
 assemble (each rung) ─> validate (fingerprint match) ─> package (HLS/DASH) ─> READY

 raw ──┬─> thumbnails
       ├─> captions        (these branches run in parallel with encoding)
       └─> moderation`, caption: 'Transcoding DAG (simplified). Arrow = "after this".' },
    { type: 'list', items: [
      `<strong>Inspect first:</strong> according to Netflix's post, they do not try to fix a bad source file. They reject it and ask the partner for it again ("garbage in, garbage out"). Inspection also runs in parallel on chunks, and this is where the source fingerprints are made.`,
      `<strong>Chunks in parallel:</strong> a long video is cut into chunks and encoded on thousands of machines at the same time. Each chunk is checked as soon as it is encoded, so a mistake is caught at once, with no wait for the whole movie to finish.`,
      `<strong>Assemble + validate:</strong> the chunks are joined, and the fingerprints of the encode are matched with the fingerprints of the source. This makes sure chunks were not joined in the wrong order and no frames were dropped or doubled at the edges.`,
      `<strong>Result:</strong> Netflix wrote that before chunked encoding, one 1080p movie could take <em>days</em>, and with the new pipeline a whole title was inspected and encoded in a few <em>hours</em>.`,
    ]},
    { type: 'callout', tone: 'term', title: 'Box: packager', html: `<strong>What it is:</strong> the last step of the DAG. It cuts the encoded video of each quality into 2-6 second pieces (segments) and writes the manifest (the list of pieces), in HLS and/or DASH format.<br><strong>Why we need it:</strong> the player only understands pieces and a manifest. From one encoded video we can make both HLS (Apple devices) and DASH (others).<br><strong>Without it:</strong> even an encoded video is useless to the player: no quick start, no quality switch.<br>In live video, the packager cuts a new piece every 4 seconds (<a href="#/design-hotstar">JioHotstar</a>). In VOD it runs once, for the whole video.` },
    { type: 'p', html: `See for yourself how much difference chunking makes. The CPU speed is an assumed number:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="ytcL">Video length (minutes)</label><input id="ytcL" type="number" value="60" min="1" step="1"></div>
          <div><label for="ytcC">Chunk length (minutes)</label><input id="ytcC" type="number" value="3" min="0.5" step="0.5"></div>
          <div><label for="ytcR">Ladder rungs (renditions)</label><input id="ytcR" type="number" value="10" min="1" step="1"></div>
          <div><label for="ytcW">Workers</label><input id="ytcW" type="number" value="200" min="1" step="10"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Tasks</span><strong class="ytcT"></strong></div>
          <div class="stat"><span>On one machine</span><strong class="ytcS"></strong></div>
          <div class="stat"><span>Chunked, parallel</span><strong class="ytcP"></strong></div>
          <div class="stat"><span>One crash = work lost</span><strong class="ytcX"></strong></div>
        </div>
        <div class="calc-note ytcN"></div>`;
      const q = s => el.querySelector(s), SP = 2;
      const fm = m => m >= 120 ? (m / 60).toFixed(1) + ' hours' : Math.round(m) + ' min';
      const upd = () => {
        const L = Math.max(1, +q('#ytcL').value || 1), C = Math.max(0.5, +q('#ytcC').value || 0.5);
        const R = Math.max(1, Math.round(+q('#ytcR').value || 1)), W = Math.max(1, Math.round(+q('#ytcW').value || 1));
        const chunks = Math.ceil(L / C), tasks = chunks * R, waves = Math.ceil(tasks / W);
        const serial = L * R * SP, par = waves * C * SP;
        q('.ytcT').textContent = tasks.toLocaleString('en-IN');
        q('.ytcS').textContent = fm(serial);
        q('.ytcP').textContent = fm(par);
        q('.ytcX').textContent = fm(C * SP);
        q('.ytcN').textContent = `Assume that encoding one minute of video into one rung takes ${SP} minutes of CPU. ${chunks} chunks × ${R} rungs = ${tasks} tasks, on ${W} workers that is ${waves} round(s). The smaller the chunk, the more parallel the work and the smaller the loss on a crash. But each chunk adds overhead, and the encoder can look less far forward and backward (Netflix also accepted this penalty). Time for assembling and packaging is added separately.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'h3', text: 'One ladder for everyone? Per-title encoding' },
    { type: 'p', html: `First design: the same ladder for every video. Netflix did this around 2010: one fixed ladder whose top rung was 1080p @ 5,800 kbps. Problem: videos are very different. A cartoon has big flat colours and little motion, so it looks clean with few bits. An action movie (explosions, water, film grain) still shows blocks in some places even at 5,800 kbps.` },
    { type: 'p', html: `The idea of Netflix's December 2015 post "Per-Title Encode Optimization": run trial encodes for each title, measure the quality, and build <strong>a ladder just for that title</strong>. Their examples:` },
    { type: 'table', head: ['Title (Netflix post, 2015)', 'Fixed ladder', 'Per-title ladder'], rows: [
      ['BoJack Horseman (simple animation)', 'Only 480p at 1,750 kbps', '1080p already starts at 1,540 kbps'],
      ['Orange Is the New Black (average)', 'Top rung 1080p @ 5,800 kbps', 'Top rung 1080p @ 4,640 kbps (~20% fewer bits, same quality)'],
      ['Complex action title', 'Artifacts even at 5,800 kbps', 'The top rung can go above 5,800'],
    ]},
    { type: 'p', html: `Play with it yourself. Below is an <strong>assumed model</strong> (not real VMAF, only to explain the idea): a quality score from 0 to 100 for each resolution, based on the bitrate and how complex the video is. The fixed ladder follows the points in the Netflix post: below 2,350 kbps it is 480p, from 2,350 to 4,299 it is 720p, from 4,300 up it is 1080p. Per-title picks the best resolution for this video at each bitrate.` },
    { type: 'custom', render(el) {
      const RES = [['480p', 0.41, 70], ['720p', 0.92, 85], ['1080p', 2.07, 96]], CX = { cartoon: 0.2, drama: 0.55, action: 1.3 }, K = 1200, BWS = [1050, 1750, 2350, 3000, 4300, 5800];
      const score = (r, b, c) => r[2] * (1 - Math.exp(-b / (c * r[1] * K)));
      const fixed = b => b < 2350 ? 0 : b < 4300 ? 1 : 2;
      el.innerHTML = `<div class="chips ptT" role="group" aria-label="Video type">
          <button type="button" class="chip" data-t="cartoon">Cartoon (flat colours)</button>
          <button type="button" class="chip" data-t="drama">Drama (average)</button>
          <button type="button" class="chip" data-t="action">Action (explosions, grain)</button>
        </div>
        <div class="chips ptB" role="group" aria-label="Bitrate" style="margin-top:6px">${BWS.map(b => `<button type="button" class="chip" data-b="${b}">${b.toLocaleString('en-IN')} kbps</button>`).join('')}</div>
        <div class="ptRows" style="margin-top:10px;display:grid;gap:6px"></div>
        <div class="stats">
          <div class="stat"><span>Fixed ladder: resolution · score</span><strong class="ptF"></strong></div>
          <div class="stat"><span>Per-title: resolution · score</span><strong class="ptP"></strong></div>
          <div class="stat"><span>Quality difference</span><strong class="ptD"></strong></div>
        </div>
        <div class="calc-note ptN"></div>`;
      const q = s => el.querySelector(s);
      let t = 'cartoon', b = 1750;
      const NOTE = {
        cartoon: 'A cartoon has little detail, so 1080p looks clean with few bits. The fixed ladder gives 480p at 1,750; per-title gives 1080p (Netflix saw exactly this with BoJack Horseman: 1080p already at 1,540 kbps). The top rungs (4,300 vs 5,800) are almost the same: those extra bits are wasted.',
        drama: 'For an average video the two ladders are quite close. The difference is at the edges: at the bottom 720p is better, and at the top the biggest rung can be a little smaller with the same quality (Netflix: the top rung of Orange Is the New Black was 4,640 instead of 5,800).',
        action: 'Action has a lot of detail and motion. At 4,300 kbps the many pixels of 1080p get too few bits each, so blocks appear; at this bitrate 720p is cleaner. Here per-title keeps the resolution lower, and it can also take the top rung above 5,800.',
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
    { type: 'p', html: `Try these: <strong>Cartoon + 1,750</strong>: fixed gives 480p (score 70), per-title gives 1080p (93). <strong>Action + 4,300</strong>: fixed gives 1080p (71), per-title gives 720p (81). <strong>Drama + 4,300</strong>: both give 1080p, no difference. The line that joins the "best" resolution at every bitrate is the convex hull (below).` },
    { type: 'callout', tone: 'why', title: 'Interview depth: convex hull and VMAF', html: `Each resolution has a bitrate range where it looks better than the other resolutions. At a low bitrate, the many pixels of 1080p get too few bits, so blocks appear; there, 720p is better. Joining the "best" parts of all resolutions gives a boundary that Netflix calls the <strong>convex hull</strong>, and the rungs of the ladder are chosen close to it. To measure quality, Netflix built <strong>VMAF</strong> (with the University of Southern California), a perceptual metric that tries to give a score the way a human eye would.` },
    { type: 'p', html: `And further: in Netflix's March 2018 post "Dynamic Optimizer", the unit changed from a <em>title</em> to a <strong>shot</strong>. A shot is a short part from one camera in which the frames are similar. A separate resolution and quality is chosen for each shot, and keyframes are placed at shot boundaries. According to the post, compared to fixed-QP encoding, this saved about 28-38% bitrate at the same quality across three codecs (x264, VP9, x265). All this is only possible when encoding is chunked and parallel: it needs more compute, but you encode once and stream crores of times.` },
    { type: 'callout', tone: 'tip', title: 'YouTube\'s answer: custom hardware', html: `YouTube has the opposite problem: far too many titles (500+ hours every minute), so such costly analysis for each one is hard. According to YouTube's April 2021 blog, they built their own chip for transcoding, the <strong>VCU (Video Coding Unit)</strong>, codename Argos, which was described as 20-33x more compute efficient than their earlier software-on-servers system. Lesson: when one job happens crores of times, even special hardware for that job can be cheaper.` },

    { type: 'h2', text: 'Deep dive 3: HLS/DASH and adaptive bitrate' },
    { type: 'p', html: `Now the watching part. First idea: send the whole 1080p file at once. Three problems: (1) Riya is in the metro, and her bandwidth changes every second; (2) to seek, you need a part from the middle; (3) if you stop after 5 minutes, the data for the rest of the file is wasted.` },
    { type: 'p', html: `Solution: cut every rendition into <strong>small segments</strong> (a few seconds each), and write in a <strong>manifest</strong> file which qualities exist and where their segments are. Before every segment, the player itself decides which quality to ask for. This is called <strong>adaptive bitrate (ABR)</strong> streaming.` },
    { type: 'callout', tone: 'term', title: 'A bit more detail: HLS, DASH, segment, buffer', html: `The words from Step 0, now with their names. <strong>HLS</strong> (HTTP Live Streaming, from Apple) and <strong>MPEG-DASH</strong> (an open standard) share the same idea: video = many small files, over normal HTTP. The HLS manifest is an <code>.m3u8</code> playlist, the DASH one is <code>.mpd</code>. <strong>Segment</strong>: one small file (Apple's HLS authoring guide suggests a target of 6 seconds). <strong>Buffer</strong>: the video ahead that the player has already downloaded, in seconds. Empty buffer = rebuffering.` },
    { type: 'code', text: `
# master.m3u8 (HLS): which qualities exist
#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=560000,RESOLUTION=512x288
360p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1750000,RESOLUTION=854x480
480p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1280x720
720p/index.m3u8

# 720p/index.m3u8: the segments of this quality
#EXT-X-TARGETDURATION:6
#EXTINF:6.0,
seg_0001.m4s
#EXTINF:6.0,
seg_0002.m4s` },
    { type: 'p', html: `Because segments are normal HTTP files, any CDN can cache them. And because the segments of every quality are aligned in time (segment 42 covers the same seconds in every rung), the player can take segment 41 in 720p and segment 42 in 360p. That is the whole switch.` },

    { type: 'h3', text: 'Simulator: how the player picks the quality' },
    { type: 'p', html: `Below is a seeded 3 minute network trace (the same every time). A segment is 4 seconds, the player buffers at most 30 seconds ahead, and the ladder rungs go from 235 to 5,800 kbps (an example ladder; the top rung is like Netflix's old fixed ladder). Change the network and the player logic, and move the time slider to see what is happening at each moment.` },
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
          <button type="button" class="chip" data-n="wifi">Home WiFi</button>
          <button type="button" class="chip" data-n="metro">Metro (2 tunnels)</button>
          <button type="button" class="chip" data-n="crowd">Crowded 4G</button>
        </div>
        <div class="chips ytaAlg" role="group" aria-label="Player logic" style="margin-top:6px">
          <button type="button" class="chip" data-a="high">Always 1080p (no ABR)</button>
          <button type="button" class="chip" data-a="rate">ABR: throughput-based</button>
          <button type="button" class="chip" data-a="buffer">ABR: buffer-based</button>
        </div>
        <svg class="ytaSvg" viewBox="0 0 640 262" style="width:100%;height:auto;display:block;margin-top:10px" role="img" aria-label="Bandwidth, chosen bitrate and buffer over time"></svg>
        <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:13px;color:var(--ink-3)">
          <span><span style="display:inline-block;width:14px;height:3px;background:var(--ink-3);vertical-align:middle"></span> network bandwidth</span>
          <span><span style="display:inline-block;width:14px;height:3px;background:var(--accent);vertical-align:middle"></span> rung chosen by the player</span>
          <span><span style="display:inline-block;width:14px;height:3px;background:var(--green);vertical-align:middle"></span> buffer (seconds)</span>
          <span><span style="display:inline-block;width:14px;height:10px;background:var(--red);opacity:.35;vertical-align:middle"></span> rebuffering</span>
        </div>
        <label for="ytaT" style="margin-top:8px">Time: <strong class="ytaTv"></strong></label>
        <input id="ytaT" type="range" min="0" max="179" value="60" style="width:100%">
        <div class="stats">
          <div class="stat"><span>Rebuffer events</span><strong class="ytaRb"></strong></div>
          <div class="stat"><span>Time stopped</span><strong class="ytaRs"></strong></div>
          <div class="stat"><span>Average bitrate</span><strong class="ytaAv"></strong></div>
          <div class="stat"><span>Quality switches</span><strong class="ytaSw"></strong></div>
          <div class="stat"><span>Time to start</span><strong class="ytaSt"></strong></div>
        </div>
        <div class="calc-note ytaN"></div>`;
      const q = s => el.querySelector(s), svg = q('.ytaSvg');
      let net = 'metro', alg = 'high', R = null;
      const X = t => 40 + t * 3.3, Y1 = k => 140 - Math.min(k, 9000) / 9000 * 125, Y2 = b => 250 - b / 30 * 70;
      const NOTE = {
        high: 'The player always asks for the top rung. If the network cannot give that speed, every segment is late, the buffer empties and the video stops. This works fine on fast WiFi, but not on mobile.',
        rate: 'The player estimates the speed from the download of the last 3 segments and picks a rung with an 80% safety margin. It stops less, but plays safe: even on fast WiFi it does not pick 5,800 because 0.8 × 7,000 < 5,800.',
        buffer: 'The first 3 segments are picked by speed, after that by looking at the buffer: below 8 s the lowest rung, above 24 s the top rung, and a straight line in between. The buffer is a shock absorber. A 2014 paper by Netflix and Stanford cut rebuffers by 10-20% with a buffer-based approach like this.',
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
        q('.ytaTv').textContent = `${t}s · network ${p.bw.toLocaleString('en-IN')} kbps · rung ${p.r.toLocaleString('en-IN')} kbps · buffer ${p.buf.toFixed(1)} s${st ? ' · STUCK' : ''}`;
      };
      el.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { net = b.dataset.n; draw(); });
      el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { alg = b.dataset.a; draw(); });
      q('#ytaT').addEventListener('input', cur);
      draw();
    }},
    { type: 'p', html: `What did you see? <strong>Metro + Always 1080p</strong>: it got stuck 19 times, stopped for ~97 seconds in 3 minutes, and took 7 seconds to start. On the same network, <strong>throughput-based ABR</strong>: zero rebuffers, average ~1,550 kbps. <strong>Buffer-based</strong>: zero rebuffers and average ~2,230 kbps, but the quality changed more often (19 switches vs 7). And on home WiFi even "always 1080p" worked fine: the problem is not high quality, it is not adapting to the network.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion: does the server change the quality?', html: `No. In ABR the server is "dumb": it only keeps files. Before every segment the <strong>player (client)</strong> decides which rung to ask for, by looking at its buffer and download speed. This is why segments can be cached on a CDN like normal files. Second confusion: "the best ABR = the highest average quality". In reality three things must be balanced: rebuffering (the worst), quality, and switching too often (it bothers the eye).` },

    { type: 'h2', text: 'Deep dive 4: CDN, Netflix Open Connect' },
    { type: 'p', html: `The napkin maths gave 30 Tbps. In the <a href="#/cdn">CDN lesson</a> we saw that a commercial CDN fetches from the origin on a cache miss (pull). Netflix took a different road. According to the official Open Connect overview, Netflix started building its own CDN in 2011, and its building block is the <strong>Open Connect Appliance (OCA)</strong>: cache servers built by Netflix that only store video files and serve them over HTTP/HTTPS.` },
    { type: 'p', html: `First three new words, because Open Connect is built around them.` },
    { type: 'callout', tone: 'term', title: 'New word: ISP and IX (internet exchange)', html: `<strong>What it is:</strong> an <strong>ISP</strong> (Internet Service Provider) is the company that gives you internet (Jio, Airtel, your local broadband). An <strong>IX</strong> is a building where many network companies connect their cables to one big switch, so they can pass data directly to each other. This direct exchange is called <strong>peering</strong>. Paying a big network to carry your data is called <strong>transit</strong>.<br><strong>Why we need it (in this design):</strong> the closer the video comes from the user's ISP, the faster it is, and the less money goes on transit.<br><strong>Without it:</strong> every video comes from a far data center, across many networks: more latency, more cost, and jammed routes at peak time.` },
    { type: 'image', src: 'assets/img/design-youtube/ix-switch-rack.jpg', alt: 'Network switch racks at the DE-CIX internet exchange in Frankfurt, with yellow fiber cables behind mesh doors', caption: 'Switch racks of an internet exchange (DE-CIX, Frankfurt), 2011. The yellow cables belong to different networks. CDNs like Netflix put their servers at IX points like this, so they can send video directly to many ISPs through peering.', credit: { text: 'Stefan Funke, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:DE-CIX_GERMANY_-_Switch_Rack_(6218137120).jpg', license: 'CC BY-SA 2.0' } },
    { type: 'callout', tone: 'term', title: 'Box: OCA (Open Connect Appliance)', html: `<strong>What it is:</strong> a cache server built by Netflix: many disks, which only keep video files and send them over HTTP/HTTPS. It sits inside an ISP or at an IX.<br><strong>Why we need it:</strong> Netflix's pieces sit closest to the user. The bytes do not travel on the big roads of the internet (the backbone) at all.<br><strong>Without it:</strong> every stream comes from far away, and Netflix would have to pay much more to commercial CDNs or for transit.` },
    { type: 'callout', tone: 'term', title: 'Box: control plane and steering', html: `<strong>What it is:</strong> the <em>control plane</em> = the services that make decisions (login, licence, which file, which server). They do not send the video bytes. Netflix's control plane is in the AWS cloud. <em>Steering</em> is the part of it that picks the best OCAs for each viewer, by looking at their health, which files they have, and network routes (BGP, the internet's system of "which road goes where").<br><strong>Why we need it:</strong> to pick the right one out of thousands of OCAs, and to never give a broken one to users.<br><strong>Without it:</strong> users would go to any OCA, maybe one that does not have the file, or one that is switched off.` },
    { type: 'list', items: [
      `<strong>Inside the ISP (embedded):</strong> Netflix gives OCAs for free to qualifying ISPs (like your broadband provider); the ISP gives power, space and network. The video never leaves your ISP's network.`,
      `<strong>At an internet exchange (IX):</strong> OCAs are also placed where many networks connect to each other, and they serve ISPs through peering.`,
      `<strong>Control plane in AWS:</strong> OCAs do not keep user data, viewing history or DRM information. Login, licence check, "which files are needed" and "from which OCA" are decided by services running in AWS.`,
      `<strong>Proactive fill:</strong> according to Netflix's 2016 post "Netflix and Fill", because Netflix can predict well what people will watch and when, most content is placed on OCAs in advance, during off-peak <em>fill windows</em> at night. A commercial CDN fills on demand; Open Connect fills in advance.`,
    ]},
    { type: 'flow', title: 'Netflix playback and Open Connect', height: 340,
      nodes: [
        { id: 'c', label: 'Viewer', sub: 'TV / phone', x: 80, y: 180, w: 120, kind: 'client', info: 'What it is: the Netflix app on a TV or phone, and its player. When you press play, it first talks to AWS, then takes the video bytes directly from an OCA. The ABR logic that picks the rung runs here.' },
        { id: 'play', label: 'Playback API', sub: 'AWS', x: 260, y: 60, w: 150, kind: 'server', info: 'What it is: a service in AWS that handles the play request. According to the official overview: is the user allowed? is there a licence? which files are needed for this device and network? All of this is decided in AWS.' },
        { id: 'steer', label: 'Steering', sub: 'cache control, AWS', x: 500, y: 60, w: 160, kind: 'server', info: 'What it is: the part of the control plane that picks an OCA for each viewer. OCAs regularly report their health, BGP routes and which files they have here. Steering uses this to choose the best OCAs for the client and builds their URLs.' },
        { id: 'isp', label: 'OCA in ISP', sub: 'embedded', x: 300, y: 290, w: 140, kind: 'edge', info: 'What it is: a Netflix cache server (OCA) inside the ISP\'s network. Closest to the user. The ISP itself decides which of its customers are routed to this OCA.' },
        { id: 'ix', label: 'OCA at IX', sub: 'peering', x: 520, y: 290, w: 140, kind: 'edge', info: 'What it is: an OCA placed in an internet exchange (IX) building. It serves many ISPs through peering, and during fill it can also be the source for other OCAs.' },
        { id: 's3', label: 'S3 origin', sub: 'encoded files', x: 650, y: 180, w: 110, kind: 'data', info: 'What it is: the store of the original copy (origin), Amazon S3 object storage. After encoding, all files are deployed to Amazon S3 (Netflix and Fill post). Not every OCA fills from S3; fill happens in tiers.' },
      ],
      edges: [{ a: 'c', b: 'play' }, { a: 'play', b: 'steer' }, { a: 'c', b: 'isp' }, { a: 'c', b: 'ix' }, { a: 'ix', b: 'isp' }, { a: 's3', b: 'ix' }, { a: 'isp', b: 'steer', dashed: true }, { a: 'ix', b: 'steer', dashed: true }],
      scenarios: [
        { name: 'Pressed play', steps: [
          { title: 'The app asks AWS', text: 'Login, subscription, licence and device check.', go: 'c>play', msg: 'POST /playback  { title: 81234, device: "android-tv" }' },
          { title: 'Which OCA?', text: 'The playback service asks steering. Steering knows which OCAs have these files, which are healthy, and which is closest to the user\'s network.', go: ['play>steer', 'res:steer>play'] },
          { title: 'URLs to the client', text: 'The client gets the URLs of OCAs, best one first.', go: 'res:play>c', msg: '{ urls: ["https://oca-isp-1...", "https://oca-ix-7..."] }' },
          { title: 'Video from inside the ISP', text: 'Segments come from the OCA inside the ISP. The bytes never travel on the internet backbone. The player picks a rung for every segment with ABR.', flood: { paths: ['res:isp>c'], n: 6 }, after: { isp: { state: 'hit', sub: 'serving' } } },
        ]},
        { name: 'Night fill', intro: 'A new popular series comes out tomorrow. Tonight it must reach the OCAs.', steps: [
          { title: 'Fill master from S3', text: 'The control plane picks some OCAs as "fill masters". They download the title from S3, during the off-peak window.', go: 'evt:s3>ix', after: { ix: { state: 'ok', sub: 'new title' } } },
          { title: 'Report: I have it now', text: 'The OCA tells the control plane that it now has the title.', go: 'evt:ix>steer' },
          { title: 'Nearby OCAs fill from it', text: 'Other OCAs now get a nearby OCA as their fill source instead of S3 (peer/tier fill). If all of them pulled from S3, it would be costly and slow.', go: ['evt:ix>isp', 'evt:isp>steer'], after: { isp: { state: 'ok', sub: 'new title' } } },
          { title: 'Morning: title is live', text: 'Once there are copies in enough places, the title is treated as "live". On release day there is no storm of misses from viewer demand.', focus: ['isp', 'ix'] },
        ]},
        { name: 'ISP OCA down', steps: [
          { title: 'The OCA fell', text: 'Hardware failure. It stops sending reports.', set: { isp: { state: 'down', sub: 'DOWN' } }, focus: ['isp'] },
          { title: 'A running stream\'s segment fails', text: 'The player\'s next segment request failed. The buffer still has a few seconds left, so the video is still playing.', go: 'bad:c>isp' },
          { title: 'Try the next URL', text: 'The client had more than one URL; it starts taking segments from the next OCA. (Netflix has not publicly detailed the exact fallback logic; giving more than one URL and trying the next one on failure is a common industry method.) It is a bit farther, so ABR may drop one rung.', flood: { paths: ['res:ix>c'], n: 5 }, after: { ix: { state: 'hot', sub: 'extra load' } } },
          { title: 'New users never get this OCA', text: 'Steering stops receiving reports, so this OCA is not given to new play requests. According to Netflix, they simply replace a broken appliance.', go: ['c>play', 'play>steer'] },
        ]},
      ],
    },
    { type: 'h2', text: 'Deep dive 5: metadata, and why YouTube built Vitess' },
    { type: 'p', html: `The video bytes are in object storage and the CDN. But title, owner, status, renditions, channel, playlists: this is small, structured data with relations. SQL is a natural fit for it. YouTube was on MySQL from the start.` },
    { type: 'p', html: `According to the official Vitess history, around 2010 YouTube's MySQL started to struggle at peak traffic. First they added read replicas, then they had to do <a href="#/sharding">sharding</a> for writes. Problem: writing the sharding logic in every app, a storm of connections, and one bad query could bring down the whole DB. The answer: a layer between the app and MySQL, <strong>Vitess</strong>. According to the docs, this let YouTube's user base grow more than 50x. Later Vitess became open source and graduated from the CNCF in November 2019; companies like Slack also use it.` },
    { type: 'callout', tone: 'term', title: 'Box: Vitess', html: `<strong>What it is:</strong> a layer in front of MySQL that makes many MySQL databases (shards) look like one big database to the app. <a href="#/sharding">Sharding</a> = splitting data across many databases, for example by video_id.<br><strong>Why we need it:</strong> one MySQL server has a limit on writes and connections. YouTube had gone past that limit.<br><strong>Without it:</strong> every app would have to remember which video is on which shard, there would be a storm of connections, and one bad query could bring down the whole DB.` },
    { type: 'callout', tone: 'term', title: 'Parts of Vitess', html: `<strong>VTGate</strong>: a proxy that speaks the MySQL protocol. The app thinks it is talking to a normal MySQL; VTGate sends the query to the right shard.<br><strong>VTTablet</strong>: an agent that runs next to every MySQL: connection pooling, safety checks on queries, handling replication.<br><strong>Topology service</strong>: a small, strongly consistent store (etcd, ZooKeeper or Consul) that records which shard is where and which one is the primary.` },
    { type: 'flow', title: 'Video metadata on Vitess', height: 320,
      nodes: [
        { id: 'app', label: 'App servers', sub: 'watch page', x: 80, y: 180, w: 120, kind: 'server', info: 'What it is: the xyz.com web/app servers that build the watch page. The watch page needs the video\'s title, channel and renditions. The app writes normal SQL and does not think about shards.' },
        { id: 'gate', label: 'VTGate', sub: 'query router', x: 260, y: 180, w: 130, kind: 'net', info: 'What it is: the Vitess router (proxy), between the app and all MySQL shards. It parses the query and checks whether the shard key (here video_id) is given. If yes, it goes straight to one shard; if not, to all shards (scatter). It packs thousands of app connections into small MySQL connection pools.' },
        { id: 'topo', label: 'Topology', sub: 'etcd / ZooKeeper', x: 260, y: 60, w: 150, kind: 'data', info: 'What it is: a small, reliable store that holds the map. The shard map and the current primary of each shard. After a failover it is updated here, and VTGate learns the new route from here.' },
        { id: 's1', label: 'Shard A', sub: 'VTTablet + MySQL', x: 470, y: 110, w: 160, kind: 'data', info: 'What it is: one MySQL database holding a part of the videos: the videos in one range of the video_id hash. A primary MySQL + its VTTablet.' },
        { id: 'rep', label: 'A replica', sub: 'standby', x: 645, y: 185, w: 120, kind: 'data', info: 'What it is: a live copy (replica) of Shard A. On a normal day it can take reads; if the primary falls, it can be promoted.' },
        { id: 's2', label: 'Shard B', sub: 'VTTablet + MySQL', x: 470, y: 260, w: 160, kind: 'data', info: 'What it is: the second MySQL shard, the other part of the hash range. To add shards, Vitess reshards and splits the range further.' },
      ],
      edges: [{ a: 'app', b: 'gate' }, { a: 'gate', b: 'topo' }, { a: 'gate', b: 's1' }, { a: 'gate', b: 's2' }, { a: 's1', b: 'rep' }, { a: 'gate', b: 'rep', id: 'g-rep', hidden: true }],
      scenarios: [
        { name: 'Query with shard key', steps: [
          { title: 'The app sends normal SQL', text: 'The app does not know about shards.', go: 'app>gate', msg: "SELECT title, channel_id, status FROM videos WHERE video_id = 'v91'" },
          { title: 'VTGate picks the shard', text: 'Hash of video_id → the range of Shard A. Only one shard is queried.', go: ['gate>s1', 'res:s1>gate'], after: { s1: { state: 'hit' } } },
          { title: 'Answer', text: 'One shard, one fast query. 99% of watch page queries should look like this.', go: 'res:gate>app' },
        ]},
        { name: 'Scatter query', intro: 'Now the query has no shard key.', steps: [
          { title: 'All videos of a channel', text: 'If the shard key is video_id, the videos of "channel X" can be on any shard.', go: 'app>gate', msg: "SELECT video_id FROM videos WHERE channel_id = 'c7' ORDER BY created DESC LIMIT 20" },
          { title: 'Ask every shard', text: 'VTGate runs the query on every shard and joins the results. With 2 shards it is fine, with 200 it is costly. Fix: a lookup table (channel → video_ids), called a lookup vindex in Vitess, or a separate table sharded by channel.', parallel: true, go: ['gate>s1', 'gate>s2'], after: { s1: { state: 'warn' }, s2: { state: 'warn' } } },
          { title: 'Merge and answer', text: 'Only as fast as the slowest shard. This is why the shard key is chosen by looking at the access pattern.', parallel: true, go: ['res:s1>gate', 'res:s2>gate'], after: { s1: { state: '' }, s2: { state: '' } } },
        ]},
        { name: 'Primary down', steps: [
          { title: 'Shard A\'s primary fell', text: 'Writes start failing. Shard B is not affected: sharding keeps the blast radius small.', set: { s1: { state: 'down', sub: 'PRIMARY DOWN' } }, go: 'bad:gate>s1' },
          { title: 'Promote the replica', text: 'Vitess failover tools (reparent; VTOrc for automatic) make the most up-to-date replica the new primary and update the topology.', set: { rep: { state: 'ok', sub: 'NEW PRIMARY' } }, go: 'evt:gate>topo', show: ['g-rep'] },
          { title: 'VTGate on the new primary', text: 'The app did not have to change anything. Writes from a few seconds were retried; with async replication there is a risk of losing the last few writes (remember the replication lesson).', go: ['app>gate', 'gate>rep', 'res:rep>gate', 'res:gate>app'] },
        ]},
      ],
    },
    { type: 'h2', text: 'Deep dive 6: view counts' },
    { type: 'p', html: `The direct way: on every view, <code>UPDATE videos SET views = views + 1 WHERE video_id = 'v91'</code>. If a viral video gets 1 lakh views per second, that is 1 lakh writes per second on <strong>one single row</strong>: a queue forms for the row lock, that shard's primary melts, and the watch page also slows down (same DB). This is the classic hot-row problem from <a href="#/pattern-writes">scaling writes</a>.` },
    { type: 'p', html: `Solution: make a view an <strong>event</strong>, count in memory, write in batches.` },
    { type: 'callout', tone: 'term', title: 'Box: event log (Kafka) and aggregator', html: `<strong>What it is:</strong> <a href="#/kafka">Kafka</a> is a long, append-only log: events are written in a line and kept for some days. It is split into <em>partitions</em> (separate lines). An <em>aggregator</em> is a small program that reads the log and counts in RAM.<br><strong>Why we need it:</strong> instead of sending crores of views straight to the DB, first collect them in one place, then add them up and write once.<br><strong>Without it:</strong> every view is a DB write, a viral video's one row gets lakhs of writes per second, and the DB falls over.` },
    { type: 'steps', items: [
      { t: 'Send an event', d: 'The player sends a "view happened" event (often after a few seconds of watching). The API answers <code>202 Accepted</code> at once, without even touching the DB.' },
      { t: 'Put it in the log', d: 'The event goes into a log like <a href="#/kafka">Kafka</a>, with partition key = video_id. All events of one video go into one partition, so one aggregator counts them.' },
      { t: 'Count in memory', d: 'The aggregator keeps a counter in RAM for each video: v91 → +8,43,000.' },
      { t: 'One write every N seconds', d: 'After N seconds, just one write: <code>views = views + 843000</code>. Instead of 1 lakh writes per second, 1 write every 10 seconds.' },
      { t: 'Validate', d: 'Bot and spam views are filtered in a separate pipeline. This is why the public count stays a little behind and approximate.' },
    ]},
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="ytvV">Viral video: views per second</label><input id="ytvV" type="number" value="100000" min="1" step="1000"></div>
          <div><label for="ytvN">Flush every how many seconds (N)</label><input id="ytvN" type="range" min="1" max="60" value="10"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Direct: row writes/sec</span><strong class="ytvA"></strong></div>
          <div class="stat"><span>Batch: row writes/sec</span><strong class="ytvB"></strong></div>
          <div class="stat"><span>Added in one write</span><strong class="ytvC"></strong></div>
          <div class="stat"><span>How old the count is (max)</span><strong class="ytvD"></strong></div>
        </div>
        <div class="calc-note ytvE"></div>`;
      const q = s => el.querySelector(s);
      const upd = () => {
        const v = Math.max(1, +q('#ytvV').value || 1), n = Math.max(1, +q('#ytvN').value || 1);
        q('.ytvA').textContent = v.toLocaleString('en-IN');
        q('.ytvB').textContent = (1 / n).toFixed(n === 1 ? 0 : 2);
        q('.ytvC').textContent = '+' + (v * n).toLocaleString('en-IN');
        q('.ytvD').textContent = n + ' s';
        q('.ytvE').textContent = `${(v * n).toLocaleString('en-IN')} times fewer writes; in return the count can be up to ${n} seconds old. If the aggregator crashes, the views in memory are lost, but the events are in Kafka: a new aggregator counts again from the last committed offset. If the count and the offset are not saved together (atomically), some views can be counted twice; for a view count this small error is fine, for money it is not.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `YouTube's official help page says the same thing: views are validated so that only human activity is counted, so the count may update late, YouTube may slow it down or freeze it for a while, and low quality playbacks (like the same video open in many tabs) may be thrown away. It also says that real-time analytics numbers may not match the watch page count. Meaning: <strong>the view count is approximate and eventually consistent on purpose</strong>.` },
    { type: 'callout', tone: 'tip', title: 'Unique viewers?', html: `To count "how many <em>different</em> people watched", remembering every user id is costly. There, a probabilistic structure like <a href="#/ds-for-scale">HyperLogLog</a> helps: crores of unique users in a few KB of memory with ~1% error (Redis HyperLogLog: ~0.81% in 12 KB).` },

    { type: 'h2', text: 'Deep dive 7: recommendations (high level)' },
    { type: 'p', html: `Problem: xyz.com has crores of videos, but the home page has room for only ~20. Which 20? YouTube's VP of Engineering wrote in a 2021 official blog post that in 2008 YouTube showed everyone the same "Trending" list, the videos with the most views. At that time most viewing came from search or outside links. Today, according to him, more viewing comes from recommendations than from subscriptions or search.` },
    { type: 'callout', tone: 'term', title: 'New word: recommendation system', html: `<strong>What it is:</strong> a system that guesses, for each user, which videos they will like, and shows those on the home page and in "Up next".<br><strong>Why we need it:</strong> to find the 20 useful videos for you out of crores, ones you would never find with your own searches.<br><strong>Without it:</strong> everyone sees the same popular videos. A person learning coding also gets movie trailers, and good videos from small creators never reach anyone.` },
    { type: 'p', html: `Scoring crores of videos with a big model on every request is far too slow: according to the paper, the serving budget is only a few tens of milliseconds. So YouTube's 2016 research paper (RecSys conference) splits the system into <strong>two stages</strong>. The paper is old and the models have surely changed since then, but the two-stage idea is still the industry standard today:` },
    { type: 'steps', items: [
      { t: 'Candidate generation (crores → hundreds)', d: 'A cheap, fast model looks at the user\'s watch history and searches and pulls out a few hundred "may like" videos. According to the paper, at serving time this is done with an approximate nearest neighbour lookup: turn users and videos into lists of numbers (embeddings), and pick the videos "closest" to the user.' },
      { t: 'Ranking (hundreds → a dozen or so)', d: 'Now there are only hundreds of videos, so a big, costly model scores each one with hundreds of features (how new the video is, how much the user watched this channel...). In the paper the score meant: how much time will the user watch if we show this video (expected watch time), not just a click.' },
      { t: 'Final list', d: 'After a few rules (the same channel should not repeat again and again, already watched videos should not come back), show the top scores on the home page.' },
    ]},
    { type: 'callout', tone: 'why', title: 'Why watch time, not clicks?', html: `According to YouTube's 2021 blog, in 2011 they saw that a click does not mean the user actually watched the video. A user clicks on a flashy thumbnail, and the video turns out to be something else (<em>clickbait</em>). In 2012 they made watch time a signal, and according to the blog, views dropped by ~20% at once, but they saw it as the right decision. Later, surveys (1-5 stars) for "valued watchtime", and likes, shares and dislikes, were added too.` },
    { type: 'p', html: `Below is a small xyz.com catalog (12 videos, assumed numbers). Pick interests, then change the ranking objective and see how clickbait moves up and down:` },
    { type: 'custom', render(el) {
      const V = [['10 best catches of IPL', ['cricket'], 8, 0.12, 0.7], ['Virat\'s century: highlights', ['cricket'], 20, 0.10, 0.6], ['SHOCKING! What did Dhoni just do??', ['cricket'], 10, 0.25, 0.1], ['Python in 1 hour', ['coding'], 60, 0.06, 0.35], ['Recursion in 5 minutes', ['coding'], 5, 0.09, 0.8], ['99% of coders do not know this trick!!', ['coding'], 8, 0.22, 0.12], ['Lo-fi beats for study', ['music'], 90, 0.05, 0.3], ['Arijit live concert', ['music'], 45, 0.08, 0.5], ['What is a black hole?', ['science'], 15, 0.08, 0.7], ['How a rocket flies', ['science'], 12, 0.07, 0.75], ['New movie trailer (trending)', ['trending'], 3, 0.15, 0.9], ['Physics of a cricket ball', ['cricket', 'science'], 14, 0.07, 0.8]];
      const TAGS = ['cricket', 'coding', 'music', 'science'];
      el.innerHTML = `<div style="font-size:13px;color:var(--ink-3)">What is in the user's history:</div>
        <div class="chips rcI" role="group" aria-label="Interests">${TAGS.map(t => `<button type="button" class="chip" data-i="${t}">${t}</button>`).join('')}</div>
        <div style="font-size:13px;color:var(--ink-3);margin-top:6px">Rank by:</div>
        <div class="chips rcO" role="group" aria-label="Objective">
          <button type="button" class="chip" data-o="click">Chance of a click</button>
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
        q('.rcN').textContent = `Out of 12 videos, ${cand.length} candidates are left (cheap filter: interests + trending). On real YouTube this goes from crores to hundreds. ` + (obj === 'click' ? `Ranked by clicks, the top 4 has ${bait} clickbait video(s): people click, then watch only 10-12% and leave.` : `Ranked by watch time (click × length × share watched), the top 4 has ${bait} clickbait. Long videos that people watch fully came to the top.`);
        el.querySelectorAll('[data-i]').forEach(b => b.classList.toggle('on', I.includes(b.dataset.i)));
        el.querySelectorAll('[data-o]').forEach(b => b.classList.toggle('on', b.dataset.o === obj));
      };
      el.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { const t = b.dataset.i; I = I.includes(t) ? I.filter(x => x !== t) : I.concat(t); draw(); });
      el.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { obj = b.dataset.o; draw(); });
      draw();
    }},
    { type: 'p', html: `With the default (cricket + coding): with the click objective, the top 2 are both clickbait (25% and 22% clicks). With the watch time objective, "Python in 1 hour" (1.26 min per impression) and "Virat's century" (1.20) are on top, and clickbait drops out of the top 4. This is the idea behind YouTube's 2012 change.` },
    { type: 'p', html: `<strong>Where does it sit in the system?</strong> The same watch events that go into Kafka for the view count are also the training data for recommendations. Models are trained offline (in batches, every few hours or days). When the home page opens, a <em>recommendation service</em> takes the user's recent history, pulls out candidates, ranks them, and returns the list. Public sources do not name the exact services; this split (offline training, online serving, one shared stream of events) is the common industry method. In a 2017 post, Netflix explained that it personalises not only the titles but also the thumbnail (artwork) of each title for each member: one person sees an image with an actor, another sees an action scene.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion: "recommendation = most popular"', html: `A popular list is the same for everyone, so it is only one candidate source (the "trending" one in the widget). A recommendation is personal: two people see different home pages at the same time. And "good" does not mean only a click: it is signals like watch time, surveys and likes put together.` },

    { type: 'h2', text: 'Failure scenarios and bottlenecks' },
    { type: 'table', head: ['What broke', 'Impact', 'Protection'], rows: [
      ['Upload broke in the middle', 'GBs of the creator\'s work', 'Resumable session: the server says how many bytes arrived, continue from there'],
      ['An encode worker died', 'The task of one chunk', 'Small idempotent tasks + retry; this is why Netflix can run on spot instances'],
      ['Bad source file', 'All renditions are bad', 'Inspection at the start; reject and ask again. Fingerprint match after assembly'],
      ['A poison video crashes the encoder every time', 'Workers die again and again', 'Retry limit, then a dead-letter queue + a human looks at it (queues lesson)'],
      ['The network dropped', 'Risk of rebuffering', 'ABR moves to a lower rung; the buffer is a shock absorber'],
      ['CDN node / OCA down', 'Viewers in that area', 'The client has several URLs; steering checks health and sends new users to another node'],
      ['New hit series, everyone at once', 'A storm of misses on the origin', 'Proactive fill: on the OCAs before release (Open Connect)'],
      ['Metadata shard primary down', 'Writes for videos on that shard', 'Promote a replica (Vitess reparent); other shards are normal'],
      ['Views of a viral video', 'Hot writes on one row', 'Events + in-memory aggregation + batch writes'],
      ['Recommendation service slow or down', 'Home page empty or slow', 'After a timeout, show a ready-made (cached) popular/trending list; the home page is never empty (common industry method)'],
    ]},
    { type: 'callout', tone: 'why', title: 'Where is the biggest cost?', html: `Compute is paid once (encode), bandwidth is paid on every view. This is why both companies invest so much in encoding: every 1% of bitrate saved is multiplied by crores of views. Netflix's per-title and per-shot encoding, YouTube's VCU chip, and Open Connect are all answers to this equation.` },

    { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>When to build your own CDN?</strong> When your video traffic is so big that working directly with ISPs is cheaper, and you can predict what will be watched (Netflix). Otherwise, a commercial CDN.<br><strong>How much encoding effort?</strong> Many views per title (Netflix) → per-title/per-shot analysis is worth it. Very many uploads and most videos watched little (YouTube) → first a cheap default ladder; re-encoding popular videos later in better codecs is a common industry approach.<br><strong>Segment length?</strong> Short segments = faster switching and start, but more requests; ~4-6 seconds is common in VOD.` },
    { type: 'h2', text: 'How to say it in an interview' },
    { type: 'list', ordered: true, items: [
      `<strong>Requirements:</strong> upload, process, watch. NFRs: smooth playback (few rebuffers), fast start, durability, global scale, bandwidth cost.`,
      `<strong>Numbers:</strong> petabytes of storage per day, Tbps of egress → object storage + a CDN are a must.`,
      `<strong>Upload:</strong> resumable chunked upload straight into object storage (pre-signed/session URL), status in the metadata DB.`,
      `<strong>Processing:</strong> event → DAG orchestrator → chunk × rung tasks on a queue → workers → assemble, validate, package HLS/DASH → READY. Mentioning per-title encoding is a bonus.`,
      `<strong>Playback:</strong> manifest + segments, client-side ABR, CDN (Open Connect: appliances inside ISPs, proactive off-peak fill).`,
      `<strong>Metadata:</strong> sharded MySQL via Vitess, shard key video_id, avoid scatter queries.`,
      `<strong>Counts:</strong> events → Kafka → aggregate → batch write; approximate and a little delayed.`,
      `<strong>Recommendations (if asked):</strong> two stages: cheap candidate generation (crores → hundreds), then a ranking model (on watch time), offline training, the same event stream.`,
    ]},
    { type: 'diagram', title: 'The whole design at a glance', height: 500,
      caption: 'Top: the video comes in and gets ready. Middle: watching (bytes from the CDN, decisions from the API). Bottom: events for views and recommendations. Use the buttons to see one path at a time.',
      groups: [
        { label: 'Upload and processing', x: 10, y: 26, w: 700, h: 212 },
        { label: 'Watch', x: 10, y: 260, w: 700, h: 104 },
        { label: 'Async events', x: 190, y: 384, w: 520, h: 102 },
      ],
      nodes: [
        { id: 'creator', label: 'Creator app', sub: 'sends chunks', x: 90, y: 80, kind: 'client', info: 'What it is: the app of the person uploading the video. It sends the file in small chunks and, if the internet breaks, resumes from the same point.' },
        { id: 'upapi', label: 'Upload API', sub: 'session URL', x: 270, y: 80, kind: 'server', info: 'What it is: a small server that gives permission. It checks the login and the file, gives a session URL and creates the video row (UPLOADING) in the DB. The bytes do not pass through it.' },
        { id: 'raw', label: 'Raw storage', sub: 'original file', x: 450, y: 80, kind: 'data', info: 'What it is: the object storage bucket with the creator\'s original file. It sends an event as soon as the upload is complete. We keep the original so we can encode again when a new codec arrives.' },
        { id: 'orch', label: 'DAG orchestrator', sub: 'tasks + queue', x: 630, y: 80, kind: 'queue', info: 'What it is: the manager that shares out the work. It breaks the video into chunk × quality tasks, puts them in a queue, retries failed tasks, and writes the status to the DB.' },
        { id: 'meta', label: 'Metadata DB', sub: 'MySQL + Vitess', x: 270, y: 200, kind: 'data', info: 'What it is: the database of video information (title, owner, status, qualities). Sharded MySQL, which Vitess makes look like one DB. Shard key video_id.' },
        { id: 'enc', label: 'Encoded storage', sub: 'pieces + manifest', x: 450, y: 200, kind: 'data', info: 'What it is: the bucket of the finished product: 2-6 s pieces of every quality and the manifest. The CDN takes its copies from here (or, at Netflix, fills from S3).' },
        { id: 'workers', label: 'Encode workers', sub: 'transcode, package', x: 630, y: 200, kind: 'server', info: 'What it is: thousands of machines, each doing one task at a time: encode a chunk in one quality, then join, check, and make the HLS/DASH pieces + manifest (packager).' },
        { id: 'viewer', label: 'Viewer player', sub: 'ABR', x: 90, y: 320, kind: 'client', info: 'What it is: the player on a phone or TV. It gets the manifest, then before every piece it checks the buffer and speed and picks a quality. It also sends the view events.' },
        { id: 'cdn', label: 'CDN / OCAs', sub: 'nearby caches', x: 270, y: 320, kind: 'edge', info: 'What it is: cache servers near the user (at Netflix, OCAs inside ISPs). All video bytes go out from here, and they are filled in advance at night (proactive fill).' },
        { id: 'play', label: 'API servers', sub: 'watch + home', x: 450, y: 320, kind: 'server', info: 'What it is: the servers of the watch page and home page. They check login/licence and give the metadata, the manifest URL and the right CDN server (steering). They do not send bytes.' },
        { id: 'reco', label: 'Recommendations', sub: '2 stages', x: 630, y: 320, kind: 'server', info: 'What it is: the service that builds the "for you" list on the home page. Candidate generation (crores → hundreds), then ranking (expected watch time). If it is down, show the popular list.' },
        { id: 'kafka', label: 'View events', sub: 'Kafka log', x: 270, y: 440, kind: 'queue', info: 'What it is: an append-only event log, partition key video_id. Every "view happened" event lands here. This one stream feeds both the view counts and the training of recommendations.' },
        { id: 'agg', label: 'Aggregator', sub: 'counts in RAM', x: 450, y: 440, kind: 'server', info: 'What it is: it reads the events and adds up each video\'s count in RAM, bots are filtered, and every N seconds it does one batch write. No more hot row.' },
        { id: 'counter', label: 'View counts', sub: 'approx, late', x: 630, y: 440, kind: 'data', info: 'What it is: a store of video_id → views. One write every N seconds. The watch page reads the count from here; it is a bit old and approximate, on purpose.' },
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
        { name: 'Upload', text: 'Creator → Upload API (session, UPLOADING in the DB) → chunks straight to raw storage → event → orchestrator → workers → pieces + manifest → READY in the DB.', go: ['creator>upapi>meta', 'creator>raw>orch>workers>enc', 'orch>meta'] },
        { name: 'Watch', text: 'The player gets the metadata and manifest URL from the API, then all pieces from the nearby CDN/OCA, and picks a quality with ABR for every piece.', go: ['viewer>play>meta', 'enc>cdn>viewer'] },
        { name: 'View count', text: 'The player sends a "view happened" event → Kafka → the aggregator counts in RAM → one batch write every N s → the watch page reads the approximate count.', go: ['viewer>kafka>agg>counter', 'play>counter'] },
        { name: 'Recommendations', text: 'As soon as the home page opens, the API asks the recommendation service for a list. The model learns offline from the same view events.', go: ['viewer>play>reco', 'kafka>reco'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Big uploads: the Upload API only gives permission and a session URL; the bytes go in chunks straight to object storage, and resume from the same point if the internet breaks.</li>
      <li>Transcoding is a DAG: break the video into chunk × quality tasks, run them in parallel on thousands of workers, and redo only the task that fails.</li>
      <li>Every video gets 10-20 qualities (a ladder). Netflix builds its own ladder for every title (and every shot): simple video with fewer bits, complex video with more.</li>
      <li>The packager makes pieces (segments) + a manifest. Before every piece, the player checks its buffer and speed and picks a quality (ABR). The decision is on the client.</li>
      <li>Bytes come from the CDN: Netflix Open Connect OCAs sit inside ISPs and at IXs, and are filled in advance at night. Decisions (login, which OCA) happen in the AWS control plane.</li>
      <li>Metadata is small and relational: sharded MySQL behind Vitess, shard key video_id.</li>
      <li>Views: events → Kafka → count in RAM → batch write. The count is approximate and a little late, on purpose.</li>
      <li>Recommendations: two stages (cheap candidates, then ranking on watch time), learning from the same event stream.</li>
    </ul>` },

    { type: 'tradeoffs', gains: [
      'Chunked parallel encoding: minutes instead of hours, small loss on a crash',
      'ABR: video plays on every network, very few rebuffers',
      'Segments are normal HTTP files: any CDN can cache them',
      'Open Connect: bytes come from inside the ISP, lower transit cost and latency',
      'Vitess: horizontal scale while staying on MySQL',
      'Batched view counts: no more hot row',
      'Two-stage recommendations: a personal list out of crores of videos in milliseconds',
    ], costs: [
      '10-20 copies of every video: storage many times bigger',
      'Encoding compute is very costly (YouTube even built a custom chip)',
      'With ABR the quality keeps changing; the buffer = a little behind live',
      'Your own CDN = hardware, ISP partnerships, an operations team',
      'Complexity of scatter queries and resharding',
      'View count is approximate and late',
      'Recommendations need a training pipeline, models, and watching for side effects like clickbait',
    ]},

    { type: 'think', questions: [
      { q: 'A creator uploaded a 3 hour 4K video and wants it "watchable" in 5 minutes. What will you change in the DAG?', a: 'First encode only the 2-3 lower rungs (for example 360p, 720p) and mark the video READY, and do the other rungs (1080p, 4K, newer codecs) later in the background. Since chunks are parallel, the time for one rung depends on the chunk length, not the video length. As soon as new rungs appear in the manifest, the player will start using them.' },
      { q: 'Where will this design break for a live cricket match?', a: 'The video is not available in advance, so proactive fill is impossible; encoding must happen in real time; segments must be short to keep the delay low; and crores of people ask for the same segment in the same second (a thundering herd at the CDN). For this, see the JioHotstar lesson: pre-scaling, CDN request collapsing, small buffers.' },
      { q: 'Netflix builds a per-title ladder for every title. Why is it hard for YouTube to do this for every video?', a: '500+ hours are uploaded every minute and most videos are watched very little. Spending trial-encode compute on every video is costly, while the savings only come from views. So it is wise to spend effort based on popularity.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'In ABR, who decides the quality of the next segment?', options: ['The CDN server', 'The encoding pipeline', 'The player (client), by looking at its buffer and download speed', 'The metadata DB'], answer: 2, explain: 'The server only keeps files. Before every segment the player picks a rung, so segments can stay normal, cacheable HTTP files.' },
      { q: 'Why does Netflix cut a video into chunks before encoding?', options: ['Chunks have better quality', 'Parallel encoding cuts the time, and on a machine crash only one chunk is redone', 'The CDN only understands chunks'], answer: 1, explain: 'According to Netflix\'s 2015 post, chunked encoding turned days of work into hours, and when a spot instance shuts down only a small task is rescheduled.' },
      { q: 'What is the "proactive fill" of Open Connect?', options: ['Fetching from the origin when a user asks', 'Predicting popularity and placing content on OCAs in advance, during off-peak hours at night', 'Every OCA always has the whole catalog'], answer: 1, explain: 'Commercial CDNs often fill on demand. Netflix can predict what will be watched, so it fills in advance during fill windows.' },
      { q: 'The best design for the view count of a viral video?', options: ['UPDATE views = views + 1 on every view', 'Put events in a log, count in memory, one batch write every few seconds', 'A new row for every view, then COUNT(*) on every page load'], answer: 1, explain: 'To avoid a hot row, aggregate and then write. The count will be a little late and approximate, which is fine for this use case.' },
      { q: 'In Vitess, what happens if the query has no shard key?', options: ['The query fails', 'VTGate runs the query on every shard (scatter) and joins the results', 'An answer from a random shard'], answer: 1, explain: 'Scatter queries work but are costly. Common access patterns need a shard key or a lookup vindex.' },
      { q: 'Why is a recommendation system split into two stages (candidate generation + ranking)?', options: ['To split the work between two teams', 'Scoring crores of videos with a costly model on every request is far too slow; a cheap stage picks hundreds, and the costly model ranks only those', 'So that clickbait comes to the top'], answer: 1, explain: 'In YouTube\'s 2016 paper, candidate generation brings crores down to hundreds, then the ranking model scores only those hundreds with hundreds of features, on expected watch time.' },
    ]},
    { type: 'sources', note: 'The specific Netflix and YouTube claims come from these sources. The year of older posts is given next to them; many details have probably changed since.', items: [
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
