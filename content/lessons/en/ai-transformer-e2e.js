/*
  ai-transformer-e2e: one prompt's full journey through a TOY decoder-only Transformer.
  Shared with ai-attention.js: tokens ["xyz","on","video"], Wq, Wk, Wv, and X = embedding + PE.
  The embedding table here is chosen so that E + PE (PE rounded to 2 decimals) gives exactly the
  attention lesson's X. Toy model: vocab 6, d_model 4, 1 layer, 1 head (Wo = identity), d_ff 8,
  Post-LN (gamma 1, beta 0, eps 1e-5), no biases, separate LM head Wout (4 x 6). Weights are
  hand-picked, not trained. Every number in the text is verified with a node script.
*/
(function () {
  const mm = (A, B) => A.map(r => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
  const T = A => A[0].map((_, j) => A.map(r => r[j]));
  const softmax = r => {
    const m = Math.max(...r.filter(x => x !== -Infinity));
    const e = r.map(x => (x === -Infinity ? 0 : Math.exp(x - m)));
    const s = e.reduce((a, b) => a + b, 0);
    return e.map(x => x / s);
  };
  const r2 = x => Math.round(x * 100) / 100;
  const fmt = (x, d) => {
    if (x === -Infinity) return '−∞';
    let s = x.toFixed(d);
    if (s.includes('.')) s = s.replace(/\.?0+$/, '');
    return s === '-0' ? '0' : s;
  };
  const VOCAB = ['<eos>', 'xyz', 'on', 'video', 'watch', 'upload'];
  const E = [[0.5, 0.5, -0.5, 0.5], [2, -1, 1, -1], [0.16, -0.54, 1.99, -1], [-0.91, 2.42, -0.02, 0], [-0.14, 1.99, 0.97, 1], [1, 0, -1, 1]];
  const PE = p => [Math.sin(p), Math.cos(p), Math.sin(p / 100), Math.cos(p / 100)].map(r2);
  const Wq = [[0, 0, 0, 1], [0, 1, 0, 0], [1, 1, 0, 0], [0, 1, 1, 0]];
  const Wk = [[1, 1, 0, 0], [0, 0, 1, 1], [1, 0, 1, 0], [1, 1, 0, 0]];
  const Wv = [[1, 0, 1, 0], [0, 1, 0, 1], [0, 0, 1, 0], [1, 0, 0, 0]];
  const W1 = [[1, 0, 0, 1, -1, 0, 0, 0], [0, 1, 0, 0, 1, -1, 0, 0], [0, 0, 1, 0, 0, 1, -1, 0], [0, 0, 0, 1, 0, 0, 1, -1]];
  const W2 = [[0.5, 0, 0, 0], [0, 0.5, 0, 0], [0, 0, 0.5, 0], [0, 0, 0, 0.5], [-0.5, 0.5, 0, 0], [0, -0.5, 0.5, 0], [0, 0, -0.5, 0.5], [0.5, 0, 0, -0.5]];
  const Wout = [[0, 1, 0, -1, 0, 0], [-1, -1, 0, 0, 1, 1], [1, 0, 1, 0, 1, 0], [1, 0, -1, 1, -1, 0]];
  const LN = r => {
    const m = r.reduce((a, b) => a + b, 0) / r.length;
    const v = r.reduce((a, b) => a + (b - m) ** 2, 0) / r.length;
    return r.map(x => (x - m) / Math.sqrt(v + 1e-5));
  };
  // full forward pass for a list of token ids
  const run = ids => {
    const Em = ids.map(id => E[id].slice());
    const P = ids.map((_, p) => PE(p));
    const X = Em.map((r, i) => r.map((x, j) => r2(x + P[i][j])));
    const Q = mm(X, Wq), K = mm(X, Wk), V = mm(X, Wv);
    const S = mm(Q, T(K));
    const Sc = S.map((r, i) => r.map((x, j) => (j > i ? -Infinity : x / 2)));
    const W = Sc.map(softmax), A = mm(W, V);
    const R1 = X.map((r, i) => r.map((x, j) => x + A[i][j])), H1 = R1.map(LN);
    const Z = mm(H1, W1), Rl = Z.map(r => r.map(x => Math.max(0, x))), F = mm(Rl, W2);
    const R2 = H1.map((r, i) => r.map((x, j) => x + F[i][j])), H2 = R2.map(LN);
    const last = H2[H2.length - 1];
    const logits = mm([last], Wout)[0];
    return { ids, Em, P, X, Q, K, V, S, Sc, W, A, R1, H1, Z, Rl, F, R2, H2, last, logits };
  };
  const grid = (M, title, d = 2, hl = -1, rowNames, colNames) => {
    let s = `<div style="display:inline-block;vertical-align:top;margin:0 10px 10px 0"><div style="font:600 12px var(--f-mono);color:var(--ink-2);margin-bottom:4px">${title}</div><table style="border-collapse:collapse;font:12px var(--f-mono)">`;
    if (colNames) s += '<tr>' + (rowNames ? '<td></td>' : '') + colNames.map(c => `<td style="padding:2px 6px;color:var(--ink-3);text-align:right">${c}</td>`).join('') + '</tr>';
    M.forEach((r, i) => {
      const on = i === hl;
      s += '<tr>' + (rowNames ? `<td style="padding:2px 6px 2px 0;color:var(--ink-3)">${rowNames[i]}</td>` : '');
      r.forEach(v => { s += `<td style="padding:3px 6px;border:1px solid var(--line);text-align:right;background:${on ? 'var(--accent-soft)' : 'var(--surface)'};color:${on ? 'var(--accent-ink)' : 'var(--ink)'}">${fmt(v, d)}</td>`; });
      s += '</tr>';
    });
    return s + '</table></div>';
  };
  const esc = t => t.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  Lesson.register({
    id: 'ai-transformer-e2e',
    title: 'End to end: one sentence\'s journey',
    minutes: 30,
    summary: `From the prompt "xyz on video" to the next token "watch", and then to &lt;eos&gt;: tokens → ids → embeddings → +PE → attention → FFN → logits → softmax → next token → repeat. See every number with your own eyes inside a tiny toy Transformer.`,
    blocks: [
      { type: 'callout', tone: 'analogy', title: 'In simple words', html: `You type "xyz on video" into xyz Assistant. One word comes back: "watch". (Our toy model learned short app phrases like "xyz on video → watch". The grammar is odd on purpose: it is a tiny made-up model.) What happened in between?<br>A computer does not understand words, only numbers. So the words become numbers, some maths happens on those numbers, and at the end every possible next word gets a "chance".<br>The word with the best chance is picked, added to the sentence, and the whole job runs again. This repeats until a special "stop, I am done" token appears.<br>In this lesson you will follow <strong>every single number</strong> yourself, from the words to the next word.` },
      { type: 'h2', text: 'Problem: we have seen all the parts, but what about the whole machine?' },
      { type: 'p', html: `In the earlier lessons we opened the parts of a Transformer one by one: <a href="#/ai-tokenization">tokens and embeddings</a>, <a href="#/ai-positional-encoding">positional encoding</a>, <a href="#/ai-attention">self-attention</a>, <a href="#/ai-multihead">multi-head, Add &amp; Norm, FFN and the KV cache</a>. But when xyz Assistant gets a prompt, how do all of these run <em>one after another</em>? Which number comes from where, and how does a <strong>word</strong> come out at the end?` },
      { type: 'p', html: `In this lesson we follow one prompt from start to end inside a <strong>toy decoder-only Transformer</strong> (like GPT). Prompt: <code>"xyz on video"</code>. We use the real numbers of every stage, and they continue from the numbers in the earlier lessons.` },
      { type: 'h2', text: 'Stops on the journey: first understand each word' },
      { type: 'p', html: `Before running the stepper, here is the name and the job of every stop on the road. Each card has the real numbers for "video" (the last word of the prompt). Many of these ideas were covered in detail in earlier lessons; here we only cover what this journey needs.` },
      { type: 'callout', tone: 'term', title: 'Stop 1: token and tokenizer', html: `<strong>What it is:</strong> a <strong>token</strong> = a small piece of text (a word or part of a word). A <strong>tokenizer</strong> = the program that cuts text into tokens.<br><strong>Why we need it:</strong> the model needs pieces of a fixed kind, so we can make one list of them (a vocabulary).<br><strong>Without it:</strong> every new spelling and every new word would be unknown to the model.<br><strong>Example:</strong> <code>"xyz on video"</code> → <code>["xyz", "on", "video"]</code>. Our toy tokenizer just cuts at spaces; real models use BPE (<a href="#/ai-tokenization">tokenization</a>).` },
      { type: 'callout', tone: 'term', title: 'Stop 2: vocabulary and token id', html: `<strong>What it is:</strong> the <strong>vocabulary</strong> = a numbered list of all the tokens the model knows. A <strong>token id</strong> = the token's number in that list.<br><strong>Why we need it:</strong> the model works only on numbers, not on text.<br><strong>Without it:</strong> there would be no way to look up "video" in a table.<br><strong>Example:</strong> our vocabulary has only 6 tokens: <code>0 &lt;eos&gt;, 1 xyz, 2 on, 3 video, 4 watch, 5 upload</code>. So the prompt becomes the ids <code>[1, 2, 3]</code>.` },
      { type: 'callout', tone: 'term', title: 'Stop 3: embedding (table lookup)', html: `<strong>What it is:</strong> a table that stores one vector (a list of numbers) for each token id. Give an id, pick up its row. No calculation.<br><strong>Why we need it:</strong> a single number (like 3) carries no "meaning". A vector of 4 numbers can, and training learns it.<br><strong>Without it:</strong> no relationship between id 3 and id 4 could ever show up.<br><strong>Example:</strong> row 3 ("video") of table E = <code>[−0.91, 2.42, −0.02, 0]</code>.` },
      { type: 'callout', tone: 'term', title: 'Stop 4: positional encoding (PE)', html: `<strong>What it is:</strong> a fixed vector for each position (0, 1, 2, ...) that is <strong>added</strong> to the embedding. Our toy uses <code>PE(p) = [sin p, cos p, sin(p/100), cos(p/100)]</code>, rounded to 2 decimals.<br><strong>Why we need it:</strong> attention does not know the order by itself. "xyz on video" and "video on xyz" would look the same to it.<br><strong>Without it:</strong> the meaning of word order is lost.<br><strong>Example:</strong> "video" is at position 2. PE(2) = <code>[0.91, −0.42, 0.02, 1]</code>. Add them: <code>[−0.91, 2.42, −0.02, 0] + [0.91, −0.42, 0.02, 1] = [0, 2, 0, 1]</code>. This is the same X row as in the <a href="#/ai-attention">attention lesson</a>. Details: <a href="#/ai-positional-encoding">positional encoding</a>.` },
      { type: 'callout', tone: 'term', title: 'Stop 5: Q, K, V and attention', html: `<strong>What it is:</strong> three new vectors for each token: <strong>Q</strong> (query, "what am I looking for?"), <strong>K</strong> (key, "what do I have?"), <strong>V</strong> (value, "what will I give?"). Match Q with each K (dot product) = a score. Score ÷ √4, then softmax = weights. Mixing the V vectors with these weights = a new vector.<br><strong>Why we need it:</strong> this is where words take information from each other.<br><strong>Without it:</strong> each word would stay alone; "video" would never learn whose video it is.<br><strong>Example:</strong> the q of "video" = <code>[0, 3, 1, 0]</code>. Scores <code>[7, 5, 5]</code> → ÷ 2 = <code>[3.5, 2.5, 2.5]</code> → softmax <code>[0.5761, 0.2119, 0.2119]</code>. Output A = <code>[1.58, 0.42, 2.36, 0.42]</code>.` },
      { type: 'callout', tone: 'term', title: 'Stop 6: causal mask', html: `<strong>What it is:</strong> setting the scores of future tokens to <code>−∞</code>, so their weight is 0 after softmax.<br><strong>Why we need it:</strong> while generating, the future does not exist yet. In training too, the model must not see the future.<br><strong>Without it:</strong> the model cheats in training, and the KV cache would not work either.<br><strong>Example:</strong> the scores of "xyz" (the first token) are <code>[2.5, 2, 3]</code> → after the mask <code>[2.5, −∞, −∞]</code> → weights <code>[1, 0, 0]</code>. "video" is the last token, so the mask does not change it.` },
      { type: 'callout', tone: 'term', title: 'Stop 7: Add & Norm (residual + LayerNorm)', html: `<strong>What it is:</strong> two jobs. <strong>Add</strong> (residual) = add the input X back to the attention output A. <strong>Norm</strong> (LayerNorm) = then bring each token's 4 numbers to mean 0, std 1 (mean = average, std = the typical spread of the numbers).<br><strong>Why we need it:</strong> so the original meaning is not lost, and the numbers do not become too big or too small.<br><strong>Without it:</strong> deep models do not train at all (details in the <a href="#/ai-multihead">multi-head lesson</a>).<br><strong>Example:</strong> X + A = <code>[0, 2, 0, 1] + [1.58, 0.42, 2.36, 0.42] = [1.58, 2.42, 2.36, 1.42]</code>. Mean ≈ 1.95, std ≈ 0.45. (each number − mean) ÷ std = <code>[−0.82, 1.06, 0.93, −1.16]</code> (computed with full precision inside; if you do it by hand with rounded numbers you may be off by 0.01-0.02). We call this H1.` },
      { type: 'callout', tone: 'term', title: 'Stop 8: FFN and ReLU', html: `<strong>What it is:</strong> the FFN = a small network that runs on each token separately: <code>H1·W1</code> (4 → 8 numbers), then <strong>ReLU</strong> (turn negatives into 0), then <code>·W2</code> (8 → 4).<br><strong>Why we need it:</strong> attention collected information; the FFN "processes" it and builds new meaning.<br><strong>Without it:</strong> the model would only keep averaging and learn nothing new.<br><strong>Example ("video"):</strong> H1·W1 = <code>[−0.82, 1.06, 0.93, −1.98, 1.88, −0.13, −2.09, 1.16]</code>. After ReLU: <code>[0, 1.06, 0.93, 0, 1.88, 0, 0, 1.16]</code>. ·W2 = F = <code>[−0.36, 1.47, 0.46, −0.58]</code>. Then the second Add & Norm: LayerNorm(H1 + F) = H2 = <code>[−0.81, 1.29, 0.65, −1.13]</code>.` },
      { type: 'callout', tone: 'term', title: 'Stop 9: LM head and logits', html: `<strong>What it is:</strong> the <strong>LM head</strong> = a last matrix <code>Wout</code> (4 × 6) with one column for each vocabulary token. Take the dot product of the last token's vector h with each column. The score each token gets is called a <strong>logit</strong>.<br><strong>Why we need it:</strong> we must get from a vector of 4 numbers to "which word comes next". Every possible word needs a score.<br><strong>Without it:</strong> we have a vector, but how do we pick a word?<br><strong>Example:</strong> h = <code>[−0.8095, 1.2895, 0.6451, −1.1251]</code> (the last row of H2, 4 decimals). The column of "watch" is <code>[0, 1, 1, −1]</code>. Dot product = 0 + 1.2895 + 0.6451 + 1.1251 = 3.0597 ≈ <strong>3.06</strong>. All 6 logits: &lt;eos&gt; −1.77, xyz −2.10, on 1.77, video −0.32, watch 3.06, upload 1.29.` },
      { type: 'callout', tone: 'term', title: 'Stop 10: softmax and temperature', html: `<strong>What it is:</strong> softmax turns logits into probabilities (total 1): take e<sup>x</sup> of each logit, then divide by the total. <strong>Temperature (T)</strong> = dividing the logits by T before softmax.<br><strong>Why we need it:</strong> logits can be anything (−2.10 or 3.06). To pick, we need "chances". With T we control how "sure" or how "open" the model is.<br><strong>Without it:</strong> no random draw is possible, and no control over creativity.<br><strong>Example (T = 1):</strong> e<sup>x</sup> = <code>[0.17, 0.12, 5.87, 0.73, 21.32, 3.63]</code>, total 31.85. "watch" = 21.32 ÷ 31.85 = <strong>0.6695</strong>. At T = 0.5, "watch" is 0.9041 (more sure). At T = 5 it is only 0.2688 (everything moves towards equal).` },
      { type: 'callout', tone: 'term', title: 'Stop 11: greedy and sampling', html: `<strong>What it is:</strong> ways to pick one token from the probabilities. <strong>Greedy</strong> = always the biggest. <strong>Sampling</strong> = a random draw: take a random number u between 0 and 1, add up the probabilities one by one, and the token where the running total first goes past u is picked.<br><strong>Why we need it:</strong> the model only gives chances. The picking is done by code outside the model (the sampler).<br><strong>Without it:</strong> we have probabilities, but the next word is never decided.<br><strong>Example:</strong> greedy → "watch" (0.6695). Sampling: in order [&lt;eos&gt; 0.0054, xyz 0.0038, on 0.1844, video 0.0229, watch 0.6695, upload 0.1140]. If u = 0.5, the running total goes 0.0054 → 0.0092 → 0.1936 → 0.2165 → 0.8860: it passes u at "watch". The random number comes from a <strong>seed</strong>, so the same seed gives the same answer.` },
      { type: 'callout', tone: 'term', title: 'Stop 12: &lt;eos&gt; and max_tokens', html: `<strong>What it is:</strong> <code>&lt;eos&gt;</code> ("end of sequence") is a special token that means "the answer is complete". <strong>max_tokens</strong> = a hard limit set by the harness: stop by force after this many tokens.<br><strong>Why we need it:</strong> the model runs in a loop. Someone has to say "that is enough".<br><strong>Without it:</strong> the loop might never end, wasting GPU time, money and the user's patience.<br><strong>Example:</strong> in round 2, &lt;eos&gt; gets probability 0.7591, so generation stops. In the stepper, max_tokens = 7.` },
      { type: 'h2', text: 'Our toy model' },
      { type: 'table', head: ['Thing', 'Toy model (in this lesson)', 'GPT-2 small (2019)', 'Llama 3 8B (2024)'], rows: [
        ['Vocabulary', '6 tokens', '50,257', '128,256'],
        ['d_model (vector size)', '4', '768', '4,096'],
        ['Layers (blocks)', '1', '12', '32'],
        ['Attention heads', '1 (Wo = identity)', '12', '32 query, 8 KV'],
        ['FFN size d_ff', '8 (ReLU)', '3,072 (GELU)', '14,336 (SwiGLU)'],
        ['Norm', 'Post-LN (2017 style)', 'Pre-LN', 'Pre-RMSNorm'],
        ['Position', 'Sinusoidal (added)', 'Learned (added)', 'RoPE (rotation)'],
      ], caption: 'Post-LN, Pre-LN, RMSNorm, GELU and SwiGLU are explained in the <a href="#/ai-multihead">multi-head lesson</a>; learned positions and RoPE in <a href="#/ai-positional-encoding">positional encoding</a>. For this lesson, this is enough: real models have bigger numbers, but the same steps.' },
      { type: 'callout', tone: 'warn', title: 'To be honest', html: `The weights of the toy model were <strong>picked by hand</strong>, not trained. Wq, Wk, Wv are the same as in the <a href="#/ai-attention">attention lesson</a>; the embedding table was chosen so that embedding + PE gives exactly the same X. The FFN and output weights were chosen so the prediction makes sense. In a real model, all of these billions of numbers are learned in training, but <strong>the steps of the calculation are exactly the same</strong>.` },
      { type: 'ascii', caption: 'The whole journey at a glance (shapes: n = tokens, d = 4, V = 6)', text: `"xyz on video"
   │ 1. tokenizer               → ["xyz", "on", "video"]
   │ 2. vocab lookup            → ids [1, 2, 3]
   │ 3. embedding table (6×4)   → E      (n × 4)
   │ 4. + positional encoding   → X      (n × 4)
   │ 5. Q, K, V = X·Wq, X·Wk, X·Wv        (n × 4 each)
   │ 6. softmax(mask(Q·Kᵀ/√4))  → weights (n × n)
   │ 7. weights · V             → A      (n × 4)  ← contextual vectors
   │ 8. LayerNorm(X + A)        → H1     (n × 4)
   │ 9. ReLU(H1·W1)·W2          → F      (n × 4)   (inside: n × 8)
   │10. LayerNorm(H1 + F)       → H2     (n × 4)
   │11. last row of H2 · Wout   → logits (1 × 6)
   │12. softmax(logits / T)     → probabilities (1 × 6)
   │13. pick (greedy / sample)  → "watch"
   └─14. append, go to step 1 with "xyz on video watch" ... until <eos>` },
      { type: 'callout', tone: 'term', title: 'New word: contextual embedding', html: `<strong>What it is:</strong> the vector after attention, which now also holds information from the words around the token.<br><strong>Why we need it:</strong> the embedding from step 3 is the same everywhere: "video" has one vector in every sentence. But "video" means something slightly different in "xyz on video" and in "a cricket video". After attention (step 7 onwards), the vector of "video" changes <strong>according to its context</strong>.<br><strong>Without it:</strong> every word would have one fixed meaning, whatever the sentence.<br><strong>Example:</strong> after embedding + PE, "video" = <code>[0, 2, 0, 1]</code>. After attention, A = <code>[1.58, 0.42, 2.36, 0.42]</code>: information from "xyz" (58%) has come in. This is the real power of the Transformer.` },
      { type: 'h2', text: 'Stepper: every number with your own eyes' },
      { type: 'p', html: `Press "Next" and watch the prompt go through 13 stages. At the last stage the new token is added and the next round starts, until <code>&lt;eos&gt;</code> (end of sequence) appears or there are 7 tokens. The blue row = the token for which the next word is being predicted right now (the last token). Under each stage, the <strong>"Working"</strong> box shows the full calculation for that token with numbers, so you can check it yourself with a calculator. Use the 1-13 buttons at the top to jump straight to any stage. Shown with 2-4 decimals, full precision inside.` },
      { type: 'custom', render(el) {
        const PRESETS = [[1, 2, 3], [1, 2], [3, 5]];
        const MAXLEN = 7, NST = 13;
        let ids, st, rnd, temp = 1, mode = 0, prev = null;
        el.innerHTML = `<div class="chips e2e-pr" role="group" aria-label="Prompt"></div>
          <div class="chips e2e-md" role="group" aria-label="Decoding" style="margin-top:6px"></div>
          <label style="display:block;margin:8px 0">Temperature: <strong class="e2e-tv"></strong><input class="e2e-t" type="range" min="0.1" max="2" step="0.1" value="1" style="width:100%"></label>
          <div class="chips e2e-st" role="group" aria-label="Stage" style="margin-top:6px"></div>
          <div class="e2e-hd" style="font:600 13px var(--f-mono);color:var(--accent-ink);margin:6px 0"></div>
          <div class="e2e-ti" style="font:700 17px var(--f-display);color:var(--ink);margin-bottom:4px"></div>
          <div class="e2e-tx" style="color:var(--ink-2);margin-bottom:8px"></div>
          <div class="calc-note e2e-tr" style="font:12.5px var(--f-mono);line-height:1.7;margin-bottom:8px;overflow-x:auto"></div>
          <div class="e2e-mx" style="overflow-x:auto"></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button type="button" class="btn small ghost e2e-rs">Restart</button><button type="button" class="btn small ghost e2e-pv">Previous</button><button type="button" class="btn small primary e2e-nx">Next</button></div>`;
        const q = s => el.querySelector(s);
        const chipRow = (sel, names, onPick) => { const b = q(sel); names.forEach((n, i) => { const c = document.createElement('button'); c.type = 'button'; c.className = 'chip'; c.textContent = n; c.onclick = () => onPick(i); b.appendChild(c); }); return b; };
        let preset = 0;
        const prBox = chipRow('.e2e-pr', PRESETS.map(p => 'Prompt: ' + p.map(i => VOCAB[i]).join(' ')), i => { preset = i; reset(); });
        const stBox = chipRow('.e2e-st', Array.from({ length: NST }, (_, i) => String(i + 1)), i => { st = i; draw(); });
        const mdBox = chipRow('.e2e-md', ['Greedy (most probable)', 'Sample (seed 7)'], i => { mode = i; draw(); });
        const draws = []; let seed = 7;
        seed = seed * 16807 % 2147483647; // skip the first draw (with a small seed it is always ~0)
        for (let i = 0; i < 20; i++) { seed = seed * 16807 % 2147483647; draws.push(seed / 2147483647); }
        const probs = R => softmax(R.logits.map(x => x / temp));
        const pick = R => {
          const p = probs(R);
          if (mode === 0) return p.indexOf(Math.max(...p));
          let u = draws[rnd], c = 0;
          for (let i = 0; i < p.length; i++) { c += p[i]; if (u < c) return i; }
          return p.length - 1;
        };
        const bars = (p, hi) => p.map((v, i) => `<div style="display:flex;align-items:center;gap:8px;margin:3px 0;font:12px var(--f-mono)"><span style="width:56px;color:var(--ink-2)">${esc(VOCAB[i])}</span><span style="flex:1;max-width:260px;height:12px;background:var(--surface-2);border-radius:4px;overflow:hidden"><span style="display:block;height:100%;width:${(v * 100).toFixed(1)}%;background:${i === hi ? 'var(--accent)' : 'var(--ink-3)'}"></span></span><span style="color:var(--ink)">${v.toFixed(4)}</span></div>`).join('');
        const reset = () => { ids = PRESETS[preset].slice(); st = 0; rnd = 0; prev = null; draw(); };
        const draw = () => {
          prBox.querySelectorAll('.chip').forEach((c, i) => c.classList.toggle('on', i === preset));
          mdBox.querySelectorAll('.chip').forEach((c, i) => c.classList.toggle('on', i === mode));
          q('.e2e-tv').textContent = temp.toFixed(1);
          const R = run(ids), N = ids.map(i => VOCAB[i]), n = ids.length, L = n - 1, lw = N[L];
          const same = k => prev && prev[k].every((r, i) => r.every((x, j) => Math.abs(x - R[k][i][j]) < 1e-12));
          const kvNote = prev ? `<br><strong>KV cache:</strong> the first ${n - 1} rows are the same as in the last round (${same('K') && same('V') ? 'check: exactly the same' : 'check failed'}). A real model only builds the row of the new token "${esc(lw)}".` : '';
          const row = v => '[' + v.map(x => fmt(x, 2)).join(', ') + ']';
          const vr = (v, d = 2) => '[' + v.map(x => fmt(x, d)).join(', ') + ']';
          const dot = (a, b, da = 2, db = 2) => a.map((x, i) => `${fmt(x, da)}·${fmt(b[i], db)}`).join(' + ');
          const col = (M, j) => M.map(r => r[j]);
          const ms = r => { const m = r.reduce((a, b) => a + b, 0) / r.length; return [m, Math.sqrt(r.reduce((a, b) => a + (b - m) ** 2, 0) / r.length)]; };
          const P0 = probs(R), top = R.logits.indexOf(Math.max(...R.logits));
          const ex = R.Sc[L].map(x => Math.exp(x)), exs = ex.reduce((a, b) => a + b, 0);
          const lx = R.logits.map(x => Math.exp(x / temp)), lxs = lx.reduce((a, b) => a + b, 0);
          const [m1, s1] = ms(R.R1[L]), [m2, s2] = ms(R.R2[L]);
          const TR = [
            `"${esc(N.join(' '))}" → cut at spaces → ${n} tokens`,
            N.map((t, i) => `"${esc(t)}" → ${ids[i]}`).join(', '),
            `E[${ids[L]}] = ${vr(E[ids[L]])} ← the row of "${esc(lw)}"`,
            `PE(${L}) = [sin ${L}, cos ${L}, sin ${fmt(L / 100, 2)}, cos ${fmt(L / 100, 2)}] = ${vr(R.P[L])}<br>x = ${vr(R.Em[L])} + ${vr(R.P[L])} = <strong>${vr(R.X[L])}</strong>`,
            `q[0] = x · (column 0 of Wq) = ${dot(R.X[L], col(Wq, 0), 2, 0)} = ${fmt(R.Q[L][0], 2)}<br>The other columns work the same way: q = <strong>${vr(R.Q[L])}</strong>, k = ${vr(R.K[L])}, v = ${vr(R.V[L])}`,
            `score("${esc(lw)}" → "${esc(N[0])}") = q · k(${esc(N[0])}) = ${dot(R.Q[L], R.K[0])} = ${fmt(R.S[L][0], 2)} → ÷ 2 = ${fmt(R.Sc[L][0], 2)}<br>e<sup>x</sup> = ${vr(ex)} → total ${fmt(exs, 2)} → each ÷ total = <strong>${vr(R.W[L], 4)}</strong>`,
            `A = ${R.W[L].map((w, j) => `${fmt(w, 4)}·${vr(R.V[j])}`).join(' + ')}<br>= <strong>${vr(R.A[L])}</strong>`,
            `X + A = ${vr(R.X[L])} + ${vr(R.A[L])} = ${vr(R.R1[L])}<br>mean = ${fmt(m1, 4)}, std = ${fmt(s1, 4)} → (x − mean) ÷ std = <strong>${vr(R.H1[L])}</strong>`,
            `h·W1 = ${vr(R.Z[L])}<br>ReLU (negative → 0) = ${vr(R.Rl[L])}<br>·W2 = <strong>${vr(R.F[L])}</strong>`,
            `H1 + F = ${vr(R.H1[L])} + ${vr(R.F[L])} = ${vr(R.R2[L])}<br>mean = ${fmt(m2, 4)}, std = ${fmt(s2, 4)} → <strong>${vr(R.H2[L])}</strong>`,
            `logit("${esc(VOCAB[top])}") = h · (the "${esc(VOCAB[top])}" column of Wout) = ${dot(R.last, col(Wout, top), 4, 0)} = <strong>${fmt(R.logits[top], 4)}</strong>`,
            `logits ÷ T = ${vr(R.logits.map(x => x / temp))}<br>e<sup>x</sup> = ${vr(lx)} → total ${fmt(lxs, 2)}<br>÷ total = <strong>${vr(P0, 4)}</strong>`,
          ];
          const S = [
            ['Tokenizer', `The text is cut into tokens. The toy tokenizer just cuts at spaces; real models use BPE (<a href="#/ai-tokenization">tokenization</a>).`, `<div style="font:14px var(--f-mono)">"${esc(N.join(' '))}" → [${N.map(t => '"' + esc(t) + '"').join(', ')}]</div>`],
            ['Token ids', `Each token is looked up in the vocabulary table. The model understands only numbers.`, grid([VOCAB.map((_, i) => i)], 'vocabulary (id)', 0, -1, null, VOCAB.map(esc)) + `<div style="font:14px var(--f-mono)">ids = [${ids.join(', ')}]</div>`],
            ['Embedding lookup', `For each id, that row of the embedding table (6×4) is picked up. No calculation, only a lookup.`, grid(E, 'Embedding table E (6×4)', 2, ids[L], VOCAB.map(esc)) + grid(R.Em, 'chosen rows', 2, L, N.map(esc))],
            ['+ Positional encoding', `Add the sin/cos vector of each position, so the order is known. PE = [sin(p), cos(p), sin(p/100), cos(p/100)], 2 decimals.`, grid(R.Em, 'E', 2, L, N.map(esc)) + grid(R.P, 'PE (pos 0..' + L + ')', 2, L) + grid(R.X, 'X = E + PE', 2, L, N.map(esc))],
            ['Q, K, V', `Three matrix multiplies: Q = X·Wq, K = X·Wk, V = X·Wv (the Wq, Wk, Wv from the attention lesson).` + kvNote, grid(R.Q, 'Q', 2, L, N.map(esc)) + grid(R.K, 'K', 2, L, N.map(esc)) + grid(R.V, 'V', 2, L, N.map(esc))],
            ['Scores → mask → softmax', `Scores = Q·Kᵀ, then ÷ √4 = 2, −∞ on the future (causal mask), then softmax on each row. Row of "${esc(lw)}": ${row(R.Sc[L])} → ${'[' + R.W[L].map(x => fmt(x, 4)).join(', ') + ']'}.`, grid(R.S, 'Q·Kᵀ', 2, L, N.map(esc)) + grid(R.Sc, '÷2 + mask', 2, L, N.map(esc)) + grid(R.W, 'weights (softmax)', 4, L, N.map(esc))],
            ['Attention output', `A = weights·V. Now the vector of "${esc(lw)}" is ${row(R.A[L])}: information from the other tokens has mixed into it. This is the contextual vector.` + kvNote, grid(R.W, 'weights', 4, L, N.map(esc)) + grid(R.V, 'V', 2, -1, N.map(esc)) + grid(R.A, 'A = weights·V', 2, L, N.map(esc))],
            ['Add & Norm 1', `Residual: X + A. Then LayerNorm brings each row to mean 0, std 1.`, grid(R.R1, 'X + A', 2, L, N.map(esc)) + grid(R.H1, 'H1 = LayerNorm', 2, L, N.map(esc))],
            ['FFN', `Each token on its own: H1·W1 (4 → 8), ReLU (negative = 0), then ·W2 (8 → 4).`, grid(R.Z, 'H1·W1', 2, L, N.map(esc)) + grid(R.Rl, 'ReLU', 2, L, N.map(esc)) + grid(R.F, 'F = ReLU·W2', 2, L, N.map(esc))],
            ['Add & Norm 2', `Residual: H1 + F, then LayerNorm. The block is done. (In a real model this block repeats 12-96 times.)`, grid(R.R2, 'H1 + F', 2, L, N.map(esc)) + grid(R.H2, 'H2 = LayerNorm', 2, L, N.map(esc))],
            ['Logits', `We need only the last row ("${esc(lw)}"), because it predicts the next token. h·Wout = a score (logit) for every vocabulary token.`, grid([R.last], 'h (last row)', 4) + grid(Wout, 'Wout (4×6)', 0, -1, null, VOCAB.map(esc)) + grid([R.logits], 'logits', 2, -1, null, VOCAB.map(esc))],
            ['Softmax (temperature ' + temp.toFixed(1) + ')', `p<sub>i</sub> = e<sup>logit<sub>i</sub>/T</sup> / Σ e<sup>logit<sub>j</sub>/T</sup>. Move the temperature slider: lower T = the biggest gets even bigger, higher T = everything moves towards equal.`, bars(probs(R), probs(R).indexOf(Math.max(...probs(R))))],
            null,
          ];
          const nt = pick(R), P = probs(R);
          S[12] = ['Next token: "' + esc(VOCAB[nt]) + '"', mode === 0 ? `Greedy: the token with the highest probability (${P[nt].toFixed(4)}).` : `Sample: random number u = ${draws[rnd].toFixed(4)} (seed 7, round ${rnd + 1}). Add the probabilities one by one; the token where the running total first goes past u is picked.`,
            bars(P, nt) + `<div style="font:14px var(--f-mono);margin-top:6px">${esc(N.join(' '))} <strong style="color:var(--accent-ink)">${esc(VOCAB[nt])}</strong></div>` +
            `<div class="calc-note">${nt === 0 ? '&lt;eos&gt; came: generation stops. Press Restart or try another prompt.' : ids.length >= MAXLEN ? 'Reached the maximum of 7 tokens (max_tokens limit): we stop here.' : 'Press Next: this token joins the prompt and the whole journey runs again (with the KV cache).'}</div>`];
          let cu = 0;
          TR[12] = mode === 0 ? `Highest probability: "${esc(VOCAB[nt])}" (${fmt(P[nt], 4)})` : `u = ${fmt(draws[rnd], 4)}. Running total: ${P.map((v, i) => { cu += v; return `${esc(VOCAB[i])} ${fmt(cu, 4)}`; }).join(' → ')}. First total bigger than u: "${esc(VOCAB[nt])}".`;
          stBox.querySelectorAll('.chip').forEach((c, i) => c.classList.toggle('on', i === st));
          q('.e2e-tr').innerHTML = '<strong>Working ("' + esc(lw) + '"):</strong><br>' + TR[st];
          q('.e2e-hd').textContent = `Round ${rnd + 1} · Stage ${st + 1} / ${NST}`;
          q('.e2e-ti').innerHTML = S[st][0];
          q('.e2e-tx').innerHTML = S[st][1];
          q('.e2e-mx').innerHTML = S[st][2];
          q('.e2e-pv').disabled = st === 0;
          q('.e2e-nx').disabled = st === NST - 1 && (nt === 0 || ids.length >= MAXLEN);
          q('.e2e-nx').textContent = st === NST - 1 ? 'Append + next round' : 'Next';
        };
        q('.e2e-t').addEventListener('input', e => { temp = Number(e.target.value); draw(); });
        q('.e2e-rs').onclick = reset;
        q('.e2e-pv').onclick = () => { if (st > 0) { st--; draw(); } };
        q('.e2e-nx').onclick = () => {
          if (st < NST - 1) { st++; draw(); return; }
          const R = run(ids), nt = pick(R);
          if (nt === 0 || ids.length >= MAXLEN) return;
          prev = R; ids = ids.concat(nt); rnd++; st = 0; draw();
        };
        reset();
      }},
      { type: 'h3', text: 'The numbers of round 1, in one place' },
      { type: 'table', head: ['Stage', 'For "video" (the last token)', 'Meaning'], rows: [
        ['Tokens → ids', '"video" → id 3 (prompt ids [1, 2, 3])', 'Its position in the vocabulary'],
        ['Embedding', '[−0.91, 2.42, −0.02, 0]', 'Row 3 of the table. The same in every sentence.'],
        ['+ PE (pos 2)', '+ [0.91, −0.42, 0.02, 1] = [0, 2, 0, 1]', 'Now it is the X from the attention lesson'],
        ['Q, K, V', 'q = [0, 3, 1, 0], k = [1, 1, 2, 2], v = [1, 2, 0, 2]', 'Question, label, content'],
        ['Scores ÷ 2 → softmax', '[3.5, 2.5, 2.5] → [0.5761, 0.2119, 0.2119]', 'How much to take from each token'],
        ['Attention output A', '[1.58, 0.42, 2.36, 0.42]', 'Contextual vector'],
        ['LayerNorm(X + A)', '[1.58, 2.42, 2.36, 1.42] → [−0.82, 1.06, 0.93, −1.16]', 'Residual + scale fixed'],
        ['FFN', '[−0.36, 1.47, 0.46, −0.58]', 'The token\'s own processing'],
        ['LayerNorm(H1 + F)', '[−0.81, 1.29, 0.65, −1.13]', 'Output of the block'],
        ['Logits (·Wout)', '&lt;eos&gt; −1.77, xyz −2.10, on 1.77, video −0.32, watch 3.06, upload 1.29', 'A score for each vocabulary token'],
        ['Softmax (T = 1)', 'watch 0.6695, on 0.1844, upload 0.1140, video 0.0229, &lt;eos&gt; 0.0054, xyz 0.0038', 'Probabilities, total 1'],
        ['Greedy pick', '"watch"', 'The prompt became "xyz on video watch"'],
      ], caption: 'All numbers come from the stepper\'s own code (2 or 4 decimals).' },
      { type: 'p', html: `How did the logit of "watch" come out? The "watch" column of Wout is <code>[0, 1, 1, −1]</code>. The last vector is <code>h = [−0.8095, 1.2895, 0.6451, −1.1251]</code>. Dot product: <code>0·(−0.8095) + 1·1.2895 + 1·0.6451 + (−1)·(−1.1251) = 3.0597 ≈ 3.06</code>. There is one such dot product for every vocabulary token: "how well does h match this token's column".` },
      { type: 'h3', text: 'Round 2: "watch" was added' },
      { type: 'p', html: `"watch" (id 4) came in at position 3. Embedding <code>[−0.14, 1.99, 0.97, 1]</code> + PE(3) <code>[0.14, −0.99, 0.03, 1]</code> = <code>[0, 1, 1, 2]</code>. Its q = <code>[1, 4, 2, 0]</code>, scores ÷ 2 = <code>[6.5, 5.5, 4.5, 7.5]</code>, softmax = <code>[0.2369, 0.0871, 0.0321, 0.6439]</code>. For the first 3 tokens, the K, V and attention outputs are all <strong>exactly the same as in the last round</strong>: because of the causal mask, old tokens never look at the new token. This is the basis of the <a href="#/ai-multihead">KV cache</a>. At the end, &lt;eos&gt; has the top logit, 3.23, with probability 0.7591: the model says "I am done". Final output: <strong>"xyz on video watch"</strong>.` },
      { type: 'callout', tone: 'mistake', title: 'Common beginner mistake', html: `"The model writes the whole answer at once." No. Each forward pass gives only <strong>one</strong> token. A 500-token answer = 500 forward passes (the first pass over the prompt is big, the rest are small). That is why words appear one by one when streaming, and why output tokens cost more than input tokens.` },
      { type: 'p', html: `Try other prompts ("xyz on", "video upload"): the toy model will say things like "xyz on on on". This is not a bug; it is the truth about <strong>untrained weights</strong>. Real models also sometimes fall into repetition loops; that is why there are settings like the <code>max_tokens</code> limit and a repetition penalty (lowering the logit of a token that has already appeared a little).` },
      { type: 'h2', text: 'The system view: the generation loop' },
      { type: 'p', html: `Now zoom out. A request comes from the xyz Assistant app, and outside the model a loop runs that calls the model again and again. This is called <strong>autoregressive</strong> generation: the model's own previous output becomes the input of the next round. Click the boxes.` },
      { type: 'callout', tone: 'term', title: 'New words: prefill, decode and TTFT', html: `<strong>What it is:</strong> the two parts of generation. <strong>Prefill</strong> = round 1: the whole prompt goes through the model at once, in parallel, and the K, V of all tokens go into the cache. <strong>Decode</strong> = round 2 onwards: each round handles only 1 new token. <strong>TTFT</strong> (time to first token) = the time from sending the request until the first token shows up.<br><strong>Why we need it:</strong> the two cost different things. A long prompt = a long prefill = a higher TTFT. A long answer = more decode rounds.<br><strong>Without it (without knowing this difference):</strong> debugging a slow app is hard: is the problem in the prompt, or in the length of the answer?<br><strong>Example:</strong> in our toy, prefill = the 3 tokens of "xyz on video" at once, answer "watch". Decode = only the one row of "watch", answer &lt;eos&gt;.` },
      { type: 'flow', height: 300, title: 'Autoregressive generation loop',
        nodes: [
          { id: 'app', label: 'xyz Assistant', sub: 'user prompt', x: 90, y: 70, w: 150, kind: 'client', info: 'What it is: the user\'s chat app. It sends the user\'s text, and shows the tokens that come back on screen right away (streaming).' },
          { id: 'tok', label: 'Tokenizer', sub: 'text → ids', x: 280, y: 70, w: 140, kind: 'net', info: 'What it is: the tokenizer. It cuts text into token ids (BPE in real models). At the end of generation it turns ids back into text (detokenize).' },
          { id: 'emb', label: 'Embed + PE', sub: 'ids → X', x: 460, y: 70, w: 140, kind: 'data', info: 'What it is: picking up the row of each id from the embedding table (lookup), then adding the positional encoding. Output: X, of size n × d_model.' },
          { id: 'blk', label: 'Blocks ×N', sub: 'attn + FFN', x: 630, y: 70, w: 140, kind: 'server', meter: true, load: 30, info: 'What it is: N decoder blocks: masked attention, Add & Norm, FFN, Add & Norm. N = 1 in the toy, 12 in GPT-2 small, 32 in Llama 3 8B. Most of the GPU work happens here.' },
          { id: 'head', label: 'LM head', sub: 'logits, softmax', x: 630, y: 225, w: 140, kind: 'server', info: 'What it is: the LM head. The last token\'s vector · Wout = a logit for every vocabulary token. Then softmax (with temperature) = probabilities.' },
          { id: 'samp', label: 'Sampler', sub: 'greedy / sample', x: 460, y: 225, w: 140, kind: 'queue', info: 'What it is: the sampler, code outside the model. It picks one token from the probabilities: greedy, or sampling with temperature/top-k/top-p. The decision to stop is also made here: did &lt;eos&gt; come, or is max_tokens reached?' },
          { id: 'kv', label: 'KV cache', sub: 'per layer', x: 280, y: 225, w: 140, kind: 'cache', info: 'What it is: the KV cache. A copy of the K, V of old tokens for every layer. Why: from round 2 on, only the new token is processed, not the old ones again.' },
        ],
        edges: [{ a: 'app', b: 'tok' }, { a: 'tok', b: 'emb' }, { a: 'emb', b: 'blk' }, { a: 'blk', b: 'head' }, { a: 'head', b: 'samp' }, { a: 'samp', b: 'emb', dashed: true }, { a: 'kv', b: 'blk', dashed: true }, { a: 'samp', b: 'app' }],
        scenarios: [
          { name: 'Round 1 (prefill)', steps: [
            { title: 'The prompt arrives', text: 'The user typed "xyz on video".', go: 'app>tok>emb', msg: '"xyz on video" → ["xyz","on","video"] → [1, 2, 3]' },
            { title: 'All prompt tokens at once', text: 'The first pass runs over the whole prompt in parallel. This is called <strong>prefill</strong>. The K, V go into the cache.', go: ['emb>blk', 'blk>kv'], after: { blk: { load: 80 }, kv: { state: 'ok', sub: '3 tokens' } }, msg: 'X = [[2,0,1,0],[1,0,2,0],[0,2,0,1]]' },
            { title: 'Logits and softmax', text: 'Logits come only from the last row ("video").', go: 'blk>head>samp', after: { blk: { load: 30 } }, msg: 'watch 0.6695 | on 0.1844 | upload 0.1140 | ...' },
            { title: 'The token is streamed', text: 'Greedy picked "watch". It was sent to the app right away (streaming). The time until this first token = TTFT.', go: 'samp>app', after: { app: { sub: '"watch" shown' } } },
          ]},
          { name: 'Round 2 (decode + KV cache)', steps: [
            { title: 'Only the new token goes in', text: '"watch" (id 4, position 3) goes straight to the embedding. No tokenizer needed; we already know the id.', go: 'samp>emb', msg: 'x = emb(4) + PE(3) = [0, 1, 1, 2]' },
            { title: 'Old K, V from the cache', text: 'Only the new token\'s q, k, v are made. The K, V of the 3 old tokens come from the cache. One small pass: a <strong>decode</strong> step.', go: ['emb>blk', 'kv>blk'], parallel: true, after: { kv: { state: 'hit', sub: '4 tokens' } }, msg: 'weights(watch) = [0.2369, 0.0871, 0.0321, 0.6439]' },
            { title: '<eos> came', text: 'In the logits, &lt;eos&gt; is on top with 3.23 (0.7591). The sampler stopped the generation.', go: 'blk>head>samp', after: { samp: { state: 'ok', sub: '<eos>, stop' } } },
            { title: 'Done', text: 'The app has the final text: "xyz on video watch".', go: 'res:samp>app', after: { app: { state: 'ok', sub: 'reply complete' } } },
          ]},
          { name: 'Temperature too high', intro: 'A developer set the temperature to 5.', steps: [
            { title: 'Same logits', text: 'The model\'s numbers did not change: watch 3.06, on 1.77, ...', go: 'app>tok>emb>blk>head', msg: 'logits ÷ 5 → all small and close together' },
            { title: 'The probabilities got flat', text: 'At T = 5, "watch" is only 0.2688, and the odd "xyz" is 0.0958 (it was 0.0038 at T = 1). The sampler will now pick random tokens very often.', go: 'head>samp', set: { samp: { state: 'warn', sub: 'flat distribution' } }, msg: 'T=5: watch 0.2688 | on 0.2077 | upload 0.1886 | video 0.1368 | <eos> 0.1023 | xyz 0.0958' },
            { title: 'Nonsense output', text: 'Each token has a small random mistake, and each mistake becomes the input of the next step. The answer drifts away. Fix: for factual work, keep T around 0 to 0.7.', go: 'bad:samp>app', after: { app: { state: 'down', sub: 'gibberish' } } },
          ]},
          { name: '&lt;eos&gt; never came', intro: 'Imagine the model got stuck in a repetition loop: "on on on ...", and &lt;eos&gt; never reaches the top.', steps: [
            { title: 'The loop kept running', text: 'Each round adds another "on". The model does not stop by itself.', go: ['samp>emb', 'emb>blk>head>samp'], set: { samp: { state: 'hot', sub: 'on, on, on...' } } },
            { title: 'The KV cache kept growing', text: 'Memory grows with every token. Without a limit, this would eat GPU memory and money.', go: 'kv>blk', after: { kv: { state: 'warn', sub: 'growing' } } },
            { title: 'max_tokens stopped it', text: 'The hard limit of the harness/sampler (7 tokens here) breaks the loop. This is why every production API has max_tokens.', go: 'res:samp>app', after: { samp: { state: 'ok', sub: 'stop: max_tokens' }, app: { state: 'warn', sub: 'incomplete reply' } } },
          ]},
        ],
      },
      { type: 'h2', text: 'The final decision: how do we pick a token?' },
      { type: 'p', html: `The model only gives probabilities; <strong>picking</strong> the token is the sampler's job (details in <a href="#/ai-what-is-llm">LLM basics</a>). Play with the real logits of round 1: change the temperature, top-k and top-p, and see how often each token comes up in 100 seeded samples.` },
      { type: 'callout', tone: 'term', title: 'New words: top-k and top-p', html: `<strong>What it is:</strong> two filters that remove "useless" tokens before the random draw. <strong>Top-k</strong>: keep only the k most probable tokens, set the rest to 0, then make the total 1 again. <strong>Top-p</strong> (nucleus sampling): sort the probabilities from big to small, and keep as many tokens as it takes for the total to first reach p (like 0.9).<br><strong>Why we need it:</strong> in sampling, an odd token with 0.4% sometimes gets picked. One odd token can send the whole answer off track.<br><strong>Without it:</strong> in a long answer, a nonsense token would show up somewhere.<br><strong>Example:</strong> top-k = 2: only "watch" 0.6695 and "on" 0.1844 are left. Total 0.8539. Normalize again: 0.6695 ÷ 0.8539 ≈ <strong>0.7841</strong>, 0.1844 ÷ 0.8539 ≈ <strong>0.2159</strong>.` },
      { type: 'custom', render(el) {
        const LG = run([1, 2, 3]).logits;
        el.innerHTML = `<div class="row2">
            <div><label>Temperature: <strong class="sp-tv"></strong></label><input class="sp-t" type="range" min="0.1" max="3" step="0.1" value="1"></div>
            <div><label>Top-k: <strong class="sp-kv"></strong></label><input class="sp-k" type="range" min="1" max="6" step="1" value="6"></div>
            <div><label>Top-p: <strong class="sp-pv"></strong></label><input class="sp-p" type="range" min="0.05" max="1" step="0.05" value="1"></div>
          </div>
          <div class="sp-bars" style="margin-top:8px"></div>
          <div class="calc-note sp-note"></div>`;
        const q = s => el.querySelector(s);
        const upd = () => {
          const t = +q('.sp-t').value, k = +q('.sp-k').value, tp = +q('.sp-p').value;
          q('.sp-tv').textContent = t.toFixed(1); q('.sp-kv').textContent = k; q('.sp-pv').textContent = tp.toFixed(2);
          const p = softmax(LG.map(x => x / t));
          const order = p.map((v, i) => i).sort((a, b) => p[b] - p[a]);
          const keep = new Set(); let cum = 0;
          for (const i of order) { if (keep.size >= k) break; keep.add(i); cum += p[i]; if (tp < 1 && cum >= tp - 1e-12) break; }
          const z = [...keep].reduce((a, i) => a + p[i], 0);
          const f = p.map((v, i) => (keep.has(i) ? v / z : 0));
          let seed = 7; const cnt = f.map(() => 0);
          seed = seed * 16807 % 2147483647;
          for (let s = 0; s < 100; s++) {
            seed = seed * 16807 % 2147483647; const u = seed / 2147483647; let c = 0, pick = f.length - 1;
            for (let i = 0; i < f.length; i++) { c += f[i]; if (f[i] > 0 && u < c) { pick = i; break; } }
            if (f[pick] === 0) pick = order[0];
            cnt[pick]++;
          }
          q('.sp-bars').innerHTML = f.map((v, i) => `<div style="display:flex;align-items:center;gap:8px;margin:3px 0;font:12px var(--f-mono)"><span style="width:56px;color:var(--ink-2)">${esc(VOCAB[i])}</span><span style="flex:1;max-width:240px;height:12px;background:var(--surface-2);border-radius:4px;overflow:hidden"><span style="display:block;height:100%;width:${(v * 100).toFixed(1)}%;background:${keep.has(i) ? 'var(--accent)' : 'var(--line-2)'}"></span></span><span style="width:52px;color:var(--ink)">${v.toFixed(4)}</span><span style="color:var(--ink-3)">${cnt[i]}/100</span></div>`).join('');
          q('.sp-note').innerHTML = `${keep.size} token(s) in the draw. Greedy would always pick "watch". Bars = probabilities normalized again after the filter; right side = counts in 100 seeded samples (seed 7).`;
        };
        el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
      }},
      { type: 'p', html: `Try it: at T = 0.1, "watch" is ~1.0000 (almost greedy). At T = 3, all tokens are close together. With top-k = 2, only "watch" and "on" are left: 0.7841 and 0.2159. With top-p = 0.8 (T = 1), the total of "watch" + "on", 0.8539, is the first to pass 0.8, so those two are kept.` },
      { type: 'h2', text: 'How does this same machine learn in training?' },
      { type: 'p', html: `In generation we use only the logits of the last row. In training <strong>every row</strong> is useful: the job of position i is to predict token i+1. The training sentence "xyz on video watch &lt;eos&gt;" gives 4 questions in one forward pass (because of the causal mask, no position can look ahead). The real numbers of our toy model:` },
      { type: 'table', head: ['Position (input)', 'Correct next token', 'Model\'s probability for it', 'Loss = −ln(p)', 'Model\'s top guess'], rows: [
        ['xyz', 'on', '0.3408', '1.0766', 'xyz and on tied (0.3408)'],
        ['on', 'video', '0.0142', '4.2579', 'on (0.3924)'],
        ['video', 'watch', '0.6695', '0.4012', 'watch'],
        ['watch', '&lt;eos&gt;', '0.7591', '0.2756', '&lt;eos&gt;'],
      ], caption: 'Average loss = 1.5028. If the model were just guessing (6 tokens, each 1/6), the loss would be ln 6 = 1.7918.' },
      { type: 'callout', tone: 'term', title: 'New word: cross-entropy loss', html: `<strong>What it is:</strong> the <strong>loss</strong> = how wrong the model was, as one number. In next-token training it is <code>−ln(probability of the correct token)</code> (cross-entropy). ln = the natural log.<br><strong>Why we need it:</strong> training needs one number to make smaller. Probability 1 on the correct token → loss 0. Probability 0.0142 → loss 4.26, very bad.<br><strong>Without it:</strong> the weights would not know which direction to change in.<br><strong>Example:</strong> on "video → watch" the probability is 0.6695, so the loss = −ln(0.6695) = 0.4012.<br>Training uses two tools to nudge the weights a little at a time, so the average loss goes down: <strong>backpropagation</strong> (finding the gradient of every weight) and <strong>gradient descent</strong> (a small step in the opposite direction of the gradient). On billions of sentences, billions of times.` },
      { type: 'p', html: `Look at the "on → video" row: the model gave "video" only 1.42%. The biggest "fix this" signal in training will come from here. In a real model this same thing happens over trillions of tokens, and slowly Wq, Wk, Wv, W1, W2, Wout, the embedding table, all of them "learn". Details: <a href="#/ai-training-finetuning">pre-training and fine-tuning</a>.` },

      { type: 'h2', text: 'In the real world: prefill, decode, and where the time goes' },
      { type: 'list', items: [
        `<strong>Prefill</strong> (round 1): the whole prompt at once, in parallel. Good work for a GPU (big matrix multiplications). A long prompt = a longer time to first token (TTFT).`,
        `<strong>Decode</strong> (round 2 onwards): each round makes only 1 new token. The work is small, but every time all the weights must be read from GPU memory, so the bottleneck is often <em>memory bandwidth</em> (how many bytes per second can be read from GPU memory), not compute. That is why output tokens/sec is much slower than input processing.`,
        `<strong>The shapes do not change the idea</strong>: the toy has a vector of 4 numbers, Llama 3 8B has 4,096; the toy has 1 block, it has 32; the toy vocabulary is 6, there it is 128,256. The steps are exactly the same: lookup → +position → (attention → add &amp; norm → FFN → add &amp; norm) × N → logits → softmax → pick.`,
        `<strong>Position</strong>: our toy adds sinusoidal PE (2017 style). Models like Llama use RoPE, which rotates Q and K (<a href="#/ai-positional-encoding">positional encoding lesson</a>). The rest of the pipeline is the same.`,
      ]},
      { type: 'callout', tone: 'tip', title: 'Decide', html: `<ul>
        <li><strong>Factual / code / JSON answers</strong>: greedy or a low temperature (0 to ~0.3). Repeatable output.</li>
        <li><strong>Creative text, ideas</strong>: temperature ~0.7-1 + top-p ~0.9.</li>
        <li><strong>Always set max_tokens</strong>: it protects you from loops and from big bills.</li>
        <li><strong>Debugging latency</strong>: high TTFT = long prompt (prefill). Low tokens/sec = decode (model size, batch, KV cache memory). Prompt caching helps with the first problem; a smaller/quantized model or GQA helps with the second.</li>
      </ul>` },
      { type: 'diagram', title: 'From words to the next word: the whole picture', height: 440,
        groups: [
          { label: 'Model: blocks, LM head, softmax', x: 10, y: 168, w: 700, h: 104 },
          { label: 'Outside the model: sampler and loop', x: 10, y: 318, w: 700, h: 104 },
        ],
        nodes: [
          { id: 'user', label: 'xyz Assistant', sub: '"xyz on video"', x: 90, y: 80, w: 150, kind: 'client', info: 'What it is: the user\'s chat app. The prompt comes from here.' },
          { id: 'tok', label: 'Tokenizer', sub: 'text → [1, 2, 3]', x: 270, y: 80, kind: 'net', info: 'What it is: the program that cuts text into tokens and gives each token its vocabulary id. "xyz on video" → [1, 2, 3].' },
          { id: 'emb', label: 'Embedding', sub: 'id → row of E', x: 450, y: 80, kind: 'data', info: 'What it is: a table lookup. Id 3 ("video") → row 3 of E = [−0.91, 2.42, −0.02, 0]. No calculation.' },
          { id: 'pe', label: '+ Position', sub: 'X = E + PE', x: 630, y: 80, w: 130, kind: 'data', info: 'What it is: adding the sin/cos vector of each position, so the order is known. "video" (pos 2): X = [0, 2, 0, 1].' },
          { id: 'attn', label: 'Masked attention', sub: 'Q·Kᵀ ÷ 2, softmax', x: 630, y: 220, w: 150, kind: 'server', info: 'What it is: make Q, K, V, scores ÷ √4, causal mask, softmax, weights·V. Weights of "video" [0.5761, 0.2119, 0.2119], output A = [1.58, 0.42, 2.36, 0.42].' },
          { id: 'ffn', label: 'Norm + FFN', sub: '4 → 8 → 4, ×N', x: 450, y: 220, kind: 'server', info: 'What it is: Add & Norm, the FFN (4 → 8, ReLU, 8 → 4), then Add & Norm again. H2 of "video" = [−0.81, 1.29, 0.65, −1.13]. In a real model this whole block repeats N times.' },
          { id: 'lm', label: 'LM head', sub: 'h · Wout = logits', x: 270, y: 220, kind: 'server', info: 'What it is: multiply only the last row h by Wout (4×6). One score (logit) for each vocabulary token. "watch" = 3.06 is the biggest.' },
          { id: 'soft', label: 'Softmax ÷ T', sub: 'watch 0.6695', x: 90, y: 220, kind: 'server', info: 'What it is: logits ÷ temperature, then softmax = probabilities (total 1). At T = 1, "watch" 0.6695 and "on" 0.1844.' },
          { id: 'samp', label: 'Sampler', sub: 'greedy / sample', x: 90, y: 370, kind: 'queue', info: 'What it is: code outside the model that picks one token from the probabilities. Greedy → "watch". Sampling uses a random number from a seed.' },
          { id: 'stop', label: 'Stop check', sub: '<eos>? max_tokens?', x: 270, y: 370, kind: 'queue', info: 'What it is: a check after each round: is the picked token &lt;eos&gt;, or is max_tokens reached? If yes, stop; if no, send the token back in.' },
          { id: 'out', label: 'User\'s screen', sub: '"xyz on video watch"', x: 450, y: 370, w: 160, kind: 'client', info: 'What it is: each picked token id is turned back into text (detokenize) and shows up on screen right away (streaming).' },
          { id: 'kv', label: 'KV cache', sub: 'K, V per layer', x: 630, y: 370, kind: 'cache', info: 'What it is: a copy of the K, V of old tokens. Prefill fills 3 rows; in decode only the new row is added, and the old ones stay the same bit for bit.' },
        ],
        edges: [
          { a: 'user', b: 'tok', n: 1 },
          { a: 'tok', b: 'emb', n: 2 },
          { a: 'emb', b: 'pe', n: 3 },
          { a: 'pe', b: 'attn', n: 4 },
          { a: 'attn', b: 'ffn', n: 5 },
          { a: 'ffn', b: 'lm' },
          { a: 'lm', b: 'soft', n: 6 },
          { a: 'soft', b: 'samp', n: 7 },
          { a: 'samp', b: 'stop', n: 8 },
          { a: 'stop', b: 'out', kind: 'res' },
          { a: 'stop', b: 'emb', kind: 'evt', dashed: true, via: [[360, 345], [360, 150], [420, 150]] },
          { a: 'attn', b: 'kv', dashed: true, both: true },
        ],
        paths: [
          { name: 'Prefill', text: 'The whole prompt at once: 3 tokens, one forward pass. The K, V of all three go into the cache. Logits come only from the last row ("video"): "watch" 0.6695.', go: ['user>tok>emb>pe>attn>ffn>lm>soft>samp', 'attn>kv'] },
          { name: 'Decode one token', text: '"watch" (id 4, position 3) goes straight to the embedding: x = [0, 1, 1, 2]. Only its q, k, v are made; the old K, V come from the cache. New logits: &lt;eos&gt; 0.7591.', go: ['samp>stop>emb>pe>attn>ffn>lm>soft>samp', 'kv>attn'] },
          { name: 'Loop until &lt;eos&gt;', text: 'Every round: pick → check → show on screen → send back in. Stop at &lt;eos&gt; or max_tokens. Final: "xyz on video watch".', go: ['samp>stop>out', 'stop>emb'] },
        ],
      },
      { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
        <li>The road: text → tokens → ids → embedding row → + PE → (attention → Add & Norm → FFN → Add & Norm) × N → logits → softmax → one token.</li>
        <li>The embedding is only a lookup. After attention, the vector becomes "contextual": information from the other words mixes into it.</li>
        <li>In generation, logits come only from the <strong>last</strong> token's row. In training, every row is a question ("what comes next?"), and loss = −ln(probability of the correct token).</li>
        <li>The model only gives probabilities. Picking is the sampler's job: greedy, or sampling with temperature / top-k / top-p.</li>
        <li>Each output token = one forward pass. Round 1 = prefill (the whole prompt, TTFT); the rest = decode (1 token each, with the KV cache).</li>
        <li>Because of the causal mask, the numbers of old tokens never change. That is why the KV cache is correct.</li>
        <li>The model does not stop by itself: only &lt;eos&gt; or max_tokens break the loop.</li>
      </ul>` },
      { type: 'tradeoffs',
        gains: ['One simple loop (forward pass → pick → append) gives an answer of any length', 'Prefill is parallel: even a long prompt takes one pass', 'With the KV cache, each new token is cheap', 'The sampler is separate: control creativity/determinism without changing the model'],
        costs: ['Each output token = one full forward pass (output tokens are expensive and slow)', 'One wrong token becomes the input of all the tokens after it (error compounding)', 'The model does not stop by itself: it depends on &lt;eos&gt; or max_tokens', 'KV cache memory grows with the context'] },
      { type: 'think', questions: [
        { q: 'In the stepper, the first 3 rows stayed exactly the same in round 2. If we removed the causal mask (like an encoder), would they still stay the same?', a: 'No. Without the mask, "xyz" would also look at the new token "watch", so its attention output, H1 and H2 would all change. Then every round would need all tokens calculated again, and the KV cache would not be valid. The causal mask is what makes generation cheap.' },
        { q: 'In the logits, "watch" was 3.06 and "on" was 1.77. The difference is only 1.29, but the probabilities are 0.6695 vs 0.1844, about 3.6 times. Why?', a: 'Softmax is exponential: ratio = e^(3.06 − 1.77) = e^1.29 ≈ 3.63. A small difference in logits becomes a big ratio in probabilities. Temperature divides this difference, making it smaller (T > 1) or bigger (T < 1).' },
        { q: 'xyz Assistant\'s answer is 400 tokens and the prompt is 2,000 tokens. How many forward passes? Which part takes more time, and why?', a: '1 prefill pass (2,000 tokens at once) + 399 decode passes (1 token each; the first output token comes from the prefill itself) = 400 passes. Usually the 399 decode steps take most of the total time, because each step reads all the weights from memory and the steps can only happen one after another.' },
      ]},
      { type: 'quiz', questions: [
        { q: 'In generation, which row do the logits come from?', options: ['The first token\'s row', 'The average of all rows', 'Only the last token\'s row', 'The embedding table'], answer: 2, explain: 'The last position predicts the next token. In training every row is used; in generation only the last one.' },
        { q: 'What happens in an embedding lookup?', options: ['A matrix multiply and softmax', 'The row for the token id is picked from the table', 'Attention scores are made', 'The positional encoding is removed'], answer: 1, explain: 'One row from the embedding table (vocab × d_model): a pure lookup. Then PE is added.' },
        { q: 'What happens when the temperature goes from 1 to 5?', options: ['The logits change because the model is trained again', 'The probabilities become more equal (flat)', 'Only the top token is left', 'Nothing'], answer: 1, explain: 'Logits ÷ T. A big T makes the differences smaller: watch 0.6695 → 0.2688, xyz 0.0038 → 0.0958.' },
        { q: '"watch" came after "xyz on video". What must be calculated again in round 2 (with the KV cache)?', options: ['Q, K, V of all 4 tokens', 'Only the q, k, v of "watch" and its attention', 'Only the tokenizer', 'Nothing, the answer is in the cache'], answer: 1, explain: 'The K, V of old tokens are in the cache and do not change (causal mask). Only the new token is processed.' },
        { q: 'In training, the loss at the "on → video" position is 4.2579. What does this mean?', options: ['The model is very good there', 'The model gave the correct token "video" only ~1.4%: it needs a big fix', 'The loss is always above 4', 'That position is not trained'], answer: 1, explain: '−ln(0.0142) = 4.2579. Low probability = big loss = training will move the weights more there.' },
      ]},
      { type: 'sources', items: [
        { title: 'Attention Is All You Need', publisher: 'Vaswani et al., NeurIPS (arXiv 1706.03762)', url: 'https://arxiv.org/abs/1706.03762', year: 2017, official: true, used: 'Decoder stack, sinusoidal PE, Add & Norm (Post-LN), FFN with ReLU, linear + softmax output' },
        { title: 'Language Models are Unsupervised Multitask Learners (GPT-2)', publisher: 'Radford et al., OpenAI', url: 'https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf', year: 2019, official: true, used: 'Decoder-only LM, Pre-LN, vocab 50,257, model sizes' },
        { title: 'The Curious Case of Neural Text Degeneration', publisher: 'Holtzman et al., ICLR (arXiv 1904.09751)', url: 'https://arxiv.org/abs/1904.09751', year: 2019, used: 'Top-p (nucleus) sampling, repetition in greedy decoding' },
        { title: 'KV cache explanation (Transformers docs)', publisher: 'Hugging Face', url: 'https://huggingface.co/docs/transformers/en/cache_explanation', year: 2026, official: true, used: 'Generation loop with cache: only the new token is fed after the first step' },
        { title: 'Meta-Llama-3-8B config.json', publisher: 'Hugging Face model hub', url: 'https://huggingface.co/meta-llama/Meta-Llama-3-8B', year: 2024, used: 'd_model 4096, 32 layers, 32/8 heads, d_ff 14,336, vocab 128,256, SiLU (SwiGLU)' },
        { title: 'Transformers Explained | Simple Explanation of Transformers (video)', publisher: 'codebasics (YouTube)', url: 'https://www.youtube.com/watch?v=ZhAz268Hdpw', used: 'Learner reference; its chapters (embeddings, contextual embeddings, positional embeddings, attention, decoder) are all covered here' },
      ]},
    ],
  });
})();
