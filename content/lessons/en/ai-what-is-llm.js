Lesson.register({
  id: 'ai-what-is-llm',
  title: 'What is an LLM? Next-token prediction',
  minutes: 32,
  summary: `ChatGPT, Claude, Gemini: inside, they all do the same one job. Guess the next token, then the one after that, then the one after that. In this lesson we see how this "guess" is made from numbers (logits, softmax, sampling), why the model runs a loop again and again, and why it sometimes says wrong things with full confidence.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Your phone keyboard suggests "morning" after you type "Good". It does this because it has seen that people often write that.<br>An <strong>LLM</strong> like ChatGPT does the same thing, but at a much bigger scale. It guesses only <strong>the next small piece</strong> of text at a time. Then it adds that piece, and guesses the next one. This is how a full answer is built.<br>In this lesson we will see: how this guess is made from numbers, how the model picks one option out of many, and why it sometimes says something wrong with full confidence.` },

    { type: 'h2', text: 'The problem: the xyz.com support bot keeps failing' },
    { type: 'p', html: `xyz.com is a video platform. Every day, thousands of users write to support: "my video is not uploading", "I forgot my password", "how do I cancel Premium". Right now there is a <strong>rule-based bot</strong>: rules in the code like <code>if message contains "upload"</code>.` },
    { type: 'p', html: `The trouble: people write the same thing in a thousand ways. "Video stuck at 99%", "my clip just won't go up", "upload stuck bro". A new rule for every new phrase? Hindi, Hinglish, typos? The list of rules never ends, and the bot answers half the questions with "Sorry, I did not understand".` },
    { type: 'p', html: `We need something that understands <em>language</em>, not rules. This is where the story of <strong>xyz Assistant</strong> begins: first a chatbot (this lesson), then one that answers from the help docs (RAG), then an agent that can use tools.` },
    { type: 'callout', tone: 'term', title: 'New word: Probability (chance)', html: `<strong>What it is:</strong> the chance that something happens, a number between 0 and 1 (or 0% to 100%). Toss a coin: the probability of heads is 0.5 = 50%.<br><strong>Why we need it:</strong> the model is never fully sure what comes next. So it gives each option a chance: "login" 50%, "app" 23%...<br><strong>Without it:</strong> the model could only give one fixed answer, and could never say how sure it is.` },
    { type: 'callout', tone: 'term', title: 'New word: LLM (Large Language Model)', html: `<strong>What it is:</strong> a program that looks at the text so far and says how likely each possible next piece of text is. It is called <strong>Large</strong> because it holds billions of numbers and learns from an amount of text as big as the internet. Inside ChatGPT is a GPT model, inside Claude is a Claude model: both are LLMs.<br><strong>Why we need it:</strong> people write the same thing in a thousand ways. An LLM has seen so much text that it understands typos, Hinglish and new phrases too, without a single rule written by hand.<br><strong>Without it:</strong> xyz.com would have to write a rule by hand for every phrase, and the list would never end.` },
    { type: 'callout', tone: 'term', title: 'New word: Token', html: `<strong>What it is:</strong> a small piece of text that the model treats as one unit. Sometimes a full word (" video"), sometimes part of a word ("upload" + "ing"), sometimes just "?". In English, 1 token is about 4 characters on average.<br><strong>Why we need it:</strong> the model needs a fixed list of pieces to choose from. Letters are too small (the sequence gets very long). Full words are too many (the list never ends). Tokens are the middle path.<br><strong>Without it:</strong> the model would have no fixed list of options for "what comes next".<br>Full details in the next lesson: <a href="#/ai-tokenization">Tokens and tokenization</a>.` },
    { type: 'callout', tone: 'term', title: 'New word: Vocabulary (vocab)', html: `<strong>What it is:</strong> the fixed list of all tokens a model knows. Like a dictionary where every token has a number (its token ID). Models today have about 30 thousand to about 200 thousand tokens in this list.<br><strong>Why we need it:</strong> the "next token" is always picked from this list. At every step, the model gives a score to <em>every</em> token in the list.<br><strong>Without it:</strong> the model would not know which options it is choosing from.` },

    { type: 'h2', text: 'The one job of an LLM: guess the next token' },
    { type: 'p', html: `It sounds strange, but this is the whole job of an LLM: <strong>give it the text so far, and it tells you the probability of every possible next token</strong>. That is all. A long answer? It is built by repeating this small job again and again.` },
    { type: 'ascii', text: `Input (prompt):  "To upload a video on xyz.com, first open the"

LLM output (for the next token):
   " login"     50.6 %   ██████████████████████████
   " app"       22.8 %   ████████████
   " account"   15.3 %   ████████
   " Wi-Fi"      6.9 %   ████
   " button"     4.2 %   ██
   " cricket"    0.3 %   ▏
   ... (about 100,000 other tokens, all very small)`, caption: 'A real model gives a number for every token. Only 6 are shown here (these numbers are made up to explain the idea).' },
    { type: 'p', html: `Where did the model learn this? During training it saw billions of sentences where, after "to upload, first open the", the word "login" often came next. It did not write any rule. It just "remembered" the patterns inside its numbers. That is why it also understands typos and Hinglish: those were in the training text too.` },
    { type: 'callout', tone: 'mistake', title: 'Common mistake', html: `"There is a database inside the LLM that stores answers." No. There is no table that says "Q: how to upload? A: log in". There are only billions of numbers (weights) that work together to produce probabilities. That is why an LLM sometimes makes up an answer that sounds completely believable but is wrong: it is not "looking up" the answer, it is "building" it.` },

    { type: 'h2', text: 'Parameters and weights: what is inside the model?' },
    { type: 'p', html: `Think of the model as one very big function: <code>f(text) → probabilities</code>. Inside this function there are billions of <strong>knobs</strong>. Each knob is a decimal number like <code>0.0213</code> or <code>-1.47</code>. The input text is turned into numbers, and these numbers get multiplied and added with the knobs until they reach the output.` },
    { type: 'callout', tone: 'term', title: 'New word: Parameters / Weights', html: `<strong>What it is:</strong> one learned number inside the model, like <code>0.0213</code>. A "knob" that can be turned a little. A "7B model" means about 7 billion parameters. <strong>Parameter</strong> and <strong>weight</strong> are two names for almost the same thing.<br><strong>Why we need it:</strong> everything the model "knows" lives in these numbers. Training simply means adjusting these numbers until the next-token guesses become correct.<br><strong>Without it:</strong> the model is an empty formula. It cannot make any sensible guess.` },
    { type: 'p', html: `A sense of size: OpenAI's GPT-3 (2020 paper) had 175 billion parameters. If each parameter is stored in 2 bytes (16-bit), that is <code>175 × 10^9 × 2 = 350 GB</code> just for the weights. In 32-bit it is 700 GB. A model this big does not run on a laptop. It runs on many <strong>GPUs</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: GPU', html: `<strong>What it is:</strong> Graphics Processing Unit. A chip that does thousands of small calculations <em>at the same time</em>. It was first built for game graphics. It has its own fast memory (<strong>VRAM</strong>).<br><strong>Why we need it:</strong> most of an LLM's work is "multiply lots of numbers and add them up". A GPU does this work all at once. The weights stay loaded in the GPU's memory.<br><strong>Without it:</strong> on a normal CPU, a big model would take minutes for one answer.<br><strong>Example:</strong> an NVIDIA H100 GPU has 80 GB of memory. 350 GB of weights needs at least 5 such GPUs. Making a model smaller by using fewer bits is in the <a href="#/ai-quantization">quantization</a> lesson.` },
    { type: 'image', src: 'assets/img/ai-what-is-llm/h100.jpg', alt: 'Four NVIDIA H100 graphics cards standing in a row, with golden metal bodies', caption: 'Four NVIDIA H100 GPU cards. Each card has 80 GB of memory. Big LLMs run on many such cards together, because the weights do not fit on one card.', credit: { text: '极客湾Geekerwan, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:NVIDIA_H100_(%E6%9E%81%E5%AE%A2%E6%B9%BEGeekerwan)_004.png', license: 'CC BY 3.0' } },
    { type: 'table', head: ['Thing', 'Simple meaning', 'Example'], rows: [
      ['Architecture', 'The design of the function: which steps, in which order (like the blueprint of a machine)', 'Transformer (we build it fully in phase A2)'],
      ['Parameters / weights', 'The learned numbers inside that design', 'GPT-3: 175B, Llama 3: 8B and 70B'],
      ['Checkpoint / model file', 'The weights saved to disk', '.safetensors files of many GB'],
      ['Vocabulary', 'The fixed list of all tokens the model knows', 'GPT-4o tokenizer: about 200,000 tokens'],
    ]},
    { type: 'callout', tone: 'tip', title: 'More parameters = always better?', html: `Usually, more parameters = more capacity to remember patterns. But the quality of the data, the training method and fine-tuning matter just as much. Many 8B models today give better answers than the old 175B GPT-3.` },
    { type: 'h2', text: 'The pipeline inside: logits → softmax → probabilities' },
    { type: 'p', html: `The model does not give percentages directly. There are three steps inside: first a <strong>score</strong> for every token (the logit), then turning those scores into <strong>percentages</strong> (softmax), then <strong>picking one token</strong> from them (sampling). Let us look at them one by one.` },
    { type: 'callout', tone: 'term', title: 'New word: Logits', html: `<strong>What it is:</strong> the last layer of the model gives a raw score to <em>every</em> token in the vocabulary. These scores are called logits. A logit can be any number: 4.0, -1.0, 12.7. A bigger logit = the model likes that token more. It is not a probability yet: it can be negative, and the total is not 1.<br><strong>Why we need it:</strong> the maths inside the model can only produce scores directly. Scores are easy to compare: the bigger score wins.<br><strong>Without it:</strong> the model could not say how much it "likes" any token.` },
    { type: 'callout', tone: 'term', title: 'New word: Softmax', html: `<strong>What it is:</strong> a formula that turns any list of numbers into probabilities: all positive, and the total is 100%. Take <code>e^score</code> for every score (<code>e</code> is a fixed number ≈ 2.718), then divide each by the total: <code>p_i = e^(z_i) / Σ e^(z_j)</code>. Here <code>z_i</code> = the logit of token i, and <code>Σ</code> = "add them all up".<br><strong>Why we need it:</strong> to pick a token we need chances that add up to 100%. Because of the exponent, big scores get even bigger and small ones shrink. This makes the model's "favourite" clear.<br><strong>Without it:</strong> what would the chance of a negative score be? What would the total be? You cannot make a random choice straight from logits.` },
    { type: 'p', html: `Let us work out the numbers of the example above by hand. Logits: login 4.0, app 3.2, account 2.8, Wi-Fi 2.0, button 1.5, cricket -1.0. Find <code>e^z</code> for each, add them all (107.81), then divide each one by the total:` },
    { type: 'table', head: ['Token', 'Logit z', 'e^z', 'Probability = e^z / 107.81'], rows: [
      ['" login"', '4.0', '54.60', '50.6%'],
      ['" app"', '3.2', '24.53', '22.8%'],
      ['" account"', '2.8', '16.44', '15.3%'],
      ['" Wi-Fi"', '2.0', '7.39', '6.9%'],
      ['" button"', '1.5', '4.48', '4.2%'],
      ['" cricket"', '-1.0', '0.37', '0.3%'],
      ['<strong>Total</strong>', '', '<strong>107.81</strong>', '<strong>100%</strong>'],
    ], caption: 'A logit difference of only 0.8 (4.0 vs 3.2) becomes more than a 2x difference in probability. That is the exponent in softmax.' },
    { type: 'p', html: `Now the question: how do we pick <em>one</em> token from these probabilities? This is where <strong>sampling</strong> comes in.` },
    { type: 'callout', tone: 'term', title: 'New word: Sampling', html: `<strong>What it is:</strong> a random choice that follows the probabilities. Think of a spinner wheel where "login" takes half the wheel and "button" only a very thin slice. Spin it: you mostly get "login", and once in a while "button".<br><strong>Why we need it:</strong> if you always take the top token, answers become robotic and repetitive. A little randomness makes text feel natural.<br><strong>Without it:</strong> the same question always gets the exact same answer, and in long text the model starts repeating the same line.<br>That is why, if you ask ChatGPT the same question twice, the answer can be a little different.` },
    { type: 'p', html: `There are four well-known ways to pick a token: <strong>greedy</strong>, <strong>temperature</strong>, <strong>top-k</strong> and <strong>top-p</strong>. Let us look at each one separately, with numbers. We will use the same 6 tokens (login 50.6%, app 22.8%, account 15.3%, Wi-Fi 6.9%, button 4.2%, cricket 0.3%).` },

    { type: 'h3', text: '1) Greedy: always the top one' },
    { type: 'callout', tone: 'term', title: 'New word: Greedy decoding', html: `<strong>What it is:</strong> no random choice at all. At every step, take only the token with the highest probability. "Greedy" means taking whatever looks best right now.<br><strong>Why we need it:</strong> the same input always gives the same output. Good for facts, code, JSON and support answers.<br><strong>Without it:</strong> where you need an exact, repeatable answer (for example in tests), you would get a different output every time.` },
    { type: 'p', html: `<strong>Worked example:</strong> the biggest is 50.6% (" login"), so " login" is picked. Run it 100 times and you get " login" 100 times. The tokens holding the other 49.4% never get a chance.<br><strong>Good:</strong> predictable, easy to debug. <strong>Bad:</strong> boring in long text, and it sometimes repeats the same line again and again (the 2019 Holtzman paper showed this repetition). The "best" choice at every single step does not always add up to the best full answer.` },

    { type: 'h3', text: '2) Temperature: the randomness knob' },
    { type: 'callout', tone: 'term', title: 'New word: Temperature (T)', html: `<strong>What it is:</strong> dividing every logit by a number T before softmax: <code>p_i = e^(z_i/T) / Σ e^(z_j/T)</code>. A small T (like 0.5) = bigger gaps between scores = the top token pulls further ahead. A big T (like 2) = smaller gaps = small tokens also get a chance.<br><strong>Why we need it:</strong> with one knob you decide how "safe" or how "creative" the model is. Low for a support bot, higher for stories or suggesting names.<br><strong>Without it:</strong> the model's probabilities stay exactly as they are. There is no way to adjust them for the job.` },
    { type: 'table', head: ['Token', 'Logit z', 'T = 0.5: z/T → p', 'T = 1: p', 'T = 2: z/T → p'], rows: [
      ['" login"', '4.0', '8.00 → 75.9%', '50.6%', '2.00 → 33.8%'],
      ['" app"', '3.2', '6.40 → 15.3%', '22.8%', '1.60 → 22.7%'],
      ['" account"', '2.8', '5.60 → 6.9%', '15.3%', '1.40 → 18.6%'],
      ['" Wi-Fi"', '2.0', '4.00 → 1.4%', '6.9%', '1.00 → 12.4%'],
      ['" button"', '1.5', '3.00 → 0.5%', '4.2%', '0.75 → 9.7%'],
      ['" cricket"', '-1.0', '-2.00 → 0.0%', '0.3%', '-0.50 → 2.8%'],
    ], caption: 'At T = 0.5 the total of e^(z/T) is 3928.05, at T = 2 it is 21.84. Then each token\'s e^(z/T) is divided by that total.' },
    { type: 'p', html: `<strong>Read it:</strong> at T = 0.5, login goes up from 50.6% to 75.9%. At T = 2 it drops to 33.8%, and the useless " cricket" goes up from 0.3% to 2.8%. The smaller T gets, the more it behaves like greedy. That is why <strong>T = 0 is treated as greedy in practice</strong> (you cannot divide by 0, so APIs treat it as "always the top token").<br><strong>Good:</strong> one simple knob. <strong>Bad:</strong> a bigger T gives a chance to both good and useless tokens. To fully remove useless tokens you need top-k or top-p.` },

    { type: 'h3', text: '3) Top-k: a list of only the top k tokens' },
    { type: 'callout', tone: 'term', title: 'New word: Top-k sampling', html: `<strong>What it is:</strong> sort the tokens from biggest to smallest. Keep only the top k tokens and set the rest to 0. Then scale the kept tokens up again so the total is 100% (<strong>renormalize</strong>), and pick one at random. This method became popular from the 2018 Fan et al. story-generation paper.<br><strong>Why we need it:</strong> completely useless tokens like " cricket" are never picked, but there is still variety among the top few.<br><strong>Without it:</strong> from the long tail of 200,000 tokens, a strange token sometimes gets picked, and the answer drifts off.` },
    { type: 'p', html: `<strong>Worked example, k = 2:</strong> login 50.6% and app 22.8% are kept. Total = 73.4%. Renormalize: login = 50.6 ÷ 73.4 = <strong>69.0%</strong>, app = 22.8 ÷ 73.4 = <strong>31.0%</strong>. <strong>k = 3:</strong> the total is 88.6%, so login 57.1%, app 25.7%, account 17.2%.<br><strong>Good:</strong> simple, and the useless tail is cut off. <strong>Bad:</strong> k is fixed. When the model is very sure (one token at 99%), it still keeps k tokens. When the model is unsure (50 good options), it still keeps only k.` },

    { type: 'h3', text: '4) Top-p (nucleus): as many tokens as it takes to reach p' },
    { type: 'callout', tone: 'term', title: 'New word: Top-p (nucleus sampling)', html: `<strong>What it is:</strong> sort the tokens from biggest to smallest and keep adding up their probabilities (the <strong>cumulative</strong> total). As soon as the total reaches or passes p (like 0.9 = 90%), stop. Keep only those tokens, renormalize, then pick one at random. This idea came from the 2019 Holtzman et al. paper. The kept group is called the "nucleus".<br><strong>Why we need it:</strong> the length of the list changes by itself. When the model is sure, 1-2 tokens are kept. When it is unsure, more are kept.<br><strong>Without it (only top-k):</strong> the same fixed k in every situation, which is sometimes too many and sometimes too few.` },
    { type: 'table', head: ['Token', 'p', 'Cumulative', 'At p = 0.9?'], rows: [
      ['" login"', '50.6%', '50.6%', 'keep (still below 90)'],
      ['" app"', '22.8%', '73.4%', 'keep (still below 90)'],
      ['" account"', '15.3%', '88.6%', 'keep (still below 90)'],
      ['" Wi-Fi"', '6.9%', '95.5%', 'keep (90 is passed here, stop)'],
      ['" button"', '4.2%', '', 'remove'],
      ['" cricket"', '0.3%', '', 'remove'],
    ], caption: 'With top-p = 0.9, 4 tokens are kept. Renormalize (÷ 95.5%): login 53.0%, app 23.8%, account 16.0%, Wi-Fi 7.2%.' },
    { type: 'p', html: `If p were 0.5, only login would be kept (50.6% alone already passes 50): just like greedy. At p = 0.7, 2 tokens; at p = 0.8, 3.<br><strong>Good:</strong> it adjusts itself to how confident the model is. <strong>Bad:</strong> one more knob to understand. And top-p also does not stop wrong facts; it only cuts the useless tail.` },
    { type: 'callout', tone: 'tip', title: 'In real APIs these work together', html: `The usual order is: <strong>logits → ÷ T → softmax → top-k cut → top-p cut → renormalize → random pick</strong>. Not every provider offers every knob: some only offer temperature and top-p. Common advice: change only one knob at a time (temperature <em>or</em> top-p), not both.` },
    { type: 'p', html: `First, run each method on its own. Choose a mode, turn the knob, and see the calculation inside the table. Press "Sample 20 times": seed 42 makes 20 random picks, so you can see how the probabilities really behave.` },
    { type: 'custom', render(el) {
      const C = [[' login', 4.0], [' app', 3.2], [' account', 2.8], [' Wi-Fi', 2.0], [' button', 1.5], [' cricket', -1.0]];
      const NM = { greedy: 'Greedy', temp: 'Temperature', topk: 'Top-k', topp: 'Top-p' };
      const CT = { temp: ['Temperature T', 1, 20, 1, v => (v / 10).toFixed(1)], topk: ['k (how many tokens to keep)', 1, 6, 1, v => String(v)], topp: ['p (total needed)', 5, 100, 5, v => (v / 100).toFixed(2)] };
      const val = { temp: 5, topk: 2, topp: 90 };
      let mode = 'greedy';
      el.innerHTML = `<div class="chips" style="margin-bottom:10px">${Object.keys(NM).map(m => `<button type="button" class="chip sMode${m === mode ? ' on' : ''}" data-m="${m}">${NM[m]}</button>`).join('')}</div>
        <div class="sCtl" style="margin-bottom:8px"></div>
        <div style="overflow-x:auto"><table class="sTab"></table></div>
        <div class="calc-note sNote"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0"><button type="button" class="btn small primary sDraw">Sample 20 times (seed 42)</button></div>
        <div class="sOut" style="font-family:var(--f-mono);font-size:13px;word-break:break-word"></div>`;
      const q = s => el.querySelector(s);
      const pc = x => (x * 100).toFixed(1) + '%';
      const nm = i => C[i][0].trim();
      const soft = T => { const e = C.map(c => Math.exp(c[1] / T)); const s = e.reduce((a, b) => a + b, 0); return { e, s, p: e.map(x => x / s) }; };
      let f = [];
      const calc = () => {
        const v = val[mode];
        if (mode === 'greedy') {
          const p = soft(1).p, m = p.indexOf(Math.max(...p));
          f = p.map((x, i) => i === m ? 1 : 0);
          return { head: ['Token', 'Logit', 'Probability', 'Picked?'], rows: C.map((c, i) => [nm(i), c[1].toFixed(1), pc(p[i]), i === m ? 'yes, always' : 'never']), note: `The highest probability belongs to " ${nm(m)}" (${pc(p[m])}). Greedy makes no random choice: this token every time.` };
        }
        if (mode === 'temp') {
          const T = v / 10, r = soft(T);
          f = r.p;
          return { head: ['Token', 'Logit z', 'z ÷ T', 'e^(z/T)', 'Probability'], rows: C.map((c, i) => [nm(i), c[1].toFixed(1), (c[1] / T).toFixed(2), r.e[i].toFixed(2), pc(r.p[i])]), note: `T = ${T.toFixed(1)}: the total of all e^(z/T) = ${r.s.toFixed(2)}. Each token's probability = its e^(z/T) ÷ ${r.s.toFixed(2)}. ` + (T < 1 ? 'T is below 1: the top token becomes even stronger.' : T > 1 ? 'T is above 1: the distribution gets flatter, small tokens also get a chance.' : 'T = 1: the model\'s real probabilities.') };
        }
        const p = soft(1).p;
        if (mode === 'topk') {
          const k = v, mass = p.slice(0, k).reduce((a, b) => a + b, 0);
          f = p.map((x, i) => i < k ? x / mass : 0);
          return { head: ['Rank', 'Token', 'p', 'Kept?', 'New p'], rows: C.map((c, i) => [String(i + 1), nm(i), pc(p[i]), i < k ? 'yes' : 'removed', i < k ? pc(f[i]) : '0%']), note: `The total of the top ${k} tokens = ${pc(mass)}. Each kept token's new p = old p ÷ ${pc(mass)}, so the total is 100% again.` };
        }
        const P = v / 100; let cum = 0, n = 0; const cu = [];
        for (let i = 0; i < p.length; i++) { cum += p[i]; cu.push(cum); if (n === 0 && cum >= P - 1e-9) n = i + 1; }
        const mass = cu[n - 1];
        f = p.map((x, i) => i < n ? x / mass : 0);
        return { head: ['Token', 'p', 'Cumulative', 'Kept?', 'New p'], rows: C.map((c, i) => [nm(i), pc(p[i]), pc(cu[i]), i < n ? 'yes' : 'removed', i < n ? pc(f[i]) : '0%']), note: `p = ${P.toFixed(2)}: we kept adding from the top. After ${n} tokens the total was ${pc(mass)} (${(P * 100).toFixed(0)}% or more), so we stopped there. Then renormalize by ÷ ${pc(mass)}.` };
      };
      const draw = () => {
        const c = CT[mode];
        q('.sCtl').innerHTML = c ? `<label>${c[0]}: <strong class="sV">${c[4](val[mode])}</strong></label><input class="sR" type="range" min="${c[1]}" max="${c[2]}" step="${c[3]}" value="${val[mode]}">` : '<div class="calc-note">Greedy has no knob.</div>';
        if (c) q('.sR').addEventListener('input', e => { val[mode] = Number(e.target.value); q('.sV').textContent = c[4](val[mode]); table(); });
        table();
      };
      const table = () => {
        const r = calc();
        q('.sTab').innerHTML = `<thead><tr>${r.head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${r.rows.map((row, i) => `<tr style="${f[i] > 0 ? '' : 'color:var(--ink-3)'}">${row.map(x => `<td>${x}</td>`).join('')}</tr>`).join('')}</tbody>`;
        q('.sNote').textContent = r.note;
        q('.sOut').innerHTML = '';
      };
      q('.sDraw').onclick = () => {
        let s = 42; for (let w = 0; w < 3; w++) s = s * 16807 % 2147483647;
        const cnt = C.map(() => 0), seq = [];
        for (let d = 0; d < 20; d++) {
          s = s * 16807 % 2147483647; const r = s / 2147483647;
          let acc = 0, pick = f.length - 1; while (pick > 0 && f[pick] === 0) pick--;
          for (let i = 0; i < f.length; i++) { acc += f[i]; if (f[i] > 0 && r < acc) { pick = i; break; } }
          cnt[pick]++; seq.push(nm(pick));
        }
        q('.sOut').innerHTML = `<div>${seq.join(' · ')}</div><div class="calc-note">Count: ${C.map((c, i) => cnt[i] ? `${nm(i)} ×${cnt[i]}` : '').filter(Boolean).join(', ')}</div>`;
      };
      el.querySelectorAll('.sMode').forEach(b => b.onclick = () => { mode = b.dataset.m; el.querySelectorAll('.sMode').forEach(x => x.classList.toggle('on', x === b)); draw(); });
      draw();
    }},
    { type: 'p', html: `Look at the 20 picks with seed 42. <strong>Greedy</strong>: login ×20. <strong>Temperature 0.5</strong>: login ×15, app ×4, account ×1. <strong>Temperature 2</strong>: login only ×9, and the useless " cricket" also came up once. <strong>Top-k = 2</strong>: only login (×14) and app (×6), never anything else. <strong>Top-p = 0.9</strong>: login ×12, account ×4, app ×3, Wi-Fi ×1; button and cricket never. Probabilities are "chances", not promises: in 20 picks, login came up 60% of the time instead of 53.0%. The more picks you make, the closer you get to the real probability.` },
    { type: 'p', html: `Now all the knobs together. Change temperature, top-k and top-p and see which tokens are kept and what their probabilities become:` },
    { type: 'custom', render(el) {
      const C = [[' login', 4.0], [' app', 3.2], [' account', 2.8], [' Wi-Fi', 2.0], [' button', 1.5], [' cricket', -1.0]];
      el.innerHTML = `<div class="calc-note" style="margin-bottom:8px">Prompt: <code>To upload a video on xyz.com, first open the ___</code></div>
        <div class="row2">
          <div><label>Temperature: <strong class="tv">1.0</strong></label><input class="tT" type="range" min="0" max="20" step="1" value="10"></div>
          <div><label>Top-k: <strong class="kv">6</strong></label><input class="tK" type="range" min="1" max="6" step="1" value="6"></div>
          <div><label>Top-p: <strong class="pv">1.00</strong></label><input class="tP" type="range" min="10" max="100" step="5" value="100"></div>
        </div>
        <div class="bars" style="display:grid;gap:6px;margin:12px 0"></div>
        <div class="stats">
          <div class="stat"><span>Tokens kept</span><strong class="sk"></strong></div>
          <div class="stat"><span>Chance of the top token</span><strong class="st"></strong></div>
          <div class="stat"><span>Mode</span><strong class="sm"></strong></div>
        </div>
        <div class="calc-note cn"></div>`;
      const q = s => el.querySelector(s);
      const upd = () => {
        const T = Number(q('.tT').value) / 10, k = Number(q('.tK').value), tp = Number(q('.tP').value) / 100;
        q('.tv').textContent = T.toFixed(1); q('.kv').textContent = k; q('.pv').textContent = tp.toFixed(2);
        let p;
        if (T === 0) { const m = Math.max(...C.map(c => c[1])); p = C.map(c => c[1] === m ? 1 : 0); }
        else { const e = C.map(c => Math.exp(c[1] / T)); const s = e.reduce((a, b) => a + b, 0); p = e.map(x => x / s); }
        const order = p.map((v, i) => i).sort((a, b) => p[b] - p[a]);
        const kept = new Set(); let cum = 0;
        for (const i of order.slice(0, k)) { kept.add(i); cum += p[i]; if (cum >= tp - 1e-9) break; }
        const tot = [...kept].reduce((a, i) => a + p[i], 0);
        const f = p.map((v, i) => kept.has(i) ? v / tot : 0);
        q('.bars').innerHTML = C.map((c, i) => {
          const w = (f[i] * 100).toFixed(1);
          return `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <code style="min-width:84px">${c[0].trim()}</code>
            <div style="flex:1;min-width:120px;height:14px;background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r-sm);overflow:hidden">
              <div style="height:100%;width:${w}%;background:${kept.has(i) ? 'var(--accent)' : 'var(--line-2)'}"></div></div>
            <span style="min-width:150px;font-family:var(--f-mono);font-size:13px;color:${kept.has(i) ? 'var(--ink)' : 'var(--ink-3)'}">logit ${c[1].toFixed(1)} → ${kept.has(i) ? w + '%' : 'removed'}</span></div>`;
        }).join('');
        q('.sk').textContent = kept.size + ' / 6';
        q('.st').textContent = (f[order[0]] * 100).toFixed(1) + '%';
        q('.sm').textContent = T === 0 ? 'Greedy' : 'Sampling';
        q('.cn').textContent = T === 0 ? 'T = 0: no randomness, always " login". Same prompt = same answer.'
          : T < 1 ? 'T < 1: a sharp distribution. The top token is even stronger, answers are predictable.'
          : T > 1 ? 'T > 1: a flat distribution. Useless tokens like " cricket" start getting a chance; answers are creative but can drift off.'
          : 'T = 1: the model\'s real probabilities, unchanged.';
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Some numbers you will see in the widget: at T = 1, login is 50.6%. At T = 0.5, login is 75.9% and cricket is about 0%. At T = 2, login is only 33.8% and cricket rises to 2.8%. At top-p = 0.90, the first three tokens add up to 88.6% (less than 90), so the fourth one (Wi-Fi) is also kept: 4 tokens remain. At top-k = 2, login is 69.0% and app is 31.0%.` },
    { type: 'callout', tone: 'mistake', title: 'Common mistake', html: `"I set temperature to 0, so now the model will tell the truth." No. Temperature only reduces <em>randomness</em>. It does not add <em>knowledge</em>. If the model's favourite token is wrong, T = 0 will repeat that wrong answer the same way every time. Also, in many APIs, even T = 0 does not guarantee a 100% identical output (small differences from floating point maths and batching on the GPU).` },

    { type: 'h2', text: 'The autoregressive loop: one token, then the next, then the next' },
    { type: 'p', html: `We got one token. How does a full answer get built? Simple: add the chosen token to the end of the prompt, and give the whole text to the model again. The model now guesses the next token. This loop keeps going until (1) the model picks a special <strong>end token</strong>, or (2) the <code>max_tokens</code> limit is reached.` },
    { type: 'callout', tone: 'term', title: 'New word: Autoregressive', html: `<strong>What it is:</strong> using your own previous output as the input for the next step. "Auto" (self) + "regressive" (predicting forward from earlier values). Like when you write a sentence: you choose each new word after reading the words before it.<br><strong>Why we need it:</strong> the model can only give one token at a time. This is the way to build a long answer: one token, add it, then the next.<br><strong>Without it:</strong> the model could only give a one-token answer. And if each new token were not connected to the earlier tokens, the sentence would make no sense.` },
    { type: 'callout', tone: 'term', title: 'New word: End token and max_tokens', html: `<strong>What it is:</strong> the <strong>end token</strong> is a special token in the vocabulary that means "the answer is finished". <strong>max_tokens</strong> is a setting the developer gives: "make at most this many tokens".<br><strong>Why we need it:</strong> the loop has to stop somewhere. The model stops by itself when it picks the end token. max_tokens is a safety limit, so the model does not keep writing for hours and the bill does not grow.<br><strong>Without it:</strong> the loop might never stop, or sometimes run very long (and cost a lot).<br><strong>Example:</strong> the API tells you why it stopped: <code>finish_reason: "stop"</code> (end token found) or <code>"length"</code> (max_tokens reached, the answer was cut in the middle).` },
    { type: 'steps', items: [
      { t: 'Prompt → tokens', d: 'Break the text into token IDs (the tokenizer does this).' },
      { t: 'Forward pass', d: 'All tokens go through the model. At the last position you get a logit for every vocab token.' },
      { t: 'Softmax + sampling', d: 'Apply temperature/top-k/top-p and pick one token.' },
      { t: 'Append', d: 'Add the new token to the sequence. If the app is streaming, send this token to the user right away.' },
      { t: 'Repeat or stop', d: 'End token found or max_tokens reached? Stop. Otherwise go back to step 2.' },
    ]},
    { type: 'p', html: `Below is a tiny <em>fake</em> model (it knows only about 25 tokens, and we wrote its probabilities by hand). But the loop works exactly like the real one. Press "Next token" and at every step look at: the probabilities, the random number, and the token that gets picked.` },
    { type: 'custom', render(el) {
      const M = { '<s>': [[' First', .55], [' Tap', .30], [' Maybe', .15]],
        ' First': [[' log', .70], [' open', .20], [' restart', .10]], ' Tap': [[' Upload', .80], [' retry', .20]],
        ' Maybe': [[' internet', .60], [' server', .40]], ' log': [[' in', .75], [' on', .25]],
        ' open': [[' Settings', .65], [' Help', .35]], ' restart': [[' it', .90], [' now', .10]],
        ' Upload': [[' button', .85], [' icon', .15]], ' internet': [[' slow', .70], [' off', .30]],
        ' server': [[' down', .60], [' busy', .40]], ' then': [[' upload', .55], [' try', .45]],
        ' upload': [[' again', 1]], ' try': [[' again', 1]], '.': [['<end>', 1]] };
      ['in', 'on', 'Settings', 'Help', 'it', 'now', 'retry', 'button', 'icon', 'slow', 'off', 'down', 'busy', 'again'].forEach(w => { M[' ' + w] = [[' then', .40], ['.', .60]]; });
      const adj = (d, T) => {
        if (T === 0) { const m = Math.max(...d.map(x => x[1])); let done = false; return d.map(x => { const v = (!done && x[1] === m) ? 1 : 0; if (v) done = true; return [x[0], v]; }); }
        const e = d.map(x => Math.pow(x[1], 1 / T)); const s = e.reduce((a, b) => a + b, 0); return d.map((x, i) => [x[0], e[i] / s]);
      };
      el.innerHTML = `<div class="calc-note" style="margin-bottom:8px">User: <code>My video is not uploading, what should I do?</code> → Assistant:</div>
        <div class="row2">
          <div><label>Temperature: <strong class="gtv">1.0</strong></label><input class="gT" type="range" min="0" max="20" step="5" value="10"></div>
          <div><label>Seed (starting number for randomness)</label><input class="gS" type="number" value="42" min="1" step="1"></div>
          <div><label>max_tokens: <strong class="gmv">12</strong></label><input class="gM" type="range" min="2" max="12" step="1" value="12"></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0">
          <button type="button" class="btn small primary gN">Next token</button>
          <button type="button" class="btn small ghost gA">Generate all</button>
          <button type="button" class="btn small ghost gR">Reset</button></div>
        <div class="gOut" style="font-family:var(--f-mono);padding:10px;border:1px solid var(--line);border-radius:var(--r);background:var(--surface-2);min-height:44px;word-break:break-word"></div>
        <div class="gStep" style="margin-top:10px;overflow-x:auto"></div>
        <div class="stats"><div class="stat"><span>Tokens made</span><strong class="gC"></strong></div><div class="stat"><span>finish_reason</span><strong class="gF"></strong></div></div>`;
      const q = s => el.querySelector(s);
      let st;
      const reset = () => {
        let s = Math.floor(Math.abs(Number(q('.gS').value) || 1)) % 2147483647; if (s <= 0) s += 2147483646;
        for (let w = 0; w < 3; w++) s = s * 16807 % 2147483647;
        st = { s, last: '<s>', out: [], done: '' }; q('.gStep').innerHTML = ''; draw();
      };
      const draw = () => {
        q('.gOut').innerHTML = st.out.map((t, i) => `<span style="background:${i === st.out.length - 1 ? 'var(--accent-soft)' : 'transparent'};border-radius:4px">${t.replace(/ /g, '&nbsp;')}</span>`).join('') || '<span style="color:var(--ink-3)">(empty for now)</span>';
        q('.gC').textContent = st.out.length; q('.gF').textContent = st.done || '...';
        q('.gN').disabled = q('.gA').disabled = !!st.done;
      };
      const step = () => {
        if (st.done) return;
        const T = Number(q('.gT').value) / 10, max = Number(q('.gM').value);
        if (st.out.length >= max) { st.done = 'length (max_tokens)'; draw(); return; }
        const d = adj(M[st.last], T);
        st.s = st.s * 16807 % 2147483647; const r = st.s / 2147483647;
        let c = 0, pick = d[d.length - 1][0];
        for (const [t, p] of d) { c += p; if (r < c) { pick = t; break; } }
        q('.gStep').innerHTML = `<table><thead><tr><th>Next token</th><th>Probability (T=${T.toFixed(1)})</th><th>Cumulative</th></tr></thead><tbody>` +
          (() => { let cc = 0; return d.map(([t, p]) => { cc += p; return `<tr style="${t === pick ? 'font-weight:700;color:var(--accent-ink)' : ''}"><td><code>${t.replace('<', '&lt;').replace('>', '&gt;')}</code></td><td>${(p * 100).toFixed(1)}%</td><td>${(cc * 100).toFixed(1)}%</td></tr>`; }).join(''); })() +
          `</tbody></table><div class="calc-note">Random number r = ${r.toFixed(3)}. The first token whose cumulative value is bigger than r is picked: <code>${pick.replace('<', '&lt;').replace('>', '&gt;')}</code></div>`;
        if (pick === '<end>') st.done = 'stop (end token)'; else { st.out.push(pick); st.last = pick; if (st.out.length >= max && M[pick]) { /* length on the next click */ } }
        draw();
      };
      q('.gN').onclick = step;
      q('.gA').onclick = () => { let g = 0; while (!st.done && g++ < 40) step(); };
      q('.gR').onclick = reset;
      ['.gT', '.gS', '.gM'].forEach(s => q(s).addEventListener('input', () => { q('.gtv').textContent = (Number(q('.gT').value) / 10).toFixed(1); q('.gmv').textContent = q('.gM').value; reset(); }));
      reset();
    }},
    { type: 'p', html: `Try it: at <strong>T = 0</strong>, with any seed, the answer is always "First log in." (greedy). At <strong>T = 1, seed 7</strong>, you get "First open Settings then try again.": same model, a different random number, a different answer. At <strong>T = 1.5, seed 28</strong>, the model gets stuck in a "then try again then try again" loop, and <code>max_tokens</code> cuts it off at 12 tokens (finish_reason = length). Real APIs report the same <code>finish_reason</code>.` },
    { type: 'callout', tone: 'why', title: 'This is why streaming exists', html: `Why does ChatGPT show words one by one? Because the model really makes only one token at a time. Instead of waiting for the full answer, the app sends each token to the screen as soon as it arrives. How fast the first token came (<strong>TTFT</strong>, time to first token), and then how many tokens per second came: these two numbers are the "speed" of an LLM app. A longer answer = more loops = more time and more money.` },
    { type: 'h2', text: 'xyz Assistant v1: the full journey of a request' },
    { type: 'p', html: `xyz.com will not train its own model (far too expensive). It will use an LLM provider's <strong>API</strong> (API = a fixed way for one program to talk to another program; see the <a href="#/what-is-api">API lesson</a>): the app server sends the prompt, the model runs on the provider's GPUs, and tokens come back. Click each box to read its role, then run the scenarios.` },
    { type: 'callout', tone: 'term', title: 'New word: Inference', html: `<strong>What it is:</strong> using a trained model to produce output. The weights do not change; they are only read. Every time you ask ChatGPT something, that is inference. In contrast, during <strong>training</strong> the weights change (details below).<br><strong>Why we need it:</strong> the model is built once, and now it has to answer the questions of millions of users. That is inference.<br><strong>Without it:</strong> a trained model is just a big file sitting on a disk, of no use to anyone.` },
    { type: 'callout', tone: 'term', title: 'New word: System prompt', html: `<strong>What it is:</strong> "background instructions" given to the model, written by the app's developer, not by the user. For example: "You are the support assistant of xyz.com. Give short and polite answers."<br><strong>Why we need it:</strong> so the model knows who it is, what tone to use, and what not to do.<br><strong>Without it:</strong> the model talks like a general chatbot: sometimes too long, sometimes off-topic. Details: the <a href="#/ai-prompts">Prompts</a> lesson.` },
    { type: 'flow', height: 300,
      nodes: [
        { id: 'u', label: 'User', sub: 'xyz app', x: 80, y: 110, w: 124, kind: 'client', info: 'What it is: an xyz.com user who types a question in the chat box of the app. The whole system exists for this person. They see the answer arrive token by token (streamed).' },
        { id: 'app', label: 'xyz server', sub: 'builds the prompt', x: 270, y: 110, w: 150, kind: 'server', info: 'What it is: xyz.com\'s own backend server. It sits in the middle because the API key and the system prompt cannot be kept on the user\'s phone. It adds a system prompt to the user\'s message ("You are the support assistant of xyz.com..."), applies settings (model, temperature, max_tokens), sends it to the provider with the API key, and streams the answer back to the user. Retries, timeouts and logging also happen here.' },
        { id: 'api', label: 'LLM API', sub: 'provider gateway', x: 470, y: 110, w: 140, kind: 'edge', meter: true, load: 30, info: 'What it is: the public door of the LLM provider (like OpenAI, Anthropic, Google), a URL (like /v1/messages or /v1/chat/completions). xyz.com does not have to buy its own GPUs, so it uses this API. Jobs: check the API key, rate limits (requests/min, tokens/min), count tokens for billing, and send the request to a free GPU server.' },
        { id: 'gpu', label: 'Model', sub: 'weights on GPU', x: 636, y: 110, w: 132, kind: 'data', info: 'What it is: the provider\'s GPU servers, with the model\'s weights loaded in their memory. The real "thinking" happens here. The tokenizer turns the text into tokens, then the autoregressive loop runs: forward pass → logits → softmax → sample → append. Each new token is streamed back right away.' },
        { id: 'docs', label: 'Help docs', sub: 'real xyz policy', x: 470, y: 240, w: 160, kind: 'data', hidden: true, info: 'What it is: xyz.com\'s real help articles: refund policy, upload limits. The model never saw them during training. Putting them in the prompt = grounding. This is the idea behind RAG, which we build fully in phase A4.' },
      ],
      edges: [{ a: 'u', b: 'app' }, { a: 'app', b: 'api' }, { a: 'api', b: 'gpu' }, { id: 'e-docs', a: 'app', b: 'docs', hidden: true }],
      scenarios: [
        { name: 'Happy path (streaming)', steps: [
          { title: 'The user\'s question', text: 'The user writes: "My video is not uploading, what should I do?"', go: 'u>app', msg: 'POST /chat  { "message": "My video is not uploading, what should I do?" }' },
          { title: 'Prompt built', text: 'The server joins the system prompt and the user message and sends them to the API. Temperature is low (0.3) because support answers should be stable.', go: 'app>api', msg: '{ model, max_tokens: 300, temperature: 0.3,\n  system: "You are the support assistant of xyz.com...",\n  messages: [{ role: "user", content: "My video is not..." }], stream: true }' },
          { title: 'Tokenize + first forward pass', text: 'The API sends the request to a GPU. The prompt is turned into tokens, and all prompt tokens go through the model together (this is called <strong>prefill</strong>: reading the whole prompt in one go). The first output token comes out.', go: 'api>gpu', after: { gpu: { state: 'hot', sub: 'token 1: " First"' } } },
          { title: 'Stream token by token', text: 'Each new token is sent back right away, and the loop starts making the next token. The user sees the text being "typed".', go: ['evt:gpu>api>app>u'], msg: 'event: " First"\nevent: " log"\nevent: " in"\n...', after: { gpu: { sub: 'loop running' } } },
          { title: 'Stop', text: 'The model picked the end token. The API reports how many tokens were used (for billing) and why it stopped.', go: 'res:gpu>api>app>u', after: { gpu: { state: 'ok', sub: 'done' } }, msg: '{ stop_reason / finish_reason: "stop",\n  usage: { input_tokens: 412, output_tokens: 58 } }' },
        ]},
        { name: 'Hallucination', intro: 'The user asks about a specific xyz.com policy that the model has never read.', steps: [
          { title: 'A policy question', text: '"How many days does an xyz Premium refund take?"', go: 'u>app>api>gpu', msg: 'How many days for a refund?' },
          { title: 'The model "makes it up"', text: 'The model does not have xyz.com\'s policy. But during training it saw thousands of company pages saying "refund in 5-7 working days". Those are the most probable tokens, so it writes them with confidence.', set: { gpu: { state: 'warn', sub: '"7 days" (guess!)' } }, go: 'res:gpu>api>app>u', msg: 'Assistant: "Refunds arrive within 7 working days."' },
          { title: 'The real policy was different', text: 'xyz.com\'s real policy is 14 days. The answer was fluent, confident, and wrong. The model did not lie on purpose: it just produced "the most probable text". This is called <strong>hallucination</strong>.', focus: ['gpu'], set: { u: { state: 'warn', sub: 'got wrong info' } } },
          { title: 'Idea for a fix: grounding', text: 'The server first pulls the right paragraph from xyz\'s help docs and puts it in the prompt: "Answer only from the text below. If you do not know, say you do not know." Now the model has correct text it can copy from. This is called <strong>grounding</strong>, and the system that does it is RAG.', show: ['docs', 'e-docs'], go: ['app>docs', 'res:docs>app'], set: { gpu: { state: '', sub: 'weights on GPU' }, u: { state: '', sub: 'xyz app' } }, after: { docs: { state: 'ok', sub: 'refund: 14 days' } } },
        ]},
        { name: 'Rate limit (429)', steps: [
          { title: 'Traffic spike', text: 'After a viral video, thousands of users chat at the same time.', flood: { paths: ['u>app>api'], n: 14 }, after: { api: { load: 100, state: 'hot', sub: 'limit full' } } },
          { title: 'The API says no', text: 'xyz\'s account crossed its per-minute token limit. The API returns <code>429 Too Many Requests</code> (429 = "too many requests, wait a little"; see the <a href="#/rate-limiting">rate limiting</a> lesson). The request never reached the model.', go: 'bad:api>app', msg: 'HTTP 429  { "error": "rate_limit_exceeded" }\nretry-after: 20' },
          { title: 'The right response from the server', text: 'A good server does not flood the API with instant retries (that makes it worse). It retries with <em>exponential backoff</em>: first wait 1 second, then 2, then 4 (see the <a href="#/resilience">resilience</a> lesson), and shows the user a polite message meanwhile. In the long run: buy a higher limit, use shorter prompts, or use a cheaper/smaller model as a fallback.', go: 'res:app>u', after: { api: { load: 60, state: '', sub: 'provider gateway' } }, msg: 'Assistant: "A lot of people are chatting right now. Please try again in 20 seconds."' },
        ]},
        { name: 'max_tokens cutoff', steps: [
          { title: 'A small limit', text: 'To save money, the developer set <code>max_tokens: 20</code>. The user asked for a long troubleshooting guide.', go: 'u>app>api>gpu', msg: '{ max_tokens: 20, ... }' },
          { title: 'Cut in the middle', text: 'The model\'s answer was not finished yet, but the 20 tokens were used up. The loop stopped right there. The user got a half sentence.', set: { gpu: { state: 'warn', sub: '20/20 tokens' } }, go: 'res:gpu>api>app>u', msg: '"First update the app, then go to Settings and turn on the Storage permission, then"\nfinish_reason: "length"' },
          { title: 'Fix', text: 'The server should check <code>finish_reason</code>. If it is "length", raise the limit, ask the model to "continue", or say in the prompt "do not write more than 5 points".', focus: ['app'], set: { gpu: { state: '', sub: 'weights on GPU' } } },
        ]},
      ],
    },
    { type: 'h2', text: 'Why does an LLM hallucinate?' },
    { type: 'callout', tone: 'term', title: 'New word: Hallucination', html: `<strong>What it is:</strong> an answer from the model that sounds fluent and confident but is wrong or made up: a fake refund policy, a fake research paper, a fake function name.<br><strong>Why it matters:</strong> the model does not "search for the truth"; it "builds probable text". This is part of how it is built, not a small bug.<br><strong>The harm:</strong> users trust wrong information (a wrong refund date, wrong code), and xyz.com's reputation suffers.` },
    { type: 'list', items: [
      `<strong>Its job is to produce "probable text".</strong> The training goal was "guess the next token correctly", not "only say true things". To the model, a believable sentence and a true sentence can look the same.`,
      `<strong>Rare facts are weak.</strong> A fact that appeared a thousand times in the training text (Paris is the capital of France) is remembered well. A fact that appeared once or twice (the birthday of a small startup's founder) is blurry. For a blurry fact, the model builds something that looks similar.`,
      `<strong>Knowledge cutoff.</strong> The model saw data only up to a certain date. Things after that (xyz.com's new Premium plan) it simply does not know.`,
      `<strong>Guessing gets rewarded.</strong> The argument of OpenAI's 2025 paper "Why Language Models Hallucinate": most benchmarks give points for a correct answer and zero for "I do not know". Like in an exam, guessing scores more than saying "I do not know", so models learn to guess.`,
      `<strong>One wrong token, then more on top of it.</strong> In the autoregressive loop, once a wrong token is picked, the next tokens treat that mistake as true and build on it.`,
    ]},
    { type: 'table', head: ['Fix', 'How it helps', 'Lesson'], rows: [
      ['Grounding / RAG', 'Put the right documents in the prompt, and the model answers from them', '<a href="#/ai-rag">RAG</a>'],
      ['Tools', 'The model does not guess things like order status; it asks an API', '<a href="#/ai-agents">Agents</a>'],
      ['Permission to say "I do not know"', 'Prompt: "If it is not in the docs, clearly say you do not know"', '<a href="#/ai-prompts">Prompts</a>'],
      ['Citations + evals', 'Show the source of every claim, and measure mistakes on test sets', '<a href="#/ai-agent-patterns">Evals</a>'],
    ]},

    { type: 'h2', text: 'Training vs inference' },
    { type: 'callout', tone: 'term', title: 'New word: Training', html: `<strong>What it is:</strong> slowly improving the model's weights so its guesses become correct. Like practice tests: see the mistake, fix it a little, then take the next test.<br><strong>Why we need it:</strong> at the start the weights are random and the model writes nonsense. Training is what teaches it language.<br><strong>Without it:</strong> there would be no smart model at all. There would be nothing to run inference on.` },
    { type: 'p', html: `So far we have <em>used</em> the model (inference). But where did the weights come from? From <strong>training</strong>. In training, we show the model a piece of real text, ask it to guess the next token, and fix the weights a tiny bit based on how wrong it was. This is repeated billions of times.` },
    { type: 'callout', tone: 'term', title: 'New word: Loss', html: `<strong>What it is:</strong> one number for how wrong the model was. A small loss = good. <strong>Why we need it:</strong> without measuring "how wrong", we cannot know which way to fix the weights. <strong>Without it:</strong> training would be like shooting arrows in the dark.<br>In LLM training, loss = <code>-ln(p)</code> (ln = natural log, a maths function: the smaller p is, the bigger -ln(p) gets), where p is the probability the model gave to the <em>correct</em> next token. Gave the correct token 90% → loss 0.105 (small, great). 50% → 0.693. 10% → 2.303. 1% → 4.605 (very bad). The whole job of training is to bring this average loss down. A method called <strong>gradient descent</strong> tells us which way to change the weights: for each weight, check whether increasing it a little makes the loss go up or down, then nudge it a little in the direction that lowers the loss.` },
    { type: 'compare',
      left: { title: 'Training', html: `• Weights <strong>change</strong><br>• Text with trillions of tokens<br>• Thousands of GPUs, weeks to months, huge amounts of money<br>• Happens once (or once in a while)<br>• Output: a model file (weights)<br>• Done by the companies that build models` },
      right: { title: 'Inference', html: `• Weights are only <strong>read</strong> (frozen)<br>• One prompt, a few thousand tokens<br>• One or a few GPUs, milliseconds to seconds<br>• On every user request, millions of times<br>• Output: generated tokens<br>• Apps like xyz.com do it through an API` },
    },
    { type: 'p', html: `Training also has stages: first <strong>pre-training</strong> (next token on internet text, which creates a "base model" that only continues text), then <strong>fine-tuning</strong> (following instructions, chatting, staying safe). Give a base model "How do I upload a video?" and it may just write more questions; a chat model gives an answer. Details: <a href="#/ai-training-finetuning">Pre-training, fine-tuning, RLHF</a>.` },
    { type: 'callout', tone: 'mistake', title: 'Common mistake', html: `"I will teach the model in the chat, and it will remember." No. Chatting is inference; the weights do not change. The model only seems to "remember" because the old messages are sent again in the prompt (context) every time. A new chat = everything is forgotten. This is in the <a href="#/ai-context">context window</a> lesson.` },

    { type: 'callout', tone: 'tip', title: 'Decide: use an LLM or simple code?', html: `• <strong>Simple code/rules</strong>: when the input has a fixed format and the answer must be exactly right (balance, tax, order status lookup). Cheap, fast, 100% predictable.<br>• <strong>LLM</strong>: when the input is free-form language (everyone writes it differently), or the output is naturally written text (summary, reply, explanation).<br>• <strong>Both</strong>: the LLM understands the question, and code/a database brings the real fact (tools/RAG). Most real apps do this.<br>• <strong>Temperature</strong>: facts, code, JSON, support → 0 to 0.3. Brainstorming, stories, suggesting names → 0.7 to 1.0.` },
    { type: 'h2', text: 'The whole picture' },
    { type: 'diagram', title: 'LLM: the whole picture at a glance', height: 600,
      groups: [
        { label: 'xyz.com', x: 20, y: 8, w: 680, h: 104 },
        { label: 'LLM provider (inference, on every request)', x: 20, y: 140, w: 680, h: 300 },
        { label: 'Training (already done, offline)', x: 20, y: 470, w: 680, h: 118 },
      ],
      nodes: [
        { id: 'u', label: 'User', sub: 'chat box', x: 110, y: 60, w: 150, kind: 'client', info: 'What it is: the xyz.com user who types a question. They see the answer arrive token by token (streaming).' },
        { id: 'app', label: 'xyz server', sub: 'adds system prompt', x: 360, y: 60, w: 150, kind: 'server', info: 'What it is: xyz.com\'s backend. It adds the system prompt and settings (temperature, max_tokens), keeps the API key, checks finish_reason, and when needed brings the right text from the help docs.' },
        { id: 'docs', label: 'Help docs', sub: 'real policy', x: 610, y: 60, w: 150, kind: 'data', info: 'What it is: xyz.com\'s real help articles. The model did not see them in training. Putting the right paragraph in the prompt = grounding, which reduces hallucination (RAG lesson).' },
        { id: 'api', label: 'LLM API', sub: 'key, limits, bill', x: 110, y: 200, w: 150, kind: 'edge', info: 'What it is: the provider\'s door. It checks the API key, applies rate limits (429), counts tokens for the bill, and sends the request to a free GPU.' },
        { id: 'tok', label: 'Tokenizer', sub: 'text → token IDs', x: 360, y: 200, w: 150, kind: 'queue', info: 'What it is: the program that breaks text into tokens. Each token has a number (ID) in the vocabulary. The model only sees these numbers.' },
        { id: 'gpu', label: 'Model (weights)', sub: 'forward pass on GPU', x: 610, y: 200, w: 150, kind: 'server', info: 'What it is: billions of weights kept in GPU memory. All tokens pass through them (forward pass), and at the last position a score comes out for every vocab token.' },
        { id: 'soft', label: 'Logits → softmax', sub: 'a % for each token', x: 610, y: 370, w: 150, kind: 'cache', info: 'What it is: logits = the raw score of every token. Softmax turns them into probabilities (all positive, total 100%). Temperature is applied here, before softmax.' },
        { id: 'samp', label: 'Sampler', sub: 'T, top-k, top-p', x: 350, y: 370, w: 150, kind: 'queue', info: 'What it is: the part that picks one token from the probabilities. Greedy (always the top one), or random with temperature/top-k/top-p. The picked token is streamed out and added to the input, and the loop runs again.' },
        { id: 'data', label: 'Training text', sub: 'internet, books, code', x: 110, y: 530, w: 160, kind: 'data', info: 'What it is: text with trillions of tokens. The model practises "guess the next token" on it. Anything not in it (xyz\'s policy, yesterday\'s news) is unknown to the model.' },
        { id: 'train', label: 'Training loop', sub: 'lower the loss', x: 360, y: 530, w: 150, kind: 'server', info: 'What it is: guess, measure the loss (-ln p), fix the weights a little with gradient descent, repeat. Thousands of GPUs, weeks to months. Output: a file of weights. Chatting does not run this again.' },
      ],
      edges: [
        { a: 'u', b: 'app', n: 1, label: 'asks' },
        { a: 'app', b: 'api', n: 2, label: 'prompt' },
        { a: 'api', b: 'tok', n: 3, label: 'text' },
        { a: 'tok', b: 'gpu', n: 4, label: 'IDs' },
        { a: 'gpu', b: 'soft', n: 5, label: 'logits' },
        { a: 'soft', b: 'samp', n: 6, label: 'chances' },
        { a: 'samp', b: 'tok', kind: 'evt', dashed: true, label: 'append, repeat' },
        { a: 'samp', b: 'api', kind: 'res', n: 7, label: 'token stream', via: [[110, 370]] },
        { a: 'app', b: 'docs', dashed: true, label: 'grounding' },
        { a: 'data', b: 'train', label: 'practice' },
        { a: 'train', b: 'gpu', dashed: true, label: 'weights', via: [[480, 530], [480, 290]] },
      ],
      paths: [
        { name: 'Prompt to tokens', text: 'The user\'s question is joined with the system prompt on the xyz server, goes to the API, and the tokenizer breaks it into token IDs.', go: ['u>app>api>tok'] },
        { name: 'Pick the next token', text: 'The IDs go through the model, a logit comes out for every vocab token, softmax turns them into %, the sampler picks one token, and that token is added to the input so the loop runs again.', go: ['tok>gpu>soft>samp', 'samp>tok'] },
        { name: 'Answer stream', text: 'Each picked token goes right away through the API to the server and the user. The loop stops at the end token or at max_tokens.', go: ['samp>api>app>u'] },
        { name: 'Hallucination and grounding', text: 'Without docs, the model builds the "most probable" text, which can be wrong. If the server puts the right paragraph from the help docs into the prompt, the answer is tied to that text.', go: ['app>docs', 'app>api>tok>gpu'] },
        { name: 'Training (before)', text: 'Next-token practice on training text, lowering the loss, creates the weights. Those weights are loaded on the GPU. They do not change during inference.', go: ['data>train>gpu'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>An LLM has one job: give the probability of the <strong>next token</strong> after the text so far. A long answer is built by running this job in a loop (autoregressive).</li>
      <li>Inside the model are billions of <strong>weights</strong> (parameters). 175B × 2 bytes = 350 GB, so big models run on many GPUs.</li>
      <li>Pipeline: <strong>logits</strong> (raw score) → <strong>softmax</strong> (%, total 100) → <strong>sampling</strong> (pick one token).</li>
      <li>Greedy = always the top one. Temperature = the randomness knob (small T = sure, big T = creative). Top-k = only the top k. Top-p = as many tokens as it takes to reach p.</li>
      <li>The loop stops at the end token (<code>finish_reason: stop</code>) or at <code>max_tokens</code> (<code>length</code>, the answer may be cut).</li>
      <li>Hallucination = a confident but wrong answer. The model builds probable text; it does not look up facts. Fixes: grounding (RAG), tools, evals. Temperature 0 is not a fix.</li>
      <li>Training changes the weights (expensive, done once). Inference only reads them (every request). The model does not "learn" anything from a chat.</li>
    </ul>` },

    { type: 'tradeoffs',
      gains: ['Understands free-form language: typos, Hinglish, a thousand ways of phrasing, without writing rules', 'One model can do many jobs: answers, summaries, translation, code', 'xyz.com does not have to train a model; with an API it can start in a day', 'With streaming, the user sees something right away'],
      costs: ['Hallucination: confident wrong answers, especially on rare or private facts', 'Not deterministic: same question, different answer (sampling)', 'Every token costs money and time; a long answer = expensive and slow', 'Knowledge cutoff: it does not know new or private information unless you put it in the prompt', 'Depends on the provider: rate limits, outages, price changes'] },

    { type: 'think', questions: [
      { q: 'xyz.com needs to answer "how many videos are in your account today?". Is asking the LLM alone enough?', a: 'No. This is private, live data the model has never seen. The model will make up some probable number (hallucination). The right way: the server gets the count from the database (or gives the model a tool that fetches the count), and the LLM only puts that number into nice language. This is the idea behind agents.' },
      { q: 'A developer says "set temperature to 0, then the model will never be wrong". What would you reply?', a: 'Temperature 0 only removes randomness (greedy: always the top token). If the model\'s top token is a wrong fact, it will say that wrong fact every time, just consistently. For correctness you need grounding (RAG), tools and evals. Also, on many APIs the output can still differ slightly even at T = 0.' },
      { q: 'The model gives a 200-token answer. The first token came in 0.5 seconds, then 50 tokens/second. How long until the user has the full answer? What if the answer is 2x longer?', a: 'Roughly 0.5 + 200/50 = 4.5 seconds. For 400 tokens: 0.5 + 8 = 8.5 seconds. Output tokens are made one by one, so long answers are directly slower (and more expensive). That is why support bots are told to write short answers.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'What exactly does an LLM output in one step?', options: ['The full answer at once', 'A score (logit) for every vocabulary token for the next position, which becomes probabilities', 'A matching answer from a database'], answer: 1, explain: 'Each forward pass gives the logits of all tokens for one position. Softmax turns them into probabilities, and sampling picks one token. The full answer comes from the loop.' },
      { q: 'You apply temperature 0.5 to logits [2, 1, 0]. What happens?', options: ['The top token\'s probability goes up', 'All tokens get equal probability', 'The top token\'s probability goes down'], answer: 0, explain: 'With T < 1 the logits become [4, 2, 0], the gaps grow, and after softmax the top token is even stronger. (At T=1 the top ≈ 66.5%, at T=0.5 ≈ 86.7%.)' },
      { q: 'Top-p = 0.9 and probabilities [0.5, 0.3, 0.15, 0.05]. How many tokens are kept?', options: ['1', '2', '3'], answer: 2, explain: '0.5 → 0.8 (still below 0.9) → 0.95 (passes 0.9). Three tokens are kept; the fourth (5%) is removed.' },
      { q: 'You apply top-k = 2 to probabilities [50.6%, 22.8%, 15.3%, ...]. After renormalizing, what is the first token\'s chance?', options: ['50.6%', '69.0%', '100%'], answer: 1, explain: 'Only the top 2 are kept: total 50.6 + 22.8 = 73.4%. New chance = 50.6 ÷ 73.4 = 69.0%. The second one gets 31.0%. The total is 100% again.' },
      { q: 'The API returned an answer with finish_reason = "length". What does it mean?', options: ['The model chose to end the answer by itself', 'The answer was cut in the middle at the max_tokens limit', 'The prompt was too short'], answer: 1, explain: '"length" = the output token limit was reached. The answer may be incomplete. "stop" = the model picked the end token by itself.' },
      { q: 'In a chat, the user told the model their name. The next day, in a new chat, the model does not remember it. Why?', options: ['The model\'s weights do not change from chats, and the old chat was not sent in the context', 'The model\'s server restarted', 'The temperature was too high'], answer: 0, explain: 'Chat = inference. The weights are frozen. "Memory" only appears when the app sends the old messages again in the prompt.' },
    ]},
    { type: 'sources', items: [
      { title: 'Language Models are Few-Shot Learners (GPT-3)', publisher: 'Brown et al., OpenAI (arXiv)', url: 'https://arxiv.org/abs/2005.14165', year: 2020, used: 'The 175B-parameter example; capability growing with scale.' },
      { title: 'The Curious Case of Neural Text Degeneration', publisher: 'Holtzman et al. (arXiv, ICLR 2020)', url: 'https://arxiv.org/abs/1904.09751', year: 2019, used: 'The idea of top-p (nucleus) sampling, and the repetition problem of greedy decoding.' },
      { title: 'Hierarchical Neural Story Generation', publisher: 'Fan, Lewis, Dauphin (arXiv)', url: 'https://arxiv.org/abs/1805.04833', year: 2018, used: 'Top-k sampling.' },
      { title: 'Why Language Models Hallucinate', publisher: 'Kalai, Nachum, Vempala, Zhang, OpenAI', url: 'https://openai.com/index/why-language-models-hallucinate/', year: 2025, used: 'Evaluations reward guessing, so models learn to guess.' },
      { title: 'What are tokens and how to count them?', publisher: 'OpenAI Help Center', url: 'https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them', year: 2025, used: 'Rule of thumb: 1 token ≈ 4 characters ≈ 3/4 of a word (English).' },
      { title: 'Transformers Explained | Simple Explanation of Transformers', publisher: 'codebasics (YouTube)', url: 'https://www.youtube.com/watch?v=ZhAz268Hdpw', used: 'The learner\'s reference video: the intuition of next-word prediction in GPT. The inside of the transformer is covered in phase A2.' },
    ]},
  ],
});
