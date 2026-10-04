Lesson.register({
  id: 'design-drive',
  title: 'Google Drive / Dropbox',
  minutes: 35,
  summary: `One folder that always stays the same on your laptop, phone and office PC. From zero: cutting a file into pieces (blocks) and a fingerprint (hash) for each piece. Then dedupe with content hashes, metadata vs blobs, telling other devices about a change (long polling), conflicts from offline edits, version history and sharing. Based on the Dropbox engineering blog and the Google Drive docs.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Riya has a laptop, a phone and an office PC. She wants her "Trip" folder to always be exactly the same on all three.<br>If she adds a photo on the laptop, it should show up on the phone a little later. If she changes a file on a flight (with no internet), the change should reach the other devices as soon as she lands.<br>And if her friend Aman changes the same file at the same time, nobody's work should disappear.<br>Google Drive and Dropbox do this for crores of people, without losing a single file. This lesson shows how.` },
    { type: 'callout', tone: 'tip', title: 'Try it yourself first', html: `Think on paper: Riya changed one slide in a 40 MB presentation on her laptop. (1) How much data should be uploaded? (2) How will her phone find out? (3) If the laptop was offline on a flight and Aman edited the same file at that time, what happens? Then compare with this page.` },

    { type: 'p', html: `In the <a href="#/object-storage">object storage</a> lesson we saw a small part of a "Drive" feature on xyz.com: chunks and hashes. Now we build the whole system. This is the <strong>file sync</strong> problem, and it is much harder than it looks.` },
    { type: 'p', html: `A feel for the scale: according to Dropbox's 2020 engineering post, they had more than hundreds of billions of files, trillions of file revisions, exabytes of data, and hundreds of millions of devices. The same post has a line that sums up this lesson: in sync, clients can stay offline for a long time and then come back and merge their changes. For other distributed systems a broken network is a rare accident; for a sync engine it is <em>everyday work</em>.` },
    { type: 'callout', tone: 'term', title: 'New word: sync engine', html: `<strong>What it is:</strong> a program on your laptop or phone that watches your local folder and uploads/downloads files with the server to keep both the same. The Dropbox desktop app is exactly this. On the server there is a partner that tells it "what changed".<br><strong>Why we need it:</strong> the user should not have to press "upload": save a file and it reaches the other devices by itself.<br><strong>Without it:</strong> manual upload/download every time, and different old versions on different devices.` },

    { type: 'h2', text: 'Step 0: three basic ideas, from zero' },
    { type: 'p', html: `Three small ideas before the design. The whole lesson stands on them.` },
    { type: 'callout', tone: 'term', title: 'New word: block (a piece of a file)', html: `<strong>What it is:</strong> we cut every file into pieces of equal size, for example 4 MB. A 16 MB presentation = 4 blocks. Each block is uploaded, stored and downloaded on its own.<br><strong>Why we need it:</strong> if one slide changes in a 40 MB file, send only that one block again, not the whole file. If an upload breaks, send only the remaining blocks.<br><strong>Without it:</strong> the whole file is uploaded again for every small change: mobile data, time and server bandwidth are all wasted.` },
    { type: 'callout', tone: 'term', title: 'New word: hash (a fingerprint of the content)', html: `<strong>What it is:</strong> a function (like SHA-256) that turns any number of bytes into a short "fingerprint", like <code>9f2c1a…</code>. The same bytes always give the same hash. If even one bit changes, the hash is completely different.<br><strong>Why we need it:</strong> name each block by its hash. Now the server can say "I already have this block" just by looking at the hash, and after a download you can match the hash to be sure the data is not damaged.<br><strong>Without it:</strong> we cannot tell which part changed, the same data is stored many times, and a corrupt file is not caught.` },
    { type: 'callout', tone: 'term', title: 'New word: metadata vs blobs', html: `<strong>What it is:</strong> a <em>blob</em> = the real bytes of a file (the blocks). <em>Metadata</em> = information about the file: name, folder, which blocks in which order, version, who has access.<br><strong>Why we need it:</strong> the two behave differently. Bytes are very big and never change: cheap object storage. Metadata is small, changes often, and must be exactly right (consistent): a SQL database. Saving a new version of a file in the metadata is called a <strong>commit</strong>.<br><strong>Without it:</strong> GBs of bytes and lakhs of small updates in one database: neither cheap nor fast.` },
    { type: 'p', html: `Put the three together and a file becomes just a list: <code>pitch.pptx = [h1, h2, h3, h4]</code> (block hashes). This list lives in the metadata DB, and the bytes of each hash live in block storage.` },
    { type: 'h2', text: 'Step 1: requirements' },
    { type: 'compare',
      left: { title: 'Functional', html: `• Upload/download files of any size<br>• A change on one device → appears on the other devices by itself<br>• Edit offline, sync when back online<br>• Version history: bring back an old version<br>• Sharing: give someone view/edit access, shared folders<br><br><strong>Out of scope:</strong> live co-editing like Google Docs (a separate lesson), search, previews` },
      right: { title: 'Non-functional', html: `• <strong>Durability above everything:</strong> a file must never be lost or corrupted<br>• Sync is fast, and only the changed part is sent (bandwidth)<br>• Every device reaches the same state in the end (eventual consistency)<br>• No data loss on conflicts<br>• Correct permissions: the wrong person never gets a single byte` },
    },

    { type: 'h2', text: 'Step 2: napkin maths' },
    { type: 'p', html: `All numbers are assumed. The point is to see how big the difference is between "send the whole file again" and "send only the changed blocks":` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="drU">Daily active users (millions)</label><input id="drU" type="number" value="50" min="1" step="1"></div>
          <div><label for="drE">Edits per user per day</label><input id="drE" type="number" value="5" min="1" step="1"></div>
          <div><label for="drF">Average file size (MB)</label><input id="drF" type="number" value="20" min="1" step="1"></div>
          <div><label for="drC">How many 4 MB blocks one edit changes</label><input id="drC" type="number" value="1" min="1" step="1"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Whole file every time</span><strong class="drA"></strong></div>
          <div class="stat"><span>Only changed blocks</span><strong class="drB"></strong></div>
          <div class="stat"><span>Saving</span><strong class="drS"></strong></div>
          <div class="stat"><span>Metadata commits/sec (avg)</span><strong class="drQ"></strong></div>
        </div>
        <div class="calc-note drN"></div>`;
      const q = s => el.querySelector(s);
      const fmt = mb => mb >= 1e9 ? (mb / 1e9).toFixed(2) + ' PB/day' : (mb / 1e6).toFixed(1) + ' TB/day';
      const upd = () => {
        const u = Math.max(1, +q('#drU').value || 1) * 1e6, e = Math.max(1, +q('#drE').value || 1);
        const f = Math.max(1, +q('#drF').value || 1), c = Math.max(1, +q('#drC').value || 1);
        const full = u * e * f, blk = u * e * Math.min(f, c * 4);
        q('.drA').textContent = fmt(full);
        q('.drB').textContent = fmt(blk);
        q('.drS').textContent = Math.round((1 - blk / full) * 100) + '%';
        q('.drQ').textContent = Math.round(u * e / 1e5).toLocaleString('en-IN');
        q('.drN').textContent = `One day ≈ 10^5 seconds. Every edit is also a metadata "commit": these are small, very many, and must be strongly consistent. Bytes are big and less frequent. The two behave differently, so we keep them in separate systems.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `With the default values, sending the whole file is <strong>5 PB/day</strong>, sending only the changed block is <strong>1 PB/day</strong> (80% saved), and there are ~2,500 metadata commits/sec on average. With bigger files and smaller edits the saving is even bigger.` },

    { type: 'h2', text: 'Step 3: data model, metadata vs blobs' },
    { type: 'p', html: `The most important design decision: separate <strong>the bytes of the file</strong> from <strong>the information about the file</strong>. In Dropbox's 2014 post "Streaming File Synchronization", their model looked like this (the post is old, but the core idea is still worth understanding today):` },
    { type: 'list', items: [
      `<strong>Block:</strong> every file is split into <strong>4 MB blocks</strong> (the last one can be smaller). A <strong>SHA-256</strong> hash is computed for every block.`,
      `<strong>Blocklist:</strong> the content of a file = the list of its block hashes, like <code>[h1, h2, h3, h4]</code>. That alone identifies the file.`,
      `<strong>Namespace:</strong> the root of a folder tree. Every user has one root namespace, and every <em>shared folder</em> is its own namespace that is "mounted" into the roots of many users. Every file = (namespace, relative path).`,
      `<strong>Server File Journal (SFJ):</strong> the big metadata database. Append-only: every row is one <em>version</em> of one file: namespace id, path, blocklist, and a <strong>journal id (JID)</strong> that keeps growing within each namespace. The file bytes are not in it.`,
    ]},
    { type: 'callout', tone: 'term', title: 'A bit more detail: content-addressing and dedupe', html: `We saw the hash in Step 0. When the <em>name of a block is its hash</em>, this is called <strong>content-addressed storage</strong>. Benefit: if two users have the same block, it is stored only once (<strong>dedupe</strong>), and a block never changes (immutable): a changed block = a new hash = a new block.` },
    { type: 'table', head: ['Table / store', 'What it holds', 'What kind of store'], rows: [
      ['File journal (like SFJ)', 'namespace_id, path, blocklist, JID, size, modified_by', 'SQL, strongly consistent; sharding by namespace is the natural choice'],
      ['Namespaces + mounts', 'Which shared folder is where in which user\'s root', 'SQL'],
      ['ACL / permissions', 'namespace or file → user/group, role', 'SQL (with a cache)'],
      ['Device cursors', 'Up to which JID each device is synced (the client also remembers)', 'Client side + server'],
      ['Block index', 'hash → in which storage bucket/volume', 'Dropbox chose a big sharded MySQL for this (Magic Pocket post, 2016)'],
      ['Blocks', 'hash → encrypted bytes', 'Object/block storage (Dropbox: Magic Pocket; generic: S3/GCS)'],
    ]},

    { type: 'h2', text: 'Step 4: high-level design, the journey of one file' },
    { type: 'p', html: `Dropbox's 2014 post had two kinds of servers: the <strong>block server</strong> and the <strong>metadata server</strong>. Idle clients were connected to a <strong>notification server</strong>. Before the diagram, one box at a time:` },
    { type: 'callout', tone: 'term', title: 'Box: metaserver (metadata server)', html: `<strong>What it is:</strong> the server that looks after the "book" of files: which file is in which folder, which blocks it has, which version, and who has access. It never touches the bytes.<br><strong>Why we need it:</strong> the decision "save a new version of the file" (commit) must happen in one place, at one time, in the right way.<br><strong>Without it:</strong> two devices would believe different truths, and nobody would know which version of the file is the latest.` },
    { type: 'callout', tone: 'term', title: 'Box: block server', html: `<strong>What it is:</strong> a server that only takes and gives blocks: "give me the bytes of hash h7" or "keep these bytes under the name h7". It does not care about users or file names (it only checks permission).<br><strong>Why we need it:</strong> the heavy byte work happens on separate machines that can be scaled on their own. The metadata server stays light.<br><strong>Without it:</strong> GBs of traffic would pass through the metadata server, and even small, important commits would become slow.` },
    { type: 'callout', tone: 'term', title: 'Box: notify server and long polling', html: `<strong>What it is:</strong> <em>long polling</em> = the device asks the server "did anything change?", and the server holds the answer until something changes (or a timeout, like 30-480 seconds). As soon as the answer comes, the device opens a new request. The notify server just holds these open requests.<br><strong>Why we need it:</strong> news right after a change, and no wasted requests in between.<br><strong>Without it:</strong> every device asks "anything new?" every few seconds (polling): crores of wasted requests, and still a delay (see the widget below).` },
    { type: 'callout', tone: 'term', title: 'New word: journal and cursor', html: `<strong>What it is:</strong> the <em>journal</em> = a long list in the metadata DB where every change is added as a new line, with a number (JID 1043, 1044...). A <em>cursor</em> = each device's bookmark: "I have read up to JID 1042".<br><strong>Why we need it:</strong> the device just says "what changed after 1042?" and gets only the new changes, even if it comes back 2 days later.<br><strong>Without it:</strong> we would have to compare the whole folder list every time, or a missed notification would mean a change is skipped forever.` },
    { type: 'p', html: `The diagram below is based on Dropbox's 2014 post. Run all the scenarios:` },
    { type: 'flow', title: 'Sync: from laptop to phone', height: 380,
      nodes: [
        { id: 'l', label: 'Riya laptop', sub: 'sync engine', x: 75, y: 200, w: 120, kind: 'client', info: 'What it is: the sync engine on Riya\'s laptop. It watches the file system, cuts a changed file into 4 MB blocks, computes hashes, and commits. It remembers a cursor (JID) for each namespace.' },
        { id: 'm', label: 'Metaserver', sub: 'commit, list', x: 360, y: 70, w: 150, kind: 'server', info: 'What it is: the server that keeps the book of files. On a commit it checks: are these block hashes on the server? Is this user allowed to write in this namespace? If some blocks are missing it returns "need blocks". If all are there, a new row goes into the SFJ.' },
        { id: 'j', label: 'File journal', sub: 'SFJ, metadata DB', x: 590, y: 60, w: 150, kind: 'data', info: 'What it is: the long list in the metadata DB. An append-only journal: every row = one version of one file (namespace, path, blocklist, JID). No bytes, only a list of hashes.' },
        { id: 'b', label: 'Block server', sub: 'hash → bytes', x: 360, y: 200, w: 150, kind: 'server', info: 'What it is: a server that only takes and gives blocks. It stores and retrieves blocks. Before a download it checks that the asking user has access to that block. One request has a byte limit, so big files take many requests.' },
        { id: 's', label: 'Block storage', sub: 'Magic Pocket / S3', x: 360, y: 330, w: 170, kind: 'data', info: 'What it is: a big, cheap cupboard for bytes. Immutable blocks, key = SHA-256 hash. Dropbox\'s own system is Magic Pocket; a common design uses object storage like S3/GCS.' },
        { id: 'n', label: 'Notify server', sub: 'long poll', x: 600, y: 335, w: 140, kind: 'queue', info: 'What it is: a server that holds open long-poll requests. Idle devices keep one long-poll request open here. As soon as there is a new commit in their namespace, the answer goes out: "there are changes". It carries no data, only a signal.' },
        { id: 'p', label: 'Riya phone', sub: 'sync engine', x: 645, y: 200, w: 120, kind: 'client', info: 'What it is: the sync engine on Riya\'s phone. As soon as it gets a notification it asks for a "list" with its cursor: what changed after this JID? Then it downloads only the blocks it does not have locally and rebuilds the file.' },
      ],
      edges: [{ a: 'l', b: 'm' }, { a: 'l', b: 'b' }, { a: 'm', b: 'j' }, { a: 'm', b: 'b' }, { a: 'b', b: 's' }, { a: 'm', b: 'n' }, { a: 'n', b: 'p' }, { a: 'p', b: 'm' }, { a: 'p', b: 'b' }],
      scenarios: [
        { name: 'New file', steps: [
          { title: 'Only hashes first', text: 'The laptop cut pitch.pptx (16 MB) into 4 blocks and sent only the blocklist to the metaserver. No bytes yet.', go: 'l>m', msg: 'commit(ns=riya, "/pitch.pptx", [h1,h2,h3,h4])' },
          { title: 'Need blocks', text: 'The server has none of these hashes. Answer: all four are needed.', go: 'res:m>l', msg: '→ need_blocks [h1,h2,h3,h4]' },
          { title: 'Upload the blocks', text: 'The laptop sends the blocks straight to the block server (in a batch). The block server stores them under their hash names.', flood: { paths: ['l>b>s'], n: 4 }, after: { s: { state: 'ok', sub: '+4 blocks' } }, msg: 'store_batch [h1:…, h2:…, h3:…, h4:…]' },
          { title: 'Commit again: now the file "exists"', text: 'This time all hashes are found. A new row in the SFJ, JID 1043. Before this, other devices could not even see the file: the commit is that moment.', go: ['l>m', 'm>j', 'res:m>l'], after: { j: { sub: 'JID 1043 pitch.pptx' } } },
          { title: 'Signal to the phone', text: 'The phone\'s long-poll request was open. Now its answer goes out: "there are changes in this namespace".', go: ['evt:m>n', 'evt:n>p'], msg: '{ "changes": true }' },
          { title: 'Phone: list, then only missing blocks', text: 'The phone asks for the list with its cursor (JID 1042), gets the new row, then fetches the blocks it does not have from the block server and builds the file.', go: ['p>m', 'res:m>p', 'p>b', 'res:b>p'], after: { p: { state: 'ok', sub: 'pitch.pptx synced' } } },
        ]},
        { name: 'One slide changed (dedupe)', steps: [
          { title: 'New blocklist', text: 'Slide 5 changed; it was in block 2. New hash h2x. The other three hashes are the same.', go: 'l>m', msg: 'commit("/pitch.pptx", [h1,h2x,h3,h4])' },
          { title: 'Only one block needed', text: 'h1, h3, h4 are already on the server.', go: 'res:m>l', msg: '→ need_blocks [h2x]' },
          { title: '4 MB, not 16 MB', text: 'Upload only one block, then commit. New row JID 1044; the old row (JID 1043) also stays: that is the version history.', go: ['l>b>s', 'l>m', 'm>j'], after: { j: { sub: 'JID 1044 (v2)' } } },
          { title: 'The phone also fetches only one block', text: 'The phone already has h1, h3, h4 (in the old file). It downloads only h2x.', go: ['evt:m>n', 'evt:n>p', 'p>m', 'res:m>p', 'p>b', 'res:b>p'], after: { p: { state: 'ok', sub: 'v2, 1 block' } } },
        ]},
        { name: 'Upload broke in the middle', steps: [
          { title: 'Two blocks arrived, then the internet went', text: 'The laptop managed to send 2 of 4 blocks.', go: ['l>b>s', 'lost:l>b'], after: { l: { state: 'warn', sub: 'offline' } } },
          { title: 'No half file is visible', text: 'The commit never happened, so there is no row in the SFJ. The phone sees neither a half file nor a notification. Blocks first, commit later: this makes the new version of the file <strong>atomic</strong>.', focus: ['j'] },
          { title: 'Back online: only the other two', text: 'The laptop commits again. The server says only h3, h4 are needed now (h1, h2 already arrived). Useless blocks from half uploads (that never got a commit) are cleaned up later by garbage collection: this is the common approach.', set: { l: { state: '', sub: 'online' } }, go: ['l>m', 'res:m>l', 'l>b>s', 'l>m', 'm>j'] },
        ]},
        { name: 'Phone offline for 2 days', steps: [
          { title: 'The phone was off', text: 'Meanwhile the laptop made 7 commits: JID 1044 to 1051. The notifications never reached the phone.', set: { p: { state: 'dim', sub: 'cursor: 1044' } }, go: ['l>m', 'm>j', 'lost:n>p'], after: { j: { sub: 'JID 1051' } } },
          { title: 'Back: asked with the cursor', text: 'Losing notifications broke nothing. The phone sends its cursor: "what happened after 1044?" The server gives 7 rows. A notification is only a signal; the journal is the truth.', set: { p: { state: '', sub: 'cursor: 1044' } }, go: ['p>m', 'm>j', 'res:j>m', 'res:m>p'], msg: 'list(cursor=1044) → 7 entries, new cursor=1051' },
          { title: 'Long-poll again', text: 'After downloading the missing blocks, the phone opens a long-poll on the notify server again.', go: ['p>b', 'res:b>p', 'p>n'], after: { p: { state: 'ok', sub: 'cursor: 1051' } } },
        ]},
      ],
    },
    { type: 'h2', text: 'Deep dive 1: blocks, hashes and dedupe' },
    { type: 'p', html: `Problem: one slide changed in a 38 MB presentation and the whole file is uploaded again. On mobile data this costs both money and time. Solution: cut the file into fixed 4 MB blocks, hash each block, and send only the blocks whose hash the server does not have. Run it yourself (a toy hash; the real one is SHA-256):` },
    { type: 'custom', render(el) {
      /*SIM*/
      const BS = 4;
      const hash = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return ('0000000' + h.toString(16)).slice(-8).slice(0, 5); };
      const V1 = Array.from({ length: 38 }, (_, i) => 'm' + i);
      const blocks = units => { const out = []; for (let i = 0; i < units.length; i += BS) out.push(units.slice(i, i + BS)); return out; };
      const syncV = (units, server) => {
        const bl = blocks(units).map(b => ({ h: hash(b.join('|')), mb: b.length }));
        const need = bl.filter(b => !server.has(b.h));
        const uniq = [...new Set(need.map(b => b.h))];
        const up = uniq.reduce((a, h) => a + need.find(b => b.h === h).mb, 0);
        uniq.forEach(h => server.add(h));
        return { bl, need: uniq, up, total: units.length };
      };
      /*ENDSIM*/
      el.innerHTML = `<div style="font-size:14px;color:var(--ink-3)">pitch.pptx (38 MB): each box is one block (4 MB, the last one smaller). <strong>Click any block</strong> = edit one slide inside that block.</div>
        <div class="drkBl" style="display:flex;flex-wrap:wrap;gap:6px;margin:10px 0"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          <button type="button" class="btn small" data-x="app">Add 6 MB at the end</button>
          <button type="button" class="btn small" data-x="front">Add a 1 MB slide at the start</button>
          <button type="button" class="btn small" data-x="v1">Restore version 1</button>
          <button type="button" class="btn small ghost" data-x="reset">Reset</button>
        </div>
        <pre class="drkMsg" style="font:12px var(--f-mono);background:var(--surface-2);border-radius:var(--r-sm);padding:8px 10px;margin:10px 0 0;white-space:pre-wrap;word-break:break-all"></pre>
        <div class="stats">
          <div class="stat"><span>Version</span><strong class="drkV"></strong></div>
          <div class="stat"><span>File size</span><strong class="drkT"></strong></div>
          <div class="stat"><span>Uploaded in this sync</span><strong class="drkU"></strong></div>
          <div class="stat"><span>Unique blocks on server</span><strong class="drkS"></strong></div>
        </div>
        <div class="calc-note drkN"></div>`;
      const q = s => el.querySelector(s);
      let units, server, ver, edits;
      const show = (r, why) => {
        q('.drkBl').innerHTML = r.bl.map((b, i) => {
          const nw = r.need.includes(b.h);
          return `<button type="button" data-b="${i}" style="cursor:pointer;min-width:62px;border:1.5px solid ${nw ? 'var(--accent)' : 'var(--line-2)'};background:${nw ? 'var(--accent-soft)' : 'var(--surface-2)'};color:var(--ink);border-radius:var(--r-sm);padding:4px 6px;font:12px var(--f-mono);text-align:left">
            <div>B${i + 1} · ${b.mb} MB</div><div style="color:${nw ? 'var(--accent-ink)' : 'var(--ink-3)'}">${b.h} ${nw ? 'UPLOAD' : 'skip'}</div></button>`;
        }).join('');
        q('.drkMsg').textContent = `commit([${r.bl.map(b => b.h).join(', ')}])\n→ need_blocks [${r.need.join(', ')}]`;
        q('.drkV').textContent = 'v' + ver;
        q('.drkT').textContent = r.total + ' MB';
        q('.drkU').textContent = r.up + ' MB';
        q('.drkS').textContent = server.size;
        q('.drkN').textContent = why;
        el.querySelectorAll('[data-b]').forEach(bt => bt.onclick = () => {
          const i = +bt.dataset.b, k = i * BS + Math.min(1, units.length - 1 - i * BS);
          units = units.slice(); units[k] = units[k] + "'e" + (++edits); ver++;
          const r2 = syncV(units, server);
          show(r2, `Only the hash of block B${i + 1} changed. The other blocks have the same hash, so the server skips them. Of the ${r2.total} MB file, only ${r2.up} MB was sent.`);
        });
      };
      const reset = () => {
        units = V1.slice(); server = new Set(); ver = 1; edits = 0;
        show(syncV(units, server), 'First time: the server has nothing, so all blocks are uploaded. Now click any block.');
      };
      el.querySelectorAll('[data-x]').forEach(b => b.onclick = () => {
        const x = b.dataset.x;
        if (x === 'reset') return reset();
        ver++;
        if (x === 'app') { units = units.concat(Array.from({ length: 6 }, (_, i) => 'n' + ver + '.' + i)); show(syncV(units, server), 'The last block (which was not full before) changed and new blocks were made. All earlier blocks are skipped.'); }
        if (x === 'front') { units = ['s' + ver].concat(units); show(syncV(units, server), 'Adding 1 MB at the start moved every block boundary by 1 MB, so almost every block hash changed. This is the weakness of fixed-size blocks; the fix is content-defined chunking (object storage lesson) or an rsync-like delta inside a block.'); }
        if (x === 'v1') { units = V1.slice(); show(syncV(units, server), 'Bringing back an old version = just committing the old blocklist. All blocks are already on the server: 0 MB upload. This is why version history is cheap.'); }
      });
      reset();
    }},
    { type: 'list', items: [
      `<strong>Savings inside a block too:</strong> according to Dropbox's 2014 post, compression and rsync (sending only the difference between the old and new bytes) were also used to make block upload/download requests smaller.`,
      `<strong>Version history almost for free:</strong> an old version = an old blocklist. Blocks are immutable and reused, so 10 versions do not mean 10 times the storage.`,
      `<strong>Streaming sync:</strong> earlier, the other device fetched nothing until the upload was fully committed. In 2014 Dropbox built "streaming sync": the other device starts prefetching blocks even before the commit. According to the post, multi-device sync time for big files got up to ~2x better.`,
    ]},
    { type: 'callout', tone: 'warn', title: 'The security side of dedupe', html: `If the server sees a hash, assumes "this block exists", and also lets anyone download it without a check, then someone could ask for another person's data just by knowing a hash. That is why, in Dropbox's 2014 post, the block server checks before a download that the user has access to that block (through some file that is in their namespace). Dedupe across users can also reveal that "someone has this file", so many systems dedupe only within one user or one account.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `"Dedupe means finding duplicate files and deleting them?" No. The user still sees all their files. Dedupe happens <em>inside the storage</em>: when two files (or two versions) share some blocks, those blocks are kept on disk only once, and the blocklists of both files point to the same hash.` },

    { type: 'h3', text: 'Where blocks live: Magic Pocket' },
    { type: 'p', html: `Dropbox moved away from S3 and built its own block storage, <strong>Magic Pocket</strong>. According to their 2016 architecture post:` },
    { type: 'list', items: [
      `It is an <strong>immutable block store</strong>: blocks (max 4 MB, compressed + encrypted) never change once written. The layer above (the file journal) keeps track of changes.`,
      `A block's key is usually its SHA-256 hash. Blocks are grouped into ~1 GB "buckets", so that replacing a disk or doing erasure coding does not mean handling tiny 4 MB pieces.`,
      `New blocks are first replicated directly to several machines; later the buckets are made cheaper with <strong>erasure coding</strong> (splitting data into pieces plus a few extra "parity" pieces on different disks; even if some disks die the data can be rebuilt, and it takes less space than full copies). Every block is in at least two different geographic zones.`,
      `For the block index (hash → where it is kept), they did not choose a fancy distributed hash table but a big <strong>sharded MySQL</strong>, because it was simple and had fewer unknowns.`,
    ]},
    { type: 'image', src: 'assets/img/design-drive/disk-server.jpg', alt: 'An open red storage server with dozens of hard disks in long rows at the top, and the other slots empty', caption: 'This is what block storage really looks like: a box full of hard disks. This is Backblaze\'s (a cloud backup company) open design Storage Pod 2.0, around 2011, half full (45 disks when full). Systems like Magic Pocket or S3 run thousands of such disk-filled servers as one big block store.', credit: { text: 'ChrisDag, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Backblaze_2.0_half-full_chassis_-_2_(6073928533).jpg', license: 'CC BY 2.0' } },
    { type: 'p', html: `In a common design (like Google Drive) this part is <a href="#/object-storage">object storage</a> like S3/GCS. In an interview it is enough to say: blocks are content-addressed, immutable, and live in durable object storage.` },

    { type: 'h2', text: 'Deep dive 2: how do other devices find out?' },
    { type: 'p', html: `How does the phone find out that the laptop changed something? Asking "anything new?" every 5 seconds (polling) on crores of devices is a storm of wasted requests, plus a 5 second delay. Three ways (see the <a href="#/realtime">realtime lesson</a>):` },
    { type: 'table', head: ['Method', 'How', 'Where you see it'], rows: [
      ['Long polling', 'The client sends a request, and the server holds the answer until something changes or a timeout. As soon as the answer comes, the client opens a new request.', 'Dropbox desktop (2014 post: idle clients long-poll the notification server). The Dropbox API\'s <code>list_folder/longpoll</code>'],
      ['WebSocket / push', 'One open connection; the server sends a message whenever it wants.', 'Many modern sync clients; OS push on mobile (APNs/FCM) when the app is closed'],
      ['Webhook / watch', 'A server sends a notification to another server\'s URL.', 'Google Drive API <code>changes.watch</code> (channel max 7 days), then the real changes from <code>changes.list</code>'],
    ]},
    { type: 'p', html: `According to the Dropbox API docs, <code>list_folder/longpoll</code> takes a <strong>cursor</strong>, a timeout from 30 to 480 seconds (default 30), and the server adds a random <strong>jitter</strong> of up to 90 seconds so that all clients do not reconnect at the same moment (thundering herd). The answer only has <code>changes: true/false</code> and sometimes <code>backoff</code> (wait this many seconds before coming back). The client then gets the real changes with <code>list_folder/continue</code> and the cursor.` },
    { type: 'p', html: `See the difference between polling and long polling in numbers. All numbers are assumed; the average jitter is taken as 45 seconds (the Dropbox API adds 0-90 s):` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="drpD">Online devices (millions)</label><input id="drpD" type="number" value="20" min="1" step="1"></div>
          <div><label for="drpC">Changes per device per hour</label><input id="drpC" type="number" value="2" min="0" step="1"></div>
          <div><label for="drpP">Polling: ask every how many seconds: <strong class="drpPv"></strong></label><input id="drpP" type="range" min="1" max="60" value="5"></div>
          <div><label for="drpT">Long poll timeout (second): <strong class="drpTv"></strong></label><input id="drpT" type="range" min="30" max="480" step="30" value="30"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Polling: requests/sec</span><strong class="drpA"></strong></div>
          <div class="stat"><span>Polling: useful requests</span><strong class="drpU"></strong></div>
          <div class="stat"><span>Polling: average delay</span><strong class="drpL"></strong></div>
          <div class="stat"><span>Long poll: requests/sec</span><strong class="drpB"></strong></div>
          <div class="stat"><span>Long poll: open connections</span><strong class="drpO"></strong></div>
          <div class="stat"><span>Long poll: delay</span><strong class="drpM"></strong></div>
        </div>
        <div class="calc-note drpN"></div>`;
      const q = s => el.querySelector(s), J = 45;
      const fm = n => n >= 1e6 ? (n / 1e6).toFixed(2) + ' M' : Math.round(n).toLocaleString('en-IN');
      const upd = () => {
        const D = Math.max(1, +q('#drpD').value || 1) * 1e6, C = Math.max(0, +q('#drpC').value || 0);
        const P = +q('#drpP').value, T = +q('#drpT').value;
        const poll = D / P, useful = Math.min(1, C * P / 3600), lp = D / (T + J) + D * C / 3600;
        q('.drpPv').textContent = P; q('.drpTv').textContent = T;
        q('.drpA').textContent = fm(poll);
        q('.drpU').textContent = (useful * 100).toFixed(2) + '%';
        q('.drpL').textContent = (P / 2).toFixed(1) + ' s';
        q('.drpB').textContent = fm(lp);
        q('.drpO').textContent = fm(D);
        q('.drpM').textContent = '~1 s';
        q('.drpN').textContent = `Polling every ${P} s: ${fm(poll)} requests/sec, and only ${(useful * 100).toFixed(2)}% of them find something new; news of a change comes ${(P / 2).toFixed(1)} s late on average. Long poll: ${fm(lp)} requests/sec (${(poll / lp).toFixed(1)} times fewer) and the news is almost instant. The cost: ${fm(D)} connections always open, which use the memory of the notify servers. A longer timeout means even fewer requests, but proxies/NAT in between may cut long idle connections.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `With the defaults: polling is <strong>40 lakh requests/sec</strong> (only 0.28% useful), long poll is <strong>~2.78 lakh/sec</strong>, about 14 times fewer, and the delay drops from 2.5 s to ~1 s. In return, 2 crore connections must be kept open.` },
    { type: 'callout', tone: 'term', title: 'A bit more detail: cursor', html: `As we saw in Step 4, a <strong>cursor</strong> is a bookmark: "I have read the journal up to here". In Dropbox it was the JID, in the Google Drive API it is the <code>pageToken</code>. The client sends the cursor, and the server gives only the changes after it, plus a new cursor. This is why nothing is lost even if a notification is lost: next time the cursor gets everything.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `"Send the file data inside the notification, it saves one round trip." This is a mistake. A notification should be a small signal (<em>something changed</em>). The data comes from the journal through the cursor. Otherwise a lost notification = lost data, and heavy messages on crores of connections.` },

    { type: 'h2', text: 'Deep dive 3: conflicts' },
    { type: 'p', html: `Riya and Aman work on <code>report.docx</code> in a shared folder. Riya edits on a flight (offline), and at the same time Aman edits from the office and syncs. Riya lands. Now what? Three options:` },
    { type: 'list', items: [
      `<strong>Last write wins:</strong> whoever arrived later wins. Simple, but Aman's work silently disappears. In file sync this is not allowed, because durability comes first.`,
      `<strong>Merge them:</strong> this might work for plain text, but the server does not understand binary files like .docx, .psd or .mp4 at all. (This is why Google Docs uses a different method: live co-editing, a separate lesson.)`,
      `<strong>Keep both:</strong> one version under the original name, the other under a different name. This is what Dropbox does: a <strong>conflicted copy</strong>.`,
    ]},
    { type: 'callout', tone: 'term', title: 'New word: optimistic concurrency and conflicted copy', html: `<strong>What it is:</strong> with every commit, the client says which version (<strong>base revision</strong>) its edit is based on. The server accepts it only if the base = the server's current version. Otherwise it is a conflict. This is called <strong>optimistic concurrency</strong>: no lock in advance, just a check at write time.<br><strong>Why we need it:</strong> locking from an offline device is impossible (it cannot talk to the server), but a check at write time is always possible.<br><strong>Without it:</strong> whoever arrived later would silently wipe out the earlier person's work.<br><strong>Conflicted copy:</strong> according to the Dropbox help docs, when two people edit the same file, or one edits offline and the other online, Dropbox makes a <strong>conflicted copy</strong>: its name has the editor's name, "conflicted copy" and the date, and the version saved later becomes that copy.` },
    { type: 'p', html: `Try it yourself. First press the "Demo" buttons, then make your own sequences (Online/Offline and Edit):` },
    { type: 'custom', render(el) {
      /*SIM*/
      const NM = { L: 'Riya', P: 'Aman' };
      const init = () => ({ rev: 1, by: 'Riya', files: ['report.docx'], dev: { L: { on: true, base: 1, dirty: false }, P: { on: true, base: 1, dirty: false } }, log: ['Both have report.docx rev 1. Everything is synced.'] });
      const other = d => (d === 'L' ? 'P' : 'L');
      const sync = (S, d) => {
        const v = S.dev[d];
        if (!v.on) return;
        if (v.dirty) {
          if (v.base === S.rev) {
            S.rev++; S.by = NM[d]; v.base = S.rev; v.dirty = false;
            S.log.push(`${NM[d]}'s commit (base rev ${S.rev - 1}) → new rev ${S.rev} on the server.`);
            const o = S.dev[other(d)];
            if (o.on && !o.dirty) { o.base = S.rev; S.log.push(`${NM[other(d)]} was online: notification → rev ${S.rev} downloaded.`); }
          } else {
            const name = `report (${NM[d]}'s conflicted copy 2026-10-04).docx`;
            S.files.push(name);
            S.log.push(`CONFLICT: ${NM[d]}'s edit was based on rev ${v.base}, the server is now at rev ${S.rev}. Nobody's work was overwritten: ${NM[d]}'s version became "${name}".`);
            v.base = S.rev; v.dirty = false;
          }
        } else if (v.base < S.rev) {
          v.base = S.rev; S.log.push(`${NM[d]} got rev ${S.rev} using the cursor.`);
        }
      };
      const act = (S, a, d) => {
        const v = S.dev[d];
        if (a === 'edit') { v.dirty = true; S.log.push(`${NM[d]} made an edit${v.on ? '' : ' (offline, local)'}.`); sync(S, d); }
        if (a === 'net') { v.on = !v.on; S.log.push(`${NM[d]} ${v.on ? 'online' : 'offline'}.`); sync(S, d); }
        return S;
      };
      /*ENDSIM*/
      const card = d => `<div style="flex:1 1 150px;border:1px solid var(--line-2);border-radius:var(--r);padding:10px;background:var(--surface)">
          <div style="font-weight:600">${NM[d]} <span style="color:var(--ink-3);font-weight:400">(${d === 'L' ? 'laptop' : 'phone'})</span></div>
          <div class="cf${d}s" style="font:12px var(--f-mono);margin:6px 0;color:var(--ink-2)"></div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            <button type="button" class="btn small" data-a="edit" data-d="${d}">Edit</button>
            <button type="button" class="btn small ghost" data-a="net" data-d="${d}">Online/Offline</button>
          </div></div>`;
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:10px">${card('L')}
          <div style="flex:1 1 150px;border:1px solid var(--line-2);border-radius:var(--r);padding:10px;background:var(--surface-2)">
            <div style="font-weight:600">Server</div><div class="cfS" style="font:12px var(--f-mono);margin-top:6px;color:var(--ink-2)"></div></div>
          ${card('P')}</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">
          <button type="button" class="btn small primary" data-p="conf">Demo: both edit offline</button>
          <button type="button" class="btn small" data-p="seq">Demo: one after another</button>
          <button type="button" class="btn small ghost" data-p="reset">Reset</button>
        </div>
        <ol class="cfLog" style="font-size:14px;margin:10px 0 0;padding-left:20px"></ol>`;
      const q = s => el.querySelector(s);
      let S = init();
      const draw = () => {
        ['L', 'P'].forEach(d => { const v = S.dev[d]; q('.cf' + d + 's').innerHTML = `${v.on ? 'online' : '<span style="color:var(--amber)">offline</span>'} · base rev ${v.base}${v.dirty ? ' · <span style="color:var(--accent-ink)">unsynced edit</span>' : ''}`; });
        q('.cfS').innerHTML = `rev ${S.rev} (by ${S.by})<br>${S.files.map(f => '• ' + f.replace(/</g, '&lt;')).join('<br>')}`;
        q('.cfLog').innerHTML = S.log.slice(-6).map(x => `<li>${x.replace(/</g, '&lt;')}</li>`).join('');
      };
      el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { act(S, b.dataset.a, b.dataset.d); draw(); });
      el.querySelectorAll('[data-p]').forEach(b => b.onclick = () => {
        S = init();
        if (b.dataset.p === 'conf') [['net', 'L'], ['edit', 'L'], ['edit', 'P'], ['net', 'L']].forEach(x => act(S, x[0], x[1]));
        if (b.dataset.p === 'seq') [['edit', 'L'], ['edit', 'P']].forEach(x => act(S, x[0], x[1]));
        draw();
      });
      draw();
    }},
    { type: 'p', html: `In Demo 1, Aman's commit arrived first (base rev 1 = server rev 1, accepted). Riya's edit was also based on rev 1, but the server was now at rev 2, so it was a conflict: Riya's work became a separate file, and nothing was overwritten. In Demo 2 both were online, every edit synced at once and the other person took the new version, so there was no conflict at all. A conflict only happens when two edits are built on the same base.` },

    { type: 'h3', text: 'Not just files, folders too: why Dropbox rewrote its sync engine' },
    { type: 'p', html: `Dropbox's March 2020 post "Rewriting the heart of our sync engine" explains that they spent ~4 years rewriting the desktop sync engine from scratch, codename <strong>Nucleus</strong>, and called the old one "Sync Engine Classic". Why? The biggest reason was the <strong>data model</strong>. Some examples from the post:` },
    { type: 'list', items: [
      `<strong>Move = delete + add:</strong> in Classic, moving a file was two separate operations. If a network hiccup let the delete arrive but not the add, the user saw the file vanish from the other devices, even though they had only moved it.`,
      `<strong>No stable ID:</strong> files had no identity that stayed the same after a move. The model was built for a world before sharing.`,
      `<strong>Folder cycles:</strong> Alberto, offline, moved "Archives" into "January", and Beatrice moved "Drafts" into "Archives". Applying both directly would create a loop (cycle) of folders. Classic duplicated directories and merged them; Nucleus keeps the original folders and the result depends on whose move was uploaded first.`,
    ]},
    { type: 'p', html: `What changed in Nucleus (according to the post): the code is in <strong>Rust</strong>; almost all logic runs on a single "control thread" that is <strong>deterministic</strong> when the inputs and scheduling are fixed, so from a <strong>seed</strong> they generate random file states and schedules and test millions of simulated scenarios every day, and when a bug is found they reproduce it with the same seed; the client-server protocol is <strong>strongly consistent</strong>; shared folders and files have globally unique IDs; and folder moves are atomic, no matter how many files are inside.` },
    { type: 'callout', tone: 'why', title: 'Interview depth: what is the lesson?', html: `File sync is a distributed system where every client can stay "partitioned" for a long time. So: (1) give every file/folder a stable unique ID, not a path; (2) keep operations atomic (a move is one operation, not two); (3) the server's journal is the source of truth, and clients catch up with a cursor; (4) never drop data on conflicts, make a copy; (5) build a design you can test with seed-based simulation.` },

    { type: 'h2', text: 'Deep dive 4: versions and sharing' },
    { type: 'h3', text: 'Version history' },
    { type: 'p', html: `The journal is append-only, so every commit is a version. Restore = commit the old blocklist as a new version (the blocks already exist, 0 upload; you saw this with "Restore version 1" in the widget above). But keeping everything forever is costly, so there is a retention limit:` },
    { type: 'list', items: [
      `<strong>Dropbox</strong> (help docs): depending on the plan, 30 days (Basic, Plus, Family), 180 days (plans like Professional, Business), or 365 days (plans like Advanced, Enterprise).`,
      `<strong>Google Drive</strong> (Drive API docs): old revisions of non-Google files are usually kept for 30 days, and may be removed earlier after 100 revisions; you can mark a revision as "Keep forever" (max 200 per file).`,
      `When no version refers to a block any more, that block can be deleted. This needs a <strong>reference count</strong> for every block or a periodic mark-and-sweep <strong>garbage collection</strong>: this is the common industry approach, and a mistake means data loss, so it runs very slowly and with safety checks.`,
    ]},
    { type: 'h3', text: 'Sharing and permissions' },
    { type: 'p', html: `In Dropbox's model, a shared folder is a <strong>namespace</strong> that is mounted into the roots of many users. Sharing does not copy the file: only a "mount" is added to Aman's root, and both use the same namespace journal. In Google Drive every file/folder has <strong>permissions</strong>: a role (owner, writer, commenter, reader; in shared drives also organizer/fileOrganizer) and a type (user, group, domain, anyone). A folder's access passes to the files inside it (inheritance).` },
    { type: 'flow', title: 'Shared folder: share, access check, revoke', height: 320,
      nodes: [
        { id: 'r', label: 'Riya', sub: 'owner', x: 80, y: 90, w: 110, kind: 'client', info: 'What it is: Riya\'s device; she is the owner of the folder "Trip". She gives Aman editor access.' },
        { id: 'api', label: 'Metaserver', sub: 'share + ACL check', x: 290, y: 160, w: 160, kind: 'server', info: 'What it is: the metadata server, which also handles sharing and permissions. On every list/commit it checks: which role does this user have on this namespace? On a share it mounts the namespace in Aman\'s root and sends a notification.' },
        { id: 'acl', label: 'ACL + mounts', sub: 'metadata DB', x: 290, y: 280, w: 160, kind: 'data', info: 'What it is: the permission (ACL = access control list) and mount tables of the metadata DB. namespace "Trip" → {Riya: owner, Aman: editor}; a mount at /Trip in Aman\'s root. Permissions are read very often, so they are cached, but on a revoke the cache is invalidated at once.' },
        { id: 'blk', label: 'Block server', sub: 'access check', x: 530, y: 160, w: 150, kind: 'server', info: 'What it is: the server that gives out blocks. Before giving a block it makes sure the user has access through some file that contains this block. Just knowing the hash is not enough.' },
        { id: 'a', label: 'Aman', sub: 'editor', x: 80, y: 262, w: 110, kind: 'client', info: 'What it is: Aman\'s sync engine (his laptop). After the share, /Trip appears in his folder.' },
        { id: 'x', label: 'Stranger', sub: 'no access', x: 640, y: 280, w: 130, kind: 'threat', info: 'What it is: an unknown person with no access. Someone learned a block hash from somewhere and is asking the block server for it directly.' },
      ],
      edges: [{ a: 'r', b: 'api' }, { a: 'api', b: 'acl' }, { a: 'a', b: 'api' }, { a: 'api', b: 'blk' }, { a: 'a', b: 'blk' }, { a: 'x', b: 'blk' }],
      scenarios: [
        { name: 'Share it', steps: [
          { title: 'Riya shares', text: 'Editor role for Aman.', go: 'r>api', msg: 'share(ns="Trip", user="aman", role="editor")' },
          { title: 'ACL + mount', text: 'No file is copied. One entry in the ACL, and a mount in Aman\'s root.', go: ['api>acl', 'res:acl>api'], after: { acl: { sub: 'Aman: editor' } } },
          { title: 'Aman syncs', text: 'Aman\'s device gets a notification, lists the journal of the new namespace and fetches the blocks. The block server checks access for every block.', go: ['evt:api>a', 'a>api', 'res:api>a', 'a>blk', 'res:blk>a'], after: { a: { state: 'ok', sub: '/Trip synced' } } },
        ]},
        { name: 'Without access', steps: [
          { title: 'Asking directly with a hash', text: 'The stranger asks the block server for data with a block hash.', go: 'x>blk', msg: 'retrieve_batch [h7]' },
          { title: 'ACL check fails', text: 'The block server asks the metaserver: does this user have access to any namespace that has a file with h7? No.', go: ['blk>api', 'api>acl', 'res:acl>api', 'res:api>blk'] },
          { title: '403', text: 'Not a single byte. Content-addressing must not mean "if you know the hash, you get the data".', go: 'bad:blk>x', after: { x: { state: 'down', sub: '403 Forbidden' } } },
        ]},
        { name: 'Remove access', steps: [
          { title: 'Riya revokes', text: 'Aman\'s access is removed.', go: ['r>api', 'api>acl'], after: { acl: { sub: 'Aman: removed' } } },
          { title: 'All later requests fail', text: 'Aman\'s next list or block request stops at the permission check. His sync engine is told to unmount the namespace, and the folder is removed from his devices.', go: ['a>api', 'bad:api>a'], after: { a: { state: 'warn', sub: 'unmounted' } } },
          { title: 'The truth: what was downloaded stays with him', text: 'A revoke stops future access. A copy that Aman already saved somewhere else cannot be taken back. This is why separate controls like "view only" and blocking downloads exist for sensitive data.', focus: ['a'] },
        ]},
      ],
    },
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `"Public link = the file is copied into a public folder." No. A share link is a <strong>capability</strong>: a long token that cannot be guessed, which points to one file/folder and one role. Remove the link (revoke) and the token is useless. This is why links come with options like expiry, a password and "only my company".` },
    { type: 'h2', text: 'Failure scenarios and bottlenecks' },
    { type: 'table', head: ['What broke', 'Impact', 'Protection'], rows: [
      ['Upload in the middle', 'A half file?', 'Blocks first, commit later: with no commit the file is not visible at all. On retry, only the missing blocks'],
      ['A notification was lost', 'The device fell behind', 'Cursor: next time all changes come from the journal. On long-poll timeout the client reconnects by itself'],
      ['Lakhs of clients reconnect at once', 'A storm on the notify servers', 'Random jitter and a backoff signal from the server (the Dropbox longpoll API has both)'],
      ['Two offline edits', 'Someone\'s work overwritten?', 'Base revision check; on conflict a conflicted copy, never data loss'],
      ['Crash in the middle of a move', 'File gone or duplicated', 'Stable IDs + atomic move (the Nucleus lesson)'],
      ['Corrupt block / disk failure', 'Damaged file', 'Verify with the hash (no match = bad block), replicas + erasure coding, several zones'],
      ['A very big shared folder (lakhs of files, thousands of members)', 'One namespace\'s journal is hot', 'Shard by namespace; caching and rate limits on hot namespaces; this is the common approach'],
      ['GC deleted a live block by mistake', 'Permanent data loss', 'Refcount + delete with a delay, soft-delete first; GC is the slowest code with the most checks'],
    ]},

    { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>Block size:</strong> small blocks = less upload per edit and more dedupe, but more hashes, more metadata rows, more requests. Dropbox chose 4 MB. If inserts are common, use content-defined chunking.<br><strong>Notification:</strong> long poll or WebSocket on desktop/web; OS push on mobile; webhooks server-to-server. In every case the real data comes through the cursor.<br><strong>Conflict:</strong> binary files → conflicted copy; text/structured docs that need live collaboration → operational transform / CRDT (Google Docs lesson).` },
    { type: 'h2', text: 'How to say it in an interview' },
    { type: 'list', ordered: true, items: [
      `<strong>Requirements:</strong> upload/download, multi-device sync, offline, versions, sharing. NFR: durability #1, bandwidth efficiency, eventual consistency across devices.`,
      `<strong>Core idea:</strong> keep metadata and blobs separate. File = blocklist of content hashes (Dropbox: 4 MB, SHA-256). Blocks are immutable, content-addressed, deduped.`,
      `<strong>Write path:</strong> commit(blocklist) → need_blocks → upload missing → commit again → journal row (atomic).`,
      `<strong>Read path:</strong> the notification (long poll / push) is only a signal; the client lists the journal with its cursor and fetches only the missing blocks.`,
      `<strong>Conflicts:</strong> base revision check (optimistic concurrency) → conflicted copy.`,
      `<strong>Versions:</strong> append-only journal; restore = the old blocklist; retention + GC.`,
      `<strong>Sharing:</strong> namespaces/ACLs, a permission check on every metadata and block request.`,
    ]},
    { type: 'diagram', title: 'The whole design at a glance', height: 510,
      caption: 'Left: devices and their sync engines. Middle: three servers (metadata, notification, blocks). Right: the metadata tables and the cupboard for bytes. Use the buttons to see one path at a time.',
      groups: [
        { label: 'Devices', x: 10, y: 24, w: 160, h: 470 },
        { label: 'Services', x: 220, y: 24, w: 160, h: 470 },
        { label: 'Data', x: 460, y: 24, w: 250, h: 470 },
      ],
      nodes: [
        { id: 'lap', label: 'Riya laptop', sub: 'sync engine', x: 90, y: 100, kind: 'client', info: 'What it is: the sync engine on Riya\'s laptop. It cuts a changed file into 4 MB blocks, computes hashes, commits first, then uploads only the missing blocks.' },
        { id: 'ph', label: 'Riya phone', sub: 'cursor: JID', x: 90, y: 260, kind: 'client', info: 'What it is: the sync engine on Riya\'s phone. On a notification it asks "what changed?" with its cursor, then fetches only the blocks it does not have.' },
        { id: 'am', label: 'Aman laptop', sub: 'shared folder', x: 90, y: 420, kind: 'client', info: 'What it is: Aman\'s device. The shared folder "Trip" is mounted in his root. If he edits offline and comes back, there can be a conflict.' },
        { id: 'meta', label: 'Metaserver', sub: 'commit, list, ACL', x: 300, y: 100, kind: 'server', info: 'What it is: the server that keeps the book of files. On a commit it checks the base revision and permission, reports missing blocks, and writes a new row in the journal.' },
        { id: 'ntf', label: 'Notify server', sub: 'long poll', x: 300, y: 260, kind: 'queue', info: 'What it is: the open long-poll requests of idle devices. As soon as there is a commit in a namespace it just sends "changes: true". No data, only a signal.' },
        { id: 'blk', label: 'Block server', sub: 'hash → bytes', x: 300, y: 420, kind: 'server', info: 'What it is: a server that only takes and gives blocks. Before every download it checks that the user has access to some file that contains the block.' },
        { id: 'jr', label: 'File journal', sub: 'versions, JIDs', x: 585, y: 70, kind: 'data', info: 'What it is: the append-only metadata table (Dropbox: Server File Journal). Every row = one version of one file: namespace, path, blocklist, JID. The source of truth.' },
        { id: 'acl', label: 'ACL + mounts', sub: 'who has access', x: 585, y: 180, kind: 'data', info: 'What it is: the table of permissions and shared folders: namespace → users and roles, and where it is mounted in which user\'s root. Cached, and invalidated at once on a revoke.' },
        { id: 'idx', label: 'Block index', sub: 'hash → where', x: 585, y: 330, kind: 'data', info: 'What it is: the index of which storage bucket each block hash is kept in. Dropbox chose sharded MySQL for this (Magic Pocket, 2016).' },
        { id: 'st', label: 'Block storage', sub: 'immutable blocks', x: 585, y: 440, kind: 'data', info: 'What it is: the cupboard for bytes. Every block is written once and never changed, name = hash. Replication + erasure coding, several zones. Dropbox: Magic Pocket; common: S3/GCS.' },
      ],
      edges: [
        { a: 'lap', b: 'meta', n: 1 }, { a: 'lap', b: 'blk' },
        { a: 'blk', b: 'st', n: 2, label: 'blocks' }, { a: 'blk', b: 'idx', dashed: true }, { a: 'meta', b: 'jr', n: 3, label: 'new row' },
        { a: 'meta', b: 'acl' }, { a: 'blk', b: 'acl', dashed: true, label: 'access?' },
        { a: 'meta', b: 'ntf', kind: 'evt' }, { a: 'ntf', b: 'ph', kind: 'evt' }, { a: 'ntf', b: 'am', kind: 'evt' },
        { a: 'ph', b: 'meta' }, { a: 'ph', b: 'blk' },
        { a: 'am', b: 'meta' }, { a: 'am', b: 'blk' },
      ],
      paths: [
        { name: 'Upload file', text: 'The laptop sends commit(blocklist) → the server answers "need_blocks" → only the missing blocks go through the block server to storage → commit again → a new row in the journal (atomic).', go: ['lap>meta>jr', 'lap>blk>st', 'blk>idx'] },
        { name: 'Sync to other device', text: 'As soon as there is a commit, the notify server answers the phone\'s open long-poll → the phone lists with its cursor → downloads only the missing blocks.', go: ['meta>ntf>ph', 'ph>meta>jr', 'ph>blk>st'] },
        { name: 'Conflict', text: 'Riya\'s commit arrived first (rev 2). Aman\'s offline edit was based on rev 1: base ≠ current, so the server saves it as a "conflicted copy". Nobody\'s work is wiped out.', go: ['lap>meta>jr', 'am>meta>jr'] },
        { name: 'Share', text: 'Riya shares → an entry in the ACL + a mount in Aman\'s root → a notification to Aman → an access check on every one of Aman\'s block requests.', go: ['lap>meta>acl', 'meta>ntf>am', 'am>blk>acl'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>A file = a list of blocks. Every block (Dropbox: 4 MB) is named by its SHA-256 hash. Only changed blocks are uploaded.</li>
      <li>Same hash = same bytes, so a block is stored only once (dedupe), and versions are cheap.</li>
      <li>Metadata (journal, ACL) lives in SQL, strongly consistent. Bytes live as immutable blocks in object/block storage.</li>
      <li>Write: commit → need_blocks → upload missing → commit again. The commit is the moment the new version "exists" (atomic).</li>
      <li>Other devices: the notification (long poll / push) is only a signal; the real changes come from the journal with the cursor. A lost notification loses nothing.</li>
      <li>Conflict: base revision check (optimistic concurrency); if it does not match, a conflicted copy. Data is never dropped.</li>
      <li>Sharing: a shared folder = a namespace mounted into many users' roots; a permission check on every metadata and block request.</li>
      <li>Stable IDs and atomic moves (the lesson of Dropbox Nucleus); GC runs slowest and with the most checks.</li>
    </ul>` },
    { type: 'tradeoffs', gains: [
      'Only changed blocks: less bandwidth and less time',
      'Content hashes: dedupe, integrity checks, cheap version history',
      'Metadata and blobs separate: scale each one in its own way',
      'Atomic commit: no device ever sees a half file',
      'Cursor + journal: nothing is lost even if a notification is lost',
      'Conflicted copy: nobody\'s work ever disappears',
      'Long poll: fewer wasted requests, almost instant news',
    ], costs: [
      'A lot of client-side complexity (Dropbox had to rewrite its engine)',
      'With fixed blocks, an insert in the middle makes many new blocks',
      'A permission check on every request: load on the metadata DB, caching and invalidation are hard',
      'Garbage collection is risky: a mistake = data loss',
      'Users must merge conflicted copies themselves',
      'Dedupe across users is a privacy risk',
      'Crores of open long-poll connections: memory on the notify servers',
    ]},

    { type: 'think', questions: [
      { q: 'A 1 second part was trimmed from the middle of a 10 GB video file. What happens with fixed 4 MB blocks, and how would you do better?', a: 'All bytes after the trim moved, so almost every block after that point gets a new hash: GBs uploaded again. With content-defined chunking (boundaries from a rolling hash), boundaries move with the content, so only the chunks around the trim change. But in compressed files like video, even a small edit often changes many bytes, so the saving depends on the file type.' },
      { q: 'Riya has 3 devices and 1 crore users have 2 devices online on average. What is the server-side cost of long polling, and what would you optimise?', a: '2 crore open connections: a lot of memory and file descriptors. One connection per device, with all namespaces in one long poll (not a separate one per namespace). Keep the timeout long and add jitter so there is no storm of reconnects. On mobile, when the app is in the background, use OS push instead of a connection. Keep notify servers close to stateless: keep a separate registry of who is listening to which namespace (the gateway + registry pattern from the realtime lesson).' },
      { q: 'Why is there no conflict when Riya edits on her laptop and Aman (online) edits 1 minute later?', a: 'Riya\'s commit reached the server at once, and Aman\'s device got the new version through a notification, so Aman\'s edit was built on the new base. A conflict happens only when two edits are built on the same old base (offline, or at exactly the same time).' },
    ]},
    { type: 'quiz', questions: [
      { q: 'In Dropbox\'s 2014 design, what did the metadata DB (Server File Journal) hold for a file?', options: ['The bytes of the whole file', 'The blocklist (list of block hashes), the path and the journal id', 'Only the file name'], answer: 1, explain: 'The bytes are in the block server/storage; the SFJ has only the namespace, path, blocklist and JID. Keeping metadata and blobs separate is the core idea.' },
      { q: 'Why does the server return "need_blocks [h2x]" on a commit?', options: ['h2x is corrupt', 'The other hashes are already on the server, only h2x is missing', 'The user has no permission'], answer: 1, explain: 'With content hashes the server can tell which blocks are new. Only those are uploaded.' },
      { q: 'The phone was offline for 2 days and missed all notifications. How does it get the changes when it comes back?', options: ['It cannot, full resync', 'A list call with its cursor (the last journal id): all changes after it', 'The notification server stores everything'], answer: 1, explain: 'A notification is only a signal. The journal is the source of truth and the cursor is a bookmark.' },
      { q: 'Two devices edited offline on the same base version. What does Dropbox do?', options: ['Last write wins', 'Merge both edits line by line', 'One version under the original name, the other under a "conflicted copy" name'], answer: 2, explain: 'Binary files cannot be merged and data loss is not allowed, so both versions are kept.' },
      { q: '2 crore devices polling every 5 seconds vs long polling. What is the biggest benefit and the cost of long polling?', options: ['Benefit: less storage; cost: more CPU', 'Benefit: many times fewer wasted requests and almost instant news; cost: crores of connections always open', 'No difference'], answer: 1, explain: 'With the widget defaults, polling is 40 lakh requests/sec (0.28% useful) and long poll ~2.78 lakh/sec. In return the notify servers must hold 2 crore open connections.' },
      { q: 'How much data is uploaded when you restore an old version (the blocks are still stored)?', options: ['The whole file', 'Almost nothing: commit the old blocklist again', 'Half the file'], answer: 1, explain: 'Blocks are immutable and content-addressed, so a restore is only metadata work.' },
    ]},
    { type: 'sources', note: 'The Dropbox posts are from different years; the 2014 protocol is from that time, and in 2020 the sync engine (Nucleus) was rewritten. Details may be different today.', items: [
      { title: 'Streaming File Synchronization', publisher: 'Dropbox Tech blog', year: 2014, official: true, url: 'https://dropbox.tech/infrastructure/streaming-file-synchronization', used: 'Namespaces, 4 MB blocks + SHA-256 blocklists, Server File Journal schema (NSID, path, blocklist, JID), block server vs metadata server, commit → need blocks → store → commit, cursors and list, long-poll notification server, block access check, compression + rsync, streaming sync up to 2x.' },
      { title: 'Rewriting the heart of our sync engine', publisher: 'Dropbox Tech blog', year: 2020, official: true, url: 'https://dropbox.tech/infrastructure/rewriting-the-heart-of-our-sync-engine', used: 'Scale numbers, offline clients as normal operation, Sync Engine Classic problems (moves as delete+add, no stable IDs, cycle example), Nucleus: Rust, single control thread, deterministic seeded simulation testing, strong consistency, unique IDs, atomic moves.' },
      { title: 'Inside the Magic Pocket', publisher: 'Dropbox Tech blog', year: 2016, official: true, url: 'https://dropbox.tech/infrastructure/inside-the-magic-pocket', used: 'Immutable block store, blocks up to 4 MB keyed by SHA-256, 1 GB buckets, replication then erasure coding, multi-zone, block index on sharded MySQL.' },
      { title: 'What is a conflicted copy?', publisher: 'Dropbox Help Center', official: true, url: 'https://help.dropbox.com/organize/conflicted-copy', used: 'When conflicted copies are created and how they are named.' },
      { title: 'Version history overview', publisher: 'Dropbox Help Center', official: true, url: 'https://help.dropbox.com/delete-restore/version-history-overview', used: 'Retention 30 / 180 / 365 days by plan.' },
      { title: 'Dropbox HTTP API: files/list_folder/longpoll', publisher: 'Dropbox Developers', official: true, url: 'https://www.dropbox.com/developers/documentation/http/documentation#files-list_folder-longpoll', used: 'Cursor, timeout 30-480 s (default 30), up to 90 s jitter, changes flag, backoff.' },
      { title: 'Roles and permissions', publisher: 'Google Drive API docs', official: true, url: 'https://developers.google.com/drive/api/guides/ref-roles', used: 'Roles (owner, organizer, fileOrganizer, writer, commenter, reader), permission types, folder inheritance.' },
      { title: 'Manage file revisions', publisher: 'Google Drive API docs', official: true, url: 'https://developers.google.com/drive/api/guides/manage-revisions', used: 'Revisions kept ~30 days or purged after 100, keepForever up to 200.' },
      { title: 'Notifications for resource changes (changes.watch)', publisher: 'Google Drive API docs', official: true, url: 'https://developers.google.com/drive/api/guides/push', used: 'Watch channels as webhooks, changes.list with pageToken, channel expiry.' },
    ]},
  ],
});
