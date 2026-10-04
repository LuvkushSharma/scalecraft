Lesson.register({
  id: 'ai-tokenization',
  title: 'Tokens, tokenization and embeddings',
  minutes: 34,
  summary: `A model only understands numbers. How do we turn text into numbers? In this lesson: what tokens are, run BPE, WordPiece and Unigram/SentencePiece yourself, vocab and token IDs, why Hindi/Hinglish uses more tokens (with numbers from real tokenizers), and the journey from a token ID to an embedding vector, with cosine similarity.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Inside a computer, an LLM can only do maths with numbers. It cannot read a word like "video" directly.<br>So first the text has to be cut into small pieces (<strong>tokens</strong>), and every piece gets a number. Like a roll number for every student in a school.<br>Then every number gets a list of numbers (an <strong>embedding</strong>) that captures its "meaning".<br>In this lesson we will see: how text is cut (BPE, WordPiece, Unigram), why Hindi uses more tokens, how that raises the bill, and how meaning gets into numbers.` },

    { type: 'h2', text: 'The problem: the model needs numbers, not text' },
    { type: 'p', html: `In the <a href="#/ai-what-is-llm">previous lesson</a>, xyz Assistant guessed the "next token". But inside, the model is only maths: matrix multiply, add, softmax. Text like "My video is not uploading" cannot go straight into maths. First the text has to become a <strong>list of numbers</strong>, and the numbers of the answer have to become text again.` },
    { type: 'p', html: `The question is: <em>what size of pieces</em> should we cut the text into? There are three options, and each one has its own problem.` },
    { type: 'table', head: ['Option', 'Example: "uploading videos"', 'Problem'], rows: [
      ['Characters', 'u, p, l, o, a, d, i, n, g, ␣, v, i, d, e, o, s (16 pieces)', 'The sequence is very long. The model has to join "u-p-l-o-a-d" into the meaning of "upload" by itself every time. A long sequence = more compute, more time.'],
      ['Words', 'uploading, videos (2 pieces)', 'The vocabulary never ends: every name, typo, Hinglish word ("uploadkiya") and new slang is a separate entry. A word that is not in the list becomes <code>[UNK]</code> (unknown): its meaning is lost.'],
      ['Subwords (tokens)', 'upload, ing, ␣videos (3 pieces)', 'The middle path. Common words stay whole, rare words become familiar pieces. No word is ever "unknown". This is what all LLMs use today.'],
    ], caption: 'The subword row is the real split from OpenAI\'s o200k_base tokenizer (checked with tiktoken).' },
    { type: 'callout', tone: 'term', title: 'New word: Token', html: `<strong>What it is:</strong> the piece of text that the model treats as one unit. It can be a whole word (" video"), part of a word ("ization"), punctuation ("?"), or even a single byte. In the model's world, text = a line of tokens.<br><strong>Why we need it:</strong> look at the table above: with characters the line is too long, with words the list never ends. Tokens are the balance between the two.<br><strong>Without it:</strong> either the model is very slow (character level), or it is blind to new words (word level, [UNK]).` },
    { type: 'callout', tone: 'term', title: 'New word: Tokenizer', html: `<strong>What it is:</strong> the program that cuts text into tokens and gives each token its number (token ID). It also does the reverse: IDs back to text (<strong>decode</strong>).<br><strong>Why we need it:</strong> only numbers go into the model. This is the translator between text and numbers.<br><strong>Without it:</strong> text could not reach the model at all, and the model's output numbers could not become text again.<br>Every model family has its own tokenizer, and a model always runs with the same tokenizer it was trained with.` },

    { type: 'h2', text: 'A real example: tokens and token IDs' },
    { type: 'p', html: `This is the real output of OpenAI's <code>o200k_base</code> tokenizer (GPT-4o family), taken from the <code>tiktoken</code> library:` },
    { type: 'table', head: ['Token', 'ID'], rows: [
      ['"How"', '5299'], ['" do"', '621'], ['" I"', '357'], ['" upload"', '12053'], ['" a"', '261'],
      ['" video"', '3823'], ['" on"', '402'], ['" xyz"', '82501'], ['".com"', '1136'], ['"?"', '30'],
    ], caption: '"How do I upload a video on xyz.com?" = 35 characters, 10 tokens. The model really only sees [5299, 621, 357, 12053, 261, 3823, 402, 82501, 1136, 30].' },
    { type: 'list', items: [
      `<strong>The space is part of the token.</strong> <code>" video"</code> (with a space in front) has ID 3823, but <code>"video"</code> without a space is 17615, <code>" Video"</code> is 11080, and <code>"VIDEO"</code> is 81385. To the model these are four different tokens.`,
      `<strong>Common words = one token.</strong> " upload" and " video" are one token each. Rare things get split: "xyz.com" becomes two tokens (" xyz" + ".com").`,
      `<strong>Rule of thumb (English):</strong> 1 token ≈ 4 characters ≈ ¾ of a word. Here it is 35 / 10 = 3.5 characters per token, quite close.`,
    ]},
    { type: 'callout', tone: 'term', title: 'New word: Vocabulary (vocab) and Token ID', html: `<strong>What it is:</strong> the <strong>vocabulary</strong> = the fixed list of all the tokenizer's tokens. Each token has a number in the list: its <strong>token ID</strong> (like a roll number). o200k_base has about 200,000 tokens, so the IDs go from 0 to about 200,000.<br><strong>Why we need it:</strong> the model needs a fixed "menu". The model's last layer also gives one logit (score) for exactly every token in this list.<br><strong>Without it:</strong> there would be no numbers for the input and no options for the output.` },

    { type: 'h2', text: 'BPE: how is the list of tokens made?' },
    { type: 'p', html: `No human wrote the list of about 200,000 tokens by hand. An algorithm looked at text and made it by itself. The most popular algorithm is <strong>BPE</strong>. GPT-2, GPT-4o, Llama 3: they all use versions of BPE.` },
    { type: 'callout', tone: 'term', title: 'New word: BPE (Byte Pair Encoding)', html: `<strong>What it is:</strong> an algorithm for building the list of tokens. Start from the smallest pieces (characters). Take the two pieces that appear next to each other most often, and join them into a new token. Do this again and again.<br><strong>Why we need it:</strong> nobody can choose 200,000 tokens by hand. BPE looks at the data and decides by itself which pieces are common enough to become one token.<br><strong>Without it:</strong> either only characters (a long line), or only whole words (a list that never ends).<br><strong>History:</strong> BPE was originally a data compression trick from 1994. In 2016, Sennrich and colleagues used it to split words for translation models.` },
    { type: 'steps', items: [
      { t: 'Pre-tokenize', d: 'First cut the text roughly into words (at spaces and punctuation), and count how many times each word appears. This is called pre-tokenization: a rough cut before the real tokenization. The benefit: a merge never happens across two words.' },
      { t: 'Base vocab', d: 'Break every word into characters. All the different characters = the starting vocabulary.' },
      { t: 'Count pairs', d: 'Inside each word, count how often every neighbouring pair (like "v"+"i") appears, weighted by how often the word appears.' },
      { t: 'Merge the most common pair', d: 'That pair becomes a new token ("vi"). Remember this merge rule in a list (the order matters).' },
      { t: 'Repeat', d: 'Until the vocab reaches the target size (about 50 thousand for GPT-2, 100-200 thousand for today\'s models).' },
    ]},
    { type: 'p', html: `Run it yourself. The "xyz corpus" has some xyz.com words (video ×8, videos ×5, view ×6, views ×4, review ×3, upload ×5, uploads ×3). The "HF corpus" is the classic example from the Hugging Face course. Press "Next merge" and see which pair is picked and why:` },
    { type: 'custom', render(el) {
      const CORP = { xyz: [['video', 8], ['videos', 5], ['view', 6], ['views', 4], ['review', 3], ['upload', 5], ['uploads', 3]],
        hf: [['hug', 10], ['pug', 5], ['pun', 12], ['bun', 4], ['hugs', 5]] };
      let ck = 'xyz', words, merges, base;
      el.innerHTML = `<div class="chips" style="margin-bottom:8px"><button type="button" class="chip on bC" data-k="xyz">xyz corpus</button><button type="button" class="chip bC" data-k="hf">HF corpus</button></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><button type="button" class="btn small primary bN">Next merge</button><button type="button" class="btn small ghost b5">5 merges</button><button type="button" class="btn small ghost bR">Reset</button></div>
        <div class="bW" style="display:grid;gap:6px"></div>
        <div class="bP calc-note"></div>
        <div class="stats"><div class="stat"><span>Merges done</span><strong class="bM"></strong></div><div class="stat"><span>Vocab size</span><strong class="bV"></strong></div><div class="stat"><span>Total tokens (corpus)</span><strong class="bT"></strong></div></div>
        <div class="bL" style="font-family:var(--f-mono);font-size:13px;color:var(--ink-2);margin:8px 0;word-break:break-word"></div>
        <label>Encode a new word (with the learned merges):</label><input class="bE" type="text" value="viewed" maxlength="20" style="max-width:240px">
        <div class="bO" style="margin-top:8px"></div>`;
      const q = s => el.querySelector(s);
      const chip = (t, bad) => `<span style="display:inline-block;padding:2px 7px;margin:2px;border-radius:var(--r-sm);font-family:var(--f-mono);font-size:13px;background:${bad ? 'var(--red)' : 'var(--accent-soft)'};color:${bad ? 'var(--bg)' : 'var(--accent-ink)'};border:1px solid var(--line)">${t}</span>`;
      const pairs = () => { const c = new Map(); words.forEach(w => { for (let i = 0; i < w.t.length - 1; i++) { const k = w.t[i] + '\u0000' + w.t[i + 1]; c.set(k, (c.get(k) || 0) + w.f); } }); return c; };
      const best = c => { let b = null, bc = -1; [...c.keys()].sort().forEach(k => { if (c.get(k) > bc) { bc = c.get(k); b = k; } }); return b; };
      const apply = (t, a, b) => { const n = []; for (let i = 0; i < t.length; i++) { if (i < t.length - 1 && t[i] === a && t[i + 1] === b) { n.push(a + b); i++; } else n.push(t[i]); } return n; };
      const reset = () => { words = CORP[ck].map(([w, f]) => ({ w, f, t: [...w] })); merges = []; base = new Set(); words.forEach(w => w.t.forEach(ch => base.add(ch))); draw(); };
      const step = () => { const c = pairs(); if (!c.size) return; const k = best(c); const [a, b] = k.split('\u0000'); merges.push([a, b, c.get(k)]); words.forEach(w => { w.t = apply(w.t, a, b); }); draw(); };
      const draw = () => {
        q('.bW').innerHTML = words.map(w => `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap"><code style="min-width:70px">${w.w} ×${w.f}</code><span>${w.t.map(x => chip(x)).join('')}</span></div>`).join('');
        const c = pairs(); const top = [...c.entries()].sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1)).slice(0, 4);
        q('.bP').innerHTML = top.length ? 'Candidates for the next merge (pair: count): ' + top.map(([k, v], i) => `<strong style="color:${i === 0 ? 'var(--accent-ink)' : 'var(--ink-2)'}">${k.replace('\u0000', ' + ')}: ${v}</strong>`).join(', ') + '. On equal counts, the alphabetically first pair is picked.' : 'Every word is now a single token. No more merges are possible.';
        q('.bM').textContent = merges.length; q('.bV').textContent = base.size + merges.length;
        q('.bT').textContent = words.reduce((s, w) => s + w.t.length * w.f, 0);
        q('.bL').textContent = merges.length ? 'Merge rules: ' + merges.map((m, i) => `${i + 1}) ${m[0]}+${m[1]}→${m[0] + m[1]} (${m[2]})`).join('  ') : 'Merge rules: (none yet)';
        const inp = (q('.bE').value || '').toLowerCase(); let t = [...inp]; merges.forEach(([a, b]) => { t = apply(t, a, b); });
        const unk = t.filter(x => x.length === 1 && !base.has(x)).length;
        q('.bO').innerHTML = (t.length ? t.map(x => chip(x, x.length === 1 && !base.has(x))).join('') : '') + `<div class="calc-note">${t.length} tokens.${unk ? ` Red = a character that never appeared in this small corpus: in character-level BPE it would become [UNK]. In byte-level BPE (since GPT-2) this does not happen; see below.` : ''}</div>`;
      };
      el.querySelectorAll('.bC').forEach(b => b.onclick = () => { ck = b.dataset.k; el.querySelectorAll('.bC').forEach(x => x.classList.toggle('on', x === b)); q('.bE').value = ck === 'xyz' ? 'viewed' : 'bug'; reset(); });
      q('.bN').onclick = step; q('.b5').onclick = () => { for (let i = 0; i < 5; i++) step(); }; q('.bR').onclick = reset;
      q('.bE').addEventListener('input', draw); reset();
    }},
    { type: 'p', html: `Look at what happened in the xyz corpus: the first merge is <code>v+i</code>, because "vi" appears in video, videos, view, views and review: 8+5+6+4+3 = 26 times. After 12 merges, "video", "view" and "upload" have become whole tokens, the vocab grew from 12 to 24, and the tokens for the whole corpus dropped from 183 to 47. <strong>This is the benefit of BPE: common things become short.</strong> In the HF corpus, the first three merges are u+g (20), u+n (16), h+ug (15), exactly like in the Hugging Face course.` },
    { type: 'p', html: `Now type "viewed" in the encode box: <code>view · e · d</code>. This word was not in the corpus, yet it still breaks into familiar pieces. Try "uploaded": <code>u · p · lo · a · de · d</code>. A strange split! Because merges are applied <em>in the same order</em> they were learned, and the "d+e" merge was learned before "a+d". This is the reason behind the strange splits of real tokenizers.` },
    { type: 'callout', tone: 'term', title: 'New word: Byte and UTF-8', html: `<strong>What it is:</strong> a computer stores all text as <strong>bytes</strong>. One byte = one number from 0 to 255. <strong>UTF-8</strong> is the rule that says which character becomes which bytes. An English letter = 1 byte, a Devanagari letter (like "म") = 3 bytes, an emoji (🚀) = 4 bytes.<br><strong>Why we need it:</strong> every language and every emoji in the world is written in this one way. There are only 256 different bytes.<br><strong>Without it:</strong> every language would need its own system, and the tokenizer would need a separate entry for every new character.` },
    { type: 'callout', tone: 'term', title: 'New word: Byte-level BPE (no word is "unknown")', html: `<strong>What it is:</strong> BPE that starts from <strong>bytes</strong> instead of characters. The base vocab = only 256 bytes. Merges are built on top of them. GPT-2 (2019) started this; today GPT-4o and Llama 3 both use byte-level BPE.<br><strong>Why we need it:</strong> type "vlog" in the widget and the "g" turns red: that character never appeared in the small corpus. In character-level BPE it would become [UNK] (unknown), and the meaning would be lost. If you start from bytes, no text (Hindi, emoji, Chinese) is ever unknown. In the worst case it breaks into bytes.<br><strong>Without it:</strong> a new emoji or a rare script would become [UNK], and the model could not see that part at all.` },
    { type: 'table', head: ['Tokenizer / model', 'Vocab size', 'Note'], rows: [
      ['GPT-2 (2019)', '50,257', '50,000 merges + 256 bytes + 1 end-of-text token'],
      ['cl100k_base (GPT-4, GPT-3.5)', '~100k', 'A tiktoken encoding'],
      ['o200k_base (GPT-4o family)', '~200k', 'Much better for non-English languages (numbers below)'],
      ['Llama 2 (2023)', '32,000', 'SentencePiece BPE'],
      ['Llama 3 (2024)', '128,256', 'tiktoken-style byte-level BPE; according to Meta, text is encoded in fewer tokens'],
    ]},
    { type: 'h2', text: 'BPE\'s siblings: WordPiece, Unigram and SentencePiece' },
    { type: 'p', html: `BPE is not the only way. You will often hear two more names: <strong>WordPiece</strong> (the BERT tokenizer) and <strong>Unigram</strong> (models like T5, through the <strong>SentencePiece</strong> library). All three share the same idea: subwords. The differences are in two places: (1) during <em>training</em>, how it is decided which pieces go into the vocab, and (2) during <em>encoding</em>, how a new word is cut. Let us look at each one with its own worked example and widget.` },

    { type: 'h3', text: 'WordPiece: not the "most common" pair, but the "most special" pair' },
    { type: 'callout', tone: 'term', title: 'New word: WordPiece', html: `<strong>What it is:</strong> a merge algorithm like BPE, made by Google and made famous by BERT (2018). Two differences: (1) pieces inside a word get a <code>##</code> in front ("hugs" = <code>h ##u ##g ##s</code>), so you know the piece is not the start of a word. (2) The merge is chosen by a <strong>score</strong>: <code>score = how often the pair appears ÷ (how often A appears × how often B appears)</code>.<br><strong>Why we need it:</strong> BPE simply joins the most common pair, even if both pieces show up everywhere. WordPiece first joins pairs whose pieces are rare <em>on their own</em> but often appear together. It catches the "real pairs".<br><strong>Without it:</strong> very common pieces (like "##u") would sneak into every pair and get merged first, even when those merges add nothing special.` },
    { type: 'p', html: `<strong>Worked example (HF corpus: hug ×10, pug ×5, pun ×12, bun ×4, hugs ×5):</strong> the most common pair is <code>##u + ##g</code> (20 times). But "##u" alone appears 36 times and "##g" 20 times. Score = 20 ÷ (36 × 20) = <strong>0.0278</strong>. Now look at <code>##g + ##s</code>: only 5 times, but "##s" alone also appears only 5 times. Score = 5 ÷ (20 × 5) = <strong>0.0500</strong>. It wins! WordPiece's first merge is <code>##gs</code>, while BPE's first merge was u+g.<br>At the second step, all pairs with "##u" have the same score (0.0278), so the pair that appeared first in the corpus (<code>h + ##u</code>) is picked. Third: <code>hu + ##gs</code> (5 ÷ (15 × 5) = 0.0667) beats <code>hu + ##g</code> (10 ÷ (15 × 15) = 0.0444).` },
    { type: 'p', html: `<strong>Encoding is different too.</strong> WordPiece does not keep the merge rules, only the final vocab. When a new word comes, find <strong>the longest piece from the start</strong> that is in the vocab, cut it, and repeat on the rest (<em>longest match first</em>). And if at some point no piece is found, <strong>the whole word</strong> becomes <code>[UNK]</code>, not just one character. Run it yourself:` },
    { type: 'custom', render(el) {
      const CORP = { hf: [['hug', 10], ['pug', 5], ['pun', 12], ['bun', 4], ['hugs', 5]],
        xyz: [['video', 8], ['videos', 5], ['view', 6], ['views', 4], ['review', 3], ['upload', 5], ['uploads', 3]] };
      let ck = 'hf', words, merges, vocab;
      el.innerHTML = `<div class="chips" style="margin-bottom:8px"><button type="button" class="chip on wC" data-k="hf">HF corpus</button><button type="button" class="chip wC" data-k="xyz">xyz corpus</button></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><button type="button" class="btn small primary wN">Next merge</button><button type="button" class="btn small ghost w3">3 merges</button><button type="button" class="btn small ghost wR">Reset</button></div>
        <div class="wW" style="display:grid;gap:6px"></div>
        <div style="overflow-x:auto;margin-top:10px"><table class="wT"></table></div>
        <div class="stats"><div class="stat"><span>Merges done</span><strong class="wM"></strong></div><div class="stat"><span>Vocab size</span><strong class="wV"></strong></div><div class="stat"><span>Total tokens (corpus)</span><strong class="wTot"></strong></div></div>
        <div class="wL" style="font-family:var(--f-mono);font-size:13px;color:var(--ink-2);margin:8px 0;word-break:break-word"></div>
        <label>Encode a new word (longest match first):</label><input class="wE" type="text" value="hugs" maxlength="20" style="max-width:240px">
        <div class="wO" style="margin-top:8px"></div>`;
      const q = s => el.querySelector(s);
      const chip = (t, bad) => `<span style="display:inline-block;padding:2px 7px;margin:2px;border-radius:var(--r-sm);font-family:var(--f-mono);font-size:13px;background:${bad ? 'var(--red)' : 'var(--accent-soft)'};color:${bad ? 'var(--bg)' : 'var(--accent-ink)'};border:1px solid var(--line)">${t}</span>`;
      const split = w => [...w].map((c, i) => i ? '##' + c : c);
      const join = (a, b) => a + (b.startsWith('##') ? b.slice(2) : b);
      const stats = () => {
        const tf = new Map(), pf = new Map();
        words.forEach(w => { w.t.forEach(x => tf.set(x, (tf.get(x) || 0) + w.f)); for (let i = 0; i < w.t.length - 1; i++) { const k = w.t[i] + ' ' + w.t[i + 1]; pf.set(k, (pf.get(k) || 0) + w.f); } });
        const sc = [...pf.entries()].map(([k, f]) => { const [a, b] = k.split(' '); return { a, b, f, fa: tf.get(a), fb: tf.get(b), s: f / (tf.get(a) * tf.get(b)) }; });
        return sc;
      };
      const best = sc => { let b = null; sc.forEach(x => { if (!b || x.s > b.s + 1e-12) b = x; }); return b; };
      const apply = (t, a, b) => { const n = []; for (let i = 0; i < t.length; i++) { if (i < t.length - 1 && t[i] === a && t[i + 1] === b) { n.push(join(a, b)); i++; } else n.push(t[i]); } return n; };
      const reset = () => { words = CORP[ck].map(([w, f]) => ({ w, f, t: split(w) })); merges = []; vocab = new Set(); words.forEach(w => w.t.forEach(x => vocab.add(x))); draw(); };
      const step = () => { const sc = stats(); if (!sc.length) return; const b = best(sc); merges.push(b); vocab.add(join(b.a, b.b)); words.forEach(w => { w.t = apply(w.t, b.a, b.b); }); draw(); };
      const encode = w => {
        const out = []; let s = 0;
        while (s < w.length) {
          let e = w.length, hit = null;
          while (e > s) { const sub = (s ? '##' : '') + w.slice(s, e); if (vocab.has(sub)) { hit = sub; break; } e--; }
          if (!hit) return null;
          out.push(hit); s = e;
        }
        return out;
      };
      const draw = () => {
        q('.wW').innerHTML = words.map(w => `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap"><code style="min-width:70px">${w.w} ×${w.f}</code><span>${w.t.map(x => chip(x)).join('')}</span></div>`).join('');
        const sc = stats(), b = sc.length ? best(sc) : null;
        const top = sc.slice().sort((x, y) => y.s - x.s).slice(0, 5);
        q('.wT').innerHTML = top.length ? `<thead><tr><th>Pair</th><th>pair ÷ (A × B)</th><th>Score</th></tr></thead><tbody>` + top.map(x => `<tr style="${x === b ? 'font-weight:700;color:var(--accent-ink)' : ''}"><td><code style="white-space:nowrap">${x.a} + ${x.b}</code></td><td style="white-space:nowrap">${x.f} ÷ (${x.fa} × ${x.fb})</td><td>${x.s.toFixed(4)}</td></tr>`).join('') + '</tbody>' : '<tbody><tr><td>Every word is now a single token.</td></tr></tbody>';
        q('.wM').textContent = merges.length; q('.wV').textContent = vocab.size;
        q('.wTot').textContent = words.reduce((s, w) => s + w.t.length * w.f, 0);
        q('.wL').textContent = merges.length ? 'Merges: ' + merges.map((m, i) => `${i + 1}) ${m.a}+${m.b}→${join(m.a, m.b)} (score ${m.s.toFixed(4)})`).join('  ') : 'Merges: (none yet)';
        const inp = (q('.wE').value || '').toLowerCase().trim();
        const r = inp ? encode(inp) : [];
        q('.wO').innerHTML = r === null ? chip('[UNK]', true) + `<div class="calc-note">No piece was found in the vocab, so WordPiece turned <strong>the whole word</strong> into [UNK]. (BPE would mark only the unknown character as unknown.)</div>` : r.map(x => chip(x)).join('') + `<div class="calc-note">${r.length} tokens. Each time, the longest piece from the start that is in the vocab was found.</div>`;
      };
      el.querySelectorAll('.wC').forEach(b => b.onclick = () => { ck = b.dataset.k; el.querySelectorAll('.wC').forEach(x => x.classList.toggle('on', x === b)); q('.wE').value = ck === 'hf' ? 'hugs' : 'viewed'; reset(); });
      q('.wN').onclick = step; q('.w3').onclick = () => { for (let i = 0; i < 3; i++) step(); }; q('.wR').onclick = reset;
      q('.wE').addEventListener('input', draw); reset();
    }},
    { type: 'p', html: `After 3 merges, "hugs" is a single token, "bugs" = <code>b · ##u · ##gs</code>, and "mug" = <code>[UNK]</code> (because "m" never appeared). After 6 merges, "bugs" = <code>bu · ##gs</code>. Now choose the <strong>xyz corpus</strong>: WordPiece first joins <code>u + ##p</code> (8 ÷ (8 × 8) = 0.1250) and builds the whole of "upload" in 5 merges, because letters like u, p and l appear only in upload. BPE built "vi" first (the most common pair). After 12 merges, the WordPiece corpus has 65 tokens and the BPE one has 47: BPE follows frequency, so it makes text shorter.<br><strong>Good:</strong> meaningful pairs, and "##" makes word boundaries clear. <strong>Bad:</strong> one unknown character turns the whole word into [UNK]. Google never published its real training code, so the versions in libraries are a "best guess".` },

    { type: 'h3', text: 'Unigram: start with a big vocab, then trim it down' },
    { type: 'callout', tone: 'term', title: 'New word: Unigram tokenizer', html: `<strong>What it is:</strong> BPE and WordPiece build from small to big (merging). Unigram works <strong>the other way round</strong>: start with a very big vocab (like all common substrings), give every token a probability, then again and again remove the tokens whose removal increases the corpus loss the least. Single characters are never removed, so every word can still be cut. Taku Kudo introduced this in 2018.<br><strong>Encoding:</strong> look at every way to cut the word. The score of each way = the <strong>product</strong> (multiplication) of the probabilities of its pieces. The biggest product wins. (Real code does this with a fast method called <strong>Viterbi</strong>, without counting every path one by one.)<br><strong>Why we need it:</strong> you get the "most likely" cut for each word, and during training you can also sample different cuts (<strong>subword regularization</strong>), which makes the model stronger against typos.<br><strong>Without it:</strong> only one fixed cut, which depends on the strange habits of the merge order.` },
    { type: 'p', html: `<strong>Worked example:</strong> say the vocab gives "video" a probability of 6% and "s" 5%. "videos" = video + s → 0.06 × 0.05 = 0.003 (that is 1 in 333). Another way, vid + eo + s → 0.01 × 0.01 × 0.05 = 0.000005 (1 in 200,000). The first one is 600 times better. Every extra piece multiplies by one more small number, so <strong>fewer and more common pieces</strong> win.` },
    { type: 'callout', tone: 'term', title: 'New word: SentencePiece', html: `<strong>What it is:</strong> a tokenizer <strong>library</strong> from Google (Kudo and Richardson, 2018). It is not a new algorithm: inside, it runs BPE or Unigram. What makes it special: it does not cut the text into words first (no pre-tokenization). It turns the space into a normal character <code>▁</code> too, and treats the whole line as one stream.<br><strong>Why we need it:</strong> in languages like Chinese, Japanese and Thai there are no spaces between words, so the "cut at spaces" rule does not work there. And because the space is part of a token, decoding is very simple: join the pieces, turn <code>▁</code> into a space, and you get the same text back (<strong>reversible</strong>).<br><strong>Without it:</strong> every language would need its own pre-tokenizer, and while decoding you would have to guess where the spaces were.` },
    { type: 'p', html: `The widget below does two jobs. <strong>One word</strong> mode: Unigram counts every way to cut the word and shows the top 5. <strong>Whole sentence</strong> mode: like SentencePiece, it turns spaces into <code>▁</code>, finds the best cut for the whole line (Viterbi), and shows the decoded text. The vocab is small and we chose the probabilities to explain the idea:` },
    { type: 'custom', render(el) {
      const P = { '▁': 4, '▁video': 5, '▁videos': 1, '▁view': 2, '▁upload': 3, '▁up': 1, '▁re': 1, '▁xyz': 1, '▁on': 2, '▁not': 2, '▁is': 2, '▁my': 1,
        video: 6, view: 5, upload: 4, re: 4, s: 5, ed: 4, ing: 3, er: 3, up: 3, load: 2, vid: 1, eo: 1, vie: 1, w: 1, e: 2, d: 1 };
      'abcdefghijklmnopqrstuvwxyz'.split('').forEach(c => { if (P[c] == null) P[c] = 0.5; });
      const pr = t => (P[t] != null ? P[t] : 0.1) / 100;
      let mode = 'word';
      el.innerHTML = `<div class="chips" style="margin-bottom:8px"><button type="button" class="chip on uM" data-m="word">One word (Unigram)</button><button type="button" class="chip uM" data-m="sent">Whole sentence (SentencePiece)</button></div>
        <label class="uLab"></label><input class="uI" type="text" maxlength="40" style="max-width:340px">
        <div class="uO" style="margin-top:10px;overflow-x:auto"></div>
        <div class="calc-note uN"></div>
        <details style="margin-top:8px"><summary>Vocab tokens and their probability (%)</summary><div style="font-family:var(--f-mono);font-size:12px;word-break:break-word;color:var(--ink-2)">${Object.keys(P).filter(k => P[k] !== 0.5).map(k => `${k} ${P[k]}`).join(' · ')} · every other single letter 0.5</div></details>`;
      const q = s => el.querySelector(s);
      const chip = t => `<span style="display:inline-block;padding:2px 7px;margin:2px;border-radius:var(--r-sm);font-family:var(--f-mono);font-size:13px;background:var(--accent-soft);color:var(--accent-ink);border:1px solid var(--line)">${t}</span>`;
      const oneIn = p => '1 in ' + Math.round(1 / p).toLocaleString('en-US');
      const all = w => { const out = []; const go = (s, acc) => { if (out.length > 5000) return; if (s === w.length) { out.push(acc); return; } for (let e = s + 1; e <= w.length; e++) { const t = w.slice(s, e); if (P[t] != null) go(e, acc.concat([t])); } }; go(0, []); return out; };
      const best = s => { const n = s.length, B = [{ p: 1, seg: [] }]; for (let i = 1; i <= n; i++) { let bb = null; for (let j = Math.max(0, i - 10); j < i; j++) { const t = s.slice(j, i); if (P[t] == null && i - j > 1) continue; if (!B[j]) continue; const v = B[j].p * pr(t); if (!bb || v > bb.p) bb = { p: v, seg: B[j].seg.concat([t]) }; } B[i] = bb; } return B[n]; };
      const draw = () => {
        const raw = (q('.uI').value || '').toLowerCase();
        if (mode === 'word') {
          const w = raw.replace(/[^a-z]/g, '').slice(0, 14);
          if (!w) { q('.uO').innerHTML = ''; q('.uN').textContent = ''; return; }
          const segs = all(w).map(s => ({ s, p: s.reduce((a, t) => a * pr(t), 1) })).sort((a, b) => b.p - a.p);
          q('.uO').innerHTML = segs.slice(0, 5).map((x, i) => `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:6px 0;border-bottom:1px solid var(--line);${i ? '' : 'font-weight:700;color:var(--accent-ink)'}"><span>${i + 1}.</span><span>${x.s.map(chip).join('')}</span><span style="font-family:var(--f-mono);font-size:12px">${x.s.map(t => pr(t).toFixed(3)).join(' × ')}</span><span>= ${oneIn(x.p)}</span></div>`).join('');
          q('.uN').textContent = `"${w}" can be cut in ${segs.length} ways in total. Unigram picks the one with the biggest product: ${segs[0].s.join(' + ')}. Fewer and more common pieces = a bigger product.`;
        } else {
          const s = '▁' + raw.trim().replace(/\s+/g, '▁');
          const b = best(s), dec = b.seg.join('').replace(/▁/g, ' ').trim();
          q('.uO').innerHTML = `<div style="font-family:var(--f-mono);font-size:13px;margin-bottom:6px">Stream: ${s}</div><div>${b.seg.map(chip).join('')}</div><div style="font-family:var(--f-mono);font-size:13px;margin-top:6px">Decode: "${dec}"</div>`;
          q('.uN').textContent = `${b.seg.length} tokens. Spaces became "▁" and the whole line was treated as one stream (no pre-tokenization). Decode = join the pieces, turn ▁ back into spaces: ${dec === raw.trim().replace(/\s+/g, ' ') ? 'exactly the same text came back.' : 'the text changed.'}`;
        }
      };
      const setMode = m => { mode = m; el.querySelectorAll('.uM').forEach(x => x.classList.toggle('on', x.dataset.m === m)); q('.uLab').textContent = m === 'word' ? 'Type a word (like videos, uploaded, reviews, vlog):' : 'Type a sentence:'; q('.uI').value = m === 'word' ? 'videos' : 'my video is not uploading'; draw(); };
      el.querySelectorAll('.uM').forEach(b => b.onclick = () => setMode(b.dataset.m));
      q('.uI').addEventListener('input', draw); setMode('word');
    }},
    { type: 'p', html: `Look at the numbers: "uploaded" can be cut in 10 ways; upload + ed wins (1 in 625), while up + load + ed is only 1 in 41,667. "reviews" = re + view + s (1 in 10,000). For "vlog" there is no big piece, so it becomes v + l + o + g: a very low score, but <strong>not [UNK]</strong>, because single letters are never removed. In sentence mode, "my video is not uploading" becomes 6 tokens: <code>▁my · ▁video · ▁is · ▁not · ▁upload · ing</code>. Notice: <code>▁video</code> is one token (with its space), "uploading" became <code>▁upload · ing</code>, and decoding gave back exactly the same sentence.` },
    { type: 'table', head: ['', 'BPE', 'WordPiece', 'Unigram', 'SentencePiece'], rows: [
      ['What it is', 'Algorithm', 'Algorithm', 'Algorithm', 'Library (BPE or Unigram inside)'],
      ['How the vocab is built', 'Small to big: join the most common pair', 'Small to big: join the pair with the highest score', 'Big to small: remove the least useful tokens', 'The chosen algorithm, on raw text'],
      ['How a new word is cut', 'Apply the learned merges in the same order', 'Longest match from the start, ## on inside pieces', 'The cut with the highest probability', 'The whole line with ▁, then the algorithm'],
      ['Unknown', 'Never, in byte-level', 'The whole word becomes [UNK]', 'Single characters always stay', 'Byte fallback option'],
      ['Used in', 'GPT-2, GPT-4o, Llama 3', 'BERT (30,522 vocab), DistilBERT', 'T5, ALBERT, XLNet', 'T5 (Unigram), Llama 2 (BPE)'],
    ], caption: 'Most big chat LLMs today use byte-level BPE. WordPiece is common in encoder models (the BERT family), and SentencePiece in multilingual models.' },
    { type: 'callout', tone: 'mistake', title: 'Common mistake: "SentencePiece is a separate algorithm"', html: `No. SentencePiece is a <em>library</em> that runs BPE or Unigram. Its real special job is turning the space into <code>▁</code> and skipping pre-tokenization. That is why "Llama 2 uses SentencePiece" and "Llama 2 uses BPE" are both true.` },
    { type: 'callout', tone: 'tip', title: 'A big vocab or a small one?', html: `<strong>Big vocab</strong>: text fits in fewer tokens (cheaper, faster, more text fits in the context), but the model's embedding table and output layer get bigger. In Llama 3 8B, the embedding table alone = 128,256 × 4,096 = 525,336,576 numbers (about 0.5B parameters!). According to Hugging Face's Llama 3 blog, a good part of the extra parameters from Llama 2 7B to Llama 3 8B came from this. <strong>Small vocab</strong>: small tables, but longer sequences. A trade-off.` },

    { type: 'h2', text: 'Why do Hindi and Hinglish use more tokens?' },
    { type: 'p', html: `Half of xyz.com's users write in Hinglish or Hindi. Here is the same message, in three languages, through three real OpenAI tokenizers. These numbers come from <code>tiktoken</code> (not guesses). Switch the tokenizer:` },
    { type: 'custom', render(el) {
      const S = ['My video is not uploading, please help', 'Mera video upload n' + 'ahi ho r' + 'aha, help k' + 'aro', 'मेरा वीडियो अपलोड नहीं हो रहा, मदद करो', 'xyz.com rocks 🚀'];
      const L = ['English', 'Hinglish', 'Hindi (Devanagari)', 'With emoji'];
      const P = {"gpt2":[["My"," video"," is"," not"," uploading",","," please"," help"],["M","era"," video"," upload"," n","ahi"," ho"," r","aha",","," help"," k","aro"],["<E0 A4>","<AE>","<E0 A5>","<87>","<E0 A4>","<B0>","ा","<20 E0 A4>","<B5>","<E0 A5>","<80>","<E0 A4>","<A1>","<E0 A4>","<BF>","<E0 A4>","<AF>","<E0 A5>","<8B>","<20 E0 A4>","<85>","<E0 A4>","<AA>","<E0 A4>","<B2>","<E0 A5>","<8B>","<E0 A4>","<A1>","<20 E0 A4>","<A8>","<E0 A4>","<B9>","<E0 A5>","<80>","<E0 A4>","<82>","<20 E0 A4>","<B9>","<E0 A5>","<8B>","<20 E0 A4>","<B0>","<E0 A4>","<B9>","ा",",","<20 E0 A4>","<AE>","<E0 A4>","<A6>","<E0 A4>","<A6>","<20 E0 A4>","<95>","<E0 A4>","<B0>","<E0 A5>","<8B>"],["xy","z",".","com"," rocks","<20 F0 9F>","<9A>","<80>"]],"cl100k_base":[["My"," video"," is"," not"," uploading",","," please"," help"],["M","era"," video"," upload"," n","ahi"," ho"," r","aha",","," help"," k","aro"],["म","े","र","ा","<20 E0 A4>","<B5>","ी","<E0 A4>","<A1>","<E0 A4 BF E0 A4>","<AF>","ो","<20 E0 A4>","<85>","प","ल","ो","<E0 A4>","<A1>","<20 E0 A4>","<A8>","ह","ी","ं"," ह","ो","<20 E0 A4>","<B0>","ह","ा",","," म","<E0 A4>","<A6>","<E0 A4>","<A6>"," क","र","ो"],["xyz",".com"," rocks","<20 F0 9F>","<9A>","<80>"]],"o200k_base":[["My"," video"," is"," not"," uploading",","," please"," help"],["M","era"," video"," upload"," n" + "ahi"," ho"," r" + "aha",","," help"," k" + "aro"],["म","ेरा"," वीडियो"," अप","लोड"," नहीं"," हो"," रहा",","," मदद"," करो"],["xyz",".com"," rocks","<20 F0 9F 9A>","<80>"]]};
      const NM = { gpt2: 'GPT-2 (2019, 50k)', cl100k_base: 'cl100k (GPT-4, 100k)', o200k_base: 'o200k (GPT-4o, 200k)' };
      let k = 'o200k_base';
      el.innerHTML = `<div class="chips" style="margin-bottom:10px">${Object.keys(NM).map(x => `<button type="button" class="chip tk${x === k ? ' on' : ''}" data-k="${x}">${NM[x]}</button>`).join('')}</div><div class="tO" style="display:grid;gap:12px"></div>
        <div class="calc-note">If a chip shows something like <code>&lt;E0 A4&gt;</code>, it is not a full character, only a few bytes (in UTF-8, one Devanagari letter is 3 bytes). Such tokens cannot be read on their own. A space is shown as <code>␣</code>.</div>`;
      const draw = () => {
        const p = P[k], en = p[0].length;
        el.querySelector('.tO').innerHTML = p.map((arr, i) => `<div><div style="font-size:14px;margin-bottom:4px"><strong>${L[i]}</strong>: ${S[i]} <span style="color:var(--ink-2)">→ <strong style="color:var(--accent-ink)">${arr.length} tokens</strong>${i ? ` (${(arr.length / en).toFixed(2)}x English)` : ''}</span></div><div style="display:flex;flex-wrap:wrap;gap:3px">${arr.map(t => { const b = t[0] === '<' && t.length > 2; return `<span style="padding:1px 6px;border-radius:var(--r-sm);font-family:var(--f-mono);font-size:12px;border:1px solid var(--line);background:${b ? 'var(--surface-2)' : 'var(--accent-soft)'};color:${b ? 'var(--ink-3)' : 'var(--ink)'}">${t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/ /g, '␣')}</span>`; }).join('')}</div></div>`).join('');
      };
      el.querySelectorAll('.tk').forEach(b => b.onclick = () => { k = b.dataset.k; el.querySelectorAll('.tk').forEach(x => x.classList.toggle('on', x === b)); draw(); });
      draw();
    }},
    { type: 'p', html: `Read the numbers: English is 8 tokens in all three tokenizers. The same message in Devanagari Hindi is <strong>59 tokens</strong> on the GPT-2 tokenizer (7.38x!), 39 on cl100k (4.88x), and only 11 on the newer o200k (1.38x). Hinglish is 13, 13, 10. Why? BPE learned merges for the text it saw most (mostly English). A script that was rare in the training data got fewer merges, so it breaks into bytes. Newer tokenizers have more multilingual data, so the gap shrank a lot, but it did not disappear.` },
    { type: 'p', html: `A 2023 NeurIPS paper (Petrov et al.) showed that a translation of the same text can take up to 15 times more tokens in some languages. That means <strong>more money, more latency, and less room in the context window</strong> for users of those languages, for the same work.` },
    { type: 'callout', tone: 'mistake', title: 'Common mistake', html: `"If you write in Hindi the model understands less, so write in Hinglish." How well the model understands is a separate question. The token count is only the number of pieces. Yes, a language that breaks into bytes makes the model work harder, and there is usually less training data for it, so quality can be affected. But test this on your own use case; do not just assume it.` },

    { type: 'h2', text: 'Tokens = money and limits' },
    { type: 'p', html: `LLM APIs bill by <strong>tokens</strong>, not by characters or words, and the price is often written "per 1 million tokens". There are two different rates: <strong>input tokens</strong> (what you send: system prompt, history, user message) and <strong>output tokens</strong> (what the model generates). Output is usually several times more expensive, because each output token needs one full loop of the model, while input tokens are processed together (in parallel).` },
    { type: 'list', items: [
      `<strong>Context window</strong>: how many tokens (input + output) the model can look at in one go. The limit is in tokens, not characters. For a Hindi user, fewer messages fit in the same window. Details: <a href="#/ai-context">Context window</a>.`,
      `<strong>max_tokens</strong>: the output limit, in tokens.`,
      `<strong>Rate limits</strong>: often also "tokens per minute", not only requests per minute.`,
    ]},
    { type: 'p', html: `Work out xyz Assistant's monthly bill. The prices here are only examples (they change a lot by provider and model); put in your provider's real rate. The language multiplier is taken from one sentence in the widget above; measure the real average on your own data:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Chats per day</label><input class="cQ" type="number" value="10000" min="0" step="100"></div>
          <div><label>Input tokens per chat (English)</label><input class="cI" type="number" value="1500" min="0" step="50"></div>
          <div><label>Output tokens per chat (English)</label><input class="cO" type="number" value="300" min="0" step="10"></div>
          <div><label>$ per 1M input tokens (example)</label><input class="cPI" type="number" value="2.5" min="0" step="0.1"></div>
          <div><label>$ per 1M output tokens (example)</label><input class="cPO" type="number" value="10" min="0" step="0.5"></div>
          <div><label>Users' language</label><select class="cL">
            <option value="1">English (1.00x)</option><option value="1.25">Hinglish, o200k (1.25x)</option>
            <option value="1.375">Hindi, o200k (1.38x)</option><option value="7.375">Hindi, GPT-2 tokenizer (7.38x)</option></select></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Tokens per chat</span><strong class="cT"></strong></div>
          <div class="stat"><span>Cost per chat</span><strong class="cC"></strong></div>
          <div class="stat"><span>Cost per month (30 days)</span><strong class="cM"></strong></div>
        </div>
        <div class="calc-note cN"></div>`;
      const q = s => el.querySelector(s), v = s => Math.max(0, Number(q(s).value) || 0);
      const upd = () => {
        const m = Number(q('.cL').value), ti = v('.cI') * m, to = v('.cO') * m;
        const per = (ti * v('.cPI') + to * v('.cPO')) / 1e6;
        q('.cT').textContent = Math.round(ti + to).toLocaleString('en-IN');
        q('.cC').textContent = '$' + per.toFixed(5);
        q('.cM').textContent = '$' + (per * v('.cQ') * 30).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
        const share = (ti * v('.cPI') + to * v('.cPO')) ? (to * v('.cPO')) / (ti * v('.cPI') + to * v('.cPO')) * 100 : 0;
        q('.cN').textContent = `Output is only ${Math.round(to)} tokens, but it is ${share.toFixed(1)}% of the bill. Formula: (input × input rate + output × output rate) ÷ 1,000,000, then × chats × 30.`;
      };
      el.querySelectorAll('input,select').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `With the default values: in English one chat is 1,800 tokens, $0.00675, and the month is <strong>$2,025.00</strong>. Output is only 300 tokens, but it is 44.4% of the bill. Select Hindi (o200k): $2,784.38. Hindi on an old GPT-2 style tokenizer: $14,934.38. Same users, same messages; only the tokenizer is different.` },

    { type: 'h2', text: 'Strange mistakes caused by tokens' },
    { type: 'p', html: `The model sees tokens, not letters. This explains some funny mistakes:` },
    { type: 'list', items: [
      `<strong>"How many r's are in strawberry?"</strong> In o200k this is <code>st · raw · berry</code>: 3 tokens. The model does not see the separate letters; it has to "remember" the letters inside the "berry" token from training. That is why older models often counted wrong.`,
      `<strong>Numbers</strong>: "9.11" = <code>9 · . · 11</code> and "9.9" = <code>9 · . · 9</code>. The model sees "11" as one thing and "9" as one thing, so it can get confused by "is 9.11 bigger or 9.9?". For maths it is better to give it a calculator tool.`,
      `<strong>Reversing spelling, counting letters, rhymes</strong>: these are all character-level jobs, and they are hard for a token-level model.`,
    ]},
    { type: 'h2', text: 'From token ID to embedding: giving a number a meaning' },
    { type: 'p', html: `A token ID is only a label. ID 3823 (" video") and 3824 have no connection in meaning, just like students with roll numbers 23 and 24 have no connection. If the model did maths directly on the number "3823", it would think 3824 is "close" to it. Wrong. We need, for every token, a group of numbers that captures its <em>meaning</em>.` },
    { type: 'callout', tone: 'term', title: 'New word: Embedding', html: `<strong>What it is:</strong> a list of numbers that represents a token (or a word, or a sentence), like <code>[0.12, -0.80, 0.33, ...]</code>. This list is called a <strong>vector</strong>, and the length of the list is its <strong>dimension</strong>. In GPT-2 small every token's vector has 768 numbers; in Llama 3 8B it has 4,096. Think of a map where every word has an "address" (coordinates): words with similar meanings live close together.<br><strong>Why we need it:</strong> a token ID is just a label with no meaning. A vector has many numbers that can capture different sides of a meaning. The model does its maths on these.<br><strong>Without it:</strong> the model would think IDs 3823 and 3824 are "close", even though they are not related. There would be no way to understand meaning.` },
    { type: 'p', html: `Inside the model there is a big table: the <strong>embedding matrix</strong>. It has one row for every vocab token. In GPT-2 small that is 50,257 rows × 768 columns = 38,597,376 numbers. "Token ID → embedding" is only this: <strong>take the row whose number is the ID</strong>. No calculation, just a lookup. This table is also parameters: it is learned during training together with the other weights.` },
    { type: 'ascii', text: `" video"  →  ID 3823  →  row 3823 of the embedding matrix
                                   ↓
                        [0.12, -0.80, 0.33, ... 768 numbers]
                                   ↓
                     Transformer layers (attention, FFN ...)`, caption: 'The numbers of the vector here are only for illustration.' },
    { type: 'h3', text: 'Similarity: how "close" are two vectors? (cosine)' },
    { type: 'callout', tone: 'term', title: 'New word: Cosine similarity', html: `<strong>What it is:</strong> a number for how much two vectors point in the <em>same direction</em>: 1 = exactly the same direction, 0 = no connection, -1 = opposite. Think of two arrows: the smaller the angle between them, the closer the cosine is to 1.<br><strong>Why we need it:</strong> it turns "how similar are these two sentences?" into one number. Search, recommendations and finding duplicates all run on this.<br><strong>Without it:</strong> you could only match exact words, and could not see that "refund" and "money back" mean the same.` },
    { type: 'p', html: `The most common way to measure the similarity of two vectors is <strong>cosine similarity</strong>: look at the angle between the two vectors. Same direction = 1, perpendicular (no connection) = 0, opposite direction = -1. Formula: <code>cos(a, b) = (a · b) / (|a| × |b|)</code>. <code>a · b</code> (dot product) = multiply the numbers at each position and add them up. <code>|a|</code> = the length of the vector = √(a · a).` },
    { type: 'p', html: `Below are toy 4-number vectors for 8 words. Real embedding dimensions have no names; here each dimension has a name only to make it easy to understand: [media, account, action, sports]. Choose two words and see the numbers in the formula:` },
    { type: 'custom', render(el) {
      const V = { video: [0.9, 0.1, 0.2, 0.1], clip: [0.8, 0.1, 0.3, 0.2], movie: [0.85, 0, 0.05, 0.15], upload: [0.5, 0.2, 0.9, 0], download: [0.45, 0.15, 0.85, 0.05], password: [0, 0.95, 0.2, 0], login: [0.05, 0.9, 0.4, 0], cricket: [0.2, 0, 0.1, 0.95] };
      const ks = Object.keys(V);
      const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0), nm = a => Math.sqrt(dot(a, a)), cos = (a, b) => dot(a, b) / (nm(a) * nm(b));
      const opt = sel => ks.map(k => `<option${k === sel ? ' selected' : ''}>${k}</option>`).join('');
      el.innerHTML = `<div class="row2"><div><label>Word A</label><select class="eA">${opt('video')}</select></div><div><label>Word B</label><select class="eB">${opt('clip')}</select></div></div>
        <div class="eF" style="font-family:var(--f-mono);font-size:13px;overflow-x:auto;padding:10px;margin:10px 0;border:1px solid var(--line);border-radius:var(--r);background:var(--surface-2);white-space:pre"></div>
        <div class="stats"><div class="stat"><span>Cosine similarity</span><strong class="eC"></strong></div><div class="stat"><span>Closest to A</span><strong class="eN"></strong></div></div>
        <div class="calc-note eX"></div>`;
      const q = s => el.querySelector(s);
      const upd = () => {
        const a = q('.eA').value, b = q('.eB').value, A = V[a], B = V[b];
        const c = cos(A, B);
        q('.eF').textContent = `${a} = [${A.join(', ')}]\n${b} = [${B.join(', ')}]\n\nA · B = ${A.map((x, i) => x + '×' + B[i]).join(' + ')} = ${dot(A, B).toFixed(2)}\n|A| = ${nm(A).toFixed(2)},  |B| = ${nm(B).toFixed(2)}\ncos = ${dot(A, B).toFixed(2)} / (${nm(A).toFixed(2)} × ${nm(B).toFixed(2)}) = ${c.toFixed(2)}`;
        q('.eC').textContent = c.toFixed(2);
        const near = ks.filter(k => k !== a).sort((x, y) => cos(A, V[y]) - cos(A, V[x])).slice(0, 2);
        q('.eN').textContent = near.map(k => `${k} (${cos(A, V[k]).toFixed(2)})`).join(', ');
        q('.eX').textContent = c > 0.9 ? 'Very similar: almost the same direction.' : c > 0.5 ? 'Somewhat related.' : 'Quite different meanings: the vectors point in different directions.';
      };
      q('.eA').addEventListener('input', upd); q('.eB').addEventListener('input', upd); upd();
    }},
    { type: 'p', html: `video vs clip: dot product 0.81, lengths 0.93 and 0.88, cosine <strong>0.98</strong>. video vs password: only <strong>0.15</strong>. The closest to password is login (0.98). Now choose upload vs download: <strong>1.00</strong> (the real value is 0.998). Opposite meanings, and still almost the same vector!` },
    { type: 'callout', tone: 'mistake', title: 'Common mistake: "similar vector = same meaning"', html: `Embeddings are built from the <em>contexts</em> a word appears in. "Upload" and "download" both appear in sentences like "___ the video" and "the ___ speed is slow", so their vectors end up very close, even though their meanings are opposite. This happens in real embeddings too (like "hot" and "cold"). So do not decide "the meaning is the same" from embedding similarity alone.` },

    { type: 'h3', text: 'Word embeddings vs contextual embeddings' },
    { type: 'p', html: `In 2013, Google's <strong>word2vec</strong> showed that maths works on word vectors too: the vector of <code>king − man + woman</code> lands close to <code>queen</code>. But these were <strong>static</strong> embeddings: one vector per word, always. The problem: in "I want to learn Python" and "I saw a python in the jungle", "Python" gets the same vector. One is a programming language, the other is a snake.` },
    { type: 'p', html: `In a transformer, the embedding table is only the start. In every layer, <a href="#/ai-attention">attention</a> changes a token's vector by looking at the tokens around it. In the first sentence the vector of "Python" is pulled towards "learn" (programming); in the second, towards "jungle" (snake). This is called a <strong>contextual embedding</strong>: the same token, a different vector depending on the context. This is the core of phase A2.` },
    { type: 'callout', tone: 'term', title: 'New word: Contextual embedding', html: `<strong>What it is:</strong> a token's vector after it has changed by looking at the words around it. The vector from the embedding table is a "starting address"; after the transformer layers it becomes "the meaning in this sentence".<br><strong>Why we need it:</strong> one word can have many meanings (Python = a language or a snake, "bank" = money or a river bank). Without the sentence you cannot get the right meaning.<br><strong>Without it:</strong> the model would assume one meaning everywhere, and get confused between "learning Python" and "a python in the jungle".` },
    { type: 'callout', tone: 'tip', title: 'Embeddings are not only inside LLMs', html: `Separate <strong>embedding models</strong> turn a whole sentence or paragraph into one vector. xyz.com can make a vector for every help article and store it; when a user's question comes, make its vector and use cosine to find the closest articles. This is <strong>semantic search</strong>: "my video is stuck" will still find the "upload troubleshooting" article, even if not a single word is the same. RAG stands on this: <a href="#/ai-rag">RAG and vector search</a>.` },
    { type: 'h2', text: 'The full pipeline: from text to the model' },
    { type: 'p', html: `Now put it all together and see how text reaches the model inside xyz Assistant, and where things can break:` },
    { type: 'flow', height: 300,
      nodes: [
        { id: 'txt', label: 'User text', sub: 'string', x: 76, y: 90, w: 124, kind: 'client', info: 'What it is: the message the user typed, like "My video is not uploading". The whole pipeline starts here. To the computer it is a line of UTF-8 bytes.' },
        { id: 'tok', label: 'Tokenizer', sub: 'BPE merges', x: 238, y: 90, w: 140, kind: 'server', info: 'What it is: the program that cuts text into tokens. First it roughly splits the text into words/spaces/punctuation (pre-tokenize), then applies the learned BPE merge rules in order. Output: tokens. A model always uses the same tokenizer it was trained with.' },
        { id: 'ids', label: 'Token IDs', sub: '[3823, 12053 ...]', x: 405, y: 90, w: 150, kind: 'queue', info: 'What it is: each token\'s number in the vocabulary (like a roll number). These are the numbers that get counted: billing, context window and max_tokens all use them.' },
        { id: 'emb', label: 'Embedding table', sub: 'vocab × d_model', x: 594, y: 90, w: 168, kind: 'data', info: 'What it is: a big table (matrix) with one row per vocab token (about 200,000 rows for a vocab like o200k). Token ID = row number. A lookup gives each token a vector. These are trained parameters too.' },
        { id: 'model', label: 'Transformer', sub: 'layers', x: 594, y: 222, w: 168, kind: 'server', info: 'What it is: the real brain of the LLM (phase A2). The line of vectors arrives here. Attention and FFN layers make them contextual, and at the end the logits for the next token come out. We build it from the inside in phase A2.' },
        { id: 'lim', label: 'Limit + bill', sub: 'token counter', x: 405, y: 222, w: 150, kind: 'edge', meter: true, load: 10, info: 'What it is: the provider\'s token counter. It decides whether the request gets in and how big the bill is. The token count is checked on the API side: more than the context window and the request is rejected; otherwise input and output tokens are counted for the bill.' },
      ],
      edges: [{ a: 'txt', b: 'tok' }, { a: 'tok', b: 'ids' }, { a: 'ids', b: 'emb' }, { a: 'emb', b: 'model' }, { a: 'ids', b: 'lim' }],
      scenarios: [
        { name: 'Happy path', steps: [
          { title: 'Text arrives', text: 'User: "My video is not uploading, please help".', go: 'txt>tok', msg: '"My video is not uploading, please help"  (38 characters)' },
          { title: 'Tokens made', text: 'BPE cut the text into 8 tokens. Common words are one whole token each.', go: 'tok>ids', after: { ids: { sub: '8 tokens' } }, msg: '["My", " video", " is", " not", " uploading", ",", " please", " help"]' },
          { title: 'Count and limit check', text: '8 tokens: fits easily in the context window, 8 input tokens on the bill.', go: 'ids>lim', after: { lim: { state: 'ok', load: 12, sub: '8 tokens: OK' } } },
          { title: 'Lookup', text: 'Each ID\'s row was taken from the embedding table. Now there are 8 vectors.', go: 'ids>emb', after: { emb: { state: 'hit', sub: '8 rows taken' } } },
          { title: 'Into the model', text: 'The line of 8 vectors went into the transformer. The rest of the work (attention, logits, sampling) is like the previous lesson.', go: 'emb>model', after: { model: { state: 'ok', sub: '8 × d_model' } } },
        ]},
        { name: 'Hindi user (old tokenizer)', steps: [
          { title: 'The same message, in Devanagari', text: '"मेरा वीडियो अपलोड नहीं हो रहा, मदद करो"', go: 'txt>tok', msg: '38 characters, but every Devanagari character is 3 bytes in UTF-8' },
          { title: 'Broken into bytes', text: 'The GPT-2 tokenizer learned few merges for Devanagari. The text broke into 59 tokens, mostly incomplete bytes.', go: 'tok>ids', set: { tok: { state: 'warn' } }, after: { ids: { state: 'warn', sub: '59 tokens' } }, msg: '["<E0 A4>", "<AE>", "<E0 A5>", "<87>", ... 59 tokens]' },
          { title: 'Effect on the bill and the window', text: '59 compared to 8 for English: 7.38x more money, and 7x fewer messages fit in the context window. The newer o200k tokenizer does the same text in 11 tokens. Fix: choose a model with a newer tokenizer and measure the token count for your languages.', go: 'ids>lim', after: { lim: { state: 'hot', load: 88, sub: '59 tokens: 7.38x' } } },
        ]},
        { name: 'Emoji broken in a stream', steps: [
          { title: 'The model is sending an emoji', text: 'The model\'s answer is "Done 🚀". In o200k, " 🚀" is two tokens: the first has the space + 3 bytes of the emoji, the second has the last 1 byte of the emoji (🚀 is 4 bytes in UTF-8).', go: 'res:model>emb>ids', msg: 'token A = <20 F0 9F 9A>   token B = <80>' },
          { title: 'The app decoded each token separately', text: 'The streaming app tried to turn token A into text as soon as it arrived. But 3 bytes is an incomplete character. A "�" (replacement character) appeared on the screen.', go: 'bad:ids>tok>txt', after: { txt: { state: 'warn', sub: 'Done �' } } },
          { title: 'Fix', text: 'The decoder should keep a buffer of bytes: do not send anything to the screen until a full, valid UTF-8 character is formed. Good SDKs do this for you; if you write your own decoder, take care.', focus: ['tok'], set: { txt: { state: 'ok', sub: 'Done 🚀' } } },
        ]},
        { name: 'Wrong token estimate', steps: [
          { title: 'The developer\'s guess', text: 'The app estimated the token count with "characters ÷ 4" and assumed a 20,000-character Hindi document = 5,000 tokens, which fits in the window.', go: 'txt>tok>ids', msg: 'estimate: 20000 / 4 = 5000 tokens' },
          { title: 'The real count was higher', text: '"÷ 4" is only a rule for English. The real count of this document was much higher and crossed the limit. The API rejected the request.', go: ['ids>lim', 'bad:lim>ids'], after: { lim: { state: 'down', load: 100, sub: 'limit exceeded' } }, msg: 'HTTP 400  "prompt is too long: context limit exceeded"' },
          { title: 'Fix', text: 'Count tokens with the same model\'s tokenizer (like tiktoken, or the provider\'s token-count API). If you are near the limit, make the document shorter, summarize it, or send only the relevant part (RAG).', focus: ['lim'], set: { lim: { state: '', load: 20, sub: 'token counter' } } },
        ]},
      ],
    },

    { type: 'callout', tone: 'tip', title: 'Decide: what to do about tokens', html: `• <strong>Cost/limit estimate</strong>: for English, the rough guess "characters ÷ 4" is fine. For production, always count with the same model's tokenizer.<br>• <strong>Multilingual users</strong> (Hindi, Tamil, Bangla...): before choosing a model, compare the token count of your real messages on the new vs old tokenizer. A 1.4x vs 7x difference goes straight to the bill.<br>• <strong>Spelling, counting letters, exact maths</strong>: do not ask the LLM; use code or a tool.<br>• <strong>Search by meaning</strong> (similar questions, articles): embeddings + cosine. <strong>Exact word/ID search</strong> (order ID, error code): normal keyword search is better.<br>• <strong>Which tokenizer algorithm?</strong> A general chat LLM today: byte-level BPE (all languages, never unknown). An encoder/classifier like BERT: the one that came with it (WordPiece). Languages without spaces, or training your own multilingual model: SentencePiece (Unigram or BPE).<br>• <strong>Training your own tokenizer</strong>: only when you are training the model yourself. Never change the tokenizer of a trained model: the rows of the embedding table are tied to that vocab.` },
    { type: 'h2', text: 'The whole picture' },
    { type: 'diagram', title: 'Tokens and embeddings: the whole picture', height: 610,
      groups: [
        { label: 'Building the tokenizer (once, offline)', x: 20, y: 8, w: 680, h: 104 },
        { label: 'On every request', x: 20, y: 140, w: 680, h: 300 },
        { label: 'Back to text, and search', x: 20, y: 470, w: 680, h: 128 },
      ],
      nodes: [
        { id: 'corpus', label: 'Training text', sub: 'lots of text', x: 110, y: 60, w: 150, kind: 'data', info: 'What it is: the text the tokenizer learns from. A language that is rare in it (like Hindi in older corpora) gets fewer merges and later uses more tokens.' },
        { id: 'trainer', label: 'Trainer', sub: 'BPE / WordPiece / Unigram', x: 360, y: 60, w: 190, kind: 'server', info: 'What it is: the algorithm that builds the vocab. BPE joins the most common pair, WordPiece the pair with the highest score, and Unigram removes the least useful tokens from a big vocab. The SentencePiece library runs one of them on raw text.' },
        { id: 'vocab', label: 'Vocab file', sub: 'tokens, IDs, merges', x: 618, y: 60, w: 160, kind: 'queue', info: 'What it is: the final token list, each token\'s ID, and for BPE the order of the merge rules. The model is trained with it, so it cannot be changed later.' },
        { id: 'text', label: 'User text', sub: 'UTF-8 bytes', x: 110, y: 195, w: 150, kind: 'client', info: 'What it is: the user\'s message. To the computer it is a line of bytes: an English letter is 1 byte, a Devanagari letter 3, an emoji 4.' },
        { id: 'tok', label: 'Tokenizer', sub: 'encode', x: 360, y: 195, w: 150, kind: 'server', info: 'What it is: the program that runs from the vocab file. It pre-tokenizes (or, in SentencePiece, turns spaces into ▁), then makes tokens with merges / longest match / Unigram.' },
        { id: 'ids', label: 'Token IDs', sub: '[5299, 621, 357 ...]', x: 618, y: 195, w: 160, kind: 'queue', info: 'What it is: the number of each token. The model, the bill and the limits all count these.' },
        { id: 'count', label: 'Token counter', sub: 'bill + context limit', x: 110, y: 345, w: 160, kind: 'edge', info: 'What it is: the provider\'s meter. It counts input and output tokens for the bill, and stops the request if it is bigger than the context window. Hindi or an old tokenizer = more tokens = a bigger bill.' },
        { id: 'model', label: 'Transformer', sub: 'contextual vectors', x: 360, y: 345, w: 150, kind: 'server', info: 'What it is: the layers of the LLM. They change the embedding vectors by looking at nearby tokens (contextual embeddings), and at the end give the logits for the next token.' },
        { id: 'emb', label: 'Embedding table', sub: 'vocab × d_model', x: 618, y: 345, w: 160, kind: 'data', info: 'What it is: a big table with one row per vocab token. Token ID = row number. A lookup gives each token a vector. These are trained parameters too.' },
        { id: 'dec', label: 'Decoder', sub: 'IDs → text, bytes buffer', x: 120, y: 530, w: 180, kind: 'client', info: 'What it is: the part that turns output IDs back into text. It keeps incomplete UTF-8 bytes in a buffer; otherwise something like an emoji turns into "�".' },
        { id: 'sem', label: 'Semantic search', sub: 'vectors + cosine', x: 618, y: 530, w: 160, kind: 'cache', info: 'What it is: make vectors of sentences with an embedding model and find the closest ones with cosine similarity. It sees that "refund" and "money back" are the same. RAG stands on this.' },
      ],
      edges: [
        { a: 'corpus', b: 'trainer', label: 'pairs' },
        { a: 'trainer', b: 'vocab', label: 'learn' },
        { a: 'vocab', b: 'tok', dashed: true, label: 'load' },
        { a: 'text', b: 'tok', n: 1, label: 'text' },
        { a: 'tok', b: 'ids', n: 2, label: 'tokens' },
        { a: 'ids', b: 'emb', n: 3, label: 'lookup' },
        { a: 'emb', b: 'model', n: 4, label: 'vector' },
        { a: 'tok', b: 'count', kind: 'evt', label: 'count' },
        { a: 'model', b: 'dec', kind: 'res', n: 5, label: 'output IDs' },
        { a: 'emb', b: 'sem', dashed: true, label: 'same idea' },
      ],
      paths: [
        { name: 'How the tokenizer was built', text: 'BPE / WordPiece / Unigram ran on the training text, the vocab file was made, and that same file is loaded into the tokenizer on every request.', go: ['corpus>trainer>vocab>tok'] },
        { name: 'Text to IDs', text: 'The user\'s text was cut into tokens in the tokenizer, and each token got its ID from the vocab.', go: ['text>tok>ids'] },
        { name: 'ID to vector', text: 'Each ID takes one row of the embedding table. The vectors go into the transformer and become contextual.', go: ['ids>emb>model'] },
        { name: 'Bill and limit', text: 'Tokens are counted: input + output tokens = the bill, and more than the context window = the request is rejected.', go: ['tok>count'] },
        { name: 'Answer back', text: 'The model\'s output IDs become text again in the decoder, which keeps a buffer of bytes.', go: ['model>dec'] },
        { name: 'Semantic search', text: 'The same idea of embeddings, for sentences: make vectors, and find the close ones with cosine.', go: ['emb>sem'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>A model only understands numbers. Text → <strong>tokens</strong> (subword pieces) → <strong>token IDs</strong> (numbers in the vocab) → <strong>embeddings</strong> (vectors).</li>
      <li>Subwords are the middle path: with characters the line is too long, with words the list never ends. In English, 1 token ≈ 4 characters.</li>
      <li><strong>BPE</strong>: join the most common pair, apply merges in order. <strong>WordPiece</strong>: score = pair ÷ (A × B), longest match, ## and whole-word [UNK]. <strong>Unigram</strong>: trim down from a big vocab, pick the cut with the highest probability. <strong>SentencePiece</strong>: a library, space = ▁, reversible.</li>
      <li>In byte-level BPE (256 bytes as the base), no text is ever unknown.</li>
      <li>Under-represented languages use more tokens: Hindi is 7.38x on GPT-2, 1.38x on o200k. More tokens = a bigger bill, more latency, less context.</li>
      <li>Always count tokens with the same model's tokenizer. "÷ 4" is only a guess for English.</li>
      <li>Embedding = a table lookup. Measure "how similar" with cosine similarity. A similar vector does not always mean the same meaning (upload vs download).</li>
    </ul>` },

    { type: 'tradeoffs',
      gains: ['Subword tokens: no word is unknown, and common words are short (1 token)', 'Byte-level BPE: any language, emoji or code can be encoded', 'Embeddings capture meaning in numbers: similarity, search and clustering become possible', 'A big vocab = fewer tokens = cheaper, and more text fits in the context'],
      costs: ['Under-represented languages use more tokens: more money, latency, and less context', 'The model does not see letters: strange mistakes in spelling, counting and numbers', 'A big vocab = a bigger embedding table and output layer (more parameters)', 'The tokenizer is tied to the model: it cannot be changed, and different models give different counts', 'Embedding similarity captures "same context", not always "same meaning"'] },

    { type: 'think', questions: [
      { q: 'A new xyz.com feature "#xyzShorts" is trending. How will an old model tokenize it, and will the model "understand" it?', a: 'The tokenizer will break it into familiar pieces (like "#", "xyz", "Sh", "orts"), so no unknown token appears. But the model never saw this name in training, so it does not know what it means. From the pieces it can guess (xyz + shorts = short videos?), which may be wrong. If you need the real meaning, give an explanation in the prompt/RAG.' },
      { q: 'What if we grow the vocab from 200,000 to 2,000,000? Every word becomes one token, everything gets cheaper. What is the problem?', a: 'The embedding table and the output layer become 10x bigger (each is vocab × d_model). Many tokens would appear very rarely in training, so their vectors would not be learned well. Every step would need a softmax over 2,000,000 entries. That is why vocab size is a trade-off: most models today are between 32k and about 250k.' },
      { q: 'Two support tickets: "When will I get my refund?" and "When will my money come back?". Hardly any words are the same. How do you recognise them as "the same type"?', a: 'Make a sentence embedding of both (with an embedding model) and look at the cosine similarity. The meaning is the same, so the vectors will be close (high cosine), even though the words are different. Keyword matching fails here. This is semantic search, which RAG uses.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Why do LLMs use subword tokens instead of characters?', options: ['Characters make the sequence very long, and words make the vocab endless + unknown words; subwords are the balance in between', 'Because GPUs cannot process characters', 'Subwords make the model\'s training data smaller'], answer: 0, explain: 'Characters: long sequences, little meaning per piece. Words: a huge vocab and [UNK]. Subwords: common words whole, rare words in pieces, nothing unknown.' },
      { q: 'What happens at each step of BPE training?', options: ['The longest word is added to the vocab', 'The neighbouring pair that appears together most often is merged into a new token', 'Two random characters are joined'], answer: 1, explain: 'Count pairs (weighted by word frequency), merge the most common pair, remember the rule, repeat. While encoding, the merges are applied in the same order.' },
      { q: 'In WordPiece, the pair "##g + ##s" appeared 5 times, "##g" alone 20 times, "##s" alone 5 times. What is the score?', options: ['5', '0.05', '0.25'], answer: 1, explain: 'Score = pair ÷ (A × B) = 5 ÷ (20 × 5) = 5 ÷ 100 = 0.05. It beat "##u + ##g" (20 ÷ 720 = 0.0278), even though that pair was 4 times more common.' },
      { q: 'What is true about SentencePiece?', options: ['It is a new merge algorithm, different from BPE', 'It is a library that turns spaces into ▁ and runs BPE or Unigram on the whole line, and decoding is fully reversible', 'It was made only for English'], answer: 1, explain: 'SentencePiece is a library, not an algorithm. It does no pre-tokenization, so it also works on languages without spaces.' },
      { q: 'The same message is 8 tokens in English and 59 tokens in Hindi (GPT-2 tokenizer). Which of these is NOT a direct effect?', options: ['The Hindi request costs more', 'Less Hindi text fits in the context window', 'The model\'s vocabulary size changes'], answer: 2, explain: 'The vocab is a fixed property of the tokenizer; it does not change with the input. More tokens = more cost, more latency, less room in the window.' },
      { q: 'How do you get the embedding from a token ID?', options: ['By multiplying the ID by 768', 'By taking that ID\'s row straight from the embedding matrix (a lookup)', 'The tokenizer makes the vector itself'], answer: 1, explain: 'Embedding = a table lookup. Row number = token ID. The numbers in the table are learned during training.' },
      { q: 'What is the cosine similarity of vectors a = [1, 0] and b = [1, 1]?', options: ['1.00', '0.71', '0.50'], answer: 1, explain: 'a·b = 1, |a| = 1, |b| = √2 ≈ 1.414. cos = 1 / 1.414 ≈ 0.71 (an angle of 45°).' },
    ]},
    { type: 'sources', items: [
      { title: 'Neural Machine Translation of Rare Words with Subword Units', publisher: 'Sennrich, Haddow, Birch (ACL / arXiv)', url: 'https://arxiv.org/abs/1508.07909', year: 2016, used: 'Using BPE to split words; the problem of rare words.' },
      { title: 'Byte-Pair Encoding tokenization (LLM Course, chapter 6)', publisher: 'Hugging Face', url: 'https://huggingface.co/learn/llm-course/chapter6/5', year: 2024, used: 'The steps of BPE training, the hug/pug/pun corpus and its first merges (u+g 20, u+n 16, h+ug 15), GPT-2\'s 256-byte base vocab.' },
      { title: 'Language Models are Unsupervised Multitask Learners (GPT-2)', publisher: 'Radford et al., OpenAI', url: 'https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf', year: 2019, used: 'Byte-level BPE and the 50,257 vocab.' },
      { title: 'tiktoken (o200k_base, cl100k_base, gpt2 encodings)', publisher: 'OpenAI (GitHub)', url: 'https://github.com/openai/tiktoken', year: 2025, used: 'All the real token splits, IDs and counts in this lesson were taken with tiktoken 0.14.' },
      { title: 'WordPiece tokenization (LLM Course, chapter 6)', publisher: 'Hugging Face', url: 'https://huggingface.co/learn/llm-course/chapter6/6', year: 2024, used: 'WordPiece\'s ## prefix, score = pair ÷ (A × B), longest-match-first encoding, whole-word [UNK]; also that Google never published the training code. We computed the widget\'s numbers ourselves with this formula.' },
      { title: 'Unigram tokenization (LLM Course, chapter 6)', publisher: 'Hugging Face', url: 'https://huggingface.co/learn/llm-course/chapter6/7', year: 2024, used: 'Unigram: removing tokens from a big vocab, keeping base characters, segmentation = product of probabilities, Viterbi; used with SentencePiece in T5/ALBERT/XLNet.' },
      { title: 'Subword Regularization: Improving Neural Network Translation Models with Multiple Subword Candidates', publisher: 'Taku Kudo (arXiv, ACL 2018)', url: 'https://arxiv.org/abs/1804.10959', year: 2018, used: 'The Unigram language model tokenizer and subword regularization.' },
      { title: 'SentencePiece: A simple and language independent subword tokenizer and detokenizer', publisher: 'Kudo, Richardson (arXiv, EMNLP 2018)', url: 'https://arxiv.org/abs/1808.06226', year: 2018, used: 'Training on raw text, turning spaces into ▁, lossless (reversible) tokenization.' },
      { title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding', publisher: 'Devlin et al., Google (arXiv)', url: 'https://arxiv.org/abs/1810.04805', year: 2018, used: 'BERT\'s WordPiece tokenizer (about 30k vocab; 30,522 in the bert-base-uncased config).' },
      { title: 'Language Model Tokenizers Introduce Unfairness Between Languages', publisher: 'Petrov et al., NeurIPS', url: 'https://arxiv.org/abs/2305.15425', year: 2023, used: 'Up to a 15x difference in token counts between languages, and its effect on cost/latency/context.' },
      { title: 'Welcome Llama 3', publisher: 'Hugging Face blog', url: 'https://huggingface.co/blog/llama3', year: 2024, used: 'Llama 3 vocab of 128,256 (Llama 2: 32K) and embedding matrices growing with a bigger vocab.' },
      { title: 'Efficient Estimation of Word Representations in Vector Space (word2vec)', publisher: 'Mikolov et al., Google (arXiv)', url: 'https://arxiv.org/abs/1301.3781', year: 2013, used: 'Static word embeddings and vector arithmetic (king − man + woman ≈ queen).' },
      { title: 'What are tokens and how to count them?', publisher: 'OpenAI Help Center', url: 'https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them', year: 2025, used: '1 token ≈ 4 characters ≈ ¾ of a word (English).' },
      { title: 'Transformers Explained | Simple Explanation of Transformers', publisher: 'codebasics (YouTube)', url: 'https://www.youtube.com/watch?v=ZhAz268Hdpw', used: 'The learner\'s reference video; its chapters "Word Embeddings", "Contextual Embeddings" and "Tokenization" are covered here.' },
    ]},
  ],
});
