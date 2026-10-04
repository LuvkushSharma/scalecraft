Lesson.register({
  id: 'ai-positional-encoding',
  title: 'Positional encoding',
  minutes: 25,
  summary: `Attention ko order nahi dikhta: "xyz pe video" aur "video pe xyz" uske liye ek jaise. Positional encoding har position ka ek "pata" vector mein jodta hai. Sinusoidal formula haath se (pos 0-3, d = 4), heatmap, learned positions, RoPE ka rotation wala idea aur ALiBi.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `"Riya ne Aman ko video bheja" aur "Aman ne Riya ko video bheja": words same, matlab ulta. Farak sirf <strong>order</strong> ka hai.<br>Transformer saare words ek saath dekhta hai, isliye use apne aap pata hi nahi chalta ki kaunsa word pehle aaya. Jaise kisi ne sentence ke words ek thaile mein daal ke hila diye.<br>Is lesson mein dekhenge ki har word pe uski jagah ka "pata" kaise chipkaate hain: sin/cos wali ghadi, seekhi hui table, ghumaane wala RoPE, aur doori ki penalty wala ALiBi. Sab chhote numbers ke saath, khud chala ke.` },
    { type: 'h2', text: 'Problem: attention order-blind hai' },
    { type: 'p', html: `<a href="#/ai-transformer-overview">Pichhle lesson</a> ka naksha yaad karo: tokens → embeddings → attention layers. RNN ek ek word line mein padhta tha, to order apne aap pata tha. Transformer saare tokens <em>ek saath</em> leta hai. Speed mili, lekin ek cheez kho gayi: <strong>kaun pehle aaya, kaun baad mein</strong>.` },
    { type: 'p', html: `Proof, numbers ke saath. <a href="#/ai-attention">Self-attention lesson</a> ke tiny example ke matrices lo (3 tokens, har vector 4 numbers) aur sirf is demo ke liye maan lo ye <em>bina position</em> wale embeddings hain (attention lesson mein yahi numbers "embedding + PE" maane gaye hain; yahan hum dikhana chahte hain ki PE na ho to kya hota). Ek baar order "xyz pe video", ek baar ulta "video pe xyz". Table mein har token ka <em>attention output</em> hai, yaani attention layer se nikla us token ka naya, context wala vector:` },
    { type: 'table', head: ['Token', 'Output ("xyz pe video")', 'Output ("video pe xyz")'], rows: [
      ['xyz', '[1.31, 1.01, 1.48, 1.01]', '[1.31, 1.01, 1.48, 1.01]'],
      ['pe', '[1.67, 0.18, 2.73, 0.18]', '[1.67, 0.18, 2.73, 0.18]'],
      ['video', '[1.58, 0.42, 2.36, 0.42]', '[1.58, 0.42, 2.36, 0.42]'],
    ], caption: 'Har token ka attention output dono orders mein bilkul same. Sirf rows ki jagah badli. Model ke liye dono sentences ek hi "thaila" hain.' },
    { type: 'callout', tone: 'term', title: 'Naya word: permutation equivariance', html: `<strong>Ye kya hai:</strong> bhaari naam, simple matlab. Tokens ka order <strong>shuffle</strong> karo (permutation), to output bhi bas usi tarah shuffle ho jaata hai; values nahi badalti.<br><strong>Kyun hota hai:</strong> self-attention har jodi (token, token) ka score banata hai, aur "kaun kis position pe hai" uske formula mein kahin hai hi nahi.<br><strong>Iska nuksaan:</strong> model ko order ka koi signal nahi milta. Isliye position alag se deni padti hai.` },
    { type: 'p', html: `Hindi/Hinglish mein to order aur zaroori hai: <code>Riya ne Aman ko video bheja</code> aur <code>Aman ne Riya ko video bheja</code>, same tokens, ulta matlab. xyz Assistant ko pata hona chahiye ki video kisne kisko bheja.` },
    { type: 'callout', tone: 'term', title: 'Naya word: positional encoding', html: `<strong>Ye kya hai:</strong> har position (0, 1, 2, ...) ke liye ek vector, jo us position pe aaye token ke embedding mein <strong>jod diya</strong> jaata hai (ya attention ke andar kisi aur tarah daala jaata hai). Jaise har word pe ek chhota "seat number" chipka dena.<br><strong>Kyun chahiye:</strong> ab "video position 0 pe" aur "video position 2 pe" alag vectors hain, to attention ko order ka signal mil jaata hai.<br><strong>Iske bina:</strong> upar wali table: dono orders ka output same. "Kisne kisko bheja" model nahi bata paayega.` },
    { type: 'h2', text: 'Pehle seedhe ideas, aur kyun fail' },
    { type: 'steps', items: [
      { t: 'Idea 1: position number hi jod do (0, 1, 2, ...)', d: 'Token 500 pe har number mein 500 jud jaayega, jabki embedding ke numbers ~0.1-1 ke hote hain. Position ka signal meaning ko dabaa dega. Aur training mein kabhi 3,000 tak dekha hi nahi to 3,000 ka kya karein?' },
      { t: 'Idea 2: 0 se 1 ke beech normalize (pos / length)', d: '10 tokens ke sentence mein position 5 = 0.5; 100 tokens mein position 50 = 0.5. Same number, alag matlab. "Do tokens ke beech kitni doori" har sentence mein alag dikhegi.' },
      { t: 'Idea 3: ghadi jaisa (sinusoidal)', d: 'Ghadi mein seconds wali sui tez ghoomti hai, minute wali dheemi, ghante wali aur dheemi. Teeno suiyon ki position milake har time unique ban jaata hai, aur har sui ki value hamesha −1 se 1 ke beech. Yahi trick 2017 ke paper ne li.' },
    ]},

    { type: 'h2', text: 'Sinusoidal formula, haath se' },
    { type: 'callout', tone: 'term', title: 'Naya word: sin, cos aur radian', html: `<strong>Ye kya hai:</strong> ek circle pe ghoomta hua point socho (ghadi ki sui ki nok jaisa). Sui jitna ghoomi, use <strong>angle</strong> kehte hain. Us point ki <strong>height</strong> = sin(angle), aur <strong>left-right</strong> doori = cos(angle). Angle ko <strong>radian</strong> mein naapte hain: ek poora chakkar = 2π ≈ 6.28 radian. Example: sin(0) = 0, cos(0) = 1 (sui seedhi right pe); sin(1) ≈ 0.841.<br><strong>Kyun chahiye:</strong> dono hamesha −1 aur 1 ke beech rehte hain (kabhi phat-te nahi), aur har position pe smooth tareeke se badalte hain.<br><strong>Iske bina:</strong> seedha position number jodna padta, jo bada hokar embedding ko dabaa deta (Idea 1 wali problem).<br>Yahan angle = pos ÷ (koi number). Wo "koi number" bada ho to sui dheemi ghoomti hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: power (^) aur dimension pair', html: `<strong>Power:</strong> <code>a^b</code> matlab a ko b baar guna karo: <code>10^2 = 10 × 10 = 100</code>. b ek fraction ho to root jaisa: <code>10000^(2/4) = 10000^0.5 = √10000 = 100</code> (wo number jise khud se guna karo to 10000 mile). Aur <code>10000^0 = 1</code>. Bas itna yaad rakho: power badi = number bada = sui dheemi.<br><strong>Dimension pair:</strong> vector ke numbers ko do-do ki jodi mein baanto: (number 0, number 1) = pair 0, (number 2, number 3) = pair 1. Har pair ek sui hai: pehla number sin, doosra cos.<br><strong>Kyun:</strong> alag pairs alag speed se ghoomte hain, isliye milke har position ka unique pattern banta hai.` },
    { type: 'p', html: `2017 ke "Attention Is All You Need" paper ka formula. <code>pos</code> = token ki position, <code>d</code> = d_model, aur dimensions ko jodon (pairs) mein socho: pair number <code>i</code> = 0, 1, 2, ...` },
    { type: 'code', text: `PE(pos, 2i)   = sin( pos / 10000^(2i/d) )     ← pair i ka pehla number
PE(pos, 2i+1) = cos( pos / 10000^(2i/d) )     ← pair i ka doosra number` },
    { type: 'p', html: `Hamare tiny model mein d = 4, to 2 pairs:` },
    { type: 'list', items: [
      `Pair 0 (i = 0): 10000^(0/4) = 1, to angle = pos / 1 = pos. <strong>Tez sui</strong>: har position pe 1 radian ghoomti hai.`,
      `Pair 1 (i = 1): 10000^(2/4) = 100, to angle = pos / 100. <strong>Dheemi sui</strong>: har position pe sirf 0.01 radian.`,
    ]},
    { type: 'table', head: ['pos', 'sin(pos)', 'cos(pos)', 'sin(pos/100)', 'cos(pos/100)'], rows: [
      ['0', '0.000', '1.000', '0.000', '1.000'],
      ['1', '0.841', '0.540', '0.010', '1.000'],
      ['2', '0.909', '−0.416', '0.020', '1.000'],
      ['3', '0.141', '−0.990', '0.030', '1.000'],
    ], caption: 'PE vectors, d = 4, 3 decimals. Position 0 hamesha [0, 1, 0, 1]. Pehle do columns tezi se badalte hain, aakhri do bahut dheere.' },
    { type: 'p', html: `Ab ek token "video" ka embedding maan lo <code>[0.5, −0.2, 0.1, 0.4]</code> (illustrative). Wahi token do jagah:` },
    { type: 'list', items: [
      `Position 0 pe: [0.5, −0.2, 0.1, 0.4] + [0, 1, 0, 1] = <strong>[0.500, 0.800, 0.100, 1.400]</strong>`,
      `Position 2 pe: [0.5, −0.2, 0.1, 0.4] + [0.909, −0.416, 0.020, 1.000] = <strong>[1.409, −0.616, 0.120, 1.400]</strong>`,
    ]},
    { type: 'p', html: `Same token, alag vectors. Ab attention ko order ka signal mil gaya. Real models mein d bada hota hai (paper mein 512), to 256 pairs, sabse tez sui se leke itni dheemi tak ki ek chakkar lagbhag 60,600 positions mein poora ho (paper ke hisaab se wavelengths 2π se 10000·2π tak geometric progression mein). Neeche heatmap mein khud dekho: rows = positions, columns = dimensions.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>d_model: <strong class="v-d">16</strong></label><input class="i-d" type="range" min="4" max="64" step="2" value="16"></div>
          <div><label>Positions: <strong class="v-p">12</strong></label><input class="i-p" type="range" min="4" max="40" step="1" value="12"></div>
        </div>
        <div class="hm" style="overflow-x:auto;margin-top:12px"></div>
        <div class="calc-note o-cell">Kisi cell pe click karo, uska formula numbers ke saath dikhega.</div>
        <div class="calc-note">Rang: <span style="color:var(--accent)">neela = +1 ki taraf</span>, <span style="color:var(--red)">laal = −1 ki taraf</span>, halka = 0 ke paas.</div>`;
      const q = c => el.querySelector(c);
      const pe = (pos, j, d) => { const i = Math.floor(j / 2), a = pos / Math.pow(10000, 2 * i / d); return { v: j % 2 ? Math.cos(a) : Math.sin(a), i, a }; };
      const show = (pos, j, d) => {
        const r = pe(pos, j, d), fn = j % 2 ? 'cos' : 'sin';
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
            const v = pe(p, j, d).v, c = v >= 0 ? 'var(--accent)' : 'var(--red)';
            h += `<div class="pc" data-p="${p}" data-j="${j}" title="${v.toFixed(3)}" style="height:${cs}px;cursor:pointer;border-radius:2px;background:color-mix(in srgb, ${c} ${Math.round(Math.abs(v) * 85)}%, var(--surface-2))"></div>`;
          }
        }
        q('.hm').innerHTML = h + '</div>';
        q('.hm').querySelectorAll('.pc').forEach(c => c.addEventListener('click', () => show(Number(c.dataset.p), Number(c.dataset.j), d)));
      };
      q('.i-d').addEventListener('input', draw); q('.i-p').addEventListener('input', draw); draw();
    }},
    { type: 'p', html: `Kya dikha? Left ke columns (tez suiyan) har row mein rang badalte hain; right ke columns (dheemi suiyan) poore 40 rows mein bhi lagbhag same rehte hain. Har row ka <em>poora pattern</em> unique hai, jaise ghadi ka har time. d = 4 karke upar wali table se match karo.` },
    { type: 'h2', text: 'Sinusoidal ka chhupa faayda: doori' },
    { type: 'callout', tone: 'term', title: 'Naya word: rotation (ghumana)', html: `<strong>Ye kya hai:</strong> ek 2-number vector [x, y] ko circle pe ek angle se ghumaa dena, lambaai badle bina. Formula: naya = [x·cos a − y·sin a, x·sin a + y·cos a]. Example: [1, 0] ko 90° (≈ 1.571 radian) ghumao to [0, 1] milta hai.<br><strong>Kyun chahiye:</strong> sinusoidal mein "k positions aage jaana" = har pair ko ek fixed angle se ghumana. RoPE (neeche) poora isi pe bana hai.<br><strong>Iske bina:</strong> relative doori ko ek simple, har jagah same rule se nahi likh paate.` },
    { type: 'callout', tone: 'term', title: 'Yaad karo: dot product', html: `<strong>Ye kya hai:</strong> do vectors ke same jagah wale numbers guna karo, sab jodo. <code>[1, 2]·[3, 4] = 1×3 + 2×4 = 11</code>. (<a href="#/ai-transformer-overview">Overview lesson</a> mein interactive.)<br><strong>Kyun yahan:</strong> attention scores dot product se bante hain. To do positions ke PE vectors ka dot product batata hai ki attention ko wo kitni "milti-julti" lagengi.<br><strong>Iske bina:</strong> "paas ki position zyada similar" naapne ka tareeka nahi.` },
    { type: 'p', html: `Model ke liye "video position 7 pe hai" se zyada kaam ki baat aksar ye hoti hai: "video, xyz se 2 token aage hai". Sinusoidal mein ye mufte mein milta hai. Har pair (sin, cos) ek circle pe point hai. k positions aage jaana = us point ko angle <code>k × (us pair ki speed)</code> se <strong>ghumana</strong>. Ghumana ek fixed matrix multiplication hai, jo pos pe depend nahi karta. Paper ne isi wajah se sinusoids chune: model relative position aasani se seekh sake.` },
    { type: 'p', html: `Iska ek side effect: do positions ke PE vectors ka <strong>dot product</strong> (similarity) sirf unki doori k pe depend karta hai, kahan se shuru kiya us pe nahi. d = 4 mein formula hai <code>cos(k) + cos(k/100)</code>:` },
    { type: 'table', head: ['Doori k', 'PE(0)·PE(k)', 'PE(1)·PE(1+k)', 'PE(5)·PE(5+k)'], rows: [
      ['0', '2.000', '2.000', '2.000'],
      ['1', '1.540', '1.540', '1.540'],
      ['2', '0.584', '0.584', '0.584'],
      ['3', '0.010', '0.010', '0.010'],
    ], caption: 'Teeno columns same: similarity sirf doori pe depend karti hai.' },
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
        q('.o-n').innerHTML = `Bars = PE(${p})·PE(${p}+k) ÷ d (taaki alag d compare ho sakein). Raw dot products: ${pick}. Start position p badlo: bars nahi hilte.`;
      };
      q('.dch').querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => { d = Number(b.dataset.d); draw(); }));
      q('.i-p').addEventListener('input', draw); draw();
    }},
    { type: 'p', html: `d = 4 pe bars upar neeche lehraate hain (sirf ek tez sui hai, wo baar baar wapas ghoom aati hai: k = 3 pe 0.01, k = 5 pe phir 1.28). d = 64 pe bahut saari suiyan milke ek saaf trend banati hain: paas ki positions zyada similar (k = 1 pe 30.92), door ki kam (k = 30 pe 17.07). Isliye real models mein bada d chahiye.` },
    { type: 'h2', text: 'Diagram: position kahan judta hai' },
    { type: 'flow', height: 290,
      nodes: [
        { id: 'tok', label: 'Tokens', sub: 'xyz, pe, video', x: 90, y: 145, w: 140, kind: 'client', info: 'Ye kya hai: prompt ke tokens aur unki ginti (position). Tokenizer ke baad ids aur unki positions: xyz = 0, pe = 1, video = 2. Position bas ginti hai, abhi koi vector nahi.' },
        { id: 'emb', label: 'Embedding', sub: '"kya" hai', x: 290, y: 70, w: 150, kind: 'data', info: 'Ye kya hai: token ka "matlab" wala vector. Token id se embedding table ki row. Ye token ka matlab batata hai, lekin position ka koi pata nahi: "video" har jagah same vector.' },
        { id: 'pos', label: 'Position vec', sub: '"kahan" hai', x: 290, y: 230, w: 150, kind: 'cache', info: 'Ye kya hai: token ki "jagah" wala vector. Har position ka vector. Sinusoidal: formula se banta hai, koi training nahi. Learned: ek table jo training mein seekhi jaati hai (GPT-2 mein 1,024 rows). RoPE mein ye vector jodte nahi, Q aur K ko ghumaate hain.' },
        { id: 'add', label: 'X = E + P', sub: 'element-wise', x: 480, y: 128, w: 120, kind: 'server', info: 'Ye kya hai: wo jagah jahan "kya" aur "kahan" milte hain. Dono vectors ka number-by-number jod. Shape wahi rehti hai: n × d_model. Ab har row mein "kya" aur "kahan" dono mile hue hain.' },
        { id: 'att', label: 'Attention', sub: 'order dikhta', x: 640, y: 145, w: 130, kind: 'server', info: 'Ye kya hai: agla step, jahan tokens ek doosre ko dekhte hain. Self-attention ab alag positions pe aaye same token ko alag dekhta hai, aur relative doori ka signal bhi pakad sakta hai.' },
      ],
      edges: [{ a: 'tok', b: 'emb' }, { a: 'tok', b: 'pos' }, { a: 'emb', b: 'add' }, { a: 'pos', b: 'add', id: 'pd' }, { a: 'add', b: 'att' }, { a: 'pos', b: 'att', id: 'pa', hidden: true, dashed: true }],
      scenarios: [
        { name: 'Sinusoidal (happy path)', steps: [
          { title: 'Do cheezein nikalti hain', text: 'Har token se uska id (embedding ke liye) aur uski position (0, 1, 2).', go: ['tok>emb', 'tok>pos'], parallel: true, msg: 'ids: [xyz, pe, video]   positions: [0, 1, 2]' },
          { title: 'Position vectors', text: 'd = 4 ke formula se: pos 0 = [0, 1, 0, 1], pos 1 = [0.841, 0.540, 0.010, 1.000], pos 2 = [0.909, −0.416, 0.020, 1.000].', focus: ['pos'], after: { pos: { state: 'ok', sub: 'sin / cos' } } },
          { title: 'Jodo', text: 'Embedding + position. "video" ka vector ab position 2 ki chhaap ke saath.', go: ['emb>add', 'pos>add'], parallel: true, after: { add: { state: 'ok' } }, msg: 'X[2] = E[video] + PE(2)' },
          { title: 'Attention ko order mila', text: '"xyz pe video" aur "video pe xyz" ab alag inputs hain, to outputs bhi alag.', go: 'add>att', after: { att: { state: 'hit', sub: 'order samjha' } } },
        ]},
        { name: 'Failure: PE nahi', steps: [
          { title: 'Sirf embedding', text: 'Position vector bhool gaye.', set: { pos: { state: 'down', sub: 'missing' } }, go: 'tok>emb>add', msg: 'X = E   (koi position nahi)' },
          { title: 'Order-blind', text: 'Upar wali table yaad karo: dono orders mein har token ka output same. "Riya ne Aman ko" aur "Aman ne Riya ko" model ke liye ek jaisa.', go: 'add>att', after: { att: { state: 'miss', sub: 'order-blind' } } },
        ]},
        { name: 'Failure: learned limit', steps: [
          { title: 'Learned table', text: 'GPT-2 jaisa model: position vectors ek table mein, 1,024 rows (0 se 1,023). Training mein seekhe gaye.', set: { pos: { label: 'Learned table', sub: '1,024 rows' } }, focus: ['pos'] },
          { title: 'Token number 1,025', text: 'Prompt 1,025 tokens ka. Position 1,024 ki row table mein hai hi nahi. Code mein index out of range; isliye model ki max length hard limit hai.', go: 'bad:pos>tok', set: { pos: { state: 'down', sub: 'row 1,024 nahi' } } },
          { title: 'Fix', text: 'Input kaato (truncate) ya aisa scheme lo jo formula/rotation se kisi bhi position ka vector bana sake (sinusoidal, RoPE, ALiBi). Lekin dhyaan: formula se vector ban jaana alag baat hai, training se lambi length pe model achha chalna alag.', set: { pos: { state: 'ok', sub: 'trimmed' } }, go: ['tok>pos', 'pos>add'] },
        ]},
        { name: 'RoPE variant', intro: 'Llama jaise aaj ke kai open models position ko embedding mein jodte nahi. RoPE attention ke andar Q aur K ko ghumaata hai.', steps: [
          { title: 'Embedding mein kuch nahi juda', text: 'X = sirf embedding. Position ka kaam attention ke andar hoga.', hide: ['pd'], show: ['pa'], set: { add: { label: 'X = E', sub: 'no add', state: 'dim' }, pos: { label: 'RoPE angle', sub: 'pos × θ' } }, go: 'tok>emb>add>att' },
          { title: 'Q aur K ghumaao', text: 'Har layer mein, Q aur K banne ke baad, position m wale token ke Q/K vector ko angle m × θ se rotate karo. V ko nahi.', go: 'pos>att', after: { att: { state: 'ok', sub: 'rotated Q, K' } } },
          { title: 'Score mein sirf doori', text: 'Rotated q·k ka value sirf (m − n) pe depend karta hai. Neeche widget mein khud check karo.', focus: ['att'], after: { att: { state: 'hit', sub: 'relative' } } },
        ]},
      ],
    },
    { type: 'h2', text: 'Learned positions: formula ki jagah table' },
    { type: 'p', html: `Doosra raasta: position vectors ko bhi embedding ki tarah ek table bana do (<code>max_positions × d_model</code>) aur training ko seekhne do. BERT (2018) mein 512 positions, GPT-2 (2019) mein 1,024. 2017 ke paper ne dono try kiye the aur results "lagbhag same" mile; unhone sinusoidal isliye chuna ki shayad wo training se lambi lengths pe bhi chal jaaye.` },
    { type: 'callout', tone: 'term', title: 'Naya word: learned position embedding', html: `<strong>Ye kya hai:</strong> ek table, shape <code>max_positions × d_model</code>, bilkul token embedding table jaisi. Position 2 ka token aaya to row 2 utha ke jodo. Rows ke numbers training seekhti hai, koi formula nahi.<br><strong>Kyun chahiye:</strong> simple hai, aur model khud decide karta hai ki position ka kaunsa pattern useful hai.<br><strong>Iske bina (agar formula use karo):</strong> koi problem nahi; paper mein dono ke results lagbhag same the.<br><strong>Dikkat:</strong> table ki rows fixed. Max_positions se aage ka token aaya to uski row hi nahi.` },
    { type: 'callout', tone: 'term', title: 'Naya word: extrapolation (length)', html: `<strong>Ye kya hai:</strong> training mein max 1,024 tokens dekhe, ab use mein 4,000 tokens de diye. Kya model phir bhi theek chalega? Is "training se aage chal paane" ko <strong>length extrapolation</strong> kehte hain.<br><strong>Kyun zaroori:</strong> users lambe documents, lambi chats bhejte hain.<br><strong>Iske bina:</strong> learned table yahan seedha fail (row hi nahi hai). Sinusoidal vector to bana deta hai, lekin practice mein quality aksar gir jaati hai, kyunki model ne un patterns pe kabhi training nahi ki.` },

    { type: 'h2', text: 'RoPE: jodo mat, ghumaao' },
    { type: 'callout', tone: 'term', title: 'Naya word: Q aur K (ek line mein)', html: `<strong>Ye kya hai:</strong> attention mein har token ke vector se do naye vectors bante hain: <strong>Q</strong> (query: "main kya dhoondh raha hoon") aur <strong>K</strong> (key: "mere paas kya hai"). Dono ka dot product = score = kitna match.<br><strong>Kyun yahan:</strong> RoPE inhi do ko ghumaata hai, taaki score mein position aa jaaye.<br><strong>Iske bina:</strong> RoPE samajh nahi aayega. Poori kahani <a href="#/ai-attention">agle lesson</a> mein. Yahan bas itna: score = q · k.` },
    { type: 'callout', tone: 'term', title: 'Naya word: RoPE (Rotary Position Embedding)', html: `<strong>Ye kya hai:</strong> position ko vector mein jodne ki jagah, har layer mein Q aur K ke har pair ko position ke hisaab se <strong>ghumaana</strong>. Position m wala token angle m × θ se ghoomta hai (har pair ki apni speed θ).<br><strong>Kyun chahiye:</strong> do ghumaaye hue vectors ka dot product sirf unke <em>beech ke angle</em> pe depend karta hai, to score mein seedha <strong>relative doori</strong> (m − n) aati hai.<br><strong>Iske bina:</strong> absolute positions jodne padte, jahan doori ka signal indirect hai aur "kya" + "kahan" ek hi vector mein mix ho jaate hain.<br><strong>Example:</strong> LLaMA aur bahut se open LLMs.` },
    { type: 'p', html: `<strong>RoPE</strong> (Rotary Position Embedding, Su et al., 2021, "RoFormer" paper) aaj ke bahut se open LLMs mein hai; Meta ka LLaMA (2023) bhi isi pe hai. Idea: position ko embedding mein <em>jodne</em> ki jagah, attention ke andar har token ke <strong>Q</strong> aur <strong>K</strong> vector ko uski position ke hisaab se <strong>ghumaa do</strong> (rotate). Position m wala token angle m × θ se ghumega.` },
    { type: 'p', html: `Jaadu kyun? Agar q ko angle mθ aur k ko angle nθ se ghumaao, to unke beech ka angle (m − n)θ se badalta hai. Dot product sirf beech ke angle pe depend karta hai. Matlab score mein <strong>sirf relative doori</strong> aati hai, absolute position nahi. Real RoPE mein vector ko 2-2 numbers ke jodon mein todte hain aur har jode ki apni speed θ<sub>i</sub> hoti hai (sinusoidal jaisi hi range). Neeche 2D mein ek jode ke saath khelo: q = [1, 2], k = [2, 1], θ = 0.5 radian.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Query token position m: <strong class="v-m">2</strong></label><input class="i-m" type="range" min="0" max="12" step="1" value="2"></div>
          <div><label>Key token position n: <strong class="v-n">0</strong></label><input class="i-n" type="range" min="0" max="12" step="1" value="0"></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button type="button" class="btn small ghost b-sh">Dono ko +3 shift karo</button><button type="button" class="btn small ghost b-rs">Reset (2, 0)</button></div>
        <svg class="sv" viewBox="-130 -130 260 260" style="width:100%;max-width:260px;display:block;margin:10px auto"></svg>
        <div class="stats">
          <div class="stat"><span>m − n</span><strong class="o-d"></strong></div>
          <div class="stat"><span>Rotated q · k (score)</span><strong class="o-s"></strong></div>
          <div class="stat"><span>Bina rotation q · k</span><strong>4.000</strong></div>
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
        q('.o-n').innerHTML = `q ghuma ${m} × 0.5 = ${(m * th).toFixed(1)} rad → ${f(qr)}; k ghuma ${n} × 0.5 = ${(n * th).toFixed(1)} rad → ${f(kr)}. Score = ${s.toFixed(3)}.`;
      };
      q('.b-sh').addEventListener('click', () => { q('.i-m').value = Math.min(12, Number(q('.i-m').value) + 3); q('.i-n').value = Math.min(12, Number(q('.i-n').value) + 3); draw(); });
      q('.b-rs').addEventListener('click', () => { q('.i-m').value = 2; q('.i-n').value = 0; draw(); });
      q('.i-m').addEventListener('input', draw); q('.i-n').addEventListener('input', draw); draw();
    }},
    { type: 'p', html: `Try karo: (m, n) = (2, 0) pe score −0.363. "Dono ko +3 shift" dabao: (5, 3), phir (8, 6): score wahi −0.363, kyunki doori 2 hi hai. (3, 2) pe 2.072, (0, 2) pe 4.686: doori badli, score badla. Ye RoPE ka core promise hai. Long-context models aksar RoPE ke θ ko "stretch" karke (jaise 2023 ki position interpolation technique) training se lambe context tak le jaate hain, thodi extra training ke saath.` },

    { type: 'h2', text: 'ALiBi: door wale ko penalty' },
    { type: 'callout', tone: 'term', title: 'Naya word: ALiBi (Attention with Linear Biases)', html: `<strong>Ye kya hai:</strong> attention ke score mein se <code>slope × doori</code> ghata do. Jo key token query se jitna door, uska score utna kam. <strong>Slope</strong> = ek fixed number jo batata hai penalty kitni tez badhe. <strong>Bias</strong> = score mein joda (yahan ghataya) gaya extra number.<br><strong>Kyun chahiye:</strong> koi position vector nahi, koi table nahi, koi training wala hissa nahi. Doori kitni bhi ho, penalty formula se ban jaati hai, isliye training se lambe input pe bhi achha chalta hai.<br><strong>Iske bina:</strong> learned table ki tarah max length pe atak jaate, ya RoPE ki tarah extra scaling tricks chahiye hoti.<br><strong>Worked example:</strong> query position 3, slope 0.5, chaaron keys (0, 1, 2, 3) ka raw score 2. Penalty = [−1.5, −1, −0.5, 0]. Naye scores = [0.5, 1, 1.5, 2]. Softmax = [0.1015, 0.1674, 0.2760, 0.4551]. Bina ALiBi ke chaaron ko 0.25 milta; ab paas wale ko zyada.` },
    { type: 'p', html: `<strong>ALiBi</strong> (Attention with Linear Biases, Press et al., 2021): koi position vector nahi, koi rotation nahi. Bas attention score mein se <code>slope × doori</code> ghata do: jo token jitna door, utna penalty. Har head (attention ka ek alag set, <a href="#/ai-multihead">multi-head lesson</a> mein) ka slope alag (8 heads mein 1/2, 1/4, ..., 1/256). Paper mein 1,024 tokens pe train hua 1.3B model 2,048 pe bhi achha chala. BLOOM model ise use karta hai.` },
    { type: 'callout', tone: 'tip', title: 'Aur bhi tareeke hain', html: `T5 (2019) "relative position bias" use karta hai: doori ke buckets ke liye seekhe hue numbers jo attention score mein jodte hain. Idea ALiBi jaisa, lekin numbers learned. Ye sab ek hi sawaal ke alag jawab hain: "attention ko order kaise batayein?"` },
    { type: 'h2', text: 'Chaaron tareeke, khud chala ke' },
    { type: 'p', html: `Neeche ek hi jagah chaaron tareeke. Tareeka chuno aur position badlo: har tareeke ke <em>andar</em> kya ban raha hai, numbers ke saath dikhega. Token "video" ka embedding wahi <code>[0.5, −0.2, 0.1, 0.4]</code> hai. Learned table mein sirf 8 rows hain (max_positions = 8, numbers seeded random, har baar same). RoPE ek query <code>q = [1, 0, 1, 0]</code> ko ghumaata hai. ALiBi mein slope 0.5 aur har key ka raw score 2.` },
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
        'Faayda: koi training nahi, kisi bhi position ka vector formula se. Nuksaan: lambi length pe quality ki guarantee nahi.',
        'Faayda: simple, model khud pattern seekhta hai. Nuksaan: max_positions ke aage row hi nahi, hard limit.',
        'Faayda: score mein seedhi relative doori, koi extra parameter nahi. Nuksaan: training se lambe context ke liye scaling + extra training chahiye.',
        'Faayda: koi vector nahi, lambi length pe achha. Nuksaan: door ke tokens hamesha kamzor, penalty fixed formula ki.',
      ];
      const draw = () => {
        const p = Number(q('.i-p').value);
        q('.v-p').textContent = p;
        q('.mch').querySelectorAll('.chip').forEach(b => b.classList.toggle('on', Number(b.dataset.i) === mode));
        let h = '';
        if (mode === 0) {
          const pe = [Math.sin(p), Math.cos(p), Math.sin(p / 100), Math.cos(p / 100)];
          h = `<div class="calc-note">PE(${p}) = [sin(${p}), cos(${p}), sin(${p}/100), cos(${p}/100)] = <strong>${vec(pe)}</strong><br>X = E + PE = ${vec(E)} + ${vec(pe)} = <strong>${vec(E.map((v, i) => v + pe[i]))}</strong></div>`;
        } else if (mode === 1) {
          h = `<div style="display:grid;grid-template-columns:36px repeat(4,58px);gap:3px;width:max-content">` + TB.map((r, i) => cell('row ' + i, i === p) + r.map(v => cell(f(v), i === p)).join('')).join('') + '</div>';
          h += p < 8 ? `<div class="calc-note">Row ${p} utha li: X = E + row ${p} = ${vec(E)} + ${vec(TB[p])} = <strong>${vec(E.map((v, i) => v + TB[p][i]))}</strong></div>`
            : `<div class="calc-note"><strong style="color:var(--red)">Error:</strong> position ${p} ki row table mein hai hi nahi (sirf 0 se 7). Model ye input le hi nahi sakta.</div>`;
        } else if (mode === 2) {
          const a0 = p * 1, a1 = p / 100, rq = [Math.cos(a0), Math.sin(a0), Math.cos(a1), Math.sin(a1)];
          h = `<div class="calc-note">Embedding mein kuch nahi juda: X = E = ${vec(E)}.<br>q = [1, 0, 1, 0]. Pair 0 ka angle = ${p} × 1 = ${a0.toFixed(2)} rad, pair 1 ka = ${p} × 0.01 = ${a1.toFixed(2)} rad.<br>Ghumaaya hua q = [cos ${a0.toFixed(2)}, sin ${a0.toFixed(2)}, cos ${a1.toFixed(2)}, sin ${a1.toFixed(2)}] = <strong>${vec(rq)}</strong></div>`;
        } else {
          const P = Math.min(p, 7), ks = Array.from({ length: P + 1 }, (_, j) => j);
          const bias = ks.map(j => -0.5 * (P - j)), sc = bias.map(b => 2 + b);
          const m = Math.max(...sc), e = sc.map(v => Math.exp(v - m)), z = e.reduce((a, b) => a + b), w = e.map(v => v / z);
          h = `<div class="calc-note">Query position ${P}${p > 7 ? ' (is demo mein max 7)' : ''}. Keys 0 se ${P}.<br>Penalty = −0.5 × doori = [${bias.map(f).join(', ')}]<br>Score = 2 + penalty = [${sc.map(f).join(', ')}]</div>` +
            ks.map(j => `<div style="display:flex;align-items:center;gap:8px;margin:3px 0"><span style="width:52px;font:12px var(--f-mono);color:var(--ink-3)">key ${j}</span><div style="flex:1;max-width:240px;height:12px;background:var(--surface-2);border-radius:4px"><div style="width:${(w[j] * 100).toFixed(1)}%;height:100%;background:var(--accent);border-radius:4px"></div></div><span style="font:12px var(--f-mono)">${w[j].toFixed(4)}</span></div>`).join('') +
            `<div class="calc-note">Bina ALiBi har key ko ${(1 / (P + 1)).toFixed(4)} milta.</div>`;
        }
        q('.out').innerHTML = h;
        q('.o-pc').textContent = PC[mode];
      };
      q('.mch').querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => { mode = Number(b.dataset.i); draw(); }));
      q('.i-p').addEventListener('input', draw); draw();
    }},
    { type: 'p', html: `Check karo: Sinusoidal p = 2 pe PE = [0.909, −0.416, 0.020, 1.000], jo upar wali table se match karta hai. Learned p = 2 pe X = [1.010, −0.110, 0.470, 0.670]; p = 8 pe error. RoPE p = 0 pe q bilkul nahi ghoomta (angle 0). ALiBi p = 3 pe weights 0.1015, 0.1674, 0.2760, 0.4551, worked example jaisa.` },
    { type: 'h2', text: 'Saare tareeke ek table mein' },
    { type: 'table', head: ['Tareeka', 'Position kahan jaati hai', 'Training se lambi length?', 'Kahan dikhta hai'], rows: [
      ['Sinusoidal (2017)', 'Embedding mein jod (fixed formula)', 'Vector ban jaata hai, quality ki guarantee nahi', 'Original Transformer'],
      ['Learned absolute', 'Embedding mein jod (seekhi hui table)', 'Nahi: table ke aage row hi nahi', 'BERT, GPT-2'],
      ['Relative bias', 'Attention score mein (doori ke learned numbers)', 'Kuch had tak', 'T5'],
      ['RoPE (2021)', 'Q, K ko rotate (har layer mein)', 'Thoda; scaling tricks + extra training se kaafi aage', 'LLaMA aur bahut se open LLMs'],
      ['ALiBi (2021)', 'Attention score mein − slope × doori', 'Haan, paper ka main point yahi', 'BLOOM'],
    ]},
    { type: 'callout', tone: 'tip', title: 'Decide', html: `• Khud ka chhota Transformer seekhne ke liye bana rahe ho → <strong>sinusoidal</strong> ya <strong>learned</strong>, dono simple; fixed max length theek hai.<br>• Aaj ka decoder LLM bana/fine-tune kar rahe ho → jo base model use karta hai wahi rakho (zyada tar <strong>RoPE</strong>). Scheme badalna = model ko dobara train karna.<br>• Context ko training se lamba karna hai → RoPE scaling (position interpolation jaisi) + thodi long-context training, ya ALiBi jaisi scheme jo shuru se extrapolation ke liye bani.<br>App developer ho (API use karte ho)? Ye choice tumhari nahi; bas model ka <strong>context window</strong> limit dhyaan rakho.` },
    { type: 'callout', tone: 'mistake', title: '"Position vector alag column mein judta hai"', html: `Sinusoidal/learned mein position ek <strong>alag column nahi</strong> hai: wo same d_model numbers mein <em>jod</em> diya jaata hai (E + P). Vector lamba nahi hota. Shuru mein ajeeb lagta hai ki "kya" aur "kahan" ek hi numbers mein mix ho gaye, lekin bade d mein model dono signals alag pehchaan lena seekh leta hai.` },
    { type: 'callout', tone: 'mistake', title: '"RoPE V ko bhi ghumaata hai"', html: `Nahi. RoPE sirf <strong>Q aur K</strong> ko rotate karta hai, kyunki position ka asar sirf "kaun kisko kitna dekhe" (score) pe chahiye. V (jo information aage jaati hai) waisa hi rehta hai.` },

    { type: 'h2', text: 'Poori picture' },
    { type: 'p', html: `Position ka signal do jagah ja sakta hai: <strong>input pe</strong> (embedding mein jod do: sinusoidal, learned) ya <strong>attention ke andar</strong> (Q, K ghumao: RoPE; ya score mein penalty: ALiBi). Buttons se har tareeke ka raasta dekho.` },
    { type: 'diagram', title: 'Positional encoding: poori picture', height: 600,
      nodes: [
        { id: 'tok', label: 'Tokens', sub: 'xyz=0, pe=1, video=2', x: 90, y: 170, w: 150, kind: 'client', info: 'Ye kya hai: prompt ke tokens aur unki position (0, 1, 2 ...). Position abhi bas ek ginti hai; har tareeka is ginti ko alag tarah se model tak pahunchaata hai.' },
        { id: 'emb', label: 'Embedding', sub: '"kya" hai', x: 290, y: 60, w: 150, kind: 'data', info: 'Ye kya hai: token ka matlab wala vector, table se. Isme position ka koi pata nahi: "video" har jagah same.' },
        { id: 'sin', label: 'Sinusoidal', sub: 'sin/cos formula', x: 290, y: 170, w: 150, kind: 'cache', info: 'Ye kya hai: formula se bana position vector (2017 paper). Har pair ek ghadi ki sui, alag speed. Koi training nahi, kisi bhi position ke liye ban jaata hai.' },
        { id: 'lrn', label: 'Learned table', sub: 'max rows fixed', x: 290, y: 280, w: 150, kind: 'cache', info: 'Ye kya hai: position vectors ki seekhi hui table (BERT 512 rows, GPT-2 1,024). Simple, lekin table se aage ki position ke liye row nahi.' },
        { id: 'add', label: 'X = E + P', sub: 'absolute', x: 510, y: 170, w: 150, kind: 'server', info: 'Ye kya hai: embedding aur position vector ka number-by-number jod. RoPE aur ALiBi mein yahan kuch nahi judta: X = sirf E.' },
        { id: 'qk', label: 'Q, K banao', sub: 'X·Wq, X·Wk', x: 620, y: 470, w: 150, kind: 'server', info: 'Ye kya hai: attention ke andar har token se query aur key vector banana (seekhi hui matrices se guna). Har layer mein hota hai.' },
        { id: 'rope', label: 'RoPE: ghumao', sub: 'angle = pos × θ', x: 400, y: 400, w: 150, kind: 'edge', info: 'Ye kya hai: Q aur K ke har pair ko position ke hisaab se ghumaana. V nahi ghoomta. Iske baad q·k sirf relative doori pe depend karta hai.' },
        { id: 'alibi', label: 'ALiBi penalty', sub: '− slope × doori', x: 90, y: 360, w: 140, kind: 'threat', info: 'Ye kya hai: score mein se doori ke hisaab se penalty ghatana. Koi vector nahi; har head ka slope alag. Lambi length pe achha chalta hai.' },
        { id: 'score', label: 'Scores q·k', sub: 'softmax ke liye', x: 180, y: 470, w: 150, kind: 'queue', info: 'Ye kya hai: har query ka har key se dot product. Position ka asar yahin dikhta hai: absolute schemes mein X ke through, RoPE mein rotation se, ALiBi mein penalty se.' },
        { id: 'out', label: 'Softmax · V', sub: 'order samjha', x: 400, y: 545, w: 160, kind: 'data', info: 'Ye kya hai: scores se weights, phir V ka mix. Ab output order-aware hai: "Riya ne Aman ko" aur "Aman ne Riya ko" alag nikalte hain.' },
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
        { a: 'tok', b: 'alibi', dashed: true, label: 'doori' },
        { a: 'alibi', b: 'score' },
        { a: 'score', b: 'out', n: 3 },
      ],
      paths: [
        { name: 'Sinusoidal', text: 'Position se sin/cos vector bana, embedding mein juda (X = E + PE). Attention ko X ke through hi order milta hai. Original 2017 Transformer.', go: ['tok>sin>add>qk>score>out', 'tok>emb>add'] },
        { name: 'Learned', text: 'Position ki row seekhi hui table se, embedding mein jodi. BERT, GPT-2. Table ki rows khatam = max length.', go: ['tok>lrn>add>qk>score>out', 'tok>emb>add'] },
        { name: 'RoPE', text: 'Embedding mein kuch nahi juda. Har layer mein Q aur K ko position × θ se ghumaaya; score mein relative doori aati hai. LLaMA aur bahut se open LLMs.', go: ['tok>emb>add>qk>rope>score>out'] },
        { name: 'ALiBi', text: 'Na vector, na rotation. Score mein se slope × doori ghata do; door ke tokens ko kam dhyaan. BLOOM.', go: ['tok>emb>add>qk>score>out', 'tok>alibi>score'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Self-attention order-blind hai: tokens shuffle karo to output bhi bas shuffle hota hai. Position alag se deni padti hai.</li>
      <li>Sinusoidal: har pair ek ghadi ki sui, <code>sin/cos(pos / 10000^(2i/d))</code>. d = 4 mein PE(0) = [0, 1, 0, 1].</li>
      <li>Sinusoidal ka bonus: PE(p)·PE(p+k) sirf doori k pe depend karta hai.</li>
      <li>Learned: seekhi hui table (GPT-2 mein 1,024 rows); uske aage row hi nahi.</li>
      <li>RoPE: Q aur K ko pos × θ se ghumao (V nahi); score mein sirf relative doori. Aaj ke zyada tar open LLMs.</li>
      <li>ALiBi: score − slope × doori; koi vector nahi, lambi length pe achha.</li>
      <li>App developer ke liye: scheme model ke saath aati hai; tumhe bas context window ki limit dhyaan rakhni hai.</li>
    </ul>` },
    { type: 'tradeoffs', gains: [
      'Attention ko order aur doori ka signal milta hai: "Riya ne Aman ko" ≠ "Aman ne Riya ko"',
      'Sinusoidal/RoPE: koi extra parameter nahi, formula se',
      'RoPE/ALiBi: score mein relative doori seedhe, lambe context ke liye behtar',
    ], costs: [
      'Learned table: max length fixed, aage ke tokens ke liye kuch nahi',
      'Kisi bhi scheme mein training se lambi length pe quality girne ka risk',
      'Scheme model ke saath "jud" jaati hai: badalne ke liye retraining',
      'Absolute schemes mein "kya" aur "kahan" ek hi vector mein mix',
    ]},
    { type: 'think', questions: [
      { q: 'Agar ek model ne sirf 2,048 tokens tak training dekhi hai, aur hum use 8,000 tokens ka prompt dein (RoPE ke saath, koi scaling nahi), to kya hoga?', a: 'Code chal jaayega (rotation kisi bhi position ke liye ban jaata hai), lekin model ne itne bade angles/dooriyan kabhi dekhi nahi, to quality aksar bahut gir jaati hai. Isliye context badhane ke liye RoPE scaling aur long-context fine-tuning karte hain.' },
      { q: 'Sinusoidal formula mein 10000 ki jagah 10 kar dein (d = 512) to kya problem aa sakti hai?', a: 'Sabse dheemi sui bhi jaldi ghoom jaayegi (wavelength ~2π × 10 ≈ 63 positions ke aas paas), to lambe sentences mein door ki positions ke vectors repeat hone lagenge aur unique pattern kho jaayega. Bada base = zyada lambi range unique.' },
      { q: 'Kya decoder model mein, jahan causal mask hai, bina positional encoding ke bhi thoda order ka andaza lag sakta hai?', a: 'Haan, research mein dikha hai ki causal mask khud kuch signal deta hai: position 5 sirf 6 tokens dekh sakta hai, position 50 ikyaavan (51). Isse model ginti ka andaza laga sakta hai. Lekin practice mein almost har bada model explicit position scheme (aksar RoPE) use karta hai.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Bina positional encoding ke "xyz pe video" aur "video pe xyz" ke attention outputs mein kya farak hoga?', options: ['Bilkul alag numbers', 'Har token ka output same, bas rows ka order badla', 'Model error dega'], answer: 1, explain: 'Self-attention permutation-equivariant hai: input shuffle karo to output bhi bas shuffle hota hai. Isliye order ka signal alag se dena padta hai.' },
      { q: 'd = 4 sinusoidal mein position 0 ka PE vector kya hai?', options: ['[0, 0, 0, 0]', '[0, 1, 0, 1]', '[1, 0, 1, 0]'], answer: 1, explain: 'sin(0) = 0, cos(0) = 1, dono pairs ke liye. To [0, 1, 0, 1].' },
      { q: 'RoPE mein kya rotate hota hai?', options: ['Sirf V', 'Q aur K', 'Poora embedding, input pe ek baar'], answer: 1, explain: 'RoPE har attention layer mein Q aur K ko position ke hisaab se ghumaata hai, taaki q·k mein sirf relative doori aaye. V nahi ghoomta.' },
      { q: 'GPT-2 jaisa learned-position model 1,024 se lamba input kyun nahi le sakta?', options: ['Tokenizer fail ho jaata hai', 'Position table mein 1,024 se aage ki rows hi nahi hain', 'Softmax overflow'], answer: 1, explain: 'Learned positions ek fixed size ki table hain. Position 1,024 ka vector kabhi seekha hi nahi gaya.' },
      { q: 'ALiBi position ka signal kaise deta hai?', options: ['Embedding mein sin/cos jod ke', 'Attention score mein se doori ke hisaab se penalty ghata ke', 'Q, K ko rotate karke'], answer: 1, explain: 'ALiBi: score − slope × doori. Koi position vector nahi. Training se lambi length pe achha chalna iska main faayda tha.' },
    ]},
    { type: 'sources', note: 'Table aur widgets ke saare numbers (PE values, dot products, RoPE scores, wavelength, learned table ki rows, ALiBi weights) humne node script se calculate karke match kiye.', items: [
      { title: 'Attention Is All You Need', publisher: 'Vaswani et al., Google (arXiv 1706.03762)', year: 2017, official: true, url: 'https://arxiv.org/abs/1706.03762', used: 'Sinusoidal formula, 10000 base, geometric wavelengths 2π to 10000·2π, relative-position (linear function) motivation, learned vs sinusoidal nearly identical, extrapolation reasoning.' },
      { title: 'RoFormer: Enhanced Transformer with Rotary Position Embedding', publisher: 'Su et al. (arXiv 2104.09864)', year: 2021, official: true, url: 'https://arxiv.org/abs/2104.09864', used: 'RoPE: rotation matrix encodes absolute position, relative dependency appears in self-attention, decay with distance.' },
      { title: 'Train Short, Test Long: Attention with Linear Biases Enables Input Length Extrapolation (ALiBi)', publisher: 'Press, Smith, Lewis (arXiv 2108.12409, ICLR 2022)', year: 2021, official: true, url: 'https://arxiv.org/abs/2108.12409', used: 'Distance-proportional penalty on attention scores, head slopes, 1.3B model trained on 1,024 extrapolating to 2,048.' },
      { title: 'LLaMA: Open and Efficient Foundation Language Models', publisher: 'Touvron et al., Meta AI (arXiv 2302.13971)', year: 2023, official: true, url: 'https://arxiv.org/abs/2302.13971', used: 'LLaMA uses rotary embeddings instead of absolute positional embeddings.' },
      { title: 'Extending Context Window of Large Language Models via Positional Interpolation', publisher: 'Chen et al., Meta (arXiv 2306.15595)', year: 2023, official: true, url: 'https://arxiv.org/abs/2306.15595', used: 'Stretching RoPE positions plus short fine-tuning to extend context.' },
      { title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding', publisher: 'Devlin et al., Google AI Language (arXiv 1810.04805)', year: 2018, official: true, url: 'https://arxiv.org/abs/1810.04805', used: 'Learned absolute position embeddings, up to 512 positions.' },
      { title: 'Language Models are Unsupervised Multitask Learners (GPT-2)', publisher: 'Radford et al., OpenAI', year: 2019, official: true, url: 'https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf', used: 'Context of 1,024 tokens with learned position embeddings.' },
    ]},
  ],
});
