Lesson.register({
  id: 'design-llm-chat',
  title: 'ChatGPT / Claude',
  minutes: 45,
  summary: `xyz.com pe ek AI chat assistant. User sawaal likhta hai, jawab word-by-word aata hai. Peeche ka asli khel database nahi, <strong>GPU</strong> hai: har request seconds tak mehngi machine gherti hai. Token-based rate limits, conversation store, prompt orchestration, vector DB, inference router aur queue, prefill vs decode, continuous batching, KV cache aur PagedAttention, SSE streaming, metering, aur jab GPU beech mein mar jaaye.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Tum xyz.com ke AI chat mein sawaal likhte ho, aur jawab ek-ek word karke screen pe aata hai, jaise koi type kar raha ho.<br>Peeche ek bahut bada program (model) hai jo ek mehngi chip (GPU) pe chalta hai. Ek jawab banane mein GPU kai second busy rehta hai.<br>Ab socho lakhon log ek saath sawaal pooch rahe hain, aur GPU gine-chune hain.<br>Ye lesson sikhata hai: GPU ko sab mein imaandari se kaise baantein, jawab turant dikhna kaise shuru ho, aur har user ke kaam ka sahi hisaab (bill) kaise rakhein.` },
    { type: 'callout', tone: 'tip', title: 'Pehle khud try karo', html: `10 minute kaagaz pe socho: ek user ne "mujhe Python sikhao" likha. Jawab 2,000 words ka hai aur ek GPU pe banne mein 20 second lagte hain. Ek GPU pe ek time pe ek hi user? To 10 lakh users ke liye kitne GPU? Aur user ko 20 second khaali screen kyun dekhni pade? Phir yahan compare karo.` },
    { type: 'p', html: `Ye lesson ek <strong>system</strong> ke baare mein hai, model ke baare mein nahi. Transformer, attention aur training ka poora andar ka hisaab AI course mein alag se aayega. Yahan sirf utna samjhenge jitna serving infrastructure design karne ke liye chahiye: <em>token</em> kya hai, <em>prefill</em> aur <em>decode</em> kya hain, aur <em>KV cache</em> kyun memory khaata hai.` },
    { type: 'callout', tone: 'warn', title: 'Public kya hai, kya nahi', html: `OpenAI aur Anthropic apne andar ka serving architecture (kitne GPU, kaunsa scheduler, kaunsa router) zyada public nahi karte. Jo public hai: unki <strong>API docs</strong> (streaming format, rate limits, error codes, prompt caching), kuch incident postmortems, aur open research (Orca 2022, vLLM/PagedAttention 2023, aur 2024 ke papers). Is lesson mein jo bhi provider ka hai wo inhi se hai (saal ke saath). Baaki jagah saaf likha hai ki ye <em>aam industry approach</em> hai, kisi company ka confirmed design nahi.` },

    { type: 'h2', text: 'Step 0: zero se, teen cheezein' },
    { type: 'p', html: `Design se pehle teen cheezein seedhi bhasha mein. Gehri theory AI track mein hai: <a href="#/ai-what-is-llm">LLM kya hai</a>, <a href="#/ai-context">context window</a> aur <a href="#/ai-rag">RAG</a>. Yahan sirf utna jitna system banane ke liye chahiye.` },
    { type: 'callout', tone: 'term', title: 'Naya word: LLM (model)', html: `<strong>Ye kya hai:</strong> Large Language Model. Ek bahut bada program jo text padh ke andaza lagata hai ki agla word (token) kya hona chahiye. Phir wo word jod ke agla, phir agla. Aise hi poora jawab banta hai. Isme arbon numbers (<em>weights</em>) hote hain jo training mein seekhe gaye.<br><strong>Kyun chahiye:</strong> yahi asli "dimaag" hai jo jawab likhta hai. Baaki poora system bas isko sawaal pahunchata hai aur jawab wapas laata hai.<br><strong>Iske bina:</strong> chat app sirf ek khaali text box hai.<br>Andar kaise kaam karta hai: <a href="#/ai-what-is-llm">LLM kya hai</a> lesson.` },
    { type: 'callout', tone: 'term', title: 'Naya word: token', html: `<strong>Ye kya hai:</strong> model text ko words mein nahi, chhote tukdon mein padhta aur likhta hai jinhe <strong>token</strong> kehte hain. Ek token aksar ek chhota word ya word ka hissa hota hai: "unbelievable" shayad "un" + "believ" + "able". English mein mote taur pe ek token ≈ 3-4 characters (ye model aur bhasha pe nirbhar hai).<br><strong>Kyun chahiye:</strong> system ke liye important baat: <strong>kaam, memory, rate limit aur bill sab tokens mein gine jaate hain</strong>, requests mein nahi.<br><strong>Iske bina:</strong> "ek request" ka koi matlab nahi: ek request 10 tokens ki ho sakti hai, ek 1 lakh ki. Requests ginne se kharcha samajh nahi aayega.` },
    { type: 'callout', tone: 'term', title: 'Naya word: GPU', html: `<strong>Ye kya hai:</strong> ek chip jisme hazaron chhote calculators ek saath chalte hain. Pehle games ki graphics ke liye bani thi. Iske paas apni bahut tez memory hoti hai (HBM), jisme model ke weights rakhe jaate hain.<br><strong>Kyun chahiye:</strong> har naya token banane ke liye arbon multiplications chahiye. CPU ye ek-ek karke karega, GPU hazaron ek saath. Aur model ke weights GPU ki memory mein hi rakhne padte hain, warna har token pe unhe laana bahut slow.<br><strong>Iske bina:</strong> ek jawab mein seconds ki jagah minutes lagenge.<br><strong>Is design mein:</strong> GPU sabse mehngi aur sabse kam cheez hai. Poora design isi ke around hai: GPU ka ek second bhi barbaad na ho.` },
    { type: 'image', src: 'assets/img/design-llm-chat/nvidia-hgx-b200-board.jpg', alt: 'NVIDIA HGX B200 board: ek bade circuit board pe aath bade kaale heatsink, har ek ke neeche ek GPU', caption: 'Aisa dikhta hai ek AI server ka dil: ek board pe 8 data-center GPUs (NVIDIA HGX B200), har kaale block ke neeche ek GPU. Data center mein aise hazaron boards hote hain, aur fir bhi peak pe kam padte hain.', credit: { text: 'Pokiiri, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Nvidia_DGX-B200-HGX.jpg', license: 'CC BY-SA 4.0' } },

    { type: 'h2', text: 'Step 1: requirements' },
    { type: 'compare',
      left: { title: 'Functional', html: `• User message bheje, AI ka jawab word-by-word stream ho<br>• Purani chats save hon, sidebar mein dikhein, wahi chat aage badhe<br>• Files/documents pe sawaal (retrieval), "memory"<br>• Tools: web search, code chalana<br>• Plans: free / paid, alag limits<br>• Developers ke liye API (same engine)<br><br><strong>Out of scope:</strong> model training, image/video generation` },
      right: { title: 'Non-functional', html: `• <strong>Time to first token (TTFT)</strong> kam: user ko jaldi kuch dikhe<br>• Tokens per second itni ki padhne se tez aaye<br>• GPU utilization zyada: GPU sabse mehngi cheez hai<br>• Spikes mein graceful: queue, 429/529, degrade, lekin crash nahi<br>• Fairness: ek bada customer sabka GPU na kha jaaye<br>• Har token ka sahi hisaab (billing)<br>• Safety: harmful input/output pakadna` },
    },
    { type: 'callout', tone: 'term', title: 'Naya word: time to first token (TTFT)', html: `<strong>Ye kya hai:</strong> user ne Enter dabaya, aur pehla token screen pe aaya: beech ka time. Doosra number hai <strong>tokens per second</strong> (ya ek token se agle tak ka time), jo batata hai jawab kitni tezi se "type" ho raha hai.<br><strong>Kyun chahiye:</strong> chat mein yahi sabse zyada mehsoos hota hai. 1 second mein pehla word aa gaya to user khush, chahe poora jawab 20 second le.<br><strong>Iske bina:</strong> sirf "poora jawab kitni der mein" naapoge, aur wo galat cheez optimize karoge.` },

    { type: 'h2', text: 'Step 2: napkin maths, GPU hi bottleneck hai' },
    { type: 'p', html: `URL shortener mein ek request ~1 ms CPU khaati thi. Yahan ek jawab ek GPU ki capacity ka hissa <strong>kai seconds</strong> tak gherta hai. Roadmap ka example: maan lo ek GPU server batching ke saath ~1,000-2,000 output tokens/s banata hai, aur peak pe 10 lakh users ek saath jawab padh rahe hain, har ek ko ~50 tokens/s chahiye. Khud numbers badlo (ye illustrative numbers hain, asli throughput model aur hardware se bahut badalta hai):` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="llm-u">Ek saath stream ho rahe users</label><input id="llm-u" type="number" value="1000000" min="1" step="1000"></div>
          <div><label for="llm-tps">Tokens/s har user ko</label><input id="llm-tps" type="number" value="50" min="1" step="1"></div>
          <div><label for="llm-srv">Ek GPU server ke tokens/s (batching ke saath)</label><input id="llm-srv" type="number" value="1500" min="1" step="100"></div>
          <div><label for="llm-ans">Average jawab (tokens)</label><input id="llm-ans" type="number" value="500" min="1" step="50"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Total output tokens/s</span><strong class="o-tot"></strong></div>
          <div class="stat"><span>GPU servers chahiye</span><strong class="o-gpu"></strong></div>
          <div class="stat"><span>Ek jawab kitni der stream</span><strong class="o-sec"></strong></div>
          <div class="stat"><span>Jawab per second (poore)</span><strong class="o-ans"></strong></div>
        </div>
        <div class="calc-note o-note"></div>`;
      const v = id => Math.max(1, Number(el.querySelector('#' + id).value) || 1);
      const f = n => n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : Math.round(n).toString();
      const upd = () => {
        const u = v('llm-u'), tps = v('llm-tps'), srv = v('llm-srv'), ans = v('llm-ans');
        const tot = u * tps, gpu = Math.ceil(tot / srv), sec = ans / tps, aps = u / sec;
        el.querySelector('.o-tot').textContent = f(tot) + '/s';
        el.querySelector('.o-gpu').textContent = gpu.toLocaleString('en-IN');
        el.querySelector('.o-sec').textContent = sec.toFixed(1) + ' s';
        el.querySelector('.o-ans').textContent = f(aps) + '/s';
        el.querySelector('.o-note').textContent = `${f(u)} users × ${tps} tokens/s = ${f(tot)} tokens/s. Ek server ${f(srv)} tokens/s deta hai, to ~${gpu.toLocaleString('en-IN')} servers ki capacity chahiye. Har user ka slot ~${sec.toFixed(1)} s tak busy rehta hai. Compare: ek normal web server ek second mein hazaaron requests nipta deta hai. Yahan har request mehngi aur lambi hai, isliye rate limits, queues, aur chhote/saste models pe routing zaroori ho jaate hain.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Database sabse bada problem hoga, chats bahut saari hain." Chats ka text chhota hai: 10 crore messages × 2 KB ≈ 200 GB, ek achhe sharded store ke liye normal. Asli kami <strong>GPU compute aur GPU memory</strong> ki hai. Isliye ye design ek <em>queueing aur capacity</em> problem hai, database problem kam.` },

    { type: 'h2', text: 'Step 3: API aur data model' },
    { type: 'p', html: `Chat app ka apna backend API hota hai, aur andar wo ek model API ko call karta hai. Public model APIs (OpenAI, Anthropic) dono ka shape milta-julta hai: messages ki list bhejo, <code>stream: true</code> lagao, aur jawab <a href="#/realtime">SSE</a> (Server-Sent Events) pe tukdon mein aata hai:` },
    { type: 'code', text: `
POST /api/chats/c_81/messages          (xyz.com ka apna chat API)
  body: { "text": "Python mein list kya hoti hai?", "model": "fast" }
  → 200 OK   Content-Type: text/event-stream
  ... tokens stream hote hain (neeche detail)

Andar model ko jaane wali request (Anthropic Messages API jaisa shape):
POST /v1/messages
  { "model": "...", "max_tokens": 1024, "stream": true,
    "system": "You are xyz.com's helpful tutor...",
    "messages": [ {"role":"user","content":"..."}, {"role":"assistant","content":"..."},
                  {"role":"user","content":"Python mein list kya hoti hai?"} ] }` },
    { type: 'callout', tone: 'term', title: 'Naya word: stateless model API', html: `<strong>Ye kya hai:</strong> model ko pichhli baat yaad nahi rehti. Har request mein <strong>poori conversation dobara</strong> bhejni padti hai (system prompt + purane messages + naya sawaal). Jaise har baar naye teacher se baat karna, jise pehle poori copy padhaani padti hai.<br><strong>Kyun aisa:</strong> GPU servers pe kisi user ki yaad na rakhne se koi bhi request kisi bhi GPU pe ja sakti hai. Scale karna aasaan.<br><strong>Iska nateeja:</strong> "yaad rakhna" chat app ka kaam hai: wo history apne DB mein rakhta hai aur har baar prompt mein jodta hai. Isliye lambi chat har naye message ke saath mehngi hoti jaati hai.` },
    { type: 'table', head: ['Entity', 'Fields', 'Kahan'], rows: [
      ['User / Plan', 'user_id, plan (free/pro/team), limits', 'SQL (chhota, consistent)'],
      ['Conversation', 'conv_id, user_id, title, model, created_at', 'Sharded store, shard key user_id'],
      ['Message', 'msg_id, conv_id, role, content, tokens_in/out, status (streaming/complete/failed)', 'Same shard (user_id ya conv_id se)'],
      ['Attachment', 'file_id, conv_id, object key, extracted text', 'Object storage + metadata DB'],
      ['Memory / chunks', 'chunk_id, user_id, text, embedding vector', 'Vector DB'],
      ['Usage event', 'request_id, user_id, model, input/output/cached tokens, time', 'Kafka → billing / analytics'],
    ]},
    { type: 'p', html: `Asli duniya: OpenAI ke January 2026 ke engineering post ke mutabik ChatGPT aur unka API ek <strong>single-primary PostgreSQL</strong> (Azure) pe chalta hai jiske ~50 read replicas kai regions mein hain, aur jo write-heavy, shard ho sakne wale workloads hain unhe wo Azure Cosmos DB jaise sharded systems pe le gaye. Post ye nahi batata ki chat messages exactly kis table/store mein hain, isliye upar ka table aam design hai. Lesson: read-heavy metadata ke liye ek Postgres + replicas bahut door tak chalta hai (<a href="#/replication">replication</a> lesson), aur bhaari writes ko alag <a href="#/sharding">sharded</a> store chahiye.` },
    { type: 'h2', text: 'Step 4: high-level design' },
    { type: 'p', html: `Shuru simple se: browser → ek server → GPU pe model. Teen problems turant aate hain: (1) koi bhi free user script se lakhon requests bhej ke GPU kha jaata hai, (2) model ko history yaad nahi, to kisi ko prompt banana padega, (3) GPU kam hain aur ek saath aayi requests ko line mein lagana padega. Har problem ne ek box add kiya. Pehle har box ko jaano, phir neeche ke diagram mein saare scenarios chalao.` },
    { type: 'callout', tone: 'term', title: 'Naya word: API gateway (token limits ke saath)', html: `<strong>Ye kya hai:</strong> wo server jisse har request sabse pehle guzarti hai, building ke main gate jaisa. Login check karta hai, user ka plan dekhta hai, aur <strong>rate limit</strong> lagata hai: ek minute mein kitni requests aur kitne tokens.<br><strong>Kyun chahiye:</strong> GPU mehnga hai. Koi script lakhon requests bheje to use GPU tak pahunchne se pehle hi rok do, sabse sasti jagah pe.<br><strong>Iske bina:</strong> ek user ya bot sabka GPU kha jaata, aur sab ke jawab slow ho jaate.` },
    { type: 'callout', tone: 'term', title: 'Naya word: chat service + conversation store', html: `<strong>Ye kya hai:</strong> xyz.com ka apna backend jo har chat aur har message ek database (<strong>conversation store</strong>) mein save karta hai: sidebar ki list, purane messages, attachments ke reference.<br><strong>Kyun chahiye:</strong> model ko kuch yaad nahi (stateless). Kal ki chat aage badhani ho to purane messages kahin se laane padenge.<br><strong>Iske bina:</strong> refresh karte hi chat gayab, aur model har message pe sab kuch bhool jaata.` },
    { type: 'callout', tone: 'term', title: 'Naya word: orchestrator (prompt assembly)', html: `<strong>Ye kya hai:</strong> chat service ke andar ka wo code jo model ko bhejne se pehle poora prompt jodta hai: system prompt (model ko niyam), history (jitni fit ho), user ki files ke kaam ke tukde, tool results, aur naya sawaal. Jawab aane pe zaroorat ho to tools chalata hai.<br><strong>Kyun chahiye:</strong> model ki ek hadd hai ki ek baar mein kitne tokens dekh sake (context window). Kya daalna hai, kya chhodna hai, ye kisi ko tay karna hai.<br><strong>Iske bina:</strong> ya to prompt hadd se bada (error), ya model ko zaroori baat pata hi nahi.` },
    { type: 'callout', tone: 'term', title: 'Naya word: vector DB (memory aur files)', html: `<strong>Ye kya hai:</strong> ek database jo text ke tukdon ko unke "matlab" ke numbers (<strong>embedding</strong>) ke saath rakhta hai, aur "is sawaal se milte-julte tukde do" jaldi dhoondh deta hai.<br><strong>Kyun chahiye:</strong> user ki 300 page ki PDF ya purani yaadein har baar poori prompt mein nahi daal sakte. Sirf kaam ke 5 tukde chahiye.<br><strong>Iske bina:</strong> ya to badi files pe sawaal hi nahi, ya har sawaal pe bahut mehnga prompt. Detail neeche aur <a href="#/ai-rag">RAG lesson</a> mein.` },
    { type: 'callout', tone: 'term', title: 'Naya word: inference router + queue', html: `<strong>Ye kya hai:</strong> <strong>inference</strong> = trained model se jawab nikalwana (training nahi, sirf use). <strong>Router</strong> tay karta hai ki request kaunse model aur kaunse GPU group pe jaaye. Aage ek <a href="#/queues">queue</a> (line) hoti hai jisme requests GPU ki jagah ka intezaar karti hain, plan ke hisaab se priority ke saath.<br><strong>Kyun chahiye:</strong> GPU kam hain aur requests ek saath aati hain. Line nahi hogi to GPU pe zarurat se zyada kaam chadh jaayega aur sab slow.<br><strong>Iske bina:</strong> koi bhi GPU kabhi bhi overload, free aur paid users mein koi farak nahi, aur bheed mein sab ek saath fail.` },
    { type: 'callout', tone: 'term', title: 'Naya word: inference server (GPU pe model)', html: `<strong>Ye kya hai:</strong> GPU machine pe chalne wala program (jaise vLLM jaisa engine) jo model ko memory mein rakhta hai, requests leta hai, aur token-by-token jawab banata hai.<br><strong>Kyun chahiye:</strong> yahi asli kaam karta hai. Iski chaalakiyan (batching, KV cache, aage dekhenge) tay karti hain ki ek GPU pe kitne users ek saath chal sakein.<br><strong>Iske bina:</strong> model sirf disk pe padi ek file hai.` },
    { type: 'flow', title: 'xyz.com AI chat: ek message ka safar', height: 370,
      nodes: [
        { id: 'c', label: 'Browser', sub: 'chat UI', x: 70, y: 185, w: 110, kind: 'client', info: 'Ye kya hai: user ka browser ya app. Message bhejta hai aur ek SSE stream khula rakhta hai jisme tokens aate hain, aur unhe screen pe jodta jaata hai.' },
        { id: 'gw', label: 'API gateway', sub: 'auth + limits', x: 215, y: 185, w: 130, kind: 'edge', info: 'Ye kya hai: har request ka pehla darwaaza. Login/API key check, plan pata karna, aur rate limits: requests per minute ke saath tokens per minute bhi. Hadd paar to yahin 429, GPU tak pahunchne se pehle. Detail: Rate limiting lesson ka "AI products" hissa.' },
        { id: 'chat', label: 'Chat service', sub: 'orchestrator', x: 385, y: 185, w: 150, kind: 'server', info: 'Ye kya hai: conversation service + orchestrator. History laata hai, zaroorat ho to documents dhoondhta hai, context window mein fit karta hai, input pe safety check chalata hai, model ko bhejta hai, tokens client tak relay karta hai, aur aakhir mein message + usage save karta hai. Stateless, horizontally scale.' },
        { id: 'db', label: 'Chats DB', sub: 'conversations', x: 385, y: 60, w: 150, kind: 'data', info: 'Ye kya hai: conversation store, jisme saari chats aur messages hain. Shard key user_id (sidebar = ek user ki saari chats ek shard pe). Attachments ki asli files object storage mein, yahan sirf reference.' },
        { id: 'vec', label: 'Vector DB', sub: 'files + memory', x: 385, y: 310, w: 150, kind: 'data', info: 'Ye kya hai: matlab se dhoondhne wala database. User ki files aur "memory" ke tukde (chunks) unke embeddings ke saath. Sawaal ka embedding banao, sabse milte-julte chunks lao, prompt mein daalo. Ise retrieval-augmented generation (RAG) kehte hain.' },
        { id: 'rt', label: 'Router + queue', sub: 'model, priority', x: 570, y: 185, w: 140, kind: 'queue', info: 'Ye kya hai: GPU ke aage ka traffic police + line. Kaunsa model, kaunsa region/cluster, kis GPU group mein jagah hai. Aage queue: plan ke hisaab se priority aur fairness. Queue bahut lambi ho to naya kaam mana (overloaded), taaki jo chal raha hai wo bigde nahi.' },
        { id: 'gpu', label: 'GPU cluster', sub: 'continuous batching', x: 610, y: 310, w: 160, kind: 'server', meter: true, load: 70, info: 'Ye kya hai: GPU machines jin pe model chalta hai (inference servers, jaise vLLM jaisa engine). Bahut users ki requests ek saath ek GPU pe (continuous batching, Deep dive 2), har request ka KV cache GPU memory mein (Deep dive 3). Tokens ek ek karke bante hain aur turant wapas bheje jaate hain.' },
      ],
      edges: [{ a: 'c', b: 'gw' }, { a: 'gw', b: 'chat' }, { a: 'chat', b: 'db' }, { a: 'chat', b: 'vec' }, { a: 'chat', b: 'rt' }, { a: 'rt', b: 'gpu' }],
      scenarios: [
        { name: 'Happy path', steps: [
          { title: 'Message bheja', text: 'User ne sawaal likha. Browser POST bhejta hai aur response ko stream ki tarah padhne ke liye taiyar rehta hai.', go: 'c>gw', msg: 'POST /api/chats/c_81/messages  { "text": "Mere notes se list samjhao" }' },
          { title: 'Gateway: kaun ho, kitna bacha?', text: 'Token verify, plan = free. Is user ke tokens-per-minute bucket mein jagah hai? Hai, to aage. (Input tokens ka andaza abhi, output ka hisaab baad mein.)', go: 'gw>chat', set: { gw: { state: 'ok' } } },
          { title: 'History lao', text: 'Model ko yaad nahi, to chat service is conversation ke purane messages DB se laati hai.', go: ['chat>db', 'res:db>chat'], msg: 'SELECT ... FROM messages WHERE conv_id = c_81 ORDER BY msg_id' },
          { title: 'Retrieval: notes mein se kaam ka hissa', text: 'User ne notes upload kiye the. Sawaal ka embedding banake vector DB se top-5 milte-julte chunks.', go: ['chat>vec', 'res:vec>chat'], msg: 'top_k(embed("list samjhao"), user=u_7, k=5)' },
          { title: 'Prompt jodo', text: 'System prompt + retrieved chunks + history (jitni fit ho) + naya sawaal. Input safety check bhi yahin. Ye pura text model ka input hai.', focus: ['chat'], msg: 'system(1.2k) + docs(2.5k) + history(6k) + question(20) = ~9.7k input tokens' },
          { title: 'Queue mein, phir GPU', text: 'Router ne model aur cluster chuna. GPU pe jagah milte hi request batch mein shaamil: pehle poore prompt ka prefill, phir token-by-token decode.', go: 'chat>rt>gpu', after: { gpu: { load: 80 } } },
          { title: 'Tokens stream hote hain', text: 'Har naya token turant ulta safar karta hai aur browser use jodta jaata hai. User pehle word ke baad hi padhna shuru kar deta hai.', go: 'res:gpu>rt>chat>gw>c', msg: 'event: content_block_delta\ndata: {"delta":{"type":"text_delta","text":"List"}}' },
          { title: 'Khatam: save + usage', text: 'Aakhri event mein usage (input/output tokens). Chat service poora jawab DB mein save karti hai aur usage event metering ko bhejti hai.', go: 'chat>db', after: { gpu: { load: 70 } }, msg: 'usage: { input_tokens: 9712, output_tokens: 431 }' },
        ]},
        { name: 'Rate limit (429)', steps: [
          { title: 'Bahut tez requests', text: 'Ek free user ki script ek minute mein bahut bade prompts bhej rahi hai.', flood: { paths: ['c>gw'], n: 6 } },
          { title: 'Token bucket khaali', text: 'Gateway ke pass is user ka tokens-per-minute bucket khaali. Request GPU tak jaati hi nahi.', go: 'bad:gw>c', set: { gw: { state: 'warn', sub: 'TPM khatam' } }, msg: 'HTTP 429  retry-after: 20\n{"type":"error","error":{"type":"rate_limit_error"}}' },
          { title: 'Kyun gateway pe?', text: 'Jitna jaldi mana karo utna sasta. GPU queue tak pahunch ke reject karna matlab mehngi jagah barbaad. Baaki users ke liye GPU capacity bachi rahi.', set: { gw: { state: '', sub: 'auth + limits' } }, focus: ['gw'] },
        ]},
        { name: 'Overload (529)', intro: 'Ab user apni limit ke andar hai, lekin poora system bhara hua hai (naya model launch, sab ek saath aaye).', steps: [
          { title: 'Sab ek saath', text: 'Lakhon users ek saath. Gateway pe sab limit ke andar, to sab aage jaate hain.', flood: { paths: ['c>gw>chat>rt'], n: 8 }, after: { rt: { state: 'hot', sub: 'queue lambi' }, gpu: { load: 100, state: 'hot' } } },
          { title: 'Queue full: naya kaam mana', text: 'Router ki queue ek hadd se zyada lambi. Aur intezaar karwana bekaar, kyunki user waise bhi timeout ho jaayega. To fail fast: overloaded.', go: 'bad:rt>chat>gw>c', msg: 'HTTP 529  {"type":"error","error":{"type":"overloaded_error"}}' },
          { title: 'Graceful degradation', text: 'Chat app user ko "abhi bheed hai, dobara try karo" dikhata hai, client exponential backoff se retry karta hai, free users ko chhote model pe bhej sakte hain, aur paid traffic ko priority. Jo requests chal rahi hain wo poori hoti hain.', set: { rt: { state: 'warn', sub: 'shedding load' } }, focus: ['rt', 'gpu'] },
        ]},
      ],
    },
    { type: 'callout', tone: 'term', title: '429 vs 529', html: `Anthropic ki API docs mein <strong>429 rate_limit_error</strong> ka matlab: <em>tumhari</em> organization ne apni limit paar ki. <strong>529 overloaded_error</strong>: API pe sab users ki wajah se bheed hai, tumhari galti nahi. OpenAI bhi limits ke liye 429 deta hai. Dono ka client-side jawab same: exponential backoff + jitter se retry, aur <code>retry-after</code> header ho to maano. Official SDKs ye retry khud karte hain.` },
    { type: 'h2', text: 'Deep dive 1: prompt orchestration aur context window' },
    { type: 'p', html: `Model ek baar mein sirf ek fixed number of tokens dekh sakta hai: uski <strong>context window</strong>. Is window mein input (system prompt, history, documents, sawaal) <em>aur</em> jawab dono ke tokens aane chahiye. Lambi chat chalti rahe to history window se badi ho jaati hai. Orchestrator ko tay karna padta hai: kya rakhein, kya chhodein.` },
    { type: 'callout', tone: 'term', title: 'Naya word: context window', html: `<strong>Ye kya hai:</strong> model ki "working memory" ki hadd, tokens mein. Isse bahar ka text model ke liye hai hi nahi. Jaise ek whiteboard: bhar gaya to kuch mitana padega.<br><strong>Kyun maayne rakhta hai:</strong> window jitni badi, utna zyada text ek baar mein, lekin har request mehngi bhi (zyada compute, zyada GPU memory, aage dekhenge). Har model ki window alag hoti hai; exact number us model ki docs mein dekho.<br><strong>Iske bina (hadd ka dhyan na rakho to):</strong> lambi chat pe request error deti hai, ya purani zaroori baat chupchaap kat jaati hai. Theory: <a href="#/ai-context">context window lesson</a>.` },
    { type: 'p', html: `Neeche xyz.com chat ka orchestrator chalao. System prompt 1,200 tokens, retrieved documents 2,500, jawab ke liye 4,000 reserve. History ke har turn ka size alag hai (seeded, har baar same):` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="chips llm-win" style="padding:0"><button type="button" class="chip" data-w="8000">8k window</button><button type="button" class="chip on" data-w="32000">32k</button><button type="button" class="chip" data-w="200000">200k</button></div>
        <div class="row2" style="margin-top:10px">
          <div><label for="llm-turns">Chat mein ab tak turns: <strong class="o-tv"></strong></label><input id="llm-turns" type="range" min="1" max="200" step="1" value="60"></div>
          <div><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" class="llm-sum"> Purani history ka summary banao (800 tokens)</label></div>
        </div>
        <div class="llm-bar" style="display:flex;height:26px;border-radius:var(--r-sm);overflow:hidden;border:1px solid var(--line);margin:10px 0 4px"></div>
        <div style="font-size:12px;color:var(--ink-2);margin-bottom:8px;display:flex;flex-wrap:wrap;row-gap:4px"><span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px"><span style="width:10px;height:10px;border-radius:2px;background:var(--accent-soft);border:1px solid var(--line)"></span>system</span><span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px"><span style="width:10px;height:10px;border-radius:2px;background:var(--cache-f);border:1px solid var(--line)"></span>docs</span><span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px"><span style="width:10px;height:10px;border-radius:2px;background:var(--surface-2);border:1px solid var(--line)"></span>summary</span><span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px"><span style="width:10px;height:10px;border-radius:2px;background:var(--line-2);border:1px solid var(--line)"></span>history</span><span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px"><span style="width:10px;height:10px;border-radius:2px;background:var(--amber);border:1px solid var(--line)"></span>sawaal</span><span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px"><span style="width:10px;height:10px;border-radius:2px;background:var(--bg);border:1px solid var(--line)"></span>khaali</span><span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px"><span style="width:10px;height:10px;border-radius:2px;background:var(--line);border:1px solid var(--line)"></span>jawab ke liye</span></div>
        <div class="stats">
          <div class="stat"><span>Input tokens (is message)</span><strong class="o-in"></strong></div>
          <div class="stat"><span>History turns rakhe</span><strong class="o-kept"></strong></div>
          <div class="stat"><span>Turns chhode</span><strong class="o-drop"></strong></div>
          <div class="stat"><span>Poori chat mein total input tokens</span><strong class="o-cum"></strong></div>
        </div>
        <div class="calc-note o-note"></div>`;
      const SYS = 1200, DOCS = 2500, RES = 4000, Q = 50, SUM = 800;
      let s = 11; const rnd = () => (s = s * 16807 % 2147483647) / 2147483647;
      const T = []; for (let i = 0; i < 200; i++) T.push(200 + Math.floor(rnd() * 700));
      let W = 32000;
      const f = n => n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(n);
      const plan = (n, sum) => {
        const budget = W - RES - SYS - DOCS - Q; let used = 0, kept = 0;
        for (let i = n - 1; i >= 0; i--) { if (used + T[i] > budget) break; used += T[i]; kept++; }
        if (sum && kept < n) { used = 0; kept = 0; for (let i = n - 1; i >= 0; i--) { if (used + T[i] > budget - SUM) break; used += T[i]; kept++; } }
        const summary = sum && kept < n ? SUM : 0;
        return { hist: used, kept, drop: n - kept, summary, input: SYS + DOCS + Q + used + summary };
      };
      const seg = (w, bg, t) => `<div title="${t}" style="width:${(w / W * 100).toFixed(2)}%;background:${bg};color:var(--ink);font-size:11px;font-family:var(--f-mono);overflow:hidden;white-space:nowrap;padding-left:3px">${w / W > 0.06 ? t : ''}</div>`;
      const upd = () => {
        const n = Number(el.querySelector('#llm-turns').value), sum = el.querySelector('.llm-sum').checked;
        el.querySelector('.o-tv').textContent = n;
        const p = plan(n, sum); let cum = 0; for (let k = 1; k <= n; k++) cum += plan(k, sum).input;
        const free = W - p.input - RES;
        el.querySelector('.llm-bar').innerHTML = seg(SYS, 'var(--accent-soft)', 'system') + seg(DOCS, 'var(--cache-f)', 'docs') + seg(p.summary, 'var(--surface-2)', 'summary') + seg(p.hist, 'var(--line-2)', 'history') + seg(Q, 'var(--amber)', 'Q') + seg(Math.max(0, free), 'var(--bg)', 'khaali') + seg(RES, 'var(--line)', 'jawab ke liye');
        el.querySelector('.o-in').textContent = f(p.input);
        el.querySelector('.o-kept').textContent = p.kept + ' / ' + n;
        el.querySelector('.o-drop').textContent = p.drop;
        el.querySelector('.o-cum').textContent = f(cum);
        el.querySelector('.o-note').textContent = p.drop === 0
          ? `Poori history fit ho gayi. Lekin dhyan do: har naya message poori purani chat dobara bhejta hai, isliye ${n} turns ki chat mein model ne total ${f(cum)} input tokens process kiye. Chat lambi = har message mehnga.`
          : `${p.drop} purane turns window mein nahi aaye${sum ? ', unki jagah ek 800-token summary rakhi (model ko mote taur pe yaad rahega kya hua tha)' : ' aur bina summary ke model unhe bilkul bhool gaya'}. Input ab ~${f(p.input)} pe ruk gaya, kyunki window bhar gayi hai. Total poori chat: ${f(cum)} input tokens.`;
      };
      el.querySelectorAll('.llm-win .chip').forEach(b => b.addEventListener('click', () => { el.querySelectorAll('.llm-win .chip').forEach(x => x.classList.toggle('on', x === b)); W = Number(b.dataset.w); upd(); }));
      el.querySelector('#llm-turns').addEventListener('input', upd); el.querySelector('.llm-sum').addEventListener('change', upd); upd();
    }},
    { type: 'list', items: [
      `<strong>Drop oldest (sliding window)</strong>: sabse simple. Nuksaan: shuru ki important baat ("mera naam Riya hai, main beginner hoon") bhool jaata hai.`,
      `<strong>Summarize</strong>: purane hisse ka chhota summary ek sasti model call se banao aur use rakho. Detail kho jaati hai, lekin gist bachta hai.`,
      `<strong>Retrieve</strong>: purani history ya user ki "memory" ko vector DB mein daalo, aur sirf sawaal se milte-julte tukde wapas lao. Yahi RAG hai.`,
    ]},
    { type: 'h3', text: 'Retrieval (RAG): vector DB kyun?' },
    { type: 'p', html: `User ne 300 page ki PDF upload ki. Poori PDF har baar prompt mein? Window mein shayad aaye hi nahi, aur aaye to har sawaal pe mehngi. Solution: upload ke waqt PDF ko chhote <strong>chunks</strong> (jaise 500 tokens) mein todo, har chunk ka <strong>embedding</strong> (meaning ka vector, <a href="#/search">Search lesson</a> mein dekha) banao aur vector DB mein rakho. Sawaal aaye to uska embedding banao, sabse milte-julte 5-10 chunks lao, aur sirf unhe prompt mein daalo. Ye aam industry approach hai; ChatGPT/Claude apps andar exactly kaise karte hain, wo public detail nahi hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: RAG (retrieval-augmented generation)', html: `<strong>Ye kya hai:</strong> model ko jawab dene se pehle bahar se relevant text dhoondh ke prompt mein de dena. Open-book exam jaisa: yaad nahi, to kitaab se sahi panna nikaal ke padh lo.<br><strong>Kyun chahiye:</strong> model ka khud ka "gyaan" training ke time ka hai. RAG se wo tumhare documents ya aaj ki khabar pe bhi jawab de sakta hai, bina poori file prompt mein daale.<br><strong>Iske bina:</strong> model tumhari files ke baare mein kuch nahi jaanta, ya har sawaal pe poori file bhejni padti.<br><strong>Limit:</strong> agar retrieval ne galat chunk laaya, model galat jawab confidently de sakta hai. Gehraai mein: <a href="#/ai-rag">RAG lesson</a>.` },
    { type: 'h3', text: 'Prompt caching: same shuruaat, dobara kaam kyun?' },
    { type: 'p', html: `Har message mein system prompt aur purani history <em>same</em> rehti hai, sirf aakhir mein naya sawaal judta hai. Model ko ye same prefix har baar shuru se padhna (prefill) GPU ka waste hai. <strong>Prompt caching</strong>: prefix ka processed state kuch der ke liye rakh lo, agli request mein reuse karo. Anthropic ki docs (2026) ke mutabik: cache prefix pe hota hai (tools → system → messages, ek breakpoint tak), default lifetime 5 minute (1 ghante ka option bhi), aur cache se padhe tokens base input price ke ~10% pe bill hote hain (kuch naye models pe aur kam), jab ki cache mein likhna thoda mehnga (5-minute cache ke liye 1.25x). Exact prefix match chahiye: ek character badla, cache miss. Design lesson: <strong>prompt mein jo cheez nahi badalti use shuru mein rakho</strong>, badalne wali (timestamp, naya sawaal) aakhir mein.` },
    { type: 'h2', text: 'Deep dive 2: GPU pe kya hota hai, prefill aur decode' },
    { type: 'p', html: `Model ek baar mein <strong>ek hi agla token</strong> banata hai. Phir wo token input mein judta hai, aur agla banta hai. Isliye ek request do bilkul alag phases mein chalti hai:` },
    { type: 'compare',
      left: { title: 'Prefill (prompt padhna)', html: `Poora prompt (maan lo 9,000 tokens) <strong>ek saath</strong> process hota hai, kyunki saare tokens pehle se pata hain. GPU ke hazaaron cores bhar jaate hain: <strong>compute-bound</strong>. Iske end pe pehla output token milta hai. Lamba prompt = lamba prefill = zyada TTFT.` },
      right: { title: 'Decode (jawab likhna)', html: `Har step mein sirf <strong>ek</strong> naya token per request. Har step pe model ke saare weights GPU memory se padhne padte hain, lekin kaam bahut thoda. GPU ki speed nahi, <strong>memory bandwidth</strong> limit hai: <strong>memory-bound</strong>. 500 token ka jawab = 500 steps, ek ke baad ek.` },
    },
    { type: 'callout', tone: 'why', title: 'Isliye batching zaroori hai', html: `Decode step mein weights padhne ka kharcha same hai chahe 1 user ka token banao ya 32 ka. To ek hi step mein bahut users ka agla token ek saath banao: weights ek baar padhe, kaam 32 guna. vLLM paper (2023) bhi yahi kehta hai: decode phase GPU compute ko bahut kam use karta hai aur memory-bound hai, isliye throughput is baat pe tikta hai ki <strong>batch mein kitni requests fit hoti hain</strong>.` },
    { type: 'callout', tone: 'term', title: 'Naya word: batching', html: `<strong>Ye kya hai:</strong> kai users ki requests ko ek saath, ek hi GPU step mein chalana. Jaise ek bus mein 40 log ek saath jaate hain, 40 alag gaadiyon ki jagah.<br><strong>Kyun chahiye:</strong> har step ka bada kharcha (weights padhna) ek hi baar lagta hai, chahe batch mein 1 user ho ya 32. Bade batch = same GPU pe kai guna zyada tokens/s.<br><strong>Iske bina:</strong> har GPU ek time pe ek user. Napkin maths wale lakhon users ke liye kai guna zyada GPU chahiye hote.` },
    { type: 'h3', text: 'Static batching vs continuous batching' },
    { type: 'p', html: `Purana tareeka (<strong>static</strong> ya request-level batching): 4 requests ka batch banao, sab ke khatam hone tak chalao, phir agla batch. Problem: jawab alag alag lambai ke hote hain. 3 token wala jawab khatam ho gaya, lekin uska slot tab tak khaali baitha rahega jab tak batch ka sabse lamba (14 token) jawab poora na ho. Aur nayi aayi request poore batch ka intezaar karegi.` },
    { type: 'p', html: `<strong>Continuous batching</strong> (Orca paper, OSDI 2022 ne ise <em>iteration-level scheduling</em> kaha): scheduling har <em>decode step</em> pe hoti hai. Jaise hi kisi request ka jawab khatam, uski jagah turant queue se nayi request aa jaati hai. Neeche khud chala ke dekho. Har row ek GPU batch slot hai, har column ek step. Gaadha rang = prefill step (pehla token), halka = decode, dhaari wala = slot khaali/barbaad:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center">
          <div class="chips llm-sp" style="padding:0"><button type="button" class="chip" data-v="0">Jawab same lambai</button><button type="button" class="chip" data-v="0.5">Thode alag</button><button type="button" class="chip on" data-v="1">Bahut alag</button></div>
          <div class="chips llm-b" style="padding:0"><button type="button" class="chip" data-v="2">2 slots</button><button type="button" class="chip on" data-v="4">4 slots</button><button type="button" class="chip" data-v="6">6 slots</button></div>
        </div>
        <div class="row2" style="margin-top:8px">
          <div><label for="llm-gap">Requests kitni jaldi aati hain: <strong class="o-gv"></strong></label><input id="llm-gap" type="range" min="0" max="4" step="1" value="2"></div>
          <div style="display:flex;align-items:flex-end"><button type="button" class="btn small ghost llm-seed">Naya request mix</button></div>
        </div>
        <div style="font-weight:600;margin-top:10px">Static batching</div><div class="llm-g1"></div>
        <div style="font-weight:600;margin-top:8px">Continuous batching</div><div class="llm-g2"></div>
        <div style="overflow-x:auto"><table style="width:100%;font-size:14px;border-collapse:collapse;margin-top:8px"><thead><tr><th style="text-align:left"></th><th>Sab khatam (steps)</th><th>Slot utilization</th><th>Avg TTFT</th><th>Worst TTFT</th></tr></thead><tbody class="llm-tb"></tbody></table></div>
        <div class="calc-note o-note"></div>`;
      const GAPS = [0.5, 1, 2, 3, 4], GL = ['sab ek saath', 'bahut tez', 'tez', 'normal', 'dheere'];
      const COL = ['--accent', '--violet', '--green', '--amber', '--red', '--cache-s'];
      let spread = 1, B = 4, seed = 7;
      const gen = (sd, n, sp, gap) => { let s = sd; const r = () => (s = s * 16807 % 2147483647) / 2147483647; const q = []; let t = 0;
        for (let i = 0; i < n; i++) { const out = sp === 0 ? 8 : Math.max(2, Math.round(8 + (r() * 2 - 1) * 7 * sp)); q.push({ id: i, arr: t, out }); t += Math.floor(r() * gap * 2); } return q; };
      const sim = (reqs, B, mode) => {
        const q = reqs.map(r => Object.assign({}, r, { start: -1, done: -1, left: r.out }));
        const slots = new Array(B).fill(null), grid = []; let t = 0, useful = 0;
        while (q.some(r => r.done < 0) && t < 500) {
          if (mode === 'cont' || slots.every(x => x === null)) for (let k = 0; k < B; k++) if (slots[k] === null) { const p = q.find(r => r.start < 0 && r.arr <= t); if (p) { p.start = t; slots[k] = p; } }
          grid.push(slots.map(r => !r ? { k: 'e' } : r.done >= 0 ? { k: 'w', id: r.id } : { k: r.start === t ? 'p' : 'd', id: r.id }));
          for (let k = 0; k < B; k++) { const r = slots[k]; if (!r || r.done >= 0) continue; r.left--; useful++; if (r.left === 0) { r.done = t + 1; if (mode === 'cont') slots[k] = null; } }
          if (mode === 'static' && slots.every(r => !r || r.done >= 0)) slots.fill(null);
          t++;
        }
        const tt = q.map(r => r.start + 1 - r.arr);
        return { grid, T: t, util: useful / (B * t), avg: tt.reduce((a, b) => a + b, 0) / tt.length, worst: Math.max(...tt), q };
      };
      const draw = (res, Tm) => {
        const cw = 10, rh = 16, W = 34 + Tm * cw, H = B * (rh + 2) + 16;
        let s = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" role="img" aria-label="GPU slots over time">`;
        res.grid.forEach((row, t) => row.forEach((c, k) => {
          const x = 34 + t * cw, y = k * (rh + 2);
          if (c.k === 'e' || c.k === 'w') s += `<rect x="${x}" y="${y}" width="${cw - 1}" height="${rh}" style="fill:var(--surface-2);stroke:var(--line-2);stroke-dasharray:2 2"/>`;
          else s += `<rect x="${x}" y="${y}" width="${cw - 1}" height="${rh}" style="fill:var(${COL[c.id % 6]});opacity:${c.k === 'p' ? 1 : 0.45}"/>`;
          if (c.k === 'p') s += `<text x="${x + 4.5}" y="${y + 12}" text-anchor="middle" style="font:bold 9px var(--f-mono);fill:var(--bg)">${String.fromCharCode(65 + c.id)}</text>`;
        }));
        for (let k = 0; k < B; k++) s += `<text x="0" y="${k * (rh + 2) + 12}" style="font:10px var(--f-mono);fill:var(--ink-3)">slot${k + 1}</text>`;
        for (let t = 0; t <= Tm; t += 10) s += `<text x="${34 + t * cw}" y="${H - 2}" style="font:9px var(--f-mono);fill:var(--ink-3)">${t}</text>`;
        return s + '</svg>';
      };
      const upd = () => {
        const g = Number(el.querySelector('#llm-gap').value); el.querySelector('.o-gv').textContent = GL[g];
        const reqs = gen(seed, 12, spread, GAPS[g]);
        const a = sim(reqs, B, 'static'), b = sim(reqs, B, 'cont'), Tm = Math.max(a.T, b.T);
        el.querySelector('.llm-g1').innerHTML = draw(a, Tm); el.querySelector('.llm-g2').innerHTML = draw(b, Tm);
        const row = (n, r) => `<tr><td style="text-align:left;font-weight:600">${n}</td><td style="text-align:center">${r.T}</td><td style="text-align:center">${Math.round(r.util * 100)}%</td><td style="text-align:center">${r.avg.toFixed(1)}</td><td style="text-align:center">${r.worst}</td></tr>`;
        el.querySelector('.llm-tb').innerHTML = row('Static', a) + row('Continuous', b);
        el.querySelector('.o-note').textContent = `12 requests (A-L), jawab ${Math.min(...reqs.map(r => r.out))} se ${Math.max(...reqs.map(r => r.out))} tokens, arrival steps: ${reqs.map(r => r.arr).join(', ')}. Continuous batching ne sab ${b.T} steps mein nipta diya (static: ${a.T}), average TTFT ${a.avg.toFixed(1)} se ${b.avg.toFixed(1)} steps, aur worst TTFT ${a.worst} se ${b.worst}. Static mein dhaari wale khaane wo slots hain jinka jawab khatam ho chuka tha lekin batch ka sabse lamba jawab abhi chal raha tha. TTFT = arrival se pehla token (prefill step) tak.`;
      };
      el.querySelectorAll('.llm-sp .chip').forEach(c => c.addEventListener('click', () => { el.querySelectorAll('.llm-sp .chip').forEach(x => x.classList.toggle('on', x === c)); spread = Number(c.dataset.v); upd(); }));
      el.querySelectorAll('.llm-b .chip').forEach(c => c.addEventListener('click', () => { el.querySelectorAll('.llm-b .chip').forEach(x => x.classList.toggle('on', x === c)); B = Number(c.dataset.v); upd(); }));
      el.querySelector('#llm-gap').addEventListener('input', upd);
      el.querySelector('.llm-seed').addEventListener('click', () => { seed = seed * 48271 % 2147483647; upd(); });
      upd();
    }},
    { type: 'callout', tone: 'tip', title: 'Kya dekhna hai', html: `Default ("bahut alag" lambai, 4 slots, tez arrivals) pe static batching ko 43 steps lagte hain aur continuous ko 35; average TTFT ~8.7 se ~3.2 steps pe aa jaata hai. "Jawab same lambai" chuno: static mein barbaadi kam ho jaati hai, kyunki sab saath khatam hote hain, lekin nayi requests ka intezaar phir bhi rehta hai. Ab "same lambai" ke saath slider ko "sab ek saath" pe le jao: dono bilkul barabar (24 steps). Matlab continuous batching ka fayda do cheezon se aata hai: <strong>jawabon ki lambai mein farak</strong> aur <strong>requests ka lagatar aate rehna</strong>, aur asli chat traffic mein dono hote hain. "Dheere" pe GPU waise bhi aksar khaali hai, to farak zyada TTFT mein dikhta hai. Is toy model mein continuous kabhi static se slow nahi hota.` },
    { type: 'p', html: `Asli numbers: Orca paper (OSDI 2022) ne GPT-3 175B pe NVIDIA FasterTransformer ke muqable same latency pe <strong>36.9x throughput</strong> report kiya. Anyscale ke June 2023 benchmark mein continuous batching + PagedAttention (vLLM) ne naive static batching se tak <strong>23x</strong> throughput dikhaya, sabse zyada tab jab output lengths mein bahut variance tha. Aaj vLLM, TGI, TensorRT-LLM, SGLang jaise lagbhag saare serving engines continuous batching karte hain.` },
    { type: 'callout', tone: 'why', title: 'Interview depth: prefill decode ko rokta hai', html: `Ek naye user ka 50,000 token ka prompt aaya. Uska prefill ek bada, compute-heavy step hai, aur us waqt batch ke baaki users ka decode atak jaata hai (unke tokens ruk ruk ke aate hain). Do jawab research se: <strong>chunked prefill</strong> (Sarathi-Serve, OSDI 2024): lambe prompt ko tukdon mein todo aur har step mein ek tukda + chalu decodes saath chalao. Aur <strong>prefill-decode disaggregation</strong> (DistServe, OSDI 2024): prefill aur decode alag GPUs pe, beech mein KV cache transfer. Trade-off: zyada complexity aur network transfer, badle mein TTFT aur tokens/s alag alag tune ho sakte hain.` },
    { type: 'h2', text: 'Deep dive 3: KV cache aur PagedAttention' },
    { type: 'p', html: `Decode ke har step pe model ko pichhle <em>saare</em> tokens ka kuch "processed state" chahiye. Har baar shuru se dobara nikalna bahut mehnga hoga, isliye har token ka ye state GPU memory mein rakh lete hain: <strong>KV cache</strong>. Ye kaafi bada hota hai. vLLM paper ka example: OPT-13B model mein <strong>ek token ka KV cache ~800 KB</strong>, to 2,048 tokens ki ek request ~1.6 GB. Paper ke mutabik 40 GB ke A100 GPU pe is model ke weights ~65% memory le lete hain aur KV cache ko ~30% milta hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: KV cache', html: `<strong>Ye kya hai:</strong> "key" aur "value" naam ke numbers ki lists jo attention (model ka andar ka hissa jo pichhle tokens ko dekhta hai) har token ke liye banata hai, aur jinhe GPU memory mein sambhaal ke rakhte hain. Jaise lambi ginti mein ab tak ka total likh ke rakhna, taaki har baar shuru se na jodna pade.<br><strong>Kyun chahiye:</strong> iske bina har naye token pe pichhle saare tokens ka kaam dobara karna padta: jawab jitna lamba, utna slow.<br><strong>Iski keemat:</strong> maths AI course mein. System ke liye bas itna: <strong>har request ka KV cache har naye token ke saath badhta hai, GPU memory mein rehta hai, aur request khatam hone tak jagah gherta hai</strong>. Batch mein kitne users fit honge, ye zyada tar isi se tay hota hai.` },
    { type: 'p', html: `Purane systems har request ke liye KV cache ki <strong>ek lagataar (contiguous) jagah</strong> pehle se reserve karte the, max possible length ke hisaab se (jaise 2,048 tokens), kyunki pehle se pata nahi jawab kitna lamba hoga. Teen tarah ki barbaadi: <strong>reserved</strong> (aage ke tokens ke liye rakhi jagah), <strong>internal fragmentation</strong> (jawab chhota nikla, baaki jagah kabhi use nahi hui), aur <strong>external fragmentation</strong> (alag alag size ke tukdon ke beech bache chhote gap). vLLM paper (SOSP 2023) ne measure kiya ki purane systems mein KV cache memory ka sirf <strong>20.4% - 38.2%</strong> asli tokens ke kaam aa raha tha.` },
    { type: 'p', html: `<strong>PagedAttention</strong> ka idea operating system ki <em>virtual memory paging</em> se aaya: KV cache ko chhote fixed-size <strong>blocks</strong> mein baanto (vLLM ka default: 16 tokens per block). Blocks memory mein kahin bhi ho sakte hain; har request ka ek <strong>block table</strong> batata hai ki uske tokens kaunse blocks mein hain. Naya block tabhi milta hai jab pichhla bhar jaaye. Barbaadi sirf aakhri adhoore block mein. vLLM ki June 2023 post ke mutabik waste <strong>4% se kam</strong> reh gaya. Toy calculator se mehsoos karo (OPT-13B ke paper wale numbers: 800 KB/token, ~12 GB KV memory; request lengths seeded):` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="llm-kvl">Average asli length (tokens): <strong class="o-lv"></strong></label><input id="llm-kvl" type="range" min="50" max="1500" step="50" value="300"></div>
          <div><label for="llm-kvm">Contiguous reserve (max length): <strong class="o-mv"></strong></label><input id="llm-kvm" type="range" min="512" max="4096" step="512" value="2048"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Contiguous: requests fit</span><strong class="o-cn"></strong></div>
          <div class="stat"><span>Contiguous: memory asli tokens mein</span><strong class="o-cu"></strong></div>
          <div class="stat"><span>Paged (16-token blocks): requests fit</span><strong class="o-pn"></strong></div>
          <div class="stat"><span>Paged: memory asli tokens mein</span><strong class="o-pu"></strong></div>
        </div>
        <div class="llm-kvbar" style="display:grid;grid-template-columns:repeat(40,1fr);gap:2px;margin:10px 0"></div>
        <div class="calc-note o-note"></div>`;
      const KB = 800, BUD = 12e6, BLK = 16;
      const lens = (mean, max) => { let s = 42; const r = () => (s = s * 16807 % 2147483647) / 2147483647; const a = []; for (let i = 0; i < 400; i++) a.push(Math.min(max, Math.max(1, Math.round(-Math.log(1 - r() * 0.999) * mean)))); return a; };
      const upd = () => {
        const mean = Number(el.querySelector('#llm-kvl').value), max = Number(el.querySelector('#llm-kvm').value);
        el.querySelector('.o-lv').textContent = mean; el.querySelector('.o-mv').textContent = max;
        const L = lens(mean, max);
        const cn = Math.min(L.length, Math.floor(BUD / (max * KB)));
        const cu = L.slice(0, cn).reduce((a, b) => a + b, 0) / (cn * max);
        let used = 0, pn = 0, real = 0;
        for (const l of L) { const c = Math.ceil(l / BLK) * BLK * KB; if (used + c > BUD) break; used += c; pn++; real += l * KB; }
        const pu = real / used;
        el.querySelector('.o-cn').textContent = cn; el.querySelector('.o-cu').textContent = Math.round(cu * 100) + '%';
        el.querySelector('.o-pn').textContent = pn; el.querySelector('.o-pu').textContent = Math.round(pu * 100) + '%';
        let cells = ''; const cuN = Math.round(cu * 40);
        for (let i = 0; i < 40; i++) cells += `<div title="contiguous" style="height:12px;border-radius:2px;background:${i < cuN ? 'var(--accent)' : 'var(--surface-2)'};border:1px solid var(--line)"></div>`;
        el.querySelector('.llm-kvbar').innerHTML = cells;
        el.querySelector('.o-note').textContent = `Contiguous: har request ${max} tokens ki jagah (${(max * KB / 1e6).toFixed(2)} GB) gherti hai, to 12 GB mein sirf ${cn} requests, aur us jagah ka sirf ${Math.round(cu * 100)}% asli tokens rakhta hai (upar ki patti: gaadha = kaam ka, halka = barbaad). Paged: har request ko utne hi 16-token blocks jitne chahiye, to ${pn} requests fit, ~${(pn / cn).toFixed(1)}x bada batch.${pu < 0.9 ? ' (Bahut chhoti requests pe aakhri adhoora block bhi ek bada hissa ban jaata hai, isliye yahan paged bhi 90% se neeche hai.)' : ''} Bada batch = zyada tokens/s same GPU pe. Toy model hai: asli systems mein weights, activations aur scheduling ka bhi asar hota hai.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Paging ka ek bonus: <strong>sharing</strong>. Agar do requests ka prefix same hai (same system prompt, ya ek sawaal ke kai sample jawab), to wo same physical blocks share kar sakti hain, aur koi ek likhna chahe to tab copy (<em>copy-on-write</em>, bilkul OS jaisa). Prompt caching jaisi cheezein isi tarah ke prefix reuse pe tiki hain. Aur jab memory phir bhi bhar jaaye? Paper ke mutabik vLLM kuch requests ko <strong>preempt</strong> karta hai: unka KV cache CPU memory mein swap karta hai ya baad mein dobara compute (recompute) karta hai.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"GPU ka compute khatam hua isliye batch chhota hai." Aksar nahi. Decode mein compute bacha rehta hai, <strong>KV cache ki memory</strong> pehle khatam hoti hai. Isliye lambi context windows mehngi hain: ek 100k-token chat akele itna KV cache le leti hai jitna kai chhoti chats milke. Providers lambe context ke liye alag price ya alag servers rakhte hain, aur isi wajah se context window "free" nahi hai.` },
    { type: 'h2', text: 'Deep dive 4: tokens browser tak, SSE streaming' },
    { type: 'callout', tone: 'term', title: 'Naya word: SSE (Server-Sent Events)', html: `<strong>Ye kya hai:</strong> ek normal HTTP response jo turant khatam nahi hota. Server usme thodi-thodi der mein naye tukde likhta jaata hai (<code>event:</code> aur <code>data:</code> lines), aur browser har tukda aate hi padh leta hai. Jaise live cricket commentary: ball ke saath saath shabd aate hain.<br><strong>Kyun chahiye:</strong> tokens ek-ek karke bante hain. Bante hi bhej do, to user pehle word se padhna shuru kar deta hai (TTFT chhota).<br><strong>Iske bina:</strong> user 20 second khaali screen dekhta, phir ek saath poora jawab. Lagta ki app atak gaya.<br>Basics: <a href="#/realtime">realtime lesson</a>.` },
    { type: 'p', html: `Agar server poora jawab banne ka intezaar kare, user 20 second khaali screen dekhega. Lekin tokens to ek ek karke ban hi rahe hain, to unhe bante hi bhej do. Data sirf server → client jaata hai, to <a href="#/realtime">SSE</a> (Server-Sent Events) kaafi hai: ek normal HTTP response jo turant khatam nahi hota, server usme <code>event:</code>/<code>data:</code> lines likhta jaata hai. OpenAI aur Anthropic dono ki public APIs <code>stream: true</code> pe SSE use karti hain. Anthropic ki docs (2026) ke mutabik ek stream ka order:` },
    { type: 'code', text: `
event: message_start          ← khaali message object, input token count
event: content_block_start    ← ek content block (text, ya tool_use) shuru
event: ping                   ← beech beech mein, connection zinda rakhne ke liye
event: content_block_delta    ← {"type":"text_delta","text":"List"}   (bahut saare)
event: content_block_stop
event: message_delta          ← stop_reason + usage (output tokens, cumulative)
event: message_stop

Beech mein kabhi bhi:  event: error  data: {"type":"error","error":{"type":"overloaded_error"}}` },
    { type: 'p', html: `OpenAI ki Responses API ke events ke naam alag hain (<code>response.created</code>, <code>response.output_text.delta</code>, <code>response.completed</code>, <code>error</code>), idea same. Ek important baat dono docs se: HTTP status <strong>200 pehle hi bhej diya</strong> jaata hai, isliye stream ke beech ki galti status code se nahi, ek <code>error</code> <strong>event</strong> se aati hai. Client ko dono sambhalne padte hain. Hamari chat service bhi browser ko isi tarah apni SSE stream bhejti hai (model ke events ko apne format mein badal ke).` },
    { type: 'p', html: `Ab khud stream chala ke dekho. Ye xyz.com ka free plan hai: <strong>har minute 4,000 tokens</strong> ka bucket (toy number). Har message mein ~1,500 input tokens jaate hain (system prompt + history + sawaal), aur jawab 48 tokens ka hai. "Send" dabao, events aate dekho, beech mein "Stop" try karo, aur teesri baar bhejne pe kya hota hai dekho. Price bhi "maan lo" wala hai: input ₹0.25 aur output ₹1.25 per 1,000 tokens.` },
    { type: 'custom', render(el) {
      const REPLY = 'Python mein list ek ordered collection hai. Isme tum alag alag type ki values ek saath rakh sakte ho, jaise numbers aur text. List badli ja sakti hai: append se naya item jodo, pop se aakhri hatao. Index zero se shuru hota hai, to pehla item list[0] hai.'.split(' ');
      const IN = 1500, CAP = 4000, PIN = 0.25, POUT = 1.25, TTFT = 600, STEP = 70;
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">
          <button type="button" class="btn small primary llm-st-send">Send</button>
          <button type="button" class="btn small llm-st-stop">Stop</button>
          <button type="button" class="btn small ghost llm-st-refill">1 minute baad (bucket refill)</button>
        </div>
        <div class="stats">
          <div class="stat"><span>TPM bucket mein bacha</span><strong class="llm-st-b"></strong></div>
          <div class="stat"><span>Is jawab ke output tokens</span><strong class="llm-st-o"></strong></div>
          <div class="stat"><span>TTFT (toy)</span><strong class="llm-st-t"></strong></div>
          <div class="stat"><span>Meter: total input / output</span><strong class="llm-st-m"></strong></div>
          <div class="stat"><span>Bill ab tak</span><strong class="llm-st-c"></strong></div>
        </div>
        <div class="llm-st-txt" style="min-height:64px;border:1px solid var(--line);border-radius:var(--r-sm);padding:10px;margin:8px 0;background:var(--surface);color:var(--ink);line-height:1.5"></div>
        <div class="llm-st-log" style="font-family:var(--f-mono);font-size:12px;color:var(--ink-2);max-height:150px;overflow:auto;border:1px solid var(--line);border-radius:var(--r-sm);padding:8px"></div>
        <div class="calc-note llm-st-note"></div>`;
      const q = c => el.querySelector(c);
      let bucket = CAP, mIn = 0, mOut = 0, out = 0, timer = null, sends = 0;
      const cost = () => (mIn * PIN + mOut * POUT) / 1000;
      const log = (s, bad) => { const d = document.createElement('div'); d.textContent = s; if (bad) d.style.color = 'var(--red)'; q('.llm-st-log').prepend(d); };
      const draw = () => {
        q('.llm-st-b').textContent = bucket.toLocaleString('en-IN') + ' / ' + CAP.toLocaleString('en-IN');
        q('.llm-st-o').textContent = out;
        q('.llm-st-m').textContent = mIn.toLocaleString('en-IN') + ' / ' + mOut;
        q('.llm-st-c').textContent = '₹' + cost().toFixed(3);
      };
      const finish = (why) => { clearInterval(timer); clearTimeout(timer); timer = null; mOut += out; bucket -= out;
        log('event: message_delta  data: {"stop_reason":"' + why + '","usage":{"output_tokens":' + out + '}}'); log('event: message_stop');
        q('.llm-st-note').textContent = why === 'end_turn' ? `Jawab poora: ${out} output tokens. Bucket se ${IN} + ${out} = ${IN + out} tokens kate. Usage event metering (Kafka → billing) ko gaya.` : `Tumne Stop dabaya: sirf ${out} output tokens bane aur unka hi bill. Chat service ne GPU ko cancel bheja, to batch slot turant kisi aur ko mila.`;
        draw(); };
      const send = () => {
        if (timer) return;
        if (bucket < IN) { q('.llm-st-t').textContent = '-'; log('HTTP 429  retry-after: 60  {"type":"rate_limit_error"}', true);
          q('.llm-st-note').textContent = `429: bucket mein sirf ${bucket} tokens bache, aur is message ko ~${IN} input tokens chahiye. Gateway ne GPU tak jaane hi nahi diya. "1 minute baad" dabao.`; return; }
        sends++; bucket -= IN; mIn += IN; out = 0; q('.llm-st-txt').textContent = ''; q('.llm-st-log').innerHTML = '';
        log('POST /api/chats/c_81/messages  → 200 text/event-stream'); log('event: message_start  data: {"usage":{"input_tokens":' + IN + '}}');
        q('.llm-st-t').textContent = TTFT + ' ms'; draw();
        q('.llm-st-note').textContent = 'Queue + prefill chal raha hai... pehla token aane wala hai.';
        timer = setTimeout(() => {
          log('event: content_block_start');
          timer = setInterval(() => {
            if (out >= REPLY.length) return finish('end_turn');
            q('.llm-st-txt').textContent += (out ? ' ' : '') + REPLY[out]; out++;
            log('event: content_block_delta  data: {"text":"' + REPLY[out - 1] + '"}');
            if (out % 16 === 0) log('event: ping');
            draw();
          }, STEP);
        }, TTFT);
      };
      q('.llm-st-send').onclick = send;
      q('.llm-st-stop').onclick = () => { if (timer) finish('cancelled'); };
      q('.llm-st-refill').onclick = () => { if (timer) return; bucket = CAP; draw(); q('.llm-st-note').textContent = 'Naya minute: bucket phir se 4,000 tokens.'; };
      draw(); q('.llm-st-txt').textContent = '(jawab yahan stream hoga)'; q('.llm-st-note').textContent = 'Send dabao.';
    }},
    { type: 'p', html: `Default pe: pehle Send ke baad bucket mein 4,000 − 1,548 = <strong>2,452</strong> bache, doosre ke baad <strong>904</strong>, aur teesra Send <strong>429</strong> laata hai, kyunki 1,500 input tokens ki jagah nahi. Do poore jawabon ka bill: (3,000 × 0.25 + 96 × 1.25) ÷ 1,000 = <strong>₹0.870</strong>. Dhyan do: input tokens output se kahin zyada hain, kyunki har message poori history dobara bhejta hai. Isliye prompt caching aur history ko chhota rakhna paisa bachata hai.` },
    { type: 'flow', title: 'Stream, tools aur failures', height: 340,
      nodes: [
        { id: 'c', label: 'Browser', sub: 'EventSource', x: 70, y: 170, w: 110, kind: 'client', info: 'Ye kya hai: user ka browser. SSE stream padhta hai aur har delta (naya tukda) screen pe jodta hai. Stop button dabane pe ya tab band karne pe connection band karta hai.' },
        { id: 'chat', label: 'Chat service', sub: 'stream relay', x: 235, y: 170, w: 140, kind: 'server', info: 'Ye kya hai: hamari chat service, yahan stream ki dakiya. Model ki stream ko browser tak relay karti hai, saath mein jawab jodti jaati hai (taaki crash pe partial save ho sake), tools chalati hai, aur end mein usage event bhejti hai.' },
        { id: 'tools', label: 'Tools', sub: 'search, code', x: 235, y: 50, w: 140, kind: 'server', info: 'Ye kya hai: model ke "haath-pair": web search, code execution jaise tools. Code wala tool isolated sandbox mein chalta hai. Model sirf tool "maangta" hai; chalata orchestrator hai.' },
        { id: 'rt', label: 'Router', sub: 'queue', x: 410, y: 170, w: 130, kind: 'queue', info: 'Ye kya hai: inference router. Request ko kisi healthy (theek chal rahe) GPU node pe bhejta hai. Node mara to naya node chunta hai. Same conversation ko same node pe bhejne ki koshish karta hai taaki prefix (KV) cache dobara kaam aaye.' },
        { id: 'ga', label: 'GPU node A', sub: 'batch: 32 users', x: 610, y: 70, w: 150, kind: 'server', meter: true, load: 75, info: 'Ye kya hai: ek inference server (GPU machine). Is request ka KV cache yahin ki GPU memory mein hai. Node mara to wo cache bhi gaya.' },
        { id: 'gb', label: 'GPU node B', sub: 'batch: 20 users', x: 610, y: 270, w: 150, kind: 'server', meter: true, load: 50, info: 'Ye kya hai: doosra inference server, same model. Failover ke liye: A gire to kaam yahan aata hai.' },
        { id: 'm', label: 'Kafka → billing', sub: 'usage events', x: 235, y: 290, w: 160, kind: 'queue', info: 'Ye kya hai: metering pipeline. Har request ka usage (input, output, cached tokens, model, user) ek event ban ke Kafka mein. Consumers: billing, plan quotas, dashboards, abuse detection. Chat ka jawab kabhi in sab ka intezaar nahi karta.' },
      ],
      edges: [{ a: 'c', b: 'chat' }, { a: 'chat', b: 'rt' }, { a: 'rt', b: 'ga' }, { a: 'rt', b: 'gb' }, { a: 'chat', b: 'm' }, { a: 'chat', b: 'tools' }],
      scenarios: [
        { name: 'Normal stream', steps: [
          { title: 'Request + stream khula', text: 'Browser ne message bheja, chat service ne prompt jod ke router ko diya, router ne node A chuna.', go: 'c>chat>rt>ga', msg: 'stream: true' },
          { title: 'Prefill, phir pehla event', text: 'Node A ne prompt ka prefill kiya. Pehla token bante hi stream shuru. Yahi TTFT hai.', go: 'res:ga>rt>chat>c', msg: 'event: message_start\nevent: content_block_start' },
          { title: 'Deltas aate rehte hain', text: 'Har decode step ka token turant aage. Beech mein ping events, taaki proxies idle connection na kaatein.', flood: { paths: ['res:ga>rt>chat>c'], n: 6 }, msg: 'event: content_block_delta  data: {"delta":{"text":" ek"}}' },
          { title: 'Khatam + usage', text: 'message_delta mein stop_reason aur usage. Chat service jawab DB mein save karti hai aur usage event Kafka mein daalti hai (async).', parallel: true, go: ['res:ga>rt>chat>c', 'evt:chat>m'], msg: 'event: message_delta  {"usage":{"output_tokens":431}}\nevent: message_stop' },
        ]},
        { name: 'Tool use', intro: 'Model khud internet nahi chala sakta. Wo ek "tool call" maangta hai, orchestrator chalata hai, aur result wapas model ko deta hai.', steps: [
          { title: 'Model: mujhe search chahiye', text: 'Stream mein text ki jagah ek tool_use content block aaya, aur stop_reason = tool_use.', go: 'res:ga>rt>chat', msg: 'tool_use: web_search({ "query": "IPL 2026 final score" })' },
          { title: 'Orchestrator tool chalata hai', text: 'Search service alag, sandboxed. Model ko kabhi seedha internet ya hamare servers ka access nahi. User ko "searching..." dikhta hai.', go: ['chat>tools', 'res:tools>chat'] },
          { title: 'Result ke saath dobara model', text: 'Tool result prompt mein jod ke nayi inference request. Prefix same hai, to prompt cache ka fayda. Ek user message = kai model calls, isliye cost aur latency badhti hai.', go: 'chat>rt>ga' },
          { title: 'Final jawab stream', go: 'res:ga>rt>chat>c', text: 'Ab model search results padh ke jawab likhta hai.' },
        ]},
        { name: 'GPU node mid-stream mara', steps: [
          { title: 'Stream chal raha hai', text: '200 tokens aa chuke hain, chat service unhe jodti ja rahi hai.', go: 'res:ga>rt>chat>c' },
          { title: 'Node A crash', text: 'GPU fault ya machine restart. Is request ka KV cache bhi saath gaya. Router ko health check ya connection toot-ne se pata chalta hai.', set: { ga: { state: 'down', sub: 'DOWN', load: 0 } }, go: 'bad:rt>chat', after: { rt: { state: 'warn' } } },
          { title: 'Client ko kya dikhe?', text: 'HTTP 200 pehle hi ja chuka hai, to stream mein error event. Chat service partial jawab "failed" status ke saath save karti hai, user ko "Regenerate" button dikhta hai.', go: 'bad:chat>c', msg: 'event: error  data: {"type":"error","error":{"type":"api_error"}}' },
          { title: 'Retry node B pe', text: 'Router node B chunta hai. KV cache nahi hai, to poora prefill dobara (TTFT phir lagega). Do raaste: shuru se naya jawab, ya partial ko prompt mein daal ke "aage likho". Anthropic docs ye doosra tareeka API clients ke liye batati hain; tool_use aur thinking blocks aadhe resume nahi hote.', go: 'chat>rt>gb', after: { rt: { state: '' }, gb: { load: 60 } } },
          { title: 'Stream wapas', go: 'res:gb>rt>chat>c', text: 'User ko thoda delay dikha, lekin jawab mil gaya. Billing ke liye usage dono attempts ka alag record hota hai; kisko kitna charge karna hai ye business policy hai.' },
        ]},
        { name: 'User ne Stop dabaya', steps: [
          { title: 'Stream beech mein', text: 'Jawab lamba hai, user ko pehle 3 lines mein hi mil gaya.', go: 'res:ga>rt>chat>c' },
          { title: 'Connection band', text: 'Browser ne stream band ki. Agar chat service ise ignore kare, GPU baaki 1,500 tokens bekaar banata rahega aur batch slot gherega.', go: 'lost:c>chat' },
          { title: 'Cancel aage tak', text: 'Achha design: disconnect pakdo aur generation cancel karo, taaki slot turant kisi aur ko mile (continuous batching mein ye agle step se hi). Jitne tokens bane unka usage record hota hai.', go: 'chat>rt>ga', after: { ga: { load: 70 } } },
        ]},
      ],
    },
    { type: 'callout', tone: 'tip', title: 'Decide: SSE ya WebSocket?', html: `Jawab sirf server → client aata hai, aur user ka agla message ek normal POST hai. To <strong>SSE</strong> kaafi hai: plain HTTP, proxies/CDN/load balancers ke saath aasaan, browser mein built-in. <strong>WebSocket</strong> tab jab dono taraf lagataar baat chahiye: voice mode (audio dono taraf), ya live collaborative features. Moderation ke baare mein OpenAI docs ki chetavni: streaming mein partial jawab ko judge karna mushkil hai, isliye output safety checks bhi stream ke saath chalne chahiye.` },

    { type: 'h2', text: 'Deep dive 5: router, fairness aur priority' },
    { type: 'p', html: `GPU kam hain, users zyada. Router ke saamne har second ye sawaal: kis request ko kis GPU group pe, kis order mein? Public sources mein providers ka exact algorithm nahi hai; aam taur pe industry mein ye cheezein dekhi jaati hain:` },
    { type: 'list', items: [
      `<strong>Model routing</strong>: har model ka apna GPU pool. Sasta/chhota model zyada traffic sambhal leta hai; bheed mein free users ko chhote model pe bhejna ek degradation option hai.`,
      `<strong>Priority queues</strong>: paid/enterprise traffic alag queue ya reserved capacity; free traffic best-effort. Ek bada customer sabka GPU na kha jaaye, isliye per-customer concurrency caps (fair queuing).`,
      `<strong>Cache-aware routing</strong>: same conversation ko usi node pe bhejo jahan uska prefix cache garam hai. Lekin ye "sticky" routing khatarnak bhi ho sakti hai: Anthropic ke September 2025 postmortem mein ek bug ki wajah se kuch requests galat server pool (1M context wale servers) pe chali gayi thi, aur routing sticky hone ki wajah se ek baar galat server pe gaya user agle messages mein bhi wahin jaata raha. Ek load-balancing change ke baad affected requests ~0.8% se badh ke ek din peak pe ~16% (Sonnet 4) tak gaye.`,
      `<strong>Hardware variety</strong>: usi postmortem ke mutabik Anthropic Claude ko AWS Trainium, NVIDIA GPUs aur Google TPUs, teeno pe serve karta hai. Matlab router ke peeche alag alag hardware platforms ho sakte hain, aur sabpe output quality same rakhna apne aap mein ek engineering kaam hai.`,
      `<strong>Batch API</strong>: jo kaam turant nahi chahiye (raat bhar 1 lakh documents summarize), wo alag sasti, async queue mein. OpenAI ki rate-limit docs bhi non-urgent kaam ke liye Batch API ka mashwara deti hain. Peak hours ka GPU interactive users ke liye bachta hai.`,
    ]},
    { type: 'callout', tone: 'term', title: 'Rate limits tokens mein, quick recap', html: `Detail <a href="#/rate-limiting">Rate limiting</a> lesson ke "AI products" hisse mein hai. Saar: OpenAI ki docs RPM, RPD, TPM, TPD (aur images per minute) gin-ti hain, aur jo limit pehle bhare wahi lagti hai; request ke tokens ka andaza <code>max_tokens</code> aur input size se lagaya jaata hai. Anthropic RPM, input tokens per minute aur output tokens per minute alag gin-ta hai, token bucket se, aur kai models pe cache se padhe tokens input limit mein nahi gine jaate. Dono <code>x-ratelimit-*</code> / <code>anthropic-ratelimit-*</code> headers mein bachi quota batate hain.` },

    { type: 'h2', text: 'Deep dive 6: metering, billing, safety, observability' },
    { type: 'p', html: `<strong>Metering</strong>: har response ke end mein usage aata hai (input tokens, output tokens, cache se padhe/likhe tokens). Chat service ise ek event bana ke <a href="#/kafka">Kafka</a> mein daalti hai. Consumers: billing (per-token price × model), plan quota ("is mahine kitna bacha"), analytics, abuse detection. Kyun async? Billing DB slow ho to bhi chat nahi rukni chahiye. Kyun idempotent? Event do baar aa gaya to double charge nahi hona chahiye, isliye har event ka <code>request_id</code> unique key hai (<a href="#/pagination-idempotency">idempotency</a>). Ye aam design hai; providers ke billing pipeline ki internal detail public nahi hai.` },
    { type: 'p', html: `<strong>Safety</strong>: input aur output dono pe classifiers (alag, chhote models) jo harmful content pakadte hain. Input check prompt jodte waqt; output check streaming ke saath chalna padta hai, jo mushkil hai kyunki aadhe jawab ko judge karna hai. Tools (code execution) sandbox mein. Is lesson ka focus system hai, isliye bas yaad rakho: safety ek <em>extra hop aur extra model</em> hai jo latency aur cost dono mein judta hai.` },
    { type: 'p', html: `<strong>Observability</strong>: normal APIs pe hum p99 latency dekhte hain. Yahan teen numbers: <strong>TTFT</strong> (queue + prefill), <strong>time per output token</strong> (decode speed, batch kitna bhara hai), aur <strong>queue depth</strong>. Saath mein GPU utilization, KV cache memory usage, aur error rates (429 vs 529 vs mid-stream errors). Anthropic ke 2025 postmortem ka ek sabak: kuch quality bugs (jaise ek compiler bug jo sirf kuch batch sizes pe galat result deta tha) normal latency/error dashboards mein dikhte hi nahi; output quality ke apne checks chahiye.` },

    { type: 'h2', text: 'Failure scenarios aur bottlenecks' },
    { type: 'table', head: ['Kya hua', 'Asar', 'Bachav'], rows: [
      ['Naya model launch, 10x traffic', 'Queues lambi, TTFT minutes mein', 'Admission control: 529/overloaded jaldi, plan priority, chhote model pe fallback, waitlist'],
      ['GPU node mid-stream mara', 'Stream mein error event, KV cache gaya', 'Partial save, dusre node pe retry (re-prefill), "Regenerate" button'],
      ['Ek customer ki script ne flood kiya', 'Doosron ka GPU khaya', 'Gateway pe TPM/RPM token buckets, per-customer concurrency cap'],
      ['Bahut lamba prompt (1 lakh tokens)', 'Bada prefill, batch ke baaki users ka decode atka', 'Chunked prefill, lambe-context requests ke liye alag pool, max context per plan'],
      ['Users ne tab band kiye, generation chalti rahi', 'GPU bekaar tokens bana raha hai', 'Disconnect pe cancel propagate karo'],
      ['Chats DB slow', 'Chat history load slow, lekin GPU safe', 'Read replicas, cache recent conversations, history ke bina "naya chat" chalne do'],
      ['Billing pipeline down', 'Usage events ruk gaye', 'Kafka mein jama rehte hain, baad mein process; chat chalta rehta hai'],
      ['Routing/compiler bug', 'Galat ya ajeeb jawab, errors nahi', 'Quality evals production pe, canary rollouts, sticky routing pe nazar'],
    ]},
    { type: 'h2', text: 'Interview mein kaise bolein' },
    { type: 'list', ordered: true, items: [
      `<strong>Requirements:</strong> streaming chat, history, files/RAG, tools, plans. NFRs: TTFT, tokens/s, GPU utilization, fairness, spikes, billing accuracy.`,
      `<strong>Numbers:</strong> concurrent users × tokens/s ÷ per-server throughput = GPU fleet. Ye dikhata hai ki GPU sabse mehngi aur kam cheez hai.`,
      `<strong>Request path:</strong> gateway (auth + token limits) → chat service (history, RAG, context window fit, safety) → router + queue → GPU → SSE wapas.`,
      `<strong>GPU deep dive:</strong> prefill (compute-bound) vs decode (memory-bound), continuous batching, KV cache memory hi batch size tay karti hai, PagedAttention, prompt caching.`,
      `<strong>Failures:</strong> 429 vs 529, admission control, mid-stream error event + partial save + retry, cancel on disconnect, chunked prefill for huge prompts.`,
      `<strong>Ops:</strong> async metering via Kafka (idempotent), TTFT/TPOT/queue depth dashboards, quality evals kyunki kuch bugs errors nahi dikhate.`,
    ]},
    { type: 'diagram', title: 'Poora design, ek nazar mein', height: 500,
      caption: 'Upar edge (gateway + limits), beech mein chat backend, neeche left mein async metering (usage events) aur beech mein GPUs. Ye aam industry design hai; providers ke andar ki exact detail public nahi. Upar ke buttons se ek-ek raasta dekho.',
      groups: [
        { label: 'Edge', x: 10, y: 14, w: 530, h: 112 },
        { label: 'Chat backend', x: 10, y: 146, w: 700, h: 112 },
        { label: 'Async', x: 10, y: 276, w: 160, h: 214 },
        { label: 'GPUs', x: 190, y: 276, w: 340, h: 214 },
      ],
      nodes: [
        { id: 'browser', label: 'Browser / app', sub: 'chat UI + SSE', x: 90, y: 70, kind: 'client', info: 'Ye kya hai: user ka browser ya app. Message POST karta hai aur ek SSE stream khula rakhta hai jisme tokens aate hain. Stop dabane pe stream band karta hai.' },
        { id: 'gw', label: 'API gateway', sub: 'auth + RPM/TPM', x: 270, y: 70, kind: 'edge', info: 'Ye kya hai: har request ka pehla darwaaza. Login/API key, plan, aur rate limits: requests per minute ke saath tokens per minute. Hadd paar to yahin 429, GPU tak jaane se pehle.' },
        { id: 'limits', label: 'Limits store', sub: 'token buckets', x: 450, y: 70, kind: 'cache', info: 'Ye kya hai: tez in-memory store (jaise Redis) jisme har user/plan ka token bucket hai: kitne tokens is minute mein bache. Saare gateway servers ek hi ginti dekhte hain.' },
        { id: 'db', label: 'Chats DB', sub: 'sharded by user', x: 90, y: 200, kind: 'data', info: 'Ye kya hai: conversation store. Saari chats aur messages, shard key user_id. Model stateless hai, isliye history yahin se aati hai.' },
        { id: 'chat', label: 'Chat service', sub: 'orchestrator', x: 270, y: 200, kind: 'server', info: 'Ye kya hai: xyz.com ka chat backend. History laata hai, files/memory se kaam ke tukde dhoondhta hai, context window mein fit karta hai, safety check karwata hai, router ko bhejta hai, tokens browser tak relay karta hai, aur aakhir mein message + usage save karta hai.' },
        { id: 'vec', label: 'Vector DB', sub: 'memory + RAG', x: 450, y: 200, kind: 'data', info: 'Ye kya hai: matlab se dhoondhne wala database. User ki files aur memory ke chunks unke embeddings ke saath. Sawaal se milte-julte top-k chunks prompt mein jaate hain (RAG).' },
        { id: 'obj', label: 'Object storage', sub: 'uploaded files', x: 630, y: 200, kind: 'data', info: 'Ye kya hai: asli uploaded files (PDF, images) ka store. Upload pe file chunks mein kat ke vector DB mein jaati hai.' },
        { id: 'kafka', label: 'Kafka', sub: 'usage events', x: 90, y: 330, kind: 'queue', info: 'Ye kya hai: har request ke usage (input, output, cached tokens) ke events ka log. Chat kabhi billing ka intezaar nahi karti.' },
        { id: 'router', label: 'Router + queue', sub: 'model, priority', x: 270, y: 330, kind: 'queue', info: 'Ye kya hai: GPU ke aage ka traffic police + line. Model aur GPU pool chunta hai, plan ke hisaab se priority, aur queue bahut lambi ho to 529 (overloaded) se naya kaam mana.' },
        { id: 'side', label: 'Safety + tools', sub: 'classifiers, sandbox', x: 630, y: 330, kind: 'server', info: 'Ye kya hai: input/output pe safety classifiers (chhote alag models) aur tools (web search, sandbox mein code). Model tool maangta hai, orchestrator chalata hai.' },
        { id: 'billing', label: 'Billing + quotas', sub: 'per-token price', x: 90, y: 450, kind: 'server', info: 'Ye kya hai: usage events se bill aur plan quota banata hai. request_id pe dedupe, taaki event do baar aaye to bhi double charge na ho.' },
        { id: 'poolA', label: 'GPU pool', sub: 'batching + KV', x: 270, y: 450, kind: 'server', info: 'Ye kya hai: inference servers. Continuous batching (kai users ek GPU step mein), paged KV cache, prompt caching. Token bante hi wapas stream hota hai.' },
        { id: 'poolL', label: 'Long-context pool', sub: 'bade prompts', x: 450, y: 450, w: 150, kind: 'server', info: 'Ye kya hai: bahut lambe prompts ke liye alag GPU servers, kyunki unka prefill bada hai aur KV cache bahut memory leta hai. Alag rakhne se chhoti chats ka decode nahi atakta.' },
      ],
      edges: [
        { a: 'browser', b: 'gw', n: 1, both: true },
        { a: 'gw', b: 'limits', both: true },
        { a: 'gw', b: 'chat', n: 2, label: 'allowed', both: true },
        { a: 'chat', b: 'db', n: 3, both: true },
        { a: 'chat', b: 'vec', n: 4, both: true },
        { a: 'vec', b: 'obj', dashed: true },
        { a: 'chat', b: 'side', label: 'safety check', both: true },
        { a: 'chat', b: 'router', n: 5, label: 'prompt', both: true },
        { a: 'router', b: 'poolA', n: 6, label: 'batch', both: true },
        { a: 'router', b: 'poolL', label: 'long context', both: true },
        { a: 'chat', b: 'kafka', kind: 'evt' },
        { a: 'kafka', b: 'billing', kind: 'evt' },
      ],
      paths: [
        { name: 'Send message', text: 'Browser → gateway (login, token bucket check) → chat service: history (Chats DB) + kaam ke chunks (Vector DB) + safety check → prompt router ki queue mein → GPU pool ke batch mein.', go: ['browser>gw>limits', 'gw>chat>db', 'chat>vec', 'chat>side', 'chat>router>poolA'] },
        { name: 'Stream reply', text: 'GPU har token bante hi bhejta hai → router → chat service (jawab jodti jaati hai) → gateway → browser, SSE pe. End mein message DB mein save, usage event Kafka → billing.', go: ['poolA>router>chat>gw>browser', 'chat>db', 'chat>kafka>billing'] },
        { name: 'Rate limited', text: 'User ka tokens-per-minute bucket khaali. Gateway limits store se poochh ke turant 429 + retry-after deta hai. Request GPU tak jaati hi nahi.', go: ['browser>gw>limits'] },
        { name: 'Long context', text: 'Lambi chat ya badi file: orchestrator purani history ka summary / sirf kaam ke chunks (Vector DB, files object storage se) leta hai, aur bada prompt long-context pool pe jaata hai taaki baaki users atkein nahi.', go: ['chat>db', 'chat>vec>obj', 'chat>router>poolL'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Ye database se zyada GPU ka problem hai: har jawab GPU ko seconds tak gherta hai, aur GPU sabse mehnga aur kam hai.</li>
      <li>Sab kuch tokens mein gina jaata hai: kaam, memory, rate limits (RPM + TPM) aur bill.</li>
      <li>Model stateless hai: chat service history DB se laati hai, orchestrator context window mein fit karta hai (drop, summary, RAG).</li>
      <li>Gateway pe token limits (429), router ki queue pe overload (529): jaldi mana karo, GPU bachao.</li>
      <li>Prefill compute-bound, decode memory-bound: isliye continuous batching, aur KV cache memory hi batch size tay karti hai (PagedAttention).</li>
      <li>Tokens SSE pe stream: TTFT chhota. Beech ki galti error event se aati hai, status code se nahi. Stop pe GPU kaam cancel karo.</li>
      <li>Usage events Kafka se billing tak, async aur idempotent.</li>
    </ul>` },
    { type: 'h2', text: 'Trade-offs jo humne liye' },
    { type: 'tradeoffs',
      gains: ['SSE streaming: user ko pehla word ~TTFT pe, poore jawab ka intezaar nahi', 'Continuous batching + paged KV cache: same GPU pe kai guna zyada users', 'Prompt caching: lambi chats aur bade system prompts sasti aur tez', 'Token-based limits + priority queues: ek user/customer sabka GPU nahi kha sakta', 'Async metering: billing slow ho to bhi chat chalti hai'],
      costs: ['Stateless model: har message poori history dobara, lambi chat mehngi', 'Bada batch = zyada throughput, lekin har user ke tokens thode dheere (latency vs throughput)', 'Streaming mein output safety check mushkil, aur errors status code ki jagah events se', 'Sticky/cache-aware routing: cache hit badhte hain, lekin load imbalance aur routing bugs ka khatra', 'Summarize/truncate: purani baatein model bhool sakta hai', 'GPU fleet bahut mehnga; peak ke liye capacity rakho to off-peak mein barbaad (isliye batch API)'],
    },
    { type: 'think', questions: [
      { q: 'Free users ke liye bhi lambi conversation history bhejna mehnga hai. Tum product aur system dono mein kya badlaav karoge?', a: 'System: purani history summarize karo ya retrieve-only (RAG) rakho, aur prompt caching ke liye stable prefix rakho. Product: free plan pe chhoti context window ya chhota model, ek limit ke baad "naya chat shuru karo" ka sujhav. Dono ka maqsad: har message ke input tokens ko bandh ke rakhna.' },
      { q: 'Ek bada enterprise customer ek din achanak 20x traffic bhejta hai. Gateway pe uski limit ke andar hai, phir bhi baaki sab users ka TTFT bigad gaya. Kya galat hai aur kaise theek karoge?', a: 'Rate limit sirf "kitna" check karti hai, "doosron pe asar" nahi. GPU pool shared hai, to uski requests queue bhar deti hain. Fix: per-customer concurrency cap aur fair queuing (har customer ki apni sub-queue, round-robin), enterprise ke liye reserved/dedicated capacity, aur sudden ramp pe acceleration limits (Anthropic docs bhi aisi limits ka zikr karti hain).' },
      { q: 'Router same conversation ko same GPU node pe bhejta hai (cache ke liye). Ye node down hua to kya hoga, aur agar routing table mein bug ho to?', a: 'Node down: requests doosre node pe, cache miss, poora prefill dobara (TTFT badhega) lekin kaam chalega. Bug: stickiness galti ko bhi chipka deti hai: user baar baar galat pool pe jaata rahega, jaisa Anthropic ke 2025 postmortem mein hua. Isliye stickiness ke saath expiry/rebalancing, aur per-pool quality monitoring.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'LLM decode phase mein bada batch throughput kyun badhata hai?', options: ['Decode compute-bound hai aur bade batch se GPU tez chalta hai', 'Decode memory-bound hai: weights ek baar padh ke kai users ka agla token ek saath ban jaata hai', 'Bade batch se har user ke tokens tez aate hain'], answer: 1, explain: 'Har decode step mein weights memory se padhne ka kharcha fixed hai. Bahut users ka kaam ek saath karo to wahi kharcha bant jaata hai. Har user ke liye per-token latency thodi badh sakti hai.' },
      { q: 'Static batching ke muqable continuous batching kya badalta hai?', options: ['Batch size fixed kar deta hai', 'Har decode step pe khatam hui request ki jagah nayi request ko batch mein daal deta hai', 'Requests ko CPU pe bhejta hai'], answer: 1, explain: 'Orca ne ise iteration-level scheduling kaha. Khaali slots turant bhar jaate hain, aur nayi request ko poore batch ka intezaar nahi karna padta, isliye TTFT aur throughput dono sudhrte hain.' },
      { q: 'PagedAttention kis problem ko hal karta hai?', options: ['Model ke weights chhote karna', 'KV cache ke liye max-length contiguous reservation se hone wali memory barbaadi (fragmentation)', 'Network latency'], answer: 1, explain: 'KV cache ko 16-token blocks mein baant ke block table se track karna, jaise OS paging. Barbaadi sirf aakhri block mein, to zyada requests ek saath fit hoti hain.' },
      { q: 'Stream ke beech GPU node mar gaya. Client ko error kaise pata chalega?', options: ['HTTP 500 status se', 'SSE stream mein ek error event se, kyunki 200 status pehle hi ja chuka hai', 'Kabhi pata nahi chalega'], answer: 1, explain: 'Streaming mein headers aur status shuru mein hi chale jaate hain. Uske baad ki galti stream ke andar event ke roop mein aati hai (Anthropic aur OpenAI dono docs mein error event).' },
      { q: 'xyz.com chat ke liye rate limit kis cheez pe sabse sahi hai?', options: ['Sirf requests per minute', 'Tokens per minute (input + output) aur saath mein requests per minute', 'Sirf IP address pe'], answer: 1, explain: 'Ek request 10 tokens ki ho sakti hai ya 1 lakh ki. GPU ka asli kharcha tokens se judta hai, isliye dono providers tokens pe bhi limit lagate hain.' },
    ]},
    { type: 'sources', note: 'Provider-specific baatein sirf inhi public docs, papers aur posts se hain. OpenAI/Anthropic ka andar ka serving architecture zyada tar public nahi; jo hissa "aam industry approach" likha hai wo kisi company ka confirmed design nahi hai.', items: [
      { title: 'Efficient Memory Management for Large Language Model Serving with PagedAttention (SOSP 2023)', publisher: 'Kwon et al., UC Berkeley and others (arXiv 2309.06180)', year: 2023, url: 'https://arxiv.org/abs/2309.06180', used: 'Prefill vs decode (memory-bound decode), 800 KB/token KV for OPT-13B, 65%/30% memory split on A100-40GB, reserved/internal/external fragmentation, 20.4-38.2% effective KV memory in older systems, blocks + block tables, default block size 16, copy-on-write sharing, swap/recompute preemption, 2-4x throughput vs Orca/FasterTransformer.' },
      { title: 'vLLM: Easy, Fast, and Cheap LLM Serving with PagedAttention', publisher: 'vLLM blog', year: 2023, official: true, url: 'https://vllm.ai/blog/2023-06-20-vllm', used: 'Under 4% KV memory waste with paging (60-80% in existing systems per the post).' },
      { title: 'Orca: A Distributed Serving System for Transformer-Based Generative Models (OSDI 2022)', publisher: 'Yu et al., Seoul National University / FriendliAI (USENIX)', year: 2022, url: 'https://www.usenix.org/conference/osdi22/presentation/yu', used: 'Problems of request-level batching, iteration-level scheduling (continuous batching), selective batching, 36.9x throughput vs FasterTransformer on GPT-3 175B at same latency.' },
      { title: 'How continuous batching enables 23x throughput in LLM inference while reducing p50 latency', publisher: 'Anyscale blog', year: 2023, url: 'https://www.anyscale.com/blog/continuous-batching-llm-inference', used: 'Static vs continuous batching explanation, up to 23x with vLLM under high output-length variance, memory-IO-bound inference.' },
      { title: 'Taming Throughput-Latency Tradeoff in LLM Inference with Sarathi-Serve (OSDI 2024)', publisher: 'Agrawal et al., Microsoft Research and others (USENIX)', year: 2024, url: 'https://www.usenix.org/conference/osdi24/presentation/agrawal', used: 'Chunked prefills and stall-free batching.' },
      { title: 'DistServe: Disaggregating Prefill and Decoding for Goodput-optimized LLM Serving (OSDI 2024)', publisher: 'Zhong et al., Peking University, UCSD, StepFun (USENIX)', year: 2024, url: 'https://www.usenix.org/conference/osdi24/presentation/zhong-yinmin', used: 'Prefill-decode interference; running the two phases on separate GPUs.' },
      { title: 'Streaming messages', publisher: 'Claude API docs (Anthropic)', year: 2026, official: true, url: 'https://platform.claude.com/docs/en/build-with-claude/streaming', used: 'SSE event order (message_start ... message_stop), ping events, cumulative usage in message_delta, mid-stream error events (overloaded_error), resume-after-interruption strategy and its limits.' },
      { title: 'Errors', publisher: 'Claude API docs (Anthropic)', year: 2026, official: true, url: 'https://platform.claude.com/docs/en/api/errors', used: '429 rate_limit_error vs 529 overloaded_error, errors after a 200 in streams, SDK automatic retries with backoff, request-id.' },
      { title: 'Rate limits', publisher: 'Claude API docs (Anthropic)', year: 2026, official: true, url: 'https://platform.claude.com/docs/en/api/rate-limits', used: 'RPM/ITPM/OTPM, token bucket, cache reads not counted toward ITPM for most models, acceleration limits, anthropic-ratelimit-* headers, retry-after.' },
      { title: 'Prompt caching', publisher: 'Claude API docs (Anthropic)', year: 2026, official: true, url: 'https://platform.claude.com/docs/en/build-with-claude/prompt-caching', used: 'Prefix caching order (tools, system, messages), 5-minute default and 1-hour TTL, 1.25x write and ~0.1x read pricing, exact-prefix match.' },
      { title: 'Rate limits', publisher: 'OpenAI API docs', year: 2026, official: true, url: 'https://developers.openai.com/api/docs/guides/rate-limits', used: 'RPM, RPD, TPM, TPD, IPM; first limit hit applies; max_tokens counts in the estimate; x-ratelimit-* headers; backoff with jitter; Batch API for non-urgent work.' },
      { title: 'Streaming API responses', publisher: 'OpenAI API docs', year: 2026, official: true, url: 'https://developers.openai.com/api/docs/guides/streaming-responses', used: 'SSE with stream=true, event names (response.created, response.output_text.delta, response.completed, error), moderation of partial output is harder.' },
      { title: 'A postmortem of three recent issues', publisher: 'Anthropic Engineering', year: 2025, official: true, url: 'https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues', used: 'Serving on Trainium, NVIDIA GPUs and TPUs; context-window routing bug with sticky routing (0.8% to a 16% peak); TPU output corruption; approximate top-k compiler bug that only showed for some batch sizes.' },
      { title: 'Scaling PostgreSQL to power 800 million ChatGPT users', publisher: 'OpenAI engineering (cross-checked with explainthis.io and other summaries)', year: 2026, official: true, url: 'https://openai.com/index/scaling-postgresql/', used: 'Single-primary PostgreSQL with ~50 read replicas; shardable write-heavy workloads moved to Azure Cosmos DB; workload isolation.' },
      { title: 'Nvidia DGX-B200-HGX (photo)', publisher: 'Wikimedia Commons (Pokiiri, CC BY-SA 4.0)', year: 2025, url: 'https://commons.wikimedia.org/wiki/File:Nvidia_DGX-B200-HGX.jpg', used: 'Ek board pe 8 GPUs wali HGX B200 ki photo.' },
    ]},
  ],
});
