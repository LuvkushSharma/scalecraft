Lesson.register({
  id: 'design-pastebin',
  title: 'Pastebin (text share service)',
  minutes: 32,
  summary: `Pastebin jaisi site pe log code ya text paste karke ek chhota link share karte hain, jo 10 minute, 1 din ya kabhi nahi expire hota. Is design mein sabse bada sabak: chhoti "metadata" database mein aur bada "content" object storage mein, beech mein ek pointer. Saath mein: unguessable keys, expiry aur cleanup, CDN se tez reads, private pastes, abuse se bachaav aur view counts.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Socho tumne ek lamba code likha aur dost ko bhejna hai. Chat mein paste kiya to formatting toot gayi. Pastebin pe paste karo, ek chhota link milta hai, dost link kholta hai aur exact wahi text dekhta hai. Kaam simple lagta hai, lekin jab roz 10 lakh log paste karein aur har paste 10 baar padha jaaye, to sawaal uthte hain: itna text kahan rakhein? Link koi guess na kar le? Expire hua paste sach mein gayab ho? Ye lesson inhi sawaalon ka jawab hai.` },
    { type: 'callout', tone: 'tip', title: 'Pehle khud try karo', html: `Kaagaz pe socho: (1) Paste ka text database mein rakhoge ya kahin aur? Kyun? (2) Link <code>xyz.com/p/k3J9xQ2a</code> mein key kaise banaoge, taaki koi doosron ke "unlisted" pastes guess na kar sake? (3) Paste 1 din baad expire hona hai, lekin CDN ne uski copy rakh li hai. Kya galat ho sakta hai?` },
    { type: 'p', html: `Pastebin.com ke official FAQ se kuch asli baatein pata hain: free users ka ek paste 512 KB tak aur PRO users ka 10 MB tak ho sakta hai; paste <strong>public</strong> (sabko dikhe, search aur archive mein), <strong>unlisted</strong> (sirf link wale dekhein, search engines mein nahi) ya <strong>private</strong> (sirf login karke maalik) ho sakta hai; aur din mein kitne paste bana sakte ho, uski hadd hai (guest 10, free member 20). Lekin unka andar ka architecture public nahi hai. Isliye is lesson ka design <strong>industry ka aam tareeka</strong> hai, jo pichhle lessons ke blocks (<a href="#/url-shortener">URL shortener</a>, <a href="#/object-storage">Object storage</a>, <a href="#/cdn">CDN</a>) se banta hai, aur expiry ka behaviour AWS ke official docs se liya gaya hai.` },

    { type: 'h2', text: 'Step 1: requirements' },
    { type: 'compare',
      left: { title: 'Functional', html: `• Text paste karo, chhota link milo: <code>xyz.com/p/k3J9xQ2a</code><br>• Link kholo, text dikhe (aur "raw" plain text bhi)<br>• Expiry: 10 min / 1 din / 1 mahina / kabhi nahi; "padhte hi delete" bhi<br>• Visibility: public, unlisted, private<br>• Max size: 512 KB (free), 10 MB (paid)<br>• Maalik apna paste delete kar sake<br>• View count` },
      right: { title: 'Non-functional', html: `• Read-heavy: ek paste kai baar padha jaata hai<br>• Durable: paste expiry se pehle kabhi gayab na ho<br>• Unlisted links guess na ho sakein<br>• Expire hua paste kabhi na dikhe (chahe delete thoda baad ho)<br>• Reads tez (p99 &lt; 200 ms), duniya bhar se<br>• Spam aur malware ke liye istemal mushkil ho` },
    },
    { type: 'callout', tone: 'term', title: 'Unlisted vs private', html: `<strong>Ye kya hai:</strong> <em>Unlisted</em> = paste kisi list ya search mein nahi dikhta, lekin jiske paas link hai wo dekh sakta hai. Link hi chaabi hai. <em>Private</em> = sirf maalik, login karke; link kisi aur ke haath lag jaaye to bhi nahi khulega.<br><strong>Kyun chahiye ye farak:</strong> unlisted ki suraksha poori tarah key ke unguessable hone pe tiki hai. Private ke liye har read pe "ye kaun hai?" check chahiye.<br><strong>Iske bina:</strong> log unlisted ko private samajh ke password paste karte hain. GitHub ke docs bhi saaf kehte hain ki "secret gist" private nahi hai: URL kisi ke paas pahuncha to wo dekh lega.` },

    { type: 'h2', text: 'Step 2: napkin maths, kitna data kahan?' },
    { type: 'p', html: `Ye numbers "maan lo" wale hain, kisi company ke nahi. Asli sawaal: bytes ka bada hissa kahan hai, aur queries kis pe chalti hain?` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Naye pastes per day: <strong class="pbn-nv"></strong></label><input class="pbn-n" type="range" min="100000" max="10000000" step="100000" value="1000000"></div>
          <div><label>Average paste size (KB): <strong class="pbn-sv"></strong></label><input class="pbn-s" type="range" min="1" max="500" step="1" value="20"></div>
          <div><label>Average kitne din zinda: <strong class="pbn-dv"></strong></label><input class="pbn-d" type="range" min="1" max="365" step="1" value="30"></div>
          <div><label>Har paste kitni baar padha: <strong class="pbn-rv"></strong></label><input class="pbn-r" type="range" min="1" max="100" step="1" value="10"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Write QPS (avg)</span><strong class="pbn-w"></strong></div>
          <div class="stat"><span>Read QPS (avg)</span><strong class="pbn-q"></strong></div>
          <div class="stat"><span>Zinda pastes</span><strong class="pbn-l"></strong></div>
          <div class="stat"><span>Content (blobs) ka size</span><strong class="pbn-b"></strong></div>
          <div class="stat"><span>Metadata ka size</span><strong class="pbn-m"></strong></div>
          <div class="stat"><span>Bytes mein blob ka hissa</span><strong class="pbn-p"></strong></div>
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
        q('.pbn-note').textContent = `Har paste ki metadata ~200 bytes maani (key, owner, size, created_at, expires_at, blob ka pata). Ek din ≈ 10^5 seconds. Kisi bhi waqt ~${(live / 1e6).toFixed(0)}M pastes zinda hain. Metadata itni chhoti hai ki ek achhe database mein aaraam se fit; bytes ka bada hissa blobs hain, aur wo sasti object storage mein jaane chahiye.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Default pe: 10 writes/s, 100 reads/s, 30M zinda pastes, ~600 GB text aur sirf ~6 GB metadata. Yaani <strong>99% bytes content hain</strong>, jabki saari queries (kiska paste, kab expire, kitna bada) metadata pe hoti hain. Aur reads writes se 10 guna: ye <strong>read-heavy</strong> system hai, to caching zaroori. Isliye content aur metadata ko alag rakhte hain.` },
    { type: 'callout', tone: 'term', title: 'Metadata vs blob', html: `<strong>Ye kya hai:</strong> <em>Metadata</em> = data ke <em>baare mein</em> data: key, owner, size, kab bana, kab expire. Chhota, structured, jispe queries chalti hain. <em>Blob</em> (binary large object) = asli content: bada, bina structure ka, jise bas poora padhna ya likhna hai.<br><strong>Kyun chahiye ye bantwara:</strong> metadata database mein (tez queries, index), blob <a href="#/object-storage">object storage</a> mein (S3/GCS: sasta, bahut durable, bade data ke liye bana). Database mein blob ka sirf pata (pointer).<br><strong>Iske bina:</strong> database 600 GB text se bhar jaata, aur "expire hue pastes dhoondo" jaisi chhoti query bhi slow.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "text hi to hai, DB mein rakh do"', html: `10 KB ke chand pastes ke liye chalega. Lekin crores pastes pe DB ki disk, backups, replicas aur cache sab is bade data se bhar jaate hain, aur jo queries sirf metadata chahti hain wo bhi slow. Object storage per GB kahin sasta hai, durability built-in hai, aur CDN usse seedha content de sakta hai. Chhota optimization: bahut chhote pastes (jaise &lt; 1 KB) metadata row mein hi rakh sakte ho, ek extra hop bachane ke liye. Ye design choice hai, rule nahi.` },

    { type: 'h2', text: 'Step 3: API aur data model' },
    { type: 'code', text: `
POST /api/pastes
  body: { "content": "...", "expires_in": "1d", "visibility": "unlisted",
          "syntax": "python", "burn_after_read": false }
  →  201 { "url": "https://xyz.com/p/k3J9xQ2a",
           "expires_at": "2026-10-05T10:30:00Z",
           "delete_token": "dt_9f2..." }          // bina login ke delete karne ke liye

GET    /p/k3J9xQ2a        →  200 HTML page (syntax highlight)  |  404 (nahi mila / expire)
GET    /raw/k3J9xQ2a      →  200 text/plain  (scripts aur curl ke liye)
DELETE /api/pastes/k3J9xQ2a   (owner login ya delete_token)  →  204` },
    { type: 'code', text: `
pastes (metadata DB)
  key          TEXT PRIMARY KEY      -- "k3J9xQ2a"
  owner_id     BIGINT NULL           -- guest ho to NULL
  blob_path    TEXT NULL             -- "pastes/k3J9xQ2a"  (chhota paste ho to NULL)
  inline_body  TEXT NULL             -- < 1 KB wale pastes yahin
  size_bytes   INT
  syntax       TEXT
  visibility   TEXT                  -- public | unlisted | private
  burn_after_read BOOLEAN
  delete_token_hash TEXT             -- token ka hash, token khud nahi
  status       TEXT                  -- active | deleted | flagged
  created_at   TIMESTAMP
  expires_at   TIMESTAMP NULL        -- NULL = kabhi nahi;  INDEX (expires_at)

object storage:  bucket "xyz-pastes" / pastes/k3J9xQ2a  →  asli text (gzip)` },
    { type: 'p', html: `Access pattern dekho: 99% queries "key do, row lo". Ye key-value jaisa kaam hai, to koi bhi database chalega jo primary key pe tez ho aur badhne pe shard ho sake (key hi shard key). <code>expires_at</code> pe index cleanup job ke liye hai. <code>delete_token</code> ka sirf hash rakhte hain, password ki tarah: DB leak ho to bhi koi doosron ke paste delete na kar sake.` },

    { type: 'h2', text: 'Step 4: paste ki key kaise banayein' },
    { type: 'p', html: `Har paste ko ek chhoti, unique key chahiye: <code>k3J9xQ2a</code>. Do raaste humne pehle dekhe hain. <a href="#/url-shortener">URL shortener</a> mein <strong>counter + base62</strong> liya tha: har naye link ko agla number (125, 126, ...) aur use 62 symbols (0-9, a-z, A-Z) mein likh diya. <a href="#/unique-ids">Unique ID generation</a> mein Snowflake jaise IDs dekhe jo time ke saath badhte hain. Dono <strong>unique</strong> hain, lekin dono <strong>andaaza lagaane laayak</strong> hain: ek key dikhi to agli key bhi pata.` },
    { type: 'p', html: `URL shortener mein links public the, to isse farak nahi padta tha. Pastebin mein "unlisted" ka poora bharosa isi pe hai ki koi key guess na kar sake. Counter se <code>...a</code> ke baad <code>...b</code>: ek script saare unlisted pastes scan kar legi. Isliye yahan <strong>random key</strong> behtar: ek achhe random generator (crypto-secure) se 8 characters, har character 62 mein se koi bhi. Khud dekho kitna safe hai:` },
    { type: 'callout', tone: 'term', title: 'Key space', html: `<strong>Ye kya hai:</strong> kitni alag keys ban sakti hain. 62 symbols aur 8 jagah = 62<sup>8</sup> keys.<br><strong>Kyun chahiye:</strong> zinda pastes key space ka jitna chhota hissa hon, utna mushkil guess karna, aur utni kam takraav (do pastes ko same key).<br><strong>Iske bina (chhota key space):</strong> 5 character ki key (62<sup>5</sup> ≈ 91 crore) mein 3 crore pastes ke saath har 31 mein se 1 random guess kisi ka paste khol dega.` },
    { type: 'custom', render(el) {
      let mode = 'random';
      el.innerHTML = `<div class="pbk-m" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="row2" style="margin-top:10px">
          <div><label>Key length (characters): <strong class="pbk-lv"></strong></label><input class="pbk-l" type="range" min="4" max="12" step="1" value="8"></div>
          <div><label>Zinda pastes (millions): <strong class="pbk-nv"></strong></label><input class="pbk-n" type="range" min="1" max="1000" step="1" value="30"></div>
          <div><label>Attacker ke guesses per day: <strong class="pbk-gv"></strong></label><input class="pbk-g" type="range" min="1000" max="10000000" step="1000" value="10000"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Key space (62^L)</span><strong class="pbk-s"></strong></div>
          <div class="stat"><span>Ek guess sahi hone ka chance</span><strong class="pbk-p"></strong></div>
          <div class="stat"><span>Pehla paste milne tak (avg)</span><strong class="pbk-t"></strong></div>
          <div class="stat"><span>Naye paste pe takraav</span><strong class="pbk-c"></strong></div>
        </div>
        <div class="calc-note pbk-note"></div>`;
      const q = s => el.querySelector(s);
      const big = n => n >= 1e12 ? (n / 1e12).toFixed(n >= 1e15 ? 0 : 1) + ' trillion' : n >= 1e9 ? (n / 1e9).toFixed(1) + ' billion' : n >= 1e6 ? (n / 1e6).toFixed(1) + ' million' : Math.round(n).toLocaleString('en-IN');
      const oneIn = p => p >= 0.5 ? (p * 100).toFixed(0) + '%' : '1 in ' + big(1 / p);
      const dur = d => d < 1 / 24 ? (d * 1440).toFixed(0) + ' min' : d < 1 ? (d * 24).toFixed(1) + ' ghante' : d < 365 ? d.toFixed(0) + ' din' : (d / 365).toFixed(0) + ' saal';
      const upd = () => {
        const L = +q('.pbk-l').value, N = +q('.pbk-n').value * 1e6, G = +q('.pbk-g').value;
        q('.pbk-lv').textContent = L; q('.pbk-nv').textContent = q('.pbk-n').value + 'M'; q('.pbk-gv').textContent = G.toLocaleString('en-IN');
        const m = q('.pbk-m'); m.innerHTML = '';
        [['random', 'Random key'], ['counter', 'Counter + base62']].forEach(([v, t]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (v === mode ? ' on' : ''); b.textContent = t; b.onclick = () => { mode = v; upd(); }; m.appendChild(b); });
        const S = Math.pow(62, L), p = Math.min(1, N / S);
        q('.pbk-s').textContent = big(S);
        if (mode === 'counter') {
          q('.pbk-p').textContent = '~100%'; q('.pbk-t').textContent = '1 guess'; q('.pbk-c').textContent = '0 (unique)';
          q('.pbk-note').textContent = 'Counter mode: koi takraav nahi, lekin apni hi key mein 1 jod do to agla paste. Key length kitni bhi ho, scan aasaan. Public links ke liye theek, unlisted ke liye nahi.';
          return;
        }
        const days = (1 / p) / G;
        q('.pbk-p').textContent = oneIn(p); q('.pbk-t').textContent = p >= 1 ? '1 guess' : dur(days); q('.pbk-c').textContent = oneIn(p);
        q('.pbk-note').textContent = `${big(N)} zinda pastes ÷ ${big(S)} keys = har random guess ka chance ${oneIn(p)}. ${G.toLocaleString('en-IN')} guesses/day pe pehla (kisi ka bhi) paste milne mein ~${p >= 1 ? '1 guess' : dur(days)}. Naya paste banate waqt random key ka kisi zinda key se takraane ka chance bhi utna hi, isliye DB mein "insert only if key not exists" aur takraav pe nayi key.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Default pe (8 characters, 3 crore zinda pastes): key space ~<strong>218 trillion</strong>, ek random guess ka chance <strong>73 lakh mein 1</strong>, aur 10,000 guesses/day wale attacker ko kisi ek bhi paste tak pahunchne mein ~2 saal. Lekin 1 crore guesses/day (bahut saare computers se) pe ~17.5 ghante. Isliye random key akeli kaafi nahi: saath mein <strong>rate limiting</strong> (per IP 404s gino, zyada hon to block), aur jo sach mein secret hai wo unlisted nahi, <strong>private</strong> ya encrypted ho. Key 5 characters ki kar do to har 31 guess mein ek paste: key length hi suraksha hai.` },
    { type: 'steps', items: [
      { t: 'Random key banao', d: 'Crypto-secure random generator se 8 base62 characters. (Math.random jaisa normal random guess karne laayak pattern chhod sakta hai.)' },
      { t: 'Insert, sirf agar key nayi ho', d: "INSERT ... ON CONFLICT (key) DO NOTHING. Database ka unique constraint hi asli guard hai; pehle 'SELECT karke check' karna race condition hai (do request ek saath same key check kar sakti hain)." },
      { t: 'Takraav pe dobara', d: 'Insert ne 0 rows likhi? Nayi random key, dobara try. 73 lakh mein 1 chance pe ye lagbhag kabhi nahi hota, lekin code mein hona chahiye.' },
      { t: 'Ya: counter ko scramble karo', d: 'Agar counter hi chahiye (koi takraav nahi), to number ko ek secret key se ulat-pulat (encrypt) karke base62 karo. Unique bhi, guess karna mushkil bhi; bas secret key sambhalni padti hai.' },
    ]},

    { type: 'h2', text: 'Step 5: high-level design' },
    { type: 'p', html: `Do raaste hain: paste <strong>banana</strong> (kam) aur paste <strong>padhna</strong> (10 guna zyada). Har box pe click karke uska kaam padho, phir scenarios chalao:` },
    { type: 'callout', tone: 'term', title: 'Pre-signed URL', html: `<strong>Ye kya hai:</strong> object storage ka ek khaas link jo hamara server banata hai: "is link pe, agle 5 minute tak, sirf ek file, max 10 MB, upload ki ijazat hai". Link mein ek signature hota hai jo storage khud check karta hai.<br><strong>Kyun chahiye:</strong> bada paste (MBs) browser seedha object storage pe bheje; hamare app servers se bytes guzarein hi nahi.<br><strong>Iske bina:</strong> har 10 MB upload hamare server ki memory aur bandwidth khaata. Poori kahani <a href="#/object-storage">Object storage aur pre-signed URLs</a> mein.` },
    { type: 'flow', height: 340, title: 'Pastebin',
      nodes: [
        { id: 'c', label: 'Client', sub: 'browser', x: 80, y: 170, w: 120, kind: 'client', info: 'Ye kya hai: paste banane wala ya link kholne wala user, browser ya script (curl) se.' },
        { id: 'cdn', label: 'CDN', sub: 'edge cache', x: 270, y: 60, w: 130, kind: 'edge', info: 'Ye kya hai: duniya bhar mein phaile cache servers, user ke paas. Public/unlisted pastes ka content yahan cache hota hai. Cache ka time paste ke bache hue jeevan se zyada nahi hona chahiye, warna expire hua paste CDN se dikhta rahega.' },
        { id: 'app', label: 'App servers', sub: 'stateless', x: 270, y: 280, w: 140, kind: 'server', info: 'Ye kya hai: hamare servers, Load Balancer ke peeche. Key banana, size check, metadata likhna, read pe expiry aur visibility check. Stateless, to kitne bhi chala sakte ho.' },
        { id: 's3', label: 'Object storage', sub: 'S3 / GCS: blobs', x: 510, y: 60, w: 170, kind: 'data', info: 'Ye kya hai: bade files ke liye bani storage (S3, GCS). Asli text yahan, pastes/<key> path pe. Sasta, bahut durable, aur bade data ke liye bana hai.' },
        { id: 'db', label: 'Metadata DB', sub: 'key → info', x: 510, y: 280, w: 170, kind: 'data', info: 'Ye kya hai: har paste ki ek chhoti row: key, owner, size, visibility, created_at, expires_at, blob_path. expires_at pe index, taaki cleanup job jaldi dhoondh sake. Aage Redis cache bhi lag sakta hai.' },
        { id: 'cl', label: 'Cleanup job', sub: 'har ghante', x: 650, y: 170, w: 110, kind: 'queue', info: 'Ye kya hai: background job jo expire hue pastes dhoondhta hai, blob delete karta hai, phir metadata row. User ke request path mein nahi.' },
      ],
      edges: [{ a: 'c', b: 'cdn' }, { a: 'c', b: 'app' }, { a: 'cdn', b: 'app' }, { a: 'app', b: 's3' }, { a: 'app', b: 'db' }, { a: 'cl', b: 'db', dashed: true }, { a: 'cl', b: 's3', dashed: true }, { a: 'c', b: 's3', id: 'up', hidden: true }],
      scenarios: [
        { name: 'Paste banao', steps: [
          { title: 'Text bheja', go: 'c>app', text: 'User ne 20 KB code paste kiya, expiry 1 din, unlisted.', msg: 'POST /api/pastes  { content, expires_in: "1d", visibility: "unlisted" }' },
          { title: 'Size check + random key + blob', go: ['app>s3', 'res:s3>app'], text: 'App ne size check kiya (512 KB se kam), 8 character ki random key banayi, aur pehle blob upload kiya.', msg: 'PUT s3://xyz-pastes/pastes/k3J9xQ2a  (20 KB, gzip)' },
          { title: 'Phir metadata', go: ['app>db', 'res:db>app'], text: 'Order zaroori hai: pehle blob, phir metadata. Ulta karte aur blob upload fail hota, to DB ek aisi cheez ki taraf ishaara karta jo hai hi nahi. Is order mein zyada se zyada ek bina-maalik ka blob bachega, jise cleanup saaf kar dega.', msg: "INSERT pastes (key, blob_path, expires_at, ...) VALUES ('k3J9xQ2a', ...) ON CONFLICT DO NOTHING" },
          { title: 'Link wapas', go: 'res:app>c', text: 'User ko link mil gaya.', msg: '201 { "url": "https://xyz.com/p/k3J9xQ2a" }' },
        ]},
        { name: 'Bada paste (pre-signed)', steps: [
          { title: 'Upload ki ijazat maangi', go: ['c>app', 'res:app>c'], text: '6 MB log file. App ne key banayi aur ek pre-signed URL diya: sirf ye path, 5 minute, max 10 MB.', msg: '200 { upload_url: "https://xyz-pastes.s3...?X-Amz-Signature=...", key: "Zq81mPa4" }' },
          { title: 'Browser seedha storage pe', show: ['up'], go: 'c>s3', text: '6 MB seedha object storage mein gaye. App server ne ek byte bhi nahi uthaya.' },
          { title: 'Confirm, phir metadata', go: ['c>app', 'app>s3', 'res:s3>app', 'app>db'], text: 'Client ne "ho gaya" bola. App ne storage se file ka size dekha (bharosa client pe nahi), phir metadata likhi. Confirm kabhi na aaye to file bina maalik ki: cleanup hata dega.', msg: 'HEAD pastes/Zq81mPa4 → 6.1 MB ✓' },
        ]},
        { name: 'Padho (CDN miss)', steps: [
          { title: 'Link khola', go: 'c>cdn', text: 'CDN ke paas abhi copy nahi.', after: { cdn: { state: 'miss' } } },
          { title: 'Metadata check', go: ['cdn>app', 'app>db', 'res:db>app'], text: 'App ne row padhi: hai, active hai, expire nahi hua, 23 ghante bache.', msg: 'SELECT ... WHERE key = $1   →  expires_at = kal 10:30' },
          { title: 'Blob lao', go: ['app>s3', 'res:s3>app'], text: 'Object storage se text.' },
          { title: 'Wapas, cache ke saath', go: ['res:app>cdn', 'res:cdn>c'], after: { cdn: { state: 'hit', sub: 'cached (1h)' } }, text: 'Response pe cache header: max-age = min(1 ghanta, bacha hua jeevan). Agle readers CDN se.', msg: 'Cache-Control: public, max-age=3600' },
        ]},
        { name: 'Padho (CDN hit)', steps: [
          { title: 'Viral paste', go: ['c>cdn', 'res:cdn>c'], set: { cdn: { state: 'hit', sub: 'cached' }, app: { state: 'dim' }, db: { state: 'dim' }, s3: { state: 'dim' } }, text: 'Paste Twitter pe viral. 1 lakh log khol rahe hain, sab user ke paas wale CDN server se, ~20 ms mein. App, DB aur storage ko pata bhi nahi.' },
          { title: 'Iska ek side-effect', focus: ['cdn'], text: 'Ye views hamare app tak pahunche hi nahi, to view count app mein ginoge to galat aayega. CDN ke logs se ginna padega (aage analytics mein).' },
        ]},
        { name: 'Expire ho gaya', steps: [
          { title: 'Kal ka paste, aaj', go: ['c>cdn', 'cdn>app', 'app>db', 'res:db>app'], set: { cdn: { state: 'miss' } }, text: 'Row abhi bhi hai (cleanup ne abhi delete nahi kiya), lekin expires_at beet chuka.', msg: 'expires_at < now()  →  expired' },
          { title: '404, blob hone ke bawajood', go: ['bad:app>cdn', 'bad:cdn>c'], set: { s3: { state: 'dim', sub: 'blob abhi bhi hai' } }, text: 'Read path pe expiry check hi <strong>source of truth</strong> hai (asli faisla yahi). Delete kab hota hai, isse user ko farak nahi padta.', msg: '404 Not Found' },
        ]},
        { name: 'Cleanup', steps: [
          { title: 'Expire hue dhoondo', go: ['cl>db', 'res:db>cl'], text: 'Job index se expire hue pastes nikaalta hai, batches mein.', msg: 'SELECT key, blob_path FROM pastes WHERE expires_at < now() LIMIT 1000' },
          { title: 'Pehle blob, phir row', go: ['cl>s3', 'cl>db'], after: { s3: { state: '', sub: 'S3 / GCS: blobs' } }, text: 'Blob delete, phir row delete. Beech mein job mar jaaye to agli baar dobara try (delete idempotent hai: do baar karne se kuch nahi bigadta).' },
          { title: 'Managed alternatives', focus: ['s3', 'db'], text: 'Khud ka job na chalana ho: S3 lifecycle rule (AWS docs: expire objects asynchronously hatte hain, deri ho sakti hai, lekin expiry ke baad ka storage charge nahi lagta) aur DynamoDB TTL (AWS docs: expire items aam taur pe kuch din ke andar delete). Dono "kabhi baad mein" delete karte hain, isliye read pe expires_at check zaroori hai.' },
        ]},
      ],
    },

    { type: 'h2', text: 'Deep dive 1: content kahan rakhein, DB ya object storage?' },
    { type: 'table', head: ['', 'Content DB row mein', 'Content object storage mein'], rows: [
      ['Kitna bada', 'Chhote (KBs) ke liye theek', 'Bytes se TBs, sab ke liye'],
      ['Kharcha', 'DB disk + replicas + backups: mehnga per GB', 'Per GB kahin sasta'],
      ['Durability', 'Replicas aur backups khud sambhalo', 'Built-in (provider kai copies rakhta hai)'],
      ['Read ka raasta', 'Ek hop: row mein sab', 'Do hop: row, phir blob (ya CDN seedha)'],
      ['Metadata queries', 'Bade rows ke saath slow', 'Chhoti table, tez'],
      ['CDN', 'App se hi dena padega', 'CDN storage se seedha le sakta hai'],
    ]},
    { type: 'p', html: `Isliye aam design: <strong>hybrid</strong>. 1 KB se chhote pastes (jaise ek command, ek error line) metadata row mein inline, baaki object storage mein. Do aur chhote hunar:` },
    { type: 'list', items: [
      `<strong>Compression:</strong> code aur logs mein bahut repeat hota hai, to text aam taur pe kaafi compress hota hai. Blob ko gzip karke rakho; browser ko bhi gzip hi bhejo (<code>Content-Encoding: gzip</code>), CPU dono taraf bachta hai.`,
      `<strong>Same content, ek copy (optional):</strong> blob ka naam uske content ke hash (jaise SHA-256) se rakho. Log ek hi error message 1,000 baar paste karein to blob ek hi. Lekin ab ek blob ke kai maalik hain: delete tabhi jab koi paste use na kar raha ho (reference count). Ye extra complexity tabhi lo jab napkin maths bole ki duplicates sach mein bahut hain.`,
    ]},

    { type: 'h2', text: 'Deep dive 2: expiry, TTL aur cleanup' },
    { type: 'p', html: `"1 din mein expire" ke teen alag matlab hain, aur beginners inhe mila dete hain: (1) 1 din baad <strong>koi dekh na paaye</strong>, (2) 1 din baad <strong>storage se mite</strong>, (3) 1 din baad <strong>CDN ki copy</strong> bhi na dikhe. Pehla turant chahiye, doosra baad mein bhi chalega, teesra sabse aasaani se toot-ta hai.` },
    { type: 'callout', tone: 'term', title: 'TTL (time to live)', html: `<strong>Ye kya hai:</strong> kisi cheez ki "zindagi": itne time baad ise mara hua maano. Paste ka TTL = expiry; CDN copy ka TTL = <code>Cache-Control: max-age</code> (seconds).<br><strong>Kyun chahiye:</strong> purani cheezein apne aap hatein, bina kisi ke yaad rakhe.<br><strong>Iske bina:</strong> storage hamesha badhta, aur purani copies dikhti rehtin.` },
    { type: 'list', items: [
      `<strong>Read pe check (source of truth):</strong> har read pe <code>expires_at &lt; now()</code>? To 404. Ye turant aur pakka hai.`,
      `<strong>Cleanup job:</strong> index se expire hue pastes batches mein nikaalo, pehle blob phir row delete. Ya managed: DynamoDB TTL (AWS docs: aam taur pe kuch din ke andar delete) aur S3 lifecycle rules (AWS docs: asynchronous, deri ho sakti hai). Dhyaan: S3 lifecycle rules object ki <em>umar</em> (din) aur prefix/tag pe chalte hain, har object ke apne time pe nahi. Isliye blobs ko expiry ke hisaab se alag prefix mein rakh sakte ho (<code>1d/</code>, <code>30d/</code>, <code>never/</code>) aur har prefix ka rule.`,
      `<strong>CDN TTL ≤ bacha jeevan:</strong> paste 10 minute mein expire hona hai to CDN ko 1 ghante ka max-age mat do. Neeche khud dekho kyun.`,
      `<strong>Delete pe purge:</strong> maalik ne delete kiya ya abuse team ne hataya, to CDN ko purge (copy mitao) request bhejo.`,
    ]},
    { type: 'custom', render(el) {
      let smart = false;
      el.innerHTML = `<div class="pbe-m" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="row2" style="margin-top:10px">
          <div><label>Paste expire hoga (minute baad): <strong class="pbe-ev"></strong></label><input class="pbe-e" type="range" min="5" max="180" step="5" value="10"></div>
          <div><label>Pehla reader (minute pe, CDN bharta hai): <strong class="pbe-fv"></strong></label><input class="pbe-f" type="range" min="0" max="175" step="1" value="5"></div>
          <div><label>Doosra reader (minute pe): <strong class="pbe-tv"></strong></label><input class="pbe-t" type="range" min="0" max="240" step="1" value="30"></div>
          <div><label>Cleanup job har kitne minute: <strong class="pbe-cv"></strong></label><input class="pbe-c" type="range" min="5" max="120" step="5" value="60"></div>
        </div>
        <svg class="pbe-svg" viewBox="0 0 320 90" style="width:100%;height:auto;margin-top:10px" role="img" aria-label="Paste, CDN copy aur cleanup ki timeline"></svg>
        <div class="stats">
          <div class="stat"><span>CDN copy kab tak</span><strong class="pbe-u"></strong></div>
          <div class="stat"><span>Doosre reader ko mila</span><strong class="pbe-r"></strong></div>
          <div class="stat"><span>Blob kab mita</span><strong class="pbe-d"></strong></div>
        </div>
        <div class="calc-note pbe-note"></div>`;
      const q = s => el.querySelector(s);
      const upd = () => {
        const E = +q('.pbe-e').value, F = Math.min(+q('.pbe-f').value, E - 1), T = +q('.pbe-t').value, C = +q('.pbe-c').value;
        q('.pbe-ev').textContent = E; q('.pbe-fv').textContent = F; q('.pbe-tv').textContent = T; q('.pbe-cv').textContent = C;
        const m = q('.pbe-m'); m.innerHTML = '';
        [[false, 'CDN max-age: hamesha 60 min'], [true, 'CDN max-age: min(60, bacha jeevan)']].forEach(([v, t]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (v === smart ? ' on' : ''); b.textContent = t; b.onclick = () => { smart = v; upd(); }; m.appendChild(b); });
        const age = smart ? Math.min(60, E - F) : 60, until = F + age;
        const del = Math.ceil(E / C) * C === E ? E + C : Math.ceil(E / C) * C;
        let res, bug = false;
        if (T < F) res = T < E ? 'Paste (origin se)' : '404';
        else if (T < until) { res = 'Paste (CDN se)'; bug = T >= E; }
        else res = T < E ? 'Paste (origin se)' : '404';
        q('.pbe-u').textContent = 'minute ' + until; q('.pbe-r').textContent = res + (bug ? ' ✗' : ''); q('.pbe-d').textContent = 'minute ' + del;
        const span = Math.max(240, del + 10), X = t => 10 + t / span * 300;
        let s = `<line x1="10" x2="310" y1="70" y2="70" stroke="var(--line-2)"/>`;
        s += `<rect x="${X(0)}" y="14" width="${X(E) - X(0)}" height="12" rx="3" fill="var(--green)" opacity=".7"><title>paste zinda</title></rect><text x="${X(0) + 2}" y="11" font-size="8" fill="var(--ink-2)" font-family="var(--f-mono)">paste zinda</text>`;
        s += `<rect x="${X(F)}" y="34" width="${X(until) - X(F)}" height="12" rx="3" fill="${until > E ? 'var(--red)' : 'var(--accent)'}" opacity=".7"><title>CDN copy</title></rect><text x="${X(F) + 2}" y="57" font-size="8" fill="var(--ink-2)" font-family="var(--f-mono)">CDN copy</text>`;
        s += `<line x1="${X(T)}" x2="${X(T)}" y1="8" y2="70" stroke="${bug ? 'var(--red)' : 'var(--ink)'}" stroke-dasharray="3 2"/><line x1="${X(del)}" x2="${X(del)}" y1="60" y2="80" stroke="var(--amber)" stroke-width="2"/>`;
        s += `<text x="10" y="86" font-size="8" fill="var(--ink-2)" font-family="var(--f-mono)">0</text><text x="310" y="86" text-anchor="end" font-size="8" fill="var(--ink-2)" font-family="var(--f-mono)">${span} min  (dashed = doosra reader, orange = blob delete)</text>`;
        q('.pbe-svg').innerHTML = s;
        q('.pbe-note').textContent = (bug ? `Bug: paste minute ${E} pe expire ho chuka, lekin CDN copy minute ${until} tak zinda hai, to minute ${T} pe reader ko expire hua paste dikh gaya. ` : `Theek: reader ko "${res}". `) + `CDN copy = pehla read (minute ${F}) + max-age (${age} min). Blob cleanup job ke agle run pe (minute ${del}) mita; tab tak read path ka expiry check hi 404 deta hai.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Default pe: paste 10 minute mein expire, pehla reader minute 5 pe aaya aur CDN ne 60 minute ki copy rakh li (minute 65 tak). Doosra reader minute 30 pe: use <strong>expire hua paste CDN se mil gaya</strong>. Mazedaar: minute 60 pe cleanup ne blob mita bhi diya, phir bhi minute 65 tak CDN dikhata rahega. "min(60, bacha jeevan)" chuno: CDN copy sirf 5 minute (minute 10 tak), aur minute 30 wale ko sahi 404. Sabak: CDN ka TTL hamesha paste ke bache hue jeevan se chhota.` },
    { type: 'h3', text: 'Burn after reading: "padhte hi mita do"' },
    { type: 'p', html: `Kuch pastes ek hi baar padhne ke liye hote hain (jaise ek temporary password). Do jaal hain. <strong>(1) CDN:</strong> agar CDN ne copy rakh li to baad wale bhi padh lenge, isliye aise paste pe <code>Cache-Control: no-store</code> (koi cache na rakhe). <strong>(2) Do log ek saath:</strong> dono ne row padhi, dono ko "abhi padha nahi gaya" dikha, dono ko content mila. Isliye "padho aur mita do" ek <strong>atomic</strong> step ho (ya to poora ho ya bilkul nahi): <code>UPDATE pastes SET status='burned' WHERE key=$1 AND status='active'</code>, aur content sirf usko jiske liye row sach mein update hui (1 row affected).` },

    { type: 'h2', text: 'Deep dive 3: read-heavy caching aur CDN' },
    { type: 'p', html: `Reads writes se 10 guna, aur kuch pastes viral hote hain (koi popular script, leak hua config). Teen parton mein cache:` },
    { type: 'table', head: ['Layer', 'Kya rakhta hai', 'Kiske liye', 'Dhyaan'], rows: [
      ['Browser', 'Pura page / raw text', 'Same user dobara khole', 'max-age chhota, bacha jeevan se kam'],
      ['CDN (edge)', 'Content, user ke paas ke server pe', 'Public aur unlisted pastes', 'TTL ≤ bacha jeevan; delete pe purge; private kabhi nahi'],
      ['Redis (app ke paas)', 'Hot pastes ki metadata row (aur chhota content)', 'CDN miss pe DB bachana', 'Delete/expiry pe key hatao ya chhota TTL'],
    ]},
    { type: 'code', text: `
Public / unlisted:   Cache-Control: public, max-age=<min(3600, seconds_left)>
Private:             Cache-Control: private, no-store        // CDN aur shared caches mein kabhi nahi
Burn after reading:  Cache-Control: no-store
Unlisted page:       X-Robots-Tag: noindex                    // search engines list na karein` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "unlisted hai to CDN pe mat rakho"', html: `Unlisted ka secret URL hai, content nahi: jiske paas URL hai wo dekh hi sakta hai, to CDN pe rakhne se suraksha nahi ghatti (CDN bhi wahi URL maang ke hi deta hai). Asli khatra <strong>private</strong> pastes ka hai: unka jawab login pe depend karta hai, aur galti se shared CDN pe cache hua to agle aadmi ko kisi aur ka private paste mil sakta hai. Isliye private pe <code>private, no-store</code>, hamesha.` },

    { type: 'h2', text: 'Deep dive 4: size limits' },
    { type: 'p', html: `Pastebin.com free users ko 512 KB aur PRO ko 10 MB tak deta hai. Limit sirf UI ka message nahi; usse har darwaze pe lagao, kyunki attacker browser use nahi karta, seedha API pe 2 GB bhejta hai:` },
    { type: 'steps', items: [
      { t: 'Load Balancer / gateway pe', d: 'Request body ki max size (jaise 1 MB). Usse bada body app tak pahunchne se pehle hi 413 (Payload Too Large).' },
      { t: 'App pe', d: 'Plan ke hisaab se: guest/free 512 KB, PRO 10 MB. Content-Length pe bharosa nahi, asli bytes gino.' },
      { t: 'Pre-signed upload pe', d: 'URL mein hi size ki shart (jaise content-length-range 0-10 MB), taaki storage khud bada upload mana kare. Upload ke baad bhi asli size check (HEAD).' },
      { t: 'Per user/IP kul quota', d: 'Ek user ek din mein 10,000 × 512 KB na bhar de: Pastebin ki tarah din mein paste count ki hadd (guest 10, free 20, PRO 250).' },
    ]},

    { type: 'h2', text: 'Deep dive 5: public, unlisted, private aur encrypted' },
    { type: 'table', head: ['Visibility', 'Kaun dekh sakta hai', 'Suraksha kis pe tiki', 'CDN?'], rows: [
      ['Public', 'Sab; list/search/archive mein', 'Kuch chhupa nahi', 'Haan'],
      ['Unlisted', 'Jiske paas link', 'Key unguessable ho (random, 8+ chars) + rate limit', 'Haan (noindex)'],
      ['Private', 'Sirf maalik (login)', 'Har read pe login + owner check', 'Nahi'],
      ['Client-side encrypted', 'Jiske paas poora link (# ke baad wali chaabi ke saath)', 'Server ke paas sirf taala laga data', 'Haan, kyunki data padhne laayak hi nahi'],
    ]},
    { type: 'callout', tone: 'term', title: 'URL fragment (# ke baad wala hissa)', html: `<strong>Ye kya hai:</strong> URL mein <code>#</code> ke baad ka hissa, jaise <code>xyz.com/p/k3J9#chaabi123</code>. Browser ise <strong>server ko bhejta hi nahi</strong>; ye sirf page ke andar ke JavaScript ko dikhta hai.<br><strong>Kyun chahiye:</strong> open-source PrivateBin isi ka use karta hai: browser paste ko AES-256-GCM se encrypt karta hai, server ko sirf taala laga (encrypted) data milta hai, aur kholne ki chaabi link ke # ke baad hoti hai.<br><strong>Iske bina:</strong> server (ya uska admin, ya hacker jisne server toda) har paste padh sakta hai. Lekin dhyaan: link jiske paas hai wo padh lega, aur agar server hi kharab JavaScript bheje to chaabi chura sakta hai.` },
    { type: 'flow', height: 320, title: 'Private paste padhna',
      nodes: [
        { id: 'c', label: 'Browser', sub: 'user', x: 80, y: 160, w: 120, kind: 'client', info: 'Ye kya hai: paste kholne wala. Login ho to har request ke saath ek session cookie bhejta hai.' },
        { id: 'app', label: 'App servers', sub: 'auth check', x: 280, y: 160, w: 140, kind: 'server', info: 'Ye kya hai: wahi app servers. Private paste pe pehle "ye kaun hai" (session) aur "kya ye maalik hai" (owner_id) check karte hain.' },
        { id: 'sess', label: 'Session store', sub: 'cookie → user', x: 280, y: 45, w: 150, kind: 'cache', info: 'Ye kya hai: login session ka record (jaise Redis mein): cookie → user_id. <a href="#/auth-basics">Auth basics</a> wala lesson.' },
        { id: 'db', label: 'Metadata DB', sub: 'owner_id, visibility', x: 510, y: 250, w: 170, kind: 'data', info: 'Ye kya hai: wahi metadata table. visibility = private aur owner_id yahan se aata hai.' },
        { id: 's3', label: 'Object storage', sub: 'blobs', x: 510, y: 80, w: 170, kind: 'data', info: 'Ye kya hai: wahi object storage. Private paste ka blob kabhi public URL se nahi; ya to app se, ya chhoti umar ke signed URL se.' },
      ],
      edges: [{ a: 'c', b: 'app' }, { a: 'app', b: 'sess' }, { a: 'app', b: 'db' }, { a: 'app', b: 's3' }],
      scenarios: [
        { name: 'Maalik padhta hai', steps: [
          { title: 'Cookie ke saath request', go: ['c>app', 'app>sess', 'res:sess>app'], text: 'Session se pata chala: user 42.', msg: 'GET /p/Pr1v8key  Cookie: sid=...  →  user_id = 42' },
          { title: 'Owner check', go: ['app>db', 'res:db>app'], text: 'Paste private hai, owner_id = 42. Match.', msg: 'visibility = private, owner_id = 42  ✓' },
          { title: 'Content, bina cache', go: ['app>s3', 'res:s3>app', 'res:app>c'], text: 'Content mila, header ke saath ki koi shared cache ise na rakhe.', msg: 'Cache-Control: private, no-store' },
        ]},
        { name: 'Ajnabi ke paas link', steps: [
          { title: 'Link kisi aur ke haath', go: ['c>app', 'app>sess', 'res:sess>app'], set: { c: { label: 'Stranger' } }, text: 'Kisi ne private paste ka link forward kar diya. Is user ka id 77.' },
          { title: 'Owner match nahi', go: ['app>db', 'res:db>app'], text: 'owner_id 42 hai, ye 77. Ijazat nahi.' },
          { title: '404, 403 nahi', go: 'bad:app>c', set: { s3: { state: 'dim' } }, text: '404 lautao, 403 nahi. 403 ka matlab "paste hai, par tumhara nahi": ye bhi ek jaankari hai. 404 kuch nahi batata.', msg: '404 Not Found' },
        ]},
        { name: 'Encrypted paste', steps: [
          { title: 'Browser mein encrypt', focus: ['c'], text: 'Browser ne ek random chaabi banayi aur text ko AES-256-GCM se encrypt kiya. Chaabi kabhi server ko nahi jaati.', msg: 'key = random 256-bit (sirf browser mein)' },
          { title: 'Server ko sirf taala laga data', go: ['c>app', 'app>s3', 'app>db'], set: { s3: { sub: 'ciphertext only' } }, text: 'Server ne encrypted data rakha. Admin ya hacker ke liye ye bekaar bytes hain.' },
          { title: 'Link mein chaabi # ke baad', go: 'res:app>c', text: 'Link: xyz.com/p/Ab3k#chaabi. Kholne wale ka browser # ke baad wala hissa server ko nahi bhejta, chaabi se khud decrypt karta hai. Keemat: server spam/malware scan nahi kar sakta, aur link kho gaya to paste hamesha ke liye band.' },
        ]},
      ],
    },

    { type: 'h2', text: 'Deep dive 6: abuse, spam aur leaks' },
    { type: 'p', html: `Free, anonymous text hosting ka galat istemal bhi hota hai: spam links, malware ke instructions, chori hue passwords ki lists, aur galti se paste hue company secrets (API keys). Pastebin ke FAQ ke mutabik bahut tez posting, shaky links, duplicates ya flagged keywords pe wo CAPTCHA maangte hain, aur niyam todne pe account ya IP ban. Unka ek "scraping API" bhi hai (sirf PRO, ek whitelisted IP se) jo naye public pastes ki list deta hai: security researchers isi se leaks dhoondhte hain. Matlab public paste <strong>minutes mein</strong> duniya ki nazar mein hota hai.` },
    { type: 'flow', height: 340, title: 'Abuse se bachaav',
      nodes: [
        { id: 'c', label: 'Client', sub: 'user / bot', x: 80, y: 170, w: 110, kind: 'client', info: 'Ye kya hai: paste banane wala. Asli user bhi ho sakta hai, ya spam bot jo minute mein hazaar pastes bhejna chahta hai.' },
        { id: 'gw', label: 'Rate limiter', sub: 'per IP / account', x: 240, y: 170, w: 140, kind: 'edge', info: 'Ye kya hai: gateway pe counter (Redis), jaise "guest: 10 pastes/din, 1 per 10 sec". Hadd tooti to 429 ya CAPTCHA. <a href="#/rate-limiting">Rate limiting</a> lesson.' },
        { id: 'app', label: 'App servers', sub: 'save + 201', x: 410, y: 170, w: 130, kind: 'server', info: 'Ye kya hai: wahi app servers. Paste save karke turant link deta hai, aur scan ka kaam queue mein daal deta hai (user ko scan ka wait nahi).' },
        { id: 'cdn', label: 'CDN', sub: 'purge on takedown', x: 410, y: 55, w: 130, kind: 'edge', info: 'Ye kya hai: wahi CDN. Paste hataya gaya to iski copies bhi mitaani padti hain (purge), warna hata hua paste dikhta rahega.' },
        { id: 'db', label: 'Metadata DB', sub: 'status flag', x: 600, y: 170, w: 130, kind: 'data', info: 'Ye kya hai: wahi metadata. status = active | flagged | removed. Read path flagged/removed pe 404 (ya "removed" page) deta hai.' },
        { id: 'q', label: 'Scan queue', sub: 'async', x: 410, y: 290, w: 130, kind: 'queue', info: 'Ye kya hai: naye pastes aur user reports ki line. Report wale aage (priority).' },
        { id: 'sc', label: 'Abuse scanner', sub: 'rules + ML + humans', x: 600, y: 290, w: 150, kind: 'threat', info: 'Ye kya hai: background workers jo content check karte hain: spam links, malware patterns, secrets jaise "AKIA..." (AWS key) ya passwords ki lists. Shaky cases insaan (moderator) dekhta hai.' },
      ],
      edges: [{ a: 'c', b: 'gw' }, { a: 'gw', b: 'app' }, { a: 'app', b: 'db' }, { a: 'app', b: 'q' }, { a: 'q', b: 'sc' }, { a: 'sc', b: 'db' }, { a: 'sc', b: 'cdn' }],
      scenarios: [
        { name: 'Normal paste', steps: [
          { title: 'Hadd ke andar', go: ['c>gw', 'gw>app', 'app>db', 'res:app>gw', 'res:gw>c'], text: 'User ka aaj 3rd paste, hadd ke andar. Save hua, link mila.' },
          { title: 'Scan baad mein', go: ['evt:app>q', 'evt:q>sc', 'sc>db'], after: { db: { state: 'ok', sub: 'status: active' } }, text: 'Scanner ne kuch galat nahi paaya. User ko is poore kaam ka wait nahi karna pada.' },
        ]},
        { name: 'Spam bot', steps: [
          { title: 'Minute mein 500 pastes', flood: { paths: ['c>gw'], n: 10 }, set: { c: { label: 'Bot' } }, after: { gw: { state: 'hot', sub: '500/min!' } }, text: 'Ek IP se ek minute mein 500 pastes, sab mein same casino link.' },
          { title: '429 + CAPTCHA', go: 'bad:gw>c', after: { gw: { state: 'warn', sub: 'CAPTCHA / block' } }, set: { app: { state: 'dim' } }, text: 'Rate limiter ne roka: pehle CAPTCHA, phir IP block. App aur DB tak ye kachra pahuncha hi nahi. Same content baar baar (duplicate) bhi ek signal hai.' },
        ]},
        { name: 'Leaked secret mila', steps: [
          { title: 'Config file paste hui', go: ['c>gw', 'gw>app', 'app>db', 'evt:app>q'], text: 'Kisi developer ne galti se config file public paste kar di, jismein ek cloud API key hai.' },
          { title: 'Scanner ne pakda', go: ['evt:q>sc', 'sc>db'], after: { db: { state: 'warn', sub: 'status: flagged' }, sc: { state: 'hot', sub: 'secret pattern!' } }, text: 'Pattern match: AWS access key jaisa string. Paste flagged (chhupa), maalik ko email. Kai platforms aise mamle mein key ki company ko bhi khabar dete hain taaki key band ho.' },
          { title: 'CDN se bhi mitao', go: 'sc>cdn', after: { cdn: { state: 'ok', sub: 'purged' } }, text: 'CDN purge, taaki cached copy bhi na dikhe. Lekin yaad rakho: public tha, to scraping se shayad pehle hi kisi ne copy kar li. Isliye asli fix: key badlo.' },
        ]},
      ],
    },

    { type: 'h2', text: 'Deep dive 7: analytics, view count' },
    { type: 'p', html: `"Ye paste 12,431 baar dekha gaya." Simple lagta hai: har read pe <code>UPDATE pastes SET views = views + 1</code>. Teen problems: (1) viral paste ki ek row pe har second hazaaron writes (hot row, lock ka jhagda); (2) zyaadatar reads CDN se hote hain, jo app tak aate hi nahi; (3) har read ko ek DB write bana diya, jabki read path tez hona chahiye. <a href="#/url-shortener">URL shortener</a> mein Bitly ne bhi clicks ko alag stream mein process kiya tha. Yahan bhi:` },
    { type: 'list', items: [
      `<strong>Events, counter nahi:</strong> app aur CDN dono "view hua" event dete hain (CDN apne access logs se). Events ek queue/stream mein.`,
      `<strong>Batch mein jodo:</strong> ek consumer har minute har paste ke views jod ke ek hi write karta hai: 5,000 writes ki jagah 1.`,
      `<strong>Unique viewers:</strong> har viewer ka set rakhna mehnga; HyperLogLog (thodi galti ke saath, bahut kam memory) se andaaza. <a href="#/ds-for-scale">Data structures for scale</a> dekho.`,
      `<strong>Count thoda purana chalega:</strong> view count 1 minute late dikhe to kisi ka nuksaan nahi. Ye cheez strongly consistent hone ki zaroorat nahi.`,
    ]},

    { type: 'h2', text: 'Kya kya toot sakta hai' },
    { type: 'table', head: ['Failure', 'Asar', 'Bachaav'], rows: [
      ['Blob upload hua, metadata fail', 'Bina maalik ka blob', 'Pehle blob phir metadata; cleanup orphan blobs ko saaf kare'],
      ['CDN ne expire paste ki copy rakhi', 'Expire ke baad bhi dikhe', 'CDN TTL ≤ bacha jeevan; delete pe purge'],
      ['Private paste shared cache mein', 'Kisi aur ka private paste dikh gaya', 'private, no-store; private kabhi CDN pe nahi'],
      ['Burn-after-read do log ek saath', 'Dono ne padh liya', 'Atomic "padho aur burn karo" UPDATE'],
      ['Key guessing bot', 'Unlisted pastes leak', 'Random 8+ char keys, 404 rate limit, IP block'],
      ['Spam / malware flood', 'Storage aur reputation kharab', 'Rate limit, CAPTCHA, async scanner, takedown + purge'],
      ['Viral paste', 'DB pe hot row', 'CDN + Redis cache; views ke liye events, counter nahi'],
      ['Object storage region down', 'Reads fail', 'Provider ki multi-AZ durability; zaroori ho to doosre region mein copy'],
      ['Cleanup job ruk gaya', 'Storage badhta rahe (user pe asar nahi)', 'Monitoring: "expire hue lekin zinda" blobs ki ginti pe alert'],
    ]},
    { type: 'callout', tone: 'why', title: 'Decide', html: `Chhota + query hone wala data → <strong>database</strong>; bada + bas padha jaane wala → <strong>object storage</strong>; DB mein pointer. 1 KB se chhote pastes inline. Unlisted/private links → <strong>random keys</strong> (crypto-random, 8+ chars) ya scrambled counter; public → simple counter bhi chalega. Expiry ka asli faisla <strong>read path</strong> pe; delete baad mein (job / lifecycle / TTL). CDN TTL ≤ bacha jeevan, private kabhi CDN pe nahi. Views ke liye events + batch, row counter nahi.` },
    { type: 'h2', text: 'Interview mein kaise bolein' },
    { type: 'steps', items: [
      { t: 'Requirements', d: 'Create/read/delete, expiry options, public/unlisted/private, size limits, read-heavy, durable, expired kabhi na dikhe.' },
      { t: 'Napkin maths', d: '10 writes/s, 100 reads/s, 30M zinda pastes, ~600 GB content vs ~6 GB metadata: 99% bytes blob.' },
      { t: 'Data model', d: 'Metadata DB (key PK, expires_at index) + object storage blobs; chhote inline.' },
      { t: 'Key', d: 'Random base62, 8 chars (~218 trillion); insert-if-absent; ya scrambled counter.' },
      { t: 'Reads', d: 'CDN (TTL ≤ bacha jeevan) → app → Redis → DB → blob; read pe expiry + visibility check.' },
      { t: 'Baaki', d: 'Cleanup job / S3 lifecycle / TTL, pre-signed uploads, size limits har darwaze pe, abuse pipeline, views via events.' },
    ]},
    { type: 'diagram', title: 'Poora design, ek nazar mein', height: 560,
      groups: [
        { label: 'Edge', x: 10, y: 120, w: 700, h: 100 },
        { label: 'Async', x: 10, y: 240, w: 300, h: 230 },
        { label: 'App + data', x: 320, y: 240, w: 392, h: 230 },
      ],
      nodes: [
        { id: 'user', label: 'Browser / curl', sub: 'user', x: 330, y: 60, w: 170, kind: 'client', info: 'Ye kya hai: paste banane ya padhne wala user (ya script). Reads CDN pe jaate hain, writes Load Balancer pe.' },
        { id: 'cdn', label: 'CDN', sub: 'public + unlisted', x: 150, y: 170, w: 150, kind: 'edge', info: 'Ye kya hai: user ke paas ke cache servers. Public/unlisted content yahan, TTL ≤ bacha jeevan. Private kabhi nahi. Takedown pe purge.' },
        { id: 'gw', label: 'LB + rate limiter', sub: 'per IP / account', x: 490, y: 170, w: 170, kind: 'edge', info: 'Ye kya hai: Load Balancer aur gateway jo body size limit aur per-IP/account rate limits lagata hai (spam bots, key guessing).' },
        { id: 'app', label: 'App servers', sub: 'stateless', x: 490, y: 290, w: 150, kind: 'server', info: 'Ye kya hai: random key, size check, pehle blob phir metadata, read pe expiry + visibility check, pre-signed URLs.' },
        { id: 's3', label: 'Object storage', sub: 'blobs (gzip)', x: 652, y: 290, w: 124, kind: 'data', info: 'Ye kya hai: S3/GCS jaisi storage. Paste ka asli text, pastes/<key> pe. Sasta aur bahut durable.' },
        { id: 'rd', label: 'Redis', sub: 'hot metadata', x: 370, y: 420, w: 110, kind: 'cache', info: 'Ye kya hai: tez in-memory cache. Hot pastes ki metadata (aur chhota content), taaki CDN miss pe bhi DB na thake.' },
        { id: 'db', label: 'Metadata DB', sub: 'key → row', x: 520, y: 420, w: 130, kind: 'data', info: 'Ye kya hai: har paste ki chhoti row: key, owner, visibility, size, expires_at (indexed), blob_path, status.' },
        { id: 'cl', label: 'Cleanup', sub: 'job / TTL', x: 660, y: 420, w: 100, kind: 'queue', info: 'Ye kya hai: expire hue pastes ka blob aur row mitaane wala background job (ya S3 lifecycle + DB TTL).' },
        { id: 'q', label: 'Event queue', sub: 'views + scans', x: 150, y: 300, w: 150, kind: 'queue', info: 'Ye kya hai: "view hua", "naya paste scan karo", "report aaya" jaise events ki line. Read path ko tez rakhta hai.' },
        { id: 'sc', label: 'Abuse scanner', sub: 'spam, secrets', x: 90, y: 420, w: 130, kind: 'threat', info: 'Ye kya hai: naye pastes aur reports ko check karta hai; galat mila to flag karke CDN purge.' },
        { id: 'an', label: 'Analytics', sub: 'view counts', x: 235, y: 420, w: 110, kind: 'data', info: 'Ye kya hai: view events ko har minute jod ke counts likhta hai (CDN logs + app events).' },
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
        { name: 'Paste banao', text: 'POST → rate limiter → app: random key, pehle blob object storage mein, phir metadata row. Scan ka event queue mein.', go: ['user>gw>app>s3', 'app>db', 'app>q'] },
        { name: 'Padho (CDN hit)', text: 'Zyaadatar reads: user ke paas ka CDN server seedha content de deta hai. App tak kuch nahi aata.', go: ['user>cdn'] },
        { name: 'Padho (miss)', text: 'CDN miss → app → Redis/DB se row (expiry + visibility check) → blob → CDN pe cache, TTL ≤ bacha jeevan.', go: ['user>cdn>gw>app>rd', 'app>db', 'app>s3'] },
        { name: 'Takedown', text: 'Scanner ne leaked secret pakda: row flagged, CDN purge.', go: ['app>q>sc>db', 'sc>cdn'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Metadata (chhota, queries) <strong>DB</strong> mein; content (bada) <strong>object storage</strong> mein; beech mein pointer. 99% bytes blob hote hain.</li>
      <li>Likhne ka order: <strong>pehle blob, phir metadata</strong>. Orphan blobs cleanup saaf karta hai.</li>
      <li>Unlisted ki suraksha = <strong>unguessable key</strong>: crypto-random base62, 8+ chars, insert-if-absent, aur 404 rate limiting.</li>
      <li>Expiry ka asli faisla <strong>read path</strong> pe; delete baad mein (job, S3 lifecycle, DB TTL: sab async).</li>
      <li><strong>CDN TTL ≤ bacha jeevan</strong>; private pe <code>private, no-store</code>; delete pe purge.</li>
      <li>Size limit <strong>har darwaze</strong> pe: LB, app, pre-signed URL. Bade uploads pre-signed URL se seedha storage pe.</li>
      <li>Abuse: rate limits + CAPTCHA, async scanner, takedown. Views: <strong>events + batch</strong>, row counter nahi.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Metadata/blob alag: DB chhota aur tez, bytes saste storage mein', 'Random keys: unlisted pastes guess nahi ho sakte', 'CDN: viral paste bhi app ko chhue bina', 'Read-path expiry check: expire hua paste turant gayab, delete kabhi bhi', 'Async scan + events: user ka write aur read tez'], costs: ['Do stores (DB + object storage) ko sync rakhna, orphan cleanup', 'Random keys: kabhi kabhi takraav, insert dobara', 'CDN TTL chhota rakhna = zyada origin hits', 'Scan async: kuch minute tak bura content live reh sakta hai', 'View counts thode late aur approx', 'Encrypted pastes: server scan nahi kar sakta'] },
    { type: 'think', questions: [
      { q: 'xyz.com pe ek paste "burn after reading" hai. CDN aur do parallel readers ke saath kya galat ho sakta hai, aur kaise bachoge?', a: 'CDN ise cache kar lega aur baad wale bhi padh lenge, to aise paste pe Cache-Control: no-store. Do log ek saath padhein to dono ko mil sakta hai: read + burn ek atomic step ho (UPDATE ... SET status = burned WHERE key = ? AND status = active), aur content sirf usko jiske liye row update hui.' },
      { q: 'Ek user shikayat karta hai: "maine paste delete kiya, phir bhi link khul raha hai." Kahan kahan dekhoge?', a: 'Pehle read path: kya delete pe status update hua aur read status check karta hai? Phir Redis: kya metadata cache se hati? Phir CDN: kya purge request gayi aur safal hui? Aur browser cache: max-age chhota tha? Aam taur pe CDN purge chhoota hota hai.' },
      { q: 'Paste ka content DB mein rakhna kab sahi hoga?', a: 'Jab pastes hamesha chhote hon (jaise < 1 KB commands), total data kam ho, aur ek hop bachana zaroori ho. Isliye hybrid: chhote inline, bade object storage mein. Agar sab pastes chhote hain to sirf DB bhi theek design hai.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Pastebin mein paste ka text database ki jagah object storage mein kyun?', options: ['Object storage tez hai', 'Bytes ka 99% blob hai; DB chhota rehta hai aur object storage sasta, durable, CDN-friendly hai', 'DB text store nahi kar sakta'], answer: 1, explain: 'Queries metadata pe, bytes blob mein. Dono ki zaroorat alag, to jagah bhi alag.' },
      { q: 'Paste expire ho gaya lekin S3 lifecycle ne abhi delete nahi kiya. User ko kya milna chahiye?', options: ['Paste, kyunki blob abhi hai', '404, kyunki read path expires_at check karta hai', '500 error'], answer: 1, explain: 'Lifecycle aur TTL deletes async hain (deri ho sakti hai). Asli faisla read pe expiry check hai.' },
      { q: 'Unlisted pastes ke liye counter + base62 keys mein kya problem hai?', options: ['Keys lambi hoti hain', 'Agli key guess karna aasaan, to koi saare unlisted pastes scan kar lega', 'Takraav bahut hote hain'], answer: 1, explain: 'Counter unique hai lekin predictable. Random 8-char key (~218 trillion) mein 3 crore pastes pe ek guess ka chance 73 lakh mein 1.' },
      { q: 'Paste 10 minute mein expire hona hai. CDN max-age kya ho?', options: ['Hamesha 1 ghanta', 'min(1 ghanta, bacha hua jeevan)', 'CDN pe kabhi nahi'], answer: 1, explain: 'Fixed 1 ghanta pe widget mein expire hua paste minute 30 pe bhi CDN se dikh gaya. Bacha jeevan se chhota TTL ye bug rokta hai.' },
      { q: 'Private paste ka link kisi ajnabi ne khola. Kya lautao?', options: ['403 Forbidden', '404 Not Found', '200 with blank page'], answer: 1, explain: '403 batata hai ki paste maujood hai. 404 kuch nahi batata, isliye behtar.' },
    ]},
    { type: 'sources', note: 'Pastebin ne apna internal architecture public nahi kiya; is lesson ka design general industry approach hai. Product ki limits aur visibility options Pastebin ke official FAQ se, expiry ka behaviour AWS docs se.', items: [
      { title: 'Pastebin FAQ', publisher: 'Pastebin.com', official: true, url: 'https://pastebin.com/faq', used: 'Paste size limits (512 KB free, 10 MB PRO), public/unlisted/private meanings, pastes per 24 hours (guest 10, free 20, PRO 250), CAPTCHA on rapid posting/suspicious links/duplicates/keywords, bans.' },
      { title: 'Pastebin Scraping API', publisher: 'Pastebin.com', official: true, url: 'https://pastebin.com/doc_scraping_api', used: 'PRO-only, whitelisted-IP API that lists recent public pastes; shows public pastes are monitored quickly.' },
      { title: 'Expiring objects (S3 Lifecycle) and Using time to live (TTL) in DynamoDB', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-expire-general-considerations.html', used: 'S3 expiration is asynchronous with possible delay and no storage charge after expiry; lifecycle rules work on object age and prefix/tags; DynamoDB TTL deletes typically within a few days, so reads must filter expired items.' },
      { title: 'PrivateBin README', publisher: 'PrivateBin (open source project)', official: true, url: 'https://github.com/PrivateBin/PrivateBin', used: 'Zero-knowledge design: AES-256-GCM encryption in the browser, key in the URL fragment never sent to the server, burn after reading, limits (trust in server JavaScript, link = access).' },
      { title: 'Creating gists (secret vs public gists)', publisher: 'GitHub Docs', official: true, url: 'https://docs.github.com/en/get-started/writing-on-github/editing-and-sharing-content-with-gists/creating-gists', used: 'Secret gists are not private: anyone with the URL can see them; example of unlisted vs private.' },
      { title: 'Cache-Control header', publisher: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control', used: 'public, private, no-store and max-age semantics for CDN and browser caching.' },
    ]},
  ],
});
