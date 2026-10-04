Lesson.register({
  id: 'latency-throughput',
  title: 'Latency, throughput and p99',
  minutes: 27,
  summary: `Latency = how long one request takes. Throughput = how many requests per second. Bandwidth = how wide the pipe is. And "average latency" is the most misleading number, which is why engineers look at p50, p95 and p99. In this lesson: the difference between the three (with a calculator), why latency explodes when load grows, Little's law, percentiles with a live histogram, tail latency, latency numbers, and SLI/SLO/SLA.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Two questions are asked about every website. First: <strong>"I clicked; how long did the page take to come?"</strong> Second: <strong>"how many people can it serve in one second?"</strong><br>The first is called latency, the second throughput. They are different: a site can handle a lot of people but make each one wait a little.<br>And a hidden truth: the "average" can make everything look fine while some users waited a very long time. In this lesson we will learn to measure those unlucky users.` },

    { type: 'h2', text: 'The problem: the dashboard says all is fine, users say the site is slow' },
    { type: 'p', html: `xyz.com\'s team dashboard shows: "average response time 75 ms". Very fast! But every day support gets complaints: "the page takes 1-2 seconds to open". How can both be true? To answer this, let us first make three words clear.` },

    { type: 'h2', text: 'Three different things: latency, throughput, bandwidth' },
    { type: 'callout', tone: 'term', title: 'New word: Latency', html: `<strong>What it is:</strong> how much time one task took from start to end. For a website: from the click until the answer arrives. Unit: milliseconds (ms; 1 second = 1,000 ms).<br><strong>Why it matters:</strong> this is what the user feels as "fast" or "slow". Research and experience both say: up to ~100-200 ms things feel "instant"; after 1 second, attention starts to wander.<br><strong>Example:</strong> xyz.com\'s <code>/feed</code> came back in 120 ms: latency is 120 ms.` },
    { type: 'callout', tone: 'term', title: 'New word: Throughput', html: `<strong>What it is:</strong> how many tasks the system <em>finishes</em> in one second. For websites, often <strong>QPS</strong> (queries per second) or <strong>RPS</strong> (requests per second).<br><strong>Why it matters:</strong> it tells you how many users you can handle at the same time, and how many servers you need.<br><strong>Example:</strong> one server finishes 2,000 requests in 1 second: throughput is 2,000 RPS.` },
    { type: 'callout', tone: 'term', title: 'New word: Bandwidth', html: `<strong>What it is:</strong> the <em>maximum</em> amount of data a network can carry in one second. The width of the pipe. Unit: Mbps / Gbps (megabits/gigabits per second; 8 bits = 1 byte).<br><strong>Why it matters:</strong> it decides the time for big files (video, photos, backups).<br><strong>Example:</strong> on a 100 Mbps connection, a 1 GB (8,000 megabit) file = at least 80 seconds.` },
    { type: 'table', head: ['Word', 'On a highway', 'At xyz.com', 'Unit'], rows: [
      ['<strong>Latency</strong>', 'How long one car takes to get from A to B', 'How long the response to one request took', 'ms'],
      ['<strong>Throughput</strong>', 'How many cars reached B in one hour', 'How many requests the server finishes per second', 'requests/sec (QPS)'],
      ['<strong>Bandwidth</strong>', 'How many lanes the highway has', 'The most data the network can carry per second', 'Mbps / Gbps'],
    ]},
    { type: 'callout', tone: 'term', title: 'New word: RTT (round trip time)', html: `<strong>What it is:</strong> the time for a tiny message to go from the user to the server and for the answer to come back. Like what the <code>ping</code> command shows.<br><strong>Why it matters:</strong> every new connection takes several round trips (TCP handshake, TLS handshake, then the request: remember the "TCP, UDP, HTTPS" lesson). So with a faraway server, the time of each round trip is added many times.<br><strong>Example:</strong> Mumbai to a server in Mumbai: ~1-5 ms RTT. Mumbai to the US: ~200-250 ms RTT.` },
    { type: 'p', html: `Where does the latency of one request come from? Three parts:` },
    { type: 'list', items: [
      `<strong>Network (the road):</strong> the data has to travel through cables. Here, distance matters most.`,
      `<strong>Queue (waiting in line):</strong> if the server is busy, the request waits in a line. This grows fastest when load grows (we will see this soon).`,
      `<strong>Processing (the real work):</strong> running code, a database query, a cache lookup.`,
    ]},
    { type: 'image', src: 'assets/img/latency-throughput/fibre-optic.jpg', alt: 'Thin optical fibre strands glowing in the dark, with a point of light at the end of each strand', maxWidth: 320, caption: 'Internet data travels as light in thin glass threads like these (optical fibre). In glass, light travels at about 2 lakh km per second. Nothing is faster, and this is a hard limit on latency.', credit: { text: 'BigRiz, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Fibreoptic.jpg', license: 'CC BY-SA 3.0' } },
    { type: 'p', html: `Do the math: Mumbai to the US east coast is about 13,000 km. Light in fibre is ~2,00,000 km/s, so one way takes 65 ms, and there and back (RTT) at least <strong>130 ms</strong>. In reality it is 200-250 ms, because cables do not go in a straight line and routers on the way also take time. No amount of bandwidth can reduce these 130 ms.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `More bandwidth does not reduce latency. Even on a 10-lane highway, going from Chennai to Delhi takes the same time. So the real way to cut latency is to bring the data <strong>closer</strong> to the user (CDN, regional servers), or to make fewer round trips. Bandwidth helps when the file is <em>big</em>.` },
    { type: 'p', html: `See for yourself when latency wins and when bandwidth wins. Simple model: fetching a file takes <strong>3 round trips</strong> (open a connection + secure it + the request), then the file travels for <code>size ÷ bandwidth</code>:` },
    { type: 'custom', render(el) {
      const SIZES = [['Small page (20 KB)', 20], ['Photo (2 MB)', 2000], ['Movie (1 GB)', 1000000]];
      const BW = [10, 100, 1000], RTT = [['Same city (5 ms)', 5], ['Inside India (50 ms)', 50], ['India ↔ US (230 ms)', 230]];
      const sel = (cls, arr, f, d) => `<select class="${cls}">${arr.map((x, i) => `<option value="${i}"${i === d ? ' selected' : ''}>${f(x)}</option>`).join('')}</select>`;
      el.innerHTML = `<div class="row2">
          <div><label>File</label>${sel('bwS', SIZES, x => x[0], 0)}</div>
          <div><label>Bandwidth</label>${sel('bwB', BW, x => x + ' Mbps', 1)}</div>
          <div><label>How far the server is (RTT)</label>${sel('bwR', RTT, x => x[0], 2)}</div>
        </div>
        <div class="bwBar" style="display:flex;height:22px;border-radius:6px;overflow:hidden;margin-top:12px;border:1px solid var(--line)"></div>
        <div style="display:flex;gap:14px;font-size:13px;color:var(--ink-3);margin-top:4px"><span><span style="display:inline-block;width:10px;height:10px;background:var(--amber);border-radius:2px"></span> round trips (latency)</span><span><span style="display:inline-block;width:10px;height:10px;background:var(--accent);border-radius:2px"></span> data travel (bandwidth)</span></div>
        <div class="stats"><div class="stat"><span>Round trips</span><strong class="bwL"></strong></div><div class="stat"><span>Transfer</span><strong class="bwT"></strong></div><div class="stat"><span>Total time</span><strong class="bwA"></strong></div></div>
        <div class="calc-note bwN"></div>`;
      const ms = v => v >= 10000 ? (v / 1000).toFixed(1) + ' s' : v.toFixed(v < 100 ? 1 : 0) + ' ms';
      const upd = () => {
        const kb = SIZES[+el.querySelector('.bwS').value][1], mbps = BW[+el.querySelector('.bwB').value], rtt = RTT[+el.querySelector('.bwR').value][1];
        const lat = 3 * rtt, tr = kb * 8 / 1000 / mbps * 1000, all = lat + tr, lp = lat / all * 100;
        el.querySelector('.bwBar').innerHTML = `<div style="width:${lp}%;background:var(--amber)"></div><div style="width:${100 - lp}%;background:var(--accent)"></div>`;
        el.querySelector('.bwL').textContent = ms(lat);
        el.querySelector('.bwT').textContent = ms(tr);
        el.querySelector('.bwA').textContent = ms(all);
        el.querySelector('.bwN').textContent = lp > 80
          ? `${Math.round(lp)}% of the time went only on round trips. Making bandwidth 10 times bigger will change nothing; bring the server closer (CDN) or make fewer round trips.`
          : lp < 20
          ? `${Math.round(100 - lp)}% of the time is data travel. Here bandwidth is king: 10 times the bandwidth = about 10 times faster.`
          : 'Both matter: a closer server and more bandwidth will both help.';
      };
      el.querySelectorAll('select').forEach(s => s.addEventListener('change', upd));
      upd();
    }},
    { type: 'p', html: `Small page, 100 Mbps, server in the US: 690 ms on round trips and only 1.6 ms on data. The same page from a Mumbai server: 16.6 ms. Now a 1 GB movie: 80 seconds of data travel, and the 0.7 seconds of round trips hardly matter. <strong>For small things, latency; for big things, bandwidth.</strong> Websites mostly send small things, which is why CDNs are so useful.` },

    { type: 'h2', text: 'Why latency explodes when load grows' },
    { type: 'p', html: `Latency and throughput are linked. Think of a server that finishes one request in 10 ms, so at most 100 requests/second. Requests do not arrive at perfectly even gaps; sometimes three come at once. Then the others wait in a line (queue). The busier the server, the longer the line.` },
    { type: 'callout', tone: 'term', title: 'New word: Utilisation', html: `<strong>What it is:</strong> what % of its capacity the server is using. 80 req/s are coming and the max is 100: utilisation is 80%.<br><strong>Why it matters:</strong> the length of the line does not grow in a straight line with utilisation; it grows <em>very fast</em> as you get close to 100%.<br><strong>Without it (if you ignore it):</strong> a server running at 90% gets a little more traffic and latency goes up 10 times.` },
    { type: 'p', html: `Below is the math of a simple, well-known queue model (M/M/1): average time = <code>work time ÷ (1 − utilisation)</code>. Move the slider:` },
    { type: 'custom', render(el) {
      const S = 10;
      el.innerHTML = `<label>Incoming requests: <strong class="qL"></strong> req/s (server max 100 req/s, each request 10 ms)</label>
        <input class="qR" type="range" min="10" max="99" step="1" value="50">
        <svg class="qSvg" viewBox="0 0 400 170" style="width:100%;margin-top:8px" role="img" aria-label="Utilisation vs latency curve"></svg>
        <div class="stats"><div class="stat"><span>Utilisation</span><strong class="qU"></strong></div><div class="stat"><span>Average latency</span><strong class="qW"></strong></div><div class="stat"><span>Inside the system at once (L = λ × W)</span><strong class="qN"></strong></div></div>
        <div class="calc-note qT"></div>`;
      const X = u => 30 + u * 360, Y = w => 150 - Math.min(w, 500) / 500 * 135;
      const draw = () => {
        const lam = +el.querySelector('.qR').value, u = lam / 100, W = S / (1 - u), L = lam * W / 1000;
        let path = '';
        for (let k = 0; k <= 98; k++) { const uu = k / 100; path += (k ? 'L' : 'M') + X(uu).toFixed(1) + ' ' + Y(S / (1 - uu)).toFixed(1) + ' '; }
        el.querySelector('.qSvg').innerHTML = `<line x1="30" y1="150" x2="392" y2="150" stroke="var(--line)"></line><line x1="30" y1="12" x2="30" y2="150" stroke="var(--line)"></line>
          <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2.5"></path>
          <circle cx="${X(u)}" cy="${Y(W)}" r="6" fill="var(${u >= 0.9 ? '--red' : u >= 0.7 ? '--amber' : '--green'})"></circle>
          <text x="210" y="166" font-size="11" text-anchor="middle" fill="var(--ink-3)">utilisation → 100%</text>
          <text x="34" y="22" font-size="11" fill="var(--ink-3)">latency (up to 500 ms)</text>`;
        el.querySelector('.qL').textContent = lam;
        el.querySelector('.qU').textContent = Math.round(u * 100) + '%';
        el.querySelector('.qW').textContent = W.toFixed(0) + ' ms';
        el.querySelector('.qN').textContent = L.toFixed(1) + ' requests';
        el.querySelector('.qT').textContent = u < 0.7
          ? 'The relaxed zone: the line is short, latency is close to the work time.'
          : u < 0.9
          ? 'The line is getting long. This is why servers are planned for 50-70%.'
          : 'The danger zone: a little extra traffic and latency shoots up. Throughput is not growing any more; only the waiting is growing.';
      };
      el.querySelector('.qR').addEventListener('input', draw);
      draw();
    }},
    { type: 'p', html: `Look at the numbers: 20 ms at 50%, 50 ms at 80%, 100 ms at 90%, 200 ms at 95%, 1,000 ms at 99%. The work time is still 10 ms; the rest is all waiting in line. Real servers differ a bit from this model, but the shape stays the same: <strong>near 100%, latency explodes</strong>. So "the server is at 95%, there is still room" is wrong thinking.` },
    { type: 'h3', text: "Little's law: how many requests are inside at once?" },
    { type: 'callout', tone: 'term', title: "New word: Little's law", html: `<strong>What it is:</strong> a simple rule that holds for any stable system: <code>L = λ × W</code>. L = how many tasks are inside the system at once, λ (lambda) = how many arrive per second, W = how long each task stays inside.<br><strong>Why we need it:</strong> it tells you right away how many threads, connections or workers you need.<br><strong>Example:</strong> xyz.com gets 2,000 req/s and each request takes 100 ms (0.1 s). So 2,000 × 0.1 = <strong>200 requests</strong> are running at once. The server has 50 threads? 150 will wait in line. And if the database gets slow and W becomes 500 ms, there are 1,000 requests inside: threads run out and everything gets stuck.` },
    { type: 'callout', tone: 'tip', html: `The most useful lesson of Little's law: <strong>when latency grows, the "stuck work" inside grows by the same factor</strong>, even if traffic stays the same. One slow database eats up all the threads of an app server. That is why we use timeouts (we will see this with thread pools in the concurrency lesson).` },
    { type: 'h2', text: 'Why the average lies' },
    { type: 'p', html: `Say 99 out of 100 requests took 50 ms and 1 took 5 seconds. Average = (99 × 50 + 5,000) ÷ 100 ≈ 100 ms. "All great!" But that 1 user waited 5 seconds. And in xyz.com\'s 1 crore requests per day, "1%" means 1 lakh unhappy requests. And often these are the most active users (they have the most data, so their queries are the heaviest).` },
    { type: 'callout', tone: 'term', title: 'New word: Percentile (p50, p95, p99)', html: `<strong>What it is:</strong> line up the latency of all requests from smallest to biggest. <strong>p50</strong> (median) = the middle one: half the requests are faster than this. <strong>p95</strong> = 95% of requests are faster than this, only 5% slower. <strong>p99</strong> = 99% are faster, only 1% slower. <strong>p99.9</strong> = only 1 in 1,000 is slower.<br><strong>Why we need it:</strong> the average hides a few slow requests. p99 = "the experience of your unluckiest users".<br><strong>How to find it:</strong> sort 1,000 requests; p99 = the latency of the 990th one.<br><strong>Example:</strong> p99 = 800 ms means: 99 out of 100 requests came in less than 800 ms, 1 took longer.` },
    { type: 'p', html: `See for yourself. This is a histogram of 1,000 requests (each bar = how many requests had that latency). Press "Live traffic" to watch requests arrive in batches. Use the slider to make some requests slow (like when the database is sometimes slow, or there is a cache miss):` },
    { type: 'custom', render(el) {
      el.innerHTML = `<label>What % of requests are slow: <strong class="ltSv">2%</strong></label>
        <input class="ltSlow" type="range" min="0" max="20" step="1" value="2">
        <label style="margin-top:10px">How slow a slow request is (ms): <strong class="ltMv">1200</strong></label>
        <input class="ltMs" type="range" min="200" max="5000" step="100" value="1200">
        <div style="margin-top:10px"><button type="button" class="btn small primary ltGo">▶ Live traffic</button> <span class="ltCnt" style="font-size:13px;color:var(--ink-3)"></span></div>
        <div class="ltHist" style="display:flex;align-items:flex-end;gap:2px;height:120px;margin-top:12px;border-bottom:1px solid var(--line)"></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--ink-3)"><span>fast</span><span>slow</span></div>
        <div class="stats">
          <div class="stat"><span>Average</span><strong class="ltAvg"></strong></div>
          <div class="stat"><span>p50</span><strong class="ltP50"></strong></div>
          <div class="stat"><span>p95</span><strong class="ltP95"></strong></div>
          <div class="stat"><span>p99</span><strong class="ltP99"></strong></div>
        </div>
        <div class="calc-note ltNote"></div>`;
      const q = c => el.querySelector(c);
      let seed = 7, shown = 1000, timer = null;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      const make = (slowPct, slowMs) => {
        seed = 7;
        const all = [];
        for (let i = 0; i < 1000; i++) {
          const base = 30 + rnd() * 40 + (rnd() < 0.1 ? rnd() * 60 : 0);
          all.push(rnd() * 100 < slowPct ? slowMs * (0.7 + rnd() * 0.6) : base);
        }
        return all;
      };
      const draw = () => {
        const slowPct = +q('.ltSlow').value, slowMs = +q('.ltMs').value;
        q('.ltSv').textContent = slowPct + '%';
        q('.ltMv').textContent = slowMs;
        const xs = make(slowPct, slowMs).slice(0, shown).sort((a, b) => a - b), N = xs.length;
        const pc = p => xs[Math.min(N - 1, Math.floor(p / 100 * N))];
        const avg = xs.reduce((a, b) => a + b, 0) / N;
        const f = v => Math.round(v) + ' ms';
        q('.ltAvg').textContent = f(avg);
        q('.ltP50').textContent = f(pc(50));
        q('.ltP95').textContent = f(pc(95));
        q('.ltP99').textContent = f(pc(99));
        q('.ltCnt').textContent = N + ' / 1000 requests';
        const max = Math.max(slowMs * 1.3, 200), B = 40, bins = new Array(B).fill(0);
        xs.forEach(x => bins[Math.min(B - 1, Math.floor(Math.sqrt(x / max) * B))]++);
        const top = Math.max(...bins);
        q('.ltHist').innerHTML = bins.map((c, i) => `<div title="${c} requests" style="flex:1;height:${c ? Math.max(3, c / top * 100) : 0}%;background:${(i / B) * (i / B) * max > 300 ? 'var(--red)' : 'var(--accent)'};border-radius:2px 2px 0 0"></div>`).join('');
        q('.ltNote').textContent = slowPct === 0
          ? 'No slow requests: average, p50 and p99 are all close together.'
          : slowPct < 5
          ? 'Look: p50 stays about the same, the average moves only a little, but p99 jumps straight to the slow requests. If you only looked at the average, this problem would stay hidden.'
          : 'Now 5% or more are slow: p95 has also reached the slow requests. 1 in every 20 users is unhappy, yet p50 still looks perfectly "healthy".';
      };
      q('.ltGo').onclick = () => {
        clearInterval(timer); shown = 50; draw();
        timer = setInterval(() => { shown = Math.min(1000, shown + 50); draw(); if (shown >= 1000) clearInterval(timer); }, 120);
      };
      q('.ltSlow').oninput = () => { shown = 1000; clearInterval(timer); draw(); };
      q('.ltMs').oninput = q('.ltSlow').oninput;
      draw();
    }},
    { type: 'p', html: `At the default (2% slow, 1,200 ms): the average is only <strong>75 ms</strong>, p50 <strong>53 ms</strong>, p95 <strong>96 ms</strong>, but p99 is <strong>~1,210 ms</strong>. Set slow requests to 0 and p99 is ~113 ms. This answers the puzzle above: the dashboard showed the average, while users were living with the p99.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `<strong>Do not average percentiles</strong>. The average of the p99 of 10 servers is not "the p99 of the whole system". The right way: combine all requests (or their histograms), then find the p99. And do not look at p99 alone; also look at the request count: a p99 of 10 requests tells you nothing.` },

    { type: 'h2', text: 'Tail latency: in big systems, p99 becomes everyone\'s pain' },
    { type: 'callout', tone: 'term', title: 'New word: Tail latency', html: `<strong>What it is:</strong> the long "tail" of the latency graph: the 1% or 0.1% of requests that are much slower than all the others. p99 and p99.9 measure this.<br><strong>Why it matters:</strong> when one page calls many services, the small tail of each service adds up and catches many users.<br><strong>Without it (if you ignore it):</strong> every service is "99% fast", yet 1 in every 10 pages is slow.` },
    { type: 'p', html: `To build xyz.com\'s homepage, the server calls 10 different services at the same time (profile, feed, notifications, ads...). The page is ready only when the <strong>slowest</strong> one answers. If each service is slow 1% of the time, the chance that at least one is slow is <code>1 − 0.99<sup>N</sup></code>. Move the slider:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>How many services called at once: <strong class="faN"></strong></label><input class="faR" type="range" min="1" max="200" step="1" value="10"></div>
          <div><label>How often each service is slow: <strong class="faP"></strong>%</label><input class="faS" type="range" min="0.1" max="5" step="0.1" value="1"></div>
        </div>
        <div class="faBar" style="height:22px;border-radius:6px;background:var(--surface-2);border:1px solid var(--line);overflow:hidden;margin-top:12px"><div class="faFill" style="height:100%;background:var(--red)"></div></div>
        <div class="stats"><div class="stat"><span>Slow page loads</span><strong class="faA"></strong></div><div class="stat"><span>Out of every 100 users</span><strong class="faU"></strong></div></div>`;
      const upd = () => {
        const n = +el.querySelector('.faR').value, p = +el.querySelector('.faS').value / 100, a = 1 - Math.pow(1 - p, n);
        el.querySelector('.faN').textContent = n;
        el.querySelector('.faP').textContent = (p * 100).toFixed(1);
        el.querySelector('.faFill').style.width = (a * 100) + '%';
        el.querySelector('.faA').textContent = (a * 100).toFixed(1) + '%';
        el.querySelector('.faU').textContent = Math.round(a * 100) + ' slow';
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd));
      upd();
    }},
    { type: 'p', html: `1 service: 1% slow pages. 10 services: <strong>9.6%</strong>. 100 services: <strong>63%</strong>. This idea comes from the famous paper <em>"The Tail at Scale"</em> (2013) by Google engineers Jeffrey Dean and Luiz André Barroso. That is why, in big systems, lowering p99 (and p99.9) matters more than lowering the average.` },
    { type: 'p', html: `Some ways to cut the tail (from the paper and from industry):` },
    { type: 'list', items: [
      `<strong>Timeouts:</strong> if a service does not answer within a limit (like 200 ms), show the page without it (for example, without ads). A slow part should not hold up the whole page.`,
      `<strong>Hedged requests:</strong> send the request to one of two copies (replicas); if no answer comes after a short wait (like the p95 time), send it to the other one too, and use whichever answers first. In one Google benchmark from the paper, sending the second request after 10 ms cut p99.9 latency from 1,800 ms to 74 ms, for only 2% extra requests.`,
      `<strong>Less fan-out:</strong> keep data that is needed together in one place, so one page does not need to go to 100 places.`,
      `<strong>Headroom:</strong> if servers are close to 100%, the line is long and the tail is thick (the queue graph above).`,
    ]},
    { type: 'p', html: `Now run one request and watch: the fast road, the slow road, and what happens when one service gets stuck. Click each box to read what it is:` },
    { type: 'flow', height: 340,
      nodes: [
        { id: 'u', label: 'User', x: 80, y: 150, w: 110, kind: 'client', info: 'What it is: an xyz.com user. All they see is the total time: from the click to the page.' },
        { id: 'lb', label: 'Load Balancer', x: 245, y: 150, w: 150, kind: 'net', info: 'What it is: the part that shares requests among servers. Only one server is shown here so the latency math is easy to see.' },
        { id: 'app', label: 'App server', sub: 'builds the page', x: 440, y: 150, w: 160, kind: 'server', meter: true, load: 40, info: 'What it is: xyz.com\'s code that joins data from the cache, the DB and other services to build the page. Meter = how busy it is.' },
        { id: 'cache', label: 'Cache', sub: '~1 ms', x: 630, y: 60, w: 130, kind: 'cache', info: 'What it is: fast data kept in RAM (Redis). If the data is found (a hit), there is no need to go to the DB.' },
        { id: 'db', label: 'Database', sub: '~5-10 ms', x: 630, y: 240, w: 130, kind: 'data', info: 'What it is: the real data, on disk. If it is not in the cache (a miss), we must come here: more time.' },
        { id: 'ads', label: 'Ads service', sub: 'normal: 20 ms', x: 440, y: 290, w: 160, kind: 'server', info: 'What it is: a separate service that gives the page its ads. The page calls it too, so its slowness can slow down the whole page.' },
      ],
      edges: [{ a: 'u', b: 'lb' }, { a: 'lb', b: 'app' }, { a: 'app', b: 'cache' }, { a: 'app', b: 'db' }, { a: 'app', b: 'ads' }],
      scenarios: [
        { name: 'Fast road (cache hit)', steps: [
          { title: 'The request arrives', text: 'The user opened the feed. A Mumbai user and a Mumbai server: network ~5 ms.', go: 'u>lb>app', msg: 'GET /feed' },
          { title: 'Found in the cache', text: 'The feed was in the cache (a hit): ~1 ms.', go: ['app>cache', 'res:cache>app'], after: { cache: { state: 'hit' } } },
          { title: 'Ads came too, page goes back', text: 'The ads service answered in 20 ms. Total ~30-40 ms. This request is around the p50.', go: ['app>ads', 'res:ads>app', 'res:app>lb>u'] },
        ]},
        { name: 'Cache miss: to the DB', steps: [
          { title: 'Not in the cache', text: 'This user\'s feed was not in the cache (a miss).', go: ['u>lb>app>cache', 'res:cache>app'], after: { cache: { state: 'miss' } } },
          { title: 'Get it from the database', text: 'The DB query takes 5-10 ms, and 100+ ms if the DB is busy. Requests like this make up the p95/p99.', go: ['app>db', 'res:db>app'], after: { db: { state: 'warn', sub: 'today 120 ms' } } },
          { title: 'Page goes back, but late', text: 'Total ~150 ms. The result was put in the cache for next time.', go: 'res:app>lb>u', after: { cache: { state: 'hit' } } },
        ]},
        { name: 'Ads service gets stuck', intro: 'The real face of tail latency: one small service holds up the whole page.', steps: [
          { title: 'The ads service is slow', text: 'One server of the ads service is stuck in garbage collection (a pause that happens now and then). The answer will come in 3 seconds.', set: { ads: { state: 'hot', sub: 'today: 3,000 ms' } }, go: 'u>lb>app>ads' },
          { title: 'Without a timeout: everyone waits', text: 'The feed is ready, but the page is waiting for the ads. The user sees a white screen for 3 seconds. This request will land in the p99. And Little\'s law: this thread stayed stuck for 3 seconds.', after: { app: { load: 90, state: 'warn' } } },
          { title: 'Fix: 200 ms timeout + fallback', text: 'If the ads do not come within 200 ms, send the page without them. The user got the page in ~230 ms, just with an empty space where the ads go.', go: 'res:app>lb>u', set: { app: { load: 40, state: '', sub: 'timeout 200 ms' } }, msg: '200 OK (ads skipped)' },
        ]},
        { name: 'Overload: long line', steps: [
          { title: 'Traffic grew, server at 95%', text: 'Each request has the same amount of work, but the server is almost full. Requests wait in line.', flood: { paths: ['u>lb>app'], n: 16 }, after: { app: { load: 95, state: 'hot', sub: 'long queue' } } },
          { title: 'Latency many times higher', text: 'Remember the queue graph: at 95%, the average latency is 20 times the work time. Even a cache-hit request now takes 200+ ms. Fix: more servers (get the headroom back), or load shedding.', go: 'bad:app>lb>u', msg: 'p99: 2,400 ms' },
        ]},
      ],
    },
    { type: 'h2', text: 'Some numbers worth remembering' },
    { type: 'table', head: ['Task', 'About how long'], rows: [
      ['Read from RAM', '~100 ns (a nanosecond = one billionth of a second)'],
      ['Random read from an SSD', '~0.1 ms'],
      ['Redis GET in the same data center (with network)', '~0.5-1 ms'],
      ['Round trip inside one region', '~1-2 ms'],
      ['Simple indexed database query', '~1-10 ms'],
      ['India ↔ US round trip', '~200-250 ms'],
      ['Feels "instant" to a human', '< 100-200 ms'],
    ], caption: 'Not exact; order of magnitude (how many zeros). From RAM to network, each step is ~10-1,000 times slower. The Napkin maths lesson will use these fully.' },
    { type: 'callout', tone: 'tip', html: `The lesson of this table: reading from memory (RAM, cache) is thousands of times faster than from the network or disk, and going to another continent is the most expensive. So the three big weapons against latency are: <strong>cache</strong> (keep it in RAM), <strong>CDN / nearby servers</strong> (less distance), and <strong>fewer round trips</strong> (more work per request, reuse connections).` },

    { type: 'h2', text: 'SLI, SLO, SLA: turning latency into a promise' },
    { type: 'callout', tone: 'term', title: 'New words: SLI, SLO, SLA', html: `<strong>SLI</strong> (Service Level Indicator): what you measure. "p99 latency of <code>/feed</code>" or "% of successful requests".<br><strong>SLO</strong> (Objective): the team's internal target. "In 28 days, 99.9% of requests under 300 ms".<br><strong>SLA</strong> (Agreement): a legal promise to the customer; if broken, money/credit is given back. An SLA is always kept looser than the SLO, so even if the SLO breaks, the promise does not.<br><strong>Why we need it:</strong> "the site should be fast" leads to no decision. "p99 &lt; 300 ms" tells you when to sound the alarm and when to pause a new feature.<br><strong>Example:</strong> xyz.com\'s SLO: p99 &lt; 300 ms. This week p99 went to 450 ms, so new features stop and speed gets fixed first (the error budget is used up).` },

    { type: 'h2', text: 'Lowering latency vs raising throughput' },
    { type: 'p', html: `These are two different problems, and their fixes are different too. Sometimes improving one makes the other worse:` },
    { type: 'table', head: ['Method', 'Effect on latency', 'Effect on throughput'], rows: [
      ['Cache (answer in RAM)', 'Much lower (ms → μs)', 'Goes up (less load on the DB)'],
      ['CDN / nearby region', 'Much lower (less distance)', 'Goes up (less load on the origin)'],
      ['More servers (horizontal)', 'Lower if the line gets shorter, else the same', 'Goes up'],
      ['Batching (100 tasks at once)', '<strong>Goes up</strong> (the first one waits for the rest)', 'Goes up a lot'],
      ['Put it in a queue and do it later (async)', 'Lower for the user ("done" right away)', 'Goes up, but the work finishes later'],
      ['Better index / query', 'Lower', 'Goes up'],
    ]},
    { type: 'callout', tone: 'why', title: 'Decide', html: `<strong>Measure p95/p99, not the average</strong>, and set the SLO on p99. If latency is high: find where it goes (network, queue, processing), then use a cache, a CDN/nearby region, and fewer round trips. If throughput falls short: horizontal scaling, batching, async. Keep servers at 50-70% utilisation, because near 100% latency explodes. If you call many services, put a timeout and a fallback on every call.` },
    { type: 'diagram', title: 'One request\'s journey: where latency is spent', height: 460,
      nodes: [
        { id: 'user', label: 'User', sub: 'Mumbai', x: 100, y: 80, w: 130, kind: 'client', info: 'What it is: the user opening xyz.com. They only see the total latency: from the click to the page.' },
        { id: 'cdn', label: 'CDN edge', sub: 'near the city', x: 330, y: 80, w: 150, kind: 'edge', info: 'What it is: a server in the user\'s city that keeps copies of files like images and JS. Why: less distance = RTT ~5-20 ms, instead of the US\'s 230 ms.' },
        { id: 'lb', label: 'Load Balancer', x: 560, y: 80, w: 150, kind: 'net', info: 'What it is: the part that shares requests among servers. Why here: so no single server reaches 100%; otherwise the line gets long and the p99 gets bad.' },
        { id: 'app', label: 'App server', sub: 'timeouts', x: 330, y: 230, w: 150, kind: 'server', info: 'What it is: the code that builds the page. Every downstream call here has a timeout. And remember Little\'s law: a slow DB = stuck threads.' },
        { id: 'svc', label: 'Other services', sub: 'feed, ads, profile', x: 580, y: 230, w: 170, kind: 'server', info: 'What it is: the services called at the same time to build the page (fan-out). Their tail latencies add up to make the page\'s p99.' },
        { id: 'cache', label: 'Cache', sub: 'Redis ~1 ms', x: 190, y: 380, w: 140, kind: 'cache', info: 'What it is: a fast data store kept in RAM. Why: ~1 ms instead of the database\'s 5-10 ms. A cache hit = a fast request.' },
        { id: 'db', label: 'Database', sub: '~5-10 ms', x: 430, y: 380, w: 140, kind: 'data', info: 'What it is: the real data. An indexed query takes ~1-10 ms; without an index or under load, much more. The p99 often comes from here.' },
        { id: 'mon', label: 'Metrics', sub: 'p50 / p95 / p99', x: 620, y: 380, w: 150, kind: 'queue', info: 'What it is: the system that records the latency of every request (dashboards, alerts). It shows percentiles, not the average; if the SLO breaks, the alarm sounds.' },
      ],
      edges: [
        { a: 'user', b: 'cdn', n: 1, label: '~10 ms' },
        { a: 'cdn', b: 'lb', n: 2 },
        { a: 'lb', b: 'app', n: 3 },
        { a: 'app', b: 'cache', n: 4, label: 'hit?' },
        { a: 'app', b: 'db', n: 5, label: 'miss' },
        { a: 'app', b: 'svc', label: 'fan-out' },
        { a: 'app', b: 'mon', dashed: true, kind: 'evt' },
      ],
      paths: [
        { name: 'Static file', text: 'The image/JS was found at the CDN edge: just one short round trip, with no need to go to the data center.', go: ['user>cdn'] },
        { name: 'Cache hit', text: 'The page data was in the cache: ~1 ms. The whole request takes a few dozen ms.', go: ['user>cdn>lb>app>cache'] },
        { name: 'Cache miss', text: 'It was not in the cache: we had to go to the database, 5-10 ms or more under load. The p95/p99 often comes from here.', go: ['user>cdn>lb>app>cache', 'app>db'] },
        { name: 'Fan-out', text: 'Many services at once for the page. The slowest one decides when the page is ready: tail latency. A timeout + fallback is a must.', go: ['user>cdn>lb>app>svc', 'app>mon'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Latency = how long one request takes (ms). Throughput = how many requests per second (QPS). Bandwidth = the max width of the pipe (Mbps).</li>
      <li>Latency from distance does not go down with bandwidth. For small things latency (round trips) is king; for big files, bandwidth.</li>
      <li>When utilisation gets close to 100%, the line gets long and latency explodes: plan for 50-70%.</li>
      <li>Little's law: requests inside = arrival rate × time of each (L = λ × W). A slow dependency = stuck threads.</li>
      <li>The average lies. Look at p50, p95, p99; do not average percentiles.</li>
      <li>In fan-out the tail adds up: 100 services × 1% slow ≈ 63% slow pages. Timeouts, hedged requests, less fan-out.</li>
      <li>SLI = the measure, SLO = the internal target, SLA = the promise to the customer (looser than the SLO).</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Percentiles show real user pain, not the lie of the average', 'Measuring the parts of latency (network, queue, processing) separately leads to the right fix', 'An SLO gives a clear decision: when to build features, when to fix speed', 'Headroom + timeouts keep tail latency under control'], costs: ['Measuring percentiles costs more: you must keep data for every request or a histogram', 'Headroom = paying for empty capacity', 'Hedged requests = a little extra load', 'Batching/async raise throughput, but each task finishes later'] },
    { type: 'think', questions: [
      { q: 'The team says "average latency is 80 ms, all fine". What is the first question you will ask?', a: 'What are the p95 and p99? And for which endpoint, over how many requests? Behind the average, a small group may be very slow.' },
      { q: 'The server\'s throughput stopped at 1,000 req/s and latency went from 50 ms to 2 s. What is happening?', a: 'The server is at its capacity. New requests are waiting in the queue, so latency grows but throughput does not. Fix: horizontal scaling, a cache, or finding the bottleneck (often the DB).' },
      { q: 'xyz.com gets 500 req/s and each request takes 400 ms (slow database). The server has 100 threads. What will happen?', a: "Little's law: inside = 500 × 0.4 = 200 requests. There are only 100 threads, so the rest wait in line, latency grows even more, and the line gets even longer. Fix: fix the DB (lower W), add timeouts, or add threads/servers. If the DB comes back to 100 ms, only 50 are inside." },
      { q: 'The server for Indian users is in the US. The team wants 10 times more bandwidth. Will the page get fast?', a: 'For small pages, hardly: most of the time goes on round trips (~230 ms each), not bandwidth. Fix: a region or CDN in India, and fewer round trips (reuse connections, fewer requests).' },
    ]},
    { type: 'quiz', questions: [
      { q: 'What does p99 = 800 ms mean?', options: ['The average is 800 ms', '99% of requests are faster than 800 ms', 'Only 1% of requests are fast'], answer: 1, explain: 'Only 1% of requests take more than 800 ms.' },
      { q: 'The most effective way to lower India-US latency?', options: ['More bandwidth', 'Data close to users (CDN/regional servers)', 'A bigger server'], answer: 1, explain: 'Latency from distance does not go down with bandwidth.' },
      { q: 'What does throughput measure?', options: ['The time of one request', 'How many requests finish per second', 'The width of the network'], answer: 1, explain: 'Requests/sec (QPS).' },
      { q: 'The server\'s work takes 10 ms. Utilisation went from 50% to 95%. In the simple queue model, the average latency?', options: ['Still 10 ms', 'From 20 ms to 200 ms', 'From 10 ms to 19 ms'], answer: 1, explain: 'W = 10 ÷ (1 − u): 20 ms at 50%, 200 ms at 95%. Near 100%, latency explodes.' },
      { q: '2,000 req/s, each request 50 ms. How many requests are inside at once?', options: ['40', '100', '2,000'], answer: 1, explain: "Little's law: 2,000 × 0.05 s = 100." },
      { q: 'A page calls 100 services, each slow 1% of the time. How many page loads are slow?', options: ['~1%', '~10%', '~63%'], answer: 2, explain: '1 − 0.99¹⁰⁰ ≈ 0.63. Tail latency adds up in fan-out.' },
      { q: 'The difference between an SLO and an SLA?', options: ['They are the same', 'The SLO is the internal target, the SLA is the promise to the customer (credit if broken)', 'The SLA is internal, the SLO is external'], answer: 1, explain: 'The SLA is kept looser than the SLO, so even if the internal target breaks, the promise to the customer still holds.' },
    ]},
    { type: 'sources', note: 'The tail latency numbers and the availability/latency concepts come from these sources.', items: [
      { title: 'The Tail at Scale', publisher: 'Communications of the ACM (Google: Jeffrey Dean, Luiz André Barroso)', official: true, year: 2013, url: 'https://research.google/pubs/the-tail-at-scale/', used: 'Fan-out example (100 servers each 1% slow → ~63% of requests slow), hedged requests (Google benchmark: 99.9th percentile from 1,800 ms to 74 ms with 2% more requests after a 10 ms delay), why tail matters at scale. Older paper, ideas still standard.' },
      { title: 'Service Level Objectives (Site Reliability Engineering book, chapter 4)', publisher: 'Google', official: true, year: 2016, url: 'https://sre.google/sre-book/service-level-objectives/', used: 'SLI vs SLO vs SLA, using percentiles instead of averages for latency.' },
      { title: "Little's law", publisher: 'Wikipedia (summary of J. D. C. Little, 1961)', url: "https://en.wikipedia.org/wiki/Little%27s_law", used: 'L = λW for any stable system, independent of arrival distribution.' },
      { title: 'Optical fiber', publisher: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Optical_fiber', used: 'Light in fibre travels at about two thirds of its speed in vacuum (~200,000 km/s), used for the minimum Mumbai–US round trip estimate.' },
    ]},
  ],
});
