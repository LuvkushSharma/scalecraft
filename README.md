<div align="center">

<img src="assets/icon.svg" width="88" alt="Scalecraft logo">

# Scalecraft

### System design and AI agents, made simple.

From *"I typed xyz.com, how did the page appear?"* to designing **Uber, Hotstar, UPI and ChatGPT**,<br>
and from *"what is a token?"* to building **AI agents with a working harness**.

**[▶ Open the live site](https://luvkushsharma.github.io/scalecraft/)**

![Lessons](https://img.shields.io/badge/lessons-103-4f46e5?style=for-the-badge)
![Languages](https://img.shields.io/badge/English%20%7C%20Hinglish-both-7c3aed?style=for-the-badge)
![Interactive](https://img.shields.io/badge/every%20lesson-interactive-0ea5e9?style=for-the-badge)
![No build](https://img.shields.io/badge/build%20step-none-16a34a?style=for-the-badge)
![Offline](https://img.shields.io/badge/works-offline-f59e0b?style=for-the-badge)

</div>

---

## ✨ Why Scalecraft?

Most system design material either stays shallow or jumps straight into jargon. Scalecraft is written for a **curious 12-year-old who knows a little programming**, and still goes all the way to **interview depth**.

Every idea follows the same story:

> **current architecture → new problem → why it breaks → the fix → the updated architecture → what it costs**

You don't just read about a load balancer. You **watch requests flow** through it, **kill a server**, see the health check notice, and compare **10 balancing algorithms** side by side.

---

## 🧭 What makes it different

| | |
|---|---|
| 🧩 **Plain language first** | Every lesson opens with **"In simple words"**. Every new term gets a card: *What it is · Why we need it · What breaks without it*, before it is ever used. |
| 🎬 **Interactive request flows** | Animated diagrams you step through: a happy path **and** failure scenarios (server down, cache miss, network partition, timeout...). Click any box to learn its role. |
| 🕹️ **Simulators, not screenshots** | Token bucket vs leaky bucket, Raft elections, consistent hashing rings, B-trees, Bloom filters, Kafka consumer groups, ABR video players, UPI timeouts, LoRA matrix maths, a full **AI agent harness playground**... |
| 🗺️ **Whole-design summary diagram** | Every lesson ends with the complete picture, with buttons that highlight one journey at a time ("Upload", "Watch", "Payment timeout"...), plus a **Remember** recap. |
| 🌐 **English ⇄ Hinglish** | One click switches the entire site. Both versions have the same diagrams, widgets and numbers. |
| 📚 **Research-first real systems** | Real-company lessons are built from engineering blogs, official docs, papers and talks, with a **sources** block at the end. Old posts are dated in the text. |
| ✅ **Checked numbers** | Every worked example and widget output is verified by script before it ships. |
| 📱 **Phone friendly and offline** | Works at 390 px, light and dark mode, **Save offline**, **Add to Home screen**, and a **Listen** button that reads lessons aloud. |

---

## 📖 What you will learn

### Track 1 · System Design (85 lessons)

| Phase | Topics |
|---|---|
| **0 · Start here** | How to use the course |
| **1 · Foundations** | What system design is · how the web works (DNS, TCP, TLS) · TCP/UDP/HTTPS · **public/private keys & key exchange** · IP & ports · HTTP/1.1 → 3 · proxies · REST, pagination, idempotency · GraphQL & gRPC · AuthN/AuthZ, JWT, OAuth · scalability · availability & SPOF · latency, throughput, p99 · concurrency vs parallelism |
| **2 · Building blocks** | Load balancers & all LB algorithms · caching & eviction · CDN · SQL vs NoSQL · indexes, B-tree, LSM · replication · sharding · consistent hashing · queues · Kafka · polling/SSE/WebSockets/webhooks · object storage · rate limiting (5 algorithms) · unique IDs · search · Bloom filter / HyperLogLog / geohash · leader election & locks · API gateway, retries, circuit breakers |
| **3 · Theory, simply** | CAP & PACELC · consistency models & quorums · sagas & 2PC · Raft, Paxos & clocks · monolith vs microservices vs event-driven · batch vs stream · observability, deployments, security |
| **4 · Napkin maths** | Numbers worth remembering · a 5-step estimation recipe · fully worked examples |
| **5 · Decision playbook** | SQL or NoSQL? · Queue, Kafka or pub/sub? · Polling or WebSockets? · Which cache strategy? · Sync or async? · How many servers? |
| **6 · Repeating patterns** | Scaling reads & writes · fan-out · contention · multi-step processes · large blobs · long-running tasks · traffic spikes · "near me" search |
| **7 · Design framework** | A method to design any system in an interview |
| **8 · Real systems** | URL shortener · rate limiter · ID generator & KV store · Pastebin · **notification system** · WhatsApp · Instagram feed · YouTube/Netflix · Google Drive · search autocomplete · BookMyShow · Zomato/Swiggy · web crawler · **Uber** · **Google Maps** · **Google Search** · **JioHotstar live cricket** · **UPI payments** · **ChatGPT/Claude** · Google Docs · top-K leaderboards |

### Track 2 · AI Agents (18 lessons)

| Section | Topics |
|---|---|
| **LLM basics** | What an LLM is · next-token prediction · sampling (temperature, top-k, top-p) · tokenization (BPE, WordPiece, SentencePiece) · embeddings · AI buzzwords decoded |
| **Transformer from scratch** | Matrix maths in 5 minutes · positional encoding (sinusoidal, RoPE, ALiBi) · **self-attention computed by hand** · multi-head attention · one sentence's journey end to end, with every number shown |
| **Training & efficiency** | Pre-training, SFT, RLHF, DPO · **LoRA & QLoRA with full matrix maths** · precision & quantization (32 → 2 bit) |
| **Prompts & context** | Every type of prompt · context windows & context engineering · RAG, chunking, hybrid search, HNSW |
| **Agents** | The agent loop · tool calling · MCP · **harness engineering with an interactive playground** · multi-agent patterns, evals, guardrails · LangChain, LangGraph, CrewAI, OpenAI Agents SDK, Claude Agent SDK, Google ADK and more |

---

## 🚀 Run it locally

No install. No `npm`. No build step. It's plain HTML, CSS and JavaScript.

```bash
git clone https://github.com/LuvkushSharma/scalecraft.git
cd scalecraft
python3 -m http.server 8000
# open http://localhost:8000
```

> Opening `index.html` directly also works. Serve the folder when you want to test offline mode.

### Deploy your own copy

1. Fork this repo.
2. **Settings → Pages →** Source: *Deploy from a branch* → `main` → `/ (root)` → **Save**.
3. Your copy is live at `https://<your-username>.github.io/scalecraft/` in about a minute.

---

## 🗂️ Project structure

```
index.html                    app shell (header, sidebar, language switch)
assets/css/style.css          all styles, light + dark themes
assets/js/curriculum.js       both tracks: phases, lessons, English titles
assets/js/components.js       flow engine, summary diagrams, quiz and every block type
assets/js/app.js              routing, progress, language toggle, offline, listen mode
assets/img/<lesson>/          freely licensed images, credited inside each lesson
content/lessons/<id>.js       Hinglish lesson
content/lessons/en/<id>.js    English twin of the same lesson
content/lessons/_template.js  every block type, with examples
sw.js                         service worker (network first, cache as offline fallback)
```

Lessons are **pure data**. A lesson is a list of blocks: paragraphs, callouts, tables, flows, diagrams, quizzes and custom widgets.

```js
Lesson.register({
  id: 'caching',
  title: 'Cache: hit, miss and Redis',
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: '...' },
    { type: 'flow', nodes: [...], edges: [...], scenarios: [...] },   // animated request flow
    { type: 'custom', render(el) { /* a live simulator */ } },
    { type: 'diagram', nodes: [...], edges: [...], paths: [...] },     // whole-design picture
    { type: 'quiz', questions: [...] },
  ],
});
```

---

## ✍️ Adding a lesson

1. Copy `content/lessons/_template.js` to `content/lessons/<id>.js` and write the Hinglish lesson.
2. Write its English twin at `content/lessons/en/<id>.js` with the same blocks and numbers.
3. Add the lesson to `assets/js/curriculum.js` and its English title to `window.TITLES_EN`.
4. Bump the cache version in `sw.js`, `assets/js/app.js` and `index.html`.

The full writing, accuracy and diagram rules live in [`CLAUDE.md`](CLAUDE.md).

---

## 📏 Content accuracy

- Real-system lessons rely on what the company itself published: engineering blogs, official docs, papers and talks by its engineers.
- When a detail is not public, the lesson says so in plain words and describes the general industry approach.
- Every real-system lesson ends with its **sources**, and old posts are dated in the text.
- Teaching numbers ("let us assume...") are labelled as assumptions.

Found a mistake? Please [open an issue](https://github.com/LuvkushSharma/scalecraft/issues). Corrections are very welcome.

---

## 🖼️ Credits

- Photos and figures come from **Wikimedia Commons** and **OpenStreetMap** under free licences (CC0, public domain, CC BY, CC BY-SA, ODbL). Each one is credited right under the image.
- Fonts: Bricolage Grotesque, Atkinson Hyperlegible and JetBrains Mono via Google Fonts.

---

<div align="center">

Made with ☕ and a lot of diagrams by **[Luvkush Sharma](https://github.com/LuvkushSharma)**

If Scalecraft helped you, please give it a ⭐. It helps others find it.

</div>
