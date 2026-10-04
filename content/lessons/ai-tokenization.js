Lesson.register({
  id: 'ai-tokenization',
  title: 'Tokens, tokenization aur embeddings',
  minutes: 34,
  summary: `Model sirf numbers samajhta hai. Text ko numbers mein kaise badlein? Is lesson mein: tokens kya hain, BPE, WordPiece aur Unigram/SentencePiece khud chala ke dekho, vocab aur token IDs, Hindi/Hinglish zyada tokens kyun khaate hain (asli tokenizers ke numbers ke saath), aur token ID se embedding vector tak ka safar, cosine similarity ke saath.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Computer ke andar LLM sirf numbers ke saath maths kar sakta hai. Wo "video" jaisa word seedha nahi padh sakta.<br>To pehle text ko chhote tukdon (<strong>tokens</strong>) mein kaatna padta hai, aur har tukde ko ek number dena padta hai. Jaise school mein har student ka roll number.<br>Phir har number ko numbers ki ek list (<strong>embedding</strong>) milti hai jo uska "matlab" pakadti hai.<br>Is lesson mein dekhenge: text kaise kat-ta hai (BPE, WordPiece, Unigram), Hindi zyada tokens kyun khaati hai, isse bill kaise badhta hai, aur matlab numbers mein kaise aata hai.` },

    { type: 'h2', text: 'Problem: model ko text nahi, numbers chahiye' },
    { type: 'p', html: `<a href="#/ai-what-is-llm">Pichhle lesson</a> mein xyz Assistant ne "agla token" guess kiya. Lekin model andar se sirf maths hai: matrix multiply, add, softmax. "Video upload nahi ho raha" jaisa text seedha maths mein nahi ja sakta. Pehle text ko <strong>numbers ki list</strong> banana padega, aur answer ke numbers ko wapas text.` },
    { type: 'p', html: `Sawaal ye hai ki text ko <em>kis size ke tukdon</em> mein todein. Teen options hain, aur teeno ki apni problem hai.` },
    { type: 'table', head: ['Option', 'Example: "uploading videos"', 'Problem'], rows: [
      ['Characters', 'u, p, l, o, a, d, i, n, g, ␣, v, i, d, e, o, s (16 pieces)', 'Sequence bahut lamba. Model ko har baar "u-p-l-o-a-d" se "upload" ka matlab khud jodna padega. Lamba sequence = zyada compute, zyada time.'],
      ['Words', 'uploading, videos (2 pieces)', 'Vocabulary anant: har naam, typo, Hinglish word ("uploadkiya"), naya slang alag entry. Jo word list mein nahi wo <code>[UNK]</code> (unknown) ban jaata hai: meaning gayab.'],
      ['Subwords (tokens)', 'upload, ing, ␣videos (3 pieces)', 'Beech ka raasta. Common words poore, rare words jaane-pehchaane tukdon mein. Koi word "unknown" nahi rehta. Yahi aaj sab LLM use karte hain.'],
    ], caption: 'Subword wali row OpenAI ke o200k_base tokenizer ka asli split hai (tiktoken se check kiya).' },
    { type: 'callout', tone: 'term', title: 'Naya word: Token', html: `<strong>Ye kya hai:</strong> text ka wo tukda jise model ek unit maanta hai. Poora word (" video"), word ka hissa ("ization"), punctuation ("?"), ya ek byte bhi ho sakta hai. Model ki duniya mein text = tokens ki line.<br><strong>Kyun chahiye:</strong> upar ki table dekho: characters se line bahut lambi, words se list anant. Tokens dono ke beech ka balance hain.<br><strong>Iske bina:</strong> ya to model bahut slow (character-level), ya naye words pe andha (word-level, [UNK]).` },
    { type: 'callout', tone: 'term', title: 'Naya word: Tokenizer', html: `<strong>Ye kya hai:</strong> wo program jo text ko tokens mein todta hai aur har token ko uska number (token ID) deta hai. Ulta bhi karta hai: IDs se wapas text (<strong>decode</strong>).<br><strong>Kyun chahiye:</strong> model ke andar sirf numbers jaate hain. Text aur numbers ke beech ka translator yahi hai.<br><strong>Iske bina:</strong> model tak text pahunch hi nahi sakta, aur model ke output numbers wapas text nahi ban sakte.<br>Har model family ka apna tokenizer hota hai, aur model hamesha usi tokenizer ke saath chalta hai jiske saath train hua tha.` },

    { type: 'h2', text: 'Asli example: tokens aur token IDs' },
    { type: 'p', html: `Ye OpenAI ke <code>o200k_base</code> tokenizer (GPT-4o family) ka asli output hai, <code>tiktoken</code> library se nikala:` },
    { type: 'table', head: ['Token', 'ID'], rows: [
      ['"How"', '5299'], ['" do"', '621'], ['" I"', '357'], ['" upload"', '12053'], ['" a"', '261'],
      ['" video"', '3823'], ['" on"', '402'], ['" xyz"', '82501'], ['".com"', '1136'], ['"?"', '30'],
    ], caption: '"How do I upload a video on xyz.com?" = 35 characters, 10 tokens. Model ko asal mein sirf [5299, 621, 357, 12053, 261, 3823, 402, 82501, 1136, 30] dikhta hai.' },
    { type: 'list', items: [
      `<strong>Space token ka hissa hai.</strong> <code>" video"</code> (aage space) ka ID 3823 hai, lekin bina space wala <code>"video"</code> 17615, <code>" Video"</code> 11080, aur <code>"VIDEO"</code> 81385. Model ke liye ye chaar alag tokens hain.`,
      `<strong>Common words = ek token.</strong> " upload", " video" poore ek token. Rare cheezein tootti hain: "xyz.com" do tokens mein (" xyz" + ".com").`,
      `<strong>Rule of thumb (English):</strong> 1 token ≈ 4 characters ≈ ¾ word. Yahan 35 / 10 = 3.5 characters per token, kaafi paas.`,
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: Vocabulary (vocab) aur Token ID', html: `<strong>Ye kya hai:</strong> <strong>vocabulary</strong> = tokenizer ke saare tokens ki fixed list. Har token ka list mein ek number hota hai: <strong>token ID</strong> (jaise roll number). o200k_base mein ~2 lakh tokens hain, to IDs 0 se ~200,000 tak.<br><strong>Kyun chahiye:</strong> model ko ek fixed "menu" chahiye. Model ka aakhri layer bhi exactly isi list ke har token ke liye ek logit (score) deta hai.<br><strong>Iske bina:</strong> na input ke liye numbers, na output ke liye options.` },

    { type: 'h2', text: 'BPE: tokens ki list banti kaise hai?' },
    { type: 'p', html: `~2 lakh tokens ki list kisi insaan ne haath se nahi likhi. Ek algorithm ne text dekh ke khud banayi. Sabse popular algorithm hai <strong>BPE</strong>. GPT-2, GPT-4o, Llama 3: sab BPE ke variants use karte hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: BPE (Byte Pair Encoding)', html: `<strong>Ye kya hai:</strong> tokens ki list banane ka ek algorithm. Sabse chhote pieces (characters) se shuru karo. Jo do pieces sabse zyada baar saath aate hain, unhe jod ke ek naya token bana do. Ye baar baar karo.<br><strong>Kyun chahiye:</strong> 2 lakh tokens haath se koi nahi chun sakta. BPE data dekh ke khud tay karta hai ki kaunse tukde itne common hain ki unhe ek token bana dena chahiye.<br><strong>Iske bina:</strong> ya to bas characters (lambi line), ya bas poore words (anant list).<br><strong>History:</strong> BPE asal mein 1994 ka ek data compression trick tha. 2016 mein Sennrich aur saathiyon ne ise translation models ke liye words todne mein use kiya.` },
    { type: 'steps', items: [
      { t: 'Pre-tokenize', d: 'Text ko pehle mote taur pe words mein todo (spaces aur punctuation pe) aur har word kitni baar aaya, gino. Ise pre-tokenization kehte hain: asli tokenization se pehle ka mota kaatna. Iska faayda: merge kabhi do words ke beech nahi hota.' },
      { t: 'Base vocab', d: 'Har word ko characters mein todo. Saare alag characters = shuruaati vocabulary.' },
      { t: 'Pairs gino', d: 'Har word ke andar har padosi pair (jaise "v"+"i") kitni baar aata hai, word ki frequency ke saath gino.' },
      { t: 'Sabse common pair merge karo', d: 'Wo pair ek naya token ban jaata hai ("vi"). Ye merge rule list mein yaad rakho (order important hai).' },
      { t: 'Repeat', d: 'Jab tak vocab target size tak na pahunche (GPT-2 ke liye ~50 hazaar, aaj ke models ke liye 1-2 lakh).' },
    ]},
    { type: 'p', html: `Khud chala ke dekho. "xyz corpus" mein xyz.com ke kuch words hain (video ×8, videos ×5, view ×6, views ×4, review ×3, upload ×5, uploads ×3). "HF corpus" Hugging Face course ka classic example hai. "Agla merge" dabao aur dekho kaunsa pair kyun chuna gaya:` },
    { type: 'custom', render(el) {
      const CORP = { xyz: [['video', 8], ['videos', 5], ['view', 6], ['views', 4], ['review', 3], ['upload', 5], ['uploads', 3]],
        hf: [['hug', 10], ['pug', 5], ['pun', 12], ['bun', 4], ['hugs', 5]] };
      let ck = 'xyz', words, merges, base;
      el.innerHTML = `<div class="chips" style="margin-bottom:8px"><button type="button" class="chip on bC" data-k="xyz">xyz corpus</button><button type="button" class="chip bC" data-k="hf">HF corpus</button></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><button type="button" class="btn small primary bN">Agla merge</button><button type="button" class="btn small ghost b5">5 merges</button><button type="button" class="btn small ghost bR">Reset</button></div>
        <div class="bW" style="display:grid;gap:6px"></div>
        <div class="bP calc-note"></div>
        <div class="stats"><div class="stat"><span>Merges ho gaye</span><strong class="bM"></strong></div><div class="stat"><span>Vocab size</span><strong class="bV"></strong></div><div class="stat"><span>Total tokens (corpus)</span><strong class="bT"></strong></div></div>
        <div class="bL" style="font-family:var(--f-mono);font-size:13px;color:var(--ink-2);margin:8px 0;word-break:break-word"></div>
        <label>Naya word encode karo (seekhe hue merges se):</label><input class="bE" type="text" value="viewed" maxlength="20" style="max-width:240px">
        <div class="bO" style="margin-top:8px"></div>`;
      const q = s => el.querySelector(s);
      const chip = (t, bad) => `<span style="display:inline-block;padding:2px 7px;margin:2px;border-radius:var(--r-sm);font-family:var(--f-mono);font-size:13px;background:${bad ? 'var(--red)' : 'var(--accent-soft)'};color:${bad ? 'var(--bg)' : 'var(--accent-ink)'};border:1px solid var(--line)">${t}</span>`;
      const pairs = () => { const c = new Map(); words.forEach(w => { for (let i = 0; i < w.t.length - 1; i++) { const k = w.t[i] + '\u0000' + w.t[i + 1]; c.set(k, (c.get(k) || 0) + w.f); } }); return c; };
      const best = c => { let b = null, bc = -1; [...c.keys()].sort().forEach(k => { if (c.get(k) > bc) { bc = c.get(k); b = k; } }); return b; };
      const apply = (t, a, b) => { const n = []; for (let i = 0; i < t.length; i++) { if (i < t.length - 1 && t[i] === a && t[i + 1] === b) { n.push(a + b); i++; } else n.push(t[i]); } return n; };
      const reset = () => { words = CORP[ck].map(([w, f]) => ({ w, f, t: [...w] })); merges = []; base = new Set(); words.forEach(w => w.t.forEach(ch => base.add(ch))); draw(); };
      const step = () => { const c = pairs(); if (!c.size) return; const k = best(c); const [a, b] = k.split('\u0000'); merges.push([a, b, c.get(k)]); words.forEach(w => { w.t = apply(w.t, a, b); }); draw(); };
      const draw = () => {
        q('.bW').innerHTML = words.map(w => `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap"><code style="min-width:70px">${w.w} ×${w.f}</code><span>${w.t.map(x => chip(x)).join('')}</span></div>`).join('');
        const c = pairs(); const top = [...c.entries()].sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1)).slice(0, 4);
        q('.bP').innerHTML = top.length ? 'Agle merge ke candidates (pair: count): ' + top.map(([k, v], i) => `<strong style="color:${i === 0 ? 'var(--accent-ink)' : 'var(--ink-2)'}">${k.replace('\u0000', ' + ')}: ${v}</strong>`).join(', ') + '. Barabar count pe alphabetically pehla pair chuna jaata hai.' : 'Har word ab ek hi token hai. Aur merge possible nahi.';
        q('.bM').textContent = merges.length; q('.bV').textContent = base.size + merges.length;
        q('.bT').textContent = words.reduce((s, w) => s + w.t.length * w.f, 0);
        q('.bL').textContent = merges.length ? 'Merge rules: ' + merges.map((m, i) => `${i + 1}) ${m[0]}+${m[1]}→${m[0] + m[1]} (${m[2]})`).join('  ') : 'Merge rules: (abhi koi nahi)';
        const inp = (q('.bE').value || '').toLowerCase(); let t = [...inp]; merges.forEach(([a, b]) => { t = apply(t, a, b); });
        const unk = t.filter(x => x.length === 1 && !base.has(x)).length;
        q('.bO').innerHTML = (t.length ? t.map(x => chip(x, x.length === 1 && !base.has(x))).join('') : '') + `<div class="calc-note">${t.length} tokens.${unk ? ` Laal = character jo is chhote corpus mein kabhi dikha hi nahi: character-level BPE mein ye [UNK] banta. Byte-level BPE (GPT-2 se) mein aisa nahi hota, neeche dekho.` : ''}</div>`;
      };
      el.querySelectorAll('.bC').forEach(b => b.onclick = () => { ck = b.dataset.k; el.querySelectorAll('.bC').forEach(x => x.classList.toggle('on', x === b)); q('.bE').value = ck === 'xyz' ? 'viewed' : 'bug'; reset(); });
      q('.bN').onclick = step; q('.b5').onclick = () => { for (let i = 0; i < 5; i++) step(); }; q('.bR').onclick = reset;
      q('.bE').addEventListener('input', draw); reset();
    }},

    { type: 'p', html: `xyz corpus mein kya hua, dekho: pehla merge <code>v+i</code> hai kyunki "vi" video, videos, view, views aur review sab mein aata hai: 8+5+6+4+3 = 26 baar. 12 merges ke baad "video", "view", "upload" poore tokens ban gaye, vocab 12 se 24 ho gaya, aur poore corpus ke tokens 183 se ghat ke 47 reh gaye. <strong>Yahi BPE ka faayda hai: common cheezein chhoti ho jaati hain.</strong> HF corpus mein pehle teen merges u+g (20), u+n (16), h+ug (15) hain, bilkul Hugging Face course jaise.` },
    { type: 'p', html: `Ab encode box mein "viewed" likho: <code>view · e · d</code>. Ye word corpus mein tha hi nahi, phir bhi toot ke jaane-pehchaane pieces mein aa gaya. "uploaded" try karo: <code>u · p · lo · a · de · d</code>. Ajeeb split! Kyunki merges <em>usi order</em> mein lagte hain jisme seekhe gaye the, aur "d+e" wala merge "a+d" se pehle seekha gaya tha. Asli tokenizers ke ajeeb splits ki wajah yahi hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Byte aur UTF-8', html: `<strong>Ye kya hai:</strong> computer har text ko <strong>bytes</strong> mein rakhta hai. Ek byte = 0 se 255 tak ka ek number. <strong>UTF-8</strong> wo rule hai jo batata hai ki kaunsa character kaunse bytes banega. English letter = 1 byte, Devanagari akshar (जैसे "म") = 3 bytes, emoji (🚀) = 4 bytes.<br><strong>Kyun chahiye:</strong> duniya ki har language, har emoji, sab isi ek tareeke se likha jaata hai. Sirf 256 alag bytes hote hain.<br><strong>Iske bina:</strong> har language ke liye alag system hota, aur tokenizer ko har naye character ke liye alag entry chahiye hoti.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Byte-level BPE (koi word "unknown" nahi)', html: `<strong>Ye kya hai:</strong> BPE jo characters ki jagah <strong>bytes</strong> se shuru karta hai. Base vocab = sirf 256 bytes. Merges unke upar bante hain. GPT-2 (2019) ne ye shuru kiya, aaj GPT-4o aur Llama 3 dono byte-level BPE use karte hain.<br><strong>Kyun chahiye:</strong> widget mein "vlog" likho to "g" laal dikhega: wo character chhote corpus mein tha hi nahi. Character-level BPE mein ye [UNK] (unknown) banta, aur matlab gayab. Bytes se shuru karo to koi bhi text (Hindi, emoji, Chinese) kabhi unknown nahi hota. Worst case wo bytes mein toot jaata hai.<br><strong>Iske bina:</strong> naya emoji ya rare script aate hi [UNK], aur model us hisse ko dekh hi nahi paata.` },
    { type: 'table', head: ['Tokenizer / model', 'Vocab size', 'Note'], rows: [
      ['GPT-2 (2019)', '50,257', '50,000 merges + 256 bytes + 1 end-of-text token'],
      ['cl100k_base (GPT-4, GPT-3.5)', '~100k', 'tiktoken ka encoding'],
      ['o200k_base (GPT-4o family)', '~200k', 'Non-English languages ke liye kaafi behtar (neeche numbers)'],
      ['Llama 2 (2023)', '32,000', 'SentencePiece BPE'],
      ['Llama 3 (2024)', '128,256', 'tiktoken-style byte-level BPE; Meta ke mutabik text kam tokens mein encode hota hai'],
    ]},
    { type: 'h2', text: 'BPE ke bhai-behen: WordPiece, Unigram aur SentencePiece' },
    { type: 'p', html: `BPE akela tareeka nahi hai. Do aur naam bahut sunoge: <strong>WordPiece</strong> (BERT ka tokenizer) aur <strong>Unigram</strong> (T5 jaise models, <strong>SentencePiece</strong> library ke through). Teeno ka idea same hai: subwords. Farq do jagah hai: (1) <em>training</em> mein kaunsa tukda vocab mein aaye, ye kaise tay hota hai, aur (2) <em>encoding</em> mein naya word kaise kaata jaata hai. Har ek ko apne worked example aur widget ke saath dekhte hain.` },

    { type: 'h3', text: 'WordPiece: "sabse common" nahi, "sabse khaas" pair' },
    { type: 'callout', tone: 'term', title: 'Naya word: WordPiece', html: `<strong>Ye kya hai:</strong> BPE jaisa merge wala algorithm, jo Google ne banaya aur BERT (2018) mein mashhoor hua. Do farq: (1) word ke beech ke pieces pe <code>##</code> lagta hai ("hugs" = <code>h ##u ##g ##s</code>), taaki pata rahe ki ye word ki shuruaat nahi hai. (2) Merge ka chunaav <strong>score</strong> se hota hai: <code>score = pair kitni baar aaya ÷ (A kitni baar × B kitni baar)</code>.<br><strong>Kyun chahiye:</strong> BPE bas sabse common pair jodta hai, chaahe uske dono pieces har jagah dikhte hon. WordPiece un pairs ko pehle jodta hai jinke pieces <em>akele</em> kam aate hain, lekin saath mein aksar aate hain. Ye "asli jodi" pakadta hai.<br><strong>Iske bina:</strong> bahut common pieces (jaise "##u") har pair mein ghus ke pehle merge ho jaate, chaahe un merges se kuch khaas na mile.` },
    { type: 'p', html: `<strong>Worked example (HF corpus: hug ×10, pug ×5, pun ×12, bun ×4, hugs ×5):</strong> sabse common pair <code>##u + ##g</code> hai (20 baar). Lekin "##u" akela 36 baar aata hai, "##g" 20 baar. Score = 20 ÷ (36 × 20) = <strong>0.0278</strong>. Ab <code>##g + ##s</code> dekho: sirf 5 baar, lekin "##s" bhi akela sirf 5 baar aata hai. Score = 5 ÷ (20 × 5) = <strong>0.0500</strong>. Jeet gaya! WordPiece ka pehla merge <code>##gs</code> hai, jabki BPE ka pehla merge u+g tha.<br>Doosre step pe "##u" wale saare pairs ka score barabar (0.0278) hai, to jo pair corpus mein pehle aaya (<code>h + ##u</code>) wo chuna jaata hai. Teesra: <code>hu + ##gs</code> (5 ÷ (15 × 5) = 0.0667) jeet-ta hai <code>hu + ##g</code> (10 ÷ (15 × 15) = 0.0444) se.` },
    { type: 'p', html: `<strong>Encoding bhi alag hai.</strong> WordPiece merge rules yaad nahi rakhta, sirf final vocab. Naya word aaye to <strong>shuru se sabse lamba piece</strong> dhoondho jo vocab mein ho, kaato, aur baaki pe yahi dohrao (<em>longest match first</em>). Aur agar kahin koi piece na mile to <strong>poora word</strong> <code>[UNK]</code> ban jaata hai, sirf ek character nahi. Khud chala ke dekho:` },
    { type: 'custom', render(el) {
      const CORP = { hf: [['hug', 10], ['pug', 5], ['pun', 12], ['bun', 4], ['hugs', 5]],
        xyz: [['video', 8], ['videos', 5], ['view', 6], ['views', 4], ['review', 3], ['upload', 5], ['uploads', 3]] };
      let ck = 'hf', words, merges, vocab;
      el.innerHTML = `<div class="chips" style="margin-bottom:8px"><button type="button" class="chip on wC" data-k="hf">HF corpus</button><button type="button" class="chip wC" data-k="xyz">xyz corpus</button></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><button type="button" class="btn small primary wN">Agla merge</button><button type="button" class="btn small ghost w3">3 merges</button><button type="button" class="btn small ghost wR">Reset</button></div>
        <div class="wW" style="display:grid;gap:6px"></div>
        <div style="overflow-x:auto;margin-top:10px"><table class="wT"></table></div>
        <div class="stats"><div class="stat"><span>Merges ho gaye</span><strong class="wM"></strong></div><div class="stat"><span>Vocab size</span><strong class="wV"></strong></div><div class="stat"><span>Total tokens (corpus)</span><strong class="wTot"></strong></div></div>
        <div class="wL" style="font-family:var(--f-mono);font-size:13px;color:var(--ink-2);margin:8px 0;word-break:break-word"></div>
        <label>Naya word encode karo (longest match first):</label><input class="wE" type="text" value="hugs" maxlength="20" style="max-width:240px">
        <div class="wO" style="margin-top:8px"></div>`;
      const q = s => el.querySelector(s);
      const chip = (t, bad) => `<span style="display:inline-block;padding:2px 7px;margin:2px;border-radius:var(--r-sm);font-family:var(--f-mono);font-size:13px;background:${bad ? 'var(--red)' : 'var(--accent-soft)'};color:${bad ? 'var(--bg)' : 'var(--accent-ink)'};border:1px solid var(--line)">${t}</span>`;
      const split = w => [...w].map((c, i) => i ? '##' + c : c);
      const join = (a, b) => a + (b.startsWith('##') ? b.slice(2) : b);
      const stats = () => {
        const tf = new Map(), pf = new Map();
        words.forEach(w => { w.t.forEach(x => tf.set(x, (tf.get(x) || 0) + w.f)); for (let i = 0; i < w.t.length - 1; i++) { const k = w.t[i] + ' ' + w.t[i + 1]; pf.set(k, (pf.get(k) || 0) + w.f); } });
        const sc = [...pf.entries()].map(([k, f]) => { const [a, b] = k.split(' '); return { a, b, f, fa: tf.get(a), fb: tf.get(b), s: f / (tf.get(a) * tf.get(b)) }; });
        return sc;
      };
      const best = sc => { let b = null; sc.forEach(x => { if (!b || x.s > b.s + 1e-12) b = x; }); return b; };
      const apply = (t, a, b) => { const n = []; for (let i = 0; i < t.length; i++) { if (i < t.length - 1 && t[i] === a && t[i + 1] === b) { n.push(join(a, b)); i++; } else n.push(t[i]); } return n; };
      const reset = () => { words = CORP[ck].map(([w, f]) => ({ w, f, t: split(w) })); merges = []; vocab = new Set(); words.forEach(w => w.t.forEach(x => vocab.add(x))); draw(); };
      const step = () => { const sc = stats(); if (!sc.length) return; const b = best(sc); merges.push(b); vocab.add(join(b.a, b.b)); words.forEach(w => { w.t = apply(w.t, b.a, b.b); }); draw(); };
      const encode = w => {
        const out = []; let s = 0;
        while (s < w.length) {
          let e = w.length, hit = null;
          while (e > s) { const sub = (s ? '##' : '') + w.slice(s, e); if (vocab.has(sub)) { hit = sub; break; } e--; }
          if (!hit) return null;
          out.push(hit); s = e;
        }
        return out;
      };
      const draw = () => {
        q('.wW').innerHTML = words.map(w => `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap"><code style="min-width:70px">${w.w} ×${w.f}</code><span>${w.t.map(x => chip(x)).join('')}</span></div>`).join('');
        const sc = stats(), b = sc.length ? best(sc) : null;
        const top = sc.slice().sort((x, y) => y.s - x.s).slice(0, 5);
        q('.wT').innerHTML = top.length ? `<thead><tr><th>Pair</th><th>pair ÷ (A × B)</th><th>Score</th></tr></thead><tbody>` + top.map(x => `<tr style="${x === b ? 'font-weight:700;color:var(--accent-ink)' : ''}"><td><code style="white-space:nowrap">${x.a} + ${x.b}</code></td><td style="white-space:nowrap">${x.f} ÷ (${x.fa} × ${x.fb})</td><td>${x.s.toFixed(4)}</td></tr>`).join('') + '</tbody>' : '<tbody><tr><td>Har word ab ek hi token hai.</td></tr></tbody>';
        q('.wM').textContent = merges.length; q('.wV').textContent = vocab.size;
        q('.wTot').textContent = words.reduce((s, w) => s + w.t.length * w.f, 0);
        q('.wL').textContent = merges.length ? 'Merges: ' + merges.map((m, i) => `${i + 1}) ${m.a}+${m.b}→${join(m.a, m.b)} (score ${m.s.toFixed(4)})`).join('  ') : 'Merges: (abhi koi nahi)';
        const inp = (q('.wE').value || '').toLowerCase().trim();
        const r = inp ? encode(inp) : [];
        q('.wO').innerHTML = r === null ? chip('[UNK]', true) + `<div class="calc-note">Koi piece vocab mein nahi mila, to WordPiece ne <strong>poore word</strong> ko [UNK] bana diya. (BPE sirf anjaan character ko unknown karta.)</div>` : r.map(x => chip(x)).join('') + `<div class="calc-note">${r.length} tokens. Har baar shuru se sabse lamba piece dhoondha jo vocab mein ho.</div>`;
      };
      el.querySelectorAll('.wC').forEach(b => b.onclick = () => { ck = b.dataset.k; el.querySelectorAll('.wC').forEach(x => x.classList.toggle('on', x === b)); q('.wE').value = ck === 'hf' ? 'hugs' : 'viewed'; reset(); });
      q('.wN').onclick = step; q('.w3').onclick = () => { for (let i = 0; i < 3; i++) step(); }; q('.wR').onclick = reset;
      q('.wE').addEventListener('input', draw); reset();
    }},
    { type: 'p', html: `3 merges ke baad "hugs" seedha ek token hai, "bugs" = <code>b · ##u · ##gs</code>, aur "mug" = <code>[UNK]</code> (kyunki "m" kabhi dikha hi nahi). 6 merges ke baad "bugs" = <code>bu · ##gs</code>. Ab <strong>xyz corpus</strong> chuno: WordPiece pehle <code>u + ##p</code> (8 ÷ (8 × 8) = 0.1250) jodta hai aur 5 merges mein poora "upload" bana leta hai, kyunki u, p, l jaise letters sirf upload mein aate hain. BPE ne pehle "vi" banaya tha (sabse common). 12 merges ke baad WordPiece ka corpus 65 tokens ka hai, BPE ka 47: BPE frequency pe chalta hai, isliye text ko zyada chhota karta hai.<br><strong>Faayda:</strong> meaningful jodiyaan, "##" se word ki boundary saaf. <strong>Nuksaan:</strong> anjaan character pe poora word [UNK]. Google ne training ka asli code kabhi publish nahi kiya, isliye libraries ka version "best guess" hai.` },

    { type: 'h3', text: 'Unigram: bade vocab se shuru, kaat-chhaant ke chhota' },
    { type: 'callout', tone: 'term', title: 'Naya word: Unigram tokenizer', html: `<strong>Ye kya hai:</strong> BPE aur WordPiece chhote se bada banate hain (merge). Unigram <strong>ulta</strong> chalta hai: bahut bade vocab se shuru karo (jaise saare common substrings), har token ko ek probability do, phir baar baar wo tokens hatao jinke jaane se corpus ka loss sabse kam badhe. Akele characters kabhi nahi hatte, taaki har word kat sake. 2018 mein Taku Kudo ne ye diya.<br><strong>Encoding:</strong> word ko kaatne ke saare tareeke dekho, har tareeke ka score = uske tukdon ki probabilities ka <strong>guna</strong> (multiply). Sabse bada guna jeet-ta hai. (Asli code ye kaam <strong>Viterbi</strong> naam ke tez tareeke se karta hai, saare raaste alag alag gine bina.)<br><strong>Kyun chahiye:</strong> har word ke liye "sabse sambhavit" kaatna milta hai, aur training mein alag alag kaatne bhi sample kiye ja sakte hain (<strong>subword regularization</strong>), jisse model typos pe mazboot banta hai.<br><strong>Iske bina:</strong> sirf ek fixed kaatna, jo merges ke order ki ajeeb aadaton pe tika hai.` },
    { type: 'p', html: `<strong>Worked example:</strong> maan lo vocab mein "video" ki probability 6% hai aur "s" ki 5%. "videos" = video + s → 0.06 × 0.05 = 0.003 (yaani 1 in 333). Doosra tareeka vid + eo + s → 0.01 × 0.01 × 0.05 = 0.000005 (1 in 2,00,000). Pehla 600 guna behtar. Har extra tukda ek aur chhote number se guna karta hai, isliye <strong>kam aur common tukde</strong> jeet-te hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: SentencePiece', html: `<strong>Ye kya hai:</strong> Google ki ek tokenizer <strong>library</strong> (Kudo aur Richardson, 2018). Ye naya algorithm nahi hai: andar BPE ya Unigram chalata hai. Khaas baat: ye text ko pehle words mein nahi todta (koi pre-tokenization nahi). Space ko bhi ek normal character <code>▁</code> bana deta hai, aur poori line ko ek stream maanta hai.<br><strong>Kyun chahiye:</strong> Chinese, Japanese, Thai jaisi languages mein words ke beech space hota hi nahi, to "spaces pe todo" wala rule wahan kaam nahi karta. Aur kyunki space bhi ek token ka hissa hai, decode bilkul seedha hai: tukde jodo, <code>▁</code> ko space karo, wahi text wapas (<strong>reversible</strong>).<br><strong>Iske bina:</strong> har language ke liye alag pre-tokenizer likhna padta, aur decode karte waqt spaces kahan the ye andaaza lagana padta.` },
    { type: 'p', html: `Neeche ka widget do kaam karta hai. <strong>Ek word</strong> mode: Unigram word ko kaatne ke saare tareeke gin-ta hai aur top 5 dikhata hai. <strong>Poora sentence</strong> mode: SentencePiece ki tarah spaces ko <code>▁</code> banata hai, poori line ka best kaatna dhoondhta hai (Viterbi), aur decode karke dikhata hai. Vocab chhota aur probabilities humne samjhane ke liye rakhi hain:` },
    { type: 'custom', render(el) {
      const P = { '▁': 4, '▁video': 5, '▁videos': 1, '▁view': 2, '▁upload': 3, '▁up': 1, '▁re': 1, '▁xyz': 1, '▁pe': 2, '▁nahi': 2, '▁ho': 2, '▁raha': 1,
        video: 6, view: 5, upload: 4, re: 4, s: 5, ed: 4, ing: 3, er: 3, up: 3, load: 2, vid: 1, eo: 1, vie: 1, w: 1, e: 2, d: 1 };
      'abcdefghijklmnopqrstuvwxyz'.split('').forEach(c => { if (P[c] == null) P[c] = 0.5; });
      const pr = t => (P[t] != null ? P[t] : 0.1) / 100;
      let mode = 'word';
      el.innerHTML = `<div class="chips" style="margin-bottom:8px"><button type="button" class="chip on uM" data-m="word">Ek word (Unigram)</button><button type="button" class="chip uM" data-m="sent">Poora sentence (SentencePiece)</button></div>
        <label class="uLab"></label><input class="uI" type="text" maxlength="40" style="max-width:340px">
        <div class="uO" style="margin-top:10px;overflow-x:auto"></div>
        <div class="calc-note uN"></div>
        <details style="margin-top:8px"><summary>Vocab ke tokens aur unki probability (%)</summary><div style="font-family:var(--f-mono);font-size:12px;word-break:break-word;color:var(--ink-2)">${Object.keys(P).filter(k => P[k] !== 0.5).map(k => `${k} ${P[k]}`).join(' · ')} · baaki har akela letter 0.5</div></details>`;
      const q = s => el.querySelector(s);
      const chip = t => `<span style="display:inline-block;padding:2px 7px;margin:2px;border-radius:var(--r-sm);font-family:var(--f-mono);font-size:13px;background:var(--accent-soft);color:var(--accent-ink);border:1px solid var(--line)">${t}</span>`;
      const oneIn = p => '1 in ' + Math.round(1 / p).toLocaleString('en-IN');
      const all = w => { const out = []; const go = (s, acc) => { if (out.length > 5000) return; if (s === w.length) { out.push(acc); return; } for (let e = s + 1; e <= w.length; e++) { const t = w.slice(s, e); if (P[t] != null) go(e, acc.concat([t])); } }; go(0, []); return out; };
      const best = s => { const n = s.length, B = [{ p: 1, seg: [] }]; for (let i = 1; i <= n; i++) { let bb = null; for (let j = Math.max(0, i - 10); j < i; j++) { const t = s.slice(j, i); if (P[t] == null && i - j > 1) continue; if (!B[j]) continue; const v = B[j].p * pr(t); if (!bb || v > bb.p) bb = { p: v, seg: B[j].seg.concat([t]) }; } B[i] = bb; } return B[n]; };
      const draw = () => {
        const raw = (q('.uI').value || '').toLowerCase();
        if (mode === 'word') {
          const w = raw.replace(/[^a-z]/g, '').slice(0, 14);
          if (!w) { q('.uO').innerHTML = ''; q('.uN').textContent = ''; return; }
          const segs = all(w).map(s => ({ s, p: s.reduce((a, t) => a * pr(t), 1) })).sort((a, b) => b.p - a.p);
          q('.uO').innerHTML = segs.slice(0, 5).map((x, i) => `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:6px 0;border-bottom:1px solid var(--line);${i ? '' : 'font-weight:700;color:var(--accent-ink)'}"><span>${i + 1}.</span><span>${x.s.map(chip).join('')}</span><span style="font-family:var(--f-mono);font-size:12px">${x.s.map(t => pr(t).toFixed(3)).join(' × ')}</span><span>= ${oneIn(x.p)}</span></div>`).join('');
          q('.uN').textContent = `"${w}" ko kaatne ke kul ${segs.length} tareeke hain. Unigram wo chunta hai jiska guna (product) sabse bada ho: ${segs[0].s.join(' + ')}. Kam tukde aur common tukde = bada guna.`;
        } else {
          const s = '▁' + raw.trim().replace(/\s+/g, '▁');
          const b = best(s), dec = b.seg.join('').replace(/▁/g, ' ').trim();
          q('.uO').innerHTML = `<div style="font-family:var(--f-mono);font-size:13px;margin-bottom:6px">Stream: ${s}</div><div>${b.seg.map(chip).join('')}</div><div style="font-family:var(--f-mono);font-size:13px;margin-top:6px">Decode: "${dec}"</div>`;
          q('.uN').textContent = `${b.seg.length} tokens. Space ko "▁" bana ke poori line ek hi stream maani gayi (koi pre-tokenization nahi). Decode = tukde jodo, ▁ ko wapas space karo: ${dec === raw.trim().replace(/\s+/g, ' ') ? 'bilkul wahi text wapas mila.' : 'text badal gaya.'}`;
        }
      };
      const setMode = m => { mode = m; el.querySelectorAll('.uM').forEach(x => x.classList.toggle('on', x.dataset.m === m)); q('.uLab').textContent = m === 'word' ? 'Word likho (jaise videos, uploaded, reviews, vlog):' : 'Sentence likho:'; q('.uI').value = m === 'word' ? 'videos' : 'mera video upload nahi ho raha'; draw(); };
      el.querySelectorAll('.uM').forEach(b => b.onclick = () => setMode(b.dataset.m));
      q('.uI').addEventListener('input', draw); setMode('word');
    }},
    { type: 'p', html: `Numbers dekho: "uploaded" ke 10 tareeke hain; jeet-ta hai upload + ed (1 in 625), jabki up + load + ed sirf 1 in 41,667. "reviews" = re + view + s (1 in 10,000). "vlog" ke liye koi bada tukda nahi, to v + l + o + g: bahut kam score, lekin <strong>[UNK] nahi</strong>, kyunki akele letters kabhi hataye nahi jaate. Sentence mode mein "mera video upload nahi ho raha" 9 tokens banta hai: <code>▁ · m · er · a · ▁video · ▁upload · ▁nahi · ▁ho · ▁raha</code>. Dhyaan do: <code>▁video</code> ek token hai (space ke saath), aur decode karke bilkul wahi sentence wapas aaya.` },
    { type: 'table', head: ['', 'BPE', 'WordPiece', 'Unigram', 'SentencePiece'], rows: [
      ['Kya hai', 'Algorithm', 'Algorithm', 'Algorithm', 'Library (andar BPE ya Unigram)'],
      ['Vocab kaise banta', 'Chhote se bada: sabse common pair jodo', 'Chhote se bada: sabse zyada score wala pair jodo', 'Bade se chhota: kam kaam ke tokens hatao', 'Chuna hua algorithm, raw text pe'],
      ['Naya word kaise kat-ta', 'Seekhe merges usi order mein lagao', 'Shuru se longest match, beech ke pieces pe ##', 'Sabse zyada probability wala kaatna', '▁ ke saath poori line, phir algorithm'],
      ['Unknown', 'Byte-level mein kabhi nahi', 'Poora word [UNK]', 'Akele characters hamesha bachte', 'Byte fallback option'],
      ['Kahan use', 'GPT-2, GPT-4o, Llama 3', 'BERT (30,522 vocab), DistilBERT', 'T5, ALBERT, XLNet', 'T5 (Unigram), Llama 2 (BPE)'],
    ], caption: 'Aaj ke zyadatar bade chat LLMs byte-level BPE use karte hain. Encoder models (BERT family) mein WordPiece aur multilingual models mein SentencePiece bahut common hai.' },
    { type: 'callout', tone: 'mistake', title: 'Common confusion: "SentencePiece ek alag algorithm hai"', html: `Nahi. SentencePiece ek <em>library</em> hai jo BPE ya Unigram chalati hai. Uska asli khaas kaam hai space ko <code>▁</code> banana aur pre-tokenization na karna. Isliye "Llama 2 SentencePiece use karta hai" aur "Llama 2 BPE use karta hai" dono sahi hain.` },
    { type: 'callout', tone: 'tip', title: 'Vocab bada rakhein ya chhota?', html: `<strong>Bada vocab</strong>: text kam tokens mein (sasta, fast, zyada text context mein fit), lekin model ki embedding table aur output layer badi. Llama 3 8B mein sirf embedding table = 128,256 × 4,096 = 525,336,576 numbers (~0.5B parameters!). Hugging Face ke Llama 3 blog ke mutabik Llama 2 7B se Llama 3 8B mein badhe parameters ka achha-khaasa hissa isi se aaya. <strong>Chhota vocab</strong>: chhoti tables, lekin lambe sequences. Trade-off.` },

    { type: 'h2', text: 'Hindi aur Hinglish zyada tokens kyun khaate hain?' },
    { type: 'p', html: `xyz.com ke aadhe users Hinglish ya Hindi mein likhte hain. Same baat, teen bhasha mein, teen asli OpenAI tokenizers se. Ye numbers <code>tiktoken</code> se nikale gaye hain (koi andaaza nahi). Tokenizer badlo:` },
    { type: 'custom', render(el) {
      const S = ['My video is not uploading, please help', 'Mera video upload nahi ho raha, help karo', 'मेरा वीडियो अपलोड नहीं हो रहा, मदद करो', 'xyz.com rocks 🚀'];
      const L = ['English', 'Hinglish', 'Hindi (Devanagari)', 'Emoji wala'];
      const P = {"gpt2":[["My"," video"," is"," not"," uploading",","," please"," help"],["M","era"," video"," upload"," n","ahi"," ho"," r","aha",","," help"," k","aro"],["<E0 A4>","<AE>","<E0 A5>","<87>","<E0 A4>","<B0>","ा","<20 E0 A4>","<B5>","<E0 A5>","<80>","<E0 A4>","<A1>","<E0 A4>","<BF>","<E0 A4>","<AF>","<E0 A5>","<8B>","<20 E0 A4>","<85>","<E0 A4>","<AA>","<E0 A4>","<B2>","<E0 A5>","<8B>","<E0 A4>","<A1>","<20 E0 A4>","<A8>","<E0 A4>","<B9>","<E0 A5>","<80>","<E0 A4>","<82>","<20 E0 A4>","<B9>","<E0 A5>","<8B>","<20 E0 A4>","<B0>","<E0 A4>","<B9>","ा",",","<20 E0 A4>","<AE>","<E0 A4>","<A6>","<E0 A4>","<A6>","<20 E0 A4>","<95>","<E0 A4>","<B0>","<E0 A5>","<8B>"],["xy","z",".","com"," rocks","<20 F0 9F>","<9A>","<80>"]],"cl100k_base":[["My"," video"," is"," not"," uploading",","," please"," help"],["M","era"," video"," upload"," n","ahi"," ho"," r","aha",","," help"," k","aro"],["म","े","र","ा","<20 E0 A4>","<B5>","ी","<E0 A4>","<A1>","<E0 A4 BF E0 A4>","<AF>","ो","<20 E0 A4>","<85>","प","ल","ो","<E0 A4>","<A1>","<20 E0 A4>","<A8>","ह","ी","ं"," ह","ो","<20 E0 A4>","<B0>","ह","ा",","," म","<E0 A4>","<A6>","<E0 A4>","<A6>"," क","र","ो"],["xyz",".com"," rocks","<20 F0 9F>","<9A>","<80>"]],"o200k_base":[["My"," video"," is"," not"," uploading",","," please"," help"],["M","era"," video"," upload"," nahi"," ho"," raha",","," help"," karo"],["म","ेरा"," वीडियो"," अप","लोड"," नहीं"," हो"," रहा",","," मदद"," करो"],["xyz",".com"," rocks","<20 F0 9F 9A>","<80>"]]};
      const NM = { gpt2: 'GPT-2 (2019, 50k)', cl100k_base: 'cl100k (GPT-4, 100k)', o200k_base: 'o200k (GPT-4o, 200k)' };
      let k = 'o200k_base';
      el.innerHTML = `<div class="chips" style="margin-bottom:10px">${Object.keys(NM).map(x => `<button type="button" class="chip tk${x === k ? ' on' : ''}" data-k="${x}">${NM[x]}</button>`).join('')}</div><div class="tO" style="display:grid;gap:12px"></div>
        <div class="calc-note">Chip pe <code>&lt;E0 A4&gt;</code> jaisa likha ho to wo poora character nahi, sirf kuch bytes hain (ek Devanagari akshar UTF-8 mein 3 bytes ka hota hai). Aise tokens akele padhe hi nahi ja sakte. Space ko <code>␣</code> se dikhaya hai.</div>`;
      const draw = () => {
        const p = P[k], en = p[0].length;
        el.querySelector('.tO').innerHTML = p.map((arr, i) => `<div><div style="font-size:14px;margin-bottom:4px"><strong>${L[i]}</strong>: ${S[i]} <span style="color:var(--ink-2)">→ <strong style="color:var(--accent-ink)">${arr.length} tokens</strong>${i ? ` (English ka ${(arr.length / en).toFixed(2)}x)` : ''}</span></div><div style="display:flex;flex-wrap:wrap;gap:3px">${arr.map(t => { const b = t[0] === '<' && t.length > 2; return `<span style="padding:1px 6px;border-radius:var(--r-sm);font-family:var(--f-mono);font-size:12px;border:1px solid var(--line);background:${b ? 'var(--surface-2)' : 'var(--accent-soft)'};color:${b ? 'var(--ink-3)' : 'var(--ink)'}">${t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/ /g, '␣')}</span>`; }).join('')}</div></div>`).join('');
      };
      el.querySelectorAll('.tk').forEach(b => b.onclick = () => { k = b.dataset.k; el.querySelectorAll('.tk').forEach(x => x.classList.toggle('on', x === b)); draw(); });
      draw();
    }},
    { type: 'p', html: `Numbers padho: English teeno tokenizers mein 8 tokens. Wahi baat Devanagari Hindi mein GPT-2 ke tokenizer pe <strong>59 tokens</strong> (7.38x!), cl100k pe 39 (4.88x), aur naye o200k pe sirf 11 (1.38x). Hinglish 13, 13, 10. Kyun? BPE ne jo text sabse zyada dekha (zyadatar English) uske merges seekhe. Jis script ka text training data mein kam tha, uske merges kam bane, aur wo bytes mein toot gaya. Naye tokenizers mein zyada multilingual data hai, isliye farq bahut ghata, lekin khatam nahi hua.` },
    { type: 'p', html: `2023 ke ek NeurIPS paper (Petrov et al.) ne dikhaya ki same text ka translation kuch languages mein 15 guna tak zyada tokens le sakta hai. Matlab un languages ke users ke liye <strong>zyada paisa, zyada latency, aur context window mein kam jagah</strong>, same kaam ke liye.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `"Hindi likhoge to model kam samjhega, isliye Hinglish likho." Model ki samajh ek alag sawaal hai. Token count sirf <em>kitne pieces</em> bane, uska number hai. Haan, jo language bytes mein tootti hai, model ko us pe zyada mehnat karni padti hai aur training data bhi kam hota hai, to quality pe asar pad sakta hai. Lekin isko apne use case pe test karo, maan ke mat chalo.` },

    { type: 'h2', text: 'Tokens = paisa aur limits' },
    { type: 'p', html: `LLM APIs characters ya words se nahi, <strong>tokens</strong> se bill karti hain, aur price aksar "per 1 million tokens" mein likha hota hai. Do alag rates hote hain: <strong>input tokens</strong> (jo tum bhejte ho: system prompt, history, user message) aur <strong>output tokens</strong> (jo model banata hai). Output aam taur pe kai guna mehenga hota hai, kyunki har output token ke liye model ka ek poora loop chalta hai, jabki input tokens ek saath (parallel) process ho jaate hain.` },
    { type: 'list', items: [
      `<strong>Context window</strong>: model ek baar mein kitne tokens (input + output) dekh sakta hai. Limit tokens mein hai, characters mein nahi. Hindi user ke liye same window mein kam baatein fit hongi. Detail: <a href="#/ai-context">Context window</a>.`,
      `<strong>max_tokens</strong>: output ki limit, tokens mein.`,
      `<strong>Rate limits</strong>: aksar "tokens per minute" bhi hoti hain, sirf requests per minute nahi.`,
    ]},
    { type: 'p', html: `xyz Assistant ka mahine ka bill nikaalo. Prices yahan sirf example hain (provider aur model ke hisaab se bahut badalte hain), apne provider ka asli rate daal ke dekho. Language multiplier upar wale widget ke ek sentence se liya hai, asli average apne data pe naapna:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Chats per day</label><input class="cQ" type="number" value="10000" min="0" step="100"></div>
          <div><label>Input tokens per chat (English)</label><input class="cI" type="number" value="1500" min="0" step="50"></div>
          <div><label>Output tokens per chat (English)</label><input class="cO" type="number" value="300" min="0" step="10"></div>
          <div><label>$ per 1M input tokens (example)</label><input class="cPI" type="number" value="2.5" min="0" step="0.1"></div>
          <div><label>$ per 1M output tokens (example)</label><input class="cPO" type="number" value="10" min="0" step="0.5"></div>
          <div><label>Users ki language</label><select class="cL">
            <option value="1">English (1.00x)</option><option value="1.25">Hinglish, o200k (1.25x)</option>
            <option value="1.375">Hindi, o200k (1.38x)</option><option value="7.375">Hindi, GPT-2 tokenizer (7.38x)</option></select></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Tokens per chat</span><strong class="cT"></strong></div>
          <div class="stat"><span>Cost per chat</span><strong class="cC"></strong></div>
          <div class="stat"><span>Cost per month (30 din)</span><strong class="cM"></strong></div>
        </div>
        <div class="calc-note cN"></div>`;
      const q = s => el.querySelector(s), v = s => Math.max(0, Number(q(s).value) || 0);
      const upd = () => {
        const m = Number(q('.cL').value), ti = v('.cI') * m, to = v('.cO') * m;
        const per = (ti * v('.cPI') + to * v('.cPO')) / 1e6;
        q('.cT').textContent = Math.round(ti + to).toLocaleString('en-IN');
        q('.cC').textContent = '$' + per.toFixed(5);
        q('.cM').textContent = '$' + (per * v('.cQ') * 30).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
        const share = (ti * v('.cPI') + to * v('.cPO')) ? (to * v('.cPO')) / (ti * v('.cPI') + to * v('.cPO')) * 100 : 0;
        q('.cN').textContent = `Output tokens sirf ${Math.round(to)} hain, lekin bill ka ${share.toFixed(1)}% unhi ka hai. Formula: (input × input-rate + output × output-rate) ÷ 1,000,000, phir × chats × 30.`;
      };
      el.querySelectorAll('input,select').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Default values pe: English mein ek chat 1,800 tokens, $0.00675, aur mahine ka <strong>$2,025.00</strong>. Output sirf 300 tokens hain lekin bill ka 44.4% unka hai. Hindi (o200k) select karo: $2,784.38. Purane GPT-2 jaise tokenizer pe Hindi: $14,934.38. Same users, same baatein, sirf tokenizer ka farq.` },

    { type: 'h2', text: 'Tokens ki wajah se ajeeb galtiyan' },
    { type: 'p', html: `Model ko letters nahi, tokens dikhte hain. Isse kuch mazedaar galtiyan samajh aati hain:` },
    { type: 'list', items: [
      `<strong>"strawberry mein kitne r hain?"</strong> o200k mein ye <code>st · raw · berry</code> hai: 3 tokens. Model ko alag alag letters dikhte hi nahi, use "berry" token ke andar ke letters training se "yaad" karne padte hain. Isliye purane models aksar galat ginte the.`,
      `<strong>Numbers</strong>: "9.11" = <code>9 · . · 11</code> aur "9.9" = <code>9 · . · 9</code>. Model ko "11" ek cheez dikhti hai aur "9" ek, to "9.11 bada hai ya 9.9?" mein confuse ho sakta hai. Maths ke liye calculator tool dena better hai.`,
      `<strong>Spelling ulti karna, letters ginna, rhymes</strong>: sab character-level kaam hain, token-level model ke liye mushkil.`,
    ]},

    { type: 'h2', text: 'Token ID se embedding: number ko matlab dena' },
    { type: 'p', html: `Token ID sirf ek label hai. ID 3823 (" video") aur 3824 ka matlab mein koi rishta nahi, jaise roll number 23 aur 24 wale students ka koi rishta nahi. Agar model seedha "3823" number pe maths kare to wo sochega 3824 iske "kareeb" hai. Galat. Humein har token ke liye aisa number-group chahiye jo uska <em>matlab</em> pakde.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Embedding', html: `<strong>Ye kya hai:</strong> ek token (ya word, sentence) ko represent karne wali numbers ki list, jaise <code>[0.12, -0.80, 0.33, ...]</code>. Is list ko <strong>vector</strong> kehte hain, aur list ki lambaai ko <strong>dimension</strong>. GPT-2 small mein har token ka vector 768 numbers ka hai, Llama 3 8B mein 4,096. Socho ek naksha jisme har word ka ek "pata" (coordinates) hai: milte-julte matlab wale words paas paas rehte hain.<br><strong>Kyun chahiye:</strong> token ID sirf ek label hai, usme matlab nahi. Vector mein bahut saare numbers hain jo matlab ke alag alag pehlu pakad sakte hain. Model inhi pe maths karta hai.<br><strong>Iske bina:</strong> model ko lagta ki ID 3823 aur 3824 "paas" hain, jabki unka koi rishta nahi. Matlab samajhne ka koi raasta nahi.` },
    { type: 'p', html: `Model ke andar ek badi table hoti hai: <strong>embedding matrix</strong>. Isme har vocab token ke liye ek row hai. GPT-2 small mein 50,257 rows × 768 columns = 38,597,376 numbers. "Token ID → embedding" sirf itna hai: <strong>table ki row number ID nikaal lo</strong>. Koi calculation nahi, seedha lookup. Ye table bhi parameters hai: training ke time baaki weights ke saath seekhi jaati hai.` },
    { type: 'ascii', text: `" video"  →  ID 3823  →  embedding matrix ki row 3823
                                   ↓
                        [0.12, -0.80, 0.33, ... 768 numbers]
                                   ↓
                     Transformer layers (attention, FFN ...)`, caption: 'Vector ke numbers yahan sirf dikhane ke liye hain.' },
    { type: 'h3', text: 'Similarity: do vectors kitne "paas" hain? (cosine)' },
    { type: 'callout', tone: 'term', title: 'Naya word: Cosine similarity', html: `<strong>Ye kya hai:</strong> do vectors kitni <em>same direction</em> mein point karte hain, uska number: 1 = bilkul same direction, 0 = koi rishta nahi, -1 = ulta. Socho do teer (arrows): unke beech ka kona (angle) jitna chhota, cosine utna 1 ke paas.<br><strong>Kyun chahiye:</strong> "ye do sentences kitne milte hain?" ko ek number mein badalna. Search, recommendation, duplicate pakadna sab isi pe chalte hain.<br><strong>Iske bina:</strong> sirf exact words match kar sakte, "refund" aur "paise wapas" ko same nahi pehchaan sakte.` },
    { type: 'p', html: `Do vectors ki similarity naapne ka sabse common tareeka <strong>cosine similarity</strong> hai: dono vectors ke beech ka angle dekho. Same direction = 1, perpendicular (koi rishta nahi) = 0, ulti direction = -1. Formula: <code>cos(a, b) = (a · b) / (|a| × |b|)</code>. <code>a · b</code> (dot product) = har position ke numbers multiply karke jodo. <code>|a|</code> = vector ki lambaai = √(a · a).` },
    { type: 'p', html: `Neeche 8 words ke <em>khilone</em> wale 4-number vectors hain. Asli embeddings ke dimensions ka koi naam nahi hota; yahan samjhane ke liye har dimension ko naam diya hai: [media, account, action, sports]. Do words chuno aur formula mein numbers dekho:` },
    { type: 'custom', render(el) {
      const V = { video: [0.9, 0.1, 0.2, 0.1], clip: [0.8, 0.1, 0.3, 0.2], movie: [0.85, 0, 0.05, 0.15], upload: [0.5, 0.2, 0.9, 0], download: [0.45, 0.15, 0.85, 0.05], password: [0, 0.95, 0.2, 0], login: [0.05, 0.9, 0.4, 0], cricket: [0.2, 0, 0.1, 0.95] };
      const ks = Object.keys(V);
      const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0), nm = a => Math.sqrt(dot(a, a)), cos = (a, b) => dot(a, b) / (nm(a) * nm(b));
      const opt = sel => ks.map(k => `<option${k === sel ? ' selected' : ''}>${k}</option>`).join('');
      el.innerHTML = `<div class="row2"><div><label>Word A</label><select class="eA">${opt('video')}</select></div><div><label>Word B</label><select class="eB">${opt('clip')}</select></div></div>
        <div class="eF" style="font-family:var(--f-mono);font-size:13px;overflow-x:auto;padding:10px;margin:10px 0;border:1px solid var(--line);border-radius:var(--r);background:var(--surface-2);white-space:pre"></div>
        <div class="stats"><div class="stat"><span>Cosine similarity</span><strong class="eC"></strong></div><div class="stat"><span>A ke sabse paas</span><strong class="eN"></strong></div></div>
        <div class="calc-note eX"></div>`;
      const q = s => el.querySelector(s);
      const upd = () => {
        const a = q('.eA').value, b = q('.eB').value, A = V[a], B = V[b];
        const c = cos(A, B);
        q('.eF').textContent = `${a} = [${A.join(', ')}]\n${b} = [${B.join(', ')}]\n\nA · B = ${A.map((x, i) => x + '×' + B[i]).join(' + ')} = ${dot(A, B).toFixed(2)}\n|A| = ${nm(A).toFixed(2)},  |B| = ${nm(B).toFixed(2)}\ncos = ${dot(A, B).toFixed(2)} / (${nm(A).toFixed(2)} × ${nm(B).toFixed(2)}) = ${c.toFixed(2)}`;
        q('.eC').textContent = c.toFixed(2);
        const near = ks.filter(k => k !== a).sort((x, y) => cos(A, V[y]) - cos(A, V[x])).slice(0, 2);
        q('.eN').textContent = near.map(k => `${k} (${cos(A, V[k]).toFixed(2)})`).join(', ');
        q('.eX').textContent = c > 0.9 ? 'Bahut similar: lagbhag same direction.' : c > 0.5 ? 'Kuch rishta hai.' : 'Kaafi alag matlab: vectors alag direction mein.';
      };
      q('.eA').addEventListener('input', upd); q('.eB').addEventListener('input', upd); upd();
    }},
    { type: 'p', html: `video vs clip: dot product 0.81, lambaai 0.93 aur 0.88, cosine <strong>0.98</strong>. video vs password: sirf <strong>0.15</strong>. password ke sabse paas login (0.98). Ab upload vs download chuno: <strong>1.00</strong> (asal value 0.998). Ulte matlab, phir bhi lagbhag same vector!` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion: "similar vector = same matlab"', html: `Embeddings is baat se bante hain ki word <em>kin contexts mein</em> aata hai. "Upload" aur "download" dono "video ___ karo", "___ speed slow hai" jaise sentences mein aate hain, to unke vectors bahut paas aa jaate hain, chaahe matlab ulta ho. Asli embeddings mein bhi ye hota hai (jaise "hot" aur "cold"). Isliye sirf embedding similarity se "matlab same hai" decide mat karo.` },

    { type: 'h3', text: 'Word embeddings vs contextual embeddings' },
    { type: 'p', html: `2013 mein Google ke <strong>word2vec</strong> ne dikhaya ki words ke vectors mein maths bhi chalta hai: <code>king − man + woman</code> ka vector <code>queen</code> ke paas aata hai. Lekin ye <strong>static</strong> embeddings the: har word ka ek hi vector, hamesha. Problem: "Python seekhna hai" aur "jungle mein Python dikha" mein "Python" ka ek hi vector. Ek programming language, ek saanp.` },
    { type: 'p', html: `Transformer mein embedding table sirf shuruaat hai. Har layer mein <a href="#/ai-attention">attention</a> token ke vector ko aas-paas ke tokens dekh ke badalta hai. Pehle sentence mein "Python" ka vector "seekhna" ki taraf khinchta hai (programming), doosre mein "jungle" ki taraf (saanp). Ise <strong>contextual embedding</strong> kehte hain: same token, context ke hisaab se alag vector. Ye A2 phase ka core hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Contextual embedding', html: `<strong>Ye kya hai:</strong> token ka wo vector jo aas-paas ke words dekh ke badal chuka hai. Embedding table se aaya vector "shuruaati pata" hai; transformer ki layers ke baad wo "is sentence mein matlab" ban jaata hai.<br><strong>Kyun chahiye:</strong> ek hi word ke kai matlab hote hain (Python = language ya saanp, "bank" = paisa ya nadi ka kinara). Sentence ke bina sahi matlab nahi milta.<br><strong>Iske bina:</strong> model har jagah ek hi matlab maanta, aur "Python seekhna" aur "jungle mein Python" mein confuse hota.` },
    { type: 'callout', tone: 'tip', title: 'Embeddings sirf LLM ke andar nahi', html: `Alag <strong>embedding models</strong> poore sentence ya paragraph ko ek vector bana dete hain. xyz.com apne har help article ka vector bana ke rakh sakta hai; user ka sawaal aaye to uska vector banao aur cosine se sabse paas wale articles dhoondho. Ye <strong>semantic search</strong> hai: "video atak gaya" bhi "upload troubleshooting" article dhoondh lega, chaahe ek bhi word same na ho. RAG isi pe khada hai: <a href="#/ai-rag">RAG aur vector search</a>.` },

    { type: 'h2', text: 'Poora pipeline: text se model tak' },
    { type: 'p', html: `Ab sab jod ke dekho xyz Assistant ke andar text kaise model tak pahunchta hai, aur kahan kya toot sakta hai:` },
    { type: 'flow', height: 300,
      nodes: [
        { id: 'txt', label: 'User text', sub: 'string', x: 76, y: 90, w: 124, kind: 'client', info: 'Ye kya hai: user ka likha hua message, jaise "My video is not uploading". Poore pipeline ki shuruaat yahin se. Computer ke liye ye UTF-8 bytes ki line hai.' },
        { id: 'tok', label: 'Tokenizer', sub: 'BPE merges', x: 238, y: 90, w: 140, kind: 'server', info: 'Ye kya hai: text ko tokens mein kaatne wala program. Pehle text ko mote taur pe words/spaces/punctuation mein todta hai (pre-tokenize), phir seekhe hue BPE merge rules order mein lagata hai. Output: tokens. Model ke saath hamesha wahi tokenizer jo training mein tha.' },
        { id: 'ids', label: 'Token IDs', sub: '[3823, 12053 ...]', x: 405, y: 90, w: 150, kind: 'queue', info: 'Ye kya hai: har token ka vocabulary mein number (roll number jaisa). Yahi numbers gine jaate hain: billing, context window, max_tokens sab inhi pe.' },
        { id: 'emb', label: 'Embedding table', sub: 'vocab × d_model', x: 594, y: 90, w: 168, kind: 'data', info: 'Ye kya hai: ek badi table (matrix): har vocab token ki ek row (o200k jaisa vocab ho to ~2 lakh rows). Token ID = row number. Lookup se har token ko ek vector milta hai. Ye bhi trained parameters hain.' },
        { id: 'model', label: 'Transformer', sub: 'layers', x: 594, y: 222, w: 168, kind: 'server', info: 'Ye kya hai: LLM ka asli dimaag (A2 phase). Vectors ki line yahan aati hai. Attention aur FFN layers inhe contextual banate hain, aur end mein agle token ke logits nikalte hain. A2 phase mein andar se banayenge.' },
        { id: 'lim', label: 'Limit + bill', sub: 'token counter', x: 405, y: 222, w: 150, kind: 'edge', meter: true, load: 10, info: 'Ye kya hai: provider ka token counter. Yahi tay karta hai ki request andar jaayegi aur kitna bill banega. API side pe token count check hota hai: context window se zyada to request reject; warna input aur output tokens gin ke bill banta hai.' },
      ],
      edges: [{ a: 'txt', b: 'tok' }, { a: 'tok', b: 'ids' }, { a: 'ids', b: 'emb' }, { a: 'emb', b: 'model' }, { a: 'ids', b: 'lim' }],
      scenarios: [
        { name: 'Happy path', steps: [
          { title: 'Text aaya', text: 'User: "My video is not uploading, please help".', go: 'txt>tok', msg: '"My video is not uploading, please help"  (38 characters)' },
          { title: 'Tokens bane', text: 'BPE ne text ko 8 tokens mein toda. Common words poore ek token hain.', go: 'tok>ids', after: { ids: { sub: '8 tokens' } }, msg: '["My", " video", " is", " not", " uploading", ",", " please", " help"]' },
          { title: 'Count aur limit check', text: '8 tokens: context window mein aaram se fit, bill mein 8 input tokens.', go: 'ids>lim', after: { lim: { state: 'ok', load: 12, sub: '8 tokens: OK' } } },
          { title: 'Lookup', text: 'Har ID ki row embedding table se nikali. Ab 8 vectors hain.', go: 'ids>emb', after: { emb: { state: 'hit', sub: '8 rows nikali' } } },
          { title: 'Model mein', text: '8 vectors ki line transformer mein gayi. Aage ka kaam (attention, logits, sampling) pichhle lesson jaisa.', go: 'emb>model', after: { model: { state: 'ok', sub: '8 × d_model' } } },
        ]},
        { name: 'Hindi user (purana tokenizer)', steps: [
          { title: 'Same baat, Devanagari mein', text: '"मेरा वीडियो अपलोड नहीं हो रहा, मदद करो"', go: 'txt>tok', msg: '38 characters, lekin har Devanagari character UTF-8 mein 3 bytes' },
          { title: 'Bytes mein toot gaya', text: 'GPT-2 ke tokenizer ne Devanagari ke merges kam seekhe the. Text 59 tokens mein toota, zyadatar adhoore bytes.', go: 'tok>ids', set: { tok: { state: 'warn' } }, after: { ids: { state: 'warn', sub: '59 tokens' } }, msg: '["<E0 A4>", "<AE>", "<E0 A5>", "<87>", ... 59 tokens]' },
          { title: 'Bill aur window pe asar', text: 'English ke 8 ke muqable 59: 7.38x zyada paisa, aur context window mein 7x kam baatein fit. Naya o200k tokenizer same text 11 tokens mein karta hai. Fix: naye tokenizer wala model chuno aur apni languages pe token count naapo.', go: 'ids>lim', after: { lim: { state: 'hot', load: 88, sub: '59 tokens: 7.38x' } } },
        ]},
        { name: 'Stream mein toota emoji', steps: [
          { title: 'Model emoji bhej raha hai', text: 'Model ka answer "Ho gaya 🚀" hai. o200k mein " 🚀" do tokens hai: pehle mein space + emoji ke 3 bytes, doosre mein emoji ka aakhri 1 byte (🚀 UTF-8 mein 4 bytes ka hai).', go: 'res:model>emb>ids', msg: 'token A = <20 F0 9F 9A>   token B = <80>' },
          { title: 'App ne har token alag decode kiya', text: 'Streaming app ne token A aate hi use text banana chaha. Lekin 3 bytes adhoora character hai. Screen pe "�" (replacement character) aa gaya.', go: 'bad:ids>tok>txt', after: { txt: { state: 'warn', sub: 'Ho gaya �' } } },
          { title: 'Fix', text: 'Decoder ko bytes ka buffer rakhna chahiye: jab tak poora valid UTF-8 character na bane, screen pe mat bhejo. Achhi SDKs ye khud karti hain; apna decoder likho to dhyan rakho.', focus: ['tok'], set: { txt: { state: 'ok', sub: 'Ho gaya 🚀' } } },
        ]},
        { name: 'Galat token estimate', steps: [
          { title: 'Developer ka andaaza', text: 'App ne token count "characters ÷ 4" se estimate kiya aur socha 20,000 characters ki Hindi document = 5,000 tokens, window mein fit.', go: 'txt>tok>ids', msg: 'estimate: 20000 / 4 = 5000 tokens' },
          { title: 'Asli count zyada nikla', text: '"÷ 4" sirf English ka rule hai. Is document ka asli count bahut zyada nikla aur limit cross ho gayi. API ne request reject kar di.', go: ['ids>lim', 'bad:lim>ids'], after: { lim: { state: 'down', load: 100, sub: 'limit exceeded' } }, msg: 'HTTP 400  "prompt is too long: context limit exceeded"' },
          { title: 'Fix', text: 'Token count usi model ke tokenizer se gino (jaise tiktoken, ya provider ka token-count API). Limit ke paas ho to document ko chhota karo, summarize karo, ya sirf relevant hissa bhejo (RAG).', focus: ['lim'], set: { lim: { state: '', load: 20, sub: 'token counter' } } },
        ]},
      ],
    },

    { type: 'callout', tone: 'tip', title: 'Decide: tokens ke baare mein kya karein', html: `• <strong>Cost/limit estimate</strong>: English mein rough andaaza "characters ÷ 4" chalega. Production ke liye hamesha usi model ke tokenizer se gino.<br>• <strong>Multilingual users</strong> (Hindi, Tamil, Bangla...): model chunne se pehle apne asli messages ka token count naya vs purana tokenizer pe compare karo. 1.4x vs 7x ka farq seedha bill pe aata hai.<br>• <strong>Spelling, letter counting, exact maths</strong>: LLM se mat karwao, code/tool se karwao.<br>• <strong>Meaning se search</strong> (milte-julte sawaal, articles): embeddings + cosine. <strong>Exact word/ID search</strong> (order ID, error code): normal keyword search behtar.<br>• <strong>Kaunsa tokenizer algorithm?</strong> Aaj ka general chat LLM: byte-level BPE (sab languages, kabhi unknown nahi). BERT jaisa encoder/classifier: jo uske saath aaya (WordPiece). Space-less languages ya multilingual model khud train karna: SentencePiece (Unigram ya BPE).<br>• <strong>Apna tokenizer train karna</strong>: tabhi jab model khud train kar rahe ho. Trained model ka tokenizer kabhi mat badlo: embedding table ki rows us vocab se bandhi hain.` },

    { type: 'h2', text: 'Poori picture' },
    { type: 'diagram', title: 'Tokens aur embeddings: poori picture', height: 610,
      groups: [
        { label: 'Tokenizer banana (ek baar, offline)', x: 20, y: 8, w: 680, h: 104 },
        { label: 'Har request pe', x: 20, y: 140, w: 680, h: 300 },
        { label: 'Wapas text, aur search', x: 20, y: 470, w: 680, h: 128 },
      ],
      nodes: [
        { id: 'corpus', label: 'Training text', sub: 'bahut saara text', x: 110, y: 60, w: 150, kind: 'data', info: 'Ye kya hai: wo text jisse tokenizer seekhta hai. Isme jo language kam hai (jaise Hindi purane corpora mein), uske merges kam bante hain aur wo baad mein zyada tokens khaati hai.' },
        { id: 'trainer', label: 'Trainer', sub: 'BPE / WordPiece / Unigram', x: 360, y: 60, w: 190, kind: 'server', info: 'Ye kya hai: vocab banane wala algorithm. BPE sabse common pair jodta hai, WordPiece sabse zyada score wala, Unigram bade vocab se kam kaam ke tokens hataata hai. SentencePiece library inme se ek ko raw text pe chalati hai.' },
        { id: 'vocab', label: 'Vocab file', sub: 'tokens, IDs, merges', x: 618, y: 60, w: 160, kind: 'queue', info: 'Ye kya hai: final token list, har token ka ID, aur BPE ho to merge rules ka order. Model isi ke saath train hota hai, isliye baad mein badla nahi ja sakta.' },
        { id: 'text', label: 'User text', sub: 'UTF-8 bytes', x: 110, y: 195, w: 150, kind: 'client', info: 'Ye kya hai: user ka message. Computer ke liye ye bytes ki line hai: English letter 1 byte, Devanagari akshar 3, emoji 4.' },
        { id: 'tok', label: 'Tokenizer', sub: 'encode', x: 360, y: 195, w: 150, kind: 'server', info: 'Ye kya hai: vocab file se chalne wala program. Pre-tokenize karta hai (ya SentencePiece mein space ko ▁ banata hai), phir merges / longest match / Unigram se tokens banata hai.' },
        { id: 'ids', label: 'Token IDs', sub: '[5299, 621, 357 ...]', x: 618, y: 195, w: 160, kind: 'queue', info: 'Ye kya hai: har token ka number. Model, bill aur limits sab inhi ko ginte hain.' },
        { id: 'count', label: 'Token counter', sub: 'bill + context limit', x: 110, y: 345, w: 160, kind: 'edge', info: 'Ye kya hai: provider ka meter. Input aur output tokens gin ke bill banata hai, aur context window se zyada ho to request rok deta hai. Hindi ya purane tokenizer = zyada tokens = zyada bill.' },
        { id: 'model', label: 'Transformer', sub: 'contextual vectors', x: 360, y: 345, w: 150, kind: 'server', info: 'Ye kya hai: LLM ki layers. Embedding vectors ko aas-paas ke tokens dekh ke badalti hain (contextual embeddings), aur end mein agle token ke logits deti hain.' },
        { id: 'emb', label: 'Embedding table', sub: 'vocab × d_model', x: 618, y: 345, w: 160, kind: 'data', info: 'Ye kya hai: har vocab token ki ek row wali badi table. Token ID = row number. Lookup se har token ko vector milta hai. Ye bhi trained parameters hain.' },
        { id: 'dec', label: 'Decoder', sub: 'IDs → text, bytes buffer', x: 120, y: 530, w: 180, kind: 'client', info: 'Ye kya hai: output IDs ko wapas text banane wala hissa. Adhoore UTF-8 bytes ko buffer mein rakhta hai, warna emoji jaisi cheez "�" ban jaati hai.' },
        { id: 'sem', label: 'Semantic search', sub: 'vectors + cosine', x: 618, y: 530, w: 160, kind: 'cache', info: 'Ye kya hai: embedding model se sentences ke vectors banao aur cosine similarity se sabse paas wale dhoondho. "Refund" aur "paise wapas" ko same pehchaanta hai. RAG isi pe khada hai.' },
      ],
      edges: [
        { a: 'corpus', b: 'trainer', label: 'pairs gino' },
        { a: 'trainer', b: 'vocab', label: 'seekho' },
        { a: 'vocab', b: 'tok', dashed: true, label: 'load' },
        { a: 'text', b: 'tok', n: 1, label: 'text' },
        { a: 'tok', b: 'ids', n: 2, label: 'tokens' },
        { a: 'ids', b: 'emb', n: 3, label: 'lookup' },
        { a: 'emb', b: 'model', n: 4, label: 'vector' },
        { a: 'tok', b: 'count', kind: 'evt', label: 'gino' },
        { a: 'model', b: 'dec', kind: 'res', n: 5, label: 'output IDs' },
        { a: 'emb', b: 'sem', dashed: true, label: 'same idea' },
      ],
      paths: [
        { name: 'Tokenizer kaise bana', text: 'Training text pe BPE / WordPiece / Unigram chala, vocab file bani, aur wahi file har request pe tokenizer mein load hoti hai.', go: ['corpus>trainer>vocab>tok'] },
        { name: 'Text se IDs', text: 'User ka text tokenizer mein kat ke tokens bana, aur har token ko vocab se uska ID mila.', go: ['text>tok>ids'] },
        { name: 'ID se vector', text: 'Har ID embedding table ki ek row nikaalta hai. Vectors transformer mein jaate hain aur contextual bante hain.', go: ['ids>emb>model'] },
        { name: 'Bill aur limit', text: 'Tokens gine jaate hain: input + output tokens = bill, aur context window se zyada = request reject.', go: ['tok>count'] },
        { name: 'Answer wapas', text: 'Model ke output IDs decoder mein wapas text bante hain, bytes ka buffer rakh ke.', go: ['model>dec'] },
        { name: 'Semantic search', text: 'Embeddings ka wahi idea sentences pe: vectors banao, cosine se paas wale dhoondho.', go: ['emb>sem'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Model sirf numbers samajhta hai. Text → <strong>tokens</strong> (subword tukde) → <strong>token IDs</strong> (vocab mein number) → <strong>embeddings</strong> (vectors).</li>
      <li>Subwords beech ka raasta hain: characters se line bahut lambi, words se list anant. English mein 1 token ≈ 4 characters.</li>
      <li><strong>BPE</strong>: sabse common pair jodo, merges order mein lagao. <strong>WordPiece</strong>: score = pair ÷ (A × B), longest match, ## aur poora-word [UNK]. <strong>Unigram</strong>: bade vocab se kaat-chhaant, sabse zyada probability wala kaatna. <strong>SentencePiece</strong>: library, space = ▁, reversible.</li>
      <li>Byte-level BPE (256 bytes base) mein koi text unknown nahi hota.</li>
      <li>Kam-represented languages zyada tokens khaati hain: GPT-2 pe Hindi 7.38x, o200k pe 1.38x. Zyada tokens = zyada bill, latency, kam context.</li>
      <li>Token count hamesha usi model ke tokenizer se gino. "÷ 4" sirf English ka andaaza hai.</li>
      <li>Embedding = table lookup. Cosine similarity se "kitne milte hain" naapo. Similar vector ≠ hamesha same matlab (upload vs download).</li>
    </ul>` },

    { type: 'tradeoffs',
      gains: ['Subword tokens: koi word unknown nahi, aur common words chhote (1 token)', 'Byte-level BPE: koi bhi language, emoji, code sab encode ho jaata hai', 'Embeddings matlab ko numbers mein pakadte hain: similarity, search, clustering possible', 'Bada vocab = kam tokens = sasta aur zyada text context mein'],
      costs: ['Kam-represented languages zyada tokens khaati hain: zyada paisa, latency, kam context', 'Model letters nahi dekhta: spelling, counting, numbers mein ajeeb galtiyan', 'Bada vocab = badi embedding table aur output layer (zyada parameters)', 'Tokenizer model se bandha hai: badla nahi ja sakta, aur alag models ke counts alag', 'Embedding similarity "same context" pakadti hai, hamesha "same matlab" nahi'] },

    { type: 'think', questions: [
      { q: 'xyz.com ka ek naya feature "#xyzShorts" bahut trend kar raha hai. Purana model ise kaise tokenize karega, aur kya model ise "samjhega"?', a: 'Tokenizer ise jaane-pehchaane pieces mein tod dega (jaise "#", "xyz", "Sh", "orts"), to koi unknown token nahi banega. Lekin model ne training mein ye naam kabhi nahi dekha, to iska matlab use pata nahi. Pieces se wo andaaza laga sakta hai (xyz + shorts = chhote videos?), jo galat bhi ho sakta hai. Asli matlab dena ho to prompt/RAG mein explanation do.' },
      { q: 'Vocab 2 lakh se 20 lakh kar dein to? Har word ek token, sab sasta. Kya problem hai?', a: 'Embedding table aur output layer 10x badi ho jaayegi (vocab × d_model har ek). Bahut saare tokens training mein bahut kam baar dikhenge, unke vectors theek se seekhe nahi jaayenge. Har step pe softmax 20 lakh entries pe. Isliye vocab size ek trade-off hai: aaj zyadatar models 32k se ~2.5 lakh ke beech hain.' },
      { q: 'Do support tickets: "Refund kab milega?" aur "Paise wapas kab aayenge?". Ek bhi word same nahi. Inhe "same type" kaise pehchanoge?', a: 'Dono ka sentence embedding banao (embedding model se) aur cosine similarity dekho. Matlab same hai, to vectors paas honge (high cosine), chaahe words alag hon. Keyword matching yahan fail hota. Yahi semantic search hai, jo RAG mein use hota hai.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'LLMs characters ki jagah subword tokens kyun use karte hain?', options: ['Characters se sequence bahut lamba aur words se vocab anant + unknown words; subwords beech ka balance hai', 'Kyunki GPUs characters process nahi kar sakte', 'Subwords se model ka training data chhota ho jaata hai'], answer: 0, explain: 'Characters: lambi sequences, kam matlab per piece. Words: bahut bada vocab aur [UNK]. Subwords: common words poore, rare words tukdon mein, kuch unknown nahi.' },
      { q: 'BPE training ke har step mein kya hota hai?', options: ['Sabse lamba word vocab mein jodte hain', 'Sabse zyada baar saath aane wala padosi pair merge karke naya token banate hain', 'Random do characters jodte hain'], answer: 1, explain: 'Pairs gino (word frequency ke saath), sabse common pair merge karo, rule yaad rakho, repeat. Encode karte waqt merges usi order mein lagte hain.' },
      { q: 'WordPiece mein pair "##g + ##s" 5 baar aaya, "##g" akela 20 baar, "##s" akela 5 baar. Score?', options: ['5', '0.05', '0.25'], answer: 1, explain: 'Score = pair ÷ (A × B) = 5 ÷ (20 × 5) = 5 ÷ 100 = 0.05. Isne "##u + ##g" (20 ÷ 720 = 0.0278) ko hara diya, chaahe wo 4 guna zyada common tha.' },
      { q: 'SentencePiece ke baare mein kya sahi hai?', options: ['Ye BPE se alag ek naya merge algorithm hai', 'Ye library hai jo space ko ▁ bana ke poori line pe BPE ya Unigram chalati hai, aur decode bilkul reversible hota hai', 'Ye sirf English ke liye bana hai'], answer: 1, explain: 'SentencePiece library hai, algorithm nahi. Pre-tokenization nahi karti, isliye bina space wali languages pe bhi chalti hai.' },
      { q: 'Same message English mein 8 tokens aur Hindi mein 59 tokens (GPT-2 tokenizer). Iska seedha asar kya nahi hai?', options: ['Hindi request ka bill zyada', 'Context window mein kam Hindi text fit hoga', 'Model ki vocabulary size badal jaayegi'], answer: 2, explain: 'Vocab tokenizer ki fixed property hai, input se nahi badalti. Zyada tokens = zyada cost, zyada latency, window mein kam jagah.' },
      { q: 'Token ID se embedding kaise milta hai?', options: ['ID ko 768 se multiply karke', 'Embedding matrix ki us ID wali row seedha nikaal lete hain (lookup)', 'Tokenizer khud vector banata hai'], answer: 1, explain: 'Embedding = table lookup. Row number = token ID. Table ke numbers training mein seekhe jaate hain.' },
      { q: 'Vectors a = [1, 0] aur b = [1, 1] ki cosine similarity?', options: ['1.00', '0.71', '0.50'], answer: 1, explain: 'a·b = 1, |a| = 1, |b| = √2 ≈ 1.414. cos = 1 / 1.414 ≈ 0.71 (angle 45°).' },
    ]},
    { type: 'sources', items: [
      { title: 'Neural Machine Translation of Rare Words with Subword Units', publisher: 'Sennrich, Haddow, Birch (ACL / arXiv)', url: 'https://arxiv.org/abs/1508.07909', year: 2016, used: 'BPE ko words todne ke liye use karna; rare words ka problem.' },
      { title: 'Byte-Pair Encoding tokenization (LLM Course, chapter 6)', publisher: 'Hugging Face', url: 'https://huggingface.co/learn/llm-course/chapter6/5', year: 2024, used: 'BPE training ke steps, hug/pug/pun corpus aur uske pehle merges (u+g 20, u+n 16, h+ug 15), GPT-2 ka 256-byte base vocab.' },
      { title: 'Language Models are Unsupervised Multitask Learners (GPT-2)', publisher: 'Radford et al., OpenAI', url: 'https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf', year: 2019, used: 'Byte-level BPE aur 50,257 vocab.' },
      { title: 'tiktoken (o200k_base, cl100k_base, gpt2 encodings)', publisher: 'OpenAI (GitHub)', url: 'https://github.com/openai/tiktoken', year: 2025, used: 'Is lesson ke saare asli token splits, IDs aur counts tiktoken 0.14 se nikaale gaye.' },
      { title: 'WordPiece tokenization (LLM Course, chapter 6)', publisher: 'Hugging Face', url: 'https://huggingface.co/learn/llm-course/chapter6/6', year: 2024, used: 'WordPiece ka ## prefix, score = pair ÷ (A × B), longest-match-first encoding, poora word [UNK]; ye bhi ki Google ne training code publish nahi kiya. Widget ke numbers humne khud is formula se nikaale.' },
      { title: 'Unigram tokenization (LLM Course, chapter 6)', publisher: 'Hugging Face', url: 'https://huggingface.co/learn/llm-course/chapter6/7', year: 2024, used: 'Unigram: bade vocab se tokens hatana, base characters rakhna, segmentation = probabilities ka guna, Viterbi; T5/ALBERT/XLNet mein SentencePiece ke saath.' },
      { title: 'Subword Regularization: Improving Neural Network Translation Models with Multiple Subword Candidates', publisher: 'Taku Kudo (arXiv, ACL 2018)', url: 'https://arxiv.org/abs/1804.10959', year: 2018, used: 'Unigram language model tokenizer aur subword regularization.' },
      { title: 'SentencePiece: A simple and language independent subword tokenizer and detokenizer', publisher: 'Kudo, Richardson (arXiv, EMNLP 2018)', url: 'https://arxiv.org/abs/1808.06226', year: 2018, used: 'Raw text pe training, space ko ▁ banana, lossless (reversible) tokenization.' },
      { title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding', publisher: 'Devlin et al., Google (arXiv)', url: 'https://arxiv.org/abs/1810.04805', year: 2018, used: 'BERT ka WordPiece tokenizer (~30k vocab; bert-base-uncased config mein 30,522).' },
      { title: 'Language Model Tokenizers Introduce Unfairness Between Languages', publisher: 'Petrov et al., NeurIPS', url: 'https://arxiv.org/abs/2305.15425', year: 2023, used: 'Languages ke beech token count ka 15x tak farq aur uska cost/latency/context pe asar.' },
      { title: 'Welcome Llama 3', publisher: 'Hugging Face blog', url: 'https://huggingface.co/blog/llama3', year: 2024, used: 'Llama 3 vocab 128,256 (Llama 2: 32K) aur bade vocab se embedding matrices ka bada hona.' },
      { title: 'Efficient Estimation of Word Representations in Vector Space (word2vec)', publisher: 'Mikolov et al., Google (arXiv)', url: 'https://arxiv.org/abs/1301.3781', year: 2013, used: 'Static word embeddings aur vector arithmetic (king − man + woman ≈ queen).' },
      { title: 'What are tokens and how to count them?', publisher: 'OpenAI Help Center', url: 'https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them', year: 2025, used: '1 token ≈ 4 characters ≈ ¾ word (English).' },
      { title: 'Transformers Explained | Simple Explanation of Transformers', publisher: 'codebasics (YouTube)', url: 'https://www.youtube.com/watch?v=ZhAz268Hdpw', used: 'Learner ka reference video; iske chapters "Word Embeddings", "Contextual Embeddings" aur "Tokenization" yahan cover kiye.' },
    ]},
  ],
});
