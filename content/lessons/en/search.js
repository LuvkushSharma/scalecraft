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
    title: 'Search and the inverted index',
    minutes: 32,
    summary: `xyz.com has a search box. The database's <code>LIKE '%cricket%'</code> gives up on lakhs of videos. Here we learn how a search engine works inside: the inverted index, tokenization and stemming, ranking (TF-IDF, BM25), Elasticsearch shards and replicas, syncing with the database (CDC), tries for autocomplete, and search by meaning (embeddings).`,
    _test: T,
    blocks: [
      { type: 'callout', tone: 'analogy', title: 'In simple words', html: `xyz.com has crores of videos. A user types "cricket batting" into the search box and wants the best videos at the top in less than a second.<br>If the database had to read every video title one by one, it would take far too long.<br>So a search engine builds a "reverse register" in advance: next to every word, the list of videos that contain it. Just like the index at the back of a book.<br>In this lesson we learn how that register is built, how it decides which video to show first, and how suggestions appear while you type.` },
      { type: 'h2', text: 'Problem: searching with the database' },
      { type: 'p', html: `xyz.com is now a video platform: crores of videos, and each video's title and description are in the database (Postgres). The product team says: "We need a search box at the top. If a user types 'cricket batting', the most relevant videos should come first." The first idea everyone has:` },
      { type: 'code', text: `SELECT * FROM videos
WHERE title LIKE '%cricket%' AND title LIKE '%batting%';` },
      { type: 'p', html: `This works, but only on small data. At scale it breaks in four places:` },
      { type: 'list', items: [
        `<strong>Speed:</strong> <code>'%cricket%'</code> has a <code>%</code> in front too, which means "anywhere in the middle". A normal B-tree index works on sorted order (like words starting with "cr..." in a dictionary), but it does not help for "anywhere in the middle". The database has to read <strong>every row</strong> (a full table scan). 10 crore rows × 1,000 searches per second = the database is finished.`,
        `<strong>No ranking:</strong> LIKE only says yes or no. 50,000 videos matched; which ones do we show first? A video with "cricket" once in its title and a complete cricket batting guide count the same.`,
        `<strong>Word forms:</strong> the user typed "batting", but the video title says "bat" or "Batting" or "cricketers". LIKE treats all of these as different.`,
        `<strong>Typos and meaning:</strong> "criket", or "cheap phone" when the title says "budget smartphone": LIKE cannot handle these.`,
      ]},
      { type: 'callout', tone: 'term', title: 'Full table scan', html: `<strong>What it is:</strong> when the database has no shortcut (index), it reads and checks <strong>every single row</strong> of the table.<br><strong>Why it happens:</strong> a normal index does not help for a query like <code>'%cricket%'</code>.<br><strong>The cost:</strong> fine on a small table, but on crores of rows every query takes seconds and eats CPU and disk.` },
      { type: 'p', html: `Search engines (Elasticsearch, OpenSearch, Solr, the system inside Google) are built for exactly this job. Their heart is a data structure: the <strong>inverted index</strong>.` },
      { type: 'callout', tone: 'term', title: 'Search engine', html: `<strong>What it is:</strong> separate software that prepares text for searching in advance, and when a query comes, returns the most relevant documents in milliseconds.<br><strong>Why we need it:</strong> a database is built for "exact match and transactions"; a search engine is built for "finding by words and ranking".<br><strong>Without it:</strong> LIKE queries, full table scans, and results with no ranking.` },

      { type: 'h2', text: 'Inverted index: think backwards' },
      { type: 'p', html: `In the database, data has the shape "document → words": this is the title of video 7. Search needs the opposite: "word → which documents". Exactly like the index at the back of a book: "Recursion ... page 45, 112". No need to read the whole book; go straight to the page.` },
      { type: 'compare',
        left: { title: 'Forward (like a database)', ascii: `
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
      { type: 'callout', tone: 'term', title: 'Document and term', html: `<strong>What it is:</strong> a <strong>document</strong> = one searchable thing (here, one video's title + description, as JSON). A <strong>term</strong> = a word left after cleaning (like "Batting" → "bat").<br><strong>Why we need it:</strong> the index is built on terms, and the results are documents.<br><strong>Without it:</strong> "Cricket", "cricket" and "cricket!" would count as three different words.` },
      { type: 'callout', tone: 'term', title: 'Inverted index and posting list', html: `<strong>What it is:</strong> an <strong>inverted index</strong> = a map: term → the list of documents that contain the term. That list is called the <strong>posting list</strong> (postings). Postings often hold extra information: how many times the term appears (term frequency) and at which position (for phrase search).<br><strong>Why we need it:</strong> when a query arrives, open only that word's list; no need to read crores of rows.<br><strong>Without it:</strong> every search = a full table scan.<br><strong>Example:</strong> "batting" → [D2, D3]. Query "batting" = just read this one list.` },
      { type: 'image', src: 'assets/img/search/book-index.jpg', alt: 'The index at the back of an old book: words in alphabetical order with page numbers next to them', caption: 'The index at the back of a book (a 1919 encyclopedia): page numbers next to every word. An inverted index is exactly this: document IDs next to every word. Instead of reading the whole book, go straight to the right page.', credit: { text: 'Randal Oulton, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Book_of_Knowledge_1919_Vol_20,_General_Index_Sample.jpg', license: 'CC0' } },
      { type: 'p', html: `When the query "cricket batting" comes: take the list for "cricket", take the list for "batting", and take their <strong>intersection</strong> (what is common to both). The lists are already sorted (in doc ID order), so walking two sorted lists together to match them is very fast. Instead of reading the whole table, we read only two short lists.` },

      { type: 'h2', text: 'Cleaning the words: the analysis pipeline' },
      { type: 'callout', tone: 'term', title: 'Analyzer', html: `<strong>What it is:</strong> a small production line: put text in, and cleaned terms come out. Every document passes through it when the index is built, and every query passes through it at search time.<br><strong>Why we need it:</strong> users and creators write in different ways ("Batting", "bats", "BATTING!"). The analyzer makes them all the same so they match.<br><strong>Without it:</strong> only words with exactly the same spelling would match.` },
      { type: 'p', html: `Before indexing, every text passes through the analyzer. Its steps:` },
      { type: 'steps', items: [
        { t: 'Tokenization', d: `<strong>Token</strong> = a piece of text, usually one word. Tokenization = cutting text into tokens. "India vs Australia: Cricket highlights!" → [India, vs, Australia, Cricket, highlights]. Punctuation is dropped. (Languages like Hindi, Chinese or Japanese need their own tokenizers.)` },
        { t: 'Lowercasing', d: `"Cricket" and "cricket" are the same thing, so everything goes to small letters.` },
        { t: 'Removing stop words', d: `Words like "the, is, for, to, how" are in almost every document and do not help search. Removing them makes the index smaller. (Modern engines often keep them, because BM25 gives them very little weight anyway, and phrase searches like "to be or not to be" would break.)` },
        { t: 'Stemming', d: `Cut a word down to its "root" (stem): batting, bats → bat; cricketers → cricket; centuries → century. Now searching "batting" also finds the "bats" video.` },
        { t: 'Synonyms (optional)', d: `"phone" = "mobile", "tv" = "television". Add extra terms from a list.` },
      ]},
      { type: 'callout', tone: 'term', title: 'Stemming', html: `<strong>What it is:</strong> rule-based scissors: cut off the word's suffix and keep its "root" (stem). batting → bat, cricketers → cricket. The Porter stemmer is the most famous. Sometimes the stem looks odd ("beginners" → "beginn"), but that is fine, because the <em>same</em> scissors also run on the query, so both sides get the same stem.<br><strong>Why we need it:</strong> so that searching "batting" also finds the "bats" video.<br><strong>Without it:</strong> every form (bat, bats, batting) is a separate term, and many correct results are missed.` },
      { type: 'callout', tone: 'term', title: 'Lemmatization', html: `<strong>What it is:</strong> the "well-read" sibling of stemming. It uses a dictionary to find the real root word ("better" → "good", "ran" → "run").<br><strong>When:</strong> when the correct root matters. More accurate, but slow, and every language needs its own dictionary.<br><strong>Without it:</strong> stemming is usually enough, which is why stemming is more common in search engines.` },
      { type: 'p', html: `Now watch the analyzer at work. Type any title or query, and see how the tokens change after each step (changed tokens are highlighted):` },
      { type: 'custom', render(el) {
        const PRE = ['Top Cricketers ranked by Batting averages and the Centuries!', 'How to play the Cover Drive: batting tips for beginners', 'Cheap phone vs budget mobile: which is better?'];
        const SYN = { phone: ['mobile'], mobile: ['phone'], tv: ['television'], cheap: ['budget'], budget: ['cheap'] };
        el.innerHTML = `<label for="anIn">Text (a title or a query)</label><input id="anIn" type="text" style="width:100%">
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
            ['1. Tokenize', 'Cut the text into words, drop punctuation.', s1.map(t => chip(t, false))],
            ['2. Lowercase', 'All small letters.', s2.map((t, i) => chip(t, t !== s1[i]))],
            ['3. Remove stop words', `Removed: ${s2.filter(t => !s3.includes(t)).map(esc).join(', ') || 'none'}`, s3.map(t => chip(t, false))],
            ['4. Stemming', 'Cut the suffix down to the root (stem).', s4.map((t, i) => chip(t, t !== s3[i]))],
            ['5. Synonyms', 'Extra terms added from a list.', s5.map(t => chip(t, !s4.includes(t)))],
          ];
          el.querySelector('.anOut').innerHTML = rows.map(([h, d, cs]) => `<div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:8px 10px;background:var(--surface)"><div style="font-weight:700;color:var(--ink)">${h} <span style="font-weight:400;color:var(--ink-3);font-size:13px">${d}</span></div><div style="margin-top:4px">${cs.join('') || '<span style="color:var(--ink-3)">(empty)</span>'}</div></div>`).join('');
          el.querySelector('.anNote').textContent = `${s1.length} tokens became ${s5.length} index terms. Highlighted chips changed or were added at that step. The same analyzer also runs on the query, so "Batting" (title) and "bats" (query) both become "bat" and match.`;
        };
        inp.addEventListener('input', upd);
        inp.value = PRE[0]; upd();
      }},
      { type: 'callout', tone: 'mistake', title: 'Different analyzers for index and query', html: `The most common bug: stemming was used when building the index, but not on the query (or the other way round). The index has "bat", you search for "batting", and nothing is found. Rule: <strong>documents and queries must both pass through the same analyzer</strong> (unless there is a special reason).` },

      { type: 'h2', text: 'Build it yourself: a live inverted index' },
      { type: 'p', html: `Below are three video titles, and you can change them. Turn the analyzer options on and off and watch the index change. Then type a query: you will see each term's posting list, their intersection (AND) and the ranking (real TF-IDF and BM25 numbers).` },
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
        const names = { lower: 'Lowercase', stop: 'Remove stop words', stem: 'Stemming' };
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
          el.querySelector('.srch-ix').innerHTML = `<table><thead><tr><th>Term</th><th>Posting list (doc × how many times)</th><th>df</th></tr></thead><tbody>` +
            terms.map(t => {
              const p = ix.index[t];
              const hl = qs.has(t) ? ' style="background:var(--accent-soft)"' : '';
              return `<tr${hl}><td style="font-family:var(--f-mono)">${esc(t)}</td><td style="font-family:var(--f-mono)">${Object.keys(p).map(d => `D${+d + 1}×${p[d]}`).join(', ')}</td><td>${Object.keys(p).length}</td></tr>`;
            }).join('') + `</tbody></table>`;
          const uniq = [...qs];
          const lists = uniq.map(t => Object.keys(ix.index[t] || {}).map(Number));
          let andSet = lists.length ? lists.reduce((a, l) => a.filter(x => l.includes(x))) : [];
          const orSet = [...new Set(lists.flat())].sort();
          el.querySelector('.srch-post').innerHTML = uniq.map((t, i) => `${esc(t)} → [${lists[i].map(d => 'D' + (d + 1)).join(', ') || 'empty'}]`).join('<br>') +
            (uniq.length ? `<br><strong>AND (intersection)</strong> → [${andSet.map(d => 'D' + (d + 1)).join(', ') || 'empty'}] &nbsp; <strong>OR (union)</strong> → [${orSet.map(d => 'D' + (d + 1)).join(', ') || 'empty'}]` : '');
          const { res } = T.score(ix, q, 1.2, 0.75);
          const rows = res.filter(r => r.matched).sort((a, b) => b.bm25 - a.bm25);
          el.querySelector('.srch-rank').innerHTML = rows.length ? `<table><thead><tr><th>#</th><th>Doc</th><th>Breakdown (each term)</th><th>TF-IDF</th><th>BM25</th></tr></thead><tbody>` +
            rows.map((r, i) => `<tr><td>${i + 1}</td><td>D${r.doc + 1}${andSet.includes(r.doc) ? '' : ' <span style="color:var(--ink-3)">(OR only)</span>'}<div style="font-size:12px;color:var(--ink-3)">length ${r.dl}</div></td>
              <td style="font:12px/1.6 var(--f-mono)">${r.parts.map(p => `${esc(p.t)}: tf=${p.tf}, df=${p.df}, idf<sub>bm25</sub>=${fx(p.idfBm)}, idf<sub>tfidf</sub>=${fx(p.idfTf)} → bm25 ${fx(p.bm)}`).join('<br>')}</td>
              <td>${fx(r.tfidf)}</td><td><strong>${fx(r.bm25)}</strong></td></tr>`).join('') + `</tbody></table>` : '<div style="padding:12px 14px">No document matched.</div>';
          el.querySelector('.srch-note').innerHTML = `N = ${ix.N} documents, average length = ${fx(ix.avgdl, 2)} terms. BM25: k1 = 1.2, b = 0.75 (the Elasticsearch defaults). TF-IDF here is the textbook one: tf × ln(N/df). A term that is in every document has TF-IDF idf = ln(3/3) = 0, which means that word tells the ranking nothing.`;
        };
        docEls.forEach(d => d.addEventListener('input', upd));
        qEl.addEventListener('input', upd);
        upd();
      }},
      { type: 'callout', tone: 'tip', title: 'Try this', html: `1) With the defaults, query "cricket batting": D2 and D3 come in the AND result, and D3 is on top because it has "batting" twice. 2) Now turn <strong>Stemming</strong> off: D3 has "cricketers", not "cricket", so D3 disappears from the AND result. That is why we need stemming. 3) Turn <strong>Lowercase</strong> off: "Cricket" and "cricket" become different terms. 4) Add "the" to the query: with stop words on, it is removed from the query too.` },

      { type: 'h2', text: 'Ranking: which result comes first?' },
      { type: 'p', html: `Matching is not enough. We must pick the top 10 out of 50,000 matching videos. For this, every document gets a <strong>relevance score</strong>. Two old and proven ideas:` },
      { type: 'list', items: [
        `<strong>TF (term frequency):</strong> a document where the query word appears more often is probably more about that topic.`,
        `<strong>IDF (inverse document frequency):</strong> a word found in fewer documents is more "special". On xyz.com "video" is almost everywhere (low value), "googly" only in a few (high value). The idea of the formula: log(N / df), where N = total documents and df = how many documents contain this word.`,
      ]},
      { type: 'callout', tone: 'term', title: 'TF-IDF', html: `<strong>What it is:</strong> <strong>TF × IDF</strong>. Work it out for every query term and add them up: the total = the document's score.<br><strong>Why we need it:</strong> a simple way that rewards both "appears more often" and "special word".<br><strong>Weaknesses:</strong> (1) TF grows in a straight line, so a video description that spams "cricket" 50 times wins. (2) A long document has more words, so it has more chances to match just by being long.` },
      { type: 'callout', tone: 'term', title: 'BM25', html: `<strong>What it is:</strong> BM25 (Best Match 25) is an improved TF-IDF. Two knobs: <strong>k1</strong> (the benefit of a repeated word stops at a ceiling) and <strong>b</strong> (how much a long document is penalised).<br><strong>Why we need it:</strong> it removes the unfair advantage of spam and long documents. It is the default scoring of Lucene (the library inside Elasticsearch, OpenSearch and Solr).<br><strong>Without it:</strong> keyword-stuffed videos on top, truly good videos below.` },
      { type: 'p', html: `The BM25 score of one term:` },
      { type: 'code', text: `score(term, doc) = IDF × tf × (k1 + 1) / ( tf + k1 × (1 − b + b × docLength / avgDocLength) )

IDF = ln( 1 + (N − df + 0.5) / (df + 0.5) )

defaults:  k1 = 1.2   (how fast tf "saturates")
           b  = 0.75  (how much a long document is penalised)` },
      { type: 'list', items: [
        `<strong>Saturation (k1):</strong> the first 2-3 times a word appears matter a lot; the 50th time adds almost nothing. One term's score never goes above IDF × (k1+1). Spamming does not help.`,
        `<strong>Length normalization (b):</strong> if a document is longer than average, its tf counts a bit "lighter". b = 0 means length does not matter, b = 1 means it fully matters.`,
        `Note: since Lucene 8, the (k1 + 1) part was removed from the BM25 numerator, because it is the same constant for every document and does not change the ranking order. So Elasticsearch scores may show slightly different numbers from this formula, but the order stays the same.`,
      ]},
      { type: 'p', html: `Move the sliders and see how the score grows when a word appears again and again (one term's part, without IDF):` },
      { type: 'custom', render(el) {
        el.innerHTML = `<div class="row2">
            <div><label>k1 (saturation): <strong class="s2-k1v"></strong></label><input class="s2-k1" type="range" min="0.2" max="3" step="0.1" value="1.2"></div>
            <div><label>b (effect of length): <strong class="s2-bv"></strong></label><input class="s2-b" type="range" min="0" max="1" step="0.05" value="0.75"></div>
            <div><label>Document length ÷ average: <strong class="s2-lv"></strong></label><input class="s2-l" type="range" min="0.25" max="4" step="0.25" value="1"></div>
          </div>
          <svg class="s2-svg" viewBox="0 0 340 190" style="width:100%;max-width:520px;display:block;margin-top:12px"></svg>
          <div class="stats">
            <div class="stat"><span>tf = 1</span><strong class="s2-t1"></strong></div>
            <div class="stat"><span>tf = 3</span><strong class="s2-t3"></strong></div>
            <div class="stat"><span>tf = 10</span><strong class="s2-t10"></strong></div>
            <div class="stat"><span>Ceiling (max), k1 + 1</span><strong class="s2-cap"></strong></div>
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
            `<text x="95" y="22" font-size="11" fill="var(--amber)">TF-IDF: grows in a straight line</text>` +
            `<text x="325" y="${Math.max(12, Y(k1 + 1) - 6)}" font-size="11" text-anchor="end" fill="var(--accent)">BM25</text>` +
            `<text x="180" y="168" font-size="10" text-anchor="middle" fill="var(--ink-3)">tf (how many times the word appears) →</text>`;
          const v1 = T.bm25tf(1, k1, b, L), v3 = T.bm25tf(3, k1, b, L), v10 = T.bm25tf(10, k1, b, L);
          el.querySelector('.s2-t1').textContent = v1.toFixed(2);
          el.querySelector('.s2-t3').textContent = v3.toFixed(2);
          el.querySelector('.s2-t10').textContent = v10.toFixed(2);
          el.querySelector('.s2-cap').textContent = (k1 + 1).toFixed(2);
          el.querySelector('.s2-note').textContent = `A word that appears 10 times scores only ${(v10 / v1).toFixed(1)}x a word that appears once, not 10x. Make the document longer (length slider) and the score for every tf drops; set b = 0 and length has no effect.`;
        };
        [k1E, bE, lE].forEach(x => x.addEventListener('input', upd)); upd();
      }},
      { type: 'h3', text: 'Score calculator: TF-IDF vs BM25, step by step' },
      { type: 'p', html: `<strong>Worked example:</strong> xyz.com has N = 10 lakh videos. The word "googly" is in only 1,000 videos (df = 1,000). In one video it appears 3 times (tf = 3), and the video is of average length.<br>TF-IDF: idf = ln(10,00,000 / 1,000) = 6.908, score = 3 × 6.908 = <strong>20.72</strong>.<br>BM25: idf = ln(1 + (10,00,000 − 1,000 + 0.5) / (1,000 + 0.5)) = 6.907. The tf part = 3 × 2.2 / (3 + 1.2) = 1.571. Score = 6.907 × 1.571 = <strong>10.85</strong>.<br>Now press the presets: with spam (tf = 50), TF-IDF becomes 345, while BM25 is only 14.84 (ceiling 15.20). The common word "video" (df = 9 lakh) has a BM25 of only 0.17. A long document (4× average) drops from 10.85 to 6.61.` },
      { type: 'custom', render(el) {
        const F = [['N', 'Total documents (N)', 1000000], ['df', 'Documents with this word (df)', 1000], ['tf', 'Times in this document (tf)', 3], ['dl', 'Length of this document (terms)', 100], ['avg', 'Average length (terms)', 100], ['k1', 'k1', 1.2], ['b', 'b', 0.75]];
        const PRE = [['Rare word "googly"', { df: 1000, tf: 3, dl: 100 }], ['Common word "video"', { df: 900000, tf: 3, dl: 100 }], ['Spam: tf = 50', { df: 1000, tf: 50, dl: 100 }], ['Long document', { df: 1000, tf: 3, dl: 400 }]];
        el.innerHTML = `<div class="bmPre" style="display:flex;flex-wrap:wrap;gap:8px"></div>
          <div class="row2" style="margin-top:10px">${F.map(([k, l, v]) => `<div><label for="bm_${k}">${l}</label><input id="bm_${k}" type="number" min="0" step="any" value="${v}"></div>`).join('')}</div>
          <pre class="ascii bmCalc" style="margin-top:12px;white-space:pre-wrap"></pre>
          <div class="stats">
            <div class="stat"><span>TF-IDF</span><strong class="bmTf"></strong></div>
            <div class="stat"><span>BM25</span><strong class="bmBm"></strong></div>
            <div class="stat"><span>BM25 ceiling (tf → ∞)</span><strong class="bmCap"></strong></div>
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
          q('.bmNote').textContent = `One BM25 term never goes above ${fx(idfB * (k1 + 1), 2)} (idf × (k1 + 1)), however big tf is. TF-IDF has no ceiling: 10 times the tf means 10 times the score. A common word has a small idf, so its score is small too.`;
        };
        el.querySelectorAll('input').forEach(x => x.addEventListener('input', upd));
        upd();
      }},
      { type: 'callout', tone: 'tip', title: 'Real ranking is not just BM25', html: `Real products use BM25 as a "first filter". More signals are added on top: views, likes, freshness (new videos), the user's language, click-through. Big systems first take the top ~1000 with BM25, then an ML model ranks those 1000 again (re-ranking). Field boosting is also common: a match in the title is worth more than a match in the description.` },

      { type: 'h2', text: 'Elasticsearch / OpenSearch from the inside' },
      { type: 'p', html: `Building an inverted index on one machine is easy. But xyz.com's crores of videos and thousands of searches per second do not fit on one machine. <strong>Elasticsearch</strong> (and its open-source fork <strong>OpenSearch</strong>) take Lucene and make it distributed.` },
      { type: 'callout', tone: 'term', title: 'Elasticsearch index and node', html: `<strong>What it is:</strong> in Elasticsearch an <strong>index</strong> = a collection of documents (like "videos"), similar to a database table. A <strong>node</strong> = one machine (server) in the cluster.<br><strong>Why we need it:</strong> one index's data must be spread over many nodes.<br><strong>Without it:</strong> everything on one machine, and that machine's RAM/disk/CPU is the limit.` },
      { type: 'callout', tone: 'term', title: 'Shard', html: `<strong>What it is:</strong> one piece of an index. Every shard is a complete Lucene index on its own. Split an index into 3 shards and each shard holds ~1/3 of the documents, on different machines.<br><strong>Why we need it:</strong> crores of documents do not fit on one machine, and 3 machines searching together are faster.<br><strong>Without it:</strong> one machine's limit is the limit of the whole search.` },
      { type: 'callout', tone: 'term', title: 'Replica', html: `<strong>What it is:</strong> a full copy of a shard, always on another machine. The original is called the <strong>primary</strong>.<br><strong>Why we need it:</strong> if a machine falls, the data survives (the replica becomes the primary), and searches can also be spread over replicas.<br><strong>Without it:</strong> one machine gone = that shard's data gone from search.` },
      { type: 'callout', tone: 'term', title: 'Segment and refresh', html: `<strong>What it is:</strong> a <strong>segment</strong> = a small inverted index inside a shard that never changes (immutable). New documents first go into a memory buffer; a <strong>refresh</strong> puts them into a new segment and makes them searchable. In the background, small segments keep getting merged.<br><strong>Why we need it:</strong> immutable files are easy to cache and to read without locks.<br><strong>Without it (the price):</strong> a new document is not visible right away; you wait for the refresh.` },
      { type: 'list', items: [
        `Which shard a document goes to: <code>shard = hash(document id) % number of primary shards</code> (simplified). That is why the number of primary shards cannot change after the index is created; to change it, create a new index and "reindex" the data. In Elasticsearch the default is 1 primary shard and 1 replica.<br><em>Example:</em> 3 shards, document "v901": say hash("v901") = 3,141,592,654. 3,141,592,654 % 3 = 1, so shard 1. If we later made it 4 shards, % 4 = 2: now Elasticsearch would look for this document in shard 2, while it sits in shard 1. That is why the count is fixed.`,
        `A primary and its replica are never put on the same machine (node); otherwise one machine falling would take both.`,
        `<strong>Near real-time:</strong> a new document is not searchable right away. Elasticsearch does a <strong>refresh</strong> about every 1 second: a new segment opens, and then the document shows up in search. (On an index that has had no search for the last 30 seconds, this automatic refresh pauses, to save resources.)`,
      ]},
      { type: 'flow', title: 'Elasticsearch cluster: 3 primary shards (P0, P1, P2), each with one replica (R0, R1, R2)', height: 340,
        nodes: [
          { id: 'app', label: 'xyz.com app', sub: 'search API', x: 90, y: 170, w: 140, kind: 'server', info: 'What it is: xyz.com\'s own backend. It takes the user\'s query and sends Elasticsearch a JSON query. The user never talks to Elasticsearch directly.' },
          { id: 'co', label: 'Coordinating', sub: 'any node', x: 310, y: 170, w: 150, kind: 'net', info: 'What it is: any node of the cluster that becomes the manager of this request. The node that received the request becomes the "coordinator": it sends the query to every shard (one copy of each, primary or replica), merges everyone\'s top results, then asks for the final documents. This pattern is called scatter-gather.' },
          { id: 'n1', label: 'Data node 1', sub: 'P0, R2', x: 570, y: 60, w: 170, kind: 'data', info: 'What it is: a machine that holds data. The primary of shard 0 and the replica of shard 2. Every shard is a complete Lucene index with its own segments.' },
          { id: 'n2', label: 'Data node 2', sub: 'P1, R0', x: 570, y: 170, w: 170, kind: 'data', info: 'What it is: the second data machine. The primary of shard 1 and the replica of shard 0. A primary and its replica are never on the same node.' },
          { id: 'n3', label: 'Data node 3', sub: 'P2, R1', x: 570, y: 280, w: 170, kind: 'data', info: 'What it is: the third data machine. The primary of shard 2 and the replica of shard 1.' },
        ],
        edges: [{ a: 'app', b: 'co' }, { a: 'co', b: 'n1' }, { a: 'co', b: 'n2' }, { a: 'co', b: 'n3' }, { a: 'n1', b: 'n2', id: 'rep', dashed: true }],
        scenarios: [
          { name: 'Search (scatter-gather)', steps: [
            { title: 'A query arrives', text: 'The user searched "cricket batting". The app sends a query.', go: 'app>co', msg: 'GET /videos/_search  { "query": { "match": { "title": "cricket batting" } }, "size": 10 }' },
            { title: 'Scatter: ask every shard', text: 'Each shard has only 1/3 of the data, so all three must be asked. Each shard finds its own top 10 with BM25 (only IDs and scores).', parallel: true, go: ['co>n1', 'co>n2', 'co>n3'] },
            { title: 'Gather: merge', text: 'Three lists (30 results) arrive, and the coordinator sorts them by score and picks the global top 10. This is called the <strong>query phase</strong>.', parallel: true, go: ['res:n1>co', 'res:n2>co', 'res:n3>co'], msg: 'shard0: [v12: 7.1, v88: 6.4 ...]\nshard1: [v45: 8.0 ...]\nshard2: [v7: 6.9 ...]' },
            { title: 'Fetch phase', text: 'Now it fetches the full data (title, thumbnail) of only those 10 documents from their shards, and sends it to the app.', go: ['co>n2', 'res:n2>co', 'res:co>app'] },
            { title: 'Note: the slowest shard', text: 'Total time = the time of the slowest shard. If one shard has a GC pause or a hot node, the whole search is slow. That is why we watch p99 latency and do not create too many shards.', focus: ['co'] },
          ]},
          { name: 'New document + refresh', steps: [
            { title: 'Index request', text: 'A new video arrived. hash(id) % 3 = 0, so it goes to shard 0. The primary of shard 0 is on Node 1.', go: 'app>co>n1', msg: 'PUT /videos/_doc/v901  { "title": "Cricket batting drills" }' },
            { title: 'Copy to the replica', text: 'The primary writes first, then sends it to the replica (R0 on Node 2). Only after both have it is it "done" (ack).', go: ['n1>n2', 'res:n2>n1', 'res:n1>co>app'], after: { n1: { sub: 'P0 +v901 (buffer)' } } },
            { title: 'Search right away: not found!', text: 'The document is still in the memory buffer, not in any segment. Before a refresh, search cannot see it.', go: ['app>co>n1', 'res:n1>co>app'], set: { n1: { state: 'warn' } }, msg: 'hits: 0' },
            { title: 'Refresh after ~1 second', text: 'The refresh opened a new segment. Now the document is searchable. That is why we say Elasticsearch is <strong>near real-time</strong>, not real-time.', go: ['app>co>n1', 'res:n1>co>app'], set: { n1: { state: 'ok', sub: 'P0, R2 (refreshed)' } }, msg: 'hits: 1  (v901)' },
          ]},
          { name: 'Node 1 crash', steps: [
            { title: 'Node 1 fell', text: 'P0 and R2 both went down with it.', set: { n1: { state: 'down', sub: 'DOWN' } }, go: 'lost:co>n1' },
            { title: 'Replica promoted', text: 'The replica of shard 0 (R0) is on Node 2. The cluster makes it the new primary. The primary of shard 2 is safe on Node 3. Not a single piece of data was lost.', after: { n2: { state: 'ok', sub: 'P1, P0 (promoted)' } }, focus: ['n2'] },
            { title: 'Search keeps working', text: 'One copy of every shard is still alive, so search gives full results. Cluster health is "yellow": the data is safe, but some replicas are missing. In the background, new replicas are built on the remaining nodes.', parallel: true, go: ['co>n2', 'co>n3', 'res:n2>co', 'res:n3>co'] },
            { title: 'What if there were no replica?', text: 'With 0 replicas, when Node 1 falls, the data of shards 0 and 2 is unavailable: the cluster is "red" and search gives incomplete results. In production, use at least 1 replica.', focus: ['n1'] },
          ]},
        ],
      },
      { type: 'h3', text: 'Cluster lab: shards, replicas and health' },
      { type: 'p', html: `An Elasticsearch cluster reports its health in three colours. <strong>Green</strong> = every copy of every shard is running. <strong>Yellow</strong> = all the data is available, but some replicas are missing (one more machine failing is a risk). <strong>Red</strong> = some shard has no copy at all: that data will not show up in search. Below, change the shards, replicas and nodes, then click nodes to "kill" them. (Placement here is a simplified round-robin; real Elasticsearch also looks at disk and load, but the rule "two copies of one shard never share a node" is the same.)` },
      { type: 'custom', render(el) {
        el.innerHTML = `<div class="row2">
            <div><label for="esP">Primary shards: <strong class="esPV"></strong></label><input id="esP" type="range" min="1" max="6" step="1" value="3"></div>
            <div><label for="esR">Replicas (per shard): <strong class="esRV"></strong></label><input id="esR" type="range" min="0" max="2" step="1" value="1"></div>
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
          // Simplified placement: copy c of shard s goes to node (s + c) % M. Two copies of one shard never share a node; if there is no room, it stays unassigned.
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
          const where = live[sh].length ? live[sh].map(n => 'Node ' + (n + 1)).join(', ') : 'no live copy!';
          const why = health === 'green' ? 'Every copy of every shard is alive.' : health === 'yellow' ? `All data is available (where a primary died, a replica became primary), but ${missingCopies} copy/copies are missing or unassigned.` : 'Some shard has no live copy at all: that data will not show up in search now.';
          q('.esNote').textContent = `${P} primary × ${R + 1} copies = ${P * (R + 1)} shard copies on ${M} node(s). ${why} ${unassigned.length ? `${unassigned.length} replica(s) could not be assigned: two copies of one shard never share a node, and there are too few nodes. ` : ''}Routing: hash("${id}") % ${P} = shard ${sh} → ${where}. Click a node to kill it / bring it back.`;
        };
        el.querySelectorAll('input').forEach(x => x.addEventListener('input', upd));
        upd();
      }},
      { type: 'callout', tone: 'mistake', title: 'Do not make Elasticsearch your main database', html: `Elasticsearch is excellent for search, but it is not built for transactions, strong consistency or "the record of money / orders". If the mapping is wrong, you must reindex everything. So the pattern is: <strong>the database is the source of truth, and the search index is a copy of it</strong> that can be rebuilt at any time.` },

      { type: 'h2', text: 'How do we keep search in sync with the database?' },
      { type: 'p', html: `Now the data is in two places: Postgres (the original) and Elasticsearch (a copy). If someone changes a video's title, it must change in the search index too. First idea: the app writes to both ("dual write"). Problem: it wrote to the DB, then while writing to ES the network failed or the app crashed, and now the two differ. Or two updates reach ES in the wrong order and the old title wins. These mistakes happen silently and are hard to find.` },
      { type: 'callout', tone: 'term', title: 'CDC (Change Data Capture)', html: `<strong>What it is:</strong> a way to "catch" the database's changes. Every database first writes its changes into a log (WAL = write-ahead log in Postgres, binlog in MySQL), for crash recovery and replication. A CDC tool (like <strong>Debezium</strong>) reads that log and turns every INSERT/UPDATE/DELETE into an event in Kafka.<br><strong>Why we need it:</strong> the app does nothing extra: whatever was committed in the DB becomes an event, in the same order.<br><strong>Without it:</strong> dual write: the app writes to both places, and when half of it fails, the two copies silently drift apart.` },
      { type: 'flow', title: 'Postgres → Debezium → Kafka → Indexer → Elasticsearch', height: 300,
        nodes: [
          { id: 'app', label: 'xyz.com app', sub: 'writes + search', x: 90, y: 70, w: 140, kind: 'server', info: 'What it is: xyz.com\'s backend. It writes only to the database. It reads search queries from Elasticsearch.' },
          { id: 'db', label: 'Postgres', sub: 'source of truth', x: 80, y: 230, w: 120, kind: 'data', info: 'What it is: the main database, the source of truth (the real data). Every commit first goes into the WAL (write-ahead log).' },
          { id: 'cdc', label: 'Debezium', sub: 'reads the WAL', x: 230, y: 230, w: 120, kind: 'server', info: 'What it is: a CDC tool (connector). It reads Postgres\'s WAL through logical decoding and turns every row change into an event. It remembers how far it has read (its position, or offset), so after a restart it continues from there.' },
          { id: 'k', label: 'Kafka', sub: 'change events', x: 380, y: 230, w: 120, kind: 'queue', info: 'What it is: a durable stream of events (Kafka lesson). It keeps events in a durable log. Make the video id the key, and all changes of one video go to one partition, in the right order. If the consumer falls, the events wait here.' },
          { id: 'ix', label: 'Indexer', sub: 'consumer', x: 530, y: 230, w: 120, kind: 'server', info: 'What it is: our small consumer program. It reads events from Kafka and creates/updates/deletes Elasticsearch documents. We keep document id = video id, so even if the same event comes twice the result is the same (idempotent).' },
          { id: 'es', label: 'Elasticsearch', sub: 'search copy', x: 630, y: 90, w: 140, kind: 'cache', info: 'What it is: the search engine, a copy kept for search. It may be a little behind (seconds), but it can be rebuilt from Kafka/the DB at any time.' },
        ],
        edges: [{ a: 'app', b: 'db' }, { a: 'db', b: 'cdc' }, { a: 'cdc', b: 'k' }, { a: 'k', b: 'ix' }, { a: 'ix', b: 'es' }, { a: 'app', b: 'es', dashed: true }],
        scenarios: [
          { name: 'Happy path', steps: [
            { title: 'Title update', text: 'The creator changed the video\'s title. The app writes only to Postgres.', go: ['app>db', 'res:db>app'], msg: 'UPDATE videos SET title = \'Cricket batting masterclass\' WHERE id = 42' },
            { title: 'Event from the WAL', text: 'The commit went into the WAL. Debezium read it and made an event.', go: 'evt:db>cdc>k', msg: '{ "op": "u", "id": 42, "before": {...}, "after": { "title": "Cricket batting masterclass" } }' },
            { title: 'The indexer updates ES', text: 'The consumer picked up the event and overwrote document 42.', go: 'evt:k>ix>es', after: { es: { state: 'ok', sub: 'v42 updated' } } },
            { title: 'New title in search', text: 'After the refresh, search shows the new title. The whole trip usually takes a second or two.', go: ['app>es', 'res:es>app'] },
          ]},
          { name: 'Lag: an old result', steps: [
            { title: 'Updated, then searched right away', text: 'The creator changed the title and searched for it 200 ms later.', go: ['app>db', 'res:db>app'] },
            { title: 'The event is still on its way', text: 'The event is in Kafka but has not reached the indexer (or the ES refresh is pending).', go: 'evt:db>cdc>k', set: { k: { state: 'warn', sub: '1 event pending' } } },
            { title: 'Search shows the old title', text: 'This is <strong>eventual consistency</strong>: the copy is a little behind. Usually fine for search. A fix if it bothers the creator: show their own edit screen from the DB, or show the new title in the UI right away.', go: ['app>es', 'res:es>app'], set: { es: { state: 'warn', sub: 'old title' } }, msg: 'hits: "Cricket batting tips" (old)' },
            { title: 'Fixed shortly after', text: 'The event arrived and the index was updated.', go: 'evt:k>ix>es', set: { k: { state: '', sub: 'change events' } }, after: { es: { state: 'ok', sub: 'new title' } } },
          ]},
          { name: 'Elasticsearch down', steps: [
            { title: 'The ES cluster fell', text: 'The indexer cannot write.', set: { es: { state: 'down', sub: 'DOWN' } }, go: 'bad:ix>es' },
            { title: 'Writes keep working', text: 'Uploads and edits are normal, because the app writes only to Postgres. Events pile up in Kafka (backlog / consumer lag).', flood: { paths: ['evt:db>cdc>k'], n: 8 }, after: { k: { state: 'warn', sub: 'backlog: 50k events' } } },
            { title: 'A fallback for search', text: 'The search box shows "search is unavailable right now", or makes do with a very simple DB query (only on the title prefix). The rest of the site stays alive.', go: 'bad:app>es' },
            { title: 'ES is back, catch-up', text: 'The indexer starts reading from its last offset and works through the backlog. Nothing was lost, because Kafka kept the events safe.', set: { es: { state: 'ok', sub: 'catching up' } }, flood: { paths: ['evt:k>ix>es'], n: 8 }, after: { k: { state: '', sub: 'lag 0' } } },
          ]},
          { name: 'The dual-write trap', intro: 'What if the app itself wrote to both places instead of using CDC.', steps: [
            { title: 'Written to the DB', text: 'The first write succeeded.', set: { cdc: { state: 'dim' }, k: { state: 'dim' }, ix: { state: 'dim' } }, go: ['app>db', 'res:db>app'] },
            { title: 'ES write failed', text: 'Network timeout. The app crashed, or forgot to retry.', go: 'lost:app>es' },
            { title: 'A silent mismatch', text: 'The new title in the DB, the old one in search. Forever, until someone does a full reindex. So: write in only one place (the DB), and build other copies from the log.', set: { es: { state: 'warn', sub: 'wrong data' } }, focus: ['es', 'db'] },
          ]},
        ],
      },
      { type: 'list', items: [
        `<strong>A delete is an event too:</strong> on a delete, Debezium sends an event, and the indexer removes the document from ES. A soft delete (is_deleted = true) is an update event.`,
        `<strong>Order:</strong> Kafka partition key = video id, so one video's changes arrive in order. Extra safety: send a version with the ES document (like the DB's updated_at or the log position), so an old version cannot overwrite a newer one.`,
        `<strong>Full reindex:</strong> to change the mapping/analyzer, create a new index, bulk-copy from the DB, let the CDC events run, then switch an "alias" to the new index. Users never notice.`,
      ]},
      { type: 'callout', tone: 'why', title: 'Decide', html: `Keep the database as the <strong>source of truth</strong> and fill the search index from it <strong>asynchronously</strong> (through CDC + Kafka). Search can be a few seconds behind; for most products that is perfectly fine. Add a search engine only when you need full-text, typo tolerance, ranking or facets (filters like "duration: 4-20 min"); for a plain "lookup by ID", the database is enough.` },

      { type: 'h2', text: 'Autocomplete: a suggestion on every keystroke' },
      { type: 'p', html: `The user types "cri" and "cricket live score", "cricket highlights" appear below at once. Every keystroke is a new request, and the answer is needed within ~50 ms, or the suggestions "shake" while typing. A full search query on every keystroke is far too heavy. For this there is a separate structure: the <strong>trie</strong>.` },
      { type: 'callout', tone: 'term', title: 'Trie (prefix tree)', html: `<strong>What it is:</strong> a tree where every edge is one character. Walk from the root "c" → "r" → "i", and all the words below the node you reach start with "cri".<br><strong>Why we need it:</strong> finding a prefix = as many steps as the prefix length, even if the dictionary has crores of words.<br><strong>Without it:</strong> on every keystroke you would scan all queries to find the ones starting with "cri".` },
      { type: 'callout', tone: 'term', title: 'Top-k', html: `<strong>What it is:</strong> the k items at the top (here k = 3: the 3 most-searched queries).<br><strong>Why we need it:</strong> the user sees only 3-10 suggestions, not all of them.<br><strong>Without it:</strong> counting and sorting the lakhs of queries under "c" every time: very slow.` },
      { type: 'p', html: `A trie alone is not enough: there are lakhs of queries under "c", and counting all of them every time to pick the top 3 is slow. The trick: <strong>save the top-k suggestions in advance</strong> at every node. Now a lookup = walk to the prefix and pick up the list kept there. An offline job rebuilds these top-k lists from query logs (say every hour or day).` },
      { type: 'custom', render(el) {
        const BASE = [['cricket live score', 1200], ['cricket', 900], ['cricket highlights', 700], ['cricket world cup', 650], ['cr7 goals', 500],
          ['crypto news', 400], ['crime thriller movies', 300], ['comedy videos', 450], ['coding tutorial', 350], ['camera review', 250], ['college lectures', 200], ['chess openings', 380]];
        let counts = BASE.map(x => x.slice());
        el.innerHTML = `<div class="row2">
            <div><label>Type (prefix)</label><input type="text" class="tr-p" value="cri" autocomplete="off"></div>
            <div><label>Search something (its count +100)</label><div style="display:flex;gap:8px;flex-wrap:wrap"><input type="text" class="tr-s" value="cricket highlights" style="max-width:200px"><button type="button" class="btn small primary tr-go">Search</button><button type="button" class="btn small ghost tr-rs">Reset</button></div></div>
          </div>
          <div class="tr-path" style="font:14px/1.7 var(--f-mono);margin-top:12px"></div>
          <div class="tr-sug" style="margin-top:8px"></div>
          <div class="stats">
            <div class="stat"><span>Nodes in the trie</span><strong class="tr-n"></strong></div>
            <div class="stat"><span>Steps (with top-k cache)</span><strong class="tr-st"></strong></div>
            <div class="stat"><span>Queries scanned (without cache)</span><strong class="tr-sc"></strong></div>
          </div>
          <div class="calc-note">Every node keeps its top 3 (k = 3) ready in advance. Pressing "Search" raises the count and the top-k is rebuilt, like an offline job does from query logs in a real system.</div>`;
        const pE = el.querySelector('.tr-p'), sE = el.querySelector('.tr-s');
        const upd = () => {
          const { root, nodes } = T.buildTrie(counts, 3);
          const p = pE.value.toLowerCase();
          let node = root, path = [], ok = true;
          for (const ch of p) { if (node.c[ch]) { node = node.c[ch]; path.push(ch); } else { ok = false; break; } }
          el.querySelector('.tr-path').innerHTML = 'root → ' + path.map(c => `<strong>${esc(c === ' ' ? '␣' : c)}</strong>`).join(' → ') + (ok ? '' : ` → <span style="color:var(--red)">"${esc(p[path.length])}" has no child</span>`) +
            (ok && Object.keys(node.c).length ? `<div style="color:var(--ink-3)">Children of this node: ${Object.keys(node.c).sort().map(c => esc(c === ' ' ? '␣' : c)).join(', ')}</div>` : '');
          el.querySelector('.tr-sug').innerHTML = ok ? node.top.map(([q, n], i) => `<div style="padding:6px 10px;border:1px solid var(--line);border-radius:var(--r-sm);margin:4px 0;background:var(--surface-2)">${i + 1}. <strong>${esc(q.slice(0, p.length))}</strong>${esc(q.slice(p.length))} <span style="color:var(--ink-3);font-size:13px">(${n.toLocaleString('en-IN')} searches)</span></div>`).join('') : '<div style="color:var(--ink-3)">No suggestions.</div>';
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
      { type: 'p', html: `More parts of a real autocomplete system:` },
      { type: 'list', items: [
        `<strong>In memory:</strong> the trie (or a compressed form of it) is kept in RAM, and when it does not fit on one machine, it is sharded by the first letters of the prefix. Elasticsearch's completion suggester also uses an in-memory structure on this idea (an FST, a compact cousin of the trie).`,
        `<strong>Offline rebuild:</strong> count popular queries from the query logs every hour or day, build a new trie, and swap it onto the servers. For trending things (today's match), a small real-time layer on top.`,
        `<strong>Client side:</strong> do not send a request on every keystroke; <strong>debounce</strong> for ~100-200 ms (wait for the user to pause). Results for short prefixes ("c", "cr") are the same for everyone, so cache them in the browser and on the CDN.`,
        `<strong>Filtering:</strong> a blocklist for wrong/offensive suggestions, and personalization (the user's past searches) mixed in on top.`,
      ]},
      { type: 'callout', tone: 'mistake', title: 'Autocomplete is not search', html: `Autocomplete suggests a <em>query</em> (what people searched for); search finds <em>documents</em>. Their data, latency budget and structure are different. A trie is for prefixes; it does not work for "a word in the middle" or typos (for those, the search engine's n-gram/fuzzy matching).` },

      { type: 'h2', text: 'Semantic search: meaning, not words' },
      { type: 'p', html: `The user typed "cheap phone". The video's title is "Budget smartphone under 10k". Not a single word is shared, so an inverted index will never find it, however good BM25 is. We need matching by meaning.` },
      { type: 'callout', tone: 'term', title: 'Embedding', html: `<strong>What it is:</strong> an ML model turns text into a list of numbers (a vector), like [0.12, -0.53, 0.88, ...], usually hundreds to thousands of numbers. The model is trained so that <strong>texts with similar meanings get vectors close together</strong>.<br><strong>Why we need it:</strong> the vectors of "cheap phone" and "budget smartphone" point in almost the same direction, even if not one word is shared.<br><strong>Without it:</strong> only exact words match; results with the same meaning are missed.` },
      { type: 'callout', tone: 'term', title: 'Cosine similarity', html: `<strong>What it is:</strong> a number for how much two vectors point the same way: 1 = exactly the same direction, 0 = no relation, −1 = opposite directions. Formula: (a · b) / (|a| × |b|).<br><strong>Why we need it:</strong> search = make the query's vector, and bring the documents with the highest cosine similarity.<br><strong>Example:</strong> arrows at 20° and 24°: cos(4°) = 0.998, very close. 24° and 84°: cos(60°) = 0.5.` },
      { type: 'p', html: `Below is a toy version: real embeddings have hundreds of dimensions; here there are only 2 so it is easy to see. Pick a query and see what keyword matching and meaning matching say:` },
      { type: 'custom', render(el) {
        const deg = a => [Math.cos(a * Math.PI / 180), Math.sin(a * Math.PI / 180)];
        const DOCS = [
          { t: 'Budget smartphone under 10k', v: deg(20) },
          { t: 'Low-cost mobile phone deals', v: deg(30) },
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
          el.querySelector('.emb-note').textContent = `Top 2 by meaning: D${top2[0].i + 1} and D${top2[1].i + 1}. Keyword match found only ${rows.filter(r => r.kw > 0).length} document(s) (common words > 0). Embeddings found the right documents even without common words.`;
        };
        draw();
      }},
      { type: 'h3', text: 'How do we find the nearest among crores of vectors? (ANN)' },
      { type: 'p', html: `The direct way: compare the query with every document's vector. 10 crore videos × 768 numbers = billions of multiplications for every query. Far too slow. For this there are <strong>ANN (Approximate Nearest Neighbour)</strong> indexes: they give up the guarantee of the 100% exact nearest, and return almost-correct results very fast. ANN = "the nearest neighbours, almost exactly".` },
      { type: 'callout', tone: 'term', title: 'HNSW', html: `<strong>What it is:</strong> Hierarchical Navigable Small World: a graph of vectors where every vector is linked to a few nearby neighbours, in several layers. The top layer has few nodes and long jumps; lower down the graph is dense. Search starts at the top, each time jumps to "the neighbour closer to the query", and keeps moving down.<br><strong>Why we need it:</strong> almost-correct nearest neighbours in milliseconds, even among crores of vectors.<br><strong>The price:</strong> the graph must be in RAM and building it is expensive. Elasticsearch/OpenSearch kNN search, pgvector (a Postgres extension), and vector databases (Pinecone, Milvus, Weaviate) use ANN indexes like HNSW.` },
      { type: 'p', html: `ANN's trade-off is one knob: explore more of the graph and <strong>recall</strong> (how many of the true nearest you found) goes up, but so does latency. Usually 95-99% recall still gives quite fast search.` },
      { type: 'h3', text: 'Hybrid search: the best of both' },
      { type: 'p', html: `Embeddings understand meaning, but can be weak with exact things: a product code "SM-A156", a creator's name, or new slang the model never saw. BM25 is strong at exact words. So today <strong>hybrid search</strong> is common: run both and combine the results. A simple and popular way is <strong>Reciprocal Rank Fusion (RRF)</strong>: if a document has rank r in a list, give it 1/(60 + r) points, and add them up (in Elasticsearch, 60 is the default constant).` },
      { type: 'table', head: ['Document', 'BM25 rank', 'Vector rank', 'RRF score'], rows: [
        ['A', '1', '3', '1/61 + 1/63 = 0.0323'],
        ['B', '2', '1', '1/62 + 1/61 = <strong>0.0325</strong> (wins)'],
        ['C', '3', 'not in the list', '1/63 = 0.0159'],
      ], caption: 'RRF does not need the scale of the scores, only the ranks. So lists with different scales, like BM25 and cosine, combine easily.' },

      { type: 'h2', text: 'What to use when?' },
      { type: 'table', head: ['Need', 'What to use'], rows: [
        ['Lookup by ID / exact value', 'A database index; no search engine needed'],
        ['Small app, simple text search', 'Postgres full-text search (tsvector + GIN index) may be enough'],
        ['Full-text, ranking, typo tolerance, facets, big scale', 'Elasticsearch / OpenSearch, synced with the DB through CDC'],
        ['Suggestions on every keystroke', 'Trie + precomputed top-k, in memory, CDN cache'],
        ['Search by meaning, "similar videos", AI/RAG', 'Embeddings + a vector index (HNSW): pgvector, ES kNN, a vector DB'],
        ['Both exact words and meaning', 'Hybrid: BM25 + vectors, merged with RRF'],
      ]},
      { type: 'diagram', title: 'Search: the whole picture in xyz.com', height: 530,
        groups: [
          { label: 'Users', x: 200, y: 14, w: 320, h: 92 },
          { label: 'Async sync (CDC)', x: 20, y: 398, w: 680, h: 118 },
        ],
        nodes: [
          { id: 'usr', label: 'xyz.com app', sub: 'search box', x: 360, y: 66, kind: 'client', info: 'What it is: the user\'s phone or browser. Autocomplete on every keystroke, and the real search on Enter.' },
          { id: 'ac', label: 'Autocomplete', sub: 'trie + top-k', x: 110, y: 180, w: 150, kind: 'cache', info: 'What it is: a trie in memory, with the top-k queries ready at every node. Suggestions in ~50 ms. An offline job rebuilds it from query logs every hour or day. Short prefixes are cached on the CDN.' },
          { id: 'api', label: 'Search API', sub: 'xyz.com backend', x: 360, y: 180, w: 150, kind: 'server', info: 'What it is: our backend. Writes go to Postgres, search queries go to Elasticsearch. For semantic search it also gets the query\'s embedding.' },
          { id: 'emb', label: 'Embedding model', sub: 'text → vector', x: 600, y: 180, w: 160, kind: 'server', info: 'What it is: an ML model that turns text into a vector. The query\'s vector at search time, documents\' vectors at indexing time.' },
          { id: 'pg', label: 'Postgres', sub: 'source of truth', x: 175, y: 320, w: 150, kind: 'data', info: 'What it is: the main database. The real data lives here. Every commit goes into the WAL, which CDC reads.' },
          { id: 'es', label: 'Elasticsearch', sub: 'BM25 + kNN', x: 470, y: 320, w: 160, kind: 'cache', info: 'What it is: the search engine cluster. Shards + replicas. Both an inverted index (BM25) and a vector index (HNSW). A copy of the DB, a few seconds behind.' },
          { id: 'dbz', label: 'Debezium', sub: 'reads the WAL', x: 175, y: 457, w: 150, kind: 'server', info: 'What it is: the CDC tool. It turns every change in the Postgres log into an event.' },
          { id: 'kf', label: 'Kafka', sub: 'change events', x: 360, y: 457, w: 150, kind: 'queue', info: 'What it is: a durable stream of events. If ES is down, events wait here; key = video id keeps the order right.' },
          { id: 'ix', label: 'Indexer', sub: 'consumer', x: 600, y: 457, w: 150, kind: 'server', info: 'What it is: a consumer that reads events and creates/removes ES documents (doc id = video id, idempotent). It also gets the vectors made.' },
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
          { name: 'Search', text: 'The query goes from the Search API to Elasticsearch: analyzer, posting lists, BM25 ranking, scatter-gather over shards, top 10 back.', go: ['usr>api>es'] },
          { name: 'Data sync', text: 'The app writes only to Postgres. Debezium reads the WAL, an event goes into Kafka, and the indexer updates ES. Search is a few seconds behind.', go: ['api>pg>dbz>kf>ix>es'] },
          { name: 'Autocomplete', text: 'On every keystroke the prefix goes into the trie, and the top-k list kept there comes back at once.', go: ['usr>ac'] },
          { name: 'Semantic', text: 'Both the query and the documents become vectors; ES kNN (HNSW) returns the nearest vectors. Hybrid with BM25 through RRF.', go: ['usr>api>emb', 'api>es', 'ix>emb'] },
        ],
      },
      { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
        <li>LIKE '%word%' = a full table scan, with no ranking. A search engine builds an inverted index (term → posting list).</li>
        <li>Analyzer: tokenize → lowercase → stop words → stemming (→ synonyms). The same analyzer on documents and queries.</li>
        <li>TF-IDF = tf × idf. BM25 = a ceiling on tf (k1 = 1.2) + length normalization (b = 0.75). The Lucene/Elasticsearch default.</li>
        <li>Elasticsearch: index → shards (scale) → replicas (safety). The number of primary shards is fixed later. Refresh ~1 s: near real-time.</li>
        <li>The DB is the source of truth; sync the search index asynchronously with CDC (Debezium) + Kafka. Avoid dual writes.</li>
        <li>Autocomplete = a trie + top-k at every node, in memory, rebuilt offline, with debounce + CDN cache.</li>
        <li>Semantic search = embeddings + cosine + ANN (HNSW). Hybrid = BM25 + vectors, merged with RRF.</li>
      </ul>` },

      { type: 'tradeoffs',
        gains: ['Posting lists instead of a full table scan: milliseconds over crores of documents', 'BM25 puts relevant results on top and reduces the effect of spam and long documents', 'Shards for scale, replicas for high availability', 'CDC keeps the DB and search in sync, with simple app code', 'Trie + top-k gives ~50 ms autocomplete', 'Embeddings find the right results even without shared words'],
        costs: ['One more big system to run (cluster, mappings, upgrades)', 'Search is a few seconds behind (eventual consistency)', 'Index storage: one more copy of the data, plus the size of the inverted index', 'Changing the number of shards later = a reindex', 'Embeddings: GPU/model costs, RAM-hungry HNSW, approximate results', 'Relevance tuning is work that never ends'],
      },
      { type: 'think', questions: [
        { q: 'Every second 2,000 new videos arrive on xyz.com, and creators complain "right after upload, my video does not show in search". What will you do?', a: 'First find where the delay is: CDC/Kafka consumer lag or the ES refresh. For lag, add more indexer consumers and use bulk requests. If the refresh is already 1 second, expecting "instantly" is wrong; show creators their own video in the UI straight from the DB. Making the refresh interval shorter, or refreshing on every write, makes indexing very expensive.' },
        { q: 'The index was created with 3 primary shards; now the data is 20 times bigger and every shard is huge. What do we do?', a: 'The number of primary shards cannot change on an existing index (a document\'s shard is decided by hash % shards). Create a new index with more shards, reindex (from the DB/Kafka or with the ES reindex/split API), and switch the alias. So estimate growth at the start, but do not create very many small shards either: every shard has an overhead and every search touches all shards.' },
        { q: 'What goes wrong if we send a full Elasticsearch search query on every keystroke for autocomplete?', a: 'Each user sends 5-10 keystrokes per search, so the load is 5-10 times bigger, and every full query (analyzer, scoring, scatter-gather) struggles to fit a 50 ms budget. A trie + precomputed top-k is one lookup in memory. On top of that, client debounce (100-200 ms) and a CDN cache for short prefixes.' },
        { q: 'Searching for "The The" (a band\'s name) finds nothing. Why?', a: 'Both words are stop words, so the analyzer emptied the query (try it in the widget above). That is why modern setups are careful about removing stop words; BM25 gives common words little weight anyway.' },
      ]},
      { type: 'quiz', questions: [
        { q: 'Why is WHERE title LIKE \'%cricket%\' slow on a big table?', options: ['The LIKE command itself is slow', 'With % at the start, the B-tree index does not help, so it does a full table scan', 'The database cannot store text'], answer: 1, explain: 'A B-tree works on a sorted prefix. For "anywhere in the middle", every row must be read.' },
        { q: 'What is stored in an inverted index?', options: ['Document → its words', 'Term → the list of documents it appears in', 'Query → a result cache'], answer: 1, explain: 'Every term\'s posting list. A query = take the posting lists and intersect/union them.' },
        { q: 'Why is BM25 better than TF-IDF?', options: ['It does stemming', 'TF saturates and document length is normalized', 'It uses embeddings'], answer: 1, explain: 'k1 caps the effect of tf, and b reduces the bonus of long documents. Defaults k1 = 1.2, b = 0.75.' },
        { q: 'Why did a document just indexed in Elasticsearch not show up in search right away?', options: ['A replica failed', 'A new segment becomes searchable only after a refresh (default ~1 s)', 'The document went to the wrong shard'], answer: 1, explain: 'Near real-time: a refresh opens a new segment.' },
        { q: 'The safest way to keep the DB and the search index in sync?', options: ['The app writes to both', 'Write to the DB, read its log with CDC (Debezium), and update the index through Kafka', 'Delete and rebuild the whole index every night'], answer: 1, explain: 'One source of truth. With dual writes, a partial failure causes a silent mismatch.' },
        { q: 'A spam video\'s description has "cricket" 50 times. Compared with tf = 3, how much does that term\'s BM25 (k1 = 1.2) score grow?', options: ['About 17 times', 'A little: only up to the ceiling idf × 2.2 (calculator: from 10.85 to 14.84)', 'The score becomes zero'], answer: 1, explain: 'BM25 saturates tf. With TF-IDF the same goes from 20.72 to 345.' },
        { q: '3 primary shards, 1 replica, 3 nodes. One node falls. Cluster health?', options: ['Red: data is gone', 'Yellow: one copy of every shard is alive (a replica became primary), some replicas are missing', 'Green: nothing happened'], answer: 1, explain: 'The primary and replica were on different nodes, so all data is there. If two nodes fell, both copies of some shard could be gone: red. Try it in the cluster lab.' },
        { q: 'What does stemming do in the analyzer?', options: ['Sorts words alphabetically', 'Cuts the suffix down to the root: batting, bats → bat', 'Fixes typos'], answer: 1, explain: 'So different forms of a word become one term and match. The same stemming must also run on the query.' },
        { q: 'We need to find the "Budget smartphone" video from "cheap phone". What is needed?', options: ['Better stemming', 'Embeddings + vector search (or hybrid)', 'More shards'], answer: 1, explain: 'No common word, so keyword search fails. Embeddings for meaning.' },
      ]},
      { type: 'sources', note: 'Version-specific numbers and defaults were checked against these official docs.', items: [
        { title: 'Similarity module (BM25 defaults k1 = 1.2, b = 0.75)', publisher: 'Elastic docs', official: true, url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/index-modules-similarity.html', used: 'BM25 as the default similarity, and the k1, b defaults.' },
        { title: 'Practical BM25, Part 2: The BM25 Algorithm and its Variables', publisher: 'Elastic blog', year: 2018, official: true, url: 'https://www.elastic.co/blog/practical-bm25-part-2-the-bm25-algorithm-and-its-variables', used: 'The BM25 and Lucene IDF formulas, and the meaning of k1 and b.' },
        { title: 'LUCENE-8563 / LegacyBM25Similarity', publisher: 'Apache Lucene docs', official: true, url: 'https://lucene.apache.org/core/8_5_0/misc/org/apache/lucene/search/similarity/LegacyBM25Similarity.html', used: 'Lucene 8 removed the (k1+1) factor; the ranking order stays the same.' },
        { title: 'Near real-time search', publisher: 'Elastic docs', official: true, url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/near-real-time.html', used: 'Segments, refresh every 1 second, the 30-second search-idle rule.' },
        { title: 'Index modules (number_of_shards, number_of_replicas, refresh_interval)', publisher: 'Elastic docs', official: true, url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/index-modules.html', used: 'Default 1 shard + 1 replica; the shard count is fixed after the index is created.' },
        { title: 'Reciprocal rank fusion', publisher: 'Elastic docs', official: true, url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/rrf.html', used: 'The RRF formula and the default rank_constant of 60.' },
        { title: 'Debezium connector for PostgreSQL', publisher: 'Debezium docs', official: true, url: 'https://debezium.io/documentation/reference/stable/connectors/postgresql.html', used: 'Row-level change events from the WAL through logical decoding.' },
        { title: 'Efficient and robust approximate nearest neighbor search using HNSW graphs (Malkov, Yashunin)', publisher: 'arXiv paper', year: 2016, url: 'https://arxiv.org/abs/1603.09320', used: 'The layered graph idea of HNSW.' },
      ]},
    ],
  });
})();
