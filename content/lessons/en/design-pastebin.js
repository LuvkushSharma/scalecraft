Lesson.register({
  id: 'design-pastebin',
  title: 'Pastebin (text sharing service)',
  minutes: 32,
  summary: `On a site like Pastebin, people paste code or text and share a short link that expires in 10 minutes, in 1 day, or never. The biggest lesson of this design: small "metadata" goes into a database, large "content" goes into object storage, with a pointer between them. Also: keys nobody can guess, expiry and cleanup, fast reads through a CDN, private pastes, protection against abuse, and view counts.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Imagine you wrote a long piece of code and want to send it to a friend. You pasted it in a chat and the formatting broke. Paste it on Pastebin instead, and you get a short link; your friend opens the link and sees exactly the same text. The job sounds simple, but when 10 lakh (1 million) people paste every day and each paste is read 10 times, questions appear: where do we keep all this text? How do we stop people from guessing links? Does an expired paste really disappear? This lesson answers these questions.` },
    { type: 'callout', tone: 'tip', title: 'Try it yourself first', html: `Think on paper: (1) Will you keep the text of a paste in the database or somewhere else? Why? (2) How will you make the key in a link like <code>xyz.com/p/k3J9xQ2a</code>, so that nobody can guess other people\'s "unlisted" pastes? (3) A paste must expire after 1 day, but the CDN has kept a copy. What can go wrong?` },
    { type: 'p', html: `Pastebin.com\'s official FAQ tells us a few real facts: a free user\'s paste can be up to 512 KB and a PRO user\'s up to 10 MB; a paste can be <strong>public</strong> (visible to everyone, in search and in the archive), <strong>unlisted</strong> (only people with the link can see it, not in search engines) or <strong>private</strong> (only the owner, after logging in); and there is a limit on how many pastes you can create per day (guest 10, free member 20). But their internal architecture is not public. So the design in this lesson is <strong>the common industry approach</strong>, built from the blocks of earlier lessons (<a href="#/url-shortener">URL shortener</a>, <a href="#/object-storage">Object storage</a>, <a href="#/cdn">CDN</a>), and the expiry behaviour is taken from AWS\'s official docs.` },

    { type: 'h2', text: 'Step 1: requirements' },
    { type: 'compare',
      left: { title: 'Functional', html: `• Paste text, get a short link: <code>xyz.com/p/k3J9xQ2a</code><br>• Open the link and see the text (also as "raw" plain text)<br>• Expiry: 10 min / 1 day / 1 month / never; also "delete after reading"<br>• Visibility: public, unlisted, private<br>• Max size: 512 KB (free), 10 MB (paid)<br>• The owner can delete their paste<br>• View count` },
      right: { title: 'Non-functional', html: `• Read-heavy: one paste is read many times<br>• Durable: a paste must never vanish before it expires<br>• Unlisted links must not be guessable<br>• An expired paste must never be shown (even if the delete happens a bit later)<br>• Fast reads (p99 &lt; 200 ms), from all over the world<br>• Hard to misuse for spam and malware` },
    },
    { type: 'callout', tone: 'term', title: 'Unlisted vs private', html: `<strong>What it is:</strong> <em>Unlisted</em> = the paste does not show up in any list or search, but anyone who has the link can see it. The link is the key. <em>Private</em> = only the owner, after logging in; even if someone else gets the link, it will not open.<br><strong>Why this difference matters:</strong> the safety of an unlisted paste depends completely on the key being impossible to guess. A private paste needs a "who is this?" check on every read.<br><strong>Without it:</strong> people think unlisted means private and paste their passwords. GitHub\'s docs also say clearly that a "secret gist" is not private: if the URL reaches someone, they can see it.` },

    { type: 'h2', text: 'Step 2: napkin maths, how much data goes where?' },
    { type: 'p', html: `These numbers are assumptions, not any company\'s real numbers. The real question: where are most of the bytes, and which data do the queries run on?` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>New pastes per day: <strong class="pbn-nv"></strong></label><input class="pbn-n" type="range" min="100000" max="10000000" step="100000" value="1000000"></div>
          <div><label>Average paste size (KB): <strong class="pbn-sv"></strong></label><input class="pbn-s" type="range" min="1" max="500" step="1" value="20"></div>
          <div><label>Average days alive: <strong class="pbn-dv"></strong></label><input class="pbn-d" type="range" min="1" max="365" step="1" value="30"></div>
          <div><label>Times each paste is read: <strong class="pbn-rv"></strong></label><input class="pbn-r" type="range" min="1" max="100" step="1" value="10"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Write QPS (avg)</span><strong class="pbn-w"></strong></div>
          <div class="stat"><span>Read QPS (avg)</span><strong class="pbn-q"></strong></div>
          <div class="stat"><span>Live pastes</span><strong class="pbn-l"></strong></div>
          <div class="stat"><span>Content (blobs) size</span><strong class="pbn-b"></strong></div>
          <div class="stat"><span>Metadata size</span><strong class="pbn-m"></strong></div>
          <div class="stat"><span>Share of bytes in blobs</span><strong class="pbn-p"></strong></div>
        </div>
        <div class="calc-note pbn-note"></div>`;
      const q = s => el.querySelector(s);
      const sz = b => b >= 1e12 ? (b / 1e12).toFixed(b >= 1e14 ? 0 : 1) + ' TB' : b >= 1e9 ? (b / 1e9).toFixed(b >= 1e10 ? 0 : 1) + ' GB' : (b / 1e6).toFixed(0) + ' MB';
      const num = n => n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : n.toFixed(n < 10 ? 1 : 0);
      const upd = () => {
        const n = +q('.pbn-n').value, kb = +q('.pbn-s').value, d = +q('.pbn-d').value, r = +q('.pbn-r').value;
        q('.pbn-nv').textContent = (n / 1e6).toFixed(1) + 'M'; q('.pbn-sv').textContent = kb; q('.pbn-dv').textContent = d; q('.pbn-rv').textContent = r;
        const live = n * d, blob = live * kb * 1000, meta = live * 200;
        q('.pbn-w').textContent = num(n / 1e5) + '/s';
        q('.pbn-q').textContent = num(n / 1e5 * r) + '/s';
        q('.pbn-l').textContent = (live / 1e6).toFixed(0) + 'M';
        q('.pbn-b').textContent = sz(blob);
        q('.pbn-m').textContent = sz(meta);
        q('.pbn-p').textContent = (blob / (blob + meta) * 100).toFixed(1) + '%';
        q('.pbn-note').textContent = `We assume ~200 bytes of metadata per paste (key, owner, size, created_at, expires_at, the blob\'s address). One day ≈ 10^5 seconds. At any moment ~${(live / 1e6).toFixed(0)}M pastes are alive. The metadata is so small that it fits easily in one good database; most of the bytes are blobs, and they should go to cheap object storage.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `With the defaults: 10 writes/s, 100 reads/s, 30M live pastes, ~600 GB of text and only ~6 GB of metadata. So <strong>99% of the bytes are content</strong>, while all the queries (whose paste, when it expires, how big it is) run on the metadata. And reads are 10 times the writes: this is a <strong>read-heavy</strong> system, so caching matters. That is why we keep content and metadata apart.` },
    { type: 'callout', tone: 'term', title: 'Metadata vs blob', html: `<strong>What it is:</strong> <em>Metadata</em> = data <em>about</em> the data: key, owner, size, when it was created, when it expires. Small, structured, and queries run on it. <em>Blob</em> (binary large object) = the actual content: large, without structure, and you only ever read or write the whole thing.<br><strong>Why we split them:</strong> metadata goes into a database (fast queries, indexes), the blob goes into <a href="#/object-storage">object storage</a> (S3/GCS: cheap, very durable, built for large data). The database keeps only the blob\'s address (a pointer).<br><strong>Without it:</strong> the database fills up with 600 GB of text, and even a small query like "find expired pastes" becomes slow.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner mistake: "it is just text, put it in the database"', html: `For a few 10 KB pastes, that works. But with crores of pastes, the database disk, backups, replicas and cache all fill up with this large data, and even queries that only need metadata get slow. Object storage is much cheaper per GB, has durability built in, and a CDN can serve content straight from it. A small optimization: very small pastes (like &lt; 1 KB) can be kept inside the metadata row, to save one extra hop. That is a design choice, not a rule.` },

    { type: 'h2', text: 'Step 3: API and data model' },
    { type: 'code', text: `
POST /api/pastes
  body: { "content": "...", "expires_in": "1d", "visibility": "unlisted",
          "syntax": "python", "burn_after_read": false }
  →  201 { "url": "https://xyz.com/p/k3J9xQ2a",
           "expires_at": "2026-10-05T10:30:00Z",
           "delete_token": "dt_9f2..." }          // to delete without logging in

GET    /p/k3J9xQ2a        →  200 HTML page (syntax highlight)  |  404 (not found / expired)
GET    /raw/k3J9xQ2a      →  200 text/plain  (for scripts and curl)
DELETE /api/pastes/k3J9xQ2a   (owner login or delete_token)  →  204` },
    { type: 'code', text: `
pastes (metadata DB)
  key          TEXT PRIMARY KEY      -- "k3J9xQ2a"
  owner_id     BIGINT NULL           -- NULL for a guest
  blob_path    TEXT NULL             -- "pastes/k3J9xQ2a"  (NULL for a small paste)
  inline_body  TEXT NULL             -- pastes under 1 KB live here
  size_bytes   INT
  syntax       TEXT
  visibility   TEXT                  -- public | unlisted | private
  burn_after_read BOOLEAN
  delete_token_hash TEXT             -- a hash of the token, not the token itself
  status       TEXT                  -- active | deleted | flagged
  created_at   TIMESTAMP
  expires_at   TIMESTAMP NULL        -- NULL = never;  INDEX (expires_at)

object storage:  bucket "xyz-pastes" / pastes/k3J9xQ2a  →  the actual text (gzip)` },
    { type: 'p', html: `Look at the access pattern: 99% of queries are "give a key, get a row". That is key-value work, so any database that is fast on the primary key and can be sharded as it grows will do (the key is also the shard key). The index on <code>expires_at</code> is for the cleanup job. We store only a hash of the <code>delete_token</code>, like a password: even if the database leaks, nobody can delete other people\'s pastes.` },

    { type: 'h2', text: 'Step 4: how to make the paste key' },
    { type: 'p', html: `Every paste needs a short, unique key: <code>k3J9xQ2a</code>. We have seen two ways before. In the <a href="#/url-shortener">URL shortener</a> we used a <strong>counter + base62</strong>: give each new link the next number (125, 126, ...) and write it with 62 symbols (0-9, a-z, A-Z). In <a href="#/unique-ids">Unique ID generation</a> we saw IDs like Snowflake that grow with time. Both are <strong>unique</strong>, but both are <strong>predictable</strong>: once you see one key, you can work out the next.` },
    { type: 'p', html: `In the URL shortener the links were public, so this did not matter. In Pastebin, the whole promise of "unlisted" rests on nobody being able to guess a key. With a counter, <code>...a</code> is followed by <code>...b</code>: a script could scan all unlisted pastes. So a <strong>random key</strong> is better here: 8 characters from a good (crypto-secure) random generator, each character any of 62. See for yourself how safe it is:` },
    { type: 'callout', tone: 'term', title: 'Key space', html: `<strong>What it is:</strong> how many different keys can exist. 62 symbols in 8 places = 62<sup>8</sup> keys.<br><strong>Why we need it:</strong> the smaller the share of the key space that live pastes take up, the harder it is to guess one, and the fewer collisions (two pastes getting the same key).<br><strong>Without it (a small key space):</strong> with a 5-character key (62<sup>5</sup> ≈ 91 crore keys) and 3 crore pastes, 1 in every 31 random guesses opens someone\'s paste.` },
    { type: 'custom', render(el) {
      let mode = 'random';
      el.innerHTML = `<div class="pbk-m" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="row2" style="margin-top:10px">
          <div><label>Key length (characters): <strong class="pbk-lv"></strong></label><input class="pbk-l" type="range" min="4" max="12" step="1" value="8"></div>
          <div><label>Live pastes (millions): <strong class="pbk-nv"></strong></label><input class="pbk-n" type="range" min="1" max="1000" step="1" value="30"></div>
          <div><label>Attacker guesses per day: <strong class="pbk-gv"></strong></label><input class="pbk-g" type="range" min="1000" max="10000000" step="1000" value="10000"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Key space (62^L)</span><strong class="pbk-s"></strong></div>
          <div class="stat"><span>Chance one guess is right</span><strong class="pbk-p"></strong></div>
          <div class="stat"><span>Until the first paste is found (avg)</span><strong class="pbk-t"></strong></div>
          <div class="stat"><span>Collision on a new paste</span><strong class="pbk-c"></strong></div>
        </div>
        <div class="calc-note pbk-note"></div>`;
      const q = s => el.querySelector(s);
      const big = n => n >= 1e12 ? (n / 1e12).toFixed(n >= 1e15 ? 0 : 1) + ' trillion' : n >= 1e9 ? (n / 1e9).toFixed(1) + ' billion' : n >= 1e6 ? (n / 1e6).toFixed(1) + ' million' : Math.round(n).toLocaleString('en-IN');
      const oneIn = p => p >= 0.5 ? (p * 100).toFixed(0) + '%' : '1 in ' + big(1 / p);
      const dur = d => d < 1 / 24 ? (d * 1440).toFixed(0) + ' min' : d < 1 ? (d * 24).toFixed(1) + ' hours' : d < 365 ? d.toFixed(0) + ' days' : (d / 365).toFixed(0) + ' years';
      const upd = () => {
        const L = +q('.pbk-l').value, N = +q('.pbk-n').value * 1e6, G = +q('.pbk-g').value;
        q('.pbk-lv').textContent = L; q('.pbk-nv').textContent = q('.pbk-n').value + 'M'; q('.pbk-gv').textContent = G.toLocaleString('en-IN');
        const m = q('.pbk-m'); m.innerHTML = '';
        [['random', 'Random key'], ['counter', 'Counter + base62']].forEach(([v, t]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (v === mode ? ' on' : ''); b.textContent = t; b.onclick = () => { mode = v; upd(); }; m.appendChild(b); });
        const S = Math.pow(62, L), p = Math.min(1, N / S);
        q('.pbk-s').textContent = big(S);
        if (mode === 'counter') {
          q('.pbk-p').textContent = '~100%'; q('.pbk-t').textContent = '1 guess'; q('.pbk-c').textContent = '0 (unique)';
          q('.pbk-note').textContent = 'Counter mode: no collisions, but add 1 to your own key and you get the next paste. No matter how long the key is, scanning is easy. Fine for public links, not for unlisted ones.';
          return;
        }
        const days = (1 / p) / G;
        q('.pbk-p').textContent = oneIn(p); q('.pbk-t').textContent = p >= 1 ? '1 guess' : dur(days); q('.pbk-c').textContent = oneIn(p);
        q('.pbk-note').textContent = `${big(N)} live pastes ÷ ${big(S)} keys = each random guess has a ${oneIn(p)} chance. At ${G.toLocaleString('en-IN')} guesses/day, finding the first paste (anyone\'s) takes ~${p >= 1 ? '1 guess' : dur(days)}. When a new paste is created, the chance that its random key collides with a live key is the same, so the database does "insert only if the key does not exist" and picks a new key on a collision.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `With the defaults (8 characters, 3 crore live pastes): the key space is ~<strong>218 trillion</strong>, the chance of one random guess is <strong>1 in 7.3 million</strong>, and an attacker making 10,000 guesses/day needs ~2 years to reach even one paste. But at 1 crore guesses/day (from many computers), it takes ~17.5 hours. So a random key alone is not enough: add <strong>rate limiting</strong> (count 404s per IP and block if there are too many), and anything truly secret should be <strong>private</strong> or encrypted, not unlisted. Make the key 5 characters and 1 in every 31 guesses hits a paste: the key length is the protection.` },
    { type: 'steps', items: [
      { t: 'Make a random key', d: '8 base62 characters from a crypto-secure random generator. (A normal random function like Math.random can leave guessable patterns.)' },
      { t: 'Insert, only if the key is new', d: "INSERT ... ON CONFLICT (key) DO NOTHING. The database's unique constraint is the real guard; 'check with SELECT first' is a race condition (two requests can check the same key at the same time)." },
      { t: 'On a collision, try again', d: 'The insert wrote 0 rows? Make a new random key and try again. With a chance of 1 in 7.3 million this almost never happens, but the code must handle it.' },
      { t: 'Or: scramble a counter', d: 'If you do want a counter (no collisions), scramble (encrypt) the number with a secret key and then write it in base62. Unique and hard to guess; you just have to protect the secret key.' },
    ]},

    { type: 'h2', text: 'Step 5: high-level design' },
    { type: 'p', html: `There are two paths: <strong>creating</strong> a paste (rare) and <strong>reading</strong> one (10 times more often). Click each box to read what it does, then run the scenarios:` },
    { type: 'callout', tone: 'term', title: 'Pre-signed URL', html: `<strong>What it is:</strong> a special object storage link that our server creates: "this link allows one upload, to this path only, for the next 5 minutes, max 10 MB". The link carries a signature that the storage checks by itself.<br><strong>Why we need it:</strong> a big paste (several MB) goes straight from the browser to object storage; the bytes never pass through our app servers.<br><strong>Without it:</strong> every 10 MB upload eats our server\'s memory and bandwidth. The full story is in <a href="#/object-storage">Object storage and pre-signed URLs</a>.` },
    { type: 'flow', height: 340, title: 'Pastebin',
      nodes: [
        { id: 'c', label: 'Client', sub: 'browser', x: 80, y: 170, w: 120, kind: 'client', info: 'What it is: the user who creates a paste or opens a link, from a browser or a script (curl).' },
        { id: 'cdn', label: 'CDN', sub: 'edge cache', x: 270, y: 60, w: 130, kind: 'edge', info: 'What it is: cache servers spread around the world, close to the user. The content of public/unlisted pastes is cached here. The cache time must never be longer than the paste\'s remaining life, or an expired paste keeps showing from the CDN.' },
        { id: 'app', label: 'App servers', sub: 'stateless', x: 270, y: 280, w: 140, kind: 'server', info: 'What it is: our servers, behind a Load Balancer. They make the key, check the size, write the metadata, and on reads check expiry and visibility. Stateless, so you can run as many as you need.' },
        { id: 's3', label: 'Object storage', sub: 'S3 / GCS: blobs', x: 510, y: 60, w: 170, kind: 'data', info: 'What it is: storage built for large files (S3, GCS). The actual text lives here, at the path pastes/<key>. Cheap, very durable, and made for large data.' },
        { id: 'db', label: 'Metadata DB', sub: 'key → info', x: 510, y: 280, w: 170, kind: 'data', info: 'What it is: one small row per paste: key, owner, size, visibility, created_at, expires_at, blob_path. An index on expires_at lets the cleanup job find rows quickly. A Redis cache can sit in front of it later.' },
        { id: 'cl', label: 'Cleanup job', sub: 'every hour', x: 650, y: 170, w: 110, kind: 'queue', info: 'What it is: a background job that finds expired pastes, deletes the blob, then the metadata row. It is not on the user\'s request path.' },
      ],
      edges: [{ a: 'c', b: 'cdn' }, { a: 'c', b: 'app' }, { a: 'cdn', b: 'app' }, { a: 'app', b: 's3' }, { a: 'app', b: 'db' }, { a: 'cl', b: 'db', dashed: true }, { a: 'cl', b: 's3', dashed: true }, { a: 'c', b: 's3', id: 'up', hidden: true }],
      scenarios: [
        { name: 'Create a paste', steps: [
          { title: 'Text sent', go: 'c>app', text: 'The user pasted 20 KB of code, expiry 1 day, unlisted.', msg: 'POST /api/pastes  { content, expires_in: "1d", visibility: "unlisted" }' },
          { title: 'Size check + random key + blob', go: ['app>s3', 'res:s3>app'], text: 'The app checked the size (under 512 KB), made an 8-character random key, and uploaded the blob first.', msg: 'PUT s3://xyz-pastes/pastes/k3J9xQ2a  (20 KB, gzip)' },
          { title: 'Then the metadata', go: ['app>db', 'res:db>app'], text: 'The order matters: blob first, then metadata. If we did it the other way and the blob upload failed, the database would point to something that does not exist. In this order, at worst one ownerless blob is left behind, and the cleanup removes it.', msg: "INSERT pastes (key, blob_path, expires_at, ...) VALUES ('k3J9xQ2a', ...) ON CONFLICT DO NOTHING" },
          { title: 'Link returned', go: 'res:app>c', text: 'The user got the link.', msg: '201 { "url": "https://xyz.com/p/k3J9xQ2a" }' },
        ]},
        { name: 'Big paste (pre-signed)', steps: [
          { title: 'Asked for upload permission', go: ['c>app', 'res:app>c'], text: 'A 6 MB log file. The app made a key and gave a pre-signed URL: this path only, 5 minutes, max 10 MB.', msg: '200 { upload_url: "https://xyz-pastes.s3...?X-Amz-Signature=...", key: "Zq81mPa4" }' },
          { title: 'Browser straight to storage', show: ['up'], go: 'c>s3', text: 'The 6 MB went straight to object storage. The app server did not touch a single byte.' },
          { title: 'Confirm, then metadata', go: ['c>app', 'app>s3', 'res:s3>app', 'app>db'], text: 'The client said "done". The app checked the file size in storage (it does not trust the client), then wrote the metadata. If the confirm never comes, the file has no owner: cleanup removes it.', msg: 'HEAD pastes/Zq81mPa4 → 6.1 MB ✓' },
        ]},
        { name: 'Read (CDN miss)', steps: [
          { title: 'Link opened', go: 'c>cdn', text: 'The CDN does not have a copy yet.', after: { cdn: { state: 'miss' } } },
          { title: 'Metadata check', go: ['cdn>app', 'app>db', 'res:db>app'], text: 'The app read the row: it exists, is active, has not expired, 23 hours left.', msg: 'SELECT ... WHERE key = $1   →  expires_at = tomorrow 10:30' },
          { title: 'Fetch the blob', go: ['app>s3', 'res:s3>app'], text: 'The text from object storage.' },
          { title: 'Back, with caching', go: ['res:app>cdn', 'res:cdn>c'], after: { cdn: { state: 'hit', sub: 'cached (1h)' } }, text: 'The response has a cache header: max-age = min(1 hour, remaining life). The next readers get it from the CDN.', msg: 'Cache-Control: public, max-age=3600' },
        ]},
        { name: 'Read (CDN hit)', steps: [
          { title: 'A viral paste', go: ['c>cdn', 'res:cdn>c'], set: { cdn: { state: 'hit', sub: 'cached' }, app: { state: 'dim' }, db: { state: 'dim' }, s3: { state: 'dim' } }, text: 'The paste went viral on Twitter. 1 lakh people are opening it, all from the CDN server near them, in ~20 ms. The app, database and storage do not even know.' },
          { title: 'One side effect', focus: ['cdn'], text: 'These views never reached our app, so counting views in the app gives the wrong number. We have to count from the CDN logs (see analytics below).' },
        ]},
        { name: 'It expired', steps: [
          { title: 'Yesterday\'s paste, today', go: ['c>cdn', 'cdn>app', 'app>db', 'res:db>app'], set: { cdn: { state: 'miss' } }, text: 'The row still exists (cleanup has not deleted it yet), but expires_at has passed.', msg: 'expires_at < now()  →  expired' },
          { title: '404, even though the blob exists', go: ['bad:app>cdn', 'bad:cdn>c'], set: { s3: { state: 'dim', sub: 'blob still exists' } }, text: 'The expiry check on the read path is the <strong>source of truth</strong> (the real decision). When the delete happens does not matter to the user.', msg: '404 Not Found' },
        ]},
        { name: 'Cleanup', steps: [
          { title: 'Find the expired ones', go: ['cl>db', 'res:db>cl'], text: 'The job uses the index to get expired pastes, in batches.', msg: 'SELECT key, blob_path FROM pastes WHERE expires_at < now() LIMIT 1000' },
          { title: 'Blob first, then the row', go: ['cl>s3', 'cl>db'], after: { s3: { state: '', sub: 'S3 / GCS: blobs' } }, text: 'Delete the blob, then the row. If the job dies in between, it tries again next time (delete is idempotent: doing it twice breaks nothing).' },
          { title: 'Managed alternatives', focus: ['s3', 'db'], text: 'If you do not want to run your own job: an S3 lifecycle rule (AWS docs: expired objects are removed asynchronously, there can be a delay, but there is no storage charge after expiry) and DynamoDB TTL (AWS docs: expired items are usually deleted within a few days). Both delete "some time later", which is why the expires_at check on read is a must.' },
        ]},
      ],
    },

    { type: 'h2', text: 'Deep dive 1: where to keep the content, database or object storage?' },
    { type: 'table', head: ['', 'Content in a database row', 'Content in object storage'], rows: [
      ['Size', 'Fine for small (KBs)', 'From bytes to TBs, for everything'],
      ['Cost', 'Database disk + replicas + backups: expensive per GB', 'Much cheaper per GB'],
      ['Durability', 'You manage replicas and backups yourself', 'Built in (the provider keeps several copies)'],
      ['Read path', 'One hop: everything is in the row', 'Two hops: the row, then the blob (or the CDN directly)'],
      ['Metadata queries', 'Slow with big rows', 'Small table, fast'],
      ['CDN', 'Must be served by the app', 'The CDN can fetch straight from storage'],
    ]},
    { type: 'p', html: `So the usual design is <strong>hybrid</strong>. Pastes smaller than 1 KB (like one command or one error line) are kept inline in the metadata row, everything else in object storage. Two more small tricks:` },
    { type: 'list', items: [
      `<strong>Compression:</strong> code and logs repeat a lot, so text usually compresses well. Store the blob gzipped, and send gzip to the browser too (<code>Content-Encoding: gzip</code>); it saves CPU on both sides.`,
      `<strong>Same content, one copy (optional):</strong> name the blob by a hash of its content (like SHA-256). If people paste the same error message 1,000 times, there is only one blob. But now one blob has many owners: delete it only when no paste uses it any more (a reference count). Take on this extra complexity only when the napkin maths says there really are many duplicates.`,
    ]},

    { type: 'h2', text: 'Deep dive 2: expiry, TTL and cleanup' },
    { type: 'p', html: `"Expires in 1 day" has three different meanings, and beginners mix them up: (1) after 1 day <strong>nobody can see it</strong>, (2) after 1 day it is <strong>removed from storage</strong>, (3) after 1 day <strong>the CDN copy</strong> is not shown either. The first one must happen right away, the second can happen later, and the third is the one that breaks most easily.` },
    { type: 'callout', tone: 'term', title: 'TTL (time to live)', html: `<strong>What it is:</strong> the "lifetime" of something: after this much time, treat it as dead. A paste\'s TTL = its expiry; a CDN copy\'s TTL = <code>Cache-Control: max-age</code> (in seconds).<br><strong>Why we need it:</strong> old things are removed by themselves, without anyone having to remember.<br><strong>Without it:</strong> storage keeps growing forever, and old copies keep showing.` },
    { type: 'list', items: [
      `<strong>Check on read (source of truth):</strong> on every read, is <code>expires_at &lt; now()</code>? Then 404. This is immediate and certain.`,
      `<strong>Cleanup job:</strong> get expired pastes from the index in batches, delete the blob first, then the row. Or managed: DynamoDB TTL (AWS docs: usually deletes within a few days) and S3 lifecycle rules (AWS docs: asynchronous, there can be a delay). Note: S3 lifecycle rules work on an object\'s <em>age</em> (in days) and prefix/tag, not on each object\'s own time. So you can keep blobs under a prefix per expiry class (<code>1d/</code>, <code>30d/</code>, <code>never/</code>) with one rule per prefix.`,
      `<strong>CDN TTL ≤ remaining life:</strong> if a paste expires in 10 minutes, do not give the CDN a 1-hour max-age. See why below.`,
      `<strong>Purge on delete:</strong> when the owner deletes a paste or the abuse team removes it, send the CDN a purge request (remove the copies).`,
    ]},
    { type: 'custom', render(el) {
      let smart = false;
      el.innerHTML = `<div class="pbe-m" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="row2" style="margin-top:10px">
          <div><label>Paste expires after (minutes): <strong class="pbe-ev"></strong></label><input class="pbe-e" type="range" min="5" max="180" step="5" value="10"></div>
          <div><label>First reader (at minute, fills the CDN): <strong class="pbe-fv"></strong></label><input class="pbe-f" type="range" min="0" max="175" step="1" value="5"></div>
          <div><label>Second reader (at minute): <strong class="pbe-tv"></strong></label><input class="pbe-t" type="range" min="0" max="240" step="1" value="30"></div>
          <div><label>Cleanup job runs every (minutes): <strong class="pbe-cv"></strong></label><input class="pbe-c" type="range" min="5" max="120" step="5" value="60"></div>
        </div>
        <svg class="pbe-svg" viewBox="0 0 320 90" style="width:100%;height:auto;margin-top:10px" role="img" aria-label="Timeline of the paste, the CDN copy and the cleanup"></svg>
        <div class="stats">
          <div class="stat"><span>CDN copy lives until</span><strong class="pbe-u"></strong></div>
          <div class="stat"><span>Second reader got</span><strong class="pbe-r"></strong></div>
          <div class="stat"><span>Blob deleted at</span><strong class="pbe-d"></strong></div>
        </div>
        <div class="calc-note pbe-note"></div>`;
      const q = s => el.querySelector(s);
      const upd = () => {
        const E = +q('.pbe-e').value, F = Math.min(+q('.pbe-f').value, E - 1), T = +q('.pbe-t').value, C = +q('.pbe-c').value;
        q('.pbe-ev').textContent = E; q('.pbe-fv').textContent = F; q('.pbe-tv').textContent = T; q('.pbe-cv').textContent = C;
        const m = q('.pbe-m'); m.innerHTML = '';
        [[false, 'CDN max-age: always 60 min'], [true, 'CDN max-age: min(60, remaining life)']].forEach(([v, t]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (v === smart ? ' on' : ''); b.textContent = t; b.onclick = () => { smart = v; upd(); }; m.appendChild(b); });
        const age = smart ? Math.min(60, E - F) : 60, until = F + age;
        const del = Math.ceil(E / C) * C === E ? E + C : Math.ceil(E / C) * C;
        let res, bug = false;
        if (T < F) res = T < E ? 'Paste (from origin)' : '404';
        else if (T < until) { res = 'Paste (from CDN)'; bug = T >= E; }
        else res = T < E ? 'Paste (from origin)' : '404';
        q('.pbe-u').textContent = 'minute ' + until; q('.pbe-r').textContent = res + (bug ? ' ✗' : ''); q('.pbe-d').textContent = 'minute ' + del;
        const span = Math.max(240, del + 10), X = t => 10 + t / span * 300;
        let s = `<line x1="10" x2="310" y1="70" y2="70" stroke="var(--line-2)"/>`;
        s += `<rect x="${X(0)}" y="14" width="${X(E) - X(0)}" height="12" rx="3" fill="var(--green)" opacity=".7"><title>paste alive</title></rect><text x="${X(0) + 2}" y="11" font-size="8" fill="var(--ink-2)" font-family="var(--f-mono)">paste alive</text>`;
        s += `<rect x="${X(F)}" y="34" width="${X(until) - X(F)}" height="12" rx="3" fill="${until > E ? 'var(--red)' : 'var(--accent)'}" opacity=".7"><title>CDN copy</title></rect><text x="${X(F) + 2}" y="57" font-size="8" fill="var(--ink-2)" font-family="var(--f-mono)">CDN copy</text>`;
        s += `<line x1="${X(T)}" x2="${X(T)}" y1="8" y2="70" stroke="${bug ? 'var(--red)' : 'var(--ink)'}" stroke-dasharray="3 2"/><line x1="${X(del)}" x2="${X(del)}" y1="60" y2="80" stroke="var(--amber)" stroke-width="2"/>`;
        s += `<text x="10" y="86" font-size="8" fill="var(--ink-2)" font-family="var(--f-mono)">0</text><text x="310" y="86" text-anchor="end" font-size="8" fill="var(--ink-2)" font-family="var(--f-mono)">${span} min  (dashed = second reader, orange = blob delete)</text>`;
        q('.pbe-svg').innerHTML = s;
        q('.pbe-note').textContent = (bug ? `Bug: the paste expired at minute ${E}, but the CDN copy lives until minute ${until}, so the reader at minute ${T} saw an expired paste. ` : `Correct: the reader got "${res}". `) + `CDN copy = first read (minute ${F}) + max-age (${age} min). The blob was deleted at the cleanup job\'s next run (minute ${del}); until then, the expiry check on the read path is what returns 404.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `With the defaults: the paste expires after 10 minutes, the first reader came at minute 5, and the CDN kept a 60-minute copy (until minute 65). The second reader at minute 30 <strong>got the expired paste from the CDN</strong>. Even stranger: at minute 60 the cleanup deleted the blob, but the CDN keeps showing it until minute 65. Pick "min(60, remaining life)": the CDN copy lives only 5 minutes (until minute 10), and the reader at minute 30 gets the correct 404. Lesson: the CDN TTL must always be shorter than the paste\'s remaining life.` },
    { type: 'h3', text: 'Burn after reading: "delete as soon as it is read"' },
    { type: 'p', html: `Some pastes are meant to be read only once (like a temporary password). There are two traps. <strong>(1) The CDN:</strong> if the CDN keeps a copy, later readers can read it too, so such a paste gets <code>Cache-Control: no-store</code> (no cache may keep it). <strong>(2) Two people at once:</strong> both read the row, both see "not read yet", and both get the content. So "read and delete" must be one <strong>atomic</strong> step (it happens completely or not at all): <code>UPDATE pastes SET status='burned' WHERE key=$1 AND status='active'</code>, and the content goes only to the request for which the row was really updated (1 row affected).` },

    { type: 'h2', text: 'Deep dive 3: read-heavy caching and the CDN' },
    { type: 'p', html: `Reads are 10 times the writes, and some pastes go viral (a popular script, a leaked config). Caching happens in three layers:` },
    { type: 'table', head: ['Layer', 'What it keeps', 'For', 'Careful'], rows: [
      ['Browser', 'The whole page / raw text', 'The same user opening it again', 'Short max-age, less than the remaining life'],
      ['CDN (edge)', 'Content, on a server near the user', 'Public and unlisted pastes', 'TTL ≤ remaining life; purge on delete; never private'],
      ['Redis (next to the app)', 'The metadata row of hot pastes (and small content)', 'Protecting the database on a CDN miss', 'Remove the key on delete/expiry, or use a short TTL'],
    ]},
    { type: 'code', text: `
Public / unlisted:   Cache-Control: public, max-age=<min(3600, seconds_left)>
Private:             Cache-Control: private, no-store        // never in the CDN or shared caches
Burn after reading:  Cache-Control: no-store
Unlisted page:       X-Robots-Tag: noindex                    // search engines should not list it` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner mistake: "it is unlisted, so keep it off the CDN"', html: `What is secret in an unlisted paste is the URL, not the content: anyone with the URL can see it anyway, so putting it on the CDN does not make it less safe (the CDN also serves it only to someone who asks for that URL). The real danger is <strong>private</strong> pastes: their answer depends on who is logged in, and if one is cached on a shared CDN by mistake, the next person may get someone else\'s private paste. So private always gets <code>private, no-store</code>.` },

    { type: 'h2', text: 'Deep dive 4: size limits' },
    { type: 'p', html: `Pastebin.com allows 512 KB for free users and 10 MB for PRO. A limit is not just a message in the UI; enforce it at every door, because an attacker does not use the browser but sends 2 GB straight to the API:` },
    { type: 'steps', items: [
      { t: 'At the Load Balancer / gateway', d: 'A maximum request body size (like 1 MB). A bigger body gets 413 (Payload Too Large) before it even reaches the app.' },
      { t: 'In the app', d: 'Based on the plan: guest/free 512 KB, PRO 10 MB. Do not trust Content-Length; count the real bytes.' },
      { t: 'On the pre-signed upload', d: 'Put the size condition in the URL itself (like content-length-range 0-10 MB), so the storage refuses a bigger upload by itself. After the upload, still check the real size (HEAD).' },
      { t: 'A total quota per user/IP', d: 'So one user cannot fill 10,000 × 512 KB in a day: a daily paste count limit like Pastebin\'s (guest 10, free 20, PRO 250).' },
    ]},

    { type: 'h2', text: 'Deep dive 5: public, unlisted, private and encrypted' },
    { type: 'table', head: ['Visibility', 'Who can see it', 'What the safety depends on', 'CDN?'], rows: [
      ['Public', 'Everyone; in lists/search/archive', 'Nothing is hidden', 'Yes'],
      ['Unlisted', 'Anyone with the link', 'An unguessable key (random, 8+ chars) + rate limits', 'Yes (noindex)'],
      ['Private', 'Only the owner (logged in)', 'A login + owner check on every read', 'No'],
      ['Client-side encrypted', 'Anyone with the full link (including the key after #)', 'The server only has locked data', 'Yes, because the data cannot be read anyway'],
    ]},
    { type: 'callout', tone: 'term', title: 'URL fragment (the part after #)', html: `<strong>What it is:</strong> the part of a URL after <code>#</code>, like <code>xyz.com/p/k3J9#key123</code>. The browser <strong>never sends it to the server</strong>; only the JavaScript inside the page can see it.<br><strong>Why we need it:</strong> the open-source PrivateBin uses exactly this: the browser encrypts the paste with AES-256-GCM, the server only gets locked (encrypted) data, and the key to open it is in the link after the #.<br><strong>Without it:</strong> the server (or its admin, or a hacker who broke into the server) can read every paste. But careful: anyone who has the link can read it, and if the server itself sends bad JavaScript, it can steal the key.` },
    { type: 'flow', height: 320, title: 'Reading a private paste',
      nodes: [
        { id: 'c', label: 'Browser', sub: 'user', x: 80, y: 160, w: 120, kind: 'client', info: 'What it is: the person opening the paste. If logged in, it sends a session cookie with every request.' },
        { id: 'app', label: 'App servers', sub: 'auth check', x: 280, y: 160, w: 140, kind: 'server', info: 'What it is: the same app servers. For a private paste they first check "who is this" (the session) and "is this the owner" (owner_id).' },
        { id: 'sess', label: 'Session store', sub: 'cookie → user', x: 280, y: 45, w: 150, kind: 'cache', info: 'What it is: the record of login sessions (for example in Redis): cookie → user_id. See the <a href="#/auth-basics">Auth basics</a> lesson.' },
        { id: 'db', label: 'Metadata DB', sub: 'owner_id, visibility', x: 510, y: 250, w: 170, kind: 'data', info: 'What it is: the same metadata table. visibility = private and owner_id come from here.' },
        { id: 's3', label: 'Object storage', sub: 'blobs', x: 510, y: 80, w: 170, kind: 'data', info: 'What it is: the same object storage. A private paste\'s blob is never served from a public URL; either through the app, or through a short-lived signed URL.' },
      ],
      edges: [{ a: 'c', b: 'app' }, { a: 'app', b: 'sess' }, { a: 'app', b: 'db' }, { a: 'app', b: 's3' }],
      scenarios: [
        { name: 'The owner reads it', steps: [
          { title: 'Request with a cookie', go: ['c>app', 'app>sess', 'res:sess>app'], text: 'The session says: user 42.', msg: 'GET /p/Pr1v8key  Cookie: sid=...  →  user_id = 42' },
          { title: 'Owner check', go: ['app>db', 'res:db>app'], text: 'The paste is private, owner_id = 42. A match.', msg: 'visibility = private, owner_id = 42  ✓' },
          { title: 'Content, no caching', go: ['app>s3', 'res:s3>app', 'res:app>c'], text: 'The content is returned with a header that tells shared caches not to keep it.', msg: 'Cache-Control: private, no-store' },
        ]},
        { name: 'A stranger has the link', steps: [
          { title: 'The link reaches someone else', go: ['c>app', 'app>sess', 'res:sess>app'], set: { c: { label: 'Stranger' } }, text: 'Someone forwarded the private paste\'s link. This user\'s id is 77.' },
          { title: 'Owner does not match', go: ['app>db', 'res:db>app'], text: 'owner_id is 42, this is 77. Not allowed.' },
          { title: '404, not 403', go: 'bad:app>c', set: { s3: { state: 'dim' } }, text: 'Return 404, not 403. 403 means "the paste exists, but it is not yours": that itself is information. 404 tells nothing.', msg: '404 Not Found' },
        ]},
        { name: 'Encrypted paste', steps: [
          { title: 'Encrypt in the browser', focus: ['c'], text: 'The browser made a random key and encrypted the text with AES-256-GCM. The key never goes to the server.', msg: 'key = random 256-bit (only in the browser)' },
          { title: 'The server only gets locked data', go: ['c>app', 'app>s3', 'app>db'], set: { s3: { sub: 'ciphertext only' } }, text: 'The server stored the encrypted data. For an admin or a hacker, these are useless bytes.' },
          { title: 'The key in the link after #', go: 'res:app>c', text: 'The link: xyz.com/p/Ab3k#key. The reader\'s browser does not send the part after # to the server; it decrypts by itself with the key. The price: the server cannot scan for spam/malware, and if the link is lost, the paste is locked forever.' },
        ]},
      ],
    },

    { type: 'h2', text: 'Deep dive 6: abuse, spam and leaks' },
    { type: 'p', html: `Free, anonymous text hosting also gets misused: spam links, malware instructions, lists of stolen passwords, and company secrets (API keys) pasted by mistake. According to Pastebin\'s FAQ, they ask for a CAPTCHA on very fast posting, suspicious links, duplicates or flagged keywords, and they ban accounts or IPs that break the rules. They also have a "scraping API" (PRO only, from one whitelisted IP) that lists new public pastes: security researchers use it to find leaks. In other words, a public paste is in the world\'s view <strong>within minutes</strong>.` },
    { type: 'flow', height: 340, title: 'Protection against abuse',
      nodes: [
        { id: 'c', label: 'Client', sub: 'user / bot', x: 80, y: 170, w: 110, kind: 'client', info: 'What it is: whoever creates the paste. It can be a real user, or a spam bot that wants to send a thousand pastes a minute.' },
        { id: 'gw', label: 'Rate limiter', sub: 'per IP / account', x: 240, y: 170, w: 140, kind: 'edge', info: 'What it is: a counter at the gateway (in Redis), like "guest: 10 pastes/day, 1 per 10 sec". If the limit is broken, 429 or a CAPTCHA. See the <a href="#/rate-limiting">Rate limiting</a> lesson.' },
        { id: 'app', label: 'App servers', sub: 'save + 201', x: 410, y: 170, w: 130, kind: 'server', info: 'What it is: the same app servers. They save the paste and return the link right away, and put the scan work in a queue (the user does not wait for the scan).' },
        { id: 'cdn', label: 'CDN', sub: 'purge on takedown', x: 410, y: 55, w: 130, kind: 'edge', info: 'What it is: the same CDN. When a paste is removed, its copies must also be removed (purge), or the removed paste keeps showing.' },
        { id: 'db', label: 'Metadata DB', sub: 'status flag', x: 600, y: 170, w: 130, kind: 'data', info: 'What it is: the same metadata. status = active | flagged | removed. The read path returns 404 (or a "removed" page) for flagged/removed.' },
        { id: 'q', label: 'Scan queue', sub: 'async', x: 410, y: 290, w: 130, kind: 'queue', info: 'What it is: the line of new pastes and user reports. Reports go first (priority).' },
        { id: 'sc', label: 'Abuse scanner', sub: 'rules + ML + humans', x: 600, y: 290, w: 150, kind: 'threat', info: 'What it is: background workers that check content: spam links, malware patterns, secrets like "AKIA..." (an AWS key) or lists of passwords. Unclear cases are checked by a person (a moderator).' },
      ],
      edges: [{ a: 'c', b: 'gw' }, { a: 'gw', b: 'app' }, { a: 'app', b: 'db' }, { a: 'app', b: 'q' }, { a: 'q', b: 'sc' }, { a: 'sc', b: 'db' }, { a: 'sc', b: 'cdn' }],
      scenarios: [
        { name: 'Normal paste', steps: [
          { title: 'Within the limit', go: ['c>gw', 'gw>app', 'app>db', 'res:app>gw', 'res:gw>c'], text: 'This is the user\'s 3rd paste today, within the limit. Saved, link returned.' },
          { title: 'Scan later', go: ['evt:app>q', 'evt:q>sc', 'sc>db'], after: { db: { state: 'ok', sub: 'status: active' } }, text: 'The scanner found nothing wrong. The user did not have to wait for any of this.' },
        ]},
        { name: 'Spam bot', steps: [
          { title: '500 pastes in a minute', flood: { paths: ['c>gw'], n: 10 }, set: { c: { label: 'Bot' } }, after: { gw: { state: 'hot', sub: '500/min!' } }, text: '500 pastes in one minute from one IP, all with the same casino link.' },
          { title: '429 + CAPTCHA', go: 'bad:gw>c', after: { gw: { state: 'warn', sub: 'CAPTCHA / block' } }, set: { app: { state: 'dim' } }, text: 'The rate limiter stopped it: first a CAPTCHA, then an IP block. This junk never reached the app or the database. The same content again and again (duplicates) is also a signal.' },
        ]},
        { name: 'A leaked secret found', steps: [
          { title: 'A config file was pasted', go: ['c>gw', 'gw>app', 'app>db', 'evt:app>q'], text: 'A developer pasted a config file publicly by mistake, and it contains a cloud API key.' },
          { title: 'The scanner caught it', go: ['evt:q>sc', 'sc>db'], after: { db: { state: 'warn', sub: 'status: flagged' }, sc: { state: 'hot', sub: 'secret pattern!' } }, text: 'A pattern match: a string that looks like an AWS access key. The paste is flagged (hidden) and the owner gets an email. In such cases, many platforms also tell the company that issued the key, so the key can be turned off.' },
          { title: 'Remove it from the CDN too', go: 'sc>cdn', after: { cdn: { state: 'ok', sub: 'purged' } }, text: 'CDN purge, so the cached copy is not shown either. But remember: it was public, so someone may already have copied it through scraping. The real fix: change the key.' },
        ]},
      ],
    },

    { type: 'h2', text: 'Deep dive 7: analytics, the view count' },
    { type: 'p', html: `"This paste was viewed 12,431 times." It sounds simple: on every read, <code>UPDATE pastes SET views = views + 1</code>. Three problems: (1) a viral paste\'s single row gets thousands of writes every second (a hot row, fights over the lock); (2) most reads come from the CDN and never reach the app; (3) every read becomes a database write, while the read path should be fast. In the <a href="#/url-shortener">URL shortener</a>, Bitly also processed clicks in a separate stream. Here too:` },
    { type: 'list', items: [
      `<strong>Events, not a counter:</strong> both the app and the CDN emit a "viewed" event (the CDN from its access logs). The events go into a queue/stream.`,
      `<strong>Add them up in batches:</strong> a consumer adds up each paste\'s views every minute and does a single write: 1 write instead of 5,000.`,
      `<strong>Unique viewers:</strong> keeping a set of every viewer is expensive; HyperLogLog gives an estimate (with a small error, using very little memory). See <a href="#/ds-for-scale">Data structures for scale</a>.`,
      `<strong>A slightly old count is fine:</strong> if the view count shows up 1 minute late, nobody is harmed. This does not need to be strongly consistent.`,
    ]},

    { type: 'h2', text: 'What can break' },
    { type: 'table', head: ['Failure', 'Effect', 'Protection'], rows: [
      ['The blob was uploaded, the metadata failed', 'An ownerless blob', 'Blob first, then metadata; cleanup removes orphan blobs'],
      ['The CDN kept a copy of an expired paste', 'Visible even after expiry', 'CDN TTL ≤ remaining life; purge on delete'],
      ['A private paste in a shared cache', 'Someone else\'s private paste was shown', 'private, no-store; private is never on the CDN'],
      ['Burn-after-read, two people at once', 'Both read it', 'An atomic "read and burn" UPDATE'],
      ['A key-guessing bot', 'Unlisted pastes leak', 'Random 8+ char keys, rate limit on 404s, IP block'],
      ['A spam / malware flood', 'Storage and reputation suffer', 'Rate limit, CAPTCHA, async scanner, takedown + purge'],
      ['A viral paste', 'A hot row in the database', 'CDN + Redis cache; events for views, not a counter'],
      ['An object storage region goes down', 'Reads fail', 'The provider\'s multi-AZ durability; a copy in another region if needed'],
      ['The cleanup job stopped', 'Storage keeps growing (no effect on users)', 'Monitoring: alert on the count of "expired but still alive" blobs'],
    ]},
    { type: 'callout', tone: 'why', title: 'Decide', html: `Small data that gets queried → <strong>database</strong>; large data that is only read → <strong>object storage</strong>; a pointer in the database. Pastes under 1 KB inline. Unlisted/private links → <strong>random keys</strong> (crypto-random, 8+ chars) or a scrambled counter; for public ones a simple counter is fine too. The real expiry decision happens on the <strong>read path</strong>; deletion happens later (job / lifecycle / TTL). CDN TTL ≤ remaining life, private is never on the CDN. For views, events + batches, not a row counter.` },
    { type: 'h2', text: 'How to say it in an interview' },
    { type: 'steps', items: [
      { t: 'Requirements', d: 'Create/read/delete, expiry options, public/unlisted/private, size limits, read-heavy, durable, never show an expired paste.' },
      { t: 'Napkin maths', d: '10 writes/s, 100 reads/s, 30M live pastes, ~600 GB of content vs ~6 GB of metadata: 99% of the bytes are blobs.' },
      { t: 'Data model', d: 'Metadata DB (key PK, index on expires_at) + object storage blobs; small ones inline.' },
      { t: 'Key', d: 'Random base62, 8 chars (~218 trillion); insert-if-absent; or a scrambled counter.' },
      { t: 'Reads', d: 'CDN (TTL ≤ remaining life) → app → Redis → database → blob; expiry + visibility check on read.' },
      { t: 'The rest', d: 'Cleanup job / S3 lifecycle / TTL, pre-signed uploads, size limits at every door, abuse pipeline, views through events.' },
    ]},

    { type: 'diagram', title: 'The whole design at a glance', height: 560,
      groups: [
        { label: 'Edge', x: 10, y: 120, w: 700, h: 100 },
        { label: 'Async', x: 10, y: 240, w: 300, h: 230 },
        { label: 'App + data', x: 320, y: 240, w: 392, h: 230 },
      ],
      nodes: [
        { id: 'user', label: 'Browser / curl', sub: 'user', x: 330, y: 60, w: 170, kind: 'client', info: 'What it is: the user (or a script) who creates or reads a paste. Reads go to the CDN, writes go to the Load Balancer.' },
        { id: 'cdn', label: 'CDN', sub: 'public + unlisted', x: 150, y: 170, w: 150, kind: 'edge', info: 'What it is: cache servers near the user. Public/unlisted content lives here, TTL ≤ remaining life. Never private. Purged on takedown.' },
        { id: 'gw', label: 'LB + rate limiter', sub: 'per IP / account', x: 490, y: 170, w: 170, kind: 'edge', info: 'What it is: the Load Balancer and gateway that apply the body size limit and per-IP/account rate limits (spam bots, key guessing).' },
        { id: 'app', label: 'App servers', sub: 'stateless', x: 490, y: 290, w: 150, kind: 'server', info: 'What it is: random key, size check, blob first then metadata, expiry + visibility check on read, pre-signed URLs.' },
        { id: 's3', label: 'Object storage', sub: 'blobs (gzip)', x: 652, y: 290, w: 124, kind: 'data', info: 'What it is: storage like S3/GCS. The actual text of the paste, at pastes/<key>. Cheap and very durable.' },
        { id: 'rd', label: 'Redis', sub: 'hot metadata', x: 370, y: 420, w: 110, kind: 'cache', info: 'What it is: a fast in-memory cache. The metadata (and small content) of hot pastes, so the database is not overloaded even on a CDN miss.' },
        { id: 'db', label: 'Metadata DB', sub: 'key → row', x: 520, y: 420, w: 130, kind: 'data', info: 'What it is: one small row per paste: key, owner, visibility, size, expires_at (indexed), blob_path, status.' },
        { id: 'cl', label: 'Cleanup', sub: 'job / TTL', x: 660, y: 420, w: 100, kind: 'queue', info: 'What it is: the background job that removes the blob and the row of expired pastes (or S3 lifecycle + database TTL).' },
        { id: 'q', label: 'Event queue', sub: 'views + scans', x: 150, y: 300, w: 150, kind: 'queue', info: 'What it is: the line of events like "viewed", "scan this new paste", "a report came in". It keeps the read path fast.' },
        { id: 'sc', label: 'Abuse scanner', sub: 'spam, secrets', x: 90, y: 420, w: 130, kind: 'threat', info: 'What it is: it checks new pastes and reports; if it finds something wrong, it flags the paste and purges the CDN.' },
        { id: 'an', label: 'Analytics', sub: 'view counts', x: 235, y: 420, w: 110, kind: 'data', info: 'What it is: it adds up view events every minute and writes the counts (CDN logs + app events).' },
      ],
      edges: [
        { a: 'user', b: 'cdn', n: 1, label: 'GET /p/key' },
        { a: 'cdn', b: 'gw', n: 2, label: 'miss' },
        { a: 'user', b: 'gw', label: 'POST paste' },
        { a: 'gw', b: 'app', n: 3 },
        { a: 'app', b: 'rd', label: 'cache' },
        { a: 'app', b: 'db', n: 4, label: 'row' },
        { a: 'app', b: 's3', n: 5 },
        { a: 'app', b: 'q', kind: 'evt', label: 'events' },
        { a: 'q', b: 'sc', kind: 'evt' },
        { a: 'q', b: 'an', kind: 'evt' },
        { a: 'sc', b: 'db', kind: 'bad', via: [[120, 500], [500, 500]], label: 'takedown' },
        { a: 'sc', b: 'cdn', kind: 'bad', via: [[30, 300]] },
        { a: 'cl', b: 'db', dashed: true },
        { a: 'cl', b: 's3', dashed: true },
      ],
      paths: [
        { name: 'Create a paste', text: 'POST → rate limiter → app: random key, blob into object storage first, then the metadata row. A scan event goes into the queue.', go: ['user>gw>app>s3', 'app>db', 'app>q'] },
        { name: 'Read (CDN hit)', text: 'Most reads: the CDN server near the user returns the content directly. Nothing reaches the app.', go: ['user>cdn'] },
        { name: 'Read (miss)', text: 'CDN miss → app → row from Redis/database (expiry + visibility check) → blob → cached on the CDN, TTL ≤ remaining life.', go: ['user>cdn>gw>app>rd', 'app>db', 'app>s3'] },
        { name: 'Takedown', text: 'The scanner caught a leaked secret: the row is flagged and the CDN is purged.', go: ['app>q>sc>db', 'sc>cdn'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Metadata (small, queried) goes in the <strong>database</strong>; content (large) goes in <strong>object storage</strong>; a pointer in between. 99% of the bytes are blobs.</li>
      <li>Write order: <strong>blob first, then metadata</strong>. Cleanup removes orphan blobs.</li>
      <li>An unlisted paste\'s safety = an <strong>unguessable key</strong>: crypto-random base62, 8+ chars, insert-if-absent, and rate limiting on 404s.</li>
      <li>The real expiry decision is on the <strong>read path</strong>; deletion happens later (job, S3 lifecycle, database TTL: all asynchronous).</li>
      <li><strong>CDN TTL ≤ remaining life</strong>; <code>private, no-store</code> for private pastes; purge on delete.</li>
      <li>Size limits at <strong>every door</strong>: LB, app, pre-signed URL. Big uploads go straight to storage with a pre-signed URL.</li>
      <li>Abuse: rate limits + CAPTCHA, an async scanner, takedown. Views: <strong>events + batches</strong>, not a row counter.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Metadata and blobs apart: a small, fast database, and the bytes in cheap storage', 'Random keys: unlisted pastes cannot be guessed', 'CDN: even a viral paste never touches the app', 'Expiry check on the read path: an expired paste disappears at once, the delete can happen any time', 'Async scan + events: the user\'s writes and reads stay fast'], costs: ['Keeping two stores (database + object storage) in sync, orphan cleanup', 'Random keys: an occasional collision, insert again', 'A short CDN TTL = more hits on the origin', 'The scan is async: bad content can stay live for a few minutes', 'View counts are slightly late and approximate', 'Encrypted pastes: the server cannot scan them'] },
    { type: 'think', questions: [
      { q: 'A paste on xyz.com is "burn after reading". What can go wrong with the CDN and two readers at the same time, and how do you prevent it?', a: 'The CDN would cache it and later readers could read it too, so such a paste gets Cache-Control: no-store. If two people read at once, both can get it: read + burn must be one atomic step (UPDATE ... SET status = burned WHERE key = ? AND status = active), and the content goes only to the request for which the row was updated.' },
      { q: 'A user complains: "I deleted my paste, but the link still opens." Where would you look?', a: 'First the read path: was the status updated on delete, and does the read check the status? Then Redis: was the metadata removed from the cache? Then the CDN: was a purge request sent, and did it succeed? And the browser cache: was max-age short? Usually the CDN purge was missed.' },
      { q: 'When is it right to keep the paste content in the database?', a: 'When pastes are always small (like commands under 1 KB), the total data is small, and saving a hop matters. That is why the hybrid: small ones inline, big ones in object storage. If all pastes are small, a database alone is also a fine design.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Why is the paste text kept in object storage instead of the database?', options: ['Object storage is faster', '99% of the bytes are blobs; the database stays small, and object storage is cheap, durable and CDN-friendly', 'A database cannot store text'], answer: 1, explain: 'Queries run on metadata, the bytes are in blobs. They need different things, so they live in different places.' },
      { q: 'A paste has expired, but S3 lifecycle has not deleted it yet. What should the user get?', options: ['The paste, because the blob still exists', '404, because the read path checks expires_at', 'A 500 error'], answer: 1, explain: 'Lifecycle and TTL deletes are asynchronous (they can be delayed). The real decision is the expiry check on read.' },
      { q: 'What is the problem with counter + base62 keys for unlisted pastes?', options: ['The keys are long', 'The next key is easy to guess, so someone could scan all unlisted pastes', 'There are too many collisions'], answer: 1, explain: 'A counter is unique but predictable. With a random 8-char key (~218 trillion), one guess has a 1 in 7.3 million chance with 3 crore pastes.' },
      { q: 'A paste expires in 10 minutes. What should the CDN max-age be?', options: ['Always 1 hour', 'min(1 hour, remaining life)', 'Never on the CDN'], answer: 1, explain: 'With a fixed 1 hour, the widget showed the expired paste from the CDN even at minute 30. A TTL shorter than the remaining life prevents this bug.' },
      { q: 'A stranger opened the link of a private paste. What do you return?', options: ['403 Forbidden', '404 Not Found', '200 with a blank page'], answer: 1, explain: '403 tells them the paste exists. 404 tells nothing, so it is better.' },
    ]},
    { type: 'sources', note: 'Pastebin has not made its internal architecture public; the design in this lesson is the general industry approach. The product limits and visibility options come from Pastebin\'s official FAQ, and the expiry behaviour from the AWS docs.', items: [
      { title: 'Pastebin FAQ', publisher: 'Pastebin.com', official: true, url: 'https://pastebin.com/faq', used: 'Paste size limits (512 KB free, 10 MB PRO), public/unlisted/private meanings, pastes per 24 hours (guest 10, free 20, PRO 250), CAPTCHA on rapid posting/suspicious links/duplicates/keywords, bans.' },
      { title: 'Pastebin Scraping API', publisher: 'Pastebin.com', official: true, url: 'https://pastebin.com/doc_scraping_api', used: 'A PRO-only, whitelisted-IP API that lists recent public pastes; shows that public pastes are monitored quickly.' },
      { title: 'Expiring objects (S3 Lifecycle) and Using time to live (TTL) in DynamoDB', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-expire-general-considerations.html', used: 'S3 expiration is asynchronous with a possible delay and no storage charge after expiry; lifecycle rules work on object age and prefix/tags; DynamoDB TTL deletes typically within a few days, so reads must filter expired items.' },
      { title: 'PrivateBin README', publisher: 'PrivateBin (open source project)', official: true, url: 'https://github.com/PrivateBin/PrivateBin', used: 'Zero-knowledge design: AES-256-GCM encryption in the browser, the key in the URL fragment is never sent to the server, burn after reading, limits (trust in the server\'s JavaScript, link = access).' },
      { title: 'Creating gists (secret vs public gists)', publisher: 'GitHub Docs', official: true, url: 'https://docs.github.com/en/get-started/writing-on-github/editing-and-sharing-content-with-gists/creating-gists', used: 'Secret gists are not private: anyone with the URL can see them; an example of unlisted vs private.' },
      { title: 'Cache-Control header', publisher: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control', used: 'public, private, no-store and max-age semantics for CDN and browser caching.' },
    ]},
  ],
});
