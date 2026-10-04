Lesson.register({
  id: 'concurrency-parallelism',
  title: 'Concurrency vs parallelism',
  minutes: 25,
  summary: `Concurrency = <em>handling</em> many tasks during the same time. Parallelism = really <em>doing</em> many tasks at the very same moment. This difference explains how a 4-core server handles far more than 4 requests, how Node.js runs on one thread, what Python's GIL is, how likes get lost in a race condition, and why adding 100 cores does not make work 100 times faster.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Imagine you are chatting with 5 friends on a chat app. When one friend is typing, you do not wait for them; you reply to another. You are one person, but all five chats keep moving. This is <strong>concurrency</strong>.<br>Now imagine your 4 brothers and sisters are helping too, each one on a separate chat. Now 4 tasks really happen at the same moment. This is <strong>parallelism</strong>.<br>A server does the same. In this lesson we will see when each way helps, and how mistakes happen when many hands touch the same thing (like the count of likes) at once.` },
    { type: 'h2', text: 'The problem: the server sits idle 90% of the time' },
    { type: 'p', html: `In the last lesson we saw that a server\'s <strong>throughput</strong> stops growing at some point. Now let us look inside. For one request, xyz.com\'s <code>/feed</code> endpoint does roughly this:` },
    { type: 'code', text: `
1. Parse the request, check the user          ~5 ms   (CPU work)
2. Fetch posts from the database              ~80 ms  (wait: the DB is answering)
3. Build JSON, send the response              ~5 ms   (CPU work)
                                       total  ~90 ms, of which the CPU is busy only ~10 ms` },
    { type: 'p', html: `If the server takes only <strong>one</strong> request at a time, it will sit doing nothing for 80 ms while it waits for the DB. Only ~11 requests per second (1000 / 90). The CPU is idle ~89% of the time, and 500 users are waiting outside. Making the machine bigger (<a href="#/scalability">vertical scaling</a>) will not help either: the problem is not CPU speed, it is <strong>waiting</strong>.` },
    { type: 'p', html: `The answer: while one request waits for the DB, let the CPU do the work of another request. This idea is <strong>concurrency</strong>. And when there is more than one CPU core and two tasks really run at the same moment, that is <strong>parallelism</strong>.` },

    { type: 'h2', text: 'Two words, one big difference' },
    { type: 'callout', tone: 'term', title: 'New word: Concurrency', html: `<strong>What it is:</strong> <em>handling</em> many tasks during the same period of time, moving them all forward by switching between them. No two tasks have to run at the same moment. Like a support agent handling 5 chat windows: while one customer is typing, the agent replies to another. One person, five conversations moving forward.<br><strong>Why we need it:</strong> most of a web request\'s time is spent waiting (DB, network). Concurrency lets the CPU do another request\'s work during that wait.<br><strong>Without it:</strong> the math above: the CPU idle ~89% of the time, and one server handling only ~11 requests/second.` },
    { type: 'callout', tone: 'term', title: 'New word: Parallelism', html: `<strong>What it is:</strong> many tasks really running <em>at the very same moment</em>. This needs hardware: several CPU <strong>cores</strong> (a core = a separate "brain" inside the CPU that runs one line of work at a time). 5 support agents, each on their own chat: that is parallelism.<br><strong>Why we need it:</strong> work with no waiting, only calculation (video encoding, photo resizing), gets faster only with more cores.<br><strong>Without it:</strong> on an 8-core machine only one core works, and 7 sit idle.` },
    { type: 'compare',
      left: { title: 'Concurrency (1 core)', ascii: `core: [A][B][A][C][B][A][C]
       only one task at a moment,
       but all three move forward`, html: `It is about structure: the program is written so tasks can be split up and interleaved.` },
      right: { title: 'Parallelism (3 cores)', ascii: `core1: [A][A][A][A]
core2: [B][B][B][B]
core3: [C][C][C][C]`, html: `It is about execution: the tasks really run together. This needs several cores.` },
    },
    { type: 'p', html: `A famous talk by Rob Pike, co-creator of the Go language, has exactly this title: <em>"Concurrency is not parallelism"</em>. What he means: concurrency is a way to <em>organise</em> work (dealing with lots of things at once), parallelism is <em>running</em> them together (doing lots of things at once). Give a concurrent program more cores and it can also run in parallel. But even on 1 core, concurrency helps, if the work involves waiting.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "concurrent means running at the same time"', html: `No. An old laptop with 1 core also seemed to "run" music, a browser and chat at the same time. In reality the OS was switching every few milliseconds, so fast that it all looked simultaneous to you. That was concurrency, not parallelism. Stating this difference clearly in an interview earns a lot of points.` },

    { type: 'h2', text: 'CPU-bound vs I/O-bound: first find out what kind of work it is' },
    { type: 'callout', tone: 'term', title: 'New word: CPU-bound', html: `<strong>What it is:</strong> work where the time goes into CPU calculations. It gets faster only with a faster CPU or more cores. Example: making a thumbnail of a photo uploaded to xyz.com, encoding a video, hashing a password (bcrypt), parsing a big JSON, running an ML model.<br><strong>Why it matters to know:</strong> the fix for it is parallelism (more cores, more processes).<br><strong>If you guess wrong:</strong> you will add async or more threads and gain nothing; worse, the event loop will get stuck.` },
    { type: 'callout', tone: 'term', title: 'New word: I/O-bound', html: `<strong>What it is:</strong> work where most of the time goes into <em>waiting</em>: the database\'s answer, another service\'s API call, a disk read, the network. <strong>I/O</strong> = Input/Output, which means talking to the world outside the CPU. During this wait, the CPU has nothing to do. Most web APIs (xyz.com\'s <code>/feed</code>, <code>/profile</code>) are I/O-bound.<br><strong>Why it matters to know:</strong> the fix for it is concurrency (async, or many times more threads than cores).<br><strong>If you guess wrong:</strong> you will keep "one worker per core", the CPU will sit at 10%, and users will wait in line.` },
    { type: 'table', head: ['', 'CPU-bound', 'I/O-bound'], rows: [
      ['Where the time goes', 'CPU calculation', 'Waiting for DB / network / disk'],
      ['Gain from concurrency (interleaving on 1 core)?', 'Very little', 'A lot'],
      ['Gain from parallelism (more cores)?', 'Yes, directly', 'Yes, but concurrency is cheaper'],
      ['The right tool', 'Processes / threads = number of cores', 'Async event loop, or many times more threads than cores'],
    ]},
    { type: 'p', html: `This is something to see more than to read. The simulator below has some tasks. Each task: a little CPU work, then a wait (DB call), then a little CPU work. One grid box = 10 ms. Run it three ways and look at the total time:` },
    { type: 'list', items: [
      `<strong>Sequential, 1 core:</strong> one task finishes completely, then the next. During the wait, the core sits idle (blocking).`,
      `<strong>Concurrent, 1 core:</strong> as soon as one task starts waiting, the core picks up another task.`,
      `<strong>Parallel, 4 cores:</strong> four cores, and each core also works in the concurrent way.`,
    ]},
    { type: 'custom', render(el) {
      const PRE = { io: [1, 6, 1], cpu: [6, 1, 1] };
      el.innerHTML = `<div class="chips cpKind" role="group" aria-label="Task type">
          <button type="button" class="chip on" data-k="io">I/O-heavy API (DB calls)</button>
          <button type="button" class="chip" data-k="cpu">CPU-heavy (making thumbnails)</button>
          <button type="button" class="chip" data-k="mix">Mix (half and half)</button></div>
        <label style="margin-top:10px">How many tasks (requests): <strong class="cpNv">4</strong></label>
        <input class="cpN" type="range" min="1" max="8" step="1" value="4" aria-label="Number of tasks">
        <div class="cpPanels" style="margin-top:12px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:var(--ink-2);margin-top:6px">
          <span><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:var(--accent);vertical-align:middle"></span> running on the CPU</span>
          <span><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:var(--amber);opacity:.5;vertical-align:middle"></span> wait (DB / network)</span>
          <span><span style="display:inline-block;width:12px;height:12px;border-radius:3px;border:1px dashed var(--ink-3);vertical-align:middle"></span> ready, but no free core</span></div>
        <div class="stats">
          <div class="stat"><span>Sequential, 1 core</span><strong class="cpS"></strong></div>
          <div class="stat"><span>Concurrent, 1 core</span><strong class="cpC"></strong></div>
          <div class="stat"><span>Parallel, 4 cores</span><strong class="cpP"></strong></div>
        </div>
        <div class="calc-note cpNote"></div>`;
      const mkTasks = (kind, n) => { const out = []; for (let i = 0; i < n; i++) { const k = kind === 'mix' ? (i % 2 ? 'cpu' : 'io') : kind; out.push({ segs: [['c', PRE[k][0]], ['w', PRE[k][1]], ['c', PRE[k][2]]] }); } return out; };
      const seq = tasks => { const rows = tasks.map(() => []); let t = 0, busy = 0; tasks.forEach((tk, i) => { for (let j = 0; j < t; j++) rows[i].push(' '); tk.segs.forEach(([s, d]) => { for (let j = 0; j < d; j++) { rows[i].push(s === 'c' ? 'C' : 'W'); if (s === 'c') busy++; } }); t += tk.segs.reduce((a, x) => a + x[1], 0); }); return { rows, total: t, busy }; };
      const sched = (tasks, K) => {
        const st = tasks.map(tk => ({ si: 0, rem: tk.segs[0][1], core: -1, done: false }));
        const rows = tasks.map(() => []), ready = tasks.map((_, i) => i), free = new Array(K).fill(true);
        let t = 0, busy = 0;
        while (st.some(s => !s.done) && t < 1000) {
          while (ready.length && free.includes(true)) { const i = ready.shift(), c = free.indexOf(true); free[c] = false; st[i].core = c; }
          const enq = [];
          st.forEach((s, i) => {
            if (s.done) { rows[i].push(' '); return; }
            const kind = tasks[i].segs[s.si][0];
            if (kind === 'c' && s.core < 0) { rows[i].push('.'); return; }
            rows[i].push(kind === 'c' ? 'C' : 'W'); if (kind === 'c') busy++;
            if (--s.rem === 0) {
              if (kind === 'c') { free[s.core] = true; s.core = -1; }
              if (++s.si >= tasks[i].segs.length) { s.done = true; return; }
              s.rem = tasks[i].segs[s.si][1];
              if (tasks[i].segs[s.si][0] === 'c') enq.push(i);
            }
          });
          ready.push(...enq); t++;
        }
        return { rows, total: t, busy };
      };
let kind = 'io';
      const panel = (title, res, maxT) => {
        const n = res.rows.length, L = 34, W = 640, cw = (W - L - 6) / maxT, rh = 22, H = n * (rh + 4) + 22;
        let g = '';
        res.rows.forEach((r, i) => {
          const y = i * (rh + 4) + 2;
          g += `<text x="0" y="${y + rh - 6}" font-size="14" fill="var(--ink-3)" font-family="var(--f-mono)">T${i + 1}</text>`;
          r.forEach((c, j) => {
            const x = L + j * cw;
            if (c === 'C') g += `<rect x="${x}" y="${y}" width="${cw - 1}" height="${rh}" rx="2" fill="var(--accent)"/>`;
            else if (c === 'W') g += `<rect x="${x}" y="${y}" width="${cw - 1}" height="${rh}" rx="2" fill="var(--amber)" opacity=".5"/>`;
            else if (c === '.') g += `<rect x="${x + .5}" y="${y + .5}" width="${cw - 2}" height="${rh - 1}" rx="2" fill="none" stroke="var(--ink-3)" stroke-dasharray="2 2"/>`;
          });
        });
        const xe = L + res.total * cw, yb = n * (rh + 4) + 2;
        g += `<line x1="${xe}" y1="0" x2="${xe}" y2="${yb}" stroke="var(--red)" stroke-width="1.5"/>`;
        g += `<text x="${Math.min(xe + 4, W - 70)}" y="${yb + 16}" font-size="14" fill="var(--ink-2)" font-family="var(--f-mono)">${res.total * 10} ms</text>`;
        return `<div style="font-size:13px;font-weight:600;color:var(--ink);margin:10px 0 4px">${title}</div>
          <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" role="img" aria-label="${title}: ${res.total * 10} ms">${g}</svg>`;
      };
      const draw = () => {
        const n = Number(el.querySelector('.cpN').value);
        el.querySelector('.cpNv').textContent = n;
        const T = mkTasks(kind, n), a = seq(T), b = sched(T, 1), c = sched(T, 4);
        const maxT = a.total;
        el.querySelector('.cpPanels').innerHTML =
          panel('Sequential, 1 core (blocking)', a, maxT) +
          panel('Concurrent, 1 core (interleaved)', b, maxT) +
          panel('Parallel, 4 cores', c, maxT);
        const pct = r => Math.round(r.busy / r.total * 100) + '%';
        el.querySelector('.cpS').textContent = a.total * 10 + ' ms';
        el.querySelector('.cpC').textContent = b.total * 10 + ' ms';
        el.querySelector('.cpP').textContent = c.total * 10 + ' ms';
        const x1 = (a.total / b.total).toFixed(1), x4 = (a.total / c.total).toFixed(1);
        let note = `In sequential, the core was busy only ${pct(a)} of the time; in concurrent, ${pct(b)}. `;
        if (kind === 'io') note += `I/O-heavy work: <strong>without adding a single core</strong>, concurrency gave a ${x1}x speedup, because the core was doing other work during the wait. 4 cores gave ${x4}x.`;
        else if (kind === 'cpu') note += `CPU-heavy work: concurrency gives only ${x1}x (just a small gain from the little waiting). The core is already busy; interleaving does not reduce the work. Here the real speedup comes from parallelism: ${x4}x on 4 cores.`;
        else note += `Mix: CPU-heavy tasks hold on to the core, and I/O tasks have to wait even after they are ready (dashed boxes). Concurrency ${x1}x, 4 cores ${x4}x.`;
        if (n === 1) note = 'Only 1 task: all three ways are equal. Concurrency and parallelism only help when there is more than one task.';
        el.querySelector('.cpNote').innerHTML = note;
      };
      el.querySelectorAll('.cpKind .chip').forEach(b => b.onclick = () => {
        kind = b.dataset.k;
        el.querySelectorAll('.cpKind .chip').forEach(x => x.classList.toggle('on', x === b));
        draw();
      });
      el.querySelector('.cpN').oninput = draw;
      draw();
    }},
    { type: 'p', html: `Numbers at the default setting (I/O-heavy, 4 tasks): sequential <strong>320 ms</strong>, concurrent on 1 core <strong>110 ms</strong>, on 4 cores <strong>80 ms</strong>. Concurrency made it ~3x faster without buying a single new core. Now press "CPU-heavy": concurrency only goes 320 → 280 ms, while 4 cores give 80 ms. <strong>This is the most important lesson here:</strong> the fix for I/O-bound work is concurrency, the fix for CPU-bound work is parallelism.` },
    { type: 'callout', tone: 'tip', html: `The simulator shows switching as "free". In a real computer each switch has a small cost (a context switch, see below). And one more thing: even with 8 I/O tasks, the time on 1 core is 160 ms, because now the core is 100% busy. Concurrency can fill the waiting time; it cannot reduce the CPU work.` },

    { type: 'h2', text: 'Who runs the work: process and thread' },
    { type: 'p', html: `Fine, "the core picks up another task". But how does the OS know what a "task" is? There are two units for this.` },
    { type: 'callout', tone: 'term', title: 'New word: Process', html: `<strong>What it is:</strong> a running program, with its own <em>separate memory</em>. Run <code>node server.js</code> and a process is created. Two processes cannot touch each other\'s memory; the OS (operating system: Linux, Windows) keeps a wall between them.<br><strong>Why we need it:</strong> isolation: if one crashes, the other survives. And separate processes really run in parallel on separate cores.<br><strong>Cost:</strong> expensive to create, and to talk to each other they need paths like the network, a pipe, or a shared file/DB.` },
    { type: 'callout', tone: 'term', title: 'New word: Thread', html: `<strong>What it is:</strong> an "execution line" inside a process. A process can have many threads, and they all <em>share the same memory</em>. Each thread has its own stack (local variables), but the heap (shared objects, like the likes counter) is common to all.<br><strong>Why we need it:</strong> many tasks inside one program at the same time, cheaply: much lighter than creating a new process, and sharing data is fast.<br><strong>Danger:</strong> this very sharing creates race conditions (we will see them soon).` },
    { type: 'table', head: ['', 'Process', 'Thread'], rows: [
      ['Memory', 'Separate, isolated', 'Shared with all threads of the process'],
      ['Cost to create', 'Higher (a new memory space)', 'Lower'],
      ['If one crashes', 'Other processes are safe', 'The whole process (all threads) can go down'],
      ['Talking to each other', 'IPC: pipe, socket, queue (slow)', 'A shared variable directly (fast, but needs a lock)'],
      ['Example at xyz.com', 'Gunicorn\'s 9 worker processes', 'A Java/Tomcat server\'s 200 request threads'],
    ]},
    { type: 'callout', tone: 'term', title: 'New word: Context switch', html: `<strong>What it is:</strong> when a core moves from one thread to another, the OS has to save the first one\'s "place" (registers, how far it got) and load the new one\'s. This change is called a <strong>context switch</strong>.<br><strong>Why it happens:</strong> this is how several threads take turns on one core (concurrency).<br><strong>Cost:</strong> one switch takes a few microseconds, but the hidden cost is bigger: the new thread\'s data is not in the CPU cache, so it runs slowly for a while. A process-to-process switch is more expensive than a thread switch, because the memory map (address space) also changes.` },
    { type: 'p', html: `The OS <strong>scheduler</strong> decides which thread runs when, and on which core. A switch happens at two moments: (1) the thread stopped by itself (waiting for DB/network, waiting for a lock), or (2) its time slice ran out and the OS removed it by force (<strong>preemption</strong>), so that no single thread can take over a core.` },
    { type: 'callout', tone: 'warn', title: 'So just create 10,000 threads?', html: `The old way was "one thread for each request". 10,000 users = 10,000 threads. The problem: each thread\'s stack takes memory (on Linux the default stack size often reserves 8 MB; real use is less, but still), and with thousands of threads the scheduler switches so much that a big part of the CPU goes into "switching" itself. In the 2000s this was called the <strong>C10K problem</strong>: how to handle 10,000 connections on one server. Two answers came out of it: <strong>thread pools</strong> and the <strong>event loop</strong>.` },

    { type: 'h2', text: 'Async I/O and the event loop (the Node.js way)' },
    { type: 'p', html: `The idea: never let the thread wait. When the code sends a query to the DB, it does <em>not stop</em>; it just says "when the answer comes, run this function" and moves on to the next task. This is called <strong>non-blocking</strong> or <strong>async I/O</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: Event loop', html: `<strong>What it is:</strong> a single thread that keeps going around a loop: "which task is ready? (a new request arrived, a DB call answered, a timer finished)". It runs the ready task\'s <strong>callback</strong> (the function that was to be run later), then the next. The OS watches all the connections (<code>epoll</code> on Linux, <code>kqueue</code> on Mac) and tells the loop which one is ready.<br><strong>Why we need it:</strong> one thread handles thousands of connections, without the memory of a separate thread for each connection.<br><strong>Without it:</strong> one thread per connection: 10,000 users = 10,000 threads (the C10K problem above).` },
    { type: 'ascii', text: `            ┌──────────── Event loop (1 JS thread) ────────────┐
 request 1 →│ parse (2ms) → db.query(...) ──┐ (did not wait)    │
 request 2 →│ parse (2ms) → db.query(...) ──┤                  │
 request 3 →│ parse (2ms) → db.query(...) ──┤                  │
            │      ... the DB starts answering ...              │
            │ callback 2: send JSON ←────────┘                  │
            │ callback 1: send JSON                             │
            └───────────────────────────────────────────────────┘
  One thread, thousands of open connections. As long as the CPU pieces are small.`, caption: 'This is how Node.js handles thousands of concurrent requests on one JavaScript thread.' },
    { type: 'p', html: `In Node.js this work is done by a C library called <strong>libuv</strong>. For network I/O it uses the OS\'s async mechanism directly. For work the OS cannot do asynchronously (most file system calls, <code>dns.lookup</code>, and some heavy <code>crypto</code> and <code>zlib</code> work), libuv has a small <strong>thread pool</strong> with a default size of <strong>4</strong> (you can change it with the env variable <code>UV_THREADPOOL_SIZE</code>, max 1024). So "Node is single-threaded" is not the full truth: <em>your JavaScript</em> runs on one thread.` },
    { type: 'callout', tone: 'warn', title: 'The weak point of the event loop: CPU work', html: `There is only one thread, so if one request does 2 seconds of CPU work (a big JSON parse, an image resize, a badly written regex), then for those 2 seconds <strong>all</strong> users are stuck. Remember the simulator\'s "Mix" mode: the CPU-heavy task held on to the core. That is why Node\'s official guide says: <em>do not block the event loop</em>. Send CPU work to <code>worker_threads</code>, a separate process, or a separate service (behind a queue).` },
    { type: 'p', html: `And parallelism? One Node process runs JavaScript on only one core. To use all of an 8-core machine, you run 8 Node processes (Node\'s <code>cluster</code> module, PM2, or many small pods in Kubernetes), with a load balancer in front. The same pattern shows up in Python\'s <code>asyncio</code>, Nginx, and Redis (mainly single-threaded command execution).` },

    { type: 'h2', text: "Python's GIL: there are threads, but only one at a time" },
    { type: 'callout', tone: 'term', title: 'New word: GIL (Global Interpreter Lock)', html: `<strong>What it is:</strong> a global lock inside standard Python (CPython). The rule: in one process, at one moment, only <strong>one thread</strong> can run Python bytecode.<br><strong>Why it was made:</strong> to keep CPython\'s memory management simple and safe.<br><strong>Its effect:</strong> 8 threads, 8 cores, and pure-Python CPU work is still only about as fast as 1 core.` },
    { type: 'list', items: [
      `<strong>The GIL does not hurt much for I/O-bound work:</strong> when a thread waits for DB/network, it releases the GIL, and another thread runs. That is why threads or <code>asyncio</code> work fine in Python for I/O.`,
      `<strong>For CPU-bound work:</strong> <code>multiprocessing</code> / <code>ProcessPoolExecutor</code> (each process has its own GIL, so it is truly parallel), or C libraries (like NumPy) that release the GIL during heavy math.`,
      `<strong>Web servers:</strong> that is why Django/Flask apps run in many Gunicorn worker <em>processes</em>, not threads.`,
    ]},
    { type: 'callout', tone: 'why', title: 'The GIL is now going away (slowly)', html: `<strong>PEP 703</strong> gave a plan to make the GIL optional. In <strong>Python 3.13</strong> (2024) a separate <strong>free-threaded build</strong> came out for the first time (experimental), run with a name like <code>python3.13t</code>. After <strong>PEP 779</strong> (accepted in June 2025), this build is "officially supported" in <strong>Python 3.14</strong>, not experimental. But note: it is still an <em>optional, separate build</em>. In the normal <code>python3</code> download, the GIL is still ON. In the free-threaded build, single-thread code is a bit slower (about 1-8% depending on the platform, according to the Python docs), and not every C extension library is ready yet. In an interview, say: "default CPython has the GIL; 3.13+ has an optional free-threaded build, officially supported since 3.14".` },
    { type: 'h2', text: 'A new problem: likes are getting lost (race condition)' },
    { type: 'p', html: `Concurrency gave us speed, but it brought a new bug. xyz.com\'s Java server runs each request on a separate thread, and keeps the like counter of a popular post in memory. The code looks completely simple:` },
    { type: 'code', text: `likes = likes + 1      // one line, but three steps for the CPU:
  1. READ   read likes from memory          (100)
  2. ADD    add 1 to it                      (101)
  3. WRITE  write it back to memory          (101)` },
    { type: 'p', html: `If two threads mix these three steps <em>in the middle</em> (both read 100, then both write 101), two likes came in but the counter went up by only 1. This is called a <strong>lost update</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: Race condition', html: `<strong>What it is:</strong> when the result depends on the order in which threads ran ("who won the race"). The code works right 1,000 times, goes wrong the 1,001st time, and is never caught in testing. The part of the code where shared data is read and written is called the <strong>critical section</strong>.<br><strong>Why it is dangerous:</strong> no error, no crash: just quietly wrong data (lost likes, money taken twice).<br><strong>When it happens:</strong> when two threads read and write the same data with nothing stopping them.` },
    { type: 'callout', tone: 'term', title: 'New word: Mutex / Lock', html: `<strong>What it is:</strong> a <strong>mutex</strong> (mutual exclusion) or <strong>lock</strong> is a token that only one thread can hold at a time. Take the lock before entering the critical section, release it when you leave. If another thread asks for the lock, it waits until the first one releases it. In Java <code>synchronized</code>, in Python <code>threading.Lock()</code>, in Go <code>sync.Mutex</code>.<br><strong>Why we need it:</strong> so no other thread gets in between READ-ADD-WRITE.<br><strong>Without it:</strong> lost updates. <strong>Cost:</strong> the other threads have to wait in line.` },
    { type: 'flow', height: 300, title: 'Two threads, one likes counter',
      nodes: [
        { id: 'r', label: 'Riya', sub: 'pressed like', x: 90, y: 60, w: 140, kind: 'client', info: 'What it is: Riya, an xyz.com user. She pressed like on a post. Her request went to the server\'s Thread A.' },
        { id: 'a', label: 'Aman', sub: 'pressed like', x: 90, y: 240, w: 140, kind: 'client', info: 'What it is: another user, Aman. He pressed like at almost the same millisecond. His request went to Thread B.' },
        { id: 't1', label: 'Thread A', x: 300, y: 60, w: 150, kind: 'server', info: 'What it is: a thread (one line of work) inside the server process. It has its own stack (the local variable <code>tmp</code>), but the likes counter is in shared heap memory.' },
        { id: 't2', label: 'Thread B', x: 300, y: 240, w: 150, kind: 'server', info: 'What it is: a second thread of the same process, running on another core or interleaved on the same core. It sees the same shared memory.' },
        { id: 'lk', label: 'Lock: likes', sub: 'free', x: 300, y: 150, w: 130, h: 50, kind: 'queue', info: 'What it is: a mutex (lock) that protects the likes counter. Only one thread owns it at a time. The rest wait in line (blocked; they do not use the CPU).' },
        { id: 'lk2', label: 'Lock: views', sub: 'free', x: 470, y: 150, w: 110, h: 50, kind: 'queue', hidden: true, info: 'What it is: a second mutex, for the views counter. Two locks + opposite order = a recipe for deadlock.' },
        { id: 'm', label: 'likes = 100', sub: 'shared memory', x: 630, y: 150, w: 140, kind: 'data', info: 'What it is: a number kept in shared heap memory (the count of likes). Both threads can read and write it. <code>likes + 1</code> is not one step but three: READ, ADD, WRITE.' },
      ],
      edges: [
        { a: 'r', b: 't1' }, { a: 'a', b: 't2' },
        { a: 't1', b: 'lk' }, { a: 't2', b: 'lk' },
        { a: 't1', b: 'm' }, { a: 't2', b: 'm' },
        { a: 't1', b: 'lk2', hidden: true }, { a: 't2', b: 'lk2', hidden: true },
      ],
      scenarios: [
        { name: 'No lock: lost update', steps: [
          { title: 'Two likes came at once', text: 'Riya and Aman pressed like at the same moment. The server gave the two requests to two different threads. There is no lock in the code.', go: ['r>t1', 'a>t2'], parallel: true },
          { title: 'Thread A read', text: 'Thread A: <code>tmp = likes</code> → 100. It has not written yet.', go: ['t1>m', 'res:m>t1'], msg: 'A: READ likes → 100', after: { t1: { sub: 'tmp = 100' } } },
          { title: 'Context switch: Thread B also read', text: 'Before A wrote, the scheduler ran B (or B was running in parallel on another core). B also saw 100.', go: ['t2>m', 'res:m>t2'], msg: 'B: READ likes → 100', after: { t2: { sub: 'tmp = 100' } } },
          { title: 'Thread A wrote 101', text: 'A: <code>likes = tmp + 1</code> → 101. Correct so far.', go: 't1>m', msg: 'A: WRITE likes = 101', after: { m: { label: 'likes = 101' } } },
          { title: 'Thread B also wrote 101', text: 'B had the old <code>tmp = 100</code>. It also wrote 101, and A\'s update was wiped out. <strong>Two likes, counter +1.</strong> No error, no crash: just quietly wrong data. This is the most dangerous thing about a race condition.', go: 'bad:t2>m', msg: 'B: WRITE likes = 101   (should have been 102)', after: { m: { state: 'warn', sub: 'should be 102!' } } },
        ]},
        { name: 'With a lock (correct)', steps: [
          { title: 'Two likes came at once', text: 'The same two requests. Now the code takes a lock before the critical section.', go: ['r>t1', 'a>t2'], parallel: true },
          { title: 'Thread A took the lock', text: 'A got there first, the lock was free, so A became the owner.', go: 't1>lk', msg: 'A: lock(likes) → got it', after: { lk: { state: 'ok', sub: 'owner: A' } } },
          { title: 'Thread B had to wait', text: 'B also asked for the lock, but A has it. B is <strong>blocked</strong>: the OS puts it aside, so it does not waste the CPU.', go: 'bad:t2>lk', msg: 'B: lock(likes) → wait...', after: { t2: { state: 'warn', sub: 'waiting' } } },
          { title: 'A finished READ + WRITE', text: 'Inside the lock, A read 100 and wrote 101. No one can get in between.', go: ['t1>m', 'res:m>t1'], msg: 'A: READ 100 → WRITE 101', after: { m: { label: 'likes = 101' } } },
          { title: 'A released the lock, B got it', text: 'A unlocked. The OS woke up B, and B is now the owner.', go: ['t1>lk', 't2>lk'], msg: 'A: unlock   B: lock → got it', after: { lk: { sub: 'owner: B' }, t2: { state: '', sub: '' }, t1: { sub: 'done' } } },
          { title: 'B read 101, wrote 102', text: 'Now B got the fresh value 101. Final: <strong>102</strong>. Correct. The cost: B had to wait a little. The longer you hold a lock, the longer the other threads wait in line.', go: ['t2>m', 'res:m>t2'], msg: 'B: READ 101 → WRITE 102, unlock', after: { m: { label: 'likes = 102', state: 'ok', sub: 'correct' }, lk: { state: '', sub: 'free' } } },
        ]},
        { name: 'Deadlock: two locks, opposite order', steps: [
          { title: 'A new feature, two locks', text: 'Now pressing like updates both likes <em>and</em> views, and views has its own lock. In the code, Thread A first takes the likes-lock, then the views-lock. Someone wrote it the other way round somewhere else (Thread B\'s code path): first views, then likes.', show: ['lk2', 't1-lk2', 't2-lk2'], go: ['r>t1', 'a>t2'], parallel: true },
          { title: 'A took the likes-lock', text: 'A now has the likes-lock.', show: ['lk2', 't1-lk2', 't2-lk2'], go: 't1>lk', msg: 'A: lock(likes) → got it', after: { lk: { state: 'ok', sub: 'owner: A' } } },
          { title: 'B took the views-lock', text: 'At the same time, B took the views-lock. So far everything is normal.', show: ['lk2', 't1-lk2', 't2-lk2'], go: 't2>lk2', msg: 'B: lock(views) → got it', after: { lk2: { state: 'ok', sub: 'owner: B' } } },
          { title: 'A needs views, B has it', text: 'A asks for its second lock. B has it, so A waits, still holding the likes-lock.', show: ['lk2', 't1-lk2', 't2-lk2'], go: 'bad:t1>lk2', msg: 'A: lock(views) → wait (B has it)', after: { t1: { state: 'warn', sub: 'waiting for B' } } },
          { title: 'B needs likes, A has it', text: 'B also waits, still holding the views-lock. Now A is waiting for B and B is waiting for A. <strong>No one will ever move forward.</strong> This is a <strong>deadlock</strong>. CPU at 0%, the server looks "alive", but every new like request also gets stuck on these locks, threads run out, and the site hangs.', go: 'bad:t2>lk', show: ['lk2', 't1-lk2', 't2-lk2'], msg: 'B: lock(likes) → wait (A has it)   ⇒ DEADLOCK', after: { t2: { state: 'warn', sub: 'waiting for A' }, lk: { state: 'down', sub: 'stuck' }, lk2: { state: 'down', sub: 'stuck' } } },
        ]},
      ],
    },

    { type: 'callout', tone: 'term', title: 'New word: Deadlock', html: `<strong>What it is:</strong> two (or more) threads waiting forever for a lock the other one holds. No one moves forward.<br><strong>When it happens:</strong> only when four conditions are all true together (the Coffman conditions): (1) a lock belongs to only one at a time, (2) holding one lock while asking for another, (3) no one can take a lock away by force, (4) a circle of waiting (A → B → A). Break even one condition and there is no deadlock.<br><strong>Effect:</strong> CPU at 0%, the server looks "alive", but requests keep getting stuck and the site hangs.` },
    { type: 'list', items: [
      `<strong>Lock ordering (the most common fix):</strong> one rule across the whole codebase: always the likes-lock first, then the views-lock. A circle can never form. Databases give the same advice: always lock rows in the same order (like by id).`,
      `<strong>Timeout:</strong> <code>tryLock(100 ms)</code>; if you do not get it, release what you hold, wait a little, and try again.`,
      `<strong>Only one lock / no lock at all:</strong> atomic operations (<code>AtomicInteger.incrementAndGet()</code>, the CPU\'s compare-and-swap) or make a single thread the owner (event loop / actor style). For a simple counter, a lock is overkill.`,
      `<strong>Detection:</strong> databases (PostgreSQL, MySQL) catch deadlocks by themselves and abort one transaction; the app must know how to retry.`,
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "my server has a lock, so I am safe"', html: `<code>synchronized</code> or <code>threading.Lock</code> only stops threads of <em>the same process</em>. xyz.com has 10 servers; if Riya\'s request went to server 1 and Aman\'s to server 2, each has its own separate lock and the race is back. Across many servers, the same problem is solved with a database row lock, an atomic Redis <code>INCR</code>, or an optimistic version check. The full story is in the <a href="#/pattern-contention">Contention lesson</a>. And in practice, a counter like likes is kept not in memory but in a DB/Redis with an atomic increment.` },

    { type: 'h2', text: 'Thread pools and worker pools: reuse the threads' },
    { type: 'p', html: `We understand races and deadlocks. Now back to speed. "A new thread for every request" fails for two reasons: creating and destroying a thread is expensive, and in a traffic spike there is no limit on the number of threads (10,000 threads = memory runs out). The answer: a <strong>pool</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: Thread pool / Worker pool', html: `<strong>What it is:</strong> a fixed number of ready-made threads (say 50) that keep picking up work from a <strong>queue</strong>. A request arrives → into the queue → a free thread picks it up → the work finishes → the thread goes back to the pool for the next task. A <strong>worker pool</strong> is the same idea, except the workers may be processes instead of threads (Gunicorn workers, Celery workers, background job workers).<br><strong>Why we need it:</strong> it saves the cost of creating threads again and again, and even in a spike the number of threads stays within a limit.<br><strong>Without it:</strong> a new thread for every request: thousands of threads in a spike, memory runs out, the server falls.` },
    { type: 'steps', items: [
      { t: 'Bounded', d: 'The pool size is fixed, so even in a spike the server\'s memory and CPU stay within a limit. Extra work waits in the queue.' },
      { t: 'Reuse', d: 'No cost of creating threads again and again. Tomcat\'s (Java) default request pool has 200 threads, Go runs its goroutines on a few OS threads, and Node\'s libuv pool has 4.' },
      { t: 'Keep the queue bounded too', d: 'If the queue is endless, latency in a spike is endless. When the queue is full, say no early (HTTP 503 / 429). This is called <strong>backpressure</strong>; details in the <a href="#/queues">Queues lesson</a>.' },
      { t: 'The connection pool is in the same family', d: 'Database connections are also expensive, so the app keeps a pool of them. With 50 threads and 10 DB connections, 40 threads will wait on the DB: pool sizes have to match each other.' },
    ]},
    { type: 'h3', text: 'How many threads/workers? A formula' },
    { type: 'p', html: `If one request spends <code>C</code> ms on the CPU and <code>W</code> ms waiting, then to keep one core busy you need about <code>1 + W/C</code> threads (while one waits, another runs). The well-known rule of thumb from Java Concurrency in Practice (Brian Goetz):` },
    { type: 'code', text: `threads ≈ cores × (1 + W / C)

CPU-bound  (W ≈ 0)          → threads ≈ cores          (more only adds switching)
I/O-bound  (C=10, W=90 ms)  → threads ≈ cores × 10     (4 cores → 40 threads)` },
    { type: 'p', html: `Try it yourself. Default: xyz.com\'s <code>/feed</code>, 4 cores, 10 ms CPU, 90 ms DB wait.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <label>Cores: <strong class="wsCv"></strong><input class="wsC" type="range" min="1" max="32" step="1" value="4" aria-label="Cores"></label>
          <label>CPU time per request (ms): <strong class="wsCpuV"></strong><input class="wsCpu" type="range" min="1" max="100" step="1" value="10" aria-label="CPU ms"></label>
          <label>Wait time per request (ms): <strong class="wsWv"></strong><input class="wsW" type="range" min="0" max="500" step="5" value="90" aria-label="Wait ms"></label>
          <label>Workers / threads: <strong class="wsNv"></strong><input class="wsN" type="range" min="1" max="400" step="1" value="4" aria-label="Workers"></label>
        </div>
        <div class="stats">
          <div class="stat"><span>Suggested workers</span><strong class="wsSug"></strong></div>
          <div class="stat"><span>Max throughput</span><strong class="wsTp"></strong></div>
          <div class="stat"><span>CPU busy</span><strong class="wsU"></strong></div>
          <div class="stat"><span>Bottleneck</span><strong class="wsB"></strong></div>
        </div>
        <button type="button" class="btn small ghost wsUse" style="margin-top:8px">Use the suggested value</button>
        <div class="calc-note wsNote"></div>`;
      const q = c => el.querySelector(c);
      const draw = () => {
        const cores = +q('.wsC').value, c = +q('.wsCpu').value, w = +q('.wsW').value, n = +q('.wsN').value;
        q('.wsCv').textContent = cores; q('.wsCpuV').textContent = c; q('.wsWv').textContent = w; q('.wsNv').textContent = n;
        const sug = Math.round(cores * (1 + w / c));
        const byWorkers = n * 1000 / (c + w), byCpu = cores * 1000 / c, tp = Math.min(byWorkers, byCpu);
        const util = tp * c / (cores * 1000);
        q('.wsSug').textContent = sug;
        q('.wsTp').textContent = Math.round(tp) + ' req/s';
        q('.wsU').textContent = Math.round(util * 100) + '%';
        const cpuBound = byCpu <= byWorkers;
        q('.wsB').textContent = cpuBound ? 'CPU' : 'Too few workers';
        let note = cpuBound && n <= Math.ceil(sug * 1.1)
          ? `The right spot: with ${n} workers the CPU is fully busy and throughput is ${Math.round(byCpu)} req/s (${cores} cores × 1000 / ${c} ms). Beyond this, the CPU is the ceiling.`
          : cpuBound
          ? `CPU 100% busy: ${cores} cores × 1000 / ${c} ms = a ceiling of ${Math.round(byCpu)} req/s. More workers (${n}) will not raise throughput; each request will just wait in line for the CPU (latency goes up), and memory and context switches grow. What you need now: more cores or more servers.`
          : `Each worker is stuck on a request for ${c + w} ms, so ${n} workers × 1000 / ${c + w} = ${Math.round(byWorkers)} req/s. The CPU is only ${Math.round(util * 100)}% busy: the cores are sitting idle. Raise workers to ~${sug}.`;
        q('.wsNote').textContent = note;
      };
      el.querySelectorAll('input').forEach(i => i.oninput = draw);
      q('.wsUse').onclick = () => { const cores = +q('.wsC').value, c = +q('.wsCpu').value, w = +q('.wsW').value; q('.wsN').value = Math.min(400, Math.round(cores * (1 + w / c))); draw(); };
      draw();
    }},
    { type: 'p', html: `At the default: 4 workers give only <strong>40 req/s</strong> and the CPU is 10% busy. Press "Use the suggested value": 40 workers → <strong>400 req/s</strong>, CPU 100%. Now make it 200 workers: throughput stays 400, because now the CPU is the ceiling. Now set wait to 0 and CPU to 50 ms (CPU-bound work like a thumbnail): suggested = the number of cores. This formula is a starting estimate; the real number is tuned with a load test (and by watching p99 latency).` },

    { type: 'h2', text: "Amdahl's law: 100 cores, so why not 100x?" },
    { type: 'p', html: `xyz.com\'s team wants to speed up a big job: building a report of all videos at night. They thought: 100 minutes on 1 core, so 1 minute on 100 cores. But every job has some <strong>serial</strong> part that cannot be split at all: loading data, joining all the results (merge), a shared lock, a shared database. In 1967 Gene Amdahl showed that this serial part puts a ceiling on the total speedup.` },
    { type: 'callout', tone: 'term', title: "New word: Amdahl's law", html: `<strong>What it is:</strong> a formula that tells how much faster work can get with more cores. If a part <code>p</code> of the work can run in parallel (and <code>1 − p</code> is serial), the speedup on <code>N</code> cores is:<br><code>Speedup = 1 / ((1 − p) + p / N)</code><br>When N is very big, <code>p/N</code> is about 0, so the ceiling on speedup = <code>1 / (1 − p)</code>. Work that is 90% parallel will never be more than 10x faster, even with 1 lakh cores.<br><strong>Why it matters:</strong> before buying cores, you can tell whether it will help or not.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <label>Parallel part p: <strong class="amPv"></strong><input class="amP" type="range" min="0" max="99" step="1" value="90" aria-label="Parallel fraction"></label>
          <label>Cores N: <strong class="amNv"></strong><input class="amN" type="range" min="0" max="10" step="1" value="3" aria-label="Cores, powers of two"></label>
        </div>
        <svg class="amSvg" viewBox="0 0 640 260" style="width:100%;height:auto;display:block;margin-top:10px" role="img" aria-label="Speedup vs cores"></svg>
        <div class="stats">
          <div class="stat"><span>Speedup</span><strong class="amS"></strong></div>
          <div class="stat"><span>Ideal (N)</span><strong class="amI"></strong></div>
          <div class="stat"><span>Efficiency</span><strong class="amE"></strong></div>
          <div class="stat"><span>Ceiling (N → ∞)</span><strong class="amM"></strong></div>
        </div>
        <div class="calc-note amNote"></div>`;
      const q = c => el.querySelector(c);
      const sp = (p, n) => 1 / ((1 - p) + p / n);
      const draw = () => {
        const p = +q('.amP').value / 100, k = +q('.amN').value, n = 2 ** k;
        q('.amPv').textContent = Math.round(p * 100) + '%'; q('.amNv').textContent = n;
        const s = sp(p, n), cap = 1 / (1 - p);
        const f = v => v >= 100 ? v.toFixed(0) : v.toFixed(2).replace(/\.?0+$/, '');
        q('.amS').textContent = f(s) + 'x'; q('.amI').textContent = n + 'x';
        q('.amE').textContent = Math.round(s / n * 100) + '%'; q('.amM').textContent = f(cap) + 'x';
        const L = 44, R = 624, T = 12, B = 224, yMax = Math.max(4, Math.min(1024, cap * 1.15));
        const X = kk => L + kk / 10 * (R - L), Y = v => B - Math.min(v, yMax) / yMax * (B - T);
        let g = `<line x1="${L}" y1="${B}" x2="${R}" y2="${B}" stroke="var(--line-2)"/><line x1="${L}" y1="${T}" x2="${L}" y2="${B}" stroke="var(--line-2)"/>`;
        for (let i = 0; i <= 10; i += 2) g += `<text x="${X(i)}" y="${B + 16}" font-size="11" text-anchor="middle" fill="var(--ink-3)" font-family="var(--f-mono)">${2 ** i}</text>`;
        g += `<text x="${(L + R) / 2}" y="${B + 32}" font-size="11" text-anchor="middle" fill="var(--ink-3)">cores (N)</text><text x="${L + 6}" y="${T + 10}" font-size="11" fill="var(--ink-3)">speedup</text>`;
        [0, 0.5, 1].forEach(fr => { const v = yMax * fr; g += `<text x="${L - 6}" y="${Y(v) + 4}" font-size="11" text-anchor="end" fill="var(--ink-3)" font-family="var(--f-mono)">${Math.round(v)}</text>`; });
        let ideal = '', act = '';
        for (let t = 0; t <= 100; t++) { const kk = t / 10, nn = 2 ** kk; if (nn <= yMax) ideal += (ideal ? 'L' : 'M') + X(kk).toFixed(1) + ' ' + Y(nn).toFixed(1); act += (t ? 'L' : 'M') + X(kk).toFixed(1) + ' ' + Y(sp(p, nn)).toFixed(1); }
        g += `<path d="${ideal}" fill="none" stroke="var(--ink-3)" stroke-dasharray="4 4"/>`;
        g += `<line x1="${L}" y1="${Y(cap)}" x2="${R}" y2="${Y(cap)}" stroke="var(--red)" stroke-dasharray="2 3"/><text x="${R}" y="${Y(cap) - 5}" font-size="11" text-anchor="end" fill="var(--red)">ceiling ${f(cap)}x</text>`;
        g += `<path d="${act}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>`;
        g += `<circle cx="${X(k)}" cy="${Y(s)}" r="5" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>`;
        q('.amSvg').innerHTML = g;
        q('.amNote').textContent = p === 0 ? 'p = 0: nothing is parallel; with or without more cores, the speedup is 1x.'
          : `${f(s)}x on ${n} cores, so each core is only ${Math.round(s / n * 100)}% useful. The serial ${Math.round((1 - p) * 100)}% part stops it at a ceiling of ${f(cap)}x. Dashed line = ideal (N cores = Nx).`;
      };
      el.querySelectorAll('input').forEach(i => i.oninput = draw);
      draw();
    }},
    { type: 'p', html: `Try it: p = 90%, N = 8 → <strong>4.71x</strong> (not 8x). N = 1024 → 9.91x, ceiling 10x. At p = 50% the ceiling is only 2x. p = 99%, N = 64 → ~39x. The lesson: before buying more cores, <strong>make the serial part smaller</strong>: remove the shared lock, do not write everything to one central DB, and split the merge step too.` },
    { type: 'callout', tone: 'why', title: 'But web servers scale "almost linearly"?', html: `Yes, because requests from different xyz.com users are almost independent of each other: p looks close to 1. Each new server handles about the same number of extra requests. The serial part hides in <strong>shared things</strong>: one primary database, one global lock, one hot counter. When that saturates, adding new app servers does nothing. That is why the scaling story later moves to caching, replication and sharding. (A related idea, <strong>Gustafson\'s law</strong>: when cores grow, people often make the work bigger too, like processing more data; then the parallel part grows and the speedup looks better.)` },

    { type: 'h2', text: 'How all this connects to server sizing' },
    { type: 'p', html: `Now the real question: how many workers should we run on one 4-core xyz.com server? Each popular stack has its own model, but they all rest on the two ideas above: <em>cores give parallelism, concurrency fills the waiting</em>.` },
    { type: 'table', head: ['Stack', 'How concurrency', 'How parallelism', 'Typical setting (4 cores)'], rows: [
      ['Python (Django/Flask) + Gunicorn', 'Each sync worker does 1 request at a time; or async/thread workers', 'Many worker processes (each with its own GIL)', 'Gunicorn docs\' starting estimate: (2 × cores) + 1 = 9 workers'],
      ['Node.js', 'Event loop: one process, thousands of connections', 'One process per core (cluster / PM2 / pods)', '4 processes'],
      ['Java (Spring/Tomcat)', 'Thread pool (Tomcat default 200 threads)', 'The threads themselves run on many cores', '1 process, ~200 threads'],
      ['Go', 'Goroutines (very light; lakhs can be created)', 'The Go runtime runs them on all cores', '1 process'],
    ], caption: 'These are starting defaults. The real number is tuned with a load test.' },
    { type: 'p', html: `Gunicorn\'s <code>2 × cores + 1</code> also comes from this logic: according to its docs, for each core one worker is processing a request while another is reading or writing a socket. If your API is very I/O-heavy (mostly waiting for DB/API calls), use async or threaded workers, or add workers: <strong>an I/O-heavy API can have far more workers than cores</strong>, because most workers are waiting, not using the CPU. On a CPU-heavy service (thumbnails, encoding), workers ≈ cores; otherwise only context switching and memory grow.` },
    { type: 'p', html: `Once you have the throughput of one server (the calculator above), the number of servers is simple math: peak QPS ÷ one server\'s safe QPS × headroom. The full method is in the <a href="#/decide-servers">How many servers?</a> lesson.` },
    { type: 'callout', tone: 'tip', title: 'Decide: concurrency or parallelism, and which tool', html: `First ask: <strong>where does the work\'s time go, CPU or waiting?</strong> (from a profiler or metrics, not from a guess).<br>• <strong>I/O-bound</strong> (APIs, DB calls, chat, proxies) → concurrency: async/event loop, or threads/workers ≈ <code>cores × (1 + W/C)</code>. Many times more workers than cores is fine.<br>• <strong>CPU-bound</strong> (image/video, ML, hashing, compression) → parallelism: workers ≈ cores, separate processes (multiprocessing in Python), and move such work out of the request path into a queue + background workers.<br>• <strong>You need to write shared data</strong> → first remove the sharing (each request has its own data, or an atomic DB/Redis op); if you must, use a lock, always in the same order, for a short time. With many servers, lock at the DB/Redis level (<a href="#/pattern-contention">Contention</a>).<br>• <strong>More cores do not make it faster</strong> → Amdahl: find the serial part (shared DB, global lock, merge) and make it smaller.` },
    { type: 'callout', tone: 'mistake', title: 'One more confusion: "async = fast"', html: `Async does not make one request faster. An 80 ms DB query still takes 80 ms with async. Async only lets the server handle <em>other requests</em> during the wait, so <strong>throughput</strong> goes up; latency does not go down. And making CPU-heavy work async gains nothing; worse, it blocks the event loop.` },
    { type: 'diagram', title: 'Concurrency at xyz.com: the whole picture', height: 610,
      groups: [
        { label: 'App server (4 cores)', x: 20, y: 210, w: 680, h: 115 },
        { label: 'Shared data', x: 20, y: 350, w: 680, h: 115 },
        { label: 'Background (CPU-bound)', x: 190, y: 490, w: 400, h: 105 },
      ],
      nodes: [
        { id: 'users', label: 'Users', sub: 'thousands at once', x: 360, y: 50, w: 160, kind: 'client', info: 'What it is: xyz.com\'s users, who send thousands of requests in a single second. Handling them is the job of concurrency.' },
        { id: 'lb', label: 'Load Balancer', x: 360, y: 150, w: 150, kind: 'net', info: 'What it is: the part that shares requests among many servers. Concurrency inside each server, parallelism across servers: together they give throughput.' },
        { id: 'wp', label: 'Worker pool', sub: '~40 workers (I/O)', x: 240, y: 270, w: 160, kind: 'server', info: 'What it is: a fixed number of threads/workers that pick up requests from a queue. Work like /feed is I/O-bound (10 ms CPU, 90 ms wait), so ~40 workers on 4 cores: cores × (1 + W/C).' },
        { id: 'cp', label: 'DB conn pool', sub: '20 connections', x: 510, y: 270, w: 150, kind: 'queue', info: 'What it is: a pool of database connections, to avoid opening a connection again and again. Its size must match the worker pool, or workers wait in line here.' },
        { id: 'redis', label: 'Redis', sub: 'atomic INCR', x: 110, y: 410, w: 140, kind: 'cache', info: 'What it is: a fast, RAM-based store. The likes counter goes up here with an atomic INCR: READ-ADD-WRITE in a single step, so there is no race condition even across many servers.' },
        { id: 'q', label: 'Job queue', sub: 'resize jobs', x: 330, y: 410, w: 140, kind: 'queue', info: 'What it is: a line of work. CPU-heavy work (photo resizing) is taken off the request path and put here, so the API workers / event loop do not get stuck.' },
        { id: 'db', label: 'Database', sub: 'row locks', x: 580, y: 410, w: 140, kind: 'data', info: 'What it is: the real data. It keeps concurrent writes from many servers correct with row locks and transactions, and catches a deadlock by aborting one transaction.' },
        { id: 'cpu', label: 'Thumbnail workers', sub: 'workers = cores', x: 470, y: 545, w: 170, kind: 'server', info: 'What it is: separate processes that pick up resize jobs from the queue. The work is CPU-bound, so workers ≈ cores (parallelism). More workers = only more context switching.' },
      ],
      edges: [
        { a: 'users', b: 'lb', n: 1 },
        { a: 'lb', b: 'wp', n: 2 },
        { a: 'wp', b: 'cp', n: 3, label: 'DB call' },
        { a: 'cp', b: 'db', n: 4 },
        { a: 'wp', b: 'redis', label: 'INCR likes' },
        { a: 'wp', b: 'q', dashed: true, kind: 'evt', label: 'resize job' },
        { a: 'q', b: 'cpu', kind: 'evt' },
        { a: 'cpu', b: 'db', dashed: true, label: 'save' },
      ],
      paths: [
        { name: 'Feed (I/O-bound)', text: 'A worker took the request, got a connection from the DB pool and waited for the answer. During the wait, other workers kept using the CPU: concurrency.', go: ['users>lb>wp>cp>db'] },
        { name: 'Like (shared counter)', text: 'Many servers increase the same counter. A process lock is not enough, so Redis\'s atomic INCR is used.', go: ['users>lb>wp>redis'] },
        { name: 'Photo upload (CPU-bound)', text: 'Resizing would eat the CPU, so the API only put a job in the queue and answered right away. Thumbnail workers (as many as the cores) resize in parallel and save to the DB.', go: ['users>lb>wp>q>cpu>db'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Concurrency = handling many tasks (switching during waits). Parallelism = many tasks really at the same time (many cores).</li>
      <li>Identify first: I/O-bound (mostly waiting) → concurrency; CPU-bound (mostly calculation) → parallelism.</li>
      <li>Process = separate memory, safe. Thread = shared memory, cheap, but with the risk of race conditions.</li>
      <li>Event loop (Node.js) = one thread, thousands of connections; CPU-heavy work stops it.</li>
      <li>Python\'s GIL: in the default build, one thread at a time per process; use processes for CPU work.</li>
      <li>Shared data: locks, atomic ops; always take several locks in the same order (protects from deadlock). With many servers, lock at the DB/Redis level.</li>
      <li>Workers ≈ cores × (1 + W/C). Amdahl: the serial part is the ceiling on speedup.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: [
        'Concurrency: the CPU works during waits, so many times more requests on the same machine',
        'Parallelism: CPU-heavy work gets faster almost linearly with cores (as long as the serial part is small)',
        'Thread/worker pools: bounded memory, threads reused, the server stays alive even in a spike',
        'Event loop: thousands of connections on one thread, very little memory per connection',
      ],
      costs: [
        'Race conditions with shared memory: quietly wrong data, hard to catch in testing',
        'Locks: waiting, contention, and deadlock if the order is wrong',
        'Context switching and memory for each thread: too many threads actually slow things down',
        'The event loop gets completely stuck on one CPU-heavy request',
        "Amdahl: the serial part puts a ceiling on speedup; buying cores does not always help",
        'Hard debugging: the bug depends on timing and does not reproduce every time',
      ],
    },
    { type: 'think', questions: [
      { q: 'xyz.com\'s Node.js API was running well. A new feature came: on upload, the server itself resizes a 4K photo. Now /feed has become slow for all users too, even though the feed has nothing to do with resizing. Why, and what is the fix?', a: 'Resizing is CPU-bound work, and in Node your JavaScript runs on a single event loop thread. While the resize runs, the loop cannot run any other callback (including feed requests). Fix: move the resize off the event loop: worker_threads, a separate process, or better: after upload, put a job in a queue and have separate thumbnail workers (workers ≈ cores) do it.' },
      { q: 'A Python Flask service runs in one process with 8 threads on an 8-core machine. The work: heavy pure-Python calculation on every request. The CPU shows only ~12-13%. What is happening?', a: 'The GIL. In default CPython, only one thread inside a process can run Python bytecode at a time, so 8 threads together use only about 1 core (1 of 8 = 12.5%). Fix: ~8 Gunicorn worker processes (or multiprocessing), or move the calculation into a library like NumPy that releases the GIL. Python 3.13+\'s free-threaded build is also an option, but then you must check support in all C libraries.' },
      { q: 'The team ran the report job on 64 cores instead of 8, and the time only went from 8 min to 6 min. What will you check?', a: "Amdahl's law: there is a big serial part. For example, all workers write to the same DB table, a global lock, or a single-threaded merge at the end. Profile where the time goes, and break the serial part (write in partitions, make the merge parallel like a tree). Adding more cores will not help." },
      { q: 'Interview: "Why not just 4 workers on our API\'s 4-core servers? One worker per core is logical."', a: 'One worker per core is right only when the work is CPU-bound. The API is mostly I/O-bound: if a request is 10 ms CPU and 90 ms DB wait, then with 4 workers the CPU is ~10% busy and throughput is ~40 req/s. Cores × (1 + W/C) ≈ 40 workers (or async I/O) use the CPU fully, for ~400 req/s. The upper limit comes from CPU, memory and the DB connection pool; tune with a load test.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'A one-core server runs two requests interleaved (when one waits for the DB, the other runs). What is this?', options: ['Parallelism', 'Concurrency (without parallelism)', 'Both', 'Neither, this is sequential'], answer: 1, explain: 'Only one task runs at a moment, but both move forward. Parallelism needs more than one core.' },
      { q: 'Which work will gain the most from concurrency (async / more threads), without new cores?', options: ['Video encoding', 'Calling many other APIs and joining the results', 'Password hashing (bcrypt)', 'Multiplying a big matrix'], answer: 1, explain: 'API calls are I/O-bound: most of the time is waiting. The other three are CPU-bound; they need cores (parallelism).' },
      { q: 'Two threads ran likes = likes + 1 at the same time, without a lock. It started at 100. What can the final value be?', options: ['Only 102', '101 or 102', 'Only 101', '100'], answer: 1, explain: 'If both did READ at the same time (both 100), it is a lost update: 101. If one\'s WRITE happened before the other\'s READ, 102. The result depends on timing: that is a race condition.' },
      { q: 'p = 0.8 (80% of the work is parallel). No matter how many cores, the maximum speedup?', options: ['8x', '5x', '80x', 'Equal to the cores'], answer: 1, explain: 'Ceiling = 1 / (1 − p) = 1 / 0.2 = 5x.' },
      { q: 'What is true about default CPython (python3, standard build)?', options: ['The GIL was fully removed in Python 3.13', 'The GIL is in the default build; 3.13+ has an optional free-threaded build, officially supported since 3.14', 'The GIL only stops I/O threads', 'Python has no threads at all'], answer: 1, explain: 'PEP 703 opened the way to an optional GIL, the free-threaded build came as experimental in 3.13, and after PEP 779 it is officially supported in 3.14, but the default build still has the GIL.' },
      { q: 'Thread A holds lock L1 and asks for L2; Thread B holds L2 and asks for L1. The most common permanent fix?', options: ['Add more threads', 'Always take locks in the same order everywhere in the code', 'Get a faster CPU', 'Remove the lock and hope for the best'], answer: 1, explain: 'With the same lock order, a "circle" (circular wait) can never form, so there is no deadlock. A timeout is a backup safety.' },
    ]},
    { type: 'sources', items: [
      { title: 'Python support for free threading (HOWTO)', publisher: 'Python documentation', official: true, url: 'https://docs.python.org/3/howto/free-threading-python.html', used: 'Free-threaded build since 3.13, supported in 3.14, GIL ON in the default build, single-thread overhead ~1-8%, python3.14t naming.' },
      { title: 'PEP 703: Making the Global Interpreter Lock Optional in CPython', publisher: 'Python Software Foundation', official: true, url: 'https://peps.python.org/pep-0703/', used: 'The design for making the GIL optional.' },
      { title: 'PEP 779: Criteria for supported status for free-threaded Python', publisher: 'Python Software Foundation', official: true, url: 'https://peps.python.org/pep-0779/', used: 'Accepted in June 2025; in 3.14 the free-threaded build is "supported" but optional and separate.' },
      { title: "Don't Block the Event Loop (or the Worker Pool)", publisher: 'Node.js official docs', official: true, url: 'https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop', used: 'One JS thread, who uses the worker pool (fs, dns.lookup, crypto, zlib), CPU work blocking the event loop.' },
      { title: 'Thread pool work scheduling', publisher: 'libuv documentation', official: true, url: 'https://docs.libuv.org/en/v1.x/threadpool.html', used: 'Default pool size 4, UV_THREADPOOL_SIZE, max 1024.' },
      { title: 'Gunicorn design: How many workers?', publisher: 'Gunicorn documentation', official: true, url: 'https://gunicorn.org/design/', used: 'The (2 × cores) + 1 workers starting estimate and the reason for it.' },
      { title: 'Concurrency is not parallelism (Rob Pike talk)', publisher: 'The Go Blog', official: true, url: 'https://go.dev/blog/waza-talk', year: 2013, used: 'The difference between concurrency (structure) and parallelism (execution).' },
      { title: 'Validity of the single processor approach to achieving large scale computing capabilities (Amdahl)', publisher: 'AFIPS Spring Joint Computer Conference', url: 'https://doi.org/10.1145/1465482.1465560', year: 1967, used: "The original argument for Amdahl's law." },
    ]},
  ],
});
