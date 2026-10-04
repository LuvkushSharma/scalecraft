Lesson.register({
  id: 'ai-positional-encoding',
  title: 'Positional encoding',
  minutes: 25,
  summary: `Attention cannot see word order: to it, "xyz on video" and "video on xyz" are the same. Positional encoding adds an "address" for each position into the vector. The sinusoidal formula by hand (pos 0-3, d = 4), a heatmap, learned positions, the rotation idea behind RoPE, and ALiBi.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `"Riya sent Aman a video" and "Aman sent Riya a video": the same words, the opposite meaning. The only difference is the <strong>order</strong>.<br>A Transformer looks at all the words at the same time, so by itself it cannot tell which word came first. It is as if someone put the words of a sentence into a bag and shook it.<br>In this lesson we see how to stick an "address" of its place onto every word: a sin/cos clock, a learned table, RoPE that rotates, and ALiBi that gives a distance penalty. All with small numbers, and you run each one yourself.` },
    { type: 'h2', text: 'The problem: attention is order-blind' },
    { type: 'p', html: `Remember the map from the <a href="#/ai-transformer-overview">previous lesson</a>: tokens → embeddings → attention layers. An RNN read one word at a time, in a line, so it knew the order automatically. A Transformer takes all tokens <em>at the same time</em>. We gained speed, but lost one thing: <strong>who came first and who came later</strong>.` },
    { type: 'p', html: `Here is the proof, with numbers. Take the matrices of the tiny example from the <a href="#/ai-attention">self-attention lesson</a> (3 tokens, each vector has 4 numbers). Just for this demo, pretend they are embeddings <em>without</em> position (in the attention lesson the same numbers are treated as "embedding + PE"; here we want to show what happens with no PE). Once in the order "xyz on video", once reversed: "video on xyz". The table shows each token's <em>attention output</em>, that is, the new, context-aware vector of that token coming out of the attention layer:` },
    { type: 'table', head: ['Token', 'Output ("xyz on video")', 'Output ("video on xyz")'], rows: [
      ['xyz', '[1.31, 1.01, 1.48, 1.01]', '[1.31, 1.01, 1.48, 1.01]'],
      ['on', '[1.67, 0.18, 2.73, 0.18]', '[1.67, 0.18, 2.73, 0.18]'],
      ['video', '[1.58, 0.42, 2.36, 0.42]', '[1.58, 0.42, 2.36, 0.42]'],
    ], caption: 'Each token\'s attention output is exactly the same in both orders. Only the rows swapped places. To the model, both sentences are the same "bag".' },
    { type: 'callout', tone: 'term', title: 'New word: permutation equivariance', html: `<strong>What it is:</strong> a heavy name with a simple meaning. <strong>Shuffle</strong> the order of the tokens (a permutation), and the output is shuffled in the same way; the values do not change.<br><strong>Why it happens:</strong> self-attention makes a score for each pair (token, token), and "which token is at which position" appears nowhere in its formula.<br><strong>The harm:</strong> the model gets no signal about order. So position must be given separately.` },
    { type: 'p', html: `Order matters a lot in every language: <code>Riya sent Aman a video</code> and <code>Aman sent Riya a video</code> have the same tokens and opposite meanings. xyz Assistant must know who sent the video to whom.` },
    { type: 'callout', tone: 'term', title: 'New word: positional encoding', html: `<strong>What it is:</strong> a vector for each position (0, 1, 2, ...), which is <strong>added</strong> to the embedding of the token at that position (or put inside attention in some other way). Like sticking a small "seat number" on every word.<br><strong>Why we need it:</strong> now "video at position 0" and "video at position 2" are different vectors, so attention gets a signal about order.<br><strong>Without it:</strong> look at the table above: the output is the same for both orders. The model cannot tell "who sent it to whom".` },
    { type: 'h2', text: 'Simple ideas first, and why they fail' },
    { type: 'steps', items: [
      { t: 'Idea 1: just add the position number (0, 1, 2, ...)', d: 'At token 500, 500 would be added to every number, while embedding numbers are around 0.1-1. The position signal would drown out the meaning. And if training never saw positions up to 3,000, what do we do with 3,000?' },
      { t: 'Idea 2: squeeze it between 0 and 1 (pos / length)', d: 'In a 10-token sentence, position 5 = 0.5; in a 100-token sentence, position 50 = 0.5. Same number, different meaning. "How far apart are two tokens" would look different in every sentence.' },
      { t: 'Idea 3: like a clock (sinusoidal)', d: 'On a clock, the seconds hand turns fast, the minutes hand slower, and the hours hand slower still. Together, the positions of the three hands make every time unique, and each hand\'s value always stays between −1 and 1. The 2017 paper used this trick.' },
    ]},

    { type: 'h2', text: 'The sinusoidal formula, by hand' },
    { type: 'callout', tone: 'term', title: 'New word: sin, cos and radian', html: `<strong>What it is:</strong> picture a point moving around a circle (like the tip of a clock hand). How far the hand has turned is called the <strong>angle</strong>. The point's <strong>height</strong> = sin(angle), and its <strong>left-right</strong> distance = cos(angle). We measure angles in <strong>radians</strong>: one full turn = 2π ≈ 6.28 radians. Example: sin(0) = 0, cos(0) = 1 (hand pointing straight right); sin(1) ≈ 0.841.<br><strong>Why we need it:</strong> both always stay between −1 and 1 (they never blow up), and they change smoothly from position to position.<br><strong>Without it:</strong> we would have to add the raw position number, which grows big and drowns the embedding (the problem with Idea 1).<br>Here, angle = pos ÷ (some number). If that "some number" is big, the hand turns slowly.` },
    { type: 'callout', tone: 'term', title: 'New word: power (^) and dimension pair', html: `<strong>Power:</strong> <code>a^b</code> means multiply a by itself b times: <code>10^2 = 10 × 10 = 100</code>. If b is a fraction, it works like a root: <code>10000^(2/4) = 10000^0.5 = √10000 = 100</code> (the number that, multiplied by itself, gives 10000). And <code>10000^0 = 1</code>.<br><strong>Dimension pair:</strong> split the numbers of the vector into pairs: (number 0, number 1) = pair 0, (number 2, number 3) = pair 1. Each pair is one clock hand: the first number is sin, the second is cos.<br><strong>Why:</strong> different pairs turn at different speeds, so together they make a unique pattern for every position.` },
    { type: 'p', html: `The formula from the 2017 paper "Attention Is All You Need". <code>pos</code> = the token's position, <code>d</code> = d_model, and think of the dimensions in pairs: pair number <code>i</code> = 0, 1, 2, ...` },
    { type: 'code', text: `PE(pos, 2i)   = sin( pos / 10000^(2i/d) )     ← first number of pair i
PE(pos, 2i+1) = cos( pos / 10000^(2i/d) )     ← second number of pair i` },
    { type: 'p', html: `In our tiny model d = 4, so there are 2 pairs:` },
    { type: 'list', items: [
      `Pair 0 (i = 0): 10000^(0/4) = 1, so angle = pos / 1 = pos. A <strong>fast hand</strong>: it turns 1 radian per position.`,
      `Pair 1 (i = 1): 10000^(2/4) = 100, so angle = pos / 100. A <strong>slow hand</strong>: only 0.01 radian per position.`,
    ]},
    { type: 'table', head: ['pos', 'sin(pos)', 'cos(pos)', 'sin(pos/100)', 'cos(pos/100)'], rows: [
      ['0', '0.000', '1.000', '0.000', '1.000'],
      ['1', '0.841', '0.540', '0.010', '1.000'],
      ['2', '0.909', '−0.416', '0.020', '1.000'],
      ['3', '0.141', '−0.990', '0.030', '1.000'],
    ], caption: 'PE vectors, d = 4, 3 decimals. Position 0 is always [0, 1, 0, 1]. The first two columns change fast, the last two very slowly.' },
    { type: 'p', html: `Now say the embedding of the token "video" is <code>[0.5, −0.2, 0.1, 0.4]</code> (illustrative). The same token in two places:` },
    { type: 'list', items: [
      `At position 0: [0.5, −0.2, 0.1, 0.4] + [0, 1, 0, 1] = <strong>[0.500, 0.800, 0.100, 1.400]</strong>`,
      `At position 2: [0.5, −0.2, 0.1, 0.4] + [0.909, −0.416, 0.020, 1.000] = <strong>[1.409, −0.616, 0.120, 1.400]</strong>`,
    ]},
    { type: 'p', html: `Same token, different vectors. Now attention gets a signal about order. Real models have a bigger d (512 in the paper), so 256 pairs, from the fastest hand down to one so slow that a full turn takes about 60,600 positions (the paper says the wavelengths form a geometric progression from 2π to 10000·2π). See it yourself in the heatmap below: rows = positions, columns = dimensions.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>d_model: <strong class="v-d">16</strong></label><input class="i-d" type="range" min="4" max="64" step="2" value="16"></div>
          <div><label>Positions: <strong class="v-p">12</strong></label><input class="i-p" type="range" min="4" max="40" step="1" value="12"></div>
        </div>
        <div class="hm" style="overflow-x:auto;margin-top:12px"></div>
        <div class="calc-note o-cell">Click any cell to see its formula with the numbers.</div>
        <div class="calc-note">Colour: <span style="color:var(--accent)">blue = towards +1</span>, <span style="color:var(--red)">red = towards −1</span>, pale = close to 0.</div>`;
      const q = c => el.querySelector(c);
      const on = (pos, j, d) => { const i = Math.floor(j / 2), a = pos / Math.pow(10000, 2 * i / d); return { v: j % 2 ? Math.cos(a) : Math.sin(a), i, a }; };
      const show = (pos, j, d) => {
        const r = on(pos, j, d), fn = j % 2 ? 'cos' : 'sin';
        q('.o-cell').innerHTML = `pos ${pos}, dim ${j} (pair i = ${r.i}): ${fn}(${pos} / 10000<sup>${2 * r.i}/${d}</sup>) = ${fn}(${r.a.toFixed(4)}) = <strong>${r.v.toFixed(3)}</strong>`;
      };
      const draw = () => {
        const d = Number(q('.i-d').value), P = Number(q('.i-p').value);
        q('.v-d').textContent = d; q('.v-p').textContent = P;
        const cs = Math.max(8, Math.min(18, Math.floor(320 / d)));
        let h = `<div style="display:grid;grid-template-columns:28px repeat(${d},${cs}px);gap:1px;font:11px var(--f-mono);color:var(--ink-3);width:max-content">`;
        h += '<div></div>' + Array.from({ length: d }, (_, j) => `<div style="text-align:center">${j % 4 === 0 ? j : ''}</div>`).join('');
        for (let p = 0; p < P; p++) {
          h += `<div>${p}</div>`;
          for (let j = 0; j < d; j++) {
            const v = on(p, j, d).v, c = v >= 0 ? 'var(--accent)' : 'var(--red)';
            h += `<div class="pc" data-p="${p}" data-j="${j}" title="${v.toFixed(3)}" style="height:${cs}px;cursor:pointer;border-radius:2px;background:color-mix(in srgb, ${c} ${Math.round(Math.abs(v) * 85)}%, var(--surface-2))"></div>`;
          }
        }
        q('.hm').innerHTML = h + '</div>';
        q('.hm').querySelectorAll('.pc').forEach(c => c.addEventListener('click', () => show(Number(c.dataset.p), Number(c.dataset.j), d)));
      };
      q('.i-d').addEventListener('input', draw); q('.i-p').addEventListener('input', draw); draw();
    }},
    { type: 'p', html: `What did you see? The left columns (fast hands) change colour on every row; the right columns (slow hands) stay almost the same even over all 40 rows. The <em>whole pattern</em> of each row is unique, like every time on a clock. Set d = 4 and match it with the table above.` },
    { type: 'h2', text: 'The hidden bonus of sinusoidal: distance' },
    { type: 'callout', tone: 'term', title: 'New word: rotation (turning)', html: `<strong>What it is:</strong> turning a 2-number vector [x, y] around a circle by some angle, without changing its length. Formula: new = [x·cos a − y·sin a, x·sin a + y·cos a]. Example: turn [1, 0] by 90° (≈ 1.571 radians) and you get [0, 1].<br><strong>Why we need it:</strong> in sinusoidal encoding, "moving k positions ahead" = turning each pair by a fixed angle. RoPE (below) is built entirely on this.<br><strong>Without it:</strong> we could not describe relative distance with one simple rule that is the same everywhere.` },
    { type: 'callout', tone: 'term', title: 'A reminder: dot product', html: `<strong>What it is:</strong> multiply the numbers in the same positions of two vectors, and add them all. <code>[1, 2]·[3, 4] = 1×3 + 2×4 = 11</code>. (Interactive in the <a href="#/ai-transformer-overview">overview lesson</a>.)<br><strong>Why here:</strong> attention scores are made with dot products. So the dot product of two positions' PE vectors tells how "similar" they will look to attention.<br><strong>Without it:</strong> no way to measure "nearby positions are more similar".` },
    { type: 'p', html: `For the model, a more useful fact than "video is at position 7" is often "video is 2 tokens after xyz". Sinusoidal encoding gives this for free. Each pair (sin, cos) is a point on a circle. Moving k positions ahead = <strong>turning</strong> that point by the angle <code>k × (that pair's speed)</code>. Turning is a fixed matrix multiplication that does not depend on pos. This is why the paper chose sinusoids: so the model can learn relative position easily.` },
    { type: 'p', html: `One side effect: the <strong>dot product</strong> (similarity) of two positions' PE vectors depends only on their distance k, not on where we started. For d = 4 the formula is <code>cos(k) + cos(k/100)</code>:` },
    { type: 'table', head: ['Distance k', 'PE(0)·PE(k)', 'PE(1)·PE(1+k)', 'PE(5)·PE(5+k)'], rows: [
      ['0', '2.000', '2.000', '2.000'],
      ['1', '1.540', '1.540', '1.540'],
      ['2', '0.584', '0.584', '0.584'],
      ['3', '0.010', '0.010', '0.010'],
    ], caption: 'All three columns are the same: similarity depends only on distance.' },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>d_model</label><div class="dch" style="display:flex;gap:6px;flex-wrap:wrap"></div></div>
          <div><label>Start position p: <strong class="v-p">0</strong></label><input class="i-p" type="range" min="0" max="100" step="1" value="0"></div>
        </div>
        <svg class="sv" viewBox="0 0 340 170" style="width:100%;max-width:520px;display:block;margin-top:10px"></svg>
        <div class="calc-note o-n"></div>`;
      const q = c => el.querySelector(c);
      const PE = (pos, d) => Array.from({ length: d }, (_, j) => { const a = pos / Math.pow(10000, 2 * Math.floor(j / 2) / d); return j % 2 ? Math.cos(a) : Math.sin(a); });
      const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
      let d = 64;
      const ds = [4, 16, 64];
      q('.dch').innerHTML = ds.map(x => `<button type="button" class="chip" data-d="${x}">${x}</button>`).join('');
      const draw = () => {
        const p = Number(q('.i-p').value);
        q('.v-p').textContent = p;
        q('.dch').querySelectorAll('.chip').forEach(b => b.classList.toggle('on', Number(b.dataset.d) === d));
        const K = 30, vals = Array.from({ length: K + 1 }, (_, k) => dot(PE(p, d), PE(p + k, d)) / d);
        const bw = 320 / (K + 1);
        let s = `<line x1="10" y1="85" x2="330" y2="85" stroke="var(--line-2)" stroke-width="1"/>`;
        vals.forEach((v, k) => {
          const hgt = Math.abs(v) * 70, y = v >= 0 ? 85 - hgt : 85;
          s += `<rect x="${(10 + k * bw + 1).toFixed(1)}" y="${y.toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${Math.max(0.5, hgt).toFixed(1)}" rx="1" fill="${v >= 0 ? 'var(--accent)' : 'var(--red)'}"/>`;
        });
        s += `<text x="10" y="165" font-size="10" fill="var(--ink-3)" font-family="var(--f-mono)">k = 0</text><text x="330" y="165" text-anchor="end" font-size="10" fill="var(--ink-3)" font-family="var(--f-mono)">k = 30</text>`;
        q('.sv').innerHTML = s;
        const pick = [1, 2, 3, 10, 30].map(k => `k=${k}: ${(vals[k] * d).toFixed(2)}`).join(', ');
        q('.o-n').innerHTML = `Bars = PE(${p})·PE(${p}+k) ÷ d (so different d values can be compared). Raw dot products: ${pick}. Change the start position p: the bars do not move.`;
      };
      q('.dch').querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => { d = Number(b.dataset.d); draw(); }));
      q('.i-p').addEventListener('input', draw); draw();
    }},
    { type: 'p', html: `At d = 4 the bars go up and down in waves (there is only one fast hand, and it keeps turning back around: 0.01 at k = 3, then 1.28 again at k = 5). At d = 64 many hands together make a clear trend: nearby positions are more similar (30.92 at k = 1), far ones less (17.07 at k = 30). This is why real models need a big d.` },
    { type: 'h2', text: 'Diagram: where the position is added' },
    { type: 'flow', height: 290,
      nodes: [
        { id: 'tok', label: 'Tokens', sub: 'xyz, on, video', x: 90, y: 145, w: 140, kind: 'client', info: 'What it is: the prompt\'s tokens and their count (position). After the tokenizer we have ids and their positions: xyz = 0, on = 1, video = 2. Position is just a count; there is no vector yet.' },
        { id: 'emb', label: 'Embedding', sub: '"what" it is', x: 290, y: 70, w: 150, kind: 'data', info: 'What it is: the token\'s "meaning" vector. The row of the embedding table for the token id. It tells the meaning of the token, but nothing about position: "video" is the same vector everywhere.' },
        { id: 'pos', label: 'Position vec', sub: '"where" it is', x: 290, y: 230, w: 150, kind: 'cache', info: 'What it is: the token\'s "place" vector. A vector for each position. Sinusoidal: made by a formula, no training. Learned: a table learned during training (1,024 rows in GPT-2). In RoPE this vector is not added; Q and K are rotated instead.' },
        { id: 'add', label: 'X = E + P', sub: 'element-wise', x: 480, y: 128, w: 120, kind: 'server', info: 'What it is: the place where "what" and "where" meet. The two vectors are added number by number. The shape stays the same: n × d_model. Now each row holds both "what" and "where".' },
        { id: 'att', label: 'Attention', sub: 'sees order', x: 640, y: 145, w: 130, kind: 'server', info: 'What it is: the next step, where tokens look at each other. Self-attention now sees the same token at different positions as different, and can also catch the signal of relative distance.' },
      ],
      edges: [{ a: 'tok', b: 'emb' }, { a: 'tok', b: 'pos' }, { a: 'emb', b: 'add' }, { a: 'pos', b: 'add', id: 'pd' }, { a: 'add', b: 'att' }, { a: 'pos', b: 'att', id: 'pa', hidden: true, dashed: true }],
      scenarios: [
        { name: 'Sinusoidal (happy path)', steps: [
          { title: 'Two things come out', text: 'From each token: its id (for the embedding) and its position (0, 1, 2).', go: ['tok>emb', 'tok>pos'], parallel: true, msg: 'ids: [xyz, on, video]   positions: [0, 1, 2]' },
          { title: 'Position vectors', text: 'From the d = 4 formula: pos 0 = [0, 1, 0, 1], pos 1 = [0.841, 0.540, 0.010, 1.000], pos 2 = [0.909, −0.416, 0.020, 1.000].', focus: ['pos'], after: { pos: { state: 'ok', sub: 'sin / cos' } } },
          { title: 'Add them', text: 'Embedding + position. The vector of "video" now carries the stamp of position 2.', go: ['emb>add', 'pos>add'], parallel: true, after: { add: { state: 'ok' } }, msg: 'X[2] = E[video] + PE(2)' },
          { title: 'Attention gets the order', text: '"xyz on video" and "video on xyz" are now different inputs, so the outputs are different too.', go: 'add>att', after: { att: { state: 'hit', sub: 'order understood' } } },
        ]},
        { name: 'Failure: no PE', steps: [
          { title: 'Embedding only', text: 'We forgot the position vector.', set: { pos: { state: 'down', sub: 'missing' } }, go: 'tok>emb>add', msg: 'X = E   (no position)' },
          { title: 'Order-blind', text: 'Remember the table above: in both orders each token\'s output is the same. "Riya sent Aman" and "Aman sent Riya" look the same to the model.', go: 'add>att', after: { att: { state: 'miss', sub: 'order-blind' } } },
        ]},
        { name: 'Failure: learned limit', steps: [
          { title: 'Learned table', text: 'A GPT-2-like model: position vectors in a table with 1,024 rows (0 to 1,023), learned during training.', set: { pos: { label: 'Learned table', sub: '1,024 rows' } }, focus: ['pos'] },
          { title: 'Token number 1,025', text: 'The prompt has 1,025 tokens. There is no row for position 1,024 in the table. In code this is "index out of range"; that is why the model\'s max length is a hard limit.', go: 'bad:pos>tok', set: { pos: { state: 'down', sub: 'no row 1,024' } } },
          { title: 'Fix', text: 'Cut the input (truncate), or use a scheme that can make a vector for any position with a formula or rotation (sinusoidal, RoPE, ALiBi). But careful: being able to make a vector is one thing; the model working well beyond its training length is another.', set: { pos: { state: 'ok', sub: 'trimmed' } }, go: ['tok>pos', 'pos>add'] },
        ]},
        { name: 'RoPE variant', intro: 'Many open models today, like Llama, do not add position to the embedding. RoPE rotates Q and K inside attention.', steps: [
          { title: 'Nothing added to the embedding', text: 'X = embedding only. The position work happens inside attention.', hide: ['pd'], show: ['pa'], set: { add: { label: 'X = E', sub: 'no add', state: 'dim' }, pos: { label: 'RoPE angle', sub: 'pos × θ' } }, go: 'tok>emb>add>att' },
          { title: 'Rotate Q and K', text: 'In every layer, after Q and K are made, rotate the Q/K vector of the token at position m by the angle m × θ. Not V.', go: 'pos>att', after: { att: { state: 'ok', sub: 'rotated Q, K' } } },
          { title: 'Only distance in the score', text: 'The value of the rotated q·k depends only on (m − n). Check it yourself in the widget below.', focus: ['att'], after: { att: { state: 'hit', sub: 'relative' } } },
        ]},
      ],
    },
    { type: 'h2', text: 'Learned positions: a table instead of a formula' },
    { type: 'p', html: `The other road: make the position vectors a table too, just like the embedding (<code>max_positions × d_model</code>), and let training learn it. BERT (2018) has 512 positions, GPT-2 (2019) has 1,024. The 2017 paper tried both and got "nearly identical" results; it chose sinusoidal because it might also work for lengths longer than seen in training.` },
    { type: 'callout', tone: 'term', title: 'New word: learned position embedding', html: `<strong>What it is:</strong> a table with shape <code>max_positions × d_model</code>, just like the token embedding table. A token at position 2 comes, so take row 2 and add it. Training learns the numbers in the rows; there is no formula.<br><strong>Why we need it:</strong> it is simple, and the model decides by itself which position pattern is useful.<br><strong>Without it (using a formula instead):</strong> no problem; in the paper both gave almost the same results.<br><strong>The trouble:</strong> the table has a fixed number of rows. A token beyond max_positions has no row at all.` },
    { type: 'callout', tone: 'term', title: 'New word: extrapolation (length)', html: `<strong>What it is:</strong> the model saw at most 1,024 tokens in training, and now we give it 4,000 tokens. Will it still work well? This "working beyond training" is called <strong>length extrapolation</strong>.<br><strong>Why it matters:</strong> users send long documents and long chats.<br><strong>Without it:</strong> a learned table fails right away here (there is no row). Sinusoidal can still make the vector, but in practice quality often drops, because the model never trained on those patterns.` },

    { type: 'h2', text: 'RoPE: do not add, rotate' },
    { type: 'callout', tone: 'term', title: 'New word: Q and K (in one line)', html: `<strong>What it is:</strong> in attention, each token's vector makes two new vectors: <strong>Q</strong> (query: "what am I looking for") and <strong>K</strong> (key: "what do I have"). Their dot product = the score = how well they match.<br><strong>Why here:</strong> RoPE rotates exactly these two, so that the score carries position.<br><strong>Without it:</strong> RoPE will not make sense. The full story is in the <a href="#/ai-attention">next lesson</a>. Here, only this: score = q · k.` },
    { type: 'callout', tone: 'term', title: 'New word: RoPE (Rotary Position Embedding)', html: `<strong>What it is:</strong> instead of adding position to the vector, in every layer each pair of Q and K is <strong>rotated</strong> based on the position. The token at position m turns by the angle m × θ (each pair has its own speed θ).<br><strong>Why we need it:</strong> the dot product of two rotated vectors depends only on the <em>angle between them</em>, so the score directly carries the <strong>relative distance</strong> (m − n).<br><strong>Without it:</strong> we would add absolute positions, where the distance signal is indirect and "what" + "where" are mixed in one vector.<br><strong>Example:</strong> LLaMA and many open LLMs.` },
    { type: 'p', html: `<strong>RoPE</strong> (Rotary Position Embedding, Su et al., 2021, the "RoFormer" paper) is used in many open LLMs today; Meta's LLaMA (2023) uses it too. The idea: instead of <em>adding</em> position to the embedding, inside attention we <strong>rotate</strong> each token's <strong>Q</strong> and <strong>K</strong> vectors according to its position. The token at position m turns by the angle m × θ.` },
    { type: 'p', html: `Why is this magic? If q is turned by the angle mθ and k by the angle nθ, the angle between them changes by (m − n)θ. The dot product depends only on the angle between them. So the score carries <strong>only the relative distance</strong>, not the absolute position. Real RoPE splits the vector into pairs of 2 numbers, and each pair has its own speed θ<sub>i</sub> (the same range as sinusoidal). Play with one pair in 2D below: q = [1, 2], k = [2, 1], θ = 0.5 radian.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Query token position m: <strong class="v-m">2</strong></label><input class="i-m" type="range" min="0" max="12" step="1" value="2"></div>
          <div><label>Key token position n: <strong class="v-n">0</strong></label><input class="i-n" type="range" min="0" max="12" step="1" value="0"></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button type="button" class="btn small ghost b-sh">Shift both by +3</button><button type="button" class="btn small ghost b-rs">Reset (2, 0)</button></div>
        <svg class="sv" viewBox="-130 -130 260 260" style="width:100%;max-width:260px;display:block;margin:10px auto"></svg>
        <div class="stats">
          <div class="stat"><span>m − n</span><strong class="o-d"></strong></div>
          <div class="stat"><span>Rotated q · k (score)</span><strong class="o-s"></strong></div>
          <div class="stat"><span>q · k without rotation</span><strong>4.000</strong></div>
        </div>
        <div class="calc-note o-n"></div>`;
      const q = c => el.querySelector(c);
      const th = 0.5, Q = [1, 2], K = [2, 1];
      const rot = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
      const f = v => '[' + v.map(x => x.toFixed(3)).join(', ') + ']';
      const arrow = (v, col) => { const x = v[0] * 45, y = -v[1] * 45; return `<line x1="0" y1="0" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${col}" stroke-width="4" stroke-linecap="round"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${col}"/>`; };
      const draw = () => {
        const m = Number(q('.i-m').value), n = Number(q('.i-n').value);
        q('.v-m').textContent = m; q('.v-n').textContent = n;
        const qr = rot(Q, m * th), kr = rot(K, n * th), s = qr[0] * kr[0] + qr[1] * kr[1];
        q('.sv').innerHTML = `<circle cx="0" cy="0" r="100.6" fill="none" stroke="var(--line-2)" stroke-dasharray="3 4"/>` + arrow(qr, 'var(--accent)') + arrow(kr, 'var(--violet)') +
          `<text x="-124" y="-112" font-size="12" fill="var(--accent)" font-family="var(--f-mono)">q (pos ${m})</text><text x="-124" y="-96" font-size="12" fill="var(--violet)" font-family="var(--f-mono)">k (pos ${n})</text>`;
        q('.o-d').textContent = m - n;
        q('.o-s').textContent = s.toFixed(3);
        q('.o-n').innerHTML = `q turned ${m} × 0.5 = ${(m * th).toFixed(1)} rad → ${f(qr)}; k turned ${n} × 0.5 = ${(n * th).toFixed(1)} rad → ${f(kr)}. Score = ${s.toFixed(3)}.`;
      };
      q('.b-sh').addEventListener('click', () => { q('.i-m').value = Math.min(12, Number(q('.i-m').value) + 3); q('.i-n').value = Math.min(12, Number(q('.i-n').value) + 3); draw(); });
      q('.b-rs').addEventListener('click', () => { q('.i-m').value = 2; q('.i-n').value = 0; draw(); });
      q('.i-m').addEventListener('input', draw); q('.i-n').addEventListener('input', draw); draw();
    }},
    { type: 'p', html: `Try it: at (m, n) = (2, 0) the score is −0.363. Press "Shift both by +3": (5, 3), then (8, 6): the score stays −0.363, because the distance is still 2. At (3, 2) it is 2.072, at (0, 2) it is 4.686: the distance changed, so the score changed. This is RoPE's core promise. Long-context models often "stretch" RoPE's θ (like the 2023 position interpolation technique) to reach a context longer than in training, with a little extra training.` },

    { type: 'h2', text: 'ALiBi: a penalty for far tokens' },
    { type: 'callout', tone: 'term', title: 'New word: ALiBi (Attention with Linear Biases)', html: `<strong>What it is:</strong> subtract <code>slope × distance</code> from the attention score. The farther a key token is from the query, the lower its score. The <strong>slope</strong> is a fixed number that says how fast the penalty grows. A <strong>bias</strong> is an extra number added to (here, subtracted from) the score.<br><strong>Why we need it:</strong> no position vector, no table, nothing to train. Whatever the distance, the penalty comes from a formula, so it also works well on inputs longer than in training.<br><strong>Without it:</strong> we would get stuck at a max length like the learned table, or need extra scaling tricks like RoPE.<br><strong>Worked example:</strong> query at position 3, slope 0.5, and all four keys (0, 1, 2, 3) have a raw score of 2. Penalty = [−1.5, −1, −0.5, 0]. New scores = [0.5, 1, 1.5, 2]. Softmax = [0.1015, 0.1674, 0.2760, 0.4551]. Without ALiBi, each of the four would get 0.25; now the nearer ones get more.` },
    { type: 'p', html: `<strong>ALiBi</strong> (Attention with Linear Biases, Press et al., 2021): no position vector, no rotation. Just subtract <code>slope × distance</code> from the attention score: the farther the token, the bigger the penalty. Each head (a separate set of attention, see the <a href="#/ai-multihead">multi-head lesson</a>) has a different slope (with 8 heads: 1/2, 1/4, ..., 1/256). In the paper, a 1.3B model trained on 1,024 tokens also worked well on 2,048. The BLOOM model uses it.` },
    { type: 'callout', tone: 'tip', title: 'There are more ways', html: `T5 (2019) uses a "relative position bias": learned numbers for buckets of distance, added to the attention score. The idea is like ALiBi, but the numbers are learned. All of these are different answers to one question: "how do we tell attention about order?"` },
    { type: 'h2', text: 'All four ways, run them yourself' },
    { type: 'p', html: `All four ways in one place below. Pick a way and change the position: you will see, with numbers, what is being built <em>inside</em> each way. The embedding of the token "video" is the same <code>[0.5, −0.2, 0.1, 0.4]</code>. The learned table has only 8 rows (max_positions = 8; the numbers are seeded random, the same every time). RoPE rotates a query <code>q = [1, 0, 1, 0]</code>. ALiBi uses slope 0.5, and every key has a raw score of 2.` },
    { type: 'custom', render(el) {
      const E = [0.5, -0.2, 0.1, 0.4], modes = ['Sinusoidal', 'Learned', 'RoPE', 'ALiBi'];
      let s = 7; const u = () => { s = s * 16807 % 2147483647; return s / 2147483647; };
      const TB = Array.from({ length: 8 }, () => Array.from({ length: 4 }, () => Math.round((u() * 2 - 1) * 100) / 100));
      let mode = 0;
      el.innerHTML = `<div class="chips mch" style="display:flex;gap:6px;flex-wrap:wrap"></div>
        <div style="margin-top:10px"><label>Position p: <strong class="v-p">2</strong></label><input class="i-p" type="range" min="0" max="10" step="1" value="2"></div>
        <div class="out" style="margin-top:10px;overflow-x:auto"></div>
        <div class="calc-note o-pc"></div>`;
      const q = c => el.querySelector(c);
      q('.mch').innerHTML = modes.map((m, i) => `<button type="button" class="chip" data-i="${i}">${m}</button>`).join('');
      const f = v => { const r = Math.abs(v) < 0.0005 ? 0 : v; return r.toFixed(3).replace('-', '−'); };
      const vec = a => '[' + a.map(f).join(', ') + ']';
      const cell = (v, on, bad) => `<div style="padding:3px 6px;text-align:center;border-radius:4px;font:12px var(--f-mono);background:${bad ? 'var(--red)' : on ? 'var(--accent-soft)' : 'var(--surface-2)'};color:${bad ? 'var(--surface)' : on ? 'var(--accent-ink)' : 'var(--ink-2)'}">${v}</div>`;
      const PC = [
        'Gain: no training, a vector for any position from the formula. Cost: no quality guarantee on long lengths.',
        'Gain: simple, the model learns the pattern itself. Cost: no row beyond max_positions, a hard limit.',
        'Gain: relative distance goes straight into the score, no extra parameters. Cost: a context longer than training needs scaling + extra training.',
        'Gain: no vector, good on long lengths. Cost: far tokens are always weaker; the penalty is a fixed formula.',
      ];
      const draw = () => {
        const p = Number(q('.i-p').value);
        q('.v-p').textContent = p;
        q('.mch').querySelectorAll('.chip').forEach(b => b.classList.toggle('on', Number(b.dataset.i) === mode));
        let h = '';
        if (mode === 0) {
          const on = [Math.sin(p), Math.cos(p), Math.sin(p / 100), Math.cos(p / 100)];
          h = `<div class="calc-note">PE(${p}) = [sin(${p}), cos(${p}), sin(${p}/100), cos(${p}/100)] = <strong>${vec(on)}</strong><br>X = E + PE = ${vec(E)} + ${vec(on)} = <strong>${vec(E.map((v, i) => v + on[i]))}</strong></div>`;
        } else if (mode === 1) {
          h = `<div style="display:grid;grid-template-columns:36px repeat(4,58px);gap:3px;width:max-content">` + TB.map((r, i) => cell('row ' + i, i === p) + r.map(v => cell(f(v), i === p)).join('')).join('') + '</div>';
          h += p < 8 ? `<div class="calc-note">Took row ${p}: X = E + row ${p} = ${vec(E)} + ${vec(TB[p])} = <strong>${vec(E.map((v, i) => v + TB[p][i]))}</strong></div>`
            : `<div class="calc-note"><strong style="color:var(--red)">Error:</strong> there is no row for position ${p} in the table (only 0 to 7). The model cannot take this input at all.</div>`;
        } else if (mode === 2) {
          const a0 = p * 1, a1 = p / 100, rq = [Math.cos(a0), Math.sin(a0), Math.cos(a1), Math.sin(a1)];
          h = `<div class="calc-note">Nothing is added to the embedding: X = E = ${vec(E)}.<br>q = [1, 0, 1, 0]. Angle of pair 0 = ${p} × 1 = ${a0.toFixed(2)} rad, of pair 1 = ${p} × 0.01 = ${a1.toFixed(2)} rad.<br>Rotated q = [cos ${a0.toFixed(2)}, sin ${a0.toFixed(2)}, cos ${a1.toFixed(2)}, sin ${a1.toFixed(2)}] = <strong>${vec(rq)}</strong></div>`;
        } else {
          const P = Math.min(p, 7), ks = Array.from({ length: P + 1 }, (_, j) => j);
          const bias = ks.map(j => -0.5 * (P - j)), sc = bias.map(b => 2 + b);
          const m = Math.max(...sc), e = sc.map(v => Math.exp(v - m)), z = e.reduce((a, b) => a + b), w = e.map(v => v / z);
          h = `<div class="calc-note">Query position ${P}${p > 7 ? ' (max 7 in this demo)' : ''}. Keys 0 to ${P}.<br>Penalty = −0.5 × distance = [${bias.map(f).join(', ')}]<br>Score = 2 + penalty = [${sc.map(f).join(', ')}]</div>` +
            ks.map(j => `<div style="display:flex;align-items:center;gap:8px;margin:3px 0"><span style="width:52px;font:12px var(--f-mono);color:var(--ink-3)">key ${j}</span><div style="flex:1;max-width:240px;height:12px;background:var(--surface-2);border-radius:4px"><div style="width:${(w[j] * 100).toFixed(1)}%;height:100%;background:var(--accent);border-radius:4px"></div></div><span style="font:12px var(--f-mono)">${w[j].toFixed(4)}</span></div>`).join('') +
            `<div class="calc-note">Without ALiBi each key would get ${(1 / (P + 1)).toFixed(4)}.</div>`;
        }
        q('.out').innerHTML = h;
        q('.o-pc').textContent = PC[mode];
      };
      q('.mch').querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => { mode = Number(b.dataset.i); draw(); }));
      q('.i-p').addEventListener('input', draw); draw();
    }},
    { type: 'p', html: `Check it: Sinusoidal at p = 2 gives PE = [0.909, −0.416, 0.020, 1.000], which matches the table above. Learned at p = 2 gives X = [1.010, −0.110, 0.470, 0.670]; at p = 8 there is an error. RoPE at p = 0 does not turn q at all (angle 0). ALiBi at p = 3 gives the weights 0.1015, 0.1674, 0.2760, 0.4551, the same as the worked example.` },
    { type: 'h2', text: 'All the ways in one table' },
    { type: 'table', head: ['Way', 'Where the position goes', 'Longer than training?', 'Where you see it'], rows: [
      ['Sinusoidal (2017)', 'Added to the embedding (fixed formula)', 'The vector can be made, but quality is not guaranteed', 'Original Transformer'],
      ['Learned absolute', 'Added to the embedding (learned table)', 'No: there is no row beyond the table', 'BERT, GPT-2'],
      ['Relative bias', 'In the attention score (learned numbers per distance)', 'To some extent', 'T5'],
      ['RoPE (2021)', 'Rotates Q, K (in every layer)', 'A little; much further with scaling tricks + extra training', 'LLaMA and many open LLMs'],
      ['ALiBi (2021)', 'In the attention score: − slope × distance', 'Yes, this is the main point of the paper', 'BLOOM'],
    ]},
    { type: 'callout', tone: 'tip', title: 'Decide', html: `• Building your own small Transformer to learn → <strong>sinusoidal</strong> or <strong>learned</strong>; both are simple, and a fixed max length is fine.<br>• Building or fine-tuning a modern decoder LLM → keep whatever the base model uses (mostly <strong>RoPE</strong>). Changing the scheme = training the model again.<br>• Need a context longer than in training → RoPE scaling (like position interpolation) + some long-context training, or a scheme like ALiBi that was built for extrapolation from the start.<br>Are you an app developer (using an API)? This choice is not yours; just keep the model's <strong>context window</strong> limit in mind.` },
    { type: 'callout', tone: 'mistake', title: '"The position vector is added as a separate column"', html: `In sinusoidal/learned encoding, position is <strong>not a separate column</strong>: it is <em>added</em> into the same d_model numbers (E + P). The vector does not get longer. At first it feels strange that "what" and "where" are mixed into the same numbers, but with a big d the model learns to tell the two signals apart.` },
    { type: 'callout', tone: 'mistake', title: '"RoPE rotates V too"', html: `No. RoPE rotates only <strong>Q and K</strong>, because position should only affect "who looks at whom, and how much" (the score). V (the information that moves forward) stays as it is.` },
    { type: 'h2', text: 'The whole picture' },
    { type: 'p', html: `The position signal can go to two places: <strong>at the input</strong> (added to the embedding: sinusoidal, learned) or <strong>inside attention</strong> (rotate Q, K: RoPE; or a penalty on the score: ALiBi). Use the buttons to see the path of each way.` },
    { type: 'diagram', title: 'Positional encoding: the whole picture', height: 600,
      nodes: [
        { id: 'tok', label: 'Tokens', sub: 'xyz=0, on=1, video=2', x: 90, y: 170, w: 150, kind: 'client', info: 'What it is: the prompt\'s tokens and their positions (0, 1, 2 ...). Position is only a count for now; each way delivers this count to the model differently.' },
        { id: 'emb', label: 'Embedding', sub: '"what" it is', x: 290, y: 60, w: 150, kind: 'data', info: 'What it is: the token\'s meaning vector, from the table. It knows nothing about position: "video" is the same everywhere.' },
        { id: 'sin', label: 'Sinusoidal', sub: 'sin/cos formula', x: 290, y: 170, w: 150, kind: 'cache', info: 'What it is: a position vector made by a formula (the 2017 paper). Each pair is a clock hand with its own speed. No training, and it can be made for any position.' },
        { id: 'lrn', label: 'Learned table', sub: 'max rows fixed', x: 290, y: 280, w: 150, kind: 'cache', info: 'What it is: a learned table of position vectors (BERT 512 rows, GPT-2 1,024). Simple, but there is no row for a position beyond the table.' },
        { id: 'add', label: 'X = E + P', sub: 'absolute', x: 510, y: 170, w: 150, kind: 'server', info: 'What it is: the embedding and the position vector added number by number. In RoPE and ALiBi nothing is added here: X = E only.' },
        { id: 'qk', label: 'Make Q, K', sub: 'X·Wq, X·Wk', x: 620, y: 470, w: 150, kind: 'server', info: 'What it is: inside attention, making a query and a key vector from each token (multiplying by learned matrices). It happens in every layer.' },
        { id: 'rope', label: 'RoPE: rotate', sub: 'angle = pos × θ', x: 400, y: 400, w: 150, kind: 'edge', info: 'What it is: rotating each pair of Q and K according to position. V is not rotated. After this, q·k depends only on the relative distance.' },
        { id: 'alibi', label: 'ALiBi penalty', sub: '− slope × distance', x: 90, y: 360, w: 140, kind: 'threat', info: 'What it is: subtracting a penalty from the score based on distance. No vector; each head has its own slope. It works well on long inputs.' },
        { id: 'score', label: 'Scores q·k', sub: 'for the softmax', x: 180, y: 470, w: 150, kind: 'queue', info: 'What it is: the dot product of every query with every key. This is where position shows its effect: through X in absolute schemes, by rotation in RoPE, by the penalty in ALiBi.' },
        { id: 'out', label: 'Softmax · V', sub: 'order understood', x: 400, y: 545, w: 160, kind: 'data', info: 'What it is: weights from the scores, then a mix of V. Now the output knows the order: "Riya sent Aman" and "Aman sent Riya" come out different.' },
      ],
      edges: [
        { a: 'tok', b: 'emb' },
        { a: 'tok', b: 'sin' },
        { a: 'tok', b: 'lrn' },
        { a: 'emb', b: 'add' },
        { a: 'sin', b: 'add' },
        { a: 'lrn', b: 'add' },
        { a: 'add', b: 'qk', n: 1 },
        { a: 'qk', b: 'score', n: 2 },
        { a: 'qk', b: 'rope' },
        { a: 'rope', b: 'score' },
        { a: 'tok', b: 'alibi', dashed: true, label: 'distance' },
        { a: 'alibi', b: 'score' },
        { a: 'score', b: 'out', n: 3 },
      ],
      paths: [
        { name: 'Sinusoidal', text: 'A sin/cos vector made from the position is added to the embedding (X = E + PE). Attention gets the order only through X. The original 2017 Transformer.', go: ['tok>sin>add>qk>score>out', 'tok>emb>add'] },
        { name: 'Learned', text: 'The position\'s row comes from a learned table and is added to the embedding. BERT, GPT-2. When the table runs out of rows, that is the max length.', go: ['tok>lrn>add>qk>score>out', 'tok>emb>add'] },
        { name: 'RoPE', text: 'Nothing is added to the embedding. In every layer, Q and K are rotated by position × θ; the score carries the relative distance. LLaMA and many open LLMs.', go: ['tok>emb>add>qk>rope>score>out'] },
        { name: 'ALiBi', text: 'No vector, no rotation. Subtract slope × distance from the score; far tokens get less attention. BLOOM.', go: ['tok>emb>add>qk>score>out', 'tok>alibi>score'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Self-attention is order-blind: shuffle the tokens and the output is only shuffled. Position must be given separately.</li>
      <li>Sinusoidal: each pair is a clock hand, <code>sin/cos(pos / 10000^(2i/d))</code>. With d = 4, PE(0) = [0, 1, 0, 1].</li>
      <li>The sinusoidal bonus: PE(p)·PE(p+k) depends only on the distance k.</li>
      <li>Learned: a learned table (1,024 rows in GPT-2); there is no row beyond it.</li>
      <li>RoPE: rotate Q and K by pos × θ (not V); the score carries only relative distance. Most open LLMs today.</li>
      <li>ALiBi: score − slope × distance; no vector, works well on long inputs.</li>
      <li>For an app developer: the scheme comes with the model; you only need to watch the context window limit.</li>
    </ul>` },
    { type: 'tradeoffs', gains: [
      'Attention gets a signal for order and distance: "Riya sent Aman" ≠ "Aman sent Riya"',
      'Sinusoidal/RoPE: no extra parameters, it comes from a formula',
      'RoPE/ALiBi: relative distance goes straight into the score, better for long context',
    ], costs: [
      'Learned table: the max length is fixed, nothing for tokens beyond it',
      'With any scheme, quality may drop on lengths longer than in training',
      'The scheme is "tied" to the model: changing it means retraining',
      'In absolute schemes, "what" and "where" are mixed into one vector',
    ]},
    { type: 'think', questions: [
      { q: 'A model saw at most 2,048 tokens in training, and we give it an 8,000-token prompt (with RoPE, no scaling). What will happen?', a: 'The code will run (the rotation can be made for any position), but the model has never seen such big angles/distances, so quality often drops a lot. That is why RoPE scaling and long-context fine-tuning are used to grow the context.' },
      { q: 'In the sinusoidal formula, what could go wrong if we use 10 instead of 10000 (d = 512)?', a: 'Even the slowest hand will turn quickly (a wavelength of about 2π × 10 ≈ 63 positions), so in long sentences the vectors of far positions start repeating and the unique pattern is lost. A bigger base = a longer unique range.' },
      { q: 'In a decoder model with a causal mask, can the model guess some order even without positional encoding?', a: 'Yes, research shows that the causal mask itself gives some signal: position 5 can see only 6 tokens, position 50 can see 51. From this the model can estimate a count. But in practice almost every big model uses an explicit position scheme (often RoPE).' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Without positional encoding, what is the difference between the attention outputs of "xyz on video" and "video on xyz"?', options: ['Completely different numbers', 'Each token\'s output is the same; only the order of the rows changes', 'The model gives an error'], answer: 1, explain: 'Self-attention is permutation-equivariant: shuffle the input and the output is only shuffled. So the order signal must be given separately.' },
      { q: 'With d = 4 sinusoidal encoding, what is the PE vector of position 0?', options: ['[0, 0, 0, 0]', '[0, 1, 0, 1]', '[1, 0, 1, 0]'], answer: 1, explain: 'sin(0) = 0 and cos(0) = 1, for both pairs. So [0, 1, 0, 1].' },
      { q: 'What does RoPE rotate?', options: ['Only V', 'Q and K', 'The whole embedding, once at the input'], answer: 1, explain: 'RoPE rotates Q and K by position in every attention layer, so that q·k carries only the relative distance. V is not rotated.' },
      { q: 'Why can a GPT-2-like model with learned positions not take an input longer than 1,024?', options: ['The tokenizer fails', 'The position table has no rows beyond 1,024', 'Softmax overflow'], answer: 1, explain: 'Learned positions are a table of fixed size. The vector for position 1,024 was never learned.' },
      { q: 'How does ALiBi give the position signal?', options: ['By adding sin/cos to the embedding', 'By subtracting a penalty from the attention score based on distance', 'By rotating Q, K'], answer: 1, explain: 'ALiBi: score − slope × distance. No position vector. Its main benefit was working well on lengths longer than in training.' },
    ]},
    { type: 'sources', note: 'We calculated every number in the tables and widgets (PE values, dot products, RoPE scores, wavelength, learned-table rows, ALiBi weights) with a node script and matched them.', items: [
      { title: 'Attention Is All You Need', publisher: 'Vaswani et al., Google (arXiv 1706.03762)', year: 2017, official: true, url: 'https://arxiv.org/abs/1706.03762', used: 'Sinusoidal formula, the 10000 base, geometric wavelengths 2π to 10000·2π, the relative-position (linear function) motivation, learned vs sinusoidal nearly identical, extrapolation reasoning.' },
      { title: 'RoFormer: Enhanced Transformer with Rotary Position Embedding', publisher: 'Su et al. (arXiv 2104.09864)', year: 2021, official: true, url: 'https://arxiv.org/abs/2104.09864', used: 'RoPE: a rotation matrix encodes absolute position, relative dependency appears in self-attention, decay with distance.' },
      { title: 'Train Short, Test Long: Attention with Linear Biases Enables Input Length Extrapolation (ALiBi)', publisher: 'Press, Smith, Lewis (arXiv 2108.12409, ICLR 2022)', year: 2021, official: true, url: 'https://arxiv.org/abs/2108.12409', used: 'Distance-proportional penalty on attention scores, head slopes, a 1.3B model trained on 1,024 extrapolating to 2,048.' },
      { title: 'LLaMA: Open and Efficient Foundation Language Models', publisher: 'Touvron et al., Meta AI (arXiv 2302.13971)', year: 2023, official: true, url: 'https://arxiv.org/abs/2302.13971', used: 'LLaMA uses rotary embeddings instead of absolute positional embeddings.' },
      { title: 'Extending Context Window of Large Language Models via Positional Interpolation', publisher: 'Chen et al., Meta (arXiv 2306.15595)', year: 2023, official: true, url: 'https://arxiv.org/abs/2306.15595', used: 'Stretching RoPE positions plus short fine-tuning to extend the context.' },
      { title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding', publisher: 'Devlin et al., Google AI Language (arXiv 1810.04805)', year: 2018, official: true, url: 'https://arxiv.org/abs/1810.04805', used: 'Learned absolute position embeddings, up to 512 positions.' },
      { title: 'Language Models are Unsupervised Multitask Learners (GPT-2)', publisher: 'Radford et al., OpenAI', year: 2019, official: true, url: 'https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf', used: 'A context of 1,024 tokens with learned position embeddings.' },
    ]},
  ],
});
