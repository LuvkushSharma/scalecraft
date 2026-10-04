/*
  ai-multihead: reuses the shared tiny example from ai-attention.js
  (tokens ["xyz","on","video"], X, Wq, Wk, Wv). Multi-head here = the SAME Wq/Wk/Wv,
  columns split into 2 heads of d_k = 2 (exactly how real code reshapes one big matrix).
  All numbers verified with a node script (see report).
*/
(function () {
  // ---------- tiny maths helpers (scoped to this lesson) ----------
  const mm = (A, B) => A.map(r => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
  const T = A => A[0].map((_, j) => A.map(r => r[j]));
  const softmax = r => {
    const m = Math.max(...r.filter(x => x !== -Infinity));
    const e = r.map(x => (x === -Infinity ? 0 : Math.exp(x - m)));
    const s = e.reduce((a, b) => a + b, 0);
    return e.map(x => x / s);
  };
  const cols = (A, a, b) => A.map(r => r.slice(a, b));
  const fmt = (x, d) => {
    if (x === -Infinity) return '−∞';
    let s = x.toFixed(d);
    if (s.includes('.')) s = s.replace(/\.?0+$/, '');
    return s === '-0' ? '0' : s;
  };
  // matrix as small HTML grid. hl = row index to highlight
  const grid = (M, title, d = 2, hl = -1, rowNames) => {
    let s = `<div style="display:inline-block;vertical-align:top;margin:0 10px 10px 0"><div style="font:600 12px var(--f-mono);color:var(--ink-2);margin-bottom:4px">${title}</div><table style="border-collapse:collapse;font:12px var(--f-mono)">`;
    M.forEach((r, i) => {
      const on = i === hl;
      s += '<tr>' + (rowNames ? `<td style="padding:2px 6px 2px 0;color:var(--ink-3)">${rowNames[i]}</td>` : '');
      r.forEach(v => { s += `<td style="padding:3px 6px;border:1px solid var(--line);text-align:right;background:${on ? 'var(--accent-soft)' : 'var(--surface)'};color:${on ? 'var(--accent-ink)' : 'var(--ink)'}">${fmt(v, d)}</td>`; });
      s += '</tr>';
    });
    return s + '</table></div>';
  };
  const TOK = ['xyz', 'on', 'video'];
  const X = [[2, 0, 1, 0], [1, 0, 2, 0], [0, 2, 0, 1]];
  const Wq = [[0, 0, 0, 1], [0, 1, 0, 0], [1, 1, 0, 0], [0, 1, 1, 0]];
  const Wk = [[1, 1, 0, 0], [0, 0, 1, 1], [1, 0, 1, 0], [1, 1, 0, 0]];
  const Wv = [[1, 0, 1, 0], [0, 1, 0, 1], [0, 0, 1, 0], [1, 0, 0, 0]];
  const Wo = [[1, 0, 0, 1], [0, 1, 1, 0], [1, 0, 1, 0], [0, 1, 0, 1]];
  const Q = mm(X, Wq), K = mm(X, Wk), V = mm(X, Wv);
  const head = (h, mask) => {
    const a = h * 2, b = a + 2;
    const q = cols(Q, a, b), k = cols(K, a, b), v = cols(V, a, b);
    const S = mm(q, T(k));
    const Sc = S.map((r, i) => r.map((x, j) => (mask && j > i ? -Infinity : x / Math.sqrt(2))));
    const W = Sc.map(softmax);
    return { q, k, v, S, Sc, W, O: mm(W, v) };
  };

  Lesson.register({
    id: 'ai-multihead',
    title: 'Multi-head attention, encoder and decoder',
    minutes: 28,
    summary: `One attention head looks at the sentence in only one way. With multi-head attention, many heads catch different relationships at the same time. Then come residual + LayerNorm, the FFN, the causal mask, encoder vs decoder, cross-attention and the KV cache: one full Transformer block, with small numbers.`,
    blocks: [
      { type: 'callout', tone: 'analogy', title: 'In simple words', html: `In the last lesson, each word looked at the other words in <em>one</em> way.<br>But a word needs to ask several questions at once: "whose?", "where?", "who is near me?".<br>In this lesson we split that one view into <strong>several small views</strong> (multi-head).<br>Then we see why the model does not break when we stack many layers, how a word gets "thought about" (FFN), and how the model stays fast while chatting (KV cache).<br>Everything uses small numbers that you can change yourself.` },
      { type: 'h2', text: 'Problem: one head, one view' },
      { type: 'p', html: `In the <a href="#/ai-attention">self-attention</a> lesson we worked out attention by hand for 3 tokens <code>["xyz", "on", "video"]</code>. (Our toy model learned short app phrases like "xyz on video → watch". The grammar is odd on purpose: it is a tiny made-up model.) The weight row of "video" was <code>[0.5761, 0.2119, 0.2119]</code>. This means "video" gave 58% of its attention to "xyz" and 21% to each of the other two.` },
      { type: 'callout', tone: 'term', title: 'Remember: softmax', html: `<strong>What it is:</strong> a formula that turns any numbers (scores) into percentages. Each one is between 0 and 1, and the total is always 1 (that is, 100%).<br><strong>Why we need it:</strong> attention must decide "how big a share" to take from each word. The shares must add up to 100%.<br><strong>Without it:</strong> scores can be anything (−3, 50, 7). We cannot use them directly as shares.<br><strong>Example:</strong> the scores of "video" are <code>[3.5, 2.5, 2.5]</code>. Take e<sup>x</sup> of each: <code>[33.12, 12.18, 12.18]</code>. The total is 57.48. Divide: <code>[0.5761, 0.2119, 0.2119]</code>. A bigger score gets a bigger share.` },
      { type: 'p', html: `But think about it. The word "video" needs to ask several questions at the same time:` },
      { type: 'list', items: [
        `<em>Whose video?</em> (answer: xyz.com's)`,
        `<em>What is my role in the sentence?</em> ("on" tells us this is a place)`,
        `<em>Which words are next to me?</em>`,
      ]},
      { type: 'p', html: `One head has only <strong>one softmax</strong>. That means only one way to split 100%. If it gives 58% to "xyz", less is left for "on". The answers to all the questions get mixed into one average. And an average is always a bit blurry.` },
      { type: 'callout', tone: 'term', title: 'New word: attention head', html: `<strong>What it is:</strong> one full attention calculation with its own <code>Wq</code>, <code>Wk</code>, <code>Wv</code>: make Q, K, V, compute scores, softmax, then a weighted sum. One head = one "view".<br><strong>Why we need it:</strong> each head can look for a different kind of relationship. One head looks at "whose?", another at "where?".<br><strong>Without it (only one head):</strong> all relationships fight over one 100% split, and the answer becomes a blurry average.<br><strong>Multi-head</strong> = several such heads at the same time (in parallel), each with its own view. Below we will see real numbers for 2 heads.` },
      { type: 'h2', text: 'Solution: split d_model into heads' },
      { type: 'p', html: `The idea of the 2017 paper "Attention Is All You Need" is simple. Instead of running one big head, split the vector into small pieces and run a separate attention on each piece. In our toy example <code>d_model = 4</code>. We will make <strong>h = 2 heads</strong>, so each head has size <code>d_k = d_model / h = 4 / 2 = 2</code>.` },
      { type: 'callout', tone: 'term', title: 'New words: d_model, h and d_k', html: `<strong>What it is:</strong> <code>d_model</code> = how many numbers are in each token's vector (4 in our toy). <code>h</code> = how many heads. <code>d_k</code> = how many numbers each head gets = d_model ÷ h.<br><strong>Why we need it:</strong> heads <em>split</em> the vector. They do not copy it. So the total work stays the same.<br><strong>Without it (if every head copied the full vector):</strong> 8 heads = 8 times the maths and memory.<br><strong>Example:</strong> the Q vector of "xyz" is <code>[1, 1, 0, 2]</code>. Head 1 gets the first two numbers <code>[1, 1]</code>, head 2 gets the other two <code>[0, 2]</code>. In a real model: d_model 512, h 8, so d_k = 64.` },
      { type: 'steps', items: [
        { t: 'Make Q, K, V (the same as before)', d: `Q = X·Wq, K = X·Wk, V = X·Wv. Shape: 3 tokens × 4. These are exactly the numbers from the attention lesson.` },
        { t: 'Split the columns', d: `Head 1 gets columns 0-1, head 2 gets columns 2-3. Real code (PyTorch, the most popular library for writing AI models) does the same: one big Wq, then a reshape that splits it into heads. Each head has its own 3×2 Q, K and V.` },
        { t: 'Each head runs its own attention', d: `scores = Q<sub>h</sub>·K<sub>h</sub><sup>T</sup>, then divide by √d_k = √2 ≈ 1.4142 (not √4 any more, because each head has size 2), softmax, then weights·V<sub>h</sub>. Both heads run <strong>in parallel</strong>, fully separate from each other.` },
        { t: 'Concat', d: `Put the output of head 1 (3×2) and the output of head 2 (3×2) side by side: back to 3×4.` },
        { t: 'Mix with Wo', d: `Finally, multiply by one more matrix, <code>Wo</code> (4×4). This mixes the information of both heads, and the shape goes back to d_model, so the next layer can use it.` },
      ]},
      { type: 'callout', tone: 'term', title: 'New word: concat', html: `<strong>What it is:</strong> concat (concatenate) = joining two lists end to end into one longer list. No maths, just sticking together.<br><strong>Why we need it:</strong> each head gave 2 numbers. The next layer needs a vector of 4 numbers again.<br><strong>Without it:</strong> we would have two separate small vectors, and the next block could not take them.<br><strong>Example:</strong> head 1 output for "xyz" is <code>[1.62, 0.15]</code>, head 2 output is <code>[0.32, 1.79]</code>. Concat = <code>[1.62, 0.15, 0.32, 1.79]</code>.` },
      { type: 'callout', tone: 'term', title: 'New word: Wo (output projection)', html: `<strong>What it is:</strong> a learned matrix (4×4 here) that we multiply by after the concat.<br><strong>Why we need it:</strong> after the concat, the information of head 1 would always stay in columns 0-1 and head 2 in columns 2-3. Wo <strong>mixes</strong> them, so every output number can take something from both heads.<br><strong>Without it:</strong> the heads could never "talk to each other". The next layer would get separate boxes.<br><strong>Example:</strong> the first column of our Wo is <code>[1, 0, 1, 0]</code>. So the first output number = 1.62·1 + 0.15·0 + 0.32·1 + 1.79·0 = <strong>1.94</strong>. Both head 1 (1.62) and head 2 (0.32) are mixed into it.` },
      { type: 'ascii', caption: 'Shapes, h = 2 heads, d_model = 4, 3 tokens', text: `X (3×4)
 ├─ ·Wq → Q (3×4) ─┬─ Q1 = cols 0-1 (3×2)   Q2 = cols 2-3 (3×2)
 ├─ ·Wk → K (3×4) ─┼─ K1 (3×2)              K2 (3×2)
 └─ ·Wv → V (3×4) ─┴─ V1 (3×2)              V2 (3×2)

head 1: softmax(Q1·K1ᵀ / √2) · V1  → O1 (3×2)
head 2: softmax(Q2·K2ᵀ / √2) · V2  → O2 (3×2)

concat [O1 | O2] (3×4)  ·  Wo (4×4)  →  output (3×4)` },
      { type: 'image', src: 'assets/img/ai-multihead/multihead-attention.png', maxWidth: 420, alt: 'Block diagram: Q, K and V pass through three Linear boxes, then several parallel Scaled Dot-Product Attention boxes (heads), then Concat, then one last Linear box', caption: 'The same picture: at the bottom the "Linear" boxes for Q, K, V (that is, Wq, Wk, Wv), in the middle several heads stacked behind each other, at the top Concat and a last Linear (that is, Wo).', credit: { text: 'dvgodoy, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Multiheaded_attention,_block_diagram.png', license: 'CC BY 4.0' } },
      { type: 'h3', text: 'Real numbers: the two heads look at different things' },
      { type: 'p', html: `For now there is no mask (like an encoder: every token can see every token). Softmax weights, to 4 decimals:` },
      { type: 'table', head: ['Token (query)', 'Head 1 weights → [xyz, on, video]', 'Head 2 weights → [xyz, on, video]'], rows: [
        ['xyz', '[0.6200, 0.3057, 0.0743]', '[0.0529, 0.0529, 0.8943]'],
        ['on', '[0.7952, 0.1933, 0.0114]', '[0.1636, 0.1636, 0.6728]'],
        ['video', '[0.8066, 0.0967, 0.0967]', '[0.1978, 0.4011, 0.4011]'],
      ], caption: 'Head 1 mostly looks towards "xyz". Head 2 looks towards "video", and in head 2 "video" itself splits equally between "on" and "video".' },
      { type: 'p', html: `Look: in head 1 the token "xyz" looks 62% at itself, but in head 2 it looks 89% at "video". A single head would have to average these two facts into one row. With two heads, both patterns stay alive <strong>together</strong>. After the concat, the row of "xyz" is <code>[1.62, 0.15, 0.32, 1.79]</code>, and after Wo it is <code>[1.94, 1.94, 0.47, 3.41]</code>.` },
      { type: 'h3', text: 'Try it yourself: multi-head explorer' },
      { type: 'p', html: `Pick a token, pick a head, and turn the causal mask on or off. The numbers for every step are calculated live (shown with 2-4 decimals, full precision inside).` },
      { type: 'custom', render(el) {
        let tok = 2, hd = 0, mask = false;
        el.innerHTML = `<div class="chips mh-tok" role="group" aria-label="Token"></div>
          <div class="chips mh-hd" role="group" aria-label="Head" style="margin-top:6px"></div>
          <label style="display:flex;gap:8px;align-items:center;margin:8px 0"><input type="checkbox" class="mh-mask"> Causal mask (decoder): a token sees only the tokens before it</label>
          <div class="mh-out" style="overflow-x:auto"></div><div class="calc-note mh-note"></div>`;
        const mkChips = (sel, names, get, set) => {
          const box = el.querySelector(sel);
          names.forEach((n, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = n; b.onclick = () => { set(i); upd(); }; box.appendChild(b); });
          return () => box.querySelectorAll('.chip').forEach((b, i) => b.classList.toggle('on', i === get()));
        };
        const c1 = mkChips('.mh-tok', TOK.map(t => 'Query: ' + t), () => tok, v => { tok = v; });
        const c2 = mkChips('.mh-hd', ['Head 1 (cols 0-1)', 'Head 2 (cols 2-3)', 'Concat + Wo'], () => hd, v => { hd = v; });
        el.querySelector('.mh-mask').onchange = e => { mask = e.target.checked; upd(); };
        const upd = () => {
          c1(); c2();
          const H = [head(0, mask), head(1, mask)];
          const out = el.querySelector('.mh-out'), note = el.querySelector('.mh-note');
          if (hd < 2) {
            const r = H[hd];
            const sc = r.S[tok].map((x, j) => (mask && j > tok ? '−∞' : `${x}/1.4142 = ${fmt(r.Sc[tok][j], 4)}`));
            out.innerHTML = grid(r.q, 'Q' + (hd + 1), 2, tok, TOK) + grid(r.k, 'K' + (hd + 1), 2, -1, TOK) + grid(r.v, 'V' + (hd + 1), 2, -1, TOK) +
              `<div style="font:12px var(--f-mono);color:var(--ink);line-height:1.7">scores(${TOK[tok]}) = Q·Kᵀ = [${r.S[tok].map((x, j) => (mask && j > tok ? 'masked' : x)).join(', ')}]<br>÷ √2 → [${sc.join(', ')}]<br>softmax → <strong>[${r.W[tok].map(x => fmt(x, 4)).join(', ')}]</strong><br>output = weights·V${hd + 1} = <strong>[${r.O[tok].map(x => fmt(x, 4)).join(', ')}]</strong></div>`;
            const mx = Math.max(...r.W[tok]);
            const best = TOK.filter((_, j) => Math.abs(r.W[tok][j] - mx) < 1e-9).map(t => `"${t}"`).join(' and ');
            note.innerHTML = `In head ${hd + 1}, "${TOK[tok]}" looks most at <strong>${best}</strong> (${(mx * 100).toFixed(1)}%${best.includes(' and ') ? ' each' : ''}).`;
          } else {
            const C = H[0].O.map((r, i) => r.concat(H[1].O[i]));
            const O = mm(C, Wo);
            out.innerHTML = grid(C, 'concat [O1 | O2]', 4, tok, TOK) + grid(Wo, 'Wo', 0) + grid(O, 'output = concat·Wo', 2, tok, TOK);
            note.innerHTML = `Final row of "${TOK[tok]}": [${O[tok].map(x => fmt(x, 2)).join(', ')}]. The shape is back to 3×4, and the next layer works on this.`;
          }
        };
        upd();
      }},
      { type: 'p', html: `Turn the mask on and pick "xyz": in both heads the weights become <code>[1, 0, 0]</code>, because the first token can only see itself. The mask has no effect on "video", because it is already the last token.` },
      { type: 'h3', text: 'Why does it work, and how much does it cost?' },
      { type: 'list', items: [
        `<strong>Different sides:</strong> each head has its own small Wq/Wk/Wv, so it can focus on a different "side" of the vector. The 2017 paper called this "different representation subspaces": different parts of the vector, used for different kinds of information.`,
        `<strong>Same number of parameters:</strong> for 1 head of size 4, Wq, Wk, Wv = 3 × (4×4) = 48 numbers. For 2 heads of size 2: each head has 3 × (4×2) = 24, two heads = 48. The same! Wo (4×4 = 16) is used in both cases. General rule: attention parameters ≈ <code>4 · d_model²</code>, no matter how many heads.`,
        `<strong>About the same compute too:</strong> the work of the small heads adds up to the work of one big head, and on a GPU all heads run at the same time (in parallel).`,
        `<strong>Nobody writes the roles of the heads:</strong> "head 1 = grammar, head 2 = names" was only our way of explaining. In a real model, training decides by itself. Research (Michel et al., 2019) showed that you can remove many heads and accuracy does not drop much: some heads are redundant.`,
      ]},
      { type: 'table', head: ['Model', 'd_model', 'Heads (h)', 'd_k = d_model / h', 'Layers'], rows: [
        ['Original Transformer (2017, base)', '512', '8', '64', '6 + 6'],
        ['GPT-2 small (2019)', '768', '12', '64', '12'],
        ['Llama 2 7B (2023)', '4096', '32', '128', '32'],
        ['Llama 3 8B (2024)', '4096', '32 query heads, 8 KV heads', '128', '32'],
        ['Our toy', '4', '2', '2', '1'],
      ], caption: 'What "8 KV heads" in Llama 3 means is explained below in the KV cache section (GQA).' },
      { type: 'callout', tone: 'mistake', title: 'Common beginner mistake', html: `"8 heads = an 8 times bigger model." Wrong. Heads <strong>split</strong> d_model. They do not copy it. A vector of 512 is cut into 8 pieces of 64. So more heads means each head is smaller (less detail). Fewer heads means each head is bigger, but there are fewer different views. h is a <strong>hyperparameter</strong> (a setting the model builder picks before training; the model does not learn it), and it balances this trade-off. The paper found that both 1 head and very many heads were a little worse.` },
      { type: 'h2', text: 'New problem: the block must be stacked 32-96 times' },
      { type: 'p', html: `One attention layer is not enough. Real models stack this block again and again: 12 layers in GPT-2 small, 32 in Llama 2 7B, 96 in GPT-3 (175B). But a very deep network has two problems:` },
      { type: 'list', items: [
        `<strong>The signal gets lost:</strong> each layer changes its input a little. Change it 96 times and the original meaning of the token can become blurry on the way. During training, another signal travels backwards: the <strong>gradient</strong>. A gradient is a small note for each weight: "change in this direction, by this much, so the error goes down". After travelling back through 96 layers, this note can wear down to almost 0. Then the first layers learn nothing.`,
        `<strong>The numbers drift:</strong> if the outputs of some layer become very big (like 300) or very small, the next softmax puts 100% on a single token, and training becomes unstable.`,
      ]},
      { type: 'h3', text: 'Fix 1: residual connection (shortcut)' },
      { type: 'p', html: `Instead of sending the layer's output forward directly, <strong>add</strong> the input to it: <code>output = x + Sublayer(x)</code>. Now the layer does not have to build a whole new vector. It only learns "what change is needed". If the layer is not useful, it can output ~0, and x goes forward as it was. The gradient also travels straight back through this shortcut.` },
      { type: 'callout', tone: 'term', title: 'New word: residual connection', html: `<strong>What it is:</strong> a residual (or skip connection) = adding the sublayer's own input back to its output (the sublayer is attention or the FFN): <code>x + Sublayer(x)</code>. Like "track changes" in a document: the original text stays, and the layer only adds changes.<br><strong>Why we need it:</strong> the original meaning is never lost, and the gradient gets a direct road back.<br><strong>Without it:</strong> models with 30-100 layers do not train at all: the signal and the gradient die on the way.<br><strong>Example:</strong> x = <code>[2, 0, 1, 0]</code>. The layer suggests the change <code>[0.1, −0.2, 0, 0.3]</code>. Output = <code>[2.1, −0.2, 1, 0.3]</code>. Even if the layer did nothing (all 0), x would still go forward safely.<br>The idea came from ResNet (He et al., 2015, image models). In a Transformer, every attention and every FFN has a residual around it. This is also called the "residual stream": a highway on which every layer adds a little something.` },
      { type: 'h3', text: 'Fix 2: LayerNorm (fix the scale)' },
      { type: 'callout', tone: 'term', title: 'New word: LayerNorm', html: `<strong>What it is:</strong> Layer Normalization (Ba et al., 2016). It normalizes each token's vector <em>on its own</em>: it makes the average (mean) of the numbers 0 and their spread (std) 1. Like setting every photo to a standard brightness, so they all look alike.<br><strong>Why we need it:</strong> so numbers between layers do not become too big or too small. The next layer always gets numbers in a similar "range".<br><strong>Without it:</strong> numbers would drift to 300 or 0.001, softmax would stick 100% to one token, and training would be unstable.<br><strong>Why "on its own":</strong> it does not use other tokens or other sentences in the batch. So it also works while generating one token at a time.` },
      { type: 'p', html: `Three small words first: <strong>mean</strong> = average. <strong>Variance</strong> = for each number, how far it is from the mean, squared, then the average of all of those. <strong>Std</strong> (standard deviation) = √variance, the typical spread of the numbers. Now the formula: <code>LN(x) = γ · (x − mean) / √(variance + ε) + β</code>. ε (epsilon) is a tiny number (like 0.00001) so we never divide by zero. γ (gamma) and β (beta) are learned numbers that let the model adjust the scale back (at the start γ = 1, β = 0).` },
      { type: 'p', html: `Example: <code>x = [1, 3, 2, 6]</code>. Mean = 12/4 = 3. Variance = ((1−3)² + 0² + (2−3)² + (6−3)²)/4 = (4 + 0 + 1 + 9)/4 = 3.5. Std = √3.5 ≈ 1.8708. LN(x) = <code>[−1.0690, 0.0000, −0.5345, 1.6036]</code>. Now take <code>[10, 30, 20, 60]</code>: the answer is <strong>exactly the same</strong>. LayerNorm keeps only the shape (the pattern) and removes the size.` },
      { type: 'custom', render(el) {
        el.innerHTML = `<div class="row2"><div><label>Vector x (4 numbers, separated by commas)</label><input class="ln-in" type="text" value="1, 3, 2, 6"></div>
          <div><label>Scale multiplier: <strong class="ln-kv">×1</strong></label><input class="ln-k" type="range" min="1" max="100" step="1" value="1"></div></div>
          <div class="stats"><div class="stat"><span>Input (× scale)</span><strong class="ln-x"></strong></div><div class="stat"><span>Mean</span><strong class="ln-m"></strong></div><div class="stat"><span>Std</span><strong class="ln-s"></strong></div><div class="stat"><span>LN(x), γ=1, β=0</span><strong class="ln-o"></strong></div></div>
          <div class="calc-note">Move the scale slider: even when the input becomes 100 times bigger, the LN output does not change. That is the job of LayerNorm. ε = 0.00001.</div>`;
        const q = s => el.querySelector(s);
        const upd = () => {
          const k = Number(q('.ln-k').value);
          q('.ln-kv').textContent = '×' + k;
          let x = q('.ln-in').value.split(',').map(Number).filter(v => !isNaN(v)).slice(0, 8);
          if (x.length < 2) { q('.ln-o').textContent = 'enter at least 2 numbers'; return; }
          x = x.map(v => v * k);
          const m = x.reduce((a, b) => a + b, 0) / x.length;
          const v = x.reduce((a, b) => a + (b - m) ** 2, 0) / x.length;
          q('.ln-x').textContent = '[' + x.map(a => fmt(a, 2)).join(', ') + ']';
          q('.ln-m').textContent = fmt(m, 4);
          q('.ln-s').textContent = fmt(Math.sqrt(v), 4);
          q('.ln-o').textContent = '[' + x.map(a => fmt((a - m) / Math.sqrt(v + 1e-5), 4)).join(', ') + ']';
        };
        q('.ln-in').addEventListener('input', upd); q('.ln-k').addEventListener('input', upd); upd();
      }},
      { type: 'h3', text: 'Add & Norm: Post-LN vs Pre-LN vs RMSNorm' },
      { type: 'p', html: `"Add & Norm" = add the residual (Add) and apply LayerNorm (Norm). The only question is <em>when</em> the Norm happens. <strong>Post-LN</strong> = after adding (post = after). <strong>Pre-LN</strong> = before the sublayer (pre = before).` },
      { type: 'compare',
        left: { title: 'Post-LN (2017 original)', ascii: `x ──┬──> Sublayer ──> (+) ──> LayerNorm ──> out
    └──────────────────^` , html: `This is the "Add & Norm" box in the diagram: first add, then normalize. In deep models, training is unstable at the start, so a learning rate "warm-up" is needed (warm-up = changing the weights very slowly for the first few thousand training steps, then speeding up).` },
        right: { title: 'Pre-LN (from GPT-2 onwards)', ascii: `x ──┬──> LayerNorm ──> Sublayer ──> (+) ──> out
    └──────────────────────────────^`, html: `First normalize, then the sublayer, then add. The residual highway stays completely clean. Xiong et al. (2020) showed that the gradients behave well from the start, so less warm-up is needed.` },
      },
      { type: 'p', html: `Most LLMs today (GPT-2/3, the Llama family) use <strong>Pre-LN</strong>. Llama goes one step further: <strong>RMSNorm</strong> (Zhang & Sennrich, 2019). It does not subtract the mean. It only divides by the root-mean-square: <code>x / √(mean(x²) + ε) · γ</code>. Example: <code>x = [1, 3, 2, 6]</code>. mean(x²) = (1 + 9 + 4 + 36)/4 = 12.5, √12.5 ≈ 3.5355, so RMSNorm(x) ≈ <code>[0.2828, 0.8485, 0.5657, 1.6971]</code>. The pattern is the same; only the mean is not moved to 0. It is a bit cheaper and works just as well in practice. In this track's <a href="#/ai-transformer-e2e">end-to-end lesson</a> we use the original Post-LN, so it matches the 2017 diagram.` },

      { type: 'h2', text: 'Feed-forward network (FFN): each token thinks on its own' },
      { type: 'p', html: `In attention, tokens share information <em>with each other</em>. But sharing alone is not enough: each token also has to <strong>process</strong> the information it received. The FFN does this job: a small 2-layer neural network that runs <strong>on each token separately, with the same weights</strong> (so it is called "position-wise").` },
      { type: 'callout', tone: 'term', title: 'New word: FFN (feed-forward network)', html: `<strong>What it is:</strong> a small 2-layer neural network. First make the vector bigger (4 → 8 numbers), apply a "bend" (activation) to each number, then make it small again (8 → 4). It runs on each token <strong>separately</strong>, but with the <strong>same weights</strong> for all tokens. So it is also called "position-wise".<br><strong>Why we need it:</strong> attention only <em>collects</em> information (a weighted average). Making new meaning out of it, like "xyz + on + video = talking about a video on a website", is the FFN's job.<br><strong>Without it:</strong> the model would only keep averaging. About 2/3 of each layer's parameters, and much of the model's memorized knowledge, live here.<br><strong>Small words:</strong> <code>d_ff</code> = the size of the big vector in the middle (2048 in the paper, that is 4 × 512). <code>b1</code>, <code>b2</code> = <strong>bias</strong>, a fixed number added to every output (0 in our toy).` },
      { type: 'callout', tone: 'term', title: 'New word: activation function', html: `<strong>What it is:</strong> a small rule applied to each number separately that "bends" it (non-linear). Not a straight line, but a bend.<br><strong>Why we need it:</strong> a matrix multiply can only do "straight line" work. Two matrix multiplies in a row are still just one matrix multiply. Without the bend, the FFN cannot learn anything new.<br><strong>Without it:</strong> W1 and W2 would collapse into one single matrix. Deep layers would be useless.` },
      { type: 'callout', tone: 'term', title: 'New words: ReLU, GELU, SwiGLU', html: `<strong>ReLU</strong>: turn negatives into 0 and keep positives as they are: <code>max(0, x)</code>. Example: <code>[−2, −1, 0, 1, 2]</code> → <code>[0, 0, 0, 1, 2]</code>. The original 2017 model used this.<br><strong>GELU</strong>: a smooth version of ReLU. Instead of cutting sharply at 0, it shrinks negative values gradually. Example: <code>[−2, −1, 0, 1, 2]</code> → about <code>[−0.0455, −0.1587, 0, 0.8413, 1.9545]</code>. GPT-2 uses this.<br><strong>SwiGLU</strong> (Shazeer, 2020): a "gate" that decides, for each value, how much of it goes forward. It uses 3 matrices instead of 2. Models like Llama use it.<br><strong>Without them:</strong> there is no "bend", so the FFN is useless.` },
      { type: 'code', text: `FFN(x) = activation(x · W1 + b1) · W2 + b2

shapes:  x (1 × d_model) → x·W1 (1 × d_ff) → activation → ·W2 (1 × d_model)
paper:   d_model = 512, d_ff = 2048 (4 times), activation = ReLU
GPT-2:   GELU        Llama:  SwiGLU (3 matrices, the version with a gate)` },
      { type: 'p', html: `Toy example (weights from the e2e lesson, d_ff = 8): the normalized vector of "xyz" is <code>h = [1, −1, 1, −1]</code>. <code>h·W1 = [1, −1, 1, 0, −2, 2, −2, 1]</code>. After ReLU: <code>[1, 0, 1, 0, 0, 2, 0, 1]</code>: the negatives are switched off. Then <code>·W2 = [1, −1, 1.5, −0.5]</code>. This is the FFN output, and the residual adds it to <code>h</code>: <code>[2, −2, 2.5, −1.5]</code>.` },
      { type: 'p', html: `Counting parameters: in the original model, attention has ~<code>4·512² = 1,048,576</code> per layer, and the FFN has <code>2·512·2048 = 2,097,152</code>. So <strong>about 2/3 of each layer's parameters are in the FFN</strong>. According to researchers (Geva et al., 2021), much of the model's "memorized knowledge" (facts) lives in these FFN weights. That is why Mixture-of-Experts (MoE) models split the FFN into several "experts" (MoE = many separate FFNs, and for each token a small router runs only 1-2 of them, not all).` },
      { type: 'h2', text: 'Causal mask: do not let the decoder see the future' },
      { type: 'p', html: `A GPT-like model has one job: predict the next token. During training we give it a whole sentence at once, "xyz on video watch", and at each position we ask "what comes next?". This happens <strong>in parallel</strong>: 4 positions, 4 questions, in one <strong>forward pass</strong> (forward pass = sending the input once through all the layers of the model). But if the position of "on" could see "video", it would <em>copy</em> the answer. That is cheating: during training the <strong>loss</strong> (how wrong the model was, as one number; lower is better) looks great, but in real generation (when the future does not exist yet) the model fails.` },
      { type: 'callout', tone: 'term', title: 'New word: causal mask', html: `<strong>What it is:</strong> a "curtain" placed over the score table. Each token can see only itself and the tokens <em>before</em> it. The scores of later (future) tokens are set to <code>−∞</code>.<br><strong>Why we need it:</strong> a <strong>decoder</strong> (a model that generates text, like GPT) must face the same situation in training as in real use: the future has not been written yet.<br><strong>Without it:</strong> the model would learn to copy answers in training, and write nonsense in real chats.<br><strong>Example:</strong> in the scores of "on", <code>[a, b, c]</code>, the "video" score c is in the future. After the mask: <code>[a, b, −∞]</code>. e<sup>−∞</sup> = 0, so after softmax the weight of "video" is exactly 0.` },
      { type: 'p', html: `The fix: set the cells above the diagonal of the score matrix (the future) to <code>−∞</code>, before softmax. <code>e<sup>−∞</sup> = 0</code>, so their weight is exactly 0. This is called the <strong>causal mask</strong> (or look-ahead mask). In the explorer we turned the mask on: in head 2, the row of "on" changed from <code>[0.1636, 0.1636, 0.6728]</code> to <code>[0.5, 0.5, 0]</code>.` },
      { type: 'ascii', caption: 'Causal mask: ✓ = can see, ✗ = −∞ (weight 0)', text: `            looks at →    xyz   on   video
  query xyz               ✓    ✗     ✗
  query on                ✓    ✓     ✗
  query video             ✓    ✓     ✓` },
      { type: 'h2', text: 'One decoder block: run it yourself' },
      { type: 'p', html: `Now let us join all the pieces. A GPT-style (decoder-only) block: masked multi-head attention → Add & Norm → FFN → Add & Norm. Click the boxes to understand each part.` },
      { type: 'flow', height: 310, title: 'Decoder block (Post-LN, 2017 style)',
        nodes: [
          { id: 'in', label: 'Input x', sub: 'emb + PE, 3×4', x: 90, y: 80, w: 140, kind: 'client', info: 'What it is: the vector of each token (embedding + positional encoding). Shape: tokens × d_model, 3 × 4 in our case. The block starts here. For the second block, the input is the output of the previous block.' },
          { id: 'mha', label: 'Masked MHA', sub: '2 heads, d_k=2', x: 270, y: 80, w: 140, kind: 'server', info: 'What it is: masked multi-head self-attention. Here the tokens share information with each other. Each head makes its own Q, K, V, applies the causal mask (future = −∞), softmax, then weights·V. Then concat and Wo.' },
          { id: 'an1', label: 'Add & Norm', sub: 'x + MHA(x)', x: 450, y: 80, w: 140, kind: 'net', info: 'What it is: residual + LayerNorm. Add the input x to the attention output, then bring each token\'s vector to mean 0, std 1. Why: in a deep stack, the signal and the gradient stay alive.' },
          { id: 'ffn', label: 'FFN', sub: '4 → 8 → 4', x: 630, y: 80, w: 140, kind: 'server', info: 'What it is: the position-wise feed-forward network. On each token separately: Linear (4 → 8), ReLU, Linear (8 → 4). Why: to process the information that attention collected. In real models d_ff = 4·d_model, and ~2/3 of the layer\'s parameters are here.' },
          { id: 'an2', label: 'Add & Norm', sub: 'h + FFN(h)', x: 630, y: 230, w: 140, kind: 'net', info: 'What it is: the second residual + LayerNorm. Its output is the output of the whole block, with the same shape, tokens × d_model.' },
          { id: 'out', label: 'Next block', sub: 'or LM head', x: 450, y: 230, w: 140, kind: 'data', info: 'What it is: the next block (this block repeats N times). After the last block comes the LM head: a Linear layer (d_model → vocab size) and softmax, which give the probabilities of the next token.' },
          { id: 'kv', label: 'KV cache', sub: 'past K, V', x: 270, y: 230, w: 140, kind: 'cache', info: 'What it is: a store in GPU memory. During generation, the K and V vectors of the old tokens of every layer are saved here. Why: when a new token arrives, the old K, V do not have to be calculated again. Used only at inference.' },
        ],
        edges: [{ a: 'in', b: 'mha' }, { a: 'mha', b: 'an1' }, { a: 'an1', b: 'ffn' }, { a: 'ffn', b: 'an2' }, { a: 'an2', b: 'out' }, { a: 'mha', b: 'kv', dashed: true }],
        scenarios: [
          { name: 'Happy path', steps: [
            { title: 'Vectors come in', text: '3 tokens, each a vector of 4 numbers.', go: 'in>mha', msg: 'X = [[2,0,1,0],[1,0,2,0],[0,2,0,1]]' },
            { title: 'Masked multi-head attention', text: 'Two heads see different patterns; the mask hides the future. Concat + Wo.', go: 'mha>an1', after: { mha: { state: 'ok' } }, msg: 'video, head 1: [0.8066, 0.0967, 0.0967]\nvideo, head 2: [0.1978, 0.4011, 0.4011]' },
            { title: 'Residual + LayerNorm', text: 'x + attention, then normalize each row.', go: 'an1>ffn', after: { an1: { state: 'ok' } } },
            { title: 'FFN', text: 'Each token is processed on its own: 4 → 8 → ReLU → 4.', go: 'ffn>an2', after: { ffn: { state: 'ok' } } },
            { title: 'Add & Norm again, then onward', text: 'The output shape is still 3×4. The next block takes it as its input.', go: 'an2>out', after: { an2: { state: 'ok' }, out: { state: 'ok' } } },
          ]},
          { name: 'Forgot the mask', intro: 'During training, someone removed the causal mask.', steps: [
            { title: 'The whole sentence goes in', text: 'Training sentence: "xyz on video watch". Every position must predict the next token.', go: 'in>mha', msg: 'targets: xyz→on, on→video, video→watch' },
            { title: 'The future is visible', text: 'The position of "on" can see "video", which is its answer. Attention learns to simply copy the answer.', go: 'bad:mha>an1', set: { mha: { state: 'warn', sub: 'future visible!' } } },
            { title: 'Training loss looks great', text: 'The loss is almost 0. The model looks like a genius.', go: 'an1>ffn>an2>out', after: { out: { state: 'warn', sub: 'loss ≈ 0 (fake)' } } },
            { title: 'It fails in generation', text: 'In real use, the future token does not exist (that is what we want to produce). The learned pattern ("copy the next one") does not work: nonsense output. Fix: −∞ on the upper triangle of the score matrix.', set: { out: { state: 'down', sub: 'garbage output' } }, focus: ['mha'] },
          ]},
          { name: 'Remove Residual + Norm', intro: 'Imagine we stacked 96 blocks but removed Add & Norm.', steps: [
            { title: 'Fine for the first block', text: 'In one block the difference is small.', go: 'in>mha>an1', set: { an1: { state: 'dim', sub: 'skip removed' }, an2: { state: 'dim', sub: 'skip removed' } } },
            { title: 'The numbers start drifting', text: 'Every layer changes the scale. After some layers the values are huge; softmax sticks 100% to one token.', go: 'bad:an1>ffn>an2', after: { ffn: { state: 'hot', sub: 'values too big' } } },
            { title: 'The gradient disappears', text: 'In training, the "what to fix" signal is almost 0 after travelling back through 96 layers. The first layers learn nothing.', go: 'lost:an2>out', after: { out: { state: 'down', sub: 'training diverges' } } },
            { title: 'Fix', text: 'The residual shortcut (x + sublayer) gives the gradient a direct road; LayerNorm brings each token\'s scale back to mean 0, std 1.', set: { an1: { state: 'ok', sub: 'x + MHA(x)' }, an2: { state: 'ok', sub: 'h + FFN(h)' } }, focus: ['an1', 'an2'] },
          ]},
          { name: 'Generation + KV cache', intro: 'After "xyz on video" the model generated "watch". Now we need the next token.', steps: [
            { title: 'Only the new token goes in', text: 'The 3 old tokens are not processed again. Only the vector of "watch" (position 3) comes in.', go: 'in>mha', set: { in: { sub: 'only "watch", 1×4' } }, msg: 'x_new = [0, 1, 1, 2]' },
            { title: 'Old K, V from the cache', text: 'Because of the causal mask, the K, V of old tokens never change. Take them from the cache and add the new token\'s k, v.', go: ['mha>kv', 'res:kv>mha'], after: { kv: { state: 'hit', sub: '3 → 4 rows' } }, msg: 'K = [cached 3 rows] + [3,2,2,1]\nV = [cached 3 rows] + [2,1,1,1]' },
            { title: 'Attention for one row only', text: 'The new token\'s q is compared with all 4 keys: only 4 comparisons. Without the cache, the whole 4×4 table would be built again. This is called O(n) vs O(n²): for n tokens, the work grows with n, or with n×n.', go: 'mha>an1>ffn>an2>out', after: { out: { state: 'ok', sub: 'next token logits' } } },
          ]},
        ],
      },
      { type: 'h2', text: 'Encoder, decoder and cross-attention' },
      { type: 'p', html: `The original 2017 model was built for translation (English → German). It had two stacks. Imagine xyz.com wants to turn its short, oddly-worded caption phrases into natural English (a translation-like job): "xyz on video" → "video on xyz".` },
      { type: 'callout', tone: 'term', title: 'New words: encoder and decoder', html: `<strong>What it is:</strong> the <strong>encoder</strong> = the stack of blocks that reads the whole input at once and makes an "understood" vector for every word. The <strong>decoder</strong> = the stack that <em>writes</em> the output one token at a time.<br><strong>Why we need it:</strong> translation has two different jobs: understanding the source phrase (encoder), and writing the new English sentence (decoder).<br><strong>Without it:</strong> one stack would have to do both jobs. (Today's GPT-like models do exactly this: only a decoder, with the source text put inside the prompt.)<br><strong>Two special tokens:</strong> <code>&lt;bos&gt;</code> = "beginning of sequence", the first input of the decoder. <code>&lt;eos&gt;</code> = "end of sequence": when it is produced, writing stops.` },
      { type: 'table', head: ['Block', 'What is inside', 'Mask?', 'Who uses it'], rows: [
        ['Encoder block', 'Self-attention → Add & Norm → FFN → Add & Norm', 'No: every token sees the whole sentence (both directions)', 'BERT (encoder-only), the left half of the original Transformer, the encoder of T5'],
        ['Decoder block (original)', 'Masked self-attention → Add & Norm → <strong>Cross-attention</strong> → Add & Norm → FFN → Add & Norm', 'Yes, causal in self-attention', 'The right half of the original Transformer, the decoder of T5'],
        ['Decoder-only block (GPT)', 'Masked self-attention → Add & Norm → FFN → Add & Norm (no cross-attention, no encoder at all)', 'Yes, causal', 'Chat LLMs like GPT, Llama, Claude'],
      ]},
      { type: 'callout', tone: 'term', title: 'New word: cross-attention', html: `<strong>What it is:</strong> attention where <strong>Q comes from the decoder</strong>, but <strong>K and V come from the encoder's output</strong>. Each decoder token asks: "which word of the source sentence should I focus on?". The formula is the same, <code>softmax(Q·Kᵀ/√d_k)·V</code>; only Q and K/V come from different places. (In self-attention, all three come from the same sequence.)<br><strong>Why we need it:</strong> in translation, each new English word is linked to some word in the source. The decoder needs a way to "look at" the source.<br><strong>Without it:</strong> the decoder would not know the source at all. It would only guess from its own previous words.<br><strong>Example (shared numbers):</strong> the encoder's K rows: xyz <code>[3, 2, 1, 0]</code>, on <code>[3, 1, 2, 0]</code>, video <code>[1, 1, 2, 2]</code>. The decoder's q (let us assume) is <code>[1, 1, 0, 0]</code>. Scores = <code>[5, 4, 2]</code>, ÷ √4 = <code>[2.5, 2, 1]</code>, softmax = <code>[0.5465, 0.3315, 0.1220]</code>. The decoder gave 55% of its attention to "xyz", and the output = weights · the encoder's V = <code>[1.55, 0.24, 2.63, 0.24]</code>.` },
      { type: 'p', html: `How translation flows: the encoder reads the whole source phrase once (no mask, because the whole source is available). The decoder makes the English output one token at a time: masked self-attention over the tokens it has made, then cross-attention into the encoder's output. When the decoder is making the word after "on", its cross-attention should go mostly to "xyz".` },
      { type: 'image', src: 'assets/img/ai-multihead/decoder-block.png', maxWidth: 320, alt: 'One decoder block of the original Transformer: Masked Multi-Headed Self-Attention at the bottom, Multi-Headed Cross-Attention in the middle with K and V coming from the encoder states on the left and Q from the box below, and a Feed-Forward Network at the top', caption: 'One decoder block of an encoder-decoder model. Notice: in cross-attention, K and V come from "Encoder\'s States", and Q comes from the decoder\'s own box below. (The Add & Norm boxes are hidden in this picture.)', credit: { text: 'dvgodoy, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Transformer,_one_decoder_block.png', license: 'CC BY 4.0' } },
      { type: 'flow', height: 300, title: 'Encoder-decoder: "xyz on video" → "video on xyz"',
        nodes: [
          { id: 'src', label: 'Source', sub: 'xyz on video', x: 90, y: 75, w: 140, kind: 'client', info: 'What it is: the source phrase to be rewritten. It becomes tokens + embeddings + positional encoding and goes into the encoder.' },
          { id: 'enc', label: 'Encoder ×N', sub: 'no mask', x: 290, y: 75, w: 150, kind: 'server', info: 'What it is: N encoder blocks: self-attention (no mask) + FFN. Output: a vector with context for every source token. Why: to read and understand the whole source once. It runs only once, however long the output is.' },
          { id: 'gen', label: 'Generated', sub: '<bos> video on', x: 90, y: 225, w: 140, kind: 'client', info: 'What it is: the English tokens the decoder has made so far. &lt;bos&gt; is a special "start" token placed at the beginning of every output.' },
          { id: 'self', label: 'Masked self', sub: 'decoder tokens', x: 290, y: 225, w: 150, kind: 'server', info: 'What it is: the masked self-attention of the decoder. Generated tokens see only the tokens before them, because the later ones are not made yet.' },
          { id: 'cross', label: 'Cross-attn', sub: 'Q dec, K/V enc', x: 490, y: 150, w: 150, kind: 'net', info: 'What it is: cross-attention. Q from the decoder\'s vector, K and V from the encoder\'s output. Why: here the decoder decides which source word to look at right now.' },
          { id: 'head', label: 'FFN + softmax', sub: 'next token', x: 630, y: 255, w: 150, kind: 'data', info: 'What it is: FFN, Add & Norm, then (after the last block) a linear layer + softmax over the English vocabulary. The most probable token = the next word.' },
        ],
        edges: [{ a: 'src', b: 'enc' }, { a: 'gen', b: 'self' }, { a: 'enc', b: 'cross' }, { a: 'self', b: 'cross' }, { a: 'cross', b: 'head' }],
        scenarios: [
          { name: 'One translation step', steps: [
            { title: 'The encoder runs once', text: 'The whole source sentence, no mask. The output vectors are saved.', go: 'src>enc', after: { enc: { state: 'ok', sub: '3 vectors ready' } } },
            { title: 'The decoder looks at its own tokens', text: 'Made so far: "&lt;bos&gt; video on". Masked self-attention.', go: 'gen>self' },
            { title: 'Cross-attention', text: 'The decoder\'s Q meets the encoder\'s K/V. After "on", the most attention goes to "xyz" in the source.', go: ['self>cross', 'enc>cross'], parallel: true, after: { cross: { state: 'hit', sub: 'focus: "xyz"' } } },
            { title: 'Next token', text: 'After softmax the most probable is "xyz". Add it to Generated and repeat until &lt;eos&gt; appears.', go: 'cross>head', after: { head: { state: 'ok', sub: '"xyz" (next)' } } },
          ]},
          { name: 'The source got cut', intro: 'The source was too long, so the part after the encoder\'s max length was cut off.', steps: [
            { title: 'Half the source goes in', text: 'Only "xyz on" is left; "video" was cut.', go: 'src>enc', set: { src: { state: 'warn', sub: 'truncated!' } }, after: { enc: { state: 'warn', sub: '2 vectors' } } },
            { title: 'Cross-attention has no information', text: 'The decoder can never get the K/V of "video". Attention can only choose among things that are present.', go: ['gen>self>cross', 'enc>cross'], parallel: true, after: { cross: { state: 'miss', sub: 'video missing' } } },
            { title: 'Wrong translation', text: 'The model will still write something (softmax always gives some token), but it is wrong or incomplete. Lesson: attention is not magic; what is not in the context cannot be seen.', go: 'bad:cross>head', after: { head: { state: 'down', sub: 'wrong output' } } },
          ]},
        ],
      },
      { type: 'h2', text: 'KV cache: making generation fast' },
      { type: 'p', html: `xyz Assistant is writing a reply, one token at a time. To make token #1000, attention needs the K and V of the previous 999 tokens. The simple way: for every new token, put the whole sequence through the model again. That means 1 row of K/V for token 1, 2 rows for token 2, ..., 1000 rows for token 1000. In total <code>1 + 2 + ... + 1000 = 500,500</code> K/V rows (in every layer!), while only 1000 rows were actually new.` },
      { type: 'p', html: `Observation: because of the causal mask, the K and V of an old token <strong>never change</strong> (it never looks at future tokens). So make them once and <strong>cache</strong> them. At each step, make only the new token's q, k, v, add its k/v to the cache, and run attention from the new q over the whole cache. The e2e lesson shows this with numbers: after "watch" is added, the rows of the first 3 tokens stay exactly the same, bit for bit.` },
      { type: 'callout', tone: 'term', title: 'New word: KV cache', html: `<strong>What it is:</strong> a copy of the Key and Value vectors of every old token, for every layer, kept in GPU memory. Like a video app that keeps the part you already watched on your phone, so going back does not need a new download.<br><strong>Why we need it:</strong> so the K, V of old tokens are not rebuilt for every new token. Only the new token's work is done.<br><strong>Without it:</strong> a 1000-token reply would build 500,500 K/V rows instead of just 1000. The reply would be very slow and expensive.<br><strong>When:</strong> only at <strong>inference</strong> (using a trained model to generate answers). Not in training.<br><strong>Why not Q:</strong> the queries of old tokens are never needed again. Only the new token asks the question.` },
      { type: 'p', html: `The price: memory. First some small words: <strong>head_dim</strong> = the size of one head (the same as d_k). <strong>fp16</strong> = each number stored in 16 bits = 2 bytes. <strong>Batch</strong> = how many users' requests run on the GPU at the same time. <strong>MiB / GiB</strong> = 2<sup>20</sup> / 2<sup>30</sup> bytes (about 1 million / 1 billion bytes). Formula: <code>KV bytes = 2 (K and V) × layers × KV heads × head_dim × bytes per number × tokens × batch</code>. Llama 2 7B (32 layers, 32 KV heads, head_dim 128, fp16 = 2 bytes): one token = 2·32·32·128·2 = <strong>524,288 bytes = 0.5 MiB</strong>. A context of 4096 tokens = <strong>2 GiB</strong>, for just one user.` },
      { type: 'callout', tone: 'term', title: 'New words: MQA and GQA', html: `<strong>What it is:</strong> two ways to make the KV cache smaller. <strong>Multi-Query Attention (MQA)</strong>, Shazeer 2019: all query heads share one single K/V head. <strong>Grouped-Query Attention (GQA)</strong>, Ainslie et al. 2023: the middle road, where small groups of query heads share one K/V head.<br><strong>Why we need it:</strong> the cache size grows with the number of "KV heads". Fewer KV heads = smaller cache = more users on one GPU.<br><strong>Without it:</strong> with long contexts and many users, GPU memory runs out quickly.<br><strong>Example:</strong> Llama 3 8B has 32 query heads and 8 KV heads: one K/V for every 4 query heads. The cache is 4 times smaller: 128 KiB per token instead of 512 KiB. MQA can lose a little quality; GQA keeps quality almost the same.` },
      { type: 'custom', render(el) {
        const P = { l2: [32, 32, 128, 4096, 'Llama 2 7B (MHA)'], l3: [32, 8, 128, 8192, 'Llama 3 8B (GQA)'], toy: [1, 2, 2, 4, 'Our toy'] };
        el.innerHTML = `<div class="chips kv-p" role="group" aria-label="Preset"></div>
          <div class="row2" style="margin-top:8px">
            <div><label>Layers</label><input class="kv-l" type="number" min="1" value="32"></div>
            <div><label>KV heads</label><input class="kv-h" type="number" min="1" value="32"></div>
            <div><label>head_dim</label><input class="kv-d" type="number" min="1" value="128"></div>
            <div><label>Context tokens: <strong class="kv-tv"></strong></label><input class="kv-t" type="range" min="0" max="17" step="1" value="12"></div>
            <div><label>Precision</label><select class="kv-b"><option value="4">fp32 (4 bytes)</option><option value="2" selected>fp16 / bf16 (2 bytes)</option><option value="1">fp8 / int8 (1 byte)</option></select></div>
            <div><label>Batch (users at the same time)</label><input class="kv-n" type="number" min="1" value="1"></div>
          </div>
          <div class="stats"><div class="stat"><span>Per token</span><strong class="kv-pt"></strong></div><div class="stat"><span>Total KV cache</span><strong class="kv-tot"></strong></div><div class="stat"><span>Without a cache: K/V rows to build</span><strong class="kv-nc"></strong></div></div>
          <div class="calc-note">Formula: 2 × layers × KV heads × head_dim × bytes × tokens × batch. "Without a cache" = 1 + 2 + ... + tokens (per layer, per head); with the cache, only "tokens" rows.</div>`;
        const q = s => el.querySelector(s);
        const human = b => b >= 2 ** 30 ? (b / 2 ** 30).toFixed(2) + ' GiB' : b >= 2 ** 20 ? (b / 2 ** 20).toFixed(2) + ' MiB' : b >= 1024 ? (b / 1024).toFixed(2) + ' KiB' : b + ' bytes';
        const box = q('.kv-p');
        Object.keys(P).forEach(k => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = P[k][4]; b.onclick = () => { q('.kv-l').value = P[k][0]; q('.kv-h').value = P[k][1]; q('.kv-d').value = P[k][2]; q('.kv-t').value = Math.log2(P[k][3]); upd(); }; box.appendChild(b); });
        const upd = () => {
          const L = Math.max(1, +q('.kv-l').value || 1), H = Math.max(1, +q('.kv-h').value || 1), D = Math.max(1, +q('.kv-d').value || 1);
          const t = 2 ** Number(q('.kv-t').value), B = +q('.kv-b').value, N = Math.max(1, +q('.kv-n').value || 1);
          q('.kv-tv').textContent = t.toLocaleString('en-IN');
          const per = 2 * L * H * D * B;
          q('.kv-pt').textContent = human(per);
          q('.kv-tot').textContent = human(per * t * N);
          q('.kv-nc').textContent = (t * (t + 1) / 2).toLocaleString('en-IN') + ' vs ' + t.toLocaleString('en-IN');
        };
        el.querySelectorAll('input,select').forEach(i => i.addEventListener('input', upd)); upd();
      }},
      { type: 'p', html: `Try it: Llama 2 7B preset, 4,096 tokens → 2.00 GiB. Set the batch to 16 → 32.00 GiB, which is even more than the model's own weights (~6.7B params × 2 bytes ≈ 13.5 GB). That is why serving systems manage the KV cache carefully. For example, PagedAttention in vLLM (a popular open-source LLM serving software): it keeps the cache in small fixed-size "pages", so empty space is not wasted. And newer models use GQA. Llama 3 8B preset, 8,192 tokens → 1.00 GiB: half, even though the context is double.` },
      { type: 'callout', tone: 'mistake', title: 'Common beginner mistake', html: `"KV cache = prompt caching." They are related but different. The KV cache makes token-by-token generation fast inside one single request. <strong>Prompt caching</strong> (an API feature) reuses the KV cache of the same beginning text (like a long system prompt) across different requests. Details in the <a href="#/ai-context">context lesson</a>.` },
      { type: 'callout', tone: 'tip', title: 'Decide', html: `<ul>
        <li><strong>Understanding text / classifying / search embeddings</strong> (the whole input is available up front): encoder-only (like BERT), no mask, context from both directions.</li>
        <li><strong>Generating text, chat, agents</strong>: decoder-only (GPT, Llama, Claude), causal mask + KV cache. The default for today's LLMs.</li>
        <li><strong>Input → a different output</strong> (translation, summarization) where the input is fixed: encoder-decoder (T5, the original Transformer) with cross-attention. But big decoder-only models can also do this job through the prompt.</li>
        <li><strong>Heads</strong>: keep d_model / h ≈ 64-128 (both the paper and Llama are in this range). <strong>Norm</strong>: for a new model use Pre-LN/RMSNorm. <strong>Tight serving memory</strong>: choose a model with GQA/MQA, and plan your budget with the KV cache formula.</li>
      </ul>` },
      { type: 'diagram', title: 'One decoder block: the whole picture', height: 560,
        groups: [
          { label: 'Masked multi-head attention', x: 10, y: 6, w: 700, h: 200 },
          { label: 'Rest of the block (block ×N), then the LM head', x: 10, y: 222, w: 700, h: 110 },
          { label: 'Generation (inference)', x: 10, y: 348, w: 700, h: 200 },
        ],
        nodes: [
          { id: 'in', label: 'Input X', sub: 'emb + PE, 3×4', x: 90, y: 109, kind: 'client', info: 'What it is: the vector of each token (embedding + positional encoding). In our toy, 3 tokens × 4 numbers. The block starts here.' },
          { id: 'qkv', label: 'Q, K, V', sub: 'X·Wq, X·Wk, X·Wv', x: 280, y: 109, w: 150, kind: 'server', info: 'What it is: three matrix multiplies. Each token gets a question (Q), a label (K) and content (V). Each is 3×4. Then the columns are split between the heads.' },
          { id: 'h1', label: 'Head 1', sub: 'cols 0-1, d_k = 2', x: 470, y: 64, kind: 'server', info: 'What it is: the first head. It takes columns 0-1 of Q, K, V and runs its own softmax(Q·Kᵀ/√2)·V. In our numbers it looks mostly towards "xyz".' },
          { id: 'h2', label: 'Head 2', sub: 'cols 2-3, d_k = 2', x: 470, y: 154, kind: 'server', info: 'What it is: the second head. The same calculation on columns 2-3, fully separate from head 1 and in parallel. In our numbers it looks mostly towards "video".' },
          { id: 'cat', label: 'Concat + Wo', sub: '2 + 2 → 4, mix', x: 640, y: 109, w: 130, kind: 'net', info: 'What it is: join the 2 + 2 numbers of both heads into 4 (concat), then multiply by Wo (4×4). Why: so the shape is d_model again, and the information of both heads gets mixed.' },
          { id: 'an1', label: 'Add & Norm 1', sub: 'x + MHA(x)', x: 640, y: 284, w: 130, kind: 'net', info: 'What it is: residual (add the input x back) + LayerNorm (each token gets mean 0, std 1). Why: so the meaning and the gradient stay alive in a deep stack.' },
          { id: 'ffn', label: 'FFN', sub: '4 → 8 → ReLU → 4', x: 460, y: 284, kind: 'server', info: 'What it is: a small separate network on each token: make it bigger (4 → 8), ReLU, make it small again (8 → 4). Why: to process the information that attention collected. ~2/3 of the layer\'s parameters are here.' },
          { id: 'an2', label: 'Add & Norm 2', sub: 'h + FFN(h)', x: 280, y: 284, kind: 'net', info: 'What it is: the second residual + LayerNorm. Its output is the output of the block. In a real model this whole block repeats 12-96 times.' },
          { id: 'lm', label: 'LM head', sub: 'logits → softmax', x: 90, y: 284, kind: 'data', info: 'What it is: a Linear layer after the last block (d_model → vocab size) that gives a score (logit) for every possible token, then softmax turns them into probabilities.' },
          { id: 'samp', label: 'Sampler', sub: 'greedy / sampling', x: 90, y: 420, kind: 'queue', info: 'What it is: the part that picks one token from the probabilities (the biggest one, or a random draw). This is code outside the model.' },
          { id: 'newx', label: 'New token', sub: 'only 1 row', x: 280, y: 420, kind: 'client', info: 'What it is: the token that was just picked, which goes back into the model. Because of the KV cache only its one row is processed: its q, k, v are made, and its k, v are added to the cache.' },
          { id: 'kv', label: 'KV cache', sub: 'past K, V', x: 470, y: 420, kind: 'cache', info: 'What it is: a copy of the K and V of old tokens for every layer, in GPU memory. The new token\'s k, v are added to it, and the heads read the old K, V from here. Size = 2 × layers × KV heads × head_dim × bytes × tokens.' },
          { id: 'app', label: 'xyz Assistant', sub: 'token stream', x: 280, y: 510, w: 150, kind: 'client', info: 'What it is: the user\'s chat app. Each picked token shows up on screen right away (streaming), until &lt;eos&gt; or max_tokens is reached.' },
        ],
        edges: [
          { a: 'in', b: 'qkv', n: 1 },
          { a: 'qkv', b: 'h1', n: 2 },
          { a: 'qkv', b: 'h2', n: 2 },
          { a: 'h1', b: 'cat', n: 3 },
          { a: 'h2', b: 'cat', n: 3 },
          { a: 'cat', b: 'an1', n: 4, label: 'Wo output' },
          { a: 'an1', b: 'ffn', n: 5 },
          { a: 'ffn', b: 'an2' },
          { a: 'an2', b: 'lm', n: 6 },
          { a: 'lm', b: 'samp', n: 7 },
          { a: 'samp', b: 'app', n: 8, kind: 'res', label: 'stream' },
          { a: 'samp', b: 'newx', kind: 'evt', dashed: true },
          { a: 'newx', b: 'qkv', kind: 'evt', dashed: true, via: [[378, 404], [378, 109]] },
          { a: 'newx', b: 'kv', dashed: true },
          { a: 'kv', b: 'h2', dashed: true, via: [[553, 420], [553, 154]] },
        ],
        paths: [
          { name: 'Split into heads', text: 'Q, K, V are made from X (3×4). Columns 0-1 go to head 1, columns 2-3 to head 2. Both heads run attention separately and at the same time.', go: ['in>qkv>h1', 'qkv>h2'] },
          { name: 'Concat + Wo', text: 'The 3×2 outputs of both heads are joined into 3×4, then mixed by Wo. Row of "xyz": [1.62, 0.15, 0.32, 1.79] → [1.94, 1.94, 0.47, 3.41].', go: ['h1>cat', 'h2>cat', 'cat>an1'] },
          { name: 'Add & Norm + FFN', text: 'Residual + LayerNorm, then the FFN on each token (4 → 8 → 4), then residual + LayerNorm again. After the block ×N comes the LM head.', go: ['cat>an1>ffn>an2>lm'] },
          { name: 'KV cache while generating', text: 'The sampler picks a token, streams it to the app, and the same token goes back in. Only its q, k, v are made; its k, v are added to the cache; the heads read the old K, V from the cache.', go: ['lm>samp>app', 'samp>newx>qkv', 'newx>kv>h2'] },
        ],
      },
      { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
        <li>One head = one softmax = only one way to split 100%. Multi-head = split the vector into h parts (d_k = d_model ÷ h), and each head looks at a different relationship.</li>
        <li>Concat the outputs of the heads, then mix them with Wo. Parameters are about 4·d_model², no matter how many heads.</li>
        <li>The residual (x + sublayer) protects the meaning and the gradient. LayerNorm keeps each token at mean 0, std 1. Today's models use Pre-LN / RMSNorm.</li>
        <li>The FFN runs on each token separately (4 times bigger, ReLU/GELU/SwiGLU, back to small). About 2/3 of a layer's parameters are here.</li>
        <li>Causal mask = future scores set to −∞. This stops the decoder from cheating in training, and the K, V of old tokens never change.</li>
        <li>Encoder = sees the whole input in both directions (BERT). Decoder = writes one token at a time (GPT). Cross-attention = Q from the decoder, K/V from the encoder.</li>
        <li>KV cache = a copy of old K, V, used only during generation. Memory = 2 × layers × KV heads × head_dim × bytes × tokens. GQA/MQA make it smaller.</li>
      </ul>` },
      { type: 'tradeoffs',
        gains: ['Multi-head: many relationships at once, with no extra parameters', 'Residual + LayerNorm: models up to 100 layers deep can be trained', 'FFN: a place for each token to process its information (and the model\'s "knowledge")', 'Causal mask: train on a whole sentence in one pass, with no cheating', 'KV cache: each new token needs only O(n) work'],
        costs: ['More heads = each head is smaller; some heads are redundant', 'Attention work grows as O(n²) with sequence length (in training/prefill)', 'The KV cache eats GPU memory, growing linearly with context and batch', 'MQA/GQA make the cache smaller but risk a little quality', 'Post-LN is unstable in deep models; you have to move to Pre-LN'] },
      { type: 'think', questions: [
        { q: 'd_model = 4096. What happens if we use 4096 heads (d_k = 1) instead of 32?', a: 'Each head\'s Q·K score is just the product of two single numbers: it cannot capture any rich "match", and softmax runs almost on noise. The parameter count stays the same, but every head is very weak. The paper also saw quality drop with too many heads. That is why d_k is ~64-128.' },
        { q: 'Why does an encoder (BERT) not use a KV cache?', a: 'The encoder processes the whole input once, all together, with no mask. It does not generate token by token, so the "reuse old K/V" situation never happens. Also, without a mask, a new token would change the vectors of the old tokens too, so a cache would not stay valid.' },
        { q: 'xyz Assistant serves 1000 users at the same time, each with an 8K context, on Llama 3 8B. How big is the KV cache? Is one 80 GB GPU enough?', a: '128 KiB × 8192 = 1 GiB per user (fp16). 1000 users = ~1000 GiB. One 80 GB GPU fits the cache of only ~60 users (64 GB ÷ ~1.07 GB), after the ~16 GB of weights. That is why we need batching limits, PagedAttention, KV cache quantization (fp8), and many GPUs.' },
      ]},
      { type: 'quiz', questions: [
        { q: 'd_model = 512, h = 8. What is d_k for each head?', options: ['512', '64', '4096', '8'], answer: 1, explain: 'd_k = d_model / h = 512 / 8 = 64. Heads split the vector. They do not copy it.' },
        { q: 'In cross-attention, where do Q, K and V come from?', options: ['All three from the encoder', 'All three from the decoder', 'Q from the decoder, K and V from the encoder', 'Q from the encoder, K and V from the decoder'], answer: 2, explain: 'The decoder asks (Q), searches in the encoder\'s output (K), and takes information from there (V).' },
        { q: 'What does the causal mask do to the score matrix?', options: ['It sets the diagonal to 0', 'It sets future positions (above the diagonal) to −∞, so their weight is 0 after softmax', 'It divides all scores by √d_k', 'It removes padding tokens'], answer: 1, explain: 'e^(−∞) = 0, so the weight of future tokens is exactly 0. This stops cheating in training.' },
        { q: 'LayerNorm([10, 30, 20, 60]) and LayerNorm([1, 3, 2, 6]) (γ=1, β=0):', options: ['The first is 10 times bigger', 'Both are the same: [−1.0690, 0, −0.5345, 1.6036]', 'Both are [0, 0, 0, 0]', 'The first is negative'], answer: 1, explain: 'LayerNorm removes the mean and divides by the std, so the overall scale cancels out.' },
        { q: 'Llama 2 7B, fp16, 4096 tokens, 1 user: about how big is the KV cache?', options: ['2 MiB', '512 MiB', '2 GiB', '64 GiB'], answer: 2, explain: '2 × 32 × 32 × 128 × 2 bytes = 0.5 MiB per token; × 4096 = 2 GiB.' },
      ]},
      { type: 'sources', items: [
        { title: 'Attention Is All You Need', publisher: 'Vaswani et al., NeurIPS (arXiv 1706.03762)', url: 'https://arxiv.org/abs/1706.03762', year: 2017, official: true, used: 'Multi-head formula, h=8, d_k=64, d_ff=2048, Add & Norm, encoder/decoder, masked self-attention, encoder-decoder attention, head-count ablation' },
        { title: 'Are Sixteen Heads Really Better than One?', publisher: 'Michel, Levy, Neubig, NeurIPS (arXiv 1905.10650)', url: 'https://arxiv.org/abs/1905.10650', year: 2019, used: 'Many heads can be pruned with little loss' },
        { title: 'Layer Normalization', publisher: 'Ba, Kiros, Hinton (arXiv 1607.06450)', url: 'https://arxiv.org/abs/1607.06450', year: 2016, used: 'LayerNorm definition' },
        { title: 'Deep Residual Learning for Image Recognition', publisher: 'He et al. (arXiv 1512.03385)', url: 'https://arxiv.org/abs/1512.03385', year: 2015, used: 'Origin of residual connections' },
        { title: 'On Layer Normalization in the Transformer Architecture', publisher: 'Xiong et al., ICML (arXiv 2002.04745)', url: 'https://arxiv.org/abs/2002.04745', year: 2020, used: 'Post-LN vs Pre-LN, warm-up' },
        { title: 'Root Mean Square Layer Normalization', publisher: 'Zhang & Sennrich (arXiv 1910.07467)', url: 'https://arxiv.org/abs/1910.07467', year: 2019, used: 'RMSNorm' },
        { title: 'GLU Variants Improve Transformer', publisher: 'Shazeer (arXiv 2002.05202)', url: 'https://arxiv.org/abs/2002.05202', year: 2020, used: 'SwiGLU FFN' },
        { title: 'Transformer Feed-Forward Layers Are Key-Value Memories', publisher: 'Geva et al., EMNLP (arXiv 2012.14913)', url: 'https://arxiv.org/abs/2012.14913', year: 2021, used: 'FFN layers store learned patterns/knowledge' },
        { title: 'Fast Transformer Decoding: One Write-Head is All You Need', publisher: 'Shazeer (arXiv 1911.02150)', url: 'https://arxiv.org/abs/1911.02150', year: 2019, used: 'Multi-Query Attention' },
        { title: 'GQA: Training Generalized Multi-Query Transformer Models', publisher: 'Ainslie et al., EMNLP (arXiv 2305.13245)', url: 'https://arxiv.org/abs/2305.13245', year: 2023, used: 'Grouped-Query Attention' },
        { title: 'KV cache explanation (Transformers docs)', publisher: 'Hugging Face', url: 'https://huggingface.co/docs/transformers/en/cache_explanation', year: 2026, official: true, used: 'What the KV cache stores, per-layer caching, inference only' },
        { title: 'Llama 2 7B and Llama 3 8B config.json', publisher: 'Hugging Face model hub', url: 'https://huggingface.co/meta-llama/Meta-Llama-3-8B', year: 2024, used: 'Layers 32, hidden 4096, 32 heads, KV heads 32 vs 8' },
        { title: 'Transformers Explained | Simple Explanation of Transformers (video)', publisher: 'codebasics (YouTube)', url: 'https://www.youtube.com/watch?v=ZhAz268Hdpw', used: 'Learner reference; topics cross-checked (multi-head attention, decoder)' },
      ]},
    ],
  });
})();
