Lesson.register({
  id: 'design-drive',
  title: 'Google Drive / Dropbox',
  minutes: 35,
  summary: `Ek folder jo tumhare laptop, phone aur office PC pe hamesha same rahe. Zero se: file ko tukdon (blocks) mein todna aur har tukde ka fingerprint (hash). Phir content hash se dedupe, metadata vs blobs, doosre devices ko change ki khabar (long polling), offline edits ke conflicts, version history aur sharing. Dropbox ke engineering blog aur Google Drive ki docs pe based.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Riya ke paas laptop, phone aur office ka PC hai. Wo chahti hai ki "Trip" folder teeno pe hamesha bilkul same rahe.<br>Laptop pe ek photo daali to thodi der mein phone pe bhi dikhe. Flight mein (bina internet) file badli to land karte hi baaki jagah pahunch jaaye.<br>Aur agar usi waqt uske dost Aman ne wahi file badal di, to kisi ka kaam gayab na ho.<br>Google Drive aur Dropbox yahi karte hain, crores logon ke liye, bina ek bhi file khoye. Ye lesson dikhata hai kaise.` },
    { type: 'callout', tone: 'tip', title: 'Pehle khud try karo', html: `Kaagaz pe socho: Riya ne laptop pe 40 MB ki presentation mein ek slide badli. (1) Kitna data upload hona chahiye? (2) Uske phone ko kaise pata chalega? (3) Agar flight mein laptop offline tha aur usi waqt Aman ne wahi file edit kar di, to kya hoga? Phir yahan compare karo.` },

    { type: 'p', html: `<a href="#/object-storage">Object storage</a> lesson mein xyz.com pe "Drive" feature ka ek tukda dekha tha: chunks aur hashes. Ab poora system banayenge. Ye <strong>file sync</strong> problem hai, aur ye jitni simple dikhti hai utni hai nahi.` },
    { type: 'p', html: `Scale ka andaaza: Dropbox ke 2020 ke engineering post ke mutabik unke paas sau arab (hundreds of billions) se zyada files, trillions file revisions, exabytes data, aur crores (hundreds of millions) devices the. Usi post mein ek line hai jo is lesson ka saar hai: sync mein clients lambe time tak offline reh sakte hain aur wapas aake apne changes milaate hain. Doosre distributed systems ke liye network toota hona ek ajeeb haadsa hai; sync engine ke liye <em>roz ka kaam</em>.` },
    { type: 'callout', tone: 'term', title: 'Naya word: sync engine', html: `<strong>Ye kya hai:</strong> tumhare laptop/phone pe chalne wala ek program jo tumhare local folder pe nazar rakhta hai, aur server ke saath files upload/download karke dono ko same rakhta hai. Dropbox ka desktop app yahi hai. Server pe uska jodidaar hota hai jo batata hai "kya badla".<br><strong>Kyun chahiye:</strong> user ko kuch "upload" dabana na pade: file save ki aur baaki devices pe apne aap pahunch gayi.<br><strong>Iske bina:</strong> har baar haath se upload/download, aur devices pe alag alag purane versions.` },
    { type: 'h2', text: 'Step 0: teen basic ideas, zero se' },
    { type: 'p', html: `Design se pehle teen chhote ideas. Poora lesson inhi pe khada hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: block (file ka tukda)', html: `<strong>Ye kya hai:</strong> har file ko barabar size ke tukdon mein kaat dete hain, jaise 4 MB ke. 16 MB ki presentation = 4 blocks. Har block alag se upload, store aur download hota hai.<br><strong>Kyun chahiye:</strong> 40 MB ki file mein ek slide badli to sirf wo ek block dobara bhejo, poori file nahi. Upload toota to sirf bache hue blocks bhejo.<br><strong>Iske bina:</strong> har chhote badlaav pe poori file dobara upload: mobile data, time aur server bandwidth sab barbaad.` },
    { type: 'callout', tone: 'term', title: 'Naya word: hash (content ka fingerprint)', html: `<strong>Ye kya hai:</strong> ek function (jaise SHA-256) jo kitne bhi bytes ko ek chhota sa "fingerprint" bana deta hai, jaise <code>9f2c1a…</code>. Same bytes ka hamesha same hash. Ek bit bhi badla to bilkul alag hash.<br><strong>Kyun chahiye:</strong> block ka naam hi uska hash rakho. Ab server sirf hash dekh ke bata sakta hai "ye block mere paas pehle se hai", aur download ke baad hash mila ke pakka kar sakte ho ki data kharab nahi hua.<br><strong>Iske bina:</strong> pata hi nahi chalega kaunsa hissa badla, same data kai baar store hoga, aur corrupt file pakdi nahi jaayegi.` },
    { type: 'callout', tone: 'term', title: 'Naya word: metadata vs blobs', html: `<strong>Ye kya hai:</strong> <em>Blob</em> = file ke asli bytes (blocks). <em>Metadata</em> = file ke baare mein jaankari: naam, folder, kaunse blocks kis order mein, version, kisko access hai.<br><strong>Kyun chahiye:</strong> dono ka mizaaj alag hai. Bytes bahut bade hain aur kabhi badalte nahi: sasta object storage. Metadata chhota hai, baar baar badalta hai, aur bilkul sahi (consistent) hona chahiye: SQL database. File ka naya version metadata mein save karne ko <strong>commit</strong> kehte hain.<br><strong>Iske bina:</strong> ek hi database mein GBs ke bytes aur lakhon chhote updates: na sasta, na tez.` },
    { type: 'p', html: `In teeno ko jodo to ek file bas ek list ban jaati hai: <code>pitch.pptx = [h1, h2, h3, h4]</code> (block hashes). Ye list metadata DB mein, aur har hash ke bytes block storage mein.` },


    { type: 'h2', text: 'Step 1: requirements' },
    { type: 'compare',
      left: { title: 'Functional', html: `• Files upload/download, kisi bhi size ki<br>• Ek device pe change → baaki devices pe apne aap<br>• Offline edit, wapas online aane pe sync<br>• Version history: purana version wapas lao<br>• Sharing: kisi ko view/edit access, shared folders<br><br><strong>Out of scope:</strong> Google Docs jaisa live co-editing (alag lesson), search, previews` },
      right: { title: 'Non-functional', html: `• <strong>Durability sabse upar:</strong> file kabhi khoye ya corrupt na ho<br>• Sync fast ho, aur sirf badla hua hissa jaaye (bandwidth)<br>• Har device aakhir mein same state pe (eventual consistency)<br>• Conflicts pe data loss nahi<br>• Permissions sahi: galat insaan ko ek byte bhi na mile` },
    },

    { type: 'h2', text: 'Step 2: napkin maths' },
    { type: 'p', html: `Saare numbers "maan lo" hain. Dekhna ye hai ki "poori file dobara bhejo" aur "sirf badle blocks bhejo" mein kitna farak hai:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="drU">Daily active users (millions)</label><input id="drU" type="number" value="50" min="1" step="1"></div>
          <div><label for="drE">Edits per user per din</label><input id="drE" type="number" value="5" min="1" step="1"></div>
          <div><label for="drF">Average file size (MB)</label><input id="drF" type="number" value="20" min="1" step="1"></div>
          <div><label for="drC">Ek edit kitne 4 MB blocks badalta hai</label><input id="drC" type="number" value="1" min="1" step="1"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Poori file har baar</span><strong class="drA"></strong></div>
          <div class="stat"><span>Sirf badle blocks</span><strong class="drB"></strong></div>
          <div class="stat"><span>Bachat</span><strong class="drS"></strong></div>
          <div class="stat"><span>Metadata commits/sec (avg)</span><strong class="drQ"></strong></div>
        </div>
        <div class="calc-note drN"></div>`;
      const q = s => el.querySelector(s);
      const fmt = mb => mb >= 1e9 ? (mb / 1e9).toFixed(2) + ' PB/din' : (mb / 1e6).toFixed(1) + ' TB/din';
      const upd = () => {
        const u = Math.max(1, +q('#drU').value || 1) * 1e6, e = Math.max(1, +q('#drE').value || 1);
        const f = Math.max(1, +q('#drF').value || 1), c = Math.max(1, +q('#drC').value || 1);
        const full = u * e * f, blk = u * e * Math.min(f, c * 4);
        q('.drA').textContent = fmt(full);
        q('.drB').textContent = fmt(blk);
        q('.drS').textContent = Math.round((1 - blk / full) * 100) + '%';
        q('.drQ').textContent = Math.round(u * e / 1e5).toLocaleString('en-IN');
        q('.drN').textContent = `Ek din ≈ 10^5 second. Har edit ek metadata "commit" bhi hai: ye chhote, bahut zyada, aur strongly consistent hone chahiye. Bytes bade aur kam baar. Dono ka mizaaj alag hai, isliye inhe alag systems mein rakhenge.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Default values pe poori file bhejna <strong>5 PB/din</strong>, sirf badla block bhejna <strong>1 PB/din</strong> (80% bachat), aur ~2,500 metadata commits/sec average. Bade files aur chhote edits pe bachat aur bhi zyada.` },

    { type: 'h2', text: 'Step 3: data model, metadata vs blobs' },
    { type: 'p', html: `Sabse important design decision: <strong>file ke bytes</strong> aur <strong>file ke baare mein jaankari</strong> ko alag karo. Dropbox ke 2014 ke post "Streaming File Synchronization" mein unka model aisa tha (post purani hai, lekin core idea aaj bhi samajhne layak hai):` },
    { type: 'list', items: [
      `<strong>Block:</strong> har file <strong>4 MB ke blocks</strong> mein tooti (aakhri chhota ho sakta hai). Har block ka <strong>SHA-256</strong> hash nikala jaata hai.`,
      `<strong>Blocklist:</strong> file ka content = uske block hashes ki list, jaise <code>[h1, h2, h3, h4]</code>. Bas itne se file pehchani jaati hai.`,
      `<strong>Namespace:</strong> ek folder tree ki root. Har user ka ek root namespace, aur har <em>shared folder</em> apna alag namespace jo kai users ke root mein "mount" hota hai. Har file = (namespace, relative path).`,
      `<strong>Server File Journal (SFJ):</strong> metadata ka bada database. Append-only: har row ek file ka ek <em>version</em>: namespace id, path, blocklist, aur <strong>journal id (JID)</strong> jo har namespace mein badhta jaata hai. File ke bytes isme nahi.`,
    ]},
    { type: 'callout', tone: 'term', title: 'Thoda aur detail: content-addressing aur dedupe', html: `Step 0 mein hash dekha. Jab block ka <em>naam hi uska hash</em> ho, to ise <strong>content-addressed storage</strong> kehte hain. Fayda: do users ke paas same block ho to wo ek hi baar store hoga (<strong>dedupe</strong>), aur block kabhi badalta nahi (immutable): badla hua block = naya hash = naya block.` },
    { type: 'table', head: ['Table / store', 'Kya rakhta hai', 'Kaisa store'], rows: [
      ['File journal (SFJ jaisa)', 'namespace_id, path, blocklist, JID, size, modified_by', 'SQL, strongly consistent; namespace se shard karna natural choice hai'],
      ['Namespaces + mounts', 'Kaunsa shared folder kis user ke root mein kahan', 'SQL'],
      ['ACL / permissions', 'namespace ya file → user/group, role', 'SQL (cache ke saath)'],
      ['Device cursors', 'Har device kis JID tak sync hai (client bhi yaad rakhta hai)', 'Client side + server'],
      ['Block index', 'hash → kis storage bucket/volume mein', 'Dropbox ne iske liye bada sharded MySQL chuna (Magic Pocket post, 2016)'],
      ['Blocks', 'hash → encrypted bytes', 'Object/block storage (Dropbox: Magic Pocket; generic: S3/GCS)'],
    ]},

    { type: 'h2', text: 'Step 4: high-level design, ek file ka safar' },
    { type: 'p', html: `Dropbox ke 2014 post mein do tarah ke servers the: <strong>block server</strong> aur <strong>metadata server</strong>. Idle clients ek <strong>notification server</strong> se judte the. Diagram se pehle ek ek box:` },
    { type: 'callout', tone: 'term', title: 'Box: metaserver (metadata server)', html: `<strong>Ye kya hai:</strong> wo server jo files ki "kitaab" sambhalta hai: kaunsi file kis folder mein, uske blocks kaunse, kaunsa version, aur kisko access hai. Bytes ko chhoota bhi nahi.<br><strong>Kyun chahiye:</strong> "nayi file ka version save karo" (commit) ka faisla ek jagah, ek saath, sahi tareeke se hona chahiye.<br><strong>Iske bina:</strong> do devices alag alag sach maanenge, aur kisi ko pata nahi chalega file ka latest version kaunsa hai.` },
    { type: 'callout', tone: 'term', title: 'Box: block server', html: `<strong>Ye kya hai:</strong> wo server jo sirf blocks leta aur deta hai: "hash h7 ke bytes do" ya "ye bytes h7 naam se rakho". Use users ya file names se matlab nahi (bas permission check karta hai).<br><strong>Kyun chahiye:</strong> bade bytes ka kaam alag machines pe, jinhe alag se badhaya ja sake. Metadata server halka rehta hai.<br><strong>Iske bina:</strong> GBs ka traffic metadata server se guzrega aur chhote, zaroori commits bhi slow ho jaayenge.` },
    { type: 'callout', tone: 'term', title: 'Box: notify server aur long polling', html: `<strong>Ye kya hai:</strong> <em>Long polling</em> = device server se poochhta hai "kuch badla?", aur server tab tak jawab rok ke rakhta hai jab tak kuch badle (ya timeout, jaise 30-480 second). Jawab aate hi device nayi request khol leta hai. Notify server bas yahi khuli requests sambhalta hai.<br><strong>Kyun chahiye:</strong> change hote hi turant khabar, aur beech mein koi bekaar request nahi.<br><strong>Iske bina:</strong> har device har kuch second "kuch naya?" poochhta (polling): crores bekaar requests, aur phir bhi der (neeche widget mein dekho).` },
    { type: 'callout', tone: 'term', title: 'Naya word: journal aur cursor', html: `<strong>Ye kya hai:</strong> <em>Journal</em> = metadata DB ki ek lambi list jisme har badlaav ek nayi line ki tarah judta hai, number ke saath (JID 1043, 1044...). <em>Cursor</em> = har device ka bookmark: "maine JID 1042 tak padh liya".<br><strong>Kyun chahiye:</strong> device bas bolta hai "1042 ke baad kya badla?" aur sirf naye badlaav paata hai, chahe wo 2 din baad aaye.<br><strong>Iske bina:</strong> har baar poore folder ki list compare karni padti, ya koi notification miss hua to badlaav hamesha ke liye chhoot jaata.` },
    { type: 'p', html: `Neeche ka diagram Dropbox ke 2014 post pe based hai. Saare scenarios chalao:` },
    { type: 'flow', title: 'Sync: laptop se phone tak', height: 380,
      nodes: [
        { id: 'l', label: 'Riya laptop', sub: 'sync engine', x: 75, y: 200, w: 120, kind: 'client', info: 'Ye kya hai: Riya ke laptop ka sync engine. File system pe nazar rakhta hai, badli file ko 4 MB blocks mein todta hai, hashes nikaalta hai, aur commit karta hai. Har namespace ke liye ek cursor (JID) yaad rakhta hai.' },
        { id: 'm', label: 'Metaserver', sub: 'commit, list', x: 360, y: 70, w: 150, kind: 'server', info: 'Ye kya hai: files ki kitaab sambhalne wala server. Commit pe check karta hai: kya ye block hashes server pe hain? Kya is user ko is namespace mein likhne ka haq hai? Kuch blocks missing hon to "need blocks" lautata hai. Sab mil gaye to SFJ mein nayi row.' },
        { id: 'j', label: 'File journal', sub: 'SFJ, metadata DB', x: 590, y: 60, w: 150, kind: 'data', info: 'Ye kya hai: metadata DB ki lambi list. Append-only journal: har row = ek file ka ek version (namespace, path, blocklist, JID). Bytes nahi, sirf hashes ki list.' },
        { id: 'b', label: 'Block server', sub: 'hash → bytes', x: 360, y: 200, w: 150, kind: 'server', info: 'Ye kya hai: sirf blocks lene-dene wala server. Blocks store/retrieve karta hai. Download se pehle check karta hai ki maangne wale user ko us block ka access hai. Ek request mein bytes ki limit hoti hai, to badi files kai requests mein.' },
        { id: 's', label: 'Block storage', sub: 'Magic Pocket / S3', x: 360, y: 330, w: 170, kind: 'data', info: 'Ye kya hai: bytes ki badi, sasti almari. Immutable blocks, key = SHA-256 hash. Dropbox ka apna system Magic Pocket hai; aam design mein S3/GCS jaisa object storage.' },
        { id: 'n', label: 'Notify server', sub: 'long poll', x: 600, y: 335, w: 140, kind: 'queue', info: 'Ye kya hai: khuli long-poll requests sambhalne wala server. Idle devices yahan ek long-poll request khuli rakhte hain. Jaise hi unke namespace mein naya commit hota hai, jawab jaata hai "changes hain". Isme koi data nahi, sirf ishaara.' },
        { id: 'p', label: 'Riya phone', sub: 'sync engine', x: 645, y: 200, w: 120, kind: 'client', info: 'Ye kya hai: Riya ke phone ka sync engine. Notification milte hi apne cursor ke saath "list" maangta hai: is JID ke baad kya badla? Phir jo blocks local nahi hain sirf wahi download karke file dobara jodta hai.' },
      ],
      edges: [{ a: 'l', b: 'm' }, { a: 'l', b: 'b' }, { a: 'm', b: 'j' }, { a: 'm', b: 'b' }, { a: 'b', b: 's' }, { a: 'm', b: 'n' }, { a: 'n', b: 'p' }, { a: 'p', b: 'm' }, { a: 'p', b: 'b' }],
      scenarios: [
        { name: 'Nayi file', steps: [
          { title: 'Pehle sirf hashes', text: 'Laptop ne pitch.pptx (16 MB) ko 4 blocks mein toda aur metaserver ko sirf blocklist bheji. Abhi koi byte nahi.', go: 'l>m', msg: 'commit(ns=riya, "/pitch.pptx", [h1,h2,h3,h4])' },
          { title: 'Need blocks', text: 'Server ke paas inme se koi hash nahi. Jawab: ye chaaron chahiye.', go: 'res:m>l', msg: '→ need_blocks [h1,h2,h3,h4]' },
          { title: 'Blocks upload', text: 'Laptop seedha block server ko blocks bhejta hai (batch mein). Block server unhe hash ke naam se store karta hai.', flood: { paths: ['l>b>s'], n: 4 }, after: { s: { state: 'ok', sub: '+4 blocks' } }, msg: 'store_batch [h1:…, h2:…, h3:…, h4:…]' },
          { title: 'Dobara commit: ab file "exist" karti hai', text: 'Is baar saare hashes mil gaye. SFJ mein nayi row, JID 1043. Isse pehle doosre devices ko file dikhti hi nahi thi: commit hi wo pal hai.', go: ['l>m', 'm>j', 'res:m>l'], after: { j: { sub: 'JID 1043 pitch.pptx' } } },
          { title: 'Phone ko ishaara', text: 'Phone ka long-poll request khula tha. Ab uska jawab jaata hai: "is namespace mein changes hain".', go: ['evt:m>n', 'evt:n>p'], msg: '{ "changes": true }' },
          { title: 'Phone: list, phir sirf missing blocks', text: 'Phone apne cursor (JID 1042) ke saath list maangta hai, nayi row milti hai, phir jo blocks local nahi hain wo block server se laata hai aur file jodta hai.', go: ['p>m', 'res:m>p', 'p>b', 'res:b>p'], after: { p: { state: 'ok', sub: 'pitch.pptx synced' } } },
        ]},
        { name: 'Ek slide badli (dedupe)', steps: [
          { title: 'Naya blocklist', text: 'Slide 5 badli, wo block 2 mein thi. Naya hash h2x. Baaki teen hashes same.', go: 'l>m', msg: 'commit("/pitch.pptx", [h1,h2x,h3,h4])' },
          { title: 'Sirf ek block chahiye', text: 'h1, h3, h4 server pe pehle se hain.', go: 'res:m>l', msg: '→ need_blocks [h2x]' },
          { title: '4 MB, 16 MB nahi', text: 'Sirf ek block upload, phir commit. Nayi row JID 1044; purani row (JID 1043) bhi rahi: wahi version history hai.', go: ['l>b>s', 'l>m', 'm>j'], after: { j: { sub: 'JID 1044 (v2)' } } },
          { title: 'Phone bhi sirf ek block laata hai', text: 'Phone ke paas h1, h3, h4 pehle se hain (purani file mein). Sirf h2x download.', go: ['evt:m>n', 'evt:n>p', 'p>m', 'res:m>p', 'p>b', 'res:b>p'], after: { p: { state: 'ok', sub: 'v2, 1 block' } } },
        ]},
        { name: 'Upload beech mein toota', steps: [
          { title: 'Do blocks pahunche, phir net gaya', text: 'Laptop 4 mein se 2 blocks bhej paaya.', go: ['l>b>s', 'lost:l>b'], after: { l: { state: 'warn', sub: 'offline' } } },
          { title: 'Koi aadhi file nahi dikhti', text: 'Commit hua hi nahi, to SFJ mein koi row nahi. Phone ko na adhoori file dikhegi na koi notification. Blocks pehle, commit baad mein: isse file ka naya version <strong>atomic</strong> banta hai.', focus: ['j'] },
          { title: 'Wapas online: sirf baaki do', text: 'Laptop phir commit karta hai. Server bolta hai ab sirf h3, h4 chahiye (h1, h2 pahunch chuke). Adhoore uploads ke bekaar blocks (jinhe kabhi commit nahi mila) ko baad mein garbage collection saaf karta hai: ye aam approach hai.', set: { l: { state: '', sub: 'online' } }, go: ['l>m', 'res:m>l', 'l>b>s', 'l>m', 'm>j'] },
        ]},
        { name: 'Phone 2 din offline', steps: [
          { title: 'Phone band tha', text: 'Is beech laptop ne 7 commits kiye: JID 1044 se 1051. Notification phone tak pahunche hi nahi.', set: { p: { state: 'dim', sub: 'cursor: 1044' } }, go: ['l>m', 'm>j', 'lost:n>p'], after: { j: { sub: 'JID 1051' } } },
          { title: 'Wapas aaya: cursor se poochha', text: 'Notifications khoye to kuch nahi bigda. Phone apna cursor bhejta hai: "1044 ke baad kya hua?" Server 7 rows deta hai. Notification sirf ishaara hai; sach journal hai.', set: { p: { state: '', sub: 'cursor: 1044' } }, go: ['p>m', 'm>j', 'res:j>m', 'res:m>p'], msg: 'list(cursor=1044) → 7 entries, new cursor=1051' },
          { title: 'Phir long-poll', text: 'Missing blocks download karke phone fir se notify server pe long-poll khol deta hai.', go: ['p>b', 'res:b>p', 'p>n'], after: { p: { state: 'ok', sub: 'cursor: 1051' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'Deep dive 1: blocks, hashes aur dedupe' },
    { type: 'p', html: `Problem: 38 MB ki presentation mein ek slide badli aur poori file dobara upload. Mobile data pe ye paisa aur time dono hai. Solution: file ko fixed 4 MB blocks mein todo, har block ka hash, aur sirf wahi blocks bhejo jinka hash server ke paas nahi. Khud chala ke dekho (toy hash, asli mein SHA-256):` },
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
      el.innerHTML = `<div style="font-size:14px;color:var(--ink-3)">pitch.pptx (38 MB): har dabba ek block hai (4 MB, aakhri chhota). <strong>Kisi block pe click</strong> karo = us block ke andar ek slide edit.</div>
        <div class="drkBl" style="display:flex;flex-wrap:wrap;gap:6px;margin:10px 0"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          <button type="button" class="btn small" data-x="app">Ant mein 6 MB jodo</button>
          <button type="button" class="btn small" data-x="front">Shuru mein 1 MB slide jodo</button>
          <button type="button" class="btn small" data-x="v1">Version 1 restore</button>
          <button type="button" class="btn small ghost" data-x="reset">Reset</button>
        </div>
        <pre class="drkMsg" style="font:12px var(--f-mono);background:var(--surface-2);border-radius:var(--r-sm);padding:8px 10px;margin:10px 0 0;white-space:pre-wrap;word-break:break-all"></pre>
        <div class="stats">
          <div class="stat"><span>Version</span><strong class="drkV"></strong></div>
          <div class="stat"><span>File size</span><strong class="drkT"></strong></div>
          <div class="stat"><span>Is sync mein upload</span><strong class="drkU"></strong></div>
          <div class="stat"><span>Server pe unique blocks</span><strong class="drkS"></strong></div>
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
          show(r2, `Sirf block B${i + 1} ka hash badla. Baaki blocks ke hash wahi, to server unhe skip karta hai. ${r2.total} MB ki file mein se sirf ${r2.up} MB gaya.`);
        });
      };
      const reset = () => {
        units = V1.slice(); server = new Set(); ver = 1; edits = 0;
        show(syncV(units, server), 'Pehli baar: server pe kuch nahi, to saare blocks upload. Ab kisi block pe click karo.');
      };
      el.querySelectorAll('[data-x]').forEach(b => b.onclick = () => {
        const x = b.dataset.x;
        if (x === 'reset') return reset();
        ver++;
        if (x === 'app') { units = units.concat(Array.from({ length: 6 }, (_, i) => 'n' + ver + '.' + i)); show(syncV(units, server), 'Aakhri block (jo pehle adhoora tha) badla aur naye blocks bane. Pehle ke saare blocks skip.'); }
        if (x === 'front') { units = ['s' + ver].concat(units); show(syncV(units, server), 'Shuru mein 1 MB judne se har block ki boundary 1 MB khisak gayi, to lagbhag har block ka hash badal gaya. Fixed-size blocks ki yahi kamzori hai; ilaaj content-defined chunking (object storage lesson) ya block ke andar rsync jaisa delta.'); }
        if (x === 'v1') { units = V1.slice(); show(syncV(units, server), 'Purana version wapas laana = bas purana blocklist commit karna. Saare blocks server pe pehle se hain: 0 MB upload. Version history isi wajah se sasti hai.'); }
      });
      reset();
    }},
    { type: 'list', items: [
      `<strong>Block ke andar bhi bachat:</strong> Dropbox ke 2014 post ke mutabik block upload/download requests ko chhota karne ke liye compression aur rsync (purane aur naye bytes ka sirf farak bhejna) bhi use hota tha.`,
      `<strong>Version history muft jaisi:</strong> purana version = purana blocklist. Blocks immutable hain aur reuse hote hain, to 10 versions ka matlab 10 guna storage nahi.`,
      `<strong>Streaming sync:</strong> pehle doosra device tab tak kuch nahi laata tha jab tak upload poora commit na ho. Dropbox ne 2014 mein "streaming sync" banaya: commit se pehle hi doosra device blocks prefetch karne lagta hai. Post ke mutabik badi files pe multi-device sync time ~2x tak behtar hua.`,
    ]},
    { type: 'callout', tone: 'warn', title: 'Dedupe ka security pehlu', html: `Agar server sirf hash dekh ke "ye block to hai" maan le aur bina check ke download bhi de de, to koi bas ek hash jaan ke kisi aur ka data maang sakta hai. Isliye Dropbox ke 2014 post mein block server download se pehle check karta hai ki user ko us block ka access hai (yaani kisi aisi file ke through jo uske namespace mein hai). Users ke beech dedupe se ye bhi pata chal sakta hai ki "kisi ke paas ye file hai", isliye kai systems dedupe sirf ek user ya ek account ke andar karte hain.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `"Dedupe matlab duplicate files dhoondh ke delete karna?" Nahi. User ko apni saari files dikhti rehti hain. Dedupe <em>storage ke andar</em> hota hai: do files (ya do versions) jinke kuch blocks same hain, unke wo blocks disk pe ek hi baar rakhe jaate hain, aur dono files ke blocklists usi hash ki taraf ishaara karte hain.` },

    { type: 'h3', text: 'Blocks kahan rehte hain: Magic Pocket' },
    { type: 'p', html: `Dropbox ne S3 se hat ke apna block storage banaya, <strong>Magic Pocket</strong>. Unke 2016 ke architecture post ke mutabik:` },
    { type: 'list', items: [
      `Ye ek <strong>immutable block store</strong> hai: blocks (max 4 MB, compressed + encrypted) ek baar likhe gaye to kabhi badalte nahi. Badlaav ka hisaab upar ki layer (file journal) rakhti hai.`,
      `Block ki key aam taur pe uska SHA-256 hash. Blocks ko ~1 GB ke "buckets" mein jodte hain, taaki disk badalne ya erasure coding karne pe chhote chhote 4 MB tukde na sambhalne padein.`,
      `Naye blocks pehle seedhe kai machines pe replicate hote hain; baad mein buckets ko <strong>erasure coding</strong> se sasta banaya jaata hai (data ko tukdon + kuch extra "parity" tukdon mein baant ke alag disks pe rakhna; kuch disks mar bhi jaayein to data wapas ban jaata hai, aur poori copies se kam jagah lagti hai). Har block kam se kam do alag geographic zones mein.`,
      `Block index (hash → kahan rakha hai) ke liye unhone koi fancy distributed hash table nahi, ek bada <strong>sharded MySQL</strong> chuna, kyunki simple tha aur unknowns kam the.`,
    ]},
    { type: 'image', src: 'assets/img/design-drive/disk-server.jpg', alt: 'Laal rang ka ek khula storage server jisme upar ki taraf darjanon hard disks lambi line mein lagi hain, aur baaki slots khaali hain', caption: 'Block storage asal mein aisa dikhta hai: ek dabba, darjanon hard disks. Ye Backblaze (ek cloud backup company) ka open design Storage Pod 2.0 hai, 2011 ke aas paas, aadha bhara hua (poore mein 45 disks). Magic Pocket ya S3 jaise systems hazaron aise disk-bhare servers ko ek bade block store ki tarah chalaate hain.', credit: { text: 'ChrisDag, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Backblaze_2.0_half-full_chassis_-_2_(6073928533).jpg', license: 'CC BY 2.0' } },
    { type: 'p', html: `Aam design mein (Google Drive jaise) ye hissa S3/GCS jaisa <a href="#/object-storage">object storage</a> hai. Interview mein bas itna kehna kaafi hai: blocks content-addressed hain, immutable hain, aur durable object storage mein rehte hain.` },

    { type: 'h2', text: 'Deep dive 2: doosre devices ko kaise pata chale?' },
    { type: 'p', html: `Phone ko kaise pata chale ki laptop ne kuch badla? Har 5 second pe "kuch naya?" poochhna (polling) crores devices pe bekaar requests ka toofan hai, aur 5 second ki der bhi. Teen raaste (<a href="#/realtime">realtime lesson</a> dekho):` },
    { type: 'table', head: ['Tareeka', 'Kaise', 'Kahan dikhta hai'], rows: [
      ['Long polling', 'Client request bhejta hai, server tab tak jawab rokta hai jab tak kuch badle ya timeout ho. Jawab aate hi client nayi request kholta hai.', 'Dropbox desktop (2014 post: idle clients notification server pe long-poll). Dropbox API ka <code>list_folder/longpoll</code>'],
      ['WebSocket / push', 'Ek khula connection, server jab chahe message bheje.', 'Bahut se modern sync clients; mobile pe OS push (APNs/FCM) jab app band ho'],
      ['Webhook / watch', 'Server doosre server ke URL pe notification bhejta hai.', 'Google Drive API <code>changes.watch</code> (channel max 7 din), phir <code>changes.list</code> se asli changes'],
    ]},
    { type: 'p', html: `Dropbox API docs ke mutabik <code>list_folder/longpoll</code> ek <strong>cursor</strong> leta hai, timeout 30 se 480 second (default 30), aur server us pe 90 second tak ka random <strong>jitter</strong> jodta hai taaki saare clients ek hi pal mein reconnect na karein (thundering herd). Jawab mein sirf <code>changes: true/false</code> aur kabhi <code>backoff</code> (itne second ruk ke aana). Asli changes client phir <code>list_folder/continue</code> se cursor ke saath leta hai.` },
    { type: 'p', html: `Polling aur long polling ka farak numbers mein dekho. Saare numbers "maan lo" hain; jitter ka average 45 second liya hai (Dropbox API 0-90 s tak jodta hai):` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="drpD">Online devices (millions)</label><input id="drpD" type="number" value="20" min="1" step="1"></div>
          <div><label for="drpC">Ek device pe changes per ghanta</label><input id="drpC" type="number" value="2" min="0" step="1"></div>
          <div><label for="drpP">Polling: har kitne second poochho: <strong class="drpPv"></strong></label><input id="drpP" type="range" min="1" max="60" value="5"></div>
          <div><label for="drpT">Long poll timeout (second): <strong class="drpTv"></strong></label><input id="drpT" type="range" min="30" max="480" step="30" value="30"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Polling: requests/sec</span><strong class="drpA"></strong></div>
          <div class="stat"><span>Polling: kaam ki requests</span><strong class="drpU"></strong></div>
          <div class="stat"><span>Polling: average der</span><strong class="drpL"></strong></div>
          <div class="stat"><span>Long poll: requests/sec</span><strong class="drpB"></strong></div>
          <div class="stat"><span>Long poll: khule connections</span><strong class="drpO"></strong></div>
          <div class="stat"><span>Long poll: der</span><strong class="drpM"></strong></div>
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
        q('.drpN').textContent = `Polling har ${P} s pe: ${fm(poll)} requests/sec, jinme se sirf ${(useful * 100).toFixed(2)}% ko kuch naya milta hai, aur badlaav ki khabar average ${(P / 2).toFixed(1)} s der se. Long poll: ${fm(lp)} requests/sec (${(poll / lp).toFixed(1)} guna kam) aur khabar lagbhag turant. Keemat: ${fm(D)} connections hamesha khule, jo notify servers ki memory khaate hain. Timeout badhao to requests aur kam, lekin beech ke proxies/NAT lambe idle connection kaat sakte hain.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Default pe: polling <strong>40 lakh requests/sec</strong> (sirf 0.28% kaam ki), long poll <strong>~2.78 lakh/sec</strong>, yaani ~14 guna kam, aur der 2.5 s se ~1 s. Badle mein 2 crore connections khule rakhne padte hain.` },
    { type: 'callout', tone: 'term', title: 'Thoda aur detail: cursor', html: `Step 4 mein dekha, <strong>cursor</strong> ek bookmark hai: "maine journal mein yahan tak padh liya". Dropbox mein ye JID tha, Google Drive API mein <code>pageToken</code>. Client cursor bhejta hai, server sirf uske baad ke changes deta hai, aur naya cursor. Isliye notification kho bhi jaaye to kuch nahi khota: agli baar cursor se sab mil jaayega.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `"Notification mein hi file ka data bhej do, ek round trip bachega." Ye galti hai. Notification chhota ishaara hona chahiye (<em>kuch badla hai</em>). Data cursor ke through journal se aata hai. Warna notification khoya = data khoya, aur crores connections pe bhaari messages.` },

    { type: 'h2', text: 'Deep dive 3: conflicts' },
    { type: 'p', html: `Riya aur Aman ek shared folder mein <code>report.docx</code> pe kaam karte hain. Riya flight mein (offline) edit karti hai, usi waqt Aman office se edit karke sync kar deta hai. Riya land karti hai. Ab kya? Teen options:` },
    { type: 'list', items: [
      `<strong>Last write wins:</strong> jo baad mein pahuncha wo jeeta. Simple, lekin Aman ka kaam chupchaap gayab. File sync mein ye mana hai, kyunki durability sabse upar hai.`,
      `<strong>Merge karo:</strong> plain text mein shayad ho jaaye, lekin .docx, .psd, .mp4 jaisi binary files ko server samajhta hi nahi. (Google Docs isliye alag tareeka use karta hai: live co-editing, alag lesson.)`,
      `<strong>Dono rakho:</strong> ek version original naam pe, doosra alag naam se. Dropbox yahi karta hai: <strong>conflicted copy</strong>.`,
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: optimistic concurrency aur conflicted copy', html: `<strong>Ye kya hai:</strong> har commit ke saath client batata hai ki uska edit kis version (<strong>base revision</strong>) pe based hai. Server tabhi maanta hai jab base = server ka current version. Warna conflict. Isko <strong>optimistic concurrency</strong> kehte hain: pehle se lock nahi lagate, bas likhte waqt check karte hain.<br><strong>Kyun chahiye:</strong> offline device pe lock lagana namumkin hai (wo server se baat hi nahi kar sakta), lekin likhte waqt check hamesha ho sakta hai.<br><strong>Iske bina:</strong> jo baad mein pahuncha wo chupchaap pehle wale ka kaam mita deta.<br><strong>Conflicted copy:</strong> Dropbox ki help docs ke mutabik jab do log same file edit karein, ya ek offline edit kare aur doosra online, to Dropbox ek <strong>conflicted copy</strong> banata hai: naam mein edit karne wale ka naam, "conflicted copy" aur date hoti hai, aur baad mein save hua version wahi copy banta hai.` },
    { type: 'p', html: `Khud try karo. Pehle "Demo" buttons dabao, phir apne sequence banao (Online/Offline aur Edit):` },
    { type: 'custom', render(el) {
      /*SIM*/
      const NM = { L: 'Riya', P: 'Aman' };
      const init = () => ({ rev: 1, by: 'Riya', files: ['report.docx'], dev: { L: { on: true, base: 1, dirty: false }, P: { on: true, base: 1, dirty: false } }, log: ['Dono ke paas report.docx rev 1. Sab sync.'] });
      const other = d => (d === 'L' ? 'P' : 'L');
      const sync = (S, d) => {
        const v = S.dev[d];
        if (!v.on) return;
        if (v.dirty) {
          if (v.base === S.rev) {
            S.rev++; S.by = NM[d]; v.base = S.rev; v.dirty = false;
            S.log.push(`${NM[d]} ka commit (base rev ${S.rev - 1}) → server pe naya rev ${S.rev}.`);
            const o = S.dev[other(d)];
            if (o.on && !o.dirty) { o.base = S.rev; S.log.push(`${NM[other(d)]} online tha: notification → rev ${S.rev} download.`); }
          } else {
            const name = `report (${NM[d]}'s conflicted copy 2026-10-04).docx`;
            S.files.push(name);
            S.log.push(`CONFLICT: ${NM[d]} ka edit rev ${v.base} pe based tha, server ab rev ${S.rev} pe hai. Kisi ka kaam overwrite nahi hua: ${NM[d]} ka version "${name}" ban gaya.`);
            v.base = S.rev; v.dirty = false;
          }
        } else if (v.base < S.rev) {
          v.base = S.rev; S.log.push(`${NM[d]} ne cursor se rev ${S.rev} liya.`);
        }
      };
      const act = (S, a, d) => {
        const v = S.dev[d];
        if (a === 'edit') { v.dirty = true; S.log.push(`${NM[d]} ne edit kiya${v.on ? '' : ' (offline, local)'}.`); sync(S, d); }
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
          <button type="button" class="btn small primary" data-p="conf">Demo: dono offline edit</button>
          <button type="button" class="btn small" data-p="seq">Demo: ek ke baad ek</button>
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
    { type: 'p', html: `Demo 1 mein Aman ka commit pehle pahuncha (base rev 1 = server rev 1, accept). Riya ka edit bhi rev 1 pe based tha, lekin server ab rev 2 pe tha, to conflict: Riya ka kaam alag file ban gaya, kuch overwrite nahi hua. Demo 2 mein dono online the, har edit turant sync hua aur doosre ne naya version le liya, to conflict hua hi nahi. Conflict tabhi hota hai jab do edits ek hi base pe bane hon.` },

    { type: 'h3', text: 'Files hi nahi, folders bhi: Dropbox ne sync engine kyun dobara likha' },
    { type: 'p', html: `Dropbox ka March 2020 ka post "Rewriting the heart of our sync engine" batata hai ki unhone ~4 saal laga ke desktop sync engine shuru se dobara likha, codename <strong>Nucleus</strong>, aur purane ko "Sync Engine Classic" kaha. Kyun? Sabse badi wajah <strong>data model</strong> thi. Kuch examples jo post mein hain:` },
    { type: 'list', items: [
      `<strong>Move = delete + add:</strong> Classic mein file move do alag operations the. Network ke hiccup se delete pahunch gaya aur add nahi, to user ko file baaki devices se gayab dikhti, jabki usne sirf move kiya tha.`,
      `<strong>Stable ID nahi:</strong> files ki koi aisi pehchaan nahi thi jo move ke baad bhi wahi rahe. Model sharing se pehle ki duniya ke liye bana tha.`,
      `<strong>Folder cycles:</strong> Alberto offline "Archives" ko "January" mein le gaya, Beatrice ne "Drafts" ko "Archives" mein. Dono seedhe apply karo to folders ka gol chakkar (cycle) ban jaata. Classic directories ko duplicate karke merge karta tha; Nucleus original folders rakhta hai aur result is pe depend karta hai ki kiska move pehle upload hua.`,
    ]},
    { type: 'p', html: `Nucleus mein kya badla (post ke mutabik): code <strong>Rust</strong> mein; lagbhag saara logic ek hi "control thread" pe jo inputs aur scheduling fix hon to <strong>deterministic</strong> hai, isliye unhone ek <strong>seed</strong> se random file states aur schedules bana ke roz lakhon simulated scenarios test kiye, aur bug mile to wahi seed se dobara reproduce; client-server protocol <strong>strongly consistent</strong>; shared folders aur files ke globally unique IDs; aur folder moves atomic, chahe andar kitni bhi files hon.` },
    { type: 'callout', tone: 'why', title: 'Interview depth: lesson kya hai?', html: `File sync ek distributed system hai jisme har client lambe time tak "partitioned" reh sakta hai. Isliye: (1) har file/folder ko stable unique ID do, path ko nahi; (2) operations atomic rakho (move ek operation, do nahi); (3) server ka journal source of truth, clients cursor se catch up karein; (4) conflicts pe data kabhi mat girao, copy banao; (5) aisa design banao jise seed-based simulation se test kar sako.` },

    { type: 'h2', text: 'Deep dive 4: versions aur sharing' },
    { type: 'h3', text: 'Version history' },
    { type: 'p', html: `Journal append-only hai, to har commit ek version hai. Restore = purana blocklist naye version ki tarah commit karna (blocks pehle se hain, 0 upload; upar widget mein "Version 1 restore" dabake dekha). Lekin hamesha ke liye sab rakhna mehnga hai, isliye retention limit hoti hai:` },
    { type: 'list', items: [
      `<strong>Dropbox</strong> (help docs): plan ke hisaab se 30 din (Basic, Plus, Family), 180 din (Professional, Business jaise plans), ya 365 din (Advanced, Enterprise jaise plans).`,
      `<strong>Google Drive</strong> (Drive API docs): non-Google files ke purane revisions aam taur pe 30 din, aur 100 revisions ke baad pehle bhi hat sakte hain; kisi revision ko "Keep forever" mark kar sakte ho (max 200 per file).`,
      `Jab koi version kisi block ko refer nahi karta, tab wo block delete kiya ja sakta hai. Iske liye har block ka <strong>reference count</strong> ya periodic mark-and-sweep <strong>garbage collection</strong> chahiye: ye aam industry approach hai, aur galti hui to data loss, isliye bahut dheere aur safety checks ke saath chalta hai.`,
    ]},
    { type: 'h3', text: 'Sharing aur permissions' },
    { type: 'p', html: `Dropbox ke model mein shared folder ek <strong>namespace</strong> hai jo kai users ke root mein mount hota hai. Share karne pe file copy nahi hoti: Aman ke root mein bas ek "mount" judta hai, aur dono ka journal wahi namespace hai. Google Drive mein har file/folder pe <strong>permissions</strong> hoti hain: role (owner, writer, commenter, reader; shared drives mein organizer/fileOrganizer bhi) aur type (user, group, domain, anyone). Folder ka access andar ki files ko milta hai (inheritance).` },
    { type: 'flow', title: 'Shared folder: share, access check, revoke', height: 320,
      nodes: [
        { id: 'r', label: 'Riya', sub: 'owner', x: 80, y: 90, w: 110, kind: 'client', info: 'Ye kya hai: Riya ka device; wo folder "Trip" ki owner hai. Aman ko editor access deti hai.' },
        { id: 'api', label: 'Metaserver', sub: 'share + ACL check', x: 290, y: 160, w: 160, kind: 'server', info: 'Ye kya hai: metadata server, jo sharing aur permissions bhi sambhalta hai. Har list/commit pe check: is user ka is namespace pe kaunsa role hai? Share hone pe Aman ke root mein namespace mount karta hai aur notification bhejta hai.' },
        { id: 'acl', label: 'ACL + mounts', sub: 'metadata DB', x: 290, y: 280, w: 160, kind: 'data', info: 'Ye kya hai: metadata DB ki permission (ACL = access control list) aur mount tables. namespace "Trip" → {Riya: owner, Aman: editor}; Aman ke root mein /Trip pe mount. Permissions bahut baar padhe jaate hain, isliye cache hote hain, lekin revoke pe cache turant invalidate.' },
        { id: 'blk', label: 'Block server', sub: 'access check', x: 530, y: 160, w: 150, kind: 'server', info: 'Ye kya hai: blocks dene wala server. Block dene se pehle pakka karta hai ki user ko kisi aisi file ke through access hai jisme ye block hai. Sirf hash jaan lena kaafi nahi.' },
        { id: 'a', label: 'Aman', sub: 'editor', x: 80, y: 262, w: 110, kind: 'client', info: 'Ye kya hai: Aman ka sync engine (uska laptop). Share hone ke baad /Trip uske folder mein aa jaata hai.' },
        { id: 'x', label: 'Stranger', sub: 'koi access nahi', x: 640, y: 280, w: 130, kind: 'threat', info: 'Ye kya hai: ek anjaan insaan jiske paas koi access nahi. Kisi ne kahin se ek block ka hash jaan liya aur seedha block server se maang raha hai.' },
      ],
      edges: [{ a: 'r', b: 'api' }, { a: 'api', b: 'acl' }, { a: 'a', b: 'api' }, { a: 'api', b: 'blk' }, { a: 'a', b: 'blk' }, { a: 'x', b: 'blk' }],
      scenarios: [
        { name: 'Share karo', steps: [
          { title: 'Riya share karti hai', text: 'Aman ko editor role.', go: 'r>api', msg: 'share(ns="Trip", user="aman", role="editor")' },
          { title: 'ACL + mount', text: 'Koi file copy nahi. ACL mein ek entry, aur Aman ke root mein mount.', go: ['api>acl', 'res:acl>api'], after: { acl: { sub: 'Aman: editor' } } },
          { title: 'Aman sync karta hai', text: 'Aman ke device ko notification, wo naye namespace ka journal list karta hai aur blocks laata hai. Block server har block pe access check karta hai.', go: ['evt:api>a', 'a>api', 'res:api>a', 'a>blk', 'res:blk>a'], after: { a: { state: 'ok', sub: '/Trip synced' } } },
        ]},
        { name: 'Bina access ke', steps: [
          { title: 'Hash se seedha maangna', text: 'Stranger ek block hash ke saath block server se data maangta hai.', go: 'x>blk', msg: 'retrieve_batch [h7]' },
          { title: 'ACL check fail', text: 'Block server metaserver se poochhta hai: kya is user ka kisi aise namespace pe access hai jisme h7 wali file hai? Nahi.', go: ['blk>api', 'api>acl', 'res:acl>api', 'res:api>blk'] },
          { title: '403', text: 'Ek byte bhi nahi. Content-addressing ka matlab "hash pata hai to data milega" nahi hona chahiye.', go: 'bad:blk>x', after: { x: { state: 'down', sub: '403 Forbidden' } } },
        ]},
        { name: 'Access hatao', steps: [
          { title: 'Riya revoke karti hai', text: 'Aman ka access hataya.', go: ['r>api', 'api>acl'], after: { acl: { sub: 'Aman: removed' } } },
          { title: 'Aage ke sab requests fail', text: 'Aman ka agla list ya block request permission check pe rukta hai. Uske sync engine ko batate hain ki namespace unmount karo, aur folder uske devices se hat jaata hai.', go: ['a>api', 'bad:api>a'], after: { a: { state: 'warn', sub: 'unmounted' } } },
          { title: 'Sach: jo download ho chuka, wo uske paas', text: 'Revoke aage ka access rokta hai. Jo copy Aman ne pehle hi kahin aur save kar li, use wapas nahi la sakte. Isliye sensitive data pe "view only" aur download band karne jaise controls alag se aate hain.', focus: ['a'] },
        ]},
      ],
    },
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `"Public link = file public folder mein copy." Nahi. Share link ek <strong>capability</strong> hai: ek lamba, guess na ho sakne wala token jo ek file/folder aur ek role ki taraf ishaara karta hai. Link hatao (revoke) to token bekaar. Isliye link ke saath expiry, password aur "sirf meri company" jaise options aate hain.` },

    { type: 'h2', text: 'Failure scenarios aur bottlenecks' },
    { type: 'table', head: ['Kya toota', 'Asar', 'Bachav'], rows: [
      ['Upload beech mein', 'Adhoori file?', 'Blocks pehle, commit baad mein: commit nahi hua to file dikhti hi nahi. Retry pe sirf missing blocks'],
      ['Notification kho gaya', 'Device peeche reh gaya', 'Cursor: agli baar journal se sab changes. Long-poll timeout pe client khud reconnect'],
      ['Lakhon clients ek saath reconnect', 'Notify servers pe toofan', 'Random jitter aur server ka backoff signal (Dropbox longpoll API mein dono)'],
      ['Do offline edits', 'Ek ka kaam overwrite?', 'Base revision check; conflict pe conflicted copy, data loss kabhi nahi'],
      ['Move ke beech crash', 'File gayab ya duplicate', 'Stable IDs + atomic move (Nucleus ka sabak)'],
      ['Corrupt block / disk fail', 'File kharab', 'Hash se verify (hash match nahi to block kharab), replicas + erasure coding, kai zones'],
      ['Bahut bada shared folder (lakhon files, hazaaron members)', 'Ek namespace ka journal hot', 'Namespace ke hisaab se shard; hot namespaces pe caching aur rate limits; ye aam approach hai'],
      ['Galti se GC ne zinda block mita diya', 'Permanent data loss', 'Refcount + delay ke saath delete, pehle soft-delete; GC sabse dheere aur sabse zyada checks wala code'],
    ]},

    { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>Block size:</strong> chhote blocks = edit pe kam upload aur zyada dedupe, lekin zyada hashes, zyada metadata rows, zyada requests. Dropbox ne 4 MB chuna. Inserts zyada hon to content-defined chunking.<br><strong>Notification:</strong> desktop/web pe long poll ya WebSocket; mobile pe OS push; server-to-server pe webhooks. Har case mein asli data cursor se.<br><strong>Conflict:</strong> binary files → conflicted copy; text/structured docs jahan live collaboration chahiye → operational transform / CRDT (Google Docs lesson).` },
    { type: 'h2', text: 'Interview mein kaise bolein' },
    { type: 'list', ordered: true, items: [
      `<strong>Requirements:</strong> upload/download, multi-device sync, offline, versions, sharing. NFR: durability #1, bandwidth efficiency, eventual consistency across devices.`,
      `<strong>Core idea:</strong> metadata vs blobs alag. File = blocklist of content hashes (Dropbox: 4 MB, SHA-256). Blocks immutable, content-addressed, dedupe.`,
      `<strong>Write path:</strong> commit(blocklist) → need_blocks → upload missing → commit again → journal row (atomic).`,
      `<strong>Read path:</strong> notification (long poll / push) sirf ishaara; client cursor se journal list karta hai, sirf missing blocks laata hai.`,
      `<strong>Conflicts:</strong> base revision check (optimistic concurrency) → conflicted copy.`,
      `<strong>Versions:</strong> append-only journal; restore = purana blocklist; retention + GC.`,
      `<strong>Sharing:</strong> namespaces/ACLs, har metadata aur block request pe permission check.`,
    ]},
    { type: 'diagram', title: 'Poora design, ek nazar mein', height: 510,
      caption: 'Baayein: devices aur unke sync engines. Beech mein: teen servers (metadata, notification, blocks). Daayein: metadata ke tables aur bytes ki almari. Buttons se ek ek raasta dekho.',
      groups: [
        { label: 'Devices', x: 10, y: 24, w: 160, h: 470 },
        { label: 'Services', x: 220, y: 24, w: 160, h: 470 },
        { label: 'Data', x: 460, y: 24, w: 250, h: 470 },
      ],
      nodes: [
        { id: 'lap', label: 'Riya laptop', sub: 'sync engine', x: 90, y: 100, kind: 'client', info: 'Ye kya hai: Riya ke laptop ka sync engine. Badli file ko 4 MB blocks mein todta hai, hashes nikaalta hai, pehle commit, phir sirf missing blocks upload.' },
        { id: 'ph', label: 'Riya phone', sub: 'cursor: JID', x: 90, y: 260, kind: 'client', info: 'Ye kya hai: Riya ke phone ka sync engine. Notification pe apne cursor ke saath "kya badla?" poochhta hai, phir sirf woh blocks laata hai jo uske paas nahi.' },
        { id: 'am', label: 'Aman laptop', sub: 'shared folder', x: 90, y: 420, kind: 'client', info: 'Ye kya hai: Aman ka device. Shared folder "Trip" uske root mein mount hai. Offline edit karke wapas aaye to conflict ho sakta hai.' },
        { id: 'meta', label: 'Metaserver', sub: 'commit, list, ACL', x: 300, y: 100, kind: 'server', info: 'Ye kya hai: files ki kitaab sambhalne wala server. Commit pe base revision aur permission check, missing blocks batata hai, journal mein nayi row likhta hai.' },
        { id: 'ntf', label: 'Notify server', sub: 'long poll', x: 300, y: 260, kind: 'queue', info: 'Ye kya hai: idle devices ki khuli long-poll requests. Namespace mein commit hote hi bas "changes: true" bhejta hai. Data nahi, sirf ishaara.' },
        { id: 'blk', label: 'Block server', sub: 'hash → bytes', x: 300, y: 420, kind: 'server', info: 'Ye kya hai: sirf blocks lene-dene wala server. Har download se pehle check karta hai ki user ko us block wali kisi file ka access hai.' },
        { id: 'jr', label: 'File journal', sub: 'versions, JIDs', x: 585, y: 70, kind: 'data', info: 'Ye kya hai: append-only metadata table (Dropbox: Server File Journal). Har row = ek file ka ek version: namespace, path, blocklist, JID. Source of truth.' },
        { id: 'acl', label: 'ACL + mounts', sub: 'kisko access', x: 585, y: 180, kind: 'data', info: 'Ye kya hai: permissions aur shared folders ki table: namespace → users aur roles, aur kis user ke root mein kahan mount. Cache hoti hai, revoke pe turant invalidate.' },
        { id: 'idx', label: 'Block index', sub: 'hash → kahan', x: 585, y: 330, kind: 'data', info: 'Ye kya hai: har block hash kis storage bucket mein rakha hai, uska index. Dropbox ne iske liye sharded MySQL chuna (Magic Pocket, 2016).' },
        { id: 'st', label: 'Block storage', sub: 'immutable blocks', x: 585, y: 440, kind: 'data', info: 'Ye kya hai: bytes ki almari. Har block ek baar likha, kabhi badla nahi, naam = hash. Replication + erasure coding, kai zones. Dropbox: Magic Pocket; aam: S3/GCS.' },
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
        { name: 'Upload file', text: 'Laptop commit(blocklist) bhejta hai → server "need_blocks" → sirf missing blocks block server se storage mein → dobara commit → journal mein nayi row (atomic).', go: ['lap>meta>jr', 'lap>blk>st', 'blk>idx'] },
        { name: 'Sync to other device', text: 'Commit hote hi notify server phone ki khuli long-poll ka jawab deta hai → phone cursor ke saath list karta hai → sirf missing blocks download.', go: ['meta>ntf>ph', 'ph>meta>jr', 'ph>blk>st'] },
        { name: 'Conflict', text: 'Riya ka commit pehle pahuncha (rev 2). Aman ka offline edit rev 1 pe based tha: base ≠ current, to server use "conflicted copy" ke naam se save karta hai. Kisi ka kaam nahi mitta.', go: ['lap>meta>jr', 'am>meta>jr'] },
        { name: 'Share', text: 'Riya share karti hai → ACL mein entry + Aman ke root mein mount → Aman ko notification → Aman ke block requests pe har baar access check.', go: ['lap>meta>acl', 'meta>ntf>am', 'am>blk>acl'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>File = blocks ki list. Har block (Dropbox: 4 MB) ka naam uska SHA-256 hash. Sirf badle blocks upload hote hain.</li>
      <li>Same hash = same bytes, to block ek hi baar store hota hai (dedupe), aur versions sasti padti hain.</li>
      <li>Metadata (journal, ACL) SQL mein, strongly consistent. Bytes immutable blocks ke roop mein object/block storage mein.</li>
      <li>Write: commit → need_blocks → upload missing → commit again. Commit hi wo pal hai jab nayi version "exist" karti hai (atomic).</li>
      <li>Doosre devices: notification (long poll / push) sirf ishaara; asli changes cursor ke saath journal se. Notification khoye to kuch nahi khota.</li>
      <li>Conflict: base revision check (optimistic concurrency); match na ho to conflicted copy. Data kabhi nahi girta.</li>
      <li>Sharing: shared folder = namespace jo kai users ke root mein mount; har metadata aur block request pe permission check.</li>
      <li>Stable IDs aur atomic moves (Dropbox Nucleus ka sabak); GC sabse dheere aur sabse zyada checks ke saath.</li>
    </ul>` },

    { type: 'tradeoffs', gains: [
      'Sirf badle blocks: bandwidth aur time dono kam',
      'Content hashes: dedupe, integrity check, sasti version history',
      'Metadata aur blobs alag: har ek ko apni tarah scale karo',
      'Atomic commit: koi device adhoori file nahi dekhta',
      'Cursor + journal: notification khoye to bhi kuch nahi khota',
      'Conflicted copy: kisi ka kaam kabhi gayab nahi',
      'Long poll: bekaar requests kam, khabar lagbhag turant',
    ], costs: [
      'Client side complexity bahut (Dropbox ko engine dobara likhna pada)',
      'Fixed blocks pe beech mein insert se bahut blocks naye',
      'Har request pe permission check: metadata DB pe load, caching aur invalidation mushkil',
      'Garbage collection risky: galti = data loss',
      'Conflicted copies user ko khud merge karni padti hain',
      'Users ke beech dedupe se privacy ka risk',
      'Crores khule long-poll connections: notify servers ki memory',
    ]},

    { type: 'think', questions: [
      { q: 'Ek 10 GB ki video file ke beech mein 1 second ka hissa trim kiya gaya. Fixed 4 MB blocks pe kya hoga, aur kaise behtar karoge?', a: 'Trim ke baad ke saare bytes khisak gaye, to us point ke baad ke lagbhag saare blocks naye hash denge: GBs dobara upload. Content-defined chunking (rolling hash se boundaries) se boundaries content ke saath chalti hain, to sirf trim ke aas paas ke chunks badlenge. Waise video jaisi compressed files mein chhota edit bhi aksar bahut bytes badal deta hai, to bachat file type pe depend karti hai.' },
      { q: 'Riya ke 3 devices hain aur 1 crore users ke average 2 devices online hain. Long polling ka server side kharcha kya hai, aur kya optimise karoge?', a: '2 crore khule connections: memory aur file descriptors bahut. Ek connection per device, saare namespaces ek hi long poll mein (har namespace ke liye alag nahi). Timeout lamba rakho aur jitter do taaki reconnect ka toofan na aaye. Mobile pe app background mein ho to connection ki jagah OS push. Notify servers stateless jaisa rakho: kaun kis namespace ko sun raha hai uska registry alag (realtime lesson ka gateway + registry pattern).' },
      { q: 'Conflict tab kyun nahi hota jab Riya laptop pe edit kare aur 1 minute baad Aman (online) edit kare?', a: 'Riya ka commit turant server pe gaya, Aman ke device ko notification se naya version mil gaya, to Aman ka edit naye base pe bana. Conflict sirf tab jab do edits ek hi purane base pe bane hon (offline ya bilkul ek saath).' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Dropbox ke 2014 design mein metadata DB (Server File Journal) mein file ka kya hota tha?', options: ['Poori file ke bytes', 'Blocklist (block hashes ki list) aur path, journal id', 'Sirf file ka naam'], answer: 1, explain: 'Bytes block server/storage mein; SFJ mein sirf namespace, path, blocklist aur JID. Metadata vs blobs ka alag hona hi core idea hai.' },
      { q: 'Commit pe server "need_blocks [h2x]" kyun lautata hai?', options: ['h2x corrupt hai', 'Baaki hashes server pe pehle se hain, sirf h2x missing hai', 'User ke paas permission nahi'], answer: 1, explain: 'Content hashes se server bata deta hai kaunse blocks naye hain. Sirf wahi upload hote hain.' },
      { q: 'Phone 2 din offline tha aur saare notifications miss ho gaye. Wapas aake changes kaise milenge?', options: ['Nahi milenge, full resync', 'Apne cursor (aakhri journal id) ke saath list call: uske baad ke saare changes', 'Notification server sab store karta hai'], answer: 1, explain: 'Notification sirf ishaara hai. Journal source of truth hai aur cursor bookmark.' },
      { q: 'Do devices ne offline ek hi base version pe edit kiya. Dropbox kya karta hai?', options: ['Last write wins', 'Dono edits ko line by line merge', 'Ek version original naam pe, doosra "conflicted copy" naam se'], answer: 2, explain: 'Binary files merge nahi ho sakti aur data loss mana hai, isliye dono versions rakhe jaate hain.' },
      { q: '2 crore devices har 5 second polling karein vs long polling. Long polling ka sabse bada fayda aur keemat?', options: ['Fayda: kam storage; keemat: zyada CPU', 'Fayda: kai guna kam bekaar requests aur lagbhag turant khabar; keemat: crores connections hamesha khule', 'Koi farak nahi'], answer: 1, explain: 'Widget ke default pe polling 40 lakh requests/sec (0.28% kaam ki) aur long poll ~2.78 lakh/sec. Badle mein notify servers ko 2 crore khule connections sambhalne padte hain.' },
      { q: 'Purana version restore karne pe kitna data upload hota hai (blocks abhi bhi stored hain)?', options: ['Poori file', 'Lagbhag kuch nahi: purana blocklist dobara commit', 'Aadhi file'], answer: 1, explain: 'Blocks immutable aur content-addressed hain, to restore bas metadata ka kaam hai.' },
    ]},
    { type: 'sources', note: 'Dropbox ke posts alag alag saalon ke hain; 2014 ka protocol tab ka hai, aur 2020 mein sync engine (Nucleus) dobara likha gaya. Details aaj alag ho sakti hain.', items: [
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
