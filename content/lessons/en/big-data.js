Lesson.register({
  id: 'big-data',
  title: 'Batch vs stream processing',
  minutes: 42,
  summary: `xyz.com creates tens of millions of events every day: views, clicks, searches, uploads. "Which videos were watched most yesterday?" and "how many people are watching the live match right now?" both come from this data. But one answer can wait hours, and the other is needed in seconds. In this lesson: batch and stream processing, MapReduce (run it yourself), Spark, Flink, Kafka Streams, windows (tumbling, sliding, session), event time and watermarks, ETL vs ELT, data lake / warehouse / lakehouse, Lambda vs Kappa, and OLTP vs OLAP.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Every second, lakhs of small things happen on xyz.com (1 lakh = 100,000): someone watched a video, someone liked one, someone searched.<br>We need to add all of these up to answer questions: "what was watched most yesterday?" and "how many people are live right now?"<br>The first question can be answered slowly, overnight. The second needs an answer every few seconds.<br>In this lesson we learn how to count huge data <strong>as one big pile</strong> (batch) and <strong>as a flowing river</strong> (stream), and why this work happens away from the main website database.` },
    { type: 'h2', text: 'Problem: do not run analytics on the production database' },
    { type: 'p', html: `In the previous lessons, xyz.com services learned to send events: <code>VideoViewed</code>, <code>VideoUploaded</code>, <code>SearchDone</code>. Now every team has questions:` },
    { type: 'list', items: [
      `<strong>Product team:</strong> "What were yesterday's top 100 videos? What did each creator earn this month?"`,
      `<strong>Recommendations team:</strong> "We need to train a model on all watch events of the last 90 days."`,
      `<strong>Live team:</strong> "How many people are watching the cricket final <em>right now</em>? We need an update every 10 seconds."`,
      `<strong>Ads/fraud team:</strong> "500 ad clicks from one IP in 1 minute? Block it <em>immediately</em>."`,
    ]},
    { type: 'callout', tone: 'term', title: 'New word: Event', html: `<strong>What it is:</strong> a small record that says "something happened": who, what, when. For example <code>{ type: "VideoViewed", user: 912, video: 7, time: "20:15:03" }</code>.<br><strong>Why we need it:</strong> every question ("how many views?", "who is cheating?") is answered by counting these records.<br><strong>Without it:</strong> we only keep the current state (the current row in the database), not the history of what happened.` },
    { type: 'p', html: `First idea: get all of this from the main Postgres with <code>SELECT ... GROUP BY</code>. The problem: say there are 50 crore (500 million) view events a day. One "top videos" query will read hundreds of millions of rows. It will eat the disk and the CPU. At the same time, user logins and uploads become slow. A production database is built for small, fast, one-row queries. It is not built to scan and add up hundreds of millions of rows.` },
    { type: 'callout', tone: 'term', title: 'New word: Production database', html: `<strong>What it is:</strong> the database the website runs on <em>right now</em>: logins, uploads and comments all read and write here.<br><strong>Why we protect it:</strong> every millisecond of it belongs to users.<br><strong>If you run heavy analytics on it:</strong> the site gets slow, and on a bad day it goes down.` },
    { type: 'callout', tone: 'term', title: 'New word: Data pipeline', html: `<strong>What it is:</strong> the path by which raw data (events, logs, database changes) leaves one place, gets cleaned and processed, and arrives somewhere useful (a dashboard, a report, an ML model, an alert). Think of a conveyor belt that carries raw material from one factory to another.<br><strong>Why we need it:</strong> analytics, recommendations, fraud detection, trending lists and live leaderboards all need events, but without touching the production database.<br><strong>Without it:</strong> every team runs its heavy query directly on the production database.` },
    { type: 'callout', tone: 'term', title: 'New word: Batch processing', html: `<strong>What it is:</strong> take a <em>big, fixed chunk</em> of data (like "all of yesterday's events") at once, process it, and write the result. The data has a start and an end: this is called <strong>bounded</strong> data. Like a teacher who checks all the answer sheets together at the end of the year.<br><strong>Why we need it:</strong> a correct, final and cheap answer over all the data. If something goes wrong, you can run it again.<br><strong>Without it:</strong> no final number for monthly payouts or ML training.<br><strong>Example:</strong> a "yesterday's report" job at 2 am. The result comes hours later.` },
    { type: 'callout', tone: 'term', title: 'New word: Stream processing', html: `<strong>What it is:</strong> process events as they arrive. The flow never ends: this is called <strong>unbounded</strong> data. Like a cricket scoreboard that changes with every ball.<br><strong>Why we need it:</strong> some answers are needed in seconds: live viewers, a fraud click, what is trending now.<br><strong>Without it:</strong> you find out about fraud at night, after the money is gone.<br><strong>The catch:</strong> there is never "all the data", so you have to think in <em>windows</em> like "the last 1 minute" (see the widget later).` },
    { type: 'compare',
      left: { title: 'Batch', html: `• Input: bounded (yesterday's data)<br>• When: on a schedule (every night, every hour)<br>• Latency: minutes to hours<br>• Complete and correct, can be re-run<br>• Tools: MapReduce/Hadoop, Spark, warehouse SQL<br>• Example: daily report, ML training, monthly creator payouts` },
      right: { title: 'Stream', html: `• Input: unbounded (events keep coming)<br>• When: always on<br>• Latency: milliseconds to seconds<br>• Trouble with late/out-of-order events; state is hard to manage<br>• Tools: Flink, Kafka Streams, Spark Structured Streaming<br>• Example: live viewers, fraud checks, surge pricing, trending` },
    },
    { type: 'callout', tone: 'term', title: 'New word: Latency (of data)', html: `<strong>What it is:</strong> the time between an event happening and its result showing on a dashboard. Seconds for a stream, hours for a batch.<br><strong>Why it matters:</strong> it decides whether batch is enough or you need a stream.<br><strong>Note:</strong> lower latency often comes with less certainty (late events can be missed).` },
    { type: 'p', html: `Feel it yourself. Below is one day on xyz.com: how many lakh views came in each hour. Move the "time now" slider forward and see what the stream dashboard and the batch report show.` },
    { type: 'custom', render(el) {
      const H = [3, 2, 1, 1, 1, 2, 4, 6, 8, 9, 10, 11, 12, 12, 11, 11, 12, 14, 17, 20, 22, 21, 15, 8];
      const LATE = 0.01;
      el.innerHTML = `<label>Time now: <strong class="bs-tv"></strong></label><input class="bs-t" type="range" min="1" max="27" step="1" value="20">
        <svg class="bs-svg" viewBox="0 0 640 170" style="width:100%;height:auto;margin-top:8px;display:block" role="img" aria-label="Views per hour"></svg>
        <div class="stats">
          <div class="stat"><span>Real views (today so far)</span><strong class="bs-true"></strong></div>
          <div class="stat"><span>Stream dashboard</span><strong class="bs-st"></strong></div>
          <div class="stat"><span>Batch report (today's)</span><strong class="bs-bt"></strong></div>
        </div>
        <div class="calc-note bs-note"></div>`;
      const $ = c => el.querySelector(c);
      const hh = t => (t % 24 < 10 ? '0' : '') + (t % 24) + ':00' + (t >= 24 ? ' (next day)' : '');
      const upd = () => {
        const t = +$('.bs-t').value, upto = Math.min(t, 24);
        const tru = H.slice(0, upto).reduce((a, b) => a + b, 0), total = H.reduce((a, b) => a + b, 0);
        $('.bs-tv').textContent = hh(t);
        let svg = '';
        H.forEach((v, i) => { const x = 20 + i * 25, hgt = v * 5.5; svg += `<rect x="${x}" y="${130 - hgt}" width="19" height="${hgt}" rx="3" fill="${i < upto ? 'var(--accent)' : 'var(--line-2)'}" opacity="${i < upto ? 1 : .6}"/>`; if (i % 3 === 0) svg += `<text x="${x + 9}" y="148" text-anchor="middle" font-size="11" fill="var(--ink-3)" font-family="var(--f-mono)">${i}h</text>`; });
        svg += `<line x1="${20 + Math.min(t, 24) * 25 - 3}" y1="8" x2="${20 + Math.min(t, 24) * 25 - 3}" y2="134" stroke="var(--red)" stroke-width="2"/>`;
        svg += `<text x="620" y="166" text-anchor="end" font-size="11" fill="var(--ink-3)">batch job: night 02:00-03:00</text>`;
        $('.bs-svg').innerHTML = svg;
        $('.bs-true').textContent = tru + ' lakh';
        $('.bs-st').textContent = '~' + (tru * (1 - LATE)).toFixed(1) + ' lakh (10 s old)';
        const done = t >= 27;
        $('.bs-bt').textContent = done ? total + ' lakh (final)' : t >= 26 ? 'job is running...' : 'not yet (2 am)';
        $('.bs-note').textContent = done
          ? `The batch job counted the whole day at once: ${total} lakh, late events included. But this number came 3 hours after the day ended. The stream showed ~${(total * (1 - LATE)).toFixed(1)} lakh all day: ~1% of events (from offline phones) arrived late and were missed by the live count.`
          : `The stream dashboard updates every ~10 seconds. But ~1% of events arrive late (the phone was offline), so the live number is a little low. The batch report does not exist yet. It runs once, at 2 am, after the day ends.`;
      };
      $('.bs-t').addEventListener('input', upd); upd();
    } },
    { type: 'p', html: `The lesson: a stream gives you a <strong>fast</strong> answer, a batch gives you a <strong>final</strong> answer. That is why many companies keep both. Now let us look at the tools for each, one by one.` },
    { type: 'h2', text: 'MapReduce: splitting one big job across a thousand machines' },
    { type: 'p', html: `In the early 2000s Google had the pages and logs of the whole web: so much data that one machine could never process it. Every team wrote its own distributed code: how to split the data across machines, what to do when a machine dies, how to join the results. In 2004 Jeffrey Dean and Sanjay Ghemawat wrote a paper: <em>"MapReduce: Simplified Data Processing on Large Clusters"</em> (OSDI 2004). The idea was so simple that the programmer writes only two functions, and a library handles all the hard parts (splitting, dying machines, joining results).` },
    { type: 'callout', tone: 'term', title: 'New word: MapReduce', html: `<strong>What it is:</strong> a way (and the software) to process big data by splitting it across a thousand machines. You only write two small functions: <em>map</em> and <em>reduce</em>.<br><strong>Why we need it:</strong> the data does not fit on one machine. You need a thousand machines, and managing them (splitting work, machines dying, joining results) is hard. MapReduce does that hard work for you.<br><strong>Without it:</strong> every team writes its own distributed code, and the job breaks every time a machine dies.<br><strong>Example:</strong> 40 students count the words of a thick book. Each student counts their own 10 pages (map). Then words from "a" to "m" go to one student and the rest to another (shuffle), and they add them up (reduce).` },
    { type: 'callout', tone: 'term', title: 'New words: Map, Shuffle, Reduce, Combiner', html: `<strong>Map:</strong> a function that runs on every input record and outputs <code>(key, value)</code> pairs. <em>Key</em> = what we are counting, <em>value</em> = how much. In word count: <code>(word, 1)</code> for every word.<br><strong>Shuffle:</strong> the framework's job (not your code): bring all pairs with the same key to one machine, and sort them by key. Which machine? It is decided by the key's <em>hash</em> (a number computed from the key).<br><strong>Reduce:</strong> a function that takes one key with all its values and combines them: <code>("live", [1,1,1,1]) → ("live", 4)</code>.<br><strong>Combiner (optional):</strong> a small reduce on the mapper's own machine, so fewer pairs travel over the network.<br><strong>Why three steps:</strong> map and reduce both run in parallel, because each machine handles its own separate part. Shuffle is the bridge that carries the right data to the right machine.` },
    { type: 'callout', tone: 'term', title: 'New word: Distributed file system (GFS, HDFS)', html: `<strong>What it is:</strong> one "big hard disk" that is really made of the disks of a thousand machines. It cuts each file into pieces (blocks) of about 64 MB and keeps them on different machines, with 3 copies of each piece. Google's GFS, Hadoop's HDFS. Today object storage like S3 mostly does this job.<br><strong>Why we need it:</strong> MapReduce input and output live here. If one machine dies, another copy is used.<br><strong>Without it:</strong> one broken disk = data gone.` },
    { type: 'p', html: `Below are 4 lines of xyz.com's search log, split across two machines (mappers). Press "Next step" at each step. Turn the combiner on/off and see how many pairs travel over the network.` },
    { type: 'custom', render(el) {
      const SPLITS = [['cricket live score', 'live cricket match'], ['cricket highlights', 'live news live']];
      const R = 2;
      const h = w => { let s = 0; for (const c of w) s += c.charCodeAt(0); return s; };
      const part = w => h(w) % R;
      const STEPS = ['Input', 'Map', 'Combine', 'Shuffle', 'Reduce'];
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
          <button type="button" class="btn small ghost bd-prev">Back</button>
          <button type="button" class="btn small primary bd-next">Next step</button>
          <label style="display:flex;gap:6px;align-items:center;font-size:14px;color:var(--ink-2)"><input class="bd-comb" type="checkbox"> Combiner on</label>
        </div>
        <div class="chips bd-steps" style="margin-top:10px"></div>
        <div class="bd-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:10px"></div>
        <div class="stats">
          <div class="stat"><span>Pairs made by mappers</span><strong class="bd-emit"></strong></div>
          <div class="stat"><span>Pairs sent on the network (shuffle)</span><strong class="bd-net"></strong></div>
          <div class="stat"><span>Final output</span><strong class="bd-out"></strong></div>
        </div>
        <div class="calc-note bd-note"></div>`;
      const $ = c => el.querySelector(c);
      let step = 0;
      const box = (title, body, tone) => `<div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:8px 10px;background:${tone ? 'var(--accent-soft)' : 'var(--surface)'}"><div style="font:600 13px var(--f-display);color:var(--ink);margin-bottom:4px">${title}</div><div style="font:12.5px/1.6 var(--f-mono);color:var(--ink-2);word-break:break-word">${body}</div></div>`;
      const compute = comb => {
        const mapped = SPLITS.map(lines => lines.flatMap(l => l.split(' ').map(w => [w, 1])));
        const combined = mapped.map(pairs => { const m = {}; pairs.forEach(([w, v]) => m[w] = (m[w] || 0) + v); return Object.entries(m); });
        const sent = comb ? combined : mapped;
        const groups = Array.from({ length: R }, () => ({}));
        sent.forEach(pairs => pairs.forEach(([w, v]) => { const g = groups[part(w)]; (g[w] = g[w] || []).push(v); }));
        const reduced = groups.map(g => Object.keys(g).sort().map(w => [w, g[w].reduce((a, b) => a + b, 0)]));
        return { mapped, combined, sent, groups, reduced, emitted: mapped.flat().length, net: sent.flat().length };
      };
      const upd = () => {
        const comb = $('.bd-comb').checked;
        if (!comb && step === 2) step = 3;
        const c = compute(comb);
        $('.bd-steps').innerHTML = STEPS.map((s, i) => `<span class="chip${i === step ? ' on' : ''}" style="${!comb && i === 2 ? 'opacity:.45;text-decoration:line-through' : ''}">${i + 1}. ${s}</span>`).join('');
        let html = '';
        if (step === 0) html = SPLITS.map((ls, i) => box(`Split ${i + 1} → Mapper ${i + 1}`, ls.map(l => `"${l}"`).join('<br>'))).join('');
        if (step === 1) html = c.mapped.map((ps, i) => box(`Mapper ${i + 1}: map()`, ps.map(([w, v]) => `(${w}, ${v})`).join('<br>'), 1)).join('');
        if (step === 2) html = c.combined.map((ps, i) => box(`Mapper ${i + 1}: combine()`, ps.map(([w, v]) => `(${w}, ${v})`).join('<br>'), 1)).join('');
        if (step === 3) html = c.groups.map((g, i) => box(`Reducer ${i} got (sorted)`, Object.keys(g).sort().map(w => `${w} [h=${h(w)}] → [${g[w].join(', ')}]`).join('<br>'), 1)).join('');
        if (step === 4) html = c.reduced.map((ps, i) => box(`Reducer ${i}: reduce()`, ps.map(([w, v]) => `${w}: <strong>${v}</strong>`).join('<br>'), 1)).join('');
        $('.bd-grid').innerHTML = html;
        $('.bd-emit').textContent = step >= 1 ? c.emitted : '-';
        $('.bd-net').textContent = step >= 3 ? c.net : '-';
        $('.bd-out').textContent = step >= 4 ? c.reduced.flat().map(([w, v]) => w + ':' + v).join(' ') : '-';
        const notes = [
          '4 lines, 2 splits. In real MapReduce the input was cut into pieces (splits) of 16-64 MB, and each split became one map task. The master (a coordinator) gives map tasks to idle machines. It tries to run a task on the machine that already has a copy of that split on its disk (send the compute to the data, do not move the data over the network).',
          `Each mapper made (word, 1) for every word: ${c.emitted} pairs in total. Mappers do not talk to each other, so they run in parallel and independently. The output is written to the mapper's own local disk, split into R parts.`,
          `The combiner added up the same words on the mapper itself: Mapper 1 went from ${c.mapped[0].length} pairs to ${c.combined[0].length}, Mapper 2 from ${c.mapped[1].length} to ${c.combined[1].length}. This only works when doing the operation (like a sum) in pieces and then joining gives the same answer.`,
          `Shuffle: the reducer for each pair = hash(word) mod ${R}. Here the hash is just the sum of the letter codes (only to explain the idea). The same word always goes to the same reducer, no matter which mapper it came from. Each reducer pulls its pairs from the mappers' disks over the network and sorts them by key. ${c.net} pairs went over the network${comb ? ' (instead of ' + c.emitted + ', thanks to the combiner)' : ''}. In real jobs this step is the most expensive one.`,
          'Reduce: each reducer adds up the values of its words. Reducers also run in parallel because each one has different words. The output is written to the distributed file system (GFS at Google).',
        ];
        $('.bd-note').textContent = notes[step];
        $('.bd-prev').disabled = step === 0; $('.bd-next').disabled = step === 4;
      };
      $('.bd-next').addEventListener('click', () => { step = Math.min(4, step + 1); if (!$('.bd-comb').checked && step === 2) step = 3; upd(); });
      $('.bd-prev').addEventListener('click', () => { step = Math.max(0, step - 1); if (!$('.bd-comb').checked && step === 2) step = 1; upd(); });
      $('.bd-comb').addEventListener('change', upd); upd();
    } },
    { type: 'h3', text: 'Three deep ideas from the paper' },
    { type: 'list', items: [
      `<strong>Machines die, and that is normal.</strong> With thousands of cheap machines, some machine fails every day. The master pings the workers again and again; if one does not answer, its tasks go to another machine. The interesting part: even the <em>finished</em> map tasks of that machine run again, because their output was on the dead machine's local disk. If the map and reduce functions are deterministic, running them again gives the same result: that is how fault tolerance came almost "for free".`,
      `<strong>Stragglers (the slow ones).</strong> One machine with a bad disk can hold up the whole job, because the job ends only when the last task ends. The fix: near the end of the job, run <em>backup copies</em> of the remaining tasks on other machines too; whichever finishes first wins. In the paper's 1 TB sort experiment, turning backup tasks off made the job take 44% longer (1283 s instead of 891 s).`,
      `<strong>Compute near the data.</strong> At that time the network was the scarcest resource. Input sat in GFS as 64 MB blocks with 3 copies, and the master sent each map task to a machine that had a copy. In big jobs most input was read from local disk, not over the network.`,
    ]},
    { type: 'p', html: `The paper says Google's production indexing system was rewritten on MapReduce, and it was used for extracting data from web pages, machine learning, graph computations and more. Doug Cutting and Mike Cafarella (and later Yahoo, at large scale) built an open-source version: <strong>Hadoop</strong> (HDFS + Hadoop MapReduce), which became what "big data" meant in the 2010s. The paper is from 2004; today Google and the rest of the world use newer systems instead of MapReduce, but the map → shuffle → reduce idea lives inside every tool.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"MapReduce is a database." No, it is a <strong>programming model + execution engine</strong>: read files, transform them, write files. Storing data is the file system's job (GFS/HDFS, today S3). And "reduce" does not always mean "make smaller"; a reducer can do anything with all the values of one key (sort them, make a list, join).` },
    { type: 'h2', text: 'Spark: memory, not disk' },
    { type: 'p', html: `MapReduce has one big weakness. Every job writes its output to disk (HDFS), and the next job reads it from there. A machine learning algorithm passes over the same data 20 times (these passes are called <em>iterations</em>). That means writing to and reading from disk 20 times. Disk is much slower than RAM. A data scientist asks one question and waits 10 minutes, asks another and waits 10 more.` },
    { type: 'callout', tone: 'term', title: 'New word: Apache Spark', html: `<strong>What it is:</strong> a batch processing engine (from UC Berkeley, Matei Zaharia and colleagues) that can keep in-between data <strong>in memory (RAM)</strong> instead of on disk after every step.<br><strong>Why we need it:</strong> for work that passes over the same data again and again (ML training, one question after another), reading from disk every time is far too slow.<br><strong>Without it:</strong> 20 iterations in MapReduce = 20 trips to disk.<br><strong>Example:</strong> xyz.com's "yesterday's top 10 videos" job, in the code below.` },
    { type: 'callout', tone: 'term', title: 'New words: RDD and lineage', html: `<strong>RDD (Resilient Distributed Dataset):</strong> Spark's core idea (NSDI 2012 paper). A read-only dataset spread across many machines in pieces (<em>partitions</em>), which can be kept in memory.<br><strong>Lineage:</strong> the "birth record" of each piece: from which input, through which steps (filter, map...) it was made. If a machine dies, Spark rebuilds only that piece using those steps. No need to keep copies of all the data.<br><strong>Without it:</strong> data in memory is lost with the machine; either keep a copy of everything (expensive) or run the whole job again.<br>According to the paper, keeping data in memory gave up to ~10x (an order of magnitude) speedups for iterative and interactive work.` },
    { type: 'callout', tone: 'term', title: 'New word: DAG', html: `<strong>What it is:</strong> a DAG (Directed Acyclic Graph) is a map of steps where the arrows only go forward and never loop back.<br><strong>Why we need it:</strong> in Spark you write <code>read → filter → map → join → groupBy → write</code>. Spark does not run anything right away (this is called <strong>lazy</strong>). It first builds the whole DAG, then optimises and runs it: which steps can run together on one machine (without a shuffle), and where a shuffle is really needed.<br><strong>Without it:</strong> in MapReduce you had to force everything into pairs of map + reduce, with disk between each pair.` },
    { type: 'code', text: `# PySpark: "yesterday's top 10 videos" (xyz.com)
views = spark.read.parquet("s3://xyz-lake/events/date=2026-10-03/")   # from the data lake
top = (views.filter(views.type == "VideoViewed")
            .groupBy("video_id").count()          # shuffle happens here
            .orderBy("count", ascending=False)
            .limit(10))
top.write.mode("overwrite").saveAsTable("analytics.top_videos_daily")` },
    { type: 'callout', tone: 'term', title: 'New word: Parquet', html: `<strong>What it is:</strong> a data file format that stores data <em>column by column</em> (all values of one column together) and compresses it. The events in the code above are in this format.<br><strong>Why we need it:</strong> an analytics query often asks for 2-3 of 30 columns. With Parquet only those columns are read, and the file can be 5-10 times smaller.<br><strong>Without it:</strong> with JSON/CSV files, every query reads every full line, every time.<br>(We will see the full benefit of column storage in the OLTP vs OLAP section.)` },
    { type: 'p', html: `Now feel the numbers. An ML job passes over 100 GB of data many times. MapReduce writes to disk after every iteration and reads from disk again the next time. Spark reads once and keeps the data in memory.` },
    { type: 'custom', render(el) {
      const READ = 100, WRITE = 100, CPU = 20, MEM = 5, M = 10;
      el.innerHTML = `<label>Iterations (how many passes over the same data): <strong class="sp-kv"></strong></label><input class="sp-k" type="range" min="1" max="30" step="1" value="10">
        <label style="display:flex;gap:6px;align-items:center;margin-top:8px;font-size:14px;color:var(--ink-2)"><input class="sp-crash" type="checkbox"> 1 of the 10 machines dies in the middle</label>
        <div class="sp-bars" style="margin-top:10px;display:flex;flex-direction:column;gap:8px"></div>
        <div class="stats">
          <div class="stat"><span>MapReduce (disk every time)</span><strong class="sp-mr"></strong></div>
          <div class="stat"><span>Spark (memory)</span><strong class="sp-sp"></strong></div>
          <div class="stat"><span>How much faster is Spark</span><strong class="sp-x"></strong></div>
        </div>
        <div class="calc-note sp-note"></div>
        <div class="calc-note">Assumed (only to explain): reading 100 GB from disk takes 100 s, writing to disk 100 s, the compute of one iteration 20 s, reading from memory 5 s. 10 machines.</div>`;
      const $ = c => el.querySelector(c);
      const fm = s => s >= 120 ? (s / 60).toFixed(1) + ' min' : Math.round(s) + ' s';
      const upd = () => {
        const k = +$('.sp-k').value, crash = $('.sp-crash').checked;
        let mr = k * (READ + CPU + WRITE), sp = READ + k * (MEM + CPU) + WRITE;
        const mrC = (READ + CPU + WRITE) / M, spC = READ / M + CPU / M;
        if (crash) { mr += mrC; sp += spC; }
        $('.sp-kv').textContent = k;
        const mx = Math.max(mr, sp);
        const bar = (n, v, col) => `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span style="flex:0 0 96px;font-size:13px;color:var(--ink-2)">${n}</span><span style="flex:1 1 160px;height:16px;background:var(--surface-2);border-radius:4px;position:relative"><span style="position:absolute;left:0;top:0;bottom:0;width:${(v / mx * 100).toFixed(1)}%;background:${col};border-radius:4px"></span></span><span style="flex:0 0 70px;text-align:right;font:13px var(--f-mono);color:var(--ink)">${fm(v)}</span></div>`;
        $('.sp-bars').innerHTML = bar('MapReduce', mr, 'var(--amber)') + bar('Spark', sp, 'var(--accent)');
        $('.sp-mr').textContent = fm(mr); $('.sp-sp').textContent = fm(sp);
        $('.sp-x').textContent = (mr / sp).toFixed(1) + 'x';
        $('.sp-note').textContent = (k === 1
          ? 'Only 1 iteration: both must read the data once and write it once, so the difference is almost zero. Spark helps when the data is used again and again.'
          : `${k} iterations: MapReduce read ${k} times and wrote ${k} times. Spark read once, used the data ${k} times from memory, and wrote once at the end. More iterations make the gap bigger: ~5x at 10, ~7x at 30 (with these numbers never above ~9x, because the compute is the same in both).`)
          + (crash ? ` A machine died: MapReduce re-ran its tasks (+${fm(mrC)}); Spark used lineage to rebuild only the pieces of the dead machine (+${fm(spC)}). Both survived. Neither had to re-run the whole job.` : '');
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    } },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Spark is in memory, so it is always 100 times faster than MapReduce." No. In a simple job that reads once and writes once, both must go through the disk (1 iteration in the widget). And if the data is bigger than RAM, Spark also has to "spill" to disk. The gain comes from using the same data again and again.` },
    { type: 'p', html: `Today Spark is the default tool for batch: SQL (Spark SQL), ML (MLlib), and also <strong>Structured Streaming</strong>, which processes a stream in many small batches (micro-batches). This gives you batch and near-real-time in one code style, but because of micro-batches the latency is usually from ~100 ms to a few seconds.` },
    { type: 'h2', text: 'Stream processing: Flink and Kafka Streams' },
    { type: 'p', html: `For the live match viewer count, waiting until "tonight" will not work. The events are already flowing into Kafka (Kafka lesson); now we need an engine that reads them all the time, <em>remembers</em> the count (state), and outputs a result every few seconds.` },
    { type: 'callout', tone: 'term', title: 'New word: State (in a stream)', html: `<strong>What it is:</strong> the stream job's own "memory": the counts, totals or recent events so far. For example "video 7: 2,31,045 views so far".<br><strong>Why we need it:</strong> each new event alone tells you nothing. To count, you must remember the previous count.<br><strong>Without it:</strong> for every event you read the old count from a database and write it back: with tens of millions of events, the database sinks.` },
    { type: 'callout', tone: 'term', title: 'New word: Apache Flink', html: `<strong>What it is:</strong> a distributed stream processing engine that processes events one by one (not in micro-batches). It runs its own cluster: one <em>JobManager</em> (the manager) and many <em>TaskManagers</em> (the machines that do the work).<br><strong>Why we need it:</strong> three things make it special: (1) <strong>state</strong> for every key (like video_id), spread across machines, fault-tolerant; (2) <strong>checkpoints</strong> (below); (3) deep support for <strong>event time</strong> and <strong>windows</strong> (coming up).<br><strong>Without it:</strong> for big, stateful, live jobs (counting ad clicks, fraud) you would have to build your own crash-safe system.` },
    { type: 'callout', tone: 'term', title: 'New word: Checkpoint', html: `<strong>What it is:</strong> every few seconds Flink saves a consistent "photo" of all its state in durable storage (S3), and <em>with that same photo</em> it saves the Kafka position (offset). Like a save point in a video game.<br><strong>Why we need it:</strong> if a machine dies, bring the state back from the last save point and read Kafka again from that same position. Nothing is counted twice and nothing is missed: this is called <strong>exactly-once</strong> for state.<br><strong>Without it:</strong> the count in memory dies with the machine.` },
    { type: 'p', html: `Try it yourself. Video 7 gets 1,000 view events every second. Flink is counting. Choose how often to take a checkpoint and when the crash happens. Then turn checkpoints off and see what breaks.` },
    { type: 'custom', render(el) {
      const R = 1000, RESTART = 10, CATCH = 10, AUTO = 5;
      el.innerHTML = `<div class="chips fk-m" role="group" aria-label="Mode"><button type="button" class="chip on" data-m="ck">Flink checkpoint ON</button><button type="button" class="chip" data-m="no">No checkpoint (only offset commit)</button></div>
        <div class="row2" style="margin-top:10px">
          <div class="fk-cw"><label>Checkpoint every: <strong class="fk-cv"></strong></label><input class="fk-c" type="range" min="5" max="60" step="5" value="30"></div>
          <div><label>Crash time: <strong class="fk-tv"></strong></label><input class="fk-t" type="range" min="1" max="120" step="1" value="77"></div>
        </div>
        <svg class="fk-svg" viewBox="0 0 640 90" style="width:100%;height:auto;margin-top:10px;display:block" role="img" aria-label="Checkpoint timeline"></svg>
        <div class="stats">
          <div class="stat"><span>Real views (until crash)</span><strong class="fk-true"></strong></div>
          <div class="stat"><span>Restarted from</span><strong class="fk-from"></strong></div>
          <div class="stat"><span>Events read again</span><strong class="fk-rep"></strong></div>
          <div class="stat"><span>Count after recovery</span><strong class="fk-cnt"></strong></div>
        </div>
        <div class="calc-note fk-note"></div>`;
      const $ = c => el.querySelector(c);
      let mode = 'ck';
      const n = v => v.toLocaleString('en-IN');
      const upd = () => {
        const C = +$('.fk-c').value, T = +$('.fk-t').value, tru = R * T;
        $('.fk-cv').textContent = C + ' s'; $('.fk-tv').textContent = T + ' s'; $('.fk-cw').style.display = mode === 'ck' ? '' : 'none';
        const X = t => 20 + t * 5;
        let svg = `<line x1="20" y1="50" x2="620" y2="50" stroke="var(--line-2)" stroke-width="2"/>`;
        for (let t = 0; t <= 120; t += 20) svg += `<text x="${X(t)}" y="80" text-anchor="middle" font-size="11" fill="var(--ink-3)" font-family="var(--f-mono)">${t}s</text>`;
        let from, rep, cnt;
        if (mode === 'ck') {
          for (let t = C; t <= 120; t += C) svg += `<rect x="${X(t) - 4}" y="40" width="8" height="20" rx="2" fill="${t <= T ? 'var(--green)' : 'var(--line-2)'}"/>`;
          from = Math.floor(T / C) * C; rep = (T - from) * R; cnt = tru;
        } else {
          for (let t = AUTO; t <= 120; t += AUTO) svg += `<circle cx="${X(t)}" cy="50" r="2.5" fill="${t <= T ? 'var(--ink-3)' : 'var(--line-2)'}"/>`;
          from = Math.floor(T / AUTO) * AUTO; rep = (T - from) * R; cnt = rep;
        }
        svg += `<rect x="${X(from)}" y="34" width="${Math.max(2, X(T) - X(from))}" height="32" fill="var(--amber)" opacity=".3"/>`;
        svg += `<text x="${X(T)}" y="26" text-anchor="middle" font-size="16" fill="var(--red)">✖</text>`;
        $('.fk-svg').innerHTML = svg;
        $('.fk-true').textContent = n(tru);
        $('.fk-from').textContent = from + ' s';
        $('.fk-rep').textContent = n(rep);
        $('.fk-cnt').textContent = n(cnt) + (cnt === tru ? ' ✓' : ' ✗');
        $('.fk-cnt').style.color = cnt === tru ? 'var(--green)' : 'var(--red)';
        $('.fk-note').textContent = mode === 'ck'
          ? `The last checkpoint was at ${from} s. The count at that moment (${n(from * R)}) and the Kafka offset were saved together. Flink brought both back and read the ${n(rep)} events of the last ${T - from} s again from Kafka. The count is exactly right. Recovery ~${RESTART + Math.ceil((T - from) / CATCH)} s (restart ~${RESTART} s + replay at 10x speed). Frequent checkpoints mean less replay, but each checkpoint has a small cost (writing to S3).`
          : `The Kafka consumer committed its offset every ${AUTO} s (up to ${from} s), but the count lived only in memory. After the crash, reading restarted at ${from} s and the count restarted at 0: ${n(tru - cnt)} views lost. This is why state and offset must be saved together, in one snapshot.`;
      };
      el.querySelectorAll('.fk-m .chip').forEach(b => b.addEventListener('click', () => { mode = b.dataset.m; el.querySelectorAll('.fk-m .chip').forEach(x => x.classList.toggle('on', x === b)); upd(); }));
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    } },
    { type: 'callout', tone: 'term', title: 'New word: Kafka Streams', html: `<strong>What it is:</strong> not a separate cluster but a <strong>Java library</strong> that runs inside your own service. Input comes from Kafka, output goes to Kafka. State lives on the machine's local disk in a small database (<em>RocksDB</em>), with a backup in a Kafka topic (the <em>changelog</em>).<br><strong>Why we need it:</strong> if the data is already in Kafka and the logic is the size of one service, running a whole new cluster like Flink is too much. Just run more copies of your service; Kafka splits the partitions among them. It also supports windowing and exactly-once.<br><strong>Without it:</strong> even a small stream task needs a separate cluster, team and deploy.<br><strong>Example:</strong> count "each user's likes in the last 5 minutes" to check for spam.` },
    { type: 'p', html: `Play with Kafka Streams scaling below. The topic <code>likes</code> has <strong>6 partitions</strong> (remember the Kafka lesson: a partition is one part of a topic, and at any moment one partition goes to only one member of a group). The count (state) of each partition lives with the instance that owns the partition. Add or remove instances:` },
    { type: 'custom', render(el) {
      const P = 6, IN = 24000, CAP = 5000, ST = [41, 38, 44, 36, 40, 39];
      el.innerHTML = `<label>App instances (copies): <strong class="ks-nv"></strong></label><input class="ks-n" type="range" min="1" max="8" step="1" value="2">
        <div class="ks-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin-top:10px"></div>
        <div class="stats">
          <div class="stat"><span>Busy instances</span><strong class="ks-busy"></strong></div>
          <div class="stat"><span>Capacity vs input</span><strong class="ks-cap"></strong></div>
          <div class="stat"><span>State restored on last change</span><strong class="ks-mv"></strong></div>
        </div>
        <div class="calc-note ks-note"></div>
        <div class="calc-note">Assumed: input is 24,000 events/s, one instance can handle 5,000/s, each partition has ~40 MB of state. This widget hands out partitions round-robin; real Kafka uses sticky/cooperative assignment, which moves fewer partitions.</div>`;
      const $ = c => el.querySelector(c);
      let prev = 2;
      const own = N => Array.from({ length: P }, (_, i) => i % N);
      const upd = () => {
        const N = +$('.ks-n').value; $('.ks-nv').textContent = N;
        const a = own(N), b = own(prev);
        const moved = a.map((x, i) => x !== b[i] ? i : -1).filter(i => i >= 0);
        let html = '';
        for (let k = 0; k < N; k++) {
          const ps = a.map((x, i) => x === k ? i : -1).filter(i => i >= 0);
          html += `<div style="border:1px solid ${ps.length ? 'var(--accent)' : 'var(--line)'};border-radius:var(--r-sm);padding:8px;background:${ps.length ? 'var(--accent-soft)' : 'transparent'};opacity:${ps.length ? 1 : .55}"><div style="font:600 13px var(--f-display);color:var(--ink)">Instance ${k + 1}</div><div style="font:12.5px/1.6 var(--f-mono);color:var(--ink-2)">${ps.length ? ps.map(p => `P${p}${moved.includes(p) ? ' ↻' : ''}`).join(', ') + '<br>state: ' + ps.reduce((s, p) => s + ST[p], 0) + ' MB' : 'idle: no partition'}</div></div>`;
        }
        $('.ks-grid').innerHTML = html;
        const busy = Math.min(N, P), cap = busy * CAP;
        $('.ks-busy').textContent = busy + ' / ' + N;
        $('.ks-cap').textContent = (cap / 1000) + 'k / ' + (IN / 1000) + 'k per s';
        $('.ks-cap').style.color = cap >= IN ? 'var(--green)' : 'var(--red)';
        $('.ks-mv').textContent = moved.length ? moved.length + ' partitions (' + moved.reduce((s, p) => s + ST[p], 0) + ' MB)' : '0';
        $('.ks-note').textContent = (cap < IN
          ? `${busy} instances can handle only ${cap / 1000}k events/s, but the input is ${IN / 1000}k/s: the lag (how far behind we are) keeps growing. Run more instances.`
          : N > P ? `${N} instances, but only ${P} partitions: ${N - P} instances sit idle. Maximum parallelism = the number of partitions. If you need more, add partitions to the topic (plan this early).`
          : `${N} instances share ${P} partitions, and capacity is enough.`)
          + (moved.length ? ` Partitions marked ↻ moved to a new instance. Their state had to be loaded again from the changelog topic onto the local disk (restore), and those partitions paused until then.` : '');
        prev = N;
      };
      $('.ks-n').addEventListener('input', upd); upd();
    } },
    { type: 'compare',
      left: { title: 'Flink', html: `• Separate cluster (JobManager + TaskManagers)<br>• Many sources/sinks: Kafka, files, databases<br>• Very large state, event time, complex windows<br>• Needs a separate team/ops<br>• Example: windowed aggregation of ad clicks, fraud rules` },
      right: { title: 'Kafka Streams', html: `• Library: inside your service<br>• Input and output both Kafka<br>• State in local RocksDB + changelog topic<br>• Scale = copies of the service (max = partitions)<br>• Example: each user's likes in the last 5 min, small enrichment` },
    },
    { type: 'p', html: `Now join the pieces: apps send events to Kafka. Flink counts them live. At the same time the events also pile up in cheap storage (a data lake), where Spark does the full count at night. Both results go into an analytics database (ClickHouse). Click each box to read about it, then run the scenarios: stream, batch, crash, and a late event.` },
    { type: 'flow', title: 'xyz.com data platform: stream and batch together', height: 330,
      nodes: [
        { id: 'app', label: 'xyz.com apps', sub: 'events', x: 75, y: 170, w: 120, kind: 'server', info: 'What it is: the servers of the xyz.com website and mobile apps. Every view, click and search becomes an event and goes to Kafka. So the production database gets no analytics load.' },
        { id: 'k', label: 'Kafka', sub: 'view-events', x: 235, y: 170, w: 120, kind: 'queue', info: 'What it is: a long, durable diary of events (Kafka lesson). Stream jobs read it live; a connector also turns the same events into files and carries them to the data lake. Within the retention time (how many days data is kept) you can read it again (replay).' },
        { id: 'fl', label: 'Flink job', sub: '10 s windows', x: 420, y: 75, w: 140, kind: 'server', meter: true, load: 40, info: 'What it is: the stream processing engine (seen above). It counts the views of each video in 10-second pieces (windows). The count (state) is in memory, checkpoints are in S3. Results in seconds.' },
        { id: 'dash', label: 'Dashboards', x: 625, y: 50, w: 150, kind: 'client', info: 'What it is: the screens the product team and creators look at: live viewer count, creator analytics, daily reports. All of them read from ClickHouse.' },
        { id: 'ch', label: 'ClickHouse', sub: 'OLAP store', x: 625, y: 170, w: 150, kind: 'data', info: 'What it is: a database built for analytics (OLAP, details at the end of the lesson). It stores data column by column, so queries like "total views per video" over billions of rows take seconds. Both live (Flink) and daily (Spark) results land here. BigQuery/Snowflake/Druid could also sit here.' },
        { id: 'lake', label: 'S3 data lake', sub: 'Parquet files', x: 420, y: 265, w: 140, kind: 'data', info: 'What it is: a data lake = cheap object storage (S3) where all raw events sit in Parquet files, in folders by date. Keeping years of data is cheap. Batch jobs and ML training read from here.' },
        { id: 'sp', label: 'Spark job', sub: 'every night 2 am', x: 625, y: 290, w: 140, kind: 'server', info: 'What it is: the batch processing engine (seen above). Every night it runs over all of yesterday\'s data: exact counts, creator earnings, ML features. Events that arrived late are included too.' },
      ],
      edges: [{ a: 'app', b: 'k' }, { a: 'k', b: 'fl' }, { a: 'fl', b: 'ch' }, { a: 'ch', b: 'dash' }, { a: 'k', b: 'lake' }, { a: 'lake', b: 'sp' }, { a: 'sp', b: 'ch' }],
      scenarios: [
        { name: 'Stream: live count', steps: [
          { title: 'Events arrive', text: 'Lakhs of people are watching the final. Every player sends a "still watching" event every few seconds.', flood: { paths: ['app>k'], n: 10, kind: 'evt' }, msg: '{ "type": "Heartbeat", "video_id": 7, "user": 912, "event_time": "20:15:03" }' },
          { title: 'Flink counts', text: 'Flink splits events by video_id (keyBy) and counts unique viewers in each 10-second window. The count is in state, not in a database.', go: 'evt:k>fl', after: { fl: { state: 'hot', sub: 'window 20:15:00-10' } } },
          { title: 'Window closes, result goes out', text: 'When the window ends, the result goes to ClickHouse. The count on the dashboard is ~10-15 seconds old, but it feels live.', go: ['fl>ch', 'res:ch>dash'], after: { fl: { state: 'ok', sub: '10 s windows' }, dash: { sub: 'LIVE: 2.3 crore' } }, msg: 'video 7, window [20:15:00, 20:15:10) → viewers 2,31,04,512' },
        ]},
        { name: 'Batch: daily report', steps: [
          { title: 'Events go to the lake', text: 'A connector (like the Kafka Connect S3 sink) turns events into Parquet files every few minutes and writes them to S3.', go: 'evt:k>lake', after: { lake: { sub: 'date=2026-10-03/' } } },
          { title: 'Spark at 2 am', text: 'All of yesterday\'s data: bounded. Spark computes exact unique viewers, watch time and creator earnings. Late events are included.', go: 'lake>sp', set: { sp: { state: 'hot', sub: 'processing day' } } },
          { title: 'Result into OLAP', text: 'Daily tables go into ClickHouse/the warehouse. In the morning the product team\'s dashboard shows the final report for yesterday.', go: ['sp>ch', 'res:ch>dash'], after: { sp: { state: 'ok', sub: 'done 03:40' } } },
        ]},
        { name: 'Flink crash', steps: [
          { title: 'A TaskManager died', text: 'One Flink machine crashed. The counts it held for some videos were in its memory.', set: { fl: { state: 'down', sub: 'CRASH' } }, focus: ['fl'] },
          { title: 'Back from the checkpoint', text: 'Flink brings back all state from the last checkpoint (say, 30 seconds ago), and the Kafka offsets from the same point: <em>state and position together</em>.', set: { fl: { state: 'warn', sub: 'restore ckpt #812' } }, focus: ['fl'] },
          { title: 'Replay and catch up', text: 'The events of the last 30 seconds are read again from Kafka. Nothing in the count was missed or counted twice (exactly-once for state). But if results were already written straight into the sink (ClickHouse), the sink must be idempotent or transactional so it does not get duplicates.', go: 'evt:k>fl', after: { fl: { state: 'ok', sub: 'caught up' } } },
        ]},
        { name: 'Late event', steps: [
          { title: 'The phone was offline', text: 'A user was in the metro. Their phone sent the 20:15:03 events at 20:16:40.', go: 'app>k', msg: 'event_time 20:15:03, arrival 20:16:40  (97 s late)' },
          { title: 'Window already closed', text: 'Flink already sent the result for the [20:15:00, 20:15:10) window. This event is now "late". By default it is dropped; or, if it is within the "allowed lateness", the result is updated; or it goes to a side output to be kept separately.', go: 'evt:k>fl', set: { fl: { state: 'warn', sub: 'late: side output' } } },
          { title: 'The batch fixes everything', text: 'The nightly Spark job sees the whole day of data, late events too. So final counts like billing come from batch and live counts from the stream: this is the roadmap\'s "batch reconciliation".', go: ['evt:k>lake', 'lake>sp', 'sp>ch'] },
        ]},
      ],
    },
    { type: 'h2', text: 'Windowing: counting a never-ending stream in pieces' },
    { type: 'p', html: `In batch, asking for "yesterday's views" is easy: yesterday is over. A stream never ends, so when do you report the "total views"? The answer: cut the stream into time <strong>windows</strong> and compute a result for each window.` },
    { type: 'callout', tone: 'term', title: 'New word: Window', html: `<strong>What it is:</strong> a slice of time whose events are counted together, like "from 20:15:00 to 20:15:10".<br><strong>Why we need it:</strong> a stream never ends, so a "total" is never final. A window makes a small part that does end, so its result can be sent out.<br><strong>Without it:</strong> either the count never comes out, or a new number comes out with every event (too much noise).<br>Rule: a window includes its start but not its end. [10, 20) contains 10 but not 20.` },
    { type: 'p', html: `There are three well-known kinds of windows (names from the Flink docs). Understand each one with the 13 events below. The events arrived at these seconds: <code>2, 5, 7, 12, 14, 18, 21, 23, 24, 38, 41, 44, 57</code>.` },
    { type: 'callout', tone: 'term', title: 'Tumbling window', html: `<strong>What it is:</strong> windows of a fixed size, one after another, with no overlap: [0,10), [10,20), [20,30)... Each event is in <em>exactly one</em> window.<br><strong>Worked example (size 10 s):</strong> [0,10) = 3 (2, 5, 7), [10,20) = 3, [20,30) = 3, [30,40) = 1, [40,50) = 2, [50,60) = 1. The sum is 13, because no event is counted twice.<br><strong>When:</strong> "views per minute", billing counts. <strong>When not:</strong> when you want a smooth "last 1 minute" every few seconds.` },
    { type: 'callout', tone: 'term', title: 'Sliding window', html: `<strong>What it is:</strong> a fixed size, but a new window starts at every <em>slide</em>, so windows overlap.<br><strong>Worked example (size 10 s, slide 5 s):</strong> windows [0,10), [5,15), [10,20)... Event 12 is in two windows: [5,15) and [10,20). [5,15) has 4 events (5, 7, 12, 14). Each event is counted in ~size/slide = 2 windows.<br><strong>When:</strong> "average of the last 1 minute, updated every 10 seconds" (size 60, slide 10). <strong>Cost:</strong> more windows, more work and more state.` },
    { type: 'callout', tone: 'term', title: 'Session window', html: `<strong>What it is:</strong> no fixed size. While events keep coming, the window stays open. When there is silence as long as the <em>gap</em>, the window closes.<br><strong>Worked example (gap 5 s):</strong> from 2 to 24 every event came within 5 s of the previous one, so one session [2, 29) holds 9 events (end = last event 24 + gap 5). Then silence until 38: a new session [38, 49) with 3 events. Then 57: a third session. Make the gap 3 s and the first long session breaks into 3 pieces.<br><strong>When:</strong> "how long was a user's viewing session". <strong>Note:</strong> each user (key) has their own sessions.` },
    { type: 'p', html: `Now try it yourself. Change the window type, move size/slide/gap, and see which event went into which window and the count of each window. You can check the worked examples above here.` },
    { type: 'custom', render(el) {
      const EV = [2, 5, 7, 12, 14, 18, 21, 23, 24, 38, 41, 44, 57];
      const T = 60;
      el.innerHTML = `<div class="chips bd-wt" role="group" aria-label="Window type">
          <button type="button" class="chip on" data-t="tumbling">Tumbling</button>
          <button type="button" class="chip" data-t="sliding">Sliding</button>
          <button type="button" class="chip" data-t="session">Session</button>
        </div>
        <div class="row2" style="margin-top:10px">
          <div class="bd-w-size"><label>Window size: <strong class="bd-vs"></strong></label><input class="bd-s" type="range" min="5" max="30" step="5" value="10"></div>
          <div class="bd-w-slide"><label>Slide: <strong class="bd-vsl"></strong></label><input class="bd-sl" type="range" min="5" max="30" step="5" value="5"></div>
          <div class="bd-w-gap"><label>Session gap: <strong class="bd-vg"></strong></label><input class="bd-g" type="range" min="2" max="15" step="1" value="5"></div>
        </div>
        <svg class="bd-svg" viewBox="0 0 640 240" style="width:100%;height:auto;margin-top:10px;display:block" role="img" aria-label="Timeline of events and windows"></svg>
        <div class="stats">
          <div class="stat"><span>Windows (with events)</span><strong class="bd-nw"></strong></div>
          <div class="stat"><span>Windows per event</span><strong class="bd-per"></strong></div>
          <div class="stat"><span>Biggest count</span><strong class="bd-max"></strong></div>
        </div>
        <div class="calc-note bd-wnote"></div>`;
      const $ = c => el.querySelector(c);
      let type = 'tumbling';
      const windows = (type, size, slide, gap) => {
        let w = [];
        if (type === 'tumbling') for (let s = 0; s < T; s += size) w.push([s, s + size]);
        if (type === 'sliding') for (let s = -size + slide; s < T; s += slide) w.push([s, s + size]);
        if (type === 'session') {
          // Flink-style: each event opens [t, t+gap); overlapping/touching windows merge.
          EV.forEach(t => { const last = w[w.length - 1]; if (last && t <= last[1]) last[1] = t + gap; else w.push([t, t + gap]); });
        }
        return w.map(([s, e]) => ({ s, e, n: EV.filter(t => t >= s && t < e).length })).filter(x => x.n > 0);
      };
      const X = t => 20 + (Math.max(-5, Math.min(T + 5, t)) + 5) * (600 / (T + 10));
      const upd = () => {
        const size = +$('.bd-s').value; const sl = $('.bd-sl'); if (+sl.value > size) sl.value = size;
        const slide = +sl.value, gap = +$('.bd-g').value;
        $('.bd-vs').textContent = size + ' s'; $('.bd-vsl').textContent = slide + ' s'; $('.bd-vg').textContent = gap + ' s';
        $('.bd-w-size').style.display = type === 'session' ? 'none' : '';
        $('.bd-w-slide').style.display = type === 'sliding' ? '' : 'none';
        $('.bd-w-gap').style.display = type === 'session' ? '' : 'none';
        const W = windows(type, size, slide, gap);
        const lanes = type === 'sliding' ? Math.ceil(size / slide) : 1;
        const laneH = Math.min(34, 150 / lanes);
        let svg = `<line x1="20" y1="200" x2="620" y2="200" stroke="var(--line-2)" stroke-width="1.5"/>`;
        for (let t = 0; t <= T; t += 10) svg += `<line x1="${X(t)}" y1="196" x2="${X(t)}" y2="204" stroke="var(--ink-3)"/><text x="${X(t)}" y="222" text-anchor="middle" font-size="12" fill="var(--ink-3)" font-family="var(--f-mono)">${t}s</text>`;
        W.forEach((w, i) => {
          const lane = type === 'sliding' ? (((w.s / slide) % lanes) + lanes) % lanes : i % 2;
          const y = 20 + lane * laneH + (type === 'sliding' ? 0 : 40);
          const x1 = X(w.s), x2 = X(w.e);
          svg += `<rect x="${x1 + 1}" y="${y}" width="${Math.max(4, x2 - x1 - 2)}" height="${laneH - 6}" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.2"/>`;
          svg += `<text x="${(x1 + x2) / 2}" y="${y + (laneH - 6) / 2 + 4}" text-anchor="middle" font-size="12" font-weight="600" fill="var(--accent-ink)" font-family="var(--f-mono)">${w.n}</text>`;
        });
        EV.forEach(t => { svg += `<circle cx="${X(t)}" cy="200" r="5.5" fill="var(--ink)" stroke="var(--surface)" stroke-width="1.5"/>`; });
        $('.bd-svg').innerHTML = svg;
        const total = W.reduce((a, w) => a + w.n, 0);
        $('.bd-nw').textContent = W.length;
        $('.bd-per').textContent = (total / EV.length).toFixed(2).replace(/\.00$/, '');
        $('.bd-max').textContent = Math.max(...W.map(w => w.n));
        const list = W.map(w => `[${w.s},${w.e}): ${w.n}`).join('  ');
        const why = type === 'tumbling' ? 'Each event is in exactly one window, so the window counts add up to 13.'
          : type === 'sliding' ? `Each window is ${size} s long, and a new one starts every ${slide} s. One event is counted in ~${size / slide} windows, so the counts add up to more than 13. Some windows start before 0 (windows are aligned to the epoch). Only windows with at least one event are shown, just like Flink creates a window only when an event arrives.`
          : `Sessions have no fixed size. If an event comes ${gap} s or less after the previous one, it joins that session; otherwise a new session starts. Session end = last event + gap. Make the gap smaller and one long session breaks into several short ones.`;
        $('.bd-wnote').textContent = list + '. ' + why;
      };
      el.querySelectorAll('.bd-wt .chip').forEach(b => b.addEventListener('click', () => {
        type = b.dataset.t; el.querySelectorAll('.bd-wt .chip').forEach(x => x.classList.toggle('on', x === b)); upd();
      }));
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    } },
    { type: 'h3', text: 'Event time vs processing time, and late events' },
    { type: 'p', html: `Above we assumed that an event arrived in the same second it happened. In the real world this is not true: the phone was offline in the metro, the network was slow, or the Kafka consumer was running behind. Now the question: in which window do we count an event: when it <em>happened</em>, or when it <em>arrived</em>?` },
    { type: 'callout', tone: 'term', title: 'New words: event time and processing time', html: `<strong>Event time:</strong> when the event really happened (the timestamp written inside the event). Like the date printed on a photo.<br><strong>Processing time:</strong> when the event was processed, by the engine's clock. Like when the photo reached you.<br><strong>Why it matters:</strong> processing time is simple and fast, but late events go into the wrong window, and if you replay yesterday's data the result comes out different. Event time is correct, but it brings a new problem: how does the engine know that all events of a window have now arrived?` },
    { type: 'callout', tone: 'term', title: 'New word: Watermark', html: `<strong>What it is:</strong> in event time mode, the engine's announcement: "I now believe all events from before time T have arrived". When the watermark passes T, close the window [.., T) and send its result.<br><strong>How it is made:</strong> the common way (<em>bounded out-of-orderness</em>): watermark = the largest event time seen so far − an allowed delay.<br><strong>Why we need it:</strong> without it an event time window would never close (maybe another old event will come?).<br><strong>Late event:</strong> an old event that arrives after the watermark is <em>late</em>. Flink by default (allowed lateness 0) drops it. If you give allowed lateness, the result can be updated, or you can send it to a side output (a separate box).<br><strong>Example:</strong> delay 5 s. The largest event time seen is 25 s, so the watermark is 20 s: window [10,20) now closes.` },
    { type: 'p', html: `Below are the same 13 events, but now each one also has an <strong>arrival time</strong>. The user of event <code>18s</code> was offline: it arrived at <code>33s</code>. Event <code>7s</code> also arrived at <code>11s</code> because of the network. Tumbling 10 s windows. Change the mode and move the allowed delay:` },
    { type: 'custom', render(el) {
      // [event_time, arrival_time]
      const EV = [[2, 3], [5, 6], [7, 11], [12, 13], [14, 15], [18, 33], [21, 22], [23, 24], [24, 25], [38, 39], [41, 42], [44, 45], [57, 58]];
      const SIZE = 10, T = 60, DS = [0, 2, 5, 10, 20];
      el.innerHTML = `<div class="chips bd-tm" role="group" aria-label="Time mode">
          <button type="button" class="chip" data-m="proc">Processing time</button>
          <button type="button" class="chip on" data-m="event">Event time + watermark</button>
        </div>
        <div class="bd-dwrap" style="margin-top:10px"><label>Allowed delay (watermark = max event time − delay): <strong class="bd-vd"></strong></label><input class="bd-d" type="range" min="0" max="4" step="1" value="0"></div>
        <div style="overflow-x:auto;margin-top:10px"><table style="width:100%;border-collapse:collapse;font:13px var(--f-mono);color:var(--ink)">
          <thead><tr style="color:var(--ink-2);text-align:left"><th style="padding:6px;border-bottom:1px solid var(--line)">Window</th><th style="padding:6px;border-bottom:1px solid var(--line)">Correct count</th><th style="padding:6px;border-bottom:1px solid var(--line)">Result</th><th style="padding:6px;border-bottom:1px solid var(--line)">Result when (arrival s)</th></tr></thead>
          <tbody class="bd-tb"></tbody></table></div>
        <div class="stats">
          <div class="stat"><span>Wrong windows</span><strong class="bd-wrong"></strong></div>
          <div class="stat"><span>Late events dropped</span><strong class="bd-drop"></strong></div>
          <div class="stat"><span>Delay of the [10,20) result</span><strong class="bd-lat"></strong></div>
        </div>
        <div class="calc-note bd-tnote"></div>`;
      const $ = c => el.querySelector(c);
      let mode = 'event';
      const run = (mode, D) => {
        const wins = []; for (let s = 0; s < T; s += SIZE) wins.push({ s, e: s + SIZE, truth: 0, n: 0, fired: null });
        EV.forEach(([et]) => wins[Math.floor(et / SIZE)].truth++);
        const order = EV.slice().sort((a, b) => a[1] - b[1]);
        const dropped = [];
        if (mode === 'proc') {
          order.forEach(([et, at]) => wins[Math.floor(at / SIZE)].n++);
          wins.forEach(w => { w.fired = w.e; });
        } else {
          let maxEt = -Infinity;
          order.forEach(([et, at]) => {
            const w = wins[Math.floor(et / SIZE)];
            if (w.fired !== null) dropped.push(et); else w.n++;
            maxEt = Math.max(maxEt, et);
            const wm = maxEt - D;
            wins.forEach(x => { if (x.fired === null && wm >= x.e) x.fired = at; });
          });
        }
        return { wins, dropped };
      };
      const upd = () => {
        const D = DS[+$('.bd-d').value];
        $('.bd-vd').textContent = D + ' s';
        $('.bd-dwrap').style.display = mode === 'event' ? '' : 'none';
        const { wins, dropped } = run(mode, D);
        $('.bd-tb').innerHTML = wins.map(w => {
          const ok = w.fired === null || w.n === w.truth;
          return `<tr><td style="padding:6px;border-bottom:1px solid var(--line)">[${w.s},${w.e})</td><td style="padding:6px;border-bottom:1px solid var(--line)">${w.truth}</td><td style="padding:6px;border-bottom:1px solid var(--line);color:${ok ? 'var(--green)' : 'var(--red)'};font-weight:600">${w.fired === null ? '…' : w.n}${ok ? '' : ' ✗'}</td><td style="padding:6px;border-bottom:1px solid var(--line);color:var(--ink-2)">${w.fired === null ? 'still open (watermark has not reached ' + w.e + ')' : w.fired + 's'}</td></tr>`;
        }).join('');
        const wrong = wins.filter(w => w.fired !== null && w.n !== w.truth).length;
        const w1 = wins[1];
        $('.bd-wrong').textContent = wrong;
        $('.bd-drop').textContent = dropped.length ? dropped.map(t => t + 's').join(', ') : '0';
        $('.bd-lat').textContent = w1.fired === null ? 'not yet' : (w1.fired - w1.e) + ' s';
        let note;
        if (mode === 'proc') note = 'In processing time each event is counted by its arrival. The 7s event arrived at 11s, so it went into [10,20) (one less in [0,10)). The 18s event arrived at 33s, so it went into [30,40) (one extra there). The [10,20) count of 3 looks right, but with the wrong events: pure luck. Results come at once, but they are wrong. And if you replay yesterday\'s data, the arrival times differ, so the result differs too.';
        else if (dropped.length) note = `Delay ${D} s: the watermark moved ahead quickly, [10,20) closed early (at ${w1.fired}s), and the 18s event came late and was dropped. Fast but incomplete. Increase the delay.`;
        else note = `Delay ${D} s: the watermark moved slowly, the 18s event arrived before its window closed, and all counts are right. The price: results come later. Notice that after 25s no newer event came until 39s (the one at 33s was the old 18s event), so the watermark also stayed still: a watermark only moves forward with new events. [50,60) is still open because no event after 60s ever arrived.`;
        $('.bd-tnote').textContent = note;
      };
      el.querySelectorAll('.bd-tm .chip').forEach(b => b.addEventListener('click', () => {
        mode = b.dataset.m; el.querySelectorAll('.bd-tm .chip').forEach(x => x.classList.toggle('on', x === b)); upd();
      }));
      $('.bd-d').addEventListener('input', upd); upd();
    } },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"In stream processing the result is always final." No. A stream result is <strong>fast and roughly right</strong>; late events, retries or bugs can make it a little off. That is why numbers about money (ad billing, creator payouts) are later <strong>reconciled</strong> with batch. Second mistake: making the watermark delay too small (many events dropped) or too big (the dashboard is not "live" any more).` },
    { type: 'h2', text: 'ETL vs ELT' },
    { type: 'p', html: `Data comes from many places: users/payments from Postgres, events from Kafka, CSV files from an ad partner. For analytics it must be brought into one place, in a clean shape. There are three jobs: <strong>Extract</strong> (take it out of the source), <strong>Transform</strong> (clean it, join it, remove bad rows, change the format), <strong>Load</strong> (put it in the destination). The only question is the order.` },
    { type: 'compare',
      left: { title: 'ETL: transform first, then load', ascii: `
Sources ──► Transform server ──► Warehouse
            (Spark / ETL tool)   (clean data only)`, html: `The older way, from when warehouse storage and compute were expensive. Only useful, clean data goes in. Good when sensitive fields (phone, card) must never reach the warehouse. Downside: a bug in the transform or a new question = extract again from the source; the raw data is not inside.` },
      right: { title: 'ELT: load first, then transform', ascii: `
Sources ──► Warehouse/Lake (raw) ──► SQL transform
                                     (inside, with tools like dbt)`, html: `Cloud warehouses (BigQuery, Snowflake) have cheap storage and lots of compute, so load raw data directly and transform it inside the warehouse with SQL. The raw data is always kept: a new question = a new query, no new extract. Downside: raw (and maybe sensitive) data is now inside, and you must manage its access control and cost.` },
    },
    { type: 'callout', tone: 'term', title: 'New words: ETL and ELT', html: `<strong>What it is:</strong> two orders for bringing data from sources to the analytics place. <strong>ETL</strong> = Extract → Transform → Load (clean first, then put in). <strong>ELT</strong> = Extract → Load → Transform (put it in raw, clean it inside).<br><strong>Why we need it:</strong> source data is dirty and scattered: bad rows, different formats, private fields. Analytics needs clean, joined data.<br><strong>Without it:</strong> every analyst cleans data their own way, and the numbers in two reports never match.` },
    { type: 'p', html: `The difference shows when something <em>changes</em>. Below, xyz.com's view events have 6 fields. The ETL transform keeps only the 3 useful ones. The source (Kafka) keeps only 7 days of data; the warehouse has 365 days. Choose a mode, then click each situation:` },
    { type: 'custom', render(el) {
      const RAW = ['user_id', 'phone', 'video_id', 'device', 'watch_s', 'country'], CLEAN = ['video_id', 'watch_s', 'country'];
      const DAYS = 365, RET = 7;
      const Q = {
        q1: { n: 'Watch time per country', etl: [1, 'A direct query: country and watch_s are both in the warehouse.'], elt: [1, 'The SQL transform has already built a clean table from the raw table. A direct query.'] },
        q2: { n: 'New question: watch time per device', etl: [0, `The device field was thrown away by the transform. Change the transform and extract again from the source, but Kafka keeps only ${RET} days: ${DAYS - RET} days of device data are gone forever.`], elt: [1, `device is in the raw table. One new SQL query gives the answer for all ${DAYS} days.`] },
        q3: { n: 'Bug found in the transform (watch_s wrong)', etl: [0, `Wrong numbers are already loaded in the warehouse, and the raw data is not there. You can bring back only the last ${RET} days from the source.`], elt: [1, `The raw data is safe. Fix the SQL and rebuild the clean table for all ${DAYS} days.`] },
        q4: { n: 'Where did the phone number end up?', etl: [1, 'The transform removed phone first: it never reached the warehouse. Good for privacy.'], elt: [0, 'phone landed in the raw table. Now you must handle access control, masking and delete requests for that table.'] },
      };
      el.innerHTML = `<div class="chips et-m" role="group" aria-label="Mode"><button type="button" class="chip on" data-m="etl">ETL</button><button type="button" class="chip" data-m="elt">ELT</button></div>
        <div class="et-fl" style="margin-top:10px;font:13px/1.8 var(--f-mono);color:var(--ink-2)"></div>
        <div class="chips et-q" style="margin-top:10px">${Object.entries(Q).map(([k, q]) => `<button type="button" class="chip" data-q="${k}">${q.n}</button>`).join('')}</div>
        <div class="et-ans calc-note" style="font-size:15px"></div>
        <div class="stats"><div class="stat"><span>Fields in the warehouse</span><strong class="et-nf"></strong></div><div class="stat"><span>OK in the 4 situations</span><strong class="et-sc"></strong></div></div>`;
      const $ = c => el.querySelector(c);
      let mode = 'etl', q = 'q2';
      const tag = (f, on) => `<span style="display:inline-block;margin:2px;padding:1px 7px;border-radius:6px;border:1px solid ${on ? 'var(--accent)' : 'var(--line)'};color:${on ? 'var(--ink)' : 'var(--ink-3)'};${on ? '' : 'text-decoration:line-through'}">${f}</span>`;
      const upd = () => {
        const keep = mode === 'etl' ? CLEAN : RAW;
        $('.et-fl').innerHTML = (mode === 'etl'
          ? 'Kafka (7 days) → <strong>Transform server</strong> → Warehouse<br>In the warehouse: '
          : 'Kafka (7 days) → Warehouse <strong>raw table</strong> → SQL transform → clean table<br>In the warehouse: ') + RAW.map(f => tag(f, keep.includes(f))).join('');
        el.querySelectorAll('.et-q .chip').forEach(b => b.classList.toggle('on', b.dataset.q === q));
        const [ok, txt] = Q[q][mode];
        $('.et-ans').innerHTML = `<strong style="color:${ok ? 'var(--green)' : 'var(--red)'}">${ok ? '✓' : '✗'}</strong> ${txt}`;
        $('.et-nf').textContent = keep.length + ' / ' + RAW.length;
        $('.et-sc').textContent = Object.values(Q).filter(x => x[mode][0]).length + ' / 4';
      };
      el.querySelectorAll('.et-m .chip').forEach(b => b.addEventListener('click', () => { mode = b.dataset.m; el.querySelectorAll('.et-m .chip').forEach(x => x.classList.toggle('on', x === b)); upd(); }));
      el.querySelectorAll('.et-q .chip').forEach(b => b.addEventListener('click', () => { q = b.dataset.q; upd(); }));
      upd();
    } },
    { type: 'p', html: `ETL is fine in 2 of 4 (country query, privacy), ELT in 3 (but weak on privacy). So today's common path is <strong>ELT</strong>, but mask or hash sensitive fields (phone, card) before loading. That is doing a little bit of the "T" first.` },
    { type: 'h2', text: 'Data lake, warehouse, lakehouse' },
    { type: 'p', html: `Where do we <em>keep</em> the events and reports? There are three answers, and all three are still used today.` },
    { type: 'callout', tone: 'term', title: 'New word: Data warehouse', html: `<strong>What it is:</strong> a database built for analytics: clean, structured tables, fast SQL. The schema (the columns and their types) is fixed in advance and checked when data is written (<em>schema-on-write</em>). Examples: BigQuery, Snowflake, Redshift.<br><strong>Why we need it:</strong> business people can get answers directly with SQL or a dashboard, and the numbers can be trusted.<br><strong>Without it:</strong> an engineer would have to dig into raw files for every report.<br><strong>Weakness:</strong> expensive, and not built for things like images or raw logs.` },
    { type: 'callout', tone: 'term', title: 'New word: Data lake', html: `<strong>What it is:</strong> <em>any</em> raw files on cheap object storage (S3/GCS): JSON events, Parquet, images, logs. The schema is applied when reading (<em>schema-on-read</em>).<br><strong>Why we need it:</strong> to keep years of raw data cheaply, and for work like ML training that needs raw data.<br><strong>Without it:</strong> you either throw raw data away or keep it in the expensive warehouse.<br><strong>Weakness:</strong> without care it becomes a "data swamp" (nobody knows what is where or which file is right). And plain files have no <strong>ACID</strong>: readers can see a half-written batch (widget below).` },
    { type: 'callout', tone: 'term', title: 'New word: Lakehouse (table format)', html: `<strong>What it is:</strong> a <strong>table format</strong> layer on top of the lake's cheap, open files (Parquet): Delta Lake, Apache Iceberg, Apache Hudi. It keeps a <em>transaction log</em>: "version 7 of the table has these files". A reader reads only the files of the version written in the log.<br><strong>Why we need it:</strong> it gives the lake warehouse-like features: ACID transactions, schema, old versions ("time travel"), deletes. SQL engines (Spark, Trino) and ML both work on one copy of the data.<br><strong>Without it:</strong> keep both a lake and a warehouse, data copied in two places, two bills.<br>The 2021 CIDR paper by people from Databricks is a well-known statement of this idea.` },
    { type: 'table', head: ['', 'Warehouse', 'Lake', 'Lakehouse'], rows: [
      ['Data', 'Clean tables', 'Raw files, anything', 'Open files + table format'],
      ['Schema', 'On write', 'On read', 'On write (but can evolve)'],
      ['Cost', 'Higher', 'Lowest', 'Cheap storage, compute separate'],
      ['Best for', 'BI dashboards, SQL reports', 'Raw archive, ML training', 'Both in one place, one copy'],
      ['Risk', 'Lock-in, cost', 'Data swamp, no ACID', 'Newer, needs setup know-how'],
    ]},
    { type: 'p', html: `Let us see what the lakehouse "transaction log" protects, step by step. A table sits in S3 as files, each file has 50 rows. Left: a plain lake (the reader reads every file in the folder). Right: a lakehouse (the reader reads only the latest version in the log).` },
    { type: 'custom', render(el) {
      const ST = [
        { t: 'Start', p: [['f1', 50], ['f2', 50]], pr: 100, l: [['f1', 50], ['f2', 50]], v: 'v1: f1, f2', lr: 100, n: 'The table has 100 rows. Same on both sides.' },
        { t: 'Writing a new batch (f3, f4)', p: [['f1', 50], ['f2', 50], ['f3', 50, 'new']], pr: 150, l: [['f1', 50], ['f2', 50], ['f3', 50, 'hidden']], v: 'v1: f1, f2', lr: 100, n: 'The job wrote f3; f4 is not written yet. The plain lake reader lists the folder and reads half the batch (150, wrong). The lakehouse reader reads v1 from the log: 100, consistent.' },
        { t: 'Writer crashes', p: [['f1', 50], ['f2', 50], ['f3', 50, 'bad']], pr: 150, l: [['f1', 50], ['f2', 50], ['f3', 50, 'hidden']], v: 'v1: f1, f2', lr: 100, n: 'The job died. In the plain lake, f3 is left alone: every reader will see half a batch forever. In the lakehouse the commit never happened, so f3 is in no version: no reader sees it (it is cleaned up later).' },
        { t: 'Retry: f3b, f4b written', p: [['f1', 50], ['f2', 50], ['f3', 50, 'bad'], ['f3b', 50], ['f4b', 50]], pr: 250, l: [['f1', 50], ['f2', 50], ['f3', 50, 'hidden'], ['f3b', 50], ['f4b', 50]], v: 'v2: f1, f2, f3b, f4b', lr: 200, n: 'The retry worked. The right answer is 200. The plain lake also read the old f3: 250 (duplicates). The lakehouse made one atomic commit, v2 = f1, f2, f3b, f4b: 200.' },
        { t: 'Delete user 42 data', p: [['f1', 50], ['f2', 40, 'new'], ['f3', 50, 'bad'], ['f3b', 50], ['f4b', 50]], pr: 240, l: [['f1', 50], ['f2b', 40], ['f3b', 50], ['f4b', 50]], v: 'v3: f1, f2b, f3b, f4b', lr: 190, n: 'User 42 had 10 rows in f2. Plain lake: f2 is overwritten in place, the old version is gone, and during the overwrite a reader could even find f2 missing. Lakehouse: write a new file f2b, then commit v3. A reader sees either v2 or v3, never a state in between.' },
        { t: 'Time travel: yesterday\'s version', p: null, l: [['f1', 50], ['f2', 50], ['f3b', 50], ['f4b', 50]], v: 'read v2', lr: 200, n: 'An audit needs "yesterday\'s table". Lakehouse: read v2; its files are still in S3 (until retention ends): 200 rows. Plain lake: the old f2 was overwritten, so there is no version from yesterday.' },
      ];
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><button type="button" class="btn small ghost lh-p">Back</button><button type="button" class="btn small primary lh-n">Next step</button><strong class="lh-t" style="font-size:14px;color:var(--ink)"></strong></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-top:10px">
          <div style="border:1px solid var(--line);border-radius:var(--r);padding:10px"><div style="font:600 13px var(--f-mono);color:var(--ink-3)">PLAIN LAKE</div><div class="lh-pf" style="margin:6px 0"></div><div class="lh-pr" style="font-size:14px"></div></div>
          <div style="border:1px solid var(--line);border-radius:var(--r);padding:10px"><div style="font:600 13px var(--f-mono);color:var(--ink-3)">LAKEHOUSE (Iceberg / Delta)</div><div class="lh-lf" style="margin:6px 0"></div><div class="lh-v" style="font:12.5px var(--f-mono);color:var(--ink-2)"></div><div class="lh-lr" style="font-size:14px"></div></div>
        </div>
        <div class="calc-note lh-note"></div>`;
      const $ = c => el.querySelector(c);
      let k = 0;
      const chip = ([n, r, f]) => `<span style="display:inline-block;margin:2px;padding:2px 8px;border-radius:6px;font:12.5px var(--f-mono);border:1.5px ${f === 'hidden' ? 'dashed var(--line-2)' : 'solid ' + (f === 'bad' ? 'var(--red)' : f === 'new' ? 'var(--amber)' : 'var(--accent)')};color:${f === 'hidden' ? 'var(--ink-3)' : 'var(--ink)'}">${n} (${r})</span>`;
      const good = [100, 100, 100, 200, 190, 200];
      const upd = () => {
        const s = ST[k];
        $('.lh-t').textContent = (k + 1) + '/' + ST.length + ': ' + s.t;
        $('.lh-pf').innerHTML = s.p ? s.p.map(chip).join('') : '<span style="color:var(--ink-3)">no old version left</span>';
        $('.lh-pr').innerHTML = s.p ? `Reader sees: <strong style="color:${s.pr === good[k] ? 'var(--green)' : 'var(--red)'}">${s.pr} rows</strong>` : `<strong style="color:var(--red)">✗ no time travel</strong>`;
        $('.lh-lf').innerHTML = s.l.map(chip).join('');
        $('.lh-v').textContent = 'log: ' + s.v;
        $('.lh-lr').innerHTML = `Reader sees: <strong style="color:var(--green)">${s.lr} rows</strong>`;
        $('.lh-note').textContent = s.n;
        $('.lh-p').disabled = k === 0; $('.lh-n').disabled = k === ST.length - 1;
      };
      $('.lh-n').addEventListener('click', () => { k = Math.min(ST.length - 1, k + 1); upd(); });
      $('.lh-p').addEventListener('click', () => { k = Math.max(0, k - 1); upd(); });
      upd();
    } },
    { type: 'h2', text: 'Lambda vs Kappa architecture' },
    { type: 'p', html: `We saw above: a stream is fast but roughly right, a batch is slow but final. If you need both, how do you join them? There are two well-known answers.` },
    { type: 'callout', tone: 'term', title: 'New word: Lambda architecture', html: `<strong>What it is:</strong> an idea from Nathan Marz (creator of Storm). Data goes down <strong>two paths</strong>: a <strong>batch layer</strong> (all raw data, a final result every few hours) and a <strong>speed layer</strong> (a stream, a fast result for recent data only). A <strong>serving layer</strong> joins both at query time: the old part from batch, the fresh part from speed.<br><strong>Why we need it:</strong> a stream is fast but sometimes wrong; a batch is final but late. Lambda gives the benefits of both together.<br><strong>Without it (batch only):</strong> no live number. <strong>(An old-style stream only):</strong> no final number.<br>(This has nothing to do with AWS Lambda serverless; only the name is the same.)` },
    { type: 'callout', tone: 'term', title: 'New word: Kappa architecture', html: `<strong>What it is:</strong> Jay Kreps' (Kafka co-creator) idea from 2014: <em>keep only stream processing</em>. Keep data in Kafka for as long as you need to process it again. Logic changed? Run the new job version from the start of the log (offset 0), write to a new table, and switch when it catches up.<br><strong>Why we need it:</strong> in Lambda the same logic must be written twice, in two frameworks. In Kappa there is one codebase.<br><strong>Without it:</strong> two codebases that sooner or later give different numbers.<br><strong>The price:</strong> keeping data in Kafka for a long time, and the time needed to replay.` },
    { type: 'ascii', text: `
LAMBDA                                   KAPPA
                ┌─► Batch (Spark) ─┐                  ┌─► Stream job v1 ─► table_v1 (live)
Events ─► Kafka ┤                  ├─► Merge   Events ─► Kafka (long retention)
                └─► Speed (Flink) ─┘    query          └─► Stream job v2 ─► table_v2
                                                            (replay from offset 0; when it
 The same logic TWICE, in two systems                        catches up, switch, stop v1)`, caption: 'In Kappa, reprocessing is also done by the stream: just read the log again from the start.' },
    { type: 'p', html: `<strong>The problem with Lambda:</strong> the logic for "how to count views" must be written twice, in two different frameworks, and both must always match. Jay Kreps (Kafka co-creator), in his 2014 article "Questioning the Lambda Architecture", described exactly this pain and suggested a simple fix, which he jokingly named the <strong>Kappa architecture</strong>: <em>keep only stream processing</em>. Keep data in Kafka for as long as you need to process it again. Logic changed? Run the new job version from the start of the log, write into a new output table, and when it catches up switch the app to that table and remove the old job/table.` },
    { type: 'p', html: `The real question for Kappa: "how much time and storage does a replay take?" Move xyz.com's numbers below. Notice one thing: during the replay new live events keep arriving, so the job must run <em>faster</em> than the live rate, or it will never catch up.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="chips lk-m" role="group" aria-label="Architecture"><button type="button" class="chip" data-m="lambda">Lambda</button><button type="button" class="chip on" data-m="kappa">Kappa</button></div>
        <div class="row2" style="margin-top:10px">
          <div><label>Live events/sec: <strong class="lk-rv"></strong></label><input class="lk-r" type="range" min="10" max="200" step="10" value="50"></div>
          <div><label>Days to process again: <strong class="lk-dv"></strong></label><input class="lk-d" type="range" min="1" max="90" step="1" value="30"></div>
        </div>
        <div class="lk-sw"><label>Replay job speed (times the live rate): <strong class="lk-mv"></strong></label><input class="lk-x" type="range" min="1" max="20" step="1" value="10"></div>
        <div class="stats">
          <div class="stat"><span>Codebases (places with the logic)</span><strong class="lk-cb"></strong></div>
          <div class="stat"><span>Time to reprocess</span><strong class="lk-t"></strong></div>
          <div class="stat"><span>Where raw data lives, how much</span><strong class="lk-s"></strong></div>
        </div>
        <div class="calc-note lk-note"></div>
        <div class="calc-note">Assumed: one event is ~1 KB, and Kafka keeps 3 copies of all data. Kafka tiered storage can move old data to cheap object storage, which makes long retention cheaper.</div>`;
      const $ = c => el.querySelector(c);
      let mode = 'kappa';
      const tb = b => b >= 1e15 ? (b / 1e15).toFixed(2) + ' PB' : (b / 1e12).toFixed(1) + ' TB';
      const upd = () => {
        const r = +$('.lk-r').value * 1000, d = +$('.lk-d').value, m = +$('.lk-x').value;
        $('.lk-rv').textContent = (r / 1000) + 'k'; $('.lk-dv').textContent = d; $('.lk-mv').textContent = m + 'x';
        $('.lk-sw').style.display = mode === 'kappa' ? '' : 'none';
        const bytes = r * 86400 * d * 1000;
        if (mode === 'kappa') {
          const days = m > 1 ? d / (m - 1) : Infinity;
          $('.lk-cb').textContent = '1';
          $('.lk-t').textContent = m > 1 ? (days < 1 ? (days * 24).toFixed(1) + ' hours' : days.toFixed(1) + ' days') : 'never';
          $('.lk-s').textContent = 'Kafka: ' + tb(bytes * 3);
          $('.lk-note').textContent = m > 1
            ? `A backlog of ${d} days, and the job is ${m} times faster than live: each second it reads ${m} seconds of data, but 1 new second also arrives. The backlog shrinks at ${m - 1} times speed: ${d} / ${m - 1} ≈ ${days < 1 ? (days * 24).toFixed(1) + ' hours' : days.toFixed(1) + ' days'}. Until then the old job and old table keep running, then you switch.`
            : 'The replay job runs only at live speed: the backlog will never shrink. Replay needs more machines/partitions.';
        } else {
          $('.lk-cb').textContent = '2 (batch + speed)';
          $('.lk-t').textContent = 'next batch run (hours)';
          $('.lk-s').textContent = 'Lake (S3): ' + tb(bytes);
          $('.lk-note').textContent = `The logic changed (say, a bot filter): it must change in the Spark batch code and in the Flink speed code. In its next run, the batch layer recomputes all ${d} days from the lake. Raw data sits in the cheap lake, so Kafka does not need long retention. But the two codebases must always match, and when they give different numbers you argue about "which one is right?".`;
        }
      };
      el.querySelectorAll('.lk-m .chip').forEach(b => b.addEventListener('click', () => { mode = b.dataset.m; el.querySelectorAll('.lk-m .chip').forEach(x => x.classList.toggle('on', x === b)); upd(); }));
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    } },
    { type: 'list', items: [
      `<strong>When Lambda:</strong> a final batch count is required (billing, payouts), a batch system already exists, or the historical data is so big that replaying it through a stream is expensive.`,
      `<strong>When Kappa:</strong> you want one codebase, the stream engine (Flink) is mature, and you can keep enough data in the log to replay (or replay from log + lake).`,
      `<strong>The real world:</strong> often a middle path: live numbers from the stream, and a nightly batch reconciliation only for the numbers tied to money. The roadmap's ad-click aggregation design says the same: Kafka → Flink windows → OLAP store, plus batch for exact billing.`,
    ]},
    { type: 'h2', text: 'OLTP vs OLAP: row store vs column store' },
    { type: 'p', html: `At the start the question was: why not run analytics on production Postgres? Now the deeper answer. The two kinds of work have a completely different <em>shape</em>.` },
    { type: 'callout', tone: 'term', title: 'New word: OLTP', html: `<strong>What it is:</strong> OLTP (Online Transaction Processing) = the app's everyday work: "give me user 42's profile", "save this comment". Each query touches <em>a few rows</em> and <em>all columns</em>, with lots of queries per second, in milliseconds. Postgres, MySQL.<br><strong>How it stores data:</strong> <strong>row by row</strong>: all columns of one row together on disk.<br><strong>Why:</strong> a user's whole row is found in one place.<br><strong>Without it:</strong> every login would have to visit 30 different places.` },
    { type: 'callout', tone: 'term', title: 'New word: OLAP', html: `<strong>What it is:</strong> OLAP (Online Analytical Processing) = question-and-answer work: "total watch time per country last month". Each query touches <em>hundreds of millions of rows</em> but only <em>2-3 columns</em>, with few queries, and seconds are fine. ClickHouse, BigQuery, Snowflake, Druid.<br><strong>How it stores data:</strong> <strong>column by column</strong>: all values of one column together on disk.<br><strong>Why:</strong> a query reads only the columns it needs, and similar values next to each other compress very well.<br><strong>Without it:</strong> every analytics query reads all columns of the whole table.` },
    { type: 'ascii', text: `
Table: views (video_id, user_id, country, device, watch_s, date, ...30 columns)

ROW STORE (Postgres)                 COLUMN STORE (ClickHouse / BigQuery)
[7, 912, IN, android, 41, ...]       video_id: 7, 7, 9, 7, 3 ...
[9, 113, US, web,     12, ...]       country : IN, US, IN, IN, IN ...  ← same values together:
[7, 455, IN, ios,     300, ...]      watch_s : 41, 12, 300, 9, 77 ...     compress very well
  ↑ one row = one place                ↑ one column = one place

"SUM(watch_s) GROUP BY country" → the row store must read all 30 columns,
                                   the column store reads only 2 (country, watch_s).`, caption: 'A column store reads only what the query needs, and similar values sitting together also give great compression.' },
    { type: 'p', html: `Feel the numbers. Query: <code>SELECT country, SUM(watch_s) FROM views GROUP BY country</code> (needs 2 columns).` },
    { type: 'custom', render(el) {
      const ROWS = [1e6, 1e7, 1e8, 1e9];
      const RL = ['1 million', '10 million', '100 million', '1 billion'];
      el.innerHTML = `<div class="row2">
          <div><label>Rows: <strong class="bd-vr"></strong></label><input class="bd-r" type="range" min="0" max="3" step="1" value="2"></div>
          <div><label>Columns in the table: <strong class="bd-vc"></strong></label><input class="bd-c" type="range" min="5" max="50" step="5" value="30"></div>
        </div>
        <div style="margin-top:8px"><label>Column compression (assume): <strong class="bd-vz"></strong></label><input class="bd-z" type="range" min="1" max="10" step="1" value="4"></div>
        <div class="stats">
          <div class="stat"><span>Row store reads</span><strong class="bd-rb"></strong></div>
          <div class="stat"><span>Column store reads</span><strong class="bd-cb"></strong></div>
          <div class="stat"><span>Difference</span><strong class="bd-x"></strong></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Scan time, row (500 MB/s)</span><strong class="bd-rt"></strong></div>
          <div class="stat"><span>Scan time, column (500 MB/s)</span><strong class="bd-ct"></strong></div>
        </div>
        <div class="calc-note">Assumption: each value is ~8 bytes, one disk/SSD stream reads ~500 MB/s, and the query needs 2 columns. Real engines read from many disks/machines in parallel and read even less thanks to indexes/partitions; here we only want the ratio.</div>`;
      const $ = c => el.querySelector(c);
      const gb = b => b >= 1e9 ? (b / 1e9).toFixed(1) + ' GB' : (b / 1e6).toFixed(0) + ' MB';
      const sec = s => s >= 120 ? (s / 60).toFixed(1) + ' min' : s.toFixed(1) + ' s';
      const upd = () => {
        const n = ROWS[+$('.bd-r').value], k = +$('.bd-c').value, z = +$('.bd-z').value;
        $('.bd-vr').textContent = RL[+$('.bd-r').value]; $('.bd-vc').textContent = k; $('.bd-vz').textContent = z + 'x';
        const rowB = n * k * 8, colB = n * 2 * 8 / z;
        $('.bd-rb').textContent = gb(rowB); $('.bd-cb').textContent = gb(colB);
        $('.bd-x').textContent = Math.round(rowB / colB) + 'x less';
        $('.bd-rt').textContent = sec(rowB / 500e6); $('.bd-ct').textContent = sec(colB / 500e6);
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    } },
    { type: 'p', html: `Now look at the opposite: the app's OLTP work, like "give me user 42's whole row" or "update one row". How many places does each store touch?` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Columns in the table: <strong class="ol-cv"></strong></label><input class="ol-c" type="range" min="5" max="50" step="5" value="30"></div>
          <div><label>Such queries per second: <strong class="ol-qv"></strong></label><input class="ol-q" type="range" min="1000" max="20000" step="1000" value="10000"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Row store: places per query</span><strong class="ol-r"></strong></div>
          <div class="stat"><span>Column store: places per query</span><strong class="ol-k"></strong></div>
          <div class="stat"><span>Column store: reads per second</span><strong class="ol-t"></strong></div>
        </div>
        <div class="calc-note ol-note"></div>`;
      const $ = c => el.querySelector(c);
      const upd = () => {
        const k = +$('.ol-c').value, q = +$('.ol-q').value;
        $('.ol-cv').textContent = k; $('.ol-qv').textContent = q.toLocaleString('en-IN');
        $('.ol-r').textContent = '1 page (via index)';
        $('.ol-k').textContent = k + ' column files';
        $('.ol-t').textContent = (k * q).toLocaleString('en-IN') + ' vs ' + q.toLocaleString('en-IN');
        $('.ol-note').textContent = `In a row store, user 42's whole row sits in one page (a small block on disk): the index goes straight there, 1 read. In a column store the ${k} columns live in ${k} different places: ${k} reads. At ${q.toLocaleString('en-IN')} queries/s that becomes ${(k * q).toLocaleString('en-IN')} reads/s, ${k} times more. Updates are worse: compressed column blocks must be rewritten. So the app database is a row store, and analytics uses a column store.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    } },
    { type: 'list', items: [
      `<strong>The opposite is also true:</strong> in a column store, "give me user 42's whole row" or updating one row is expensive (going to 30 different places). So the app's main database stays OLTP, and data is copied into the OLAP store through CDC/Kafka.`,
      `<strong>The roadmap's line:</strong> OLTP = Postgres, OLAP = ClickHouse / BigQuery. Neither does the other's job well.`,
      `<strong>A middle path:</strong> on small data, a Postgres read replica is enough for analytics (the main database stays safe). When you reach hundreds of millions of rows and daily dashboards, move to OLAP.`,
    ]},
    { type: 'h2', text: 'Decide' },
    { type: 'table', head: ['Question', 'Pick', 'xyz.com example'], rows: [
      ['Need the result in seconds?', 'Stream (Flink, Kafka Streams)', 'Live viewer count, fraud click check, trending now'],
      ['Result can come hours later, must be final?', 'Batch (Spark, warehouse SQL)', 'Daily report, creator payouts, ML training'],
      ['Small logic, data already in Kafka, one team?', 'Kafka Streams (library)', 'Each user\'s likes in the last 5 min'],
      ['Big job, heavy state, event time, many sources?', 'Flink', 'Windowed aggregation of ad clicks'],
      ['Where do analytics queries run?', 'OLAP (ClickHouse, BigQuery), not on production OLTP', 'Creator dashboard'],
      ['Keep raw data cheaply for years?', 'Data lake (S3 + Parquet), plus a lakehouse table format if needed', 'Archive of all events'],
    ]},
    { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>Need the result in seconds</strong> (surge pricing, fraud checks, live viewer counts)? <strong>Stream processing.</strong> <strong>Can the result wait hours</strong> (daily reports, model training, monthly settlements)? <strong>Batch.</strong> If money is involved, use both: a fast number from the stream, and a final reconciliation from batch.` },
    { type: 'diagram', title: 'xyz.com data platform: the whole picture', height: 640,
      groups: [
        { label: 'Sources', x: 20, y: 16, w: 680, h: 92 },
        { label: 'Processing', x: 14, y: 140, w: 700, h: 230 },
        { label: 'Serving', x: 20, y: 410, w: 680, h: 216 },
      ],
      nodes: [
        { id: 'apps', label: 'xyz.com apps', sub: 'view, like, search', x: 120, y: 62, w: 160, kind: 'client', info: 'What it is: the servers of the website and mobile apps. Every action becomes an event and goes to Kafka, so the production database gets no analytics load.' },
        { id: 'pg', label: 'Postgres', sub: 'OLTP, row store', x: 360, y: 62, w: 150, kind: 'data', info: 'What it is: the app\'s production database (users, payments). Its changes go to Kafka through CDC (a tool that reads the change log), so analytics never touches it.' },
        { id: 'partner', label: 'Partner files', sub: 'ad CSV, daily', x: 590, y: 62, w: 150, kind: 'server', info: 'What it is: daily CSV files from an outside company (ad spend). In ELT style they are loaded raw straight into the lake, then cleaned with SQL.' },
        { id: 'kafka', label: 'Kafka', sub: 'events log, 7 days', x: 240, y: 192, w: 150, kind: 'queue', info: 'What it is: a durable diary of all events. Stream jobs read it live, and a connector writes the events into the lake as files. Kappa-style replay also starts here.' },
        { id: 'flink', label: 'Flink', sub: 'windows, watermark', x: 95, y: 318, w: 150, kind: 'server', info: 'What it is: the stream engine. 10 s tumbling windows on event time, with a watermark, state and checkpoints. It writes live viewer counts into ClickHouse.' },
        { id: 'ks', label: 'Spam check', sub: 'Kafka Streams', x: 280, y: 318, w: 150, kind: 'server', info: 'What it is: a small service with the Kafka Streams library inside. It counts each user\'s likes in the last 5 min; too many means a spam flag. Scale = as many copies as partitions.' },
        { id: 'lake', label: 'Lakehouse', sub: 'S3 Parquet + Iceberg', x: 470, y: 318, w: 160, kind: 'data', info: 'What it is: years of raw data in cheap S3 storage, in Parquet files, with the Iceberg table format (ACID, time travel, deletes). Both batch and ML read from here.' },
        { id: 'spark', label: 'Spark', sub: 'nightly 2 am', x: 640, y: 318, w: 120, kind: 'server', info: 'What it is: the batch engine. Every night, over all of yesterday\'s data: exact counts, creator payouts, and reconciliation including late events. Results go into ClickHouse.' },
        { id: 'olap', label: 'ClickHouse', sub: 'OLAP, column store', x: 200, y: 466, w: 170, kind: 'data', info: 'What it is: the analytics database, data stored column by column. Both live (Flink) and final (Spark) numbers land here. GROUP BY over billions of rows in seconds.' },
        { id: 'dash', label: 'Dashboards', sub: 'creators, product', x: 200, y: 578, w: 170, kind: 'client', info: 'What it is: creator analytics, live viewer count, daily reports. Live numbers carry an "approx" label; final numbers come from batch in the morning.' },
        { id: 'ml', label: 'ML training', sub: 'recommendations', x: 560, y: 578, w: 170, kind: 'server', info: 'What it is: the recommendations team\'s jobs that read the last 90 days of raw watch events from the lakehouse and train a model.' },
      ],
      edges: [
        { a: 'apps', b: 'kafka', n: 1, label: 'events' },
        { a: 'pg', b: 'kafka', label: 'CDC' },
        { a: 'kafka', b: 'flink', n: 2 },
        { a: 'kafka', b: 'ks', kind: 'evt' },
        { a: 'kafka', b: 'lake', label: 'S3 sink' },
        { a: 'partner', b: 'lake', label: 'ELT load' },
        { a: 'lake', b: 'spark' },
        { a: 'spark', b: 'olap', via: [[640, 466]], label: 'final numbers' },
        { a: 'flink', b: 'olap', n: 3, label: 'live counts' },
        { a: 'olap', b: 'dash', n: 4, kind: 'res' },
        { a: 'lake', b: 'ml' },
      ],
      paths: [
        { name: 'Live count (stream)', text: 'The event goes to Kafka, Flink counts it in a 10 s window and writes to ClickHouse; it shows on the dashboard in ~10-15 s.', go: ['apps>kafka>flink>olap>dash'] },
        { name: 'Nightly batch', text: 'Events pile up in the lake; at 2 am Spark puts the final count for the whole day into ClickHouse.', go: ['apps>kafka>lake>spark>olap>dash'] },
        { name: 'Spam check', text: 'The Kafka Streams service counts each user\'s likes live.', go: ['apps>kafka>ks'] },
        { name: 'ML + ELT', text: 'Database changes (CDC) and partner files land raw in the lake; ML jobs read from there.', go: ['pg>kafka>lake>ml', 'partner>lake'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>No analytics on the production database: events go to Kafka, then into separate data pipelines.</li>
      <li>Batch = bounded data, hours later, final (MapReduce, Spark). Stream = unbounded, in seconds, roughly right (Flink, Kafka Streams).</li>
      <li>MapReduce: map → shuffle (same key to one reducer) → reduce. Spark is the same idea in memory, with recovery through lineage; it helps when the same data is used again and again.</li>
      <li>Flink: a separate cluster, state + checkpoints (state and offset saved together). Kafka Streams: a library inside your service, maximum parallelism = partitions.</li>
      <li>Windows: tumbling (no overlap), sliding (overlap), session (closed by a gap). Event time + watermark; late events are dropped, update the result, or go to a side output.</li>
      <li>ETL = clean first, then load. ELT = load raw, clean inside with SQL (new questions are easy, watch privacy).</li>
      <li>Warehouse (clean SQL tables), lake (cheap raw files), lakehouse (lake + transaction log: ACID, time travel).</li>
      <li>Lambda = batch + speed, two codebases. Kappa = stream only + replay. OLTP uses a row store, OLAP uses a column store.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['The production database stays safe; analytics runs on separate systems', 'Batch: all the data, final results, cheap, can be re-run', 'Stream: results in seconds, live features (counts, fraud, surge)', 'Column stores: GROUP BY over billions of rows in seconds', 'Lake/lakehouse: years of raw data kept cheaply, new questions on old data'],
      costs: ['New systems: Kafka, Flink/Spark, OLAP, lake: each one needs operating', 'Stream: late events, watermarks, state, the difficulty of exactly-once', 'Batch: results are hours old', 'Lambda: the same logic in two places; Kappa: the cost of long retention and replay', 'Copies of data in many places: you must manage consistency, privacy (delete requests) and cost'] },
    { type: 'think', questions: [
      { q: 'On xyz.com every creator is paid each month based on views. The creator dashboard must show "today\'s views" live. What will you design?', a: 'Live dashboard: Kafka → Flink (tumbling windows per video/creator, event time, a small allowed delay) → ClickHouse → dashboard, with an "approx, live" label. Payout: a nightly/monthly Spark batch job over all the data in the lake (with late events, bot filtering and refunds) that produces the final number. When the two differ, the batch number is treated as correct.' },
      { q: 'With a 2 second watermark delay many events are dropped; with 5 minutes the dashboard does not feel "live". What will you do?', a: 'First look at the data: how late do events arrive (the p99 delay)? Set the delay from that (say 10-30 s). Also give allowed lateness so a few late events can update the result, and send very late events to a side output that later goes into batch reconciliation. Show the early result in the UI and let it update.' },
      { q: 'The analytics team says "we will run everything on a Postgres read replica, we do not need ClickHouse". When is this fine, and when not?', a: 'On small data (up to a few hundred million rows, few dashboards) a replica is fine: no load on the main database, no new system. When queries scan billions of rows, or the replica lag and slow queries push replication behind, or many people run dashboards at once, you need a column store (ClickHouse/BigQuery), because a row store reads all columns in every query.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'What does the shuffle step do in MapReduce?', options: ['Puts the input in random order', 'Brings all pairs with the same key to one reducer and sorts them by key', 'Compresses the output'], answer: 1, explain: 'Partition = hash(key) mod R. The same key always goes to the same reducer, then sort/group, then reduce.' },
      { q: 'When can you use a combiner?', options: ['Always', 'When doing the operation (like sum, count) in pieces and then joining gives the same result', 'Only when there is one mapper'], answer: 1, explain: 'A combiner does a partial reduce on the mapper, so fewer pairs go over the network. It does not work directly for an operation like average (you must send sum and count separately).' },
      { q: 'Which window for "views in the last 1 minute, updated every 10 seconds"?', options: ['Tumbling 1 minute', 'Sliding: size 1 minute, slide 10 seconds', 'Session, gap 10 seconds'], answer: 1, explain: 'Overlapping windows start at every slide; each event is counted in 6 windows.' },
      { q: 'In event time processing, what does the watermark tell you?', options: ['The server\'s current clock', 'The engine\'s estimate that all events before this time have arrived, so windows can close', 'The Kafka offset'], answer: 1, explain: 'When the watermark moves ahead, windows up to that time fire. Old events that come after it are late.' },
      { q: 'In the Kappa architecture, how is old data processed again when the logic changes?', options: ['With a separate batch system', 'A new stream job replays the log from the start, writes into a new table, then you switch', 'Old data is not reprocessed'], answer: 1, explain: 'Jay Kreps\' idea: one stream codebase, long retention, reprocessing by replay.' },
      { q: 'Why is a column store faster for "total watch time per country"?', options: ['It has no indexes', 'It reads only the 2 needed columns, and similar values compress well', 'It always keeps data in RAM'], answer: 1, explain: 'A row store must read whole rows (all columns). 2 of 30 columns + compression = tens of times fewer bytes.' },
      { q: 'The analytics team wants to ask a new question about a field that the ETL transform had already removed. Which approach would have been better here?', options: ['ETL', 'ELT: the raw data is in the warehouse/lake, just write new SQL', 'Both are the same'], answer: 1, explain: 'In ELT the raw data is kept, so a new question = a new query. In ETL you must extract again from the source, and data outside the source\'s retention is gone.' },
      { q: 'What is the main benefit of a lakehouse table format (Iceberg/Delta) over a plain data lake?', options: ['Files become smaller', 'A transaction log: readers see only committed versions (ACID), and old versions and deletes are possible', 'Data stays in RAM'], answer: 1, explain: 'A half-written or crashed batch is never seen by readers, and old versions in the log allow time travel.' },
      { q: 'A Kafka Streams app\'s topic has 6 partitions. What happens if you run 10 instances?', options: ['10 times the speed', '6 instances work, 4 stay idle', 'Kafka automatically makes 10 partitions'], answer: 1, explain: 'At any moment a partition belongs to only one member of the group. Maximum parallelism = the number of partitions.' },
    ]},
    { type: 'sources', note: 'The MapReduce (2004) and RDD (2012) papers are old; their ideas live on in today\'s tools, but the exact implementation has changed. Current official docs were used for Flink and Kafka Streams.', items: [
      { title: 'MapReduce: Simplified Data Processing on Large Clusters', publisher: 'Google (Jeffrey Dean, Sanjay Ghemawat), OSDI 2004', year: 2004, official: true, url: 'https://static.googleusercontent.com/media/research.google.com/en//archive/mapreduce-osdi04.pdf', used: 'Map/reduce model and word count, M splits of 16-64 MB, master assigning tasks, intermediate data on local disk partitioned by hash(key) mod R, reducers reading remotely and sorting, combiner, re-executing completed map tasks on failure, locality with GFS 64 MB blocks x3, backup tasks (1 TB sort 891 s vs 1283 s without, +44%), production indexing use.' },
      { title: 'Resilient Distributed Datasets: A Fault-Tolerant Abstraction for In-Memory Cluster Computing', publisher: 'UC Berkeley (Zaharia et al.), NSDI 2012', year: 2012, official: true, url: 'https://www.usenix.org/conference/nsdi12/technical-sessions/presentation/zaharia', used: 'RDDs as in-memory distributed datasets, lineage-based fault tolerance, order-of-magnitude gains for iterative and interactive workloads.' },
      { title: 'Windows (DataStream API)', publisher: 'Apache Flink documentation', official: true, url: 'https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/operators/windows/', used: 'Tumbling, sliding (size + slide, element in multiple windows), session (gap, no fixed start/end) windows; epoch alignment; start inclusive/end exclusive; firing when watermark passes window end; allowed lateness default 0 and late data dropped or sent to side output.' },
      { title: 'Kafka Streams introduction', publisher: 'Apache Kafka documentation', official: true, url: 'https://kafka.apache.org/42/streams/introduction/', used: 'Kafka Streams as a client library inside your application, input/output in Kafka, stateful processing, windowing, exactly-once, no separate cluster.' },
      { title: 'Kafka Streams architecture: stream partitions and tasks', publisher: 'Apache Kafka documentation', official: true, url: 'https://kafka.apache.org/documentation/streams/architecture', used: 'Tasks per input partition; maximum parallelism bounded by partitions; extra instances stay idle; local state stores backed by changelog topics and restored on failover.' },
      { title: 'Fault Tolerance via State Snapshots', publisher: 'Apache Flink documentation', official: true, url: 'https://nightlies.apache.org/flink/flink-docs-stable/docs/learn-flink/fault_tolerance/', used: 'Checkpoints as consistent snapshots of operator state together with source offsets, restore and replay after failure, exactly-once state semantics.' },
      { title: 'Apache Iceberg table spec', publisher: 'Apache Iceberg', official: true, url: 'https://iceberg.apache.org/spec/', used: 'Table metadata and snapshots listing data files, atomic commits, readers see a consistent snapshot, time travel to older snapshots, row-level deletes.' },
      { title: 'Questioning the Lambda Architecture', publisher: "O'Reilly Radar (Jay Kreps)", year: 2014, url: 'https://www.oreilly.com/radar/questioning-the-lambda-architecture/', used: 'What Lambda architecture is, the pain of maintaining logic in two systems, the Kappa alternative: keep data in Kafka, reprocess by running a second job from the start into a new table, then switch.' },
      { title: 'Lakehouse: A New Generation of Open Platforms that Unify Data Warehousing and Advanced Analytics', publisher: 'Databricks (Armbrust, Ghodsi, Xin, Zaharia), CIDR 2021', year: 2021, official: true, url: 'https://www.databricks.com/research/lakehouse-a-new-generation-of-open-platforms-that-unify-data-warehousing-and-advanced-analytics', used: 'Lakehouse definition: open direct-access formats like Parquet, warehouse-like management, support for ML, as an alternative to separate lake + warehouse.' },
    ]},
  ],
});
