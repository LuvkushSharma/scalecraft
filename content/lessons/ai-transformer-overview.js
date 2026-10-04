Lesson.register({
  id: 'ai-transformer-overview',
  title: 'Transformer: poori picture',
  minutes: 26,
  summary: `GPT, Claude, Gemini, Llama: sab ke andar ek hi design hai, <strong>Transformer</strong>. Pehle dekhenge purane RNN kyun slow aur bhulakkad the, phir 2017 ka paper, phir block diagram ka har dabba, har step pe matrix ka shape, aur teen families: encoder-only (BERT), decoder-only (GPT) aur encoder-decoder (T5).`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `ChatGPT ya Claude ko sawaal likho, wo jawab ek ek word karke likhta hai. Andar ek hi machine hai jo ye kaam karti hai: <strong>Transformer</strong>.<br>Ye machine sentence ke saare words ko ek saath dekhti hai, har word ko baaki words se "poochh ke" uska sahi matlab samajhti hai, aur phir agla word guess karti hai.<br>Is lesson mein hum is machine ka poora naksha dekhenge: kaunsa dabba kya karta hai, aur numbers ka "size" har step pe kaisa dikhta hai. Maths sirf jodna aur guna karna hai, wo bhi chhote numbers ke saath.` },
    { type: 'h2', text: 'Ab tak kahan pahunche' },
    { type: 'p', html: `<a href="#/ai-what-is-llm">LLM lesson</a> mein dekha: model ek kaam karta hai, <em>agla token guess karna</em>. <a href="#/ai-tokenization">Tokenization lesson</a> mein dekha: text tokens mein tootta hai, har token ek id banta hai, aur har id ek <strong>embedding</strong> vector (numbers ki list). xyz.com apna "xyz Assistant" bana raha hai. User likhta hai: <code>xyz.com pe video upload kaise karein?</code>` },
    { type: 'callout', tone: 'term', title: 'Naya word: vector', html: `<strong>Ye kya hai:</strong> numbers ki ek seedhi list, jaise <code>[2, 0, 1, 0]</code>. List mein kitne numbers hain, use vector ka <strong>size</strong> (ya dimension) kehte hain. Ye wala size 4 ka hai.<br><strong>Kyun chahiye:</strong> computer words nahi samajhta, sirf numbers. Har token ko ek vector bana do, to uspe jodna, guna karna, compare karna sab ho sakta hai.<br><strong>Iske bina:</strong> "video" aur "clip" jaise words ko maths mein compare karne ka koi tareeka nahi hota.<br><strong>Example:</strong> GPT-2 small mein har token ka vector 768 numbers ka hai. Is phase mein hum sirf 4 numbers ke vectors lenge, taaki haath se gin sakein.` },
    { type: 'callout', tone: 'term', title: 'Naya word: embedding (yaad karo)', html: `<strong>Ye kya hai:</strong> har token id ka ek fixed vector, ek badi table se uthaya hua. Token id 42 aaya to table ki row 42 utha lo.<br><strong>Kyun chahiye:</strong> token id sirf ek naam-number hai (42 ka 43 se koi rishta nahi). Embedding vector mein matlab bhara hota hai: milte-julte words ke vectors paas paas.<br><strong>Iske bina:</strong> model ko pata hi nahi chalega ki "video" aur "clip" milte-julte hain.` },
    { type: 'p', html: `Sawaal ye hai: in vectors ke beech <em>andar</em> kya hota hai ki aakhir mein model sahi agla token bol de? Is "andar" wale machine ka naam hai <strong>Transformer</strong>. Is phase (A2) mein hum ise tiny numbers ke saath khol ke dekhenge. Ye lesson poora naksha deta hai; agle lessons ek ek dabba kholenge.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Transformer', html: `<strong>Ye kya hai:</strong> ek <strong>neural network</strong> ka design (architecture), jo 2017 mein aaya. Neural network = numbers ki kai <strong>layers</strong> (steps), jahan har layer apne input ko seekhe hue numbers (weights) se guna-jod karke aage bhejti hai. Transformer ek sentence ke saare tokens ko <em>ek saath</em> dekhta hai, aur har token baaki tokens se "poochh ke" apna matlab update karta hai. Is "poochhne" wale trick ko <strong>attention</strong> kehte hain.<br><strong>Kyun chahiye:</strong> agla token sahi guess karne ke liye har word ko poore sentence ka context chahiye.<br><strong>Iske bina:</strong> purane models (RNN) ek ek word line mein padhte the: slow, aur lambi baat bhool jaate the. Neeche dekhenge.<br><strong>Example:</strong> GPT, Claude, Gemini, Llama: sab Transformer pe bane hain.` },

    { type: 'h2', text: 'Problem 1: ek word ka matlab context se badalta hai' },
    { type: 'p', html: `Do sentences dekho:<br>1. <code>mouse se video pe click karo</code><br>2. <code>is video mein ek mouse cheese dhoondh raha hai</code><br>Dono mein token "mouse" same hai, to tokenization lesson wala embedding bhi <em>bilkul same</em> vector hoga. Lekin pehle mein ye computer ka mouse hai, doosre mein jaanwar. Model ko jawab dena hai to usse farak pata hona chahiye.` },
    { type: 'callout', tone: 'term', title: 'Naya word: static vs contextual embedding', html: `<strong>Ye kya hai:</strong> <strong>Static embedding</strong> = har token ka ek fixed vector, chahe sentence kuch bhi ho (table se seedha uthaya). <strong>Contextual embedding</strong> = wahi vector, lekin sentence ke baaki words dekh ke badla hua.<br><strong>Kyun chahiye:</strong> "mouse" ke do matlab hain. Static vector dono mein same hai; contextual vector sentence ke hisaab se alag ho jaata hai.<br><strong>Iske bina:</strong> model har sentence mein "mouse" ko ek hi cheez samjhega aur galat jawab dega.<br>Transformer ka poora kaam yahi hai: static vectors andar jaate hain, har layer ke baad wo zyada "context-aware" ban jaate hain.` },
    { type: 'p', html: `Toh humein ek aisi machine chahiye jo har token ko poore sentence ke context ke saath dobara likhe. Transformer se pehle ye kaam <strong>RNN</strong> karte the. Pehle unki problem samjho, tabhi Transformer ka design "kyun" samajh aayega.` },
    { type: 'h2', text: 'Purana tareeka: RNN, ek ek word padho' },
    { type: 'callout', tone: 'term', title: 'Naya word: RNN (Recurrent Neural Network)', html: `<strong>Ye kya hai:</strong> Transformer se pehle ka model, jo sentence ko left se right, <em>ek token at a time</em> padhta tha. Har step pe wo ek chhota vector rakhta hai jise <strong>hidden state</strong> kehte hain: ab tak padhe gaye sab kuch ka "summary note". Naya token aaya, to purana note + naya token = naya note. Aakhri note se jawab banta hai.<br><strong>Kyun tha:</strong> sentence ka order apne aap samajh aata tha, aur kisi bhi length ka input chal jaata tha.<br><strong>Dikkat:</strong> slow aur bhulakkad (neeche dekho). <strong>LSTM</strong> (1997) aur <strong>GRU</strong> isi ke sudhre hue versions hain.` },
    { type: 'ascii', text: `RNN:  "xyz.com" → [note1] → "pe" → [note2] → "video" → [note3] → "upload" → [note4] ...
        step 1 khatam hue bina step 2 shuru nahi ho sakta

Transformer:  "xyz.com"  "pe"  "video"  "upload"   ← saare ek saath andar
                 ↕         ↕       ↕         ↕
              har token seedha har token ko dekh sakta hai (attention)`, caption: 'RNN line mein khade log jo ek doosre ko kaan mein baat batate hain. Transformer ek group call jahan sab sabko seedha sun sakte hain.' },
    { type: 'callout', tone: 'term', title: 'Naya word: GPU aur parallelism', html: `<strong>Ye kya hai:</strong> <strong>GPU</strong> (graphics card) ek chip hai jisme hazaaron chhote calculators (cores) hote hain, jo ek saath alag alag numbers guna kar sakte hain. Ek saath bahut saare kaam karne ko <strong>parallel</strong> kehte hain.<br><strong>Kyun chahiye:</strong> neural network ka zyada tar kaam "bahut saare numbers ka guna-jod" hai. GPU ye kaam CPU se kai guna tez karta hai.<br><strong>Iske bina (ya parallel kaam ke bina):</strong> agar har calculation pichhle ka wait kare (sequential), to GPU ke hazaaron cores khaali baithe rehte hain. RNN ki yahi problem thi.` },
    { type: 'p', html: `RNN ki do badi bimaariyan thi:` },
    { type: 'list', items: [
      `<strong>Slow (sequential)</strong>: step 50 tabhi chalega jab step 49 khatam ho. <strong>GPU</strong> hazaaron chhote calculations ek saath (parallel) karne mein mahir hai, lekin RNN use line mein khada kar deta hai. Lambe documents pe training bahut dheemi.`,
      `<strong>Bhulakkad (long-range dependency)</strong>: sentence ke shuru ki baat 100 steps baad tak ek chhote note ke through, baar baar overwrite hote hue pahunchti hai. Raste mein signal kamzor ho jaata hai. Training mein bhi yahi hota hai: galti ka signal peeche jaate jaate ghat jaata hai, isko <strong>vanishing gradient</strong> kehte hain. LSTM ne ise kaafi sudhara, lekin poora theek nahi hua.`,
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: gradient aur vanishing gradient', html: `<strong>Ye kya hai:</strong> training mein model apni galti dekhta hai, aur har weight ke liye poochhta hai: "isse thoda badhaun ya ghataun to galti kam hogi?" Is jawab (direction + kitna) ko <strong>gradient</strong> kehte hain. Ye signal output se peeche ki taraf, layer dar layer (ya RNN mein step dar step) jaata hai. Agar har step pe signal thoda chhota hota jaaye, to 100 steps peeche tak pahunchte pahunchte lagbhag zero: ise <strong>vanishing gradient</strong> kehte hain.<br><strong>Kyun zaroori hai:</strong> jis weight tak gradient nahi pahunchta, wo seekh hi nahi paata.<br><strong>Iske bina (yaani signal mar gaya to):</strong> RNN sentence ke shuru ke words ka rishta aakhri words se seekh nahi paata.` },
    { type: 'p', html: `Neeche toy calculator mein sentence lamba karo. "Sequential steps" batata hai kitne kaam line mein ek ke baad ek karne padenge (ek layer ke liye). "Path length" batata hai pehle token ki baat aakhri token tak kitne hops mein pahunchti hai. "Signal bacha" ek <em>toy model</em> hai: maan lo har hop pe sirf ek hissa (retention) bachta hai.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Sentence length (tokens): <strong class="v-n">20</strong></label><input class="i-n" type="range" min="2" max="200" step="1" value="20"></div>
          <div><label>Toy retention per hop: <strong class="v-r">0.9</strong></label><input class="i-r" type="range" min="0.5" max="0.99" step="0.01" value="0.9"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>RNN sequential steps</span><strong class="o-rs"></strong></div>
          <div class="stat"><span>Transformer sequential steps</span><strong class="o-ts"></strong></div>
          <div class="stat"><span>RNN path (pehla → aakhri)</span><strong class="o-rp"></strong></div>
          <div class="stat"><span>Transformer path</span><strong class="o-tp"></strong></div>
          <div class="stat"><span>RNN signal bacha (toy)</span><strong class="o-sig"></strong></div>
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
        el.querySelector('.o-note').innerHTML = 'Signal = ' + R.toFixed(2) + '<sup>' + (N - 1) + '</sup>. Transformer mein pehla token aakhri ko seedha dikhta hai, lekin keemat: har token har token se score banata hai, yaani ' + N + ' × ' + N + ' = ' + (N * N).toLocaleString('en-IN') + ' scores. Length double, scores 4 guna.';
      };
      n.addEventListener('input', upd); r.addEventListener('input', upd); upd();
    }},
    { type: 'p', html: `Default pe (20 tokens, 0.9) RNN mein signal 13.51% bachta hai; 100 tokens pe lagbhag zero. Ye exact physics nahi, sirf intuition hai, lekin 2017 ke paper ka point yahi tha: self-attention mein sequential operations aur path length dono O(1) hain, RNN mein O(n).` },
    { type: 'h2', text: '2017: "Attention Is All You Need"' },
    { type: 'p', html: `June 2017 mein Google Brain aur Google Research ki team (Vaswani et al., 8 authors) ne ek paper publish kiya: <em>Attention Is All You Need</em>. Usse pehle (2014 se) attention ko RNN ke <em>saath</em> ek helper ki tarah use karte the. Is paper ne kaha: RNN hata do, sirf attention (plus kuch simple layers) kaafi hai. Paper ka task tha <strong>machine translation</strong> (English → German, English → French).` },
    { type: 'list', items: [
      `English→German pe 28.4 BLEU (pichhle best se 2+ zyada), English→French pe 41.8 BLEU, single-model state of the art. <strong>BLEU</strong> = translation quality ka ek standard score (0-100): machine ka translation insaan ke translation se kitna milta hai. Zyada = behtar.`,
      `Training sirf 8 GPUs pe 3.5 din (bade model ke liye), jo us time ke competitors se kaafi kam tha. Wajah: parallel training.`,
      `Base model ki settings: N = 6 layers, d_model = 512, 8 attention heads, FFN ke andar 2048. Ye numbers abhi yaad rakhne ki zaroorat nahi, neeche table mein shapes se samjhenge.`,
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: d_model', html: `<strong>Ye kya hai:</strong> har token ka vector kitne numbers ka hai. Paper mein 512, GPT-2 small mein 768, bade modern models mein kai hazaar.<br><strong>Kyun chahiye:</strong> zyada numbers = har token ke baare mein zyada baatein yaad rakhne ki jagah (matlab, grammar, context).<br><strong>Iske bina (bahut chhota d_model):</strong> vector mein jagah kam, model baarik farak nahi pakad paata. Bahut bada: model mehnga aur slow.<br><strong>Example:</strong> is phase mein hum <strong>d_model = 4</strong> lenge taaki haath se calculate ho sake. Har layer ke bahar token vector ka size yahi rehta hai.` },

    { type: 'h2', text: 'Pehle 5 minute ka maths: matrix aur guna' },
    { type: 'p', html: `Transformer ke andar ek hi kaam baar baar hota hai: <strong>numbers ki tables ko guna karna</strong>. Aage har dabbe ke saath "shape" likha hoga, jaise <code>3 × 4</code>. Isliye pehle teen chhoti cheezein seekh lo. Agar tumne kabhi matrix nahi dekha, koi baat nahi: sirf guna aur jod aana chahiye.` },
    { type: 'callout', tone: 'term', title: 'Naya word: matrix aur shape', html: `<strong>Ye kya hai:</strong> numbers ki ek table, rows aur columns mein. Uska <strong>shape</strong> = (rows × columns). Jaise 3 tokens, har ek ka 4 numbers ka vector: upar-neeche rakh do to <code>3 × 4</code> matrix ban gaya. Har row ek token.<br><strong>Kyun chahiye:</strong> saare tokens ek saath ek table mein ho to GPU sab pe ek saath kaam kar sakta hai.<br><strong>Iske bina:</strong> har token pe alag alag, ek ke baad ek kaam karna padta: slow.<br><strong>Example:</strong><br><code>xyz&nbsp;&nbsp;&nbsp;[2, 0, 1, 0]</code><br><code>pe&nbsp;&nbsp;&nbsp;&nbsp;[1, 0, 2, 0]</code><br><code>video&nbsp;[0, 2, 0, 1]</code> &nbsp;← 3 rows, 4 columns = shape 3 × 4` },
    { type: 'callout', tone: 'term', title: 'Naya word: dot product', html: `<strong>Ye kya hai:</strong> do same size ke vectors lo. Same jagah wale numbers ko guna karo, phir sab jod do. Ek number milta hai.<br><code>[1, 2, 0] · [2, 0, 1] = 1×2 + 2×0 + 0×1 = 2</code><br><strong>Kyun chahiye:</strong> ye batata hai do vectors kitne "match" karte hain. Dono ke bade numbers same jagah pe hain to result bada.<br><strong>Iske bina:</strong> model ke paas "ye token us token se kitna related hai" naapne ka seedha tareeka nahi hota. Attention isi pe chalta hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: matrix multiply (A · B)', html: `<strong>Ye kya hai:</strong> bahut saare dot products ek saath. Result ka har cell = <em>A ki ek row</em> · <em>B ka ek column</em>. Row number i aur column number j se result ka cell (i, j) banta hai.<br><strong>Shape ka rule:</strong> <code>(a × b) · (b × c) = (a × c)</code>. Beech wale do numbers (b) same hone chahiye, warna guna ho hi nahi sakta. Bahar wale do numbers result ka shape hain.<br><strong>Kyun chahiye:</strong> ek hi step mein har token ka vector "badal" dena (jaise 4 numbers ko naye 4 numbers mein). Transformer ki har layer yahi karti hai.<br><strong>Iske bina:</strong> har number ke liye alag loop likhna padta; GPU ka fayda nahi milta.` },
    { type: 'callout', tone: 'term', title: 'Naya word: transpose (ᵀ)', html: `<strong>Ye kya hai:</strong> matrix ko "letaa do": rows columns ban jaati hain. <code>3 × 4</code> ka transpose <code>4 × 3</code>. Iska nishaan chhota ᵀ hai, jaise Kᵀ.<br><strong>Kyun chahiye:</strong> kabhi kabhi shape rule ke liye beech ke numbers match karne hote hain. (3 × 4)·(3 × 4) nahi hota, lekin (3 × 4)·(4 × 3) hota hai.<br><strong>Iske bina:</strong> attention mein "har token ka har token se dot product" ek guna mein nahi nikal paata.` },
    { type: 'p', html: `Ab khud karke dekho. Neeche A (2 × 3) aur B (3 × 2) hain, to result C ka shape 2 × 2 hoga. C ke kisi bhi cell pe click karo: A ki kaunsi row aur B ka kaunsa column use hua, wo highlight hoga aur hisaab likha aayega. A ya B ka koi number badlo, C turant badlega.` },
    { type: 'custom', render(el) {
      let A = [[1, 2, 0], [0, 1, 3]], B = [[2, 1], [0, 1], [1, 0]], si = 0, sj = 1;
      const mm = () => A.map(r => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
      const box = 'width:46px;padding:4px;text-align:center;border-radius:6px;font:14px var(--f-mono);border:1px solid var(--line-2);';
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start">
          <div><div class="calc-note" style="margin:0 0 4px">A (2 × 3)</div><div class="ga" style="display:grid;grid-template-columns:repeat(3,auto);gap:4px"></div></div>
          <div style="align-self:center;font:20px var(--f-mono);color:var(--ink-3)">·</div>
          <div><div class="calc-note" style="margin:0 0 4px">B (3 × 2)</div><div class="gb" style="display:grid;grid-template-columns:repeat(2,auto);gap:4px"></div></div>
          <div style="align-self:center;font:20px var(--f-mono);color:var(--ink-3)">=</div>
          <div><div class="calc-note" style="margin:0 0 4px">C (2 × 2): click karo</div><div class="gc" style="display:grid;grid-template-columns:repeat(2,auto);gap:4px"></div></div>
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
        q('.o-n').innerHTML = `C[${si}][${sj}] = A ki row ${si} · B ka column ${sj} = [${row.join(', ')}] · [${col.join(', ')}] = ${row.map((v, k) => v + '×' + col[k]).join(' + ')} = <strong>${C[si][sj]}</strong>.<br>Shape rule: (2 × <strong>3</strong>) · (<strong>3</strong> × 2) = (2 × 2). Beech ke dono 3 match hue, isliye guna ho paaya.`;
      };
      build();
    }},
    { type: 'p', html: `Default numbers pe C = <code>[[2, 3], [3, 1]]</code>. Jaise C[0][1] = [1, 2, 0]·[1, 1, 0] = 1×1 + 2×1 + 0×0 = 3. Bas itna hi maths poore Transformer mein hai, bas tables bahut badi hoti hain (768 × 768 jaisi) aur ye guna arabon baar hota hai.` },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "matrix guna = cell se cell guna"', html: `Nahi. A·B mein A ki <em>row</em> B ke <em>column</em> se milti hai (dot product). Isliye order bhi matter karta hai: A·B aur B·A aksar alag hote hain, ya shape ki wajah se ek ho hi nahi sakta. Upar ke example mein A·B ka shape 2 × 2 hai, lekin B·A ka 3 × 3.` },
    { type: 'h2', text: 'Block diagram: ek ek dabba' },
    { type: 'p', html: `Aaj ke zyada tar chat models (GPT series, Llama, Gemini jaise) <strong>decoder-only</strong> Transformer hain (families neeche samjhenge). Unka naksha:` },
    { type: 'ascii', text: `"xyz.com pe video"          ← text
      │ tokenizer
[ 7, 15, 42 ]               ← token ids            shape: (n)
      │ embedding lookup
Embeddings                   ← har id ka vector      shape: (n × d_model)
      + Positional encoding  ← "kaun kis position pe"
      │
┌──────────── × N layers (har layer same design, alag weights) ────────────┐
│  Masked self-attention   ← har token pichhle tokens ko dekhta hai        │
│  Add & Norm              ← residual (input wapas jodo) + LayerNorm       │
│  Feed-forward (FFN)      ← har token pe alag se chhota neural net        │
│  Add & Norm                                                              │
└──────────────────────────────────────────────────────────────────────────┘
      │                                              shape: (n × d_model)
Linear (unembedding)         ← vector → har vocab token ka score (logits)
      │                                              shape: (n × vocab)
Softmax                      ← scores → probabilities, agla token chuno`, caption: 'Token ids ke numbers sirf example hain. Shape mein n = tokens ki ginti.' },
    { type: 'p', html: `Ab har naya word, ek ek karke:` },
    { type: 'callout', tone: 'term', title: 'Naya word: embedding layer', html: `<strong>Ye kya hai:</strong> ek badi table, shape <code>vocab_size × d_model</code>. Token id 42 aaya to row 42 utha lo. Bas lookup, koi guna nahi.<br><strong>Kyun chahiye:</strong> token id ko matlab wale vector mein badalna. Training ke dauraan ye rows seekhi jaati hain.<br><strong>Iske bina:</strong> model ke paas sirf ids hongi, jinke beech koi rishta nahi. (Detail: <a href="#/ai-tokenization">tokenization lesson</a>.)` },
    { type: 'callout', tone: 'term', title: 'Naya word: positional encoding (PE)', html: `<strong>Ye kya hai:</strong> har position (0, 1, 2, ...) ka ek vector, jo us position wale token ke embedding mein jod diya jaata hai.<br><strong>Kyun chahiye:</strong> attention ko apne aap order nahi pata. "xyz pe video" aur "video pe xyz" uske liye ek jaise hain.<br><strong>Iske bina:</strong> "Riya ne Aman ko video bheja" aur "Aman ne Riya ko video bheja" model ko same lagenge. Poora lesson: <a href="#/ai-positional-encoding">Positional encoding</a>.` },
    { type: 'callout', tone: 'term', title: 'Naya word: self-attention (aur masked)', html: `<strong>Ye kya hai:</strong> har token baaki tokens se "poochhta" hai ki mere liye kaun kitna important hai, aur unki information ka mix (weighted average) leke apna vector update karta hai. <strong>Masked</strong> self-attention mein token sirf apne se <em>pehle</em> wale tokens dekh sakta hai, aage wale nahi.<br><strong>Kyun chahiye:</strong> "video" ko pata chale ki ye "xyz.com" ka video hai. Mask isliye ki jo model agla word guess karna seekh raha hai, wo aage ka word dekh ke "copy" na kare.<br><strong>Iske bina:</strong> har token akela rehta, context kabhi nahi milta.<br>Haath se poora calculation: <a href="#/ai-attention">Self-attention lesson</a>. Ek saath kai attention (heads): <a href="#/ai-multihead">Multi-head lesson</a>.` },
    { type: 'callout', tone: 'term', title: 'Naya word: residual connection ("Add")', html: `<strong>Ye kya hai:</strong> layer ka output = <em>layer ka input</em> + <em>layer ne jo nikala</em>. Jaise kisi document mein "track changes": original text rehta hai, layer bas apne sudhaar upar jodti hai.<br><strong>Kyun chahiye:</strong> original info kabhi nahi khoti, aur training ka signal (gradient) is "seedhe raaste" se aasani se peeche pahunchta hai. Isi se 50-100 layers ka stack train ho paata hai.<br><strong>Iske bina:</strong> deep stack mein signal kamzor (vanishing gradient), training atakti hai.<br><strong>Example:</strong> input [1, 0, 2, 0], layer ne nikala [0.2, 0.1, −0.3, 0]. Output = [1.2, 0.1, 1.7, 0].` },
    { type: 'callout', tone: 'term', title: 'Naya word: LayerNorm ("Norm")', html: `<strong>Ye kya hai:</strong> har token ke vector ke numbers ko ek standard range mein le aana: average ~0 aur faila hua ~1 (phir do seekhe hue numbers se thoda adjust). Jaise alag alag teachers ke marks ko ek scale pe le aana.<br><strong>Kyun chahiye:</strong> 48 layers ke baad numbers bahut bade (phat) ya bahut chhote (sikud) na ho jaayein.<br><strong>Iske bina:</strong> training unstable, numbers overflow ya loss uchhalta hai.<br><strong>Kahan lagta hai:</strong> original paper mein sublayer ke <em>baad</em> (post-norm). GPT-2 aur zyada tar modern models mein <em>pehle</em> (pre-norm), jo training ko zyada stable rakhta hai. "Add & Norm" = residual + LayerNorm ki jodi.` },
    { type: 'callout', tone: 'term', title: 'Naya word: feed-forward network (FFN)', html: `<strong>Ye kya hai:</strong> har token ke vector pe <em>alag alag</em> (doosre tokens ko dekhe bina) ek chhota network: pehle vector ko bada karo (paper: 512 → 2048), ek <strong>non-linearity</strong> lagao, phir wapas chhota karo (2048 → 512). Non-linearity ek simple rule hai jaise <strong>ReLU</strong>: "negative ho to 0 kar do" (GPT-2 iska naram version <strong>GELU</strong> use karta hai).<br><strong>Kyun chahiye:</strong> attention tokens ke <em>beech</em> info mix karta hai; FFN har token ke <em>andar</em> us info ko process karta hai. Model ke zyada tar parameters (seekhe hue numbers) yahin hote hain, aur kaafi "facts" yahin store hote maane jaate hain.<br><strong>Iske bina (ya non-linearity ke bina):</strong> saari layers milke bhi bas ek bada guna ban jaati, complex patterns nahi seekh paati.` },
    { type: 'callout', tone: 'term', title: 'Naya word: logits aur Linear + Softmax (output head)', html: `<strong>Ye kya hai:</strong> aakhri layer ka vector (d_model numbers) ek matrix se guna hota hai jo use <strong>vocab_size</strong> scores mein badalta hai: har possible next token ka ek score. In raw scores ko <strong>logits</strong> kehte hain. <strong>Softmax</strong> unhe probabilities bana deta hai (har ek 0 se 1, total 1).<br><strong>Kyun chahiye:</strong> model ko akhir mein ek token chunna hai. Probabilities se sampling hoti hai (<a href="#/ai-what-is-llm">LLM lesson</a>).<br><strong>Iske bina:</strong> vector to milta, lekin "agla word kaunsa" ka jawab nahi.<br><strong>Note:</strong> training mein sirf aakhri nahi, har position apna "agla token" predict karti hai.` },
    { type: 'h2', text: 'Chala ke dekho: data ka raasta' },
    { type: 'p', html: `Har box pe click karke uska role padho. Scenarios badal ke dekho: normal generation, training, aur do failure cases.` },
    { type: 'flow', height: 290,
      nodes: [
        { id: 'tok', label: 'Tokens', sub: 'ids (n)', x: 100, y: 70, w: 150, kind: 'client', info: 'Ye kya hai: user ke text ke tokens, numbers (ids) ki shakal mein. Tokenizer ne text ko token ids mein toda. "xyz.com pe video" maan lo 3 tokens. Shape: n = 3 numbers.' },
        { id: 'emb', label: 'Embedding + PE', sub: 'n × d_model', x: 340, y: 70, w: 160, kind: 'data', info: 'Ye kya hai: wo step jahan har id vector banti hai. Har id ki embedding table se row uthao (static vector), phir uski position ka vector jodo. Ab har token ek d_model size ka vector hai, jisme "kaun" aur "kahan" dono hain.' },
        { id: 'att', label: 'Self-attention', sub: '+ Add & Norm', x: 590, y: 70, w: 160, kind: 'server', info: 'Ye kya hai: wo hissa jahan tokens aapas mein baat karte hain. Har token baaki tokens ko dekh ke apna vector update karta hai (weighted mix). Decoder mein masked: sirf pichhle tokens. Phir residual add + LayerNorm. Shape wahi: n × d_model.' },
        { id: 'ffn', label: 'Feed-forward', sub: '+ Add & Norm', x: 590, y: 220, w: 160, kind: 'server', info: 'Ye kya hai: har token ka apna chhota "sochne wala" network. Har token ke vector pe alag se chhota 2-layer network (d_model → 4·d_model → d_model). Phir residual + LayerNorm. Attention + FFN = ek layer. Ye pair N baar repeat hota hai (GPT-2 small: 12 baar).' },
        { id: 'head', label: 'Linear+Softmax', sub: 'n × vocab', x: 340, y: 220, w: 160, kind: 'cache', info: 'Ye kya hai: output head, jo vector ko "agle token ke chances" mein badalta hai. Aakhri vector ko vocab_size scores (logits) mein badlo, softmax se probabilities. Generation mein sirf aakhri position ki row se agla token chunte hain.' },
        { id: 'out', label: 'Agla token', sub: 'sample', x: 100, y: 220, w: 150, kind: 'queue', info: 'Ye kya hai: model ka jawab, ek token. Probabilities se ek token chuna (greedy ya sampling). Use input ke end mein jodo aur poora kaam phir se: isse autoregressive generation kehte hain.' },
      ],
      edges: [{ a: 'tok', b: 'emb' }, { a: 'emb', b: 'att' }, { a: 'att', b: 'ffn' }, { a: 'ffn', b: 'head' }, { a: 'head', b: 'out' }, { a: 'out', b: 'tok', dashed: true }],
      scenarios: [
        { name: 'Generation (happy path)', steps: [
          { title: 'Text se ids', text: 'User ka prompt tokens mein. 3 tokens, 3 ids.', focus: ['tok'], set: { tok: { sub: '[xyz, pe, video]' } }, msg: '"xyz.com pe video"  →  [7, 15, 42]   (ids illustrative)' },
          { title: 'Embedding + position', text: 'Har id ka vector, plus position ka vector. Ab ek matrix: 3 rows (tokens) × d_model columns.', go: 'tok>emb', after: { emb: { state: 'ok', sub: '3 × 4' } }, msg: 'X = E[ids] + PE[0..2]     shape (3 × 4)' },
          { title: 'Attention: tokens aapas mein baat', text: '"video" ko "xyz.com" se context milta hai. Shape nahi badalti, sirf numbers (matlab) badalte hain.', go: 'emb>att', after: { att: { state: 'ok' } }, msg: 'X = X + Attention(LayerNorm(X))   (3 × 4)' },
          { title: 'FFN: har token apne andar sochta hai', text: 'Har token ka vector alag se process. Ye layer 1 khatam.', go: 'att>ffn', after: { ffn: { state: 'ok' } }, msg: 'X = X + FFN(LayerNorm(X))   (3 × 4)' },
          { title: 'N layers', text: 'Yahi attention + FFN ka pair N baar (har baar alag weights). Har layer ke baad vectors zyada context-aware.', go: ['ffn>att', 'att>ffn'], msg: 'layer 1 → layer 2 → ... → layer N' },
          { title: 'Logits aur softmax', text: 'Aakhri token ("video") ki row ko vocab scores mein badla, softmax se probabilities.', go: 'ffn>head', after: { head: { state: 'ok' } }, msg: 'logits (1 × vocab) → softmax → {"upload": 0.41, "kaise": 0.22, ...}   (illustrative)' },
          { title: 'Token chuna, wapas loop', text: '"upload" chuna gaya, input ke end mein juda. Ab 4 tokens ke saath poora safar dobara. Isliye jawab token-by-token aata hai.', go: ['head>out', 'evt:out>tok'], after: { out: { state: 'hit', sub: '"upload"' }, tok: { sub: '4 tokens' } } },
        ]},
        { name: 'Training (parallel)', intro: 'Training mein poora sentence pehle se pata hai. Model har position pe ek saath agla token predict karta hai.', steps: [
          { title: 'Poora sentence ek saath', text: '"xyz.com pe video upload" ke saare tokens ek saath andar. Koi loop nahi.', go: 'tok>emb>att', msg: 'input:  [xyz.com, pe, video]\ntarget: [pe, video, upload]' },
          { title: 'Mask cheating rokta hai', text: 'Masked attention ki wajah se "pe" wali position (jiska target "video" hai) aage wale "video" token ko nahi dekh sakti, warna wo answer copy kar leti. Isliye parallel training safe hai.', set: { att: { state: 'warn', sub: 'causal mask' } }, go: 'att>ffn>head' },
          { title: 'Har position ka loss', text: 'Har position pe "sahi agla token kitni probability se bola" check hua. Teeno errors ek saath GPU pe. RNN ye line mein karta.', after: { head: { state: 'ok', sub: '3 predictions' } }, focus: ['head'] },
        ]},
        { name: 'Failure: position nahi', steps: [
          { title: 'PE bhool gaye', text: 'Maan lo positional encoding nahi joda.', set: { emb: { state: 'warn', sub: 'sirf embedding' } }, go: 'tok>emb', msg: '"xyz.com pe video"  vs  "video pe xyz.com"' },
          { title: 'Order gayab', text: 'Attention ke liye dono sentences same tokens ka "thaila" hain. Har token ka output vector dono mein same nikalta hai, bas rows ki jagah badli. Matlab badal gaya, model ko pata nahi chala.', go: 'emb>att', after: { att: { state: 'miss', sub: 'order-blind' } } },
          { title: 'Fix', text: 'Har position ka unique vector jodo (sinusoidal, learned, ya RoPE jaisa rotation). Poori kahani agle lesson mein.', set: { emb: { state: 'ok', sub: '+ position' }, att: { state: '', sub: '+ Add & Norm' } }, focus: ['emb'] },
        ]},
        { name: 'Failure: context full', steps: [
          { title: 'Bahut lamba input', text: 'xyz Assistant ne poori help-docs ki 2,000 tokens ki file prompt mein daal di. Model ki max length (context window) 1,024 hai (jaise GPT-2).', go: 'tok>emb', set: { tok: { sub: '2,000 tokens' } } },
          { title: 'Position 1,024 ke aage kuch nahi', text: 'Learned position table mein sirf 1,024 rows hain. Aage ke tokens ka koi position vector nahi, aur attention ka n × n bhi bahut bada. API aise mein error deti hai ya app ko text kaatna padta hai.', go: 'bad:emb>tok', set: { emb: { state: 'down', sub: 'limit 1,024' } } },
          { title: 'Fix app ki taraf', text: 'Prompt chhota karo: sirf relevant hissa bhejo (RAG), purani baatein summarize karo. Ye context engineering hai (A4 phase).', set: { emb: { state: 'ok', sub: 'n × d_model' }, tok: { sub: 'trimmed' } }, go: 'tok>emb>att' },
        ]},
      ],
    },
    { type: 'h2', text: 'Har step pe shape kya hai?' },
    { type: 'p', html: `Interview mein (aur code debug karte waqt) sabse kaam ki cheez: har step ke baad matrix ka <strong>shape</strong> (kitni rows × kitne columns). Hamara tiny example: n = 3 tokens, d_model = 4. Real comparison ke liye GPT-2 small (2019): d_model = 768, 12 layers, vocab 50,257, max 1,024 tokens.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Q, K, V aur head (ek line mein)', html: `<strong>Ye kya hai:</strong> attention ke andar har token ke vector se teen naye vectors bante hain: <strong>Q</strong> (query: "main kya dhoondh raha hoon"), <strong>K</strong> (key: "mere paas kya hai") aur <strong>V</strong> (value: "main kya info dunga"). Ek <strong>head</strong> = attention ka ek poora set (apne Q, K, V ke saath). Bade models mein kai heads ek saath chalte hain.<br><strong>Kyun chahiye:</strong> Q aur K ka dot product batata hai kaun kisko kitna dekhe; V se asli info aati hai.<br><strong>Iske bina:</strong> attention ka score banana mumkin nahi. Poora hisaab: <a href="#/ai-attention">self-attention lesson</a>.` },
    { type: 'table', head: ['Step', 'Tiny (n=3, d=4)', 'GPT-2 small (n tokens)', 'Kya hai'], rows: [
      ['Token ids', '(3)', '(n)', 'Bas integers'],
      ['Embedding + PE = X', '(3 × 4)', '(n × 768)', 'Har token ki ek row'],
      ['Q, K, V (ek head)', '(3 × 4) har ek', '(n × 64) har head, 12 heads', 'X ko teen alag matrices se multiply'],
      ['Attention scores QKᵀ', '(3 × 3)', '(n × n) har head', 'Har token ka har token se score'],
      ['Attention output', '(3 × 4)', '(n × 768)', 'Wapas d_model, taaki residual jud sake'],
      ['FFN andar', '(3 × 16)', '(n × 3072)', '4 × d_model tak phaila'],
      ['FFN bahar / layer output', '(3 × 4)', '(n × 768)', 'Har layer ke baad wahi shape'],
      ['Logits', '(3 × vocab)', '(n × 50,257)', 'Har position pe har token ka score'],
      ['Next-token probabilities', '(vocab)', '(50,257)', 'Generation mein sirf aakhri row'],
    ], caption: 'Layer ke andar shape badalti hai (Q/K/V, n × n, FFN), lekin har layer ke bahar hamesha n × d_model. Isi wajah se layers stack ho paati hain.' },
    { type: 'callout', tone: 'term', title: 'Naya word: parameters, weights aur bias', html: `<strong>Ye kya hai:</strong> <strong>parameters</strong> = model ke andar ke saare seekhe hue numbers. Do tarah ke: <strong>weights</strong> (matrices ke numbers, jinse guna hota hai) aur <strong>bias</strong> (har output mein joda jaane wala ek extra number, jaise "+ 0.1").<br><strong>Kyun chahiye:</strong> yahi numbers training mein badalte hain; model ka saara "gyaan" inhi mein hai.<br><strong>Iske bina:</strong> model kuch seekh hi nahi sakta. Ginti se pata chalta hai model kitna bada, kitni memory lega.<br><strong>Example:</strong> 4 × 4 ki ek weight matrix = 16 parameters, uske saath 4 bias = 20.` },
    { type: 'p', html: `Neeche calculator mein numbers badlo. Ye GPT-2 jaisa decoder-only model maanta hai: learned positions, FFN = 4 × d_model, biases, aur output head embedding table ko hi reuse karta hai (<strong>weight tying</strong>). GPT-2 small preset pe total 12,44,39,808 (yaani 124.4 million) aata hai, jo GPT-2 small ke mashhoor "124M" se match karta hai.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">
          <button type="button" class="btn small ghost p-tiny">Tiny (hamara)</button>
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
          <div class="stat"><span>Embedding + position params</span><strong class="o-pe"></strong></div>
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
        q('.o-pe').textContent = f(emb + pos);
        q('.o-t').textContent = f(total);
        q('.o-note').innerHTML = 'Ek layer = attention ' + f(att) + ' (Wq, Wk, Wv, Wo: 4·d² + biases) + FFN ' + f(ffn) + ' (8·d² + biases) + LayerNorm ' + f(ln) + '. Layers mein ' + Math.round(100 * L * layer / total) + '% params hain.' + (n > C ? ' <strong>Warning:</strong> n context se bada hai, ye model itna lamba input nahi le sakta.' : '');
      };
      const preset = (a) => { ['.i-n', '.i-d', '.i-l', '.i-v', '.i-c'].forEach((c, i) => { q(c).value = a[i]; }); upd(); };
      q('.p-tiny').onclick = () => preset([3, 4, 1, 10, 8]);
      q('.p-g2').onclick = () => preset([3, 768, 12, 50257, 1024]);
      q('.p-xl').onclick = () => preset([3, 1600, 48, 50257, 1024]);
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Do baatein notice karo. (1) d_model double karo to har layer ke params lagbhag 4 guna (d² ki wajah se). (2) GPT-2 XL preset (d = 1,600, 48 layers) pe 1,55,76,11,200 (yaani ~1.56 billion) aata hai, jise GPT-2 ka "1.5B" model kehte hain. Tiny model mein sirf 324 params hain, jo hum haath se gin sakte hain.` },
    { type: 'h2', text: 'Teen families: encoder, decoder, dono' },
    { type: 'p', html: `2017 ka original model translation ke liye tha, isliye usme do hisse the: <strong>encoder</strong> (input sentence padhne ke liye) aur <strong>decoder</strong> (output sentence likhne ke liye). Baad mein log ek ek hissa alag nikaal ke use karne lage.` },
    { type: 'callout', tone: 'term', title: 'Naya word: encoder aur decoder', html: `<strong>Ye kya hai:</strong> <strong>Encoder</strong> = padhne wala hissa. Poora input ek saath padhta hai, har token <em>aage aur peeche dono</em> taraf dekh sakta hai (bidirectional). Output: har token ka samajhdaar vector. <strong>Decoder</strong> = likhne wala hissa. Ek ek token likhta hai, har token sirf <em>pichhle</em> tokens dekh sakta hai (causal mask).<br><strong>Kyun chahiye:</strong> translation mein pehle poora English sentence samajhna hai (encoder), phir Hindi ek ek word likhni hai (decoder).<br><strong>Iske bina:</strong> ek hi hissa dono kaam kare to ya to padhne mein aage-peeche dono taraf ka context kho jaata, ya likhte waqt future dikh jaata.` },
    { type: 'callout', tone: 'term', title: 'Naya word: cross-attention', html: `<strong>Ye kya hai:</strong> decoder ke andar ek extra attention, jisme decoder ke tokens <em>encoder ke output</em> ko dekhte hain. Sawaal (Q) decoder se, jawab dene wale (K, V) encoder se.<br><strong>Kyun chahiye:</strong> Hindi ka agla word likhte waqt decoder ko pata hona chahiye ki English sentence mein kya likha tha.<br><strong>Iske bina:</strong> decoder sirf apne likhe hue words dekhta, input sentence se uska koi rishta hi nahi rehta. Detail: <a href="#/ai-multihead">multi-head lesson</a>.` },
    { type: 'table', head: ['Family', 'Famous models', 'Attention', 'Training kaam', 'Kis kaam ke liye'], rows: [
      ['Encoder-only', 'BERT (2018), RoBERTa', 'Bidirectional (sab sabko dekhte hain)', 'Masked LM: beech ke kuch tokens chhupao, guess karo', 'Classification, search embeddings, spam/sentiment detection. Text generate nahi karta.'],
      ['Decoder-only', 'GPT series, Llama, Gemini (aaj ke zyada tar public chat LLMs)', 'Causal (sirf pichhle tokens)', 'Next token prediction', 'Chat, likhna, code, agents. Ek hi design se lagbhag har task, prompt ke through.'],
      ['Encoder-decoder', 'Original Transformer (2017), T5 (2019), BART', 'Encoder bidirectional + decoder causal + cross-attention', 'Input → output text (translation, "summarize: ...")', 'Translation, summarization, jahan input aur output saaf alag hain'],
    ]},
    { type: 'h3', text: 'Original 2017 model andar se: encoder + decoder' },
    { type: 'p', html: `Maan lo xyz.com ko video titles English se Hindi mein badalne hain. Title: <code>how to upload a video</code>. Original Transformer ye kaam aise karta:` },
    { type: 'steps', items: [
      { t: 'Encoder padhta hai', d: 'English tokens → embedding + PE → N encoder layers. Har layer: self-attention (bina mask, sab sabko dekhte hain) + FFN, dono ke saath Add & Norm. Output: har English token ka ek samajhdaar vector. Ye ek baar banta hai aur poore translation mein kaam aata hai.' },
      { t: 'Decoder shuru karta hai', d: 'Decoder ke paas abhi sirf ek special "start" token hai. Wo bhi embedding + PE se guzarta hai.' },
      { t: 'Decoder layer ke teen kaam', d: '(1) Masked self-attention: ab tak likhe Hindi tokens aapas mein dekhte hain, aage ka nahi. (2) Cross-attention: Hindi tokens encoder ke English vectors se poochhte hain "mujhe ab kaunsa English hissa translate karna hai?". (3) FFN. Har ek ke baad Add & Norm.' },
      { t: 'Agla Hindi token', d: 'Linear + Softmax se probabilities, ek token chuna ("video"). Use decoder ke input mein jodo, phir se decoder chalao. "end" token aane tak loop. Encoder dobara nahi chalta.' },
      { t: 'Training mein (shifted target)', d: 'Sahi Hindi sentence pehle se pata hai. Decoder ko wahi sentence ek jagah khiskaa ke diya jaata hai ("start" aage), aur har position ko agla word predict karna hota hai. Mask ki wajah se koi position aage ka word nahi dekh sakti, isliye saari positions ek saath train hoti hain.' },
    ]},
    { type: 'image', src: 'assets/img/ai-transformer-overview/transformer-full.png', maxWidth: 560, alt: 'Original Transformer ka poora architecture: left mein encoder stack (Embeddings, Positional Encoding, Norm, Multi-Headed Self-Attention, Feed-Forward Network, Nx layers), right mein decoder stack (Masked Multi-Headed Self-Attention, Multi-Headed Cross-Attention jisme V aur K encoder se aate hain, Feed-Forward, Nx layers), upar Linear aur Predictions.', caption: 'Encoder (left) aur decoder (right). Encoder ka output decoder ke cross-attention mein K aur V banke jaata hai; Q decoder se aata hai. Har "+" ek residual connection hai. Dhyaan do: is figure mein Norm har sublayer se <em>pehle</em> hai (pre-norm, aaj ka common tareeka); 2017 ke paper mein Norm baad mein tha.', credit: { text: 'dvgodoy (Deep Learning Visuals), Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Transformer,_full_architecture.png', license: 'CC BY 4.0' } },
    { type: 'p', html: `Decoder-only (GPT) isi picture ka right hissa hai, bas <strong>cross-attention hata do</strong> (koi encoder hi nahi) aur input = prompt + ab tak likha jawab. Encoder-only (BERT) left hissa hai, upar ek chhota "classifier" head ke saath.` },
    { type: 'p', html: `xyz.com ke liye mapping: help-docs ko search ke liye vectors mein badalna (embedding model) aksar <strong>encoder</strong> type model se hota hai. "xyz Assistant" ka chat jawab <strong>decoder-only</strong> LLM deta hai. Video titles ka Hindi → English translation ek <strong>encoder-decoder</strong> model se bhi ho sakta hai, lekin aaj bade decoder-only LLM bhi ye achha kar lete hain.` },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `• Text ko <strong>samajhna / classify / search vector</strong> banana hai, aur sasta, fast chahiye → encoder-only (BERT jaisa, ya koi embedding model).<br>• <strong>Text generate</strong> karna hai, chat, code, tools, agents → decoder-only LLM (aaj ka default).<br>• Fixed input → fixed output transformation (translation, summarization) at scale, chhote model mein → encoder-decoder (T5 jaisa) achha option.<br>Rule of thumb: naya general-purpose product? Decoder-only se shuru karo. Bahut zyada volume ka simple classification? Chhota encoder model sasta padega.` },

    { type: 'h2', text: 'Common confusion' },
    { type: 'callout', tone: 'mistake', title: '"Transformer parallel hai, to jawab bhi ek baar mein aata hai"', html: `Nahi. <strong>Training</strong> aur <strong>prompt padhna</strong> (prefill) parallel hain: saare known tokens ek saath. Lekin <strong>jawab likhna</strong> (generation) ab bhi ek token at a time hai, kyunki agla token tab tak pata hi nahi jab tak pichhla chuna na jaaye. Isliye ChatGPT/Claude ka jawab type hota hua dikhta hai. (Speed tricks jaise KV cache: <a href="#/ai-multihead">multi-head lesson</a>.)` },
    { type: 'callout', tone: 'mistake', title: '"N layers matlab N alag kaam"', html: `Har layer ka design bilkul same hai (attention + FFN + 2 Add & Norm). Farak sirf seekhe hue weights ka hai. Research mein dikhta hai ki shuru ki layers zyada tar basic patterns (paas ke words, grammar) aur baad ki layers zyada abstract cheezein pakadti hain, lekin ye kisi ne haath se nahi likha: training ne apne aap seekha.` },
    { type: 'callout', tone: 'mistake', title: '"Attention = poora model"', html: `Naam "Attention Is All You Need" hai, lekin FFN, residual, LayerNorm, embeddings bhi zaroori hain. Upar ke calculator mein GPT-2 small ke 85M layer params mein se zyada tar FFN mein hain (har layer: FFN 8·d² vs attention 4·d²).` },

    { type: 'h2', text: 'Poori picture' },
    { type: 'p', html: `Neeche original Transformer (encoder-decoder) ka poora stack hai, xyz.com ke title translation wale example ke saath. Buttons se ek ek raasta dekho. GPT jaise decoder-only model mein left wala encoder aur cross-attention nahi hote; baaki right column bilkul aisa hi hai.` },
    { type: 'diagram', title: 'Transformer: poori picture', height: 640,
      groups: [
        { label: 'Encoder layer × N', x: 55, y: 232, w: 220, h: 212 },
        { label: 'Decoder layer × N', x: 435, y: 158, w: 275, h: 300 },
      ],
      nodes: [
        { id: 'src', label: 'English tokens', sub: 'how to upload a video', x: 165, y: 600, w: 190, kind: 'client', info: 'Ye kya hai: input sentence ke tokens (ids). Encoder-decoder model mein ye "source" hai, jaise translate hone wala English title.' },
        { id: 'eemb', label: 'Embedding + PE', sub: 'n × d_model', x: 165, y: 505, w: 190, kind: 'data', info: 'Ye kya hai: har id ka embedding vector plus uski position ka vector. Yahan se har token ek d_model size ki row hai.' },
        { id: 'eatt', label: 'Self-attention', sub: 'no mask + Add & Norm', x: 165, y: 400, w: 190, kind: 'server', info: 'Ye kya hai: encoder ka attention. Koi mask nahi: har English token aage aur peeche dono taraf ke tokens dekh sakta hai. Phir residual + LayerNorm.' },
        { id: 'effn', label: 'Feed-forward', sub: '+ Add & Norm', x: 165, y: 300, w: 190, kind: 'server', info: 'Ye kya hai: har token pe alag chalne wala chhota network (bada karo, ReLU, chhota karo). Attention + FFN = ek encoder layer, jo N baar repeat hoti hai (paper mein 6).' },
        { id: 'eout', label: 'Encoder output', sub: 'har token ka vector', x: 165, y: 140, w: 190, kind: 'cache', info: 'Ye kya hai: aakhri encoder layer ke vectors, har English token ka ek. Ye ek hi baar banta hai, aur decoder ki har layer ka cross-attention isi ko K aur V ke roop mein dekhta hai.' },
        { id: 'tgt', label: 'Hindi tokens ab tak', sub: 'start, video, ...', x: 545, y: 600, w: 190, kind: 'client', info: 'Ye kya hai: decoder ka input: ab tak likhe gaye output tokens (shuru mein sirf "start"). Decoder-only model (GPT) mein yahan prompt + ab tak ka jawab hota hai.' },
        { id: 'demb', label: 'Embedding + PE', sub: 'n × d_model', x: 545, y: 505, w: 190, kind: 'data', info: 'Ye kya hai: decoder ki taraf ka embedding + position. Original paper mein encoder, decoder aur output head ek hi embedding matrix share karte the.' },
        { id: 'datt', label: 'Masked self-attn', sub: 'sirf pichhle tokens', x: 545, y: 410, w: 190, kind: 'server', info: 'Ye kya hai: decoder ka self-attention, causal mask ke saath. Har Hindi token sirf apne se pehle wale tokens dekh sakta hai, taaki training mein aage ka word copy na ho.' },
        { id: 'dx', label: 'Cross-attention', sub: 'Q dec, K V enc', x: 545, y: 315, w: 190, kind: 'queue', info: 'Ye kya hai: decoder ka "input sentence dekhne" wala attention. Query decoder ke tokens se, Key aur Value encoder output se. Isi se decoder jaanta hai ki ab English ka kaunsa hissa translate karna hai.' },
        { id: 'dffn', label: 'Feed-forward', sub: '+ Add & Norm', x: 545, y: 220, w: 190, kind: 'server', info: 'Ye kya hai: decoder layer ka FFN. Masked self-attention + cross-attention + FFN (har ek ke baad Add & Norm) = ek decoder layer, N baar.' },
        { id: 'head', label: 'Linear + Softmax', sub: 'vocab probabilities', x: 545, y: 115, w: 190, kind: 'edge', info: 'Ye kya hai: output head. Aakhri position ka vector vocab_size logits mein, softmax se probabilities.' },
        { id: 'nxt', label: 'Agla token', sub: '"video"', x: 545, y: 35, w: 190, kind: 'queue', info: 'Ye kya hai: chuna gaya token. Ise decoder ke input mein jodo aur decoder phir chalao (autoregressive), "end" token aane tak. Encoder dobara nahi chalta.' },
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
        { name: 'Encoder path', text: 'English title ek saath andar: embedding + PE, phir N layers (bina mask ka self-attention + FFN). Result: har English token ka context wala vector.', go: ['src>eemb>eatt>effn>eout'] },
        { name: 'Decoder path', text: 'Ab tak likhe Hindi tokens: embedding + PE, masked self-attention, cross-attention, FFN, phir Linear + Softmax se agla token. Token input mein juda, loop phir se.', go: ['tgt>demb>datt>dx>dffn>head>nxt', 'nxt>tgt'] },
        { name: 'Cross-attention', text: 'Decoder ka sawaal (Q) masked self-attention se aata hai; jawab dene wale K aur V encoder output se. Yahi encoder aur decoder ko jodne wala pul hai. GPT mein ye hissa hota hi nahi.', go: ['eout>dx', 'datt>dx'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Transformer = tokens → embedding + position → N baar [attention, Add & Norm, FFN, Add & Norm] → Linear → Softmax → agla token.</li>
      <li>RNN ek ek token line mein padhta tha (slow, bhulakkad). Transformer saare tokens ek saath dekhta hai: 1 hop mein koi bhi token kisi bhi token tak.</li>
      <li>Maths bas matrix guna hai: (a × b)·(b × c) = (a × c), har cell ek dot product.</li>
      <li>Har layer ke bahar shape hamesha n × d_model. Andar: scores n × n, FFN 4 × d_model.</li>
      <li>Attention tokens ke beech info mix karta hai; FFN har token ke andar process karta hai; residual + LayerNorm deep stack ko stable rakhte hain.</li>
      <li>Teen families: encoder-only (BERT, samajhna), decoder-only (GPT, likhna), encoder-decoder (T5, translation), jinhe cross-attention jodta hai.</li>
      <li>Training aur prompt padhna parallel; jawab likhna ab bhi token-by-token. Attention ka cost n² badhta hai.</li>
    </ul>` },
    { type: 'tradeoffs', gains: [
      'Training parallel: GPU poori tarah use, bade data pe train karna sambhav',
      'Long-range context: koi bhi token kisi bhi token ko 1 hop mein dekh sakta hai',
      'Ek hi simple block repeat: scale karna aasaan (layers, d_model badhao)',
      'Ek design teen kaam: encoder, decoder, encoder-decoder',
    ], costs: [
      'Attention ka cost n² hai: context double, scores 4 guna (memory aur compute)',
      'Fixed context window: usse lamba input seedha nahi le sakta',
      'Order khud nahi samajhta, positional encoding chahiye',
      'Generation phir bhi token-by-token (sequential), latency user ko dikhti hai',
      'Bahut saara data aur GPU chahiye; params billions mein',
    ]},
    { type: 'think', questions: [
      { q: 'xyz.com ko roz 1 crore comments ko "spam / not spam" mein classify karna hai. Bada decoder-only chat LLM lagayein ya chhota encoder model? Kyun?', a: 'Chhota encoder-only model (BERT jaisa, fine-tuned) aksar behtar: kaam sirf samajhna hai, generate nahi; bidirectional context milta hai; bahut sasta aur fast hai. Bada LLM bhi kar lega, lekin 1 crore/day pe cost aur latency kaafi zyada hogi.' },
      { q: 'Prompt 2,000 tokens se 4,000 tokens ka ho gaya. Attention ke scores kitne guna badhe? FFN ka kaam kitne guna?', a: 'Scores n × n hain, to 4 guna (2² = 4). FFN har token pe alag chalta hai, to sirf 2 guna. Isliye lambe context mein attention sabse mehnga hissa ban jaata hai.' },
      { q: 'Agar residual connection hata dein to 48 layers ka model train karne mein kya dikkat aayegi?', a: 'Har layer ko input poora dobara banana padega aur training signal (gradient) itni layers se guzarte hue kamzor ho sakta hai, RNN ki vanishing problem jaisa. Residual ek "seedha raasta" deta hai jisse info aur gradient dono aasani se bahte hain.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'RNN ke muqable Transformer training mein fast kyun hai?', options: ['Usme parameters kam hote hain', 'Saare tokens ek saath (parallel) process hote hain, step-by-step wait nahi', 'Wo GPU use nahi karta'], answer: 1, explain: 'RNN mein step t, step t−1 ka wait karta hai. Transformer ek layer mein saare tokens ek saath process karta hai, jo GPU ke liye perfect hai.' },
      { q: 'Har Transformer layer ke bahar token vectors ka shape kya hota hai?', options: ['n × n', 'n × d_model', 'n × vocab'], answer: 1, explain: 'Andar shape badalti hai (n × n scores, 4·d FFN), lekin har layer n × d_model leti aur deti hai. Isi se layers stack hoti hain aur residual jud paata hai.' },
      { q: 'BERT kis family ka hai aur kis kaam ke liye zyada theek hai?', options: ['Decoder-only, chat ke liye', 'Encoder-only, classification aur search embeddings ke liye', 'Encoder-decoder, translation ke liye'], answer: 1, explain: 'BERT encoder-only hai: bidirectional attention, masked-token training. Samajhne wale kaam (classify, embed) mein achha, text generation ke liye nahi bana.' },
      { q: 'Transformer parallel hai, phir bhi ChatGPT ka jawab word-by-word kyun aata hai?', options: ['Network slow hai', 'Generation autoregressive hai: agla token pichhle chune gaye token pe depend karta hai', 'UI animation ke liye jaan boojh ke'], answer: 1, explain: 'Prompt ek saath padha jaata hai, lekin har naya token pichhle output ke baad hi ban sakta hai. Isliye token-by-token streaming.' },
      { q: 'Linear + Softmax head ka output kya hai?', options: ['Agla token ka embedding', 'Vocab ke har token ki probability', 'Attention weights'], answer: 1, explain: 'Linear layer d_model vector ko vocab_size logits mein badalta hai, softmax unhe probabilities banata hai, jinse agla token chuna jaata hai.' },
    ]},
    { type: 'sources', note: 'Numbers (BLEU, training time, base hyperparameters, GPT-2 sizes) inhi papers/repos se hain. Parameter counts humne GPT-2 jaise layout ke formula se node script mein calculate karke match kiye.', items: [
      { title: 'Attention Is All You Need', publisher: 'Vaswani et al., Google Brain / Google Research (arXiv 1706.03762, NeurIPS 2017)', year: 2017, official: true, url: 'https://arxiv.org/abs/1706.03762', used: 'Block diagram, encoder-decoder, N=6, d_model=512, d_ff=2048, h=8, BLEU 28.4/41.8, 3.5 days on 8 GPUs, O(1) vs O(n) sequential ops and path length, decoder masking, shared embedding/output weights.' },
      { title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding', publisher: 'Devlin et al., Google AI Language (arXiv 1810.04805)', year: 2018, official: true, url: 'https://arxiv.org/abs/1810.04805', used: 'Encoder-only, bidirectional attention, masked language modelling.' },
      { title: 'Language Models are Unsupervised Multitask Learners (GPT-2)', publisher: 'Radford et al., OpenAI', year: 2019, official: true, url: 'https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf', used: 'Decoder-only design, pre-norm LayerNorm placement, vocab 50,257, context 1,024, model sizes (smallest 768-dim 12 layers, largest 1,600-dim 48 layers).' },
      { title: 'Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer (T5)', publisher: 'Raffel et al., Google (arXiv 1910.10683)', year: 2019, official: true, url: 'https://arxiv.org/abs/1910.10683', used: 'Encoder-decoder family example, text-to-text framing.' },
      { title: 'Transformers Explained | Simple Explanation of Transformers (video)', publisher: 'codebasics (YouTube)', year: 2025, url: 'https://www.youtube.com/watch?v=ZhAz268Hdpw', used: 'Learner reference video; its chapter list (word vs contextual embeddings, encoder-decoder, positional embeddings, attention, multi-head, decoder) was used as a coverage checklist.' },
      { title: 'Transformer Explainer', publisher: 'Polo Club of Data Science, Georgia Tech', year: 2024, url: 'https://poloclub.github.io/transformer-explainer/', used: 'Visual cross-check of the GPT-2 small data path and shapes.' },
    ]},
  ],
});
