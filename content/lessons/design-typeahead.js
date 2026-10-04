(function () {
  /* ---------- pure helpers (exported as _test for the verification script) ---------- */
  // Ek fixed typing session: 'crik' galti, do backspace, phir 'icket live score'. Seeded gaps.
  const TA_KEYS = (() => {
    const seq = 'crik<<icket live score';
    let s = 1234; const rnd = () => (s = s * 16807 % 2147483647) / 2147483647;
    const out = []; let t = 0, txt = '';
    for (let i = 0; i < seq.length; i++) {
      const ch = seq[i];
      let gap = i === 0 ? 0 : 90 + Math.round(rnd() * 110);
      if (seq[i - 1] === ' ') gap += 450;
      if (ch === '<' && seq[i - 1] !== '<') gap += 350;
      t += gap;
      txt = ch === '<' ? txt.slice(0, -1) : txt + ch;
      out.push({ t, key: ch === '<' ? '⌫' : (ch === ' ' ? '␣' : ch), text: txt });
    }
    return out;
  })();
  // Debounce: request tabhi jaati hai jab `wait` ms tak koi naya key na aaye.
  function taSim(wait, minLen, useCache) {
    const K = TA_KEYS, reqs = [], seen = new Set();
    let hits = 0;
    for (let i = 0; i < K.length; i++) {
      const next = K[i + 1];
      const fire = K[i].t + wait;
      if (wait > 0 && next && next.t < fire) continue;
      const q = K[i].text.trim();
      if (q.length < minLen) continue;
      if (useCache && seen.has(q)) { hits++; continue; }
      seen.add(q);
      reqs.push({ t: fire, q });
    }
    return { reqs, hits, keys: K.length, dur: K[K.length - 1].t };
  }
  // Prefix "cr" ke 4 queries, pichhle 7 din ke counts (index 6 = aaj).
  const TA_Q = [
    ['cricket', [1000, 1000, 1000, 1000, 1000, 1000, 1000]],
    ['cricket live score', [300, 300, 320, 350, 400, 1500, 2600]],
    ['crime patrol', [900, 900, 850, 850, 800, 800, 780]],
    ['crypto news', [700, 1400, 700, 650, 600, 600, 600]],
  ];
  function taScore(hl) {
    return TA_Q.map(([q, c]) => ({ q, s: c.reduce((a, n, i) => a + n * Math.pow(0.5, (6 - i) / hl), 0) }))
      .sort((a, b) => b.s - a.s);
  }

  // Live trie: queries + counts. Har node apne subtree ka top-k rakhta hai. Tie pe alphabetical.
  const TA_TRIE = [['cricket', 900], ['crime patrol', 700], ['cricket live score', 650], ['car games', 600], ['cat videos', 550],
    ['crypto news', 500], ['crash course', 400], ['cricbuzz', 350], ['camera tips', 300], ['crystal maze', 200]];
  function taBuild(list, k) {
    const root = { kids: {}, end: null, top: [] }; let nodes = 1;
    list.forEach(([q, c]) => { let n = root; for (const ch of q) { if (!n.kids[ch]) { n.kids[ch] = { kids: {}, end: null, top: [] }; nodes++; } n = n.kids[ch]; } n.end = [q, c]; });
    const cmp = (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1);
    const fill = n => { let all = n.end ? [n.end] : []; Object.values(n.kids).forEach(c => { all = all.concat(fill(c)); }); n.top = all.sort(cmp).slice(0, k); return n.top; };
    fill(root);
    return { root, nodes };
  }
  function taWalk(t, prefix) { const path = []; let n = t.root; for (const ch of prefix) { n = n.kids[ch]; if (!n) return { path, found: false }; path.push(n); } return { path, found: true }; }
  // Ek query ke count badhne pe us query ke kitne prefix nodes ki top-k list badli?
  function taChanged(list, k, q, delta) {
    const before = taBuild(list, k), after = taBuild(list.map(([x, c]) => [x, x === q ? c + delta : c]), k);
    const ch = [];
    for (let i = 1; i <= q.length; i++) { const p = q.slice(0, i); const a = taWalk(before, p).path.pop(), b = taWalk(after, p).path.pop();
      if (JSON.stringify(a.top.map(x => x[0])) !== JSON.stringify(b.top.map(x => x[0]))) ch.push(p); }
    return ch;
  }

  // Sharding: "maan lo" traffic. Pehle letter ka weight (s, c, p sabse common), doosre letter ka weight.
  const TA_W1 = { a: 6, b: 6, c: 9, d: 6, e: 4, f: 4, g: 3, h: 4, i: 4, j: 1, k: 2, l: 3, m: 6, n: 2, o: 3, p: 8, q: 0.5, r: 5, s: 11, t: 6, u: 2, v: 2, w: 3, x: 0.2, y: 1, z: 0.5 };
  const TA_W2 = { a: 8, b: 1, c: 2, d: 1, e: 8, f: 1, g: 1, h: 4, i: 6, j: 0.2, k: 1, l: 4, m: 2, n: 3, o: 7, p: 2, q: 0.1, r: 5, s: 2, t: 3, u: 3, v: 1, w: 1, x: 0.2, y: 1, z: 0.2 };
  const TA_AB = 'abcdefghijklmnopqrstuvwxyz'.split('');
  function taHash(str) { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; }
  // mode: 'range' = alphabet ko barabar letters wale tukdon mein; 'hash' = pehle 2 letters ka hash
  function taShard(n, mode) {
    const load = new Array(n).fill(0); let tot = 0;
    TA_AB.forEach((a, i) => TA_AB.forEach(b => {
      const t = TA_W1[a] * TA_W2[b]; tot += t;
      const sh = mode === 'range' ? Math.min(n - 1, Math.floor(i * n / 26)) : taHash(a + b) % n;
      load[sh] += t;
    }));
    return load.map(x => x / tot);
  }
  function taRangeName(n, k) { const a = Math.ceil(k * 26 / n), b = Math.ceil((k + 1) * 26 / n) - 1; return TA_AB[a] + '-' + TA_AB[b]; }

  Lesson.register({
    id: 'design-typeahead',
    title: 'Search autocomplete',
    minutes: 32,
    summary: `xyz.com ke search box mein "cri" type karte hi "cricket live score" dikh jaana chahiye, har keystroke pe, palak jhapakne se pehle. Zero se banayenge: prefix kya hai, trie kya hai, har node pe top-k kyun, query logs se offline rebuild, debouncing, browser/CDN caching, personalisation, filtering aur trie ki sharding.`,
    _test: { TA_KEYS, taSim, taScore, TA_TRIE, taBuild, taWalk, taChanged, taShard, taRangeName },
    blocks: [
      { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Tum YouTube ya Google pe "cri" likhte ho, aur turant neeche "cricket live score" aa jaata hai.<br>Har letter pe tumhara phone server se poochhta hai: "jo sawaal 'cri' se shuru hote hain, unme sabse popular kaunse hain?"<br>Crores log, har letter pe, ek saath poochh rahe hain. Aur jawab 0.1 second ke andar chahiye, warna tum aage type kar chuke hoge.<br>Is lesson ki do tricks: <strong>jawab pehle se tayyar rakho</strong> (server ko sochna na pade), aur <strong>kam se kam poochho</strong> (har letter pe nahi, sirf jab ruko).` },
      { type: 'callout', tone: 'tip', title: 'Pehle khud try karo', html: `10 minute kaagaz pe socho: crores users, har user har keystroke pe server ko poochh raha hai "is prefix ke liye kya suggest karun?" Jawab kahan se laoge, kitni jaldi, aur "kal ka trending topic" aaj kaise aayega? Phir yahan compare karo.` },
      { type: 'p', html: `Search lesson (<a href="#/search">Search aur Elasticsearch</a>) mein humne trie ka idea dekha tha. Yahan hum use zero se dobara samjhenge, phir poora system banayenge: data kahan se aata hai, kaun banata hai, kaun serve karta hai, aur network pe kitni requests jaati hain. Ye un systems mein se hai jahan <strong>speed hi product hai</strong>: late suggestion = bekaar suggestion.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Typeahead / autocomplete', html: `<strong>Ye kya hai:</strong> tum type kar rahe ho aur box ke neeche poore sawaal ke <strong>suggestions</strong> aate jaate hain. "Typeahead" aur "autocomplete" ek hi cheez ke do naam hain.<br><strong>Kyun chahiye:</strong> typing kam, spelling ki galtiyaan kam, aur user ko idea milta hai ki log kya dhoondh rahe hain.<br><strong>Iske bina:</strong> user ko poora "cricket live score" khud type karna padta, phone pe ye dheema aur galtiyon bhara hai.` },
      { type: 'callout', tone: 'term', title: 'Naye words: prefix, keystroke, query', html: `<strong>Keystroke:</strong> ek key dabana. "cri" likhne mein 3 keystrokes.<br><strong>Query:</strong> wo poora sawaal jo user search karta hai, jaise "cricket live score".<br><strong>Prefix:</strong> kisi word ki <em>shuruaat</em>. "c", "cr", "cri" teeno "cricket" ke prefix hain. Autocomplete ka poora kaam ek line mein: <em>prefix do, us prefix se shuru hone wali sabse popular queries lo.</em>` },
      { type: 'callout', tone: 'term', title: 'Naya word: latency (aur latency budget)', html: `<strong>Ye kya hai:</strong> request bhejne se jawab aane tak ka time. <strong>Budget</strong> = kitna time humein kul milta hai, jise hum network, server, cache mein baant-te hain.<br><strong>Kyun chahiye:</strong> roadmap kehta hai har keystroke pe ~50 ms ke aas-paas jawab. User ~150-200 ms mein agla letter daba deta hai; usse late aaya suggestion purane prefix ka hai.<br><strong>Iske bina:</strong> suggestions "atakte" hain, galat prefix ke dikhte hain, aur feature bekaar lagta hai.<br><strong>Example:</strong> Facebook ne 2010 mein likha ki unke typeahead mein 100 ms se zyada lage to suggestions typing se peeche reh jaate the. (Post purani hai, lekin latency budget ka idea aaj bhi wahi hai.)` },

      { type: 'h2', text: 'Step 1: requirements' },
      { type: 'compare',
        left: { title: 'Functional', html: `• Har prefix pe top 5 query suggestions (jaise "cri" → "cricket live score")<br>• Popular queries upar, ranking logon ki asli searches se<br>• Trending cheezein jaldi dikhein (match aaj hai, to aaj)<br>• Gande / illegal suggestions kabhi na dikhein<br>• (Nice to have) language, location aur user ke hisaab se thoda alag<br><br><strong>Out of scope:</strong> asli search results page, spelling correction` },
        right: { title: 'Non-functional', html: `• Keystroke se suggestion tak &lt; ~100 ms, server ke andar ~10-20 ms (roadmap ka target: ~50 ms)<br>• Bahut zyada QPS: har search pe kai keystrokes<br>• High availability: autocomplete kabhi pura gayab na ho<br>• Thoda purana data chalega (eventual consistency OK): suggestions ghante bhar purane chalenge, trending ko minutes` },
      },
      { type: 'callout', tone: 'term', title: 'Naye words: QPS, read-heavy, eventual consistency', html: `<strong>QPS</strong> (queries per second): har second server pe kitni requests aati hain.<br><strong>Read-heavy:</strong> system mein padhna (read) likhne (write) se kahin zyada hai. Yahan har keystroke ek read hai; naya data likhna ghante mein ek baar.<br><strong>Eventual consistency:</strong> naya data sab jagah turant nahi pahunchta, thodi der mein pahunch jaata hai. Yahan iska matlab: aaj subah ka trending search kuch minute ya ghante baad suggestion banega, aur ye theek hai.` },
      { type: 'callout', tone: 'why', title: 'Sabse important insight', html: `Ye system <strong>read-heavy</strong> hai aur reads ko <strong>bilkul fresh data nahi chahiye</strong>. Isliye hum mehnga kaam (ginti, ranking) <em>offline</em> (yaani user ki request ke raaste se bahar, background mein, pehle se) kar lenge, aur online path pe sirf "lookup karo, lauta do" bachega. Poora design isi ek idea pe khada hai.` },
      { type: 'h2', text: 'Step 2: napkin maths' },
      { type: 'p', html: `xyz.com ke real numbers humein nahi pata, to "maan lo" wale numbers se chalte hain. Do sawaal: (1) har second kitni requests aayengi? (2) saare suggestions rakhne ke liye kitni memory chahiye? "Prefix table" ka matlab yahan: har prefix ke saamne uski top suggestions ki list (aage Step 4 mein detail). Values badlo aur dekho design pe kya asar padta hai:` },
      { type: 'custom', render(el) {
        el.innerHTML = `<div class="row2">
            <div><label>Daily active users (millions)</label><input class="ta-n-u" type="number" value="50" min="1" step="1"></div>
            <div><label>Searches per user per day</label><input class="ta-n-s" type="number" value="5" min="1" step="1"></div>
            <div><label>Keystrokes per search</label><input class="ta-n-k" type="number" value="12" min="1" step="1"></div>
            <div><label>Keystrokes jo request bante hain (%) <span class="ta-n-pv"></span></label><input class="ta-n-p" type="range" min="5" max="100" step="5" value="25"></div>
            <div><label>Alag popular queries (millions)</label><input class="ta-n-q" type="number" value="10" min="1" step="1"></div>
            <div><label>Average query length (chars)</label><input class="ta-n-l" type="number" value="20" min="3" step="1"></div>
          </div>
          <div class="stats">
            <div class="stat"><span>Keystrokes/sec (avg)</span><strong class="ta-n-o1"></strong></div>
            <div class="stat"><span>Requests/sec (avg)</span><strong class="ta-n-o2"></strong></div>
            <div class="stat"><span>Requests/sec (peak ×3)</span><strong class="ta-n-o3"></strong></div>
            <div class="stat"><span>Prefix table, worst case</span><strong class="ta-n-o4"></strong></div>
          </div>
          <div class="calc-note ta-n-note"></div>`;
        const q = c => el.querySelector(c);
        const f = n => n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : Math.round(n).toString();
        const upd = () => {
          const v = c => Math.max(0, Number(q(c).value) || 0);
          const ks = v('.ta-n-u') * 1e6 * v('.ta-n-s') * v('.ta-n-k') / 1e5;
          const p = v('.ta-n-p') / 100;
          const prefixes = v('.ta-n-q') * 1e6 * v('.ta-n-l');
          const gb = prefixes * 100 / 1e9;
          q('.ta-n-pv').textContent = Math.round(p * 100) + '%';
          q('.ta-n-o1').textContent = f(ks) + '/s';
          q('.ta-n-o2').textContent = f(ks * p) + '/s';
          q('.ta-n-o3').textContent = f(ks * p * 3) + '/s';
          q('.ta-n-o4').textContent = gb.toFixed(0) + ' GB';
          q('.ta-n-note').textContent = `Ek din ≈ 10^5 seconds. Prefix table: har query ke har prefix ki ek entry (${f(prefixes)} tak), har entry ~100 bytes (prefix + 5 suggestion IDs + overhead). Asli number kaafi kam hoga kyunki "cri" jaise prefixes hazaaron queries mein share hote hain. Phir bhi itna data ek bade server ki RAM mein fit ho jaata hai: isliye "poora index memory mein rakho" practical hai.`;
        };
        el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
      }},
      { type: 'p', html: `Default values pe: ~30k keystrokes/sec, aur agar sirf 25% keystrokes request banein (debouncing aur caching se, aage dekhenge) to ~7.5k requests/sec average, ~22k peak. Do conclusions: (1) har request pe database query karna mehnga hoga, data RAM mein chahiye; (2) client side pe requests kam karna (debounce) seedha server ka bill kam karta hai.` },

      { type: 'h2', text: 'Step 3: API aur data' },
      { type: 'code', text: `
GET /suggest?q=cri&lang=hi&region=IN
  →  200 OK
     Cache-Control: public, max-age=300
     { "q": "cri",
       "suggestions": ["cricket live score", "cricket", "crime patrol",
                       "cricket highlights", "crime news"] }` },
      { type: 'p', html: `Ye ek simple HTTP GET hai: browser prefix bhejta hai (<code>q=cri</code>), saath mein language aur region, aur 5 suggestions wapas aate hain.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Cache-Control: max-age', html: `<strong>Ye kya hai:</strong> response ke saath ek header (chhota label) jo kehta hai "is jawab ko itne seconds tak copy karke rakh sakte ho". <code>public, max-age=300</code> = koi bhi (browser, CDN) ise 5 minute tak rakh ke dobara de sakta hai.<br><strong>Kyun chahiye:</strong> "cr" ka jawab sabke liye same hai. Ek baar bana, phir 5 minute tak hazaaron logon ko copy se mil jaaye, server tak aaye hi nahi.<br><strong>Iske bina:</strong> har keystroke seedha hamare servers pe, load kai guna.` },
      { type: 'p', html: `Do tarah ka data hai, aur dono ka kaam bilkul alag hai:` },
      { type: 'table', head: ['Data', 'Kya hai', 'Kaun likhta hai', 'Kaun padhta hai'], rows: [
        ['<strong>Query log</strong>', 'Har search ka record: query, time, language, region (user ID aksar hata ke)', 'Search service, har search pe ek event', 'Sirf offline build job'],
        ['<strong>Suggestion index</strong>', 'prefix → top-k queries (ranked list)', 'Sirf offline build job', 'Suggest service, har keystroke pe'],
      ]},
      { type: 'callout', tone: 'term', title: 'Naya word: Query log', html: `<strong>Ye kya hai:</strong> logon ne jo kuch search kiya uski lambi diary. Har search = ek line (event): kya search kiya, kab, kis language mein.<br><strong>Kyun chahiye:</strong> suggestions yahin se aate hain. Google ne 2020 ki apni post mein bataya ki unke predictions asli searches pe based hote hain, common aur trending dono.<br><strong>Iske bina:</strong> pata hi nahi ki log kya dhoondhte hain; suggestions haath se likhne padenge.<br>Logs aam taur pe <a href="#/kafka">Kafka</a> jaise event stream mein jaate hain (ek lambi, kabhi na mitne wali line jahan events jud-te jaate hain), aur wahan se object storage (S3 jaisi sasti, badi file storage) mein.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Top-k', html: `<strong>Ye kya hai:</strong> kisi list ke sabse upar wale <strong>k</strong> items. Yahan k = 5.<br><strong>Kyun chahiye:</strong> "c" se shuru hone wali lakhon queries hain, lekin screen pe sirf 5 dikhti hain. Humein sirf best 5 chahiye.<br><strong>Iske bina:</strong> saari lakhon queries bhejo aur browser khud chhante: bekaar network aur time.` },
      { type: 'h2', text: 'Step 4: core idea, prefix se top-k jaldi kaise?' },
      { type: 'h3', text: 'Pehli koshish: database query' },
      { type: 'code', text: `SELECT query FROM query_counts
WHERE query LIKE 'cri%'
ORDER BY count DESC LIMIT 5;` },
      { type: 'p', html: `Chhote data pe chal jaayega. Lekin 10M queries pe: index se "cri" wali saari rows mil jaati hain (shayad lakhon), phir unhe count se sort karna padta hai. Prefix jitna chhota ("c"), utni zyada rows. Aur ye har keystroke pe, ~20k baar per second. Database ka CPU khatam, latency 100 ms ke paar. <strong>Har request pe ranking dobara calculate karna hi galti hai.</strong>` },
      { type: 'h3', text: 'Doosri koshish: trie' },
      { type: 'p', html: `Socho ek moti dictionary. "cri" dhoondhna ho to tum poori kitaab nahi padhte: pehle "C" wala hissa kholte ho, usme "Cr" wale panne, phir "Cri". Har letter ke saath dhoondhne ki jagah chhoti hoti jaati hai. Trie isi idea ko computer ki memory mein banata hai.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Trie (prefix tree)', html: `<strong>Ye kya hai:</strong> ek tree (ped jaisa data structure) jisme har kadam ek letter hai. Root se "c", phir "r", phir "i" chalo: jis node (gaanth) pe pahunche, uske neeche ki saari queries "cri" se shuru hoti hain. "cricket" aur "crime" ka "cri" wala hissa ek hi baar store hota hai, dono share karte hain.<br><strong>Kyun chahiye:</strong> prefix tak pahunchne mein sirf utne kadam jitne letters (3 letters = 3 kadam), chahe crores queries hon.<br><strong>Iske bina:</strong> har baar lakhon rows mein se "cri..." wali chhantni padti (upar wali DB koshish).<br>Naam "re<strong>trie</strong>val" se aaya hai. Detail ke liye <a href="#/search">Search lesson</a> ka trie widget bhi chala sakte ho.` },
      { type: 'p', html: `Prefix tak pahunchna ab fast hai. Lekin ek problem bachi: "cri" ke node tak pahunch gaye, ab top 5 kaun? Uske liye ab bhi poore subtree (us node ke neeche ka saara hissa) ko ghoom ke sab queries ke counts dekhne padenge aur sort karna padega. "c" ka subtree crores nodes ka hai. Har keystroke pe ye phir se dheema.` },
      { type: 'h3', text: 'Asli trick: har node pe top-k pehle se rakh do' },
      { type: 'p', html: `Offline build ke time har node pe uske subtree ki top 5 queries ki list <strong>save</strong> kar do. Ab lookup = prefix ke characters jitne steps chalo, wahan rakhi list utha lo. Ranking ka saara kaam pehle ho chuka.` },
      { type: 'ascii', text: `
            (root)
              │ c
            [c]  top: cricket, crime patrol, cricket live score, crypto news, ...
              │ r
            [cr] top: cricket, crime patrol, cricket live score, crypto news, ...
           ┌──┴───────┐
         i │          │ y
     [cri] top:     [cry] top: crypto news, crying meme, ...
     cricket,
     crime patrol,
     cricket live score, ...

  lookup("cri") = 3 steps + list read.  Kitni bhi queries hon, cost wahi.`, caption: 'Har node apne subtree ki top-k list pehle se rakhta hai' },
      { type: 'p', html: `Keemat: memory zyada (har node pe 5 entries) aur update mehnga (ek query ka count badla to uske saare prefix nodes ki lists badal sakti hain). Lekin humne pehle hi tay kiya tha: suggestions ko second-by-second fresh hona zaroori nahi. To updates ko <strong>batch</strong> mein, offline, ghante ya din mein ek baar karo. Ye trade bilkul sahi baithta hai.` },
      { type: 'p', html: `Khud banao aur dekho. Neeche 10 queries ka chhota trie hai (har query ke saath "kitni baar search hui", maan lo wale numbers). Har node pe top 3 pehle se rakhe hain. Prefix type karo aur dekho lookup kitne kadam ka hai. Phir kisi query ki searches badhao aur dekho <strong>kitne nodes ki list badalni padi</strong>: yahi update ki keemat hai.` },
      { type: 'custom', render(el) {
        el.innerHTML = `<div class="row2">
            <div><label>Prefix type karo</label><input class="ta-t-in" type="text" value="cri" maxlength="20" autocomplete="off"></div>
            <div><label>Searches badhao</label><div style="display:flex;gap:6px;flex-wrap:wrap"><select class="ta-t-q" style="flex:1;min-width:140px"></select><select class="ta-t-d"><option>100</option><option selected>300</option><option>600</option></select><button class="btn small primary ta-t-go" type="button">+ searches</button><button class="btn small ghost ta-t-rs" type="button">Reset</button></div></div>
          </div>
          <div class="ta-t-path" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>
          <div class="calc-note ta-t-kids"></div>
          <div class="stats">
            <div class="stat"><span>Lookup ke kadam</span><strong class="ta-t-s1"></strong></div>
            <div class="stat"><span>Trie ke nodes</span><strong class="ta-t-s2"></strong></div>
            <div class="stat"><span>Pichhle update ne badli lists</span><strong class="ta-t-s3">0</strong></div>
          </div>
          <div class="calc-note ta-t-note"></div>`;
        const q = c => el.querySelector(c);
        let list = TA_TRIE.map(x => x.slice()), last = null;
        q('.ta-t-q').innerHTML = TA_TRIE.map(x => `<option>${x[0]}</option>`).join('');
        const card = (label, top, on, changed) => `<div style="border:1px solid ${on ? 'var(--accent)' : 'var(--line-2)'};background:${changed ? 'var(--accent-soft)' : 'var(--surface)'};border-radius:var(--r-sm);padding:6px 8px;min-width:130px;flex:1 1 130px;max-width:220px">
            <div style="font-family:var(--f-mono);font-weight:700">${label}</div>
            ${top.map(([x, c]) => `<div style="font-size:12px;color:var(--ink-2)">${x} <span style="color:var(--ink-3)">${c}</span></div>`).join('')}</div>`;
        const draw = () => {
          const t = taBuild(list, 3), pre = q('.ta-t-in').value.toLowerCase();
          const w = taWalk(t, pre), chg = new Set(last ? last.ch : []);
          let html = card('(root)', t.root.top, !pre, false);
          w.path.forEach((n, i) => { const pp = pre.slice(0, i + 1); html += card('"' + pp + '"', n.top, i === w.path.length - 1, chg.has(pp)); });
          if (!w.found) html += `<div style="align-self:center;color:var(--red)">"${pre.slice(0, w.path.length + 1)}" pe raasta khatam: koi suggestion nahi</div>`;
          q('.ta-t-path').innerHTML = html;
          const end = w.found ? (w.path.length ? w.path[w.path.length - 1] : t.root) : null;
          q('.ta-t-kids').textContent = end ? 'Agle possible letters: ' + (Object.keys(end.kids).map(c => c === ' ' ? '␣' : c).join(' ') || '(koi nahi, query yahin khatam)') : '';
          q('.ta-t-s1').textContent = w.path.length + (w.found ? '' : ' (miss)');
          q('.ta-t-s2').textContent = t.nodes;
          q('.ta-t-s3').textContent = last ? last.ch.length : 0;
          q('.ta-t-note').textContent = last ? `"${last.q}" ko +${last.d} searches mili. Badli lists: ${last.ch.length ? last.ch.map(x => '"' + x + '"').join(', ') : 'koi nahi (top 3 mein farak nahi pada)'}. Live system mein ye har search pe hota, isliye hum ise offline batch mein karte hain.` : 'Har node ke card mein us prefix ki top 3 pehle se likhi hai. Lookup = bas utne kadam jitne letters, phir list padh lo. Koi sorting nahi.';
        };
        q('.ta-t-in').addEventListener('input', () => { last = null; draw(); });
        q('.ta-t-go').addEventListener('click', () => {
          const qq = q('.ta-t-q').value, d = Number(q('.ta-t-d').value);
          last = { q: qq, d, ch: taChanged(list, 3, qq, d) };
          list = list.map(([x, c]) => [x, x === qq ? c + d : c]);
          q('.ta-t-in').value = qq.slice(0, 3); draw();
        });
        q('.ta-t-rs').addEventListener('click', () => { list = TA_TRIE.map(x => x.slice()); last = null; q('.ta-t-in').value = 'cri'; draw(); });
        draw();
      }},
      { type: 'p', html: `Try karo: "crash course" ko +300 do (400 → 700). "c" aur "cr" ki lists badal gayi, kyunki wahan wo top 3 mein aa gaya. +100 do to koi list nahi badalti. Aur "cricket live score" ko +300 do (650 → 950): wo "cricket" (900) se upar nikal jaata hai, to "c" se "cricket" tak <strong>7 nodes</strong> ki lists badalni padti hain. Ek search, 7 writes. Isliye ye kaam har search pe live nahi karte.` },
      { type: 'compare',
        left: { title: 'Trie (in-memory)', html: `• Prefix sharing se memory bachti hai<br>• Ek hi structure mein prefix walk + top-k<br>• Custom server chahiye jo trie RAM mein rakhe<br>• Production mein aksar iska compact (kam memory wala) roop: FST (finite state transducer), jo prefix ke saath word ke <em>end</em> bhi share karta hai. Elasticsearch ka completion suggester isi tarah ka in-memory structure use karta hai.` },
        right: { title: 'Flat prefix table (KV)', html: `• Har prefix ek key: <code>"cri" → [list]</code><br>• Redis / koi KV store (key-value store: ek bada dictionary jo key do to value lauta de) seedha serve kar deta hai<br>• Memory zyada (har prefix poora string)<br>• Bahut simple: build job keys likhe, server bas GET kare. Interview mein ye bhi bilkul valid answer hai.` },
      },
      { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Trie mein har keystroke pe count++ kar denge." Nahi! Har search pe us query ke <em>har</em> prefix node ki top-k list update karni padegi, 20k writes/sec pe, aur saath mein reads bhi. Locks aur contention ka jhagda shuru. Serving path <strong>read-only</strong> rakho; counting alag offline pipeline mein.` },
      { type: 'h2', text: 'Step 5: high-level design, serving path' },
      { type: 'p', html: `System ke do hisse hain jo kabhi ek doosre ka wait nahi karte: <strong>serving path</strong> (har keystroke pe jawab dena, milliseconds mein) aur <strong>build path</strong> (logs se naya trie banana, offline, ghanton mein). Pehle serving path ko zero se banate hain, ek problem ek solution:` },
      { type: 'steps', items: [
        { t: 'v0: ek server + database', d: 'Har keystroke pe upar wali SQL query. Chhote data pe chalta hai, crores queries pe database ka CPU khatam. Problem: har request pe ranking.' },
        { t: 'v1: trie RAM mein', d: 'Ek server jiski memory (RAM) mein poora trie, har node pe top-k. Lookup ~1 ms. Problem: ek server ~20k requests/sec nahi sambhaal sakta, aur wo gire to sab gaya.' },
        { t: 'v2: kai copies + load balancer', d: 'Trie ki kai copies (replicas) alag machines pe, aage ek load balancer jo requests baant de. Problem: phir bhi har keystroke network pe aa raha hai.' },
        { t: 'v3: browser debounce + cache', d: 'Browser har letter pe nahi, ruk ke poochhta hai, aur pehle mile jawab yaad rakhta hai. Requests ~80% kam (Deep dive 1 mein numbers).' },
        { t: 'v4: CDN edge', d: '"c", "cr" jaise chhote prefixes sabke liye same hain: unka jawab user ke shehar ke paas CDN pe rakh do. Zyadatar traffic hamare servers tak aata hi nahi.' },
      ]},
      { type: 'callout', tone: 'term', title: 'Naya word: CDN edge', html: `<strong>Ye kya hai:</strong> CDN (Content Delivery Network) = desh bhar ke shehron mein rakhe hue cache servers ka network. "Edge" = tumhare sabse paas wala server. (<a href="#/cdn">CDN lesson</a>)<br><strong>Kyun chahiye:</strong> "cr" ka jawab Delhi ke 10 lakh logon ke liye same hai. Edge ek baar hamare server se le, phir 5 minute tak sabko khud de.<br><strong>Iske bina:</strong> har request door hamare data center tak, zyada latency aur kai guna servers.` },
      { type: 'callout', tone: 'term', title: 'Naye words: stateless service, load balancer, replica', html: `<strong>Stateless service:</strong> aisa server jo apne paas koi user-specific yaad nahi rakhta. Koi bhi request kisi bhi copy pe ja sakti hai.<br><strong>Load balancer (LB):</strong> aage khada traffic police jo requests ko saare servers mein baant-ta hai (<a href="#/load-balancer">LB lesson</a>).<br><strong>Replica:</strong> same data ki doosri copy, doosri machine pe. Ek gire to doosri jawab de. Hamara trie read-only hai (serving ke time koi usme likhta nahi), isliye copies hamesha same rehti hain: koi sync ka jhagda nahi.<br><strong>Shard:</strong> data ka ek hissa. Trie ek machine mein na samaaye to use hisson mein baant-te hain, har hissa alag machine pe (Deep dive 3 mein detail).` },
      { type: 'p', html: `Ab poora serving path chala ke dekho. Har scenario chalao, aur kisi bhi box pe click karke uska kaam padho:` },
      { type: 'flow', title: 'Serving path: keystroke se suggestions tak', height: 330,
        nodes: [
          { id: 'c', label: 'Browser / app', sub: 'debounce + cache', x: 80, y: 165, w: 136, kind: 'client', info: 'Ye kya hai: tumhare browser/app mein search box ka code. Har keystroke pe turant request nahi bhejta: thoda rukta hai (debounce), aur jo prefixes pehle maange the unke jawab memory mein rakhta hai. Facebook ne 2010 mein bataya tha ki unka browser search box pe focus hote hi user ke friends, pages, groups pehle hi mangwa ke cache kar leta tha, taaki kai suggestions bina server ke aa jaayein.' },
          { id: 'cdn', label: 'CDN edge', sub: 'short prefixes', x: 250, y: 165, w: 124, kind: 'edge', info: 'Ye kya hai: user ke shehar ke paas wala CDN cache server. "c", "cr", "cri" jaise chhote prefixes karodon log type karte hain aur sabko (same language/region mein) same jawab milta hai, to inhe kuch minute cache karna bahut sasta hai. Personal suggestions yahan cache nahi hote.' },
          { id: 'api', label: 'Suggest service', sub: 'stateless, behind LB', x: 430, y: 165, w: 156, kind: 'server', info: 'Ye kya hai: Load Balancer ke peeche stateless servers, jo browser ki request lete hain. Request ko sahi trie shard tak bhejte hain, timeout lagaate hain (jaise 20 ms), blocklist ka last-second filter lagaate hain, aur zarurat ho to user ke recent searches ke saath result blend karte hain.' },
          { id: 't1', label: 'Trie shard', sub: 'in RAM, read-only', x: 628, y: 80, w: 136, kind: 'cache', info: 'Ye kya hai: ek machine jiski RAM mein poora trie (ya uska ek hissa, shard) rakha hai, har node pe top-k ke saath. Read-only: sirf lookup, koi write nahi. Naya version offline build se aata hai aur ek jhatke mein swap hota hai.' },
          { id: 't2', label: 'Trie replica', sub: 'same data', x: 628, y: 250, w: 136, kind: 'cache', info: 'Ye kya hai: same trie ki doosri copy, doosri machine pe. Read-only data ko replicate karna aasaan hai (koi consistency jhagda nahi), to replicas se load bhi bant-ta hai aur ek machine girne pe bhi service chalti hai.' },
        ],
        edges: [{ a: 'c', b: 'cdn' }, { a: 'cdn', b: 'api' }, { a: 'api', b: 't1' }, { a: 'api', b: 't2', id: 'at2' }],
        scenarios: [
          { name: 'Chhota prefix (CDN hit)', intro: 'User ne "cr" type kiya. Ye prefix aaj lakhon log type kar chuke hain.', steps: [
            { title: 'Debounce ke baad request', text: 'User ne thoda ruk ke "cr" pe pause kiya, to browser ne request bheji.', go: 'c>cdn', msg: 'GET /suggest?q=cr&lang=hi&region=IN' },
            { title: 'CDN pe HIT', text: 'Ye exact URL kuch second pehle kisi aur ne maanga tha, CDN ke paas copy hai (max-age=300). Hamare servers tak request pahunchi hi nahi.', go: 'res:cdn>c', set: { api: { state: 'dim' }, t1: { state: 'dim' }, t2: { state: 'dim' } }, after: { cdn: { state: 'hit', sub: 'HIT' } }, msg: '200 OK  (from edge, ~10 ms)\n["cricket","crime patrol","cricket live score",...]' },
          ]},
          { name: 'Lamba prefix (trie)', steps: [
            { title: 'Rare prefix', text: '"cricket li" kam log type karte hain, CDN pe nahi mila.', go: ['c>cdn', 'cdn>api'], after: { cdn: { state: 'miss', sub: 'MISS' } }, msg: 'GET /suggest?q=cricket%20li&lang=hi&region=IN' },
            { title: 'Trie lookup', text: 'Suggest service ne shard se poochha. Shard ne 10 characters ka walk kiya aur wahan rakhi top-5 list lauta di. Koi sorting nahi, koi DB nahi: ~1 ms.', go: ['api>t1', 'res:t1>api'], after: { t1: { state: 'hit' } }, msg: 'walk c-r-i-c-k-e-t-␣-l-i → top5 ready' },
            { title: 'Filter aur wapas', text: 'Blocklist check (koi suggestion abhi abhi ban hua ho to hata do), phir response. CDN bhi ise kuch minute ke liye rakh leta hai.', go: 'res:api>cdn>c', after: { cdn: { state: '', sub: 'stored' } }, msg: '["cricket live score","cricket live today",...]' },
          ]},
          { name: 'Backspace (browser cache)', intro: 'User ne "crik" likha, galti dikhi, backspace kiya: wapas "cri".', steps: [
            { title: 'Network ki zarurat hi nahi', text: '"cri" ke suggestions 1 second pehle aa chuke the. Browser ne apni memory se dikha diye: 0 ms network. Isliye client cache sabse sasta cache hai.', focus: ['c'], set: { cdn: { state: 'dim' }, api: { state: 'dim' }, t1: { state: 'dim' }, t2: { state: 'dim' } }, after: { c: { state: 'hit', sub: 'local HIT' } }, msg: 'cache["cri"] → ["cricket","crime patrol",...]' },
          ]},
          { name: 'Trie server down', steps: [
            { title: 'Shard gir gaya', text: 'Primary trie machine crash.', set: { t1: { state: 'down', sub: 'DOWN' } }, go: ['c>cdn', 'cdn>api', 'bad:api>t1'], msg: 'timeout after 20 ms' },
            { title: 'Replica se lo', text: 'Suggest service chhote timeout ke baad replica se poochhti hai. Data read-only hai, to replica ka jawab bilkul same hai.', go: ['api>t2', 'res:t2>api', 'res:api>cdn>c'], after: { t2: { state: 'ok', sub: 'serving' } } },
            { title: 'Dono down ho to?', text: 'Khaali list lauta do. Search box phir bhi chalta hai, user poori query type karke Enter daba sakta hai. Autocomplete ek "nice to have" feature hai: iske girne se search nahi girna chahiye. Isse <strong>graceful degradation</strong> kehte hain.', set: { t2: { state: 'down', sub: 'DOWN' } }, go: 'res:api>cdn>c', msg: '200 OK  { "suggestions": [] }' },
          ]},
        ],
      },
      { type: 'h2', text: 'Step 6: build path, logs se naya trie' },
      { type: 'p', html: `Ab offline hissa. Sawaal: trie ke andar ke counts aur top-k lists aati kahan se hain, aur roz naye kaise hote hain? Jawab ek pipeline (kaam ki line) hai: "query logs → ginti → ranking → trie → servers". Public posts mein companies iske internal tools ka poora naam-pata nahi batatin; neeche jo dikh raha hai wo industry ka aam tareeka hai. Pehle iske hisse samjho:` },
      { type: 'callout', tone: 'term', title: 'Naye words: batch job, stream job', html: `<strong>Batch job:</strong> ek program jo bahut saara jama data ek saath padhta hai (jaise pichhle 7 din ke saare logs), ginti karta hai, aur khatam ho jaata hai. Har ghante ya har raat chalta hai. Spark jaise tools isi ke liye hain.<br><strong>Stream job:</strong> ek program jo hamesha chalta rehta hai aur events ko aate hi ginta hai, chhote time windows (jaise 15 minute) mein.<br><strong>Kyun dono:</strong> batch dheema hai lekin poora aur saaf hisaab deta hai. Stream tez hai lekin sirf taaza minutes dekhta hai. Batch akela = aaj ka trending kal dikhega. Stream akela = mehnga aur purani history nahi.` },
      { type: 'callout', tone: 'term', title: 'Naye words: snapshot, atomic swap, rollback', html: `<strong>Snapshot:</strong> ek poora bana hua trie, ek file mein, version number ke saath (jaise v2041). Kabhi badalta nahi.<br><strong>Atomic swap:</strong> server naya trie background mein memory mein load karta hai, aur taiyaar hone pe ek hi jhatke mein "ab naya use karo" kar deta hai. Beech ka koi aadha-adhoora pal nahi.<br><strong>Rollback:</strong> naya version kharab nikla to purane version pe wapas jaana.<br><strong>Iske bina:</strong> live trie ko jagah jagah edit karte, to kuch der tak aadhe purane aadhe naye suggestions, aur galti hone pe wapas jaane ka raasta nahi.` },
      { type: 'flow', title: 'Build path: query logs se naya index', height: 330,
        nodes: [
          { id: 's', label: 'Search service', sub: 'har search', x: 80, y: 70, w: 136, kind: 'server', info: 'Ye kya hai: xyz.com ki asli search service. Jab user Enter dabata hai (ya suggestion pe click karta hai), search service ek event likhti hai: query, time, language, region. Autocomplete ko yahi raw material chahiye.' },
          { id: 'k', label: 'Query logs', sub: 'Kafka → S3', x: 80, y: 260, w: 136, kind: 'queue', info: 'Ye kya hai: har search ki diary. Events ka stream (Kafka jaisa) jo object storage (S3 jaisa) mein bhi jama hota hai. Batch job pichhle kai din ka data yahan se padhta hai, stream job sirf taaza minutes ka.' },
          { id: 'st', label: 'Trend stream', sub: 'last 15 min', x: 290, y: 70, w: 136, kind: 'server', info: 'Ye kya hai: ek hamesha chalne wala stream job jo chhote time windows (jaise 15 minute) mein counts ginta hai aur achanak spike (jaise "ipl final") pakadta hai. Iska output ek chhota "trending overlay" hai, poora trie nahi.' },
          { id: 'b', label: 'Batch job', sub: 'count + rank', x: 290, y: 260, w: 136, kind: 'server', info: 'Ye kya hai: Spark jaisa batch job, har ghante ya har din. Queries ko normalize karta hai (lowercase, extra spaces hatao), ginta hai, time-decay lagata hai, aur har prefix ki top-k list banata hai.' },
          { id: 'f', label: 'Filter + check', sub: 'blocklist, sanity', x: 470, y: 260, w: 136, kind: 'threat', info: 'Ye kya hai: publish se pehle ka checkpoint. Do kaam. (1) Policy filter: gaali, hinsa, personal info, illegal cheezein hatao. (2) Sanity check: naya index purane se bahut alag to nahi (size achanak aadha? top prefixes ki lists poori badal gayi?). Fail ho to publish mat karo.' },
          { id: 'o', label: 'Snapshots', sub: 'versioned files', x: 640, y: 260, w: 120, kind: 'data', info: 'Ye kya hai: object storage (S3 jaisa) mein rakhi trie files. Har build ek versioned file (jaise v2041) object storage mein. Kuch gadbad ho to purane version pe rollback bas ek pointer badalna hai.' },
          { id: 't', label: 'Trie servers', sub: 'load + swap', x: 640, y: 70, w: 120, kind: 'cache', info: 'Ye kya hai: wahi serving machines (trie shards/replicas). Naya snapshot background mein RAM mein load hota hai jabki purana serve kar raha hai. Load poora hone pe ek atomic pointer swap: agli request naye trie se. Users ko koi downtime nahi dikhta.' },
        ],
        edges: [{ a: 's', b: 'k' }, { a: 'k', b: 'b' }, { a: 'b', b: 'f' }, { a: 'f', b: 'o' }, { a: 'o', b: 't' }, { a: 'k', b: 'st', id: 'kst' }, { a: 'st', b: 't', id: 'stt' }],
        scenarios: [
          { name: 'Roz ka rebuild', steps: [
            { title: 'Searches log hoti hain', text: 'Din bhar har search ek event banti hai.', flood: { paths: ['evt:s>k'], n: 6 }, msg: '{ q: "cricket live score", t: 1730000000, lang: "hi", region: "IN" }' },
            { title: 'Batch job ginti karta hai', text: 'Pichhle kuch din ke logs padhe, normalize kiye, gine. Purane din ke counts ka weight kam (time decay), taaki purani popular cheezein hamesha upar na chipki rahein.', go: 'evt:k>b', msg: 'cricket live score → score 4514\ncricket → 3885 ...' },
            { title: 'Filter aur sanity check', text: 'Blocklist lagaayi, naye index ka size aur top prefixes purane se compare kiye. Sab theek.', go: 'b>f', after: { f: { state: 'ok', sub: 'passed' } } },
            { title: 'Naya snapshot', text: 'Versioned file publish.', go: 'f>o', after: { o: { sub: 'v2041 ready' } }, msg: 'PUT s3://xyz-suggest/v2041.trie' },
            { title: 'Load aur atomic swap', text: 'Trie servers ne v2041 background mein load kiya, phir ek pointer swap. Purana v2040 kuch der rakha, rollback ke liye.', go: 'o>t', after: { t: { state: 'ok', sub: 'serving v2041' } } },
          ]},
          { name: 'Kharab build', intro: 'Kisi bot ne raat bhar ek gandi query lakhon baar search ki, ya job mein bug aa gaya.', steps: [
            { title: 'Ajeeb counts', text: 'Batch job ne ek nayi query ko "c" prefix ke top pe pahuncha diya.', go: ['evt:k>b', 'b>f'], after: { b: { state: 'warn', sub: 'odd spike' } } },
            { title: 'Check fail', text: 'Sanity check ne pakda: top prefixes ki lists bahut badal gayi, aur ek entry blocklist pattern se match hui. Build reject, alert gaya.', set: { f: { state: 'down', sub: 'REJECTED' } }, focus: ['f'] },
            { title: 'Users ko kuch pata nahi', text: 'Snapshot publish hi nahi hua, servers kal ka v2041 serve karte rahe. Bura suggestion dikhane se behtar hai ek din purane suggestions dikhana.', set: { o: { state: 'dim' } }, after: { t: { state: 'ok', sub: 'still v2041' } } },
          ]},
          { name: 'Trending spike', intro: 'IPL final shuru hua. Roz ka batch kal raat chala tha, usme ye abhi nahi hai.', steps: [
            { title: 'Stream job spike pakadta hai', text: '15 minute mein "ipl final live" ki searches 50 guna badh gayi.', go: 'evt:k>st', after: { st: { state: 'hot', sub: 'spike!' } } },
            { title: 'Chhota overlay', text: 'Stream job sirf kuch hazaar trending queries ki chhoti list trie servers ko bhejta hai. Servers result banate waqt is overlay ko main list ke saath mila dete hain. Poora trie rebuild nahi hua.', go: 'evt:st>t', after: { t: { state: 'hot', sub: 'main + trending' } } },
            { title: 'Raat ko normal', text: 'Agla batch rebuild is query ko apne aap gin lega; overlay ki zarurat khatam. Do raaste: ek dheema par poora (batch), ek tez par chhota (stream). Is combo ko aksar <strong>Lambda architecture</strong> bhi kehte hain.', focus: ['b', 'st'] },
          ]},
        ],
      },
      { type: 'h2', text: 'Deep dive 1: debouncing, sabse sasti request wo jo bheji hi nahi' },
      { type: 'p', html: `Problem: tez typist ek second mein 5-8 keys dabata hai. Har key pe request = jitne characters utni requests, aur unme se zyadatar ke jawab user dekhta bhi nahi (wo agla character type kar chuka hota hai). Ye server pe bekaar load hai.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Debounce', html: `<strong>Ye kya hai:</strong> "ruko, jab tak user typing band na kare". Har keystroke pe ek timer (jaise 200 ms) dobara shuru hota hai. Timer poora chal gaya, matlab user ruka, tab request bhejo. Jaldi jaldi type karne pe beech ki requests kabhi jaati hi nahi.<br><strong>Kyun chahiye:</strong> beech wale prefixes ("cric", "crick") ke jawab user dekhta hi nahi, wo aage nikal chuka hota hai.<br><strong>Iske bina:</strong> har letter ek request: server ka load aur bill kai guna, bina kisi fayde ke.<br><br><strong>Throttle</strong> thoda alag hai: "zyada se zyada har 200 ms mein ek request", chahe user ruke ya nahi. Twitter ki open-source typeahead.js library (2013) mein remote requests ke liye dono option the, aur default wait 300 ms tha.` },
      { type: 'p', html: `Khud type karke dekho. Upar wale box mein jo marzi likho; neeche ek fixed typing session ki timeline hai (galti, do backspace, phir "cricket live score"):` },
      { type: 'custom', render(el) {
        el.innerHTML = `<div class="row2">
            <div><label>Debounce wait: <strong class="ta-d-wv"></strong></label><input class="ta-d-w" type="range" min="0" max="600" step="50" value="200"></div>
            <div><label style="display:flex;gap:8px;align-items:center"><input class="ta-d-c" type="checkbox" checked style="width:auto"> Browser cache (same prefix dobara mat maango)</label>
              <label style="display:flex;gap:8px;align-items:center"><input class="ta-d-m" type="checkbox" style="width:auto"> Kam se kam 2 characters ke baad hi maango</label></div>
          </div>
          <label>Khud type karo (live count)</label>
          <input class="ta-d-in" type="text" placeholder="yahan type karo..." autocomplete="off">
          <div class="stats">
            <div class="stat"><span>Tumhare keystrokes</span><strong class="ta-d-lk">0</strong></div>
            <div class="stat"><span>Bina debounce requests</span><strong class="ta-d-l0">0</strong></div>
            <div class="stat"><span>Debounce + settings ke saath</span><strong class="ta-d-l1">0</strong></div>
          </div>
          <div style="margin-top:14px;font-weight:600">Fixed session ki timeline</div>
          <svg class="ta-d-svg" viewBox="0 0 480 130" style="width:100%;height:auto;display:block"></svg>
          <div class="stats">
            <div class="stat"><span>Keystrokes</span><strong class="ta-d-k"></strong></div>
            <div class="stat"><span>Requests</span><strong class="ta-d-r"></strong></div>
            <div class="stat"><span>Cache se bachi</span><strong class="ta-d-h"></strong></div>
            <div class="stat"><span>Extra intezaar</span><strong class="ta-d-x"></strong></div>
          </div>
          <div class="calc-note ta-d-note" style="font-family:var(--f-mono)"></div>`;
        const q = c => el.querySelector(c);
        const NS = 'http://www.w3.org/2000/svg';
        const draw = () => {
          const wait = Number(q('.ta-d-w').value), cache = q('.ta-d-c').checked, minLen = q('.ta-d-m').checked ? 2 : 1;
          q('.ta-d-wv').textContent = wait + ' ms';
          const r = taSim(wait, minLen, cache);
          const span = r.dur + 700, X = t => 20 + t / span * 440;
          const svg = q('.ta-d-svg'); svg.innerHTML = '';
          const mk = (tag, a, txt) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); if (txt != null) e.textContent = txt; svg.appendChild(e); return e; };
          mk('text', { x: 20, y: 14, 'font-size': 12, fill: 'var(--ink-3)' }, 'keystrokes');
          mk('text', { x: 20, y: 84, 'font-size': 12, fill: 'var(--ink-3)' }, 'requests');
          mk('line', { x1: 20, y1: 60, x2: 460, y2: 60, stroke: 'var(--line-2)' });
          TA_KEYS.forEach(k => {
            mk('line', { x1: X(k.t), y1: 22, x2: X(k.t), y2: 46, stroke: 'var(--ink-3)' });
            mk('text', { x: X(k.t), y: 56, 'font-size': 12, 'text-anchor': 'middle', fill: 'var(--ink-2)', 'font-family': 'var(--f-mono)' }, k.key);
          });
          r.reqs.forEach(x => mk('circle', { cx: X(x.t), cy: 100, r: 6, fill: 'var(--accent)' }));
          mk('text', { x: 460, y: 124, 'font-size': 12, 'text-anchor': 'end', fill: 'var(--ink-3)' }, 'time → (' + (span / 1000).toFixed(1) + ' s)');
          q('.ta-d-k').textContent = r.keys;
          q('.ta-d-r').textContent = r.reqs.length;
          q('.ta-d-h').textContent = r.hits;
          q('.ta-d-x').textContent = '+' + wait + ' ms';
          q('.ta-d-note').textContent = 'Server ne ye prefixes maange: ' + (r.reqs.map(x => '"' + x.q + '"').join(', ') || '(koi nahi)');
        };
        // live typing: real timers
        let lk = 0, l0 = 0, l1 = 0, timer = null; const seen = new Set();
        q('.ta-d-in').addEventListener('input', e => {
          lk++; l0++;
          q('.ta-d-lk').textContent = lk; q('.ta-d-l0').textContent = l0;
          clearTimeout(timer);
          const wait = Number(q('.ta-d-w').value), cache = q('.ta-d-c').checked, minLen = q('.ta-d-m').checked ? 2 : 1;
          const fire = () => { const v = e.target.value.trim(); if (v.length < minLen) return; if (cache && seen.has(v)) return; seen.add(v); l1++; q('.ta-d-l1').textContent = l1; };
          if (wait === 0) fire(); else timer = setTimeout(fire, wait);
        });
        ['.ta-d-w', '.ta-d-c', '.ta-d-m'].forEach(c => q(c).addEventListener('input', draw));
        ['.ta-d-c', '.ta-d-m'].forEach(c => q(c).addEventListener('change', draw));
        draw();
      }},
      { type: 'p', html: `Fixed session mein 22 keystrokes hain. Debounce 0 aur cache band: <strong>22 requests</strong>. Sirf browser cache on karo: 17 (backspace ke baad "cri", "cr" dobara nahi maange). 150 ms debounce: 7. 200-300 ms debounce: sirf <strong>4 requests</strong>, theek un pauses pe jahan user ruka tha ("crik", "cricket", "cricket live", "cricket live score"). Matlab ~80% kam load.` },
      { type: 'p', html: `Keemat bhi dekho: har suggestion ab kam se kam "wait" ms der se aata hai. Bahut bada wait (500+ ms) aur system sust lagta hai; bahut chhota aur bachat nahi hoti. Aam taur pe 100-300 ms ke beech rakha jaata hai, aur short prefixes ke liye CDN/browser cache bachi hui latency sambhal leta hai.` },
      { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: purana jawab naye ke upar', html: `User ne "cr" ke baad "cri" type kiya. Dono requests nikal gayi, lekin network mein "cr" ka jawab <em>baad mein</em> pahuncha. Agar client bina soche jo aaye wahi dikha de, to "cri" type karne ke baad "cr" ke suggestions dikhenge. Fix: har request ke saath query (ya sequence number) yaad rakho, aur sirf usi response ko dikhao jo <strong>abhi ke text</strong> se match kare; purani in-flight request cancel kar do.` },
      { type: 'h2', text: 'Deep dive 2: caching ki teen parat' },
      { type: 'p', html: `Short prefixes ka ek khaas gun hai: unke possible values bahut kam hain (ek letter = 26, do letters = 676 Latin combos), lekin traffic sabse zyada unhi pe aata hai, kyunki har search unhi se shuru hoti hai. Ye caching ke liye sone pe suhaaga hai.` },
      { type: 'table', head: ['Layer', 'Kya cache hota hai', 'Kitni der', 'Dhyaan rakho'], rows: [
        ['<strong>Browser / app memory</strong>', 'Is session mein maange gaye prefixes ke jawab', 'Session bhar ya kuch minute', 'Backspace aur dobara type karne pe 0 ms. Facebook (2010) is layer pe user ke apne friends/pages bhi pehle hi le aata tha.'],
        ['<strong>CDN edge</strong> (<a href="#/cdn">CDN lesson</a>)', 'Non-personal jawab, URL = prefix + language + region', 'Minutes (jaise max-age=300)', 'Cache key mein language/region zaroor daalo, warna Hindi user ko Tamil suggestions. Personal results kabhi CDN pe nahi.'],
        ['<strong>Server memory</strong>', 'Poora trie / prefix table RAM mein', 'Agle build tak', 'Ye "cache" nahi, asli serving copy hai. Isliye DB ki zarurat hi nahi serving path pe.'],
      ]},
      { type: 'callout', tone: 'warn', title: 'Cache aur "turant hatao"', html: `Agar koi suggestion galat ya nuksaandeh nikla aur use abhi hatana hai, to CDN aur browsers mein uski copies max-age tak zinda reh sakti hain. Isliye TTL (copy kitni der zinda rahe) chhota rakho (minutes), CDN purge (CDN ko bolna ki copy turant mita do) ka raasta ready rakho, aur serving path pe ek chhoti "kill list" check karo jo build ka wait na kare.` },

      { type: 'h2', text: 'Deep dive 3: index bada ho jaaye to?' },
      { type: 'p', html: `Napkin maths ne bataya ki ek language ka index kuch GB ka hai, ek machine ki RAM mein aa jaata hai. To pehla aur sabse simple design: <strong>har server pe poora index</strong>, aur load ke liye bas replicas badhao. Read-only data hai, replicas sync karne ka koi jhanjhat nahi.` },
      { type: 'p', html: `Jab index ek machine se bada ho jaaye (bahut saari languages, ya per-region index), tab <a href="#/sharding">sharding</a>:` },
      { type: 'table', head: ['Shard kaise', 'Fayda', 'Problem'], rows: [
        ['Pehle letter se (a-f, g-m, ...)', 'Samajhna aasaan, ek prefix = ek shard', 'Hot shards: "s" aur "c" se shuru hone wali queries "x" se kahin zyada. Load barabar nahi.'],
        ['Pehle 2-3 characters ka hash', 'Load kaafi barabar', '"c" jaise 1-letter prefix ka jawab kis shard pe? Use alag precompute karke har shard pe (ya CDN pe) rakho.'],
        ['Language / region se', 'Natural boundary, har index chhota', 'Ek region bahut bada ho to wahan phir se upar wala sharding'],
      ]},

      { type: 'p', html: `Khud dekho ki load kitna barabar bant-ta hai. Traffic "maan lo" wala hai: jaise English mein "s", "c", "p" se shuru hone wale words bahut zyada hain, "x", "q", "z" se bahut kam. Shards ki ginti aur tareeka badlo:` },
      { type: 'custom', render(el) {
        el.innerHTML = `<div class="row2">
            <div><label>Shards: <strong class="ta-s-nv"></strong></label><input class="ta-s-n" type="range" min="2" max="8" step="1" value="4"></div>
            <div><label>Tareeka</label><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="chip on ta-s-m" data-m="range" type="button">Pehla letter (a-g, h-m...)</button><button class="chip ta-s-m" data-m="hash" type="button">Pehle 2 letters ka hash</button></div></div>
          </div>
          <div class="ta-s-bars" style="margin-top:10px"></div>
          <div class="stats">
            <div class="stat"><span>Barabar baantne pe har shard</span><strong class="ta-s-o1"></strong></div>
            <div class="stat"><span>Sabse busy shard</span><strong class="ta-s-o2"></strong></div>
            <div class="stat"><span>Busy ÷ barabar</span><strong class="ta-s-o3"></strong></div>
          </div>
          <div class="calc-note ta-s-note"></div>`;
        const q = c => el.querySelector(c);
        let mode = 'range';
        const upd = () => {
          const n = Number(q('.ta-s-n').value), l = taShard(n, mode), mx = Math.max(...l);
          q('.ta-s-nv').textContent = n;
          q('.ta-s-bars').innerHTML = l.map((x, k) => `<div style="display:flex;gap:8px;align-items:center;margin:4px 0">
              <span style="width:92px;font-family:var(--f-mono);font-size:13px">${mode === 'range' ? 'S' + (k + 1) + ' ' + taRangeName(n, k) : 'S' + (k + 1)}</span>
              <span style="flex:1;height:14px;border-radius:7px;background:var(--surface-2);overflow:hidden"><span style="display:block;height:100%;width:${(x / mx * 100).toFixed(0)}%;background:${x === mx ? 'var(--amber)' : 'var(--accent)'}"></span></span>
              <span style="width:50px;text-align:right;font-family:var(--f-mono);font-size:13px">${(x * 100).toFixed(1)}%</span></div>`).join('');
          q('.ta-s-o1').textContent = (100 / n).toFixed(1) + '%';
          q('.ta-s-o2').textContent = (mx * 100).toFixed(1) + '%';
          q('.ta-s-o3').textContent = (mx * n).toFixed(2) + '×';
          q('.ta-s-note').textContent = mode === 'range' ? 'Pehle letter se: ek prefix ka poora subtree ek hi shard pe (simple). Lekin "s" aur "c" wale shards garam, aakhri letters (u-z, x-z) wala lagbhag khaali. Sabse busy shard ke hisaab se machine leni padti hai.' : 'Hash se: "cr", "ca", "sa" alag alag shards pe bikhar jaate hain, load lagbhag barabar. Keemat: 1-letter prefix ("c") kisi ek shard pe nahi; uski list alag se bana ke har shard pe (ya CDN pe) copy karo.';
        };
        q('.ta-s-n').addEventListener('input', upd);
        el.querySelectorAll('.ta-s-m').forEach(b => b.addEventListener('click', () => { mode = b.dataset.m; el.querySelectorAll('.ta-s-m').forEach(x => x.classList.toggle('on', x === b)); upd(); }));
        upd();
      }},
      { type: 'p', html: `4 shards pe pehle-letter wala tareeka: sabse busy shard (a-g, jisme "c" aur "a", "b", "d" hain) ~37% traffic leta hai, jabki barabar hota to 25%. Yaani ~1.5 guna. 8 shards pe ye ~2.1 guna ho jaata hai (a-d wala ~26% vs 12.5%). Hash wale tareeke mein sabse busy shard sirf ~1.02-1.13 guna. Real systems aksar beech ka raasta lete hain: ranges, lekin traffic dekh ke kaati hui (jaise "c" akela ek shard, "x-z" sab milke ek), aur garam shards ke zyada replicas.` },
      { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "shard karna zaroori hai"', html: `Interview mein log seedha "trie ko 26 shards mein baant do" bol dete hain. Pehle napkin maths dekho: ek language ka index kuch GB ka hai, ek machine ki RAM mein aa jaata hai. Tab sharding nahi, sirf <strong>replicas</strong> chahiye (load ke liye). Sharding tab, jab data ek machine mein na samaaye.` },
      { type: 'h2', text: 'Deep dive 4: ranking, freshness, personalization, filtering' },
      { type: 'h3', text: 'Ranking aur freshness: time decay' },
      { type: 'p', html: `Sirf "kul kitni baar search hua" se rank karo to purani popular queries hamesha upar chipki rahengi, aur aaj ka trending match neeche. Google ne 2020 ki apni post mein likha ki unke predictions common aur trending dono queries dekhte hain, aur kisi topic mein achanak interest badhe to fresh cheez ko upar le aate hain. Simple tareeka: purane din ke count ka weight kam karo. <strong>Half-life</strong> = kitne din mein ek search ki value aadhi ho jaaye.` },
      { type: 'custom', render(el) {
        el.innerHTML = `<label>Half-life: <strong class="ta-h-v"></strong></label>
          <input class="ta-h" type="range" min="0" max="6" step="1" value="3">
          <div class="ta-h-out" style="margin-top:10px"></div>
          <div class="calc-note ta-h-note"></div>`;
        const HL = [0.5, 1, 2, 3, 7, 30, 1000];
        const q = c => el.querySelector(c);
        const upd = () => {
          const hl = HL[Number(q('.ta-h').value)];
          q('.ta-h-v').textContent = hl >= 1000 ? 'koi decay nahi (seedha 7 din ka total)' : hl + ' din';
          const r = taScore(hl), mx = r[0].s;
          q('.ta-h-out').innerHTML = r.map((x, i) => `<div style="display:flex;gap:10px;align-items:center;margin:6px 0;flex-wrap:wrap">
              <span style="width:22px;font-weight:700">${i + 1}.</span>
              <span style="min-width:150px;font-family:var(--f-mono)">${x.q}</span>
              <span style="flex:1;min-width:80px;height:12px;border-radius:6px;background:var(--surface-2);overflow:hidden"><span style="display:block;height:100%;width:${(x.s / mx * 100).toFixed(0)}%;background:${x.q === 'cricket live score' ? 'var(--amber)' : 'var(--accent)'}"></span></span>
              <span style="width:52px;text-align:right;font-family:var(--f-mono)">${Math.round(x.s)}</span></div>`).join('');
          q('.ta-h-note').textContent = 'Prefix "cr". "cricket live score" ki searches pichhle 2 din mein achanak badhi (match chal raha hai). "cricket" roz barabar 1000. Score = har din ka count × 0.5^(din purana / half-life).';
        };
        q('.ta-h').addEventListener('input', upd); upd();
      }},
      { type: 'p', html: `Slider ko chalao: half-life 3 din ya kam pe trending "cricket live score" #1 hai. 7 din ya zyada pe steady "cricket" wapas #1. Aur bilkul decay na ho to "crime patrol" bhi "cricket live score" se upar chala jaata hai. Koi ek "sahi" value nahi: news-type product chhoti half-life chahega, dictionary-type lambi. Ye ek product decision hai jo build job ka ek parameter ban jaata hai.` },
      { type: 'h3', text: 'Personalization: sabko same list nahi' },
      { type: 'p', html: `Do level hain. <strong>Group level</strong>: language aur location. Google ki 2020 post ka example: Canada mein "centre" aur US mein "center" wali spelling. Ye simple hai: alag index per language/region, aur CDN cache key mein bhi wahi. <strong>User level</strong>: tumhari apni pichhli searches. Ye CDN pe cache nahi ho sakta aur har user ka alag trie banana bahut mehenga hai.` },
      { type: 'callout', tone: 'term', title: 'Naya word: personalisation (blend)', html: `<strong>Ye kya hai:</strong> har user ko thodi alag list dikhana, uski apni pichhli searches ke hisaab se. <strong>Blend</strong> = do lists ko mila ke ek banana.<br><strong>Kyun chahiye:</strong> tum roz "crime patrol" dekhte ho, to "cri" pe wo upar dikhe to typing aur bhi kam.<br><strong>Iske bina:</strong> sabko same list; kaam chalta hai, bas thoda kam useful.<br><strong>Dhyaan:</strong> personal hissa CDN pe cache nahi ho sakta (wo sirf tumhara hai). Isliye use alag rakhte hain.` },
      { type: 'p', html: `Aam tareeka: global top-k list server/CDN se lo, user ki recent searches (chhoti list, browser ya ek per-user store mein) alag se lo, aur dono ko <strong>blend</strong> karo (jaise top 5 mein 1-2 jagah personal ke liye). LinkedIn ne 2012 mein apni open-source library <strong>Cleo</strong> ke baare mein likha jo do tarah ke typeahead chalati thi: "generic" (sabko same result, jaise companies ya skills, global popularity se) aur "network" (har member ko alag, uske 1st aur 2nd degree connections se filter karke).` },
      { type: 'p', html: `Dekho blend kaise hota hai. Global list (top 5, sabke liye same, CDN se) aur user Riya ki recent searches (sirf uske browser mein). Rule: jo personal searches prefix se match karein, unme se zyada se zyada 2 upar; baaki jagah global se, bina duplicate:` },
      { type: 'custom', render(el) {
        const HIST = ['crime patrol 2024', 'cricket live score', 'camera tips night'];
        el.innerHTML = `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><span>Prefix:</span>${['c', 'cr', 'cri', 'ca'].map((x, i) => `<button class="chip ta-p-c${i === 2 ? ' on' : ''}" data-p="${x}" type="button">${x}</button>`).join('')}
            <label style="display:flex;gap:6px;align-items:center;margin-left:8px"><input class="ta-p-on" type="checkbox" checked style="width:auto"> Personalisation on</label></div>
          <div class="row2" style="margin-top:10px"><div><div style="font-weight:600">Global (CDN se)</div><ol class="ta-p-g" style="margin:6px 0 0 18px;padding:0"></ol></div>
            <div><div style="font-weight:600">Riya ki history (browser mein)</div><ul style="margin:6px 0 0 18px;padding:0">${HIST.map(x => `<li>${x}</li>`).join('')}</ul></div></div>
          <div style="font-weight:600;margin-top:10px">Riya ko dikhega</div><ol class="ta-p-out" style="margin:6px 0 0 18px;padding:0"></ol>
          <div class="calc-note ta-p-note"></div>`;
        const q = c => el.querySelector(c), t = taBuild(TA_TRIE, 5);
        let pre = 'cri';
        const upd = () => {
          const w = taWalk(t, pre), g = w.found ? w.path[w.path.length - 1].top.map(x => x[0]) : [];
          const mine = q('.ta-p-on').checked ? HIST.filter(x => x.startsWith(pre)).slice(0, 2) : [];
          const out = mine.concat(g.filter(x => !mine.includes(x))).slice(0, 5);
          q('.ta-p-g').innerHTML = g.map(x => `<li>${x}</li>`).join('');
          q('.ta-p-out').innerHTML = out.map(x => `<li${mine.includes(x) ? ' style="color:var(--accent-ink);font-weight:700"' : ''}>${x}${mine.includes(x) ? ' (personal)' : ''}</li>`).join('');
          q('.ta-p-note').textContent = `${mine.length} personal + ${out.length - mine.length} global. Global hissa CDN pe cache hua (sabke liye same); personal hissa Riya ke browser se aaya, server tak gaya hi nahi.`;
        };
        el.querySelectorAll('.ta-p-c').forEach(b => b.addEventListener('click', () => { pre = b.dataset.p; el.querySelectorAll('.ta-p-c').forEach(x => x.classList.toggle('on', x === b)); upd(); }));
        q('.ta-p-on').addEventListener('change', upd); upd();
      }},
      { type: 'h3', text: 'Filtering: kya kabhi nahi dikhna chahiye' },
      { type: 'p', html: `Autocomplete apni taraf se kuch "suggest" kar raha hai, to galat suggestion company ki awaaz ban jaata hai. Google ki 2020 post ke mutabik unke automated systems hinsak, sexually explicit, nafrat bhare ya khatarnak predictions rokte hain, aur jo bach jaayein unhe enforcement teams manually hataati hain. System design mein iska matlab teen jagah filter:` },
      { type: 'steps', items: [
        { t: 'Build time', d: 'Blocklist aur classifier, taaki buri query index mein aaye hi nahi. Kam se kam itne alag users ne search kiya ho (minimum threshold), taaki ek bot ya kisi ka personal info (phone number) suggestion na ban jaaye.' },
        { t: 'Serve time kill list', d: 'Chhoti list jo seconds mein update ho sakti hai. Agle rebuild ka wait kiye bina koi suggestion hatao.' },
        { t: 'Cache TTL', d: 'CDN aur browser copies chhote TTL ke saath, taaki hatayi gayi cheez jaldi gayab ho.' },
      ]},

      { type: 'h2', text: 'Asli companies ne kya kiya' },
      { type: 'table', head: ['Company (saal)', 'Kya bataya', 'Is lesson se connection'], rows: [
        ['Facebook (2010)', 'Browser pe user ke friends, pages, groups pehle hi cache. Cache miss pe AJAX request → load balancer → web tier → ek <strong>aggregator</strong> jo parallel mein kai "leaf" services se poochhta hai: ek global service (pages, apps; non-personal, isliye memcached, yaani ek popular in-memory cache, mein rakha) aur ek graph service (user ke connections). Dono prefix matching karte the. 100 ms budget. Launch se pehle purane typeahead se har keystroke pe query bhej ke <em>dark test</em> kiya (asli traffic chalaya lekin users ko naya result dikhaya nahi), aur network limits mile jinke liye topology badli.', 'Browser cache, scatter-gather to leaf services, personal vs global split, latency budget'],
        ['LinkedIn Cleo (2012)', 'Multi-layer: browser cache, web tier, result aggregator, kai typeahead backends. Andar: prefixes ka inverted index (prefix → kin documents mein hai, uski list), har document pe ek chhota Bloom filter (jaldi reject), forward index (false positives hatane ke liye), aur scorer. Real-time: naya member/company turant searchable.', 'Generic vs network (personal) typeahead; Bloom filter ka use (<a href="#/ds-for-scale">Bloom filter lesson</a>)'],
        ['Twitter typeahead.js (2013)', 'Open-source client library: prefetch data browser ke localStorage (browser ki chhoti permanent storage) mein (default TTL 1 din), remote requests pe debounce/throttle (default 300 ms).', 'Client-side debounce aur browser cache'],
        ['Elasticsearch completion suggester (docs)', 'Fast lookup ke liye in-memory data structures jo banane mein mehenge hain; har suggestion ke saath weight; context (category/geo) se filter/boost; fuzzy (typo) support.', 'Off-the-shelf option agar khud trie nahi banana'],
      ]},
      { type: 'p', html: `Dhyaan do: Facebook aur LinkedIn ki posts 2010-2012 ki hain, Twitter wali 2013 ki. Tab se in companies ke systems kaafi badle honge. Lekin core ideas (browser cache, aggregator, precomputed ranking, debounce) aaj bhi har interview answer ki reedh ki haddi hain.` },
      { type: 'h2', text: 'Kya kya toot sakta hai' },
      { type: 'table', head: ['Failure', 'Kya hota hai', 'Bachav'], rows: [
        ['Trie server crash', 'Us shard ke prefixes ke suggestions nahi', 'Replicas, chhota timeout, khaali list (graceful degradation)'],
        ['Build job fail / der', 'Suggestions purane', 'Purana snapshot serve karte raho; alert. Purane suggestions chalte hain.'],
        ['Kharab build (bug ya bot attack)', 'Galat ya gande suggestions sabko', 'Sanity checks, minimum distinct-users threshold, versioned snapshots + rollback'],
        ['Hot prefix ("c" during IPL)', 'Ek shard / ek key pe bahut load', 'CDN + browser cache, chhote prefixes har shard pe copy'],
        ['Client bina debounce (purana app version)', 'Requests kai guna', 'Server pe <a href="#/rate-limiting">rate limiting</a>, CDN absorb kare'],
        ['Out-of-order responses', 'Purane prefix ke suggestions dikhte hain', 'Client sirf current text wala response dikhaye'],
      ]},

      { type: 'h2', text: 'Interview mein kaise bolein' },
      { type: 'steps', items: [
        { t: 'Requirements', d: 'Top 5 per prefix, ~100 ms end-to-end, read-heavy, thoda purana data chalega, filtering zaroori.' },
        { t: 'Core insight', d: 'Ranking offline precompute karo; online path sirf lookup. Trie (ya prefix → top-k table) RAM mein, read-only.' },
        { t: 'Build path', d: 'Query logs (Kafka/S3) → batch job (count + decay + top-k) → filter + sanity → versioned snapshot → load + atomic swap. Trending ke liye chhota stream overlay.' },
        { t: 'Serving path', d: 'Client debounce + cache → CDN (short prefixes, key mein lang/region) → stateless suggest service → trie replicas/shards.' },
        { t: 'Deep dives', d: 'Debounce numbers, hot prefixes, sharding choice, personalization blend, kill list, failure par khaali list.' },
      ]},
      { type: 'callout', tone: 'why', title: 'Decide', html: `Jab bhi "har keystroke / har request pe ranking" jaisa kuch dikhe: <strong>kya jawab thoda purana chal sakta hai?</strong> Haan, to mehnga kaam offline precompute karo aur online sirf lookup + cache rakho (autocomplete, trending lists, recommendations). Nahi (jaise bank balance), to precompute nahi, source of truth se padho. Client side pe pehle requests ghatao (debounce, cache), phir server scale karo.` },

      { type: 'diagram', title: 'Poora design, ek nazar mein', height: 520,
        caption: 'Upar: har keystroke ka raasta (milliseconds). Neeche: offline raasta jo logs se naya trie banata hai (ghante). Dono ek doosre ka wait nahi karte. Buttons se ek-ek raasta dekho, box pe click karke uska kaam padho.',
        groups: [
          { label: 'Serving path (har keystroke)', x: 10, y: 30, w: 700, h: 212 },
          { label: 'Build path (offline, logs se naya trie)', x: 10, y: 262, w: 700, h: 240 },
        ],
        nodes: [
          { id: 'user', label: 'Browser / app', sub: 'debounce + cache', x: 90, y: 90, kind: 'client', info: 'Ye kya hai: user ka search box. Ruk ke poochhta hai (debounce), pehle mile jawab yaad rakhta hai (backspace pe 0 ms), aur user ki apni recent searches ko global list ke saath blend karta hai.' },
          { id: 'cdn', label: 'CDN edge', sub: 'short prefixes', x: 270, y: 90, kind: 'edge', info: 'Ye kya hai: user ke shehar ke paas cache server. "c", "cr" jaise chhote prefixes ka jawab sabke liye same hai, to ye kuch minute (max-age) rakh ke khud de deta hai. Cache key = prefix + language + region.' },
          { id: 'api', label: 'Suggest service', sub: 'LB + stateless', x: 450, y: 90, kind: 'server', info: 'Ye kya hai: load balancer ke peeche stateless servers. Sahi trie shard se lookup karte hain, chhota timeout lagaate hain, kill list se filter karte hain. Sab gire to khaali list (graceful degradation).' },
          { id: 'kill', label: 'Kill list', sub: 'turant hatao', x: 630, y: 90, kind: 'threat', info: 'Ye kya hai: chhoti list jo seconds mein update hoti hai. Koi suggestion abhi hatana ho (galat, nuksaandeh, kisi ka phone number) to agle rebuild ka wait nahi.' },
          { id: 'trie', label: 'Trie servers', sub: 'shards × replicas', x: 450, y: 200, w: 156, kind: 'cache', info: 'Ye kya hai: RAM mein rakha trie, har node pe top-k pehle se. Read-only, isliye replicas aasaan. Data ek machine se bada ho to shards (hash ya traffic dekh ke ranges). Lookup ~1 ms.' },
          { id: 'search', label: 'Search service', sub: 'Enter dabaya', x: 90, y: 330, kind: 'server', info: 'Ye kya hai: xyz.com ki asli search. Har search pe ek event likhti hai: query, time, language, region. Autocomplete ka raw material.' },
          { id: 'logs', label: 'Query logs', sub: 'Kafka → S3', x: 270, y: 330, kind: 'queue', info: 'Ye kya hai: har search ki diary, ek event stream jo sasti storage mein bhi jama hoti hai. Batch job yahan se din bhar ka data, stream job taaza minutes padhta hai.' },
          { id: 'stream', label: 'Trend stream', sub: 'har 15 min', x: 450, y: 330, kind: 'server', info: 'Ye kya hai: hamesha chalne wala stream job. Achanak spike ("ipl final live") pakadta hai aur trie servers ko chhota trending overlay bhejta hai.' },
          { id: 'batch', label: 'Batch job', sub: 'count + decay + top-k', x: 270, y: 460, w: 160, kind: 'server', info: 'Ye kya hai: har raat/ghante chalne wala job. Queries normalize karta hai, ginta hai, purane din ka weight kam karta hai (half-life), aur har prefix ki top-k list banata hai.' },
          { id: 'check', label: 'Filter + checks', sub: 'blocklist, sanity', x: 450, y: 460, kind: 'threat', info: 'Ye kya hai: publish se pehle ka checkpoint. Buri queries aur kam distinct users wali queries hatata hai; naya trie purane se bahut alag ho to build reject.' },
          { id: 'snap', label: 'Snapshots', sub: 'versioned files', x: 630, y: 460, kind: 'data', info: 'Ye kya hai: har build ek versioned trie file (v2041). Trie servers ise background mein load karke atomic swap karte hain; gadbad ho to purane version pe rollback.' },
        ],
        edges: [
          { a: 'user', b: 'cdn', n: 1 }, { a: 'cdn', b: 'api', n: 2 },
          { a: 'api', b: 'trie', n: 3, label: 'lookup' }, { a: 'api', b: 'kill', dashed: true },
          { a: 'user', b: 'search', label: 'Enter', kind: 'evt' }, { a: 'search', b: 'logs', kind: 'evt' },
          { a: 'logs', b: 'batch', label: 'roz raat', kind: 'evt' }, { a: 'logs', b: 'stream', kind: 'evt' },
          { a: 'batch', b: 'check' }, { a: 'check', b: 'snap' },
          { a: 'snap', b: 'trie', label: 'load + swap', via: [[630, 200]] }, { a: 'stream', b: 'trie', label: 'trending', kind: 'evt' },
        ],
        paths: [
          { name: 'Letter type karo', text: 'User "cr" pe ruka → browser cache miss → CDN edge pe HIT (kisi aur ne abhi maanga tha). Hamare servers tak request pahunchi hi nahi, ~10 ms.', go: ['user>cdn'] },
          { name: 'Lamba prefix', text: '"cricket li" → CDN miss → suggest service → trie shard pe 10 kadam ka walk, top-5 ready → kill list filter → wapas, aur CDN copy rakh leta hai.', go: ['user>cdn>api>trie', 'api>kill'] },
          { name: 'Rebuild index', text: 'Searches → query logs → raat ka batch job (ginti, decay, top-k) → filter + sanity checks → naya snapshot → trie servers load karke atomic swap.', go: ['user>search>logs>batch>check>snap>trie'] },
          { name: 'Trending spike', text: 'Match shuru, searches 50 guna. Stream job 15 minute mein pakadta hai aur chhota overlay trie servers ko bhejta hai. Poora rebuild nahi.', go: ['search>logs>stream>trie'] },
        ],
      },
      { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
        <li>Autocomplete = prefix do, sabse popular top-k queries lo, ~50-100 ms ke andar, har keystroke pe.</li>
        <li>Mehnga kaam (ginti, ranking) offline. Online path pe sirf lookup: trie ke har node pe top-k pehle se rakha hai.</li>
        <li>Live counting nahi: ek search kai prefix nodes ki lists badal sakti hai. Isliye batch rebuild + versioned snapshot + atomic swap.</li>
        <li>Trending ke liye chhota stream overlay; raat ka batch baaki sambhalta hai.</li>
        <li>Sabse sasti request wo jo bheji hi nahi: debounce (~80% kam) + browser cache + CDN (chhote prefixes, key mein language/region).</li>
        <li>Read-only trie: replicas aasaan. Sharding sirf jab data ek machine mein na samaaye; pehle-letter ranges garam shards banati hain.</li>
        <li>Personal hissa CDN pe nahi: global list + user ki history ka blend.</li>
        <li>Filtering teen jagah: build time, serve-time kill list, chhota cache TTL. Sab gire to khaali list, search phir bhi chale.</li>
      </ul>` },
      { type: 'tradeoffs',
        gains: ['Lookup cost prefix ki length jitna, data size se independent', 'Read-only index: replicas aasaan, koi locking nahi', 'Debounce + browser + CDN cache se zyadatar requests server tak pahunchti hi nahi', 'Versioned snapshots: kharab build ka rollback ek pointer swap', 'Autocomplete gire to bhi search chalti rahe (graceful degradation)'],
        costs: ['Suggestions ghanton purane (trending ke liye alag stream path ka complexity)', 'Har node pe top-k = zyada memory', 'Debounce se har suggestion thoda der se', 'Personalization CDN cache ko kam useful banata hai', 'Filtering kabhi 100% nahi: manual kill list aur logon ki zarurat'],
      },

      { type: 'think', questions: [
        { q: 'xyz.com pe ek naya video "Dhoni retires" 10 minute pehle aaya aur log dhadadhad search kar rahe hain. Roz ka batch kal raat chala tha. Suggestion kaise aayega?', a: 'Stream job (15 minute windows) spike pakdega aur trending overlay trie servers ko bhejega; servers main top-k ke saath overlay blend karke dikhayenge. CDN TTL chhota (minutes) hai, to naye jawab jaldi pahunchenge. Raat ka batch ise main index mein shaamil kar lega.' },
        { q: 'Product team chahti hai ki suggestions "har user ke liye bilkul alag" hon. CDN caching ka kya hoga?', a: 'Personal hisse ko CDN pe cache nahi kar sakte. Isliye response ko do mein todo: non-personal global list (CDN cacheable, lang/region key) aur chhoti personal list (user ki history, browser ya per-user store se). Client ya suggest service dono ko blend karta hai. Isse CDN ka fayda bacha rehta hai.' },
        { q: 'Kisi celebrity ka phone number ek prefix pe suggestion ban gaya. Agla build 20 ghante baad hai. Kya karoge?', a: 'Serve-time kill list mein turant daalo (seconds), CDN purge karo ya TTL khatam hone do, aur build ke filter mein pattern add karo (phone number jaisa regex) taaki dobara na aaye. Minimum distinct-users threshold aisi private cheezon ko pehle hi rokta hai.' },
      ]},
      { type: 'quiz', questions: [
        { q: 'Autocomplete mein har trie node pe top-k list pehle se kyun rakhte hain?', options: ['Memory bachane ke liye', 'Taaki lookup ke time subtree ghoom ke sort na karna pade', 'Taaki writes fast hon'], answer: 1, explain: 'Precompute se lookup = prefix tak walk + list read. Keemat: zyada memory aur mehnga update, jo offline batch mein chal jaata hai.' },
        { q: 'User "cricket" 140 ms per key ki speed se type karta hai. 300 ms debounce ke saath beech ke prefixes ("cri", "cric"...) ka kya hoga?', options: ['Sab ki requests jaayengi', 'Beech ki zyadatar requests jaayengi hi nahi, sirf pause pe ek', 'Server unhe reject karega'], answer: 1, explain: 'Har keystroke timer reset karta hai. 140 ms ke gaps 300 ms se chhote hain, to request tabhi jaati hai jab user rukta hai.' },
        { q: 'CDN pe suggestions cache karte waqt cache key mein kya zaroor hona chahiye?', options: ['User ID', 'Prefix ke saath language aur region', 'Sirf prefix'], answer: 1, explain: 'Same prefix ka jawab language/region se badalta hai. User ID daaloge to cache bekaar (har user alag); personal hissa CDN pe hona hi nahi chahiye.' },
        { q: 'Live trie mein "cricket live score" ke count ne "cricket" ko peeche chhod diya. Kitne nodes ki top-k list badalni padegi?', options: ['Sirf ek, "cricket live score" wala', 'Uske raaste ke har prefix node ki (c, cr, cri ... cricket), jahan dono top-k mein the', 'Poore trie ki'], answer: 1, explain: 'Har prefix node apne subtree ka top-k rakhta hai. Order badla to c se cricket tak saare 7 nodes. Isliye counting live nahi, offline batch mein.' },
        { q: 'Trie ko pehle letter se 8 shards mein baanta (a-d, e-g...). Kya problem aayegi?', options: ['Koi problem nahi', 'Hot shards: "s", "c" jaise letters wale shards pe kai guna zyada traffic', 'Lookup slow ho jaayega'], answer: 1, explain: 'Letters barabar popular nahi. Widget mein 8 shards pe busiest shard ~2.1 guna load leta hai. Hash ya traffic dekh ke ranges kaato, aur garam shards ke replicas badhao.' },
        { q: 'Raat ke build mein bug se ajeeb suggestions bane. Sabse achha bachav?', options: ['Trie servers pe live writes band karna', 'Sanity checks + versioned snapshots, fail hone pe purana version serve karte rehna', 'CDN band karna'], answer: 1, explain: 'Build path aur serving path alag hain. Check fail = publish nahi; servers purana snapshot chalate rehte hain, aur zarurat ho to rollback ek pointer swap.' },
      ]},
      { type: 'sources', note: 'Company-specific hisse inhi sources se. Facebook, LinkedIn aur Twitter ki posts 2010-2013 ki hain; tab se systems badle honge.', items: [
        { title: 'The Life of a Typeahead Query', publisher: 'Facebook Engineering (engineering.fb.com)', official: true, year: 2010, url: 'https://engineering.fb.com/2010/05/17/web/the-life-of-a-typeahead-query/', used: 'Browser cache with prefetched connections, aggregator + leaf services (global, graph), memcached for global results, 100 ms budget, dark testing per keystroke.' },
        { title: 'Cleo: the open source technology behind LinkedIn\'s typeahead search', publisher: 'LinkedIn Engineering', official: true, year: 2012, url: 'https://engineering.linkedin.com/open-source/cleo-open-source-technology-behind-linkedins-typeahead-search', used: 'Generic vs network typeahead, multi-layer architecture, inverted/forward index + per-document Bloom filter + scorer, real-time updates (read via search snippets and a summary; the original page now returns 404).' },
        { title: 'Designing typeahead search or autocomplete (summary of the Cleo post)', publisher: 'tianpan.co (secondary)', url: 'https://tianpan.co/notes/179-designing-typeahead-search-or-autocomplete', used: 'Cleo layer list and how the Bloom filter / forward index are used.' },
        { title: 'Bloodhound (typeahead.js suggestion engine) docs', publisher: 'Twitter, GitHub', official: true, year: 2013, url: 'https://github.com/twitter/typeahead.js/blob/master/doc/bloodhound.md', used: 'Debounce/throttle option with 300 ms default, prefetch cached in localStorage with 1-day default TTL.' },
        { title: 'How Google autocomplete predictions work', publisher: 'Google (The Keyword blog)', official: true, year: 2020, url: 'https://blog.google/products/search/how-google-autocomplete-predictions-work/', used: 'Predictions from real searches, common + trending, language/location, freshness boost, automated + manual policy enforcement.' },
        { title: 'Suggesters / completion suggester', publisher: 'Elastic documentation', official: true, url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-suggesters.html', used: 'In-memory structures costly to build, weights, context suggester, fuzzy, skip_duplicates.' },
      ]},
    ],
  });
})();
