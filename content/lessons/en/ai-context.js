Lesson.register({
  id: 'ai-context',
  title: 'Context window and context engineering',
  minutes: 32,
  summary: `xyz Assistant's long chats became expensive, slow and forgetful, and one day came the "prompt is too long" error. The model has only one "working memory": the context window. In this lesson we see what fills it, the price of filling it too much (cost, latency, lost-in-the-middle, context rot), and context engineering: select, compress, write (memory), isolate, compaction, and prompt caching.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `The model has a small <strong>desk</strong>. Before every answer, we put papers on that desk: rules, earlier messages, documents. The model can read only what is on the desk.<br>The desk has a fixed size. More paper = more money, more time, and the important paper gets lost in the pile. If something falls off the desk, it does not exist for the model.<br>In this lesson we learn: what to put on the desk, what to remove, what to write in a separate notebook (memory), and how to avoid paying again for papers that are the same every time (prompt caching).` },

    { type: 'h2', text: 'Problem: long chat, growing trouble' },
    { type: 'p', html: `In the <a href="#/ai-prompts">last lesson</a>, xyz Assistant's prompt got good: role, policy, examples, JSON output. Users were happy. Then some power users came who talk for hours in a single chat (video upload help, billing, settings, everything). Three new complaints:` },
    { type: 'list', items: [
      `<strong>Expensive</strong>: on the first message of a chat, a request was ~4,000 tokens. After 80 messages, every new message sends 40,000+ tokens. The bill is 10 times bigger.`,
      `<strong>Slow</strong>: the first word of the answer (TTFT) used to take 1 second, now it takes several seconds.`,
      `<strong>Forgetful</strong>: at the start the user had said "talk to me in Hindi, I am a Premium user". 60 messages later, the bot is explaining free-plan steps in English. And one day the API returned an error: <code>prompt is too long</code>.`,
    ]},
    { type: 'callout', tone: 'term', title: 'New word: Token (a reminder)', html: `<strong>What it is:</strong> a small piece of text that the model reads and writes. In English, roughly 1 token ≈ ¾ of a word; Hindi/Hinglish often needs more tokens (<a href="#/ai-tokenization">Tokenization</a> lesson).<br><strong>Why it matters here:</strong> the model's memory, the provider's bill and the speed are all measured in tokens.<br><strong>Example:</strong> 500 tokens ≈ the text of one short message and its answer.` },
    { type: 'callout', tone: 'term', title: 'New word: TTFT (time to first token)', html: `<strong>What it is:</strong> the time from sending the request until the <strong>first token</strong> of the answer arrives. For the user, this is the "bot is thinking..." wait.<br><strong>Why it matters:</strong> in a chat, 1 second feels normal; at 8 seconds the user thinks the app is stuck.<br><strong>Without it (if we do not measure it):</strong> we will never know why long chats feel slow.` },
    { type: 'p', html: `All three have the same root. We saw it in the last lesson: the API is stateless, so the app <strong>sends the whole history again in every request</strong>. The model has a fixed-size "desk" that can hold only so much at once. The question of this lesson: what do we put on that desk, what do we remove, and how?` },
    { type: 'callout', tone: 'term', title: 'New word: Context window', html: `<strong>What it is:</strong> the maximum number of <a href="#/ai-tokenization">tokens</a> a model can see in one request: the input (system prompt, history, documents, tool results) <strong>plus</strong> the output it will write. In today's models this is usually from a few thousand to hundreds of thousands of tokens (some models up to 1 million). This is the model's <em>only working memory</em>: whatever is not in the window does not exist for the model.<br><strong>Why there is a limit:</strong> every extra token needs GPU memory and compute (attention compares every token with every other token), so model makers set a maximum.<br><strong>Without it (if you do not understand the limit):</strong> as the chat grows you get a <code>prompt is too long</code> error, or old messages silently disappear.<br><strong>Example:</strong> a 128K window = 1,28,000 tokens ≈ the text of a thick book.` },
    { type: 'callout', tone: 'term', title: 'New word: Context', html: `<strong>What it is:</strong> all the tokens given to the model in this request. The prompt (last lesson) is one part of the context; the context also includes history, retrieved documents, tool definitions and tool results.<br><strong>Why a separate name:</strong> we write the prompt; the context is <em>assembled</em> on every request, and it changes every turn.<br><strong>Without it (if you ignore it):</strong> you focus only on the system prompt, and 90% of the tokens (history, docs) get filled in without any thought.` },

    { type: 'h2', text: 'What fills the context window?' },
    { type: 'callout', tone: 'term', title: 'New word: Tool definition and tool result', html: `<strong>What it is:</strong> a <strong>tool definition</strong> = a function's name, a description of what it does, and the JSON schema of its inputs, which we tell the model (like <code>get_order(order_id)</code>). A <strong>tool result</strong> = when the app runs that function, the data that comes back (like an order status JSON) also goes into the context.<br><strong>Why we need it:</strong> the model must know which actions it can ask for, and what their results were (<a href="#/ai-prompts">ReAct</a>).<br><strong>Without it:</strong> the model cannot bring live data.<br><strong>Cost:</strong> every tool definition goes in every request, whether it is used or not.` },
    { type: 'callout', tone: 'term', title: 'New word: Retrieved documents', html: `<strong>What it is:</strong> the small pieces of help docs that match this question, which the app finds by search and puts into the context (<a href="#/ai-rag">RAG</a> in the next lesson).<br><strong>Why we need it:</strong> the model does not know xyz.com's policy from its training; these pieces bring the correct facts.<br><strong>Without it:</strong> hallucination, or you would have to send all 400 docs.` },
    { type: 'table', head: ['Part', 'What it is', 'Typical size in xyz Assistant', 'Does it change?'], rows: [
      ['System prompt', 'Role, rules, policy, examples', '1,000-5,000 tokens', 'Same on every request'],
      ['Tool definitions', 'Each tool\'s name, description, JSON schema (<a href="#/ai-agents">agents</a>)', '200-500 tokens per tool', 'Mostly the same'],
      ['Conversation history', 'All old user + assistant messages', '~300-800 tokens per turn, keeps growing', 'Grows every turn'],
      ['Retrieved documents', 'Chunks of help docs (<a href="#/ai-rag">RAG</a>)', 'k chunks × 300-800 tokens', 'New for every question'],
      ['Tool results', 'Order status JSON, search results, logs', 'From a few tokens to thousands', 'New on every call'],
      ['Output (reserve)', 'What the model will write (<code>max_tokens</code>)', '500-4,000 tokens', 'Needs space in the window'],
    ], caption: 'The sizes are illustrative; count them with a tokenizer in your own app.' },
    { type: 'ascii', text: `|<───────────────────────── context window (e.g. 128K tokens) ─────────────────────────>|
[system][tools][ history: turn1 turn2 ... turn40 ][docs][tool results][ new msg ][ output ]
 stable  stable     gets longer every turn          new      new        new      reserve`, caption: 'Stable things in front, changing things at the back: this order matters for caching (we will see it later).' },
    { type: 'callout', tone: 'mistake', title: 'Common confusion: the output is separate from the window', html: `If the window is 128K and you filled 127K with input, the model can write only ~1K (or the API returns an error). <strong>Input + output are both in the same window</strong>. So reserve space for the output in advance. (Some APIs also have a separate maximum limit for output.)` },
    { type: 'p', html: `Build the context budget of your own xyz Assistant below. Each slider is one part; see how full the window is and how much the input of one request costs:` },
    { type: 'custom', render(el) {
      const WIN = [8000, 32000, 128000, 200000, 1000000];
      el.innerHTML = `<div class="row2">
          <div><label>Context window</label><select class="aic-win">${WIN.map(w => `<option value="${w}"${w === 128000 ? ' selected' : ''}>${w >= 1e6 ? '1M' : (w / 1000) + 'K'} tokens</option>`).join('')}</select></div>
          <div><label>System prompt: <strong class="aic-sv"></strong></label><input class="aic-s" type="range" min="0" max="10000" step="500" value="2000"></div>
          <div><label>Tools: <strong class="aic-tv"></strong> (×400 tokens)</label><input class="aic-t" type="range" min="0" max="40" step="1" value="10"></div>
          <div><label>History turns: <strong class="aic-hv"></strong> (×500 tokens)</label><input class="aic-h" type="range" min="0" max="300" step="5" value="40"></div>
          <div><label>Retrieved chunks: <strong class="aic-dv"></strong> (×600 tokens)</label><input class="aic-d" type="range" min="0" max="30" step="1" value="5"></div>
          <div><label>Output reserve: <strong class="aic-ov"></strong></label><input class="aic-o" type="range" min="0" max="16000" step="500" value="4000"></div>
        </div>
        <div class="aic-bar" style="display:flex;height:26px;border:1px solid var(--line-2);border-radius:var(--r-sm);overflow:hidden;margin:12px 0 6px;background:var(--surface-2)"></div>
        <div class="aic-leg" style="display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12.5px;color:var(--ink-2)"></div>
        <div class="stats">
          <div class="stat"><span>Total (input + reserve)</span><strong class="aic-tot"></strong></div>
          <div class="stat"><span>Window used</span><strong class="aic-pct"></strong></div>
          <div class="stat"><span>Input cost / request</span><strong class="aic-cost"></strong></div>
        </div>
        <div class="calc-note aic-note"></div>`;
      const PARTS = [['System', 'aic-s', 1, 'var(--accent)'], ['Tools', 'aic-t', 400, 'var(--violet)'], ['History', 'aic-h', 500, 'var(--amber)'], ['Docs', 'aic-d', 600, 'var(--green)'], ['Output', 'aic-o', 1, 'var(--ink-3)']];
      const fmt = n => n.toLocaleString('en-IN');
      const upd = () => {
        const win = Number(el.querySelector('.aic-win').value);
        const v = PARTS.map(p => Number(el.querySelector('.' + p[1]).value) * p[2]);
        el.querySelector('.aic-sv').textContent = fmt(v[0]);
        el.querySelector('.aic-tv').textContent = el.querySelector('.aic-t').value;
        el.querySelector('.aic-hv').textContent = el.querySelector('.aic-h').value;
        el.querySelector('.aic-dv').textContent = el.querySelector('.aic-d').value;
        el.querySelector('.aic-ov').textContent = fmt(v[4]);
        const tot = v.reduce((a, b) => a + b, 0), input = tot - v[4], pct = tot / win * 100;
        const scale = Math.max(tot, win);
        el.querySelector('.aic-bar').innerHTML = PARTS.map((p, i) => `<div title="${p[0]}" style="width:${(v[i] / scale * 100).toFixed(2)}%;background:${p[3]}"></div>`).join('') +
          (tot > win ? '' : `<div style="flex:1"></div>`);
        el.querySelector('.aic-leg').innerHTML = PARTS.map((p, i) => `<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${p[3]};margin-right:4px"></span>${p[0]} ${fmt(v[i])}</span>`).join('');
        el.querySelector('.aic-tot').textContent = fmt(tot);
        el.querySelector('.aic-pct').textContent = pct.toFixed(1) + '%';
        el.querySelector('.aic-cost').textContent = '$' + (input * 3 / 1e6).toFixed(4);
        const note = el.querySelector('.aic-note');
        if (tot > win) { note.textContent = `Overflow! ${fmt(tot - win)} tokens too many. The API will return a "prompt too long" error, or the app has to cut something. What will you cut? That is context engineering.`; note.style.color = 'var(--red)'; }
        else { note.textContent = `${fmt(win - tot)} tokens free. Input price assumed at $3 per million tokens (illustrative). History grows the fastest: +500 every turn.`; note.style.color = ''; }
      };
      el.querySelectorAll('input,select').forEach(i => i.addEventListener('input', upd));
      el.querySelector('.aic-win').addEventListener('change', upd);
      upd();
    }},
    { type: 'p', html: `With the default values (128K window, 2,000 system, 10 tools, 40 turns, 5 chunks, 4,000 reserve) the total is 33,000 tokens = 25.8% of the window, and the input costs $0.0870 per request. Now move history to 240 turns: total 1,33,000, so the 128K window overflows. Or set the window to 8K: even the default overflows.` },

    { type: 'h2', text: 'Bigger window = problem solved? No. Three prices' },
    { type: 'h3', text: '1) Cost: paying for the whole history on every turn' },
    { type: 'p', html: `The provider charges by input tokens, <em>on every request</em>. At turn 1 the history is 1 turn, at turn 50 it is 50 turns. So the total input of the whole conversation grows like <strong>the square of the number of turns</strong>:` },
    { type: 'code', text: `input of request i  = S + i × t          (S = system + tools, t = tokens per turn)
total for N turns   = N×S + t × N(N+1)/2

S = 3,000, t = 500:
  N = 10  →     57,500 tokens
  N = 50  →    787,500 tokens   (5× turns, ~13.7× tokens)
  N = 100 →  2,825,000 tokens   (10× turns, ~49× tokens)` },
    { type: 'h3', text: '2) Latency: the whole context must be read first' },
    { type: 'callout', tone: 'term', title: 'New word: Prefill (the step of reading the input)', html: `<strong>What it is:</strong> before writing the first word of the answer, the model processes the whole input once. This step is called <strong>prefill</strong>. Like reading the whole question in an exam before you start writing.<br><strong>Why it is needed:</strong> the model must "understand" the whole context before it can pick the next token.<br><strong>Without it (that is, if the input is small):</strong> prefill ends quickly, so the first token comes quickly.<br><strong>Example:</strong> the prefill for a 2,000-token input is much faster than for a 33,000-token input, so TTFT is lower.` },
    { type: 'p', html: `Before writing the answer, the model processes all the input tokens (prefill). The bigger the input, the later the first token (TTFT goes up). In attention, every token looks at every other token (<a href="#/ai-attention">self-attention</a>), so the work grows roughly with the square of the number of tokens. A long chat = the user sees "typing..." for longer.` },
    { type: 'h3', text: '3) Quality: lost in the middle and context rot' },
    { type: 'p', html: `The most surprising one. Fitting in the window does not mean the model will read it <em>well</em>.` },
    { type: 'callout', tone: 'term', title: 'New word: Lost in the middle', html: `<strong>What it is:</strong> the model uses things at the <strong>start</strong> and <strong>end</strong> of a long context well, but often misses things in the <strong>middle</strong>. Like a long class where you remember the first and last points, and the middle is blurry.<br><strong>Why it is important to know:</strong> "it is in the window" does not mean "the model used it".<br><strong>Without it (if you ignore it):</strong> an important fact stays buried in the middle and the bot forgets it.` },
    { type: 'callout', tone: 'term', title: 'New word: Context rot', html: `<strong>What it is:</strong> the longer the context, the more the model's accuracy drops, even if there is space left in the window. Like a desk: the more paper on it, the harder it is to find the right paper.<br><strong>Why it happens:</strong> the model's "focus" (attention) is spread over all the tokens; every new token eats a little focus.<br><strong>Without it (that is, if you keep the context small):</strong> the model's full focus stays on the useful things.` },
    { type: 'list', items: [
      `<strong>Lost in the middle</strong> (Liu et al., 2023, Stanford): in multi-document QA and key-value retrieval tests, the models' performance had a <strong>U-shape</strong>: good when the answer's information was at the start or end of the context, much worse when it was in the middle. Even in long-context models. This was on 2023 models; newer models have improved, but the idea is still useful: do not bury important things in the middle.`,
      `<strong>Context rot</strong>: research by Chroma in 2025 tested 18 models (including GPT-4.1, Claude 4, Gemini 2.5, Qwen3) and saw that performance drops as the input gets longer, and differently for each model. Anthropic (Sept 2025) calls this an "attention budget": like human working memory, every new token eats a little attention.`,
    ]},
    { type: 'p', html: `This was the reason for xyz's "forgetful" bot: "talk in Hindi, I am Premium" was in turn 2, and now it is buried under 60 turns of clutter.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion: "the window is 1M tokens, put everything in"', html: `The window is a <strong>limit</strong>, not a target. More tokens = more money, more latency, and often <em>lower</em> accuracy. The core idea of Anthropic's context engineering post: find the <strong>smallest set of high-signal tokens</strong> that gets the job done.` },

    { type: 'h2', text: 'Context engineering' },
    { type: 'callout', tone: 'term', title: 'New word: Context engineering', html: `<strong>What it is:</strong> designing and managing <strong>exactly what goes into the context window</strong> on every model call: system prompt, tools, examples, history, retrieved data, tool results, memory. Anthropic (Sept 2025) calls it the "natural next step" after prompt engineering: prompt engineering = writing good instructions; context engineering = curating the whole set of tokens at every step, especially in the long, multi-turn work of agents.<br><strong>Why we need it:</strong> all three prices above (cost, latency, quality) are decided by the size and correctness of the context.<br><strong>Without it:</strong> a "send everything" app: expensive, slow, forgetful, and one day an overflow.` },
    { type: 'compare',
      left: { title: 'Prompt engineering', html: `• The words and structure of one prompt<br>• Mostly written once, then tuned<br>• Question: "how should I say it?"<br>• xyz: system prompt, few-shot examples` },
      right: { title: 'Context engineering', html: `• The whole context on every call: what goes in, what stays out<br>• Decided again every turn (dynamic)<br>• Question: "what must the model see right now?"<br>• xyz: which history to keep, which docs, which tools, when to summarise` },
    },
    { type: 'p', html: `A 2025 LangChain post divided context engineering strategies into four buckets, and Anthropic's post has the same ideas. With xyz Assistant:` },
    { type: 'table', head: ['Strategy', 'Meaning', 'In xyz Assistant'], rows: [
      ['<strong>Write</strong> (write outside the context)', 'Save important things outside the window: scratchpad, notes file, memory', '"The user wants Hindi, is Premium" saved in a user-memory store. These 2 lines go on top in every chat.'],
      ['<strong>Select</strong> (bring the right things in)', 'Bring only relevant things: retrieval, the right tools, the right memories', 'Not all 400 help docs, only the top-5 relevant chunks (<a href="#/ai-rag">RAG</a>). Not 40 tools, only the 5 for this question.'],
      ['<strong>Compress</strong> (make it smaller)', 'Summarise, trim, remove old tool results', 'A 300-token summary instead of 60 old turns. Remove old order-status JSON.'],
      ['<strong>Isolate</strong> (separate it)', 'Split the work into separate contexts: sub-agents, sandbox, state object', 'Give "read the logs of 50 videos" to a sub-agent that reads them in its own window and brings back a 1,500-token summary.'],
    ]},

    { type: 'p', html: `Now all four, one by one, with small numbers. Say it is turn 61. The naive app's context (send everything): system 2,000 + 35 tools × 400 = 14,000 + 60 turns × 500 = 30,000 history + 20 full help docs × 1,500 = 30,000 + 50 video logs × 1,000 = 50,000 + new message 100 + output reserve 4,000.` },
    { type: 'callout', tone: 'term', title: 'Strategy 1: Write (write it outside)', html: `<strong>What it is:</strong> write important things in a store <em>outside</em> the window (memory DB, notes file), and put only a short summary of them on top in every request. Like keeping class notes in a separate notebook.<br><strong>Why we need it:</strong> the history will be cut or summarised, but these facts will never get lost.<br><strong>Without it:</strong> "talk in Hindi" was in turn 2; it got buried in the middle or cut off.<br><strong>Example:</strong> +100 tokens (<code>lang=Hindi, plan=Premium, ticket=#881</code>) and all three facts are always at the top of the context.<br><strong>Pros:</strong> cheap and reliable. <strong>Cons:</strong> you must build the logic for what to write and when to update/delete it; old memory can become wrong.` },
    { type: 'callout', tone: 'term', title: 'Strategy 2: Select (only the right things in)', html: `<strong>What it is:</strong> bring in only what is useful for this question: the right doc pieces, the right tools, the right memories.<br><strong>Why we need it:</strong> for a refund question, video-upload docs and analytics tools are just noise.<br><strong>Without it:</strong> 30,000 tokens of docs and 14,000 of tools, 90% of them useless.<br><strong>Example:</strong> docs 30,000 → 3 chunks × 600 = 1,800. Tools 35 → 5 (5 × 400 = 2,000).<br><strong>Pros:</strong> the biggest token cut, less confusion. <strong>Cons:</strong> if the search is wrong, the right doc never comes in; if the tool subset is wrong, the model lacks a needed tool.` },
    { type: 'callout', tone: 'term', title: 'Strategy 3: Compress (make it smaller)', html: `<strong>What it is:</strong> make long things short: summarise old history, remove old tool results, trim long outputs.<br><strong>Why we need it:</strong> history grows every turn; without compressing, one day the window will be full.<br><strong>Without it:</strong> at turn 300, 1,50,000 tokens of history: overflow.<br><strong>Example:</strong> 60 turns (30,000) → a 2,000 summary + the last 3 turns (1,500) = 3,500.<br><strong>Pros:</strong> the history size stays roughly fixed. <strong>Cons:</strong> a summary is lossy (a detail can drop) and needs an extra LLM call to make.` },
    { type: 'callout', tone: 'term', title: 'Strategy 4: Isolate (keep it separate)', html: `<strong>What it is:</strong> do the heavy work in a separate context: a <strong>sub-agent</strong> (another LLM call, with its own empty window) does the work and returns only a short result.<br><strong>Why we need it:</strong> reading 50 video logs is one task, but why should its clutter stay in the main chat's window?<br><strong>Without it:</strong> 50,000 tokens of logs in the main context, sent again on every later turn.<br><strong>Example:</strong> the sub-agent reads 50,000 tokens in its own window and gives the main agent a 1,500-token summary.<br><strong>Pros:</strong> a clean main context. <strong>Cons:</strong> extra calls (total tokens can be higher), and if the sub-agent leaves out something important, the main agent will not know.` },
    { type: 'p', html: `Turn all four on and off below. You will see the effect of each strategy: how many tokens were cut, and what happened to the user's three important facts (Hindi, Premium, ticket #881):` },
    { type: 'custom', render(el) {
      const WIN = 128000, P = 3 / 1e6, OUT = 4000, MSG = 100, SYS = 2000;
      const on = { write: false, select: false, compress: false, isolate: false };
      const NAMES = { write: 'Write', select: 'Select', compress: 'Compress', isolate: 'Isolate' };
      el.innerHTML = `<div class="aic3-ch" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="aic3-bar" style="display:flex;height:24px;border:1px solid var(--line-2);border-radius:var(--r-sm);overflow:hidden;margin:12px 0 6px;background:var(--surface-2)"></div>
        <div class="aic3-leg" style="display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12.5px;color:var(--ink-2)"></div>
        <div class="stats">
          <div class="stat"><span>Total (input + reserve)</span><strong class="aic3-tot"></strong></div>
          <div class="stat"><span>128K window used</span><strong class="aic3-pct"></strong></div>
          <div class="stat"><span>Input cost / request</span><strong class="aic3-cost"></strong></div>
        </div>
        <ul class="aic3-facts" style="margin:8px 0 0;padding-left:20px;font-size:14px"></ul>
        <div class="calc-note aic3-note"></div>`;
      const parts = () => [
        ['System', SYS, 'var(--accent)'],
        ['Memory', on.write ? 100 : 0, 'var(--red)'],
        ['Tools', on.select ? 5 * 400 : 35 * 400, 'var(--violet)'],
        ['History', on.compress ? 2000 + 3 * 500 : 60 * 500, 'var(--amber)'],
        ['Docs', on.select ? 3 * 600 : 20 * 1500, 'var(--green)'],
        ['Logs', on.isolate ? 1500 : 50 * 1000, 'var(--ink-2)'],
        ['Msg + output', MSG + OUT, 'var(--ink-3)'],
      ];
      const fmt = n => n.toLocaleString('en-IN');
      const draw = () => {
        const ch = el.querySelector('.aic3-ch'); ch.innerHTML = '';
        Object.keys(NAMES).forEach(k => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (on[k] ? ' on' : ''); b.textContent = (on[k] ? '✓ ' : '') + NAMES[k]; b.onclick = () => { on[k] = !on[k]; draw(); }; ch.appendChild(b); });
        const ps = parts(), tot = ps.reduce((a, p) => a + p[1], 0), scale = Math.max(tot, WIN), over = tot > WIN;
        el.querySelector('.aic3-bar').innerHTML = ps.map(p => `<div title="${p[0]}" style="width:${(p[1] / scale * 100).toFixed(2)}%;background:${p[2]}"></div>`).join('');
        el.querySelector('.aic3-leg').innerHTML = ps.map(p => `<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${p[2]};margin-right:4px"></span>${p[0]} ${fmt(p[1])}</span>`).join('');
        el.querySelector('.aic3-tot').textContent = fmt(tot);
        el.querySelector('.aic3-pct').textContent = (tot / WIN * 100).toFixed(1) + '%';
        el.querySelector('.aic3-cost').textContent = over ? 'error' : '$' + ((tot - OUT) * P).toFixed(4);
        let fact;
        if (over) fact = 'The request fails: the API says "prompt is too long". Nothing reached the model.';
        else if (on.write) fact = 'Pinned in memory, at the very top of the context: the model will surely see it ✓';
        else if (on.compress) fact = 'Depends only on the summary: if the summary dropped it, it is gone (risk) ⚠';
        else fact = 'In the full history at turn 2, buried inside 30,000 tokens: risk of lost in the middle ⚠';
        el.querySelector('.aic3-facts').innerHTML = ['Prefers Hindi', 'Premium plan', 'Ticket #881'].map(f => `<li><strong>${f}:</strong> ${fact}</li>`).join('');
        const note = el.querySelector('.aic3-note');
        note.textContent = over ? `Overflow: ${fmt(tot - WIN)} tokens too many. Turn on any strategy.` : `${fmt(WIN - tot)} tokens free. Price $3 per million input tokens (illustrative).`;
        note.style.color = over ? 'var(--red)' : '';
      };
      draw();
    }},
    { type: 'p', html: `All off: 1,30,100 tokens, 2,100 more than the 128K window: the request fails. Only Isolate on: 81,600 (63.7%), $0.2328. All four on: 15,000 tokens (11.7%), input $0.0330 per request, which is about 9 times fewer tokens than the naive app, with the facts pinned at the top. Notice: Compress alone puts the facts "at risk"; only with Write do they become safe.` },

    { type: 'h3', text: 'Anthropic\'s advice for each part' },
    { type: 'callout', tone: 'term', title: 'New word: Just-in-time retrieval', html: `<strong>What it is:</strong> instead of filling the context with everything in advance, give the model only "addresses" (file name, doc id, URL), and a tool it can use to fetch the content itself <em>when it needs it</em>.<br><strong>Why we need it:</strong> things that were never used never had to fill tokens.<br><strong>Without it:</strong> every request carries heavy "might be useful" data.<br><strong>Example:</strong> the context holds only <code>refunds.md, uploads.md, billing.md</code> (10 tokens); for a refund question the model asks for <code>read_doc("refunds.md")</code>.` },
    { type: 'list', items: [
      `<strong>System prompt at the "right altitude"</strong>: on one side, very detailed if-else rules (brittle, they break on every new case); on the other side, a vague "be helpful" (no guidance). Stay in the middle: clear guidelines, in sections (XML tags or Markdown headings). Minimal does not mean short; it means only what is needed.`,
      `<strong>Tools</strong>: few, clear, with no overlap. If even a human engineer cannot decide which tool to use, the model cannot either. Tool results should be token-efficient (not a whole 5,000-line log, only the relevant part).`,
      `<strong>Examples</strong>: not a long list of every edge case; a few diverse, "canonical" examples.`,
      `<strong>Just-in-time retrieval</strong>: do not load everything in advance. Keep light identifiers (file path, doc id, URL) and give the model a tool to fetch content when needed. Just as we do not memorise a whole library, we only know which book is where. Trade-off: searching at runtime is slower; so often it is <em>hybrid</em>: some things up front (like the user's memory), the rest on demand.`,
    ]},

    { type: 'h2', text: 'Memory: short-term and long-term' },
    { type: 'callout', tone: 'term', title: 'New word: Short-term memory', html: `<strong>What it is:</strong> the history of this chat that is in the context window right now. Like today's work written on a board: class ends, the board is wiped.<br><strong>Why we need it:</strong> to understand things like "3 days ago" or "that same video", the earlier turns are needed.<br><strong>Without it:</strong> every message stands alone; the bot will not even understand the previous line.` },
    { type: 'callout', tone: 'term', title: 'New word: Long-term memory', html: `<strong>What it is:</strong> things saved <em>outside</em> the window (database, file, vector store) that are useful the next day, in the next chat too. The app finds them when needed and puts them into the context.<br><strong>Why we need it:</strong> so the user does not have to say "I am Premium, I prefer Hindi" again in every new chat.<br><strong>Without it:</strong> every chat starts from zero.<br><strong>Example:</strong> an xyz memory row: <code>{user: 42, lang: "hi", plan: "premium", last_refund: "2026-09"}</code>.` },
    { type: 'p', html: `An LLM has no memory of its own (its weights are fixed after training). "Memory" is always built by the app, through the context:` },
    { type: 'table', head: ['', 'Short-term memory', 'Long-term memory'], rows: [
      ['What it is', 'The history of this chat that is in the context window', 'Stored outside the window: DB, file, vector store (a DB that searches by meaning, in <a href="#/ai-rag">RAG</a>)'],
      ['How long', 'Until this session ends (or until compaction)', 'Across sessions, for weeks'],
      ['How it reaches the model', 'Sent directly in every request', 'The app or a tool finds it when needed and puts it into the context'],
      ['xyz Assistant', 'Today\'s chat: "my video upload is failing..."', '"Prefers Hindi, Premium user, took a refund last month"'],
      ['Risk', 'Gets long, expensive, and rots', 'Wrong/outdated memory, privacy (show it to the user and let them delete it)'],
    ]},
    { type: 'p', html: `A popular pattern for agents is <strong>structured note-taking</strong> (the agent writing notes for itself during a long task): the agent writes its progress in a file like <code>NOTES.md</code> or a memory tool ("3/10 videos checked, 2 have an audio issue"), and after the context is reset it reads that file and continues. According to Anthropic's post, this helps agents stay on track even in tasks that take hours.` },

    { type: 'h2', text: 'Compaction: replace the old chat with a summary' },
    { type: 'callout', tone: 'term', title: 'New word: Compaction', html: `<strong>What it is:</strong> when the conversation gets close to the window limit, have the model <strong>summarise</strong> the old part, and start a new, smaller context from that summary. The summary keeps: the user's important facts, decisions, open tasks; the clutter (old tool outputs, repeated talk) goes out. Agents like Claude Code do this when the context starts to fill up.<br><strong>Why we need it:</strong> so a chat (or an agent's task) can run longer than the window, without losing important things.<br><strong>Without it:</strong> either an overflow error, or "blind truncation": cut the oldest turns without looking, and important facts go with them.<br><strong>Example:</strong> 60 turns = 30,000 tokens → a 2,000-token summary + the last 3 turns (1,500) = 3,500 tokens.` },
    { type: 'ascii', text: `Before (window 90% full):
[system][turn1 ... turn60: 30,000 tokens][new msg]

After compaction:
[system][summary: 2,000 tokens][turn58 turn59 turn60][new msg]
         └ "User: Hindi, Premium. Upload had failed (fix: browser update).
            Open task now: status of refund request #881."`, caption: 'Often the last few turns are kept as they are, and the rest becomes the summary.' },
    { type: 'list', items: [
      `<strong>Tool result clearing</strong> (removing old tool results): the lightest form of compaction. A tool result that came long ago and has already been used (like a 3,000-token order list JSON) is removed from the history or replaced with "[result removed]". Anthropic's API also has a context editing feature for this.`,
      `<strong>Deciding what to keep is hard</strong>: a too aggressive summary = a small but important detail is lost, which would have been needed 20 turns later. Anthropic's advice: first maximise recall (catch everything important), then slowly cut the extra.`,
    ]},
    { type: 'callout', tone: 'mistake', html: `Compaction is <strong>not free</strong> and <strong>not lossless</strong>. Making the summary needs an extra LLM call that reads the whole old history, and details get lost in the summary. So do not leave important facts (user preferences, IDs, decisions) to the summary alone: also write them in structured memory (the Write strategy).` },

    { type: 'h2', text: 'Run it: how the context for each request is built' },
    { type: 'p', html: `xyz Assistant v4 has a <strong>context builder</strong>: before every request it decides what goes into the window. Run the scenarios:` },
    { type: 'flow', height: 330, title: 'xyz Assistant v4: context builder',
      nodes: [
        { id: 'u', label: 'User', sub: 'turn 61', x: 90, y: 170, w: 120, kind: 'client', info: 'What it is: an xyz.com power user who has already sent 60+ messages in one chat. Their old messages (Hindi, Premium, ticket) are the real test of this design.' },
        { id: 'app', label: 'xyz App', sub: 'context builder', x: 300, y: 170, w: 160, kind: 'server', info: 'What it is: the part of our backend that assembles the context for every request: system prompt + user memory + history (or its summary) + relevant docs + the new message. It counts tokens and keeps them within budget. It also decides when to run compaction.' },
        { id: 'mem', label: 'User memory', sub: 'long-term', x: 300, y: 55, w: 150, kind: 'data', info: 'What it is: long-term memory outside the window (the Write strategy), a small DB. Short, structured facts: language, plan, open tickets. 2-3 lines on top in every chat.' },
        { id: 'docs', label: 'Help docs', sub: 'retrieval', x: 300, y: 285, w: 150, kind: 'data', info: 'What it is: the help center docs + search. We do not send all docs; only the top chunks for this question (the Select strategy). Details in the RAG lesson.' },
        { id: 'llm', label: 'LLM API', sub: 'window 128K', x: 560, y: 170, w: 140, kind: 'edge', info: 'What it is: the model company\'s API, with a 128K-token window. It knows only the context it was given. If the input is bigger than the window, it returns an error.' },
        { id: 'pc', label: 'Prompt cache', sub: 'provider side', x: 560, y: 55, w: 150, kind: 'cache', info: 'What it is: the prompt cache on the provider\'s side: the exact same prefix as the previous request (tools, system, old history) is not processed again. A cache read is cheap and fast. If even one character of the prefix changes, everything after that point is a miss.' },
      ],
      edges: [{ a: 'u', b: 'app' }, { a: 'app', b: 'mem' }, { a: 'app', b: 'docs' }, { a: 'app', b: 'llm' }, { a: 'llm', b: 'pc' }],
      scenarios: [
        { name: 'Right context', steps: [
          { title: 'New message', text: 'At turn 61 the user asks what happened to their refund.', go: 'u>app', msg: '"what happened to my refund?"' },
          { title: 'Read memory', text: 'The user\'s long-term facts arrive. They were said 60 turns ago, but they are safe in memory.', go: ['app>mem', 'res:mem>app'], msg: 'lang=Hindi, plan=Premium, open_ticket=#881 (refund)' },
          { title: 'Only relevant docs', text: 'The 3 refund chunks, not all 400 docs.', go: ['app>docs', 'res:docs>app'], msg: 'refunds.md#window, refunds.md#status, refunds.md#timeline' },
          { title: 'Small, focused context', text: 'System + memory + summary of the old chat + the last 3 turns + 3 chunks + the new message. ~9,000 tokens, not 60,000.', go: 'app>llm', msg: '[system 2K][memory 0.1K][summary 2K][last 3 turns 1.5K][docs 1.8K][msg 0.1K]' },
          { title: 'Prefix cache hit', text: 'Tools + system were the same as the last request: the provider read them from the cache. Cheap and fast.', go: ['llm>pc', 'res:pc>llm'], after: { pc: { state: 'hit', sub: 'HIT: 2K prefix' } } },
          { title: 'Answer in Hindi', text: 'The model remembers both the language and the ticket (because they were in the context).', go: ['res:llm>app', 'res:app>u'], msg: '(in Hindi) "Your refund #881 is approved, it will arrive in 5-7 days."' },
        ]},
        { name: 'Overflow', steps: [
          { title: 'Naive app: send everything', text: 'The old design: the whole history every time. Now there are 300 turns: 150,000 tokens, and the window is 128K.', go: ['u>app', 'app>llm'], set: { app: { sub: 'sent everything' } }, msg: 'input: 150,000 tokens' },
          { title: 'The API refused', text: 'Input bigger than the window: error.', go: 'bad:llm>app', after: { llm: { state: 'down', sub: 'too long' } }, msg: '400: prompt is too long' },
          { title: 'A quick hack: cut the oldest turns', text: 'The app removed turns 1-80. The request went through...', go: 'app>llm', set: { llm: { state: '', sub: 'window 128K' } } },
          { title: 'But it forgot', text: '"Talk in Hindi" was in turn 2. It got cut. The answer is in English, and ticket #881 is gone too. Blind truncation cuts important facts.', go: ['res:llm>app', 'res:app>u'], set: { u: { state: 'warn', sub: 'annoyed' } }, msg: '"Hi! Could you share your order number?"' },
        ]},
        { name: 'Compaction', steps: [
          { title: 'Budget alarm', text: 'The context builder counts: the history has reached 80% of the window.', focus: ['app'], set: { app: { state: 'warn', sub: '80% full' } } },
          { title: 'Get a summary', text: 'A separate LLM call: give the old history, ask for a summary (facts, decisions, open tasks).', go: ['app>llm', 'res:llm>app'], msg: 'Summarize turns 1-57. Keep: preferences, IDs, decisions, open tasks.' },
          { title: 'Facts in memory too', text: 'Important facts are also written to structured memory, so they survive even if the summary drops them.', go: 'app>mem', after: { app: { state: 'ok', sub: 'compacted' } }, msg: 'lang=Hindi, plan=Premium, open_ticket=#881' },
          { title: 'New small context', text: 'Instead of turns 1-57: a 2,000-token summary + the last 3 turns. The chat kept going, and the user did not even notice.', go: ['u>app', 'app>llm', 'res:llm>app', 'res:app>u'], msg: 'history: 30,000 → 3,500 tokens' },
        ]},
        { name: 'Cache miss (timestamp)', steps: [
          { title: 'A tiny mistake', text: 'Someone put the current time in the <em>first</em> line of the system prompt.', set: { app: { sub: 'time at top' } }, msg: 'system: "Current time: 14:03:27. You are xyz.com\'s..."' },
          { title: 'A miss on every request', text: 'Prompt caching needs an exact prefix match. The very first line changes every second, so the prefix never matches.', go: ['u>app', 'app>llm', 'llm>pc', 'bad:pc>llm'], after: { pc: { state: 'miss', sub: 'MISS (prefix changed)' } } },
          { title: 'Even more expensive', text: 'With caching on, a new cache write happens every time, which costs more than normal input (1.25× on Anthropic). Zero benefit, extra loss.', focus: ['pc'] },
          { title: 'Fix: changing things at the end', text: 'Move the time out of the system prompt and send it with the new user message. Now the prefix of tools + system + old history is the same every time: cache hit.', go: ['app>llm', 'llm>pc', 'res:pc>llm'], set: { app: { sub: 'time at end' } }, after: { pc: { state: 'hit', sub: 'HIT' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'KV cache and prompt caching: do not do the same work twice' },
    { type: 'p', html: `There are two different "caches" whose names are confusing:` },
    { type: 'callout', tone: 'term', title: 'New word: KV cache', html: `<strong>What it is:</strong> a cache <strong>inside one single request</strong>. When the model writes its output token by token, every new token needs the attention Keys and Values of all earlier tokens (<a href="#/ai-multihead">multi-head lesson</a>). Instead of computing them again every time, they are kept in GPU memory. This makes generation fast, but a long context = more GPU memory for the KV cache. This happens inside the provider; we do not control it directly.<br><strong>Why we need it:</strong> while writing a 500-token answer, recomputing the whole context for every token would be very slow.<br><strong>Without it:</strong> every new token would redo the work of all earlier tokens, and generation would be many times slower.` },
    { type: 'callout', tone: 'term', title: 'New word: Prefix', html: `<strong>What it is:</strong> the opening part of a text. The prefix of a prompt = all tokens from the start up to some point (like tools + system prompt + old history).<br><strong>Why it matters here:</strong> in a long chat, each new request has the same prefix as the previous request; only a new message is added at the end.<br><strong>Example:</strong> request 41 = [tools][system][turn 1-40][new msg]. Request 42 = [tools][system][turn 1-40][turn 41][new msg]. Up to the first 40 turns, both have the same prefix.` },
    { type: 'callout', tone: 'term', title: 'New word: Prompt caching', html: `<strong>What it is:</strong> a cache <strong>between requests</strong>. If the opening part (prefix) of this request is the same as the previous request, the provider keeps the processed state of that prefix (really the same KV cache) for a short time and reuses it. Input is cheaper and TTFT is lower. Condition: the prefix must be <strong>exactly</strong> the same.<br><strong>Why we need it:</strong> in a 60-turn chat, every request sends 30,000+ identical tokens again; reading them at full price every time is a waste.<br><strong>Without it:</strong> you will see it in the simulator below: the bill for 60 turns is $3.29, with caching $0.44.<br><strong>TTL (time to live):</strong> how long the cache stays alive. If the next request does not come within that time, the cache is deleted and the next request pays full price again.` },
    { type: 'table', head: ['', 'Anthropic (Claude API)', 'OpenAI'], rows: [
      ['How to turn it on', 'Add a <code>cache_control</code> breakpoint (max 4)', 'Automatic by default on supported models'],
      ['Minimum size', 'Depends on the model: 512 to 4,096 tokens', '1,024 tokens (newer models)'],
      ['How long', 'Default 5 min (refreshed on every hit), a 1-hour option', 'Depends on the model: a few minutes up to 30 min'],
      ['Price', 'Cache write 1.25× (1h: 2×), cache read 0.1× of base input on most models', 'Cached input is discounted (depends on the model)'],
      ['Order', '<code>tools → system → messages</code>; a change at any level breaks the cache for that level and after', 'Stable instructions and reference first'],
    ], caption: 'From the Oct 2026 docs. The numbers change with the model; check your model\'s page.' },
    { type: 'p', html: `The rule of thumb is the same for both: <strong>what never changes goes first</strong> (tools, system prompt, examples), then what changes slowly (history), and what changes every time goes at the very end (new message, current time, retrieved docs). The "Cache miss" scenario in the flow above was exactly this mistake.` },
    { type: 'p', html: `Now look at the numbers for the whole conversation. The simulator below shows the request size at every turn, and the effect of compaction and prompt caching:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Turns N: <strong class="aic2-nv"></strong></label><input class="aic2-n" type="range" min="1" max="150" step="1" value="60"></div>
          <div><label>Tokens per turn (user + assistant): <strong class="aic2-tv"></strong></label><input class="aic2-t" type="range" min="100" max="2000" step="100" value="500"></div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin:8px 0"><button type="button" class="chip aic2-comp">Compaction (at 20K → 2K summary)</button><button type="button" class="chip on aic2-cachebtn">Show caching in cost</button></div>
        <svg class="aic2-svg" viewBox="0 0 320 140" style="width:100%;max-width:520px;display:block"></svg>
        <div class="stats">
          <div class="stat"><span>Total input tokens (whole chat)</span><strong class="aic2-tot"></strong></div>
          <div class="stat"><span>Last request</span><strong class="aic2-last"></strong></div>
          <div class="stat"><span>Cost, without caching</span><strong class="aic2-cp"></strong></div>
          <div class="stat"><span>Cost, with caching</span><strong class="aic2-cc"></strong></div>
        </div>
        <div class="calc-note aic2-note"></div>`;
      const S = 3000, K = 20000, C = 2000, P = 3 / 1e6;
      let comp = false;
      const sim = (N, t) => {
        let h = 0, total = 0, prev = 0, costPlain = 0, costCache = 0, last = 0, nComp = 0; const reqs = [];
        for (let i = 1; i <= N; i++) {
          let reset = false;
          if (comp && h + t > K) { total += S + h; costPlain += (S + h) * P; costCache += (S + h) * 0.1 * P; h = C; nComp++; reset = true; }
          const req = S + h + t;
          total += req; reqs.push(req); last = req; costPlain += req * P;
          const cached = i === 1 ? 0 : (reset ? S : prev);
          costCache += cached * 0.1 * P + (req - cached) * 1.25 * P;
          prev = req; h += t;
        }
        return { total, last, nComp, costPlain, costCache, reqs };
      };
      const fmt = n => n.toLocaleString('en-IN');
      const cb = el.querySelector('.aic2-comp');
      cb.onclick = () => { comp = !comp; cb.classList.toggle('on', comp); upd(); };
      const ccb = el.querySelector('.aic2-cachebtn'); let showC = true;
      ccb.onclick = () => { showC = !showC; ccb.classList.toggle('on', showC); upd(); };
      const upd = () => {
        const N = Number(el.querySelector('.aic2-n').value), t = Number(el.querySelector('.aic2-t').value);
        el.querySelector('.aic2-nv').textContent = N; el.querySelector('.aic2-tv').textContent = t;
        const r = sim(N, t);
        const maxY = Math.max(...r.reqs, 1), W = 300, H = 110;
        const pts = r.reqs.map((y, i) => `${(10 + (N === 1 ? 0 : i / (N - 1)) * W).toFixed(1)},${(120 - y / maxY * H).toFixed(1)}`).join(' ');
        el.querySelector('.aic2-svg').innerHTML = `<line x1="10" y1="120" x2="310" y2="120" stroke="var(--line-2)"/><line x1="10" y1="10" x2="10" y2="120" stroke="var(--line-2)"/>` +
          `<polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2"/>` +
          `<text x="14" y="9" font-size="9" fill="var(--ink-3)">request size (max ${fmt(maxY)})</text><text x="310" y="134" font-size="9" fill="var(--ink-3)" text-anchor="end">turn →</text>`;
        el.querySelector('.aic2-tot').textContent = fmt(r.total);
        el.querySelector('.aic2-last').textContent = fmt(r.last);
        el.querySelector('.aic2-cp').textContent = '$' + r.costPlain.toFixed(2);
        el.querySelector('.aic2-cc').textContent = showC ? '$' + r.costCache.toFixed(2) : '–';
        el.querySelector('.aic2-note').textContent = `System + tools = ${fmt(S)} tokens. Input price $3 / million (illustrative); caching: write 1.25×, read 0.1×, assuming the chat continues within 5 min. Output tokens not counted.` +
          (comp ? ` Compaction ran ${r.nComp} times (each summary call that reads the old history is also counted in the total).` : ' The line goes straight up: the request gets bigger every turn.');
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd));
      upd();
    }},
    { type: 'p', html: `At the default (60 turns, 500 tokens/turn): total 10,95,000 input tokens, last request 33,000 tokens, cost $3.29 without caching vs $0.44 with caching. Turn compaction on: total 7,58,000, last request only 15,000, cost $2.27 / $0.35. At 100 turns the gap is even bigger: without compaction $8.48, with compaction $4.08. Caching saves money but does not save the window; compaction saves the window and the quality. The two work together.` },

    { type: 'h2', text: 'What to use when?' },
    { type: 'table', head: ['Problem', 'Technique', 'Strategy'], rows: [
      ['Chat is long, cost is rising', 'Prompt caching (stable prefix first) + compaction', 'Compress'],
      ['Bot forgets old preferences', 'Structured long-term memory, on top in every chat', 'Write + Select'],
      ['Sending all docs is expensive/slow', 'Retrieval: only the top chunks (RAG), just-in-time tools', 'Select'],
      ['Big tool outputs (logs, lists) eat the window', 'Tool result trimming/clearing, only relevant fields', 'Compress'],
      ['One big research-like task', 'Sub-agents, each with its own window, a summary back', 'Isolate'],
      ['Too many tools, the model picks the wrong one', 'Fewer, clearer tools; a tool subset per question', 'Select'],
    ]},
    { type: 'callout', tone: 'why', title: 'Decide', html: `On every call, ask: "at this step, <strong>what must the model see</strong>?" Default: stable things (tools, system, examples) first and cached; the user's lasting facts in memory; documents only through retrieval; compaction when the history reaches ~70-80% of the window. Put the full data in the window only when it is small and needed for every question (Anthropic's example: a knowledge base smaller than 200K tokens can be sent whole, with caching). Treat a big window as a <strong>safety margin</strong>, not a place to dump things.` },

    { type: 'h2', text: 'The whole picture' },
    { type: 'diagram', title: 'xyz Assistant: the whole context picture', height: 520,
      groups: [
        { label: 'User', x: 200, y: 16, w: 320, h: 104 },
        { label: 'xyz.com backend', x: 20, y: 150, w: 480, h: 352 },
        { label: 'Model provider', x: 520, y: 150, w: 184, h: 250 },
      ],
      nodes: [
        { id: 'u', label: 'User', sub: 'turn 61', x: 360, y: 68, w: 150, kind: 'client', info: 'What it is: an xyz.com power user in a long chat. Every new message is a new request; the API is stateless, so the context must be assembled every time.' },
        { id: 'app', label: 'Context builder', sub: 'xyz backend', x: 360, y: 210, w: 150, kind: 'server', info: 'What it is: the part of the backend that assembles the context of every request: system + memory + history (or summary) + top docs + the new message. It counts tokens, runs compaction at 80%, and keeps stable things in front so the cache hits.' },
        { id: 'hist', label: 'Chat history', sub: 'short-term', x: 110, y: 210, w: 150, kind: 'data', info: 'What it is: all the turns of this chat (short-term memory). It grows by ~500 tokens every turn. When it gets too long, compaction turns it into a summary + the last few turns.' },
        { id: 'mem', label: 'User memory', sub: 'long-term', x: 110, y: 340, w: 140, kind: 'data', info: 'What it is: a small DB outside the window (the Write strategy): language, plan, open tickets. ~100 tokens pinned on top in every request. Even if compaction drops something, these facts survive.' },
        { id: 'docs', label: 'Help docs', sub: 'top-3 chunks', x: 360, y: 340, w: 150, kind: 'data', info: 'What it is: the help center + search (the Select strategy). Out of 400 docs, only 3 pieces for this question (~1,800 tokens) go into the context. The full story is in the RAG lesson.' },
        { id: 'sub', label: 'Sub-agent', sub: 'own window', x: 110, y: 460, w: 140, kind: 'server', info: 'What it is: a separate LLM call with its own empty window (the Isolate strategy). It reads the 50 video logs (50,000 tokens) and gives the main context only a 1,500-token summary.' },
        { id: 'llm', label: 'LLM API', sub: 'window 128K', x: 620, y: 210, w: 150, kind: 'edge', info: 'What it is: the model company\'s API. Max 128K tokens per request (input + output). What is not in the context does not exist for the model. It also writes the summary for compaction.' },
        { id: 'pc', label: 'Prompt cache', sub: 'TTL ~5 min', x: 620, y: 340, w: 150, kind: 'cache', info: 'What it is: the provider\'s cache. If the request\'s prefix (tools + system + old history) is exactly the same as the last request, that part is read cheaper (read ~0.1×) and faster. Change one character and everything after that point is a miss.' },
      ],
      edges: [
        { a: 'u', b: 'app', n: 1, label: 'message' },
        { a: 'hist', b: 'app', label: 'history' },
        { a: 'mem', b: 'app', label: 'facts' },
        { a: 'docs', b: 'app', label: 'top chunks' },
        { a: 'sub', b: 'app', dashed: true, label: 'summary' },
        { a: 'app', b: 'llm', n: 2, label: 'context' },
        { a: 'llm', b: 'pc', label: 'prefix' },
      ],
      paths: [
        { name: 'Fill the window', text: 'A new message arrives. The context builder adds the system prompt, user memory (~100 tokens), history, and only the top-3 doc chunks; the heavy logs arrive as the sub-agent\'s summary. Total ~15,000 tokens, not 1,30,100. Then it goes to the LLM API.', go: ['u>app', 'mem>app', 'hist>app', 'docs>app', 'sub>app', 'app>llm'] },
        { name: 'Compact', text: 'The history reached ~80% of the window. The builder gives the old turns to the LLM and gets a summary (facts, IDs, decisions, open tasks), also writes the important facts to memory, and history = summary + the last 3 turns.', go: ['hist>app', 'app>llm', 'mem>app'] },
        { name: 'Cache hit', text: 'Tools + system + old history are the same as the last request (changing things like the time are at the end). The provider reads the prefix from the cache: cheaper and lower TTFT. If the prefix changes, it is a miss.', go: ['app>llm', 'llm>pc'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Context window = the model's only working memory: input and output together, in tokens. What is not in the window does not exist for the model.</li>
      <li>The context holds: system prompt, tool definitions, history, retrieved docs, tool results, the new message, the output reserve.</li>
      <li>Three prices of too much context: cost (the whole history on every request), latency (prefill, TTFT), quality (lost in the middle, context rot).</li>
      <li>Context engineering = the smallest, high-signal context on every call. Four strategies: Write (memory), Select (right docs/tools), Compress (summary, trim), Isolate (sub-agents).</li>
      <li>Compaction replaces old history with a summary; it is lossy, so also write IDs and preferences to memory.</li>
      <li>KV cache = inside one request; prompt caching = the same prefix between requests. Stable things first, changing things (time, new message) at the end.</li>
      <li>A big window is a limit and a safety margin, not a place to dump things.</li>
    </ul>` },

    { type: 'tradeoffs',
      gains: ['Fewer tokens = lower cost and lower latency (TTFT)', 'Focused context = better accuracy, less "forgetting"', 'Long chats and hours-long agent tasks can run beyond the window', 'Caching makes the input of a repeated prefix ~90% cheaper (Anthropic read 0.1×)'],
      costs: ['The context builder is a new component: token counting, rules, bugs', 'Compaction/summary is lossy and needs an extra LLM call', 'If retrieval is wrong, the model never gets the right information', 'Memory can become stale or wrong; take care of privacy and deletion', 'Caching needs discipline in prompt order; one wrong timestamp breaks everything'] },

    { type: 'think', questions: [
      { q: 'xyz Assistant has 35 tools (orders, videos, billing, account, analytics...). The model often picks the wrong tool, and every request has 14,000 tokens of tool definitions alone. What will you do?', a: 'The Select strategy: first route the question (billing/video/account) and send only that category\'s 4-6 tools. Merge overlapping tools and make descriptions clear. Keep tool definitions stable so they can be cached; but note that on Anthropic, changing tools invalidates the whole cache, so keep each category\'s tool set stable on its own.' },
      { q: 'After compaction, the user asks "which order ID did I give earlier?" and the bot cannot say. What went wrong, and what is the fix?', a: 'The summary dropped the ID (compaction is lossy). Fix: in the compaction prompt say explicitly "always keep IDs, numbers, user preferences, decisions"; and also write important entities (order IDs, ticket IDs) to structured memory that goes in every request. Recall first, precision later.' },
      { q: 'In the simulator, turning caching on made the cost 7 times lower, but the size of the "Last request" did not change. Why?', a: 'Caching saves only the repeated processing work and money; the tokens are still in the context window. The window limit, lost in the middle and context rot stay the same. To reduce size you need compaction/selection.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'The context window is 128K and the input is 126K. What is the problem?', options: ['No problem', 'Only ~2K of space is left for the output (input + output share one window)', 'The model will compress the input automatically'], answer: 1, explain: 'The window is for both input and output. Keep an output reserve.' },
      { q: 'What did "Lost in the middle" (2023) show?', options: ['Models use information in the middle best', 'Accuracy is good when the answer\'s information is at the start/end, bad when it is in the middle (U-shape)', 'A longer context always raises accuracy'], answer: 1, explain: 'U-shaped performance: information placed in the middle of the context is used less.' },
      { q: 'The first line of the system prompt has the current timestamp. What is the effect on prompt caching?', options: ['No effect', 'The prefix changes every time, so the cache misses every time (plus the extra cost of writes)', 'The cache becomes faster'], answer: 1, explain: 'Caching needs an exact prefix match. Keep changing things at the end.' },
      { q: 'An agent must read 200 log files to find a bug. Which strategy keeps the main context clean?', options: ['Put all the files in the main context', 'Isolate: a sub-agent reads them in its own window and returns a ~1-2K token summary', 'Write the files in caps'], answer: 1, explain: 'The sub-agent\'s context is separate; the main agent gets only the condensed result (Anthropic: often 1,000-2,000 tokens).' },
      { q: 'What is the difference between the KV cache and prompt caching?', options: ['Both are names for the same thing', 'The KV cache speeds up token generation inside one request; prompt caching saves the work of the same prefix between separate requests', 'Prompt caching does not happen on a GPU'], answer: 1, explain: 'KV cache = the K/V of earlier tokens during decoding. Prompt caching = keeping that prefix state for a few minutes for the next requests.' },
    ]},
    { type: 'sources', note: 'Docs read in Oct 2026; caching prices/minimums change with the model.', items: [
      { title: 'Effective context engineering for AI agents', publisher: 'Anthropic Engineering', official: true, year: 2025, url: 'https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents', used: 'Definition, context rot / attention budget, right altitude, tools, examples, just-in-time retrieval, compaction, note-taking, sub-agents, tool result clearing.' },
      { title: 'Context Engineering for Agents', publisher: 'LangChain blog', year: 2025, url: 'https://www.langchain.com/blog/context-engineering-for-agents', used: 'The Write / Select / Compress / Isolate framing.' },
      { title: 'Lost in the Middle: How Language Models Use Long Contexts (Liu et al.)', publisher: 'TACL / arXiv', year: 2023, url: 'https://arxiv.org/abs/2307.03172', used: 'U-shaped performance, multi-doc QA and key-value retrieval.' },
      { title: 'Context Rot: How Increasing Input Tokens Impacts LLM Performance', publisher: 'Chroma Research', year: 2025, url: 'https://research.trychroma.com/context-rot', used: 'Performance dropping with longer input across 18 models.' },
      { title: 'Prompt caching', publisher: 'Anthropic docs', official: true, year: 2026, url: 'https://platform.claude.com/docs/en/build-with-claude/prompt-caching', used: '5 min / 1 h TTL, 1.25× / 2× write, 0.1× read, minimum lengths, 4 breakpoints, tools → system → messages order, exact match.' },
      { title: 'Prompt caching', publisher: 'OpenAI docs', official: true, year: 2026, url: 'https://developers.openai.com/api/docs/guides/prompt-caching', used: 'Automatic caching, 1,024 token minimum, exact prefix, stable content first.' },
      { title: 'Contextual Retrieval', publisher: 'Anthropic Engineering', official: true, year: 2024, url: 'https://www.anthropic.com/engineering/contextual-retrieval', used: 'The advice to send a knowledge base smaller than 200K tokens whole in the prompt.' },
    ]},
  ],
});
