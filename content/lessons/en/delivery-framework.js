Lesson.register({
  id: 'delivery-framework',
  title: 'A method to design any system',
  minutes: 32,
  summary: `So far we have learned the building blocks: Load Balancer, Cache, Queue, Sharding. But in an interview or a design doc, someone says "Design WhatsApp" and the mind goes blank. This lesson gives you a fixed 6-step method (requirements → estimate → entities + API → high-level design → deep dives → wrap up) that works on every problem, with a time budget for each step.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Imagine you know every Lego piece, but someone says "build a house" and you start joining random pieces. A house gets built only when you first think: how many rooms, how big, then the base, then the walls, then the roof. System design works the same way. This lesson teaches a <strong>6-step method</strong> that works on every question: first ask what to build, then how big it is, then the data and APIs, then a simple design, then fix its weak spots, and at the end say what you left out. Each step has a short time limit, so you keep enough time for the most important part.` },
    { type: 'h2', text: 'The problem: you know the blocks, but where do you start?' },
    { type: 'p', html: `Imagine an interviewer at xyz.com says: <em>"Design a Pastebin-like feature for xyz.com: a user pastes text or code, gets a link, and anyone can open the link and read it."</em> You know Cache. You know Sharding. You know Kafka. Still, this often happens:` },
    { type: 'list', items: [
      `In the very first minute you draw 12 boxes on the board: Kafka, microservices, Cassandra... and you do not know which box solves which problem.`,
      `Or you get stuck in numbers for 15 minutes ("1 billion users × 2.3 KB..."), and no time is left for the design.`,
      `Or you draw a design, the interviewer asks "What if the DB dies?", and you have no answer.`,
    ]},
    { type: 'p', html: `The problem is not knowledge. The problem is <strong>order</strong>. If you follow the same sequence every time, your mind knows what to think about now and what to leave for later. This sequence works the same way in interviews, in practice problems, and in real design docs at work.` },
    { type: 'callout', tone: 'term', title: 'Delivery framework', html: `<strong>What it is:</strong> a fixed order (like a checklist) in which a system design is "delivered", which means explained and built.<br><strong>Why we need it:</strong> your mind always knows what to think about now and what comes later. Nothing important gets missed.<br><strong>Without it:</strong> you draw 12 boxes in the first minute, or spend 15 minutes on numbers, or have no answer when something fails.<br><strong>Careful:</strong> the framework does not give you the <em>answer</em>. It shows you <em>the road</em> to the answer.` },

    { type: 'h2', text: 'The whole method at a glance' },
    { type: 'p', html: `First, a small map. Each step is explained in its own section below, in simple words and with a small example. For now, just remember the order.` },
    { type: 'steps', items: [
      { t: '1. Requirements (≈5 min)', d: 'Ask: what will the system do (features), what will it not do, and how fast, how big and how reliable must it be. Put a number on every "how".' },
      { t: '2. Estimate (≈3-5 min)', d: 'Rough numbers: how many requests per second, is reading more common than writing, how much data piles up. After each number, one decision ("so we need a cache").' },
      { t: '3. Core entities and API (≈5 min)', d: 'The main things whose data we store (User, Paste, Ride...) and the requests the app will send to the server.' },
      { t: '4. High-level design (≈10-15 min)', d: 'The simplest design of boxes that makes every feature work: client → Load Balancer → services → database. Then walk one request from start to end, out loud.' },
      { t: '5. Deep dives (≈15-20 min)', d: 'Go back to the "how fast / big / reliable" numbers from Step 1. Find where the design breaks (a crowded spot, a single box that can fail, old data) and fix it. This is where seniority shows.' },
      { t: '6. Wrap up (≈3-5 min)', d: 'Say what you left out and why (trade-offs), which numbers you will watch (monitoring), and what you would do with more time.' },
    ]},
    { type: 'callout', tone: 'why', title: 'Why this order?', html: `Each step is the input for the next step. Without requirements, you do not know what to estimate. Without numbers, you do not know if you need a cache. Without entities and an API, the boxes have no meaning. Without a simple design, what would you deep dive into? And without deep dives, where would the trade-offs come from? If you run the steps in the wrong order, every step is a guess.` },
    { type: 'table', caption: 'Time budget. The ranges come from the roadmap. The 45 and 60 minute columns are a practical split (2-5 minutes are left for the intro at the start and questions at the end).', head: ['Stage', 'Range', '45 min interview', '60 min interview'], rows: [
      ['Requirements', '≈5 min', '5', '5'],
      ['Estimate', '≈3-5 min', '3', '5'],
      ['Entities + API', '≈5 min', '5', '5'],
      ['High-level design', '≈10-15 min', '12', '15'],
      ['Deep dives', '≈15-20 min', '15', '20'],
      ['Wrap up', '≈3-5 min', '3', '5'],
      ['<strong>Total</strong>', '', '<strong>43</strong>', '<strong>55</strong>'],
    ]},
    { type: 'callout', tone: 'tip', title: 'Where does most of the time go?', html: `Look: deep dives get the biggest share (~35%). So the interviewer is not really interested in "draw some boxes". They want to know "what will you do when the boxes break". If 35 minutes are gone by the time you finish the HLD, you have lost the most valuable part. That is why the first 4 steps are <em>kept short on purpose</em>.` },

    { type: 'h2', text: 'Step 1: Requirements (≈5 min)' },
    { type: 'p', html: `The question is always incomplete on purpose. "Design Pastebin" does not tell you if login is needed, how big pastes are, how many users there are, or whether pastes expire. The interviewer wants to see if you <strong>ask</strong>, or if you guess and run. You need two kinds of requirements:` },
    { type: 'callout', tone: 'term', title: 'Functional requirement (FR)', html: `<strong>What it is:</strong> what the system <em>does</em>, in other words a feature. Always write it from the user's side: "Users can create a paste", "Users can open a paste by its link".<br><strong>Why we need it:</strong> this list decides which APIs and boxes will be built.<br><strong>Without it:</strong> you build something nobody asked for, or you forget an important feature.<br><strong>Example:</strong> 3 FRs for xyz Paste: create a paste, read it by its link, let a paste expire after one day. Pick 3-5 core ones, not 15.` },
    { type: 'callout', tone: 'term', title: 'Non-functional requirement (NFR)', html: `<strong>What it is:</strong> <em>how</em> the system should be. Not a feature, a quality. Four common qualities: how fast (latency), how big (scale), how rarely it is down (availability), and how quickly everyone sees correct data (consistency).<br><strong>Why we need it:</strong> these numbers later become the agenda for the deep dives. Cache, replicas and sharding all come because of them.<br><strong>Without it:</strong> "it should be fast" leads to no decision. You need a number: not "fast", but "99% of requests in under 200 ms".<br><strong>Example:</strong> "10M new pastes per day, up 99.9% of the time, no paste is ever lost."` },
    { type: 'callout', tone: 'term', title: 'p99 latency, availability and consistency', html: `<strong>p99 latency:</strong> put 100 requests in a line, sorted by how long they took. The time of the 99th request is the p99. "p99 &lt; 200 ms" means 99 out of 100 requests finish within 200 ms. It is better than the average, because the average hides the slow users.<br><strong>Availability:</strong> what % of the time the system is up. 99.9% = it can be down about 8.8 hours a year; 99.99% = only ~53 minutes.<br><strong>Consistency:</strong> after a write, how quickly everyone sees the new data. <em>Strong</em> = right away, for everyone. <em>Eventual</em> = after a short delay (like 1-2 seconds). Strong is expensive, so first ask: is a short delay fine?` },
    { type: 'callout', tone: 'term', title: 'Out of scope', html: `<strong>What it is:</strong> the things you will <em>not</em> build in this design on purpose, and you say so clearly: "Login, syntax highlighting and editing a paste are out of scope."<br><strong>Why we need it:</strong> the interviewer knows you thought about them and did not just forget. And you save time.<br><strong>Without it:</strong> the design keeps growing, and nothing is finished in 45 minutes.` },
    { type: 'h3', text: 'How to ask clarifying questions' },
    { type: 'p', html: `Good questions are the ones whose answers <strong>change the design</strong>. "Which programming language?" does not change the design. "How big can a paste be?" does (1 KB fits in the DB, 10 MB goes to object storage). A simple checklist:` },
    { type: 'table', head: ['What to ask', 'Example for Pastebin', 'What the answer decides'], rows: [
      ['Who are the users, how many?', '"How many new pastes per day? How many reads?"', 'One DB is enough, or sharding; cache needed or not'],
      ['How big is the data?', '"Max paste size? Average?"', 'Content in the DB or in object storage'],
      ['Read vs write', '"How many times is one paste opened?"', 'Read-heavy → invest in cache/CDN'],
      ['How fresh must it be?', '"Must others see a paste right after it is created?"', 'Strong vs eventual consistency, can we read from a replica'],
      ['How critical is it?', '"Must a paste never be lost? Is a little downtime fine?"', 'Replication, durability, availability target'],
      ['Lifecycle', '"Do pastes expire?"', 'Cleanup job, TTL, storage math'],
    ]},
    { type: 'callout', tone: 'tip', title: 'When the interviewer says "you decide"', html: `Very often the answer is "you tell me". Then state a reasonable assumption and move on: <em>"I will assume 10M new pastes per day and 100 times more reads. Is that okay?"</em> Write the assumption down, so you can come back to it later. Staying silent and asking 10 questions at once are both wrong.` },
    { type: 'compare',
      left: { title: 'Weak requirements', html: `"It's Pastebin, right? Users will paste and read. The system should be scalable and fast, and highly available too."<br><br>No out of scope, no numbers. "Scalable" and "fast" lead to no design decision.` },
      right: { title: 'Strong requirements', html: `<strong>Functional:</strong> (1) a user pastes text and gets a short link; (2) anyone can read it from the link; (3) a paste can have an optional expiry.<br><strong>Out of scope:</strong> login, edit, search, syntax highlighting.<br><strong>NFR:</strong> 10M pastes/day, reads 100:1, read p99 &lt; 200 ms, 99.9% available, a paste is never lost, a new paste may take 1-2 seconds to show up (eventual is OK).` },
    },
    { type: 'callout', tone: 'tip', title: 'Step card 1: Requirements', html: `<strong>Input:</strong> the interviewer's one-line question.<br><strong>What you do:</strong> ask 3-4 questions, write the FRs, say what is out of scope, write the NFRs with numbers.<br><strong>Output (on the board):</strong> three short lists: FR, Out, NFR.<br><strong>Mini example (xyz.com "Like" button):</strong> FR: a user can like/unlike a video, and the video shows its total likes. Out: the list of who liked it. NFR: 2 crore DAU (daily users), each user gives ~10 likes a day, your own like shows right away, others may see the count 5 seconds late (eventual is fine), no like is ever lost.<br><strong>Done when:</strong> every NFR has a number, and the interviewer said "yes, okay".` },
    { type: 'p', html: `Now practise on your own. <strong>Mode 1:</strong> read each line and say whether it is an FR, a good NFR (with a number), or an "empty" NFR with no number. <strong>Mode 2:</strong> you get a product; pick the most important NFR for it.` },
    { type: 'custom', render(el) {
      const SORT = [
        ['Users can upload a video', 'fr', 'This is a feature: what the system does.'],
        ['The video page opens in under 300 ms, 99% of the time', 'nfr', 'A quality + a number (like p99). It leads to a decision: we need a cache/CDN.'],
        ['The system should be fast', 'vague', 'How fast? Without a number, no design decision follows. Ask, or assume: "p99 < 200 ms".'],
        ['Users can comment on a video', 'fr', 'A feature. The API will get an endpoint for it.'],
        ['5 crore video views a day, 3 times more at peak', 'nfr', 'A scale number. It gives the QPS and tells you how many servers you need.'],
        ['The system should be highly scalable', 'vague', 'Every system says this. How many users? How many requests? Give a number.'],
        ['Up 99.95% of the time in a year', 'nfr', 'An availability number: down at most ~4.4 hours a year. It leads to replicas and failover.'],
        ['Users can subscribe to a channel', 'fr', 'A feature: what the system does.'],
        ['Good user experience', 'vague', 'Sounds nice, but it picks no box. Turn it into a latency or availability number.'],
        ['A new comment shows up for others within 5 seconds', 'nfr', 'A consistency number: eventual is fine, up to 5 seconds. So reading from a replica is allowed.'],
        ['The database should be reliable', 'vague', 'Reliable how? Write it clearly, like "no comment is ever lost" or "99.99% available".'],
        ['A user can see their watch history', 'fr', 'A feature. Entity: WatchEvent, API: GET /history.'],
      ];
      const PICK = [
        { p: 'xyz Pay: user A sends ₹500 to user B', o: ['The like count may be 5 seconds late (eventual)', 'The balance is never wrong and never charged twice (strong consistency + durability)', 'Videos play in 4K', 'The feed opens in 500 ms'], a: 1, e: 'With money, "correct a bit later" is not fine. The first NFR is strong consistency and durability. Speed comes second.' },
        { p: 'xyz Chat: sending a message to an online friend', o: ['The message arrives in under ~500 ms and is never lost', 'One backup a day', 'Search results in 2 seconds', 'Profile photos in HD'], a: 0, e: 'The real promise of chat: instant and never lost. The design of WebSockets and the message store comes from this.' },
        { p: 'xyz Live: live score of a cricket final, 5 crore people at once', o: ['Every user gets the score at exactly the same millisecond', 'The score may be 1-2 seconds late, but 5 crore users are online at the same time', 'The score is kept in a permanent archive', 'The admin panel looks nice'], a: 1, e: 'Here scale is the biggest danger. 1-2 seconds late is fine (eventual), which opens the way for CDN and caching.' },
        { p: 'xyz Paste: one paste goes viral on Twitter', o: ['Write p99 < 10 ms', 'Read p99 < 200 ms, reads are 100 times the writes', 'The exact view count of every paste, instantly', 'Colours in the paste editor'], a: 1, e: 'In a read-heavy system, read latency is the most important NFR. Cache and CDN come from it.' },
      ];
      const LAB = { fr: 'FR', nfr: 'Good NFR', vague: 'Empty NFR' };
      el.innerHTML = `<div class="chips dfq-m" style="padding:0">
          <button type="button" class="chip on" data-m="0">Mode 1: sort them</button>
          <button type="button" class="chip" data-m="1">Mode 2: pick the right NFR</button></div>
        <div class="dfq-body" style="margin-top:12px"></div>
        <div class="stats"><div class="stat"><span>Correct</span><strong class="dfq-s">0 / 0</strong></div></div>
        <div class="calc-note dfq-n"></div>`;
      const $ = c => el.querySelector(c);
      let mode = 0, i = 0, ok = 0, done = 0, locked = false;
      const btn = (t, k) => `<button type="button" class="btn small ghost" data-k="${k}" style="margin:4px 6px 0 0;text-align:left">${t}</button>`;
      const draw = () => {
        const list = mode ? PICK : SORT;
        $('.dfq-s').textContent = ok + ' / ' + done;
        if (i >= list.length) { $('.dfq-body').innerHTML = `<div style="color:var(--ink)">Round over: ${ok} / ${list.length} correct.</div>` + btn('Play again', 'again'); $('.dfq-n').textContent = ''; }
        else if (!mode) { const s = SORT[i]; $('.dfq-body').innerHTML = `<div style="font:600 16px var(--f-body);color:var(--ink)">${i + 1}/${SORT.length}. "${s[0]}"</div><div>${btn('FR', 'fr')}${btn('Good NFR', 'nfr')}${btn('Empty NFR', 'vague')}</div>`; }
        else { const s = PICK[i]; $('.dfq-body').innerHTML = `<div style="font:600 16px var(--f-body);color:var(--ink)">${i + 1}/${PICK.length}. ${s.p}</div><div style="display:flex;flex-direction:column;align-items:flex-start">${s.o.map((o, k) => btn(o, k)).join('')}</div>`; }
        locked = false;
        $('.dfq-body').querySelectorAll('[data-k]').forEach(b => b.onclick = () => answer(b.dataset.k));
      };
      const answer = k => {
        if (k === 'again') { i = 0; ok = 0; done = 0; $('.dfq-n').textContent = ''; draw(); return; }
        if (k === 'next') { i++; draw(); return; }
        if (locked) return; locked = true; done++;
        let right, why;
        if (!mode) { right = k === SORT[i][1]; why = `Correct answer: ${LAB[SORT[i][1]]}. ${SORT[i][2]}`; }
        else { right = +k === PICK[i].a; why = `Correct answer: "${PICK[i].o[PICK[i].a]}". ${PICK[i].e}`; }
        if (right) ok++;
        $('.dfq-n').textContent = (right ? 'Correct! ' : 'No. ') + why;
        $('.dfq-s').textContent = ok + ' / ' + done;
        $('.dfq-body').insertAdjacentHTML('beforeend', btn('Next →', 'next'));
        $('.dfq-body').querySelector('[data-k="next"]').onclick = () => answer('next');
      };
      $('.dfq-m').querySelectorAll('.chip').forEach(c => c.onclick = () => { mode = +c.dataset.m; i = 0; ok = 0; done = 0; $('.dfq-n').textContent = ''; $('.dfq-m').querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === c)); draw(); });
      draw();
    }},
    { type: 'h2', text: 'Step 2: Estimate, only the numbers that change the design (≈3-5 min)' },
    { type: 'callout', tone: 'term', title: 'Back-of-envelope estimate (napkin maths)', html: `<strong>What it is:</strong> rough guesses, as if done with a pencil on the back of an envelope. Not the exact answer, only the <em>order of magnitude</em>: is it 100 per second or 1 lakh per second? 1 GB or 100 TB?<br><strong>Why we need it:</strong> a 10x-100x difference is what changes the design. 100/s needs one server; 1 lakh/s needs a cache, replicas, maybe sharding.<br><strong>Without it:</strong> either a needlessly big design for a small system, or a design for a big system that falls over on day one.` },
    { type: 'callout', tone: 'term', title: 'QPS and read:write ratio', html: `<strong>What it is:</strong> QPS (queries per second) = how many requests arrive every second. Read:write ratio = for every one "write" (a new paste), how many "reads" (opening a paste).<br><strong>Why we need it:</strong> QPS tells you how many machines you need. The ratio tells you where to put the effort: many reads → cache, many writes → a database that writes fast.<br><strong>Without it:</strong> you cannot tell whether you need a cache at all.<br><strong>Careful:</strong> "average" QPS is the whole-day number. Real traffic in the evening or in a viral moment is many times higher, so <strong>peak</strong> = average × 2-3 (or more).` },
    { type: 'callout', tone: 'term', title: 'Storage, concurrent connections and DAU', html: `<strong>Storage:</strong> how much data piles up, for example in 5 years. It tells you if one database is enough, or if big blobs must go into <a href="#/object-storage">object storage</a> (a cheap, big file store like S3).<br><strong>Concurrent connections:</strong> how many users have an open connection at the same moment. On a normal website a request comes, the answer goes, and the connection closes. But in chat or a live score the connection stays open for minutes, and every open connection uses some memory on a server.<br><strong>DAU (daily active users):</strong> how many different users open the app in a day. QPS often comes from it: DAU × requests per user ÷ 10<sup>5</sup> seconds.` },
    { type: 'p', html: `Usually just four numbers are enough, and after each one you must say a <strong>conclusion</strong>. A number without a conclusion is useless. Trick: take one day ≈ 86,400 seconds ≈ <strong>10<sup>5</sup> seconds</strong>.` },
    { type: 'table', head: ['Number', 'Maths for xyz Paste', 'Conclusion (this is the real point)'], rows: [
      ['Write QPS', '10M / 10<sup>5</sup> ≈ <strong>100/s</strong>, peak ×3 ≈ 300/s', 'One good DB primary handles this easily. No sharding needed for writes yet.'],
      ['Read QPS + read:write', '100 × 100 ≈ <strong>10,000/s</strong>, peak ≈ 30,000/s', 'Read-heavy (100:1). Cache and CDN are the biggest lever; we must protect the DB.'],
      ['Storage', '10M × 10 KB avg = 100 GB/day → ~36 TB/year → <strong>~180 TB in 5 years</strong>', 'Do not keep the content in one DB. Text blobs go to object storage (like S3), and the small metadata (facts about the paste: id, size, time; ~200 bytes/paste ≈ 3.6 TB in 5 yrs) goes to the DB.'],
      ['Concurrent connections', 'Each request is a short HTTP call, no long connection', 'In this problem this number does not change the design, so skip it. (In a system like chat, this is the most important number: lakhs of WebSockets.)'],
    ]},
    { type: 'compare',
      left: { title: 'Weak estimate', html: `"DAU (daily users) 500M, each user 3.7 pastes, average 9.4 KB, so 17.4 TB per day, 6.35 PB per year, with replication factor 3 that is 19.05 PB, bandwidth 201 MB/s..."<br><br>10 minutes gone, no conclusion. The interviewer is thinking: "So? What does this do to the design?"` },
      right: { title: 'Strong estimate', html: `"~100 writes/s, ~10k reads/s. <strong>So it is read-heavy; we need a cache.</strong> ~180 TB of content in 5 years. <strong>So content goes to object storage, and only metadata to the DB.</strong> Writes are small, <strong>so one primary DB is enough.</strong>"<br><br>2-3 minutes, three design decisions.` },
    },
    { type: 'callout', tone: 'tip', html: `If a number does not change any design decision, it is completely fine to skip it. Some interviewers even skip estimates fully and say "calculate when you need it". Then do a small calculation in the middle of a deep dive, and make the decision with that number right there.` },

    { type: 'callout', tone: 'tip', title: 'Step card 2: Estimate', html: `<strong>Input:</strong> the NFR numbers from Step 1 (users, daily actions, data size).<br><strong>What you do:</strong> work out 3-4 numbers, and after each one say "so...".<br><strong>Output (on the board):</strong> a short list: number → decision.<br><strong>Mini example (xyz.com "Like" button):</strong> 2 crore DAU × 10 likes = 20 crore likes/day ÷ 10<sup>5</sup> ≈ <strong>2,000 likes/s</strong>, peak ×3 ≈ 6,000/s. <em>So:</em> updating one video's row for every like (count++) will get hot on a viral video, so the counter must be split later (deep dive). The like count is read on every video page: assume 50,000 reads/s. <em>So:</em> the count goes in a cache.<br><strong>Done when:</strong> every number has a design decision next to it, and it took less than 5 minutes.` },

    { type: 'h2', text: 'Step 3: Core entities and API (≈5 min)' },
    { type: 'callout', tone: 'term', title: 'Entity and API endpoint', html: `<strong>What it is:</strong> an <em>entity</em> = one of the main "nouns" of the system, the things whose data is stored. For Uber: User, Rider, Driver, Ride, Location. For Pastebin: User and Paste. An <em>API endpoint</em> = a door through which the app asks the server for something, like <code>POST /pastes</code> (create a new paste) or <code>GET /pastes/{id}</code> (get a paste).<br><strong>Why we need it:</strong> before drawing boxes, you must know what data to keep and which requests will come. The boxes exist to serve them.<br><strong>Without it:</strong> the HLD boxes have no meaning; there is no answer to "what will this service do?"<br><strong>Careful:</strong> not the full DB schema yet, only the names and 3-4 important fields.` },
    { type: 'code', text: `
Entities
  Paste { id (short code), content_key (where in object storage), size,
          created_at, expires_at, owner_id? }
  User  { id, ... }          // login is out of scope, so only a placeholder

API
  POST /pastes
    body: { "content": "...", "expires_in": "1d" }
    → 201 { "id": "aZ3k9Qx", "url": "https://xyz.com/p/aZ3k9Qx" }

  GET /pastes/aZ3k9Qx
    → 200 { "content": "...", "created_at": "...", "expires_at": "..." }
    → 404 if not found or expired` },
    { type: 'list', items: [
      `<strong>At least one endpoint for every functional requirement</strong>. Requirement 1 → POST, requirement 2 → GET. Requirement 3 (expiry) is covered by one field. If some requirement does not map to an endpoint, something is missing.`,
      `<strong>REST by default</strong> (every thing has a URL, plus verbs like GET/POST/PUT/DELETE), plural nouns (<code>/pastes</code>). For real-time things (chat, live location), also write "events", which travel over an always-open WebSocket connection: <code>ws: message.send</code>, <code>ws: message.new</code>.`,
      `<strong>Never take the user id from the body</strong>; it comes from the auth token you get after login (in the request header). Taking it from the body means anyone could send a request in someone else's name.`,
      `For list endpoints, mention <strong>pagination</strong>: not the whole list at once, but pages of 20, and the next page comes with a "cursor" (a bookmark). For create endpoints, mention an <strong>idempotency key</strong>: the client sends a unique key with each request, so a network retry does not create the same paste twice. One line is enough; details are in <a href="#/pagination-idempotency">this lesson</a>.`,
    ]},
    { type: 'callout', tone: 'tip', title: 'Step card 3: Entities and API', html: `<strong>Input:</strong> the FR list (Step 1).<br><strong>What you do:</strong> write the nouns, then one endpoint or event for each FR.<br><strong>Output (on the board):</strong> 2-4 entities and 2-5 endpoints.<br><strong>Mini example (xyz.com "Like" button):</strong> Entities: <code>Like { user_id, video_id, created_at }</code>, <code>Video { id, like_count }</code>. API: <code>PUT /videos/{id}/like</code> (like), <code>DELETE /videos/{id}/like</code> (unlike), and <code>like_count</code> inside <code>GET /videos/{id}</code>. PUT, because pressing twice must still leave only one like. The user_id does not go in the body; it comes from the login token.<br><strong>Done when:</strong> every FR maps to an endpoint.` },
    { type: 'h2', text: 'Step 4: High-level design (≈10-15 min)' },
    { type: 'p', html: `Now the boxes. But there is only one rule: <strong>the simplest design that meets every functional requirement</strong>. Do not worry yet about scale, failures or viral traffic; that is the job of Step 5. The shape is almost always this: <code>client → LB / API gateway → services → databases</code>.` },
    { type: 'callout', tone: 'term', title: 'High-level design (HLD) and stateless service', html: `<strong>What it is:</strong> HLD = a map of the whole system "seen from far away": which big boxes exist (Load Balancer, services, database, storage) and which road a request takes. Not the code inside, and not every column of every table. A <em>stateless service</em> = a server that does not remember any user's data in its own memory; everything lives in the database or the cache. So any request can go to any copy.<br><strong>Why we need it:</strong> the HLD shows the interviewer how every feature will work. Keeping services stateless lets you put as many copies as you want behind the Load Balancer.<br><strong>Without it:</strong> what would you deep dive into? You first need a working design; only then do its weak spots show.` },
    { type: 'list', ordered: true, items: [
      `Take each API endpoint one by one and ask: which boxes will this request pass through, and where is data written or read?`,
      `Add a new box only when a requirement or an estimate asks for it. Object storage, because the estimate said 180 TB. No cache yet, because the simple design works <em>correctly</em> without a cache; a cache is for "fast", which is an NFR.`,
      `<strong>Walk one request from start to end, out loud</strong>: "The client sends a POST, the LB gives it to any Paste service instance, the service creates a unique ID, puts the content in object storage and the metadata in the DB, then returns 201." This shows the interviewer that the boxes are not just decoration.`,
      `Wherever you see something hard (how will the ID be unique? how will expiry work?), note it in one line: "we will look at this in the deep dive". Do not stop there now.`,
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common beginner mistake', html: `"Simple design" does not mean "weak design". The simple design is the base on which the <em>reason</em> for every improvement becomes visible. If you add Kafka, 5 microservices and Cassandra at the start, and someone asks "why Kafka?", you will have no answer, because no problem has appeared yet that needs Kafka.` },

    { type: 'callout', tone: 'tip', title: 'Step card 4: High-level design', html: `<strong>Input:</strong> the entities, the API and the decisions from the estimate.<br><strong>What you do:</strong> add boxes for each endpoint, then walk one request out loud.<br><strong>Output (on the board):</strong> a diagram of 4-7 boxes and a short "look at in the deep dive" list.<br><strong>Mini example (xyz.com "Like" button):</strong> App → Load Balancer → Like service → Likes DB (table <code>likes(user_id, video_id)</code>, unique as a pair) and <code>like_count</code> in the Videos DB. Walk it: "A PUT arrives, the Like service adds a row to the likes table; if the row already existed, nothing happens; if it is new, like_count +1; return 200." Note: "count++ will get hot on a viral video; deep dive."<br><strong>Done when:</strong> every FR works with this diagram, and you have walked at least one request end to end.` },

    { type: 'h3', text: 'Run it: how a design grows out of the framework' },
    { type: 'p', html: `The diagram below starts empty (only the Client). In the "Framework step by step" scenario, boxes are added at each stage, just like they get added on the board in an interview. The other two scenarios are failures you find in the deep dive. Click each box to read its role too.` },
    { type: 'flow', title: 'xyz Paste: skeleton step by step', height: 360,
      nodes: [
        { id: 'c', label: 'Client', sub: 'browser / app', x: 80, y: 180, w: 120, kind: 'client', info: 'What it is: the user\'s browser or app. The user who creates a paste, or opens a link to read one. Requirements are written from this side: "users can create a paste", "users can read a paste".' },
        { id: 'lb', label: 'LB / Gateway', sub: 'routing, limits', x: 245, y: 180, w: 130, kind: 'net', hidden: true, info: 'What it is: the Load Balancer / API gateway, the one public door of the system. It spreads requests across healthy Paste service instances, ends TLS, and common jobs like rate limiting happen here. In an HLD this is almost always the first box.' },
        { id: 'svc', label: 'Paste service', sub: 'stateless', x: 420, y: 180, w: 140, kind: 'server', meter: true, load: 20, hidden: true, info: 'What it is: our own code (business logic). Its jobs: create a unique short ID, write the content to object storage and the metadata to the DB, join both on a read, check expiry. It is stateless (no user data in its own memory), so you can put as many instances behind the LB as you like.' },
        { id: 'cache', label: 'Redis cache', sub: 'hot pastes', x: 615, y: 60, w: 170, kind: 'cache', hidden: true, info: 'What it is: a fast key-value store kept in RAM. Added in the deep dive, because the estimate said reads are 100:1. The metadata (and small content) of popular pastes sits in RAM, served in ~1 ms. It protects the DB and object storage from every read. A TTL is set along with the expiry, so an expired paste is not served from the cache.' },
        { id: 'db', label: 'Metadata DB', sub: 'id → info', x: 615, y: 180, w: 170, kind: 'data', meter: true, load: 10, hidden: true, info: 'What it is: the database that keeps the facts (metadata) about each paste. One small row per paste: id, content_key, size, created_at, expires_at. ~200 bytes per paste, ~3.6 TB in 5 years. The only access pattern is "look up by id", so a key-value store or a simple SQL table both work. This is the source of truth.' },
        { id: 'blob', label: 'Object storage', sub: 'paste content', x: 615, y: 300, w: 170, kind: 'data', hidden: true, info: 'What it is: a file store like S3, cheap and very durable for big blobs that never change. The estimate said ~180 TB in 5 years, which would be costly and slow in one DB. The DB keeps only its key (content_key).' },
        { id: 'cdn', label: 'CDN', sub: 'edge copies', x: 245, y: 300, w: 130, kind: 'edge', hidden: true, info: 'What it is: a CDN, edge servers spread around the world that keep copies. Added in the deep dive: it serves a viral paste from edge servers close to users everywhere. If the same paste is asked for again and again, the request never reaches our servers. Trade-off: after a delete or expiry, an old copy can stay on the edge until its TTL ends.' },
      ],
      edges: [
        { a: 'c', b: 'lb' }, { a: 'lb', b: 'svc' }, { a: 'svc', b: 'db' }, { a: 'svc', b: 'blob' },
        { a: 'svc', b: 'cache' }, { a: 'c', b: 'cdn' }, { a: 'cdn', b: 'lb' },
      ],
      scenarios: [
        { name: 'Framework step by step', intro: 'The board is empty. Press "Start" and watch the design grow with each stage.', steps: [
          { title: 'Requirements: what to build', focus: ['c'], set: { c: { sub: 'create + read' } }, text: 'No boxes yet! First, 3 functional requirements: create a paste, read it by link, optional expiry. Out of scope: login, edit, search. NFRs: reads p99 &lt; 200 ms, 99.9% available, a paste is never lost.', msg: 'FR: create, read, expiry\nOut: login, edit, search\nNFR: p99 < 200ms, 99.9%, durable' },
          { title: 'Estimate: how big', focus: ['c'], text: 'Three numbers, three conclusions: ~100 writes/s (one DB primary is enough), ~10k reads/s (read-heavy, a cache will help later), ~180 TB of content in 5 years (content goes to object storage).', msg: 'writes ~100/s | reads ~10k/s (100:1) | ~180 TB / 5 yr' },
          { title: 'Entities and API', focus: ['c'], text: 'Nouns: Paste (and a User placeholder). Two endpoints, one for each functional requirement. Now we know what work the boxes must do.', msg: 'POST /pastes      { content, expires_in }\nGET  /pastes/{id}' },
          { title: 'High-level design: the simplest one', show: ['lb', 'svc', 'db', 'blob'], focus: ['lb', 'svc', 'db', 'blob'], text: 'Client → LB → stateless Paste service → Metadata DB + Object storage. Object storage, because the estimate said 180 TB. Cache and CDN <strong>not yet</strong>: the design works correctly without them.' },
          { title: 'Walk one write end to end', go: ['c>lb>svc', 'svc>blob', 'svc>db', 'res:svc>lb>c'], text: 'The service creates the ID, puts the content in object storage first, then the metadata row in the DB (content first, so a DB row never points to a missing blob), then returns the link.', msg: 'POST /pastes → 201 { id: "aZ3k9Qx" }' },
          { title: 'Walk one read end to end', go: ['c>lb>svc', 'svc>db', 'svc>blob', 'res:svc>lb>c'], text: 'Metadata by ID (check expiry), then the content by content_key. It works. Now the question: does it also meet the NFRs? This is where the deep dive starts.', msg: 'GET /pastes/aZ3k9Qx → 200' },
          { title: 'Deep dive: reads 100:1 → cache', show: ['cache'], go: ['c>lb>svc', 'svc>cache', 'res:svc>lb>c'], set: { db: { state: 'dim' }, blob: { state: 'dim' } }, after: { cache: { state: 'hit' } }, text: 'The "read-heavy" conclusion from the estimate pays off now. Popular pastes come from Redis in ~1 ms. The load on the DB and object storage drops a lot.' },
          { title: 'Deep dive: viral + global → CDN', show: ['cdn'], go: ['c>cdn', 'res:cdn>c'], set: { cache: { state: '' } }, after: { cdn: { state: 'hit' } }, text: 'A paste never changes (it is immutable), so caching it on a CDN is safe and cheap. A nearby edge server answers; the request never reaches our servers.' },
          { title: 'Wrap up', set: { db: { state: '' }, blob: { state: '' }, cdn: { state: '' } }, focus: ['cache', 'cdn', 'blob'], text: 'Trade-offs: because of the cache/CDN, an expired or deleted paste can still show until its TTL ends; object storage is cheap but slower than a DB. Monitor: p99 read latency, cache hit ratio, DB CPU, 5xx rate. With more time: an expiry cleanup job, abuse/spam detection, rate limiting per IP.' },
        ]},
        { name: 'Deep dive: viral paste', intro: 'Only the simple HLD (no cache, no CDN). One paste goes viral on Twitter. The NFR says p99 &lt; 200 ms. What happens?', steps: [
          { title: 'Simple HLD, a normal day', show: ['lb', 'svc', 'db', 'blob'], go: ['c>lb>svc>db', 'res:db>svc>lb>c'], text: 'With normal traffic everything is fine. Every read goes to the DB and object storage.' },
          { title: 'Viral: 30k reads/s on one paste', flood: { paths: ['c>lb>svc>db'], n: 14 }, after: { db: { state: 'hot', sub: '30k reads/s', load: 95 }, svc: { load: 80 } }, text: 'All requests hit one row (one key). This is called a <strong>hot spot / hot key</strong>. The DB CPU is at 95%, and queries start waiting in line.' },
          { title: 'Why it fails: the NFR breaks', go: 'bad:db>svc>lb>c', text: 'Latency goes above 200 ms, and some requests time out. Worst of all: every other normal paste is slow too, because everyone shares the DB. One paste brought down the whole feature.', msg: '504 Gateway Timeout' },
          { title: 'Fix 1: cache (hot key in RAM)', show: ['cache'], set: { db: { state: '', sub: 'id → info', load: 15 } }, flood: { paths: ['c>lb>svc>cache'], n: 10 }, after: { cache: { state: 'hit', sub: 'viral paste' } }, text: 'After the first read, the paste is in Redis. Now 30k reads/s come from RAM. The DB is calm again. (With a very big hot key, even one Redis node can get hot; then add a small cache in the service\'s own memory, or Redis replicas.)' },
          { title: 'Fix 2: CDN (requests never arrive)', show: ['cdn'], set: { cache: { state: '' }, svc: { load: 20 } }, flood: { paths: ['c>cdn'], n: 10 }, after: { cdn: { state: 'hit', sub: 'serving viral' } }, text: 'The paste is immutable, so keep it on the CDN edge. Most requests never even reach our LB. Trade-off: a deleted paste can show until the CDN TTL ends, so keep the TTL short or purge the CDN on delete.' },
        ]},
        { name: 'Deep dive: DB primary died', intro: 'The classic deep dive question: "What happens if this box dies?" Ask it for every box. Here, the Metadata DB.', steps: [
          { title: 'Full design, all fine', show: ['lb', 'svc', 'db', 'blob', 'cache'], go: ['c>lb>svc>cache', 'res:svc>lb>c'], text: 'The design runs with the cache.' },
          { title: 'DB primary crashes', set: { db: { state: 'down', sub: 'DOWN' } }, focus: ['db'], text: 'There was only one Metadata DB. It is a <strong>SPOF (single point of failure)</strong>: when it falls, no new pastes can be created.' },
          { title: 'Writes fail', go: ['c>lb>svc>db', 'bad:svc>lb>c'], text: 'Even if the content reached object storage, the metadata row cannot be written. The user gets an error. (The left-over blob is now an orphan; a cleanup job can remove it later.)', msg: 'POST /pastes → 503 Service Unavailable' },
          { title: 'Reads: popular ones work, old ones do not', go: ['c>lb>svc>cache', 'res:svc>lb>c', 'c>lb>svc>db', 'bad:svc>lb>c'], text: 'Pastes that were in the cache still work (graceful degradation). Every cache miss fails. The availability NFR (99.9%) is broken.' },
          { title: 'Fix: replica + automatic failover', set: { db: { state: 'ok', sub: 'replica promoted' } }, go: ['c>lb>svc>db', 'res:db>svc>lb>c'], text: 'Keep a standby replica next to the primary. If the primary falls, make the replica the new primary (failover, in seconds). Trade-off: if replication is async, the last few writes can be lost; the NFR says "a paste is never lost", so keep at least one replica synchronous, at the cost of slightly slower writes.' },
        ]},
      ],
    },
    { type: 'h2', text: 'Step 5: Deep dives (≈15-20 min), where seniority shows' },
    { type: 'p', html: `The simple design works. Now take out the NFR list from Step 1 and ask, one by one: <strong>"Does my design meet this number? If not, where does it break?"</strong> You do not invent the deep dive agenda yourself; it comes from your NFRs and estimates. The two failure scenarios in the diagram above were found exactly this way.` },
    { type: 'callout', tone: 'term', title: 'Hot spot, bottleneck and SPOF', html: `<strong>Hot spot:</strong> when the load of everyone lands on one single thing (one row, one key, one server), like 30,000 reads/s on the one row of a viral paste. The other machines are idle; this one is hot.<br><strong>Bottleneck:</strong> the narrowest part of the road. When traffic grows, the box that fills up first sets the speed of the whole system.<br><strong>SPOF (single point of failure):</strong> the single box whose failure takes down the whole system (or a whole feature), because there is no other copy of it.<br><strong>Why we need these words:</strong> a deep dive is the job of finding these three. Put your finger on each box once and ask: "will this get hot? will this fill up first? what if it dies?"` },
    { type: 'table', head: ['What to look for', 'The question to ask yourself', 'Common fix (and its cost)'], rows: [
      ['Hot spots', 'Does the load of everyone land on one key/row/partition? (a viral paste, a celebrity, one popular item)', 'Cache, CDN, splitting the key, replicas. Cost: stale data, complexity'],
      ['Bottlenecks', 'At the peak QPS from the estimate, which box fills up first?', 'Horizontal scaling, read replicas, sharding, async via a queue. Cost: more boxes, harder consistency'],
      ['SPOFs', 'For every box: what if it dies? Is there another copy of it?', 'Replication + failover, multiple instances behind the LB. Cost: money, replication lag'],
      ['Consistency', 'Can some user see old or wrong data? Is that acceptable?', 'Pick strong vs eventual (CAP/PACELC), read-your-writes. Cost: latency or availability'],
      ['Failure scenarios', 'What if the network is slow, a dependency times out, a retry happens, a message arrives twice?', 'Timeouts, retries with backoff, idempotency, circuit breaker, DLQ. Cost: complexity'],
    ]},
    { type: 'list', items: [
      `<strong>2-3 deep dives are enough</strong>, not 10. Start with the biggest risk (the NFR in the most danger). In Pastebin: read latency (hot key) and durability (DB failure). Unique ID generation is a good third topic.`,
      `<strong>Say the cost with every fix.</strong> "I added a cache" is incomplete. "I added a cache; now an expired paste can show until the TTL ends, so TTL = min(expires_at, 1 hour)" is a complete answer.`,
      `<strong>Listen to the interviewer's hints.</strong> At junior level, the interviewer gives the deep dive topic. At senior level, you are expected to run the agenda yourself. But if the interviewer points somewhere ("and what if 1 crore people open this paste?"), drop your plan and go there. They are trying to give you points.`,
      `<strong>Do not give a monologue.</strong> After each deep dive, stop and ask: "Shall we go deeper on this, or move to the next topic?"`,
    ]},

    { type: 'callout', tone: 'tip', title: 'Step card 5: Deep dives', html: `<strong>Input:</strong> the NFR list + the HLD + the "look at in the deep dive" list.<br><strong>What you do:</strong> pick the 2-3 biggest dangers; for each one: problem → why it breaks → fix → cost.<br><strong>Output (on the board):</strong> new boxes in the HLD (cache, replica, queue...) with one trade-off next to each.<br><strong>Mini example (xyz.com "Like" button):</strong> Problem: on a viral video, 6,000 likes/s hit the one <code>like_count</code> row, and a line of DB locks forms. Fix: split the count into 10 separate rows (shards); each like adds +1 to one random row; a read adds up all 10, and that sum is cached for 5 seconds. Cost: the count can be up to 5 seconds old, which the Step 1 NFR allowed.<br><strong>Done when:</strong> the most dangerous NFR has an answer, and you asked "what if it dies?" once for every box.` },

    { type: 'h2', text: 'Step 6: Wrap up (≈3-5 min)' },
    { type: 'p', html: `In the last minutes, three things, short and clear:` },
    { type: 'callout', tone: 'term', title: 'Monitoring and metric', html: `<strong>What it is:</strong> a metric = a number the system keeps reporting, like p99 latency, 5xx errors per minute, or cache hit ratio (what % of reads were found in the cache). Monitoring = watching these numbers on a dashboard and getting an alert when one crosses a limit.<br><strong>Why we need it:</strong> a design can be right on paper, but how will you know in production that the NFRs are being met? Through metrics.<br><strong>Without it:</strong> you find out only when users complain. Details are in the <a href="#/operations">operations lesson</a>.` },
    { type: 'list', ordered: true, items: [
      `<strong>Trade-offs you made</strong>: "I took eventual consistency for read speed; I took object storage for cost, at the price of latency."`,
      `<strong>What you will monitor</strong>: "p99 read latency, cache hit ratio, DB CPU and replication lag, 5xx rate, object storage errors. Alert if the hit ratio falls below 90%."`,
      `<strong>With more time</strong>: "A cleanup job for expired pastes, spam/abuse detection, per-IP rate limiting, multi-region."`,
    ]},
    { type: 'compare',
      left: { title: 'Weak wrap up', html: `"So this is my design. It is scalable and highly available. Anything else?"<br><br>Every design claims to be "scalable". It says nothing new.` },
      right: { title: 'Strong wrap up', html: `"Three big trade-offs: (1) because of the CDN/cache, a deleted paste can show for ~1 hour; (2) the sync replica makes writes ~5-10 ms slower, but no paste is lost; (3) sequential IDs are guessable, so I scrambled them. Monitor: p99, hit ratio, replication lag. Next work: a cleanup job and abuse detection."` },
    },

    { type: 'callout', tone: 'tip', title: 'Step card 6: Wrap up', html: `<strong>Input:</strong> the trade-offs from the deep dives.<br><strong>What you do:</strong> 3 big trade-offs, 2-3 metrics, 1-2 "next work" items.<br><strong>Output:</strong> a short 30-60 second summary.<br><strong>Mini example (xyz.com "Like" button):</strong> "The count can be up to 5 seconds old, for speed. The unique (user, video) pair stops double likes. Monitor: like API p99, load on the count shards, cache hit ratio. With more time: stopping fake likes from bots."<br><strong>Done when:</strong> the interviewer knows what you left out and why.` },
    { type: 'h2', text: 'The skeleton almost every design grows from' },
    { type: 'p', html: `The roadmap gives a generic skeleton. Almost every real system (Uber, WhatsApp, YouTube, Zomato) is some version of it. In each case study, your job is to decide <strong>which boxes to add, remove or scale, and why</strong>.` },
    { type: 'p', html: `You have met every box in earlier lessons. A one-line reminder: <strong>DNS</strong> turns a name (xyz.com) into a server address. <strong>CDN</strong> keeps copies close to users. <strong>Load balancer / API gateway</strong> spreads requests across servers. <strong>Redis cache</strong>: fast copies in RAM. <strong>Primary DB + read replicas</strong>: one database you write to, plus copies of it you read from. <strong>Kafka / queue + workers</strong>: a line of jobs that background workers do later. <strong>Object storage</strong>: a cheap store for big files.` },
    { type: 'ascii', caption: 'Generic skeleton. Pastebin used Client, LB, Service, Cache, DB, Object storage and CDN from it; it did not need Kafka/workers (yet).', text: `
                               Client app
                                   │
            ┌──────────────────────┼─────────────────────────┐
            v                      v                         v
           DNS          CDN: static and media      Load balancer / API gateway
                                                         │            │
                                                     Service A     Service B
                                                     │      │          │
                                                     v      v          v
                                              Redis cache  Primary DB  Kafka / queue
                                                              │            │
                                                              v            v
                                                       Read replicas    Workers
                                                                           │
                                                                           v
                                                                    Object storage` },
    { type: 'table', head: ['Box', 'When to add it (which requirement/number asks for it)'], rows: [
      ['Cache', 'Read-heavy (read:write 10:1 or more), a tight latency target, or the same thing is asked for again and again'],
      ['CDN', 'Static/media content, users around the world, things that never change'],
      ['Read replicas', 'More reads than one DB can take, and slightly old data is fine'],
      ['Kafka / queue + workers', 'Work the user\'s response does not need (emails, analytics, thumbnails), absorbing traffic spikes, many consumers for one event'],
      ['Object storage', 'Big blobs: images, videos, files, or lots of text'],
      ['Service A / B split', 'Different parts scale at different speeds, or different teams own them. "Microservices are good" alone is not a reason'],
    ]},
    { type: 'h2', text: 'Common mistakes (and how to fix them)' },
    { type: 'p', html: `The roadmap names the first four on purpose. The rest are ones that show up again and again in interviews.` },
    { type: 'callout', tone: 'mistake', title: '1. Kafka and microservices before the simple design', html: `In the first 2 minutes: "Kafka, 6 microservices, Cassandra, Kubernetes". The problem: no requirement is asking for them yet. <strong>Fix:</strong> first a simple design that works, then every new box for a reason from an NFR or a number. "Kafka, because click analytics must not slow down the redirect" is fine; "Kafka, because of scale" is not.` },
    { type: 'callout', tone: 'mistake', title: '2. A 10-minute estimate with zero conclusions', html: `Lots of numbers, down to the decimal, and at the end "so it is a big system". <strong>Fix:</strong> 3-5 minutes, 3-4 numbers, and after each one a "so...": "10k reads/s, so a cache". Skip any number that does not change a decision.` },
    { type: 'callout', tone: 'mistake', title: '3. Naming a technology without a reason', html: `"We will use MongoDB here." Why? "Because it is scalable." That is not an answer. <strong>Fix:</strong> first say the access pattern, then the technology: "Only lookups by id, no joins, TBs of data, so a key-value store; something like DynamoDB or Cassandra." Technologies can change; the reasoning is the real answer.` },
    { type: 'callout', tone: 'mistake', title: '4. Never asking "what if this box dies?"', html: `The design has one DB, one cache, one ID generator, and no failure of any of them was discussed. <strong>Fix:</strong> in the deep dive, put your finger on each box once and say: "what happens if this falls, and what will the user see?" Replica, failover, fail-open/fail-closed, graceful degradation: one of these applies to every box.` },
    { type: 'callout', tone: 'mistake', title: '5. Starting without clarifying questions', html: `You hear "Design Twitter" and start drawing. Later you learn the interviewer only wanted the timeline, not DMs. <strong>Fix:</strong> first 5 minutes of requirements and out of scope. Whatever you do not know, state as an assumption and write it down.` },
    { type: 'callout', tone: 'mistake', title: '6. Not stating trade-offs', html: `Every decision was called "the best". In real engineering nothing is free: cache = stale data, sharding = hard cross-shard queries, async = eventual consistency. <strong>Fix:</strong> one line with every big decision: "this gives us X, it costs Y, and Y is fine here because..."` },
    { type: 'callout', tone: 'mistake', title: '7. Time management: 35 minutes on the HLD', html: `So much time went into making the boxes perfect that only 5 minutes were left for the deep dive, even though that part earns the most marks. <strong>Fix:</strong> watch the clock. By ~25 minutes, the HLD is done and one request has been walked end to end. The practice tool below builds this habit.` },
    { type: 'callout', tone: 'mistake', title: '8. Drawing in silence, or talking non-stop', html: `The interviewer wants to see how you think, not just the final picture. <strong>Fix:</strong> think out loud ("I am thinking of a cache here because..."), and check at the end of each stage: "Does this look okay? Should we go deeper anywhere?"` },
    { type: 'callout', tone: 'mistake', title: '9. Scale that nobody asked for', html: `The question was "a notice board for one college", and the answer had multi-region active-active and sharding. Over-engineering is as wrong as under-engineering. <strong>Fix:</strong> design for the numbers. For 100 QPS, one good server and a DB with one replica is a perfectly correct answer.` },
    { type: 'h2', text: 'Practice: which step was skipped?' },
    { type: 'p', html: `Below is a short record of five candidates' answers. Each one skipped one step and paid for it later. Read it and catch which step is missing.` },
    { type: 'custom', render(el) {
      const ST = ['Requirements', 'Estimate', 'Entities + API', 'High-level design', 'Deep dives', 'Wrap up'];
      const C = [
        { t: 'xyz Chat design', log: ['"I will assume 1:1 and groups, calls out of scope. A message within 500 ms, never lost."', '"10 crore DAU, 3 crore online at peak, so 3 crore open connections."', 'Entities: User, Conversation, Message. Events: message.send, message.new.', 'Deep dive: reconnect if a gateway falls, client_msg_id against duplicates...', 'Wrap up: trade-offs and metrics.'], a: 3, e: 'Straight from entities to the deep dive. No simple design was drawn on the board, and no message was walked end to end. The interviewer does not even know where the "gateway" is or which road a message takes.' },
        { t: 'xyz Paste design', log: ['Boxes right away: "LB, Paste service, Cassandra, Kafka, Redis, CDN."', '"10M pastes/day, so ~100 writes/s."', 'API: POST /pastes, GET /pastes/{id}.', 'Deep dive: Cassandra sharding...', 'Wrap up.'], a: 0, e: 'No requirements were asked. Later it turned out login was needed and pastes could be up to 50 MB (object storage!). Nobody knows which requirement Kafka was for.' },
        { t: 'xyz Feed design', log: ['FR: post, follow, home feed. Out: ads, ranking. NFR: feed in 500 ms, eventual is fine.', 'Entities: User, Post, Follow. API: POST /posts, GET /feed?cursor=', 'HLD: Post service, Follow service, Feed service, DBs. Walked one feed read.', 'Deep dive: "we will precompute the feed... maybe? Not sure how many followers people have."', 'Wrap up.'], a: 1, e: 'The estimate was skipped. So in the deep dive nobody knew how many feeds one post goes into (200 followers? 1 crore?). Without the number, there was no answer to the celebrity problem.' },
        { t: 'xyz Like button design', log: ['FR: like/unlike, show the count. NFR: 2 crore DAU, the count may be 5 seconds late.', '~2,000 likes/s, 6,000/s at peak; so one row gets hot.', 'Entities + API: Like, Video; PUT /videos/{id}/like.', 'HLD: Like service + DB, one request end to end.', 'Deep dive: count shards + cache. Then... time ran out, and the interviewer said "thanks".'], a: 5, e: 'No wrap up. The design was good, but the trade-offs (a count up to 5 seconds old), the metrics and the next work were never said. The last 3 minutes should have been saved.' },
        { t: 'xyz Rate limiter design', log: ['FR: 100 req/min per API key, 429 + Retry-After. NFR: no more than 2-3 ms added per request.', '~1M checks/s, all fits in RAM, so a Redis cluster.', 'Gateway → Redis → services. One request: get the key, check the count, forward or 429.', 'Deep dive: race condition, Lua script, fail-open when Redis is down.', 'Wrap up: trade-offs, metrics.'], a: 2, e: 'Entities and API were skipped. What does a rule look like (key type, limit, window)? What does the gateway ask Redis? Without this, the arrows in the HLD were unclear, and the interviewer had to ask.' },
      ];
      el.innerHTML = `<div class="dfm-head" style="font:600 16px var(--f-body);color:var(--ink)"></div>
        <ol class="dfm-log" style="margin:8px 0 0 20px;padding:0;font-size:14px;line-height:1.55;color:var(--ink-2)"></ol>
        <div style="margin-top:10px;font-size:14px;color:var(--ink-2)">Which step is missing?</div>
        <div class="dfm-opts" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px"></div>
        <div class="stats"><div class="stat"><span>Correct</span><strong class="dfm-s">0 / 0</strong></div><div class="stat"><span>Case</span><strong class="dfm-c"></strong></div></div>
        <div class="calc-note dfm-n"></div>
        <div style="margin-top:8px"><button type="button" class="btn small primary dfm-next">Next case →</button></div>`;
      const $ = c => el.querySelector(c);
      let i = 0, ok = 0, done = 0, locked = false;
      const draw = () => {
        const c = C[i];
        $('.dfm-head').textContent = c.t;
        $('.dfm-log').innerHTML = c.log.map(x => `<li>${x}</li>`).join('');
        $('.dfm-opts').innerHTML = ST.map((x, k) => `<button type="button" class="btn small ghost" data-k="${k}">${x}</button>`).join('');
        $('.dfm-c').textContent = (i + 1) + ' / ' + C.length;
        $('.dfm-s').textContent = ok + ' / ' + done;
        $('.dfm-n').textContent = 'Think: the output of which step (FR list, numbers, API, diagram, fixes, summary) is not in this record?';
        locked = false;
        $('.dfm-opts').querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
          if (locked) return; locked = true; done++;
          const right = +b.dataset.k === c.a; if (right) ok++;
          b.classList.remove('ghost'); if (right) b.classList.add('primary');
          $('.dfm-s').textContent = ok + ' / ' + done;
          $('.dfm-n').textContent = (right ? 'Correct! ' : `No. The missing step: ${ST[c.a]}. `) + c.e;
        });
      };
      $('.dfm-next').onclick = () => { i = (i + 1) % C.length; if (i === 0) { ok = 0; done = 0; } draw(); };
      draw();
    }},
    { type: 'h2', text: 'Practice tool: run the framework yourself' },
    { type: 'p', html: `Pick a prompt, pick the interview length, and start the timer. At each stage, tick the checklist (think on paper first!), then open the "Model answer" and compare. The budget bar shows which stage the plan says you should be at right now.` },
    { type: 'custom', render(el) {
      const STAGES = [
        { name: 'Requirements', b45: 5, b60: 5, checks: ['3-5 functional requirements, in the form "users can ..."', 'Said clearly what is out of scope', 'NFRs with numbers: scale, latency, availability', 'Decided the consistency need (strong or eventual)'] },
        { name: 'Estimate', b45: 3, b60: 5, checks: ['QPS (average + peak)', 'Read:write ratio', 'Storage or concurrent connections (whichever matters)', 'A design conclusion after every number'] },
        { name: 'Entities + API', b45: 5, b60: 5, checks: ['Core entities (nouns) and 2-4 key fields', 'An endpoint or event for every functional requirement', 'User id from the auth token, not from the body'] },
        { name: 'High-level design', b45: 12, b60: 15, checks: ['Client → LB / gateway → services → DB', 'Every functional requirement works with this design', 'Walked one request end to end, out loud', 'Noted the hard parts as "look at in the deep dive"'] },
        { name: 'Deep dives', b45: 15, b60: 20, checks: ['Went back to the NFRs: found the hot spot / bottleneck', '"What if it dies?" for every box', 'Discussed consistency or a failure scenario', 'Said the cost (trade-off) of every fix'] },
        { name: 'Wrap up', b45: 3, b60: 5, checks: ['Summarised the big trade-offs', 'What you will monitor (2-3 metrics)', 'What you would do with more time'] },
      ];
      const P = [
        { name: 'URL shortener', q: 'Design a URL shortener like xyz.co (similar to Bitly).', a: [
          '<strong>FR:</strong> give a long URL, get a short link; opening the short link redirects; optional custom alias and expiry. <strong>Out:</strong> accounts, dashboards. <strong>NFR:</strong> very fast redirects (under ~50 ms), very high availability (a broken link = someone else\'s site is broken), codes never clash. A new link must work right away; everything else can be eventual.',
          '100M new links/day → ~1k writes/s. Each link is opened ~100 times → ~100k reads/s (peak ×3). <strong>So read-heavy; the cache is the most important part.</strong> ~500 bytes/link → ~50 GB/day → ~90 TB in 5 years. <strong>So a sharded key-value store.</strong> 7 base62 characters = 62^7 ≈ 3.5 trillion codes, enough.',
          '<strong>Link</strong> { code, long_url, created_at, expires_at }. <code>POST /links { url }</code> → 201 { short }. <code>GET /{code}</code> → 301/302 with a Location header.',
          'Client → LB → stateless app servers → ID generator (unique numbers, written in base62) + key-value DB (code → URL). Redirect: the app server reads the URL from the DB and sends a 301/302. Walk one create and one click end to end.',
          '(1) Hot links: Redis cache, 99% of redirects in ~1 ms. (2) ID generator as a SPOF/bottleneck: each server takes a range of 1,000 IDs at once. (3) 301 vs 302: if you need analytics, use 302 (or 301 with a short cache time). (4) Click analytics: not count++ in the DB, but an event in a queue (async). (5) Sequential codes are guessable: scramble them.',
          'Trade-offs: 302 = more load but every click is counted; range-based IDs = some IDs wasted on a crash. Monitor: redirect p99, cache hit ratio, use of ID ranges, queue lag. With more time: detecting abuse/malware links, custom domains.',
        ]},
        { name: 'Chat (1:1 + groups)', q: 'Design xyz Chat: 1:1 and group messages, delivery when online and offline.', a: [
          '<strong>FR:</strong> send/receive 1:1 messages; groups (assume up to a few hundred members); sent/delivered/read receipts; an offline user gets messages later. <strong>Out:</strong> voice/video calls, stories, payments. <strong>NFR:</strong> to an online user in under ~500 ms; a message is never lost; correct order within a conversation.',
          '100M DAU × 50 messages = 5B/day → ~50k msgs/s (peak ~150k). <strong>Concurrent connections</strong> is the most important number: assume 30M online at peak → 30M open connections. If one gateway handles ~1 lakh → ~300 gateway servers. <strong>So the connection layer is separate and scaled horizontally.</strong> ~100 bytes/message → ~500 GB/day.',
          '<strong>User, Conversation, Message</strong> { id (time-ordered), conv_id, sender, text, client_msg_id }, <strong>Receipt</strong>. Events (WebSocket): <code>message.send</code>, <code>message.new</code>, <code>message.ack</code>, <code>message.read</code>. REST: <code>GET /conversations/{id}/messages?cursor=</code> for history.',
          'Client ↔ WebSocket gateways (long connection) → chat service → message store (partitioned by conversation_id). A registry (Redis): user → which gateway they are connected to. Send flow: save → find the recipient\'s gateway in the registry → push. If offline, the push notification service.',
          '(1) A gateway dies: clients reconnect and ask for "everything after my last message id". (2) Duplicates on retry: idempotency with client_msg_id. (3) Order: time-ordered IDs per conversation. (4) Big groups: the fan-out work goes to a queue + workers. (5) Delivered/read: small events, eventual is fine.',
          'Trade-offs: at-least-once + dedupe (exactly-once is expensive); receipts arrive a bit late. Monitor: connections per gateway, send→deliver latency, undelivered backlog. With more time: end-to-end encryption, media (object storage + CDN), multi-device sync.',
        ]},
        { name: 'News feed', q: 'Design the xyz.com home feed: posts from people you follow, newest first.', a: [
          '<strong>FR:</strong> create a post; follow users; the home feed shows posts from people you follow, newest first, and you keep scrolling. <strong>Out:</strong> ML ranking, ads, comments. <strong>NFR:</strong> the feed opens in under ~500 ms; a new post may show up a few seconds late (eventual); very high availability.',
          '200M DAU, 1 post/day → ~2k writes/s. The feed is opened 10 times a day → 2B reads/day → ~20k reads/s. Average 200 followers → each post goes into 200 feeds → ~400k feed inserts/s. <strong>So read-heavy, feeds are worth precomputing, and the fan-out work is async.</strong> Some celebrities have crores of followers: <strong>one post = crores of writes</strong>, which needs special treatment.',
          '<strong>User, Post</strong> { id, author, text, media_url, created_at }, <strong>Follow</strong> { follower, followee }, <strong>FeedItem</strong>. <code>POST /posts</code>, <code>POST /follows</code>, <code>GET /feed?cursor=</code> (cursor pagination, not offset).',
          'Simple: Client → LB → Post service (post DB) + Follow service (follow table) + Feed service. On a feed read: get the list of followees, get their latest posts, merge and sort (fan-out on read). It works, but reading from 200 places on every feed open is slow: note it for the deep dive.',
          '(1) Read latency: precompute each user\'s feed in Redis (fan-out on write) via a queue + workers. (2) Celebrities: do not fan out their posts; merge them at read time (hybrid). (3) Worker crash: queue retry, idempotent insert. (4) Feed cache only for active users; the rest on demand.',
          'Trade-offs: hybrid = two code paths; the feed is a few seconds stale. Monitor: feed p99, fan-out queue lag, cache hit ratio. With more time: ranking, media via a CDN, evicting the feeds of inactive users.',
        ]},
        { name: 'Rate limiter', q: 'Design a rate limiter for the xyz.com APIs (per user / IP / API key).', a: [
          '<strong>FR:</strong> rules like "100 requests/min per API key, per endpoint"; when the limit is crossed, 429 + Retry-After; rules can be changed through config. <strong>Out:</strong> billing, ML-based bot detection. <strong>NFR:</strong> only a few ms added per request; correct counting across many servers; it must never take down the whole API itself. Decide: if Redis is down, fail-open or fail-closed?',
          'Peak ~1M API req/s → ~1M counter checks/s. Assume 10M active keys × ~100 bytes ≈ 1 GB. <strong>So the whole state fits in RAM (Redis), and no disk DB is on the hot path.</strong> 1M ops/s is too much for one node → <strong>a Redis cluster, sharded by key.</strong>',
          '<strong>Rule</strong> { key_type, endpoint, limit, window }, <strong>Bucket</strong> { key, tokens, last_refill }. Internal call: <code>allow(key, rule) → { allowed, remaining, retry_after }</code>. Outside: <code>429 Too Many Requests</code> + <code>Retry-After</code> header.',
          'Client → API gateway (rate-limit middleware) → Redis (counters/buckets) → backend services if allowed. Rules come from a config store and are cached in the gateway\'s memory. End to end: request → get the key → check Redis → forward or 429.',
          '(1) Race condition: two servers read the same counter and both say "allowed" → an atomic Lua script. (2) Algorithm: token bucket (allows bursts) vs sliding window (smooth). (3) Redis down: fail-open (the API keeps running, no limit) vs fail-closed (safe, but an outage). (4) Hot key: one big customer heats up one shard.',
          'Trade-offs: accepted a little inaccuracy for latency; choosing fail-open risks abuse. Monitor: 429 rate per rule, Redis latency, p99 added by the middleware. With more time: multi-region limits, a local in-memory pre-check.',
        ]},
      ];
      el.innerHTML = `<div class="chips df-p" role="group" aria-label="Prompt" style="padding:0"></div>
        <div class="chips df-len" role="group" aria-label="Interview length" style="padding:8px 0 0">
          <button type="button" class="chip on" data-l="45">45 min interview</button>
          <button type="button" class="chip" data-l="60">60 min interview</button>
        </div>
        <div class="df-bar" style="display:flex;gap:3px;margin-top:14px;position:relative"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px">
          <button type="button" class="btn small primary df-go">Start timer</button>
          <button type="button" class="btn small ghost df-reset">Reset timer</button>
          <label style="display:flex;gap:6px;align-items:center;font-size:14px;color:var(--ink-2)"><input type="checkbox" class="df-fast"> 10x speed (for a demo)</label>
        </div>
        <div class="stats">
          <div class="stat"><span>Timer</span><strong class="df-t">00:00</strong></div>
          <div class="stat"><span>The plan says you should be at</span><strong class="df-now" style="font-size:17px"></strong></div>
          <div class="stat"><span>Checklist</span><strong class="df-done"></strong></div>
        </div>
        <div class="chips df-st" role="group" aria-label="Stage" style="padding:14px 0 0"></div>
        <div class="df-card" style="margin-top:10px;border:1px solid var(--line);border-radius:var(--r);background:var(--surface-2);padding:12px 14px"></div>
        <div class="calc-note df-note"></div>`;
      const $ = c => el.querySelector(c);
      let pi = 0, len = 45, si = 0, sec = 0, timer = null, reveal = false;
      const ticks = P.map(() => STAGES.map(s => s.checks.map(() => false)));
      const budgets = () => STAGES.map(s => len === 45 ? s.b45 : s.b60);
      const total = () => budgets().reduce((a, b) => a + b, 0);
      // which stage the plan says you should be in after m minutes
      const stageAt = m => { let acc = 0; const b = budgets(); for (let i = 0; i < b.length; i++) { acc += b[i]; if (m < acc) return i; } return -1; };
      const mmss = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
      const SHORT = ['Req', 'Est', 'API', 'HLD', 'Deep', 'Wrap'];
      $('.df-p').innerHTML = P.map((p, i) => `<button type="button" class="chip${i ? '' : ' on'}" data-i="${i}">${p.name}</button>`).join('');
      const drawBar = () => {
        const b = budgets(), T = total(), m = sec / 60, plan = stageAt(m);
        $('.df-bar').innerHTML = b.map((x, i) => {
          const isPlan = i === plan, isSel = i === si;
          return `<div data-s="${i}" title="${STAGES[i].name}: ${x} min" style="flex:${x} 1 0;min-width:26px;cursor:pointer;border-radius:6px;padding:5px 2px;text-align:center;overflow:hidden;white-space:nowrap;font:600 10.5px/1.3 var(--f-body);color:${isPlan ? 'var(--accent-ink)' : 'var(--ink-2)'};background:${isPlan ? 'var(--accent-soft)' : 'var(--surface-2)'};border:2px solid ${isSel ? 'var(--accent)' : 'var(--line)'}">${SHORT[i]}<br>${x}m</div>`;
        }).join('') + `<div aria-hidden="true" style="position:absolute;top:-4px;bottom:-4px;width:2px;background:var(--red);left:${Math.min(100, (m / T) * 100).toFixed(2)}%"></div>`;
        $('.df-bar').querySelectorAll('[data-s]').forEach(d => d.onclick = () => { si = +d.dataset.s; reveal = false; draw(); });
        $('.df-t').textContent = mmss(sec) + ' / ' + T + ':00';
        $('.df-now').textContent = plan < 0 ? 'Time is up' : STAGES[plan].name;
        const tk = ticks[pi], all = tk.flat().length, done = tk.flat().filter(Boolean).length;
        $('.df-done').textContent = done + ' / ' + all;
        drawNote(b, T, plan);
      };
      const drawCard = () => {
        const b = budgets(), tk = ticks[pi];
        $('.df-st').innerHTML = STAGES.map((s, i) => `<button type="button" class="chip${i === si ? ' on' : ''}" data-s="${i}">${tk[i].every(Boolean) ? '✓ ' : ''}${i + 1}. ${s.name}</button>`).join('');
        $('.df-st').querySelectorAll('.chip').forEach(c => c.onclick = () => { si = +c.dataset.s; reveal = false; draw(); });
        const S = STAGES[si];
        $('.df-card').innerHTML = `<div style="font:600 15px var(--f-display);color:var(--ink)">${si + 1}. ${S.name} <span style="font:400 13px var(--f-body);color:var(--ink-3)">budget ${b[si]} min (${len} min plan)</span></div>
          <div style="margin:6px 0 4px;font-size:14px;color:var(--ink-2)">Prompt: ${P[pi].q}</div>
          ${S.checks.map((c, k) => `<label style="display:flex;gap:8px;align-items:flex-start;margin-top:6px;font-size:14px;color:var(--ink)"><input type="checkbox" data-k="${k}"${tk[si][k] ? ' checked' : ''} style="margin-top:3px"> <span>${c}</span></label>`).join('')}
          <button type="button" class="btn small ghost df-rev" style="margin-top:10px">${reveal ? 'Hide model answer' : 'Show model answer'}</button>
          <div class="df-ans" style="margin-top:8px;font-size:14px;line-height:1.6;color:var(--ink-2);border-left:3px solid var(--accent);padding-left:10px"${reveal ? '' : ' hidden'}>${P[pi].a[si]}</div>`;
        $('.df-card').querySelectorAll('input[data-k]').forEach(x => x.onchange = () => { tk[si][+x.dataset.k] = x.checked; draw(); });
        $('.df-rev').onclick = () => { reveal = !reveal; draw(); };
      };
      const drawNote = (b, T, plan) => {
        const S = STAGES[si], tk = ticks[pi];
        let note;
        if (plan < 0) note = 'Time is up. The stages you did not finish are the focus of your next practice.';
        else if (sec > 0 && plan > si) note = `The plan says you should now be at "${STAGES[plan].name}", but you are at "${S.name}". This is where interviews lose deep dive time: finish it in one line and move on.`;
        else if (tk[si].every(Boolean)) note = `"${S.name}" checklist complete. ${si < 5 ? 'Move to the next stage.' : 'The whole framework is done!'}`;
        else note = `First write it yourself on paper, then tick the checklist, then compare with the model answer. Deep dives have the biggest budget (${b[4]} of ${T} min).`;
        $('.df-note').textContent = note;
      };
      const draw = () => { drawCard(); drawBar(); };
      const stop = () => { if (timer) clearInterval(timer); timer = null; $('.df-go').textContent = sec >= total() * 60 ? 'Start again' : sec > 0 ? 'Resume timer' : 'Start timer'; };
      $('.df-go').onclick = () => {
        if (timer) { stop(); return; }
        if (sec >= total() * 60) sec = 0;
        $('.df-go').textContent = 'Pause';
        timer = setInterval(() => {
          if (!el.isConnected) { stop(); return; }
          sec = Math.min(total() * 60, sec + ($('.df-fast').checked ? 10 : 1));
          if (sec >= total() * 60) stop();
          drawBar();
        }, 1000);
      };
      $('.df-reset').onclick = () => { stop(); sec = 0; $('.df-go').textContent = 'Start timer'; draw(); };
      $('.df-p').querySelectorAll('.chip').forEach(c => c.onclick = () => {
        pi = +c.dataset.i; si = 0; reveal = false;
        $('.df-p').querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === c));
        draw();
      });
      $('.df-len').querySelectorAll('.chip').forEach(c => c.onclick = () => {
        len = +c.dataset.l;
        $('.df-len').querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === c));
        if (sec > total() * 60) sec = total() * 60;
        draw();
      });
      draw();
    }},
    { type: 'callout', tone: 'tip', title: 'How to practise (from the roadmap)', html: `For every real system in phase 8: first design it yourself on paper for <strong>40 minutes</strong> using the framework, <em>then</em> read the course lesson or the company's engineering blog and compare. If you read first, you are only memorising, not designing.` },

    { type: 'callout', tone: 'why', title: 'Decide: one question at each stage', html: `When you get stuck, ask exactly this:<br>
      <strong>1. Requirements:</strong> "Do I know what to build, what <em>not</em> to build, and how fast/big/reliable it must be?"<br>
      <strong>2. Estimate:</strong> "Does this number change any design decision?" If not, skip it.<br>
      <strong>3. Entities + API:</strong> "Does every functional requirement have an endpoint or event?"<br>
      <strong>4. HLD:</strong> "Is this the simplest design that meets every FR, and did I walk one request end to end?"<br>
      <strong>5. Deep dives:</strong> "Which NFR breaks right now, and what happens if each box dies?"<br>
      <strong>6. Wrap up:</strong> "What did I leave out, why, and what will tell me it is working?"<br><br>
      And one rule that covers everything: <strong>every box needs a reason, and every reason has a cost.</strong>` },

    { type: 'diagram', title: 'The whole method at a glance', height: 650,
      caption: 'Left: the 6 steps, in order. Right: what should be written on the board at the end of each step. Dotted line: the deep dive agenda comes from the NFRs of Step 1.',
      groups: [
        { label: 'Steps (in order)', x: 10, y: 20, w: 300, h: 610 },
        { label: 'Output (what is on the board)', x: 330, y: 20, w: 380, h: 610 },
      ],
      nodes: [
        { id: 's1', label: '1. Requirements', sub: '≈5 min', x: 200, y: 80, w: 180, kind: 'client', info: 'What it is: the first step, where you ask what to build. Why: without it you do not know what to estimate or which boxes you need. FRs, out of scope, and NFRs with numbers.' },
        { id: 's2', label: '2. Estimate', sub: '≈3-5 min', x: 200, y: 180, w: 180, kind: 'net', info: 'What it is: rough numbers (QPS, read:write, storage, connections). Why: a 10x-100x difference changes the design. One decision after every number.' },
        { id: 's3', label: '3. Entities + API', sub: '≈5 min', x: 200, y: 280, w: 180, kind: 'data', info: 'What it is: the main nouns (User, Paste) and the endpoints/events. Why: the boxes exist to serve these requests and this data. One endpoint for every FR.' },
        { id: 's4', label: '4. High-level design', sub: '≈10-15 min', x: 200, y: 380, w: 180, kind: 'server', info: 'What it is: the simplest design of boxes that makes every FR work (client → LB → services → DB). Why: a deep dive first needs a working design. Walk one request end to end.' },
        { id: 's5', label: '5. Deep dives', sub: '≈15-20 min', x: 200, y: 480, w: 180, kind: 'threat', info: 'What it is: going back to the NFRs to fix hot spots, bottlenecks, SPOFs, consistency and failures. Why: this is the biggest part, and seniority shows here.' },
        { id: 's6', label: '6. Wrap up', sub: '≈3-5 min', x: 200, y: 580, w: 180, kind: 'cache', info: 'What it is: the final summary. Why: the interviewer should see that you know the limits of your design: trade-offs, monitoring, and what you would do with more time.' },
        { id: 'o1', label: 'FR + Out of scope + NFR', sub: 'a number in every NFR', x: 515, y: 80, w: 330, kind: 'client', info: 'What it is: the output of Step 1. Three short lists. Example: "create paste, read, expiry | Out: login | p99 < 200 ms, 99.9%, eventual OK".' },
        { id: 'o2', label: '3-4 numbers + decisions', sub: '"10k reads/s, so a cache"', x: 515, y: 180, w: 330, kind: 'net', info: 'What it is: the output of Step 2. A "so..." next to every number. Skip any number that changes no decision.' },
        { id: 'o3', label: 'Entities + endpoints', sub: 'one endpoint or event for every FR', x: 515, y: 280, w: 330, kind: 'data', info: 'What it is: the output of Step 3. 2-4 entities with 3-4 fields each, and endpoints like POST/GET. user_id from the token, not the body.' },
        { id: 'o4', label: 'A diagram of 4-7 boxes', sub: 'one request walked end to end', x: 515, y: 380, w: 330, kind: 'server', info: 'What it is: the output of Step 4. Simple boxes, a reason for each box, and a short "look at in the deep dive" list.' },
        { id: 'o5', label: 'Fixes + their cost', sub: 'hot spot, SPOF, consistency', x: 515, y: 480, w: 330, kind: 'threat', info: 'What it is: the output of Step 5. New boxes (cache, replica, queue...) with one trade-off next to each. 2-3 deep dives are enough.' },
        { id: 'o6', label: '3 trade-offs + metrics', sub: 'and "with more time I would..."', x: 515, y: 580, w: 330, kind: 'cache', info: 'What it is: the output of Step 6. A 30-60 second summary: what you left out and why, what you will monitor, and the next work.' },
      ],
      edges: [
        { a: 's1', b: 's2', n: 1 }, { a: 's2', b: 's3', n: 2 }, { a: 's3', b: 's4', n: 3 }, { a: 's4', b: 's5', n: 4 }, { a: 's5', b: 's6', n: 5 },
        { a: 's1', b: 'o1' }, { a: 's2', b: 'o2' }, { a: 's3', b: 'o3' }, { a: 's4', b: 'o4' }, { a: 's5', b: 'o5' }, { a: 's6', b: 'o6' },
        { a: 's1', b: 's5', dashed: true, kind: 'evt', label: 'NFR = agenda', via: [[50, 80], [50, 480]] },
      ],
      paths: [
        { name: 'Order', text: 'Requirements → Estimate → Entities + API → HLD → Deep dives → Wrap up. Each step is the input for the next; in the wrong order, every step is a guess.', go: ['s1>s2>s3>s4>s5>s6'] },
        { name: 'Output of each step', text: 'At the end of each step, one thing should be written on the board. If the output is missing, that step is unfinished.', go: ['s1>o1', 's2>o2', 's3>o3', 's4>o4', 's5>o5', 's6>o6'] },
        { name: 'NFR → deep dive', text: 'You do not invent the deep dive agenda. The NFR numbers from Step 1 tell you where the design breaks.', go: ['o1>s1>s5>o5'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>The order is fixed: <strong>Requirements → Estimate → Entities + API → HLD → Deep dives → Wrap up</strong>. Each step feeds the next.</li>
      <li>Requirements = FR (what it does) + <strong>out of scope</strong> + NFR (how it should be) <strong>with numbers</strong>. Not "fast", but "p99 &lt; 200 ms".</li>
      <li>In the estimate, 3-4 numbers, each followed by <strong>"so..."</strong>. Skip any number that changes no decision.</li>
      <li>One endpoint or event for every FR. The user_id comes from the auth token, never from the body.</li>
      <li>HLD = the <strong>simplest</strong> design that makes every FR work, and walk one request end to end out loud.</li>
      <li>Deep dives are the biggest part (~35%): go back to the NFRs, find the hot spot / bottleneck / SPOF, and say the cost of every fix.</li>
      <li>Wrap up: 3 trade-offs, 2-3 metrics, "with more time". Watch the clock: HLD done by ~25 min.</li>
      <li>Every box needs a reason, and every reason has a cost.</li>
    </ul>` },

    { type: 'h2', text: 'Trade-offs: of following the framework' },
    { type: 'tradeoffs',
      gains: ['No important part (requirements, failures, trade-offs) gets missed', 'Time goes to the right place: deep dives get the biggest share', 'The reason for every box is visible, so the answer to "why?" is always ready', 'The interviewer always knows where you are, and can steer you in the middle', 'Real design docs at work have the same structure: requirements, estimates, API, design, risks'],
      costs: ['If you become rigid, you can miss the interviewer\'s hints; the framework is a guide, not a jail', 'In some problems (data pipelines, building blocks like a rate limiter) the API or the estimate looks different; you have to adapt', 'The first 15 minutes feel "boring", and you want to start drawing boxes early', 'The time budget does not work without practice: you have to do it many times with a clock'] },

    { type: 'think', questions: [
      { q: 'The interviewer says "Design Instagram" and nothing else. What will you say in the first 2 minutes?', a: 'No boxes. First the scope: "Instagram is very big. I will take three core features: photo upload, follow, home feed. Stories, DMs, reels and search are out of scope, okay?" Then assumptions for the NFRs: "~500M DAU, feed in ~500 ms, a post may show up a few seconds late, photos are never lost." The interviewer will say yes or no, and your scope is fixed.' },
      { q: 'Your estimate says "only 50 writes/s and 500 reads/s". What should that do to the design?', a: 'This is a small system. One primary DB + one replica (for availability) and 2-3 stateless app servers behind an LB are enough. No sharding, Kafka or multi-region is needed, and saying this is a good answer too: "At this scale sharding is not needed; if it grows 100x, first read replicas and a cache, then sharding." Not over-engineering is also a skill.' },
      { q: '20 minutes are left after the HLD, and your NFR list has 6 items. How will you choose what to deep dive into?', a: 'By risk: which NFR will break first in this design, and will hurt the most when it breaks? Usually: (1) the biggest number from the estimate (hot reads, lakhs of connections), (2) anything about losing data or showing wrong data (durability, consistency), (3) a clear SPOF. Pick 2-3, confirm with the interviewer, and mention the rest in one line in the wrap up.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'What is the correct order of the framework?', options: ['HLD → requirements → estimate → deep dives', 'Requirements → estimate → entities + API → HLD → deep dives → wrap up', 'Estimate → HLD → API → requirements', 'Deep dives → HLD → wrap up'], answer: 1, explain: 'Each step is the input for the next: requirements tell you what to estimate, numbers tell you which boxes you need, and only after a simple design do its weak spots show in the deep dive.' },
      { q: 'In a 45-60 minute interview, which stage should get the most time?', options: ['Requirements', 'Estimate', 'Deep dives (≈15-20 min)', 'Wrap up'], answer: 2, explain: 'In deep dives you go back to the NFRs and fix hot spots, bottlenecks, SPOFs and failures. In the roadmap\'s words, this is where seniority shows.' },
      { q: 'What is the best output of the estimate stage?', options: ['Many exact numbers', '3-4 numbers, each with a design conclusion ("10k reads/s, so a cache")', 'Only the DAU', 'The exact server model'], answer: 1, explain: 'A number is useful only when it changes a decision. A 10-minute calculation with no conclusion is a common beginner mistake.' },
      { q: 'When should Kafka come into a high-level design?', options: ['Always, it is best practice', 'When a requirement or number asks for it (like work the response does not need, spikes, many consumers)', 'Never', 'Only when the interviewer says so'], answer: 1, explain: 'First a simple design that meets every FR. Every new box comes for the reason of some problem. Kafka/microservices without a reason = the first common mistake in the roadmap.' },
      { q: 'Which of these is a good non-functional requirement?', options: ['The system should be scalable', 'Users can upload a video', '99% of video pages open in under 300 ms', 'Good user experience'], answer: 2, explain: 'An NFR is a quality, and it must have a number. "Scalable" and "good experience" have no number, so no decision follows from them. "Upload a video" is a feature (FR).' },
      { q: 'What does NOT belong in the wrap up?', options: ['The trade-offs you made', 'What you will monitor', 'What you would do with more time', '"This design is scalable and highly available" with no detail'], answer: 3, explain: 'Generic claims say nothing. Specific trade-offs, metrics and next steps show that you understand the limits of the design.' },
    ]},
    { type: 'sources', note: 'The framework and time budget come from the course roadmap PDF (phase 7); they were cross-checked with the sources below.', items: [
      { title: 'System Design Interview Delivery Framework', publisher: 'Hello Interview', url: 'https://www.hellointerview.com/learn/system-design/in-a-hurry/delivery', used: 'Stages (requirements, core entities, API, high-level design, deep dives), ~5 min requirements, estimates only when they change the design, user id from the auth token, keep requirements short.' },
      { title: 'System Design Interview: An Insider\'s Guide (chapter: a framework for system design interviews)', publisher: 'The Pragmatic Engineer (review of Alex Xu\'s book, 2020)', url: 'https://blog.pragmaticengineer.com/system-design-interview-an-insiders-guide-review/', used: 'A review describing the book\'s similar 4-step process (scope, high-level design, deep dive, wrap up) and its hour-long split: 10-15 min high-level design, 10-25 min deep dive, a few minutes to wrap up. Used to sanity-check our budget.' },
    ]},
  ],
});
