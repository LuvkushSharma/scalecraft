/*
  SHARED TINY EXAMPLE for the A2 track (ai-attention, ai-multihead, ai-transformer-e2e may reuse it).
  Tokens: ["xyz", "pe", "video"], d_model = 4, d_k = 4, single head, row-vector convention (Q = X·Wq).
  X is "embedding + positional encoding" already added (illustrative small integers, not from a real model).

  X  = [[2,0,1,0],    // xyz
        [1,0,2,0],    // pe
        [0,2,0,1]]    // video
  Wq = [[0,0,0,1],[0,1,0,0],[1,1,0,0],[0,1,1,0]]
  Wk = [[1,1,0,0],[0,0,1,1],[1,0,1,0],[1,1,0,0]]
  Wv = [[1,0,1,0],[0,1,0,1],[0,0,1,0],[1,0,0,0]]

  Q = X·Wq = [[1,1,0,2],[2,2,0,1],[0,3,1,0]]
  K = X·Wk = [[3,2,1,0],[3,1,2,0],[1,1,2,2]]
  V = X·Wv = [[2,0,3,0],[1,0,3,0],[1,2,0,2]]

  scores = Q·K^T            = [[5,4,6],[10,8,6],[7,5,5]]
  scaled = scores / sqrt(4) = [[2.5,2,3],[5,4,3],[3.5,2.5,2.5]]
  weights = softmax(row-wise), 4 decimals:
    xyz   -> [0.3072, 0.1863, 0.5065]
    pe    -> [0.6652, 0.2447, 0.0900]
    video -> [0.5761, 0.2119, 0.2119]
  output = weights·V (2 decimals, computed from unrounded weights):
    xyz   -> [1.31, 1.01, 1.48, 1.01]
    pe    -> [1.67, 0.18, 2.73, 0.18]
    video -> [1.58, 0.42, 2.36, 0.42]

  CAUSAL MASK (decoder: token i sees only 0..i):
    weights: xyz -> [1, 0, 0]; pe -> [0.7311, 0.2689, 0]; video -> [0.5761, 0.2119, 0.2119]
    output:  xyz -> [2, 0, 3, 0]; pe -> [1.73, 0, 3, 0]; video -> [1.58, 0.42, 2.36, 0.42]
*/
Lesson.register({
  id: 'ai-attention',
  title: 'Self-attention: Q, K, V by hand',
  minutes: 32,
  summary: `The heart of the Transformer: each token "looks at" the other tokens and updates its own meaning. With three tokens ("xyz", "on", "video") and vectors of 4 numbers, we calculate Q, K, V, the scores, the scaling, the softmax and the causal mask completely by hand.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `xyz Assistant got the prompt "xyz on video". The word "video" alone does not know <em>whose</em> video it is.<br>Attention is a method where each word asks the other words: "how useful are you to me?". Take more information from the more useful ones, and a little from the rest.<br>In this lesson we do the whole calculation by hand: only 3 words, 4 numbers per word, and multiplying and adding. Never seen a matrix? No problem, we learn that here too, from the start.` },
    { type: 'h2', text: 'The problem: whose "video" is it?' },
    { type: 'p', html: `In the <a href="#/ai-transformer-overview">overview</a> we saw that each token starts as a <em>static</em> vector (embedding + <a href="#/ai-positional-encoding">position</a>). In xyz Assistant's prompt <code>xyz on video</code>, the vector of "video" is the same in every sentence: it does not know that this is a video on <em>xyz.com</em>, not on YouTube. To pick the next token well, "video" needs context from the other tokens.` },
    { type: 'p', html: `The question: how does "video" decide how much to learn from each token? Every sentence is different, so we cannot write a fixed rule. The model must work out "whom to pay how much attention" by itself, for every input. This is called <strong>self-attention</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: self-attention', html: `<strong>What it is:</strong> a layer where each token gives a score to every token of the same sentence (itself included): "how relevant is this to me". It turns the scores into percentages (<strong>weights</strong>), and builds its new vector as a <strong>weighted average</strong> of those tokens' information. "Self" because everything happens inside one sentence (if it uses another sentence, it is cross-attention).<br><strong>Why we need it:</strong> every sentence is different, so "whom to pay how much attention" cannot be a fixed rule. Attention works it out for each input.<br><strong>Without it:</strong> the vector of "video" would stay the same in every sentence and never get context.` },
    { type: 'callout', tone: 'term', title: 'New word: weighted average', html: `<strong>What it is:</strong> an average of several things, where each thing has a different "share" (weight). The weights add up to 1.<br><strong>Example:</strong> your marks: 80 in test 1, 60 in test 2. If test 1 has weight 0.75 and test 2 has weight 0.25, the weighted average = 0.75×80 + 0.25×60 = 60 + 15 = <strong>75</strong> (the simple average would be 70).<br><strong>Why we need it:</strong> attention mixes each token's information according to its weight: more relevant = bigger share.<br><strong>Without it:</strong> every token would get an equal share, useful or not.` },

    { type: 'h2', text: 'Intuition: like a search engine' },
    { type: 'p', html: `Think of video search on xyz.com. You type a <strong>query</strong> ("cricket highlights"). Each video has a title and tags, which are its <strong>key</strong>. The search engine matches the query against every key, and shows the <strong>value</strong> (the actual video) of the ones that match.` },
    { type: 'table', head: ['Role', 'In a search engine', 'In attention (for each token)'], rows: [
      ['Query (Q)', 'What you are looking for', '"What kind of information do I need?"'],
      ['Key (K)', 'The video\'s title / tags', '"What kind of information do I have?" (a label shown to others)'],
      ['Value (V)', 'The actual video', '"If I am picked, this is the information I will give"'],
    ]},
    { type: 'p', html: `One big difference: a search engine picks the <em>top result</em> (a hard choice). Attention is <strong>soft</strong>: it takes a little of everyone, based on how well they match. Something like 50% xyz, 30% on, 20% video. That is why the whole process is smooth and can be learned in training.` },
    { type: 'h2', text: 'First, the maths toolkit (5 minutes)' },
    { type: 'p', html: `Attention is all multiplying and adding "tables of numbers". If you did the matrix part of the <a href="#/ai-transformer-overview">overview lesson</a>, this is a revision; if not, learn it right here. You only need to know how to multiply and add.` },
    { type: 'callout', tone: 'term', title: 'New word: vector and matrix', html: `<strong>What it is:</strong> a <strong>vector</strong> is a list of numbers, like <code>[2, 0, 1, 0]</code> (4 numbers). A <strong>matrix</strong> is a table made by stacking several vectors. Its <strong>shape</strong> = (rows × columns). Our 3 tokens, each with 4 numbers: a <code>3 × 4</code> matrix, one row per token.<br><strong>Why we need it:</strong> when all tokens are in one table, the computer can work on all of them at the same time.<br><strong>Without it:</strong> a separate loop for each token: slow, and the maths is harder to write.` },
    { type: 'callout', tone: 'term', title: 'New word: dot product', html: `<strong>What it is:</strong> multiply the numbers in the same positions of two vectors of the same size, then add them all. <code>[1, 2]·[3, 4] = 1×3 + 2×4 = 11</code>.<br><strong>Why we need it:</strong> it is a "how well do they match" number. If both vectors have big numbers in the same places, the result is big. This is the attention score.<br><strong>Without it:</strong> no simple way to measure "how useful is this token to that token".` },
    { type: 'callout', tone: 'term', title: 'New word: matrix multiply (X·W)', html: `<strong>What it is:</strong> many dot products at once. Cell (i, j) of the result = <em>row i of X</em> · <em>column j of W</em>. The shape rule: <code>(a × b)·(b × c) = (a × c)</code>; the middle numbers must be equal. In our case <code>(3 × 4)·(4 × 4) = (3 × 4)</code>.<br><strong>Why we need it:</strong> in one multiply, every token's vector turns into a new vector (this is how Q, K, V are made).<br><strong>Without it:</strong> for 3 tokens × 4 numbers we would write 12 separate sums by hand; in a real model, billions.` },
    { type: 'callout', tone: 'term', title: 'New word: transpose (Kᵀ)', html: `<strong>What it is:</strong> lay the matrix on its side: rows become columns. K has shape 3 × 4, so Kᵀ has shape 4 × 3.<br><strong>Why we need it:</strong> we cannot multiply Q (3 × 4) by K (3 × 4) directly (the middle 4 and 3 do not match). Q·Kᵀ = (3 × 4)·(4 × 3) = (3 × 3): the dot product of every token's query with every token's key, in one multiply.<br><strong>Without it:</strong> the table of scores could not be made in one step.` },
    { type: 'callout', tone: 'term', title: 'New word: Q, K, V (query, key, value)', html: `<strong>What it is:</strong> three new vectors made from each token's vector X: <code>Q = X·Wq</code> (query: "what do I need"), <code>K = X·Wk</code> (key: "what do I have", a label others see), <code>V = X·Wv</code> (value: "if picked, this is the information I give"). Wq, Wk, Wv are three learned matrices, the same for all tokens. Each token has its own Q, K, V row.<br><strong>Why we need it:</strong> "searching", "being found" and "giving" are three different jobs; three different "lenses" (W) can learn them separately.<br><strong>Without it:</strong> one vector would do all three jobs, and a token would mostly find itself the most relevant (see the "confusion" section below).` },
    { type: 'callout', tone: 'term', title: 'New word: d_k', html: `<strong>What it is:</strong> the length (number of numbers) of the Q and K vectors. In our example d_k = 4. In GPT-2 small, each head (one set of attention, see the <a href="#/ai-multihead">multi-head lesson</a>) has d_k = 64.<br><strong>Why we need it:</strong> we use it to shrink the score: score ÷ √d_k. The reason is in the experiment below.<br><strong>Without it (no scaling):</strong> with a big d_k the scores get very big, softmax gives "everything to one token", and training gets stuck.` },
    { type: 'h2', text: 'By hand: step 1, X and W' },
    { type: 'p', html: `Our tiny setup: 3 tokens, d_model = 4, d_k = 4, a single head. The numbers are small integers so you can check them on paper. In a real model they are decimals learned in training; here we picked them by hand. The same numbers come back in the <a href="#/ai-multihead">multi-head</a> and <a href="#/ai-transformer-e2e">end-to-end</a> lessons.` },
    { type: 'code', text: `X (each row is one token: embedding + position, already added)
           d0 d1 d2 d3
  xyz   [  2, 0, 1, 0 ]
  on    [  1, 0, 2, 0 ]
  video [  0, 2, 0, 1 ]

Wq = [ 0 0 0 1 ]     Wk = [ 1 1 0 0 ]     Wv = [ 1 0 1 0 ]
     [ 0 1 0 0 ]          [ 0 0 1 1 ]          [ 0 1 0 1 ]
     [ 1 1 0 0 ]          [ 1 0 1 0 ]          [ 0 0 1 0 ]
     [ 0 1 1 0 ]          [ 1 1 0 0 ]          [ 1 0 0 0 ]` },

    { type: 'h2', text: 'Step 2: compute Q, K, V' },
    { type: 'p', html: `One row by hand: <strong>Q[xyz] = X[xyz] · Wq</strong>. X[xyz] = [2, 0, 1, 0] means "take row 0 of Wq 2 times, and row 2 once":<br><code>2 × [0,0,0,1] + 0 × [0,1,0,0] + 1 × [1,1,0,0] + 0 × [0,1,1,0] = [1, 1, 0, 2]</code>` },
    { type: 'p', html: `All the rows, the same way:` },
    { type: 'table', head: ['Token', 'Q = X·Wq', 'K = X·Wk', 'V = X·Wv'], rows: [
      ['xyz', '[1, 1, 0, 2]', '[3, 2, 1, 0]', '[2, 0, 3, 0]'],
      ['on', '[2, 2, 0, 1]', '[3, 1, 2, 0]', '[1, 0, 3, 0]'],
      ['video', '[0, 3, 1, 0]', '[1, 1, 2, 2]', '[1, 2, 0, 2]'],
    ], caption: 'All three are 3 × 4. The same X, seen through three different "lenses" (W).' },
    { type: 'h3', text: 'Matrix multiply by hand: see every cell yourself' },
    { type: 'p', html: `Below, every cell of X·W is a button. Pick Q, K or V, then press any cell of the result: the <strong>row</strong> of X and the <strong>column</strong> of W that meet there light up, and the full multiply-and-add is written out. Default: cell (video, 1) of Q.` },
    { type: 'custom', render(el) {
      const T = ['xyz', 'on', 'video'];
      const X = [[2, 0, 1, 0], [1, 0, 2, 0], [0, 2, 0, 1]];
      const W = { Q: [[0, 0, 0, 1], [0, 1, 0, 0], [1, 1, 0, 0], [0, 1, 1, 0]], K: [[1, 1, 0, 0], [0, 0, 1, 1], [1, 0, 1, 0], [1, 1, 0, 0]], V: [[1, 0, 1, 0], [0, 1, 0, 1], [0, 0, 1, 0], [1, 0, 0, 0]] };
      let m = 'Q', si = 2, sj = 1;
      const c = (v, on) => `<div style="min-width:30px;padding:4px 6px;text-align:center;border-radius:4px;font:13px var(--f-mono);background:${on ? 'var(--accent-soft)' : 'var(--surface-2)'};color:${on ? 'var(--accent-ink)' : 'var(--ink)'}">${v}</div>`;
      const lab = s => `<div style="font:12px var(--f-mono);color:var(--ink-3);align-self:center">${s}</div>`;
      el.innerHTML = `<div class="chips mch" style="display:flex;gap:6px;flex-wrap:wrap"></div>
        <div style="overflow-x:auto;margin-top:10px"><div class="mx" style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start"></div></div>
        <div class="calc-note o-n"></div>`;
      const q = s => el.querySelector(s);
      q('.mch').innerHTML = ['Q', 'K', 'V'].map(k => `<button type="button" class="chip" data-m="${k}">${k} = X·W${k.toLowerCase()}</button>`).join('');
      const draw = () => {
        const M = W[m], R = X.map(r => M[0].map((_, j) => r.reduce((s, v, k) => s + v * M[k][j], 0)));
        q('.mch').querySelectorAll('.chip').forEach(b => b.classList.toggle('on', b.dataset.m === m));
        const gx = `<div><div class="calc-note" style="margin:0 0 4px">X (3 × 4)</div><div style="display:grid;grid-template-columns:44px repeat(4,auto);gap:3px">` + X.map((r, i) => lab(T[i]) + r.map(v => c(v, i === si)).join('')).join('') + '</div></div>';
        const gw = `<div><div class="calc-note" style="margin:0 0 4px">W${m.toLowerCase()} (4 × 4)</div><div style="display:grid;grid-template-columns:repeat(4,auto);gap:3px">` + M.map(r => r.map((v, j) => c(v, j === sj)).join('')).join('') + '</div></div>';
        const gr = `<div><div class="calc-note" style="margin:0 0 4px">${m} (3 × 4): press a cell</div><div style="display:grid;grid-template-columns:44px repeat(4,auto);gap:3px">` + R.map((r, i) => lab(T[i]) + r.map((v, j) => `<button type="button" class="rc" data-i="${i}" data-j="${j}" style="min-width:30px;padding:4px 6px;border-radius:4px;cursor:pointer;font:13px var(--f-mono);border:1px solid ${i === si && j === sj ? 'var(--accent)' : 'var(--line-2)'};background:${i === si && j === sj ? 'var(--accent)' : 'var(--surface)'};color:${i === si && j === sj ? 'var(--surface)' : 'var(--ink)'}">${v}</button>`).join('')).join('') + '</div></div>';
        q('.mx').innerHTML = gx + gw + gr;
        q('.mx').querySelectorAll('.rc').forEach(b => b.addEventListener('click', () => { si = +b.dataset.i; sj = +b.dataset.j; draw(); }));
        const row = X[si], col = M.map(r => r[sj]);
        q('.o-n').innerHTML = `${m}[${T[si]}][${sj}] = row "${T[si]}" of X · column ${sj} of W${m.toLowerCase()} = [${row.join(', ')}] · [${col.join(', ')}] = ${row.map((v, k) => v + '×' + col[k]).join(' + ')} = <strong>${R[si][sj]}</strong><br>The full row "${T[si]}" = [${R[si].join(', ')}]. Shape: (3 × 4)·(4 × 4) = (3 × 4).`;
      };
      q('.mch').querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => { m = b.dataset.m; draw(); }));
      draw();
    }},
    { type: 'p', html: `Default cell: Q[video][1] = [0, 2, 0, 1]·[0, 1, 1, 1] = 0 + 2 + 0 + 1 = 3. The full row Q[video] = [0, 3, 1, 0], the same as in the table above. Press a few cells of K and V too, and match them with the table.` },

    { type: 'h2', text: 'Step 3: scores = Q · Kᵀ' },
    { type: 'p', html: `The dot product of every token's query with every token's key. The row of "video", by hand:` },
    { type: 'list', items: [
      `q<sub>video</sub>·k<sub>xyz</sub> = [0,3,1,0]·[3,2,1,0] = 0 + 6 + 1 + 0 = <strong>7</strong>`,
      `q<sub>video</sub>·k<sub>on</sub> = [0,3,1,0]·[3,1,2,0] = 0 + 3 + 2 + 0 = <strong>5</strong>`,
      `q<sub>video</sub>·k<sub>video</sub> = [0,3,1,0]·[1,1,2,2] = 0 + 3 + 2 + 0 = <strong>5</strong>`,
    ]},
    { type: 'table', head: ['Query ↓ / Key →', 'xyz', 'on', 'video'], rows: [
      ['xyz', '5', '4', '6'],
      ['on', '10', '8', '6'],
      ['video', '7', '5', '5'],
    ], caption: 'The scores matrix (3 × 3). Row = who is looking, column = whom it looks at. It is not symmetric: on→xyz = 10, but xyz→on = 4.' },

    { type: 'callout', tone: 'term', title: 'New word: softmax (and e<sup>x</sup>)', html: `<strong>What it is:</strong> a method that turns any list of numbers into <strong>percentages</strong>: all between 0 and 1, adding up to 1. Steps: take <code>e<sup>x</sup></code> of each number, then divide each one by the total. <code>e</code> is a fixed number ≈ 2.718; <code>e<sup>x</sup></code> is always positive and grows very fast as x grows (e<sup>1</sup> ≈ 2.72, e<sup>2</sup> ≈ 7.39, e<sup>3</sup> ≈ 20.09).<br><strong>Example:</strong> [1, 2] → e<sup>1</sup> = 2.72, e<sup>2</sup> = 7.39, total 10.11 → [0.27, 0.73].<br><strong>Why we need it:</strong> scores can be negative, and their total can be anything. A weighted average needs positive weights that add up to 1. Bigger score = bigger share.<br><strong>Without it:</strong> scores cannot be used directly as weights (what would a negative weight mean?). (We also saw it in the <a href="#/ai-what-is-llm">LLM lesson</a>.)` },
    { type: 'h2', text: 'Step 4: divide by √d_k' },
    { type: 'p', html: `d_k = 4, so √4 = 2. Divide every score by 2: <code>[[2.5, 2, 3], [5, 4, 3], [3.5, 2.5, 2.5]]</code>. Why? We will show it with a widget soon. In short: when d_k is big, dot products get big, and softmax becomes "winner takes all".` },

    { type: 'h2', text: 'Step 5: softmax, each row separately' },
    { type: 'p', html: `<strong>Softmax</strong> (seen in the <a href="#/ai-what-is-llm">LLM lesson</a>) turns numbers into percentages: take e<sup>x</sup> of each number, then divide by the total. The "video" row [3.5, 2.5, 2.5]:` },
    { type: 'list', items: [
      `e<sup>3.5</sup> = 33.12, e<sup>2.5</sup> = 12.18, e<sup>2.5</sup> = 12.18. Total = 57.48`,
      `Weights = 33.12/57.48, 12.18/57.48, 12.18/57.48 = <strong>0.5761, 0.2119, 0.2119</strong>`,
    ]},
    { type: 'table', head: ['Token', '→ xyz', '→ on', '→ video'], rows: [
      ['xyz', '0.3072', '0.1863', '0.5065'],
      ['on', '0.6652', '0.2447', '0.0900'],
      ['video', '0.5761', '0.2119', '0.2119'],
    ], caption: 'Attention weights. Each row adds up to 1. "video" puts 57.6% of its attention on "xyz": "whose video? xyz\'s".' },

    { type: 'h2', text: 'Step 6: weights × V' },
    { type: 'p', html: `Each token's new vector = a mix of the V rows, using the weights. For "video":` },
    { type: 'code', text: `0.5761 × [2, 0, 3, 0]    (V of xyz)
+ 0.2119 × [1, 0, 3, 0]    (V of on)
+ 0.2119 × [1, 2, 0, 2]    (V of video)
= [1.58, 0.42, 2.36, 0.42]` },
    { type: 'table', head: ['Token', 'Output (2 decimals)'], rows: [
      ['xyz', '[1.31, 1.01, 1.48, 1.01]'],
      ['on', '[1.67, 0.18, 2.73, 0.18]'],
      ['video', '[1.58, 0.42, 2.36, 0.42]'],
    ], caption: 'Output (3 × 4): the same shape as the input. The vector of "video" now holds a big share of xyz\'s information. (If you do it by hand with the rounded weights, the last decimal may differ by ±0.01.)' },
    { type: 'callout', tone: 'term', title: 'The whole formula in one line', html: `<code>Attention(Q, K, V) = softmax( Q·Kᵀ / √d_k ) · V</code><br>Shapes: (3 × 4)·(4 × 3) = (3 × 3) scores → softmax (3 × 3) → ·(3 × 4) = (3 × 4). This is the "scaled dot-product attention" of the 2017 paper.` },
    { type: 'image', src: 'assets/img/ai-attention/attention-head.png', maxWidth: 640, alt: 'A diagram of one attention head: three inputs pass through separate W^Q, W^K and W^V matrices to become query, key and value, which go into a "Scaled (masked) Dot-Product Attention" box; on the right, the whole set is shown as one "Attention Head" box.', caption: 'A diagram from Wikimedia Commons, telling the same story: the input passes through three matrices (W<sup>Q</sup>, W<sup>K</sup>, W<sup>V</sup>) to become Q, K, V, then scaled (masked) dot-product attention. Symbols: ℓ<sub>seq</sub> = the number of tokens (our n = 3), d = the length of a vector (our 4). In self-attention all three inputs are the same X; in cross-attention the query comes from a different sentence.', credit: { text: 'Cosmia Nebula, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Transformer_architecture_-_Attention_Head_module.png', license: 'CC BY-SA 4.0' } },
    { type: 'h2', text: 'Playground: change it, see it' },
    { type: 'p', html: `Pick a token, and its full calculation appears with numbers. Change any number in X: Q, K, V, the scores, the weights and the output are all rebuilt at once. Turn scaling and the causal mask on and off to see the difference.` },
    { type: 'custom', render(el) {
      const T = ['xyz', 'on', 'video'];
      const X0 = [[2, 0, 1, 0], [1, 0, 2, 0], [0, 2, 0, 1]];
      const Wq = [[0, 0, 0, 1], [0, 1, 0, 0], [1, 1, 0, 0], [0, 1, 1, 0]];
      const Wk = [[1, 1, 0, 0], [0, 0, 1, 1], [1, 0, 1, 0], [1, 1, 0, 0]];
      const Wv = [[1, 0, 1, 0], [0, 1, 0, 1], [0, 0, 1, 0], [1, 0, 0, 0]];
      let X = X0.map(r => r.slice()), sel = 2, scale = true, mask = false;
      const mm = (A, B) => A.map(r => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
      const n2 = v => (Math.round(v * 100) / 100).toString();
      const cell = (v, hi) => `<div style="padding:4px 6px;text-align:center;border-radius:4px;font:13px var(--f-mono);background:${hi ? 'var(--accent-soft)' : 'var(--surface-2)'};color:${hi ? 'var(--accent-ink)' : 'var(--ink)'}">${v}</div>`;
      const grid = (name, M, hiRow) => `<div style="min-width:150px"><div style="font:600 13px var(--f-body);color:var(--ink-2);margin-bottom:4px">${name}</div><div style="display:grid;grid-template-columns:44px repeat(${M[0].length},1fr);gap:3px">` +
        M.map((r, i) => `<div style="font:12px var(--f-mono);color:var(--ink-3);align-self:center">${T[i]}</div>` + r.map(v => cell(n2(v), i === hiRow)).join('')).join('') + '</div></div>';
      el.innerHTML = `<div class="chips tch" style="display:flex;gap:6px;flex-wrap:wrap"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0"><button type="button" class="btn small ghost b-sc"></button><button type="button" class="btn small ghost b-mk"></button><button type="button" class="btn small ghost b-rs">Reset X</button></div>
        <div style="overflow-x:auto"><div class="xin" style="display:grid;grid-template-columns:52px repeat(4,56px);gap:4px;width:max-content"></div></div>
        <div class="mats" style="display:flex;flex-wrap:wrap;gap:14px;margin-top:14px;overflow-x:auto"></div>
        <div class="steps-o" style="margin-top:14px"></div>`;
      const q = c => el.querySelector(c);
      q('.tch').innerHTML = T.map((t, i) => `<button type="button" class="chip" data-i="${i}">${t}</button>`).join('');
      let xh = '<div></div>' + [0, 1, 2, 3].map(j => `<div style="font:12px var(--f-mono);color:var(--ink-3);text-align:center">X d${j}</div>`).join('');
      for (let i = 0; i < 3; i++) { xh += `<div style="font:12px var(--f-mono);color:var(--ink-3);align-self:center">${T[i]}</div>`; for (let j = 0; j < 4; j++) xh += `<input class="xi" data-i="${i}" data-j="${j}" type="number" step="1" min="-5" max="5" value="${X[i][j]}" style="width:56px">`; }
      q('.xin').innerHTML = xh;
      const draw = () => {
        q('.tch').querySelectorAll('.chip').forEach(b => b.classList.toggle('on', Number(b.dataset.i) === sel));
        q('.b-sc').textContent = 'Scaling ÷√d_k: ' + (scale ? 'ON' : 'OFF');
        q('.b-mk').textContent = 'Causal mask: ' + (mask ? 'ON' : 'OFF');
        const Q = mm(X, Wq), K = mm(X, Wk), V = mm(X, Wv);
        const raw = K.map(k => k.reduce((s, v, i) => s + v * Q[sel][i], 0));
        const sc = raw.map((v, j) => (mask && j > sel) ? -Infinity : (scale ? v / 2 : v));
        const m = Math.max(...sc), e = sc.map(v => v === -Infinity ? 0 : Math.exp(v - m)), z = e.reduce((a, b) => a + b);
        const w = e.map(v => v / z), out = [0, 1, 2, 3].map(c => w.reduce((s, wt, j) => s + wt * V[j][c], 0));
        q('.mats').innerHTML = grid('Q = X·Wq', Q, sel) + grid('K = X·Wk', K, -1) + grid('V = X·Wv', V, -1);
        const t = T[sel];
        const dots = T.map((u, j) => `q<sub>${t}</sub>·k<sub>${u}</sub> = [${Q[sel].join(',')}]·[${K[j].join(',')}] = <strong>${raw[j]}</strong>${mask && j > sel ? ' → <span style="color:var(--red)">masked (−∞)</span>' : ''}`).join('<br>');
        const bars = T.map((u, j) => `<div style="display:flex;align-items:center;gap:8px;margin:3px 0"><span style="width:44px;font:12px var(--f-mono);color:var(--ink-3)">${u}</span><div style="flex:1;max-width:260px;height:14px;background:var(--surface-2);border-radius:4px"><div style="width:${(w[j] * 100).toFixed(1)}%;height:100%;background:var(--accent);border-radius:4px"></div></div><span style="font:13px var(--f-mono)">${w[j].toFixed(4)}</span></div>`).join('');
        q('.steps-o').innerHTML = `<div class="calc-note"><strong>1. Scores</strong> (the query of token "${t}", against every key):<br>${dots}</div>
          <div class="calc-note"><strong>2. ${scale ? '÷ √4 = 2' : 'Scaling OFF'}</strong>: [${sc.map(v => v === -Infinity ? '−∞' : n2(v)).join(', ')}]</div>
          <div class="calc-note"><strong>3. Softmax</strong> (e<sup>x</sup> ÷ total):</div>${bars}
          <div class="calc-note"><strong>4. Output</strong> = ${T.map((u, j) => w[j].toFixed(4) + '×V<sub>' + u + '</sub>').join(' + ')} = <strong>[${out.map(n2).join(', ')}]</strong></div>`;
      };
      q('.tch').querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => { sel = Number(b.dataset.i); draw(); }));
      q('.xin').querySelectorAll('.xi').forEach(inp => inp.addEventListener('input', () => { X[Number(inp.dataset.i)][Number(inp.dataset.j)] = Number(inp.value) || 0; draw(); }));
      q('.b-sc').addEventListener('click', () => { scale = !scale; draw(); });
      q('.b-mk').addEventListener('click', () => { mask = !mask; draw(); });
      q('.b-rs').addEventListener('click', () => { X = X0.map(r => r.slice()); q('.xin').querySelectorAll('.xi').forEach(inp => { inp.value = X[Number(inp.dataset.i)][Number(inp.dataset.j)]; }); draw(); });
      draw();
    }},
    { type: 'p', html: `A few experiments: (1) Pick "video" and turn scaling OFF: the weights go from [0.5761, 0.2119, 0.2119] to [0.7870, 0.1065, 0.1065], more "sharp". (2) In X, change video's d1 from 2 to 0: the query, key and value of "video" all change; now the scores are [3, 3, 1], and the attention is split equally between xyz and on (0.4223 each), with only 0.1554 on video. (3) Turn the causal mask ON and pick "on": it cannot see "video" at all.` },
    { type: 'h2', text: 'Why √d_k? An experiment' },
    { type: 'callout', tone: 'term', title: 'New word: spread (variance and std)', html: `<strong>What it is:</strong> how far numbers are scattered from their average. <strong>Std</strong> (standard deviation) = the "typical distance" from the average. <strong>Variance</strong> = the square of the std.<br><strong>Example:</strong> [9, 10, 11] has average 10, and each number is 1 away: std ≈ 0.82. [0, 10, 20] also has average 10, but std ≈ 8.16: much more scattered.<br><strong>Why here:</strong> the more scattered the scores (big std), the more softmax makes "one single winner".<br><strong>Without it:</strong> the reason for √d_k will not make sense.` },
    { type: 'p', html: `Real models have d_k = 64 or 128. If the numbers in Q and K are random-ish (average 0, spread 1), their dot product is a sum of d_k numbers, and the spread of a sum grows: <strong>variance = d_k</strong>, so the typical size ≈ √d_k. This is the argument of the 2017 paper. When big scores go into softmax, one token takes ~100% and the others ~0%. In that state the <strong>gradients</strong> of softmax (the training signal "which way to improve") become almost zero, and the model stops learning.` },
    { type: 'callout', tone: 'term', title: 'New word: gradient', html: `<strong>What it is:</strong> in training, the model asks for every weight: "if I raise or lower this a little, will the mistake get smaller?" This answer (direction + how much) is called the <strong>gradient</strong>.<br><strong>Why we need it:</strong> weights improve using this signal; this is what "learning" is.<br><strong>Without it (gradient ~0):</strong> if the output does not move at all for a small change in a weight (like a <strong>saturated</strong> softmax, where one token has already taken ~100%), the gradient is ~0, and that weight cannot learn.` },
    { type: 'p', html: `The simulation below: a random (seeded, the same every time) query and 8 keys, 40 times. Change d_k and watch.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div><label>d_k: <strong class="v-d">64</strong></label><input class="i-d" type="range" min="0" max="4" step="1" value="2"></div>
        <div class="stats">
          <div class="stat"><span>Spread of raw scores (std)</span><strong class="o-sd"></strong></div>
          <div class="stat"><span>√d_k</span><strong class="o-sq"></strong></div>
          <div class="stat"><span>Avg top weight, no scaling</span><strong class="o-un"></strong></div>
          <div class="stat"><span>Avg top weight, with ÷√d_k</span><strong class="o-sc"></strong></div>
        </div>
        <div class="calc-note">If attention were shared equally among 8 keys, each would get 0.125. A top weight near 1.00 = one token took everything (saturated).</div>`;
      const q = c => el.querySelector(c), D = [4, 16, 64, 256, 1024];
      const sim = dk => {
        let s = 42; const u = () => { s = s * 16807 % 2147483647; return s / 2147483647; };
        const g = () => { const a = u(), b = u(); return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b); };
        const sm = r => { const m = Math.max(...r), e = r.map(v => Math.exp(v - m)), z = e.reduce((a, b) => a + b); return e.map(v => v / z); };
        const all = []; let mu = 0, ms = 0;
        for (let t = 0; t < 40; t++) {
          const qv = Array.from({ length: dk }, g);
          const r = Array.from({ length: 8 }, () => Array.from({ length: dk }, g).reduce((a, v, i) => a + v * qv[i], 0));
          all.push(...r); mu += Math.max(...sm(r)); ms += Math.max(...sm(r.map(v => v / Math.sqrt(dk))));
        }
        const m = all.reduce((a, b) => a + b) / all.length;
        return { sd: Math.sqrt(all.reduce((a, v) => a + (v - m) ** 2, 0) / all.length), un: mu / 40, sc: ms / 40 };
      };
      const upd = () => {
        const dk = D[Number(q('.i-d').value)], r = sim(dk);
        q('.v-d').textContent = dk; q('.o-sd').textContent = r.sd.toFixed(2); q('.o-sq').textContent = Math.sqrt(dk).toFixed(2);
        q('.o-un').textContent = r.un.toFixed(2); q('.o-sc').textContent = r.sc.toFixed(2);
      };
      q('.i-d').addEventListener('input', upd); upd();
    }},
    { type: 'p', html: `Results: at d_k = 4 the spread is 1.94 (√4 = 2) and the top weight without scaling is 0.49. At d_k = 64 the spread is 7.40 (√64 = 8) and the top weight 0.91. At d_k = 1024 it is 0.98: almost one-hot. With scaling, the top weight stays between 0.33 and 0.39 for every d_k: softmax stays "soft" and training keeps going.` },

    { type: 'h2', text: 'Causal mask: do not look at the future' },
    { type: 'p', html: `The job of a decoder (like GPT) is to guess the next token. In training the whole sentence goes in at once (we saw this in the <a href="#/ai-transformer-overview">overview</a>). If the position of "on" could see "video", it would not guess the next token; it would just copy it. Great scores in training, useless in real generation, because then the future does not exist yet.` },
    { type: 'callout', tone: 'term', title: 'New word: causal mask', html: `<strong>What it is:</strong> in the scores matrix, every cell where the key's token comes <em>after</em> the query's token is set to <strong>−∞</strong> (minus infinity, "the smallest possible number") before softmax. e<sup>−∞</sup> = 0, so that token's weight is exactly 0. "Causal" because each token depends only on its "past" (and itself).<br><strong>Why we need it:</strong> so a model learning to guess the next token cannot see the token ahead and "copy" it.<br><strong>Without it:</strong> a great loss in training, garbage in real generation (see the failure scenario in the flow below).` },
    { type: 'code', text: `Scaled scores           Apply the mask          Softmax (row-wise)
[2.5   2    3  ]        [2.5   −∞   −∞ ]        [1.0000  0       0     ]   xyz: only itself
[5     4    3  ]   →    [5     4    −∞ ]   →    [0.7311  0.2689  0     ]   on: xyz + itself
[3.5   2.5  2.5]        [3.5   2.5  2.5]        [0.5761  0.2119  0.2119]   video: everyone` },
    { type: 'p', html: `Masked outputs: xyz = [2, 0, 3, 0] (only its own V), on = [1.73, 0, 3, 0], video = [1.58, 0.42, 2.36, 0.42] (the last token could already see everyone, so it is the same). Check it in the playground with the mask ON. An encoder (BERT) has no such mask: there, each token looks both ways.` },
    { type: 'callout', tone: 'mistake', title: '"Masking means setting the weight to 0 after softmax"', html: `If you set it to 0 <em>after</em> softmax, the row will not add up to 1 (the row of on would be left with 0.6652 + 0.2447 = 0.91). So the mask is applied <strong>before</strong> softmax, by setting the score to −∞; softmax itself then rescales the other weights to add up to 1 again (0.7311 + 0.2689 = 1).` },
    { type: 'h2', text: 'Diagram: inside the attention layer' },
    { type: 'flow', height: 290,
      nodes: [
        { id: 'x', label: 'X (input)', sub: '3 × 4', x: 100, y: 70, w: 150, kind: 'client', info: 'What it is: the input of the attention layer. Each token\'s vector (embedding + position, or the previous layer\'s output). In our example, 3 tokens × 4 numbers.' },
        { id: 'qkv', label: 'Q, K, V', sub: 'X·Wq, X·Wk, X·Wv', x: 350, y: 70, w: 170, kind: 'server', info: 'What it is: looking at X through three different "lenses". Three projections made with three learned matrices. Q = what I am looking for, K = what I have, V = what I will give. Each is 3 × 4.' },
        { id: 'sc', label: 'Scores', sub: 'Q·Kᵀ / √d_k', x: 600, y: 70, w: 150, kind: 'cache', info: 'What it is: the table of "who looks at whom, and how much". The dot product of every query with every key, then divided by √d_k. Shape n × n (here 3 × 3). Long context = a very big matrix.' },
        { id: 'sm', label: 'Mask+Softmax', sub: 'each row = 1', x: 600, y: 220, w: 150, kind: 'queue', info: 'What it is: the step that turns scores into weights (percentages). In a decoder, future cells become −∞ (causal mask). Then softmax row by row: scores → weights, each row adds up to 1.' },
        { id: 'wv', label: 'Weights × V', sub: 'weighted mix', x: 350, y: 220, w: 170, kind: 'server', info: 'What it is: the step that mixes information. Each token\'s new vector = a weighted average of all tokens\' V. The shape goes back to 3 × 4.' },
        { id: 'out', label: 'Output', sub: 'context-aware', x: 100, y: 220, w: 150, kind: 'data', info: 'What it is: the result of attention. A new, context-aware vector for each token. After this come the residual (X + output), LayerNorm, then the FFN. In multi-head attention, many such outputs are joined and passed through Wo.' },
      ],
      edges: [{ a: 'x', b: 'qkv' }, { a: 'qkv', b: 'sc' }, { a: 'sc', b: 'sm' }, { a: 'sm', b: 'wv' }, { a: 'qkv', b: 'wv', dashed: true, id: 'vpath' }, { a: 'wv', b: 'out' }],
      scenarios: [
        { name: '"video" (happy path)', steps: [
          { title: 'Input', text: 'The vectors of the 3 tokens arrive.', focus: ['x'], msg: 'X[video] = [0, 2, 0, 1]' },
          { title: 'Projections', text: 'Q, K, V from the three matrices.', go: 'x>qkv', after: { qkv: { state: 'ok' } }, msg: 'Q[video] = [0,3,1,0]   K[xyz] = [3,2,1,0]   V[xyz] = [2,0,3,0]' },
          { title: 'Scores', text: 'The query of "video" against all keys: 7, 5, 5. Divide by √4 = 2.', go: 'qkv>sc', after: { sc: { state: 'ok', sub: '[3.5, 2.5, 2.5]' } }, msg: '[7, 5, 5] / 2 = [3.5, 2.5, 2.5]' },
          { title: 'Softmax', text: '57.6% of the attention goes to xyz.', go: 'sc>sm', after: { sm: { state: 'ok', sub: '[.58 .21 .21]' } }, msg: 'softmax → [0.5761, 0.2119, 0.2119]' },
          { title: 'Mix of V', text: 'A weighted sum of the V rows. V comes straight from the Q/K/V box (dashed line).', go: ['sm>wv', 'qkv>wv'], parallel: true, after: { wv: { state: 'ok' } }, msg: '0.5761·[2,0,3,0] + 0.2119·[1,0,3,0] + 0.2119·[1,2,0,2]' },
          { title: 'A new "video"', text: 'Now the vector of "video" holds xyz\'s information. From static to contextual.', go: 'wv>out', after: { out: { state: 'hit', sub: '[1.58 .42 2.36 .42]' } } },
        ]},
        { name: 'Failure: no scaling', intro: 'A big model, d_k = 64, and someone removed the √d_k divide.', steps: [
          { title: 'Big scores', text: 'The spread of the dot products is ~8 (√64). Scores like [24, 9, −6, ...].', go: 'x>qkv>sc', set: { sc: { state: 'warn', sub: 'no ÷√d_k' } } },
          { title: 'Softmax saturated', text: 'One token ~100%, the rest ~0. In the experiment widget, at d_k = 64 the average top weight was 0.91.', go: 'sc>sm', after: { sm: { state: 'hot', sub: 'one-hot' } } },
          { title: 'Training gets stuck', text: 'A saturated softmax has gradients of ~0. The loss falls slowly or gets stuck. Fix: put ÷√d_k back.', focus: ['sm'], after: { wv: { state: 'warn', sub: 'not learning' } } },
        ]},
        { name: 'Failure: mask forgotten', intro: 'A decoder is being trained, but the causal mask is missing from the code.', steps: [
          { title: 'The future is visible', text: 'The position of "on", whose target is "video", can see the key of "video".', go: 'x>qkv>sc>sm', set: { sm: { state: 'warn', sub: 'no mask' } } },
          { title: 'Cheating', text: 'The model learns "copy the next token". The training loss looks falsely very low.', go: 'sm>wv>out', after: { out: { state: 'hit', sub: 'loss very low?!' } } },
          { title: 'Fails in generation', text: 'In real use the future token does not exist. The trick it learned does not work: the output is garbage. Fix: a −∞ mask before softmax.', set: { out: { state: 'down', sub: 'garbage output' } }, focus: ['out'] },
        ]},
        { name: 'Failure: context too long', steps: [
          { title: 'A hundred thousand tokens', text: 'xyz Assistant stuffed all the help docs into the prompt: n = 100,000.', go: 'x>qkv>sc', set: { x: { sub: 'n = 100,000' } } },
          { title: 'n × n blows up', text: 'The scores matrix has 10<sup>10</sup> cells, for every head, in every layer. At 2 bytes per number that is ~20 GB for just one matrix.', set: { sc: { state: 'down', sub: '10¹⁰ cells' } }, focus: ['sc'] },
          { title: 'Fix', text: 'Engineering: kernels (special, fast programs that run on the GPU) like FlashAttention compute in tiles without keeping the whole matrix in memory (memory is saved, but compute is still n²). App side: send only the relevant chunks (RAG).', set: { sc: { state: 'ok', sub: 'tiled' }, x: { sub: 'trimmed' } }, go: 'sc>sm>wv>out' },
        ]},
      ],
    },
    { type: 'h2', text: 'The cost: the n² sum' },
    { type: 'table', head: ['Context n (tokens)', 'Scores per head per layer (n²)', 'One matrix, 2 bytes per number'], rows: [
      ['1,000', '1 million (10⁶)', '2 MB'],
      ['8,000', '64 million (6.4 × 10⁷)', '128 MB'],
      ['100,000', '10 billion (10¹⁰)', '20 GB'],
    ], caption: 'Context 8 times bigger (1,000 → 8,000) = 64 times more scores. This is why long context is expensive, and why memory-efficient kernels like FlashAttention (a 2022 paper) are needed.' },
    { type: 'p', html: `The 2022 FlashAttention paper showed that exact attention can be computed in small pieces (tiles), without keeping the whole n × n matrix in GPU memory: it saves a lot of memory, but the compute is still n². There is one more trick during generation: the K and V of earlier tokens are not rebuilt at every step; they are kept in memory (the <strong>KV cache</strong>). Details in the <a href="#/ai-multihead">multi-head lesson</a>.` },

    { type: 'h2', text: 'Self, masked and cross attention' },
    { type: 'callout', tone: 'term', title: 'New word: cross-attention', html: `<strong>What it is:</strong> the same formula, but Q comes from one sentence and K, V from <em>another</em>. For example, in translation the query comes from the decoder (writing the Hindi) and the keys and values come from the encoder (which has read the English).<br><strong>Why we need it:</strong> while writing the output, the model must look at the input.<br><strong>Without it:</strong> the decoder would know nothing about the input sentence. Details: <a href="#/ai-multihead">multi-head lesson</a>.` },
    { type: 'table', head: ['Type', 'Q comes from', 'K, V come from', 'Mask', 'Where'], rows: [
      ['Self-attention (encoder)', 'The same sentence', 'The same sentence', 'No (look both ways)', 'BERT, encoders'],
      ['Masked self-attention', 'The same sentence', 'The same sentence', 'Causal', 'Decoder-only LLMs like GPT'],
      ['Cross-attention', 'The decoder (writing the output)', 'The encoder\'s output (the input sentence)', 'No', 'Translation models, T5'],
    ]},
    { type: 'callout', tone: 'tip', title: 'Decide', html: `• The model only needs to <strong>understand</strong> (classify, embed) → self-attention without a mask (encoder): each token gets context from both sides.<br>• The model needs to <strong>generate</strong> → causal (masked) self-attention, or training will cheat.<br>• The output must look at a <strong>separate input</strong> (a sentence in another language, image features) → cross-attention.<br>• Context very long and expensive → first make the input smaller (relevant chunks, RAG), then use efficient kernels. Do not ignore n².` },
    { type: 'callout', tone: 'mistake', title: '"Q, K, V are three different inputs"', html: `In self-attention all three come from <strong>the same X</strong>, only through different W matrices. There are three different W because "what am I looking for" (Q), "what do I offer" (K) and "what will I give" (V) can be different things. If Q = K, each token's score with itself, q·q, would always be positive and often the biggest: the token would mostly keep looking at itself.` },
    { type: 'callout', tone: 'mistake', title: '"Attention weights = the model\'s reason"', html: `The weights tell which token's information was used more, but they are not a full "explanation". In big models many heads and layers work together, and the residual and FFN also change the output. Research has shown that judging a model's decision only from attention weights is often wrong. Use them as a debugging hint, not as proof.` },
    { type: 'callout', tone: 'mistake', title: '"We wrote the W matrices"', html: `In this lesson, yes, to explain. In a real model, Wq, Wk, Wv start as random numbers, and training (next-token prediction on billions of tokens) slowly shapes them to catch useful patterns. No person writes "video should pay attention to xyz".` },

    { type: 'callout', tone: 'tip', title: 'A little history, and a warning', html: `The idea of attention was given in 2014 by Bahdanau, Cho and Bengio for translation; back then it was an add-on on top of an RNN. The 2017 Transformer removed the RNN and built the whole model on attention alone. If you like pictures, read Jay Alammar's 2018 post "The Illustrated Transformer". And a warning: the 2019 paper "Attention is not Explanation" showed that treating attention weights directly as proof of "why the model gave this answer" can be wrong. The weights tell who mixed in how much, not the full reason.` },
    { type: 'h2', text: 'The whole picture' },
    { type: 'p', html: `The full path of one attention head, with our tiny numbers. Use the buttons to highlight one part at a time.` },
    { type: 'diagram', title: 'Self-attention: the whole picture', height: 580,
      nodes: [
        { id: 'x', label: 'X (input)', sub: '3 × 4', x: 80, y: 250, w: 120, kind: 'client', info: 'What it is: each token\'s vector, one row per token: xyz [2,0,1,0], on [1,0,2,0], video [0,2,0,1]. Embedding + position, or the previous layer\'s output.' },
        { id: 'wq', label: 'Wq', sub: '4 × 4', x: 225, y: 110, w: 110, kind: 'data', info: 'What it is: the matrix that makes queries. It is learned in training and is the same for all tokens.' },
        { id: 'wk', label: 'Wk', sub: '4 × 4', x: 225, y: 250, w: 110, kind: 'data', info: 'What it is: the matrix that makes keys. It is different from Wq, so "searching" and "being found" can be learned separately.' },
        { id: 'wv', label: 'Wv', sub: '4 × 4', x: 225, y: 390, w: 110, kind: 'data', info: 'What it is: the matrix that makes values: which information a picked token passes on.' },
        { id: 'q', label: 'Q = X·Wq', sub: 'what I need', x: 370, y: 110, w: 120, kind: 'server', info: 'What it is: each token\'s query, 3 × 4. Q[video] = [0, 3, 1, 0].' },
        { id: 'k', label: 'K = X·Wk', sub: 'what I have', x: 370, y: 250, w: 120, kind: 'server', info: 'What it is: each token\'s key, 3 × 4. K[xyz] = [3, 2, 1, 0].' },
        { id: 'v', label: 'V = X·Wv', sub: 'what I give', x: 370, y: 390, w: 120, kind: 'server', info: 'What it is: each token\'s value, 3 × 4. V[xyz] = [2, 0, 3, 0].' },
        { id: 'sc', label: 'Scores', sub: 'Q·Kᵀ ÷ √d_k', x: 560, y: 110, w: 170, kind: 'cache', info: 'What it is: the dot product of every query with every key, ÷ √4 = 2. Shape 3 × 3. The "video" row: [7, 5, 5] → [3.5, 2.5, 2.5].' },
        { id: 'mk', label: 'Causal mask', sub: 'future = −∞', x: 560, y: 220, w: 170, kind: 'threat', info: 'What it is: in a decoder (GPT), the scores of tokens ahead become −∞, so no token sees the future. An encoder (BERT) has no such step.' },
        { id: 'sm', label: 'Softmax', sub: 'each row adds to 1', x: 560, y: 330, w: 170, kind: 'queue', info: 'What it is: turning the scores of each row into weights: e^x ÷ total. "video": [0.5761, 0.2119, 0.2119].' },
        { id: 'out', label: 'Weights · V', sub: 'weighted mix', x: 560, y: 450, w: 170, kind: 'server', info: 'What it is: each token\'s new vector = a mix of the V rows using the weights. "video" = [1.58, 0.42, 2.36, 0.42].' },
        { id: 'nx', label: 'Output', sub: '→ Add & Norm, FFN', x: 300, y: 530, w: 170, kind: 'data', info: 'What it is: the result of attention (3 × 4, the same shape as the input). After it come the residual (X + output), LayerNorm and the FFN. In multi-head attention, the outputs of many heads are joined and passed through Wo.' },
      ],
      edges: [
        { a: 'x', b: 'wq' },
        { a: 'x', b: 'wk' },
        { a: 'x', b: 'wv' },
        { a: 'wq', b: 'q' },
        { a: 'wk', b: 'k' },
        { a: 'wv', b: 'v' },
        { a: 'q', b: 'sc', label: 'Q' },
        { a: 'k', b: 'sc', label: 'Kᵀ' },
        { a: 'sc', b: 'mk', n: 1 },
        { a: 'mk', b: 'sm', n: 2 },
        { a: 'sc', b: 'sm', dashed: true, label: 'no mask', via: [[680, 110], [680, 330]] },
        { a: 'sm', b: 'out', n: 3 },
        { a: 'v', b: 'out', label: 'V' },
        { a: 'out', b: 'nx', n: 4 },
      ],
      paths: [
        { name: 'Make Q,K,V', text: 'The same X, multiplied by three different learned matrices: Q = X·Wq, K = X·Wk, V = X·Wv. Each one is 3 × 4.', go: ['x>wq>q', 'x>wk>k', 'x>wv>v'] },
        { name: 'Scores + softmax', text: 'The dot product of every query with every key (Q·Kᵀ), ÷ √d_k, then softmax on each row. An encoder has no mask (the dashed path).', go: ['q>sc', 'k>sc', 'sc>sm'] },
        { name: 'Weighted sum', text: 'A mix of the V rows using the weights: "video" = 0.5761·V[xyz] + 0.2119·V[on] + 0.2119·V[video] = [1.58, 0.42, 2.36, 0.42]. Then Add & Norm and the FFN.', go: ['sm>out>nx', 'v>out'] },
        { name: 'Causal mask', text: 'In a decoder, future scores become −∞ before softmax. The row of "on" [5, 4, −∞] → [0.7311, 0.2689, 0]. Setting 0 after softmax is wrong.', go: ['q>sc', 'k>sc', 'sc>mk>sm>out'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Attention(Q, K, V) = softmax(Q·Kᵀ / √d_k) · V. Shapes: (3 × 4) → scores (3 × 3) → output (3 × 4).</li>
      <li>Q, K, V all come from the same X, through three different learned matrices: Q = X·Wq, K = X·Wk, V = X·Wv.</li>
      <li>Matrix multiply = every cell is one dot product (row · column). A bigger dot product = a better match.</li>
      <li>Softmax turns scores into weights (positive, adding to 1); the output = a weighted average of V using those weights.</li>
      <li>Divide by √d_k, or with a big d_k the softmax saturates and the gradients become ~0.</li>
      <li>Causal mask: future scores become −∞ <em>before</em> softmax. Needed in a decoder, not in an encoder.</li>
      <li>The cost: n × n scores. Context 8 times bigger = 64 times more scores. FlashAttention saves memory; RAG makes the input smaller.</li>
    </ul>` },
    { type: 'tradeoffs', gains: [
      'Every token gets the context of the whole sentence in one step (path length 1)',
      'The weights change with the input: a different "attention" for every sentence',
      'All the work is matrix multiplication: parallel and fast on a GPU',
      'The same mechanism gives the encoder, the decoder and cross-attention',
    ], costs: [
      'n × n scores: memory and compute grow quadratically with context',
      'It does not know order by itself: positional encoding is needed',
      'The mask is required in a decoder; a mistake means silent cheating',
      'Without √d_k scaling the softmax saturates and training can get stuck',
    ]},
    { type: 'think', questions: [
      { q: 'In the scores matrix, on→xyz = 10 but xyz→on = 4. Why is it not symmetric?', a: 'on→xyz = q_pe·k_xyz and xyz→on = q_xyz·k_pe. Q and K are made by different matrices (Wq ≠ Wk), so the two dot products are different. "I need you" and "you need me" do not have to be equal.' },
      { q: 'If all the scores become the same (like [2, 2, 2]), what will the output be?', a: 'Softmax will give equal weights (1/3 each), so the output = the simple average of the three V rows. The token did not pay special attention to anyone: it got context, but not "focused" context.' },
      { q: 'With a causal mask, why is the output of the first token ("xyz") always just its own V?', a: 'There is no token before it, and the ones after it are masked. Only one valid score is left in the softmax, so its weight is 1. Output = V[xyz] = [2, 0, 3, 0].' },
    ]},
    { type: 'quiz', questions: [
      { q: 'In self-attention, where do Q, K, V come from?', options: ['From three different sentences', 'From the same X, multiplied by three different learned matrices (Wq, Wk, Wv)', 'Q from the input, K and V from the output'], answer: 1, explain: 'Q = X·Wq, K = X·Wk, V = X·Wv. The same input, three different projections.' },
      { q: 'In our example, what is the raw score of the query of "video" with the key of "xyz"?', options: ['5', '7', '3.5'], answer: 1, explain: '[0,3,1,0]·[3,2,1,0] = 0 + 6 + 1 + 0 = 7. Dividing by √4 = 2 gives 3.5.' },
      { q: 'Why do we divide by √d_k?', options: ['To make the calculation faster', 'With a big d_k the dot products get big, the softmax saturates, and the gradients become ~0', 'So the output has the right shape'], answer: 1, explain: 'The dot product of random-ish vectors has variance d_k. Dividing by √d_k keeps the spread around 1, so the softmax stays soft.' },
      { q: 'When and how is the causal mask applied?', options: ['After softmax, by setting future weights to 0', 'Before softmax, by setting future scores to −∞', 'By deleting the future rows of the V matrix'], answer: 1, explain: 'e^x of a −∞ score = 0, and softmax rescales the other weights to add up to 1. Setting 0 afterwards leaves a row that does not add up to 1.' },
      { q: 'The context grows from 2,000 to 4,000 tokens. How much bigger does one head\'s scores matrix get?', options: ['2 times', '4 times', 'The same'], answer: 1, explain: 'n × n: (2n)² = 4n². Attention\'s memory and compute grow quadratically with context.' },
    ]},
    { type: 'sources', note: 'We calculated every matrix and number in this lesson (Q, K, V, scores, softmax, outputs, masked outputs, the scaling simulation) with a node script and matched them. The matrices are illustrative, not from a real model.', items: [
      { title: 'Attention Is All You Need', publisher: 'Vaswani et al., Google (arXiv 1706.03762)', year: 2017, official: true, url: 'https://arxiv.org/abs/1706.03762', used: 'The scaled dot-product attention formula, Q/K/V, the variance-d_k argument for 1/√d_k, decoder masking with −∞ before softmax, self vs encoder-decoder attention.' },
      { title: 'FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness', publisher: 'Dao et al., Stanford (arXiv 2205.14135)', year: 2022, official: true, url: 'https://arxiv.org/abs/2205.14135', used: 'Exact attention computed in tiles without keeping the full n × n matrix in GPU memory.' },
      { title: 'Attention is not Explanation', publisher: 'Jain and Wallace, NAACL 2019 (arXiv 1902.10186)', year: 2019, official: true, url: 'https://arxiv.org/abs/1902.10186', used: 'The caution that attention weights are not a faithful explanation of model decisions.' },
      { title: 'Neural Machine Translation by Jointly Learning to Align and Translate', publisher: 'Bahdanau, Cho, Bengio (arXiv 1409.0473)', year: 2014, official: true, url: 'https://arxiv.org/abs/1409.0473', used: 'Attention as a soft, learned weighting, first used alongside RNNs before Transformers.' },
      { title: 'The Illustrated Transformer', publisher: 'Jay Alammar (blog)', year: 2018, url: 'https://jalammar.github.io/illustrated-transformer/', used: 'A cross-check of the order of the step-by-step Q/K/V walkthrough (scores, divide, softmax, multiply by V, sum).' },
      { title: 'Transformers Explained | Simple Explanation of Transformers (video)', publisher: 'codebasics (YouTube)', year: 2025, url: 'https://www.youtube.com/watch?v=ZhAz268Hdpw', used: 'The learner\'s reference video; its attention and contextual-embedding chapters were used as a coverage checklist.' },
    ]},
  ],
});
