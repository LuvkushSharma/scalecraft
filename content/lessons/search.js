(function () {
  /* ---------- pure helpers (also exported as _test for verification scripts) ---------- */
  const STOP = new Set(['a', 'an', 'the', 'is', 'are', 'of', 'in', 'on', 'for', 'and', 'to', 'how', 'by', 'their', 'with', 'what']);
  function stem(w) {
    if (w.length <= 3) return w;
    const undouble = s => (/(bb|dd|gg|mm|nn|pp|rr|tt)$/.test(s) ? s.slice(0, -1) : s);
    if (/ies$/.test(w) && w.length > 4) return w.slice(0, -3) + 'y';
    if (/(ch|sh|x|ss|z)es$/.test(w)) return w.slice(0, -2);
    if (/ers$/.test(w) && w.length > 5) return w.slice(0, -3);
    if (/ing$/.test(w) && w.length > 5) return undouble(w.slice(0, -3));
    if (/ed$/.test(w) && w.length > 4) return undouble(w.slice(0, -2));
    if (/s$/.test(w) && !/(ss|us|is)$/.test(w)) return w.slice(0, -1);
    return w;
  }
  function analyze(text, opt) {
    let toks = (text.match(/[A-Za-z0-9]+/g) || []);
    if (opt.lower) toks = toks.map(t => t.toLowerCase());
    if (opt.stop) toks = toks.filter(t => !STOP.has(t.toLowerCase()));
    if (opt.stem) toks = toks.map(stem);
    return toks;
  }
  function buildIndex(docs, opt) {
    const toks = docs.map(d => analyze(d, opt));
    const index = {};
    toks.forEach((ts, di) => ts.forEach(t => {
      index[t] = index[t] || {};
      index[t][di] = (index[t][di] || 0) + 1;
    }));
    const avgdl = toks.reduce((s, t) => s + t.length, 0) / Math.max(1, toks.length);
    return { toks, index, avgdl, N: docs.length };
  }
  function score(ix, qTerms, k1, b) {
    const res = ix.toks.map((ts, di) => ({ doc: di, dl: ts.length, bm25: 0, tfidf: 0, parts: [], matched: 0 }));
    const uniq = [...new Set(qTerms)];
    uniq.forEach(t => {
      const post = ix.index[t] || {};
      const df = Object.keys(post).length;
      const idfBm = Math.log(1 + (ix.N - df + 0.5) / (df + 0.5));
      const idfTf = df ? Math.log(ix.N / df) : 0;
      res.forEach(r => {
        const tf = post[r.doc] || 0;
        if (!tf) return;
        const norm = k1 * (1 - b + b * r.dl / ix.avgdl);
        const bm = idfBm * (tf * (k1 + 1)) / (tf + norm);
        r.bm25 += bm; r.tfidf += tf * idfTf; r.matched++;
        r.parts.push({ t, tf, df, idfBm, idfTf, bm });
      });
    });
    return { res, uniq };
  }
  function bm25tf(tf, k1, b, lenRatio) { return tf === 0 ? 0 : (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * lenRatio)); }
  function buildTrie(entries, K) {
    const root = { c: {}, top: [], end: 0 };
    let nodes = 1;
    entries.forEach(([q, n]) => {
      let node = root;
      for (const ch of q) { if (!node.c[ch]) { node.c[ch] = { c: {}, top: [], end: 0 }; nodes++; } node = node.c[ch]; }
      node.end = n; node.q = q;
    });
    const fill = node => {
      let all = node.end ? [[node.q, node.end]] : [];
      let below = node.end ? 1 : 0;
      Object.values(node.c).forEach(ch => { const r = fill(ch); all = all.concat(ch.top); below += r; });
      node.top = all.sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1)).slice(0, K);
      node.below = below;
      return below;
    };
    fill(root);
    return { root, nodes };
  }
  function cosine(a, b) { const d = a[0] * b[0] + a[1] * b[1]; return d / (Math.hypot(a[0], a[1]) * Math.hypot(b[0], b[1])); }
  const T = { stem, analyze, buildIndex, score, bm25tf, buildTrie, cosine };

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fx = (n, d) => Number(n).toFixed(d === undefined ? 3 : d);

  Lesson.register({
    id: 'search',
    title: 'Search aur inverted index',
    minutes: 32,
    summary: `xyz.com pe search box. Database ka <code>LIKE '%cricket%'</code> lakhon videos pe dum tod deta hai. Yahan seekhenge search engine andar se kaise kaam karta hai: inverted index, tokenization aur stemming, ranking (TF-IDF, BM25), Elasticsearch ke shards aur replicas, database se sync (CDC), autocomplete ke liye trie, aur meaning se search (embeddings).`,
    _test: T,
    blocks: [
      { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `xyz.com pe crores videos hain. User search box mein "cricket batting" likhta hai aur ek second se kam mein sabse achhi videos upar chahiye.<br>Database ko har video ka title ek ek karke padhna pade, to bahut der lagegi.<br>Isliye search engine pehle se ek "ulta register" bana ke rakhta hai: har word ke saamne un videos ki list jisme wo word hai. Bilkul kitaab ke peeche wale index jaisa.<br>Is lesson mein seekhenge: wo register kaise banta hai, kaunsi video pehle dikhe ye kaise tay hota hai, aur type karte hi suggestions kaise aate hain.` },
      { type: 'h2', text: 'Problem: database se search' },
      { type: 'p', html: `xyz.com ab ek video platform hai: crores videos, har video ka title aur description database (Postgres) mein. Product team bolti hai: "Upar ek search box chahiye. User 'cricket batting' likhe to sabse relevant videos upar aayein." Pehla idea jo sabko aata hai:` },
      { type: 'code', text: `SELECT * FROM videos
WHERE title LIKE '%cricket%' AND title LIKE '%batting%';` },
      { type: 'p', html: `Ye chalega, lekin sirf chhote data pe. Scale pe ye chaar jagah toot-ta hai:` },
      { type: 'list', items: [
        `<strong>Speed:</strong> <code>'%cricket%'</code> ke aage bhi <code>%</code> hai, matlab "beech mein kahin bhi". Normal B-tree index sorted order pe kaam karta hai (jaise dictionary mein "cr..." se shuru hone wale words), lekin "beech mein kahin" ke liye wo kaam nahi aata. Database ko <strong>har row</strong> padhni padti hai (full table scan). 10 crore rows × 1,000 searches per second = database khatam.`,
        `<strong>Ranking nahi:</strong> LIKE sirf haan/na batata hai. 50,000 videos match huin, kaunsi pehle dikhaayein? "Cricket" title mein ek baar wali video aur poori cricket batting guide, dono barabar.`,
        `<strong>Word ke roop:</strong> user ne "batting" likha, video ka title "bat" ya "Batting" ya "cricketers" hai. LIKE in sabko alag maanta hai.`,
        `<strong>Typo aur meaning:</strong> "criket" ya "sasta phone" (jab title mein "budget smartphone" likha ho), LIKE ke bas ka nahi.`,
      ]},
      { type: 'callout', tone: 'term', title: 'Full table scan', html: `<strong>Ye kya hai:</strong> jab database ke paas koi shortcut (index) nahi hota, wo table ki <strong>har ek row</strong> padh ke check karta hai.<br><strong>Kyun hota hai:</strong> <code>'%cricket%'</code> jaisi query ke liye normal index kaam nahi aata.<br><strong>Iske nuksaan:</strong> chhoti table pe theek, crores rows pe har query seconds le leti hai aur CPU/disk kha jaati hai.` },
      { type: 'p', html: `Search engines (Elasticsearch, OpenSearch, Solr, Google ke andar ka system) isi kaam ke liye bane hain. Unka dil ek data structure hai: <strong>inverted index</strong>.` },
      { type: 'callout', tone: 'term', title: 'Search engine', html: `<strong>Ye kya hai:</strong> ek alag software jo text ko search ke liye pehle se tayyar karke rakhta hai, aur query aane pe milliseconds mein sabse relevant documents deta hai.<br><strong>Kyun chahiye:</strong> database "exact match aur transactions" ke liye bana hai, search engine "words se dhoondhna aur ranking" ke liye.<br><strong>Iske bina:</strong> LIKE queries, full table scans, aur bina ranking ke results.` },

      { type: 'h2', text: 'Inverted index: ulta socho' },
      { type: 'p', html: `Database mein data "document → words" ki shakal mein hai: video 7 ka title ye hai. Search ko chahiye ulta: "word → kaun kaun se documents". Bilkul kitaab ke peeche wale index jaisa: "Recursion ... page 45, 112". Poori kitaab padhne ki zaroorat nahi, seedha page pe jao.` },
      { type: 'compare',
        left: { title: 'Forward (database jaisa)', ascii: `
D1 → india vs australia cricket highlights
D2 → cricket batting tips for beginners
D3 → top cricketers batting records` },
        right: { title: 'Inverted (search engine)', ascii: `
cricket  → D1, D2, D3
batting  → D2, D3
india    → D1
records  → D3
...` },
      },
      { type: 'callout', tone: 'term', title: 'Document aur term', html: `<strong>Ye kya hai:</strong> <strong>document</strong> = ek searchable cheez (yahan ek video ka title + description, JSON ki shakal mein). <strong>Term</strong> = cleaning ke baad bacha hua word (jaise "Batting" → "bat").<br><strong>Kyun chahiye:</strong> index terms pe banta hai, aur result mein documents aate hain.<br><strong>Iske bina:</strong> "Cricket", "cricket" aur "cricket!" teen alag words maane jaate.` },
      { type: 'callout', tone: 'term', title: 'Inverted index aur posting list', html: `<strong>Ye kya hai:</strong> <strong>inverted index</strong> = ek map: term → us term wale documents ki list. Us list ko <strong>posting list</strong> (postings) kehte hain. Postings mein aksar extra info bhi hoti hai: kitni baar aaya (term frequency) aur kis position pe (phrase search ke liye).<br><strong>Kyun chahiye:</strong> query aate hi sirf us word ki list kholo, crores rows padhne ki zaroorat nahi.<br><strong>Iske bina:</strong> har search = full table scan.<br><strong>Example:</strong> "batting" → [D2, D3]. Query "batting" = bas ye ek list padho.` },
      { type: 'image', src: 'assets/img/search/book-index.jpg', alt: 'Ek purani kitaab ke peeche ka index: alphabetical words aur unke saamne page numbers', caption: 'Kitaab ke peeche ka index (1919 ki ek encyclopedia): har word ke saamne page numbers. Inverted index bilkul yahi hai: word ke saamne document IDs. Poori kitaab padhne ki jagah seedha sahi page pe jao.', credit: { text: 'Randal Oulton, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Book_of_Knowledge_1919_Vol_20,_General_Index_Sample.jpg', license: 'CC0' } },
      { type: 'p', html: `Query "cricket batting" aayi to: "cricket" ki list nikaalo, "batting" ki list nikaalo, dono ka <strong>intersection</strong> (dono mein common) lo. Lists pehle se sorted hain (doc ID order mein), to do sorted lists ko ek saath chal ke milaana bahut fast hai. Poori table padhne ki jagah sirf do chhoti lists padhi.` },

      { type: 'h2', text: 'Words ko saaf karna: analysis pipeline' },
      { type: 'callout', tone: 'term', title: 'Analyzer', html: `<strong>Ye kya hai:</strong> ek chhoti machine-line jisme text daalo to saaf kiye hue terms nikalte hain. Index banate waqt har document isse guzarta hai, aur search ke waqt har query bhi.<br><strong>Kyun chahiye:</strong> user aur creator alag tareeke se likhte hain ("Batting", "bats", "BATTING!"). Analyzer sabko ek jaisa bana deta hai taaki match ho.<br><strong>Iske bina:</strong> sirf exact same spelling wale words milte.` },
      { type: 'p', html: `Index banane se pehle har text analyzer se guzarta hai. Iske steps:` },
      { type: 'steps', items: [
        { t: 'Tokenization', d: `<strong>Token</strong> = text ka ek tukda, aam taur pe ek word. Tokenization = text ko tokens mein todna. "India vs Australia: Cricket highlights!" → [India, vs, Australia, Cricket, highlights]. Punctuation hata. (Hindi/Chinese/Japanese jaisi languages ke liye alag tokenizers hote hain.)` },
        { t: 'Lowercasing', d: `"Cricket" aur "cricket" ek hi cheez hain, to sab small letters mein.` },
        { t: 'Stop words hataana', d: `"the, is, for, to, how" jaise words lagbhag har document mein hain, search mein madad nahi karte. Inhe hata ke index chhota. (Modern engines aksar inhe rakhte bhi hain, kyunki BM25 inhe waise bhi bahut kam weight deta hai, aur "to be or not to be" jaisi phrase searches toot jaati hain.)` },
        { t: 'Stemming', d: `Word ko uski "jad" (stem) tak kaatna: batting, bats → bat; cricketers → cricket; centuries → century. Ab "batting" search karne pe "bats" wala video bhi milega.` },
        { t: 'Synonyms (optional)', d: `"phone" = "mobile", "tv" = "television". Ek list se extra terms jod do.` },
      ]},
      { type: 'callout', tone: 'term', title: 'Stemming', html: `<strong>Ye kya hai:</strong> ek rule-based kainchi: word ka suffix kaat ke uski "jad" (stem) bacha lo. batting → bat, cricketers → cricket. Porter stemmer sabse famous hai. Kabhi kabhi ajeeb stem banta hai ("beginners" → "beginn"), lekin koi baat nahi, kyunki query pe bhi <em>wahi</em> kainchi chalti hai, dono taraf same stem.<br><strong>Kyun chahiye:</strong> "batting" search karne pe "bats" wali video bhi mile.<br><strong>Iske bina:</strong> har roop (bat, bats, batting) alag term, aur bahut saare sahi results chhoot jaate.` },
      { type: 'callout', tone: 'term', title: 'Lemmatization', html: `<strong>Ye kya hai:</strong> stemming ka "padha-likha" bhai. Dictionary se asli root word nikaalta hai ("better" → "good", "ran" → "run").<br><strong>Kab:</strong> jab sahi root zaroori ho. Zyada sahi, lekin slow aur har language ke liye alag dictionary chahiye.<br><strong>Iske bina:</strong> stemming se kaam chal jaata hai, isliye search engines mein stemming zyada common hai.` },
      { type: 'p', html: `Ab analyzer ko kaam karte dekho. Koi bhi title ya query likho, aur har step ke baad tokens kaise badalte hain dekho (badle hue tokens highlighted):` },
      { type: 'custom', render(el) {
        const PRE = ['Top Cricketers ranked by Batting averages and the Centuries!', 'How to play the Cover Drive: batting tips for beginners', 'Cheap phone vs budget mobile: which is better?'];
        const SYN = { phone: ['mobile'], mobile: ['phone'], tv: ['television'], cheap: ['budget'], budget: ['cheap'] };
        el.innerHTML = `<label for="anIn">Text (title ya query)</label><input id="anIn" type="text" style="width:100%">
          <div class="anPre" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"></div>
          <div class="anOut" style="margin-top:12px;display:grid;gap:10px"></div>
          <div class="calc-note anNote"></div>`;
        const inp = el.querySelector('#anIn');
        PRE.forEach((p, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small ghost'; b.textContent = 'Example ' + (i + 1); b.onclick = () => { inp.value = p; upd(); }; el.querySelector('.anPre').appendChild(b); });
        const chip = (t, hot) => `<span style="display:inline-block;margin:2px 4px 2px 0;padding:2px 8px;border-radius:999px;font:13px var(--f-mono);border:1px solid ${hot ? 'var(--accent)' : 'var(--line-2)'};background:${hot ? 'var(--accent-soft)' : 'var(--surface-2)'};color:var(--ink)">${esc(t)}</span>`;
        const upd = () => {
          const s1 = inp.value.match(/[A-Za-z0-9]+/g) || [];
          const s2 = s1.map(t => t.toLowerCase());
          const s3 = s2.filter(t => T.analyze(t, { stop: true }).length > 0);
          const s4 = s3.map(T.stem);
          const s5 = s4.flatMap(t => [t].concat(SYN[t] || []));
          const rows = [
            ['1. Tokenize', 'Text ko words mein todo, punctuation hatao.', s1.map(t => chip(t, false))],
            ['2. Lowercase', 'Sab chhote letters.', s2.map((t, i) => chip(t, t !== s1[i]))],
            ['3. Stop words hatao', `Hataaye: ${s2.filter(t => !s3.includes(t)).map(esc).join(', ') || 'koi nahi'}`, s3.map(t => chip(t, false))],
            ['4. Stemming', 'Suffix kaat ke jad (stem).', s4.map((t, i) => chip(t, t !== s3[i]))],
            ['5. Synonyms', 'List se extra terms jode.', s5.map(t => chip(t, !s4.includes(t)))],
          ];
          el.querySelector('.anOut').innerHTML = rows.map(([h, d, cs]) => `<div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:8px 10px;background:var(--surface)"><div style="font-weight:700;color:var(--ink)">${h} <span style="font-weight:400;color:var(--ink-3);font-size:13px">${d}</span></div><div style="margin-top:4px">${cs.join('') || '<span style="color:var(--ink-3)">(khaali)</span>'}</div></div>`).join('');
          el.querySelector('.anNote').textContent = `${s1.length} tokens se ${s5.length} index terms bane. Highlighted chips is step pe badle ya jude. Yahi analyzer query pe bhi chalta hai, isliye "Batting" (title) aur "bats" (query) dono "bat" ban ke milte hain.`;
        };
        inp.addEventListener('input', upd);
        inp.value = PRE[0]; upd();
      }},
      { type: 'callout', tone: 'mistake', title: 'Index aur query pe alag analyzer', html: `Sabse common bug: index banate waqt stemming lagaayi, lekin query pe nahi (ya ulta). Index mein "bat" hai, query mein "batting" dhoondh rahe ho, kuch nahi milega. Rule: <strong>document aur query dono ek hi analyzer se guzarne chahiye</strong> (jab tak koi khaas wajah na ho).` },

      { type: 'h2', text: 'Khud banao: live inverted index' },
      { type: 'p', html: `Teen video titles neeche hain, unhe badal bhi sakte ho. Analyzer ke options on/off karo aur dekho index kaise badalta hai. Phir query likho: har term ki posting list, unka intersection (AND) aur ranking (TF-IDF aur BM25 ke asli numbers) dikhenge.` },
      { type: 'custom', render(el) {
        el.innerHTML = `
          <div style="display:grid;gap:8px">
            ${[0, 1, 2].map(i => `<div><label>Document D${i + 1}</label><input type="text" class="srch-doc" style="max-width:100%"></div>`).join('')}
          </div>
          <div class="srch-opts" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px"></div>
          <div style="margin-top:12px"><label>Query</label><input type="text" class="srch-q" value="cricket batting"></div>
          <div class="srch-toks" style="margin-top:14px;font:13px/1.6 var(--f-mono);color:var(--ink-2)"></div>
          <div class="srch-ix table-wrap" style="max-height:260px;overflow:auto;margin-top:12px"></div>
          <div class="srch-post" style="font:14px/1.7 var(--f-mono);margin-top:4px"></div>
          <div class="srch-rank table-wrap" style="margin-top:12px"></div>
          <div class="calc-note srch-note"></div>`;
        const DEF = ['India vs Australia: Cricket highlights',
          'Cricket batting tips for beginners: how to play the cover drive',
          'Top cricketers ranked by batting average, batting records and centuries'];
        const docEls = [...el.querySelectorAll('.srch-doc')];
        docEls.forEach((d, i) => { d.value = DEF[i]; });
        const opt = { lower: true, stop: true, stem: true };
        const names = { lower: 'Lowercase', stop: 'Stop words hatao', stem: 'Stemming' };
        const optBox = el.querySelector('.srch-opts');
        Object.keys(names).forEach(k => {
          const b = document.createElement('button'); b.type = 'button';
          b.className = 'chip' + (opt[k] ? ' on' : ''); b.textContent = names[k];
          b.onclick = () => { opt[k] = !opt[k]; b.className = 'chip' + (opt[k] ? ' on' : ''); upd(); };
          optBox.appendChild(b);
        });
        const qEl = el.querySelector('.srch-q');
        const upd = () => {
          const docs = docEls.map(d => d.value);
          const ix = T.buildIndex(docs, opt);
          const q = T.analyze(qEl.value, opt);
          const qs = new Set(q);
          el.querySelector('.srch-toks').innerHTML = ix.toks.map((t, i) => `<div><strong>D${i + 1}</strong> (${t.length} terms): ${t.map(esc).join(' · ') || '-'}</div>`).join('') +
            `<div><strong>Query</strong> → ${q.map(esc).join(' · ') || '-'}</div>`;
          const terms = Object.keys(ix.index).sort();
          el.querySelector('.srch-ix').innerHTML = `<table><thead><tr><th>Term</th><th>Posting list (doc × kitni baar)</th><th>df</th></tr></thead><tbody>` +
            terms.map(t => {
              const p = ix.index[t];
              const hl = qs.has(t) ? ' style="background:var(--accent-soft)"' : '';
              return `<tr${hl}><td style="font-family:var(--f-mono)">${esc(t)}</td><td style="font-family:var(--f-mono)">${Object.keys(p).map(d => `D${+d + 1}×${p[d]}`).join(', ')}</td><td>${Object.keys(p).length}</td></tr>`;
            }).join('') + `</tbody></table>`;
          const uniq = [...qs];
          const lists = uniq.map(t => Object.keys(ix.index[t] || {}).map(Number));
          let andSet = lists.length ? lists.reduce((a, l) => a.filter(x => l.includes(x))) : [];
          const orSet = [...new Set(lists.flat())].sort();
          el.querySelector('.srch-post').innerHTML = uniq.map((t, i) => `${esc(t)} → [${lists[i].map(d => 'D' + (d + 1)).join(', ') || 'khaali'}]`).join('<br>') +
            (uniq.length ? `<br><strong>AND (intersection)</strong> → [${andSet.map(d => 'D' + (d + 1)).join(', ') || 'khaali'}] &nbsp; <strong>OR (union)</strong> → [${orSet.map(d => 'D' + (d + 1)).join(', ') || 'khaali'}]` : '');
          const { res } = T.score(ix, q, 1.2, 0.75);
          const rows = res.filter(r => r.matched).sort((a, b) => b.bm25 - a.bm25);
          el.querySelector('.srch-rank').innerHTML = rows.length ? `<table><thead><tr><th>#</th><th>Doc</th><th>Breakdown (har term)</th><th>TF-IDF</th><th>BM25</th></tr></thead><tbody>` +
            rows.map((r, i) => `<tr><td>${i + 1}</td><td>D${r.doc + 1}${andSet.includes(r.doc) ? '' : ' <span style="color:var(--ink-3)">(sirf OR)</span>'}<div style="font-size:12px;color:var(--ink-3)">length ${r.dl}</div></td>
              <td style="font:12px/1.6 var(--f-mono)">${r.parts.map(p => `${esc(p.t)}: tf=${p.tf}, df=${p.df}, idf<sub>bm25</sub>=${fx(p.idfBm)}, idf<sub>tfidf</sub>=${fx(p.idfTf)} → bm25 ${fx(p.bm)}`).join('<br>')}</td>
              <td>${fx(r.tfidf)}</td><td><strong>${fx(r.bm25)}</strong></td></tr>`).join('') + `</tbody></table>` : '<div style="padding:12px 14px">Koi document match nahi hua.</div>';
          el.querySelector('.srch-note').innerHTML = `N = ${ix.N} documents, average length = ${fx(ix.avgdl, 2)} terms. BM25: k1 = 1.2, b = 0.75 (Elasticsearch ke defaults). TF-IDF yahan textbook wala: tf × ln(N/df). Jo term har document mein hai uska TF-IDF idf = ln(3/3) = 0, yaani wo word ranking mein kuch nahi batata.`;
        };
        docEls.forEach(d => d.addEventListener('input', upd));
        qEl.addEventListener('input', upd);
        upd();
      }},
      { type: 'callout', tone: 'tip', title: 'Ye try karo', html: `1) Default pe query "cricket batting": AND mein D2 aur D3 aate hain, aur D3 upar hai kyunki usme "batting" do baar hai. 2) Ab <strong>Stemming</strong> band karo: D3 mein "cricketers" hai, "cricket" nahi, to D3 AND result se gayab. Isiliye stemming chahiye. 3) <strong>Lowercase</strong> band karo: "Cricket" aur "cricket" alag terms ban jaate hain. 4) Query mein "the" daalo: stop words on hain to wo query se bhi hat jaata hai.` },

      { type: 'h2', text: 'Ranking: kaunsa result pehle?' },
      { type: 'p', html: `Match hona kaafi nahi. 50,000 matching videos mein se top 10 chunne hain. Iske liye har document ko ek <strong>relevance score</strong> milta hai. Do purane aur pakke ideas:` },
      { type: 'list', items: [
        `<strong>TF (term frequency):</strong> jis document mein query ka word zyada baar aaya, wo shayad us topic ke baare mein zyada hai.`,
        `<strong>IDF (inverse document frequency):</strong> jo word kam documents mein hai wo zyada "khaas" hai. xyz.com pe "video" lagbhag har jagah hai (kam keemat), "googly" sirf kuch mein (zyada keemat). Formula ka idea: log(N / df), jahan N = total documents, df = kitne documents mein ye word hai.`,
      ]},
      { type: 'callout', tone: 'term', title: 'TF-IDF', html: `<strong>Ye kya hai:</strong> <strong>TF × IDF</strong>. Query ke har term ke liye ye nikaalo aur jod do: total = document ka score.<br><strong>Kyun chahiye:</strong> simple tareeka jo "zyada baar aaya" aur "khaas word" dono ko inaam deta hai.<br><strong>Kamiyaan:</strong> (1) TF seedha badhta hai, to jis video description mein "cricket" 50 baar spam kiya gaya, wo jeet jaata hai. (2) Lamba document zyada words rakhta hai, to usme match ke chances apne aap zyada.` },
      { type: 'callout', tone: 'term', title: 'BM25', html: `<strong>Ye kya hai:</strong> BM25 (Best Match 25) TF-IDF ka sudhra hua roop. Do knobs: <strong>k1</strong> (word baar baar aane ka faayda ek chhat tak) aur <strong>b</strong> (lambe document ko kitni saza).<br><strong>Kyun chahiye:</strong> spam aur lambe documents ka unfair faayda khatam. Lucene (Elasticsearch, OpenSearch, Solr ke andar ki library) ka default scoring yahi hai.<br><strong>Iske bina:</strong> keyword-stuffed videos upar, asli achhi videos neeche.` },
      { type: 'p', html: `Ek term ka BM25 score:` },
      { type: 'code', text: `score(term, doc) = IDF × tf × (k1 + 1) / ( tf + k1 × (1 − b + b × docLength / avgDocLength) )

IDF = ln( 1 + (N − df + 0.5) / (df + 0.5) )

defaults:  k1 = 1.2   (tf kitni jaldi "saturate" ho)
           b  = 0.75  (lambe document ko kitni saza mile)` },
      { type: 'list', items: [
        `<strong>Saturation (k1):</strong> pehli 2-3 baar word aana bahut maayne rakhta hai, 50vi baar lagbhag kuch nahi. Ek term ka score kabhi IDF × (k1+1) se upar nahi jaata. Spam karne se faayda nahi.`,
        `<strong>Length normalization (b):</strong> document average se lamba hai to uska tf thoda "halka" gina jaata hai. b = 0 matlab length ki parwaah nahi, b = 1 matlab poori.`,
        `Dhyaan do: Lucene 8 se BM25 ke numerator mein (k1 + 1) wala hissa hata diya gaya, kyunki wo har document ke liye same constant hai aur ranking order nahi badalta. Isliye Elasticsearch ke score is formula se thode alag numbers dikha sakte hain, order wahi rehta hai.`,
      ]},
      { type: 'p', html: `Slider ghuma ke dekho ki ek word baar baar aane pe score kaise badhta hai (ek term ka hissa, IDF chhod ke):` },
      { type: 'custom', render(el) {
        el.innerHTML = `<div class="row2">
            <div><label>k1 (saturation): <strong class="s2-k1v"></strong></label><input class="s2-k1" type="range" min="0.2" max="3" step="0.1" value="1.2"></div>
            <div><label>b (length ka asar): <strong class="s2-bv"></strong></label><input class="s2-b" type="range" min="0" max="1" step="0.05" value="0.75"></div>
            <div><label>Document length ÷ average: <strong class="s2-lv"></strong></label><input class="s2-l" type="range" min="0.25" max="4" step="0.25" value="1"></div>
          </div>
          <svg class="s2-svg" viewBox="0 0 340 190" style="width:100%;max-width:520px;display:block;margin-top:12px"></svg>
          <div class="stats">
            <div class="stat"><span>tf = 1</span><strong class="s2-t1"></strong></div>
            <div class="stat"><span>tf = 3</span><strong class="s2-t3"></strong></div>
            <div class="stat"><span>tf = 10</span><strong class="s2-t10"></strong></div>
            <div class="stat"><span>Chhat (max), k1 + 1</span><strong class="s2-cap"></strong></div>
          </div>
          <div class="calc-note s2-note"></div>`;
        const k1E = el.querySelector('.s2-k1'), bE = el.querySelector('.s2-b'), lE = el.querySelector('.s2-l');
        const svg = el.querySelector('.s2-svg');
        const X = tf => 30 + tf / 20 * 300, Y = v => 170 - v / 5 * 160;
        const upd = () => {
          const k1 = +k1E.value, b = +bE.value, L = +lE.value;
          el.querySelector('.s2-k1v').textContent = k1.toFixed(1);
          el.querySelector('.s2-bv').textContent = b.toFixed(2);
          el.querySelector('.s2-lv').textContent = L.toFixed(2) + '×';
          let bm = '', lin = '';
          for (let t = 0; t <= 20; t += 0.25) {
            bm += (t ? 'L' : 'M') + X(t).toFixed(1) + ' ' + Y(T.bm25tf(t, k1, b, L)).toFixed(1) + ' ';
          }
          lin = `M${X(0)} ${Y(0)} L${X(5)} ${Y(5)}`;
          let grid = '';
          for (let v = 0; v <= 5; v++) grid += `<line x1="30" y1="${Y(v)}" x2="330" y2="${Y(v)}" stroke="var(--line)" stroke-width="1"/><text x="24" y="${Y(v) + 4}" font-size="10" text-anchor="end" fill="var(--ink-3)">${v}</text>`;
          [0, 5, 10, 15, 20].forEach(t => { grid += `<text x="${X(t)}" y="184" font-size="10" text-anchor="middle" fill="var(--ink-3)">${t}</text>`; });
          svg.innerHTML = grid +
            `<path d="${lin}" stroke="var(--amber)" stroke-width="2.5" fill="none" stroke-dasharray="6 4"/>` +
            `<path d="${bm}" stroke="var(--accent)" stroke-width="3" fill="none"/>` +
            `<line x1="30" y1="${Y(k1 + 1)}" x2="330" y2="${Y(k1 + 1)}" stroke="var(--accent)" stroke-width="1" stroke-dasharray="2 3"/>` +
            `<text x="95" y="22" font-size="11" fill="var(--amber)">TF-IDF: seedha badhta hai</text>` +
            `<text x="325" y="${Math.max(12, Y(k1 + 1) - 6)}" font-size="11" text-anchor="end" fill="var(--accent)">BM25</text>` +
            `<text x="180" y="168" font-size="10" text-anchor="middle" fill="var(--ink-3)">tf (word kitni baar aaya) →</text>`;
          const v1 = T.bm25tf(1, k1, b, L), v3 = T.bm25tf(3, k1, b, L), v10 = T.bm25tf(10, k1, b, L);
          el.querySelector('.s2-t1').textContent = v1.toFixed(2);
          el.querySelector('.s2-t3').textContent = v3.toFixed(2);
          el.querySelector('.s2-t10').textContent = v10.toFixed(2);
          el.querySelector('.s2-cap').textContent = (k1 + 1).toFixed(2);
          el.querySelector('.s2-note').textContent = `10 baar aane wala word, 1 baar wale se sirf ${(v10 / v1).toFixed(1)}x score deta hai, 10x nahi. Document lamba karo (length slider) to har tf ka score neeche aata hai; b = 0 karo to length ka asar khatam.`;
        };
        [k1E, bE, lE].forEach(x => x.addEventListener('input', upd)); upd();
      }},
      { type: 'h3', text: 'Score calculator: TF-IDF vs BM25, step by step' },
      { type: 'p', html: `<strong>Worked example:</strong> xyz.com pe N = 10 lakh videos. Word "googly" sirf 1,000 videos mein hai (df = 1,000). Ek video mein ye 3 baar aaya (tf = 3), aur video ki length average jitni hai.<br>TF-IDF: idf = ln(10,00,000 / 1,000) = 6.908, score = 3 × 6.908 = <strong>20.72</strong>.<br>BM25: idf = ln(1 + (10,00,000 − 1,000 + 0.5) / (1,000 + 0.5)) = 6.907. tf hissa = 3 × 2.2 / (3 + 1.2) = 1.571. Score = 6.907 × 1.571 = <strong>10.85</strong>.<br>Ab presets dabao: spam (tf = 50) pe TF-IDF 345 ho jaata hai, BM25 sirf 14.84 (chhat 15.20). Common word "video" (df = 9 lakh) ka BM25 sirf 0.17. Lamba document (4× average) ka BM25 10.85 se gir ke 6.61.` },
      { type: 'custom', render(el) {
        const F = [['N', 'Kul documents (N)', 1000000], ['df', 'Kitne documents mein ye word (df)', 1000], ['tf', 'Is document mein kitni baar (tf)', 3], ['dl', 'Is document ki length (terms)', 100], ['avg', 'Average length (terms)', 100], ['k1', 'k1', 1.2], ['b', 'b', 0.75]];
        const PRE = [['Rare word "googly"', { df: 1000, tf: 3, dl: 100 }], ['Common word "video"', { df: 900000, tf: 3, dl: 100 }], ['Spam: tf = 50', { df: 1000, tf: 50, dl: 100 }], ['Lamba document', { df: 1000, tf: 3, dl: 400 }]];
        el.innerHTML = `<div class="bmPre" style="display:flex;flex-wrap:wrap;gap:8px"></div>
          <div class="row2" style="margin-top:10px">${F.map(([k, l, v]) => `<div><label for="bm_${k}">${l}</label><input id="bm_${k}" type="number" min="0" step="any" value="${v}"></div>`).join('')}</div>
          <pre class="ascii bmCalc" style="margin-top:12px;white-space:pre-wrap"></pre>
          <div class="stats">
            <div class="stat"><span>TF-IDF</span><strong class="bmTf"></strong></div>
            <div class="stat"><span>BM25</span><strong class="bmBm"></strong></div>
            <div class="stat"><span>BM25 ki chhat (tf → ∞)</span><strong class="bmCap"></strong></div>
          </div>
          <div class="calc-note bmNote"></div>`;
        const q = s => el.querySelector(s);
        const v = k => Math.max(0, Number(q('#bm_' + k).value) || 0);
        PRE.forEach(([n, o]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = n; b.onclick = () => { Object.keys(o).forEach(k => { q('#bm_' + k).value = o[k]; }); upd(); }; q('.bmPre').appendChild(b); });
        const upd = () => {
          const N = v('N'), df = Math.min(v('df'), N), tf = v('tf'), dl = v('dl'), avg = v('avg') || 1, k1 = v('k1'), b = Math.min(1, v('b'));
          const idfT = df ? Math.log(N / df) : 0;
          const idfB = Math.log(1 + (N - df + 0.5) / (df + 0.5));
          const norm = k1 * (1 - b + b * dl / avg);
          const part = tf ? (tf * (k1 + 1)) / (tf + norm) : 0;
          const tfidf = tf * idfT, bm = idfB * part;
          q('.bmCalc').textContent =
`TF-IDF:  idf = ln(N / df) = ln(${N} / ${df}) = ${fx(idfT)}
         score = tf × idf = ${tf} × ${fx(idfT)} = ${fx(tfidf)}

BM25:    idf  = ln(1 + (N − df + 0.5) / (df + 0.5)) = ${fx(idfB)}
         norm = k1 × (1 − b + b × dl/avg) = ${k1} × (1 − ${b} + ${b} × ${fx(dl / avg, 2)}) = ${fx(norm)}
         tf part = tf × (k1 + 1) / (tf + norm) = ${tf} × ${fx(k1 + 1, 2)} / (${tf} + ${fx(norm)}) = ${fx(part)}
         score = idf × tf part = ${fx(idfB)} × ${fx(part)} = ${fx(bm)}`;
          q('.bmTf').textContent = fx(tfidf, 2); q('.bmBm').textContent = fx(bm, 2); q('.bmCap').textContent = fx(idfB * (k1 + 1), 2);
          q('.bmNote').textContent = `BM25 ka ek term kabhi ${fx(idfB * (k1 + 1), 2)} (idf × (k1 + 1)) se upar nahi jaata, tf kitna bhi ho. TF-IDF ki koi chhat nahi: tf 10 guna to score 10 guna. Common word ka idf chhota, to uska score bhi chhota.`;
        };
        el.querySelectorAll('input').forEach(x => x.addEventListener('input', upd));
        upd();
      }},
      { type: 'callout', tone: 'tip', title: 'Asli ranking sirf BM25 nahi', html: `Real products BM25 ko ek "pehli chhanni" ki tarah use karte hain. Uske upar aur signals judte hain: views, likes, freshness (nayi video), user ki language, click-through. Bade systems pehle BM25 se top ~1000 nikaalte hain, phir ek ML model un 1000 ko dobara rank karta hai (re-ranking). Field boosting bhi common hai: title mein match, description mein match se zyada keemti.` },

      { type: 'h2', text: 'Elasticsearch / OpenSearch andar se' },
      { type: 'p', html: `Inverted index ek machine pe bana lena aasaan hai. Lekin xyz.com ke crores videos aur hazaaron searches per second ek machine pe nahi samaate. <strong>Elasticsearch</strong> (aur uska open-source fork <strong>OpenSearch</strong>) Lucene ko lekar usse distributed bana dete hain.` },
      { type: 'callout', tone: 'term', title: 'Elasticsearch index aur node', html: `<strong>Ye kya hai:</strong> Elasticsearch mein <strong>index</strong> = documents ka ek collection (jaise "videos"), database ki table jaisa. <strong>Node</strong> = cluster ki ek machine (server).<br><strong>Kyun chahiye:</strong> ek index ka data kai nodes pe baant ke rakhna hai.<br><strong>Iske bina:</strong> sab kuch ek machine pe, aur us machine ki RAM/disk/CPU hi limit.` },
      { type: 'callout', tone: 'term', title: 'Shard', html: `<strong>Ye kya hai:</strong> index ka ek tukda. Har shard apne aap mein ek poora Lucene index hai. Index ko 3 shards mein baanta to har shard ~1/3 documents rakhta hai, alag machines pe.<br><strong>Kyun chahiye:</strong> crores documents ek machine mein nahi samaate, aur 3 machines ek saath search karein to tez.<br><strong>Iske bina:</strong> ek machine ki limit hi poore search ki limit.` },
      { type: 'callout', tone: 'term', title: 'Replica', html: `<strong>Ye kya hai:</strong> shard ki poori copy, hamesha doosri machine pe. Original ko <strong>primary</strong> kehte hain.<br><strong>Kyun chahiye:</strong> machine gire to data bacha rahe (replica primary ban jaati hai), aur searches replicas pe bhi baant sakte hain.<br><strong>Iske bina:</strong> ek machine gayi = us shard ka data search se gayab.` },
      { type: 'callout', tone: 'term', title: 'Segment aur refresh', html: `<strong>Ye kya hai:</strong> <strong>segment</strong> = shard ke andar ek chhota, kabhi na badalne wala (immutable) inverted index. Naye documents pehle memory buffer mein jaate hain; <strong>refresh</strong> unhe ek naye segment mein daal ke searchable banata hai. Background mein chhote segments merge hote rehte hain.<br><strong>Kyun chahiye:</strong> immutable files ko cache karna aur bina lock ke padhna aasaan hai.<br><strong>Iske bina (keemat):</strong> naya document turant nahi dikhta; refresh tak wait.` },
      { type: 'list', items: [
        `Document kis shard mein jaayega: <code>shard = hash(document id) % primary shards ki ginti</code> (simplified). Isiliye primary shards ki ginti index banne ke baad badal nahi sakte; badalni ho to naya index banao aur data "reindex" karo. Elasticsearch mein default 1 primary shard aur 1 replica hai.<br><em>Example:</em> 3 shards, document "v901": maan lo hash("v901") = 3,141,592,654. 3,141,592,654 % 3 = 1, to shard 1. Agar baad mein shards 4 kar dein to % 4 = 2: ab Elasticsearch is document ko shard 2 mein dhoondhega, jabki wo shard 1 mein pada hai. Isiliye ginti fixed.`,
        `Ek primary aur uski replica kabhi same machine (node) pe nahi rakhi jaati, warna ek machine gire to dono gaye.`,
        `<strong>Near real-time:</strong> naya document turant searchable nahi hota. Elasticsearch har ~1 second mein <strong>refresh</strong> karta hai: naya segment khulta hai aur tab document search mein dikhta hai. (Jis index pe pichhle 30 second se koi search nahi aayi, us pe ye automatic refresh ruk jaata hai, resources bachane ke liye.)`,
      ]},
      { type: 'flow', title: 'Elasticsearch cluster: 3 primary shards (P0, P1, P2), har ek ki ek replica (R0, R1, R2)', height: 340,
        nodes: [
          { id: 'app', label: 'xyz.com app', sub: 'search API', x: 90, y: 170, w: 140, kind: 'server', info: 'Ye kya hai: xyz.com ka apna backend. User ki query leta hai aur Elasticsearch ko JSON query bhejta hai. User seedha Elasticsearch se baat nahi karta.' },
          { id: 'co', label: 'Coordinating', sub: 'koi bhi node', x: 310, y: 170, w: 150, kind: 'net', info: 'Ye kya hai: cluster ki koi bhi node jo is request ki manager bani. Jis node pe request aayi wo "coordinator" ban jaata hai: query har shard (primary ya replica, koi ek copy) ko bhejta hai, sabke top results merge karta hai, phir final documents mangwata hai. Is pattern ko scatter-gather kehte hain.' },
          { id: 'n1', label: 'Data node 1', sub: 'P0, R2', x: 570, y: 60, w: 170, kind: 'data', info: 'Ye kya hai: data rakhne wali machine. Shard 0 ka primary aur shard 2 ki replica. Har shard ek poora Lucene index hai, apne segments ke saath.' },
          { id: 'n2', label: 'Data node 2', sub: 'P1, R0', x: 570, y: 170, w: 170, kind: 'data', info: 'Ye kya hai: doosri data machine. Shard 1 ka primary aur shard 0 ki replica. Primary aur uski replica kabhi same node pe nahi hote.' },
          { id: 'n3', label: 'Data node 3', sub: 'P2, R1', x: 570, y: 280, w: 170, kind: 'data', info: 'Ye kya hai: teesri data machine. Shard 2 ka primary aur shard 1 ki replica.' },
        ],
        edges: [{ a: 'app', b: 'co' }, { a: 'co', b: 'n1' }, { a: 'co', b: 'n2' }, { a: 'co', b: 'n3' }, { a: 'n1', b: 'n2', id: 'rep', dashed: true }],
        scenarios: [
          { name: 'Search (scatter-gather)', steps: [
            { title: 'Query aayi', text: 'User ne "cricket batting" search kiya. App ek query bhejta hai.', go: 'app>co', msg: 'GET /videos/_search  { "query": { "match": { "title": "cricket batting" } }, "size": 10 }' },
            { title: 'Scatter: har shard se poochho', text: 'Har shard ke paas sirf 1/3 data hai, to teeno se poochhna padega. Har shard apne andar BM25 se apne top 10 nikaalta hai (sirf IDs aur scores).', parallel: true, go: ['co>n1', 'co>n2', 'co>n3'] },
            { title: 'Gather: merge', text: 'Teen lists (30 results) aayi, coordinator unhe score se sort karke global top 10 chunta hai. Is phase ko <strong>query phase</strong> kehte hain.', parallel: true, go: ['res:n1>co', 'res:n2>co', 'res:n3>co'], msg: 'shard0: [v12: 7.1, v88: 6.4 ...]\nshard1: [v45: 8.0 ...]\nshard2: [v7: 6.9 ...]' },
            { title: 'Fetch phase', text: 'Ab sirf un 10 documents ka poora data (title, thumbnail) unke shards se mangwaya, aur app ko bhej diya.', go: ['co>n2', 'res:n2>co', 'res:co>app'] },
            { title: 'Dhyaan do: sabse dheema shard', text: 'Total time = sabse slow shard ka time. Ek shard pe GC pause ya hot node ho to poori search slow. Isiliye p99 latency monitor karte hain aur bahut zyada shards nahi banaate.', focus: ['co'] },
          ]},
          { name: 'Naya document + refresh', steps: [
            { title: 'Index request', text: 'Nayi video aayi. hash(id) % 3 = 0, to ye shard 0 mein jaayegi. Shard 0 ka primary Node 1 pe hai.', go: 'app>co>n1', msg: 'PUT /videos/_doc/v901  { "title": "Cricket batting drills" }' },
            { title: 'Replica ko copy', text: 'Primary pehle khud likhta hai, phir replica (Node 2 pe R0) ko bhejta hai. Dono ke paas aane ke baad hi "ho gaya" (ack).', go: ['n1>n2', 'res:n2>n1', 'res:n1>co>app'], after: { n1: { sub: 'P0 +v901 (buffer)' } } },
            { title: 'Turant search: nahi mila!', text: 'Abhi document memory buffer mein hai, kisi segment mein nahi. Refresh se pehle search use nahi dekh sakti.', go: ['app>co>n1', 'res:n1>co>app'], set: { n1: { state: 'warn' } }, msg: 'hits: 0' },
            { title: '~1 second baad refresh', text: 'Refresh ne naya segment khola. Ab document searchable hai. Isiliye kehte hain: Elasticsearch <strong>near real-time</strong> hai, real-time nahi.', go: ['app>co>n1', 'res:n1>co>app'], set: { n1: { state: 'ok', sub: 'P0, R2 (refreshed)' } }, msg: 'hits: 1  (v901)' },
          ]},
          { name: 'Node 1 crash', steps: [
            { title: 'Node 1 gir gaya', text: 'Uske saath P0 aur R2 dono gaye.', set: { n1: { state: 'down', sub: 'DOWN' } }, go: 'lost:co>n1' },
            { title: 'Replica promote', text: 'Shard 0 ki replica (R0) Node 2 pe hai. Cluster use naya primary bana deta hai. Shard 2 ka primary Node 3 pe safe hai. Data ka ek bhi tukda nahi khoya.', after: { n2: { state: 'ok', sub: 'P1, P0 (promoted)' } }, focus: ['n2'] },
            { title: 'Search chalti rehti hai', text: 'Har shard ki ek copy abhi bhi zinda hai, to search poori results deti hai. Cluster health "yellow" hai: data safe, lekin kuch replicas missing. Background mein naye replicas bachi hui nodes pe bante hain.', parallel: true, go: ['co>n2', 'co>n3', 'res:n2>co', 'res:n3>co'] },
            { title: 'Agar replica hoti hi nahi?', text: '0 replicas ke saath Node 1 girne pe shard 0 aur 2 ka data unavailable: cluster "red", search adhoore results deti hai. Production mein kam se kam 1 replica.', focus: ['n1'] },
          ]},
        ],
      },
      { type: 'h3', text: 'Cluster lab: shards, replicas aur health' },
      { type: 'p', html: `Elasticsearch cluster ki health teen rangon mein batata hai. <strong>Green</strong> = har shard ki saari copies chal rahi hain. <strong>Yellow</strong> = saara data available hai, lekin kuch replicas missing (ek aur machine giri to khatra). <strong>Red</strong> = kisi shard ki ek bhi copy nahi: wo data search mein nahi aayega. Neeche shards, replicas aur nodes badlo, phir nodes pe click karke unhe "maaro". (Placement yahan simplified round-robin hai; asli Elasticsearch disk aur load bhi dekhta hai, lekin "ek shard ki do copies ek node pe nahi" wala rule same hai.)` },
      { type: 'custom', render(el) {
        el.innerHTML = `<div class="row2">
            <div><label for="esP">Primary shards: <strong class="esPV"></strong></label><input id="esP" type="range" min="1" max="6" step="1" value="3"></div>
            <div><label for="esR">Replicas (har shard ki): <strong class="esRV"></strong></label><input id="esR" type="range" min="0" max="2" step="1" value="1"></div>
            <div><label for="esM">Nodes (machines): <strong class="esMV"></strong></label><input id="esM" type="range" min="1" max="5" step="1" value="3"></div>
            <div><label for="esD">Document id (routing)</label><input id="esD" type="text" value="v901" style="font-family:var(--f-mono)"></div>
          </div>
          <div class="esNodes" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px"></div>
          <div class="esHealth" style="margin-top:10px;font:700 16px var(--f-display)"></div>
          <div class="calc-note esNote"></div>`;
        const q = s => el.querySelector(s);
        let dead = new Set();
        const h32 = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h; };
        const upd = () => {
          const P = +q('#esP').value, R = +q('#esR').value, M = +q('#esM').value;
          q('.esPV').textContent = P; q('.esRV').textContent = R; q('.esMV').textContent = M;
          dead = new Set([...dead].filter(n => n < M));
          // Simplified placement: copy c of shard s goes to node (s + c) % M. Same shard ki do copies ek node pe nahi; jagah na ho to unassigned.
          const nodes = Array.from({ length: M }, () => []);
          const unassigned = [];
          const shards = [];
          for (let s = 0; s < P; s++) {
            const copies = [];
            for (let c = 0; c <= R; c++) { if (c < M) { const n = (s + c) % M; nodes[n].push({ s, c }); copies.push(n); } else unassigned.push({ s, c }); }
            shards.push(copies);
          }
          const live = shards.map(cp => cp.filter(n => !dead.has(n)));
          const red = live.some(l => l.length === 0);
          const missingCopies = shards.reduce((a, cp, s) => a + (R + 1 - live[s].length), 0);
          const health = red ? 'red' : missingCopies ? 'yellow' : 'green';
          const box = q('.esNodes'); box.innerHTML = '';
          nodes.forEach((list, n) => {
            const b = document.createElement('button'); b.type = 'button';
            const d = dead.has(n);
            b.style.cssText = `min-width:96px;text-align:left;padding:8px 10px;border-radius:var(--r-sm);cursor:pointer;border:1px solid ${d ? 'var(--red)' : 'var(--line-2)'};background:${d ? 'var(--surface-2)' : 'var(--surface)'};color:var(--ink);opacity:${d ? 0.6 : 1}`;
            b.innerHTML = `<div style="font-weight:700">Node ${n + 1}${d ? ' (DOWN)' : ''}</div><div style="font:12px var(--f-mono);margin-top:4px">${list.map(({ s, c }) => {
              const prim = live[s][0] === n && !d;
              return `<span style="display:inline-block;margin:2px;padding:1px 6px;border-radius:6px;background:${prim ? 'var(--accent-soft)' : 'var(--surface-2)'};color:${d ? 'var(--ink-3)' : 'var(--ink)'};${d ? 'text-decoration:line-through;' : ''}">${prim ? 'P' : 'R'}${s}</span>`;
            }).join('') || '-'}</div>`;
            b.setAttribute('aria-pressed', d ? 'true' : 'false');
            b.onclick = () => { if (dead.has(n)) dead.delete(n); else dead.add(n); upd(); };
            box.appendChild(b);
          });
          const hc = { green: 'var(--green)', yellow: 'var(--amber)', red: 'var(--red)' }[health];
          q('.esHealth').textContent = `Cluster health: ${health.toUpperCase()}`;
          q('.esHealth').style.color = hc;
          const id = q('#esD').value || 'v901', sh = h32(id) % P;
          const where = live[sh].length ? live[sh].map(n => 'Node ' + (n + 1)).join(', ') : 'koi zinda copy nahi!';
          const why = health === 'green' ? 'Har shard ki saari copies zinda.' : health === 'yellow' ? `Data poora hai (jahan primary mara, wahan replica primary ban gayi), lekin ${missingCopies} copy/copies missing ya unassigned.` : 'Kisi shard ki ek bhi copy zinda nahi: wo data abhi search mein nahi aayega.';
          q('.esNote').textContent = `${P} primary × ${R + 1} copies = ${P * (R + 1)} shard copies, ${M} nodes pe. ${why} ${unassigned.length ? `${unassigned.length} replica(s) assign hi nahi hui: ek shard ki do copies ek node pe nahi rakhte, aur nodes kam hain. ` : ''}Routing: hash("${id}") % ${P} = shard ${sh} → ${where}. Node pe click karke use maaro / zinda karo.`;
        };
        el.querySelectorAll('input').forEach(x => x.addEventListener('input', upd));
        upd();
      }},
      { type: 'callout', tone: 'mistake', title: 'Elasticsearch ko main database mat banao', html: `Elasticsearch search ke liye zabardast hai, lekin transactions, strong consistency aur "paisa / order ka record" ke liye nahi bana. Mapping galat ho to poora reindex karna padta hai. Isliye pattern ye hai: <strong>database source of truth, search index uski ek copy</strong> jo kabhi bhi dobara banayi ja sake.` },

      { type: 'h2', text: 'Search ko database ke saath sync kaise rakhein?' },
      { type: 'p', html: `Ab do jagah data hai: Postgres (asli) aur Elasticsearch (copy). Kisi ne video ka title badla, to search index mein bhi badalna chahiye. Pehla idea: app dono jagah likhe ("dual write"). Problem: DB mein likha gaya, phir ES ko likhte waqt network fail ya app crash, ab dono alag. Ya do updates ulte order mein ES pahunche aur purana title jeet gaya. Ye galtiyaan chupchaap hoti hain aur dhoondhna mushkil hai.` },
      { type: 'callout', tone: 'term', title: 'CDC (Change Data Capture)', html: `<strong>Ye kya hai:</strong> database ke changes ko "pakadne" ka tareeka. Har database apne changes pehle ek log mein likhta hai (Postgres mein WAL = write-ahead log, MySQL mein binlog), crash recovery aur replication ke liye. CDC tool (jaise <strong>Debezium</strong>) us log ko padh ke har INSERT/UPDATE/DELETE ko ek event bana ke Kafka mein daal deta hai.<br><strong>Kyun chahiye:</strong> app ko kuch extra nahi karna: jo DB mein commit hua, wahi event bana, usi order mein.<br><strong>Iske bina:</strong> dual write: app dono jagah likhe, aur aadha fail hone pe dono copies chupchaap alag.` },
      { type: 'flow', title: 'Postgres → Debezium → Kafka → Indexer → Elasticsearch', height: 300,
        nodes: [
          { id: 'app', label: 'xyz.com app', sub: 'writes + search', x: 90, y: 70, w: 140, kind: 'server', info: 'Ye kya hai: xyz.com ka backend. Writes sirf database mein karta hai. Search queries Elasticsearch se padhta hai.' },
          { id: 'db', label: 'Postgres', sub: 'source of truth', x: 80, y: 230, w: 120, kind: 'data', info: 'Ye kya hai: main database, source of truth (asli data). Har commit pehle WAL (write-ahead log) mein jaata hai.' },
          { id: 'cdc', label: 'Debezium', sub: 'WAL padhta', x: 230, y: 230, w: 120, kind: 'server', info: 'Ye kya hai: CDC tool (connector). Postgres ke WAL ko logical decoding se padhta hai aur har row change ko event banata hai. Kahan tak padha, ye position (offset) yaad rakhta hai, to restart pe wahin se shuru.' },
          { id: 'k', label: 'Kafka', sub: 'change events', x: 380, y: 230, w: 120, kind: 'queue', info: 'Ye kya hai: events ki durable stream (Kafka lesson). Events durable log mein rakhta hai. Video id ko key banao to ek video ke saare changes ek partition mein, sahi order mein. Consumer gir jaaye to events yahin wait karte hain.' },
          { id: 'ix', label: 'Indexer', sub: 'consumer', x: 530, y: 230, w: 120, kind: 'server', info: 'Ye kya hai: hamara chhota consumer program. Kafka se events padh ke Elasticsearch document banata/update/delete karta hai. Document id = video id rakhte hain, to same event do baar aaye to bhi result same (idempotent).' },
          { id: 'es', label: 'Elasticsearch', sub: 'search copy', x: 630, y: 90, w: 140, kind: 'cache', info: 'Ye kya hai: search engine. Search ke liye copy. Thoda peeche ho sakti hai (seconds), lekin kabhi bhi Kafka/DB se dobara banayi ja sakti hai.' },
        ],
        edges: [{ a: 'app', b: 'db' }, { a: 'db', b: 'cdc' }, { a: 'cdc', b: 'k' }, { a: 'k', b: 'ix' }, { a: 'ix', b: 'es' }, { a: 'app', b: 'es', dashed: true }],
        scenarios: [
          { name: 'Happy path', steps: [
            { title: 'Title update', text: 'Creator ne video ka title badla. App sirf Postgres mein likhta hai.', go: ['app>db', 'res:db>app'], msg: 'UPDATE videos SET title = \'Cricket batting masterclass\' WHERE id = 42' },
            { title: 'WAL se event', text: 'Commit WAL mein gaya. Debezium ne padha aur event banaya.', go: 'evt:db>cdc>k', msg: '{ "op": "u", "id": 42, "before": {...}, "after": { "title": "Cricket batting masterclass" } }' },
            { title: 'Indexer ES update karta hai', text: 'Consumer ne event uthaya aur document 42 overwrite kar diya.', go: 'evt:k>ix>es', after: { es: { state: 'ok', sub: 'v42 updated' } } },
            { title: 'Search mein naya title', text: 'Refresh ke baad search naya title dikhati hai. Poora safar aam taur pe ek-do second.', go: ['app>es', 'res:es>app'] },
          ]},
          { name: 'Lag: purana result', steps: [
            { title: 'Update kiya, turant search kiya', text: 'Creator ne title badla aur 200 ms mein khud search kiya.', go: ['app>db', 'res:db>app'] },
            { title: 'Event abhi raaste mein', text: 'Event Kafka mein hai, indexer tak nahi pahuncha (ya ES refresh baaki hai).', go: 'evt:db>cdc>k', set: { k: { state: 'warn', sub: '1 event pending' } } },
            { title: 'Search purana title deti hai', text: 'Ye <strong>eventual consistency</strong> hai: copy thodi der peeche. Search ke liye aam taur pe theek. Fix agar creator ko khatakta hai: apni edit wali screen DB se dikhao, ya UI mein naya title turant dikha do.', go: ['app>es', 'res:es>app'], set: { es: { state: 'warn', sub: 'purana title' } }, msg: 'hits: "Cricket batting tips" (purana)' },
            { title: 'Thodi der mein theek', text: 'Event pahuncha, index update.', go: 'evt:k>ix>es', set: { k: { state: '', sub: 'change events' } }, after: { es: { state: 'ok', sub: 'naya title' } } },
          ]},
          { name: 'Elasticsearch down', steps: [
            { title: 'ES cluster gir gaya', text: 'Indexer likh nahi paa raha.', set: { es: { state: 'down', sub: 'DOWN' } }, go: 'bad:ix>es' },
            { title: 'Writes chalti rehti hain', text: 'Uploads aur edits normal, kyunki app sirf Postgres mein likhta hai. Events Kafka mein jama ho rahe hain (backlog / consumer lag).', flood: { paths: ['evt:db>cdc>k'], n: 8 }, after: { k: { state: 'warn', sub: 'backlog: 50k events' } } },
            { title: 'Search ke liye fallback', text: 'Search box "abhi search unavailable" dikhata hai, ya bahut simple DB query (sirf title prefix pe) se kaam chalata hai. Baaki site zinda.', go: 'bad:app>es' },
            { title: 'ES wapas, catch-up', text: 'Indexer apne last offset se padhna shuru karta hai aur backlog khatam karta hai. Kuch nahi khoya, kyunki Kafka ne events sambhal ke rakhe the.', set: { es: { state: 'ok', sub: 'catching up' } }, flood: { paths: ['evt:k>ix>es'], n: 8 }, after: { k: { state: '', sub: 'lag 0' } } },
          ]},
          { name: 'Dual write ka jaal', intro: 'Agar CDC ki jagah app khud dono jagah likhta.', steps: [
            { title: 'DB mein likha', text: 'Pehla write safal.', set: { cdc: { state: 'dim' }, k: { state: 'dim' }, ix: { state: 'dim' } }, go: ['app>db', 'res:db>app'] },
            { title: 'ES write fail', text: 'Network timeout. App crash ho gaya ya retry bhool gaya.', go: 'lost:app>es' },
            { title: 'Chupchaap mismatch', text: 'DB mein naya title, search mein purana. Hamesha ke liye, jab tak koi poora reindex na kare. Isiliye: ek hi jagah likho (DB), baaki copies log se banao.', set: { es: { state: 'warn', sub: 'galat data' } }, focus: ['es', 'db'] },
          ]},
        ],
      },
      { type: 'list', items: [
        `<strong>Delete bhi event hai:</strong> Debezium delete pe ek event bhejta hai, indexer ES se document hata deta hai. Soft delete (is_deleted = true) ho to wo update event hai.`,
        `<strong>Order:</strong> Kafka partition key = video id, taaki ek video ke changes order mein aayein. Extra safety: ES document ke saath version (jaise DB ka updated_at ya log position) bhejo, purana version naye ko overwrite na kare.`,
        `<strong>Poora reindex:</strong> mapping/analyzer badalna ho to naya index banao, DB se bulk copy karo, CDC events chalne do, phir ek "alias" ko naye index pe switch kar do. Users ko pata bhi nahi chalta.`,
      ]},
      { type: 'callout', tone: 'why', title: 'Decide', html: `Database ko <strong>source of truth</strong> rakho aur search index ko usse <strong>asynchronously</strong> (CDC + Kafka ke through) bharo. Search kuch seconds peeche ho sakti hai; zyadatar products ke liye ye bilkul theek hai. Search sirf tab lagao jab full-text, typo-tolerance, ranking ya facets (filters jaise "duration: 4-20 min") chahiye; sirf "ID se lookup" ke liye database kaafi hai.` },

      { type: 'h2', text: 'Autocomplete: har keystroke pe suggestion' },
      { type: 'p', html: `User "cri" type karta hai aur neeche turant "cricket live score", "cricket highlights" aa jaate hain. Har keystroke ek nayi request hai, aur ~50 ms ke andar jawab chahiye warna typing ke saath suggestions "kaanpte" hain. Full search query har keystroke pe bahut bhaari hai. Iske liye ek alag structure: <strong>trie</strong>.` },
      { type: 'callout', tone: 'term', title: 'Trie (prefix tree)', html: `<strong>Ye kya hai:</strong> ek tree jisme har edge ek character hai. Root se "c" → "r" → "i" chalte jaao, to jis node pe pahunche uske neeche wale saare words "cri" se shuru hote hain.<br><strong>Kyun chahiye:</strong> prefix dhoondhna = prefix ki length jitne steps, chahe dictionary mein crores words hon.<br><strong>Iske bina:</strong> har keystroke pe saari queries scan karke "cri se shuru" wali dhoondhni padti.` },
      { type: 'callout', tone: 'term', title: 'Top-k', html: `<strong>Ye kya hai:</strong> sabse upar ke k items (yahan k = 3: sabse zyada search hui 3 queries).<br><strong>Kyun chahiye:</strong> user ko 3-10 suggestions hi dikhte hain, saare nahi.<br><strong>Iske bina:</strong> "c" ke neeche lakhon queries ko har baar gin ke sort karna: bahut slow.` },
      { type: 'p', html: `Sirf trie kaafi nahi: "c" ke neeche lakhon queries hain, har baar sabko gin ke top 3 nikaalna slow hai. Trick: har node pe uske <strong>top-k suggestions pehle se save</strong> kar do. Ab lookup = prefix tak chalo, wahan rakhi list utha lo. Ye top-k lists ek offline job query logs se (jaise har ghante/din) dobara banata hai.` },
      { type: 'custom', render(el) {
        const BASE = [['cricket live score', 1200], ['cricket', 900], ['cricket highlights', 700], ['cricket world cup', 650], ['cr7 goals', 500],
          ['crypto news', 400], ['crime thriller movies', 300], ['comedy videos', 450], ['coding tutorial', 350], ['camera review', 250], ['college lectures', 200], ['chess openings', 380]];
        let counts = BASE.map(x => x.slice());
        el.innerHTML = `<div class="row2">
            <div><label>Type karo (prefix)</label><input type="text" class="tr-p" value="cri" autocomplete="off"></div>
            <div><label>Koi search karo (uska count +100)</label><div style="display:flex;gap:8px;flex-wrap:wrap"><input type="text" class="tr-s" value="cricket highlights" style="max-width:200px"><button type="button" class="btn small primary tr-go">Search</button><button type="button" class="btn small ghost tr-rs">Reset</button></div></div>
          </div>
          <div class="tr-path" style="font:14px/1.7 var(--f-mono);margin-top:12px"></div>
          <div class="tr-sug" style="margin-top:8px"></div>
          <div class="stats">
            <div class="stat"><span>Trie mein nodes</span><strong class="tr-n"></strong></div>
            <div class="stat"><span>Steps (top-k cache ke saath)</span><strong class="tr-st"></strong></div>
            <div class="stat"><span>Queries scan (cache ke bina)</span><strong class="tr-sc"></strong></div>
          </div>
          <div class="calc-note">Har node pe top 3 (k = 3) pehle se rakhe hain. "Search" dabane pe count badhta hai aur top-k dobara banta hai, jaise asli system mein offline job query logs se karta hai.</div>`;
        const pE = el.querySelector('.tr-p'), sE = el.querySelector('.tr-s');
        const upd = () => {
          const { root, nodes } = T.buildTrie(counts, 3);
          const p = pE.value.toLowerCase();
          let node = root, path = [], ok = true;
          for (const ch of p) { if (node.c[ch]) { node = node.c[ch]; path.push(ch); } else { ok = false; break; } }
          el.querySelector('.tr-path').innerHTML = 'root → ' + path.map(c => `<strong>${esc(c === ' ' ? '␣' : c)}</strong>`).join(' → ') + (ok ? '' : ` → <span style="color:var(--red)">"${esc(p[path.length])}" ka koi child nahi</span>`) +
            (ok && Object.keys(node.c).length ? `<div style="color:var(--ink-3)">Is node ke children: ${Object.keys(node.c).sort().map(c => esc(c === ' ' ? '␣' : c)).join(', ')}</div>` : '');
          el.querySelector('.tr-sug').innerHTML = ok ? node.top.map(([q, n], i) => `<div style="padding:6px 10px;border:1px solid var(--line);border-radius:var(--r-sm);margin:4px 0;background:var(--surface-2)">${i + 1}. <strong>${esc(q.slice(0, p.length))}</strong>${esc(q.slice(p.length))} <span style="color:var(--ink-3);font-size:13px">(${n.toLocaleString('en-IN')} searches)</span></div>`).join('') : '<div style="color:var(--ink-3)">Koi suggestion nahi.</div>';
          el.querySelector('.tr-n').textContent = nodes;
          el.querySelector('.tr-st').textContent = path.length;
          el.querySelector('.tr-sc').textContent = ok ? node.below : 0;
        };
        el.querySelector('.tr-go').onclick = () => {
          const q = sE.value.trim().toLowerCase(); if (!q) return;
          const f = counts.find(x => x[0] === q); if (f) f[1] += 100; else counts.push([q, 100]);
          upd();
        };
        el.querySelector('.tr-rs').onclick = () => { counts = BASE.map(x => x.slice()); upd(); };
        pE.addEventListener('input', upd); upd();
      }},
      { type: 'p', html: `Asli autocomplete system ke aur hisse:` },
      { type: 'list', items: [
        `<strong>Memory mein:</strong> trie (ya uska compressed roop) RAM mein rakhte hain, aur prefix ke pehle letters se shard karte hain jab ek machine mein na samaaye. Elasticsearch ka completion suggester bhi isi idea pe in-memory structure (FST, trie ka compact cousin) use karta hai.`,
        `<strong>Offline rebuild:</strong> query logs se har ghante/din popular queries gino, naya trie banao, servers pe swap karo. Trending cheezein (aaj ka match) ke liye ek chhota real-time layer upar se.`,
        `<strong>Client side:</strong> har keystroke pe request mat bhejo; ~100-200 ms <strong>debounce</strong> karo (user rukne ka wait). Chhote prefixes ("c", "cr") ke results sabke liye same hain, to unhe browser aur CDN pe cache karo.`,
        `<strong>Filtering:</strong> galat/offensive suggestions ki blocklist, aur personalization (user ki pichhli searches) upar se mix.`,
      ]},
      { type: 'callout', tone: 'mistake', title: 'Autocomplete = search nahi', html: `Autocomplete <em>query</em> suggest karta hai (logon ne kya search kiya), search <em>documents</em> dhoondhti hai. Dono ke data, latency budget aur structure alag hain. Trie prefix ke liye hai; "beech ke word" ya typo ke liye wo kaam nahi karta (uske liye search engine ka n-gram/fuzzy matching).` },

      { type: 'h2', text: 'Semantic search: words nahi, matlab' },
      { type: 'p', html: `User ne likha "sasta phone". Video ka title hai "Budget smartphone under 10k". Ek bhi word common nahi, to inverted index ise kabhi nahi dhoondhega, chahe BM25 kitna bhi achha ho. Humein matlab se match chahiye.` },
      { type: 'callout', tone: 'term', title: 'Embedding', html: `<strong>Ye kya hai:</strong> ek ML model text ko numbers ki ek list (vector) mein badal deta hai, jaise [0.12, -0.53, 0.88, ...], aam taur pe sainkdon se hazaaron numbers. Model aise train hota hai ki <strong>milte-julte matlab wale texts ke vectors paas paas</strong> aayein.<br><strong>Kyun chahiye:</strong> "sasta phone" aur "budget smartphone" ke vectors lagbhag ek hi disha mein honge, chahe ek bhi word common na ho.<br><strong>Iske bina:</strong> sirf exact words ka match; matlab wale results chhoot jaate.` },
      { type: 'callout', tone: 'term', title: 'Cosine similarity', html: `<strong>Ye kya hai:</strong> do vectors kitni same disha mein hain, iska number: 1 = bilkul same disha, 0 = koi rishta nahi, −1 = ulti disha. Formula: (a · b) / (|a| × |b|).<br><strong>Kyun chahiye:</strong> search = query ka vector banao, aur sabse zyada cosine similarity wale documents lao.<br><strong>Example:</strong> 20° aur 24° wale arrows: cos(4°) = 0.998, bahut paas. 24° aur 84°: cos(60°) = 0.5.` },
      { type: 'p', html: `Neeche ek khilona version hai: asli embeddings mein sainkdon dimensions hote hain, yahan samajhne ke liye sirf 2. Query chuno, dekho keyword match aur meaning match kya kehte hain:` },
      { type: 'custom', render(el) {
        const deg = a => [Math.cos(a * Math.PI / 180), Math.sin(a * Math.PI / 180)];
        const DOCS = [
          { t: 'Budget smartphone under 10k', v: deg(20) },
          { t: 'Sasta mobile phone deals', v: deg(30) },
          { t: 'Cricket match highlights', v: deg(84) },
          { t: 'IPL final recap', v: deg(72) },
          { t: 'Gaming laptop review', v: deg(-22) },
        ];
        const QS = [{ t: 'cheap phone', v: deg(24) }, { t: 'match summary', v: deg(78) }, { t: 'best laptop for games', v: deg(-16) }];
        let qi = 0;
        el.innerHTML = `<div class="emb-ch" style="display:flex;flex-wrap:wrap;gap:8px"></div>
          <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start;margin-top:12px">
            <svg class="emb-svg" viewBox="-120 -125 250 175" style="width:100%;max-width:300px"></svg>
            <div class="emb-tab table-wrap" style="flex:1;min-width:240px;margin:0"></div>
          </div>
          <div class="calc-note emb-note"></div>`;
        const words = s => new Set(T.analyze(s, { lower: true, stop: true, stem: true }));
        const draw = () => {
          const chips = el.querySelector('.emb-ch'); chips.innerHTML = '';
          QS.forEach((q, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (i === qi ? ' on' : ''); b.textContent = q.t; b.onclick = () => { qi = i; draw(); }; chips.appendChild(b); });
          const q = QS[qi];
          const arrow = (v, col, w, label, anchorUp) => {
            const x = v[0] * 100, y = -v[1] * 100;
            return `<line x1="0" y1="0" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${col}" stroke-width="${w}"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="${col}"/>` +
              `<text x="${(x * 1.04).toFixed(1)}" y="${(y * 1.04 + (anchorUp ? -6 : 12)).toFixed(1)}" font-size="9" fill="${col}" text-anchor="${x < -10 ? 'end' : x > 10 ? 'start' : 'middle'}">${esc(label)}</text>`;
          };
          el.querySelector('.emb-svg').innerHTML = `<line x1="-115" y1="0" x2="125" y2="0" stroke="var(--line-2)"/><line x1="0" y1="-120" x2="0" y2="45" stroke="var(--line-2)"/>` +
            DOCS.map((d, i) => arrow(d.v, 'var(--ink-3)', 1.5, 'D' + (i + 1), d.v[1] > 0)).join('') + arrow(q.v, 'var(--accent)', 3, 'query', true);
          const qw = words(q.t);
          const rows = DOCS.map((d, i) => ({ i, d, cos: T.cosine(q.v, d.v), kw: [...words(d.t)].filter(w => qw.has(w)).length })).sort((a, b) => b.cos - a.cos);
          el.querySelector('.emb-tab').innerHTML = `<table><thead><tr><th>Document</th><th>Common words</th><th>Cosine</th></tr></thead><tbody>` +
            rows.map(r => `<tr><td>D${r.i + 1}: ${esc(r.d.t)}</td><td>${r.kw}</td><td><strong>${r.cos.toFixed(2)}</strong></td></tr>`).join('') + `</tbody></table>`;
          const top2 = rows.slice(0, 2);
          el.querySelector('.emb-note').textContent = `Meaning se top 2: D${top2[0].i + 1} aur D${top2[1].i + 1}. Keyword match ko sirf ${rows.filter(r => r.kw > 0).length} document mile (common words > 0). Embeddings ne bina common word ke bhi sahi documents dhoondhe.`;
        };
        draw();
      }},
      { type: 'h3', text: 'Crores vectors mein nearest kaise dhoondhein? (ANN)' },
      { type: 'p', html: `Seedha tareeka: query ko har document ke vector se compare karo. 10 crore videos × 768 numbers = har query pe arabon multiplications. Bahut slow. Iske liye <strong>ANN (Approximate Nearest Neighbour)</strong> indexes hain: 100% sahi nearest ki guarantee chhod ke, lagbhag sahi results bahut tez. ANN = "sabse paas wale padosi, lagbhag sahi".` },
      { type: 'callout', tone: 'term', title: 'HNSW', html: `<strong>Ye kya hai:</strong> Hierarchical Navigable Small World: vectors ka ek graph jisme har vector apne kuch nazdeeki padosiyon se juda hai, kai layers mein. Upar ki layer mein kam nodes aur lambi chhalaang, neeche ghana graph. Search upar se shuru hoti hai, har baar "query ke zyada paas wale padosi" pe kudti hai, aur neeche utarti jaati hai.<br><strong>Kyun chahiye:</strong> crores vectors mein bhi milliseconds mein lagbhag-sahi nearest.<br><strong>Keemat:</strong> graph RAM mein chahiye aur build mehenga. Elasticsearch/OpenSearch ka kNN search, pgvector (Postgres extension), aur vector databases (Pinecone, Milvus, Weaviate) HNSW jaise ANN indexes use karte hain.` },
      { type: 'p', html: `ANN ka trade-off ek knob hai: zyada graph explore karo to <strong>recall</strong> (asli nearest mein se kitne mile) badhta hai, lekin latency bhi. Aam taur pe 95-99% recall pe kaafi tez search mil jaati hai.` },
      { type: 'h3', text: 'Hybrid search: dono ka best' },
      { type: 'p', html: `Embeddings meaning samajhte hain, lekin exact cheezon mein kamzor ho sakte hain: product code "SM-A156", kisi creator ka naam, ya naya slang jo model ne dekha hi nahi. BM25 exact words mein strong hai. Isliye aajkal <strong>hybrid search</strong> common hai: dono chalao, aur results ko milao. Ek simple aur popular tareeka <strong>Reciprocal Rank Fusion (RRF)</strong>: har list mein document ki rank r ho to use 1/(60 + r) points do, aur jod do (Elasticsearch mein ye 60 default constant hai).` },
      { type: 'table', head: ['Document', 'BM25 rank', 'Vector rank', 'RRF score'], rows: [
        ['A', '1', '3', '1/61 + 1/63 = 0.0323'],
        ['B', '2', '1', '1/62 + 1/61 = <strong>0.0325</strong> (jeeta)'],
        ['C', '3', 'list mein nahi', '1/63 = 0.0159'],
      ], caption: 'RRF ko scores ka scale nahi chahiye, sirf ranks. Isliye BM25 aur cosine jaise alag scales wali lists aasaani se mil jaati hain.' },

      { type: 'h2', text: 'Kab kya?' },
      { type: 'table', head: ['Zaroorat', 'Kya lagao'], rows: [
        ['ID / exact value se lookup', 'Database index, search engine ki zaroorat nahi'],
        ['Chhota app, simple text search', 'Postgres full-text search (tsvector + GIN index) kaafi ho sakta hai'],
        ['Full-text, ranking, typo-tolerance, facets, bada scale', 'Elasticsearch / OpenSearch, DB ke saath CDC se sync'],
        ['Har keystroke pe suggestions', 'Trie + precomputed top-k, memory mein, CDN cache'],
        ['Meaning se search, "similar videos", AI/RAG', 'Embeddings + vector index (HNSW): pgvector, ES kNN, vector DB'],
        ['Exact words bhi aur meaning bhi', 'Hybrid: BM25 + vector, RRF se merge'],
      ]},

      { type: 'diagram', title: 'Search: xyz.com mein poori picture', height: 530,
        groups: [
          { label: 'Users', x: 200, y: 14, w: 320, h: 92 },
          { label: 'Async sync (CDC)', x: 20, y: 398, w: 680, h: 118 },
        ],
        nodes: [
          { id: 'usr', label: 'xyz.com app', sub: 'search box', x: 360, y: 66, kind: 'client', info: 'Ye kya hai: user ka phone/browser. Har keystroke pe autocomplete, aur Enter pe asli search.' },
          { id: 'ac', label: 'Autocomplete', sub: 'trie + top-k', x: 110, y: 180, w: 150, kind: 'cache', info: 'Ye kya hai: memory mein trie, har node pe top-k queries pehle se. ~50 ms mein suggestions. Ek offline job query logs se ise har ghante/din dobara banata hai. Chhote prefixes CDN pe cache.' },
          { id: 'api', label: 'Search API', sub: 'xyz.com backend', x: 360, y: 180, w: 150, kind: 'server', info: 'Ye kya hai: hamara backend. Writes Postgres mein, search queries Elasticsearch ko. Semantic search ke liye query ka embedding bhi banwata hai.' },
          { id: 'emb', label: 'Embedding model', sub: 'text → vector', x: 600, y: 180, w: 160, kind: 'server', info: 'Ye kya hai: ML model jo text ko vector banata hai. Query ka vector search ke waqt, documents ke vectors indexing ke waqt.' },
          { id: 'pg', label: 'Postgres', sub: 'source of truth', x: 175, y: 320, w: 150, kind: 'data', info: 'Ye kya hai: main database. Asli data yahin. Har commit WAL mein jaata hai, jise CDC padhta hai.' },
          { id: 'es', label: 'Elasticsearch', sub: 'BM25 + kNN', x: 470, y: 320, w: 160, kind: 'cache', info: 'Ye kya hai: search engine cluster. Shards + replicas. Inverted index (BM25) aur vector index (HNSW) dono. DB ki copy, kuch seconds peeche.' },
          { id: 'dbz', label: 'Debezium', sub: 'WAL padhta', x: 175, y: 457, w: 150, kind: 'server', info: 'Ye kya hai: CDC tool. Postgres ke log se har change ko event banata hai.' },
          { id: 'kf', label: 'Kafka', sub: 'change events', x: 360, y: 457, w: 150, kind: 'queue', info: 'Ye kya hai: events ki durable stream. ES gira ho to events yahin wait karte hain; key = video id se order sahi.' },
          { id: 'ix', label: 'Indexer', sub: 'consumer', x: 600, y: 457, w: 150, kind: 'server', info: 'Ye kya hai: consumer jo events padh ke ES documents banata/hataata hai (doc id = video id, idempotent). Vectors bhi banwata hai.' },
        ],
        edges: [
          { a: 'usr', b: 'api', n: 1, label: 'search' },
          { a: 'usr', b: 'ac', label: 'prefix "cri"' },
          { a: 'api', b: 'es', n: 2, label: 'query' },
          { a: 'api', b: 'emb', label: 'vector', dashed: true },
          { a: 'api', b: 'pg', label: 'writes' },
          { a: 'pg', b: 'dbz', n: 3, kind: 'evt' },
          { a: 'dbz', b: 'kf', n: 4, kind: 'evt' },
          { a: 'kf', b: 'ix', n: 5, kind: 'evt' },
          { a: 'ix', b: 'es', n: 6, label: 'index docs' },
          { a: 'ix', b: 'emb', label: 'doc vectors', dashed: true },
        ],
        paths: [
          { name: 'Search', text: 'Query Search API se Elasticsearch: analyzer, posting lists, BM25 ranking, shards pe scatter-gather, top 10 wapas.', go: ['usr>api>es'] },
          { name: 'Data sync', text: 'App sirf Postgres mein likhta hai. Debezium WAL padhta hai, Kafka mein event, indexer ES update karta hai. Search kuch seconds peeche.', go: ['api>pg>dbz>kf>ix>es'] },
          { name: 'Autocomplete', text: 'Har keystroke pe prefix trie mein, wahan rakhi top-k list turant wapas.', go: ['usr>ac'] },
          { name: 'Semantic', text: 'Query aur documents dono vectors bante hain; ES ka kNN (HNSW) nearest vectors deta hai. BM25 ke saath RRF se hybrid.', go: ['usr>api>emb', 'api>es', 'ix>emb'] },
        ],
      },
      { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
        <li>LIKE '%word%' = full table scan, koi ranking nahi. Search engine inverted index (term → posting list) banata hai.</li>
        <li>Analyzer: tokenize → lowercase → stop words → stemming (→ synonyms). Document aur query pe same analyzer.</li>
        <li>TF-IDF = tf × idf. BM25 = tf ki chhat (k1 = 1.2) + length normalization (b = 0.75). Lucene/Elasticsearch ka default.</li>
        <li>Elasticsearch: index → shards (scale) → replicas (safety). Primary shards ki ginti baad mein fixed. Refresh ~1 s: near real-time.</li>
        <li>DB source of truth; CDC (Debezium) + Kafka se search index async sync. Dual write se bacho.</li>
        <li>Autocomplete = trie + har node pe top-k, memory mein, offline rebuild, debounce + CDN cache.</li>
        <li>Semantic search = embeddings + cosine + ANN (HNSW). Hybrid = BM25 + vectors, RRF se merge.</li>
      </ul>` },
      { type: 'tradeoffs',
        gains: ['Full table scan ki jagah posting lists: crores documents mein milliseconds', 'BM25 se relevant results upar, spam aur lambe documents ka asar kam', 'Shards se scale, replicas se high availability', 'CDC se DB aur search sync, app code simple', 'Trie + top-k se ~50 ms autocomplete', 'Embeddings se bina common words ke bhi sahi results'],
        costs: ['Ek aur bada system chalana (cluster, mappings, upgrades)', 'Search kuch seconds peeche (eventual consistency)', 'Index storage: data ki ek aur copy, plus inverted index ka size', 'Shards ki ginti baad mein badalna = reindex', 'Embeddings: GPU/model ka kharcha, RAM-bhookha HNSW, approximate results', 'Relevance tuning kabhi khatam na hone wala kaam'],
      },
      { type: 'think', questions: [
        { q: 'xyz.com pe har second 2,000 nayi videos aati hain aur creators complain karte hain "upload ke turant baad meri video search mein nahi dikhti". Kya karoge?', a: 'Pehle samjho delay kahan hai: CDC/Kafka consumer lag ya ES refresh. Lag ke liye indexer consumers badhao aur bulk requests use karo. Refresh 1 second pe hi hai to "turant" ki ummeed galat hai; creator ko UI mein unki apni video seedha DB se dikhao. Refresh interval chhota karna ya har write pe refresh karna indexing ko bahut mehenga bana deta hai.' },
        { q: 'Index 3 primary shards ke saath banaya tha, ab data 20 guna ho gaya aur har shard bahut bada. Kya karein?', a: 'Primary shards ki ginti existing index pe nahi badalti (document ka shard hash % shards se decide hota hai). Naya index zyada shards ke saath banao, reindex karo (DB/Kafka se ya ES reindex/split API se), aur alias switch kar do. Isiliye shuru mein growth ka andaza lagao, lekin bahut saare chhote shards bhi mat banao: har shard ka overhead hai aur har search sab shards ko chhooti hai.' },
        { q: 'Autocomplete ke liye har keystroke pe Elasticsearch ki full search query bhej dein to kya dikkat?', a: 'Har user ek search mein 5-10 keystrokes bhejta hai, to load 5-10 guna, aur har full query (analyzer, scoring, scatter-gather) 50 ms budget mein mushkil. Trie + precomputed top-k memory mein ek lookup hai. Upar se client debounce (100-200 ms) aur chhote prefixes ka CDN cache.' },
        { q: 'Search mein "The The" (ek band ka naam) dhoondhne pe kuch nahi milta. Kyun?', a: 'Dono words stop words hain, to analyzer ne query hi khaali kar di (upar wale widget mein try karo). Isiliye modern setups stop words hataane mein savdhaan rehte hain; BM25 waise bhi common words ko kam weight deta hai.' },
      ]},
      { type: 'quiz', questions: [
        { q: 'WHERE title LIKE \'%cricket%\' bade table pe slow kyun hai?', options: ['LIKE command hi slow hai', 'Shuru mein % hone se B-tree index kaam nahi aata, full table scan hota hai', 'Database text store nahi kar sakta'], answer: 1, explain: 'B-tree sorted prefix pe kaam karta hai. "Beech mein kahin bhi" ke liye har row padhni padti hai.' },
        { q: 'Inverted index mein kya store hota hai?', options: ['Document → uske words', 'Term → un documents ki list jisme wo aata hai', 'Query → result cache'], answer: 1, explain: 'Har term ki posting list. Query = posting lists nikaalo aur intersect/union karo.' },
        { q: 'BM25 TF-IDF se behtar kyun hai?', options: ['Ye stemming karta hai', 'TF saturate hota hai aur document length normalize hoti hai', 'Ye embeddings use karta hai'], answer: 1, explain: 'k1 se tf ka asar ek chhat tak, b se lambe documents ka bonus kam. Defaults k1 = 1.2, b = 0.75.' },
        { q: 'Elasticsearch mein abhi index kiya document turant search mein kyun nahi aaya?', options: ['Replica fail hui', 'Refresh (default ~1 s) ke baad hi naya segment searchable hota hai', 'Document galat shard mein gaya'], answer: 1, explain: 'Near real-time: refresh naya segment kholta hai.' },
        { q: 'DB aur search index sync rakhne ka sabse safe tareeka?', options: ['App dono jagah likhe', 'DB mein likho, CDC (Debezium) se log padh ke Kafka ke through index update karo', 'Har raat poora index delete karke banao'], answer: 1, explain: 'Ek hi source of truth. Dual write mein partial failure se chupchaap mismatch hota hai.' },
        { q: 'Spam video ke description mein "cricket" 50 baar likha hai. BM25 (k1 = 1.2) mein us term ka score kitna badhega, tf = 3 ke muqable?', options: ['Lagbhag 17 guna', 'Thoda sa: chhat idf × 2.2 tak hi (calculator: 10.85 se 14.84)', 'Score zero ho jaayega'], answer: 1, explain: 'BM25 tf ko saturate karta hai. TF-IDF mein yahi 20.72 se 345 ho jaata.' },
        { q: '3 primary shards, 1 replica, 3 nodes. Ek node gira. Cluster health?', options: ['Red: data gaya', 'Yellow: har shard ki ek copy zinda (replica primary ban gayi), kuch replicas missing', 'Green: kuch nahi hua'], answer: 1, explain: 'Primary aur replica alag nodes pe the, to data poora hai. Do nodes girte to kisi shard ki dono copies ja sakti thi: red. Cluster lab mein try karo.' },
        { q: 'Analyzer mein stemming kya karta hai?', options: ['Words ko alphabetical sort', 'Suffix kaat ke jad: batting, bats → bat', 'Typos theek karta hai'], answer: 1, explain: 'Taaki ek word ke alag roop ek hi term ban ke match hon. Query pe bhi same stemming chalni chahiye.' },
        { q: '"sasta phone" se "Budget smartphone" wali video dhoondhni hai. Kya chahiye?', options: ['Behtar stemming', 'Embeddings + vector search (ya hybrid)', 'Zyada shards'], answer: 1, explain: 'Koi common word nahi, to keyword search fail. Meaning ke liye embeddings.' },
      ]},
      { type: 'sources', note: 'Version-specific numbers aur defaults inhi official docs se check kiye gaye.', items: [
        { title: 'Similarity module (BM25 defaults k1 = 1.2, b = 0.75)', publisher: 'Elastic docs', official: true, url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/index-modules-similarity.html', used: 'BM25 default similarity aur k1, b defaults.' },
        { title: 'Practical BM25, Part 2: The BM25 Algorithm and its Variables', publisher: 'Elastic blog', year: 2018, official: true, url: 'https://www.elastic.co/blog/practical-bm25-part-2-the-bm25-algorithm-and-its-variables', used: 'BM25 aur Lucene IDF formula, k1 aur b ka matlab.' },
        { title: 'LUCENE-8563 / LegacyBM25Similarity', publisher: 'Apache Lucene docs', official: true, url: 'https://lucene.apache.org/core/8_5_0/misc/org/apache/lucene/search/similarity/LegacyBM25Similarity.html', used: 'Lucene 8 mein (k1+1) factor hataaya gaya, ranking order same.' },
        { title: 'Near real-time search', publisher: 'Elastic docs', official: true, url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/near-real-time.html', used: 'Segments, refresh har 1 second, 30 second search-idle rule.' },
        { title: 'Index modules (number_of_shards, number_of_replicas, refresh_interval)', publisher: 'Elastic docs', official: true, url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/index-modules.html', used: 'Default 1 shard + 1 replica; shard count index banne ke baad fixed.' },
        { title: 'Reciprocal rank fusion', publisher: 'Elastic docs', official: true, url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/rrf.html', used: 'RRF formula aur default rank_constant 60.' },
        { title: 'Debezium connector for PostgreSQL', publisher: 'Debezium docs', official: true, url: 'https://debezium.io/documentation/reference/stable/connectors/postgresql.html', used: 'WAL se logical decoding ke through row-level change events.' },
        { title: 'Efficient and robust approximate nearest neighbor search using HNSW graphs (Malkov, Yashunin)', publisher: 'arXiv paper', year: 2016, url: 'https://arxiv.org/abs/1603.09320', used: 'HNSW ka layered graph idea.' },
      ]},
    ],
  });
})();
