Lesson.register({
  id: 'ai-context',
  title: 'Context window aur context engineering',
  minutes: 32,
  summary: `xyz Assistant ke lambe chats mehnge, slow, aur bhulakkad ho gaye, aur ek din "prompt is too long" error. Model ki ek hi "working memory" hai: context window. Is lesson mein dekhenge usme kya kya bharta hai, zyada bharne ki keemat (cost, latency, lost-in-the-middle, context rot), aur context engineering: select, compress, write (memory), isolate, compaction, aur prompt caching.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Model ke paas ek chhoti si <strong>desk</strong> hai. Har baar jawab dene se pehle hum us desk pe kaagaz rakhte hain: rules, pichhli baatein, documents. Model sirf desk pe rakhi cheezein padh sakta hai.<br>Desk ka size fixed hai. Zyada kaagaz = zyada paisa, zyada time, aur zaroori kaagaz dhher mein kho jaata hai. Desk se bahar gira to model ke liye wo exist hi nahi karta.<br>Is lesson mein hum seekhenge: desk pe kya rakhein, kya hataayein, kya alag notebook (memory) mein likh lein, aur jo kaagaz har baar same hai use dobara padhne ka paisa kaise bachaayein (prompt caching).` },

    { type: 'h2', text: 'Problem: lambi chat, badhti dikkat' },
    { type: 'p', html: `<a href="#/ai-prompts">Pichhle lesson</a> mein xyz Assistant ka prompt achha ho gaya: role, policy, examples, JSON output. Users khush. Phir kuch power users aaye jo ek hi chat mein ghanton baat karte hain (video upload help, billing, settings, sab). Teen nayi shikayatein:` },
    { type: 'list', items: [
      `<strong>Mehnga</strong>: chat ke pehle message pe ek request ~4,000 tokens ki thi. 80 messages baad har naye message pe 40,000+ tokens ja rahe hain. Bill 10 guna.`,
      `<strong>Slow</strong>: jawab ka pehla word aane mein (TTFT) pehle 1 second lagta tha, ab kai seconds.`,
      `<strong>Bhulakkad</strong>: user ne shuru mein kaha tha "mujhse Hindi mein baat karo, main Premium user hoon". 60 messages baad bot English mein free-plan wale steps bata raha hai. Aur ek din API ne error de diya: <code>prompt is too long</code>.`,
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: Token (yaad dilaana)', html: `<strong>Ye kya hai:</strong> text ka chhota tukda jise model padhta aur likhta hai. English mein lagbhag 1 token ≈ ¾ word; Hindi/Hinglish mein aksar zyada tokens lagte hain (<a href="#/ai-tokenization">Tokenization</a> lesson).<br><strong>Yahan kyun zaroori:</strong> model ki memory, provider ka bill aur speed, teeno tokens mein naape jaate hain.<br><strong>Example:</strong> 500 tokens ≈ ek chhote message aur uske jawab jitna text.` },
    { type: 'callout', tone: 'term', title: 'Naya word: TTFT (time to first token)', html: `<strong>Ye kya hai:</strong> request bhejne se lekar jawab ka <strong>pehla token</strong> aane tak ka time. User ke liye yahi "bot soch raha hai..." wala intezaar hai.<br><strong>Kyun maayne rakhta hai:</strong> chat mein 1 second normal lagta hai, 8 second pe user ko lagta hai app atak gaya.<br><strong>Iske bina (agar ise na naapein):</strong> pata hi nahi chalega ki lambi chats slow kyun lag rahi hain.` },
    { type: 'p', html: `Teeno ki jad ek hi hai. Pichhle lesson mein dekha: API stateless hai, app <strong>har request mein poori history dobara bhejta hai</strong>. Model ke paas ek fixed size ka "desk" hai jis pe ek baar mein itna hi rakh sakte hain. Is lesson ka sawaal: us desk pe kya rakhein, kya hataayein, aur kaise?` },
    { type: 'callout', tone: 'term', title: 'Naya word: Context window', html: `<strong>Ye kya hai:</strong> maximum kitne <a href="#/ai-tokenization">tokens</a> model ek request mein dekh sakta hai: input (system prompt, history, documents, tool results) <strong>plus</strong> jo output woh likhega. Aaj ke models mein ye aam taur pe kuch hazaar se lekar lakhon tokens (kuch models 1 million tak) hai. Model ki ye <em>ek hi working memory</em> hai: jo window mein nahi, wo model ke liye exist hi nahi karta.<br><strong>Kyun limit hai:</strong> har extra token ke liye GPU memory aur compute chahiye (attention har token ko har doosre token se milata hai), to model banane wale ek maximum tay karte hain.<br><strong>Iske bina (agar limit na samjho):</strong> chat lambi hote hi <code>prompt is too long</code> error, ya chupchaap purani baatein gayab.<br><strong>Example:</strong> 128K window = 1,28,000 tokens ≈ ek moti kitaab jitna text.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Context', html: `<strong>Ye kya hai:</strong> woh saare tokens jo is request mein model ko diye gaye. Prompt (pichhla lesson) context ka ek hissa hai; context mein uske alawa history, retrieved documents, tool definitions aur tool results bhi aate hain.<br><strong>Kyun alag naam:</strong> prompt hum likhte hain; context har request pe <em>jod ke</em> banta hai, aur har turn pe badalta hai.<br><strong>Iske bina (agar ise ignore karo):</strong> sirf system prompt pe dhyaan, aur 90% tokens (history, docs) bina soche bhar jaate hain.` },

    { type: 'h2', text: 'Context window mein kya kya bharta hai?' },
    { type: 'callout', tone: 'term', title: 'Naya word: Tool definition aur tool result', html: `<strong>Ye kya hai:</strong> <strong>tool definition</strong> = ek function ka naam, kaam ka description aur uske inputs ka JSON schema, jo hum model ko batate hain (jaise <code>get_order(order_id)</code>). <strong>Tool result</strong> = jab app wo function chalata hai, to jo data wapas aata hai (jaise order ka status JSON), wo bhi context mein jaata hai.<br><strong>Kyun chahiye:</strong> model ko pata ho ki kaunse kaam wo maang sakta hai, aur unka result kya aaya (<a href="#/ai-prompts">ReAct</a>).<br><strong>Iske bina:</strong> model live data nahi la sakta.<br><strong>Keemat:</strong> har tool definition har request mein jaati hai, chahe use ho ya na ho.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Retrieved documents', html: `<strong>Ye kya hai:</strong> help docs ke woh chhote tukde jo is sawaal se milte-julte hain, jo app search karke context mein daalta hai (<a href="#/ai-rag">RAG</a> agle lesson mein).<br><strong>Kyun chahiye:</strong> model ko xyz.com ki policy training se nahi pata; sahi facts yahi laate hain.<br><strong>Iske bina:</strong> hallucination, ya phir saare 400 docs bhejne padte.` },
    { type: 'table', head: ['Hissa', 'Kya hai', 'xyz Assistant mein typical size', 'Badalta hai?'], rows: [
      ['System prompt', 'Role, rules, policy, examples', '1,000-5,000 tokens', 'Har request same'],
      ['Tool definitions', 'Har tool ka naam, description, JSON schema (<a href="#/ai-agents">agents</a>)', '200-500 tokens per tool', 'Mostly same'],
      ['Conversation history', 'Saare purane user + assistant messages', 'Har turn ~300-800 tokens, badhta hi jaata hai', 'Har turn badhta'],
      ['Retrieved documents', 'Help docs ke chunks (<a href="#/ai-rag">RAG</a>)', 'k chunks × 300-800 tokens', 'Har sawaal pe naye'],
      ['Tool results', 'Order status JSON, search results, logs', 'Kuch tokens se hazaaron tak', 'Har call pe naye'],
      ['Output (reserve)', 'Jo model likhega (<code>max_tokens</code>)', '500-4,000 tokens', 'Window mein jagah chahiye'],
    ], caption: 'Sizes illustrative hain; apne app mein tokenizer se gin ke dekho.' },
    { type: 'ascii', text: `|<───────────────────────── context window (e.g. 128K tokens) ─────────────────────────>|
[system][tools][ history: turn1 turn2 ... turn40 ][docs][tool results][ new msg ][ output ]
 stable  stable        har turn lamba hota          naye    naye        naya     reserve`, caption: 'Stable cheezein aage, badalne wali peeche: ye order caching ke liye zaroori hai (aage dekhenge).' },
    { type: 'callout', tone: 'mistake', title: 'Common confusion: output window se alag hai', html: `Agar window 128K hai aur tumne 127K input bhar diya, model sirf ~1K likh paayega (ya API error degi). <strong>Input + output dono ek hi window mein</strong>. Isliye output ke liye jagah pehle se reserve karo. (Kuch APIs mein output ki apni alag maximum limit bhi hoti hai.)` },
    { type: 'p', html: `Neeche apne xyz Assistant ka context budget banao. Har slider ek hissa hai; dekho window kitni bhari, aur ek request ka input kitne ka pada:` },
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
        if (tot > win) { note.textContent = `Overflow! ${fmt(tot - win)} tokens zyada. API "prompt too long" error degi, ya app ko kuch kaatna padega. Kya kaatoge? Yahi context engineering hai.`; note.style.color = 'var(--red)'; }
        else { note.textContent = `${fmt(win - tot)} tokens khaali. Input price $3 per million tokens maana hai (illustrative). History sabse tez badhta hai: har turn +500.`; note.style.color = ''; }
      };
      el.querySelectorAll('input,select').forEach(i => i.addEventListener('input', upd));
      el.querySelector('.aic-win').addEventListener('change', upd);
      upd();
    }},
    { type: 'p', html: `Default values pe (128K window, 2,000 system, 10 tools, 40 turns, 5 chunks, 4,000 reserve) total 33,000 tokens = 25.8% window, aur input ka kharcha $0.0870 per request. Ab history ko 240 turns pe le jao: total 1,33,000, yaani 128K window overflow. Ya window 8K karo: default hi overflow hai.` },

    { type: 'h2', text: 'Badi window = problem solved? Nahi. Teen keematein' },
    { type: 'h3', text: '1) Cost: har turn pe poori history ka paisa' },
    { type: 'p', html: `Provider input tokens ke hisaab se paisa leta hai, <em>har request pe</em>. Turn 1 pe history 1 turn ki, turn 50 pe 50 turns ki. To poori conversation ka total input <strong>turns ke square</strong> ki tarah badhta hai:` },
    { type: 'code', text: `request i ka input  = S + i × t          (S = system + tools, t = tokens per turn)
N turns ka total    = N×S + t × N(N+1)/2

S = 3,000, t = 500:
  N = 10  →     57,500 tokens
  N = 50  →    787,500 tokens   (5× turns, ~13.7× tokens)
  N = 100 →  2,825,000 tokens   (10× turns, ~49× tokens)` },
    { type: 'h3', text: '2) Latency: pehle poora context padhna padta hai' },
    { type: 'callout', tone: 'term', title: 'Naya word: Prefill (input padhne ka step)', html: `<strong>Ye kya hai:</strong> jawab ka pehla word likhne se pehle model poore input ko ek baar process karta hai. Is step ko <strong>prefill</strong> kehte hain. Jaise exam mein likhne se pehle poora sawaal padhna.<br><strong>Kyun zaroori:</strong> model ko pura context "samajhna" padta hai tabhi wo agla token chun sakta hai.<br><strong>Iske bina (yaani agar input chhota ho):</strong> prefill jaldi khatam, pehla token jaldi.<br><strong>Example:</strong> 2,000 token input ka prefill 33,000 token input se kaafi tez hota hai, isliye TTFT kam.` },
    { type: 'p', html: `Model jawab likhne se pehle saare input tokens process karta hai (prefill). Input jitna bada, pehla token utna late (TTFT badhta hai). Attention mein har token har doosre token ko dekhta hai (<a href="#/ai-attention">self-attention</a>), to kaam roughly tokens ke square ke saath badhta hai. Lambi chat = user ko "typing..." zyada der.` },
    { type: 'h3', text: '3) Quality: lost in the middle aur context rot' },
    { type: 'p', html: `Sabse surprising wala. Window mein fit hona ka matlab ye nahi ki model use <em>achhe se</em> padhega.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Lost in the middle', html: `<strong>Ye kya hai:</strong> model lambe context ke <strong>shuru</strong> aur <strong>end</strong> wali baatein achhe se use karta hai, lekin <strong>beech</strong> wali baatein aksar miss kar deta hai. Jaise ek lambi class mein pehli aur aakhri baat yaad rehti hai, beech ki dhundhli.<br><strong>Kyun jaanna zaroori:</strong> "window mein hai" ka matlab "model ne use kiya" nahi.<br><strong>Iske bina (agar ignore karo):</strong> zaroori fact beech mein daba rahega aur bot use bhool jaayega.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Context rot', html: `<strong>Ye kya hai:</strong> context jitna lamba, model ki accuracy utni girti jaati hai, chahe window mein jagah bachi ho. Jaise ek desk pe jitna zyada kaagaz, sahi kaagaz dhoondhna utna mushkil.<br><strong>Kyun hota hai:</strong> model ka "dhyaan" (attention) saare tokens mein bant-ta hai; har naya token thoda dhyaan khaata hai.<br><strong>Iske bina (yaani chhota context rakho to):</strong> model ka poora dhyaan kaam ki cheezon pe.` },
    { type: 'list', items: [
      `<strong>Lost in the middle</strong> (Liu et al., 2023, Stanford): multi-document QA aur key-value retrieval tests mein models ki performance <strong>U-shape</strong> mein thi: jawab wali info context ke shuru ya end mein ho to achha, beech mein ho to kaafi kharab. Long-context models mein bhi. 2023 ke models pe tha; naye models behtar hue hain, lekin idea abhi bhi kaam ka hai: zaroori cheez beech mein mat dabao.`,
      `<strong>Context rot</strong>: Chroma ki 2025 research ne 18 models test kiye (GPT-4.1, Claude 4, Gemini 2.5, Qwen3 samet) aur dekha ki input lamba hone pe performance girti hai, aur har model alag tarah se. Anthropic (Sept 2025) isse "attention budget" kehta hai: insaan ki working memory jaisa, har naya token thoda dhyaan khaata hai.`,
    ]},
    { type: 'p', html: `Yahi xyz ke "bhulakkad" bot ki wajah thi: "Hindi mein baat karo, main Premium hoon" turn 2 pe tha, ab 60 turns ke kachre ke beech dab gaya.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion: "1M token window hai, sab daal do"', html: `Window ek <strong>limit</strong> hai, target nahi. Zyada tokens = zyada paisa, zyada latency, aur aksar <em>kam</em> accuracy. Anthropic ke context engineering post ka core idea: sabse <strong>chhota set of high-signal tokens</strong> dhoondho jo kaam karwa de.` },

    { type: 'h2', text: 'Context engineering' },
    { type: 'callout', tone: 'term', title: 'Naya word: Context engineering', html: `<strong>Ye kya hai:</strong> har model call pe <strong>context window mein exactly kya jaayega</strong>, ise design aur manage karna: system prompt, tools, examples, history, retrieved data, tool results, memory. Anthropic (Sept 2025) isse prompt engineering ka "natural next step" kehta hai: prompt engineering = achhe instructions likhna; context engineering = har step pe poore token set ko curate karna, khaaskar agents ke lambe, multi-turn kaam mein.<br><strong>Kyun chahiye:</strong> upar ki teeno keematein (cost, latency, quality) context ke size aur sahi-pan se tay hoti hain.<br><strong>Iske bina:</strong> "sab bhej do" wala app: mehnga, slow, bhulakkad, aur ek din overflow.` },
    { type: 'compare',
      left: { title: 'Prompt engineering', html: `• Ek prompt ke words aur structure<br>• Mostly ek baar likha, phir tune kiya<br>• Sawaal: "kaise bolun?"<br>• xyz: system prompt, few-shot examples` },
      right: { title: 'Context engineering', html: `• Har call pe poora context: kya andar, kya bahar<br>• Har turn pe dobara decide (dynamic)<br>• Sawaal: "model ko abhi kya dikhna chahiye?"<br>• xyz: kaunsi history rakhein, kaunse docs, kaunse tools, kab summary` },
    },
    { type: 'p', html: `LangChain ki 2025 post ne context engineering ki strategies ko chaar buckets mein baanta, aur Anthropic ki post mein bhi yahi ideas hain. xyz Assistant ke saath:` },
    { type: 'table', head: ['Strategy', 'Matlab', 'xyz Assistant mein'], rows: [
      ['<strong>Write</strong> (context ke bahar likho)', 'Zaroori baatein window ke bahar save karo: scratchpad, notes file, memory', '"User Hindi chahta hai, Premium hai" ek user-memory store mein save. Har chat mein ye 2 lines upar.'],
      ['<strong>Select</strong> (sahi cheez andar lao)', 'Sirf relevant cheez laao: retrieval, sahi tools, sahi memories', 'Saare 400 help docs nahi, sirf top-5 relevant chunks (<a href="#/ai-rag">RAG</a>). 40 tools nahi, is sawaal ke 5.'],
      ['<strong>Compress</strong> (chhota karo)', 'Summarize, trim, purane tool results hatao', '60 purane turns ki jagah 300-token summary. Purane order-status JSON hata do.'],
      ['<strong>Isolate</strong> (alag karo)', 'Kaam ko alag contexts mein baanto: sub-agents, sandbox, state object', '"50 videos ke logs padho" ek sub-agent ko do jo apni window mein padhe aur 1,500 tokens ka summary laaye.'],
    ]},

    { type: 'p', html: `Ab chaaron ko ek ek karke, chhote numbers ke saath. Maan lo turn 61 hai. Naive app (sab kuch bhejo) ka context: system 2,000 + 35 tools × 400 = 14,000 + 60 turns × 500 = 30,000 history + 20 poore help docs × 1,500 = 30,000 + 50 video logs × 1,000 = 50,000 + naya message 100 + output reserve 4,000.` },
    { type: 'callout', tone: 'term', title: 'Strategy 1: Write (bahar likho)', html: `<strong>Ye kya hai:</strong> zaroori baatein window ke <em>bahar</em> ek store mein likh do (memory DB, notes file), aur har request mein sirf unka chhota sa saar upar daalo. Jaise class ke notes alag copy mein.<br><strong>Kyun chahiye:</strong> history kategi ya summary banegi, lekin ye facts kabhi nahi khoenge.<br><strong>Iske bina:</strong> "Hindi mein baat karo" turn 2 pe tha, wo beech mein daba ya kat gaya.<br><strong>Example:</strong> +100 tokens (<code>lang=Hindi, plan=Premium, ticket=#881</code>) aur teeno facts hamesha context ke upar.<br><strong>Fayda:</strong> sasta, pakka. <strong>Nuksaan:</strong> kya likhna hai, kab update/delete karna hai, ye logic banana padta hai; purani memory galat ho sakti hai.` },
    { type: 'callout', tone: 'term', title: 'Strategy 2: Select (sirf sahi cheez andar)', html: `<strong>Ye kya hai:</strong> jo is sawaal ke liye kaam ka hai, sirf wahi andar laao: sahi docs ke tukde, sahi tools, sahi memories.<br><strong>Kyun chahiye:</strong> refund ke sawaal pe video-upload ke docs aur analytics ke tools sirf shor hain.<br><strong>Iske bina:</strong> 30,000 tokens ke docs aur 14,000 ke tools, jinme 90% bekaar.<br><strong>Example:</strong> docs 30,000 → 3 chunks × 600 = 1,800. Tools 35 → 5 (5 × 400 = 2,000).<br><strong>Fayda:</strong> sabse bada token cut, kam confusion. <strong>Nuksaan:</strong> search galat hua to sahi doc andar aaya hi nahi; tool subset galat to model ke paas zaroori tool nahi.` },
    { type: 'callout', tone: 'term', title: 'Strategy 3: Compress (chhota karo)', html: `<strong>Ye kya hai:</strong> lambi cheez ko chhota karo: purani history ki summary, purane tool results hatao, lambe outputs trim karo.<br><strong>Kyun chahiye:</strong> history har turn badhti hai; bina compress kiye ek din window bharegi.<br><strong>Iske bina:</strong> turn 300 pe 1,50,000 tokens ki history: overflow.<br><strong>Example:</strong> 60 turns (30,000) → 2,000 ki summary + aakhri 3 turns (1,500) = 3,500.<br><strong>Fayda:</strong> history ka size lagbhag fixed. <strong>Nuksaan:</strong> summary lossy hai (koi detail gir sakti hai) aur summary banane ki extra LLM call.` },
    { type: 'callout', tone: 'term', title: 'Strategy 4: Isolate (alag karo)', html: `<strong>Ye kya hai:</strong> bhaari kaam ko ek alag context mein karwao: ek <strong>sub-agent</strong> (doosri LLM call, apni khud ki khaali window ke saath) wo kaam kare aur sirf chhota result wapas de.<br><strong>Kyun chahiye:</strong> 50 video logs padhna ek kaam hai, lekin unka kachra main chat ki window mein kyun rahe?<br><strong>Iske bina:</strong> 50,000 tokens ke logs main context mein, har agle turn pe dobara bheje jaate.<br><strong>Example:</strong> sub-agent apni window mein 50,000 padhta hai, main agent ko 1,500 token ka summary deta hai.<br><strong>Fayda:</strong> main context saaf. <strong>Nuksaan:</strong> extra calls (kul tokens zyada ho sakte hain), aur sub-agent ne kuch zaroori chhoda to main agent ko pata nahi chalega.` },
    { type: 'p', html: `Neeche chaaron ko on/off karo. Har strategy ka apna asar dikhega: kitne tokens kate, aur user ke teen zaroori facts (Hindi, Premium, ticket #881) ka kya hua:` },
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
        if (over) fact = 'Request hi fail: API "prompt is too long". Kuch bhi model tak nahi gaya.';
        else if (on.write) fact = 'Memory mein pinned, context ke sabse upar: model ko pakka dikhega ✓';
        else if (on.compress) fact = 'Sirf summary ke bharose: summary ne chhod diya to gayab (risk) ⚠';
        else fact = 'Poori history mein turn 2 pe, 30,000 tokens ke beech daba: lost in the middle ka risk ⚠';
        el.querySelector('.aic3-facts').innerHTML = ['Hindi pasand', 'Premium plan', 'Ticket #881'].map(f => `<li><strong>${f}:</strong> ${fact}</li>`).join('');
        const note = el.querySelector('.aic3-note');
        note.textContent = over ? `Overflow: ${fmt(tot - WIN)} tokens zyada. Koi bhi strategy on karo.` : `${fmt(WIN - tot)} tokens khaali. Price $3 per million input tokens (illustrative).`;
        note.style.color = over ? 'var(--red)' : '';
      };
      draw();
    }},
    { type: 'p', html: `Sab off: 1,30,100 tokens, 128K window se 2,100 zyada: request fail. Sirf Isolate on: 81,600 (63.7%), $0.2328. Saare chaar on: 15,000 tokens (11.7%), input $0.0330 per request, yaani naive se lagbhag 9 guna kam tokens, aur facts upar pinned. Dhyaan do: Compress akela facts ko "risk" mein daal deta hai; Write ke saath hi wo pakke hote hain.` },

    { type: 'h3', text: 'Har hisse ke liye Anthropic ki salah' },
    { type: 'callout', tone: 'term', title: 'Naya word: Just-in-time retrieval', html: `<strong>Ye kya hai:</strong> sab kuch pehle se context mein bharne ki jagah, model ko sirf "pate" (file ka naam, doc id, URL) do, aur ek tool do jisse wo <em>zaroorat padne pe</em> content khud mangwa le.<br><strong>Kyun chahiye:</strong> jo kabhi kaam nahi aaya, uske tokens kabhi bharne hi nahi pade.<br><strong>Iske bina:</strong> har request mein "shayad kaam aaye" wala bhaari data.<br><strong>Example:</strong> context mein sirf <code>refunds.md, uploads.md, billing.md</code> (10 tokens); model refund sawaal pe <code>read_doc("refunds.md")</code> maangta hai.` },
    { type: 'list', items: [
      `<strong>System prompt, "right altitude" pe</strong>: ek taraf bahut detailed if-else rules (brittle, har naye case pe tootenge), doosri taraf vague "helpful raho" (koi guidance nahi). Beech mein raho: saaf heuristics, sections mein (XML tags ya Markdown headings). Minimal ka matlab chhota nahi; matlab jo zaroori hai, utna hi.`,
      `<strong>Tools</strong>: kam, saaf, overlap ke bina. Agar ek insaan engineer bhi decide na kar paaye ki kaunsa tool lagega, model bhi nahi kar paayega. Tool results token-efficient hon (poora 5,000-line log nahi, relevant hissa).`,
      `<strong>Examples</strong>: har edge case ki lambi list nahi; kuch diverse, "canonical" examples.`,
      `<strong>Just-in-time retrieval</strong>: sab kuch pehle se load mat karo. Halke identifiers rakho (file path, doc id, URL) aur model ko tool do jisse zaroorat pe content laaye. Jaise hum poori library yaad nahi rakhte, bas pata hai kaunsi kitaab kahan hai. Trade-off: runtime pe dhoondhna slow hai; isliye aksar <em>hybrid</em>: kuch cheezein upfront (jaise user ki memory), baaki on demand.`,
    ]},

    { type: 'h2', text: 'Memory: short-term aur long-term' },
    { type: 'callout', tone: 'term', title: 'Naya word: Short-term memory', html: `<strong>Ye kya hai:</strong> is chat ki history jo abhi context window mein hai. Jaise board pe likha aaj ka kaam: class khatam, board saaf.<br><strong>Kyun chahiye:</strong> "3 din pehle" ya "wahi video" jaisi baatein samajhne ke liye pichhle turns chahiye.<br><strong>Iske bina:</strong> har message akela, bot pichhli line bhi nahi samjhega.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Long-term memory', html: `<strong>Ye kya hai:</strong> window ke <em>bahar</em> save ki gayi baatein (database, file, vector store) jo agle din, agli chat mein bhi kaam aayein. App unhe zaroorat pe dhoondh ke context mein daalta hai.<br><strong>Kyun chahiye:</strong> user ko har nayi chat mein "main Premium hoon, Hindi pasand hai" dobara na bolna pade.<br><strong>Iske bina:</strong> har chat zero se shuru.<br><strong>Example:</strong> xyz memory row: <code>{user: 42, lang: "hi", plan: "premium", last_refund: "2026-09"}</code>.` },
    { type: 'p', html: `LLM ki apni koi memory nahi hoti (weights training ke baad fixed hain). "Memory" humesha app banata hai, context ke through:` },
    { type: 'table', head: ['', 'Short-term memory', 'Long-term memory'], rows: [
      ['Kya hai', 'Is chat ki history jo context window mein hai', 'Window ke bahar store: DB, file, vector store (meaning se dhoondhne wala DB, <a href="#/ai-rag">RAG</a> mein)'],
      ['Kitni der', 'Is session tak (ya compaction tak)', 'Sessions ke paar, hafton tak'],
      ['Kaise model tak', 'Har request mein seedha bheji jaati hai', 'App ya tool zaroorat pe dhoondh ke context mein daalta hai'],
      ['xyz Assistant', 'Aaj ki chat: "video upload fail ho raha hai..."', '"Hindi pasand, Premium user, pichhle mahine refund liya tha"'],
      ['Khatra', 'Lambi hoke mehngi aur rot', 'Galat/purani memory, privacy (user ko dikhao aur delete karne do)'],
    ]},
    { type: 'p', html: `Agents ke liye ek popular pattern <strong>structured note-taking</strong> hai (lambe kaam ke dauraan agent ka khud ke liye notes likhna): agent khud ek <code>NOTES.md</code> jaisi file ya memory tool mein progress likhta hai ("3/10 videos check ho gaye, 2 mein audio issue"), aur context reset hone ke baad wahi file padh ke aage badhta hai. Anthropic ki post ke mutabik isse agents ghanton lambe kaam mein bhi track nahi khote.` },

    { type: 'h2', text: 'Compaction: purani chat ko summary se badlo' },
    { type: 'callout', tone: 'term', title: 'Naya word: Compaction', html: `<strong>Ye kya hai:</strong> jab conversation window ki limit ke paas pahunche, purane hisse ko model se <strong>summarize</strong> karwao aur us summary se naya, chhota context shuru karo. Summary mein: user ke important facts, decisions, khule kaam; kachra (purane tool outputs, dohraayi baatein) bahar. Claude Code jaise agents yahi karte hain jab context bharne lagta hai.<br><strong>Kyun chahiye:</strong> chat (ya agent ka kaam) window se lamba chal sake, bina zaroori baatein khoye.<br><strong>Iske bina:</strong> ya to overflow error, ya "blind truncation": sabse purane turns bina dekhe kaat do, aur unke saath zaroori facts bhi.<br><strong>Example:</strong> 60 turns = 30,000 tokens → 2,000 token summary + aakhri 3 turns (1,500) = 3,500 tokens.` },
    { type: 'ascii', text: `Pehle (window 90% bhari):
[system][turn1 ... turn60: 30,000 tokens][new msg]

Compaction ke baad:
[system][summary: 2,000 tokens][turn58 turn59 turn60][new msg]
         └ "User: Hindi, Premium. Upload fail tha (fix: browser update).
            Abhi khula kaam: refund request #881 ka status."`, caption: 'Aksar aakhri kuch turns jaise ke taise rakhte hain, baaki summary.' },
    { type: 'list', items: [
      `<strong>Tool result clearing</strong> (purane tool results hata dena): compaction ka sabse halka roop. Jo tool result kaafi pehle aaya aur use ho chuka (jaise 3,000 token ka order list JSON), use history se hata do ya "[result hataaya gaya]" likh do. Anthropic ki API mein iske liye context editing feature bhi hai.`,
      `<strong>Kya rakhna hai, ye mushkil hai</strong>: zyada aggressive summary = koi chhoti si lekin zaroori baat gayab, jo 20 turns baad kaam aati. Anthropic ki salah: pehle recall maximize karo (sab zaroori pakdo), phir dheere dheere faltu kaato.`,
    ]},
    { type: 'callout', tone: 'mistake', html: `Compaction <strong>free nahi</strong> aur <strong>lossless nahi</strong>. Summary banane ke liye ek extra LLM call lagti hai jo poori purani history padhti hai, aur summary mein details khoti hain. Isliye important facts (user preferences, IDs, decisions) ko summary ke bharose mat chhodo: unhe structured memory mein bhi likho (Write strategy).` },

    { type: 'h2', text: 'Chala ke dekho: har request ka context kaise banta hai' },
    { type: 'p', html: `xyz Assistant v4 mein ek <strong>context builder</strong> hai: har request se pehle decide karta hai ki window mein kya jaayega. Scenarios chalao:` },
    { type: 'flow', height: 330, title: 'xyz Assistant v4: context builder',
      nodes: [
        { id: 'u', label: 'User', sub: 'turn 61', x: 90, y: 170, w: 120, kind: 'client', info: 'Ye kya hai: xyz.com ka power user jo ek hi chat mein 60+ messages kar chuka hai. Uski purani baatein (Hindi, Premium, ticket) is design ki asli pareeksha hain.' },
        { id: 'app', label: 'xyz App', sub: 'context builder', x: 300, y: 170, w: 160, kind: 'server', info: 'Ye kya hai: humare backend ka woh hissa jo har request ke liye context jodta hai: system prompt + user memory + history (ya uski summary) + relevant docs + naya message. Token count karta hai aur budget ke andar rakhta hai. Compaction kab karni hai, ye bhi yahi decide karta hai.' },
        { id: 'mem', label: 'User memory', sub: 'long-term', x: 300, y: 55, w: 150, kind: 'data', info: 'Ye kya hai: window ke bahar ki long-term memory (Write strategy), ek chhota DB. Chhote, structured facts: language, plan, khule tickets. Har chat mein upar 2-3 lines.' },
        { id: 'docs', label: 'Help docs', sub: 'retrieval', x: 300, y: 285, w: 150, kind: 'data', info: 'Ye kya hai: help center ke docs + search. Saare docs nahi bhejte; sirf is sawaal ke top chunks (Select strategy). Details RAG lesson mein.' },
        { id: 'llm', label: 'LLM API', sub: 'window 128K', x: 560, y: 170, w: 140, kind: 'edge', info: 'Ye kya hai: model company ka API, 128K token window ke saath. Jo context mila, sirf wahi jaanta hai. Window se bada input aaye to error.' },
        { id: 'pc', label: 'Prompt cache', sub: 'provider side', x: 560, y: 55, w: 150, kind: 'cache', info: 'Ye kya hai: provider ki taraf ka prompt cache: pichhli request ka exact same prefix (tools, system, purani history) dobara process nahi hota. Cache read sasta aur tez. Prefix mein ek character bhi badla to us point se aage miss.' },
      ],
      edges: [{ a: 'u', b: 'app' }, { a: 'app', b: 'mem' }, { a: 'app', b: 'docs' }, { a: 'app', b: 'llm' }, { a: 'llm', b: 'pc' }],
      scenarios: [
        { name: 'Sahi context', steps: [
          { title: 'Naya message', text: 'Turn 61 pe user poochta hai refund ka kya hua.', go: 'u>app', msg: '"refund ka kya hua?"' },
          { title: 'Memory padho', text: 'User ke long-term facts aaye. Ye 60 turns pehle bataaye gaye the, lekin memory mein safe hain.', go: ['app>mem', 'res:mem>app'], msg: 'lang=Hindi, plan=Premium, open_ticket=#881 (refund)' },
          { title: 'Sirf relevant docs', text: 'Refund wale 3 chunks, saare 400 docs nahi.', go: ['app>docs', 'res:docs>app'], msg: 'refunds.md#window, refunds.md#status, refunds.md#timeline' },
          { title: 'Chhota, focused context', text: 'System + memory + purani chat ki summary + aakhri 3 turns + 3 chunks + naya message. ~9,000 tokens, 60,000 nahi.', go: 'app>llm', msg: '[system 2K][memory 0.1K][summary 2K][last 3 turns 1.5K][docs 1.8K][msg 0.1K]' },
          { title: 'Prefix cache hit', text: 'Tools + system pichhli request jaise hi the: provider ne cache se padha. Sasta aur tez.', go: ['llm>pc', 'res:pc>llm'], after: { pc: { state: 'hit', sub: 'HIT: 2K prefix' } } },
          { title: 'Jawab Hindi mein', text: 'Model ko language aur ticket dono yaad (kyunki context mein the).', go: ['res:llm>app', 'res:app>u'], msg: '"Aapka refund #881 approve ho gaya hai, 5-7 din mein aayega."' },
        ]},
        { name: 'Overflow', steps: [
          { title: 'Naive app: sab bhejo', text: 'Purana design: poori history har baar. Ab 300 turns ho gaye: 150,000 tokens, window 128K.', go: ['u>app', 'app>llm'], set: { app: { sub: 'sab bhej diya' } }, msg: 'input: 150,000 tokens' },
          { title: 'API ne mana kiya', text: 'Window se bada input: error.', go: 'bad:llm>app', after: { llm: { state: 'down', sub: 'too long' } }, msg: '400: prompt is too long' },
          { title: 'Jugaad: sabse purane turns kaat do', text: 'App ne turn 1-80 hata diye. Request chal gayi...', go: 'app>llm', set: { llm: { state: '', sub: 'window 128K' } } },
          { title: 'Lekin bhool gaya', text: '"Hindi mein baat karo" turn 2 pe tha. Wo kat gaya. Jawab English mein, aur ticket #881 bhi gayab. Blind truncation zaroori facts kaat deta hai.', go: ['res:llm>app', 'res:app>u'], set: { u: { state: 'warn', sub: 'naraaz' } }, msg: '"Hi! Could you share your order number?"' },
        ]},
        { name: 'Compaction', steps: [
          { title: 'Budget alarm', text: 'Context builder ginta hai: history window ke 80% pe pahunch gayi.', focus: ['app'], set: { app: { state: 'warn', sub: '80% full' } } },
          { title: 'Summary banwao', text: 'Ek alag LLM call: purani history do, summary maango (facts, decisions, khule kaam).', go: ['app>llm', 'res:llm>app'], msg: 'Summarize turns 1-57. Keep: preferences, IDs, decisions, open tasks.' },
          { title: 'Facts memory mein bhi', text: 'Important facts structured memory mein bhi likhe, taaki summary se chhoot jaayein to bhi bachein.', go: 'app>mem', after: { app: { state: 'ok', sub: 'compacted' } }, msg: 'lang=Hindi, plan=Premium, open_ticket=#881' },
          { title: 'Naya chhota context', text: 'Turn 1-57 ki jagah 2,000 token summary + aakhri 3 turns. Chat chalti rahi, user ko pata bhi nahi chala.', go: ['u>app', 'app>llm', 'res:llm>app', 'res:app>u'], msg: 'history: 30,000 → 3,500 tokens' },
        ]},
        { name: 'Cache miss (timestamp)', steps: [
          { title: 'Chhoti si galti', text: 'Kisi ne system prompt ki <em>pehli</em> line mein current time daal diya.', set: { app: { sub: 'time at top' } }, msg: 'system: "Current time: 14:03:27. Tum xyz.com ke..."' },
          { title: 'Har request pe miss', text: 'Prompt caching exact prefix match maangta hai. Pehli line hi har second badalti hai, to poora prefix kabhi match nahi hota.', go: ['u>app', 'app>llm', 'llm>pc', 'bad:pc>llm'], after: { pc: { state: 'miss', sub: 'MISS (prefix badla)' } } },
          { title: 'Ulta mehnga', text: 'Caching on hai to har baar naya cache write hota hai, jo normal input se mehnga hai (Anthropic pe 1.25×). Fayda zero, nuksaan extra.', focus: ['pc'] },
          { title: 'Fix: badalne wali cheez end mein', text: 'Time ko system prompt se hata ke naye user message ke saath bhejo. Ab tools + system + purani history ka prefix har baar same: cache hit.', go: ['app>llm', 'llm>pc', 'res:pc>llm'], set: { app: { sub: 'time at end' } }, after: { pc: { state: 'hit', sub: 'HIT' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'KV cache aur prompt caching: same kaam dobara mat karo' },
    { type: 'p', html: `Do alag "cache" hain jinke naam confuse karte hain:` },
    { type: 'callout', tone: 'term', title: 'Naya word: KV cache', html: `<strong>Ye kya hai:</strong> <strong>ek hi request ke andar</strong> ka cache. Model jab token-by-token output likhta hai, har naye token ke liye pichhle saare tokens ke attention Keys aur Values chahiye (<a href="#/ai-multihead">multi-head lesson</a>). Unhe har baar dobara compute karne ki jagah GPU memory mein rakh lete hain. Isse generation fast hoti hai, lekin lamba context = KV cache ki zyada GPU memory. Ye provider ke andar hota hai; hum use directly control nahi karte.<br><strong>Kyun chahiye:</strong> 500 token ka jawab likhte waqt har token pe poora context dobara compute karna bahut slow hota.<br><strong>Iske bina:</strong> har naya token pichhle saare tokens ka kaam dobara karta, generation kai guna slow.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Prefix', html: `<strong>Ye kya hai:</strong> kisi text ka shuruaati hissa. Prompt ka prefix = shuru se ek point tak ke saare tokens (jaise tools + system prompt + purani history).<br><strong>Yahan kyun:</strong> lambi chat mein har nayi request ka prefix pichhli request jaisa hi hota hai; sirf end mein naya message judta hai.<br><strong>Example:</strong> request 41 = [tools][system][turn 1-40][naya msg]. Request 42 = [tools][system][turn 1-40][turn 41][naya msg]. Pehle 40 turns tak dono ka prefix same.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Prompt caching', html: `<strong>Ye kya hai:</strong> <strong>requests ke beech</strong> ka cache. Agar is request ka shuruaati hissa (prefix) pichhli request jaisa hi hai, provider us prefix ka processed state (asal mein wahi KV cache) thodi der ke liye rakh leta hai aur dobara use karta hai. Input sasta aur TTFT kam. Shart: prefix <strong>exactly</strong> same ho.<br><strong>Kyun chahiye:</strong> 60 turn ki chat mein har request 30,000+ same tokens dobara bhejti hai; unhe har baar full price pe dobara padhna barbaadi hai.<br><strong>Iske bina:</strong> simulator (neeche) mein dekhoge: 60 turns ka bill $3.29, caching ke saath $0.44.<br><strong>TTL (time to live):</strong> cache kitni der zinda rehta hai. Us time mein agli request na aayi to cache mit jaata hai aur agli baar phir full price.` },
    { type: 'table', head: ['', 'Anthropic (Claude API)', 'OpenAI'], rows: [
      ['On kaise', '<code>cache_control</code> breakpoint lagao (max 4)', 'Supported models pe default se automatic'],
      ['Minimum size', 'Model ke hisaab se: 512 se 4,096 tokens', '1,024 tokens (naye models)'],
      ['Kitni der', 'Default 5 min (har hit pe refresh), 1 ghante ka option', 'Model ke hisaab se: kuch minute se 30 min tak'],
      ['Price', 'Cache write 1.25× (1h: 2×), cache read zyadatar models pe 0.1× base input', 'Cached input discounted (model ke hisaab se)'],
      ['Order', '<code>tools → system → messages</code>; kisi level pe badlav us level aur aage ka cache tod deta hai', 'Stable instructions aur reference pehle'],
    ], caption: 'Oct 2026 ke docs se. Numbers model ke saath badalte hain; apne model ka page check karo.' },
    { type: 'p', html: `Rule of thumb dono ke liye same: <strong>jo kabhi nahi badalta wo sabse aage</strong> (tools, system prompt, examples), phir dheere badalne wala (history), aur har baar badalne wala sabse end mein (naya message, current time, retrieved docs). Upar ke flow ka "Cache miss" scenario yahi galti tha.` },
    { type: 'p', html: `Ab poori conversation ka hisaab dekho. Neeche simulator mein har turn pe request ka size, aur compaction aur prompt caching ka asar:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Turns N: <strong class="aic2-nv"></strong></label><input class="aic2-n" type="range" min="1" max="150" step="1" value="60"></div>
          <div><label>Tokens per turn (user + assistant): <strong class="aic2-tv"></strong></label><input class="aic2-t" type="range" min="100" max="2000" step="100" value="500"></div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin:8px 0"><button type="button" class="chip aic2-comp">Compaction (20K pe → 2K summary)</button><button type="button" class="chip on aic2-cachebtn">Cost mein caching dikhao</button></div>
        <svg class="aic2-svg" viewBox="0 0 320 140" style="width:100%;max-width:520px;display:block"></svg>
        <div class="stats">
          <div class="stat"><span>Total input tokens (poori chat)</span><strong class="aic2-tot"></strong></div>
          <div class="stat"><span>Aakhri request</span><strong class="aic2-last"></strong></div>
          <div class="stat"><span>Cost, bina caching</span><strong class="aic2-cp"></strong></div>
          <div class="stat"><span>Cost, caching ke saath</span><strong class="aic2-cc"></strong></div>
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
        el.querySelector('.aic2-note').textContent = `System + tools = ${fmt(S)} tokens. Input price $3 / million (illustrative); caching: write 1.25×, read 0.1×, chat 5 min ke andar chalti rahe. Output tokens nahi gine.` +
          (comp ? ` Compaction ${r.nComp} baar hua (har baar purani history padhne wali summary call bhi total mein gini).` : ' Line seedhi upar jaati hai: har turn pe request badi.');
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd));
      upd();
    }},
    { type: 'p', html: `Default (60 turns, 500 tokens/turn) pe: total 10,95,000 input tokens, aakhri request 33,000 tokens, cost $3.29 bina caching vs $0.44 caching ke saath. Compaction on karo: total 7,58,000, aakhri request sirf 15,000, cost $2.27 / $0.35. 100 turns pe farak aur bada: bina compaction $8.48, compaction ke saath $4.08. Caching paisa bachata hai lekin window nahi bachata; compaction window aur quality bachata hai. Dono saath chalte hain.` },

    { type: 'h2', text: 'Kab kya?' },
    { type: 'table', head: ['Problem', 'Technique', 'Strategy'], rows: [
      ['Chat lambi, cost badh rahi', 'Prompt caching (stable prefix aage) + compaction', 'Compress'],
      ['Bot purani preferences bhool raha', 'Structured long-term memory, har chat mein upar', 'Write + Select'],
      ['Saare docs bhejna mehnga/ slow', 'Retrieval: sirf top chunks (RAG), just-in-time tools', 'Select'],
      ['Bade tool outputs (logs, lists) window kha rahe', 'Tool result trimming/clearing, sirf relevant fields', 'Compress'],
      ['Ek bada research jaisa kaam', 'Sub-agents, har ek ki apni window, summary wapas', 'Isolate'],
      ['Bahut saare tools, model galat chunta', 'Kam aur saaf tools; sawaal ke hisaab se tool subset', 'Select'],
    ]},
    { type: 'callout', tone: 'why', title: 'Decide', html: `Har call pe pucho: "is step pe model ko <strong>kya dikhna zaroori hai</strong>?" Default: stable cheezein (tools, system, examples) aage aur cache karo; user ke durable facts memory mein; documents sirf retrieval se; history jab window ke ~70-80% pe pahunche to compaction. Pura data window mein tabhi daalo jab wo chhota ho aur har sawaal ke liye zaroori ho (Anthropic ka example: 200K tokens se chhoti knowledge base poori bhi bheji ja sakti hai, caching ke saath). Badi window ko <strong>safety margin</strong> samjho, dump karne ki jagah nahi.` },
    { type: 'h2', text: 'Poori picture' },
    { type: 'diagram', title: 'xyz Assistant: context ki poori picture', height: 520,
      groups: [
        { label: 'User', x: 200, y: 16, w: 320, h: 104 },
        { label: 'xyz.com backend', x: 20, y: 150, w: 480, h: 352 },
        { label: 'Model provider', x: 520, y: 150, w: 184, h: 250 },
      ],
      nodes: [
        { id: 'u', label: 'User', sub: 'turn 61', x: 360, y: 68, w: 150, kind: 'client', info: 'Ye kya hai: xyz.com ka power user, lambi chat mein. Har naya message ek nayi request hai; API stateless hai, to context har baar jodna padta hai.' },
        { id: 'app', label: 'Context builder', sub: 'xyz backend', x: 360, y: 210, w: 150, kind: 'server', info: 'Ye kya hai: backend ka woh hissa jo har request ka context jodta hai: system + memory + history (ya summary) + top docs + naya message. Tokens ginta hai, 80% pe compaction chalata hai, aur stable cheezein aage rakhta hai taaki cache hit ho.' },
        { id: 'hist', label: 'Chat history', sub: 'short-term', x: 110, y: 210, w: 150, kind: 'data', info: 'Ye kya hai: is chat ke saare turns (short-term memory). Har turn ~500 tokens badhti hai. Bahut lambi ho to compaction se summary + aakhri kuch turns ban jaati hai.' },
        { id: 'mem', label: 'User memory', sub: 'long-term', x: 110, y: 340, w: 140, kind: 'data', info: 'Ye kya hai: window ke bahar ka chhota DB (Write strategy): language, plan, khule tickets. Har request mein ~100 tokens upar pinned. Compaction kuch gira de to bhi ye facts bachte hain.' },
        { id: 'docs', label: 'Help docs', sub: 'top-3 chunks', x: 360, y: 340, w: 150, kind: 'data', info: 'Ye kya hai: help center + search (Select strategy). 400 docs mein se sirf is sawaal ke 3 tukde (~1,800 tokens) context mein. Poori kahaani RAG lesson mein.' },
        { id: 'sub', label: 'Sub-agent', sub: 'apni window', x: 110, y: 460, w: 140, kind: 'server', info: 'Ye kya hai: ek alag LLM call apni khaali window ke saath (Isolate strategy). 50 video logs (50,000 tokens) wahi padhta hai aur main context ko sirf 1,500 token ka summary deta hai.' },
        { id: 'llm', label: 'LLM API', sub: 'window 128K', x: 620, y: 210, w: 150, kind: 'edge', info: 'Ye kya hai: model company ka API. Ek request mein max 128K tokens (input + output). Jo context mein nahi, model ke liye exist nahi karta. Compaction ke liye summary bhi yahi banata hai.' },
        { id: 'pc', label: 'Prompt cache', sub: 'TTL ~5 min', x: 620, y: 340, w: 150, kind: 'cache', info: 'Ye kya hai: provider ka cache. Agar request ka prefix (tools + system + purani history) pichhli request jaisa exact same hai, to wo hissa sasta (read ~0.1×) aur tez padha jaata hai. Ek character badla to us point se aage miss.' },
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
        { name: 'Fill the window', text: 'Naya message aata hai. Context builder system prompt, user memory (~100 tokens), history, aur sirf top-3 doc chunks jodta hai; bhaari logs sub-agent ki summary ban ke aate hain. Total ~15,000 tokens, 1,30,100 nahi. Phir LLM API ko.', go: ['u>app', 'mem>app', 'hist>app', 'docs>app', 'sub>app', 'app>llm'] },
        { name: 'Compact', text: 'History window ke ~80% pe pahunchi. Builder purane turns LLM ko deke summary banwata hai (facts, IDs, decisions, khule kaam), zaroori facts memory mein bhi likhta hai, aur history = summary + aakhri 3 turns.', go: ['hist>app', 'app>llm', 'mem>app'] },
        { name: 'Cache hit', text: 'Tools + system + purani history pichhli request jaise hi hain (time jaisi badalti cheez end mein hai). Provider prefix cache se padhta hai: sasta aur kam TTFT. Prefix badla to miss.', go: ['app>llm', 'llm>pc'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Context window = model ki ek hi working memory: input + output dono, tokens mein. Jo window mein nahi, wo model ke liye hai hi nahi.</li>
      <li>Context mein: system prompt, tool definitions, history, retrieved docs, tool results, naya message, output reserve.</li>
      <li>Zyada context ki teen keematein: cost (har request pe poori history), latency (prefill, TTFT), quality (lost in the middle, context rot).</li>
      <li>Context engineering = har call pe sabse chhota, high-signal context. Chaar strategies: Write (memory), Select (sahi docs/tools), Compress (summary, trim), Isolate (sub-agents).</li>
      <li>Compaction purani history ko summary se badalta hai; lossy hai, isliye IDs aur preferences memory mein bhi likho.</li>
      <li>KV cache = ek request ke andar; prompt caching = requests ke beech same prefix. Stable cheezein aage, badalne wali (time, naya msg) end mein.</li>
      <li>Badi window ek limit aur safety margin hai, dump karne ki jagah nahi.</li>
    </ul>` },


    { type: 'tradeoffs',
      gains: ['Kam tokens = kam cost aur kam latency (TTFT)', 'Focused context = behtar accuracy, kam "bhoolna"', 'Lambi chats aur ghanton ke agent tasks window ke bahar bhi chal sakte', 'Caching se repeat prefix ka input ~90% sasta (Anthropic read 0.1×)'],
      costs: ['Context builder ek naya component: token counting, rules, bugs', 'Compaction/summary lossy hai aur extra LLM call lagti', 'Retrieval galat hua to model ko sahi info mili hi nahi', 'Memory stale ya galat ho sakti hai; privacy aur delete ka dhyaan', 'Caching ke liye prompt ka order discipline chahiye; ek galat timestamp sab tod deta'] },

    { type: 'think', questions: [
      { q: 'xyz Assistant mein 35 tools hain (orders, videos, billing, account, analytics...). Model aksar galat tool chunta hai aur har request mein 14,000 tokens sirf tool definitions ke. Kya karoge?', a: 'Select strategy: pehle sawaal ko route karo (billing/video/account) aur us category ke 4-6 tools hi bhejo. Overlapping tools ko merge karo, descriptions saaf karo. Tool definitions stable rakho taaki cache ho; lekin dhyaan rahe, tools badalne se Anthropic pe poora cache invalidate hota hai, to har category ka tool-set apne aap mein stable rakho.' },
      { q: 'Compaction ke baad user poochta hai "maine pehle kaunsa order ID bataya tha?" aur bot nahi bata paata. Kya galat hua, aur fix?', a: 'Summary ne ID drop kar di (compaction lossy hai). Fix: compaction prompt mein explicitly "IDs, numbers, user preferences, decisions hamesha rakho"; aur important entities (order IDs, ticket IDs) ko structured memory mein bhi likho jo har request mein jaaye. Recall pehle, precision baad mein.' },
      { q: 'Simulator mein caching on karne se cost 7 guna kam hua, lekin "Aakhri request" ka size nahi badla. Kyun?', a: 'Caching sirf processing ka dobara kaam aur paisa bachata hai; tokens phir bhi context window mein hain. Window limit, lost-in-the-middle aur context rot waise hi rehte hain. Size ghataane ke liye compaction/selection chahiye.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Context window 128K hai, input 126K. Kya problem hai?', options: ['Koi problem nahi', 'Output ke liye sirf ~2K jagah bachi (input + output ek hi window mein)', 'Model input ko automatically compress kar dega'], answer: 1, explain: 'Window input aur output dono ke liye hai. Output reserve rakho.' },
      { q: '"Lost in the middle" (2023) ne kya dikhaaya?', options: ['Models beech ki info sabse achhe se use karte hain', 'Jawab wali info shuru/end mein ho to accuracy achhi, beech mein ho to kharab (U-shape)', 'Lambe context se hamesha accuracy badhti hai'], answer: 1, explain: 'U-shaped performance: context ke beech mein rakhi info kam use hoti hai.' },
      { q: 'System prompt ki pehli line mein current timestamp hai. Prompt caching pe asar?', options: ['Koi asar nahi', 'Prefix har baar badalta hai, to cache har baar miss (aur write ka extra kharcha)', 'Cache aur fast ho jaata hai'], answer: 1, explain: 'Caching exact prefix match maangta hai. Badalne wali cheezein end mein rakho.' },
      { q: 'Ek agent ko 200 log files padh ke bug dhoondhna hai. Kaunsi strategy main context ko saaf rakhti hai?', options: ['Saari files main context mein daal do', 'Isolate: sub-agent apni window mein padhe, ~1-2K token summary lautaaye', 'Files ko caps mein likho'], answer: 1, explain: 'Sub-agent ka context alag hai; main agent ko sirf condensed result milta hai (Anthropic: aksar 1,000-2,000 tokens).' },
      { q: 'KV cache aur prompt caching mein farak?', options: ['Dono same cheez ke naam', 'KV cache ek request ke andar token generation fast karta hai; prompt caching alag requests ke beech same prefix ka kaam bachata hai', 'Prompt caching GPU pe nahi hota'], answer: 1, explain: 'KV cache = decoding ke dauraan pichhle tokens ke K/V. Prompt caching = us prefix state ko next requests ke liye kuch minute rakhna.' },
    ]},
    { type: 'sources', note: 'Docs Oct 2026 mein padhe gaye; caching prices/minimums model ke saath badalte hain.', items: [
      { title: 'Effective context engineering for AI agents', publisher: 'Anthropic Engineering', official: true, year: 2025, url: 'https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents', used: 'Definition, context rot / attention budget, right altitude, tools, examples, just-in-time retrieval, compaction, note-taking, sub-agents, tool result clearing.' },
      { title: 'Context Engineering for Agents', publisher: 'LangChain blog', year: 2025, url: 'https://www.langchain.com/blog/context-engineering-for-agents', used: 'Write / Select / Compress / Isolate framing.' },
      { title: 'Lost in the Middle: How Language Models Use Long Contexts (Liu et al.)', publisher: 'TACL / arXiv', year: 2023, url: 'https://arxiv.org/abs/2307.03172', used: 'U-shaped performance, multi-doc QA aur key-value retrieval.' },
      { title: 'Context Rot: How Increasing Input Tokens Impacts LLM Performance', publisher: 'Chroma Research', year: 2025, url: 'https://research.trychroma.com/context-rot', used: '18 models pe lambe input ke saath performance girna.' },
      { title: 'Prompt caching', publisher: 'Anthropic docs', official: true, year: 2026, url: 'https://platform.claude.com/docs/en/build-with-claude/prompt-caching', used: '5 min / 1 h TTL, 1.25× / 2× write, 0.1× read, minimum lengths, 4 breakpoints, tools → system → messages order, exact match.' },
      { title: 'Prompt caching', publisher: 'OpenAI docs', official: true, year: 2026, url: 'https://developers.openai.com/api/docs/guides/prompt-caching', used: 'Automatic caching, 1,024 token minimum, exact prefix, stable content pehle.' },
      { title: 'Contextual Retrieval', publisher: 'Anthropic Engineering', official: true, year: 2024, url: 'https://www.anthropic.com/engineering/contextual-retrieval', used: '200K tokens se chhoti knowledge base poori prompt mein bhejne ki salah.' },
    ]},
  ],
});
