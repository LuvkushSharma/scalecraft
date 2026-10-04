/*
  ai-multihead: reuses the shared tiny example from ai-attention.js
  (tokens ["xyz","pe","video"], X, Wq, Wk, Wv). Multi-head here = the SAME Wq/Wk/Wv,
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
  const TOK = ['xyz', 'pe', 'video'];
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
    title: 'Multi-head attention, encoder aur decoder',
    minutes: 28,
    summary: `Ek attention head ek hi "nazar" se dekhta hai. Multi-head mein kai heads alag alag rishte pakadte hain. Phir residual + LayerNorm, FFN, causal mask, encoder vs decoder, cross-attention aur KV cache: ek poora Transformer block, chhote numbers ke saath.`,
    blocks: [
      { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Pichhle lesson mein har word ne baaki words ko <em>ek</em> nazar se dekha.<br>Lekin ek word ko ek saath kai sawaal poochhne hote hain: "kiska?", "kahan?", "kaun paas hai?".<br>Is lesson mein hum us ek nazar ko <strong>kai chhoti nazron</strong> mein baantenge (multi-head).<br>Phir dekhenge ki bahut saari layers ek ke upar ek lagane pe model toot-ta kyun nahi, word "socha" kaise jaata hai (FFN), aur chat karte waqt model fast kaise rehta hai (KV cache).<br>Har cheez chhote numbers ke saath, jo tum khud badal ke dekh sakte ho.` },
      { type: 'h2', text: 'Problem: ek head, ek hi nazar' },
      { type: 'p', html: `<a href="#/ai-attention">Self-attention</a> lesson mein humne 3 tokens <code>["xyz", "pe", "video"]</code> ke liye attention haath se nikala. "video" ka weight row tha <code>[0.5761, 0.2119, 0.2119]</code>: matlab "video" ne 58% dhyaan "xyz" pe diya aur baaki do pe 21-21%.` },
      { type: 'callout', tone: 'term', title: 'Yaad karo: softmax', html: `<strong>Ye kya hai:</strong> ek formula jo kuch bhi numbers (scores) ko percentages mein badal deta hai. Sab 0 aur 1 ke beech, aur total hamesha 1 (yaani 100%).<br><strong>Kyun chahiye:</strong> attention ko batana hai ki kis word se "kitna hissa" lena hai. Hisse ka total 100% hona chahiye.<br><strong>Iske bina:</strong> scores kuch bhi ho sakte (−3, 50, 7). Unhe seedha "hissa" nahi maan sakte.<br><strong>Example:</strong> "video" ke scores <code>[3.5, 2.5, 2.5]</code>. Har ek ka e<sup>x</sup> lo: <code>[33.12, 12.18, 12.18]</code>. Total 57.48. Divide karo: <code>[0.5761, 0.2119, 0.2119]</code>. Bada score = bada hissa.` },
      { type: 'p', html: `Lekin socho, "video" word ko ek saath kai sawaal poochhne hain:` },
      { type: 'list', items: [
        `<em>Kiska video?</em> (jawab: xyz.com ka)`,
        `<em>Sentence mein mera role kya hai?</em> ("pe" bata raha hai ki ye ek jagah hai)`,
        `<em>Mere paas wale words kaun hain?</em>`,
      ]},
      { type: 'p', html: `Ek head ke paas sirf <strong>ek softmax</strong> hai. Yaani 100% ka sirf ek hi batwara. Agar 58% "xyz" ko de diya, to "pe" ke liye kam bacha. Saare sawaalon ka jawab ek hi average mein mix ho jaata hai. Aur average hamesha thoda dhundhla hota hai.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Attention head', html: `<strong>Ye kya hai:</strong> ek poora attention calculation, apne khud ke <code>Wq</code>, <code>Wk</code>, <code>Wv</code> ke saath: Q, K, V banao, scores, softmax, phir weighted sum. Ek head = ek "nazar".<br><strong>Kyun chahiye:</strong> har head ek alag tarah ka rishta dhoondh sakta hai. Ek head "kiska?" dekhe, doosra "kahan?".<br><strong>Iske bina (sirf ek head):</strong> saare rishte ek hi 100% ke batware mein ladte hain, aur jawab dhundhla average ban jaata hai.<br><strong>Multi-head</strong> = aise kai heads ek saath (parallel), har ek apni nazar se. Neeche hum 2 heads ke asli numbers dekhenge.` },
      { type: 'h2', text: 'Solution: d_model ko heads mein baant do' },
      { type: 'p', html: `2017 ke paper "Attention Is All You Need" ka idea simple hai: ek bada head chalane ki jagah, vector ko chhote tukdon mein baanto aur har tukde pe alag attention chalao. Hamare toy example mein <code>d_model = 4</code> hai. Hum <strong>h = 2 heads</strong> banayenge, to har head ka size <code>d_k = d_model / h = 4 / 2 = 2</code>.` },
      { type: 'callout', tone: 'term', title: 'Naye words: d_model, h aur d_k', html: `<strong>Ye kya hai:</strong> <code>d_model</code> = har token ke vector mein kitne numbers hain (hamare toy mein 4). <code>h</code> = kitne heads. <code>d_k</code> = har head ko kitne numbers milte hain = d_model ÷ h.<br><strong>Kyun chahiye:</strong> heads vector ko <em>baantte</em> hain, copy nahi karte. Isliye kul kaam utna hi rehta hai.<br><strong>Iske bina (agar har head poora vector copy karta):</strong> 8 heads = 8 guna maths aur memory.<br><strong>Example:</strong> "xyz" ka Q vector <code>[1, 1, 0, 2]</code>. Head 1 ko pehle do numbers <code>[1, 1]</code>, head 2 ko baaki do <code>[0, 2]</code>. Real model: d_model 512, h 8, to d_k = 64.` },
      { type: 'steps', items: [
        { t: 'Q, K, V banao (wahi purane)', d: `Q = X·Wq, K = X·Wk, V = X·Wv. Shape: 3 tokens × 4. Ye bilkul attention lesson wale numbers hain.` },
        { t: 'Columns baant do', d: `Head 1 ko columns 0-1 milte hain, head 2 ko columns 2-3. Real code (PyTorch, yaani AI models likhne ki sabse popular library) bhi yahi karta hai: ek bada Wq, phir reshape karke heads mein split. Har head ke paas apna 3×2 ka Q, K, V.` },
        { t: 'Har head apna attention chalata hai', d: `scores = Q<sub>h</sub>·K<sub>h</sub><sup>T</sup>, phir divide by √d_k = √2 ≈ 1.4142 (ab √4 nahi, kyunki har head ka size 2 hai), softmax, phir weights·V<sub>h</sub>. Dono heads <strong>parallel</strong> mein, ek doosre se bilkul alag.` },
        { t: 'Concat', d: `Head 1 ka output (3×2) aur head 2 ka output (3×2) side by side jodo: wapas 3×4.` },
        { t: 'Wo se mix karo', d: `Last mein ek aur matrix <code>Wo</code> (4×4) se multiply. Isse dono heads ki information aapas mein mix hoti hai aur shape wapas d_model ho jaata hai, taaki agla layer use kar sake.` },
      ]},
      { type: 'callout', tone: 'term', title: 'Naya word: concat', html: `<strong>Ye kya hai:</strong> concat (concatenate) = do lists ko aage peeche jod ke ek lambi list banana. Koi maths nahi, sirf chipkana.<br><strong>Kyun chahiye:</strong> har head ne 2 numbers diye. Agli layer ko wapas 4 numbers ka vector chahiye.<br><strong>Iske bina:</strong> do alag chhote vectors bachte, aur agla block unhe le hi nahi paata.<br><strong>Example:</strong> head 1 ka "xyz" output <code>[1.62, 0.15]</code>, head 2 ka <code>[0.32, 1.79]</code>. Concat = <code>[1.62, 0.15, 0.32, 1.79]</code>.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Wo (output projection)', html: `<strong>Ye kya hai:</strong> ek seekha hua matrix (yahan 4×4) jisse concat ke baad multiply karte hain.<br><strong>Kyun chahiye:</strong> concat ke baad head 1 ki info hamesha columns 0-1 mein aur head 2 ki 2-3 mein band rehti. Wo dono ko <strong>mila</strong> deta hai, taaki har output number dono heads se kuch le sake.<br><strong>Iske bina:</strong> heads kabhi "aapas mein baat" nahi kar paate. Agli layer ko alag alag dibbe milte.<br><strong>Example:</strong> hamare Wo ka pehla column <code>[1, 0, 1, 0]</code> hai. To output ka pehla number = 1.62·1 + 0.15·0 + 0.32·1 + 1.79·0 = <strong>1.94</strong>. Isme head 1 (1.62) aur head 2 (0.32) dono mil gaye.` },
      { type: 'ascii', caption: 'Shapes, h = 2 heads, d_model = 4, 3 tokens', text: `X (3×4)
 ├─ ·Wq → Q (3×4) ─┬─ Q1 = cols 0-1 (3×2)   Q2 = cols 2-3 (3×2)
 ├─ ·Wk → K (3×4) ─┼─ K1 (3×2)              K2 (3×2)
 └─ ·Wv → V (3×4) ─┴─ V1 (3×2)              V2 (3×2)

head 1: softmax(Q1·K1ᵀ / √2) · V1  → O1 (3×2)
head 2: softmax(Q2·K2ᵀ / √2) · V2  → O2 (3×2)

concat [O1 | O2] (3×4)  ·  Wo (4×4)  →  output (3×4)` },
      { type: 'image', src: 'assets/img/ai-multihead/multihead-attention.png', maxWidth: 420, alt: 'Block diagram: Q, K aur V teen Linear boxes se guzarte hain, phir kai parallel Scaled Dot-Product Attention boxes (heads), phir Concat, phir ek aakhri Linear box', caption: 'Yahi picture: neeche Q, K, V ke "Linear" boxes (yaani Wq, Wk, Wv), beech mein kai heads ek ke peeche ek, upar Concat aur aakhri Linear (yaani Wo).', credit: { text: 'dvgodoy, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Multiheaded_attention,_block_diagram.png', license: 'CC BY 4.0' } },
      { type: 'h3', text: 'Asli numbers: dono heads alag dekhte hain' },
      { type: 'p', html: `Abhi bina mask ke (encoder jaisa, har token sab ko dekh sakta hai). Softmax weights, 4 decimals tak:` },
      { type: 'table', head: ['Token (query)', 'Head 1 weights → [xyz, pe, video]', 'Head 2 weights → [xyz, pe, video]'], rows: [
        ['xyz', '[0.6200, 0.3057, 0.0743]', '[0.0529, 0.0529, 0.8943]'],
        ['pe', '[0.7952, 0.1933, 0.0114]', '[0.1636, 0.1636, 0.6728]'],
        ['video', '[0.8066, 0.0967, 0.0967]', '[0.1978, 0.4011, 0.4011]'],
      ], caption: 'Head 1 zyada tar "xyz" ki taraf dekhta hai. Head 2 "video" ki taraf, aur "video" khud head 2 mein "pe" aur "video" ko barabar baantta hai.' },
      { type: 'p', html: `Dekho: "xyz" token head 1 mein 62% khud ko dekh raha hai, lekin head 2 mein 89% "video" ko. Ek single head ko ye dono baatein ek hi row mein average karni padti. Do heads ke saath dono pattern <strong>saath mein</strong> zinda rehte hain. Concat ke baad "xyz" ki row hai <code>[1.62, 0.15, 0.32, 1.79]</code>, aur Wo ke baad <code>[1.94, 1.94, 0.47, 3.41]</code>.` },
      { type: 'h3', text: 'Khud chala ke dekho: multi-head explorer' },
      { type: 'p', html: `Token chuno, head chuno, causal mask on/off karo. Har step ke numbers live calculate hote hain (display 2-4 decimals, andar poori precision).` },
      { type: 'custom', render(el) {
        let tok = 2, hd = 0, mask = false;
        el.innerHTML = `<div class="chips mh-tok" role="group" aria-label="Token"></div>
          <div class="chips mh-hd" role="group" aria-label="Head" style="margin-top:6px"></div>
          <label style="display:flex;gap:8px;align-items:center;margin:8px 0"><input type="checkbox" class="mh-mask"> Causal mask (decoder): token sirf apne se pehle wale tokens dekhe</label>
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
            const best = TOK.filter((_, j) => Math.abs(r.W[tok][j] - mx) < 1e-9).map(t => `"${t}"`).join(' aur ');
            note.innerHTML = `Head ${hd + 1} mein "${TOK[tok]}" sabse zyada <strong>${best}</strong> ko dekh raha hai (${(mx * 100).toFixed(1)}%${best.includes(' aur ') ? ' har ek' : ''}).`;
          } else {
            const C = H[0].O.map((r, i) => r.concat(H[1].O[i]));
            const O = mm(C, Wo);
            out.innerHTML = grid(C, 'concat [O1 | O2]', 4, tok, TOK) + grid(Wo, 'Wo', 0) + grid(O, 'output = concat·Wo', 2, tok, TOK);
            note.innerHTML = `"${TOK[tok]}" ki final row: [${O[tok].map(x => fmt(x, 2)).join(', ')}]. Shape wapas 3×4, agla layer isi pe kaam karega.`;
          }
        };
        upd();
      }},
      { type: 'p', html: `Mask on karke "xyz" chuno: dono heads mein weights <code>[1, 0, 0]</code> ho jaate hain, kyunki pehla token sirf khud ko dekh sakta hai. "video" pe mask ka koi asar nahi, wo already last hai.` },
      { type: 'h3', text: 'Kyun kaam karta hai, aur kitna mehenga hai?' },
      { type: 'list', items: [
        `<strong>Alag pehlu:</strong> har head ka apna chhota Wq/Wk/Wv hai, to wo vector ke alag "pehlu" pe dhyaan de sakta hai. 2017 ke paper ne isse "alag representation subspaces" kaha: matlab vector ke alag hisse, alag tarah ki jaankari ke liye.`,
        `<strong>Parameters utne hi:</strong> 1 head of size 4 ke liye Wq, Wk, Wv = 3 × (4×4) = 48 numbers. 2 heads of size 2: har head 3 × (4×2) = 24, do heads = 48. Same! Wo (4×4 = 16) dono case mein lagta hai. General rule: attention ke params ≈ <code>4 · d_model²</code>, heads kitne bhi hon.`,
        `<strong>Compute bhi lagbhag utna:</strong> chhote heads ka kaam total mein ek bade head jitna hai, aur GPU pe sab heads ek saath (parallel) chalte hain.`,
        `<strong>Heads ke roles koi likhta nahi:</strong> "head 1 = grammar, head 2 = naam" ye humne samjhane ke liye kaha. Asli model mein training khud decide karti hai. Research (Michel et al., 2019) ne dikhaya ki kai heads hata do to bhi accuracy zyada nahi girti: kuch heads redundant hote hain.`,
      ]},
      { type: 'table', head: ['Model', 'd_model', 'Heads (h)', 'd_k = d_model / h', 'Layers'], rows: [
        ['Original Transformer (2017, base)', '512', '8', '64', '6 + 6'],
        ['GPT-2 small (2019)', '768', '12', '64', '12'],
        ['Llama 2 7B (2023)', '4096', '32', '128', '32'],
        ['Llama 3 8B (2024)', '4096', '32 query heads, 8 KV heads', '128', '32'],
        ['Hamara toy', '4', '2', '2', '1'],
      ], caption: 'Llama 3 ke "8 KV heads" ka matlab neeche KV cache section mein (GQA).' },
      { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"8 heads = 8 guna bada model." Galat. Heads d_model ko <strong>baantte</strong> hain, copy nahi karte. 512 ka vector 8 tukdon mein 64-64 ka. Isliye zyada heads ka matlab har head chhota (kam detail), kam heads matlab har head bada lekin kam alag nazariye. h ek <strong>hyperparameter</strong> hai (yaani model banane wala training se pehle khud chunta hai, model ise seekhta nahi), aur ye trade-off balance karta hai; paper ne 1 head aur bahut zyada heads, dono ko thoda kharab paaya.` },
      { type: 'h2', text: 'Naya problem: block ko 32-96 baar stack karna hai' },
      { type: 'p', html: `Ek attention layer kaafi nahi. Real models ye block baar baar stack karte hain: GPT-2 small mein 12, Llama 2 7B mein 32, GPT-3 (175B) mein 96 layers. Lekin bahut gehre network mein do dikkatein aati hain:` },
      { type: 'list', items: [
        `<strong>Signal kho jaata hai:</strong> har layer input ko thoda badalti hai. 96 baar badlo to original token ka meaning beech mein dhundhla ho sakta hai. Training mein ek aur signal peeche ki taraf jaata hai: <strong>gradient</strong>. Gradient = har weight ke liye ek chhota sa note: "tumhe kis taraf aur kitna badalna hai taaki galti kam ho". 96 layers peeche jaate jaate ye note bhi ghis ke lagbhag 0 ho sakta hai. Phir pehli layers kuch seekhti hi nahi.`,
        `<strong>Numbers bhatak jaate hain:</strong> kisi layer ke output bahut bade (jaise 300) ya bahut chhote ho gaye to agla softmax ek hi token pe 100% chala jaata hai, training unstable.`,
      ]},
      { type: 'h3', text: 'Fix 1: Residual connection (shortcut)' },
      { type: 'p', html: `Layer ka output seedha aage bhejne ki jagah, input ko usmein <strong>jod do</strong>: <code>output = x + Sublayer(x)</code>. Ab layer ko poora naya vector nahi banana, sirf "kya badlaav chahiye" seekhna hai. Agar layer kuch kaam ki nahi, to wo ~0 de sakti hai aur x jaisa tha waisa aage chala jaata hai. Gradient bhi is shortcut se seedha peeche pahunchta hai.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Residual connection', html: `<strong>Ye kya hai:</strong> residual (ya skip connection) = sublayer (attention ya FFN) ke output mein uska apna input wapas jod dena: <code>x + Sublayer(x)</code>. Jaise kisi document mein "track changes": original text rehta hai, layer sirf badlaav jodti hai.<br><strong>Kyun chahiye:</strong> original meaning kabhi nahi khota, aur gradient ko peeche jaane ka ek seedha raasta milta hai.<br><strong>Iske bina:</strong> 30-100 layers wale models train hi nahi hote: signal aur gradient beech mein mar jaate hain.<br><strong>Example:</strong> x = <code>[2, 0, 1, 0]</code>. Layer ne badlaav diya <code>[0.1, −0.2, 0, 0.3]</code>. Output = <code>[2.1, −0.2, 1, 0.3]</code>. Layer ne kuch kaam nahi kiya (sab 0) to bhi x safe aage gaya.<br>Idea ResNet (He et al., 2015, image models) se aaya. Transformer mein har attention aur har FFN ke around ek residual hota hai. Isko "residual stream" bhi kehte hain: ek highway jis pe har layer thoda kuch add karti jaati hai.` },
      { type: 'h3', text: 'Fix 2: LayerNorm (scale theek karo)' },
      { type: 'callout', tone: 'term', title: 'Naya word: LayerNorm', html: `<strong>Ye kya hai:</strong> Layer Normalization (Ba et al., 2016). Har token ke vector ko <em>akele</em> normalize karta hai: numbers ka average (mean) 0 aur phailaav (std) 1 kar deta hai. Jaise har photo ki brightness ek standard level pe set kar dena, taaki sab ek jaisi dikhein.<br><strong>Kyun chahiye:</strong> layers ke beech numbers bahut bade ya bahut chhote na ho jaayein. Agli layer ko hamesha ek jaisi "range" ke numbers milein.<br><strong>Iske bina:</strong> numbers bhatak ke 300 ya 0.001 ho jaate, softmax ek token pe 100% chipak jaata, training unstable.<br><strong>Kyun "akele":</strong> doosre tokens ya batch ke doosre sentences se koi lena dena nahi. Isliye ek ek token generate karte waqt bhi chalta hai.` },
      { type: 'p', html: `Teen chhote words pehle: <strong>mean</strong> = average. <strong>Variance</strong> = har number mean se kitna door hai, uska square, phir un sab ka average. <strong>Std</strong> (standard deviation) = √variance, yaani numbers ka typical phailaav. Ab formula: <code>LN(x) = γ · (x − mean) / √(variance + ε) + β</code>. ε (epsilon) ek chhota number (jaise 0.00001) hai taaki zero se divide na ho. γ (gamma) aur β (beta) seekhe hue numbers hain jo model ko scale wapas adjust karne dete hain (shuru mein γ = 1, β = 0).` },
      { type: 'p', html: `Example: <code>x = [1, 3, 2, 6]</code>. Mean = 12/4 = 3. Variance = ((1−3)² + 0² + (2−3)² + (6−3)²)/4 = (4 + 0 + 1 + 9)/4 = 3.5. Std = √3.5 ≈ 1.8708. LN(x) = <code>[−1.0690, 0.0000, −0.5345, 1.6036]</code>. Ab <code>[10, 30, 20, 60]</code> lo: answer <strong>bilkul wahi</strong>. LayerNorm sirf shape (pattern) rakhta hai, size hata deta hai.` },
      { type: 'custom', render(el) {
        el.innerHTML = `<div class="row2"><div><label>Vector x (4 numbers, comma se)</label><input class="ln-in" type="text" value="1, 3, 2, 6"></div>
          <div><label>Scale multiplier: <strong class="ln-kv">×1</strong></label><input class="ln-k" type="range" min="1" max="100" step="1" value="1"></div></div>
          <div class="stats"><div class="stat"><span>Input (× scale)</span><strong class="ln-x"></strong></div><div class="stat"><span>Mean</span><strong class="ln-m"></strong></div><div class="stat"><span>Std</span><strong class="ln-s"></strong></div><div class="stat"><span>LN(x), γ=1, β=0</span><strong class="ln-o"></strong></div></div>
          <div class="calc-note">Scale slider ghumao: input 100 guna ho jaaye, LN ka output nahi badalta. Yahi LayerNorm ka kaam hai. ε = 0.00001.</div>`;
        const q = s => el.querySelector(s);
        const upd = () => {
          const k = Number(q('.ln-k').value);
          q('.ln-kv').textContent = '×' + k;
          let x = q('.ln-in').value.split(',').map(Number).filter(v => !isNaN(v)).slice(0, 8);
          if (x.length < 2) { q('.ln-o').textContent = 'kam se kam 2 numbers do'; return; }
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
      { type: 'p', html: `"Add & Norm" = residual jodo (Add) aur LayerNorm lagao (Norm). Sawaal sirf ye hai ki Norm <em>kab</em> lage. <strong>Post-LN</strong> = jodne ke baad (post = baad mein). <strong>Pre-LN</strong> = sublayer se pehle (pre = pehle).` },
      { type: 'compare',
        left: { title: 'Post-LN (2017 original)', ascii: `x ──┬──> Sublayer ──> (+) ──> LayerNorm ──> out
    └──────────────────^` , html: `Diagram mein "Add & Norm" box yahi hai: pehle jodo, phir normalize. Gehre models mein training shuru mein unstable; learning rate "warm-up" zaroori (warm-up = training ke pehle kuch hazaar steps mein weights ko bahut dheere dheere badalna, phir speed badhana).` },
        right: { title: 'Pre-LN (GPT-2 se aage)', ascii: `x ──┬──> LayerNorm ──> Sublayer ──> (+) ──> out
    └──────────────────────────────^`, html: `Pehle normalize, phir sublayer, phir jodo. Residual highway bilkul saaf rehta hai. Xiong et al. (2020) ne dikhaya ki gradients shuru se well-behaved rehte hain, warm-up ki zaroorat kam.` },
      },
      { type: 'p', html: `Aaj ke zyada tar LLMs (GPT-2/3, Llama family) <strong>Pre-LN</strong> use karte hain. Llama ek kadam aur aage jaata hai: <strong>RMSNorm</strong> (Zhang & Sennrich, 2019), jo mean subtract nahi karta, sirf root-mean-square se divide karta hai: <code>x / √(mean(x²) + ε) · γ</code>. Example: <code>x = [1, 3, 2, 6]</code>. mean(x²) = (1 + 9 + 4 + 36)/4 = 12.5, √12.5 ≈ 3.5355, to RMSNorm(x) ≈ <code>[0.2828, 0.8485, 0.5657, 1.6971]</code>. Pattern wahi, bas mean 0 nahi kiya. Thoda sasta, aur practice mein utna hi achha. Is track ke <a href="#/ai-transformer-e2e">end-to-end lesson</a> mein hum original wala Post-LN use karenge taaki 2017 diagram se match kare.` },

      { type: 'h2', text: 'Feed-forward network (FFN): har token akele sochta hai' },
      { type: 'p', html: `Attention mein tokens <em>aapas mein</em> information baantte hain. Lekin sirf baantne se kaam nahi chalta: har token ko us mili hui information ko <strong>process</strong> bhi karna hai. Ye kaam FFN karta hai: ek chhota 2-layer neural network jo <strong>har token pe alag alag, same weights ke saath</strong> chalta hai (isliye "position-wise").` },
      { type: 'callout', tone: 'term', title: 'Naya word: FFN (feed-forward network)', html: `<strong>Ye kya hai:</strong> ek chhota 2-layer neural network. Pehle vector ko bada karo (4 → 8 numbers), har number pe ek "mod" (activation) lagao, phir wapas chhota karo (8 → 4). Har token pe <strong>alag alag</strong> chalta hai, lekin sab tokens ke liye <strong>same weights</strong>. Isliye ise "position-wise" bhi kehte hain.<br><strong>Kyun chahiye:</strong> attention sirf info <em>ikattha</em> karta hai (weighted average). Us info se naya matlab nikalna, jaise "xyz + pe + video = ek website pe video ki baat", ye kaam FFN karta hai.<br><strong>Iske bina:</strong> model sirf average karta rehta. Layer ke ~2/3 parameters, aur model ka bahut sa yaad kiya hua gyaan, yahin rehta hai.<br><strong>Chhote words:</strong> <code>d_ff</code> = beech wale bade vector ka size (paper mein 2048, yaani 4 × 512). <code>b1</code>, <code>b2</code> = <strong>bias</strong>, yaani ek fixed number jo har output mein jud jaata hai (hamare toy mein 0).` },
      { type: 'callout', tone: 'term', title: 'Naya word: activation function', html: `<strong>Ye kya hai:</strong> ek chhota sa niyam jo har number pe alag se lagta hai aur use "modta" hai (non-linear). Seedhi line nahi, ek mod.<br><strong>Kyun chahiye:</strong> matrix multiply sirf "seedhi line" wale kaam kar sakta hai. Do matrix multiply ek ke baad ek = phir bhi ek hi matrix multiply. Mod ke bina FFN kuch naya seekh hi nahi sakta.<br><strong>Iske bina:</strong> W1 aur W2 mil ke ek hi matrix ban jaate. Gehri layers ka koi fayda nahi.` },
      { type: 'callout', tone: 'term', title: 'Naye words: ReLU, GELU, SwiGLU', html: `<strong>ReLU</strong>: negative ko 0 kar do, positive ko waisa hi rehne do: <code>max(0, x)</code>. Example: <code>[−2, −1, 0, 1, 2]</code> → <code>[0, 0, 0, 1, 2]</code>. 2017 ka original model yahi use karta tha.<br><strong>GELU</strong>: ReLU ka smooth version. Bilkul 0 pe kaatne ki jagah, negative values ko dheere dheere chhota karta hai. Example: <code>[−2, −1, 0, 1, 2]</code> → lagbhag <code>[−0.0455, −0.1587, 0, 0.8413, 1.9545]</code>. GPT-2 yahi use karta hai.<br><strong>SwiGLU</strong> (Shazeer, 2020): ek "gate" (darwaza) jo har value ke liye decide karta hai ki wo kitni aage jaaye. Isme 2 ki jagah 3 matrices hote hain. Llama jaise models mein use hota hai.<br><strong>Inke bina:</strong> upar wala "mod" hi nahi, to FFN bekaar.` },
      { type: 'code', text: `FFN(x) = activation(x · W1 + b1) · W2 + b2

shapes:  x (1 × d_model) → x·W1 (1 × d_ff) → activation → ·W2 (1 × d_model)
paper:   d_model = 512, d_ff = 2048 (4 guna), activation = ReLU
GPT-2:   GELU        Llama:  SwiGLU (3 matrices, gate wala version)` },
      { type: 'p', html: `Toy example (e2e lesson wale weights, d_ff = 8): "xyz" ka normalized vector <code>h = [1, −1, 1, −1]</code>. <code>h·W1 = [1, −1, 1, 0, −2, 2, −2, 1]</code>. ReLU ke baad <code>[1, 0, 1, 0, 0, 2, 0, 1]</code>: negatives band. Phir <code>·W2 = [1, −1, 1.5, −0.5]</code>. Ye FFN ka output hai, jo residual se <code>h</code> mein juda: <code>[2, −2, 2.5, −1.5]</code>.` },
      { type: 'p', html: `Params ka hisaab: original model mein attention ke ~<code>4·512² = 1,048,576</code> per layer, aur FFN ke <code>2·512·2048 = 2,097,152</code>. Yaani <strong>har layer ke lagbhag 2/3 parameters FFN mein</strong> hain. Researchers (Geva et al., 2021) ke mutabik model ka bahut sa "yaad kiya hua gyaan" (facts) inhi FFN weights mein rehta hai. Isliye Mixture-of-Experts (MoE) models FFN ko hi kai "experts" mein todte hain (MoE = kai alag FFN, aur har token ke liye ek chhota router sirf 1-2 FFN chalata hai, saare nahi).` },
      { type: 'h2', text: 'Causal mask: decoder ko future dekhne mat do' },
      { type: 'p', html: `GPT jaisa model ek kaam karta hai: agla token predict karna. Training mein hum use poora sentence ek saath dete hain, "xyz pe video dekho", aur har position pe poochte hain "iske baad kya aayega?". Ye <strong>parallel</strong> hota hai: 4 positions, 4 sawaal, ek hi <strong>forward pass</strong> mein (forward pass = input ko model ki saari layers se ek baar guzaarna). Lekin agar "pe" wali position "video" ko dekh sakti, to wo answer <em>copy</em> kar leti. Ye cheating hai: training mein <strong>loss</strong> (model kitna galat tha, ek number mein; kam = achha) shaandaar, lekin asli generation mein (jab future hai hi nahi) model fail.` },
      { type: 'callout', tone: 'term', title: 'Naya word: causal mask', html: `<strong>Ye kya hai:</strong> score table pe lagaya gaya ek "parda". Har token sirf apne aap ko aur apne <em>pehle</em> wale tokens ko dekh sakta hai. Aage wale (future) tokens ke score <code>−∞</code> kar diye jaate hain.<br><strong>Kyun chahiye:</strong> <strong>decoder</strong> (text generate karne wala model, jaise GPT) ko training mein bhi wahi halat milni chahiye jo asli use mein hai: future abhi bana hi nahi.<br><strong>Iske bina:</strong> model training mein answer copy karna seekh leta, aur asli chat mein bakwaas likhta.<br><strong>Example:</strong> "pe" ke scores <code>[a, b, c]</code> mein "video" wala c future hai. Mask ke baad <code>[a, b, −∞]</code>. e<sup>−∞</sup> = 0, to softmax ke baad "video" ka weight exactly 0.` },
      { type: 'p', html: `Fix: score matrix mein diagonal ke upar wale (future) cells ko <code>−∞</code> kar do, softmax se pehle. <code>e<sup>−∞</sup> = 0</code>, to unka weight exactly 0. Isko <strong>causal mask</strong> (ya look-ahead mask) kehte hain. Explorer mein mask on karke dekha: head 2 mein "pe" ka row <code>[0.1636, 0.1636, 0.6728]</code> se <code>[0.5, 0.5, 0]</code> ho gaya.` },
      { type: 'ascii', caption: 'Causal mask: ✓ = dekh sakta hai, ✗ = −∞ (weight 0)', text: `            dekhta hai →  xyz   pe   video
  query xyz               ✓    ✗     ✗
  query pe                ✓    ✓     ✗
  query video             ✓    ✓     ✓` },

      { type: 'h2', text: 'Ek decoder block, chala ke dekho' },
      { type: 'p', html: `Ab sab tukde jodte hain. GPT-style (decoder-only) block: masked multi-head attention → Add & Norm → FFN → Add & Norm. Boxes pe click karke har hissa samjho.` },
      { type: 'flow', height: 310, title: 'Decoder block (Post-LN, 2017 style)',
        nodes: [
          { id: 'in', label: 'Input x', sub: 'emb + PE, 3×4', x: 90, y: 80, w: 140, kind: 'client', info: 'Ye kya hai: har token ka vector (embedding + positional encoding). Shape: tokens × d_model, hamare case mein 3 × 4. Block yahin se shuru hota hai. Doosre block ke liye input pichhle block ka output hota hai.' },
          { id: 'mha', label: 'Masked MHA', sub: '2 heads, d_k=2', x: 270, y: 80, w: 140, kind: 'server', info: 'Ye kya hai: masked multi-head self-attention. Yahan tokens aapas mein information baantte hain. Har head apna Q, K, V banata hai, causal mask lagata hai (future = −∞), softmax, phir weights·V. Phir concat aur Wo.' },
          { id: 'an1', label: 'Add & Norm', sub: 'x + MHA(x)', x: 450, y: 80, w: 140, kind: 'net', info: 'Ye kya hai: residual + LayerNorm. Input x ko attention output mein jodo, phir har token ka vector mean 0, std 1 pe lao. Kyun: gehre stack mein signal aur gradient zinda rehte hain.' },
          { id: 'ffn', label: 'FFN', sub: '4 → 8 → 4', x: 630, y: 80, w: 140, kind: 'server', info: 'Ye kya hai: position-wise feed-forward network. Har token pe alag se Linear (4 → 8), ReLU, Linear (8 → 4). Kyun: attention ne jo info ikattha ki, use process karna. Real models mein d_ff = 4·d_model, layer ke ~2/3 params yahin.' },
          { id: 'an2', label: 'Add & Norm', sub: 'h + FFN(h)', x: 630, y: 230, w: 140, kind: 'net', info: 'Ye kya hai: doosra residual + LayerNorm. Iska output hi poore block ka output hai, shape wahi tokens × d_model.' },
          { id: 'out', label: 'Next block', sub: 'ya LM head', x: 450, y: 230, w: 140, kind: 'data', info: 'Ye kya hai: agla block (ye block N baar repeat hota hai). Aakhri block ke baad LM head aata hai: Linear (d_model → vocab size) aur softmax, jo agle token ki probabilities deta hai.' },
          { id: 'kv', label: 'KV cache', sub: 'past K, V', x: 270, y: 230, w: 140, kind: 'cache', info: 'Ye kya hai: GPU memory mein ek store. Generation ke time har layer ke purane tokens ke K aur V vectors yahan save hote hain. Kyun: naya token aane pe purane K, V dobara calculate na karne padein. Sirf inference mein.' },
        ],
        edges: [{ a: 'in', b: 'mha' }, { a: 'mha', b: 'an1' }, { a: 'an1', b: 'ffn' }, { a: 'ffn', b: 'an2' }, { a: 'an2', b: 'out' }, { a: 'mha', b: 'kv', dashed: true }],
        scenarios: [
          { name: 'Happy path', steps: [
            { title: 'Vectors andar aaye', text: '3 tokens, har ek 4 numbers ka vector.', go: 'in>mha', msg: 'X = [[2,0,1,0],[1,0,2,0],[0,2,0,1]]' },
            { title: 'Masked multi-head attention', text: 'Do heads alag pattern dekhte hain; mask future ko chhupata hai. Concat + Wo.', go: 'mha>an1', after: { mha: { state: 'ok' } }, msg: 'video, head 1: [0.8066, 0.0967, 0.0967]\nvideo, head 2: [0.1978, 0.4011, 0.4011]' },
            { title: 'Residual + LayerNorm', text: 'x + attention, phir har row normalize.', go: 'an1>ffn', after: { an1: { state: 'ok' } } },
            { title: 'FFN', text: 'Har token akele process: 4 → 8 → ReLU → 4.', go: 'ffn>an2', after: { ffn: { state: 'ok' } } },
            { title: 'Phir Add & Norm, aage', text: 'Output shape wahi 3×4. Agla block isko input ki tarah lega.', go: 'an2>out', after: { an2: { state: 'ok' }, out: { state: 'ok' } } },
          ]},
          { name: 'Mask bhool gaye', intro: 'Training ke time kisi ne causal mask hata diya.', steps: [
            { title: 'Pura sentence andar', text: 'Training sentence: "xyz pe video dekho". Har position ko agla token predict karna hai.', go: 'in>mha', msg: 'targets: xyz→pe, pe→video, video→dekho' },
            { title: 'Future dikh gaya', text: '"pe" wali position "video" ko dekh sakti hai, jo uska answer hai. Attention seedha answer copy karna seekh leta hai.', go: 'bad:mha>an1', set: { mha: { state: 'warn', sub: 'future visible!' } } },
            { title: 'Training loss shaandaar', text: 'Loss lagbhag 0. Lagta hai model genius hai.', go: 'an1>ffn>an2>out', after: { out: { state: 'warn', sub: 'loss ≈ 0 (fake)' } } },
            { title: 'Generation mein fail', text: 'Asli use mein future token hota hi nahi (wahi to banana hai). Jo pattern seekha tha ("aage wala copy karo") kaam nahi karta: bakwaas output. Fix: score matrix ke upper triangle pe −∞.', set: { out: { state: 'down', sub: 'garbage output' } }, focus: ['mha'] },
          ]},
          { name: 'Residual + Norm hata do', intro: 'Socho 96 blocks stack kiye, lekin Add & Norm nikaal diya.', steps: [
            { title: 'Pehle block tak theek', text: 'Ek block mein farak kam dikhta hai.', go: 'in>mha>an1', set: { an1: { state: 'dim', sub: 'skip hata diya' }, an2: { state: 'dim', sub: 'skip hata diya' } } },
            { title: 'Numbers bhatakne lage', text: 'Har layer scale badalti hai. Kuch layers baad values bahut badi; softmax ek token pe 100% chipak jaata hai.', go: 'bad:an1>ffn>an2', after: { ffn: { state: 'hot', sub: 'values bahut badi' } } },
            { title: 'Gradient gayab', text: 'Training mein "kya sudhaarna hai" wala signal 96 layers peeche jaate jaate lagbhag 0. Pehli layers seekhti hi nahi.', go: 'lost:an2>out', after: { out: { state: 'down', sub: 'training diverge' } } },
            { title: 'Fix', text: 'Residual shortcut (x + sublayer) gradient ka seedha raasta deta hai; LayerNorm har token ka scale wapas mean 0, std 1 pe laata hai.', set: { an1: { state: 'ok', sub: 'x + MHA(x)' }, an2: { state: 'ok', sub: 'h + FFN(h)' } }, focus: ['an1', 'an2'] },
          ]},
          { name: 'Generation + KV cache', intro: '"xyz pe video" ke baad model ne "dekho" generate kiya. Ab agla token chahiye.', steps: [
            { title: 'Sirf naya token andar', text: 'Purane 3 tokens dobara process nahi hote. Sirf "dekho" (position 3) ka vector aata hai.', go: 'in>mha', set: { in: { sub: 'sirf "dekho", 1×4' } }, msg: 'x_new = [0, 1, 1, 2]' },
            { title: 'Purane K, V cache se', text: 'Causal mask ki wajah se purane tokens ke K, V kabhi nahi badalte. Cache se utha lo, naye token ka k, v jod do.', go: ['mha>kv', 'res:kv>mha'], after: { kv: { state: 'hit', sub: '3 → 4 rows' } }, msg: 'K = [cached 3 rows] + [3,2,2,1]\nV = [cached 3 rows] + [2,1,1,1]' },
            { title: 'Sirf ek row ka attention', text: 'Naye token ka q sab 4 keys se compare hota hai: sirf 4 comparisons. Bina cache poori 4×4 table dobara banti. Isse O(n) vs O(n²) kehte hain: n tokens pe kaam n ke saath badhe, ya n×n ke saath.', go: 'mha>an1>ffn>an2>out', after: { out: { state: 'ok', sub: 'next token logits' } } },
          ]},
        ],
      },
      { type: 'h2', text: 'Encoder, decoder aur cross-attention' },
      { type: 'p', html: `2017 ka original model translation ke liye bana tha (English → German). Usme do stacks the. Maan lo xyz.com apne Hinglish captions ko English mein translate karna chahta hai: "xyz pe video" → "video on xyz".` },
      { type: 'callout', tone: 'term', title: 'Naye words: encoder aur decoder', html: `<strong>Ye kya hai:</strong> <strong>encoder</strong> = blocks ka wo stack jo poora input ek saath padh ke har word ka "samjha hua" vector banata hai. <strong>Decoder</strong> = wo stack jo output ek ek token karke <em>likhta</em> hai.<br><strong>Kyun chahiye:</strong> translation mein do alag kaam hain: Hinglish sentence ko samajhna (encoder), aur English sentence likhna (decoder).<br><strong>Iske bina:</strong> ek hi stack ko dono kaam karne padte. (Aaj ke GPT jaise models yahi karte hain: sirf decoder, aur source text prompt mein hi daal dete hain.)<br><strong>Do special tokens:</strong> <code>&lt;bos&gt;</code> = "beginning of sequence", decoder ka pehla input. <code>&lt;eos&gt;</code> = "end of sequence": jab ye bane, likhna band.` },
      { type: 'table', head: ['Block', 'Andar kya hai', 'Mask?', 'Kaun use karta hai'], rows: [
        ['Encoder block', 'Self-attention → Add & Norm → FFN → Add & Norm', 'Nahi: har token poora sentence dekhta hai (dono taraf)', 'BERT (encoder-only), original Transformer ka left half, T5 ka encoder'],
        ['Decoder block (original)', 'Masked self-attention → Add & Norm → <strong>Cross-attention</strong> → Add & Norm → FFN → Add & Norm', 'Haan, self-attention mein causal', 'Original Transformer ka right half, T5 ka decoder'],
        ['Decoder-only block (GPT)', 'Masked self-attention → Add & Norm → FFN → Add & Norm (cross-attention nahi, encoder hi nahi)', 'Haan, causal', 'GPT, Llama, Claude jaise chat LLMs'],
      ]},
      { type: 'callout', tone: 'term', title: 'Naya word: Cross-attention', html: `<strong>Ye kya hai:</strong> attention jismein <strong>Q decoder se aata hai</strong>, lekin <strong>K aur V encoder ke output se</strong>. Decoder ka har token poochhta hai: "source sentence ke kis word pe dhyaan doon?". Formula wahi <code>softmax(Q·Kᵀ/√d_k)·V</code>, bas Q aur K/V alag jagah se. (Self-attention mein teeno same sequence se aate hain.)<br><strong>Kyun chahiye:</strong> translation mein har naya English word source ke kisi Hinglish word se juda hota hai. Decoder ko source "dekhne" ka raasta chahiye.<br><strong>Iske bina:</strong> decoder ko source ka pata hi nahi chalta. Wo bas apne pichhle words dekh ke andaaza lagata.<br><strong>Example (shared numbers):</strong> encoder ke K rows: xyz <code>[3, 2, 1, 0]</code>, pe <code>[3, 1, 2, 0]</code>, video <code>[1, 1, 2, 2]</code>. Decoder ka q (maan lo) <code>[1, 1, 0, 0]</code>. Scores = <code>[5, 4, 2]</code>, ÷ √4 = <code>[2.5, 2, 1]</code>, softmax = <code>[0.5465, 0.3315, 0.1220]</code>. Decoder ne 55% dhyaan "xyz" pe diya, aur output = weights · encoder ka V = <code>[1.55, 0.24, 2.63, 0.24]</code>.` },
      { type: 'p', html: `Translation ka flow: encoder ek baar poora Hinglish sentence padhta hai (bina mask, kyunki source poora available hai). Decoder English ek ek token banata hai: apne banaye hue tokens pe masked self-attention, phir cross-attention se encoder ke output mein dekhta hai. Jab decoder "on" ke baad agla word bana raha hai, uska cross-attention "xyz" pe zyada jaana chahiye.` },
      { type: 'image', src: 'assets/img/ai-multihead/decoder-block.png', maxWidth: 320, alt: 'Original Transformer ka ek decoder block: neeche Masked Multi-Headed Self-Attention, beech mein Multi-Headed Cross-Attention jismein K aur V bayein taraf se Encoder ke states se aate hain aur Q neeche wale box se, upar Feed-Forward Network', caption: 'Encoder-decoder model ka ek decoder block. Dhyaan do: cross-attention mein K aur V "Encoder\'s States" se aate hain, Q decoder ke apne neeche wale box se. (Is picture mein Add & Norm boxes chhupaye gaye hain.)', credit: { text: 'dvgodoy, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Transformer,_one_decoder_block.png', license: 'CC BY 4.0' } },
      { type: 'flow', height: 300, title: 'Encoder-decoder: "xyz pe video" → "video on xyz"',
        nodes: [
          { id: 'src', label: 'Source', sub: 'xyz pe video', x: 90, y: 75, w: 140, kind: 'client', info: 'Ye kya hai: translate hone wala Hinglish sentence. Tokens + embeddings + positional encoding ban ke encoder mein jaata hai.' },
          { id: 'enc', label: 'Encoder ×N', sub: 'no mask', x: 290, y: 75, w: 150, kind: 'server', info: 'Ye kya hai: N encoder blocks: self-attention (bina mask) + FFN. Output: har source token ka context wala vector. Kyun: poora source ek baar padh ke samajhna. Ek hi baar chalta hai, chahe output kitna bhi lamba ho.' },
          { id: 'gen', label: 'Generated', sub: '<bos> video on', x: 90, y: 225, w: 140, kind: 'client', info: 'Ye kya hai: decoder ab tak jo English tokens bana chuka hai. &lt;bos&gt; ek special "start" token hai jo har output ki shuruaat mein lagta hai.' },
          { id: 'self', label: 'Masked self', sub: 'decoder tokens', x: 290, y: 225, w: 150, kind: 'server', info: 'Ye kya hai: decoder ki masked self-attention. Generated tokens sirf apne pehle wale tokens dekhte hain, kyunki aage wale abhi bane hi nahi.' },
          { id: 'cross', label: 'Cross-attn', sub: 'Q dec, K/V enc', x: 490, y: 150, w: 150, kind: 'net', info: 'Ye kya hai: cross-attention. Q decoder ke vector se, K aur V encoder ke output se. Kyun: decoder yahan decide karta hai ki source ke kis word ko is waqt dekhna hai.' },
          { id: 'head', label: 'FFN + softmax', sub: 'next token', x: 630, y: 255, w: 150, kind: 'data', info: 'Ye kya hai: FFN, Add & Norm, phir (aakhri block ke baad) linear + softmax over English vocabulary. Sabse probable token = agla word.' },
        ],
        edges: [{ a: 'src', b: 'enc' }, { a: 'gen', b: 'self' }, { a: 'enc', b: 'cross' }, { a: 'self', b: 'cross' }, { a: 'cross', b: 'head' }],
        scenarios: [
          { name: 'Ek translation step', steps: [
            { title: 'Encoder ek baar chalta hai', text: 'Poora source sentence, bina mask. Output vectors save.', go: 'src>enc', after: { enc: { state: 'ok', sub: '3 vectors ready' } } },
            { title: 'Decoder apne tokens dekhta hai', text: 'Ab tak bana: "&lt;bos&gt; video on". Masked self-attention.', go: 'gen>self' },
            { title: 'Cross-attention', text: 'Decoder ka Q, encoder ke K/V se milta hai. "on" ke baad sabse zyada dhyaan source ke "xyz" pe.', go: ['self>cross', 'enc>cross'], parallel: true, after: { cross: { state: 'hit', sub: 'focus: "xyz"' } } },
            { title: 'Agla token', text: 'Softmax ke baad sabse probable: "xyz". Isko Generated mein jodo aur repeat, jab tak &lt;eos&gt; na aaye.', go: 'cross>head', after: { head: { state: 'ok', sub: '"xyz" (next)' } } },
          ]},
          { name: 'Source kat gaya', intro: 'Source bahut lamba tha, encoder ki max length ke baad wala hissa kaat diya gaya.', steps: [
            { title: 'Aadha source andar', text: 'Sirf "xyz pe" bacha; "video" kat gaya.', go: 'src>enc', set: { src: { state: 'warn', sub: 'truncated!' } }, after: { enc: { state: 'warn', sub: '2 vectors' } } },
            { title: 'Cross-attention ke paas info hi nahi', text: 'Decoder ko "video" ka K/V mil hi nahi sakta. Attention sirf maujood cheezon mein se chun sakta hai.', go: ['gen>self>cross', 'enc>cross'], parallel: true, after: { cross: { state: 'miss', sub: 'video missing' } } },
            { title: 'Galat translation', text: 'Model kuch to likhega (softmax hamesha koi token deta hai), lekin galat ya adhoora. Lesson: attention jaadu nahi, jo context mein nahi wo dikhega nahi.', go: 'bad:cross>head', after: { head: { state: 'down', sub: 'galat output' } } },
          ]},
        ],
      },
      { type: 'h2', text: 'KV cache: generation ko fast banana' },
      { type: 'p', html: `xyz Assistant reply likh raha hai, ek token ek baar. Token #1000 banane ke liye attention ko pichhle 999 tokens ke K aur V chahiye. Seedha tareeka: har naye token pe poora sequence dobara model mein daalo. Matlab token 1 ke liye 1 row ka K/V, token 2 ke liye 2, ..., token 1000 ke liye 1000. Total <code>1 + 2 + ... + 1000 = 500,500</code> K/V rows (har layer mein!), jabki naye rows sirf 1000 the.` },
      { type: 'p', html: `Observation: causal mask ki wajah se purane token ka K aur V <strong>kabhi nahi badalta</strong> (wo future tokens ko dekhta hi nahi). To unhe ek baar banao aur <strong>cache</strong> kar lo. Har step pe sirf naye token ka q, k, v banao, k/v ko cache mein jodo, aur naye q se poore cache pe attention. E2E lesson mein ye numbers se dikhega: "dekho" add hone ke baad pehle 3 tokens ke rows bit-for-bit wahi rehte hain.` },
      { type: 'callout', tone: 'term', title: 'Naya word: KV cache', html: `<strong>Ye kya hai:</strong> har layer ke, har purane token ke Key aur Value vectors ki ek copy, GPU memory mein rakhi hui. Jaise video app pehle dekhe hue hisse ko phone pe rakh leti hai, taaki peeche jaane pe dobara download na karna pade.<br><strong>Kyun chahiye:</strong> har naye token pe purane tokens ke K, V dobara na banane padein. Sirf naye token ka kaam ho.<br><strong>Iske bina:</strong> 1000 token ke jawab mein 500,500 K/V rows banti, sirf 1000 ki jagah. Jawab bahut dheema aur mehenga.<br><strong>Kab:</strong> sirf <strong>inference</strong> (yaani trained model ko use karna, jawab generate karna) mein. Training mein nahi.<br><strong>Q kyun nahi:</strong> purane tokens ke query ki dobara zaroorat nahi padti. Sawaal sirf naya token poochhta hai.` },
      { type: 'p', html: `Keemat: memory. Pehle chhote words: <strong>head_dim</strong> = ek head ka size (yahi d_k). <strong>fp16</strong> = har number 16 bits = 2 bytes mein. <strong>Batch</strong> = kitne users ki requests ek saath GPU pe. <strong>MiB / GiB</strong> = 2<sup>20</sup> / 2<sup>30</sup> bytes (lagbhag 10 lakh / 100 crore bytes). Formula: <code>KV bytes = 2 (K aur V) × layers × KV heads × head_dim × bytes per number × tokens × batch</code>. Llama 2 7B (32 layers, 32 KV heads, head_dim 128, fp16 = 2 bytes): ek token = 2·32·32·128·2 = <strong>524,288 bytes = 0.5 MiB</strong>. 4096 tokens ka context = <strong>2 GiB</strong>, sirf ek user ke liye.` },
      { type: 'callout', tone: 'term', title: 'Naye words: MQA aur GQA', html: `<strong>Ye kya hai:</strong> KV cache chhota karne ke do tareeke. <strong>Multi-Query Attention (MQA)</strong>, Shazeer 2019: saare query heads ek hi K/V head share karte hain. <strong>Grouped-Query Attention (GQA)</strong>, Ainslie et al. 2023: beech ka raasta, query heads ke chhote groups ek K/V head share karte hain.<br><strong>Kyun chahiye:</strong> cache ka size "KV heads" ki ginti se badhta hai. KV heads kam = cache chhota = ek GPU pe zyada users.<br><strong>Iske bina:</strong> lambe context aur bahut users pe GPU memory jaldi khatam.<br><strong>Example:</strong> Llama 3 8B mein 32 query heads, 8 KV heads: har 4 query heads ka ek K/V. Cache 4 guna chhota: 512 KiB ki jagah 128 KiB per token. MQA mein quality thodi gir sakti hai; GQA quality lagbhag bachata hai.` },
      { type: 'custom', render(el) {
        const P = { l2: [32, 32, 128, 4096, 'Llama 2 7B (MHA)'], l3: [32, 8, 128, 8192, 'Llama 3 8B (GQA)'], toy: [1, 2, 2, 4, 'Hamara toy'] };
        el.innerHTML = `<div class="chips kv-p" role="group" aria-label="Preset"></div>
          <div class="row2" style="margin-top:8px">
            <div><label>Layers</label><input class="kv-l" type="number" min="1" value="32"></div>
            <div><label>KV heads</label><input class="kv-h" type="number" min="1" value="32"></div>
            <div><label>head_dim</label><input class="kv-d" type="number" min="1" value="128"></div>
            <div><label>Context tokens: <strong class="kv-tv"></strong></label><input class="kv-t" type="range" min="0" max="17" step="1" value="12"></div>
            <div><label>Precision</label><select class="kv-b"><option value="4">fp32 (4 bytes)</option><option value="2" selected>fp16 / bf16 (2 bytes)</option><option value="1">fp8 / int8 (1 byte)</option></select></div>
            <div><label>Batch (users ek saath)</label><input class="kv-n" type="number" min="1" value="1"></div>
          </div>
          <div class="stats"><div class="stat"><span>Per token</span><strong class="kv-pt"></strong></div><div class="stat"><span>Total KV cache</span><strong class="kv-tot"></strong></div><div class="stat"><span>Bina cache: K/V rows banane padte</span><strong class="kv-nc"></strong></div></div>
          <div class="calc-note">Formula: 2 × layers × KV heads × head_dim × bytes × tokens × batch. "Bina cache" = 1 + 2 + ... + tokens (per layer, per head), cache ke saath sirf "tokens" rows.</div>`;
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
      { type: 'p', html: `Try karo: Llama 2 7B preset, 4,096 tokens → 2.00 GiB. Batch 16 karo → 32.00 GiB, jo model ke apne weights (~6.7B params × 2 bytes ≈ 13.5 GB) se bhi zyada hai. Isliye serving systems KV cache ko smartly manage karte hain. Jaise vLLM (ek popular open-source LLM serving software) ka PagedAttention: cache ko chhote fixed size "pages" mein rakhna, taaki khaali jagah barbaad na ho. Aur naye models GQA use karte hain. Llama 3 8B preset, 8,192 tokens → 1.00 GiB, context double hone ke bawajood aadha.` },
      { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"KV cache = prompt caching." Ye related hain lekin alag. KV cache ek hi request ke andar, token by token generation ko fast karta hai. <strong>Prompt caching</strong> (API feature) alag requests ke beech same prefix (jaise lamba system prompt) ka KV cache reuse karta hai. Details <a href="#/ai-context">context lesson</a> mein.` },
      { type: 'callout', tone: 'tip', title: 'Decide', html: `<ul>
        <li><strong>Text samajhna / classify / search embeddings</strong> (poora input pehle se available): encoder-only (BERT jaisa), bina mask, dono taraf context.</li>
        <li><strong>Text generate karna, chat, agents</strong>: decoder-only (GPT, Llama, Claude), causal mask + KV cache. Aaj ke LLMs ka default.</li>
        <li><strong>Input → alag output</strong> (translation, summarization) jahan input fixed hai: encoder-decoder (T5, original Transformer) with cross-attention. Lekin bade decoder-only models bhi ye kaam prompt se kar lete hain.</li>
        <li><strong>Heads</strong>: d_model / h ≈ 64-128 rakho (paper aur Llama dono isi range mein). <strong>Norm</strong>: naya model banao to Pre-LN/RMSNorm. <strong>Serving memory tight</strong>: GQA/MQA wala model chuno, KV cache formula se budget banao.</li>
      </ul>` },
      { type: 'diagram', title: 'Ek decoder block: poori picture', height: 560,
        groups: [
          { label: 'Masked multi-head attention', x: 10, y: 6, w: 700, h: 200 },
          { label: 'Block ka baaki hissa (block ×N), phir LM head', x: 10, y: 222, w: 700, h: 110 },
          { label: 'Generation (inference)', x: 10, y: 348, w: 700, h: 200 },
        ],
        nodes: [
          { id: 'in', label: 'Input X', sub: 'emb + PE, 3×4', x: 90, y: 109, kind: 'client', info: 'Ye kya hai: har token ka vector (embedding + positional encoding). Hamare toy mein 3 tokens × 4 numbers. Block yahin se shuru hota hai.' },
          { id: 'qkv', label: 'Q, K, V', sub: 'X·Wq, X·Wk, X·Wv', x: 280, y: 109, w: 150, kind: 'server', info: 'Ye kya hai: teen matrix multiply. Har token ka sawaal (Q), label (K) aur content (V) banta hai. Shape 3×4 each. Phir columns heads mein baant diye jaate hain.' },
          { id: 'h1', label: 'Head 1', sub: 'cols 0-1, d_k = 2', x: 470, y: 64, kind: 'server', info: 'Ye kya hai: pehla head. Q, K, V ke columns 0-1 leta hai, apna softmax(Q·Kᵀ/√2)·V chalata hai. Hamare numbers mein zyada tar "xyz" ki taraf dekhta hai.' },
          { id: 'h2', label: 'Head 2', sub: 'cols 2-3, d_k = 2', x: 470, y: 154, kind: 'server', info: 'Ye kya hai: doosra head. Columns 2-3 pe wahi calculation, head 1 se bilkul alag aur parallel. Hamare numbers mein zyada tar "video" ki taraf dekhta hai.' },
          { id: 'cat', label: 'Concat + Wo', sub: '2 + 2 → 4, mix', x: 640, y: 109, w: 130, kind: 'net', info: 'Ye kya hai: dono heads ke 2-2 numbers jod ke 4 (concat), phir Wo (4×4) se multiply. Kyun: shape wapas d_model ho, aur dono heads ki info aapas mein mil jaaye.' },
          { id: 'an1', label: 'Add & Norm 1', sub: 'x + MHA(x)', x: 640, y: 284, w: 130, kind: 'net', info: 'Ye kya hai: residual (input x wapas jodo) + LayerNorm (har token ka mean 0, std 1). Kyun: gehre stack mein meaning aur gradient zinda rahein.' },
          { id: 'ffn', label: 'FFN', sub: '4 → 8 → ReLU → 4', x: 460, y: 284, kind: 'server', info: 'Ye kya hai: har token pe alag chhota network: bada karo (4 → 8), ReLU, wapas chhota (8 → 4). Kyun: attention ne jo info ikattha ki, use process karna. Layer ke ~2/3 params yahin.' },
          { id: 'an2', label: 'Add & Norm 2', sub: 'h + FFN(h)', x: 280, y: 284, kind: 'net', info: 'Ye kya hai: doosra residual + LayerNorm. Iska output block ka output hai. Real model mein ye poora block 12-96 baar repeat hota hai.' },
          { id: 'lm', label: 'LM head', sub: 'logits → softmax', x: 90, y: 284, kind: 'data', info: 'Ye kya hai: aakhri block ke baad ek Linear layer (d_model → vocab size) jo har possible token ka score (logit) deta hai, phir softmax se probabilities.' },
          { id: 'samp', label: 'Sampler', sub: 'greedy / sampling', x: 90, y: 420, kind: 'queue', info: 'Ye kya hai: probabilities mein se ek token chunne wala hissa (sabse bada, ya random lottery). Ye model ke bahar ka code hai.' },
          { id: 'newx', label: 'Naya token', sub: 'sirf 1 row', x: 280, y: 420, kind: 'client', info: 'Ye kya hai: abhi chuna gaya token, jo wapas model mein jaata hai. KV cache ki wajah se sirf iska ek row process hota hai: iska q, k, v banta hai, aur k, v cache mein jud jaate hain.' },
          { id: 'kv', label: 'KV cache', sub: 'past K, V', x: 470, y: 420, kind: 'cache', info: 'Ye kya hai: har layer ke purane tokens ke K aur V ki GPU memory mein copy. Naye token ke k, v isme jud jaate hain, aur heads yahin se purane K, V padhte hain. Size = 2 × layers × KV heads × head_dim × bytes × tokens.' },
          { id: 'app', label: 'xyz Assistant', sub: 'token stream', x: 280, y: 510, w: 150, kind: 'client', info: 'Ye kya hai: user ki chat app. Har chuna hua token turant screen pe dikhta hai (streaming), jab tak &lt;eos&gt; ya max_tokens na aaye.' },
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
          { name: 'Split into heads', text: 'X se Q, K, V bane (3×4). Columns 0-1 head 1 ko, 2-3 head 2 ko. Dono heads alag alag aur ek saath attention chalate hain.', go: ['in>qkv>h1', 'qkv>h2'] },
          { name: 'Concat + Wo', text: 'Dono heads ke 3×2 outputs jud ke 3×4 bane, phir Wo se mix. "xyz" ki row: [1.62, 0.15, 0.32, 1.79] → [1.94, 1.94, 0.47, 3.41].', go: ['h1>cat', 'h2>cat', 'cat>an1'] },
          { name: 'Add & Norm + FFN', text: 'Residual + LayerNorm, phir har token ka FFN (4 → 8 → 4), phir dobara residual + LayerNorm. Block ×N ke baad LM head.', go: ['cat>an1>ffn>an2>lm'] },
          { name: 'KV cache while generating', text: 'Sampler ne token chuna, app ko stream kiya, aur wahi token wapas andar. Sirf uska q, k, v banta hai; k, v cache mein judte hain; heads purane K, V cache se padhte hain.', go: ['lm>samp>app', 'samp>newx>qkv', 'newx>kv>h2'] },
        ],
      },
      { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
        <li>Ek head = ek softmax = 100% ka ek hi batwara. Multi-head = vector ko h hisson mein baanto (d_k = d_model ÷ h), har head alag rishta dekhe.</li>
        <li>Heads ke outputs concat karo, phir Wo se mix. Params lagbhag 4·d_model², heads kitne bhi hon.</li>
        <li>Residual (x + sublayer) meaning aur gradient ko bachata hai. LayerNorm har token ko mean 0, std 1 pe rakhta hai. Aaj ke models Pre-LN / RMSNorm use karte hain.</li>
        <li>FFN har token pe alag chalta hai (4 guna bada, ReLU/GELU/SwiGLU, wapas chhota). Layer ke ~2/3 params yahin.</li>
        <li>Causal mask = future ke scores −∞. Isse decoder training mein cheating nahi karta, aur purane tokens ke K, V kabhi nahi badalte.</li>
        <li>Encoder = poora input dono taraf dekhe (BERT). Decoder = ek ek token likhe (GPT). Cross-attention = Q decoder se, K/V encoder se.</li>
        <li>KV cache = purane K, V ki copy, sirf generation mein. Memory = 2 × layers × KV heads × head_dim × bytes × tokens. GQA/MQA isse chhota karte hain.</li>
      </ul>` },
      { type: 'tradeoffs',
        gains: ['Multi-head: kai rishte ek saath, bina extra params ke', 'Residual + LayerNorm: 100 layers tak gehre models train ho paate hain', 'FFN: har token ko apni info process karne ki jagah (aur model ka "gyaan")', 'Causal mask: poora sentence ek pass mein train, bina cheating', 'KV cache: har naya token sirf O(n) kaam'],
        costs: ['Heads zyada = har head chhota; kuch heads redundant', 'Attention ka kaam sequence length ke saath O(n²) (training/prefill mein)', 'KV cache GPU memory khata hai, context aur batch ke saath linearly', 'MQA/GQA se cache chhota lekin thodi quality ka risk', 'Post-LN gehre models mein unstable; Pre-LN pe shift karna padta hai'] },
      { type: 'think', questions: [
        { q: 'd_model = 4096 hai. 32 heads ki jagah 4096 heads kar dein (d_k = 1) to kya hoga?', a: 'Har head ka Q·K score bas do single numbers ka product hoga: koi bhi rich "match" capture nahi hoga, softmax lagbhag noise pe chalega. Params same rahenge lekin har head bahut kamzor. Paper mein bhi bahut zyada heads pe quality giri. Isliye d_k ~64-128.' },
        { q: 'Encoder (BERT) mein KV cache kyun nahi lagta?', a: 'Encoder poora input ek saath ek baar process karta hai, bina mask. Wo token by token generate nahi karta, to "purane K/V reuse" wali situation hi nahi aati. Aur bina mask ke naya token aaye to purane tokens ke vectors bhi badal jaate, to cache valid hi nahi rehta.' },
        { q: 'xyz Assistant 1000 users ko ek saath serve kar raha hai, har ek ka 8K context, Llama 3 8B. KV cache kitna? Kya ek 80 GB GPU kaafi hai?', a: '128 KiB × 8192 = 1 GiB per user (fp16). 1000 users = ~1000 GiB. Ek 80 GB GPU mein ~60 users ka cache hi aayega (64 GB ÷ ~1.07 GB) (weights ~16 GB ke baad). Isliye batching limits, PagedAttention, KV cache quantization (fp8), aur kai GPUs.' },
      ]},
      { type: 'quiz', questions: [
        { q: 'd_model = 512, h = 8. Har head ka d_k kya hai?', options: ['512', '64', '4096', '8'], answer: 1, explain: 'd_k = d_model / h = 512 / 8 = 64. Heads vector ko baantte hain, copy nahi karte.' },
        { q: 'Cross-attention mein Q, K, V kahan se aate hain?', options: ['Teeno encoder se', 'Teeno decoder se', 'Q decoder se, K aur V encoder se', 'Q encoder se, K aur V decoder se'], answer: 2, explain: 'Decoder poochhta hai (Q), encoder ke output mein dhoondhta hai (K) aur wahan se info leta hai (V).' },
        { q: 'Causal mask score matrix mein kya karta hai?', options: ['Diagonal ko 0 karta hai', 'Future positions (diagonal ke upar) ko −∞ karta hai, taaki softmax ke baad weight 0 ho', 'Saare scores ko √d_k se divide karta hai', 'Padding tokens hataata hai'], answer: 1, explain: 'e^(−∞) = 0, to future tokens ka weight exactly 0. Isse training mein cheating nahi hoti.' },
        { q: 'LayerNorm([10, 30, 20, 60]) aur LayerNorm([1, 3, 2, 6]) (γ=1, β=0):', options: ['Pehla 10 guna bada', 'Dono same: [−1.0690, 0, −0.5345, 1.6036]', 'Dono [0, 0, 0, 0]', 'Pehla negative'], answer: 1, explain: 'LayerNorm mean hata ke std se divide karta hai, to overall scale cancel ho jaata hai.' },
        { q: 'Llama 2 7B, fp16, 4096 tokens, 1 user: KV cache lagbhag kitna?', options: ['2 MiB', '512 MiB', '2 GiB', '64 GiB'], answer: 2, explain: '2 × 32 × 32 × 128 × 2 bytes = 0.5 MiB per token; × 4096 = 2 GiB.' },
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
