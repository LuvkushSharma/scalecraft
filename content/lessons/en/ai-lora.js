/*
  ai-lora (English twin). Same numbers as the Hinglish file (computed in scratchpad/a3/lora_math.js).
*/
Lesson.register({
  id: 'ai-lora',
  title: 'LoRA and QLoRA: the matrix maths',
  minutes: 30,
  summary: `Fine-tuning a whole model is very expensive. LoRA says: do not touch the original weight W. Next to it, learn two small matrices B and A, and use W' = W + B·A. In this lesson we do every multiplication by hand on a 4×4 example, see how the matrices start (initialisation), and then understand the maths and memory of QLoRA (a 4-bit NF4 base + LoRA).`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `We want to change a big model a little for our own job. But touching its billions of numbers is very expensive.<br>The LoRA idea: do not touch the big model at all. Attach a small "add-on" to it, and train only that.<br>This add-on is so small that one model can have many add-ons, one per customer, each only a few MB.<br>QLoRA goes one step further: keep the big model squeezed into 4 bits, so training fits on a single GPU.<br>We will do all the maths by hand with small 4×4 numbers. You can check every step yourself.` },
    { type: 'h2', text: 'Problem: a 13.5 GB copy for every customer?' },
    { type: 'p', html: `In the <a href="#/ai-training-finetuning">previous lesson</a> we saw that a full fine-tune of a 7B model needs ~108 GB of GPU memory (weights + gradients + Adam states), and every fine-tune gives a whole 13.5 GB model file. Now xyz.com has 3 big business customers, and each wants xyz Assistant to speak in its own brand tone. 3 full copies = 40 GB of storage, 3 separate deployments, and the 108 GB training for every copy.` },
    { type: 'p', html: `In 2021, researchers at Microsoft (Hu et al.) built the <strong>LoRA</strong> paper on one observation: during fine-tuning, the <em>change</em> in the weights (ΔW) is very "simple". It does not need a whole big matrix; the product of two thin matrices is enough. The maths name for this "simple" is <strong>low rank</strong>. Before that, two basic things: a matrix, and matrix × vector.` },
    { type: 'callout', tone: 'term', title: 'New word: vector and matrix', html: `<strong>What it is:</strong> a <strong>vector</strong> = a line of numbers, like <code>[1, 2, 0, -1]</code>. In a model every token is a vector. A <strong>matrix</strong> = a table of numbers, in rows and columns. "4×4" = 4 rows, 4 columns = 16 numbers. "d×k" = d rows, k columns.<br><strong>Why we need it:</strong> every layer of the model is a matrix. A token's vector is multiplied by this matrix to make a new vector. All the model's weights live in these matrices.<br><strong>Without it:</strong> the whole LoRA idea ("two thin matrices instead of one big matrix") will not make sense.` },
    { type: 'p', html: `<strong>How matrix × vector works (a small 2×2 example):</strong> "dot" each row of the matrix with the vector: first × first + second × second.` },
    { type: 'ascii', text: `[ 1  2 ]   [ 1 ]     row1: 1×1 + 2×1 = 3
[ 3  4 ] · [ 1 ]  =  row2: 3×1 + 4×1 = 7      → [3, 7]

A d×k matrix × a vector of k numbers = a vector of d numbers.
k multiplications for each output number. d × k multiplications in total.`, caption: 'That is all. Below, the same rule runs on 4×4, with 4 multiplications for each row.' },
    { type: 'callout', tone: 'term', title: 'New word: rank (and low-rank)', html: `<strong>What it is:</strong> the <strong>rank</strong> of a matrix = how many "truly different" directions it has. A 4×4 matrix where every row is a multiple of the same row has rank 1: you see 16 numbers, but the real information is in only 4 + 4 = 8 numbers. A <strong>low-rank matrix</strong> = its rank is much smaller than its size. Such a matrix can be written as the product of two thin matrices: (d×r) · (r×k), where r is small.<br><strong>Why we need it:</strong> if the fine-tuning change is low-rank, then instead of the 16,777,216 numbers of a 4096×4096 matrix, we can store and train only 65,536 numbers (r = 8).<br><strong>Without it:</strong> a whole d×k matrix for every change: the same 108 GB problem.` },
    { type: 'p', html: `A small rank-1 example. One column <code>u = [1, 2, 0, -1]</code> and one row <code>v = [2, 0, 1, 3]</code>. Their product u·v is a 4×4 matrix; each entry is <code>u_i × v_j</code>:` },
    { type: 'ascii', text: `        v =  [ 2   0   1   3 ]
u = 1   ->   [ 2   0   1   3 ]     (1×2, 1×0, 1×1, 1×3)
    2   ->   [ 4   0   2   6 ]     (2×2, 2×0, 2×1, 2×3)
    0   ->   [ 0   0   0   0 ]
   -1   ->   [-2   0  -1  -3 ]

16 numbers, but we store only 8 (4 of u + 4 of v).
If d = k = 4096: full = 16,777,216 numbers; rank 1 = 8,192 numbers.` },
    { type: 'h2', text: 'The LoRA formula' },
    { type: 'p', html: `Every linear layer of a Transformer (like attention's W<sub>q</sub>, see <a href="#/ai-attention">Self-attention</a>) is one matrix multiply: <code>h = W₀ · x</code>. Normal fine-tuning changes W₀ into W₀ + ΔW. LoRA says: do not learn ΔW directly; break it into two small matrices:` },
    { type: 'code', text: `W' = W₀ + ΔW          ΔW = s · B · A          s = α / r

h = W' · x = W₀·x + s · B·(A·x)

W₀ : d × k   (frozen, never updated)
B  : d × r   ("up" matrix, trainable)
A  : r × k   ("down" matrix, trainable)
r  : rank, like 4, 8, 16, 64   (r << d, k)
α  : lora_alpha, a fixed number (hyperparameter)` },
    { type: 'callout', tone: 'term', title: 'New word: frozen, trainable, hyperparameter', html: `<strong>What it is:</strong> <strong>Frozen</strong> = these weights will not change during training (no update, and no gradients or Adam states stored for them). <strong>Trainable</strong> = these get updated during training. A <strong>hyperparameter</strong> = a number we choose ourselves before training (r, α, learning rate). The model does not learn it.<br><strong>Why we need it:</strong> all of LoRA's savings come from this: W₀ is frozen, only B and A are trainable.<br><strong>Without it:</strong> everything trainable = the full memory of full fine-tuning, plus the risk of forgetting.` },
    { type: 'callout', tone: 'term', title: 'New word: adapter', html: `<strong>What it is:</strong> a small, separate trainable part attached to the base model. In LoRA it is one (B, A) pair for each chosen matrix. All the pairs together make one <strong>adapter file</strong>.<br><strong>Why we need it:</strong> each xyz customer gets its own adapter: one base model, with a small "add-on" put on or taken off.<br><strong>Without it:</strong> a whole 13.5 GB model would have to be kept for every customer.<br><strong>Example:</strong> Llama 2 7B, r = 8, only on W<sub>q</sub> and W<sub>v</sub>: the adapter file is ~8.4 MB (calculator below).` },
    { type: 'p', html: `A "squeezes" the input from k dimensions down to only r dimensions (down-projection), and B "spreads" it back out to d dimensions (up-projection). In the middle there is a thin, r-sized path: this bottleneck is what makes LoRA cheap.` },
    { type: 'callout', tone: 'tip', title: 'Convention note', html: `The LoRA paper writes column vectors (<code>h = W·x</code>). The attention lesson and PyTorch's <code>nn.Linear</code> use row vectors (<code>y = x·Wᵀ</code>). It is only a transpose; the maths is the same. This lesson uses the paper's way.` },
    { type: 'h2', text: 'How are B and A created? Initialisation' },
    { type: 'p', html: `Before training starts, we have to put some numbers into B and A. The rule from the LoRA paper (2021):` },
    { type: 'list', items: [
      '<strong>A</strong> = random Gaussian numbers (normal distribution: small random numbers around zero).',
      '<strong>B</strong> = all zeros.',
      'So at the start <strong>ΔW = B·A = 0</strong>. This means that at step 0 the LoRA model gives exactly the same output as the original model. Fine-tuning starts from a good, well-known point.',
    ]},
    { type: 'callout', tone: 'term', title: 'New word: Gaussian (normal) distribution', html: `<strong>What it is:</strong> a pattern of random numbers where most numbers land near zero and big numbers are rare (a bell-shaped curve). One number, σ (the standard deviation), tells how spread out they are. For example with σ = 0.1 most numbers are between -0.2 and 0.2.<br><strong>Why we need it:</strong> A needs small, different random numbers so each direction learns something different. A trained model's weights also have roughly this shape (this matters later for QLoRA).<br><strong>Without it:</strong> if all numbers were the same, all rows of A would learn the same thing. Useless.` },
    { type: 'p', html: `Hugging Face's <strong>PEFT</strong> library (the most common Python package for LoRA) fills A with <strong>Kaiming-uniform</strong> by default (random numbers with an equal chance anywhere in a range; the range depends on the layer size) and B with zeros, and with the <code>init_lora_weights="gaussian"</code> option it uses Gaussian like the paper. In both, the important part is the same: <strong>one random, one zero</strong>.` },
    { type: 'h3', text: 'Why not both zero? Why not both random?' },
    { type: 'table', head: ['Choice', 'ΔW at step 0', 'What happens'], rows: [
      ['A random, B = 0 (LoRA)', '0', 'Output same as the original. B\'s gradient is non-zero (it comes from A·x), so B starts learning right away. Correct.'],
      ['A = 0, B = 0', '0', 'B\'s gradient depends on A·x, which is 0. A\'s gradient depends on B, which is 0. Both gradients are zero: <strong>nothing will be learned</strong>.'],
      ['A random, B random', 'random noise', 'The model\'s output is damaged on the very first step. Random noise on top of the pre-trained knowledge. Training must first repair this damage.'],
    ]},
    { type: 'h3', text: 'The first training step, by hand (r = 2, s = 1)' },
    { type: 'p', html: `Say we have a 4×4 layer (a real one is 4096×4096). Here are our numbers:` },
    { type: 'ascii', text: `W₀ (frozen)                 x            A₀ (random, r×k = 2×4)          B₀ (zero, d×r = 4×2)
[ 0.5  -1    0    2 ]      [ 1 ]        [ 0.4  -0.1   0.2   0.1 ]         [ 0  0 ]
[ 1     0.5 -0.5  0 ]      [ 2 ]        [-0.2   0.3   0.1  -0.3 ]         [ 0  0 ]
[ 0     1    1   -1 ]      [ 0 ]                                          [ 0  0 ]
[-1     0    0.5  1 ]      [-1 ]                                          [ 0  0 ]` },
    { type: 'steps', items: [
      { t: 'W₀·x (each row · x)', d: '<code>row1: 0.5×1 + (-1)×2 + 0×0 + 2×(-1) = 0.5 - 2 + 0 - 2 = -3.5</code><br><code>row2: 1×1 + 0.5×2 + (-0.5)×0 + 0×(-1) = 1 + 1 + 0 + 0 = 2</code><br><code>row3: 0×1 + 1×2 + 1×0 + (-1)×(-1) = 0 + 2 + 0 + 1 = 3</code><br><code>row4: (-1)×1 + 0×2 + 0.5×0 + 1×(-1) = -1 + 0 + 0 - 1 = -2</code><br>W₀·x = [-3.5, 2, 3, -2]' },
      { t: 'A₀·x (r = 2 numbers)', d: '<code>row1: 0.4×1 + (-0.1)×2 + 0.2×0 + 0.1×(-1) = 0.4 - 0.2 + 0 - 0.1 = 0.1</code><br><code>row2: (-0.2)×1 + 0.3×2 + 0.1×0 + (-0.3)×(-1) = -0.2 + 0.6 + 0 + 0.3 = 0.7</code><br>A₀·x = [0.1, 0.7]' },
      { t: 'B₀·(A₀·x)', d: 'B₀ is zero, so every entry is 0×0.1 + 0×0.7 = 0. Output h = W₀·x + 0 = [-3.5, 2, 3, -2]. <strong>Exactly like the original model.</strong>' },
      { t: 'Loss', d: 'Say that, based on xyz\'s data, the correct output (target) is t = [-3.4, 2.5, 2.05, -0.55]. A simple loss: L = ½ Σ (h - t)². The error g = h - t = [-0.1, -0.5, 0.95, -1.45]. L = ½ (0.01 + 0.25 + 0.9025 + 2.1025) = <strong>1.6325</strong>.' },
      { t: 'Gradients', d: 'Remember: gradient = "if I increase this number a little, how much will the loss change" (<a href="#/ai-training-finetuning">previous lesson</a>). You do not need to memorize the formula; just see the pattern. By the chain rule: <code>dL/dB = s · g · (A₀x)ᵀ</code> and <code>dL/dA = s · Bᵀ · g · xᵀ</code>.<br>dL/dB (4×2), each entry g_i × (A₀x)_j:<br><code>[-0.1×0.1, -0.1×0.7] = [-0.01, -0.07]</code><br><code>[-0.5×0.1, -0.5×0.7] = [-0.05, -0.35]</code><br><code>[0.95×0.1, 0.95×0.7] = [0.095, 0.665]</code><br><code>[-1.45×0.1, -1.45×0.7] = [-0.145, -1.015]</code><br>dL/dA = Bᵀ·(...) = <strong>0</strong>, because B is still zero. On the first step only B learns.' },
      { t: 'Update (learning rate 0.1)', d: '<code>B₁ = B₀ - 0.1 × dL/dB</code> = [[0.001, 0.007], [0.005, 0.035], [-0.0095, -0.0665], [0.0145, 0.1015]].' },
      { t: 'New output', d: 'B₁·(A₀x): row1 = 0.001×0.1 + 0.007×0.7 = 0.0001 + 0.0049 = 0.005; row2 = 0.0005 + 0.0245 = 0.025; row3 = -0.00095 - 0.04655 = -0.0475; row4 = 0.00145 + 0.07105 = 0.0725.<br>h = [-3.5 + 0.005, 2 + 0.025, 3 - 0.0475, -2 + 0.0725] = [-3.495, 2.025, 2.9525, -1.9275]. Loss <strong>1.6325 → 1.4733</strong>. The model moved toward the target, and not a single number of W₀ changed.' },
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common confusion: "A is random, so the model\'s output will become random"', html: `No. In the output, A always goes through B (B·A·x). While B is zero, ΔW is zero no matter what A is. In the next steps B becomes a little non-zero, and then A also starts getting a gradient, so both learn together.` },
    { type: 'h2', text: 'After training: B·A, merge and output (two ways)' },
    { type: 'p', html: `Say that after many steps B and A became these (r = 2, α = 2, so s = α/r = 1). W₀ and x are the same as before.` },
    { type: 'ascii', text: `B (4×2)            A (2×4)
[ 0.2   0   ]      [ 1   0  -1   0.5 ]
[ 0     0.1 ]      [ 0   2   1  -1   ]
[ 0.1  -0.2 ]
[-0.1   0.3 ]` },
    { type: 'h3', text: 'Step 1: ΔW = B·A, each entry' },
    { type: 'p', html: `Rule: <code>(BA)[i][j] = B[i][1]×A[1][j] + B[i][2]×A[2][j]</code>. Each entry needs r = 2 multiplications:` },
    { type: 'table', head: ['Row i', 'j = 1', 'j = 2', 'j = 3', 'j = 4'], rows: [
      ['1', '0.2×1 + 0×0 = <strong>0.2</strong>', '0.2×0 + 0×2 = <strong>0</strong>', '0.2×(-1) + 0×1 = <strong>-0.2</strong>', '0.2×0.5 + 0×(-1) = <strong>0.1</strong>'],
      ['2', '0×1 + 0.1×0 = <strong>0</strong>', '0×0 + 0.1×2 = <strong>0.2</strong>', '0×(-1) + 0.1×1 = <strong>0.1</strong>', '0×0.5 + 0.1×(-1) = <strong>-0.1</strong>'],
      ['3', '0.1×1 + (-0.2)×0 = <strong>0.1</strong>', '0.1×0 + (-0.2)×2 = <strong>-0.4</strong>', '0.1×(-1) + (-0.2)×1 = <strong>-0.3</strong>', '0.1×0.5 + (-0.2)×(-1) = <strong>0.25</strong>'],
      ['4', '(-0.1)×1 + 0.3×0 = <strong>-0.1</strong>', '(-0.1)×0 + 0.3×2 = <strong>0.6</strong>', '(-0.1)×(-1) + 0.3×1 = <strong>0.4</strong>', '(-0.1)×0.5 + 0.3×(-1) = <strong>-0.35</strong>'],
    ], caption: '16 entries × 2 multiplications = 32 multiplications. The rank of ΔW is only 2, even though it looks 4×4.' },
    { type: 'h3', text: 'Step 2: merge, W\' = W₀ + s·ΔW' },
    { type: 'ascii', text: `W₀                       + 1 × ΔW                       = W'
[ 0.5  -1    0    2 ]    [ 0.2   0    -0.2   0.1  ]     [ 0.7  -1   -0.2   2.1  ]
[ 1     0.5 -0.5  0 ]  + [ 0     0.2   0.1  -0.1  ]  =  [ 1     0.7 -0.4  -0.1  ]
[ 0     1    1   -1 ]    [ 0.1  -0.4  -0.3   0.25 ]     [ 0.1   0.6  0.7  -0.75 ]
[-1     0    0.5  1 ]    [-0.1   0.6   0.4  -0.35 ]     [-1.1   0.6  0.9   0.65 ]` },
    { type: 'h3', text: 'Step 3, way 1 (merged): h = W\'·x' },
    { type: 'code', text: `row1: 0.7×1 + (-1)×2 + (-0.2)×0 + 2.1×(-1)    = 0.7 - 2 + 0 - 2.1     = -3.4
row2: 1×1 + 0.7×2 + (-0.4)×0 + (-0.1)×(-1)     = 1 + 1.4 + 0 + 0.1     =  2.5
row3: 0.1×1 + 0.6×2 + 0.7×0 + (-0.75)×(-1)     = 0.1 + 1.2 + 0 + 0.75  =  2.05
row4: (-1.1)×1 + 0.6×2 + 0.9×0 + 0.65×(-1)     = -1.1 + 1.2 + 0 - 0.65 = -0.55
h = [-3.4, 2.5, 2.05, -0.55]          (16 multiplications)` },
    { type: 'h3', text: 'Step 3, way 2 (separate adapter): h = W₀·x + s·B·(A·x)' },
    { type: 'code', text: `W₀·x  = [-3.5, 2, 3, -2]                          (computed earlier, 16 mult)

A·x:  row1: 1×1 + 0×2 + (-1)×0 + 0.5×(-1)  = 1 + 0 + 0 - 0.5 = 0.5
      row2: 0×1 + 2×2 + 1×0 + (-1)×(-1)    = 0 + 4 + 0 + 1   = 5          (8 mult)

B·(Ax): row1: 0.2×0.5 + 0×5      = 0.1
        row2: 0×0.5 + 0.1×5      = 0.5
        row3: 0.1×0.5 + (-0.2)×5 = 0.05 - 1  = -0.95
        row4: (-0.1)×0.5 + 0.3×5 = -0.05 + 1.5 = 1.45                      (8 mult)

h = [-3.5 + 0.1, 2 + 0.5, 3 - 0.95, -2 + 1.45] = [-3.4, 2.5, 2.05, -0.55]   SAME!` },
    { type: 'p', html: `Both ways give exactly the same answer, because matrix multiplication distributes: <code>(W₀ + BA)·x = W₀·x + B·(A·x)</code>. The only difference is the work and the memory:` },
    { type: 'table', head: ['', 'Way 1: merged W\'', 'Way 2: separate B, A'], rows: [
      ['Multiplications (4×4, r=2)', '16', '16 + 8 + 8 = 32'],
      ['Multiplications (4096×4096, r=8)', '16,777,216', '16,777,216 + 65,536 (only 0.39% extra)'],
      ['When to use', 'Deploy/inference: zero extra latency', 'Training (W₀ frozen, gradients only for A, B), and when many adapters must be swapped on one base'],
    ]},
    { type: 'callout', tone: 'tip', title: 'B·A is never built during training', html: `During training we use way 2: first A·x (a small vector), then B·(A·x). The full d×k ΔW matrix is never built in memory. That is why LoRA training is cheap. We merge only once, after training.` },
    { type: 'h2', text: 'LoRA matrix lab: change the numbers yourself' },
    { type: 'p', html: `Edit any number (W₀, x, B, A), and change r and α. Click any cell of ΔW to see how it is calculated. Pick an output row to see both ways, multiplication by multiplication. Press "Init" and A becomes random (seeded Gaussian) while B becomes zero: see that ΔW is all zeros and the output is the same as the original.` },
    { type: 'custom', render(el) {
      const DEF = { W: [[0.5, -1, 0, 2], [1, 0.5, -0.5, 0], [0, 1, 1, -1], [-1, 0, 0.5, 1]], x: [1, 2, 0, -1], B: [[0.2, 0], [0, 0.1], [0.1, -0.2], [-0.1, 0.3]], A: [[1, 0, -1, 0.5], [0, 2, 1, -1]] };
      const cp = o => JSON.parse(JSON.stringify(o));
      let S = cp(DEF), r = 2, alpha = 2, seed = 7, ci = 0, cj = 0, row = 0;
      const f = v => { const t = Math.round(v * 10000) / 10000; return String(t === 0 ? 0 : t); };
      const p = v => (v < 0 ? '(' + f(v) + ')' : f(v));
      const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
      const gauss = () => Math.sqrt(-2 * Math.log(rnd())) * Math.cos(2 * Math.PI * rnd());
      const cell = 'padding:3px 6px;border:1px solid var(--line);text-align:right;font:13px var(--f-mono);min-width:44px';
      const inp = (k, i, j, v) => `<td style="${cell};padding:1px"><input data-k="${k}" data-i="${i}" data-j="${j}" type="number" step="0.1" value="${f(v)}" style="width:70px;font:13px var(--f-mono);padding:3px"></td>`;
      const box = (t, inner) => `<div style="display:inline-block;vertical-align:top;margin:0 12px 10px 0"><div style="font-size:13px;color:var(--ink-3);margin-bottom:3px">${t}</div><table style="border-collapse:collapse">${inner}</table></div>`;
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:end">
          <div class="chips" style="padding:0"><button type="button" class="chip lr-r" data-r="1">r = 1</button><button type="button" class="chip lr-r" data-r="2">r = 2</button></div>
          <label style="margin:0">α <input class="lr-a" type="number" step="1" min="1" value="2" style="width:70px"></label>
          <button type="button" class="btn small lr-ex">Trained example</button>
          <button type="button" class="btn small primary lr-init">Init: A random, B = 0</button></div>
        <div style="overflow-x:auto;margin-top:10px"><div class="lr-in" style="min-width:560px"></div><div class="lr-out" style="min-width:560px"></div></div>
        <div class="calc-note lr-cell"></div>
        <div class="chips lr-rows" style="padding:6px 0 0"></div>
        <pre class="ascii lr-calc" style="white-space:pre;overflow-x:auto;font-size:12.5px"></pre>
        <div class="stats"><div class="stat"><span>s = α / r</span><strong class="lr-s"></strong></div><div class="stat"><span>h (merged W'·x)</span><strong class="lr-h1" style="font-size:16px"></strong></div><div class="stat"><span>h (W₀x + s·B(Ax))</span><strong class="lr-h2" style="font-size:16px"></strong></div><div class="stat"><span>Multiplications: merged vs separate</span><strong class="lr-m"></strong></div></div>`;
      const drawIn = () => {
        el.querySelectorAll('.lr-r').forEach(b => b.classList.toggle('on', Number(b.dataset.r) === r));
        el.querySelector('.lr-in').innerHTML =
          box('W₀ (frozen, 4×4)', S.W.map((R, i) => '<tr>' + R.map((v, j) => inp('W', i, j, v)).join('') + '</tr>').join('')) +
          box('x', S.x.map((v, i) => '<tr>' + inp('x', i, 0, v) + '</tr>').join('')) +
          box('B (4×' + r + ')', S.B.map((R, i) => '<tr>' + R.slice(0, r).map((v, j) => inp('B', i, j, v)).join('') + '</tr>').join('')) +
          box('A (' + r + '×4)', S.A.slice(0, r).map((R, i) => '<tr>' + R.map((v, j) => inp('A', i, j, v)).join('') + '</tr>').join(''));
        el.querySelectorAll('.lr-in input').forEach(n => n.addEventListener('input', () => {
          const v = Number(n.value); if (!isFinite(v)) return;
          const k = n.dataset.k, i = +n.dataset.i, j = +n.dataset.j;
          if (k === 'x') S.x[i] = v; else S[k][i][j] = v;
          calc();
        }));
      };
      const calc = () => {
        const s = alpha / r, ks = [...Array(r).keys()];
        const BA = S.W.map((_, i) => [0, 1, 2, 3].map(j => ks.reduce((a, k) => a + S.B[i][k] * S.A[k][j], 0)));
        const Wp = S.W.map((R, i) => R.map((v, j) => v + s * BA[i][j]));
        const W0x = S.W.map(R => R.reduce((a, v, j) => a + v * S.x[j], 0));
        const Ax = ks.map(k => S.A[k].reduce((a, v, j) => a + v * S.x[j], 0));
        const BAx = S.B.map(R => ks.reduce((a, k) => a + R[k] * Ax[k], 0));
        const h1 = Wp.map(R => R.reduce((a, v, j) => a + v * S.x[j], 0));
        const h2 = W0x.map((v, i) => v + s * BAx[i]);
        const hl = 'background:var(--accent-soft);outline:2px solid var(--accent)';
        el.querySelector('.lr-out').innerHTML =
          box('ΔW = B·A (click a cell)', BA.map((R, i) => '<tr>' + R.map((v, j) => `<td data-i="${i}" data-j="${j}" style="${cell};cursor:pointer;${i === ci && j === cj ? hl : ''}">${f(v)}</td>`).join('') + '</tr>').join('')) +
          box("W' = W₀ + s·ΔW", Wp.map((R, i) => '<tr>' + R.map(v => `<td style="${cell};${i === row ? 'background:var(--accent-soft)' : ''}">${f(v)}</td>`).join('') + '</tr>').join(''));
        el.querySelectorAll('.lr-out td[data-i]').forEach(td => td.addEventListener('click', () => { ci = +td.dataset.i; cj = +td.dataset.j; calc(); }));
        el.querySelector('.lr-cell').innerHTML = `ΔW[${ci + 1}][${cj + 1}] = ` + ks.map(k => `B[${ci + 1}][${k + 1}]×A[${k + 1}][${cj + 1}]`).join(' + ') + ' = ' + ks.map(k => p(S.B[ci][k]) + '×' + p(S.A[k][cj])).join(' + ') + ' = <strong>' + f(BA[ci][cj]) + '</strong>';
        el.querySelector('.lr-rows').innerHTML = [0, 1, 2, 3].map(i => `<button type="button" class="chip${i === row ? ' on' : ''}" data-i="${i}">Output row ${i + 1}</button>`).join('');
        el.querySelectorAll('.lr-rows .chip').forEach(b => b.addEventListener('click', () => { row = +b.dataset.i; calc(); }));
        const i = row, X = S.x;
        el.querySelector('.lr-calc').textContent =
          `Way 1 (merged):  h[${i + 1}] = W'[${i + 1}]·x = ` + Wp[i].map((v, j) => p(v) + '×' + p(X[j])).join(' + ') + ' = ' + f(h1[i]) + '\n\n' +
          `Way 2 (separate):\n  (W₀x)[${i + 1}] = ` + S.W[i].map((v, j) => p(v) + '×' + p(X[j])).join(' + ') + ' = ' + f(W0x[i]) + '\n' +
          ks.map(k => `  (Ax)[${k + 1}] = ` + S.A[k].map((v, j) => p(v) + '×' + p(X[j])).join(' + ') + ' = ' + f(Ax[k])).join('\n') + '\n' +
          `  (B·Ax)[${i + 1}] = ` + ks.map(k => p(S.B[i][k]) + '×' + p(Ax[k])).join(' + ') + ' = ' + f(BAx[i]) + '\n' +
          `  h[${i + 1}] = ${f(W0x[i])} + ${f(s)} × ${p(BAx[i])} = ` + f(h2[i]);
        el.querySelector('.lr-s').textContent = f(s);
        el.querySelector('.lr-h1').textContent = '[' + h1.map(f).join(', ') + ']';
        el.querySelector('.lr-h2').textContent = '[' + h2.map(f).join(', ') + ']';
        el.querySelector('.lr-m').textContent = '16 vs ' + (16 + 4 * r + 4 * r);
      };
      el.querySelectorAll('.lr-r').forEach(b => b.addEventListener('click', () => { r = Number(b.dataset.r); ci = Math.min(ci, 3); drawIn(); calc(); }));
      el.querySelector('.lr-a').addEventListener('input', e => { const v = Number(e.target.value); if (v > 0) { alpha = v; calc(); } });
      el.querySelector('.lr-ex').addEventListener('click', () => { S = cp(DEF); drawIn(); calc(); });
      el.querySelector('.lr-init').addEventListener('click', () => {
        S.A = S.A.map(R => R.map(() => Math.round(gauss() * 0.5 * 100) / 100));
        S.B = S.B.map(R => R.map(() => 0));
        drawIn(); calc();
      });
      drawIn(); calc();
    }},
    { type: 'h2', text: 'α / r scaling: why this extra number?' },
    { type: 'callout', tone: 'term', title: 'New word: α (lora_alpha) and the scale s', html: `<strong>What it is:</strong> α is a hyperparameter. LoRA's change ΔW = B·A is not added directly; first it is multiplied by <code>s = α / r</code>. Example: r = 2, α = 2 → s = 1. r = 2, α = 4 → s = 2 (the adapter's effect doubles).<br><strong>Why we need it:</strong> one knob controls how strong the adapter's effect is, and when you change r you do not have to search for a new learning rate.<br><strong>Without it:</strong> every time r changed, the size of the update would change, and every r would need its own tuned learning rate.` },
    { type: 'p', html: `ΔW is multiplied by <code>s = α / r</code>. In the example above, set α = 4 (r = 2): s = 2, ΔW doubles, and the output becomes <code>[-3.3, 3, 1.1, 0.9]</code> (type α = 4 in the lab to check). So α is a "volume knob": how loud the adapter is.` },
    { type: 'list', items: [
      '<strong>Why divide by r?</strong> When r grows, more terms are added up in B·A and the update starts to get bigger. Scaling by α/r means you do not have to re-tune the learning rate while trying different r values. The paper set α equal to the first r it tried and kept it fixed.',
      '<strong>In practice</strong> people often use α = r or α = 2r (for example r = 16, α = 32).',
      '<strong>rsLoRA</strong>: with a big r, α/r becomes very small and learning slows down. Rank-stabilized LoRA uses <code>α/√r</code> (in PEFT: <code>use_rslora=True</code>).',
    ]},
    { type: 'h2', text: 'Which matrices get LoRA?' },
    { type: 'p', html: `A Transformer block has several linear layers: in attention W<sub>q</sub>, W<sub>k</sub>, W<sub>v</sub>, W<sub>o</sub> (see <a href="#/ai-multihead">Multi-head</a>), and in the FFN/MLP (in models like Llama) three matrices: <strong>gate</strong> and <strong>up</strong> (they make the token's vector bigger) and <strong>down</strong> (it makes it small again). Each one can get its own LoRA (its own B, A).` },
    { type: 'list', items: [
      '<strong>LoRA paper (2021)</strong>: on GPT-3 175B it adapted only W<sub>q</sub> and W<sub>v</sub>. At r = 4 the <strong>checkpoint</strong> (the file saved after training) went from 350 GB to ~35 MB, the <strong>VRAM</strong> (the GPU\'s own memory) needed for training went from 1.2 TB to 350 GB, and training was ~25% faster.',
      '<strong>QLoRA paper (2023)</strong>: to match the quality of full fine-tuning, LoRA on <em>all</em> linear layers turned out to be necessary. r mattered much less than "how many layers get LoRA".',
      '<strong>Today\'s common default</strong>: all linear layers (in PEFT: <code>target_modules="all-linear"</code>), r = 8 to 64.',
    ]},
    { type: 'h3', text: 'Calculator: how many trainable parameters?' },
    { type: 'custom', render(el) {
      const M = { '7': ['Llama 2 7B', 4096, 11008, 32], '13': ['Llama 2 13B', 5120, 13824, 40], '65': ['LLaMA 65B', 8192, 22016, 80] };
      const T = { qv: 'Wq, Wv', qkvo: 'Wq, Wk, Wv, Wo', all: 'All linear (attn + MLP)' };
      let m = '7', t = 'qv';
      el.innerHTML = `<div class="chips lp-m" style="padding:0 0 8px">${Object.keys(M).map(k => `<button type="button" class="chip" data-k="${k}">${M[k][0]}</button>`).join('')}</div>
        <div class="chips lp-t" style="padding:0 0 8px">${Object.keys(T).map(k => `<button type="button" class="chip" data-k="${k}">${T[k]}</button>`).join('')}</div>
        <label>Rank r: <strong class="lp-rv"></strong></label><input class="lp-r" type="range" min="0" max="8" step="1" value="3" style="width:100%">
        <div class="stats"><div class="stat"><span>One W<sub>q</sub> (d×d): full vs LoRA</span><strong class="lp-one" style="font-size:16px"></strong></div>
        <div class="stat"><span>Total model params</span><strong class="lp-tot"></strong></div>
        <div class="stat"><span>LoRA trainable params</span><strong class="lp-l"></strong></div>
        <div class="stat"><span>% of model</span><strong class="lp-p"></strong></div>
        <div class="stat"><span>Adapter file (bf16, 2 B/param)</span><strong class="lp-f"></strong></div></div>
        <div class="calc-note">Formula: for one d×k matrix, LoRA params = r × (d + k). Per layer: attention has 4 matrices of d×d; in the MLP, gate and up are d×f, down is f×d. Total params = layers × (4d² + 3df) + 2 × vocab(32,000) × d (embeddings + output head). Norms are tiny, ignored.</div>`;
      const fmt = n => n >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n.toLocaleString('en-IN');
      const upd = () => {
        const [, d, ff, L] = M[m], r = 2 ** Number(el.querySelector('.lp-r').value);
        const per = t === 'qv' ? 2 * r * 2 * d : t === 'qkvo' ? 4 * r * 2 * d : r * (11 * d + 3 * ff);
        const lora = per * L, tot = L * (4 * d * d + 3 * d * ff) + 2 * 32000 * d;
        el.querySelector('.lp-rv').textContent = r;
        el.querySelector('.lp-one').textContent = fmt(d * d) + ' vs ' + fmt(r * 2 * d);
        el.querySelector('.lp-tot').textContent = fmt(tot);
        el.querySelector('.lp-l').textContent = fmt(lora);
        el.querySelector('.lp-p').textContent = (lora / tot * 100).toFixed(3) + '%';
        el.querySelector('.lp-f').textContent = (lora * 2 / 1e6).toFixed(1) + ' MB';
        el.querySelectorAll('.lp-m .chip').forEach(c => c.classList.toggle('on', c.dataset.k === m));
        el.querySelectorAll('.lp-t .chip').forEach(c => c.classList.toggle('on', c.dataset.k === t));
      };
      el.querySelectorAll('.lp-m .chip').forEach(c => c.addEventListener('click', () => { m = c.dataset.k; upd(); }));
      el.querySelectorAll('.lp-t .chip').forEach(c => c.addEventListener('click', () => { t = c.dataset.k; upd(); }));
      el.querySelector('.lp-r').addEventListener('input', upd); upd();
    }},
    { type: 'p', html: `See the default: Llama 2 7B, W<sub>q</sub> + W<sub>v</sub>, r = 8 → <strong>4.19M</strong> trainable params, only <strong>0.062%</strong> of the model, adapter file <strong>8.4 MB</strong>. With all linear layers + r = 16 it is 39.98M (0.593%), a file of 80 MB. Still nothing next to 13.5 GB. xyz's 3 customers = one base model + 3 small adapter files.` },
    { type: 'h2', text: 'The journey of data inside one LoRA layer' },
    { type: 'flow', height: 340, title: 'LoRA layer: forward, training, merge',
      nodes: [
        { id: 'x', label: 'Input x', sub: 'k numbers', x: 70, y: 150, w: 110, kind: 'client', info: 'What it is: the vector that came from the previous layer (a token\'s hidden state, meaning that token\'s current vector inside the model). In a real model k is about 4096.' },
        { id: 'w', label: 'W₀ (frozen)', sub: 'd×k, 16.7M', x: 320, y: 60, w: 170, kind: 'data', info: 'What it is: the original pre-trained weight matrix. In LoRA training it is never updated: no gradients are stored for it, and no Adam states. In QLoRA it is kept in 4-bit NF4.' },
        { id: 'a', label: 'A (down)', sub: 'r×k', x: 250, y: 245, w: 120, kind: 'cache', info: 'What it is: LoRA\'s trainable "down" matrix. It squeezes x from k dimensions to r dimensions. Init: random Gaussian (PEFT default: Kaiming-uniform).' },
        { id: 'b', label: 'B (up)', sub: 'd×r', x: 430, y: 245, w: 120, kind: 'cache', info: 'What it is: LoRA\'s trainable "up" matrix. It spreads the r dimensions back out to d. Init: zero, so at the start ΔW = 0.' },
        { id: 'sum', label: 'Sum', sub: 'W₀x + s·BAx', x: 560, y: 150, w: 100, kind: 'server', info: 'What it is: a simple addition. It adds the outputs of both paths, scaling the adapter\'s part by s = α/r.' },
        { id: 'out', label: 'Output', sub: 'h', x: 670, y: 150, w: 80, kind: 'client', info: 'What it is: this layer\'s result h, which goes to the next layer. After merging we get exactly the same h.' },
        { id: 'loss', label: 'Loss + Adam', sub: 'updates A, B', x: 620, y: 300, w: 150, kind: 'queue', info: 'What it is: the training part. It computes the loss, the gradients flow back (backprop), and the optimizer updates only A and B. Adam states exist only for them too.' },
      ],
      edges: [{ a: 'x', b: 'w' }, { a: 'x', b: 'a' }, { a: 'a', b: 'b' }, { a: 'w', b: 'sum' }, { a: 'b', b: 'sum' }, { a: 'sum', b: 'out' }, { a: 'out', b: 'loss' }, { a: 'loss', b: 'b' }],
      scenarios: [
        { name: 'Forward (separate adapter)', steps: [
          { title: 'Main path', text: 'x is multiplied by the frozen W₀, just like in a normal model.', go: 'x>w>sum', msg: 'W₀·x = [-3.5, 2, 3, -2]' },
          { title: 'Side path: down', text: 'The same x is squeezed by A into r numbers.', go: 'x>a', msg: 'A·x = [0.5, 5]' },
          { title: 'Side path: up', text: 'B spreads it back out to 4 (d) numbers.', go: 'a>b>sum', msg: 'B·(A·x) = [0.1, 0.5, -0.95, 1.45]' },
          { title: 'Add', text: 'h = W₀x + s·B(Ax), s = 1.', go: 'sum>out', after: { out: { state: 'ok', sub: 'h ready' } }, msg: 'h = [-3.4, 2.5, 2.05, -0.55]' },
        ]},
        { name: 'Training step', steps: [
          { title: 'Forward', text: 'The forward pass, same as above.', go: ['x>w>sum', 'x>a>b>sum'], parallel: true },
          { title: 'Loss', text: 'Compare the output with the target to get the loss.', go: 'sum>out>loss', msg: 'loss = 1.6325 (init step example)' },
          { title: 'Gradient only up to the adapter', text: 'The gradient goes to B, then through B to A. W₀ is frozen: it gets no update.', go: 'bad:loss>b>a', set: { w: { state: 'dim', sub: 'no update' } }, after: { a: { state: 'hot', sub: 'updated' }, b: { state: 'hot', sub: 'updated' } } },
          { title: 'The memory win', text: 'Gradients and Adam states only for A and B: 2 × 8 × 4096 numbers per matrix (r = 8) instead of 4096×4096.', focus: ['a', 'b'] },
        ]},
        { name: 'Merge for deploy', steps: [
          { title: 'Merge once', text: 'After training, compute W\' = W₀ + s·B·A and put it in place of W₀. A and B are no longer needed.', set: { w: { label: "W' (merged)", sub: 'W₀ + s·BA', state: 'ok' }, a: { state: 'dim' }, b: { state: 'dim' } }, focus: ['w'] },
          { title: 'Just like a normal model', text: 'Now there is a single matrix multiply. Zero extra latency. Exactly the same output.', go: 'x>w>sum>out', after: { out: { state: 'ok', sub: 'same h' } }, msg: "W'·x = [-3.4, 2.5, 2.05, -0.55]" },
        ]},
        { name: 'Failure: wrong init', intro: 'What if someone also filled B with random numbers, or set both A and B to zero?', steps: [
          { title: 'Both random', text: 'At step 0 ΔW is already random noise. The model\'s output changed on the very first step: noise on top of the pre-trained knowledge.', set: { b: { state: 'warn', sub: 'random!' } }, go: ['x>a>b>sum', 'sum>out'], after: { out: { state: 'down', sub: 'broken!' } } },
          { title: 'Both zero', text: 'The output is fine, but B\'s gradient depends on A·x and A\'s gradient depends on B. Both zero: gradients are zero, training is stuck.', set: { a: { state: 'down', sub: 'A = 0' }, b: { state: 'down', sub: 'B = 0' }, out: { state: '', sub: 'h' } }, go: 'lost:loss>b' },
          { title: 'Fix', text: 'One random (A), one zero (B). The output matches the original and the gradient flows.', set: { a: { state: 'ok', sub: 'random' }, b: { state: 'ok', sub: 'zero' } }, go: 'bad:loss>b>a' },
        ]},
      ],
    },
    { type: 'h2', text: 'Merge, unmerge and a library of adapters' },
    { type: 'p', html: `Because ΔW is only added, LoRA gives us three useful things:` },
    { type: 'list', items: [
      '<strong>Merge</strong>: before deploying, W\' = W₀ + s·BA. Zero extra latency (in PEFT: <code>merge_and_unload()</code>, which returns a new model).',
      '<strong>Unmerge / swap</strong>: W\' - s·BA = W₀ again. Keep one base model in memory and change the adapter for each customer: xyz\'s 3 customers = 1 base + 3 files of a few MB.',
      '<strong>Multi-adapter serving</strong>: without merging, different requests in the same batch on one GPU can use different adapters (way 2). Inference servers like vLLM (open-source programs that run LLMs for users) support this. A little extra compute, but hundreds of adapters on one base.',
    ]},
    { type: 'callout', tone: 'warn', title: 'Be careful when merging', html: `If the base is quantized to 4-bit (QLoRA, below), putting W₀ + BA back into 4-bit adds rounding error, and the adapter\'s small effect can get lost. The common way: merge the adapter into a 16-bit base model, then, if you want, quantize the whole merged model.` },
    { type: 'h2', text: 'QLoRA: squeeze the base model into 4-bit' },
    { type: 'p', html: `LoRA saved the memory of gradients and the optimizer. But the frozen base model still has to be in memory: a 65B model in bf16 = 65 × 2 = ~130 GB. That does not fit on one GPU (48 GB or 80 GB). The idea of <strong>QLoRA</strong> (Dettmers et al., 2023): store the frozen W₀ in <strong>4-bit</strong> (4 times smaller), and train the LoRA adapters in 16-bit (bf16) as before. According to the paper, the memory for fine-tuning a 65B model dropped from >780 GB to <48 GB, with quality like 16-bit fine-tuning. With this they trained the <strong>Guanaco</strong> chatbot models.` },
    { type: 'callout', tone: 'term', title: 'New word: quantization, bf16, block (a short intro)', html: `<strong>What it is:</strong> <strong>Quantization</strong> = storing numbers in fewer bits, losing a little precision. 4 bits can hold only 2⁴ = 16 different values. <strong>bf16</strong> = a 16-bit float format (1 sign, 8 exponent, 7 mantissa bits). <strong>Block-wise</strong> = split the weights into small groups (here 64), each group with its own scale.<br><strong>Why we need it:</strong> 16-bit to 4-bit = 4 times less memory for the base model. With blocks, one big outlier spoils only its own block.<br><strong>Without it:</strong> the frozen base of a 65B model alone is ~130 GB: it does not fit on one GPU.<br>Full details: the <a href="#/ai-quantization">Precision and quantization</a> lesson.` },
    { type: 'p', html: `QLoRA has three new parts, and one important rule: <strong>storage dtype 4-bit NF4, compute dtype bf16</strong>. Every time a layer runs, its 4-bit weights are turned back into bf16 right away (dequantized) and a normal matrix multiply happens. The gradient also flows in bf16, but only LoRA\'s A and B get updated.` },
    { type: 'code', text: `One QLoRA linear layer (the paper's equation, simple notation):

Y(bf16) = X(bf16) · doubleDequant(c₁ fp32, c₂ fp8, W nf4)  +  X(bf16) · L₁(bf16) · L₂(bf16)
          \\______ frozen base, 4-bit to bf16 on-the-fly ____/     \\__ LoRA (A, B) ___/` },
    { type: 'h3', text: '1. NF4 (4-bit NormalFloat)' },
    { type: 'p', html: `In normal int4 the 16 levels are equally spaced (-7 to 7, with a scale). But trained weights are not evenly spread: most are near zero, like a bell curve (a normal distribution). So put the levels where the weights are! The 16 levels of NF4 come from the <strong>quantiles</strong> of the normal distribution, so that each level gets roughly the same number of weights, and are then normalized to [-1, 1]. Exact zero is also a level (padding/zero weights have no error). 7 negative, 0, and 8 positive:` },
    { type: 'ascii', text: `index:  0       1       2       3       4       5       6       7
value: -1.0000 -0.6962 -0.5251 -0.3949 -0.2844 -0.1848 -0.0910  0.0000
index:  8       9      10      11      12      13      14      15
value:  0.0796  0.1609  0.2461  0.3379  0.4407  0.5626  0.7230  1.0000

See: near zero the levels are close together (0.08 apart), at the edges far apart (0.28 apart).`, caption: 'The 16 values of NF4 (QLoRA paper Appendix E / bitsandbytes). We recomputed them from the quantiles of the normal distribution and they match.' },
    { type: 'callout', tone: 'term', title: 'New word: quantile', html: `<strong>What it is:</strong> sort the data and cut it into equal parts. The points where you cut are the quantiles. For example, cut 100 numbers into 4 equal parts: cut at the 25th, 50th and 75th number.<br><strong>Why we need it:</strong> if the 16 levels of 4-bit sit at the quantiles, each level gets roughly the same number of weights. No level sits empty.<br><strong>Without it (equally spaced levels):</strong> the levels at the edges are almost empty, and there is a crowd near zero: more rounding error there.` },
    { type: 'h3', text: 'NF4 worked example (one small block)' },
    { type: 'p', html: `A real block has 64 weights; here we take 8: <code>[0.12, -0.05, 0.31, -0.22, 0.02, -0.40, 0.08, 0.17]</code>.` },
    { type: 'steps', items: [
      { t: 'Find the absmax', d: 'The biggest |value| = 0.40. This is the block\'s <strong>quantization constant</strong> c (stored in fp32).' },
      { t: 'Normalize: each weight / 0.40', d: '<code>[0.3, -0.125, 0.775, -0.55, 0.05, -1, 0.2, 0.425]</code>. Now all are in [-1, 1].' },
      { t: 'The nearest NF4 level', d: '0.3 → 0.3379 (index 11); -0.125 → -0.0910 (6); 0.775 → 0.7230 (14); -0.55 → -0.5251 (2); 0.05 → 0.0796 (8); -1 → -1 (0); 0.2 → 0.1609 (9); 0.425 → 0.4407 (12).' },
      { t: 'Store', d: 'Only the 4-bit indexes: <code>11, 6, 14, 2, 8, 0, 9, 12</code> (in binary 1011, 0110, 1110, ...) + one constant 0.40.' },
      { t: 'Dequantize (during the forward pass)', d: 'level × 0.40: <code>[0.1352, -0.0364, 0.2892, -0.2100, 0.0318, -0.4000, 0.0644, 0.1763]</code>. The error from the original is small: max 0.0208, mean squared error 0.000171.' },
      { t: 'Compare with int4', d: 'The same block with int4 (scale 0.4/7): MSE 0.000209, max error 0.0243. NF4 is better. We also checked 200 random Gaussian blocks (64 each, seeded): int4\'s MSE is ~1.36 times NF4\'s.' },
    ]},
    { type: 'custom', render(el) {
      const NF = [-1, -0.6961928009986877, -0.5250730514526367, -0.39491748809814453, -0.28444138169288635, -0.18477343022823334, -0.09105003625154495, 0, 0.07958029955625534, 0.16093020141124725, 0.24611230194568634, 0.33791524171829224, 0.44070982933044434, 0.5626170039176941, 0.7229568362236023, 1];
      const DEF = [0.12, -0.05, 0.31, -0.22, 0.02, -0.40, 0.08, 0.17];
      let w = DEF.slice();
      const td = 'padding:3px 6px;border:1px solid var(--line);text-align:right;font:13px var(--f-mono)';
      el.innerHTML = `<div style="font-size:14px;color:var(--ink-2);margin-bottom:6px">A block of 8 weights. Change any value, or add an outlier (like 3.0) and see what happens to the other weights.</div>
        <div class="nq-in" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <div style="margin-top:8px"><button type="button" class="btn small ghost nq-reset">Example values</button> <button type="button" class="btn small ghost nq-out">Add an outlier</button></div>
        <div style="overflow-x:auto;margin-top:10px"><table class="nq-t" style="border-collapse:collapse;min-width:560px"></table></div>
        <div class="stats"><div class="stat"><span>absmax (constant c)</span><strong class="nq-c"></strong></div><div class="stat"><span>NF4 MSE / max error</span><strong class="nq-e1" style="font-size:16px"></strong></div><div class="stat"><span>int4 MSE / max error</span><strong class="nq-e2" style="font-size:16px"></strong></div></div>`;
      const drawIn = () => {
        el.querySelector('.nq-in').innerHTML = w.map((v, i) => `<input data-i="${i}" type="number" step="0.01" value="${v}" style="width:86px;font:13px var(--f-mono)">`).join('');
        el.querySelectorAll('.nq-in input').forEach(n => n.addEventListener('input', () => { const v = Number(n.value); if (isFinite(v)) { w[+n.dataset.i] = v; calc(); } }));
      };
      const calc = () => {
        const c = Math.max(...w.map(Math.abs)) || 1;
        const rows = w.map(v => {
          const z = v / c; let k = 0;
          NF.forEach((q, i) => { if (Math.abs(q - z) < Math.abs(NF[k] - z)) k = i; });
          const dq = NF[k] * c, qi = Math.max(-7, Math.min(7, Math.round(v / (c / 7)))), di = qi * c / 7;
          return { v, z, k, dq, qi, di };
        });
        const st = key => { const e = rows.map(r => r[key] - r.v); return (e.reduce((a, x) => a + x * x, 0) / e.length).toFixed(6) + ' / ' + Math.max(...e.map(Math.abs)).toFixed(4); };
        const line = (lab, fn) => `<tr><th style="${td};text-align:left;font-family:var(--f-body)">${lab}</th>${rows.map(r => `<td style="${td}">${fn(r)}</td>`).join('')}</tr>`;
        el.querySelector('.nq-t').innerHTML = line('w', r => r.v) + line('w / c', r => r.z.toFixed(4)) + line('NF4 index', r => r.k + ' <span style="color:var(--ink-3)">(' + r.k.toString(2).padStart(4, '0') + ')</span>') + line('NF4 level', r => NF[r.k].toFixed(4)) + line('dequant = level×c', r => r.dq.toFixed(4)) + line('int4 q (−7..7)', r => r.qi) + line('int4 dequant', r => r.di.toFixed(4));
        el.querySelector('.nq-c').textContent = c.toFixed(4);
        el.querySelector('.nq-e1').textContent = st('dq');
        el.querySelector('.nq-e2').textContent = st('di');
      };
      el.querySelector('.nq-reset').addEventListener('click', () => { w = DEF.slice(); drawIn(); calc(); });
      el.querySelector('.nq-out').addEventListener('click', () => { w = DEF.slice(); w[5] = 3; drawIn(); calc(); });
      drawIn(); calc();
    }},
    { type: 'p', html: `Press "Add an outlier": the absmax becomes 3.0, and the other small weights (0.02, 0.08...) mostly fall onto the same level. That is why blocks are kept small (64): an outlier spoils only its own 64, not the whole model.` },
    { type: 'h3', text: '2. Double quantization (squeeze the constants too)' },
    { type: 'p', html: `One fp32 constant (32 bits) for every 64 weights = <code>32 / 64 = 0.5 bits</code> extra per parameter. For a 65B model that is ~4 GB just for constants! QLoRA's trick: quantize these constants too.` },
    { type: 'code', text: `Without DQ:  1 constant (fp32) for every 64 weights     = 32/64            = 0.5   bits/param

With DQ:
  level-1 constants c₂ in 8-bit float (FP8, a float of only 8 bits)   8/64   = 0.125 bits/param
  one fp32 constant c₁ for every 256 c₂ constants         32/(64 × 256)    = 0.00195 bits/param
  (c₂ values are positive, so their mean is subtracted first to bring them around zero)
  total                                                   0.125 + 0.00195  ≈ 0.127 bits/param

Saving = 0.5 - 0.127 = 0.373 bits/param
65B model:  65 × 10⁹ × 0.373 / 8 bytes ≈ 3.03 GB saved` },
    { type: 'h3', text: '3. Paged optimizers' },
    { type: 'p', html: `During training a long sequence sometimes arrives, memory suddenly spikes, and the GPU crashes with "out of memory". QLoRA uses NVIDIA <strong>unified memory</strong>: when GPU memory is full, it automatically moves the optimizer states (Adam's m, v) to CPU RAM and brings them back when needed, just like an operating system swaps pages between RAM and disk. A slightly slower step instead of a crash.` },
    { type: 'callout', tone: 'term', title: 'New word: paging', html: `<strong>What it is:</strong> splitting memory into fixed-size "pages". A page that is not needed right now is sent to cheaper, bigger memory (here CPU RAM), and brought back when needed.<br><strong>Why we need it:</strong> GPU memory is small and expensive, CPU RAM is big and cheap. Buying a bigger GPU just for an occasional spike is wasteful.<br><strong>Without it:</strong> one long example arrives, memory is full, training crashes ("CUDA out of memory"), and hours of work are lost.` },
    { type: 'h2', text: 'Memory calculator: full vs LoRA vs QLoRA' },
    { type: 'custom', render(el) {
      const M = { '7': ['Llama 2 7B', 4096, 11008, 32], '13': ['Llama 2 13B', 5120, 13824, 40], '65': ['LLaMA 65B', 8192, 22016, 80] };
      let m = '65', dq = true;
      el.innerHTML = `<div class="chips mc-m" style="padding:0 0 8px">${Object.keys(M).map(k => `<button type="button" class="chip" data-k="${k}">${M[k][0]}</button>`).join('')}</div>
        <label>LoRA rank r (all linear layers): <strong class="mc-rv"></strong></label><input class="mc-r" type="range" min="2" max="7" step="1" value="6" style="width:100%">
        <label style="display:flex;gap:8px;align-items:center;margin-top:6px"><input class="mc-dq" type="checkbox" checked style="width:auto"> Double quantization (QLoRA)</label>
        <div class="mc-bars" style="margin-top:12px"></div>
        <div class="calc-note">Assumptions: full fine-tune = 16 bytes/param (bf16 weights + grads, fp32 master + Adam m, v). LoRA base = bf16, 2 bytes/param. QLoRA base = 4 bits + constants (0.127 bits with DQ, 0.5 without). Adapter params = 12 bytes each (bf16 weight + bf16 grad + fp32 Adam m, v). Activations are <strong>not</strong> included (they depend on batch and sequence length; gradient checkpointing reduces them). 1 GB = 10⁹ bytes.</div>`;
      const upd = () => {
        const [, d, ff, L] = M[m], r = 2 ** Number(el.querySelector('.mc-r').value);
        const P = L * (4 * d * d + 3 * d * ff) + 2 * 32000 * d, ad = r * (11 * d + 3 * ff) * L;
        const rows = [['Full fine-tune', P * 16], ['LoRA (bf16 base)', P * 2 + ad * 12], ['QLoRA (NF4 base)', P * (4 + (dq ? 0.127 : 0.5)) / 8 + ad * 12]];
        const max = rows[0][1];
        el.querySelector('.mc-rv').textContent = r + '  (' + (ad / 1e6).toFixed(1) + 'M adapter params)';
        el.querySelector('.mc-bars').innerHTML = rows.map(([n, b]) => {
          const gb = b / 1e9, fit = gb <= 24 ? 'fits a 24 GB GPU' : gb <= 48 ? 'fits a 48 GB GPU' : gb <= 80 ? 'fits an 80 GB GPU' : Math.ceil(gb / 80) + ' × 80 GB GPU';
          return `<div style="margin:8px 0"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;font-size:14px"><span>${n}</span><strong>${gb.toFixed(1)} GB · ${fit}</strong></div>
            <div style="height:12px;background:var(--surface-2);border-radius:6px;overflow:hidden"><div style="height:100%;width:${Math.max(1, gb * 1e9 / max * 100).toFixed(1)}%;background:var(--accent)"></div></div></div>`;
        }).join('');
        el.querySelectorAll('.mc-m .chip').forEach(c => c.classList.toggle('on', c.dataset.k === m));
      };
      el.querySelectorAll('.mc-m .chip').forEach(c => c.addEventListener('click', () => { m = c.dataset.k; upd(); }));
      el.querySelector('.mc-r').addEventListener('input', upd);
      el.querySelector('.mc-dq').addEventListener('change', e => { dq = e.target.checked; upd(); });
      upd();
    }},
    { type: 'p', html: `Default (LLaMA 65B, r = 64, all linear layers, DQ on): full fine-tune ~<strong>1,044.5 GB</strong>, LoRA ~<strong>140.2 GB</strong>, QLoRA ~<strong>43.3 GB</strong>: it fits on one 48 GB GPU (with a little room left for activations, and the paged optimizer handles spikes). Turn DQ off: QLoRA is 46.3 GB. The paper's ">780 GB" figure assumes 12 bytes/param (without the fp32 master copy); our calculator assumes 16.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion: "in QLoRA, training happens in 4-bit"', html: `No. 4-bit is only the <strong>storage</strong> (of the frozen W₀). Every matrix multiply happens in bf16 (the weights are dequantized on the spot), and the trainable LoRA weights are in bf16. That is why QLoRA is a little <em>slower</em> than LoRA (the dequantize work on every step), but uses much less memory.` },
    { type: 'callout', tone: 'tip', title: 'What it looks like in code (Hugging Face, sketch)', html: `Load the base model with <code>BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_use_double_quant=True, bnb_4bit_compute_dtype=torch.bfloat16)</code>, then <code>LoraConfig(r=16, lora_alpha=32, target_modules="all-linear", lora_dropout=0.05)</code> and <code>get_peft_model(model, config)</code>. (<code>lora_dropout</code> = during training, randomly set some numbers of the adapter's input to 0, so the adapter does not just memorize.) For a paged optimizer, use an optimizer name like <code>paged_adamw_8bit</code>.` },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `• Enough GPU memory, best quality needed, big data and a new domain (a new language, lots of code/maths)? <strong>Full fine-tune</strong>.<br>• The normal case: tone, format, one narrow task, or separate adapters for many customers? <strong>LoRA</strong> (all-linear, r = 8 to 64, α = r or 2r).<br>• The model does not fit on the GPU in bf16 (like 33B/65B/70B on one 24-48 GB GPU)? <strong>QLoRA</strong>. A little slower, quality close to LoRA.<br>• Deploy: one customer = merge (zero latency). Many customers = one base, swap adapters or use multi-adapter serving.<br>• First check that a prompt or RAG cannot do the job (<a href="#/ai-training-finetuning">the Decide ladder</a>).` },
    { type: 'h2', text: 'The whole picture: LoRA and QLoRA at a glance' },
    { type: 'p', html: `One LoRA layer, its training, deployment, and the extra parts of QLoRA, all in one diagram. Press the buttons.` },
    { type: 'diagram', title: 'LoRA / QLoRA: the whole picture', height: 640,
      groups: [
        { label: 'One LoRA layer (forward + training)', x: 12, y: 150, w: 694, h: 230 },
        { label: 'Deploy', x: 12, y: 420, w: 480, h: 206 },
      ],
      nodes: [
        { id: 'data', label: 'xyz examples', sub: 'support chats', x: 90, y: 70, kind: 'data', info: 'What it is: (question, answer) examples written in the tone of an xyz customer. The adapter is trained on these. A few hundred to a few thousand good examples are enough.' },
        { id: 'nf4', label: 'W₀ in NF4', sub: '4-bit + DQ consts', x: 290, y: 70, w: 150, kind: 'data', info: 'What it is: how the frozen base weight is stored in QLoRA. Each weight is a 4-bit NF4 index, with one constant per 64 weights (double quantized). About 4 times less memory than 16-bit.' },
        { id: 'pg', label: 'Paged Adam', sub: 'GPU ↔ CPU RAM', x: 650, y: 70, w: 110, kind: 'queue', info: 'What it is: QLoRA\'s paged optimizer. When the GPU is full, the Adam states of A and B move to CPU RAM and come back when needed. A slightly slower step instead of a crash on a spike.' },
        { id: 'x', label: 'Input x', sub: 'k numbers', x: 90, y: 210, kind: 'client', info: 'What it is: one token\'s vector coming from the previous layer. In our example [1, 2, 0, -1]. It goes into both paths (W₀ and A).' },
        { id: 'w0', label: 'W₀ · x', sub: 'frozen, bf16', x: 290, y: 210, w: 140, kind: 'server', info: 'What it is: the original layer\'s matrix multiply. The weights are frozen. In QLoRA they are dequantized from NF4 to bf16 on the spot and multiplied here. Example: [-3.5, 2, 3, -2].' },
        { id: 'sum', label: 'Sum', sub: 'W₀x + s·BAx', x: 470, y: 210, kind: 'server', info: 'What it is: the sum of both paths. The adapter\'s part is scaled by s = α/r. Example (s = 1): [-3.4, 2.5, 2.05, -0.55].' },
        { id: 'out', label: 'Output h', sub: 'next layer', x: 650, y: 210, w: 110, kind: 'client', info: 'What it is: this layer\'s result, which goes into the next layer. After merging we get exactly the same h.' },
        { id: 'A', label: 'A (down)', sub: 'r×k, random init', x: 290, y: 330, kind: 'cache', info: 'What it is: the trainable down matrix. It squeezes the k numbers of x into r numbers. Init random (Gaussian or Kaiming-uniform). Example: A·x = [0.5, 5].' },
        { id: 'B', label: 'B (up)', sub: 'd×r, zero init', x: 470, y: 330, kind: 'cache', info: 'What it is: the trainable up matrix. It spreads the r numbers back out to d. Init zero, so at the start ΔW = 0 and the model acts like the original.' },
        { id: 'loss', label: 'Loss + Adam', sub: 'only A, B', x: 650, y: 330, w: 110, kind: 'queue', info: 'What it is: the training part. Compare the output with the target to get the loss, then the gradients go only to B and A. Adam states exist only for them too: this is the real memory saving.' },
        { id: 'merge', label: 'Merge', sub: "W' = W₀ + s·BA", x: 120, y: 480, w: 150, kind: 'server', info: 'What it is: a one-time addition after training. Compute ΔW = B·A and add it into W₀. Now there is one matrix, zero extra latency. If the base is quantized, merge into a 16-bit base.' },
        { id: 'serve', label: 'xyz Assistant', sub: 'base + adapters', x: 390, y: 570, w: 160, kind: 'client', info: 'What it is: the deployed model. One customer: a merged model. Many customers: one base on the GPU and each request uses its own small adapter (multi-adapter serving).' },
      ],
      edges: [
        { a: 'data', b: 'x', n: 1 },
        { a: 'x', b: 'w0', n: 2 },
        { a: 'x', b: 'A', n: 2 },
        { a: 'nf4', b: 'w0', dashed: true, label: 'dequant' },
        { a: 'w0', b: 'sum', n: 3 },
        { a: 'A', b: 'B', n: 3 },
        { a: 'B', b: 'sum', n: 3 },
        { a: 'sum', b: 'out', n: 4 },
        { a: 'out', b: 'loss', n: 5 },
        { a: 'loss', b: 'B', kind: 'bad', n: 6 },
        { a: 'loss', b: 'pg', dashed: true, via: [[712, 330], [712, 70]] },
        { a: 'w0', b: 'merge', dashed: true, via: [[200, 260]] },
        { a: 'B', b: 'merge', dashed: true },
        { a: 'merge', b: 'serve', n: 7, kind: 'res', label: 'deploy' },
      ],
      paths: [
        { name: 'Forward pass', text: 'x goes down two paths: W₀·x (frozen) and s·B·(A·x) (adapter). They add up to h. Example: [-3.5, 2, 3, -2] + [0.1, 0.5, -0.95, 1.45] = [-3.4, 2.5, 2.05, -0.55].', go: ['x>w0>sum>out', 'x>A>B>sum'] },
        { name: 'Training step', text: 'Forward from an example, the loss, then the gradient only to B and A. W₀ gets no update, and no Adam states either.', go: ['data>x>A>B>sum>out>loss', 'loss>B>A'] },
        { name: 'Merge for deploy', text: 'After training, W\' = W₀ + s·B·A once. Now one matrix multiply like a normal model, zero latency, same output.', go: ['w0>merge', 'B>merge', 'merge>serve'] },
        { name: 'QLoRA', text: 'W₀ is stored in 4-bit NF4 and dequantized to bf16 at each layer for the multiply. The adapter trains in bf16. Adam states are paged: to CPU RAM when the GPU is full.', go: ['nf4>w0>sum', 'x>A>B>sum', 'loss>pg'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>LoRA: W₀ frozen, ΔW = s·B·A, B (d×r) and A (r×k), r very small. Output h = W₀x + s·B(Ax).</li>
      <li>Init: A random, B zero → at the start ΔW = 0. Both zero = nothing is learned. Both random = the output gets damaged.</li>
      <li>s = α/r is a volume knob. In practice α = r or 2r. For big r, rsLoRA (α/√r).</li>
      <li>Params per matrix = r × (d + k). 4096×4096, r = 8 → 65,536 (256 times fewer). On 7B, Wq+Wv, r = 8 → 4.19M, file 8.4 MB.</li>
      <li>Merge: W' = W₀ + s·BA, same output, zero latency. Or keep one base + swap many adapters.</li>
      <li>QLoRA: base 4-bit NF4 (storage), compute bf16, block 64, double quantization (0.5 → 0.127 bits/param), paged optimizers.</li>
      <li>Decide: LoRA for the normal case; QLoRA if the model does not fit on the GPU; full fine-tune for a new domain + big data + enough GPUs.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Trainable params from 0.03% to 2%: very little memory for gradients and Adam states', 'Adapter files in MBs: one base + many customers', 'Zero extra latency after merging', 'Frozen base: less forgetting', 'QLoRA: fine-tune a model like 65B on one 48 GB GPU'], costs: ['On a new domain or big data it learns a little less than a full fine-tune', 'New hyperparameters like r, α and target modules', 'A little extra compute when serving unmerged', 'QLoRA: slower training because of dequantizing, and merging into a quantized base is tricky', 'An adapter belongs to one specific base model: change the base and you must train again'] },
    { type: 'think', questions: [
      { q: 'd = k = 4096 and r = 8. For one matrix, how many trainable numbers in a full fine-tune vs LoRA? How many times fewer?', a: 'Full: 4096 × 4096 = 16,777,216. LoRA: r × (d + k) = 8 × 8192 = 65,536. 256 times fewer (16,777,216 / 65,536 = 256).' },
      { q: 'After training you get an adapter where B is still all zeros. What probably happened?', a: 'Maybe A was also initialised to zero (both zero = zero gradient), or the learning rate was 0 / the adapter\'s parameters were never given to the optimizer (they stayed frozen). Check: print the trainable params (in PEFT: print_trainable_parameters()).' },
      { q: 'xyz has 50 customers, each with its own LoRA adapter. Merge and deploy 50 models, or one base + 50 adapters?', a: 'One base + adapters. 50 merged models = the memory of 50 full sets of weights. With multi-adapter serving one base stays on the GPU and each request uses its customer\'s small adapter. A little extra compute, but much less memory and cost. If one customer has very heavy traffic, you can deploy a separate merged model just for them.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'In LoRA, with W₀ (d×k), what are the shapes of B and A?', options: ['B: k×r, A: r×d', 'B: d×r, A: r×k', 'B: d×d, A: k×k'], answer: 1, explain: 'ΔW = B·A must have the shape d×k: (d×r)·(r×k) = d×k.' },
      { q: 'Why is B set to zero in LoRA init?', options: ['To save memory', 'So that ΔW = 0 at step 0 and the model gives the original output', 'So that A does not train'], answer: 1, explain: 'With B = 0, ΔW = B·A = 0. A is random, so B\'s gradient is non-zero and training moves.' },
      { q: 'r = 2, α = 4. What is the scaling s, and how is ΔW used?', options: ['s = 0.5, W\' = W₀ + 0.5·BA', 's = 2, W\' = W₀ + 2·BA', 's = 8, W\' = W₀ · 8BA'], answer: 1, explain: 's = α/r = 4/2 = 2. In our example the output became [-3.3, 3, 1.1, 0.9].' },
      { q: 'What is the difference between the outputs of merged (W\'·x) and separate (W₀x + s·B(Ax))?', options: ['Merged is more accurate', 'Same output; merged needs fewer multiplications', 'Separate is always faster'], answer: 1, explain: 'Matrix multiplication is distributive, so the answer is the same. Merged needs only d×k multiplications, zero extra latency.' },
      { q: 'In QLoRA, in what precision does the matrix multiply happen?', options: ['4-bit NF4', 'bf16 (weights dequantized on the fly)', 'fp32'], answer: 1, explain: 'Storage NF4, compute bf16. So less memory, but each step is a little slower.' },
      { q: 'Double quantization reduces the memory for constants to how much (block 64)?', options: ['From 0.5 to 0.127 bits/param', 'From 4 to 2 bits/param', 'From 32 to 8 bits/param'], answer: 0, explain: '32/64 = 0.5 bits → 8/64 + 32/(64·256) ≈ 0.127 bits. ~3 GB saved on 65B.' },
    ]},
    { type: 'sources', items: [
      { title: 'LoRA: Low-Rank Adaptation of Large Language Models', publisher: 'Hu et al. (Microsoft), arXiv 2106.09685', year: 2021, url: 'https://arxiv.org/abs/2106.09685', used: 'h = W₀x + BAx, A random Gaussian and B zero init, α/r scaling with α set to the first r tried, Wq and Wv on GPT-3, 350 GB → 35 MB checkpoint, 1.2 TB → 350 GB VRAM, 25% speedup, no extra inference latency after merge.' },
      { title: 'QLoRA: Efficient Finetuning of Quantized LLMs', publisher: 'Dettmers et al., arXiv 2305.14314', year: 2023, url: 'https://arxiv.org/abs/2305.14314', used: 'NF4 construction (quantiles, asymmetric with exact zero), block size 64, double quantization (FP8 c₂, block 256, 0.5 → 0.127 bits, ~3 GB on 65B), paged optimizers via unified memory, NF4 storage + BF16 compute equation, LoRA on all linear layers needed, >780 GB → <48 GB, Guanaco.' },
      { title: 'PEFT LoRA developer guide', publisher: 'Hugging Face docs', official: true, url: 'https://huggingface.co/docs/peft/main/en/developer_guides/lora', used: 'Default init (Kaiming-uniform A, zero B), gaussian option, rsLoRA α/√r, merge_and_unload, target_modules="all-linear".' },
      { title: 'Making LLMs even more accessible with bitsandbytes, 4-bit quantization and QLoRA', publisher: 'Hugging Face blog', year: 2023, url: 'https://huggingface.co/blog/4bit-transformers-bitsandbytes', used: 'BitsAndBytesConfig options (nf4, double quant, bf16 compute dtype).' },
      { title: 'bitsandbytes NF4 code table (create_normal_map)', publisher: 'bitsandbytes (GitHub)', official: true, url: 'https://github.com/bitsandbytes-foundation/bitsandbytes', used: 'The 16 NF4 values; we recomputed them from normal quantiles in a script and matched to 1e-7.' },
      { title: 'LoRA Learns Less and Forgets Less', publisher: 'Biderman et al., arXiv 2405.09673', year: 2024, url: 'https://arxiv.org/abs/2405.09673', used: 'Trade-off: LoRA underperforms full fine-tuning on new domains but forgets less.' },
    ]},
  ],
});
