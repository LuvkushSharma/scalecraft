/*
  ai-transformer-e2e: one prompt's full journey through a TOY decoder-only Transformer.
  Shared with ai-attention.js: tokens ["xyz","pe","video"], Wq, Wk, Wv, and X = embedding + PE.
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
  const VOCAB = ['<eos>', 'xyz', 'pe', 'video', 'dekho', 'upload'];
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
    title: 'End-to-end: ek sentence ka safar',
    minutes: 30,
    summary: `Prompt "xyz pe video" se agle token "dekho" tak, aur phir &lt;eos&gt; tak: tokens → ids → embeddings → +PE → attention → FFN → logits → softmax → next token → repeat. Ek chhote toy Transformer mein har number apni aankhon se dekho.`,
    blocks: [
      { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Tum xyz Assistant mein likhte ho "xyz pe video". Jawab mein ek word aata hai: "dekho". Beech mein kya hua?<br>Computer words nahi samajhta, sirf numbers. To words numbers bante hain, numbers pe kuch hisaab hota hai, aur aakhir mein har possible agle word ko ek "chance" milta hai.<br>Sabse achhe chance wala word chuna jaata hai, sentence mein jodte hain, aur poora kaam phir se. Jab tak "bas, khatam" wala special token na aaye.<br>Is lesson mein tum <strong>har ek number</strong> ko words se agle word tak khud follow karoge.` },
      { type: 'h2', text: 'Problem: saare tukde dekh liye, ab poori machine?' },
      { type: 'p', html: `Pichhle lessons mein humne Transformer ke parts alag alag khole: <a href="#/ai-tokenization">tokens aur embeddings</a>, <a href="#/ai-positional-encoding">positional encoding</a>, <a href="#/ai-attention">self-attention</a>, <a href="#/ai-multihead">multi-head, Add &amp; Norm, FFN aur KV cache</a>. Lekin jab xyz Assistant ko prompt milta hai, to ye sab <em>ek ke baad ek</em> kaise chalte hain? Kaunsa number kahan se aata hai, aur aakhir mein ek <strong>word</strong> kaise nikalta hai?` },
      { type: 'p', html: `Is lesson mein hum ek <strong>toy decoder-only Transformer</strong> (GPT jaisa) ke andar ek prompt ko shuru se aakhir tak follow karenge. Prompt: <code>"xyz pe video"</code>. Har stage ke asli numbers, jo pichhle lessons ke numbers se hi aage badhte hain.` },
      { type: 'h2', text: 'Safar ke padaav: pehle har word samjho' },
      { type: 'p', html: `Stepper chalane se pehle, raaste ke har padaav ka naam aur kaam. Har card mein "video" (prompt ka aakhri word) ke asli numbers hain. Pichhle lessons mein inme se kai cheezein detail mein aa chuki hain; yahan sirf utna jitna is safar ke liye chahiye.` },
      { type: 'callout', tone: 'term', title: 'Padaav 1: token aur tokenizer', html: `<strong>Ye kya hai:</strong> <strong>token</strong> = text ka chhota tukda (word ya word ka hissa). <strong>Tokenizer</strong> = wo program jo text ko tokens mein todta hai.<br><strong>Kyun chahiye:</strong> model ko fixed size ke tukde chahiye jinki ek list (vocabulary) ban sake.<br><strong>Iske bina:</strong> har naya spelling, har naya word model ke liye anjaan hota.<br><strong>Example:</strong> <code>"xyz pe video"</code> → <code>["xyz", "pe", "video"]</code>. Hamara toy tokenizer bas space pe todta hai; asli models BPE use karte hain (<a href="#/ai-tokenization">tokenization</a>).` },
      { type: 'callout', tone: 'term', title: 'Padaav 2: vocabulary aur token id', html: `<strong>Ye kya hai:</strong> <strong>vocabulary</strong> = model ko pata saare tokens ki ek numbered list. <strong>Token id</strong> = list mein token ka number.<br><strong>Kyun chahiye:</strong> model sirf numbers pe kaam karta hai, text pe nahi.<br><strong>Iske bina:</strong> "video" ko table mein dhoondhne ka koi tareeka nahi.<br><strong>Example:</strong> hamari vocabulary sirf 6 tokens ki hai: <code>0 &lt;eos&gt;, 1 xyz, 2 pe, 3 video, 4 dekho, 5 upload</code>. To prompt ban gaya ids <code>[1, 2, 3]</code>.` },
      { type: 'callout', tone: 'term', title: 'Padaav 3: embedding (table lookup)', html: `<strong>Ye kya hai:</strong> ek table jismein har token id ke liye ek vector (numbers ki list) rakha hai. Id do, row utha lo. Koi calculation nahi.<br><strong>Kyun chahiye:</strong> ek akela number (jaise 3) kuch "matlab" nahi rakhta. 4 numbers ka vector rakh sakta hai, aur training ise seekhti hai.<br><strong>Iske bina:</strong> id 3 aur id 4 ka koi rishta nahi dikh sakta.<br><strong>Example:</strong> table E ki row 3 ("video") = <code>[−0.91, 2.42, −0.02, 0]</code>.` },
      { type: 'callout', tone: 'term', title: 'Padaav 4: positional encoding (PE)', html: `<strong>Ye kya hai:</strong> har position (0, 1, 2, ...) ka ek fixed vector jo embedding mein <strong>joda</strong> jaata hai. Hamara toy: <code>PE(p) = [sin p, cos p, sin(p/100), cos(p/100)]</code>, 2 decimals tak.<br><strong>Kyun chahiye:</strong> attention khud order nahi jaanta. "xyz pe video" aur "video pe xyz" use same lagte.<br><strong>Iske bina:</strong> word order ka matlab gayab.<br><strong>Example:</strong> "video" position 2 pe hai. PE(2) = <code>[0.91, −0.42, 0.02, 1]</code>. Jodo: <code>[−0.91, 2.42, −0.02, 0] + [0.91, −0.42, 0.02, 1] = [0, 2, 0, 1]</code>. Ye wahi X row hai jo <a href="#/ai-attention">attention lesson</a> mein thi. Detail: <a href="#/ai-positional-encoding">positional encoding</a>.` },
      { type: 'callout', tone: 'term', title: 'Padaav 5: Q, K, V aur attention', html: `<strong>Ye kya hai:</strong> har token ke teen naye vectors: <strong>Q</strong> (query, "main kya dhoondh raha hoon?"), <strong>K</strong> (key, "mere paas kya hai?"), <strong>V</strong> (value, "main kya doonga?"). Q ko har K se milao (dot product) = score. Score ÷ √4, phir softmax = weights. Weights se V ka mix = naya vector.<br><strong>Kyun chahiye:</strong> yahi wo jagah hai jahan words ek doosre se info lete hain.<br><strong>Iske bina:</strong> har word akela rehta; "video" ko pata hi nahi chalta ki kiska video.<br><strong>Example:</strong> "video" ka q = <code>[0, 3, 1, 0]</code>. Scores <code>[7, 5, 5]</code> → ÷ 2 = <code>[3.5, 2.5, 2.5]</code> → softmax <code>[0.5761, 0.2119, 0.2119]</code>. Output A = <code>[1.58, 0.42, 2.36, 0.42]</code>.` },
      { type: 'callout', tone: 'term', title: 'Padaav 6: causal mask', html: `<strong>Ye kya hai:</strong> future tokens ke scores ko <code>−∞</code> kar dena, taaki softmax ke baad unka weight 0 ho.<br><strong>Kyun chahiye:</strong> generate karte waqt future hota hi nahi. Training mein bhi model ko future nahi dikhna chahiye.<br><strong>Iske bina:</strong> training mein cheating, aur KV cache bhi kaam nahi karta.<br><strong>Example:</strong> "xyz" (pehla token) ke scores <code>[2.5, 2, 3]</code> → mask ke baad <code>[2.5, −∞, −∞]</code> → weights <code>[1, 0, 0]</code>. "video" aakhri hai, uspe koi asar nahi.` },
      { type: 'callout', tone: 'term', title: 'Padaav 7: Add & Norm (residual + LayerNorm)', html: `<strong>Ye kya hai:</strong> do kaam. <strong>Add</strong> (residual) = input X ko attention output A mein wapas jodo. <strong>Norm</strong> (LayerNorm) = phir har token ke 4 numbers ko mean 0, std 1 pe le aao (mean = average, std = numbers ka typical phailaav).<br><strong>Kyun chahiye:</strong> original meaning na khoye, aur numbers bahut bade ya chhote na ho jaayein.<br><strong>Iske bina:</strong> gehre models train hi nahi hote (<a href="#/ai-multihead">multi-head lesson</a> mein detail).<br><strong>Example:</strong> X + A = <code>[0, 2, 0, 1] + [1.58, 0.42, 2.36, 0.42] = [1.58, 2.42, 2.36, 1.42]</code>. Mean ≈ 1.95, std ≈ 0.45. (har number − mean) ÷ std = <code>[−0.82, 1.06, 0.93, −1.16]</code> (andar poori precision se; rounded numbers se haath se karoge to 0.01-0.02 ka farak aa sakta hai). Isko H1 kehte hain.` },
      { type: 'callout', tone: 'term', title: 'Padaav 8: FFN aur ReLU', html: `<strong>Ye kya hai:</strong> FFN = har token pe alag chalne wala chhota network: <code>H1·W1</code> (4 → 8 numbers), phir <strong>ReLU</strong> (negative ko 0 karo), phir <code>·W2</code> (8 → 4).<br><strong>Kyun chahiye:</strong> attention ne info ikattha ki; FFN us info ko "process" karta hai, naya matlab banata hai.<br><strong>Iske bina:</strong> model sirf average karta rehta, kuch naya nahi seekhta.<br><strong>Example ("video"):</strong> H1·W1 = <code>[−0.82, 1.06, 0.93, −1.98, 1.88, −0.13, −2.09, 1.16]</code>. ReLU ke baad <code>[0, 1.06, 0.93, 0, 1.88, 0, 0, 1.16]</code>. ·W2 = F = <code>[−0.36, 1.47, 0.46, −0.58]</code>. Phir doosra Add & Norm: LayerNorm(H1 + F) = H2 = <code>[−0.81, 1.29, 0.65, −1.13]</code>.` },
      { type: 'callout', tone: 'term', title: 'Padaav 9: LM head aur logits', html: `<strong>Ye kya hai:</strong> <strong>LM head</strong> = aakhri matrix <code>Wout</code> (4 × 6), jismein har vocab token ka ek column hai. Aakhri token ke vector h ko har column se dot product karo. Har token ka jo score aata hai, use <strong>logit</strong> kehte hain.<br><strong>Kyun chahiye:</strong> 4 numbers ke vector se "kaunsa word aage aaye" tak pahunchna hai. Har possible word ko ek score chahiye.<br><strong>Iske bina:</strong> vector to hai, lekin word kaise chunein?<br><strong>Example:</strong> h = <code>[−0.8095, 1.2895, 0.6451, −1.1251]</code> (H2 ki aakhri row, 4 decimals). "dekho" ka column <code>[0, 1, 1, −1]</code>. Dot product = 0 + 1.2895 + 0.6451 + 1.1251 = 3.0597 ≈ <strong>3.06</strong>. Sab 6 logits: &lt;eos&gt; −1.77, xyz −2.10, pe 1.77, video −0.32, dekho 3.06, upload 1.29.` },
      { type: 'callout', tone: 'term', title: 'Padaav 10: softmax aur temperature', html: `<strong>Ye kya hai:</strong> softmax logits ko probabilities (total 1) mein badalta hai: har logit ka e<sup>x</sup>, phir total se divide. <strong>Temperature (T)</strong> = softmax se pehle logits ko T se divide karna.<br><strong>Kyun chahiye:</strong> logits kuch bhi ho sakte hain (−2.10 ya 3.06). Chunne ke liye "chance" chahiye. T se hum control karte hain ki model kitna "pakka" ya kitna "khula" ho.<br><strong>Iske bina:</strong> na lottery ho sakti, na creativity control.<br><strong>Example (T = 1):</strong> e<sup>x</sup> = <code>[0.17, 0.12, 5.87, 0.73, 21.32, 3.63]</code>, total 31.85. "dekho" = 21.32 ÷ 31.85 = <strong>0.6695</strong>. T = 0.5 pe "dekho" 0.9041 (aur pakka). T = 5 pe sirf 0.2688 (sab barabar ki taraf).` },
      { type: 'callout', tone: 'term', title: 'Padaav 11: greedy aur sampling', html: `<strong>Ye kya hai:</strong> probabilities se ek token chunne ke tareeke. <strong>Greedy</strong> = hamesha sabse bada. <strong>Sampling</strong> = lottery: 0 aur 1 ke beech ek random number u lo, probabilities ko line mein jodte jao, jahan total u se aage nikle wahi token.<br><strong>Kyun chahiye:</strong> model sirf chances deta hai. Chunna model ke bahar ka code (sampler) karta hai.<br><strong>Iske bina:</strong> probabilities hain, lekin agla word kabhi tay nahi hota.<br><strong>Example:</strong> greedy → "dekho" (0.6695). Sampling: order [&lt;eos&gt; 0.0054, xyz 0.0038, pe 0.1844, video 0.0229, dekho 0.6695, upload 0.1140]. Agar u = 0.5, to running total 0.0054 → 0.0092 → 0.1936 → 0.2165 → 0.8860: "dekho" pe u paar hua. Random number ek <strong>seed</strong> se aata hai, taaki same seed = same jawab.` },
      { type: 'callout', tone: 'term', title: 'Padaav 12: &lt;eos&gt; aur max_tokens', html: `<strong>Ye kya hai:</strong> <code>&lt;eos&gt;</code> ("end of sequence") ek special token hai jiska matlab hai "jawab poora". <strong>max_tokens</strong> = harness ki taraf se hard limit: itne tokens ke baad zabardasti ruko.<br><strong>Kyun chahiye:</strong> model ek loop mein chalta hai. Kisi ko to kehna padega "ab bas".<br><strong>Iske bina:</strong> loop kabhi khatam na ho: GPU, paisa aur user ka sabr, sab barbaad.<br><strong>Example:</strong> round 2 mein &lt;eos&gt; ki probability 0.7591 aati hai, to generation ruk jaata hai. Stepper mein max_tokens = 7.` },
      { type: 'h2', text: 'Hamara toy model' },
      { type: 'table', head: ['Cheez', 'Toy model (is lesson mein)', 'GPT-2 small (2019)', 'Llama 3 8B (2024)'], rows: [
        ['Vocabulary', '6 tokens', '50,257', '128,256'],
        ['d_model (vector size)', '4', '768', '4,096'],
        ['Layers (blocks)', '1', '12', '32'],
        ['Attention heads', '1 (Wo = identity)', '12', '32 query, 8 KV'],
        ['FFN size d_ff', '8 (ReLU)', '3,072 (GELU)', '14,336 (SwiGLU)'],
        ['Norm', 'Post-LN (2017 style)', 'Pre-LN', 'Pre-RMSNorm'],
        ['Position', 'Sinusoidal (added)', 'Learned (added)', 'RoPE (rotation)'],
      ], caption: 'Post-LN, Pre-LN, RMSNorm, GELU, SwiGLU <a href="#/ai-multihead">multi-head lesson</a> mein samjhaye gaye hain; learned positions aur RoPE <a href="#/ai-positional-encoding">positional encoding</a> mein. Is lesson ke liye bas itna kaafi hai: asli models mein numbers bade hain, steps wahi.' },
      { type: 'callout', tone: 'warn', title: 'Imaandaari wali baat', html: `Toy model ke weights <strong>haath se chune gaye hain</strong>, train nahi kiye. Wq, Wk, Wv wahi hain jo <a href="#/ai-attention">attention lesson</a> mein the; embedding table aise rakha hai ki embedding + PE se exactly wahi X bane. FFN aur output weights aise chune hain ki prediction samajh mein aaye. Asli model mein ye sab arabon numbers training se seekhe jaate hain, lekin <strong>calculation ke steps bilkul yahi</strong> hote hain.` },
      { type: 'ascii', caption: 'Poora safar, ek nazar mein (shapes: n = tokens, d = 4, V = 6)', text: `"xyz pe video"
   │ 1. tokenizer               → ["xyz", "pe", "video"]
   │ 2. vocab lookup            → ids [1, 2, 3]
   │ 3. embedding table (6×4)   → E      (n × 4)
   │ 4. + positional encoding   → X      (n × 4)
   │ 5. Q, K, V = X·Wq, X·Wk, X·Wv        (n × 4 each)
   │ 6. softmax(mask(Q·Kᵀ/√4))  → weights (n × n)
   │ 7. weights · V             → A      (n × 4)  ← contextual vectors
   │ 8. LayerNorm(X + A)        → H1     (n × 4)
   │ 9. ReLU(H1·W1)·W2          → F      (n × 4)   (andar n × 8)
   │10. LayerNorm(H1 + F)       → H2     (n × 4)
   │11. last row of H2 · Wout   → logits (1 × 6)
   │12. softmax(logits / T)     → probabilities (1 × 6)
   │13. pick (greedy / sample)  → "dekho"
   └─14. append, go to step 1 with "xyz pe video dekho" ... until <eos>` },
      { type: 'callout', tone: 'term', title: 'Naya word: contextual embedding', html: `<strong>Ye kya hai:</strong> attention ke baad wala vector, jismein token ke aas paas ke words ki info bhi ghul chuki hai.<br><strong>Kyun chahiye:</strong> step 3 ka embedding har jagah same hai: "video" ka vector har sentence mein ek hi. Lekin "xyz pe video" aur "cricket ka video" mein "video" ka matlab thoda alag hai. Attention ke baad (step 7 onwards) "video" ka vector <strong>context ke hisaab se</strong> badal jaata hai.<br><strong>Iske bina:</strong> har word ka ek hi fixed matlab, chahe sentence kuch bhi ho.<br><strong>Example:</strong> embedding + PE ke baad "video" = <code>[0, 2, 0, 1]</code>. Attention ke baad A = <code>[1.58, 0.42, 2.36, 0.42]</code>: isme "xyz" ki info (58%) aa gayi. Yahi Transformer ki asli taakat hai.` },
      { type: 'h2', text: 'Stepper: har number apni aankhon se' },
      { type: 'p', html: `"Next" dabao aur prompt ko 13 stages se guzarte dekho. Aakhri stage pe naya token jud jaata hai aur agla round shuru hota hai, jab tak <code>&lt;eos&gt;</code> (end of sequence) na aaye ya 7 tokens na ho jaayein. Neela row = wo token jiske liye abhi agla word predict ho raha hai (aakhri token). Har stage ke neeche <strong>"Hisaab"</strong> box us token ka poora calculation numbers ke saath dikhata hai, taaki tum calculator se khud check kar sako. Upar ke 1-13 buttons se kisi bhi stage pe seedha jaa sakte ho. Display 2-4 decimals, andar poori precision.` },
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
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button type="button" class="btn small ghost e2e-rs">Restart</button><button type="button" class="btn small ghost e2e-pv">Pichhla</button><button type="button" class="btn small primary e2e-nx">Next</button></div>`;
        const q = s => el.querySelector(s);
        const chipRow = (sel, names, onPick) => { const b = q(sel); names.forEach((n, i) => { const c = document.createElement('button'); c.type = 'button'; c.className = 'chip'; c.textContent = n; c.onclick = () => onPick(i); b.appendChild(c); }); return b; };
        let preset = 0;
        const prBox = chipRow('.e2e-pr', PRESETS.map(p => 'Prompt: ' + p.map(i => VOCAB[i]).join(' ')), i => { preset = i; reset(); });
        const stBox = chipRow('.e2e-st', Array.from({ length: NST }, (_, i) => String(i + 1)), i => { st = i; draw(); });
        const mdBox = chipRow('.e2e-md', ['Greedy (sabse probable)', 'Sample (seed 7)'], i => { mode = i; draw(); });
        const draws = []; let seed = 7;
        seed = seed * 16807 % 2147483647; // pehla draw chhod do (chhote seed pe wo hamesha ~0 hota hai)
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
          const kvNote = prev ? `<br><strong>KV cache:</strong> pehle ${n - 1} rows pichhle round jaise hi hain (${same('K') && same('V') ? 'check: bilkul same' : 'check fail'}). Asli model sirf naye token "${esc(lw)}" ka row banata hai.` : '';
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
            `"${esc(N.join(' '))}" → spaces pe toda → ${n} tokens`,
            N.map((t, i) => `"${esc(t)}" → ${ids[i]}`).join(', '),
            `E[${ids[L]}] = ${vr(E[ids[L]])} ← "${esc(lw)}" ki row`,
            `PE(${L}) = [sin ${L}, cos ${L}, sin ${fmt(L / 100, 2)}, cos ${fmt(L / 100, 2)}] = ${vr(R.P[L])}<br>x = ${vr(R.Em[L])} + ${vr(R.P[L])} = <strong>${vr(R.X[L])}</strong>`,
            `q[0] = x · (Wq ka column 0) = ${dot(R.X[L], col(Wq, 0), 2, 0)} = ${fmt(R.Q[L][0], 2)}<br>Baaki columns bhi aise hi: q = <strong>${vr(R.Q[L])}</strong>, k = ${vr(R.K[L])}, v = ${vr(R.V[L])}`,
            `score("${esc(lw)}" → "${esc(N[0])}") = q · k(${esc(N[0])}) = ${dot(R.Q[L], R.K[0])} = ${fmt(R.S[L][0], 2)} → ÷ 2 = ${fmt(R.Sc[L][0], 2)}<br>e<sup>x</sup> = ${vr(ex)} → total ${fmt(exs, 2)} → har ek ÷ total = <strong>${vr(R.W[L], 4)}</strong>`,
            `A = ${R.W[L].map((w, j) => `${fmt(w, 4)}·${vr(R.V[j])}`).join(' + ')}<br>= <strong>${vr(R.A[L])}</strong>`,
            `X + A = ${vr(R.X[L])} + ${vr(R.A[L])} = ${vr(R.R1[L])}<br>mean = ${fmt(m1, 4)}, std = ${fmt(s1, 4)} → (x − mean) ÷ std = <strong>${vr(R.H1[L])}</strong>`,
            `h·W1 = ${vr(R.Z[L])}<br>ReLU (negative → 0) = ${vr(R.Rl[L])}<br>·W2 = <strong>${vr(R.F[L])}</strong>`,
            `H1 + F = ${vr(R.H1[L])} + ${vr(R.F[L])} = ${vr(R.R2[L])}<br>mean = ${fmt(m2, 4)}, std = ${fmt(s2, 4)} → <strong>${vr(R.H2[L])}</strong>`,
            `logit("${esc(VOCAB[top])}") = h · (Wout ka "${esc(VOCAB[top])}" column) = ${dot(R.last, col(Wout, top), 4, 0)} = <strong>${fmt(R.logits[top], 4)}</strong>`,
            `logits ÷ T = ${vr(R.logits.map(x => x / temp))}<br>e<sup>x</sup> = ${vr(lx)} → total ${fmt(lxs, 2)}<br>÷ total = <strong>${vr(P0, 4)}</strong>`,
          ];
          const S = [
            ['Tokenizer', `Text ko tokens mein toda. Toy tokenizer bas space pe todta hai; asli model BPE use karta hai (<a href="#/ai-tokenization">tokenization</a>).`, `<div style="font:14px var(--f-mono)">"${esc(N.join(' '))}" → [${N.map(t => '"' + esc(t) + '"').join(', ')}]</div>`],
            ['Token ids', `Har token ko vocabulary table mein dhoondha. Model ko sirf numbers samajh aate hain.`, grid([VOCAB.map((_, i) => i)], 'vocabulary (id)', 0, -1, null, VOCAB.map(esc)) + `<div style="font:14px var(--f-mono)">ids = [${ids.join(', ')}]</div>`],
            ['Embedding lookup', `Har id ke liye embedding table (6×4) ki wo row utha li. Koi calculation nahi, sirf lookup.`, grid(E, 'Embedding table E (6×4)', 2, ids[L], VOCAB.map(esc)) + grid(R.Em, 'chuni hui rows', 2, L, N.map(esc))],
            ['+ Positional encoding', `Har position ka sin/cos vector jodo, taaki order ka pata chale. PE = [sin(p), cos(p), sin(p/100), cos(p/100)], 2 decimals.`, grid(R.Em, 'E', 2, L, N.map(esc)) + grid(R.P, 'PE (pos 0..' + L + ')', 2, L) + grid(R.X, 'X = E + PE', 2, L, N.map(esc))],
            ['Q, K, V', `Teen matrix multiply: Q = X·Wq, K = X·Wk, V = X·Wv (attention lesson wale Wq, Wk, Wv).` + kvNote, grid(R.Q, 'Q', 2, L, N.map(esc)) + grid(R.K, 'K', 2, L, N.map(esc)) + grid(R.V, 'V', 2, L, N.map(esc))],
            ['Scores → mask → softmax', `Scores = Q·Kᵀ, phir ÷ √4 = 2, future pe −∞ (causal mask), phir har row ka softmax. "${esc(lw)}" ka row: ${row(R.Sc[L])} → ${'[' + R.W[L].map(x => fmt(x, 4)).join(', ') + ']'}.`, grid(R.S, 'Q·Kᵀ', 2, L, N.map(esc)) + grid(R.Sc, '÷2 + mask', 2, L, N.map(esc)) + grid(R.W, 'weights (softmax)', 4, L, N.map(esc))],
            ['Attention output', `A = weights·V. Ab "${esc(lw)}" ka vector ${row(R.A[L])} hai: baaki tokens ki info isme ghul gayi. Ye contextual vector hai.` + kvNote, grid(R.W, 'weights', 4, L, N.map(esc)) + grid(R.V, 'V', 2, -1, N.map(esc)) + grid(R.A, 'A = weights·V', 2, L, N.map(esc))],
            ['Add & Norm 1', `Residual: X + A. Phir LayerNorm har row ko mean 0, std 1 pe laata hai.`, grid(R.R1, 'X + A', 2, L, N.map(esc)) + grid(R.H1, 'H1 = LayerNorm', 2, L, N.map(esc))],
            ['FFN', `Har token akele: H1·W1 (4 → 8), ReLU (negative = 0), phir ·W2 (8 → 4).`, grid(R.Z, 'H1·W1', 2, L, N.map(esc)) + grid(R.Rl, 'ReLU', 2, L, N.map(esc)) + grid(R.F, 'F = ReLU·W2', 2, L, N.map(esc))],
            ['Add & Norm 2', `Residual: H1 + F, phir LayerNorm. Block khatam. (Asli model mein ye block 12-96 baar repeat hota.)`, grid(R.R2, 'H1 + F', 2, L, N.map(esc)) + grid(R.H2, 'H2 = LayerNorm', 2, L, N.map(esc))],
            ['Logits', `Sirf aakhri row ("${esc(lw)}") chahiye, kyunki agla token wahi predict karta hai. h·Wout = har vocab token ka score (logit).`, grid([R.last], 'h (aakhri row)', 4) + grid(Wout, 'Wout (4×6)', 0, -1, null, VOCAB.map(esc)) + grid([R.logits], 'logits', 2, -1, null, VOCAB.map(esc))],
            ['Softmax (temperature ' + temp.toFixed(1) + ')', `p<sub>i</sub> = e<sup>logit<sub>i</sub>/T</sup> / Σ e<sup>logit<sub>j</sub>/T</sup>. Temperature slider ghumao: T kam = sabse bada aur bada, T zyada = sab barabar ki taraf.`, bars(probs(R), probs(R).indexOf(Math.max(...probs(R))))],
            null,
          ];
          const nt = pick(R), P = probs(R);
          S[12] = ['Agla token: "' + esc(VOCAB[nt]) + '"', mode === 0 ? `Greedy: sabse zyada probability wala token (${P[nt].toFixed(4)}).` : `Sample: random number u = ${draws[rnd].toFixed(4)} (seed 7, round ${rnd + 1}). Probabilities ko line mein jodte jao; jis token pe cumulative total u se aage nikla, wahi chuna.`,
            bars(P, nt) + `<div style="font:14px var(--f-mono);margin-top:6px">${esc(N.join(' '))} <strong style="color:var(--accent-ink)">${esc(VOCAB[nt])}</strong></div>` +
            `<div class="calc-note">${nt === 0 ? '&lt;eos&gt; aaya: generation band. Restart ya doosra prompt try karo.' : ids.length >= MAXLEN ? 'Max 7 tokens (max_tokens limit) pahunch gaye: yahin rukte hain.' : 'Next dabao: ye token prompt mein judega aur poora safar phir se (KV cache ke saath).'}</div>`];
          let cu = 0;
          TR[12] = mode === 0 ? `Sabse badi probability: "${esc(VOCAB[nt])}" (${fmt(P[nt], 4)})` : `u = ${fmt(draws[rnd], 4)}. Running total: ${P.map((v, i) => { cu += v; return `${esc(VOCAB[i])} ${fmt(cu, 4)}`; }).join(' → ')}. Pehla total jo u se bada ho: "${esc(VOCAB[nt])}".`;
          stBox.querySelectorAll('.chip').forEach((c, i) => c.classList.toggle('on', i === st));
          q('.e2e-tr').innerHTML = '<strong>Hisaab ("' + esc(lw) + '"):</strong><br>' + TR[st];
          q('.e2e-hd').textContent = `Round ${rnd + 1} · Stage ${st + 1} / ${NST}`;
          q('.e2e-ti').innerHTML = S[st][0];
          q('.e2e-tx').innerHTML = S[st][1];
          q('.e2e-mx').innerHTML = S[st][2];
          q('.e2e-pv').disabled = st === 0;
          q('.e2e-nx').disabled = st === NST - 1 && (nt === 0 || ids.length >= MAXLEN);
          q('.e2e-nx').textContent = st === NST - 1 ? 'Append + agla round' : 'Next';
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
      { type: 'h3', text: 'Round 1 ke numbers, ek jagah' },
      { type: 'table', head: ['Stage', '"video" (aakhri token) ke liye', 'Matlab'], rows: [
        ['Tokens → ids', '"video" → id 3 (prompt ids [1, 2, 3])', 'Vocabulary mein position'],
        ['Embedding', '[−0.91, 2.42, −0.02, 0]', 'Table ki row 3. Har sentence mein same.'],
        ['+ PE (pos 2)', '+ [0.91, −0.42, 0.02, 1] = [0, 2, 0, 1]', 'Ab attention lesson wala X'],
        ['Q, K, V', 'q = [0, 3, 1, 0], k = [1, 1, 2, 2], v = [1, 2, 0, 2]', 'Sawaal, label, content'],
        ['Scores ÷ 2 → softmax', '[3.5, 2.5, 2.5] → [0.5761, 0.2119, 0.2119]', 'Kis token se kitna lena hai'],
        ['Attention output A', '[1.58, 0.42, 2.36, 0.42]', 'Contextual vector'],
        ['LayerNorm(X + A)', '[1.58, 2.42, 2.36, 1.42] → [−0.82, 1.06, 0.93, −1.16]', 'Residual + scale theek'],
        ['FFN', '[−0.36, 1.47, 0.46, −0.58]', 'Token ki apni processing'],
        ['LayerNorm(H1 + F)', '[−0.81, 1.29, 0.65, −1.13]', 'Block ka output'],
        ['Logits (·Wout)', '&lt;eos&gt; −1.77, xyz −2.10, pe 1.77, video −0.32, dekho 3.06, upload 1.29', 'Har vocab token ka score'],
        ['Softmax (T = 1)', 'dekho 0.6695, pe 0.1844, upload 0.1140, video 0.0229, &lt;eos&gt; 0.0054, xyz 0.0038', 'Probabilities, total 1'],
        ['Greedy pick', '"dekho"', 'Prompt ban gaya "xyz pe video dekho"'],
      ], caption: 'Sab numbers stepper ke code se hi nikle hain (2 ya 4 decimals).' },
      { type: 'p', html: `"dekho" ka logit kaise aaya? Wout ka "dekho" column hai <code>[0, 1, 1, −1]</code>. Aakhri vector <code>h = [−0.8095, 1.2895, 0.6451, −1.1251]</code>. Dot product: <code>0·(−0.8095) + 1·1.2895 + 1·0.6451 + (−1)·(−1.1251) = 3.0597 ≈ 3.06</code>. Har vocab token ke liye aisa ek dot product: "h is token ke column se kitna milta hai".` },
      { type: 'h3', text: 'Round 2: "dekho" jud gaya' },
      { type: 'p', html: `"dekho" (id 4) position 3 pe aaya. Embedding <code>[−0.14, 1.99, 0.97, 1]</code> + PE(3) <code>[0.14, −0.99, 0.03, 1]</code> = <code>[0, 1, 1, 2]</code>. Iska q = <code>[1, 4, 2, 0]</code>, scores ÷ 2 = <code>[6.5, 5.5, 4.5, 7.5]</code>, softmax = <code>[0.2369, 0.0871, 0.0321, 0.6439]</code>. Pehle 3 tokens ke K, V, attention outputs, sab kuch <strong>bilkul pichhle round jaise</strong>: causal mask ki wajah se purane tokens naye token ko dekhte hi nahi. Yahi <a href="#/ai-multihead">KV cache</a> ka aadhaar hai. Aakhir mein logits mein &lt;eos&gt; 3.23 sabse upar, probability 0.7591: model kehta hai "baat poori". Final output: <strong>"xyz pe video dekho"</strong>.` },
      { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Model poora jawab ek saath likhta hai." Nahi. Har forward pass sirf <strong>ek</strong> token deta hai. 500 token ka jawab = 500 forward passes (prompt wala pehla pass bada, baaki chhote). Isi wajah se streaming mein words ek ek karke aate hain, aur output tokens input tokens se mehenge hote hain.` },
      { type: 'p', html: `Doosre prompts try karo ("xyz pe", "video upload"): toy model "xyz pe pe pe" jaisi cheezein bolega. Ye bug nahi, ye <strong>untrained weights</strong> ka sach hai. Asli models mein bhi kabhi kabhi repetition loops dikhte hain; isliye <code>max_tokens</code> limit aur repetition penalty (jo token pehle aa chuka hai, uske logit ko thoda kam kar dena) jaisi settings hoti hain.` },
      { type: 'h2', text: 'System ki nazar se: generation loop' },
      { type: 'p', html: `Ab zoom out. xyz Assistant ki app se request aati hai, aur model ke bahar ek loop chalta hai jo baar baar model ko call karta hai. Isse <strong>autoregressive</strong> generation kehte hain: model ka apna pichhla output hi agle round ka input banta hai. Boxes pe click karo.` },
      { type: 'callout', tone: 'term', title: 'Naye words: prefill, decode aur TTFT', html: `<strong>Ye kya hai:</strong> generation ke do hisse. <strong>Prefill</strong> = round 1: poora prompt ek saath, parallel mein model se guzarta hai, aur sab tokens ke K, V cache mein jaate hain. <strong>Decode</strong> = round 2 se aage: har round sirf 1 naya token. <strong>TTFT</strong> (time to first token) = request bhejne se pehla token dikhne tak ka time.<br><strong>Kyun chahiye:</strong> dono ka kharcha alag hai. Lamba prompt = prefill lamba = TTFT zyada. Lamba jawab = zyada decode rounds.<br><strong>Iske bina (ye fark samjhe bina):</strong> slow app ko debug karna mushkil: problem prompt mein hai ya jawab ki lambai mein?<br><strong>Example:</strong> hamare toy mein prefill = "xyz pe video" ke 3 tokens ek saath, jawab "dekho". Decode = sirf "dekho" ka ek row, jawab &lt;eos&gt;.` },
      { type: 'flow', height: 300, title: 'Autoregressive generation loop',
        nodes: [
          { id: 'app', label: 'xyz Assistant', sub: 'user prompt', x: 90, y: 70, w: 150, kind: 'client', info: 'Ye kya hai: user ki chat app. User ka text bhejti hai, aur jo tokens aate hain unhe turant (streaming) screen pe dikhati hai.' },
          { id: 'tok', label: 'Tokenizer', sub: 'text → ids', x: 280, y: 70, w: 140, kind: 'net', info: 'Ye kya hai: tokenizer. Text ko token ids mein todta hai (asli models mein BPE). Generation ke end pe ids ko wapas text mein badalta hai (detokenize).' },
          { id: 'emb', label: 'Embed + PE', sub: 'ids → X', x: 460, y: 70, w: 140, kind: 'data', info: 'Ye kya hai: embedding table se har id ki row uthana (lookup), phir positional encoding jodna. Output: n × d_model ka X.' },
          { id: 'blk', label: 'Blocks ×N', sub: 'attn + FFN', x: 630, y: 70, w: 140, kind: 'server', meter: true, load: 30, info: 'Ye kya hai: N decoder blocks: masked attention, Add & Norm, FFN, Add & Norm. Toy mein N = 1, GPT-2 small mein 12, Llama 3 8B mein 32. Sabse zyada GPU kaam yahin.' },
          { id: 'head', label: 'LM head', sub: 'logits, softmax', x: 630, y: 225, w: 140, kind: 'server', info: 'Ye kya hai: LM head. Aakhri token ka vector · Wout = har vocab token ka logit. Phir softmax (temperature ke saath) = probabilities.' },
          { id: 'samp', label: 'Sampler', sub: 'greedy / sample', x: 460, y: 225, w: 140, kind: 'queue', info: 'Ye kya hai: sampler, model ke bahar ka code. Probabilities se ek token chunta hai: greedy, ya temperature/top-k/top-p wali sampling. Rukne ka faisla bhi yahin: &lt;eos&gt; aaya ya max_tokens pura.' },
          { id: 'kv', label: 'KV cache', sub: 'per layer', x: 280, y: 225, w: 140, kind: 'cache', info: 'Ye kya hai: KV cache. Har layer ke purane tokens ke K, V ki copy. Kyun: round 2 se sirf naya token process ho, purane dobara nahi.' },
        ],
        edges: [{ a: 'app', b: 'tok' }, { a: 'tok', b: 'emb' }, { a: 'emb', b: 'blk' }, { a: 'blk', b: 'head' }, { a: 'head', b: 'samp' }, { a: 'samp', b: 'emb', dashed: true }, { a: 'kv', b: 'blk', dashed: true }, { a: 'samp', b: 'app' }],
        scenarios: [
          { name: 'Round 1 (prefill)', steps: [
            { title: 'Prompt aaya', text: 'User ne likha "xyz pe video".', go: 'app>tok>emb', msg: '"xyz pe video" → ["xyz","pe","video"] → [1, 2, 3]' },
            { title: 'Saare prompt tokens ek saath', text: 'Pehla pass poore prompt pe parallel chalta hai. Isko <strong>prefill</strong> kehte hain. K, V cache mein jaate hain.', go: ['emb>blk', 'blk>kv'], after: { blk: { load: 80 }, kv: { state: 'ok', sub: '3 tokens' } }, msg: 'X = [[2,0,1,0],[1,0,2,0],[0,2,0,1]]' },
            { title: 'Logits aur softmax', text: 'Sirf aakhri row ("video") se logits.', go: 'blk>head>samp', after: { blk: { load: 30 } }, msg: 'dekho 0.6695 | pe 0.1844 | upload 0.1140 | ...' },
            { title: 'Token stream hua', text: 'Greedy ne "dekho" chuna. App ko turant bhej diya (streaming). Pehla token aane mein laga time = TTFT.', go: 'samp>app', after: { app: { sub: '"dekho" dikha' } } },
          ]},
          { name: 'Round 2 (decode + KV cache)', steps: [
            { title: 'Sirf naya token andar', text: '"dekho" (id 4, position 3) seedha embedding pe. Tokenizer ki zaroorat nahi, id already pata hai.', go: 'samp>emb', msg: 'x = emb(4) + PE(3) = [0, 1, 1, 2]' },
            { title: 'Purane K, V cache se', text: 'Sirf naye token ka q, k, v bana. Purane 3 tokens ke K, V cache se. Ek chhota pass: <strong>decode</strong> step.', go: ['emb>blk', 'kv>blk'], parallel: true, after: { kv: { state: 'hit', sub: '4 tokens' } }, msg: 'weights(dekho) = [0.2369, 0.0871, 0.0321, 0.6439]' },
            { title: '<eos> aaya', text: 'Logits mein &lt;eos&gt; 3.23 sabse upar (0.7591). Sampler ne generation band kar di.', go: 'blk>head>samp', after: { samp: { state: 'ok', sub: '<eos>, stop' } } },
            { title: 'Done', text: 'App ke paas final text: "xyz pe video dekho".', go: 'res:samp>app', after: { app: { state: 'ok', sub: 'reply complete' } } },
          ]},
          { name: 'Temperature bahut zyada', intro: 'Developer ne temperature = 5 kar diya.', steps: [
            { title: 'Logits wahi', text: 'Model ke numbers nahi badle: dekho 3.06, pe 1.77, ...', go: 'app>tok>emb>blk>head', msg: 'logits ÷ 5 → sab chhote aur paas paas' },
            { title: 'Probabilities chapti ho gayi', text: 'T = 5 pe "dekho" sirf 0.2688, aur ajeeb "xyz" bhi 0.0958 (T = 1 pe 0.0038 tha). Sampler ab bahut baar random token chunega.', go: 'head>samp', set: { samp: { state: 'warn', sub: 'flat distribution' } }, msg: 'T=5: dekho 0.2688 | pe 0.2077 | upload 0.1886 | video 0.1368 | <eos> 0.1023 | xyz 0.0958' },
            { title: 'Bakwaas output', text: 'Har token pe thoda random galti, aur galti agle step ka input ban jaati hai. Jawab bhatak jaata hai. Fix: factual kaam ke liye T 0 se 0.7 ke aas paas.', go: 'bad:samp>app', after: { app: { state: 'down', sub: 'gibberish' } } },
          ]},
          { name: '&lt;eos&gt; kabhi nahi aaya', intro: 'Maan lo model repetition loop mein phans gaya: "pe pe pe ...", aur &lt;eos&gt; kabhi top pe nahi aata.', steps: [
            { title: 'Loop chalta raha', text: 'Har round ek naya "pe". Model khud nahi rukta.', go: ['samp>emb', 'emb>blk>head>samp'], set: { samp: { state: 'hot', sub: 'pe, pe, pe...' } } },
            { title: 'KV cache badhta gaya', text: 'Har token ke saath memory badhti hai. Bina limit ke ye GPU memory aur paisa dono khaata.', go: 'kv>blk', after: { kv: { state: 'warn', sub: 'growing' } } },
            { title: 'max_tokens ne roka', text: 'Harness/sampler ka hard limit (yahan 7 tokens) loop todta hai. Har production API mein max_tokens isi liye hota hai.', go: 'res:samp>app', after: { samp: { state: 'ok', sub: 'stop: max_tokens' }, app: { state: 'warn', sub: 'adhoora jawab' } } },
          ]},
        ],
      },
      { type: 'h2', text: 'Aakhri faisla: token kaise chunein?' },
      { type: 'p', html: `Model sirf probabilities deta hai; token <strong>chunna</strong> sampler ka kaam hai (detail <a href="#/ai-what-is-llm">LLM basics</a> mein). Round 1 ke asli logits pe khelo: temperature, top-k aur top-p badlo, aur dekho 100 seeded samples mein kaun kitni baar aata hai.` },
      { type: 'callout', tone: 'term', title: 'Naye words: top-k aur top-p', html: `<strong>Ye kya hai:</strong> lottery se pehle "bekaar" tokens ko bahar karne ke do filter. <strong>Top-k</strong>: sirf sabse probable k tokens rakho, baaki ko 0, phir dobara total 1 banao. <strong>Top-p</strong> (nucleus sampling): probabilities ko bade se chhote sort karo, aur utne tokens rakho jinka total pehli baar p (jaise 0.9) tak pahunche.<br><strong>Kyun chahiye:</strong> sampling mein kabhi kabhi 0.4% wala ajeeb token bhi lag jaata hai. Ek ajeeb token poore jawab ko bhatka sakta hai.<br><strong>Iske bina:</strong> lambe jawab mein kahin na kahin bakwaas token aa hi jaata.<br><strong>Example:</strong> top-k = 2: sirf "dekho" 0.6695 aur "pe" 0.1844 bache. Total 0.8539. Dobara normalize: 0.6695 ÷ 0.8539 ≈ <strong>0.7841</strong>, 0.1844 ÷ 0.8539 ≈ <strong>0.2159</strong>.` },
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
          q('.sp-note').innerHTML = `${keep.size} token(s) lottery mein. Greedy hamesha "dekho" chunta. Bars = filter ke baad dobara normalize ki hui probabilities; right side = 100 seeded samples (seed 7) mein ginti.`;
        };
        el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
      }},
      { type: 'p', html: `Try karo: T = 0.1 pe "dekho" ~1.0000 (lagbhag greedy). T = 3 pe sab tokens paas paas. Top-k = 2 se sirf "dekho" aur "pe" bachte hain: 0.7841 aur 0.2159. Top-p = 0.8 (T = 1) pe "dekho" + "pe" ka total 0.8539 pehli baar 0.8 paar karta hai, to wahi do bachte hain.` },
      { type: 'h2', text: 'Training mein yahi machine kaise seekhti hai?' },
      { type: 'p', html: `Generation mein hum sirf aakhri row ke logits use karte hain. Training mein <strong>har row</strong> kaam aati hai: position i ka kaam hai token i+1 predict karna. Training sentence "xyz pe video dekho &lt;eos&gt;" ek hi forward pass mein 4 sawaal deta hai (causal mask ki wajah se koi position aage nahi dekh sakti). Hamare toy model ke asli numbers:` },
      { type: 'table', head: ['Position (input)', 'Sahi agla token', 'Model ki probability us pe', 'Loss = −ln(p)', 'Model ka top guess'], rows: [
        ['xyz', 'pe', '0.3408', '1.0766', 'xyz aur pe barabar (0.3408)'],
        ['pe', 'video', '0.0142', '4.2579', 'pe (0.3924)'],
        ['video', 'dekho', '0.6695', '0.4012', 'dekho'],
        ['dekho', '&lt;eos&gt;', '0.7591', '0.2756', '&lt;eos&gt;'],
      ], caption: 'Average loss = 1.5028. Agar model bilkul andaaza lagata (6 tokens, sab 1/6) to loss ln 6 = 1.7918 hota.' },
      { type: 'callout', tone: 'term', title: 'Naya word: cross-entropy loss', html: `<strong>Ye kya hai:</strong> <strong>loss</strong> = model kitna galat tha, ek number mein. Next-token training mein ye <code>−ln(sahi token ki probability)</code> hai (cross-entropy). ln = natural log.<br><strong>Kyun chahiye:</strong> training ko ek number chahiye jise kam karna hai. Sahi token pe probability 1 → loss 0. Probability 0.0142 → loss 4.26, bahut bura.<br><strong>Iske bina:</strong> weights ko pata hi nahi chalta ki kis taraf badalna hai.<br><strong>Example:</strong> "video → dekho" pe probability 0.6695, to loss = −ln(0.6695) = 0.4012.<br>Training do auzaaron se weights ko thoda thoda khiskaati hai taaki average loss kam ho: <strong>backpropagation</strong> (har weight ka gradient nikalna) aur <strong>gradient descent</strong> (gradient ki ulti taraf chhota kadam). Arabon sentences pe, arabon baar.` },
      { type: 'p', html: `Dekho "pe → video" wali row: model ne "video" ko sirf 1.42% diya. Training ka sabse bada "sudhaar" signal yahin se aayega. Ek real model mein yahi cheez trillions tokens pe hoti hai, aur dheere dheere Wq, Wk, Wv, W1, W2, Wout, embedding table, sab "seekh" jaate hain. Detail: <a href="#/ai-training-finetuning">pre-training aur fine-tuning</a>.` },

      { type: 'h2', text: 'Real duniya mein: prefill, decode, aur kahan time jaata hai' },
      { type: 'list', items: [
        `<strong>Prefill</strong> (round 1): poora prompt ek saath, parallel. GPU ke liye achha kaam (badi matrix multiplications). Lamba prompt = zyada time to first token (TTFT).`,
        `<strong>Decode</strong> (round 2 onwards): har round sirf 1 naya token. Kaam chhota, lekin har baar saare weights GPU memory se padhne padte hain, to aksar <em>memory bandwidth</em> (GPU memory se har second kitne bytes padh sakte hain) bottleneck hoti hai, compute nahi. Isliye output tokens/sec, input processing se kaafi dheema.`,
        `<strong>Shapes badalte nahi</strong>: toy mein 4 numbers ka vector, Llama 3 8B mein 4,096; toy mein 1 block, wahan 32; toy vocab 6, wahan 128,256. Steps bilkul wahi: lookup → +position → (attention → add &amp; norm → FFN → add &amp; norm) × N → logits → softmax → pick.`,
        `<strong>Position</strong>: hamara toy sinusoidal PE jodta hai (2017 style). Llama jaise models RoPE use karte hain, jo Q aur K ko rotate karta hai (<a href="#/ai-positional-encoding">positional encoding lesson</a>). Pipeline ka baaki hissa same.`,
      ]},
      { type: 'callout', tone: 'tip', title: 'Decide', html: `<ul>
        <li><strong>Factual / code / JSON jawab</strong>: greedy ya kam temperature (0 se ~0.3). Repeatable output.</li>
        <li><strong>Creative text, ideas</strong>: temperature ~0.7-1 + top-p ~0.9.</li>
        <li><strong>Hamesha max_tokens set karo</strong>: loops aur kharche dono se bachata hai.</li>
        <li><strong>Latency debug</strong>: TTFT zyada = prompt lamba (prefill). Tokens/sec kam = decode (model size, batch, KV cache memory). Prompt caching pehli problem mein, chhota/quantized model ya GQA doosri mein madad karta hai.</li>
      </ul>` },
      { type: 'diagram', title: 'Words se agle word tak: poori picture', height: 440,
        groups: [
          { label: 'Model: blocks, LM head, softmax', x: 10, y: 168, w: 700, h: 104 },
          { label: 'Model ke bahar: sampler aur loop', x: 10, y: 318, w: 700, h: 104 },
        ],
        nodes: [
          { id: 'user', label: 'xyz Assistant', sub: '"xyz pe video"', x: 90, y: 80, w: 150, kind: 'client', info: 'Ye kya hai: user ki chat app. Yahan se prompt aata hai.' },
          { id: 'tok', label: 'Tokenizer', sub: 'text → [1, 2, 3]', x: 270, y: 80, kind: 'net', info: 'Ye kya hai: text ko tokens mein todne wala program, aur har token ko vocabulary ka id dene wala. "xyz pe video" → [1, 2, 3].' },
          { id: 'emb', label: 'Embedding', sub: 'id → E ki row', x: 450, y: 80, kind: 'data', info: 'Ye kya hai: table lookup. Id 3 ("video") → E ki row 3 = [−0.91, 2.42, −0.02, 0]. Koi calculation nahi.' },
          { id: 'pe', label: '+ Position', sub: 'X = E + PE', x: 630, y: 80, w: 130, kind: 'data', info: 'Ye kya hai: har position ka sin/cos vector jodna, taaki order pata chale. "video" (pos 2): X = [0, 2, 0, 1].' },
          { id: 'attn', label: 'Masked attention', sub: 'Q·Kᵀ ÷ 2, softmax', x: 630, y: 220, w: 150, kind: 'server', info: 'Ye kya hai: Q, K, V banao, scores ÷ √4, causal mask, softmax, weights·V. "video" ke weights [0.5761, 0.2119, 0.2119], output A = [1.58, 0.42, 2.36, 0.42].' },
          { id: 'ffn', label: 'Norm + FFN', sub: '4 → 8 → 4, ×N', x: 450, y: 220, kind: 'server', info: 'Ye kya hai: Add & Norm, FFN (4 → 8, ReLU, 8 → 4), phir Add & Norm. "video" ka H2 = [−0.81, 1.29, 0.65, −1.13]. Real model mein ye poora block N baar.' },
          { id: 'lm', label: 'LM head', sub: 'h · Wout = logits', x: 270, y: 220, kind: 'server', info: 'Ye kya hai: sirf aakhri row h ko Wout (4×6) se multiply. Har vocab token ka ek score (logit). "dekho" = 3.06 sabse bada.' },
          { id: 'soft', label: 'Softmax ÷ T', sub: 'dekho 0.6695', x: 90, y: 220, kind: 'server', info: 'Ye kya hai: logits ÷ temperature, phir softmax = probabilities (total 1). T = 1 pe "dekho" 0.6695, "pe" 0.1844.' },
          { id: 'samp', label: 'Sampler', sub: 'greedy / sample', x: 90, y: 370, kind: 'queue', info: 'Ye kya hai: model ke bahar ka code jo probabilities se ek token chunta hai. Greedy → "dekho". Sampling mein seed wala random number.' },
          { id: 'stop', label: 'Stop check', sub: '<eos>? max_tokens?', x: 270, y: 370, kind: 'queue', info: 'Ye kya hai: har round ke baad check: chuna token &lt;eos&gt; hai, ya max_tokens pura? Haan to ruko, nahi to token ko wapas andar bhejo.' },
          { id: 'out', label: 'User ki screen', sub: '"xyz pe video dekho"', x: 450, y: 370, w: 160, kind: 'client', info: 'Ye kya hai: har chuna token id se wapas text banta hai (detokenize) aur turant screen pe aata hai (streaming).' },
          { id: 'kv', label: 'KV cache', sub: 'K, V per layer', x: 630, y: 370, kind: 'cache', info: 'Ye kya hai: purane tokens ke K, V ki copy. Prefill mein 3 rows bharti hain; decode mein sirf naya row judta hai, purane bit-for-bit same.' },
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
          { name: 'Prefill', text: 'Poora prompt ek saath: 3 tokens, ek forward pass. Teeno ke K, V cache mein. Logits sirf aakhri row ("video") se: "dekho" 0.6695.', go: ['user>tok>emb>pe>attn>ffn>lm>soft>samp', 'attn>kv'] },
          { name: 'Decode one token', text: '"dekho" (id 4, position 3) seedha embedding pe: x = [0, 1, 1, 2]. Sirf iska q, k, v; purane K, V cache se. Naye logits: &lt;eos&gt; 0.7591.', go: ['samp>stop>emb>pe>attn>ffn>lm>soft>samp', 'kv>attn'] },
          { name: 'Loop until &lt;eos&gt;', text: 'Har round: chuno → check → screen pe dikhao → wapas andar. &lt;eos&gt; ya max_tokens pe ruko. Final: "xyz pe video dekho".', go: ['samp>stop>out', 'stop>emb'] },
        ],
      },
      { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
        <li>Raasta: text → tokens → ids → embedding row → + PE → (attention → Add & Norm → FFN → Add & Norm) × N → logits → softmax → ek token.</li>
        <li>Embedding sirf lookup hai. Attention ke baad vector "contextual" ban jaata hai: usme baaki words ki info ghul jaati hai.</li>
        <li>Generation mein logits sirf <strong>aakhri</strong> token ki row se. Training mein har row ek sawaal hai ("iske baad kya?"), aur loss = −ln(sahi token ki probability).</li>
        <li>Model sirf probabilities deta hai. Chunna sampler ka kaam: greedy, ya temperature / top-k / top-p ke saath sampling.</li>
        <li>Har output token = ek forward pass. Round 1 = prefill (poora prompt, TTFT), baaki = decode (1 token each, KV cache ke saath).</li>
        <li>Causal mask ki wajah se purane tokens ke numbers kabhi nahi badalte. Isliye KV cache sahi hai.</li>
        <li>Model khud nahi rukta: &lt;eos&gt; ya max_tokens hi loop todte hain.</li>
      </ul>` },
      { type: 'tradeoffs',
        gains: ['Ek hi simple loop (forward pass → pick → append) se koi bhi lambai ka jawab', 'Prefill parallel: lamba prompt bhi ek pass mein', 'KV cache se har naya token sasta', 'Sampler alag hai: bina model badle creativity/determinism control'],
        costs: ['Har output token = ek poora forward pass (output tokens mehenge, dheeme)', 'Ek galat token agle saare tokens ka input ban jaata hai (error compounding)', 'Model khud nahi rukta: &lt;eos&gt; ya max_tokens pe nirbhar', 'KV cache memory context ke saath badhti hai'] },
      { type: 'think', questions: [
        { q: 'Stepper mein round 2 pe pehle 3 rows bilkul same rahe. Agar causal mask hata dete (encoder jaisa), to kya ye tab bhi same rehte?', a: 'Nahi. Bina mask ke "xyz" bhi naye token "dekho" ko dekhta, to uska attention output, H1, H2 sab badal jaate. Phir har round pe saare tokens dobara calculate karne padte aur KV cache valid nahi rehta. Causal mask hi generation ko sasta banata hai.' },
        { q: 'Logits mein "dekho" 3.06 aur "pe" 1.77 tha. Sirf 1.29 ka farak, lekin probability 0.6695 vs 0.1844, lagbhag 3.6 guna. Kyun?', a: 'Softmax exponential hai: ratio = e^(3.06 − 1.77) = e^1.29 ≈ 3.63. Logits ka chhota farak probabilities mein bada ratio ban jaata hai. Temperature isi farak ko divide karke chhota (T > 1) ya bada (T < 1) karta hai.' },
        { q: 'xyz Assistant ka jawab 400 tokens ka hai aur prompt 2,000 tokens ka. Kitne forward passes? Kaunsa hissa zyada time leta hai, aur kyun?', a: '1 prefill pass (2,000 tokens ek saath) + 399 decode passes (har ek 1 token; pehla output token prefill se hi aata hai) = 400 passes. Aam taur pe 399 decode steps total time ka bada hissa lete hain, kyunki har step saare weights memory se padhta hai aur steps ek ke baad ek hi ho sakte hain.' },
      ]},
      { type: 'quiz', questions: [
        { q: 'Generation mein logits kis row se nikalte hain?', options: ['Pehle token ki row se', 'Saari rows ka average', 'Sirf aakhri token ki row se', 'Embedding table se'], answer: 2, explain: 'Agla token aakhri position predict karti hai. Training mein har row use hoti hai, generation mein sirf aakhri.' },
        { q: 'Embedding lookup mein kya hota hai?', options: ['Matrix multiply aur softmax', 'Token id wali row table se utha lete hain', 'Attention scores bante hain', 'Positional encoding hata dete hain'], answer: 1, explain: 'Embedding table (vocab × d_model) se ek row: pure lookup. Phir PE juda.' },
        { q: 'Temperature 1 se 5 karne pe kya hota hai?', options: ['Logits badal jaate hain kyunki model dobara train hota hai', 'Probabilities zyada barabar (flat) ho jaati hain', 'Sirf top token bachta hai', 'Kuch nahi'], answer: 1, explain: 'Logits ÷ T. Bada T farak chhota karta hai: dekho 0.6695 → 0.2688, xyz 0.0038 → 0.0958.' },
        { q: '"xyz pe video" ke baad "dekho" aaya. Round 2 mein kya dobara calculate karna zaroori hai (KV cache ke saath)?', options: ['Saare 4 tokens ke Q, K, V', 'Sirf "dekho" ka q, k, v aur uska attention', 'Sirf tokenizer', 'Kuch nahi, jawab cache mein hai'], answer: 1, explain: 'Purane tokens ke K, V cache mein hain aur badalte nahi (causal mask). Sirf naya token process hota hai.' },
        { q: 'Training mein "pe → video" position ka loss 4.2579 hai. Iska matlab?', options: ['Model wahan bahut achha hai', 'Model ne sahi token "video" ko sirf ~1.4% diya: bada sudhaar chahiye', 'Loss hamesha 4 se zyada hota hai', 'Wo position train nahi hoti'], answer: 1, explain: '−ln(0.0142) = 4.2579. Kam probability = bada loss = training wahan weights zyada khiskaayegi.' },
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
