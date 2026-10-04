/*
  ai-training-finetuning (English twin). Same numbers as the Hinglish file (scratchpad/a3/train_math.js and scratchpad/v2tf/math.js).
*/
Lesson.register({
  id: 'ai-training-finetuning',
  title: 'Pre-training, fine-tuning, RLHF',
  minutes: 32,
  summary: `An LLM is built in three stages. First it reads internet text and learns to guess the "next token" (pre-training). Then it learns to follow instructions (SFT). Then it learns to behave the way people prefer (RLHF or DPO). In this lesson we look at the data, loss, cost and failures of each stage. Then we decide what xyz Assistant needs: a prompt, RAG or fine-tuning.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `A new LLM knows nothing at first. Inside it there are just billions of random numbers.<br>Training means slowly fixing these numbers until the model starts giving good answers.<br>This happens in three steps: (1) read internet text and learn to guess the next word, (2) learn to answer questions, (3) learn to answer the way people like.<br>In this lesson you will run each step yourself with small numbers. At the end you will decide if xyz.com should train its own model or not.` },
    { type: 'h2', text: 'Problem: a base model is not an "assistant"' },
    { type: 'p', html: `xyz.com is building its <strong>xyz Assistant</strong>. The team downloaded an open model from the internet and asked it: <code>How do I get a refund on xyz.com?</code>. The reply was:` },
    { type: 'ascii', text: `How do I get a refund on xyz.com?
How do I change my password on xyz.com?
How do I delete my account on xyz.com?
xyz.com ...`, caption: 'The base model did not answer. It just "continued" with more questions.' },
    { type: 'p', html: `The model is not broken. It is doing exactly what it learned: <strong>predict the next token</strong> (remember the <a href="#/ai-what-is-llm">What is an LLM</a> lesson). On FAQ pages on the internet, one question is often followed by another question, so the model continued that pattern. This is called a <strong>base model</strong>. To build an assistant we need more training. Today's question: how does that training work, how expensive is it, and should xyz do it itself or not?` },
    { type: 'callout', tone: 'term', title: 'New word: weights (parameters)', html: `<strong>What it is:</strong> the numbers inside the model. Like <code>0.12</code>, <code>-0.83</code>, <code>1.05</code>. They are kept in big tables (matrices). A 7B model has about 7 billion such numbers.<br><strong>Why we need it:</strong> everything the model "knows" (grammar, facts, code) is hidden in these numbers. Input numbers are multiplied by them to make the output.<br><strong>Without it:</strong> the model is just an empty formula. Wrong weights mean nonsense output.` },
    { type: 'callout', tone: 'term', title: 'New word: training vs inference', html: `<strong>What it is:</strong> <strong>Training</strong> means changing the weights a little at a time, so that mistakes go down. <strong>Inference</strong> means using the trained model: the weights are fixed, we just get answers (when you chat with a model, that is inference).<br><strong>Why we need it:</strong> training happens once (very expensive). Inference happens on every user request (cheap, but millions of times).<br><strong>Without it:</strong> if you mix the two up, your cost estimates will be wrong. "Using a model" and "building a model" are completely different jobs.` },
    { type: 'callout', tone: 'term', title: 'New word: base model', html: `<strong>What it is:</strong> a model that has only done pre-training (stage 1 below). It is also called a <strong>foundation model</strong>. It knows how to <em>continue</em> text, not how to <em>answer</em> a question.<br><strong>Why we need it:</strong> all the general knowledge (language, facts, code) comes in here. The other stages are built on top of it.<br><strong>Without it:</strong> every company would have to teach everything from zero. The refund example above shows that a base model alone is also not enough.` },
    { type: 'ascii', text: `Stage 1: PRE-TRAINING        Stage 2: SFT                 Stage 3: PREFERENCE TUNING
(internet text, trillions    (instruction -> answer       (two answers, which is better?
 of tokens)                   pairs, thousands-millions)   RLHF with PPO, or DPO)
        |                            |                            |
        v                            v                            v
   Base model  ------------->  Instruct model  ----------->  Chat model (helpful, safe)
  "continues text"             "follows instructions"       "answers the way people like"`, caption: 'The standard recipe for modern chat models. The InstructGPT paper (OpenAI, 2022) made it popular. Do not worry: we will explain SFT, RLHF, PPO and DPO one by one below.' },
    { type: 'h2', text: 'Stage 1: Pre-training (the next token, trillions of times)' },
    { type: 'p', html: `In pre-training the model is given a huge amount of internet text: websites, books, code, Wikipedia. No labels are needed, because the text itself is the answer. From the sentence <code>xyz.com has a new video</code> training examples are made automatically:` },
    { type: 'table', head: ['What the model sees (input)', 'Correct next token (target)'], rows: [
      ['xyz.com', 'has'], ['xyz.com has', 'a'], ['xyz.com has a', 'new'], ['xyz.com has a new', 'video'],
    ], caption: 'Many examples from one sentence. Real tokens are smaller than words (see the Tokenization lesson); here we use words to keep it simple.' },
    { type: 'callout', tone: 'term', title: 'New word: self-supervised learning', html: `<strong>What it is:</strong> training where the "correct answer" (label) comes from the data <em>itself</em>. Here the next word is the correct answer.<br><strong>Why we need it:</strong> we want to train on trillions of tokens. No human can label that many examples.<br><strong>Without it:</strong> someone would have to sit and write the "correct answer" for every example. Such a big dataset could never be made.` },
    { type: 'h3', text: 'How we measure the model\'s mistake: cross-entropy loss' },
    { type: 'p', html: `At each position the model gives every possible token a <strong>probability</strong>: a number between 0 and 1, and they all add up to 1 (softmax, which we saw in the <a href="#/ai-what-is-llm">What is an LLM</a> lesson). For example <code>video: 0.6, photo: 0.3, song: 0.1</code>.<br>If the model gave the correct token "video" <code>p = 0.9</code>, that is good. If it gave <code>p = 0.01</code>, that is bad. Now we need to measure the mistake with one number.` },
    { type: 'callout', tone: 'term', title: 'New word: loss (cross-entropy)', html: `<strong>What it is:</strong> one number for the model's mistake. Lower is better. In next-token training it is <strong>loss = -ln(p)</strong>, where p = the probability of the correct token. This is called <strong>cross-entropy loss</strong>.<br><strong>Do not fear ln:</strong> ln (natural log) is just a button on a calculator. Remember three things: if p = 1, the loss is 0 (perfect). If p goes down, the loss goes up. If p is very small, the loss is very big.<br><strong>Why we need it:</strong> training needs a single number that it can push down. "Good/bad" is not enough.<br><strong>Without it:</strong> the model would not know how wrong it was, or which way to improve.<br><strong>Example:</strong> p = 0.9 → loss 0.105. p = 0.1 → loss 2.303.` },
    { type: 'p', html: `The whole goal of training: <strong>lower the average loss</strong> over a huge number of examples. Move the slider to see how p and the loss are related:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<label>What probability did the model give the correct token ("video")? <strong class="tf-pv">0.50</strong></label>
        <input class="tf-p" type="range" min="1" max="99" step="1" value="50" style="width:100%">
        <div class="stats"><div class="stat"><span>Loss = -ln(p)</span><strong class="tf-l"></strong></div>
        <div class="stat"><span>Meaning</span><strong class="tf-m" style="font-size:16px"></strong></div></div>
        <div class="tf-bar" style="height:12px;border-radius:6px;background:var(--surface-2);margin-top:12px;overflow:hidden"><div class="tf-fill" style="height:100%;background:var(--red)"></div></div>
        <div class="calc-note">Table: p = 0.9 → 0.105, p = 0.5 → 0.693, p = 0.25 → 1.386, p = 0.1 → 2.303, p = 0.01 → 4.605. Notice: when p halves, the loss grows only a little, but when p gets very small, the loss shoots up. A confident mistake costs the most.</div>`;
      const s = el.querySelector('.tf-p');
      const upd = () => {
        const p = Number(s.value) / 100, L = -Math.log(p);
        el.querySelector('.tf-pv').textContent = p.toFixed(2);
        el.querySelector('.tf-l').textContent = L.toFixed(3);
        el.querySelector('.tf-m').textContent = p >= 0.7 ? 'Good guess, small mistake' : p >= 0.3 ? 'The model is confused' : 'Big mistake, big correction';
        el.querySelector('.tf-fill').style.width = Math.min(100, L / 4.605 * 100).toFixed(1) + '%';
      };
      s.addEventListener('input', upd); upd();
    }},
    { type: 'h3', text: 'How the loss goes down: a toy with one weight' },
    { type: 'p', html: `A real model has billions of weights. To understand, take just <strong>one weight</strong>: <code>w</code>. Say the best value is <code>w = 2</code>, but the model does not know that. The model's loss is <code>loss = (w - 2)²</code>. Right now <code>w = 5</code>, so the loss = 3² = <strong>9</strong>.<br>The model can only find out one thing: "if I increase w a little, will the loss go up or down?". That is the gradient.` },
    { type: 'callout', tone: 'term', title: 'New word: gradient', html: `<strong>What it is:</strong> one number for each weight that tells you: if you increase this weight a little, how much will the loss change, and in which direction. A positive gradient means increasing the weight increases the loss, so <em>decrease</em> the weight.<br><strong>Why we need it:</strong> there are billions of weights. We cannot change each one by guessing. The gradient gives every weight its own direction.<br><strong>Without it:</strong> we would be shooting in the dark: random changes, and the loss would never go down.<br><strong>Example:</strong> the gradient of loss = (w - 2)² is 2 × (w - 2). At w = 5 the gradient = 2 × 3 = <strong>6</strong>. It is positive, so w must go down.` },
    { type: 'callout', tone: 'term', title: 'New word: learning rate', html: `<strong>What it is:</strong> a small number that says how big a step to take in each update. The update rule: <code>w = w - learning_rate × gradient</code>.<br><strong>Why we need it:</strong> the gradient only gives the direction and the slope. We choose how far to move.<br><strong>Without it (or if it is wrong):</strong> too big, and the model jumps past the right spot and the loss blows up. Too small, and training takes weeks.<br><strong>Example:</strong> learning rate 0.1, w = 5, gradient 6: new w = 5 - 0.1 × 6 = <strong>4.4</strong>. The loss drops from 9 to 5.76.` },
    { type: 'p', html: `Now run it yourself. Pick a learning rate and press "One step". See how at 0.1 w slowly moves toward 2, at 0.5 it reaches 2 in one step, at 1.0 it keeps swinging between 5 and -1, and at 1.1 the loss grows every step (training blew up).` },
    { type: 'custom', render(el) {
      el.innerHTML = `<label>Learning rate: <strong class="tf-lrv">0.10</strong></label>
        <input class="tf-lr" type="range" min="0.05" max="1.2" step="0.05" value="0.1" style="width:100%">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0"><button type="button" class="btn small primary tf-st">One step</button><button type="button" class="btn small ghost tf-rs">Reset (w = 5)</button></div>
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
        el.querySelector('.tf-gn').textContent = lr < 0.5 ? 'Small learning rate: the loss drops a little every step. Safe, but slow.' : lr === 0.5 ? 'The perfect step for this toy: w = 2 in one step, loss 0. In a real model nobody knows such a perfect number in advance.' : lr < 1 ? 'Big step: w swings back and forth across 2, but still slowly gets closer.' : lr === 1 ? 'Exactly 1.0: w will swing between 5 and -1 forever. The loss never goes down.' : 'Far too big a step: every step lands further away than the last. The loss is blowing up (red numbers). This is called training "diverging".';
      };
      const reset = () => { w = 5; hist = [[w, (w - 2) ** 2]]; show(); };
      el.querySelector('.tf-st').addEventListener('click', () => { if (hist.length > 12) return; w = w - Math.round(Number(s.value) * 100) / 100 * 2 * (w - 2); hist.push([w, (w - 2) ** 2]); show(); });
      el.querySelector('.tf-rs').addEventListener('click', reset);
      s.addEventListener('input', reset);
      reset();
    }},
    { type: 'p', html: `Real training does exactly this, but with billions of weights instead of one, and a whole Transformer instead of a simple formula. The method that finds the gradients is called <strong>backpropagation</strong>: start from the loss and go backwards layer by layer, finding the gradient of every weight (the chain rule). Libraries like PyTorch do this for you automatically.` },
    { type: 'h3', text: 'One training step from the inside' },
    { type: 'steps', items: [
      { t: 'Forward pass', d: 'A <strong>batch</strong> of text (for example 100 sentences together) goes into the model. At each position we get the probabilities of the next token. All positions of a sequence are checked at the same time (in parallel), which is why Transformer training is fast.' },
      { t: 'Loss', d: 'Take -ln(p of the correct token) at each position and average them.' },
      { t: 'Backward pass (backpropagation)', d: 'Find a <strong>gradient</strong> for every weight: "if I increase this weight a little, how much will the loss go up or down". The gradient gives a direction.' },
      { t: 'Optimizer update', d: 'Move every weight a small step in the opposite direction of its gradient: <code>w = w - learning_rate × gradient</code>, exactly like the toy above. In practice the AdamW optimizer is used (card below), which remembers two extra numbers for every weight. This detail matters for the memory calculation.' },
      { t: 'Repeat', d: 'Billions of tokens, millions of steps. The loss slowly falls, and the model learns the patterns of grammar, facts, code and reasoning.' },
    ]},
    { type: 'callout', tone: 'term', title: 'New word: optimizer (Adam / AdamW)', html: `<strong>What it is:</strong> the rule that looks at the gradient and changes the weights. The simplest rule is the one above (<code>w - lr × gradient</code>, called SGD). LLMs use <strong>Adam</strong> or its close relative <strong>AdamW</strong>.<br><strong>What Adam does extra:</strong> it keeps two running averages for every weight. (1) <strong>Momentum</strong> = the average of recent gradients. If the gradients were +4, -2, +4, the average = +2: the direction becomes calm and steady. (2) <strong>Variance</strong> = the average of gradient². If a weight always gets big gradients, Adam makes its step smaller. Every weight gets its own step size.<br><strong>Why we need it:</strong> billions of weights, each with a different "slope". One fixed step size does not suit them all. Adam makes training faster and more stable.<br><strong>Without it:</strong> training is noisy and slow, and picking a learning rate is very hard. The price: 2 extra numbers per weight = more memory (table below).` },
    { type: 'callout', tone: 'term', title: 'New word: batch, step and epoch', html: `<strong>What it is:</strong> a <strong>batch</strong> = the examples put into the model together. A <strong>step</strong> = one forward, loss, backward and update on one batch. An <strong>epoch</strong> = one full pass over all the training data.<br><strong>Example:</strong> 10,000 examples, batch size 100 → one epoch = 100 steps. 3 epochs = 300 steps.<br><strong>Why we need it:</strong> all the data does not fit in the GPU at once, and updating after every single example is very noisy. A batch is the middle path.<br><strong>Without it:</strong> either memory runs out, or training is very slow and shaky. And if you do not count epochs, you may train too many times on small data and make the model memorize it (overfit).` },
    { type: 'h3', text: 'How expensive is pre-training?' },
    { type: 'callout', tone: 'term', title: 'New word: GPU, GPU-hour and FLOPs', html: `<strong>What it is:</strong> a <strong>GPU</strong> is a chip that does thousands of small calculations at the same time (it was first made for game graphics). Training is just a huge number of multiply-adds, so it runs on GPUs. The NVIDIA <strong>A100</strong> is a popular data-center GPU. A <strong>GPU-hour</strong> = one GPU working for one hour. A <strong>FLOP</strong> = one floating-point calculation (like one multiply or one add).<br><strong>Why we need it:</strong> the cost of training is measured in these units. In the cloud, GPUs are rented by the hour.<br><strong>Without it:</strong> "training a model is expensive" would only be a feeling. These units turn it into numbers.<br><strong>Example:</strong> 100 GPUs for 10 hours = 1,000 GPU-hours.` },
    { type: 'p', html: `In Meta's Llama 2 paper (2023) the 7B model was trained on 2 trillion tokens, and the 7B model alone took <strong>184,320 A100 GPU-hours</strong>. Even with 1,000 GPUs running together, that is ~7.7 days. On one GPU? ~21 years. All Llama 2 sizes together took ~3.3 million GPU-hours. A rough rule of thumb (Kaplan et al., 2020): training compute ≈ <code>6 × N × D</code> FLOPs, where N = parameters and D = training tokens. 7B × 2T → 6 × 7×10⁹ × 2×10¹² = <strong>8.4 × 10²² FLOPs</strong>.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion: "we will train our own GPT"', html: `When startups say "our own model", they usually mean <strong>fine-tuning</strong>, not pre-training. Building a new base model with pre-training costs many millions of dollars (data, GPUs, engineers). A company like xyz.com takes an existing base or chat model and does the later stages on top (or only a prompt/RAG).` },
    { type: 'h2', text: 'Stage 2: SFT (instruction tuning)' },
    { type: 'p', html: `To teach the base model to behave like an "assistant", we show it written examples: an <em>instruction</em> and a <em>good answer</em> to it. People write these examples (or, these days, often another strong model). The training is the same next-token prediction; only the data has changed. This is called <strong>SFT (Supervised Fine-Tuning)</strong> or <strong>instruction tuning</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: fine-tuning and SFT', html: `<strong>What it is:</strong> <strong>Fine-tuning</strong> = continuing the training of an already trained model on small, special data. <strong>SFT</strong> = fine-tuning where every example has the "correct answer" written in it (supervised = like a teacher giving an answer key).<br><strong>Why we need it:</strong> the base model knows a lot but does not know how to talk. A few thousand good examples teach it the "assistant" style.<br><strong>Without it:</strong> the refund example above: more questions instead of an answer.<br><strong>Example:</strong> pre-training = trillions of tokens. SFT = thousands to millions of examples. Less data, but it must be very clean.` },
    { type: 'callout', tone: 'term', title: 'New word: chat template', html: `<strong>What it is:</strong> a fixed format of special tokens that marks who is speaking, like <code>&lt;user&gt;</code> ... <code>&lt;assistant&gt;</code> ... <code>&lt;end&gt;</code>. Every model family has its own template.<br><strong>Why we need it:</strong> so the model knows where the question ends, where to start the answer, and when to stop.<br><strong>Without it:</strong> the model starts writing the user's lines too, or never stops. And if you use the wrong template (one in training, another in inference), the fine-tuned model gives strange answers.` },
    { type: 'p', html: `<strong>Quality beats quantity:</strong> in the LIMA paper (Meta, 2023) a 65B base model was given SFT on only <strong>1,000</strong> carefully chosen examples, and its answers were quite good. The lesson: SFT teaches style and format. The knowledge already came from pre-training. 1,000 clean examples are better than 100,000 messy ones.` },
    { type: 'p', html: `One important trick: <strong>the loss is only on the answer tokens</strong>. The model sees the user's question as context, but mistakes on it are not counted, because we are teaching the model to answer, not to write questions. Toggle below to see:` },
    { type: 'custom', render(el) {
      const toks = [['<user>', 'p'], ['How', 'p'], ['do', 'p'], ['I', 'p'], ['get', 'p'], ['refund', 'p'], ['?', 'p'], ['<assistant>', 'p'], ['Open', 'a'], ['Orders', 'a'], [',', 'a'], ['then', 'a'], ['press', 'a'], ['"Refund"', 'a'], ['.', 'a'], ['<end>', 'a']];
      el.innerHTML = `<div class="chips" style="padding:0 0 10px"><button type="button" class="chip on" data-m="pre">Pre-training style (loss on everything)</button><button type="button" class="chip" data-m="sft">SFT (loss only on the answer)</button></div>
        <div class="tf-toks" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <div class="stats"><div class="stat"><span>Tokens that get a loss</span><strong class="tf-n"></strong></div><div class="stat"><span>What the model learns</span><strong class="tf-w" style="font-size:15px"></strong></div></div>
        <div class="calc-note"><code>&lt;user&gt;</code>, <code>&lt;assistant&gt;</code>, <code>&lt;end&gt;</code> are special tokens. Every model has its own <strong>chat template</strong> that marks who is speaking. The loss on <code>&lt;end&gt;</code> is important, or the model will never learn to stop.</div>`;
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
        el.querySelector('.tf-w').textContent = m === 'pre' ? 'To write both the question and the answer' : 'To read the question and only give the answer';
      };
      el.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => draw(c.dataset.m)));
      draw('pre');
    }},
    { type: 'p', html: `After SFT the model answers questions. But there is a problem: SFT shows only one "correct" answer. In the real world a question has many fine answers, and some are <em>better</em> than others (clearer, safer, shorter). "Better" is hard to teach by writing it down, but it is easy for people to look at two answers and say "this one is better". That is the idea behind stage 3.` },
    { type: 'h2', text: 'Stage 3: RLHF (learning from what people prefer)' },
    { type: 'p', html: `In one line: RLHF = let the model write answers, score them by what people prefer, and push the model toward the high-scoring answers. First, its four new words one by one:` },
    { type: 'callout', tone: 'term', title: 'New word: reinforcement learning (RL) and policy', html: `<strong>What it is:</strong> <strong>RL</strong> = a way of learning where the model does something, gets a score (a <strong>reward</strong>), and learns to do high-scoring things more often. Like learning the high-score moves while playing a game. <strong>Policy</strong> = in RL language, "the model being trained". <strong>RLHF</strong> = RL from Human Feedback: the reward comes from what people prefer.<br><strong>Why we need it:</strong> SFT only teaches the model to copy one written answer. RL improves the model by scoring its <em>own</em> answers.<br><strong>Without it:</strong> the model keeps giving correct but dry, very long or sometimes unsafe answers. It does not understand "better".` },
    { type: 'callout', tone: 'term', title: 'New word: reward model (and sigmoid σ)', html: `<strong>What it is:</strong> a separate model that reads (question, answer) and gives one number: "how much will people like this". It is a cheap copy of human preference.<br><strong>Why we need it:</strong> the RL loop has to score millions of answers. We cannot call a human every time.<br><strong>Without it:</strong> every answer needs a human: very slow and expensive.<br><strong>How it learns:</strong> loss = -ln σ(r_chosen - r_rejected). Here <strong>σ (sigmoid)</strong> is a function that squeezes any number to between 0 and 1: σ(0) = 0.5, σ(2) = 0.881, σ(-2) = 0.119. If the preferred answer scores 2 more, then σ = 0.881 and the loss is small. If it is the other way round, the loss is big.` },
    { type: 'callout', tone: 'term', title: 'New word: PPO', html: `<strong>What it is:</strong> Proximal Policy Optimization. An RL algorithm that updates the policy toward the reward in <em>small, controlled</em> steps ("proximal" = nearby). If the policy starts to change too much in one step, it cuts (clips) the update.<br><strong>Why we need it:</strong> RL updates are very shaky. One big wrong step can ruin the whole model's language.<br><strong>Without it:</strong> unstable training: sometimes good, then suddenly nonsense.` },
    { type: 'callout', tone: 'term', title: 'New word: KL penalty and reference model', html: `<strong>What it is:</strong> the <strong>reference model</strong> = a frozen copy of the SFT model (it never changes). <strong>KL divergence</strong> = a number that says how different the probabilities of two models are (0 = exactly the same). The <strong>KL penalty</strong> = subtract this distance from the reward: <code>final reward = score - β × KL</code>.<br><strong>Why we need it:</strong> to keep the policy close to the reference, so it does not exploit the weak spots of the reward model.<br><strong>Without it:</strong> "reward hacking": the policy starts writing strange, long, flattering answers that score high but annoy people. The failure scenario in the diagram below shows exactly this.` },
    { type: 'steps', items: [
      { t: 'Comparison data', d: 'The SFT model writes 2 or more answers to one question. Human labelers rank them from best to worst.' },
      { t: 'Train the reward model', d: 'The reward model is taught to give the preferred answer a higher score: loss = -ln σ(r_chosen - r_rejected) (see the card above).' },
      { t: 'RL loop (PPO)', d: 'The policy writes answers to new questions, the reward model scores them, and PPO updates the policy toward higher scores.' },
      { t: 'KL penalty', d: 'A penalty is subtracted from the reward if the policy\'s output moves too far from the original SFT model (the reference). This stops the policy from "cheating" the reward model.' },
    ]},
    { type: 'p', html: `The famous result from OpenAI's InstructGPT paper (2022): after RLHF, answers from a model with only <strong>1.3B</strong> parameters were preferred over answers from the 100 times bigger <strong>175B</strong> GPT-3. Aligning the model the right way matters more than size. Run the whole loop in the diagram below, and the failure scenarios too:` },
    { type: 'flow', height: 310, title: 'The RLHF loop (and the DPO shortcut)',
      nodes: [
        { id: 'pr', label: 'Prompts', sub: 'user questions', x: 90, y: 70, w: 140, kind: 'client', info: 'What it is: a set of questions for training, like the ones real users ask. In InstructGPT these were prompts from API users and prompts written by labelers.' },
        { id: 'pol', label: 'Policy model', sub: 'starts as SFT', x: 330, y: 70, w: 150, kind: 'server', info: 'What it is: the policy, meaning the model being trained. It starts as a copy of the SFT model. Its weights are the ones that will change.' },
        { id: 'hum', label: 'Human rankers', sub: 'A > B', x: 600, y: 70, w: 150, kind: 'client', info: 'What it is: labelers (people) who read two answers and say which one is better. Ranking is easier than writing, so a lot of data comes in quickly.' },
        { id: 'rm', label: 'Reward model', sub: 'gives a score', x: 600, y: 240, w: 150, kind: 'cache', info: 'What it is: a separate model trained on the rankings. Input: question + answer. Output: one number (the reward). It is a cheap copy of human preference, so it can also be wrong.' },
        { id: 'ppo', label: 'PPO update', sub: 'reward - KL', x: 330, y: 240, w: 150, kind: 'queue', info: 'What it is: the RL algorithm that does the update. It changes the policy\'s weights a little in the direction that raises the reward, but in small steps (clipped) and with the KL penalty.' },
        { id: 'ref', label: 'Reference', sub: 'frozen SFT copy', x: 90, y: 240, w: 140, kind: 'data', info: 'What it is: a frozen copy of the SFT model (its weights never change). The KL penalty comes from comparing with it: the further the policy moves from the reference, the bigger the penalty. DPO needs it too.' },
      ],
      edges: [{ a: 'pr', b: 'pol' }, { a: 'pol', b: 'hum' }, { a: 'hum', b: 'rm' }, { a: 'pol', b: 'rm' }, { a: 'rm', b: 'ppo' }, { a: 'ppo', b: 'pol' }, { a: 'ref', b: 'ppo' }, { id: 'hp', a: 'hum', b: 'ppo', hidden: true, dashed: true }],
      scenarios: [
        { name: 'RLHF happy path', steps: [
          { title: 'The policy writes two answers', text: 'Question: "My video upload keeps failing". The policy (SFT model) writes two answers, A and B.', go: 'pr>pol', msg: 'A: "Make the file smaller than 2 GB, then retry."   B: "Some error happened."' },
          { title: 'People rank them', text: 'The labeler says A is better (specific, helpful).', go: 'pol>hum', after: { hum: { sub: 'A > B' } } },
          { title: 'The reward model learns', text: 'From thousands of such comparisons the reward model is trained: A should score higher than B.', go: 'hum>rm', after: { rm: { state: 'ok', sub: 'trained' } }, msg: 'loss = -ln σ(r_A - r_B)' },
          { title: 'RL loop: get a score', text: 'Now the policy answers a new question, and the reward model scores it.', go: ['pr>pol', 'pol>rm'], msg: 'reward = 1.8' },
          { title: 'KL check', text: 'The reference model shows how far the policy has moved from the original. Final reward = score - β × KL.', go: ['rm>ppo', 'ref>ppo'], parallel: true },
          { title: 'Policy update', text: 'PPO changes the policy\'s weights a little. This loop runs thousands of times.', go: 'ppo>pol', after: { pol: { state: 'ok', sub: 'aligned' } } },
        ]},
        { name: 'Failure: reward hacking', intro: 'The reward model is only an approximation of what people prefer. The policy finds its weak spots.', steps: [
          { title: 'Bias in the reward model', text: 'In the training data, long answers were often preferred, so the reward model learned "long = good".', set: { rm: { state: 'warn', sub: 'long = good?' } }, focus: ['rm'] },
          { title: 'The policy cheats', text: 'The KL penalty was set too low. The policy makes every answer long, repetitive and flattering. The score goes up, the quality goes down.', go: ['pol>rm', 'rm>ppo', 'ppo>pol'], after: { pol: { state: 'hot', sub: 'long, useless' } }, msg: 'reward 1.8 → 4.6, but users are unhappy' },
          { title: 'Fix', text: 'Raise the KL penalty (stay near the reference), retrain the reward model on new data, and have people check regularly (evals).', go: 'ref>ppo', after: { pol: { state: '', sub: 'near reference' }, rm: { state: '', sub: 'retrained' } } },
        ]},
        { name: 'DPO shortcut', intro: 'DPO (2023) removes both the reward model and PPO.', steps: [
          { title: 'No reward model needed', text: 'The same preference pairs (chosen, rejected) go straight into one loss function.', set: { rm: { state: 'dim', sub: 'not needed' }, ppo: { label: 'DPO loss', sub: 'simple formula' } }, show: ['hp'], go: 'hum>ppo', msg: '(prompt, chosen, rejected)' },
          { title: 'Log-probs from policy and reference', text: 'From both models we get how "likely" the chosen and rejected answers are.', go: ['pol>ppo', 'ref>ppo'], parallel: true },
          { title: 'Direct update', text: 'A gradient update just like normal supervised training. No sampling loop, no separate reward model. That is why it is simple and stable.', go: 'ppo>pol', after: { pol: { state: 'ok', sub: 'DPO trained' } } },
        ]},
      ],
    },
    { type: 'h2', text: 'DPO: RLHF without a reward model' },
    { type: 'p', html: `RLHF is powerful but hard: four models in memory at the same time (policy, reference, reward model, and PPO's <strong>value model</strong>, which guesses how much reward will come later), a loop that keeps generating answers (sampling), and many settings that must be chosen well. <strong>DPO (Direct Preference Optimization)</strong>, from the 2023 paper by Rafailov et al., showed that by rearranging the maths the same goal can be reached with a simple, classification-like loss.` },
    { type: 'callout', tone: 'term', title: 'New word: log-prob (log probability)', html: `<strong>What it is:</strong> the ln of the probability of a whole answer. The probability of an answer = the probabilities of its tokens multiplied together. For example two tokens, 0.5 and 0.2: the whole answer = 0.5 × 0.2 = 0.1. Taking ln turns multiplying into adding: ln 0.5 + ln 0.2 = -0.693 + (-1.609) = <strong>-2.303</strong> = ln 0.1.<br><strong>Why we need it:</strong> for a 200-token answer, multiplying 200 small numbers gives a number so tiny that the computer turns it into 0. With logs we only add, and the number stays fine.<br><strong>Without it:</strong> we could not even compare the probabilities of long answers.<br><strong>How to read it:</strong> a log-prob is always 0 or negative. The closer to 0, the more "likely". -12 is more likely than -15.` },
    { type: 'p', html: `The idea: the policy should raise the probability of the chosen answer (compared to the reference) and lower the probability of the rejected one. For each answer, the <strong>log-ratio</strong> = <code>log π(answer) - log π_ref(answer)</code> (π = the policy model, π_ref = the reference). Then:` },
    { type: 'code', text: `margin = β × [ (log-ratio of chosen) - (log-ratio of rejected) ]
loss   = -ln σ(margin)          σ(z) = 1 / (1 + e^(-z))

β (beta) = how far the policy may move from the reference. Small β = more freedom.` },
    { type: 'p', html: `Worked example (β = 0.1). Chosen answer: policy log-prob -12, reference -14, so log-ratio = +2 (the policy likes it more). Rejected: policy -15, reference -14, log-ratio = -1. Margin = 0.1 × (2 - (-1)) = <strong>0.3</strong>. σ(0.3) = 0.574, loss = -ln(0.574) = <strong>0.554</strong>. At the very start of training the policy = the reference, both log-ratios are 0, the margin is 0, and loss = ln 2 = <strong>0.693</strong>. Change the numbers and see for yourself:` },
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
        el.querySelector('.tf-note').textContent = m > 0 ? 'Positive margin: the policy favours the chosen answer over the rejected one (compared to the reference). Loss is below 0.693.' : m < 0 ? 'Negative margin: the policy favours the rejected answer instead. Loss is above 0.693, and the gradient will push hard to fix it.' : 'Margin 0: the policy has not learned anything yet (like the first step of training). Loss = ln 2 = 0.693.';
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'tip', title: 'What else is used today', html: `• <strong>RLAIF / Constitutional AI</strong> (Anthropic, 2022): instead of a person, an AI compares the answers using written principles (a "constitution"). Feedback becomes cheap and available at scale.<br>• <strong>RL with verifiable rewards</strong>: for tasks like maths and code, instead of a reward model we check directly (is the answer right? did the tests pass?). DeepSeek-R1 (2025) learned reasoning with the GRPO algorithm and such rule-based rewards. "Reasoning models" are built with this kind of training.<br>• Many DPO variants have also appeared, but the core idea is the same: learn directly from preference pairs.` },
    { type: 'h2', text: 'The cost of full fine-tuning: memory' },
    { type: 'p', html: `Say xyz wants to <strong>fully fine-tune</strong> a 7B model on its support tickets (update all the weights). For inference, a 7B model in bf16 needs only ~13.5 GB (2 bytes per parameter; the formats are explained in the <a href="#/ai-quantization">Quantization lesson</a>). In training, much more has to be stored next to each parameter. Standard mixed-precision Adam training (the accounting from the ZeRO paper, 2019):` },
    { type: 'callout', tone: 'term', title: 'New word: fp32, bf16 and mixed precision', html: `<strong>What it is:</strong> how many bits are used to store one number in memory. <strong>fp32</strong> = 32 bits = 4 bytes, very precise. <strong>bf16</strong> / fp16 = 16 bits = 2 bytes, half the space, a little less precise. <strong>Mixed precision</strong> = do the heavy maths in 16-bit (fast, less memory), but keep the important things (master weights, Adam's averages) in 32-bit.<br><strong>Why we need it:</strong> 16-bit is many times faster on a GPU. But a very small update (like 1.0 + 0.0001) gets lost in 16-bit, so we keep an fp32 copy.<br><strong>Without it:</strong> all fp32 = slow training, double memory. All 16-bit = small updates vanish and training gets stuck. Full details in the <a href="#/ai-quantization">Quantization lesson</a>.` },
    { type: 'table', head: ['Item', 'Bytes per parameter', 'Why'], rows: [
      ['Weights (bf16/fp16)', '2', 'Forward/backward use these'],
      ['Gradients (bf16/fp16)', '2', 'One gradient per weight'],
      ['Master weights (fp32)', '4', 'Small updates get lost in 16-bit, so we keep an fp32 copy'],
      ['Adam momentum (fp32)', '4', 'Running average of the gradient'],
      ['Adam variance (fp32)', '4', 'Running average of gradient²'],
      ['<strong>Total</strong>', '<strong>16</strong>', 'Activations are extra (they depend on batch size and sequence length)'],
    ]},
    { type: 'table', head: ['Model', 'Inference (bf16, 2 B/param)', 'Full fine-tune (16 B/param)', 'How many 80 GB GPUs (these states only)'], rows: [
      ['Llama 2 7B (6.74B)', '13.5 GB', '107.8 GB', '2'],
      ['13B', '26 GB', '208 GB', '3'],
      ['70B', '140 GB', '1,120 GB', '14'],
    ], caption: 'Without activations. In practice it takes even more. That is why full fine-tuning needs several GPUs, and tricks like ZeRO/FSDP that split these states across GPUs.' },
    { type: 'p', html: `And it is not just memory: every fine-tune saves a whole new model file (7B = 13.5 GB). 10 separate fine-tunes for 10 customers = 135 GB. This pain point is what gave birth to PEFT (below).` },
    { type: 'h2', text: 'Catastrophic forgetting' },
    { type: 'p', html: `xyz fully fine-tuned the model on only its support tickets, for many epochs. The support answers got good. But now if someone asks "2 + 2 × 3?" or "How do I reverse a list in Python?", the model makes mistakes or turns every topic toward refunds. While learning the new thing, it forgot the old. This is called <strong>catastrophic forgetting</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: catastrophic forgetting', html: `<strong>What it is:</strong> while training on a new task, the same weights that old skills needed get changed. The model learned the new thing and suddenly forgot the old one.<br><strong>Why it happens:</strong> in full fine-tuning all the weights are open to change, and the loss is only on the new data. Nothing signals the model to protect its old skills.<br><strong>Without it (if you ignore it):</strong> the support bot is an expert on refunds, but bad at maths, code and normal conversation. Many epochs on a small dataset = risk of both <strong>overfitting</strong> (it memorized the training examples and is weak on new questions) and forgetting.` },
    { type: 'list', items: [
      '<strong>Data mixing (replay)</strong>: mix general instruction data in with the new data.',
      '<strong>Smaller learning rate, fewer epochs</strong>: move the weights less.',
      '<strong>PEFT/LoRA</strong>: the original weights stay frozen. "LoRA Learns Less and Forgets Less" (Biderman et al., 2024) showed that LoRA learns a little less of a new domain than full fine-tuning, but keeps more of the old abilities.',
      '<strong>Evals</strong>: after fine-tuning, check not only the new task but also general <strong>benchmarks</strong> (standard test sets of maths, code and general questions).',
    ]},
    { type: 'h2', text: 'PEFT: train a small part, not the whole model' },
    { type: 'callout', tone: 'term', title: 'New word: PEFT (frozen weights)', html: `<strong>What it is:</strong> Parameter-Efficient Fine-Tuning. Keep all the base model's weights <strong>frozen</strong> (frozen = they do not change at all during training), add a few new, small parameters, and train only those.<br><strong>Why we need it:</strong> gradients and Adam states are made only for that small part, so memory is much lower. Each task's file is in MBs (not GBs). And the base model stays safe, so there is less forgetting.<br><strong>Without it:</strong> 108 GB of training memory and a separate 13.5 GB model file for every customer (the numbers above).<br><strong>Example:</strong> the 7 billion weights of a 7B model are frozen, and only ~4.2 million new numbers are trained (LoRA, r = 8, only on Wq and Wv; exact numbers in the next lesson).` },
    { type: 'table', head: ['Method', 'What gets trained', 'In one line'], rows: [
      ['Adapters (2019)', 'Small extra layers inside each layer', 'The first popular PEFT; a little extra latency at inference'],
      ['Prompt / prefix tuning (2021)', 'Vectors of a few "virtual tokens" placed before the input', 'Very few params, but works well only on big models'],
      ['<strong>LoRA</strong> (2021)', 'Two small matrices B·A next to a weight matrix', 'The most popular; merge it and there is zero extra latency'],
      ['<strong>QLoRA</strong> (2023)', 'LoRA, but the base model is in 4-bit', 'Fine-tune big models on one GPU'],
    ]},
    { type: 'p', html: `The full matrix maths of LoRA and QLoRA is in the next lesson: <a href="#/ai-lora">LoRA and QLoRA</a>.` },
    { type: 'h2', text: 'For xyz Assistant: prompt, RAG or fine-tune?' },
    { type: 'p', html: `Now the real design question. xyz has three problems: (1) the Assistant does not know xyz's <em>latest</em> refund policy, (2) the answers must sound like the xyz brand and always be in one fixed JSON format, (3) it has to work with a small, cheap model. Each problem needs a different tool:` },
    { type: 'table', head: ['Need', 'Best tool', 'Why'], rows: [
      ['The model needs new or changing <strong>knowledge</strong> (policy, docs, order status)', '<a href="#/ai-rag">RAG</a> or tools', 'When the docs change, just update the index. Fine-tuning is an unreliable and expensive way to make a model remember facts, and it gives no citations.'],
      ['Change the model\'s <strong>behaviour</strong>: tone, format, style, one narrow task', 'First a <a href="#/ai-prompts">prompt</a>; if that is not enough, fine-tune (LoRA)', 'Behaviour patterns are learned well from examples.'],
      ['A big model is expensive; make a small model an expert at one task', 'Fine-tune (often <strong>distillation</strong>: have a big "teacher" model write answers, then do SFT of the small model on them)', 'Cheaper than sending a long prompt with every request.'],
      ['Quick prototype, little data', 'Prompt (few-shot: put 2-3 example answers inside the prompt)', 'Done in minutes, no training.'],
      ['Make the model safer, or closer to what users prefer', 'Preference tuning (DPO)', 'Learn "what is better" from pairs.'],
    ]},
    { type: 'callout', tone: 'tip', title: 'Decide', html: `Always think in this order: <strong>Prompt → RAG/tools → Fine-tune → Pre-train</strong>. Each step costs more than the one before.<br>• Is the problem about <strong>knowledge</strong> (the model does not know)? RAG or tools.<br>• Is the problem about <strong>behaviour</strong> (it knows, but the format/tone is wrong, or the prompt has to be very long)? First the prompt, then a LoRA fine-tune. Do not fine-tune without at least a few hundred good examples and an <strong>eval set</strong> (a set of test questions that shows whether the model got better or worse).<br>• Both? RAG and fine-tuning work well together.<br>• Pre-train only when building a new foundation model is the business itself.<br>xyz's decision: RAG for the latest policy, and a good system prompt first for brand tone + JSON format; if the small model still breaks the format, a LoRA fine-tune.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion: "we will fine-tune the model so it memorizes our docs"', html: `Even after fine-tuning the model can mix up facts (hallucination), becomes out of date as soon as new docs arrive, and cannot say "where this came from". Give doc knowledge through RAG; use fine-tuning to teach <em>how</em> to answer.` },
    { type: 'h2', text: 'The whole picture: the journey of an LLM' },
    { type: 'p', html: `Now all the stages together. Read from top to bottom: data → training → model. Press the buttons and each stage's path lights up.` },
    { type: 'diagram', title: 'From pre-training to xyz Assistant: the whole picture', height: 600,
      groups: [
        { label: 'Stage 1: Pre-training', x: 10, y: 22, w: 700, h: 96 },
        { label: 'Stage 2: SFT', x: 10, y: 142, w: 700, h: 96 },
        { label: 'Stage 3: preference tuning (RLHF or DPO)', x: 10, y: 282, w: 530, h: 230 },
        { label: 'Deploy', x: 552, y: 282, w: 158, h: 306 },
      ],
      nodes: [
        { id: 'web', label: 'Internet text', sub: 'trillions tokens', x: 90, y: 76, kind: 'data', info: 'What it is: a huge pile of websites, books, code and Wikipedia. No labels needed: each next token is the correct answer (self-supervised).' },
        { id: 'pt', label: 'Pre-training', sub: 'next-token loss', x: 280, y: 76, kind: 'server', info: 'What it is: a loop running for weeks on thousands of GPUs: forward, loss = -ln(p), backward, AdamW update. The most expensive stage (184,320 A100 GPU-hours for 7B).' },
        { id: 'base', label: 'Base model', sub: 'continues text', x: 460, y: 76, kind: 'cache', info: 'What it is: the result of pre-training. It knows a lot, but continues text instead of answering questions. Also called a "foundation model".' },
        { id: 'sftd', label: 'SFT data', sub: 'question → answer', x: 90, y: 196, kind: 'data', info: 'What it is: thousands to millions of written (instruction, good answer) pairs, in the chat template. Quality matters more than quantity (LIMA: 1,000 clean examples).' },
        { id: 'sft', label: 'SFT', sub: 'loss on answer', x: 280, y: 196, kind: 'server', info: 'What it is: supervised fine-tuning. The same next-token training, but the loss is only on the assistant\'s tokens. The model learns to answer and to stop at <end>.' },
        { id: 'inst', label: 'SFT model', sub: 'follows orders', x: 460, y: 196, kind: 'cache', info: 'What it is: the model after SFT. It answers, but its sense of a "better" answer is still weak. Copies of it become the policy and the reference in stage 3.' },
        { id: 'pref', label: 'Preference pairs', sub: 'chosen > rejected', x: 90, y: 336, w: 150, kind: 'data', info: 'What it is: one question, two answers, and a person\'s (or an AI\'s) decision on which is better. Both RLHF and DPO use this data.' },
        { id: 'rm', label: 'Reward model', sub: 'gives a score', x: 280, y: 336, kind: 'queue', info: 'What it is: a scorer learned from preference pairs (loss = -ln σ(r_chosen - r_rejected)). Needed only in RLHF. Its weak spots open the door to reward hacking.' },
        { id: 'ppo', label: 'PPO + KL', sub: 'RL loop', x: 460, y: 336, kind: 'server', info: 'What it is: the RLHF training loop. The policy writes answers, the reward model scores them, PPO updates in small steps, and the KL penalty keeps it near the reference.' },
        { id: 'ref', label: 'Reference', sub: 'frozen SFT copy', x: 280, y: 466, kind: 'cache', info: 'What it is: a frozen copy of the SFT model. In PPO the KL penalty comes from it, and in DPO the log-ratios are measured against it. It stops the policy from wandering too far.' },
        { id: 'dpo', label: 'DPO loss', sub: 'no reward model', x: 460, y: 466, kind: 'server', info: 'What it is: the RLHF shortcut (2023). Preference pairs go straight into one loss: -ln σ(β × margin). No reward model, no sampling loop. Simple and stable.' },
        { id: 'chat', label: 'Chat model', sub: 'helpful, safe', x: 630, y: 386, kind: 'cache', info: 'What it is: the model after all three stages. It follows instructions and answers the way people prefer. xyz takes a ready model like this.' },
        { id: 'app', label: 'xyz Assistant', sub: 'inference', x: 630, y: 536, kind: 'client', info: 'What it is: xyz.com\'s chatbot. Only inference happens here (weights fixed). The latest policy comes from RAG; tone/format come from the prompt, plus a LoRA fine-tune if needed.' },
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
        { name: 'Pre-train', text: 'Next-token loss on internet text, thousands of GPUs, weeks. Result: a base model that continues text.', go: ['web>pt>base'] },
        { name: 'SFT', text: 'Base model + written (question, answer) examples. Loss only on the answer. Result: a model that follows instructions.', go: ['base>sft>inst', 'sftd>sft'] },
        { name: 'RLHF', text: 'A reward model from the pairs, then the PPO loop: the policy writes, the reward model scores, the KL penalty keeps it near the reference.', go: ['pref>rm>ppo>chat', 'inst>ppo', 'ref>ppo', 'chat>app'] },
        { name: 'DPO', text: 'The same pairs go straight into the DPO loss, measured against the reference. No reward model and no RL loop.', go: ['pref>dpo>chat', 'ref>dpo', 'chat>app'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Training = changing the weights in small steps (the learning rate) in the opposite direction of the gradient. Too big a step and training blows up.</li>
      <li>Pre-training: the next token on internet text, loss = -ln(p). Result: a base model. Very expensive (7B = 184,320 A100 GPU-hours).</li>
      <li>SFT: (question, answer) examples, loss only on the answer tokens, with a chat template. Even 1,000 clean examples can be enough.</li>
      <li>RLHF: preference pairs → reward model → PPO, with a KL penalty so reward hacking does not happen.</li>
      <li>DPO: the same pairs, one simple loss, no reward model and no RL loop. At the start the loss = ln 2 = 0.693.</li>
      <li>Full fine-tune ≈ 16 bytes/param (7B ≈ 108 GB) and a risk of forgetting. PEFT/LoRA trains only a small part.</li>
      <li>Decide: Prompt → RAG/tools → fine-tune → pre-train. RAG for knowledge, fine-tuning for behaviour.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Pre-training: general knowledge and language in one go, a base for all tasks', 'SFT: the base model learns to follow instructions, with little data', 'RLHF/DPO: helpful, safe behaviour that people prefer', 'Fine-tuning: a small model becomes as good as a big one at one task, with short prompts and cheap inference'], costs: ['Pre-training: thousands of GPUs, months, many millions of dollars', 'Full fine-tune: ~16 bytes/param of memory, a full model copy for every task', 'Risk of catastrophic forgetting and overfitting', 'RLHF: reward hacking, a complex pipeline; DPO is simple but still needs good preference data', 'A fine-tuned model has to be redone when a new base model comes out'] },
    { type: 'think', questions: [
      { q: 'xyz\'s refund policy changes every month. An intern says "let us just fine-tune every month". What is wrong with that?', a: 'Every month you pay the training cost and take the risk (forgetting, regression), and the model can still mix up the old and new policy. The policy is a document that RAG can fetch fresh on every request, with a citation. Keep fine-tuning for tone/format.' },
      { q: 'Why is there no loss on the user\'s question tokens in SFT? What happens if we add it?', a: 'The model would also have to learn to write questions, which is not our goal. Part of the training signal is wasted, and the model may pick up the habit of writing user-like text. Masking puts all the signal on the quality of the answer.' },
      { q: 'What could happen if we remove the KL penalty in RLHF?', a: 'The policy will exploit the reward model\'s weak spots (reward hacking): for example very long or flattering answers, or strange text that gets a high score from the reward model. The language quality can also break down. The KL penalty keeps the policy close to the SFT model.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'After "How do I get a refund on xyz.com?" the base model starts writing more questions. Why?', options: ['The model is broken', 'It only learned to continue text, not to follow instructions', 'The temperature is too high'], answer: 1, explain: 'The pre-training objective is only the next token. Following instructions comes from SFT.' },
      { q: 'The probability of the correct token is 0.1. What is the cross-entropy loss?', options: ['0.1', '2.303', '0.9'], answer: 1, explain: 'loss = -ln(0.1) = 2.303.' },
      { q: 'What does DPO remove the need for?', options: ['Preference data', 'A separate reward model and the RL sampling loop', 'The reference model'], answer: 1, explain: 'DPO still needs preference pairs and a reference model, but no reward model and no PPO.' },
      { q: 'For a full fine-tune of a 7B model with mixed-precision Adam, roughly how much memory do just the weights + gradients + optimizer need?', options: ['~14 GB', '~28 GB', '~108 GB'], answer: 2, explain: '6.74B × 16 bytes ≈ 107.8 GB, activations extra. 14 GB is only the bf16 weights for inference.' },
      { q: 'One weight w = 5, loss = (w - 2)², gradient = 6. What happens after one step with learning rate 1.1?', options: ['w = 4.4, the loss goes down', 'w = -1.6, the loss grows from 9 to 12.96', 'w = 2, loss 0'], answer: 1, explain: 'w = 5 - 1.1 × 6 = -1.6, loss = (-3.6)² = 12.96. The step was so big that it jumped past the right spot (2) and ended up further away. Too big a learning rate = training diverges.' },
      { q: 'xyz Assistant needs the details of a new plan launched yesterday. What is best?', options: ['Pre-training', 'Full fine-tune', 'RAG / a tool that fetches the docs'], answer: 2, explain: 'Changing knowledge = RAG or tools. Fine-tuning is for behaviour.' },
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
