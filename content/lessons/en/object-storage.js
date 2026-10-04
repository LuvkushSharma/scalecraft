Lesson.register({
  id: 'object-storage',
  title: 'Object storage and pre-signed URLs',
  minutes: 32,
  summary: `Photos, videos, PDFs and backups do not go in the database. They go to object storage (S3, GCS, Azure Blob), and the database keeps only their address (a pointer). In this lesson: block vs file vs object storage, direct uploads with pre-signed URLs, multipart and resumable uploads, dedupe with chunking + hashing, GFS/HDFS from the inside, replication vs erasure coding, and hot/cold/archive tiers.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `People put videos and photos on xyz.com. These files are very big.<br>A database is built to keep small facts (names, likes, comments), not big files.<br>So the big files go into a separate, very cheap and very large "warehouse". The database only remembers which file sits in the warehouse under which name.<br>In this lesson we learn how that warehouse works, how a phone puts a file straight into it, and how to keep crores of files cheap and safe.` },
    { type: 'h2', text: 'Problem: where do we keep a 2 GB video?' },
    { type: 'p', html: `In the queues lesson, xyz.com became a video platform: users upload videos, and workers transcode them. But we skipped one question: <strong>where does the video file actually live?</strong>` },
    { type: 'p', html: `First idea: put it in the database, in a <code>BLOB</code> column. At small scale this even works. Then xyz.com starts getting 1 lakh videos a day, each about 500 MB. That is <strong>50 TB</strong> of new data every day. Look at what breaks:` },
    { type: 'list', items: [
      `<strong>The database swells up.</strong> Database disks are expensive SSDs, and all the indexes, backups and replicas now carry this heavy data too. A backup that took 10 minutes now takes 10 hours.`,
      `<strong>Replication lag.</strong> Every 500 MB video is copied from the primary to every replica. Small user and comment writes get stuck behind it in the line.`,
      `<strong>App servers get stuck too.</strong> A 2 GB file travels from the user's phone to the app server, and then onwards. One upload holds a connection and memory for 10 minutes. With 200 uploads at once, users who just want the homepage wait in line.`,
      `<strong>Useless features.</strong> Joins, transactions and indexes do nothing for a video. We only need "keep these bytes, give them back later".`,
    ]},
    { type: 'callout', tone: 'term', title: 'Blob', html: `<strong>What it is:</strong> Blob (Binary Large OBject) means any big file that the system treats as just "a pile of bytes": a photo, a video, a PDF, a backup. The system does not care what is inside.<br><strong>Why we need it:</strong> the name exists because we want to treat these files differently from normal data (names, numbers).<br><strong>Without it:</strong> we would squeeze videos into the database like normal rows, and get all the problems above.` },
    { type: 'callout', tone: 'term', title: 'Object storage', html: `<strong>What it is:</strong> a service that stores blobs. You give it bytes together with a <strong>key</strong> (the full name of the file, like <code>videos/u42/trip.mp4</code>). It keeps them cheaply and safely, and gives them back over the internet (HTTP). Think of a huge warehouse where every box has a unique label.<br><strong>Why we need it:</strong> xyz.com must keep 50 TB of videos a day, cheaply, without losing any, and show them to the whole world.<br><strong>Without it:</strong> the database swells, expensive SSDs fill up, and backups run for hours.<br><strong>Example:</strong> Amazon S3, Google Cloud Storage (GCS) and Azure Blob Storage are the three biggest names.` },
    { type: 'compare',
      left: { title: 'Before: everything in the DB', ascii: `
App
 ↓
Database
  users, comments
  + 50 TB videos/day  (BLOB)
  backups: 10 hours
  replicas: lag` },
      right: { title: 'Now: only a pointer in the DB', ascii: `
App
 ├─> Database (small, fast)
 │     video_id, owner, title,
 │     s3_key, size, status
 │
 └─> Object storage (S3)
       videos/u42/trip.mp4
       (the bytes live here)` },
    },

    { type: 'h2', text: 'Block vs file vs object storage' },
    { type: 'p', html: `Storage comes in three shapes. Each one answers a different question, so in an interview this difference must be clear.` },
    { type: 'callout', tone: 'term', title: 'Block storage', html: `<strong>What it is:</strong> a "raw disk". Data lives in small <strong>blocks</strong> of the same size (for example 4 KB), and every block has a number. The disk knows nothing about files or folders. The operating system (its file system) or a database on top decides which block belongs to what. Usually only one machine uses it at a time.<br><strong>Why we need it:</strong> a database must change 4 KB in the middle of a big file again and again, very fast. Block storage gives exactly that, in under a millisecond.<br><strong>Without it:</strong> the database would have to rewrite a big file for every small update. Very slow.<br><strong>Example:</strong> your laptop's SSD, an AWS EBS volume (the disk of a cloud machine).` },
    { type: 'callout', tone: 'term', title: 'File storage', html: `<strong>What it is:</strong> the same folders and files you see every day: <code>/reports/2025/march.pdf</code>. When this tree is shown to many machines at once over the network, it is called a <strong>shared file system</strong> (NFS, AWS EFS, Azure Files). You can change a few bytes in the middle of a file, rename it, or lock it.<br><strong>Why we need it:</strong> when many servers need exactly the same files with normal file paths (for example an old app that writes files to disk).<br><strong>Without it:</strong> every server has its own copy, and the copies drift apart.` },
    { type: 'callout', tone: 'term', title: 'Bucket, key and object', html: `<strong>What it is:</strong> the three parts of object storage. <strong>Bucket</strong> = one big container (like <code>xyz-videos</code>). <strong>Key</strong> = the full name of a file inside the bucket. <strong>Object</strong> = the bytes + some information about them (metadata: type, size, tags). The world is <strong>flat</strong>: no real folders, just key → object. Access is over HTTP: <code>PUT</code> (store), <code>GET</code> (read), <code>DELETE</code> (remove).<br><strong>Why we need it:</strong> a flat world is easy to spread over thousands of machines, so the size is almost unlimited and the price per GB is very low.<br><strong>Without it (the price we pay):</strong> you cannot edit an object in the middle. To change even 1 byte, you write a whole new object.` },
    { type: 'table', head: ['', 'Block', 'File', 'Object'], rows: [
      ['What it looks like', 'Numbered blocks, a raw disk', 'A tree of folders', 'Bucket + flat keys'],
      ['How you access it', 'Through the OS / DB, like a disk', 'NFS/SMB, normal file paths', 'HTTP API (PUT/GET)'],
      ['Edit in the middle', 'Yes, very fast', 'Yes', 'No, rewrite the whole object'],
      ['How many machines', 'Usually one', 'Many, shared', 'Any, even over the internet'],
      ['Latency', 'Under a millisecond', 'A few milliseconds', 'More than a few ms (every request is HTTP)'],
      ['Example', 'AWS EBS, laptop SSD', 'AWS EFS, NFS server', 'S3, GCS, Azure Blob'],
      ['In xyz.com', 'The Postgres data disk', 'Shared reports of an old tool', 'Videos, thumbnails, backups'],
    ]},
    { type: 'callout', tone: 'mistake', title: 'Beginner mistake: "S3 has folders, right?"', html: `The S3 console shows folders, but underneath it is one flat list. <code>videos/u42/trip.mp4</code> is one whole key; the "/" is just part of the name. The console groups keys by their <strong>prefix</strong> (the start of the name) so they look like folders. That is why "rename a folder" is not one operation in S3: every key inside must be copied and then deleted.` },
    { type: 'p', html: `The difference makes more sense when you <strong>do</strong> it than when you read it. Pick a job below and see how each of the three storage types handles it:` },
    { type: 'custom', render(el) {
      const KINDS = ['Block', 'File', 'Object'];
      const VIEW = [
        'Disk: [#0][#1][#2][#3]...\n#812 → part of trip.mp4\n(only numbers, the OS remembers names)',
        '/videos/\n  u42/\n    trip.mp4\n    goa.mp4',
        'bucket: xyz-videos\n"videos/u42/trip.mp4" → bytes\n"videos/u42/goa.mp4"  → bytes',
      ];
      const TASKS = [
        { name: 'Change 4 KB in the middle of a 10 GB file', r: [
          ['good', 'Write the new 4 KB straight onto block #812. Just one block.', '~0.1 ms'],
          ['good', 'Open the file and write 4 KB at that position. One small call over the network.', 'a few ms'],
          ['bad', 'You cannot edit in the middle. Upload a whole new 10 GB object.', '10 GB ÷ 100 MB/s ≈ 100 s'] ] },
        { name: '50 servers read the same files', r: [
          ['bad', 'A disk is usually attached to one machine only. 50 servers need 50 copies.', '50 copies'],
          ['good', 'All 50 servers mount the same shared folder. They all see the same tree.', '1 copy'],
          ['good', 'They all read with an HTTP GET. No mounting, no limit.', '1 copy'] ] },
        { name: 'Show a photo to 1 crore users', r: [
          ['bad', 'The disk is inside one machine. Nobody on the internet can reach it directly.', 'you must build a server'],
          ['bad', 'A shared folder is for inside an office or data center, not for the internet.', 'you must build a server'],
          ['good', 'Every object has an HTTP URL. Put a CDN in front and crores of users read it directly.', 'URL + CDN'] ] },
        { name: 'Keep 5 PB of old videos cheaply', r: [
          ['bad', 'Fast disk, highest price per GB. A single disk this big does not even exist.', 'most expensive'],
          ['ok', 'Possible, but a GB on a shared file system is also expensive.', 'expensive'],
          ['good', 'Built for this: cheap GB, and old data in cheaper "cold" tiers (coming up).', 'cheapest'] ] },
      ];
      const COL = { good: 'var(--green)', ok: 'var(--amber)', bad: 'var(--red)' };
      const WORD = { good: 'Great fit', ok: 'Works', bad: 'Wrong tool' };
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
        const best = KINDS.filter((k, i) => T.r[i][0] === 'good').join(' and ');
        el.querySelector('.osBfoN').textContent = `"${T.name}": the right tool = ${best} storage. No single storage type is best at every job, so xyz.com uses all three: the DB disk is block storage, the videos are in object storage.`;
      };
      draw();
    }},

    { type: 'h2', text: 'S3, GCS, Azure Blob: what do they promise?' },
    { type: 'p', html: `All three use the same model (bucket/container + key + object). The names differ a little: Azure calls a bucket a <strong>container</strong> and an object a <strong>blob</strong>. We will look at the S3 numbers because S3 is the most used:` },
    { type: 'table', head: ['Thing', 'In S3', 'What it means'], rows: [
      ['Durability (design)', '99.999999999% ("11 nines") per year', 'AWS gives its own example: store 1 crore objects and on average you can expect to lose one object every 10,000 years. This is a design target. Data is kept in at least 3 Availability Zones in a region. An Availability Zone = a separate data center near a city (its own power, its own network), so a fire in one building does not touch the other.'],
      ['Availability (S3 Standard)', '99.99% design', 'Up to about 53 minutes a year of "not reachable right now". Durability (data is not lost) and availability (you can get it right now) are different things.'],
      ['Consistency', 'Strong read-after-write (since Dec 2020)', 'If a PUT succeeds, the next GET and LIST show the new data. Before that, after an overwrite or delete you could see old data for a short time.'],
      ['Size of one object', 'Max ~50 TB (since Dec 2025; before that 5 TB)', 'A single PUT can carry at most 5 GB. Bigger than that? Multipart upload is required.'],
      ['Multipart parts', '1 to 10,000 parts, each part 5 MiB to 5 GiB (the last part can be smaller)', '10,000 × 5 GiB ≈ 48.8 TiB, which is the max object size.'],
    ], caption: 'Numbers from the official AWS docs (sources below). Other clouds have slightly different numbers, but the idea is the same.' },
    { type: 'callout', tone: 'term', title: 'Durability vs availability', html: `<strong>What it is:</strong> two different questions. <strong>Durability</strong> = will the data ever be lost? (A disk died, a data center burned, are the bytes still safe?) <strong>Availability</strong> = can I get it right now, this second?<br><strong>Why we need it:</strong> you prepare for each one differently. For durability, keep copies in different buildings. For availability, have backup routes and fast failover.<br><strong>Without it:</strong> people hear "99.99%" and think the data is 99.99% safe. Wrong: that number is availability.<br><strong>Example:</strong> object storage cares a lot about durability. If a video does not open for 5 minutes, that is fine. If a video is lost forever, it never comes back.` },

    { type: 'h2', text: 'Pre-signed URLs: the bytes never pass through the app server' },
    { type: 'p', html: `We decided to keep the data in S3. But the upload path is still wrong: phone → app server → S3. Every GB travels over the network twice, and an app server connection stays busy for 10 minutes. Better: the phone uploads <strong>straight to S3</strong>. But S3 is private; if we let anyone write, anyone can fill it with anything. The answer: a <strong>pre-signed URL</strong>.` },
    { type: 'callout', tone: 'term', title: 'Signature (digital signature)', html: `<strong>What it is:</strong> a long code made with maths from a message and a <em>secret key</em>. Change even one letter of the message and the code changes completely. And without the secret, nobody can make the correct code.<br><strong>Why we need it:</strong> S3 must be sure that "this permission really came from the xyz.com server, and nobody changed it on the way".<br><strong>Without it:</strong> anyone could change the key or the expiry in the URL and overwrite someone else's file.` },
    { type: 'callout', tone: 'term', title: 'Pre-signed URL', html: `<strong>What it is:</strong> a normal S3 URL with a few extra parts added: which bucket, which key, which action (PUT = upload, GET = download), how long it is valid (expiry), and a <strong>signature</strong> over all of these made with the app server's secret key. Think of a one-time entry pass: "only this one room, only until 4 pm today".<br><strong>Why we need it:</strong> the phone uploads straight to S3, but only that one file, and only for a short time.<br><strong>Without it:</strong> either the bytes pass through the app server (slow, expensive), or the bucket is open to everyone (anyone can fill it).<br><strong>Bonus:</strong> making the URL does not even need a call to S3. The app server builds it inside itself with maths. Same idea as the JWT lesson: sign with a secret, and the other side checks it.` },
    { type: 'flow', title: 'Video upload with a pre-signed URL', height: 340,
      nodes: [
        { id: 'c', label: 'Mobile app', sub: 'Riya, 2 GB video', x: 80, y: 170, w: 140, kind: 'client', info: 'What it is: Riya\'s phone with the xyz.com app. The upload goes from here straight to S3. It only asks the app server for permission (the URL).' },
        { id: 'app', label: 'App server', sub: 'only gives a URL', x: 290, y: 60, w: 150, kind: 'server', info: 'What it is: xyz.com\'s own server (our code). In this design it only gives permission. It checks: is Riya logged in? Are the file size and type allowed? Then it creates a PENDING row in the DB and signs a pre-signed PUT URL. The video bytes never pass through it.' },
        { id: 'db', label: 'Metadata DB', sub: 'videos table', x: 290, y: 280, w: 150, kind: 'data', info: 'What it is: xyz.com\'s normal database. One row per video: video_id, owner, s3_key, size, status (PENDING / UPLOADED / READY). No bytes, only the address and the state.' },
        { id: 's3', label: 'S3 bucket', sub: 'xyz-videos', x: 510, y: 170, w: 150, kind: 'data', info: 'What it is: the object storage container where the real bytes live. It checks the signature and expiry on every request. When an upload finishes it can send a small message by itself (an S3 event notification): to a queue, or to other AWS services.' },
        { id: 'q', label: 'Queue', sub: 'upload events', x: 640, y: 60, w: 130, kind: 'queue', info: 'What it is: a line of messages. The S3 "ObjectCreated" (file created) event arrives here. The same pattern as the queues lesson: write the job down, and a worker does it at its own speed.' },
        { id: 'w', label: 'Worker', sub: 'status, thumbnail', x: 640, y: 280, w: 130, kind: 'server', info: 'What it is: a program that runs in the background. It reads the event, sets the status to UPLOADED in the DB, and then starts jobs like the thumbnail and transcoding.' },
      ],
      edges: [{ a: 'c', b: 'app' }, { a: 'app', b: 'db' }, { a: 'c', b: 's3' }, { a: 's3', b: 'q' }, { a: 'q', b: 'w' }, { a: 'w', b: 'db' }, { a: 'w', b: 's3' }],
      scenarios: [
        { name: 'Upload (happy path)', steps: [
          { title: 'The app asks for permission', text: 'It does not send the video, only a small JSON: "I want to upload a 2 GB mp4".', go: 'c>app', msg: 'POST /videos/upload-url\n{ "size": 2147483648, "type": "video/mp4" }' },
          { title: 'Server checks and adds a PENDING row', text: 'Login check, size limit check (say max 5 GB), then a row: status = PENDING. The server picks the key, not the user, so nobody can overwrite someone else\'s file.', go: ['app>db', 'res:db>app'], after: { db: { sub: 'v91: PENDING' } }, msg: 'INSERT videos (id=v91, owner=42, key="videos/42/v91.mp4", status="PENDING")' },
          { title: 'The URL is signed without calling S3', text: 'The server signs the URL with its secret key: method PUT, this key, 15 minute expiry. This takes a few microseconds.', focus: ['app'], msg: 'https://xyz-videos.s3.amazonaws.com/videos/42/v91.mp4\n  ?X-Amz-Expires=900&X-Amz-Signature=8f3c...&...' },
          { title: 'The app gets the URL', text: 'The app server\'s work is done. This request took milliseconds, not minutes.', go: 'res:app>c' },
          { title: 'The phone uploads straight to S3', text: 'Now the 2 GB go straight into S3. S3 checks the signature: it is correct, not expired, and the method and key match. The upload starts. (For a file this big, it would really be a multipart upload, which we see next.)', go: 'c>s3', after: { s3: { sub: 'v91.mp4 saved' } }, msg: 'PUT <pre-signed URL>\nContent-Type: video/mp4\n<2 GB bytes>' },
          { title: 'S3: 200 OK', text: 'S3 has saved the file durably.', go: 'res:s3>c', msg: '200 OK  ETag: "9b2cf5..."' },
          { title: 'S3 itself says: the file has arrived', text: 'We do not trust the client\'s word ("I uploaded it"). S3\'s own event goes into the queue, and the worker updates the DB and starts processing.', go: ['evt:s3>q', 'evt:q>w', 'w>db'], after: { db: { sub: 'v91: UPLOADED' } }, msg: 'event: ObjectCreated:Put  key=videos/42/v91.mp4  size=2147483648' },
        ]},
        { name: 'Download (watching)', intro: 'A private video: only the owner and their friends can watch it.', steps: [
          { title: 'The app asks for the video', text: 'The server checks permission: can this user watch this video?', go: ['c>app', 'app>db', 'res:db>app'], msg: 'GET /videos/v91' },
          { title: 'Pre-signed GET URL', text: 'This time the method is GET and the expiry is short (say 10 minutes). For public videos we usually give a CDN URL, so the caching from the CDN lesson helps.', go: 'res:app>c', msg: '{ "url": "https://xyz-videos.s3.amazonaws.com/videos/42/v91.mp4?X-Amz-Expires=600&X-Amz-Signature=..." }' },
          { title: 'Bytes straight from S3 (or the CDN)', text: 'Again, no load on the app server.', go: ['c>s3', 'res:s3>c'], after: { s3: { state: 'hit' } } },
        ]},
        { name: 'Failure: URL expired', intro: 'Riya got the URL, then put her phone in her pocket. She pressed upload 20 minutes later.', steps: [
          { title: 'URL received (15 min expiry)', text: 'All normal.', go: ['c>app', 'res:app>c'] },
          { title: 'Upload 20 minutes later', text: 'S3 checks the time: the signature has expired. The request is rejected. A fine detail: S3 checks the expiry when the request <em>starts</em>. If the upload started before the expiry, it keeps going even if the expiry passes in the middle; but if the connection breaks and starts again, it fails.', go: 'bad:c>s3', after: { s3: { state: 'warn', sub: '403: expired' } }, msg: '403 Forbidden\n<Code>AccessDenied</Code>  Request has expired' },
          { title: 'Fix: ask for a new URL', text: 'The client sees 403 and gets a new URL from the app server (login and permission are checked again, which is good). A short expiry is a safety feature: even if the URL leaks, it is useful only for a short time.', go: ['c>app', 'res:app>c', 'c>s3'], after: { s3: { state: '', sub: 'v91.mp4 saved' } } },
        ]},
        { name: 'Failure: upload incomplete', intro: 'The network dropped on a train, and Riya closed the app.', steps: [
          { title: 'URL received, row PENDING', text: 'The server had created the row.', go: ['c>app', 'app>db', 'res:app>c'], after: { db: { sub: 'v91: PENDING' } } },
          { title: 'The upload broke halfway', text: 'The bytes were lost on the way. No complete object was created in S3, so no event either.', go: 'lost:c>s3' },
          { title: 'A row stuck in the DB', text: 'The row will stay PENDING forever. If the UI showed it as a "video", users would see a broken thumbnail. That is why the UI only shows UPLOADED/READY.', focus: ['db'], set: { db: { state: 'warn', sub: 'v91: PENDING (24h)' } } },
          { title: 'Cleanup job', text: 'A cleanup job deletes PENDING rows older than 24 hours. For leftover parts of multipart uploads we add an S3 lifecycle rule (AbortIncompleteMultipartUpload), otherwise those parts quietly keep adding to the storage bill.', go: 'w>db', after: { db: { state: '', sub: 'v91 deleted' } } },
        ]},
      ],
    },
    { type: 'callout', tone: 'warn', title: 'A pre-signed URL is a bearer token', html: `Whoever holds the URL can use it, without logging in. So: keep the expiry short (minutes), let the server pick the key, and put limits on uploads. S3's <strong>pre-signed POST</strong> comes with a policy where you can write conditions like <code>content-length-range</code> (for example "from 1 byte to 5 GB"). Even after the upload, do not trust the file: a worker should check the type, scan for viruses and check the size. According to the S3 docs, a URL made with long-lived keys (an IAM user's keys) can be valid for at most 7 days, and a URL made with temporary keys that last a few hours dies when those keys expire.` },
    { type: 'h3', text: 'Signature lab: how S3 checks a URL' },
    { type: 'p', html: `The app server gave Riya a URL: <code>PUT</code>, key <code>videos/42/v91.mp4</code>, expiry 15 minutes (900 seconds). Now play the "clever user". Change something in the URL, or use it late, and watch step by step what S3 checks. (Here the signature is made with a small toy hash; real S3 uses HMAC-SHA256, but the idea is the same.)` },
    { type: 'custom', render(el) {
      const SECRET = 'xyz-server-secret';
      const sign = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); };
      const ORIG = { m: 'PUT', k: 'videos/42/v91.mp4', e: 900 };
      const SIG = sign([SECRET, ORIG.m, ORIG.k, ORIG.e].join('|'));
      el.innerHTML = `<div class="row2">
          <div><label for="osSgM">Method</label><select id="osSgM"><option>PUT</option><option>GET</option><option>DELETE</option></select></div>
          <div><label for="osSgK">Key</label><select id="osSgK"><option>videos/42/v91.mp4</option><option>videos/7/other.mp4</option></select></div>
          <div><label for="osSgE">Expires (written in the URL)</label><select id="osSgE"><option value="900">900 (original)</option><option value="604800">604800 (7 days, tampered)</option></select></div>
          <div><label for="osSgT">URL used after: <strong class="osSgTV"></strong></label><input id="osSgT" type="range" min="0" max="30" step="1" value="2"></div>
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
          [true, `S3 reads the method, key and expiry from the URL: ${m}, ${k}, ${e}s.`],
          [sigOk, `S3 rebuilds the signature with its own copy of the secret: <code>${recomputed}</code>. The one in the URL: <code>${SIG}</code>. ${sigOk ? 'They match.' : 'No match! Someone changed the URL.'}`],
        ];
        if (sigOk) rows.push([timeOk, `Time check: ${t} min = ${t * 60}s, limit ${e}s. ${timeOk ? 'Still valid.' : 'Already expired.'}`]);
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
    { type: 'callout', tone: 'tip', title: 'What the lab teaches', html: `Change the method, the key or the expiry, and the signature no longer matches, because making a new correct signature needs the secret that only the server has. Change nothing but come after 15 minutes, and you get "expired". That is why a pre-signed URL is safe: <strong>only what is written, only until the time written</strong>.` },

    { type: 'h2', text: 'Multipart and resumable uploads' },
    { type: 'p', html: `You sent 2 GB in a single PUT (one long request) and the network broke at 1.8 GB? All 1.8 GB are wasted, and you start from zero. On mobile this happens every day: lifts, trains, tunnels. The fix: send the file in <strong>pieces</strong>. The pieces that arrived are safe; only the piece on the way is lost.` },
    { type: 'callout', tone: 'term', title: 'Multipart upload', html: `<strong>What it is:</strong> the S3 way of uploading a big file as separate <strong>parts</strong> (for example 16 MB each). At the end, S3 joins them into one object.<br><strong>Why we need it:</strong> (1) if the network breaks, only the unfinished part is sent again, (2) many parts at the same time (in parallel) make the upload faster, (3) a file bigger than 5 GB cannot go in one PUT at all.<br><strong>Without it:</strong> every break means starting from zero. On a weak network a big video may never finish uploading.` },
    { type: 'callout', tone: 'term', title: 'UploadId and ETag', html: `<strong>What it is:</strong> <strong>UploadId</strong> = the ticket number of this one multipart upload. Every part is sent with this number. <strong>ETag</strong> = for every part, S3 replies with a short fingerprint: "yes, I got part 7, here is its fingerprint".<br><strong>Why we need it:</strong> at the end we must tell S3 "part 1 was this, part 2 was this...". With the ETags, S3 makes sure the parts being joined are the ones that arrived.<br><strong>Without it:</strong> nobody would know which parts arrived, and a wrong part could be joined.` },
    { type: 'steps', items: [
      { t: 'Initiate (start)', d: 'The app server asks S3 to start a multipart upload and gets an <code>UploadId</code>.' },
      { t: 'A URL for every part', d: 'A separate pre-signed URL for every part number (1, 2, 3 ...). The client can send these parts <strong>in parallel</strong> and in any order. For every part an <code>ETag</code> (that part\'s fingerprint) comes back, and the client remembers it.' },
      { t: 'Network broke?', d: 'Parts that arrived (their ETag came back) are sitting in S3. Send only the unfinished parts again. S3\'s <code>ListParts</code> tells you which parts arrived.' },
      { t: 'Complete', d: 'Send all part numbers + ETags. S3 joins them in part-number order into one object.' },
      { t: 'Abort / cleanup', d: 'Gave up on the upload? Abort it, or let a lifecycle rule do it after X days. Until then you pay storage for the parts.' },
    ]},
    { type: 'callout', tone: 'term', title: 'Resumable upload', html: `<strong>What it is:</strong> the Google Cloud Storage (GCS) way. At the start you get a <strong>session URI</strong> (this upload's own URL). You send the file in order, piece by piece. If the network breaks, ask the server: "how many bytes did you get?" The server says "the first 96 MB", and you continue from there.<br><strong>Why we need it:</strong> the same benefit (no restart from zero after a break), but the client's job is simple: no bookkeeping of parts, just ask "how far did it get?"<br><strong>Without it:</strong> the whole file again after every break.<br><strong>Detail:</strong> according to the GCS docs, a session stays valid for one week, and every piece (except the last) must be a multiple of 256 KiB.` },
    { type: 'table', head: ['', 'Single PUT', 'Multipart (S3)', 'Resumable (GCS)'], rows: [
      ['How it sends', 'The whole file in one request', 'Separate parts, even in parallel, then "Complete"', 'One session, pieces in order'],
      ['Wasted on a break', 'Everything sent in that attempt', 'Only the parts on the way', 'Only the last unfinished piece'],
      ['Speed', 'One connection', 'Many connections at once: fast', 'One connection (simple)'],
      ['When', 'Small files (a few MB)', 'Big files, good network, need speed', 'Mobile, weak network, simple client'],
    ]},
    { type: 'p', html: `Try it yourself. Pick a method, start the upload, cut the network in the middle, then resume. Try all three methods on the same file and compare the "wasted data". (Assume one connection moves 1 MB per tick.)` },
    { type: 'custom', render(el) {
      const MODES = { single: 'Single PUT', multi: 'Multipart (S3)', resum: 'Resumable (GCS)' };
      el.innerHTML = `<div class="osUpM" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="row2" style="margin-top:10px">
          <div><label for="osFile">File size</label><select id="osFile"><option value="64">64 MB</option><option value="200" selected>200 MB</option><option value="500">500 MB</option></select></div>
          <div><label for="osChunk">Part / piece size: <strong class="osChunkV">16 MB</strong></label><input id="osChunk" type="range" min="5" max="50" step="1" value="16"></div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">
          <button type="button" class="btn small primary osStart">Start upload / Resume</button>
          <button type="button" class="btn small osKill">Cut the network</button>
          <button type="button" class="btn small ghost osReset">Reset</button>
        </div>
        <div class="osGrid" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:14px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:8px;font-size:13px;color:var(--ink-3)">
          <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--surface-2);border:1px solid var(--line-2)"></span> waiting</span>
          <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--accent)"></span> sending</span>
          <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--green)"></span> arrived (safe)</span>
          <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--red)"></span> broken, will be resent</span>
        </div>
        <div class="stats">
          <div class="stat"><span>Safe on the server</span><strong class="osDone"></strong></div>
          <div class="stat"><span>Wasted data</span><strong class="osWaste"></strong></div>
          <div class="stat"><span>Time (ticks)</span><strong class="osTicks"></strong></div>
        </div>
        <div class="calc-note osNote"></div>`;
      const RATE = 1; // each connection moves 1 MB per tick
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
      // On a break: bytes already sent for the part/piece in flight are wasted. In a single PUT that is the whole file.
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
            <span style="position:relative;font:10px var(--f-mono);color:var(--ink-2);display:block;text-align:center;line-height:26px">${wide ? p.size + ' MB, one request' : i + 1}</span></div>`;
        }).join('');
        el.querySelector('.osDone').textContent = `${safe} / ${st.F} MB`;
        el.querySelector('.osWaste').textContent = st.waste + ' MB';
        el.querySelector('.osTicks').textContent = st.ticks;
        const maxLoss = mode === 'single' ? 'up to the whole file' : mode === 'multi' ? `${par()} × ${st.C} = ${par() * st.C} MB` : `${st.C} MB (one piece)`;
        let note = mode === 'single' ? `Single PUT: ${st.F} MB in one request. ` : mode === 'multi' ? `${n} parts, 3 parts go at the same time. ` : `${n} pieces, one after another, in one session. `;
        if (safe === st.F) note += mode === 'multi' ? `Done! Now a "Complete" call with all the ETags, and S3 joins the ${n} parts.` : 'Upload done!';
        else if (st.kills && !st.running) note += `Network broke. Each break wastes at most ${maxLoss}. ` + (mode === 'single' ? 'Here, resume means: start again from zero.' : mode === 'resum' ? 'On resume, the client asks "how many bytes did you get?" and continues from there.' : 'Only the red parts will be sent again.');
        else if (st.running) note += 'Running... press "Cut the network" in the middle.';
        else note += 'Start the upload.';
        el.querySelector('.osNote').textContent = note;
      };
      el.querySelector('.osStart').onclick = start;
      el.querySelector('.osKill').onclick = kill;
      el.querySelector('.osReset').onclick = init;
      fileSel.addEventListener('change', init); chunkIn.addEventListener('input', init);
      init();
    }},
    { type: 'callout', tone: 'tip', title: 'How to pick the part size?', html: `Small parts: less lost on a break, but more requests (every part is an HTTP call). Big parts: fewer requests, but more to resend on a break. On mobile, often 5-16 MB; inside a data center, 64-128 MB. The S3 docs suggest multipart for files bigger than about 100 MB. And remember the 10,000-part limit: a 1 TB file cannot go in 5 MB parts (that would be 2 lakh parts); it needs parts of about 100 MB or more.` },

    { type: 'h2', text: 'Chunking + content hashing: do not send the same data twice' },
    { type: 'p', html: `Now another problem. xyz.com launched a "Drive" feature: users sync their files. Riya changed one slide in a 200 MB presentation. Upload all 200 MB again? And 5,000 people downloaded a viral video and uploaded it back: store 5,000 copies?` },
    { type: 'p', html: `The idea: cut the file into chunks, and compute a <strong>hash</strong> for every chunk. A hash is a short fingerprint: the same bytes always give the same hash, and even a tiny change in the bytes gives a completely different hash. Before uploading, the client asks the server: "which of these hashes do you not have?" Only those chunks are sent.` },
    { type: 'callout', tone: 'term', title: 'Hash (fingerprint)', html: `<strong>What it is:</strong> a function (like SHA-256) that turns data of any size into a short code of fixed size (32 bytes for SHA-256). Same bytes = always the same hash. One byte changed = a completely different hash. Just like a fingerprint.<br><strong>Why we need it:</strong> instead of sending a 4 MB chunk, we send only its 32-byte hash and ask "do you have this?"<br><strong>Without it:</strong> to find out whether the server already has the data, we would have to send all the data.` },
    { type: 'callout', tone: 'term', title: 'Content-addressing and dedupe', html: `<strong>What it is:</strong> if a chunk's name is its own hash (<code>chunks/9f86d0...</code>), this is called <strong>content-addressed storage</strong>: the name comes from the content. Two users with the same chunk = the same name = keep only one copy. This is called <strong>dedupe</strong> (deduplication, which means removing repeats).<br><strong>Why we need it:</strong> one copy instead of 5,000 copies of a viral video. One slide changed, so only that chunk is uploaded.<br><strong>Without it:</strong> storage and uploads both multiply.<br><strong>Bonus:</strong> after a download you can compute the hash again to check that the data was not damaged on the way (an <strong>integrity check</strong>).` },
    { type: 'p', html: `A real example: according to Dropbox's engineering blog (a 2014 post, so it is old), every file was cut into <strong>4 MB blocks</strong>, each block got a SHA-256 hash, and the client first sent the list of hashes. The server said "I need these blocks", and only those were uploaded. Run the toy version below (a chunk is about 8 characters, with a small toy hash; real systems use a strong hash like SHA-256). Try "Fixed-size" mode first, then "Content-defined":` },
    { type: 'custom', render(el) {
      const V1 = "xyz.com has Riya's travel vlog: five days of a Goa trip, day 1 to 5";
      const CH = 8;
      const hash = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return ('0000000' + h.toString(16)).slice(-8).slice(0, 6); };
      const fixedSplit = s => { const out = []; for (let i = 0; i < s.length; i += CH) out.push(s.slice(i, i + CH)); return out; };
      // Content-defined: cut where a small hash of the last 3 characters is divisible by 5 (min 4, max 14 characters)
      const cdcSplit = s => { const o = []; let st = 0; for (let i = 0; i < s.length; i++) { const len = i - st + 1; let h = 0; for (const c of s.slice(Math.max(0, i - 2), i + 1)) h = (h * 31 + c.charCodeAt(0)) % 1000; if ((len >= 4 && h % 5 === 0) || len >= 14) { o.push(s.slice(st, i + 1)); st = i + 1; } } if (st < s.length) o.push(s.slice(st)); return o; };
      let cdc = false;
      const split = s => cdc ? cdcSplit(s) : fixedSplit(s);
      let stored = new Set(split(V1).map(hash));
      el.innerHTML = `<div style="font-size:14px;color:var(--ink-3)">Already on the server (v1):</div>
        <div style="font:13px var(--f-mono);background:var(--surface-2);border-radius:var(--r-sm);padding:8px 10px;margin:4px 0 12px;word-break:break-all">${V1}</div>
        <div class="osCdcM" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px"><button type="button" class="chip on" data-m="0">Fixed-size (every 8 chars)</button><button type="button" class="chip" data-m="1">Content-defined</button></div>
        <label for="osV2">New version (v2), edit it:</label>
        <input id="osV2" type="text" style="width:100%;font-family:var(--f-mono)">
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">
          <button type="button" class="btn small" data-p="mid">Change a word in the middle</button>
          <button type="button" class="btn small" data-p="front">Add a letter at the start</button>
          <button type="button" class="btn small ghost" data-p="same">Same as v1</button>
        </div>
        <div class="osChunks" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:14px"></div>
        <div class="stats">
          <div class="stat"><span>Total chunks</span><strong class="osT"></strong></div>
          <div class="stat"><span>New (upload)</span><strong class="osN"></strong></div>
          <div class="stat"><span>Skip (on the server)</span><strong class="osS"></strong></div>
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
        el.querySelector('.osDN').textContent = nw === 0 ? 'Nothing new: not a single byte will be uploaded. That is dedupe.'
          : nw <= 2 ? `Only ${nw} new chunk(s). The rest are already on the server; only their hashes were sent.`
          : `${nw} chunks look new. If you added something at the start, every chunk boundary shifted, so all chunks look "new". This is the weakness of fixed-size chunking. Now press "Content-defined".`;
      };
      el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { cdc = b.dataset.m === '1'; el.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === b)); stored = new Set(split(V1).map(hash)); upd(); });
      el.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { inp.value = P[b.dataset.p]; upd(); });
      inp.addEventListener('input', upd);
      inp.value = P.mid; upd();
    }},
    { type: 'callout', tone: 'why', title: 'Interview depth: content-defined chunking', html: `In the widget, press "Add a letter at the start" in both modes. With fixed-size chunks, adding one byte shifts every boundary after it, so almost every chunk looks new. The cure is <strong>content-defined chunking</strong>: a boundary is not at a fixed position, it is decided by the content (we run a <em>rolling hash</em>, and cut a chunk wherever its value matches some pattern). Now adding one byte changes only one or two chunks nearby (in the widget, only 1 of 8 chunks is new). Backup tools and dedupe systems often do this.` },
    { type: 'callout', tone: 'warn', html: `Dedupe across different users has a security side too: if the server says "that file already exists" just from the hash, someone could "claim" another person's file just by knowing its hash, or find out whether someone has a certain file. So for cross-user dedupe the server needs proof that the client really has the bytes, or dedupe is done only within one user's files.` },

    { type: 'h2', text: 'From the inside: GFS and HDFS' },
    { type: 'p', html: `A service like S3 cannot run on one computer: petabytes of data sit on thousands of disks. How is this organised? The classic answer is Google's <strong>GFS (Google File System)</strong> paper (2003), and its open-source cousin <strong>HDFS</strong> (Hadoop Distributed File System). The idea is to split the work into two parts:` },
    { type: 'callout', tone: 'term', title: 'Distributed file system', html: `<strong>What it is:</strong> a file system that looks like one thing (files, names), but behind it the disks of hundreds or thousands of machines are joined together. The pieces of one file live on different machines.<br><strong>Why we need it:</strong> petabytes do not fit on one machine's disk, and if one machine dies, the data must not be lost.<br><strong>Without it:</strong> data is limited to one machine's disk, and if that machine is gone, the data is gone.<br><strong>Example:</strong> GFS (Google), HDFS (Hadoop). Today's object stores are also built on similar ideas inside.` },
    { type: 'list', items: [
      `<strong>Master</strong> (NameNode in HDFS): a machine that keeps only <em>metadata</em> (data about the data), like a library catalogue. Which file, which chunks, which machine each chunk is on. All of it in RAM, so it is fast.`,
      `<strong>Chunkservers</strong> (DataNodes in HDFS): the machines whose disks hold the real bytes, like the shelves of a library. In the GFS paper a file is cut into <strong>64 MB chunks</strong>, and each chunk is on <strong>3 machines</strong> by default. The HDFS docs give a typical block size of 128 MB, also with 3 copies.`,
      `<strong>Bytes never pass through the master.</strong> The client only asks the master "where is the chunk?", and then reads straight from the chunkserver. Exactly the pre-signed URL idea: control in one place, data on another path.`,
    ]},
    { type: 'flow', title: 'GFS / HDFS: the life of one chunk', height: 330,
      nodes: [
        { id: 'cl', label: 'Client', sub: 'analytics job', x: 120, y: 70, w: 140, kind: 'client', info: 'What it is: the program that wants to read or write a file (here an analytics job), using the GFS/HDFS client library. It asks the master for locations, and also caches that answer for a while so the master has less work.' },
        { id: 'm', label: 'Master', sub: 'NameNode: metadata', x: 460, y: 70, w: 170, kind: 'server', info: 'What it is: the catalogue keeper of the cluster. File → chunks, and chunk → which machines. All in RAM. Chunkservers send it heartbeats. It is not on the data path, so one master can serve thousands of clients.' },
        { id: 'cs1', label: 'Chunkserver 1', sub: 'chunk C', x: 120, y: 270, w: 140, kind: 'data', info: 'What it is: a machine that stores data. It keeps chunks on its local disk like normal files. Every few seconds it sends the master a heartbeat: "I am alive, and I have these chunks".' },
        { id: 'cs2', label: 'Chunkserver 2', sub: 'chunk C', x: 290, y: 270, w: 140, kind: 'data', info: 'What it is: another data machine, holding the second copy of chunk C, on a different machine (and in GFS often in a different rack). If Chunkserver 1 dies, the client reads from here, and the master makes a third copy on a new server so there are 3 copies again.' },
        { id: 'cs3', label: 'Chunkserver 3', sub: 'chunk C', x: 460, y: 270, w: 140, kind: 'data', info: 'What it is: the third data machine, with the third copy of chunk C. 3 copies means: even if any 2 machines fail together, the data is safe. The price: 3 GB of disk for every 1 GB of data.' },
        { id: 'cs4', label: 'Chunkserver 4', sub: 'free space', x: 630, y: 270, w: 140, kind: 'data', info: 'What it is: a data machine with free space. It does not have chunk C yet. When a copy dies, the master can choose it for the new copy.' },
      ],
      edges: [{ a: 'cl', b: 'm' }, { a: 'cl', b: 'cs1' }, { a: 'cl', b: 'cs2' }, { a: 'm', b: 'cs1' }, { a: 'm', b: 'cs2' }, { a: 'm', b: 'cs3' }, { a: 'm', b: 'cs4' }, { a: 'cs1', b: 'cs2' }, { a: 'cs2', b: 'cs3' }, { a: 'cs3', b: 'cs4' }],
      scenarios: [
        { name: 'Read', steps: [
          { title: 'Client: where is the chunk?', text: 'It sends the file name and the offset. The client turns the byte offset into a chunk number (offset ÷ 64 MB).', go: 'cl>m', msg: 'where is /logs/day1, chunk #7 ?' },
          { title: 'Master: these three machines', text: 'The master only answers. No bytes.', go: 'res:m>cl', msg: 'chunk #7 = handle 0x2af1, replicas: cs1, cs2, cs3' },
          { title: 'Client reads straight from a nearby chunkserver', text: 'It read from whichever of the three is closest (on the network). The master did not even notice.', go: ['cl>cs2', 'res:cs2>cl'], set: { m: { state: 'dim' } }, after: { cs2: { state: 'hit' } } },
        ]},
        { name: 'Write (pipeline)', steps: [
          { title: 'Asked the master', text: 'The master names the three replicas and makes one of them the <strong>primary</strong> for now, which decides the order of writes.', go: ['cl>m', 'res:m>cl'] },
          { title: 'Data goes along a chain', text: 'The client sends the data only to the first machine. That one passes it on, and the next passes it on. Every machine\'s network is fully used, and the client does not upload three times. (In the GFS paper, data flow and control flow are separate; this is the data flow.)', go: 'cl>cs1>cs2>cs3', after: { cs1: { sub: 'chunk C v2' }, cs2: { sub: 'chunk C v2' }, cs3: { sub: 'chunk C v2' } } },
          { title: 'All three wrote, OK to the client', text: 'The primary gets confirmation from all three and tells the client it succeeded. If any one failed, the client gets an error and retries.', go: 'res:cs1>cl' },
        ]},
        { name: 'Failure: a chunkserver died', steps: [
          { title: 'Chunkserver 1\'s disk died', text: 'Now chunk C has only two copies left.', set: { cs1: { state: 'down', sub: 'DOWN' } }, focus: ['cs1'] },
          { title: 'No heartbeat', text: 'The master has not had a heartbeat from cs1 for a while. It treats it as dead and checks: which chunks now have fewer than 3 copies?', go: 'lost:cs1>m', after: { m: { state: 'warn', sub: 'chunk C: 2 copies!' } } },
          { title: 'Re-replication', text: 'The master tells cs3: give a copy of chunk C to cs4. The data moves straight between the machines.', go: ['m>cs3', 'cs3>cs4'], after: { cs4: { state: 'ok', sub: 'chunk C (new)' }, m: { state: '', sub: 'chunk C: 3 copies' } } },
          { title: 'Back to 3 copies', text: 'The user noticed nothing. In big clusters many disks die every day, so this is "normal", not an emergency. A core idea of the GFS paper: treat failures as normal, not as exceptions.', focus: ['cs4'] },
        ]},
        { name: 'Failure: the master died', steps: [
          { title: 'Master down', text: 'All the bytes are safe, but nobody knows which chunk is where. New reads and writes stop.', set: { m: { state: 'down', sub: 'DOWN' } }, go: 'bad:cl>m' },
          { title: 'So the master needs a backup too', text: 'In GFS, the master copied its operation log to several machines, and there were read-only "shadow masters". In HDFS, a high-availability setup keeps a standby NameNode ready, which becomes active on failover. One master = a simple design, but you must handle the SPOF separately.', set: { m: { state: 'ok', sub: 'standby now active' } }, go: ['cl>m', 'res:m>cl'] },
        ]},
      ],
    },
    { type: 'image', src: 'assets/img/object-storage/server-racks.jpg', alt: 'A long row of server racks in a data center, each rack full of machines from top to bottom', caption: 'A real data center: every rack holds dozens of machines, and every machine has several disks. A system like GFS/HDFS or S3 makes thousands of such machines look like one big storage. Some disks die every day, so copies or erasure coding are a must.', credit: { text: 'Victor Grigas, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Wikimedia_Foundation_Servers-8055_13.jpg', license: 'CC BY-SA 3.0' } },
    { type: 'callout', tone: 'why', title: 'Why are chunks so big (64-128 MB)?', html: `The master keeps track of every chunk in RAM. Bigger chunks = fewer chunks = less RAM on the master, and the client has to ask the master less often. These systems were built for reading big files (logs, crawls, analytics data) from start to end. The price: millions of small files (like thumbnails) are bad for them, because each one eats a full metadata entry. That is why today we use object storage for photos and videos, and services like S3 have their own design inside (AWS does not publish all the details; the master + storage nodes idea above is the general approach).` },

    { type: 'h2', text: 'Replication vs erasure coding' },
    { type: 'p', html: `Keeping 3 copies is simple, but every 1 TB needs 3 TB of disk. At petabyte scale that is a lot of money. Can we get the same safety with less extra disk? Yes: <strong>erasure coding</strong>.` },
    { type: 'callout', tone: 'term', title: 'Erasure coding (EC)', html: `<strong>What it is:</strong> cut the data into <strong>k</strong> pieces, and use maths to make <strong>m</strong> extra "parity" (checking) pieces. Keep these k + m pieces on different machines. The magic: if <strong>any k pieces</strong> survive, the whole data can be rebuilt. The most common maths is called <strong>Reed-Solomon</strong>, so we write RS(k, m).<br><strong>Why we need it:</strong> as much safety as 3 copies (or more), with much less extra disk.<br><strong>Without it:</strong> a bill for 200% extra disk at petabyte scale.<br><strong>Example:</strong> RS(6, 3) = 6 data + 3 parity. Even if any 3 machines die, the data is safe, and the extra disk is only 3/6 = 50%.` },
    { type: 'ascii', text: `
The smallest example: XOR parity (k=2, m=1)

  A = 0101 (5)        B = 0011 (3)
  P = A XOR B = 0110 (6)          ← the parity piece

  A's machine died?  A = P XOR B = 0110 XOR 0011 = 0101 (5)  ✓

Reed-Solomon takes this idea further: m parity pieces,
lose any m pieces and rebuild everything from the rest.`, caption: 'XOR can save one piece. Reed-Solomon can save many.' },
    { type: 'p', html: `Pick a scheme, enter the data size, then click boxes to "kill" machines and see whether the data survives:` },
    { type: 'custom', render(el) {
      const S = {
        r3: { name: '3x replication', rep: 3 },
        r2: { name: '2x replication', rep: 2 },
        rs63: { name: 'RS(6,3)', k: 6, m: 3 },
        rs104: { name: 'RS(10,4)', k: 10, m: 4 },
      };
      let cur = 'r3', dead = new Set();
      el.innerHTML = `<div class="osSch" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div style="margin-top:12px;max-width:320px"><label for="osTB">Real data (TB)</label><input id="osTB" type="number" min="1" step="1" value="100"></div>
        <div class="osBoxes" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:14px"></div>
        <div class="osAlive" style="margin-top:10px;font:600 15px var(--f-display)"></div>
        <div class="stats">
          <div class="stat"><span>Total disk needed</span><strong class="osRaw"></strong></div>
          <div class="stat"><span>Extra (overhead)</span><strong class="osOv"></strong></div>
          <div class="stat"><span>Machines that can die</span><strong class="osTol"></strong></div>
          <div class="stat"><span>Rebuild one piece: reads needed</span><strong class="osReb"></strong></div>
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
        a.textContent = dead.size === 0 ? 'All machines alive. Click a box to kill that machine.'
          : ok ? `${dead.size} dead, data SAFE (it can survive up to ${tol})` : `${dead.size} dead: DATA LOST (it could survive only ${tol})`;
        a.style.color = dead.size === 0 ? 'var(--ink-2)' : ok ? 'var(--green)' : 'var(--red)';
        el.querySelector('.osRaw').textContent = (data * factor).toFixed(0) + ' TB';
        el.querySelector('.osOv').textContent = Math.round((factor - 1) * 100) + '%';
        el.querySelector('.osTol').textContent = tol;
        el.querySelector('.osReb').textContent = isRep ? '1 copy' : s.k + ' pieces';
        el.querySelector('.osEN').textContent = isRep
          ? `Replication: if a copy dies, just copy it from another copy. Rebuild is cheap and fast, and reads can use any copy. The price: ${Math.round((factor - 1) * 100)}% extra disk.`
          : `${s.name}: ${s.k} data + ${s.m} parity pieces. Only ${Math.round((factor - 1) * 100)}% extra disk, and it survives ${s.m} failures. The price: to rebuild one lost piece you must read ${s.k} other pieces over the network, and encoding/decoding uses CPU.`;
      };
      tb.addEventListener('input', draw);
      draw();
    }},
    { type: 'table', head: ['', '3x replication', 'Erasure coding (like RS(6,3))'], rows: [
      ['Extra disk', '200%', '50% (40% in RS(10,4))'],
      ['How many failures', '2', '3 (4 in RS(10,4))'],
      ['Read', 'From any copy, directly', 'A normal read is fine; if a piece is missing, k pieces must be combined'],
      ['One piece lost, rebuild', 'Read 1 copy', 'Read k pieces (6 or 10 times the network)'],
      ['CPU', 'None', 'Encoding/decoding work'],
      ['Best for', 'Hot data, small files, data read again and again', 'Big, cold data: old videos, backups, logs'],
    ], caption: 'Example from the HDFS docs: a file of 6 blocks takes 18 blocks with 3x replication, and only 9 with RS(6,3).' },
    { type: 'callout', tone: 'mistake', title: 'Beginner mistake: "replication = backup"', html: `Replication and erasure coding protect against <strong>hardware failure</strong>. But if someone runs <code>DELETE</code> by mistake, or a bug writes a bad file, that mistake reaches all the copies at once. For that you need other things: <strong>versioning</strong> (S3 can keep the old versions of every object), backups in a separate account/region, and protection against deletes (like S3 Object Lock).` },

    { type: 'h2', text: 'Storage tiers: hot, cold, archive' },
    { type: 'p', html: `90% of xyz.com's views come in the first 30 days. Hardly anyone watches a 3-year-old video, but we cannot delete it either. Why keep everything in the most expensive, fastest storage? Cloud providers offer different <strong>storage classes</strong>: the less you access data, the cheaper it is to keep, but reading it back is expensive or slow.` },
    { type: 'callout', tone: 'term', title: 'Storage class (tier)', html: `<strong>What it is:</strong> different "boxes" inside the same object storage, each with its own price. <strong>Hot</strong> = data read every day; expensive to keep, free to read. <strong>Cold</strong> = data read once in a while; cheap to keep, with a fee to read. <strong>Archive</strong> = maybe never read; very cheap to keep, but getting it back takes minutes to 2 days.<br><strong>Why we need it:</strong> the bill for xyz.com's petabytes of old videos can become 5-20 times smaller.<br><strong>Without it:</strong> a 3-year-old video that nobody watches sits in the most expensive box, every month.` },
    { type: 'table', head: ['Tier', 'S3 class', 'Time to get data back', 'Minimum days billed', 'When'], rows: [
      ['Hot', 'S3 Standard', 'Milliseconds', 'No minimum', 'New videos, thumbnails, everyday data'],
      ['Warm', 'Standard-IA (Infrequent Access)', 'Milliseconds', '30 days', 'Once in a while each month: older videos'],
      ['Cold', 'Glacier Instant Retrieval', 'Milliseconds', '90 days', 'A few times a year, but needed instantly'],
      ['Archive', 'Glacier Flexible Retrieval', 'Minutes to hours', '90 days', 'Old backups'],
      ['Deep archive', 'Glacier Deep Archive', '12 to 48 hours', '180 days', 'Kept 7 years for the law, probably never needed'],
    ], caption: 'From the AWS S3 storage classes page. In GCS the names are Standard, Nearline, Coldline, Archive; in Azure, Hot, Cool, Cold, Archive. Infrequent/cold classes also charge a separate fee for getting data out (retrieval).' },
    { type: 'callout', tone: 'term', title: 'Retrieval fee and minimum duration', html: `<strong>What it is:</strong> two hidden conditions of cheap tiers. <strong>Retrieval fee</strong> = a separate charge for every GB you read. <strong>Minimum duration</strong> = an object is billed for at least this many days, even if you delete it earlier.<br><strong>Why it exists (for the provider):</strong> a cheap GB is only possible if data stays long and is read rarely.<br><strong>Without knowing it (for you):</strong> if you forget these conditions, a "cheap" tier can become expensive. Check it yourself in the calculator below.` },
    { type: 'p', html: `We do not move data by hand. We write <strong>lifecycle rules</strong>: "after 30 days to Standard-IA, after 1 year to Glacier, delete after 7 years". And if we do not know when which data will be read, S3 Intelligent-Tiering watches the access and moves data by itself (for a small monitoring fee). <strong>Lifecycle rule</strong> = a rule written on a bucket that S3 runs by itself every day: "move objects older than X days to tier Y" or "delete after Z days". Without it, an engineer would have to run a script every month.` },
    { type: 'h3', text: 'Cost calculator: which tier is really cheaper?' },
    { type: 'p', html: `Enter the data size, how much of the data is read each month, and how many months you keep it. The calculator works out the bill for every tier (AWS us-east-1 list prices, checked in 2026; prices keep changing, and request fees are left out). It assumes 1 TB = 1,000 GB.` },
    { type: 'custom', render(el) {
      const C = [
        { n: 'S3 Standard', t: 'Hot', p: 0.023, r: 0, d: 0, inst: true, wait: 'milliseconds' },
        { n: 'Standard-IA', t: 'Warm', p: 0.0125, r: 0.01, d: 30, inst: true, wait: 'milliseconds' },
        { n: 'Glacier Instant Retrieval', t: 'Cold', p: 0.004, r: 0.03, d: 90, inst: true, wait: 'milliseconds' },
        { n: 'Glacier Flexible Retrieval', t: 'Archive', p: 0.0036, r: 0.01, d: 90, inst: false, wait: 'minutes to hours' },
        { n: 'Glacier Deep Archive', t: 'Deep archive', p: 0.00099, r: 0.02, d: 180, inst: false, wait: '12-48 hours' },
      ];
      el.innerHTML = `<div class="row2">
          <div><label for="osTiTB">Data (TB)</label><input id="osTiTB" type="number" min="1" step="1" value="100"></div>
          <div><label for="osTiR">% of data read each month: <strong class="osTiRV"></strong></label><input id="osTiR" type="range" min="0" max="100" step="1" value="1"></div>
          <div><label for="osTiM">Months to keep: <strong class="osTiMV"></strong></label><input id="osTiM" type="range" min="1" max="36" step="1" value="12"></div>
          <div><label style="display:flex;gap:8px;align-items:center;margin-top:22px"><input type="checkbox" class="osTiI" checked> Must open instantly when a user clicks</label></div>
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
        q('.osTiT').innerHTML = `<tr><th style="${th}">Tier</th><th style="${th}">Storage / month</th><th style="${th}">Reads / month</th><th style="${th}">Total (${months} months)</th><th style="${th}">Wait</th></tr>` + rows.map(r => {
          const st = !r.ok ? 'color:var(--ink-3);text-decoration:line-through;' : r === best ? 'color:var(--green);font-weight:700;' : 'color:var(--ink-2);';
          const minNote = r.bm > months ? ` <span style="color:var(--amber)">(billed for min ${r.d} days)</span>` : '';
          return `<tr><td style="${td}${st}">${r.t}: ${r.n}</td><td style="${td}${st}">${fmt(gb * r.p)}</td><td style="${td}${st}">${fmt(rd * r.r)}</td><td style="${td}${st}">${fmt(r.tot)}${minNote}</td><td style="${td}${st}">${r.wait}</td></tr>`;
        }).join('');
        const std = rows[0];
        q('.osTiN').textContent = `Cheapest (with your conditions): ${best.n}, ${fmt(best.tot)}. That is ${std.tot ? Math.round((1 - best.tot / std.tot) * 100) : 0}% less than Standard at ${fmt(std.tot)}. ` + (inst ? 'Flexible and Deep Archive are crossed out because they make you wait minutes to hours. ' : '') + 'Raise the read %: the more you read, the heavier the retrieval fees of cold tiers.';
      };
      el.querySelectorAll('input').forEach(x => x.addEventListener('input', draw));
      q('.osTiI').addEventListener('change', draw);
      draw();
    }},
    { type: 'p', html: `The calculator shows three things (100 TB, 12 months, "must open instantly" on):<br>• 1% of the data read each month: Glacier Instant Retrieval ~$5,160 vs Standard ~$27,600. About 81% saved.<br>• 50% read: now Standard-IA (~$21,000) is the cheapest, because Instant Retrieval's $0.03/GB read fee has become heavy.<br>• 100% read: Instant Retrieval (~$40,800) is even more expensive than Standard (~$27,600)! Putting hot data in a cold tier backfires.` },
    { type: 'image', src: 'assets/img/object-storage/tape-library.jpg', alt: 'Inside a tape library: walls of thousands of tape cartridges on both sides, with a robot arm in the middle', caption: 'Inside a tape library (NERSC, US). A robot arm takes out a tape and puts it into a drive. Archive storage often sits on cheap, slow media like this, which is why getting data back takes hours. (AWS does not publicly say what Glacier uses inside; this photo only shows the idea.)', credit: { text: 'Derrick Coetzee, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Interior_of_StorageTek_tape_library_at_NERSC_(1).jpg', license: 'CC0' } },
    { type: 'callout', tone: 'mistake', title: 'A cheap tier is not always cheap', html: `The price per GB in archive is very low, but (1) minimum duration: you pay for 180 days even if you delete after 2 days, (2) every retrieval costs extra, (3) a file from Deep Archive arrives after 12+ hours. If you put data that a user can click and open at any time into Deep Archive, the user waits for hours. Choose a tier by the access pattern, not only by the GB price.` },

    { type: 'h2', text: 'The whole picture: xyz.com\'s storage design' },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `Anything bigger than a few KB that is read as a whole (photo, video, PDF, backup) goes to <strong>object storage</strong>; the database keeps only its pointer and metadata. Let the client upload directly with a <strong>pre-signed URL</strong>, so gigabytes never pass through your app servers. Use multipart/resumable uploads for big files, and lifecycle rules to move old data to cheaper tiers.` },
    { type: 'diagram', title: 'Object storage: the whole picture', height: 610,
      groups: [
        { label: 'Users', x: 20, y: 18, w: 680, h: 102 },
        { label: 'Control (small data)', x: 20, y: 180, w: 190, h: 270 },
        { label: 'Data path (big bytes)', x: 265, y: 180, w: 190, h: 410 },
        { label: 'Delivery + old data', x: 510, y: 180, w: 190, h: 270 },
      ],
      nodes: [
        { id: 'ph', label: 'Riya\'s phone', sub: 'uploader', x: 115, y: 75, kind: 'client', info: 'What it is: the app of the user uploading a video. It only gets permission (pre-signed URLs) from the server, then sends the bytes straight to S3 with a multipart/resumable upload.' },
        { id: 'vw', label: 'Viewer', sub: 'watches video', x: 605, y: 75, kind: 'client', info: 'What it is: the user watching a video. It gets the video page and a CDN or pre-signed GET URL from the app server, and then the bytes come from the CDN.' },
        { id: 'app', label: 'App server', sub: 'signs URLs', x: 115, y: 245, kind: 'server', info: 'What it is: xyz.com\'s own code. It checks login and limits, picks the key, creates the PENDING row, and signs pre-signed URLs. The video bytes never pass through it.' },
        { id: 'db', label: 'Metadata DB', sub: 'pointer + status', x: 115, y: 395, kind: 'data', info: 'What it is: a normal database. One row per video: owner, title, s3_key, size, status (PENDING / UPLOADED / READY). No bytes, only the address and the state.' },
        { id: 's3', label: 'S3 bucket', sub: 'Standard (hot)', x: 360, y: 245, kind: 'data', info: 'What it is: object storage. It checks the signature and expiry, accepts the upload and joins the parts. Inside, the data stays safe in different Availability Zones with replication or erasure coding.' },
        { id: 'q', label: 'Queue', sub: 'upload events', x: 360, y: 395, kind: 'queue', info: 'What it is: a line of messages. S3\'s ObjectCreated event arrives here, so processing follows what S3 says is true, not what the client claims.' },
        { id: 'wk', label: 'Workers', sub: 'scan, transcode', x: 360, y: 535, kind: 'server', info: 'What it is: background programs. They check the file (type, viruses), make smaller versions of the video and a thumbnail. They write the output back to S3 and set the status to READY in the DB.' },
        { id: 'cdn', label: 'CDN', sub: 'edge cache', x: 605, y: 245, kind: 'edge', info: 'What it is: cache servers spread around the world (the CDN lesson). They give viewers the video from nearby. They fetch from S3 only on a cache miss, so S3 has less load and the bill for sending data out is smaller.' },
        { id: 'cold', label: 'Cold / Archive', sub: 'IA, Glacier', x: 605, y: 395, kind: 'data', info: 'What it is: cheaper storage classes. A lifecycle rule moves old videos here (for example to IA after 30 days, to Glacier after 1 year). Cheap to keep, expensive or slow to read.' },
      ],
      edges: [
        { a: 'ph', b: 'app', n: 1, label: 'get upload URL' },
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
        { name: 'Upload', text: 'The phone asks for permission, the server gives a PENDING row + pre-signed URLs, the parts go straight to S3, S3\'s event goes through the queue to a worker, and the worker sets the status to READY.', go: ['ph>app>db', 'ph>s3>q>wk>db'] },
        { name: 'Watch', text: 'The viewer gets the video from the CDN. Only if the CDN does not have it does it come from S3. Zero byte load on the app server.', go: ['vw>cdn>s3'] },
        { name: 'Old data', text: 'A lifecycle rule moves old objects to a cheaper tier by itself. The pointer in the DB stays the same.', go: ['s3>cold'] },
        { name: 'Upload broke', text: 'If the network drops, only the unfinished parts are sent again. If it never finishes, a cleanup job removes the PENDING row and a lifecycle rule removes the leftover parts.', go: ['ph>s3', 'wk>db'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Big files (photo, video, PDF, backup) go to object storage. The database keeps only a pointer and a status.</li>
      <li>Block = a raw disk (for the DB), File = shared folders, Object = bucket + key over HTTP, no editing in the middle.</li>
      <li>Durability (data is not lost) and availability (you can get it now) are different. S3: 11 nines durability by design.</li>
      <li>Pre-signed URL = one file, one action, a short time. Signature changed or time passed = 403.</li>
      <li>Multipart (S3) and resumable (GCS): after a break, only the unfinished piece is sent again. Remember the 10,000-part limit.</li>
      <li>Chunk + hash = dedupe, and only the changed part is uploaded. Content-defined chunking stops boundaries from shifting.</li>
      <li>3x replication = 200% extra, simple, fast rebuild. Erasure coding RS(6,3) = 50% extra, costly rebuild.</li>
      <li>Hot / cold / archive: choose a tier by the access pattern, counting retrieval fees and minimum duration.</li>
    </ul>` },

    { type: 'tradeoffs', gains: ['Very cheap per GB, and almost unlimited space', 'Very high durability without managing replication yourself', 'Pre-signed URLs: zero upload load on app servers', 'Multipart: if the network breaks, only the unfinished part is sent again', 'Erasure coding and tiers keep costs under control even at petabytes', 'Connects directly with CDNs and event pipelines'], costs: ['You cannot edit an object in the middle; you rewrite the whole thing', 'Every request is HTTP: latency is not as low as a database/disk', 'A leaked pre-signed URL = anyone can use it until it expires', 'The DB row and the S3 object live in different places: keeping them in sync (PENDING, cleanup) is your job', 'A separate bill for requests and for sending data out (egress)', 'Cold tiers: retrieval fees and hours of waiting'] },

    { type: 'think', questions: [
      { q: 'Should xyz.com use a pre-signed URL for profile photo uploads too, or is a simple upload through the server enough? A photo is ~2 MB.', a: 'Both can work. 2 MB is small, so passing through the server is not terrible. But if lakhs of users change photos every day, the bandwidth and connections add up, and keeping one pattern (pre-signed) for every upload is simpler. A server upload is fine when the server must do something with the bytes right away, like resizing before saving; even then, people usually resize with a worker after the upload.' },
      { q: 'Dropbox-style sync: a user only renamed a 1 GB video file. How much data should be uploaded?', a: 'Almost zero. The name is metadata; the bytes did not change. The client computes chunk hashes, all of them are already on the server, so only a metadata update (new name → same chunk list) is sent. That is why designs keep the metadata DB and the chunk/blob store separate.' },
      { q: 'A bucket holds 10 PB of old videos that are watched once or twice a year. We replaced 3x replication with RS(10,4). What did we lose?', a: 'Disk drops from 30 PB to 14 PB, and the number of failures it can survive goes up from 2 to 4. What we lost: if a piece is missing, reading/rebuilding needs 10 pieces combined over the network (more network, CPU, latency). For big data that is rarely read, this is a good deal; for hot, small data read again and again, replication is better.' },
      { q: 'A lifecycle rule moved 2 lakh old xyz.com videos to Glacier Deep Archive. One day an old video goes viral and people start clicking it. What happens, and how would you change the design?', a: 'Getting data out of Deep Archive takes 12-48 hours, so users will not get the video. The fix: keep data that a user can click at any time in instant tiers (Standard-IA or Glacier Instant Retrieval), or use S3 Intelligent-Tiering, which watches access and moves data by itself. Use Deep Archive only for things users never see directly (legal records, old backups).' },
    ]},
    { type: 'quiz', questions: [
      { q: 'On what kind of storage do a Postgres database\'s data files usually sit?', options: ['Object storage', 'Block storage', 'Archive tier'], answer: 1, explain: 'A database must change small blocks in the middle very fast. Block storage (local SSD, EBS) gives exactly that. Object storage cannot edit in the middle at all.' },
      { q: 'The biggest benefit of a pre-signed URL?', options: ['The file is compressed automatically', 'The client uploads straight to S3, the bytes do not pass through the app server, and access is given for only one key, one method, for a short time', 'S3 no longer needs any login, forever'], answer: 1, explain: 'The bucket, key, method and expiry are tied into the signature. The app server only gives permission; the data goes straight from the phone to S3.' },
      { q: 'The network broke after sending 1.9 GB. 16 MB parts, 3 in parallel. At most how much must be sent again with multipart?', options: ['All 1.9 GB', 'About 48 MB (3 unfinished parts)', 'Nothing'], answer: 1, explain: 'Parts that fully arrived (got an ETag) are safe in S3. Only the 3 parts that were on the way are sent again: at most 3 × 16 MB.' },
      { q: 'What is true about RS(6,3) erasure coding?', options: ['200% extra disk, 2 failures', '50% extra disk, and the data is safe even if any 3 pieces are lost', '0% extra disk, 6 failures'], answer: 1, explain: '6 data + 3 parity = 9 pieces for 6 pieces of data: 50% extra. If any 6 survive, the data can be rebuilt, which means up to 3 failures.' },
      { q: 'Someone changed the key in a pre-signed PUT URL to another user\'s file name. What will S3 do?', options: ['Accept the upload, because the URL is valid', '403 SignatureDoesNotMatch, because the signature was made for the old key and a new one needs the secret', 'Email the other user'], answer: 1, explain: 'The signature covers the method, key and expiry. If any one of them changes, the signature S3 rebuilds does not match.' },
      { q: 'The network broke during a GCS resumable upload. What does the client do first when it comes back?', options: ['Sends the whole file from zero', 'Asks the session URI "how many bytes did you get?" and continues from there', 'Creates a new bucket'], answer: 1, explain: 'The progress is saved on the server. The client sends only the rest. A session stays valid for one week.' },
      { q: '100 TB of data, and all 100% of it is read every month. Should it go into Glacier Instant Retrieval?', options: ['Yes, its GB price is the lowest', 'No: the $0.03/GB read fee makes the bill even bigger than Standard (calculator: ~$3,400 vs ~$2,300 per month)', 'It makes no difference'], answer: 1, explain: 'Cheap tiers are cheap only for data that is read rarely. Putting hot data in a cold tier backfires.' },
      { q: 'Bank statement PDFs must be kept for 7 years for the law, and probably nobody will ever open them. Best tier?', options: ['S3 Standard', 'Deep archive (like Glacier Deep Archive)', 'Redis'], answer: 1, explain: 'The cheapest per GB, and a rare 12-48 hour wait is acceptable. For files opened every day this would be the wrong choice.' },
    ]},
    { type: 'sources', note: 'Numbers and limits were taken from these official docs and papers.', items: [
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
