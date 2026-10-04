Lesson.register({
  id: 'ai-transformer-overview',
  title: 'The Transformer: the big picture',
  minutes: 26,
  summary: `GPT, Claude, Gemini, Llama: all of them use the same design inside, the <strong>Transformer</strong>. First we see why the older RNNs were slow and forgetful, then the 2017 paper, then every box of the block diagram, the matrix shape at every step, and three families: encoder-only (BERT), decoder-only (GPT) and encoder-decoder (T5).`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Type a question to ChatGPT or Claude, and it writes the answer one word at a time. One machine inside does this job: the <strong>Transformer</strong>.<br>This machine looks at all the words of a sentence at the same time. Each word "asks" the other words to find its correct meaning, and then the machine guesses the next word.<br>In this lesson we see the full map of this machine: what each box does, and what the "size" of the numbers looks like at each step. The maths is only adding and multiplying, with small numbers.` },
    { type: 'h2', text: 'Where we are so far' },
    { type: 'p', html: `In the <a href="#/ai-what-is-llm">LLM lesson</a> we saw that the model does one job: <em>guess the next token</em>. In the <a href="#/ai-tokenization">tokenization lesson</a> we saw that text is split into tokens, each token becomes an id, and each id becomes an <strong>embedding</strong> vector (a list of numbers). xyz.com is building its "xyz Assistant". A user types: <code>how do I upload a video on xyz.com?</code>` },
    { type: 'callout', tone: 'term', title: 'New word: vector', html: `<strong>What it is:</strong> a simple list of numbers, like <code>[2, 0, 1, 0]</code>. The count of numbers in the list is the <strong>size</strong> (or dimension) of the vector. This one has size 4.<br><strong>Why we need it:</strong> a computer does not understand words, only numbers. Turn every token into a vector, and you can add, multiply and compare them.<br><strong>Without it:</strong> there is no way to compare words like "video" and "clip" with maths.<br><strong>Example:</strong> in GPT-2 small, each token's vector has 768 numbers. In this phase we use vectors of only 4 numbers, so we can work them out by hand.` },
    { type: 'callout', tone: 'term', title: 'New word: embedding (a reminder)', html: `<strong>What it is:</strong> a fixed vector for each token id, taken from a big table. If token id 42 comes, take row 42 of the table.<br><strong>Why we need it:</strong> a token id is only a name tag (42 has no link to 43). An embedding vector carries meaning: words with similar meanings have vectors close to each other.<br><strong>Without it:</strong> the model would never know that "video" and "clip" are similar.` },
    { type: 'p', html: `The question is: what happens <em>inside</em>, between these vectors, so that the model finally says the right next token? The name of this inside machine is the <strong>Transformer</strong>. In this phase (A2) we open it up with tiny numbers. This lesson gives the full map; the next lessons open one box each.` },
    { type: 'callout', tone: 'term', title: 'New word: Transformer', html: `<strong>What it is:</strong> a design (architecture) for a <strong>neural network</strong>, introduced in 2017. A neural network is a stack of <strong>layers</strong> (steps). Each layer multiplies and adds its input with learned numbers (weights) and passes the result on. A Transformer looks at all the tokens of a sentence <em>at the same time</em>, and each token "asks" the other tokens to update its own meaning. This "asking" trick is called <strong>attention</strong>.<br><strong>Why we need it:</strong> to guess the next token well, every word needs the context of the whole sentence.<br><strong>Without it:</strong> older models (RNNs) read one word at a time, in a line: slow, and they forgot long-range links. We will see this below.<br><strong>Example:</strong> GPT, Claude, Gemini and Llama are all built on the Transformer.` },

    { type: 'h2', text: 'Problem 1: the meaning of a word changes with context' },
    { type: 'p', html: `Look at two sentences:<br>1. <code>click on the video with the mouse</code><br>2. <code>in this video a mouse is looking for cheese</code><br>The token "mouse" is the same in both, so the embedding from the tokenization lesson is <em>exactly the same</em> vector. But in the first one it is a computer mouse, and in the second it is an animal. To answer well, the model must know the difference.` },
    { type: 'callout', tone: 'term', title: 'New word: static vs contextual embedding', html: `<strong>What it is:</strong> a <strong>static embedding</strong> is one fixed vector per token, whatever the sentence (taken straight from the table). A <strong>contextual embedding</strong> is that same vector, but changed after looking at the other words of the sentence.<br><strong>Why we need it:</strong> "mouse" has two meanings. The static vector is the same for both; the contextual vector becomes different depending on the sentence.<br><strong>Without it:</strong> the model would treat "mouse" as the same thing in every sentence and give wrong answers.<br>This is the whole job of a Transformer: static vectors go in, and after each layer they become more "context-aware".` },
    { type: 'p', html: `So we need a machine that rewrites every token using the context of the whole sentence. Before the Transformer, <strong>RNNs</strong> did this job. Understand their problem first; then the "why" of the Transformer design will make sense.` },
    { type: 'h2', text: 'The old way: RNN, read one word at a time' },
    { type: 'callout', tone: 'term', title: 'New word: RNN (Recurrent Neural Network)', html: `<strong>What it is:</strong> the model used before Transformers. It read a sentence from left to right, <em>one token at a time</em>. At each step it keeps a small vector called the <strong>hidden state</strong>: a "summary note" of everything read so far. When a new token comes, old note + new token = new note. The answer is made from the last note.<br><strong>Why it was used:</strong> it understood word order by itself, and it worked for inputs of any length.<br><strong>The trouble:</strong> slow and forgetful (see below). <strong>LSTM</strong> (1997) and <strong>GRU</strong> are improved versions of it.` },
    { type: 'ascii', text: `RNN:  "xyz.com" → [note1] → "on" → [note2] → "video" → [note3] → "upload" → [note4] ...
        step 2 cannot start before step 1 is finished

Transformer:  "xyz.com"  "on"  "video"  "upload"   ← all go in together
                 ↕         ↕       ↕         ↕
              every token can look directly at every other token (attention)`, caption: 'An RNN is like people standing in a line, whispering a message to the next person. A Transformer is like a group call where everyone can hear everyone directly.' },
    { type: 'callout', tone: 'term', title: 'New word: GPU and parallelism', html: `<strong>What it is:</strong> a <strong>GPU</strong> (graphics card) is a chip with thousands of small calculators (cores) that can multiply different numbers at the same time. Doing many jobs at the same time is called <strong>parallel</strong> work.<br><strong>Why we need it:</strong> most of the work in a neural network is "multiply and add lots of numbers". A GPU does this many times faster than a CPU.<br><strong>Without it (or without parallel work):</strong> if every calculation waits for the previous one (sequential), the thousands of GPU cores sit idle. This was the RNN's problem.` },
    { type: 'p', html: `The RNN had two big illnesses:` },
    { type: 'list', items: [
      `<strong>Slow (sequential)</strong>: step 50 can run only after step 49 is done. A <strong>GPU</strong> is great at doing thousands of small calculations at once (in parallel), but an RNN makes them stand in a line. Training on long documents was very slow.`,
      `<strong>Forgetful (long-range dependency)</strong>: something said at the start of a sentence reaches step 100 only through one small note that is overwritten again and again. On the way, the signal becomes weak. The same thing happens in training: the error signal shrinks as it travels back. This is called a <strong>vanishing gradient</strong>. LSTM improved this a lot, but did not fully fix it.`,
    ]},
    { type: 'callout', tone: 'term', title: 'New word: gradient and vanishing gradient', html: `<strong>What it is:</strong> during training the model looks at its mistake and asks, for every weight: "if I raise or lower this a little, will the mistake get smaller?" This answer (direction + how much) is called the <strong>gradient</strong>. This signal travels backwards from the output, layer by layer (or, in an RNN, step by step). If the signal gets a little smaller at every step, then after 100 steps it is almost zero. This is called a <strong>vanishing gradient</strong>.<br><strong>Why it matters:</strong> a weight that the gradient never reaches cannot learn.<br><strong>Without it (if the signal dies):</strong> an RNN cannot learn the link between the first words and the last words of a sentence.` },
    { type: 'p', html: `In the toy calculator below, make the sentence longer. "Sequential steps" tells how many jobs must run one after another, in a line (for one layer). "Path length" tells in how many hops the first token's message reaches the last token. "Signal left" is a <em>toy model</em>: assume only a part (the retention) survives each hop.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Sentence length (tokens): <strong class="v-n">20</strong></label><input class="i-n" type="range" min="2" max="200" step="1" value="20"></div>
          <div><label>Toy retention per hop: <strong class="v-r">0.9</strong></label><input class="i-r" type="range" min="0.5" max="0.99" step="0.01" value="0.9"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>RNN sequential steps</span><strong class="o-rs"></strong></div>
          <div class="stat"><span>Transformer sequential steps</span><strong class="o-ts"></strong></div>
          <div class="stat"><span>RNN path (first → last)</span><strong class="o-rp"></strong></div>
          <div class="stat"><span>Transformer path</span><strong class="o-tp"></strong></div>
          <div class="stat"><span>RNN signal left (toy)</span><strong class="o-sig"></strong></div>
          <div class="stat"><span>Attention scores per layer per head</span><strong class="o-sc"></strong></div>
        </div>
        <div class="calc-note o-note"></div>`;
      const n = el.querySelector('.i-n'), r = el.querySelector('.i-r');
      const upd = () => {
        const N = Number(n.value), R = Number(r.value);
        el.querySelector('.v-n').textContent = N;
        el.querySelector('.v-r').textContent = R.toFixed(2);
        el.querySelector('.o-rs').textContent = N;
        el.querySelector('.o-ts').textContent = 1;
        el.querySelector('.o-rp').textContent = (N - 1) + ' hops';
        el.querySelector('.o-tp').textContent = '1 hop';
        el.querySelector('.o-sig').textContent = (Math.pow(R, N - 1) * 100).toFixed(2) + '%';
        el.querySelector('.o-sc').textContent = (N * N).toLocaleString('en-IN');
        el.querySelector('.o-note').innerHTML = 'Signal = ' + R.toFixed(2) + '<sup>' + (N - 1) + '</sup>. In a Transformer the first token sees the last one directly, but there is a price: every token makes a score with every token, that is ' + N + ' × ' + N + ' = ' + (N * N).toLocaleString('en-IN') + ' scores. Double the length, 4 times the scores.';
      };
      n.addEventListener('input', upd); r.addEventListener('input', upd); upd();
    }},
    { type: 'p', html: `At the default (20 tokens, 0.9) only 13.51% of the signal is left in the RNN; at 100 tokens almost nothing. This is not exact physics, only intuition, but it was the point of the 2017 paper: in self-attention, the number of sequential operations and the path length are both O(1); in an RNN they are O(n).` },
    { type: 'h2', text: '2017: "Attention Is All You Need"' },
    { type: 'p', html: `In June 2017 a team from Google Brain and Google Research (Vaswani et al., 8 authors) published a paper: <em>Attention Is All You Need</em>. Before that (from 2014), attention was used <em>together with</em> RNNs, as a helper. This paper said: remove the RNN; attention (plus a few simple layers) is enough. The paper's task was <strong>machine translation</strong> (English → German, English → French).` },
    { type: 'list', items: [
      `28.4 BLEU on English→German (over 2 points better than the previous best) and 41.8 BLEU on English→French, the best single model at the time. <strong>BLEU</strong> is a standard score for translation quality (0-100): how close the machine translation is to a human translation. Higher is better.`,
      `Training took only 3.5 days on 8 GPUs (for the big model), much less than the competitors of that time. The reason: parallel training.`,
      `Settings of the base model: N = 6 layers, d_model = 512, 8 attention heads, 2048 inside the FFN. You do not need to remember these numbers now; the shape table below will explain them.`,
    ]},
    { type: 'callout', tone: 'term', title: 'New word: d_model', html: `<strong>What it is:</strong> how many numbers each token's vector has. 512 in the paper, 768 in GPT-2 small, several thousand in big modern models.<br><strong>Why we need it:</strong> more numbers = more room to remember things about each token (meaning, grammar, context).<br><strong>Without it (a very small d_model):</strong> too little room in the vector, so the model cannot catch fine differences. Very large: the model becomes expensive and slow.<br><strong>Example:</strong> in this phase we take <strong>d_model = 4</strong> so we can calculate by hand. Outside every layer, the token vector keeps this size.` },

    { type: 'h2', text: 'First, 5 minutes of maths: matrices and multiplying' },
    { type: 'p', html: `Inside a Transformer one job happens again and again: <strong>multiplying tables of numbers</strong>. From here on, each box will show a "shape", like <code>3 × 4</code>. So first learn three small things. If you have never seen a matrix, that is fine: you only need to know how to multiply and add.` },
    { type: 'callout', tone: 'term', title: 'New word: matrix and shape', html: `<strong>What it is:</strong> a table of numbers, in rows and columns. Its <strong>shape</strong> = (rows × columns). For example, 3 tokens, each with a vector of 4 numbers: stack them one below the other and you get a <code>3 × 4</code> matrix. Each row is one token.<br><strong>Why we need it:</strong> when all tokens sit together in one table, the GPU can work on all of them at the same time.<br><strong>Without it:</strong> we would work on each token separately, one after another: slow.<br><strong>Example:</strong><br><code>xyz&nbsp;&nbsp;&nbsp;[2, 0, 1, 0]</code><br><code>on&nbsp;&nbsp;&nbsp;&nbsp;[1, 0, 2, 0]</code><br><code>video&nbsp;[0, 2, 0, 1]</code> &nbsp;← 3 rows, 4 columns = shape 3 × 4<br>(These three tokens come from our tiny example prompt "xyz on video". The odd grammar is on purpose: it is a tiny made-up model that learned short app phrases like "xyz on video → watch". We use the same three tokens in every lesson of this phase.)` },
    { type: 'callout', tone: 'term', title: 'New word: dot product', html: `<strong>What it is:</strong> take two vectors of the same size. Multiply the numbers in the same positions, then add everything. You get one number.<br><code>[1, 2, 0] · [2, 0, 1] = 1×2 + 2×0 + 0×1 = 2</code><br><strong>Why we need it:</strong> it tells how much two vectors "match". If both have big numbers in the same places, the result is big.<br><strong>Without it:</strong> the model has no simple way to measure "how related is this token to that token". Attention runs on this.` },
    { type: 'callout', tone: 'term', title: 'New word: matrix multiply (A · B)', html: `<strong>What it is:</strong> many dot products at once. Each cell of the result = <em>one row of A</em> · <em>one column of B</em>. Row number i and column number j make cell (i, j) of the result.<br><strong>The shape rule:</strong> <code>(a × b) · (b × c) = (a × c)</code>. The two middle numbers (b) must be the same, or the multiply is not possible. The two outer numbers give the shape of the result.<br><strong>Why we need it:</strong> in one step, it "changes" every token's vector (for example, 4 numbers into 4 new numbers). Every layer of a Transformer does this.<br><strong>Without it:</strong> we would write a separate loop for every number, and lose the GPU's speed.` },
    { type: 'callout', tone: 'term', title: 'New word: transpose (ᵀ)', html: `<strong>What it is:</strong> "lay the matrix on its side": rows become columns. The transpose of a <code>3 × 4</code> matrix is <code>4 × 3</code>. Its sign is a small ᵀ, as in Kᵀ.<br><strong>Why we need it:</strong> sometimes the middle numbers must match for the shape rule. (3 × 4)·(3 × 4) is not possible, but (3 × 4)·(4 × 3) is.<br><strong>Without it:</strong> in attention, "the dot product of every token with every token" could not be done in one multiply.` },
    { type: 'p', html: `Now try it yourself. Below, A is 2 × 3 and B is 3 × 2, so the result C has shape 2 × 2. Click any cell of C: the row of A and the column of B that were used light up, and the sum is written out. Change any number in A or B, and C changes at once.` },
    { type: 'custom', render(el) {
      let A = [[1, 2, 0], [0, 1, 3]], B = [[2, 1], [0, 1], [1, 0]], si = 0, sj = 1;
      const mm = () => A.map(r => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
      const box = 'width:46px;padding:4px;text-align:center;border-radius:6px;font:14px var(--f-mono);border:1px solid var(--line-2);';
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start">
          <div><div class="calc-note" style="margin:0 0 4px">A (2 × 3)</div><div class="ga" style="display:grid;grid-template-columns:repeat(3,auto);gap:4px"></div></div>
          <div style="align-self:center;font:20px var(--f-mono);color:var(--ink-3)">·</div>
          <div><div class="calc-note" style="margin:0 0 4px">B (3 × 2)</div><div class="gb" style="display:grid;grid-template-columns:repeat(2,auto);gap:4px"></div></div>
          <div style="align-self:center;font:20px var(--f-mono);color:var(--ink-3)">=</div>
          <div><div class="calc-note" style="margin:0 0 4px">C (2 × 2): click a cell</div><div class="gc" style="display:grid;grid-template-columns:repeat(2,auto);gap:4px"></div></div>
        </div>
        <div class="calc-note o-n"></div>`;
      const q = c => el.querySelector(c);
      const hi = on => on ? 'background:var(--accent-soft);color:var(--accent-ink);border-color:var(--accent);' : 'background:var(--surface-2);color:var(--ink);';
      const build = () => {
        q('.ga').innerHTML = A.map((r, i) => r.map((v, k) => `<input type="number" step="1" data-m="a" data-i="${i}" data-k="${k}" value="${v}" style="${box}${hi(i === si)}">`).join('')).join('');
        q('.gb').innerHTML = B.map((r, k) => r.map((v, j) => `<input type="number" step="1" data-m="b" data-k="${k}" data-j="${j}" value="${v}" style="${box}${hi(j === sj)}">`).join('')).join('');
        el.querySelectorAll('input').forEach(inp => inp.addEventListener('change', () => {
          const v = Number(inp.value) || 0;
          if (inp.dataset.m === 'a') A[+inp.dataset.i][+inp.dataset.k] = v; else B[+inp.dataset.k][+inp.dataset.j] = v;
          build();
        }));
        const C = mm();
        q('.gc').innerHTML = C.map((r, i) => r.map((v, j) => `<button type="button" data-i="${i}" data-j="${j}" style="${box}cursor:pointer;${hi(i === si && j === sj)}">${v}</button>`).join('')).join('');
        q('.gc').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { si = +b.dataset.i; sj = +b.dataset.j; build(); }));
        const row = A[si], col = B.map(r => r[sj]);
        q('.o-n').innerHTML = `C[${si}][${sj}] = row ${si} of A · column ${sj} of B = [${row.join(', ')}] · [${col.join(', ')}] = ${row.map((v, k) => v + '×' + col[k]).join(' + ')} = <strong>${C[si][sj]}</strong>.<br>Shape rule: (2 × <strong>3</strong>) · (<strong>3</strong> × 2) = (2 × 2). Both middle numbers are 3, so the multiply works.`;
      };
      build();
    }},
    { type: 'p', html: `With the default numbers, C = <code>[[2, 3], [3, 1]]</code>. For example, C[0][1] = [1, 2, 0]·[1, 1, 0] = 1×1 + 2×1 + 0×0 = 3. That is all the maths in the whole Transformer. The tables are just much bigger (like 768 × 768), and this multiply happens billions of times.` },
    { type: 'callout', tone: 'mistake', title: 'Beginner mistake: "matrix multiply = multiply cell by cell"', html: `No. In A·B, a <em>row</em> of A meets a <em>column</em> of B (a dot product). So the order matters too: A·B and B·A are usually different, or one of them is not even possible because of the shapes. In the example above, A·B has shape 2 × 2, but B·A has shape 3 × 3.` },
    { type: 'h2', text: 'Block diagram: one box at a time' },
    { type: 'p', html: `Most chat models today (the GPT series, Llama, Gemini and others) are <strong>decoder-only</strong> Transformers (we explain the families below). Their map:` },
    { type: 'ascii', text: `"xyz.com on video"          ← text
      │ tokenizer
[ 7, 15, 42 ]               ← token ids            shape: (n)
      │ embedding lookup
Embeddings                   ← a vector for each id  shape: (n × d_model)
      + Positional encoding  ← "which token is at which position"
      │
┌──────────── × N layers (same design in every layer, different weights) ──┐
│  Masked self-attention   ← each token looks at the earlier tokens        │
│  Add & Norm              ← residual (add the input back) + LayerNorm     │
│  Feed-forward (FFN)      ← a small neural net on each token separately   │
│  Add & Norm                                                              │
└──────────────────────────────────────────────────────────────────────────┘
      │                                              shape: (n × d_model)
Linear (unembedding)         ← vector → a score for every vocab token (logits)
      │                                              shape: (n × vocab)
Softmax                      ← scores → probabilities, pick the next token`, caption: 'The token id numbers are only an example. In the shapes, n = the number of tokens.' },
    { type: 'p', html: `Now each new word, one by one:` },
    { type: 'callout', tone: 'term', title: 'New word: embedding layer', html: `<strong>What it is:</strong> a big table with shape <code>vocab_size × d_model</code>. If token id 42 comes, take row 42. It is only a lookup, no multiplying.<br><strong>Why we need it:</strong> to turn a token id into a vector that carries meaning. The rows are learned during training.<br><strong>Without it:</strong> the model would only have ids, with no relation between them. (Details: <a href="#/ai-tokenization">tokenization lesson</a>.)` },
    { type: 'callout', tone: 'term', title: 'New word: positional encoding (PE)', html: `<strong>What it is:</strong> a vector for each position (0, 1, 2, ...), added to the embedding of the token at that position.<br><strong>Why we need it:</strong> attention does not know word order by itself. To it, "xyz on video" and "video on xyz" look the same.<br><strong>Without it:</strong> "Riya sent Aman a video" and "Aman sent Riya a video" would look the same to the model. Full lesson: <a href="#/ai-positional-encoding">Positional encoding</a>.` },
    { type: 'callout', tone: 'term', title: 'New word: self-attention (and masked)', html: `<strong>What it is:</strong> each token "asks" the other tokens which of them matter to it, and how much. Then it takes a mix (a weighted average) of their information and updates its own vector. In <strong>masked</strong> self-attention a token can only see the tokens <em>before</em> it, not the ones after it.<br><strong>Why we need it:</strong> so that "video" learns it is a video on "xyz.com". The mask is there so that a model learning to guess the next word cannot look ahead and "copy" it.<br><strong>Without it:</strong> each token would stay alone and never get context.<br>The full calculation by hand: <a href="#/ai-attention">Self-attention lesson</a>. Many attentions at once (heads): <a href="#/ai-multihead">Multi-head lesson</a>.` },
    { type: 'callout', tone: 'term', title: 'New word: residual connection ("Add")', html: `<strong>What it is:</strong> the output of a layer = <em>the layer's input</em> + <em>what the layer produced</em>. Like "track changes" in a document: the original text stays, and the layer only adds its edits on top.<br><strong>Why we need it:</strong> the original information is never lost, and the training signal (gradient) travels back easily along this "straight road". This is how a stack of 50-100 layers can be trained.<br><strong>Without it:</strong> in a deep stack the signal gets weak (vanishing gradient) and training gets stuck.<br><strong>Example:</strong> input [1, 0, 2, 0], the layer produced [0.2, 0.1, −0.3, 0]. Output = [1.2, 0.1, 1.7, 0].` },
    { type: 'callout', tone: 'term', title: 'New word: LayerNorm ("Norm")', html: `<strong>What it is:</strong> it brings the numbers of each token's vector into a standard range: average about 0 and spread about 1 (then adjusts them a little with two learned numbers). Like putting marks from different teachers onto one common scale.<br><strong>Why we need it:</strong> so that after 48 layers the numbers do not blow up (become huge) or shrink (become tiny).<br><strong>Without it:</strong> training becomes unstable; numbers overflow or the loss jumps around.<br><strong>Where it goes:</strong> in the original paper, <em>after</em> each sublayer (post-norm). In GPT-2 and most modern models, <em>before</em> it (pre-norm), which keeps training more stable. "Add & Norm" = residual + LayerNorm as a pair.` },
    { type: 'callout', tone: 'term', title: 'New word: feed-forward network (FFN)', html: `<strong>What it is:</strong> a small network that runs on each token's vector <em>separately</em> (without looking at other tokens): first make the vector bigger (paper: 512 → 2048), apply a <strong>non-linearity</strong>, then make it small again (2048 → 512). A non-linearity is a simple rule like <strong>ReLU</strong>: "if the number is negative, make it 0" (GPT-2 uses a smoother version called <strong>GELU</strong>).<br><strong>Why we need it:</strong> attention mixes information <em>between</em> tokens; the FFN processes that information <em>inside</em> each token. Most of the model's parameters (learned numbers) are here, and many "facts" are believed to be stored here.<br><strong>Without it (or without the non-linearity):</strong> all the layers together would be just one big multiply, unable to learn complex patterns.` },
    { type: 'callout', tone: 'term', title: 'New word: logits and Linear + Softmax (output head)', html: `<strong>What it is:</strong> the last layer's vector (d_model numbers) is multiplied by a matrix that turns it into <strong>vocab_size</strong> scores: one score for every possible next token. These raw scores are called <strong>logits</strong>. <strong>Softmax</strong> turns them into probabilities (each from 0 to 1, total 1).<br><strong>Why we need it:</strong> in the end the model must pick one token. Sampling uses these probabilities (<a href="#/ai-what-is-llm">LLM lesson</a>).<br><strong>Without it:</strong> we would have a vector, but no answer to "which word comes next".<br><strong>Note:</strong> in training, not only the last position but every position predicts its own "next token".` },
    { type: 'h2', text: 'Run it: the path of the data' },
    { type: 'p', html: `Click each box to read its role. Switch scenarios: normal generation, training, and two failure cases.` },
    { type: 'flow', height: 290,
      nodes: [
        { id: 'tok', label: 'Tokens', sub: 'ids (n)', x: 100, y: 70, w: 150, kind: 'client', info: 'What it is: the tokens of the user\'s text, as numbers (ids). The tokenizer split the text into token ids. Say "xyz.com on video" is 3 tokens. Shape: n = 3 numbers.' },
        { id: 'emb', label: 'Embedding + PE', sub: 'n × d_model', x: 340, y: 70, w: 160, kind: 'data', info: 'What it is: the step where each id becomes a vector. Take each id\'s row from the embedding table (a static vector), then add the vector for its position. Now each token is a vector of size d_model that holds both "what" and "where".' },
        { id: 'att', label: 'Self-attention', sub: '+ Add & Norm', x: 590, y: 70, w: 160, kind: 'server', info: 'What it is: the part where tokens talk to each other. Each token looks at the other tokens and updates its vector (a weighted mix). In a decoder it is masked: only earlier tokens. Then residual add + LayerNorm. The shape stays the same: n × d_model.' },
        { id: 'ffn', label: 'Feed-forward', sub: '+ Add & Norm', x: 590, y: 220, w: 160, kind: 'server', info: 'What it is: each token\'s own small "thinking" network. A small 2-layer network runs on each token\'s vector separately (d_model → 4·d_model → d_model). Then residual + LayerNorm. Attention + FFN = one layer. This pair repeats N times (GPT-2 small: 12 times).' },
        { id: 'head', label: 'Linear+Softmax', sub: 'n × vocab', x: 340, y: 220, w: 160, kind: 'cache', info: 'What it is: the output head, which turns a vector into "chances for the next token". Turn the last vector into vocab_size scores (logits), then softmax gives probabilities. In generation, only the row of the last position is used to pick the next token.' },
        { id: 'out', label: 'Next token', sub: 'sample', x: 100, y: 220, w: 150, kind: 'queue', info: 'What it is: the model\'s answer, one token. One token is picked from the probabilities (greedy or sampling). Add it to the end of the input and do the whole job again: this is called autoregressive generation.' },
      ],
      edges: [{ a: 'tok', b: 'emb' }, { a: 'emb', b: 'att' }, { a: 'att', b: 'ffn' }, { a: 'ffn', b: 'head' }, { a: 'head', b: 'out' }, { a: 'out', b: 'tok', dashed: true }],
      scenarios: [
        { name: 'Generation (happy path)', steps: [
          { title: 'From text to ids', text: 'The user\'s prompt becomes tokens. 3 tokens, 3 ids.', focus: ['tok'], set: { tok: { sub: '[xyz, on, video]' } }, msg: '"xyz.com on video"  →  [7, 15, 42]   (ids are illustrative)' },
          { title: 'Embedding + position', text: 'A vector for each id, plus a vector for its position. Now we have one matrix: 3 rows (tokens) × d_model columns.', go: 'tok>emb', after: { emb: { state: 'ok', sub: '3 × 4' } }, msg: 'X = E[ids] + PE[0..2]     shape (3 × 4)' },
          { title: 'Attention: tokens talk to each other', text: '"video" gets context from "xyz.com". The shape does not change; only the numbers (the meaning) change.', go: 'emb>att', after: { att: { state: 'ok' } }, msg: 'X = X + Attention(LayerNorm(X))   (3 × 4)' },
          { title: 'FFN: each token thinks on its own', text: 'Each token\'s vector is processed separately. Layer 1 is done.', go: 'att>ffn', after: { ffn: { state: 'ok' } }, msg: 'X = X + FFN(LayerNorm(X))   (3 × 4)' },
          { title: 'N layers', text: 'The same attention + FFN pair runs N times (with different weights each time). After each layer the vectors are more context-aware.', go: ['ffn>att', 'att>ffn'], msg: 'layer 1 → layer 2 → ... → layer N' },
          { title: 'Logits and softmax', text: 'The row of the last token ("video") becomes vocab scores, and softmax turns them into probabilities.', go: 'ffn>head', after: { head: { state: 'ok' } }, msg: 'logits (1 × vocab) → softmax → {"upload": 0.41, "how": 0.22, ...}   (illustrative)' },
          { title: 'Pick a token, loop back', text: '"upload" was picked and added to the end of the input. Now the whole trip runs again with 4 tokens. This is why the answer comes token by token.', go: ['head>out', 'evt:out>tok'], after: { out: { state: 'hit', sub: '"upload"' }, tok: { sub: '4 tokens' } } },
        ]},
        { name: 'Training (parallel)', intro: 'In training the whole sentence is already known. The model predicts the next token at every position at the same time.', steps: [
          { title: 'The whole sentence at once', text: 'All tokens of "xyz.com on video upload" go in together. No loop.', go: 'tok>emb>att', msg: 'input:  [xyz.com, on, video]\ntarget: [on, video, upload]' },
          { title: 'The mask stops cheating', text: 'Because attention is masked, the position of "on" (whose target is "video") cannot see the "video" token ahead of it. Otherwise it would copy the answer. This is why parallel training is safe.', set: { att: { state: 'warn', sub: 'causal mask' } }, go: 'att>ffn>head' },
          { title: 'A loss at every position', text: 'At every position we check "with what probability did it say the right next token". All three errors are computed together on the GPU. An RNN would do them in a line.', after: { head: { state: 'ok', sub: '3 predictions' } }, focus: ['head'] },
        ]},
        { name: 'Failure: no position', steps: [
          { title: 'PE forgotten', text: 'Suppose we did not add the positional encoding.', set: { emb: { state: 'warn', sub: 'embedding only' } }, go: 'tok>emb', msg: '"xyz.com on video"  vs  "video on xyz.com"' },
          { title: 'Order is gone', text: 'To attention, both sentences are the same "bag" of tokens. Each token\'s output vector comes out the same in both; only the rows swap places. The meaning changed, and the model did not notice.', go: 'emb>att', after: { att: { state: 'miss', sub: 'order-blind' } } },
          { title: 'Fix', text: 'Add a unique vector for each position (sinusoidal, learned, or a rotation like RoPE). The full story is in the next lesson.', set: { emb: { state: 'ok', sub: '+ position' }, att: { state: '', sub: '+ Add & Norm' } }, focus: ['emb'] },
        ]},
        { name: 'Failure: context full', steps: [
          { title: 'Input too long', text: 'xyz Assistant put a 2,000-token help-docs file into the prompt. The model\'s max length (context window) is 1,024 (like GPT-2).', go: 'tok>emb', set: { tok: { sub: '2,000 tokens' } } },
          { title: 'Nothing after position 1,024', text: 'The learned position table has only 1,024 rows. Tokens after that have no position vector, and attention\'s n × n is also very big. The API returns an error, or the app has to cut the text.', go: 'bad:emb>tok', set: { emb: { state: 'down', sub: 'limit 1,024' } } },
          { title: 'Fix on the app side', text: 'Make the prompt shorter: send only the relevant part (RAG), summarize old messages. This is context engineering (phase A4).', set: { emb: { state: 'ok', sub: 'n × d_model' }, tok: { sub: 'trimmed' } }, go: 'tok>emb>att' },
        ]},
      ],
    },
    { type: 'h2', text: 'What is the shape at each step?' },
    { type: 'p', html: `The most useful thing in an interview (and when you debug code): the <strong>shape</strong> of the matrix after each step (how many rows × how many columns). Our tiny example: n = 3 tokens, d_model = 4. For a real comparison, GPT-2 small (2019): d_model = 768, 12 layers, vocab 50,257, max 1,024 tokens.` },
    { type: 'callout', tone: 'term', title: 'New word: Q, K, V and head (in one line)', html: `<strong>What it is:</strong> inside attention, each token's vector makes three new vectors: <strong>Q</strong> (query: "what am I looking for"), <strong>K</strong> (key: "what do I have") and <strong>V</strong> (value: "what information will I give"). One <strong>head</strong> = one full set of attention (with its own Q, K, V). Big models run many heads at the same time.<br><strong>Why we need it:</strong> the dot product of Q and K tells who should look at whom, and how much; V carries the real information.<br><strong>Without it:</strong> attention could not make its scores. The full calculation: <a href="#/ai-attention">self-attention lesson</a>.` },
    { type: 'table', head: ['Step', 'Tiny (n=3, d=4)', 'GPT-2 small (n tokens)', 'What it is'], rows: [
      ['Token ids', '(3)', '(n)', 'Just integers'],
      ['Embedding + PE = X', '(3 × 4)', '(n × 768)', 'One row per token'],
      ['Q, K, V (one head)', '(3 × 4) each', '(n × 64) per head, 12 heads', 'X multiplied by three different matrices'],
      ['Attention scores QKᵀ', '(3 × 3)', '(n × n) per head', 'A score from every token to every token'],
      ['Attention output', '(3 × 4)', '(n × 768)', 'Back to d_model, so the residual can be added'],
      ['Inside the FFN', '(3 × 16)', '(n × 3072)', 'Widened to 4 × d_model'],
      ['FFN out / layer output', '(3 × 4)', '(n × 768)', 'Same shape after every layer'],
      ['Logits', '(3 × vocab)', '(n × 50,257)', 'A score for every token at every position'],
      ['Next-token probabilities', '(vocab)', '(50,257)', 'In generation, only the last row'],
    ], caption: 'Inside a layer the shape changes (Q/K/V, n × n, FFN), but outside every layer it is always n × d_model. This is why layers can be stacked.' },
    { type: 'callout', tone: 'term', title: 'New word: parameters, weights and bias', html: `<strong>What it is:</strong> <strong>parameters</strong> = all the learned numbers inside the model. Two kinds: <strong>weights</strong> (the numbers in the matrices we multiply by) and <strong>bias</strong> (one extra number added to each output, like "+ 0.1").<br><strong>Why we need it:</strong> these are the numbers that change during training; all the model's "knowledge" is in them.<br><strong>Without it:</strong> the model could not learn anything. The count tells how big the model is and how much memory it needs.<br><strong>Example:</strong> one 4 × 4 weight matrix = 16 parameters; with 4 biases = 20.` },
    { type: 'p', html: `Change the numbers in the calculator below. It assumes a GPT-2-like decoder-only model: learned positions, FFN = 4 × d_model, biases, and an output head that reuses the embedding table (<strong>weight tying</strong>). With the GPT-2 small preset the total is 124,439,808 (that is, 124.4 million), which matches the well-known "124M" size of GPT-2 small.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">
          <button type="button" class="btn small ghost p-tiny">Tiny (ours)</button>
          <button type="button" class="btn small ghost p-g2">GPT-2 small</button>
          <button type="button" class="btn small ghost p-xl">GPT-2 XL</button>
        </div>
        <div class="row2">
          <div><label>Tokens in prompt (n)</label><input class="i-n" type="number" min="1" value="3"></div>
          <div><label>d_model</label><input class="i-d" type="number" min="1" value="4"></div>
          <div><label>Layers (N)</label><input class="i-l" type="number" min="1" value="1"></div>
          <div><label>Vocab size</label><input class="i-v" type="number" min="1" value="10"></div>
          <div><label>Max positions (context)</label><input class="i-c" type="number" min="1" value="8"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>X shape</span><strong class="o-x"></strong></div>
          <div class="stat"><span>Scores per head</span><strong class="o-s"></strong></div>
          <div class="stat"><span>Logits shape</span><strong class="o-lg"></strong></div>
          <div class="stat"><span>Params per layer</span><strong class="o-pl"></strong></div>
          <div class="stat"><span>Embedding + position params</span><strong class="o-on"></strong></div>
          <div class="stat"><span>Total params</span><strong class="o-t"></strong></div>
        </div>
        <div class="calc-note o-note"></div>`;
      const q = c => el.querySelector(c);
      const v = c => Math.max(1, Math.floor(Number(q(c).value) || 1));
      const f = x => x.toLocaleString('en-IN');
      const upd = () => {
        const n = v('.i-n'), d = v('.i-d'), L = v('.i-l'), V = v('.i-v'), C = v('.i-c');
        const att = 4 * d * d + 4 * d, ffn = 8 * d * d + 5 * d, ln = 4 * d, layer = att + ffn + ln;
        const emb = V * d, pos = C * d, total = emb + pos + L * layer + 2 * d;
        q('.o-x').textContent = n + ' × ' + d;
        q('.o-s').textContent = n + ' × ' + n;
        q('.o-lg').textContent = n + ' × ' + f(V);
        q('.o-pl').textContent = f(layer);
        q('.o-on').textContent = f(emb + pos);
        q('.o-t').textContent = f(total);
        q('.o-note').innerHTML = 'One layer = attention ' + f(att) + ' (Wq, Wk, Wv, Wo: 4·d² + biases) + FFN ' + f(ffn) + ' (8·d² + biases) + LayerNorm ' + f(ln) + '. The layers hold ' + Math.round(100 * L * layer / total) + '% of the parameters.' + (n > C ? ' <strong>Warning:</strong> n is bigger than the context, so this model cannot take such a long input.' : '');
      };
      const preset = (a) => { ['.i-n', '.i-d', '.i-l', '.i-v', '.i-c'].forEach((c, i) => { q(c).value = a[i]; }); upd(); };
      q('.p-tiny').onclick = () => preset([3, 4, 1, 10, 8]);
      q('.p-g2').onclick = () => preset([3, 768, 12, 50257, 1024]);
      q('.p-xl').onclick = () => preset([3, 1600, 48, 50257, 1024]);
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Notice two things. (1) Double d_model and the parameters per layer grow about 4 times (because of d²). (2) The GPT-2 XL preset (d = 1,600, 48 layers) gives 1,557,611,200 (about 1.56 billion), which is called the "1.5B" GPT-2 model. The tiny model has only 324 parameters, few enough to count by hand.` },
    { type: 'h2', text: 'Three families: encoder, decoder, both' },
    { type: 'p', html: `The original 2017 model was built for translation, so it had two parts: an <strong>encoder</strong> (to read the input sentence) and a <strong>decoder</strong> (to write the output sentence). Later, people started taking out one part and using it alone.` },
    { type: 'callout', tone: 'term', title: 'New word: encoder and decoder', html: `<strong>What it is:</strong> the <strong>encoder</strong> is the reading part. It reads the whole input at once, and each token can look both <em>forwards and backwards</em> (bidirectional). Output: a well-informed vector for each token. The <strong>decoder</strong> is the writing part. It writes one token at a time, and each token can only see the <em>earlier</em> tokens (causal mask).<br><strong>Why we need it:</strong> in translation, we first need to understand the whole English sentence (encoder), and then write the Hindi one word at a time (decoder).<br><strong>Without it:</strong> if one part did both jobs, either reading would lose the context from both sides, or writing would see the future.` },
    { type: 'callout', tone: 'term', title: 'New word: cross-attention', html: `<strong>What it is:</strong> an extra attention inside the decoder, where the decoder's tokens look at <em>the encoder's output</em>. The question (Q) comes from the decoder; the ones that answer (K, V) come from the encoder.<br><strong>Why we need it:</strong> while writing the next Hindi word, the decoder must know what the English sentence said.<br><strong>Without it:</strong> the decoder would only see the words it has written itself, with no link to the input sentence. Details: <a href="#/ai-multihead">multi-head lesson</a>.` },
    { type: 'table', head: ['Family', 'Famous models', 'Attention', 'Training task', 'Good for'], rows: [
      ['Encoder-only', 'BERT (2018), RoBERTa', 'Bidirectional (everyone sees everyone)', 'Masked LM: hide some tokens in the middle, guess them', 'Classification, search embeddings, spam/sentiment detection. Does not generate text.'],
      ['Decoder-only', 'GPT series, Llama, Gemini (most public chat LLMs today)', 'Causal (only earlier tokens)', 'Next-token prediction', 'Chat, writing, code, agents. Almost any task with one design, through the prompt.'],
      ['Encoder-decoder', 'Original Transformer (2017), T5 (2019), BART', 'Bidirectional encoder + causal decoder + cross-attention', 'Input → output text (translation, "summarize: ...")', 'Translation, summarization, where input and output are clearly separate'],
    ]},
    { type: 'h3', text: 'Inside the original 2017 model: encoder + decoder' },
    { type: 'p', html: `Suppose xyz.com wants to translate video titles from English to Hindi. Title: <code>how to upload a video</code>. The original Transformer would do it like this:` },
    { type: 'steps', items: [
      { t: 'The encoder reads', d: 'English tokens → embedding + PE → N encoder layers. Each layer: self-attention (no mask, everyone sees everyone) + FFN, both with Add & Norm. Output: one well-informed vector for each English token. It is made once and used for the whole translation.' },
      { t: 'The decoder starts', d: 'For now the decoder has only one special "start" token. It also goes through embedding + PE.' },
      { t: 'Three jobs of a decoder layer', d: '(1) Masked self-attention: the Hindi tokens written so far look at each other, not ahead. (2) Cross-attention: the Hindi tokens ask the encoder\'s English vectors "which English part should I translate now?". (3) FFN. Add & Norm after each one.' },
      { t: 'The next Hindi token', d: 'Linear + Softmax gives probabilities, and one token is picked ("video"). Add it to the decoder\'s input and run the decoder again. Loop until the "end" token comes. The encoder does not run again.' },
      { t: 'In training (shifted target)', d: 'The correct Hindi sentence is already known. The decoder gets that same sentence shifted by one place ("start" in front), and every position must predict the next word. Because of the mask, no position can see the word ahead, so all positions train together.' },
    ]},
    { type: 'image', src: 'assets/img/ai-transformer-overview/transformer-full.png', maxWidth: 560, alt: 'The full architecture of the original Transformer: on the left the encoder stack (Embeddings, Positional Encoding, Norm, Multi-Headed Self-Attention, Feed-Forward Network, Nx layers), on the right the decoder stack (Masked Multi-Headed Self-Attention, Multi-Headed Cross-Attention where V and K come from the encoder, Feed-Forward, Nx layers), with Linear and Predictions at the top.', caption: 'Encoder (left) and decoder (right). The encoder\'s output goes into the decoder\'s cross-attention as K and V; Q comes from the decoder. Every "+" is a residual connection. Note: in this figure, Norm comes <em>before</em> each sublayer (pre-norm, the common way today); in the 2017 paper Norm came after.', credit: { text: 'dvgodoy (Deep Learning Visuals), Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Transformer,_full_architecture.png', license: 'CC BY 4.0' } },
    { type: 'p', html: `A decoder-only model (GPT) is the right half of this picture, with <strong>cross-attention removed</strong> (there is no encoder), and input = prompt + the answer written so far. An encoder-only model (BERT) is the left half, with a small "classifier" head on top.` },
    { type: 'p', html: `Mapping for xyz.com: turning help docs into vectors for search (an embedding model) is usually done with an <strong>encoder</strong>-type model. The chat answers of "xyz Assistant" come from a <strong>decoder-only</strong> LLM. Translating video titles from Hindi to English could also be done by an <strong>encoder-decoder</strong> model, but big decoder-only LLMs do this well today too.` },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `• You need to <strong>understand / classify / make search vectors</strong> from text, cheaply and fast → encoder-only (like BERT, or an embedding model).<br>• You need to <strong>generate text</strong>: chat, code, tools, agents → a decoder-only LLM (today's default).<br>• A fixed input → fixed output change (translation, summarization) at scale, with a small model → encoder-decoder (like T5) is a good option.<br>Rule of thumb: a new general-purpose product? Start with decoder-only. Simple classification at very high volume? A small encoder model will be cheaper.` },

    { type: 'h2', text: 'Common confusion' },
    { type: 'callout', tone: 'mistake', title: '"The Transformer is parallel, so the answer also comes in one go"', html: `No. <strong>Training</strong> and <strong>reading the prompt</strong> (prefill) are parallel: all known tokens at once. But <strong>writing the answer</strong> (generation) is still one token at a time, because the next token is not known until the previous one is picked. That is why the answers of ChatGPT and Claude appear as if being typed. (Speed tricks like the KV cache: <a href="#/ai-multihead">multi-head lesson</a>.)` },
    { type: 'callout', tone: 'mistake', title: '"N layers means N different jobs"', html: `Every layer has exactly the same design (attention + FFN + 2 Add & Norm). Only the learned weights differ. Research shows that early layers mostly catch basic patterns (nearby words, grammar) and later layers catch more abstract things, but no person wrote this by hand: training learned it on its own.` },
    { type: 'callout', tone: 'mistake', title: '"Attention = the whole model"', html: `The paper is called "Attention Is All You Need", but the FFN, residuals, LayerNorm and embeddings are also needed. In the calculator above, most of GPT-2 small\'s 85M layer parameters are in the FFN (per layer: FFN 8·d² vs attention 4·d²).` },
    { type: 'h2', text: 'The whole picture' },
    { type: 'p', html: `Below is the full stack of the original Transformer (encoder-decoder), with xyz.com's title-translation example. Use the buttons to see one path at a time. A decoder-only model like GPT has no encoder on the left and no cross-attention; the rest of the right column is exactly like this.` },
    { type: 'diagram', title: 'The Transformer: the big picture', height: 640,
      groups: [
        { label: 'Encoder layer × N', x: 55, y: 232, w: 220, h: 212 },
        { label: 'Decoder layer × N', x: 435, y: 158, w: 275, h: 300 },
      ],
      nodes: [
        { id: 'src', label: 'English tokens', sub: 'how to upload a video', x: 165, y: 600, w: 190, kind: 'client', info: 'What it is: the tokens (ids) of the input sentence. In an encoder-decoder model this is the "source", like the English title to be translated.' },
        { id: 'eemb', label: 'Embedding + PE', sub: 'n × d_model', x: 165, y: 505, w: 190, kind: 'data', info: 'What it is: each id\'s embedding vector plus the vector for its position. From here on, each token is one row of size d_model.' },
        { id: 'eatt', label: 'Self-attention', sub: 'no mask + Add & Norm', x: 165, y: 400, w: 190, kind: 'server', info: 'What it is: the encoder\'s attention. No mask: each English token can see the tokens both before and after it. Then residual + LayerNorm.' },
        { id: 'effn', label: 'Feed-forward', sub: '+ Add & Norm', x: 165, y: 300, w: 190, kind: 'server', info: 'What it is: a small network that runs on each token separately (make bigger, ReLU, make smaller). Attention + FFN = one encoder layer, repeated N times (6 in the paper).' },
        { id: 'eout', label: 'Encoder output', sub: 'one vector per token', x: 165, y: 140, w: 190, kind: 'cache', info: 'What it is: the vectors from the last encoder layer, one for each English token. It is made only once, and the cross-attention in every decoder layer looks at it as K and V.' },
        { id: 'tgt', label: 'Hindi tokens so far', sub: 'start, video, ...', x: 545, y: 600, w: 190, kind: 'client', info: 'What it is: the decoder\'s input: the output tokens written so far (at first only "start"). In a decoder-only model (GPT), this is the prompt + the answer so far.' },
        { id: 'demb', label: 'Embedding + PE', sub: 'n × d_model', x: 545, y: 505, w: 190, kind: 'data', info: 'What it is: embedding + position on the decoder side. In the original paper, the encoder, the decoder and the output head shared one embedding matrix.' },
        { id: 'datt', label: 'Masked self-attn', sub: 'earlier tokens only', x: 545, y: 410, w: 190, kind: 'server', info: 'What it is: the decoder\'s self-attention, with a causal mask. Each Hindi token can only see the tokens before it, so the next word cannot be copied during training.' },
        { id: 'dx', label: 'Cross-attention', sub: 'Q dec, K V enc', x: 545, y: 315, w: 190, kind: 'queue', info: 'What it is: the decoder\'s attention that "looks at the input sentence". The query comes from the decoder\'s tokens; the key and value come from the encoder output. This is how the decoder knows which English part to translate now.' },
        { id: 'dffn', label: 'Feed-forward', sub: '+ Add & Norm', x: 545, y: 220, w: 190, kind: 'server', info: 'What it is: the FFN of a decoder layer. Masked self-attention + cross-attention + FFN (each followed by Add & Norm) = one decoder layer, N times.' },
        { id: 'head', label: 'Linear + Softmax', sub: 'vocab probabilities', x: 545, y: 115, w: 190, kind: 'edge', info: 'What it is: the output head. The vector of the last position becomes vocab_size logits, and softmax turns them into probabilities.' },
        { id: 'nxt', label: 'Next token', sub: '"video"', x: 545, y: 35, w: 190, kind: 'queue', info: 'What it is: the picked token. Add it to the decoder\'s input and run the decoder again (autoregressive), until the "end" token comes. The encoder does not run again.' },
      ],
      edges: [
        { a: 'src', b: 'eemb', n: 1 },
        { a: 'eemb', b: 'eatt', n: 2 },
        { a: 'eatt', b: 'effn', n: 3 },
        { a: 'effn', b: 'eout', n: 4 },
        { a: 'eout', b: 'dx', n: 5, label: 'K, V' },
        { a: 'tgt', b: 'demb' },
        { a: 'demb', b: 'datt' },
        { a: 'datt', b: 'dx', label: 'Q' },
        { a: 'dx', b: 'dffn' },
        { a: 'dffn', b: 'head' },
        { a: 'head', b: 'nxt' },
        { a: 'nxt', b: 'tgt', kind: 'evt', dashed: true, label: 'append', via: [[690, 35], [690, 600]] },
      ],
      paths: [
        { name: 'Encoder path', text: 'The English title goes in all at once: embedding + PE, then N layers (self-attention without a mask + FFN). Result: a context-aware vector for each English token.', go: ['src>eemb>eatt>effn>eout'] },
        { name: 'Decoder path', text: 'The Hindi tokens written so far: embedding + PE, masked self-attention, cross-attention, FFN, then Linear + Softmax gives the next token. The token is added to the input, and the loop runs again.', go: ['tgt>demb>datt>dx>dffn>head>nxt', 'nxt>tgt'] },
        { name: 'Cross-attention', text: 'The decoder\'s question (Q) comes from masked self-attention; the K and V that answer come from the encoder output. This is the bridge between encoder and decoder. GPT does not have this part at all.', go: ['eout>dx', 'datt>dx'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Transformer = tokens → embedding + position → N times [attention, Add & Norm, FFN, Add & Norm] → Linear → Softmax → next token.</li>
      <li>An RNN read one token at a time, in a line (slow, forgetful). A Transformer sees all tokens at once: any token reaches any token in 1 hop.</li>
      <li>The maths is just matrix multiply: (a × b)·(b × c) = (a × c), and every cell is one dot product.</li>
      <li>Outside every layer the shape is always n × d_model. Inside: scores n × n, FFN 4 × d_model.</li>
      <li>Attention mixes information between tokens; the FFN processes it inside each token; residual + LayerNorm keep a deep stack stable.</li>
      <li>Three families: encoder-only (BERT, understanding), decoder-only (GPT, writing), encoder-decoder (T5, translation), joined by cross-attention.</li>
      <li>Training and reading the prompt are parallel; writing the answer is still token by token. Attention's cost grows as n².</li>
    </ul>` },
    { type: 'tradeoffs', gains: [
      'Parallel training: the GPU is fully used, so training on huge data is possible',
      'Long-range context: any token can see any token in 1 hop',
      'One simple block repeated: easy to scale (add layers, grow d_model)',
      'One design, three uses: encoder, decoder, encoder-decoder',
    ], costs: [
      'Attention costs n²: double the context and the scores grow 4 times (memory and compute)',
      'Fixed context window: it cannot take a longer input directly',
      'It does not understand order by itself; it needs positional encoding',
      'Generation is still token by token (sequential), and the user feels the latency',
      'Needs a lot of data and GPUs; parameters run into billions',
    ]},
    { type: 'think', questions: [
      { q: 'xyz.com must classify 10 million comments a day as "spam / not spam". Should it use a big decoder-only chat LLM or a small encoder model? Why?', a: 'A small encoder-only model (like BERT, fine-tuned) is often better: the job is only understanding, not generating; it gets bidirectional context; and it is much cheaper and faster. A big LLM can also do it, but at 10 million a day the cost and latency would be much higher.' },
      { q: 'A prompt grows from 2,000 tokens to 4,000 tokens. How many times do the attention scores grow? And the FFN work?', a: 'Scores are n × n, so 4 times (2² = 4). The FFN runs on each token separately, so only 2 times. This is why attention becomes the most expensive part with long context.' },
      { q: 'If we remove the residual connections, what trouble will we have training a 48-layer model?', a: 'Each layer would have to rebuild its whole input, and the training signal (gradient) could get weak while passing through so many layers, like the RNN vanishing problem. The residual gives a "straight road" along which both information and gradients flow easily.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Why is a Transformer faster to train than an RNN?', options: ['It has fewer parameters', 'All tokens are processed together (in parallel), with no step-by-step waiting', 'It does not use a GPU'], answer: 1, explain: 'In an RNN, step t waits for step t−1. A Transformer layer processes all tokens together, which is perfect for a GPU.' },
      { q: 'What is the shape of the token vectors outside each Transformer layer?', options: ['n × n', 'n × d_model', 'n × vocab'], answer: 1, explain: 'The shape changes inside (n × n scores, 4·d FFN), but every layer takes and gives n × d_model. This is why layers stack and the residual can be added.' },
      { q: 'Which family is BERT in, and what is it best for?', options: ['Decoder-only, for chat', 'Encoder-only, for classification and search embeddings', 'Encoder-decoder, for translation'], answer: 1, explain: 'BERT is encoder-only: bidirectional attention, masked-token training. It is good at understanding tasks (classify, embed), not built for generating text.' },
      { q: 'The Transformer is parallel, so why does ChatGPT\'s answer come word by word?', options: ['The network is slow', 'Generation is autoregressive: the next token depends on the token picked before it', 'On purpose, for a UI animation'], answer: 1, explain: 'The prompt is read all at once, but each new token can only be made after the previous output. Hence token-by-token streaming.' },
      { q: 'What is the output of the Linear + Softmax head?', options: ['The embedding of the next token', 'A probability for every token in the vocab', 'Attention weights'], answer: 1, explain: 'The linear layer turns the d_model vector into vocab_size logits; softmax turns them into probabilities, from which the next token is picked.' },
    ]},
    { type: 'sources', note: 'The numbers (BLEU, training time, base hyperparameters, GPT-2 sizes) come from these papers and repos. We calculated the parameter counts from the formula for a GPT-2-like layout in a node script and matched them.', items: [
      { title: 'Attention Is All You Need', publisher: 'Vaswani et al., Google Brain / Google Research (arXiv 1706.03762, NeurIPS 2017)', year: 2017, official: true, url: 'https://arxiv.org/abs/1706.03762', used: 'Block diagram, encoder-decoder, N=6, d_model=512, d_ff=2048, h=8, BLEU 28.4/41.8, 3.5 days on 8 GPUs, O(1) vs O(n) sequential operations and path length, decoder masking, shared embedding/output weights.' },
      { title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding', publisher: 'Devlin et al., Google AI Language (arXiv 1810.04805)', year: 2018, official: true, url: 'https://arxiv.org/abs/1810.04805', used: 'Encoder-only, bidirectional attention, masked language modelling.' },
      { title: 'Language Models are Unsupervised Multitask Learners (GPT-2)', publisher: 'Radford et al., OpenAI', year: 2019, official: true, url: 'https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf', used: 'Decoder-only design, pre-norm LayerNorm placement, vocab 50,257, context 1,024, model sizes (smallest 768-dim 12 layers, largest 1,600-dim 48 layers).' },
      { title: 'Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer (T5)', publisher: 'Raffel et al., Google (arXiv 1910.10683)', year: 2019, official: true, url: 'https://arxiv.org/abs/1910.10683', used: 'Encoder-decoder family example, text-to-text framing.' },
      { title: 'Transformers Explained | Simple Explanation of Transformers (video)', publisher: 'codebasics (YouTube)', year: 2025, url: 'https://www.youtube.com/watch?v=ZhAz268Hdpw', used: 'The learner\'s reference video; its chapter list (word vs contextual embeddings, encoder-decoder, positional embeddings, attention, multi-head, decoder) was used as a coverage checklist.' },
      { title: 'Transformer Explainer', publisher: 'Polo Club of Data Science, Georgia Tech', year: 2024, url: 'https://poloclub.github.io/transformer-explainer/', used: 'Visual cross-check of the GPT-2 small data path and shapes.' },
    ]},
  ],
});
