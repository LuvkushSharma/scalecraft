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
  title: 'Self-attention: Q, K, V haath se',
  minutes: 32,
  summary: `Transformer ka dil: har token baaki tokens ko "dekh ke" apna meaning update karta hai. Teen tokens ("xyz", "pe", "video") aur 4-number vectors ke saath Q, K, V, scores, scaling, softmax aur causal mask poora haath se calculate karenge.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `xyz Assistant ko prompt mila: "xyz pe video". Word "video" akela ye nahi jaanta ki ye <em>kiska</em> video hai.<br>Attention ek tareeka hai jisme har word baaki words se poochhta hai: "tum mere liye kitne kaam ke ho?". Jo zyada kaam ka, usse zyada info lo, baaki se thodi.<br>Is lesson mein ye poora hisaab haath se karenge: sirf 3 words, har word ke 4 numbers, aur guna-jod. Matrix kabhi nahi dekha? Koi baat nahi, wo bhi yahin shuru se seekhenge.` },
    { type: 'h2', text: 'Problem: "video" kis cheez ka hai?' },
    { type: 'p', html: `<a href="#/ai-transformer-overview">Overview</a> mein dekha: har token pehle ek <em>static</em> vector hai (embedding + <a href="#/ai-positional-encoding">position</a>). xyz Assistant ke prompt <code>xyz pe video</code> mein "video" ka vector har sentence mein same hai: wo nahi jaanta ki ye <em>xyz.com</em> ka video hai, YouTube ka nahi. Agla token sahi chunne ke liye "video" ko baaki tokens se context chahiye.` },
    { type: 'p', html: `Sawaal: "video" kaise decide kare ki kis token se kitna seekhna hai? Har sentence alag hai, to ye rule fix nahi likh sakte. Model ko khud, har input ke liye, ye "kisko kitna dhyaan dun" nikalna hoga. Isi ka naam hai <strong>self-attention</strong>.` },
    { type: 'callout', tone: 'term', title: 'Naya word: self-attention', html: `<strong>Ye kya hai:</strong> ek layer jisme har token, usi sentence ke har token (khud samet) ko ek score deta hai ("ye mere liye kitna relevant hai"), scores ko percentages (<strong>weights</strong>) mein badalta hai, aur un tokens ki information ka <strong>weighted average</strong> leke apna naya vector banata hai. "Self" isliye ki sab usi ek sentence ke andar ho raha hai (doosre sentence se ho to cross-attention).<br><strong>Kyun chahiye:</strong> har sentence alag hai, to "kisko kitna dhyaan dun" fix rule se nahi likh sakte. Attention ye har input ke liye khud nikaalta hai.<br><strong>Iske bina:</strong> "video" ka vector har sentence mein same rehta, context kabhi nahi milta.` },
    { type: 'callout', tone: 'term', title: 'Naya word: weighted average', html: `<strong>Ye kya hai:</strong> kai cheezon ka average, jisme har cheez ka "hissa" (weight) alag ho. Weights ka total 1 hota hai.<br><strong>Example:</strong> tumhare marks: test 1 mein 80, test 2 mein 60. Agar test 1 ka weight 0.75 aur test 2 ka 0.25 ho, to weighted average = 0.75×80 + 0.25×60 = 60 + 15 = <strong>75</strong> (simple average 70 hota).<br><strong>Kyun chahiye:</strong> attention har token ki info ko uske weight ke hisaab se milata hai: zyada relevant = bada hissa.<br><strong>Iske bina:</strong> sab tokens ko barabar hissa milta, chahe wo kaam ke hon ya nahi.` },

    { type: 'h2', text: 'Intuition: search engine jaisa' },
    { type: 'p', html: `xyz.com ka video search socho. Tum ek <strong>query</strong> likhte ho ("cricket highlights"). Har video ke paas ek title/tags hain, yaani uski <strong>key</strong>. Search engine query ko har key se match karta hai, aur jo match karein unka <strong>value</strong> (asli video) dikhata hai.` },
    { type: 'table', head: ['Role', 'Search engine mein', 'Attention mein (har token ke liye)'], rows: [
      ['Query (Q)', 'Jo tum dhoondh rahe ho', '"Mujhe kis tarah ki info chahiye?"'],
      ['Key (K)', 'Video ka title / tags', '"Mere paas kis tarah ki info hai?" (doosron ko dikhane ke liye label)'],
      ['Value (V)', 'Asli video', '"Agar mujhe chuna gaya to main ye info dunga"'],
    ]},
    { type: 'p', html: `Ek bada farak: search engine <em>top result</em> chunta hai (hard choice). Attention <strong>soft</strong> hai: sabka thoda thoda mix leta hai, match ke hisaab se. 50% xyz, 30% pe, 20% video jaisa. Isliye pura process smooth hai aur training mein seekha ja sakta hai.` },
    { type: 'h2', text: 'Pehle maths ka saaman (5 minute)' },
    { type: 'p', html: `Attention poora "tables of numbers" ka guna-jod hai. Agar tumne <a href="#/ai-transformer-overview">overview lesson</a> ka matrix wala hissa kiya hai to ye dohraana hai; nahi kiya to yahin se seekh lo. Sirf guna aur jod aana chahiye.` },
    { type: 'callout', tone: 'term', title: 'Naya word: vector aur matrix', html: `<strong>Ye kya hai:</strong> <strong>vector</strong> = numbers ki ek list, jaise <code>[2, 0, 1, 0]</code> (4 numbers). <strong>Matrix</strong> = kai vectors upar-neeche rakhi table. Uska <strong>shape</strong> = (rows × columns). Hamare 3 tokens, har ek 4 numbers ka: <code>3 × 4</code> matrix, har row ek token.<br><strong>Kyun chahiye:</strong> saare tokens ek table mein ho to computer sab pe ek saath kaam kar sakta hai.<br><strong>Iske bina:</strong> har token pe alag loop: slow, aur maths likhna bhi mushkil.` },
    { type: 'callout', tone: 'term', title: 'Naya word: dot product', html: `<strong>Ye kya hai:</strong> do same size ke vectors ke same jagah wale numbers guna karo, phir sab jodo. <code>[1, 2]·[3, 4] = 1×3 + 2×4 = 11</code>.<br><strong>Kyun chahiye:</strong> ye "kitna match" ka number hai. Dono vectors ke bade numbers same jagah hon to result bada. Attention ka score yahi hai.<br><strong>Iske bina:</strong> "ye token us token ke kitna kaam ka hai" naapne ka koi seedha tareeka nahi.` },
    { type: 'callout', tone: 'term', title: 'Naya word: matrix multiply (X·W)', html: `<strong>Ye kya hai:</strong> bahut saare dot products ek saath. Result ka cell (i, j) = <em>X ki row i</em> · <em>W ka column j</em>. Shape rule: <code>(a × b)·(b × c) = (a × c)</code>; beech ke numbers same hone chahiye. Hamare case mein <code>(3 × 4)·(4 × 4) = (3 × 4)</code>.<br><strong>Kyun chahiye:</strong> ek hi guna mein har token ka vector naye vector mein badal jaata hai (Q, K, V aise hi bante hain).<br><strong>Iske bina:</strong> 3 tokens × 4 numbers ke liye 12 alag hisaab haath se likhne padte; real model mein arabon.` },
    { type: 'callout', tone: 'term', title: 'Naya word: transpose (Kᵀ)', html: `<strong>Ye kya hai:</strong> matrix ko letaa do: rows columns ban jaati hain. K ka shape 3 × 4 hai to Kᵀ ka 4 × 3.<br><strong>Kyun chahiye:</strong> Q (3 × 4) ko K (3 × 4) se seedha guna nahi kar sakte (beech mein 4 aur 3 match nahi). Q·Kᵀ = (3 × 4)·(4 × 3) = (3 × 3): har token ki query ka har token ki key se dot product, ek hi guna mein.<br><strong>Iske bina:</strong> scores ki table ek step mein nahi banti.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Q, K, V (query, key, value)', html: `<strong>Ye kya hai:</strong> har token ke vector X se teen naye vectors: <code>Q = X·Wq</code> (query: "mujhe kya chahiye"), <code>K = X·Wk</code> (key: "mere paas kya hai", doosron ko dikhne wala label), <code>V = X·Wv</code> (value: "chuna gaya to main ye info dunga"). Wq, Wk, Wv teen seekhi hui matrices hain, sab tokens ke liye same. Har token ki apni Q, K, V row hoti hai.<br><strong>Kyun chahiye:</strong> "dhoondhna", "dikhna" aur "dena" teen alag kaam hain; teen alag "chashme" (W) inhe alag alag seekh paate hain.<br><strong>Iske bina:</strong> ek hi vector se teeno kaam karwane padte, aur token zyada tar khud ko hi sabse relevant maanta (neeche "confusion" dekho).` },
    { type: 'callout', tone: 'term', title: 'Naya word: d_k', html: `<strong>Ye kya hai:</strong> Q aur K vectors ki lambaai (kitne numbers). Hamare example mein d_k = 4. GPT-2 small mein har head (attention ka ek set, <a href="#/ai-multihead">multi-head lesson</a>) ka d_k = 64.<br><strong>Kyun chahiye:</strong> isi se score ko chhota karte hain: score ÷ √d_k. Wajah neeche experiment mein.<br><strong>Iske bina (scaling na karo):</strong> bade d_k pe scores bahut bade, softmax "sab kuch ek ko" de deta hai, training atakti hai.` },
    { type: 'h2', text: 'Haath se: step 1, X aur W' },
    { type: 'p', html: `Hamara tiny setup: 3 tokens, d_model = 4, d_k = 4, ek hi head. Numbers chhote integers rakhe hain taaki tum kaagaz pe check kar sako. Real model mein ye decimals hote hain aur training se seekhe jaate hain; yahan humne haath se chune hain. Ye same numbers <a href="#/ai-multihead">multi-head</a> aur <a href="#/ai-transformer-e2e">end-to-end</a> lessons mein bhi aayenge.` },
    { type: 'code', text: `X (har row ek token: embedding + position, already juda hua)
           d0 d1 d2 d3
  xyz   [  2, 0, 1, 0 ]
  pe    [  1, 0, 2, 0 ]
  video [  0, 2, 0, 1 ]

Wq = [ 0 0 0 1 ]     Wk = [ 1 1 0 0 ]     Wv = [ 1 0 1 0 ]
     [ 0 1 0 0 ]          [ 0 0 1 1 ]          [ 0 1 0 1 ]
     [ 1 1 0 0 ]          [ 1 0 1 0 ]          [ 0 0 1 0 ]
     [ 0 1 1 0 ]          [ 1 1 0 0 ]          [ 1 0 0 0 ]` },

    { type: 'h2', text: 'Step 2: Q, K, V nikaalo' },
    { type: 'p', html: `Ek row haath se: <strong>Q[xyz] = X[xyz] · Wq</strong>. X[xyz] = [2, 0, 1, 0] matlab "Wq ki row 0 ko 2 baar lo, row 2 ko 1 baar lo":<br><code>2 × [0,0,0,1] + 0 × [0,1,0,0] + 1 × [1,1,0,0] + 0 × [0,1,1,0] = [1, 1, 0, 2]</code>` },
    { type: 'p', html: `Isi tarah saari rows:` },
    { type: 'table', head: ['Token', 'Q = X·Wq', 'K = X·Wk', 'V = X·Wv'], rows: [
      ['xyz', '[1, 1, 0, 2]', '[3, 2, 1, 0]', '[2, 0, 3, 0]'],
      ['pe', '[2, 2, 0, 1]', '[3, 1, 2, 0]', '[1, 0, 3, 0]'],
      ['video', '[0, 3, 1, 0]', '[1, 1, 2, 2]', '[1, 2, 0, 2]'],
    ], caption: 'Teeno (3 × 4). Same X, teen alag "chashme" (W) se dekha.' },
    { type: 'h3', text: 'Matrix multiply haath se: har cell khud dekho' },
    { type: 'p', html: `Neeche X·W ka har cell ek button hai. Q, K ya V chuno, phir result ka koi bhi cell dabao: X ki kaunsi <strong>row</strong> aur W ka kaunsa <strong>column</strong> mile, wo highlight honge aur poora guna-jod likha aayega. Default: Q ka cell (video, 1).` },
    { type: 'custom', render(el) {
      const T = ['xyz', 'pe', 'video'];
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
        const gr = `<div><div class="calc-note" style="margin:0 0 4px">${m} (3 × 4): cell dabao</div><div style="display:grid;grid-template-columns:44px repeat(4,auto);gap:3px">` + R.map((r, i) => lab(T[i]) + r.map((v, j) => `<button type="button" class="rc" data-i="${i}" data-j="${j}" style="min-width:30px;padding:4px 6px;border-radius:4px;cursor:pointer;font:13px var(--f-mono);border:1px solid ${i === si && j === sj ? 'var(--accent)' : 'var(--line-2)'};background:${i === si && j === sj ? 'var(--accent)' : 'var(--surface)'};color:${i === si && j === sj ? 'var(--surface)' : 'var(--ink)'}">${v}</button>`).join('')).join('') + '</div></div>';
        q('.mx').innerHTML = gx + gw + gr;
        q('.mx').querySelectorAll('.rc').forEach(b => b.addEventListener('click', () => { si = +b.dataset.i; sj = +b.dataset.j; draw(); }));
        const row = X[si], col = M.map(r => r[sj]);
        q('.o-n').innerHTML = `${m}[${T[si]}][${sj}] = X ki row "${T[si]}" · W${m.toLowerCase()} ka column ${sj} = [${row.join(', ')}] · [${col.join(', ')}] = ${row.map((v, k) => v + '×' + col[k]).join(' + ')} = <strong>${R[si][sj]}</strong><br>Poori row "${T[si]}" = [${R[si].join(', ')}]. Shape: (3 × 4)·(4 × 4) = (3 × 4).`;
      };
      q('.mch').querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => { m = b.dataset.m; draw(); }));
      draw();
    }},
    { type: 'p', html: `Default cell: Q[video][1] = [0, 2, 0, 1]·[0, 1, 1, 1] = 0 + 2 + 0 + 1 = 3. Poori row Q[video] = [0, 3, 1, 0], upar wali table jaisi. K aur V pe bhi kuch cells dabao aur table se milao.` },

    { type: 'h2', text: 'Step 3: scores = Q · Kᵀ' },
    { type: 'p', html: `Har token ki query ko har token ki key se dot product. "video" ki row, haath se:` },
    { type: 'list', items: [
      `q<sub>video</sub>·k<sub>xyz</sub> = [0,3,1,0]·[3,2,1,0] = 0 + 6 + 1 + 0 = <strong>7</strong>`,
      `q<sub>video</sub>·k<sub>pe</sub> = [0,3,1,0]·[3,1,2,0] = 0 + 3 + 2 + 0 = <strong>5</strong>`,
      `q<sub>video</sub>·k<sub>video</sub> = [0,3,1,0]·[1,1,2,2] = 0 + 3 + 2 + 0 = <strong>5</strong>`,
    ]},
    { type: 'table', head: ['Query ↓ / Key →', 'xyz', 'pe', 'video'], rows: [
      ['xyz', '5', '4', '6'],
      ['pe', '10', '8', '6'],
      ['video', '7', '5', '5'],
    ], caption: 'Scores matrix (3 × 3). Row = kaun dekh raha hai, column = kisko dekh raha hai. Ye symmetric nahi hai: pe→xyz = 10, lekin xyz→pe = 4.' },

    { type: 'callout', tone: 'term', title: 'Naya word: softmax (aur e<sup>x</sup>)', html: `<strong>Ye kya hai:</strong> ek tareeka jo kisi bhi numbers ki list ko <strong>percentages</strong> mein badal deta hai: sab 0 aur 1 ke beech, total 1. Steps: har number ka <code>e<sup>x</sup></code> lo, phir har ek ko total se divide karo. <code>e</code> ek fixed number hai ≈ 2.718; <code>e<sup>x</sup></code> hamesha positive hota hai aur x badhne pe bahut tezi se badhta hai (e<sup>1</sup> ≈ 2.72, e<sup>2</sup> ≈ 7.39, e<sup>3</sup> ≈ 20.09).<br><strong>Example:</strong> [1, 2] → e<sup>1</sup> = 2.72, e<sup>2</sup> = 7.39, total 10.11 → [0.27, 0.73].<br><strong>Kyun chahiye:</strong> scores negative bhi ho sakte hain aur unka total kuch bhi. Weighted average ke liye positive weights chahiye jinka total 1 ho. Bada score = bada hissa.<br><strong>Iske bina:</strong> scores seedhe weights nahi ban sakte (negative weight ka matlab kya?). (<a href="#/ai-what-is-llm">LLM lesson</a> mein bhi dekha tha.)` },
    { type: 'h2', text: 'Step 4: √d_k se divide' },
    { type: 'p', html: `d_k = 4, to √4 = 2. Har score ko 2 se divide: <code>[[2.5, 2, 3], [5, 4, 3], [3.5, 2.5, 2.5]]</code>. Kyun? Thodi der mein ek widget se dikhayenge. Short: d_k bada ho to dot products bade ho jaate hain, aur softmax "winner takes all" ban jaata hai.` },

    { type: 'h2', text: 'Step 5: softmax, har row alag' },
    { type: 'p', html: `<strong>Softmax</strong> (<a href="#/ai-what-is-llm">LLM lesson</a> mein dekha) numbers ko percentages banata hai: har number ka e<sup>x</sup> lo, phir total se divide. "video" row [3.5, 2.5, 2.5]:` },
    { type: 'list', items: [
      `e<sup>3.5</sup> = 33.12, e<sup>2.5</sup> = 12.18, e<sup>2.5</sup> = 12.18. Total = 57.48`,
      `Weights = 33.12/57.48, 12.18/57.48, 12.18/57.48 = <strong>0.5761, 0.2119, 0.2119</strong>`,
    ]},
    { type: 'table', head: ['Token', '→ xyz', '→ pe', '→ video'], rows: [
      ['xyz', '0.3072', '0.1863', '0.5065'],
      ['pe', '0.6652', '0.2447', '0.0900'],
      ['video', '0.5761', '0.2119', '0.2119'],
    ], caption: 'Attention weights. Har row ka total 1. "video" ka 57.6% dhyaan "xyz" pe: "kiska video? xyz ka".' },

    { type: 'h2', text: 'Step 6: weights × V' },
    { type: 'p', html: `Har token ka naya vector = weights se V rows ka mix. "video":` },
    { type: 'code', text: `0.5761 × [2, 0, 3, 0]    (V of xyz)
+ 0.2119 × [1, 0, 3, 0]    (V of pe)
+ 0.2119 × [1, 2, 0, 2]    (V of video)
= [1.58, 0.42, 2.36, 0.42]` },
    { type: 'table', head: ['Token', 'Output (2 decimals)'], rows: [
      ['xyz', '[1.31, 1.01, 1.48, 1.01]'],
      ['pe', '[1.67, 0.18, 2.73, 0.18]'],
      ['video', '[1.58, 0.42, 2.36, 0.42]'],
    ], caption: 'Output (3 × 4): input jaisa hi shape. "video" ke vector mein ab xyz ki info ka bada hissa hai. (Rounded weights se haath se karoge to aakhri decimal mein ±0.01 farak aa sakta hai.)' },
    { type: 'callout', tone: 'term', title: 'Poora formula ek line mein', html: `<code>Attention(Q, K, V) = softmax( Q·Kᵀ / √d_k ) · V</code><br>Shapes: (3 × 4)·(4 × 3) = (3 × 3) scores → softmax (3 × 3) → ·(3 × 4) = (3 × 4). Yahi 2017 ke paper ka "scaled dot-product attention" hai.` },
    { type: 'image', src: 'assets/img/ai-attention/attention-head.png', maxWidth: 640, alt: 'Ek attention head ka diagram: teen inputs alag alag W^Q, W^K, W^V matrices se guzar ke query, key aur value bante hain, jo "Scaled (masked) Dot-Product Attention" box mein jaate hain; right mein poora set ek "Attention Head" box ki tarah.', caption: 'Wikimedia Commons ka ek diagram, wahi kahani: input teen matrices (W<sup>Q</sup>, W<sup>K</sup>, W<sup>V</sup>) se guzar ke Q, K, V banta hai, phir scaled (masked) dot-product attention. Symbols: ℓ<sub>seq</sub> = tokens ki ginti (hamara n = 3), d = vector ki lambaai (hamara 4). Self-attention mein teeno inputs same X hain; cross-attention mein query alag sentence se aati hai.', credit: { text: 'Cosmia Nebula, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Transformer_architecture_-_Attention_Head_module.png', license: 'CC BY-SA 4.0' } },
    { type: 'h2', text: 'Playground: khud badlo, khud dekho' },
    { type: 'p', html: `Token chuno, uski poori calculation numbers ke saath dikhegi. X ka koi number badlo: Q, K, V, scores, weights, output sab turant dobara banenge. Scaling aur causal mask on/off karke farak dekho.` },
    { type: 'custom', render(el) {
      const T = ['xyz', 'pe', 'video'];
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
        q('.steps-o').innerHTML = `<div class="calc-note"><strong>1. Scores</strong> (token "${t}" ki query, sabki keys):<br>${dots}</div>
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
    { type: 'p', html: `Kuch experiments: (1) "video" chuno, scaling OFF karo: weights [0.5761, 0.2119, 0.2119] se [0.7870, 0.1065, 0.1065] ho jaate hain, zyada "sharp". (2) X mein video ka d1 2 se 0 karo: "video" ki query, key aur value teeno badal jaate hain; ab scores [3, 3, 1] aate hain aur dhyaan xyz aur pe mein barabar (0.4223 each) bant jaata hai, video pe sirf 0.1554. (3) Causal mask ON karke "pe" chuno: wo "video" ko dekh hi nahi sakta.` },
    { type: 'h2', text: '√d_k kyun? Ek experiment' },
    { type: 'callout', tone: 'term', title: 'Naya word: spread (variance aur std)', html: `<strong>Ye kya hai:</strong> numbers average se kitna door bikhre hain. <strong>Std</strong> (standard deviation) = "typical doori" average se. <strong>Variance</strong> = std ka square.<br><strong>Example:</strong> [9, 10, 11] ka average 10, numbers 1-1 door: std ≈ 0.82. [0, 10, 20] ka average bhi 10, lekin std ≈ 8.16: zyada bikhre.<br><strong>Kyun yahan:</strong> scores jitne bikhre (bada std), softmax utna "ek hi winner" banata hai.<br><strong>Iske bina:</strong> √d_k ka reason samajh nahi aayega.` },
    { type: 'p', html: `Real models mein d_k = 64 ya 128 hota hai. Agar Q aur K ke numbers random-ish hain (average 0, spread 1), to unka dot product d_k numbers ka jod hai, aur jod ka spread badhta hai: <strong>variance = d_k</strong>, yaani typical size ≈ √d_k. 2017 ke paper ka yahi argument hai. Bade scores softmax mein jaate hain to ek token ~100% le leta hai, baaki ~0%. Us haalat mein softmax ke <strong>gradients</strong> (training ka "kis taraf sudhaaro" signal) lagbhag zero ho jaate hain, aur model seekhna band kar deta hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: gradient', html: `<strong>Ye kya hai:</strong> training mein model har weight ke liye poochhta hai: "isse thoda badhaun ya ghataun to galti kam hogi?" Is jawab (direction + kitna) ko <strong>gradient</strong> kehte hain.<br><strong>Kyun chahiye:</strong> isi signal se weights sudharte hain; yahi "seekhna" hai.<br><strong>Iske bina (gradient ~0):</strong> agar output ek weight ke chhote badlaav se bilkul nahi hilta (jaise <strong>saturated</strong> softmax, jahan ek token ~100% le chuka hai), to gradient ~0, aur wo weight seekh hi nahi paata.` },
    { type: 'p', html: `Neeche simulation: random (seeded, har baar same) query aur 8 keys, 40 baar. d_k badlo aur dekho.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div><label>d_k: <strong class="v-d">64</strong></label><input class="i-d" type="range" min="0" max="4" step="1" value="2"></div>
        <div class="stats">
          <div class="stat"><span>Raw score ka spread (std)</span><strong class="o-sd"></strong></div>
          <div class="stat"><span>√d_k</span><strong class="o-sq"></strong></div>
          <div class="stat"><span>Avg top weight, bina scaling</span><strong class="o-un"></strong></div>
          <div class="stat"><span>Avg top weight, ÷√d_k ke saath</span><strong class="o-sc"></strong></div>
        </div>
        <div class="calc-note">8 keys mein agar dhyaan barabar bante to har ek ko 0.125 milta. Top weight 1.00 ke paas = ek token ne sab kuch le liya (saturated).</div>`;
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
    { type: 'p', html: `Results: d_k = 4 pe spread 1.94 (√4 = 2), bina scaling top weight 0.49. d_k = 64 pe spread 7.40 (√64 = 8), top weight 0.91. d_k = 1024 pe 0.98: lagbhag one-hot. Scaling ke saath har d_k pe top weight 0.33-0.39 ke beech rehta hai: softmax "naram" rehta hai aur training chalti rehti hai.` },

    { type: 'h2', text: 'Causal mask: future mat dekho' },
    { type: 'p', html: `Decoder (GPT jaisa) ka kaam hai agla token guess karna. Training mein poora sentence ek saath andar jaata hai (<a href="#/ai-transformer-overview">overview</a> mein dekha). Agar "pe" wali position "video" ko dekh sake, to wo agla token guess nahi karegi, seedha copy karegi. Training mein score shaandaar, asli generation mein bekaar, kyunki tab future hota hi nahi.` },
    { type: 'callout', tone: 'term', title: 'Naya word: causal mask', html: `<strong>Ye kya hai:</strong> scores matrix mein har wo cell jahan key ka token query ke token se <em>baad</em> aata hai, use softmax se pehle <strong>−∞</strong> (minus infinity, "sabse chhota possible number") kar do. e<sup>−∞</sup> = 0, to us token ka weight exactly 0. "Causal" isliye ki har token sirf apne "past" (aur khud) pe depend karta hai.<br><strong>Kyun chahiye:</strong> agla token guess karna seekhne wala model aage ka token dekh ke "copy" na kar sake.<br><strong>Iske bina:</strong> training mein loss shaandaar, asli generation mein kachra (neeche flow mein failure scenario).` },
    { type: 'code', text: `Scaled scores           Mask lagao              Softmax (row-wise)
[2.5   2    3  ]        [2.5   −∞   −∞ ]        [1.0000  0       0     ]   xyz sirf khud ko
[5     4    3  ]   →    [5     4    −∞ ]   →    [0.7311  0.2689  0     ]   pe: xyz + khud
[3.5   2.5  2.5]        [3.5   2.5  2.5]        [0.5761  0.2119  0.2119]   video: sab` },
    { type: 'p', html: `Masked outputs: xyz = [2, 0, 3, 0] (sirf apna V), pe = [1.73, 0, 3, 0], video = [1.58, 0.42, 2.36, 0.42] (aakhri token pehle bhi sab dekh raha tha, to same). Playground mein mask ON karke check karo. Encoder (BERT) mein ye mask nahi hota: wahan har token dono taraf dekhta hai.` },
    { type: 'callout', tone: 'mistake', title: '"Mask matlab weight ko 0 kar do, softmax ke baad"', html: `Softmax ke <em>baad</em> 0 karoge to row ka total 1 nahi rahega (pe ki row 0.6652 + 0.2447 = 0.91 bachegi). Isliye mask softmax se <strong>pehle</strong>, score ko −∞ karke lagta hai; softmax khud baaki weights ko dobara 1 tak normalize kar deta hai (0.7311 + 0.2689 = 1).` },
    { type: 'h2', text: 'Diagram: attention layer ke andar' },
    { type: 'flow', height: 290,
      nodes: [
        { id: 'x', label: 'X (input)', sub: '3 × 4', x: 100, y: 70, w: 150, kind: 'client', info: 'Ye kya hai: attention layer ka input. Har token ka vector (embedding + position, ya pichhli layer ka output). Hamare example mein 3 tokens × 4 numbers.' },
        { id: 'qkv', label: 'Q, K, V', sub: 'X·Wq, X·Wk, X·Wv', x: 350, y: 70, w: 170, kind: 'server', info: 'Ye kya hai: X ko teen alag "chashmon" se dekhna. Teen seekhi hui matrices se teen projections. Q = main kya dhoondh raha hoon, K = mere paas kya hai, V = main kya dunga. Har ek 3 × 4.' },
        { id: 'sc', label: 'Scores', sub: 'Q·Kᵀ / √d_k', x: 600, y: 70, w: 150, kind: 'cache', info: 'Ye kya hai: "kaun kisko kitna dekhe" ki table. Har query ka har key se dot product, phir √d_k se divide. Shape n × n (yahan 3 × 3). Context lamba = ye matrix bahut badi.' },
        { id: 'sm', label: 'Mask+Softmax', sub: 'har row = 1', x: 600, y: 220, w: 150, kind: 'queue', info: 'Ye kya hai: scores ko weights (percentages) banane wala step. Decoder mein future cells −∞ (causal mask). Phir row-wise softmax: scores → weights, har row ka total 1.' },
        { id: 'wv', label: 'Weights × V', sub: 'weighted mix', x: 350, y: 220, w: 170, kind: 'server', info: 'Ye kya hai: info milaane ka step. Har token ka naya vector = sab tokens ke V ka weighted average. Shape wapas 3 × 4.' },
        { id: 'out', label: 'Output', sub: 'context-aware', x: 100, y: 220, w: 150, kind: 'data', info: 'Ye kya hai: attention ka result. Har token ka naya, context wala vector. Iske baad residual (X + output), LayerNorm, phir FFN. Multi-head mein aise kai outputs jud ke Wo se guzarte hain.' },
      ],
      edges: [{ a: 'x', b: 'qkv' }, { a: 'qkv', b: 'sc' }, { a: 'sc', b: 'sm' }, { a: 'sm', b: 'wv' }, { a: 'qkv', b: 'wv', dashed: true, id: 'vpath' }, { a: 'wv', b: 'out' }],
      scenarios: [
        { name: '"video" (happy path)', steps: [
          { title: 'Input', text: '3 tokens ke vectors aaye.', focus: ['x'], msg: 'X[video] = [0, 2, 0, 1]' },
          { title: 'Projections', text: 'Teeno matrices se Q, K, V.', go: 'x>qkv', after: { qkv: { state: 'ok' } }, msg: 'Q[video] = [0,3,1,0]   K[xyz] = [3,2,1,0]   V[xyz] = [2,0,3,0]' },
          { title: 'Scores', text: '"video" ki query sab keys se: 7, 5, 5. √4 = 2 se divide.', go: 'qkv>sc', after: { sc: { state: 'ok', sub: '[3.5, 2.5, 2.5]' } }, msg: '[7, 5, 5] / 2 = [3.5, 2.5, 2.5]' },
          { title: 'Softmax', text: '57.6% dhyaan xyz pe.', go: 'sc>sm', after: { sm: { state: 'ok', sub: '[.58 .21 .21]' } }, msg: 'softmax → [0.5761, 0.2119, 0.2119]' },
          { title: 'V ka mix', text: 'Weights se V rows ka weighted jod. V seedha Q/K/V box se aata hai (dashed line).', go: ['sm>wv', 'qkv>wv'], parallel: true, after: { wv: { state: 'ok' } }, msg: '0.5761·[2,0,3,0] + 0.2119·[1,0,3,0] + 0.2119·[1,2,0,2]' },
          { title: 'Naya "video"', text: 'Ab "video" ke vector mein xyz ki info. Static se contextual.', go: 'wv>out', after: { out: { state: 'hit', sub: '[1.58 .42 2.36 .42]' } } },
        ]},
        { name: 'Failure: scaling nahi', intro: 'Bada model, d_k = 64, aur kisi ne √d_k wala divide hata diya.', steps: [
          { title: 'Bade scores', text: 'Dot products ka spread ~8 (√64). Scores jaise [24, 9, −6, ...].', go: 'x>qkv>sc', set: { sc: { state: 'warn', sub: 'no ÷√d_k' } } },
          { title: 'Softmax saturated', text: 'Ek token ~100%, baaki ~0. Experiment widget mein d_k = 64 pe top weight avg 0.91 tha.', go: 'sc>sm', after: { sm: { state: 'hot', sub: 'one-hot' } } },
          { title: 'Training atak gayi', text: 'Saturated softmax ke gradients ~0. Loss dheere girta hai ya atak jaata hai. Fix: ÷√d_k wapas lagao.', focus: ['sm'], after: { wv: { state: 'warn', sub: 'seekh nahi raha' } } },
        ]},
        { name: 'Failure: mask bhool gaye', intro: 'Decoder train ho raha hai, lekin causal mask code se gayab.', steps: [
          { title: 'Future dikh raha', text: '"pe" wali position, jiska target "video" hai, "video" ki key dekh leti hai.', go: 'x>qkv>sc>sm', set: { sm: { state: 'warn', sub: 'no mask' } } },
          { title: 'Cheating', text: 'Model seekhta hai "agle token ko copy karo". Training loss jhoot mooth bahut kam.', go: 'sm>wv>out', after: { out: { state: 'hit', sub: 'loss bahut kam?!' } } },
          { title: 'Generation mein fail', text: 'Asli use mein future token hai hi nahi. Jo trick seekhi wo kaam nahi aati: output kachra. Fix: softmax se pehle −∞ mask.', set: { out: { state: 'down', sub: 'kachra output' } }, focus: ['out'] },
        ]},
        { name: 'Failure: bahut lamba context', steps: [
          { title: 'Ek lakh tokens', text: 'xyz Assistant ne poore help-docs prompt mein bhar diye: n = 1,00,000.', go: 'x>qkv>sc', set: { x: { sub: 'n = 1,00,000' } } },
          { title: 'n × n phat gaya', text: 'Scores matrix 10<sup>10</sup> cells, har head, har layer. 2 bytes per number pe ~20 GB sirf ek matrix ke liye.', set: { sc: { state: 'down', sub: '10¹⁰ cells' } }, focus: ['sc'] },
          { title: 'Fix', text: 'Engineering: FlashAttention jaise kernels (GPU pe chalne wale khaas, tez programs) poori matrix memory mein rakhe bina tukdon mein compute karte hain (memory bachti hai, compute ab bhi n²). App side: sirf relevant chunks bhejo (RAG).', set: { sc: { state: 'ok', sub: 'tiled' }, x: { sub: 'trimmed' } }, go: 'sc>sm>wv>out' },
        ]},
      ],
    },
    { type: 'h2', text: 'Keemat: n² ka hisaab' },
    { type: 'table', head: ['Context n (tokens)', 'Scores per head per layer (n²)', 'Ek matrix, 2 bytes per number'], rows: [
      ['1,000', '10 lakh (10⁶)', '2 MB'],
      ['8,000', '6.4 crore (6.4 × 10⁷)', '128 MB'],
      ['1,00,000', '1,000 crore (10¹⁰)', '20 GB'],
    ], caption: 'Context 8 guna (1,000 → 8,000) = scores 64 guna. Isliye lambe context mehnge hain, aur FlashAttention (2022 ka paper) jaise memory-efficient kernels zaroori.' },
    { type: 'p', html: `2022 ke FlashAttention paper ne dikhaya ki exact attention ko GPU memory mein poori n × n matrix rakhe bina, chhote tukdon (tiles) mein nikala ja sakta hai: memory bahut bachti hai, lekin compute ab bhi n² hai. Generation ke time ek trick aur hai: pichhle tokens ke K aur V har step pe dobara nahi banate, memory mein rakh lete hain (<strong>KV cache</strong>). Detail <a href="#/ai-multihead">multi-head lesson</a> mein.` },

    { type: 'h2', text: 'Self, masked aur cross attention' },
    { type: 'callout', tone: 'term', title: 'Naya word: cross-attention', html: `<strong>Ye kya hai:</strong> wahi formula, bas Q ek sentence se aur K, V <em>doosre</em> se. Jaise translation mein decoder (Hindi likh raha) ki query, encoder (English padh chuka) ke keys aur values se.<br><strong>Kyun chahiye:</strong> output likhte waqt input ko dekhna padta hai.<br><strong>Iske bina:</strong> decoder ko input sentence ka pata hi nahi chalta. Detail: <a href="#/ai-multihead">multi-head lesson</a>.` },
    { type: 'table', head: ['Type', 'Q kahan se', 'K, V kahan se', 'Mask', 'Kahan'], rows: [
      ['Self-attention (encoder)', 'Same sentence', 'Same sentence', 'Nahi (dono taraf dekho)', 'BERT, encoder'],
      ['Masked self-attention', 'Same sentence', 'Same sentence', 'Causal', 'GPT jaise decoder-only LLMs'],
      ['Cross-attention', 'Decoder (output likh raha)', 'Encoder ka output (input sentence)', 'Nahi', 'Translation models, T5'],
    ]},
    { type: 'callout', tone: 'tip', title: 'Decide', html: `• Model ko sirf <strong>samajhna</strong> hai (classify, embed) → bina mask wala self-attention (encoder): har token dono taraf ka context leta hai.<br>• Model ko <strong>generate</strong> karna hai → causal (masked) self-attention, warna training mein cheating.<br>• Output ko ek <strong>alag input</strong> (doosri bhasha ka sentence, image features) dekhna hai → cross-attention.<br>• Context bahut lamba aur mehnga → pehle input chhota karo (relevant chunks, RAG), phir efficient kernels. n² ko ignore mat karo.` },
    { type: 'callout', tone: 'mistake', title: '"Q, K, V teen alag inputs hain"', html: `Self-attention mein teeno <strong>usi ek X</strong> se aate hain, bas alag W matrices se. Teen alag W isliye ki "main kya dhoondh raha hoon" (Q) aur "main kya offer karta hoon" (K) aur "main kya dunga" (V) alag cheezein ho sakti hain. Agar Q = K hota, to har token ka khud se score q·q hamesha positive aur aksar sabse bada hota: token zyada tar khud ko hi dekhta rehta.` },
    { type: 'callout', tone: 'mistake', title: '"Attention weights = model ka reason"', html: `Weights batate hain kis token ki info zyada mili, lekin ye poori "explanation" nahi. Bade models mein kai heads aur layers milke kaam karte hain, aur residual/FFN bhi output badalte hain. Research mein dikha hai ki sirf attention weights dekh ke model ka faisla samajhna aksar galat nikalta hai. Debugging hint ki tarah use karo, proof ki tarah nahi.` },
    { type: 'callout', tone: 'mistake', title: '"W matrices humne likhi hain"', html: `Is lesson mein haan, samjhaane ke liye. Asli model mein Wq, Wk, Wv random numbers se shuru hote hain aur training (next-token prediction, arbon tokens) unhe dheere dheere aisa bana deti hai ki useful patterns pakdein. Koi insaan "video ko xyz pe dhyaan do" nahi likhta.` },

    { type: 'callout', tone: 'tip', title: 'Thoda itihaas, aur ek chetavani', html: `Attention ka idea 2014 mein Bahdanau, Cho aur Bengio ne translation ke liye diya tha, tab wo RNN ke upar ek add-on tha. 2017 ke Transformer ne RNN hata ke poora model sirf attention pe bana diya. Picture se samajhna ho to Jay Alammar ka 2018 wala "The Illustrated Transformer" padho. Ek chetavani bhi: 2019 ke paper "Attention is not Explanation" ne dikhaya ki attention weights ko seedha "model ne ye answer kyon diya" ka saboot maan lena galat ho sakta hai. Weights batate hain kisne kitna mix kiya, poori wajah nahi.` },
    { type: 'h2', text: 'Poori picture' },
    { type: 'p', html: `Ek attention head ka poora raasta, hamare tiny numbers ke saath. Buttons se ek ek hissa highlight karo.` },
    { type: 'diagram', title: 'Self-attention: poori picture', height: 580,
      nodes: [
        { id: 'x', label: 'X (input)', sub: '3 × 4', x: 80, y: 250, w: 120, kind: 'client', info: 'Ye kya hai: har token ka vector, ek row per token: xyz [2,0,1,0], pe [1,0,2,0], video [0,2,0,1]. Embedding + position, ya pichhli layer ka output.' },
        { id: 'wq', label: 'Wq', sub: '4 × 4', x: 225, y: 110, w: 110, kind: 'data', info: 'Ye kya hai: query banane wali matrix. Training mein seekhi jaati hai, sab tokens ke liye same.' },
        { id: 'wk', label: 'Wk', sub: '4 × 4', x: 225, y: 250, w: 110, kind: 'data', info: 'Ye kya hai: key banane wali matrix. Wq se alag, isliye "dhoondhna" aur "dikhna" alag seekhe ja sakte hain.' },
        { id: 'wv', label: 'Wv', sub: '4 × 4', x: 225, y: 390, w: 110, kind: 'data', info: 'Ye kya hai: value banane wali matrix: chuna gaya token kaunsi info aage dega.' },
        { id: 'q', label: 'Q = X·Wq', sub: 'kya chahiye', x: 370, y: 110, w: 120, kind: 'server', info: 'Ye kya hai: har token ki query, 3 × 4. Q[video] = [0, 3, 1, 0].' },
        { id: 'k', label: 'K = X·Wk', sub: 'mere paas kya', x: 370, y: 250, w: 120, kind: 'server', info: 'Ye kya hai: har token ki key, 3 × 4. K[xyz] = [3, 2, 1, 0].' },
        { id: 'v', label: 'V = X·Wv', sub: 'main kya dunga', x: 370, y: 390, w: 120, kind: 'server', info: 'Ye kya hai: har token ki value, 3 × 4. V[xyz] = [2, 0, 3, 0].' },
        { id: 'sc', label: 'Scores', sub: 'Q·Kᵀ ÷ √d_k', x: 560, y: 110, w: 170, kind: 'cache', info: 'Ye kya hai: har query ka har key se dot product, ÷ √4 = 2. Shape 3 × 3. "video" row: [7, 5, 5] → [3.5, 2.5, 2.5].' },
        { id: 'mk', label: 'Causal mask', sub: 'future = −∞', x: 560, y: 220, w: 170, kind: 'threat', info: 'Ye kya hai: decoder (GPT) mein aage wale tokens ke scores −∞, taaki koi token future na dekhe. Encoder (BERT) mein ye step nahi hota.' },
        { id: 'sm', label: 'Softmax', sub: 'har row ka total 1', x: 560, y: 330, w: 170, kind: 'queue', info: 'Ye kya hai: har row ke scores ko weights banana: e^x ÷ total. "video": [0.5761, 0.2119, 0.2119].' },
        { id: 'out', label: 'Weights · V', sub: 'weighted mix', x: 560, y: 450, w: 170, kind: 'server', info: 'Ye kya hai: har token ka naya vector = weights se V rows ka mix. "video" = [1.58, 0.42, 2.36, 0.42].' },
        { id: 'nx', label: 'Output', sub: '→ Add & Norm, FFN', x: 300, y: 530, w: 170, kind: 'data', info: 'Ye kya hai: attention ka result (3 × 4, input jaisa shape). Iske baad residual (X + output), LayerNorm aur FFN. Multi-head mein kai heads ke outputs jud ke Wo se guzarte hain.' },
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
        { name: 'Make Q,K,V', text: 'Same X, teen alag seekhi hui matrices se guna: Q = X·Wq, K = X·Wk, V = X·Wv. Har ek 3 × 4.', go: ['x>wq>q', 'x>wk>k', 'x>wv>v'] },
        { name: 'Scores + softmax', text: 'Har query ka har key se dot product (Q·Kᵀ), ÷ √d_k, phir har row pe softmax. Encoder mein mask nahi lagta (dashed raasta).', go: ['q>sc', 'k>sc', 'sc>sm'] },
        { name: 'Weighted sum', text: 'Weights se V rows ka mix: "video" = 0.5761·V[xyz] + 0.2119·V[pe] + 0.2119·V[video] = [1.58, 0.42, 2.36, 0.42]. Phir Add & Norm aur FFN.', go: ['sm>out>nx', 'v>out'] },
        { name: 'Causal mask', text: 'Decoder mein softmax se pehle future scores −∞. "pe" ki row [5, 4, −∞] → [0.7311, 0.2689, 0]. Softmax ke baad 0 karna galat hai.', go: ['q>sc', 'k>sc', 'sc>mk>sm>out'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Attention(Q, K, V) = softmax(Q·Kᵀ / √d_k) · V. Shapes: (3 × 4) → scores (3 × 3) → output (3 × 4).</li>
      <li>Q, K, V teeno usi X se, teen alag seekhi hui matrices se: Q = X·Wq, K = X·Wk, V = X·Wv.</li>
      <li>Matrix multiply = har cell ek dot product (row · column). Dot product bada = zyada match.</li>
      <li>Softmax scores ko weights banata hai (positive, total 1); output = weights se V ka weighted average.</li>
      <li>√d_k se divide, warna bade d_k pe softmax saturate hota hai aur gradients ~0.</li>
      <li>Causal mask: softmax se <em>pehle</em> future scores −∞. Decoder mein zaroori, encoder mein nahi.</li>
      <li>Keemat: scores n × n. Context 8 guna = scores 64 guna. FlashAttention memory bachata hai; RAG input chhota karta hai.</li>
    </ul>` },
    { type: 'tradeoffs', gains: [
      'Har token ko poore sentence ka context, ek hi step mein (path length 1)',
      'Weights input ke hisaab se badalte hain: har sentence ke liye alag "dhyaan"',
      'Saara kaam matrix multiplication: GPU pe parallel aur fast',
      'Same mechanism se encoder, decoder aur cross-attention',
    ], costs: [
      'n × n scores: memory aur compute context ke saath quadratic',
      'Order khud nahi pata: positional encoding chahiye',
      'Decoder mein mask zaroori, galti hui to silent cheating',
      'Bina √d_k scaling ke softmax saturate, training atak sakti hai',
    ]},
    { type: 'think', questions: [
      { q: 'Scores matrix mein pe→xyz = 10 lekin xyz→pe = 4. Ye symmetric kyun nahi?', a: 'pe→xyz = q_pe·k_xyz aur xyz→pe = q_xyz·k_pe. Q aur K alag matrices (Wq ≠ Wk) se bane hain, to dono dot products alag. "Mujhe tumhari zaroorat" aur "tumhe meri zaroorat" barabar hona zaroori nahi.' },
      { q: 'Agar saare scores ek jaise ho jaayein (jaise [2, 2, 2]), to output kya hoga?', a: 'Softmax barabar weights dega (1/3 each), to output = teeno V rows ka simple average. Token ne kisi pe khaas dhyaan nahi diya: context mila, lekin "focused" nahi.' },
      { q: 'Causal mask ke saath pehle token ("xyz") ka output hamesha sirf apna V kyun hota hai?', a: 'Uske pehle koi token nahi hai, aur aage wale masked hain. Softmax mein sirf ek valid score bacha, to weight 1. Output = V[xyz] = [2, 0, 3, 0].' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Self-attention mein Q, K, V kahan se aate hain?', options: ['Teen alag sentences se', 'Usi X se, teen alag seekhi hui matrices (Wq, Wk, Wv) se multiply karke', 'Q input se, K aur V output se'], answer: 1, explain: 'Q = X·Wq, K = X·Wk, V = X·Wv. Same input, teen alag projections.' },
      { q: 'Hamare example mein "video" ki query aur "xyz" ki key ka raw score kya hai?', options: ['5', '7', '3.5'], answer: 1, explain: '[0,3,1,0]·[3,2,1,0] = 0 + 6 + 1 + 0 = 7. √4 = 2 se divide karke 3.5 banta hai.' },
      { q: '√d_k se divide kyun karte hain?', options: ['Calculation fast karne ke liye', 'Bade d_k pe dot products bade hote hain aur softmax saturate hokar gradients ~0 kar deta hai', 'Taaki output ka shape sahi rahe'], answer: 1, explain: 'Random-ish vectors ke dot product ka variance d_k hota hai. √d_k se divide karke spread ~1 rehta hai, softmax naram rehta hai.' },
      { q: 'Causal mask kab lagta hai aur kaise?', options: ['Softmax ke baad future weights 0 karke', 'Softmax se pehle future scores ko −∞ karke', 'V matrix ki future rows delete karke'], answer: 1, explain: '−∞ score ka e^x = 0, aur softmax baaki weights ko 1 tak normalize karta hai. Baad mein 0 karne se row ka total 1 nahi rahta.' },
      { q: 'Context 2,000 se 4,000 tokens hua. Ek head ki scores matrix kitni badi hui?', options: ['2 guna', '4 guna', 'Same'], answer: 1, explain: 'n × n: (2n)² = 4n². Attention ka memory/compute context ke saath quadratic badhta hai.' },
    ]},
    { type: 'sources', note: 'Is lesson ke saare matrices aur numbers (Q, K, V, scores, softmax, outputs, masked outputs, scaling simulation) humne node script se calculate karke match kiye. Matrices illustrative hain, kisi asli model se nahi.', items: [
      { title: 'Attention Is All You Need', publisher: 'Vaswani et al., Google (arXiv 1706.03762)', year: 2017, official: true, url: 'https://arxiv.org/abs/1706.03762', used: 'Scaled dot-product attention formula, Q/K/V, variance-d_k argument for 1/√d_k, decoder masking with −∞ before softmax, self vs encoder-decoder attention.' },
      { title: 'FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness', publisher: 'Dao et al., Stanford (arXiv 2205.14135)', year: 2022, official: true, url: 'https://arxiv.org/abs/2205.14135', used: 'Exact attention computed in tiles without materialising the full n × n matrix in GPU memory.' },
      { title: 'Attention is not Explanation', publisher: 'Jain and Wallace, NAACL 2019 (arXiv 1902.10186)', year: 2019, official: true, url: 'https://arxiv.org/abs/1902.10186', used: 'Caution that attention weights are not a faithful explanation of model decisions.' },
      { title: 'Neural Machine Translation by Jointly Learning to Align and Translate', publisher: 'Bahdanau, Cho, Bengio (arXiv 1409.0473)', year: 2014, official: true, url: 'https://arxiv.org/abs/1409.0473', used: 'Attention as a soft, learned weighting, first used alongside RNNs before Transformers.' },
      { title: 'The Illustrated Transformer', publisher: 'Jay Alammar (blog)', year: 2018, url: 'https://jalammar.github.io/illustrated-transformer/', used: 'Cross-check of the step-by-step Q/K/V walkthrough order (scores, divide, softmax, multiply by V, sum).' },
      { title: 'Transformers Explained | Simple Explanation of Transformers (video)', publisher: 'codebasics (YouTube)', year: 2025, url: 'https://www.youtube.com/watch?v=ZhAz268Hdpw', used: 'Learner reference video; its attention and contextual-embedding chapters used as a coverage checklist.' },
    ]},
  ],
});
