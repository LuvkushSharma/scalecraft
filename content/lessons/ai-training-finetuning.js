/*
  ai-training-finetuning. All numbers below are computed in scratchpad/a3/train_math.js:
  cross-entropy -ln(p): p=0.9 -> 0.105, 0.5 -> 0.693, 0.25 -> 1.386, 0.1 -> 2.303, 0.01 -> 4.605
  6*N*D for 7B params x 2T tokens = 8.4e22 FLOPs
  Llama 2 7B: 184,320 A100 GPU-hours -> 7.68 days on 1000 GPUs, ~21 years on 1 GPU
  V2 additions (scratchpad/v2tf/math.js): toy gradient descent loss=(w-2)^2, w0=5:
    lr 0.1 -> w 4.4, 3.92, 3.536 ... loss 9 -> 5.76 -> 3.686; lr 0.5 -> w=2 in one step; lr 1.0 bounces 5,-1,5; lr 1.1 diverges (-1.6, 6.32, loss 12.96, 18.662)
    sigmoid(0)=0.5, sigmoid(2)=0.881, sigmoid(-2)=0.119; ln0.5+ln0.2 = -0.693-1.609 = -2.303 = ln0.1; 10,000 examples / batch 100 = 100 steps per epoch
  DPO (beta=0.1): start loss 0.693; chosen +2, rejected -1 -> margin 0.3, loss 0.554
  Full fine-tune memory (weights+grads+Adam, mixed precision, 16 B/param): 6.74B -> 107.8 GB, 13B -> 208 GB, 70B -> 1120 GB
*/
Lesson.register({
  id: 'ai-training-finetuning',
  title: 'Pre-training, fine-tuning, RLHF',
  minutes: 32,
  summary: `Ek LLM teen stage mein banta hai: pehle internet ka text padh ke "agla token" guess karna seekhta hai (pre-training), phir instructions follow karna (SFT), phir insaanon ki pasand ke hisaab se behave karna (RLHF ya DPO). Is lesson mein har stage ka data, loss, cost aur failure dekhenge, aur decide karenge ki xyz Assistant ke liye prompt, RAG ya fine-tuning mein se kya chahiye.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Ek naya LLM pehle kuch nahi jaanta. Uske andar bas arabon random numbers hote hain.<br>Training = in numbers ko dheere dheere sudhaarna, jab tak model achha jawab na dene lage.<br>Ye teen kadmon mein hota hai: (1) internet ka text padh ke agla word guess karna seekho, (2) sawaal ka jawab dena seekho, (3) insaan jaisa jawab pasand karein waisa bolna seekho.<br>Is lesson mein har kadam chhote numbers se khud chala ke dekhoge. Aur aakhir mein decide karoge ki xyz.com ko apna model train karna chahiye ya nahi.` },
    { type: 'h2', text: 'Problem: base model "assistant" nahi hai' },
    { type: 'p', html: `xyz.com apna <strong>xyz Assistant</strong> bana raha hai. Team ne internet se ek open model download kiya aur usse poochha: <code>xyz.com pe refund kaise milta hai?</code>. Jawab aaya:` },
    { type: 'ascii', text: `xyz.com pe refund kaise milta hai?
xyz.com pe password kaise badle?
xyz.com pe account delete kaise kare?
xyz.com pe ...`, caption: 'Base model ne jawab nahi diya, bas aur sawaal "continue" kar diye.' },
    { type: 'p', html: `Model kharab nahi hai. Ye bilkul wahi kar raha hai jo usne seekha: <strong>agla token predict karna</strong> (yaad karo <a href="#/ai-what-is-llm">LLM kya hai</a> lesson). Internet pe aise FAQ pages mein ek sawaal ke baad aksar doosra sawaal aata hai, to model ne wahi pattern continue kiya. Ise <strong>base model</strong> kehte hain. Assistant banane ke liye aur training chahiye. Aaj ka sawaal: wo training kaise hoti hai, kitni mehngi hai, aur xyz ko khud karni chahiye ya nahi?` },
    { type: 'callout', tone: 'term', title: 'Naya word: weights (parameters)', html: `<strong>Ye kya hai:</strong> model ke andar ke numbers. Jaise <code>0.12</code>, <code>-0.83</code>, <code>1.05</code>. Ye badi tables (matrices) mein rakhe hote hain. 7B model = lagbhag 7 arab (7 billion) aise numbers.<br><strong>Kyun chahiye:</strong> model jo bhi "jaanta" hai (grammar, facts, code), wo inhi numbers mein chhupa hai. Input ke numbers inse multiply ho ke output bante hain.<br><strong>Iske bina:</strong> model sirf ek khaali formula hai. Galat weights = bakwaas output.` },
    { type: 'callout', tone: 'term', title: 'Naya word: training vs inference', html: `<strong>Ye kya hai:</strong> <strong>Training</strong> = weights ko thoda thoda badalna, taaki galtiyan kam hon. <strong>Inference</strong> = trained model ko use karna: weights fixed, bas jawab nikalna (jab tum chat karte ho, wo inference hai).<br><strong>Kyun chahiye:</strong> training ek baar (bahut mehngi), inference har user request pe (sasti, lekin crore baar).<br><strong>Iske bina:</strong> dono ko mix karoge to cost ka hisaab galat hoga. "Model use karna" aur "model banana" bilkul alag kaam hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: base model', html: `<strong>Ye kya hai:</strong> wo model jisne sirf pre-training ki hai (neeche stage 1). Ise <strong>foundation model</strong> bhi kehte hain. Ye text <em>continue</em> karna jaanta hai, sawaal ka <em>jawab</em> dena nahi.<br><strong>Kyun chahiye:</strong> saara general gyaan (language, facts, code) isi mein aata hai. Baaki stages iske upar bante hain.<br><strong>Iske bina:</strong> har company ko zero se sab kuch sikhana padta. Upar wala refund example dikhata hai ki sirf base model bhi kaafi nahi.` },
    { type: 'ascii', text: `Stage 1: PRE-TRAINING        Stage 2: SFT                 Stage 3: PREFERENCE TUNING
(internet text, trillions    (instruction -> answer       (do answers, kaunsa better?
 of tokens)                   pairs, hazaaron-laakhon)     RLHF with PPO, ya DPO)
        |                            |                            |
        v                            v                            v
   Base model  ------------->  Instruct model  ----------->  Chat model (helpful, safe)
  "text continue karta"        "instruction follow"         "jaisa insaan pasand karein"`, caption: 'Modern chat models ka standard recipe. InstructGPT paper (OpenAI, 2022) ne ise popular banaya. Ghabrao mat: SFT, RLHF, PPO, DPO, sab neeche ek ek karke samjhenge.' },
    { type: 'h2', text: 'Stage 1: Pre-training (agla token, trillions baar)' },
    { type: 'p', html: `Pre-training mein model ko internet ka bahut saara text diya jaata hai: websites, books, code, Wikipedia. Koi label nahi chahiye, kyunki text khud hi answer hai. Sentence <code>xyz.com pe naya video aaya</code> se training examples apne aap bante hain:` },
    { type: 'table', head: ['Model ko dikhta hai (input)', 'Sahi agla token (target)'], rows: [
      ['xyz.com', 'pe'], ['xyz.com pe', 'naya'], ['xyz.com pe naya', 'video'], ['xyz.com pe naya video', 'aaya'],
    ], caption: 'Ek sentence se kai examples. Asli mein tokens words se chhote hote hain (dekho Tokenization lesson); yahan samajhne ke liye words liye hain.' },
    { type: 'callout', tone: 'term', title: 'Naya word: self-supervised learning', html: `<strong>Ye kya hai:</strong> aisi training jahan "sahi jawab" (label) data se <em>khud</em> ban jaata hai. Yahan agla word hi sahi jawab hai.<br><strong>Kyun chahiye:</strong> trillions tokens pe training karni hai. Itne examples pe koi insaan label nahi laga sakta.<br><strong>Iske bina:</strong> har example ke liye kisi ko baith ke "sahi jawab" likhna padta. Itna bada data kabhi ban hi nahi paata.` },
    { type: 'h3', text: 'Model ki galti kaise naapte hain: cross-entropy loss' },
    { type: 'p', html: `Har position pe model har possible token ko ek <strong>probability</strong> deta hai: 0 se 1 ke beech ka number, sab milke 1 (softmax, <a href="#/ai-what-is-llm">LLM kya hai</a> lesson mein dekha tha). Jaise <code>video: 0.6, photo: 0.3, gaana: 0.1</code>.<br>Agar sahi token "video" ko model ne <code>p = 0.9</code> diya, achha. <code>p = 0.01</code> diya, bura. Ab galti ko ek number mein naapna hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: loss (cross-entropy)', html: `<strong>Ye kya hai:</strong> model ki galti ka ek number. Kam = achha. Next-token training mein ye <strong>loss = -ln(p)</strong> hai, jahan p = sahi token ki probability. Isko <strong>cross-entropy loss</strong> kehte hain.<br><strong>ln ka darr mat lo:</strong> ln (natural log) calculator ka ek button hai. Bas teen baatein yaad rakho: p = 1 ho to loss = 0 (perfect). p ghate to loss badhe. p bahut chhota ho to loss bahut bada.<br><strong>Kyun chahiye:</strong> training ko ek hi number chahiye jise wo neeche le jaaye. "Achha/bura" se kaam nahi chalta.<br><strong>Iske bina:</strong> model ko pata hi nahi chalega ki kitna galat tha, aur kis taraf sudhaarna hai.<br><strong>Example:</strong> p = 0.9 → loss 0.105. p = 0.1 → loss 2.303.` },
    { type: 'p', html: `Training ka poora goal: bahut saare examples pe <strong>average loss kam karna</strong>. Slider khiska ke dekho p aur loss ka rishta:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<label>Sahi token ("video") ko model ne kitni probability di? <strong class="tf-pv">0.50</strong></label>
        <input class="tf-p" type="range" min="1" max="99" step="1" value="50" style="width:100%">
        <div class="stats"><div class="stat"><span>Loss = -ln(p)</span><strong class="tf-l"></strong></div>
        <div class="stat"><span>Matlab</span><strong class="tf-m" style="font-size:16px"></strong></div></div>
        <div class="tf-bar" style="height:12px;border-radius:6px;background:var(--surface-2);margin-top:12px;overflow:hidden"><div class="tf-fill" style="height:100%;background:var(--red)"></div></div>
        <div class="calc-note">Table: p = 0.9 → 0.105, p = 0.5 → 0.693, p = 0.25 → 1.386, p = 0.1 → 2.303, p = 0.01 → 4.605. Dhyaan do: p aadha hone pe loss sirf thoda badhta hai, lekin p bahut chhota hone pe loss tezi se upar jaata hai. Confident galti sabse mehngi hai.</div>`;
      const s = el.querySelector('.tf-p');
      const upd = () => {
        const p = Number(s.value) / 100, L = -Math.log(p);
        el.querySelector('.tf-pv').textContent = p.toFixed(2);
        el.querySelector('.tf-l').textContent = L.toFixed(3);
        el.querySelector('.tf-m').textContent = p >= 0.7 ? 'Achha guess, chhoti galti' : p >= 0.3 ? 'Confused hai' : 'Badi galti, bada sudhaar';
        el.querySelector('.tf-fill').style.width = Math.min(100, L / 4.605 * 100).toFixed(1) + '%';
      };
      s.addEventListener('input', upd); upd();
    }},
    { type: 'h3', text: 'Loss kam kaise hota hai: ek weight wala khilona' },
    { type: 'p', html: `Asli model mein arabon weights hain. Samajhne ke liye sirf <strong>ek weight</strong> lo: <code>w</code>. Maan lo sabse achha value <code>w = 2</code> hai, lekin model ko ye pata nahi. Model ka loss hai <code>loss = (w - 2)²</code>. Abhi <code>w = 5</code> hai, to loss = 3² = <strong>9</strong>.<br>Model ko bas itna pata chal sakta hai ki "w thoda badhaun to loss badhega ya ghatega". Yahi gradient hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: gradient', html: `<strong>Ye kya hai:</strong> har weight ke liye ek number jo batata hai: is weight ko thoda badhaoge to loss kitna aur kis taraf badlega. Positive gradient = weight badhaya to loss badhega, isliye weight <em>ghatao</em>.<br><strong>Kyun chahiye:</strong> arabon weights hain. Har ek ko andaaze se nahi badal sakte. Gradient har weight ko uski apni direction deta hai.<br><strong>Iske bina:</strong> andhere mein teer: random badlaav, loss kabhi neeche nahi aayega.<br><strong>Example:</strong> loss = (w - 2)² ka gradient = 2 × (w - 2). w = 5 pe gradient = 2 × 3 = <strong>6</strong>. Positive hai, to w ko ghatana hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: learning rate', html: `<strong>Ye kya hai:</strong> ek chhota number jo batata hai har step mein kitna bada kadam lena hai. Update rule: <code>w = w - learning_rate × gradient</code>.<br><strong>Kyun chahiye:</strong> gradient sirf direction aur dhalaan batata hai. Kitna chalna hai, wo hum chunte hain.<br><strong>Iske bina (ya galat ho to):</strong> bahut bada = model sahi jagah ke paar kood jaata hai aur loss phat jaata hai. Bahut chhota = training hafton slow.<br><strong>Example:</strong> learning rate 0.1, w = 5, gradient 6: naya w = 5 - 0.1 × 6 = <strong>4.4</strong>. Loss 9 se ghat ke 5.76.` },
    { type: 'p', html: `Ab khud chalao. Learning rate chuno aur "Ek step" dabao. Dekho 0.1 pe w dheere dheere 2 ki taraf jaata hai, 0.5 pe ek hi step mein 2, 1.0 pe 5 aur -1 ke beech jhoolta rehta hai, aur 1.1 pe loss har step badhta hai (training phat gayi).` },
    { type: 'custom', render(el) {
      el.innerHTML = `<label>Learning rate: <strong class="tf-lrv">0.10</strong></label>
        <input class="tf-lr" type="range" min="0.05" max="1.2" step="0.05" value="0.1" style="width:100%">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0"><button type="button" class="btn small primary tf-st">Ek step</button><button type="button" class="btn small ghost tf-rs">Reset (w = 5)</button></div>
        <div class="stats"><div class="stat"><span>w</span><strong class="tf-w0"></strong></div><div class="stat"><span>Loss = (w - 2)²</span><strong class="tf-l0"></strong></div><div class="stat"><span>Gradient = 2(w - 2)</span><strong class="tf-g0"></strong></div></div>
        <div style="overflow-x:auto"><table class="tf-hist" style="width:100%;border-collapse:collapse;font:13px var(--f-mono);margin-top:10px"></table></div>
        <div class="calc-note tf-gn"></div>`;
      let w = 5, hist = [];
      const s = el.querySelector('.tf-lr');
      const r3 = v => (Math.round(v * 1000) / 1000).toString();
      const show = () => {
        const lr = Math.round(Number(s.value) * 100) / 100, L = (w - 2) ** 2, g = 2 * (w - 2);
        el.querySelector('.tf-lrv').textContent = lr.toFixed(2);
        el.querySelector('.tf-w0').textContent = r3(w);
        el.querySelector('.tf-l0').textContent = r3(L);
        el.querySelector('.tf-g0').textContent = r3(g);
        el.querySelector('.tf-hist').innerHTML = '<tr><th style="text-align:left;padding:4px;border-bottom:1px solid var(--line)">Step</th><th style="text-align:left;padding:4px;border-bottom:1px solid var(--line)">w</th><th style="text-align:left;padding:4px;border-bottom:1px solid var(--line)">Loss</th></tr>' + hist.map((h, i) => `<tr><td style="padding:4px;color:var(--ink-2)">${i}</td><td style="padding:4px">${r3(h[0])}</td><td style="padding:4px;color:${i && h[1] > hist[i - 1][1] ? 'var(--red)' : 'var(--ink)'}">${r3(h[1])}</td></tr>`).join('');
        el.querySelector('.tf-gn').textContent = lr < 0.5 ? 'Chhota learning rate: har step loss thoda ghat-ta hai. Safe, lekin dheere.' : lr === 0.5 ? 'Is khilone ke liye perfect kadam: ek step mein w = 2, loss 0. Asli model mein aisa perfect number pehle se pata nahi hota.' : lr < 1 ? 'Bada kadam: w 2 ke aar-paar jhoolta hai, phir bhi dheere dheere paas aata hai.' : lr === 1 ? 'Bilkul 1.0: w 5 aur -1 ke beech hamesha jhoolta rahega. Loss kabhi kam nahi hoga.' : 'Bahut bada kadam: har step pichhle se zyada door. Loss phat raha hai (laal numbers). Ise training "diverge" hona kehte hain.';
      };
      const reset = () => { w = 5; hist = [[w, (w - 2) ** 2]]; show(); };
      el.querySelector('.tf-st').addEventListener('click', () => { if (hist.length > 12) return; w = w - Math.round(Number(s.value) * 100) / 100 * 2 * (w - 2); hist.push([w, (w - 2) ** 2]); show(); });
      el.querySelector('.tf-rs').addEventListener('click', reset);
      s.addEventListener('input', reset);
      reset();
    }},
    { type: 'p', html: `Asli training mein bas yahi hota hai, lekin ek weight ki jagah arabon weights, aur ek simple formula ki jagah poora Transformer. Gradient nikalne ka tareeka <strong>backpropagation</strong> kehlata hai: loss se shuru karke, layer by layer peeche jaate hue har weight ka gradient nikalna (chain rule). PyTorch jaise libraries ye apne aap kar deti hain.` },
    { type: 'h3', text: 'Ek training step andar se' },
    { type: 'steps', items: [
      { t: 'Forward pass', d: 'Text ka ek <strong>batch</strong> (jaise 100 sentences ek saath) model mein jaata hai. Har position pe agle token ki probabilities nikalti hain. Ek sequence ki saari positions ek saath (parallel) check hoti hain, isliye Transformer training fast hai.' },
      { t: 'Loss', d: 'Har position ka -ln(p sahi token) nikaal ke average.' },
      { t: 'Backward pass (backpropagation)', d: 'Har weight ke liye ek <strong>gradient</strong> nikalta hai: "is weight ko thoda badhaoge to loss kitna badhega ya ghatega". Gradient ek direction bataata hai.' },
      { t: 'Optimizer update', d: 'Har weight ko gradient ki ulti direction mein chhota sa kadam: <code>w = w - learning_rate × gradient</code>, bilkul upar wale khilone jaisa. Asli mein AdamW optimizer use hota hai (neeche card), jo har weight ke liye do extra numbers yaad rakhta hai. Ye detail memory calculation mein kaam aayegi.' },
      { t: 'Repeat', d: 'Arabon tokens, laakhon steps. Loss dheere dheere girta hai, aur model grammar, facts, code, reasoning ke patterns seekh leta hai.' },
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: optimizer (Adam / AdamW)', html: `<strong>Ye kya hai:</strong> wo rule jo gradient dekh ke weights badalta hai. Sabse simple rule upar wala hai (<code>w - lr × gradient</code>, ise SGD kehte hain). LLMs mein <strong>Adam</strong> ya uska bhai <strong>AdamW</strong> chalta hai.<br><strong>Adam extra kya karta hai:</strong> har weight ke liye do running averages yaad rakhta hai. (1) <strong>Momentum</strong> = pichhle gradients ka average. Gradients agar +4, -2, +4 aaye, to average = +2: direction shaant aur stable. (2) <strong>Variance</strong> = gradient² ka average. Jis weight ka gradient hamesha bada aata hai, uska kadam chhota kar deta hai. Har weight ko apna khud ka step size mil jaata hai.<br><strong>Kyun chahiye:</strong> arabon weights, har ek ki "dhalaan" alag. Ek fixed kadam sab pe theek nahi baithta. Adam se training tez aur stable.<br><strong>Iske bina:</strong> training noisy, slow, aur learning rate chunna bahut mushkil. Keemat: har weight ke 2 extra numbers = zyada memory (neeche table).` },
    { type: 'callout', tone: 'term', title: 'Naya word: batch, step aur epoch', html: `<strong>Ye kya hai:</strong> <strong>Batch</strong> = ek saath model mein daale gaye examples. <strong>Step</strong> = ek batch pe ek baar forward, loss, backward, update. <strong>Epoch</strong> = poore training data pe ek baar guzarna.<br><strong>Example:</strong> 10,000 examples, batch size 100 → ek epoch = 100 steps. 3 epochs = 300 steps.<br><strong>Kyun chahiye:</strong> saara data ek saath GPU mein nahi aata, aur ek ek example pe update bahut noisy hai. Batch beech ka raasta hai.<br><strong>Iske bina:</strong> ya to memory khatam, ya training bahut slow aur hilti hui. Aur epochs ginoge nahi to chhote data pe zaroorat se zyada baar train karke model ko ratta-maar (overfit) bana doge.` },
    { type: 'h3', text: 'Pre-training kitni mehngi hai?' },
    { type: 'callout', tone: 'term', title: 'Naya word: GPU, GPU-hour aur FLOPs', html: `<strong>Ye kya hai:</strong> <strong>GPU</strong> = ek chip jo hazaaron chhote calculations ek saath karti hai (pehle games ke graphics ke liye bani thi). Training bas bahut saare multiply-add hai, isliye GPU pe chalti hai. NVIDIA <strong>A100</strong> ek popular data-center GPU hai. <strong>GPU-hour</strong> = ek GPU ka ek ghanta kaam. <strong>FLOP</strong> = ek floating-point calculation (jaise ek multiply ya ek add).<br><strong>Kyun chahiye:</strong> training ka kharcha inhi units mein naapa jaata hai. Cloud mein GPU ghante ke hisaab se kiraaye pe milta hai.<br><strong>Iske bina:</strong> "model train karna mehnga hai" sirf ek feeling rehti. Ye units usko numbers mein badalte hain.<br><strong>Example:</strong> 100 GPU, 10 ghante = 1,000 GPU-hours.` },
    { type: 'p', html: `Meta ke Llama 2 paper (2023) mein 7B model ko 2 trillion tokens pe train kiya gaya, aur sirf 7B model ne <strong>184,320 A100 GPU-hours</strong> liye. 1,000 GPU saath chalao to bhi ~7.7 din. Ek GPU pe? ~21 saal. Saare Llama 2 sizes milake ~3.3 million GPU-hours. Ek mota rule of thumb (Kaplan et al., 2020): training compute ≈ <code>6 × N × D</code> FLOPs, jahan N = parameters, D = training tokens. 7B × 2T → 6 × 7×10⁹ × 2×10¹² = <strong>8.4 × 10²² FLOPs</strong>.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion: "hum apna GPT train kar lenge"', html: `Startups aksar "apna model" bolte hain to unka matlab pre-training nahi, <strong>fine-tuning</strong> hota hai. Pre-training se ek naya base model banana crore-arab rupaye ka kaam hai (data, GPUs, engineers). xyz.com jaisi company ek existing base ya chat model leti hai aur upar ke stages (ya sirf prompt/RAG) karti hai.` },
    { type: 'h2', text: 'Stage 2: SFT (instruction tuning)' },
    { type: 'p', html: `Base model ko "assistant" ki tarah behave karna sikhane ke liye hum likhe hue examples dikhate hain: <em>instruction</em> aur uska <em>achha jawab</em>. Ye examples log (ya ab aksar doosra strong model) likhte hain. Training wahi next-token prediction hai, bas data badal gaya. Isko <strong>SFT (Supervised Fine-Tuning)</strong> ya <strong>instruction tuning</strong> kehte hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: fine-tuning aur SFT', html: `<strong>Ye kya hai:</strong> <strong>Fine-tuning</strong> = pehle se trained model ki training ko chhote, khaas data pe aage badhana. <strong>SFT</strong> = aisi fine-tuning jahan har example mein "sahi jawab" likha hua hai (supervised = jaise teacher ne answer key di).<br><strong>Kyun chahiye:</strong> base model sab jaanta hai lekin baat karna nahi jaanta. Kuch hazaar achhe examples use "assistant" ka style sikha dete hain.<br><strong>Iske bina:</strong> upar wala refund example: sawaal ke badle aur sawaal.<br><strong>Example:</strong> pre-training = trillions tokens. SFT = hazaaron se laakhon examples. Data chhota, lekin bahut saaf hona chahiye.` },
    { type: 'callout', tone: 'term', title: 'Naya word: chat template', html: `<strong>Ye kya hai:</strong> special tokens ka ek fixed format jo batata hai kaun bol raha hai, jaise <code>&lt;user&gt;</code> ... <code>&lt;assistant&gt;</code> ... <code>&lt;end&gt;</code>. Har model family ka apna template hota hai.<br><strong>Kyun chahiye:</strong> model ko pata chale ki sawaal kahan khatam hua, jawab kahan shuru karna hai, aur kab rukna hai.<br><strong>Iske bina:</strong> model user ki line bhi khud likhne lagta hai, ya rukta hi nahi. Aur galat template use karoge (training mein ek, inference mein doosra) to fine-tuned model ajeeb jawab dega.` },
    { type: 'p', html: `<strong>Quantity se zyada quality:</strong> LIMA paper (Meta, 2023) mein ek 65B base model ko sirf <strong>1,000</strong> dhyaan se chune hue examples pe SFT kiya gaya, aur jawab kaafi achhe aaye. Seekh: SFT style aur format sikhata hai. Gyaan to pre-training se pehle hi aa chuka hai. 1 lakh kachre wale examples se 1,000 saaf examples behtar.` },
    { type: 'p', html: `Ek important trick: <strong>loss sirf jawab ke tokens pe</strong>. User ka sawaal model ko context ke liye dikhta hai, lekin us pe galti nahi gini jaati, kyunki hum model ko sawaal likhna nahi, jawab dena sikha rahe hain. Neeche toggle karke dekho:` },
    { type: 'custom', render(el) {
      const toks = [['<user>', 'p'], ['xyz', 'p'], ['pe', 'p'], ['refund', 'p'], ['kaise', 'p'], ['milega', 'p'], ['?', 'p'], ['<assistant>', 'p'], ['Orders', 'a'], ['page', 'a'], ['kholo', 'a'], [',', 'a'], ['"Refund"', 'a'], ['dabao', 'a'], ['.', 'a'], ['<end>', 'a']];
      el.innerHTML = `<div class="chips" style="padding:0 0 10px"><button type="button" class="chip on" data-m="pre">Pre-training style (sab pe loss)</button><button type="button" class="chip" data-m="sft">SFT (sirf jawab pe loss)</button></div>
        <div class="tf-toks" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <div class="stats"><div class="stat"><span>Tokens jin pe loss lagta hai</span><strong class="tf-n"></strong></div><div class="stat"><span>Model kya seekhta hai</span><strong class="tf-w" style="font-size:15px"></strong></div></div>
        <div class="calc-note"><code>&lt;user&gt;</code>, <code>&lt;assistant&gt;</code>, <code>&lt;end&gt;</code> special tokens hain. Har model ka apna <strong>chat template</strong> hota hai jo batata hai kaun bol raha hai. <code>&lt;end&gt;</code> pe loss lagana zaroori hai, warna model ko rukna nahi aayega.</div>`;
      const box = el.querySelector('.tf-toks');
      const draw = m => {
        el.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c.dataset.m === m));
        box.innerHTML = '';
        let n = 0;
        toks.forEach(([t, k]) => {
          const on = m === 'pre' || k === 'a';
          if (on) n++;
          const s = document.createElement('span');
          s.textContent = t;
          s.style.cssText = 'font:14px var(--f-mono);padding:4px 8px;border-radius:var(--r-sm);border:1px solid ' + (on ? 'var(--accent)' : 'var(--line)') + ';background:' + (on ? 'var(--accent-soft)' : 'var(--surface-2)') + ';color:' + (on ? 'var(--ink)' : 'var(--ink-3)');
          box.appendChild(s);
        });
        el.querySelector('.tf-n').textContent = n + ' / ' + toks.length;
        el.querySelector('.tf-w').textContent = m === 'pre' ? 'Sawaal aur jawab dono likhna' : 'Sawaal padh ke sirf jawab dena';
      };
      el.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => draw(c.dataset.m)));
      draw('pre');
    }},
    { type: 'p', html: `SFT ke baad model sawaal ka jawab deta hai. Lekin problem: SFT sirf ek "sahi" jawab dikhata hai. Real duniya mein ek sawaal ke kai theek jawab hote hain, aur kuch dusron se <em>behtar</em> (zyada clear, zyada safe, kam lamba). "Behtar" ko likh ke sikhana mushkil hai, lekin do jawab dekh ke "ye wala behtar" bolna insaanon ke liye aasaan hai. Yahi stage 3 ka idea hai.` },
    { type: 'h2', text: 'Stage 3: RLHF (insaanon ki pasand se seekhna)' },
    { type: 'p', html: `Ek line mein: RLHF = model se jawab likhwao, insaanon ki pasand ke hisaab se score do, aur model ko zyada score waale jawab ki taraf dhakelo. Pehle iske chaar naye words ek ek karke:` },
    { type: 'callout', tone: 'term', title: 'Naya word: reinforcement learning (RL) aur policy', html: `<strong>Ye kya hai:</strong> <strong>RL</strong> = seekhne ka aisa tareeka jahan model kuch karta hai, use ek score (<strong>reward</strong>) milta hai, aur wo zyada score waale kaam zyada karna seekhta hai. Jaise game khelte khelte high score wali chaalein yaad ho jaana. <strong>Policy</strong> = RL ki bhasha mein "jo model train ho raha hai". <strong>RLHF</strong> = RL from Human Feedback: reward insaanon ki pasand se aata hai.<br><strong>Kyun chahiye:</strong> SFT sirf ek likha hua jawab copy karna sikhata hai. RL model ke <em>apne</em> jawabon ko score karke sudhaarta hai.<br><strong>Iske bina:</strong> model sahi lekin rookhe, bahut lambe ya kabhi kabhi unsafe jawab deta rehta hai. "Behtar" ki samajh nahi aati.` },
    { type: 'callout', tone: 'term', title: 'Naya word: reward model (aur sigmoid σ)', html: `<strong>Ye kya hai:</strong> ek alag model jo (sawaal, jawab) padh ke ek number deta hai: "insaan ise kitna pasand karenge". Ye insaanon ki pasand ki ek sasti copy hai.<br><strong>Kyun chahiye:</strong> RL loop mein laakhon jawab score karne hain. Har baar insaan ko nahi bula sakte.<br><strong>Iske bina:</strong> har jawab pe insaan chahiye: bahut slow aur mehnga.<br><strong>Kaise seekhta hai:</strong> loss = -ln σ(r_chosen - r_rejected). Yahan <strong>σ (sigmoid)</strong> ek function hai jo kisi bhi number ko 0 aur 1 ke beech daba deta hai: σ(0) = 0.5, σ(2) = 0.881, σ(-2) = 0.119. Agar pasand wale jawab ka score 2 zyada hai, to σ = 0.881 aur loss chhota. Ulta ho to loss bada.` },
    { type: 'callout', tone: 'term', title: 'Naya word: PPO', html: `<strong>Ye kya hai:</strong> Proximal Policy Optimization. Ek RL algorithm jo policy ko reward ki taraf <em>chhote, controlled</em> kadmon mein update karta hai ("proximal" = paas mein). Ek step mein policy bahut zyada badalne lage to update ko kaat (clip) deta hai.<br><strong>Kyun chahiye:</strong> RL ke updates bahut hilte hain. Ek bada galat kadam poore model ki language kharab kar sakta hai.<br><strong>Iske bina:</strong> training unstable: kabhi achha, kabhi achanak bakwaas.` },
    { type: 'callout', tone: 'term', title: 'Naya word: KL penalty aur reference model', html: `<strong>Ye kya hai:</strong> <strong>Reference model</strong> = SFT model ki ek frozen (kabhi na badalne wali) copy. <strong>KL divergence</strong> = ek number jo batata hai do models ke probabilities kitne alag hain (0 = bilkul same). <strong>KL penalty</strong> = reward mein se ye doori ghatao: <code>final reward = score - β × KL</code>.<br><strong>Kyun chahiye:</strong> policy ko reference ke aas paas rakhna, taaki wo reward model ki kamzoriyon ka fayda na uthaye.<br><strong>Iske bina:</strong> "reward hacking": policy ajeeb, lambe, chaplusi wale jawab likhne lagti hai jinka score high hai lekin insaan naraz. Neeche diagram ka failure scenario yahi dikhata hai.` },
    { type: 'steps', items: [
      { t: 'Comparison data', d: 'SFT model ek sawaal ke 2 ya zyada jawab likhta hai. Human labelers unhe best se worst rank karte hain.' },
      { t: 'Reward model train karo', d: 'Reward model ko sikhaya jaata hai ki pasand kiye gaye jawab ka score zyada aaye: loss = -ln σ(r_chosen - r_rejected) (upar card dekho).' },
      { t: 'RL loop (PPO)', d: 'Policy naye sawaalon ke jawab likhti hai, reward model score deta hai, PPO policy ko zyada score ki taraf update karta hai.' },
      { t: 'KL penalty', d: 'Reward mein se ek penalty ghatate hain agar policy ka output original SFT model (reference) se bahut door chala jaaye. Isse policy reward model ko "cheat" nahi kar paati.' },
    ]},
    { type: 'p', html: `OpenAI ke InstructGPT paper (2022) ka famous result: RLHF ke baad sirf <strong>1.3B</strong> parameter wale model ke jawab, 100 guna bade <strong>175B</strong> GPT-3 ke jawabon se zyada pasand kiye gaye. Size se zyada, sahi tarike se align karna maayne rakhta hai. Neeche diagram mein poora loop chala ke dekho, aur failure scenarios bhi:` },
    { type: 'flow', height: 310, title: 'RLHF loop (aur DPO ka shortcut)',
      nodes: [
        { id: 'pr', label: 'Prompts', sub: 'user sawaal', x: 90, y: 70, w: 140, kind: 'client', info: 'Ye kya hai: training ke liye sawaalon ka set, jaise asli users poochhte hain. InstructGPT mein ye API users ke prompts aur labelers ke likhe prompts the.' },
        { id: 'pol', label: 'Policy model', sub: 'SFT se shuru', x: 330, y: 70, w: 150, kind: 'server', info: 'Ye kya hai: policy, yaani jo model train ho raha hai. Shuruaat SFT model ki copy se hoti hai. Isi ke weights badlenge.' },
        { id: 'hum', label: 'Human rankers', sub: 'A > B', x: 600, y: 70, w: 150, kind: 'client', info: 'Ye kya hai: labelers (log) jo do jawab padh ke batate hain kaunsa behtar hai. Ranking likhne se aasaan hai, isliye zyada data jaldi milta hai.' },
        { id: 'rm', label: 'Reward model', sub: 'score deta hai', x: 600, y: 240, w: 150, kind: 'cache', info: 'Ye kya hai: rankings se train hua ek alag model. Input: sawaal + jawab. Output: ek number (reward). Ye insaanon ki pasand ki sasti copy hai, isliye galat bhi ho sakta hai.' },
        { id: 'ppo', label: 'PPO update', sub: 'reward - KL', x: 330, y: 240, w: 150, kind: 'queue', info: 'Ye kya hai: RL algorithm jo update karta hai. Reward badhane ki direction mein policy ke weights thoda badalta hai, lekin chhote kadmon mein (clipped), aur KL penalty ke saath.' },
        { id: 'ref', label: 'Reference', sub: 'frozen SFT copy', x: 90, y: 240, w: 140, kind: 'data', info: 'Ye kya hai: SFT model ki ek frozen copy (iske weights kabhi nahi badalte). Isse compare karke KL penalty nikalti hai: policy reference se jitna door, utna penalty. DPO mein bhi ye chahiye.' },
      ],
      edges: [{ a: 'pr', b: 'pol' }, { a: 'pol', b: 'hum' }, { a: 'hum', b: 'rm' }, { a: 'pol', b: 'rm' }, { a: 'rm', b: 'ppo' }, { a: 'ppo', b: 'pol' }, { a: 'ref', b: 'ppo' }, { id: 'hp', a: 'hum', b: 'ppo', hidden: true, dashed: true }],
      scenarios: [
        { name: 'RLHF happy path', steps: [
          { title: 'Policy do jawab likhti hai', text: 'Sawaal: "Mera video upload fail ho raha hai". Policy (SFT model) do jawab likhti hai, A aur B.', go: 'pr>pol', msg: 'A: "File 2 GB se chhoti karo, phir retry."   B: "Kuch error hai."' },
          { title: 'Insaan rank karte hain', text: 'Labeler kehta hai A behtar hai (specific, helpful).', go: 'pol>hum', after: { hum: { sub: 'A > B' } } },
          { title: 'Reward model seekhta hai', text: 'Hazaaron aise comparisons se reward model train hota hai: A ka score B se zyada aaye.', go: 'hum>rm', after: { rm: { state: 'ok', sub: 'trained' } }, msg: 'loss = -ln σ(r_A - r_B)' },
          { title: 'RL loop: score lo', text: 'Ab naye sawaal pe policy jawab likhti hai, reward model use score karta hai.', go: ['pr>pol', 'pol>rm'], msg: 'reward = 1.8' },
          { title: 'KL check', text: 'Reference model batata hai policy original se kitni door gayi. Final reward = score - β × KL.', go: ['rm>ppo', 'ref>ppo'], parallel: true },
          { title: 'Policy update', text: 'PPO policy ke weights thoda badalta hai. Ye loop hazaaron baar chalta hai.', go: 'ppo>pol', after: { pol: { state: 'ok', sub: 'aligned' } } },
        ]},
        { name: 'Failure: reward hacking', intro: 'Reward model insaanon ki pasand ki sirf ek approximation hai. Policy uski kamzoriyan dhoondh leti hai.', steps: [
          { title: 'Reward model ka bias', text: 'Training data mein lambe jawab aksar pasand kiye gaye the, to reward model ne seekh liya "lamba = achha".', set: { rm: { state: 'warn', sub: 'lamba = achha?' } }, focus: ['rm'] },
          { title: 'Policy cheat karti hai', text: 'KL penalty bahut kam rakhi. Policy har jawab ko lamba, repeat aur chaplusi wala bana deti hai. Score upar, quality neeche.', go: ['pol>rm', 'rm>ppo', 'ppo>pol'], after: { pol: { state: 'hot', sub: 'lambe, faltu jawab' } }, msg: 'reward 1.8 → 4.6, lekin users naraz' },
          { title: 'Fix', text: 'KL penalty badhao (reference ke paas raho), reward model ko naye data se dobara train karo, aur insaanon se regular checking (evals) karao.', go: 'ref>ppo', after: { pol: { state: '', sub: 'reference ke paas' }, rm: { state: '', sub: 'retrained' } } },
        ]},
        { name: 'DPO shortcut', intro: 'DPO (2023) reward model aur PPO dono hata deta hai.', steps: [
          { title: 'Reward model ki zaroorat nahi', text: 'Wahi preference pairs (chosen, rejected) seedhe ek loss function mein jaate hain.', set: { rm: { state: 'dim', sub: 'not needed' }, ppo: { label: 'DPO loss', sub: 'simple formula' } }, show: ['hp'], go: 'hum>ppo', msg: '(prompt, chosen, rejected)' },
          { title: 'Policy aur reference se log-probs', text: 'Dono models se nikalte hain ki chosen aur rejected jawab kitne "likely" hain.', go: ['pol>ppo', 'ref>ppo'], parallel: true },
          { title: 'Seedha update', text: 'Normal supervised training ki tarah gradient update. Na sampling loop, na alag reward model. Isliye simple aur stable.', go: 'ppo>pol', after: { pol: { state: 'ok', sub: 'DPO trained' } } },
        ]},
      ],
    },
    { type: 'h2', text: 'DPO: RLHF bina reward model ke' },
    { type: 'p', html: `RLHF powerful hai lekin mushkil: chaar models ek saath memory mein (policy, reference, reward model, aur PPO ka <strong>value model</strong>, jo andaaza lagata hai ki aage kitna reward milega), jawab likhwane (sampling) ka loop, aur bahut saare settings jinhe sahi chunna padta hai. <strong>DPO (Direct Preference Optimization)</strong>, Rafailov et al. 2023 ke paper se, ne dikhaya ki maths rearrange karke wahi goal ek simple classification-jaise loss se mil sakta hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: log-prob (log probability)', html: `<strong>Ye kya hai:</strong> ek poore jawab ki probability ka ln. Jawab ki probability = uske har token ki probability ka guna (multiply). Jaise do tokens, 0.5 aur 0.2: poora jawab = 0.5 × 0.2 = 0.1. ln lene se guna jod ban jaata hai: ln 0.5 + ln 0.2 = -0.693 + (-1.609) = <strong>-2.303</strong> = ln 0.1.<br><strong>Kyun chahiye:</strong> 200 tokens ke jawab mein 200 chhote numbers ka guna itna chhota hota hai ki computer use 0 bana deta hai. Log mein sirf jodna hai, number theek rehta hai.<br><strong>Iske bina:</strong> lambe jawabon ki probability compare hi nahi ho paati.<br><strong>Padhne ka tareeka:</strong> log-prob hamesha 0 ya negative. 0 ke jitna paas, utna "likely". -12 zyada likely hai -15 se.` },
    { type: 'p', html: `Idea: policy ko chosen jawab ki probability (reference ke muqable) badhani hai aur rejected ki ghatani hai. Har jawab ke liye <strong>log-ratio</strong> = <code>log π(jawab) - log π_ref(jawab)</code> (π = policy model, π_ref = reference). Phir:` },
    { type: 'code', text: `margin = β × [ (log-ratio of chosen) - (log-ratio of rejected) ]
loss   = -ln σ(margin)          σ(z) = 1 / (1 + e^(-z))

β (beta) = reference se kitna door jaane dena hai. Chhota β = zyada aazaadi.` },
    { type: 'p', html: `Worked example (β = 0.1). Chosen jawab: policy log-prob -12, reference -14, to log-ratio = +2 (policy ko ye zyada pasand aaya). Rejected: policy -15, reference -14, log-ratio = -1. Margin = 0.1 × (2 - (-1)) = <strong>0.3</strong>. σ(0.3) = 0.574, loss = -ln(0.574) = <strong>0.554</strong>. Training ke bilkul shuru mein policy = reference, dono log-ratios 0, margin 0, loss = ln 2 = <strong>0.693</strong>. Numbers badal ke khud dekho:` },
    { type: 'custom', render(el) {
      const f = [['pc', 'Policy log-prob (chosen)', -12], ['rc', 'Reference log-prob (chosen)', -14], ['pr', 'Policy log-prob (rejected)', -15], ['rr', 'Reference log-prob (rejected)', -14]];
      el.innerHTML = `<div class="row2">${f.map(([k, l, v]) => `<div><label>${l}</label><input class="tf-${k}" type="number" step="0.5" value="${v}"></div>`).join('')}</div>
        <label>β (beta): <strong class="tf-bv">0.10</strong></label><input class="tf-b" type="range" min="0.01" max="1" step="0.01" value="0.1" style="width:100%">
        <div class="stats"><div class="stat"><span>Chosen log-ratio</span><strong class="tf-o1"></strong></div><div class="stat"><span>Rejected log-ratio</span><strong class="tf-o2"></strong></div>
        <div class="stat"><span>Margin</span><strong class="tf-o3"></strong></div><div class="stat"><span>DPO loss</span><strong class="tf-o4"></strong></div></div>
        <div class="calc-note tf-note"></div>`;
      const g = k => Number(el.querySelector('.tf-' + k).value) || 0;
      const upd = () => {
        const b = g('b'), c = g('pc') - g('rc'), r = g('pr') - g('rr'), m = b * (c - r), L = -Math.log(1 / (1 + Math.exp(-m)));
        el.querySelector('.tf-bv').textContent = b.toFixed(2);
        el.querySelector('.tf-o1').textContent = (c >= 0 ? '+' : '') + c.toFixed(2);
        el.querySelector('.tf-o2').textContent = (r >= 0 ? '+' : '') + r.toFixed(2);
        el.querySelector('.tf-o3').textContent = m.toFixed(3);
        el.querySelector('.tf-o4').textContent = L.toFixed(3);
        el.querySelector('.tf-note').textContent = m > 0 ? 'Margin positive: policy chosen jawab ko rejected se zyada favour kar rahi hai (reference ke muqable). Loss 0.693 se kam.' : m < 0 ? 'Margin negative: policy ulta rejected ko favour kar rahi hai. Loss 0.693 se zyada, gradient zor se sudhaarega.' : 'Margin 0: policy ne abhi kuch nahi seekha (jaise training ka pehla step). Loss = ln 2 = 0.693.';
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'tip', title: 'Aaj kal aur kya chalta hai', html: `• <strong>RLAIF / Constitutional AI</strong> (Anthropic, 2022): insaan ki jagah ek AI, likhe hue principles ("constitution") ke hisaab se jawabon ko compare karta hai. Feedback sasta aur scale pe milta hai.<br>• <strong>RL with verifiable rewards</strong>: maths aur code jaise kaamon mein reward model ki jagah seedha check (answer sahi hai? tests pass hue?). DeepSeek-R1 (2025) ne GRPO algorithm aur aise rule-based rewards se reasoning seekhayi. "Reasoning models" isi tarah ki training se bante hain.<br>• DPO ke kai variants bhi aaye, lekin core idea same: preference pairs se seedha seekhna.` },
    { type: 'h2', text: 'Full fine-tuning ka kharcha: memory' },
    { type: 'p', html: `Maan lo xyz apne support tickets pe 7B model ko <strong>full fine-tune</strong> karna chahta hai (saare weights update). Inference ke liye 7B model ko bf16 mein sirf ~13.5 GB chahiye (har parameter 2 bytes; formats ka detail <a href="#/ai-quantization">Quantization lesson</a> mein). Training mein har parameter ke saath bahut kuch aur yaad rakhna padta hai. Standard mixed-precision Adam training (ZeRO paper, 2019 ka hisaab):` },
    { type: 'callout', tone: 'term', title: 'Naya word: fp32, bf16 aur mixed precision', html: `<strong>Ye kya hai:</strong> ek number ko memory mein kitne bits mein rakhte hain. <strong>fp32</strong> = 32 bit = 4 bytes, bahut sahi (precise). <strong>bf16</strong> / fp16 = 16 bit = 2 bytes, aadhi jagah, thoda kam sahi. <strong>Mixed precision</strong> = bhaari calculation 16-bit mein (tez, kam memory), lekin zaroori cheezein (master weights, Adam ke averages) 32-bit mein.<br><strong>Kyun chahiye:</strong> 16-bit GPU pe kai guna tez hai. Lekin bahut chhota update (jaise 1.0 + 0.0001) 16-bit mein kho jaata hai, isliye ek fp32 copy rakhte hain.<br><strong>Iske bina:</strong> sab fp32 = dheemi training, double memory. Sab 16-bit = chhote updates gaayab, training atak jaati hai. Poora detail <a href="#/ai-quantization">Quantization lesson</a> mein.` },
    { type: 'table', head: ['Cheez', 'Bytes per parameter', 'Kyun'], rows: [
      ['Weights (bf16/fp16)', '2', 'Forward/backward inhi se'],
      ['Gradients (bf16/fp16)', '2', 'Har weight ka gradient'],
      ['Master weights (fp32)', '4', 'Chhote updates 16-bit mein kho jaate, isliye ek fp32 copy'],
      ['Adam momentum (fp32)', '4', 'Gradient ka running average'],
      ['Adam variance (fp32)', '4', 'Gradient² ka running average'],
      ['<strong>Total</strong>', '<strong>16</strong>', 'Activations alag se (batch size aur sequence length pe depend)'],
    ]},
    { type: 'table', head: ['Model', 'Inference (bf16, 2 B/param)', 'Full fine-tune (16 B/param)', 'Kitne 80 GB GPU (sirf ye states)'], rows: [
      ['Llama 2 7B (6.74B)', '13.5 GB', '107.8 GB', '2'],
      ['13B', '26 GB', '208 GB', '3'],
      ['70B', '140 GB', '1,120 GB', '14'],
    ], caption: 'Activations ke bina. Asli mein aur zyada lagta hai. Isliye full fine-tuning ke liye kai GPU chahiye, aur ZeRO/FSDP jaise tricks jo ye states alag alag GPUs mein baant dete hain.' },
    { type: 'p', html: `Aur sirf memory nahi: har fine-tune ka ek poora naya model file (7B = 13.5 GB) save karna padta hai. 10 customers ke liye 10 alag fine-tunes = 135 GB. Yahi pain point PEFT ko janm deta hai (neeche).` },
    { type: 'h2', text: 'Catastrophic forgetting' },
    { type: 'p', html: `xyz ne model ko sirf apne support tickets pe kai epochs full fine-tune kiya. Support ke jawab achhe ho gaye. Lekin ab koi poochhe "2 + 2 × 3?" ya "Python mein list reverse kaise?", model galti karta hai ya har baat ko refund ki taraf le jaata hai. Naya seekhte waqt purana bhool gaya. Isko <strong>catastrophic forgetting</strong> kehte hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: catastrophic forgetting', html: `<strong>Ye kya hai:</strong> naye task pe train karte waqt wahi weights badal jaate hain jo purane skills ke liye zaroori the. Naya seekha, purana achanak bhool gaya.<br><strong>Kyun hota hai:</strong> full fine-tuning mein saare weights khule hain, aur loss sirf naye data pe lagta hai. Purane skills ko bachane wala koi signal hi nahi.<br><strong>Iske bina (agar dhyaan na do):</strong> support bot refund mein expert, lekin maths, code aur normal baatcheet mein kharab. Chhote dataset pe bahut epochs = <strong>overfitting</strong> (training examples ratt liye, naye sawaal pe kamzor) aur forgetting dono ka khatra.` },
    { type: 'list', items: [
      '<strong>Data mixing (replay)</strong>: naye data ke saath general instruction data bhi milao.',
      '<strong>Chhota learning rate, kam epochs</strong>: weights ko kam hilao.',
      '<strong>PEFT/LoRA</strong>: original weights frozen rehte hain. "LoRA Learns Less and Forgets Less" (Biderman et al., 2024) ne dikhaya ki LoRA naye domain mein full fine-tuning se thoda kam seekhta hai, lekin purani abilities zyada bachata hai.',
      '<strong>Evals</strong>: fine-tune ke baad sirf naya task nahi, general <strong>benchmarks</strong> (maths, code, general sawaalon ke standard test sets) bhi check karo.',
    ]},
    { type: 'h2', text: 'PEFT: poora model nahi, chhota hissa train karo' },
    { type: 'callout', tone: 'term', title: 'Naya word: PEFT (frozen weights)', html: `<strong>Ye kya hai:</strong> Parameter-Efficient Fine-Tuning. Base model ke saare weights <strong>frozen</strong> rakho (frozen = training mein bilkul nahi badlenge), aur sirf kuch naye, chhote parameters jodo aur unhe train karo.<br><strong>Kyun chahiye:</strong> gradients aur Adam states sirf us chhote hisse ke liye bante hain, to memory bahut kam. Har task ki file MBs mein (GBs nahi). Aur base model safe rehta hai, to forgetting kam.<br><strong>Iske bina:</strong> har customer ke liye 108 GB training memory aur 13.5 GB ki alag model file (upar ka hisaab).<br><strong>Example:</strong> 7B model ke 7 arab weights frozen, sirf ~42 lakh naye numbers train hote hain (LoRA, r = 8, sirf Wq aur Wv pe; agle lesson mein exact hisaab).` },
    { type: 'table', head: ['Method', 'Kya train hota hai', 'Ek line'], rows: [
      ['Adapters (2019)', 'Har layer mein chhoti extra layers', 'Pehla popular PEFT; inference pe thodi extra latency'],
      ['Prompt / prefix tuning (2021)', 'Input ke aage kuch "virtual tokens" ke vectors', 'Bahut kam params, lekin bade models pe hi achha'],
      ['<strong>LoRA</strong> (2021)', 'Weight matrices ke saath do chhoti matrices B·A', 'Sabse popular; merge karke zero extra latency'],
      ['<strong>QLoRA</strong> (2023)', 'LoRA, lekin base model 4-bit mein', 'Ek GPU pe bade models fine-tune'],
    ]},
    { type: 'p', html: `LoRA aur QLoRA ka poora matrix maths agle lesson mein: <a href="#/ai-lora">LoRA aur QLoRA</a>.` },
    { type: 'h2', text: 'xyz Assistant ke liye: prompt, RAG ya fine-tune?' },
    { type: 'p', html: `Ab asli design sawaal. xyz ke paas teen problems hain: (1) Assistant ko xyz ki <em>latest</em> refund policy pata nahi, (2) jawab ka tone xyz brand jaisa chahiye aur hamesha ek fixed JSON format mein, (3) ek chhote, saste model se kaam chalana hai. Har problem ka tool alag hai:` },
    { type: 'table', head: ['Zaroorat', 'Best tool', 'Kyun'], rows: [
      ['Model ko naya ya badalta hua <strong>knowledge</strong> chahiye (policy, docs, order status)', '<a href="#/ai-rag">RAG</a> ya tools', 'Docs badle to bas index update. Fine-tuning facts yaad karwane ka unreliable aur mehnga tareeka hai, aur citation nahi deta.'],
      ['Model ka <strong>behaviour</strong> badalna: tone, format, style, ek narrow task', 'Pehle <a href="#/ai-prompts">prompt</a>, kaafi na ho to fine-tune (LoRA)', 'Behaviour patterns examples se achhe seekhe jaate hain.'],
      ['Bada model mehnga hai, chhote model ko ek task mein expert banana', 'Fine-tune (aksar <strong>distillation</strong>: bade "teacher" model ke jawab likhwao, phir un pe chhote model ka SFT)', 'Har request pe lamba prompt bhejne se sasta.'],
      ['Jaldi prototype, data kam', 'Prompt (few-shot: prompt mein hi 2-3 example jawab)', 'Minutes mein, bina training.'],
      ['Model ko safer, ya users ki pasand jaisa', 'Preference tuning (DPO)', 'Pairs se "behtar kya" seekhna.'],
    ]},
    { type: 'callout', tone: 'tip', title: 'Decide', html: `Hamesha is order mein socho: <strong>Prompt → RAG/tools → Fine-tune → Pre-train</strong>. Har kadam pehle wale se mehnga hai.<br>• Problem <strong>knowledge</strong> ki hai (model ko pata nahi)? RAG ya tools.<br>• Problem <strong>behaviour</strong> ki hai (pata hai, lekin galat format/tone, ya bahut lamba prompt lagta hai)? Pehle prompt, phir LoRA fine-tune. Kam se kam ~kuch sau achhe examples aur ek <strong>eval set</strong> (test sawaalon ka set jisse pata chale model sudhra ya bigda) ke bina fine-tune mat karo.<br>• Dono? RAG + fine-tune dono saath chalte hain.<br>• Pre-training sirf tab jab naya foundation model banana hi business hai.<br>xyz ka faisla: latest policy ke liye RAG, brand tone + JSON format ke liye pehle achha system prompt; agar chhota model phir bhi format todta hai, to LoRA fine-tune.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion: "fine-tune karke model ko apne docs yaad karwa denge"', html: `Fine-tuning ke baad bhi model facts mix kar sakta hai (hallucination), naye docs aate hi purana ho jaata hai, aur "kahan se aaya" nahi bata sakta. Docs ka knowledge RAG se do; fine-tuning se <em>kaise</em> jawab dena hai wo sikhao.` },
    { type: 'h2', text: 'Poori picture: ek LLM ka safar' },
    { type: 'p', html: `Ab saare stages ek saath. Upar se neeche padho: data → training → model. Buttons dabao, har stage ka raasta chamkega.` },
    { type: 'diagram', title: 'Pre-training se xyz Assistant tak: poori picture', height: 600,
      groups: [
        { label: 'Stage 1: Pre-training', x: 10, y: 22, w: 700, h: 96 },
        { label: 'Stage 2: SFT', x: 10, y: 142, w: 700, h: 96 },
        { label: 'Stage 3: preference tuning (RLHF ya DPO)', x: 10, y: 282, w: 530, h: 230 },
        { label: 'Deploy', x: 552, y: 282, w: 158, h: 306 },
      ],
      nodes: [
        { id: 'web', label: 'Internet text', sub: 'trillions tokens', x: 90, y: 76, kind: 'data', info: 'Ye kya hai: websites, books, code, Wikipedia ka bahut bada dher. Labels ki zaroorat nahi: har agla token hi sahi jawab hai (self-supervised).' },
        { id: 'pt', label: 'Pre-training', sub: 'next-token loss', x: 280, y: 76, kind: 'server', info: 'Ye kya hai: hazaaron GPUs pe hafton chalne wala loop: forward, loss = -ln(p), backward, AdamW update. Sabse mehnga stage (7B ke liye 184,320 A100 GPU-hours).' },
        { id: 'base', label: 'Base model', sub: 'text continue', x: 460, y: 76, kind: 'cache', info: 'Ye kya hai: pre-training ka result. Gyaan bahut hai, lekin sawaal ka jawab dene ki jagah text continue karta hai. Isi ko "foundation model" bhi kehte hain.' },
        { id: 'sftd', label: 'SFT data', sub: 'sawaal → jawab', x: 90, y: 196, kind: 'data', info: 'Ye kya hai: hazaaron-laakhon likhe hue (instruction, achha jawab) pairs, chat template mein. Quality quantity se zyada zaroori (LIMA: 1,000 saaf examples).' },
        { id: 'sft', label: 'SFT', sub: 'loss sirf jawab pe', x: 280, y: 196, kind: 'server', info: 'Ye kya hai: supervised fine-tuning. Wahi next-token training, lekin loss sirf assistant ke tokens pe. Model sawaal ka jawab dena aur <end> pe rukna seekhta hai.' },
        { id: 'inst', label: 'SFT model', sub: 'instruction follow', x: 460, y: 196, kind: 'cache', info: 'Ye kya hai: SFT ke baad ka model. Jawab deta hai, lekin "behtar" jawab ki samajh abhi kam. Isi ki copies stage 3 mein policy aur reference banti hain.' },
        { id: 'pref', label: 'Preference pairs', sub: 'chosen > rejected', x: 90, y: 336, w: 150, kind: 'data', info: 'Ye kya hai: ek sawaal, do jawab, aur insaan (ya AI) ka faisla ki kaunsa behtar. RLHF aur DPO dono yahi data use karte hain.' },
        { id: 'rm', label: 'Reward model', sub: 'score deta hai', x: 280, y: 336, kind: 'queue', info: 'Ye kya hai: preference pairs se seekha hua scorer (loss = -ln σ(r_chosen - r_rejected)). Sirf RLHF mein chahiye. Iski kamzoriyan reward hacking ka raasta hain.' },
        { id: 'ppo', label: 'PPO + KL', sub: 'RL loop', x: 460, y: 336, kind: 'server', info: 'Ye kya hai: RLHF ka training loop. Policy jawab likhti hai, reward model score deta hai, PPO chhote kadmon mein update karta hai, KL penalty reference ke paas rakhti hai.' },
        { id: 'ref', label: 'Reference', sub: 'frozen SFT copy', x: 280, y: 466, kind: 'cache', info: 'Ye kya hai: SFT model ki frozen copy. PPO mein KL penalty isi se nikalti hai, aur DPO mein log-ratios isi ke muqable. Policy ko bahut door bhatakne nahi deti.' },
        { id: 'dpo', label: 'DPO loss', sub: 'no reward model', x: 460, y: 466, kind: 'server', info: 'Ye kya hai: RLHF ka shortcut (2023). Preference pairs seedhe ek loss mein: -ln σ(β × margin). Na reward model, na sampling loop. Simple aur stable.' },
        { id: 'chat', label: 'Chat model', sub: 'helpful, safe', x: 630, y: 386, kind: 'cache', info: 'Ye kya hai: teeno stages ke baad ka model. Instructions follow karta hai aur insaanon ki pasand jaisa jawab deta hai. xyz isi tarah ka ready model leta hai.' },
        { id: 'app', label: 'xyz Assistant', sub: 'inference', x: 630, y: 536, kind: 'client', info: 'Ye kya hai: xyz.com ka chatbot. Yahan sirf inference hota hai (weights fixed). Latest policy RAG se aati hai; tone/format ke liye prompt, zaroorat ho to LoRA fine-tune.' },
      ],
      edges: [
        { a: 'web', b: 'pt', n: 1 },
        { a: 'pt', b: 'base', n: 2 },
        { a: 'base', b: 'sft', n: 3 },
        { a: 'sftd', b: 'sft', n: 3 },
        { a: 'sft', b: 'inst', n: 4 },
        { a: 'pref', b: 'rm', n: 5 },
        { a: 'rm', b: 'ppo', n: 6 },
        { a: 'inst', b: 'ppo', n: 5, label: 'policy' },
        { a: 'ref', b: 'ppo', dashed: true, label: 'KL' },
        { a: 'pref', b: 'dpo', n: 5 },
        { a: 'ref', b: 'dpo', dashed: true },
        { a: 'ppo', b: 'chat', n: 7 },
        { a: 'dpo', b: 'chat', n: 7 },
        { a: 'chat', b: 'app', n: 8, kind: 'res', label: 'deploy' },
      ],
      paths: [
        { name: 'Pre-train', text: 'Internet text pe next-token loss, hazaaron GPUs, hafton. Result: base model jo text continue karta hai.', go: ['web>pt>base'] },
        { name: 'SFT', text: 'Base model + likhe hue (sawaal, jawab) examples. Loss sirf jawab pe. Result: instruction follow karne wala model.', go: ['base>sft>inst', 'sftd>sft'] },
        { name: 'RLHF', text: 'Pairs se reward model, phir PPO loop: policy likhe, reward model score de, KL penalty reference ke paas rakhe.', go: ['pref>rm>ppo>chat', 'inst>ppo', 'ref>ppo', 'chat>app'] },
        { name: 'DPO', text: 'Wahi pairs seedhe DPO loss mein, reference ke muqable. Reward model aur RL loop ki chhutti.', go: ['pref>dpo>chat', 'ref>dpo', 'chat>app'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Training = weights ko gradient ki ulti direction mein chhote kadmon (learning rate) mein badalna. Bahut bada kadam = training phat jaati hai.</li>
      <li>Pre-training: internet text pe agla token, loss = -ln(p). Result: base model. Bahut mehnga (7B = 184,320 A100 GPU-hours).</li>
      <li>SFT: (sawaal, jawab) examples, loss sirf jawab ke tokens pe, chat template ke saath. 1,000 saaf examples bhi kaafi ho sakte hain.</li>
      <li>RLHF: preference pairs → reward model → PPO, KL penalty ke saath taaki reward hacking na ho.</li>
      <li>DPO: wahi pairs, ek simple loss, na reward model na RL loop. Shuru mein loss = ln 2 = 0.693.</li>
      <li>Full fine-tune ≈ 16 bytes/param (7B ≈ 108 GB) aur forgetting ka khatra. PEFT/LoRA sirf chhota hissa train karta hai.</li>
      <li>Decide: Prompt → RAG/tools → fine-tune → pre-train. Knowledge ke liye RAG, behaviour ke liye fine-tune.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Pre-training: general knowledge aur language ek baar mein, sab tasks ke liye base', 'SFT: base model instructions follow karna seekhta hai, kam data mein', 'RLHF/DPO: helpful, safe, insaan jaisa pasand wala behaviour', 'Fine-tuning: chhota model ek task mein bade jaisa, chhote prompts, sasta inference'], costs: ['Pre-training: hazaaron GPUs, mahine, crore-arab rupaye', 'Full fine-tune: ~16 bytes/param memory, har task ki poori model copy', 'Catastrophic forgetting aur overfitting ka khatra', 'RLHF: reward hacking, complex pipeline; DPO simple hai lekin achha preference data phir bhi chahiye', 'Fine-tune kiya model naye base model aane pe dobara karna padta hai'] },
    { type: 'think', questions: [
      { q: 'xyz ka refund policy har mahine badalta hai. Ek intern kehta hai "har mahine fine-tune kar dete hain". Kya galat hai?', a: 'Har mahine training ka kharcha aur risk (forgetting, regression), aur phir bhi model purani-nayi policy mix kar sakta hai. Policy ek document hai jo RAG se har request pe fresh mil sakta hai, citation ke saath. Fine-tuning tone/format ke liye rakho.' },
      { q: 'SFT mein user ke sawaal ke tokens pe loss kyun nahi lagate? Agar laga dein to kya hoga?', a: 'Model ko sawaal likhna bhi seekhna padega, jo hamara goal nahi. Training signal ka kuch hissa waste hota hai, aur model user jaisa text generate karne ki aadat pakad sakta hai. Mask karne se saara signal jawab ki quality pe lagta hai.' },
      { q: 'RLHF mein KL penalty hata dein to kya ho sakta hai?', a: 'Policy reward model ki kamzoriyan exploit karegi (reward hacking): jaise bahut lambe ya chaplusi wale jawab, ya ajeeb text jo reward model ko high score dilata hai. Language quality bhi bigad sakti hai. KL penalty policy ko SFT model ke kareeb rakhti hai.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Base model "xyz.com pe refund kaise milta hai?" ke baad aur sawaal likhne lagta hai. Kyun?', options: ['Model kharab hai', 'Usne sirf text continue karna seekha hai, instructions follow karna nahi', 'Temperature zyada hai'], answer: 1, explain: 'Pre-training ka objective sirf agla token hai. Instruction follow karna SFT se aata hai.' },
      { q: 'Sahi token ki probability 0.1 hai. Cross-entropy loss kitna?', options: ['0.1', '2.303', '0.9'], answer: 1, explain: 'loss = -ln(0.1) = 2.303.' },
      { q: 'DPO kis cheez ki zaroorat hata deta hai?', options: ['Preference data', 'Alag reward model aur RL sampling loop', 'Reference model'], answer: 1, explain: 'DPO ko phir bhi preference pairs aur reference model chahiye, lekin reward model aur PPO nahi.' },
      { q: '7B model ko mixed-precision Adam se full fine-tune karne mein sirf weights+gradients+optimizer ke liye lagbhag kitni memory?', options: ['~14 GB', '~28 GB', '~108 GB'], answer: 2, explain: '6.74B × 16 bytes ≈ 107.8 GB, activations alag. 14 GB sirf bf16 inference ke weights hain.' },
      { q: 'Ek weight w = 5, loss = (w - 2)², gradient = 6. Learning rate 1.1 pe ek step ke baad kya hota hai?', options: ['w = 4.4, loss ghat-ta hai', 'w = -1.6, loss 9 se badh ke 12.96', 'w = 2, loss 0'], answer: 1, explain: 'w = 5 - 1.1 × 6 = -1.6, loss = (-3.6)² = 12.96. Kadam itna bada ki sahi jagah (2) ke paar aur door chale gaye. Learning rate bahut bada = training diverge.' },
      { q: 'xyz Assistant ko kal launch hue naye plan ki details chahiye. Best?', options: ['Pre-training', 'Full fine-tune', 'RAG / tool se docs laana'], answer: 2, explain: 'Badalta hua knowledge = RAG ya tools. Fine-tuning behaviour ke liye.' },
    ]},
    { type: 'sources', items: [
      { title: 'Training language models to follow instructions with human feedback (InstructGPT)', publisher: 'OpenAI, arXiv 2203.02155', year: 2022, url: 'https://arxiv.org/abs/2203.02155', used: 'SFT → reward model → PPO pipeline, KL penalty idea, 1.3B InstructGPT preferred over 175B GPT-3.' },
      { title: 'Direct Preference Optimization: Your Language Model is Secretly a Reward Model', publisher: 'Rafailov et al., arXiv 2305.18290', year: 2023, url: 'https://arxiv.org/abs/2305.18290', used: 'DPO removes reward model fitting and RL sampling; loss on preference pairs with a reference model and β.' },
      { title: 'LIMA: Less Is More for Alignment', publisher: 'Zhou et al. (Meta), arXiv 2305.11206', year: 2023, url: 'https://arxiv.org/abs/2305.11206', used: '65B LLaMa fine-tuned with plain SFT on only 1,000 curated examples, no RLHF; quality over quantity for SFT data.' },
      { title: 'Llama 2: Open Foundation and Fine-Tuned Chat Models', publisher: 'Meta, arXiv 2307.09288', year: 2023, url: 'https://arxiv.org/abs/2307.09288', used: '2T pre-training tokens, 184,320 A100 GPU-hours for 7B, 3.3M GPU-hours total.' },
      { title: 'Scaling Laws for Neural Language Models', publisher: 'Kaplan et al. (OpenAI), arXiv 2001.08361', year: 2020, url: 'https://arxiv.org/abs/2001.08361', used: 'Training compute ≈ 6·N·D approximation.' },
      { title: 'ZeRO: Memory Optimizations Toward Training Trillion Parameter Models', publisher: 'Rajbhandari et al. (Microsoft), arXiv 1910.02054', year: 2019, url: 'https://arxiv.org/abs/1910.02054', used: '16 bytes per parameter for mixed-precision Adam (2+2+4+4+4).' },
      { title: 'LoRA Learns Less and Forgets Less', publisher: 'Biderman et al., arXiv 2405.09673 (TMLR)', year: 2024, url: 'https://arxiv.org/abs/2405.09673', used: 'LoRA learns less on target domain but forgets less than full fine-tuning.' },
      { title: 'Constitutional AI: Harmlessness from AI Feedback', publisher: 'Anthropic, arXiv 2212.08073', year: 2022, url: 'https://arxiv.org/abs/2212.08073', used: 'RLAIF: AI feedback guided by written principles.' },
      { title: 'DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning', publisher: 'DeepSeek-AI, arXiv 2501.12948', year: 2025, url: 'https://arxiv.org/abs/2501.12948', used: 'RL with rule-based (verifiable) rewards and GRPO for reasoning models.' },
    ]},
  ],
});
