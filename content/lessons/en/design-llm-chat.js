Lesson.register({
  id: 'design-llm-chat',
  title: 'ChatGPT / Claude',
  minutes: 45,
  summary: `An AI chat assistant on xyz.com. The user types a question, and the answer arrives word by word. The real game behind it is not the database but the <strong>GPU</strong>: every request holds an expensive machine for seconds. Token-based rate limits, the conversation store, prompt orchestration, the vector DB, the inference router and queue, prefill vs decode, continuous batching, the KV cache and PagedAttention, SSE streaming, metering, and what happens when a GPU dies halfway.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `You type a question in xyz.com's AI chat, and the answer appears on the screen one word at a time, as if someone were typing.<br>Behind it is a very big program (the model) that runs on an expensive chip (a GPU). Making one answer keeps the GPU busy for several seconds.<br>Now imagine millions of people asking questions at the same time, while there are only so many GPUs.<br>This lesson teaches how to share the GPUs fairly, how to start showing the answer right away, and how to keep a correct account (the bill) of every user's work.` },
    { type: 'callout', tone: 'tip', title: 'Try it yourself first', html: `Think on paper for 10 minutes: a user wrote "teach me Python". The answer is 2,000 words long and takes 20 seconds to make on one GPU. One user per GPU at a time? Then how many GPUs for 10 lakh (1 million) users? And why should the user stare at an empty screen for 20 seconds? Then compare with this lesson.` },
    { type: 'p', html: `This lesson is about a <strong>system</strong>, not about the model. The full inside story of transformers, attention and training comes separately in the AI course. Here we learn only as much as we need to design the serving infrastructure: what a <em>token</em> is, what <em>prefill</em> and <em>decode</em> are, and why the <em>KV cache</em> eats memory.` },
    { type: 'callout', tone: 'warn', title: 'What is public and what is not', html: `OpenAI and Anthropic do not publish much about their internal serving architecture (how many GPUs, which scheduler, which router). What is public: their <strong>API docs</strong> (streaming format, rate limits, error codes, prompt caching), some incident postmortems, and open research (Orca 2022, vLLM/PagedAttention 2023, and papers from 2024). Everything about a provider in this lesson comes from these (with the year). Everywhere else, we say clearly that it is the <em>common industry approach</em>, not a confirmed design of any company.` },

    { type: 'h2', text: 'Step 0: three things, from zero' },
    { type: 'p', html: `Before the design, three things in plain language. The deep theory is in the AI track: <a href="#/ai-what-is-llm">What is an LLM</a>, <a href="#/ai-context">the context window</a> and <a href="#/ai-rag">RAG</a>. Here, only as much as we need to build the system.` },
    { type: 'callout', tone: 'term', title: 'New word: LLM (model)', html: `<strong>What it is:</strong> a Large Language Model. A very big program that reads text and guesses what the next word (token) should be. Then it adds that word and guesses the next one, and the next. That is how the whole answer is made. It contains billions of numbers (<em>weights</em>) that were learned during training.<br><strong>Why we need it:</strong> this is the real "brain" that writes the answer. The rest of the system just carries the question to it and brings the answer back.<br><strong>Without it:</strong> the chat app is just an empty text box.<br>How it works inside: the <a href="#/ai-what-is-llm">What is an LLM</a> lesson.` },
    { type: 'callout', tone: 'term', title: 'New word: token', html: `<strong>What it is:</strong> the model does not read and write in words, but in small pieces called <strong>tokens</strong>. A token is often a short word or part of a word: "unbelievable" might be "un" + "believ" + "able". In English, one token is roughly 3-4 characters (it depends on the model and the language).<br><strong>Why we need it:</strong> the important point for the system: <strong>work, memory, rate limits and the bill are all counted in tokens</strong>, not in requests.<br><strong>Without it:</strong> "one request" means nothing: one request can be 10 tokens, another can be 1 lakh (100,000). Counting requests will not tell you the cost.` },
    { type: 'callout', tone: 'term', title: 'New word: GPU', html: `<strong>What it is:</strong> a chip with thousands of small calculators running at the same time. It was first made for game graphics. It has its own very fast memory (HBM), where the model's weights are kept.<br><strong>Why we need it:</strong> making each new token needs billions of multiplications. A CPU does them a few at a time; a GPU does thousands at once. And the model's weights must stay in the GPU's memory, because bringing them in for every token would be far too slow.<br><strong>Without it:</strong> one answer would take minutes instead of seconds.<br><strong>In this design:</strong> the GPU is the most expensive and the scarcest thing. The whole design is built around it: not a single second of GPU time should be wasted.` },
    { type: 'image', src: 'assets/img/design-llm-chat/nvidia-hgx-b200-board.jpg', alt: 'NVIDIA HGX B200 board: eight large black heatsinks on a big circuit board, with a GPU under each one', caption: 'This is what the heart of an AI server looks like: 8 data-center GPUs on one board (NVIDIA HGX B200), with one GPU under each black block. A data center has thousands of such boards, and at peak times there are still not enough.', credit: { text: 'Pokiiri, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Nvidia_DGX-B200-HGX.jpg', license: 'CC BY-SA 4.0' } },

    { type: 'h2', text: 'Step 1: requirements' },
    { type: 'compare',
      left: { title: 'Functional', html: `• The user sends a message, and the AI's answer streams word by word<br>• Old chats are saved, shown in the sidebar, and the same chat can continue<br>• Questions about files/documents (retrieval), "memory"<br>• Tools: web search, running code<br>• Plans: free / paid, with different limits<br>• An API for developers (same engine)<br><br><strong>Out of scope:</strong> model training, image/video generation` },
      right: { title: 'Non-functional', html: `• Low <strong>time to first token (TTFT)</strong>: the user sees something quickly<br>• Enough tokens per second to arrive faster than people read<br>• High GPU utilization: the GPU is the most expensive thing<br>• Graceful in spikes: queue, 429/529, degrade, but never crash<br>• Fairness: one big customer must not eat everyone's GPU<br>• A correct account of every token (billing)<br>• Safety: catch harmful input/output` },
    },
    { type: 'callout', tone: 'term', title: 'New word: time to first token (TTFT)', html: `<strong>What it is:</strong> the time between the user pressing Enter and the first token appearing on the screen. The second number is <strong>tokens per second</strong> (or the time from one token to the next), which shows how fast the answer is "typed".<br><strong>Why we need it:</strong> in chat, this is what people feel the most. If the first word arrives in 1 second, the user is happy, even if the full answer takes 20 seconds.<br><strong>Without it:</strong> you would only measure "how long until the full answer", and you would optimise the wrong thing.` },

    { type: 'h2', text: 'Step 2: napkin maths: the GPU is the bottleneck' },
    { type: 'p', html: `In the URL shortener, one request used about 1 ms of CPU. Here, one answer holds part of a GPU's capacity for <strong>several seconds</strong>. The roadmap's example: assume one GPU server makes about 1,000-2,000 output tokens/s with batching, and at peak 10 lakh (1 million) users are reading answers at the same time, each needing about 50 tokens/s. Change the numbers yourself (these are illustrative numbers; real throughput changes a lot with the model and the hardware):` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="llm-u">Users streaming at the same time</label><input id="llm-u" type="number" value="1000000" min="1" step="1000"></div>
          <div><label for="llm-tps">Tokens/s for each user</label><input id="llm-tps" type="number" value="50" min="1" step="1"></div>
          <div><label for="llm-srv">Tokens/s of one GPU server (with batching)</label><input id="llm-srv" type="number" value="1500" min="1" step="100"></div>
          <div><label for="llm-ans">Average answer (tokens)</label><input id="llm-ans" type="number" value="500" min="1" step="50"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Total output tokens/s</span><strong class="o-tot"></strong></div>
          <div class="stat"><span>GPU servers needed</span><strong class="o-gpu"></strong></div>
          <div class="stat"><span>How long one answer streams</span><strong class="o-sec"></strong></div>
          <div class="stat"><span>Answers per second (complete)</span><strong class="o-ans"></strong></div>
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
        el.querySelector('.o-note').textContent = `${f(u)} users × ${tps} tokens/s = ${f(tot)} tokens/s. One server gives ${f(srv)} tokens/s, so you need the capacity of ~${gpu.toLocaleString('en-IN')} servers. Each user\'s slot stays busy for ~${sec.toFixed(1)} s. Compare: a normal web server finishes thousands of requests in one second. Here every request is expensive and long, which is why rate limits, queues, and routing to smaller/cheaper models become necessary.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'mistake', title: 'Common beginner mistake', html: `"The database will be the biggest problem, there are so many chats." Chat text is small: 10 crore (100 million) messages × 2 KB ≈ 200 GB, which is normal for a good sharded store. The real shortage is <strong>GPU compute and GPU memory</strong>. So this design is a <em>queueing and capacity</em> problem much more than a database problem.` },

    { type: 'h2', text: 'Step 3: API and data model' },
    { type: 'p', html: `The chat app has its own backend API, and inside, it calls a model API. The public model APIs (OpenAI, Anthropic) have a similar shape: send a list of messages, set <code>stream: true</code>, and the answer comes in pieces over <a href="#/realtime">SSE</a> (Server-Sent Events):` },
    { type: 'code', text: `
POST /api/chats/c_81/messages          (xyz.com's own chat API)
  body: { "text": "What is a list in Python?", "model": "fast" }
  → 200 OK   Content-Type: text/event-stream
  ... tokens are streamed (details below)

The request that goes to the model inside (shaped like the Anthropic Messages API):
POST /v1/messages
  { "model": "...", "max_tokens": 1024, "stream": true,
    "system": "You are xyz.com's helpful tutor...",
    "messages": [ {"role":"user","content":"..."}, {"role":"assistant","content":"..."},
                  {"role":"user","content":"What is a list in Python?"} ] }` },
    { type: 'callout', tone: 'term', title: 'New word: stateless model API', html: `<strong>What it is:</strong> the model does not remember the earlier conversation. Every request must send <strong>the whole conversation again</strong> (system prompt + old messages + new question). Like talking to a new teacher every time, who must first read your whole notebook.<br><strong>Why it is like this:</strong> when the GPU servers keep no memory of any user, any request can go to any GPU. Scaling becomes easy.<br><strong>The result:</strong> "remembering" is the chat app's job: it keeps the history in its own DB and adds it to the prompt every time. That is why a long chat gets more expensive with every new message.` },
    { type: 'table', head: ['Entity', 'Fields', 'Where'], rows: [
      ['User / Plan', 'user_id, plan (free/pro/team), limits', 'SQL (small, consistent)'],
      ['Conversation', 'conv_id, user_id, title, model, created_at', 'Sharded store, shard key user_id'],
      ['Message', 'msg_id, conv_id, role, content, tokens_in/out, status (streaming/complete/failed)', 'Same shard (by user_id or conv_id)'],
      ['Attachment', 'file_id, conv_id, object key, extracted text', 'Object storage + metadata DB'],
      ['Memory / chunks', 'chunk_id, user_id, text, embedding vector', 'Vector DB'],
      ['Usage event', 'request_id, user_id, model, input/output/cached tokens, time', 'Kafka → billing / analytics'],
    ]},
    { type: 'p', html: `Real world: according to OpenAI's January 2026 engineering post, ChatGPT and their API run on a <strong>single-primary PostgreSQL</strong> (Azure) with about 50 read replicas in many regions, and they moved write-heavy workloads that can be sharded to sharded systems like Azure Cosmos DB. The post does not say exactly which table/store holds chat messages, so the table above is a common design. Lesson: one Postgres + replicas goes a very long way for read-heavy metadata (the <a href="#/replication">replication</a> lesson), and heavy writes need a separate <a href="#/sharding">sharded</a> store.` },
    { type: 'h2', text: 'Step 4: high-level design' },
    { type: 'p', html: `Start simple: browser → one server → the model on a GPU. Three problems appear at once: (1) any free user can send millions of requests with a script and eat the GPU, (2) the model does not remember the history, so someone has to build the prompt, (3) there are few GPUs, and requests that arrive together must wait in a line. Each problem added a box. First get to know each box, then run all the scenarios in the diagram below.` },
    { type: 'callout', tone: 'term', title: 'New word: API gateway (with token limits)', html: `<strong>What it is:</strong> the server every request passes through first, like the main gate of a building. It checks the login, looks up the user's plan, and applies the <strong>rate limit</strong>: how many requests and how many tokens per minute.<br><strong>Why we need it:</strong> the GPU is expensive. If a script sends millions of requests, stop it before it reaches the GPU, at the cheapest possible place.<br><strong>Without it:</strong> one user or bot would eat everyone's GPU, and everyone's answers would become slow.` },
    { type: 'callout', tone: 'term', title: 'New word: chat service + conversation store', html: `<strong>What it is:</strong> xyz.com's own backend, which saves every chat and every message in a database (the <strong>conversation store</strong>): the sidebar list, old messages, references to attachments.<br><strong>Why we need it:</strong> the model remembers nothing (stateless). To continue yesterday's chat, the old messages must come from somewhere.<br><strong>Without it:</strong> the chat would disappear on refresh, and the model would forget everything on every message.` },
    { type: 'callout', tone: 'term', title: 'New word: orchestrator (prompt assembly)', html: `<strong>What it is:</strong> the code inside the chat service that builds the full prompt before sending it to the model: the system prompt (rules for the model), the history (as much as fits), useful pieces of the user's files, tool results, and the new question. When the answer comes back, it runs tools if needed.<br><strong>Why we need it:</strong> the model has a limit on how many tokens it can see at once (the context window). Someone must decide what goes in and what is left out.<br><strong>Without it:</strong> either the prompt is too big (an error), or the model never learns something important.` },
    { type: 'callout', tone: 'term', title: 'New word: vector DB (memory and files)', html: `<strong>What it is:</strong> a database that stores pieces of text together with numbers that capture their "meaning" (an <strong>embedding</strong>), and quickly finds "pieces similar to this question".<br><strong>Why we need it:</strong> we cannot put the user's 300-page PDF or old memories into the prompt every time. We only need the 5 useful pieces.<br><strong>Without it:</strong> either no questions on big files at all, or a very expensive prompt for every question. Details below and in the <a href="#/ai-rag">RAG lesson</a>.` },
    { type: 'callout', tone: 'term', title: 'New word: inference router + queue', html: `<strong>What it is:</strong> <strong>inference</strong> = getting answers from a trained model (not training, just using it). The <strong>router</strong> decides which model and which GPU group a request goes to. In front of it is a <a href="#/queues">queue</a> (a line) where requests wait for space on a GPU, with priority based on the plan.<br><strong>Why we need it:</strong> there are few GPUs, and requests arrive together. Without a line, GPUs get more work than they can handle and everything slows down.<br><strong>Without it:</strong> any GPU could be overloaded at any time, free and paid users would be treated the same, and in a crowd everything would fail together.` },
    { type: 'callout', tone: 'term', title: 'New word: inference server (the model on a GPU)', html: `<strong>What it is:</strong> the program on a GPU machine (an engine like vLLM) that keeps the model in memory, takes requests, and makes the answer token by token.<br><strong>Why we need it:</strong> this does the real work. Its tricks (batching and the KV cache, which we will see later) decide how many users can run on one GPU at the same time.<br><strong>Without it:</strong> the model is just a file lying on a disk.` },
    { type: 'flow', title: 'xyz.com AI chat: the journey of one message', height: 370,
      nodes: [
        { id: 'c', label: 'Browser', sub: 'chat UI', x: 70, y: 185, w: 110, kind: 'client', info: 'What it is: the user\'s browser or app. It sends the message and keeps an SSE stream open, where the tokens arrive, and keeps adding them to the screen.' },
        { id: 'gw', label: 'API gateway', sub: 'auth + limits', x: 215, y: 185, w: 130, kind: 'edge', info: 'What it is: the first door for every request. Login/API key check, finding the plan, and rate limits: tokens per minute as well as requests per minute. Over the limit = 429 right here, before reaching the GPU. Details: the "AI products" part of the Rate limiting lesson.' },
        { id: 'chat', label: 'Chat service', sub: 'orchestrator', x: 385, y: 185, w: 150, kind: 'server', info: 'What it is: the conversation service + orchestrator. It brings the history, looks for documents if needed, fits everything into the context window, runs the safety check on the input, sends it to the model, relays the tokens to the client, and at the end saves the message + usage. Stateless, scales horizontally.' },
        { id: 'db', label: 'Chats DB', sub: 'conversations', x: 385, y: 60, w: 150, kind: 'data', info: 'What it is: the conversation store, with all chats and messages. Shard key user_id (the sidebar = all chats of one user on one shard). The real files of attachments are in object storage; only a reference is here.' },
        { id: 'vec', label: 'Vector DB', sub: 'files + memory', x: 385, y: 310, w: 150, kind: 'data', info: 'What it is: a database that searches by meaning. Pieces (chunks) of the user\'s files and "memory", with their embeddings. Make an embedding of the question, bring the most similar chunks, put them in the prompt. This is called retrieval-augmented generation (RAG).' },
        { id: 'rt', label: 'Router + queue', sub: 'model, priority', x: 570, y: 185, w: 140, kind: 'queue', info: 'What it is: the traffic police + waiting line in front of the GPUs. Which model, which region/cluster, which GPU group has space. In front, a queue: priority and fairness by plan. If the queue is too long, new work is refused (overloaded), so that work already running is not harmed.' },
        { id: 'gpu', label: 'GPU cluster', sub: 'continuous batching', x: 610, y: 310, w: 160, kind: 'server', meter: true, load: 70, info: 'What it is: GPU machines that run the model (inference servers, an engine like vLLM). Many users\' requests run together on one GPU (continuous batching, Deep dive 2), and each request\'s KV cache lives in GPU memory (Deep dive 3). Tokens are made one by one and sent back at once.' },
      ],
      edges: [{ a: 'c', b: 'gw' }, { a: 'gw', b: 'chat' }, { a: 'chat', b: 'db' }, { a: 'chat', b: 'vec' }, { a: 'chat', b: 'rt' }, { a: 'rt', b: 'gpu' }],
      scenarios: [
        { name: 'Happy path', steps: [
          { title: 'Message sent', text: 'The user wrote a question. The browser sends a POST and gets ready to read the response as a stream.', go: 'c>gw', msg: 'POST /api/chats/c_81/messages  { "text": "Explain lists from my notes" }' },
          { title: 'Gateway: who are you, how much is left?', text: 'Token verified, plan = free. Is there room in this user\'s tokens-per-minute bucket? Yes, so it goes on. (Input tokens are estimated now; output is counted later.)', go: 'gw>chat', set: { gw: { state: 'ok' } } },
          { title: 'Bring the history', text: 'The model does not remember, so the chat service brings this conversation\'s old messages from the DB.', go: ['chat>db', 'res:db>chat'], msg: 'SELECT ... FROM messages WHERE conv_id = c_81 ORDER BY msg_id' },
          { title: 'Retrieval: the useful part of the notes', text: 'The user had uploaded notes. Make an embedding of the question and get the top 5 similar chunks from the vector DB.', go: ['chat>vec', 'res:vec>chat'], msg: 'top_k(embed("explain lists"), user=u_7, k=5)' },
          { title: 'Build the prompt', text: 'System prompt + retrieved chunks + history (as much as fits) + the new question. The input safety check also happens here. This whole text is the model\'s input.', focus: ['chat'], msg: 'system(1.2k) + docs(2.5k) + history(6k) + question(20) = ~9.7k input tokens' },
          { title: 'Into the queue, then the GPU', text: 'The router picked a model and a cluster. As soon as there is space on a GPU, the request joins the batch: first the prefill of the whole prompt, then token-by-token decode.', go: 'chat>rt>gpu', after: { gpu: { load: 80 } } },
          { title: 'Tokens stream', text: 'Every new token travels straight back, and the browser keeps adding it. The user starts reading right after the first word.', go: 'res:gpu>rt>chat>gw>c', msg: 'event: content_block_delta\ndata: {"delta":{"type":"text_delta","text":"List"}}' },
          { title: 'Done: save + usage', text: 'The last event carries the usage (input/output tokens). The chat service saves the full answer in the DB and sends a usage event to metering.', go: 'chat>db', after: { gpu: { load: 70 } }, msg: 'usage: { input_tokens: 9712, output_tokens: 431 }' },
        ]},
        { name: 'Rate limit (429)', steps: [
          { title: 'Too many requests, too fast', text: 'A free user\'s script is sending many very big prompts in one minute.', flood: { paths: ['c>gw'], n: 6 } },
          { title: 'Token bucket empty', text: 'At the gateway, this user\'s tokens-per-minute bucket is empty. The request never reaches the GPU.', go: 'bad:gw>c', set: { gw: { state: 'warn', sub: 'TPM used up' } }, msg: 'HTTP 429  retry-after: 20\n{"type":"error","error":{"type":"rate_limit_error"}}' },
          { title: 'Why at the gateway?', text: 'The earlier you refuse, the cheaper it is. Rejecting after reaching the GPU queue wastes an expensive place. GPU capacity stayed free for the other users.', set: { gw: { state: '', sub: 'auth + limits' } }, focus: ['gw'] },
        ]},
        { name: 'Overload (529)', intro: 'Now the user is within their limit, but the whole system is full (a new model launch, everyone came at once).', steps: [
          { title: 'Everyone at once', text: 'Millions of users at once. All are within the limit at the gateway, so all go through.', flood: { paths: ['c>gw>chat>rt'], n: 8 }, after: { rt: { state: 'hot', sub: 'long queue' }, gpu: { load: 100, state: 'hot' } } },
          { title: 'Queue full: refuse new work', text: 'The router\'s queue is longer than a set limit. Making people wait longer is useless, because the user will time out anyway. So fail fast: overloaded.', go: 'bad:rt>chat>gw>c', msg: 'HTTP 529  {"type":"error","error":{"type":"overloaded_error"}}' },
          { title: 'Graceful degradation', text: 'The chat app shows the user "it is busy right now, try again", the client retries with exponential backoff, free users can be sent to a smaller model, and paid traffic gets priority. Requests already running finish.', set: { rt: { state: 'warn', sub: 'shedding load' } }, focus: ['rt', 'gpu'] },
        ]},
      ],
    },
    { type: 'callout', tone: 'term', title: '429 vs 529', html: `In Anthropic's API docs, <strong>429 rate_limit_error</strong> means <em>your</em> organization went over its limit. <strong>529 overloaded_error</strong> means the API is crowded because of all users, not because of you. OpenAI also returns 429 for limits. The client's answer is the same for both: retry with exponential backoff + jitter, and respect the <code>retry-after</code> header if there is one. The official SDKs do this retry by themselves.` },

    { type: 'h2', text: 'Deep dive 1: prompt orchestration and the context window' },
    { type: 'p', html: `A model can only see a fixed number of tokens at once: its <strong>context window</strong>. The tokens of the input (system prompt, history, documents, question) <em>and</em> of the answer must all fit in this window. As a long chat goes on, the history becomes bigger than the window. The orchestrator must decide: what to keep, what to leave out.` },
    { type: 'callout', tone: 'term', title: 'New word: context window', html: `<strong>What it is:</strong> the limit of the model's "working memory", in tokens. Text outside it simply does not exist for the model. Like a whiteboard: once it is full, something must be erased.<br><strong>Why it matters:</strong> the bigger the window, the more text at once, but every request is also more expensive (more compute, more GPU memory, as we will see). Every model has a different window; check that model's docs for the exact number.<br><strong>Without it (if you ignore the limit):</strong> a long chat makes the request fail, or an important old fact is silently cut. Theory: the <a href="#/ai-context">context window lesson</a>.` },
    { type: 'p', html: `Run xyz.com chat's orchestrator below. System prompt 1,200 tokens, retrieved documents 2,500, and 4,000 reserved for the answer. Each history turn has a different size (seeded, the same every time):` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="chips llm-win" style="padding:0"><button type="button" class="chip" data-w="8000">8k window</button><button type="button" class="chip on" data-w="32000">32k</button><button type="button" class="chip" data-w="200000">200k</button></div>
        <div class="row2" style="margin-top:10px">
          <div><label for="llm-turns">Turns in the chat so far: <strong class="o-tv"></strong></label><input id="llm-turns" type="range" min="1" max="200" step="1" value="60"></div>
          <div><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" class="llm-sum"> Summarize the old history (800 tokens)</label></div>
        </div>
        <div class="llm-bar" style="display:flex;height:26px;border-radius:var(--r-sm);overflow:hidden;border:1px solid var(--line);margin:10px 0 4px"></div>
        <div style="font-size:12px;color:var(--ink-2);margin-bottom:8px;display:flex;flex-wrap:wrap;row-gap:4px"><span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px"><span style="width:10px;height:10px;border-radius:2px;background:var(--accent-soft);border:1px solid var(--line)"></span>system</span><span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px"><span style="width:10px;height:10px;border-radius:2px;background:var(--cache-f);border:1px solid var(--line)"></span>docs</span><span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px"><span style="width:10px;height:10px;border-radius:2px;background:var(--surface-2);border:1px solid var(--line)"></span>summary</span><span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px"><span style="width:10px;height:10px;border-radius:2px;background:var(--line-2);border:1px solid var(--line)"></span>history</span><span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px"><span style="width:10px;height:10px;border-radius:2px;background:var(--amber);border:1px solid var(--line)"></span>question</span><span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px"><span style="width:10px;height:10px;border-radius:2px;background:var(--bg);border:1px solid var(--line)"></span>empty</span><span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px"><span style="width:10px;height:10px;border-radius:2px;background:var(--line);border:1px solid var(--line)"></span>for the answer</span></div>
        <div class="stats">
          <div class="stat"><span>Input tokens (is message)</span><strong class="o-in"></strong></div>
          <div class="stat"><span>History turns kept</span><strong class="o-kept"></strong></div>
          <div class="stat"><span>Turns dropped</span><strong class="o-drop"></strong></div>
          <div class="stat"><span>Total input tokens in the whole chat</span><strong class="o-cum"></strong></div>
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
        el.querySelector('.llm-bar').innerHTML = seg(SYS, 'var(--accent-soft)', 'system') + seg(DOCS, 'var(--cache-f)', 'docs') + seg(p.summary, 'var(--surface-2)', 'summary') + seg(p.hist, 'var(--line-2)', 'history') + seg(Q, 'var(--amber)', 'Q') + seg(Math.max(0, free), 'var(--bg)', 'empty') + seg(RES, 'var(--line)', 'for the answer');
        el.querySelector('.o-in').textContent = f(p.input);
        el.querySelector('.o-kept').textContent = p.kept + ' / ' + n;
        el.querySelector('.o-drop').textContent = p.drop;
        el.querySelector('.o-cum').textContent = f(cum);
        el.querySelector('.o-note').textContent = p.drop === 0
          ? `The whole history fits. But notice: every new message sends the whole old chat again, so in a chat of ${n} turns the model processed ${f(cum)} input tokens in total. Longer chat = every message costs more.`
          : `${p.drop} old turns did not fit in the window${sum ? '; an 800-token summary was kept in their place (the model will roughly remember what happened)' : ', and without a summary the model forgot them completely'}. The input has now stopped at ~${f(p.input)}, because the window is full. Total for the whole chat: ${f(cum)} input tokens.`;
      };
      el.querySelectorAll('.llm-win .chip').forEach(b => b.addEventListener('click', () => { el.querySelectorAll('.llm-win .chip').forEach(x => x.classList.toggle('on', x === b)); W = Number(b.dataset.w); upd(); }));
      el.querySelector('#llm-turns').addEventListener('input', upd); el.querySelector('.llm-sum').addEventListener('change', upd); upd();
    }},
    { type: 'list', items: [
      `<strong>Drop the oldest (sliding window)</strong>: the simplest. Downside: it forgets important early facts ("my name is Riya, I am a beginner").`,
      `<strong>Summarize</strong>: make a short summary of the old part with a cheap model call and keep that. Details are lost, but the main idea survives.`,
      `<strong>Retrieve</strong>: put old history or the user's "memory" into the vector DB, and bring back only the pieces similar to the question. This is RAG.`,
    ]},
    { type: 'h3', text: 'Retrieval (RAG): why a vector DB?' },
    { type: 'p', html: `The user uploaded a 300-page PDF. Put the whole PDF in the prompt every time? It might not even fit in the window, and if it does, every question becomes expensive. Solution: at upload time, cut the PDF into small <strong>chunks</strong> (for example 500 tokens), make an <strong>embedding</strong> of each chunk (a vector of its meaning, seen in the <a href="#/search">Search lesson</a>) and store it in the vector DB. When a question comes, make its embedding, bring the 5-10 most similar chunks, and put only those in the prompt. This is the common industry approach; exactly how the ChatGPT/Claude apps do it inside is not public.` },
    { type: 'callout', tone: 'term', title: 'New word: RAG (retrieval-augmented generation)', html: `<strong>What it is:</strong> before the model answers, find relevant text from outside and give it in the prompt. Like an open-book exam: if you do not remember, find the right page in the book and read it.<br><strong>Why we need it:</strong> the model's own "knowledge" is from training time. With RAG it can also answer about your documents or today's news, without putting the whole file in the prompt.<br><strong>Without it:</strong> the model knows nothing about your files, or you must send the whole file with every question.<br><strong>Limit:</strong> if retrieval brings the wrong chunk, the model can confidently give a wrong answer. In depth: the <a href="#/ai-rag">RAG lesson</a>.` },
    { type: 'h3', text: 'Prompt caching: same beginning, why do the work again?' },
    { type: 'p', html: `In every message the system prompt and old history stay the <em>same</em>; only the new question is added at the end. Making the model read this same prefix from the start every time (prefill) wastes the GPU. <strong>Prompt caching</strong>: keep the processed state of the prefix for a while, and reuse it in the next request. According to Anthropic's docs (2026): the cache works on a prefix (tools → system → messages, up to a breakpoint), the default lifetime is 5 minutes (a 1-hour option also exists), and tokens read from the cache are billed at about 10% of the base input price (even less on some newer models), while writing to the cache costs a bit more (1.25x for the 5-minute cache). It needs an exact prefix match: change one character, and the cache misses. Design lesson: <strong>put what does not change at the start of the prompt</strong>, and what changes (a timestamp, the new question) at the end.` },
    { type: 'h2', text: 'Deep dive 2: what happens on the GPU, prefill and decode' },
    { type: 'p', html: `A model makes <strong>only one next token</strong> at a time. Then that token is added to the input, and the next one is made. So one request runs in two completely different phases:` },
    { type: 'compare',
      left: { title: 'Prefill (reading the prompt)', html: `The whole prompt (say 9,000 tokens) is processed <strong>at once</strong>, because all its tokens are already known. The GPU's thousands of cores are filled: <strong>compute-bound</strong>. At the end of it, the first output token comes. Long prompt = long prefill = higher TTFT.` },
      right: { title: 'Decode (writing the answer)', html: `Each step makes only <strong>one</strong> new token per request. At every step, all of the model's weights must be read from GPU memory, but the work done is tiny. The limit is not the GPU's speed but its <strong>memory bandwidth</strong>: <strong>memory-bound</strong>. A 500-token answer = 500 steps, one after another.` },
    },
    { type: 'callout', tone: 'why', title: 'That is why batching is needed', html: `In a decode step, the cost of reading the weights is the same whether you make the token for 1 user or for 32. So make the next token for many users together in one step: the weights are read once, and the work is 32 times more. The vLLM paper (2023) says the same: the decode phase uses very little GPU compute and is memory-bound, so throughput depends on <strong>how many requests fit in the batch</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: batching', html: `<strong>What it is:</strong> running many users' requests together, in one GPU step. Like 40 people travelling together in one bus, instead of 40 separate cars.<br><strong>Why we need it:</strong> the big cost of each step (reading the weights) is paid only once, whether the batch has 1 user or 32. Bigger batch = many times more tokens/s on the same GPU.<br><strong>Without it:</strong> each GPU serves one user at a time. The millions of users from the napkin maths would need many times more GPUs.` },
    { type: 'h3', text: 'Static batching vs continuous batching' },
    { type: 'p', html: `The old way (<strong>static</strong> or request-level batching): make a batch of 4 requests, run it until all of them finish, then the next batch. Problem: answers have different lengths. A 3-token answer is finished, but its slot sits empty until the longest answer in the batch (14 tokens) is done. And a newly arrived request waits for the whole batch.` },
    { type: 'p', html: `<strong>Continuous batching</strong> (the Orca paper, OSDI 2022, called it <em>iteration-level scheduling</em>): scheduling happens at every <em>decode step</em>. As soon as a request's answer is finished, a new request from the queue takes its place at once. Try it yourself below. Each row is a GPU batch slot, each column is a step. Dark colour = prefill step (the first token), light = decode, striped = an empty/wasted slot:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center">
          <div class="chips llm-sp" style="padding:0"><button type="button" class="chip" data-v="0">Same length answers</button><button type="button" class="chip" data-v="0.5">A little different</button><button type="button" class="chip on" data-v="1">Very different</button></div>
          <div class="chips llm-b" style="padding:0"><button type="button" class="chip" data-v="2">2 slots</button><button type="button" class="chip on" data-v="4">4 slots</button><button type="button" class="chip" data-v="6">6 slots</button></div>
        </div>
        <div class="row2" style="margin-top:8px">
          <div><label for="llm-gap">How fast requests arrive: <strong class="o-gv"></strong></label><input id="llm-gap" type="range" min="0" max="4" step="1" value="2"></div>
          <div style="display:flex;align-items:flex-end"><button type="button" class="btn small ghost llm-seed">New request mix</button></div>
        </div>
        <div style="font-weight:600;margin-top:10px">Static batching</div><div class="llm-g1"></div>
        <div style="font-weight:600;margin-top:8px">Continuous batching</div><div class="llm-g2"></div>
        <div style="overflow-x:auto"><table style="width:100%;font-size:14px;border-collapse:collapse;margin-top:8px"><thead><tr><th style="text-align:left"></th><th>All done (steps)</th><th>Slot utilization</th><th>Avg TTFT</th><th>Worst TTFT</th></tr></thead><tbody class="llm-tb"></tbody></table></div>
        <div class="calc-note o-note"></div>`;
      const GAPS = [0.5, 1, 2, 3, 4], GL = ['all at once', 'very fast', 'fast', 'normal', 'slow'];
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
        el.querySelector('.o-note').textContent = `12 requests (A-L), answers from ${Math.min(...reqs.map(r => r.out))} to ${Math.max(...reqs.map(r => r.out))} tokens, arrival steps: ${reqs.map(r => r.arr).join(', ')}. Continuous batching finished everything in ${b.T} steps (static: ${a.T}), average TTFT went from ${a.avg.toFixed(1)} to ${b.avg.toFixed(1)} steps, and worst TTFT from ${a.worst} to ${b.worst}. In static, the striped cells are slots whose answer was already finished while the longest answer in the batch was still running. TTFT = from arrival to the first token (the prefill step).`;
      };
      el.querySelectorAll('.llm-sp .chip').forEach(c => c.addEventListener('click', () => { el.querySelectorAll('.llm-sp .chip').forEach(x => x.classList.toggle('on', x === c)); spread = Number(c.dataset.v); upd(); }));
      el.querySelectorAll('.llm-b .chip').forEach(c => c.addEventListener('click', () => { el.querySelectorAll('.llm-b .chip').forEach(x => x.classList.toggle('on', x === c)); B = Number(c.dataset.v); upd(); }));
      el.querySelector('#llm-gap').addEventListener('input', upd);
      el.querySelector('.llm-seed').addEventListener('click', () => { seed = seed * 48271 % 2147483647; upd(); });
      upd();
    }},
    { type: 'callout', tone: 'tip', title: 'What to look at', html: `With the defaults ("very different" lengths, 4 slots, fast arrivals), static batching takes 43 steps and continuous takes 35; the average TTFT drops from about 8.7 to about 3.2 steps. Choose "same length answers": static wastes less, because all finish together, but new requests still wait. Now, with "same length", move the slider to "all at once": both are exactly equal (24 steps). So the benefit of continuous batching comes from two things: <strong>differences in answer lengths</strong> and <strong>requests arriving all the time</strong>, and real chat traffic has both. With "slow", the GPU is often idle anyway, so the difference shows mostly in TTFT. In this toy model, continuous is never slower than static.` },
    { type: 'p', html: `Real numbers: the Orca paper (OSDI 2022) reported <strong>36.9x throughput</strong> at the same latency compared with NVIDIA FasterTransformer on GPT-3 175B. In Anyscale's June 2023 benchmark, continuous batching + PagedAttention (vLLM) showed up to <strong>23x</strong> throughput over naive static batching, most when output lengths varied a lot. Today almost all serving engines, like vLLM, TGI, TensorRT-LLM and SGLang, do continuous batching.` },
    { type: 'callout', tone: 'why', title: 'Interview depth: prefill blocks decode', html: `A new user's 50,000-token prompt arrived. Its prefill is a big, compute-heavy step, and during it, the decode of the other users in the batch gets stuck (their tokens arrive in jerks). Research gives two answers: <strong>chunked prefill</strong> (Sarathi-Serve, OSDI 2024): cut the long prompt into pieces and run one piece + the ongoing decodes together in each step. And <strong>prefill-decode disaggregation</strong> (DistServe, OSDI 2024): prefill and decode on separate GPUs, with the KV cache transferred between them. Trade-off: more complexity and network transfer, and in return TTFT and tokens/s can be tuned separately.` },

    { type: 'h2', text: 'Deep dive 3: the KV cache and PagedAttention' },
    { type: 'p', html: `At every decode step, the model needs some "processed state" of <em>all</em> the earlier tokens. Computing it again from the start every time would be very expensive, so this state for each token is kept in GPU memory: the <strong>KV cache</strong>. It is quite big. The vLLM paper's example: for the OPT-13B model, <strong>the KV cache of one token is about 800 KB</strong>, so one request of 2,048 tokens is about 1.6 GB. According to the paper, on a 40 GB A100 GPU, this model's weights take about 65% of the memory and the KV cache gets about 30%.` },
    { type: 'callout', tone: 'term', title: 'New word: KV cache', html: `<strong>What it is:</strong> lists of numbers called "keys" and "values" that attention (the part inside the model that looks at earlier tokens) makes for every token, and that are kept safely in GPU memory. Like writing down the running total in a long sum, so you do not have to add everything from the start each time.<br><strong>Why we need it:</strong> without it, every new token would need all the work for the earlier tokens again: the longer the answer, the slower it gets.<br><strong>Its price:</strong> the maths is in the AI course. For the system, just this: <strong>every request's KV cache grows with each new token, lives in GPU memory, and holds that space until the request ends</strong>. How many users fit in a batch is decided mostly by this.` },
    { type: 'p', html: `Older systems reserved <strong>one continuous (contiguous) space</strong> for each request's KV cache in advance, sized for the maximum possible length (like 2,048 tokens), because nobody knows in advance how long the answer will be. Three kinds of waste: <strong>reserved</strong> (space kept for future tokens), <strong>internal fragmentation</strong> (the answer was short, and the rest of the space was never used), and <strong>external fragmentation</strong> (small gaps left between pieces of different sizes). The vLLM paper (SOSP 2023) measured that in older systems only <strong>20.4% - 38.2%</strong> of KV cache memory held real tokens.` },
    { type: 'p', html: `The idea of <strong>PagedAttention</strong> came from the operating system's <em>virtual memory paging</em>: split the KV cache into small fixed-size <strong>blocks</strong> (vLLM's default: 16 tokens per block). Blocks can be anywhere in memory; each request has a <strong>block table</strong> that says which blocks hold its tokens. A new block is given only when the previous one is full. Waste happens only in the last, half-full block. According to vLLM's June 2023 post, waste fell to <strong>under 4%</strong>. Feel it with the toy calculator (numbers from the paper for OPT-13B: 800 KB/token, about 12 GB of KV memory; request lengths are seeded):` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="llm-kvl">Average real length (tokens): <strong class="o-lv"></strong></label><input id="llm-kvl" type="range" min="50" max="1500" step="50" value="300"></div>
          <div><label for="llm-kvm">Contiguous reserve (max length): <strong class="o-mv"></strong></label><input id="llm-kvm" type="range" min="512" max="4096" step="512" value="2048"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Contiguous: requests fit</span><strong class="o-cn"></strong></div>
          <div class="stat"><span>Contiguous: memory holding real tokens</span><strong class="o-cu"></strong></div>
          <div class="stat"><span>Paged (16-token blocks): requests fit</span><strong class="o-pn"></strong></div>
          <div class="stat"><span>Paged: memory holding real tokens</span><strong class="o-pu"></strong></div>
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
        el.querySelector('.o-note').textContent = `Contiguous: each request holds space for ${max} tokens (${(max * KB / 1e6).toFixed(2)} GB), so only ${cn} requests fit in 12 GB, and only ${Math.round(cu * 100)}% of that space holds real tokens (the strip above: dark = useful, light = wasted). Paged: each request gets only as many 16-token blocks as it needs, so ${pn} requests fit, a ~${(pn / cn).toFixed(1)}x bigger batch.${pu < 0.9 ? ' (For very short requests, the last half-full block becomes a big share too, so here even paged is below 90%.)' : ''} Bigger batch = more tokens/s on the same GPU. This is a toy model: in real systems, weights, activations and scheduling also matter.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `A bonus of paging: <strong>sharing</strong>. If two requests have the same prefix (the same system prompt, or several sample answers to one question), they can share the same physical blocks, and if one wants to write, it copies only then (<em>copy-on-write</em>, just like an OS). Things like prompt caching rest on this kind of prefix reuse. And what if memory still fills up? According to the paper, vLLM <strong>preempts</strong> some requests: it swaps their KV cache to CPU memory, or computes it again later (recompute).` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner mistake', html: `"The batch is small because the GPU ran out of compute." Usually not. In decode, compute is left over; the <strong>KV cache memory</strong> runs out first. That is why long context windows are expensive: one 100k-token chat alone takes as much KV cache as many short chats together. Providers keep a different price or different servers for long context, and this is why a context window is not "free".` },
    { type: 'h2', text: 'Deep dive 4: tokens to the browser, SSE streaming' },
    { type: 'callout', tone: 'term', title: 'New word: SSE (Server-Sent Events)', html: `<strong>What it is:</strong> a normal HTTP response that does not end right away. The server keeps writing new pieces into it every little while (<code>event:</code> and <code>data:</code> lines), and the browser reads each piece as soon as it arrives. Like live cricket commentary: the words come along with each ball.<br><strong>Why we need it:</strong> tokens are made one by one. Send each one as soon as it is made, and the user starts reading from the first word (a small TTFT).<br><strong>Without it:</strong> the user would stare at an empty screen for 20 seconds, and then get the whole answer at once. It would feel like the app was stuck.<br>Basics: the <a href="#/realtime">realtime lesson</a>.` },
    { type: 'p', html: `If the server waits for the whole answer to be made, the user will see an empty screen for 20 seconds. But the tokens are being made one by one anyway, so send them as soon as they are made. Data only goes server → client, so <a href="#/realtime">SSE</a> (Server-Sent Events) is enough: a normal HTTP response that does not end right away, in which the server keeps writing <code>event:</code>/<code>data:</code> lines. The public APIs of both OpenAI and Anthropic use SSE with <code>stream: true</code>. According to Anthropic's docs (2026), the order of one stream is:` },
    { type: 'code', text: `
event: message_start          ← empty message object, input token count
event: content_block_start    ← one content block (text, or tool_use) starts
event: ping                   ← now and then, to keep the connection alive
event: content_block_delta    ← {"type":"text_delta","text":"List"}   (many of these)
event: content_block_stop
event: message_delta          ← stop_reason + usage (output tokens, cumulative)
event: message_stop

At any point in between:  event: error  data: {"type":"error","error":{"type":"overloaded_error"}}` },
    { type: 'p', html: `The event names in OpenAI's Responses API are different (<code>response.created</code>, <code>response.output_text.delta</code>, <code>response.completed</code>, <code>error</code>), but the idea is the same. One important point from both docs: the HTTP status <strong>200 is sent first</strong>, so an error in the middle of the stream does not come as a status code but as an <code>error</code> <strong>event</strong>. The client must handle both. Our chat service also sends its own SSE stream to the browser in the same way (turning the model's events into its own format).` },
    { type: 'p', html: `Now run a stream yourself. This is xyz.com's free plan: a bucket of <strong>4,000 tokens per minute</strong> (a toy number). Each message sends about 1,500 input tokens (system prompt + history + question), and the answer is 48 tokens. Press "Send", watch the events arrive, try "Stop" in the middle, and see what happens when you send a third time. The price is also a "let us assume" price: ₹0.25 for input and ₹1.25 for output, per 1,000 tokens.` },
    { type: 'custom', render(el) {
      const REPLY = 'A list in Python is an ordered collection. You can keep values of different types in it, like numbers and text. A list can be changed: add an item with append, remove the last one with pop. The index starts at zero, so the first item is list[0].'.split(' ');
      const IN = 1500, CAP = 4000, PIN = 0.25, POUT = 1.25, TTFT = 600, STEP = 70;
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">
          <button type="button" class="btn small primary llm-st-send">Send</button>
          <button type="button" class="btn small llm-st-stop">Stop</button>
          <button type="button" class="btn small ghost llm-st-refill">1 minute later (bucket refill)</button>
        </div>
        <div class="stats">
          <div class="stat"><span>Left in the TPM bucket</span><strong class="llm-st-b"></strong></div>
          <div class="stat"><span>Output tokens of this answer</span><strong class="llm-st-o"></strong></div>
          <div class="stat"><span>TTFT (toy)</span><strong class="llm-st-t"></strong></div>
          <div class="stat"><span>Meter: total input / output</span><strong class="llm-st-m"></strong></div>
          <div class="stat"><span>Bill so far</span><strong class="llm-st-c"></strong></div>
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
        q('.llm-st-note').textContent = why === 'end_turn' ? `Answer complete: ${out} output tokens. ${IN} + ${out} = ${IN + out} tokens were taken from the bucket. A usage event went to metering (Kafka → billing).` : `You pressed Stop: only ${out} output tokens were made, and only those are billed. The chat service sent a cancel to the GPU, so the batch slot went to someone else at once.`;
        draw(); };
      const send = () => {
        if (timer) return;
        if (bucket < IN) { q('.llm-st-t').textContent = '-'; log('HTTP 429  retry-after: 60  {"type":"rate_limit_error"}', true);
          q('.llm-st-note').textContent = `429: only ${bucket} tokens are left in the bucket, and this message needs ~${IN} input tokens. The gateway did not let it reach the GPU at all. Press "1 minute later".`; return; }
        sends++; bucket -= IN; mIn += IN; out = 0; q('.llm-st-txt').textContent = ''; q('.llm-st-log').innerHTML = '';
        log('POST /api/chats/c_81/messages  → 200 text/event-stream'); log('event: message_start  data: {"usage":{"input_tokens":' + IN + '}}');
        q('.llm-st-t').textContent = TTFT + ' ms'; draw();
        q('.llm-st-note').textContent = 'Queue + prefill running... the first token is about to come.';
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
      q('.llm-st-refill').onclick = () => { if (timer) return; bucket = CAP; draw(); q('.llm-st-note').textContent = 'A new minute: the bucket is back to 4,000 tokens.'; };
      draw(); q('.llm-st-txt').textContent = '(the answer will stream here)'; q('.llm-st-note').textContent = 'Press Send.';
    }},
    { type: 'p', html: `With the defaults: after the first Send, 4,000 − 1,548 = <strong>2,452</strong> are left in the bucket, after the second <strong>904</strong>, and the third Send brings a <strong>429</strong>, because there is no room for 1,500 input tokens. The bill for two full answers: (3,000 × 0.25 + 96 × 1.25) ÷ 1,000 = <strong>₹0.870</strong>. Notice: input tokens are far more than output, because every message sends the whole history again. That is why prompt caching and keeping the history short save money.` },

    { type: 'flow', title: 'Stream, tools and failures', height: 340,
      nodes: [
        { id: 'c', label: 'Browser', sub: 'EventSource', x: 70, y: 170, w: 110, kind: 'client', info: 'What it is: the user\'s browser. It reads the SSE stream and adds each delta (new piece) to the screen. When Stop is pressed or the tab is closed, it closes the connection.' },
        { id: 'chat', label: 'Chat service', sub: 'stream relay', x: 235, y: 170, w: 140, kind: 'server', info: 'What it is: our chat service, here acting as the stream\'s postman. It relays the model\'s stream to the browser, keeps building the answer as it goes (so a partial answer can be saved on a crash), runs tools, and sends a usage event at the end.' },
        { id: 'tools', label: 'Tools', sub: 'search, code', x: 235, y: 50, w: 140, kind: 'server', info: 'What it is: the model\'s "hands and feet": tools like web search and code execution. The code tool runs in an isolated sandbox. The model only "asks" for a tool; the orchestrator runs it.' },
        { id: 'rt', label: 'Router', sub: 'queue', x: 410, y: 170, w: 130, kind: 'queue', info: 'What it is: the inference router. It sends the request to a healthy (working) GPU node. If a node dies, it picks a new node. It tries to send the same conversation to the same node, so the prefix (KV) cache can be reused.' },
        { id: 'ga', label: 'GPU node A', sub: 'batch: 32 users', x: 610, y: 70, w: 150, kind: 'server', meter: true, load: 75, info: 'What it is: one inference server (a GPU machine). This request\'s KV cache is in this node\'s GPU memory. If the node dies, that cache is gone too.' },
        { id: 'gb', label: 'GPU node B', sub: 'batch: 20 users', x: 610, y: 270, w: 150, kind: 'server', meter: true, load: 50, info: 'What it is: a second inference server with the same model. For failover: if A falls, the work comes here.' },
        { id: 'm', label: 'Kafka → billing', sub: 'usage events', x: 235, y: 290, w: 160, kind: 'queue', info: 'What it is: the metering pipeline. Each request\'s usage (input, output, cached tokens, model, user) becomes an event in Kafka. Consumers: billing, plan quotas, dashboards, abuse detection. The chat answer never waits for any of them.' },
      ],
      edges: [{ a: 'c', b: 'chat' }, { a: 'chat', b: 'rt' }, { a: 'rt', b: 'ga' }, { a: 'rt', b: 'gb' }, { a: 'chat', b: 'm' }, { a: 'chat', b: 'tools' }],
      scenarios: [
        { name: 'Normal stream', steps: [
          { title: 'Request + stream open', text: 'The browser sent the message, the chat service built the prompt and gave it to the router, and the router picked node A.', go: 'c>chat>rt>ga', msg: 'stream: true' },
          { title: 'Prefill, then the first event', text: 'Node A did the prefill of the prompt. As soon as the first token is made, the stream starts. This is the TTFT.', go: 'res:ga>rt>chat>c', msg: 'event: message_start\nevent: content_block_start' },
          { title: 'Deltas keep coming', text: 'Each decode step\'s token goes forward at once. Ping events in between, so that proxies do not cut an idle connection.', flood: { paths: ['res:ga>rt>chat>c'], n: 6 }, msg: 'event: content_block_delta  data: {"delta":{"text":" a"}}' },
          { title: 'Done + usage', text: 'message_delta carries stop_reason and usage. The chat service saves the answer in the DB and puts the usage event in Kafka (async).', parallel: true, go: ['res:ga>rt>chat>c', 'evt:chat>m'], msg: 'event: message_delta  {"usage":{"output_tokens":431}}\nevent: message_stop' },
        ]},
        { name: 'Tool use', intro: 'The model cannot use the internet by itself. It asks for a "tool call", the orchestrator runs it, and gives the result back to the model.', steps: [
          { title: 'Model: I need a search', text: 'Instead of text, a tool_use content block came in the stream, and stop_reason = tool_use.', go: 'res:ga>rt>chat', msg: 'tool_use: web_search({ "query": "IPL 2026 final score" })' },
          { title: 'The orchestrator runs the tool', text: 'The search service is separate and sandboxed. The model never gets direct access to the internet or our servers. The user sees "searching...".', go: ['chat>tools', 'res:tools>chat'] },
          { title: 'Back to the model with the result', text: 'A new inference request with the tool result added to the prompt. The prefix is the same, so the prompt cache helps. One user message = several model calls, which is why cost and latency go up.', go: 'chat>rt>ga' },
          { title: 'Final answer streams', go: 'res:ga>rt>chat>c', text: 'Now the model reads the search results and writes the answer.' },
        ]},
        { name: 'GPU node died mid-stream', steps: [
          { title: 'The stream is running', text: '200 tokens have arrived, and the chat service keeps adding them.', go: 'res:ga>rt>chat>c' },
          { title: 'Node A crashes', text: 'A GPU fault or a machine restart. This request\'s KV cache is gone with it. The router finds out from a health check or from the broken connection.', set: { ga: { state: 'down', sub: 'DOWN', load: 0 } }, go: 'bad:rt>chat', after: { rt: { state: 'warn' } } },
          { title: 'What should the client see?', text: 'HTTP 200 has already gone out, so an error event goes in the stream. The chat service saves the partial answer with a "failed" status, and the user sees a "Regenerate" button.', go: 'bad:chat>c', msg: 'event: error  data: {"type":"error","error":{"type":"api_error"}}' },
          { title: 'Retry on node B', text: 'The router picks node B. There is no KV cache there, so the full prefill runs again (TTFT is paid again). Two options: a fresh answer from the start, or put the partial answer in the prompt and "continue writing". Anthropic\'s docs describe this second way for API clients; tool_use and thinking blocks cannot be resumed halfway.', go: 'chat>rt>gb', after: { rt: { state: '' }, gb: { load: 60 } } },
          { title: 'The stream is back', go: 'res:gb>rt>chat>c', text: 'The user saw a small delay, but got the answer. For billing, the usage of both attempts is recorded separately; how much to charge whom is a business policy.' },
        ]},
        { name: 'User pressed Stop', steps: [
          { title: 'Stream in the middle', text: 'The answer is long, but the user got what they needed in the first 3 lines.', go: 'res:ga>rt>chat>c' },
          { title: 'Connection closed', text: 'The browser closed the stream. If the chat service ignores this, the GPU will keep making the remaining 1,500 tokens for nothing and keep holding a batch slot.', go: 'lost:c>chat' },
          { title: 'Cancel all the way', text: 'Good design: catch the disconnect and cancel the generation, so the slot goes to someone else at once (with continuous batching, from the very next step). The usage of the tokens already made is recorded.', go: 'chat>rt>ga', after: { ga: { load: 70 } } },
        ]},
      ],
    },
    { type: 'callout', tone: 'tip', title: 'Decide: SSE or WebSocket?', html: `The answer only goes server → client, and the user's next message is a normal POST. So <strong>SSE</strong> is enough: plain HTTP, easy with proxies/CDNs/load balancers, built into the browser. Use <strong>WebSocket</strong> when you need constant talk in both directions: voice mode (audio both ways), or live collaborative features. A warning from OpenAI's docs about moderation: in streaming it is hard to judge a partial answer, so output safety checks must also run along with the stream.` },

    { type: 'h2', text: 'Deep dive 5: router, fairness and priority' },
    { type: 'p', html: `Few GPUs, many users. Every second, the router faces this question: which request goes to which GPU group, in what order? Public sources do not give the providers' exact algorithm; these are the things commonly seen in the industry:` },
    { type: 'list', items: [
      `<strong>Model routing</strong>: each model has its own GPU pool. A cheaper/smaller model can handle more traffic; in a crowd, sending free users to a smaller model is one way to degrade.`,
      `<strong>Priority queues</strong>: paid/enterprise traffic gets a separate queue or reserved capacity; free traffic is best-effort. So that one big customer does not eat everyone's GPU, there are per-customer concurrency caps (fair queuing).`,
      `<strong>Cache-aware routing</strong>: send the same conversation to the node where its prefix cache is warm. But this "sticky" routing can also be dangerous: in Anthropic's September 2025 postmortem, a bug sent some requests to the wrong server pool (servers for 1M context), and because routing was sticky, a user who once went to a wrong server kept going there in later messages too. After a load-balancing change, affected requests grew from about 0.8% to a peak of about 16% (Sonnet 4) on one day.`,
      `<strong>Hardware variety</strong>: according to the same postmortem, Anthropic serves Claude on all three: AWS Trainium, NVIDIA GPUs and Google TPUs. So behind the router there can be different hardware platforms, and keeping the output quality the same on all of them is an engineering job of its own.`,
      `<strong>Batch API</strong>: work that is not needed right away (summarising 1 lakh, that is 100,000, documents overnight) goes into a separate, cheaper, async queue. OpenAI's rate-limit docs also suggest the Batch API for non-urgent work. GPU time at peak hours is saved for interactive users.`,
    ]},
    { type: 'callout', tone: 'term', title: 'Rate limits in tokens, quick recap', html: `Details are in the "AI products" part of the <a href="#/rate-limiting">Rate limiting</a> lesson. In short: OpenAI's docs count RPM, RPD, TPM, TPD (and images per minute), and whichever limit fills first applies; a request's tokens are estimated from <code>max_tokens</code> and the input size. Anthropic counts RPM, input tokens per minute and output tokens per minute separately, with a token bucket, and on many models tokens read from the cache do not count toward the input limit. Both report the remaining quota in <code>x-ratelimit-*</code> / <code>anthropic-ratelimit-*</code> headers.` },

    { type: 'h2', text: 'Deep dive 6: metering, billing, safety, observability' },
    { type: 'p', html: `<strong>Metering</strong>: at the end of every response comes the usage (input tokens, output tokens, tokens read from/written to the cache). The chat service turns it into an event and puts it in <a href="#/kafka">Kafka</a>. Consumers: billing (per-token price × model), plan quota ("how much is left this month"), analytics, abuse detection. Why async? Even if the billing DB is slow, the chat must not stop. Why idempotent? If an event arrives twice, there must be no double charge, so each event's <code>request_id</code> is a unique key (<a href="#/pagination-idempotency">idempotency</a>). This is a common design; the internal details of providers' billing pipelines are not public.` },
    { type: 'p', html: `<strong>Safety</strong>: classifiers (separate, smaller models) on both input and output that catch harmful content. The input check happens while the prompt is built; the output check must run along with the stream, which is hard because it must judge half an answer. Tools (code execution) run in a sandbox. This lesson is about the system, so just remember: safety is an <em>extra hop and an extra model</em> that adds to both latency and cost.` },
    { type: 'p', html: `<strong>Observability</strong>: for normal APIs we watch p99 latency. Here there are three numbers: <strong>TTFT</strong> (queue + prefill), <strong>time per output token</strong> (decode speed, how full the batch is), and <strong>queue depth</strong>. Along with them: GPU utilization, KV cache memory use, and error rates (429 vs 529 vs mid-stream errors). One lesson from Anthropic's 2025 postmortem: some quality bugs (like a compiler bug that gave wrong results only for some batch sizes) do not show up on normal latency/error dashboards at all; output quality needs its own checks.` },

    { type: 'h2', text: 'Failure scenarios and bottlenecks' },
    { type: 'table', head: ['What happened', 'Effect', 'Protection'], rows: [
      ['New model launch, 10x traffic', 'Long queues, TTFT in minutes', 'Admission control: 529/overloaded early, plan priority, fallback to a smaller model, waitlist'],
      ['GPU node died mid-stream', 'Error event in the stream, KV cache lost', 'Partial save, retry on another node (re-prefill), "Regenerate" button'],
      ['One customer\'s script flooded us', 'Ate others\' GPU', 'TPM/RPM token buckets at the gateway, per-customer concurrency cap'],
      ['Very long prompt (1 lakh = 100,000 tokens)', 'Big prefill, decode of the other users in the batch stuck', 'Chunked prefill, a separate pool for long-context requests, max context per plan'],
      ['Users closed tabs, generation kept going', 'The GPU is making useless tokens', 'Pass the cancel along on disconnect'],
      ['Chats DB slow', 'Chat history loads slowly, but the GPU is safe', 'Read replicas, cache recent conversations, let a "new chat" work without history'],
      ['Billing pipeline down', 'Usage events stopped', 'They pile up in Kafka and are processed later; the chat keeps running'],
      ['Routing/compiler bug', 'Wrong or strange answers, no errors', 'Quality evals in production, canary rollouts, watch sticky routing'],
    ]},

    { type: 'h2', text: 'How to say it in an interview' },
    { type: 'list', ordered: true, items: [
      `<strong>Requirements:</strong> streaming chat, history, files/RAG, tools, plans. NFRs: TTFT, tokens/s, GPU utilization, fairness, spikes, billing accuracy.`,
      `<strong>Numbers:</strong> concurrent users × tokens/s ÷ per-server throughput = GPU fleet. This shows that the GPU is the most expensive and scarcest thing.`,
      `<strong>Request path:</strong> gateway (auth + token limits) → chat service (history, RAG, fit the context window, safety) → router + queue → GPU → back over SSE.`,
      `<strong>GPU deep dive:</strong> prefill (compute-bound) vs decode (memory-bound), continuous batching, KV cache memory decides the batch size, PagedAttention, prompt caching.`,
      `<strong>Failures:</strong> 429 vs 529, admission control, mid-stream error event + partial save + retry, cancel on disconnect, chunked prefill for huge prompts.`,
      `<strong>Ops:</strong> async metering through Kafka (idempotent), TTFT/TPOT/queue depth dashboards, quality evals because some bugs show no errors.`,
    ]},

    { type: 'diagram', title: 'The whole design at a glance', height: 500,
      caption: 'At the top, the edge (gateway + limits); in the middle, the chat backend; at the bottom left, async metering (usage events), and in the bottom middle, the GPUs. This is a common industry design; the exact internal details of providers are not public. Use the buttons above to see one path at a time.',
      groups: [
        { label: 'Edge', x: 10, y: 14, w: 530, h: 112 },
        { label: 'Chat backend', x: 10, y: 146, w: 700, h: 112 },
        { label: 'Async', x: 10, y: 276, w: 160, h: 214 },
        { label: 'GPUs', x: 190, y: 276, w: 340, h: 214 },
      ],
      nodes: [
        { id: 'browser', label: 'Browser / app', sub: 'chat UI + SSE', x: 90, y: 70, kind: 'client', info: 'What it is: the user\'s browser or app. It POSTs the message and keeps an SSE stream open, where the tokens arrive. When Stop is pressed, it closes the stream.' },
        { id: 'gw', label: 'API gateway', sub: 'auth + RPM/TPM', x: 270, y: 70, kind: 'edge', info: 'What it is: the first door for every request. Login/API key, plan, and rate limits: tokens per minute as well as requests per minute. Over the limit = 429 right here, before reaching the GPU.' },
        { id: 'limits', label: 'Limits store', sub: 'token buckets', x: 450, y: 70, kind: 'cache', info: 'What it is: a fast in-memory store (like Redis) that holds each user\'s/plan\'s token bucket: how many tokens are left this minute. All gateway servers see the same count.' },
        { id: 'db', label: 'Chats DB', sub: 'sharded by user', x: 90, y: 200, kind: 'data', info: 'What it is: the conversation store. All chats and messages, shard key user_id. The model is stateless, so the history comes from here.' },
        { id: 'chat', label: 'Chat service', sub: 'orchestrator', x: 270, y: 200, kind: 'server', info: 'What it is: xyz.com\'s chat backend. It brings the history, finds useful pieces from files/memory, fits everything into the context window, gets the safety check done, sends it to the router, relays tokens to the browser, and at the end saves the message + usage.' },
        { id: 'vec', label: 'Vector DB', sub: 'memory + RAG', x: 450, y: 200, kind: 'data', info: 'What it is: a database that searches by meaning. Chunks of the user\'s files and memory, with their embeddings. The top-k chunks most similar to the question go into the prompt (RAG).' },
        { id: 'obj', label: 'Object storage', sub: 'uploaded files', x: 630, y: 200, kind: 'data', info: 'What it is: the store for the real uploaded files (PDFs, images). On upload, a file is cut into chunks that go into the vector DB.' },
        { id: 'kafka', label: 'Kafka', sub: 'usage events', x: 90, y: 330, kind: 'queue', info: 'What it is: a log of usage events (input, output, cached tokens) for every request. The chat never waits for billing.' },
        { id: 'router', label: 'Router + queue', sub: 'model, priority', x: 270, y: 330, kind: 'queue', info: 'What it is: the traffic police + waiting line in front of the GPUs. It picks the model and GPU pool, gives priority by plan, and if the queue is too long, refuses new work with 529 (overloaded).' },
        { id: 'side', label: 'Safety + tools', sub: 'classifiers, sandbox', x: 630, y: 330, kind: 'server', info: 'What it is: safety classifiers (small separate models) on input/output, and tools (web search, code in a sandbox). The model asks for a tool; the orchestrator runs it.' },
        { id: 'billing', label: 'Billing + quotas', sub: 'per-token price', x: 90, y: 450, kind: 'server', info: 'What it is: makes the bill and the plan quota from usage events. Dedupe by request_id, so even if an event arrives twice, there is no double charge.' },
        { id: 'poolA', label: 'GPU pool', sub: 'batching + KV', x: 270, y: 450, kind: 'server', info: 'What it is: the inference servers. Continuous batching (many users in one GPU step), paged KV cache, prompt caching. Each token is streamed back as soon as it is made.' },
        { id: 'poolL', label: 'Long-context pool', sub: 'big prompts', x: 450, y: 450, w: 150, kind: 'server', info: 'What it is: separate GPU servers for very long prompts, because their prefill is big and their KV cache takes a lot of memory. Keeping them apart stops short chats\' decode from getting stuck.' },
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
        { name: 'Send message', text: 'Browser → gateway (login, token bucket check) → chat service: history (Chats DB) + useful chunks (Vector DB) + safety check → the prompt goes into the router\'s queue → into a batch on the GPU pool.', go: ['browser>gw>limits', 'gw>chat>db', 'chat>vec', 'chat>side', 'chat>router>poolA'] },
        { name: 'Stream reply', text: 'The GPU sends each token as soon as it is made → router → chat service (keeps building the answer) → gateway → browser, over SSE. At the end the message is saved in the DB, and a usage event goes Kafka → billing.', go: ['poolA>router>chat>gw>browser', 'chat>db', 'chat>kafka>billing'] },
        { name: 'Rate limited', text: 'The user\'s tokens-per-minute bucket is empty. The gateway asks the limits store and returns 429 + retry-after at once. The request never reaches the GPU.', go: ['browser>gw>limits'] },
        { name: 'Long context', text: 'A long chat or a big file: the orchestrator takes a summary of old history / only the useful chunks (Vector DB, with files from object storage), and the big prompt goes to the long-context pool, so other users are not stuck.', go: ['chat>db', 'chat>vec>obj', 'chat>router>poolL'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>This is a GPU problem more than a database problem: every answer holds a GPU for seconds, and the GPU is the most expensive and scarcest thing.</li>
      <li>Everything is counted in tokens: work, memory, rate limits (RPM + TPM) and the bill.</li>
      <li>The model is stateless: the chat service brings history from the DB, and the orchestrator fits it into the context window (drop, summary, RAG).</li>
      <li>Token limits at the gateway (429), overload at the router's queue (529): refuse early and protect the GPU.</li>
      <li>Prefill is compute-bound, decode is memory-bound: that is why continuous batching, and the KV cache memory decides the batch size (PagedAttention).</li>
      <li>Tokens stream over SSE: small TTFT. An error in the middle comes as an error event, not a status code. On Stop, cancel the GPU work.</li>
      <li>Usage events go through Kafka to billing, async and idempotent.</li>
    </ul>` },
    { type: 'h2', text: 'The trade-offs we made' },
    { type: 'tradeoffs',
      gains: ['SSE streaming: the user sees the first word at about TTFT, with no wait for the full answer', 'Continuous batching + paged KV cache: many times more users on the same GPU', 'Prompt caching: long chats and big system prompts become cheaper and faster', 'Token-based limits + priority queues: one user/customer cannot eat everyone\'s GPU', 'Async metering: chat keeps running even if billing is slow'],
      costs: ['Stateless model: every message sends the whole history again, so long chats are expensive', 'Bigger batch = more throughput, but each user\'s tokens come a little slower (latency vs throughput)', 'In streaming, the output safety check is hard, and errors come as events instead of status codes', 'Sticky/cache-aware routing: more cache hits, but a risk of load imbalance and routing bugs', 'Summarize/truncate: the model can forget old facts', 'The GPU fleet is very expensive; keep capacity for the peak and it is wasted off-peak (hence the Batch API)'],
    },
    { type: 'think', questions: [
      { q: 'Sending long conversation history is expensive even for free users. What changes will you make in both the product and the system?', a: 'System: summarize the old history or keep it retrieve-only (RAG), and keep a stable prefix for prompt caching. Product: a smaller context window or a smaller model on the free plan, and a suggestion to "start a new chat" after a limit. The goal of both: keep the input tokens of every message under control.' },
      { q: 'One big enterprise customer suddenly sends 20x traffic one day. It is within their limit at the gateway, yet every other user\'s TTFT got worse. What is wrong, and how will you fix it?', a: 'A rate limit only checks "how much", not "the effect on others". The GPU pool is shared, so their requests fill the queue. Fix: a per-customer concurrency cap and fair queuing (a sub-queue per customer, round-robin), reserved/dedicated capacity for enterprise, and acceleration limits on sudden ramps (Anthropic\'s docs also mention such limits).' },
      { q: 'The router sends the same conversation to the same GPU node (for the cache). What happens if that node goes down, and what if there is a bug in the routing table?', a: 'Node down: requests go to another node, the cache misses, the full prefill runs again (TTFT goes up), but it works. Bug: stickiness also makes the mistake stick: the user keeps going to the wrong pool again and again, as happened in Anthropic\'s 2025 postmortem. So add expiry/rebalancing to stickiness, and monitor quality per pool.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Why does a bigger batch increase throughput in the LLM decode phase?', options: ['Decode is compute-bound and a bigger batch makes the GPU run faster', 'Decode is memory-bound: the weights are read once and the next token for many users is made together', 'A bigger batch makes each user\'s tokens arrive faster'], answer: 1, explain: 'In every decode step, the cost of reading the weights from memory is fixed. Do the work of many users together and that same cost is shared. The per-token latency for each user may go up a little.' },
      { q: 'What does continuous batching change compared with static batching?', options: ['It fixes the batch size', 'At every decode step, it puts a new request into the batch in place of a finished one', 'It sends requests to the CPU'], answer: 1, explain: 'Orca called this iteration-level scheduling. Empty slots are filled at once, and a new request does not wait for the whole batch, so both TTFT and throughput improve.' },
      { q: 'Which problem does PagedAttention solve?', options: ['Making the model\'s weights smaller', 'Memory waste (fragmentation) from reserving max-length contiguous space for the KV cache', 'Network latency'], answer: 1, explain: 'It splits the KV cache into 16-token blocks and tracks them with a block table, like OS paging. Waste happens only in the last block, so more requests fit at the same time.' },
      { q: 'A GPU node died in the middle of a stream. How will the client learn about the error?', options: ['From an HTTP 500 status', 'From an error event in the SSE stream, because the 200 status has already gone out', 'It will never find out'], answer: 1, explain: 'In streaming, the headers and status go out at the very start. An error after that comes inside the stream as an event (both the Anthropic and OpenAI docs have an error event).' },
      { q: 'What is the best thing to rate limit for xyz.com chat?', options: ['Only requests per minute', 'Tokens per minute (input + output) together with requests per minute', 'Only the IP address'], answer: 1, explain: 'One request can be 10 tokens or 1 lakh (100,000). The real GPU cost follows the tokens, so both providers also limit tokens.' },
    ]},
    { type: 'sources', note: 'Provider-specific facts come only from these public docs, papers and posts. Most of the internal serving architecture of OpenAI/Anthropic is not public; any part written as the "common industry approach" is not the confirmed design of any company.', items: [
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
      { title: 'Nvidia DGX-B200-HGX (photo)', publisher: 'Wikimedia Commons (Pokiiri, CC BY-SA 4.0)', year: 2025, url: 'https://commons.wikimedia.org/wiki/File:Nvidia_DGX-B200-HGX.jpg', used: 'The photo of an HGX B200 board with 8 GPUs.' },
    ]},
  ],
});
